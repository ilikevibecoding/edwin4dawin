// Exterior hull: the wedge (dorsal / ventral plateaus, bevels, trench, stern face), thousands of
// instanced armour plates laid out hierarchically (radiating column seams that branch as the hull
// widens, staggered rows, irregular sub-plates, recessed groove lines) chunked along z for LOD +
// culling, the ventral hangar module with its bay opening, and the reactor bulb.
// Greebles / hatches / trench machinery live in details.js and are placed on the plate anchors
// this module exports.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { rng, setVertexColor } from "../kit.js";
import { vnoise, vnoise2 } from "../textures.js";
import { HULL, halfWidth, dorsalH, ventralH, CHUNKS, chunkIndex, chunkCenterZ, HANGAR, REACTOR, CITY, PLATE_LIFT } from "./dims.js";
import { Batcher, instancedMesh, frameItem, decalItem, grey, planarUVs } from "./batch.js";
import { ensureExtMaterials, TRENCH_TILE } from "./exttex.js";

/**
 * Trench inner-wall x at z: `trenchInset` inside the hull edge, but never less than 30 % of the
 * half-width, so the two walls converge to the bow tip instead of crossing (which left the tip
 * see-through). Everything that sits against the wall (bevels, lips, machinery) uses this.
 */
export function trenchWallX(z) {
  const w = halfWidth(z);
  return Math.max(w - HULL.trenchInset, w * 0.3);
}

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
    // bevels both sides: plateau edge -> trench lip (at y = ±T, x = trench wall)
    const tx0 = trenchWallX(z0);
    const tx1 = trenchWallX(z1);
    for (const s of [-1, 1]) {
      const t = quad([s * sp * w0, y0, z0], [s * tx0, side * T, z0], [s * tx1, side * T, z1], [s * sp * w1, y1, z1]);
      // winding so normals point outward (up for dorsal, down for ventral); flip for -x / ventral
      const flip = (s > 0) === (side > 0);
      bevel.push(...(flip ? t.map((tr) => [tr[0], tr[2], tr[1]]) : t));
      // lip: horizontal ledge from the bevel edge outward to the trench wall face line (small overhang)
      const l = quad([s * tx0, side * T, z0], [s * (w0 + 1.5), side * T, z0], [s * (w1 + 1.5), side * T, z1], [s * tx1, side * T, z1]);
      lips.push(...(flip ? l.map((tr) => [tr[0], tr[2], tr[1]]) : l));
    }
  }
  return { plateau: trisToGeometry(tris, 0.02), bevel: trisToGeometry(bevel, 0.02), lip: trisToGeometry(lips, 0.05) };
}

/** Cross-section outline (x, y) of the hull at z, clockwise from the port dorsal plateau edge. */
function sectionOutline(z) {
  const w = halfWidth(z);
  const tx = trenchWallX(z);
  const T = HULL.trenchHalf;
  return [
    [-HULL.plateauDorsal * w, dorsalH(z)],
    [HULL.plateauDorsal * w, dorsalH(z)],
    [tx, T],
    [tx, -T],
    [HULL.plateauVentral * w, -ventralH(z)],
    [-HULL.plateauVentral * w, -ventralH(z)],
    [-tx, -T],
    [-tx, T],
  ];
}

/** Flat cap through the cross-section at z, facing ±z, with world-space UVs. */
function sectionCap(z, facing, uvScale = 0.02) {
  const shape = new THREE.Shape(sectionOutline(z).map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(shape);
  if (facing < 0) g.rotateY(Math.PI); // ShapeGeometry faces +z; the bow cap must face -z
  g.translate(0, 0, z);
  const nonIdx = g.index ? g.toNonIndexed() : g;
  nonIdx.computeVertexNormals();
  const p = nonIdx.attributes.position;
  const uv = nonIdx.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * uvScale, p.getY(i) * uvScale);
  return nonIdx;
}

/**
 * Trench inner wall: continuous vertical band at x = ±trenchWallX(z) between y = -T and +T from the
 * bow tip to the stern (the walls converge at the tip, so with the bow cap the tip is closed), plus
 * the stern face and the bow cap.
 */
function buildTrenchAndStern(rows = 52) {
  const T = HULL.trenchHalf;
  const tris = [];
  for (let i = 0; i < rows; i++) {
    const z0 = HULL.bowZ + ((HULL.sternZ - HULL.bowZ) * i) / rows;
    const z1 = HULL.bowZ + ((HULL.sternZ - HULL.bowZ) * (i + 1)) / rows;
    const w0 = trenchWallX(z0);
    const w1 = trenchWallX(z1);
    for (const s of [-1, 1]) {
      const t = quad([s * w0, -T, z0], [s * w0, T, z0], [s * w1, T, z1], [s * w1, -T, z1]);
      tris.push(...(s > 0 ? t : t.map((tr) => [tr[0], tr[2], tr[1]])));
    }
  }
  // wall tiling: TRENCH_TILE metres per tile of 3 m panels (planar UVs from the dominant axis: z / y)
  return { trench: trisToGeometry(tris, 1 / TRENCH_TILE), stern: sectionCap(HULL.sternZ, 1), bowCap: sectionCap(HULL.bowZ, -1) };
}

/**
 * Chamfer bands where the dorsal / ventral plateaus meet the stern face: a 45° strip along each
 * corner plus a slightly recessed dark band on the face below it, so the edge is not one hard
 * unbroken corner.
 */
function buildSternChamfers(batch) {
  const z = HULL.sternZ;
  const w = halfWidth(z);
  for (const side of [1, -1]) {
    const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
    const y = side * (side > 0 ? dorsalH(z) : ventralH(z));
    const len = 2 * sp * w - 6;
    // the 45° face looks almost straight at the sun (cos 0.95 vs 0.65 on the plateau): dark paint keeps
    // it from drawing a bright rail along the corner
    batch.rbox("hullDark", 0, y - side * 1.0, z - 1.0, len, 4.2, 4.2, Math.PI / 4, 0, 0, PALETTE.hullDark.clone().multiplyScalar(0.55), 0.05);
    // segmented dark band on the face just below the corner, broken by lighter frame blocks
    for (let x = -len / 2 + 8; x < len / 2 - 8; x += 46) {
      batch.box("hullDark", x + 17, y - side * 6.5, z + 0.6, 34, 3.4, 1.2, PALETTE.hullBlack, 0.05);
      batch.box("hullDark", x + 38, y - side * 6.5, z + 1.0, 6, 5, 2.0, PALETTE.hullDark, 0.05);
    }
  }
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
      const x1 = s * trenchWallX(z);
      return out.set(x0 + (x1 - x0) * u, side * (H - (H - T) * u), z);
    },
    width(z) {
      const w = halfWidth(z);
      if (isPlateau) return 2 * sp * w;
      return Math.hypot(trenchWallX(z) - sp * w, Hf(z) - T);
    },
    hint: isPlateau ? new THREE.Vector3(0, side, 0) : new THREE.Vector3(s * 0.7, side, 0),
  };
}

