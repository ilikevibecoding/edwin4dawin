import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { ExplosionEvent } from '../core/Events';
import { DecalTile } from './DecalAtlas';
import { decalOpts } from './DecalSystem';
import { Debris } from './DebrisPool';
import type { FXHost } from './FXContext';
import { Batch, sunBurial } from './ParticleEngine';
import { Sprite } from './ParticleTextures';
import type { ShockwavePool } from './Shockwave';

/**
 * Explosions.
 *
 * A detonation is not one effect, it is six on different clocks, and the reason
 * most game explosions read as a sprite is that they run on one:
 *
 *   0 – 30 ms    detonation flash. White, over before the eye resolves it, but
 *                it sets the exposure and throws the only truly hard shadows
 *                the scene will ever see.
 *   30 – 400 ms  fireball. Fuel-air combustion expanding into cold air, cooling
 *                from about 3300 K to 1200 K. Because emitted power goes as the
 *                fourth power of temperature, this is a collapse in brightness
 *                of two orders of magnitude, and it is what makes a real
 *                fireball look like it is *dying* rather than fading out.
 *   0 – 250 ms   shock front. Supersonic, decelerating, invisible except for
 *                what it does to the background behind it.
 *   0 – 2 s      the ground ring. Overpressure sweeping outward along the floor
 *                lifting everything loose. This is the shot that carries scale:
 *                a fireball looks the same size at any radius, a dust ring
 *                cannot lie about how far it reached.
 *   0.2 – 20 s   the column. Soot-laden buoyant plume, lit by the sun, shearing
 *                in the wind and turning over as it rises.
 *   0 – 30 s     what is left: debris, scorch, a crater, and dust shaken off
 *                every surface within the blast.
 *
 * The whole sequence is authored in one call. Every stage is spawned with a
 * start delay rather than emitted over time by a CPU tick, which is possible
 * only because the simulation is a closed-form function of age — so a plume
 * that will still be drifting twenty seconds from now costs exactly one write
 * of its spawn record, and the state at any future instant is addressable
 * without having stepped through the frames in between.
 */

/**
 * Every length below is expressed against the gameplay radius rather than in
 * metres, because the gameplay radius is the only number the caller supplies
 * and it is a damage radius, not a visual one. A fragmentation grenade wounds
 * out to six metres and its fireball is barely over a metre across; treating
 * the two as the same number is the single easiest way to end up with an
 * explosion that fills the screen with white.
 */
interface Profile {
  /** Fireball radius, as a fraction of the blast radius. */
  fireRadius: number;
  /**
   * Multiplier on blackbody radiance. The product is in the engine's kilonits
   * against a sunlit wall at about thirty, so a peak in the low hundreds is a
   * fireball that blooms and still keeps its hue; a peak in the thousands is a
   * white circle whatever the temperature curve says.
   */
  fireBrightness: number;
  /** Particle budget for the fireball. */
  fire: number;
  /** Sootiness: how quickly the fire turns to black smoke. */
  soot: number;
  /** Particle budget for the plume. */
  column: number;
  /** Metres the plume climbs, in fireball radii. */
  columnRise: number;
  /** How far the ground dust runs, in blast radii. */
  ringReach: number;
  /** Particle budget for the ground ring. */
  ringDensity: number;
  debris: number;
  sparks: number;
  /** Kelvin at detonation. */
  peakTemp: number;
  light: number;
  shake: number;
  sound: string;
}

const PROFILES: Record<string, Profile> = {
  // Composition B in a steel body: almost no fuel, so a fireball barely wider
  // than the casing, over in a quarter of a second, and a great deal of
  // fragmentation and pulverised ground.
  grenade: {
    fireRadius: 0.3,
    fireBrightness: 42,
    fire: 0.8,
    soot: 0.75,
    column: 1.15,
    columnRise: 5,
    ringReach: 0.95,
    ringDensity: 1,
    debris: 0.8,
    sparks: 1.4,
    peakTemp: 3400,
    light: 1,
    shake: 1,
    sound: 'explosion_grenade',
  },
  // A 500 lb bomb: everything larger and slower, and the column is the shot.
  airstrike: {
    fireRadius: 0.5,
    fireBrightness: 52,
    fire: 2.2,
    soot: 1.3,
    column: 2.6,
    columnRise: 9,
    ringReach: 1.9,
    ringDensity: 2.6,
    debris: 2.2,
    sparks: 1,
    peakTemp: 3200,
    light: 3.4,
    shake: 2.6,
    sound: 'explosion_bomb',
  },
  // Liquid fuel: a slow, greasy, rolling fireball and a lot of black smoke.
  barrel: {
    fireRadius: 0.5,
    fireBrightness: 34,
    fire: 1.9,
    soot: 1.9,
    column: 1.6,
    columnRise: 7,
    ringReach: 0.45,
    ringDensity: 0.5,
    debris: 0.7,
    sparks: 0.5,
    peakTemp: 2500,
    light: 1.5,
    shake: 0.8,
    sound: 'explosion_barrel',
  },
  rocket: {
    fireRadius: 0.36,
    fireBrightness: 44,
    fire: 1,
    soot: 0.95,
    column: 0.85,
    columnRise: 5.5,
    ringReach: 1,
    ringDensity: 1.1,
    debris: 0.9,
    sparks: 1.1,
    peakTemp: 3300,
    light: 1.2,
    shake: 1.15,
    sound: 'explosion_rocket',
  },
  vehicle: {
    fireRadius: 0.45,
    fireBrightness: 36,
    fire: 2.2,
    soot: 2.1,
    column: 2,
    columnRise: 7,
    ringReach: 0.9,
    ringDensity: 1,
    debris: 1.8,
    sparks: 0.9,
    peakTemp: 2700,
    light: 2,
    shake: 1.5,
    sound: 'explosion_vehicle',
  },
};

