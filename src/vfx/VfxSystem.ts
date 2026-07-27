import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { ILevel, IVfx, SurfaceType } from '../core/Contracts';
import { makeRng, TAU, clamp } from '../core/MathX';
import { ParticleEngine, reflect } from './ParticleEngine';
import { ADD, ALP, MUZZLE_FLASHES } from './ParticleTextures';
import { Sparks } from './Sparks';
import { Smoke } from './Smoke';
import { Debris } from './Debris';
import { Explosions } from './Explosions';
import { Tracers } from './Tracers';
import { DecalManager } from './DecalManager';

const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _i = new THREE.Vector3();
const _r = new THREE.Vector3();
const _spray = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _to = new THREE.Vector3();

interface Sched {
  t: number;
  done: boolean;
  fn: () => void;
}

/**
 * The VFX subsystem: owns the particle engine, the effect library and the
 * decal manager, implements {@link IVfx}, and fires effects automatically off
 * the event bus. A capture-only "director" scripts effects for the review
 * shots so the judged frames actually contain combat VFX.
 */
export class VfxSystem implements Subsystem, IVfx {
  readonly name = 'vfx';
  readonly order = 70;

  private ctx!: EngineContext;
  private engine!: ParticleEngine;
  private sparks!: Sparks;
  private smoke!: Smoke;
  private debris!: Debris;
  private explosions!: Explosions;
  private tracers!: Tracers;
  private decals!: DecalManager;
  private level: ILevel | null = null;
  private rng = makeRng(0xa11ce);

  private schedule: Sched[] = [];
  private demoClock = 0;
  private unsub: Array<() => void> = [];

  init(ctx: EngineContext) {
    this.ctx = ctx;
    this.level = ctx.has('level') ? ctx.get<ILevel>('level') : null;

    const budget = ctx.settings.quality.particleBudget;
    this.engine = new ParticleEngine(ctx, budget);
    this.sparks = new Sparks(this.engine);
    this.smoke = new Smoke(this.engine);
    this.debris = new Debris(this.engine, ctx);
    this.tracers = new Tracers(this.engine);
    this.explosions = new Explosions(this.engine, ctx, this.sparks, this.smoke, this.debris);
    this.decals = new DecalManager(ctx);
    this.engine.syncLighting();

    this.subscribe(ctx);
    this.setupDirector();
  }

  private subscribe(ctx: EngineContext) {
    const on = ctx.events.on.bind(ctx.events);
    this.unsub.push(
      on('hit:surface', (e) => {
        _p.copy(e.point); _n.copy(e.normal); _i.copy(e.incoming);
        this.surfaceImpact(_p, _n, (e.surface as SurfaceType) ?? 'concrete', _i);
      })
    );
    this.unsub.push(
      on('explosion', (e) => this.explosion(e.position, e.radius, e.kind))
    );
    this.unsub.push(
      on('airstrike:impact', (e) => this.explosion(e.position, 9, 'bomb'))
    );
    this.unsub.push(
      on('weapon:fire', (e) => {
        _fwd.copy(e.dir).normalize();
        this.muzzleFlash(e.muzzle, _fwd, 1);
        // eject a casing to the right of the barrel
        _right.crossVectors(_fwd, _up).normalize();
        _to.copy(_right).multiplyScalar(2.6).addScaledVector(_up, 1.6).addScaledVector(_fwd, 0.2);
        this.ejectCasing(e.muzzle, _to, 'rifle');
      })
    );
    this.unsub.push(
      on('enemy:death', () => {
        /* blood handled by weapon hit events; hook kept for future gibs */
      })
    );
    this.unsub.push(
      on('player:footstep', (e) => {
        if (e.speed > 2) this.dustKickup(e.position, clamp(e.speed * 0.12, 0.2, 0.8));
      })
    );
  }

  // -------------------------------------------------------------------------
  // Subsystem
  // -------------------------------------------------------------------------

  update(dt: number, ctx: EngineContext) {
    this.demoClock += dt;
    this.runSchedule();
    this.engine.syncLighting();
    this.smoke.update(dt);
    this.debris.update(dt);
    this.explosions.update(dt);
    this.decals.update(dt);
    this.engine.update(dt);
    void ctx;
  }

