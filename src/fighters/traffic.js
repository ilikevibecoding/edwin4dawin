// Fighter traffic scheduler and state machine. Every fighter's pose is a pure function of (state, state entry
// time, slot, launch sequence) evaluated against the shared scheduler clock, so peers can stay in step by
// exchanging the compact snapshot() — nothing depends on frame timing or accumulated integration.
//
// States: racked → lowering → launching → patrol → returning → ascending → docking → racked
//         maintenance (cradle fighters, never launch)
// Events: 'launch' (release from the clamp) | 'field_pass' | 'depart' (joins the patrol) | 'recall' |
//         'return' (patrol complete, homing) | 'dock' (locked in the rack)
import * as THREE from "three";
import { buildPatrolCurve, PATROL_START, PATROL_END } from "./patrol.js";

export const FIELD_Y = -68.5;
export const RACK_Y = -16; // pod centre when racked
export const RELEASE_Y = -22; // pod centre when the clamp has lowered it
export const CATCH_Y = -110; // tractor beam catch point below the belly
export const ARM_TOP_Y = -12.8; // underside of the clamp housing

export const STATES = ["racked", "maintenance", "lowering", "launching", "patrol", "returning", "ascending", "docking"];
export const FLYING = new Set(["lowering", "launching", "patrol", "returning", "ascending", "docking"]);

const DUR = { lowering: 4, launching: 8, returning: 6, ascending: 10, docking: 4 };
const RECALL_SPEED = 2.2;
const UP = new THREE.Vector3(0, 1, 0);

const _p = new THREE.Vector3();
const _t1 = new THREE.Vector3();
const _t2 = new THREE.Vector3();
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qUp = new THREE.Quaternion();
const _qRoll = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);

