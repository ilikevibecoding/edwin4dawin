import * as THREE from 'three';
import { reg, OWNERS } from '../core/assets.js';
import { makeRng } from '../core/rng.js';

/**
 * Procedural character animation — Northstar Rescue.
 * Owner: Fable 4.
 *
 * No clip files exist in this project; every state is a closed-form pose
 * function (sine gaits, eased timelines, springs and additive layers) driven
 * from CharacterAnimator.update(). Bones are the plain Object3D rig from
 * models.js; every pose channel is a *delta from the bind pose* captured at
 * construction, so the same animator drives full-body characters (identity
 * bind) and the pre-posed first-person arms rig (kind 'player').
 *
 * ROTATION CONVENTIONS (character faces -Z):
 *   +rx on a limb swings it forward (Rx(+90°) maps "down" onto "-Z").
 *   Knee/elbow flexion is therefore -rx on shins, +rx on forearms.
 *   The aim pose pitches shoulder+elbow+wrist to exactly 90° total so the
 *   weaponMount (pre-rotated -90° about X in models.js) points its -Z along
 *   the look direction with +Y up.
 *
 * FOOT PLANTING — cadence is derived from the commanded speed so the feet
 * never skate at the authored speeds:
 *   strideLength(v) = clamp(0.62 + 0.16·v, 0.45, 1.30) m per step
 *   gaitCadence(v)  = v / strideLength(v)   steps/second
 *   gaitFrequency(v) = cadence/2            full cycles/second
 *   walk 1.4 m/s → 1.66 steps/s (0.83 Hz), run 3.6 m/s → 3.01 steps/s (1.5 Hz)
 *   thigh amplitude = asin((stride/2) / legLength) with legLength = 0.86 m,
 *   so ground-contact arc length matches distance travelled per step.
 */

export const ANIM_STATES = [
  'idle', 'breathing', 'walk', 'run', 'crouchIdle', 'crouchWalk', 'turnL', 'turnR',
  'aim', 'fire', 'reload', 'flinch', 'takeCover', 'investigate', 'search',
  'death1', 'death2', 'death3',
  'hostageIdle', 'fear', 'hostageCrouch', 'follow', 'stop', 'extract', 'surrender',
];

const LEG_LENGTH = 0.86;
const RELOAD_DURATION = 2.3;
const DEATH_DURATION = 1.15;
const DEATH_SETTLE = 0.45;

export function strideLength(speed) {
  return THREE.MathUtils.clamp(0.62 + 0.16 * speed, 0.45, 1.3);
}

/** Steps per second for a given ground speed (0 when stationary). */
export function gaitCadence(speed) {
  return speed <= 0.02 ? 0 : speed / strideLength(speed);
}

/** Full gait cycles (two steps) per second — the exposed cycle frequency. */
export function gaitFrequency(speed) {
  return gaitCadence(speed) / 2;
}

/* ------------------------------------------------------------------ */
/* Pose buffer                                                         */
/* ------------------------------------------------------------------ */

const CH = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'armLu', 'armLf', 'armLh', 'armRu', 'armRf', 'armRh',
  'legLt', 'legLs', 'legLf', 'legRt', 'legRs', 'legRf',
  'root',
];
const I = Object.fromEntries(CH.map((n, i) => [n, i]));
const NCH = CH.length;

class Pose {
  constructor() {
    this.r = new Float32Array(NCH * 3); // per-channel Euler deltas
    this.p = new Float32Array(6); // [hips xyz, root xyz] position deltas
  }

  zero() {
    this.r.fill(0);
    this.p.fill(0);
    return this;
  }

  copy(o) {
    this.r.set(o.r);
    this.p.set(o.p);
    return this;
  }

  static lerp(a, b, t, out) {
    for (let i = 0; i < a.r.length; i++) out.r[i] = a.r[i] + (b.r[i] - a.r[i]) * t;
    for (let i = 0; i < 6; i++) out.p[i] = a.p[i] + (b.p[i] - a.p[i]) * t;
    return out;
  }
}

const setR = (P_, n, x, y, z) => {
  const i = I[n] * 3;
  P_.r[i] = x;
  P_.r[i + 1] = y;
  P_.r[i + 2] = z;
};
const addR = (P_, n, x, y, z) => {
  const i = I[n] * 3;
  P_.r[i] += x;
  P_.r[i + 1] += y;
  P_.r[i + 2] += z;
};
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

/* ------------------------------------------------------------------ */
/* Shared pose fragments                                               */
/* ------------------------------------------------------------------ */

/** Two-leg sine gait with speed-matched cadence; amp 1 = full locomotion. */
function gaitLayer(P_, phase, speed, { crouch = 0, amp = 1 } = {}) {
  const stride = strideLength(speed);
  const A = Math.asin(THREE.MathUtils.clamp(stride * 0.5 / LEG_LENGTH, 0, 0.92)) * amp;
  const kneeAmp = THREE.MathUtils.clamp(0.42 + 0.34 * speed, 0.5, 1.75) * amp;
  const sL = Math.sin(phase);
  const sR = Math.sin(phase + Math.PI);
  // Swing weight: 1 while the leg travels forward, 0 in stance
  const swingL = Math.max(0, Math.sin(phase + Math.PI / 2));
  const swingR = Math.max(0, Math.sin(phase + Math.PI * 1.5));

  const thighL = A * sL + crouch * 0.9;
  const thighR = A * sR + crouch * 0.9;
  const shinL = -(0.1 + kneeAmp * swingL ** 1.4 + crouch * 1.6);
  const shinR = -(0.1 + kneeAmp * swingR ** 1.4 + crouch * 1.6);
  setR(P_, 'legLt', thighL, 0, 0);
  setR(P_, 'legRt', thighR, 0, 0);
  setR(P_, 'legLs', shinL, 0, 0);
  setR(P_, 'legRs', shinR, 0, 0);
  // Ankles: flatten during stance, toe-down in swing
  setR(P_, 'legLf', -(thighL + shinL) * (1 - swingL) * 0.85 + swingL * 0.3, 0, 0);
  setR(P_, 'legRf', -(thighR + shinR) * (1 - swingR) * 0.85 + swingR * 0.3, 0, 0);

  // Pelvis bob (two per cycle), lateral weight shift and counter-rotation
  const bob = (0.024 + 0.011 * speed) * amp;
  P_.p[1] += -bob * (0.5 - 0.5 * Math.cos(2 * phase)) - crouch * 0.42;
  P_.p[0] += 0.015 * amp * Math.sin(phase);
  addR(P_, 'hips', 0, 0.06 * amp * sL, 0.035 * amp * sL);
  addR(P_, 'chest', 0.045 * amp + crouch * 0.22, -0.09 * amp * sL, -0.03 * amp * sL);
  return { sL, sR, A };
}

