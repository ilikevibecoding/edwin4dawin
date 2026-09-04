// Hangar fighter traffic: scripted launch / patrol / return / dock paths through the ventral hangar
// mouth, rack docking with a tractor-beam effect, a deterministic scheduler and the PilotController hook
// interface for future NPC pilots / multiplayer. Everything here is in WORLD coordinates (main.js parents
// `group` under the hangar cell with a compensating offset so the fighters show / hide with the hangar).
//
//   createTraffic({ materials, audio, camera }) ->
//     { group, fighters, update(dt, t, camera), getState(), setState(s), requestLaunch(id), requestLanding(id),
//       hooks, pool, constants }
//
// Fleet: 24 TIE-style fighters from one instanced pool (tie.js). 18 hang docked in the ceiling racks
// (spec.rackSlot), 3 are parked on the deck (spec.DECK_SPOTS), 3 start out on patrol. A seeded scheduler
// driven by the shared clock `t` launches a docked fighter every 25–40 s while fewer than MAX_AIRBORNE are
// out; every fighter that leaves comes back to a free rack slot reserved at launch.
//
// Phases (fighter.phase):
//   docked   hanging in rack slot `home`, static
//   release  clamp opens: drops 1.5 m, settles, hovers (4 s); asks for clearance before descending
//   descend  interior spline from the hover point to the mouth plane (lane over the floor opening), 6–7 m/s
//   exit     down through the containment field and the well (exterior spline start)
//   patrol   the long exterior loop (see exteriorPoints): under the hull to the bow, wide port turn, aft along
//            the port trench 100 m below the bottom plate, round the stern, far starboard sweep, back into the
//            approach corridor (spec.HANGAR.approach) at 120–250 m/s
//   approach decelerating along the corridor, pull-up into the arrival lane, up through the well to the mouth
//            plane; asks for clearance before entering the hangar (hovers below the mouth while denied)
//   enter    interior spline from the mouth plane to the hover point 1.5 m under the reserved slot
//   dock     tractor beam from the ceiling clamp pulls the fighter up into the clamp (6 s), then `docked`
//   parked   on the deck, static (never flies)
//
// Orientation: outside the hull the nose follows the velocity and the fighter banks with the path curvature;
// inside (hover regime, y above the hull skin) it flies level with a small pitch, yawing toward its motion and
// pirouetting to the rack's inward-facing yaw for docking. Orientation is low-pass filtered (slerp), positions
// are exact on the splines. No per-frame allocations: splines are (re)built only on phase transitions.
//
// PilotController interface (placeholder for fighters/ai.js and multiplayer). Replace the members of `hooks`:
//   hooks.onPhase(fighter, phase)          called after every phase change (also for scripted ones)
//   hooks.requestClearance(fighter) -> bool consulted (1) before a scheduled / requested launch, (2) at the end
//                                          of `release` before the descent, (3) at the mouth plane before
//                                          entering the hangar. Returning false makes the fighter hold (hover)
//                                          and ask again every second. Default: always true.
//   requestLaunch(id) / requestLanding(id) manual triggers (landing shortcuts the patrol from the fighter's
//                                          current position into the approach corridor).
// A pilot controller can therefore hold fighters on the rack or under the mouth, gate launches, and observe
// every phase; a network layer replicates getState() -> setState() (compact { t, next, k, fighters:[{id, phase,
// path, u}] }, path = "home>target:lane" encodes the spline inputs so the receiver rebuilds identical paths).
import * as THREE from "three";
import { HANGAR, DECK_SPOTS, rackSlot } from "../spec.js";
import { createTiePool } from "./tie.js";
import { rng } from "../kit.js";

export const PHASES = ["docked", "release", "descend", "exit", "patrol", "approach", "enter", "dock", "parked"];

const SEED = 9880;
const N_FIGHTERS = 24;
const N_DECK = Math.min(3, DECK_SPOTS.length);
const INITIAL_DOCKED = 18;
const MAX_AIRBORNE = 4;
const LAUNCH_INTERVAL = [25, 40];
const FIRST_LAUNCH = 12;
const RELEASE_T = 4.0;
const DOCK_T = 6.0;
const DROP = 1.5;
const LANE_X_OUT = -15; // departures use the port half of the floor opening
const LANE_X_IN = 15; // arrivals the starboard half
const LANE_Z = [-25, -5, 15, 35];
const Y_MOUTH = HANGAR.floorY + 6; // interior / exterior hand-over plane (wing tips clear of the deck)
const Y_HOVER_MODE = -58; // above this the fighter flies in the level hover regime
const V_IN = 7; // interior cruise (m/s)
const G0 = 40; // bank reference acceleration (m/s²): bank = atan(lateral / G0)
const SLERP_OUT = 3.0;
const SLERP_IN = 1.6;
const FLYBY_R = 250;
const FLYBY_GLOBAL = 4;
const FLYBY_EACH = 20;
const HOLD_RETRY = 1.0;

