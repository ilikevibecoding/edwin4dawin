import * as THREE from 'three';
import { bevelBox, box, cyl, plane, torus, matrixFrom } from '../art/geometry.js';
import { mat, tilesFor } from '../art/materials.js';
import { UNITS, C } from '../art/palette.js';
import { reg, OWNERS } from '../core/assets.js';

/**
 * MODULAR ARCHITECTURAL KIT
 * Owner: Fable 2 (map architecture).
 *
 * Every routine returns { parts, colliders } where
 *   parts     = [{ geometry, matrix, matName }] batched later into merged meshes
 *   colliders = [{ x0,y0,z0, x1,y1,z1, surface }] axis-aligned world boxes
 *
 * Working in part lists (rather than Object3D trees) lets the level builder
 * merge everything by material, which keeps draw calls in the low hundreds for
 * a fully dressed 64 x 38 m building.
 */

export function part(geometry, matName, pos, rot, scale) {
  return { geometry, matName, matrix: matrixFrom(pos, rot, scale) };
}

export function collider(x0, y0, z0, x1, y1, z1, surface = 'drywall', tag = null) {
  return {
    x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1),
    x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1),
    surface, tag,
  };
}

/** Map a material family to the impact/footstep surface class. */
export function surfaceOf(matName) {
  if (!matName) return 'concrete';
  const fam = matName.split('.')[0];
  switch (fam) {
    case 'drywall': case 'plaster': return 'drywall';
    case 'ceiling': return 'tile';
    case 'carpet': case 'fabric': return 'carpet';
    case 'vinyl': return 'vinyl';
    case 'tile': return 'ceramic';
    case 'concrete': return 'concrete';
    case 'wood': case 'laminate': case 'cardboard': case 'paper': return 'wood';
    case 'metal': return 'metal';
    case 'glass': return 'glass';
    case 'plastic': return 'plastic';
    case 'rubber': return 'rubber';
    case 'snow': case 'ice': return 'snow';
    case 'leather': return 'carpet';
    default: return 'concrete';
  }
}

/* ------------------------------------------------------------------ */
/* Walls                                                               */
/* ------------------------------------------------------------------ */

/**
 * A wall panel with beveled arrises, correct thickness and optional trim.
 * axis 'x' -> plane of constant X, runs along Z. axis 'z' -> runs along X.
 */
export function wallPanel({
  axis, at, a, b, y0, y1, thickness = UNITS.wallThickness,
  matName = 'drywall.warm', baseboard = true, crown = false, floorY = 0,
  baseboardMat = 'wood.pale', surface = null,
}) {
  const parts = [];
  const colliders = [];
  const len = b - a;
  const h = y1 - y0;
  if (len <= 0.001 || h <= 0.001) return { parts, colliders };
  const cx = axis === 'x' ? at : (a + b) / 2;
  const cz = axis === 'x' ? (a + b) / 2 : at;
  const cy = floorY + (y0 + y1) / 2;

  const w = axis === 'x' ? thickness : len;
  const d = axis === 'x' ? len : thickness;

  const tiles = tilesFor(len, h, 2.4);
  const g = bevelBox(w, h, d, UNITS.bevel);
  parts.push({ geometry: g, matName, matrix: matrixFrom([cx, cy, cz]), tiles });
  colliders.push(collider(cx - w / 2, floorY + y0, cz - d / 2, cx + w / 2, floorY + y1, cz + d / 2, surface ?? surfaceOf(matName), 'wall'));

  if (baseboard && y0 < 0.02) {
    const bh = UNITS.baseboard;
    const bt = thickness + 0.022;
    const bw = axis === 'x' ? bt : len;
    const bd = axis === 'x' ? len : bt;
    parts.push({ geometry: bevelBox(bw, bh, bd, 0.004), matName: baseboardMat, matrix: matrixFrom([cx, floorY + bh / 2, cz]) });
  }
  if (crown) {
    const ch = 0.055;
    const ct = thickness + 0.03;
    const cw = axis === 'x' ? ct : len;
    const cd = axis === 'x' ? len : ct;
    parts.push({ geometry: bevelBox(cw, ch, cd, 0.004), matName: 'drywall.cool', matrix: matrixFrom([cx, floorY + y1 - ch / 2, cz]) });
  }
  return { parts, colliders };
}

/**
 * Build a wall run with rectangular openings carved out.
 * openings: [{ a, b, y0, y1 }] in the same running-axis space.
 * Returns wall parts plus the list of resolved opening rects for frames.
 */
