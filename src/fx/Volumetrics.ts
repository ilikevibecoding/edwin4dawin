import * as THREE from 'three';
import { rng, saturate } from '../core/MathUtils';
import { Basis, fxScratch, hexColor } from './Emit';
import { resetDesc } from './ParticleSystem';
import { GLOW } from './Textures';
import type { FXDeps } from './Shared';

/** A smoke cloud that keeps emitting for its whole duration. */
class SmokeSource {
  active = false;
  readonly position = new THREE.Vector3();
  readonly color = new THREE.Color();
  radius = 2;
  remaining = 0;
  duration = 0;
  rate = 8;
  accumulator = 0;
  /** Sun reaching the base of the cloud, and the air a few metres above it. */
  sunLow = 1;
  sunHigh = 1;
}

class FireSource {
  active = false;
  readonly position = new THREE.Vector3();
  radius = 1;
  remaining = 0;
  duration = 0;
  flameAccum = 0;
  emberAccum = 0;
  smokeAccum = 0;
  hazeAccum = 0;
  flicker = 0;
  sunLow = 1;
  sunHigh = 1;
}

const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);
const DEFAULT_SMOKE = 0xb6b9bd;

/**
 * Hard ceilings on sprite diameter, in metres.
 *
 * Sizing a flame off the radius of the fire is what turns a burning airstrike
 * crater into a flat orange smear: a nine-metre fire gets nine-metre flame
 * billboards, and one quad that wide has no internal structure the eye can read
 * as burning — it is a colour wash with a soft edge. A large fire is a great many
 * ordinary flames, so the size is capped and the count carries the volume.
 */
const MAX_FLAME_SPRITE = 2.8;
const MAX_HAZE_SPRITE = 4;

/**
 * Most particles a source may emit in one step, whatever the step length.
 *
 * Emission is metered in particles per second against elapsed time, so the only
 * thing this guards is a pathological frame — an alt-tab, a shader compile — and
 * it has to be well above what a normal long frame asks for. A fixed per-frame
 * drain instead of a burst ceiling is what makes a cloud photograph far thinner
 * than it plays: under a software rasteriser a frame is a tenth of a second of
 * simulation, so a source metering forty puffs a second is owed four of them and
 * a budget of four hands back one.
 */
const MAX_BURST = 14;

/**
 * Sustained volumetric effects: smoke clouds, ambient dust and fires.
 *
 * A cloud cannot be a single burst — a smoke grenade billows for fifteen seconds
 * and a fire burns for a minute — so each one is a source that meters particles
 * out over its lifetime at a rate chosen to hold a target population. That keeps
 * the cloud alive without ever exceeding its share of the particle budget, and
 * makes the cloud grow and settle the way a real one does.
 */
export class VolumetricEffects {
  private readonly smokeSources: SmokeSource[] = [];
  private readonly fireSources: FireSource[] = [];
  private readonly basis = new Basis();
  private readonly dir = new THREE.Vector3();
  private readonly scorchPoint = new THREE.Vector3();
  private readonly groundNormal = new THREE.Vector3(0, 1, 0);

  /** Scales emission rates with the quality tier's particle budget. */
  density = 1;
  /** Folds duplicate reports of the same effect from weapons and combat. */
  dedupe: ((position: THREE.Vector3, kind: string) => boolean) | null = null;

  constructor(private readonly deps: FXDeps) {}

  get activeSmoke(): number {
    let n = 0;
    for (const s of this.smokeSources) if (s.active) n++;
    return n;
  }

  get activeFires(): number {
    let n = 0;
    for (const f of this.fireSources) if (f.active) n++;
    return n;
  }

  // -------------------------------------------------------------------------
  // Smoke
  // -------------------------------------------------------------------------

  smoke(position: THREE.Vector3, radius: number, duration: number, color?: number): void {
    if (this.dedupe?.(position, 'smoke')) return;
    const r = Math.max(0.4, radius);
    const source = this.acquireSmoke();
    source.active = true;
    source.position.copy(position);
    source.radius = r;
    source.duration = Math.max(0.35, duration);
    source.remaining = source.duration;
    this.probeSun(position, r * 2 + 4, source);
    hexColor(color ?? DEFAULT_SMOKE, source.color);

    // Hold enough sprites in the air that the cloud reads as a volume rather
    // than as a handful of billboards, then emit at the rate that sustains it.
    // The group has 3000 slots at the top tier and a screening cloud is the one
    // effect that genuinely needs a couple of hundred of them: density here is
    // the difference between concealment and a light haze.
    const life = this.smokeLife(r);
    const population = Math.min(240, 30 + r * 32) * this.density;
    source.rate = population / life;
    source.accumulator = 0;

    // The initial billow, so the grenade is a cloud immediately.
    const burst = Math.max(6, Math.round(Math.min(56, 10 + r * 10) * this.density));
    for (let i = 0; i < burst; i++) this.emitSmokePuff(source, true);
  }

