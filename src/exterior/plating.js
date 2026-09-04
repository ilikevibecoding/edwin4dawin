// Armour: the analytic dorsal / ventral base surfaces (seam floor), layered bevelled plates following the
// surface in wedge ray coordinates (strakes on the wings, a panel grid on the plateau, the forward spine
// with its groove), the side trench walls + edge rims, the stern face with heat / soot tints, the bow tip.
import * as THREE from "three";
import { IMP } from "../core/palette.js";
import { HULL, CITY, ENGINES, BELLY_PLATE, REACTOR_BULB, halfWidth, sternZAt, topY, ventralY } from "../core/layout.js";
import { BOW, STERN, HW, TR, rayPoint, surfY, plateTint, weather, smooth01, edgeYaw, HEAT, SOOT } from "./common.js";
import { seamRun } from "./greebles.js";

const _c = new THREE.Color();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();

function toU8(arr) {
  const out = new Uint8Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = Math.round(Math.max(0, Math.min(1, arr[i])) * 255);
  return out;
}

function makeGeo(pos, uv, col, idx) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.BufferAttribute(toU8(col), 3, true));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Push a triangle, flipping so its normal agrees with `want` (a rough outward direction). */
function tri(idx, pos, a, b, c, want) {
  _a.set(pos[b * 3] - pos[a * 3], pos[b * 3 + 1] - pos[a * 3 + 1], pos[b * 3 + 2] - pos[a * 3 + 2]);
  _b.set(pos[c * 3] - pos[a * 3], pos[c * 3 + 1] - pos[a * 3 + 1], pos[c * 3 + 2] - pos[a * 3 + 2]);
  _n.crossVectors(_a, _b);
  if (_n.dot(want) >= 0) idx.push(a, b, c);
  else idx.push(a, c, b);
}

// ---------------------------------------------------------------------------------------------------
// Base surfaces: the dark seam floor under the plates
// ---------------------------------------------------------------------------------------------------
export function buildBaseSurfaces(kit) {
  const seam = new THREE.Color().copy(IMP.hullShadow).lerp(IMP.hullDark, 0.45);
  const seamV = new THREE.Color().copy(IMP.hullShadow).lerp(IMP.hullDark, 0.2);
  const up = new THREE.Vector3(0, 1, 0);
  const down = new THREE.Vector3(0, -1, 0);
  wedgeSurface(kit, "hullDark", 1, { rows: 128, cols: 64, edgeY: TR.y1, want: up, color: (x, z, out) => weather(out.copy(seam), x, z) });
  wedgeSurface(kit, "hullDark", -1, { rows: 96, cols: 48, edgeY: TR.y0, want: down, skip: BELLY_PLATE, color: (x, z, out) => weather(out.copy(seamV), x, z) });
}

function wedgeSurface(kit, mat, sign, { rows, cols, edgeY, want, skip = null, color, uvScale = 1 / 80 }) {
  const pos = [];
  const col = [];
  const uv = [];
  const idx = [];
  const grid = [];
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    const row = [];
    for (let j = 0; j <= cols; j++) {
      const s = -1 + (2 * j) / cols;
      const [x, z] = rayPoint(s, u);
      const y = Math.abs(s) >= 0.999 ? edgeY : surfY(sign, x, z);
      row.push(pos.length / 3);
      pos.push(x, y, z);
      uv.push(x * uvScale, z * uvScale);
      color(x, z, _c);
      col.push(_c.r, _c.g, _c.b);
    }
    grid.push(row);
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = grid[i][j];
      const b = grid[i][j + 1];
      const c = grid[i + 1][j + 1];
      const d = grid[i + 1][j];
      if (skip) {
        const xs = [pos[a * 3], pos[b * 3], pos[c * 3], pos[d * 3]];
        const zs = [pos[a * 3 + 2], pos[b * 3 + 2], pos[c * 3 + 2], pos[d * 3 + 2]];
        if (Math.min(...xs) > skip.x0 && Math.max(...xs) < skip.x1 && Math.min(...zs) > skip.z0 && Math.max(...zs) < skip.z1) continue;
      }
      tri(idx, pos, a, b, c, want);
      tri(idx, pos, a, c, d, want);
    }
  }
  const geo = makeGeo(pos, uv, col, idx);
  kit.add(mat, geo, { uv: "keep", keepColor: true });
}

// ---------------------------------------------------------------------------------------------------
// Plates
// ---------------------------------------------------------------------------------------------------
const M_PER_U = STERN - BOW; // ≈ metres per unit u along the centre ray

