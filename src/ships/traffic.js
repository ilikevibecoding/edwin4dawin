// Ship traffic over Coruscant (and one shuttle at the frontier pad): deterministic lanes above the city plus landing /
// take-off cycles on the spaceport pads. Every ship's pose is a pure function of the shared 20 TPS clock (tick + render alpha), so all clients agree
// and the same landing happens at the same tick on every load. Rendering is one InstancedMesh per ship model
// (<= 1 draw call per model type); ships farther than HIDE_DIST from the camera are not submitted.
//
// Route model: a route is a periodic list of segments
//   fly   - arc-length parameterised Catmull-Rom path with an accelerate / cruise / decelerate speed profile
//   vert  - vertical translation over a pad (descent, touchdown, lift, climb) with the approach heading held
//   hold  - hover (small bob) or dwell on the pad
// Pad routes: closed loop around the city that stops above the pad -> descend -> hover 2 s -> touch down ->
// dwell 15..40 s -> lift -> hover -> climb -> next loop. Lane routes: closed loop at constant speed.
// Banking comes from the path curvature (lateral acceleration vs gravity), pitch from the climb angle.
import * as THREE from 'three';
import { hash2 } from '../rng.js';
import { TICK_RATE } from '../constants.js';
import { shipModels, makeShipInstances } from './models.js';
import { getLayout } from '../coruscant/layout.js';

export const HIDE_DIST = 300;          // ships beyond this are not drawn
const AUDIO_DIST = 220, MAX_LOOPS = 3;
const G = 9.81;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const wrapAngle = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// ------------------------------------------------------------------------------------------------ paths
function catmullRom(p0, p1, p2, p3, t, out) {
  const t2 = t * t, t3 = t2 * t;
  for (let i = 0; i < 3; i++) {
    out[i] = 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
  }
}

export class Path {
  constructor(points, closed) {
    const n = points.length, segs = closed ? n : n - 1;
    const get = (i) => (closed ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
    const samples = [], tmp = [0, 0, 0];
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
      const steps = Math.max(2, Math.ceil(segLen / 2));
      for (let k = 0; k < steps; k++) { catmullRom(p0, p1, p2, p3, k / steps, tmp); samples.push(tmp[0], tmp[1], tmp[2]); }
    }
    const last = closed ? points[0] : points[n - 1];
    samples.push(last[0], last[1], last[2]);
    this.pts = new Float32Array(samples);
    this.n = samples.length / 3;
    this.cum = new Float32Array(this.n);
    let L = 0;
    for (let i = 1; i < this.n; i++) {
      const a = (i - 1) * 3, b = i * 3;
      L += Math.hypot(this.pts[b] - this.pts[a], this.pts[b + 1] - this.pts[a + 1], this.pts[b + 2] - this.pts[a + 2]);
      this.cum[i] = L;
    }
    this.length = L;
    this.closed = closed;
  }
  // position at arc length s (wrapped when closed, clamped otherwise) -> out {x,y,z}
  at(s, out) {
    const L = this.length;
    if (this.closed) { s %= L; if (s < 0) s += L; } else s = clamp(s, 0, L);
    let lo = 0, hi = this.n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (this.cum[mid] <= s) lo = mid; else hi = mid; }
    const segL = this.cum[hi] - this.cum[lo], f = segL > 0 ? (s - this.cum[lo]) / segL : 0;
    const a = lo * 3, b = hi * 3, p = this.pts;
    out.x = p[a] + (p[b] - p[a]) * f; out.y = p[a + 1] + (p[b + 1] - p[a + 1]) * f; out.z = p[a + 2] + (p[b + 2] - p[a + 2]) * f;
    return out;
  }
  // unit tangent at s (central difference over 3 blocks)
  tangent(s, out) {
    const a = this.at(s - 1.5, { x: 0, y: 0, z: 0 }), b = this.at(s + 1.5, { x: 0, y: 0, z: 0 });
    out.x = b.x - a.x; out.y = b.y - a.y; out.z = b.z - a.z;
    const l = Math.hypot(out.x, out.y, out.z) || 1;
    out.x /= l; out.y /= l; out.z /= l;
    return out;
  }
  heading(s) { const t = this.tangent(s, { x: 0, y: 0, z: 0 }); return Math.atan2(-t.x, -t.z); }
}

