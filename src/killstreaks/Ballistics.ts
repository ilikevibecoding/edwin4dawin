/**
 * Ordnance trajectories: solve once, bake, play back.
 *
 * Two problems get solved together here. The first is fire control: given where
 * the aircraft will be, where the bomb has to land and when it has to get there,
 * what velocity does it leave the rack with? That is a two-point boundary value
 * problem with drag in the loop, and it is solved the way a real bombing computer
 * solves it — shoot the trajectory, measure how far the miss is, correct the
 * launch velocity by miss over time of flight, repeat. With a near-identity
 * Jacobian it converges to centimetres in four passes.
 *
 * The second is determinism. A walked carpet is only impressive if the ninth bomb
 * lands 96 m from the first at a predictable moment; integrate per frame and a
 * long frame or a paused tab quietly puts a crater in the wrong place. So the
 * solved arc is baked to a fixed-rate sample buffer at release and the bomb is
 * played back off it. The flight the player watches is still the integrated
 * drag trajectory, sample for sample — it just cannot drift.
 *
 * Everything works in caller-owned buffers; a nine-bomb salvo allocates nothing.
 */
import * as THREE from 'three';
import { ORDNANCE_DRAG, ORDNANCE_GRAVITY } from './Tuning';

/** Playback sample rate. 25 Hz keeps linear interpolation error under 2 cm. */
export const ARC_STEP = 0.04;
/** 6.4 s of flight — the longest is a drogue-retarded bomblet from 105 m. */
export const ARC_MAX_SAMPLES = 160;
/** Integration sub-step. */
const SUB_STEP = 1 / 120;

export class BakedArc {
  readonly samples = new Float32Array(ARC_MAX_SAMPLES * 3);
  count = 0;
  duration = 0;
  /** Drag scale applied when this arc was integrated. */
  dragScale = 1;

  /** Position at `t` seconds after release. Clamps at both ends. */
  sample(t: number, out: THREE.Vector3): THREE.Vector3 {
    if (this.count === 0) return out.set(0, 0, 0);
    const f = Math.min(Math.max(t, 0) / ARC_STEP, this.count - 1);
    const i = Math.min(Math.floor(f), this.count - 2 < 0 ? 0 : this.count - 2);
    const frac = f - i;
    const a = i * 3;
    const b = Math.min(i + 1, this.count - 1) * 3;
    const s = this.samples;
    return out.set(
      s[a] + (s[b] - s[a]) * frac,
      s[a + 1] + (s[b + 1] - s[a + 1]) * frac,
      s[a + 2] + (s[b + 2] - s[a + 2]) * frac,
    );
  }

  /** Velocity at `t`, from the baked samples. Used to orient the body. */
  velocity(t: number, out: THREE.Vector3): THREE.Vector3 {
    if (this.count < 2) return out.set(0, -1, 0);
    const f = Math.min(Math.max(t, 0) / ARC_STEP, this.count - 1);
    const i = Math.min(Math.max(Math.round(f), 1), this.count - 1);
    const a = (i - 1) * 3;
    const b = i * 3;
    const s = this.samples;
    return out
      .set(s[b] - s[a], s[b + 1] - s[a + 1], s[b + 2] - s[a + 2])
      .multiplyScalar(1 / ARC_STEP);
  }
}

const _pos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _accel = new THREE.Vector3();
const _midPos = new THREE.Vector3();
const _midVel = new THREE.Vector3();
const _end = new THREE.Vector3();
const _guess = new THREE.Vector3();

/** `a = -g y - k s v |v|`, where `s` scales drag for retarded stores. */
function acceleration(velocity: THREE.Vector3, dragScale: number, out: THREE.Vector3): THREE.Vector3 {
  const speed = velocity.length();
  const k = ORDNANCE_DRAG * dragScale * speed;
  out.set(-velocity.x * k, -ORDNANCE_GRAVITY - velocity.y * k, -velocity.z * k);
  return out;
}

