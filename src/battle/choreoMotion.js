// Ship motion: ponderous drift, slow turns and rough formation keeping for the line ships; free wide
// loops for the melee ships; escorts weaving under their wards and couriers running ward to ward along
// the flanks of the line, both steering around every hull in their way; damaged ships list and fall out
// of line; dead hulks tumble slowly. Per-frame work is O(ships) for the big ships and O(agile ships x
// nearby hulls) for the small ones, with scratch vectors only; the pairwise hull-avoidance pass runs on
// the 1 Hz tick.
import * as THREE from "three";
import { boxesOverlap, dirFromYawPitch, steerToward } from "./choreoRng.js";

const _v = new THREE.Vector3();
const _want = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _ang = new THREE.Vector3();
const _pa = new THREE.Vector3();
const _pb = new THREE.Vector3();
const _ma = new THREE.Matrix4();
const _mb = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _off = new THREE.Vector3();
const _rel = new THREE.Vector3();
const _push = new THREE.Vector3();
const _tv = new THREE.Vector3();

const MAX_TURN = 0.012; // rad/s (0.7 deg/s): the line ships' weave peaks at about 0.5 deg/s
const ACCEL = 0.7; // m/s^2: velocity changes are gradual
const BANK_GAIN = 32; // roll per rad/s of heading rate: a 0.5 deg/s turn heels about 16 degrees
const BANK_RATE = 0.06; // 1/s: the heel follows the turn over ~20 s
const AGILE_BANK_GAIN = 7; // the small ships heel 20-30 degrees into their much faster turns
const AGILE_BANK_RATE = 0.35;
const LOOKAHEAD = 9; // s: how far ahead an escort or courier probes for hulls in its way

export function updateGroups(groups, dt, time) {
  for (const g of Object.values(groups)) {
    // lines advance, then ease back, so they never simply run into each other over a long session
    const k = 0.55 + 0.45 * Math.cos(time / 95);
    g.vel.set(g.vel0.x, g.vel0.y, g.vel0.z * k);
    g.pos.addScaledVector(g.vel, dt);
    g.yaw += g.yawRate * dt;
  }
}