/**
 * One bevelled armour plate following the dorsal (sign +1) or ventral (−1) surface over the ray-space
 * rectangle [s0,s1]×[u0,u1]. Returns the plate record (or null when too small).
 */
export function surfacePlate(kit, sign, s0, s1, u0, u1, { thick = 1, color, gap = 0.8, bevel = 0.45, texel = 1 / 70, ns = 2, nu = 2, mat = "hull", big = false } = {}) {
  const sc = (s0 + s1) / 2;
  const uc = (u0 + u1) / 2;
  const [, zc] = rayPoint(sc, uc);
  const mS = Math.max(1e-3, halfWidth(zc)); // metres per unit s at this z
  const dsGap = gap / mS;
  const duGap = gap / M_PER_U;
  const dsBev = bevel / mS;
  const duBev = bevel / M_PER_U;
  const os0 = s0 + dsGap;
  const os1 = s1 - dsGap;
  const ou0 = u0 + duGap;
  const ou1 = u1 - duGap;
  const is0 = os0 + dsBev;
  const is1 = os1 - dsBev;
  const iu0 = ou0 + duBev;
  const iu1 = ou1 - duBev;
  if ((is1 - is0) * mS < 2 || (iu1 - iu0) * M_PER_U < 2) return null;
  const pos = [];
  const uv = [];
  const col = [];
  const idx = [];
  const c = color || plateTint(Math.random);
  const push = (x, y, z, u, v) => {
    pos.push(x, y, z);
    uv.push(u, v);
    col.push(c.r, c.g, c.b);
    return pos.length / 3 - 1;
  };
  // top grid
  const top = [];
  for (let i = 0; i <= nu; i++) {
    const u = iu0 + ((iu1 - iu0) * i) / nu;
    const row = [];
    for (let j = 0; j <= ns; j++) {
      const s = is0 + ((is1 - is0) * j) / ns;
      const [x, z] = rayPoint(s, u);
      const y = surfY(sign, x, z) + sign * thick;
      row.push(push(x, y, z, x * texel, z * texel));
    }
    top.push(row);
  }
  const want = _n.set(0, sign, 0).clone();
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < ns; j++) {
      tri(idx, pos, top[i][j], top[i][j + 1], top[i + 1][j + 1], want);
      tri(idx, pos, top[i][j], top[i + 1][j + 1], top[i + 1][j], want);
    }
  }
  // skirt (bevel): perimeter of the inner rect at the top down to the outer rect at the base
  const perim = [];
  for (let j = 0; j < ns; j++) perim.push([is0 + ((is1 - is0) * j) / ns, iu0, os0 + ((os1 - os0) * j) / ns, ou0]);
  for (let i = 0; i < nu; i++) perim.push([is1, iu0 + ((iu1 - iu0) * i) / nu, os1, ou0 + ((ou1 - ou0) * i) / nu]);
  for (let j = ns; j > 0; j--) perim.push([is0 + ((is1 - is0) * j) / ns, iu1, os0 + ((os1 - os0) * j) / ns, ou1]);
  for (let i = nu; i > 0; i--) perim.push([is0, iu0 + ((iu1 - iu0) * i) / nu, os0, ou0 + ((ou1 - ou0) * i) / nu]);
  const [cx, cz] = rayPoint(sc, uc);
  const base = -sign * 0.4;
  for (let k = 0; k < perim.length; k++) {
    const p = perim[k];
    const q = perim[(k + 1) % perim.length];
    const [tx0, tz0] = rayPoint(p[0], p[1]);
    const [tx1, tz1] = rayPoint(q[0], q[1]);
    const [bx0, bz0] = rayPoint(p[2], p[3]);
    const [bx1, bz1] = rayPoint(q[2], q[3]);
    const ty0 = surfY(sign, tx0, tz0) + sign * thick;
    const ty1 = surfY(sign, tx1, tz1) + sign * thick;
    const by0 = surfY(sign, bx0, bz0) + base;
    const by1 = surfY(sign, bx1, bz1) + base;
    const along = Math.hypot(tx1 - tx0, tz1 - tz0);
    const a = push(tx0, ty0, tz0, 0, ty0 * texel);
    const b = push(tx1, ty1, tz1, along * texel, ty1 * texel);
    const d = push(bx1, by1, bz1, along * texel, by1 * texel);
    const e = push(bx0, by0, bz0, 0, by0 * texel);
    const mx = (tx0 + tx1) / 2 - cx;
    const mz = (tz0 + tz1) / 2 - cz;
    want.set(mx, sign * 0.3 * Math.hypot(mx, mz), mz);
    tri(idx, pos, a, b, d, want);
    tri(idx, pos, a, d, e, want);
  }
  kit.add(mat, makeGeo(pos, uv, col, idx), { uv: "keep", keepColor: true });
  return { sign, s0: is0, s1: is1, u0: iu0, u1: iu1, thick, color: c.clone(), big };
}

