import * as THREE from 'three';
import { rng } from '../core/MathUtils';
import { Basis, fxScratch } from './Emit';
import { PD, resetDesc } from './ParticleSystem';
import { CHIP, GLOW } from './Textures';
import type { FXDeps } from './Shared';

export type ExplosionKind = 'grenade' | 'rocket' | 'airstrike' | 'vehicle' | 'barrel';

interface ExplosionPreset {
  /**
   * Radius the fireball actually reaches, as a fraction of the blast radius.
   * The blast radius the gameplay code passes in is a *damage* radius; the
   * luminous ball is a good deal smaller than the volume that hurts you.
   */
  fireRadius: number;
  /** Radius of the smoke column at its base, as a fraction of blast radius. */
  columnRadius: number;
  /** How high the smoke column climbs, in metres. */
  columnHeight: number;
  /** Upward velocity of the column base, m/s. */
  columnSpeed: number;
  /**
   * Seconds over which column particles keep spawning.
   *
   * This has to be close to `columnHeight / columnSpeed` — the time the plume
   * takes to climb — or the column has no stem. Emit for a fraction of the climb
   * and every puff rises together as one clump, which detaches from the ground
   * and leaves a dark blob floating over an untouched crater: the single most
   * obvious way for an explosion to stop looking like one. Emitting for as long
   * as the plume is climbing means there is smoke at every height at once, which
   * is what a column is.
   */
  columnSpawnWindow: number;
  /**
   * Seconds a column puff lives.
   *
   * This is the number that decides how long a detonation is still visible from
   * across the map, and the honest values are much larger than a particle system
   * is usually given: the smoke over a heavy bomb is still standing a minute
   * later. Long life has to be paid for with low per-puff opacity or the plume
   * becomes an opaque wall parked over the level.
   */
  columnLife: number;
  /** Puffs in the low dust pall that spreads out around the base. */
  pallCount: number;
  fireballCount: number;
  smokeCount: number;
  sparkCount: number;
  chunkCount: number;
  dirtCount: number;
  waveCount: number;
  /** Ground dust wave reach as a multiple of radius. */
  waveReach: number;
  /** Peak dynamic-light intensity. */
  lightIntensity: number;
  /** Seconds of lingering burn glow. */
  burnDuration: number;
  smokeAlpha: number;
  /** Crater/scorch decal size as a multiple of radius. */
  scorchScale: number;
  /** Leaves a persistent fire behind. */
  leavesFire: boolean;
}

const PRESETS: Record<ExplosionKind, ExplosionPreset> = {
  grenade: {
    fireRadius: 0.42,
    columnRadius: 0.36,
    columnHeight: 5,
    columnSpeed: 2.6,
    columnSpawnWindow: 1.6,
    columnLife: 5.5,
    pallCount: 22,
    fireballCount: 16,
    smokeCount: 46,
    sparkCount: 34,
    chunkCount: 22,
    dirtCount: 30,
    waveCount: 26,
    waveReach: 1.3,
    lightIntensity: 260,
    burnDuration: 0.9,
    smokeAlpha: 0.5,
    scorchScale: 0.75,
    leavesFire: false,
  },
  rocket: {
    fireRadius: 0.46,
    columnRadius: 0.36,
    columnHeight: 9,
    columnSpeed: 3.4,
    columnSpawnWindow: 2.2,
    columnLife: 7,
    pallCount: 26,
    fireballCount: 20,
    smokeCount: 60,
    sparkCount: 48,
    chunkCount: 30,
    dirtCount: 36,
    waveCount: 30,
    waveReach: 1.7,
    lightIntensity: 380,
    burnDuration: 1.6,
    smokeAlpha: 0.54,
    scorchScale: 0.9,
    leavesFire: false,
  },
  barrel: {
    fireRadius: 0.5,
    columnRadius: 0.38,
    columnHeight: 13,
    columnSpeed: 4.2,
    columnSpawnWindow: 2.6,
    columnLife: 10,
    pallCount: 26,
    fireballCount: 22,
    smokeCount: 66,
    sparkCount: 40,
    chunkCount: 24,
    dirtCount: 32,
    waveCount: 30,
    waveReach: 1.6,
    lightIntensity: 420,
    burnDuration: 4.5,
    smokeAlpha: 0.58,
    scorchScale: 1.0,
    leavesFire: true,
  },
  vehicle: {
    fireRadius: 0.54,
    columnRadius: 0.4,
    columnHeight: 18,
    columnSpeed: 5,
    columnSpawnWindow: 3.0,
    columnLife: 14,
    pallCount: 34,
    fireballCount: 28,
    smokeCount: 84,
    sparkCount: 56,
    chunkCount: 40,
    dirtCount: 42,
    waveCount: 36,
    waveReach: 1.8,
    lightIntensity: 520,
    burnDuration: 7,
    smokeAlpha: 0.62,
    scorchScale: 1.2,
    leavesFire: true,
  },
  airstrike: {
    // The headline effect. The fireball reaches most of the way to the blast
    // radius and the column towers over the block, but the extra size is bought
    // with far more sprites rather than with bigger ones — a handful of enormous
    // quads is what turns an explosion into a screen-filling smear.
    fireRadius: 0.7,
    columnRadius: 0.46,
    columnHeight: 62,
    columnSpeed: 15,
    columnSpawnWindow: 4.2,
    // Half a minute. A carpet of heavy bombs that has stopped being visible six
    // seconds after the last one landed is the single least convincing thing an
    // airstrike can do.
    columnLife: 30,
    pallCount: 56,
    fireballCount: 56,
    smokeCount: 180,
    sparkCount: 130,
    chunkCount: 84,
    dirtCount: 92,
    waveCount: 84,
    waveReach: 2.6,
    lightIntensity: 1400,
    burnDuration: 9,
    smokeAlpha: 0.66,
    scorchScale: 1.7,
    leavesFire: true,
  },
};

