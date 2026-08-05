/**
 * Flight physics.
 *
 * A deliberately simplified, gameplay-first model. It integrates gravity and a
 * crude altitude-scaled drag term, orients bodies along velocity, and steers
 * interceptors with a limited-acceleration lead-pursuit law.
 *
 * This is NOT a fire-control model and makes no attempt at operational
 * accuracy. It exists to make motion look believable and to make outcomes
 * repeatable and explainable to the player.
 */

import * as THREE from 'three';
import { WORLD } from './config.js';
import { airDensity, clamp, clamp01 } from './util/mathx.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _fwd = new THREE.Vector3(0, 0, 1);

export const G = WORLD.gravity;

/**
 * One integration step for a ballistic body.
 * @param {THREE.Vector3} pos
 * @param {THREE.Vector3} vel
 * @param {number} dt
 * @param {number} dragCoeff  quadratic drag scale (fictional)
 * @param {THREE.Vector3} [extraAccel]
 */
export function stepBallistic(pos, vel, dt, dragCoeff, extraAccel = null) {
  const rho = airDensity(pos.y);
  const speed = vel.length();
  // Semi-implicit: acceleration first, then position, keeps arcs stable at large dt.
  _a.set(0, -G, 0);
  if (extraAccel) _a.add(extraAccel);
  if (dragCoeff > 0 && speed > 1e-3) {
    const dragMag = dragCoeff * rho * speed * speed;
    _b.copy(vel).multiplyScalar(-dragMag / speed);
    _a.add(_b);
  }
  vel.addScaledVector(_a, dt);
  pos.addScaledVector(vel, dt);
  return vel;
}

/**
 * Cheap forward prediction of a ballistic body, ignoring drag variation.
 * Used by the (fictional) fire-control abstraction and by the radar readout.
 */
export function predictBallistic(pos, vel, t, out = new THREE.Vector3()) {
  return out.set(
    pos.x + vel.x * t,
    pos.y + vel.y * t - 0.5 * G * t * t,
    pos.z + vel.z * t,
  );
}

/** Time until a ballistic body crosses y = groundY (positive root, else -1). */
export function timeToGround(pos, vel, groundY = WORLD.groundY) {
  const a = -0.5 * G;
  const b = vel.y;
  const c = pos.y - groundY;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const r = Math.sqrt(disc);
  const t1 = (-b + r) / (2 * a);
  const t2 = (-b - r) / (2 * a);
  const cands = [t1, t2].filter((t) => t > 0);
  return cands.length ? Math.min(...cands) : -1;
}

/**
 * Choose the launch velocity that puts a ballistic body over a target point.
 *
 * Solves for the flat-fire arc through `target` given a fixed speed, then
 * biases toward the lofted solution so threats come down steeply and read well
 * against the sky. Purely a visual/gameplay construction.
 */
export function ballisticLaunchVelocity(from, target, speed, loft = 1, out = new THREE.Vector3()) {
  _a.subVectors(target, from);
  const dy = _a.y;
  _a.y = 0;
  const dist = _a.length();
  if (dist < 1e-3) return out.set(0, speed, 0);
  _a.normalize();

  const s2 = speed * speed;
  const disc = s2 * s2 - G * (G * dist * dist + 2 * dy * s2);
  let angle;
  if (disc < 0) {
    // Unreachable at this speed: aim at the 45-degree max-range angle.
    angle = Math.PI / 4;
  } else {
    const r = Math.sqrt(disc);
    const low = Math.atan((s2 - r) / (G * dist));
    const high = Math.atan((s2 + r) / (G * dist));
    angle = low + (high - low) * clamp01(loft);
  }
  return out.set(_a.x * Math.cos(angle), Math.sin(angle), _a.z * Math.cos(angle))
    .multiplyScalar(speed);
}