export function updateShipMotion(st, dt, time) {
  const s = st.ship;
  if (st.dead) return; // hulks: fleet.update integrates their tumble and drift, nothing steers them
  const hpFrac = st.hpFrac();
  const crippled = hpFrac < 0.45;
  const turnK = st.turnK || 1; // class turn-rate scale (a Lucrehulk comes about far slower)
  let yawRate = 0; // rate of the wanted heading (rad/s), banked into below
  if (st.group) {
    // formation slot in the group frame, with a slow personal wander so the line breathes
    const g = st.group;
    const cy = Math.cos(g.yaw);
    const sy = Math.sin(g.yaw);
    const wx = Math.sin(time * st.wander.x + st.phase) * 120;
    const wy = Math.sin(time * st.wander.y + st.phase * 1.7) * 90;
    const sx = st.slot.x + wx;
    const sz = st.slot.z;
    _want.set(
      g.pos.x + sx * cy + sz * sy,
      g.pos.y + st.slot.y + wy,
      g.pos.z - sx * sy + sz * cy,
    );
    _v.subVectors(_want, s.position).multiplyScalar(0.02);
    const m = _v.length();
    if (m > 9) _v.multiplyScalar(9 / m);
    _want.copy(g.vel).add(_v);
    if (crippled) _want.multiplyScalar(0.35 + hpFrac); // engines failing: falls behind the line
    // the heading weaves slowly about the ship's own offset (a few minutes per swing, up to ~0.5
    // deg/s), so the line turns visibly while the slots hold
    const wv = st.weave;
    const ph = time * wv.omega + wv.phase;
    const yawWander = wv.amp * Math.sin(ph);
    const pitchWander = wv.pitchAmp * Math.sin(ph * 0.7 + 1.3);
    yawRate = g.yawRate + wv.amp * wv.omega * Math.cos(ph);
    dirFromYawPitch(
      g.yaw + st.yawOff + yawWander,
      st.pitchOff + pitchWander,
      _dir,
    );
  } else {
    // free ship: cruise along the nose with a slow constant turn (a wide loop over many minutes);
    // when far from the melee centre the turn tightens toward home so it eventually comes back
    st.headYaw += st.turn * dt;
    yawRate = st.turn;
    _v.subVectors(st.home, s.position);
    const far = _v.length();
    if (far > 6500) {
      const wantYaw = Math.atan2(-_v.x, -_v.z);
      let d = wantYaw - st.headYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const extra = THREE.MathUtils.clamp(d, -1, 1) * 0.004;
      st.headYaw += extra * dt;
      yawRate += extra;
    }
    st.headPitch +=
      (Math.sin(time * 0.013 + st.phase) * 0.12 - st.headPitch) *
      Math.min(1, dt * 0.05);
    dirFromYawPitch(st.headYaw, st.headPitch, _dir);
    _want.copy(_dir).multiplyScalar(st.cruise * (crippled ? 0.4 + hpFrac : 1));
    if (st.role === "reinforcement") {
      // arriving from far off: fast approach that bleeds off as it nears its slot
      _v.subVectors(st.home, s.position);
      const dist = _v.length();
      if (dist > 400) {
        _v.divideScalar(dist);
        const spd = THREE.MathUtils.clamp(dist * 0.03, st.cruise, 60);
        _want.copy(_v).multiplyScalar(spd);
        _dir.copy(_v);
        yawRate = 0;
      } else {
        st.arrive();
      }
    }
  }
  // velocity eases toward the wanted velocity (bounded acceleration)
  _v.subVectors(_want, s.velocity);
  const dv = _v.length();
  const maxDv = (st.agile > 0 ? 3 : ACCEL * Math.min(turnK, 1)) * dt;
  if (dv > maxDv) _v.multiplyScalar(maxDv / dv);
  s.velocity.add(_v);
  // heading: slow turn toward the wanted nose direction; damaged ships lose control authority, ships
  // still manoeuvring into the line (reinforcements) turn faster
  const authority = crippled ? 0.25 : 1;
  steerToward(
    s,
    _dir,
    MAX_TURN * turnK * authority * (st.agile > 0 ? 1.7 : 1),
    0.35,
    _ang,
  );
  // bank into the turn: the heel follows the heading rate (a left turn, positive yaw rate about +Y,
  // rolls the port side down, which is a positive rate about the local +Z nose axis)
  const bankTarget = THREE.MathUtils.clamp(
    yawRate * BANK_GAIN * authority,
    -0.4,
    0.4,
  );
  const bankRate = (bankTarget - st.bank) * BANK_RATE;
  st.bank += bankRate * dt;
  _ang.z += bankRate;
  applyListAndWobble(st, hpFrac, time, dt, _ang);
  s.angular.copy(_ang);
}

// damage list: a slow roll (and a little pitch) drift that grows as the ship is hurt, bounded so a
// crippled ship settles at a visible heel of up to ~30 degrees instead of rolling over; plus a faint
// living wobble so nothing is perfectly still
function applyListAndWobble(st, hpFrac, time, dt, ang) {
  const hurt = 1 - hpFrac;
  const listMax = hurt * 0.55;
  if (st.listAngle < listMax) {
    const rate = 0.003 * hurt;
    st.listAngle += rate * dt;
    ang.z += st.listDir * rate;
    ang.x += Math.sin(time * 0.021 + st.phase) * rate * 0.4;
  }
  ang.x += Math.sin(time * 0.05 + st.phase) * 0.00025;
  ang.z += Math.cos(time * 0.037 + st.phase * 2) * 0.0003;
}

// ---------------------------------------------------------------------------
// Escorts and couriers
// ---------------------------------------------------------------------------

// heading (yaw about +Y) of a ship's nose, ignoring its pitch and roll
export function yawOf(ship) {
  const e = ship.matrix.elements;
  return Math.atan2(e[8], e[10]); // local +Z in world is (e8, e9, e10); the nose is -Z
}

