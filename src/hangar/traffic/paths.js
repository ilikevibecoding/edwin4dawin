// World-space flight paths for sys-traffic: Catmull-Rom splines plus a monotone time->arc-length profile
// so every craft position is a pure function of (t - t0) / duration (COORDINATION.md §9.6: never integrate dt).
//
//   pos(t) = curve.getPointAt(profile((t - t0) / duration))
//
// Path ids are reconstructible strings so a serialized fighter state can rebuild its path on any client:
//   "arr:<slotId>:<variant>"   arrival from 3-5 km forward/below, through the aperture centre (0,-85,32)
//                              heading +Y, hover at (0,-40,32), translate to the slot, final approach along ±x
//   "lau:<slotId>:<variant>"   launch: reverse of the above, departure point 3-5 km aft/below
//   "patrol:<name>"            closed loop around the ship, constant speed, always active
//   "custom:<n>"               api.spawn({ path: Vector3[] }) paths (not persisted)
import * as THREE from "three";

export const APERTURE_CENTRE = [0, -85, 32];
export const HOVER_POINT = [0, -40, 32];
export const PRE_APERTURE = [0, -300, 32];
export const ARRIVAL_DURATION = 80;
export const LAUNCH_DURATION = 60;
/** seconds after t0 at which an arrival is exactly at the aperture centre (schedule anchor) */
export const ARRIVAL_SHAFT_TIME = 60;
/** seconds after t0 at which a launch is exactly at the aperture centre */
export const LAUNCH_SHAFT_TIME = 21;
export const LAUNCH_UNCLAMP_TIME = 3;

// Far-point variation (metres) picked by variant index; keeps arrivals/departures from stacking.
const FAR_VARIANTS = [
  [0, 0, 0],
  [260, 120, -380],
  [-210, -160, 420],
  [140, 260, 260],
  [-320, 90, -180],
  [90, -240, -520],
  [-120, 200, 560],
  [330, -90, 120],
];

/**
 * Monotone cubic (Fritsch–Butland) interpolation through knots [[s, u], ...], s and u non-decreasing in
 * [0, 1]. Flat spans (equal u) become exact dwells with zero speed at both ends. settleEnd forces zero
 * speed at s = 1 (a craft settling into its slot).
 */
export function monotoneProfile(knots, { settleEnd = false } = {}) {
  const n = knots.length;
  const s = knots.map((k) => k[0]);
  const u = knots.map((k) => k[1]);
  const h = [];
  const d = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(Math.max(1e-9, s[i + 1] - s[i]));
    d.push((u[i + 1] - u[i]) / h[i]);
  }
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else m[i] = (3 * (h[i - 1] + h[i])) / ((2 * h[i] + h[i - 1]) / d[i - 1] + (h[i] + 2 * h[i - 1]) / d[i]);
  }
  m[0] = d[0];
  m[n - 1] = settleEnd ? 0 : d[n - 2];
  return (x) => {
    if (x <= s[0]) return u[0];
    if (x >= s[n - 1]) return u[n - 1];
    let i = 0;
    while (i < n - 2 && x > s[i + 1]) i++;
    const hh = h[i];
    const tt = (x - s[i]) / hh;
    const t2 = tt * tt;
    const t3 = t2 * tt;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + tt;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * u[i] + h10 * hh * m[i] + h01 * u[i + 1] + h11 * hh * m[i + 1];
  };
}

/** Arc-length fraction of each control point of an open Catmull-Rom curve (same table getPointAt uses). */
function controlPointFractions(curve, divisions) {
  const lengths = curve.getLengths(divisions);
  const total = lengths[lengths.length - 1];
  const n = curve.points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const tp = i / (n - 1);
    const x = tp * divisions;
    const i0 = Math.min(divisions - 1, Math.floor(x));
    const f = x - i0;
    out.push((lengths[i0] * (1 - f) + lengths[i0 + 1] * f) / total);
  }
  return out;
}

function vec(a) {
  return new THREE.Vector3(a[0], a[1], a[2]);
}

/**
 * A flight path. `orient` lists orientation keys [{s, mode, yaw?}] (mode "tangent" | "level" | "slot");
 * between keys the orientation blends linearly in s. `keys` holds named time fractions for effects.
 */
