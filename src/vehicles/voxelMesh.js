// Mesh builder for small voxel grids that move (trains, ships, turbolift cabs): culled faces, atlas UVs from the block
// registry, per-face shade, and a material that follows the world's sky light / fog like the debris shader.
// The light is sampled once per vehicle (uniform), not per vertex, so a whole car brightens/darkens together.
// Full cubes get culled faces; partial shapes (slabs, beds, tables, chests, fences, ...) are emitted from their
// collision boxes with cropped UVs like the chunk mesher does, rails as a flat quad and plants as crossed quads.
// A full-cube cell may carry a SHAPE CODE (VoxelGrid.setShape / set(x, y, z, id, shape)): the cube clipped by
// half-spaces - wedges, corner wedges, hips, chamfers, slabs and any custom cut - meshed as convex polygons with the
// slope's own flat normal, the UVs of the face it replaces and the same emissive channel; culling compares the
// cross-sections of neighbouring cells, so a wedge hides exactly the faces it fully covers. Grids without shapes
// (the train) take the original cube path untouched.
//
// Optional (all off by default, so existing callers render exactly as before):
//   - a per-vertex emissive channel `aEmit` = (intensity, pulse, group): faces of cells the caller's `glow(id)`
//     table marks as lit are self-lit in HDR (so bloom picks them up; intensity > 1 over-drives dark tiles);
//     `pulse` faces breathe with `uTime` scaled by `uPulse` (a normalised speed, signed by the direction of travel:
//     steady when 0); `group` 1 / 2 faces are switched by `uHeadWest` / `uHeadEast` (head- and tail lights of a
//     vehicle that runs both ways);
//   - `extras`: visual-only sub boxes in grid units (light strips, seats, skirts, door leaves) textured from a block
//     id or a raw atlas tile, split per cell with cropped UVs like the partial shapes, unless `stretch` maps one
//     tile over the whole box (true) or one whole tile over every cell-sized piece ('cell': LED segments);
//   - `material`: reuse one material for several meshes of the same vehicle (one set of uniforms to update);
//   - `uLightAlong[LIGHT_SAMPLES]` + `uLightSpan`: world light sampled at several points along the vehicle's x axis
//     (grid units), interpolated per vertex, so a long train half inside a station hall is lit like the hall there
//     and like the open sky at its nose (uLightSpan 0 = the single `uLight` sample as before);
//   - `uSelfTint`: colour of the `uEmissive` floor light (default the warm block light; LED cabins pass a cool white);
//   - `inside(x, y, z)`: per-vertex `aCabin` flag - faces looking into the vehicle's interior get the `uEmissive`
//     floor light, exterior faces are lit by the world only (a train at night: dark hull, lit windows). Without it
//     every face gets the floor, as before.
import * as THREE from 'three';
import { SHADING_PARS, bindShading } from '../render/shading.js';
import { BLOCKS, SHAPE } from '../blocks.js';
import { tileUV } from '../textures.js';
import { SHARED } from '../entityMaterial.js';

// face order matches BLOCKS[id].tex: [+x, -x, +y, -y, +z, -z]; c = unit-cube corner flags (CCW seen from outside)
export const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]], shade: 0.5 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.65 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.65 },
];
export const OPPOSITE = [1, 0, 3, 2, 5, 4];
const INSET = 0.0006; // uv inset so bilinear/mip sampling never bleeds into the neighbouring atlas tile
const UV_SCALE = 1 - 2 * INSET;

