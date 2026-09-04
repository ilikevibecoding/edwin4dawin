// Kit-bash vocabulary shared by the engineering-deck rooms (engineering, reactor, hyperdrive,
// maintenance): yaw-rotated build frames, pipe runs, railings (with chained colliders so diagonal runs
// still block), cable trays, valve wheels, caged work lights, grated decks, octagon helpers and
// grid-sampled walkable floors. Everything merges into the room's Kit.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Frame, pointLight } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { GRATE_TILE, decalRect } from "../../textures.js";

const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

// Horizontal build frame at (cx, y, cz) turned by `yaw` (radians): N points out of the front face
// (yaw 0 faces +z), U runs to the right as seen by someone standing in front of it, V is up.
export function yawFrame(kit, cx, y, cz, yaw) {
  return new Frame(kit, new THREE.Vector3(cx, y, cz), new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), UP);
}

// Yaw that makes a yawFrame at (x, z) face the point (tx, tz).
export function yawToward(x, z, tx, tz) {
  return Math.atan2(tx - x, tz - z);
}

// Dark walls for a roomShell built with skipWalls on all four sides: the standard panel system at a
// coarser pitch and without the greeble panels (about half the triangles of the default grid), a plain
// dark plate with ribs, unit stencils and a soft light band above the 3.2 m panel band in tall rooms.
export function coarseWalls(kit, room, lib, shell, opts = {}) {
  const { seed = 900, panelW = 2.0, styles = { panel: 0.74, vent: 0.12, conduit: 0.14 }, bandMat = "emitWhiteSoft" } = opts;
  const h = room.height;
  const y0 = shell.y0;
  const bandH = Math.min(3.2, h);
  let s = seed;
  for (const [dir, { frame, length }] of Object.entries(shell.frames)) {
    const ops = [];
    for (const door of room.doors || []) if (door[3] === dir) ops.push(lib.doorOpening(room, door, y0, length, Math.min(h - 0.1, door[4] || lib.DOOR_H)));
    lib.panelGrid(frame, length, bandH, { openings: ops, depth: lib.WALL_T, seed: s++, kick: true, topPipes: false, panelW, styles, paints: lib.DARK_PAINTS, tag: room.id + dir });
    if (h > bandH + 0.3) {
      const upper = h - bandH;
      frame.box("paintedMetal", length / 2, bandH + upper / 2, -0.09, length, upper, 0.14, { color: PALETTE.darkMetal, texel: 0.5 });
      frame.box("paintedMetal", length / 2, bandH + 0.1, 0.08, length, 0.2, 0.2, { color: PALETTE.gunmetal, texel: 1 });
      const nRibs = Math.max(1, Math.round(length / 4.5));
      for (let i = 0; i < nRibs; i++) frame.box("paintedMetal", ((i + 0.5) / nRibs) * length, bandH + upper / 2, 0.1, 0.4, upper, 0.22, { color: PALETTE.gunmetal, texel: 1 });
      frame.box("paintedMetal", length / 2, h - 0.9, 0.12, length, 0.4, 0.26, { color: PALETTE.darkMetal, texel: 1 });
      frame.box(bandMat, length / 2, h - 1.17, 0.06, length - 0.4, 0.07, 0.02, { uv: "keep" });
      if (upper > 3) {
        const idx = [2, 14, 0, 8];
        frame.add("decal", new THREE.PlaneGeometry(1.6, 1.6), length * 0.28, bandH + 1.6, -0.015, { uv: "keep", uvRect: decalRect(idx[s % 4]) });
        frame.add("decal", new THREE.PlaneGeometry(1.6, 1.6), length * 0.72, bandH + 1.6, -0.015, { uv: "keep", uvRect: decalRect(idx[(s + 1) % 4]) });
      }
    }
    frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
  }
}

