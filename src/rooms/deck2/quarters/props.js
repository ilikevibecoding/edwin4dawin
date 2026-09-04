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
const CARD = [0xd8402a, 0x2f7fe0, 0xe0b040, 0x3fbf7f, 0xf0f0f0, 0xe07a30, 0x8a5fd0];

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
  P.box("paintedMetal", 0, 0, -0.08, 0.32, 0.4, 0.16, { color: DARK, texel: 1 });
  P.box("paintedMetal", 0, 0, 0.005, 0.26, 0.34, 0.01, { color: IMP.impMid });
  P.box(rand() < 0.6 ? "emitBlue" : "emitAmber", 0.08, 0.12, 0.012, 0.04, 0.02, 0.006);
  P.cyl("metal", 0, 0.36, -0.08, 0.025, 0.35, "y", { color: STEEL, segments: 8 });
}

// Stacked bunks along local X (length 2.1), open side +Z. `head` = −1 puts the pillow at −X, +1 at
// +X. Each tier: slab, mattress, pillow, blanket (spread or folded), reading lamp, safety rail,
// pinned cards; a drawer under the bottom tier and a ladder at the foot end. The head end is a solid
// headboard; the foot end is an open post frame so the tiers read in profile from the bay mouth.
export function bunk(kit, PALETTE, pos, yaw, { tiers = 3, len = 2.1, w = 0.9, gap = 0.75, seed = 7, head = -1 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const frame = DARK;
  const h = 0.3 + tiers * gap;
  const hx = head * (len / 2 - 0.35);
  P.box("paintedMetal", 0, h / 2, -w / 2 - 0.02, len, h, 0.04, { color: frame, texel: 1 });
  P.box("paintedMetal", head * (len / 2 - 0.03), h / 2, 0, 0.06, h, w + 0.04, { color: frame });
  for (const z of [-w / 2 - 0.01, w / 2 - 0.01]) P.box("paintedMetal", -head * (len / 2 - 0.03), h / 2, z, 0.06, h, 0.06, { color: frame });
  for (let i = 0; i < tiers; i++) {
    const y = 0.3 + i * gap;
    P.box("paintedMetal", 0, y, 0, len, 0.08, w, { color: frame, texel: 1 });
    P.box("fabric", 0, y + 0.1, 0, len - 0.1, 0.12, w - 0.08, { color: IMP.impGrey, texel: 2 });
    P.box("fabric", hx, y + 0.18, 0, 0.5, 0.06, w - 0.3, { color: IMP.impWhite, texel: 2 });
    const r = rand();
    if (r < 0.5) P.box("fabric", -head * 0.15, y + 0.19, -0.05, len - 0.9, 0.05, w - 0.25, { color: IMP.impMid, texel: 2 });
    else if (r < 0.85) P.box("fabric", -head * (len / 2 - 0.35), y + 0.2, 0, 0.35, 0.09, w - 0.35, { color: IMP.impMid, texel: 2 });
    P.box("paintedMetal", hx, y + gap - 0.085, -w / 2 + 0.03, 0.34, 0.03, 0.06, { color: BLACK });
    P.box("emitWhite", hx, y + gap - 0.112, -w / 2 + 0.035, 0.3, 0.02, 0.03);
    if (i > 0) P.cyl("metal", -head * 0.2, y + 0.3, w / 2, 0.015, len * 0.55, "x", { color: STEEL, segments: 8 });
    const nCards = Math.floor(rand() * 3);
    for (let c = 0; c < nCards; c++) {
      const cw = rand() < 0.5 ? 0.12 : 0.09;
      const ch = cw === 0.12 ? 0.09 : 0.12;
      const cx = -len / 2 + 0.3 + rand() * (len - 0.6);
      const cy = y + 0.36 + rand() * 0.2;
      P.box("paintedMetal", cx, cy, -w / 2 + 0.004, cw, ch, 0.006, { color: CARD[Math.floor(rand() * CARD.length)] });
    }
    if (rand() < 0.3) P.box("emitBlue", -head * 0.5, y + 0.44, -w / 2 + 0.004, 0.1, 0.07, 0.006);
  }
  P.box("paintedMetal", 0, h - 0.02, 0, len, 0.04, w + 0.04, { color: frame });
  P.box("paintedMetal", 0, 0.13, 0.02, len - 0.2, 0.22, w - 0.1, { color: IMP.impMid, texel: 1 });
  for (const x of [-len / 4, len / 4]) P.box("metal", x, 0.13, w / 2 - 0.02, 0.25, 0.02, 0.02, { color: STEEL });
  const lx = -head * (len / 2 - 0.2);
  for (const dx of [-0.16, 0.16]) P.cyl("metal", lx + dx, (h - 0.2) / 2 + 0.1, w / 2 + 0.04, 0.014, h - 0.2, "y", { color: STEEL, segments: 8 });
  for (let y = 0.45; y < h - 0.3; y += 0.3) P.cyl("metal", lx, y, w / 2 + 0.04, 0.011, 0.32, "x", { color: STEEL, segments: 6 });
  P.collider([-len / 2, 0, -w / 2 - 0.05], [len / 2, h, w / 2 + 0.08], "bunk");
}

// Fold-out desk hinged on a wall panel behind it (local −Z), with a data-pad and a pedestal stool.
export function foldDesk(kit, pos, yaw, seed = 5) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0.75, 0.22, 0.52, 0.03, 0.44, { color: IMP.impGrey, texel: 1 });
  P.box("paintedMetal", 0, 0.72, 0.03, 0.5, 0.06, 0.06, { color: BLACK });
  for (const s of [-1, 1]) rod(kit, P.world(s * 0.2, 0.735, 0.4), P.world(s * 0.2, 0.42, 0.02), 0.012);
  P.box("darkGloss", 0.05, 0.77, 0.24, 0.26, 0.012, 0.18);
  P.box(rand() < 0.5 ? "emitBlue" : "emitAmber", 0.05, 0.778, 0.24, 0.2, 0.004, 0.12);
  P.box("paintedMetal", -0.16, 0.78, 0.12, 0.1, 0.03, 0.14, { color: CARD[Math.floor(rand() * CARD.length)] });
  P.box("paintedMetal", 0, 1.35, 0.01, 0.4, 0.5, 0.02, { color: DARK });
  P.box("emitWhite", 0, 1.62, 0.02, 0.3, 0.012, 0.01);
  for (let i = 0; i < 3; i++) P.box("paintedMetal", -0.12 + i * 0.12, 1.32 + (i % 2) * 0.06, 0.022, 0.09, 0.12, 0.004, { color: CARD[(seed + i) % CARD.length] });
  P.collider([-0.26, 0, 0], [0.26, 0.78, 0.44], "desk");
  stool(kit, P.world(0, 0, 0.75));
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
  P.box("paintedMetal", 0, 0.42, 0, 0.9, 0.7, 0.65, { color: IMP.impMid, texel: 1 });
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

