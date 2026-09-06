// Ship traffic over Coruscant (and one shuttle at the frontier pad): deterministic lanes above the city, harbour
// circuits around the spaceport and a full port cycle on every pad. Every ship's pose AND animation state is a pure
// function of the shared 20 TPS clock, so all clients agree and the same landing happens at the same tick on every
// load. Rendering is one InstancedMesh per ship model (one draw call per type, the animated parts posed in the vertex
// shader); ships farther than HIDE_DIST from the camera are not submitted.
//
// Route model: a route is a periodic list of segments
//   fly   - arc-length parameterised Catmull-Rom path with an accelerate / cruise / decelerate speed profile (the
//           last `reserveLead` seconds report the 'reservation' phase: the pad is booked, landing lights on)
//   vert  - vertical translation over a pad (approach, touchdown, departure, climb) with the yaw turning from the
//           approach heading to the pad's cardinal heading (so a landed ship's collision is axis aligned)
//   hold  - dwell on the pad (shutdown, doors, boarding, servicing, closure) or a permanent repair berth
// Every segment carries keyframes for the four animation channels (gear, class = wings / S-foils, door = ramps /
// hatches / canopies, landing lights) so `shipState(route, t)` is as deterministic as `routePose(route, t)`.
//
// Port cycle of a pad ship: fly -> reservation -> approach -> touchdown -> shutdown -> doors -> boarding ->
// servicing -> closure -> departure -> climb -> fly. Interlocks (sealed doors while closed, the doorway nudge at
// closure, riders carried in ship space) live in ../vehicles/ship.js; a ship near the player is promoted to such a
// ShipVehicle (collision + boarding) while its instance keeps drawing it.
import * as THREE from 'three';
import { hash2 } from '../rng.js';
import { TICK_RATE } from '../constants.js';
import { B, BLOCKS } from '../blocks.js';
import { tileUV } from '../textures.js';
import { shipModels, makeShipInstances } from './models.js';
import { getLayout } from '../coruscant/layout.js';

export const HIDE_DIST = 300;          // ships beyond this are not drawn
export const PROMOTE_DIST = 80;        // a ship on its pad (or berth) within this distance of the player becomes a vehicle
const DEMOTE_DIST = 120;               // ... and is demoted again beyond this (no riders) or once it has flown off
const MAX_ROLL = 25 * Math.PI / 180;
const G = 9.81;
const RESERVE_LEAD = 10;               // seconds of 'reservation' before the approach starts

export const PORT_PHASES = ['reservation', 'approach', 'touchdown', 'shutdown', 'doors', 'boarding', 'servicing', 'closure', 'departure', 'climb'];
const LANDED = new Set(['touchdown', 'shutdown', 'doors', 'boarding', 'servicing', 'closure', 'departure', 'repair']);
const ON_PAD = new Set(['shutdown', 'doors', 'boarding', 'servicing', 'closure', 'repair']);

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
// animation keyframes of a segment: constant values or [from, to] ramps (smoothstepped over the segment)
const FLIGHT = { gear: 0, cls: 0, door: 0, lights: 0 };
const anim = (o) => ({ ...FLIGHT, ...o });