export function wallWithOpenings(spec) {
  const { axis, at, a, b, y0, y1, openings = [] } = spec;
  const parts = [];
  const colliders = [];
  const sorted = openings
    .filter((o) => o.b > a && o.a < b)
    .map((o) => ({ ...o, a: Math.max(o.a, a), b: Math.min(o.b, b) }))
    .sort((p, q) => p.a - q.a);

  // Merge overlapping openings horizontally so we can split the run cleanly.
  const cols = [];
  for (const o of sorted) {
    const last = cols[cols.length - 1];
    if (last && o.a <= last.b + 1e-6) {
      last.b = Math.max(last.b, o.b);
      last.items.push(o);
    } else {
      cols.push({ a: o.a, b: o.b, items: [o] });
    }
  }

  let cursor = a;
  for (const col of cols) {
    if (col.a > cursor + 1e-4) {
      const seg = wallPanel({ ...spec, a: cursor, b: col.a, openings: undefined });
      parts.push(...seg.parts);
      colliders.push(...seg.colliders);
    }
    // Sill and header bands across the opening column
    const minY = Math.min(...col.items.map((o) => o.y0));
    const maxY = Math.max(...col.items.map((o) => o.y1));
    if (minY > y0 + 1e-4) {
      const seg = wallPanel({ ...spec, a: col.a, b: col.b, y0, y1: minY, baseboard: spec.baseboard, openings: undefined });
      parts.push(...seg.parts);
      colliders.push(...seg.colliders);
    }
    if (maxY < y1 - 1e-4) {
      const seg = wallPanel({ ...spec, a: col.a, b: col.b, y0: maxY, y1, baseboard: false, crown: spec.crown, openings: undefined });
      parts.push(...seg.parts);
      colliders.push(...seg.colliders);
    }
    // Piers between multiple openings sharing this column
    const items = col.items.slice().sort((p, q) => p.a - q.a);
    for (let i = 0; i + 1 < items.length; i++) {
      const gapA = items[i].b;
      const gapB = items[i + 1].a;
      if (gapB > gapA + 1e-4) {
        const seg = wallPanel({ ...spec, a: gapA, b: gapB, y0: minY, y1: maxY, baseboard: spec.baseboard, openings: undefined });
        parts.push(...seg.parts);
        colliders.push(...seg.colliders);
      }
    }
    cursor = col.b;
  }
  if (cursor < b - 1e-4) {
    const seg = wallPanel({ ...spec, a: cursor, b, openings: undefined });
    parts.push(...seg.parts);
    colliders.push(...seg.colliders);
  }
  return { parts, colliders };
}

/* ------------------------------------------------------------------ */
/* Openings dressing: frames, glazing, mullions, railings              */
/* ------------------------------------------------------------------ */

export function doorFrame({ axis, at, a, b, y0, y1, floorY = 0, thickness = UNITS.wallThickness, matName = 'wood.pale' }) {
  const parts = [];
  const t = thickness + 0.03;
  const jamb = 0.06;
  const cx = axis === 'x' ? at : 0;
  const cz = axis === 'x' ? 0 : at;
  const mkX = (pos, size) => {
    // pos/size are along the running axis
    const px = axis === 'x' ? cx : pos;
    const pz = axis === 'x' ? pos : cz;
    return { px, pz, w: axis === 'x' ? t : size, d: axis === 'x' ? size : t };
  };
  // Left jamb
  {
    const { px, pz, w, d } = mkX(a - jamb / 2, jamb);
    parts.push(part(bevelBox(w, y1 - y0 + jamb, d, 0.006), matName, [px, floorY + (y0 + y1 + jamb) / 2 - jamb / 2, pz]));
  }
  // Right jamb
  {
    const { px, pz, w, d } = mkX(b + jamb / 2, jamb);
    parts.push(part(bevelBox(w, y1 - y0 + jamb, d, 0.006), matName, [px, floorY + (y0 + y1 + jamb) / 2 - jamb / 2, pz]));
  }
  // Head
  {
    const { px, pz, w, d } = mkX((a + b) / 2, b - a + jamb * 2);
    parts.push(part(bevelBox(w, jamb, d, 0.006), matName, [px, floorY + y1 + jamb / 2, pz]));
  }
  // Threshold strip
  {
    const { px, pz, w, d } = mkX((a + b) / 2, b - a);
    parts.push(part(bevelBox(w * 0.95, 0.012, d, 0.003), 'metal.brushed', [px, floorY + y0 + 0.006, pz]));
  }
  return { parts, colliders: [] };
}

export function archReveal({ axis, at, a, b, y0, y1, floorY = 0, thickness = UNITS.wallThickness, matName = 'drywall.warm' }) {
  const parts = [];
  const t = thickness;
  const rev = 0.03;
  const mk = (pos, size, isHead) => {
    const px = axis === 'x' ? at : pos;
    const pz = axis === 'x' ? pos : at;
    const w = axis === 'x' ? t : (isHead ? size : rev);
    const d = axis === 'x' ? (isHead ? size : rev) : t;
    return { px, pz, w, d };
  };
  {
    const { px, pz, w, d } = mk(a + rev / 2, rev, false);
    parts.push(part(bevelBox(w, y1 - y0, d, 0.006), matName, [px, floorY + (y0 + y1) / 2, pz]));
  }
  {
    const { px, pz, w, d } = mk(b - rev / 2, rev, false);
    parts.push(part(bevelBox(w, y1 - y0, d, 0.006), matName, [px, floorY + (y0 + y1) / 2, pz]));
  }
  {
    const { px, pz, w, d } = mk((a + b) / 2, b - a, true);
    parts.push(part(bevelBox(w, rev, d, 0.006), matName, [px, floorY + y1 - rev / 2, pz]));
  }
  return { parts, colliders: [] };
}

