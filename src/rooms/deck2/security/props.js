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
// X along the back wall (cell width w). Bunk at -X, sink at +X (or mirrored), red strip on the back
// wall, a small housed ceiling plate at `ceilH` so the interior reads. `variant`:
//  "standard" bedding + pillow · "occupied" bedding, folded blanket, tray + cup on the floor, jacket on
//  a hook, datapad · "bare" slab only, no bedding (cell out of use, plate red).
export function cellFittings(kit, PALETTE, pos, yaw, { w = 3.3, seed = 1, variant = "standard", mirror = false, ceilH = 3.4, plateMat = "emitWhite" } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const grey = C(PALETTE, "impGrey");
  const steel = C(PALETTE, "steel");
  const m = mirror ? -1 : 1;
  const bx = m * (-w / 2 + 1.05);
  const sx = m * (w / 2 - 0.4);
  // back wall of the cell: clean panel plates in two rows around the red strip (the block's outer wall
  // behind is bare black paint and swallowed the fittings), dark kick plate along the floor
  for (const [v0, v1] of [[0.3, 2.1], [2.32, ceilH - 0.25]]) {
    for (const [u0, u1] of [[-w / 2 + 0.12, -0.03], [0.03, w / 2 - 0.12]]) {
      Q.box("impPanel", (u0 + u1) / 2, (v0 + v1) / 2, 0.012, u1 - u0, v1 - v0, 0.024, { color: mid, uv: "keep" });
    }
  }
  Q.box("paintedMetal", 0, 0.14, 0.015, w - 0.2, 0.28, 0.03, { color: dark, texel: 2.5 });
  // bunk slab along the back wall (dark grey, so it reads against the plates)
  Q.box("paintedMetal", bx, 0.22, 0.45, 2.0, 0.44, 0.8, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", bx, 0.2, 0.86, 1.9, 0.3, 0.02, { color: black });
  if (variant !== "bare") {
    Q.box("paintedMetal", bx, 0.48, 0.45, 1.9, 0.08, 0.72, { color: grey, texel: 2.5 });
    Q.box("paintedMetal", bx + m * 0.6, 0.55, 0.45, 0.5, 0.06, 0.5, { color: C(PALETTE, "impWhite"), texel: 2.5 }); // pillow
  } else {
    Q.box("paintedMetal", bx, 0.45, 0.45, 1.9, 0.02, 0.72, { color: black, texel: 2.5 });
  }
  if (variant === "occupied") {
    Q.box("paintedMetal", bx - m * 0.5, 0.58, 0.53, 0.7, 0.12, 0.5, { color: dark, texel: 2.5 }); // folded blanket
    Q.box("paintedMetal", bx - m * 0.5, 0.65, 0.53, 0.6, 0.03, 0.4, { color: mid });
    Q.box("paintedMetal", bx + m * 0.9, 0.53, 0.33, 0.2, 0.02, 0.14, { color: black }); // datapad
    Q.box("emitBlue", bx + m * 0.9, 0.542, 0.33, 0.14, 0.002, 0.09);
    Q.box("paintedMetal", bx, 0.01, 1.1, 0.46, 0.02, 0.34, { color: grey }); // tray on the floor
    Q.cyl("metal", bx + m * 0.1, 0.06, 1.12, 0.04, 0.08, "y", { color: C(PALETTE, "impWhite"), segments: 10 });
    Q.box("metal", bx - m * 0.9, 1.6, 0.03, 0.03, 0.03, 0.06, { color: steel }); // hook + hanging jacket
    Q.box("paintedMetal", bx - m * 0.9, 1.2, 0.12, 0.42, 0.8, 0.16, { color: dark, texel: 2.5 });
    Q.box("paintedMetal", bx - m * 0.9, 1.57, 0.12, 0.14, 0.08, 0.16, { color: black });
  }
  Q.collider([Math.min(bx - 1.0, bx + 1.0), 0, 0.05], [Math.max(bx - 1.0, bx + 1.0), 0.52, 0.85], "bunk");
  // sink block with basin and tap
  Q.box("paintedMetal", sx, 0.45, 0.24, 0.5, 0.9, 0.42, { color: dark, texel: 2.5 });
  Q.box("metal", sx, 0.91, 0.24, 0.52, 0.02, 0.44, { color: steel, texel: 1 });
  Q.box("darkGloss", sx, 0.922, 0.26, 0.36, 0.004, 0.3);
  Q.cyl("metal", sx, 1.05, 0.08, 0.015, 0.3, "y", { color: steel, segments: 8 });
  Q.cyl("metal", sx, 1.2, 0.16, 0.015, 0.18, "z", { color: steel, segments: 8 });
  Q.box("emitBlue", sx + m * 0.15, 0.75, 0.455, 0.04, 0.02, 0.006);
  Q.collider([sx - 0.25, 0, 0.03], [sx + 0.25, 0.95, 0.45], "sink");
  // red strip + reading light on the back wall
  Q.box("paintedMetal", 0, 2.2, 0.03, w - 0.8, 0.1, 0.06, { color: black });
  Q.box("emitRedImp", 0, 2.2, 0.062, w - 1.0, 0.04, 0.006);
  Q.box("paintedMetal", 0, 2.75, 0.03, 0.9, 0.12, 0.06, { color: black });
  Q.box(plateMat, 0, 2.75, 0.062, 0.8, 0.05, 0.006);
  // housed ceiling plate at the cell centre: hollow black housing, steel-grey lip, emitter set up inside
  {
    const cx = 0;
    const cz = 1.8;
    const yb = ceilH - 0.12;
    Q.box("paintedMetal", cx, ceilH - 0.02, cz, 0.6, 0.02, 0.6, { color: black });
    for (const s of [-1, 1]) {
      Q.box("paintedMetal", cx, yb + 0.06, cz + s * 0.285, 0.6, 0.12, 0.03, { color: black });
      Q.box("paintedMetal", cx + s * 0.285, yb + 0.06, cz, 0.03, 0.12, 0.54, { color: black });
      Q.box("paintedMetal", cx, yb - 0.01, cz + s * 0.31, 0.7, 0.02, 0.08, { color: mid });
      Q.box("paintedMetal", cx + s * 0.31, yb - 0.01, cz, 0.08, 0.02, 0.54, { color: mid });
    }
    Q.box(plateMat, cx, yb + 0.06, cz, 0.34, 0.01, 0.34);
  }
  // floor drain
  Q.box("darkGloss", m * 0.3, 0.004, 1.6, 0.3, 0.008, 0.3);
  void rand;
}

// Cell door frame around a gap in a bar wall: two posts, lintel, lock panel with a red/blue LED
// (front +Z). `open` adds the barred door leaf slid aside along the bars on the cell side, toward
// local X * `openSide` (pass the direction that points along the bars into the cell, not the wall).
export function cellDoorFrame(kit, PALETTE, pos, yaw, { gap = 0.9, h = 3.0, locked = true, open = false, openSide = -1 } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const steel = C(PALETTE, "steel");
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (gap / 2 + 0.06), h / 2, 0, 0.12, h, 0.14, { color: black, texel: 2.5 });
  Q.box("paintedMetal", 0, h - 0.05, 0, gap + 0.24, 0.1, 0.14, { color: black });
  Q.box("darkGloss", gap / 2 + 0.06, 1.3, 0.075, 0.1, 0.3, 0.01);
  Q.box(locked ? "emitRedImp" : "emitGreen", gap / 2 + 0.06, 1.4, 0.082, 0.05, 0.05, 0.006);
  Q.box(locked ? "emitRedImp" : "emitGreen", 0, h - 0.05, 0.075, gap - 0.2, 0.03, 0.006);
  if (open) {
    // slid-open leaf: frame + bars, hanging from a top runner, offset 12 cm behind the bar plane
    const lx = openSide * (gap + 0.16);
    const lz = -0.12;
    const lh = h - 0.3;
    Q.box("paintedMetal", lx, lh / 2, lz, gap, 0.06, 0.05, { color: black });
    Q.box("paintedMetal", lx, 0.05, lz, gap, 0.1, 0.05, { color: black });
    Q.box("paintedMetal", lx, lh - 0.05, lz, gap, 0.1, 0.05, { color: black });
    for (const sx of [-1, 1]) Q.box("paintedMetal", lx + sx * (gap / 2 - 0.03), lh / 2, lz, 0.06, lh, 0.06, { color: black });
    const n = Math.floor((gap - 0.12) / 0.12);
    for (let i = 0; i <= n; i++) Q.cyl("metal", lx - gap / 2 + 0.06 + ((gap - 0.12) * i) / n, lh / 2, lz, 0.018, lh - 0.1, "y", { color: steel, segments: 6 });
    Q.box("paintedMetal", lx - openSide * gap / 2, 1.1, lz, 0.12, 0.3, 0.1, { color: black }); // lock plate (leading edge)
    Q.box("emitGreen", lx - openSide * gap / 2, 1.18, lz + 0.052, 0.05, 0.03, 0.006);
    Q.box("paintedMetal", lx - openSide * gap / 4, lh + 0.06, lz, gap * 1.5, 0.06, 0.08, { color: black }); // runner
    Q.collider([lx - gap / 2 - 0.03, 0, lz - 0.06], [lx + gap / 2 + 0.03, lh, lz + 0.06], "cell-door-leaf");
  }
}