/**
 * Region-based paint tone: mid grey (the plateau must not clip to white under the sun), bow slightly
 * lighter, stern / engine zone darker, soot toward the trench, plus the studio-model patchwork: macro
 * patches of ±0.1 over 80–200 m and a finer ±0.04 layer, so the far / medium stations read as a
 * quilt of slightly different panels instead of one flat sheet.
 */
export function regionTone(x, z, side, isPlateau, u) {
  const t = (z - HULL.bowZ) / HULL.length;
  let k = 0.66 + 0.04 * (1 - t) * (1 - t) - 0.06 * smoothstep(0.7, 1, t);
  if (!isPlateau) k -= 0.04 * u * u;
  const zu = (z - HULL.bowZ) / 1600;
  const xv = (x + 500) / 1000;
  k *= 1 + (vnoise2(zu, xv, 13, 8, 31) - 0.5) * 0.22; // ~120 m patches
  k *= 1 + (vnoise2(zu, xv, 31, 19, 47) - 0.5) * 0.08; // ~50 m
  k *= 1 + (vnoise(zu, xv, 5, 71) - 0.5) * 0.06; // very large weather zones
  k *= 1 - 0.14 * smoothstep(736, 752, z); // darker border row along the stern edge
  if (side < 0) k *= 0.97;
  return k;
}

/**
 * Heat discolouration 0..1 at (x, z): blotches over the last ~45 m of both plateaus directly aft of
 * the engine bells (the outer corners stay clean), and a scorched ring around the reactor collar on
 * the ventral plateau. Thresholded noise, so it reads as separate scorch patches, not a tinted band.
 */
export function heatAt(x, z, side, isPlateau) {
  const band = smoothstep(708, 752, z) * smoothstep(330, 240, Math.abs(x));
  const n = vnoise2((z + 800) / 1600, (x + 500) / 1000, 64, 40, 91); // ~25 m cells
  let h = band * smoothstep(0.34, 0.74, n);
  if (side < 0 && isPlateau) {
    const d = Math.hypot(x - REACTOR.x, z - REACTOR.z);
    h = Math.max(h, (1 - smoothstep(REACTOR.r * 0.85, REACTOR.r * 1.45, d)) * smoothstep(0.3, 0.75, vnoise2((z + 800) / 1600, (x + 500) / 1000, 100, 64, 93)));
  }
  return h;
}

/** Plate paint colour from a grey tone k: dark, slightly warm scorch where heatAt() says so. */
export function plateColor(x, z, side, isPlateau, k) {
  const h = heatAt(x, z, side, isPlateau);
  if (h <= 0) return grey(k, 1.02);
  return [k * (1 - 0.34 * h), k * (1 - 0.39 * h), k * 1.02 * (1 - 0.46 * h)];
}

/**
 * Hierarchical plating over one parametric surface. Columns form a binary tree in u: a column splits
 * (with a jittered ratio) at the z where its physical width exceeds `maxW`, so the seams radiate from
 * the bow and branch as the hull widens. Rows along z are staggered per column, each panel is cut
 * into 1-4 sub-plates with thin seams, a few plates are raised or replaced.
 *
 * The major column seams are not continuous runway lanes: each boundary is "active" (wide seam with a
 * recessed groove strip) only over segments of 2–4 rows; in the inactive segments the boundary
 * narrows to a hairline and the groove jogs sideways onto a sub-plate cut of the neighbouring panel.
 * Some row seams are widened into cross grooves, so the pattern reads as a two-dimensional
 * patchwork. Emits per-chunk plate instances, groove instances and plate anchors for the detail pass.
 */
