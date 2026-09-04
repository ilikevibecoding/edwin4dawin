// Crew-quarters-local props (§11 crew accent: neutral grey, warm white). Same design family as the
// shared bunkStack, extended with a selectable head end (so facing pairs can both have their heads
// on the wall), pinned cards, drawers and ladders. Material keys stay within the room's set.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../_shared/palette.js";
import { placer, indicatorField } from "../_shared/props.js";

const STEEL = IMP.steel;
const DARK = IMP.impDark;
const BLACK = IMP.impBlack;
// pinned cards read as notes / flimsi-prints: pale stock with a darker printed patch
const CARD = [0xe8e6dc, 0xd4d8de, 0xc9c2a8, 0xf0f0f0];
const PRINT = [0x2a2e36, 0x3b4658, 0x6b2e28, 0x2f4a3a];
// issue bedding colours (per bay): slate, olive-grey, Imperial grey
export const BEDDING = [0x3b4658, 0x4b5046, IMP.impMid];

export function rod(kit, a, b, r = 0.015, mat = "metal", color = STEEL, segments = 8) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  kit.add(mat, new THREE.CylinderGeometry(r, r, len, segments), { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], color });
}

export function vent(kit, pos, yaw, w = 0.6, h = 0.35) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, -0.03, w, h, 0.06, { color: BLACK });
  const n = Math.max(3, Math.floor(h / 0.06));
  for (let i = 0; i < n; i++) P.box("paintedMetal", 0, -h / 2 + (i + 0.5) * (h / n), 0.0, w - 0.06, 0.022, 0.02, { color: IMP.impGrey });
}

export function junctionBox(kit, pos, yaw, seed = 3) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0, -0.08, 0.32, 0.4, 0.16, { color: DARK, texel: 2.5 });
  P.box("paintedMetal", 0, 0, 0.005, 0.26, 0.34, 0.01, { color: IMP.impMid });
  P.box(rand() < 0.6 ? "emitBlue" : "emitAmber", 0.08, 0.12, 0.012, 0.04, 0.02, 0.006);
  P.cyl("metal", 0, 0.36, -0.08, 0.025, 0.35, "y", { color: STEEL, segments: 8 });
}