// Desk monitor on a stem with a keyboard slab in front (front +Z = toward the operator). The head is
// tilted back so the screen looks up at a seated operator; place it with a yaw that turns it toward
// the seat. Fits on a shared console's flat work surface (base plate covers the field beneath).
export function deskMonitor(kit, PALETTE, pos, yaw, { w = 0.56, h = 0.34, mat = "screenImp0", keyboard = true } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const grey = C(PALETTE, "impGrey");
  const mid = C(PALETTE, "impMid");
  Q.box("paintedMetal", 0, 0.025, 0.02, 0.36, 0.05, 0.26, { color: black, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.2, -0.04, 0.05, 0.3, 0.04, { color: mid });
  Q.box("paintedMetal", 0, 0.33, -0.04, 0.12, 0.05, 0.05, { color: mid });
  const tilt = -0.2;
  const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  const ny = -Math.sin(tilt);
  const nz = Math.cos(tilt);
  const cy = 0.33 + h / 2;
  const cz = -0.02;
  // head-plane coordinates (u across, v up the tilted face, d along its normal) -> world
  const hp = (u, v, d) => Q.world(u, cy + v * nz + d * ny, cz - v * ny + d * nz);
  const at = (d) => hp(0, 0, d);
  // head: mid-grey shell with a light panel plate and a status LED on the BACK (the monitors are seen
  // from behind from the door, where a black back vanished against the gate wall), black bezel + screen
  // on the operator's side
  kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.03), { pos: at(0), quat: tq, color: mid, texel: 2.5 });
  kit.add("impPanel", new THREE.BoxGeometry(w - 0.04, h - 0.04, 0.01), { pos: at(-0.018), quat: tq, color: grey, uv: "keep" });
  kit.add("emitBlue", new THREE.BoxGeometry(0.05, 0.012, 0.006), { pos: hp(-w / 2 + 0.1, -h / 2 + 0.03, -0.026), quat: tq });
  kit.add("darkGloss", new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.01), { pos: at(0.018), quat: tq });
  kit.add(mat, new THREE.BoxGeometry(w, h, 0.01), { pos: at(0.026), quat: tq, uv: "keep" });
  kit.add("emitBlue", new THREE.BoxGeometry(0.03, 0.012, 0.01), { pos: hp(w / 2 - 0.04, -h / 2 - 0.012, 0.026), quat: tq });
  if (keyboard) {
    Q.box("darkGloss", 0, 0.012, 0.24, 0.44, 0.024, 0.16);
    for (let r = 0; r < 3; r++) Q.box("paintedMetal", 0, 0.026, 0.195 + r * 0.04, 0.38 - r * 0.02, 0.006, 0.028, { color: grey });
    Q.box("emitBlue", 0.19, 0.026, 0.175, 0.03, 0.006, 0.012);
  }
}

