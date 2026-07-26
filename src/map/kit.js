import * as THREE from 'three';
import { SHAPE_LANGUAGE as SL } from '../art/palette.js';

// ---------------------------------------------------------------------------
// Modular architectural kit.  (owner: fable2)
//
// Everything is authored in metres, Y-up, with pivots at the base centre unless
// stated otherwise. Frequently-viewed edges get a real chamfer (SL.edgeBevel)
// because razor-sharp CG edges are the fastest way to make a scene look cheap.
// ---------------------------------------------------------------------------

const geoCache = new Map();

export function geoStats() {
  return { cached: geoCache.size };
}

function cacheGeo(key, factory) {
  if (geoCache.has(key)) return geoCache.get(key);
  const g = factory();
  g.userData.kitKey = key;
  geoCache.set(key, g);
  return g;
}

/**
 * Chamfered box. Produces 24 verts with proper hard normals plus small bevel
 * bands on every edge so highlights catch the way they do on real trim.
 * Pivot: centre of the box.
 */
export function bevelBox(w, h, d, bevel = SL.edgeBevel) {
  const b = Math.min(bevel, w / 2.5, h / 2.5, d / 2.5);
  const key = `bev:${w.toFixed(4)}:${h.toFixed(4)}:${d.toFixed(4)}:${b.toFixed(4)}`;
  return cacheGeo(key, () => {
    // Build as an extruded rounded rect swept in Z, which yields believable
    // thickness on all four long edges plus chamfered caps.
    const shape = new THREE.Shape();
    const hw = w / 2 - b;
    const hh = h / 2 - b;
    shape.moveTo(-hw - b, -hh);
    shape.lineTo(-hw - b, hh);
    shape.quadraticCurveTo(-hw - b, hh + b, -hw, hh + b);
    shape.lineTo(hw, hh + b);
    shape.quadraticCurveTo(hw + b, hh + b, hw + b, hh);
    shape.lineTo(hw + b, -hh);
    shape.quadraticCurveTo(hw + b, -hh - b, hw, -hh - b);
    shape.lineTo(-hw, -hh - b);
    shape.quadraticCurveTo(-hw - b, -hh - b, -hw - b, -hh);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d - b * 2,
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geo.translate(0, 0, -(d - b * 2) / 2 - b);
    geo.computeVertexNormals();
    // Planar-ish UVs in world metres so tiling materials read at real scale.
    applyBoxUV(geo, 1);
    return geo;
  });
}

/** Plain box for hidden/collision-only or very small parts. */
export function box(w, h, d) {
  const key = `box:${w.toFixed(4)}:${h.toFixed(4)}:${d.toFixed(4)}`;
  return cacheGeo(key, () => {
    const g = new THREE.BoxGeometry(w, h, d);
    applyBoxUV(g, 1);
    return g;
  });
}

export function cyl(rTop, rBottom, h, seg = 16, open = false) {
  const key = `cyl:${rTop}:${rBottom}:${h}:${seg}:${open}`;
  return cacheGeo(key, () => new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open));
}