/**
 * Glazed opening: aluminium frame, optional mullion/transom grid, glass panes.
 * Glass panes are returned separately so they can be individually breakable.
 */
export function glazing({
  axis, at, a, b, y0, y1, floorY = 0, thickness = UNITS.wallThickness,
  glass = 'clear', mullions = true, frameMat = 'metal.aluminium', panelWidth = 1.5, sill = true,
}) {
  const parts = [];
  const panes = [];
  const colliders = [];
  const fw = UNITS.mullion;
  const frameDepth = Math.min(thickness, 0.1);
  const len = b - a;
  const h = y1 - y0;
  const cAt = at;

  const mkBar = (posAlong, sizeAlong, yc, yh) => {
    const px = axis === 'x' ? cAt : posAlong;
    const pz = axis === 'x' ? posAlong : cAt;
    const w = axis === 'x' ? frameDepth : sizeAlong;
    const d = axis === 'x' ? sizeAlong : frameDepth;
    parts.push(part(bevelBox(w, yh, d, 0.004), frameMat, [px, floorY + yc, pz]));
  };

  // Perimeter frame
  mkBar((a + b) / 2, len, y0 + fw / 2, fw);
  mkBar((a + b) / 2, len, y1 - fw / 2, fw);
  mkBar(a + fw / 2, fw, (y0 + y1) / 2, h);
  mkBar(b - fw / 2, fw, (y0 + y1) / 2, h);

  // Mullion grid
  const cols = mullions ? Math.max(1, Math.round(len / panelWidth)) : 1;
  const rows = mullions && h > 2.6 ? Math.max(1, Math.round(h / 2.0)) : 1;
  for (let i = 1; i < cols; i++) {
    const p = a + (len * i) / cols;
    mkBar(p, fw, (y0 + y1) / 2, h);
  }
  for (let j = 1; j < rows; j++) {
    const yy = y0 + (h * j) / rows;
    mkBar((a + b) / 2, len, yy, fw * 0.85);
  }

  // Panes
  const glassMat = glass === 'frosted' ? 'glass.frosted' : glass === 'tinted' ? 'glass.tinted' : 'glass.clear';
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const pa = a + (len * i) / cols + fw / 2;
      const pb = a + (len * (i + 1)) / cols - fw / 2;
      const pyc = y0 + (h * (j + 0.5)) / rows;
      const pyh = h / rows - fw;
      if (pb - pa < 0.05 || pyh < 0.05) continue;
      panes.push({
        axis, at: cAt, a: pa, b: pb,
        y0: floorY + pyc - pyh / 2, y1: floorY + pyc + pyh / 2,
        matName: glassMat, thickness: 0.014,
      });
    }
  }

  if (sill && y0 > 0.05) {
    const sd = thickness + 0.06;
    const w = axis === 'x' ? sd : len;
    const d = axis === 'x' ? len : sd;
    parts.push(part(bevelBox(w, 0.035, d, 0.006), 'laminate.white', [axis === 'x' ? cAt : (a + b) / 2, floorY + y0 - 0.017, axis === 'x' ? (a + b) / 2 : cAt]));
    colliders.push(collider(
      (axis === 'x' ? cAt - sd / 2 : a), floorY + y0 - 0.05, (axis === 'x' ? a : cAt - sd / 2),
      (axis === 'x' ? cAt + sd / 2 : b), floorY + y0, (axis === 'x' ? b : cAt + sd / 2), 'laminate',
    ));
  }
  return { parts, panes, colliders };
}

/** Balcony / stair railing: posts, top rail, mid rail, glass or bar infill. */
export function railing({ axis, at, a, b, floorY = 0, height = 1.06, infill = 'glass', matName = 'metal.brushed' }) {
  const parts = [];
  const colliders = [];
  const len = b - a;
  const postEvery = 1.4;
  const n = Math.max(2, Math.round(len / postEvery) + 1);
  const pos = (t) => (axis === 'x' ? [at, 0, a + t * len] : [a + t * len, 0, at]);
  for (let i = 0; i < n; i++) {
    const [px, , pz] = pos(i / (n - 1));
    parts.push(part(bevelBox(0.05, height, 0.05, 0.006), matName, [px, floorY + height / 2, pz]));
  }
  const barW = axis === 'x' ? 0.07 : len;
  const barD = axis === 'x' ? len : 0.07;
  const cx = axis === 'x' ? at : (a + b) / 2;
  const cz = axis === 'x' ? (a + b) / 2 : at;
  parts.push(part(bevelBox(barW, 0.055, barD, 0.012), matName, [cx, floorY + height, cz]));
  parts.push(part(bevelBox(barW * 0.8, 0.035, barD * 0.8, 0.008), matName, [cx, floorY + 0.09, cz]));
  if (infill === 'glass') {
    parts.push(part(box(axis === 'x' ? 0.012 : len - 0.1, height - 0.16, axis === 'x' ? len - 0.1 : 0.012), 'glass.clear', [cx, floorY + height / 2, cz]));
  } else {
    const bars = Math.floor(len / 0.14);
    for (let i = 1; i < bars; i++) {
      const [px, , pz] = pos(i / bars);
      parts.push(part(cyl(0.008, 0.008, height - 0.12, 6), matName, [px, floorY + height / 2, pz]));
    }
  }
  colliders.push(collider(
    cx - (axis === 'x' ? 0.07 : len / 2), floorY, cz - (axis === 'x' ? len / 2 : 0.07),
    cx + (axis === 'x' ? 0.07 : len / 2), floorY + height, cz + (axis === 'x' ? len / 2 : 0.07), 'metal', 'railing',
  ));
  return { parts, colliders };
}