/** Relaxed arm swing matching the gait (civilians, unarmed). */
function armSwingLayer(P_, phase, speed, amp = 1) {
  const A = THREE.MathUtils.clamp(0.14 + 0.15 * speed, 0.18, 0.8) * amp;
  const elbow = speed > 2.4 ? 1.05 : 0.28;
  setR(P_, 'armLu', A * Math.sin(phase + Math.PI), 0, 0.06);
  setR(P_, 'armRu', A * Math.sin(phase), 0, -0.06);
  setR(P_, 'armLf', elbow + 0.12 * Math.max(0, Math.sin(phase + Math.PI)), 0, 0);
  setR(P_, 'armRf', elbow + 0.12 * Math.max(0, Math.sin(phase)), 0, 0);
  setR(P_, 'armLh', 0.1, 0, 0);
  setR(P_, 'armRh', 0.1, 0, 0);
}

/**
 * Two-handed low-ready weapon hold: right hand on grip, left forward on the
 * handguard, muzzle down ~35°. Chain pitch sums keep the weapon in front of
 * the chest without clipping either arm.
 */
function weaponLowReady(P_, sway = 0) {
  setR(P_, 'armRu', 0.62 + sway * 0.04, -0.16, -0.12);
  setR(P_, 'armRf', 0.55, 0.12, 0);
  setR(P_, 'armRh', 0.0, 0, 0.1);
  setR(P_, 'armLu', 0.78 + sway * 0.04, 0.35, 0.22);
  setR(P_, 'armLf', 0.85, -0.28, 0);
  setR(P_, 'armLh', 0.05, 0, -0.15);
}

/**
 * Shouldered aim: shoulder+elbow+wrist pitch sums to π/2 (+ lookPitch), which
 * points weaponMount's -Z exactly along the look direction. lookYaw is fed
 * through spine+chest so the whole upper body tracks the target.
 */
function weaponAim(P_, lookPitch = 0, lookYaw = 0) {
  const yaw = THREE.MathUtils.clamp(lookYaw, -1.222, 1.222);
  addR(P_, 'spine', 0, yaw * 0.3, 0);
  addR(P_, 'chest', 0, yaw * 0.7, 0);
  const pitch = THREE.MathUtils.clamp(lookPitch, -0.785, 0.785);
  // Right arm: 1.02 + 0.48 + 0.0708 ≈ π/2 exactly; the small wrist yaw/roll
  // counter the cosmetic shoulder/elbow offsets so the mount tracks within ~1°
  setR(P_, 'armRu', 1.02 + pitch, -0.12, -0.08);
  setR(P_, 'armRf', 0.48, 0.1, 0);
  setR(P_, 'armRh', Math.PI / 2 - 1.02 - 0.48, 0, 0.002);
  // Left arm reaches across to the handguard, elbow dropped under the weapon
  setR(P_, 'armLu', 1.12 + pitch * 0.9, 0.42, 0.3);
  setR(P_, 'armLf', 0.66, -0.5, 0);
  setR(P_, 'armLh', -0.12, 0, -0.2);
  addR(P_, 'head', pitch * -0.15, 0, 0);
}

function breathing(P_, t, rate = 0.25, amp = 1) {
  const b = Math.sin(t * Math.PI * 2 * rate);
  addR(P_, 'chest', 0.02 * amp * b, 0, 0);
  addR(P_, 'spine', 0.008 * amp * b, 0, 0);
  addR(P_, 'armLu', 0, 0, 0.012 * amp * b);
  addR(P_, 'armRu', 0, 0, -0.012 * amp * b);
}

function tremble(P_, t, amp, seedOff) {
  const n1 = Math.sin(t * 23 + seedOff) + Math.sin(t * 31.7 + seedOff * 2.3);
  const n2 = Math.sin(t * 27.3 + seedOff * 1.7) + Math.sin(t * 34.1 + seedOff);
  addR(P_, 'armLu', 0, 0, 0.02 * amp * n1);
  addR(P_, 'armRu', 0, 0, -0.02 * amp * n2);
  addR(P_, 'armLf', 0.02 * amp * n2, 0, 0);
  addR(P_, 'armRf', 0.02 * amp * n1, 0, 0);
  addR(P_, 'head', 0.008 * amp * n1, 0.008 * amp * n2, 0);
}

function crouchBase(P_, lean = 0.24) {
  setR(P_, 'legLt', 1.12, 0, -0.06);
  setR(P_, 'legRt', 1.2, 0, 0.06);
  setR(P_, 'legLs', -1.95, 0, 0);
  setR(P_, 'legRs', -2.05, 0, 0);
  setR(P_, 'legLf', 0.83, 0, 0);
  setR(P_, 'legRf', 0.85, 0, 0);
  P_.p[1] = -0.42;
  setR(P_, 'spine', lean * 0.5, 0, 0);
  setR(P_, 'chest', lean, 0, 0);
  addR(P_, 'head', -lean * 0.7, 0, 0);
}

