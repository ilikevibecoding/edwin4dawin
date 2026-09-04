// Deck 2 escape-pod bay — Phase 2 detail. Ten pod stations (five per long wall): a bolted circular
// hatch in a thick collar, a muster step with rails, a status pillar and a launch-tube housing above.
// The centre is a muster line on a dark runway strip; emergency lockers, an O2 rack and the control
// console sit at the door end, the pod status board on the forward wall. Amber accents throughout.
import * as THREE from "three";
import { col } from "../_shared/palette.js";
import { rail, WALL_T } from "../_shared/shell.js";
import { placer, indicatorField, console as consoleProp, wallScreen, lockerBank, cabinet, floorLine, pipe } from "../_shared/props.js";

const X0 = -20;
const X1 = 20;
const Z0 = 305;
const Z1 = 330;
const IX0 = X0 + WALL_T; // -19.7
const IX1 = X1 - WALL_T; // 19.7
const IZ0 = Z0 + WALL_T; // 305.3
const IZ1 = Z1 - WALL_T; // 329.7

export const STATION_Z = [308.6, 313.0, 317.4, 321.8, 326.2];
// pod status per station, west row then east row: g = ready, a = standby, r = tube empty
const STATUS_W = ["g", "g", "a", "g", "g"];
const STATUS_E = ["g", "a", "g", "r", "g"];
const EMIT = { g: "emitGreen", a: "emitAmber", r: "emitRedImp" };
const RED = new THREE.Color("#7a2a24");