function makeRoute(segs) {
  let t0 = 0;
  const phases = [];
  for (const s of segs) {
    s.t0 = t0; t0 += s.dur;
    if (s.anim === undefined) s.anim = anim({});
    if (s.reserveLead && !phases.includes('reservation')) phases.push('reservation');
    if (!phases.includes(s.phase)) phases.push(s.phase);
  }
  return { segs, period: t0, phases };
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

// Pad ship: the loop, then the port cycle over pad P (loop[0] must be above the pad at y 130). padYaw is the
// cardinal heading the ship lands with; boarding / servicing are the variable dwell parts.
function padRoute(P, loop, speed, deckY, padYaw, boarding, servicing) {
  const path = new Path(loop, true);
  const prof = makeProfile(path.length, speed, 120);
  const heading = path.heading(0);
  const hover = deckY + 4, top = 130;
  const pad = { x: P.x, z: P.z, yaw: padYaw };
  return makeRoute([
    { kind: 'fly', path, prof, dur: prof.T, phase: 'fly', reserveLead: RESERVE_LEAD, anim: anim({}) },
    { kind: 'vert', ...pad, y0: top, y1: hover, dur: 8, yaw0: heading, thrust: 0.8, phase: 'approach', anim: anim({ gear: [0, 1], cls: [0, 1], lights: 1 }) },
    { kind: 'vert', ...pad, y0: hover, y1: deckY, dur: 3, thrust: 0.45, thrust1: 0.15, phase: 'touchdown', anim: anim({ gear: 1, cls: 1, lights: 1 }) },
    { kind: 'hold', ...pad, y: deckY, dur: 3, thrust: 0.15, thrust1: 0, phase: 'shutdown', anim: anim({ gear: 1, cls: 1, lights: [1, 0] }) },
    { kind: 'hold', ...pad, y: deckY, dur: 2, thrust: 0, phase: 'doors', anim: anim({ gear: 1, cls: 1, door: [0, 1] }) },
    { kind: 'hold', ...pad, y: deckY, dur: boarding, thrust: 0, phase: 'boarding', anim: anim({ gear: 1, cls: 1, door: 1 }) },
    { kind: 'hold', ...pad, y: deckY, dur: servicing, thrust: 0, phase: 'servicing', anim: anim({ gear: 1, cls: 1, door: 1 }) },
    { kind: 'hold', ...pad, y: deckY, dur: 2, thrust: 0, thrust1: 0.12, phase: 'closure', anim: anim({ gear: 1, cls: 1, door: [1, 0] }) },
    { kind: 'vert', ...pad, y0: deckY, y1: hover, dur: 3, thrust: 0.9, phase: 'departure', anim: anim({ gear: 1, cls: 1, lights: 1 }) },
    { kind: 'vert', ...pad, y0: hover, y1: top, dur: 7, yaw1: heading, thrust: 1, phase: 'climb', anim: anim({ gear: [1, 0], cls: [1, 0], lights: [1, 0] }) },
  ]);
}

function laneRoute(points, speed) {
  const path = new Path(points, true);
  const prof = makeProfile(path.length, speed, 0);
  return makeRoute([{ kind: 'fly', path, prof, dur: prof.T, phase: 'fly', anim: anim({}) }]);
}

// A docked ship under repair: parked for good with the gear down and the doors / ramp open.
function repairRoute(x, y, z, yaw) {
  return makeRoute([{ kind: 'hold', x, z, y, yaw, dur: 3600, thrust: 0, phase: 'repair', anim: anim({ gear: 1, cls: 1, door: 1 }) }]);
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
    lanes.push({ ...spec, boulevard: true, pts: spec.reverse ? pts.reverse() : pts });
    return r;
  };
  const inside = (a, b) => a.i0 >= b.i0 && a.i1 <= b.i1 && a.j0 >= b.j0 && a.j1 <= b.j1;
  // tall loops: the largest clear rectangle, then the largest one strictly inside it with at most half its area
  let outer = null;
  for (const r of rects) { if (r.w >= 300 && r.d >= 300 && add(r, 216, 4, { name: 'tall outer', types: [0, 1, 3, 4, 0], speedMul: 1 })) { outer = r; break; } }
  if (outer) for (const r of rects) { if (r !== outer && inside(r, outer) && r.area <= outer.area * 0.5 && r.w >= 150 && r.d >= 150 && (r.i0 > outer.i0 || r.i1 < outer.i1) && add(r, 224, 3, { name: 'tall inner', types: [1, 3, 5], speedMul: 0.9, reverse: true })) break; }
  // low airspeeder loops: narrow rectangles (two neighbouring boulevards, 2..4 blocks long) on each half of the city
  const narrow = rects.filter((r) => r.i1 - r.i0 === 1 && r.j1 - r.j0 >= 2 && r.j1 - r.j0 <= 4);
  const west = narrow.find((r) => xs[r.i1] < 2900), east = narrow.slice().reverse().find((r) => xs[r.i0] > 3100 && r.j1 - r.j0 >= 3) || narrow.find((r) => xs[r.i0] > 3100);
  add(west, 108, 1, { name: 'street west', types: [2, 7, 2], speedMul: 1 });
  add(east, 110, 1, { name: 'street east', types: [2, 8, 2, 7], speedMul: 1.1, reverse: true });
  // high cross-city loop above everything (the tallest spire reaches y 260)
  lanes.push({ name: 'high cross', pts: [[2560, 268, -430], [3000, 272, -470], [3440, 268, -430], [3480, 266, 0], [3440, 268, 430], [3000, 272, 470], [2560, 268, 430], [2520, 266, 0]], types: [0, 6, 5], speedMul: 1.1 });
  return lanes;
}