// Notice board: dark plate with pinned coloured cards (no text) and two lit data-cards.
export function noticeBoard(kit, pos, yaw, w = 1.6, h = 1.0, seed = 13) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0, -0.03, w + 0.08, h + 0.08, 0.06, { color: BLACK });
  P.box("paintedMetal", 0, 0, 0.002, w, h, 0.01, { color: DARK });
  const n = Math.floor((w * h) / 0.06);
  for (let i = 0; i < n; i++) {
    const cw = 0.1 + rand() * 0.1;
    const ch = 0.1 + rand() * 0.1;
    const x = -w / 2 + 0.1 + rand() * (w - 0.2);
    const y = -h / 2 + 0.1 + rand() * (h - 0.2);
    const emit = rand() < 0.12;
    P.box(emit ? "emitBlue" : "paintedMetal", x, y, 0.01 + rand() * 0.004, cw, ch, 0.005, emit ? {} : { color: CARD[Math.floor(rand() * CARD.length)] });
  }
  P.box("emitWhite", 0, h / 2 + 0.06, 0.02, w * 0.7, 0.015, 0.02);
}

// Open kit shelf with folded blankets / towels (fabric bundles). Front = +Z.
export function kitShelf(kit, pos, yaw, { w = 1.2, h = 1.8, d = 0.4, shelves = 4, seed = 15 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, h / 2, -d / 2 + 0.015, w, h, 0.03, { color: DARK, texel: 1 });
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
export function washCounter(kit, pos, yaw, n = 4, pitch = 1.6) {
  const P = placer(kit, pos, yaw);
  const len = n * pitch;
  P.box("paintedMetal", 0, 0.4, 0.33, len, 0.8, 0.6, { color: IMP.impMid, texel: 1 });
  P.box("paintedMetal", 0, 0.05, 0.33, len + 0.02, 0.1, 0.62, { color: BLACK });
  P.box("paintedMetal", 0, 0.83, 0.35, len + 0.04, 0.06, 0.7, { color: IMP.impWhite, texel: 1 });
  P.box("emitWarm", 0, 0.795, 0.705, len - 0.2, 0.012, 0.01);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * pitch;
    P.box("paintedMetal", x, 0.9, 0.36, 0.52, 0.08, 0.42, { color: IMP.impWhite, texel: 1 });
    P.box("darkGloss", x, 0.941, 0.36, 0.42, 0.004, 0.32);
    P.cyl("metal", x, 1.0, 0.1, 0.016, 0.24, "y", { color: STEEL, segments: 8 });
    P.cyl("metal", x, 1.11, 0.18, 0.013, 0.18, "z", { color: STEEL, segments: 8 });
    P.box("darkGloss", x, 1.6, 0.03, 0.62, 0.8, 0.02);
    P.box("paintedMetal", x, 1.6, 0.02, 0.68, 0.86, 0.01, { color: BLACK });
    P.box("paintedMetal", x, 2.06, 0.05, 0.6, 0.04, 0.08, { color: BLACK });
    P.box("emitWhite", x, 2.05, 0.06, 0.56, 0.015, 0.03);
    P.box("metal", x, 1.15, 0.08, 0.5, 0.015, 0.12, { color: STEEL });
    P.box("paintedMetal", x + 0.6, 1.25, 0.06, 0.18, 0.28, 0.12, { color: IMP.impGrey });
  }
  P.collider([-len / 2, 0, 0], [len / 2, 0.95, 0.7], "counter");
}