/**
 * Integrates for `duration` seconds with midpoint RK2 and writes the arc into
 * `arc`. Returns the end position in `arc`'s last sample.
 */
export function bakeArc(
  origin: THREE.Vector3,
  velocity: THREE.Vector3,
  duration: number,
  dragScale: number,
  arc: BakedArc,
): void {
  _pos.copy(origin);
  _vel.copy(velocity);
  arc.dragScale = dragScale;
  arc.count = 0;

  // Report the duration actually baked, so a caller that asked for more flight
  // than the buffer holds ends the store early rather than parking it in mid-air.
  const total = Math.min(duration, (ARC_MAX_SAMPLES - 1) * ARC_STEP);
  arc.duration = total;
  const sampleCount = Math.max(2, Math.floor(total / ARC_STEP) + 1);
  let nextSample = 0;
  let t = 0;

  const write = (): void => {
    if (arc.count >= ARC_MAX_SAMPLES) return;
    const o = arc.count * 3;
    arc.samples[o] = _pos.x;
    arc.samples[o + 1] = _pos.y;
    arc.samples[o + 2] = _pos.z;
    arc.count++;
  };

  write();
  nextSample = 1;

  while (arc.count < sampleCount) {
    const target = nextSample * ARC_STEP;
    while (t < target - 1e-9) {
      const h = Math.min(SUB_STEP, target - t);
      step(h, dragScale);
      t += h;
    }
    write();
    nextSample++;
  }
}

function step(h: number, dragScale: number): void {
  acceleration(_vel, dragScale, _accel);
  _midVel.copy(_vel).addScaledVector(_accel, h * 0.5);
  _midPos.copy(_pos).addScaledVector(_vel, h * 0.5);
  acceleration(_midVel, dragScale, _accel);
  _pos.copy(_midPos).addScaledVector(_midVel, h * 0.5);
  _vel.addScaledVector(_accel, h);
}

/** End position of an arc without baking it. */
function endpoint(
  origin: THREE.Vector3,
  velocity: THREE.Vector3,
  duration: number,
  dragScale: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  _pos.copy(origin);
  _vel.copy(velocity);
  let t = 0;
  while (t < duration - 1e-9) {
    const h = Math.min(SUB_STEP, duration - t);
    step(h, dragScale);
    t += h;
  }
  return out.copy(_pos);
}

/**
 * Integrates forward for `duration`, reporting the end state. Used for the parts
 * of a sequence that are naturally forward problems — where a released store
 * *ends up* — rather than the fire-control problem of how to hit a point.
 */
export function simulateFor(
  origin: THREE.Vector3,
  velocity: THREE.Vector3,
  duration: number,
  dragScale: number,
  outPosition: THREE.Vector3,
  outVelocity: THREE.Vector3,
): void {
  _pos.copy(origin);
  _vel.copy(velocity);
  let t = 0;
  while (t < duration - 1e-9) {
    const h = Math.min(SUB_STEP, duration - t);
    step(h, dragScale);
    t += h;
  }
  outPosition.copy(_pos);
  outVelocity.copy(_vel);
}

/**
 * Integrates forward until the store descends through `altitude`, returning the
 * elapsed time. This is how the cluster canister's burst point is found: the
 * fuze is set on a barometric height, so the burst is wherever the airframe
 * happens to be when it passes that height, not a point chosen in advance.
 */
export function simulateToAltitude(
  origin: THREE.Vector3,
  velocity: THREE.Vector3,
  altitude: number,
  dragScale: number,
  outPosition: THREE.Vector3,
  outVelocity: THREE.Vector3,
  maxTime = 12,
): number {
  _pos.copy(origin);
  _vel.copy(velocity);
  let t = 0;
  while (_pos.y > altitude && t < maxTime) {
    step(SUB_STEP, dragScale);
    t += SUB_STEP;
  }
  outPosition.copy(_pos);
  outVelocity.copy(_vel);
  return t;
}

