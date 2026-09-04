// Patrol geometry for the fighter traffic: an analytic "distance to the hull" built from the layout
// functions (wedge, superstructure terraces, turrets, command tower, engines, reactor bulb) and the patrol
// loop around the ship (Catmull-Rom through hand-placed waypoints, validated against the clearance).
import * as THREE from "three";
import { HULL, CITY, TOWER, ENGINES, REACTOR_BULB, halfWidth, sternZAt, topY, ventralY } from "../core/layout.js";

const TR = HULL.trench;

function segDist(px, py, pz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax,
    dy = by - ay,
    dz = bz - az;
  const L2 = dx * dx + dy * dy + dz * dz || 1;
  let t = ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / L2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t - px,
    qy = ay + dy * t - py,
    qz = az + dz * t - pz;
  return Math.sqrt(qx * qx + qy * qy + qz * qz);
}

/** Distance from (ax, az) to the plan-view outline of the wedge (0 when inside). */
function planDistance(ax, z) {
  const inPlan = z >= HULL.bowZ && z <= sternZAt(ax) && ax <= halfWidth(z);
  if (inPlan) return 0;
  // side edge: bow apex -> stern corner
  const dSide = segDist(ax, 0, z, 0, 0, HULL.bowZ, HULL.halfWidthStern, 0, HULL.sternCornerZ);
  // stern notch edge: corner -> flat face start, and the flat face itself
  const dNotch = segDist(ax, 0, z, HULL.halfWidthStern, 0, HULL.sternCornerZ, HULL.sternFlatX, 0, HULL.sternZ);
  const dFlat = segDist(ax, 0, z, 0, 0, HULL.sternZ, HULL.sternFlatX, 0, HULL.sternZ);
  return Math.min(dSide, dNotch, dFlat);
}

function boxDist(x, y, z, x0, x1, y0, y1, z0, z1) {
  const dx = Math.max(x0 - x, 0, x - x1);
  const dy = Math.max(y0 - y, 0, y - y1);
  const dz = Math.max(z0 - z, 0, z - z1);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Approximate distance from a world point to the nearest hull geometry (metres, 0 inside). Conservative for
 * the flat surfaces (vertical distance), exact for the boxes / spheres, so it under-estimates rather than
 * over-estimates clearance.
 */
export function hullClearance(x, y, z) {
  const ax = Math.abs(x);
  let best = Infinity;
  // wedge
  const dp = planDistance(ax, z);
  if (dp === 0) {
    const t = topY(x, z);
    const b = ventralY(x, z);
    if (y >= t) best = y - t;
    else if (y <= b) best = b - y;
    else return 0;
    // near the edge the slab is thin (trench lip ±6): the edge itself may be closer than the surface
    const hw = halfWidth(z);
    const edge = Math.max(0, hw - ax);
    const dv = Math.max(0, Math.abs(y) - TR.y1);
    best = Math.min(best, Math.sqrt(edge * edge + dv * dv));
  } else {
    const dv = Math.max(0, Math.abs(y) - TR.y1);
    best = Math.sqrt(dp * dp + dv * dv);
  }
  // superstructure terraces (trapezoid prisms approximated by their half width at this z)
  for (const lv of CITY.levels) {
    const z1 = CITY.z1 - lv.inset * 0.5;
    const zc = Math.min(Math.max(z, lv.z0), z1);
    const hw = Math.max(8, CITY.halfWidthAt(zc) - lv.inset) + 2;
    best = Math.min(best, boxDist(ax, y, z, 0, hw, lv.y0, lv.y1, lv.z0, z1));
  }
  // turbolaser turrets on the level-1 shoulders
  for (const tz of CITY.turbolasers) {
    const tx = CITY.halfWidthAt(tz) + 10;
    const ty = CITY.levels[0].y1 + 6;
    best = Math.min(best, Math.max(0, Math.sqrt((ax - tx) ** 2 + (y - ty) ** 2 + (z - tz) ** 2) - 14));
  }
  // command tower
  for (const n of TOWER.neck) best = Math.min(best, boxDist(ax, y, z, 0, n.x, n.y0, n.y1, n.z0, n.z1));
  const B = TOWER.bridge;
  best = Math.min(best, boxDist(ax, y, z, 0, B.x, B.y0, B.y1 + 3, B.z0 - 4, B.z1));
  const g = TOWER.globes;
  best = Math.min(best, Math.max(0, Math.sqrt((ax - g.x) ** 2 + (y - g.y) ** 2 + (z - g.z) ** 2) - g.r));
  best = Math.min(best, boxDist(ax, y, z, 0, g.x + 12, B.y1, g.y, g.z - 12, g.z + 12));
  const m = TOWER.mast;
  best = Math.min(best, boxDist(ax, y, z, 0, m.w / 2 + 2, m.y0, m.y1 + 6, m.z - m.w / 2 - 2, m.z + m.w / 2 + 2));
  best = Math.min(best, boxDist(ax, y, z, 0, m.dishR, m.y1, m.tipY, m.z - m.dishR, m.z + m.dishR));
  // engines (capsules along +z from the stern face)
  for (const e of ENGINES.main) best = Math.min(best, Math.max(0, segDist(x, y, z, e.x, e.y, HULL.sternZ, e.x, e.y, HULL.sternZ + ENGINES.nozzleLen) - e.r * 1.05));
  for (const e of ENGINES.aux) best = Math.min(best, Math.max(0, segDist(x, y, z, e.x, e.y, HULL.sternZ, e.x, e.y, HULL.sternZ + ENGINES.nozzleLen * 0.5) - e.r * 1.05));
  // reactor bulb
  const rb = REACTOR_BULB;
  best = Math.min(best, Math.max(0, Math.sqrt((x - rb.x) ** 2 + (y - rb.y) ** 2 + (z - rb.z) ** 2) - rb.r));
  return best;
}

/** Below the hangar well: where launches join the loop and where returns leave it (both heading −Z). */
export const PATROL_START = new THREE.Vector3(0, -150, -110);
export const PATROL_END = new THREE.Vector3(0, -140, 60);

/**
 * The patrol loop: forward under the belly, under and around the bow, aft along the starboard dorsal side
 * past the command tower (≈180 m off the bridge block), around the stern engines, back under the aft belly
 * (clear of the reactor bulb) to the recovery point below the hangar. ~4.1 km, ≥ 60 m from every hull piece.
 */
export const PATROL_WAYPOINTS = [
  [0, -150, -110],
  [0, -140, -450],
  [0, -115, -800],
  [0, -80, -1130],
  [-40, 20, -1230],
  [140, 130, -1080],
  [260, 190, -700],
  [300, 210, -300],
  [300, 215, 200],
  [330, 170, 460],
  [280, 60, 640],
  [170, -120, 640],
  [140, -160, 380],
  [60, -150, 180],
  [0, -140, 60],
];

export function buildPatrolCurve(waypoints = PATROL_WAYPOINTS) {
  const pts = waypoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  curve.arcLengthDivisions = 600;
  const length = curve.getLength();
  return { curve, length, points: pts };
}

/** Minimum hull clearance along a curve (n samples). */
export function minClearance(curve, n = 400) {
  const p = new THREE.Vector3();
  let min = Infinity;
  let at = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    curve.getPointAt(u, p);
    const c = hullClearance(p.x, p.y, p.z);
    if (c < min) {
      min = c;
      at = u;
    }
  }
  return { min, at };
}