const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const smoothstep = (a, b, x) => smooth((x - a) / (b - a));
const hash01 = (n) => {
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

export class Traffic {
  /**
   * @param {object} o { rackSlots: [{x, z, yaw}], cradleSlots: [{x, y, z, yaw}], interval, maxAirborne,
   *                     maxObjects, firstLaunchAt, patrolDur: [min, max] }
   */
  constructor({ rackSlots, cradleSlots = [], interval = 35, maxAirborne = 2, maxObjects = 4, firstLaunchAt = 32, patrolDur = [70, 90] }) {
    this.config = { interval, maxAirborne, maxObjects, firstLaunchAt, patrolDur };
    this.clock = 0;
    this.lastLaunch = -Infinity;
    this.launchSeq = 0;
    this.nextRack = 0;
    this.handlers = new Map();
    this.rackSlots = rackSlots;
    this.cradleSlots = cradleSlots;
    const patrol = buildPatrolCurve();
    this.patrol = patrol;
    this.launchCurves = rackSlots.map((s) => makeLaunchCurve(s));
    this.recoveryCurves = rackSlots.map((s) => makeRecoveryCurve(s));
    this.fighters = [];
    rackSlots.forEach((s, i) => this.fighters.push(this.makeFighter(this.fighters.length, "rack", i, "racked")));
    cradleSlots.forEach((s, i) => this.fighters.push(this.makeFighter(this.fighters.length, "cradle", i, "maintenance")));
    for (const f of this.fighters) this.pose(f);
    // launch rotation alternates between the two rack rows, sweeping forward to aft
    const racks = this.fighters.filter((f) => f.kind === "rack");
    const half = Math.ceil(racks.length / 2);
    this.launchOrder = [];
    for (let i = 0; i < half; i++) {
      this.launchOrder.push(racks[i]);
      if (racks[i + half]) this.launchOrder.push(racks[i + half]);
    }
    this.fieldPulse = 0; // set to 1 on a field crossing, decays (renderer reads it)
    this.dirtyParked = true;
  }

  makeFighter(id, kind, slot, state) {
    const f = {
      id,
      kind,
      slot,
      state,
      t0: 0,
      dur: Infinity,
      seq: 0,
      patrolDur: 80,
      recallTau: -1,
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      speed: 0,
      throttle: 0,
      upright: 1,
      armLen: 0.75,
      progress: 0,
      object: null,
      controller: null,
      fieldSide: 1,
      airborne: false,
    };
    return f;
  }

  // ---- public API -----------------------------------------------------------------------------------
  get airborne() {
    let n = 0;
    for (const f of this.fighters) if (FLYING.has(f.state)) n++;
    return n;
  }

  /** Launch a racked fighter (next in rotation when id is omitted). Returns the id or false. */
  requestLaunch(id = null) {
    if (this.airborne >= this.config.maxObjects) return false;
    let f = null;
    if (id === null || id === undefined) {
      const racks = this.launchOrder;
      for (let k = 0; k < racks.length; k++) {
        const c = racks[(this.nextRack + k) % racks.length];
        if (c.state === "racked" && !c.controller) {
          f = c;
          this.nextRack = (this.nextRack + k + 1) % racks.length;
          break;
        }
      }
    } else {
      f = this.fighters[id];
      if (!f || f.state !== "racked" || f.controller) return false;
    }
    if (!f) return false;
    this.launchSeq++;
    f.seq = this.launchSeq;
    f.patrolDur = this.config.patrolDur[0] + (this.config.patrolDur[1] - this.config.patrolDur[0]) * hash01(f.seq * 7 + 3);
    f.recallTau = -1;
    this.enter(f, "lowering", this.clock);
    this.lastLaunch = this.clock;
    return f.id;
  }

  /** Expedite a patrolling fighter home (it finishes the loop at recall speed — always a hull-safe path). */
  requestRecall(id) {
    const f = this.fighters[id];
    if (!f || f.state !== "patrol" || f.recallTau >= 0 || f.controller) return false;
    const tau = this.clock - f.t0;
    f.recallTau = tau;
    f.dur = tau + (f.patrolDur - tau) / RECALL_SPEED;
    this.emit("recall", f);
    return true;
  }

  /** ctrl.update(dt, fighter) writes fighter.pos / fighter.quat and fully replaces the scripted motion. */
  setController(id, ctrl) {
    const f = this.fighters[id];
    if (!f) return false;
    f.controller = ctrl || null;
    return true;
  }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(fn);
  }

  emit(event, f, extra = null) {
    const hs = this.handlers.get(event);
    if (!hs || !hs.length) return;
    const data = { event, id: f.id, fighter: f, state: f.state, position: f.pos, clock: this.clock, ...(extra || {}) };
    for (const fn of hs) fn(data);
  }

  snapshot() {
    return {
      clock: +this.clock.toFixed(3),
      lastLaunch: this.lastLaunch === -Infinity ? null : +this.lastLaunch.toFixed(3),
      seq: this.launchSeq,
      nextRack: this.nextRack,
      fighters: this.fighters.map((f) => ({ id: f.id, s: STATES.indexOf(f.state), t0: +f.t0.toFixed(3), dur: f.dur === Infinity ? null : +f.dur.toFixed(3), seq: f.seq, pd: +f.patrolDur.toFixed(3), rt: f.recallTau })),
    };
  }

  apply(s) {
    if (!s || !s.fighters) return;
    if (typeof s.clock === "number") this.clock = s.clock;
    this.lastLaunch = s.lastLaunch === null || s.lastLaunch === undefined ? -Infinity : s.lastLaunch;
    if (typeof s.seq === "number") this.launchSeq = s.seq;
    if (typeof s.nextRack === "number") this.nextRack = s.nextRack;
    for (const r of s.fighters) {
      const f = this.fighters[r.id];
      if (!f) continue;
      f.state = STATES[r.s] || f.state;
      f.t0 = r.t0;
      f.dur = r.dur === null ? Infinity : r.dur;
      f.seq = r.seq;
      f.patrolDur = r.pd;
      f.recallTau = r.rt;
      this.pose(f);
      f.fieldSide = Math.sign(f.pos.y - FIELD_Y) || 1;
    }
    this.dirtyParked = true;
  }

  // ---- simulation -----------------------------------------------------------------------------------
  update(dt) {
    this.clock += dt;
    const c = this.config;
    for (const f of this.fighters) {
      if (f.controller) {
        f.t0 += dt; // frozen schedule while a pilot owns the fighter
        f.controller.update(dt, f);
        f.airborne = true;
        continue;
      }
      this.advance(f);
      this.pose(f);
      // containment field crossing (either direction) while in the shaft states
      const side = Math.sign(f.pos.y - FIELD_Y) || 1;
      if (side !== f.fieldSide && (f.state === "launching" || f.state === "returning" || f.state === "ascending")) {
        this.fieldPulse = 1;
        this.emit("field_pass", f, { direction: side < 0 ? "out" : "in" });
      }
      f.fieldSide = side;
    }
    if (this.clock >= c.firstLaunchAt && this.clock - this.lastLaunch >= c.interval && this.airborne < c.maxAirborne) this.requestLaunch();
    if (this.fieldPulse > 0) this.fieldPulse = Math.max(0, this.fieldPulse - dt * 0.7);
  }

  enter(f, state, t0) {
    const prev = f.state;
    f.state = state;
    f.t0 = t0;
    // approach legs take a duration proportional to their length so speeds match the loop (~50 m/s)
    if (state === "patrol") f.dur = f.patrolDur;
    else if (state === "launching") f.dur = THREE.MathUtils.clamp(this.launchCurves[f.slot].len / 34, 6, 10);
    else if (state === "returning") f.dur = THREE.MathUtils.clamp(this.recoveryCurves[f.slot].len / 32, 3, 8);
    else f.dur = DUR[state] || Infinity;
    if (state === "patrol") f.recallTau = -1;
    if (prev === "racked" || prev === "maintenance" || state === "racked") this.dirtyParked = true;
    if (state === "launching") this.emit("launch", f);
    else if (state === "patrol") this.emit("depart", f);
    else if (state === "returning") this.emit("return", f);
    else if (state === "racked") this.emit("dock", f);
  }

  advance(f) {
    let guard = 8;
    while (f.dur !== Infinity && this.clock - f.t0 >= f.dur && guard-- > 0) {
      const next = { lowering: "launching", launching: "patrol", patrol: "returning", returning: "ascending", ascending: "docking", docking: "racked" }[f.state];
      if (!next) break;
      const t0 = f.t0 + f.dur;
      // fire the crossing that a large step may have skipped
      this.enter(f, next, t0);
    }
    f.airborne = FLYING.has(f.state);
  }

  /** Pose (pos, quat, speed, throttle, armLen, progress) at the current clock — no allocations. */
  pose(f) {
    const tau = this.clock - f.t0;
    const slot = f.kind === "rack" ? this.rackSlots[f.slot] : this.cradleSlots[f.slot];
    switch (f.state) {
      case "racked":
      case "maintenance": {
        f.pos.set(slot.x, f.kind === "rack" ? RACK_Y : slot.y, slot.z);
        f.quat.setFromAxisAngle(UP, slot.yaw || 0);
        f.speed = 0;
        f.throttle = 0;
        f.upright = 1;
        f.armLen = ARM_TOP_Y - (RACK_Y + 2.45);
        f.progress = 0;
        break;
      }
      case "lowering": {
        const k = smooth(tau / f.dur);
        const y = RACK_Y + (RELEASE_Y - RACK_Y) * k;
        f.pos.set(slot.x, y, slot.z);
        f.quat.setFromAxisAngle(UP, slot.yaw || 0);
        f.speed = 0;
        f.throttle = smoothstep(0.6, 1, k) * 0.35;
        f.upright = 1;
        f.armLen = ARM_TOP_Y - (y + 2.45);
        f.progress = k;
        break;
      }
      case "launching": {
        const k = Math.min(1, tau / f.dur);
        const u = Math.pow(k, 1.8);
        const curve = this.launchCurves[f.slot];
        const w = smoothstep(0.3, 0.65, u);
        this.curvePose(f, curve, u, w, slot.yaw || 0, 1.8 * Math.pow(Math.max(k, 0.05), 0.8) * (curve.len / f.dur));
        f.throttle = smoothstep(0.12, 0.45, u);
        f.armLen = ARM_TOP_Y - (RELEASE_Y + 2.45) - 6 * smooth(tau / 3);
        f.progress = u;
        break;
      }
      case "patrol": {
        const u = this.patrolU(f, tau);
        const speedMul = f.recallTau >= 0 && tau > f.recallTau ? RECALL_SPEED : 1;
        this.curvePose(f, this.patrol, u, 1, 0, (speedMul * this.patrol.length) / f.patrolDur);
        f.throttle = 1;
        f.armLen = ARM_TOP_Y - (RACK_Y + 2.45);
        f.progress = u;
        break;
      }
      case "returning": {
        const k = Math.min(1, tau / f.dur);
        const u = 1 - Math.pow(1 - k, 1.6);
        const curve = this.recoveryCurves[f.slot];
        const w = 1 - smoothstep(0.55, 0.95, u);
        this.curvePose(f, curve, u, w, slot.yaw || 0, 1.6 * Math.pow(1 - k, 0.6) * (curve.len / f.dur));
        f.throttle = 1 - 0.7 * smoothstep(0.6, 1, u);
        f.armLen = ARM_TOP_Y - (RACK_Y + 2.45);
        f.progress = u;
        break;
      }
      case "ascending": {
        const k = smooth(tau / f.dur);
        const y = CATCH_Y + (RELEASE_Y - CATCH_Y) * k;
        f.pos.set(slot.x, y, slot.z);
        f.quat.setFromAxisAngle(UP, slot.yaw || 0);
        f.speed = 0;
        f.throttle = 0.15;
        f.upright = 1;
        f.armLen = ARM_TOP_Y - (RACK_Y + 2.45) + 6 * smooth((tau - (f.dur - 3)) / 3);
        f.progress = k;
        break;
      }
      case "docking": {
        const k = smooth(tau / f.dur);
        const y = RELEASE_Y + (RACK_Y - RELEASE_Y) * k;
        f.pos.set(slot.x, y, slot.z);
        f.quat.setFromAxisAngle(UP, slot.yaw || 0);
        f.speed = 0;
        f.throttle = 0.15 * (1 - k);
        f.upright = 1;
        f.armLen = ARM_TOP_Y - (y + 2.45);
        f.progress = k;
        break;
      }
      default:
        break;
    }
  }

  patrolU(f, tau) {
    const d = f.patrolDur;
    if (f.recallTau < 0 || tau <= f.recallTau) return Math.min(1, tau / d);
    return Math.min(1, f.recallTau / d + ((tau - f.recallTau) * RECALL_SPEED) / d);
  }

  /**
   * Position on a curve with the flight attitude: forward along the tangent, banked into the turn, blended
   * (weight w) with the upright rack attitude (yaw).
   */
  curvePose(f, c, u, w, yaw, speed) {
    const curve = c.curve || c;
    const len = c.length || c.len;
    curve.getPointAt(u, f.pos);
    f.speed = speed;
    f.upright = 1 - w;
    _qUp.setFromAxisAngle(UP, yaw);
    if (w <= 0.001) {
      f.quat.copy(_qUp);
      return;
    }
    // tangent frame with roll from the lateral curvature (a coordinated turn)
    const du = Math.min(0.02, 18 / len);
    const ua = Math.max(0, Math.min(1 - du, u - du * 0.5));
    curve.getTangentAt(ua, _t1);
    curve.getTangentAt(Math.min(1, ua + du), _t2);
    _t1.add(_t2).normalize(); // forward (averaged so knots do not kick)
    if (Math.abs(_t1.y) > 0.985) {
      _u.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    } else {
      _u.copy(UP);
    }
    // right = forward × up, up = right × forward
    _r.crossVectors(_t1, _u).normalize();
    _u.crossVectors(_r, _t1).normalize();
    _m.makeBasis(_r, _u, _p.copy(_t1).negate());
    _q.setFromRotationMatrix(_m);
    // bank: lateral turn rate → roll about the forward axis (negative = right wing down for a right turn)
    curve.getTangentAt(ua, _t2);
    curve.getTangentAt(Math.min(1, ua + du), _p);
    _p.sub(_t2);
    const ds = du * len;
    const kappa = _p.dot(_r) / Math.max(ds, 1e-3);
    const aLat = speed * speed * kappa;
    const bank = THREE.MathUtils.clamp(Math.atan(aLat / 28), -1.05, 1.05);
    _qRoll.setFromAxisAngle(_zAxis, -bank);
    _q.multiply(_qRoll);
    if (w >= 0.999) f.quat.copy(_q);
    else f.quat.copy(_qUp).slerp(_q, w);
  }
}