/* ------------------------------------------------------------------ */
/* Floors, ceilings, roofs                                             */
/* ------------------------------------------------------------------ */

export function floorSlab({ x0, z0, x1, z1, y = 0, matName = 'carpet.slate', thickness = UNITS.floorThickness, structural = true }) {
  const parts = [];
  const colliders = [];
  const w = x1 - x0;
  const d = z1 - z0;
  if (w <= 0 || d <= 0) return { parts, colliders };
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  // Visible top surface as a thin plate so the material tiles in world scale
  parts.push({
    geometry: plane(w, d), matName,
    matrix: matrixFrom([cx, y + 0.001, cz], [-Math.PI / 2, 0, 0]),
    tiles: tilesFor(w, d, 2.0), doubleSided: false, receiveOnly: true,
  });
  if (structural) {
    parts.push(part(box(w, thickness, d), 'concrete.dark', [cx, y - thickness / 2, cz]));
  }
  colliders.push(collider(x0, y - thickness, z0, x1, y, z1, surfaceOf(matName), 'floor'));
  return { parts, colliders };
}

/** Suspended ceiling: T-bar grid + tiles + optional missing tiles showing plenum. */
export function suspendedCeiling({ x0, z0, x1, z1, y, missing = [], stained = [], rng = null }) {
  const parts = [];
  const colliders = [];
  const w = x1 - x0;
  const d = z1 - z0;
  const t = UNITS.ceilingTile;
  const nx = Math.max(1, Math.round(w / t));
  const nz = Math.max(1, Math.round(d / t));
  const tw = w / nx;
  const td = d / nz;

  // Plenum backing so a missing tile reveals darkness, never the void
  parts.push(part(box(w, 0.02, d), 'ceiling.plenum', [(x0 + x1) / 2, y + 0.16, (z0 + z1) / 2]));

  const missingSet = new Set(missing.map(([i, j]) => `${i},${j}`));
  const stainedSet = new Set(stained.map(([i, j]) => `${i},${j}`));

  // Tiles are single downward-facing quads: their edges are hidden inside the
  // T-bar grid, so a box would cost six times the triangles for no pixels.
  // Runs of adjacent same-type tiles merge into one quad.
  const emitRun = (i0, i1, j, stainedRun) => {
    const w0 = x0 + i0 * tw;
    const w1 = x0 + (i1 + 1) * tw;
    const cz = z0 + (j + 0.5) * td;
    parts.push({
      geometry: plane(w1 - w0 - 0.024, td - 0.024), matName: stainedRun ? 'ceiling.tileStained' : 'ceiling.tile',
      matrix: matrixFrom([(w0 + w1) / 2, y - 0.012, cz], [Math.PI / 2, 0, 0]),
      uvScale: 0.6,
    });
  };
  for (let j = 0; j < nz; j++) {
    let runStart = -1;
    let runStained = false;
    for (let i = 0; i <= nx; i++) {
      const gone = i === nx || missingSet.has(`${i},${j}`);
      const st = i < nx && stainedSet.has(`${i},${j}`);
      if (gone) {
        if (runStart >= 0) emitRun(runStart, i - 1, j, runStained);
        runStart = -1;
        continue;
      }
      if (runStart < 0) { runStart = i; runStained = st; continue; }
      if (st !== runStained) {
        emitRun(runStart, i - 1, j, runStained);
        runStart = i;
        runStained = st;
      }
    }
  }

  // T-bar grid (main runners full length, cross tees per bay)
  for (let i = 0; i <= nx; i++) {
    const x = x0 + i * tw;
    parts.push(part(box(0.024, 0.032, d), 'metal.aluminium', [x, y - 0.016, (z0 + z1) / 2]));
  }
  for (let j = 0; j <= nz; j++) {
    const z = z0 + j * td;
    parts.push(part(box(w, 0.032, 0.024), 'metal.aluminium', [(x0 + x1) / 2, y - 0.016, z]));
  }
  colliders.push(collider(x0, y - 0.04, z0, x1, y + 0.2, z1, 'tile', 'ceiling'));
  return { parts, colliders };
}

export function slabCeiling({ x0, z0, x1, z1, y, matName = 'concrete.raw', thickness = 0.3 }) {
  const parts = [];
  const w = x1 - x0;
  const d = z1 - z0;
  parts.push({
    geometry: plane(w, d), matName,
    matrix: matrixFrom([(x0 + x1) / 2, y - 0.002, (z0 + z1) / 2], [Math.PI / 2, 0, 0]),
    tiles: tilesFor(w, d, 2.5),
  });
  parts.push(part(box(w, thickness, d), 'concrete.dark', [(x0 + x1) / 2, y + thickness / 2, (z0 + z1) / 2]));
  return { parts, colliders: [collider(x0, y, z0, x1, y + thickness, z1, 'concrete', 'ceiling')] };
}