const PROBE_MASK = Groups.WORLD | Groups.PROP;

/**
 * Optical depth of one radius of the two kinds of cloud a blast makes.
 *
 * The plume is dense enough that its shadow side goes most of the way to sky
 * colour; the ground ring is a thin annulus of lifted fines and only wants
 * enough shading to give it a near and a far edge.
 */
const PLUME_OPACITY = 1.35;
const RING_OPACITY = 0.5;

const _center = new THREE.Vector3();
const _normal = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Eight compass bearings plus straight up, reused for the surface probes. */
const PROBE_DIRS: Array<[number, number, number]> = [
  [1, 0.12, 0],
  [0.7, 0.12, 0.7],
  [0, 0.12, 1],
  [-0.7, 0.12, 0.7],
  [-1, 0.12, 0],
  [-0.7, 0.12, -0.7],
  [0, 0.12, -1],
  [0.7, 0.12, -0.7],
  [0, 1, 0],
];

/** The derived geometry of one detonation, in metres. Rebuilt per blast. */
interface Blast {
  profile: Profile;
  /** Damage radius: what the caller asked for, and what gameplay uses. */
  R: number;
  /** Fireball radius. Much smaller than `R` for anything cased. */
  F: number;
  /** How far the ground dust runs. */
  reach: number;
  /** How high the plume climbs. */
  rise: number;
  ground: number;
  /** 0 in mid-air, 1 sitting on the deck. Gates the ring and the crater. */
  coupling: number;
}

const _blast: Blast = {
  profile: PROFILES.grenade,
  R: 6,
  F: 1.2,
  reach: 6,
  rise: 6,
  ground: 0,
  coupling: 1,
};

export function playExplosion(host: FXHost, evt: ExplosionEvent, shockwaves: ShockwavePool): void {
  const profile = PROFILES[evt.source ?? 'grenade'] ?? PROFILES.grenade;
  const rng = host.rng;

  _center.copy(evt.position);
  _normal.copy(evt.normal ?? _up);
  if (_normal.lengthSq() < 1e-6) _normal.set(0, 1, 0);
  else _normal.normalize();

  const gameplayRadius = Math.max(0.8, evt.radius);
  const R = gameplayRadius * (evt.scale ?? 1);
  const ground = host.groundY(_center.x, _center.z, _center.y + R * 0.6, _center.y - R);
  const height = Math.max(0, _center.y - ground);

  const b = _blast;
  b.profile = profile;
  b.R = R;
  b.F = R * profile.fireRadius;
  b.reach = R * profile.ringReach;
  b.rise = b.F * profile.columnRise;
  b.ground = ground;
  // A blast that goes off on the deck couples into the ground and throws a
  // ring; one that goes off in mid-air mostly does not.
  b.coupling = Math.max(0, 1 - height / Math.max(0.6, b.F * 2));

  // The fireball is written first so the flash draws over it: the fire batch
  // covers what is behind it now, and instances composite in spawn order.
  fireball(host, b);
  detonationFlash(host, b);
  sparks(host, b);
  if (b.coupling > 0.05) groundRing(host, b);
  column(host, b);
  chunks(host, b);
  solidDebris(host, b);
  surfaceProbes(host, b);
  marks(host, b);

  // The front outruns the fireball by a wide margin and is gone before the
  // smoke has formed, which is exactly why it reads as a shock and not a ring
  // of dust: same event, an order of magnitude apart in speed.
  shockwaves.spawn(
    _center.x,
    _center.y,
    _center.z,
    b.F * 6,
    0.13 + 0.05 * Math.sqrt(b.F * 6),
    Math.min(1.4, 0.5 + b.F * 0.22),
  );

  // Two staged lights: the detonation itself is white and lasts three frames,
  // the fireball behind it is orange and lingers. Output rises with the size of
  // the emitter rather than with the damage radius — an exponent short of the
  // square because a large fireball is also opaque, so its middle never reaches
  // the camera — and both are capped, since past a point a brighter flash only
  // moves the auto-exposure and makes the rest of the frame darker.
  const glow = Math.pow(b.F, 1.6);
  host.light(_center, 0xfff2d8, Math.min(6000, 620 * profile.light * glow), b.F * 24, 0.12);
  host.light(
    _center,
    0xff8a2e,
    Math.min(1800, 140 * profile.light * glow),
    b.F * 18,
    0.28 + 0.06 * profile.columnRise,
  );

  const distance = host.distanceTo(_center.x, _center.y, _center.z);
  host.shake(
    Math.min(0.95, 0.09 * R * profile.shake),
    0.55 + 0.16 * Math.sqrt(R) * profile.shake,
    24 - Math.min(10, R * 0.5),
    _center,
    R * 7,
  );
  // Concussion: a brief pressure shimmer and a pull toward the centre of frame.
  const proximity = Math.max(0, 1 - distance / (R * 3 + 4));
  host.addConcussion(0.85 * proximity, 0.55 * proximity * proximity);

  host.ai?.damageRadius?.(_center, gameplayRadius, evt.damage, evt.source ?? 'explosion');
  // The physics system applies the radial impulse itself on this same event;
  // adding a second one here would double every launch velocity in the blast.

  host.sound(profile.sound, _center, 1, rng.range(0.92, 1.06));
  if (R > 6) host.sound('explosion_debris', _center, 0.7, rng.range(0.9, 1.1));
}