// Interrogation chairs (front +Z). `restraints` adds armrests with cuff rings and a floor anchor plate
// (the detainee's side); otherwise a plain steel-framed operator chair with a reclined backrest.
export function detaineeChair(kit, PALETTE, pos, yaw, { restraints = false } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, 0.02, 0, 0.56, 0.04, 0.56, { color: black, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.24, -0.02, 0.14, 0.4, 0.14, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.47, 0, 0.5, 0.06, 0.5, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.505, 0.02, 0.44, 0.02, 0.42, { color: C(PALETTE, "impMid") });
  // backrest on two struts, reclined 8 degrees
  const rq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.14, 0, 0)));
  kit.add("paintedMetal", new THREE.BoxGeometry(0.46, 0.5, 0.05), { pos: Q.world(0, 0.8, -0.26), quat: rq, color: dark, texel: 2.5 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.4, 0.42, 0.02), { pos: Q.world(0, 0.8, -0.22), quat: rq, color: C(PALETTE, "impMid") });
  for (const sx of [-1, 1]) Q.box("metal", sx * 0.2, 0.62, -0.24, 0.03, 0.3, 0.03, { color: steel });
  if (restraints) {
    for (const sx of [-1, 1]) {
      Q.box("paintedMetal", sx * 0.29, 0.7, -0.02, 0.06, 0.04, 0.4, { color: black });
      Q.box("metal", sx * 0.29, 0.6, -0.16, 0.03, 0.18, 0.03, { color: steel });
      Q.cyl("metal", sx * 0.29, 0.74, 0.1, 0.04, 0.02, "y", { color: steel, segments: 12, open: true });
    }
    Q.box("emitRedImp", 0.07, 0.042, 0.24, 0.05, 0.004, 0.02);
  }
  Q.collider([-0.3, 0, -0.3], [0.3, 1.05, 0.3], "chair");
}