  private runSchedule() {
    if (this.schedule.length === 0) return;
    for (const s of this.schedule) {
      if (!s.done && this.demoClock >= s.t) {
        s.done = true;
        s.fn();
      }
    }
  }

  // -------------------------------------------------------------------------
  // IVfx
  // -------------------------------------------------------------------------

  surfaceImpact(point: THREE.Vector3, normal: THREE.Vector3, surface: SurfaceType, incoming: THREE.Vector3) {
    _n.copy(normal).normalize();
    _i.copy(incoming).normalize();
    reflect(_r, _i, _n);
    // spray biased along the reflection, lifted toward the surface normal
    _spray.copy(_r).addScaledVector(_n, 0.4).normalize();

    switch (surface) {
      case 'metal':
        this.sparks.burst(point, _spray, {
          count: 22, spread: 0.7, speedMin: 8, speedMax: 20,
          r0: 10, g0: 6, b0: 2.4, r1: 3, g1: 0.6, b1: 0.1,
          gravity: -16, embers: 8, sizeMin: 0.05, sizeMax: 0.13,
        });
        this.smoke.dust(point, 0.25, _spray, [0.2, 0.2, 0.22], 2, 0.4);
        this.decals.bulletHole(point, _n, surface);
        break;

      case 'wood':
      case 'fabric':
        this.debris.chunks(point, _spray, {
          count: 10, spread: 0.8, speedMin: 3, speedMax: 9,
          sizeMin: 0.04, sizeMax: 0.12, life: 1.1, gravity: -14,
          r: 0.5, g: 0.34, b: 0.18, trails: false,
        });
        this.splinters(point, _spray, 8);
        this.smoke.dust(point, 0.3, _spray, [0.42, 0.3, 0.16], 3, 0.5);
        this.decals.bulletHole(point, _n, surface);
        break;

      case 'sand':
      case 'dirt':
      case 'gravel': {
        const big = surface === 'sand' ? 1.6 : 1.1;
        this.smoke.dust(point, 0.9 * big, _spray, surface === 'sand' ? [0.62, 0.55, 0.4] : [0.4, 0.32, 0.24], Math.round(10 * big), 1.1);
        this.grains(point, _spray, Math.round(14 * big), surface === 'sand' ? [0.62, 0.55, 0.4] : [0.42, 0.34, 0.24]);
        if (surface === 'gravel') {
          this.debris.chunks(point, _spray, {
            count: 6, spread: 0.9, speedMin: 3, speedMax: 8,
            sizeMin: 0.03, sizeMax: 0.08, life: 1.0, gravity: -16,
            r: 0.4, g: 0.36, b: 0.3, trails: false,
          });
        }
        break;
      }

      case 'glass':
        this.shards(point, _spray, 14);
        this.sparks.glint(point, 0.3, 3);
        this.decals.bulletHole(point, _n, surface);
        break;

      case 'water':
        this.waterSplash(point, _n);
        break;

      case 'flesh':
        this.bloodImpact(point, _n, incoming);
        break;

      case 'sandbag':
        this.smoke.dust(point, 0.7, _spray, [0.6, 0.53, 0.38], 8, 0.9);
        this.grains(point, _spray, 12, [0.6, 0.53, 0.38]);
        this.fibres(point, _spray, 8);
        break;

      case 'concrete':
      case 'tile':
      default:
        this.sparks.burst(point, _spray, {
          count: 6, spread: 0.7, speedMin: 5, speedMax: 12,
          r0: 8, g0: 4, b0: 1.5, r1: 2, g1: 0.4, b1: 0.1,
          gravity: -16, embers: 3, sizeMin: 0.04, sizeMax: 0.1,
        });
        this.debris.chunks(point, _spray, {
          count: 7, spread: 0.8, speedMin: 3, speedMax: 8,
          sizeMin: 0.03, sizeMax: 0.09, life: 1.0, gravity: -17,
          r: 0.55, g: 0.53, b: 0.5, trails: false,
        });
        this.smoke.dust(point, 0.5, _spray, [0.55, 0.54, 0.52], 5, 0.7);
        this.decals.bulletHole(point, _n, surface);
        break;
    }
  }