/* ------------------------------ stage 1: flash ----------------------------- */

/**
 * Three overlapping lobes on three clocks, which is what a detonation is.
 *
 * The star is over in single-digit milliseconds and no frame will ever contain
 * it; what a camera at 50 ms sees is shock-heated air, still above the
 * temperature of the burn behind it and expanding much faster than the fuel.
 * Sizes are authored against the fireball rather than the damage radius, and
 * the widest lobe deliberately overruns the ball — the flash front is ahead of
 * the combustion, not inside it.
 */
function detonationFlash(host: FXHost, b: Blast): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const profile = b.profile;
  const F = b.F;

  for (let i = 0; i < 3; i++) {
    d.reset();
    d.px = _center.x;
    d.py = _center.y;
    d.pz = _center.z;
    d.seed = rng.next() * 64;
    // Peak temperature is deliberately above the fireball's: this is the
    // detonation front, not the burn behind it, and it is nearly white.
    d.r0 = profile.peakTemp + (i === 0 ? 1600 : 900);
    d.g0 = profile.peakTemp - (i === 2 ? 700 : 200);
    d.b0 = profile.fireBrightness * (i === 0 ? 3.4 : i === 1 ? 1.5 : 0.85);
    d.a0 = 1;
    // Shock-heated air, not fuel: no soot to speak of.
    d.r1 = 0.05;
    d.g1 = 0.85;
    d.b1 = 0.6;
    d.a1 = i === 0 ? 0.5 : 0.75;
    d.sizes(
      F * (i === 0 ? 0.55 : i === 1 ? 0.9 : 1.3),
      F * (i === 0 ? 2.1 : i === 1 ? 2.4 : 3.4),
      0.38,
    );
    d.life = i === 0 ? 0.085 : i === 1 ? 0.15 : 0.11;
    d.drag = 8;
    d.gravity = 0;
    d.sprite = i === 1 ? Sprite.FIRE : Sprite.FLASH;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-2, 2);
    p.spawn(Batch.FIRE);
  }
}

/* ---------------------------- stage 2: fireball ---------------------------- */

