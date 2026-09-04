// Mess-hall / galley props (local to d2-mess). Everything is kit-bashed through the shared placer so
// the yaw convention matches _shared/props.js: local +Z is the prop's front.
import { placer, indicatorField } from "../_shared/props.js";
import { col } from "../_shared/palette.js";
import { rng } from "../../../kit.js";

const C = (PALETTE, k) => col(PALETTE, k);

// Serving counter along world X. zFront is the dining-side face; the galley side is zFront + depth.
export function servingCounter(kit, PALETTE, { x0, x1, zFront, depth = 0.8, y, h = 0.9 }) {
  const cx = (x0 + x1) / 2;
  const len = x1 - x0;
  const cz = zFront + depth / 2;
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  kit.box("paintedMetal", cx, y + h / 2, cz, len, h, depth, { color: mid, texel: 1 });
  kit.box("paintedMetal", cx, y + 0.06, cz, len - 0.04, 0.12, depth + 0.02, { color: black });
  const n = Math.round(len / 2);
  for (let i = 0; i < n; i++) {
    const px = x0 + (i + 0.5) * (len / n);
    kit.box("paintedMetal", px, y + 0.52, zFront - 0.012, len / n - 0.14, 0.6, 0.024, { color: dark, texel: 1 });
  }
  kit.box("metal", cx, y + h + 0.02, cz, len + 0.06, 0.04, depth + 0.06, { color: steel, texel: 1 });
  // food wells (dark recesses) with steel lids on most of them
  const wells = Math.floor(len / 0.7);
  for (let i = 0; i < wells; i++) {
    const wx = x0 + 0.35 + (i + 0.5) * ((len - 0.7) / wells);
    kit.box("darkGloss", wx, y + h + 0.042, cz + 0.05, 0.5, 0.004, 0.36);
    if (i % 3 !== 1) kit.box("metal", wx, y + h + 0.07, cz + 0.05, 0.52, 0.05, 0.38, { color: steel });
    else kit.box("emitAmber", wx, y + h + 0.045, cz + 0.05, 0.44, 0.004, 0.3);
  }
  kit.box("emitAmber", cx, y + h - 0.14, zFront - 0.02, len - 0.4, 0.02, 0.01);
  // tray rail on brackets
  const rz = zFront - 0.28;
  kit.cyl("metal", cx, y + 0.96, rz, 0.025, len - 0.2, "x", { color: steel, segments: 10 });
  kit.cyl("metal", cx, y + 0.72, rz, 0.02, len - 0.2, "x", { color: steel, segments: 8 });
  for (let bx = x0 + 0.5; bx <= x1 - 0.4; bx += 2.0) {
    kit.box("paintedMetal", bx, y + 0.96, zFront - 0.14, 0.05, 0.05, 0.28, { color: dark });
    kit.box("paintedMetal", bx, y + 0.72, zFront - 0.14, 0.05, 0.05, 0.28, { color: dark });
  }
  // sneeze guard: glass panes on steel posts with a top rail
  const gz = zFront + 0.26;
  const panes = Math.max(1, Math.round(len / 2.5));
  for (let i = 0; i <= panes; i++) kit.cyl("metal", x0 + (i * len) / panes, y + h + 0.4, gz, 0.02, 0.72, "y", { color: steel, segments: 10 });
  for (let i = 0; i < panes; i++) kit.box("glass", x0 + (i + 0.5) * (len / panes), y + h + 0.5, gz, len / panes - 0.06, 0.42, 0.012, { uv: "keep" });
  kit.cyl("metal", cx, y + h + 0.75, gz, 0.02, len, "x", { color: steel, segments: 10 });
  kit.collider([x0, y, rz - 0.05], [x1, y + h + 0.2, zFront + depth], "counter");
}

// Heat lamp hung from a header above the serving line: stem, dark housing, amber diffuser.
export function heatLamp(kit, PALETTE, x, yTop, z, { drop = 0.45 } = {}) {
  const black = C(PALETTE, "impBlack");
  kit.box("paintedMetal", x, yTop - drop / 2, z, 0.05, drop, 0.05, { color: black });
  kit.box("paintedMetal", x, yTop - drop - 0.08, z, 0.7, 0.16, 0.32, { color: black, texel: 1 });
  kit.box("emitAmber", x, yTop - drop - 0.165, z, 0.6, 0.01, 0.22);
}

