import * as THREE from 'three';
import { Groups, Layers, setHitMeta, type GameContext } from '../core/GameContext';
import type { IAI, ILighting, IPhysics } from '../core/Interfaces';
import { Assembly, type AssemblyMaterials } from './parts/Assembly';
import { TINT } from './parts/Components';

/**
 * Thrown ordnance.
 *
 * A grenade is cooked, not just thrown: holding the throw shortens the fuse,
 * and holding it too long detonates it in your hand, which is the whole tension
 * of the mechanic. The body is a real dynamic rigid body so it bounces off
 * walls and rolls down stairs, and the fuse keeps running wherever it ends up.
 */

export type GrenadeKind = 'frag' | 'flash' | 'smoke';

const FUSE: Record<GrenadeKind, number> = { frag: 3.2, flash: 1.6, smoke: 1.9 };
const RADIUS: Record<GrenadeKind, number> = { frag: 6.5, flash: 9, smoke: 5 };
const DAMAGE: Record<GrenadeKind, number> = { frag: 130, flash: 0, smoke: 0 };

interface Live {
  kind: GrenadeKind;
  fuse: number;
  handle: number;
  mesh: THREE.Mesh;
  active: boolean;
}

const _vec = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _spin = new THREE.Vector3();

export class Grenades {
  readonly counts = { frag: 3, flash: 2, smoke: 2 };
  /** The kind currently in hand, or null. */
  cooking: GrenadeKind | null = null;
  /** Seconds of fuse burned while cooking. */
  cookTime = 0;

  private readonly live: Live[] = [];
  private readonly pool: Live[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly bodies = new Map<GrenadeKind, THREE.Group>();
  private readonly explosionEvt = {
    position: new THREE.Vector3(),
    radius: 6,
    damage: 100,
    scale: 1,
    source: 'grenade' as const,
    normal: new THREE.Vector3(0, 1, 0),
  };
  private readonly smokeEvt = { position: new THREE.Vector3(), radius: 5, duration: 16 };
  private readonly flashEvt = { position: new THREE.Vector3() };

  constructor(
    private readonly ctx: GameContext,
    materials: AssemblyMaterials,
  ) {
    for (const kind of ['frag', 'flash', 'smoke'] as GrenadeKind[]) {
      const a = new Assembly(materials);
      const g = a.node('body');
      if (kind === 'frag') fragBody(g);
      else if (kind === 'flash') canBody(g, 0x6d7378, 0.021, 0.062);
      else canBody(g, 0x39533a, 0.023, 0.07);
      const built = a.build(`grenade:${kind}`, 0.5, 40);
      built.root.traverse((o) => o.layers.set(Layers.DEFAULT));
      this.bodies.set(kind, built.root);
      for (const geo of built.geometries) this.geometries.push(geo);
    }
  }

  /** True when the grenade can be cooked; consumes nothing yet. */
  cook(kind: GrenadeKind): boolean {
    if (this.cooking || this.counts[kind] <= 0) return false;
    this.cooking = kind;
    this.cookTime = 0;
    return true;
  }

  /**
   * Releases the cooked grenade. `origin` is the eye, `dir` the aim; the throw
   * inherits a little of the player's own velocity.
   */
  release(origin: THREE.Vector3, dir: THREE.Vector3, playerVelocity: THREE.Vector3, power = 1): boolean {
    const kind = this.cooking;
    if (!kind) return false;
    this.cooking = null;
    this.counts[kind]--;
    const fuse = Math.max(0.15, FUSE[kind] - this.cookTime);
    _vel
      .copy(dir)
      .multiplyScalar(15.5 * power)
      .addScaledVector(_vec.set(0, 1, 0), 3.2)
      .addScaledVector(playerVelocity, 0.6);
    _vec.copy(origin).addScaledVector(dir, 0.35);
    this.spawn(kind, _vec, _vel, fuse);
    this.ctx.events.emit('weapon:grenade', { kind, count: this.counts[kind] });
    return true;
  }

  /** Drops the cooked grenade at the player's feet — the cook-too-long case. */
  dropLive(origin: THREE.Vector3): void {
    const kind = this.cooking;
    if (!kind) return;
    this.cooking = null;
    this.counts[kind]--;
    _vel.set(0, 0.5, 0);
    this.spawn(kind, origin, _vel, 0.08);
  }

  private spawn(
    kind: GrenadeKind,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    fuse: number,
  ): void {
    const physics = this.ctx.tryGet<IPhysics>('physics');
    let entry = this.pool.pop();
    if (!entry) {
      const proto = this.bodies.get(kind)!;
      const mesh = new THREE.Mesh();
      mesh.name = `grenade:${kind}`;
      const clone = proto.clone(true);
      mesh.add(clone);
      entry = { kind, fuse, handle: -1, mesh, active: false };
    } else {
      entry.mesh.clear();
      entry.mesh.add(this.bodies.get(kind)!.clone(true));
    }
    entry.kind = kind;
    entry.fuse = fuse;
    entry.active = true;
    entry.mesh.position.copy(position);
    entry.mesh.quaternion.identity();
    setHitMeta(entry.mesh, { group: Groups.DEBRIS, surface: 'metal' });
    this.ctx.scene.add(entry.mesh);

    if (physics) {
      _spin.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
      );
      entry.handle = physics.addBody({
        mesh: entry.mesh,
        mass: 0.42,
        shape: 'sphere',
        size: _vec.set(0.032, 0.032, 0.032),
        restitution: 0.32,
        friction: 0.62,
        linearVelocity: velocity,
        angularVelocity: _spin,
        lifetime: 0,
        group: Groups.DEBRIS,
      });
    }
    this.live.push(entry);
  }

