import * as THREE from 'three';
import { PLANET_RADIUS } from '../assets/world/Tatooine';
import { clamp, saturate, smoothstep } from '../core/mathx';
import { ScalarTrack, SpeedProfile, VectorTrack, wobble } from './tracks';

/**
 * The stage: where every object is, at every moment, in closed form.
 *
 * Two coordinate spaces matter.
 *
 *  - World space holds Tatooine and the starfield. The planet is centred far
 *    below the action so its limb curves across the bottom of frame.
 *  - The **chase frame** is a moving reference attached to the blockade
 *    runner's orbital track: origin at the runner, +Z along its heading, +Y
 *    straight up away from the planet. All ship offsets, battle effects, camera
 *    rigs and debris are authored in this small, readable local space, which
 *    also keeps float precision comfortable at 100 km from the origin.
 */

export const CHAPTER_TIMES = {
  prologue: [0, 46],
  tatooine: [46, 86],
  pursuit: [86, 158],
  capture: [158, 196],
  corridor: [196, 262],
  plans: [262, 306],
  escape: [306, 352],
  epilogue: [352, 380],
} as const;

export type ChapterId = keyof typeof CHAPTER_TIMES;
export const CHAPTER_IDS = Object.keys(CHAPTER_TIMES) as ChapterId[];
export const TOTAL_DURATION = CHAPTER_TIMES.epilogue[1];

/** Altitude of the runner's track above the desert. */
export const ORBIT_ALTITUDE = 52_000;
export const ORBIT_RADIUS = PLANET_RADIUS + ORBIT_ALTITUDE;
export const PLANET_CENTER = new THREE.Vector3(0, -ORBIT_RADIUS, 0);

/** Direction of the (single, warm) primary sun in world space. */
export const SUN_DIRECTION = new THREE.Vector3(0.55, 0.42, 0.72).normalize();

/** Speed of the corvette along its track, in metres per second. */
const RUNNER_SPEED = new SpeedProfile(CHAPTER_TIMES.pursuit[0], [
  { t: 0, v: 980 },
  { t: 150, v: 980 },
  { t: 154, v: 940 },
  { t: 168, v: 210 },
  { t: 380, v: 190 },
]);

/** Arc length travelled along the orbital track. */
export function runnerArcLength(t: number): number {
  return RUNNER_SPEED.distanceAt(t);
}

export function runnerSpeed(t: number): number {
  return RUNNER_SPEED.speedAt(t);
}

const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3(1, 0, 0);
const _m = new THREE.Matrix4();

/**
 * Position and orientation of the chase frame at time `t`.
 * Writes into the supplied object; returns it for chaining.
 */
export function chaseFrame(t: number, out: THREE.Object3D): THREE.Object3D {
  const theta = runnerArcLength(t) / ORBIT_RADIUS;
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  _up.set(0, c, s);
  _fwd.set(0, -s, c);
  out.position.copy(PLANET_CENTER).addScaledVector(_up, ORBIT_RADIUS);
  _m.makeBasis(_right, _up, _fwd);
  out.quaternion.setFromRotationMatrix(_m);
  out.updateMatrixWorld(true);
  return out;
}

// ---------------------------------------------------------------------------
// Blockade runner - local offsets inside the chase frame
// ---------------------------------------------------------------------------

const runnerOffset = new VectorTrack([
  { t: 0, v: [0, 0, 0] },
  { t: 96, v: [0, 0, 0] },
  { t: 104, v: [34, 8, 0], ease: 'in-out' },
  { t: 116, v: [-42, -12, 0], ease: 'in-out' },
  { t: 126, v: [26, 14, 0], ease: 'in-out' },
  { t: 138, v: [-20, -6, 0], ease: 'in-out' },
  { t: 152, v: [6, 2, 0], ease: 'in-out' },
  { t: 168, v: [0, 0, 0], ease: 'out' },
  { t: 380, v: [0, 0, 0] },
]);