// An escort's path: a Lissajous weave in the group's heading frame around its ward, crossing under the
// keel from one flank to the other (deepest directly beneath, shallower out on the flanks) while it
// slides ahead of and behind the ward, so the pass under the hull shows from every side.
export function makeEscortPath(rand, i) {
  return {
    kind: "weave",
    omega: (Math.PI * 2) / rand.range(170, 250),
    phase: rand() * Math.PI * 2,
    psi: rand.sign() * (Math.PI / 2) + rand.range(-0.4, 0.4),
    ax: rand.range(1150, 1500),
    az: rand.range(420, 700),
    depth: rand.range(680, 800) + (i % 2) * 90,
    dy: rand.range(100, 160),
  };
}
export function escortOffset(path, time, out) {
  const th = time * path.omega + path.phase;
  return out.set(
    path.ax * Math.sin(th),
    -path.depth - path.dy * Math.cos(2 * th),
    path.az * Math.sin(2 * th + path.psi),
  );
}

// A courier's run: along one flank of its ward, 300-600 m outboard of the hull, from beyond one end to
// beyond the other, in the ward's heading frame. `hold` is the approach: the run only starts once the
// courier has reached its first point.
export function makeCourierRun(ward, rand, boxes) {
  const box = boxes.get(ward.ship.model.id);
  const dir = rand.sign();
  const zEnd = box.hz + 320;
  return {
    kind: "run",
    ward,
    x: rand.sign() * (box.hx + rand.range(300, 600)),
    y: box.cy + rand.range(-140, 170),
    z0: dir * zEnd,
    z1: -dir * zEnd,
    u: 0,
    dur: (2 * zEnd) / rand.range(55, 80),
    hold: true,
  };
}
// world point of a run at its current parameter (yaw frame of the ward)
export function runPoint(path, out) {
  const w = path.ward.ship;
  const yaw = yawOf(w);
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const z = path.z0 + (path.z1 - path.z0) * path.u;
  return out.set(
    w.position.x + path.x * c + z * sn,
    w.position.y + path.y,
    w.position.z - path.x * sn + z * c,
  );
}