// Stacked bunks along local X (length 2.1), open side +Z. `head` = −1 puts the pillow at −X, +1 at
// +X. Each tier: slab, mattress, sheet, pillow, issue blanket in the bay's `bedding` colour (made
// bed with a turned-down sheet edge, or folded at the foot), reading lamp, safety rail, pinned
// notes; a drawer under the bottom tier and a ladder at the foot end. `stripped` = tier index left
// as a bare slab with the mattress rolled at the head; `noBlanket` = tier index with sheet only.
// The head end is a solid headboard; the foot end is an open post frame.
// `faultyTier` draws that tier's reading lamp with `faultyMat` (the room's flickering clone).
export function bunk(kit, PALETTE, pos, yaw, { tiers = 3, len = 2.1, w = 0.9, gap = 0.75, seed = 7, head = -1, bedding = BEDDING[0], stripped = -1, noBlanket = -1, faultyTier = -1, faultyMat = "emitWarm" } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const frame = DARK;
  const h = 0.3 + tiers * gap;
  const hx = head * (len / 2 - 0.35);
  P.box("paintedMetal", 0, h / 2, -w / 2 - 0.02, len, h, 0.04, { color: frame, texel: 2.5 });
  P.box("paintedMetal", head * (len / 2 - 0.03), h / 2, 0, 0.06, h, w + 0.04, { color: frame, texel: 2.5 });
  for (const z of [-w / 2 - 0.01, w / 2 - 0.01]) P.box("paintedMetal", -head * (len / 2 - 0.03), h / 2, z, 0.06, h, 0.06, { color: frame });
  // tilted box (about the local Z axis) for pillows leaning on the headboard
  const tilted = (mat, lx, ly, lz, sx, sy, sz, rz, opts = {}) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)));
    kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: P.world(lx, ly, lz), quat: q, ...opts });
  };
  for (let i = 0; i < tiers; i++) {
    const y = 0.3 + i * gap;
    P.box("paintedMetal", 0, y, 0, len, 0.08, w, { color: frame, texel: 2.5 });
    // light inset on the back wall of each tier and a pale underside on the slab above, so the fills
    // and the reading lamp have something to catch (a black frame box reads as a void)
    P.box("impPanel", 0, y + 0.42, -w / 2 + 0.003, len - 0.16, 0.56, 0.012, { color: IMP.impMid, uv: "keep" });
    P.box("impPanel", 0, y + gap - 0.045, 0.04, len - 0.2, 0.01, w - 0.16, { color: IMP.impGrey, uv: "keep" });
    if (i === stripped) {
      // bare mattress, the blanket rolled tight at the head end, folded sheet at the foot
      P.box("fabric", 0, y + 0.1, 0, len - 0.1, 0.12, w - 0.08, { color: IMP.impGrey, texel: 2 });
      P.cyl("fabric", hx, y + 0.31, 0, 0.15, w - 0.26, "z", { color: bedding, segments: 14, texel: 2 });
      P.box("fabric", -head * (len / 2 - 0.4), y + 0.2, 0.05, 0.42, 0.07, w - 0.4, { color: IMP.impWhite, texel: 2 });
    } else {
      P.box("fabric", 0, y + 0.1, 0, len - 0.1, 0.12, w - 0.08, { color: IMP.impGrey, texel: 2 });
      P.box("fabric", 0, y + 0.165, 0, len - 0.14, 0.012, w - 0.1, { color: IMP.impWhite, texel: 2 }); // sheet
      // pillow: thin slab leaning slightly on the headboard with a bevelled top layer; one dented
      const dent = rand() < 0.3;
      tilted("fabric", hx, y + 0.225, 0, 0.5, 0.06, w - 0.3, head * 0.14, { color: IMP.impWhite, texel: 2 });
      if (dent) for (const s of [-1, 1]) tilted("fabric", hx, y + 0.265, s * (w - 0.3) * 0.27, 0.42, 0.025, (w - 0.3) * 0.3, head * 0.14, { color: IMP.impWhite, texel: 2 });
      else tilted("fabric", hx, y + 0.265, 0, 0.42, 0.025, w - 0.4, head * 0.14, { color: IMP.impWhite, texel: 2 });
      const r = rand();
      if (i === noBlanket) {
        // sheet only, thrown back toward the foot
        P.box("fabric", -head * (len / 2 - 0.5), y + 0.19, 0.08, 0.6, 0.04, w - 0.3, { color: IMP.impWhite, texel: 2 });
      } else if (r < 0.65) {
        // made bed: blanket from the foot to 0.75 from the head end, white fold at its head edge
        const bl = len - 0.95;
        P.box("fabric", -head * (len / 2 - 0.05 - bl / 2), y + 0.195, 0, bl, 0.05, w - 0.14, { color: bedding, texel: 2 });
        P.box("fabric", -head * (len / 2 - 0.05 - bl + 0.1), y + 0.225, 0, 0.2, 0.02, w - 0.16, { color: IMP.impWhite, texel: 2 });
      } else {
        // folded blanket at the foot
        P.box("fabric", -head * (len / 2 - 0.35), y + 0.215, 0, 0.4, 0.09, w - 0.35, { color: bedding, texel: 2 });
      }
    }
    // reading lamp on every tier: a housed warm strip under the slab above, over the pillow
    P.box("paintedMetal", hx, y + gap - 0.09, -w / 2 + 0.09, 0.5, 0.04, 0.1, { color: BLACK });
    P.box(i === faultyTier ? faultyMat : "emitWarm", hx, y + gap - 0.112, -w / 2 + 0.095, 0.44, 0.012, 0.07);
    if (i > 0) P.cyl("metal", -head * 0.2, y + 0.3, w / 2, 0.015, len * 0.55, "x", { color: STEEL, segments: 8 });
    const nCards = Math.floor(rand() * 3);
    for (let c = 0; c < nCards; c++) {
      const cw = rand() < 0.5 ? 0.12 : 0.09;
      const ch = cw === 0.12 ? 0.09 : 0.12;
      const cx = -len / 2 + 0.3 + rand() * (len - 0.6);
      const cy = y + 0.36 + rand() * 0.2;
      P.box("paintedMetal", cx, cy, -w / 2 + 0.014, cw, ch, 0.006, { color: CARD[Math.floor(rand() * CARD.length)] });
      P.box("paintedMetal", cx, cy + 0.01, -w / 2 + 0.0175, cw - 0.03, ch - 0.045, 0.002, { color: PRINT[Math.floor(rand() * PRINT.length)] });
    }
    if (rand() < 0.3) P.box("emitBlue", -head * 0.5, y + 0.44, -w / 2 + 0.014, 0.1, 0.07, 0.006);
  }
  P.box("paintedMetal", 0, h - 0.02, 0, len, 0.04, w + 0.04, { color: frame });
  P.box("paintedMetal", 0, 0.13, 0.02, len - 0.2, 0.22, w - 0.1, { color: IMP.impMid, texel: 2.5 });
  for (const x of [-len / 4, len / 4]) P.box("metal", x, 0.13, w / 2 - 0.02, 0.25, 0.02, 0.02, { color: STEEL });
  const lx = -head * (len / 2 - 0.2);
  for (const dx of [-0.16, 0.16]) P.cyl("metal", lx + dx, (h - 0.2) / 2 + 0.1, w / 2 + 0.04, 0.014, h - 0.2, "y", { color: STEEL, segments: 8 });
  for (let y = 0.45; y < h - 0.3; y += 0.3) P.cyl("metal", lx, y, w / 2 + 0.04, 0.011, 0.32, "x", { color: STEEL, segments: 6 });
  P.collider([-len / 2, 0, -w / 2 - 0.05], [len / 2, h, w / 2 + 0.08], "bunk");
}

// Fold-out desk hinged on a wall panel behind it (local −Z), with a data-pad and a pedestal stool.
export function foldDesk(kit, pos, yaw, seed = 5, stoolAt = "in") {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0.75, 0.22, 0.52, 0.03, 0.44, { color: IMP.impGrey, texel: 2.5 });
  P.box("paintedMetal", 0, 0.72, 0.03, 0.5, 0.06, 0.06, { color: BLACK });
  for (const s of [-1, 1]) rod(kit, P.world(s * 0.2, 0.735, 0.4), P.world(s * 0.2, 0.42, 0.02), 0.012);
  P.box("darkGloss", 0.05, 0.77, 0.24, 0.26, 0.012, 0.18);
  P.box(rand() < 0.5 ? "emitBlue" : "emitAmber", 0.05, 0.778, 0.24, 0.2, 0.004, 0.12);
  P.box("paintedMetal", -0.16, 0.78, 0.12, 0.1, 0.03, 0.14, { color: CARD[Math.floor(rand() * CARD.length)] });
  P.box("paintedMetal", 0, 1.35, 0.01, 0.4, 0.5, 0.02, { color: DARK });
  P.box("paintedMetal", 0, 1.63, 0.03, 0.34, 0.04, 0.06, { color: BLACK });
  P.box("emitWarm", 0, 1.615, 0.035, 0.3, 0.012, 0.03);
  for (let i = 0; i < 3; i++) {
    P.box("paintedMetal", -0.12 + i * 0.12, 1.32 + (i % 2) * 0.06, 0.022, 0.09, 0.12, 0.004, { color: CARD[(seed + i) % CARD.length] });
    P.box("paintedMetal", -0.12 + i * 0.12, 1.33 + (i % 2) * 0.06, 0.0255, 0.06, 0.07, 0.002, { color: PRINT[(seed + i) % PRINT.length] });
  }
  P.collider([-0.26, 0, 0], [0.26, 0.78, 0.44], "desk");
  // stool tucked under the desk, pushed out into the slot, or missing (taken into the bay)
  if (stoolAt === "in") stool(kit, P.world(0, 0, 0.75));
  else if (stoolAt === "out") stool(kit, P.world(0.35, 0, 1.05));
}