/**
 * Hard ceilings on sprite diameter, in metres.
 *
 * A single sprite wider than this stops reading as a piece of an explosion and
 * starts reading as a texture pasted over the lens, no matter how large the
 * blast is. Coverage past the ceiling comes from spawning more of them.
 */
const MAX_FIRE_SPRITE = 9;
const MAX_SMOKE_SPRITE = 13;
const MAX_DUST_SPRITE = 8;

const DEDUPE_SLOTS = 8;
const DEDUPE_WINDOW = 0.12;
const DEDUPE_DISTANCE_SQ = 0.9 * 0.9;

interface Pulse {
  time: number;
  color: number;
  intensity: number;
  distance: number;
  duration: number;
}

/** A live explosion. Only the timed lights and the decal need per-frame work. */
class ExplosionInstance {
  active = false;
  readonly position = new THREE.Vector3();
  age = 0;
  radius = 1;
  preset!: ExplosionPreset;
  pulseIndex = 0;
  readonly pulses: Pulse[] = [];
  flickerTimer = 0;
  burnRemaining = 0;
}

/**
 * The explosion sequence.
 *
 * A real detonation is a timeline, not a puff, so one call schedules the whole
 * thing at once: every particle is written with the spawn time it should come
 * alive at, and the vertex shader keeps it collapsed until then. That means the
 * flash, fireball, ejecta, ground wave and smoke column of an airstrike — a few
 * hundred particles across four seconds of emission — cost a single burst of CPU
 * work at t=0 and nothing afterwards.
 *
 * Timeline:
 *   0 ms        white-hot flash, hot core, air shock ring, ground shock ring,
 *               peak dynamic light
 *   0-120 ms    fireball cluster expanding and rising, cooling white to yellow
 *               to orange to deep red through its colour curve
 *   20-250 ms   ejecta: sparks, chunks, dirt thrown out and up
 *   20-300 ms   ground dust wave travelling outward along the surface
 *   150 ms-4 s  smoke column spawning at the base, rising, expanding, lit from
 *               the sun side and drifting with the wind
 *   0-9 s       lingering burn glow, then ground dust; scorch and crater decals
 */
export class ExplosionEffects {
  private readonly basis = new Basis();
  private readonly dir = new THREE.Vector3();
  private readonly instances: ExplosionInstance[] = [];
  private readonly dedupePos: Float32Array = new Float32Array(DEDUPE_SLOTS * 3);
  private readonly dedupeTime: Float32Array = new Float32Array(DEDUPE_SLOTS);
  private readonly dedupeKind: string[] = new Array(DEDUPE_SLOTS).fill('');
  private dedupeCursor = 0;
  private readonly groundPoint = new THREE.Vector3();
  private readonly groundNormal = new THREE.Vector3(0, 1, 0);
  private readonly down = new THREE.Vector3(0, -1, 0);
  private readonly rayOptions = { maxDistance: 6 };

  /** Sun reaching the blast, at the ground and at the top of the plume. */
  private sunLow = 1;
  private sunHigh = 1;

  /** Scales particle counts with the quality tier's particle budget. */
  density = 1;
  /** Set by the FX system when a persistent fire should be lit. */
  onFire: ((position: THREE.Vector3, radius: number, duration: number) => void) | null = null;

  constructor(private readonly deps: FXDeps) {
    for (let i = 0; i < DEDUPE_SLOTS; i++) this.dedupeTime[i] = -1000;
  }

  get activeCount(): number {
    let n = 0;
    for (const i of this.instances) if (i.active) n++;
    return n;
  }

  /**
   * Combat and the weapon module can both report the same detonation, so an
   * identical blast at the same place within a frame or two is folded into one.
   */
  private isDuplicate(position: THREE.Vector3, kind: string): boolean {
    const now = this.deps.now;
    for (let i = 0; i < DEDUPE_SLOTS; i++) {
      if (this.dedupeKind[i] !== kind) continue;
      if (now - this.dedupeTime[i] > DEDUPE_WINDOW) continue;
      const o = i * 3;
      const dx = this.dedupePos[o] - position.x;
      const dy = this.dedupePos[o + 1] - position.y;
      const dz = this.dedupePos[o + 2] - position.z;
      if (dx * dx + dy * dy + dz * dz < DEDUPE_DISTANCE_SQ) return true;
    }
    const slot = this.dedupeCursor;
    this.dedupeCursor = (this.dedupeCursor + 1) % DEDUPE_SLOTS;
    const o = slot * 3;
    this.dedupePos[o] = position.x;
    this.dedupePos[o + 1] = position.y;
    this.dedupePos[o + 2] = position.z;
    this.dedupeTime[slot] = now;
    this.dedupeKind[slot] = kind;
    return false;
  }

  /** True when a duplicate of `kind` was already recorded here. */
  isDuplicateOf(position: THREE.Vector3, kind: string): boolean {
    return this.isDuplicate(position, kind);
  }