// Steering for the small ships: pursue the moving point on the path (an escort's weave slot, a
// courier's run point), curve around every hull that the next few seconds would carry them into, nose
// along the velocity, heel into the turns. `nextRun(st)` is called when a courier finishes a run.
export function updateAgileMotion(st, dt, time, states, boxes, nextRun) {
  const s = st.ship;
  if (st.dead) return;
  const hpFrac = st.hpFrac();
  const crippled = hpFrac < 0.45;
  const maxSpeed = st.cruise * (crippled ? 0.4 + hpFrac : 1);
  let targetSpeed = 0; // speed of the pursued point along the path
  let have = false;
  if (
    st.role === "escort" &&
    st.ward &&
    st.group &&
    !st.ward.dead &&
    st.ward.ship.alive
  ) {
    const g = st.group;
    escortOffset(st.path, time, _off);
    const c = Math.cos(g.yaw);
    const sn = Math.sin(g.yaw);
    const wp = st.ward.ship.position;
    _want.set(
      wp.x + _off.x * c + _off.z * sn,
      wp.y + _off.y,
      wp.z - _off.x * sn + _off.z * c,
    );
    // the slot's own velocity (finite difference along the path) plus the ward's drift
    escortOffset(st.path, time + 1, _tv);
    _tv.sub(_off);
    _tv.set(_tv.x * c + _tv.z * sn, _tv.y, -_tv.x * sn + _tv.z * c);
    _tv.add(st.ward.ship.velocity);
    targetSpeed = _tv.length();
    have = true;
  } else if (st.role === "courier" && st.path && st.path.ward) {
    const p = st.path;
    if (p.ward.dead || !p.ward.ship.alive) {
      if (nextRun) nextRun(st);
    } else {
      runPoint(p, _want);
      if (p.hold) {
        if (s.position.distanceTo(_want) < 260) p.hold = false;
      } else {
        p.u += dt / p.dur;
        if (p.u >= 1) {
          if (nextRun) nextRun(st);
          runPoint(st.path, _want);
        }
      }
      if (!st.path.hold) {
        const w = st.path.ward.ship;
        const yaw = yawOf(w);
        const along = (st.path.z1 - st.path.z0) / st.path.dur;
        _tv
          .set(Math.sin(yaw) * along, 0, Math.cos(yaw) * along)
          .add(w.velocity);
        targetSpeed = _tv.length();
      } else _tv.copy(st.path.ward.ship.velocity);
      have = true;
    }
  }
  if (have) {
    // pursuit: full speed when far from the point, easing to the point's own speed on top of it
    _v.subVectors(_want, s.position);
    const dist = _v.length();
    if (dist > 1) {
      const spd = Math.min(maxSpeed, targetSpeed * 0.9 + dist * 0.08 + 4);
      _want.copy(_v).multiplyScalar(spd / dist);
      if (dist < 600) _want.addScaledVector(_tv, 0.8 * (1 - dist / 600));
    } else _want.copy(_tv);
  } else {
    // no ward: hold course at cruise until the tick finds a new one
    _want.copy(s.velocity);
    const m = _want.length();
    if (m > 1) _want.multiplyScalar((maxSpeed * 0.7) / m);
  }
  avoidHulls(st, states, boxes, _want, maxSpeed);
  // velocity eases toward the wanted velocity with the class's acceleration
  _v.subVectors(_want, s.velocity);
  const dv = _v.length();
  const maxDv = (st.accel || 4) * dt;
  if (dv > maxDv) _v.multiplyScalar(maxDv / dv);
  s.velocity.add(_v);
  // nose along the velocity (a ship this small flies where it points)
  const spd = s.velocity.length();
  if (spd > 2) _dir.copy(s.velocity).divideScalar(spd);
  else _dir.set(0, 0, -1).applyQuaternion(s.quaternion);
  const authority = crippled ? 0.4 : 1;
  steerToward(s, _dir, MAX_TURN * (st.turnK || 3) * authority, 0.9, _ang);
  // heel into the turn from the heading rate of the flight path
  const headYaw = Math.atan2(-_dir.x, -_dir.z);
  let dYaw = headYaw - st.headYaw;
  dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  st.headYaw = headYaw;
  const yawRate = dt > 0 ? dYaw / dt : 0;
  const bankTarget = THREE.MathUtils.clamp(
    yawRate * AGILE_BANK_GAIN * authority,
    -0.55,
    0.55,
  );
  const bankRate = (bankTarget - st.bank) * AGILE_BANK_RATE;
  st.bank += bankRate * dt;
  _ang.z += bankRate;
  applyListAndWobble(st, hpFrac, time, dt, _ang);
  s.angular.copy(_ang);
}

// Probe the agile ship's position now, halfway and at the end of the look-ahead against the oriented
// box of every hull within reach (inflated by the small ship's own radius and a clearance); the first
// probe found inside pushes the wanted velocity out through the nearest face, harder the sooner the
// hit. Dead hulks count: nothing steers them out of the way.
const PROBES = [0, 0.5, 1];
const URGENCY = [1.6, 1.0, 0.6];
function avoidHulls(st, states, boxes, want, maxSpeed) {
  const s = st.ship;
  const rs = s.model.bounds.radius;
  const spd = Math.max(want.length(), s.velocity.length(), 10);
  for (const o of states) {
    if (o === st) continue;
    const so = o.ship;
    if (!so.alive) continue;
    const ro = so.model.bounds.radius;
    _rel.subVectors(so.position, s.position);
    if (_rel.length() > ro + rs + spd * LOOKAHEAD + 200) continue;
    const box = boxes.get(so.model.id);
    const margin = rs + 70;
    _inv.copy(so.matrix).invert();
    for (let k = 0; k < PROBES.length; k++) {
      const T = PROBES[k] * LOOKAHEAD;
      _pa
        .copy(s.position)
        .addScaledVector(s.velocity, T)
        .addScaledVector(so.velocity, -T)
        .applyMatrix4(_inv);
      const ex = Math.abs(_pa.x - box.cx) - (box.hx + margin);
      const ey = Math.abs(_pa.y - box.cy) - (box.hy + margin);
      const ez = Math.abs(_pa.z - box.cz) - (box.hz + margin);
      if (ex >= 0 || ey >= 0 || ez >= 0) continue;
      // out through the nearest face (least penetration), in the hull's frame, then to world
      let axis = 0;
      let e = ex;
      if (ey > e) {
        axis = 1;
        e = ey;
      }
      if (ez > e) {
        axis = 2;
        e = ez;
      }
      const c = axis === 0 ? box.cx : axis === 1 ? box.cy : box.cz;
      const sign = _pa.getComponent(axis) >= c ? 1 : -1;
      const m = so.matrix.elements;
      _push
        .set(m[axis * 4], m[axis * 4 + 1], m[axis * 4 + 2])
        .multiplyScalar(sign);
      const depth = Math.min(1.5, -e / margin);
      want.addScaledVector(_push, spd * (0.5 + 0.5 * depth) * URGENCY[k]);
      break;
    }
  }
  const m = want.length();
  const cap = maxSpeed * 1.15;
  if (m > cap) want.multiplyScalar(cap / m);
}