export function platingFor(surf, rand, out, { maxW = 32, thickness = 2.0, embed = 0.5, zStart = HULL.bowZ + 1, zEnd = HULL.sternZ - 0.5, bucket = chunkIndex, grooveDepth = 2, toneScale = 1, segmented = true, crossChance = 0.26, minSplit = 1, subSeam = 0.05, mergeChance = 0.25, lines = true } = {}) {
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
  // seam half-widths (metres): active groove seam by depth, plain column boundary, row / cross seams.
  // Narrow (the widest gap is 0.84 m): the plates must read as one armoured surface with seam lines,
  // not as separate slabs with dark trenches between them.
  const grooveHalf = (depth) => (depth <= 1 ? 0.42 : 0.32);
  const grooveWidth = (depth) => (depth <= 1 ? 0.8 : 0.6);
  const plainHalf = (depth) => (depth <= grooveDepth + 2 ? 0.17 : 0.12);
  const rowSeam = 0.18;
  const crossSeam = 0.32;
  const grooveTone = grey(0.38, 1.04);
  const chunkLen = (HULL.sternZ - HULL.bowZ) / CHUNKS;

  // column boundaries: { id, depth, zs (where the seam starts), segLen, phase }
  let boundaryId = 1;
  const makeBoundary = (depth, zs) => ({ id: boundaryId++, depth, zs, segLen: 55 + rand() * 60, phase: rand() });
  const hash = (a, b, c = 0) => {
    const h = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
    return h - Math.floor(h);
  };
  const segOf = (b, z) => Math.floor((z - b.zs) / b.segLen + b.phase);
  const activeAt = (b, z) => {
    if (!b || b.depth > grooveDepth) return false;
    if (!segmented) return true;
    return hash(b.id, segOf(b, z)) < 0.72;
  };
  // inactive segment → does the groove jog onto the neighbouring panel, and where (fraction of width)
  const jogAt = (b, z) => {
    if (!b || b.depth > grooveDepth || !segmented || activeAt(b, z)) return 0;
    const seg = segOf(b, z);
    return hash(b.id, seg, 1) < 0.6 ? 0.34 + hash(b.id, seg, 2) * 0.32 : 0;
  };

  const skip = (x, z, halfW) => halfW < 1.2 || (surf.skip ? surf.skip(x, z) : false);

  // recessed groove strip centred on (uc, zc) with physical size w (across) × l (along z), sitting
  // just under the plate tops so it shows through the seam gap
  const emitStrip = (uc, zc, w, l) => {
    surf.at(Math.min(1, uc + 0.01), zc, _b);
    surf.at(Math.max(0, uc - 0.01), zc, _a);
    _ex.subVectors(_b, _a).normalize();
    surf.at(uc, zc + 1, _b);
    surf.at(uc, zc - 1, _a);
    _ez.subVectors(_b, _a).normalize();
    _n.crossVectors(_ez, _ex).normalize();
    if (_n.dot(surf.hint) < 0) _n.negate();
    surf.at(uc, zc, _c);
    if (surf.skip && surf.skip(_c.x, _c.z)) return;
    _c.addScaledVector(_n, -0.13);
    out[bucket(_c.z)].grooves.push(frameItem(_c, _ex.clone(), _n.clone(), _ez.clone(), w, 0.5, l, grooveTone));
  };

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
    if (missing) {
      // skipped plate → an open service well, not a hole: a 0.7 m frame lip at plate-top height around
      // the recess, a dark floor 0.25 m down and a hatch (plus a slot) set into it
      const ci0 = bucket(_c.z);
      const k0 = panel.tone;
      const lipTop = thickness - embed + 0.05;
      const grooves = out[ci0].grooves;
      const put = (ox, oz, sx, sy, sz, h, c) => {
        _v.copy(_c).addScaledVector(_ex, ox).addScaledVector(_ez, oz).addScaledVector(_n, h - sy / 2);
        grooves.push(frameItem(_v, _ex.clone(), _n.clone(), _ez.clone(), sx, sy, sz, c));
      };
      for (const e of [-1, 1]) {
        put(0, e * (l / 2 - 0.35), w, 0.5, 0.7, lipTop, grey(k0 * 0.85, 1.02));
        put(e * (w / 2 - 0.35), 0, 0.7, 0.5, l - 1.4, lipTop, grey(k0 * 0.85, 1.02));
      }
      put(0, 0, w - 1.4, 0.2, l - 1.4, lipTop - 0.3, grey(0.26, 1.06));
      const hw = Math.min(w - 3, 4.5);
      const hl = Math.min(l - 3, 3.4);
      if (hw > 1.5 && hl > 1.5) {
        const slot = l - hl > 4.5;
        const oz = slot ? -(l - hl) * 0.12 : 0;
        put(0, oz, hw, 0.4, hl, lipTop - 0.12, grey(k0 * 0.95, 1.0));
        if (slot) put(0, oz + hl / 2 + 1.2, Math.min(hw, 3), 0.15, 0.9, lipTop - 0.22, grey(0.12, 1.1));
      }
      return;
    }
    // near-uniform thickness (±3 %, raised plates +18 %): the relief is in the plate texture, and
    // stepped plate tops read as stacked cardboard from the dock station
    const th = raised ? thickness * 1.18 : thickness * (0.97 + rand() * 0.06);
    const top = _c.clone().addScaledVector(_n, th - embed);
    _c.addScaledVector(_n, th / 2 - embed);
    // tone: region × panel batch × per-plate albedo jitter (±3.5 %) × replacement / primered plates
    // (kept small: with every plate a different shade the field read as a quilt from medium range)
    let k = panel.tone * (1 + (rand() - 0.5) * 0.07);
    const rr = rand();
    if (rr < 0.02) k *= 1.07; // fresh replacement plate
    else if (rr < 0.05) k *= 0.82 + rand() * 0.08; // primered / darker plate (1–2 per 100 m)
    if (raised) k *= 0.97;
    const c = plateColor(_c.x, _c.z, surf.side, surf.isPlateau, k);
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
    const { u0, u1, z0, z1, bL, bR, depth } = panel;
    const zc = (z0 + z1) / 2;
    const W = (u1 - u0) * surf.width(zc);
    const L = z1 - z0;
    if (W < 2 || L < 2) return;
    surf.at((u0 + u1) / 2, zc, _c);
    panel.tone = toneScale * regionTone(_c.x, _c.z, surf.side, surf.isPlateau, (u0 + u1) / 2) * (1 + (rand() - 0.5) * 0.06);
    // seams on the column boundaries: active groove (wide + strip), else plain; the left boundary's
    // groove strip is emitted by this (right-hand) panel so every boundary is drawn exactly once
    const actL = activeAt(bL, zc);
    const actR = activeAt(bR, zc);
    const sL = !bL ? 0.7 : actL ? grooveHalf(bL.depth) : plainHalf(bL.depth);
    const sR = !bR ? 0.7 : actR ? grooveHalf(bR.depth) : plainHalf(bR.depth);
    if (actL) emitStrip(u0, zc, grooveWidth(bL.depth), L + 2 * rowSeam);
    // cross groove along the top row seam (a wider seam with its own strip)
    const cross = rand() < crossChance;
    const topSeam = cross ? crossSeam : rowSeam;
    if (cross) emitStrip((u0 + u1) / 2, z0, W + sL + sR, 1.6);
    // sub-plate pattern; an inactive left boundary may jog its groove onto this panel's u-cut
    const jog = jogAt(bL, zc);
    let nu = jog && W > 10 ? 2 : W > 15 && rand() < 0.75 ? 2 : 1;
    let nz = L > 24 ? (rand() < 0.5 ? 3 : 2) : L > 13 ? (rand() < 0.7 ? 2 : 1) : 1;
    if (nu * nz === 1 && W > 9 && L > 9) {
      if (rand() < 0.5 && W > 9) nu = 2;
      else nz = 2;
    }
    // forced sub-plate pass (ventral plateau: its 30 m panels read as slabs from the hangar station)
    if (minSplit > 1) {
      if (W > 11) nu = Math.max(nu, minSplit);
      if (L > 11) nz = Math.max(nz, minSplit);
    }
    // a quarter of the panels are laid as one plate (the 2 × 3 / 3 × 2 sub-plates merged), so the
    // field mixes 10 m plates with 25 m slabs instead of one uniform quilt
    if (W <= 27 && L <= 27 && rand() < mergeChance) {
      nu = 1;
      nz = 1;
    }
    const uCuts = [u0];
    for (let i = 1; i < nu; i++) uCuts.push(u0 + (u1 - u0) * (jog && nu === 2 ? jog : i / nu + (rand() - 0.5) * 0.24));
    uCuts.push(u1);
    const jogSeam = jog && nu === 2 ? grooveHalf(bL.depth + 1) : subSeam;
    if (jog && nu === 2) emitStrip(uCuts[1], zc, grooveWidth(bL.depth + 1), L + 2 * rowSeam);
    const zCuts = [z0];
    for (let i = 1; i < nz; i++) zCuts.push(z0 + L * (i / nz + (rand() - 0.5) * 0.2));
    zCuts.push(z1);
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nz; j++) {
        const insetL = i === 0 ? sL : i === 1 ? jogSeam : subSeam;
        const insetR = i === nu - 1 ? sR : i === 0 ? jogSeam : subSeam;
        const insetA = j === 0 ? topSeam : subSeam;
        const insetB = j === nz - 1 ? rowSeam : subSeam;
        emitPlate(uCuts[i], uCuts[i + 1], zCuts[j], zCuts[j + 1], insetL, insetR, insetA, insetB, panel);
      }
    }
  };

  // long fore-aft panel line: a 0.35 m dark bead on the plate tops (0.1–0.2 m proud of the ±3 %
  // thickness spread) in 40–120 m segments with gaps, cut at the chunk boundaries so each piece LODs
  // with its chunk. With the seams down to hairlines these carry the plating's long-line structure.
  const emitLine = (u, za, zb) => {
    const zc = (za + zb) / 2;
    surf.at(Math.min(1, u + 0.01), zc, _b);
    surf.at(Math.max(0, u - 0.01), zc, _a);
    _ex.subVectors(_b, _a).normalize();
    surf.at(u, zb, _b);
    surf.at(u, za, _a);
    _ez.subVectors(_b, _a);
    const l = _ez.length();
    _ez.divideScalar(l);
    _n.crossVectors(_ez, _ex).normalize();
    if (_n.dot(surf.hint) < 0) _n.negate();
    surf.at(u, zc, _c);
    if (surf.skip && (surf.skip(_c.x, _c.z) || surf.skip(_a.x, _a.z) || surf.skip(_b.x, _b.z))) return;
    _c.addScaledVector(_n, thickness - embed + 0.06);
    out[bucket(_c.z)].grooves.push(frameItem(_c, _ex.clone(), _n.clone(), _ez.clone(), 0.35, 0.2, l, grooveTone));
  };
  const emitLines = (u, z0, z1) => {
    let z = z0 + rand() * 30;
    while (z < z1 - 20) {
      const zEndSeg = Math.min(z1, z + 40 + rand() * 80);
      let za = z;
      while (za < zEndSeg - 4) {
        const ci = bucket(za + 0.01);
        const zb = ci === bucket(zEndSeg - 0.01) ? zEndSeg : Math.min(zEndSeg, HULL.bowZ + (ci + 1) * chunkLen);
        emitLine(u, za, zb);
        za = zb;
      }
      z = zEndSeg + 20 + rand() * 60;
    }
  };

  const emitRows = (u0, u1, bL, bR, depth, z0, z1) => {
    const rowLen = 18 + rand() * 12;
    const cuts = [z0];
    let z = z0 + 7 + rand() * (rowLen - 7);
    while (z < z1 - 7) {
      cuts.push(z);
      z += rowLen * (0.85 + rand() * 0.3);
    }
    cuts.push(z1);
    for (let i = 0; i < cuts.length - 1; i++) emitPanel({ u0, u1, z0: cuts[i], z1: cuts[i + 1], bL, bR, depth });
    if (lines && z1 - z0 > 40 && rand() < 0.6) emitLines(u0 + (u1 - u0) * (0.25 + rand() * 0.5), z0, z1);
  };

  const rec = (u0, u1, bL, bR, depth, z0) => {
    const du = u1 - u0;
    const zs = zSplitFor(du);
    const zLeafEnd = Math.min(zs, zEnd);
    if (zLeafEnd > z0 + 3) emitRows(u0, u1, bL, bR, depth, z0, zLeafEnd);
    if (zs < zEnd) {
      const um = u0 + du * (0.44 + rand() * 0.12);
      const b = makeBoundary(depth + 1, zs);
      rec(u0, um, bL, b, depth + 1, zs);
      rec(um, u1, b, bR, depth + 1, zs);
    }
  };
  rec(0, 1, null, null, 0, zStart);
}