/* ------------------------------------------------------------------ */
/* State pose functions                                                */
/* Each receives (animator, ctx, P) and writes the full target pose.   */
/* ------------------------------------------------------------------ */

const S = {};

S.idle = (a, ctx, P_) => {
  if (ctx.crouched) return S.crouchIdle(a, ctx, P_);
  const t = a.stateTime;
  const w = Math.sin(t * 0.6 + a.seedOff); // slow weight shift
  addR(P_, 'hips', 0, 0, 0.02 * w);
  addR(P_, 'chest', 0.02, 0, -0.015 * w);
  P_.p[1] = -0.005 - 0.004 * Math.sin(t * 1.1 + a.seedOff);
  setR(P_, 'legLt', 0.02, 0.04, -0.03 * w);
  setR(P_, 'legRt', -0.01, -0.05, -0.03 * w);
  setR(P_, 'legLs', -0.06, 0, 0);
  setR(P_, 'legRs', -0.04, 0, 0);
  setR(P_, 'legLf', 0.04, 0, 0);
  setR(P_, 'legRf', 0.05, 0, 0);
  if (a.kind === 'hostile') weaponLowReady(P_, w);
  else {
    setR(P_, 'armLu', 0.04, 0, 0.05);
    setR(P_, 'armRu', 0.04, 0, -0.05);
    setR(P_, 'armLf', 0.22, 0, 0);
    setR(P_, 'armRf', 0.22, 0, 0);
  }
};

S.breathing = (a, ctx, P_) => {
  S.idle(a, ctx, P_);
  breathing(P_, a.stateTime, 0.3, 2.2);
};

S.walk = (a, ctx, P_) => {
  if (ctx.crouched) return S.crouchWalk(a, ctx, P_);
  const speed = ctx.speed ?? 1.4;
  gaitLayer(P_, a.phase, speed);
  if (a.kind === 'hostile') weaponLowReady(P_, Math.sin(a.phase) * 0.5);
  else armSwingLayer(P_, a.phase, speed);
};

S.run = (a, ctx, P_) => {
  const speed = ctx.speed ?? 3.6;
  gaitLayer(P_, a.phase, speed);
  addR(P_, 'chest', 0.14, 0, 0); // forward lean into the sprint
  addR(P_, 'spine', 0.06, 0, 0);
  if (a.kind === 'hostile') {
    // Compact combat carry while sprinting
    weaponLowReady(P_, Math.sin(a.phase));
    addR(P_, 'armRu', 0.25, 0, 0);
    addR(P_, 'armLu', 0.2, 0, 0);
    addR(P_, 'armLf', 0.25, 0, 0);
  } else armSwingLayer(P_, a.phase, speed);
};

S.crouchIdle = (a, ctx, P_) => {
  crouchBase(P_);
  P_.p[1] += -0.004 * Math.sin(a.stateTime * 1.3 + a.seedOff);
  if (a.kind === 'hostile') weaponLowReady(P_);
  else {
    setR(P_, 'armLu', 0.35, 0, 0.15);
    setR(P_, 'armRu', 0.35, 0, -0.15);
    setR(P_, 'armLf', 0.9, 0, 0);
    setR(P_, 'armRf', 0.9, 0, 0);
  }
};

S.crouchWalk = (a, ctx, P_) => {
  const speed = ctx.speed ?? 0.9;
  gaitLayer(P_, a.phase, Math.max(speed, 0.7), { crouch: 0.32, amp: 0.75 });
  addR(P_, 'chest', 0.18, 0, 0);
  if (a.kind === 'hostile') weaponLowReady(P_, Math.sin(a.phase) * 0.4);
  else armSwingLayer(P_, a.phase, speed, 0.5);
};

const turnPose = (a, ctx, P_, dir) => {
  S.idle(a, { ...ctx, crouched: false }, P_);
  const t = a.stateTime;
  const shuffle = Math.sin(t * 9);
  addR(P_, 'hips', 0, dir * 0.18, dir * 0.02);
  addR(P_, 'chest', 0, dir * 0.14, 0);
  addR(P_, 'head', 0, dir * 0.3, 0); // head leads the turn
  // Feet pick up alternately to sell the pivot
  addR(P_, 'legLt', Math.max(0, shuffle) * 0.14, dir * 0.1, 0);
  addR(P_, 'legRt', Math.max(0, -shuffle) * 0.14, dir * 0.1, 0);
  P_.p[1] += -0.01 * Math.abs(shuffle);
};
S.turnL = (a, ctx, P_) => turnPose(a, ctx, P_, 1);
S.turnR = (a, ctx, P_) => turnPose(a, ctx, P_, -1);

S.aim = (a, ctx, P_) => {
  if (ctx.crouched) crouchBase(P_, 0.14);
  else {
    setR(P_, 'legLt', 0.04, 0.1, -0.04);
    setR(P_, 'legRt', -0.08, -0.12, 0.04); // bladed stance
    setR(P_, 'legLs', -0.1, 0, 0);
    setR(P_, 'legRs', -0.14, 0, 0);
    setR(P_, 'legLf', 0.06, 0, 0);
    setR(P_, 'legRf', 0.1, 0, 0);
    P_.p[1] = -0.02;
  }
  weaponAim(P_, ctx.lookPitch ?? 0, ctx.lookYaw ?? 0);
  breathing(P_, a.stateTime, 0.32, 0.5);
};

S.fire = (a, ctx, P_) => S.aim(a, ctx, P_); // pose base; the kick itself is the additive layer