  /** Returns false when this detonation was folded into a duplicate report. */
  explode(position: THREE.Vector3, radius: number, kind: ExplosionKind): boolean {
    if (this.isDuplicate(position, `x:${kind}`)) return false;
    const preset = PRESETS[kind] ?? PRESETS.grenade;
    const r = Math.max(0.6, radius);
    const now = this.deps.now;
    const groundY = this.findGround(position, r);

    this.sunLow = this.deps.sunVisibility(position);
    fxScratch.c.copy(position);
    fxScratch.c.y += r * preset.columnRadius + Math.min(preset.columnHeight, 26) * 0.5;
    this.sunHigh = this.deps.sunVisibility(fxScratch.c);

    this.flash(position, r, preset, now);
    this.fireball(position, r, preset, now);
    this.ejecta(position, r, preset, now, groundY);
    this.groundWave(position, r, preset, now, groundY);
    this.column(position, r, preset, now);
    this.pall(position, r, preset, now, groundY);
    this.stamp(position, r, preset, groundY);

    const instance = this.acquire();
    instance.active = true;
    instance.position.copy(position);
    instance.age = 0;
    instance.radius = r;
    instance.preset = preset;
    instance.pulseIndex = 0;
    instance.flickerTimer = 0;
    instance.burnRemaining = preset.burnDuration;
    instance.pulses.length = 0;
    // A detonation is white for an instant, then orange, then a dying ember.
    instance.pulses.push({
      time: 0,
      color: 0xfff4dc,
      intensity: preset.lightIntensity,
      distance: r * 7,
      duration: 0.09,
    });
    instance.pulses.push({
      time: 0.07,
      color: 0xffa04c,
      intensity: preset.lightIntensity * 0.5,
      distance: r * 6,
      duration: 0.22,
    });
    instance.pulses.push({
      time: 0.26,
      color: 0xff6a24,
      intensity: preset.lightIntensity * 0.16,
      distance: r * 4.5,
      duration: 0.55,
    });

    if (preset.leavesFire && this.onFire) {
      this.groundPoint.copy(position);
      this.groundPoint.y = groundY + 0.1;
      // Well inside the blast. What burns after a detonation is fuel and broken
      // material at the seat of it, not the whole area that took damage, and a
      // fire authored at the damage radius is a lake of flame the width of the
      // street.
      this.onFire(this.groundPoint, Math.min(r * 0.28, 4.5), preset.burnDuration * 1.6);
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Stages
  // -------------------------------------------------------------------------

  /** t = 0: the part that makes the player flinch. */
  private flash(
    position: THREE.Vector3,
    r: number,
    preset: ExplosionPreset,
    now: number,
  ): void {
    const groups = this.deps.groups;
    // Fireball diameter: everything at t=0 is sized off the ball, not off the
    // damage radius.
    const fireD = Math.min(2 * r * preset.fireRadius, MAX_FIRE_SPRITE * 1.6);

    // The detonation flash proper: white, over almost before it began. It has to
    // be genuinely shorter than everything else in the sequence or the whole
    // explosion reads as one long orange event with no punch at the front.
    const core = resetDesc();
    core.px = position.x;
    core.py = position.y;
    core.pz = position.z;
    core.life = 0.05;
    core.size0 = fireD * 0.45;
    core.size1 = fireD * 1.0;
    core.r0 = 9;
    core.g0 = 8.2;
    core.b0 = 6.6;
    core.r1 = 2.6;
    core.g1 = 1.2;
    core.b1 = 0.38;
    core.alpha = 1;
    core.additive = 1;
    core.cell = GLOW.HOT_CORE;
    core.fadeIn = 0.03;
    core.priority = 255;
    groups.glow.spawn(now, core);

    const star = resetDesc();
    star.px = position.x;
    star.py = position.y;
    star.pz = position.z;
    // Shorter than the flash core, and much shorter than the fireball. Jetting
    // is a property of the instant the casing opens; still legible a fortieth of
    // a second later, once there is a ball of flame for it to be seen against,
    // it stops reading as gas escaping and starts reading as a firework.
    star.life = 0.05;
    star.size0 = fireD * 0.7;
    // Jetting is real — a casing lets gas out unevenly and it does spike — but a
    // symmetric radial star is precisely what a firework looks like, and past
    // about the width of the ball itself that is all the eye sees. On a heavy
    // charge it also has to be capped outright: proportional growth puts
    // forty-metre spokes across the frame.
    star.size1 = Math.min(fireD * 1.15, 15);
    star.r0 = 2.2;
    star.g0 = 1.5;
    star.b0 = 0.8;
    star.r1 = 1.0;
    star.g1 = 0.3;
    star.b1 = 0.07;
    star.alpha = 1;
    star.additive = 1;
    star.cell = GLOW.BURST_STAR;
    star.roll = rng.range(0, Math.PI * 2);
    star.fadeIn = 0.04;
    star.priority = 250;
    groups.glow.spawn(now, star);

    // Air shock: a thin refractive smear racing outward, gone before the
    // fireball has finished growing, which is what makes the two read as
    // separate events.
    //
    // Very faint on purpose. A shock front is a density discontinuity in clear
    // air: what you actually see is the background bending, a few percent of
    // contrast at most. Given any real brightness the sprite stops being a
    // pressure wave and becomes a white glass dome sitting over the blast, and
    // an additive sphere is a far worse artefact than no shock at all.
    const shock = resetDesc();
    shock.px = position.x;
    shock.py = position.y;
    shock.pz = position.z;
    shock.life = 0.2;
    shock.size0 = fireD * 0.6;
    shock.size1 = Math.min(r * 2.2, 26);
    shock.r0 = 0.55;
    shock.g0 = 0.62;
    shock.b0 = 0.75;
    shock.r1 = 0.07;
    shock.g1 = 0.08;
    shock.b1 = 0.11;
    shock.alpha = 0.26;
    shock.additive = 1;
    shock.cell = GLOW.SHOCK_RING;
    shock.roll = rng.range(0, Math.PI * 2);
    shock.fadeIn = 0.05;
    shock.priority = 240;
    groups.glow.spawn(now, shock);
  }

  /**
   * t = 0-120 ms. A cluster of flipbook flame sprites with staggered births,
   * expanding fast, rising as it becomes buoyant, cooling through the colour
   * curve from white to deep red.
   */
  private fireball(
    position: THREE.Vector3,
    r: number,
    preset: ExplosionPreset,
    now: number,
  ): void {
    const groups = this.deps.groups;
    const fireR = r * preset.fireRadius;
    const fireD = 2 * fireR;
    // Roughly two and a half lobes across the silhouette is what reads as
    // cauliflower rather than as a disc, so a bigger blast buys its size in more
    // lobes and not in bigger ones — a handful of enormous quads is a smear over
    // the lens. Lobes must also stay large relative to how far apart they are
    // seeded, or the cluster reads as separate burning objects instead of one
    // mass, which is the difference between an explosion and a bag of popcorn.
    const lobe = Math.min(fireD / 2.5, MAX_FIRE_SPRITE);
    const count = Math.max(5, Math.round(preset.fireballCount * this.density));
    // A large mass takes longer to consume its fuel and longer to cool, so the
    // duration scales with the ball rather than being one number for every
    // charge. This is the one place the sequence is deliberately slower than the
    // truth: a real 9 m blast is luminous for perhaps a fifth of a second, which
    // at any frame rate a player is running is a dozen frames — long enough to
    // register that something flashed, nowhere near long enough to read a
    // fireball cooling and rising, which is the whole point of having one.
    const burn = 0.2 + Math.min(fireR, 18) * 0.12;
    this.basis.set(UP);

    // The first quarter are the core mass: born at the centre, larger, and a
    // beat earlier. They establish a ball for the rest to billow off, which is
    // the difference between an explosion and a scatter of burning debris.
    const cores = Math.max(3, Math.round(count * 0.25));
    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      const core = i < cores;
      const delay = core ? i * 0.005 : rng.range(0.008, 0.085);
      this.basis.cone(2, this.dir);
      // Cube-rooted so the lobes are distributed through the volume rather than
      // shelled onto its surface: a uniform radius picks the outside of the ball
      // far more often than the inside, and a hollow cluster is one that reads
      // as separate burning objects with a gap in the middle.
      const offset =
        (core ? rng.range(0, 0.14) : 0.14 + Math.cbrt(rng.next()) * 0.4) * fireR;
      d.px = position.x + this.dir.x * offset;
      d.py = position.y + this.dir.y * offset * 0.7;
      d.pz = position.z + this.dir.z * offset;
      // Against this much drag a lobe settles at roughly speed/drag, so the
      // reach is expressed directly and the shape stops growing on its own.
      const reach = (core ? 0.2 : rng.range(0.35, 0.75)) * fireR;
      d.vx = this.dir.x * reach * 1.6;
      d.vy = this.dir.y * reach * 1.1 + fireR * rng.range(0.25, 0.7);
      d.vz = this.dir.z * reach * 1.6;
      d.life = burn * rng.range(0.75, 1.3) * (core ? 1.2 : 1);
      const target = Math.min(
        lobe * (core ? rng.range(1.5, 1.85) : rng.range(0.8, 1.3)),
        MAX_FIRE_SPRITE * 1.8,
      );
      d.size0 = target * 0.4;
      d.size1 = target;
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-0.9, 0.9);
      // Blackbody encoding: `r` is radiance, `g` is position on the cooling
      // ramp. Core lobes start white-hot and end deep red; the outer billows
      // are already cooler at birth and finish as soot, so the ball is hottest
      // in the middle and sootiest at the limb at every instant of its life.
      d.r0 = core ? 5.5 : 3.2;
      d.g0 = core ? 0.02 : rng.range(0.1, 0.26);
      d.r1 = core ? 0.6 : 0.42;
      d.g1 = core ? rng.range(0.58, 0.74) : rng.range(0.78, 0.94);
      d.alpha = 1;
      // Nearly all additive where it burns; the soot mask in the fragment shader
      // takes the coverage back on the parts that have already cooled.
      d.additive = 0.95;
      // Buoyant: fire wants to go up, not fall.
      d.gravity = -1.8;
      d.drag = 1.6;
      d.turbulence = 0.4;
      d.cell = 0;
      d.frames = 16;
      d.fadeIn = 0.05;
      d.softness = Math.min(fireR * 0.5, 2.5);
      d.priority = 230;
      groups.fireball.spawn(now + delay, d);
    }

    // Internal radiance so the fireball glows rather than only being textured.
    const glows = Math.max(2, Math.round(count * 0.4));
    for (let i = 0; i < glows; i++) {
      const d = resetDesc();
      this.basis.cone(2, this.dir);
      const offset = rng.range(0, 0.5) * fireR;
      d.px = position.x + this.dir.x * offset;
      d.py = position.y + this.dir.y * offset * 0.6 + fireR * 0.2;
      d.pz = position.z + this.dir.z * offset;
      d.vy = fireR * rng.range(0.5, 1.4);
      d.life = burn * rng.range(0.45, 0.85);
      d.size0 = Math.min(fireD * rng.range(0.4, 0.66), MAX_FIRE_SPRITE);
      d.size1 = Math.min(d.size0 * 1.7, MAX_FIRE_SPRITE * 1.4);
      d.r0 = 2.6;
      d.g0 = 1.05;
      d.b0 = 0.22;
      d.r1 = 0.34;
      d.g1 = 0.05;
      d.b1 = 0.012;
      d.alpha = 0.7;
      d.additive = 1;
      d.cell = GLOW.SOFT;
      d.gravity = -1.2;
      d.drag = 1.4;
      d.fadeIn = 0.1;
      d.priority = 220;
      groups.glow.spawn(now + rng.range(0, burn * 0.35), d);
    }
  }

