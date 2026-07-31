import * as THREE from 'three';
import type {
  AISystem,
  AudioSystem,
  CombatSystem,
  FXSystem,
  PhysicsSystem,
  PlayerSystem,
  RenderSystem,
  WorldSystem,
} from '../core/Contracts';
import type { EngineContext } from '../core/System';
import { COLLISION_GROUP, type Damageable, type SurfaceType } from '../core/GameTypes';
import { clamp, saturate, Rng } from '../core/MathUtils';
import { THROWABLES, type ThrowableDefinition, type ThrowableId } from './WeaponDefs';

/**
 * Things the weapon system throws into the world: rockets, grenades and the
 * magazine that falls out of the gun on a reload.
 *
 * These are integrated here rather than handed to Rapier as dynamic bodies. Two
 * reasons: a grenade fuse has to be frame-exact regardless of how the physics
 * step lands, and a thrown grenade needs a specific amount of bounce and roll
 * damping to be predictable enough to aim, which is much easier to author
 * directly than to coax out of a solver. Collision still goes through the
 * physics module — every step is a sphere sweep — so the objects respect the same
 * world the bullets do, and they fall back to the world's ground height when the
 * physics module has no colliders registered yet.
 */

const GRAVITY = -19.6;
const SWEEP_GROUPS = COLLISION_GROUP.STATIC | COLLISION_GROUP.DYNAMIC;
const MAX_ACTIVE = 48;

type Kind = 'rocket' | 'grenade' | 'debris';

interface Body {
  kind: Kind;
  object: THREE.Object3D;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  radius: number;
  restitution: number;
  friction: number;
  gravityScale: number;
  /** Seconds until detonation; ignored by debris. */
  fuse: number;
  life: number;
  maxLife: number;
  owner: Damageable | null;
  throwable: ThrowableDefinition | null;
  /** Rockets ignore hits until they have cleared the launcher. */
  armAfter: number;
  bounces: number;
  resting: boolean;
  fadeAt: number;
}

export class ProjectileManager {
  private readonly bodies: Body[] = [];
  private readonly rng = new Rng(0x5eed1234);
  private ctx!: EngineContext;
  private root = new THREE.Group();

