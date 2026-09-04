// Shared Imperial interior vocabulary: panelled walls with black trim, dark grid decks with lit
// walkway lanes, coffered ceilings with recessed light troughs, consoles, railings, pillars, wall
// equipment. Every room builder composes from these so the ship reads as one design language;
// rooms differ in accent colour, layout, props and lighting.
import * as THREE from "three";
import { rng, panelWithHoles, fitUVs } from "../kit.js";
import { PALETTE } from "../materials.js";
import { impDecalRect, IMP_DECAL } from "../textures_imperial.js";

export const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// ---------------------------------------------------------------------------
// Local frame for building on a plane (U along the wall, V up, N out of the wall into the room)
// ---------------------------------------------------------------------------
export class Frame {
  constructor(kit, origin, U, V) {
    this.kit = kit;
    this.o = origin.clone();
    this.U = U.clone().normalize();
    this.V = V.clone().normalize();
    this.N = new THREE.Vector3().crossVectors(this.U, this.V).normalize();
    const m = new THREE.Matrix4().makeBasis(this.U, this.V, this.N);
    this.q = new THREE.Quaternion().setFromRotationMatrix(m);
  }
  pos(u, v, n) {
    return this.o.clone().addScaledVector(this.U, u).addScaledVector(this.V, v).addScaledVector(this.N, n);
  }
  quat(localRot = null) {
    if (!localRot) return this.q;
    return this.q.clone().multiply(localRot);
  }
  box(mat, cu, cv, cn, su, sv, sn, opts = {}) {
    const p = this.pos(cu, cv, cn);
    let q = this.q;
    if (opts.tilt) q = this.quat(new THREE.Quaternion().setFromAxisAngle(X_AXIS, opts.tilt));
    if (opts.spin) q = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, opts.spin));
    const { tilt, spin, ...rest } = opts;
    return this.kit.add(mat, new THREE.BoxGeometry(su, sv, sn), { pos: [p.x, p.y, p.z], quat: q, ...rest });
  }
  cylU(mat, cu, cv, cn, r, len, opts = {}) {
    const p = this.pos(cu, cv, cn);
    const q = this.quat(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2));
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12);
    const { segments, ...rest } = opts;
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  cylV(mat, cu, cv, cn, r, len, opts = {}) {
    const p = this.pos(cu, cv, cn);
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12);
    const { segments, ...rest } = opts;
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: this.q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  cylN(mat, cu, cv, cn, r, len, opts = {}) {
    const p = this.pos(cu, cv, cn);
    const q = this.quat(new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2));
    const g = new THREE.CylinderGeometry(opts.r2 !== undefined ? opts.r2 : r, r, len, opts.segments || 16, 1, opts.open === true);
    const { open, r2, segments, ...rest } = opts;
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  add(mat, geo, cu, cv, cn, opts = {}) {
    const p = this.pos(cu, cv, cn);
    return this.kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: this.q, ...opts });
  }
  decal(index, cu, cv, cn, size, opts = {}) {
    const g = new THREE.PlaneGeometry(size, opts.h || size);
    return this.add("decalImp", g, cu, cv, cn, { uv: "keep", uvRect: impDecalRect(index) });
  }
  screen(matKey, cu, cv, cn, w, h) {
    const g = new THREE.PlaneGeometry(w, h);
    return this.add(matKey, g, cu, cv, cn, { uv: "keep" });
  }
  collider(u0, u1, v0, v1, n0, n1, tag, extra = {}) {
    const corners = [this.pos(u0, v0, n0), this.pos(u1, v0, n0), this.pos(u0, v1, n0), this.pos(u1, v1, n0), this.pos(u0, v0, n1), this.pos(u1, v0, n1), this.pos(u0, v1, n1), this.pos(u1, v1, n1)];
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const c of corners) {
      min.min(c);
      max.max(c);
    }
    this.kit.collider([min.x, min.y, min.z], [max.x, max.y, max.z], tag);
    Object.assign(this.kit.colliders[this.kit.colliders.length - 1], extra);
  }
}