// accelerate (linear) over accelDist, cruise at v, decelerate over accelDist; accelDist 0 = constant speed
function makeProfile(L, v, accelDist) {
  const Da = Math.min(accelDist, L / 2);
  const ta = Da > 0 ? 2 * Da / v : 0, tc = (L - 2 * Da) / v, T = 2 * ta + tc;
  return {
    T,
    s(t) {
      if (t < ta) return (v / (2 * ta)) * t * t;
      if (t < ta + tc) return Da + v * (t - ta);
      const r = Math.max(0, T - t); return L - (v / (2 * ta)) * r * r;
    },
    v(t) {
      if (t < ta) return v * t / ta;
      if (t < ta + tc) return v;
      return v * Math.max(0, T - t) / ta;
    },
  };
}

// ------------------------------------------------------------------------------------------------ routes
function makeRoute(segs) {
  let t0 = 0;
  for (const s of segs) { s.t0 = t0; t0 += s.dur; }
  return { segs, period: t0 };
}

// Approach loop for a spaceport pad: the spaceport sits on the plateau's west edge, so arrivals and departures
// swing out over the ocean (x < 2488) and come back to the pad heading east, at heights that clear the deck (y 96),
// the terminal roof (y 111) and the control tower cab (y 156) while never crossing the skyline. side = which half
// of the city the pad is on, k = lane variant so ships on neighbouring pads do not share a track.
function coruscantLoop(P, side, k) {
  const s = side;
  return [
    [P.x, 130, P.z],
    [P.x - 90, 142, P.z + s * 24],
    [2440, 162 + 4 * k, s * (230 + 30 * k)],
    [2300, 184 + 4 * k, s * (430 + 20 * k)],
    [2110, 196 + 4 * k, s * (280 + 10 * k)],
    [2020 - 30 * k, 202 + 4 * k, 0],
    [2110, 196 + 4 * k, -s * (280 + 10 * k)],
    [2300, 180 + 4 * k, -s * (430 + 20 * k)],
    [2440, 158 + 4 * k, -s * (230 + 30 * k)],
    [P.x - 90, 138, P.z - s * 24],
  ];
}

// Loop over the frontier town (at the origin) starting/ending above the frontier pad.
function frontierLoop(P) {
  return [
    [P.x, 130, P.z],
    [P.x - 60, 138, P.z - 30],
    [120, 150, -200],
    [-120, 158, -220],
    [-260, 150, -40],
    [-200, 148, 200],
    [40, 140, 260],
    [220, 134, 120],
    [P.x + 60, 130, P.z + 30],
  ];
}

// Pad ship: the loop, then the landing cycle over pad P (loop[0] must be above the pad at y 130).
function padRoute(P, loop, speed, deckY, dwell) {
  const path = new Path(loop, true);
  const prof = makeProfile(path.length, speed, 120);
  const yaw = path.heading(0);
  const hover = deckY + 4, top = 130;
  return makeRoute([
    { kind: 'fly', path, prof, dur: prof.T, phase: 'fly' },
    { kind: 'vert', x: P.x, z: P.z, y0: top, y1: hover, dur: 8, yaw, thrust: 0.8, phase: 'descend' },
    { kind: 'hold', x: P.x, z: P.z, y: hover, dur: 2, yaw, bob: 0.25, thrust: 0.7, phase: 'hover' },
    { kind: 'vert', x: P.x, z: P.z, y0: hover, y1: deckY, dur: 2.5, yaw, thrust: 0.45, thrust1: 0.15, phase: 'touchdown' },
    { kind: 'hold', x: P.x, z: P.z, y: deckY, dur: dwell, yaw, bob: 0, thrust: 0.12, phase: 'dwell' },
    { kind: 'vert', x: P.x, z: P.z, y0: deckY, y1: hover, dur: 2.5, yaw, thrust: 0.9, phase: 'lift' },
    { kind: 'hold', x: P.x, z: P.z, y: hover, dur: 1, yaw, bob: 0.2, thrust: 0.9, phase: 'hover' },
    { kind: 'vert', x: P.x, z: P.z, y0: hover, y1: top, dur: 7, yaw, thrust: 1, phase: 'climb' },
  ]);
}