const NK = HANGAR.rackRows[0].n;
const N_SLOTS = HANGAR.rackRows.reduce((a, r) => a + r.n, 0);
const SLOT_POS = [];
for (let s = 0; s < N_SLOTS; s++) SLOT_POS.push(rackSlot(Math.floor(s / NK), s % NK));
/** Docked fighters face the hangar centreline (nose along -sign(x)). Forward is -z, so yaw = atan2(-fx, -fz). */
function slotYaw(slot) {
  const x = HANGAR.rackRows[Math.floor(slot / NK)].x;
  return x < 0 ? -Math.PI / 2 : Math.PI / 2;
}
function laneFor(slot) {
  const z = SLOT_POS[slot].z;
  let best = 0;
  for (let i = 1; i < LANE_Z.length; i++) if (Math.abs(LANE_Z[i] - z) < Math.abs(LANE_Z[best] - z)) best = i;
  return best;
}
/** Ceiling clamp point above a slot (where the tractor beam originates). */
function clampPoint(slot, out) {
  const p = SLOT_POS[slot];
  return out.set(p.x, HANGAR.ceilingY - HANGAR.tie.clampH, p.z);
}

// ---------------------------------------------------------------------------
// Path definitions: arrays of [x, y, z, speed]
// ---------------------------------------------------------------------------
/** Exterior loop from the departure mouth plane (xw, zw) to the arrival mouth plane (xa, za). */
export function exteriorPoints(xw, zw, xa, za) {
  return [
    [xw, Y_MOUTH, zw, V_IN],
    [xw, -48, zw, 9], // hull skin / containment field
    [xw, -62, zw, 11], // clear of the well
    [xw, -82, zw, 18], // nose over (still inside the mouth footprint)
    [xw, -100, zw - 6, 28],
    [xw - 2, -124, zw - 45, 50],
    [-25, -148, -220, 110],
    [-30, -155, -600, 160], // out below the hull toward the bow
    [-110, -160, -900, 175],
    [-360, -152, -1090, 170], // wide banked turn to port past the bow
    [-480, -140, -880, 165],
    [-350, -128, -620, 155],
    [-235, -124, -500, 150], // aft along the port trench, ~80 m off the edge, 100 m below the bottom plate
    [-320, -139, -200, 150],
    [-410, -154, 100, 150],
    [-500, -168, 400, 160],
    [-560, -200, 750, 170], // round the stern behind the engines
    [-350, -262, 950, 185],
    [0, -290, 1010, 195],
    [380, -285, 900, 195],
    [1500, -320, 1100, 190], // far patrol sweep off the starboard quarter (~5 km out)
    [3900, -420, 700, 175],
    [5600, -380, -1600, 170],
    [4200, -310, -4200, 170],
    [1300, -240, -4300, 175],
    [-120, -185, -1700, 185],
    [0, -160, -520, 150], // HANGAR.approach corridor start
    [0, -160, -300, 120],
    [0, -160, -130, 70],
    [xa * 0.5, -146, -70, 40],
    [xa, -118, za - 14, 26],
    [xa, -88, za - 2, 14],
    [xa, -62, za, 10],
    [xa, -48, za, 8],
    [xa, Y_MOUTH, za, V_IN],
  ];
}
const X_EXIT_INDEX = 2; // end of the `exit` phase (clear of the well)
const X_APPROACH_INDEX = 25; // start of the `approach` phase

/** Interior descent: hover point under the home slot -> mouth plane over lane (xw, zw). */
function descendPoints(h, xw, zw) {
  const dir = h.x < 0 ? 1 : -1; // toward the centreline
  return [
    [h.x, h.y, h.z],
    [h.x + dir * 10, h.y - 1.5, h.z],
    [xw + (h.x - xw) * 0.35, -20, zw + (h.z - zw) * 0.35],
    [xw, -27, zw],
    [xw, Y_MOUTH, zw],
  ];
}
/** Interior entry: mouth plane over lane (xa, za) -> hover point under the target slot. */
function enterPoints(h, xa, za) {
  const dir = h.x < 0 ? 1 : -1;
  return [
    [xa, Y_MOUTH, za],
    [xa, -27, za],
    [xa + (h.x - xa) * 0.4, -18, za + (h.z - za) * 0.4],
    [h.x + dir * 9, h.y - 1.2, h.z],
    [h.x, h.y, h.z],
  ];
}