/** Wall frame from -> to (left to right as seen from inside), face plane on the segment, N into the room. */
export function wallFrame(kit, from, to, base = 0) {
  const o = new THREE.Vector3(from[0], base, from[1]);
  const U = new THREE.Vector3(to[0] - from[0], 0, to[1] - from[1]);
  return { frame: new Frame(kit, o, U, UP), length: U.length() };
}
/** Ceiling frame (faces down): origin at (x0, y, z0), U = +X, V = +Z. */
export function ceilingFrame(kit, x0, z0, y) {
  return new Frame(kit, new THREE.Vector3(x0, y, z0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
}
/** Floor frame (faces up): origin at (x0, y, z0), U = +X, V = -Z. */
export function floorFrame(kit, x0, z0, y) {
  return new Frame(kit, new THREE.Vector3(x0, y, z0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1));
}

/**
 * Convert the spec's door list for a room into wall openings for `impWall`.
 * Walls are described by their side; the returned opening has u0/u1 along the wall's U direction.
 * Wall U directions (seen from inside): N wall runs W->E (+x), S wall runs E->W (-x), W wall runs S->N
 * (-z), E wall runs N->S (+z).
 */
export function openingsFor(room, doors, side) {
  const [w, , d] = room.size;
  const out = [];
  for (const dd of doors) {
    if (dd.side !== side) continue;
    let u;
    if (side === "N") u = dd.lx + w / 2;
    else if (side === "S") u = w / 2 - dd.lx;
    else if (side === "W") u = d / 2 - dd.lz;
    else u = dd.lz + d / 2;
    out.push({ type: "door", u0: u - dd.w / 2, u1: u + dd.w / 2, v0: dd.ly || 0, v1: (dd.ly || 0) + dd.h, door: dd });
  }
  return out;
}

/** The four wall frames of a rectangular room (local coords, floor at y = 0). */
export function roomWalls(kit, room) {
  const [w, , d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  return {
    N: wallFrame(kit, [-hx, -hz], [hx, -hz]),
    E: wallFrame(kit, [hx, -hz], [hx, hz]),
    S: wallFrame(kit, [hx, hz], [-hx, hz]),
    W: wallFrame(kit, [-hx, hz], [-hx, -hz]),
  };
}

// ---------------------------------------------------------------------------
// Imperial wall: large pale panels framed by black trim, black kick and cornice, feature cells.
// ---------------------------------------------------------------------------
export function impWall(frame, length, height, opts = {}) {
  const {
    openings = [],
    panelW = 1.7,
    seed = 1,
    kickH = 0.32,
    corniceH = 0.36,
    depth = 0.4,
    features = { vent: 0.1, equipment: 0.1, conduit: 0.06, light: 0.08, screen: 0.04 },
    panelColor = PALETTE.impWhite,
    panelColorAlt = PALETTE.impGrey,
    altChance = 0.18,
    accent = PALETTE.impBlue,
    accentKey = "emitBlue",
    corniceLight = true,
    collide = true,
    tag = "wall",
    lintel = true,
    bands = null, // explicit horizontal band cuts (v values) inside the panel field
    wallLightKey = "emitWhiteSoft", // emitter used by the "light" feature cells (rooms pick their temperature)
  } = opts;
  const rand = rng(seed);
  const trimW = 0.12;
  // backing slab (the wall itself, full depth outward)
  // slab face sits 2 cm behind the panel faces; every layer in front is proud of it (no coplanar fights)
  frame.box("impTrim", length / 2, height / 2, -depth / 2 - 0.02, length, height, depth, { color: PALETTE.impBlack, texel: 0.5 });
  // u cuts
  const nCols = Math.max(1, Math.round(length / panelW));
  let uCuts = [];
  for (let i = 0; i <= nCols; i++) uCuts.push((i / nCols) * length);
  const opEdges = [];
  for (const op of openings) opEdges.push(op.u0, op.u1);
  uCuts = uCuts.filter((c) => !opEdges.some((e) => Math.abs(e - c) < 0.35) && !openings.some((op) => c > op.u0 + 0.01 && c < op.u1 - 0.01));
  uCuts.push(...opEdges.filter((e) => e > 0.001 && e < length - 0.001));
  uCuts.sort((a, b) => a - b);
  uCuts = uCuts.filter((c, i) => i === 0 || c - uCuts[i - 1] > 0.05);
  const fieldV0 = kickH;
  const fieldV1 = height - corniceH;
  const pickFeature = (w, h) => {
    if (w < 0.9 || h < 1.2) return "panel";
    let r = rand();
    for (const k of Object.keys(features)) {
      r -= features[k];
      if (r <= 0) return k;
    }
    return "panel";
  };
  for (let ci = 0; ci < uCuts.length - 1; ci++) {
    const u0 = uCuts[ci];
    const u1 = uCuts[ci + 1];
    const cw = u1 - u0;
    const cu = (u0 + u1) / 2;
    const op = openings.find((o) => cu > o.u0 - 1e-3 && cu < o.u1 + 1e-3);
    // vertical trim strip at the left edge of every column (and the right edge of the last)
    if (!op || ci === 0) frame.box("impTrim", u0 + trimW / 2, height / 2, 0.035, trimW, height, 0.07, { color: PALETTE.impBlack, texel: 1 });
    if (ci === uCuts.length - 2) frame.box("impTrim", u1 - trimW / 2, height / 2, 0.035, trimW, height, 0.07, { color: PALETTE.impBlack, texel: 1 });
    if (op) {
      // opening column: lintel panel above the door, nothing below
      if (lintel && op.v1 < fieldV1 - 0.2) {
        frame.box("impTrim", cu, (op.v1 + fieldV1) / 2, 0.0, cw, fieldV1 - op.v1, 0.06, { color: PALETTE.impBlack, texel: 1 });
        frame.box("impPanel1", cu, (op.v1 + fieldV1) / 2 + 0.02, 0.03, cw - 0.3, fieldV1 - op.v1 - 0.16, 0.03, { color: panelColorAlt, uv: "world", texel: 1 });
        // door number over the opening
        frame.decal(IMP_DECAL.glyphs2, cu, (op.v1 + fieldV1) / 2 + 0.02, 0.05, Math.min(0.5, fieldV1 - op.v1 - 0.3));
      }
      // cornice continues over the door
      frame.box("impTrim", cu, height - corniceH / 2, 0.01, cw, corniceH, 0.06, { color: PALETTE.impBlack, texel: 1 });
      continue;
    }
    // kick
    frame.box("impTrim", cu, kickH / 2, 0.01, cw - trimW, kickH, 0.06, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impMetal", cu, kickH - 0.03, 0.045, cw - trimW - 0.1, 0.03, 0.01, { color: PALETTE.impGreyDark, texel: 2 });
    // cornice with a light channel along its lower edge
    frame.box("impTrim", cu, height - corniceH / 2, 0.01, cw - trimW, corniceH, 0.06, { color: PALETTE.impBlack, texel: 1 });
    if (corniceLight && cw > 0.6) {
      // recessed slot at the wall / ceiling junction: dim, so walls and screens carry the light
      frame.box("impMetal", cu, height - corniceH * 0.55, 0.05, cw - trimW - 0.16, 0.12, 0.02, { color: PALETTE.impCharcoal });
      frame.box("emitWhiteDim", cu, height - corniceH * 0.55, 0.065, cw - trimW - 0.3, 0.05, 0.012, { uv: "keep" });
    }
    // panel field: split into 1–2 horizontal bands
    const vCuts = bands ? [fieldV0, ...bands.filter((b) => b > fieldV0 + 0.3 && b < fieldV1 - 0.3), fieldV1] : rand() < 0.35 && fieldV1 - fieldV0 > 2.4 ? [fieldV0, fieldV0 + 0.9 + rand() * 0.5, fieldV1] : [fieldV0, fieldV1];
    for (let ri = 0; ri < vCuts.length - 1; ri++) {
      const v0 = vCuts[ri];
      const v1 = vCuts[ri + 1];
      const ch = v1 - v0;
      const cv = (v0 + v1) / 2;
      const pw = cw - trimW - 0.04;
      const ph = ch - 0.06;
      if (ri > 0) frame.box("impTrim", cu, v0, 0.045, cw - trimW, 0.05, 0.03, { color: PALETTE.impBlack });
      const feat = pickFeature(pw, ph);
      const variant = Math.floor(rand() * 3);
      const pKey = variant === 0 ? "impPanel" : "impPanel" + variant;
      const col = rand() < altChance ? panelColorAlt : panelColor;
      switch (feat) {
        case "vent": {
          frame.box("impTrim", cu, cv, 0.0, pw, ph, 0.04, { color: PALETTE.impCharcoal, texel: 1 });
          const slots = Math.max(4, Math.floor(ph / 0.14));
          for (let s = 0; s < slots; s++) {
            const sv = v0 + 0.12 + (s / (slots - 1)) * (ch - 0.24);
            frame.box("impMetal", cu, sv, 0.035, pw - 0.24, 0.035, 0.06, { color: PALETTE.impGreyDark, tilt: 0.5 });
          }
          frame.box("impTrim", cu, cv, 0.04, pw - 0.1, 0.05, 0.05, { color: PALETTE.impBlack });
          break;
        }
        case "equipment": {
          frame.box(pKey, cu, cv, 0.005, pw, ph, 0.05, { color: col, uv: "world", texel: 1 });
          const bw = Math.min(pw - 0.3, 1.1);
          const bh = Math.min(ph - 0.5, 1.4);
          const bv = v0 + 0.3 + bh / 2;
          frame.box("impTrim", cu, bv, 0.06, bw, bh, 0.1, { color: PALETTE.impBlack, texel: 1 });
          frame.box("impMetal", cu, bv, 0.115, bw - 0.1, bh - 0.1, 0.02, { color: PALETTE.impCharcoal, texel: 2 });
          // rows of indicator lights + two small readouts
          const n = 3 + Math.floor(rand() * 4);
          for (let k = 0; k < n; k++) {
            const lu = cu - bw / 2 + 0.15 + ((bw - 0.3) * k) / Math.max(1, n - 1);
            frame.box([accentKey, "emitRedImp", "emitWhite", accentKey][Math.floor(rand() * 4)], lu, bv + bh / 2 - 0.16, 0.13, 0.05, 0.05, 0.012);
          }
          frame.screen(rand() < 0.5 ? "scrBlue0" : "scrAmber1", cu, bv - 0.1, 0.128, Math.min(0.5, bw - 0.2), Math.min(0.3, bh * 0.35));
          for (let k = 0; k < 3; k++) frame.box("impGloss", cu - bw / 2 + 0.2 + k * 0.22, bv - bh / 2 + 0.16, 0.13, 0.12, 0.06, 0.02);
          frame.decal(IMP_DECAL.glyphs1, cu, v1 - 0.28, 0.034, 0.3);
          break;
        }
        case "conduit": {
          frame.box("impTrim", cu, cv, 0.0, pw, ph, 0.04, { color: PALETTE.impCharcoal, texel: 1 });
          const n = 2 + Math.floor(rand() * 3);
          for (let p = 0; p < n; p++) {
            const r = 0.035 + rand() * 0.04;
            const pu = cu - pw / 2 + 0.2 + ((p + 0.5) / n) * (pw - 0.4);
            frame.cylV("impMetal", pu, cv, 0.02 + r, r, ch - 0.1, { color: [PALETTE.impGreyDark, PALETTE.impGrey, PALETTE.impCharcoal][p % 3], segments: 10 });
            for (const cv2 of [v0 + 0.2, cv, v1 - 0.2]) frame.box("impTrim", pu, cv2, 0.02 + r, r * 2 + 0.06, 0.07, r * 2 + 0.03, { color: PALETTE.impBlack });
          }
          break;
        }
        case "light": {
          frame.box(pKey, cu, cv, 0.005, pw, ph, 0.05, { color: col, uv: "world", texel: 1 });
          // tall narrow light slot with a black housing
          frame.box("impTrim", cu, cv, 0.05, 0.26, ph - 0.5, 0.08, { color: PALETTE.impBlack });
          frame.box(rand() < 0.7 ? wallLightKey : accentKey, cu, cv, 0.1, 0.1, ph - 0.7, 0.02, { uv: "keep" });
          break;
        }
        case "screen": {
          frame.box(pKey, cu, cv, 0.005, pw, ph, 0.05, { color: col, uv: "world", texel: 1 });
          const sw = Math.min(pw - 0.3, 1.2);
          const sh = Math.min(ph - 0.6, 0.7);
          frame.box("impGloss", cu, cv + 0.1, 0.05, sw + 0.08, sh + 0.08, 0.05);
          frame.screen(["scrBlue0", "scrBlue1", "scrRed0", "scrGreen0", "scrAmber0"][Math.floor(rand() * 5)], cu, cv + 0.1, 0.078, sw, sh);
          break;
        }
        default: {
          frame.box(pKey, cu, cv, 0.005, pw, ph, 0.05, { color: col, uv: "world", texel: 1 });
          // secondary read: an inset seam line, a small stencil or a bolt row
          const sub = rand();
          if (sub < 0.3 && ph > 1.5) frame.box("impTrim", cu, v0 + ch * (0.3 + rand() * 0.4), 0.035, pw - 0.1, 0.02, 0.02, { color: PALETTE.impBlack });
          else if (sub < 0.55) frame.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.bay02, IMP_DECAL.cog, IMP_DECAL.arrowRight][Math.floor(rand() * 5)], cu + (rand() - 0.5) * (pw - 0.6), v0 + 0.5 + rand() * Math.max(0.1, ch - 1.0), 0.032, Math.min(0.42, pw * 0.4));
          else if (sub < 0.7) {
            for (const [bu, bv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) frame.cylN("impMetal", cu + bu * (pw / 2 - 0.09), cv + bv * (ph / 2 - 0.09), 0.04, 0.016, 0.02, { color: PALETTE.impGreyDark, segments: 8 });
          }
        }
      }
    }
  }
  if (collide) {
    const doors = openings.filter((o) => o.type === "door");
    let spans = [[0, length]];
    for (const d of doors) {
      const next = [];
      for (const [a, b] of spans) {
        if (d.u1 <= a || d.u0 >= b) next.push([a, b]);
        else {
          if (d.u0 > a) next.push([a, d.u0]);
          if (d.u1 < b) next.push([d.u1, b]);
        }
      }
      spans = next;
    }
    for (const [a, b] of spans) frame.collider(a, b, 0, height, -depth, 0.08, tag);
  }
}

// ---------------------------------------------------------------------------
// Ceiling: charcoal coffers between black beams, recessed white light troughs along the room axis
// ---------------------------------------------------------------------------
export function impCeiling(kit, x0, z0, x1, z1, y, opts = {}) {
  const { beamStep = 3.2, troughs = 1, troughW = 0.36, seed = 7, accentKey = "emitBlue", withLights = true, dark = PALETTE.impBlack, lightKey = "emitWhiteDim", slabMat = "impMetalRough" } = opts;
  const rand = rng(seed);
  const w = x1 - x0;
  const d = z1 - z0;
  // matte slab by default: the trim material's metalness mirrored every point key as a hot blob
  kit.boxMM(slabMat, [x0, y, z0], [x1, y + 0.4, z1], { color: dark, texel: 0.4 });
  // beams across (x direction) every beamStep along z
  const nB = Math.max(1, Math.round(d / beamStep));
  for (let i = 0; i <= nB; i++) {
    const z = z0 + (i / nB) * d;
    kit.boxMM("impTrim", [x0, y - 0.22, z - 0.12], [x1, y + 0.01, z + 0.12], { color: PALETTE.impBlack, texel: 1 });
  }
  // light troughs along z
  for (let t = 0; t < troughs; t++) {
    const x = x0 + ((t + 0.5) / troughs) * w;
    kit.boxMM("impTrim", [x - troughW / 2 - 0.08, y - 0.02, z0 + 0.2], [x + troughW / 2 + 0.08, y + 0.02, z1 - 0.2], { color: PALETTE.impBlack, texel: 1 });
    for (let i = 0; i < nB; i++) {
      const za = z0 + (i / nB) * d + 0.3;
      const zb = z0 + ((i + 1) / nB) * d - 0.3;
      if (zb - za < 0.6) continue;
      kit.boxMM("impMetal", [x - troughW / 2, y - 0.09, za], [x + troughW / 2, y - 0.03, zb], { color: PALETTE.impCharcoal, texel: 1 });
      // narrow recessed emitter behind louvre fins: a fixture with a shape, never a glowing slab
      if (withLights) kit.boxMM(lightKey, [x - troughW / 2 + 0.1, y - 0.1, za + 0.1], [x + troughW / 2 - 0.1, y - 0.08, zb - 0.1], { uv: "keep" });
      for (let f = za + 0.3; f < zb - 0.2; f += 0.3) kit.boxMM("impTrim", [x - troughW / 2 + 0.05, y - 0.13, f], [x + troughW / 2 - 0.05, y - 0.1, f + 0.02], { color: PALETTE.impBlack });
    }
  }
  // ribs along z inside every coffer (dark relief that catches the room's lights)
  const nR = Math.max(2, Math.round(w / 1.1));
  for (let i = 0; i <= nR; i++) {
    const x = x0 + (i / nR) * w;
    kit.boxMM("impTrim", [x - 0.04, y - 0.08, z0 + 0.15], [x + 0.04, y + 0.01, z1 - 0.15], { color: PALETTE.impCharcoal, texel: 1 });
  }
  // coffers: small vents / accent strips in some cells
  const nC = Math.max(1, Math.round(w / 3.2));
  for (let i = 0; i < nB; i++) {
    for (let c = 0; c < nC; c++) {
      const cx = x0 + ((c + 0.5) / nC) * w;
      const cz = z0 + ((i + 0.5) / nB) * d;
      const r = rand();
      if (r < 0.15) {
        kit.box("impTrim", cx, y - 0.05, cz, 0.9, 0.08, 0.5, { color: PALETTE.impBlack });
        for (let s = 0; s < 5; s++) kit.box("impMetal", cx, y - 0.1, cz - 0.2 + s * 0.1, 0.7, 0.02, 0.03, { color: PALETTE.impGreyDark });
      } else if (r < 0.25) {
        kit.box("impTrim", cx, y - 0.04, cz, 0.6, 0.06, 0.16, { color: PALETTE.impBlack });
        kit.box(accentKey, cx, y - 0.075, cz, 0.45, 0.02, 0.05);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Floor: dark grid deck with a lighter walkway lane and edge trim strips
// ---------------------------------------------------------------------------
export function impFloor(kit, x0, z0, x1, z1, opts = {}) {
  const { lane = false, laneW = 1.8, laneAxis = "z", edgeLight = null, texel = 0.5, y = 0 } = opts;
  kit.boxMM("impDeck", [x0, y - 0.14, z0], [x1, y, z1], { color: PALETTE.impGrey, texel });
  if (lane) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    if (laneAxis === "z") {
      kit.boxMM("impDeck", [cx - laneW / 2, y, z0 + 0.3], [cx + laneW / 2, y + 0.012, z1 - 0.3], { color: PALETTE.impGreyDark, texel: 0.7 });
      for (const s of [-1, 1]) kit.boxMM("impTrim", [cx + s * (laneW / 2) - 0.03, y, z0 + 0.3], [cx + s * (laneW / 2) + 0.03, y + 0.014, z1 - 0.3], { color: PALETTE.impBlack });
    } else {
      kit.boxMM("impDeck", [x0 + 0.3, y, cz - laneW / 2], [x1 - 0.3, y + 0.012, cz + laneW / 2], { color: PALETTE.impGreyDark, texel: 0.7 });
      for (const s of [-1, 1]) kit.boxMM("impTrim", [x0 + 0.3, y, cz + s * (laneW / 2) - 0.03], [x1 - 0.3, y + 0.014, cz + s * (laneW / 2) + 0.03], { color: PALETTE.impBlack });
    }
  }
  if (edgeLight) {
    // recessed floor-edge light strips along the long walls
    const inset = 0.25;
    kit.boxMM(edgeLight, [x0 + inset, y + 0.002, z0 + 0.5], [x0 + inset + 0.06, y + 0.012, z1 - 0.5]);
    kit.boxMM(edgeLight, [x1 - inset - 0.06, y + 0.002, z0 + 0.5], [x1 - inset, y + 0.012, z1 - 0.5]);
  }
}

// ---------------------------------------------------------------------------
// Console: black shell, sloped top with screens, button field, side panels. Faces -Z (local) by default;
// rotate via `yaw`. w along x, d along z. Returns nothing; adds a collider.
// ---------------------------------------------------------------------------
export function impConsole(kit, cx, cy, cz, w, d, opts = {}) {
  const { yaw = 0, seed = 3, screens = ["scrBlue0", "scrBlue1"], accentKey = "emitBlue", height = 0.85, tall = false } = opts;
  const rand = rng(seed);
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(cx, cy, cz));
  const addBox = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
    const p = place(lx, ly, lz);
    const qq = extra.tilt ? q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, extra.tilt)) : q;
    const { tilt, ...rest } = extra;
    kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: qq, ...rest });
  };
  // shell
  addBox("impTrim", 0, height / 2, 0, w, height, d, { color: PALETTE.impBlack, texel: 1 });
  addBox("impMetal", 0, 0.06, 0, w + 0.04, 0.12, d + 0.04, { color: PALETTE.impCharcoal, texel: 1 });
  // operator-side recess (the +Z side is where the operator stands; the sloped top faces +Z)
  addBox("impMetal", 0, height * 0.45, d / 2 - 0.02, w - 0.2, height * 0.5, 0.03, { color: PALETTE.impGreyDark, texel: 1 });
  addBox(accentKey, 0, 0.18, d / 2 + 0.005, w - 0.4, 0.025, 0.01);
  // sloped top (toward the operator)
  const tilt = 0.28;
  const topD = d * 0.75;
  addBox("impGloss", 0, height + 0.05, -d * 0.08, w - 0.08, 0.05, topD, { tilt });
  const nS = Math.max(1, Math.min(screens.length, Math.floor((w - 0.3) / 0.75)));
  for (let i = 0; i < nS; i++) {
    const sx = -w / 2 + 0.2 + ((w - 0.4) * (i + 0.5)) / nS;
    const sw = Math.min(0.7, (w - 0.4) / nS - 0.1);
    const p = place(sx, height + 0.09 + 0.12 * Math.sin(tilt), -d * 0.08 - 0.1);
    const g = new THREE.PlaneGeometry(sw, topD * 0.42);
    g.rotateX(-Math.PI / 2);
    const qq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
    kit.add(screens[i % screens.length], g, { pos: [p.x, p.y, p.z], quat: qq, uv: "keep" });
  }
  // button field along the operator edge
  const nb = Math.floor((w - 0.3) / 0.11);
  for (let i = 0; i < nb; i++) {
    const bx = -w / 2 + 0.2 + i * 0.11;
    const r = rand();
    const mat = r < 0.22 ? accentKey : r < 0.32 ? "emitRedImp" : r < 0.36 ? "emitWhiteSoft" : "impGloss";
    const p = place(bx, height + 0.085 - 0.03, d * 0.24);
    const qq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
    kit.add(mat, new THREE.BoxGeometry(0.07, 0.03, 0.07), { pos: [p.x, p.y, p.z], quat: qq });
  }
  // a couple of toggles / dials
  for (let i = 0; i < Math.max(1, Math.floor(w / 0.9)); i++) {
    const p = place(-w / 2 + 0.45 + i * 0.9, height + 0.12, d * 0.1);
    kit.add("impMetal", new THREE.CylinderGeometry(0.035, 0.04, 0.05, 10), { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.impGrey, uv: "scale", uvScale: [0.2, 0.1] });
  }
  if (tall) {
    // upright back panel with a large screen (station with a display column)
    addBox("impTrim", 0, height + 0.55, -d / 2 + 0.1, w - 0.1, 1.1, 0.16, { color: PALETTE.impBlack, texel: 1 });
    const p = place(0, height + 0.6, -d / 2 + 0.19);
    const g = new THREE.PlaneGeometry(w - 0.4, 0.8);
    kit.add(screens[0], g, { pos: [p.x, p.y, p.z], quat: q, uv: "keep" });
  }
  // collider (AABB of the rotated footprint)
  const corners = [place(-w / 2, 0, -d / 2), place(w / 2, 0, -d / 2), place(-w / 2, 0, d / 2), place(w / 2, 0, d / 2)];
  const min = new THREE.Vector3(Infinity, cy, Infinity);
  const max = new THREE.Vector3(-Infinity, cy + height + (tall ? 1.2 : 0.2), -Infinity);
  for (const c of corners) {
    min.x = Math.min(min.x, c.x);
    min.z = Math.min(min.z, c.z);
    max.x = Math.max(max.x, c.x);
    max.z = Math.max(max.z, c.z);
  }
  kit.collider([min.x, min.y, min.z], [max.x, max.y, max.z], "console");
}

