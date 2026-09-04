// Fighter traffic: TIE-style craft parked in the hangar racks that release, drop through the well, fly a
// patrol circuit around the ship and come back under the belly to be captured by the tractor field and
// re-racked. No NPC logic lives here: a `Pilot` decides *when* to launch / return, the `Fighter` owns the
// motion, and every pose is a pure function of (state, phase progress), so a peer given the same serialised
// state renders the same craft. Draw cost: three merged meshes per near fighter, two InstancedMesh draw
// calls for every fighter beyond TIE.farDistance.
//
// Phases (FIGHTER_STATES):
//   parked   hanging in the rack, pod centre at HANGAR.rackY
//   release  clamps open: vertical drop through the well with a small drift toward the well centre, ends
//            6 m below the keel (y = -92) at ~14 m/s straight down
//   launch   Hermite track from the well exit: pitch over, accelerate forward, bank out to the patrol
//            circuit; joins it with matching position, tangent and speed
//   patrol   closed circuit (belt below the ship, trench run along the far flank, overflight of the
//            superstructure, high belt, or a formation pair on offset belts); laps until the pilot asks to
//            return, then leaves the circuit at its exit node
//   approach curved approach from aft / below into the lane under the keel, flare to vertical under the
//            well, arriving 6 m below the keel at 5 m/s straight up
//   capture  tractor lift straight up through the well onto the rack, decelerating to rest
// Velocity is continuous across every boundary (tangents and speeds match), heading comes from a lookAt
// along the aim vector, and bank is derived from the heading rate (path curvature) over a short window.
import * as THREE from "three";
import { HANGAR, HULL, SUPERSTRUCTURE, TOWER, ENGINES } from "../config/shipSpec.js";
import { buildTie, buildTieFar, makeSun, TIE } from "./tie.js";

export const FIGHTER_STATES = ["parked", "release", "launch", "patrol", "approach", "capture"];

const DEV = typeof import.meta !== "undefined" && import.meta.env ? !!import.meta.env.DEV : true;

// ---------------------------------------------------------------------------
// Pilots
// ---------------------------------------------------------------------------

/**
 * Pilot interface: policy only. A pilot decides *when* a fighter leaves the rack and when it comes home,
 * never where it is; motion belongs to the Fighter and is a pure function of its serialisable state, so
 * a scripted pilot, an NPC AI or a networked peer replaying `applyState()` all produce identical flight.
 *
 * `update(fighter, dt)` is called once per simulation step for every fighter the pilot is assigned to
 * (`traffic.setPilot(id, pilot)`; one pilot instance may drive several fighters, see FormationPilot).
 * It may call:
 *   fighter.requestLaunch()  honoured only while `parked`  -> release
 *   fighter.requestReturn()  honoured only while `patrol`  -> leaves the circuit at its exit node
 * Read-only queries: `fighter.state`, `fighter.t` (0..1 progress in the phase), `fighter.phaseTime`
 * (seconds in the phase), `fighter.returnRequested`, `fighter.mesh.position` / `.quaternion`,
 * `fighter.lapRemaining()` (seconds until the circuit exit is reached).
 * Effects hooks: `fighter.onEvent = (fighter, state) => {}` fires on every phase entry (including
 * "parked" and each completed "lap").
 */
export class Pilot {
  update(_fighter, _dt) {}
}

/** Default pilot: timers seeded per fighter so the launches and returns stagger. */
export class ScriptedPilot extends Pilot {
  constructor(seed = 1) {
    super();
    this.t = 0;
    this.parkTime = 6 + ((seed * 7.3) % 20);
    this.patrolTime = 30 + ((seed * 11.7) % 45);
  }
  update(f, dt) {
    this.t += dt;
    if (f.state === "parked" && this.t > this.parkTime) {
      f.requestLaunch();
      this.t = 0;
    } else if (f.state === "patrol" && !f.returnRequested && this.t > this.patrolTime) {
      f.requestReturn();
      this.t = 0;
    }
  }
}

/**
 * Example of a multi-craft pilot: one instance assigned to two (or more) fighters launches them together
 * and brings them home together. The traffic builder gives the pair offset copies of the same circuit and
 * matches their phase durations, so they hold formation without any steering logic here.
 *
 *   const pair = new FormationPilot([traffic.fighters[4], traffic.fighters[5]], { parkTime: 20 });
 *   traffic.setPilot(4, pair); traffic.setPilot(5, pair);
 */
