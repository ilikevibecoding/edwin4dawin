// Briefing-room-local props (tiered auditorium furniture, status boards, cable trays). Everything is
// kit-bashed; colliders are world AABBs. Shared props stay untouched (see _shared/props.js).
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../_shared/palette.js";

const BLACK = IMP.impBlack;
const DARK = IMP.impDark;
const MID = IMP.impMid;

// Fixed auditorium seat: pedestal, cushion, backrest, armrests. Faces -Z (toward the screen wall).
export function fixedSeat(kit, x, y, z) {
  kit.box("paintedMetal", x, y + 0.2, z, 0.14, 0.4, 0.14, { color: BLACK });
  kit.box("paintedMetal", x, y + 0.02, z, 0.4, 0.04, 0.4, { color: BLACK });
  kit.box("fabric", x, y + 0.45, z, 0.56, 0.1, 0.52, { color: DARK, texel: 2 });
  kit.box("paintedMetal", x, y + 0.4, z, 0.5, 0.03, 0.46, { color: BLACK });
  // backrest: cushion + shell, leaning 8 degrees aft
  const lean = -0.14;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, 0, 0));
  kit.add("fabric", new THREE.BoxGeometry(0.52, 0.56, 0.07), { pos: [x, y + 0.79, z + 0.26], quat: q, color: DARK, texel: 2 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.56, 0.6, 0.03), { pos: [x, y + 0.79, z + 0.31], quat: q, color: BLACK });
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", x + s * 0.31, y + 0.66, z + 0.04, 0.05, 0.04, 0.4, { color: DARK });
    kit.box("paintedMetal", x + s * 0.31, y + 0.55, z + 0.2, 0.04, 0.22, 0.04, { color: BLACK });
  }
}

// Continuous desk edge for one seating row: modesty panel, top, a lit key strip lying flat, an edge
// glow toward the seated officers, and a data slot per seat. Spans x0..x1 at the tier front z0.
export function deskRow(kit, x0, x1, y, z0, seats, seed) {
  const rand = rng(seed);
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  const zf = z0 + 0.32; // modesty panel front
  kit.box("paintedMetal", cx, y + 0.36, zf + 0.03, len, 0.72, 0.06, { color: BLACK, texel: 1 }); // modesty panel
  kit.box("paintedMetal", cx, y + 0.2, zf + 0.035, len - 0.2, 0.3, 0.005, { color: DARK }); // recessed band
  kit.box("paintedMetal", cx, y + 0.745, zf + 0.26, len, 0.05, 0.52, { color: BLACK, texel: 1 }); // top
  kit.box("paintedMetal", cx, y + 0.72, zf + 0.5, len - 0.1, 0.03, 0.04, { color: DARK }); // lip
  kit.box("emitBlue", cx, y + 0.7, zf + 0.53, len - 0.3, 0.012, 0.01); // edge glow toward the seats
  // per-seat inset panel: darkGloss plate + a row of flat keys + a small readout
  for (const sx of seats) {
    kit.box("darkGloss", sx, y + 0.772, zf + 0.22, 0.7, 0.008, 0.28);
    for (let i = 0; i < 9; i++) {
      if (rand() < 0.3) continue;
      const r = rand();
      const m = r < 0.5 ? "emitBlue" : r < 0.8 ? "emitAmber" : "emitRedImp";
      kit.box(m, sx - 0.24 + i * 0.06, y + 0.78, zf + 0.32, 0.035, 0.006, 0.03);
    }
    kit.box(rand() < 0.5 ? "screenImp0" : "screenImp1", sx, y + 0.78, zf + 0.15, 0.46, 0.006, 0.12, { uv: "keep" });
  }
}