// Operator chair (black shell, grey pad), facing -Z locally
export function impChair(kit, cx, cy, cz, yaw = 0, opts = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(cx, cy, cz));
  const addBox = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
    const p = place(lx, ly, lz);
    const qq = extra.tilt ? q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, extra.tilt)) : q;
    const { tilt, ...rest } = extra;
    kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: qq, ...rest });
  };
  const p0 = place(0, 0.2, 0);
  kit.add("impMetal", new THREE.CylinderGeometry(0.07, 0.09, 0.4, 10), { pos: [p0.x, p0.y, p0.z], color: PALETTE.impCharcoal, uv: "scale", uvScale: [0.4, 0.4] });
  const p1 = place(0, 0.02, 0);
  kit.add("impTrim", new THREE.CylinderGeometry(0.3, 0.32, 0.04, 16), { pos: [p1.x, p1.y, p1.z], color: PALETTE.impBlack, uv: "scale", uvScale: [1, 0.1] });
  addBox("impTrim", 0, 0.46, 0, 0.56, 0.1, 0.54, { color: PALETTE.impBlack });
  addBox("rubber", 0, 0.53, 0.02, 0.44, 0.05, 0.44, { color: PALETTE.impGreyDark });
  addBox("impTrim", 0, 0.95, 0.27, 0.5, 0.9, 0.1, { color: PALETTE.impBlack, tilt: -0.15 });
  addBox("rubber", 0, 0.95, 0.21, 0.4, 0.75, 0.04, { color: PALETTE.impGreyDark, tilt: -0.15 });
  for (const s of [-1, 1]) addBox("impTrim", s * 0.31, 0.72, 0.05, 0.05, 0.05, 0.4, { color: PALETTE.impBlack });
  if (opts.collide !== false) kit.collider([cx - 0.3, cy, cz - 0.3], [cx + 0.3, cy + 1.2, cz + 0.3], "chair");
}