export class FlightPath {
  constructor(id, { points, closed = false, duration, knots = null, settleEnd = false, orient = null, keys = {}, kind = "custom", divisions = 400 }) {
    this.id = id;
    this.kind = kind;
    this.closed = closed;
    this.duration = duration;
    this.curve = new THREE.CatmullRomCurve3(points.map(vec), closed, "centripetal");
    this.curve.arcLengthDivisions = divisions;
    this.fractions = closed ? null : controlPointFractions(this.curve, divisions);
    this.profile = knots ? monotoneProfile(knots, { settleEnd }) : (x) => x;
    this.orient = orient || [{ s: 0, mode: "tangent" }];
    this.keys = keys;
    this.length = this.curve.getLength();
  }
  /** time fraction -> arc fraction */
  u(sFrac) {
    if (this.closed) return sFrac - Math.floor(sFrac);
    return this.profile(Math.min(1, Math.max(0, sFrac)));
  }
  pointAt(sFrac, out) {
    return this.curve.getPointAt(this.u(sFrac), out);
  }
  tangentAt(sFrac, out) {
    return this.curve.getTangentAt(this.u(sFrac), out);
  }
  /** blended orientation weights at time fraction s: {tangent, level, slot} summing to 1 */
  orientWeights(sFrac, out = { tangent: 0, level: 0, slot: 0, yaw: 0 }) {
    const keys = this.orient;
    out.tangent = out.level = out.slot = 0;
    out.yaw = 0;
    if (keys.length === 1) {
      out[keys[0].mode] = 1;
      out.yaw = keys[0].yaw || 0;
      return out;
    }
    let i = 0;
    while (i < keys.length - 2 && sFrac > keys[i + 1].s) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const f = sFrac <= a.s ? 0 : sFrac >= b.s ? 1 : (sFrac - a.s) / Math.max(1e-6, b.s - a.s);
    out[a.mode] += 1 - f;
    out[b.mode] += f;
    if (a.mode === "level" && b.mode === "level") out.yaw = (a.yaw || 0) * (1 - f) + (b.yaw || 0) * f;
    else out.yaw = a.mode === "level" ? a.yaw || 0 : b.yaw || 0;
    return out;
  }
}