  update(dt: number): void {
    if (this.cooking) {
      this.cookTime += dt;
      if (this.cookTime >= FUSE[this.cooking] - 0.05) this.dropLive(this.ctx.camera.position);
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const g = this.live[i];
      g.fuse -= dt;
      if (g.fuse > 0) continue;
      this.detonate(g);
      this.live.splice(i, 1);
      this.pool.push(g);
    }
  }

  private detonate(g: Live): void {
    const physics = this.ctx.tryGet<IPhysics>('physics');
    _vec.copy(g.mesh.position);
    if (physics && g.handle >= 0) physics.removeBody(g.handle);
    g.handle = -1;
    g.active = false;
    this.ctx.scene.remove(g.mesh);

    const radius = RADIUS[g.kind];
    if (g.kind === 'frag') {
      const e = this.explosionEvt;
      e.position.copy(_vec);
      e.radius = radius;
      e.damage = DAMAGE.frag;
      e.scale = 1;
      this.ctx.events.emit('fx:explosion', e);
      this.ctx.tryGet<IAI>('ai')?.damageRadius(_vec, radius, DAMAGE.frag, 'frag');
      physics?.applyExplosionForce(_vec, radius * 1.4, 26);
      this.ctx
        .tryGet<ILighting>('lighting')
        ?.flashLight(_vec, 0xffb060, 900, radius * 3, 0.35);
      this.ctx.events.emit('camera:shake', {
        amplitude: 0.5,
        duration: 0.8,
        frequency: 22,
        position: _vec,
        radius: radius * 4,
      });
    } else if (g.kind === 'flash') {
      this.flashEvt.position.copy(_vec);
      this.ctx.events.emit('fx:flashbang', this.flashEvt);
      this.ctx
        .tryGet<ILighting>('lighting')
        ?.flashLight(_vec, 0xffffff, 2600, radius * 4, 0.22);
    } else {
      const s = this.smokeEvt;
      s.position.copy(_vec);
      s.radius = radius;
      s.duration = 17;
      this.ctx.events.emit('fx:smoke', s);
    }
    this.ctx.events.emit('audio:play', { id: `grenade_${g.kind}`, position: _vec, volume: 1 });
  }

  resupply(): void {
    this.counts.frag = 3;
    this.counts.flash = 2;
    this.counts.smoke = 2;
  }

  dispose(): void {
    const physics = this.ctx.tryGet<IPhysics>('physics');
    for (const g of this.live) {
      if (physics && g.handle >= 0) physics.removeBody(g.handle);
      this.ctx.scene.remove(g.mesh);
    }
    this.live.length = 0;
    for (const geo of this.geometries) geo.dispose();
  }
}

/* ------------------------------- bodies ---------------------------------- */

function fragBody(g: ReturnType<Assembly['node']>): void {
  g.use('metal', 0x4a5238);
  // M67-ish: a knurled sphere with a fuse assembly and a spoon.
  g.lathe(
    [
      [-0.028, 0.004],
      [-0.024, 0.019],
      [-0.012, 0.028],
      [0.006, 0.028],
      [0.018, 0.021],
      [0.024, 0.011],
      [0.026, 0.006],
    ],
    12,
    true,
    true,
  );
  g.use('metal', 0x3d4430);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.push().at(Math.cos(a) * 0.0272, Math.sin(a) * 0.0272, -0.004).rz(a);
    g.box(0.0022, 0.004, 0.04, 0.0005);
    g.pop();
  }
  g.use('metal', 0x6a6f74);
  g.push().at(0, 0, 0.03);
  g.cyl(0.008, 0.012, { segments: 10, chamfer: 0.0012 });
  g.pop();
  g.push().at(0.009, 0, 0.028);
  g.box(0.005, 0.012, 0.03, 0.001);
  g.pop();
  g.use('metal', 0xb8b06a);
  g.push().at(0, 0, 0.037).rx(Math.PI / 2);
  g.torus(0.007, 0.0016, 10, 5);
  g.pop();
}

function canBody(
  g: ReturnType<Assembly['node']>,
  tint: number,
  radius: number,
  length: number,
): void {
  g.use('metal', tint);
  g.cyl(radius, length, { segments: 12, chamfer: 0.0022 });
  g.use('metal', 0x2e3134);
  for (const z of [-length * 0.34, length * 0.34]) {
    g.push().at(0, 0, z);
    g.cyl(radius * 1.04, 0.005, { segments: 12, chamfer: 0.0008 });
    g.pop();
  }
  // Emission ports at one end, and the fuse at the other.
  g.use('metal', 0x1b1c1e);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.push().at(Math.cos(a) * radius * 0.55, Math.sin(a) * radius * 0.55, -length * 0.5 + 0.002);
    g.cyl(0.0035, 0.004, { segments: 8 });
    g.pop();
  }
  g.use('metal', 0x6a6f74);
  g.push().at(0, 0, length * 0.5 + 0.008);
  g.cyl(0.008, 0.016, { segments: 10, chamfer: 0.0012 });
  g.pop();
  g.push().at(0.009, 0, length * 0.5 + 0.004);
  g.box(0.005, 0.012, 0.03, 0.001);
  g.pop();
  g.use('metal', TINT.brass);
  g.push().at(0, 0, length * 0.5 + 0.02).rx(Math.PI / 2);
  g.torus(0.007, 0.0016, 10, 5);
  g.pop();
}
