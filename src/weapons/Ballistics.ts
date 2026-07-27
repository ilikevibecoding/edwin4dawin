import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import type {
  DamageInfo,
  IAiDirector,
  IPhysics,
  IVfx,
  RaycastHit,
  SurfaceType,
  WeaponSpec,
} from '../core/Contracts';
import { DEG, randomInCircle, type Rng } from '../core/MathX';

/**
 * Ballistics — spread, penetration, ricochet, damage falloff, and projectile
 * simulation for the sniper / long shots.
 *
 * Hitscan handles close/mid range; scoped weapons fire pooled projectiles that
 * travel with gravity drop and are advanced in `fixedUpdate`, raycasting along
 * each step's segment. All impacts emit `hit:surface` / `hit:confirm` and drive
 * the VFX system (guarded, since VFX may not be registered yet).
 */

interface Projectile {
  active: boolean;
  pos: THREE.Vector3;
  prev: THREE.Vector3;
  vel: THREE.Vector3;
  damage: number;
  pen: number;
  dist: number;
  maxDist: number;
  weapon: string;
  attackerId: number;
  tracer: boolean;
}

const GRAVITY = 9.81;
const MAX_HITSCAN = 500;
const HARD: SurfaceType[] = ['concrete', 'metal', 'tile'];

export class Ballistics {
  private pool: Projectile[] = [];
  private rng: Rng;

  // scratch
  private _o = new THREE.Vector3();
  private _d = new THREE.Vector3();
  private _seg = new THREE.Vector3();
  private _n = new THREE.Vector3();
  private _t1 = new THREE.Vector3();
  private _t2 = new THREE.Vector3();
  private _basisR = new THREE.Vector3();
  private _basisU = new THREE.Vector3();

  constructor(
    private ctx: EngineContext,
    rng: Rng
  ) {
    this.rng = rng;
    for (let i = 0; i < 48; i++) {
      this.pool.push({
        active: false,
        pos: new THREE.Vector3(),
        prev: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        damage: 0,
        pen: 0,
        dist: 0,
        maxDist: MAX_HITSCAN,
        weapon: '',
        attackerId: -1,
        tracer: false,
      });
    }
  }

  private get physics(): IPhysics | null {
    return this.ctx.has('physics') ? this.ctx.get<IPhysics>('physics') : null;
  }
  private get ai(): IAiDirector | null {
    return this.ctx.has('ai') ? this.ctx.get<IAiDirector>('ai') : null;
  }
  private get vfx(): IVfx | null {
    return this.ctx.has('vfx') ? this.ctx.get<IVfx>('vfx') : null;
  }