// Checkpoint scanner gate across a passage: two scan pylons, an overhead scanner header with a blue
// sensor slot and side rails with hazard panels closing the rest of the passage. Local frame: origin
// on the floor at the lane centre, lane runs along local Z, pylons at x = +-laneW/2, rails from the
// pylons out to +-halfSpan.
export function scanGate(kit, PALETTE, pos, yaw, { laneW = 2.4, halfSpan = [1.9, 1.9], headerY = 2.4 } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  const px = laneW / 2 + 0.22;
  const ph = headerY - 0.2;
  // pylons face each other across the lane (front = local +Z of each pylon); corner posts carry the header
  scanPylon(kit, PALETTE, Q.world(-px, 0, 0), yaw + Math.PI / 2, { h: ph });
  scanPylon(kit, PALETTE, Q.world(px, 0, 0), yaw - Math.PI / 2, { h: ph, clear: false });
  for (const s of [-1, 1]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) Q.box("paintedMetal", s * px + sx * 0.2, ph + 0.1 + 0.055, sz * 0.2, 0.06, 0.11, 0.06, { color: dark });
  // header: black beam on the pylons, steel-grey soffit plate, blue sensor slot facing down, red lamps
  Q.box("paintedMetal", 0, headerY + 0.15, 0, laneW + 0.88, 0.3, 0.44, { color: black, texel: 2.5 });
  Q.box("paintedMetal", 0, headerY - 0.01, 0, laneW + 0.6, 0.02, 0.36, { color: mid });
  Q.box("darkGloss", 0, headerY - 0.025, 0, laneW - 0.2, 0.01, 0.16);
  Q.box("emitBlue", 0, headerY - 0.032, 0, laneW - 0.4, 0.006, 0.04);
  for (const sz of [-1, 1]) {
    Q.box("darkGloss", 0, headerY + 0.15, sz * 0.225, laneW - 0.3, 0.12, 0.01);
    for (let i = 0; i < 5; i++) Q.box(i === 2 ? "emitRedImp" : "emitBlue", -0.5 + i * 0.25, headerY + 0.15, sz * 0.232, 0.05, 0.03, 0.006);
  }
  // side rails: two steel bars between posts, hazard-band panel below the top bar
  for (const s of [-1, 1]) {
    const span = halfSpan[s < 0 ? 0 : 1];
    const a = s * (px + 0.22);
    const b = s * span;
    if (Math.abs(b) - Math.abs(a) < 0.3) continue;
    const cx = (a + b) / 2;
    const len = Math.abs(b - a);
    for (const y of [0.55, 1.0]) Q.cyl("metal", cx, y, 0, 0.025, len, "x", { color: steel, segments: 10 });
    Q.box("paintedMetal", b - s * 0.04, 0.5, 0, 0.08, 1.0, 0.08, { color: dark, texel: 2.5 });
    // hazard panel: alternating amber/black plates under the top bar (no extra material key)
    const segs = Math.max(2, Math.round((len - 0.1) / 0.2));
    for (let k = 0; k < segs; k++) Q.box("paintedMetal", Math.min(a, b) + 0.05 + ((k + 0.5) * (len - 0.1)) / segs, 0.78, 0, (len - 0.1) / segs, 0.16, 0.02, { color: k % 2 ? black : C(PALETTE, "impAmber") });
    Q.collider([Math.min(a, b), 0, -0.1], [Math.max(a, b), 1.05, 0.1], "gate-rail");
  }
  // lane markings: white edge lines and a red stop line on the approach side
  for (const sx of [-1, 1]) Q.box("emitWhite", sx * (laneW / 2 - 0.1), 0.003, 0, 0.05, 0.006, 3.0);
  Q.box("emitRedImp", 0, 0.003, 1.3, laneW - 0.4, 0.006, 0.08);
}