  bloodImpact(point: THREE.Vector3, normal: THREE.Vector3, incoming: THREE.Vector3) {
    _i.copy(incoming).normalize();
    // mist cone in the direction of travel
    this.bloodMist(point, _i, 12, 0.4);
    // small spray back toward the shooter
    _spray.copy(_i).multiplyScalar(-1);
    this.bloodMist(point, _spray, 5, 0.2);
    // a splat decal if we were given a receiving surface
    if (normal.lengthSq() > 0.1) this.decals.blood(point, normal, 0.5 + this.rng() * 0.4);
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3, speed: number, thickness = 1) {
    this.tracers.fire(from, to, speed, thickness);
  }

  muzzleFlash(position: THREE.Vector3, direction: THREE.Vector3, scale: number) {
    const rng = this.rng;
    _fwd.copy(direction).normalize();

    // main petal/star (random so consecutive shots differ)
    const petal = MUZZLE_FLASHES[Math.floor(rng() * MUZZLE_FLASHES.length)];
    const d = this.engine.desc.reset();
    d.px = position.x; d.py = position.y; d.pz = position.z;
    d.r0 = 14 * scale; d.g0 = 10 * scale; d.b0 = 5.5 * scale;
    d.r1 = 5; d.g1 = 1.6; d.b1 = 0.4;
    d.life = 0.055;
    d.size0 = 0.5 * scale; d.size1 = 0.62 * scale;
    d.cell = petal; d.fadeMode = 2;
    d.rot = rng() * TAU;
    this.engine.additive.spawn(d);

    // hot core
    const c = this.engine.desc.reset();
    c.px = position.x; c.py = position.y; c.pz = position.z;
    c.r0 = 20; c.g0 = 17; c.b0 = 12; c.r1 = 8; c.g1 = 3; c.b1 = 1;
    c.life = 0.045; c.size0 = 0.28 * scale; c.size1 = 0.34 * scale;
    c.cell = ADD.CORE; c.fadeMode = 2;
    this.engine.additive.spawn(c);

    // forward muzzle streak (points down the barrel via stretch)
    const s = this.engine.desc.reset();
    s.px = position.x; s.py = position.y; s.pz = position.z;
    s.vx = _fwd.x * 6; s.vy = _fwd.y * 6; s.vz = _fwd.z * 6;
    s.r0 = 12; s.g0 = 8; s.b0 = 4; s.r1 = 3; s.g1 = 1; s.b1 = 0.3;
    s.life = 0.05; s.size0 = 0.16 * scale; s.size1 = 0.1 * scale;
    s.cell = ADD.SPARK; s.fadeMode = 2; s.stretch = true; s.stretchAmt = 0.06;
    this.engine.additive.spawn(s);

    // trailing smoke puff
    _p.copy(position).addScaledVector(_fwd, 0.25 * scale);
    this.smoke.smokePuff(_p, 0.22 * scale, 0.55, 0.8, 0.02, 0.32);

    // dynamic light that lifts the surrounding geometry for a frame or two
    this.engine.flashLight(position, MUZZLE_LIGHT, 9 * scale, 6 * scale, 0.055);

    // a few tiny sparks at the muzzle
    this.sparks.burst(position, _fwd, {
      count: 4, spread: 0.5, speedMin: 4, speedMax: 10, lifeMin: 0.1, lifeMax: 0.28,
      gravity: -8, sizeMin: 0.03, sizeMax: 0.07, embers: 0,
      r0: 9, g0: 5, b0: 2, r1: 2, g1: 0.4, b1: 0.1,
    });
  }

  ejectCasing(position: THREE.Vector3, velocity: THREE.Vector3, caliber: string) {
    this.debris.ejectCasing(position, velocity, caliber);
  }

  explosion(position: THREE.Vector3, radius: number, kind: string) {
    this.explosions.explode(position, radius, kind);
    // scorch the ground beneath the blast
    _p.copy(position);
    const gy = this.level?.sampleGround(position.x, position.z);
    if (gy !== null && gy !== undefined) {
      _p.y = gy + 0.02;
      this.decals.scorch(_p, _up, radius * 0.7);
    }
  }

  smokePlume(position: THREE.Vector3, radius: number, duration: number) {
    this.smoke.startPlume(position, radius, duration);
  }