export function stool(kit, pos) {
  const [x, y, z] = pos;
  kit.cyl("metal", x, y + 0.02, z, 0.2, 0.04, "y", { color: DARK, segments: 14 });
  kit.cyl("metal", x, y + 0.23, z, 0.03, 0.38, "y", { color: STEEL, segments: 8 });
  kit.cyl("fabric", x, y + 0.45, z, 0.19, 0.06, "y", { color: DARK, segments: 16, texel: 2 });
  kit.collider([x - 0.2, y, z - 0.2], [x + 0.2, y + 0.48, z + 0.2], "stool");
}

// Boot rack: two-level frame with pairs of boots. Along local X, against a wall at local −Z.
export function bootRack(kit, pos, yaw, pairs = 4, seed = 9) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const w = pairs * 0.24 + 0.1;
  for (const y of [0.06, 0.42]) P.box("paintedMetal", 0, y, 0, w, 0.03, 0.34, { color: DARK });
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) P.box("paintedMetal", x, 0.24, 0, 0.03, 0.48, 0.34, { color: BLACK });
  for (let i = 0; i < pairs; i++) {
    const x = -w / 2 + 0.17 + i * 0.24;
    const lvl = rand() < 0.5 ? 0.075 : 0.435;
    if (rand() < 0.15) continue;
    for (const s of [-1, 1]) {
      P.box("paintedMetal", x + s * 0.06, lvl + 0.14, 0.02, 0.09, 0.28, 0.28, { color: rand() < 0.7 ? BLACK : DARK, texel: 2 });
      P.box("paintedMetal", x + s * 0.06, lvl + 0.03, 0.05, 0.095, 0.06, 0.3, { color: 0x0a0a0c });
    }
  }
  P.collider([-w / 2, 0, -0.17], [w / 2, 0.5, 0.17], "boots");
}

// Laundry cart: bin with a tube rim, castors, folded items inside.
export function laundryCart(kit, pos, yaw, seed = 11) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0.42, 0, 0.9, 0.7, 0.65, { color: IMP.impMid, texel: 2.5 });
  P.box("paintedMetal", 0, 0.42, 0.328, 0.7, 0.5, 0.01, { color: DARK });
  P.box("paintedMetal", 0, 0.42, -0.328, 0.7, 0.5, 0.01, { color: DARK });
  for (const s of [-1, 1]) {
    P.cyl("metal", 0, 0.8, s * 0.33, 0.02, 0.92, "x", { color: STEEL, segments: 8 });
    P.cyl("metal", s * 0.45, 0.8, 0, 0.02, 0.67, "z", { color: STEEL, segments: 8 });
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    P.cyl("metal", sx * 0.44, 0.8, sz * 0.32, 0.03, 0.05, "y", { color: STEEL, segments: 8 });
    P.cyl("metal", sx * 0.36, 0.05, sz * 0.24, 0.05, 0.04, "x", { color: BLACK, segments: 10 });
  }
  let x = -0.3;
  while (x < 0.3) {
    const bw = 0.18 + rand() * 0.14;
    P.box("fabric", x, 0.79 + rand() * 0.06, (rand() - 0.5) * 0.2, bw, 0.12, 0.4, { color: rand() < 0.5 ? IMP.impGrey : IMP.impWhite, texel: 2 });
    x += bw + 0.02;
  }
  P.collider([-0.46, 0, -0.34], [0.46, 0.85, 0.34], "cart");
}

// Duty-roster board: dark frame, a text-column screen (screenImp2) across the top, rows of name
// plates with status tabs below, a housed light bar on top. Reads as a notice board without text.
export function noticeBoard(kit, pos, yaw, w = 1.6, h = 1.0, seed = 13, screenMat = "screenImp2") {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0, -0.03, w + 0.08, h + 0.08, 0.06, { color: BLACK, texel: 2.5 });
  P.box("paintedMetal", 0, 0, 0.002, w, h, 0.01, { color: DARK, texel: 2.5 });
  const sh = h * 0.5;
  P.box("darkGloss", 0, h / 2 - 0.04 - sh / 2, 0.01, w - 0.08, sh, 0.01);
  P.box(screenMat, 0, h / 2 - 0.04 - sh / 2, 0.017, w - 0.12, sh - 0.04, 0.006, { uv: "keep" });
  // name plates: 2 rows, each a pale plate with a printed strip and a coloured status tab
  const rows = h > 0.7 ? 3 : 2;
  const cols = Math.max(2, Math.floor((w - 0.1) / 0.3));
  const pw = (w - 0.1 - (cols - 1) * 0.03) / cols;
  const y0 = -h / 2 + 0.07;
  const ph = (h - sh - 0.16 - (rows - 1) * 0.03) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.12) continue;
      const x = -w / 2 + 0.05 + pw / 2 + c * (pw + 0.03);
      const y = y0 + ph / 2 + r * (ph + 0.03);
      P.box("paintedMetal", x, y, 0.012, pw, ph, 0.006, { color: CARD[Math.floor(rand() * CARD.length)] });
      P.box("paintedMetal", x + 0.02, y, 0.0155, pw - 0.09, ph * 0.4, 0.002, { color: PRINT[Math.floor(rand() * PRINT.length)] });
      const t = rand();
      P.box(t < 0.55 ? "emitGreen" : t < 0.85 ? "emitAmber" : "emitBlue", x - pw / 2 + 0.025, y, 0.0155, 0.02, ph * 0.6, 0.002);
    }
  }
  P.box("paintedMetal", 0, h / 2 + 0.08, 0.02, w * 0.8, 0.05, 0.1, { color: BLACK });
  P.box("emitWarm", 0, h / 2 + 0.052, 0.045, w * 0.7, 0.012, 0.04);
}