/**
 * Simplified fictional intercept-point estimate.
 *
 * Fixed-point iteration on time-of-flight assuming the interceptor closes at an
 * effective average speed. Deliberately coarse: guidance has to work for its
 * living, which is what makes near-misses happen.
 *
 * The candidate time is capped by the target's own time to the ground, so the
 * estimate can never return a point below the terrain - which would otherwise
 * make a freshly launched round steer down into the dirt.
 *
 * @returns {{point: THREE.Vector3, time: number, feasible: boolean}}
 */
export function estimateInterceptPoint(launchPos, threatPos, threatVel, avgSpeed, opts = {}) {
  const { maxTime = 60, iterations = 5, bias = 1.0, minAlt = 120 } = opts;
  const point = new THREE.Vector3();
  const ttg = timeToGround(threatPos, threatVel);
  const tCap = Math.min(maxTime, ttg > 0 ? ttg * 0.98 : maxTime);
  const speed = Math.max(1, avgSpeed * bias);
  let t = clamp(launchPos.distanceTo(threatPos) / speed, 0, tCap);
  for (let i = 0; i < iterations; i++) {
    predictBallistic(threatPos, threatVel, t, point);
    const tNew = clamp(launchPos.distanceTo(point) / speed, 0, tCap);
    if (Math.abs(tNew - t) < 0.02) { t = tNew; break; }
    t = t * 0.35 + tNew * 0.65;
  }
  t = clamp(t, 0, tCap);
  predictBallistic(threatPos, threatVel, t, point);
  const reachable = t < tCap * 0.995;
  return { point, time: t, feasible: reachable && point.y > minAlt };
}

/**
 * Launch attitude for a battery engaging a given intercept point.
 *
 * A fixed launch pitch looks dramatic but leaves a fast round with a turn
 * radius measured in tens of kilometres pointing well away from where it needs
 * to go. Aiming the launcher at the solution (plus a loft margin, and clamped
 * to the launcher's fictional elevation limits) keeps the shot flyable and
 * gives the player visible feedback as the erector slews and elevates.
 *
 * @returns {{bearing: number, pitchDeg: number, elevationDeg: number}}
 */
export function computeLaunchAttitude(batteryPos, aimPoint, flight) {
  _a.subVectors(aimPoint, batteryPos);
  const horiz = Math.hypot(_a.x, _a.z);
  const bearing = Math.atan2(_a.x, -_a.z);
  const elevationDeg = Math.atan2(_a.y, Math.max(1, horiz)) * (180 / Math.PI);
  const range = flight.pitchRange ?? [45, flight.launchPitch];
  const margin = flight.launchLoftDeg ?? 12;
  const pitchDeg = clamp(elevationDeg + margin, range[0], range[1]);
  return { bearing, pitchDeg, elevationDeg };
}

/**
 * One guidance + integration step for an interceptor.
 *
 * Extracted as a pure function over a plain state object so the exact same code
 * runs inside the game entity and inside the offline tuning harness
 * (`tools/guidance-sim.mjs`). `m` is mutated in place.
 *
 * @param {object} m   { pos, vel, accelCmd, aimPoint, age, fuelLeft, flight,
 *                       guidanceBias, aimError, errorDecay }
 * @param {number} dt
 * @param {{pos: THREE.Vector3, vel: THREE.Vector3}|null} target
 * @returns {{phase: string, latCmd: number, thrust: number, burning: boolean,
 *            boosting: boolean, solutionTime: number, range: number}}
 */