// Cylinder between two world points.
export function cylBetween(kit, mat, a, b, r, opts = {}) {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const B = new THREE.Vector3(b[0], b[1], b[2]);
  const d = B.clone().sub(A);
  const len = d.length();
  if (len < 1e-4) return null;
  const { extend = 0, segments = 12, ...rest } = opts;
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  const mid = A.clone().add(B).multiplyScalar(0.5);
  return kit.add(mat, new THREE.CylinderGeometry(r, r, len + extend, segments), { pos: [mid.x, mid.y, mid.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
}

// Box whose local X axis runs from a to b (beams, braces, stringers, octagon edges).
export function beamBetween(kit, mat, a, b, sy, sz, opts = {}) {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const B = new THREE.Vector3(b[0], b[1], b[2]);
  const d = B.clone().sub(A);
  const len = d.length();
  if (len < 1e-4) return null;
  const { extend = 0, ...rest } = opts;
  const q = new THREE.Quaternion().setFromUnitVectors(X, d.normalize());
  const mid = A.clone().add(B).multiplyScalar(0.5);
  return kit.add(mat, new THREE.BoxGeometry(len + extend, sy, sz), { pos: [mid.x, mid.y, mid.z], quat: q, ...rest });
}

// Pipe through a polyline with rounded elbows.
export function pipeRun(kit, mat, pts, r, opts = {}) {
  const { color = PALETTE.steel, segments = 12 } = opts;
  for (let i = 0; i + 1 < pts.length; i++) cylBetween(kit, mat, pts[i], pts[i + 1], r, { extend: r * 0.6, color, segments });
  for (let i = 1; i + 1 < pts.length; i++) kit.add(mat, new THREE.SphereGeometry(r * 1.12, segments, Math.max(6, segments >> 1)), { pos: pts[i], color, uv: "world" });
}

// pipeRun with the polyline given in a Frame's (u, v, n) coordinates.
export function framePipe(f, pts, r, opts = {}) {
  pipeRun(f.kit, opts.mat || "metal", pts.map(([u, v, n]) => f.pos(u, v, n).toArray()), r, opts);
}

// Bolted flange disc on a pipe at p, pipe direction d.
export function flange(kit, p, d, r, opts = {}) {
  const { color = PALETTE.gunmetal, t = 0.08 } = opts;
  const D = new THREE.Vector3(d[0], d[1], d[2]).normalize();
  const a = [p[0] - D.x * t * 0.5, p[1] - D.y * t * 0.5, p[2] - D.z * t * 0.5];
  const b = [p[0] + D.x * t * 0.5, p[1] + D.y * t * 0.5, p[2] + D.z * t * 0.5];
  cylBetween(kit, "metal", a, b, r, { color, segments: 16 });
}

// Pipe saddle / clamp block under a horizontal pipe.
export function pipeClamp(kit, x, y, z, r, opts = {}) {
  const { axis = "z", color = PALETTE.darkMetal } = opts;
  if (axis === "z") kit.box("paintedMetal", x, y, z, r * 2 + 0.1, r * 2 + 0.06, 0.12, { color, texel: 2 });
  else kit.box("paintedMetal", x, y, z, 0.12, r * 2 + 0.06, r * 2 + 0.1, { color, texel: 2 });
}

// Hand valve: wheel (torus) with four spokes, hub and stem. axis = the stem direction.
export function valveWheel(kit, cx, cy, cz, axis = "y", r = 0.22, opts = {}) {
  const { color = PALETTE.orange, stem = 0.2 } = opts;
  const rot = axis === "x" ? [0, Math.PI / 2, 0] : axis === "y" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  kit.add("painted", new THREE.TorusGeometry(r, 0.024, 6, 16), { pos: [cx, cy, cz], rot, color, uv: "scale", uvScale: [4, 1] });
  for (let k = 0; k < 2; k++) {
    const spin = (k * Math.PI) / 2;
    if (axis === "y") kit.add("metal", new THREE.BoxGeometry(r * 2, 0.02, 0.02), { pos: [cx, cy, cz], rot: [0, spin, 0], color: PALETTE.steel });
    else if (axis === "x") kit.add("metal", new THREE.BoxGeometry(0.02, r * 2, 0.02), { pos: [cx, cy, cz], rot: [spin, 0, 0], color: PALETTE.steel });
    else kit.add("metal", new THREE.BoxGeometry(r * 2, 0.02, 0.02), { pos: [cx, cy, cz], rot: [0, 0, spin], color: PALETTE.steel });
  }
  kit.cyl("metal", cx, cy, cz, 0.04, 0.06, axis, { color: PALETTE.steel, segments: 8 });
  const off = stem / 2;
  const sp = axis === "x" ? [cx - off, cy, cz] : axis === "y" ? [cx, cy - off, cz] : [cx, cy, cz - off];
  kit.cyl("metal", sp[0], sp[1], sp[2], 0.025, stem, axis, { color: PALETTE.gunmetal, segments: 8 });
}

// Straight railing from (ax, az) to (bx, bz) with its feet at height y: posts, top and mid rail, kick
// plate. Colliders are a chain of short AABBs so diagonal runs block as well as axis-aligned ones.
export function railing(kit, ax, az, bx, bz, y, opts = {}) {
  const { h = 1.05, postStep = 1.5, color = PALETTE.gunmetal, railColor = PALETTE.steel, kick = true, collide = true, tag = "rail", mid = true, n0 = 0 } = opts;
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return;
  const f = new Frame(kit, new THREE.Vector3(ax, y, az), new THREE.Vector3(dx, 0, dz), UP);
  const nPosts = Math.max(2, Math.round(len / postStep) + 1);
  for (let i = 0; i < nPosts; i++) {
    const u = (i / (nPosts - 1)) * len;
    f.box("metal", u, h / 2, n0, 0.05, h, 0.05, { color, texel: 2 });
  }
  f.box("metal", len / 2, h, n0, len + 0.05, 0.05, 0.06, { color: railColor, texel: 2 });
  if (mid) f.box("metal", len / 2, h * 0.55, n0, len, 0.035, 0.035, { color, texel: 2 });
  if (kick) f.box("paintedMetal", len / 2, 0.1, n0, len, 0.16, 0.025, { color: PALETTE.darkMetal, texel: 2 });
  if (!collide) return;
  const axisAligned = Math.abs(dx) < 1e-3 || Math.abs(dz) < 1e-3;
  if (axisAligned) f.collider(0, len, 0, h, n0 - 0.05, n0 + 0.05, tag);
  else {
    const pieces = Math.ceil(len / 0.45);
    for (let i = 0; i < pieces; i++) f.collider((i / pieces) * len, ((i + 1) / pieces) * len, 0, h, n0 - 0.05, n0 + 0.05, tag);
  }
}

// Sloped handrail beside a straight stair run from a (bottom) to b (top), both [x, y, z]; `side` is a
// horizontal offset vector [dx, dz] from the run to the rail. Colliders chain along the slope.
export function stairRail(kit, a, b, side, opts = {}) {
  const { h = 1.0, color = PALETTE.gunmetal, railColor = PALETTE.steel, tag = "stairRail" } = opts;
  const A = [a[0] + side[0], a[1], a[2] + side[1]];
  const B = [b[0] + side[0], b[1], b[2] + side[1]];
  const len = Math.hypot(B[0] - A[0], B[2] - A[2]);
  const n = Math.max(2, Math.round(len / 1.4) + 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
    kit.box("metal", p[0], p[1] + h / 2, p[2], 0.05, h, 0.05, { color, texel: 2 });
  }
  beamBetween(kit, "metal", [A[0], A[1] + h, A[2]], [B[0], B[1] + h, B[2]], 0.05, 0.06, { color: railColor, extend: 0.05, texel: 2 });
  beamBetween(kit, "metal", [A[0], A[1] + h * 0.5, A[2]], [B[0], B[1] + h * 0.5, B[2]], 0.035, 0.035, { color, texel: 2 });
  const pieces = Math.ceil(len / 0.5);
  for (let i = 0; i < pieces; i++) {
    const t0 = i / pieces;
    const t1 = (i + 1) / pieces;
    const x0 = A[0] + (B[0] - A[0]) * t0;
    const x1 = A[0] + (B[0] - A[0]) * t1;
    const z0 = A[2] + (B[2] - A[2]) * t0;
    const z1 = A[2] + (B[2] - A[2]) * t1;
    const y0 = A[1] + (B[1] - A[1]) * t0;
    kit.collider([Math.min(x0, x1) - 0.05, y0, Math.min(z0, z1) - 0.05], [Math.max(x0, x1) + 0.05, y0 + h + 0.4, Math.max(z0, z1) + 0.05], tag);
  }
}

// Ladder-style cable tray hung from the ceiling between two [x, z] points, at height y (tray bottom).
export function cableTray(kit, a, b, y, opts = {}) {
  const { w = 0.4, ceilY = null, hangerStep = 2.6, cables = 3, color = PALETTE.gunmetal } = opts;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  if (len < 0.1) return;
  const f = new Frame(kit, new THREE.Vector3(a[0], y, a[1]), new THREE.Vector3(dx, 0, dz), UP);
  f.box("paintedMetal", len / 2, 0.05, w / 2, len, 0.1, 0.02, { color, texel: 2 });
  f.box("paintedMetal", len / 2, 0.05, -w / 2, len, 0.1, 0.02, { color, texel: 2 });
  for (let u = 0.15; u < len; u += 0.32) f.box("metal", u, 0.012, 0, 0.04, 0.024, w, { color: PALETTE.steel });
  const cols = [PALETTE.steel, PALETTE.orange, PALETTE.gunmetal, PALETTE.slate];
  for (let c = 0; c < cables; c++) {
    const r = 0.028 + (c % 3) * 0.012;
    const n = -w / 2 + 0.08 + ((c + 0.5) / cables) * (w - 0.16);
    f.cylU("rubber", len / 2, 0.024 + r, n, r, len - 0.02, { color: c % 2 ? PALETTE.rubber : cols[c % cols.length], segments: 8 });
  }
  if (ceilY !== null) {
    const hang = ceilY - y - 0.1;
    if (hang > 0.05) for (let u = 0.3; u < len; u += hangerStep) {
      f.box("metal", u, 0.1 + hang / 2, w / 2 + 0.01, 0.03, hang, 0.03, { color: PALETTE.steel });
      f.box("metal", u, 0.1 + hang / 2, -w / 2 - 0.01, 0.03, hang, 0.03, { color: PALETTE.steel });
    }
  }
}

// Caged work light hanging `drop` below the ceiling at yCeil; registers a warm practical.
export function cageLight(kit, ctx, x, yCeil, z, drop, opts = {}) {
  const { intensity = 4, distance = 9, color = 0xffc080, mat = "emitWarmSoft" } = opts;
  const y = yCeil - drop;
  kit.cyl("rubber", x, yCeil - drop / 2, z, 0.014, drop, "y", { color: PALETTE.rubber, segments: 6 });
  kit.box("paintedMetal", x, yCeil - 0.04, z, 0.2, 0.08, 0.2, { color: PALETTE.darkMetal, texel: 2 });
  kit.cyl("metal", x, y + 0.02, z, 0.17, 0.12, "y", { color: PALETTE.gunmetal, segments: 14 });
  kit.cyl(mat, x, y - 0.11, z, 0.12, 0.16, "y", { segments: 14, uv: "keep" });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    kit.box("metal", x + Math.cos(a) * 0.15, y - 0.14, z + Math.sin(a) * 0.15, 0.012, 0.3, 0.012, { color: PALETTE.gunmetal });
  }
  kit.add("metal", new THREE.TorusGeometry(0.15, 0.008, 5, 12), { pos: [x, y - 0.28, z], rot: [Math.PI / 2, 0, 0], color: PALETTE.gunmetal, uv: "scale", uvScale: [4, 1] });
  ctx.lights.warm.push(pointLight(color, intensity, distance, [x, y - 0.45, z]));
}

// Grated deck section: one cut-out textured quad with a frame and bearers, walkable unless walk=false.
export function grateDeck(kit, x0, z0, x1, z1, y, opts = {}) {
  const { walk = true, frame = true, bearers = true, bearerStep = 1.24, color = PALETTE.gunmetal } = opts;
  const w = x1 - x0;
  const l = z1 - z0;
  const g = new THREE.PlaneGeometry(w, l);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(x0 + x1) / 2, y + 0.004, (z0 + z1) / 2], uv: "scale", uvScale: [w / GRATE_TILE[0], l / GRATE_TILE[1]], color: 0xffffff });
  if (frame) {
    kit.boxMM("metal", [x0 - 0.03, y - 0.06, z0 - 0.03], [x0 + 0.03, y + 0.01, z1 + 0.03], { color, texel: 2 });
    kit.boxMM("metal", [x1 - 0.03, y - 0.06, z0 - 0.03], [x1 + 0.03, y + 0.01, z1 + 0.03], { color, texel: 2 });
    kit.boxMM("metal", [x0, y - 0.06, z0 - 0.03], [x1, y + 0.01, z0 + 0.03], { color, texel: 2 });
    kit.boxMM("metal", [x0, y - 0.06, z1 - 0.03], [x1, y + 0.01, z1 + 0.03], { color, texel: 2 });
  }
  if (bearers) {
    if (w >= l) for (let x = x0 + bearerStep; x < x1 - 0.3; x += bearerStep) kit.boxMM("metal", [x - 0.02, y - 0.06, z0], [x + 0.02, y - 0.005, z1], { color, texel: 2 });
    else for (let z = z0 + bearerStep; z < z1 - 0.3; z += bearerStep) kit.boxMM("metal", [x0, y - 0.06, z - 0.02], [x1, y - 0.005, z + 0.02], { color, texel: 2 });
  }
  if (walk) kit.floor(x0, z0, x1, z1, y);
}

