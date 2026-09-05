// Fighter flight model: capital-ship no-fly zones (superellipsoid + sphere per hull, with a look-ahead so
// fighters skim along hulls instead of bouncing off them), formation slots for wingmen, the leader state
// machine (patrol weave, attack run, break-away, dogfight pursuit, combat air patrol over the home ship,
// hangar launch, gunship transit), evasive weaving for hunted fighters and the turn-rate-limited
// integration with banking. Everything here is allocation-free per frame and deterministic given the
// fixed-step time and each fighter's seeded RNG.
import * as THREE from "three";

export const MODE = {
  PATROL: 0, // weave around the enemy anchor ship, waiting for an attack window
  CAP: 1, // combat air patrol around the home ship
  ATTACK: 2, // run at a point on the anchor's hull
  BREAK: 3, // break away from the hull after a pass (rolling)
  DOGFIGHT: 4, // pursue an enemy fighter
  LAUNCH: 5, // just left the hangar, flying straight out
  TRANSIT: 6, // gunships: shuttle between friendly ships
  FORM: 7, // wingman: hold formation on the leader
  DEAD: 8,
};
export const MODE_NAMES = [
  "patrol",
  "cap",
  "attack",
  "break",
  "dogfight",
  "launch",
  "transit",
  "form",
  "dead",
];

const UP = new THREE.Vector3(0, 1, 0);
const ORIGIN = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _nBest = new THREE.Vector3();
const _ahead = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _l = new THREE.Vector3();
const _ref = new THREE.Vector3();
const _qi = new THREE.Quaternion();

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// orthonormal frame around a unit heading: right = fwd x up, up = right x fwd
export function frame(fwd, outRight, outUp) {
  const ref = Math.abs(fwd.y) > 0.97 ? _ref.set(0, 0, 1) : UP;
  outRight.crossVectors(fwd, ref).normalize();
  outUp.crossVectors(outRight, fwd);
}

// ---------------------------------------------------------------------------
// capital hull no-fly zones
// ---------------------------------------------------------------------------
const HULL_MARGIN = 85; // metres of clearance added around the hull's bounding box
const hullCache = new Map();

/** Per-model hull descriptor from the LOD-0 geometry bounding box (cached by model id). */
export function hullInfo(model) {
  let h = hullCache.get(model.id);
  if (h) return h;
  const box = new THREE.Box3();
  for (const p of model.parts) {
    if (p.lod !== 0) continue;
    if (!p.geometry.boundingBox) p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox);
  }
  const R = model.bounds ? model.bounds.radius : model.length * 0.55;
  if (box.isEmpty())
    box.set(
      new THREE.Vector3(-R * 0.45, -R * 0.2, -model.length / 2),
      new THREE.Vector3(R * 0.45, R * 0.2, model.length / 2),
    );
  const center = box.getCenter(new THREE.Vector3());
  const ext = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  h = {
    R,
    center,
    // superellipsoid (power 4) semi-axes: box + margin, slightly inflated so the box corners stay inside
    ax: (ext.x + HULL_MARGIN) * 1.05,
    ay: (ext.y + HULL_MARGIN) * 1.05,
    az: (ext.z + HULL_MARGIN) * 1.03,
    // sphere part keeps every fighter beyond 0.62 R of the hull centre (rounds the middle of the hull)
    sphere: R * 0.62 + 30,
    // broad-phase radius for the nearby-ship cache
    reach: Math.max(ext.x, ext.y, ext.z) * 1.05 + HULL_MARGIN + 700,
    // ventral hangar mouth below the bow: fighters launch from here
    hangar: new THREE.Vector3(0, box.min.y - 60, -model.length * 0.32),
    length: model.length,
  };
  hullCache.set(model.id, h);
  return h;
}

/**
 * No-fly metric of world point p against a ship: < 1 inside the zone, 1 on its boundary, grows outside.
 * Writes the outward normal of the zone at p into outN.
 */
