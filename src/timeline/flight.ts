import * as THREE from 'three';
import { clamp, clamp01, fbm1, lerp, smootherstep } from '../core/math';

/**
 * Flight dynamics helpers.
 *
 * Ships are modelled as travelling along +X in a "stage frame": they hold
 * station near the origin while the planet rotates beneath them, which is how
 * the shot geometry stays workable at cinematic scale. Orientation is derived
 * from a forward axis blended with lateral velocity, and roll comes from
 * lateral acceleration — so the ships bank into their manoeuvres instead of
 * sliding sideways.
 */

const _dir = new THREE.Vector3();
const _look = new THREE.Vector3();
const _lat = new THREE.Vector3();

export const FORWARD = new THREE.Vector3(1, 0, 0);

export interface FlightState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
}

/**
 * Sample a position function at three nearby times to obtain a consistent
 * velocity and acceleration without integrating state (keeps scrubbing exact).
 */
export function sampleFlight(
  posAt: (t: number, out: THREE.Vector3) => THREE.Vector3,
  t: number,
  out: FlightState,
  h = 0.08,
): FlightState {
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  posAt(t - h, p0);
  posAt(t, p1);
  posAt(t + h, p2);
  out.position.copy(p1);
  out.velocity.copy(p2).sub(p0).divideScalar(2 * h);
  out.acceleration.copy(p2).add(p0).sub(p1).sub(p1).divideScalar(h * h);
  return out;
}

/**
 * Orient a +Z-forward ship along its travel direction.
 * `lateralGain` controls how much lateral velocity tilts the nose;
 * `bankGain` converts lateral acceleration into roll.
 */
export function orientShip(
  ship: THREE.Object3D,
  state: FlightState,
  opts: { lateralGain?: number; bankGain?: number; forward?: THREE.Vector3; maxBank?: number } = {},
): void {
  const forward = opts.forward ?? FORWARD;
  const lateralGain = opts.lateralGain ?? 0.02;
  const bankGain = opts.bankGain ?? 0.02;

  _lat.copy(state.velocity).addScaledVector(forward, -state.velocity.dot(forward));
  _dir.copy(forward).addScaledVector(_lat, lateralGain).normalize();
  _look.copy(ship.position).add(_dir);
  ship.lookAt(_look);

  // Bank: roll into the turn using the component of lateral acceleration that
  // is perpendicular to both the travel direction and the world up.
  const side = _lat.set(0, 1, 0).cross(_dir).normalize();
  const lateralAccel = state.acceleration.dot(side);
  const roll = clamp(-lateralAccel * bankGain, -(opts.maxBank ?? 0.5), opts.maxBank ?? 0.5);
  ship.rotateZ(roll);
}

/**
 * Cumulative orbital angle of the planet beneath the convoy.
 *
 * The rate is a piecewise-linear function of absolute timeline seconds and is
 * integrated in closed form, so any seek reproduces the same sky.
 */
const RATE_KEYS: Array<[number, number]> = [
  [0, 0.0016],
  [46, 0.0016],
  [84, 0.0044],
  [176, 0.0044],
  [214, 0.0009],
  [600, 0.0009],
];

