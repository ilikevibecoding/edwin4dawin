// Shared interior builders: local frames, the panel-grid wall system, portholes and light helpers.
// Extracted from the original ship.js so every room module (legacy Kestrel rooms and the new
// Star Destroyer decks) builds with the same kit and reads as one ship.
import * as THREE from "three";
import { panelWithHoles, rng, insideOut, fitUVs } from "../kit.js";
import { PALETTE } from "../materials.js";
import { decalRect, GRATE_TILE } from "../textures.js";

export const UP = new THREE.Vector3(0, 1, 0);
export const X_AXIS = new THREE.Vector3(1, 0, 0);
export const Z_AXIS = new THREE.Vector3(0, 0, 1);

// Walls are 0.16 thick per side; a shared wall is two back-to-back (0.32).
export const WALL_T = 0.16;
export const DOOR_H = 2.1;

// ---------------------------------------------------------------------------
// Local frame for building on a plane (walls, ceilings, slanted panels)
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
    return this.o
      .clone()
      .addScaledVector(this.U, u)
      .addScaledVector(this.V, v)
      .addScaledVector(this.N, n);
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
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...opts });
  }
  // cylinder along local V
  cylV(mat, cu, cv, cn, r, len, opts = {}) {
    const p = this.pos(cu, cv, cn);
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12);
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: this.q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...opts });
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
    this.kit.collider([min.x, min.y, min.z], [max.x, max.y, max.z], tag);
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