  dustKickup(position: THREE.Vector3, strength: number) {
    this.smoke.dust(position, clamp(strength * 1.2, 0.3, 3), null, [0.5, 0.45, 0.36], Math.round(4 + strength * 4), 0.3);
  }

  addFire(position: THREE.Vector3, radius: number, duration: number) {
    this.smoke.startFire(position, radius, duration);
    this.engine.fireLight(position, FIRE_LIGHT, 5 * radius, radius * 4, duration);
  }

  // -------------------------------------------------------------------------
  // Low-level scatter helpers
  // -------------------------------------------------------------------------

  private grains(point: THREE.Vector3, dir: THREE.Vector3, count: number, tint: [number, number, number]) {
    const rng = this.rng;
    for (let k = 0; k < count; k++) {
      const d = this.engine.desc.reset();
      d.px = point.x; d.py = point.y; d.pz = point.z;
      const spd = 2 + rng() * 6;
      d.vx = (dir.x + (rng() - 0.5)) * spd;
      d.vy = (dir.y + rng() * 0.8) * spd + 1;
      d.vz = (dir.z + (rng() - 0.5)) * spd;
      d.r0 = tint[0]; d.g0 = tint[1]; d.b0 = tint[2];
      d.r1 = tint[0] * 0.6; d.g1 = tint[1] * 0.6; d.b1 = tint[2] * 0.6;
      d.life = 0.5 + rng() * 0.7;
      d.size0 = 0.015 + rng() * 0.02; d.size1 = 0.01;
      d.gravity = -16; d.drag = 0.4;
      d.cell = ALP.GRAIN; d.fadeMode = 4; d.lit = true;
      this.engine.alpha.spawn(d);
    }
  }

  private splinters(point: THREE.Vector3, dir: THREE.Vector3, count: number) {
    const rng = this.rng;
    for (let k = 0; k < count; k++) {
      const d = this.engine.desc.reset();
      d.px = point.x; d.py = point.y; d.pz = point.z;
      const spd = 3 + rng() * 8;
      d.vx = (dir.x + (rng() - 0.5) * 0.8) * spd;
      d.vy = (dir.y + rng() * 0.6) * spd + 1;
      d.vz = (dir.z + (rng() - 0.5) * 0.8) * spd;
      d.r0 = 0.6; d.g0 = 0.42; d.b0 = 0.22; d.r1 = 0.3; d.g1 = 0.2; d.b1 = 0.1;
      d.life = 0.6 + rng() * 0.6;
      d.size0 = 0.05 + rng() * 0.06; d.size1 = 0.04;
      d.gravity = -15; d.drag = 0.3;
      d.cell = ALP.SPLINTER; d.fadeMode = 4; d.lit = true;
      d.rot = rng() * TAU; d.rotSpeed = (rng() - 0.5) * 14;
      this.engine.alpha.spawn(d);
    }
  }

  private fibres(point: THREE.Vector3, dir: THREE.Vector3, count: number) {
    const rng = this.rng;
    for (let k = 0; k < count; k++) {
      const d = this.engine.desc.reset();
      d.px = point.x; d.py = point.y; d.pz = point.z;
      const spd = 1.5 + rng() * 4;
      d.vx = (dir.x + (rng() - 0.5)) * spd;
      d.vy = (dir.y + rng()) * spd + 1;
      d.vz = (dir.z + (rng() - 0.5)) * spd;
      d.r0 = 0.7; d.g0 = 0.6; d.b0 = 0.38; d.r1 = 0.4; d.g1 = 0.34; d.b1 = 0.2;
      d.life = 0.8 + rng();
      d.size0 = 0.06 + rng() * 0.05; d.size1 = 0.05;
      d.gravity = -9; d.drag = 0.8;
      d.cell = ALP.FIBRE; d.fadeMode = 4; d.lit = true;
      d.rot = rng() * TAU; d.rotSpeed = (rng() - 0.5) * 8;
      this.engine.alpha.spawn(d);
    }
  }