function fireball(host: FXHost, b: Blast): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const profile = b.profile;
  const F = b.F;
  // Expansion velocity scales with the ball: a big one takes longer to reach
  // its final size, which is most of why an airstrike reads as slow.
  const v = Math.sqrt(F) * 3.2;

  // Core: small, very hot, short-lived. Shell: larger, cooler, sootier, and
  // launched outward so the ball visibly inflates rather than cross-fading.
  const core = p.count(Math.round(44 * profile.fire));
  for (let i = 0; i < core; i++) {
    randomDirection(rng);
    const speed = rng.range(0.25, 1.1) * v;
    d.reset();
    d.px = _center.x + _dir.x * F * 0.2;
    d.py = _center.y + _dir.y * F * 0.2;
    d.pz = _center.z + _dir.z * F * 0.2;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, _dir.y * speed * 0.75 + speed * 0.35, _dir.z * speed);
    d.r0 = profile.peakTemp * rng.range(0.94, 1.06);
    d.g0 = 1500 * rng.range(0.9, 1.1);
    d.b0 = profile.fireBrightness * rng.range(0.75, 1.15);
    d.a0 = 1;
    d.r1 = 0.45 * profile.soot;
    d.g1 = 0.13;
    d.b1 = 0.12;
    d.a1 = 0.85;
    d.sizes(F * rng.range(0.26, 0.48), F * rng.range(0.7, 1.15), 0.55);
    d.life = rng.range(0.16, 0.34) * (1 + profile.soot * 0.3);
    d.drag = rng.range(3.5, 6);
    d.gravity = -0.5;
    d.sprite = Sprite.FIRE;
    d.turbulence = F * 0.22;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-3, 3);
    d.delay = rng.range(0, 0.035);
    p.spawn(Batch.FIRE);
  }

  const shell = p.count(Math.round(38 * profile.fire));
  for (let i = 0; i < shell; i++) {
    randomDirection(rng);
    // Flattened against the ground when the blast is sitting on it.
    const lift = Math.max(0.15, _dir.y);
    const speed = rng.range(0.7, 1.7) * v;
    d.reset();
    d.px = _center.x + _dir.x * F * 0.35;
    d.py = Math.max(b.ground + F * 0.12, _center.y + _dir.y * F * 0.3);
    d.pz = _center.z + _dir.z * F * 0.35;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, lift * speed * 0.85, _dir.z * speed);
    d.r0 = profile.peakTemp * rng.range(0.78, 0.92);
    d.g0 = rng.range(1050, 1350);
    d.b0 = profile.fireBrightness * rng.range(0.35, 0.6);
    d.a0 = 1;
    d.r1 = Math.min(1, 0.9 * profile.soot);
    d.g1 = 0.085;
    d.b1 = 0.08;
    d.a1 = 0.95;
    d.sizes(F * rng.range(0.32, 0.6), F * rng.range(0.9, 1.5), 0.5);
    d.life = rng.range(0.3, 0.7) * (1 + profile.soot * 0.35);
    d.drag = rng.range(2.2, 4);
    d.gravity = -0.35;
    d.sprite = Sprite.FIRE;
    d.turbulence = F * 0.3;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-2.4, 2.4);
    d.delay = rng.range(0.01, 0.08);
    p.spawn(Batch.FIRE);
  }

  // The soot the fireball leaves behind, handed to the lit smoke batch so it
  // picks up the sun instead of staying a black hole in the frame.
  // The burn-out. Fuel that is still combusting but has dropped below about
  // 1800 K emits almost nothing — the fourth power sees to that — while the
  // soot it is now full of absorbs everything behind it. Under premultiplied
  // blending that makes these particles a genuinely black, faintly glowing
  // medium, and they are the reason the ball turns *into* smoke rather than
  // cross-fading into a separate grey effect that happens to be nearby.
  const burnout = p.count(Math.round(26 * profile.fire * (0.6 + profile.soot * 0.5)));
  for (let i = 0; i < burnout; i++) {
    randomDirection(rng);
    const speed = rng.range(0.4, 1.3) * v;
    d.reset();
    d.px = _center.x + _dir.x * F * 0.4;
    d.py = Math.max(b.ground + F * 0.15, _center.y + _dir.y * F * 0.35);
    d.pz = _center.z + _dir.z * F * 0.4;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, Math.abs(_dir.y) * speed * 0.6 + 1.4, _dir.z * speed);
    d.r0 = rng.range(1700, 2050);
    d.g0 = rng.range(650, 850);
    d.b0 = profile.fireBrightness * rng.range(0.08, 0.18);
    d.a0 = 1;
    // Nothing but soot: the absorption term takes over from the emission
    // within a couple of tenths and the particle finishes the frame black.
    d.r1 = 1;
    d.g1 = 0.05;
    d.b1 = 0.05;
    d.a1 = 0.9;
    d.sizes(F * rng.range(0.4, 0.7), F * rng.range(1.2, 2.1), 0.5);
    d.life = rng.range(0.55, 1.15) * (0.8 + profile.soot * 0.3);
    d.drag = rng.range(1.6, 2.8);
    d.gravity = -0.3;
    d.sprite = Sprite.FIRE;
    d.turbulence = F * 0.34;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1.8, 1.8);
    d.delay = rng.range(0.06, 0.26);
    p.spawn(Batch.FIRE);
  }

  // The soot the fireball leaves behind, handed to the lit smoke batch so it
  // picks up the sun instead of staying a black hole in the frame. This is the
  // stage that has to be dense: it is what the eye reads for the half second
  // between the fire dying and the column establishing, and a handful of
  // sprites there is the difference between a blast and a firework.
  const ash = p.count(Math.round(48 * profile.soot + 40));
  for (let i = 0; i < ash; i++) {
    randomDirection(rng);
    const speed = rng.range(0.3, 1.2) * v;
    // Half of it flung out on the fireball's own shell, half already rolling
    // up the middle, so the cloud has a rim and an interior rather than being
    // one uniform shell of billboards.
    const shellward = i % 2 === 0 ? 1 : 0.35;
    d.reset();
    d.px = _center.x + _dir.x * F * 0.45 * shellward;
    d.py = Math.max(b.ground + F * 0.2, _center.y + _dir.y * F * 0.4 * shellward);
    d.pz = _center.z + _dir.z * F * 0.45 * shellward;
    d.seed = rng.next() * 64;
    d.velocity(
      _dir.x * speed * shellward,
      Math.abs(_dir.y) * speed * 0.7 + 1.2 + (1 - shellward) * 2.2,
      _dir.z * speed * shellward,
    );
    const tone = rng.range(0.055, 0.13) / Math.max(0.6, profile.soot);
    // Alpha stays up through the middle of life and is retired by the batch's
    // own fade-out; ramping it to zero as well makes the cloud transparent
    // from the moment it forms.
    d.colors(
      tone,
      tone * 0.94,
      tone * 0.9,
      rng.range(0.72, 0.95),
      tone * 1.6,
      tone * 1.55,
      tone * 1.5,
      rng.range(0.3, 0.5),
    );
    d.sizes(F * rng.range(0.42, 0.72), F * rng.range(1.6, 3), 0.45);
    d.life = rng.range(2.8, 5.6) * (0.7 + profile.soot * 0.4);
    d.drag = rng.range(1.1, 2);
    d.gravity = -0.05;
    const off = F * 0.45 * shellward;
    d.burial = sunBurial(host.sunDir, _dir.x * off, _dir.y * off, _dir.z * off, F * 0.7) *
      PLUME_OPACITY;
    d.sprite = rng.next() < 0.5 ? Sprite.SMOKE : Sprite.SMOKE_WISP;
    d.turbulence = F * 0.24;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-0.7, 0.7);
    d.delay = rng.range(0.04, 0.3);
    p.spawn(Batch.SMOKE);
  }
}