// ---------------------------------------------------------------------------
// Panel grid: the workhorse for every wall / ceiling
// ---------------------------------------------------------------------------
export function panelGrid(frame, length, height, opts = {}) {
  const {
    openings = [],
    rows = null,
    rowH = 1.0,
    panelW = 1.05,
    depth = 0.16,
    seed = 1,
    kick = true,
    topPipes = true,
    styles = { panel: 0.62, vent: 0.08, greeble: 0.11, strip: 0.07, screen: 0.05, conduit: 0.07 },
    paints = [
      [PALETTE.cream, 0.74],
      [PALETTE.creamDark, 0.08],
      [PALETTE.gunmetal, 0.09],
      [PALETTE.tealPaint, 0.05],
      [PALETTE.orange, 0.04],
    ],
    collide = true,
    tag = "wall",
  } = opts;
  const rand = rng(seed);
  const gap = 0.025;

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

  // base v cuts (rows); per-column cuts are derived below around openings
  let baseRows;
  if (rows) baseRows = rows.filter((r) => r <= height + 1e-6);
  else if (kick) baseRows = [0, 0.45, 1.55, 2.2, height].filter((r) => r <= height + 1e-6);
  else {
    const n = Math.max(1, Math.round(height / rowH));
    baseRows = [];
    for (let i = 0; i <= n; i++) baseRows.push((i / n) * height);
  }
  if (!baseRows.some((c) => Math.abs(c - height) < 1e-6)) baseRows.push(height);
  const columnVCuts = (u0, u1) => {
    const colOps = openings.filter((op) => op.u1 > u0 + 1e-3 && op.u0 < u1 - 1e-3);
    const opEdgesV = [];
    for (const op of colOps) {
      if (op.v0 > 0.001) opEdgesV.push(op.v0);
      if (op.v1 < height - 0.001) opEdgesV.push(op.v1);
    }
    let vCuts = baseRows.filter((c) => !opEdgesV.some((e) => Math.abs(e - c) < 0.25) && !colOps.some((op) => c > op.v0 + 0.01 && c < op.v1 - 0.01));
    vCuts.push(...opEdgesV);
    vCuts.sort((a, b) => a - b);
    vCuts = vCuts.filter((c, i) => i === 0 || c - vCuts[i - 1] > 0.05);
    return vCuts;
  };

  const pickPaint = () => {
    let r = rand();
    for (const [c, w] of paints) {
      r -= w;
      if (r <= 0) return c;
    }
    return paints[0][0];
  };
  // painted panels: rotate through texture variants + mirrored UVs so wear never repeats obviously
  const paintBox = (cu, cv, cn, w, hh, d, color) => {
    const variant = Math.floor(rand() * 3);
    const g = frame.box(variant === 0 ? "painted" : "painted" + variant, cu, cv, cn, w, hh, d, { color, uv: "keep" });
    jitterPanelUVs(g, rand);
    return g;
  };
  const pickStyle = (w, h, row, nRows) => {
    if (row === 0 && kick) return "kick";
    if (row === nRows - 1 && topPipes) return "top";
    if (w < 0.45 || h < 0.45) return "panel";
    let r = rand();
    for (const k of Object.keys(styles)) {
      r -= styles[k];
      if (r <= 0) return k;
    }
    return "panel";
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
        continue;
      }
      const style = pickStyle(cw, ch, ri, nRows);
      // backing plate (never thicker than the wall, so thin partitions keep their painted face in front)
      const plateT = Math.min(0.1, Math.max(0.02, depth - 0.03));
      frame.box("metal", cu, cv, -depth + plateT / 2, cw, ch, plateT, { color: PALETTE.darkMetal, texel: 1.2 });
      switch (style) {
        case "kick":
          frame.box("metal", cu, cv, -0.03, cw - gap, ch - gap, 0.06, { color: PALETTE.gunmetal, texel: 1.5 });
          // scuff strip
          frame.box("rubber", cu, v0 + 0.04, 0.0, cw - gap, 0.06, 0.02, { color: PALETTE.rubber });
          break;
        case "top": {
          // panel + two continuous pipes across the top row
          paintBox(cu, cv, -0.05, cw - gap * 2, ch - gap * 2, 0.06, pickPaint());
          frame.cylU("metal", cu, v0 + ch * 0.3, 0.02, 0.045, cw + 0.002, { color: PALETTE.steel, segments: 10 });
          frame.cylU("metal", cu, v0 + ch * 0.68, 0.0, 0.03, cw + 0.002, { color: PALETTE.orange, segments: 8 });
          // clamps
          frame.box("metal", u0 + 0.06, v0 + ch * 0.3, 0.0, 0.05, 0.14, 0.07, { color: PALETTE.gunmetal });
          frame.box("metal", u1 - 0.06, v0 + ch * 0.3, 0.0, 0.05, 0.14, 0.07, { color: PALETTE.gunmetal });
          break;
        }
        case "vent": {
          frame.box("metal", cu, cv, -0.05, cw - gap * 2, ch - gap * 2, 0.04, { color: PALETTE.gunmetal });
          const slats = Math.max(3, Math.floor((ch - 0.2) / 0.09));
          for (let s = 0; s < slats; s++) {
            const sv = v0 + 0.12 + (s / (slats - 1)) * (ch - 0.24);
            frame.box("metal", cu, sv, -0.02, cw - 0.16, 0.025, 0.08, { color: PALETTE.steel, tilt: 0.55 });
          }
          frame.box("painted", cu, cv, -0.04, cw - gap * 2, 0.06, 0.05, { color: PALETTE.orange, uv: "keep" });
          break;
        }
        case "greeble": {
          // equipment panel: painted backing, a dark bezel, then a cluster of small devices
          paintBox(cu, cv, -0.05, cw - gap * 2, ch - gap * 2, 0.06, PALETTE.creamDark);
          frame.box("paintedMetal", cu, cv, -0.015, cw - 0.16, ch - 0.16, 0.01, { color: PALETTE.darkMetal, texel: 2 });
          const n = 4 + Math.floor(rand() * 4);
          for (let g = 0; g < n; g++) {
            const gw = 0.06 + rand() * Math.min(0.18, cw * 0.25);
            const gh = 0.04 + rand() * Math.min(0.14, ch * 0.25);
            const gd = 0.025 + rand() * 0.05;
            const gu = u0 + 0.15 + rand() * (cw - 0.3);
            const gv = v0 + 0.15 + rand() * (ch - 0.3);
            const cols = [PALETTE.gunmetal, PALETTE.steel, PALETTE.slate, PALETTE.darkMetal];
            const r = rand();
            if (r < 0.55) {
              frame.box("metal", gu, gv, -0.01 + gd / 2, gw, gh, gd, { color: cols[Math.floor(rand() * cols.length)], texel: 3 });
              if (rand() < 0.5) frame.box(rand() < 0.5 ? "emitOrange" : "emitTeal", gu + gw * 0.3, gv, -0.01 + gd + 0.004, 0.018, 0.018, 0.008);
            } else if (r < 0.8) {
              frame.cylN("metal", gu, gv, -0.01 + gd / 2, 0.02 + rand() * 0.03, gd, { color: PALETTE.steel, segments: 12 });
            } else {
              // small labelled plate
              frame.box("painted", gu, gv, -0.005, gw + 0.04, gh + 0.02, 0.01, { color: PALETTE.cream, uv: "keep" });
              frame.add("decal", new THREE.PlaneGeometry(gh, gh), gu, gv, 0.001, { uv: "keep", uvRect: decalRect(9 + Math.floor(rand() * 3)) });
            }
          }
          // a run of conduit feeding the panel
          const pu = u0 + 0.1 + rand() * (cw - 0.2);
          frame.cylV("metal", pu, cv, 0.0, 0.014, ch - 0.1, { color: PALETTE.steel, segments: 8 });
          if (rand() < 0.7) frame.box("leds", u0 + cw * 0.5, v0 + 0.1, 0.0, Math.min(0.5, cw - 0.3), 0.045, 0.02, { uv: "keep" });
          break;
        }
        case "strip": {
          frame.box("metal", cu, cv, -0.05, cw - gap * 2, ch - gap * 2, 0.04, { color: PALETTE.gunmetal });
          paintBox(cu, cv, -0.04, cw - gap * 2, ch - gap * 2 - 0.3, 0.06, pickPaint());
          // housing + emissive
          frame.box("metal", cu, v1 - 0.09, -0.02, cw - 0.2, 0.08, 0.05, { color: PALETTE.darkMetal });
          frame.box("emitTeal", cu, v1 - 0.09, 0.005, cw - 0.28, 0.03, 0.02);
          frame.box("metal", cu, v0 + 0.09, -0.02, cw - 0.2, 0.08, 0.05, { color: PALETTE.darkMetal });
          frame.box("emitTeal", cu, v0 + 0.09, 0.005, cw - 0.28, 0.03, 0.02);
          break;
        }
        case "screen": {
          paintBox(cu, cv, -0.05, cw - gap * 2, ch - gap * 2, 0.06, PALETTE.creamDark);
          const sw = Math.min(0.62, cw - 0.25);
          const sh = Math.min(0.36, ch - 0.25);
          frame.box("darkGloss", cu, cv, -0.005, sw + 0.06, sh + 0.06, 0.03);
          frame.box("screen" + Math.floor(rand() * 4), cu, cv, 0.012, sw, sh, 0.005, { uv: "keep" });
          frame.box("leds", cu, v0 + 0.08, -0.01, Math.min(0.5, cw - 0.3), 0.045, 0.02, { uv: "keep" });
          break;
        }
        case "conduit": {
          frame.box("metal", cu, cv, -0.05, cw - gap * 2, ch - gap * 2, 0.04, { color: PALETTE.gunmetal });
          const n = 2 + Math.floor(rand() * 3);
          for (let p = 0; p < n; p++) {
            const r = 0.025 + rand() * 0.035;
            const pu = u0 + 0.14 + ((p + 0.5) / n) * (cw - 0.28);
            const col = [PALETTE.steel, PALETTE.gunmetal, PALETTE.orange, PALETTE.steel][Math.floor(rand() * 4)];
            frame.cylV("metal", pu, cv, -0.02 + r, r, ch - 0.06, { color: col, segments: 10 });
            frame.box("metal", pu, v0 + 0.12, -0.02 + r, r * 2 + 0.05, 0.06, r * 2 + 0.02, { color: PALETTE.darkMetal });
            frame.box("metal", pu, v1 - 0.12, -0.02 + r, r * 2 + 0.05, 0.06, r * 2 + 0.02, { color: PALETTE.darkMetal });
          }
          break;
        }
        default: {
          // painted panel; every one gets some secondary read (seam, bolts, hatch, inner plate or a decal)
          const col = pickPaint();
          paintBox(cu, cv, -0.03, cw - gap * 2, ch - gap * 2, 0.06, col);
          const big = cw > 0.6 && ch > 0.6;
          const sub = rand();
          if (sub < 0.22 && big) {
            // raised inner plate with bolts
            paintBox(cu, cv, 0.005, cw - 0.3, ch - 0.3, 0.02, col);
            for (const [bu, bv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
              frame.cylN("metal", cu + bu * (cw / 2 - 0.1), cv + bv * (ch / 2 - 0.1), 0.01, 0.014, 0.02, { color: PALETTE.steel, segments: 8 });
            }
          } else if (sub < 0.42 && big) {
            // recessed seam splitting the panel + a small latch plate
            if (rand() < 0.5) frame.box("metal", cu, v0 + ch * (0.35 + rand() * 0.3), 0.0, cw - gap * 2, 0.014, 0.07, { color: PALETTE.darkMetal });
            else frame.box("metal", u0 + cw * (0.35 + rand() * 0.3), cv, 0.0, 0.014, ch - gap * 2, 0.07, { color: PALETTE.darkMetal });
            frame.box("metal", u1 - 0.16, v0 + 0.14, 0.005, 0.12, 0.05, 0.03, { color: PALETTE.gunmetal });
          } else if (sub < 0.58 && big) {
            // access hatch: smaller plate with hinge blocks and a recessed handle
            const hw2 = Math.min(0.42, cw * 0.36);
            const hh2 = Math.min(0.42, ch * 0.36);
            const hu = cu + (rand() - 0.5) * (cw - hw2 * 2 - 0.2);
            const hv = cv + (rand() - 0.5) * (ch - hh2 * 2 - 0.2);
            frame.box("metal", hu, hv, -0.01, hw2 * 2 + 0.03, hh2 * 2 + 0.03, 0.02, { color: PALETTE.darkMetal });
            paintBox(hu, hv, 0.01, hw2 * 2, hh2 * 2, 0.02, rand() < 0.5 ? col : PALETTE.creamDark);
            frame.box("metal", hu - hw2 - 0.01, hv + hh2 * 0.5, 0.012, 0.03, 0.08, 0.03, { color: PALETTE.steel });
            frame.box("metal", hu - hw2 - 0.01, hv - hh2 * 0.5, 0.012, 0.03, 0.08, 0.03, { color: PALETTE.steel });
            frame.box("darkGloss", hu + hw2 * 0.55, hv, 0.018, 0.1, 0.04, 0.01);
          } else if (sub < 0.85) {
            // stencil decal
            const idx = Math.floor(rand() * 16);
            const dw = Math.min(0.42, cw * 0.55, ch * 0.55);
            const du = cu + (rand() - 0.5) * Math.max(0, cw - dw - 0.2);
            const dv = cv + (rand() - 0.5) * Math.max(0, ch - dw - 0.2);
            frame.add("decal", new THREE.PlaneGeometry(dw, dw), du, dv, 0.001, { uv: "keep", uvRect: decalRect(idx) });
            if (rand() < 0.5) frame.cylN("metal", u0 + 0.07, v1 - 0.07, 0.01, 0.014, 0.02, { color: PALETTE.steel, segments: 8 });
          } else {
            // bolts along the top and bottom edge
            const n = Math.max(2, Math.floor(cw / 0.3));
            for (let b = 0; b < n; b++) {
              const bu = u0 + 0.1 + ((cw - 0.2) * b) / Math.max(1, n - 1);
              frame.cylN("metal", bu, v0 + 0.07, 0.01, 0.014, 0.02, { color: PALETTE.steel, segments: 8 });
              frame.cylN("metal", bu, v1 - 0.07, 0.01, 0.014, 0.02, { color: PALETTE.steel, segments: 8 });
            }
          }
        }
      }
    }
  }
  if (collide) {
    // one collider per u-span not covered by a floor-reaching opening (doors, junctions, lift portals);
    // portholes / windows / hatches above the floor keep the wall solid
    const doors = openings.filter((o) => o.type !== "porthole" && o.type !== "window" && (o.v0 === undefined || o.v0 <= 0.01) && !o.solid);
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
    for (const [a, b] of spans) frame.collider(a, b, 0, height, -depth, 0.02, tag);
  }
}