/**
 * Far-range skin for one chunk: a coarse vertex-coloured mesh at plate-top height over the plateau and
 * both bevels of one side, carrying the regionTone patchwork (plus the heat tint). Shown instead of
 * the ~1,300 plates + grooves of the chunk beyond LOD_DISTANCES.plates, where the plate seams only
 * alias into a sandy stipple.
 */
function buildFarSkin(side, z0, z1, lift) {
  const geos = [];
  for (const part of ["plateau", "bevelL", "bevelR"]) {
    const surf = makeSurface(side, part);
    const nx = part === "plateau" ? 14 : 3;
    const nz = 6;
    const pos = [];
    const col = [];
    const idx = [];
    for (let i = 0; i <= nz; i++) {
      const z = z0 + ((z1 - z0) * i) / nz;
      for (let j = 0; j <= nx; j++) {
        const u = j / nx;
        surf.at(u, z, _c);
        _c.y += side * lift * (part === "plateau" ? 1 : 0.7);
        pos.push(_c.x, _c.y, _c.z);
        const k = regionTone(_c.x, _c.z, side, surf.isPlateau, u) * 0.98;
        col.push(...plateColor(_c.x, _c.z, side, surf.isPlateau, k));
      }
    }
    for (let i = 0; i < nz; i++) {
      for (let j = 0; j < nx; j++) {
        const a = i * (nx + 1) + j;
        const b = a + 1;
        const c = a + nx + 1;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    // wind toward the outside (dorsal up / ventral down; the bevel normals share the side's y sign)
    if (ng.attributes.normal.getY(0) * side < 0) {
      for (const attr of [ng.attributes.position, ng.attributes.color]) {
        for (let i = 0; i < attr.count; i += 3) {
          const x = attr.getX(i + 1);
          const y = attr.getY(i + 1);
          const zz = attr.getZ(i + 1);
          attr.setXYZ(i + 1, attr.getX(i + 2), attr.getY(i + 2), attr.getZ(i + 2));
          attr.setXYZ(i + 2, x, y, zz);
        }
      }
      ng.computeVertexNormals();
    }
    planarUVs(ng, 0.02);
    geos.push(ng);
  }
  return geos;
}

/** Decals sit this far above the plate tops (over the ±3 % thickness spread, under the raised plates). */
export const DECAL_LIFT = PLATE_LIFT + 0.12;

/**
 * One soot-streak decal on a plateau (side ±1), trailing aft from (x, z): the decal plane follows the
 * plateau's slope, `k` is the multiply strength (0.15–0.35) and `variant` picks one of the four mask
 * columns. Returns the instance item, or null when the streak would run into a skipped footprint.
 */
export function plateauStreak(side, x, z, w, len, k, variant, skip = null) {
  if (skip && (skip(x, z) || skip(x, z + len))) return null;
  const H = side > 0 ? dorsalH : ventralH;
  const y0 = side * (H(z) + DECAL_LIFT);
  const y1 = side * (H(z + len) + DECAL_LIFT);
  _ez.set(0, y1 - y0, len).normalize();
  _ex.set(1, 0, 0);
  _c.set(x, (y0 + y1) / 2, z + len / 2);
  return decalItem(_c, _ex, _ez, w, len, [k, variant / 4, 0]);
}

/**
 * Soot streaks over the plating: 2–3 per 100 m per side on each plateau, trailing aft from a seam.
 * Each streak is 2–3 offset segments of the soft decal mask (smoothstep across, tapered ends) with a
 * per-segment strength of 0.15–0.35, multiplied onto the plates — not one flat darker strip.
 */
function buildStreaks(rand, chunks) {
  for (const side of [1, -1]) {
    const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
    const skipC = makeSurface(side, "plateau").skip;
    for (let z = HULL.bowZ + 60; z < HULL.sternZ - 40; z += 26 + rand() * 30) {
      const hw = halfWidth(z) * sp - 8;
      if (hw < 8) continue;
      const x = (rand() * 2 - 1) * hw;
      if (skipC(x, z) || skipC(x, z + 30)) continue;
      const len = 22 + rand() * 40;
      const w = 2.5 + rand() * 4;
      // the segment split draws from a private stream seeded by this streak's fifth draw (the old
      // tone draw), so the hangar module and reactor built after the streaks keep their layout
      const sub = rng(Math.floor(rand() * 4294967296));
      const parts = 2 + (sub() < 0.5 ? 1 : 0);
      let zs = z;
      for (let p = 0; p < parts; p++) {
        const l = (len / parts) * (1.1 + sub() * 0.5);
        const item = plateauStreak(side, x + (sub() - 0.5) * w * 0.9, zs, w * (0.7 + sub() * 0.6), l, 0.15 + sub() * 0.2, Math.floor(sub() * 4), skipC);
        if (item) chunks[chunkIndex(zs + l / 2)].streaks.push(item);
        zs += l * (0.75 + sub() * 0.2);
      }
    }
  }
}

/**
 * Ventral hangar module: a shallow plated housing under the ventral plateau with the bay mouth in its
 * floor. The floor is laid as plates on a regular grid at the ventral sub-plate pitch (the mouth edges
 * fall on grid lines) over a dark base, so it belongs to the plate field instead of reading as a slab
 * in a frame. The mouth itself is a lit recess: a flush reinforced rim, a short flared skirt whose inner
 * faces carry light strips and 0.6 m markers, a liner just behind the interior's well walls (the
 * backdrop while the bay doors are shut and the well is hidden — otherwise the mouth looked straight
 * through the hull) and a warm point light down in the well so its side walls read from below.
 */
function buildHangarModule(materials, rand) {
  const g = new THREE.Group();
  g.name = "hangarModule";
  const m = HANGAR.module;
  const o = HANGAR.opening;
  const yTop = -ventralH(m.z0) + 0.5; // sits just inside the plateau
  const yBot = m.bottomY;
  // dark base plate with the mouth cut out (shows through the plate seams), 0.5 m inside the plate bottoms
  const shape = new THREE.Shape([new THREE.Vector2(-m.x, m.z0), new THREE.Vector2(m.x, m.z0), new THREE.Vector2(m.x, m.z1), new THREE.Vector2(-m.x, m.z1)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-o.x, o.z0), new THREE.Vector2(-o.x, o.z1), new THREE.Vector2(o.x, o.z1), new THREE.Vector2(o.x, o.z0)]));
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
  // extrude is along +z in shape space; rotate so the shape lies in XZ with thickness along -Y
  plate.rotateX(Math.PI / 2);
  plate.translate(0, yBot + 1.7, 0);
  planarUVs(plate, 0.02);
  setVertexColor(plate, PALETTE.hullGrey.clone().multiplyScalar(0.66));
  const base = new THREE.Mesh(plate, materials.hullDark);
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);
  // floor plates: 8 × 12 grid (11 × 11.7 m cells; the mouth is exactly 4 × 6 cells), some split in two
  const cols = 8;
  const rows = 12;
  const cw = (2 * m.x) / cols;
  const rl = (m.z1 - m.z0) / rows;
  const plates = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x0 = -m.x + i * cw;
      let x1 = x0 + cw;
      let z0 = m.z0 + j * rl;
      let z1 = z0 + rl;
      const xc0 = (x0 + x1) / 2;
      const zc0 = (z0 + z1) / 2;
      const inX = Math.abs(xc0) < o.x;
      const inZ = zc0 > o.z0 && zc0 < o.z1;
      if (inX && inZ) continue; // the mouth
      // the cells beside the mouth give up a 3 m strip to the flush rim
      if (inZ && Math.abs(xc0) < o.x + cw) {
        if (xc0 > 0) x0 = o.x + 3.3;
        else x1 = -(o.x + 3.3);
      } else if (inX && Math.abs(zc0) < o.z1 + rl) {
        if (zc0 > 0) z0 = o.z1 + 3.3;
        else z1 = -(o.z1 + 3.3);
      }
      const xc = (x0 + x1) / 2;
      const w = x1 - x0 - 0.6;
      const L = z1 - z0;
      const k = regionTone(xc, (z0 + z1) / 2, -1, true, 0.5) * (1 + (rand() - 0.5) * 0.12);
      const nz = L > 9 && rand() < 0.4 ? 2 : 1;
      for (let q = 0; q < nz; q++) {
        const zq = z0 + (q + 0.5) * (L / nz);
        plates.push({ m: _m.compose(_v.set(xc, yBot + 0.5, zq), _q.identity(), _s.set(w, 1.6, L / nz - 0.6)).clone(), c: plateColor(xc, zq, -1, true, k * (1 + (rand() - 0.5) * 0.06)) });
      }
    }
  }
  const plateGeo = new THREE.BoxGeometry(1, 1, 1);
  g.add(instancedMesh(plateGeo, materials.ext_hullPlate, plates, { castShadow: true, name: "hangarPlates" }));
  // side walls of the module (from the plateau down to the bottom) in the plate tone family, with
  // rib / panel steps so the housing reads as machinery from below
  const wallH = yTop - yBot;
  const wallY = (yTop + yBot) / 2;
  const walls = new Batcher(materials);
  const wallTone = PALETTE.hullGrey.clone().multiplyScalar(0.7);
  walls.box("hullDark", 0, wallY, m.z0 - 1, 2 * m.x + 2, wallH, 2, wallTone, 0.05);
  walls.box("hullDark", 0, wallY, m.z1 + 1, 2 * m.x + 2, wallH, 2, wallTone, 0.05);
  walls.box("hullDark", -m.x - 1, wallY, (m.z0 + m.z1) / 2, 2, wallH, m.z1 - m.z0 + 4, wallTone, 0.05);
  walls.box("hullDark", m.x + 1, wallY, (m.z0 + m.z1) / 2, 2, wallH, m.z1 - m.z0 + 4, wallTone, 0.05);
  for (let z = m.z0 + 10; z < m.z1 - 6; z += 12) for (const s of [-1, 1]) walls.box("hullDark", s * (m.x + 2.4), wallY - 1, z, 1.2, wallH - 4, 3, PALETTE.hullDark, 0.05);
  for (let x = -m.x + 8; x < m.x - 6; x += 11) for (const s of [-1, 1]) walls.box("hullDark", x, wallY - 1, s > 0 ? m.z1 + 2.4 : m.z0 - 2.4, 3, wallH - 4, 1.2, PALETTE.hullDark, 0.05);
  // --- the mouth: reinforced rim (darker, a quarter metre proud of the plates), flared skirt, liner, light
  const rimTone = PALETTE.hullGrey.clone().multiplyScalar(0.5);
  for (const s of [-1, 1]) {
    walls.box("hullDark", s * (o.x + 1.5), yBot + 0.25, 0, 3, 1.6, o.z1 - o.z0 + 6, rimTone, 0.05);
    walls.box("hullDark", 0, yBot + 0.25, s * (o.z1 + 1.5), 2 * o.x, 1.6, 3, rimTone, 0.05);
  }
  // skirt: four panels leaning 15° outward, 6.5 m down the slant, from the rim's outer edge
  const th = 0.26;
  const H = 6.5;
  const skirtTone = PALETTE.hullGrey.clone().multiplyScalar(0.58);
  const inner = 3.0; // rim width: the skirt's top inner edge sits at the rim's outer edge
  const topX = o.x + inner;
  const topZ = o.z1 + inner;
  const yT = yBot - 0.3;
  const cx = topX + 0.5 * Math.cos(th) + (H / 2) * Math.sin(th);
  const cyS = yT - (H / 2) * Math.cos(th) + 0.5 * Math.sin(th);
  const cz = topZ + 0.5 * Math.cos(th) + (H / 2) * Math.sin(th);
  for (const s of [-1, 1]) {
    walls.rbox("hullDark", s * cx, cyS, 0, 1.0, H, 2 * topZ + 3, 0, 0, s * th, skirtTone, 0.05);
    walls.rbox("hullDark", 0, cyS, s * cz, 2 * topX + 3, H, 1.0, -s * th, 0, 0, skirtTone, 0.05);
    for (const t of [-1, 1]) walls.box("hullDark", s * (topX + 1.4), yT - H * 0.48, t * (topZ + 1.4), 2.4, H * 0.96, 2.4, PALETTE.hullDark, 0.05);
  }
  // liner behind the interior's well walls (x ±21.9 / z ±34.9, y -46..-30): 1.1 m further out, from
  // the module bottom to just under the door slot, so a shut bay shows panelled walls, not the void
  const lx = o.x + 1.1;
  const lz = o.z1 + 1.1;
  const yL1 = HANGAR.deckY - 1.6;
  const yL0 = yBot + 0.2;
  const linerTone = PALETTE.hullGrey.clone().multiplyScalar(0.46);
  for (const s of [-1, 1]) {
    walls.box("hullDark", s * (lx + 0.3), (yL0 + yL1) / 2, 0, 0.6, yL1 - yL0, 2 * lz + 1.2, linerTone, 0.05);
    walls.box("hullDark", 0, (yL0 + yL1) / 2, s * (lz + 0.3), 2 * lx, yL1 - yL0, 0.6, linerTone, 0.05);
  }
  walls.build(g, { name: "hangarModuleWalls" });
  // light strips on the skirt's inner faces (two per face) and the liner (three per wall): warm and
  // at half strength (vertex tint scales ext_window's emissive) so they sit under the amber mouth
  // markers instead of reading as white bars from below
  const STRIP_TINT = 0x9c7a52;
  const lit = new Batcher(materials);
  for (const sl of [1.6, 4.3]) {
    const px = topX + sl * Math.sin(th) - 0.1 * Math.cos(th);
    const py = yT - sl * Math.cos(th) - 0.1 * Math.sin(th);
    const pz = topZ + sl * Math.sin(th) - 0.1 * Math.cos(th);
    for (const s of [-1, 1]) {
      lit.rbox("ext_window", s * px, py, 0, 0.16, 0.35, 2 * topZ - 4, 0, 0, s * th, STRIP_TINT, 0.05);
      lit.rbox("ext_window", 0, py, s * pz, 2 * topX - 4, 0.35, 0.16, -s * th, 0, 0, STRIP_TINT, 0.05);
    }
  }
  for (const y of [-43.5, -39.5, -35.5]) {
    for (const s of [-1, 1]) {
      lit.box("ext_window", s * (lx - 0.06), y, 0, 0.1, 0.3, 2 * lz - 6, STRIP_TINT, 0.05);
      lit.box("ext_window", 0, y, s * (lz - 0.06), 2 * lx - 6, 0.3, 0.1, STRIP_TINT, 0.05);
    }
  }
  lit.build(g, { name: "hangarStrips", castShadow: false });
  // 0.6 m marker lights along the skirt's bottom edge, every 5 m
  const lights = [];
  const sm = H - 0.7;
  const mx = topX + sm * Math.sin(th) - 0.3 * Math.cos(th);
  const my = yT - sm * Math.cos(th) - 0.3 * Math.sin(th);
  const mz = topZ + sm * Math.sin(th) - 0.3 * Math.cos(th);
  for (let z = -topZ + 4; z < topZ - 3; z += 5) for (const s of [-1, 1]) lights.push([s * mx, my, z]);
  for (let x = -topX + 4; x < topX - 3; x += 5) for (const s of [-1, 1]) lights.push([x, my, s * mz]);
  const lg = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const lm = new THREE.InstancedMesh(lg, materials.exteriorRed, lights.length);
  lights.forEach((p, i) => lm.setMatrixAt(i, _m.compose(_v.set(...p), _q.identity(), _s.set(1, 1, 1))));
  lm.instanceMatrix.needsUpdate = true;
  lm.name = "hangarMarkers";
  g.add(lm);
  // warm light down in the well: lights the interior's well walls and the skirt from inside the recess
  const wl = new THREE.PointLight(0xffdcb0, 110, 90, 2);
  wl.position.set(0, -40, 0);
  wl.name = "hangarWellLight";
  g.add(wl);
  return g;
}