// Wall status board: black plate with a lighter frame, a header bar and rows of amber/blue bars of
// varied length (a duty roster / system status readout). `yaw` gives the facing direction like props.
export function statusBoard(kit, pos, yaw, w, h, seed, { accent = "emitAmber", secondary = "emitBlue", rows = 5 } = {}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  const box = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: W(lx, ly, lz), rot, ...opts });
  const rand = rng(seed);
  box("paintedMetal", 0, 0, 0.03, w + 0.16, h + 0.16, 0.06, { color: DARK, texel: 1 });
  box("paintedMetal", 0, 0, 0.065, w, h, 0.01, { color: BLACK });
  box("darkGloss", 0, 0, 0.072, w - 0.06, h - 0.06, 0.004);
  // header
  box(accent, 0, h / 2 - 0.09, 0.078, w - 0.16, 0.025, 0.004);
  box(accent, -w / 2 + 0.32, h / 2 - 0.16, 0.078, 0.48, 0.05, 0.004);
  for (let k = 0; k < 3; k++) box(secondary, w / 2 - 0.2 - k * 0.2, h / 2 - 0.16, 0.078, 0.12, 0.05, 0.004);
  // rows of bars
  const top = h / 2 - 0.3;
  const bottom = -h / 2 + 0.12;
  const pitch = (top - bottom) / rows;
  for (let i = 0; i < rows; i++) {
    const y = top - (i + 0.5) * pitch;
    const label = 0.35 + rand() * 0.25;
    box(rand() < 0.75 ? secondary : accent, -w / 2 + 0.12 + label / 2, y, 0.078, label, 0.03, 0.004);
    const nb = 2 + Math.floor(rand() * 4);
    let x = -w / 2 + 0.2 + label;
    for (let j = 0; j < nb && x < w / 2 - 0.3; j++) {
      const bw = 0.15 + rand() * 0.45;
      if (x + bw > w / 2 - 0.15) break;
      const r = rand();
      const m = r < 0.55 ? secondary : r < 0.9 ? accent : "emitRedImp";
      box(m, x + bw / 2, y, 0.078, bw, pitch * 0.42, 0.004);
      x += bw + 0.08;
    }
  }
  // corner bolts
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box("metal", (sx * (w + 0.1)) / 2, (sy * (h + 0.1)) / 2, 0.062, 0.03, 0.03, 0.01, { color: IMP.steel });
}

// Amber status strip in a black housing, wall mounted, running along local X.
export function statusStrip(kit, pos, yaw, len, mat = "emitAmber") {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  kit.add("paintedMetal", new THREE.BoxGeometry(len + 0.2, 0.18, 0.06), { pos: W(0, 0, 0.03), rot, color: BLACK });
  kit.add(mat, new THREE.BoxGeometry(len, 0.05, 0.012), { pos: W(0, 0, 0.066), rot });
  for (const lx of [-len / 2 - 0.05, len / 2 + 0.05]) kit.add("paintedMetal", new THREE.BoxGeometry(0.06, 0.24, 0.09), { pos: W(lx, 0, 0.045), rot, color: DARK });
}

// High-level cable tray along an axis-aligned line between a and b (same y): U-channel, three cables,
// wall brackets every `bracket` metres toward `wallDir` (unit vector pointing at the wall).
export function cableTray(kit, a, b, { w = 0.4, bracket = 3.0, wallDir = null, gap = 0.1 } = {}) {
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]);
  const len = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[2] - a[2]);
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[2] + b[2]) / 2;
  const y = a[1];
  const sz = (l, t) => (alongX ? [l, 0.03, t] : [t, 0.03, l]);
  const off = (d) => (alongX ? [cx, y, cz + d] : [cx + d, y, cz]);
  const B = (mat, p, s, opts) => kit.box(mat, p[0], p[1], p[2], s[0], s[1], s[2], opts);
  B("paintedMetal", [cx, y, cz], sz(len, w), { color: DARK, texel: 1 });
  for (const d of [-w / 2 + 0.015, w / 2 - 0.015]) {
    const p = off(d);
    B("paintedMetal", [p[0], y + 0.05, p[2]], alongX ? [len, 0.1, 0.03] : [0.03, 0.1, len], { color: DARK });
  }
  const cableColors = [BLACK, DARK, 0x3a3f5a];
  for (let i = 0; i < 3; i++) {
    const p = off(-w / 2 + 0.08 + i * 0.12);
    kit.cyl("metal", p[0], y + 0.045, p[2], 0.028, len - 0.05, alongX ? "x" : "z", { color: cableColors[i], segments: 8 });
  }
  const n = Math.max(2, Math.floor(len / bracket));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = a[0] + (b[0] - a[0]) * t;
    const pz = a[2] + (b[2] - a[2]) * t;
    B("paintedMetal", [px, y - 0.03, pz], alongX ? [0.06, 0.04, w + 0.08] : [w + 0.08, 0.04, 0.06], { color: BLACK });
    if (wallDir) {
      // arm from the tray edge to the wall
      const armLen = gap + w / 2;
      B("paintedMetal", [px + (wallDir[0] * (w / 2 + gap)) / 2, y - 0.03, pz + (wallDir[2] * (w / 2 + gap)) / 2], alongX ? [0.06, 0.04, armLen] : [armLen, 0.04, 0.06], { color: BLACK });
      B("paintedMetal", [px + wallDir[0] * (w / 2 + gap - 0.01), y + 0.02, pz + wallDir[2] * (w / 2 + gap - 0.01)], alongX ? [0.12, 0.2, 0.02] : [0.02, 0.2, 0.12], { color: BLACK });
    }
  }
}