// Railing along a segment (posts + two rails), room-local
export function impRailing(kit, from, to, y = 0, opts = {}) {
  const { h = 1.05, postStep = 1.6, color = PALETTE.impGreyDark, light = null } = opts;
  const a = new THREE.Vector3(from[0], y, from[1]);
  const b = new THREE.Vector3(to[0], y, to[1]);
  const dir = b.clone().sub(a);
  const L = dir.length();
  dir.normalize();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const yaw = Math.atan2(dir.x, dir.z);
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const rail = (yy, r) => kit.add("impMetal", new THREE.CylinderGeometry(r, r, L, 10).rotateX(Math.PI / 2), { pos: [mid.x, yy, mid.z], quat: q, color, uv: "scale", uvScale: [0.3, L] });
  rail(y + h, 0.03);
  rail(y + h * 0.55, 0.02);
  const n = Math.max(2, Math.round(L / postStep) + 1);
  for (let i = 0; i < n; i++) {
    const p = a.clone().addScaledVector(dir, (L * i) / (n - 1));
    kit.box("impTrim", p.x, y + h / 2, p.z, 0.06, h, 0.06, { color: PALETTE.impBlack });
    kit.box("impTrim", p.x, y + 0.03, p.z, 0.16, 0.06, 0.16, { color: PALETTE.impBlack });
  }
  if (light) {
    const g = new THREE.BoxGeometry(0.03, 0.03, L - 0.2);
    kit.add(light, g, { pos: [mid.x, y + h - 0.06, mid.z], quat: q });
  }
  // collider chain (short boxes) so diagonal runs do not fence off their bounding square
  const m = Math.max(1, Math.ceil(L / 0.45));
  for (let i = 0; i < m; i++) {
    const p0 = a.clone().addScaledVector(dir, (L * i) / m);
    const p1 = a.clone().addScaledVector(dir, (L * (i + 1)) / m);
    kit.collider([Math.min(p0.x, p1.x) - 0.06, y, Math.min(p0.z, p1.z) - 0.06], [Math.max(p0.x, p1.x) + 0.06, y + h, Math.max(p0.z, p1.z) + 0.06], "rail");
  }
}