// Beverage dispenser tower: dark cylinder, blue ring, indicator panel, spout and drip tray on +Z.
export function dispenserTower(kit, PALETTE, pos, yaw, seed = 3) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.cyl("paintedMetal", 0, 0.06, 0, 0.36, 0.12, "y", { color: black, segments: 20 });
  Q.cyl("paintedMetal", 0, 0.8, 0, 0.3, 1.36, "y", { color: dark, segments: 20, texel: 1 });
  Q.cyl("metal", 0, 1.5, 0, 0.32, 0.06, "y", { color: steel, segments: 20 });
  Q.cyl("emitBlue", 0, 1.44, 0, 0.306, 0.03, "y", { segments: 20, open: true });
  indicatorField(Q, 0, 1.22, 0.3, 0.36, 0.14, seed);
  Q.box("darkGloss", 0, 0.95, 0.31, 0.3, 0.3, 0.02);
  Q.box("metal", 0, 1.03, 0.36, 0.06, 0.05, 0.12, { color: steel });
  Q.box("metal", 0, 0.8, 0.38, 0.34, 0.03, 0.16, { color: steel });
  Q.box("grate", 0, 0.82, 0.38, 0.3, 0.012, 0.12);
  Q.collider([-0.36, 0, -0.36], [0.36, 1.55, 0.46], "dispenser");
}

// Galley vat / oven: big grey box, two round black hatches, amber indicator strips, lid rims on top.
export function vat(kit, PALETTE, pos, yaw, { w = 2.6, h = 1.9, d = 1.2, seed = 4 } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const grey = C(PALETTE, "impGrey");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: grey, texel: 1 });
  Q.box("paintedMetal", 0, 0.08, 0, w - 0.06, 0.16, d + 0.02, { color: black });
  Q.box("metal", 0, h + 0.03, 0, w + 0.04, 0.06, d + 0.04, { color: steel, texel: 1 });
  for (const hx of [-w / 4, w / 4]) {
    Q.cyl("paintedMetal", hx, 1.0, d / 2 + 0.04, 0.46, 0.08, "z", { color: black, segments: 24 });
    Q.cyl("metal", hx, 1.0, d / 2 + 0.09, 0.32, 0.03, "z", { color: steel, segments: 24 });
    Q.box("metal", hx + 0.38, 1.0, d / 2 + 0.1, 0.06, 0.3, 0.06, { color: steel });
    Q.box("emitAmber", hx, 1.6, d / 2 + 0.012, 0.6, 0.03, 0.01);
    Q.cyl("metal", hx, h + 0.1, 0, 0.42, 0.1, "y", { color: steel, segments: 24 });
    Q.cyl("paintedMetal", hx, h + 0.16, 0, 0.36, 0.06, "y", { color: dark, segments: 24 });
  }
  indicatorField(Q, 0, 1.45, d / 2 + 0.01, 0.5, 0.22, seed);
  Q.box("darkGloss", 0, 0.5, d / 2 + 0.008, 0.6, 0.3, 0.012);
  Q.box("emitRedImp", -0.2, 0.5, d / 2 + 0.016, 0.06, 0.06, 0.006);
  Q.box("emitGreen", 0.2, 0.5, d / 2 + 0.016, 0.06, 0.06, 0.006);
  Q.cyl("metal", w / 2 - 0.25, h + 0.3, -d / 2 + 0.25, 0.08, 0.6, "y", { color: steel, segments: 12 });
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2 + 0.12], "vat");
}