S.reload = (a, ctx, P_) => {
  // Weapon tucked to the chest, muzzle 25° down, eyes on the well
  const base = 0.78;
  setR(P_, 'armRu', base, -0.1, -0.08);
  setR(P_, 'armRf', 0.52, 0.1, 0);
  setR(P_, 'armRh', 0.1, 0, 0.05);
  setR(P_, 'legLt', 0.04, 0.1, -0.04);
  setR(P_, 'legRt', -0.08, -0.12, 0.04);
  setR(P_, 'legLs', -0.1, 0, 0);
  setR(P_, 'legRs', -0.14, 0, 0);
  setR(P_, 'legLf', 0.06, 0, 0);
  setR(P_, 'legRf', 0.1, 0, 0);
  addR(P_, 'chest', 0.1, 0, 0);
  addR(P_, 'head', 0.32, 0, 0); // look down at the weapon
  // Left-hand timeline: handguard → mag well → strip mag down → pouch →
  // insert → bolt slap → back to the handguard.
  const u = clamp01(a.stateTime / RELOAD_DURATION);
  const key = (t0, t1) => smooth(clamp01((u - t0) / (t1 - t0)));
  // Keyframes as [armLu.rx, armLu.ry, armLf.rx, armLf.ry]
  const K = [
    [0.95, 0.4, 0.75, -0.45], // on the handguard
    [0.8, 0.12, 0.95, -0.1], // hand at the magazine well
    [0.42, 0.05, 0.75, 0.05], // mag stripped, swept down
    [0.55, -0.2, 1.15, 0.25], // fresh mag from the chest pouch
    [0.8, 0.12, 0.98, -0.1], // seat the mag
    [1.0, 0.05, 0.85, -0.2], // bolt slap
    [0.95, 0.4, 0.75, -0.45], // back on the handguard
  ];
  const times = [0, 0.16, 0.34, 0.52, 0.68, 0.84, 1.0];
  let arm = K[K.length - 1];
  for (let i = 0; i < times.length - 1; i++) {
    if (u <= times[i + 1]) {
      const k = key(times[i], times[i + 1]);
      arm = K[i].map((v, j) => v + (K[i + 1][j] - v) * k);
      break;
    }
  }
  setR(P_, 'armLu', arm[0], arm[1], 0.15);
  setR(P_, 'armLf', arm[2], arm[3], 0);
  setR(P_, 'armLh', 0.2, 0, -0.1);
  // Seating impulse
  const seat = Math.max(0, 1 - Math.abs(u - 0.7) / 0.045);
  addR(P_, 'chest', 0.03 * seat, 0, 0);
};

S.flinch = (a, ctx, P_) => {
  // Standalone flinch state (also available as an additive overlay)
  S.idle(a, ctx, P_);
};

S.takeCover = (a, ctx, P_) => {
  crouchBase(P_, 0.34);
  P_.p[1] -= 0.05;
  addR(P_, 'chest', 0, 0.18, 0.1); // shoulder tucked toward the cover
  weaponLowReady(P_);
  addR(P_, 'armRu', 0.35, 0, 0); // weapon pulled high and tight
  addR(P_, 'armLu', 0.3, 0, 0);
  addR(P_, 'head', -0.1, 0.25, 0);
};

S.investigate = (a, ctx, P_) => {
  const speed = ctx.speed ?? 0.9;
  gaitLayer(P_, a.phase, Math.max(speed, 0.6), { amp: 0.8 });
  weaponLowReady(P_, Math.sin(a.phase) * 0.3);
  addR(P_, 'armRu', -0.2, 0, 0); // muzzle dipped further
  addR(P_, 'armLu', -0.15, 0, 0);
  addR(P_, 'chest', 0.06, 0, 0);
  addR(P_, 'head', 0.06, Math.sin(a.stateTime * 1.9 + a.seedOff) * 0.55, 0);
};

S.search = (a, ctx, P_) => {
  S.idle(a, { ...ctx, crouched: false }, P_);
  const sweep = Math.sin(a.stateTime * 1.2 + a.seedOff);
  addR(P_, 'chest', 0, sweep * 0.28, 0);
  addR(P_, 'head', 0.05, sweep * 0.5, 0);
  addR(P_, 'hips', 0, sweep * 0.08, 0);
};

/* ---- deaths: eased fall, then a stable final pose, then freeze ---- */

const deathCurve = (t) => {
  const u = clamp01(t / DEATH_DURATION);
  const fall = u < 0.85 ? smooth(u / 0.85) : 1;
  // Small settle bounce after impact
  const b = u > 0.85 ? Math.sin((u - 0.85) / 0.15 * Math.PI) * (1 - u) * 0.3 : 0;
  return { fall, bounce: b };
};

S.death1 = (a, ctx, P_) => {
  // Shot front-on: knees buckle, falls flat on the back, arms out
  const { fall, bounce } = deathCurve(a.stateTime);
  const buckle = Math.min(1, fall * 2.2);
  setR(P_, 'legLt', 0.5 * buckle - 0.35 * fall, 0.12 * fall, 0);
  setR(P_, 'legRt', 0.65 * buckle - 0.45 * fall, -0.15 * fall, 0);
  setR(P_, 'legLs', -1.1 * buckle + 0.9 * fall, 0, 0);
  setR(P_, 'legRs', -1.3 * buckle + 1.05 * fall, 0, 0);
  setR(P_, 'legLf', 0.4 * fall, 0, 0);
  setR(P_, 'legRf', 0.45 * fall, 0, 0);
  setR(P_, 'root', 1.5 * fall + bounce * 0.1, 0, 0.06 * fall);
  P_.p[1] = -0.30 * buckle * (1 - fall);
  P_.p[4] = 0.12 * fall; // root rises: body thickness on the floor
  setR(P_, 'chest', -0.15 * fall, 0, 0);
  setR(P_, 'head', -0.35 * fall, 0.2 * fall, 0);
  setR(P_, 'armLu', 0.35 * fall, 0, 1.15 * fall);
  setR(P_, 'armRu', 0.25 * fall, 0, -0.85 * fall);
  setR(P_, 'armLf', 0.35 * fall, 0, 0);
  setR(P_, 'armRf', 0.5 * fall, 0, 0);
};