// Structural pillar (black, with a lit inset), room-local
export function impPillar(kit, x, z, h, opts = {}) {
  const { w = 0.6, accentKey = "emitBlue", y = 0 } = opts;
  kit.box("impTrim", x, y + h / 2, z, w, h, w, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", x, y + 0.2, z, w + 0.1, 0.4, w + 0.1, { color: PALETTE.impCharcoal, texel: 1 });
  kit.box("impMetal", x, y + h - 0.2, z, w + 0.1, 0.4, w + 0.1, { color: PALETTE.impCharcoal, texel: 1 });
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    kit.box(accentKey, x + dx * (w / 2 + 0.005), y + h / 2, z + dz * (w / 2 + 0.005), dx ? 0.01 : 0.04, h - 1.2, dz ? 0.01 : 0.04);
  }
  kit.collider([x - w / 2, y, z - w / 2], [x + w / 2, y + h, z + w / 2], "pillar");
}

// Wall-mounted equipment cluster (junction box, conduit drop, valve, stencil) on a wall frame at u
export function impWallGear(frame, u, v, opts = {}) {
  const { seed = 1, accentKey = "emitBlue" } = opts;
  const rand = rng(seed);
  frame.box("impTrim", u, v, 0.08, 0.5, 0.7, 0.16, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", u, v, 0.165, 0.42, 0.62, 0.01, { color: PALETTE.impCharcoal, texel: 2 });
  frame.box("leds", u, v + 0.2, 0.172, 0.3, 0.04, 0.005, { uv: "keep" });
  frame.box(accentKey, u - 0.14, v - 0.05, 0.172, 0.04, 0.04, 0.008);
  frame.box("emitRedImp", u - 0.06, v - 0.05, 0.172, 0.04, 0.04, 0.008);
  frame.screen("scrAmber0", u + 0.08, v - 0.08, 0.172, 0.2, 0.12);
  for (let k = 0; k < 2 + Math.floor(rand() * 2); k++) {
    const r = 0.015 + rand() * 0.015;
    frame.cylV("impMetal", u - 0.15 + k * 0.12, v - 0.35 - 0.4, 0.06, r, 0.8, { color: PALETTE.impGreyDark, segments: 8 });
  }
  frame.decal(IMP_DECAL.power, u + 0.35, v + 0.2, 0.001, 0.22);
}

// Wall-mounted light fixture (housing + emitter) on a wall frame
export function impWallLight(frame, u, v, opts = {}) {
  const { key = "emitWhiteSoft", w = 0.9 } = opts;
  frame.box("impTrim", u, v, 0.05, w, 0.16, 0.1, { color: PALETTE.impBlack });
  frame.box(key, u, v, 0.1, w - 0.16, 0.05, 0.02, { uv: "keep" });
}

// Storage crate (Imperial: dark grey box with black corner frames and a stencil)
export function impCrate(kit, cx, cy, cz, sx, sy, sz, opts = {}) {
  const { color = PALETTE.impGreyDark, seed = 1, decal = IMP_DECAL.bay01 } = opts;
  kit.box("impPanel1", cx, cy + sy / 2, cz, sx, sy, sz, { color, uv: "world", texel: 1 });
  kit.box("impTrim", cx, cy + sy / 2, cz, sx + 0.02, sy * 0.12, sz + 0.02, { color: PALETTE.impBlack });
  kit.box("impTrim", cx, cy + sy - 0.03, cz, sx + 0.02, 0.06, sz + 0.02, { color: PALETTE.impBlack });
  kit.box("impTrim", cx, cy + 0.03, cz, sx + 0.02, 0.06, sz + 0.02, { color: PALETTE.impBlack });
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) kit.box("impTrim", cx + dx * (sx / 2), cy + sy / 2, cz + dz * (sz / 2), 0.06, sy, 0.06, { color: PALETTE.impBlack });
  const g = new THREE.PlaneGeometry(Math.min(sx, sy) * 0.4, Math.min(sx, sy) * 0.4);
  kit.add("decalImp", g, { pos: [cx, cy + sy * 0.55, cz + sz / 2 + 0.002], uv: "keep", uvRect: impDecalRect(decal) });
  kit.collider([cx - sx / 2, cy, cz - sz / 2], [cx + sx / 2, cy + sy, cz + sz / 2], "crate");
}

