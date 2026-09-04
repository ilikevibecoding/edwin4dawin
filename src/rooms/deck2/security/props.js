// Security / detention props (local to d2-security): bar walls, cell fittings, gate pieces, equipment
// racks, holding bench, small weapon rack, interrogation table. Yaw convention as in _shared/props.js.
import * as THREE from "three";
import { placer, indicatorField } from "../_shared/props.js";
import { col } from "../_shared/palette.js";
import { rng } from "../../../kit.js";

const C = (PALETTE, k) => col(PALETTE, k);

// Vertical bars between two world points (yFrom..yTo) with top/bottom rails; ONE collider per run.
export function barWall(kit, PALETTE, a, b, yFrom, yTo, { r = 0.025, pitch = 0.14, rails = true, tag = "bars", collide = true, railColor } = {}) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const axis = Math.abs(dx) > Math.abs(dz) ? "x" : "z";
  const n = Math.max(1, Math.floor(len / pitch));
  const steel = C(PALETTE, "steel");
  const dark = railColor ?? C(PALETTE, "impDark");
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    kit.cyl("metal", a[0] + dx * t, (yFrom + yTo) / 2, a[2] + dz * t, r, yTo - yFrom, "y", { color: steel, segments: 6 });
  }
  if (rails) {
    const cx = (a[0] + b[0]) / 2;
    const cz = (a[2] + b[2]) / 2;
    const sx = axis === "x" ? len : 0.09;
    const sz = axis === "x" ? 0.09 : len;
    kit.box("paintedMetal", cx, yFrom + 0.04, cz, sx, 0.08, sz, { color: dark });
    kit.box("paintedMetal", cx, yTo - 0.04, cz, sx, 0.08, sz, { color: dark });
  }
  if (collide) kit.collider([Math.min(a[0], b[0]) - 0.05, yFrom, Math.min(a[2], b[2]) - 0.05], [Math.max(a[0], b[0]) + 0.05, yTo, Math.max(a[2], b[2]) + 0.05], tag);
}

// Cell fittings. Local frame: origin at the cell's back-wall/floor line centre, +Z = toward the corridor,
// X along the back wall (cell width w). Bunk at -X, sink at +X, red strip on the back wall.
export function cellFittings(kit, PALETTE, pos, yaw, { w = 3.3, seed = 1 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  // bunk slab along the back wall
  Q.box("paintedMetal", -w / 2 + 1.05, 0.22, 0.42, 2.0, 0.44, 0.8, { color: black, texel: 1 });
  Q.box("paintedMetal", -w / 2 + 1.05, 0.2, 0.83, 1.9, 0.3, 0.02, { color: dark });
  Q.box("fabric", -w / 2 + 1.05, 0.48, 0.42, 1.9, 0.08, 0.72, { color: C(PALETTE, "impGrey"), texel: 2 });
  if (rand() < 0.7) Q.box("fabric", -w / 2 + 1.55, 0.55, 0.42, 0.5, 0.06, 0.5, { color: mid, texel: 2 });
  Q.collider([-w / 2 + 0.05, 0, 0.02], [-w / 2 + 2.05, 0.52, 0.82], "bunk");
  // sink block with basin and tap
  Q.box("paintedMetal", w / 2 - 0.4, 0.45, 0.22, 0.5, 0.9, 0.42, { color: dark, texel: 1 });
  Q.box("darkGloss", w / 2 - 0.4, 0.902, 0.24, 0.36, 0.004, 0.3);
  Q.cyl("metal", w / 2 - 0.4, 1.05, 0.06, 0.015, 0.3, "y", { color: steel, segments: 8 });
  Q.cyl("metal", w / 2 - 0.4, 1.2, 0.14, 0.015, 0.18, "z", { color: steel, segments: 8 });
  Q.box("emitBlue", w / 2 - 0.25, 0.75, 0.435, 0.04, 0.02, 0.006);
  Q.collider([w / 2 - 0.65, 0, 0.01], [w / 2 - 0.15, 0.95, 0.43], "sink");
  // red strip + cell light on the back wall
  Q.box("paintedMetal", 0, 2.2, 0.03, w - 0.8, 0.1, 0.06, { color: black });
  Q.box("emitRedImp", 0, 2.2, 0.062, w - 1.0, 0.04, 0.006);
  Q.box("paintedMetal", 0, 2.75, 0.03, 0.9, 0.12, 0.06, { color: black });
  Q.box("emitWhite", 0, 2.75, 0.062, 0.8, 0.05, 0.006);
  // floor drain
  Q.box("darkGloss", 0.3, 0.004, 1.6, 0.3, 0.008, 0.3);
}

// Cell door frame around a gap in a bar wall: two posts, lintel, lock panel with a red LED (front +Z).
export function cellDoorFrame(kit, PALETTE, pos, yaw, { gap = 0.9, h = 3.0, locked = true } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (gap / 2 + 0.06), h / 2, 0, 0.12, h, 0.14, { color: black, texel: 1 });
  Q.box("paintedMetal", 0, h - 0.05, 0, gap + 0.24, 0.1, 0.14, { color: black });
  Q.box("darkGloss", gap / 2 + 0.06, 1.3, 0.075, 0.1, 0.3, 0.01);
  Q.box(locked ? "emitRedImp" : "emitGreen", gap / 2 + 0.06, 1.4, 0.082, 0.05, 0.05, 0.006);
  Q.box("emitRedImp", 0, h - 0.05, 0.075, gap - 0.2, 0.03, 0.006);
}

