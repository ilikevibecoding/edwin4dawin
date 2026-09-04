// Recreation-lounge-local props: bar stools, dispenser bar pieces, holo-game tables, box seats,
// exercise rack, mats, media wall. Kit-bashed; colliders are world AABBs. Shared props stay untouched.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../_shared/palette.js";

const BLACK = IMP.impBlack;
const DARK = IMP.impDark;
const MID = IMP.impMid;
const GREY = IMP.impGrey;
const STEEL = IMP.steel;

// Fixed pedestal stool: disc base, column, padded seat (no back).
export function stool(kit, x, y, z, { h = 0.72, r = 0.2, cushion = DARK } = {}) {
  kit.cyl("metal", x, y + 0.02, z, 0.24, 0.04, "y", { color: BLACK, segments: 14 });
  kit.cyl("metal", x, y + h / 2, z, 0.035, h - 0.1, "y", { color: STEEL, segments: 8 });
  kit.cyl("paintedMetal", x, y + h - 0.09, z, r * 0.6, 0.04, "y", { color: BLACK, segments: 10 });
  kit.cyl("fabric", x, y + h - 0.035, z, r, 0.07, "y", { color: cushion, segments: 16, texel: 2 });
  kit.collider([x - r, y, z - r], [x + r, y + h, z + r], "stool");
}

// Round holo-game table: heavy pedestal, black gloss top with a glowing grid of blue squares and a
// rim light; four stools around it.
export function gameTable(kit, x, y, z, seed, { r = 0.75, h = 0.78 } = {}) {
  const rand = rng(seed);
  kit.cyl("paintedMetal", x, y + 0.04, z, r * 0.7, 0.08, "y", { color: BLACK, segments: 20 });
  kit.cyl("paintedMetal", x, y + h / 2, z, 0.16, h - 0.1, "y", { color: DARK, segments: 12, texel: 1 });
  kit.cyl("paintedMetal", x, y + h - 0.05, z, r, 0.1, "y", { color: DARK, segments: 28, texel: 1 });
  kit.cyl("darkGloss", x, y + h + 0.006, z, r - 0.06, 0.012, "y", { segments: 28 });
  kit.cyl("emitBlue", x, y + h - 0.02, z, r + 0.004, 0.02, "y", { segments: 28, open: true });
  // grid of lit squares inside a 0.9 m square board
  const n = 6;
  const cell = 0.14;
  const half = (n * cell) / 2;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = rand();
      if (v < 0.3) continue;
      const m = v < 0.85 ? "emitBlue" : v < 0.95 ? "emitAmber" : "emitRedImp";
      kit.box(m, x - half + (i + 0.5) * cell, y + h + 0.016, z - half + (j + 0.5) * cell, cell - 0.04, 0.008, cell - 0.04);
    }
  }
  // side control pads
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const px = x + Math.sin(a) * (r - 0.2);
    const pz = z + Math.cos(a) * (r - 0.2);
    kit.box("darkGloss", px, y + h + 0.014, pz, 0.14, 0.006, 0.14);
    kit.box(rand() < 0.5 ? "emitAmber" : "emitRedImp", px, y + h + 0.02, pz, 0.04, 0.006, 0.04);
  }
  kit.collider([x - r, y, z - r], [x + r, y + h, z + r], "game-table");
  const sr = r + 0.55;
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) stool(kit, x + Math.sin(a) * sr, y, z + Math.cos(a) * sr, { h: 0.5, r: 0.21, cushion: MID });
}

// Low lounge seat block (box seat with a backrest along local -Z). Runs `len` along local X.
export function benchSeat(kit, pos, yaw, len, { back = true, color = MID, cushion = DARK } = {}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  const box = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: W(lx, ly, lz), rot, ...opts });
  box("paintedMetal", 0, 0.18, 0, len, 0.36, 0.62, { color, texel: 1 });
  box("paintedMetal", 0, 0.05, 0, len - 0.1, 0.1, 0.56, { color: BLACK });
  box("fabric", 0, 0.41, 0.02, len - 0.06, 0.1, 0.58, { color: cushion, texel: 2 });
  if (back) {
    box("paintedMetal", 0, 0.5, -0.33, len, 0.64, 0.06, { color, texel: 1 });
    box("fabric", 0, 0.62, -0.29, len - 0.06, 0.36, 0.06, { color: cushion, texel: 2 });
  }
  box("emitWarm", 0, 0.12, 0.312, len - 0.3, 0.012, 0.006);
  const pts = [W(-len / 2, 0, -0.36), W(len / 2, 0, -0.36), W(-len / 2, 0, 0.31), W(len / 2, 0, 0.31)];
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[2]);
  kit.collider([Math.min(...xs), pos[1], Math.min(...zs)], [Math.max(...xs), pos[1] + (back ? 0.82 : 0.46), Math.max(...zs)], "bench");
}