/* ----------------------------- stage 3: sparks ----------------------------- */

function sparks(host: FXHost, b: Blast): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  const count = p.count(Math.round((30 + b.R * 6) * b.profile.sparks));
  for (let i = 0; i < count; i++) {
    randomDirection(rng);
    // Drag is what keeps a spark shower a shower. Linear drag carries a
    // particle v/k in total, so these are authored to die out within a couple
    // of fireball radii; without it the fast tail of the distribution is still
    // travelling at forty metres a second a second later and the frame ends up
    // speckled with white dots against the sky that read as sensor noise.
    const drag = rng.range(2.4, 5.5);
    const speed = rng.range(0.9, 3.4) * drag * (1.2 + Math.sqrt(b.R) * 0.55);
    d.reset();
    d.px = _center.x;
    d.py = _center.y;
    d.pz = _center.z;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, Math.abs(_dir.y) * speed * 0.7 + speed * 0.12, _dir.z * speed);
    d.r0 = rng.range(2900, 3300);
    d.g0 = rng.range(1450, 1750);
    d.b0 = rng.range(7, 15);
    d.a0 = 1;
    d.r1 = 1;
    d.g1 = 0.42;
    d.b1 = 0.14;
    d.a1 = 1;
    d.sizes(rng.range(0.018, 0.042), rng.range(0.01, 0.026), 1);
    d.life = rng.range(0.5, 2.1);
    d.drag = drag;
    d.gravity = 1;
    d.sprite = rng.next() < 0.8 ? Sprite.SPARK : Sprite.EMBER;
    // The exposure interval the streak stands for. Long enough that a fragment
    // leaving the blast draws a line rather than a dot, short enough that it is
    // a line and not a rope: a few frames of arc across the whole street reads
    // as a firework, and a firework is the one thing an explosion must not be.
    d.stretch = rng.range(0.012, 0.026);
    d.groundY = b.ground;
    p.spawn(Batch.SPARK);
  }
}

/* --------------------------- stage 4: ground ring --------------------------- */