// Equipment / server rack against a wall (front +Z): dark cabinet with faceplates and LED rows.
export function equipmentRack(kit, PALETTE, pos, yaw, { w = 2.4, h = 0.9, d = 0.5, seed = 2, units = 4 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = C(PALETTE, "impBlack");
  Q.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: black, texel: 1 });
  Q.box("paintedMetal", 0, 0.04, 0, w - 0.04, 0.08, d + 0.02, { color: C(PALETTE, "impDark") });
  const uw = (w - 0.1) / units;
  for (let i = 0; i < units; i++) {
    const x = -w / 2 + 0.05 + (i + 0.5) * uw;
    Q.box("darkGloss", x, h / 2 + 0.03, d / 2 + 0.006, uw - 0.06, h - 0.2, 0.01);
    for (let j = 0; j < 3; j++) {
      const y = h - 0.28 - j * 0.16;
      for (let k = 0; k < 6; k++) {
        if (rand() < 0.3) continue;
        Q.box(rand() < 0.6 ? "emitBlue" : rand() < 0.6 ? "emitRedImp" : "emitAmber", x - uw / 2 + 0.08 + k * ((uw - 0.16) / 5), y, d / 2 + 0.014, 0.025, 0.012, 0.006);
      }
    }
    Q.box("metal", x, 0.22, d / 2 + 0.02, uw - 0.14, 0.03, 0.03, { color: C(PALETTE, "steel") });
  }
  Q.box("metal", 0, h + 0.015, 0, w, 0.03, d, { color: C(PALETTE, "steel"), texel: 1 });
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "rack");
}

// Holding bench against a wall (front +Z): slab bench, restraint rail at 1.02 m with cuff rings.
export function holdingBench(kit, PALETTE, pos, yaw, { len = 4.0 } = {}) {
  const Q = placer(kit, pos, yaw);
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, 0.45, 0.16, len, 0.08, 0.5, { color: C(PALETTE, "impMid"), texel: 1 });
  for (let i = 0; i <= Math.floor(len / 1.3); i++) Q.box("paintedMetal", -len / 2 + 0.2 + i * ((len - 0.4) / Math.max(1, Math.floor(len / 1.3))), 0.2, 0.16, 0.1, 0.4, 0.42, { color: dark });
  Q.cyl("metal", 0, 1.02, 0.06, 0.025, len, "x", { color: steel, segments: 10 });
  for (let i = 0; i <= Math.floor(len / 0.9); i++) {
    const x = -len / 2 + 0.15 + i * ((len - 0.3) / Math.max(1, Math.floor(len / 0.9)));
    Q.box("paintedMetal", x, 1.02, -0.02, 0.06, 0.06, 0.18, { color: dark });
  }
  for (let i = 0; i < Math.floor(len / 0.8); i++) Q.cyl("metal", -len / 2 + 0.4 + i * 0.8, 0.94, 0.06, 0.045, 0.02, "z", { color: steel, segments: 12 });
  // status strip on a back plate that reaches into the wall behind
  Q.box("paintedMetal", 0, 1.3, -0.04, len - 0.3, 0.12, 0.12, { color: dark });
  Q.box("emitRedImp", 0, 1.3, 0.025, len - 0.4, 0.03, 0.01);
  Q.collider([-len / 2, 0, -0.1], [len / 2, 0.5, 0.42], "bench");
}

// Two-piece wall weapon rack (front +Z): abstract long-arm silhouettes, locked with a red bar.
export function weaponRack2(kit, PALETTE, pos, yaw) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const w = 1.1;
  Q.box("paintedMetal", 0, 1.1, -0.03, w, 1.9, 0.06, { color: dark, texel: 1 });
  Q.box("paintedMetal", 0, 0.16, 0.13, w, 0.1, 0.36, { color: black, texel: 1 });
  Q.box("paintedMetal", 0, 2.02, 0.08, w, 0.08, 0.26, { color: black });
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, 0)));
  for (const lx of [-0.25, 0.25]) {
    const parts = [
      ["paintedMetal", 0.55, 0.045, 1.0, 0.05, black],
      ["paintedMetal", 0.2, 0.07, 0.34, 0.16, dark],
      ["paintedMetal", 0.42, 0.06, 0.18, 0.11, black],
      ["metal", 1.02, 0.05, 0.06, 0.06, C(PALETTE, "steel")],
    ];
    for (const [mat, h, sx, sy, sz, color] of parts) kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: Q.world(lx, 0.21 + h * 0.995, 0.15 - h * 0.0998), quat: q, color });
    Q.box("paintedMetal", lx, 1.5, 0.12, 0.3, 0.06, 0.2, { color: C(PALETTE, "impMid") });
  }
  Q.cyl("emitRedImp", 0, 1.12, 0.3, 0.018, w - 0.2, "x", { segments: 8 });
  Q.box("paintedMetal", w / 2 - 0.12, 1.12, 0.26, 0.12, 0.16, 0.14, { color: black });
  Q.box("emitRedImp", w / 2 - 0.12, 1.15, 0.335, 0.05, 0.03, 0.006);
  Q.collider([-w / 2, 0, -0.06], [w / 2, 2.1, 0.36], "weapon-rack");
}