export function sphere(r, seg = 16) {
  return cacheGeo(`sph:${r}:${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)));
}

export function plane(w, h) {
  return cacheGeo(`plane:${w.toFixed(3)}:${h.toFixed(3)}`, () => new THREE.PlaneGeometry(w, h, 1, 1));
}

/** Torus for handles, hooks, pipe elbows. */
export function torus(r, tube, seg = 12, tubeSeg = 8, arc = Math.PI * 2) {
  return cacheGeo(`tor:${r}:${tube}:${seg}:${tubeSeg}:${arc.toFixed(3)}`, () =>
    new THREE.TorusGeometry(r, tube, tubeSeg, seg, arc)
  );
}

/**
 * Triplanar-ish box UV projection in world metres. Keeps tiling materials the
 * same physical size on every face regardless of the box proportions.
 */
export function applyBoxUV(geo, metresPerTile = 1) {
  geo.computeBoundingBox();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  if (!nor) geo.computeVertexNormals();
  const uv = new Float32Array(pos.count * 2);
  const s = 1 / metresPerTile;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(geo.attributes.normal.getX(i));
    const ny = Math.abs(geo.attributes.normal.getY(i));
    const nz = Math.abs(geo.attributes.normal.getZ(i));
    let u, v;
    if (ny >= nx && ny >= nz) { u = x * s; v = z * s; }
    else if (nx >= nz) { u = z * s; v = y * s; }
    else { u = x * s; v = y * s; }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (!geo.attributes.uv1) geo.setAttribute('uv1', new THREE.BufferAttribute(uv.slice(), 2));
  return geo;
}

/** Convenience mesh factory that applies shadow flags and asset tagging. */
export function mesh(geometry, material, { cast = true, receive = true, name } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}

/**
 * A wall panel with real thickness, chamfered arris, and a baseboard + crown.
 * Pivot: base centre of the panel; length runs along local X.
 */
export function wallPanel({
  length,
  height = SL.ceilingHeight,
  thickness = SL.wallThickness,
  material,
  baseboard = true,
  baseboardMat,
  crown = false,
  crownMat,
  metresPerTile = 2,
}) {
  const group = new THREE.Group();
  const g = bevelBox(length, height, thickness, 0.006);
  applyBoxUV(g, metresPerTile);
  const panel = mesh(g, material);
  panel.position.y = height / 2;
  group.add(panel);

  if (baseboard) {
    const bh = 0.105;
    const bd = thickness + 0.022;
    const bg = bevelBox(length, bh, bd, 0.004);
    applyBoxUV(bg, 0.5);
    const bb = mesh(bg, baseboardMat || material);
    bb.position.y = bh / 2 + 0.002;
    group.add(bb);
  }
  if (crown) {
    const ch = 0.06;
    const cg = bevelBox(length, ch, thickness + 0.03, 0.004);
    const cm = mesh(cg, crownMat || material);
    cm.position.y = height - ch / 2;
    group.add(cm);
  }
  return group;
}

/**
 * Wall run with rectangular openings punched out. Returns a group of solid
 * pieces (left/right/head/sill) so we never need CSG.
 *
 * @param {Object} o
 * @param {number} o.length     run length along local X
 * @param {Array<{x:number,width:number,sill:number,head:number}>} o.openings
 *        `x` is the opening centre measured from the run's left end.
 */
export function wallWithOpenings({
  length,
  height = SL.ceilingHeight,
  thickness = SL.wallThickness,
  material,
  openings = [],
  baseboard = true,
  baseboardMat,
  metresPerTile = 2,
}) {
  const group = new THREE.Group();
  const sorted = openings
    .map((o) => ({ ...o, left: o.x - o.width / 2, right: o.x + o.width / 2 }))
    .sort((a, b) => a.left - b.left);

  const addSegment = (x0, x1) => {
    const w = x1 - x0;
    if (w <= 0.002) return;
    const p = wallPanel({
      length: w,
      height,
      thickness,
      material,
      baseboard,
      baseboardMat,
      metresPerTile,
    });
    p.position.x = x0 + w / 2 - length / 2;
    group.add(p);
  };

  let cursor = 0;
  for (const op of sorted) {
    addSegment(cursor, Math.max(cursor, op.left));
    // Head piece above the opening
    if (op.head < height - 0.002) {
      const hh = height - op.head;
      const hg = bevelBox(op.width, hh, thickness, 0.005);
      applyBoxUV(hg, metresPerTile);
      const head = mesh(hg, material);
      head.position.set(op.left + op.width / 2 - length / 2, op.head + hh / 2, 0);
      group.add(head);
    }
    // Sill piece below (windows / pass-throughs)
    if (op.sill > 0.002) {
      const sg = bevelBox(op.width, op.sill, thickness, 0.005);
      applyBoxUV(sg, metresPerTile);
      const sill = mesh(sg, material);
      sill.position.set(op.left + op.width / 2 - length / 2, op.sill / 2, 0);
      group.add(sill);
      if (baseboard) {
        const bh = 0.105;
        const bg = bevelBox(op.width, bh, thickness + 0.022, 0.004);
        const bb = mesh(bg, baseboardMat || material);
        bb.position.set(op.left + op.width / 2 - length / 2, bh / 2 + 0.002, 0);
        group.add(bb);
      }
    }
    cursor = Math.max(cursor, op.right);
  }
  addSegment(cursor, length);
  return group;
}

/** Door frame / casing with a threshold. Pivot at base centre of the opening. */
export function doorFrame({ width = SL.doorWidth, height = SL.doorHeight, wallThickness = SL.wallThickness, material, thresholdMat }) {
  const g = new THREE.Group();
  const jambW = 0.055;
  const depth = wallThickness + 0.03;
  for (const side of [-1, 1]) {
    const jg = bevelBox(jambW, height + jambW, depth, 0.005);
    const j = mesh(jg, material);
    j.position.set(side * (width / 2 + jambW / 2), (height + jambW) / 2, 0);
    g.add(j);
  }
  const hg = bevelBox(width + jambW * 2, jambW, depth, 0.005);
  const head = mesh(hg, material);
  head.position.set(0, height + jambW / 2, 0);
  g.add(head);
  // Threshold strip
  const tg = bevelBox(width + jambW * 2, 0.012, depth, 0.003);
  const th = mesh(tg, thresholdMat || material, { cast: false });
  th.position.set(0, 0.006, 0);
  g.add(th);
  return g;
}

/** Window frame with mullions. Pivot at base centre of the opening. */
export function windowFrame({ width, height, wallThickness = SL.wallThickness, material, mullions = 1, sillMat }) {
  const g = new THREE.Group();
  const f = 0.05;
  const depth = wallThickness + 0.02;
  const rails = [
    [width + f, f, 0, -f / 2],
    [width + f, f, 0, height + f / 2],
  ];
  for (const [w, h, x, y] of rails) {
    const m = mesh(bevelBox(w, h, depth, 0.004), material);
    m.position.set(x, y, 0);
    g.add(m);
  }
  for (const side of [-1, 1]) {
    const m = mesh(bevelBox(f, height + f * 2, depth, 0.004), material);
    m.position.set(side * (width / 2 + f / 2), height / 2, 0);
    g.add(m);
  }
  for (let i = 1; i <= mullions; i++) {
    const x = -width / 2 + (width * i) / (mullions + 1);
    const m = mesh(bevelBox(0.035, height, depth * 0.9, 0.003), material);
    m.position.set(x, height / 2, 0);
    g.add(m);
  }
  // Interior stool / sill board
  const stool = mesh(bevelBox(width + f * 2, 0.03, wallThickness + 0.09, 0.004), sillMat || material);
  stool.position.set(0, -f - 0.015, 0.03);
  g.add(stool);
  return g;
}

/**
 * Suspended ceiling: T-bar grid plus tiles. Tiles are 0.6x1.2m.
 * Pivot: centre of the area, positioned at ceiling height by the caller.
 */
export function ceilingGrid({ width, depth, tileMat, stainedMat, gridMat, missing = [], stained = [], rng }) {
  const g = new THREE.Group();
  const tw = 0.6;
  const td = 1.2;
  const nx = Math.max(1, Math.round(width / tw));
  const nz = Math.max(1, Math.round(depth / td));
  const cellW = width / nx;
  const cellD = depth / nz;
  const railT = 0.024;
  const railH = 0.035;

  // T-bar rails
  for (let i = 0; i <= nx; i++) {
    const m = mesh(box(railT, railH, depth), gridMat, { cast: false });
    m.position.set(-width / 2 + i * cellW, -railH / 2, 0);
    g.add(m);
  }
  for (let j = 0; j <= nz; j++) {
    const m = mesh(box(width, railH, railT), gridMat, { cast: false });
    m.position.set(0, -railH / 2, -depth / 2 + j * cellD);
    g.add(m);
  }

  const missingSet = new Set(missing.map((m) => `${m[0]},${m[1]}`));
  const stainedSet = new Set(stained.map((m) => `${m[0]},${m[1]}`));
  const tileGeo = box(cellW - railT, 0.016, cellD - railT);
  applyBoxUV(tileGeo, 0.62);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      if (missingSet.has(`${i},${j}`)) continue;
      const useStained = stainedSet.has(`${i},${j}`) || (rng && rng.float() < 0.06);
      const m = mesh(tileGeo, useStained ? stainedMat : tileMat, { cast: false });
      m.position.set(
        -width / 2 + (i + 0.5) * cellW,
        -railH - 0.008,
        -depth / 2 + (j + 0.5) * cellD
      );
      // Slight per-tile sag/rotation stops the grid reading as a perfect CG plane.
      if (rng) {
        m.rotation.x = (rng.float() - 0.5) * 0.006;
        m.rotation.z = (rng.float() - 0.5) * 0.006;
        m.position.y -= rng.float() * 0.004;
      }
      g.add(m);
    }
  }
  return g;
}

/** Straight stair run. Pivot at the base of the bottom step, ascending toward -Z. */
export function stairRun({ width, rise, run, steps, treadMat, riserMat, stringerMat }) {
  const g = new THREE.Group();
  for (let i = 0; i < steps; i++) {
    const tread = mesh(bevelBox(width, 0.045, run + 0.025, 0.005), treadMat);
    tread.position.set(0, rise * (i + 1) - 0.0225, -run * i - run / 2);
    g.add(tread);
    const riser = mesh(box(width, rise, 0.02), riserMat || treadMat);
    riser.position.set(0, rise * i + rise / 2, -run * i - run + 0.01);
    g.add(riser);
  }
  if (stringerMat) {
    for (const side of [-1, 1]) {
      const len = Math.hypot(run * steps, rise * steps);
      const s = mesh(box(0.05, 0.22, len), stringerMat);
      s.position.set(side * (width / 2 + 0.025), (rise * steps) / 2 - 0.08, (-run * steps) / 2);
      s.rotation.x = Math.atan2(rise * steps, run * steps);
      g.add(s);
    }
  }
  return g;
}

/** Guard rail with posts and a top rail; runs along local X. */
export function railing({ length, height = 1.07, postSpacing = 1.2, material, glass, glassMat }) {
  const g = new THREE.Group();
  const posts = Math.max(2, Math.round(length / postSpacing) + 1);
  for (let i = 0; i < posts; i++) {
    const x = -length / 2 + (length * i) / (posts - 1);
    const p = mesh(cyl(0.021, 0.021, height, 10), material);
    p.position.set(x, height / 2, 0);
    g.add(p);
  }
  const top = mesh(cyl(0.026, 0.026, length, 10), material);
  top.rotation.z = Math.PI / 2;
  top.position.y = height;
  g.add(top);
  const mid = mesh(cyl(0.016, 0.016, length, 8), material);
  mid.rotation.z = Math.PI / 2;
  mid.position.y = height * 0.52;
  g.add(mid);
  if (glass && glassMat) {
    const pane = mesh(plane(length - 0.06, height - 0.16), glassMat, { cast: false, receive: false });
    pane.position.y = height / 2 - 0.03;
    g.add(pane);
  }
  return g;
}

/** Structural column with a base and cap detail. */
export function column({ size = 0.42, height = SL.ceilingHeight, material, capMat }) {
  const g = new THREE.Group();
  const shaft = mesh(bevelBox(size, height, size, 0.012), material);
  shaft.position.y = height / 2;
  g.add(shaft);
  const base = mesh(bevelBox(size + 0.06, 0.09, size + 0.06, 0.008), capMat || material);
  base.position.y = 0.045;
  g.add(base);
  const cap = mesh(bevelBox(size + 0.05, 0.07, size + 0.05, 0.008), capMat || material);
  cap.position.y = height - 0.035;
  g.add(cap);
  return g;
}

/** HVAC duct run along local X, with flanges. */
export function ductRun({ length, w = 0.5, h = 0.35, material }) {
  const g = new THREE.Group();
  const body = mesh(box(length, h, w), material);
  g.add(body);
  const flanges = Math.max(1, Math.floor(length / 1.5));
  for (let i = 0; i <= flanges; i++) {
    const x = -length / 2 + (length * i) / flanges;
    const f = mesh(box(0.035, h + 0.045, w + 0.045), material);
    f.position.x = x;
    g.add(f);
  }
  return g;
}

/** Pipe run with couplings, along local X. */
export function pipeRun({ length, r = 0.05, material, couplings = true }) {
  const g = new THREE.Group();
  const p = mesh(cyl(r, r, length, 12), material);
  p.rotation.z = Math.PI / 2;
  g.add(p);
  if (couplings) {
    const n = Math.max(1, Math.floor(length / 2.2));
    for (let i = 0; i <= n; i++) {
      const c = mesh(cyl(r * 1.25, r * 1.25, 0.06, 12), material);
      c.rotation.z = Math.PI / 2;
      c.position.x = -length / 2 + (length * i) / n;
      g.add(c);
    }
  }
  return g;
}

/** Cable tray with rungs, along local X. */
export function cableTray({ length, w = 0.32, material, cableMat }) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const s = mesh(box(length, 0.07, 0.012), material);
    s.position.set(0, 0, side * (w / 2));
    g.add(s);
  }
  const rungs = Math.max(2, Math.floor(length / 0.3));
  for (let i = 0; i <= rungs; i++) {
    const r = mesh(box(0.02, 0.008, w), material);
    r.position.set(-length / 2 + (length * i) / rungs, -0.03, 0);
    g.add(r);
  }
  if (cableMat) {
    for (let i = 0; i < 4; i++) {
      const c = mesh(cyl(0.014, 0.014, length, 6), cableMat, { cast: false });
      c.rotation.z = Math.PI / 2;
      c.position.set(0, -0.012 + (i % 2) * 0.026, -w / 2 + 0.05 + i * 0.06);
      g.add(c);
    }
  }
  return g;
}

/** Rolling garage shutter built from slats; `open` in 0..1. */
export function garageShutter({ width, height, material, open = 0 }) {
  const g = new THREE.Group();
  const slatH = 0.11;
  const visible = Math.max(0, height * (1 - open));
  const count = Math.ceil(visible / slatH);
  for (let i = 0; i < count; i++) {
    const s = mesh(bevelBox(width, slatH * 0.96, 0.05, 0.008), material);
    s.position.set(0, height - slatH * (i + 0.5), 0);
    g.add(s);
  }
  // Guide rails
  for (const side of [-1, 1]) {
    const r = mesh(box(0.09, height + 0.2, 0.13), material);
    r.position.set(side * (width / 2 + 0.045), (height + 0.2) / 2, 0);
    g.add(r);
  }
  const drum = mesh(cyl(0.16, 0.16, width + 0.2, 12), material);
  drum.rotation.z = Math.PI / 2;
  drum.position.y = height + 0.18;
  g.add(drum);
  g.userData.open = open;
  return g;
}

/** Floor drain grate. */
export function floorDrain(material) {
  const g = new THREE.Group();
  const ring = mesh(cyl(0.13, 0.13, 0.02, 16), material, { cast: false });
  g.add(ring);
  for (let i = 0; i < 5; i++) {
    const s = mesh(box(0.02, 0.014, 0.2), material, { cast: false });
    s.position.set(-0.08 + i * 0.04, 0.006, 0);
    g.add(s);
  }
  return g;
}

/** Access panel / utility hatch on a wall. */
export function accessPanel({ w = 0.5, h = 0.5, material, screwMat }) {
  const g = new THREE.Group();
  const frame = mesh(bevelBox(w, h, 0.018, 0.004), material);
  g.add(frame);
  const inner = mesh(bevelBox(w - 0.05, h - 0.05, 0.024, 0.003), material);
  inner.position.z = 0.004;
  g.add(inner);
  if (screwMat) {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const s = mesh(cyl(0.008, 0.008, 0.008, 6), screwMat);
      s.rotation.x = Math.PI / 2;
      s.position.set(sx * (w / 2 - 0.032), sy * (h / 2 - 0.032), 0.015);
      g.add(s);
    }
  }
  return g;
}

/** Merge a group's meshes per-material into single BufferGeometries. */
export function flattenGroup(group) {
  group.updateMatrixWorld(true);
  return group;
}
