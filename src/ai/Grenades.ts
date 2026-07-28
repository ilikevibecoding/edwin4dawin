import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { EventBus } from '../core/EventBus';
import type { BodyHandle, IPhysics } from '../core/Interfaces';
import { AI } from './Tuning';

/**
 * Enemy frags.
 *
 * The player's grenades belong to the weapon system; these are the AI's own,
 * kept here because the throw is part of a behaviour and not part of a
 * loadout. Each is a physics body so it bounces off the geometry it is thrown
 * at — which is the entire reason the AI can flush a player out of a doorway
 * rather than only out of open ground.
 *
 * The lob solution is the useful part: given a fixed throw speed, there are two
 * launch angles that reach a target and the low one is chosen, falling back to
 * a fixed forty-five degrees when the target is simply out of range. A thrower
 * who silently fails is worse than one who throws short, because a grenade that
 * lands between you and him still moves you.
 */

const POOL = 10;
const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _explosion = {
  position: new THREE.Vector3(),
  radius: AI.grenade.radius,
  damage: AI.grenade.damage,
  scale: 1,
  source: 'grenade' as const,
  normal: new THREE.Vector3(0, 1, 0),
};

interface Live {
  mesh: THREE.Mesh;
  handle: BodyHandle;
  fuse: number;
  owner: number;
  active: boolean;
}

export class GrenadeSet {
  private items: Live[] = [];
  private geometry = new THREE.SphereGeometry(0.045, 10, 7);
  private material = new THREE.MeshStandardMaterial({
    color: 0x2c3327,
    roughness: 0.72,
    metalness: 0.35,
  });

  /** Called when one goes off, so the system can resolve damage. */
  onExplode: ((position: THREE.Vector3, owner: number) => void) | null = null;

  constructor(
    private physics: IPhysics | null,
    private scene: THREE.Object3D,
    private events: EventBus | null,
  ) {
    for (let i = 0; i < POOL; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.name = `enemy_grenade_${i}`;
      mesh.castShadow = true;
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ mesh, handle: 0, fuse: 0, owner: -1, active: false });
    }
  }

  get liveCount(): number {
    let n = 0;
    for (const g of this.items) if (g.active) n++;
    return n;
  }

  /** Throws from `from` at `to`. Returns false when the pool is empty. */
  throw(owner: number, from: THREE.Vector3, to: THREE.Vector3): boolean {
    const slot = this.items.find((g) => !g.active);
    if (!slot) return false;

    solveLob(from, to, AI.grenade.throwSpeed, _dir);
    slot.mesh.position.copy(from);
    slot.mesh.quaternion.identity();
    slot.mesh.visible = true;
    slot.mesh.updateMatrixWorld(true);
    slot.owner = owner;
    slot.fuse = AI.grenade.fuse;
    slot.active = true;
    slot.handle = this.physics
      ? this.physics.addBody({
          mesh: slot.mesh,
          mass: 0.44,
          shape: 'sphere',
          size: _v.set(0.045, 0.045, 0.045),
          restitution: 0.28,
          friction: 0.7,
          linearVelocity: _dir,
          group: Groups.DEBRIS,
        })
      : 0;
    if (!this.physics) {
      // No physics: fly straight so the behaviour still resolves in tests.
      slot.mesh.position.copy(to);
    }
    this.events?.emit('audio:play', {
      id: 'grenade_throw',
      position: from,
      volume: 0.7,
    });
    return true;
  }

  update(dt: number): void {
    for (const g of this.items) {
      if (!g.active) continue;
      g.fuse -= dt;
      if (g.fuse > 0) continue;
      this.detonate(g);
    }
  }

  private detonate(g: Live): void {
    _v.copy(g.mesh.position);
    if (this.physics && g.handle) this.physics.removeBody(g.handle);
    g.handle = 0;
    g.active = false;
    g.mesh.visible = false;

    _explosion.position.copy(_v);
    _explosion.radius = AI.grenade.radius;
    _explosion.damage = AI.grenade.damage;
    this.events?.emit('fx:explosion', _explosion);
    this.physics?.applyExplosionForce(_v, AI.grenade.radius * 1.4, 26);
    this.onExplode?.(_v, g.owner);
  }

  clear(): void {
    for (const g of this.items) {
      if (!g.active) continue;
      if (this.physics && g.handle) this.physics.removeBody(g.handle);
      g.handle = 0;
      g.active = false;
      g.mesh.visible = false;
    }
  }

  dispose(): void {
    this.clear();
    for (const g of this.items) g.mesh.removeFromParent();
    this.items.length = 0;
    this.geometry.dispose();
    this.material.dispose();
    void this.scene;
  }
}

/**
 * Launch velocity for a thrown object under gravity.
 *
 * Two angles reach any point inside the range; the flatter one is used because
 * it arrives sooner and is far easier to read as a threat. Outside the range
 * the throw is capped at forty-five degrees, which is the angle that goes
 * furthest, so the grenade lands as close as the arm allows.
 */
export function solveLob(
  from: THREE.Vector3,
  to: THREE.Vector3,
  speed: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const flat = Math.hypot(dx, dz);
  const dy = to.y - from.y;
  const g = 9.81;
  const v2 = speed * speed;

  let angle: number;
  const disc = v2 * v2 - g * (g * flat * flat + 2 * dy * v2);
  if (disc >= 0 && flat > 1e-3) {
    angle = Math.atan((v2 - Math.sqrt(disc)) / (g * flat));
  } else {
    angle = Math.PI / 4;
  }

  const horizontal = Math.cos(angle) * speed;
  const vertical = Math.sin(angle) * speed;
  if (flat > 1e-4) {
    out.set((dx / flat) * horizontal, vertical, (dz / flat) * horizontal);
  } else {
    out.set(0, speed, 0);
  }
  return out;
}