/** Row boundaries along u with random lengths (metres), optionally starting with a half row. */
function rowSeq(rand, u0, u1, minLen, maxLen, stagger) {
  const out = [u0];
  let u = u0;
  if (stagger) u += ((minLen + maxLen) / 4) / M_PER_U;
  while (u < u1 - (minLen * 0.5) / M_PER_U) {
    out.push(u);
    u += (minLen + rand() * (maxLen - minLen)) / M_PER_U;
  }
  out.push(u1);
  return out;
}

function underCity(x, z) {
  if (z < CITY.z0 - 6) return false;
  return Math.abs(x) < CITY.halfWidthAt(z) + 30;
}

/** Dorsal plating: plateau grid, wing strakes, forward spine. Fills `plates`, returns spine info. */
export function buildDorsalPlates(kit, rand, plates, tiers) {
  const zones = [
    { u0: 0.012, u1: 0.12, bands: [[0, 0.52], [0.52, 0.985]], rows: [28, 48] },
    { u0: 0.12, u1: 0.3, bands: [[0, 0.24], [0.24, 0.45], [0.45, 0.67], [0.67, 0.84], [0.84, 0.985]], rows: [40, 70] },
    { u0: 0.3, u1: 1.0, bands: [[0, 0.1], [0.1, 0.22], [0.22, 0.34], [0.34, 0.45], [0.45, 0.56], [0.56, 0.67], [0.67, 0.78], [0.78, 0.89], [0.89, 0.985]], rows: [48, 96] },
  ];
  const spineU0 = 0.14;
  const spineU1 = 0.478;
  for (const zn of zones) {
    const seqA = rowSeq(rand, zn.u0, zn.u1, zn.rows[0], zn.rows[1], false);
    const seqB = rowSeq(rand, zn.u0, zn.u1, zn.rows[0], zn.rows[1], true);
    zn.bands.forEach((band, bi) => {
      const seq = bi % 2 ? seqB : seqA;
      const slope = band[0] >= 0.45;
      const thickBase = slope ? (bi % 2 ? 1.6 : 0.95) : 1.0 + rand() * 0.4;
      for (const side of [-1, 1]) {
        for (let r = 0; r < seq.length - 1; r++) {
          const u0 = seq[r];
          const u1 = seq[r + 1];
          const uc = (u0 + u1) / 2;
          const s0 = side > 0 ? band[0] : -band[1];
          const s1 = side > 0 ? band[1] : -band[0];
          // the spine groove: skip the centre band under the spine (dark groove floor shows)
          if (band[0] === 0 && uc > spineU0 && uc < spineU1) continue;
          const [xc, zc] = rayPoint((s0 + s1) / 2, uc);
          if (underCity(xc, zc)) continue;
          const c = weather(plateTint(rand), xc, zc);
          const p = surfacePlate(kit, 1, s0, s1, u0, u1, { thick: thickBase * (0.9 + rand() * 0.2), color: c, ns: slope ? 3 : 2, nu: Math.max(2, Math.round(((u1 - u0) * M_PER_U) / 32)), big: true });
          if (p) plates.push(p);
        }
      }
    });
  }
  // forward spine: two long raised strips either side of a dark groove, segmented
  const spineSeq = rowSeq(rand, spineU0, spineU1, 70, 120, false);
  for (let r = 0; r < spineSeq.length - 1; r++) {
    for (const side of [-1, 1]) {
      const s0 = side > 0 ? 0.022 : -0.098;
      const s1 = side > 0 ? 0.098 : -0.022;
      const [xc, zc] = rayPoint((s0 + s1) / 2, (spineSeq[r] + spineSeq[r + 1]) / 2);
      const c = weather(_c.copy(IMP.hullMid).lerp(IMP.hullLight, 0.15 + rand() * 0.15), xc, zc).clone();
      const p = surfacePlate(kit, 1, s0, s1, spineSeq[r], spineSeq[r + 1], { thick: 3.2, color: c, ns: 1, nu: 3, gap: 1.0, bevel: 0.8, big: true });
      if (p) plates.push(p);
    }
  }
  // machinery in the groove and along the plateau edge / a strake step
  {
    const [x0, z0] = rayPoint(0, spineU0 + 0.01);
    const [x1, z1] = rayPoint(0, spineU1 - 0.01);
    seamRun(tiers, rand, 1, x0, z0, x1, z1, { step: 9, scale: 1.2, lift: 0.2 });
    for (const side of [-1, 1]) {
      for (const s of [0.45, 0.67]) {
        for (let u = 0.2; u < 0.97; u += 0.09) {
          if (rand() < 0.45) continue;
          const [ax, az] = rayPoint(side * s, u);
          const [bx, bz] = rayPoint(side * s, Math.min(0.985, u + 0.06));
          if (underCity(ax, az) || underCity(bx, bz)) continue;
          seamRun(tiers, rand, 1, ax, az, bx, bz, { step: 7, scale: 1.1, lift: 1.7 });
        }
      }
    }
  }
}