export class FormationPilot extends Pilot {
  constructor(members, { parkTime = 18, patrolTime = 70 } = {}) {
    super();
    this.members = members;
    this.parkTime = parkTime;
    this.patrolTime = patrolTime;
    this.t = 0;
  }
  update(f, dt) {
    if (f !== this.members[0]) return; // the leader's tick drives the whole element
    this.t += dt;
    const all = (s) => this.members.every((m) => m.state === s);
    if (all("parked") && this.t > this.parkTime) {
      for (const m of this.members) m.requestLaunch();
      this.t = 0;
    } else if (all("patrol") && !this.members[0].returnRequested && this.t > this.patrolTime) {
      for (const m of this.members) m.requestReturn();
      this.t = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Tracks: C1 Hermite splines (cubic Beziers with shared unit tangents), arc-length parametrised
// ---------------------------------------------------------------------------
const node = (x, y, z, t = null) => ({ p: new THREE.Vector3(x, y, z), t: t ? new THREE.Vector3(...t).normalize() : null });

function tangentsFor(nodes, closed) {
  const n = nodes.length;
  return nodes.map((nd, i) => {
    if (nd.t) return nd.t.clone().normalize();
    const prev = nodes[(i - 1 + n) % n].p;
    const next = nodes[(i + 1) % n].p;
    if (!closed && i === 0) return next.clone().sub(nd.p).normalize();
    if (!closed && i === n - 1) return nd.p.clone().sub(prev).normalize();
    return next.clone().sub(prev).normalize();
  });
}

class Track {
  constructor(nodes, closed = false) {
    this.nodes = nodes;
    this.closed = closed;
    this.tangents = tangentsFor(nodes, closed);
    const path = new THREE.CurvePath();
    const n = nodes.length;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = nodes[i].p;
      const b = nodes[(i + 1) % n].p;
      const chord = a.distanceTo(b);
      const c1 = a.clone().addScaledVector(this.tangents[i], chord / 3);
      const c2 = b.clone().addScaledVector(this.tangents[(i + 1) % n], -chord / 3);
      const curve = new THREE.CubicBezierCurve3(a, c1, c2, b);
      curve.arcLengthDivisions = 400;
      path.add(curve);
    }
    path.arcLengthDivisions = 100 * segs;
    this.path = path;
    this.cumulative = path.getCurveLengths();
    this.length = path.getLength();
  }
  /** arc length at node k */
  nodeDistance(k) {
    return k === 0 ? 0 : this.cumulative[k - 1];
  }
  pointAt(s, out) {
    if (this.closed) s = ((s % this.length) + this.length) % this.length;
    return this.path.getPoint(THREE.MathUtils.clamp(s / this.length, 0, 1), out);
  }
  tangentAt(s, out) {
    const h = 1.5;
    if (this.closed) {
      this.pointAt(s + h, out);
      this.pointAt(s - h, _t0);
    } else {
      this.pointAt(Math.min(this.length, s + h), out);
      this.pointAt(Math.max(0, s - h), _t0);
    }
    return out.sub(_t0).normalize();
  }
}

/** Piecewise constant-acceleration speed profile along a track: pieces of { length, v0, v1 }. */
class SpeedProfile {
  constructor(pieces) {
    this.pieces = pieces.map((p) => {
      const T = (2 * p.length) / (p.v0 + p.v1);
      return { ...p, T, a: (p.v1 * p.v1 - p.v0 * p.v0) / (2 * p.length) };
    });
    this.duration = this.pieces.reduce((s, p) => s + p.T, 0);
    this.length = this.pieces.reduce((s, p) => s + p.length, 0);
  }
  distanceAt(tau) {
    let s = 0;
    for (const p of this.pieces) {
      if (tau <= p.T) return s + p.v0 * tau + 0.5 * p.a * tau * tau;
      tau -= p.T;
      s += p.length;
    }
    return this.length;
  }
  speedAt(tau) {
    for (const p of this.pieces) {
      if (tau <= p.T) return p.v0 + p.a * tau;
      tau -= p.T;
    }
    return this.pieces[this.pieces.length - 1].v1;
  }
}

// Two fighters flying formation must spend the same time in a phase although their tracks differ in
// length: solve the intermediate speed of a two-piece profile so its duration hits `targetT`.
function profileMatching(len, v0, v1, targetT, split = 0.35) {
  const L1 = len * split;
  const L2 = len - L1;
  const dur = (vm) => (2 * L1) / (v0 + vm) + (2 * L2) / (vm + v1);
  let lo = Math.min(v0, v1) * 0.5;
  let hi = Math.max(v0, v1) * 2.5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (dur(mid) > targetT) lo = mid;
    else hi = mid;
  }
  return new SpeedProfile([
    { length: L1, v0, v1: (lo + hi) / 2 },
    { length: L2, v0: (lo + hi) / 2, v1 },
  ]);
}

// ---------------------------------------------------------------------------
// Flight plans: the circuits and their approaches, per rack
// ---------------------------------------------------------------------------
const WELL_EXIT_Y = HULL.keelPlate.y - 10; // craft fully below the keel block
const RELEASE_T = 4.8;
const CAPTURE_V = 5;
const LANE_Y = -235;

// Every circuit is entered at node 0, which sits ahead of the well on the launch side with a tangent that
// continues the launch's outward bank (~20 degrees off the ship axis), and is closed by a leg that runs
// back under (or over) the belly, so the pattern entry is one smooth turn rather than an S.
const ENTRY = (S, y = -300) => node(S * 250, y, -400);

function flankX(S, z, offset = 110) {
  return S * (HULL.halfWidthAt(z) + offset);
}

// The approach lane is shared: behind the stern, under the keel, flare up under the well.
function laneNodes(S, xE, zE) {
  return [
    node(xE + S * 40, LANE_Y, 1150, [-S * 0.15, 0.03, -0.99]),
    node(xE, -190, 860, [0, 0.1, -1]),
    node(xE, -158, 640, [0, 0.16, -1]),
    node(xE, -118, zE + 30, [0, 0.62, -0.78]),
    node(xE, WELL_EXIT_Y, zE, [0, 1, 0]),
  ];
}

/**
 * Circuit recipes. Each returns { loop: nodes (closed), exit: index of the node where the approach leaves,
 * approach: nodes from just after the exit to just before the lane }.
 */
const RECIPES = {
  // wide belt below the ship: out around the bow, far side, behind the stern, back under the belly
  beltLow(S, v = 0) {
    const w = 1 + 0.12 * v;
    const y = -300 - 30 * v;
    const loop = [
      ENTRY(S, y),
      node(S * 560 * w, y - 30, -950),
      node(S * 420 * w, y - 40, -1550 * w),
      node(-S * 380 * w, y - 30, -1650 * w),
      node(-S * 950 * w, y, -1000),
      node(-S * 1100 * w, y + 20, -100),
      node(-S * 950 * w, y + 10, 850),
      node(-S * 450 * w, y + 20, 1450),
      node(S * 260, y + 30, 1450),
      node(S * 150, y + 10, 800),
      node(S * 130, y, 250),
    ];
    return {
      loop,
      exit: 7,
      approach: [node(-S * 120, y + 30, 1480, [S * 1, 0, 0.05]), node(S * 110, -255, 1300, [S * 0.12, 0.02, -1])],
    };
  },
  // around the bow, then a straight run aft along the far flank at trench height, home behind the stern
  trenchRun(S) {
    const fl = (z) => node(flankX(-S, z), -8, z, [-S * 0.28125, 0, 1]);
    const loop = [
      ENTRY(S),
      node(S * 560, -200, -950),
      node(-S * 150, -40, -1550),
      fl(-500),
      fl(0),
      fl(500),
      node(-S * 640, -60, 1000),
      node(-S * 720, -160, 1420),
      node(-S * 300, -220, 1720),
      node(S * 300, -260, 1500),
      node(S * 280, -290, 850),
      node(S * 130, -310, 250),
    ];
    return { loop, exit: 8, approach: [node(S * 80, -250, 1620, [S * 0.75, 0, -0.65]), node(S * 130, -248, 1330, [-S * 0.15, 0.02, -0.99])] };
  },
  // climbs around the bow and crosses back over the superstructure and beside the tower
  overflight(S) {
    const loop = [
      ENTRY(S),
      node(S * 520, -180, -1000),
      node(S * 250, 40, -1550),
      node(-S * 130, 220, -1050),
      node(S * 40, 300, -250),
      node(S * 200, 420, 450),
      node(S * 330, 340, 1150),
      node(S * 760, 60, 1580),
      node(S * 450, -230, 1000),
      node(S * 150, -310, 300),
    ];
    return {
      loop,
      exit: 6,
      approach: [node(S * 720, 60, 1620, [S * 0.35, -0.5, 0.65]), node(S * 560, -160, 1980, [-S * 0.85, -0.25, 0.1]), node(S * 150, -240, 1720, [-S * 0.4, -0.02, -0.9])],
    };
  },
  // high belt: pulls up out of the launch dive, rings the ship above the tower height, returns over the deck
  beltHigh(S) {
    const loop = [
      node(S * 380, 40, -650),
      node(S * 620, 160, -1250),
      node(S * 300, 260, -1700),
      node(-S * 350, 300, -1650),
      node(-S * 900, 320, -1000),
      node(-S * 1050, 340, -100),
      node(-S * 900, 320, 850),
      node(-S * 450, 300, 1450),
      node(S * 320, 310, 1450),
      node(S * 270, 300, 800),
      node(S * 260, 200, 150),
    ];
    return {
      loop,
      exit: 7,
      approach: [node(-S * 150, 90, 1560, [S * 0.9, -0.3, 0.2]), node(S * 110, -180, 1330, [S * 0.1, -0.25, -0.96])],
      climb: true,
    };
  },
};

// which recipe each rack index flies; 4 and 5 are the formation pair (both to +X)
function planFor(i, rack) {
  const S = rack.x < 0 ? -1 : 1;
  const v = Math.floor(i / 6); // racks 6 and 7 reuse the first recipes on shifted circuits
  let plan;
  switch (i % 6) {
    case 0:
      plan = { S, ...RECIPES.beltLow(S, v * 3), cruise: 125 };
      break;
    case 1:
      plan = { S, ...RECIPES.trenchRun(S), cruise: 120 };
      break;
    case 2:
      plan = { S, ...RECIPES.overflight(S), cruise: 130 };
      break;
    case 3:
      plan = { S, ...RECIPES.beltHigh(S), cruise: 125 };
      break;
    default: {
      const lead = RECIPES.beltLow(1, 2);
      const offset = i % 6 === 5 ? new THREE.Vector3(55, -18, 40) : null;
      if (offset) {
        for (const nd of lead.loop) nd.p.add(offset);
        for (const nd of lead.approach) nd.p.add(offset);
      }
      plan = { S: 1, ...lead, cruise: 115, formation: v * 6 + 4 };
    }
  }
  if (v > 0) {
    const shift = new THREE.Vector3(0, -70 * v, 0);
    for (const nd of plan.loop) nd.p.add(shift);
    for (const nd of plan.approach) nd.p.add(shift);
  }
  return plan;
}

function buildTracks(i, rack) {
  const plan = planFor(i, rack);
  const S = plan.S;
  const rackSide = rack.x < 0 ? -1 : 1;
  const xE = rack.x - rackSide * 2.5;
  const zE = rack.z;
  const loop = new Track(plan.loop, true);
  const J = plan.loop[0];
  const X = plan.loop[plan.exit];
  // drop straight down, pitch over into a forward dive, then one outward bank onto the circuit entry
  const launch = new Track([
    node(xE, WELL_EXIT_Y, zE, [0, -1, 0]),
    node(xE + S * 3, -150, zE - 75, [S * 0.1, -0.55, -1]),
    plan.climb ? node(xE + S * 80, -220, zE - 330, [S * 0.42, 0.12, -0.9]) : node(xE + S * 60, -245, zE - 360, [S * 0.34, -0.15, -0.93]),
    { p: J.p.clone(), t: loop.tangents[0].clone() },
  ]);
  const approach = new Track([{ p: X.p.clone(), t: loop.tangents[plan.exit].clone() }, ...plan.approach, ...laneNodes(S, xE, zE)]);
  return { plan, xE, zE, loop, launch, approach, exitDistance: loop.nodeDistance(plan.exit) };
}

// ---------------------------------------------------------------------------
// Hull clearance (dev check): the ship as a conservative set of boxes
// ---------------------------------------------------------------------------
function hullBoxes() {
  const boxes = [];
  const box = (x0, y0, z0, x1, y1, z1) => boxes.push(new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)));
  const N = 40;
  for (let i = 0; i < N; i++) {
    const z0 = HULL.bowZ + (i / N) * HULL.length;
    const z1 = z0 + HULL.length / N;
    const hw = HULL.halfWidthAt(z1) + 6;
    box(-hw, Math.min(HULL.ventralY(0, z1), -HULL.trenchHeight / 2), z0, hw, Math.max(HULL.dorsalY(0, z1), HULL.trenchHeight / 2), z1);
  }
  for (const [hx, z0, z1, yTop] of SUPERSTRUCTURE.terraces) box(-hx, 0, z0, hx, yTop, z1);
  const nk = TOWER.neck;
  box(-nk.halfX, nk.y0, nk.z0, nk.halfX, nk.y1, nk.z1);
  const sl = TOWER.slab;
  box(-sl.halfX, sl.y0, sl.z0, sl.halfX, sl.y1, sl.z1);
  const r = TOWER.domes.radius;
  for (const [x, y, z] of TOWER.domes.positions) box(x - r, y - r, z - r, x + r, y + r, z + r);
  const sp = TOWER.spire;
  box(sp.x - 8, sp.y0, sp.z - 8, sp.x + 8, sp.y1, sp.z + 8);
  for (const [x, y] of ENGINES.main.positions) box(x - ENGINES.main.radius, y - ENGINES.main.radius, ENGINES.sternZ - 10, x + ENGINES.main.radius, y + ENGINES.main.radius, ENGINES.sternZ + 45);
  for (const [x, y] of ENGINES.aux.positions) box(x - ENGINES.aux.radius, y - ENGINES.aux.radius, ENGINES.sternZ - 10, x + ENGINES.aux.radius, y + ENGINES.aux.radius, ENGINES.sternZ + 20);
  const k = HULL.keelPlate;
  const w = HANGAR.well;
  box(-k.x - 1, k.y, k.z0 - 1, w.x0, -20, k.z1 + 1);
  box(w.x1, k.y, k.z0 - 1, k.x + 1, -20, k.z1 + 1);
  box(w.x0, k.y, k.z0 - 1, w.x1, -20, w.z0);
  box(w.x0, k.y, w.z1, w.x1, -20, k.z1 + 1);
  return boxes;
}