// Open kit shelf with folded blankets / towels (fabric bundles). Front = +Z.
export function kitShelf(kit, pos, yaw, { w = 1.2, h = 1.8, d = 0.4, shelves = 4, seed = 15 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, h / 2, -d / 2 + 0.015, w, h, 0.03, { color: DARK, texel: 2.5 });
  for (const s of [-1, 1]) P.box("paintedMetal", s * (w / 2 - 0.02), h / 2, 0, 0.04, h, d, { color: DARK });
  P.box("paintedMetal", 0, 0.04, 0, w, 0.08, d, { color: BLACK });
  const step = (h - 0.1) / shelves;
  for (let i = 0; i < shelves; i++) {
    const y = 0.08 + i * step;
    if (i > 0) P.box("paintedMetal", 0, y, 0, w - 0.08, 0.03, d - 0.02, { color: IMP.impGrey });
    let x = -w / 2 + 0.08;
    while (x < w / 2 - 0.2) {
      const bw = 0.28 + rand() * 0.14;
      if (x + bw > w / 2 - 0.05) break;
      const stack = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < stack; k++) {
        P.box("fabric", x + bw / 2, y + 0.02 + 0.045 + k * 0.09, 0, bw - 0.02, 0.085, d - 0.12, { color: [IMP.impGrey, IMP.impWhite, IMP.impMid][Math.floor(rand() * 3)], texel: 2 });
      }
      x += bw + 0.03;
    }
  }
  P.box("paintedMetal", 0, h - 0.02, 0, w, 0.04, d, { color: DARK });
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "shelf");
}

// Washroom counter with `n` basins, sensor taps, dark-gloss mirrors with strip lights above. Along
// local X, back against a wall at local −Z.
export function washCounter(kit, pos, yaw, n = 4, pitch = 1.6, mirrorMat = () => "darkGloss") {
  const P = placer(kit, pos, yaw);
  const len = n * pitch;
  P.box("paintedMetal", 0, 0.4, 0.33, len, 0.8, 0.6, { color: IMP.impMid, texel: 2.5 });
  P.box("paintedMetal", 0, 0.05, 0.33, len + 0.02, 0.1, 0.62, { color: BLACK });
  P.box("paintedMetal", 0, 0.83, 0.35, len + 0.04, 0.06, 0.7, { color: IMP.impWhite, texel: 2.5 });
  P.box("emitWarm", 0, 0.795, 0.705, len - 0.2, 0.012, 0.01);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * pitch;
    P.box("paintedMetal", x, 0.9, 0.36, 0.52, 0.08, 0.42, { color: IMP.impWhite, texel: 2.5 });
    P.box("darkGloss", x, 0.941, 0.36, 0.42, 0.004, 0.32);
    P.cyl("metal", x, 1.0, 0.1, 0.016, 0.24, "y", { color: STEEL, segments: 8 });
    P.cyl("metal", x, 1.11, 0.18, 0.013, 0.18, "z", { color: STEEL, segments: 8 });
    // mirror: polished-steel plate (env-reflective `metal`, pale tint) inside a thin lit frame, with a
    // housed light bar above it
    P.box("paintedMetal", x, 1.6, 0.02, 0.7, 0.88, 0.02, { color: BLACK });
    P.box(mirrorMat(i), x, 1.6, 0.036, 0.62, 0.8, 0.012, mirrorMat(i) === "metal" ? { color: 0xffffff, texel: 4 } : {});
    for (const s of [-1, 1]) {
      P.box("emitWarm", x + s * 0.325, 1.6, 0.036, 0.012, 0.8, 0.008);
      P.box("emitWarm", x, 1.6 + s * 0.406, 0.036, 0.66, 0.012, 0.008);
    }
    P.box("paintedMetal", x, 2.1, 0.06, 0.64, 0.06, 0.12, { color: BLACK });
    P.box("emitWarm", x, 2.068, 0.075, 0.56, 0.012, 0.07);
    P.box("metal", x, 1.15, 0.08, 0.5, 0.015, 0.12, { color: STEEL });
    P.box("paintedMetal", x + 0.6, 1.25, 0.06, 0.18, 0.28, 0.12, { color: IMP.impGrey });
  }
  P.collider([-len / 2, 0, 0], [len / 2, 0.95, 0.7], "counter");
}

// Hand dryer on a wall (local −Z behind).
export function handDryer(kit, pos, yaw) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.1, 0.28, 0.42, 0.2, { color: IMP.impGrey, texel: 2.5 });
  P.box("paintedMetal", 0, -0.18, 0.21, 0.2, 0.06, 0.02, { color: BLACK });
  P.box("emitBlue", 0.08, 0.12, 0.201, 0.03, 0.02, 0.004);
}