// Recessed door control panel: dark plate with a lit call button and a status LED.
export function doorPanel(kit, pos, yaw, { lit = "emitBlue" } = {}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  kit.add("paintedMetal", new THREE.BoxGeometry(0.28, 0.4, 0.05), { pos: W(0, 0, 0.025), rot, color: BLACK });
  kit.add("darkGloss", new THREE.BoxGeometry(0.22, 0.34, 0.01), { pos: W(0, 0, 0.055), rot });
  kit.add(lit, new THREE.BoxGeometry(0.12, 0.08, 0.01), { pos: W(0, 0.06, 0.062), rot });
  kit.add("emitRedImp", new THREE.BoxGeometry(0.04, 0.02, 0.01), { pos: W(-0.06, -0.08, 0.062), rot });
  kit.add("emitGreen", new THREE.BoxGeometry(0.04, 0.02, 0.01), { pos: W(0.06, -0.08, 0.062), rot });
}

// Ceiling light channel (surface-mounted trough) running along X between x0..x1 at z, hung from
// ceilY: black housing, mid-grey lips, segmented emitter strip.
export function lightChannel(kit, x0, x1, z, ceilY, { w = 0.5, mat = "emitWhite", segment = 2.0, drop = 0.14 } = {}) {
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  kit.boxMM("paintedMetal", [x0, ceilY - drop, z - w / 2], [x1, ceilY - 0.02, z + w / 2], { color: BLACK });
  kit.boxMM("paintedMetal", [x0, ceilY - drop - 0.02, z - w / 2 - 0.05], [x1, ceilY - 0.02, z - w / 2], { color: MID });
  kit.boxMM("paintedMetal", [x0, ceilY - drop - 0.02, z + w / 2], [x1, ceilY - 0.02, z + w / 2 + 0.05], { color: MID });
  const nSeg = Math.max(1, Math.round(len / segment));
  for (let i = 0; i < nSeg; i++) {
    const s0 = x0 + (len * i) / nSeg + 0.12;
    const s1 = x0 + (len * (i + 1)) / nSeg - 0.12;
    kit.boxMM(mat, [s0, ceilY - drop - 0.015, z - 0.07], [s1, ceilY - drop + 0.005, z + 0.07]);
  }
  void cx;
}

// Small wall junction box with a conduit dropping from above.
export function junctionBox(kit, pos, yaw, { w = 0.3, h = 0.4, conduitUp = 0 } = {}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  kit.add("paintedMetal", new THREE.BoxGeometry(w, h, 0.14), { pos: W(0, 0, 0.07), rot, color: MID, texel: 1 });
  kit.add("paintedMetal", new THREE.BoxGeometry(w - 0.06, h - 0.06, 0.01), { pos: W(0, 0, 0.145), rot, color: DARK });
  kit.add("emitAmber", new THREE.BoxGeometry(0.05, 0.02, 0.008), { pos: W(w / 2 - 0.08, h / 2 - 0.08, 0.152), rot });
  if (conduitUp > 0) {
    const p = W(0, h / 2 + conduitUp / 2, 0.06);
    kit.cyl("metal", p[0], p[1], p[2], 0.03, conduitUp, "y", { color: DARK, segments: 8 });
  }
}