export interface ReleaseSolution {
  /** Velocity the store must leave the rack with. */
  velocity: THREE.Vector3;
  /** Distance from the aircraft's own velocity — the ejector/retarder share. */
  delta: number;
  /** Residual miss distance after the last iteration, metres. */
  residual: number;
}

const _solution: ReleaseSolution = {
  velocity: new THREE.Vector3(),
  delta: 0,
  residual: 0,
};

/**
 * Solves the release velocity that puts a store on `target` exactly `duration`
 * seconds after leaving `origin`.
 *
 * The seed is the drag-free closed form, which is already within a few percent;
 * each iteration then folds the measured miss back into the launch velocity. Four
 * passes is empirically enough for sub-centimetre residuals at three second
 * flight times, and the residual is returned so the caller can assert on it.
 */
export function solveRelease(
  origin: THREE.Vector3,
  target: THREE.Vector3,
  duration: number,
  dragScale: number,
  carrierVelocity: THREE.Vector3 | null,
  iterations = 4,
): ReleaseSolution {
  const v = _solution.velocity;
  // Drag-free two-point solution: (p1 - p0)/T - 0.5 a T, with a = -g y.
  v.set(
    (target.x - origin.x) / duration,
    (target.y - origin.y) / duration + 0.5 * ORDNANCE_GRAVITY * duration,
    (target.z - origin.z) / duration,
  );

  for (let i = 0; i < iterations; i++) {
    endpoint(origin, v, duration, dragScale, _end);
    v.x += (target.x - _end.x) / duration;
    v.y += (target.y - _end.y) / duration;
    v.z += (target.z - _end.z) / duration;
  }

  endpoint(origin, v, duration, dragScale, _end);
  _solution.residual = _end.distanceTo(target);
  _solution.delta = carrierVelocity ? _guess.copy(v).sub(carrierVelocity).length() : 0;
  return _solution;
}

/**
 * Time for a store released at `altitude` above its target with vertical speed
 * `vy` to arrive, ignoring the horizontal axis. Used to size the burst height of
 * the cluster canister and to sanity-check schedules.
 */
export function fallTime(altitude: number, vy = 0, dragScale = 1): number {
  _pos.set(0, altitude, 0);
  _vel.set(0, vy, 0);
  let t = 0;
  while (_pos.y > 0 && t < 12) {
    step(SUB_STEP, dragScale);
    t += SUB_STEP;
  }
  return t;
}

/** Drag scale at which a store settles at `terminal` m/s. */
export function dragScaleForTerminal(terminal: number): number {
  return ORDNANCE_GRAVITY / (terminal * terminal * ORDNANCE_DRAG);
}

/**
 * Drag scale for which a store dropped from rest falls `height` in `time`.
 *
 * Vertical quadratic drag has a closed form — `y = ln(cosh(t sqrt(gk))) / k` —
 * so this is a bisection on an analytic expression rather than on an integration,
 * which is what makes it affordable to give twenty-four bomblets twenty-four
 * different drogue efficiencies at the moment the canister splits. Physically it
 * is the spread between a drogue that streams instantly and one that streams
 * late, and it is what makes the pattern rain down over seconds instead of
 * arriving as one chord.
 */
export function dragForFallTime(height: number, time: number, iterations = 26): number {
  // `a = sqrt(g k)`, so drop height is (g / a^2) ln(cosh(a t)).
  const drop = (a: number): number =>
    a < 1e-6 ? 0.5 * ORDNANCE_GRAVITY * time * time : (ORDNANCE_GRAVITY / (a * a)) * Math.log(Math.cosh(a * time));
  if (drop(1e-6) <= height) return 0;

  let low = 0;
  let high = 40;
  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) * 0.5;
    // Drop falls monotonically with `a`, so the bracket is unambiguous.
    if (drop(mid) > height) low = mid;
    else high = mid;
  }
  const a = (low + high) * 0.5;
  return (a * a) / ORDNANCE_GRAVITY / ORDNANCE_DRAG;
}