/** Engine output, dropping to nothing when the drives are knocked out. */
export const runnerEngineLevel = new ScalarTrack([
  { t: 0, v: 1 },
  { t: 150, v: 1 },
  { t: 152.5, v: 0.25, ease: 'out' },
  { t: 154, v: 0.75, ease: 'out' },
  { t: 156, v: 0.08, ease: 'out' },
  { t: 158, v: 0.3, ease: 'out' },
  { t: 161, v: 0.0, ease: 'out' },
  { t: 380, v: 0 },
]);

export function runnerTransform(t: number, out: THREE.Object3D): THREE.Object3D {
  runnerOffset.at(t, out.position);
  const vel = runnerOffset.velocityAt(t);
  // Bank into lateral moves; pitch slightly with vertical moves.
  const roll = clamp(-vel.x * 0.055, -0.5, 0.5);
  const pitch = clamp(vel.y * 0.02, -0.18, 0.18);
  const yaw = clamp(vel.x * 0.0075, -0.14, 0.14);
  // A dead ship tumbles very slowly instead of holding attitude.
  const dead = smoothstep(158, 176, t);
  out.rotation.set(
    pitch + dead * Math.sin(t * 0.11) * 0.035,
    yaw + dead * Math.sin(t * 0.083 + 1.1) * 0.05,
    roll + dead * Math.sin(t * 0.07 + 2.2) * 0.06,
  );
  out.updateMatrixWorld(true);
  return out;
}

// ---------------------------------------------------------------------------
// Imperial destroyer - local offsets inside the chase frame
// ---------------------------------------------------------------------------

/**
 * The destroyer's approach is tuned against the reveal camera at chase-local
 * (0, -30, -520): its bow crosses the top of that frame at about t = 100 and
 * the belly fills the upper half by t = 118, after which it settles into
 * station-keeping above the crippled corvette.
 */
const destroyerOffset = new VectorTrack([
  { t: 0, v: [60, 2600, -26000] },
  { t: 86, v: [50, 1500, -8200], ease: 'linear' },
  { t: 92, v: [42, 1080, -5200], ease: 'linear' },
  { t: 98, v: [34, 820, -2200], ease: 'linear' },
  { t: 104, v: [27, 712, -700], ease: 'linear' },
  { t: 110, v: [21, 686, 500], ease: 'linear' },
  { t: 116, v: [17, 664, 1050], ease: 'in-out' },
  { t: 124, v: [13, 622, 1300], ease: 'in-out' },
  { t: 136, v: [8, 544, 1360], ease: 'in-out' },
  { t: 146, v: [5, 444, 1180], ease: 'in-out' },
  { t: 158, v: [0, 362, 950], ease: 'in-out' },
  { t: 172, v: [0, 280, 660], ease: 'in-out' },
  { t: 186, v: [0, 216, 430], ease: 'in-out' },
  { t: 196, v: [0, 196, 360], ease: 'in-out' },
  { t: 380, v: [0, 196, 360] },
]);

export function destroyerTransform(t: number, out: THREE.Object3D): THREE.Object3D {
  destroyerOffset.at(t, out.position);
  // Barely-there attitude changes; something this big does not jink.
  out.rotation.set(
    -0.004 + wobble(t, 0.07, 1.3) * 0.0025,
    wobble(t, 0.05, 4.1) * 0.0022,
    wobble(t, 0.043, 2.7) * 0.0035,
  );
  out.updateMatrixWorld(true);
  return out;
}

/** Length of the boarding umbilical between the two hulls, 0 when stowed. */
export const dockingArmExtension = new ScalarTrack([
  { t: 0, v: 0 },
  { t: 176, v: 0 },
  { t: 180, v: 0.35, ease: 'in-out' },
  { t: 188, v: 1, ease: 'in-out' },
  { t: 380, v: 1 },
]);