// ---- per-slot approach curves --------------------------------------------------------------------------
/** Drop from the release point straight through the shaft and the field, then curve forward into the loop. */
function makeLaunchCurve(slot) {
  const { x, z } = slot;
  const S = PATROL_START;
  const z3 = z - 22;
  const z4 = (z3 + S.z) / 2;
  const z5 = z4 + 0.6 * (S.z - z4);
  const pts = [new THREE.Vector3(x, RELEASE_Y, z), new THREE.Vector3(x, -46, z), new THREE.Vector3(x, -82, z + 1), new THREE.Vector3(x * 0.75, -114, z3), new THREE.Vector3(x * 0.4, -138, z4), new THREE.Vector3(x * 0.12, -149, z5), S.clone()];
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  curve.arcLengthDivisions = 200;
  return { curve, len: curve.getLength(), length: curve.getLength() };
}

/** From the loop end below the belly, pull up under the fighter's own rack slot to the tractor catch point. */
function makeRecoveryCurve(slot) {
  const { x, z } = slot;
  const H = PATROL_END;
  const z1 = H.z - 20;
  const z2 = (z1 + z) / 2 + 3;
  const pts = [H.clone(), new THREE.Vector3(x * 0.25, -139, z1), new THREE.Vector3(x * 0.7, -130, z2), new THREE.Vector3(x, -119, z + 4), new THREE.Vector3(x, CATCH_Y, z)];
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  curve.arcLengthDivisions = 200;
  return { curve, len: curve.getLength(), length: curve.getLength() };
}