// Harbour circuits: closed loops that stay within ~250 blocks of the spaceport so the sky over the port is never
// empty. They avoid the pad columns (x 2584..2660) below y 170 (approach / climb corridors) and the control tower.
//   west  - oval over the ocean west of the deck at y 116..122 (under every approach path, above the train station)
//   low   - rectangle over the concourse spine and the deck's west strip at y 118 (taxis, speeders, buses)
//   high  - ring over the whole spaceport at y 175..181 (above the tower antenna, below the city's tall lanes)
function harbourLoops(cx) {
  return [
    { name: 'harbour west', harbour: true, speedMul: 0.8, types: [0, 4, 1, 5, 3, 6, 0, 1, 4, 5, 3, 6],
      pts: [[2545, 118, -150], [2480, 120, -140], [2445, 122, -70], [2440, 122, 0], [2445, 122, 70], [2480, 120, 140], [2545, 118, 150], [2560, 116, 60], [2560, 116, -60]] },
    { name: 'harbour low', harbour: true, speedMul: 0.7, types: [2, 7, 8, 2, 2, 7, 8, 2, 7, 2], reverse: true,
      pts: rectLanePts(2568, cx, -160, 160, 118, 1.5) },
    { name: 'harbour high', harbour: true, speedMul: 0.9, types: [6, 3, 1, 5, 6, 3, 1, 5, 6, 0],
      pts: rectLanePts(2572, 2712, -168, 168, 178, 3) },
  ];
}

// Ships parked for repair on the deck: [type, x, z, yaw] (yaw pi/2 = nose toward -x). Freighter and shuttle on the
// aprons between the outer pads and the container yards, a police speeder beside the north-east pad.
const REPAIR_BERTHS = [[0, 2596, -140, Math.PI / 2], [7, 2648, -141, Math.PI / 2], [1, 2595, 138, Math.PI / 2]];
// model type on each spaceport pad (long hulls on the inner pads next to the terminal, shorter ones outside)
const PAD_TYPES = [5, 4, 3, 1, 0, 8, 1, 0];

// Builds the deterministic ship list (pure data, no THREE):
//   { type, route, offset, name, pad, padPos, deckY, lanePts, boulevard, harbour, repair, dest }
// `frontier` (optional) = { pad: {x, z}, deckY } adds one shuttle cycling on the frontier spaceport pad.
export function buildShips(pads, deckY, frontier = null, layout = null) {
  layout = layout || getLayout(1337);
  const models = shipModels();
  const ships = [];
  const cx = pads.reduce((s, p) => s + p.x, 0) / pads.length;
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i], type = PAD_TYPES[i % PAD_TYPES.length], side = pad.z < 0 ? -1 : 1;
    const k = i % 4;
    const boarding = Math.round(10 + hash2(i, 3, 901) * 10), servicing = Math.round(8 + hash2(i, 4, 901) * 8);
    // the boarding door faces the concourse spine: nose +z on the west column, nose -z on the east column
    const padYaw = pad.x < cx ? Math.PI : 0;
    const route = padRoute(pad, coruscantLoop(pad, side, k), models[type].speed, deckY, padYaw, boarding, servicing);
    ships.push({ type, route, offset: Math.floor(hash2(i, 5, 902) * route.period), name: `${models[type].name} pad ${i + 1}`, pad: i, padPos: pad, deckY, dest: `a circuit over Coruscant and back to Pad ${i + 1}` });
  }
  if (frontier) {
    const route = padRoute(frontier.pad, frontierLoop(frontier.pad), models[1].speed, frontier.deckY, 0, 14, 10);
    ships.push({ type: 1, route, offset: 40, name: 'shuttle frontier pad', pad: 'frontier', padPos: frontier.pad, deckY: frontier.deckY, dest: 'a loop over the frontier and back to the station pad' });
  }
  const addLane = (lane, li, salt) => {
    const pts = lane.reverse ? lane.pts.slice().reverse() : lane.pts;
    lane.types.forEach((type, j) => {
      const route = laneRoute(pts, models[type].speed * lane.speedMul);
      const offset = (j / lane.types.length) * route.period + hash2(li, j, salt) * 20;
      ships.push({ type, route, offset, name: `${models[type].name} ${lane.name} #${j + 1}`, pad: null, padPos: null, deckY, lanePts: pts, boulevard: !!lane.boulevard, harbour: !!lane.harbour });
    });
  };
  laneLoops(layout).forEach((lane, li) => addLane(lane, li, 903));
  harbourLoops(Math.round(cx)).forEach((lane, li) => addLane(lane, li + 10, 904));
  REPAIR_BERTHS.forEach(([type, x, z, yaw], i) => {
    ships.push({ type, route: repairRoute(x, deckY, z, yaw), offset: 0, name: `${models[type].name} repair berth ${i + 1}`, pad: null, padPos: { x, z }, deckY, repair: true });
  });
  return ships;
}

