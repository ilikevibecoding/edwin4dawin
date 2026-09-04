// d4-repair-bay — Maintenance & Repair Bay (Deck 4, port aft).
// Two portal-frame repair stands on hydraulic lift jacks (stand A holds a 7 m hexagonal wing panel,
// stand B a stripped wing spar), a rolling diagnostic gantry cabled to the panel hub, four welding stalls
// on the west wall (curtains, fume hoods, gas carts, one live arc driven by t), parts racks + bin walls,
// workbenches along the aft wall, an overhead crane, amber working lights + blue-white strips.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { buildShell, floorMark, floorRect, floorDashes, WALL_T } from "../bays-shared/shell.js";
import { Placer, consoleUnit, wallScreen, partsRack, toolChest, workbench, crateKit, hexPanel, hose, craneRails, handrail, stairs, stripFixture, statusPost, pointLight, spotLight } from "../bays-shared/props.js";

const FLOOR = -72;
const CEIL = -52;
const B = { min: [-140, FLOOR, 70], max: [-80, CEIL, 170] };
const DOORS = [
  { id: "d4-hangar-repair", pos: [-80, FLOOR, 120], dir: [1, 0, 0], kind: "bay", w: 14, h: 10, to: "d4-hangar" },
  { id: "d4-shuttle-repair", pos: [-111, FLOOR, 70], dir: [0, 0, -1], kind: "standard", to: "d4-shuttle-bay" },
  { id: "d4-repair-aft", pos: [-111, FLOOR, 170], dir: [0, 0, 1], kind: "standard", to: "d4-corridor-west" },
];
const STAND_A = [-114, 96];
const STAND_B = [-114, 144];
const PANEL_Y = 4.6; // hub height of the hex panel above the floor
const WEST_FACE = -140 + WALL_T + 0.06; // panel surface of the west wall
const LIVE_STALL = { z0: 95.7, z1: 101.1 };