// ---------------------------------------------------------------------------
// Spline wrapper: arc-length parametrised Catmull-Rom with a per-control-point speed table
// ---------------------------------------------------------------------------
class Path {
  constructor(divisions) {
    this.curve = new THREE.CatmullRomCurve3([], false, "centripetal");
    this.curve.arcLengthDivisions = divisions;
    this.L = 0;
    this.sTab = [];
    this.vTab = [];
    this.n = 0;
  }
  /** pts: [x, y, z, v?]; v defaults to `speed` (interior paths use an ease profile instead). */
  set(pts, speed = null) {
    const c = this.curve;
    c.points.length = 0;
    for (const p of pts) c.points.push(new THREE.Vector3(p[0], p[1], p[2]));
    c.needsUpdate = true;
    c.updateArcLengths();
    this.L = c.getLength();
    this.n = pts.length;
    this.sTab.length = 0;
    this.vTab.length = 0;
    const lengths = c.getLengths();
    const div = lengths.length - 1;
    for (let i = 0; i < pts.length; i++) {
      const t = i / (pts.length - 1);
      const f = t * div;
      const i0 = Math.min(div - 1, Math.floor(f));
      this.sTab.push(lengths[i0] + (lengths[i0 + 1] - lengths[i0]) * (f - i0));
      this.vTab.push(pts[i].length > 3 ? pts[i][3] : speed);
    }
    return this;
  }
  /** Arc length at control point i. */
  sAt(i) {
    return this.sTab[Math.max(0, Math.min(this.n - 1, i))];
  }
  point(s, out) {
    const u = this.L > 0 ? Math.min(1, Math.max(0, s / this.L)) : 0;
    return this.curve.getPointAt(u, out);
  }
  speed(s) {
    const st = this.sTab;
    const vt = this.vTab;
    if (vt[0] === null) return 0;
    if (s <= st[0]) return vt[0];
    for (let i = 1; i < this.n; i++) {
      if (s <= st[i]) {
        const f = (s - st[i - 1]) / Math.max(1e-6, st[i] - st[i - 1]);
        return vt[i - 1] + (vt[i] - vt[i - 1]) * f;
      }
    }
    return vt[this.n - 1];
  }
}

// scratch
const _p = new THREE.Vector3();
const _pa = new THREE.Vector3();
const _pb = new THREE.Vector3();
const _T = new THREE.Vector3();
const _c = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _back = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x) => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};