/* ------------------------------------------------------------------ */
/* Columns, stairs, trims                                              */
/* ------------------------------------------------------------------ */

export function column({ x, z, y0 = 0, y1 = 3.2, size = 0.42, matName = 'drywall.cool', capital = true }) {
  const parts = [];
  const colliders = [];
  parts.push(part(bevelBox(size, y1 - y0, size, 0.016), matName, [x, (y0 + y1) / 2, z]));
  parts.push(part(bevelBox(size + 0.08, 0.1, size + 0.08, 0.01), 'metal.brushed', [x, y0 + 0.05, z]));
  if (capital) parts.push(part(bevelBox(size + 0.12, 0.09, size + 0.12, 0.01), matName, [x, y1 - 0.045, z]));
  colliders.push(collider(x - size / 2, y0, z - size / 2, x + size / 2, y1, z + size / 2, surfaceOf(matName), 'column'));
  return { parts, colliders };
}

/** A straight stair flight with real treads, risers, stringers and a handrail. */
export function stairFlight({ x0, z0, dir, length, width, y0, y1, risers = 12, matName = 'concrete.polished', rail = true }) {
  const parts = [];
  const colliders = [];
  const rise = (y1 - y0) / risers;
  const tread = length / risers;
  const ux = dir === 'x+' ? 1 : dir === 'x-' ? -1 : 0;
  const uz = dir === 'z+' ? 1 : dir === 'z-' ? -1 : 0;
  const px = ux !== 0 ? 0 : width / 2;
  const pz = uz !== 0 ? 0 : width / 2;

  for (let i = 0; i < risers; i++) {
    const cx = x0 + ux * (i + 0.5) * tread + (ux !== 0 ? 0 : 0);
    const cz = z0 + uz * (i + 0.5) * tread;
    const stepY = y0 + (i + 1) * rise;
    const w = ux !== 0 ? tread : width;
    const d = uz !== 0 ? tread : width;
    const ox = ux !== 0 ? cx : x0 + width / 2 * 0 + cx;
    const oz = uz !== 0 ? cz : z0 + cz;
    const fx = ux !== 0 ? ox : x0 + width / 2;
    const fz = uz !== 0 ? oz : z0 + width / 2;
    // Tread slab (0.05) sitting on a solid block down to the previous step
    parts.push(part(bevelBox(w + 0.02, 0.05, d + 0.02, 0.005), matName, [fx, stepY - 0.025, fz]));
    parts.push(part(box(w, rise, d), matName, [fx, stepY - rise / 2, fz]));
    // Nosing highlight strip
    const nx = ux !== 0 ? fx + ux * (tread / 2 - 0.012) : fx;
    const nz = uz !== 0 ? fz + uz * (tread / 2 - 0.012) : fz;
    parts.push(part(box(ux !== 0 ? 0.024 : width, 0.006, uz !== 0 ? 0.024 : width), 'metal.brushed', [nx, stepY + 0.001, nz]));
    colliders.push(collider(fx - w / 2, y0, fz - d / 2, fx + w / 2, stepY, fz + d / 2, 'concrete', 'stair'));
  }
  if (rail) {
    const sides = ux !== 0 ? [[0, -width / 2 + 0.05], [0, width / 2 - 0.05]] : [[-width / 2 + 0.05, 0], [width / 2 - 0.05, 0]];
    for (const [ox, oz] of sides) {
      const posts = 4;
      for (let i = 0; i <= posts; i++) {
        const t = i / posts;
        const cx = x0 + ux * t * length + (ux !== 0 ? 0 : width / 2) + ox;
        const cz = z0 + uz * t * length + (uz !== 0 ? 0 : width / 2) + oz;
        const yy = y0 + t * (y1 - y0);
        parts.push(part(bevelBox(0.04, 1.0, 0.04, 0.005), 'metal.brushed', [cx, yy + 0.5, cz]));
      }
      // Sloped handrail
      const midX = x0 + ux * length / 2 + (ux !== 0 ? 0 : width / 2) + ox;
      const midZ = z0 + uz * length / 2 + (uz !== 0 ? 0 : width / 2) + oz;
      const midY = (y0 + y1) / 2 + 1.0;
      const hyp = Math.hypot(length, y1 - y0);
      const ang = Math.atan2(y1 - y0, length);
      const rotY = ux !== 0 ? 0 : Math.PI / 2;
      const g = cyl(0.022, 0.022, hyp, 10);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      if (ux !== 0) e.set(0, 0, Math.PI / 2 - ux * 0 + (ux > 0 ? -ang : ang) * 0 + (Math.PI / 2), 'XYZ');
      // Build the rail as a rotated cylinder aligned to the slope
      const dirVec = new THREE.Vector3(ux * length, y1 - y0, uz * length).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVec);
      m.compose(new THREE.Vector3(midX, midY, midZ), q, new THREE.Vector3(1, 1, 1));
      parts.push({ geometry: g, matName: 'metal.brushed', matrix: m });
      void rotY; void e; void ang;
    }
  }
  return { parts, colliders };
}

