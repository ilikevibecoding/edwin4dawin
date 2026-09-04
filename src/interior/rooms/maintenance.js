// Deck 4 — Maintenance & Repair Bay (d4_maintenance). A 45 m workshop: two repair lifts (an ion
// engine pod on a two-post lift, a turbolaser barrel section on trestles), machine tools and benches,
// parts racks, a welding booth with a flickering arc, droid charging alcoves, grated trenches over lit
// service channels, a travelling overhead crane and hanging work lights.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { Kit, rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { impWall, impCeiling, wallScreen, equipmentRack, crate, pipeRun, railing, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { ENG_PAINTS, ENG_CEIL_PAINTS, ENG_STYLES, ENG_THEME, AMBER, COOL, HAZARD_TEXEL, cableTray, wallVent, wallStencil, floorStencil, floorLine, hazardBorder, floorBorder, oilStain, workLight, warningLamp, craneRail, cabinet, shelfFrame, workbench, gratedTrench, emitMat, loader, palletJack, toolChest, weldScreen, hose, lockerRow, pipeManifold, jobBoardMat } from "./engProps.js";

export function buildMaintenance(kit, ctx) {
  const [min, max] = ctx.bounds; // [2.9, 0, -64] .. [48, 9, -36]
  const H = max[1];
  const rand = rng(ctx.seed + 17);
  const pad = 0.4;

  // ---------------------------------------------------------------- shell: floor slabs around two trenches
  const T = [
    [8, -53.3, 40, -52.3],
    [8, -47.7, 40, -46.7],
  ];
  const slab = (x0, z0, x1, z1) => kit.boxMM("floorGloss", [x0, -0.12, z0], [x1, 0, z1], { texel: 0.33 });
  slab(min[0] - pad, min[2] - pad, max[0] + pad, T[0][1]);
  slab(min[0] - pad, T[0][3], max[0] + pad, T[1][1]);
  slab(min[0] - pad, T[1][3], max[0] + pad, max[2] + pad);
  for (const [x0, z0, x1, z1] of T) {
    slab(min[0] - pad, z0, x0, z1);
    slab(x1, z0, max[0] + pad, z1);
    gratedTrench(kit, x0, z0, x1, z1, { depth: 0.6, emit: "emitAmber" });
  }
  // dark gutter where the walls meet the deck
  const g = 0.18;
  for (const [x0, z0, x1, z1] of [
    [min[0], min[2], max[0], min[2] + g],
    [min[0], max[2] - g, max[0], max[2]],
    [min[0], min[2], min[0] + g, max[2]],
    [max[0] - g, min[2], max[0], max[2]],
  ]) kit.boxMM("paintedMetal", [x0, 0, z0], [x1, 0.015, z1], { color: PALETTE.impBlack, texel: 2 });
  // two long strips over the bays (not the aisle), dimmed so they do not blow out in the 45 m view
  impCeiling(kit, ctx, { lights: false, stripMat: "emitWhiteDim", paints: ENG_CEIL_PAINTS, panelW: 2.4, rowH: 2.4, along: "x", spacing: 12, styles: { panel: 0.74, greeble: 0.1, vent: 0.16 } });
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) impWall(kit, ctx, side, { paints: ENG_PAINTS, styles: ENG_STYLES, theme: ENG_THEME, rows: [0, 0.5, 1.7, 3.2, 5.2, 7.2, H], panelW: 2.0, seed: ctx.seed * 3 + side.length });

  // ---------------------------------------------------------------- lift A: engine pod on a two-post lift
  const ax = 15;
  const az = -57.6;
  for (const s of [-1, 1]) {
    const pz = az + s * 2.3;
    kit.box("paintedMetal", ax, 1.7, pz, 0.6, 3.4, 0.5, { color: PALETTE.impAmber, texel: 1.5 });
    kit.box("paintedMetal", ax, 0.08, pz, 1.4, 0.16, 0.9, { color: PALETTE.impBlack, texel: 2 });
    kit.cyl("metal", ax, 1.9, pz - s * 0.05, 0.1, 2.6, "y", { color: PALETTE.steel });
    kit.box("hazard", ax, 3.45, pz, 0.62, 0.12, 0.52, { texel: HAZARD_TEXEL });
    // arms to the platform beams
    kit.box("paintedMetal", ax, 1.6, pz - s * 0.9, 0.5, 0.22, 1.4, { color: PALETTE.impAmber, texel: 1.5 });
    kit.collider([ax - 0.35, 0, pz - 0.3], [ax + 0.35, 3.5, pz + 0.3], "liftpost");
  }
  // control box on the +z post
  kit.box("paintedMetal", ax + 0.42, 1.3, az + 2.3, 0.24, 0.5, 0.36, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitGreen", ax + 0.55, 1.42, az + 2.3, 0.01, 0.05, 0.05);
  kit.box("emitRed", ax + 0.55, 1.42, az + 2.18, 0.01, 0.05, 0.05);
  kit.box("rubber", ax + 0.58, 1.2, az + 2.26, 0.06, 0.1, 0.16, { color: PALETTE.rubber });
  for (const s of [-1, 1]) kit.box("paintedMetal", ax, 1.6, az + s * 0.8, 5.6, 0.2, 0.3, { color: PALETTE.impMid, texel: 1.5 });
  // saddles + the pod
  for (const x of [ax - 1.6, ax + 1.6]) {
    kit.box("paintedMetal", x, 1.95, az, 0.5, 0.5, 2.6, { color: PALETTE.impDark, texel: 2 });
    kit.box("rubber", x, 2.25, az, 0.5, 0.1, 2.2, { color: PALETTE.rubber });
  }
  const py = 3.05;
  kit.cyl("metal", ax, py, az, 1.1, 5.2, "x", { color: PALETTE.hullGrey, segments: 28, texel: 0.6 });
  kit.cyl("paintedMetal", ax - 1.2, py, az, 1.16, 0.4, "x", { color: PALETTE.impDark, segments: 28 });
  kit.cyl("paintedMetal", ax + 1.4, py, az, 1.16, 0.4, "x", { color: PALETTE.impDark, segments: 28 });
  // nozzle (+x) and intake (-x)
  kit.add("metal", new THREE.CylinderGeometry(1.2, 0.85, 1.1, 28, 1, true).rotateZ(-Math.PI / 2), { pos: [ax + 3.15, py, az], color: PALETTE.impDark, uv: "scale", uvScale: [6, 1] });
  kit.cyl("emitBlue", ax + 2.65, py, az, 0.7, 0.05, "x", { segments: 24 });
  kit.add("metal", new THREE.TorusGeometry(1.05, 0.12, 10, 32).rotateY(Math.PI / 2), { pos: [ax - 2.62, py, az], color: PALETTE.steel });
  kit.cyl("paintedMetal", ax - 2.62, py, az, 0.9, 0.2, "x", { color: PALETTE.impBlack, segments: 24 });
  kit.cyl("metal", ax - 2.75, py, az, 0.3, 0.3, "x", { color: PALETTE.steel, segments: 16 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    kit.add("metal", new THREE.BoxGeometry(0.06, 0.16, 0.62), { pos: [ax - 2.66, py + 0.5 * Math.cos(a), az + 0.5 * Math.sin(a)], rot: [a + Math.PI / 2, 0, 0], color: PALETTE.steel });
  }
  // opened access bay on the +z side with exposed internals
  kit.box("paintedMetal", ax + 0.2, py + 0.1, az + 0.95, 2.0, 1.2, 0.5, { color: PALETTE.impBlack, texel: 2 });
  for (let i = 0; i < 8; i++) {
    const ox = ax - 0.7 + rand() * 1.8;
    const oy = py - 0.35 + rand() * 0.9;
    if (rand() < 0.5) kit.cyl("metal", ox, oy, az + 1.15, 0.05 + rand() * 0.08, 0.3, "z", { color: [PALETTE.steel, PALETTE.brass, PALETTE.gunmetal][i % 3], segments: 10 });
    else kit.box(rand() < 0.4 ? "emitAmber" : "metal", ox, oy, az + 1.15, 0.12 + rand() * 0.2, 0.08 + rand() * 0.16, 0.2, { color: PALETTE.gunmetal });
  }
  pipeRun(kit, [[ax - 0.6, py - 0.3, az + 1.2], [ax - 0.6, py + 0.4, az + 1.25], [ax + 0.8, py + 0.4, az + 1.25]], 0.04, PALETTE.impAmber, "rubber");
  kit.collider([ax - 2.9, 0, az - 2.0], [ax + 3.7, 4.3, az + 2.0], "lift");
  // removed panels leaning on the post, tool chest and cables on the floor
  kit.add("paintedMetal", new THREE.BoxGeometry(1.6, 1.1, 0.05), { pos: [ax + 1.2, 0.56, az - 3.0], rot: [-0.25, 0, 0], color: PALETTE.hullGrey, texel: 1.5 });
  kit.add("paintedMetal", new THREE.BoxGeometry(1.4, 0.9, 0.05), { pos: [ax + 2.4, 0.46, az - 3.05], rot: [-0.3, 0, 0.1], color: PALETTE.hullGrey, texel: 1.5 });
  kit.collider([ax + 0.3, 0, az - 3.3], [ax + 3.2, 1.1, az - 2.7], "panels");
  cabinet(kit, ax + 4.8, az - 2.2, { yaw: Math.PI / 2, w: 1.4, h: 1.3, d: 0.7, seed: ctx.seed + 3, screen: null, lamp: "emitGreen" });
  oilStain(kit, ax - 1.5, az + 2.9, 0.9, ctx.seed + 4);
  oilStain(kit, ax + 2.2, az - 2.4, 0.6, ctx.seed + 5);
  hazardBorder(kit, ax - 3.2, az - 3.4, ax + 4.0, az + 3.4, 0.3);

  // ---------------------------------------------------------------- lift B: turbolaser barrel section on trestles
  const bx = 16.5;
  const bz = -42.4;
  for (const x of [bx - 2.4, bx + 2.4]) {
    for (const s of [-1, 1]) kit.add("paintedMetal", new THREE.BoxGeometry(0.22, 1.7, 0.22), { pos: [x, 0.82, bz + s * 0.5], rot: [s * 0.55, 0, 0], color: PALETTE.impAmber, texel: 2 });
    kit.box("paintedMetal", x, 1.62, bz, 0.5, 0.2, 1.0, { color: PALETTE.impDark, texel: 2 });
    kit.box("paintedMetal", x, 0.05, bz, 0.5, 0.1, 2.0, { color: PALETTE.impBlack, texel: 2 });
    kit.collider([x - 0.3, 0, bz - 1.0], [x + 0.3, 1.8, bz + 1.0], "trestle");
  }
  const by = 2.25;
  kit.cyl("metal", bx, by, bz, 0.55, 7.6, "x", { color: PALETTE.impMid, segments: 24, texel: 0.8 });
  kit.cyl("paintedMetal", bx - 3.4, by, bz, 0.95, 0.4, "x", { color: PALETTE.impDark, segments: 24, texel: 1 });
  kit.cyl("metal", bx - 3.0, by, bz, 0.75, 0.3, "x", { color: PALETTE.steel, segments: 24 });
  for (let i = 0; i < 6; i++) kit.box("paintedMetal", bx + 1.4 + i * 0.35, by, bz, 0.12, 1.5, 1.5, { color: PALETTE.impDark, texel: 2 });
  kit.cyl("paintedMetal", bx + 3.85, by, bz, 0.42, 0.14, "x", { color: PALETTE.impBlack, segments: 20 });
  for (const s of [-1, 1]) kit.cyl("metal", bx - 1.0, by + s * 0.62, bz, 0.12, 4.2, "x", { color: PALETTE.gunmetal, segments: 10 });
  kit.collider([bx - 3.9, 1.6, bz - 0.8], [bx + 4.0, 3.0, bz + 0.8], "barrel");
  // dismantled parts: rings on the floor, a parts crate, a tool cart
  kit.add("metal", new THREE.CylinderGeometry(0.9, 0.9, 0.3, 24, 1, true), { pos: [bx + 5.6, 0.15, bz + 1.6], color: PALETTE.steel, uv: "scale", uvScale: [6, 1] });
  kit.add("metal", new THREE.TorusGeometry(0.7, 0.08, 10, 28).rotateX(Math.PI / 2), { pos: [bx + 5.4, 0.08, bz - 1.8], color: PALETTE.gunmetal });
  kit.collider([bx + 4.6, 0, bz + 0.6], [bx + 6.6, 0.4, bz + 2.6], "ring");
  crate(kit, ctx, { x: bx - 4.6, z: bz + 2.4, sx: 1.2, sy: 0.7, sz: 1.0, yaw: 0.2, seed: ctx.seed + 8 });
  cabinet(kit, bx + 5.2, bz - 3.6, { yaw: 0, w: 1.2, h: 1.1, d: 0.6, seed: ctx.seed + 9, screen: null, lamp: "emitBlue" });
  oilStain(kit, bx + 1.0, bz - 1.9, 0.8, ctx.seed + 6);
  hazardBorder(kit, bx - 5.4, bz - 3.0, bx + 6.6, bz + 3.0, 0.3);

  // ---------------------------------------------------------------- work stand C (middle of the south bay): a sublight
  // compressor disc on an A-frame spindle stand, tool chests, air hoses, a welding screen
  const cx = 27.5;
  const cz = -57.4;
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) kit.add("paintedMetal", new THREE.BoxGeometry(0.2, 2.3, 0.2), { pos: [cx + s * 1.5, 1.1, cz + t * 0.55], rot: [t * 0.42, 0, 0], color: PALETTE.impAmber, texel: 2 });
    kit.box("paintedMetal", cx + s * 1.5, 2.25, cz, 0.5, 0.25, 0.7, { color: PALETTE.impDark, texel: 2 });
    kit.box("paintedMetal", cx + s * 1.5, 0.06, cz, 0.5, 0.12, 2.2, { color: PALETTE.impBlack, texel: 2 });
    kit.collider([cx + s * 1.5 - 0.3, 0, cz - 1.1], [cx + s * 1.5 + 0.3, 2.4, cz + 1.1], "stand");
  }
  kit.cyl("metal", cx, 2.25, cz, 0.09, 3.2, "x", { color: PALETTE.steel, segments: 12 });
  kit.cyl("metal", cx, 2.25, cz, 0.45, 0.7, "x", { color: PALETTE.gunmetal, segments: 24 });
  kit.cyl("metal", cx, 2.25, cz, 1.25, 0.16, "x", { color: PALETTE.hullGrey, segments: 40, texel: 0.6 });
  kit.add("metal", new THREE.TorusGeometry(1.3, 0.09, 10, 48).rotateY(Math.PI / 2), { pos: [cx, 2.25, cz], color: PALETTE.steel });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    kit.add("metal", new THREE.BoxGeometry(0.42, 0.55, 0.05), { pos: [cx, 2.25 + Math.cos(a) * 1.55, cz + Math.sin(a) * 1.55], rot: [a, 0.35, 0], color: i % 7 === 0 ? PALETTE.brass : PALETTE.steel });
  }
  kit.collider([cx - 0.5, 0, cz - 1.9], [cx + 0.5, 4.1, cz + 1.9], "disc");
  // a removed blade row and a bearing on a stool, tool chests, hoses from the wall coupling
  kit.box("paintedMetal", cx - 0.6, 0.3, cz + 2.6, 0.6, 0.6, 0.6, { color: PALETTE.impDark, texel: 2 });
  kit.add("metal", new THREE.TorusGeometry(0.34, 0.07, 10, 28).rotateX(Math.PI / 2), { pos: [cx - 0.6, 0.67, cz + 2.6], color: PALETTE.gunmetal });
  for (let i = 0; i < 5; i++) kit.add("metal", new THREE.BoxGeometry(0.42, 0.55, 0.05), { pos: [cx + 1.2 + i * 0.12, 0.28, cz + 2.7], rot: [0.2, 0, 1.35], color: PALETTE.steel });
  kit.collider([cx - 1.0, 0, cz + 2.2], [cx + 1.9, 0.8, cz + 3.0], "parts");
  toolChest(kit, cx - 2.5, cz + 2.0, { yaw: 0.2, seed: ctx.seed + 71 });
  toolChest(kit, cx + 2.7, cz - 2.2, { yaw: -0.4, seed: ctx.seed + 72, color: PALETTE.impMid });
  hose(kit, [[cx + 2.7, cz - 1.6], [cx + 1.8, cz - 1.0], [cx + 1.1, cz - 0.2], [cx + 0.7, cz + 0.9]], { r: 0.035 });
  hose(kit, [[cx - 3.5, T[0][3] + 0.3], [cx - 3.0, cz + 3.6], [cx - 2.0, cz + 3.0], [cx - 1.2, cz + 1.3]], { r: 0.03, color: PALETTE.impAmber });
  kit.box("paintedMetal", cx - 3.5, 0.12, T[0][3] + 0.3, 0.36, 0.24, 0.36, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitAmberDim", cx - 3.5, 0.245, T[0][3] + 0.3, 0.14, 0.01, 0.14, { uv: "keep" });
  weldScreen(kit, cx + 3.3, cz + 1.6, { yaw: 0.5 });
  oilStain(kit, cx + 0.4, cz - 2.6, 0.7, ctx.seed + 73);
  floorBorder(kit, cx - 2.3, cz - 2.4, cx + 2.3, cz + 3.2, { w: 0.12 });
  floorStencil(kit, cx, cz - 3.2, 1.2, 8, 0, 0.006);

  // ---------------------------------------------------------------- north bay middle: a landing strut on trestles, parts trolley in the aisle
  {
    const sx = 26.5;
    const sz = -41.6;
    for (const x of [sx - 1.8, sx + 1.8]) {
      for (const s of [-1, 1]) kit.add("paintedMetal", new THREE.BoxGeometry(0.16, 1.2, 0.16), { pos: [x, 0.58, sz + s * 0.38], rot: [s * 0.5, 0, 0], color: PALETTE.impAmber, texel: 2 });
      kit.box("paintedMetal", x, 1.14, sz, 0.4, 0.14, 0.8, { color: PALETTE.impDark, texel: 2 });
      kit.collider([x - 0.25, 0, sz - 0.7], [x + 0.25, 1.25, sz + 0.7], "trestle");
    }
    kit.cyl("metal", sx - 0.6, 1.45, sz, 0.26, 3.0, "x", { color: PALETTE.impMid, segments: 20, texel: 0.8 });
    kit.cyl("metal", sx + 1.6, 1.45, sz, 0.16, 1.6, "x", { color: PALETTE.steel, segments: 16 });
    kit.box("paintedMetal", sx + 2.5, 1.45, sz, 0.3, 0.9, 0.9, { color: PALETTE.impDark, texel: 2 });
    kit.cyl("paintedMetal", sx - 2.15, 1.45, sz, 0.34, 0.16, "x", { color: PALETTE.impBlack, segments: 20 });
    for (const s of [-1, 1]) kit.cyl("metal", sx - 0.4, 1.45 + s * 0.3, sz + 0.28, 0.04, 2.2, "x", { color: PALETTE.gunmetal, segments: 8 });
    kit.collider([sx - 2.3, 1.1, sz - 0.5], [sx + 2.7, 1.9, sz + 0.5], "strut");
    toolChest(kit, sx + 0.4, sz - 1.9, { yaw: Math.PI + 0.15, seed: ctx.seed + 74 });
    hose(kit, [[sx + 0.9, sz - 1.5], [sx + 0.2, sz - 1.0], [sx - 0.6, sz - 0.5]], { r: 0.03 });
    oilStain(kit, sx - 1.0, sz + 1.1, 0.6, ctx.seed + 75);
    floorBorder(kit, sx - 2.6, sz - 2.4, sx + 3.0, sz + 1.2, { w: 0.12 });
    // parts trolley parked on the north edge of the aisle (leaves 2.8 m of walkway)
    palletJack(kit, 31.5, -48.7, Math.PI / 2);
    crate(kit, ctx, { x: 31.0, y: 0.15, z: -48.7, sx: 0.9, sy: 0.7, sz: 0.9, seed: ctx.seed + 76 });
  }

  // ---------------------------------------------------------------- machine tools and benches (zmin wall)
  const mz = min[2] + 1.0;
  // lathe
  kit.box("paintedMetal", 25.5, 0.55, mz, 3.4, 1.1, 1.3, { color: PALETTE.impMid, texel: 1.5 });
  kit.box("paintedMetal", 25.5, 0.06, mz, 3.4, 0.12, 1.32, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", 24.3, 1.5, mz - 0.1, 0.9, 0.8, 1.0, { color: PALETTE.impDark, texel: 2 });
  kit.cyl("metal", 25.1, 1.45, mz + 0.1, 0.22, 0.5, "x", { color: PALETTE.steel, segments: 16 });
  kit.cyl("metal", 26.2, 1.45, mz + 0.1, 0.05, 1.8, "x", { color: PALETTE.steel });
  kit.box("metal", 26.4, 1.32, mz + 0.35, 0.6, 0.4, 0.4, { color: PALETTE.gunmetal });
  kit.box("emitAmber", 24.3, 1.75, mz + 0.42, 0.3, 0.05, 0.01);
  kit.box("impScreen4", 24.15, 1.55, mz + 0.42, 0.44, 0.24, 0.01, { uv: "keep" });
  kit.collider([23.7, 0, mz - 0.7], [27.3, 1.9, mz + 0.7], "lathe");
  // drill press
  kit.box("paintedMetal", 29.0, 0.5, mz, 0.9, 1.0, 0.9, { color: PALETTE.impMid, texel: 2 });
  kit.cyl("metal", 29.0, 1.9, mz - 0.25, 0.09, 1.8, "y", { color: PALETTE.steel });
  kit.box("paintedMetal", 29.0, 2.7, mz, 0.5, 0.5, 1.1, { color: PALETTE.impDark, texel: 2 });
  kit.cyl("metal", 29.0, 2.0, mz + 0.35, 0.05, 0.9, "y", { color: PALETTE.steel });
  kit.box("metal", 29.0, 1.1, mz + 0.3, 0.6, 0.06, 0.6, { color: PALETTE.gunmetal });
  kit.collider([28.5, 0, mz - 0.6], [29.5, 2.9, mz + 0.6], "drill");
  // hydraulic press
  kit.box("paintedMetal", 31.6, 0.4, mz, 1.6, 0.8, 1.2, { color: PALETTE.impMid, texel: 1.5 });
  for (const s of [-1, 1]) kit.box("paintedMetal", 31.6 + s * 0.65, 1.6, mz, 0.25, 2.4, 0.4, { color: PALETTE.impAmber, texel: 2 });
  kit.box("paintedMetal", 31.6, 2.75, mz, 1.6, 0.4, 0.6, { color: PALETTE.impDark, texel: 2 });
  kit.cyl("metal", 31.6, 2.1, mz, 0.16, 0.9, "y", { color: PALETTE.steel });
  kit.box("metal", 31.6, 1.55, mz, 0.7, 0.2, 0.6, { color: PALETTE.gunmetal });
  kit.collider([30.7, 0, mz - 0.6], [32.5, 2.95, mz + 0.6], "press");
  // benches
  for (let i = 0; i < 3; i++) workbench(kit, 35.2 + i * 2.7, min[2] + 0.55, { yaw: 0, w: 2.5, seed: ctx.seed + 20 + i });
  for (const x of [20.5, 22.0]) cabinet(kit, x, min[2] + 0.36, { yaw: 0, w: 1.3, h: 2.2 + (x % 2) * 0.3, d: 0.66, seed: ctx.seed + x, screen: 4 });
  wallScreen(kit, ctx, { side: "zmin", u: 26 - min[0], v: 2.6, w: 1.6, h: 0.9, screen: 4 });
  wallScreen(kit, ctx, { side: "zmin", u: 31.6 - min[0], v: 3.4, w: 1.4, h: 0.8, screen: 1 });
  wallStencil(kit, ctx, "zmin", 23 - min[0], 2.6, 0.8, 7);
  wallVent(kit, ctx, "zmin", 12, 5.2, 2.4, 0.9);
  wallVent(kit, ctx, "zmin", 30, 5.6, 2.4, 0.9);
  // stock rack: pipes and bars leaning in a cradle west of the tools
  kit.box("paintedMetal", 8.5, 0.3, mz, 3.0, 0.6, 1.0, { color: PALETTE.impDark, texel: 2 });
  for (let i = 0; i < 7; i++) {
    const r = 0.04 + rand() * 0.07;
    kit.cyl("metal", 8.5 + (rand() - 0.5) * 2.4, 0.6 + r + rand() * 0.5, mz + (rand() - 0.5) * 0.6, r, 3.2 + rand() * 1.4, "y", { color: rand() < 0.5 ? PALETTE.steel : PALETTE.gunmetal, segments: 8, rot: [0.16, 0, (rand() - 0.5) * 0.12] });
  }
  kit.collider([6.9, 0, mz - 0.6], [10.1, 4.4, mz + 0.6], "stock");
  // crew lockers and a coolant manifold fill the plain wall behind lift A; a lit work-order board over the tools
  lockerRow(kit, ctx, "zmin", 13 - min[0], { n: 10, seed: ctx.seed + 81 });
  pipeManifold(kit, ctx, "zmin", 18 - min[0], { w: 2.6, v0: 0.5, v1: 3.2, n: 5, seed: ctx.seed + 82 });
  jobBoardMat(ctx, "mnt_jobs", { title: "WORK ORDERS  ·  BAY 04", seed: ctx.seed + 83 });
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    const u = 28.6 - min[0];
    frame.box("paintedMetal", u, 3.3, 0.05, 2.7, 1.45, 0.1, { color: PALETTE.impBlack, texel: 2 });
    frame.add("mnt_jobs", new THREE.PlaneGeometry(2.4, 1.2), u, 3.3, 0.106, { uv: "keep" });
    frame.box("emitAmberDim", u, 2.5, 0.09, 2.2, 0.03, 0.01, { uv: "keep" });
  }

  // ---------------------------------------------------------------- welding booth (zmin / xmax corner)
  const wx = 43.2;
  const wz = -61.6;
  emitMat(ctx, "mnt_weld", 0xdfefff, 0.5, "emitWhite");
  for (const s of [-1, 1]) kit.box("paintedMetal", wx + s * 1.9, 1.1, wz + 0.2, 0.06, 2.2, 3.2, { color: PALETTE.impDark, texel: 2 });
  kit.box("paintedMetal", wx, 1.1, wz - 1.55, 3.86, 2.2, 0.06, { color: PALETTE.impDark, texel: 2 });
  kit.box("hazard", wx, 2.25, wz - 1.55, 3.9, 0.12, 0.1, { texel: HAZARD_TEXEL });
  kit.box("metal", wx, 0.85, wz, 1.6, 0.08, 1.0, { color: PALETTE.gunmetal, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("paintedMetal", wx + sx * 0.7, 0.4, wz + sz * 0.4, 0.08, 0.8, 0.08, { color: PALETTE.impDark, texel: 2 });
  kit.box("metal", wx - 0.2, 1.05, wz, 0.9, 0.3, 0.5, { color: PALETTE.hullGrey });
  kit.box("mnt_weld", wx + 0.28, 1.02, wz + 0.1, 0.08, 0.08, 0.08);
  kit.cyl("metal", wx + 0.6, 1.3, wz + 0.3, 0.02, 0.6, "y", { color: PALETTE.steel, rot: [0.5, 0, -0.6] });
  // gas bottles on a cart
  kit.box("paintedMetal", wx + 1.3, 0.3, wz + 1.0, 0.8, 0.6, 0.6, { color: PALETTE.impDark, texel: 2 });
  kit.cyl("paintedMetal", wx + 1.1, 1.3, wz + 1.0, 0.16, 1.4, "y", { color: PALETTE.impRed, segments: 14 });
  kit.cyl("paintedMetal", wx + 1.5, 1.3, wz + 1.0, 0.16, 1.4, "y", { color: PALETTE.impGrey, segments: 14 });
  kit.cyl("metal", wx + 1.1, 2.1, wz + 1.0, 0.05, 0.2, "y", { color: PALETTE.brass });
  kit.cyl("metal", wx + 1.5, 2.1, wz + 1.0, 0.05, 0.2, "y", { color: PALETTE.brass });
  pipeRun(kit, [[wx + 1.1, 2.15, wz + 1.0], [wx + 0.9, 1.5, wz + 0.5], [wx + 0.6, 1.4, wz + 0.3]], 0.02, PALETTE.rubber, "rubber");
  kit.collider([wx - 0.9, 0, wz - 0.6], [wx + 0.9, 1.1, wz + 0.6], "weldtable");
  kit.collider([wx + 0.8, 0, wz + 0.6], [wx + 1.8, 2.2, wz + 1.4], "bottles");
  kit.collider([wx - 1.95, 0, wz - 1.6], [wx - 1.85, 2.2, wz + 1.8], "screen");
  kit.collider([wx + 1.85, 0, wz - 1.6], [wx + 1.95, 2.2, wz + 1.8], "screen");
  floorBorder(kit, wx - 2.0, wz - 1.6, wx + 2.0, wz + 1.9, { w: 0.12 });
  wallStencil(kit, ctx, "zmin", wx - min[0], 3.0, 0.8, 1);
  const weld = pointLight(0xcfe4ff, 0, 8, [wx + 0.3, 1.6, wz + 0.2]);
  ctx.light(weld);
  const weldMat = ctx.materials.mnt_weld;
  ctx.anim((dt, t) => {
    const s = Math.sin(t * 37.1) * Math.sin(t * 23.7) + Math.sin(t * 11.3) * 0.4;
    const on = s > 0.15;
    const k = on ? 0.6 + 0.4 * Math.abs(Math.sin(t * 61.7)) : 0;
    weld.intensity = k * 22;
    weldMat.emissiveIntensity = 0.4 + k * 6;
  });

  // ---------------------------------------------------------------- parts racks and tool boards (xmax wall)
  for (const [z0, z1] of [[-62.4, -54.2], [-45.8, -37.6]]) {
    const heights = shelfFrame(kit, max[0] - 1.6, z0, max[0] - 0.1, z1, { levels: 3, levelH: 1.55 });
    const levels = [0, ...heights.slice(0, -1)];
    for (const ly of levels) {
      for (let z = z0 + 0.8; z < z1 - 0.6; z += 1.5 + rand() * 0.9) {
        const r = rand();
        if (r < 0.45) crate(kit, ctx, { x: max[0] - 0.85, y: ly, z, sx: 0.9 + rand() * 0.4, sy: 0.6 + rand() * 0.6, sz: 0.9 + rand() * 0.3, seed: ctx.seed + Math.floor(z * 7) });
        else if (r < 0.75) kit.cyl("metal", max[0] - 0.85, ly + 0.35, z, 0.25 + rand() * 0.15, 0.7, "y", { color: rand() < 0.5 ? PALETTE.steel : PALETTE.impMid, segments: 14 });
        else kit.box("paintedMetal", max[0] - 0.85, ly + 0.25, z, 1.0, 0.5, 0.6, { color: PALETTE.impGrey, texel: 2 });
      }
    }
    floorBorder(kit, max[0] - 1.9, z0 - 0.1, max[0] - 0.05, z1 + 0.1, { w: 0.1 });
  }
  // tool boards between the racks with hung tools and a status screen
  for (const [z, seed] of [[-51.6, 1], [-48.4, 2]]) {
    kit.box("paintedMetal", max[0] - 0.06, 1.7, z, 0.06, 1.6, 2.4, { color: PALETTE.impMid, texel: 2 });
    const rr = rng(ctx.seed + seed);
    for (let i = 0; i < 9; i++) {
      const tz = z - 1.0 + i * 0.25;
      const th = 0.25 + rr() * 0.45;
      kit.box("metal", max[0] - 0.12, 2.25 - th / 2, tz, 0.04, th, 0.04, { color: PALETTE.steel });
      if (rr() < 0.6) kit.box("rubber", max[0] - 0.12, 2.25 - th - 0.07, tz, 0.05, 0.14, 0.07, { color: PALETTE.rubber });
    }
  }
  wallScreen(kit, ctx, { side: "xmax", u: -50 - min[2], v: 3.3, w: 1.8, h: 1.0, screen: 4 });
  wallStencil(kit, ctx, "xmax", -50 - min[2], 4.4, 0.9, 6);
  // lit bay sign on the far wall (an anchor for the 45 m view from the door) + cove strips over the racks
  emitMat(ctx, "bay_sign", 0xffb347, 1.6, "emitAmber");
  kit.box("paintedMetal", max[0] - 0.12, 5.4, -50, 0.12, 1.1, 7.0, { color: PALETTE.impBlack, texel: 2 });
  kit.box("bay_sign", max[0] - 0.19, 5.4, -50, 0.02, 0.8, 6.6, { uv: "keep" });
  kit.box("paintedMetal", max[0] - 0.22, 5.4, -50, 0.02, 0.5, 6.2, { color: PALETTE.impBlack, texel: 2 });
  for (const [z0, z1] of [[-62.4, -54.2], [-45.8, -37.6]]) {
    kit.boxMM("paintedMetal", [max[0] - 1.7, 4.75, z0], [max[0] - 0.1, 4.95, z1], { color: PALETTE.impDark, texel: 2 });
    kit.boxMM("emitWhiteSoft", [max[0] - 1.5, 4.72, z0 + 0.2], [max[0] - 0.3, 4.75, z1 - 0.2], { uv: "keep" });
  }
  wallVent(kit, ctx, "xmax", 8, 6.0, 2.6, 1.0);
  wallVent(kit, ctx, "xmax", 20, 6.0, 2.6, 1.0);
  equipmentRack(kit, ctx, { side: "xmax", u: -63.2 - min[2], w: 1.4, h: 3.0, seed: ctx.seed + 33, lit: "emitAmber" });

  // ---------------------------------------------------------------- droid alcoves (zmax wall)
  for (let i = 0; i < 6; i++) {
    const x = 9.5 + i * 3.4;
    const z = max[2] - 0.55;
    kit.box("paintedMetal", x, 1.3, z, 2.2, 2.6, 1.1, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("paintedMetal", x, 1.3, z - 0.02, 1.7, 2.2, 1.06, { color: PALETTE.impBlack, texel: 2 });
    kit.box("impPanel", x, 1.3, z + 0.5, 1.7, 2.2, 0.02, { color: PALETTE.impMid, uv: "keep" });
    kit.box("hazard", x, 2.5, z - 0.56, 2.2, 0.1, 0.02, { texel: HAZARD_TEXEL });
    kit.box("leds", x, 2.28, z - 0.56, 1.2, 0.05, 0.01, { uv: "keep" });
    kit.cyl(i % 3 === 1 ? "emitAmber" : "emitBlue", x, 0.02, z - 0.1, 0.55, 0.02, "y", { segments: 24 });
    kit.cyl("paintedMetal", x, 0.015, z - 0.1, 0.62, 0.03, "y", { color: PALETTE.impBlack, segments: 24 });
    kit.box("metal", x, 1.0, z + 0.4, 0.3, 0.6, 0.16, { color: PALETTE.gunmetal });
    kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [x - 0.9, 2.1, z - 0.565], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(14) });
    if (i === 1 || i === 4) {
      // an astromech-style droid docked in the alcove (original boxy design)
      kit.cyl("paintedMetal", x, 0.65, z - 0.1, 0.34, 0.8, "y", { color: PALETTE.impWhite, segments: 18, texel: 1.5 });
      kit.add("paintedMetal", new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, 1.05, z - 0.1], color: PALETTE.impGrey, uv: "scale", uvScale: [4, 2] });
      kit.box(i === 1 ? "emitRed" : "emitBlue", x, 1.18, z - 0.42, 0.1, 0.06, 0.04);
      for (const s of [-1, 1]) kit.box("paintedMetal", x + s * 0.42, 0.55, z - 0.1, 0.12, 0.9, 0.3, { color: PALETTE.impMid, texel: 2 });
      kit.box("paintedMetal", x, 0.7, z - 0.02, 0.5, 0.3, 0.6, { color: PALETTE.impMid, texel: 2 });
      kit.box("emitBlue", x - 0.1, 0.9, z - 0.44, 0.06, 0.06, 0.02);
      kit.box("emitAmber", x + 0.12, 0.78, z - 0.44, 0.08, 0.04, 0.02);
      kit.collider([x - 0.5, 0, z - 0.5], [x + 0.5, 1.4, z + 0.3], "droid");
    }
    kit.collider([x - 1.1, 0, z - 0.55], [x - 0.85, 2.6, z + 0.55], "alcove");
    kit.collider([x + 0.85, 0, z - 0.55], [x + 1.1, 2.6, z + 0.55], "alcove");
    kit.collider([x - 1.1, 0, z + 0.45], [x + 1.1, 2.6, z + 0.55], "alcove");
  }
  wallStencil(kit, ctx, "zmax", max[0] - 12.5, 4.0, 1.0, 4);
  wallVent(kit, ctx, "zmax", 10, 6.2, 2.6, 1.0);
  wallVent(kit, ctx, "zmax", 34, 6.2, 2.6, 1.0);
  // east of the alcoves the wall changes rhythm: a locker row, a stocked wall rack with a lit job board over it
  lockerRow(kit, ctx, "zmax", max[0] - 30.0, { n: 8, seed: ctx.seed + 84 });
  wallScreen(kit, ctx, { side: "zmax", u: max[0] - 32.5, v: 3.1, w: 1.8, h: 1.0, screen: 1 });
  {
    const heights = shelfFrame(kit, 36.0, max[2] - 0.75, 39.2, max[2] - 0.1, { levels: 3, levelH: 0.95, color: PALETTE.impMid });
    const rr = rng(ctx.seed + 85);
    for (const ly of [0, ...heights.slice(0, -1)]) {
      for (let x = 36.5; x < 38.9; x += 0.7 + rr() * 0.4) {
        const r = rr();
        if (r < 0.4) crate(kit, ctx, { x, y: ly, z: max[2] - 0.42, sx: 0.5 + rr() * 0.2, sy: 0.35 + rr() * 0.3, sz: 0.5, seed: ctx.seed + Math.floor(x * 9) });
        else if (r < 0.7) kit.cyl("metal", x, ly + 0.25, max[2] - 0.42, 0.12 + rr() * 0.08, 0.5, "y", { color: rr() < 0.5 ? PALETTE.steel : PALETTE.impRed, segments: 12 });
        else kit.box("paintedMetal", x, ly + 0.15, max[2] - 0.42, 0.55, 0.3, 0.45, { color: PALETTE.impGrey, texel: 2 });
      }
    }
    jobBoardMat(ctx, "mnt_jobs", { title: "WORK ORDERS  ·  BAY 04", seed: ctx.seed + 83 });
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    const u = max[0] - 37.6;
    frame.box("paintedMetal", u, 3.75, 0.05, 2.9, 1.5, 0.1, { color: PALETTE.impBlack, texel: 2 });
    frame.add("mnt_jobs", new THREE.PlaneGeometry(2.6, 1.3), u, 3.75, 0.106, { uv: "keep" });
    frame.box("emitAmberDim", u, 2.92, 0.09, 2.4, 0.03, 0.01, { uv: "keep" });
  }
  cabinet(kit, 40, max[2] - 0.36, { yaw: Math.PI, w: 1.4, h: 2.4, d: 0.66, seed: ctx.seed + 41, screen: 1 });
  cabinet(kit, 41.5, max[2] - 0.36, { yaw: Math.PI, w: 1.4, h: 2.0, d: 0.66, seed: ctx.seed + 42, screen: 4 });
  crate(kit, ctx, { x: 45.0, z: max[2] - 1.1, sx: 1.4, sy: 1.0, sz: 1.2, seed: ctx.seed + 43 });
  crate(kit, ctx, { x: 45.1, y: 1.0, z: max[2] - 1.15, sx: 1.0, sy: 0.7, sz: 1.0, yaw: 0.15, seed: ctx.seed + 44 });

  // ---------------------------------------------------------------- door wall (xmin) and floor markings
  const du = -50 - min[2];
  equipmentRack(kit, ctx, { side: "xmin", u: du - 6.5, w: 1.6, h: 3.0, seed: ctx.seed + 51, lit: "emitAmber" });
  equipmentRack(kit, ctx, { side: "xmin", u: du + 6.5, w: 1.6, h: 3.0, seed: ctx.seed + 52, lit: "emitBlue" });
  wallScreen(kit, ctx, { side: "xmin", u: du - 3.8, v: 1.9, w: 1.4, h: 0.8, screen: 4 });
  wallScreen(kit, ctx, { side: "xmin", u: du + 3.8, v: 1.9, w: 1.4, h: 0.8, screen: 1 });
  wallVent(kit, ctx, "xmin", du - 9.5, 5.4, 2.4, 0.9);
  wallVent(kit, ctx, "xmin", du + 9.5, 5.4, 2.4, 0.9);
  wallStencil(kit, ctx, "xmin", du - 2.2, 3.2, 0.7, 13);
  wallStencil(kit, ctx, "xmin", du + 2.2, 3.2, 0.7, 13);
  warningLamp(kit, min[0] + 0.25, 5.0, -50 - 2.6);
  warningLamp(kit, min[0] + 0.25, 5.0, -50 + 2.6);
  // aisle markings
  floorLine(kit, min[0] + 0.5, -52.6, max[0] - 2.0, -52.6, { w: 0.14, color: PALETTE.impAmber });
  floorLine(kit, min[0] + 0.5, -47.4, max[0] - 2.0, -47.4, { w: 0.14, color: PALETTE.impAmber });
  for (let i = 0; i < 5; i++) floorStencil(kit, 10 + i * 8, -50, 1.4, i % 2 ? 2 : 3, Math.PI / 2, 0.006);
  floorStencil(kit, 22, -56.5, 1.2, 7, 0.1);
  floorStencil(kit, 26, -44.5, 1.2, 1, -0.2);
  floorStencil(kit, 38, -57, 1.4, 5, 0.4);
  // north-east quadrant: a parked loader delivering a spare, a parts trolley and staged crates
  loader(kit, ctx, 35, -42.5, { yaw: Math.PI / 2 + 0.25, seed: ctx.seed + 61, carry: (x, y, z, yaw) => crate(kit, ctx, { x, y, z, sx: 1.0, sy: 0.8, sz: 1.0, yaw, seed: ctx.seed + 62 }) });
  palletJack(kit, 41.5, -43.5, Math.PI + 0.4);
  crate(kit, ctx, { x: 41.6, z: -44.7, sx: 1.2, sy: 0.6, sz: 1.0, yaw: 0.4, seed: ctx.seed + 63 });
  crate(kit, ctx, { x: 30.5, z: -39.6, sx: 1.6, sy: 1.1, sz: 1.4, yaw: -0.15, seed: ctx.seed + 64 });
  crate(kit, ctx, { x: 30.6, y: 1.1, z: -39.5, sx: 1.2, sy: 0.7, sz: 1.1, yaw: 0.1, seed: ctx.seed + 65 });
  oilStain(kit, 37.5, -44.5, 0.7, ctx.seed + 66);
  floorStencil(kit, 36, -46.2, 1.2, 9, Math.PI / 2);
  floorBorder(kit, 29.5, -40.5, 31.6, -38.6, { w: 0.1 });

  // ---------------------------------------------------------------- overhead: crane, trays, lights
  const ry = H - 1.3;
  craneRail(kit, min[0] + 1.5, max[0] - 1.5, -61.5, ry, { axis: "x", ceil: H });
  craneRail(kit, min[0] + 1.5, max[0] - 1.5, -38.5, ry, { axis: "x", ceil: H });
  // bridge crane: end trucks hang under both rails, a deep box girder between them, a hoist trolley
  // with a cable drum, twin ropes to a hook block at ~4 m and a slung hull plate (nothing hangs
  // over the lifts: the bridge only travels x 23..30, the trolley z -54..-45)
  const crane = new THREE.Group();
  const ck = new Kit(ctx.materials);
  const gy = ry - 1.15;
  ck.box("paintedMetal", 0, gy, -50, 0.7, 1.1, 23.6, { color: PALETTE.impAmber, texel: 1.5 });
  ck.box("paintedMetal", 0, gy + 0.6, -50, 0.9, 0.14, 23.8, { color: PALETTE.impDark, texel: 2 });
  ck.box("paintedMetal", 0, gy - 0.6, -50, 0.9, 0.1, 23.8, { color: PALETTE.impLight, texel: 2 });
  for (let z = -61; z <= -39; z += 2) ck.box("paintedMetal", 0, gy, z, 0.78, 0.92, 0.1, { color: PALETTE.impDark, texel: 2 });
  for (const z of [-61.5, -38.5]) {
    ck.box("paintedMetal", 0, ry - 0.42, z, 1.8, 0.7, 1.3, { color: PALETTE.impDark, texel: 2 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ck.add("metal", new THREE.CylinderGeometry(0.16, 0.16, 0.1, 14).rotateZ(Math.PI / 2), { pos: [sx * 0.6, ry + 0.19, z + sz * 0.2], color: PALETTE.steel });
    ck.box("emitAmber", 0, ry - 0.8, z, 0.24, 0.08, 0.24);
    ck.box("emitRedDim", 0, ry - 0.42, z + (z < -50 ? -0.66 : 0.66), 0.5, 0.06, 0.01);
  }
  ck.build(crane);
  const trolley = new THREE.Group();
  const tk = new Kit(ctx.materials);
  const ty = gy - 1.05;
  tk.box("paintedMetal", 0, ty, 0, 1.7, 0.8, 1.5, { color: PALETTE.impDark, texel: 2 });
  for (const s of [-1, 1]) tk.box("paintedMetal", s * 0.5, ty + 0.45, 0, 0.16, 0.3, 1.3, { color: PALETTE.impBlack, texel: 2 });
  tk.box("emitAmberDim", 0.86, ty, 0, 0.01, 0.12, 0.7, { uv: "keep" });
  tk.box("emitAmberDim", -0.86, ty, 0, 0.01, 0.12, 0.7, { uv: "keep" });
  tk.box("emitRed", 0, ty + 0.44, 0.7, 0.12, 0.08, 0.12);
  tk.add("metal", new THREE.CylinderGeometry(0.25, 0.25, 1.0, 18).rotateZ(Math.PI / 2), { pos: [0, ty - 0.55, 0], color: PALETTE.gunmetal });
  for (const s of [-1, 1]) tk.box("metal", s * 0.55, ty - 0.55, 0, 0.06, 0.6, 0.5, { color: PALETTE.impDark });
  const hy = 4.1;
  for (const s of [-1, 1]) tk.box("paintedMetal", s * 0.2, (ty - 0.55 + hy + 0.3) / 2, 0, 0.03, ty - 0.55 - hy - 0.3, 0.03, { color: PALETTE.impBlack, texel: 2 });
  tk.box("paintedMetal", 0, hy, 0, 0.7, 0.6, 0.4, { color: PALETTE.impAmber, texel: 2 });
  tk.box("paintedMetal", 0, hy, 0, 0.72, 0.12, 0.42, { color: PALETTE.impBlack, texel: 2 });
  tk.box("emitAmber", 0, hy + 0.08, 0.21, 0.24, 0.08, 0.01);
  tk.box("metal", 0, hy - 0.45, 0, 0.08, 0.3, 0.08, { color: PALETTE.steel });
  tk.add("metal", new THREE.TorusGeometry(0.22, 0.05, 8, 20, Math.PI * 1.5), { pos: [0, hy - 0.82, 0], rot: [0, 0, Math.PI / 4], color: PALETTE.steel });
  // slung hull plate on four slings from the hook
  const plateY = 2.7;
  const sling = (a, b) => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const d = B.clone().sub(A);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const m = A.clone().add(B).multiplyScalar(0.5);
    tk.add("metal", new THREE.CylinderGeometry(0.012, 0.012, d.length(), 6), { pos: [m.x, m.y, m.z], quat: q, color: PALETTE.gunmetal });
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) sling([0, hy - 1.02, 0], [sx * 1.15, plateY + 0.04, sz * 0.75]);
  tk.box("paintedMetal", 0, plateY, 0, 2.6, 0.08, 1.7, { color: PALETTE.hullGrey, texel: 1.5 });
  for (const sx of [-1, 1]) tk.box("paintedMetal", sx * 1.0, plateY + 0.06, 0, 0.16, 0.04, 1.5, { color: PALETTE.impDark, texel: 2 });
  tk.box("hazard", 0, plateY, -0.86, 2.6, 0.08, 0.02, { texel: HAZARD_TEXEL });
  tk.build(trolley);
  crane.add(trolley);
  ctx.mesh(crane);
  crane.position.x = 26.5;
  trolley.position.z = -49.5;
  ctx.anim((dt, t) => {
    crane.position.x = 26.5 + Math.sin(t * 0.1) * 3.5;
    trolley.position.z = -49.5 + Math.sin(t * 0.17 + 1) * 4.5;
  });
  cableTray(kit, [min[0] + 1.2, -55.5], [max[0] - 1.2, -55.5], H - 0.5, { w: 0.6, ceil: H, cables: 5, seed: 3 });
  cableTray(kit, [min[0] + 1.2, -44.5], [max[0] - 1.2, -44.5], H - 0.5, { w: 0.6, ceil: H, cables: 4, seed: 4 });
  cableTray(kit, [10, min[2] + 1.2], [10, max[2] - 1.2], H - 0.75, { w: 0.45, ceil: H, cables: 3, seed: 5 });
  cableTray(kit, [36, min[2] + 1.2], [36, max[2] - 1.2], H - 0.75, { w: 0.45, ceil: H, cables: 3, seed: 6 });
  pipeRun(kit, [[min[0] + 0.6, H - 0.4, min[2] + 0.5], [max[0] - 0.6, H - 0.4, min[2] + 0.5]], 0.16, PALETTE.impMid);
  pipeRun(kit, [[min[0] + 0.6, H - 0.4, min[2] + 0.9], [max[0] - 0.6, H - 0.4, min[2] + 0.9]], 0.1, PALETTE.impAmber);
  // hanging work lights over the bays and benches
  workLight(kit, ctx, ax, 5.6, az, { ceil: H, color: 0xfff1dc, intensity: 12, distance: 14, w: 1.6, d: 0.5 });
  workLight(kit, ctx, bx, 5.6, bz, { ceil: H, color: 0xfff1dc, intensity: 12, distance: 14, w: 1.6, d: 0.5 });
  workLight(kit, ctx, 31, 5.4, -60.5, { ceil: H, color: AMBER, intensity: 9, distance: 12, w: 1.4, d: 0.5 });
  workLight(kit, ctx, 22, 5.4, -39.5, { ceil: H, color: 0xfff1dc, intensity: 8, distance: 12, w: 1.4, d: 0.5 });
  // stand-mounted task lamps on the A-frame heads (real light kept clear of the crane's travel)
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", cx + s * 1.5, 2.5, cz, 0.36, 0.26, 0.5, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitWhiteSoft", cx + s * (1.5 - 0.185), 2.5, cz, 0.01, 0.18, 0.4, { uv: "keep" });
  }
  ctx.light(pointLight(0xfff1dc, 9, 12, [cx, 3.4, cz]));
  ctx.light(pointLight(COOL, 7, 11, [7, H - 2.5, -50]));
  railing(kit, 40.6, -53.3, 40.6, -52.3, 0, { collide: false, h: 0.6 });
  railing(kit, 40.6, -47.7, 40.6, -46.7, 0, { collide: false, h: 0.6 });
}