  /**
   * Fire one trigger pull: `pellets` shots through the spread cone from `from`
   * along `dir`. Shotguns pass pellets>1 with a denser-centre pattern.
   */
  fireShot(
    spec: WeaponSpec,
    from: THREE.Vector3,
    dir: THREE.Vector3,
    opts: { spreadDeg: number; tracer: boolean; attackerId: number }
  ) {
    // Build an orthonormal basis around the aim direction for cone sampling.
    this._d.copy(dir).normalize();
    this._basisR.set(0, 1, 0).cross(this._d);
    if (this._basisR.lengthSq() < 1e-5) this._basisR.set(1, 0, 0);
    this._basisR.normalize();
    this._basisU.copy(this._d).cross(this._basisR).normalize();

    const pellets = Math.max(1, spec.pelletsPerShot);
    const halfAngle = opts.spreadDeg * DEG;

    for (let i = 0; i < pellets; i++) {
      let rx: number;
      let ry: number;
      if (pellets > 1) {
        // Shotgun: denser centre (bias radius toward 0).
        const [ux, uy] = randomInCircle(this.rng);
        const bias = Math.pow(Math.hypot(ux, uy), 1.5);
        const ang = Math.atan2(uy, ux);
        rx = Math.cos(ang) * bias;
        ry = Math.sin(ang) * bias;
      } else {
        [rx, ry] = randomInCircle(this.rng);
      }
      this._t1
        .copy(this._d)
        .addScaledVector(this._basisR, Math.tan(halfAngle) * rx)
        .addScaledVector(this._basisU, Math.tan(halfAngle) * ry)
        .normalize();

      if (spec.scoped) {
        this.spawnProjectile(spec, from, this._t1, opts.tracer && i === 0, opts.attackerId);
      } else {
        this.hitscan(spec, from, this._t1, opts.tracer && i === 0, opts.attackerId);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Hitscan with penetration + ricochet walk
  // -------------------------------------------------------------------------

  private hitscan(
    spec: WeaponSpec,
    from: THREE.Vector3,
    dir: THREE.Vector3,
    tracer: boolean,
    attackerId: number
  ) {
    const phys = this.physics;
    this._o.copy(from);
    this._d.copy(dir);
    let pen = spec.penetration;
    let remaining = MAX_HITSCAN;
    let traveled = 0;
    const tracerFrom = this._t2.copy(from);
    let lastPoint: THREE.Vector3 | null = null;

    for (let bounce = 0; bounce < 6; bounce++) {
      const hit = phys?.raycast(this._o, this._d, remaining, { ignoreActorId: attackerId }) ?? null;
      if (!hit) {
        lastPoint = this._t1.copy(this._o).addScaledVector(this._d, Math.min(remaining, 120));
        break;
      }
      traveled += hit.distance;
      lastPoint = hit.point;

      if (hit.actorId != null && hit.actorId >= 0) {
        this.applyActorHit(spec, hit, this._d, from, attackerId, traveled);
        break;
      }

      // World surface impact.
      this.emitSurface(hit, this._d);

      const surfacePen = (hit.object?.userData?.penetration as number | undefined) ?? 0;
      const cosI = Math.abs(this._d.dot(hit.normal));

      // Ricochet off hard, oblique surfaces.
      if (surfacePen <= 0 && cosI < 0.34 && HARD.includes(hit.surface) && this.rng.chance(0.22)) {
        this._n.copy(hit.normal);
        this._d.reflect(this._n).normalize();
        this._o.copy(hit.point).addScaledVector(this._d, 0.01);
        remaining -= hit.distance;
        pen *= 0.5;
        if (remaining <= 0) break;
        continue;
      }

      // Penetrate thin materials.
      if (surfacePen > 0 && pen > 0.05) {
        pen -= surfacePen;
        this._o.copy(hit.point).addScaledVector(this._d, 0.05);
        remaining -= hit.distance + 0.05;
        if (remaining <= 0) break;
        continue;
      }
      break; // solid stop
    }

    if (tracer && lastPoint) {
      this.vfx?.tracer(tracerFrom, lastPoint, 380, spec.caliber === 'shell' ? 0.02 : 0.012);
    }
  }

  // -------------------------------------------------------------------------
  // Projectiles
  // -------------------------------------------------------------------------

  private spawnProjectile(
    spec: WeaponSpec,
    from: THREE.Vector3,
    dir: THREE.Vector3,
    tracer: boolean,
    attackerId: number
  ) {
    const p = this.pool.find((x) => !x.active);
    if (!p) return;
    p.active = true;
    p.pos.copy(from);
    p.prev.copy(from);
    p.vel.copy(dir).multiplyScalar(spec.muzzleVelocity);
    p.damage = spec.damage;
    p.pen = spec.penetration;
    p.dist = 0;
    p.maxDist = 700;
    p.weapon = spec.id;
    p.attackerId = attackerId;
    p.tracer = tracer;
    // Immediate tracer streak so the shot reads even before it lands.
    if (tracer) {
      this._t1.copy(from).addScaledVector(dir, 60);
      this.vfx?.tracer(from, this._t1, spec.muzzleVelocity, 0.014);
    }
  }

  fixedUpdate(dt: number) {
    const phys = this.physics;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.prev.copy(p.pos);
      p.vel.y -= GRAVITY * dt;
      p.pos.addScaledVector(p.vel, dt);
      this._seg.copy(p.pos).sub(p.prev);
      const stepLen = this._seg.length();
      p.dist += stepLen;
      if (stepLen < 1e-6) continue;
      this._d.copy(this._seg).multiplyScalar(1 / stepLen);

      const hit = phys?.raycast(p.prev, this._d, stepLen, { ignoreActorId: p.attackerId }) ?? null;
      if (hit) {
        if (hit.actorId != null && hit.actorId >= 0) {
          this.applyActorHitDamage(p, hit, this._d);
          p.active = false;
        } else {
          this.emitSurface(hit, this._d);
          const surfacePen =
            (hit.object?.userData?.penetration as number | undefined) ?? 0;
          if (surfacePen > 0 && p.pen > 0.05) {
            p.pen -= surfacePen;
            p.damage *= 1 - surfacePen * 0.5;
            p.pos.copy(hit.point).addScaledVector(this._d, 0.06);
          } else {
            p.active = false;
          }
        }
      }
      if (p.dist > p.maxDist) p.active = false;
    }
  }

  // -------------------------------------------------------------------------
  // Damage + events
  // -------------------------------------------------------------------------

  private applyActorHit(
    spec: WeaponSpec,
    hit: RaycastHit,
    dir: THREE.Vector3,
    origin: THREE.Vector3,
    attackerId: number,
    dist: number
  ) {
    const dmg = this.damageAt(spec, dist) * this.bodyMult(spec, hit);
    const headshot = hit.bodyPart === 'head';
    this.dealDamage(hit, dmg, dir, origin, spec.id, attackerId, headshot);
  }

  private applyActorHitDamage(p: Projectile, hit: RaycastHit, dir: THREE.Vector3) {
    // Projectiles carry a damage that already decays; apply distance falloff via
    // stored damage and body part.
    const spec = this.specFallback(p.weapon);
    const mult = spec ? this.bodyMult(spec, hit) : hit.bodyPart === 'head' ? 2.5 : 1;
    const headshot = hit.bodyPart === 'head';
    this._t1.copy(hit.point).addScaledVector(dir, -1);
    this.dealDamage(hit, p.damage * mult, dir, this._t1, p.weapon, p.attackerId, headshot);
  }

  private dealDamage(
    hit: RaycastHit,
    amount: number,
    dir: THREE.Vector3,
    origin: THREE.Vector3,
    weapon: string,
    attackerId: number,
    headshot: boolean
  ) {
    const ai = this.ai;
    const actor = ai?.actorById(hit.actorId!) ?? null;
    const lethal = actor ? actor.health - amount <= 0 : false;
    if (actor) {
      const info: DamageInfo = {
        amount,
        origin: origin.clone(),
        point: hit.point.clone(),
        direction: dir.clone(),
        headshot,
        weapon,
        attackerId,
        kind: 'bullet',
      };
      actor.applyDamage(info);
    }
    this.vfx?.bloodImpact(hit.point, hit.normal, dir);
    this.ctx.events.emit('hit:confirm', {
      headshot,
      lethal,
      position: hit.point.clone(),
    });
  }

  private emitSurface(hit: RaycastHit, incoming: THREE.Vector3) {
    this.vfx?.surfaceImpact(hit.point, hit.normal, hit.surface, incoming);
    this.ctx.events.emit('hit:surface', {
      point: hit.point.clone(),
      normal: hit.normal.clone(),
      surface: hit.surface,
      incoming: incoming.clone(),
      object: hit.object ?? undefined,
    });
  }

  private damageAt(spec: WeaponSpec, dist: number): number {
    if (dist <= spec.damageRangeStart) return spec.damage;
    if (dist >= spec.damageRangeEnd) return spec.damage * spec.damageFalloff;
    const t = (dist - spec.damageRangeStart) / (spec.damageRangeEnd - spec.damageRangeStart);
    return spec.damage * (1 - (1 - spec.damageFalloff) * t);
  }

  private bodyMult(spec: WeaponSpec, hit: RaycastHit): number {
    if (hit.bodyPart === 'head') return spec.headshotMultiplier;
    if (hit.bodyPart === 'limb') return 0.85;
    return 1;
  }

  private specRef: Map<string, WeaponSpec> = new Map();
  setSpecs(specs: Record<string, WeaponSpec>) {
    for (const k of Object.keys(specs)) this.specRef.set(k, specs[k]);
  }
  private specFallback(id: string): WeaponSpec | null {
    return this.specRef.get(id) ?? null;
  }

  dispose() {
    for (const p of this.pool) p.active = false;
  }
}