  /** t = 20-250 ms: sparks, chunks and dirt thrown out of the crater. */
  private ejecta(
    position: THREE.Vector3,
    r: number,
    preset: ExplosionPreset,
    now: number,
    groundY: number,
  ): void {
    const groups = this.deps.groups;
    this.basis.set(UP);

    const sparks = Math.round(preset.sparkCount * this.density);
    for (let i = 0; i < sparks; i++) {
      const d = resetDesc();
      this.basis.cone(1.5, this.dir);
      const speed = rng.range(5, 24) * (0.6 + r * 0.12);
      d.px = position.x;
      d.py = position.y;
      d.pz = position.z;
      d.vx = this.dir.x * speed;
      d.vy = Math.abs(this.dir.y) * speed * 0.85 + rng.range(1, 5);
      d.vz = this.dir.z * speed;
      d.life = rng.range(0.35, 1.25);
      d.size0 = rng.range(0.02, 0.06);
      d.size1 = d.size0 * 0.4;
      d.r0 = 4;
      d.g0 = 3;
      d.b0 = 1.5;
      d.r1 = 0.9;
      d.g1 = 0.09;
      d.b1 = 0.02;
      d.alpha = 1;
      d.additive = 1;
      d.gravity = 11.5;
      d.drag = 0.8;
      d.stretch = 0.6;
      d.fadeIn = 0.02;
      d.floorY = groundY;
      d.bounce = 0.35;
      d.priority = 190;
      groups.spark.spawn(now + rng.range(0, 0.06), d);
    }

    const chunks = Math.round(preset.chunkCount * this.density);
    for (let i = 0; i < chunks; i++) {
      const d = resetDesc();
      this.basis.cone(1.4, this.dir);
      const speed = rng.range(4, 18) * (0.6 + r * 0.1);
      d.px = position.x;
      d.py = position.y;
      d.pz = position.z;
      d.vx = this.dir.x * speed;
      d.vy = Math.abs(this.dir.y) * speed * 0.9 + rng.range(2, 8);
      d.vz = this.dir.z * speed;
      // Long enough to complete the arc, land, skip and *stay* landed for a
      // while. A chunk that dissolves at the top of its trajectory is the tell
      // that gave the old ejecta cloud away, and one that dissolves the instant
      // it lands is barely better.
      d.life = rng.range(3.6, 6.5);
      // Sized off the charge, and weighted so most pieces are small and a few
      // are not. A fixed 4-16 cm was pitched for a hand grenade, which leaves a
      // nine-metre blast throwing gravel: once the chunks land, anything under
      // about a hand's width is sub-pixel at the range these are watched from,
      // and ejecta that cannot be seen where it lands is indistinguishable from
      // ejecta that evaporated on the way down.
      const bulk = Math.pow(rng.next(), 2.2);
      d.size0 = 0.045 + bulk * (0.1 + Math.min(r, 14) * 0.055);
      d.size1 = d.size0;
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-13, 13);
      d.r0 = 0.28;
      d.g0 = 0.25;
      d.b0 = 0.22;
      d.r1 = 0.2;
      d.g1 = 0.18;
      d.b1 = 0.16;
      d.alpha = 1;
      d.gravity = 11;
      d.drag = 0.35;
      d.cell = CHUNK_CELLS[(rng.next() * CHUNK_CELLS.length) | 0];
      d.fadeIn = 0.02;
      d.floorY = groundY;
      d.bounce = 0.26;
      d.sunVisibility = this.sunLow;
      d.priority = 160;
      groups.debris.spawn(now + rng.range(0, 0.05), d);
    }