function groundRing(host: FXHost, b: Blast): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const profile = b.profile;
  const reach = b.reach;

  const count = p.count(Math.round((70 + b.R * 6) * profile.ringDensity));
  for (let i = 0; i < count; i++) {
    // Even angular coverage with jitter: a ring built from a uniform random
    // bearing has visible gaps, and the gaps are what break the illusion.
    const phi = ((i + rng.range(0.1, 0.9)) / count) * Math.PI * 2;
    const cos = Math.cos(phi);
    const sin = Math.sin(phi);
    // With linear drag a particle travels v/k in total, so the reach is
    // authored directly and the speed follows from it rather than the other
    // way round. That is what keeps the ring inside the blast it belongs to.
    const drag = rng.range(1.5, 2.4);
    const speed = reach * drag * rng.range(0.5, 1);
    d.reset();
    d.px = _center.x + cos * b.F * 0.7;
    d.py = b.ground + rng.range(0.04, 0.3) * b.F;
    d.pz = _center.z + sin * b.F * 0.7;
    d.seed = rng.next() * 64;
    // Barely any lift. Overpressure sweeping the floor throws dust *outward*;
    // give it a metre a second of climb and within a second the ring has
    // become a tan cloud standing where the smoke column should be, which
    // hides the one stage that tells the viewer how big the blast was.
    d.velocity(cos * speed, rng.range(0.15, 0.85), sin * speed);
    // Dimmer than it wants to be. Lifted ground dust is the brightest thing a
    // blast produces once the fire is out, and left at its natural value it
    // photographs as a tan cloud standing in front of the sooty column — the
    // ring is supposed to describe the floor, not replace the smoke.
    const tone = rng.range(0.24, 0.4);
    d.colors(tone, tone * 0.93, tone * 0.8, rng.range(0.38, 0.66), tone * 0.7, tone * 0.66, tone * 0.6, 0);
    d.sizes(reach * rng.range(0.035, 0.075), reach * rng.range(0.13, 0.26), 0.42);
    d.life = rng.range(1.6, 3.6);
    d.drag = drag;
    d.gravity = 0.01;
    // A ring is a thin annulus, not a solid mass, so only the puffs on its far
    // side are shaded and only lightly. Enough to give the ring a near edge.
    d.burial = sunBurial(host.sunDir, cos, 0, sin, 1) * RING_OPACITY;
    d.sprite = rng.next() < 0.35 ? Sprite.SMOKE_WISP : Sprite.DUST;
    d.turbulence = reach * 0.02;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-0.8, 0.8);
    d.delay = rng.range(0, 0.06);
    p.spawn(Batch.DUST);
  }

  // A second, wider and later ring: the reflected wave lifting the fines the
  // first pass left behind. It is what makes the floor look dusty rather than
  // making the explosion look bigger.
  const trailing = p.count(Math.round((20 + b.R * 1.8) * profile.ringDensity * b.coupling));
  for (let i = 0; i < trailing; i++) {
    const phi = ((i + rng.range(0.1, 0.9)) / Math.max(1, trailing)) * Math.PI * 2;
    const cos = Math.cos(phi);
    const sin = Math.sin(phi);
    const drag = rng.range(0.9, 1.6);
    const speed = reach * drag * rng.range(0.35, 0.7);
    d.reset();
    d.px = _center.x + cos * b.F * 1.4;
    d.py = b.ground + rng.range(0.1, 0.5);
    d.pz = _center.z + sin * b.F * 1.4;
    d.seed = rng.next() * 64;
    d.velocity(cos * speed, rng.range(0.15, 0.7), sin * speed);
    const tone = rng.range(0.26, 0.42);
    d.colors(tone, tone * 0.94, tone * 0.82, rng.range(0.26, 0.48), tone * 0.7, tone * 0.66, tone * 0.6, 0);
    d.sizes(reach * rng.range(0.05, 0.1), reach * rng.range(0.17, 0.32), 0.45);
    d.life = rng.range(3, 6.5);
    d.drag = drag;
    d.gravity = 0.015;
    d.burial = sunBurial(host.sunDir, cos, 0, sin, 1) * RING_OPACITY;
    d.sprite = Sprite.SMOKE_WISP;
    d.turbulence = reach * 0.03;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-0.5, 0.5);
    d.delay = rng.range(0.15, 0.7);
    p.spawn(Batch.DUST);
  }
}

/* ---------------------------- stage 5: the column --------------------------- */

function column(host: FXHost, b: Blast): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const profile = b.profile;
  const F = b.F;

  // The column is the stage that is still on screen when everything else has
  // gone, so it is the one that cannot be built from a handful of sprites. At
  // the old budget a grenade plume was sixty-five billboards spread over nine
  // metres of climb and it photographed as exactly that: a thin, transparent
  // smear you could count the quads in.
  const count = p.count(Math.round((110 + b.R * 9) * profile.column));
  const window = 0.7 + 0.16 * profile.columnRise;

  for (let i = 0; i < count; i++) {
    const u = i / Math.max(1, count - 1);
    randomDirection(rng);
    // The stalk narrows and slows as the source is exhausted, which is what
    // gives a plume its mushroom rather than a straight cylinder.
    const decay = 1 - u * 0.62;
    const spread = F * (0.35 + u * 1.1);
    const drag = rng.range(0.35, 0.7);
    // Buoyancy keeps lifting after the drag has eaten the launch velocity, so
    // the authored rise is only the ballistic part of the climb.
    const climb = b.rise * drag * decay * rng.range(0.75, 1.25);
    d.reset();
    d.px = _center.x + _dir.x * spread;
    d.py = _center.y + rng.range(0, F * 0.6);
    d.pz = _center.z + _dir.z * spread;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * rng.range(0.4, 1.6) * decay, climb, _dir.z * rng.range(0.4, 1.6) * decay);
    // Sootier at the base where the fuel is richest, greyer as it entrains air.
    const soot = rng.range(0.05, 0.16) * (1 - u * 0.45) + 0.02;
    const grey = soot * (1.9 + u * 2.6);
    d.colors(
      soot,
      soot * 0.97,
      soot * 0.95,
      rng.range(0.7, 0.95),
      grey,
      grey * 0.99,
      grey * 0.98,
      rng.range(0.25, 0.45),
    );
    d.sizes(F * rng.range(0.34, 0.66) * (0.6 + u * 0.6), F * rng.range(1.7, 3.3), 0.42);
    d.life = rng.range(5, 11) * (0.6 + profile.column * 0.5);
    d.drag = drag;
    d.gravity = -0.055;
    // Only the horizontal offset: the light has to cross the stalk to reach
    // this puff, and the stalk is what is in the way. A plume lit uniformly is
    // the same tan colour all the way through, which is what a real one never
    // is — the shadow side of a column of dust is several stops down.
    d.burial = sunBurial(host.sunDir, _dir.x * spread, 0, _dir.z * spread, spread) * PLUME_OPACITY;
    d.sprite = rng.next() < 0.55 ? Sprite.SMOKE : Sprite.SMOKE_WISP;
    // Turbulence grows with age in the shader, so a large value here is what
    // turns a straight column into a rolling one by the time it is tall.
    d.turbulence = F * 0.22 * (0.7 + u * 0.9);
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-0.45, 0.45);
    // The first fifth of the plume is already leaving as the fire dies, so the
    // stalk is standing by the time the fireball has gone rather than starting
    // from nothing half a second later.
    d.delay = u * u * window * rng.range(0.7, 1.3);
    p.spawn(Batch.SMOKE);
  }
}

