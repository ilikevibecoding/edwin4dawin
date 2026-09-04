// Fighter traffic: twelve TIE fighters shared between the hangar racks, the ventral launch well and
// two patrol loops around the ship. Every fighter is a small deterministic state machine whose pose is
// a pure function of (state, state time, path, rack), so the whole system can be snapshotted and
// restored (core/sync.js) and a remote replica stays in lock-step. Rendering is one InstancedMesh per
// material per LOD (about seven draw calls for the entire wing), with the exhaust flares in one more.
//
// Timeline of a launch:  wellOpen → rack ram lowers the fighter 6 m → release, free fall through the
// deck opening and the keel shaft (tractor emitters run while it passes) → below the keel it pulls
// onto a patrol loop → wellClose.  A recall runs the film in reverse: leave the loop near the anchor
// under the well, climb into the shaft, decelerate under a free rack, the ram raises and clamps it.
import * as THREE from "three";
import { HANGAR_RACKS, HANGAR_WELL, PATROL_LOOPS, HULL, halfWidth, dorsalY, keelY, TERRACES, TOWER_BASE, TOWER, REACTOR_BULB, ENGINES } from "../config/layout.js";
import { tieMerged } from "./tie.js";
import { hangarBus } from "./hangarBus.js";
import { rng } from "../kit.js";

export const TRAFFIC = {
  fighters: 12,
  rackDrop: 4, // fighter hangs this far below the rack pivot
  ramExt: 6, // the ram lowers it this far before release
  lowerTime: 4.0,
  raiseTime: 4.0,
  dropAccel: 6.0, // m/s² during the free fall through the shaft
  exitY: HANGAR_WELL.yKeel - 24, // hand-over to the join spline, well below the keel
  approachY: HANGAR_WELL.yKeel - 70, // recall: start of the vertical climb
  climbSpeed: 15,
  climbDecel: 3.6,
  patrolSpeed: 78,
  joinU: 0.035, // loop parameter where a launched fighter merges
  leaveU: 0.955, // end of the leave window: the loop point nearest the well
  leaveWindow: 0.06, // a recalled fighter may peel off anywhere in [leaveU - leaveWindow, leaveU]
  lod1: 400,
  hide: 6000,
  cycleMin: 20,
  cycleMax: 40,
  firstCycle: 10,
};

const UP = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(0, 0, -1);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// ---------------------------------------------------------------------------
// Hull envelope (approximate, from the layout) — used to route the patrol loops clear of the ship
// ---------------------------------------------------------------------------
function hullTopBottom(x, z) {
  if (z < HULL.bowZ || z > HULL.sternZ) return null;
  const w = halfWidth(z);
  const a = Math.min(1, Math.abs(x) / w);
  const yd = dorsalY(z);
  const yk = keelY(z);
  const e = HULL.edgeHalf;
  let top = a < HULL.dorsalPlateauFrac ? yd : yd + (e - yd) * ((a - HULL.dorsalPlateauFrac) / (1 - HULL.dorsalPlateauFrac));
  let bot = a < HULL.keelFlatFrac ? yk : yk + (-e - yk) * ((a - HULL.keelFlatFrac) / (1 - HULL.keelFlatFrac));
  for (const t of TERRACES) if (z >= t.z0 && z <= t.z1 && Math.abs(x) < w * t.halfTopFrac + t.slopeRun) top += t.rise;
  if (z >= TOWER_BASE.z0 && z <= TOWER_BASE.z1 && Math.abs(x) < TOWER_BASE.halfTop + TOWER_BASE.slopeRun) top += TOWER_BASE.rise;
  const nk = TOWER.neck;
  if (z >= nk.z0 && z <= nk.z1 && Math.abs(x) < nk.halfBase) top = Math.max(top, nk.yTop);
  const bm = TOWER.bridgeModule;
  if (z >= bm.z0 && z <= bm.z1 && Math.abs(x) < bm.halfX) top = Math.max(top, bm.y1);
  for (const d of TOWER.domes) if (Math.hypot(x - d.x, z - d.z) < d.r) top = Math.max(top, d.y + d.r);
  if (Math.hypot(x - TOWER.mast.x, z - TOWER.mast.z) < TOWER.mast.r * 3) top = Math.max(top, TOWER.mast.y1 + 14);
  const b = REACTOR_BULB;
  const dr = Math.hypot(x - b.x, z - b.z);
  if (dr < b.r) bot = Math.min(bot, b.y - Math.sqrt(b.r * b.r - dr * dr));
  return [bot, top];
}
export function insideHull(p, margin = 30) {
  if (p.z > HULL.sternZ - margin && p.z < HULL.sternZ + ENGINES.bellLength + margin) {
    for (const e of [...ENGINES.main, ...ENGINES.secondary]) if (Math.hypot(p.x - e.x, p.y - e.y) < e.r * 1.2 + margin) return true;
  }
  if (p.z < HULL.bowZ - margin || p.z > HULL.sternZ + margin) return false;
  const zc = THREE.MathUtils.clamp(p.z, HULL.bowZ, HULL.sternZ);
  const w = halfWidth(zc);
  if (Math.abs(p.x) > w + margin) return false;
  const tb = hullTopBottom(THREE.MathUtils.clamp(p.x, -w, w), zc);
  return p.y > tb[0] - margin && p.y < tb[1] + margin;
}

