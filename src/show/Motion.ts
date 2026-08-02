import * as THREE from 'three';
import { clamp, lerp, smootherstep, smoothstep } from '../core/MathX';

/**
 * Ship motion.
 *
 * Speed is authored as a profile, then integrated once into a lookup table so
 * position is an exact, monotonic function of time. Orientation always comes
 * from the velocity vector, which is what stops the ships from sliding
 * sideways through space.
 */

export interface SpeedSegment {
  /** Absolute time at which this speed is reached. */
  t: number;
  speed: number;
}

export class MotionTrack {
  private times: Float64Array;
  private distances: Float64Array;
  private step: number;
  private t0: number;

  constructor(
    private segments: SpeedSegment[],
    t0: number,
    t1: number,
    step = 0.05,
  ) {
    this.t0 = t0;
    this.step = step;
    const n = Math.ceil((t1 - t0) / step) + 1;
    this.times = new Float64Array(n);
    this.distances = new Float64Array(n);
    let d = 0;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * step;
      this.times[i] = t;
      this.distances[i] = d;
      d += this.speedAt(t + step * 0.5) * step;
    }
  }

  speedAt(t: number): number {
    const s = this.segments;
    if (t <= s[0].t) return s[0].speed;
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i].t) {
        const k = (t - s[i - 1].t) / Math.max(1e-6, s[i].t - s[i - 1].t);
        return lerp(s[i - 1].speed, s[i].speed, smoothstep(0, 1, k));
      }
    }
    return s[s.length - 1].speed;
  }

  /** Distance travelled since t0 (extrapolates linearly outside the table). */
  distanceAt(t: number): number {
    const n = this.distances.length;
    const f = (t - this.t0) / this.step;
    if (f <= 0) return this.speedAt(t) * (t - this.t0);
    if (f >= n - 1) {
      const last = this.distances[n - 1];
      return last + this.speedAt(t) * (t - this.times[n - 1]);
    }
    const i = Math.floor(f);
    const k = f - i;
    return lerp(this.distances[i], this.distances[i + 1], k);
  }
}

/* ---------------------------------------------------------- pursuit plan */

export const CHASE_START = 78;
export const CAPTURE_START = 168;
export const CAPTURE_END = 210;
export const POD_LAUNCH = 350;

const RUNNER_TRACK = new MotionTrack(
  [
    { t: 0, speed: 230 },
    { t: 172, speed: 230 },
    { t: 196, speed: 110 },
    { t: 500, speed: 110 },
  ],
  CHASE_START,
  420,
);

const DESTROYER_TRACK = new MotionTrack(
  [
    { t: 0, speed: 253 },
    { t: 172, speed: 253 },
    { t: 198, speed: 110 },
    { t: 500, speed: 110 },
  ],
  CHASE_START,
  420,
);

/** Destroyer z at the moment the reveal shot begins, relative to the runner. */
const DESTROYER_Z0 = 2115;

export interface ShipState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bank: number;
}

const _prev = new THREE.Vector3();
const _next = new THREE.Vector3();

function runnerRaw(t: number, out: THREE.Vector3): void {
  const d = RUNNER_TRACK.distanceAt(t);
  const chase = clamp((t - CHASE_START) / 12, 0, 1);
  // Lateral weave while under power; it straightens out once she is caught.
  const settle = 1 - smootherstep(168, 200, t);
  const x = Math.sin((t - CHASE_START) * 0.085) * 62 * chase * settle;
  const yWeave = Math.sin((t - CHASE_START) * 0.13 + 1.2) * 15 * chase * settle;
  // Tractor lift.
  const lift = smootherstep(176, 206, t) * 280;
  out.set(x, yWeave + lift, -d);
}

function destroyerRaw(t: number, out: THREE.Vector3): void {
  const d = DESTROYER_TRACK.distanceAt(t);
  out.set(Math.sin(t * 0.031) * 14, 400, DESTROYER_Z0 - d);
}

function sampleWithDerivative(
  fn: (t: number, out: THREE.Vector3) => void,
  t: number,
  state: ShipState,
): void {
  const h = 0.08;
  fn(t, state.position);
  fn(t - h, _prev);
  fn(t + h, _next);
  state.velocity.copy(_next).sub(_prev).multiplyScalar(1 / (2 * h));
  // Bank proportional to lateral acceleration.
  const ax = (_next.x - 2 * state.position.x + _prev.x) / (h * h);
  state.bank = clamp(-ax * 0.06, -0.55, 0.55);
}

export function runnerState(t: number, out: ShipState): void {
  sampleWithDerivative(runnerRaw, t, out);
}

export function destroyerState(t: number, out: ShipState): void {
  sampleWithDerivative(destroyerRaw, t, out);
}

export function makeShipState(): ShipState {
  return { position: new THREE.Vector3(), velocity: new THREE.Vector3(0, 0, -1), bank: 0 };
}

/* ------------------------------------------------------------ escape pod */

/**
 * Escape-pod trajectory, expressed relative to the corvette so the launch
 * always lines up with hatch six however far downrange the ships have run.
 *
 * Phase one is a cold-gas push straight out of the bay; phase two is a long,
 * gentle burn that curves down and away toward the planet. The speeds are
 * deliberately modest so the two ships stay in frame behind the pod for the
 * whole of the "falling clear" beat.
 */
const POD_DIRECTION = new THREE.Vector3(0.42, -0.74, -0.52).normalize();
const POD_ACCEL = 6;
const POD_VMAX = 96;

export function podOffset(t: number, out: THREE.Vector3): void {
  const local = t - POD_LAUNCH;
  if (local <= 0) {
    out.set(10.6, -2.4, 22);
    return;
  }
  const push = Math.min(local, 2.2);
  const drift = push * 9;
  const burn = Math.max(0, local - 2.2);
  const tMax = POD_VMAX / POD_ACCEL;
  const travelled =
    burn < tMax
      ? 0.5 * POD_ACCEL * burn * burn
      : (POD_VMAX * POD_VMAX) / (2 * POD_ACCEL) + POD_VMAX * (burn - tMax);
  out.set(10.6 + drift, -2.4, 22);
  out.addScaledVector(POD_DIRECTION, travelled);
}

export function podHeat(t: number): number {
  return smoothstep(374, 398, t) * 1.1;
}