/* ------------------------- stage 6: debris and chunks ----------------------- */

function chunks(host: FXHost, b: Blast): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const R = b.R;
  const ground = b.ground;

  const count = p.count(Math.round((10 + R * 2.2) * b.profile.debris));
  for (let i = 0; i < count; i++) {
    randomDirection(rng);
    const speed = rng.range(4, 17) * (0.5 + Math.sqrt(R) * 0.3);
    d.reset();
    d.px = _center.x + _dir.x * R * 0.15;
    d.py = _center.y + Math.abs(_dir.y) * R * 0.15;
    d.pz = _center.z + _dir.z * R * 0.15;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, Math.abs(_dir.y) * speed + speed * 0.25, _dir.z * speed);
    const tone = rng.range(0.24, 0.5);
    d.colors(tone, tone * 0.96, tone * 0.9, 1, tone * 0.7, tone * 0.66, tone * 0.62, 1);
    d.sizes(rng.range(0.04, 0.14) * (0.6 + R * 0.06), rng.range(0.03, 0.1) * (0.6 + R * 0.06), 1);
    d.life = rng.range(1.4, 3.4);
    d.drag = rng.range(0.2, 0.7);
    d.gravity = 1;
    d.sprite = rng.next() < 0.6 ? Sprite.CHIP : Sprite.GRIT;
    d.groundY = ground;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-14, 14);
    p.spawn(Batch.CHUNK);
  }
}

function solidDebris(host: FXHost, b: Blast): void {
  if (!host.debris.available) return;
  const rng = host.rng;
  const R = b.R;
  const profile = b.profile;
  const heavy = Math.min(6, Math.round((1 + R * 0.35) * profile.debris));
  const light = Math.min(10, Math.round((2 + R * 0.7) * profile.debris));

  for (let i = 0; i < light; i++) {
    randomDirection(rng);
    const speed = rng.range(5, 15) * (0.5 + Math.sqrt(R) * 0.25);
    host.debris.spawn(
      Debris.RUBBLE,
      _center.x + _dir.x * R * 0.2,
      _center.y + Math.abs(_dir.y) * R * 0.2 + 0.1,
      _center.z + _dir.z * R * 0.2,
      _dir.x * speed,
      Math.abs(_dir.y) * speed + speed * 0.3,
      _dir.z * speed,
      rng.range(8, 26),
    );
  }

  for (let i = 0; i < heavy; i++) {
    randomDirection(rng);
    const speed = rng.range(4, 11) * (0.5 + Math.sqrt(R) * 0.2);
    const vx = _dir.x * speed;
    const vy = Math.abs(_dir.y) * speed + speed * 0.45;
    const vz = _dir.z * speed;
    const spawned = host.debris.spawn(
      Debris.BOULDER,
      _center.x + _dir.x * R * 0.25,
      _center.y + Math.abs(_dir.y) * R * 0.25 + 0.2,
      _center.z + _dir.z * R * 0.25,
      vx,
      vy,
      vz,
      rng.range(3, 12),
    );
    if (spawned) debrisTrail(host, _center.x, _center.y + 0.2, _center.z, vx, vy, vz, b.F);
  }
}

/**
 * A smoke trail on a thrown piece, without tracking the piece.
 *
 * Each puff is given the launch state of the debris and a start delay, so it
 * flies the identical arc a fixed number of milliseconds behind it — a trail,
 * for the cost of writing the records once. Extra drag makes the puffs shed off
 * the path and hang in the air, which is what a real trail does anyway.
 */
function debrisTrail(
  host: FXHost,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  F: number,
): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const puffs = p.count(7);
  for (let i = 0; i < puffs; i++) {
    const lag = (i / puffs) * 0.55;
    d.reset();
    d.px = x;
    d.py = y;
    d.pz = z;
    d.seed = rng.next() * 64;
    d.velocity(vx * 0.92, vy * 0.92, vz * 0.92);
    const tone = rng.range(0.1, 0.2);
    d.colors(tone, tone * 0.97, tone * 0.94, rng.range(0.3, 0.55), tone * 2, tone * 1.95, tone * 1.9, 0);
    d.sizes(0.12 + F * 0.1, 0.6 + F * 0.45, 0.45);
    d.life = rng.range(1.1, 2.3);
    d.drag = rng.range(1.4, 2.4);
    d.gravity = 0.06;
    d.sprite = Sprite.SMOKE_WISP;
    d.turbulence = 0.25;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1, 1);
    d.delay = lag;
    p.spawn(Batch.SMOKE);
  }
}