S.death2 = (a, ctx, P_) => {
  // Crumples forward over the knees, face down
  const { fall, bounce } = deathCurve(a.stateTime);
  const fold = Math.min(1, fall * 1.8);
  setR(P_, 'legLt', 1.15 * fold, 0, -0.08 * fall);
  setR(P_, 'legRt', 1.05 * fold, 0, 0.1 * fall);
  setR(P_, 'legLs', -2.2 * fold, 0, 0);
  setR(P_, 'legRs', -2.1 * fold, 0, 0);
  setR(P_, 'legLf', 0.9 * fold, 0, 0);
  setR(P_, 'legRf', 0.85 * fold, 0, 0);
  setR(P_, 'root', -1.45 * fall - bounce * 0.1, 0.1 * fall, 0);
  P_.p[1] = -0.5 * fold;
  P_.p[4] = 0.34 * fall;
  P_.p[5] = -0.1 * fall;
  setR(P_, 'spine', 0.35 * fall, 0, 0);
  setR(P_, 'chest', 0.4 * fall, 0.1 * fall, 0);
  setR(P_, 'head', 0.5 * fall, -0.25 * fall, 0);
  setR(P_, 'armLu', 1.3 * fall, 0, 0.5 * fall); // arms thrown forward under the body
  setR(P_, 'armRu', 1.45 * fall, 0, -0.4 * fall);
  setR(P_, 'armLf', 0.4 * fall, 0, 0);
  setR(P_, 'armRf', 0.3 * fall, 0, 0);
};

S.death3 = (a, ctx, P_) => {
  // Spun by the hit, collapses onto the left side
  const { fall, bounce } = deathCurve(a.stateTime);
  setR(P_, 'root', 0.12 * fall, 0.85 * fall, 1.45 * fall + bounce * 0.1);
  P_.p[1] = -0.18 * Math.min(1, fall * 2);
  P_.p[4] = 0.15 * fall;
  setR(P_, 'legLt', 0.75 * fall, 0.1 * fall, 0);
  setR(P_, 'legRt', 0.25 * fall, -0.1 * fall, 0);
  setR(P_, 'legLs', -0.9 * fall, 0, 0);
  setR(P_, 'legRs', -0.45 * fall, 0, 0);
  setR(P_, 'legLf', 0.3 * fall, 0, 0);
  setR(P_, 'legRf', 0.3 * fall, 0, 0);
  setR(P_, 'spine', 0.2 * fall, -0.3 * fall, 0);
  setR(P_, 'chest', 0.25 * fall, -0.35 * fall, 0);
  setR(P_, 'head', 0.2 * fall, -0.4 * fall, 0.25 * fall);
  setR(P_, 'armLu', 0.9 * fall, 0, 0.9 * fall); // left arm pinned under
  setR(P_, 'armLf', 0.7 * fall, 0, 0);
  setR(P_, 'armRu', 0.5 * fall, 0, -0.55 * fall); // right arm draped over
  setR(P_, 'armRf', 0.6 * fall, 0, 0);
};

/* ---- hostage states ---- */

S.hostageIdle = (a, ctx, P_) => {
  // Subdued stand: shoulders in, hands clasped in front, head low
  setR(P_, 'legLt', 0.03, 0.05, -0.02);
  setR(P_, 'legRt', 0.03, -0.05, 0.02);
  setR(P_, 'legLs', -0.08, 0, 0);
  setR(P_, 'legRs', -0.08, 0, 0);
  setR(P_, 'legLf', 0.05, 0, 0);
  setR(P_, 'legRf', 0.05, 0, 0);
  P_.p[1] = -0.015;
  setR(P_, 'spine', 0.06, 0, 0);
  setR(P_, 'chest', 0.09, 0, 0);
  setR(P_, 'head', 0.18, Math.sin(a.stateTime * 0.5 + a.seedOff) * 0.1, 0);
  setR(P_, 'armLu', 0.32, 0.28, 0.12);
  setR(P_, 'armRu', 0.32, -0.28, -0.12);
  setR(P_, 'armLf', 0.95, 0, 0);
  setR(P_, 'armRf', 0.95, 0, 0);
  setR(P_, 'armLh', 0.2, 0, -0.2);
  setR(P_, 'armRh', 0.2, 0, 0.2);
  breathing(P_, a.stateTime, 0.35, 1.4);
};

S.fear = (a, ctx, P_) => {
  // Hands up beside the head, shoulders raised, trembling
  setR(P_, 'legLt', 0.08, 0.06, -0.03);
  setR(P_, 'legRt', 0.1, -0.06, 0.03);
  setR(P_, 'legLs', -0.22, 0, 0);
  setR(P_, 'legRs', -0.25, 0, 0);
  setR(P_, 'legLf', 0.13, 0, 0);
  setR(P_, 'legRf', 0.14, 0, 0);
  P_.p[1] = -0.05;
  setR(P_, 'spine', 0.1, 0, 0);
  setR(P_, 'chest', 0.16, 0, 0); // raised, hunched shoulders
  setR(P_, 'head', 0.22, 0, 0);
  setR(P_, 'armLu', 2.45, 0, 0.5);
  setR(P_, 'armRu', 2.45, 0, -0.5);
  setR(P_, 'armLf', 0.55, 0, 0);
  setR(P_, 'armRf', 0.55, 0, 0);
  setR(P_, 'armLh', 0.15, 0, -0.1);
  setR(P_, 'armRh', 0.15, 0, 0.1);
  breathing(P_, a.stateTime, 0.7, 2.4); // rapid, shallow
  tremble(P_, a.stateTime, 1.0, a.seedOff);
};

S.hostageCrouch = (a, ctx, P_) => {
  // Crouched small, head down, hands laced behind the head
  crouchBase(P_, 0.42);
  P_.p[1] -= 0.03;
  setR(P_, 'head', 0.55, 0, 0);
  setR(P_, 'armLu', 2.6, 0.55, 0.55);
  setR(P_, 'armRu', 2.6, -0.55, -0.55);
  setR(P_, 'armLf', 1.5, 0, 0);
  setR(P_, 'armRf', 1.5, 0, 0);
  breathing(P_, a.stateTime, 0.55, 1.6);
  tremble(P_, a.stateTime, 0.5, a.seedOff);
};