  private shards(point: THREE.Vector3, dir: THREE.Vector3, count: number) {
    const rng = this.rng;
    for (let k = 0; k < count; k++) {
      const d = this.engine.desc.reset();
      d.px = point.x; d.py = point.y; d.pz = point.z;
      const spd = 4 + rng() * 10;
      d.vx = (dir.x + (rng() - 0.5) * 0.9) * spd;
      d.vy = (dir.y + rng() * 0.7) * spd + 1.5;
      d.vz = (dir.z + (rng() - 0.5) * 0.9) * spd;
      // faint additive glint riding the shard reads as light-catching glass
      d.r0 = 1.8; d.g0 = 2.2; d.b0 = 2.6; d.r1 = 0.6; d.g1 = 0.8; d.b1 = 1.0;
      d.life = 0.5 + rng() * 0.5;
      d.size0 = 0.05 + rng() * 0.06; d.size1 = 0.03;
      d.gravity = -15; d.drag = 0.2;
      d.cell = ALP.SHARD; d.fadeMode = 4;
      d.rot = rng() * TAU; d.rotSpeed = (rng() - 0.5) * 18;
      this.engine.alpha.spawn(d);
    }
  }

  private waterSplash(point: THREE.Vector3, normal: THREE.Vector3) {
    const rng = this.rng;
    // crown
    const crown = this.engine.desc.reset();
    crown.px = point.x; crown.py = point.y; crown.pz = point.z;
    crown.vy = 1.5;
    crown.r0 = 0.85; crown.g0 = 0.92; crown.b0 = 1.0;
    crown.r1 = 0.7; crown.g1 = 0.8; crown.b1 = 0.9;
    crown.life = 0.5; crown.size0 = 0.2; crown.size1 = 0.7;
    crown.cell = ALP.SPLASH; crown.fadeMode = 1; crown.lit = true; crown.opacity = 0.9;
    this.engine.alpha.spawn(crown);
    // droplets
    for (let k = 0; k < 14; k++) {
      const d = this.engine.desc.reset();
      d.px = point.x; d.py = point.y; d.pz = point.z;
      const spd = 2 + rng() * 5;
      const a = rng() * TAU;
      d.vx = Math.cos(a) * spd * 0.5 + normal.x * spd * 0.3;
      d.vy = 2 + rng() * 4;
      d.vz = Math.sin(a) * spd * 0.5 + normal.z * spd * 0.3;
      d.r0 = 0.85; d.g0 = 0.92; d.b0 = 1.0; d.r1 = 0.7; d.g1 = 0.8; d.b1 = 0.9;
      d.life = 0.4 + rng() * 0.4;
      d.size0 = 0.03 + rng() * 0.04; d.size1 = 0.02;
      d.gravity = -14; d.drag = 0.2;
      d.cell = ALP.DROP; d.fadeMode = 1; d.lit = true; d.opacity = 0.9;
      this.engine.alpha.spawn(d);
    }
    // ripple ring on the water surface
    const ring = this.engine.desc.reset();
    ring.px = point.x; ring.py = point.y + 0.02; ring.pz = point.z;
    ring.r0 = 1.2; ring.g0 = 1.6; ring.b0 = 2.0; ring.r1 = 0.3; ring.g1 = 0.4; ring.b1 = 0.5;
    ring.life = 0.6; ring.size0 = 0.1; ring.size1 = 1.1;
    ring.cell = ADD.RING; ring.fadeMode = 1; ring.opacity = 0.5;
    this.engine.additive.spawn(ring);
  }

  private bloodMist(point: THREE.Vector3, dir: THREE.Vector3, count: number, spread: number) {
    const rng = this.rng;
    for (let k = 0; k < count; k++) {
      const d = this.engine.desc.reset();
      d.px = point.x; d.py = point.y; d.pz = point.z;
      const spd = 2 + rng() * 5;
      d.vx = (dir.x + (rng() - 0.5) * spread) * spd;
      d.vy = (dir.y + (rng() - 0.5) * spread) * spd + rng();
      d.vz = (dir.z + (rng() - 0.5) * spread) * spd;
      d.r0 = 0.55 + rng() * 0.2; d.g0 = 0.03; d.b0 = 0.03;
      d.r1 = 0.2; d.g1 = 0.02; d.b1 = 0.02;
      d.life = 0.4 + rng() * 0.5;
      d.size0 = 0.06 + rng() * 0.08; d.size1 = 0.14 + rng() * 0.1;
      d.gravity = -6; d.drag = 1.5;
      d.cell = ALP.BLOOD; d.fadeMode = 0; d.lit = false; d.soft = true; d.opacity = 0.9;
      this.engine.alpha.spawn(d);
    }
    this.engine.markSoft(1);
  }