/** Builds and caches every path the system uses. slots: Map<id, slot>. */
export class PathRegistry {
  constructor(slots, seed = 1) {
    this.slots = slots;
    this.seed = seed;
    this.cache = new Map();
    this.customCount = 0;
  }
  get(id) {
    let p = this.cache.get(id);
    if (p) return p;
    p = this.build(id);
    if (p) this.cache.set(id, p);
    return p;
  }
  build(id) {
    const parts = id.split(":");
    if (parts[0] === "arr") return this.arrival(parts[1], +parts[2] || 0);
    if (parts[0] === "lau") return this.launch(parts[1], +parts[2] || 0);
    if (parts[0] === "patrol") return this.patrol(parts[1]);
    return null;
  }
  slotFor(slotId) {
    const s = this.slots.get(slotId);
    if (!s) throw new Error(`[traffic] unknown rack slot ${slotId}`);
    return s;
  }
  /** approach points along the slot's ±x axis (from the hall centre toward the rack wall) */
  approach(slot) {
    const [x, y, z] = slot.pos;
    const side = x >= 0 ? 1 : -1;
    const mid = [x * 0.5, (HOVER_POINT[1] + y) * 0.5, (HOVER_POINT[2] + z) * 0.5];
    const a1 = [x - side * 14, y, z];
    const a2 = [x - side * 5, y, z];
    return { side, mid, a1, a2, slot: [x, y, z] };
  }
  arrival(slotId, variant) {
    const slot = this.slotFor(slotId);
    const { side, mid, a1, a2 } = this.approach(slot);
    const v = FAR_VARIANTS[variant % FAR_VARIANTS.length];
    const sx = side;
    const points = [
      [sx * (900 + v[0]), -1800 + v[1], -3500 + v[2]],
      [sx * 380, -1250, -2100],
      [sx * 70, -720, -700],
      PRE_APERTURE,
      APERTURE_CENTRE,
      HOVER_POINT,
      mid,
      a1,
      a2,
      slot.pos,
    ];
    const D = ARRIVAL_DURATION;
    const times = [0, 14, 30, 50, ARRIVAL_SHAFT_TIME, 63, 70, 74, 77, 80];
    const path = new FlightPath(id(slotId, "arr", variant), { points, duration: D, kind: "arrival", divisions: 800 });
    const fr = path.fractions;
    const knots = times.map((tt, i) => [tt / D, fr[i]]);
    knots.splice(6, 0, [66 / D, fr[5]]); // hover dwell 63..66 s
    path.profile = monotoneProfile(knots, { settleEnd: true });
    // The far approach heads aft (+Z) and pulls up through the shaft, so the natural level-off at the hover
    // faces aft; the extra 8° picks the yaw direction so the fighter turns to face the wall it docks on.
    const hoverYaw = 180 + side * 8;
    path.orient = [
      { s: 0, mode: "tangent" },
      { s: ARRIVAL_SHAFT_TIME / D, mode: "tangent" },
      { s: 63 / D, mode: "level", yaw: hoverYaw },
      { s: 70 / D, mode: "level", yaw: hoverYaw },
      { s: 74 / D, mode: "slot" },
      { s: 1, mode: "slot" },
    ];
    path.keys = { shaft: ARRIVAL_SHAFT_TIME / D, hover: [63 / D, 66 / D], approach: 74 / D, settle: 77 / D };
    return path;
  }
  launch(slotId, variant) {
    const slot = this.slotFor(slotId);
    const { side, mid, a1, a2 } = this.approach(slot);
    const v = FAR_VARIANTS[(variant + 3) % FAR_VARIANTS.length];
    const sx = side;
    const points = [slot.pos, a2, a1, mid, HOVER_POINT, APERTURE_CENTRE, PRE_APERTURE, [sx * 90, -800, 750], [sx * 420, -1500, 2300], [sx * (900 + v[0]), -2000 + v[1], 3900 + v[2]]];
    const D = LAUNCH_DURATION;
    const times = [LAUNCH_UNCLAMP_TIME, 6, 9, 12, 15, LAUNCH_SHAFT_TIME, 27, 38, 49, 60];
    const path = new FlightPath(id(slotId, "lau", variant), { points, duration: D, kind: "launch", divisions: 800 });
    const fr = path.fractions;
    const knots = times.map((tt, i) => [tt / D, fr[i]]);
    knots.unshift([0, fr[0]]); // unclamp dwell 0..3 s
    knots.splice(6, 0, [17 / D, fr[4]]); // hover dwell 15..17 s
    path.profile = monotoneProfile(knots, { settleEnd: false });
    path.orient = [
      { s: 0, mode: "slot" },
      { s: 9 / D, mode: "slot" },
      { s: 12 / D, mode: "level", yaw: 0 },
      { s: LAUNCH_SHAFT_TIME / D, mode: "level", yaw: 0 },
      { s: 27 / D, mode: "tangent" },
      { s: 1, mode: "tangent" },
    ];
    path.keys = { unclamp: LAUNCH_UNCLAMP_TIME / D, hover: [15 / D, 17 / D], shaft: LAUNCH_SHAFT_TIME / D, clear: 27 / D };
    return path;
  }
  patrol(name) {
    const loops = {
      // wide anticlockwise loop, ~2 km out, dips forward-starboard so the patrol view has a near pass
      alpha: {
        period: 96,
        points: [
          [1550, 197, -901],
          [2250, 300, 450],
          [1400, 450, 2000],
          [-300, 260, 2650],
          [-1750, 90, 1500],
          [-1950, -160, -500],
          [-1100, 40, -2400],
          [750, 240, -2250],
        ],
      },
      // lower clockwise loop under the keel plane, ~1.6 km
      beta: {
        period: 118,
        points: [
          [1200, -420, -1500],
          [-250, -620, -2250],
          [-1450, -230, -1400],
          [-2100, -470, 350],
          [-850, -320, 2150],
          [900, -540, 1900],
          [2050, -270, 300],
        ],
      },
    };
    const L = loops[name];
    if (!L) return null;
    return new FlightPath("patrol:" + name, { points: L.points, closed: true, duration: L.period, kind: "patrol", divisions: 600 });
  }
  /** api.spawn with a Vector3[]: open path, smooth start/stop, ~120 m/s */
  custom(points, duration = null) {
    const pid = "custom:" + this.customCount++;
    const arr = points.map((p) => (Array.isArray(p) ? p : [p.x, p.y, p.z]));
    const path = new FlightPath(pid, { points: arr, duration: duration || 1, kind: "custom", knots: [[0, 0], [1, 1]], settleEnd: true });
    if (!duration) path.duration = Math.max(4, path.length / 120);
    this.cache.set(pid, path);
    return path;
  }
}

function id(slotId, kind, variant) {
  return `${kind}:${slotId}:${variant}`;
}