export function detail(ctx, shell, room) {
  const { kit, PALETTE } = ctx;
  const Y = room.floorY;
  const CY = room.ceilY;
  const P = (k) => col(PALETTE, k);
  const white = P("impWhite");
  const grey = P("impGrey");
  const mid = P("impMid");
  const dark = P("impDark");
  const black = P("impBlack");
  const steel = P("steel");

  // ---- local helpers ------------------------------------------------------------------------------
  const junction = (x, y, z, yaw, { w = 0.4, h = 0.5, conduitTo = null, emit = "emitAmber", seed = 1 } = {}) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, 0, 0.08, w, h, 0.16, { color: dark, texel: 1 });
    Q.box("paintedMetal", 0, 0, 0.165, w - 0.08, h - 0.08, 0.01, { color: black });
    Q.box(emit, -w / 2 + 0.08, h / 2 - 0.08, 0.172, 0.06, 0.02, 0.006);
    indicatorField(Q, 0.04, -h / 2 + 0.12, 0.17, w - 0.16, 0.1, seed, { density: 0.8 });
    if (conduitTo != null) {
      const len = conduitTo - (y + h / 2);
      Q.cyl("metal", -w / 4, h / 2 + len / 2, 0.08, 0.03, len, "y", { color: steel, segments: 8 });
      Q.cyl("metal", w / 4, h / 2 + len / 2, 0.08, 0.022, len, "y", { color: dark, segments: 8 });
    }
  };
  const grille = (x, y, z, yaw, w = 1.2, h = 0.6) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, 0, 0.04, w, h, 0.08, { color: dark, texel: 1 });
    Q.box("paintedMetal", 0, 0, 0.085, w - 0.12, h - 0.12, 0.01, { color: black });
    const n = Math.floor((h - 0.2) / 0.1);
    for (let i = 0; i < n; i++) Q.box("paintedMetal", 0, -h / 2 + 0.14 + i * 0.1, 0.1, w - 0.2, 0.03, 0.02, { color: grey });
  };
  const tray = (a, b, w = 0.35) => {
    const min = [Math.min(a[0], b[0]), a[1], Math.min(a[2], b[2])];
    const max = [Math.max(a[0], b[0]), a[1], Math.max(a[2], b[2])];
    if (max[0] - min[0] > max[2] - min[2]) {
      kit.boxMM("paintedMetal", [min[0], a[1], a[2] - w / 2], [max[0], a[1] + 0.04, a[2] + w / 2], { color: dark, texel: 1 });
      kit.boxMM("paintedMetal", [min[0], a[1], a[2] - w / 2], [max[0], a[1] + 0.12, a[2] - w / 2 + 0.02], { color: dark });
      kit.boxMM("paintedMetal", [min[0], a[1], a[2] + w / 2 - 0.02], [max[0], a[1] + 0.12, a[2] + w / 2], { color: dark });
      for (let x = min[0] + 1.0; x < max[0]; x += 2.0) kit.boxMM("metal", [x, a[1] + 0.03, a[2] - w / 2], [x + 0.06, a[1] + 0.05, a[2] + w / 2], { color: steel });
    } else {
      kit.boxMM("paintedMetal", [a[0] - w / 2, a[1], min[2]], [a[0] + w / 2, a[1] + 0.04, max[2]], { color: dark, texel: 1 });
      kit.boxMM("paintedMetal", [a[0] - w / 2, a[1], min[2]], [a[0] - w / 2 + 0.02, a[1] + 0.12, max[2]], { color: dark });
      kit.boxMM("paintedMetal", [a[0] + w / 2 - 0.02, a[1], min[2]], [a[0] + w / 2, a[1] + 0.12, max[2]], { color: dark });
      for (let z = min[2] + 1.0; z < max[2]; z += 2.0) kit.boxMM("metal", [a[0] - w / 2, a[1] + 0.03, z], [a[0] + w / 2, a[1] + 0.05, z + 0.06], { color: steel });
    }
  };
  // Imperial cargo module without rubber bumpers (keeps the material count down)
  const crate = (x, z, yaw, { s = 1.2, color = mid, y = Y, emit = "emitAmber" } = {}) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, s / 2, 0, s, s, s, { color, texel: 1 });
    for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (sz) Q.box("paintedMetal", 0, s / 2, (sz * s) / 2 + sz * 0.001, s - 0.3, s - 0.3, 0.03, { color: dark, texel: 1 });
      else Q.box("paintedMetal", (sx * s) / 2 + sx * 0.001, s / 2, 0, 0.03, s - 0.3, s - 0.3, { color: dark, texel: 1 });
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) Q.box("paintedMetal", (sx * (s - 0.1)) / 2, s / 2, (sz * (s - 0.1)) / 2, 0.1, s + 0.02, 0.1, { color: black });
    Q.box("metal", 0, s - 0.15, s / 2 + 0.03, 0.4, 0.05, 0.05, { color: steel });
    Q.box(emit, s / 2 - 0.2, s - 0.12, s / 2 + 0.017, 0.12, 0.03, 0.006);
    Q.collider([-s / 2, 0, -s / 2], [s / 2, s, s / 2], "crate");
  };
  const bench = (x, z, yaw, len = 3.0) => {
    const Q = placer(kit, [x, Y, z], yaw);
    Q.box("paintedMetal", 0, 0.42, 0, len, 0.06, 0.42, { color: mid, texel: 1 });
    for (const lx of [-len / 2 + 0.3, len / 2 - 0.3]) Q.box("paintedMetal", lx, 0.2, 0, 0.1, 0.4, 0.36, { color: dark });
    Q.box("emitAmber", 0, 0.4, 0.215, len - 0.4, 0.012, 0.01);
    Q.collider([-len / 2, 0, -0.21], [len / 2, 0.45, 0.21], "bench");
  };

  // =============================================================================================
  // POD STATIONS — local frame: wall at z 0, room toward +Z, x along the wall
  // =============================================================================================
  const tubeH = CY - 0.1 - (Y + 3.35);
  const station = (pos, yaw, status, seed) => {
    const Q = placer(kit, pos, yaw);
    const cap = EMIT[status];
    // plinth + thick collar with a lighter face plate
    Q.box("paintedMetal", 0, 0.25, 0.25, 2.8, 0.5, 0.5, { color: black, texel: 1 });
    Q.box("paintedMetal", 0, 1.9, 0.25, 2.8, 2.8, 0.5, { color: dark, texel: 1 });
    Q.box("impPanel", 0, 1.9, 0.515, 2.5, 2.66, 0.03, { color: grey, uv: "keep" });
    // hatch: dark disc, steel torus rim, 8 bolt heads, lit inner ring, hub + handle bar
    Q.cyl("paintedMetal", 0, 1.9, 0.57, 1.1, 0.08, "z", { color: black, segments: 40 });
    Q.add("metal", new THREE.TorusGeometry(1.1, 0.08, 10, 48), 0, 1.9, 0.585, { color: steel });
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * Math.PI * 2;
      Q.cyl("metal", 1.3 * Math.cos(a), 1.9 + 1.3 * Math.sin(a), 0.56, 0.06, 0.06, "z", { color: steel, segments: 8 });
    }
    Q.add(status === "r" ? "emitRedImp" : "emitAmber", new THREE.TorusGeometry(0.74, 0.025, 8, 40), 0, 1.9, 0.62);
    Q.cyl("metal", 0, 1.9, 0.635, 0.2, 0.05, "z", { color: steel, segments: 16 });
    Q.box("metal", 0, 1.9, 0.675, 0.9, 0.06, 0.05, { color: steel });
    for (const lx of [-0.45, 0.45]) Q.box("paintedMetal", lx, 1.9, 0.675, 0.12, 0.1, 0.06, { color: black });
    Q.box("darkGloss", 0, 1.35, 0.62, 0.5, 0.16, 0.02);
    indicatorField(Q, 0, 1.35, 0.625, 0.44, 0.1, seed, { density: 0.9 });
    // label plate + status readout above the hatch
    Q.box("impPanel", 0, 3.13, 0.54, 0.6, 0.16, 0.02, { color: white, uv: "keep" });
    indicatorField(Q, -1.0, 3.13, 0.535, 0.5, 0.14, seed + 1);
    Q.box(cap, 1.0, 3.13, 0.54, 0.4, 0.06, 0.01);
    // muster step: 0.6 m block with a deck tread, lit nose, kick base; hazard on the floor in front
    Q.box("paintedMetal", 0, 0.05, 1.0, 2.5, 0.1, 1.1, { color: black });
    Q.box("paintedMetal", 0, 0.35, 1.0, 2.4, 0.5, 1.0, { color: mid, texel: 1 });
    Q.box("impFloor", 0, 0.61, 1.0, 2.42, 0.02, 1.02, { color: dark, texel: 0.5 });
    Q.box("emitAmber", 0, 0.58, 1.505, 2.2, 0.03, 0.01);
    Q.box("hazard", 0, 0.003, 1.85, 2.8, 0.006, 0.7, { texel: 2 });
    rail(kit, PALETTE, Q.world(-1.2, 0, 0.55), Q.world(-1.2, 0, 1.45), pos[1] + 0.6, { h: 1.02, post: 1.0 });
    rail(kit, PALETTE, Q.world(1.2, 0, 0.55), Q.world(1.2, 0, 1.45), pos[1] + 0.6, { h: 1.02, post: 1.0 });
    Q.collider([-1.4, 0, 0], [1.4, 3.3, 0.55], "pod-collar");
    Q.collider([-1.25, 0, 0.5], [1.25, 0.62, 1.5], "pod-step");
    // status pillar beside the collar
    Q.box("paintedMetal", 1.85, 0.05, 0.55, 0.36, 0.1, 0.36, { color: black });
    Q.box("paintedMetal", 1.85, 0.75, 0.55, 0.3, 1.5, 0.3, { color: dark, texel: 1 });
    Q.box(cap, 1.85, 1.54, 0.55, 0.32, 0.08, 0.32);
    indicatorField(Q, 1.85, 1.15, 0.705, 0.22, 0.3, seed + 2);
    Q.collider([1.67, 0, 0.37], [2.03, 1.6, 0.73], "status-pillar");
    // launch-tube housing above: a vertical half-cylinder from the collar top to the ceiling
    Q.add("paintedMetal", new THREE.CylinderGeometry(1.3, 1.3, tubeH, 20, 1, false, -Math.PI / 2, Math.PI), 0, 3.35 + tubeH / 2, 0, { color: dark, texel: 1 });
    for (const y of [3.5, 3.35 + tubeH - 0.2]) Q.add("paintedMetal", new THREE.CylinderGeometry(1.36, 1.36, 0.14, 20, 1, false, -Math.PI / 2, Math.PI), 0, y, 0, { color: black });
    Q.box("paintedMetal", 0, 3.35 + tubeH / 2, 1.3, 0.12, tubeH - 0.5, 0.08, { color: black });
    Q.box("emitAmber", 0, 3.35 + tubeH / 2, 1.345, 0.03, tubeH - 0.7, 0.01);
    // warm accent light over the hatch
    ctx.lights.push({ type: "point", pos: Q.world(0, 3.0, 1.9), color: 0xffb35c, intensity: 18, distance: 9, priority: 0.6 });
  };
  STATION_Z.forEach((z, i) => station([IX0, Y, z], Math.PI / 2, STATUS_W[i], 100 + i * 7));
  STATION_Z.forEach((z, i) => station([IX1, Y, z], -Math.PI / 2, STATUS_E[i], 200 + i * 7));

  // side walls between the stations: floor guide lights, junction boxes, grilles
  const gaps = [306.9, 310.8, 315.2, 319.6, 324.0, 328.2];
  for (const z of gaps) {
    for (const s of [-1, 1]) kit.box("emitAmber", s * (IX1 - 0.16), Y + 0.05, z, 0.3, 0.05, 0.1);
  }
  junction(IX0, Y + 1.5, 310.8, Math.PI / 2, { seed: 11 });
  junction(IX0, Y + 1.4, 319.6, Math.PI / 2, { w: 0.5, h: 0.6, seed: 12 });
  junction(IX1, Y + 1.5, 315.2, -Math.PI / 2, { w: 0.5, h: 0.6, seed: 13 });
  junction(IX1, Y + 1.4, 324.0, -Math.PI / 2, { seed: 14 });
  for (const z of [310.8, 315.2, 319.6, 324.0]) {
    grille(IX0, Y + 2.85, z, Math.PI / 2);
    grille(IX1, Y + 2.85, z, -Math.PI / 2);
  }

  // =============================================================================================
  // CENTRE: muster line on the dark runway, guide lights, hanging muster signs
  // =============================================================================================
  const LY = Y + 0.014; // on top of the shell's blackGloss centre strip
  floorLine(kit, [0, LY, 306.4], [0, LY, 328.5], 0.16, "emitAmber");
  for (const z of STATION_Z) floorLine(kit, [-0.85, LY, z], [0.85, LY, z], 0.1, "emitAmber");
  for (let z = 307.0; z <= 328.0; z += 3.0) for (const x of [-0.7, 0.7]) kit.box("emitAmber", x, Y + 0.02, z, 0.14, 0.016, 0.14);
  // painted boarding lanes from the runway to each pod's muster strip
  const PAINT_AMBER = new THREE.Color("#ffb040");
  for (const z of STATION_Z) {
    for (const s of [-1, 1]) {
      floorLine(kit, [s * 1.0, Y + 0.004, z], [s * 17.5, Y + 0.004, z], 0.12, "paintedMetal", PAINT_AMBER);
      for (let x = 4.0; x < 17.0; x += 4.0) floorLine(kit, [s * x, Y + 0.004, z - 0.45], [s * x, Y + 0.004, z + 0.45], 0.1, "paintedMetal", PAINT_AMBER);
    }
  }
  // boarding-control pedestals either side of the runway at mid-bay
  consoleProp(kit, PALETTE, [-2.9, Y, 317.4], Math.PI / 2, { w: 1.2, d: 0.7, h: 1.15, screens: 1, screenMat: "screenImp1", seed: 43 });
  consoleProp(kit, PALETTE, [2.9, Y, 317.4], -Math.PI / 2, { w: 1.2, d: 0.7, h: 1.15, screens: 1, screenMat: "screenImp0", seed: 44 });
  for (const z of [312.0, 322.5]) {
    kit.box("paintedMetal", 0, CY - 0.555, z, 0.06, 1.05, 0.06, { color: black });
    kit.box("paintedMetal", 0, CY - 1.3, z, 1.4, 0.44, 0.1, { color: black, texel: 1 });
    for (const s of [-1, 1]) {
      kit.box("emitAmber", 0, CY - 1.3, z + s * 0.055, 1.24, 0.3, 0.01);
      kit.box("paintedMetal", 0, CY - 1.3, z + s * 0.062, 0.9, 0.08, 0.01, { color: black });
    }
  }
  // overhead gantry beams tying the launch tubes together along each wall (hung between channels)
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", s * 16.6, CY - 0.35, (IZ0 + IZ1) / 2, 0.32, 0.36, IZ1 - IZ0 - 1.0, { color: dark, texel: 1 });
    for (const z of [309.3, 313.4, 317.5, 321.6, 325.7]) kit.box("paintedMetal", s * 16.6, CY - 0.1, z, 0.16, 0.14, 0.24, { color: black });
    for (const z of STATION_Z) kit.box("paintedMetal", s * 17.5, CY - 0.37, z, 1.9, 0.2, 0.3, { color: dark, texel: 1 });
  }

  // =============================================================================================
  // DOOR END (aft wall): emergency lockers, O2 rack, crates, console, screens
  // =============================================================================================
  for (const s of [-1, 1]) {
    cabinet(kit, PALETTE, [s * 4.0, Y, IZ1 - 0.27], Math.PI, { color: RED, emit: "emitRedImp", seed: 31 + s });
    kit.box("paintedMetal", s * 4.0, Y + 2.05, IZ1 - 0.03, 1.2, 0.3, 0.06, { color: black });
    kit.box("emitRedImp", s * 4.0, Y + 2.05, IZ1 - 0.065, 1.0, 0.12, 0.01);
  }
  {
    // oxygen supply rack: dark frame, two shelves of white bottles behind a retaining bar
    const Q = placer(kit, [-8.5, Y, IZ1 - 0.32], Math.PI);
    const w = 2.4;
    const h = 2.0;
    const d = 0.6;
    for (const lx of [-w / 2 + 0.04, w / 2 - 0.04]) for (const lz of [-d / 2 + 0.04, d / 2 - 0.04]) Q.box("paintedMetal", lx, h / 2, lz, 0.08, h, 0.08, { color: dark });
    for (const y of [0.06, 1.0]) Q.box("paintedMetal", 0, y, 0, w, 0.06, d, { color: mid, texel: 1 });
    Q.box("paintedMetal", 0, h - 0.03, 0, w, 0.06, d, { color: dark });
    Q.box("paintedMetal", 0, h / 2, -d / 2 + 0.01, w - 0.1, h - 0.1, 0.02, { color: black });
    for (const y0 of [0.09, 1.03]) {
      for (let k = 0; k < 6; k++) {
        const lx = -w / 2 + 0.25 + k * 0.38;
        Q.cyl("metal", lx, y0 + 0.375, 0.05, 0.13, 0.75, "y", { color: white, segments: 14 });
        Q.cyl("metal", lx, y0 + 0.8, 0.05, 0.05, 0.1, "y", { color: steel, segments: 8 });
        Q.box(k === 4 ? "emitAmber" : "emitGreen", lx, y0 + 0.4, 0.185, 0.06, 0.16, 0.01);
      }
      Q.cyl("metal", 0, y0 + 0.5, 0.24, 0.015, w - 0.16, "x", { color: steel, segments: 8 });
    }
    Q.box("hazard", 0, h - 0.13, d / 2 + 0.005, w - 0.2, 0.12, 0.01, { texel: 2 });
    Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "o2-rack");
  }
  crate(10.6, IZ1 - 0.65, 0.04);
  crate(11.9, IZ1 - 0.65, -0.03, { color: grey });
  crate(10.6, IZ1 - 0.65, 0.12, { s: 0.9, y: Y + 1.2, color: dark });
  consoleProp(kit, PALETTE, [5.9, Y, 327.2], 0.35, { w: 2.0, screens: 2, screenMat: "screenImp1", seed: 41 });
  wallScreen(kit, [-12.6, Y + 2.2, IZ1 - 0.1], Math.PI, 1.6, 0.9, "screenImp0");
  wallScreen(kit, [7.4, Y + 2.3, IZ1 - 0.1], Math.PI, 1.6, 0.9, "screenImp1");
  wallScreen(kit, [14.6, Y + 2.2, IZ1 - 0.1], Math.PI, 1.6, 0.9, "screenImp0");
  for (const s of [-1, 1]) cabinet(kit, PALETTE, [s * 17.3, Y, IZ1 - 0.27], Math.PI, { emit: "emitAmber", seed: 35 + s, color: s < 0 ? mid : grey });
  junction(-15.2, Y + 1.7, IZ1, Math.PI, { conduitTo: Y + 4.6, seed: 15 });
  junction(15.9, Y + 3.2, IZ1, Math.PI, { w: 0.5, h: 0.4, conduitTo: Y + 4.6, seed: 16 });
  tray([-19.0, Y + 4.6, IZ1 - 0.2], [19.0, Y + 4.6, IZ1 - 0.2], 0.35);
  // door header: dark lintel plate + amber strip a metre above the hole (hole top at +3.0)
  kit.box("paintedMetal", 0, Y + 4.05, IZ1 - 0.02, 3.4, 0.16, 0.04, { color: black });
  kit.box("emitAmber", 0, Y + 4.05, IZ1 - 0.045, 3.2, 0.06, 0.01);

  // =============================================================================================
  // FORWARD WALL: pod status board (10 blocks), flanking screens, benches, locker banks, cabinets
  // =============================================================================================
  {
    const bz = IZ0 + 0.02;
    kit.boxMM("paintedMetal", [-3.3, Y + 1.25, bz], [3.3, Y + 3.75, bz + 0.12], { color: black, texel: 1 });
    kit.boxMM("impPanel", [-3.3, Y + 3.5, bz + 0.12], [3.3, Y + 3.75, bz + 0.14], { color: white, uv: "keep" });
    kit.boxMM("emitAmber", [-3.1, Y + 3.58, bz + 0.14], [3.1, Y + 3.66, bz + 0.15]);
    for (let i = 0; i < 5; i++) {
      for (const [row, arr] of [[0, STATUS_W], [1, STATUS_E]]) {
        const x = -2.4 + i * 1.2;
        const y = Y + 2.9 - row * 0.85;
        kit.box("darkGloss", x, y, bz + 0.13, 1.0, 0.7, 0.02);
        kit.box(EMIT[arr[i]], x, y, bz + 0.145, 0.86, 0.56, 0.01);
        kit.box("paintedMetal", x, y - 0.2, bz + 0.152, 0.6, 0.03, 0.01, { color: black });
        kit.box("paintedMetal", x, y + 0.16, bz + 0.152, 0.3, 0.16, 0.01, { color: black });
      }
    }
    const B = placer(kit, [0, Y, bz + 0.12], 0);
    indicatorField(B, 0, 1.45, 0.005, 5.8, 0.18, 51);
    kit.collider([-3.3, Y, bz], [3.3, Y + 3.75, bz + 0.15], "status-board");
  }
  wallScreen(kit, [-5.6, Y + 2.6, IZ0 + 0.1], 0, 1.6, 1.0, "screenImp1");
  wallScreen(kit, [5.6, Y + 2.6, IZ0 + 0.1], 0, 1.6, 1.0, "screenImp0");
  for (const s of [-1, 1]) {
    bench(s * 9.0, IZ0 + 0.35, 0);
    wallScreen(kit, [s * 9.0, Y + 2.3, IZ0 + 0.1], 0, 2.4, 1.0, s < 0 ? "screenImp0" : "screenImp1");
    lockerBank(kit, PALETTE, [s * 13.5, Y, IZ0 + 0.27], 0, { count: 6, unit: 0.6, h: 2.0 });
    cabinet(kit, PALETTE, [s * 17.6, Y, IZ0 + 0.27], 0, { emit: "emitAmber", seed: 37 + s, color: s < 0 ? grey : mid });
    junction(s * 16.2, Y + 1.5, IZ0, 0, { conduitTo: Y + 4.5, seed: 17 + s });
  }
  pipe(kit, PALETTE, [-19.0, Y + 5.1, IZ0 + 0.3], [19.0, Y + 5.1, IZ0 + 0.3], 0.08, { color: steel, bracket: 3 });
  pipe(kit, PALETTE, [-19.0, Y + 5.4, IZ0 + 0.3], [19.0, Y + 5.4, IZ0 + 0.3], 0.06, { color: dark, bracket: 3 });
  tray([-19.0, Y + 4.5, IZ0 + 0.55], [19.0, Y + 4.5, IZ0 + 0.55], 0.35);

  // =============================================================================================
  // LIGHTS: four warm down-spots in a 2x2 grid over the deck (spots use their own pool slot, so all
  // ten hatch accents pushed by the stations stay live) = 14 total
  // =============================================================================================
  // diamond layout: two on the runway centre line (their sheen lands in the door view's frame on the
  // metallic deck) and two over the boarding lanes
  for (const [x, z] of [[0, 310.5], [0, 324.5], [-10.0, 317.5], [10.0, 317.5]]) {
    ctx.lights.push({ type: "spot", pos: [x, CY - 1.2, z], target: [x, Y, z], color: 0xffe6cc, intensity: 80, distance: 30, angle: 1.15, penumbra: 0.7, priority: 0.9 });
  }
}