S.follow = (a, ctx, P_) => {
  // Hurried crouch-walk, checking behind every few seconds
  const speed = ctx.speed ?? 1.6;
  gaitLayer(P_, a.phase, Math.max(speed, 1.0), { crouch: 0.22, amp: 0.85 });
  addR(P_, 'chest', 0.2, 0, 0);
  armSwingLayer(P_, a.phase, speed, 0.6);
  addR(P_, 'armLu', 0.25, 0, 0.15); // half-raised, protective
  addR(P_, 'armRu', 0.25, 0, -0.15);
  const lookBack = Math.max(0, Math.sin(a.stateTime * 1.9 + a.seedOff)) ** 5;
  addR(P_, 'head', 0.05, lookBack * 1.05, 0);
  addR(P_, 'chest', 0, lookBack * 0.22, 0);
};

S.stop = (a, ctx, P_) => {
  crouchBase(P_, 0.3);
  setR(P_, 'armLu', 0.5, 0.2, 0.25);
  setR(P_, 'armRu', 0.5, -0.2, -0.25);
  setR(P_, 'armLf', 1.1, 0, 0);
  setR(P_, 'armRf', 1.1, 0, 0);
  addR(P_, 'head', -0.1, Math.sin(a.stateTime * 0.9 + a.seedOff) * 0.2, 0);
  breathing(P_, a.stateTime, 0.5, 1.6);
};

S.extract = (a, ctx, P_) => {
  // Relieved jog: upright, head up, arms pumping freely
  const speed = ctx.speed ?? 2.6;
  gaitLayer(P_, a.phase, speed);
  addR(P_, 'chest', 0.05, 0, 0);
  armSwingLayer(P_, a.phase, speed);
  addR(P_, 'head', -0.12, 0, 0); // chin up
  P_.p[1] += 0.005 * Math.sin(2 * a.phase);
};

S.surrender = (a, ctx, P_) => {
  // Standing, hands high overhead
  setR(P_, 'legLt', 0.02, 0.04, -0.02);
  setR(P_, 'legRt', 0.02, -0.04, 0.02);
  setR(P_, 'legLs', -0.06, 0, 0);
  setR(P_, 'legRs', -0.06, 0, 0);
  setR(P_, 'legLf', 0.04, 0, 0);
  setR(P_, 'legRf', 0.04, 0, 0);
  setR(P_, 'spine', 0.03, 0, 0);
  setR(P_, 'chest', 0.05, 0, 0);
  setR(P_, 'head', 0.12, 0, 0);
  setR(P_, 'armLu', 2.9, 0, 0.28);
  setR(P_, 'armRu', 2.9, 0, -0.28);
  setR(P_, 'armLf', 0.25, 0, 0);
  setR(P_, 'armRf', 0.25, 0, 0);
  setR(P_, 'armLh', 0.1, 0, 0);
  setR(P_, 'armRh', 0.1, 0, 0);
  breathing(P_, a.stateTime, 0.45, 1.8);
  tremble(P_, a.stateTime, 0.35, a.seedOff);
};

/* ---- first-person player layer (kind 'player') ---- */

function playerPose(a, ctx, P_) {
  const t = a.stateTime;
  const speed = ctx.speed ?? 0;
  const aiming = !!ctx.aiming || a.state === 'aim';
  const bobScale = (aiming ? 0.3 : 1) * (ctx.crouched ? 0.7 : 1);
  // Weapon bob: figure-eight, cadence-locked so it reads as footsteps
  const bobX = 0.009 * bobScale * Math.sin(a.phase) * Math.min(1, speed / 1.4);
  const bobY = 0.007 * bobScale * (0.5 - 0.5 * Math.cos(2 * a.phase)) * Math.min(1, speed / 1.4);
  // Idle breathing sway
  const swayX = 0.0025 * bobScale * Math.sin(t * 1.4 + a.seedOff);
  const swayY = 0.002 * bobScale * Math.sin(t * 2.1 + a.seedOff * 1.3);
  P_.p[0] = bobX + swayX;
  P_.p[1] = -bobY + swayY;
  P_.p[2] = 0;
  if (aiming) {
    // Bring the mount to the eye line / screen centre
    P_.p[0] += -0.075;
    P_.p[1] += 0.055;
    P_.p[2] += 0.03;
    addR(P_, 'hips', 0.012, 0, 0);
  }
  if (a.state === 'run' || speed > 2.4) {
    // Weapon canted across the chest during sprints
    addR(P_, 'hips', 0.12, 0.16, 0.1);
    P_.p[1] += -0.025;
    P_.p[2] += 0.05;
  }
  if (a.state === 'reload') {
    const u = clamp01(a.stateTime / RELOAD_DURATION);
    addR(P_, 'hips', 0.16 * Math.sin(u * Math.PI), 0.05, 0.06 * Math.sin(u * Math.PI));
    P_.p[1] += -0.03 * Math.sin(u * Math.PI);
    // Left hand rides to the mag well and back
    const dip = Math.sin(clamp01(u / 0.5) * Math.PI);
    addR(P_, 'armLu', 0.5 * dip, 0.25 * dip, 0);
    addR(P_, 'armLf', -0.45 * dip, 0.3 * dip, 0);
    const slap = Math.max(0, 1 - Math.abs(u - 0.86) / 0.1);
    addR(P_, 'armLu', -0.25 * slap, 0, 0);
  }
}