/**
 * Standard shell for a rectangular room: four Imperial walls (with the spec's door openings), floor,
 * ceiling. Room builders call this first, then add the room's own contents.
 */
export function impRoomShell(kit, room, doors, opts = {}) {
  const [w, h, d] = room.size;
  const walls = roomWalls(kit, room);
  const seed = opts.seed || room.id.length * 131;
  const accentKey = opts.accentKey || "emitBlue";
  for (const side of ["N", "E", "S", "W"]) {
    const { frame, length } = walls[side];
    impWall(frame, length, h, { openings: openingsFor(room, doors, side), seed: seed + side.charCodeAt(0), accentKey, tag: room.id + side, ...(opts.wall || {}), ...(opts.walls && opts.walls[side] ? opts.walls[side] : {}) });
  }
  impFloor(kit, -w / 2, -d / 2, w / 2, d / 2, { laneAxis: w > d ? "x" : "z", edgeLight: opts.floorEdgeLight || null, ...(opts.floor || {}) });
  impCeiling(kit, -w / 2, -d / 2, w / 2, d / 2, h, { troughs: Math.max(1, Math.round(Math.min(w, d) / 6)), seed: seed + 3, accentKey, ...(opts.ceiling || {}) });
  return walls;
}

/**
 * Point-light intensity (candela) that lights a floor `drop` metres below the fixture to a
 * comfortable level under the ACES tone mapper (inverse-square, decay 2). ~11 cd at 2.8 m.
 */