// Extraction hood (world AABB) with filter grilles on the -Z face and two under-lights.
export function hood(kit, PALETTE, min, max) {
  kit.boxMM("paintedMetal", min, max, { color: C(PALETTE, "impMid"), texel: 1 });
  kit.boxMM("paintedMetal", [min[0] + 0.1, min[1] - 0.02, min[2] + 0.1], [max[0] - 0.1, min[1], max[2] - 0.1], { color: C(PALETTE, "impBlack") });
  kit.boxMM("paintedMetal", [min[0], min[1] - 0.05, min[2] - 0.05], [max[0], min[1] + 0.15, min[2]], { color: C(PALETTE, "impDark") });
  const h = max[1] - min[1];
  const cy = (min[1] + max[1]) / 2 + 0.05;
  for (let x = min[0] + 0.6; x < max[0] - 0.5; x += 1.0) kit.box("grate", x, cy, min[2] - 0.006, 0.7, h - 0.5, 0.012);
  for (const x of [min[0] + (max[0] - min[0]) * 0.3, min[0] + (max[0] - min[0]) * 0.7]) kit.box("emitWhite", x, min[1] - 0.03, (min[2] + max[2]) / 2, 1.4, 0.02, 0.15);
}

// Vertical square duct with flanges.
export function vertDuct(kit, PALETTE, x, z, y0, y1, w = 0.8) {
  kit.box("paintedMetal", x, (y0 + y1) / 2, z, w, y1 - y0, w, { color: C(PALETTE, "impMid"), texel: 1 });
  for (let y = y0 + 0.5; y < y1 - 0.2; y += 1.0) kit.box("paintedMetal", x, y, z, w + 0.08, 0.1, w + 0.08, { color: C(PALETTE, "impDark") });
}

// Steel prep island: four legs, undershelf with containers, pots and utensils on top.
export function prepIsland(kit, PALETTE, pos, yaw, { len = 2.4, w = 0.9, h = 0.9, seed = 2 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const steel = C(PALETTE, "steel");
  const dark = C(PALETTE, "impDark");
  const grey = C(PALETTE, "impGrey");
  Q.box("metal", 0, h - 0.03, 0, len, 0.06, w, { color: steel, texel: 1 });
  Q.box("paintedMetal", 0, h - 0.1, 0, len - 0.1, 0.08, w - 0.1, { color: dark });
  Q.box("metal", 0, 0.3, 0, len - 0.2, 0.04, w - 0.2, { color: steel, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Q.cyl("metal", sx * (len / 2 - 0.08), (h - 0.06) / 2, sz * (w / 2 - 0.08), 0.03, h - 0.06, "y", { color: steel, segments: 10 });
  for (let i = 0; i < 3; i++) Q.box("paintedMetal", -len / 2 + 0.45 + i * 0.6, 0.47, 0, 0.42, 0.3, 0.42, { color: rand() < 0.5 ? grey : dark, texel: 1 });
  Q.cyl("metal", -len / 2 + 0.4, h + 0.13, 0.1, 0.18, 0.26, "y", { color: steel, segments: 16 });
  Q.cyl("metal", -len / 2 + 0.4, h + 0.275, 0.1, 0.19, 0.03, "y", { color: dark, segments: 16 });
  Q.cyl("metal", -len / 2 + 0.85, h + 0.09, -0.15, 0.14, 0.18, "y", { color: steel, segments: 16 });
  Q.box("paintedMetal", 0.3, h + 0.02, 0, 0.5, 0.04, 0.35, { color: C(PALETTE, "impWhite") });
  for (let i = 0; i < 4; i++) Q.box("metal", 0.72 + i * 0.06, h + 0.015, -0.2, 0.02, 0.03, 0.3, { color: steel });
  Q.box("darkGloss", 0.95, h + 0.05, 0.2, 0.3, 0.1, 0.25);
  Q.collider([-len / 2, 0, -w / 2], [len / 2, h, w / 2], "prep");
}

// Open rack of stacked trays (front +Z).
export function trayRack(kit, PALETTE, pos, yaw, { w = 1.2, h = 1.8, d = 0.6, shelves = 4 } = {}) {
  const Q = placer(kit, pos, yaw);
  const dark = C(PALETTE, "impDark");
  const grey = C(PALETTE, "impGrey");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (w / 2 - 0.02), h / 2, 0, 0.04, h, d, { color: dark, texel: 1 });
  Q.box("paintedMetal", 0, h / 2, -d / 2 + 0.02, w - 0.08, h, 0.04, { color: dark, texel: 1 });
  Q.box("paintedMetal", 0, h - 0.02, 0, w - 0.08, 0.04, d, { color: dark });
  for (let s = 0; s < shelves; s++) {
    const y = 0.1 + s * 0.42;
    Q.box("metal", 0, y, 0, w - 0.08, 0.03, d - 0.04, { color: steel, texel: 1 });
    const stacks = s % 2 === 0 ? [-0.28, 0.28] : [-0.28];
    for (const sx of stacks) for (let i = 0; i < 7; i++) Q.box("paintedMetal", sx, y + 0.025 + i * 0.024, 0.02, 0.46, 0.018, 0.36, { color: i % 2 ? grey : mid });
    if (s % 2 === 1) Q.box("darkGloss", 0.28, y + 0.13, 0.02, 0.4, 0.22, 0.3);
  }
  Q.box("emitAmber", -w / 2 + 0.1, h - 0.12, d / 2 + 0.002, 0.05, 0.02, 0.006);
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "rack");
}

// Walk-in cooler door: proud black frame, recessed dark slab with grooves, heavy handle, blue strip.
export function coolerDoor(kit, PALETTE, pos, yaw, { w = 2.0, h = 2.6 } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, h + 0.1, 0.08, w + 0.5, 0.2, 0.16, { color: black, texel: 1 });
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (w / 2 + 0.15), h / 2, 0.08, 0.2, h, 0.16, { color: black, texel: 1 });
  Q.box("paintedMetal", 0, h / 2, 0.03, w, h, 0.06, { color: dark, texel: 1 });
  for (let i = 1; i < 5; i++) Q.box("paintedMetal", 0, (h * i) / 5, 0.065, w - 0.2, 0.03, 0.01, { color: black });
  Q.box("metal", w / 2 - 0.25, 1.05, 0.1, 0.08, 0.5, 0.08, { color: steel });
  Q.box("metal", w / 2 - 0.25, 1.05, 0.17, 0.05, 0.36, 0.06, { color: steel });
  Q.box("emitBlue", -w / 2 - 0.15, h / 2, 0.165, 0.04, h - 0.4, 0.01);
  Q.box("darkGloss", -w / 2 + 0.45, h - 0.35, 0.07, 0.5, 0.22, 0.02);
  Q.box("emitBlue", -w / 2 + 0.45, h - 0.35, 0.082, 0.3, 0.08, 0.006);
  Q.collider([-w / 2 - 0.25, 0, 0], [w / 2 + 0.25, h + 0.2, 0.2], "cooler");
}