    // Smouldering fragments. A handful of pieces come out still glowing and go
    // on glowing where they land, which is the only warm thing left in frame
    // once the fireball is gone and the smoke has taken over.
    const embers = Math.max(3, Math.round(preset.sparkCount * 0.14 * this.density));
    for (let i = 0; i < embers; i++) {
      const d = resetDesc();
      this.basis.cone(1.2, this.dir);
      const speed = rng.range(2, 9) * (0.6 + r * 0.06);
      d.px = position.x;
      d.py = position.y;
      d.pz = position.z;
      d.vx = this.dir.x * speed;
      d.vy = Math.abs(this.dir.y) * speed * 0.7 + rng.range(2, 7);
      d.vz = this.dir.z * speed;
      d.life = rng.range(1.6, 3.8);
      d.size0 = rng.range(0.03, 0.075);
      d.size1 = d.size0 * 0.75;
      d.r0 = 2.6;
      d.g0 = 0.9;
      d.b0 = 0.2;
      d.r1 = 0.32;
      d.g1 = 0.035;
      d.b1 = 0.008;
      d.alpha = 1;
      d.additive = 1;
      d.gravity = 10.5;
      d.drag = 0.5;
      // Short streaks, not bars: these are tumbling lumps, not tracer rounds.
      d.stretch = 0.12;
      d.fadeIn = 0.03;
      d.floorY = groundY;
      d.bounce = 0.28;
      d.priority = 165;
      groups.spark.spawn(now + rng.range(0, 0.1), d);
    }