export function orbitAngle(t: number): number {
  let acc = 0;
  for (let i = 0; i < RATE_KEYS.length - 1; i++) {
    const [t0, r0] = RATE_KEYS[i];
    const [t1, r1] = RATE_KEYS[i + 1];
    if (t <= t0) break;
    const tt = Math.min(t, t1);
    const k = (tt - t0) / (t1 - t0);
    const rAtT = lerp(r0, r1, k);
    acc += ((r0 + rAtT) / 2) * (tt - t0);
    if (t <= t1) break;
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Choreography: the two ships' stage-frame positions
// ---------------------------------------------------------------------------

/** Where the runner sits (world space) at absolute timeline time `t`. */
export function runnerPositionAt(t: number, out: THREE.Vector3): THREE.Vector3 {
  const PURSUIT = 84;
  const CAPTURE = 176;
  const DOCK_END = 202;

  if (t < PURSUIT) {
    // Held off-stage before it enters.
    return out.set(-2200, 140, 520);
  }

  const tau = t - PURSUIT;
  // Entry sweep.
  const entry = clamp01(tau / 7);
  const ex = lerp(-1250, -40, smootherstep(entry));
  const ey = lerp(150, 18, smootherstep(entry));
  const ez = lerp(430, 80, smootherstep(entry));

  // Cruise weave: slow evasive drift, sharpened while under fire.
  const heat = clamp01((tau - 34) / 12) * (1 - clamp01((tau - 74) / 10));
  const weaveAmp = 55 + heat * 85;
  const wx = fbm1(tau * 0.12, 2, 5) * 90;
  const wy = fbm1(tau * 0.19 + 30, 3, 17) * weaveAmp * 0.7;
  const wz = fbm1(tau * 0.16 + 60, 3, 41) * weaveAmp;

  // Hard jinks when specific shots are landing.
  const jink = (at: number, dur: number, amp: number): number => {
    const k = clamp01((tau - at) / dur);
    if (k <= 0 || k >= 1) return 0;
    return Math.sin(k * Math.PI) * Math.sin(k * Math.PI * 2.2) * amp;
  };
  const jy = jink(42, 3.4, 55) + jink(58, 3.0, -48) + jink(67, 2.6, 40);
  const jz = jink(45, 3.6, -70) + jink(61, 3.2, 62);

  // Power loss: the ship stops manoeuvring and drifts.
  const dead = clamp01((tau - 76) / 8);
  const cruiseX = -40 + wx * (1 - dead * 0.8);
  const cruiseY = 18 + (wy + jy) * (1 - dead * 0.9) + dead * -12;
  const cruiseZ = 80 + (wz + jz) * (1 - dead * 0.9);

  const base = out.set(
    entry < 1 ? ex : cruiseX,
    entry < 1 ? ey : cruiseY,
    entry < 1 ? ez : cruiseZ,
  );
  if (entry < 1) {
    // Blend the tail of the entry into the cruise so there is no snap.
    const b = smootherstep(clamp01((tau - 5) / 2));
    base.x = lerp(ex, cruiseX, b);
    base.y = lerp(ey, cruiseY, b);
    base.z = lerp(ez, cruiseZ, b);
  }

  if (t < CAPTURE) return base;

  // Tractor pull: dragged up under the destroyer's bow and held there.
  const sigma = clamp01((t - CAPTURE - 4) / (DOCK_END - CAPTURE - 4));
  const k = smootherstep(sigma);
  const dockDrift = Math.sin((t - DOCK_END) * 0.22) * 1.6 * (t > DOCK_END ? 1 : 0);
  return out.set(
    lerp(base.x, DOCK.x, k),
    lerp(base.y, DOCK.y + dockDrift, k),
    lerp(base.z, DOCK.z, k),
  );
}

/** Final docked position of the runner beneath the destroyer's bow. */
export const DOCK = new THREE.Vector3(60, 96, -26);

/** Where the destroyer sits (world space) at absolute timeline time `t`. */
export function destroyerPositionAt(t: number, out: THREE.Vector3): THREE.Vector3 {
  const PURSUIT = 84;
  if (t < PURSUIT) return out.set(-4200, 430, -60);
  const tau = t - PURSUIT;

  // Closing profile chosen so the hull is directly overhead of the corvette
  // during the reveal, which is what sells the size difference.
  let x: number;
  if (tau < 10) x = -2600;
  else if (tau < 40) x = lerp(-2600, -700, smootherstep((tau - 10) / 30));
  else if (tau < 62) x = lerp(-700, 100, smootherstep((tau - 40) / 22));
  else x = lerp(100, 240, smootherstep(clamp01((tau - 62) / 30)));

  const y = lerp(430, 332, smootherstep(clamp01((tau - 28) / 50)));
  const z = lerp(-60, -18, smootherstep(clamp01((tau - 30) / 46)));

  // Very slight pitch/heave so the hull is never perfectly static.
  const heave = fbm1(t * 0.05, 2, 71) * 5;
  return out.set(x, y + heave, z);
}

/**
 * Escape pod path once launched (absolute time).
 *
 * Tuned so the pod is still ~450 m above the surface when the cinematic ends —
 * it must be visibly entering the atmosphere, never intersecting the planet.
 */
export function podPositionAt(t: number, launchT: number, out: THREE.Vector3): THREE.Vector3 {
  const s = Math.max(0, t - launchT);
  const bay = new THREE.Vector3(DOCK.x + 6, DOCK.y - 9, DOCK.z + 12);
  const push = smootherstep(clamp01(s / 2.6));
  const fall = Math.max(0, s - 1.6);
  const drop = Math.min(1780, 0.6 * fall * fall + 3.2 * fall);
  return out.set(
    bay.x + push * 24 + fall * 1.4,
    bay.y - push * 14 - drop,
    bay.z + push * 40 + fall * 3.6,
  );
}