// ---------------------------------------------------------------------------
// Portal-frame repair stand: four columns with amber work lamps, top ring + spine beam with blue-white
// strips, K-braces, two hydraulic lift jacks on the centreline, a hydraulic power pack. load: "panel"
// (hex wing panel clamped from the ±z columns and chained to the spine) | "spar".
// ---------------------------------------------------------------------------
function repairStand(kit, P, cx, cz, load) {
  const pl = new Placer(kit, [cx, FLOOR, cz], 0);
  const H = 8.5;
  const CX = 3.0;
  const CZ = 4.5;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = sx * CX;
      const z = sz * CZ;
      pl.box("paintedMetal", x, H / 2, z, 0.5, H, 0.5, { color: P.impDark, texel: 1 });
      pl.box("paintedMetal", x, 0.06, z, 1.1, 0.12, 1.1, { color: P.impBlack, texel: 2 });
      pl.box("hazard", x, 0.55, z, 0.54, 0.6, 0.54, { texel: 1 });
      // amber working lamp on the inner face
      const zi = z - sz * 0.31;
      pl.box("paintedMetal", x, H - 1.2, zi, 0.34, 0.26, 0.12, { color: P.impBlack, texel: 2 });
      pl.box("emitAmber", x, H - 1.2, zi - sz * 0.07, 0.26, 0.18, 0.02);
      pl.collider([x - 0.3, 0, z - 0.3], [x + 0.3, 3, z + 0.3], "stand-column");
      // K-brace from the column base to the top of the spine
      const dir = new THREE.Vector3(0, H - 0.8, -sz * CZ).normalize();
      const L = Math.hypot(H - 0.8, CZ);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      pl.add("paintedMetal", new THREE.BoxGeometry(0.14, L - 0.9, 0.14), x, 0.8 + (H - 0.8) / 2, z / 2, { color: P.impMid, texel: 1, quat: q });
    }
  // top ring
  for (const sx of [-1, 1]) pl.box("paintedMetal", sx * CX, H + 0.3, 0, 0.6, 0.6, 2 * CZ + 0.6, { color: P.impMid, texel: 1 });
  for (const sz of [-1, 1]) {
    pl.box("paintedMetal", 0, H + 0.3, sz * CZ, 2 * CX - 0.5, 0.6, 0.6, { color: P.impMid, texel: 1 });
    pl.box("hazard", 0, H - 0.02, sz * CZ, 2 * CX - 0.7, 0.08, 0.64, { texel: 1 });
  }
  // spine beam with three blue-white work strips
  pl.box("paintedMetal", 0, H + 0.3, 0, 0.5, 0.6, 2 * CZ - 0.5, { color: P.impDark, texel: 1 });
  for (const z of [-2.7, 0, 2.7]) {
    pl.box("paintedMetal", 0, H - 0.04, z, 0.7, 0.12, 1.7, { color: P.impBlack, texel: 2 });
    pl.box("emitCool", 0, H - 0.12, z, 0.5, 0.03, 1.5, { uv: "keep" });
  }
  // hydraulic lift jacks
  const padTop = load === "panel" ? 1.54 : 1.16;
  for (const sz of [-1, 1]) {
    const z = sz * 1.7;
    const bodyH = padTop - 0.6 - 0.16;
    pl.cyl("paintedMetal", 0, 0.08, z, 0.62, 0.16, "y", { color: P.impBlack, segments: 16 });
    pl.cyl("metal", 0, 0.16 + bodyH / 2, z, 0.34, bodyH, "y", { color: P.impGrey, segments: 16 });
    pl.cyl("paintedMetal", 0, 0.16 + bodyH - 0.02, z, 0.37, 0.1, "y", { color: P.impAmber, segments: 16 });
    pl.cyl("metal", 0, padTop - 0.38, z, 0.18, 0.42, "y", { color: P.impHullLight, segments: 12 });
    pl.box("paintedMetal", 0, padTop - 0.09, z, 1.6, 0.18, 1.0, { color: P.impMid, texel: 2 });
    pl.box("paintedMetal", 0, padTop + 0.02, z, 1.4, 0.06, 0.8, { color: P.impBlack, texel: 2 });
    pl.collider([-0.8, 0, z - 0.5], [0.8, padTop + 0.1, z + 0.5], "jack");
    // hydraulic line along the floor to the power pack
    hose(kit, "paintedMetal", pl.point(-0.5, 0.12, z), pl.point(-3.9, 0.2, -3.4), -0.12, 0.03, P.impBlack);
  }
  // hydraulic power pack outside the west portal
  pl.box("paintedMetal", -4.3, 0.45, -3.4, 1.0, 0.9, 1.2, { color: P.impDark, texel: 1.5 });
  pl.box("paintedMetal", -4.3, 0.96, -3.4, 0.7, 0.12, 0.9, { color: P.impBlack, texel: 2 });
  pl.cyl("metal", -4.3, 1.02, -3.75, 0.12, 0.1, "y", { color: P.impGrey, segments: 10 });
  pl.box("emitRedImp", -4.3, 0.75, -2.78, 0.08, 0.06, 0.02);
  pl.box("emitBlue", -4.15, 0.75, -2.78, 0.08, 0.06, 0.02);
  pl.box("hazard", -4.3, 0.2, -2.78, 0.9, 0.16, 0.02, { texel: 2 });
  pl.collider([-4.85, 0, -4.05], [-3.75, 1.1, -2.75], "power-pack");

  if (load === "panel") {
    hexPanel(pl, P, { r: 3.5, thick: 0.16, at: [0, PANEL_Y, 0] });
    // rim clamps from the ±z columns at hub height
    for (const sz of [-1, 1]) {
      pl.box("paintedMetal", 0, PANEL_Y, sz * 3.85, 0.36, 0.36, 1.0, { color: P.impMid, texel: 1 });
      pl.cyl("metal", 0, PANEL_Y + 0.26, sz * 3.9, 0.1, 0.7, "z", { color: P.impGrey, segments: 10 });
      pl.box("paintedMetal", 0, PANEL_Y, sz * 3.3, 0.6, 0.9, 0.3, { color: P.impBlack, texel: 2 });
      pl.box("emitRedImp", 0.31, PANEL_Y, sz * 3.3, 0.02, 0.1, 0.1);
    }
    // top lugs + short chains to the spine
    for (const z of [-1.3, 1.3]) {
      pl.box("paintedMetal", 0, 7.75, z, 0.24, 0.3, 0.12, { color: P.impMid, texel: 2 });
      pl.cyl("metal", 0, (7.9 + H) / 2, z, 0.025, H - 7.9, "y", { color: P.impGrey, segments: 6 });
    }
    pl.collider([-0.5, 0, -3.6], [0.5, 8, 3.6], "wing-panel");
  } else {
    // stripped wing spar resting across the pads
    const sy = padTop + 0.03 + 0.28;
    pl.box("paintedMetal", 0, sy, 0, 0.7, 0.56, 6.4, { color: P.impDark, texel: 1 });
    for (let i = -2; i <= 2; i++) pl.box("paintedMetal", 0, sy, i * 1.3, 0.82, 0.68, 0.14, { color: P.impMid, texel: 2 });
    for (const sz of [-1, 1]) pl.cyl("metal", 0, sy + 0.05, sz * 3.35, 0.26, 0.3, "z", { color: P.impGrey, segments: 12 });
    pl.box("emitAmber", 0.36, sy + 0.2, 0.6, 0.02, 0.06, 0.3);
    pl.box("hazard", 0, sy + 0.36, -2.0, 0.5, 0.02, 0.6, { texel: 2 });
    pl.collider([-0.45, 0, -3.5], [0.45, sy + 0.5, 3.5], "spar");
  }
  // floor: amber footprint outline + white centre cross
  floorRect(kit, cx - CX - 1.2, cz - CZ - 1.2, cx + CX + 1.2, cz + CZ + 1.2, FLOOR, P.impAmber, 0.15);
  floorMark(kit, cx - 1.0, cz - 0.08, cx + 1.0, cz + 0.08, FLOOR, P.impWhite, { h: 0.016 });
  floorMark(kit, cx - 0.08, cz - 1.0, cx + 0.08, cz + 1.0, FLOOR, P.impWhite, { h: 0.016 });
}