// Low lounge table (0.45 m) with a lit inset.
export function lowTable(kit, x, y, z, w, d) {
  kit.box("paintedMetal", x, y + 0.42, z, w, 0.06, d, { color: GREY, texel: 1 });
  kit.box("paintedMetal", x, y + 0.2, z, w - 0.5, 0.4, d - 0.4, { color: DARK, texel: 1 });
  kit.box("paintedMetal", x, y + 0.03, z, w - 0.3, 0.06, d - 0.2, { color: BLACK });
  kit.box("darkGloss", x, y + 0.455, z, w - 0.3, 0.01, d - 0.3);
  kit.box("emitBlue", x, y + 0.462, z, w - 0.9, 0.006, 0.03);
  kit.collider([x - w / 2, y, z - d / 2], [x + w / 2, y + 0.46, z + d / 2], "table");
}

// Rows of small coloured canisters/bottles on a shelf segment centred at (x, y, z), spread along X.
export function bottleRow(kit, x, y, z, len, seed, count = 8) {
  const rand = rng(seed);
  const colours = [0xd94b3a, 0x3a7bff, 0xffa028, 0x38d67a, 0xc9ccd1, 0x9b5de5, 0x2ec4b6, 0xff6f91];
  for (let i = 0; i < count; i++) {
    const bx = x - len / 2 + (i + 0.5) * (len / count) + (rand() - 0.5) * 0.04;
    const r = 0.035 + rand() * 0.02;
    const h = 0.16 + rand() * 0.12;
    const c = colours[Math.floor(rand() * colours.length)];
    kit.cyl("metal", bx, y + h / 2, z, r, h, "y", { color: c, segments: 8 });
    kit.cyl("metal", bx, y + h + 0.02, z, r * 0.5, 0.04, "y", { color: STEEL, segments: 6 });
  }
}

// Dispenser nozzle cluster on a back counter: vertical riser, spout, drip tray, indicator.
export function dispenser(kit, x, y, z, seed) {
  const rand = rng(seed);
  kit.box("paintedMetal", x, y + 0.02, z, 0.36, 0.04, 0.28, { color: BLACK });
  kit.box("darkGloss", x, y + 0.045, z + 0.03, 0.3, 0.01, 0.2);
  kit.cyl("metal", x, y + 0.3, z - 0.1, 0.045, 0.56, "y", { color: STEEL, segments: 10 });
  kit.cyl("metal", x, y + 0.5, z + 0.02, 0.028, 0.24, "z", { color: STEEL, segments: 8 });
  kit.cyl("metal", x, y + 0.44, z + 0.12, 0.02, 0.1, "y", { color: DARK, segments: 8 });
  kit.box("darkGloss", x, y + 0.34, z - 0.06, 0.16, 0.12, 0.03);
  kit.box(rand() < 0.5 ? "emitAmber" : "emitBlue", x, y + 0.36, z - 0.04, 0.08, 0.03, 0.01);
  kit.box("emitGreen", x - 0.05, y + 0.31, z - 0.04, 0.02, 0.02, 0.01);
  kit.box("emitRedImp", x + 0.05, y + 0.31, z - 0.04, 0.02, 0.02, 0.01);
}