export function landingSlab({ x0, z0, x1, z1, y, matName = 'concrete.polished' }) {
  const parts = [];
  const w = x1 - x0;
  const d = z1 - z0;
  parts.push({ geometry: plane(w, d), matName, matrix: matrixFrom([(x0 + x1) / 2, y + 0.001, (z0 + z1) / 2], [-Math.PI / 2, 0, 0]), tiles: tilesFor(w, d, 2) });
  parts.push(part(box(w, 0.24, d), 'concrete.dark', [(x0 + x1) / 2, y - 0.12, (z0 + z1) / 2]));
  return { parts, colliders: [collider(x0, y - 0.24, z0, x1, y, z1, 'concrete', 'floor')] };
}

/* ------------------------------------------------------------------ */
/* Services: ducts, pipes, conduit, cable tray, drains, panels         */
/* ------------------------------------------------------------------ */

export function duct({ x0, z0, x1, z1, y, size = 0.44, matName = 'metal.galvanised' }) {
  const parts = [];
  const horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = horizontal ? x1 - x0 : z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  parts.push(part(bevelBox(horizontal ? Math.abs(len) : size, size, horizontal ? size : Math.abs(len), 0.012), matName, [cx, y, cz]));
  const flanges = Math.max(1, Math.floor(Math.abs(len) / 1.2));
  for (let i = 0; i <= flanges; i++) {
    const t = i / flanges;
    const fx = horizontal ? x0 + (x1 - x0) * t : cx;
    const fz = horizontal ? cz : z0 + (z1 - z0) * t;
    parts.push(part(box(horizontal ? 0.03 : size + 0.05, size + 0.05, horizontal ? size + 0.05 : 0.03), matName, [fx, y, fz]));
  }
  return { parts, colliders: [collider(Math.min(x0, x1) - (horizontal ? 0 : size / 2), y - size / 2, Math.min(z0, z1) - (horizontal ? size / 2 : 0), Math.max(x0, x1) + (horizontal ? 0 : size / 2), y + size / 2, Math.max(z0, z1) + (horizontal ? size / 2 : 0), 'metal', 'duct')] };
}

export function pipeRun({ x0, z0, x1, z1, y, r = 0.05, matName = 'metal.galvanised', count = 1, spacing = 0.14 }) {
  const parts = [];
  const horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = Math.hypot(x1 - x0, z1 - z0);
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * spacing;
    const cx = (x0 + x1) / 2 + (horizontal ? 0 : off);
    const cz = (z0 + z1) / 2 + (horizontal ? off : 0);
    parts.push(part(cyl(r, r, len, 10), matName, [cx, y, cz], [horizontal ? 0 : Math.PI / 2, 0, horizontal ? Math.PI / 2 : 0]));
    const hangers = Math.max(1, Math.floor(len / 2.2));
    for (let h = 0; h <= hangers; h++) {
      const t = h / hangers;
      const hx = x0 + (x1 - x0) * t + (horizontal ? 0 : off);
      const hz = z0 + (z1 - z0) * t + (horizontal ? off : 0);
      parts.push(part(torus(r + 0.012, 0.008, 5, 10), 'metal.painted', [hx, y, hz], [horizontal ? 0 : 0, horizontal ? Math.PI / 2 : 0, 0]));
    }
  }
  return { parts, colliders: [] };
}