// the column under the keel block where launch / approach necessarily pass close to the hull
const inWellCorridor = (p) => Math.abs(p.x) <= 70 && p.z >= 300 && p.z <= 720 && p.y <= HANGAR.deckY;

/**
 * Dev-only: sample every track and report the smallest hull clearance. Patrol circuits and the parts of
 * launch / approach outside the well corridor must keep >= 60 m between the hull and the craft body;
 * inside the corridor the craft must stay >= 5 m clear of the keel block. Returns { ok, worst[] }.
 */
export function checkClearance(fighters, minClear = 60) {
  const boxes = hullBoxes();
  const body = Math.max(TIE.halfExtents.x, TIE.halfExtents.y, TIE.halfExtents.z);
  const p = new THREE.Vector3();
  const worst = [];
  let ok = true;
  const clearanceAt = (pt) => {
    let d = Infinity;
    for (const b of boxes) d = Math.min(d, b.distanceToPoint(pt));
    return d - body;
  };
  for (const f of fighters) {
    for (const name of ["patrol", "launch", "approach"]) {
      const track = f.tracks[name];
      let min = Infinity;
      let at = null;
      for (let s = 0; s <= track.length; s += 15) {
        track.pointAt(s, p);
        const corridor = name !== "patrol" && inWellCorridor(p);
        const need = corridor ? 5 : minClear;
        const c = clearanceAt(p);
        if (c - need < min) {
          min = c - need;
          at = { x: +p.x.toFixed(0), y: +p.y.toFixed(0), z: +p.z.toFixed(0), clearance: +c.toFixed(1), need };
        }
      }
      if (min < 0) ok = false;
      worst.push({ fighter: f.id, track: name, margin: +min.toFixed(1), ...at });
    }
    // the drop / rise must stay inside the well rectangle with a 3 m margin
    const w = HANGAR.well;
    const hx = TIE.halfExtents.x;
    const hz = TIE.halfExtents.z;
    const wellOk = f.xE - hx >= w.x0 + 3 && f.xE + hx <= w.x1 - 3 && f.zE - hz >= w.z0 + 3 && f.zE + hz <= w.z1 - 3;
    if (!wellOk) ok = false;
    worst.push({ fighter: f.id, track: "well", margin: wellOk ? 3 : -1, x: f.xE, z: f.zE });
  }
  return { ok, worst };
}