// Exercise rack: two uprights, three cross bars, a weight plate stack and hand grips.
export function exerciseRack(kit, x, y, z, yaw, { w = 1.6, h = 2.2, d = 0.8 } = {}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  const rot = [0, yaw, 0];
  const box = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: W(lx, ly, lz), rot, ...opts });
  for (const sx of [-1, 1]) {
    box("paintedMetal", (sx * w) / 2, h / 2, 0, 0.1, h, 0.1, { color: DARK, texel: 1 });
    box("paintedMetal", (sx * w) / 2, 0.03, 0, 0.3, 0.06, d, { color: BLACK });
    box("paintedMetal", (sx * w) / 2, h - 0.03, 0, 0.1, 0.06, d, { color: DARK });
  }
  for (const ly of [1.0, 1.55, h - 0.06]) {
    const p = W(0, ly, 0);
    kit.add("metal", new THREE.CylinderGeometry(0.025, 0.025, w - 0.1, 10), { pos: p, rot: [0, yaw, Math.PI / 2], color: STEEL });
  }
  // plate stack on one side, grips on the other
  for (let i = 0; i < 5; i++) {
    const p = W(-w / 2 + 0.25, 0.14 + i * 0.05, d / 2 - 0.15);
    kit.add("metal", new THREE.CylinderGeometry(0.16 - i * 0.012, 0.16 - i * 0.012, 0.04, 16), { pos: p, color: BLACK });
  }
  for (const lz of [-0.25, 0.25]) box("fabric", w / 2 - 0.3, 1.25, lz, 0.32, 0.05, 0.05, { color: BLACK, texel: 2 });
  box("emitAmber", 0, h - 0.12, d / 2 - 0.02, 0.2, 0.02, 0.01);
  const pts = [W(-w / 2 - 0.15, 0, -d / 2), W(w / 2 + 0.15, 0, -d / 2), W(-w / 2 - 0.15, 0, d / 2), W(w / 2 + 0.15, 0, d / 2)];
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[2]);
  kit.collider([Math.min(...xs), y, Math.min(...zs)], [Math.max(...xs), y + h, Math.max(...zs)], "rack");
}

// Floor exercise mat (thin fabric box, slightly rounded look via a darker border).
export function mat(kit, x, y, z, w, d, color = MID) {
  kit.box("fabric", x, y + 0.025, z, w, 0.05, d, { color, texel: 2 });
  kit.box("fabric", x, y + 0.052, z, w - 0.16, 0.004, d - 0.16, { color: DARK, texel: 2 });
}

// Media wall: black backing plate, 2x2 screens, warm accent strip above; faces `yaw` like props.
export function mediaWall(kit, pos, yaw, screens, { w = 5.8, h = 3.7, mats = ["screenImp0", "screenImp1", "screenImp1", "screenImp0"] } = {}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  const box = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: W(lx, ly, lz), rot, ...opts });
  box("paintedMetal", 0, h / 2, 0.05, w, h, 0.1, { color: BLACK, texel: 1 });
  box("paintedMetal", 0, h - 0.06, 0.12, w, 0.12, 0.04, { color: DARK });
  box("paintedMetal", 0, 0.06, 0.12, w, 0.12, 0.04, { color: DARK });
  box("emitWarm", 0, h + 0.08, 0.06, w - 0.4, 0.04, 0.012);
  const sw = 2.6;
  const sh = 1.5;
  let k = 0;
  for (const ly of [h - 0.35 - sh / 2, h - 0.35 - sh - 0.15 - sh / 2]) {
    for (const lx of [-sw / 2 - 0.1, sw / 2 + 0.1]) {
      screens(W(lx, ly, 0.18), yaw, sw, sh, mats[k % mats.length]);
      k++;
    }
  }
  // small readout row under the screens
  for (let i = 0; i < 12; i++) box(i % 3 === 0 ? "emitAmber" : "emitBlue", -w / 2 + 0.5 + i * ((w - 1.0) / 11), 0.3, 0.11, 0.18, 0.03, 0.01);
}

// Wall score/notice board: dark plate, header, rows of amber/blue bars (a leaderboard / roster).
export function scoreBoard(kit, pos, yaw, w, h, seed, { accent = "emitAmber", secondary = "emitBlue", rows = 5 } = {}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  const box = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: W(lx, ly, lz), rot, ...opts });
  const rand = rng(seed);
  box("paintedMetal", 0, 0, 0.03, w + 0.16, h + 0.16, 0.06, { color: DARK, texel: 1 });
  box("paintedMetal", 0, 0, 0.065, w, h, 0.01, { color: BLACK });
  box("darkGloss", 0, 0, 0.072, w - 0.06, h - 0.06, 0.004);
  box(accent, 0, h / 2 - 0.09, 0.078, w - 0.16, 0.025, 0.004);
  box(accent, -w / 2 + 0.32, h / 2 - 0.16, 0.078, 0.48, 0.05, 0.004);
  for (let k = 0; k < 3; k++) box(secondary, w / 2 - 0.2 - k * 0.2, h / 2 - 0.16, 0.078, 0.12, 0.05, 0.004);
  const top = h / 2 - 0.3;
  const bottom = -h / 2 + 0.12;
  const pitch = (top - bottom) / rows;
  for (let i = 0; i < rows; i++) {
    const y = top - (i + 0.5) * pitch;
    const label = 0.35 + rand() * 0.25;
    box(rand() < 0.75 ? secondary : accent, -w / 2 + 0.12 + label / 2, y, 0.078, label, 0.03, 0.004);
    let x = -w / 2 + 0.2 + label;
    const nb = 2 + Math.floor(rand() * 4);
    for (let j = 0; j < nb && x < w / 2 - 0.3; j++) {
      const bw = 0.15 + rand() * 0.45;
      if (x + bw > w / 2 - 0.15) break;
      const r = rand();
      box(r < 0.55 ? secondary : r < 0.9 ? accent : "emitRedImp", x + bw / 2, y, 0.078, bw, pitch * 0.42, 0.004);
      x += bw + 0.08;
    }
  }
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box("metal", (sx * (w + 0.1)) / 2, (sy * (h + 0.1)) / 2, 0.062, 0.03, 0.03, 0.01, { color: STEEL });
}