// Emissive floor marking strip (paint line that glows faintly).
export function floorStrip(kit, x0, z0, x1, z1, y, mat = "emitAmber") {
  kit.boxMM(mat, [Math.min(x0, x1), y + 0.002, Math.min(z0, z1)], [Math.max(x0, x1), y + 0.008, Math.max(z0, z1)], { uv: "keep" });
}

// Rectangle outline of floor strips.
export function floorRect(kit, x0, z0, x1, z1, y, w = 0.1, mat = "emitAmber") {
  floorStrip(kit, x0, z0, x1, z0 + w, y, mat);
  floorStrip(kit, x0, z1 - w, x1, z1, y, mat);
  floorStrip(kit, x0, z0, x0 + w, z1, y, mat);
  floorStrip(kit, x1 - w, z0, x1, z1, y, mat);
}

// Stencil decal on a horizontal or vertical surface. dir: 'up' | '+x' | '-x' | '+z' | '-z'.
export function stencil(kit, x, y, z, size, index, dir = "up") {
  const g = new THREE.PlaneGeometry(size, size);
  if (dir === "up") g.rotateX(-Math.PI / 2);
  else if (dir === "+x") g.rotateY(Math.PI / 2);
  else if (dir === "-x") g.rotateY(-Math.PI / 2);
  else if (dir === "-z") g.rotateY(Math.PI);
  kit.add("decal", g, { pos: [x, y, z], uv: "keep", uvRect: decalRect(index) });
}