// uv fraction of a point on face `dir` (same convention as the chunk mesher)
export function faceUV(dir, x, y, z, out) {
  switch (dir) {
    case 0: out[0] = 1 - z; out[1] = 1 - y; break;
    case 1: out[0] = z; out[1] = 1 - y; break;
    case 2: out[0] = x; out[1] = z; break;
    case 3: out[0] = 1 - x; out[1] = z; break;
    case 4: out[0] = x; out[1] = 1 - y; break;
    default: out[0] = 1 - x; out[1] = 1 - y; break;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ cell shapes
// A shape is the unit cube clipped by half-spaces a*x + b*y + c*z <= d in cell-local coordinates ([0, 1]^3); code 0
// is the full cube. Named shapes (SH.<NAME>), all also reachable through customShape():
//   WEDGE_<side>_UP / _DOWN   triangular prism: the vertical face on <side> (XN, XP, ZN, ZP) is replaced by a 45
//                             degree slope rising away from it (UP: solid at the bottom, a ramp) or hanging from
//                             the top (DOWN: an overhang);  8 orientations
//   LOWEDGE_<side> + RAMP2_<side>, HIWEDGE_<side> + RAMP2_<side>_DOWN   the two cells of a 2-cell (26.5 degree) ramp
//   KNIFE_<side>              symmetric knife edge: full thickness at the back, a sharp edge at mid height in front
//   VWEDGE_<xs>_<zs>          vertical prism: the vertical edge at that corner is chamfered 45 degrees in plan
//   HIP_<xs>_<zs>_UP / _DOWN  two 45 degree slopes meeting on a diagonal ridge (the corner of a bevelled roof)
//   CORNER_<xs>_<ys>_<zs>     tetrahedral outer corner: only the named cube corner and its three neighbours remain
//   CHAMFER_<xs>_<ys>_<zs>    the cube with one corner cut off by the plane through the corner's three neighbours
//   SLAB_BOTTOM / SLAB_TOP / HALF_XN / HALF_XP / HALF_ZN / HALF_ZP   half cells
// The polygons of a shape (boundary faces cropped to their cross-section plus the sloped caps, CCW from outside, each
// with the UV direction and flat shade of the cube face it replaces) are derived once from the planes and cached.
// Shapes are deduplicated by their (quantised) plane set, so a long slope cut through a hull reuses one code per
// distinct cell profile. A shape code on a cell whose block is not a full cube (slabs, seats) is ignored.
const SHAPE_DEFS = [{ name: 'cube', planes: [] }];
const SHAPE_BY_KEY = new Map([['', 0]]);
export const SH = { CUBE: 0 };
export const MAX_SHAPES = 65535;
const planeKey = (planes) => planes.map((p) => p.map((v) => Math.round(v * 4096) / 4096).join(',')).sort().join(';');
// registers (or finds) the shape cut by `planes` ([a, b, c, d] each: keep a*x + b*y + c*z <= d); returns its code
export function customShape(planes, name = null) {
  const key = planeKey(planes);
  let code = SHAPE_BY_KEY.get(key);
  if (code === undefined) {
    if (SHAPE_DEFS.length >= MAX_SHAPES) throw new Error('too many cell shapes');
    code = SHAPE_DEFS.length;
    SHAPE_DEFS.push({ name: name || `custom${code}`, planes: planes.map((p) => p.slice()) });
    SHAPE_BY_KEY.set(key, code);
  } else if (name && SHAPE_DEFS[code].name.startsWith('custom')) SHAPE_DEFS[code].name = name;
  if (name && SH[name] === undefined) SH[name] = code;
  return code;
}
export const shapeName = (code) => (SHAPE_DEFS[code] ? SHAPE_DEFS[code].name : `?${code}`);
export const shapeCount = () => SHAPE_DEFS.length;
export const shapePlanes = (code) => SHAPE_DEFS[code].planes;
const SIDES = { XN: [-1, 0], XP: [1, 0], ZN: [0, -1], ZP: [0, 1] };
// linear form of the distance from the open face on `side`: s = sa*x + sc*z + s0 (0 on that face, 1 at the back)
function openForm(side) {
  const [dx, dz] = SIDES[side];
  return { sa: dx < 0 ? 1 : dx > 0 ? -1 : 0, sc: dz < 0 ? 1 : dz > 0 ? -1 : 0, s0: (dx > 0 || dz > 0) ? 1 : 0 };
}
// the k-th cell (0 = the tip) of an n-cell ramp opening on `side`: keep y <= (k + s) / n (a ramp on the floor) or
// 1 - y <= (k + s) / n (hanging from the ceiling)
function rampPlane(side, n, k, down) {
  const { sa, sc, s0 } = openForm(side);
  return down ? [-sa / n, -1, -sc / n, (k + s0) / n - 1] : [-sa / n, 1, -sc / n, (k + s0) / n];
}
// the k-th cell (0 = the tip) of an n-cell plan taper narrowing toward `tip` with the material removed on `open`:
// keep t_open >= 1 - (k + t_tip) / n where t_<face> is the distance from that face
function taperPlane(open, tip, n, k) {
  const out = [0, 0, 0, k / n - 1];
  const add = (side, coef) => { const [dx, dz] = SIDES[side], axis = dx ? 0 : 2; if (dx + dz > 0) { out[axis] -= coef; out[3] -= coef; } else out[axis] += coef; };
  add(open, -1); add(tip, -1 / n);
  return out;
}
for (const side of ['XN', 'XP', 'ZN', 'ZP']) {
  customShape([rampPlane(side, 1, 0, false)], `WEDGE_${side}_UP`);
  customShape([rampPlane(side, 1, 0, true)], `WEDGE_${side}_DOWN`);
  customShape([rampPlane(side, 2, 0, false)], `LOWEDGE_${side}`);
  customShape([rampPlane(side, 2, 1, false)], `RAMP2_${side}`);
  customShape([rampPlane(side, 2, 0, true)], `HIWEDGE_${side}`);
  customShape([rampPlane(side, 2, 1, true)], `RAMP2_${side}_DOWN`);
  { const { sa, sc, s0 } = openForm(side); customShape([[-sa / 2, 1, -sc / 2, 0.5 + s0 / 2], [-sa / 2, -1, -sc / 2, s0 / 2 - 0.5]], `KNIFE_${side}`); }
}
for (const xs of ['XN', 'XP']) for (const zs of ['ZN', 'ZP']) {
  const cx = xs === 'XP' ? 1 : 0, cz = zs === 'ZP' ? 1 : 0;
  customShape([taperPlane(xs, zs, 1, 0)], `VWEDGE_${xs}_${zs}`);
  customShape([rampPlane(xs, 1, 0, false), rampPlane(zs, 1, 0, false)], `HIP_${xs}_${zs}_UP`);
  customShape([rampPlane(xs, 1, 0, true), rampPlane(zs, 1, 0, true)], `HIP_${xs}_${zs}_DOWN`);
  for (const ys of ['YN', 'YP']) {
    const cy = ys === 'YP' ? 1 : 0, s = (1 - cx) + (1 - cy) + (1 - cz);
    // kept corner (cx, cy, cz): tx + ty + tz >= 2 with t the coordinate toward the corner; the chamfer is the rest
    customShape([[1 - 2 * cx, 1 - 2 * cy, 1 - 2 * cz, s - 2]], `CORNER_${xs}_${ys}_${zs}`);
    customShape([[2 * cx - 1, 2 * cy - 1, 2 * cz - 1, 2 - s]], `CHAMFER_${xs}_${ys}_${zs}`);
  }
}
customShape([[0, 1, 0, 0.5]], 'SLAB_BOTTOM'); customShape([[0, -1, 0, -0.5]], 'SLAB_TOP');
customShape([[1, 0, 0, 0.5]], 'HALF_XN'); customShape([[-1, 0, 0, -0.5]], 'HALF_XP');
customShape([[0, 0, 1, 0.5]], 'HALF_ZN'); customShape([[0, 0, -1, -0.5]], 'HALF_ZP');
// RIDGE_X / RIDGE_Z: a roof ridge running along that axis (two 45 degree slopes meeting at the top centre line: the
// top of a fin or a wing tip seen end-on); KEEL_X / KEEL_Z the same hanging from the ceiling
customShape([[0, 1, -1, 0.5], [0, 1, 1, 1.5]], 'RIDGE_X'); customShape([[-1, 1, 0, 0.5], [1, 1, 0, 1.5]], 'RIDGE_Z');
customShape([[0, -1, -1, -0.5], [0, -1, 1, 0.5]], 'KEEL_X'); customShape([[-1, -1, 0, -0.5], [1, -1, 0, 0.5]], 'KEEL_Z');
// BLADE_<side>: full thickness at the back, a sharp vertical edge at mid width on <side> (a fin's or a wing's leading
// edge seen from above: thin in plan, full height)
customShape([[-1, 0, -0.5, -0.5], [1, 0, -0.5, 0.5]], 'BLADE_ZN'); customShape([[-1, 0, 0.5, 0], [1, 0, 0.5, 1]], 'BLADE_ZP');
customShape([[-0.5, 0, -1, -0.5], [-0.5, 0, 1, 0.5]], 'BLADE_XN'); customShape([[0.5, 0, -1, 0], [0.5, 0, 1, 1]], 'BLADE_XP');
export const NAMED_SHAPE_COUNT = SHAPE_DEFS.length - 1;
// n-cell ramp opening on `side`: codes for k = 0..n-1 (0 = the tip cell)
export function rampShapes(side, n, down = false) { return Array.from({ length: n }, (_, k) => customShape([rampPlane(side, n, k, down)])); }
// n-cell plan taper narrowing toward `tip` with the material removed on `open`: codes for k = 0..n-1 (0 = the tip)
export function taperShapes(open, tip, n) { return Array.from({ length: n }, (_, k) => customShape([taperPlane(open, tip, n, k)])); }

// mirror of a shape about x = 0.5 (a*x -> a*(1 - x)); named shapes keep their names with XN <-> XP swapped
export function mirrorShapeX(code) {
  if (!code) return 0;
  const def = SHAPE_DEFS[code];
  if (def.mirrorX === undefined) {
    const nm = def.name.startsWith('custom') ? null : def.name.replace(/X[NP]/g, (m) => (m === 'XN' ? 'XP' : 'XN'));
    def.mirrorX = customShape(def.planes.map(([a, b, c, d]) => [-a, b, c, d - a]), nm);
  }
  return def.mirrorX;
}

const EPS = 1e-7;
function clipPolygon(pts, [a, b, c, d]) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const P = pts[i], Q = pts[(i + 1) % n];
    const fp = a * P[0] + b * P[1] + c * P[2] - d, fq = a * Q[0] + b * Q[1] + c * Q[2] - d;
    if (fp <= EPS) out.push(P);
    if ((fp < -EPS && fq > EPS) || (fp > EPS && fq < -EPS)) { const t = fp / (fp - fq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t, P[2] + (Q[2] - P[2]) * t]); }
  }
  return out;
}
// 2D projection of a boundary-face point (drops the face's axis coordinate)
const flat = (dir, p) => (dir < 2 ? [p[1], p[2]] : dir < 4 ? [p[0], p[2]] : [p[0], p[1]]);
function polyArea2(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; s += p[0] * q[1] - q[0] * p[1]; } return Math.abs(s) / 2; }
function pointInConvex(poly, pt) {
  let pos = false, neg = false;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const cr = (q[0] - p[0]) * (pt[1] - p[1]) - (q[1] - p[1]) * (pt[0] - p[0]);
    if (cr > 1e-6) pos = true; else if (cr < -1e-6) neg = true;
  }
  return !(pos && neg);
}
const GEOM_CACHE = [];
// Geometry of a shape: faces [{ dir (0..5 boundary face | -1 sloped cap), n, pts (CCW from outside), uvDir, shade }],
// cross[6] (2D cross-section polygon on each boundary face, null where the shape does not touch it), full[6] (the
// cross-section is the whole face), verts (unique vertices), volume, boxes (collision, conservative).
export function shapeGeometry(code) {
  let G = GEOM_CACHE[code];
  if (G) return G;
  const def = SHAPE_DEFS[code];
  let polys = FACES.map((F, dir) => ({ dir, n: F.n.slice(), pts: F.c.map((c) => c.slice()) }));
  for (const pl of def.planes) {
    const next = [];
    for (const poly of polys) { const pts = clipPolygon(poly.pts, pl); if (pts.length >= 3) next.push({ ...poly, pts }); }
    // the cap: every vertex on the plane, ordered around the centroid, wound CCW seen from the removed side
    const seen = new Map();
    for (const poly of next) for (const p of poly.pts) if (Math.abs(pl[0] * p[0] + pl[1] * p[1] + pl[2] * p[2] - pl[3]) <= 1e-6) seen.set(p.map((v) => Math.round(v * 1e6) / 1e6).join(','), p);
    const cap = [...seen.values()];
    if (cap.length >= 3) {
      const len = Math.hypot(pl[0], pl[1], pl[2]), n = [pl[0] / len, pl[1] / len, pl[2] / len];
      const C = cap.reduce((s, p) => [s[0] + p[0] / cap.length, s[1] + p[1] / cap.length, s[2] + p[2] / cap.length], [0, 0, 0]);
      const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let u = [n[1] * ref[2] - n[2] * ref[1], n[2] * ref[0] - n[0] * ref[2], n[0] * ref[1] - n[1] * ref[0]];
      const ul = Math.hypot(...u); u = u.map((v) => v / ul);
      const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      const ang = (p) => Math.atan2((p[0] - C[0]) * v[0] + (p[1] - C[1]) * v[1] + (p[2] - C[2]) * v[2], (p[0] - C[0]) * u[0] + (p[1] - C[1]) * u[1] + (p[2] - C[2]) * u[2]);
      cap.sort((p, q) => ang(p) - ang(q));
      next.push({ dir: -1, n, pts: cap.map((p) => p.slice()) });
    }
    polys = next;
  }
  const cross = [null, null, null, null, null, null], full = [false, false, false, false, false, false];
  const verts = new Map();
  let volume = 0;
  for (const poly of polys) {
    for (const p of poly.pts) verts.set(p.map((v) => Math.round(v * 1e6) / 1e6).join(','), p);
    // divergence theorem over the fan of each (outward CCW) polygon
    const p0 = poly.pts[0];
    for (let i = 1; i + 1 < poly.pts.length; i++) {
      const p1 = poly.pts[i], p2 = poly.pts[i + 1];
      volume += (p0[0] * (p1[1] * p2[2] - p1[2] * p2[1]) - p0[1] * (p1[0] * p2[2] - p1[2] * p2[0]) + p0[2] * (p1[0] * p2[1] - p1[1] * p2[0])) / 6;
    }
    if (poly.dir >= 0) {
      poly.uvDir = poly.dir; poly.shade = FACES[poly.dir].shade;
      cross[poly.dir] = poly.pts.map((p) => flat(poly.dir, p));
      full[poly.dir] = Math.abs(polyArea2(cross[poly.dir]) - 1) < 1e-6;
    } else {
      // caps: UVs from the dominant axis of the normal (ties prefer the vertical faces), shade blended from the
      // faces the slope replaces
      const [nx, ny, nz] = poly.n, ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      poly.uvDir = az >= ax - 1e-9 && az >= ay - 1e-9 ? (nz > 0 ? 4 : 5) : ax >= ay - 1e-9 ? (nx > 0 ? 0 : 1) : (ny > 0 ? 2 : 3);
      poly.shade = (ax * 0.8 + ay * (ny > 0 ? 1.0 : 0.5) + az * 0.65) / (ax + ay + az);
    }
  }
  G = { faces: polys, cross, full, verts: [...verts.values()], volume: Math.abs(volume), boxes: collisionBoxes(def.planes) };
  GEOM_CACHE[code] = G;
  return G;
}
// Collision boxes of a clipped cell on a 4 x 4 plan grid: each column spans the shape's lowest bottom to highest top
// over 9 sample points of its footprint (exact for the planar bounds of these shapes), columns with equal spans are
// merged. Conservative: the boxes contain the whole slope, so nothing ever stands inside it.
function collisionBoxes(planes) {
  if (!planes.length) return [[0, 0, 0, 1, 1, 1]];
  const N = 4, cols = [];
  for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
    let top = -Infinity, bot = Infinity;
    for (let si = 0; si <= 2; si++) for (let sk = 0; sk <= 2; sk++) {
      const x = (i + si / 2) / N, z = (k + sk / 2) / N;
      let hi = 1, lo = 0, ok = true;
      for (const [a, b, c, d] of planes) {
        const r = d - a * x - c * z;
        if (Math.abs(b) < 1e-9) { if (r < -1e-9) ok = false; } else if (b > 0) hi = Math.min(hi, r / b); else lo = Math.max(lo, r / b);
      }
      if (!ok || hi <= lo + 1e-9) continue;
      top = Math.max(top, hi); bot = Math.min(bot, lo);
    }
    if (top > -Infinity) cols.push({ i, k, y0: Math.round(bot * 64) / 64, y1: Math.round(top * 64) / 64 });
  }
  const boxes = [], used = new Set();
  for (const c of cols) {
    if (used.has(c)) continue;
    let k1 = c.k;
    for (;;) { const nxt = cols.find((o) => o.i === c.i && o.k === k1 + 1 && o.y0 === c.y0 && o.y1 === c.y1 && !used.has(o)); if (!nxt) break; used.add(nxt); k1 = nxt.k; }
    used.add(c);
    boxes.push([c.i / N, c.y0, c.k / N, (c.i + 1) / N, c.y1, (k1 + 1) / N]);
  }
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
    const A = boxes[a], Bx = boxes[b];
    if (A[1] === Bx[1] && A[4] === Bx[4] && A[2] === Bx[2] && A[5] === Bx[5] && Math.abs(A[3] - Bx[0]) < 1e-9) { A[3] = Bx[3]; boxes.splice(b, 1); b = a; }
  }
  return boxes;
}
// Does shape B (the neighbour) on its face fB fully cover shape A's face fA on their shared boundary?
const COVER_CACHE = new Map();
export function shapeCovers(codeB, fB, codeA, fA) {
  if (codeB === 0) return true;
  const key = ((codeB * 6 + fB) * MAX_SHAPES + codeA) * 6 + fA;
  let r = COVER_CACHE.get(key);
  if (r !== undefined) return r;
  const B = shapeGeometry(codeB), A = shapeGeometry(codeA);
  const pb = B.cross[fB], pa = A.cross[fA];
  r = !pa ? true : !pb ? false : B.full[fB] ? true : pa.every((pt) => pointInConvex(pb, pt));
  COVER_CACHE.set(key, r);
  return r;
}
// The shape `code` cut by one more cell-local plane: the same code when the plane does not enter the cell, -1 when
// (almost) nothing would be left (the cell becomes air), else the code of the sharper shape. A plane that enters the
// cell is always applied, however thin the sliver it removes: two neighbours cut by one plane then carry the same
// cross-section on their shared face, so the union of the cells stays a closed surface (skipping small slivers left
// T-junctions where a cut cell met an uncut one). Dropping a crumb keeps the surface closed too: the neighbours'
// faces onto the vanished cell are exposed exactly.
const CRUMB = 0.04;
export function cutShape(code, plane) {
  const G = shapeGeometry(code);
  const [a, b, c, d] = plane;
  let inside = 0, outside = 0;
  for (const p of G.verts) { const f = a * p[0] + b * p[1] + c * p[2] - d; if (f > 1e-6) outside++; else if (f < -1e-6) inside++; }
  if (!outside) return code;
  if (!inside) return -1;
  const next = customShape([...SHAPE_DEFS[code].planes, plane]);
  const v = shapeGeometry(next).volume;
  if (v < CRUMB) return -1;
  if (G.volume - v < 1e-9) return code;
  return next;
}
// collision boxes of a cell: the block's own boxes for a full cube / partial block, the shape's for a clipped cell
export function cellBoxes(def, shape) {
  if (!shape || (def.shape !== SHAPE.CUBE && def.shape !== SHAPE.LIQUID)) return def.boxes;
  return shapeGeometry(shape).boxes;
}