/* ------------------------------------------------------------------ */
/* Animator                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_SPEED = { walk: 1.4, run: 3.6, crouchWalk: 0.9, follow: 1.6, extract: 2.6, investigate: 0.9 };
const BLEND_TIME = {
  default: 0.22, fire: 0.05, flinch: 0.06, death1: 0.06, death2: 0.06, death3: 0.06,
  aim: 0.16, reload: 0.14, fear: 0.3, surrender: 0.35,
};
const DEATH_STATES = new Set(['death1', 'death2', 'death3']);

export class CharacterAnimator {
  /**
   * @param {object} rig  rig from models.js (full-body or operator arms)
   * @param {object} o    { kind: 'hostile'|'hostage'|'player', seed }
   */
  constructor(rig, { kind = 'hostile', seed = 1 } = {}) {
    this.rig = rig;
    this.kind = kind;
    this.rng = makeRng((seed >>> 0) || 1);
    this.seedOff = this.rng() * 20;

    this.bones = [
      rig.hips, rig.spine, rig.chest, rig.neck, rig.head,
      rig.armL?.upper, rig.armL?.fore, rig.armL?.hand,
      rig.armR?.upper, rig.armR?.fore, rig.armR?.hand,
      rig.legL?.thigh, rig.legL?.shin, rig.legL?.foot,
      rig.legR?.thigh, rig.legR?.shin, rig.legR?.foot,
      rig.root,
    ];
    // Bind snapshot — every pose is a delta on top of this
    this.bindR = new Float32Array(NCH * 3);
    for (let i = 0; i < NCH; i++) {
      const b = this.bones[i];
      if (!b) continue;
      this.bindR[i * 3] = b.rotation.x;
      this.bindR[i * 3 + 1] = b.rotation.y;
      this.bindR[i * 3 + 2] = b.rotation.z;
    }
    this.bindHips = rig.hips ? rig.hips.position.clone() : new THREE.Vector3();
    this.bindRoot = rig.root ? rig.root.position.clone() : new THREE.Vector3();

    this.state = kind === 'hostage' ? 'hostageIdle' : 'idle';
    this.stateTime = this.rng() * 10; // desynchronise crowds
    this.phase = this.rng() * Math.PI * 2;
    this.blendT = 1;
    this.blendDur = BLEND_TIME.default;
    this.fireT = 10;
    this.flinchT = 10;
    this.flinchDir = 1;
    this.frozen = false;

    this.prevPose = new Pose();
    this.workPose = new Pose();
    this.outPose = new Pose();
    this.appliedPose = new Pose();
  }

  get current() {
    return this.state;
  }

  /** Non-interruptible: reload in progress, or any death (dying or settled). */
  get busy() {
    if (DEATH_STATES.has(this.state)) return true;
    if (this.state === 'reload' && this.stateTime < RELOAD_DURATION) return true;
    return false;
  }

  /**
   * Switch state. Idempotent when already in `state`. `fire` and `flinch` are
   * additive overlays: they trigger their kick and leave the base state alone.
   * While busy, only death states may take over. opts: { force }.
   */
  play(state, opts = {}) {
    if (this.frozen) return;
    if (state === 'fire') {
      this.fireT = 0;
      return;
    }
    if (state === 'flinch') {
      this.flinchT = 0;
      this.flinchDir = this.rng() < 0.5 ? -1 : 1;
      return;
    }
    if (state === this.state) return;
    if (this.busy && !DEATH_STATES.has(state) && !opts.force) return;
    if (!S[state] && !(this.kind === 'player')) {
      console.warn(`[animation] unknown state "${state}"`);
      return;
    }
    this.prevPose.copy(this.appliedPose);
    this.blendT = 0;
    this.blendDur = BLEND_TIME[state] ?? BLEND_TIME.default;
    this.state = state;
    this.stateTime = 0;
  }

  /**
   * dt seconds; ctx = { speed, aiming, lookYaw, lookPitch, crouched }.
   * lookYaw/lookPitch are radians relative to the character's facing,
   * clamped to ±70° / ±45° and layered onto the body pose.
   */
  update(dt, ctx = {}) {
    if (this.frozen || dt <= 0) return;
    this.stateTime += dt;
    this.fireT += dt;
    this.flinchT += dt;
    this.blendT += dt;

    const speed = ctx.speed ?? DEFAULT_SPEED[this.state] ?? 0;
    this.phase += dt * Math.PI * gaitCadence(speed);

    const P_ = this.workPose.zero();
    if (this.kind === 'player') {
      playerPose(this, ctx, P_);
    } else {
      (S[this.state] ?? S.idle)(this, ctx, P_);

      /* Aim layer while moving: ctx.aiming overrides the arm channels */
      if (ctx.aiming && !DEATH_STATES.has(this.state) && this.state !== 'reload' && this.state !== 'aim' && this.kind === 'hostile') {
        weaponAim(P_, ctx.lookPitch ?? 0, ctx.lookYaw ?? 0);
      }

      /* Independent head look (±70° yaw, ±45° pitch), neck 40% / head 60% */
      if (!DEATH_STATES.has(this.state)) {
        const aimBody = this.state === 'aim' || ctx.aiming;
        const yaw = THREE.MathUtils.clamp(ctx.lookYaw ?? 0, -1.222, 1.222) * (aimBody ? 0.2 : 1);
        const pitch = THREE.MathUtils.clamp(ctx.lookPitch ?? 0, -0.785, 0.785) * (aimBody ? 0.35 : 1);
        addR(P_, 'neck', -pitch * 0.4, yaw * 0.4, 0);
        addR(P_, 'head', -pitch * 0.6, yaw * 0.6, 0);
        breathing(P_, this.stateTime + this.seedOff, 0.25, 0.6);
      }
    }

    /* Fire: short additive kick, never cancels the base state */
    if (this.fireT < 0.14) {
      const k = (1 - this.fireT / 0.14) ** 2;
      if (this.kind === 'player') {
        P_.p[1] += 0.008 * k;
        P_.p[2] += 0.028 * k;
        addR(P_, 'hips', 0.045 * k, 0, 0.008 * k);
      } else {
        addR(P_, 'armRu', 0.07 * k, 0, 0);
        addR(P_, 'armLu', 0.05 * k, 0, 0);
        addR(P_, 'chest', -0.035 * k, 0, 0);
        addR(P_, 'head', -0.02 * k, 0, 0);
      }
    }
    /* Flinch: additive jerk on hit */
    if (this.flinchT < 0.32) {
      const k = Math.sin(clamp01(this.flinchT / 0.32) * Math.PI);
      addR(P_, 'chest', 0.16 * k, 0.08 * k * this.flinchDir, 0);
      addR(P_, 'spine', 0.07 * k, 0, 0);
      addR(P_, 'head', 0.1 * k, 0.14 * k * this.flinchDir, 0);
      P_.p[1] += -0.02 * k;
    }

    /* Blend from the snapshot taken at the last play() */
    const w = this.blendDur > 0 ? smooth(clamp01(this.blendT / this.blendDur)) : 1;
    const out = w >= 1 ? P_ : Pose.lerp(this.prevPose, P_, w, this.outPose);
    this.appliedPose.copy(out);
    this.#apply(out);

    /* Deaths settle into a stable final pose, then stop updating entirely */
    if (DEATH_STATES.has(this.state) && this.stateTime > DEATH_DURATION + DEATH_SETTLE) {
      this.frozen = true;
    }
  }

  #apply(P_) {
    for (let i = 0; i < NCH; i++) {
      const b = this.bones[i];
      if (!b) continue;
      b.rotation.set(
        this.bindR[i * 3] + P_.r[i * 3],
        this.bindR[i * 3 + 1] + P_.r[i * 3 + 1],
        this.bindR[i * 3 + 2] + P_.r[i * 3 + 2],
      );
    }
    if (this.rig.hips) {
      this.rig.hips.position.set(
        this.bindHips.x + P_.p[0],
        this.bindHips.y + P_.p[1],
        this.bindHips.z + P_.p[2],
      );
    }
    if (this.rig.root) {
      this.rig.root.position.set(
        this.bindRoot.x + P_.p[3],
        this.bindRoot.y + P_.p[4],
        this.bindRoot.z + P_.p[5],
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Manifest registration                                               */
/* ------------------------------------------------------------------ */

let registered = false;
export function registerAnimationManifest() {
  if (registered) return;
  registered = true;
  const base = {
    category: 'character',
    owner: OWNERS.FABLE4,
    files: ['src/characters/animation.js'],
    dimensions: 'n/a — procedural pose data, radians/metres',
    pivot: 'deltas applied over the bind pose captured at CharacterAnimator construction',
    materials: 'n/a',
    textures: 'n/a',
    collision: 'hitboxes follow the animated bones automatically (AABB from bone.matrixWorld)',
    lod: 'poses evaluate identically at every LOD; per-bone LODs keep animating past 18 m',
    status: 'built',
  };
  reg({
    ...base,
    id: 'anim.locomotion',
    name: 'Locomotion state family (all characters)',
    usedIn: 'hostiles, hostages, operator body',
    animations: ['idle', 'breathing', 'walk', 'run', 'crouchIdle', 'crouchWalk', 'turnL', 'turnR'],
    acceptance: `Cadence = speed / stride so feet plant without skating at the authored speeds (walk 1.4 m/s → ${gaitCadence(1.4).toFixed(2)} steps/s, run 3.6 m/s → ${gaitCadence(3.6).toFixed(2)} steps/s); pelvis bob, counter-rotation and arm swing phase-locked to the legs; head look layered independently, clamped ±70° yaw / ±45° pitch.`,
  });
  reg({
    ...base,
    id: 'anim.combat',
    name: 'Hostile combat state family',
    usedIn: 'hostile AI combat behaviours',
    animations: ['aim', 'fire', 'reload', 'flinch', 'takeCover', 'investigate', 'search'],
    acceptance: 'Aim pitches shoulder+elbow+wrist to exactly 90°+lookPitch so weaponMount -Z tracks the look direction (right hand on grip, left on handguard, no clipping of face/chest/arms); fire is a ≤0.14 s additive kick that never cancels the base state; reload is a 2.3 s non-interruptible left-hand timeline to the mag well, pouch and bolt; busy=true during reload/death.',
  });
  reg({
    ...base,
    id: 'anim.deaths',
    name: 'Death state family',
    usedIn: 'hostiles and hostages on lethal damage',
    animations: ['death1 (backward collapse)', 'death2 (forward crumple)', 'death3 (side twist)'],
    acceptance: 'Three visually distinct eased falls with a small impact settle; each ends in a stable pose lying within body thickness of the floor, then the animator freezes (no further bone updates).',
  });
  reg({
    ...base,
    id: 'anim.hostage',
    name: 'Hostage behaviour state family',
    usedIn: 'hostage AI (fear, escort, extraction)',
    animations: ['hostageIdle', 'fear', 'hostageCrouch', 'follow', 'stop', 'extract', 'surrender'],
    acceptance: 'fear = hands up beside the head, raised shoulders, multi-frequency tremble; hostageCrouch = crouched, head down, hands laced behind the head; follow = hurried crouch-walk with periodic look-backs; extract = relieved upright jog; surrender = hands high overhead with faint tremble.',
  });
  reg({
    ...base,
    id: 'anim.playerArms',
    name: 'First-person arms layer',
    usedIn: 'operator arms overlay (CharacterAnimator kind "player")',
    animations: ['idle sway', 'walk/run bob (cadence-locked)', 'sprint cant', 'aim centring', 'fire recoil', 'reload'],
    acceptance: 'Bob frequency locked to gaitCadence(speed); aiming damps sway 70% and centres weaponMount; recoil is additive and decays in 0.14 s; deltas ride on the authored bind pose so fingers stay wrapped on the grip.',
  });
}