// Equipment / server rack against a wall (front +Z): dark cabinet with faceplates and LED rows.
export function equipmentRack(kit, PALETTE, pos, yaw, { w = 2.4, h = 0.9, d = 0.5, seed = 2, units = 4 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = C(PALETTE, "impBlack");
  Q.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: black, texel: 2.5 });
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
  Q.box("metal", 0, h + 0.015, 0, w, 0.03, d, { color: C(PALETTE, "steel"), texel: 2.5 });
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "rack");
}

// Holding bench against a wall (front +Z): slab bench, restraint rail at 1.02 m with cuff rings.
export function holdingBench(kit, PALETTE, pos, yaw, { len = 4.0 } = {}) {
  const Q = placer(kit, pos, yaw);
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, 0.45, 0.16, len, 0.08, 0.5, { color: C(PALETTE, "impMid"), texel: 2.5 });
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
  Q.box("paintedMetal", 0, 1.1, -0.03, w, 1.9, 0.06, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.16, 0.13, w, 0.1, 0.36, { color: black, texel: 2.5 });
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
  Q.box("paintedMetal", 0, h - 0.04, 0, len, 0.08, w, { color: C(PALETTE, "impDark"), texel: 2.5 });
  Q.box("paintedMetal", 0, (h - 0.08) / 2, 0, 0.5, h - 0.08, 0.4, { color: black, texel: 2.5 });
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
  Q.box("paintedMetal", 0, 0, 0.04, w, h, 0.08, { color: C(PALETTE, "impDark"), texel: 2.5 });
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
  Q.box("paintedMetal", 0, 0.04, 0, 0.7, 0.08, 0.7, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", 0, h / 2, 0, 0.44, h, 0.44, { color: black, texel: 2.5 });
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

// Housed ceiling fixture: black trough hanging 16 cm under the ceiling with steel-grey lips, emitter
// plate set 8 cm up inside so it never reads as a bare quad on the slab.
export function ceilingPanel(kit, PALETTE, x, ceilY, z, { w = 0.9, d = 0.9, mat = "emitWhite" } = {}) {
  const black = C(PALETTE, "impBlack");
  const mid = C(PALETTE, "impMid");
  const depth = 0.16;
  const yb = ceilY - depth;
  kit.box("paintedMetal", x, ceilY - 0.03, z, w, 0.02, d, { color: black });
  for (const sz of [-1, 1]) kit.box("paintedMetal", x, yb + depth / 2, z + sz * (d / 2 - 0.025), w, depth, 0.05, { color: black, texel: 2.5 });
  for (const sx of [-1, 1]) kit.box("paintedMetal", x + sx * (w / 2 - 0.025), yb + depth / 2, z, 0.05, depth, d - 0.1, { color: black, texel: 2.5 });
  for (const sz of [-1, 1]) kit.box("paintedMetal", x, yb - 0.01, z + sz * (d / 2), w + 0.12, 0.02, 0.12, { color: mid });
  for (const sx of [-1, 1]) kit.box("paintedMetal", x + sx * (w / 2), yb - 0.01, z, 0.12, 0.02, d - 0.12, { color: mid });
  kit.box(mat, x, yb + 0.08, z, w - 0.3, 0.01, d - 0.3);
}

// Housed light channel under the ceiling along world X or Z (`axis`), from `a` to `b` along that axis at
// the cross position `c`: black trough with steel-grey lips, emitter segments set 6 cm up inside.
export function channelFixture(kit, PALETTE, axis, a, b, c, ceilY, { w = 0.45, mat = "emitWhite", segment = 2.0 } = {}) {
  const black = C(PALETTE, "impBlack");
  const mid = C(PALETTE, "impMid");
  const len = b - a;
  const m = (a + b) / 2;
  const drop = 0.16;
  const X = axis === "x";
  const box = (matKey, u, y, v, su, sy, sv, opts) => (X ? kit.box(matKey, u, y, v, su, sy, sv, opts) : kit.box(matKey, v, y, u, sv, sy, su, opts));
  box("paintedMetal", m, ceilY - 0.03, c, len, 0.02, w, { color: black });
  for (const s of [-1, 1]) box("paintedMetal", m, ceilY - drop / 2, c + s * (w / 2 - 0.025), len, drop, 0.05, { color: black, texel: 2.5 });
  for (const s of [-1, 1]) box("paintedMetal", m + s * (len / 2 - 0.025), ceilY - drop / 2, c, 0.05, drop, w - 0.1, { color: black, texel: 2.5 });
  for (const s of [-1, 1]) box("paintedMetal", m, ceilY - drop - 0.01, c + s * (w / 2), len + 0.1, 0.02, 0.1, { color: mid });
  const nSeg = Math.max(1, Math.round(len / segment));
  for (let i = 0; i < nSeg; i++) {
    const s0 = a + (len * i) / nSeg + 0.12;
    const s1 = a + (len * (i + 1)) / nSeg - 0.12;
    box(mat, (s0 + s1) / 2, ceilY - drop + 0.065, c, s1 - s0, 0.01, 0.14, {});
  }
}

// Alternating amber/black floor band (hazard marking without the `hazard` material key).
export function hazardBand(kit, PALETTE, min, max, y) {
  const alongX = max[0] - min[0] >= max[1] - min[1];
  const len = alongX ? max[0] - min[0] : max[1] - min[1];
  const segs = Math.max(2, Math.round(len / 0.3));
  for (let k = 0; k < segs; k++) {
    const c = k % 2 ? C(PALETTE, "impBlack") : C(PALETTE, "impAmber");
    const u0 = (alongX ? min[0] : min[1]) + (k * len) / segs;
    const u1 = u0 + len / segs;
    if (alongX) kit.boxMM("paintedMetal", [u0, y, min[1]], [u1, y + 0.005, max[1]], { color: c });
    else kit.boxMM("paintedMetal", [min[0], y, u0], [max[0], y + 0.005, u1], { color: c });
  }
}