export const LIGHT_SAMPLES = 12;
const VERT = /* glsl */ `
#define LIGHT_SAMPLES ${LIGHT_SAMPLES}
attribute float aShade; attribute vec3 aEmit; attribute float aCabin;
uniform vec2 uLight; uniform vec2 uLightAlong[LIGHT_SAMPLES]; uniform float uLightSpan;
varying vec2 vUv; varying float vShade; varying float vDist; varying float vFogDist; varying vec3 vEmit; varying float vAlong; varying vec2 vLight; varying float vCabin;
#if FANCY
varying vec3 vWorldPos;
#endif
void main() {
  vUv = uv; vShade = aShade; vEmit = aEmit; vAlong = position.x; vCabin = aCabin;
  // world light: one sample for the whole vehicle, or interpolated between samples spread along its x axis
  vLight = uLight;
  if (uLightSpan > 0.0) {
    float f = clamp(position.x / uLightSpan, 0.0, 1.0) * float(LIGHT_SAMPLES - 1);
    int i = int(floor(f)); int j = i + 1; if (j > LIGHT_SAMPLES - 1) j = LIGHT_SAMPLES - 1;
    vLight = mix(uLightAlong[i], uLightAlong[j], fract(f));
  }
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  // fog distance: aerial perspective is a horizontal phenomenon - looking down through the thin air column fogs far
  // less than looking across it - so the vertical offset counts 0.45 (the ground stays visible from the air)
  { float fdy = dot(mv.xyz, (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); vFogDist = sqrt(max(dot(mv.xyz, mv.xyz) - fdy * fdy * 0.7975, 0.0)); }
#if FANCY
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
#endif
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uEmissive; uniform vec3 uSelfTint;
uniform float uTime; uniform float uPulse; uniform float uGlow; uniform float uHeadWest; uniform float uHeadEast;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec2 vUv; varying float vShade; varying float vDist; varying float vFogDist; varying vec3 vEmit; varying float vAlong; varying vec2 vLight; varying float vCabin;
#if FANCY
varying vec3 vWorldPos;
#endif
${SHADING_PARS}
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float skyVis = lightCurve(vLight.x);
  float sky = skyVis * uSkyLight;
  // block light: the world's (warm) lamps around the vehicle, or its own cabin light floor (interior faces) in its
  // own tint
  vec3 blkCol = max(vec3(blockCurve(vLight.y)) * vec3(1.0, 0.9, 0.72), vec3(blockCurve(uEmissive * vCabin)) * uSelfTint);
#if FANCY
  // flat faces: the normal comes from the position derivatives (no normal attribute in the vehicle geometry), so
  // sloped cells shade with their own slope
  vec3 N = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 light = shadingLight(vec3(sky) * uSkyTint, blkCol, vWorldPos, N, skyVis, vDist);
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  vec3 light = max(vec3(sky) * uSkyTint, blkCol);
  vec3 fogC = uFogColor;
#endif
  light = max(light, vec3(0.05)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
#if FANCY
  col += sunSpecular(vWorldPos, N, N, V, 0.35, 0.8, tex.rgb, skyVis, vDist) * vShade;   // hull metal
#endif
  // emissive faces (light strips, displays, head / tail lights): self-lit in HDR so bloom picks them up. Strips
  // flagged as pulsing breathe and carry a slow wave along the vehicle while it moves (uPulse = normalised speed,
  // signed by the direction of travel) and hold steady when it is docked; group 1 / 2 faces follow the direction.
  float on = vEmit.z < 0.5 ? 1.0 : (vEmit.z < 1.5 ? uHeadWest : uHeadEast);
  float sp = abs(uPulse), dir = uPulse < 0.0 ? -1.0 : 1.0;
  float wave = 0.5 + 0.5 * sin(uTime * 4.0 - vAlong * 0.45 * dir);
  float glow = clamp(vEmit.x * on * (1.0 - vEmit.y * sp * 0.5 * wave), 0.0, 1.0);
  vec3 hot = tex.rgb * (uGlow * max(vEmit.x, 1.0) + vEmit.y * sp * 0.5);
  col = mix(col, hot, glow);
  col = mix(col, fogC, smoothstep(uFogNear, uFogFar, vFogDist) * (1.0 - 0.6 * glow));
  gl_FragColor = vec4(col, 1.0);
}`;