  private smokeLife(radius: number): number {
    return 3.2 + Math.min(radius, 6) * 0.75;
  }

  private emitSmokePuff(source: SmokeSource, initial: boolean): void {
    const d = resetDesc();
    const r = source.radius;
    const c = source.color;
    this.basis.set(UP);
    this.basis.cone(2, this.dir);
    // Seeded across the whole cloud. Filling a radius with sprites the width of
    // that radius is what turns a cloud into three grey billboards; the volume
    // has to come from spreading many smaller puffs through it.
    // The seeding volume grows as the source burns. A cloud that keeps emitting
    // into the same sphere for fifteen seconds is a ball of fixed size with new
    // puffs appearing inside it, which is not what a screening charge does — it
    // spreads, and the spread is most of what says the thing is still venting.
    const spread = initial ? 0.95 : 0.7 + (1 - source.remaining / source.duration) * 0.85;
    const offset = Math.cbrt(rng.next()) * r * spread;
    d.px = source.position.x + this.dir.x * offset;
    d.py = source.position.y + this.dir.y * offset * 0.6 + r * 0.12;
    d.pz = source.position.z + this.dir.z * offset;

    // Outward creep plus a slow rise, and the wind takes it from there.
    const push = rng.range(0.12, 0.5) * (initial ? 2.2 : 1);
    const wind = this.deps.wind;
    d.vx = this.dir.x * push + wind.x * rng.range(0.1, 0.45);
    d.vy = rng.range(0.15, 0.55);
    d.vz = this.dir.z * push + wind.z * rng.range(0.1, 0.45);

    d.life = this.smokeLife(r) * rng.range(0.7, 1.25);
    // Optical depth goes as sprite area times count, and a screening cloud has
    // to actually screen: at the previous width the wall grid behind a smoke
    // grenade was legible straight through the middle of it.
    d.size0 = Math.min(r * rng.range(0.42, 0.62), 4);
    d.size1 = Math.min(d.size0 * rng.range(1.5, 2.1), 8);
    d.roll = rng.range(0, Math.PI * 2);
    // Barely turning; fast-spinning smoke is one of the classic tells.
    d.rollRate = rng.range(-0.16, 0.16);
    d.r0 = c.r;
    d.g0 = c.g;
    d.b0 = c.b;
    d.r1 = c.r * 0.78;
    d.g1 = c.g * 0.8;
    d.b1 = c.b * 0.84;
    d.alpha = rng.range(0.6, 0.95);
    // Very slightly buoyant while warm, then neutral.
    d.gravity = -0.12;
    d.drag = 0.65;
    d.turbulence = 0.3;
    d.cell = 0;
    d.frames = 16;
    d.fadeIn = 0.22;
    // Scaled to the sprite, not to the cloud. The depth fade is there to hide
    // the straight line a quad cuts where it enters a wall, and that line is a
    // property of the quad — so a metre-wide puff needs about a metre of fade.
    // Sizing it off the cloud instead gives a six-metre bank three metres of
    // fade band, which is wider than most of the sprites in it, and the whole
    // cloud dissolves as it approaches the surface it is supposed to be piled
    // against.
    d.softness = Math.min(d.size0 * 0.85, 2);
    // Puffs seeded higher in the cloud see more sky, so the top of a cloud
    // sitting in a shadowed street still catches the sun.
    d.sunVisibility = this.mixSun(source, saturate((d.py - source.position.y) / (r + 2)));
    d.priority = 210;
    this.deps.groups.smoke.spawn(this.deps.now, d);
  }

  // -------------------------------------------------------------------------
  // Dust
  // -------------------------------------------------------------------------