// Recessed door control panel: dark plate with a lit call button and two status LEDs.
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

// 1.2 m equipment crate without rubber bumpers (keeps the room's material count down): recessed side
// panels, steel corner angles, handle and a lit status tab. Local +Z is the front.
export function gearCrate(kit, pos, yaw, { w = 1.2, h = 1.2, d = 1.2, color = MID, tab = "emitBlue" } = {}) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const W = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];
  const rot = [0, yaw, 0];
  const box = (mat, lx, ly, lz, sx, sy, sz, opts = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: W(lx, ly, lz), rot, ...opts });
  box("paintedMetal", 0, h / 2, 0, w, h, d, { color, texel: 1 });
  box("paintedMetal", 0, h / 2, d / 2 + 0.001, w - 0.3, h - 0.3, 0.03, { color: DARK, texel: 1 });
  box("paintedMetal", 0, h / 2, -d / 2 - 0.001, w - 0.3, h - 0.3, 0.03, { color: DARK, texel: 1 });
  box("paintedMetal", w / 2 + 0.001, h / 2, 0, 0.03, h - 0.3, d - 0.3, { color: DARK, texel: 1 });
  box("paintedMetal", -w / 2 - 0.001, h / 2, 0, 0.03, h - 0.3, d - 0.3, { color: DARK, texel: 1 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box("metal", (sx * (w - 0.08)) / 2, h / 2, (sz * (d - 0.08)) / 2, 0.09, h + 0.02, 0.09, { color: STEEL });
  box("metal", 0, h - 0.15, d / 2 + 0.03, 0.4, 0.05, 0.05, { color: STEEL });
  box(tab, w / 2 - 0.2, h - 0.12, d / 2 + 0.017, 0.12, 0.03, 0.006);
  const pts = [W(-w / 2, 0, -d / 2), W(w / 2, 0, -d / 2), W(-w / 2, 0, d / 2), W(w / 2, 0, d / 2)];
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[2]);
  kit.collider([Math.min(...xs), pos[1], Math.min(...zs)], [Math.max(...xs), pos[1] + h, Math.max(...zs)], "crate");
}