// Steel sink line with basins, taps and a backsplash (back at local -Z, against a wall).
export function sinkLine(kit, PALETTE, pos, yaw, { len = 6, d = 0.7, h = 0.9, basins = 3 } = {}) {
  const Q = placer(kit, pos, yaw);
  const steel = C(PALETTE, "steel");
  const black = C(PALETTE, "impBlack");
  Q.box("metal", 0, h / 2, 0, len, h, d, { color: steel, texel: 1 });
  Q.box("paintedMetal", 0, 0.07, 0, len - 0.04, 0.14, d + 0.01, { color: black });
  Q.box("metal", 0, h + 0.2, -d / 2 + 0.02, len, 0.4, 0.04, { color: steel, texel: 1 });
  for (let i = 0; i < basins; i++) {
    const bx = -len / 2 + (i + 0.5) * (len / basins);
    Q.box("darkGloss", bx, h + 0.002, 0.05, len / basins - 0.4, 0.004, d - 0.3);
    Q.cyl("metal", bx, h + 0.2, -d / 2 + 0.12, 0.02, 0.4, "y", { color: steel, segments: 10 });
    Q.cyl("metal", bx, h + 0.4, -d / 2 + 0.25, 0.02, 0.3, "z", { color: steel, segments: 10 });
    Q.box("emitBlue", bx + 0.22, h + 0.3, -d / 2 + 0.045, 0.06, 0.02, 0.01);
  }
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h, d / 2], "sink");
}