function laneRoute(points, speed) {
  const path = new Path(points, true);
  const prof = makeProfile(path.length, speed, 0);
  return makeRoute([{ kind: 'fly', path, prof, dur: prof.T, phase: 'fly' }]);
}

// The sky lanes over the plateau follow the boulevard corridors of the city layout: no tower ever stands on a
// boulevard, so a lane that stays within CORRIDOR blocks of a boulevard centre line is clear of buildings at
// every height. Landmarks cut the boulevards inside their lots, so a lane may only use lines where an unbroken
// mid-level segment exists (lanes are validated against the layout's segments; see laneRectValid). Skybridges
// cross the corridors between y 130 and y 193, gangway lamps reach y 99 and the lift shafts y 100, so the low
// airspeeder lanes fly at y 106..112 and the tall lanes at y 214+ (above every skybridge).
const CORRIDOR = 8;
const CORNER_APPROACH = 18;

// Points of a closed rectangle whose sides lie on boulevard lines X0/X1 (z-axis boulevards) and Z0/Z1 (x-axis
// boulevards). Extra points before/after each corner keep the Catmull-Rom spline inside the corridor.
function rectLanePts(X0, X1, Z0, Z1, y, ywob) {
  const corners = [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]];
  const out = [];
  for (let c = 0; c < 4; c++) {
    const [ax, az] = corners[c], [bx, bz] = corners[(c + 1) % 4];
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    const pts = [[ax, az]];
    if (len > 2 * CORNER_APPROACH + 24) pts.push([ax + ux * CORNER_APPROACH, az + uz * CORNER_APPROACH], [(ax + bx) / 2, (az + bz) / 2], [bx - ux * CORNER_APPROACH, bz - uz * CORNER_APPROACH]);
    else pts.push([(ax + bx) / 2, (az + bz) / 2]);
    for (const [px, pz] of pts) out.push([px, y + ywob * Math.sin(out.length * 0.9), pz]);
  }
  return out;
}

// True when every sample of the closed spline through `pts` lies within CORRIDOR of an unbroken mid-level
// boulevard segment (the intersections are covered by the segments meeting there).
export function lanePathClear(pts, layout) {
  const segs = layout._mids || (layout._mids = layout.boulevards.filter((s) => s.level === 'mid'));
  const path = new Path(pts, true);
  const p = { x: 0, y: 0, z: 0 };
  for (let s = 0; s < path.length; s += 2) {
    path.at(s, p);
    let ok = false;
    for (const sg of segs) {
      if (sg.axis === 'z') { if (Math.abs(p.x - sg.coord) <= CORRIDOR && p.z >= sg.z0 - CORRIDOR && p.z < sg.z1 + CORRIDOR) { ok = true; break; } }
      else if (Math.abs(p.z - sg.coord) <= CORRIDOR && p.x >= sg.x0 - CORRIDOR && p.x < sg.x1 + CORRIDOR) { ok = true; break; }
    }
    if (!ok) return false;
  }
  return true;
}