// Closed centripetal spline through the layout anchors, re-routed around the knife edges wherever a
// segment would cut through the hull (a few of the layout anchors sit on the far side of the ship).
export function buildPatrolCurve(anchors, margin = 35) {
  const pts = anchors.map((a) => new THREE.Vector3(a[0], a[1], a[2]));
  // move a point out of the hull envelope (+ clearance) along whichever axis is cheapest: sideways
  // past the knife edge, or up / down past the dorsal / keel surface
  const pushOut = (p, clear) => {
    const zc = THREE.MathUtils.clamp(p.z, HULL.bowZ, HULL.sternZ);
    if (p.z < HULL.bowZ - clear || p.z > HULL.sternZ + clear) return false;
    const w = halfWidth(zc);
    const tb = hullTopBottom(THREE.MathUtils.clamp(p.x, -w, w), zc);
    if (!tb) return false;
    if (Math.abs(p.x) >= w + clear || p.y >= tb[1] + clear || p.y <= tb[0] - clear) return false;
    const dxOut = w + clear - Math.abs(p.x);
    const dyUp = tb[1] + clear - p.y;
    const dyDown = p.y - (tb[0] - clear);
    if (dxOut <= Math.min(dyUp, dyDown)) p.x = Math.sign(p.x || 1) * (w + clear);
    else if (dyUp <= dyDown) p.y = tb[1] + clear;
    else p.y = tb[0] - clear;
    return true;
  };
  for (const p of pts) pushOut(p, margin + 15);
  const S = 900;
  for (let iter = 0; iter < 12; iter++) {
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    const samples = curve.getPoints(S);
    let i0 = -1;
    for (let i = 0; i < S; i++) {
      if (insideHull(samples[i], margin)) {
        i0 = i;
        break;
      }
    }
    if (i0 < 0) {
      curve.arcLengthDivisions = 800;
      return curve;
    }
    let i1 = i0;
    while (i1 + 1 < S && insideHull(samples[i1 + 1], margin)) i1++;
    const im = Math.floor((i0 + i1) / 2);
    const wp = samples[im].clone();
    // a run whose ends lie on opposite faces of the hull (dorsal ↔ ventral) has to go round the
    // knife edge, not over or under it
    const a = samples[Math.max(0, i0 - 1)];
    const b = samples[Math.min(S, i1 + 1)];
    const face = (p) => {
      const tb = hullTopBottom(THREE.MathUtils.clamp(p.x, -halfWidth(THREE.MathUtils.clamp(p.z, HULL.bowZ, HULL.sternZ)), halfWidth(THREE.MathUtils.clamp(p.z, HULL.bowZ, HULL.sternZ))), THREE.MathUtils.clamp(p.z, HULL.bowZ, HULL.sternZ));
      return p.y > (tb ? (tb[0] + tb[1]) / 2 : 0) ? 1 : -1;
    };
    if (face(a) !== face(b)) {
      const zc = THREE.MathUtils.clamp(wp.z, HULL.bowZ, HULL.sternZ);
      const side = a.x + b.x >= 0 ? 1 : -1;
      wp.set(side * (halfWidth(zc) + margin + 40 + iter * 10), 0, wp.z);
    } else pushOut(wp, margin + 30 + iter * 10);
    const seg = Math.min(pts.length - 1, Math.floor((im / S) * pts.length));
    // if the detour lands on top of an existing control point, push that point further out instead
    const near = pts.find((p) => p.distanceTo(wp) < 25);
    if (near) pushOut(near, margin + 40 + iter * 15);
    else pts.splice(seg + 1, 0, wp);
  }
  console.warn("traffic: a patrol loop still intersects the hull after re-routing");
  const c = new THREE.CatmullRomCurve3(pts, true, "centripetal");
  c.arcLengthDivisions = 800;
  return c;
}