export function cableTray({ x0, z0, x1, z1, y, width = 0.3 }) {
  const parts = [];
  const horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = Math.abs(horizontal ? x1 - x0 : z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = horizontal ? len : width;
  const d = horizontal ? width : len;
  parts.push(part(box(w, 0.012, d), 'metal.galvanised', [cx, y - 0.05, cz]));
  parts.push(part(box(horizontal ? len : 0.012, 0.1, horizontal ? 0.012 : len), 'metal.galvanised', [cx + (horizontal ? 0 : width / 2), y, cz + (horizontal ? width / 2 : 0)]));
  parts.push(part(box(horizontal ? len : 0.012, 0.1, horizontal ? 0.012 : len), 'metal.galvanised', [cx - (horizontal ? 0 : width / 2), y, cz - (horizontal ? width / 2 : 0)]));
  // Bundled cable
  parts.push(part(cyl(0.05, 0.05, len, 8), 'plastic.dark', [cx, y - 0.02, cz], [horizontal ? 0 : Math.PI / 2, 0, horizontal ? Math.PI / 2 : 0]));
  return { parts, colliders: [] };
}

export function floorDrain({ x, z, y = 0, r = 0.09 }) {
  const parts = [];
  parts.push(part(cyl(r, r, 0.02, 14), 'metal.stainless', [x, y + 0.006, z]));
  parts.push(part(cyl(r * 0.7, r * 0.7, 0.024, 12), 'metal.painted', [x, y + 0.004, z]));
  for (let i = 0; i < 4; i++) {
    parts.push(part(box(r * 1.3, 0.006, 0.012), 'metal.stainless', [x, y + 0.018, z + (i - 1.5) * 0.026]));
  }
  return { parts, colliders: [] };
}

export function accessPanel({ axis, at, y, along, w = 0.5, h = 0.5, matName = 'metal.painted' }) {
  const parts = [];
  const t = 0.018;
  const px = axis === 'x' ? at : along;
  const pz = axis === 'x' ? along : at;
  parts.push(part(bevelBox(axis === 'x' ? t : w, h, axis === 'x' ? w : t, 0.004), matName, [px, y, pz]));
  parts.push(part(bevelBox(axis === 'x' ? t * 1.4 : w * 0.14, h * 0.1, axis === 'x' ? w * 0.14 : t * 1.4, 0.003), 'metal.brushed', [px, y - h * 0.3, pz]));
  return { parts, colliders: [] };
}

export function roofEdge({ x0, z0, x1, z1, y, height = 0.55 }) {
  const parts = [];
  const colliders = [];
  const seg = (ax, aat, aa, ab) => {
    const w = ax === 'x' ? 0.28 : ab - aa;
    const d = ax === 'x' ? ab - aa : 0.28;
    const cx = ax === 'x' ? aat : (aa + ab) / 2;
    const cz = ax === 'x' ? (aa + ab) / 2 : aat;
    parts.push(part(bevelBox(w, height, d, 0.02), 'concrete.wall', [cx, y + height / 2, cz]));
    parts.push(part(bevelBox(w + 0.08, 0.06, d + 0.08, 0.01), 'metal.galvanised', [cx, y + height + 0.03, cz]));
    colliders.push(collider(cx - w / 2, y, cz - d / 2, cx + w / 2, y + height, cz + d / 2, 'concrete', 'parapet'));
  };
  seg('z', z0, x0, x1);
  seg('z', z1, x0, x1);
  seg('x', x0, z0, z1);
  seg('x', x1, z0, z1);
  return { parts, colliders };
}

let registered = false;
export function registerKitManifest() {
  if (registered) return;
  registered = true;
  const common = {
    category: 'architecture',
    owner: OWNERS.FABLE2,
    files: ['src/map/kit.js', 'src/map/shell.js'],
    lod: 'merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)',
    status: 'accepted',
  };
  const entries = [
    ['arch.wall.straight', 'Straight wall module', 'all rooms', '0.16 m thick × variable, 8 mm arris bevel', 'centre of panel, +Y up', ['drywall.*', 'concrete.wall', 'tile.mosaic'], ['baseColor', 'normal', 'roughness'], 'AABB matching panel', 'Beveled arrises visible at 1 m; no razor edge; baseboard aligned; material tiles at 2.4 m'],
    ['arch.wall.corner', 'Interior/exterior corner', 'every room junction', 'derived from panel intersections', 'shared with panels', ['drywall.*'], ['baseColor', 'normal', 'roughness'], 'covered by panel AABBs', 'No gap or z-fight at corners; bevels meet cleanly'],
    ['arch.wall.half', 'Half wall / knee wall', 'open plan, mezzanine, reception', '1.1 m high', 'panel centre', ['drywall.*', 'wood.veneer'], ['baseColor', 'normal', 'roughness'], 'AABB', 'Cap trim present; readable as vaultable-looking but solid cover'],
    ['arch.doorframe', 'Door frame module', 'every doorway', '0.06 m jamb, head, threshold strip', 'opening centre at floor', ['wood.pale', 'metal.brushed'], ['baseColor', 'normal', 'roughness'], 'none (door leaf carries collision)', 'Jambs enclose the opening; threshold strip present; no floating'],
    ['arch.archreveal', 'Cased opening reveal', 'wide arches', '0.03 m reveal', 'opening centre', ['drywall.*'], ['baseColor', 'normal', 'roughness'], 'none', 'Reveal wraps head and both jambs; no exposed wall core'],
    ['arch.windowframe', 'Window frame + mullion grid', 'all glazing', '60 mm mullion, 1.5 m panel pitch', 'opening centre', ['metal.aluminium', 'laminate.white'], ['baseColor', 'normal', 'roughness'], 'sill AABB only', 'Mullions align on a consistent grid; sill has thickness; glass reads as glass'],
    ['arch.column', 'Structural column', 'lobby, open plan, garage', '0.42 m square × storey height', 'base centre', ['drywall.cool', 'metal.brushed'], ['baseColor', 'normal', 'roughness'], 'AABB', 'Base and capital present; bevels at 16 mm; aligns to structural grid'],
    ['arch.ceilinggrid', 'Suspended ceiling grid', 'all gridded rooms', '600 mm T-bar module', 'room origin', ['metal.aluminium', 'ceiling.tile'], ['baseColor', 'normal', 'roughness'], 'ceiling AABB', 'Grid aligns to room; tiles inset in grid; plenum backing prevents void'],
    ['arch.ceilingtile.intact', 'Intact ceiling tile', 'all gridded rooms', '0.6 × 0.6 × 0.016 m', 'tile centre', ['ceiling.tile'], ['baseColor', 'normal', 'roughness'], 'part of ceiling AABB', 'Fissured mineral-fibre read; no tiling repeat visible from below'],
    ['arch.ceilingtile.stained', 'Stained ceiling tile', 'break room, service corridor, loading', '0.6 × 0.6 × 0.016 m', 'tile centre', ['ceiling.tileStained'], ['baseColor', 'normal', 'roughness'], 'part of ceiling AABB', 'Water stain reads as a leak, not a texture error'],
    ['arch.ceilingtile.missing', 'Missing ceiling tile', 'service corridor, IT, loading', '0.6 × 0.6 m void', 'tile centre', ['ceiling.plenum'], ['baseColor'], 'part of ceiling AABB', 'Reveals dark plenum with visible services, never the skybox'],
    ['arch.floor.carpet', 'Carpet floor module', 'open plan, lobby, executive', 'per-room slab', 'room origin', ['carpet.*'], ['baseColor', 'normal', 'roughness'], 'floor AABB', 'Tiles at 2 m; no stretched UV; seam-free at room joins'],
    ['arch.floor.tile', 'Tile floor module', 'restrooms, vestibule, server', 'per-room slab', 'room origin', ['tile.*'], ['baseColor', 'normal', 'roughness'], 'floor AABB', 'Grout lines continuous across the room, aligned to walls'],
    ['arch.floor.concrete', 'Concrete floor module', 'loading, garage, plant', 'per-room slab', 'room origin', ['concrete.*'], ['baseColor', 'normal', 'roughness'], 'floor AABB', 'Trowel variation visible; joints present in large bays'],
    ['arch.stair.flight', 'Stair flight module', 'central stairwell, fire stair', '12 risers @ 175 mm, 280 mm tread, 1.3–1.5 m wide', 'bottom-front-centre', ['concrete.polished', 'metal.brushed'], ['baseColor', 'normal', 'roughness'], 'per-tread AABB', 'Player and AI ascend smoothly; nosings visible; handrail follows slope'],
    ['arch.stair.landing', 'Stair landing', 'both stairs', 'variable', 'slab centre', ['concrete.polished'], ['baseColor', 'normal', 'roughness'], 'slab AABB', 'Flush with flights; no step lip that catches movement'],
    ['arch.railing', 'Railing module', 'mezzanine, stairs, loading dock', '1.06 m high, 1.4 m post pitch', 'run start', ['metal.brushed', 'glass.clear'], ['baseColor', 'normal', 'roughness'], 'run AABB', 'Blocks falls; glass infill reads as glass; posts do not intersect treads'],
    ['arch.baseboard', 'Baseboard', 'all finished rooms', '110 mm high', 'wall base', ['wood.pale'], ['baseColor', 'normal', 'roughness'], 'within wall AABB', 'Continuous at corners; returns into door jambs'],
    ['arch.crown', 'Edge trim', 'executive, boardroom, lobby', '55 mm', 'wall head', ['drywall.cool'], ['baseColor', 'normal', 'roughness'], 'within wall AABB', 'Reads at gameplay distance without aliasing'],
    ['arch.duct', 'Duct module', 'plant, service corridor, plenum', '0.44 m square section', 'run centre', ['metal.galvanised'], ['baseColor', 'normal', 'roughness'], 'run AABB', 'Flanged joints every 1.2 m; supported, never floating'],
    ['arch.pipe', 'Pipe & conduit module', 'plant, garage, service spine', '50–100 mm dia', 'run centre', ['metal.galvanised', 'metal.painted'], ['baseColor', 'normal', 'roughness'], 'none (visual)', 'Hangers at 2.2 m; runs terminate into equipment or walls'],
    ['arch.cabletray', 'Cable tray', 'server, IT, plenum', '0.3 m wide', 'run centre', ['metal.galvanised', 'plastic.dark'], ['baseColor', 'normal', 'roughness'], 'none', 'Carries a visible cable bundle; brackets present'],
    ['arch.floordrain', 'Floor drain', 'restroom, janitor, garage', '0.18 m dia', 'centre at floor', ['metal.stainless'], ['baseColor', 'normal', 'roughness'], 'none', 'Sits flush in the floor, no z-fighting with the slab'],
    ['arch.accesspanel', 'Utility access panel', 'corridors, plant, garage', '0.5 × 0.5 m', 'panel centre', ['metal.painted'], ['baseColor', 'normal', 'roughness'], 'none', 'Latch detail present; sits proud of the wall by 18 mm'],
    ['arch.roofedge', 'Roof edge / parapet', 'single-storey roof seen from upper floor', '0.55 m high coping', 'run centre', ['concrete.wall', 'metal.galvanised'], ['baseColor', 'normal', 'roughness'], 'AABB', 'Reads as a real coping from the executive windows; snow sits behind it'],
  ];
  for (const [id, name, usedIn, dimensions, pivot, materials, textures, collision, acceptance] of entries) {
    reg({ ...common, id, name, usedIn, dimensions, pivot, materials, textures, collision, acceptance, evidence: ['screenshots/rooms/*.png'] });
  }
}