// ---------------------------------------------------------------------------
// Fighter
// ---------------------------------------------------------------------------
const NEXT = { release: "launch", launch: "patrol", approach: "capture", capture: "parked" };
const PREV = { launch: "release", approach: "patrol", capture: "approach", release: "parked" };
const FWD = new THREE.Vector3(0, 0, -1);
const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);
const AIM_BIAS = 18; // m/s of "keep the nose forward" blended into the aim below AIM_FADE speed
const AIM_FADE = 70;
const BANK_WINDOW = 1.2; // s each side for the heading-rate estimate
const BANK_G = 26; // lateral acceleration (m/s^2) that reads as a 45 degree bank
const _t0 = new THREE.Vector3();
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();
const _a = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qr = new THREE.Quaternion();
const _sh = { state: "parked", t: 0 };
const smooth = (k) => k * k * (3 - 2 * k);
const dsmooth = (k) => 6 * k * (1 - k);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Fighter {
  constructor(id, rack, tracks, mesh) {
    this.id = id;
    this.rack = rack; // Vector3, craft centre when parked
    this.mesh = mesh;
    this.tracks = { launch: tracks.launch, patrol: tracks.loop, approach: tracks.approach };
    this.xE = tracks.xE;
    this.zE = tracks.zE;
    this.cruise = tracks.plan.cruise;
    this.formation = tracks.plan.formation ?? null;
    this.state = "parked";
    this.t = 0; // 0..1 progress within the current phase
    this.lap = 0; // completed circuits since the launch (0 = still on the entry lap)
    this.returnRequested = false;
    this.pilot = null;
    this.onEvent = null;
    this.far = false;
    this.dropHeight = rack.y - WELL_EXIT_Y;
    const vE = (2 * this.dropHeight) / RELEASE_T;
    this.profiles = {
      launch: new SpeedProfile([
        { length: Math.min(320, tracks.launch.length * 0.2), v0: vE, v1: 75 },
        { length: tracks.launch.length - Math.min(320, tracks.launch.length * 0.2), v0: 75, v1: this.cruise },
      ]),
      approach: this._approachProfile(tracks.approach, this.cruise),
    };
    this.durations = {
      parked: Infinity,
      release: RELEASE_T,
      launch: this.profiles.launch.duration,
      patrol: tracks.loop.length / this.cruise,
      approach: this.profiles.approach.duration,
      capture: (2 * this.dropHeight) / CAPTURE_V,
    };
    this.exitT = tracks.exitDistance / tracks.loop.length;
    this.mesh.position.copy(rack);
  }
  _approachProfile(track, cruise) {
    // cruise to the lane entry, brake along the lane, crawl through the flare
    const n = track.nodes.length;
    const laneStart = track.nodeDistance(n - 5);
    const flareStart = track.nodeDistance(n - 2);
    return new SpeedProfile([
      { length: laneStart, v0: cruise, v1: 55 },
      { length: flareStart - laneStart, v0: 55, v1: 14 },
      { length: track.length - flareStart, v0: 14, v1: CAPTURE_V },
    ]);
  }
  /** Make this craft's launch / approach take as long as `leader`'s so a pair stays in formation. */
  matchTiming(leader) {
    const vE = (2 * this.dropHeight) / RELEASE_T;
    this.profiles.launch = profileMatching(this.tracks.launch.length, vE, this.cruise, leader.durations.launch);
    this.durations.launch = this.profiles.launch.duration;
    const ap = this.tracks.approach;
    const n = ap.nodes.length;
    const laneStart = ap.nodeDistance(n - 5);
    const flareStart = ap.nodeDistance(n - 2);
    const tail = new SpeedProfile([
      { length: flareStart - laneStart, v0: 55, v1: 14 },
      { length: ap.length - flareStart, v0: 14, v1: CAPTURE_V },
    ]);
    const head = profileMatching(laneStart, this.cruise, 55, leader.durations.approach - tail.duration, 0.5);
    this.profiles.approach = new SpeedProfile([...head.pieces, ...tail.pieces].map(({ length, v0, v1 }) => ({ length, v0, v1 })));
    this.durations.approach = this.profiles.approach.duration;
  }
  get phaseTime() {
    return this.t * this.durations[this.state];
  }
  lapRemaining() {
    if (this.state !== "patrol") return 0;
    const dt = this.t <= this.exitT ? this.exitT - this.t : 1 - this.t + this.exitT;
    return dt * this.durations.patrol;
  }
  requestLaunch() {
    if (this.state === "parked") this._enter("release");
  }
  requestReturn() {
    if (this.state === "patrol") this.returnRequested = true;
  }
  _enter(state) {
    this.state = state;
    this.t = 0;
    if (state === "patrol") this.lap = 0;
    if (this.onEvent) this.onEvent(this, state);
  }
  _boundary(state = this.state, ret = this.returnRequested, t = this.t) {
    return state === "patrol" && ret && t < this.exitT ? this.exitT : 1;
  }
  _advancePhase() {
    if (this.state === "patrol") {
      if (this.returnRequested && Math.abs(this.t - this.exitT) < 1e-9) {
        this.returnRequested = false;
        this._enter("approach");
      } else {
        this.t = 0;
        this.lap++;
        if (this.onEvent) this.onEvent(this, "lap");
      }
      return;
    }
    const next = NEXT[this.state];
    if (next === "parked") {
      this.state = "parked";
      this.t = 0;
      if (this.onEvent) this.onEvent(this, "parked");
    } else this._enter(next);
  }
  update(dt) {
    if (this.pilot) this.pilot.update(this, dt);
    if (this.state === "parked") {
      this.pose();
      return;
    }
    // advance with carry-over across phase boundaries: no time is lost at a transition
    let rem = dt;
    while (rem > 0 && this.state !== "parked") {
      const T = this.durations[this.state];
      const boundary = this._boundary();
      const left = (boundary - this.t) * T;
      if (rem < left) {
        this.t += rem / T;
        rem = 0;
      } else {
        rem -= left;
        this.t = boundary;
        this._advancePhase();
      }
    }
    this.pose();
  }
  /** Position and velocity for (state, t): the deterministic core every pose is derived from. */
  kinematics(state, t, P, V) {
    const rack = this.rack;
    switch (state) {
      case "release": {
        const T = this.durations.release;
        const tau = t * T;
        const a = (2 * this.dropHeight) / (T * T);
        P.set(rack.x + (this.xE - rack.x) * smooth(t), rack.y - 0.5 * a * tau * tau, rack.z);
        V.set(((this.xE - rack.x) * dsmooth(t)) / T, -a * tau, 0);
        return;
      }
      case "capture": {
        const T = this.durations.capture;
        const tau = t * T;
        const a = (CAPTURE_V * CAPTURE_V) / (2 * this.dropHeight);
        P.set(this.xE + (rack.x - this.xE) * smooth(t), WELL_EXIT_Y + CAPTURE_V * tau - 0.5 * a * tau * tau, rack.z);
        V.set(((rack.x - this.xE) * dsmooth(t)) / T, CAPTURE_V - a * tau, 0);
        return;
      }
      case "launch":
      case "approach": {
        const track = this.tracks[state];
        const prof = this.profiles[state];
        const tau = t * this.durations[state];
        const s = prof.distanceAt(tau);
        track.pointAt(s, P);
        track.tangentAt(s, V).multiplyScalar(prof.speedAt(tau));
        return;
      }
      case "patrol": {
        const track = this.tracks.patrol;
        const s = t * track.length;
        track.pointAt(s, P);
        track.tangentAt(s, V).multiplyScalar(this.cruise);
        return;
      }
      default:
        P.copy(rack);
        V.set(0, 0, 0);
    }
  }
  // nose direction: the velocity, blended toward "level, forward" as the craft slows (drop, tractor lift)
  _aim(V, out) {
    const speed = V.length();
    const bias = AIM_BIAS * THREE.MathUtils.clamp(1 - speed / AIM_FADE, 0, 1);
    out.copy(V).addScaledVector(FWD, bias);
    if (out.lengthSq() < 1e-8) out.copy(FWD);
    return out;
  }
  _heading(state, t) {
    this.kinematics(state, t, _p, _v);
    this._aim(_v, _a);
    return Math.atan2(-_a.x, -_a.z);
  }
  // (state, t) shifted by dtau seconds along the deterministic phase sequence; result in `out`
  _shift(state, t, ret, lap, dtau, out) {
    let rem = dtau;
    if (rem >= 0) {
      while (state !== "parked") {
        const T = this.durations[state];
        const boundary = this._boundary(state, ret, t);
        const left = (boundary - t) * T;
        if (rem < left) {
          t += rem / T;
          break;
        }
        rem -= left;
        if (state === "patrol") {
          if (ret && boundary === this.exitT) {
            state = "approach";
            ret = false;
          } else lap++;
          t = 0;
        } else {
          state = NEXT[state];
          t = 0;
        }
      }
    } else {
      rem = -rem;
      while (state !== "parked") {
        const T = this.durations[state];
        const passed = t * T;
        if (rem < passed) {
          t -= rem / T;
          break;
        }
        rem -= passed;
        if (state === "patrol") {
          // the entry lap was preceded by the launch, later laps by the previous lap
          if (lap === 0) state = "launch";
          else lap--;
          t = 1;
        } else if (state === "approach") {
          state = "patrol";
          t = this.exitT;
        } else {
          state = PREV[state];
          t = 1;
        }
      }
    }
    out.state = state;
    out.t = state === "parked" ? 0 : t;
    return out;
  }
  /** Deterministic pose for (state, t, returnRequested); writes mesh.position / mesh.quaternion. */
  pose() {
    const state = this.state;
    const t = THREE.MathUtils.clamp(this.t, 0, 1);
    if (state === "parked") {
      this.mesh.position.copy(this.rack);
      this.mesh.quaternion.identity();
      return;
    }
    this.kinematics(state, t, this.mesh.position, _v);
    const speed = _v.length();
    this._aim(_v, _a);
    _m.lookAt(ZERO, _a, UP);
    this.mesh.quaternion.setFromRotationMatrix(_m);
    // bank from the heading rate over a short window straddling phase boundaries (curvature x speed)
    this._shift(state, t, this.returnRequested, this.lap, BANK_WINDOW, _sh);
    const h1 = this._heading(_sh.state, _sh.t);
    this._shift(state, t, this.returnRequested, this.lap, -BANK_WINDOW, _sh);
    const h0 = this._heading(_sh.state, _sh.t);
    const rate = wrapAngle(h1 - h0) / (2 * BANK_WINDOW);
    const bank = Math.atan2(speed * rate, BANK_G);
    _qr.setFromAxisAngle(FWD, -bank);
    this.mesh.quaternion.multiply(_qr);
  }
  /** { id, state, t, lap?, ret? } — everything a peer needs to reproduce the pose with applyState(). */
  serialize() {
    const st = { id: this.id, state: this.state, t: +this.t.toFixed(4) };
    if (this.lap) st.lap = this.lap;
    if (this.returnRequested) st.ret = 1;
    return st;
  }
  applyState(st) {
    this.state = st.state;
    this.t = st.t;
    this.lap = st.lap || 0;
    this.returnRequested = !!st.ret;
    this.pose();
  }
}