/**
 * Reactor bulb under the ventral plateau: a dark base sphere plated with staggered rows of tangent
 * armour panels (~11 m, seams showing the base between them — plate seams, not a lat/long grid), a
 * 12 m junction collar at 1.1× the bulb's radius at the plateau (ribbed, with a flange at the plateau
 * and a lip at its foot), a lit gallery ring below the equator and a pole fitting.
 */
function buildReactor(materials, group, rand) {
  const yTop = -ventralH(REACTOR.z);
  const r = REACTOR.r;
  const cy = yTop - r * 0.45;
  const geo = new THREE.SphereGeometry(r, 48, 32);
  geo.translate(REACTOR.x, cy, REACTOR.z);
  planarUVs(geo, 0.02);
  setVertexColor(geo, PALETTE.hullGrey.clone().multiplyScalar(0.6));
  const bulb = new THREE.Mesh(geo, materials.hullDark);
  bulb.castShadow = true;
  bulb.receiveShadow = true;
  bulb.name = "reactorBulb";
  group.add(bulb);
  // --- collar: 12 m ring at 1.1 × the junction radius, hanging from the plateau over the top of the bulb
  const fit = new Batcher(materials);
  const rj = Math.sqrt(r * r - (yTop - cy) * (yTop - cy)); // bulb radius at the plateau plane
  const rc = rj * 1.1;
  const collarH = 12;
  const collarTone = PALETTE.hullGrey.clone().multiplyScalar(0.72);
  fit.cyl("hullDark", REACTOR.x, yTop - collarH / 2, REACTOR.z, rc, rc, collarH, "y", collarTone, 64, 0.02, true);
  fit.cyl("hullDark", REACTOR.x, yTop - 0.8, REACTOR.z, rc + 2.8, rc + 2.8, 1.6, "y", PALETTE.hullDark, 64, 0.05); // flange at the plateau
  fit.cyl("hullDark", REACTOR.x, yTop - collarH - 0.7, REACTOR.z, rc + 1.4, rc + 1.4, 1.4, "y", PALETTE.hullDark, 64, 0.05); // foot lip
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    fit.rbox("hullDark", REACTOR.x + Math.cos(a) * (rc + 0.5), yTop - collarH / 2, REACTOR.z + Math.sin(a) * (rc + 0.5), 1.4, collarH - 2.4, 1.8, 0, -a, 0, PALETTE.hullDark, 0.05);
  }
  fit.cyl("hullDark", REACTOR.x, cy - r - 1.5, REACTOR.z, 9, 12, 5, "y", PALETTE.hullDark, 24, 0.05);
  fit.cyl("hullDark", REACTOR.x, cy - r - 5, REACTOR.z, 4, 6, 4, "y", PALETTE.hullBlack, 16, 0.05);
  fit.build(group, { name: "reactorFittings" });
  // lit gallery ring just below the equator, standing on the plates
  const bandY = cy - r * 0.1;
  const band = new THREE.CylinderGeometry(r + 0.7, r + 0.7, 3.2, 64, 1, true);
  band.translate(REACTOR.x, bandY, REACTOR.z);
  planarUVs(band, 0.015);
  setVertexColor(band, PALETTE.hullBlack);
  const bandMesh = new THREE.Mesh(band, materials.cityDense);
  bandMesh.name = "reactorBand";
  group.add(bandMesh);
  // service slots on the collar: short lit strips between every fourth pair of ribs
  const slots = [];
  for (let k = 0; k < 28; k += 4) {
    const a = ((k + 0.5) / 28) * Math.PI * 2;
    _v.set(REACTOR.x + Math.cos(a) * (rc + 0.15), yTop - collarH * 0.55, REACTOR.z + Math.sin(a) * (rc + 0.15));
    _q.setFromEuler(new THREE.Euler(0, -a, 0));
    _s.set(0.3, 0.5, 5);
    slots.push({ m: _m.compose(_v, _q, _s).clone(), c: null });
  }
  group.add(instancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.ext_window, slots, { name: "reactorSlots" }));
  // --- plates: staggered rows of tangent panels from under the collar down to the pole fitting; the
  // gallery ring takes the place of one row. Panel tone = the ventral plate tone, a few dark vent
  // panels and fresh replacements, and a little heat toward the collar.
  const items = [];
  const latTop = Math.asin((yTop - collarH - 1.2 - cy) / r);
  const latBand0 = Math.asin((bandY + 2.0 - cy) / r);
  const latBand1 = Math.asin((bandY - 2.0 - cy) / r);
  const latBot = -1.28;
  const rowsAbove = 2;
  const rowsBelow = 7;
  const rowList = [];
  for (let i = 0; i < rowsAbove; i++) rowList.push([latTop + ((latBand0 - latTop) * i) / rowsAbove, latTop + ((latBand0 - latTop) * (i + 1)) / rowsAbove]);
  for (let i = 0; i < rowsBelow; i++) rowList.push([latBand1 + ((latBot - latBand1) * i) / rowsBelow, latBand1 + ((latBot - latBand1) * (i + 1)) / rowsBelow]);
  const east = new THREE.Vector3();
  const north = new THREE.Vector3();
  let row = 0;
  for (const [la0, la1] of rowList) {
    const lat = (la0 + la1) / 2;
    const h = r * (la0 - la1) - 0.7;
    const circ = 2 * Math.PI * r * Math.cos(lat);
    const n = Math.max(6, Math.round(circ / 11));
    const off = (row++ % 2) * 0.5;
    const w = circ / n - 0.7;
    const heat = smoothstep(latTop - 0.3, latTop, lat);
    for (let k = 0; k < n; k++) {
      const lon = ((k + off) / n) * Math.PI * 2;
      _n.set(Math.cos(lon) * Math.cos(lat), Math.sin(lat), Math.sin(lon) * Math.cos(lat));
      east.set(-Math.sin(lon), 0, Math.cos(lon));
      north.crossVectors(_n, east).normalize();
      _c.set(REACTOR.x, cy, REACTOR.z).addScaledVector(_n, r + 0.25);
      let kk = regionTone(_c.x, _c.z, -1, false, 0.5) * (1 + (rand() - 0.5) * 0.12) * 0.96;
      const rr = rand();
      if (rr < 0.05) kk *= 0.5; // vent panel
      else if (rr < 0.09) kk *= 1.08; // fresh replacement
      const c = [kk * (1 - 0.16 * heat), kk * (1 - 0.24 * heat), kk * 1.02 * (1 - 0.34 * heat)];
      items.push(frameItem(_c.clone(), east.clone(), _n.clone(), north.clone(), w, 0.8, Math.max(2, h), c));
    }
  }
  const pm = instancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.ext_hullPlate, items, { castShadow: true, name: "reactorPlates" });
  group.add(pm);
  return items.length;
}

