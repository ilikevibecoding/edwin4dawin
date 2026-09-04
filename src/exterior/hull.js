// Exterior hull: the wedge (dorsal / ventral plateaus, bevels, trench, stern face), thousands of
// instanced armour plates laid out hierarchically (radiating column seams that branch as the hull
// widens, staggered rows, irregular sub-plates, recessed groove lines) chunked along z for LOD +
// culling, the ventral hangar module with its bay opening, and the reactor bulb.
// Greebles / hatches / trench machinery live in details.js and are placed on the plate anchors
// this module exports.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { rng, setVertexColor } from "../kit.js";
import { vnoise } from "../textures.js";
import { HULL, halfWidth, dorsalH, ventralH, CHUNKS, chunkIndex, chunkCenterZ, HANGAR, REACTOR, CITY } from "./dims.js";
import { instancedMesh, frameItem, grey } from "./batch.js";
import { ensureExtMaterials } from "./exttex.js";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _ex = new THREE.Vector3();
const _ez = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Non-indexed flat-shaded geometry from a list of triangles (arrays of [x,y,z]). */
function trisToGeometry(tris, uvScale = 0.02) {
  const pos = new Float32Array(tris.length * 9);
  const uv = new Float32Array(tris.length * 6);
  let i = 0;
  let j = 0;
  for (const t of tris) {
    for (const p of t) {
      pos[i++] = p[0];
      pos[i++] = p[1];
      pos[i++] = p[2];
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // planar UVs from the dominant normal axis
  const n = g.attributes.normal;
  for (let k = 0; k < pos.length / 3; k++) {
    const nx = Math.abs(n.getX(k));
    const ny = Math.abs(n.getY(k));
    const nz = Math.abs(n.getZ(k));
    const x = pos[k * 3];
    const y = pos[k * 3 + 1];
    const z = pos[k * 3 + 2];
    let u, v;
    if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else if (nx >= nz) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[j++] = u * uvScale;
    uv[j++] = v * uvScale;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function quad(a, b, c, d) {
  return [
    [a, b, c],
    [a, c, d],
  ];
}

/**
 * Base skin surfaces. side = +1 dorsal, -1 ventral. Returns { plateau, bevel, lip } geometries.
 * The ventral plateau gets a rectangular hole for the hangar module.
 */
function buildSkin(side, rows = 52) {
  const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
  const T = HULL.trenchHalf;
  const tris = [];
  const bevel = [];
  const lips = [];
  const zs = [];
  for (let i = 0; i <= rows; i++) zs.push(HULL.bowZ + ((HULL.sternZ - HULL.bowZ) * i) / rows);
  const H = (z) => (side > 0 ? dorsalH(z) : ventralH(z));
  for (let i = 0; i < rows; i++) {
    const z0 = zs[i];
    const z1 = zs[i + 1];
    const w0 = halfWidth(z0);
    const w1 = halfWidth(z1);
    const y0 = side * H(z0);
    const y1 = side * H(z1);
    // plateau strip (skipping the hangar module footprint on the ventral side — handled as a hole below)
    const hole = side < 0 && z1 > HANGAR.module.z0 && z0 < HANGAR.module.z1;
    if (!hole) {
      const t = quad([-sp * w0, y0, z0], [sp * w0, y0, z0], [sp * w1, y1, z1], [-sp * w1, y1, z1]);
      tris.push(...(side > 0 ? t.map((tr) => [tr[0], tr[2], tr[1]]) : t));
    } else {
      // two side strips beside the module footprint
      const hx = HANGAR.module.x;
      for (const s of [-1, 1]) {
        const a0 = s * hx;
        const b0 = s * sp * w0;
        const a1 = s * hx;
        const b1 = s * sp * w1;
        const t = s > 0 ? quad([a0, y0, z0], [b0, y0, z0], [b1, y1, z1], [a1, y1, z1]) : quad([b0, y0, z0], [a0, y0, z0], [a1, y1, z1], [b1, y1, z1]);
        tris.push(...(side > 0 ? t.map((tr) => [tr[0], tr[2], tr[1]]) : t));
      }
    }
    // bevels both sides: plateau edge -> trench lip (at y = ±T, x = w - inset)
    for (const s of [-1, 1]) {
      const ins = HULL.trenchInset;
      const t = quad([s * sp * w0, y0, z0], [s * (w0 - ins), side * T, z0], [s * (w1 - ins), side * T, z1], [s * sp * w1, y1, z1]);
      // winding so normals point outward (up for dorsal, down for ventral); flip for -x / ventral
      const flip = (s > 0) === (side > 0);
      bevel.push(...(flip ? t.map((tr) => [tr[0], tr[2], tr[1]]) : t));
      // lip: horizontal ledge from the bevel edge outward to the trench wall face line (small overhang)
      const l = quad([s * (w0 - ins), side * T, z0], [s * (w0 + 1.5), side * T, z0], [s * (w1 + 1.5), side * T, z1], [s * (w1 - ins), side * T, z1]);
      lips.push(...(flip ? l.map((tr) => [tr[0], tr[2], tr[1]]) : l));
    }
  }
  return { plateau: trisToGeometry(tris, 0.02), bevel: trisToGeometry(bevel, 0.02), lip: trisToGeometry(lips, 0.05) };
}

/** Trench wall: vertical band at x = ±(w - inset) between y = -T and +T, plus the stern face. */
function buildTrenchAndStern(rows = 52) {
  const T = HULL.trenchHalf;
  const ins = HULL.trenchInset;
  const tris = [];
  for (let i = 0; i < rows; i++) {
    const z0 = HULL.bowZ + ((HULL.sternZ - HULL.bowZ) * i) / rows;
    const z1 = HULL.bowZ + ((HULL.sternZ - HULL.bowZ) * (i + 1)) / rows;
    const w0 = halfWidth(z0) - ins;
    const w1 = halfWidth(z1) - ins;
    for (const s of [-1, 1]) {
      const t = quad([s * w0, -T, z0], [s * w0, T, z0], [s * w1, T, z1], [s * w1, -T, z1]);
      tris.push(...(s > 0 ? t : t.map((tr) => [tr[0], tr[2], tr[1]])));
    }
  }
  // stern face: polygon through the cross-section at z = sternZ
  const z = HULL.sternZ;
  const w = halfWidth(z);
  const pts = [
    [-HULL.plateauDorsal * w, dorsalH(z)],
    [HULL.plateauDorsal * w, dorsalH(z)],
    [w - ins, T],
    [w - ins, -T],
    [HULL.plateauVentral * w, -ventralH(z)],
    [-HULL.plateauVentral * w, -ventralH(z)],
    [-(w - ins), -T],
    [-(w - ins), T],
  ];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const stern = new THREE.ShapeGeometry(shape);
  stern.translate(0, 0, z);
  const nonIdx = stern.index ? stern.toNonIndexed() : stern;
  const p = nonIdx.attributes.position;
  nonIdx.computeVertexNormals();
  // world UVs for the stern
  const uv = nonIdx.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 0.02, p.getY(i) * 0.02);
  return { trench: trisToGeometry(tris, 0.05), stern: nonIdx };
}

// ---------------------------------------------------------------------------
// Parametric skin surfaces used by the plating: u ∈ [0,1] across, z along.
// part: "plateau" (u = 0 port edge → 1 starboard edge), "bevelL" / "bevelR" (u = 0 plateau crease →
// 1 trench lip). `width(z)` is the physical extent across at z; `at(u, z)` the surface point.
// ---------------------------------------------------------------------------
export function makeSurface(side, part) {
  const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
  const T = HULL.trenchHalf;
  const Hf = side > 0 ? dorsalH : ventralH;
  const s = part === "bevelL" ? -1 : 1;
  const isPlateau = part === "plateau";
  return {
    side,
    part,
    isPlateau,
    s,
    sp,
    /** Plates whose centre falls in the hangar module, reactor bulb or city footprint are skipped. */
    skip(x, z) {
      if (isPlateau && side < 0) {
        if (Math.abs(x) < HANGAR.module.x + 1 && z > HANGAR.module.z0 - 2 && z < HANGAR.module.z1 + 2) return true;
        if (Math.hypot(x, z - REACTOR.z) < REACTOR.r * 0.8) return true;
      }
      if (isPlateau && side > 0 && z > CITY.z0 && z < CITY.z1) {
        const t0 = CITY.tiers[0];
        const hw = t0.hw0 + ((t0.hw1 - t0.hw0) * (z - t0.zs)) / (t0.ze - t0.zs);
        if (Math.abs(x) < hw + 1) return true;
      }
      return false;
    },
    at(u, z, out) {
      const w = halfWidth(z);
      const H = Hf(z);
      if (isPlateau) return out.set((2 * u - 1) * sp * w, side * H, z);
      const x0 = s * sp * w;
      const x1 = s * (w - HULL.trenchInset);
      return out.set(x0 + (x1 - x0) * u, side * (H - (H - T) * u), z);
    },
    width(z) {
      const w = halfWidth(z);
      if (isPlateau) return 2 * sp * w;
      return Math.hypot((1 - sp) * w - HULL.trenchInset, Hf(z) - T);
    },
    hint: isPlateau ? new THREE.Vector3(0, side, 0) : new THREE.Vector3(s * 0.7, side, 0),
  };
}

/** Region-based paint tone: bow slightly lighter, stern / engine zone darker, soot toward the trench. */
export function regionTone(x, z, side, isPlateau, u) {
  const t = (z - HULL.bowZ) / HULL.length;
  let k = 0.83 + 0.05 * (1 - t) * (1 - t) - 0.075 * smoothstep(0.7, 1, t);
  if (!isPlateau) k -= 0.05 * u * u;
  // large weather patches (hundreds of metres), a few percent
  k *= 1 + (vnoise((z - HULL.bowZ) / 1600, (x + 500) / 1000, 7, 31) - 0.5) * 0.06;
  if (side < 0) k *= 0.97;
  return k;
}

/**
 * Hierarchical plating over one parametric surface. Columns form a binary tree in u: a column splits
 * (with a jittered ratio) at the z where its physical width exceeds `maxW`, so the seams radiate from
 * the bow and branch as the hull widens. Rows along z are staggered per column, each panel is cut
 * into 1-4 sub-plates with thin seams, a few plates are raised or replaced. Emits per-chunk plate
 * instances, groove (major seam) instances and plate anchors for the detail pass.
 */
export function platingFor(surf, rand, out, { maxW = 32, thickness = 2.0, embed = 0.5, zStart = HULL.bowZ + 1, zEnd = HULL.sternZ - 0.5, bucket = chunkIndex, grooveDepth = 2, toneScale = 1 } = {}) {
  const zSplitFor = (du) => {
    if (du * surf.width(zEnd) <= maxW) return Infinity;
    let a = zStart;
    let b = zEnd;
    for (let i = 0; i < 28; i++) {
      const mid = (a + b) / 2;
      if (du * surf.width(mid) > maxW) b = mid;
      else a = mid;
    }
    return (a + b) / 2;
  };
  // seam half-widths (metres) by boundary depth: surface edges, major grooves, secondary, minor
  const seamHalf = (depth, isEdge) => (isEdge ? 0.7 : depth <= grooveDepth ? 1.2 : depth <= grooveDepth + 2 ? 0.5 : 0.35);

  const skip = (x, z, halfW) => halfW < 1.2 || (surf.skip ? surf.skip(x, z) : false);

  // one sub-plate → instance + anchor
  const emitPlate = (ua, ub, za, zb, insetL, insetR, insetA, insetB, panel) => {
    const uc = (ua + ub) / 2;
    const zc = (za + zb) / 2;
    surf.at(ua, zc, _a);
    surf.at(ub, zc, _b);
    _ex.subVectors(_b, _a);
    const fullW = _ex.length();
    const w = fullW - insetL - insetR;
    if (w < 1.5) return;
    _ex.divideScalar(fullW);
    surf.at(uc, zb, _b);
    surf.at(uc, za, _a);
    _ez.subVectors(_b, _a);
    const fullL = _ez.length();
    const l = fullL - insetA - insetB;
    if (l < 1.5) return;
    _ez.divideScalar(fullL);
    _n.crossVectors(_ez, _ex).normalize();
    if (_n.dot(surf.hint) < 0) _n.negate();
    surf.at(uc, zc, _c);
    // shift the centre for asymmetric insets
    _c.addScaledVector(_ex, (insetL - insetR) / 2).addScaledVector(_ez, (insetA - insetB) / 2);
    if (skip(_c.x, _c.z, w / 2)) return;
    const r = rand();
    const raised = r < 0.045;
    const missing = r > 0.995;
    if (missing) return;
    const th = raised ? thickness * 1.7 : thickness * (0.88 + rand() * 0.24);
    const top = _c.clone().addScaledVector(_n, th - embed);
    _c.addScaledVector(_n, th / 2 - embed);
    // tone: region × panel batch × sub-plate × replacement
    let k = panel.tone * (1 + (rand() - 0.5) * 0.03);
    const rr = rand();
    if (rr < 0.025) k *= 1.09; // fresh replacement plate
    else if (rr < 0.045) k *= 0.86; // primered / darker plate
    if (raised) k *= 0.97;
    const c = grey(k, 1.02);
    // texture variety: flip half the plates 180° about the normal
    const flip = rand() < 0.5 ? -1 : 1;
    const ax = flip < 0 ? _ex.clone().negate() : _ex.clone();
    const az = flip < 0 ? _ez.clone().negate() : _ez.clone();
    const ci = bucket(_c.z);
    // worn (scratched / sooted) plates concentrate toward the stern and the trench edge
    const tz = (_c.z - HULL.bowZ) / HULL.length;
    const pWorn = 0.14 + 0.3 * smoothstep(0.45, 1, tz) + (surf.isPlateau ? 0 : 0.25 * uc);
    const list = out[ci].worn && rand() < pWorn ? out[ci].worn : out[ci].plates;
    list.push(frameItem(_c, ax, _n, az, w, th, l, c));
    out[ci].anchors.push({ p: top, X: _ex.clone(), Y: _n.clone(), Z: _ez.clone(), w, l, side: surf.side, part: surf.part, isPlateau: surf.isPlateau, u: uc, z: zc, tone: k, raised, depth: panel.depth });
  };

  const emitPanel = (panel) => {
    const { u0, u1, z0, z1, dL, dR } = panel;
    const zc = (z0 + z1) / 2;
    const W = (u1 - u0) * surf.width(zc);
    const L = z1 - z0;
    if (W < 2 || L < 2) return;
    surf.at((u0 + u1) / 2, zc, _c);
    panel.tone = toneScale * regionTone(_c.x, _c.z, surf.side, surf.isPlateau, (u0 + u1) / 2) * (1 + (rand() - 0.5) * 0.05);
    const isEdgeL = u0 <= 0;
    const isEdgeR = u1 >= 1;
    const sL = seamHalf(dL, isEdgeL);
    const sR = seamHalf(dR, isEdgeR);
    const rowSeam = 0.35;
    const subSeam = 0.12;
    // sub-plate pattern
    let nu = W > 15 && rand() < 0.75 ? 2 : 1;
    let nz = L > 24 ? (rand() < 0.5 ? 3 : 2) : L > 13 ? (rand() < 0.7 ? 2 : 1) : 1;
    if (nu * nz === 1 && W > 9 && L > 9) {
      if (rand() < 0.5 && W > 9) nu = 2;
      else nz = 2;
    }
    const uCuts = [u0];
    for (let i = 1; i < nu; i++) uCuts.push(u0 + (u1 - u0) * (i / nu + (rand() - 0.5) * 0.24));
    uCuts.push(u1);
    const zCuts = [z0];
    for (let i = 1; i < nz; i++) zCuts.push(z0 + L * (i / nz + (rand() - 0.5) * 0.2));
    zCuts.push(z1);
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nz; j++) {
        const insetL = i === 0 ? sL : subSeam;
        const insetR = i === nu - 1 ? sR : subSeam;
        const insetA = j === 0 ? rowSeam : subSeam;
        const insetB = j === nz - 1 ? rowSeam : subSeam;
        emitPlate(uCuts[i], uCuts[i + 1], zCuts[j], zCuts[j + 1], insetL, insetR, insetA, insetB, panel);
      }
    }
  };

  const emitRows = (u0, u1, dL, dR, depth, z0, z1) => {
    const rowLen = 18 + rand() * 12;
    const cuts = [z0];
    let z = z0 + 7 + rand() * (rowLen - 7);
    while (z < z1 - 7) {
      cuts.push(z);
      z += rowLen * (0.85 + rand() * 0.3);
    }
    cuts.push(z1);
    for (let i = 0; i < cuts.length - 1; i++) emitPanel({ u0, u1, z0: cuts[i], z1: cuts[i + 1], dL, dR, depth });
  };

  // recessed groove along a major seam (boundary u) over z0..z1, split at chunk boundaries
  const emitGroove = (u, z0, z1) => {
    const step = (HULL.sternZ - HULL.bowZ) / CHUNKS;
    let za = z0;
    while (za < z1 - 1) {
      const ci = bucket(za + 0.5);
      const zb = bucket === chunkIndex ? Math.min(z1, HULL.bowZ + (chunkIndex(za + 0.5) + 1) * step) : z1;
      const zm = (za + zb) / 2;
      surf.at(u, zb, _b);
      surf.at(u, za, _a);
      _ez.subVectors(_b, _a);
      const len = _ez.length();
      _ez.divideScalar(len);
      surf.at(Math.min(1, u + 0.01), zm, _b);
      surf.at(Math.max(0, u - 0.01), zm, _a);
      _ex.subVectors(_b, _a).normalize();
      _n.crossVectors(_ez, _ex).normalize();
      if (_n.dot(surf.hint) < 0) _n.negate();
      surf.at(u, zm, _c).addScaledVector(_n, 0.12 - 0.25);
      out[ci].grooves.push(frameItem(_c, _ex.clone(), _n.clone(), _ez.clone(), 1.7, 0.5, len, grey(0.16, 1.05)));
      za = zb;
    }
  };

  const rec = (u0, u1, dL, dR, depth, z0) => {
    const du = u1 - u0;
    const zs = zSplitFor(du);
    const zLeafEnd = Math.min(zs, zEnd);
    if (zLeafEnd > z0 + 3) emitRows(u0, u1, dL, dR, depth, z0, zLeafEnd);
    if (zs < zEnd) {
      const um = u0 + du * (0.44 + rand() * 0.12);
      rec(u0, um, dL, depth + 1, depth + 1, zs);
      rec(um, u1, depth + 1, dR, depth + 1, zs);
      if (depth + 1 <= grooveDepth) emitGroove(um, zs, zEnd);
    }
  };
  rec(0, 1, 0, 0, 0, zStart);
}

/** Ventral hangar module: a box hanging under the ventral plateau with the bay opening in its floor. */
function buildHangarModule(materials) {
  const g = new THREE.Group();
  g.name = "hangarModule";
  const m = HANGAR.module;
  const o = HANGAR.opening;
  const yTop = -ventralH(m.z0) + 0.5; // sits just inside the plateau
  const yBot = m.bottomY;
  // floor plate with the opening: extruded rectangle with a hole (in XZ)
  const shape = new THREE.Shape([new THREE.Vector2(-m.x, m.z0), new THREE.Vector2(m.x, m.z0), new THREE.Vector2(m.x, m.z1), new THREE.Vector2(-m.x, m.z1)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-o.x, o.z0), new THREE.Vector2(-o.x, o.z1), new THREE.Vector2(o.x, o.z1), new THREE.Vector2(o.x, o.z0)]));
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
  // extrude is along +z in shape space; rotate so the shape lies in XZ with thickness along -Y
  plate.rotateX(Math.PI / 2);
  plate.translate(0, yBot + 1.2, 0);
  const uv = plate.attributes.uv;
  const pos = plate.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * 0.02, pos.getZ(i) * 0.02);
  const floor = new THREE.Mesh(plate, materials.hull);
  setVertexColor(plate, PALETTE.hullGrey);
  floor.castShadow = true;
  floor.receiveShadow = true;
  g.add(floor);
  // side walls of the module (from the plateau down to the bottom)
  const wallH = yTop - yBot;
  const wallY = (yTop + yBot) / 2;
  const walls = [
    new THREE.BoxGeometry(2 * m.x + 2, wallH, 2).translate(0, wallY, m.z0 - 1),
    new THREE.BoxGeometry(2 * m.x + 2, wallH, 2).translate(0, wallY, m.z1 + 1),
    new THREE.BoxGeometry(2, wallH, m.z1 - m.z0 + 4).translate(-m.x - 1, wallY, (m.z0 + m.z1) / 2),
    new THREE.BoxGeometry(2, wallH, m.z1 - m.z0 + 4).translate(m.x + 1, wallY, (m.z0 + m.z1) / 2),
  ];
  for (const wgeo of walls) {
    setVertexColor(wgeo, PALETTE.hullDark);
    const mesh = new THREE.Mesh(wgeo, materials.hullDark);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  // opening rim: hazard-lit lip + bay-door rails (doors themselves belong to the hangar interior)
  const rim = new THREE.Group();
  for (const [x0, z0, x1, z1] of [
    [-o.x - 3, o.z0 - 3, o.x + 3, o.z0],
    [-o.x - 3, o.z1, o.x + 3, o.z1 + 3],
    [-o.x - 3, o.z0, -o.x, o.z1],
    [o.x, o.z0, o.x + 3, o.z1],
  ]) {
    const bg = new THREE.BoxGeometry(x1 - x0, 1.6, z1 - z0).translate((x0 + x1) / 2, yBot - 0.8, (z0 + z1) / 2);
    setVertexColor(bg, PALETTE.hullBlack);
    rim.add(new THREE.Mesh(bg, materials.hullDark));
  }
  // running lights around the rim
  const lights = [];
  for (let z = o.z0 + 3; z < o.z1; z += 6) for (const s of [-1, 1]) lights.push([s * (o.x + 1.5), yBot - 1.7, z]);
  for (let x = -o.x + 3; x < o.x; x += 6) for (const s of [-1, 1]) lights.push([x, yBot - 1.7, s > 0 ? o.z1 + 1.5 : o.z0 - 1.5]);
  const lg = new THREE.BoxGeometry(1.2, 0.3, 1.2);
  const lm = new THREE.InstancedMesh(lg, materials.exteriorRed, lights.length);
  lights.forEach((p, i) => lm.setMatrixAt(i, _m.compose(_v.set(...p), _q.identity(), _s.set(1, 1, 1))));
  lm.instanceMatrix.needsUpdate = true;
  rim.add(lm);
  g.add(rim);
  return g;
}