// Round porthole set into a wall cell.
export function porthole(frame, cu, cv, cw, ch, depth, op) {
  const r = op.r || Math.min(cw, ch) * 0.33;
  // painted (dielectric) plate: a metal plate only mirrors the dark interior env and reads black
  const plate = panelWithHoles(cw, ch, depth, [{ x: 0, y: 0, r: r }]);
  fitUVs(plate, cw, ch);
  frame.add("painted1", plate, cu, cv, -depth / 2, { color: PALETTE.slate, uv: "keep" });
  // raised cast bezel square around the ring with corner bolts (breaks up the flat plate); the
  // lower-right corner carries the shutter control box instead of a bolt
  const bz = r + 0.14;
  const bezel = panelWithHoles(bz * 2, bz * 2, 0.02, [{ x: 0, y: 0, r: r + 0.11 }]);
  fitUVs(bezel, bz * 2, bz * 2);
  // dark *paint* rather than bare metal: a metallic bezel only mirrors the dark interior env map
  frame.add("painted2", bezel, cu, cv, 0.01, { color: PALETTE.gunmetal, uv: "keep" });
  for (const [su, sv] of [[-1, -1], [-1, 1], [1, 1]]) {
    frame.cylN("metal", cu + su * (bz - 0.045), cv + sv * (bz - 0.045), 0.02, 0.016, 0.02, { color: PALETTE.steel, segments: 8 });
  }
  // outer ring frame (proud, cast metal so lights spread rather than ring-flare), inner bevel ring
  frame.add("metalRough", new THREE.TorusGeometry(r + 0.03, 0.045, 10, 36), cu, cv, 0.0, { color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
  frame.add("metalRough", new THREE.TorusGeometry(r + 0.07, 0.03, 8, 36), cu, cv, -0.02, { color: PALETTE.orange, uv: "scale", uvScale: [4, 1] });
  // shutter control box on the bezel's lower-right corner (lever, status LEDs, spec plate)
  const bu = cu + bz - 0.065;
  const bv = cv - bz + 0.1;
  const bn = 0.02;
  frame.box("metalRough", bu, bv, bn + 0.025, 0.11, 0.18, 0.05, { color: PALETTE.gunmetal });
  frame.box("painted", bu, bv, bn + 0.051, 0.09, 0.16, 0.01, { color: PALETTE.creamDark, uv: "keep" });
  frame.box("metal", bu - 0.025, bv + 0.02, bn + 0.07, 0.02, 0.08, 0.03, { color: PALETTE.steel });
  frame.box("rubber", bu - 0.025, bv + 0.065, bn + 0.075, 0.03, 0.03, 0.04, { color: PALETTE.rubber });
  frame.box("emitTeal", bu + 0.025, bv + 0.05, bn + 0.057, 0.02, 0.02, 0.006);
  frame.box("emitOrange", bu + 0.025, bv + 0.02, bn + 0.057, 0.02, 0.02, 0.006);
  frame.add("decal", new THREE.PlaneGeometry(0.08, 0.08), bu, bv - 0.05, bn + 0.057, { uv: "keep", uvRect: decalRect(9) });
  // hull sleeve through the wall thickness, faces flipped so it renders from inside the tube
  const sleeveLen = 0.2;
  // a hair inside the plate's hole wall so the two never fight
  const sleeve = insideOut(new THREE.CylinderGeometry(r - 0.004, r - 0.004, sleeveLen, 36, 1, true));
  sleeve.rotateX(Math.PI / 2);
  frame.add("metal", sleeve, cu, cv, 0.01 - sleeveLen / 2, { color: PALETTE.gunmetal, uv: "scale", uvScale: [6, 1] });
  // outer lip so the far end of the tube reads as hull plating, not a paper edge
  const lip = insideOut(new THREE.CylinderGeometry(r, r + 0.06, 0.05, 36, 1, true));
  lip.rotateX(Math.PI / 2);
  frame.add("metal", lip, cu, cv, 0.01 - sleeveLen - 0.02, { color: PALETTE.darkMetal, uv: "scale", uvScale: [6, 1] });
  // glass, set into the tube
  const glass = new THREE.CircleGeometry(r, 36);
  frame.add("glass", glass, cu, cv, -0.1, { uv: "keep" });
  // closed blast shutter behind the glass for portholes that face into the ship's own structure
  if (op.shutter || PORTHOLE_DEFAULTS.shutter) {
    const disc = new THREE.CircleGeometry(r - 0.006, 36);
    frame.add("paintedMetal", disc, cu, cv, -0.16, { color: PALETTE.darkMetal, uv: "keep" });
    for (let i = -2; i <= 2; i++) frame.box("metal", cu, cv + i * (r * 0.36), -0.15, r * 1.7, 0.012, 0.008, { color: PALETTE.gunmetal });
    frame.box("emitRed", cu + r * 0.55, cv - r * 0.72, -0.14, 0.03, 0.03, 0.006);
  }
}

// Module-wide porthole behaviour, set by builders whose rooms sit inside the hull (no view out).
export const PORTHOLE_DEFAULTS = { shutter: false };

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
// Global practical-light scale (candela). Tuned by eye against the tone mapper.
export const LIGHT_SCALE = 0.8;

export function pointLight(color, intensity, distance, pos) {
  const l = new THREE.PointLight(color, intensity * LIGHT_SCALE, distance, 2);
  l.position.set(pos[0], pos[1], pos[2]);
  return l;
}

// Junction boxes with a status LED and a short cable drop along a chamfer, every `step` metres.
export function chamferBoxes(f, len, chLen, step) {
  for (let u = step; u < len - 0.5; u += step * 2) {
    f.box("metalRough", u, chLen * 0.18, 0.05, 0.28, 0.16, 0.1, { color: PALETTE.gunmetal });
    f.box("painted", u, chLen * 0.18, 0.101, 0.22, 0.11, 0.008, { color: PALETTE.creamDark, uv: "keep" });
    f.box("emitTeal", u + 0.08, chLen * 0.18 + 0.03, 0.106, 0.02, 0.012, 0.006);
    f.box("leds", u - 0.03, chLen * 0.18 - 0.03, 0.106, 0.1, 0.02, 0.006, { uv: "keep" });
    f.cylV("rubber", u - 0.1, chLen * 0.3, 0.04, 0.012, chLen * 0.1, { color: PALETTE.rubber, segments: 8 });
  }
}

// Unshadowed spot standing outside a window, aimed into the room: cool "space light" that cannot
// reach the window frame's own face.
export function windowSpot(color, intensity, pos, target, angle = 0.42) {
  const s = new THREE.SpotLight(color, intensity * LIGHT_SCALE, 10, angle, 0.7, 1.8);
  s.position.set(pos[0], pos[1], pos[2]);
  s.target.position.set(target[0], target[1], target[2]);
  return s;
}

// Mirror a box's default UVs at random so repeated panel textures don't read as copies.
export function jitterPanelUVs(geo, rand) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  const flipU = rand() < 0.5;
  const flipV = rand() < 0.5;
  if (!flipU && !flipV) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, flipU ? 1 - uv.getX(i) : uv.getX(i), flipV ? 1 - uv.getY(i) : uv.getY(i));
  }
}

export function colorGeo(geo, color, texel) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  if (texel) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * texel, uv.getY(i) * texel);
  }
}
