import * as THREE from 'three';
import { polygon, ringSector, arcPoints, circleSegments, box } from './geo.js';
import { PLAZA, GARDEN, SIDEWALK_W, SIDEWALK_H, STREETS, ROSE, FENCE_X } from './layout.js';

const rect = (x0, z0, x1, z1) => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

/**
 * Plaza paving, compass-rose inlay, decorative terracotta bands, sidewalks with curbs and the
 * cobbled streets. Inlays are real geometry: the plaza slab has a circular hole that the rose pieces
 * fill exactly (shared circle discretisation), the star points are cut as holes into the star field.
 * Long bands are layered 3 mm above the slabs with polygonOffset materials.
 */
export function buildGround(ctx) {
  const { mats, batch, addBoxCollider } = ctx;
  const INLAY_Y = 0.003;
  const seg = circleSegments(ROSE.r);
  const roseHole = arcPoints(ROSE.x, ROSE.z, ROSE.r, 0, Math.PI * 2, seg).slice(0, -1);

  // --- Plaza slab (with the rose hole) ------------------------------------------------------------
  const plazaTint = [1.04, 1.0, 0.94];
  batch.add(mats.plaza, polygon(rect(PLAZA.x0, PLAZA.z0, PLAZA.x1, PLAZA.z1), [roseHole], 0), plazaTint);

  // --- Compass rose (all radii scale with ROSE.r; the design was drawn for r = 8.6) -----------------
  const k = ROSE.r / 8.6;
  const ring = (r0, r1, mat, color = null, y = 0) => batch.add(mat, ringSector(ROSE.x, ROSE.z, r0 * k, r1 * k, 0, Math.PI * 2, y, seg), color);
  ring(8.15, 8.6, mats.terracotta);
  ring(7.55, 8.15, mats.plazaLight, [0.96, 0.94, 0.9]);
  ring(7.25, 7.55, mats.blueStone);
  // Star field: pavement ring with 16 triangular holes, filled by blue (major) and orange (minor) points.
  const holes = [];
  const majors = [];
  const minors = [];
  const half = (0.88 * Math.PI) / 16;
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    const major = i % 2 === 0;
    const tipR = (major ? 7.1 : 5.3) * k;
    const baseR = 3.4 * k;
    const tri = [
      [ROSE.x + Math.cos(a) * tipR, ROSE.z + Math.sin(a) * tipR],
      [ROSE.x + Math.cos(a + half) * baseR, ROSE.z + Math.sin(a + half) * baseR],
      [ROSE.x + Math.cos(a - half) * baseR, ROSE.z + Math.sin(a - half) * baseR],
    ];
    holes.push(tri);
    (major ? majors : minors).push(tri);
  }
  const outerStar = arcPoints(ROSE.x, ROSE.z, 7.25 * k, 0, Math.PI * 2, seg).slice(0, -1);
  const innerStar = arcPoints(ROSE.x, ROSE.z, 3.3 * k, 0, Math.PI * 2, seg).slice(0, -1);
  batch.add(mats.plaza, polygon(outerStar, [innerStar, ...holes], 0), [1.02, 1.0, 0.96]);
  for (const t of majors) batch.add(mats.blueStone, polygon(t, [], 0));
  for (const t of minors) batch.add(mats.terracotta, polygon(t, [], 0));
  ring(2.95, 3.3, mats.terracotta);
  ring(2.35, 2.95, mats.plazaLight, [0.96, 0.94, 0.9]);
  ring(0.7, 2.35, mats.darkSlate);
  batch.add(mats.terracotta, ringSector(ROSE.x, ROSE.z, 0, 0.7 * k, 0, Math.PI * 2, 0, 32));

  // --- Sweeping terracotta bands (layered inlays) ------------------------------------------------
  // Angles: 0° = +X (east), positive toward +Z (south). The east/south sweeps pass right in front of
  // the spawn (like the big curved band at the bottom of the reference); the west sweep frames the café.
  const D = Math.PI / 180;
  const band = (r, a0, a1, w = 0.45) => batch.add(mats.terracotta, ringSector(ROSE.x, ROSE.z, r - w / 2, r + w / 2, a0 * D, a1 * D, INLAY_Y));
  band(ROSE.r + 2.4, -78, 78);
  band(ROSE.r + 4.8, -55, 62, 0.35);
  band(ROSE.r + 2.4, 108, 168);
  // Straight border bands framing the plaza ~0.6 m in from the curbs.
  const strip = (x0, z0, x1, z1) => batch.add(mats.terracotta, polygon(rect(x0, z0, x1, z1), [], INLAY_Y));
  const inset = SIDEWALK_W + 0.6;
  strip(PLAZA.x0 + inset, PLAZA.z0 + inset, PLAZA.x1 - 1.0, PLAZA.z0 + inset + 0.4);
  strip(PLAZA.x0 + inset, PLAZA.z1 - inset - 0.4, PLAZA.x1 - 1.0, PLAZA.z1 - inset);
  strip(PLAZA.x0 + inset, PLAZA.z0 + inset, PLAZA.x0 + inset + 0.4, PLAZA.z1 - inset);
  strip(FENCE_X - 1.4, PLAZA.z0 + inset, FENCE_X - 1.0, PLAZA.z1 - inset);

  // --- Garden terrace east of the fence (gravel, slightly raised so footsteps read as dirt) --------
  batch.add(mats.gravel, polygon(rect(GARDEN.x0, GARDEN.z0, GARDEN.x1, GARDEN.z1), [], 0.02), [0.9, 0.88, 0.82]);
  addBoxCollider((GARDEN.x0 + GARDEN.x1) / 2, -0.24, 0, (GARDEN.x1 - GARDEN.x0) / 2, 0.26, (GARDEN.z1 - GARDEN.z0) / 2, 'dirt');
  // Cobbled path from the gate to the east street.
  batch.add(mats.sidewalk, polygon(rect(GARDEN.x0, -8.6, GARDEN.x1, -6.4), [], 0.03), [1, 1, 1]);
  batch.add(mats.sidewalk, polygon(rect(GARDEN.x1 - 2.6, -8.6, GARDEN.x1, 3.6), [], 0.03), [1, 1, 1]);

  // --- Sidewalks --------------------------------------------------------------------------------
  // segment: [x0,z0,x1,z1] top slab + a dressed-stone curb along the given edge ('n','s','e','w').
  const sidewalk = (x0, z0, x1, z1, curbSide, mat = mats.sidewalk) => {
    const w = x1 - x0;
    const d = z1 - z0;
    if (w <= 0.05 || d <= 0.05) return;
    batch.add(mat, box(w, SIDEWALK_H, d, { x: (x0 + x1) / 2, y: SIDEWALK_H / 2, z: (z0 + z1) / 2 }), [0.95, 0.93, 0.88]);
    const cw = 0.22;
    const ch = SIDEWALK_H + 0.012;
    if (curbSide === 's') batch.add(mats.curb, box(w, ch, cw, { x: (x0 + x1) / 2, y: ch / 2, z: z1 - cw / 2 + 0.01 }));
    if (curbSide === 'n') batch.add(mats.curb, box(w, ch, cw, { x: (x0 + x1) / 2, y: ch / 2, z: z0 + cw / 2 - 0.01 }));
    if (curbSide === 'e') batch.add(mats.curb, box(cw, ch, d, { x: x1 - cw / 2 + 0.01, y: ch / 2, z: (z0 + z1) / 2 }));
    if (curbSide === 'w') batch.add(mats.curb, box(cw, ch, d, { x: x0 + cw / 2 - 0.01, y: ch / 2, z: (z0 + z1) / 2 }));
    addBoxCollider((x0 + x1) / 2, SIDEWALK_H / 2, (z0 + z1) / 2, w / 2, SIDEWALK_H / 2, d / 2, 'stone');
  };

  // Plaza perimeter sidewalks, split at street mouths.
  const splitRange = (lo, hi, gaps) => {
    const out = [];
    let cur = lo;
    for (const [g0, g1] of gaps.sort((a, b) => a[0] - b[0])) {
      if (g0 > cur) out.push([cur, Math.min(g0, hi)]);
      cur = Math.max(cur, g1);
    }
    if (cur < hi) out.push([cur, hi]);
    return out;
  };
  // North
  for (const [a, b] of splitRange(PLAZA.x0, GARDEN.x1, STREETS.filter((s) => s.axis === 'z' && s.z1 === PLAZA.z0).map((s) => [s.x0, s.x1])))
    sidewalk(a, PLAZA.z0, b, PLAZA.z0 + SIDEWALK_W, 's');
  // South
  for (const [a, b] of splitRange(PLAZA.x0, GARDEN.x1, STREETS.filter((s) => s.axis === 'z' && s.z0 === PLAZA.z1).map((s) => [s.x0, s.x1])))
    sidewalk(a, PLAZA.z1 - SIDEWALK_W, b, PLAZA.z1, 'n');
  // West
  for (const [a, b] of splitRange(PLAZA.z0 + SIDEWALK_W, PLAZA.z1 - SIDEWALK_W, STREETS.filter((s) => s.axis === 'x' && s.x1 === PLAZA.x0).map((s) => [s.z0, s.z1])))
    sidewalk(PLAZA.x0, a, PLAZA.x0 + SIDEWALK_W, b, 'e');
  // East (in front of E1/E2, inside the garden)
  for (const [a, b] of splitRange(GARDEN.z0 + SIDEWALK_W, GARDEN.z1 - SIDEWALK_W, STREETS.filter((s) => s.axis === 'x' && s.x0 === GARDEN.x1).map((s) => [s.z0, s.z1])))
    sidewalk(GARDEN.x1 - SIDEWALK_W, a, GARDEN.x1, b, 'w');

  // --- Streets ----------------------------------------------------------------------------------
  for (const s of STREETS) {
    const sw = s.sidewalk;
    if (s.axis === 'z') {
      batch.add(mats.cobbles, polygon(rect(s.x0 + sw, s.z0, s.x1 - sw, s.z1), [], 0), [1, 1, 1]);
      if (sw > 0) {
        sidewalk(s.x0, s.z0, s.x0 + sw, s.z1, 'e', mats.plazaLight);
        sidewalk(s.x1 - sw, s.z0, s.x1, s.z1, 'w', mats.plazaLight);
      }
    } else {
      batch.add(mats.cobbles, polygon(rect(s.x0, s.z0 + sw, s.x1, s.z1 - sw), [], 0), [1, 1, 1]);
      if (sw > 0) {
        sidewalk(s.x0, s.z0, s.x1, s.z0 + sw, 's', mats.plazaLight);
        sidewalk(s.x0, s.z1 - sw, s.x1, s.z1, 'n', mats.plazaLight);
      }
    }
  }

  // --- Wear decals: dark blotches where people/water/vehicles have been ---------------------------
  const wear = (x, z, r, rot = 0) => {
    // PlaneGeometry keeps 0..1 UVs so the blotch alpha spans the whole decal (planarUV would tile it).
    const g = new THREE.PlaneGeometry(r * 2, r * 2);
    g.rotateX(-Math.PI / 2);
    g.rotateY(rot);
    g.translate(x, 0.006, z);
    batch.add(mats.groundGrime, g, null);
  };
  const wearSpots = [
    [-12, -3, 7.5, 0.3], // around the fountain
    [-20.5, 12, 3.4, 1.1], // under the plaza trees
    [-21, -12.5, 3.2, 2.0],
    [-11.9, -17, 3.0, 0.5], // NW alley mouth
    [14.9, -17, 3.4, 1.7], // NE street mouth (sandbag emplacement)
    [0, 22.5, 3.2, 0.9], // S street mouth
    [-24.5, -6.9, 3.0, 2.4], // W street mouth
    [-22, 4, 3.6, 0.2], // café terrace
    [17, -7.5, 2.4, 1.3], // gate
    [5, 8, 4.5, 2.8], // general traffic
    [10, -6, 3.8, 0.7],
    [-6, 15, 3.0, 1.9],
  ];
  for (const [x, z, r, rot] of wearSpots) wear(x, z, r, rot);

  // --- Ground collider: one big slab under everything (streets, plaza, backdrop land) ------------
  addBoxCollider(0, -0.5, 0, 400, 0.5, 400, 'stone');
  return new THREE.Box3(new THREE.Vector3(PLAZA.x0, 0, PLAZA.z0), new THREE.Vector3(GARDEN.x1, 0, PLAZA.z1));
}