// ---------------------------------------------------------------------------
// Rolling diagnostic gantry: wheeled skids, four columns, 3.2 m deck with rails, a two-screen console
// facing the panel, a junction cabinet with a cable reel, a light frame with a blue-white strip, stairs
// on the north end. Four cables droop from the reel to `hub` (world).
// ---------------------------------------------------------------------------
function diagGantry(kit, P, x0, z0, hub) {
  const pl = new Placer(kit, [x0, FLOOR, z0], 0);
  const D = 3.2;
  for (const sx of [-1, 1]) {
    pl.box("paintedMetal", sx * 1.25, 0.42, 0, 0.3, 0.3, 6.2, { color: P.impDark, texel: 1 });
    pl.box("hazard", sx * 1.25, 0.42, 0, 0.34, 0.18, 6.24, { texel: 1 });
    for (const z of [-2.6, 2.6]) pl.cyl("paintedMetal", sx * 1.25, 0.22, z, 0.22, 0.24, "x", { color: P.impBlack, segments: 14 });
  }
  for (const z of [-2.0, 2.0]) pl.box("paintedMetal", 0, 0.42, z, 2.2, 0.2, 0.3, { color: P.impDark, texel: 1 });
  const colH = D + 1.2 - 0.57;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) pl.box("paintedMetal", sx * 1.25, 0.57 + colH / 2, sz * 2.95, 0.16, colH, 0.16, { color: P.impDark, texel: 2 });
  // X-braces on the long sides under the deck
  for (const sx of [-1, 1]) {
    for (const s of [-1, 1]) {
      const L = Math.hypot(D - 0.8, 5.9);
      const dir = new THREE.Vector3(0, D - 0.8, s * 5.9).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      pl.add("paintedMetal", new THREE.BoxGeometry(0.06, L - 0.3, 0.06), sx * 1.25, 0.6 + (D - 0.8) / 2, 0, { color: P.impMid, texel: 1, quat: q });
    }
  }
  // deck + hazard edge
  pl.box("paintedMetal", 0, D - 0.06, 0, 2.7, 0.12, 6.1, { color: P.impMid, texel: 1 });
  pl.box("hazard", 0, D - 0.06, 0, 2.74, 0.08, 6.14, { texel: 1 });
  pl.collider([-1.45, 0, -3.1], [1.45, D + 0.2, 3.1], "gantry");
  // rails (stair opening on the north end)
  handrail(kit, P, [x0 - 1.3, z0 - 3.0], [x0 - 1.3, z0 + 3.0], FLOOR + D, { collide: false });
  handrail(kit, P, [x0 + 1.3, z0 - 3.0], [x0 + 1.3, z0 + 3.0], FLOOR + D, { collide: false });
  handrail(kit, P, [x0 - 1.3, z0 + 3.0], [x0 + 1.3, z0 + 3.0], FLOOR + D, { collide: false });
  handrail(kit, P, [x0 - 1.3, z0 - 3.0], [x0 - 0.62, z0 - 3.0], FLOOR + D, { collide: false, postEvery: 1 });
  handrail(kit, P, [x0 + 0.62, z0 - 3.0], [x0 + 1.3, z0 - 3.0], FLOOR + D, { collide: false, postEvery: 1 });
  // console facing the panel (operator on the +x side looks west)
  consoleUnit(new Placer(kit, [x0 - 0.62, FLOOR + D, z0 + 1.0], -90), P, { w: 1.6, d: 0.7, screens: ["screenImp0", "screenImp1"], collide: false, indicators: 2 });
  // junction cabinet + cable reel
  pl.box("paintedMetal", -0.85, D + 0.45, -1.4, 0.6, 0.9, 0.8, { color: P.impBlack, texel: 2 });
  for (let i = 0; i < 4; i++) pl.box(i % 2 ? "emitBlue" : "emitRedImp", -0.54, D + 0.7 - i * 0.12, -1.4 + (i - 1.5) * 0.14, 0.02, 0.05, 0.08);
  pl.cyl("paintedMetal", -0.85, D + 1.2, -1.4, 0.3, 0.5, "x", { color: P.impDark, segments: 14 });
  pl.cyl("paintedMetal", -0.85, D + 1.2, -1.4, 0.16, 0.56, "x", { color: P.impAmber, segments: 12 });
  const reel = pl.point(-1.15, D + 1.2, -1.4);
  const cableCols = [
    ["paintedMetal", P.impBlack, 0.06],
    ["painted", P.impRed, 0.04],
    ["painted", P.impBlue, 0.04],
    ["paintedMetal", P.impBlack, 0.05],
  ];
  cableCols.forEach(([mat, col, r], i) => {
    hose(kit, mat, [reel[0], reel[1] + 0.1 - i * 0.05, reel[2] + (i - 1.5) * 0.12], [hub[0], hub[1] + (i - 1.5) * 0.1, hub[2] + (i - 1.5) * 0.14], 1.5 + i * 0.12, r, col, { segments: 18 });
  });
  // light frame: two masts on the east corners, top rail, arms carrying a blue-white strip over the deck
  for (const sz of [-1, 1]) pl.box("paintedMetal", 1.15, D + 1.3, sz * 2.7, 0.1, 2.6, 0.1, { color: P.impBlack, texel: 2 });
  pl.box("paintedMetal", 1.15, D + 2.6, 0, 0.1, 0.1, 5.5, { color: P.impBlack, texel: 2 });
  for (const sz of [-1, 1]) pl.box("paintedMetal", 0.35, D + 2.6, sz * 1.5, 1.7, 0.08, 0.08, { color: P.impBlack, texel: 2 });
  stripFixture(kit, P, x0 - 0.4, FLOOR + D + 2.52, z0, 3.6, "z", "emitCool", { w: 0.16 });
  // stairs up the north end
  stairs(new Placer(kit, [x0, FLOOR, z0 - 3.0 - 16 * 0.28], 0), P, { w: 1.2, steps: 16, rise: 0.2, run: 0.28 });
}