// Sanitiser / dishwasher unit with a hatch window, indicator panel, amber strip and a steam vent.
export function dishwasher(kit, PALETTE, pos, yaw, { w = 2.2, h = 1.9, d = 1.0, seed = 8 } = {}) {
  const Q = placer(kit, pos, yaw);
  const grey = C(PALETTE, "impGrey");
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: grey, texel: 1 });
  Q.box("paintedMetal", 0, 0.08, 0, w - 0.06, 0.16, d + 0.02, { color: black });
  Q.box("darkGloss", -0.3, 1.05, d / 2 + 0.01, 1.2, 0.5, 0.02);
  Q.box("paintedMetal", -0.3, 0.55, d / 2 + 0.012, 1.2, 0.36, 0.024, { color: dark, texel: 1 });
  Q.box("metal", -0.3, 0.76, d / 2 + 0.05, 0.9, 0.04, 0.04, { color: steel });
  indicatorField(Q, 0.75, 1.3, d / 2 + 0.01, 0.4, 0.3, seed);
  Q.box("emitAmber", 0, h - 0.2, d / 2 + 0.012, w - 0.4, 0.03, 0.01);
  Q.cyl("metal", w / 2 - 0.3, h + 0.3, 0, 0.1, 0.6, "y", { color: steel, segments: 12 });
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "dishwasher");
}

// Hand-wash trough against a wall (back at local -Z): steel basin on a plinth, taps, mirror strip.
export function washTrough(kit, PALETTE, pos, yaw, { len = 5, d = 0.5, h = 0.85, taps = 5 } = {}) {
  const Q = placer(kit, pos, yaw);
  const steel = C(PALETTE, "steel");
  const black = C(PALETTE, "impBlack");
  const white = C(PALETTE, "impWhite");
  Q.box("paintedMetal", 0, 0.1, 0, len - 0.3, 0.2, d - 0.1, { color: black });
  Q.box("metal", 0, (h + 0.2) / 2, 0, len, h - 0.2, d, { color: steel, texel: 1 });
  Q.box("darkGloss", 0, h + 0.002, 0.03, len - 0.2, 0.004, d - 0.2);
  Q.box("metal", 0, h + 0.12, -d / 2 + 0.02, len, 0.24, 0.04, { color: steel, texel: 1 });
  for (let i = 0; i < taps; i++) {
    const tx = -len / 2 + (i + 0.5) * (len / taps);
    Q.cyl("metal", tx, h + 0.2, -d / 2 + 0.1, 0.018, 0.34, "y", { color: steel, segments: 10 });
    Q.cyl("metal", tx, h + 0.36, -d / 2 + 0.2, 0.018, 0.22, "z", { color: steel, segments: 10 });
    if (i < taps - 1) Q.box("paintedMetal", tx + len / taps / 2, 1.05, -d / 2 + 0.06, 0.1, 0.16, 0.1, { color: white });
  }
  Q.box("darkGloss", 0, 1.6, -d / 2 + 0.03, len - 0.2, 0.5, 0.02);
  Q.box("emitWhite", 0, 1.33, -d / 2 + 0.03, len - 0.6, 0.03, 0.015);
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h, d / 2], "trough");
}