// Pose of a route at time t (seconds): position, yaw/pitch/roll, thrust 0..1, phase name, speed.
const _tan = { x: 0, y: 0, z: 0 };
function segmentAt(route, t) {
  let tl = t % route.period; if (tl < 0) tl += route.period;
  const segs = route.segs;
  let i = 0;
  while (i < segs.length - 1 && tl >= segs[i].t0 + segs[i].dur) i++;
  return { seg: segs[i], u: tl - segs[i].t0 };
}
export function routePose(route, t, out) {
  const { seg, u } = segmentAt(route, t);
  out.phase = seg.phase; out.roll = 0; out.pitch = 0;
  if (seg.kind === 'fly') {
    const s = seg.prof.s(u), v = seg.prof.v(u), path = seg.path;
    path.at(s, out);
    path.tangent(s, _tan);
    out.yaw = Math.atan2(-_tan.x, -_tan.z);
    out.pitch = Math.asin(clamp(_tan.y, -1, 1)) * 0.7;
    // bank from horizontal curvature: lateral acceleration v^2 * kappa against gravity, capped at 25 degrees
    const d = 4;
    const k = wrapAngle(path.heading(s + d) - path.heading(s - d)) / (2 * d);
    out.roll = clamp(Math.atan2(v * v * k, G), -MAX_ROLL, MAX_ROLL);
    out.thrust = 1; out.speed = v;
    if (seg.reserveLead && u > seg.dur - seg.reserveLead) out.phase = 'reservation';
  } else if (seg.kind === 'vert') {
    const f = smooth(u / seg.dur);
    out.x = seg.x; out.z = seg.z; out.y = seg.y0 + (seg.y1 - seg.y0) * f;
    const y0 = seg.yaw0 !== undefined ? seg.yaw0 : seg.yaw, y1 = seg.yaw1 !== undefined ? seg.yaw1 : seg.yaw;
    out.yaw = y0 + wrapAngle(y1 - y0) * f;
    out.thrust = seg.thrust1 !== undefined ? seg.thrust + (seg.thrust1 - seg.thrust) * f : seg.thrust;
    out.speed = Math.abs(seg.y1 - seg.y0) / seg.dur;
  } else {
    out.x = seg.x; out.z = seg.z; out.y = seg.y + (seg.bob || 0) * Math.sin(u * 2.5); out.yaw = seg.yaw;
    out.thrust = seg.thrust1 !== undefined ? seg.thrust + (seg.thrust1 - seg.thrust) * smooth(u / seg.dur) : seg.thrust;
    out.speed = 0;
  }
  return out;
}

// Animation state of a route at time t: { gear, cls, door, lights } in 0..1 (1 = landed pose as authored: gear down,
// wings folded / foils closed, ramps and doors open, landing lights on), plus the phase name.
export function shipState(route, t, out = {}) {
  const { seg, u } = segmentAt(route, t);
  const f = smooth(u / seg.dur);
  for (const ch of ['gear', 'cls', 'door', 'lights']) {
    const k = seg.anim[ch];
    out[ch] = Array.isArray(k) ? k[0] + (k[1] - k[0]) * f : k;
  }
  out.phase = seg.phase;
  if (seg.kind === 'fly' && seg.reserveLead && u > seg.dur - seg.reserveLead) { out.phase = 'reservation'; out.lights = smooth((u - (seg.dur - seg.reserveLead)) / 2); }
  return out;
}