// ---------------------------------------------------------------------------
// Welding stall between z0..z1 against the west wall: heavy slotted table with a workpiece, torch,
// fume hood with amber strip + duct, wall screen, gas cart with two bottles + hose, floor outline.
// live → arc emitter at the torch tip (material animated in update). curtainZ → welding curtain.
// ---------------------------------------------------------------------------
function weldStall(kit, P, rand, z0, z1, opts = {}) {
  const { live = false, curtainZ = null } = opts;
  const zc = (z0 + z1) / 2;
  const tx = -139.0;
  kit.box("paintedMetal", tx, FLOOR + 0.88, zc, 1.0, 0.08, 1.8, { color: P.impGrey, texel: 1.5 });
  for (let i = 0; i < 5; i++) kit.box("paintedMetal", tx, FLOOR + 0.925, zc - 0.6 + i * 0.3, 0.9, 0.02, 0.04, { color: P.impBlack, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("paintedMetal", tx + sx * 0.42, FLOOR + 0.42, zc + sz * 0.82, 0.1, 0.84, 0.1, { color: P.impBlack, texel: 2 });
  kit.box("paintedMetal", tx, FLOOR + 0.25, zc, 0.8, 0.06, 1.6, { color: P.impDark, texel: 2 });
  // stock on the lower shelf
  kit.box("paintedMetal", tx, FLOOR + 0.36, zc + 0.3, 0.6, 0.16, 0.9, { color: P.impMid, texel: 2 });
  // workpiece, clamp, torch
  kit.box("paintedMetal", tx + 0.05, FLOOR + 0.945, zc - 0.25, 0.7, 0.05, 0.5, { color: P.impDark, texel: 2 });
  kit.box("paintedMetal", tx - 0.28, FLOOR + 1.0, zc - 0.25, 0.12, 0.16, 0.24, { color: P.impMid, texel: 2 });
  kit.cyl("metal", tx + 0.1, FLOOR + 0.99, zc + 0.22, 0.025, 0.34, "z", { color: P.impGrey, segments: 8 });
  kit.cyl("paintedMetal", tx + 0.1, FLOOR + 0.99, zc + 0.02, 0.014, 0.12, "z", { color: P.impBlack, segments: 6 });
  if (live) {
    kit.add("weldArc", new THREE.SphereGeometry(0.07, 8, 6), { pos: [tx + 0.1, FLOOR + 0.985, zc - 0.03], uv: "keep" });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      kit.add("weldArc", new THREE.BoxGeometry(0.012, 0.012, 0.22), { pos: [tx + 0.1 + Math.cos(a) * 0.16, FLOOR + 1.0 + 0.08 * Math.sin(i * 1.7), zc - 0.03 + Math.sin(a) * 0.14], rot: [0.5 * Math.sin(a), a, 0], uv: "keep" });
    }
  }
  // fume hood + amber work strip + duct up to the services tray
  kit.boxMM("paintedMetal", [-139.45, FLOOR + 2.3, zc - 1.0], [-138.35, FLOOR + 2.7, zc + 1.0], { color: P.impDark, texel: 1 });
  kit.boxMM("paintedMetal", [-139.4, FLOOR + 2.7, zc - 0.5], [-138.6, FLOOR + 2.9, zc + 0.5], { color: P.impBlack, texel: 1 });
  kit.boxMM("emitAmber", [-139.2, FLOOR + 2.275, zc - 0.7], [-138.6, FLOOR + 2.31, zc + 0.7], { uv: "keep" });
  kit.cyl("metal", -139.35, FLOOR + 3.7, zc, 0.18, 1.6, "y", { color: P.impGrey, segments: 12 });
  kit.cyl("paintedMetal", -139.35, FLOOR + 2.94, zc, 0.24, 0.1, "y", { color: P.impDark, segments: 12 });
  wallScreen(new Placer(kit, [-140 + WALL_T + 0.12, FLOOR, zc], -90), P, { w: 1.2, h: 0.8, y: 3.4, mat: live ? "screenImp1" : "screenImp0" });
  // gas cart south of the table
  const gz = zc + 1.4;
  kit.box("paintedMetal", -139.0, FLOOR + 0.1, gz, 0.7, 0.08, 0.6, { color: P.impDark, texel: 2 });
  kit.box("paintedMetal", -139.36, FLOOR + 0.85, gz, 0.04, 1.5, 0.5, { color: P.impDark, texel: 2 });
  kit.box("paintedMetal", -139.0, FLOOR + 1.1, gz, 0.7, 0.04, 0.04, { color: P.impBlack, texel: 2 });
  kit.cyl("paintedMetal", -139.12, FLOOR + 0.84, gz - 0.18, 0.15, 1.4, "y", { color: P.impGreen, segments: 14 });
  kit.cyl("paintedMetal", -139.12, FLOOR + 0.84, gz + 0.18, 0.15, 1.4, "y", { color: P.impGrey, segments: 14 });
  for (const dz of [-0.18, 0.18]) kit.cyl("metal", -139.12, FLOOR + 1.61, gz + dz, 0.05, 0.14, "y", { color: P.impGrey, segments: 8 });
  hose(kit, "paintedMetal", [-139.12, FLOOR + 1.66, gz + 0.18], [tx + 0.1, FLOOR + 0.99, zc + 0.39], 0.45, 0.02, P.impBlack);
  kit.collider([-139.55, FLOOR, zc - 0.95], [-138.45, FLOOR + 1.0, zc + 0.95], "weld-table");
  kit.collider([-139.4, FLOOR, gz - 0.35], [-138.6, FLOOR + 1.7, gz + 0.35], "gas-cart");
  // floor outline
  floorRect(kit, -139.6, z0 + 0.1, -133.8, z1 - 0.1, FLOOR, P.impAmber, 0.12);
  if (curtainZ !== null) {
    for (const x of [-139.3, -134.3]) kit.box("paintedMetal", x, FLOOR + 1.25, curtainZ, 0.08, 2.5, 0.08, { color: P.impBlack, texel: 2 });
    kit.box("paintedMetal", -136.8, FLOOR + 2.46, curtainZ, 4.92, 0.08, 0.08, { color: P.impBlack, texel: 2 });
    kit.box("paintedMetal", -136.8, FLOOR + 0.08, curtainZ, 4.92, 0.16, 0.12, { color: P.impDark, texel: 2 });
    // three hanging curtain strips (dark red, matte) with narrow gaps
    for (let i = 0; i < 3; i++) kit.box("painted", -138.55 + i * 1.75, FLOOR + 1.3, curtainZ, 1.55, 2.2, 0.03, { color: 0x6a2016, uv: "keep" });
    kit.collider([-139.4, FLOOR, curtainZ - 0.1], [-134.2, FLOOR + 2.5, curtainZ + 0.1], "weld-curtain");
  }
}

// Low panel-transport dolly (7.6 × 3.6 m) carrying a second wing panel flat; parked under the crane hook.
function panelDolly(kit, P, cx, cz) {
  const pl = new Placer(kit, [cx, FLOOR, cz], 0);
  for (const sz of [-1, 1]) pl.box("paintedMetal", 0, 0.55, sz * 1.6, 7.4, 0.3, 0.25, { color: P.impDark, texel: 1 });
  for (const x of [-3.3, 0, 3.3]) pl.box("paintedMetal", x, 0.55, 0, 0.25, 0.3, 3.45, { color: P.impDark, texel: 1 });
  for (const sx of [-1, 0, 1])
    for (const sz of [-1, 1]) {
      pl.cyl("paintedMetal", sx * 3.0, 0.25, sz * 1.75, 0.25, 0.2, "x", { color: P.impBlack, segments: 14 });
      pl.box("paintedMetal", sx * 3.0, 0.45, sz * 1.75, 0.3, 0.2, 0.3, { color: P.impBlack, texel: 2 });
    }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pl.box("hazard", sx * 3.6, 0.71, sz * 1.6, 0.4, 0.04, 0.29, { texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pl.box("paintedMetal", sx * 2.0, 0.74, sz * 1.6, 0.5, 0.08, 0.3, { color: P.impBlack, texel: 2 });
  hexPanel(pl, P, { r: 3.5, thick: 0.16, at: [0, 0.86, 0], rot: [0, 0, 0] });
  // tow bar + amber lamp post at the +x end
  pl.box("paintedMetal", 4.1, 0.5, 0, 0.9, 0.08, 0.12, { color: P.impMid, texel: 2 });
  pl.box("paintedMetal", 3.6, 1.0, 1.55, 0.06, 0.9, 0.06, { color: P.impBlack, texel: 2 });
  pl.cyl("emitAmber", 3.6, 1.5, 1.55, 0.06, 0.1, "y", { segments: 8 });
  pl.collider([-3.8, 0, -1.9], [4.5, 1.1, 1.9], "panel-dolly");
}

// Two-tier bin trolley with coloured open bins. Local: handle at +z.
function binCart(pl, P, rand) {
  pl.box("paintedMetal", 0, 0.12, 0, 1.2, 0.06, 0.7, { color: P.impDark, texel: 2 });
  pl.box("paintedMetal", 0, 0.62, 0, 1.2, 0.06, 0.7, { color: P.impDark, texel: 2 });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      pl.box("paintedMetal", sx * 0.56, 0.5, sz * 0.31, 0.05, 1.0, 0.05, { color: P.impBlack, texel: 2 });
      pl.cyl("paintedMetal", sx * 0.5, 0.06, sz * 0.25, 0.06, 0.05, "x", { color: P.impBlack, segments: 8 });
    }
  pl.box("metal", 0, 1.02, 0.34, 1.2, 0.03, 0.03, { color: P.impGrey });
  const cols = [P.impBlue, P.impAmber, P.impMid, P.impRed, P.impGrey];
  for (const y of [0.15, 0.65])
    for (let i = 0; i < 3; i++) {
      if (rand() < 0.15) continue;
      pl.box("paintedMetal", -0.38 + i * 0.38, y + 0.13, 0, 0.34, 0.26, 0.6, { color: cols[Math.floor(rand() * cols.length)], texel: 2 });
    }
  pl.collider([-0.65, 0, -0.4], [0.65, 1.1, 0.4], "bin-cart");
}

// Wall-mounted emergency cabinet (red) with a hazard base plate. Local: faces -z.
function emergencyCabinet(pl, P) {
  pl.box("paintedMetal", 0, 1.3, 0.16, 0.9, 1.2, 0.3, { color: P.impRed, texel: 1.5 });
  pl.box("paintedMetal", 0, 1.3, -0.005, 0.7, 0.9, 0.02, { color: P.impWhite, texel: 1.5 });
  pl.box("emitRedImp", 0, 1.98, -0.005, 0.5, 0.06, 0.02);
  pl.box("hazard", 0, 0.008, 0.2, 1.3, 0.012, 0.8, { texel: 2 });
  pl.collider([-0.45, 0, 0], [0.45, 2.0, 0.32], "cabinet");
}

export default {
  id: "d4-repair-bay",
  name: "Maintenance & Repair Bay",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: null,
  spawn: { pos: [-110, FLOOR, 120], yaw: 0 },
  apertures: [],
  views: {
    "d4-repair-bay-door": { pos: [-82.5, FLOOR, 120], yaw: 90, pitch: 4 },
    "d4-repair-bay-jacks": { pos: [-100, FLOOR, 112], yaw: 39, pitch: 8 },
    "d4-repair-bay-welding": { pos: [-133.5, FLOOR, 111.5], yaw: 16, pitch: 3, time: 39.5 },
    "d4-repair-bay-benches": { pos: [-106, FLOOR, 161], yaw: 146, pitch: 3 },
  },
  materials(shared) {
    return {
      weldArc: new THREE.MeshStandardMaterial({ color: 0x203040, emissive: new THREE.Color("#d8ecff"), emissiveIntensity: 4, roughness: 0.4, metalness: 0 }),
    };
  },
  build(ctx) {
    const { kit, PALETTE: P } = ctx;
    const rand = rng(ctx.seed + 4099);
    buildShell(ctx, {
      bounds: B,
      doors: DOORS,
      seed: 53,
      floor: { color: P.impMid, plate: 5 },
      services: { v: 4.6 },
      ceiling: { beamAxis: "x", beamSpacing: 10, fixtureRows: 2, fixturesPerRow: 6, fixtureLen: 6, fixtureW: 0.9, floodMat: "emitCoolSoft" },
    });

    // ---- inbound lane from the bay door (amber edges, white centre dashes, hold line)
    floorMark(kit, -81.4, 113.5, -128, 113.7, FLOOR, P.impAmber);
    floorMark(kit, -81.4, 126.3, -128, 126.5, FLOOR, P.impAmber);
    floorDashes(kit, -82, 120, -127, 120, FLOOR, P.impWhite, { w: 0.2, dash: 1.5, gapLen: 1.0 });
    floorMark(kit, -128.3, 113.5, -127.9, 126.5, FLOOR, P.impWhite, { h: 0.017 });

    // ---- repair stands + diagnostic gantry cabled to the panel hub
    repairStand(kit, P, STAND_A[0], STAND_A[1], "panel");
    repairStand(kit, P, STAND_B[0], STAND_B[1], "spar");
    diagGantry(kit, P, -106.9, 96, [STAND_A[0] + 0.19, FLOOR + PANEL_Y, STAND_A[1]]);
    // second wing panel on a transport dolly parked under the crane hook, south of the lane
    panelDolly(kit, P, -111.9, 131);
    floorRect(kit, -116.2, 128.7, -106.8, 133.3, FLOOR, P.impWhite, 0.12);
    // tool crib between stand A and the lane: two racks back to back + chests, facing the stand
    partsRack(new Placer(kit, [-115.5, FLOOR, 106.6], 0), P, rand, { w: 3.0, h: 2.4, tiers: 3, d: 0.8 });
    partsRack(new Placer(kit, [-112.3, FLOOR, 106.6], 0), P, rand, { w: 3.0, h: 2.4, tiers: 3, d: 0.8 });
    partsRack(new Placer(kit, [-113.9, FLOOR, 107.5], 180), P, rand, { w: 3.0, h: 2.4, tiers: 3, d: 0.8 });
    toolChest(new Placer(kit, [-109.9, FLOOR, 106.3], 90), P);
    toolChest(new Placer(kit, [-117.9, FLOOR, 106.3], -90), P);
    // floor consoles on the aisle side of stand B + bin carts + component crates
    consoleUnit(new Placer(kit, [-106.5, FLOOR, 141.5], -90), P, { w: 1.8, screens: ["screenImp0", "screenImp1"], indicators: 2 });
    consoleUnit(new Placer(kit, [-106.5, FLOOR, 146.5], -90), P, { w: 1.6, screens: ["screenImp1"], indicators: 1 });
    binCart(new Placer(kit, [-105.6, FLOOR, 150.2], 20), P, rand);
    binCart(new Placer(kit, [-121.5, FLOOR, 150.8], -15), P, rand);
    binCart(new Placer(kit, [-131.2, FLOOR, 92.0], 95), P, rand);
    binCart(new Placer(kit, [-101.0, FLOOR, 100.5], 70), P, rand);
    for (const [x, z, c] of [[-121.2, 153.6, P.impMid], [-122.6, 153.6, P.impGrey], [-121.2, 155.0, P.impDark]]) crateKit(new Placer(kit, [x, FLOOR, z], 0), P, { color: c });
    crateKit(new Placer(kit, [-121.9, FLOOR + 1.2, 154.3], 8), P, { color: P.impMid });
    kit.collider([-123.3, FLOOR, 152.9], [-120.5, FLOOR + 2.4, 155.7], "crates");
    statusPost(kit, P, -108.6, FLOOR, 138.5);
    statusPost(kit, P, -108.6, FLOOR, 90.0);

    // ---- welding stalls on the west wall (two pilaster gaps, each split by a curtain)
    weldStall(kit, P, rand, 83.2, 88.6, { curtainZ: 88.75 });
    weldStall(kit, P, rand, 88.9, 94.3);
    weldStall(kit, P, rand, LIVE_STALL.z0, LIVE_STALL.z1, { live: true, curtainZ: 101.25 });
    weldStall(kit, P, rand, 101.4, 106.8);
    // hot-work keep-clear line + hatch in front of the stalls
    floorMark(kit, -133.6, 83.0, -133.4, 107.0, FLOOR, P.impWhite, { h: 0.016 });
    for (let z = 83.6; z < 106.6; z += 2.4) floorMark(kit, -133.3, z, -133.0, z + 1.2, FLOOR, P.impAmber, { h: 0.011 });

    // ---- west wall: status boards + terminals flanking the pilaster at z 120, bin racks aft
    for (const zc of [116.2, 123.8]) {
      wallScreen(new Placer(kit, [-140 + WALL_T + 0.12, FLOOR, zc], -90), P, { w: 3.0, h: 1.5, y: 2.6, mat: zc < 120 ? "screenImp0" : "screenImp1" });
      consoleUnit(new Placer(kit, [-138.9, FLOOR, zc - 1.0], -90), P, { w: 1.6, screens: [zc < 120 ? "screenImp1" : "screenImp0"], indicators: 2 });
      consoleUnit(new Placer(kit, [-138.9, FLOOR, zc + 1.0], -90), P, { w: 1.6, screens: [zc < 120 ? "screenImp0" : "screenImp1"], indicators: 1 });
    }
    const westRack = (zc, w = 3.0, h = 2.8) => partsRack(new Placer(kit, [-139.32, FLOOR, zc], -90), P, rand, { w, h, tiers: 4, d: 0.8 });
    westRack(109.6);
    westRack(129.0);
    for (const zc of [134.5, 137.9, 141.3, 147.0, 150.4, 153.8, 159.5, 162.9]) westRack(zc);
    toolChest(new Placer(kit, [-139.2, FLOOR, 143.8], -90), P);
    toolChest(new Placer(kit, [-139.2, FLOOR, 156.3], -90), P);
    // loose bins in the aft-west corner
    {
      const pl = new Placer(kit, [-139.3, FLOOR, 167.0], -90);
      const cols = [P.impBlue, P.impAmber, P.impGrey, P.impMid];
      for (let i = 0; i < 6; i++) pl.box("paintedMetal", -1.0 + (i % 3) * 0.7, 0.2 + Math.floor(i / 3) * 0.42, 0, 0.6, 0.38, 0.8, { color: cols[i % 4], texel: 2 });
      pl.collider([-1.4, 0, -0.45], [1.4, 1.0, 0.45], "bins");
    }

    // ---- fwd wall: bin racks either side of the shuttle-bay door, crate stack + chests east of it
    const fwdRack = (xc) => partsRack(new Placer(kit, [xc, FLOOR, 70 + WALL_T + 0.12 + 0.4], 180), P, rand, { w: 3.0, h: 2.6, tiers: 4, d: 0.8 });
    for (const xc of [-137.8, -134.4, -131.0, -126.0, -122.6, -119.2, -90.0, -86.6]) fwdRack(xc);
    for (let i = 0; i < 5; i++) crateKit(new Placer(kit, [-101.8 + (i % 3) * 1.35, FLOOR + Math.floor(i / 3) * 1.2, 71.4 + (i >= 3 ? 0.05 : 0)], i >= 3 ? 6 : 0), P, { color: [P.impMid, P.impGrey, P.impDark, P.impMid, P.impGrey][i] });
    kit.collider([-102.5, FLOOR, 70.7], [-98.4, FLOOR + 2.4, 72.1], "crate-stack");
    toolChest(new Placer(kit, [-96.5, FLOOR, 71.1], 180), P);
    toolChest(new Placer(kit, [-95.3, FLOOR, 71.1], 180), P);

    // ---- aft wall: workbenches with pegboards between the pilasters, chests, screens above
    const bench = (xc) => workbench(new Placer(kit, [xc, FLOOR, 169.27], 0), P, rand, { w: 2.4, d: 0.9 });
    for (const xc of [-126.35, -123.85, -120.05, -117.6, -102.4, -99.95, -96.1, -93.65]) bench(xc);
    for (const xc of [-122.0, -98.1, -114.3]) toolChest(new Placer(kit, [xc, FLOOR, 169.4], 0), P);
    bench(-107.6);
    for (const xc of [-125.1, -118.8, -101.2, -94.9]) wallScreen(new Placer(kit, [xc, FLOOR, 170 - WALL_T - 0.12], 0), P, { w: 1.6, h: 0.9, y: 2.9, mat: xc < -110 ? "screenImp1" : "screenImp0" });
    floorMark(kit, -128, 166.4, -92, 166.6, FLOOR, P.impWhite, { h: 0.016 });
    statusPost(kit, P, -114.0, FLOOR, 167.4);
    statusPost(kit, P, -108.0, FLOOR, 167.4);
    toolChest(new Placer(kit, [-121.6, FLOOR, 165.6], 90), P);
    binCart(new Placer(kit, [-99.2, FLOOR, 165.2], 35), P, rand);
    // parts-wash drum + stools at the bench row
    kit.cyl("paintedMetal", -104.9, FLOOR + 0.45, 168.9, 0.4, 0.9, "y", { color: P.impGrey, segments: 14 });
    kit.cyl("paintedMetal", -104.9, FLOOR + 0.93, 168.9, 0.42, 0.06, "y", { color: P.impBlack, segments: 14 });
    kit.box("hazard", -104.9, FLOOR + 0.5, 168.48, 0.5, 0.2, 0.02, { texel: 2 });
    kit.collider([-105.35, FLOOR, 168.45], [-104.45, FLOOR + 1.0, 169.35], "drum");
    for (const x of [-125.0, -100.6]) {
      kit.cyl("paintedMetal", x, FLOOR + 0.03, 167.9, 0.24, 0.06, "y", { color: P.impBlack, segments: 12 });
      kit.cyl("metal", x, FLOOR + 0.35, 167.9, 0.03, 0.6, "y", { color: P.impGrey, segments: 8 });
      kit.cyl("paintedMetal", x, FLOOR + 0.68, 167.9, 0.18, 0.06, "y", { color: P.impDark, segments: 12 });
    }

    // ---- east wall: door-side terminals + screens, emergency cabinets
    consoleUnit(new Placer(kit, [-81.0, FLOOR, 109.6], 90), P, { w: 1.8, screens: ["screenImp0", "screenImp1"], indicators: 2 });
    consoleUnit(new Placer(kit, [-81.0, FLOOR, 130.4], 90), P, { w: 1.8, screens: ["screenImp1", "screenImp0"], indicators: 2 });
    wallScreen(new Placer(kit, [-80 - WALL_T - 0.12, FLOOR, 109.6], 90), P, { w: 2.0, h: 1.2, y: 2.3, mat: "screenImp1" });
    wallScreen(new Placer(kit, [-80 - WALL_T - 0.12, FLOOR, 130.4], 90), P, { w: 2.0, h: 1.2, y: 2.3, mat: "screenImp0" });
    emergencyCabinet(new Placer(kit, [-80 - WALL_T - 0.06 - 0.32, FLOOR, 100.5], 90), P);
    emergencyCabinet(new Placer(kit, [-80 - WALL_T - 0.06 - 0.32, FLOOR, 139.5], 90), P);
    emergencyCabinet(new Placer(kit, [-140 + WALL_T + 0.06 + 0.32, FLOOR, 80.0], -90), P);

    // ---- overhead crane: two rails along z over the stands, bridge parked between them
    craneRails(kit, P, { axis: "z", at: [-121, -107], from: 78, to: 162, y: CEIL - 3.0, ceilY: CEIL - 0.12, bridgeAt: 131, hookDrop: 8 });

    // ---- lighting: white floods, amber work pools over the stands and stalls, live arc, key spots
    const L = ctx.lights;
    for (const [x, z] of [[-125, 86], [-95, 86], [-125, 120], [-95, 120], [-125, 154], [-95, 154]]) L.push(pointLight([x, FLOOR + 10.5, z], 0xdde8ff, 230, 40, 0.55));
    L.push(pointLight([STAND_A[0], CEIL - 7, STAND_A[1]], 0xffb040, 140, 24, 0.6));
    L.push(pointLight([STAND_B[0], CEIL - 7, STAND_B[1]], 0xffb040, 140, 24, 0.6));
    L.push(pointLight([-135.5, FLOOR + 5.5, 95], 0xffb040, 70, 18, 0.5));
    const arcLight = pointLight([-138.4, FLOOR + 1.4, (LIVE_STALL.z0 + LIVE_STALL.z1) / 2 - 0.1], 0xcfe4ff, 0, 14, 0.8);
    L.push(arcLight);
    L.push(spotLight([-104, CEIL - 2.5, STAND_A[1]], [STAND_A[0], FLOOR + 3, STAND_A[1]], 0xfff1e0, 420, 40, 0.5, 0.5, 0.85));
    L.push(spotLight([-104, CEIL - 2.5, STAND_B[1]], [STAND_B[0], FLOOR + 2, STAND_B[1]], 0xfff1e0, 420, 40, 0.5, 0.5, 0.85));
    L.push(spotLight([-110, CEIL - 3, 160], [-110, FLOOR, 168], 0xe8f0ff, 300, 40, 0.6, 0.5, 0.6));

    const arcMat = ctx.materials.weldArc;
    return {
      update(dt, t) {
        // welding arc: 1.1 s bursts every 2.6 s with fast flicker, driven by t only
        const on = t % 2.6 < 1.1;
        const fl = on ? 0.55 + 0.45 * Math.abs(Math.sin(t * 41) * Math.sin(t * 29 + 0.7)) : 0;
        arcMat.emissiveIntensity = 0.2 + 6 * fl;
        arcLight.intensity = 150 * fl;
      },
      api: {},
    };
  },
};
