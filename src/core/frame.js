// Local frames for building on planes (walls, ceilings, slanted panels) and the Imperial panel grid — the
// workhorse for every wall and ceiling: dark plating, recessed white light bands, black control panels,
// vents, hatches, conduit recesses and angular pilasters, carved around door openings.
import * as THREE from "three";
import { panelWithHoles, fitUVs, insideOut, rng } from "./kit.js";
import { IMP } from "./palette.js";
import { decalRect, ledRect, screenRect } from "../textures.js";

export const UP = new THREE.Vector3(0, 1, 0);
export const X_AXIS = new THREE.Vector3(1, 0, 0);
export const Z_AXIS = new THREE.Vector3(0, 0, 1);

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
  // cylinder along local U
  cylU(mat, cu, cv, cn, r, len, opts = {}) {
    const p = this.pos(cu, cv, cn);
    const q = this.quat(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2));
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12);
    const { segments, ...rest } = opts;
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  // cylinder along local V
  cylV(mat, cu, cv, cn, r, len, opts = {}) {
    const p = this.pos(cu, cv, cn);
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12);
    const { segments, ...rest } = opts;
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: this.q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  // cylinder along local N (protruding)
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
  // flat decal quad from the atlas, lying on the frame plane
  decal(cu, cv, cn, w, h, index, opts = {}) {
    return this.add("decal", new THREE.PlaneGeometry(w, h), cu, cv, cn, { uv: "keep", uvRect: decalRect(index), ...opts });
  }
  // AABB collider for a local rect (u0..u1, v0..v1, n0..n1)
  collider(u0, u1, v0, v1, n0, n1, tag) {
    const corners = [
      this.pos(u0, v0, n0),
      this.pos(u1, v0, n0),
      this.pos(u0, v1, n0),
      this.pos(u1, v1, n0),
      this.pos(u0, v0, n1),
      this.pos(u1, v0, n1),
      this.pos(u0, v1, n1),
      this.pos(u1, v1, n1),
    ];
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const c of corners) {
      min.min(c);
      max.max(c);
    }
    return this.kit.collider([min.x, min.y, min.z], [max.x, max.y, max.z], tag);
  }
}

// Wall frame: from -> to (left to right as seen from inside the room), face plane at the segment.
export function wallFrame(kit, from, to, base = 0) {
  const o = new THREE.Vector3(from[0], base, from[1]);
  const U = new THREE.Vector3(to[0] - from[0], 0, to[1] - from[1]);
  return { frame: new Frame(kit, o, U, UP), length: U.length() };
}