// Shower cubicle row: `n` cubicles of `pitch` along local X against a wall at local −Z (depth d).
export function showers(kit, pos, yaw, n = 4, { pitch = 1.25, d = 1.4, seed = 17 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const len = n * pitch;
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + i * pitch;
    P.box("impPanel", x, 1.1, d / 2, 0.05, 2.2, d, { color: IMP.impGrey, uv: "keep" });
    P.box("paintedMetal", x, 1.1, d - 0.03, 0.08, 2.2, 0.06, { color: DARK });
    P.collider([x - 0.03, 0, 0], [x + 0.03, 2.2, d], "shower-wall");
  }
  P.box("paintedMetal", 0, 2.24, d / 2, len + 0.08, 0.08, d, { color: DARK });
  P.cyl("metal", 0, 2.15, d - 0.06, 0.015, len, "x", { color: STEEL, segments: 8 });
  P.box("paintedMetal", 0, 0.03, d - 0.03, len, 0.06, 0.06, { color: IMP.impWhite });
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * pitch;
    P.cyl("metal", x, 1.55, 0.05, 0.015, 1.1, "y", { color: STEEL, segments: 8 });
    P.cyl("metal", x, 2.05, 0.2, 0.014, 0.34, "z", { color: STEEL, segments: 8 });
    P.cyl("metal", x, 2.02, 0.36, 0.08, 0.03, "y", { color: STEEL, segments: 14 });
    P.cyl("metal", x, 1.1, 0.06, 0.05, 0.04, "z", { color: DARK, segments: 12 });
    P.box("darkGloss", x, 0.026, 0.7, 0.28, 0.008, 0.28);
    P.box("emitWarm", x, 2.12, 0.1, 0.4, 0.012, 0.02);
    P.box("paintedMetal", x + 0.45, 1.5, 0.03, 0.02, 0.5, 0.06, { color: IMP.impWhite });
    if (rand() < 0.5) {
      const cw = 0.5 + rand() * 0.5;
      P.box("fabric", x - pitch / 2 + 0.05 + cw / 2, 1.15, d - 0.06, cw, 1.9, 0.03, { color: 0xe4e6ea, texel: 1.5 });
    }
  }
}

// Front-loading laundry unit against a wall (local −Z behind).
// `cycleMat` adds a "cycle running" lamp beside the drum door (the room passes its animated amber
// clone so the lamp pulses).
export function washer(kit, pos, yaw, seed = 19, cycleMat = null) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.45, 0, 0.8, 0.9, 0.7, { color: IMP.impGrey, texel: 2.5 });
  P.box("paintedMetal", 0, 0.05, 0, 0.82, 0.1, 0.72, { color: BLACK });
  P.cyl("darkGloss", 0, 0.48, 0.355, 0.27, 0.02, "z", { segments: 24 });
  P.cyl("metal", 0, 0.48, 0.36, 0.3, 0.03, "z", { color: STEEL, segments: 24, open: true });
  P.box("darkGloss", 0, 0.94, 0.0, 0.76, 0.06, 0.66);
  const Q = placer(kit, P.world(0, 0.84, 0.352), yaw);
  indicatorField(Q, 0, 0, 0, 0.5, 0.1, seed, { weights: [0.2, 0.4, 0.3, 0.1] });
  if (cycleMat) {
    P.box("paintedMetal", 0.33, 0.7, 0.352, 0.08, 0.08, 0.01, { color: BLACK });
    P.box(cycleMat, 0.33, 0.7, 0.358, 0.05, 0.05, 0.004);
  }
  P.collider([-0.4, 0, -0.35], [0.4, 0.97, 0.35], "washer");
}

// Folding/laundry table with stacked folded blankets on top.
export function foldTable(kit, pos, yaw, len = 1.8, seed = 23) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0.83, 0, len, 0.05, 0.85, { color: IMP.impGrey, texel: 2.5 });
  P.box("paintedMetal", 0, 0.78, 0, len - 0.1, 0.05, 0.75, { color: DARK });
  for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) P.box("paintedMetal", x, 0.4, 0, 0.1, 0.8, 0.7, { color: DARK });
  let x = -len / 2 + 0.3;
  while (x < len / 2 - 0.3) {
    const stack = 1 + Math.floor(rand() * 4);
    for (let k = 0; k < stack; k++) P.box("fabric", x, 0.855 + 0.045 + k * 0.09, (rand() - 0.5) * 0.1, 0.42, 0.085, 0.5, { color: [IMP.impGrey, IMP.impWhite, IMP.impMid][Math.floor(rand() * 3)], texel: 2 });
    x += 0.5 + rand() * 0.1;
  }
  P.collider([-len / 2, 0, -0.43], [len / 2, 0.86, 0.43], "table");
}

// Simple wall bench (slab on pedestals), along local X.
export function wallBench(kit, pos, yaw, len = 2.0) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.45, 0, len, 0.06, 0.4, { color: IMP.impMid, texel: 2.5 });
  for (const x of [-len / 2 + 0.25, len / 2 - 0.25]) P.box("paintedMetal", x, 0.21, 0, 0.1, 0.42, 0.32, { color: BLACK });
  P.collider([-len / 2, 0, -0.2], [len / 2, 0.5, 0.2], "bench");
}

// Wall hook rail (pos = rail centre) with hanging tunics and towels. Along local X, wall at local −Z.
export function hookRail(kit, pos, yaw, len = 1.6, seed = 21, towelsOnly = false) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0, 0.02, len, 0.05, 0.04, { color: DARK });
  const n = Math.max(2, Math.round(len / 0.4));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    P.cyl("metal", x, -0.03, 0.08, 0.012, 0.14, "z", { color: STEEL, segments: 6 });
    P.cyl("metal", x, -0.08, 0.13, 0.012, 0.1, "y", { color: STEEL, segments: 6 });
    const r = rand();
    if (r < 0.25) continue;
    if (r < 0.7 && !towelsOnly) {
      P.box("paintedMetal", x, -0.12, 0.13, 0.4, 0.06, 0.14, { color: DARK });
      P.box("fabric", x, -0.6, 0.12, 0.36, 0.92, 0.12, { color: rand() < 0.5 ? BLACK : DARK, texel: 2 });
      P.box("paintedMetal", x, -0.6, 0.181, 0.03, 0.8, 0.004, { color: IMP.impGrey });
    } else {
      P.box("fabric", x, -0.38, 0.1, 0.3, 0.62, 0.05, { color: rand() < 0.5 ? IMP.impWhite : IMP.impGrey, texel: 2 });
    }
  }
}