    // Dirt fountain: heavier, slower, and it lifts a lot of dust with it.
    const dirt = Math.round(preset.dirtCount * this.density);
    for (let i = 0; i < dirt; i++) {
      const d = resetDesc();
      this.basis.cone(0.7, this.dir);
      const speed = rng.range(3, 11) * (0.6 + r * 0.08);
      d.px = position.x + rng.range(-0.3, 0.3) * r;
      d.py = groundY + 0.1;
      d.pz = position.z + rng.range(-0.3, 0.3) * r;
      d.vx = this.dir.x * speed * 0.5;
      d.vy = speed;
      d.vz = this.dir.z * speed * 0.5;
      d.life = rng.range(0.9, 2.2);
      d.size0 = Math.min(r * rng.range(0.1, 0.2), MAX_DUST_SPRITE * 0.4);
      d.size1 = Math.min(d.size0 * rng.range(2.2, 3.4), MAX_DUST_SPRITE);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-0.9, 0.9);
      d.r0 = 0.3;
      d.g0 = 0.25;
      d.b0 = 0.2;
      d.r1 = 0.17;
      d.g1 = 0.145;
      d.b1 = 0.12;
      d.alpha = rng.range(0.44, 0.68);
      d.gravity = 3.6;
      d.drag = 1.1;
      d.turbulence = 0.5;
      d.cell = (rng.next() * 4) | 0;
      d.fadeIn = 0.1;
      d.softness = Math.min(r * 0.4, 2.5);
      // Thrown up out of the crater, so it climbs into whatever light is above.
      d.sunVisibility = this.mixSun(0.4);
      d.priority = 150;
      groups.dust.spawn(now + rng.range(0, 0.12), d);
    }
  }

  /**
   * t = 20-300 ms. The ground wave is what communicates scale: a low collar of
   * dust racing outward along the surface, plus flat rings on the ground itself.
   */
  private groundWave(
    position: THREE.Vector3,
    r: number,
    preset: ExplosionPreset,
    now: number,
    groundY: number,
  ): void {
    const groups = this.deps.groups;
    const reach = r * preset.waveReach;
    const count = Math.round(preset.waveCount * this.density);

    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      const angle = (i / Math.max(count, 1)) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const cx = Math.cos(angle);
      const cz = Math.sin(angle);
      const start = r * rng.range(0.15, 0.45);
      d.px = position.x + cx * start;
      d.py = groundY + r * rng.range(0.03, 0.12);
      d.pz = position.z + cz * start;
      // Enough speed and drag that it decelerates into the reach distance.
      const speed = rng.range(0.55, 1.0) * reach * 1.6;
      d.vx = cx * speed;
      d.vy = rng.range(0.3, 1.4);
      d.vz = cz * speed;
      d.life = rng.range(1.3, 2.6);
      d.size0 = Math.min(r * rng.range(0.14, 0.24), MAX_DUST_SPRITE * 0.35);
      d.size1 = Math.min(d.size0 * rng.range(2.4, 3.6), MAX_DUST_SPRITE);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-0.6, 0.6);
      d.r0 = 0.34;
      d.g0 = 0.3;
      d.b0 = 0.24;
      d.r1 = 0.17;
      d.g1 = 0.155;
      d.b1 = 0.13;
      d.alpha = rng.range(0.36, 0.58);
      d.gravity = 0.5;
      d.drag = 2.4;
      d.turbulence = 0.45;
      d.cell = (rng.next() * 4) | 0;
      d.fadeIn = 0.12;
      d.softness = Math.min(r * 0.45, 2.5);
      d.sunVisibility = this.sunLow;
      d.priority = 140;
      groups.dust.spawn(now + rng.range(0, 0.09), d);
    }

    // Two flat ground rings: the pressure front, and the dust it kicked up
    // settling behind it. Their reach is capped well inside the dust wave's —
    // a ring wider than the blast is obviously a texture on the floor.
    const ringReach = Math.min(reach, r * 1.8);
    for (let i = 0; i < 2; i++) {
      const d = resetDesc();
      d.px = position.x;
      d.py = groundY + 0.05 + i * 0.03;
      d.pz = position.z;
      d.life = (0.42 + i * 0.5) * (1 + preset.fireRadius * 0.6);
      d.size0 = r * 0.35;
      d.size1 = ringReach * (0.85 + i * 0.35);
      // Both are kept faint. A ring is a circle, and a circle is the one shape
      // the eye instantly recognises as a texture laid on the floor rather than
      // as anything happening in the air above it; it can suggest the front
      // passing, but the moment it is legible as an outline it has given the
      // whole effect away.
      if (i === 0) {
        d.r0 = 0.85;
        d.g0 = 0.9;
        d.b0 = 1.0;
        d.r1 = 0.14;
        d.g1 = 0.15;
        d.b1 = 0.18;
        d.alpha = 0.34;
        d.additive = 1;
        d.cell = GLOW.SHOCK_RING;
      } else {
        d.r0 = 0.42;
        d.g0 = 0.38;
        d.b0 = 0.31;
        d.r1 = 0.2;
        d.g1 = 0.18;
        d.b1 = 0.15;
        d.alpha = 0.3;
        d.additive = 0.1;
        d.cell = GLOW.SMOKE_RING;
      }
      d.roll = rng.range(0, Math.PI * 2);
      d.fadeIn = 0.08;
      d.softness = 0.5;
      d.priority = 180;
      groups.ring.spawn(now + i * 0.07, d);
    }
  }

  /**
   * t = 130 ms onward. Particles keep spawning at the base over the emission
   * window and rise, so the column builds upward over seconds instead of
   * appearing all at once. Wind shear pushes the top further than the base.
   */
  private column(
    position: THREE.Vector3,
    r: number,
    preset: ExplosionPreset,
    now: number,
  ): void {
    const groups = this.deps.groups;
    const count = Math.round(preset.smokeCount * this.density);
    const window = preset.columnSpawnWindow;
    const wind = this.deps.wind;
    // The column is a stack of medium puffs the width of the plume, not a few
    // sprites the width of the blast.
    const colR = r * preset.columnRadius;

    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      const phase = i / Math.max(count, 1);
      // Front-loaded, so the smoke is already dense as the fireball is cooling
      // into it rather than arriving a second after it has gone, while the tail
      // of the distribution keeps feeding the base for the whole climb.
      const delay = 0.06 + Math.pow(phase, 1.5) * window + rng.range(0, window * 0.08);
      const spread = colR * rng.range(0, 0.8) * (1 + phase * 0.7);
      const angle = rng.range(0, Math.PI * 2);
      d.px = position.x + Math.cos(angle) * spread;
      d.py = position.y + colR * 0.3;
      d.pz = position.z + Math.sin(angle) * spread;

      // Rise slows as the plume cools; later particles inherit less lift.
      const rise = preset.columnSpeed * rng.range(0.65, 1.2) * (1 - phase * 0.45);
      d.vx = wind.x * rng.range(0.4, 1.5) + Math.cos(angle) * colR * 0.35;
      d.vy = rise;
      d.vz = wind.z * rng.range(0.4, 1.5) + Math.sin(angle) * colR * 0.35;

      d.life = preset.columnLife * rng.range(0.6, 1.25);
      // The first puffs are the fireball's own cooled mass, so they are as wide
      // as the ball was; the ones feeding the stem behind them are the width of
      // the plume.
      d.size0 = Math.min(
        colR * rng.range(0.7, 1.1) * (1.4 - phase * 0.5),
        MAX_SMOKE_SPRITE * 0.55,
      );
      // A plume entrains air the whole way up and ends up several times wider
      // than it started; growing while thinning is what keeps a long-lived
      // column from looking like a stack of identical grey balls.
      d.size1 = Math.min(d.size0 * rng.range(2.6, 4.0), MAX_SMOKE_SPRITE * 1.5);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-0.35, 0.35);
      // Oily black smoke that greys out as it thins and mixes with air. These
      // are the *sunlit* values: the lit shader only ever scales a particle
      // down, so authoring the shadowed colour here leaves nothing to light.
      const soot = rng.range(0.2, 0.32) * (1 - phase * 0.25);
      d.r0 = soot * 1.06;
      d.g0 = soot;
      d.b0 = soot * 0.95;
      d.r1 = 0.4;
      d.g1 = 0.39;
      d.b1 = 0.37;
      // Deliberately translucent: density comes from puffs overlapping, and a
      // sprite opaque on its own puts a hard silhouette on the skyline. The
      // longer a puff lives the thinner it has to be, or a column that should
      // still be visible half a minute later is an opaque wall for all of it.
      d.alpha = preset.smokeAlpha * rng.range(0.62, 1.0);
      // Buoyant early, neutral later.
      d.gravity = -0.5 * (1 - phase * 0.7);
      d.drag = 0.42;
      d.turbulence = 0.75;
      d.cell = 0;
      d.frames = 16;
      // Short: a puff of detonation smoke does not ease itself into existence,
      // it is already there the instant the gas has cooled enough to be opaque.
      // A long fade-in is what leaves a gap between the fireball going out and
      // the column arriving, and the eye reads that gap as the explosion ending.
      d.fadeIn = 0.05;
      d.softness = Math.min(colR * 0.9, 3);
      // The higher a puff is born the more sky it sees, and the crown of a
      // column standing out of a shadowed street is genuinely sunlit while its
      // base is not.
      d.sunVisibility = this.mixSun(0.25 + phase * 0.85);
      d.priority = 200;
      groups.smoke.spawn(now + delay, d);
    }
  }

  /**
   * The dust pall: a low, wide, slowly spreading sheet around the crater.
   *
   * Everything else in the sequence is over in a few seconds, but a real
   * detonation leaves the air over the site loaded with fines that drift for a
   * long time — and from any distance that pall, not the column, is what says
   * something was hit here. It is authored very thin: its density comes from
   * dozens of overlapping sprites, none of which reads as a sprite on its own.
   */
  private pall(
    position: THREE.Vector3,
    r: number,
    preset: ExplosionPreset,
    now: number,
    groundY: number,
  ): void {
    const groups = this.deps.groups;
    const count = Math.round(preset.pallCount * this.density);
    const wind = this.deps.wind;
    const reach = r * 1.1;

    for (let i = 0; i < count; i++) {
      const d = resetDesc();
      const angle = (i / Math.max(count, 1)) * Math.PI * 2 + rng.range(-0.4, 0.4);
      const start = reach * Math.sqrt(rng.next());
      d.px = position.x + Math.cos(angle) * start;
      d.py = groundY + r * rng.range(0.08, 0.5);
      d.pz = position.z + Math.sin(angle) * start;
      d.vx = Math.cos(angle) * rng.range(0.2, 0.9) + wind.x * rng.range(0.5, 1.4);
      d.vy = rng.range(0.15, 0.75);
      d.vz = Math.sin(angle) * rng.range(0.2, 0.9) + wind.z * rng.range(0.5, 1.4);
      d.life = preset.columnLife * rng.range(0.5, 0.95);
      d.size0 = Math.min(r * rng.range(0.3, 0.5), MAX_SMOKE_SPRITE * 0.5);
      d.size1 = Math.min(d.size0 * rng.range(1.8, 2.8), MAX_SMOKE_SPRITE * 1.4);
      d.roll = rng.range(0, Math.PI * 2);
      d.rollRate = rng.range(-0.12, 0.12);
      // Pulverised masonry, not soot: much paler than the column above it, and
      // the contrast between the two is a large part of the read.
      const grey = rng.range(0.3, 0.42);
      d.r0 = grey * 1.08;
      d.g0 = grey;
      d.b0 = grey * 0.88;
      d.r1 = grey * 0.82;
      d.g1 = grey * 0.78;
      d.b1 = grey * 0.7;
      d.alpha = rng.range(0.16, 0.3);
      d.gravity = 0.08;
      d.drag = 0.5;
      d.turbulence = 0.5;
      d.cell = 0;
      d.frames = 16;
      d.fadeIn = 0.07;
      d.softness = Math.min(r * 0.6, 3);
      d.sunVisibility = this.mixSun(0.15);
      d.priority = 175;
      groups.smoke.spawn(now + 0.12 + rng.range(0, 0.4), d);
    }
  }

  /** Blend the two sun probes by height above the blast, 0 base to 1 crown. */
  private mixSun(height: number): number {
    const h = height < 0 ? 0 : height > 1 ? 1 : height;
    return this.sunLow + (this.sunHigh - this.sunLow) * h;
  }

  /** Scorch, crater and the pulverised apron around it. */
  private stamp(
    position: THREE.Vector3,
    r: number,
    preset: ExplosionPreset,
    groundY: number,
  ): void {
    const decals = this.deps.decals;
    if (position.y - groundY > r * 1.6) return;

    this.groundPoint.set(position.x, groundY, position.z);
    const size = r * preset.scorchScale;
    decals.place({
      point: this.groundPoint,
      normal: this.groundNormal,
      size,
      kind: 'crater',
      surface: 'concrete',
      opacity: 0.95,
      conform: true,
    });
    // A wider, fainter scorch halo so the crater does not end in a hard circle.
    decals.place({
      point: this.groundPoint,
      normal: this.groundNormal,
      size: size * 1.9,
      kind: 'scorch',
      surface: 'concrete',
      opacity: 0.4,
      conform: true,
    });
  }

  private findGround(position: THREE.Vector3, r: number): number {
    if (this.deps.floorOverride !== null) return this.deps.floorOverride;
    const world = this.deps.world;
    if (world) {
      const y = world.sampleGround(position.x, position.z);
      if (y !== null && position.y - y < r * 4) return y;
    }
    const physics = this.deps.physics;
    if (physics && physics.ready) {
      this.rayOptions.maxDistance = r * 2.5 + 2;
      const hit = physics.raycast(position, this.down, this.rayOptions);
      if (hit) return hit.point.y;
    }
    return position.y - 0.15;
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number): void {
    const instances = this.instances;
    for (let i = 0; i < instances.length; i++) {
      const e = instances[i];
      if (!e.active) continue;
      e.age += dt;

      while (e.pulseIndex < e.pulses.length && e.pulses[e.pulseIndex].time <= e.age) {
        const p = e.pulses[e.pulseIndex++];
        this.deps.requestLight(e.position, p.color, p.intensity, p.distance, p.duration);
      }

      // Lingering burn: an irregular flicker rather than a steady glow.
      if (e.burnRemaining > 0) {
        e.burnRemaining -= dt;
        e.flickerTimer -= dt;
        if (e.flickerTimer <= 0) {
          e.flickerTimer = rng.range(0.09, 0.2);
          const fade = Math.max(0, e.burnRemaining / Math.max(e.preset.burnDuration, 0.01));
          this.deps.requestLight(
            e.position,
            0xff5a18,
            e.preset.lightIntensity * 0.05 * fade * rng.range(0.6, 1.4),
            e.radius * 3,
            0.24,
          );
        }
      }

      if (e.age > 1.2 && e.burnRemaining <= 0) e.active = false;
    }
  }

  clear(): void {
    for (const e of this.instances) e.active = false;
    for (let i = 0; i < DEDUPE_SLOTS; i++) this.dedupeTime[i] = -1000;
  }

  private acquire(): ExplosionInstance {
    for (const e of this.instances) if (!e.active) return e;
    if (this.instances.length < 16) {
      const e = new ExplosionInstance();
      this.instances.push(e);
      return e;
    }
    // Saturated: steal the oldest.
    let oldest = this.instances[0];
    for (const e of this.instances) if (e.age > oldest.age) oldest = e;
    return oldest;
  }
}

const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);

/** Outlines the ejecta draws from, so a chunk cloud is not one shape repeated. */
const CHUNK_CELLS = [CHIP.CHIP, CHIP.CHIP_B, CHIP.CHIP_C] as const;