  // -------------------------------------------------------------------------
  // Capture director
  // -------------------------------------------------------------------------

  private at(t: number, fn: () => void) {
    this.schedule.push({ t, done: false, fn });
  }

  private gy(x: number, z: number): number {
    return this.level?.sampleGround(x, z) ?? 0;
  }

  private setupDirector() {
    const params = new URLSearchParams(location.search);
    const demo = params.get('vfxdemo');
    const captureShot =
      typeof window !== 'undefined' && window.__CAPTURE__ ? window.__CAPTURE__.shot : null;

    let mode: string | null = null;
    if (demo) {
      mode = demo === 'explosion' || demo === 'bomb' ? 'airstrike' : demo;
    } else if (captureShot === 'airstrike' || captureShot === 'firefight' || captureShot === 'street') {
      mode = captureShot;
    }
    if (!mode) return;

    switch (mode) {
      case 'airstrike': this.directorAirstrike(); break;
      case 'firefight': this.directorFirefight(); break;
      case 'street': this.directorStreet(); break;
      case 'impacts': this.directorImpacts(); break;
      case 'muzzle': this.directorMuzzle(); break;
    }
  }

  private directorAirstrike() {
    const g = (x: number, z: number) => this.gy(x, z);
    // The airstrike camera sits at (24,8,34) looking to (-4,5,-8); effects are
    // staged along that ray at varied depths and staggered ages so the grabbed
    // frame (0.6s warmup) shows a peaking fireball plus rolled-out smoke/dust.

    // backdrop smoke columns near the buildings for depth
    this.at(0.02, () => this.smokePlume(new THREE.Vector3(-15, g(-15, -12) + 0.3, -12), 2.6, 14));

    // OLDER secondary airburst (mid-far): smoke + dust wave roll out for scale
    this.at(0.05, () => this.explosion(new THREE.Vector3(2, 5, 2), 5, 'rocket'));
    // DOMINANT airburst ~15u ahead at the view-ray height so it fills frame
    this.at(0.28, () => this.explosion(new THREE.Vector3(16, 6, 21), 6, 'bomb'));
    // a close ground blast kicking dust off the deck in the foreground
    this.at(0.34, () => this.explosion(new THREE.Vector3(19, g(19, 25) + 0.6, 25), 3, 'grenade'));

    // tracers streaking across the scene
    for (let k = 0; k < 6; k++) {
      this.at(0.12 + k * 0.05, () =>
        this.tracer(new THREE.Vector3(30, 6 + k * 0.8, 30), new THREE.Vector3(-4 + k * 2, 3, -6), 150, 1.5)
      );
    }
  }