// Ceiling frame (faces down). origin at (x0, y, z0), U=+X, V=+Z.
export function ceilingFrame(kit, x0, z0, y) {
  return new Frame(kit, new THREE.Vector3(x0, y, z0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
}

// Floor frame (faces up). origin at (x0, y, z0), U=+X, V=-Z.
export function floorFrame(kit, x0, z0, y) {
  return new Frame(kit, new THREE.Vector3(x0, y, z0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1));
}

// Default Imperial style weights per band
export const IMPERIAL_STYLES = { plate: 0.66, panel: 0.1, vent: 0.08, hatch: 0.06, pipes: 0.06, screen: 0.04 };
export const IMPERIAL_TINTS = [
  [IMP.plate, 0.55],
  [IMP.plateDark, 0.25],
  [IMP.plateBlue, 0.12],
  [IMP.plateLight, 0.08],
];

/** Default row cuts for a wall of height h: kick, lower plates, light band, upper plates, cornice. */
export function imperialRows(h, { strip = true } = {}) {
  if (h <= 3.2) return strip ? [0, 0.35, 1.55, 1.75, h] : [0, 0.35, 1.6, h];
  if (h <= 5.2) return strip ? [0, 0.35, 1.6, 1.85, 3.3, h] : [0, 0.35, 1.6, 3.3, h];
  if (h <= 8) return strip ? [0, 0.35, 1.6, 1.85, 3.6, 5.2, h] : [0, 0.35, 1.8, 3.6, 5.2, h];
  // tall industrial walls: coarse rows, strip band at 2 m and every ~6 m after
  const rows = [0, 0.4, 1.9, 2.15];
  let y = 2.15;
  while (y + 6 < h) {
    y += 5.6;
    rows.push(y, y + 0.3);
    y += 0.3;
  }
  rows.push(h);
  return rows;
}

/**
 * Imperial panel grid over a frame.
 * opts: openings [{type:'door'|'window'|'porthole', u0,u1,v0,v1}], rows, panelW, depth, seed, styles, tints,
 *       bands [{v0,v1,style:'strip', mat}], pilasterEvery, collide, tag, accent (emissive material for indicators),
 *       stripMat (default emitWhiteSoft), stripEvery (skip pattern for strip cells, 1 = continuous)
 */
export function panelGrid(frame, length, height, opts = {}) {
  const {
    openings = [],
    rows = null,
    panelW = 1.6,
    depth = 0.2,
    seed = 1,
    styles = IMPERIAL_STYLES,
    tints = IMPERIAL_TINTS,
    bands = null,
    pilasterEvery = 0,
    collide = true,
    tag = "wall",
    accent = "emitBlue",
    stripMat = "emitWhiteSoft",
    stripEvery = 1,
    kick = true,
    cornice = true,
    detail = 1,
  } = opts;
  let stripIndex = 0;
  const rand = rng(seed);
  const gap = 0.03;
  const baseRows = rows || imperialRows(height);
  // strip bands: any base row pair thinner than 0.35 m that is not the kick is a light band
  const stripBands = bands || baseRows.slice(0, -1).map((r, i) => [r, baseRows[i + 1]]).filter(([a, b], i) => i > 0 && b - a < 0.35 && b - a > 0.12).map(([v0, v1]) => ({ v0, v1, style: "strip" }));

  // u cuts
  const nCols = Math.max(1, Math.round(length / panelW));
  let uCuts = [];
  for (let i = 0; i <= nCols; i++) uCuts.push((i / nCols) * length);
  const opEdgesU = [];
  for (const op of openings) opEdgesU.push(op.u0, op.u1);
  uCuts = uCuts.filter((c) => !opEdgesU.some((e) => Math.abs(e - c) < 0.3) && !openings.some((op) => c > op.u0 + 0.01 && c < op.u1 - 0.01));
  uCuts.push(...opEdgesU.filter((e) => e > 0.001 && e < length - 0.001));
  uCuts.sort((a, b) => a - b);
  uCuts = uCuts.filter((c, i) => i === 0 || c - uCuts[i - 1] > 0.05);

  const columnVCuts = (u0, u1) => {
    const colOps = openings.filter((op) => op.u1 > u0 + 1e-3 && op.u0 < u1 - 1e-3);
    const opEdgesV = [];
    for (const op of colOps) {
      if (op.v0 > 0.001) opEdgesV.push(op.v0);
      if (op.v1 < height - 0.001) opEdgesV.push(op.v1);
    }
    let vCuts = baseRows.filter((c) => c <= height + 1e-6 && !opEdgesV.some((e) => Math.abs(e - c) < 0.2) && !colOps.some((op) => c > op.v0 + 0.01 && c < op.v1 - 0.01));
    if (!vCuts.some((c) => Math.abs(c - height) < 1e-6)) vCuts.push(height);
    vCuts.push(...opEdgesV);
    vCuts.sort((a, b) => a - b);
    vCuts = vCuts.filter((c, i) => i === 0 || c - vCuts[i - 1] > 0.05);
    return vCuts;
  };

  const pickTint = () => {
    let r = rand();
    for (const [c, w] of tints) {
      r -= w;
      if (r <= 0) return c;
    }
    return tints[0][0];
  };
  const pickStyle = (w, h) => {
    if (w < 0.5 || h < 0.5) return "plate";
    let r = rand();
    for (const k of Object.keys(styles)) {
      r -= styles[k];
      if (r <= 0) return k;
    }
    return "plate";
  };
  const plateBox = (cu, cv, cn, w, hh, d, color) => {
    const g = frame.box("plate", cu, cv, cn, w, hh, d, { color, uv: "keep" });
    if (rand() < 0.5) mirrorUVs(g, rand);
    return g;
  };

  for (let ci = 0; ci < uCuts.length - 1; ci++) {
    const u0 = uCuts[ci];
    const u1 = uCuts[ci + 1];
    const cw = u1 - u0;
    const cu = (u0 + u1) / 2;
    const vCuts = columnVCuts(u0, u1);
    const nRows = vCuts.length - 1;
    for (let ri = 0; ri < nRows; ri++) {
      const v0 = vCuts[ri];
      const v1 = vCuts[ri + 1];
      const ch = v1 - v0;
      const cv = (v0 + v1) / 2;
      const op = openings.find((o) => cu > o.u0 - 1e-3 && cu < o.u1 + 1e-3 && cv > o.v0 - 1e-3 && cv < o.v1 + 1e-3);
      if (op) {
        if (op.type === "porthole") porthole(frame, cu, cv, cw, ch, depth, op);
        else if (op.type === "window") windowCell(frame, cu, cv, cw, ch, depth, op);
        continue;
      }
      // backing plate (dark, slightly recessed)
      frame.box("paintedMetal", cu, cv, -depth + 0.05, cw, ch, 0.1, { color: IMP.darkMetal, texel: 0.8 });
      const band = stripBands.find((b) => cv > b.v0 - 1e-3 && cv < b.v1 + 1e-3);
      let style;
      if (ri === 0 && kick && v0 < 0.01) style = "kick";
      else if (band) style = band.style;
      else if (ri === nRows - 1 && cornice && v1 > height - 0.01 && ch < 0.9) style = "cornice";
      else style = pickStyle(cw, ch);

      switch (style) {
        case "kick":
          frame.box("paintedMetal", cu, cv, -0.04, cw - gap, ch - gap, 0.08, { color: IMP.black, texel: 1.5 });
          frame.box("metal", cu, v1 - 0.03, 0.0, cw - gap, 0.02, 0.02, { color: IMP.steelDark });
          break;
        case "cornice":
          frame.box("paintedMetal", cu, cv, -0.06, cw - gap, ch - gap, 0.08, { color: IMP.trim, texel: 1.5 });
          frame.box("metal", cu, v0 + 0.04, 0.0, cw - gap, 0.03, 0.03, { color: IMP.steelDark });
          break;
        case "strip": {
          // recessed U-channel: black back plate, steel lips top and bottom, the diffuser sitting in the recess
          // in front of the back plate (a diffuser buried inside a solid housing never renders)
          const m = band && band.mat ? band.mat : stripMat;
          frame.box("paintedMetal", cu, cv, -0.14, cw, ch, 0.04, { color: IMP.black, texel: 1 });
          frame.box("metal", cu, v1 - 0.012, -0.08, cw, 0.024, 0.16, { color: IMP.steelDark });
          frame.box("metal", cu, v0 + 0.012, -0.08, cw, 0.024, 0.16, { color: IMP.steelDark });
          // stripEvery > 1 leaves every Nth cell as a dark housing (broken runs on long industrial walls)
          if (stripEvery <= 1 || stripIndex++ % stripEvery !== stripEvery - 1) frame.box(m, cu, cv, -0.1, cw - 0.02, ch - 0.06, 0.02, { uv: "keep" });
          else frame.box("darkGloss", cu, cv, -0.1, cw - 0.02, ch - 0.06, 0.02);
          break;
        }
        case "panel": {
          // black control panel: bezel, LED matrix, a small status screen on wide cells
          plateBox(cu, cv, -0.05, cw - gap * 2, ch - gap * 2, 0.06, IMP.plateDark);
          const pw = cw - 0.26;
          const ph = Math.min(ch - 0.26, 1.1);
          frame.box("darkGloss", cu, cv, -0.005, pw, ph, 0.03);
          const rows = Math.max(1, Math.min(4, Math.floor(ph / 0.22)));
          for (let r = 0; r < rows; r++) {
            const lv = cv - ph / 2 + 0.11 + r * ((ph - 0.22) / Math.max(1, rows - 1) || 0);
            if (rows === 1) {
              frame.box("leds", cu, cv, 0.012, pw - 0.1, Math.min(0.12, ph - 0.1), 0.006, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
              break;
            }
            frame.box("leds", cu, lv, 0.012, pw - 0.1, 0.1, 0.006, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
          }
          if (cw > 1.2 && ch > 1.2 && rand() < 0.6) {
            frame.box("screen", cu + pw * 0.2, cv - ph * 0.28, 0.014, Math.min(0.5, pw * 0.4), Math.min(0.28, ph * 0.3), 0.005, { uv: "keep", uvRect: screenRect(Math.floor(rand() * 16)) });
          }
          frame.box(rand() < 0.5 ? accent : "emitRed", u0 + 0.12, v1 - 0.12, 0.0, 0.05, 0.05, 0.02);
          break;
        }
        case "vent": {
          frame.box("paintedMetal", cu, cv, -0.08, cw - gap * 2, ch - gap * 2, 0.06, { color: IMP.black, texel: 1 });
          const slats = Math.max(3, Math.min(6, Math.floor((ch - 0.2) / 0.16)));
          for (let s = 0; s < slats; s++) {
            const sv = v0 + 0.14 + (s / (slats - 1)) * (ch - 0.28);
            frame.box("metal", cu, sv, -0.03, cw - 0.2, 0.035, 0.1, { color: IMP.steelDark, tilt: 0.5 });
          }
          frame.box("paintedMetal", cu, cv, -0.02, cw - gap * 2, 0.05, 0.05, { color: IMP.plateDark });
          frame.box("paintedMetal", cu, v0 + 0.05, -0.02, cw - gap * 2, 0.05, 0.05, { color: IMP.plateDark });
          frame.box("paintedMetal", cu, v1 - 0.05, -0.02, cw - gap * 2, 0.05, 0.05, { color: IMP.plateDark });
          break;
        }
        case "hatch": {
          const col = pickTint();
          plateBox(cu, cv, -0.04, cw - gap * 2, ch - gap * 2, 0.06, col);
          const hw = Math.min(cw * 0.36, 0.55);
          const hh = Math.min(ch * 0.36, 0.55);
          frame.box("paintedMetal", cu, cv, 0.0, hw * 2 + 0.06, hh * 2 + 0.06, 0.02, { color: IMP.black, texel: 2 });
          plateBox(cu, cv, 0.02, hw * 2, hh * 2, 0.03, IMP.plateDark);
          frame.box("hazard", cu, cv + hh + 0.06, 0.005, hw * 2 + 0.06, 0.05, 0.01, { texel: 3 });
          frame.box("metal", cu - hw + 0.08, cv, 0.04, 0.05, 0.16, 0.03, { color: IMP.steel });
          frame.box("metal", cu + hw - 0.08, cv, 0.04, 0.05, 0.16, 0.03, { color: IMP.steel });
          frame.box(accent, cu + hw - 0.1, cv + hh - 0.1, 0.036, 0.04, 0.04, 0.01);
          break;
        }
        case "pipes": {
          frame.box("paintedMetal", cu, cv, -0.1, cw - gap * 2, ch - gap * 2, 0.06, { color: IMP.black, texel: 1 });
          const n = 2 + Math.floor(rand() * 2);
          for (let p = 0; p < n; p++) {
            const r = 0.03 + rand() * 0.035;
            const pu = u0 + 0.16 + ((p + 0.5) / n) * (cw - 0.32);
            const col = [IMP.steel, IMP.steelDark, IMP.gunmetal][Math.floor(rand() * 3)];
            frame.cylV("metal", pu, cv, -0.07 + r, r, ch - 0.08, { color: col, segments: 10 });
            frame.box("paintedMetal", pu, v0 + 0.14, -0.07 + r, r * 2 + 0.05, 0.06, r * 2 + 0.02, { color: IMP.darkMetal });
            frame.box("paintedMetal", pu, v1 - 0.14, -0.07 + r, r * 2 + 0.05, 0.06, r * 2 + 0.02, { color: IMP.darkMetal });
          }
          frame.box("paintedMetal", cu, cv, -0.02, cw - gap * 2, 0.06, 0.04, { color: IMP.plateDark });
          break;
        }
        case "screen": {
          plateBox(cu, cv, -0.05, cw - gap * 2, ch - gap * 2, 0.06, IMP.plateDark);
          const sw = Math.min(1.0, cw - 0.3);
          const sh = Math.min(0.56, ch - 0.3, sw * 0.6);
          frame.box("darkGloss", cu, cv, -0.005, sw + 0.08, sh + 0.08, 0.03);
          frame.box("screen", cu, cv, 0.012, sw, sh, 0.005, { uv: "keep", uvRect: screenRect(Math.floor(rand() * 16)) });
          frame.box("leds", cu, v0 + 0.1, -0.01, Math.min(0.6, cw - 0.4), 0.06, 0.02, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
          break;
        }
        default: {
          // plate: every one gets a secondary read (seam, bolts, sub-plate, stencil) so nothing is flat
          const col = pickTint();
          plateBox(cu, cv, -0.03, cw - gap * 2, ch - gap * 2, 0.06, col);
          if (detail <= 0) break;
          const big = cw > 0.7 && ch > 0.7;
          const sub = rand();
          if (sub < 0.22 && big) {
            plateBox(cu, cv, 0.0, cw - 0.36, ch - 0.36, 0.02, IMP.plateDark);
            for (const [bu, bv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
              frame.cylN("metal", cu + bu * (cw / 2 - 0.1), cv + bv * (ch / 2 - 0.1), 0.005, 0.014, 0.02, { color: IMP.steel, segments: 8 });
            }
          } else if (sub < 0.42 && big) {
            if (rand() < 0.5) frame.box("paintedMetal", cu, v0 + ch * (0.35 + rand() * 0.3), 0.0, cw - gap * 2, 0.02, 0.07, { color: IMP.black });
            else frame.box("paintedMetal", u0 + cw * (0.35 + rand() * 0.3), cv, 0.0, 0.02, ch - gap * 2, 0.07, { color: IMP.black });
          } else if (sub < 0.6 && big) {
            const idx = Math.floor(rand() * 16);
            const dw = Math.min(0.5, cw * 0.5, ch * 0.5);
            frame.decal(cu + (rand() - 0.5) * Math.max(0, cw - dw - 0.3), cv + (rand() - 0.5) * Math.max(0, ch - dw - 0.3), 0.001, dw, dw, idx);
          } else if (sub < 0.78) {
            const n = Math.max(2, Math.floor(cw / 0.35));
            for (let b = 0; b < n; b++) {
              const bu = u0 + 0.1 + ((cw - 0.2) * b) / Math.max(1, n - 1);
              frame.cylN("metal", bu, v0 + 0.07, 0.005, 0.012, 0.02, { color: IMP.steel, segments: 8 });
              frame.cylN("metal", bu, v1 - 0.07, 0.005, 0.012, 0.02, { color: IMP.steel, segments: 8 });
            }
          } else if (big) {
            // small indicator cluster
            frame.box("darkGloss", u1 - 0.22, v0 + 0.2, -0.005, 0.28, 0.14, 0.02);
            frame.box("leds", u1 - 0.22, v0 + 0.2, 0.008, 0.24, 0.08, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
          }
        }
      }
    }
  }
  // pilasters: angular vertical structure protruding from the wall between panel columns
  if (pilasterEvery > 0) {
    for (let u = pilasterEvery; u < length - 0.5; u += pilasterEvery) {
      if (openings.some((op) => op.type !== "porthole" && u > op.u0 - 0.5 && u < op.u1 + 0.5)) continue;
      pilaster(frame, u, height, 0.28);
    }
  }
  if (collide) {
    const doors = openings.filter((o) => o.type === "door" || o.type === "arch");
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
    for (const [a, b] of spans) frame.collider(a, b, 0, height, -depth, 0.05, tag);
  }
}

/** Angular Imperial pilaster: a proud vertical column with chamfered faces and a thin light slot. */
export function pilaster(frame, u, height, w = 0.28, { slot = true, depth = 0.22 } = {}) {
  frame.box("paintedMetal", u, height / 2, depth / 2 - 0.02, w, height, depth, { color: IMP.plateDark, texel: 1 });
  frame.box("paintedMetal", u, height / 2, depth + 0.03, w - 0.1, height - 0.2, 0.1, { color: IMP.black, texel: 1 });
  frame.box("metal", u - w / 2 - 0.01, height / 2, depth / 2 - 0.02, 0.03, height, depth - 0.04, { color: IMP.steelDark });
  frame.box("metal", u + w / 2 + 0.01, height / 2, depth / 2 - 0.02, 0.03, height, depth - 0.04, { color: IMP.steelDark });
  if (slot) frame.box("emitWhiteSoft", u, height * 0.55, depth + 0.085, 0.025, height * 0.55, 0.01, { uv: "keep" });
  frame.collider(u - w / 2, u + w / 2, 0, height, 0, depth + 0.1, "pilaster");
}

/** Rectangular window set into a wall cell (glazing recessed into the wall thickness). */
function windowCell(frame, cu, cv, cw, ch, depth, op) {
  const plate = panelWithHoles(cw, ch, depth, [{ x: 0, y: 0, w: cw - 0.24, h: ch - 0.24 }]);
  fitUVs(plate, cw, ch);
  frame.add("plate", plate, cu, cv, -depth / 2, { color: IMP.plateDark, uv: "keep" });
  const bezel = panelWithHoles(cw - 0.16, ch - 0.16, 0.04, [{ x: 0, y: 0, w: cw - 0.3, h: ch - 0.3 }]);
  fitUVs(bezel, cw - 0.16, ch - 0.16);
  frame.add("paintedMetal", bezel, cu, cv, 0.0, { color: IMP.black, uv: "keep" });
  frame.add("glass", new THREE.PlaneGeometry(cw - 0.24, ch - 0.24), cu, cv, -depth * 0.6, { uv: "keep" });
  if (op.collide !== false) frame.collider(cu - cw / 2, cu + cw / 2, cv - ch / 2, cv + ch / 2, -depth, 0.05, "window");
}

/** Round porthole set into a wall cell. */
export function porthole(frame, cu, cv, cw, ch, depth, op) {
  const r = op.r || Math.min(cw, ch) * 0.33;
  const plate = panelWithHoles(cw, ch, depth, [{ x: 0, y: 0, r }]);
  fitUVs(plate, cw, ch);
  frame.add("plate", plate, cu, cv, -depth / 2, { color: IMP.plateDark, uv: "keep" });
  frame.add("metalRough", new THREE.TorusGeometry(r + 0.03, 0.045, 10, 36), cu, cv, 0.0, { color: IMP.steelDark, uv: "scale", uvScale: [4, 1] });
  const sleeveLen = Math.min(0.3, depth);
  const sleeve = insideOut(new THREE.CylinderGeometry(r - 0.004, r - 0.004, sleeveLen, 36, 1, true));
  sleeve.rotateX(Math.PI / 2);
  frame.add("metal", sleeve, cu, cv, 0.01 - sleeveLen / 2, { color: IMP.gunmetal, uv: "scale", uvScale: [6, 1] });
  frame.add("glass", new THREE.CircleGeometry(r, 36), cu, cv, -sleeveLen * 0.5, { uv: "keep" });
}

// Mirror a box's default UVs at random so repeated panel textures don't read as copies.
export function mirrorUVs(geo, rand) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  const flipU = rand() < 0.5;
  const flipV = rand() < 0.5;
  if (!flipU && !flipV) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, flipU ? 1 - uv.getX(i) : uv.getX(i), flipV ? 1 - uv.getY(i) : uv.getY(i));
  }
}

/**
 * Ceiling with recessed light channels: panel grid plus emissive strips at a given spacing.
 * frame: ceilingFrame; w along U (x), d along V (z). dir 'u' runs the strips along U.
 */
export function imperialCeiling(frame, w, d, { seed = 9, stripSpacing = 4, stripW = 0.3, stripMat = "emitWhiteSoft", dir = "v", panelW = 1.8, styles = { plate: 0.85, vent: 0.1, pipes: 0.05 } } = {}) {
  panelGrid(frame, w, d, { rows: null, panelW, kick: false, cornice: false, seed, collide: false, styles, bands: [], tints: [[IMP.plateDark, 0.7], [IMP.trim, 0.3]], detail: 0 });
  const along = dir === "u" ? w : d;
  const across = dir === "u" ? d : w;
  const n = Math.max(1, Math.floor(across / stripSpacing));
  for (let i = 0; i < n; i++) {
    const c = ((i + 0.5) / n) * across;
    const cu = dir === "u" ? along / 2 : c;
    const cv = dir === "u" ? c : along / 2;
    const su = dir === "u" ? along - 0.6 : stripW + 0.16;
    const sv = dir === "u" ? stripW + 0.16 : along - 0.6;
    frame.box("paintedMetal", cu, cv, 0.06, su, sv, 0.14, { color: IMP.black, texel: 1 });
    frame.box(stripMat, cu, cv, 0.13, dir === "u" ? along - 0.8 : stripW, dir === "u" ? stripW : along - 0.8, 0.01, { uv: "keep" });
  }
}