// Regular octagon (flat sides facing the axes and the diagonals): support distance of a point.
export function octDist(px, pz) {
  const ax = Math.abs(px);
  const az = Math.abs(pz);
  return Math.max(ax, az, (ax + az) * Math.SQRT1_2);
}

// Radius of the octagon's vertices for a given apothem.
export const OCT_R = 1 / Math.cos(Math.PI / 8);

// Vertex k (0..7) of an octagon with apothem a, centred at (cx, cz), in world xz. Vertices sit at
// 22.5 deg + k * 45 deg so the sides are centred on the axes and diagonals.
export function octVertex(cx, cz, a, k) {
  const ang = Math.PI / 8 + (k * Math.PI) / 4;
  return [cx + Math.cos(ang) * a * OCT_R, cz + Math.sin(ang) * a * OCT_R];
}

// Flat ring geometry between two octagons (apothems aIn..aOut) lying in the xz plane, normal up.
export function octRing(aIn, aOut) {
  const g = new THREE.RingGeometry(aIn * OCT_R, aOut * OCT_R, 8, 1, Math.PI / 8, Math.PI * 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

// One side (k) of an octagon ring as a flat trapezoid; side k faces world direction
// (cos(k*45deg), sin(k*45deg)) in xz.
export function octSector(aIn, aOut, k) {
  const g = new THREE.RingGeometry(aIn * OCT_R, aOut * OCT_R, 1, 1, -(k * Math.PI) / 4 - Math.PI / 8, Math.PI / 4);
  g.rotateX(-Math.PI / 2);
  return g;
}

// Octagonal prism with flat sides facing the axes.
export function octPrism(a, h, opts = {}) {
  return new THREE.CylinderGeometry((opts.aTop ?? a) * OCT_R, a * OCT_R, h, 8, 1, false, Math.PI / 8);
}

// Side k of an octagon with apothem a: endpoints in world xz (k as in octSector).
export function octSide(cx, cz, a, k) {
  const ang = (k * Math.PI) / 4;
  const half = a * Math.tan(Math.PI / 8);
  const nx = Math.cos(ang);
  const nz = Math.sin(ang);
  const mx = cx + nx * a;
  const mz = cz + nz * a;
  // tangent runs counter-clockwise (seen from above) around the centre
  const tx = -nz;
  const tz = nx;
  return [[mx - tx * half, mz - tz * half], [mx + tx * half, mz + tz * half]];
}

// Walkable floor rects sampled on a grid: fn(cx, cz) returns the surface height or null. Cells along z
// with the same height are merged into one rect.
export function gridFloors(kit, x0, z0, x1, z1, cell, fn) {
  for (let x = x0; x < x1 - 1e-6; x += cell) {
    const xa = x;
    const xb = Math.min(x + cell, x1);
    let runY = null;
    let runZ0 = 0;
    for (let z = z0; z < z1 + 1e-6; z += cell) {
      const y = z < z1 - 1e-6 ? fn((xa + xb) / 2, z + cell / 2) : null;
      if (y !== runY) {
        if (runY !== null) kit.floor(xa, runZ0, xb, Math.min(z, z1), runY);
        runY = y;
        runZ0 = z;
      }
    }
  }
}

// Row-strip colliders for a solid octagonal prism (apothem a) between y0 and y1.
export function octColliders(kit, cx, cz, a, y0, y1, tag = "core", step = 0.4) {
  for (let dz = -a; dz < a - 1e-6; dz += step) {
    const zc = Math.min(a - step / 2, dz + step / 2);
    const half = Math.min(a, a * Math.SQRT2 - Math.abs(zc));
    if (half <= 0) continue;
    kit.collider([cx - half, y0, cz + dz], [cx + half, y1, cz + Math.min(dz + step, a)], tag);
  }
}

// Thin wall colliders along octagon side k at apothem a between y0 and y1.
export function octSideCollider(kit, cx, cz, a, k, y0, y1, tag = "pitWall", t = 0.06) {
  const [p, q] = octSide(cx, cz, a, k);
  const dx = q[0] - p[0];
  const dz = q[1] - p[1];
  const len = Math.hypot(dx, dz);
  if (k % 2 === 0) {
    kit.collider([Math.min(p[0], q[0]) - t, y0, Math.min(p[1], q[1]) - t], [Math.max(p[0], q[0]) + t, y1, Math.max(p[1], q[1]) + t], tag);
    return;
  }
  const pieces = Math.ceil(len / 0.4);
  for (let i = 0; i < pieces; i++) {
    const ax = p[0] + (dx * i) / pieces;
    const bx = p[0] + (dx * (i + 1)) / pieces;
    const az = p[1] + (dz * i) / pieces;
    const bz = p[1] + (dz * (i + 1)) / pieces;
    kit.collider([Math.min(ax, bx) - t, y0, Math.min(az, bz) - t], [Math.max(ax, bx) + t, y1, Math.max(az, bz) + t], tag);
  }
}

// Freestanding operator station: satin-black desk with a slanted screen bank, a keyboard ledge and a
// chair. Built in a yaw frame: the operator sits at n < 0 (behind), the screens face the operator.
export function station(kit, cx, y, cz, yaw, width, opts = {}) {
  const { screen = "screen6", chairs = 1, tag = "station", depth = 0.8, glow = "emitAmber" } = opts;
  const f = yawFrame(kit, cx, y, cz, yaw);
  // desk body (n from -depth/2 to depth/2)
  f.box("satinBlack", 0, 0.38, 0, width, 0.76, depth);
  f.box("metal", 0, 0.05, 0, width - 0.2, 0.1, depth - 0.2, { color: PALETTE.darkMetal, texel: 2 });
  f.box("satinBlack", 0, 0.78, 0, width + 0.04, 0.04, depth + 0.04);
  // raised screen bank at the front edge, tilted back toward the operator
  f.box("satinBlack", 0, 1.0, depth * 0.3, width - 0.1, 0.42, 0.12, { tilt: 0.35 });
  const nScreens = Math.max(1, Math.round((width - 0.2) / 0.6));
  const sw = (width - 0.2) / nScreens;
  for (let i = 0; i < nScreens; i++) {
    const u = -width / 2 + 0.1 + sw * (i + 0.5);
    f.box(i % 2 === 0 ? screen : "screen4", u, 1.0, depth * 0.3 - 0.075, sw - 0.06, 0.32, 0.01, { tilt: 0.35, uv: "keep" });
  }
  // keyboard ledge + status leds facing the operator
  f.box("darkGloss", 0, 0.8, -depth * 0.15, width - 0.3, 0.015, 0.3);
  f.box("leds", 0, 0.74, -depth / 2 - 0.005, width - 0.4, 0.04, 0.01, { uv: "keep" });
  f.box(glow, 0, 0.12, -depth / 2 - 0.005, width - 0.3, 0.02, 0.01, { uv: "keep" });
  f.collider(-width / 2, width / 2, 0, 1.25, -depth / 2, depth / 2 + 0.05, tag);
  for (let c = 0; c < chairs; c++) {
    const u = chairs === 1 ? 0 : -width / 4 + (width / 2) * c;
    chair(f, u, -depth / 2 - 0.55);
  }
  return f;
}

// Operator chair in a frame at (u, n): pedestal, seat, tall back with a headrest, armrests. The back is
// at n - 0.24 (away from the desk at n > 0).
export function chair(f, u, n) {
  f.cylV("metal", u, 0.02, n, 0.28, 0.04, { color: PALETTE.darkMetal, segments: 14 });
  f.cylV("metal", u, 0.25, n, 0.04, 0.42, { color: PALETTE.gunmetal, segments: 8 });
  f.box("rubber", u, 0.48, n, 0.5, 0.08, 0.5, { color: PALETTE.rubber });
  f.box("satinBlack", u, 0.53, n, 0.52, 0.03, 0.52);
  f.box("rubber", u, 0.88, n - 0.24, 0.46, 0.72, 0.07, { color: PALETTE.rubber, tilt: -0.12 });
  f.box("satinBlack", u, 0.88, n - 0.29, 0.5, 0.76, 0.03, { tilt: -0.12 });
  f.box("rubber", u, 1.32, n - 0.3, 0.3, 0.16, 0.08, { color: PALETTE.rubber });
  f.box("metal", u, 0.58, n - 0.24, 0.1, 0.2, 0.06, { color: PALETTE.gunmetal });
  for (const s of [-1, 1]) {
    f.box("satinBlack", u + s * 0.27, 0.72, n - 0.02, 0.05, 0.04, 0.34);
    f.box("metal", u + s * 0.27, 0.6, n + 0.08, 0.03, 0.2, 0.03, { color: PALETTE.gunmetal });
  }
  f.collider(u - 0.3, u + 0.3, 0, 1.0, n - 0.32, n + 0.3, "chair");
}

// Frame parallel to `f`, shifted `n` along its normal (to build on the face of a plate placed at n).
export function offsetFrame(f, n) {
  return new Frame(f.kit, f.pos(0, 0, n), f.U, f.V);
}

// Wall-mounted round pressure gauge (in a wall frame): bezel, dark face, emissive tick ring and needle.
export function gauge(frame, u, v, r = 0.18, opts = {}) {
  const { mat = "emitAmber", needle = 0.6 } = opts;
  frame.cylN("metal", u, v, 0.03, r, 0.06, { color: PALETTE.gunmetal, segments: 14 });
  frame.cylN("darkGloss", u, v, 0.061, r - 0.025, 0.004, { segments: 14 });
  frame.add(mat, new THREE.TorusGeometry(r - 0.045, 0.008, 4, 18), u, v, 0.066);
  // needle pivots about the dial centre: sweep runs from 7:30 (0) to 4:30 (1)
  const ang = Math.PI * 1.25 - needle * Math.PI * 1.5;
  const L = r - 0.07;
  frame.box(mat, u + (Math.cos(ang) * L) / 2, v + (Math.sin(ang) * L) / 2, 0.066, 0.012, L, 0.006, { spin: ang - Math.PI / 2 });
  frame.box("metal", u, v, 0.068, 0.03, 0.03, 0.01, { color: PALETTE.steel });
}

// Vertical stack of breaker levers on a wall frame at u, from v0 upward.
export function breakerColumn(frame, u, v0, count, opts = {}) {
  const { step = 0.16 } = opts;
  for (let i = 0; i < count; i++) {
    const v = v0 + i * step;
    const on = (i * 7) % 3 !== 0;
    frame.box("metal", u, v, 0.02, 0.09, 0.12, 0.04, { color: PALETTE.darkMetal });
    frame.box("painted", u, v + (on ? 0.02 : -0.02), 0.06, 0.04, 0.05, 0.05, { color: on ? PALETTE.orange : PALETTE.creamDark, uv: "keep" });
    frame.box(on ? "emitAmber" : "emitOrange", u + 0.035, v + 0.04, 0.041, 0.012, 0.012, 0.004);
  }
}

// Wheeled tool cart (orange drawer chest with a push handle and tools on top), yaw as in yawFrame.
export function toolCart(kit, x, y, z, yaw = 0, seed = 1) {
  const f = yawFrame(kit, x, y, z, yaw);
  f.box("painted", 0, 0.52, 0, 0.9, 0.72, 0.55, { color: PALETTE.orange, uv: "keep" });
  f.box("metal", 0, 0.9, 0, 0.96, 0.04, 0.62, { color: PALETTE.darkMetal, texel: 2 });
  for (let d = 0; d < 3; d++) {
    f.box("satinBlack", 0, 0.3 + d * 0.2, 0.278, 0.82, 0.16, 0.01);
    f.box("metal", 0, 0.3 + d * 0.2, 0.29, 0.5, 0.025, 0.02, { color: PALETTE.steel });
  }
  for (const [u, n] of [[-0.36, -0.2], [0.36, -0.2], [-0.36, 0.2], [0.36, 0.2]]) f.cylU("rubber", u, 0.08, n, 0.08, 0.06, { color: PALETTE.rubber, segments: 10 });
  f.cylV("metal", -0.52, 0.65, 0.22, 0.015, 0.7, { color: PALETTE.steel, segments: 6 });
  f.cylV("metal", -0.52, 0.65, -0.22, 0.015, 0.7, { color: PALETTE.steel, segments: 6 });
  f.cylU("metal", -0.52, 1.0, 0, 0.015, 0.02, { color: PALETTE.steel, segments: 6 });
  f.box("metal", -0.52, 1.0, 0, 0.03, 0.03, 0.46, { color: PALETTE.steel });
  const p = f.pos(0.05, 0.92, 0);
  toolCluster(kit, p.x, p.y, p.z, seed);
  f.collider(-0.6, 0.5, 0, 1.05, -0.32, 0.32, "cart");
}

// Small kit-bashed props for benches and carts: returns nothing, adds a cluster of tools at (x, y, z).
export function toolCluster(kit, x, y, z, seed = 1) {
  const items = [
    () => kit.box("metal", x - 0.25, y + 0.015, z + 0.05, 0.28, 0.03, 0.05, { color: PALETTE.steel }),
    () => kit.cyl("metal", x - 0.28, y + 0.03, z - 0.12, 0.03, 0.22, "x", { color: PALETTE.gunmetal, segments: 8 }),
    () => kit.box("painted", x + 0.15, y + 0.06, z - 0.08, 0.22, 0.12, 0.16, { color: PALETTE.orange, uv: "keep" }),
    () => kit.cyl("painted", x + 0.32, y + 0.09, z + 0.12, 0.04, 0.18, "y", { color: PALETTE.tealPaint, uv: "keep", segments: 10 }),
    () => kit.box("rubber", x + 0.02, y + 0.02, z + 0.16, 0.16, 0.04, 0.1, { color: PALETTE.rubber }),
    () => kit.box("metal", x - 0.05, y + 0.025, z - 0.2, 0.34, 0.05, 0.06, { color: PALETTE.gunmetal }),
    () => kit.cyl("metal", x + 0.3, y + 0.02, z - 0.16, 0.05, 0.04, "y", { color: PALETTE.steel, segments: 12 }),
  ];
  for (let i = 0; i < items.length; i++) if ((seed * 31 + i * 17) % 5 !== 0) items[i]();
}

// Matte painted floor line: lane markings are paint, not light (emissive strips bloom into flat bars).
export function paintStrip(kit, x0, z0, x1, z1, y, color = PALETTE.impAmber) {
  kit.boxMM("painted", [Math.min(x0, x1), y + 0.001, Math.min(z0, z1)], [Math.max(x0, x1), y + 0.007, Math.max(z0, z1)], { color, uv: "keep" });
}

// Rectangle outline of painted floor lines.
export function paintRect(kit, x0, z0, x1, z1, y, w = 0.1, color = PALETTE.impAmber) {
  paintStrip(kit, x0, z0, x1, z0 + w, y, color);
  paintStrip(kit, x0, z1 - w, x1, z1, y, color);
  paintStrip(kit, x0, z0, x0 + w, z1, y, color);
  paintStrip(kit, x1 - w, z0, x1, z1, y, color);
}

// Glowing tube in a housing along a wall frame at height v: a satin-black channel with a soft emissive
// tube under it and end caps. Reads as a light fitting washing the wall base instead of a flat bar.
export function wallBaseTube(frame, u0, u1, v = 0.42, mat = "emitWarmSoft") {
  const len = u1 - u0;
  if (len < 0.4) return;
  const uc = (u0 + u1) / 2;
  frame.box("satinBlack", uc, v, 0.07, len, 0.09, 0.14);
  frame.cylU(mat, uc, v - 0.04, 0.09, 0.022, len - 0.14, { segments: 8, uv: "keep" });
  frame.box("metal", u0 + 0.03, v - 0.01, 0.07, 0.06, 0.12, 0.15, { color: PALETTE.gunmetal });
  frame.box("metal", u1 - 0.03, v - 0.01, 0.07, 0.06, 0.12, 0.15, { color: PALETTE.gunmetal });
}

// Ceiling tube fitting hanging from yCeil at (x, z): housing, soft tube, two stems. Registers a warm
// (or given) practical below it. Light fittings this far below the ceiling never blow a disc onto it.
export function tubeFixture(kit, ctx, x, yCeil, z, len, axis = "x", opts = {}) {
  const { drop = 0.7, intensity = 20, distance = 12, color = 0xffd6a0, mat = "emitWarmSoft", family = "warm" } = opts;
  const y = yCeil - drop;
  const along = axis === "x";
  kit.box("satinBlack", x, y + 0.05, z, along ? len : 0.2, 0.1, along ? 0.2 : len);
  kit.cyl(mat, x, y - 0.01, z, 0.03, len - 0.16, axis, { segments: 8, uv: "keep" });
  for (const s of [-1, 1]) {
    const sx = along ? x + s * (len / 2 - 0.12) : x;
    const sz = along ? z : z + s * (len / 2 - 0.12);
    kit.box("metal", sx, y, sz, along ? 0.06 : 0.22, 0.12, along ? 0.22 : 0.06, { color: PALETTE.gunmetal });
    if (drop > 0.15) kit.cyl("metal", sx, (y + 0.1 + yCeil) / 2, sz, 0.014, yCeil - y - 0.1, "y", { color: PALETTE.steel, segments: 6 });
  }
  ctx.lights[family].push(pointLight(color, intensity, distance, [x, y - 0.25, z]));
}

// Rotating warning beacons: post-top amber domes in small cages whose glow sweeps (one cloned material
// per room, animated through ctx.dynamic). Call add() per beacon and finish() once.
export function beaconSet(kit, ctx, opts = {}) {
  const { color = "#ff9a3a", period = 1.6 } = opts;
  const mat = ctx.materials.emitOrange.clone();
  mat.emissive = new THREE.Color(color);
  mat.emissiveIntensity = 1.6;
  const domes = [];
  return {
    add(x, y, z, r = 0.09) {
      kit.cyl("metal", x, y - 0.05, z, r + 0.03, 0.06, "y", { color: PALETTE.gunmetal, segments: 10 });
      const g = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      g.translate(x, y - 0.02, z);
      domes.push(g);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        kit.box("metal", x + Math.cos(a) * (r + 0.02), y + 0.04, z + Math.sin(a) * (r + 0.02), 0.012, 0.14, 0.012, { color: PALETTE.gunmetal });
      }
      kit.cyl("metal", x, y + 0.11, z, r + 0.03, 0.02, "y", { color: PALETTE.gunmetal, segments: 10 });
    },
    finish() {
      if (!domes.length) return;
      const mesh = new THREE.Mesh(mergeGeometries(domes, false), mat);
      mesh.name = "beacons";
      let t = 0;
      ctx.dynamic.push({
        object: mesh,
        update(dt) {
          t += dt;
          const p = 0.5 + 0.5 * Math.sin((t / period) * Math.PI * 2);
          mat.emissiveIntensity = 0.35 + 1.9 * p * p;
        },
      });
    },
  };
}

// Retractable cable reel on the ceiling with its cable hanging down to yEnd and a tool head at the end
// (power feed / test lead hanging at eye level above a work area).
export function cableDrop(kit, x, yCeil, z, yEnd, opts = {}) {
  const { color = PALETTE.rubber, head = "plug", yaw = 0 } = opts;
  kit.box("paintedMetal", x, yCeil - 0.08, z, 0.36, 0.16, 0.2, { color: PALETTE.darkMetal, texel: 2 });
  kit.cyl("metal", x, yCeil - 0.3, z, 0.17, 0.14, "z", { color: PALETTE.gunmetal, segments: 14 });
  kit.add("rubber", new THREE.TorusGeometry(0.13, 0.035, 6, 16), { pos: [x, yCeil - 0.3, z], color, uv: "scale", uvScale: [4, 1] });
  kit.box("metal", x, yCeil - 0.5, z, 0.08, 0.06, 0.12, { color: PALETTE.darkMetal });
  kit.cyl("rubber", x, (yCeil - 0.52 + yEnd) / 2, z, 0.014, yCeil - 0.52 - yEnd, "y", { color, segments: 6 });
  const f = yawFrame(kit, x, yEnd, z, yaw);
  if (head === "plug") {
    f.box("satinBlack", 0, -0.1, 0, 0.09, 0.2, 0.09);
    f.box("metal", 0, -0.22, 0, 0.05, 0.05, 0.05, { color: PALETTE.steel });
    f.box("leds", 0, -0.08, 0.046, 0.05, 0.02, 0.004, { uv: "keep" });
  } else {
    // welding / diagnostic gun
    f.box("painted", 0, -0.1, 0, 0.08, 0.2, 0.12, { color: PALETTE.orange, uv: "keep" });
    f.box("metal", 0, -0.14, 0.12, 0.05, 0.05, 0.16, { color: PALETTE.gunmetal });
    f.box("satinBlack", 0, -0.24, -0.02, 0.05, 0.1, 0.06);
  }
}

// Cable reel: a spool of coiled cable on an A-frame stand, axis along the frame's U.
export function cableReel(kit, x, y, z, yaw = 0, opts = {}) {
  const { r = 0.55, w = 0.5, color = PALETTE.orange, cable = PALETTE.rubber } = opts;
  const f = yawFrame(kit, x, y, z, yaw);
  for (const s of [-1, 1]) {
    f.cylU("painted", s * (w / 2 + 0.02), r + 0.1, 0, r, 0.04, { color, uv: "keep", segments: 20 });
    f.box("metal", s * (w / 2 + 0.06), (r + 0.1) / 2, 0, 0.05, r + 0.1, 0.4, { color: PALETTE.gunmetal, texel: 2 });
    f.box("metal", s * (w / 2 + 0.06), 0.04, 0, 0.06, 0.08, 0.7, { color: PALETTE.darkMetal, texel: 2 });
  }
  f.cylU("metal", 0, r + 0.1, 0, 0.05, w + 0.3, { color: PALETTE.steel, segments: 8 });
  f.cylU("rubber", 0, r + 0.1, 0, r * 0.72, w - 0.02, { color: cable, segments: 16 });
  f.box("metal", 0, r + 0.1, 0, w + 0.14, 0.03, 0.03, { color: PALETTE.steel });
  f.collider(-w / 2 - 0.1, w / 2 + 0.1, 0, 2 * r + 0.15, -r - 0.05, r + 0.05, "reel");
}

// Portable welding screen: two feet, a tube frame and a dark-orange fabric panel, facing yaw.
export function weldingScreen(kit, x, y, z, yaw = 0, opts = {}) {
  const { w = 1.9, h = 1.8 } = opts;
  const f = yawFrame(kit, x, y, z, yaw);
  for (const s of [-1, 1]) {
    f.box("metal", s * (w / 2 - 0.05), 0.04, 0, 0.06, 0.08, 0.7, { color: PALETTE.darkMetal, texel: 2 });
    f.cylV("metal", s * (w / 2 - 0.05), 0.1 + h / 2, 0, 0.02, h, { color: PALETTE.steel, segments: 6 });
    for (const n of [-0.3, 0.3]) f.cylU("rubber", s * (w / 2 - 0.05), 0.03, n, 0.03, 0.06, { color: PALETTE.rubber, segments: 8 });
  }
  f.cylU("metal", 0, 0.1 + h, 0, 0.02, w, { color: PALETTE.steel, segments: 6 });
  f.box("fabric", 0, 0.16 + h / 2, 0, w - 0.14, h - 0.1, 0.02, { color: PALETTE.fabricOrange, texel: 1 });
  f.collider(-w / 2, w / 2, 0, h + 0.1, -0.35, 0.35, "screen");
}

// Low parts tray / pallet with a load of small parts, facing yaw.
export function partsTray(kit, x, y, z, yaw = 0, seed = 1) {
  const f = yawFrame(kit, x, y, z, yaw);
  f.box("paintedMetal", 0, 0.08, 0, 1.3, 0.16, 0.9, { color: PALETTE.gunmetal, texel: 2 });
  f.box("metal", 0, 0.18, 0, 1.34, 0.04, 0.94, { color: PALETTE.steel, texel: 2 });
  for (const s of [-1, 1]) f.box("painted", 0, 0.2, s * 0.44, 1.3, 0.12, 0.03, { color: PALETTE.orange, uv: "keep" });
  for (const s of [-1, 1]) f.box("painted", s * 0.64, 0.2, 0, 0.03, 0.12, 0.9, { color: PALETTE.orange, uv: "keep" });
  const items = [
    () => f.cylU("metal", -0.3, 0.32, 0.1, 0.11, 0.6, { color: PALETTE.steel, segments: 12 }),
    () => f.box("metal", 0.3, 0.3, -0.2, 0.5, 0.2, 0.3, { color: PALETTE.darkMetal, texel: 2 }),
    () => f.cylV("metal", 0.4, 0.34, 0.25, 0.14, 0.28, { color: PALETTE.gunmetal, segments: 12 }),
    () => f.box("painted", -0.35, 0.28, -0.25, 0.4, 0.14, 0.24, { color: PALETTE.tealPaint, uv: "keep" }),
    () => f.add("metal", new THREE.TorusGeometry(0.2, 0.04, 6, 16), 0.05, 0.25, 0.28, { color: PALETTE.steel, uv: "scale", uvScale: [4, 1] }),
    () => f.box("rubber", 0.0, 0.26, 0.0, 0.3, 0.1, 0.2, { color: PALETTE.rubber }),
  ];
  for (let i = 0; i < items.length; i++) if ((seed * 13 + i * 7) % 4 !== 0) items[i]();
  f.collider(-0.68, 0.68, 0, 0.5, -0.48, 0.48, "tray");
}

// Wall-mounted tool board in a wall frame: satin-black pegboard with hooks and a row of hanging tools.
export function toolBoard(frame, u, v, w = 1.6, h = 1.1, seed = 1) {
  frame.box("satinBlack", u, v, 0.03, w, h, 0.05);
  frame.box("metal", u, v + h / 2 - 0.02, 0.04, w, 0.04, 0.07, { color: PALETTE.steel });
  const n = Math.max(3, Math.round(w / 0.24));
  for (let k = 0; k < n; k++) {
    const tu = u - w / 2 + 0.14 + k * ((w - 0.28) / (n - 1));
    const kind = (k * 5 + seed) % 4;
    frame.box("metal", tu, v + h / 2 - 0.1, 0.07, 0.1, 0.02, 0.04, { color: PALETTE.gunmetal });
    if (kind === 0) frame.box("metal", tu, v + 0.1, 0.075, 0.04, 0.6, 0.03, { color: PALETTE.steel });
    else if (kind === 1) {
      frame.box("painted", tu, v + 0.2, 0.08, 0.06, 0.34, 0.05, { color: PALETTE.orange, uv: "keep" });
      frame.cylV("metal", tu, -0.06 + v, 0.08, 0.012, 0.2, { color: PALETTE.steel, segments: 6 });
    } else if (kind === 2) {
      frame.cylV("metal", tu, v + 0.12, 0.08, 0.02, 0.5, { color: PALETTE.steel, segments: 6 });
      frame.box("metal", tu, v + 0.36, 0.08, 0.1, 0.05, 0.05, { color: PALETTE.gunmetal });
    } else frame.add("rubber", new THREE.TorusGeometry(0.12, 0.014, 6, 14), tu, v + 0.22, 0.08, { color: PALETTE.rubber, uv: "scale", uvScale: [4, 1] });
  }
  frame.add("decal", new THREE.PlaneGeometry(0.24, 0.24), u + w / 2 - 0.2, v - h / 2 + 0.2, 0.06, { uv: "keep", uvRect: decalRect([6, 14, 9][seed % 3]) });
}

// ---------------------------------------------------------------- contained energy beams (reactor core, drive core)
// 1 x n greyscale texture: a base level with `bands` soft bright bands per repeat. Periodic, so scrolling
// its offset moves the bands along the beam without a seam.
export function bandTexture(bands = 6, base = 0.5, peak = 1.0, width = 0.18, n = 256) {
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const ph = ((i + 0.5) / n) * bands;
    const d = Math.abs(ph - Math.round(ph)) * 2; // 0 at a band centre, 1 midway between bands
    const e = base + (peak - base) * Math.exp(-(d * d) / (2 * width * width));
    const b = Math.round(Math.min(1, Math.max(0, e)) * 255);
    data[i * 4] = b;
    data[i * 4 + 1] = b;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 1, n, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Open vertical cylinder whose v coordinate is height above `origin` over `period` metres, so a band
// texture runs continuously up the beam (and across several stacked pieces) instead of restarting per piece.
export function beamGeometry(cx, yBottom, cz, r, height, period, segments = 40, origin = yBottom) {
  const g = new THREE.CylinderGeometry(r, r, height, segments, 1, true);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, (pos.getY(i) + height / 2 + yBottom - origin) / period);
  g.translate(cx, yBottom + height / 2, cz);
  return g;
}

// Emissive material for a beam: `color` at `intensity`, modulated by a band texture that a dynamic
// updater scrolls upward at `speed` metres per second (call `mat.userData.scroll(dt)`).
export function beamMaterial(ctx, color, intensity, tex, period, speed, opts = {}) {
  const mat = ctx.materials.emitWhite.clone();
  mat.color = new THREE.Color(0x000000);
  mat.emissive = new THREE.Color(color);
  mat.emissiveIntensity = intensity;
  mat.emissiveMap = tex;
  mat.roughness = 1;
  if (opts.opacity !== undefined) {
    mat.transparent = true;
    mat.opacity = opts.opacity;
    mat.depthWrite = false;
  }
  mat.userData.base = intensity;
  mat.userData.scroll = (dt) => {
    tex.offset.y -= (dt * speed) / period;
    if (tex.offset.y < -1) tex.offset.y += 1;
  };
  return mat;
}