// ---------------------------------------------------------------------------
// LOD controller: THREE.LOD's update(camera) hook runs inside the renderer's scene traversal, before the
// children are collected, so toggling the detail meshes and refilling the far InstancedMesh here is
// frame-exact (no one-frame lag) without main.js having to pass the camera in.
// ---------------------------------------------------------------------------
class FighterLOD extends THREE.LOD {
  constructor(fighters, far, farGlow) {
    super();
    this.name = "fighterLOD";
    this.fighters = fighters;
    this.far = far;
    this.farGlow = farGlow;
    this.autoUpdate = true;
  }
  update(camera) {
    _p.setFromMatrixPosition(camera.matrixWorld);
    let n = 0;
    for (const f of this.fighters) {
      const d = f.mesh.position.distanceTo(_p) / camera.zoom;
      f.far = d >= (f.far ? TIE.farDistance * 0.9 : TIE.farDistance);
      f.mesh.visible = !f.far;
      if (f.far) {
        _m.compose(f.mesh.position, f.mesh.quaternion, ONE);
        this.far.setMatrixAt(n, _m);
        this.farGlow.setMatrixAt(n, _m);
        n++;
      }
    }
    this.far.count = n;
    this.farGlow.count = n;
    this.far.visible = n > 0;
    this.farGlow.visible = n > 0;
    if (n > 0) {
      this.far.instanceMatrix.needsUpdate = true;
      this.farGlow.instanceMatrix.needsUpdate = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Traffic
// ---------------------------------------------------------------------------
/**
 * @param {object} o
 * @param {THREE.Scene} o.scene
 * @param {number} [o.count=6]         fighters (<= racks in the spec, 8)
 * @param {object} [o.audio]           audio hooks: play("hangar.launch" | "hangar.capture", mesh)
 * @param {object} [o.sun]             shared sun uniforms { dir: { value: Vector3 }, color: { value: Color } }
 *                                     (pass exterior.sun); without it the fighters follow the "space" root's
 *                                     rotation to stay lit from the same direction as the hull
 */
export function createTraffic({ scene, count = 6, audio = null, sun = null }) {
  const group = new THREE.Group();
  group.name = "traffic";
  scene.add(group);
  const ownSun = !sun;
  const sunU = sun || makeSun();
  const template = buildTie({ variant: 0, sun: sunU });

  const racks = [];
  for (const rz of HANGAR.rackZ) for (const rx of HANGAR.rackX) racks.push(new THREE.Vector3(rx, HANGAR.rackY, rz));
  const n = Math.min(count, racks.length);

  const fighters = [];
  for (let i = 0; i < n; i++) {
    const rack = racks[i];
    const tracks = buildTracks(i, rack);
    const mesh = buildTie({ variant: i, sun: sunU });
    mesh.name = "fighter_" + i;
    const f = new Fighter(i, rack, tracks, mesh);
    f.onEvent = (fighter, state) => {
      if (audio && state === "release") audio.play("hangar.launch", fighter.mesh);
      if (audio && state === "capture") audio.play("hangar.capture", fighter.mesh);
    };
    fighters.push(f);
  }
  // pilots: scripted timers, one FormationPilot per pair
  for (const f of fighters) {
    if (f.formation === null) f.pilot = new ScriptedPilot(f.id + 1);
    else if (f.id === f.formation) {
      const wing = fighters[f.id + 1];
      if (wing && wing.formation === f.formation) {
        wing.matchTiming(f);
        const pilot = new FormationPilot([f, wing], { parkTime: 16 + f.id * 3, patrolTime: 75 });
        f.pilot = pilot;
        wing.pilot = pilot;
      } else f.pilot = new ScriptedPilot(f.id + 1);
    }
  }
  // stagger the initial phases so the sky is not empty at start: fighter 1 and the formation pair are
  // already out on patrol, timed so a recovery happens within the first two minutes
  for (const f of fighters) {
    if (f.id === 1 || f.formation !== null) {
      f.state = "patrol";
      f.lap = 1;
      const lead = f.formation !== null ? 45 : 20;
      f.t = Math.max(0, f.exitT - lead / f.durations.patrol);
      if (f.pilot) f.pilot.t = f.pilot.patrolTime - (f.formation !== null ? 30 : 10);
    }
    f.pose();
  }

  // far LOD: one instanced body + one instanced glow quad for every distant fighter
  const farParts = buildTieFar(sunU);
  const far = new THREE.InstancedMesh(farParts.geometry, farParts.material, Math.max(1, n));
  far.name = "fighters_far";
  far.frustumCulled = false;
  far.count = 0;
  const farGlow = new THREE.InstancedMesh(farParts.glowGeometry, farParts.glowMaterial, Math.max(1, n));
  farGlow.name = "fighters_far_glow";
  farGlow.frustumCulled = false;
  farGlow.count = 0;
  for (const im of [far, farGlow]) {
    im.castShadow = false;
    im.receiveShadow = false;
    im.visible = false;
  }
  const lod = new FighterLOD(fighters, far, farGlow);
  for (const f of fighters) lod.add(f.mesh);
  lod.add(far, farGlow);
  group.add(lod);

  // Without shared sun uniforms, follow the sky: space.js rotates its root and derives the sun from it.
  let spaceRoot = null;
  const SUN_LOCAL = new THREE.Vector3(-0.464, 0.375, 0.803).normalize();
  if (ownSun) {
    const baseUpdate = lod.update.bind(lod);
    lod.update = (camera) => {
      if (!spaceRoot) spaceRoot = scene.getObjectByName("space");
      if (spaceRoot) sunU.dir.value.copy(SUN_LOCAL).applyQuaternion(spaceRoot.quaternion);
      baseUpdate(camera);
    };
  }

  if (DEV) {
    const res = checkClearance(fighters);
    console.assert(res.ok, "fighter traffic: a flight path violates hull clearance", res.worst.filter((w) => w.margin < 0));
  }

  let time = 0;
  const step = (dt) => {
    for (const f of fighters) f.update(dt);
    time += dt;
  };

  return {
    group,
    fighters,
    template,
    /** Advance the simulation by dt seconds (variable step, used by the frame loop). */
    update(dt) {
      step(dt);
    },
    /** Deterministic advance to absolute simulation time t (fixed 1/60 s steps from the current time). */
    setTime(t) {
      const STEP = 1 / 60;
      while (time < t - 1e-9) step(Math.min(STEP, t - time));
    },
    get time() {
      return time;
    },
    /** Replace a fighter's pilot (NPC / networked). */
    setPilot(id, pilot) {
      const f = fighters[id];
      if (f) f.pilot = pilot;
    },
    serialize() {
      return fighters.map((f) => f.serialize());
    },
    applyState(states) {
      for (const st of states) {
        const f = fighters[st.id];
        if (f) f.applyState(st);
      }
    },
    counts() {
      const c = {};
      for (const f of fighters) c[f.state] = (c[f.state] || 0) + 1;
      return c;
    },
    /** Dev helper: run the hull clearance audit on the built flight paths. */
    checkClearance: () => checkClearance(fighters),
    /** Dev helper: line renderings of every track (launch amber, patrol blue, approach green). */
    debugLines() {
      const g = new THREE.Group();
      g.name = "trafficPaths";
      const colors = { launch: 0xffaa33, patrol: 0x55aaff, approach: 0x66ff88 };
      for (const f of fighters) {
        for (const [name, track] of Object.entries(f.tracks)) {
          const pts = [];
          const steps = Math.ceil(track.length / 10);
          for (let k = 0; k <= steps; k++) pts.push(track.pointAt((k / steps) * track.length, new THREE.Vector3()));
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: colors[name], fog: false })));
        }
      }
      return g;
    },
  };
}