export function interceptorFlightStep(m, dt, target) {
  const f = m.flight;
  m.age += dt;
  const rho = airDensity(m.pos.y);

  const boosting = m.age < f.boostTime;
  const sustaining = !boosting && m.age < f.boostTime + f.sustainTime;
  const guided = m.age >= f.pitchOver;
  const range = target ? m.pos.distanceTo(target.pos) : Infinity;

  let phase;
  if (!guided) phase = 'TIP-OFF';
  else if (boosting) phase = 'BOOST';
  else if (sustaining) phase = 'SUSTAIN';
  else if (range < f.terminalRange) phase = 'TERMINAL';
  else if (m.fuelLeft > 0) phase = 'MIDCOURSE';
  else phase = 'COASTING';

  let latCmd = 0;
  let solutionTime = 0;
  if (guided && target) {
    // A fixed design closing speed, not the instantaneous one: using the
    // current speed right after launch produces absurd times of flight.
    const avg = f.designSpeed ?? f.maxSpeed * 0.58;
    const sol = estimateInterceptPoint(m.pos, target.pos, target.vel, avg, {
      maxTime: f.fuelTime, iterations: 4, bias: m.guidanceBias ?? 1,
    });
    solutionTime = sol.time;
    m.aimPoint.copy(sol.point);

    // Loft bias: early in the flight, aim above the solution so the round
    // trades a long climb for a fast diving terminal leg. This is what gives
    // the high-altitude batteries their dramatic arcing contrails.
    //
    // The bias has to wash out well before closest approach - at these closing
    // speeds a round that is still aiming high in the last few seconds cannot
    // pull down in time and sails over the target.
    if (phase !== 'TERMINAL') {
      const fade = clamp01((sol.time - (f.loftFadeStart ?? 4)) / (f.loftFadeSpan ?? 5));
      if (fade > 0) {
        const d = m.pos.distanceTo(sol.point);
        m.aimPoint.y += Math.min(d * (f.loft ?? 0.2), f.loftCap ?? 6000) * fade;
      }
    }
    // Seeker refinement: the initial aim error washes out as the round closes.
    if (m.aimError) {
      const err = Math.exp(-(m.errorDecay ?? 0.5) * Math.max(0, 18 - sol.time));
      m.aimPoint.addScaledVector(m.aimError, err);
    }
    // Residual bias that never washes out. This is what makes an engagement
    // feel earned: a good shot still lands inside the fuse radius, a marginal
    // one can slip outside it, and neither outcome is a hidden dice roll.
    if (m.terminalBias) m.aimPoint.add(m.terminalBias);

    const gLimit = phase === 'TERMINAL' ? f.terminalG : f.lateralG;
    // Aerodynamic authority thins with altitude but never vanishes: these are
    // fictional rounds with divert control.
    const authority = clamp(0.55 + rho * 0.95, 0.55, 1.45);
    const maxLat = gLimit * G * authority;
    latCmd = steerLeadPursuit(
      m.pos, m.vel, m.aimPoint, maxLat, dt, m.accelCmd,
      phase === 'TERMINAL' ? 9 : 5.5,
    );
  } else {
    m.accelCmd.multiplyScalar(Math.exp(-dt * 2.2));
  }

  // Energy management: once the solution is close enough that the round will
  // coast to it, the sustainer is cut. Without this the long-range batteries
  // arrive with far too much energy and fly straight past the target.
  if (!boosting && target && solutionTime > 0 && solutionTime < (f.sustainCut ?? 5)) {
    m.sustainCut = true;
  }

  let thrust = 0;
  if (m.fuelLeft > 0) {
    if (boosting) thrust = f.boostAccel;
    else if (sustaining && !m.sustainCut) thrust = f.sustainAccel;
    if (thrust > 0) m.fuelLeft -= dt;
  }

  _d.copy(m.accelCmd);
  if (thrust > 0) {
    _c.copy(m.vel);
    if (_c.lengthSq() < 1) _c.copy(m.launchDir ?? _up);
    _d.addScaledVector(_c.normalize(), thrust);
  }
  // Express the speed cap as extra drag so it never looks like a hard clamp.
  let drag = f.coastDrag;
  const speed = m.vel.length();
  if (speed > f.maxSpeed) drag *= 1 + (speed / f.maxSpeed - 1) * 26;
  stepBallistic(m.pos, m.vel, dt, drag, _d);

  return { phase, latCmd, thrust, burning: thrust > 0, boosting, solutionTime, range };
}