  dust(position: THREE.Vector3, radius: number, strength: number): void {
    if (this.dedupe?.(position, 'dust')) return;
    const groups = this.deps.groups;
    const now = this.deps.now;
    const r = Math.max(0.2, radius);
    const s = saturate(strength);
    const count = Math.max(2, Math.round((3 + r * 2.2 + s * 6) * this.density));
    const sun = this.deps.sunVisibility(position);

    this.basis.set(UP);
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      this.basis.discOffset(r * 0.7, this.dir);
      d.px = position.x + this.dir.x;
      d.py = position.y + rng.range(0.02, 0.3) * r;
      d.pz = position.z + this.dir.z;
      // Kicked outward along the ground; that low, wide shape is what reads as
      // dust rather than as smoke.
      const outward = rng.range(0.3, 1.5) * (0.5 + s);
      d.vx = this.dir.x * outward;
      d.vy = rng.range(0.25, 1.1) * (0.4 + s * 0.9);
      d.vz = this.dir.z * outward;
      d.life = rng.range(0.8, 1.9) * (0.7 + s * 0.6);
      d.size0 = Math.min(r * rng.range(0.18, 0.32), 2.5);
      d.size1 = Math.min(d.size0 * rng.range(1.8, 2.8), 6);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-0.5, 0.5);
      d.r0 = 0.3;
      d.g0 = 0.27;
      d.b0 = 0.22;
      d.r1 = 0.17;
      d.g1 = 0.155;
      d.b1 = 0.13;
      d.alpha = rng.range(0.34, 0.62) * (0.45 + s * 0.75);
      d.gravity = 0.6;
      d.drag = 1.6;
      d.turbulence = 0.35;
      d.cell = (rng.next() * 4) | 0;
      d.fadeIn = 0.14;
      d.softness = Math.min(d.size0 * 0.9, 1.5);
      d.sunVisibility = sun;
      d.priority = 110;
      groups.dust.spawn(now, d);
    }
  }

  // -------------------------------------------------------------------------
  // Fire
  // -------------------------------------------------------------------------

  fire(position: THREE.Vector3, radius: number, duration: number): void {
    const r = Math.max(0.25, radius);
    // A second fire in the same place should feed the first, not stack on it.
    for (const f of this.fireSources) {
      if (!f.active) continue;
      if (f.position.distanceToSquared(position) < r * r * 0.6) {
        f.remaining = Math.max(f.remaining, duration);
        f.duration = Math.max(f.duration, duration);
        f.radius = Math.max(f.radius, r);
        return;
      }
    }

    const source = this.acquireFire();
    source.active = true;
    source.position.copy(position);
    source.radius = r;
    source.duration = Math.max(0.5, duration);
    source.remaining = source.duration;
    source.flameAccum = 0;
    source.emberAccum = 0;
    source.smokeAccum = 0;
    source.hazeAccum = 0;
    source.flicker = 0;
    this.probeSun(position, r * 3 + 6, source);

    this.scorchPoint.copy(position);
    this.scorchPoint.y += 0.01;
    this.deps.decals.place({
      point: this.scorchPoint,
      normal: this.groundNormal,
      size: r * 2.2,
      kind: 'scorch',
      surface: 'concrete',
      opacity: 0.55,
      conform: true,
    });
  }

  private emitFlame(source: FireSource): void {
    const d = resetDesc();
    const r = source.radius;
    this.basis.set(UP);
    this.basis.discOffset(r * 0.55, this.dir);
    d.px = source.position.x + this.dir.x;
    d.py = source.position.y + rng.range(0, 0.12) * r;
    d.pz = source.position.z + this.dir.z;
    const rise = rng.range(1.6, 3.4) * (0.6 + r * 0.35);
    d.vx = this.dir.x * 0.35 + this.deps.wind.x * 0.25;
    d.vy = rise;
    d.vz = this.dir.z * 0.35 + this.deps.wind.z * 0.25;
    d.life = rng.range(0.45, 0.85) * (0.75 + r * 0.25);
    // Flames stand well above the fuel bed they come off — a metre of burning
    // ground throws two metres of fire — and they stretch as they detach.
    d.size0 = Math.min(r * rng.range(0.8, 1.4), MAX_FLAME_SPRITE);
    d.size1 = Math.min(d.size0 * rng.range(1.05, 1.6), MAX_FLAME_SPRITE * 1.5);
    d.roll = rng.range(0, Math.PI * 2);
    d.rollRate = rng.range(-1.6, 1.6);
    // Blackbody encoding: radiance and ramp position. A flame is already well
    // down the ramp at birth — a fuel fire never reaches the white of a
    // detonation — and it cools to a dull red as it detaches from the bed.
    d.r0 = 4.2;
    d.g0 = rng.range(0.24, 0.36);
    d.r1 = 0.5;
    d.g1 = rng.range(0.62, 0.78);
    d.alpha = 1;
    d.additive = 0.9;
    // Buoyancy, not gravity: flame accelerates upward as it burns.
    d.gravity = -2.6;
    d.drag = 1.9;
    d.turbulence = 0.5;
    d.cell = 0;
    d.frames = 16;
    d.fadeIn = 0.12;
    d.softness = r * 0.35;
    d.priority = 195;
    this.deps.groups.fire.spawn(this.deps.now, d);
  }

  private emitEmber(source: FireSource): void {
    const d = resetDesc();
    const r = source.radius;
    this.basis.set(UP);
    this.basis.discOffset(r * 0.6, this.dir);
    d.px = source.position.x + this.dir.x;
    d.py = source.position.y + rng.range(0.1, 0.5) * r;
    d.pz = source.position.z + this.dir.z;
    d.vx = this.dir.x * rng.range(0.2, 0.9) + this.deps.wind.x * rng.range(0.3, 1.2);
    d.vy = rng.range(1.4, 3.6);
    d.vz = this.dir.z * rng.range(0.2, 0.9) + this.deps.wind.z * rng.range(0.3, 1.2);
    d.life = rng.range(1.1, 2.6);
    d.size0 = rng.range(0.012, 0.032);
    d.size1 = d.size0 * 0.5;
    d.r0 = 4.5;
    d.g0 = 1.8;
    d.b0 = 0.35;
    d.r1 = 0.85;
    d.g1 = 0.1;
    d.b1 = 0.02;
    d.alpha = 1;
    d.additive = 1;
    // Rising on the thermal, then cooling and dropping out of it.
    d.gravity = -1.1;
    d.drag = 0.9;
    d.stretch = 0.3;
    d.fadeIn = 0.1;
    d.priority = 150;
    this.deps.groups.spark.spawn(this.deps.now, d);
  }

  private emitFireSmoke(source: FireSource): void {
    const d = resetDesc();
    const r = source.radius;
    this.basis.set(UP);
    this.basis.discOffset(r * 0.5, this.dir);
    d.px = source.position.x + this.dir.x;
    d.py = source.position.y + r * rng.range(0.9, 1.6);
    d.pz = source.position.z + this.dir.z;
    d.vx = this.dir.x * 0.3 + this.deps.wind.x * rng.range(0.4, 1.3);
    d.vy = rng.range(1.5, 3.2);
    d.vz = this.dir.z * 0.3 + this.deps.wind.z * rng.range(0.4, 1.3);
    d.life = rng.range(2.4, 4.6);
    d.size0 = Math.min(r * rng.range(0.9, 1.5), 4);
    d.size1 = Math.min(d.size0 * rng.range(1.9, 2.8), 9);
    d.roll = rng.range(0, Math.PI * 2);
    d.rollRate = rng.range(-0.22, 0.22);
    // Oily fuel smoke: dark at the source, greying as it entrains air. Authored
    // as sunlit values; the lit shader only scales down from here.
    d.r0 = 0.22;
    d.g0 = 0.21;
    d.b0 = 0.2;
    d.r1 = 0.42;
    d.g1 = 0.41;
    d.b1 = 0.4;
    d.alpha = rng.range(0.6, 0.92);
    d.gravity = -0.35;
    d.drag = 0.5;
    d.turbulence = 0.6;
    d.cell = 0;
    d.frames = 16;
    d.fadeIn = 0.2;
    d.softness = r * 0.8;
    // Fire smoke is born well above the fuel bed and climbing, so it sees more
    // sky than the fire does.
    d.sunVisibility = this.mixSun(source, 0.7);
    d.priority = 190;
    this.deps.groups.smoke.spawn(this.deps.now, d);
  }

  /**
   * Heat shimmer. There is no refraction buffer to distort, so this fakes it the
   * way a cheap engine has always faked it: a very faint additive lens of hot
   * air that wobbles through the turbulence field and lifts the background a few
   * percent, which the eye reads as rising heat.
   */
  private emitHaze(source: FireSource): void {
    const d = resetDesc();
    const r = source.radius;
    this.basis.set(UP);
    this.basis.discOffset(r * 0.5, this.dir);
    d.px = source.position.x + this.dir.x;
    d.py = source.position.y + r * rng.range(0.5, 1.4);
    d.pz = source.position.z + this.dir.z;
    d.vy = rng.range(1.8, 3.4);
    d.life = rng.range(0.7, 1.4);
    d.size0 = Math.min(r * rng.range(0.8, 1.3), MAX_HAZE_SPRITE);
    d.size1 = Math.min(d.size0 * rng.range(1.6, 2.4), MAX_HAZE_SPRITE * 2);
    d.roll = rng.range(0, Math.PI * 2);
    d.rollRate = rng.range(-0.8, 0.8);
    d.r0 = 0.5;
    d.g0 = 0.4;
    d.b0 = 0.3;
    d.r1 = 0.16;
    d.g1 = 0.13;
    d.b1 = 0.1;
    d.alpha = 0.45;
    d.additive = 1;
    d.gravity = -1.6;
    d.drag = 1.2;
    d.turbulence = 1.1;
    d.cell = GLOW.HAZE;
    d.fadeIn = 0.3;
    d.priority = 100;
    this.deps.groups.glow.spawn(this.deps.now, d);
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number): void {
    if (dt <= 0) return;

    for (const s of this.smokeSources) {
      if (!s.active) continue;
      s.remaining -= dt;
      if (s.remaining <= 0) {
        s.active = false;
        continue;
      }
      // Emission tapers off over the last third so the cloud thins out instead
      // of stopping dead.
      const taper = saturate(s.remaining / (s.duration * 0.34));
      s.accumulator = Math.min(s.accumulator + s.rate * taper * dt, MAX_BURST);
      while (s.accumulator >= 1) {
        s.accumulator -= 1;
        this.emitSmokePuff(s, false);
      }
    }

    for (const f of this.fireSources) {
      if (!f.active) continue;
      f.remaining -= dt;
      if (f.remaining <= 0) {
        f.active = false;
        continue;
      }
      // Fires die down rather than switching off.
      const strength = saturate(f.remaining / (f.duration * 0.25));
      const scale = this.density * (0.5 + f.radius * 0.6) * strength;

      // Rates are capped as well as scaled. A large fire is limited by its share
      // of the group, not by its area, and emitting past that share only churns
      // the pool — nine burning craters asking for twelve hundred flames between
      // them get eight hundred and spend the difference on evictions.
      f.flameAccum = Math.min(f.flameAccum + Math.min(24 * scale, 70) * dt, MAX_BURST);
      while (f.flameAccum >= 1) {
        f.flameAccum -= 1;
        this.emitFlame(f);
      }

      f.emberAccum = Math.min(f.emberAccum + Math.min(8 * scale, 22) * dt, MAX_BURST);
      while (f.emberAccum >= 1) {
        f.emberAccum -= 1;
        this.emitEmber(f);
      }

      f.smokeAccum = Math.min(f.smokeAccum + Math.min(5 * scale, 16) * dt, MAX_BURST);
      while (f.smokeAccum >= 1) {
        f.smokeAccum -= 1;
        this.emitFireSmoke(f);
      }

      f.hazeAccum = Math.min(f.hazeAccum + 2.4 * scale * dt, MAX_BURST);
      while (f.hazeAccum >= 1) {
        f.hazeAccum -= 1;
        this.emitHaze(f);
      }

      f.flicker -= dt;
      if (f.flicker <= 0) {
        f.flicker = rng.range(0.06, 0.15);
        const jitter = rng.range(0.7, 1.35);
        fxScratch.a.copy(f.position);
        fxScratch.a.y += f.radius * 0.5;
        this.deps.requestLight(
          fxScratch.a,
          0xff7a24,
          (8 + f.radius * 26) * strength * jitter,
          3 + f.radius * 5,
          0.2,
        );
      }
    }
  }

  clear(): void {
    for (const s of this.smokeSources) s.active = false;
    for (const f of this.fireSources) f.active = false;
  }

  /**
   * Probe the sun twice: at the source and at the air above it.
   *
   * A cloud in a street is a tall object in a shadowed slot, and one occlusion
   * value for the whole thing is wrong at both ends — shaded at the base it
   * would be, but the top of the plume is usually out in the open, and that
   * bright crown against a dark base is most of what makes a column read as
   * something rising rather than as a grey shape.
   */
  private probeSun(position: THREE.Vector3, height: number, into: SmokeSource | FireSource): void {
    into.sunLow = this.deps.sunVisibility(position);
    fxScratch.b.copy(position);
    fxScratch.b.y += height;
    into.sunHigh = this.deps.sunVisibility(fxScratch.b);
  }

  private mixSun(source: SmokeSource | FireSource, height: number): number {
    return source.sunLow + (source.sunHigh - source.sunLow) * saturate(height);
  }

  private acquireSmoke(): SmokeSource {
    for (const s of this.smokeSources) if (!s.active) return s;
    if (this.smokeSources.length < 10) {
      const s = new SmokeSource();
      this.smokeSources.push(s);
      return s;
    }
    // Saturated: take the one with the least life left.
    let victim = this.smokeSources[0];
    for (const s of this.smokeSources) if (s.remaining < victim.remaining) victim = s;
    return victim;
  }

  private acquireFire(): FireSource {
    for (const f of this.fireSources) if (!f.active) return f;
    if (this.fireSources.length < 8) {
      const f = new FireSource();
      this.fireSources.push(f);
      return f;
    }
    let victim = this.fireSources[0];
    for (const f of this.fireSources) if (f.remaining < victim.remaining) victim = f;
    return victim;
  }
}