/* ------------------- stage 7: dust shaken off nearby surfaces --------------- */

function surfaceProbes(host: FXHost, b: Blast): void {
  const physics = host.physics;
  if (!physics?.raycastInto) return;
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const R = b.R;
  const reach = R * 1.2;

  for (let i = 0; i < PROBE_DIRS.length; i++) {
    const probe = PROBE_DIRS[i];
    _probe.set(probe[0], probe[1], probe[2]).normalize();
    if (!physics.raycastInto(_center, _probe, reach, host.hit, PROBE_MASK)) continue;
    const hit = host.hit;
    // Falloff with distance: a wall two metres away sheds a sheet of dust, one
    // at the edge of the blast sheds a wisp.
    const near = 1 - hit.distance / reach;
    if (near < 0.1) continue;
    if (hit.surface === 'water' || hit.surface === 'flesh') continue;

    const count = p.count(Math.round((1 + 3 * near) * b.profile.ringDensity));
    const wallward = probe[1] > 0.9;
    for (let k = 0; k < count; k++) {
      d.reset();
      d.px = hit.point.x + hit.normal.x * 0.08 + rng.range(-0.5, 0.5) * R * 0.25;
      d.py = hit.point.y + hit.normal.y * 0.08 + rng.range(-0.6, 0.4) * R * 0.3;
      d.pz = hit.point.z + hit.normal.z * 0.08 + rng.range(-0.5, 0.5) * R * 0.25;
      d.seed = rng.next() * 64;
      // Off the wall a little, then straight down under its own weight.
      d.velocity(
        hit.normal.x * rng.range(0.2, 1.1) + rng.range(-0.3, 0.3),
        wallward ? rng.range(-2.4, -0.6) : rng.range(-0.6, 0.4),
        hit.normal.z * rng.range(0.2, 1.1) + rng.range(-0.3, 0.3),
      );
      const tone = rng.range(0.34, 0.56);
      d.colors(tone, tone * 0.95, tone * 0.86, rng.range(0.25, 0.5) * near, tone * 0.7, tone * 0.67, tone * 0.62, 0);
      d.sizes(rng.range(0.12, 0.3) * (1 + R * 0.06), rng.range(0.6, 1.4) * (1 + R * 0.07), 0.5);
      d.life = rng.range(1.6, 3.4);
      d.drag = rng.range(1, 2);
      d.gravity = 0.14;
      d.sprite = Sprite.DUST;
      d.turbulence = 0.14;
      d.rotation = rng.range(0, Math.PI * 2);
      d.spin = rng.range(-0.7, 0.7);
      d.delay = rng.range(0.02, 0.28);
      p.spawn(Batch.DUST);
    }
  }
}

/* -------------------------- stage 8: what is left --------------------------- */

function marks(host: FXHost, b: Blast): void {
  const decals = host.decals;
  if (!decals) return;
  const rng = host.rng;
  if (b.coupling < 0.05) return;

  _probe.set(_center.x, b.ground + 0.02, _center.z);
  // The scorch runs well past the fireball — hot gas sweeps the ground long
  // after the ball has lifted — but nothing like as far as the blast radius.
  const scorch = b.F * rng.range(2.4, 3.2);
  const mark = decalOpts(
    scorch > 2.5 ? DecalTile.SCORCH_LARGE : DecalTile.SCORCH_SMALL,
    scorch,
  );
  mark.depth = Math.max(0.5, b.F * 2);
  mark.opacity = 0.85 * Math.min(1, 0.5 + b.profile.soot * 0.5);
  mark.rotation = rng.range(0, Math.PI * 2);
  mark.normalStrength = 0.3;
  mark.glossScale = 0.15;
  mark.angleMin = 0.05;
  mark.fadeIn = 0.3;
  mark.growTo = scorch * 1.12;
  decals.place(_probe, _up, mark);

  // Only a blast that actually bit into the ground leaves a crater, and the
  // hole a charge digs is a fraction of the ball of flame above it.
  if (b.R > 5 && b.coupling > 0.4) {
    const hole = decalOpts(DecalTile.CRATER, b.F * rng.range(0.5, 0.75));
    hole.depth = Math.max(0.4, b.F);
    hole.opacity = 1;
    hole.rotation = rng.range(0, Math.PI * 2);
    hole.normalStrength = 1.35;
    hole.glossScale = 0.2;
    hole.angleMin = 0.4;
    hole.fadeIn = 0.12;
    decals.place(_probe, _up, hole);
  }
}

/* --------------------------------- helpers ---------------------------------- */

/** Uniform point on the sphere, written into `_dir`. */
function randomDirection(rng: { next(): number }): void {
  const z = rng.next() * 2 - 1;
  const a = rng.next() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  _dir.set(Math.cos(a) * r, z, Math.sin(a) * r);
}