// Hand dryer on a wall (local −Z behind).
export function handDryer(kit, pos, yaw) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.1, 0.28, 0.42, 0.2, { color: IMP.impGrey, texel: 1 });
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
export function washer(kit, pos, yaw, seed = 19) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.45, 0, 0.8, 0.9, 0.7, { color: IMP.impGrey, texel: 1 });
  P.box("paintedMetal", 0, 0.05, 0, 0.82, 0.1, 0.72, { color: BLACK });
  P.cyl("darkGloss", 0, 0.48, 0.355, 0.27, 0.02, "z", { segments: 24 });
  P.cyl("metal", 0, 0.48, 0.36, 0.3, 0.03, "z", { color: STEEL, segments: 24, open: true });
  P.box("darkGloss", 0, 0.94, 0.0, 0.76, 0.06, 0.66);
  const Q = placer(kit, P.world(0, 0.84, 0.352), yaw);
  indicatorField(Q, 0, 0, 0, 0.5, 0.1, seed, { weights: [0.2, 0.4, 0.3, 0.1] });
  P.collider([-0.4, 0, -0.35], [0.4, 0.97, 0.35], "washer");
}

// Folding/laundry table with stacked folded blankets on top.
export function foldTable(kit, pos, yaw, len = 1.8, seed = 23) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0.83, 0, len, 0.05, 0.85, { color: IMP.impGrey, texel: 1 });
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
  P.box("paintedMetal", 0, 0.45, 0, len, 0.06, 0.4, { color: IMP.impMid, texel: 1 });
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
export function footLocker(kit, pos, yaw, seed = 25, w = 0.8) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0.22, 0, w, 0.44, 0.45, { color: rand() < 0.5 ? IMP.impMid : IMP.impGrey, texel: 1 });
  P.box("paintedMetal", 0, 0.34, 0, w + 0.02, 0.012, 0.47, { color: BLACK });
  P.box("paintedMetal", 0, 0.03, 0, w + 0.01, 0.06, 0.46, { color: BLACK });
  for (const x of [-w / 4, w / 4]) P.box("metal", x, 0.3, 0.232, 0.08, 0.06, 0.015, { color: STEEL });
  P.box(rand() < 0.5 ? "emitBlue" : "emitAmber", w / 2 - 0.1, 0.4, 0.228, 0.05, 0.015, 0.006);
  P.collider([-w / 2, 0, -0.23], [w / 2, 0.45, 0.23], "footlocker");
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
  P.box("paintedMetal", 0, (h - 0.06) / 2, 0, len - 0.5, h - 0.06, w - 0.3, { color: BLACK, texel: 1 });
  P.box("paintedMetal", 0, h - 0.03, 0, len, 0.06, w, { color: DARK, texel: 1 });
  P.box("darkGloss", 0, h + 0.004, 0, len - 0.16, 0.008, w - 0.16);
  P.cyl("emitBlue", 0, h + 0.012, 0, 0.22, 0.008, "y", { segments: 20 });
  for (const s of [-1, 1]) P.box("emitBlue", 0, 0.12, s * (w / 2 - 0.144), len - 0.6, 0.012, 0.01);
  P.collider([-len / 2, 0, -w / 2], [len / 2, h, w / 2], "table");
}