// Cubic Hermite between two (position, velocity) states over duration T. s in [0,1].
function hermite(out, p0, v0, p1, v1, T, s, vel = null) {
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  out.set(0, 0, 0).addScaledVector(p0, h00).addScaledVector(v0, h10 * T).addScaledVector(p1, h01).addScaledVector(v1, h11 * T);
  if (vel) {
    const d00 = 6 * s2 - 6 * s;
    const d10 = 3 * s2 - 4 * s + 1;
    const d01 = -6 * s2 + 6 * s;
    const d11 = 3 * s2 - 2 * s;
    vel.set(0, 0, 0).addScaledVector(p0, d00).addScaledVector(v0, d10 * T).addScaledVector(p1, d01).addScaledVector(v1, d11 * T).divideScalar(T);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pilots
// ---------------------------------------------------------------------------
// Default controller: advances the fighter through the scripted state machine owned by the traffic
// system. Swap it with setPilot(id, ctrl) for AI or remote control — a controller only has to write
// fighter.pos / fighter.fwd / fighter.roll (and may set fighter.s = "manual").
export class ScriptedPilot {
  update(fighter, dt, traffic) {
    traffic.stepScripted(fighter, dt);
  }
}

// The shared exhaust material uses the light-panel diffuser, whose edges never go fully dark; a flare
// quad scaled up for distance would show as an orange square. Give the flares a round radial
// gradient instead (falls back to the shared material where there is no canvas, e.g. tests).
function flareMaterial(base) {
  if (typeof document === "undefined" || !base || !base.isMaterial) return base;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.3, "#d0d0d0");
  g.addColorStop(0.7, "#404040");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = base.clone();
  m.map = tex;
  m.name = "exhaustFlare";
  return m;
}

// ---------------------------------------------------------------------------
// Traffic system
// ---------------------------------------------------------------------------
export function createTraffic({ mats, audio, zone } = {}) {
  const group = new THREE.Group();
  group.name = "traffic";
  const T = TRAFFIC;
  const listeners = {};
  const emit = (evt, payload) => {
    for (const cb of listeners[evt] || []) cb(payload);
    hangarBus.emit(evt, payload);
  };

  // ---- paths --------------------------------------------------------------------------------
  const paths = {};
  for (const [id, anchors] of Object.entries(PATROL_LOOPS)) {
    const curve = buildPatrolCurve(anchors);
    paths[id] = { id, curve, length: curve.getLength() };
  }
  const pathIds = Object.keys(paths);

  // ---- racks --------------------------------------------------------------------------------
  const racks = HANGAR_RACKS.map((r, i) => ({ index: i, id: r.id, x: r.x, y: r.y, z: r.z, occupant: null }));
  const rackHang = (r) => r.y - T.rackDrop; // fighter centre height when clamped
  const releaseY = (r) => rackHang(r) - T.ramExt;

  // ---- fighters -----------------------------------------------------------------------------
  const fighters = [];
  for (let i = 0; i < T.fighters; i++) {
    fighters.push({
      id: i,
      s: "docked",
      t: 0,
      path: null,
      rack: null,
      recall: false,
      pos: new THREE.Vector3(),
      fwd: new THREE.Vector3(0, 0, -1),
      vel: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      roll: 0,
      rollTarget: 0,
      prevFwd: new THREE.Vector3(0, 0, -1),
      speed: 0,
      lod: 0,
      pilot: new ScriptedPilot(),
      flybyCooldown: 0,
      lateral: (i % 2 ? 1 : -1) * 14, // side offset so two fighters can share a loop
      passed: false,
      lu: null, // loop parameter where a recalled fighter actually peeled off
    });
  }
  const well = { owner: null, open: false, pending: 0, closeTimer: 0 };
  // deferLaunch: a cycle whose recall is about to arrive holds its launch until that fighter has docked
  const sched = { time: 0, next: T.firstCycle, seed: 1337, calls: 0, deferLaunch: false };
  let rand = rng(sched.seed);
  const reseed = () => {
    rand = rng(sched.seed);
    for (let i = 0; i < sched.calls; i++) rand();
  };
  const nextRand = () => {
    sched.calls++;
    return rand();
  };

  // initial layout: eight on racks (four per row), four on patrol
  const dockRacks = [0, 1, 2, 3, 6, 7, 8, 9];
  for (let i = 0; i < 8; i++) {
    const f = fighters[i];
    f.rack = dockRacks[i];
    racks[f.rack].occupant = f.id;
    f.s = "docked";
  }
  const patrolInit = [
    ["dorsal", 0.12],
    ["dorsal", 0.62],
    ["ventral", 0.3],
    ["ventral", 0.8],
  ];
  for (let k = 0; k < 4; k++) {
    const f = fighters[8 + k];
    f.s = "patrol";
    f.path = patrolInit[k][0];
    f.t = patrolInit[k][1];
  }

  // ---- pose functions (state, t) → pos / fwd -------------------------------------------------
  const loopPoint = (f, u, out, tangent = null) => {
    const P = paths[f.path];
    const uu = ((u % 1) + 1) % 1;
    P.curve.getPointAt(uu, out);
    const tan = P.curve.getTangentAt(uu, _v2).normalize();
    // side offset along the horizontal normal of the tangent
    _v.crossVectors(tan, UP);
    if (_v.lengthSq() < 1e-6) _v.set(1, 0, 0);
    _v.normalize();
    out.addScaledVector(_v, f.lateral);
    if (tangent) tangent.copy(tan);
    return out;
  };
  // Hermite tangents scaled by the duration must stay comparable to the chord, so the duration is
  // derived from the chord and the mean of the end speeds (a brisk but smooth acceleration).
  const joinTargets = (f) => {
    const p1 = new THREE.Vector3();
    const tan = new THREE.Vector3();
    loopPoint(f, T.joinU, p1, tan);
    const v1 = tan.multiplyScalar(T.patrolSpeed);
    const r = racks[f.rack];
    const p0 = new THREE.Vector3(r.x, T.exitY, r.z);
    const vExit = Math.sqrt(2 * T.dropAccel * (releaseY(r) - T.exitY));
    const v0 = new THREE.Vector3(0, -vExit, 0);
    const dur = Math.max(3.5, p0.distanceTo(p1) / (0.5 * (vExit + T.patrolSpeed)));
    return { p0, v0, p1, v1, dur };
  };
  const returnTargets = (f) => {
    const p0 = new THREE.Vector3();
    const tan = new THREE.Vector3();
    loopPoint(f, f.lu === null || f.lu === undefined ? T.leaveU : f.lu, p0, tan);
    const v0 = tan.multiplyScalar(T.patrolSpeed);
    const r = racks[f.rack];
    const p1 = new THREE.Vector3(r.x, T.approachY, r.z);
    const v1 = new THREE.Vector3(0, T.climbSpeed, 0);
    const dur = Math.max(4, p0.distanceTo(p1) / (0.5 * (T.patrolSpeed + T.climbSpeed)));
    return { p0, v0, p1, v1, dur };
  };
  // climb profile: constant climbSpeed until the deceleration point, then brake to a stop at releaseY
  const climbProfile = (r) => {
    const yEnd = releaseY(r);
    const brakeDist = (T.climbSpeed * T.climbSpeed) / (2 * T.climbDecel);
    const yBrake = yEnd - brakeDist;
    const t1 = (yBrake - T.approachY) / T.climbSpeed;
    const t2 = T.climbSpeed / T.climbDecel;
    return { yEnd, yBrake, t1, t2, total: t1 + t2 };
  };

  // Writes f.pos, f.fwd and f.speed from (f.s, f.t). Returns true when the state has run its course.
  function pose(f) {
    const r = f.rack !== null ? racks[f.rack] : null;
    switch (f.s) {
      case "docked": {
        f.pos.set(r.x, rackHang(r), r.z);
        f.fwd.copy(FWD);
        f.speed = 0;
        return false;
      }
      case "lowering": {
        const k = smooth(f.t / T.lowerTime);
        f.pos.set(r.x, rackHang(r) - T.ramExt * k, r.z);
        f.fwd.copy(FWD);
        f.speed = 0;
        return f.t >= T.lowerTime;
      }
      case "dropping": {
        const y = releaseY(r) - 0.5 * T.dropAccel * f.t * f.t;
        f.pos.set(r.x, Math.max(y, T.exitY), r.z);
        f.fwd.copy(FWD);
        f.speed = T.dropAccel * f.t;
        return y <= T.exitY;
      }
      case "launching": {
        const { p0, v0, p1, v1, dur } = joinTargets(f);
        const s = Math.min(1, f.t / dur);
        hermite(f.pos, p0, v0, p1, v1, dur, s, f.vel);
        f.speed = f.vel.length();
        // the fighter leaves the shaft level (it fell like a stone) and noses over onto its velocity
        // vector during the first part of the join
        if (f.vel.lengthSq() > 1) {
          const k = smooth(s / 0.45);
          f.fwd.copy(FWD).lerp(_v2.copy(f.vel).normalize(), k);
          if (f.fwd.lengthSq() < 1e-4) f.fwd.copy(FWD);
          f.fwd.normalize();
        }
        return f.t >= dur;
      }
      case "patrol": {
        loopPoint(f, f.t, f.pos, f.fwd);
        f.speed = T.patrolSpeed;
        return false;
      }
      case "returning": {
        const { p0, v0, p1, v1, dur } = returnTargets(f);
        const s = Math.min(1, f.t / dur);
        hermite(f.pos, p0, v0, p1, v1, dur, s, f.vel);
        f.speed = f.vel.length();
        // level off over the last part of the approach so it enters the shaft like an elevator
        if (f.vel.lengthSq() > 1) {
          const k = smooth((s - 0.55) / 0.4);
          f.fwd.copy(_v2.copy(f.vel).normalize()).lerp(FWD, k);
          if (f.fwd.lengthSq() < 1e-4) f.fwd.copy(FWD);
          f.fwd.normalize();
        }
        return f.t >= dur;
      }
      case "rising": {
        const c = climbProfile(r);
        let y;
        if (f.t < c.t1) {
          y = T.approachY + T.climbSpeed * f.t;
          f.speed = T.climbSpeed;
        } else {
          const tt = Math.min(c.t2, f.t - c.t1);
          y = c.yBrake + T.climbSpeed * tt - 0.5 * T.climbDecel * tt * tt;
          f.speed = Math.max(0, T.climbSpeed - T.climbDecel * tt);
        }
        f.pos.set(r.x, Math.min(y, c.yEnd), r.z);
        f.fwd.copy(FWD);
        return f.t >= c.total;
      }
      case "raising": {
        const k = smooth(f.t / T.raiseTime);
        f.pos.set(r.x, releaseY(r) + T.ramExt * k, r.z);
        f.fwd.copy(FWD);
        f.speed = 0;
        return f.t >= T.raiseTime;
      }
      default:
        return false;
    }
  }

  // ---- well bookkeeping ---------------------------------------------------------------------
  const wellOpen = () => {
    well.pending++;
    well.closeTimer = 0;
    if (!well.open) {
      well.open = true;
      emit("wellOpen", {});
    }
  };
  const wellRelease = () => {
    well.pending = Math.max(0, well.pending - 1);
  };
  const freeRack = () => {
    // fill the rows evenly: prefer the row with fewer occupants, then the lowest free index
    const rows = [racks.filter((r) => r.x < 0), racks.filter((r) => r.x > 0)];
    rows.sort((a, b) => a.filter((r) => r.occupant !== null).length - b.filter((r) => r.occupant !== null).length);
    for (const row of rows) {
      const r = row.find((r) => r.occupant === null);
      if (r) return r;
    }
    return null;
  };

  // ---- scripted stepping --------------------------------------------------------------------
  function setState(f, s) {
    f.s = s;
    f.t = 0;
  }
  function stepScripted(f, dt) {
    f.t += f.s === "patrol" ? (dt * T.patrolSpeed) / paths[f.path].length : dt;
    const done = pose(f);
    const r = f.rack !== null ? racks[f.rack] : null;
    switch (f.s) {
      case "lowering":
        hangarBus.emit("rack", { rack: f.rack, ext: rackHang(r) - f.pos.y, clamped: true });
        if (done) {
          setState(f, "dropping");
          hangarBus.emit("rack", { rack: f.rack, ext: T.ramExt, clamped: false });
          emit("launch", { id: f.id, rack: r.id, x: r.x, z: r.z });
          // the tractor emitters take the fighter from the ram and hold it through the shaft
          emit("passing", { id: f.id, dir: "out", x: r.x, z: r.z, duration: 7 });
          if (audio) audio.play("tie_launch");
        }
        break;
      case "dropping":
        if (done) {
          setState(f, "launching");
          // join the emptier loop so the dorsal / ventral patrols stay balanced over time
          const nd = onLoop("dorsal");
          const nv = onLoop("ventral");
          f.path = nd === nv ? (f.id % 2 ? "ventral" : "dorsal") : nd < nv ? "dorsal" : "ventral";
          racks[f.rack].occupant = null;
          f.wellHeld = true;
          // the fighter is clear of the shaft: stow the ram
          hangarBus.emit("rack", { rack: f.rack, ext: 0, clamped: false });
        }
        break;
      case "launching":
        if (f.wellHeld && f.t > 1.5) {
          f.wellHeld = false;
          wellRelease();
        }
        if (done) {
          f.t = T.joinU;
          f.rack = null;
          setStatePatrol(f);
        }
        break;
      case "patrol": {
        f.t = ((f.t % 1) + 1) % 1;
        // peel off anywhere in the leave window (the ~300 m of loop before leaveU, which is the point
        // nearest the well) as soon as the well is free; a busy well only costs a few seconds instead
        // of another lap
        if (f.recall && well.owner === null && ((f.t - (T.leaveU - T.leaveWindow) + 1) % 1) < T.leaveWindow + 0.015) {
          const rack = freeRack();
          if (rack) {
            f.recall = false;
            f.lu = f.t;
            f.rack = rack.index;
            rack.occupant = f.id;
            well.owner = f.id;
            setState(f, "returning");
            wellOpen();
            // extend the ram, clamps open, ready to receive
            hangarBus.emit("rack", { rack: f.rack, ext: T.ramExt, clamped: false });
          }
        }
        break;
      }
      case "returning":
        if (done) {
          setState(f, "rising");
          f.passed = false;
        }
        break;
      case "rising":
        if (!f.passed && f.pos.y > HANGAR_WELL.yKeel - 6) {
          f.passed = true;
          emit("passing", { id: f.id, dir: "in", x: r.x, z: r.z, duration: 6 });
        }
        if (done) {
          setState(f, "raising");
          hangarBus.emit("rack", { rack: f.rack, ext: T.ramExt, clamped: true });
        }
        break;
      case "raising":
        hangarBus.emit("rack", { rack: f.rack, ext: rackHang(r) - f.pos.y, clamped: true });
        if (done) {
          setState(f, "docked");
          f.path = null;
          f.lu = null;
          hangarBus.emit("rack", { rack: f.rack, ext: 0, clamped: true });
          emit("dock", { id: f.id, rack: r.id });
          if (well.owner === f.id) well.owner = null;
          wellRelease();
          if (sched.deferLaunch) {
            sched.deferLaunch = false;
            launchRandom();
          }
        }
        break;
      default:
        break;
    }
  }
  function setStatePatrol(f) {
    f.s = "patrol";
  }

  // ---- scheduler ----------------------------------------------------------------------------
  function launch(f) {
    if (f.s !== "docked" || well.owner !== null) return false;
    well.owner = f.id;
    setState(f, "lowering");
    wellOpen();
    return true;
  }
  function recall(f) {
    if (f.s !== "patrol") return false;
    f.recall = true;
    return true;
  }
  function launchRandom() {
    const docked = fighters.filter((f) => f.s === "docked");
    if (!docked.length) return false;
    return launch(docked[Math.floor(nextRand() * docked.length)]);
  }
  // loop fraction a patrolling fighter still has to fly before it reaches the leave window
  const toLeave = (f) => (T.leaveU - T.leaveWindow - f.t + 1) % 1;
  // fighters flying (and staying on) a loop; launching ones count as they are about to join it
  const onLoop = (p) => fighters.filter((g) => g.path === p && ((g.s === "patrol" && !g.recall) || g.s === "launching")).length;
  function cycle() {
    // one operation pair at a time: while the well is owned, a recall is still on its way or a
    // deferred launch is pending, look again in a few seconds
    if (well.owner !== null || sched.deferLaunch || fighters.some((f) => f.recall)) {
      sched.next = sched.time + 4;
      return;
    }
    const docked = fighters.filter((f) => f.s === "docked");
    const flying = fighters.filter((f) => f.s === "patrol" && !f.recall);
    let deferred = false;
    // recall the fighter that reaches the leave window soonest, so the recall lands within seconds
    // rather than after another lap. Keep at least three on patrol.
    if (flying.length && flying.length + (docked.length ? 1 : 0) > 3) {
      // take the recall from the fuller loop (a tie keeps both candidates), then the soonest arrival
      const nd = onLoop("dorsal");
      const nv = onLoop("ventral");
      const fuller = nd === nv ? [] : flying.filter((f) => f.path === (nd > nv ? "dorsal" : "ventral"));
      const pool = fuller.length ? fuller : flying;
      const soonest = pool.reduce((a, b) => (toLeave(a) <= toLeave(b) ? a : b));
      recall(soonest);
      // an imminent arrival gets the well first; the launch follows as soon as it has docked
      if (toLeave(soonest) < 0.4 && docked.length) deferred = true;
    }
    if (deferred) sched.deferLaunch = true;
    else launchRandom();
    sched.next = sched.time + T.cycleMin + nextRand() * (T.cycleMax - T.cycleMin);
  }
  function stepWell(dt) {
    // a launched fighter frees the well 1.5 s into its join spline; the owner slot then goes to the
    // next op. Doors close once nothing is pending for a moment.
    if (well.owner !== null) {
      const o = fighters[well.owner];
      if (o.s === "launching" && !o.wellHeld) well.owner = null;
      else if (o.s === "patrol" || o.s === "docked") well.owner = null;
    }
    if (well.open && well.pending === 0 && well.owner === null) {
      well.closeTimer += dt;
      if (well.closeTimer > 1.0) {
        well.open = false;
        well.closeTimer = 0;
        emit("wellClose", {});
      }
    }
  }

  // ---- rendering ----------------------------------------------------------------------------
  const N = T.fighters;
  const lodSets = [[], []];
  for (const lod of [0, 1]) {
    for (const [mat, geo] of tieMerged(lod)) {
      const material = mats[mat];
      if (!material) throw new Error("traffic: unknown material " + mat);
      const im = new THREE.InstancedMesh(geo, material, N);
      im.name = `tie_lod${lod}_${mat}`;
      im.castShadow = !(mat === "tieGlass" || mat.startsWith("emit"));
      im.receiveShadow = true;
      im.frustumCulled = true;
      for (let i = 0; i < N; i++) im.setMatrixAt(i, _zero);
      group.add(im);
      lodSets[lod].push(im);
    }
  }
  // exhaust flares: one camera-facing additive quad per engine, scaled by throttle
  const flare = (() => {
    const g = new THREE.PlaneGeometry(1.5, 1.5);
    const im = new THREE.InstancedMesh(g, flareMaterial(mats.exhaustGlow), N * 2);
    im.name = "tie_exhaust";
    im.castShadow = false;
    im.receiveShadow = false;
    im.frustumCulled = true;
    im.renderOrder = 5;
    group.add(im);
    return im;
  })();
  const flareLocal = [new THREE.Vector3(-0.64, -0.42, 2.9), new THREE.Vector3(0.64, -0.42, 2.9)];
  const _s = new THREE.Vector3();
  const _fm = new THREE.Matrix4();
  const _fp = new THREE.Vector3();
  const _fq = new THREE.Quaternion();
  const _look = new THREE.Matrix4();

  function updateInstances(cameraPos) {
    for (const f of fighters) {
      const d = cameraPos ? f.pos.distanceTo(cameraPos) : 0;
      f.lod = d > T.hide ? -1 : d > T.lod1 ? 1 : 0;
      _m.compose(f.pos, f.quat, _s.set(1, 1, 1));
      for (const lod of [0, 1]) for (const im of lodSets[lod]) im.setMatrixAt(f.id, f.lod === lod ? _m : _zero);
      // Exhaust flares grow with distance beyond 200 m and slide from the emitters toward the hull
      // centre, so a patrolling fighter still reads as a glowing speck from the exterior presets
      // (a 9 m craft is a few pixels at 1.7 km, and its own body would hide the engines from the front).
      const far = Math.min(6, Math.max(1, d / 200));
      const throttle = (f.s === "docked" || f.s === "lowering" || f.s === "raising" ? 0.35 : THREE.MathUtils.clamp(0.9 + f.speed / 60, 0.9, 2.2)) * far;
      const pull = 1 / far;
      for (let k = 0; k < 2; k++) {
        if (f.lod < 0) {
          flare.setMatrixAt(f.id * 2 + k, _zero);
          continue;
        }
        _fp.copy(flareLocal[k]).multiplyScalar(pull).applyQuaternion(f.quat).add(f.pos);
        if (cameraPos) {
          // at range the quad sits inside the cockpit ball: lift it toward the camera so the body
          // cannot punch a hole through it
          _fp.addScaledVector(_v2.subVectors(cameraPos, f.pos).normalize(), 2.6 * (1 - pull));
          _look.lookAt(cameraPos, _fp, UP);
          _fq.setFromRotationMatrix(_look);
        } else _fq.copy(f.quat);
        flare.setMatrixAt(f.id * 2 + k, _fm.compose(_fp, _fq, _s.set(throttle, throttle, throttle)));
      }
    }
    // InstancedMesh.computeBoundingSphere unions the geometry sphere per instance, so the culling
    // sphere follows the wing wherever it is (hidden instances collapse to the origin)
    for (const lod of [0, 1]) {
      for (const im of lodSets[lod]) {
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
      }
    }
    flare.instanceMatrix.needsUpdate = true;
    flare.computeBoundingSphere();
  }

  // heading / banking → quaternion
  const _qr = new THREE.Quaternion();
  const Z_AXIS = new THREE.Vector3(0, 0, 1);
  const _origin = new THREE.Vector3();
  function updateAttitude(f, dt) {
    // bank from the yaw rate (tan(bank) = v·ω / g), softened. cross.y > 0 is a left turn, which
    // wants the left wing down: a positive rotation about the fighter's own +Z (aft) axis.
    const cross = _v.crossVectors(f.prevFwd, f.fwd).y;
    const yawRate = dt > 0 ? Math.asin(THREE.MathUtils.clamp(cross, -1, 1)) / dt : 0;
    const bank = f.speed > 5 && dt > 0 ? Math.atan((yawRate * f.speed) / 9.81) * 0.7 : 0;
    f.rollTarget = THREE.MathUtils.clamp(bank, -0.9, 0.9);
    f.roll += (f.rollTarget - f.roll) * Math.min(1, dt * 2.5);
    f.prevFwd.copy(f.fwd);
    _look.lookAt(_origin, f.fwd, UP);
    _q.setFromRotationMatrix(_look);
    _qr.setFromAxisAngle(Z_AXIS, f.roll);
    _q.multiply(_qr);
    if (f.s === "docked" || dt <= 0) f.quat.copy(_q);
    else f.quat.slerp(_q, Math.min(1, dt * 5));
  }

  // ---- public API ---------------------------------------------------------------------------
  const api = {
    group,
    fighters,
    racks,
    paths,
    well,
    stats: { fighters: N, airborne: 4 },
    stepScripted,
    launch: (id) => launch(fighters[id]),
    recall: (id) => recall(fighters[id]),
    update(dt, t, cameraPos) {
      sched.time += dt;
      if (sched.time >= sched.next) cycle();
      for (const f of fighters) f.pilot.update(f, dt, api);
      stepWell(dt);
      let airborne = 0;
      for (const f of fighters) {
        updateAttitude(f, dt);
        if (f.s !== "docked" && f.s !== "lowering" && f.s !== "raising") airborne++;
        // flyby: fast and close to the camera
        f.flybyCooldown = Math.max(0, f.flybyCooldown - dt);
        if (cameraPos && f.speed > 20 && f.flybyCooldown === 0 && f.pos.distanceToSquared(cameraPos) < 160 * 160) {
          f.flybyCooldown = 25;
          emit("flyby", { id: f.id, x: f.pos.x, y: f.pos.y, z: f.pos.z });
          if (audio) audio.play("tie_flyby");
        }
      }
      api.stats.airborne = airborne;
      updateInstances(cameraPos);
    },
    setPilot(id, controller) {
      const f = fighters[id];
      if (!f) return false;
      f.pilot = controller || new ScriptedPilot();
      return true;
    },
    on(evt, cb) {
      (listeners[evt] = listeners[evt] || []).push(cb);
      return () => {
        listeners[evt] = (listeners[evt] || []).filter((c) => c !== cb);
      };
    },
    getState() {
      return {
        time: sched.time,
        next: sched.next,
        calls: sched.calls,
        dl: sched.deferLaunch ? 1 : 0,
        well: { o: well.owner, open: well.open ? 1 : 0, p: well.pending },
        f: fighters.map((f) => ({ id: f.id, s: f.s, p: f.path, t: +f.t.toFixed(6), r: f.rack, rc: f.recall ? 1 : 0, h: f.wellHeld ? 1 : 0, lu: f.lu === null ? null : +f.lu.toFixed(6) })),
      };
    },
    applyState(st) {
      if (!st || !st.f) return;
      for (const r of racks) r.occupant = null;
      for (const e of st.f) {
        const f = fighters[e.id];
        if (!f) continue;
        f.s = e.s;
        f.path = e.p;
        f.t = e.t;
        f.rack = e.r === undefined ? null : e.r;
        f.recall = !!e.rc;
        f.wellHeld = !!e.h;
        f.lu = e.lu === undefined || e.lu === null ? null : e.lu;
        if (f.rack !== null && f.rack !== undefined) racks[f.rack].occupant = f.id;
        pose(f);
        f.prevFwd.copy(f.fwd);
        updateAttitude(f, 0);
      }
      if (st.well) {
        const wasOpen = well.open;
        well.owner = st.well.o;
        well.open = !!st.well.open;
        well.pending = st.well.p || 0;
        // the hangar's blast doors follow the bus, so a restored snapshot has to replay the door state
        if (well.open !== wasOpen) emit(well.open ? "wellOpen" : "wellClose", {});
      }
      if (st.time !== undefined) sched.time = st.time;
      if (st.next !== undefined) sched.next = st.next;
      sched.deferLaunch = !!st.dl;
      if (st.calls !== undefined) {
        sched.calls = st.calls;
        reseed();
      }
      updateInstances(null);
    },
  };

  // initial poses
  for (const f of fighters) {
    pose(f);
    f.prevFwd.copy(f.fwd);
    updateAttitude(f, 0);
  }
  updateInstances(null);
  return api;
}