/** Ventral plating: wider, darker plates; skips the belly plate and the reactor bulb footprint. */
export function buildVentralPlates(kit, rand, plates) {
  const zones = [
    { u0: 0.012, u1: 0.14, bands: [[0, 0.55], [0.55, 0.985]], rows: [36, 60] },
    { u0: 0.14, u1: 1.0, bands: [[0, 0.12], [0.12, 0.24], [0.24, 0.35], [0.35, 0.5], [0.5, 0.65], [0.65, 0.8], [0.8, 0.985]], rows: [60, 120] },
  ];
  const B = BELLY_PLATE;
  for (const zn of zones) {
    const seqA = rowSeq(rand, zn.u0, zn.u1, zn.rows[0], zn.rows[1], false);
    const seqB = rowSeq(rand, zn.u0, zn.u1, zn.rows[0], zn.rows[1], true);
    zn.bands.forEach((band, bi) => {
      const seq = bi % 2 ? seqB : seqA;
      const slope = band[0] >= 0.35;
      for (const side of [-1, 1]) {
        for (let r = 0; r < seq.length - 1; r++) {
          const u0 = seq[r];
          const u1 = seq[r + 1];
          const s0 = side > 0 ? band[0] : -band[1];
          const s1 = side > 0 ? band[1] : -band[0];
          const [xc, zc] = rayPoint((s0 + s1) / 2, (u0 + u1) / 2);
          if (xc > B.x0 - 14 && xc < B.x1 + 14 && zc > B.z0 - 14 && zc < B.z1 + 14) continue;
          if (Math.hypot(xc - REACTOR_BULB.x, zc - REACTOR_BULB.z) < REACTOR_BULB.r + 16) continue;
          const c = weather(plateTint(rand).lerp(IMP.hullDark, 0.3), xc, zc);
          const p = surfacePlate(kit, -1, s0, s1, u0, u1, { thick: (slope ? (bi % 2 ? 1.5 : 0.9) : 1.0) * (0.9 + rand() * 0.2), color: c, ns: slope ? 3 : 2, nu: Math.max(2, Math.round(((u1 - u0) * M_PER_U) / 36)), texel: 1 / 80, big: true });
          if (p) plates.push(p);
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------------------------------
// Side trench walls and edge rims, bow tip closure
// ---------------------------------------------------------------------------------------------------
export function buildTrenchWalls(kit) {
  for (const side of [-1, 1]) {
    const segs = 120;
    const pos = [];
    const idx = [];
    const col = [];
    const uv = [];
    const push = (x, y, z, c) => {
      pos.push(x, y, z);
      col.push(c.r, c.g, c.b);
      uv.push(z / 60, y / 60);
      return pos.length / 3 - 1;
    };
    const want = new THREE.Vector3(side, 0, 0);
    for (let i = 0; i <= segs; i++) {
      const u = 0.04 + (i / segs) * 0.96;
      const xe = side * HW;
      const z = BOW + u * (sternZAt(xe) - BOW);
      const hw = halfWidth(z);
      const xo = side * hw;
      const xi = side * Math.max(0, hw - TR.depth);
      _c.copy(IMP.hullDark).lerp(IMP.hullShadow, 0.35);
      weather(_c, xo, z, 0);
      const wall = _c.clone();
      const lip = weather(_c.copy(IMP.hullDark), xo, z, 0).clone();
      const a = push(xo, TR.y1, z, lip);
      const b = push(xi, TR.y1 - 0.6, z, lip);
      const c2 = push(xi, TR.y0 + 0.6, z, wall);
      const d = push(xo, TR.y0, z, lip);
      if (i > 0) {
        const base = a - 4;
        for (const [p, q, w] of [
          [base, base + 1, new THREE.Vector3(0, -1, 0)],
          [base + 1, base + 2, want],
          [base + 2, base + 3, new THREE.Vector3(0, 1, 0)],
        ]) {
          const r = p + 4;
          const s2 = q + 4;
          tri(idx, pos, p, q, s2, w);
          tri(idx, pos, p, s2, r, w);
        }
      }
    }
    kit.add("hullDark", makeGeo(pos, uv, col, idx), { uv: "keep", keepColor: true });
    // edge rims: thickened lips along the side edge (segmented long boxes aligned with the edge)
    const yaw = edgeYaw(side);
    const segsR = 10;
    for (let i = 0; i < segsR; i++) {
      const u0 = 0.045 + (i / segsR) * 0.955;
      const u1 = 0.045 + ((i + 1) / segsR) * 0.955;
      const z0 = BOW + u0 * (HULL.sternCornerZ - BOW);
      const z1 = BOW + u1 * (HULL.sternCornerZ - BOW);
      const zm = (z0 + z1) / 2;
      const len = Math.hypot(halfWidth(z1) - halfWidth(z0), z1 - z0) - 1.5;
      const xm = side * (halfWidth(zm) - 1.6);
      const c = weather(_c.copy(IMP.hullMid).lerp(IMP.hullLight, 0.15), xm, zm, 0).clone();
      kit.add("hull", new THREE.BoxGeometry(3.2, 1.1, len), { pos: [xm, TR.y1 + 0.5, zm], rot: [0, yaw, 0], color: c, texel: 1 / 30 });
      kit.add("hull", new THREE.BoxGeometry(3.2, 1.1, len), { pos: [xm, TR.y0 - 0.5, zm], rot: [0, yaw, 0], color: c.clone().lerp(IMP.hullDark, 0.3), texel: 1 / 30 });
    }
  }
  // bow tip: close the side faces forward of the trench start
  {
    const [x, z] = rayPoint(1, 0.046);
    const pos = [0, TR.y0, BOW, 0, TR.y1, BOW, x, TR.y1, z, x, TR.y0, z, -x, TR.y1, z, -x, TR.y0, z];
    const uv = [0, 0, 0, 0.2, 1, 0.2, 1, 0, 1, 0.2, 1, 0];
    const col = [];
    for (let i = 0; i < 6; i++) col.push(IMP.hullDark.r, IMP.hullDark.g, IMP.hullDark.b);
    const idx = [];
    const right = new THREE.Vector3(1, 0, 0);
    const left = new THREE.Vector3(-1, 0, 0);
    tri(idx, pos, 0, 1, 2, right);
    tri(idx, pos, 0, 2, 3, right);
    tri(idx, pos, 0, 1, 4, left);
    tri(idx, pos, 0, 4, 5, left);
    kit.add("hullDark", makeGeo(pos, uv, col, idx), { uv: "keep", keepColor: true });
  }
}

// ---------------------------------------------------------------------------------------------------
// Stern face with heat / soot tints (engines dress it in engines.js)
// ---------------------------------------------------------------------------------------------------
export function buildSternFace(kit) {
  const pos = [];
  const idx = [];
  const col = [];
  const uv = [];
  const cols = 96;
  const rows = 8;
  const grid = [];
  const engines = [...ENGINES.main, ...ENGINES.aux];
  for (let i = 0; i <= cols; i++) {
    const x = -HW + (i / cols) * 2 * HW;
    const z = sternZAt(x) - 0.02;
    const yt = topY(x, z);
    const yb = ventralY(x, z);
    const column = [];
    for (let r = 0; r <= rows; r++) {
      const y = yb + ((yt - yb) * r) / rows;
      _c.copy(IMP.hullDark).lerp(IMP.hullMid, 0.15);
      let heat = 0;
      for (const e of engines) {
        const d = Math.hypot(x - e.x, y - e.y) - e.r * 1.05;
        heat = Math.max(heat, smooth01(1 - d / (e.r * 1.3)));
      }
      _c.lerp(HEAT, heat * 0.55);
      _c.lerp(SOOT, 0.15 + 0.25 * smooth01((y - 10) / 40));
      column.push(pos.length / 3);
      pos.push(x, y, z);
      uv.push(x / 60, y / 60);
      col.push(_c.r, _c.g, _c.b);
    }
    grid.push(column);
  }
  const want = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < rows; r++) {
      const a = grid[i][r];
      const b = grid[i][r + 1];
      const c = grid[i + 1][r + 1];
      const d = grid[i + 1][r];
      // corner faces angle forward; use the local face normal
      want.set(-(pos[d * 3 + 2] - pos[a * 3 + 2]), 0, pos[d * 3] - pos[a * 3]).normalize();
      if (want.z < 0) want.negate();
      tri(idx, pos, a, b, c, want);
      tri(idx, pos, a, c, d, want);
    }
  }
  kit.add("hullDark", makeGeo(pos, uv, col, idx), { uv: "keep", keepColor: true });
}

export { M_PER_U };