// Foot locker: low stowage box with a lid seam, two latches and a status tab. Along local X, latches +Z.
// `open` hinges the lid up at the back (local −Z) and shows folded kit inside.
export function footLocker(kit, pos, yaw, seed = 25, w = 0.8, open = false) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const body = rand() < 0.5 ? IMP.impMid : IMP.impGrey;
  if (open) {
    P.box("paintedMetal", 0, 0.17, 0, w, 0.34, 0.45, { color: body, texel: 2.5 });
    P.box("paintedMetal", 0, 0.03, 0, w + 0.01, 0.06, 0.46, { color: BLACK });
    // lid hinged at the back edge, swung up ~75°
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.3, 0, 0)));
    kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.02, 0.03, 0.47), { pos: P.world(0, 0.35 + 0.235 * Math.sin(1.3), -0.225 + 0.235 * Math.cos(1.3)), quat: q, color: body, texel: 2.5 });
    // contents: folded tunics and a rolled towel
    P.box("fabric", -w / 4, 0.3, 0.02, w / 2 - 0.08, 0.1, 0.36, { color: BLACK, texel: 2 });
    P.box("fabric", w / 4, 0.28, 0.02, w / 2 - 0.1, 0.06, 0.34, { color: IMP.impGrey, texel: 2 });
    P.cyl("fabric", w / 4, 0.36, 0.0, 0.05, 0.3, "x", { color: IMP.impWhite, segments: 10, texel: 2 });
  } else {
    P.box("paintedMetal", 0, 0.22, 0, w, 0.44, 0.45, { color: body, texel: 2.5 });
    P.box("paintedMetal", 0, 0.34, 0, w + 0.02, 0.012, 0.47, { color: BLACK });
    P.box("paintedMetal", 0, 0.03, 0, w + 0.01, 0.06, 0.46, { color: BLACK });
    for (const x of [-w / 4, w / 4]) P.box("metal", x, 0.3, 0.232, 0.08, 0.06, 0.015, { color: STEEL });
    P.box(rand() < 0.5 ? "emitBlue" : "emitAmber", w / 2 - 0.1, 0.4, 0.228, 0.05, 0.015, 0.006);
  }
  P.collider([-w / 2, 0, -0.23], [w / 2, open ? 0.8 : 0.45, 0.23], "footlocker");
}

// Upper wall cabinet (pos = centre of the door face, doors toward local +Z, wall at local −Z).
export function wallCabinet(kit, pos, yaw, { w = 0.9, h = 0.6, d = 0.35, color = IMP.impGrey, emit = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, -d / 2, w, h, d, { color, texel: 2.5 });
  P.box("paintedMetal", 0, 0, 0.004, 0.016, h - 0.08, 0.008, { color: BLACK });
  for (const s of [-1, 1]) P.box("metal", s * 0.07, -h / 2 + 0.14, 0.014, 0.025, 0.16, 0.02, { color: STEEL });
  P.box(emit, -w / 2 + 0.1, h / 2 - 0.07, 0.006, 0.06, 0.014, 0.006);
}

// Towel rack: dark shelf on brackets with rolled towels stood on it and two hung towels below.
// Along local X, wall at local −Z, pos = shelf centre.
export function towelRack(kit, pos, yaw, len = 1.4, seed = 5) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0, 0.15, len, 0.03, 0.3, { color: DARK });
  for (const x of [-len / 2 + 0.15, len / 2 - 0.15]) P.box("paintedMetal", x, -0.08, 0.06, 0.03, 0.14, 0.12, { color: BLACK });
  P.cyl("metal", 0, 0.1, 0.29, 0.01, len - 0.06, "x", { color: STEEL, segments: 6 });
  for (let x = -len / 2 + 0.1; x < len / 2 - 0.08; x += 0.19) {
    if (rand() < 0.15) continue;
    P.cyl("fabric", x, 0.16, 0.15, 0.075, 0.3, "y", { color: rand() < 0.6 ? IMP.impWhite : IMP.impGrey, segments: 10, texel: 2 });
  }
  P.cyl("metal", 0, -0.18, 0.1, 0.012, len - 0.2, "x", { color: STEEL, segments: 6 });
  for (const x of [-len / 4, len / 4]) P.box("fabric", x, -0.5, 0.1, 0.3, 0.62, 0.04, { color: IMP.impWhite, texel: 2 });
}

// Duffel bag lying along local X (pos = floor/shelf point under its centre).
export function duffel(kit, pos, yaw, color = BLACK) {
  const P = placer(kit, pos, yaw);
  P.cyl("fabric", 0, 0.16, 0, 0.16, 0.62, "x", { color, segments: 12, texel: 2 });
  P.box("paintedMetal", 0, 0.3, 0, 0.16, 0.03, 0.06, { color: DARK });
  for (const s of [-1, 1]) P.cyl("metal", s * 0.31, 0.16, 0, 0.17, 0.02, "x", { color: DARK, segments: 12 });
}