// Picks nested boulevard rectangles from the layout lines that pass lanePathClear: two tall loops (opposite
// directions), one high cross-city loop and two low airspeeder loops hugging the streets.
function laneLoops(layout) {
  const { xs, zs } = layout.lines;
  const mids = layout._mids || (layout._mids = layout.boulevards.filter((s) => s.level === 'mid'));
  const n = xs.length, m = zs.length;
  // a rectangle side is usable when one unbroken segment of that boulevard line covers it (plus the corridor)
  const covers = (axis, li, from, to) => mids.some((s) => s.axis === axis && s.line === li && (axis === 'z' ? (s.z0 <= from - CORRIDOR && s.z1 >= to + CORRIDOR) : (s.x0 <= from - CORRIDOR && s.x1 >= to + CORRIDOR)));
  const rectOk = (i0, i1, j0, j1) => covers('z', i0, zs[j0], zs[j1]) && covers('z', i1, zs[j0], zs[j1]) && covers('x', j0, xs[i0], xs[i1]) && covers('x', j1, xs[i0], xs[i1]);
  const rects = [];
  for (let i0 = 0; i0 < n; i0++) for (let i1 = i0 + 1; i1 < n; i1++) for (let j0 = 0; j0 < m; j0++) for (let j1 = j0 + 1; j1 < m; j1++) {
    if (!rectOk(i0, i1, j0, j1)) continue;
    rects.push({ i0, i1, j0, j1, w: xs[i1] - xs[i0], d: zs[j1] - zs[j0], area: (xs[i1] - xs[i0]) * (zs[j1] - zs[j0]) });
  }
  rects.sort((a, b) => b.area - a.area);
  const lanes = [];
  const add = (r, y, ywob, spec) => {
    if (!r) return null;
    const pts = rectLanePts(xs[r.i0], xs[r.i1], zs[r.j0], zs[r.j1], y, ywob);
    if (!lanePathClear(pts, layout)) return null;
    lanes.push({ ...spec, pts: spec.reverse ? pts.reverse() : pts });
    return r;
  };
  const inside = (a, b) => a.i0 >= b.i0 && a.i1 <= b.i1 && a.j0 >= b.j0 && a.j1 <= b.j1;
  // tall loops: the largest clear rectangle, then the largest one strictly inside it with at most half its area
  let outer = null;
  for (const r of rects) { if (r.w >= 300 && r.d >= 300 && add(r, 216, 4, { name: 'tall outer', types: [0, 1, 3, 0], speedMul: 1 })) { outer = r; break; } }
  if (outer) for (const r of rects) { if (r !== outer && inside(r, outer) && r.area <= outer.area * 0.5 && r.w >= 150 && r.d >= 150 && (r.i0 > outer.i0 || r.i1 < outer.i1) && add(r, 224, 3, { name: 'tall inner', types: [1, 3, 0], speedMul: 0.9, reverse: true })) break; }
  // low airspeeder loops: narrow rectangles (two neighbouring boulevards, 2..4 blocks long) on each half of the city
  const narrow = rects.filter((r) => r.i1 - r.i0 === 1 && r.j1 - r.j0 >= 2 && r.j1 - r.j0 <= 4);
  const west = narrow.find((r) => xs[r.i1] < 2900), east = narrow.slice().reverse().find((r) => xs[r.i0] > 3100 && r.j1 - r.j0 >= 3) || narrow.find((r) => xs[r.i0] > 3100);
  add(west, 108, 1, { name: 'street west', types: [2, 2], speedMul: 1 });
  add(east, 110, 1, { name: 'street east', types: [2, 2, 2], speedMul: 1.1, reverse: true });
  // high cross-city loop above everything (the tallest spire reaches y 260)
  lanes.push({ name: 'high cross', pts: [[2560, 268, -430], [3000, 272, -470], [3440, 268, -430], [3480, 266, 0], [3440, 268, 430], [3000, 272, 470], [2560, 268, 430], [2520, 266, 0]], types: [0, 1], speedMul: 1.1 });
  return lanes;
}