export function buildHull(materials) {
  const group = new THREE.Group();
  group.name = "hull";
  const rand = rng(4242);

  // --- base skins (dark recessed surface that shows through the seams), one mesh per side
  const baseTone = PALETTE.hullGrey.clone().multiplyScalar(0.68);
  for (const side of [1, -1]) {
    const { plateau, bevel, lip } = buildSkin(side);
    const skin = new Batcher(materials);
    skin.add("hullDark", plateau, baseTone);
    skin.add("hullDark", bevel, baseTone);
    skin.add("hullDark", lip, PALETTE.hullBlack);
    skin.build(group, { name: side > 0 ? "dorsal_skin" : "ventral_skin" });
  }
  ensureExtMaterials(materials);
  const { trench, stern, bowCap } = buildTrenchAndStern();
  const trenchMesh = new THREE.Mesh(trench, materials.ext_trenchWall);
  trenchMesh.name = "trench";
  trenchMesh.castShadow = true;
  trenchMesh.receiveShadow = true;
  group.add(trenchMesh);
  // bow cap closing the tip in the plates' own tone family; the stern cap is the base under the
  // plating engines.js lays over it, a step darker so it shows through the plate seams
  setVertexColor(stern, PALETTE.hullGrey.clone().multiplyScalar(0.5));
  setVertexColor(bowCap, PALETTE.hullGrey.clone().multiplyScalar(0.64));
  const sternMesh = new THREE.Mesh(stern, materials.hullDark);
  sternMesh.name = "stern";
  sternMesh.castShadow = true;
  sternMesh.receiveShadow = true;
  group.add(sternMesh);
  const bowMesh = new THREE.Mesh(bowCap, materials.hullDark);
  bowMesh.name = "bowCap";
  group.add(bowMesh);
  const chamfers = new Batcher(materials);
  buildSternChamfers(chamfers);
  chamfers.build(group, { name: "sternChamfers" });

  // --- hierarchical plating per chunk (clean plates on the shared hull sets, worn plates on ext_hullWorn)
  const chunks = Array.from({ length: CHUNKS }, () => ({ plates: [], worn: [], grooves: [], anchors: [], streaks: [] }));
  const surfaces = [];
  for (const side of [1, -1]) {
    for (const part of ["plateau", "bevelL", "bevelR"]) {
      const surf = makeSurface(side, part);
      surfaces.push(surf);
      // ventral plateau: forced 2 × 2 sub-plate pass with wider sub-seams so its plate scale matches
      // the dorsal from the (closer) hangar station
      const ventralPlateau = side < 0 && part === "plateau";
      // plates are thick boxes but sit almost flush (PLATE_LIFT above the skin): the seams are shallow
      // lines, not trenches between stacked slabs
      const thickness = side > 0 ? 2.0 : 1.8;
      platingFor(surf, rand, chunks, { maxW: part === "plateau" ? 32 : 28, thickness, embed: thickness - PLATE_LIFT, grooveDepth: 2, minSplit: ventralPlateau ? 2 : 1, subSeam: ventralPlateau ? 0.14 : 0.05, mergeChance: ventralPlateau ? 0.12 : 0.25 });
    }
  }
  buildStreaks(rand, chunks);
  const plateGeo = new THREE.BoxGeometry(1, 1, 1);
  setVertexColor(plateGeo, 0xffffff);
  const chunkGroups = [];
  let plateCount = 0;
  const chunkLen = (HULL.sternZ - HULL.bowZ) / CHUNKS;
  for (let i = 0; i < CHUNKS; i++) {
    const cg = new THREE.Group();
    cg.name = "chunk_" + i;
    cg.userData.centerZ = chunkCenterZ(i);
    const pm = instancedMesh(plateGeo, materials.ext_hullPlate, chunks[i].plates, { castShadow: true, name: "plates", lod: 1 });
    cg.add(pm);
    if (chunks[i].worn.length) cg.add(instancedMesh(plateGeo, materials.ext_hullWorn, chunks[i].worn, { name: "platesWorn", lod: 1 }));
    if (chunks[i].grooves.length) cg.add(instancedMesh(plateGeo, materials.hullDark, chunks[i].grooves, { name: "grooves", lod: 1 }));
    // far skin (lod 2): replaces the plates beyond the plate LOD distance
    const far = new Batcher(materials);
    const z0 = HULL.bowZ + i * chunkLen;
    const z1 = z0 + chunkLen;
    for (const side of [1, -1]) for (const g of buildFarSkin(side, z0, z1, PLATE_LIFT)) far.add(i % 2 ? "hull2" : "hull", g, null);
    for (const m of far.build(cg, { name: "farSkin", castShadow: false, lod: 2 })) m.visible = false;
    plateCount += chunks[i].plates.length + chunks[i].worn.length;
    group.add(cg);
    chunkGroups.push(cg);
  }

  // --- hangar module + reactor bulb
  group.add(buildHangarModule(materials, rand));
  plateCount += buildReactor(materials, group, rand);

  // the plateau streak decals are handed to details.js, which merges them with its own streaks into one
  // decal mesh per chunk
  return { group, chunkGroups, surfaces, anchors: chunks.map((c) => c.anchors), streaks: chunks.map((c) => c.streaks), stats: { plates: plateCount, greebles: 0 } };
}