export function createTraffic({ materials, audio = null, camera = null } = {}) {
  const group = new THREE.Group();
  group.name = "traffic";
  const pool = createTiePool(materials, N_FIGHTERS);
  group.add(pool.group);

  const hooks = {
    onPhase(fighter, phase) {
      void fighter;
      void phase;
    },
    requestClearance(fighter) {
      void fighter;
      return true;
    },
  };

  // ---------------- tractor beams (one per possible simultaneous docking) ----------------
  const beamOuterMat = new THREE.MeshBasicMaterial({ color: 0x4f9cff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beamCoreMat = new THREE.MeshBasicMaterial({ color: 0xa8d4ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beams = [];
  {
    // unit cones with the apex at y = 0 (the clamp) and the base at y = -1 (scaled to the beam length)
    const outerGeo = new THREE.CylinderGeometry(0.45, 1.9, 1, 24, 1, true);
    outerGeo.translate(0, -0.5, 0);
    const coreGeo = new THREE.CylinderGeometry(0.16, 0.55, 1, 12, 1, true);
    coreGeo.translate(0, -0.5, 0);
    for (let i = 0; i < MAX_AIRBORNE; i++) {
      const g = new THREE.Group();
      const outer = new THREE.Mesh(outerGeo, beamOuterMat);
      const core = new THREE.Mesh(coreGeo, beamCoreMat);
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), materials.glowDisc);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -0.02;
      outer.frustumCulled = core.frustumCulled = disc.frustumCulled = false;
      g.add(outer, core, disc);
      g.visible = false;
      group.add(g);
      beams.push({ group: g, outer, core, disc, fighter: null });
    }
  }

  // ---------------- fleet ----------------
  const fighters = [];
  for (let i = 0; i < N_FIGHTERS; i++) {
    fighters.push({
      id: i,
      phase: "docked",
      home: -1, // rack slot the fighter hangs in (docked / release) or departed from (ownership: slotOwner)
      target: -1, // rack slot reserved for the return
      lane: 0,
      deck: -1,
      u: 0,
      s: 0,
      phaseT: 0,
      dockedSince: 0,
      hold: false,
      holdT: 0,
      lastFlyby: -1e9,
      camDist: 1e9,
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      velocity: new THREE.Vector3(),
      speed: 0,
      yaw: 0,
      holdPos: new THREE.Vector3(),
      matrix: new THREE.Matrix4(),
      inner: null, // Path (descend / enter)
      outer: null, // Path (exit / patrol / approach)
      beam: null,
    });
  }
  const slotOwner = new Int16Array(N_SLOTS).fill(-1);
  let rand = rng(SEED);
  let launchCount = 0;
  let nextLaunch = -1;
  let lastT = null;
  let lastFlybyT = -1e9;
  const simT = { t: 0 };

  const cameraRef = { camera };

  // seeded slot order: which 18 slots are occupied at start, which 3 the initial patrol reserves
  const slotOrder = [];
  {
    const r = rng(SEED + 1);
    for (let s = 0; s < N_SLOTS; s++) slotOrder.push(s);
    for (let i = slotOrder.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = slotOrder[i];
      slotOrder[i] = slotOrder[j];
      slotOrder[j] = tmp;
    }
  }

  function setPhase(f, phase) {
    f.phase = phase;
    f.phaseT = 0;
    f.u = 0;
    hooks.onPhase(f, phase);
  }
  function airborneCount() {
    let n = 0;
    for (const f of fighters) if (f.phase !== "docked" && f.phase !== "parked") n++;
    return n;
  }
  function freeSlots(out) {
    out.length = 0;
    for (let s = 0; s < N_SLOTS; s++) if (slotOwner[s] < 0) out.push(s);
    return out;
  }
  const _free = [];

  function placeDocked(f, slot) {
    const p = SLOT_POS[slot];
    f.position.copy(p);
    f.yaw = slotYaw(slot);
    _e.set(0, f.yaw, 0, "YXZ");
    f.quaternion.setFromEuler(_e);
    f.velocity.set(0, 0, 0);
    f.speed = 0;
    writeInstance(f);
  }
  function placeParked(f, deck) {
    const d = DECK_SPOTS[deck];
    f.position.set(d.x, HANGAR.floorY + HANGAR.tie.wingH / 2 + 0.15, d.z);
    f.yaw = d.yaw;
    _e.set(0, f.yaw, 0, "YXZ");
    f.quaternion.setFromEuler(_e);
    writeInstance(f);
  }
  function writeInstance(f) {
    f.matrix.compose(f.position, f.quaternion, _one);
    pool.setInstance(f.id, f.matrix, true);
  }

  // ---------------- path construction ----------------
  function hoverPoint(slot, out) {
    return out.copy(SLOT_POS[slot]).setY(SLOT_POS[slot].y - DROP);
  }
  function buildDescend(f) {
    if (!f.inner) f.inner = new Path(120);
    hoverPoint(f.home, _v);
    f.inner.set(descendPoints(_v, LANE_X_OUT, LANE_Z[f.lane]), V_IN);
  }
  function buildEnter(f) {
    if (!f.inner) f.inner = new Path(120);
    hoverPoint(f.target, _v);
    f.inner.set(enterPoints(_v, LANE_X_IN, LANE_Z[laneFor(f.target)]), V_IN);
  }
  function buildExterior(f) {
    if (!f.outer) f.outer = new Path(1600);
    f.outer.set(exteriorPoints(LANE_X_OUT, LANE_Z[f.lane], LANE_X_IN, LANE_Z[laneFor(f.target)]));
    f.sExit = f.outer.sAt(X_EXIT_INDEX);
    f.sApproach = f.outer.sAt(X_APPROACH_INDEX);
  }
  /** Interior ease: speed grows 1 m/s per metre from either end, capped at V_IN. */
  function interiorSpeed(path, s) {
    return clamp(Math.min(s + 1.2, path.L - s + 0.9), 1.0, V_IN);
  }

  // ---------------- launch / land bookkeeping ----------------
  function reserveTarget(f) {
    freeSlots(_free);
    if (_free.length === 0) return false;
    // prefer slots on the same side as the departure lane's arrival, otherwise any free one (seeded pick)
    const pick = _free[Math.floor(rand() * _free.length) % _free.length];
    f.target = pick;
    slotOwner[pick] = f.id;
    return true;
  }
  function launch(f) {
    if (f.phase !== "docked") return false;
    if (!hooks.requestClearance(f)) return false;
    if (!reserveTarget(f)) return false;
    f.lane = laneFor(f.home);
    buildDescend(f);
    buildExterior(f);
    launchCount++;
    setPhase(f, "release");
    if (audio) audio.play("tie_launch", f.position);
    return true;
  }
  function beginDescend(f) {
    slotOwner[f.home] = -1; // the rack is free once the fighter leaves its hover point (f.home stays: the path needs it)
    f.s = 0;
    setPhase(f, "descend");
  }
  function beginDock(f) {
    setPhase(f, "dock");
    for (const b of beams) {
      if (b.fighter) continue;
      b.fighter = f;
      f.beam = b;
      b.group.visible = true;
      clampPoint(f.target, b.group.position);
      break;
    }
  }
  function finishDock(f) {
    if (f.beam) {
      f.beam.group.visible = false;
      f.beam.fighter = null;
      f.beam = null;
    }
    f.home = f.target;
    f.target = -1;
    f.dockedSince = simT.t;
    setPhase(f, "docked");
    placeDocked(f, f.home);
    if (audio) audio.play("tie_land", f.position);
  }

  // ---------------- orientation ----------------
  function hoverTarget(f, yawTarget, out) {
    const vh = Math.hypot(f.velocity.x, f.velocity.z);
    const pitch = clamp(Math.atan2(f.velocity.y, Math.max(vh, 0.5)) * 0.35, -0.22, 0.22);
    _e.set(pitch, yawTarget, 0, "YXZ");
    return out.setFromEuler(_e);
  }
  /** Flight regime: nose along the tangent, banked so local up leans into the turn. */
  function flightTarget(f, path, out) {
    const ds = Math.max(6, f.speed * 0.06);
    path.point(f.s - ds, _pa);
    path.point(f.s + ds, _pb);
    _T.subVectors(_pb, _pa);
    if (_T.lengthSq() < 1e-6) return out.copy(f.quaternion);
    _T.normalize();
    // curvature vector (second derivative w.r.t. arc length)
    _c.copy(_pb).add(_pa).addScaledVector(f.position, -2).multiplyScalar(1 / (ds * ds));
    // reference up: world up, falling back to the fighter's own up when the tangent is near vertical
    const vert = Math.abs(_T.y);
    _up.set(0, 1, 0).applyQuaternion(f.quaternion).multiplyScalar(vert).addScaledVector(UP, 1 - vert);
    _up.multiplyScalar(G0).addScaledVector(_c, f.speed * f.speed);
    // remove the tangent component and orthonormalise (vertical dive / climb: top faces the bow)
    _up.addScaledVector(_T, -_up.dot(_T));
    if (_up.lengthSq() < 1e-4) {
      _up.set(0, 0, -1);
      _up.addScaledVector(_T, -_up.dot(_T));
    }
    _up.normalize();
    _right.crossVectors(_T, _up).normalize();
    _up.crossVectors(_right, _T);
    _back.copy(_T).negate();
    _m.makeBasis(_right, _up, _back);
    return out.setFromRotationMatrix(_m);
  }
  function yawFromVelocity(f, fallback) {
    const vh = Math.hypot(f.velocity.x, f.velocity.z);
    return vh > 1.5 ? Math.atan2(-f.velocity.x, -f.velocity.z) : fallback;
  }
  function filterOrientation(f, dt, rate) {
    const k = 1 - Math.exp(-rate * dt);
    f.quaternion.slerp(_q, k);
  }
  /** Advance along a path by its speed profile; returns true when the end is reached. */
  function advance(f, path, dt, speedFn, sEnd) {
    const v = speedFn ? speedFn(path, f.s) : path.speed(f.s);
    f.speed = v;
    f.s += v * dt;
    path.point(f.s, _p);
    if (dt > 0) f.velocity.subVectors(_p, f.position).multiplyScalar(1 / dt);
    f.position.copy(_p);
    return f.s >= sEnd;
  }

  // ---------------- per-fighter update ----------------
  function updateFighter(f, dt, t) {
    f.phaseT += dt;
    switch (f.phase) {
      case "docked":
      case "parked":
        return;
      case "release": {
        const u = clamp(f.phaseT / RELEASE_T, 0, 1);
        f.u = u;
        const p = SLOT_POS[f.home];
        const drop = smooth(u / 0.45) * DROP + 0.18 * Math.sin(Math.PI * clamp((u - 0.45) / 0.3, 0, 1));
        f.position.set(p.x, p.y - drop + (u > 0.75 ? 0.05 * Math.sin(t * 1.7) : 0), p.z);
        f.velocity.set(0, 0, 0);
        f.speed = 0;
        hoverTarget(f, slotYaw(f.home), _q);
        filterOrientation(f, dt, SLERP_IN);
        if (u >= 1) {
          if (!f.hold || f.holdT <= 0) {
            if (hooks.requestClearance(f)) {
              f.hold = false;
              beginDescend(f);
            } else {
              f.hold = true;
              f.holdT = HOLD_RETRY;
            }
          } else f.holdT -= dt;
        }
        break;
      }
      case "descend": {
        const done = advance(f, f.inner, dt, interiorSpeed, f.inner.L);
        f.u = f.s / f.inner.L;
        hoverTarget(f, yawFromVelocity(f, f.yaw), _q);
        f.yaw = yawFromVelocity(f, f.yaw);
        filterOrientation(f, dt, SLERP_IN);
        if (done) {
          f.s = 0;
          setPhase(f, "exit");
        }
        break;
      }
      case "exit":
      case "patrol":
      case "approach": {
        const path = f.outer;
        const end = f.phase === "exit" ? f.sExit : f.phase === "patrol" ? f.sApproach : path.L;
        const start = f.phase === "exit" ? 0 : f.phase === "patrol" ? f.sExit : f.sApproach;
        let done = false;
        if (f.hold) {
          // holding under the mouth: hover in place and re-ask for clearance
          f.velocity.set(0, 0, 0);
          f.speed = 0;
          f.position.copy(f.holdPos);
          f.position.y += 0.08 * Math.sin(t * 1.5);
          hoverTarget(f, f.yaw, _q);
          filterOrientation(f, dt, SLERP_IN);
          f.holdT -= dt;
          if (f.holdT <= 0) {
            if (hooks.requestClearance(f)) {
              f.hold = false;
              f.s = 0;
              setPhase(f, "enter");
            } else f.holdT = HOLD_RETRY;
          }
          break;
        }
        done = advance(f, path, dt, null, end);
        f.u = clamp((f.s - start) / Math.max(1e-6, end - start), 0, 1);
        if (f.position.y > Y_HOVER_MODE) {
          f.yaw = yawFromVelocity(f, f.yaw);
          hoverTarget(f, f.yaw, _q);
          filterOrientation(f, dt, SLERP_IN);
        } else {
          flightTarget(f, path, _q);
          filterOrientation(f, dt, SLERP_OUT);
        }
        if (done) {
          if (f.phase === "exit") setPhase(f, "patrol");
          else if (f.phase === "patrol") setPhase(f, "approach");
          else {
            // at the mouth plane: clearance to enter the hangar
            path.point(path.L, f.holdPos);
            if (hooks.requestClearance(f)) {
              buildEnter(f);
              f.s = 0;
              setPhase(f, "enter");
            } else {
              buildEnter(f);
              f.hold = true;
              f.holdT = HOLD_RETRY;
            }
          }
        }
        break;
      }
      case "enter": {
        const done = advance(f, f.inner, dt, interiorSpeed, f.inner.L);
        f.u = f.s / f.inner.L;
        // pirouette to the rack's inward yaw over the last metres
        const remaining = f.inner.L - f.s;
        const yawTarget = remaining < 14 ? slotYaw(f.target) : yawFromVelocity(f, f.yaw);
        f.yaw = yawTarget;
        hoverTarget(f, yawTarget, _q);
        filterOrientation(f, dt, SLERP_IN);
        if (done) beginDock(f);
        break;
      }
      case "dock": {
        const u = clamp(f.phaseT / DOCK_T, 0, 1);
        f.u = u;
        const p = SLOT_POS[f.target];
        // slow tractor pull, a final snap into the clamp
        const rise = DROP * (0.85 * smooth(u / 0.9) + 0.15 * smooth((u - 0.9) / 0.1));
        f.position.set(p.x, p.y - DROP + rise, p.z);
        f.velocity.set(0, 0, 0);
        f.speed = 0;
        hoverTarget(f, slotYaw(f.target), _q);
        filterOrientation(f, dt, SLERP_IN * 1.5);
        if (f.beam) {
          const b = f.beam;
          const len = Math.max(0.5, b.group.position.y - (f.position.y + HANGAR.tie.ballR + 0.2));
          b.outer.scale.set(1, len, 1);
          b.core.scale.set(1, len, 1);
          const pulse = 0.85 + 0.15 * Math.sin(t * 9);
          beamOuterMat.opacity = 0.2 * pulse;
          beamCoreMat.opacity = 0.45 * pulse;
        }
        if (u >= 1) finishDock(f);
        break;
      }
    }
    writeInstance(f);
  }

  // ---------------- scheduler ----------------
  function schedule(t) {
    if (nextLaunch < 0) nextLaunch = t + FIRST_LAUNCH;
    if (t < nextLaunch) return;
    nextLaunch = t + LAUNCH_INTERVAL[0] + rand() * (LAUNCH_INTERVAL[1] - LAUNCH_INTERVAL[0]);
    if (airborneCount() >= MAX_AIRBORNE) return;
    // the fighter docked the longest goes next
    let best = null;
    for (const f of fighters) {
      if (f.phase !== "docked") continue;
      if (!best || f.dockedSince < best.dockedSince) best = f;
    }
    if (best) launch(best);
  }

  function flybys(t, cam) {
    if (!audio || !cam) return;
    const cp = cam.position;
    for (const f of fighters) {
      if (f.phase !== "patrol" && f.phase !== "approach" && f.phase !== "exit") continue;
      const d = f.position.distanceTo(cp);
      if (d < FLYBY_R && f.camDist >= FLYBY_R && f.speed > 50 && t - lastFlybyT > FLYBY_GLOBAL && t - f.lastFlyby > FLYBY_EACH) {
        lastFlybyT = t;
        f.lastFlyby = t;
        audio.play("tie_flyby", f.position);
      }
      f.camDist = d;
    }
  }

  // ---------------- initial placement ----------------
  function placeInitial() {
    slotOwner.fill(-1);
    let n = 0;
    for (let i = 0; i < INITIAL_DOCKED; i++, n++) {
      const f = fighters[n];
      f.phase = "docked";
      f.home = slotOrder[i];
      slotOwner[f.home] = f.id;
      f.dockedSince = -i; // stagger so launches rotate through the racks
      placeDocked(f, f.home);
    }
    // initial patrol: three fighters spread along the loop
    const nPatrol = N_FIGHTERS - N_DECK - INITIAL_DOCKED;
    for (let i = 0; i < nPatrol; i++, n++) {
      const f = fighters[n];
      f.target = slotOrder[INITIAL_DOCKED + i];
      slotOwner[f.target] = f.id;
      f.lane = 0;
      buildExterior(f);
      f.phase = "patrol";
      f.s = f.sExit + (f.sApproach - f.sExit) * (0.25 + (0.5 * i) / Math.max(1, nPatrol - 1));
      f.outer.point(f.s, f.position);
      f.speed = f.outer.speed(f.s);
      f.outer.point(f.s + 5, _pb);
      f.velocity.subVectors(_pb, f.position).normalize().multiplyScalar(f.speed);
      flightTarget(f, f.outer, f.quaternion);
      writeInstance(f);
    }
    for (let i = 0; i < N_DECK; i++, n++) {
      const f = fighters[n];
      f.phase = "parked";
      f.deck = i;
      placeParked(f, i);
    }
  }
  placeInitial();

  // ---------------- public API ----------------
  function update(dt, t, cam) {
    if (cam) cameraRef.camera = cam;
    if (lastT === null || t < lastT - 0.5) nextLaunch = t + (lastT === null ? FIRST_LAUNCH : 6);
    lastT = t;
    simT.t = t;
    dt = Math.min(dt, 0.1);
    schedule(t);
    for (const f of fighters) updateFighter(f, dt, t);
    flybys(t, cameraRef.camera);
  }

  function pathString(f) {
    if (f.phase === "parked") return `d${f.deck}`;
    if (f.phase === "docked") return `${f.home}`;
    return `${f.home}>${f.target}:${f.lane}`;
  }
  function getState() {
    return { t: lastT === null ? 0 : lastT, next: nextLaunch, k: launchCount, fighters: fighters.map((f) => ({ id: f.id, phase: f.phase, path: pathString(f), u: +f.u.toFixed(4) })) };
  }
  function setState(s) {
    if (!s || !Array.isArray(s.fighters)) return;
    slotOwner.fill(-1);
    // replay the seeded stream so later scheduler picks match the sender
    rand = rng(SEED);
    launchCount = s.k || 0;
    for (let i = 0; i < launchCount; i++) rand();
    if (typeof s.next === "number") nextLaunch = s.next;
    if (typeof s.t === "number") lastT = s.t;
    for (const fs of s.fighters) {
      const f = fighters[fs.id];
      if (!f) continue;
      f.hold = false;
      f.u = clamp(fs.u || 0, 0, 1);
      f.phaseT = 0;
      if (f.beam) {
        f.beam.group.visible = false;
        f.beam.fighter = null;
        f.beam = null;
      }
      if (fs.phase === "parked") {
        f.phase = "parked";
        f.deck = parseInt(fs.path.slice(1), 10) || 0;
        placeParked(f, f.deck);
        continue;
      }
      if (fs.phase === "docked") {
        f.phase = "docked";
        f.home = parseInt(fs.path, 10) || 0;
        f.target = -1;
        slotOwner[f.home] = f.id;
        placeDocked(f, f.home);
        continue;
      }
      const m = /^(-?\d+)>(-?\d+):(\d+)$/.exec(fs.path || "");
      if (!m) continue;
      f.home = +m[1];
      f.target = +m[2];
      f.lane = +m[3];
      if (f.home >= 0 && fs.phase === "release") slotOwner[f.home] = f.id; // freed once the descent starts
      if (f.target >= 0) slotOwner[f.target] = f.id;
      f.phase = fs.phase;
      switch (fs.phase) {
        case "release":
          f.phaseT = f.u * RELEASE_T;
          buildDescend(f);
          buildExterior(f);
          break;
        case "descend":
          buildDescend(f);
          buildExterior(f);
          f.s = f.u * f.inner.L;
          break;
        case "exit":
          buildExterior(f);
          f.s = f.u * f.sExit;
          break;
        case "patrol":
          buildExterior(f);
          f.s = f.sExit + f.u * (f.sApproach - f.sExit);
          break;
        case "approach":
          buildExterior(f);
          f.s = f.sApproach + f.u * (f.outer.L - f.sApproach);
          break;
        case "enter":
          buildEnter(f);
          f.s = f.u * f.inner.L;
          break;
        case "dock":
          beginDock(f);
          f.phaseT = f.u * DOCK_T;
          break;
      }
      // settle the pose without filtering
      f.velocity.set(0, 0, 0);
      updateFighter(f, 0, lastT || 0);
      f.quaternion.copy(_q);
      writeInstance(f);
    }
  }
  function requestLaunch(id) {
    const f = fighters[id];
    if (!f || f.phase !== "docked") return false;
    return launch(f);
  }
  /** Shortcut the patrol: fly from the current position straight into the approach corridor. */
  function requestLanding(id) {
    const f = fighters[id];
    if (!f || f.phase !== "patrol") return false;
    const p = f.position;
    const v = f.velocity;
    const sp = Math.max(60, f.speed);
    if (v.lengthSq() < 1) f.outer.point(f.s + 5, _pb).sub(p).normalize().multiplyScalar(sp);
    else _pb.copy(v);
    const ahead = _v.copy(_pb).normalize().multiplyScalar(sp * 3);
    const std = exteriorPoints(LANE_X_OUT, LANE_Z[f.lane], LANE_X_IN, LANE_Z[laneFor(f.target)]);
    const approach = std.slice(X_APPROACH_INDEX);
    const pts = [
      [p.x, p.y, p.z, sp],
      [p.x + ahead.x, p.y + ahead.y, p.z + ahead.z, sp],
      [p.x * 0.5, Math.min(p.y, -230), p.z * 0.5 - 500, 200],
      [-80, -190, -1300, 180],
      ...approach,
    ];
    f.outer.set(pts);
    f.sExit = 0;
    f.sApproach = f.outer.sAt(4);
    f.s = 0;
    return true;
  }

  return {
    group,
    fighters,
    hooks,
    pool,
    beams,
    update,
    getState,
    setState,
    requestLaunch,
    requestLanding,
    constants: { N_FIGHTERS, N_DECK, MAX_AIRBORNE, LAUNCH_INTERVAL, LANE_X_OUT, LANE_X_IN, LANE_Z, Y_MOUTH, SLOT_POS, slotOrder },
    get airborne() {
      return airborneCount();
    },
    get slotOwner() {
      return slotOwner;
    },
  };
}