  private readonly step = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly next = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
  private readonly eye = new THREE.Vector3();

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.root.name = 'weaponProjectiles';
    ctx.scene.add(this.root);
  }

  get count(): number {
    return this.bodies.length;
  }

  // -------------------------------------------------------------------------
  // Spawning
  // -------------------------------------------------------------------------

  /** Rocket-propelled grenade. Explodes on the first thing it touches. */
  spawnRocket(opts: {
    object: THREE.Object3D;
    position: THREE.Vector3;
    direction: THREE.Vector3;
    speed: number;
    damage: number;
    radius: number;
    owner: Damageable | null;
  }): void {
    const body = this.push({
      kind: 'rocket',
      object: opts.object,
      radius: 0.045,
      restitution: 0,
      friction: 0,
      // A rocket motor mostly beats gravity; a little droop sells the mass.
      gravityScale: 0.18,
      fuse: 8,
      maxLife: 8,
      owner: opts.owner,
      throwable: null,
      armAfter: 0.035,
    });
    if (!body) return;
    body.object.position.copy(opts.position);
    body.object.quaternion.setFromUnitVectors(FORWARD, this.dir.copy(opts.direction).normalize());
    body.velocity.copy(opts.direction).normalize().multiplyScalar(opts.speed);
    body.spin.set(0, 0, 6);
    this.root.add(body.object);
    rocketDamage.set(body, { damage: opts.damage, radius: opts.radius });

    this.ctx.tryGet<FXSystem>('fx')?.contrail(body.object, 6);
    const light = this.ctx.tryGet<RenderSystem>('render');
    light?.requestDynamicLight(opts.position, 0xffa040, 26, 8, 0.16);
  }

  /**
   * Thrown grenade. `cook` is the time already burned off the fuse, which is what
   * makes a cooked frag arrive and detonate rather than bounce and warn.
   */
  spawnGrenade(opts: {
    object: THREE.Object3D;
    kind: ThrowableId;
    position: THREE.Vector3;
    direction: THREE.Vector3;
    speed: number;
    cook: number;
    owner: Damageable | null;
    inheritVelocity?: THREE.Vector3;
  }): void {
    const def = THROWABLES[opts.kind];
    const body = this.push({
      kind: 'grenade',
      object: opts.object,
      radius: opts.kind === 'frag' ? 0.032 : 0.026,
      restitution: def.restitution,
      friction: 0.62,
      gravityScale: 1,
      fuse: Math.max(0.12, def.fuse - opts.cook),
      maxLife: def.fuse + 6,
      owner: opts.owner,
      throwable: def,
      armAfter: 0,
    });
    if (!body) return;
    body.object.position.copy(opts.position);
    body.velocity.copy(opts.direction).normalize().multiplyScalar(opts.speed);
    if (opts.inheritVelocity) body.velocity.addScaledVector(opts.inheritVelocity, 0.45);
    body.spin.set(
      this.rng.range(-9, 9),
      this.rng.range(-6, 6),
      this.rng.range(-9, 9),
    );
    this.root.add(body.object);
  }

  /**
   * The magazine that leaves the gun on a reload. Purely cosmetic, but a reload
   * where nothing falls out reads as a hand waving at a static prop.
   */
  spawnDebris(opts: {
    object: THREE.Object3D;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    quaternion?: THREE.Quaternion;
    life?: number;
  }): void {
    const body = this.push({
      kind: 'debris',
      object: opts.object,
      radius: 0.03,
      restitution: 0.26,
      friction: 0.72,
      gravityScale: 1,
      fuse: Infinity,
      maxLife: opts.life ?? 9,
      owner: null,
      throwable: null,
      armAfter: 0,
    });
    if (!body) return;
    body.object.position.copy(opts.position);
    if (opts.quaternion) body.object.quaternion.copy(opts.quaternion);
    body.velocity.copy(opts.velocity);
    body.spin.set(this.rng.range(-7, 7), this.rng.range(-5, 5), this.rng.range(-7, 7));
    body.fadeAt = body.maxLife - 1.2;
    this.root.add(body.object);
  }

  private push(seed: {
    kind: Kind;
    object: THREE.Object3D;
    radius: number;
    restitution: number;
    friction: number;
    gravityScale: number;
    fuse: number;
    maxLife: number;
    owner: Damageable | null;
    throwable: ThrowableDefinition | null;
    armAfter: number;
  }): Body | null {
    // Oldest cosmetic debris goes first; live ordnance is never culled.
    if (this.bodies.length >= MAX_ACTIVE) {
      const i = this.bodies.findIndex((b) => b.kind === 'debris');
      if (i < 0) return null;
      this.retire(this.bodies[i]);
      this.bodies.splice(i, 1);
    }
    const body: Body = {
      ...seed,
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      life: 0,
      bounces: 0,
      resting: false,
      fadeAt: Infinity,
    };
    body.object.traverse((o) => {
      o.frustumCulled = false;
    });
    this.bodies.push(body);
    return body;
  }

  // -------------------------------------------------------------------------
  // Simulation
  // -------------------------------------------------------------------------

  update(dt: number): void {
    if (this.bodies.length === 0) return;
    const physics = this.ctx.tryGet<PhysicsSystem>('physics');
    const world = this.ctx.tryGet<WorldSystem>('world');

    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const body = this.bodies[i];
      body.life += dt;
      body.fuse -= dt;

      if (!body.resting) this.integrate(body, dt, physics ?? null, world ?? null);

      if (body.kind === 'rocket' && body.fuse <= 0) {
        this.detonateRocket(body);
        this.remove(i);
        continue;
      }
      if (body.kind === 'grenade' && body.fuse <= 0) {
        this.detonateThrowable(body);
        this.remove(i);
        continue;
      }
      if (body.life >= body.maxLife) {
        this.remove(i);
        continue;
      }
      if (body.life > body.fadeAt) {
        const t = saturate((body.life - body.fadeAt) / Math.max(0.05, body.maxLife - body.fadeAt));
        body.object.scale.setScalar(Math.max(0.01, 1 - t));
      }
    }
  }

  private integrate(
    body: Body,
    dt: number,
    physics: PhysicsSystem | null,
    world: WorldSystem | null,
  ): void {
    body.velocity.y += GRAVITY * body.gravityScale * dt;
    const position = body.object.position;
    let remaining = dt;
    let guard = 0;

    while (remaining > 1e-5 && guard++ < 4) {
      const speed = body.velocity.length();
      if (speed < 1e-6) break;
      this.dir.copy(body.velocity).divideScalar(speed);
      const distance = speed * remaining;

      let hitDistance = Infinity;
      let surface: SurfaceType = 'concrete';
      const swept =
        physics && physics.ready
          ? physics.spherecast(position, this.dir, body.radius, {
              maxDistance: distance,
              groups: SWEEP_GROUPS,
            })
          : null;
      if (swept) {
        hitDistance = swept.distance;
        surface = swept.surface;
        this.normal.copy(swept.normal);
        this.step.copy(swept.point);
      } else if (world && this.dir.y < -1e-4) {
        // Ground fallback: the world knows its floor height even before any
        // colliders exist, and a grenade that falls through the map is worse than
        // one that lands on an approximate surface.
        this.next.copy(position).addScaledVector(this.dir, distance);
        const floor = world.sampleGround(this.next.x, this.next.z);
        if (floor !== null && this.next.y - body.radius <= floor) {
          const d = (position.y - body.radius - floor) / -this.dir.y;
          if (d <= distance) {
            hitDistance = Math.max(0, d);
            surface = 'dirt';
            this.normal.set(0, 1, 0);
            this.step.copy(position).addScaledVector(this.dir, hitDistance);
          }
        }
      }

      if (hitDistance === Infinity) {
        position.addScaledVector(this.dir, distance);
        break;
      }

      const travel = Math.max(0, hitDistance - 0.002);
      position.addScaledVector(this.dir, travel);
      remaining -= travel / speed;

      if (body.kind === 'rocket') {
        if (body.life >= body.armAfter) {
          this.detonateRocket(body, this.step, this.normal);
          body.fuse = -1;
        }
        return;
      }
      if (!this.bounce(body, surface)) return;
    }

    this.spinStep(body, dt);
  }

  /** Returns false when the body has come to rest. */
  private bounce(body: Body, surface: SurfaceType): boolean {
    const vn = body.velocity.dot(this.normal);
    // Reflect the normal component, scrub the tangential one.
    this.scratch.copy(this.normal).multiplyScalar(vn);
    body.velocity.sub(this.scratch.multiplyScalar(1 + body.restitution));
    const tangent = this.scratch.copy(body.velocity).addScaledVector(this.normal, -body.velocity.dot(this.normal));
    body.velocity.addScaledVector(tangent, -body.friction * 0.35);
    body.spin.multiplyScalar(0.6);
    body.bounces++;

    const impact = Math.abs(vn);
    if (impact > 1.1) {
      const audio = this.ctx.tryGet<AudioSystem>('audio');
      audio?.play('weapon_grenade_bounce', body.object.position, {
        volume: clamp(impact * 0.12, 0.15, 0.85),
        pitch: this.rng.range(0.9, 1.15),
      });
      this.ctx
        .tryGet<FXSystem>('fx')
        ?.dust(body.object.position, 0.18, clamp(impact * 0.06, 0.05, 0.4));
      void surface;
    }

    if (body.velocity.lengthSq() < 0.16 && Math.abs(this.normal.y) > 0.6) {
      body.velocity.set(0, 0, 0);
      body.spin.multiplyScalar(0.2);
      body.resting = true;
      return false;
    }
    return true;
  }

  private spinStep(body: Body, dt: number): void {
    if (body.spin.lengthSq() < 1e-5) return;
    SPIN_Q.setFromAxisAngle(
      this.scratch.copy(body.spin).normalize(),
      body.spin.length() * dt,
    );
    body.object.quaternion.premultiply(SPIN_Q);
    if (body.kind === 'rocket') return;
    body.spin.multiplyScalar(Math.exp(-1.4 * dt));
  }

  // -------------------------------------------------------------------------
  // Detonation
  // -------------------------------------------------------------------------

  private detonateRocket(body: Body, at?: THREE.Vector3, normal?: THREE.Vector3): void {
    const info = rocketDamage.get(body) ?? { damage: 150, radius: 5.5 };
    rocketDamage.delete(body);
    const point = at ?? body.object.position;
    const combat = this.ctx.tryGet<CombatSystem>('combat');
    combat?.explode({
      position: point.clone(),
      radius: info.radius,
      damage: info.damage,
      falloff: 'quadratic',
      source: body.owner,
      kind: 'rocket',
      impulse: 34,
      screenShake: 1.0,
    });
    // explode() already fires the fireball, smoke, upward debris, dust, audio,
    // shake, flash and dynamic light. The only thing it cannot know is the
    // surface normal, so the directional spall off the struck face is ours.
    if (normal) {
      this.ctx.tryGet<FXSystem>('fx')?.debrisBurst(point.clone(), normal.clone(), 14, 'concrete');
    }
  }

  private detonateThrowable(body: Body): void {
    const def = body.throwable;
    if (!def) return;
    const point = body.object.position.clone();
    const combat = this.ctx.tryGet<CombatSystem>('combat');
    const fx = this.ctx.tryGet<FXSystem>('fx');
    const render = this.ctx.tryGet<RenderSystem>('render');
    const audio = this.ctx.tryGet<AudioSystem>('audio');

    if (def.id === 'frag') {
      combat?.explode({
        position: point,
        radius: def.radius,
        damage: def.damage,
        falloff: 'quadratic',
        source: body.owner,
        kind: 'grenade',
        impulse: 26,
        screenShake: 0.8,
      });
      // explode() owns the whole blast presentation — fireball, smoke, debris,
      // dust, audio, shake, flash, dynamic light and AI suppression. Adding any
      // of it here again reads as a double-bright, double-loud detonation.
    } else if (def.id === 'flash') {
      // A flashbang is a light and a concussion, not a fragmentation charge, so
      // the blinding is a function of how much of it the eye actually caught.
      const exposure = this.exposure(point, def.radius);
      fx?.dust(point.clone(), 1.4, 0.9);
      render?.addScreenFlash(clamp(exposure * 1.5, 0, 1.6), 0.35 + exposure * 2.6, 0xffffff);
      render?.setConcussion(exposure, 1.6 + exposure * 3.2);
      render?.requestDynamicLight(point.clone(), 0xffffff, 900, def.radius * 2.4, 0.22);
      audio?.setDeafen(clamp(exposure * 1.1, 0, 1), 2.4 + exposure * 4);
      audio?.play('weapon_grenade_throw', point.clone(), { volume: 1, pitch: 0.7 });
      combat?.explode({
        position: point,
        radius: 3.2,
        damage: def.damage,
        falloff: 'linear',
        source: body.owner,
        kind: 'grenade',
        impulse: 4,
        screenShake: 0.25,
        // A flashbang has no fireball. It needs the radial damage and physics
        // push, but its look is the white-out above, not an explosion.
        presentation: 'none',
      });
      this.ctx.tryGet<AISystem>('ai')?.suppress(point.clone(), def.radius, 4.5);
    } else {
      fx?.smoke(point.clone(), def.radius, 20, 0xd8d8d4);
      fx?.dust(point.clone(), 1.0, 0.5);
      audio?.play('weapon_grenade_bounce', point.clone(), { volume: 0.6, pitch: 0.5 });
      this.ctx.tryGet<AISystem>('ai')?.suppress(point.clone(), def.radius * 0.8, 6);
    }
  }

  /** 0..1 how badly the local player caught a flash, by range and line of sight. */
  private exposure(point: THREE.Vector3, radius: number): number {
    const player = this.ctx.tryGet<PlayerSystem>('player');
    if (!player) return 0;
    player.getEyePosition(this.eye);
    const distance = this.eye.distanceTo(point);
    if (distance > radius) return 0;
    const physics = this.ctx.tryGet<PhysicsSystem>('physics');
    if (physics && physics.ready && !physics.lineOfSight(this.eye, point, SWEEP_GROUPS)) return 0;
    const range = 1 - distance / radius;
    player.getLookDirection(this.scratch);
    this.dir.copy(point).sub(this.eye).normalize();
    // Facing it is far worse than having it behind you, but never harmless.
    const facing = 0.35 + 0.65 * saturate(this.scratch.dot(this.dir));
    return saturate(range * range * facing * 1.15);
  }

  // -------------------------------------------------------------------------

  private remove(index: number): void {
    this.retire(this.bodies[index]);
    this.bodies.splice(index, 1);
  }

  private retire(body: Body): void {
    rocketDamage.delete(body);
    body.object.removeFromParent();
    body.object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
  }

  clear(): void {
    for (const body of this.bodies) this.retire(body);
    this.bodies.length = 0;
  }

  dispose(): void {
    this.clear();
    this.root.removeFromParent();
  }
}

const FORWARD = /* @__PURE__ */ new THREE.Vector3(0, 0, -1);
const SPIN_Q = /* @__PURE__ */ new THREE.Quaternion();
const rocketDamage = new WeakMap<Body, { damage: number; radius: number }>();