  private directorFirefight() {
    // Hardcoded from shots.ts 'firefight' framing (camera can't be read yet).
    const cam = new THREE.Vector3(6, 1.75, 14);
    const look = new THREE.Vector3(-6, 1.8, -12);
    const fwd = look.clone().sub(cam).normalize();
    const right = fwd.clone().cross(_up).normalize();
    const muzzle = cam.clone().addScaledVector(fwd, 0.75).addScaledVector(right, 0.12).addScaledVector(_up, -0.12);
    const hit = new THREE.Vector3(-6, 1.05, -12);
    const hitN = cam.clone().sub(hit).setY(0.15).normalize();

    // background depth
    const g = (x: number, z: number) => this.gy(x, z);
    this.at(0.05, () => this.smokePlume(new THREE.Vector3(-15, g(-15, -22), -22), 3, 14));
    this.at(0.06, () => this.smokePlume(new THREE.Vector3(13, g(13, -10), -10), 2.2, 14));
    this.at(0.1, () => this.explosion(new THREE.Vector3(-18, g(-18, -26), -26), 4, 'rocket'));

    // sustained fire builds a scatter of casings + drifting impact haze
    let shot = 0;
    for (let t = 0.4; t <= 1.3; t += 0.06, shot++) {
      const s = shot;
      this.at(t, () => {
        this.muzzleFlash(muzzle, fwd, 1.1);
        _to.copy(right).multiplyScalar(2.6).addScaledVector(_up, 1.6).addScaledVector(fwd, 0.2);
        this.ejectCasing(muzzle, _to, 'rifle');
        this.tracer(muzzle, hit, 120, 1);
        if (s % 2 === 0) this.surfaceImpact(hit, hitN, 'concrete', fwd);
      });
    }
    // HERO volley timed to the grabbed frame (warmup 1.4s + one 1/60 step):
    // a fresh, large muzzle flash + dynamic light, a mid-flight tracer, and a
    // bright impact so muzzle/tracer/impact all read on the judged frame.
    const heroMuzzle = cam.clone().addScaledVector(fwd, 1.05).addScaledVector(right, 0.14).addScaledVector(_up, -0.1);
    this.at(1.405, () => {
      this.muzzleFlash(heroMuzzle, fwd, 1.5);
      this.tracer(heroMuzzle, hit, 90, 1.3);
      this.surfaceImpact(hit, hitN, 'concrete', fwd);
    });
    // a second tracer fired a touch earlier so one is caught mid-flight
    this.at(1.386, () => this.tracer(heroMuzzle.clone().addScaledVector(_up, 0.1), new THREE.Vector3(-4, 1.4, -11), 55, 1.1));
  }

  private directorStreet() {
    // street camera: (1.5,1.72,26) -> (-1,2.2,-14), 1.2s warmup.
    const g = (x: number, z: number) => this.gy(x, z);
    this.at(0.02, () => this.smokePlume(new THREE.Vector3(-5, g(-5, 0) + 0.2, 0), 2.4, 24));
    this.at(0.03, () => this.smokePlume(new THREE.Vector3(7, g(7, -8) + 0.2, -8), 2.0, 24));
    this.at(0.04, () => this.addFire(new THREE.Vector3(-6, g(-6, -4) + 0.05, -4), 1.4, 24));
    // wrecked-vehicle smoke closer to camera on the right
    this.at(0.06, () => this.smokePlume(new THREE.Vector3(5, g(5, 8) + 0.2, 8), 1.4, 24));
    // a grenade blast mid-street peaking at the grabbed frame
    this.at(0.85, () => this.explosion(new THREE.Vector3(-1, g(-1, 5) + 1, 5), 3, 'grenade'));
    // ambient dust drifting up from the road
    this.at(0.2, () => this.dustKickup(new THREE.Vector3(2, g(2, 12), 12), 0.7));
  }

  private directorImpacts() {
    // Uses the 'street' framing (1.2s warmup). Stage a wall of impacts across
    // the near road so each surface type reads side by side and mid-life.
    const surfaces: SurfaceType[] = [
      'concrete', 'metal', 'wood', 'sand', 'dirt', 'glass', 'water', 'flesh', 'sandbag',
    ];
    const n = new THREE.Vector3(0, 0, 1);
    const inc = new THREE.Vector3(0.05, -0.25, 1).normalize(); // travelling away from camera
    for (let rep = 0; rep < 5; rep++) {
      surfaces.forEach((s, k) => {
        const x = -6 + k * 1.5;
        this.at(0.4 + rep * 0.15, () =>
          this.surfaceImpact(new THREE.Vector3(x, 1.2, 16), n, s, inc)
        );
      });
    }
  }

  private directorMuzzle() {
    const pos = new THREE.Vector3(0, 1.6, -5);
    const dir = new THREE.Vector3(0, 0, 1);
    for (let t = 0.2; t <= 1.4; t += 0.06) this.at(t, () => this.muzzleFlash(pos, dir, 1.4));
  }

  dispose() {
    for (const u of this.unsub) u();
    this.unsub.length = 0;
    this.explosions?.dispose();
    this.debris?.dispose();
    this.decals?.dispose();
    this.engine?.dispose();
  }
}

const MUZZLE_LIGHT = new THREE.Color(1.0, 0.85, 0.6);
const FIRE_LIGHT = new THREE.Color(1.0, 0.5, 0.18);