export function hullMetric(ship, h, p, outN) {
  _l.copy(p).sub(ship.position);
  const d = _l.length();
  const qs = d / h.sphere;
  _qi.copy(ship.quaternion).invert();
  _l.applyQuaternion(_qi).sub(h.center);
  const x = _l.x / h.ax;
  const y = _l.y / h.ay;
  const z = _l.z / h.az;
  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;
  const s4 = x2 * x2 + y2 * y2 + z2 * z2;
  const qe = Math.sqrt(Math.sqrt(s4));
  if (qe < qs) {
    if (s4 < 1e-12) {
      outN.set(0, 1, 0);
      return 0;
    }
    outN
      .set((x * x2) / h.ax, (y * y2) / h.ay, (z * z2) / h.az)
      .applyQuaternion(ship.quaternion)
      .normalize();
    return qe;
  }
  if (d < 1e-3) {
    outN.set(0, 1, 0);
    return 0;
  }
  outN.copy(p).sub(ship.position).divideScalar(d);
  return qs;
}

/** Move a point out of every no-fly zone (used when spawning). */
export function pushOut(p, ships, hulls, margin = 1.2) {
  for (let k = 0; k < 6; k++) {
    let moved = false;
    for (let i = 0; i < ships.length; i++) {
      const h = hulls[i];
      const q = hullMetric(ships[i], h, p, _n);
      if (q < margin) {
        p.addScaledVector(_n, (margin - q) * Math.min(h.ax, h.az) + 40);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return p;
}

/** Refresh a fighter's cache of nearby ships (up to 4, nearest first). */
export function refreshNear(f, ships, hulls) {
  let n = 0;
  for (let i = 0; i < ships.length; i++) {
    const s = ships[i];
    const h = hulls[i];
    const d2 = f.pos.distanceToSquared(s.position);
    if (d2 > h.reach * h.reach) continue;
    if (n === 4 && d2 >= f.nearD[3]) continue; // list full and this one is farther
    // insertion sort into the small fixed list (overwrite the last entry when full)
    let k = n < 4 ? n : 3;
    while (k > 0 && f.nearD[k - 1] > d2) {
      f.near[k] = f.near[k - 1];
      f.nearH[k] = f.nearH[k - 1];
      f.nearD[k] = f.nearD[k - 1];
      k--;
    }
    f.near[k] = s;
    f.nearH[k] = h;
    f.nearD[k] = d2;
    if (n < 4) n++;
  }
  f.nearN = n;
}

/**
 * Steer clear of nearby hulls: evaluates the zone metric at the fighter and at a look-ahead point,
 * removes the inward component of the desired heading (so the fighter follows the surface) and pushes
 * outward, hard when already inside. Returns the smallest metric seen (1 = on the boundary).
 */
export function avoidHulls(f, desired) {
  const look = Math.min(480, f.speed * 1.5);
  _ahead.copy(f.pos).addScaledVector(f.vel, look);
  let best = Infinity;
  for (let i = 0; i < f.nearN; i++) {
    const s = f.near[i];
    const h = f.nearH[i];
    const q1 = hullMetric(s, h, _ahead, _n);
    if (q1 < best) {
      best = q1;
      _nBest.copy(_n);
    }
    const q0 = hullMetric(s, h, f.pos, _n);
    if (q0 < best) {
      best = q0;
      _nBest.copy(_n);
    }
  }
  f.skim = 0;
  if (best < 1.45) {
    const w = smoothstep(1.45, 1.0, best);
    const inward = desired.dot(_nBest);
    if (inward < 0)
      desired.addScaledVector(_nBest, -inward * (0.55 + 0.45 * w));
    desired.addScaledVector(_nBest, 0.85 * w);
    if (best < 1) desired.addScaledVector(_nBest, (1 - best) * 6);
    desired.normalize();
    f.skim = w;
  }
  return best;
}

// ---------------------------------------------------------------------------
// goals
// ---------------------------------------------------------------------------
export function lissajous(f, centre, r, t, out) {
  out
    .set(
      Math.sin(t * f.f1 + f.phase) * r,
      Math.sin(t * f.f2 + f.phase * 1.7) * r * 0.4,
      Math.cos(t * f.f3 + f.phase) * r,
    )
    .add(centre);
}

// formation slots in the leader frame (right, up, forward) in units of the type's spacing
const SLOTS = [
  [0, 0, 0],
  [-1.0, -0.15, -0.9],
  [1.0, -0.15, -0.9],
  [-2.0, -0.3, -1.8],
  [2.0, -0.3, -1.8],
  [0, -0.45, -2.7],
];

export function slotPosition(f, out) {
  const L = f.lead;
  frame(L.vel, _right, _up);
  const o = SLOTS[Math.min(f.slot, SLOTS.length - 1)];
  const s = f.def.spacing;
  const mirror = f.flight.mirror ? -1 : 1;
  return out
    .copy(L.pos)
    .addScaledVector(_right, o[0] * s * mirror)
    .addScaledVector(_up, o[1] * s)
    .addScaledVector(L.vel, o[2] * s);
}

// ---------------------------------------------------------------------------
// mode transitions
// ---------------------------------------------------------------------------
export function setPatrol(f, t) {
  f.mode = f.role === "cap" || !f.anchor ? MODE.CAP : MODE.PATROL;
  f.modeUntil = t + 5 + f.rng() * 10;
  f.phase = f.rng() * Math.PI * 2;
  // orbit radius in hull radii: tight enough that the weave keeps crossing the no-fly zone, which the
  // avoidance turns into passes along the hull
  f.orbitK = 0.85 + f.rng() * 0.75;
}

export function startAttack(f, t) {
  const ship = f.anchor;
  const s = ship.model.surface;
  const n = s.length / 3;
  if (!n) return false;
  // four candidate aim points on the hull; take the one facing the fighter
  let bestD = Infinity;
  for (let k = 0; k < 4; k++) {
    const i = Math.min(n - 1, Math.floor(f.rng() * n)) * 3;
    _a.set(s[i], s[i + 1], s[i + 2]).applyMatrix4(ship.matrix);
    const d = _a.distanceToSquared(f.pos);
    if (d < bestD) {
      bestD = d;
      f.aimLocal.set(s[i], s[i + 1], s[i + 2]);
    }
  }
  f.mode = MODE.ATTACK;
  f.modeUntil = t + 18;
  f.burst = 3;
  return true;
}

export function startBreak(f, t, ship, duration = 2.4) {
  _a.copy(f.pos).sub(ship.position).normalize();
  frame(f.vel, _right, _up);
  const side = f.rng() < 0.5 ? -1 : 1;
  f.breakDir
    .copy(_a)
    .addScaledVector(_right, side * 0.9)
    .addScaledVector(UP, 0.3)
    .normalize();
  f.mode = MODE.BREAK;
  f.modeUntil = t + duration + f.rng() * 1.4;
  f.breakSpin = side * (3.2 + f.rng() * 2);
}

export function endDogfight(f) {
  const q = f.quarry;
  if (q) {
    if (q.alive) {
      q.hunters = Math.max(0, q.hunters - 1);
      if (q.threat === f) q.threat = null;
    }
    f.quarry = null;
  }
}

export function startDogfight(f, q, t) {
  endDogfight(f);
  f.quarry = q;
  q.hunters++;
  if (!q.threat) q.threat = f;
  f.mode = MODE.DOGFIGHT;
  f.modeUntil = t + 6 + f.rng() * 6;
  f.burst = 3;
}

// ---------------------------------------------------------------------------
// firing (burst logic shared by all modes)
// ---------------------------------------------------------------------------
function shoot(f, ctx, target) {
  if (target) ctx.fire(f, target);
  else ctx.fire(f);
  ctx.stats[target ? "shotsFighter" : "shotsCapital"]++;
  f.burst--;
  if (f.burst > 0) f.fireTimer = 0.11;
  else {
    f.burst = 3;
    f.fireTimer = 2.2 + f.rng() * 2.6;
  }
}

// fire at a capital hull aim point (world) when in range and lined up
function tryFireHull(f, ctx, aim, maxRange = 1700, cone = 0.965) {
  if (!ctx.fire || f.fireTimer > 0 || !f.anchor) return;
  _b.copy(aim).sub(f.pos);
  const d = _b.length();
  if (d > maxRange || d < 60) return;
  if (_b.divideScalar(d).dot(f.vel) < cone) return;
  shoot(f, ctx, null);
}

function tryFireFighter(f, ctx, q, maxRange = 760) {
  if (!ctx.fire || f.fireTimer > 0 || !q || !q.alive || !f.anchor) return;
  _b.copy(q.pos).sub(f.pos);
  const d = _b.length();
  if (d > maxRange || d < 25) return;
  if (_b.divideScalar(d).dot(f.vel) < 0.985) return;
  shoot(f, ctx, q);
}

// ---------------------------------------------------------------------------
// steering
// ---------------------------------------------------------------------------

/** Leader steering: writes the desired heading, sets f.speedTarget, returns the turn rate. */
export function steerLeader(f, ctx, desired) {
  const t = ctx.time;
  const def = f.def;
  let turn = def.turn;
  f.spinRate = 0;
  switch (f.mode) {
    case MODE.PATROL:
    case MODE.CAP: {
      const cap = f.mode === MODE.CAP;
      const c = cap ? f.home : f.anchor;
      const R = cap ? f.homeR : f.anchorR;
      lissajous(f, c ? c.position : ORIGIN, R * f.orbitK, t, f.goal);
      f.speedTarget = def.speed[1] * f.speedK;
      // strafe the enemy hull while skimming along it
      if (
        !cap &&
        f.skim > 0.3 &&
        f.nearN &&
        f.near[0] === f.anchor &&
        f.anchor.health > 0
      )
        tryFireHull(f, ctx, f.anchor.position, 1500, 0.6);
      if (t >= f.modeUntil) {
        if (
          !cap &&
          f.anchor &&
          f.anchor.health > 0 &&
          f.pos.distanceToSquared(f.anchor.position) <
            f.anchorR * f.anchorR * 12
        ) {
          startAttack(f, t);
        } else {
          f.modeUntil = t + 4 + f.rng() * 6;
        }
      }
      break;
    }
    case MODE.ATTACK: {
      const ship = f.anchor;
      if (!ship || ship.health <= 0) {
        setPatrol(f, t);
        break;
      }
      f.goal.copy(f.aimLocal).applyMatrix4(ship.matrix);
      _a.copy(f.goal).sub(f.pos);
      const d = _a.length();
      const passed = _a.dot(f.vel) < 0 && d < 1200;
      if (passed || d < 260 || t >= f.modeUntil) {
        startBreak(f, t, ship);
        break;
      }
      f.speedTarget = def.speed[2] * f.speedK;
      turn = def.turn * 1.1;
      tryFireHull(f, ctx, f.goal);
      break;
    }
    case MODE.BREAK: {
      f.goal.copy(f.pos).addScaledVector(f.breakDir, 900);
      f.speedTarget = def.speed[2] * f.speedK;
      f.spinRate = f.breakSpin;
      turn = def.turn * 1.2;
      if (t >= f.modeUntil) setPatrol(f, t);
      break;
    }
    case MODE.DOGFIGHT: {
      const q = f.quarry;
      if (!q || !q.alive || t >= f.modeUntil) {
        endDogfight(f);
        f.noFightUntil = t + 12 + f.rng() * 20;
        setPatrol(f, t);
        break;
      }
      _a.copy(q.pos).sub(f.pos);
      const d = _a.length();
      if (d > 3200) {
        endDogfight(f);
        f.noFightUntil = t + 12 + f.rng() * 20;
        setPatrol(f, t);
        break;
      }
      const lead = clamp(d / 1100, 0.05, 0.8);
      f.goal.copy(q.pos).addScaledVector(q.vel, q.speed * lead);
      f.speedTarget =
        d > 220
          ? def.speed[2] * f.speedK
          : Math.min(def.speed[2] * f.speedK, q.speed + 15);
      turn = def.turn * 1.25;
      tryFireFighter(f, ctx, q);
      break;
    }
    case MODE.TRANSIT: {
      const dest = f.dest;
      if (!dest) {
        f.goal.copy(f.pos).addScaledVector(f.vel, 500);
      } else {
        f.goal.copy(dest.position).add(f.destOff);
        if (f.goal.distanceToSquared(f.pos) < 300 * 300) ctx.pickDest(f);
      }
      f.speedTarget = def.speed[1] * f.speedK;
      break;
    }
    default: {
      f.goal.copy(f.pos).addScaledVector(f.vel, 500);
      f.speedTarget = def.speed[1] * f.speedK;
    }
  }
  desired.copy(f.goal).sub(f.pos);
  const len = desired.length();
  if (len < 1) desired.copy(f.vel);
  else desired.divideScalar(len);
  return turn;
}

/** Wingman steering: hold the formation slot, fire alongside the leader. Returns the turn rate. */
export function steerWingman(f, ctx, desired) {
  const L = f.lead;
  const def = f.def;
  f.spinRate = 0;
  slotPosition(f, _a);
  _b.copy(_a).sub(f.pos);
  const d = _b.length();
  // near the slot the heading follows the leader; far away it points at the slot
  const blend = Math.max(45, 160 - d);
  desired.copy(L.vel).multiplyScalar(blend).add(_b);
  const len = desired.length();
  if (len < 1e-3) desired.copy(L.vel);
  else desired.divideScalar(len);
  const along = _b.dot(L.vel);
  f.speedTarget = clamp(
    L.speed + along * 0.9,
    def.speed[0],
    def.speed[2] * f.speedK,
  );
  // shoot with the leader
  if (L.mode === MODE.ATTACK && L.anchor && L.anchor.health > 0) {
    _c.copy(L.aimLocal).applyMatrix4(L.anchor.matrix);
    tryFireHull(f, ctx, _c, 1600, 0.955);
  } else if (L.mode === MODE.DOGFIGHT && L.quarry) {
    tryFireFighter(f, ctx, L.quarry);
  }
  return def.turn * 1.3;
}

/** Hunted fighters weave and roll. */
export function evade(f, ctx, desired) {
  const th = f.threat;
  if (!th) return;
  if (!th.alive || th.quarry !== f) {
    f.threat = null;
    return;
  }
  const t = ctx.time;
  frame(f.vel, _right, _up);
  desired
    .addScaledVector(_right, Math.sin(t * 2.3 + f.phase) * 0.8)
    .addScaledVector(_up, Math.cos(t * 1.7 + f.phase * 0.6) * 0.55)
    .normalize();
  f.speedTarget = f.def.speed[2] * f.speedK;
  f.spinRate = 2.6;
}

/**
 * Turn toward `desired` at most `turn` rad/s, accelerate toward the speed target, move, and update the
 * bank angle from the yaw rate (plus any commanded roll spin).
 */
export function integrate(f, dt, desired, turn) {
  _a.copy(f.vel);
  const cosA = clamp(f.vel.dot(desired), -1, 1);
  const ang = Math.acos(cosA);
  if (ang > 1e-4) {
    if (ang > 3.05) {
      // dead astern: nudge so the lerp has a direction to rotate through
      frame(f.vel, _right, _up);
      desired.addScaledVector(_right, 0.2).normalize();
    }
    const k = Math.min(1, (turn * dt) / ang);
    f.vel.lerp(desired, k).normalize();
  }
  const acc = 90 * dt;
  const target = clamp(f.speedTarget, f.def.speed[0], f.def.speed[2]);
  f.speed += clamp(target - f.speed, -acc, acc);
  f.pos.addScaledVector(f.vel, f.speed * dt);
  // yaw rate about world up -> bank; right turns (negative yaw) bank right (positive roll)
  const yaw = dt > 0 ? _a.cross(f.vel).y / dt : 0;
  const bankTarget = clamp(-yaw * 0.85, -1.25, 1.25);
  f.bank += (bankTarget - f.bank) * Math.min(1, dt * 5);
  if (f.spinRate !== 0) {
    f.spin += f.spinRate * dt;
    if (f.spin > Math.PI) f.spin -= Math.PI * 2;
    else if (f.spin < -Math.PI) f.spin += Math.PI * 2;
  } else if (f.spin !== 0) {
    // unwind the spin the short way once the manoeuvre ends
    f.spin -= f.spin * Math.min(1, dt * 3);
    if (Math.abs(f.spin) < 0.01) f.spin = 0;
  }
  f.roll = f.bank + f.spin;
}