/** Tractor-beam glow between destroyer and corvette. */
export const tractorBeam = new ScalarTrack([
  { t: 0, v: 0 },
  { t: 152, v: 0 },
  { t: 156, v: 0.9, ease: 'out' },
  { t: 178, v: 0.75 },
  { t: 194, v: 0.25, ease: 'in-out' },
  { t: 380, v: 0.18 },
]);

// ---------------------------------------------------------------------------
// Escape pod
// ---------------------------------------------------------------------------

/** Pod path in the chase frame: it drops away and falls toward the desert. */
const podOffset = new VectorTrack([
  { t: 0, v: [-8.4, -3.2, -34] },
  { t: 318, v: [-8.4, -3.2, -34] },
  { t: 320.5, v: [-26, -16, -40], ease: 'out' },
  { t: 323, v: [-58, -46, -54], ease: 'linear' },
  { t: 327, v: [-150, -190, -120], ease: 'linear' },
  { t: 332, v: [-320, -700, -320], ease: 'linear' },
  { t: 338, v: [-620, -2600, -900], ease: 'linear' },
  { t: 344, v: [-980, -8200, -1900], ease: 'linear' },
  { t: 352, v: [-1500, -24000, -3600], ease: 'linear' },
  { t: 362, v: [-2100, -41000, -5600], ease: 'linear' },
  { t: 380, v: [-3000, -49500, -8600], ease: 'linear' },
]);

export const podEngineLevel = new ScalarTrack([
  { t: 0, v: 0 },
  { t: 319.6, v: 0 },
  { t: 320.4, v: 1, ease: 'out' },
  { t: 326, v: 0.85 },
  { t: 333, v: 0.25, ease: 'in-out' },
  { t: 342, v: 0.05 },
  { t: 380, v: 0.02 },
]);

export const podReentry = new ScalarTrack([
  { t: 0, v: 0 },
  { t: 344, v: 0 },
  { t: 352, v: 0.45, ease: 'in-out' },
  { t: 364, v: 1, ease: 'in-out' },
  { t: 380, v: 1 },
]);

export function podTransform(t: number, out: THREE.Object3D): THREE.Object3D {
  podOffset.at(t, out.position);
  const vel = podOffset.velocityAt(t);
  if (vel.lengthSq() > 1e-4) {
    const target = out.position.clone().add(vel);
    out.lookAt(target);
    // Tumble a little just after separation, then settle nose-down.
    const tumble = saturate(1 - (t - 320) / 9);
    out.rotateZ(Math.sin((t - 320) * 2.2) * 0.7 * tumble);
    out.rotateX(Math.sin((t - 320) * 1.6) * 0.35 * tumble);
  }
  out.updateMatrixWorld(true);
  return out;
}

/** True while the pod should be drawn at all. */
export function podVisible(t: number): boolean {
  return t >= CHAPTER_TIMES.escape[0] - 4;
}

// ---------------------------------------------------------------------------
// Chapter helpers
// ---------------------------------------------------------------------------

export function chapterAt(t: number): ChapterId {
  for (const id of CHAPTER_IDS) {
    const [a, b] = CHAPTER_TIMES[id];
    if (t >= a && t < b) return id;
  }
  return t < 0 ? 'prologue' : 'epilogue';
}

export function chapterProgress(t: number): number {
  const id = chapterAt(t);
  const [a, b] = CHAPTER_TIMES[id];
  return saturate((t - a) / (b - a));
}

/** Chapters that render the space scene rather than the ship interior. */
export const EXTERIOR_CHAPTERS: ChapterId[] = ['prologue', 'tatooine', 'pursuit', 'capture', 'escape', 'epilogue'];
export const INTERIOR_CHAPTERS: ChapterId[] = ['corridor', 'plans'];

export function isExterior(t: number): boolean {
  return EXTERIOR_CHAPTERS.includes(chapterAt(t));
}