export function lux(drop, k = 1.4) {
  return k * drop * drop;
}

/** Default light rig for a room: one white key per ~6.5 m of length in the ceiling trough(s). */
export function impDefaultLights(kit, room, opts = {}) {
  const [w, h, d] = room.size;
  const { color = 0xdfe8ff, k = 1.6, step = 6.5, priority = 0.5, accent = null } = opts;
  const long = Math.max(w, d);
  const short = Math.min(w, d);
  const nL = Math.max(1, Math.round(long / step));
  const nS = short > 12 ? 2 : 1;
  const drop = h - 0.7;
  for (let i = 0; i < nL; i++) {
    for (let j = 0; j < nS; j++) {
      const p = -long / 2 + ((i + 0.5) / nL) * long;
      const q = nS === 1 ? 0 : -short / 4 + (j * short) / 2;
      const pos = w > d ? [p, drop, q] : [q, drop, p];
      kit.light({ type: "point", pos, color, intensity: lux(drop, k), distance: Math.max(8, drop * 3.2), priority: priority - i * 0.01 - j * 0.005 });
    }
  }
  if (accent) kit.light({ type: "point", pos: [0, 0.3, 0], color: accent, intensity: lux(short * 0.3, 0.5), distance: short * 0.8, priority: 0.3 });
}