export function voxelMaterial(atlas) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: atlas }, uLight: { value: new THREE.Vector2(1, 0) }, uEmissive: { value: 0 }, uSelfTint: { value: new THREE.Vector3(1.0, 0.9, 0.72) },
      uLightAlong: { value: Array.from({ length: LIGHT_SAMPLES }, () => new THREE.Vector2(1, 0)) }, uLightSpan: { value: 0 },
      uTime: { value: 0 }, uPulse: { value: 0 }, uGlow: { value: 1.8 }, uHeadWest: { value: 1 }, uHeadEast: { value: 1 },
      uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide,
    defines: { FANCY: 0 },   // flipped to 1 by the render pipeline (sun, cascaded shadows, hull specular)
  });
  bindShading(m);
  m.userData.shadowCaster = true;   // trains and ships cast shadows on the world
  return m;
}

const NO_EMIT = [0, 0, 0];

class GeoBuffer {
  constructor() { this.pos = []; this.uv = []; this.shade = []; this.emit = []; this.cabin = []; this.idx = []; this.faces = 0; this.uvTmp = [0, 0]; this.curEmit = NO_EMIT; this.curCabin = 1; }
  // emissive channel for the faces emitted next: [intensity 0..1, pulse 0..1, group 0 | 1 | 2]
  setEmit(e) { this.curEmit = e || NO_EMIT; }
  // 1 = the faces emitted next look into the cabin (they get the uEmissive floor light), 0 = exterior
  setCabin(c) { this.curCabin = c; }
  pushVertex(x, y, z, u, v, shade) {
    this.pos.push(x, y, z); this.uv.push(u, v); this.shade.push(shade); this.cabin.push(this.curCabin);
    const e = this.curEmit; this.emit.push(e[0], e[1] || 0, e[2] || 0);
  }
  // one face of the sub box [x0..x1, y0..y1, z0..z1] inside cell (bx, by, bz)
  face(d, bx, by, bz, x0, y0, z0, x1, y1, z1, tile, shade = FACES[d].shade) {
    const F = FACES[d];
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      const px = c[0] ? x1 : x0, py = c[1] ? y1 : y0, pz = c[2] ? z1 : z0;
      faceUV(d, px, py, pz, this.uvTmp);
      this.pushVertex(bx + px, by + py, bz + pz, tu + (this.uvTmp[0] * UV_SCALE + INSET) * ts, tv + (this.uvTmp[1] * UV_SCALE + INSET) * ts, shade);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faces++;
  }
  // one polygon of a clipped cell (see shapeGeometry): a triangle fan with the UVs of the face it replaces
  poly(face, bx, by, bz, tile) {
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3, pts = face.pts;
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      faceUV(face.uvDir, p[0], p[1], p[2], this.uvTmp);
      this.pushVertex(bx + p[0], by + p[1], bz + p[2], tu + (this.uvTmp[0] * UV_SCALE + INSET) * ts, tv + (this.uvTmp[1] * UV_SCALE + INSET) * ts, face.shade);
    }
    for (let k = 1; k + 1 < pts.length; k++) this.idx.push(base, base + k, base + k + 1);
    this.faces++;
  }
  // one face of an arbitrary box with the whole tile stretched over it (light bars, door leaves)
  boxFaceStretched(d, x0, y0, z0, x1, y1, z1, tile, shade = FACES[d].shade) {
    const F = FACES[d];
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      faceUV(d, c[0], c[1], c[2], this.uvTmp);
      this.pushVertex(c[0] ? x1 : x0, c[1] ? y1 : y0, c[2] ? z1 : z0, tu + (this.uvTmp[0] * UV_SCALE + INSET) * ts, tv + (this.uvTmp[1] * UV_SCALE + INSET) * ts, shade);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faces++;
  }
  // arbitrary quad (4 corners, CCW), uv corners given as [u, v] fractions of `tile`
  quad(pts, uvs, tile, shade, doubleSided = false) {
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      this.pushVertex(pts[k][0], pts[k][1], pts[k][2], tu + (uvs[k][0] * UV_SCALE + INSET) * ts, tv + (uvs[k][1] * UV_SCALE + INSET) * ts, shade);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    if (doubleSided) this.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    this.faces += doubleSided ? 2 : 1;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aShade', new THREE.Float32BufferAttribute(this.shade, 1));
    g.setAttribute('aEmit', new THREE.Float32BufferAttribute(this.emit, 3));
    g.setAttribute('aCabin', new THREE.Float32BufferAttribute(this.cabin, 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// Visual-only sub box in grid units: { x0, y0, z0, x1, y1, z1, id?, tile?, glow?, stretch?, shade?, cabin? }.
// Textures come from block `id` (per face) or one raw atlas `tile`; boxes spanning several cells are split per cell
// so every piece samples one whole tile (like the partial shapes), unless `stretch` maps the tile over the whole box.
// `cabin` (interior faces, see aCabin) defaults to whether the box's centre cell lies inside the vehicle.
function emitExtra(buf, e, inside = null) {
  const tex = (f) => (e.tile !== undefined ? e.tile : BLOCKS[e.id || 0].tex[f]);
  buf.setEmit(e.glow);
  buf.setCabin(e.cabin !== undefined ? e.cabin : (inside ? (inside(Math.floor((e.x0 + e.x1) / 2), Math.floor((e.y0 + e.y1) / 2), Math.floor((e.z0 + e.z1) / 2)) ? 1 : 0) : 1));
  const shadeOf = (f) => (e.shade !== undefined ? e.shade : FACES[f].shade);
  if (e.stretch === true) {
    for (let f = 0; f < 6; f++) buf.boxFaceStretched(f, e.x0, e.y0, e.z0, e.x1, e.y1, e.z1, tex(f), shadeOf(f));
    buf.setEmit(null);
    return;
  }
  const EPS = 1e-6, perCell = e.stretch === 'cell';
  const cx0 = Math.floor(e.x0 + EPS), cx1 = Math.ceil(e.x1 - EPS) - 1;
  const cy0 = Math.floor(e.y0 + EPS), cy1 = Math.ceil(e.y1 - EPS) - 1;
  const cz0 = Math.floor(e.z0 + EPS), cz1 = Math.ceil(e.z1 - EPS) - 1;
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) for (let cz = cz0; cz <= cz1; cz++) {
    const x0 = Math.max(e.x0, cx) - cx, x1 = Math.min(e.x1, cx + 1) - cx;
    const y0 = Math.max(e.y0, cy) - cy, y1 = Math.min(e.y1, cy + 1) - cy;
    const z0 = Math.max(e.z0, cz) - cz, z1 = Math.min(e.z1, cz + 1) - cz;
    // only the faces on the box's own boundary (not the cuts between pieces)
    const piece = (f) => (perCell
      ? buf.boxFaceStretched(f, cx + x0, cy + y0, cz + z0, cx + x1, cy + y1, cz + z1, tex(f), shadeOf(f))
      : buf.face(f, cx, cy, cz, x0, y0, z0, x1, y1, z1, tex(f), shadeOf(f)));
    if (cx === cx1) piece(0);
    if (cx === cx0) piece(1);
    if (cy === cy1) piece(2);
    if (cy === cy0) piece(3);
    if (cz === cz1) piece(4);
    if (cz === cz0) piece(5);
  }
  buf.setEmit(null);
}

// grid: { w, h, d, get(x, y, z) -> block id (0 = air), shapeAt?(x, y, z) -> shape code }. Origin of the mesh = grid
// cell (0,0,0) corner. Returns { geometry, faces, tris }. Interior faces between two opaque cells are culled (a face
// against a clipped neighbour only when that neighbour's cross-section covers it); faces of transparent blocks
// (glass) against air are kept.
// opts.glow: (id, x, y, z) => [intensity, pulse, group] | null - emissive channel of a cell's faces (default none);
// opts.extras: visual-only sub boxes (see emitExtra); opts.cells: (x, y, z, id) => false to skip a cell (its
// geometry lives in another mesh, e.g. door leaves that move on their own); opts.inside: (x, y, z) => boolean, the
// vehicle's interior cells - a face looking into one (or belonging to a partial shape standing in one) is a cabin face.
export function buildVoxelGeometry(grid, opts = {}) {
  const buf = new GeoBuffer();
  const { w, h, d } = grid;
  const glow = opts.glow || null, inside = opts.inside || null;
  const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 0 : grid.get(x, y, z);
  const shapeAt = grid.shapeAt ? (x, y, z) => grid.shapeAt(x, y, z) : () => 0;
  const opaqueAt = (x, y, z) => { const id = at(x, y, z); return id !== 0 && BLOCKS[id].opaque; };
  // a face flush with the cell boundary is hidden when the neighbour is opaque or the same block (glass runs) and its
  // shape covers the face
  const hidden = (x, y, z, f, id, shape) => {
    const F = FACES[f], nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
    const nid = at(nx, ny, nz);
    if (!(nid !== 0 && (opaqueAt(nx, ny, nz) || nid === id))) return false;
    const ns = shapeAt(nx, ny, nz);
    return ns === 0 ? true : shapeCovers(ns, OPPOSITE[f], shape, f);
  };
  const cabinFace = (x, y, z, f) => { if (!inside) return 1; const F = FACES[f]; return inside(x + F.n[0], y + F.n[1], z + F.n[2]) || inside(x, y, z) ? 1 : 0; };
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    const id = at(x, y, z);
    if (id === 0) continue;
    if (opts.cells && opts.cells(x, y, z, id) === false) continue;
    const def = BLOCKS[id];
    buf.setEmit(glow ? glow(id, x, y, z) : null);
    if (def.shape === SHAPE.CUBE || def.shape === SHAPE.LIQUID) {
      const shape = shapeAt(x, y, z);
      if (shape) {
        const G = shapeGeometry(shape), own = inside ? (inside(x, y, z) ? 1 : 0) : 1;
        for (const face of G.faces) {
          if (face.dir >= 0) { if (hidden(x, y, z, face.dir, id, shape)) continue; buf.setCabin(cabinFace(x, y, z, face.dir)); }
          else buf.setCabin(own);
          buf.poly(face, x, y, z, def.tex[face.uvDir]);
        }
        continue;
      }
      for (let f = 0; f < 6; f++) {
        if (hidden(x, y, z, f, id, 0)) continue;
        buf.setCabin(cabinFace(x, y, z, f));
        buf.face(f, x, y, z, 0, 0, 0, 1, 1, 1, def.tex[f]);
      }
      continue;
    }
    buf.setCabin(inside ? (inside(x, y, z) ? 1 : 0) : 1);
    if (def.shape === SHAPE.RAIL) {
      const alongX = BLOCKS[at(x + 1, y, z)].shape === SHAPE.RAIL || BLOCKS[at(x - 1, y, z)].shape === SHAPE.RAIL;
      const alongZ = BLOCKS[at(x, y, z + 1)].shape === SHAPE.RAIL || BLOCKS[at(x, y, z - 1)].shape === SHAPE.RAIL;
      const rot = alongX && !alongZ;
      const c = FACES[2].c, pts = [], uvs = [];
      for (let k = 0; k < 4; k++) {
        pts.push([x + c[k][0], y + 0.0625, z + c[k][2]]);
        let u = c[k][0], v = c[k][2];
        if (rot) { const t = u; u = v; v = 1 - t; }
        uvs.push([u, v]);
      }
      buf.quad(pts, uvs, def.tex[2], 1.0);
      continue;
    }
    if (def.shape === SHAPE.CROSS) {
      const o = 0.1, tile = def.tex[0];
      buf.quad([[x + o, y, z + o], [x + 1 - o, y, z + 1 - o], [x + 1 - o, y + 1, z + 1 - o], [x + o, y + 1, z + o]], [[0, 1], [1, 1], [1, 0], [0, 0]], tile, 0.9, true);
      buf.quad([[x + 1 - o, y, z + o], [x + o, y, z + 1 - o], [x + o, y + 1, z + 1 - o], [x + 1 - o, y + 1, z + o]], [[0, 1], [1, 1], [1, 0], [0, 0]], tile, 0.9, true);
      continue;
    }
    // partial shapes: one sub box per collision box (torches / lanterns get a small post, other box-less
    // decorations are skipped: they only exist for the world mesher)
    let boxes = def.boxes;
    if (!boxes.length) {
      if (def.shape === SHAPE.TORCH) boxes = [[0.4375, 0, 0.4375, 0.5625, 0.625, 0.5625]];
      else if (def.shape === SHAPE.LANTERN) boxes = [[0.3125, 0, 0.3125, 0.6875, 0.4375, 0.6875]];
      else if (def.shape === SHAPE.PANE) boxes = [[0.4375, 0, 0, 0.5625, 1, 1]];
      else continue;
    }
    for (const b of boxes) {
      for (let f = 0; f < 6; f++) {
        const flush = (f === 0 && b[3] >= 1) || (f === 1 && b[0] <= 0) || (f === 2 && b[4] >= 1) || (f === 3 && b[1] <= 0) || (f === 4 && b[5] >= 1) || (f === 5 && b[2] <= 0);
        if (flush && hidden(x, y, z, f, id, 0)) continue;
        buf.face(f, x, y, z, b[0], b[1], b[2], b[3], b[4], b[5], def.tex[f]);
      }
    }
  }
  buf.setEmit(null); buf.setCabin(1);
  if (opts.extras) for (const e of opts.extras) emitExtra(buf, e, inside);
  return { geometry: buf.build(), faces: buf.faces, tris: buf.idx.length / 3 };
}

// Geometry of extras alone (no grid cells): parts that move relative to the hull, e.g. sliding door leaves.
export function buildExtrasGeometry(extras, inside = null) {
  const buf = new GeoBuffer();
  for (const e of extras) emitExtra(buf, e, inside);
  return { geometry: buf.build(), faces: buf.faces, tris: buf.idx.length / 3 };
}

// Convenience: a dense Uint8Array grid of block ids plus an optional Uint16Array of cell shape codes (allocated on
// the first shaped cell, so cube-only grids carry nothing extra).
export class VoxelGrid {
  constructor(w, h, d) { this.w = w; this.h = h; this.d = d; this.data = new Uint8Array(w * h * d); this.shape = null; }
  idx(x, y, z) { return (x * this.d + z) * this.h + y; }
  inBounds(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d; }
  get(x, y, z) { return this.inBounds(x, y, z) ? this.data[this.idx(x, y, z)] : 0; }
  shapeAt(x, y, z) { return this.shape && this.inBounds(x, y, z) ? this.shape[this.idx(x, y, z)] : 0; }
  // sets a cell (the shape code defaults to the full cube, so overwriting a wedge with a block squares it again)
  set(x, y, z, id, shape = 0) {
    if (!this.inBounds(x, y, z)) return;
    const i = this.idx(x, y, z);
    this.data[i] = id;
    if (shape) { if (!this.shape) this.shape = new Uint16Array(this.data.length); this.shape[i] = shape; }
    else if (this.shape) this.shape[i] = 0;
  }
  setShape(x, y, z, shape) {
    if (!this.inBounds(x, y, z)) return;
    if (!shape && !this.shape) return;
    if (!this.shape) this.shape = new Uint16Array(this.data.length);
    this.shape[this.idx(x, y, z)] = shape;
  }
  fill(x0, y0, z0, x1, y1, z1, id, shape = 0) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, id, shape); }
  copyFrom(other) { this.data.set(other.data); this.shape = other.shape ? new Uint16Array(other.shape) : null; }
  // collision boxes of a cell in cell-local units (the block's own boxes, or the clipped shape's)
  boxesAt(x, y, z) { const id = this.get(x, y, z); return id ? cellBoxes(BLOCKS[id], this.shapeAt(x, y, z)) : []; }
  // number of non-air cells
  count() { let n = 0; for (let i = 0; i < this.data.length; i++) if (this.data[i]) n++; return n; }
  // number of clipped (non-cube) cells
  shapedCount() { if (!this.shape) return 0; let n = 0; for (let i = 0; i < this.shape.length; i++) if (this.shape[i] && this.data[i]) n++; return n; }
}

// opts.emissive: floor for the block-light channel (0..1) so lit interiors stay visible at night.
// opts.material: an existing voxelMaterial to share; opts.glow / opts.extras / opts.cells: see buildVoxelGeometry.
export function buildVoxelMesh(grid, atlas, opts = {}) {
  const { geometry, faces } = buildVoxelGeometry(grid, opts);
  const mesh = new THREE.Mesh(geometry, opts.material || voxelMaterial(atlas));
  if (!opts.material) mesh.material.uniforms.uEmissive.value = opts.emissive || 0;
  mesh.frustumCulled = true;
  mesh.userData.faces = faces;
  return mesh;
}

// A mesh of extras only (see buildExtrasGeometry) sharing the vehicle's material.
export function buildExtrasMesh(extras, material, inside = null) {
  const { geometry, faces } = buildExtrasGeometry(extras, inside);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = true;
  mesh.userData.faces = faces;
  return mesh;
}