// Builds the deterministic ship list: { type, route, offset, name, pad, padPos } (pure data, no THREE).
// `frontier` (optional) = { pad: {x, z}, deckY } adds one shuttle cycling on the frontier spaceport pad.
export function buildShips(pads, deckY, frontier = null, layout = null) {
  layout = layout || getLayout(1337);
  const models = shipModels();
  const ships = [];
  const padTypes = [0, 1, 3, 1, 0, 2, 3, 0];
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i], type = padTypes[i % padTypes.length], side = pad.z < 0 ? -1 : 1;
    const k = i % 4;
    const dwell = Math.round(15 + hash2(i, 3, 901) * 25);
    const route = padRoute(pad, coruscantLoop(pad, side, k), models[type].speed, deckY, dwell);
    ships.push({ type, route, offset: Math.floor(hash2(i, 5, 902) * route.period), name: `${models[type].name} pad ${i + 1}`, pad: i, padPos: pad });
  }
  if (frontier) {
    const route = padRoute(frontier.pad, frontierLoop(frontier.pad), models[1].speed, frontier.deckY, 30);
    ships.push({ type: 1, route, offset: 40, name: 'shuttle frontier pad', pad: 'frontier', padPos: frontier.pad });
  }
  laneLoops(layout).forEach((lane, li) => {
    lane.types.forEach((type, j) => {
      const route = laneRoute(lane.pts, models[type].speed * lane.speedMul);
      const offset = (j / lane.types.length) * route.period + hash2(li, j, 903) * 20;
      ships.push({ type, route, offset, name: `${models[type].name} ${lane.name} #${j + 1}`, pad: null, padPos: null, lanePts: lane.pts });
    });
  });
  return ships;
}

// Pose of a route at time t (seconds): position, yaw/pitch/roll, thrust 0..1, phase name, speed.
const _tan = { x: 0, y: 0, z: 0 };
export function routePose(route, t, out) {
  let tl = t % route.period; if (tl < 0) tl += route.period;
  const segs = route.segs;
  let i = 0;
  while (i < segs.length - 1 && tl >= segs[i].t0 + segs[i].dur) i++;
  const seg = segs[i], u = tl - seg.t0;
  out.phase = seg.phase; out.roll = 0; out.pitch = 0;
  if (seg.kind === 'fly') {
    const s = seg.prof.s(u), v = seg.prof.v(u), path = seg.path;
    path.at(s, out);
    path.tangent(s, _tan);
    out.yaw = Math.atan2(-_tan.x, -_tan.z);
    out.pitch = Math.asin(clamp(_tan.y, -1, 1)) * 0.7;
    // bank from horizontal curvature: lateral acceleration v^2 * kappa against gravity
    const d = 4;
    const k = wrapAngle(path.heading(s + d) - path.heading(s - d)) / (2 * d);
    out.roll = clamp(Math.atan2(v * v * k, G), -0.75, 0.75);
    out.thrust = 1; out.speed = v;
  } else if (seg.kind === 'vert') {
    const f = smooth(u / seg.dur);
    out.x = seg.x; out.z = seg.z; out.y = seg.y0 + (seg.y1 - seg.y0) * f; out.yaw = seg.yaw;
    out.thrust = seg.thrust1 !== undefined ? seg.thrust + (seg.thrust1 - seg.thrust) * f : seg.thrust;
    out.speed = Math.abs(seg.y1 - seg.y0) / seg.dur;
  } else {
    out.x = seg.x; out.z = seg.z; out.y = seg.y + seg.bob * Math.sin(u * 2.5); out.yaw = seg.yaw;
    out.thrust = seg.thrust; out.speed = 0;
  }
  return out;
}

// Next time >= t at which the ship's segment `phase` starts (for cameras / tests). Returns null for lane ships.
export function nextPhaseStart(ship, phase, t) {
  const r = ship.route;
  const seg = r.segs.find((s) => s.phase === phase);
  if (!seg) return null;
  const ts = t + ship.offset;
  const cycles = Math.floor((ts - seg.t0) / r.period);
  let start = seg.t0 + (cycles + 1) * r.period;
  if (seg.t0 + cycles * r.period >= ts) start = seg.t0 + cycles * r.period;
  return start - ship.offset;
}