// Interrogation table: heavy dark slab on a single pedestal with a restraint bar.
export function interrogationTable(kit, PALETTE, pos, yaw, { len = 2.0, w = 0.9, h = 0.78 } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  Q.box("paintedMetal", 0, h - 0.04, 0, len, 0.08, w, { color: C(PALETTE, "impDark"), texel: 1 });
  Q.box("paintedMetal", 0, (h - 0.08) / 2, 0, 0.5, h - 0.08, 0.4, { color: black, texel: 1 });
  Q.box("paintedMetal", 0, 0.04, 0, 1.0, 0.08, 0.7, { color: black });
  Q.cyl("metal", 0, h + 0.06, -0.25, 0.02, 0.6, "x", { color: C(PALETTE, "steel"), segments: 8 });
  for (const sx of [-0.3, 0.3]) Q.box("metal", sx, h + 0.03, -0.25, 0.04, 0.06, 0.04, { color: C(PALETTE, "steel") });
  Q.box("darkGloss", 0.55, h + 0.005, 0.2, 0.5, 0.01, 0.35);
  Q.box("emitRedImp", 0.55, h + 0.012, 0.2, 0.42, 0.004, 0.02);
  Q.collider([-len / 2, 0, -w / 2], [len / 2, h, w / 2], "table");
}

// Small wall control / intercom panel (front +Z).
export function wallPanel(kit, PALETTE, pos, yaw, seed = 5, { w = 0.5, h = 0.7 } = {}) {
  const Q = placer(kit, pos, yaw);
  Q.box("paintedMetal", 0, 0, 0.04, w, h, 0.08, { color: C(PALETTE, "impDark"), texel: 1 });
  indicatorField(Q, 0, h / 2 - 0.18, 0.08, w - 0.1, 0.2, seed, { weights: [0.6, 0.25, 0.1, 0.05] });
  Q.box("darkGloss", 0, -0.1, 0.081, w - 0.12, 0.2, 0.01);
  Q.box("emitRedImp", -w / 2 + 0.1, -h / 2 + 0.1, 0.082, 0.06, 0.06, 0.006);
  Q.box("emitGreen", -w / 2 + 0.2, -h / 2 + 0.1, 0.082, 0.06, 0.06, 0.006);
}

// Checkpoint scanner pylon (front +Z faces the lane): dark post on a base plate with a tall blue
// emitter slot, a sensor head and a status lamp on top.
export function scanPylon(kit, PALETTE, pos, yaw, { h = 2.3, clear = true } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  Q.box("paintedMetal", 0, 0.04, 0, 0.7, 0.08, 0.7, { color: dark, texel: 1 });
  Q.box("paintedMetal", 0, h / 2, 0, 0.44, h, 0.44, { color: black, texel: 1 });
  Q.box("darkGloss", 0, h / 2 + 0.1, 0.221, 0.3, h - 0.5, 0.01);
  Q.box("emitBlue", 0, h / 2 + 0.1, 0.228, 0.05, h - 0.8, 0.006);
  Q.box("paintedMetal", 0, h + 0.05, 0.02, 0.5, 0.1, 0.5, { color: dark });
  Q.box(clear ? "emitGreen" : "emitRedImp", 0, h + 0.13, 0.02, 0.22, 0.06, 0.22);
  for (const y of [0.45, 0.85]) Q.box("emitRedImp", -0.14, y, 0.226, 0.03, 0.03, 0.006);
  // side faces: sensor slot + strip so the pylon reads as equipment from the flanks
  for (const sx of [-1, 1]) {
    Q.box("darkGloss", sx * 0.221, h * 0.6, 0, 0.01, 1.2, 0.2);
    Q.box("emitRedImp", sx * 0.228, h * 0.6, 0, 0.006, 1.0, 0.03);
  }
  Q.collider([-0.35, 0, -0.35], [0.35, h + 0.16, 0.35], "pylon");
}

// Recessed ceiling light panel (dark frame penetrating the ceiling slab, emitter just below).
export function ceilingPanel(kit, PALETTE, x, ceilY, z, { w = 0.8, d = 0.8, mat = "emitWhite" } = {}) {
  kit.box("paintedMetal", x, ceilY - 0.04, z, w, 0.12, d, { color: C(PALETTE, "impBlack") });
  kit.box(mat, x, ceilY - 0.105, z, w - 0.18, 0.01, d - 0.18);
}