/** Reactor bulb under the ventral plateau with its equatorial band, ribs and vent ports. */
function buildReactor(materials, group) {
  const yTop = -ventralH(REACTOR.z);
  const geo = new THREE.SphereGeometry(REACTOR.r, 48, 32);
  setVertexColor(geo, PALETTE.hullGrey.clone().multiplyScalar(0.92));
  const bulb = new THREE.Mesh(geo, materials.hull);
  bulb.position.set(REACTOR.x, yTop - REACTOR.r * 0.45, REACTOR.z);
  bulb.castShadow = true;
  bulb.receiveShadow = true;
  bulb.name = "reactorBulb";
  group.add(bulb);
  const band = new THREE.CylinderGeometry(REACTOR.r * 0.985, REACTOR.r * 0.985, 6, 48, 1, true);
  setVertexColor(band, PALETTE.hullBlack);
  const bandMesh = new THREE.Mesh(band, materials.cityDense);
  bandMesh.position.copy(bulb.position);
  bandMesh.position.y -= REACTOR.r * 0.1;
  group.add(bandMesh);
  // meridian ribs + ring of vent ports (instanced boxes in the bulb's local frame)
  const items = [];
  const cy = bulb.position.y;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    // rib: a thin box tangent to the sphere at the equator-ish latitude, leaning outward
    const lat = -0.55;
    const rr = REACTOR.r * Math.cos(lat);
    const yy = cy + REACTOR.r * Math.sin(lat);
    _v.set(REACTOR.x + Math.cos(a) * rr, yy, REACTOR.z + Math.sin(a) * rr);
    _q.setFromEuler(new THREE.Euler(0, -a, 0));
    _s.set(2.2, 26, 1.6);
    items.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.5) });
    const lat2 = -0.2;
    const r2 = REACTOR.r * Math.cos(lat2) + 0.4;
    _v.set(REACTOR.x + Math.cos(a + 0.26) * r2, cy + REACTOR.r * Math.sin(lat2), REACTOR.z + Math.sin(a + 0.26) * r2);
    _q.setFromEuler(new THREE.Euler(0, -a - 0.26, 0));
    _s.set(1.4, 5, 7);
    items.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.22) });
  }
  const rm = instancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.hullDark, items, { name: "reactorDetail" });
  group.add(rm);
}

