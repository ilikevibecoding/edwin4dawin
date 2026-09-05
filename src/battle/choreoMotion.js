// Ship motion: ponderous drift, slow turns and rough formation keeping for the line ships; free wide
// loops for the melee ships; damaged ships list and fall out of line; dead hulks tumble slowly. Per-frame
// work is O(ships) with scratch vectors only; the pairwise hull-avoidance pass runs on the 1 Hz tick.
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
const _q = new THREE.Quaternion();

const MAX_TURN = 0.0045; // rad/s: a 90 degree heading change takes ~6 minutes
const ACCEL = 0.7; // m/s^2: velocity changes are gradual

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
    dirFromYawPitch(g.yaw + st.yawOff, st.pitchOff, _dir);
  } else {
    // free ship: cruise along the nose with a slow constant turn (a wide loop over many minutes);
    // when far from the melee centre the turn tightens toward home so it eventually comes back
    st.headYaw += st.turn * dt;
    _v.subVectors(st.home, s.position);
    const far = _v.length();
    if (far > 6500) {
      const wantYaw = Math.atan2(-_v.x, -_v.z);
      let d = wantYaw - st.headYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      st.headYaw += THREE.MathUtils.clamp(d, -1, 1) * 0.004 * dt;
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
      } else {
        st.arrive();
      }
    }
  }
  // velocity eases toward the wanted velocity (bounded acceleration)
  _v.subVectors(_want, s.velocity);
  const dv = _v.length();
  const maxDv = (st.agile > 0 ? 3 : ACCEL) * dt;
  if (dv > maxDv) _v.multiplyScalar(maxDv / dv);
  s.velocity.add(_v);
  // heading: slow turn toward the wanted nose direction; damaged ships lose control authority, ships
  // still manoeuvring into the line (reinforcements) turn faster
  const authority = crippled ? 0.25 : 1;
  steerToward(
    s,
    _dir,
    MAX_TURN * authority * (st.agile > 0 ? 4 : 1),
    0.35,
    _ang,
  );
  // damage list: a slow roll (and a little pitch) drift that grows as the ship is hurt, bounded so a
  // crippled ship settles at a visible heel of up to ~30 degrees instead of rolling over
  const hurt = 1 - hpFrac;
  const listMax = hurt * 0.55;
  if (st.listAngle < listMax) {
    const rate = 0.003 * hurt;
    st.listAngle += rate * dt;
    _ang.z += st.listDir * rate;
    _ang.x += Math.sin(time * 0.021 + st.phase) * rate * 0.4;
  }
  // a faint living wobble so nothing is perfectly still
  _ang.x += Math.sin(time * 0.05 + st.phase) * 0.00025;
  _ang.z += Math.cos(time * 0.037 + st.phase * 2) * 0.0003;
  s.angular.copy(_ang);
}

// Hull avoidance on the tick: for every pair, test the oriented boxes now and 18 s ahead; overlapping or
// converging pairs get a gentle push apart (line ships nudge their slot as well so they do not fight it).
export function avoidPass(states, boxes) {
  const n = states.length;
  for (let i = 0; i < n; i++) {
    const a = states[i];
    const sa = a.ship;
    for (let j = i + 1; j < n; j++) {
      const b = states[j];
      const sb = b.ship;
      if (a.dead && b.dead) continue;
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
      const push = now ? 4.5 : 2.0; // m/s along the centre line, split between the two hulls
      if (!a.dead) {
        sa.velocity.addScaledVector(_v, -push);
        if (a.slot) a.slot.addScaledVector(_v, -60);
      }
      if (!b.dead) {
        sb.velocity.addScaledVector(_v, push);
        if (b.slot) b.slot.addScaledVector(_v, 60);
      }
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
}

// Helper for spawning: quaternion from yaw / pitch / roll
export function quatFromYPR(yaw, pitch, roll, out = _q) {
  return out.setFromEuler(new THREE.Euler(pitch, yaw, roll, "YXZ"));
}