// Wall-bracketed suppressant cylinder (pos = cylinder centre). Wall at local −Z.
export function extinguisher(kit, pos, yaw) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.03, 0.2, 0.5, 0.06, { color: BLACK });
  for (const x of [-0.07, 0.07]) P.box("metal", x, 0.05, 0.08, 0.02, 0.03, 0.1, { color: STEEL });
  P.cyl("paintedMetal", 0, 0, 0.14, 0.08, 0.5, "y", { color: 0xa8231a, segments: 12 });
  P.cyl("metal", 0, 0.29, 0.14, 0.03, 0.08, "y", { color: STEEL, segments: 8 });
  P.cyl("metal", 0, 0.34, 0.14, 0.045, 0.03, "y", { color: BLACK, segments: 8 });
  P.box("paintedMetal", 0, 0.04, 0.222, 0.12, 0.1, 0.006, { color: IMP.impWhite });
}

// Low holo-table for a lounge nook: dark plinth, gloss top, blue projector disc and a base glow.
export function holoTable(kit, pos, yaw, { len = 1.3, w = 0.8, h = 0.5 } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, (h - 0.06) / 2, 0, len - 0.5, h - 0.06, w - 0.3, { color: BLACK, texel: 2.5 });
  P.box("paintedMetal", 0, h - 0.03, 0, len, 0.06, w, { color: DARK, texel: 2.5 });
  P.box("darkGloss", 0, h + 0.004, 0, len - 0.16, 0.008, w - 0.16);
  P.cyl("emitBlue", 0, h + 0.012, 0, 0.22, 0.008, "y", { segments: 20 });
  for (const s of [-1, 1]) P.box("emitBlue", 0, 0.12, s * (w / 2 - 0.144), len - 0.6, 0.012, 0.01);
  P.collider([-len / 2, 0, -w / 2], [len / 2, h, w / 2], "table");
}

// Two-unit locker bank in the shared `lockerBank` style, with per-door states: "closed", "open"
// (door swung out ~100°, lit interior with a shelf, hanging tunic and boots) or "ajar" (door 20°
// open, dark inside). Along local X, doors toward +Z.
export function lockerPair(kit, pos, yaw, { unit = 0.6, h = 2.0, d = 0.5, color = IMP.impMid, states = ["closed", "closed"], seed = 3 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const w = 2 * unit;
  P.box("paintedMetal", 0, h / 2, 0, w, h, d, { color, texel: 2.5 });
  P.box("paintedMetal", 0, 0.05, 0, w, 0.1, d, { color: BLACK });
  for (let i = 0; i < 2; i++) {
    const x = -w / 2 + (i + 0.5) * unit;
    const st = states[i] || "closed";
    if (st === "closed") {
      P.box("impPanel", x, h / 2, d / 2 + 0.012, unit - 0.04, h - 0.1, 0.02, { color: IMP.impGrey, uv: "keep" });
      P.box("metal", x + unit / 2 - 0.08, h * 0.55, d / 2 + 0.03, 0.02, 0.18, 0.02, { color: STEEL });
      for (let v = 0; v < 4; v++) P.box("paintedMetal", x, h - 0.3 - v * 0.05, d / 2 + 0.026, unit - 0.2, 0.012, 0.01, { color: DARK });
      P.box(i % 3 === 0 ? "emitAmber" : "emitBlue", x - unit / 2 + 0.1, h - 0.15, d / 2 + 0.025, 0.05, 0.02, 0.006);
      continue;
    }
    // open interior: recess, shelf, rail with a hanging tunic, boots on the floor, a lit strip
    P.box("paintedMetal", x, h / 2 + 0.03, 0.03, unit - 0.08, h - 0.16, d - 0.06, { color: BLACK });
    P.box("impPanel", x, h / 2 + 0.03, -d / 2 + 0.04, unit - 0.1, h - 0.2, 0.01, { color: DARK, uv: "keep" });
    P.box("paintedMetal", x, h - 0.45, 0.02, unit - 0.1, 0.02, d - 0.1, { color: IMP.impGrey });
    P.cyl("metal", x, h - 0.5, 0.0, 0.01, unit - 0.14, "x", { color: STEEL, segments: 6 });
    P.box("emitWarm", x, h - 0.12, 0.05, unit - 0.2, 0.01, 0.03);
    if (st === "open") {
      P.box("fabric", x - 0.08, h - 0.95, 0.0, 0.26, 0.86, 0.06, { color: rand() < 0.5 ? DARK : IMP.impMid, texel: 2 });
      P.box("fabric", x + 0.14, h - 0.52, -0.05, 0.14, 0.14, 0.2, { color: IMP.impWhite, texel: 2 });
      for (const s of [-1, 1]) P.box("paintedMetal", x + s * 0.07, 0.24, 0.02, 0.1, 0.28, 0.3, { color: BLACK, texel: 2 });
      P.box("paintedMetal", x, h - 0.3, -d / 2 + 0.06, 0.16, 0.1, 0.02, { color: CARD[seed % CARD.length] });
    } else {
      P.box("fabric", x, 0.25, 0.0, unit - 0.2, 0.2, 0.3, { color: BLACK, texel: 2 });
    }
    // the door itself, hinged at the −X edge of the unit
    const ang = st === "open" ? 1.75 : 0.35;
    const hingeX = x - unit / 2 + 0.02;
    const dw = unit - 0.04;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, 0)));
    const cx = hingeX + (dw / 2) * Math.cos(ang);
    const cz = d / 2 + 0.012 + (dw / 2) * Math.sin(ang);
    kit.add("impPanel", new THREE.BoxGeometry(dw, h - 0.1, 0.02), { pos: P.world(cx, h / 2, cz), quat: q, color: IMP.impGrey, uv: "keep" });
    kit.add("paintedMetal", new THREE.BoxGeometry(dw - 0.16, 0.012, 0.01), { pos: P.world(hingeX + (dw / 2) * Math.cos(ang) - 0.014 * Math.sin(ang), h - 0.3, cz + 0.014 * Math.cos(ang)), quat: q, color: DARK });
    if (st === "open") P.collider([hingeX - 0.02, 0, d / 2], [hingeX + 0.1, h, d / 2 + dw], "locker-door");
  }
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "lockers");
}