// Central four-sided info column: black base, dark square shaft with chamfer posts and warm corner
// strips, one screen per face, blue ring under the cap. `screens(pos, yaw, w, h, mat)` draws a screen.
export function infoColumn(kit, x, y, z, screens, { side = 1.2, h = 2.7 } = {}) {
  kit.box("paintedMetal", x, y + 0.06, z, side + 0.4, 0.12, side + 0.4, { color: BLACK, texel: 1 });
  kit.box("paintedMetal", x, y + 0.12 + (h - 0.32) / 2, z, side, h - 0.32, side, { color: DARK, texel: 1 });
  kit.box("paintedMetal", x, y + h - 0.1, z, side + 0.12, 0.2, side + 0.12, { color: BLACK, texel: 1 });
  kit.box("paintedMetal", x, y + h - 0.21, z, side + 0.02, 0.02, side + 0.02, { color: MID });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    kit.box("paintedMetal", x + (sx * side) / 2, y + h / 2 - 0.1, z + (sz * side) / 2, 0.12, h - 0.32, 0.12, { color: BLACK });
    kit.box("emitWarm", x + sx * (side / 2 + 0.061), y + h / 2 - 0.1, z + (sz * side) / 2, 0.004, h - 0.9, 0.03);
    kit.box("emitWarm", x + (sx * side) / 2, y + h / 2 - 0.1, z + sz * (side / 2 + 0.061), 0.03, h - 0.9, 0.004);
  }
  const ring = side / 2 + 0.006;
  kit.boxMM("emitBlue", [x - ring, y + h - 0.3, z - ring], [x + ring, y + h - 0.26, z - ring + 0.012]);
  kit.boxMM("emitBlue", [x - ring, y + h - 0.3, z + ring - 0.012], [x + ring, y + h - 0.26, z + ring]);
  kit.boxMM("emitBlue", [x - ring, y + h - 0.3, z - ring], [x - ring + 0.012, y + h - 0.26, z + ring]);
  kit.boxMM("emitBlue", [x + ring - 0.012, y + h - 0.3, z - ring], [x + ring, y + h - 0.26, z + ring]);
  const sy = y + 1.55;
  const off = side / 2 + 0.08 - 0.01;
  screens([x + off, sy, z], Math.PI / 2, 0.9, 0.6, "screenImp0");
  screens([x - off, sy, z], -Math.PI / 2, 0.9, 0.6, "screenImp1");
  screens([x, sy, z + off], 0, 0.9, 0.6, "screenImp1");
  screens([x, sy, z - off], Math.PI, 0.9, 0.6, "screenImp0");
  // lit readout strip under each screen
  for (const [dx, dz, w, d] of [[off, 0, 0.012, 0.7], [-off, 0, 0.012, 0.7], [0, off, 0.7, 0.012], [0, -off, 0.7, 0.012]]) {
    kit.box("emitAmber", x + dx, y + 1.1, z + dz, w, 0.025, d);
  }
  kit.collider([x - side / 2 - 0.2, y, z - side / 2 - 0.2], [x + side / 2 + 0.2, y + h, z + side / 2 + 0.2], "column");
}

// Tall standing table (1.1 m) with a lit ring under the top.
export function standTable(kit, x, y, z) {
  kit.cyl("paintedMetal", x, y + 0.025, z, 0.32, 0.05, "y", { color: BLACK, segments: 16 });
  kit.cyl("metal", x, y + 0.55, z, 0.045, 1.0, "y", { color: STEEL, segments: 10 });
  kit.cyl("paintedMetal", x, y + 1.08, z, 0.38, 0.05, "y", { color: GREY, segments: 20, texel: 1 });
  kit.cyl("darkGloss", x, y + 1.11, z, 0.3, 0.012, "y", { segments: 20 });
  kit.cyl("emitBlue", x, y + 1.06, z, 0.34, 0.015, "y", { segments: 20, open: true });
  kit.collider([x - 0.38, y, z - 0.38], [x + 0.38, y + 1.11, z + 0.38], "table");
}

// Floor-standing light obelisk: black shaft with a warm strip on each face, mid-grey cap.
export function lightObelisk(kit, x, y, z, { h = 2.2, s = 0.42 } = {}) {
  kit.box("paintedMetal", x, y + 0.04, z, s + 0.2, 0.08, s + 0.2, { color: BLACK });
  kit.box("paintedMetal", x, y + 0.08 + (h - 0.16) / 2, z, s, h - 0.16, s, { color: BLACK, texel: 1 });
  kit.box("paintedMetal", x, y + h - 0.04, z, s + 0.06, 0.08, s + 0.06, { color: MID });
  for (const [dx, dz, w, d] of [[s / 2 + 0.004, 0, 0.008, 0.06], [-s / 2 - 0.004, 0, 0.008, 0.06], [0, s / 2 + 0.004, 0.06, 0.008], [0, -s / 2 - 0.004, 0.06, 0.008]]) {
    kit.box("emitWarm", x + dx, y + h / 2 + 0.1, z + dz, w, h - 0.8, d);
  }
  kit.collider([x - s / 2 - 0.1, y, z - s / 2 - 0.1], [x + s / 2 + 0.1, y + h, z + s / 2 + 0.1], "obelisk");
}

// Floor zone rectangle drawn with painted lines (non-emissive) or an emissive material.
export function zoneRect(kit, x0, z0, x1, z1, y, mat = "paintedMetal", color = IMP.impWhite, w = 0.08) {
  const o = mat === "paintedMetal" ? { color } : {};
  kit.boxMM(mat, [x0, y, z0], [x1, y + 0.006, z0 + w], o);
  kit.boxMM(mat, [x0, y, z1 - w], [x1, y + 0.006, z1], o);
  kit.boxMM(mat, [x0, y, z0 + w], [x0 + w, y + 0.006, z1 - w], o);
  kit.boxMM(mat, [x1 - w, y, z0 + w], [x1, y + 0.006, z1 - w], o);
}