/**
 * Limited-authority lead-pursuit steering.
 *
 * Builds a desired velocity direction toward `aimPoint`, converts the heading
 * error into a lateral acceleration command clamped by `maxLatAccel`, and
 * low-pass filters the command so the fins look commanded rather than jittery.
 *
 * @param {THREE.Vector3} pos
 * @param {THREE.Vector3} vel
 * @param {THREE.Vector3} aimPoint
 * @param {number} maxLatAccel   m/s^2 budget
 * @param {number} dt
 * @param {THREE.Vector3} accelOut  filtered command, persisted per missile
 * @param {number} responsiveness   1/e time constant of the command filter
 * @returns {number} commanded lateral acceleration magnitude (for effects)
 */
export function steerLeadPursuit(pos, vel, aimPoint, maxLatAccel, dt, accelOut, responsiveness = 5.5) {
  const speed = vel.length();
  if (speed < 1e-3) return 0;
  _a.copy(vel).divideScalar(speed);            // current heading
  _b.subVectors(aimPoint, pos);
  const dist = _b.length();
  if (dist < 1e-3) return 0;
  _b.divideScalar(dist);                        // desired heading

  // Lateral component of the desired heading relative to current heading.
  _c.copy(_b).addScaledVector(_a, -_a.dot(_b));
  const lateralErr = _c.length();
  if (lateralErr > 1e-5) _c.divideScalar(lateralErr);

  // Angle error drives the command; closing time sharpens it near the target.
  const angErr = Math.asin(clamp(lateralErr, -1, 1));
  const closeTime = Math.max(0.35, dist / Math.max(1, speed));
  // Proportional-navigation-flavoured gain, capped for stability.
  const cmdMag = clamp((2.6 * angErr * speed) / closeTime, 0, maxLatAccel);
  _d.copy(_c).multiplyScalar(cmdMag);

  // Filter toward the command so control surfaces move smoothly.
  const k = 1 - Math.exp(-responsiveness * dt);
  accelOut.lerp(_d, k);
  return accelOut.length();
}

/** Point an object's +Y axis along `dir` (missiles are modelled nose-up). */
export function orientAlong(obj, dir, roll = 0) {
  if (dir.lengthSq() < 1e-8) return;
  _a.copy(dir).normalize();
  _q.setFromUnitVectors(_up, _a);
  obj.quaternion.copy(_q);
  if (roll) obj.rotateY(roll);
}

/** Point an object's +Z axis along `dir` (used for cones and cameras). */
export function orientForward(obj, dir) {
  if (dir.lengthSq() < 1e-8) return;
  _a.copy(dir).normalize();
  _q.setFromUnitVectors(_fwd, _a);
  obj.quaternion.copy(_q);
}

/**
 * Closest approach between two bodies over a step, treating both as moving at
 * constant velocity. Prevents fast movers from tunnelling past each other.
 * @returns {{dist: number, t: number}} t in [0, dt]
 */
export function closestApproach(pA, vA, pB, vB, dt) {
  _a.subVectors(pA, pB);
  _b.subVectors(vA, vB);
  const vv = _b.lengthSq();
  let t = vv < 1e-8 ? 0 : -_a.dot(_b) / vv;
  t = clamp(t, 0, dt);
  _c.copy(_a).addScaledVector(_b, t);
  return { dist: _c.length(), t };
}

/** Speed of sound as a fictional altitude curve; used for audio delay + shock. */
export function speedOfSound(altitude) {
  return 340 - clamp(altitude, 0, 20000) * 0.0022;
}

/** Fictional aerodynamic heating proxy (0..1) for reentry glow. */
export function heatingFactor(speed, altitude) {
  const rho = airDensity(altitude);
  return clamp01((rho * speed * speed) / 900000);
}