// Privacy curtain hung across part of a bay mouth: rail on brackets, runner rings, fabric drop in
// alternating fold offsets. `from` is the world point of the rail's start, `dir` a unit vector along
// the rail (x/z), `len` the drawn length, `drop` the fabric height.
export function mouthCurtain(kit, from, dir, len, drop, color = 0x3b4658, seed = 9) {
  const rand = rng(seed);
  const [fx, fy, fz] = from;
  const along = (t) => [fx + dir[0] * t, fy, fz + dir[2] * t];
  const railLen = len + 0.6;
  const m = along(railLen / 2);
  const axis = Math.abs(dir[0]) > 0.5 ? "x" : "z";
  kit.cyl("metal", m[0], fy, m[2], 0.014, railLen, axis, { color: STEEL, segments: 8 });
  for (const t of [0.05, railLen / 2, railLen - 0.05]) {
    const p = along(t);
    kit.box("paintedMetal", p[0], fy + 0.06, p[2], 0.05, 0.12, 0.05, { color: BLACK });
  }
  const strips = Math.max(2, Math.round(len / 0.36));
  const sw = len / strips;
  const perp = [dir[2], 0, -dir[0]];
  for (let i = 0; i < strips; i++) {
    const p = along((i + 0.5) * sw);
    const off = (i % 2 ? 0.028 : -0.028) + (rand() - 0.5) * 0.01;
    const shade = i % 2 ? color : new THREE.Color(color).multiplyScalar(0.86).getHex();
    kit.box("fabric", p[0] + perp[0] * off, fy - 0.06 - drop / 2, p[2] + perp[2] * off, axis === "x" ? sw + 0.01 : 0.03, drop, axis === "x" ? 0.03 : sw + 0.01, { color: shade, texel: 2 });
    kit.cyl("metal", p[0], fy - 0.03, p[2], 0.022, 0.012, axis, { color: STEEL, segments: 8 });
  }
}

// Cleaning kit: bucket with a wringer and a mop leaning in it, plus an A-frame caution sign.
export function wetFloorKit(kit, pos, yaw, seed = 12) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.cyl("paintedMetal", 0, 0.19, 0, 0.19, 0.38, "y", { color: DARK, segments: 16, texel: 2.5 });
  P.cyl("paintedMetal", 0, 0.36, 0, 0.2, 0.03, "y", { color: IMP.impAmber, segments: 16 });
  P.box("paintedMetal", 0.1, 0.44, 0, 0.2, 0.12, 0.26, { color: BLACK });
  P.box("paintedMetal", 0.1, 0.51, 0, 0.16, 0.02, 0.22, { color: IMP.impGrey });
  for (const [sx, sz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) P.cyl("paintedMetal", sx, 0.03, sz, 0.03, 0.03, "y", { color: BLACK, segments: 8 });
  // mop: handle leaning back, head resting in the bucket
  rod(kit, P.world(-0.06, 0.3, 0.02), P.world(-0.32, 1.55, -0.28), 0.014, "metal", STEEL);
  P.box("fabric", -0.05, 0.3, 0.02, 0.16, 0.14, 0.16, { color: IMP.impGrey, texel: 2 });
  // A-frame sign 0.5 m off, two leaning plates with a black glyph band
  const sx0 = 0.55 + rand() * 0.1;
  for (const s of [-1, 1]) {
    const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(-s * 0.3, 0, 0)); // tops meet
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(lean);
    kit.add("paintedMetal", new THREE.BoxGeometry(0.36, 0.62, 0.012), { pos: P.world(sx0, 0.31, s * 0.1), quat: q, color: IMP.impAmber });
    const b = new THREE.Vector3(0, 0.09, s * 0.009).applyQuaternion(lean);
    kit.add("paintedMetal", new THREE.BoxGeometry(0.28, 0.16, 0.006), { pos: P.world(sx0 + b.x, 0.31 + b.y, s * 0.1 + b.z), quat: q, color: BLACK });
  }
  P.collider([-0.2, 0, -0.2], [0.2, 0.55, 0.2], "bucket");
  P.collider([sx0 - 0.2, 0, -0.22], [sx0 + 0.2, 0.62, 0.22], "sign");
}

// Suspended bar fixture (same silhouette as the shared dropLight) with a clean-plated housing: dark
// core at texel 4 clad in impPanel plates, so the aisle "beams" stop reading as mottled concrete.
export function barLight(kit, pos, { w = 2.4, d = 0.4, stem = 0.5, mat = "emitWarmSoft" } = {}) {
  const [x, y0, z] = pos;
  const y = y0 - stem - 0.06;
  kit.box("paintedMetal", x, y0 - stem / 2, z, 0.06, stem, 0.06, { color: BLACK });
  kit.box("paintedMetal", x, y, z, w, 0.12, d, { color: DARK, texel: 4 });
  for (const s of [-1, 1]) {
    kit.box("impPanel", x, y, z + s * (d / 2 + 0.004), w, 0.11, 0.008, { color: DARK, uv: "keep" });
    kit.box("impPanel", x + s * (w / 2 + 0.004), y, z, 0.008, 0.11, d, { color: DARK, uv: "keep" });
  }
  kit.box("impPanel", x, y + 0.064, z, w - 0.02, 0.008, d - 0.02, { color: DARK, uv: "keep" });
  kit.box(mat, x, y - 0.065, z, w - 0.12, 0.02, d - 0.12, { uv: "keep" });
}