// Hull avoidance on the tick: for every pair, test the oriented boxes now and 18 s ahead; overlapping or
// converging pairs get a gentle push apart (line ships nudge their slot as well so they do not fight it;
// wrecks, which nothing steers, take half the push so two of them never drift through each other). The
// push is shared in inverse proportion to size: the smaller hull gives way.
export function avoidPass(states, boxes) {
  const n = states.length;
  for (let i = 0; i < n; i++) {
    const a = states[i];
    const sa = a.ship;
    for (let j = i + 1; j < n; j++) {
      const b = states[j];
      const sb = b.ship;
      const ra = sa.model.bounds.radius;
      const rb = sb.model.bounds.radius;
      _v.subVectors(sb.position, sa.position);
      const d = _v.length();
      if (d > ra + rb + 2200) continue;
      const boxA = boxes.get(sa.model.id);
      const boxB = boxes.get(sb.model.id);
      let now = false;
      let soon = false;
      if (d < ra + rb + 200)
        now = boxesOverlap(sa.matrix, boxA, sb.matrix, boxB, 100);
      if (!now) {
        _pa.copy(sa.position).addScaledVector(sa.velocity, 18);
        _pb.copy(sb.position).addScaledVector(sb.velocity, 18);
        if (_pa.distanceTo(_pb) < ra + rb + 200) {
          _ma.copy(sa.matrix).setPosition(_pa);
          _mb.copy(sb.matrix).setPosition(_pb);
          soon = boxesOverlap(_ma, boxA, _mb, boxB, 140);
        }
      }
      if (!now && !soon) continue;
      if (d < 1) _v.set(0, 1, 0);
      else _v.divideScalar(d);
      const push = (now ? 4.5 : 2.0) * 2; // m/s along the centre line, shared by size
      const wa = rb / (ra + rb);
      sa.velocity.addScaledVector(_v, a.dead ? -push * wa * 0.5 : -push * wa);
      if (!a.dead && a.slot) a.slot.addScaledVector(_v, -120 * wa);
      sb.velocity.addScaledVector(
        _v,
        b.dead ? push * (1 - wa) * 0.5 : push * (1 - wa),
      );
      if (!b.dead && b.slot) b.slot.addScaledVector(_v, 120 * (1 - wa));
    }
  }
}

// A dead ship becomes a hulk: engines dark, a slow tumble on random local axes, drifting out of line.
export function makeHulk(st, rand) {
  const s = st.ship;
  s.angular.set(
    rand.range(-0.007, 0.007),
    rand.range(-0.011, 0.011),
    rand.range(-0.009, 0.009),
  );
  _v.set(
    rand.range(-1, 1),
    rand.range(-0.5, 0.5),
    rand.range(-1, 1),
  ).normalize();
  s.velocity.multiplyScalar(0.6).addScaledVector(_v, rand.range(6, 14));
  st.group = null;
  st.slot = null;
  st.ward = null;
}

// Helper for spawning: quaternion from yaw / pitch / roll
export function quatFromYPR(yaw, pitch, roll, out = _q) {
  return out.setFromEuler(new THREE.Euler(pitch, yaw, roll, "YXZ"));
}