// Tray-return station: counter with a dark belt, side rails, tray stacks and a proud wall hatch at +X.
export function trayReturn(kit, PALETTE, pos, yaw, { len = 5, d = 0.9, h = 0.9 } = {}) {
  const Q = placer(kit, pos, yaw);
  const mid = C(PALETTE, "impMid");
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  const grey = C(PALETTE, "impGrey");
  Q.box("paintedMetal", 0, h / 2, 0, len, h, d, { color: mid, texel: 1 });
  Q.box("paintedMetal", 0, 0.06, 0, len - 0.04, 0.12, d + 0.02, { color: black });
  Q.box("paintedMetal", 0, 0.5, d / 2 - 0.012, len - 0.3, 0.6, 0.024, { color: dark, texel: 1 });
  Q.box("darkGloss", 0, h + 0.015, 0, len - 0.2, 0.03, 0.6);
  for (const sz of [-1, 1]) Q.box("metal", 0, h + 0.05, sz * 0.34, len - 0.1, 0.06, 0.04, { color: steel });
  for (const sx of [-1.6, -0.6, 0.5]) for (let i = 0; i < 5; i++) Q.box("paintedMetal", sx, h + 0.04 + i * 0.024, 0, 0.46, 0.018, 0.36, { color: i % 2 ? grey : mid });
  Q.box("emitAmber", 0, h - 0.14, d / 2 + 0.002, len - 0.6, 0.02, 0.01);
  // wall hatch: proud black frame with a dark throat, steel lip
  const hx = len / 2 - 0.7;
  Q.box("paintedMetal", hx, 1.45, -d / 2 + 0.09, 1.4, 1.0, 0.18, { color: black, texel: 1 });
  Q.box("darkGloss", hx, 1.45, -d / 2 + 0.19, 1.1, 0.7, 0.01);
  Q.box("metal", hx, 1.08, -d / 2 + 0.2, 1.2, 0.04, 0.06, { color: steel });
  Q.box("emitAmber", hx, 2.0, -d / 2 + 0.19, 0.8, 0.03, 0.01);
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h, d / 2], "tray-return");
}

// Small wall-mounted control / intercom panel (front +Z).
export function wallPanel(kit, PALETTE, pos, yaw, seed = 5, { w = 0.5, h = 0.7 } = {}) {
  const Q = placer(kit, pos, yaw);
  Q.box("paintedMetal", 0, 0, 0.04, w, h, 0.08, { color: C(PALETTE, "impDark"), texel: 1 });
  indicatorField(Q, 0, h / 2 - 0.18, 0.08, w - 0.1, 0.2, seed);
  Q.box("darkGloss", 0, -0.1, 0.081, w - 0.12, 0.2, 0.01);
  Q.box("emitRedImp", -w / 2 + 0.1, -h / 2 + 0.1, 0.082, 0.06, 0.06, 0.006);
  Q.box("emitGreen", -w / 2 + 0.2, -h / 2 + 0.1, 0.082, 0.06, 0.06, 0.006);
}

// Left-behind tableware on a table top: tray, cup, bowl (deterministic per seed).
export function tableware(kit, PALETTE, pos, seed = 1) {
  const rand = rng(seed);
  const grey = C(PALETTE, "impGrey");
  const white = C(PALETTE, "impWhite");
  const steel = C(PALETTE, "steel");
  const [x, y, z] = pos;
  kit.box("paintedMetal", x, y + 0.01, z, 0.46, 0.02, 0.34, { color: grey, texel: 1 });
  kit.box("paintedMetal", x, y + 0.03, z, 0.42, 0.02, 0.3, { color: C(PALETTE, "impMid") });
  kit.cyl("metal", x - 0.14, y + 0.06, z + 0.05, 0.04, 0.08, "y", { color: white, segments: 10 });
  if (rand() < 0.7) kit.cyl("metal", x + 0.08, y + 0.045, z - 0.02, 0.09, 0.05, "y", { color: steel, segments: 12 });
  if (rand() < 0.5) kit.box("metal", x + 0.1, y + 0.03, z + 0.12, 0.16, 0.01, 0.03, { color: steel });
}

// Supply container (1.2 m module) without the rubber bumpers of the shared crate.
export function supplyBox(kit, PALETTE, pos, yaw, { w = 1.2, h = 1.2, d = 1.0, color } = {}) {
  const Q = placer(kit, pos, yaw);
  const dark = C(PALETTE, "impDark");
  Q.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: color || C(PALETTE, "impMid"), texel: 1 });
  Q.box("paintedMetal", 0, h / 2, d / 2 + 0.001, w - 0.3, h - 0.3, 0.03, { color: dark, texel: 1 });
  Q.box("paintedMetal", 0, h / 2, -d / 2 - 0.001, w - 0.3, h - 0.3, 0.03, { color: dark, texel: 1 });
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (w - 0.1) / 2, h / 2, 0, 0.1, h + 0.02, d + 0.02, { color: C(PALETTE, "impBlack") });
  Q.box("emitBlue", w / 2 - 0.3, h - 0.12, d / 2 + 0.02, 0.12, 0.03, 0.006);
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "supply");
}