export function buildHull(materials) {
  const group = new THREE.Group();
  group.name = "hull";
  const rand = rng(4242);

  // --- base skins (dark recessed surface that shows through the seams)
  const baseTone = PALETTE.hullGrey.clone().multiplyScalar(0.68);
  for (const side of [1, -1]) {
    const { plateau, bevel, lip } = buildSkin(side);
    for (const [geo, mat, col] of [
      [plateau, materials.hullDark, baseTone],
      [bevel, materials.hullDark, baseTone],
      [lip, materials.hullDark, PALETTE.hullBlack],
    ]) {
      setVertexColor(geo, col);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = (side > 0 ? "dorsal_" : "ventral_") + (geo === plateau ? "plateau" : geo === bevel ? "bevel" : "lip");
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  const { trench, stern } = buildTrenchAndStern();
  setVertexColor(trench, PALETTE.hullBlack);
  const trenchMesh = new THREE.Mesh(trench, materials.cityDense);
  trenchMesh.name = "trench";
  trenchMesh.receiveShadow = true;
  group.add(trenchMesh);
  setVertexColor(stern, PALETTE.hullDark.clone().multiplyScalar(0.8));
  const sternMesh = new THREE.Mesh(stern, materials.hullDark);
  sternMesh.name = "stern";
  sternMesh.castShadow = true;
  sternMesh.receiveShadow = true;
  group.add(sternMesh);

  // --- hierarchical plating per chunk (clean plates on the shared hull sets, worn plates on ext_hullWorn)
  ensureExtMaterials(materials);
  const chunks = Array.from({ length: CHUNKS }, () => ({ plates: [], worn: [], grooves: [], anchors: [] }));
  const surfaces = [];
  for (const side of [1, -1]) {
    for (const part of ["plateau", "bevelL", "bevelR"]) {
      const surf = makeSurface(side, part);
      surfaces.push(surf);
      platingFor(surf, rand, chunks, { maxW: part === "plateau" ? 32 : 28, thickness: side > 0 ? 2.0 : 1.8 });
    }
  }
  const plateGeo = new THREE.BoxGeometry(1, 1, 1);
  setVertexColor(plateGeo, 0xffffff);
  const chunkGroups = [];
  let plateCount = 0;
  for (let i = 0; i < CHUNKS; i++) {
    const cg = new THREE.Group();
    cg.name = "chunk_" + i;
    cg.userData.centerZ = chunkCenterZ(i);
    const pm = instancedMesh(plateGeo, i % 2 ? materials.hull2 : materials.hull, chunks[i].plates, { castShadow: true, name: "plates", lod: 1 });
    cg.add(pm);
    if (chunks[i].worn.length) cg.add(instancedMesh(plateGeo, materials.ext_hullWorn, chunks[i].worn, { name: "platesWorn", lod: 1 }));
    if (chunks[i].grooves.length) cg.add(instancedMesh(plateGeo, materials.hullDark, chunks[i].grooves, { name: "grooves", lod: 1 }));
    plateCount += chunks[i].plates.length + chunks[i].worn.length;
    group.add(cg);
    chunkGroups.push(cg);
  }

  // --- hangar module + reactor bulb
  group.add(buildHangarModule(materials));
  buildReactor(materials, group);

  return { group, chunkGroups, surfaces, anchors: chunks.map((c) => c.anchors), stats: { plates: plateCount, greebles: 0 } };
}