// ------------------------------------------------------------------------------------------------ vehicle
export class ShipTraffic {
  constructor(game, spec) {
    this.game = game;
    this.pads = spec.pads;
    this.deckY = spec.deckY;
    const seed = spec.layout ? spec.layout.seed : (game.world && game.world.gen ? game.world.gen.seed : 1337);
    this.ships = buildShips(this.pads, this.deckY, spec.frontier || null, spec.layout || getLayout(seed));
    this.models = shipModels();
    this.tickCount = 0;
    this.group = new THREE.Group();
    this.group.name = 'ship-traffic';
    this.types = this.models.map((m, ti) => {
      const capacity = Math.max(1, this.ships.filter((s) => s.type === ti).length);
      const inst = makeShipInstances(m, game.atlas, capacity);
      this.group.add(inst.mesh);
      return { ...inst, capacity, count: 0 };
    });
    this._pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, thrust: 1, phase: 'fly', speed: 0 };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    for (const sh of this.ships) { sh.x = 0; sh.y = 0; sh.z = 0; sh.dist = Infinity; sh.phase = 'fly'; sh.prevPhase = 'fly'; sh.speed = 0; sh.loop = false; sh.prevDist = Infinity; }
    this.audioTimer = 0;
    this.stats = { ships: this.ships.length, visible: 0, drawCalls: 0, loops: 0 };
  }

  onAdd(game) { game.scene.add(this.group); }
  onRemove(game) { game.scene.remove(this.group); this.stopAudio(); }

  tick(tickCount) { this.tickCount = tickCount; }

  // current simulation time in seconds (tick clock + render alpha)
  timeAt(alpha) { return (this.tickCount + alpha) / TICK_RATE; }

  update(dt, alpha, camera) {
    const t = this.timeAt(alpha);
    for (const ty of this.types) ty.material.uniforms.uTime.value = t % 1000;
    const cam = camera.position, world = this.game.world;
    for (const ty of this.types) ty.count = 0;
    let visible = 0;
    const pose = this._pose;
    for (const sh of this.ships) {
      routePose(sh.route, t + sh.offset, pose);
      sh.x = pose.x; sh.y = pose.y; sh.z = pose.z; sh.prevPhase = sh.phase; sh.phase = pose.phase; sh.speed = pose.speed; sh.thrust = pose.thrust;
      sh.dist = Math.hypot(pose.x - cam.x, pose.y - cam.y, pose.z - cam.z);
      if (sh.dist > HIDE_DIST) continue;
      const ty = this.types[sh.type], k = ty.count++;
      this._e.set(pose.pitch, pose.yaw, pose.roll);
      this._q.setFromEuler(this._e);
      this._p.set(pose.x, pose.y, pose.z);
      this._m.compose(this._p, this._q, this._s);
      ty.mesh.setMatrixAt(k, this._m);
      const l = world.sampleLight(pose.x, pose.y + 1, pose.z);
      ty.attr.setXYZ(k, l[0], l[1], pose.thrust);
      visible++;
    }
    let calls = 0;
    for (const ty of this.types) {
      ty.mesh.count = ty.count;
      ty.mesh.visible = ty.count > 0;
      if (ty.count > 0) { ty.mesh.instanceMatrix.needsUpdate = true; ty.attr.needsUpdate = true; calls++; }
    }
    this.stats.visible = visible; this.stats.drawCalls = calls;
    this.updateAudio(dt);
  }

  // Engine whine: sawtooth through a resonant low-pass per ship, at most MAX_LOOPS nearest ships within AUDIO_DIST;
  // one-shots on touchdown and lift-off.
  updateAudio(dt) {
    const audio = this.game.audio;
    if (!audio || !audio.ctx) return;
    for (const sh of this.ships) {
      if (sh.phase !== sh.prevPhase && sh.dist < 160) {
        const pos = { x: sh.x, y: sh.y, z: sh.z };
        if (sh.phase === 'dwell') { audio.noise(0.6, 'lowpass', 420, 0.7, 0.55, pos, 170, 0.01, 90); audio.tone('sine', 70, 40, 0.5, 0.25, pos, 170, 0.01); }
        else if (sh.phase === 'lift') audio.noise(1.4, 'bandpass', 700, 0.8, 0.35, pos, 170, 0.4, 1600);
      }
    }
    this.audioTimer += dt;
    if (this.audioTimer < 0.12) return;
    this.audioTimer = 0;
    const near = this.ships.filter((s) => s.dist < AUDIO_DIST).sort((a, b) => a.dist - b.dist).slice(0, MAX_LOOPS);
    let loops = 0;
    for (let i = 0; i < this.ships.length; i++) {
      const sh = this.ships[i], id = 'ship' + i;
      const keep = near.includes(sh);
      if (!keep) { if (sh.loop) { audio.loopStop(id, 0.5); sh.loop = false; } continue; }
      const m = this.models[sh.type];
      if (!sh.loop) { audio.loopStart(id, { kind: 'osc', type: 'sawtooth', freq: m.engineHz, cutoff: 400, q: 2.5, gain: 0 }); sh.loop = true; }
      const nearF = 1 - sh.dist / AUDIO_DIST;
      const radial = (sh.prevDist - sh.dist) / 0.12;                 // closing speed (blocks/s), exaggerated doppler
      const thr = 0.35 + 0.65 * sh.thrust;
      const gain = m.gain * 0.2 * Math.pow(nearF, 1.6) * thr;
      const freq = m.engineHz * (0.85 + 0.3 * Math.min(1, sh.speed / 40) + 0.2 * sh.thrust) * clamp(1 + radial / 400, 0.8, 1.25);
      const sp = audio.spatialFor({ x: sh.x, y: sh.y, z: sh.z }, AUDIO_DIST);
      audio.loopSet(id, { gain, freq, cutoff: 250 + 1600 * nearF * thr, pan: sp.pan }, 0.15);
      loops++;
    }
    for (const sh of this.ships) sh.prevDist = sh.dist;
    this.stats.loops = loops;
  }

  stopAudio() {
    const audio = this.game.audio;
    for (let i = 0; i < this.ships.length; i++) if (this.ships[i].loop) { if (audio) audio.loopStop('ship' + i, 0.3); this.ships[i].loop = false; }
  }

  // --- helpers for tests / cameras --------------------------------------------------------------
  poseOf(i, t) { return routePose(this.ships[i].route, t + this.ships[i].offset, { ...this._pose }); }
  // ticks until ship i next starts `phase` (e.g. 'descend'), from the current clock
  ticksUntil(i, phase) { const t = this.timeAt(0); const nt = nextPhaseStart(this.ships[i], phase, t); return nt === null ? null : Math.round((nt - t) * TICK_RATE); }
  summary() {
    const byPhase = {};
    for (const sh of this.ships) byPhase[sh.phase] = (byPhase[sh.phase] || 0) + 1;
    return { ...this.stats, byPhase, tick: this.tickCount };
  }
}

// Adds the traffic vehicle once the game has its vehicle manager, world and atlas (register() runs before they exist).
export function installShipTraffic(game, spec) {
  if (!game || typeof requestAnimationFrame !== 'function') return;
  const tryInstall = () => {
    if (game.shipTraffic) return;
    if (game.vehicles && game.world && game.scene && game.atlas) { game.shipTraffic = game.vehicles.add(new ShipTraffic(game, spec)); return; }
    requestAnimationFrame(tryInstall);
  };
  tryInstall();
}