// Pad state of a ship at WORLD time t: reserved from the reservation call until the climb ends, occupied while the
// hull is on the pad.
export function padStateAt(ship, t) {
  const r = ship.route;
  const { seg, u } = segmentAt(r, t + ship.offset);
  let phase = seg.phase;
  if (seg.kind === 'fly' && seg.reserveLead && u > seg.dur - seg.reserveLead) phase = 'reservation';
  return { phase, reserved: phase !== 'fly', occupied: ON_PAD.has(phase) || phase === 'touchdown' || phase === 'departure' };
}

// Next time >= t at which the ship's segment `phase` starts (for cameras / tests). Returns null for lane ships.
export function nextPhaseStart(ship, phase, t) {
  const r = ship.route;
  let segT0;
  if (phase === 'reservation') { const fly = r.segs.find((s) => s.reserveLead); if (!fly) return null; segT0 = fly.t0 + fly.dur - fly.reserveLead; }
  else { const seg = r.segs.find((s) => s.phase === phase); if (!seg || r.segs.length === 1) return null; segT0 = seg.t0; }
  const ts = t + ship.offset;
  const cycles = Math.floor((ts - segT0) / r.period);
  let start = segT0 + (cycles + 1) * r.period;
  if (segT0 + cycles * r.period >= ts) start = segT0 + cycles * r.period;
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
    this.center = spec.center || { x: this.pads.reduce((s, p) => s + p.x, 0) / this.pads.length, y: this.deckY, z: this.pads.reduce((s, p) => s + p.z, 0) / this.pads.length };
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
    this._state = { gear: 0, cls: 0, door: 0, lights: 0, phase: 'fly' };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    for (const sh of this.ships) { sh.x = 0; sh.y = 0; sh.z = 0; sh.dist = Infinity; sh.phase = 'fly'; sh.prevPhase = 'fly'; sh.speed = 0; sh.thrust = 1; sh.vehicle = null; sh.level = 0; }
    this.repairs = this.ships.filter((s) => s.repair);
    this.audio = null;                 // ShipAudio, created on the first update with a live audio context
    this.sparkTimer = 0;
    this.stats = { ships: this.ships.length, visible: 0, drawCalls: 0, voices: 0, promoted: 0 };
  }

  onAdd(game) { game.scene.add(this.group); }
  onRemove(game) { game.scene.remove(this.group); for (const sh of this.ships) this.demote(sh); if (this.audio) this.audio.dispose(); }

  tick(tickCount) {
    this.tickCount = tickCount;
    if (tickCount % 10 === 0) this.autoPromote();
  }

  // rendered simulation time in seconds: vehicles interpolate prev (tick - 1) -> cur (tick), so the instances draw
  // the same instant as any promoted ship's collision pose
  timeAt(alpha) { return (this.tickCount - 1 + alpha) / TICK_RATE; }

  update(dt, alpha, camera) {
    const t = this.timeAt(alpha);
    for (const ty of this.types) { ty.material.uniforms.uTime.value = t % 1000; ty.count = 0; }
    const cam = camera.position, world = this.game.world;
    let visible = 0;
    const pose = this._pose, st = this._state;
    for (const sh of this.ships) {
      const tr = t + sh.offset;
      routePose(sh.route, tr, pose);
      sh.x = pose.x; sh.y = pose.y; sh.z = pose.z; sh.prevPhase = sh.phase; sh.phase = pose.phase; sh.speed = pose.speed; sh.thrust = pose.thrust;
      sh.dist = Math.hypot(pose.x - cam.x, pose.y - cam.y, pose.z - cam.z);
      if (sh.dist > HIDE_DIST) continue;
      shipState(sh.route, tr, st);
      // a ship carrying passengers flies level: its collision ignores pitch and roll, so the picture must too
      const riders = sh.vehicle && sh.vehicle.riders.size > 0;
      sh.level = clamp(sh.level + (riders ? dt : -dt) * 2, 0, 1);
      const tilt = 1 - sh.level;
      const ty = this.types[sh.type], k = ty.count++;
      this._e.set(pose.pitch * tilt, pose.yaw, pose.roll * tilt);
      this._q.setFromEuler(this._e);
      this._p.set(pose.x, pose.y, pose.z);
      this._m.compose(this._p, this._q, this._s);
      ty.mesh.setMatrixAt(k, this._m);
      const l = world.sampleLight(pose.x, pose.y + 1, pose.z);
      ty.attr.setXYZ(k, l[0], l[1], pose.thrust);
      ty.state.setXYZW(k, st.gear, st.cls, st.door, st.lights);
      visible++;
    }
    let calls = 0;
    for (const ty of this.types) {
      ty.mesh.count = ty.count;
      ty.mesh.visible = ty.count > 0;
      if (ty.count > 0) { ty.mesh.instanceMatrix.needsUpdate = true; ty.attr.needsUpdate = true; ty.state.needsUpdate = true; calls++; }
    }
    this.stats.visible = visible; this.stats.drawCalls = calls;
    this.updateAudio(dt);
    this.updateSparks(dt);
  }

  // --- boarding: promotion of nearby landed ships to vehicles -------------------------------------
  // Promotes ship `sh` to a ShipVehicle (collision, carry, boarding). The instance keeps drawing it.
  promote(sh) {
    if (sh.vehicle || !this.game.vehicles || !this._ShipVehicle) return sh.vehicle;
    sh.vehicle = this.game.vehicles.add(new this._ShipVehicle(this, sh));
    this.stats.promoted++;
    return sh.vehicle;
  }
  demote(sh) {
    if (!sh.vehicle) return;
    if (this.game.vehicles) this.game.vehicles.remove(sh.vehicle);
    sh.vehicle = null;
    this.stats.promoted--;
  }
  // Promotes every ship on its pad / berth within `dist` of `pos` (world point); returns the promoted vehicles.
  promoteNear(pos, dist = PROMOTE_DIST) {
    const out = [], t = this.tickCount / TICK_RATE, p = { x: 0, y: 0, z: 0 };
    for (const sh of this.ships) {
      const phase = routePose(sh.route, t + sh.offset, p).phase;
      if (!LANDED.has(phase) && phase !== 'approach') continue;
      if (Math.hypot(p.x - pos.x, p.y - pos.y, p.z - pos.z) > dist) continue;
      const v = this.promote(sh);
      if (v) out.push(v);
    }
    return out;
  }
  autoPromote() {
    const player = this.game.player;
    if (!player || !player.pos || !this.game.vehicles) return;
    const t = this.tickCount / TICK_RATE, p = { x: 0, y: 0, z: 0 }, pp = player.pos;
    for (const sh of this.ships) {
      const phase = routePose(sh.route, t + sh.offset, p).phase;
      const d = Math.hypot(p.x - pp.x, p.y - pp.y, p.z - pp.z);
      if (sh.vehicle) {
        if (sh.vehicle.riders.size > 0) continue;
        if (d > DEMOTE_DIST || (!LANDED.has(phase) && phase !== 'approach' && d > 40)) this.demote(sh);
      } else if ((LANDED.has(phase) || phase === 'approach') && d < PROMOTE_DIST) this.promote(sh);
    }
  }

  // --- repairs --------------------------------------------------------------------------------------
  // Standing spots for mechanics beside the docked repair ships (world coordinates on the deck), for the NPC
  // workstream: [{ x, y, z, ship, type }].
  repairSpots() {
    const out = [], p = { x: 0, y: 0, z: 0 };
    for (const sh of this.repairs) {
      const m = this.models[sh.type];
      routePose(sh.route, 0, p);
      const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
      for (const [gx, gy, gz] of m.spots) {
        const lx = gx + 0.5 - m.w / 2, lz = gz + 0.5 - m.d / 2;
        out.push({ x: p.x + lx * c + lz * s, y: p.y + gy, z: p.z - lx * s + lz * c, ship: sh.name, type: m.name });
      }
    }
    return out;
  }
  // Welding sparks at the repair berths while the player is near: short bright chips off the hull that bounce on
  // the deck (the particle system's block-chip kind with the glow panel tile).
  updateSparks(dt) {
    const parts = this.game.particles;
    if (!parts || !this.game.player) return;
    this.sparkTimer -= dt;
    if (this.sparkTimer > 0) return;
    this.sparkTimer = 0.08 + Math.random() * 0.12;
    if (!this._sparkSpots) { this._sparkSpots = this.repairSpots(); this._sparkUV = tileUV(BLOCKS[B.GLOW_PANEL].tex[2]); }
    const pp = this.game.player.pos, [tu, tv, ts] = this._sparkUV, sub = ts / 4;
    for (let i = 0; i < this._sparkSpots.length; i++) {
      const s = this._sparkSpots[i];
      if (Math.hypot(s.x - pp.x, s.z - pp.z) > 70) continue;
      // one torch active per berth at a time, switching every few seconds
      if (Math.floor(this.tickCount / 80 + i * 0.37) % 3 !== 0) continue;
      const ship = this.ships.find((sh) => sh.name === s.ship);
      const hx = s.x + (ship.x - s.x) * 0.35, hz = s.z + (ship.z - s.z) * 0.35, hy = s.y + 1.2;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2.5;
        const hot = Math.random() < 0.5;
        parts.spawn(hx, hy, hz, Math.cos(a) * sp, 1 + Math.random() * 2.5, Math.sin(a) * sp, 0.05 + Math.random() * 0.05, 0.3 + Math.random() * 0.5, 0,
          [tu + (k % 3) * sub, tv + (k % 2) * sub, sub, 0], hot ? [1, 0.95, 0.75] : [1, 0.7, 0.3], 1);
      }
    }
  }

  // --- audio ------------------------------------------------------------------------------------------
  // Delegated to ShipAudio (./audio.js): low layered hums for the nearest ships, doppler, landing whine and take-off
  // surge; created lazily once the game's audio context exists.
  updateAudio(dt) {
    const audio = this.game.audio;
    if (!audio || !audio.ctx) return;
    if (!this.audio) { if (!this._ShipAudio) return; this.audio = new this._ShipAudio(audio); }
    this.audio.update(dt, this.ships, this.models);
    this.stats.voices = this.audio.voiceCount();
  }
  stopAudio() { if (this.audio) this.audio.stopAll(); }

  // --- helpers for tests / cameras / HUD -----------------------------------------------------------------
  poseOf(i, t) { return routePose(this.ships[i].route, t + this.ships[i].offset, { ...this._pose }); }
  // ticks until ship i next starts `phase` (e.g. 'approach'), from the current clock
  ticksUntil(i, phase) { const t = this.tickCount / TICK_RATE; const nt = nextPhaseStart(this.ships[i], phase, t); return nt === null ? null : Math.round((nt - t) * TICK_RATE); }
  // ships within `radius` of the spaceport centre right now: airborne / landed counts, per phase and type
  census(radius = 300) {
    const t = this.tickCount / TICK_RATE, p = { x: 0, y: 0, z: 0 }, c = this.center;
    const out = { ships: this.ships.length, within: 0, airborne: 0, landed: 0, byPhase: {}, byType: {}, visible: this.stats.visible, drawCalls: this.stats.drawCalls, voices: this.stats.voices, promoted: this.stats.promoted };
    for (const sh of this.ships) {
      routePose(sh.route, t + sh.offset, p);
      if (Math.hypot(p.x - c.x, p.z - c.z) > radius) continue;
      out.within++;
      if (p.y > (sh.deckY || this.deckY) + 0.5) out.airborne++; else out.landed++;
      out.byPhase[p.phase] = (out.byPhase[p.phase] || 0) + 1;
      const n = this.models[sh.type].name; out.byType[n] = (out.byType[n] || 0) + 1;
    }
    return out;
  }
  summary() {
    const byPhase = {};
    for (const sh of this.ships) byPhase[sh.phase] = (byPhase[sh.phase] || 0) + 1;
    return { ...this.stats, byPhase, tick: this.tickCount };
  }
}

// Adds the traffic vehicle once the game has its vehicle manager, world and atlas (register() runs before they exist).
// The ShipVehicle and ShipAudio classes are loaded here (not imported at the top) so the pure route / model code has
// no dependency on the player or the audio engine.
export function installShipTraffic(game, spec) {
  if (!game || typeof requestAnimationFrame !== 'function') return;
  const tryInstall = () => {
    if (game.shipTraffic) return;
    if (game.vehicles && game.world && game.scene && game.atlas) {
      const tr = new ShipTraffic(game, spec);
      game.shipTraffic = game.vehicles.add(tr);
      import('../vehicles/ship.js').then((m) => { tr._ShipVehicle = m.ShipVehicle; });
      import('./audio.js').then((m) => { tr._ShipAudio = m.ShipAudio; });
      return;
    }
    requestAnimationFrame(tryInstall);
  };
  tryInstall();
}

// Wires the boarding / audio classes into a traffic instance directly (tests, or callers that already imported them).
export function attachShipClasses(tr, { ShipVehicle, ShipAudio } = {}) {
  if (ShipVehicle) tr._ShipVehicle = ShipVehicle;
  if (ShipAudio) tr._ShipAudio = ShipAudio;
  return tr;
}
