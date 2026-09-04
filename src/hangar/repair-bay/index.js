// d4-repair-bay — Maintenance & Repair Bay (Deck 4, port aft).
// Two portal-frame repair stands with spine hoists (trolley, chain, spreader bar), hydraulic lift jacks
// and steady rams: stand A holds a 7 m hexagonal wing panel clamped from the columns, stand B an engine
// nacelle stripped to its frames (work in progress). A rolling diagnostic gantry cabled to the panel
// hub, four welding stalls on the west wall (louvred hood lights, one live arc driven by t), grey parts
// racks and bin carts, workbenches with framed boards along the aft wall, lockers, an overhead crane,
// yellow/white markings only (hazard only at the bay door), harsh white key spots on both stands.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { buildShell, floorMark, floorRect, wallJunction, crewHatch, WALL_T, YELLOW } from "../bays-shared/shell.js";
import { bayMaterials } from "../bays-shared/materials.js";
import { Placer, consoleUnit, wallScreen, partsRack, toolChest, workbench, crateKit, lockerBank, hexPanel, hose, craneRails, handrail, stairs, stripFixture, statusPost, pointLight, spotLight } from "../bays-shared/props.js";

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
const STAND_H = 10.5; // spine height: leaves 2.4 m over the 8.1 m panel top for the hoist
const PANEL_Y = 4.6; // hub height of the hex panel above the floor
const WEST_FACE = -140 + WALL_T + 0.06; // panel surface of the west wall
const LIVE_STALL = { z0: 95.7, z1: 101.1 };
const NAC = { r: 0.9, len: 5.0, y: 2.15 }; // nacelle on stand B (centre height)

// ---------------------------------------------------------------------------
// Portal-frame repair stand: four dark columns on black bases (amber band), K-braces, top ring + spine
// with two louvred work strips, a hoist trolley on the spine with chain → spreader bar → two chains to
// the load's lugs, two hydraulic lift jacks on the centreline, a power pack outside the -x portal.
// load: "panel" (hex wing panel clamped from the ±z columns) | "nacelle" (stripped engine, steady rams).
// ---------------------------------------------------------------------------
function repairStand(kit, P, cx, cz, load) {
  const pl = new Placer(kit, [cx, FLOOR, cz], 0);
  const H = STAND_H;
  const CX = 3.0;
  const CZ = 4.5;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = sx * CX;
      const z = sz * CZ;
      pl.box("paintedMetal", x, H / 2, z, 0.5, H, 0.5, { color: P.impDark, texel: 1 });
      pl.box("paintedMetal", x, 0.3, z, 0.9, 0.6, 0.9, { color: P.impBlack, texel: 2 });
      pl.box("emitAmber", x, 0.46, z, 0.92, 0.03, 0.92);
      pl.box("paintedMetal", x - sx * 0.2, H / 2, z, 0.1, H - 1.0, 0.56, { color: P.impMid, texel: 1 }); // light flange on the inner face
      // hooded amber work lamp on the inner face
      const zi = z - sz * 0.31;
      pl.box("paintedMetal", x, H - 1.6, zi, 0.34, 0.26, 0.12, { color: P.impBlack, texel: 2 });
      pl.box("emitAmber", x, H - 1.6, zi - sz * 0.07, 0.26, 0.18, 0.02);
      pl.collider([x - 0.45, 0, z - 0.45], [x + 0.45, 3, z + 0.45], "stand-column");
      // K-brace from the column base to the top ring's centre on this side
      const dir = new THREE.Vector3(0, H - 0.8, -sz * CZ).normalize();
      const L = Math.hypot(H - 0.8, CZ);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      pl.add("paintedMetal", new THREE.BoxGeometry(0.14, L - 0.9, 0.14), x, 0.8 + (H - 0.8) / 2, z / 2, { color: P.impMid, texel: 1, quat: q });
    }
  // top ring (amber edge lights under the end beams) + spine
  for (const sx of [-1, 1]) pl.box("paintedMetal", sx * CX, H + 0.3, 0, 0.6, 0.6, 2 * CZ + 0.6, { color: P.impMid, texel: 1 });
  for (const sz of [-1, 1]) {
    pl.box("paintedMetal", 0, H + 0.3, sz * CZ, 2 * CX - 0.5, 0.6, 0.6, { color: P.impMid, texel: 1 });
    pl.box("emitAmber", 0, H - 0.01, sz * CZ, 2 * CX - 1.0, 0.02, 0.08);
  }
  pl.box("paintedMetal", 0, H + 0.3, 0, 0.5, 0.6, 2 * CZ - 0.5, { color: P.impDark, texel: 1 });
  for (const z of [-2.9, 2.9]) stripFixture(kit, P, cx, FLOOR + H - 0.02, cz + z, 1.7, "z", "emitWhite", { w: 0.22 });
  // hoist trolley under the spine: body, motor drum, lenses, chain, spreader bar, two chains to the lugs
  pl.box("paintedMetal", 0, H - 0.45, 0, 1.0, 0.9, 1.3, { color: P.impBlack, texel: 2 });
  pl.cyl("paintedMetal", 0.62, H - 0.5, 0, 0.28, 0.5, "x", { color: P.impDark, segments: 12 });
  pl.box("emitRedImp", 0, H - 0.8, -0.66, 0.24, 0.06, 0.02);
  pl.box("emitAmber", -0.51, H - 0.3, 0, 0.02, 0.06, 0.6);
  const barY = load === "panel" ? 8.9 : 6.4;
  const lugY = load === "panel" ? 7.75 : NAC.y + NAC.r + 0.2;
  pl.cyl("metal", 0, (H - 0.9 + barY) / 2, 0, 0.03, H - 0.9 - barY, "y", { color: P.impGrey, segments: 6 });
  pl.box("paintedMetal", 0, barY, 0, 0.16, 0.16, 3.0, { color: P.impDark, texel: 2 });
  for (const z of [-1.3, 1.3]) {
    pl.cyl("metal", 0, (barY + lugY) / 2, z, 0.025, barY - lugY, "y", { color: P.impGrey, segments: 6 });
    pl.box("paintedMetal", 0, lugY - 0.1, z, 0.24, 0.3, 0.12, { color: P.impMid, texel: 2 }); // lug
  }
  // hydraulic lift jacks on the centreline
  const padTop = load === "panel" ? 1.54 : 1.2;
  for (const sz of [-1, 1]) {
    const z = sz * 1.7;
    const bodyH = padTop - 0.6 - 0.16;
    pl.cyl("paintedMetal", 0, 0.08, z, 0.62, 0.16, "y", { color: P.impBlack, segments: 16 });
    pl.cyl("metal", 0, 0.16 + bodyH / 2, z, 0.34, bodyH, "y", { color: P.impGrey, segments: 16 });
    pl.cyl("emitAmber", 0, 0.16 + bodyH - 0.02, z, 0.345, 0.03, "y", { segments: 16 });
    pl.cyl("metal", 0, padTop - 0.38, z, 0.18, 0.42, "y", { color: P.impHullLight, segments: 12 });
    pl.box("paintedMetal", 0, padTop - 0.09, z, 1.6, 0.18, 1.0, { color: P.impMid, texel: 2 });
    pl.box("paintedMetal", 0, padTop + 0.02, z, 1.4, 0.06, 0.8, { color: P.impBlack, texel: 2 });
    pl.collider([-0.8, 0, z - 0.5], [0.8, padTop + 0.1, z + 0.5], "jack");
    hose(kit, "paintedMetal", pl.point(-0.5, 0.12, z), pl.point(-3.9, 0.2, -3.4), -0.12, 0.03, P.impBlack);
  }
  // hydraulic power pack outside the -x portal (dark, amber band, two lenses)
  pl.box("paintedMetal", -4.3, 0.45, -3.4, 1.0, 0.9, 1.2, { color: P.impDark, texel: 1.5 });
  pl.box("paintedMetal", -4.3, 0.96, -3.4, 0.7, 0.12, 0.9, { color: P.impBlack, texel: 2 });
  pl.cyl("metal", -4.3, 1.02, -3.75, 0.12, 0.1, "y", { color: P.impGrey, segments: 10 });
  pl.box("emitRedImp", -4.3, 0.75, -2.78, 0.08, 0.06, 0.02);
  pl.box("emitBlue", -4.15, 0.75, -2.78, 0.08, 0.06, 0.02);
  pl.box("emitAmber", -4.3, 0.2, -2.79, 0.9, 0.03, 0.01);
  pl.collider([-4.85, 0, -4.05], [-3.75, 1.1, -2.75], "power-pack");

  if (load === "panel") {
    hexPanel(pl, P, { r: 3.5, thick: 0.16, at: [0, PANEL_Y, 0] });
    // rim clamps from the ±z columns at hub height: arm, piston, jaw with a red lens
    for (const sz of [-1, 1]) {
      pl.box("paintedMetal", 0, PANEL_Y, sz * 3.9, 0.36, 0.36, 0.9, { color: P.impMid, texel: 1 });
      pl.cyl("metal", 0, PANEL_Y + 0.26, sz * 3.9, 0.1, 0.7, "z", { color: P.impGrey, segments: 10 });
      pl.box("paintedMetal", 0, PANEL_Y, sz * 3.3, 0.6, 0.9, 0.3, { color: P.impBlack, texel: 2 });
      pl.box("emitRedImp", 0.31, PANEL_Y, sz * 3.3, 0.02, 0.1, 0.1);
    }
    pl.collider([-0.5, 0, -3.6], [0.5, 8, 3.6], "wing-panel");
  } else {
    // engine nacelle on the pads: intake ring, cowl, a stripped mid-section showing the core and frames,
    // nozzle cone, an open access bay with lit innards, saddle blocks, steady rams from the ±x columns
    const y = NAC.y;
    const r = NAC.r;
    pl.cyl("paintedMetal", 0, y, -1.9, r, 1.2, "z", { color: P.impGrey, segments: 22 }); // fwd cowl
    pl.cyl("paintedMetal", 0, y, -2.55, r + 0.05, 0.14, "z", { color: P.impDark, segments: 22 }); // intake ring
    pl.cyl("emitBlue", 0, y, -2.63, r - 0.3, 0.04, "z", { segments: 22 });
    pl.cyl("paintedMetal", 0, y, 1.4, r, 1.2, "z", { color: P.impGrey, segments: 22 }); // aft cowl
    pl.cyl("paintedMetal", 0, y, 2.35, 0.62, 0.7, "z", { color: P.impDark, segments: 22, r2: r }); // nozzle cone
    pl.cyl("emitAmber", 0, y, 2.71, 0.5, 0.04, "z", { segments: 22 });
    pl.cyl("paintedMetal", 0, y, -0.25, 0.6, 2.2, "z", { color: P.impBlack, segments: 18 }); // exposed core
    for (const z of [-1.2, -0.7, -0.2, 0.3, 0.75]) pl.cyl("paintedMetal", 0, y, z, r, 0.06, "z", { color: P.impMid, segments: 22 }); // frames
    for (const a of [0.4, 1.6, 2.9, 4.2, 5.4]) {
      const ox = Math.cos(a) * 0.72;
      const oy = Math.sin(a) * 0.72;
      pl.cyl("metal", ox, y + oy, -0.25, 0.05, 2.1, "z", { color: P.impGrey, segments: 8 }); // lines along the core
    }
    for (const [a, m] of [[0.9, "emitAmber"], [2.2, "emitBlue"], [3.7, "emitAmber"]]) pl.box(m, Math.cos(a) * 0.66, y + Math.sin(a) * 0.66, -0.6, 0.06, 0.06, 0.4);
    pl.box("paintedMetal", 0, y - 0.02, 0.9, 2 * r + 0.04, 0.04, 0.1, { color: P.impBlack, texel: 2 }); // seam ring under the aft cowl
    pl.box("paintedMetal", 0, y + r + 0.06, -1.3, 0.24, 0.16, 0.16, { color: P.impMid, texel: 2 }); // lifting lugs
    pl.box("paintedMetal", 0, y + r + 0.06, 1.3, 0.24, 0.16, 0.16, { color: P.impMid, texel: 2 });
    for (const sz of [-1, 1]) pl.box("paintedMetal", 0, padTop + 0.12, sz * 1.7, 1.2, 0.24, 0.8, { color: P.impBlack, texel: 2 }); // saddles
    for (const sx of [-1, 1]) {
      // steady ram: cylinder from the column, piston, pad against the cowl
      pl.cyl("paintedMetal", sx * 2.1, y, 1.4, 0.14, 1.3, "x", { color: P.impDark, segments: 12 });
      pl.cyl("metal", sx * 1.2, y, 1.4, 0.07, 0.6, "x", { color: P.impGrey, segments: 10 });
      pl.box("paintedMetal", sx * (r + 0.05), y, 1.4, 0.1, 0.5, 0.5, { color: P.impBlack, texel: 2 });
      pl.box("emitAmber", sx * 2.75, y + 0.16, 1.4, 0.06, 0.03, 0.3);
    }
    // the removed cowl section leaning against the +x column base
    pl.box("paintedMetal", 2.55, 1.1, -1.5, 0.08, 2.2, 1.9, { color: P.impGrey, texel: 1, rot: [0, 0, -0.18] });
    pl.collider([-1.0, 0, -2.7], [1.0, 3.3, 2.75], "nacelle");
    pl.collider([2.2, 0, -2.5], [2.9, 2.3, -0.5], "cowl-section");
  }
  // floor: yellow footprint outline + white centre cross
  floorRect(kit, cx - CX - 1.2, cz - CZ - 1.2, cx + CX + 1.2, cz + CZ + 1.2, FLOOR, YELLOW, 0.15);
  floorMark(kit, cx - 1.0, cz - 0.08, cx + 1.0, cz + 0.08, FLOOR, P.impWhite, { h: 0.016 });
  floorMark(kit, cx - 0.08, cz - 1.0, cx + 0.08, cz + 1.0, FLOOR, P.impWhite, { h: 0.016 });
}

// ---------------------------------------------------------------------------
// Rolling diagnostic gantry: wheeled skids (amber band), four columns, 3.2 m deck with rails, a console
// at the panel-facing edge, a junction cabinet with a cable reel at the back, a light frame carrying a
// louvred white strip over the deck, stairs on the north end. Four dark cables droop to `hub` (world).
// ---------------------------------------------------------------------------
function diagGantry(kit, P, x0, z0, hub) {
  const pl = new Placer(kit, [x0, FLOOR, z0], 0);
  const D = 3.2;
  for (const sx of [-1, 1]) {
    pl.box("paintedMetal", sx * 1.25, 0.42, 0, 0.3, 0.3, 6.2, { color: P.impDark, texel: 1 });
    pl.box("emitAmber", sx * 1.25 + sx * 0.16, 0.42, 0, 0.01, 0.04, 5.8);
    for (const z of [-2.6, 2.6]) pl.cyl("paintedMetal", sx * 1.25, 0.22, z, 0.22, 0.24, "x", { color: P.impBlack, segments: 14 });
  }
  for (const z of [-2.0, 2.0]) pl.box("paintedMetal", 0, 0.42, z, 2.2, 0.2, 0.3, { color: P.impDark, texel: 1 });
  const colH = D + 1.2 - 0.57;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) pl.box("paintedMetal", sx * 1.25, 0.57 + colH / 2, sz * 2.95, 0.16, colH, 0.16, { color: P.impDark, texel: 2 });
  for (const sx of [-1, 1]) {
    for (const s of [-1, 1]) {
      const L = Math.hypot(D - 0.8, 5.9);
      const dir = new THREE.Vector3(0, D - 0.8, s * 5.9).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      pl.add("paintedMetal", new THREE.BoxGeometry(0.06, L - 0.3, 0.06), sx * 1.25, 0.6 + (D - 0.8) / 2, 0, { color: P.impMid, texel: 1, quat: q });
    }
  }
  // deck: dark frame, light-grey plate, amber edge light
  pl.box("paintedMetal", 0, D - 0.08, 0, 2.7, 0.16, 6.1, { color: P.impDark, texel: 1 });
  pl.box("impPanel", 0, D + 0.02, 0, 2.6, 0.04, 6.0, { color: P.impGrey, texel: 0.5 });
  pl.box("emitAmber", -1.36, D - 0.1, 0, 0.01, 0.03, 5.8);
  pl.collider([-1.45, 0, -3.1], [1.45, D + 0.2, 3.1], "gantry");
  handrail(kit, P, [x0 - 1.3, z0 - 3.0], [x0 - 1.3, z0 + 3.0], FLOOR + D, { collide: false });
  handrail(kit, P, [x0 + 1.3, z0 - 3.0], [x0 + 1.3, z0 + 3.0], FLOOR + D, { collide: false });
  handrail(kit, P, [x0 - 1.3, z0 + 3.0], [x0 + 1.3, z0 + 3.0], FLOOR + D, { collide: false });
  handrail(kit, P, [x0 - 1.3, z0 - 3.0], [x0 - 0.62, z0 - 3.0], FLOOR + D, { collide: false, postEvery: 1 });
  handrail(kit, P, [x0 + 0.62, z0 - 3.0], [x0 + 1.3, z0 - 3.0], FLOOR + D, { collide: false, postEvery: 1 });
  consoleUnit(new Placer(kit, [x0 - 0.62, FLOOR + D + 0.04, z0 + 1.2], -90), P, { w: 1.6, d: 0.7, screens: ["screenImp0", "screenImp1"], collide: false });
  // junction cabinet + cable reel at the back (south end)
  pl.box("paintedMetal", 0.5, D + 0.49, -2.4, 1.2, 0.9, 0.7, { color: P.impBlack, texel: 2 });
  pl.box("emitBlue", 0.2, D + 0.7, -2.04, 0.12, 0.04, 0.01);
  pl.box("emitRedImp", 0.5, D + 0.7, -2.04, 0.06, 0.04, 0.01);
  pl.cyl("paintedMetal", -0.6, D + 1.1, -2.4, 0.32, 0.5, "x", { color: P.impDark, segments: 14 });
  pl.cyl("paintedMetal", -0.6, D + 1.1, -2.4, 0.18, 0.56, "x", { color: P.impBlack, segments: 12 });
  pl.cyl("emitAmber", -0.6, D + 1.1, -2.4, 0.33, 0.03, "x", { segments: 14 });
  pl.box("paintedMetal", -0.6, D + 0.55, -2.4, 0.12, 1.0, 0.3, { color: P.impBlack, texel: 2 }); // reel stand
  const reel = pl.point(-0.9, D + 1.1, -2.4);
  const cables = [
    ["paintedMetal", P.impBlack, 0.06],
    ["paintedMetal", P.impDark, 0.045],
    ["paintedMetal", P.impBlack, 0.05],
    ["paintedMetal", P.impMid, 0.035],
  ];
  cables.forEach(([mat, col, r], i) => {
    hose(kit, mat, [reel[0], reel[1] + 0.1 - i * 0.05, reel[2] + (i - 1.5) * 0.12], [hub[0], hub[1] + (i - 1.5) * 0.1, hub[2] + (i - 1.5) * 0.14], 1.5 + i * 0.12, r, col, { segments: 18 });
  });
  // light frame: two masts on the east corners, top rail, arms carrying a louvred strip over the deck
  for (const sz of [-1, 1]) pl.box("paintedMetal", 1.15, D + 1.3, sz * 2.7, 0.1, 2.6, 0.1, { color: P.impBlack, texel: 2 });
  pl.box("paintedMetal", 1.15, D + 2.6, 0, 0.1, 0.1, 5.5, { color: P.impBlack, texel: 2 });
  for (const sz of [-1, 1]) pl.box("paintedMetal", 0.35, D + 2.6, sz * 1.5, 1.7, 0.08, 0.08, { color: P.impBlack, texel: 2 });
  stripFixture(kit, P, x0 - 0.4, FLOOR + D + 2.5, z0, 3.6, "z", "emitWhite", { w: 0.18 });
  stairs(new Placer(kit, [x0, FLOOR, z0 - 3.0 - 16 * 0.28], 0), P, { w: 1.2, steps: 16, rise: 0.2, run: 0.28 });
}

// ---------------------------------------------------------------------------
// Welding stall between z0..z1 against the west wall: slotted table with a workpiece and torch, a fume
// hood with a louvred amber work light and a duct up to the (raised) west tray, a framed wall screen, a
// gas cart (two grey bottles), a white floor outline. live → arc emitter at the torch tip (animated).
// curtainZ → dark welding curtain on a rail.
// ---------------------------------------------------------------------------
function weldStall(kit, P, z0, z1, opts = {}) {
  const { live = false, curtainZ = null } = opts;
  const zc = (z0 + z1) / 2;
  const tx = -139.0;
  kit.box("paintedMetal", tx, FLOOR + 0.88, zc, 1.0, 0.08, 1.8, { color: P.impGrey, texel: 1.5 });
  for (let i = 0; i < 5; i++) kit.box("paintedMetal", tx, FLOOR + 0.925, zc - 0.6 + i * 0.3, 0.9, 0.02, 0.04, { color: P.impBlack, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("paintedMetal", tx + sx * 0.42, FLOOR + 0.42, zc + sz * 0.82, 0.1, 0.84, 0.1, { color: P.impBlack, texel: 2 });
  kit.box("paintedMetal", tx, FLOOR + 0.25, zc, 0.8, 0.06, 1.6, { color: P.impDark, texel: 2 });
  kit.box("paintedMetal", tx, FLOOR + 0.36, zc + 0.3, 0.6, 0.16, 0.9, { color: P.impMid, texel: 2 });
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
  // fume hood (dark) with a louvred amber strip under it, duct up to the west tray at 4.2
  kit.boxMM("paintedMetal", [-139.45, FLOOR + 2.3, zc - 1.0], [-138.35, FLOOR + 2.7, zc + 1.0], { color: P.impDark, texel: 1 });
  kit.boxMM("paintedMetal", [-139.4, FLOOR + 2.7, zc - 0.5], [-138.6, FLOOR + 2.9, zc + 0.5], { color: P.impBlack, texel: 1 });
  stripFixture(kit, P, -138.9, FLOOR + 2.3, zc, 1.4, "z", "emitAmber", { w: 0.2 });
  kit.cyl("metal", -139.35, FLOOR + 3.55, zc, 0.18, 1.3, "y", { color: P.impGrey, segments: 12 });
  kit.cyl("paintedMetal", -139.35, FLOOR + 2.94, zc, 0.24, 0.1, "y", { color: P.impDark, segments: 12 });
  wallScreen(new Placer(kit, [WEST_FACE + 0.06, FLOOR, zc], -90), P, { w: 1.1, h: 0.7, y: 1.6, mat: live ? "screenImp1" : "screenImp0" });
  // gas cart south of the table: two grey bottles with blue / amber collars
  const gz = zc + 1.4;
  kit.box("paintedMetal", -139.0, FLOOR + 0.1, gz, 0.7, 0.08, 0.6, { color: P.impDark, texel: 2 });
  kit.box("paintedMetal", -139.36, FLOOR + 0.85, gz, 0.04, 1.5, 0.5, { color: P.impDark, texel: 2 });
  kit.box("paintedMetal", -139.0, FLOOR + 1.1, gz, 0.7, 0.04, 0.04, { color: P.impBlack, texel: 2 });
  kit.cyl("paintedMetal", -139.12, FLOOR + 0.84, gz - 0.18, 0.15, 1.4, "y", { color: P.impGrey, segments: 14 });
  kit.cyl("paintedMetal", -139.12, FLOOR + 0.84, gz + 0.18, 0.15, 1.4, "y", { color: P.impHullDark, segments: 14 });
  kit.cyl("emitBlue", -139.12, FLOOR + 1.4, gz - 0.18, 0.152, 0.03, "y", { segments: 14 });
  kit.cyl("emitAmber", -139.12, FLOOR + 1.4, gz + 0.18, 0.152, 0.03, "y", { segments: 14 });
  for (const dz of [-0.18, 0.18]) kit.cyl("metal", -139.12, FLOOR + 1.61, gz + dz, 0.05, 0.14, "y", { color: P.impGrey, segments: 8 });
  hose(kit, "paintedMetal", [-139.12, FLOOR + 1.66, gz + 0.18], [tx + 0.1, FLOOR + 0.99, zc + 0.39], 0.45, 0.02, P.impBlack);
  kit.collider([-139.55, FLOOR, zc - 0.95], [-138.45, FLOOR + 1.0, zc + 0.95], "weld-table");
  kit.collider([-139.4, FLOOR, gz - 0.35], [-138.6, FLOOR + 1.7, gz + 0.35], "gas-cart");
  floorRect(kit, -139.6, z0 + 0.1, -133.8, z1 - 0.1, FLOOR, P.impWhite, 0.12);
  if (curtainZ !== null) {
    for (const x of [-139.3, -134.3]) kit.box("paintedMetal", x, FLOOR + 1.25, curtainZ, 0.08, 2.5, 0.08, { color: P.impBlack, texel: 2 });
    kit.box("paintedMetal", -136.8, FLOOR + 2.46, curtainZ, 4.92, 0.08, 0.08, { color: P.impBlack, texel: 2 });
    kit.box("paintedMetal", -136.8, FLOOR + 0.08, curtainZ, 4.92, 0.16, 0.12, { color: P.impDark, texel: 2 });
    // three hanging dark curtain strips with narrow gaps, an amber band along the top hem
    for (let i = 0; i < 3; i++) {
      kit.box("painted", -138.55 + i * 1.75, FLOOR + 1.3, curtainZ, 1.55, 2.2, 0.03, { color: 0x2b2a2e, uv: "keep" });
      kit.box("emitAmber", -138.55 + i * 1.75, FLOOR + 2.34, curtainZ, 1.45, 0.02, 0.035);
    }
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
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pl.box("paintedMetal", sx * 3.6, 0.71, sz * 1.6, 0.4, 0.04, 0.29, { color: P.impBlack, texel: 2 });
    pl.box("emitAmber", sx * 3.6, 0.735, sz * 1.6, 0.16, 0.01, 0.16);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pl.box("paintedMetal", sx * 2.0, 0.74, sz * 1.6, 0.5, 0.08, 0.3, { color: P.impBlack, texel: 2 });
  hexPanel(pl, P, { r: 3.5, thick: 0.16, at: [0, 0.86, 0], rot: [0, 0, 0] });
  pl.box("paintedMetal", 4.1, 0.5, 0, 0.9, 0.08, 0.12, { color: P.impMid, texel: 2 }); // tow bar
  pl.box("paintedMetal", 3.6, 1.0, 1.55, 0.06, 0.9, 0.06, { color: P.impBlack, texel: 2 });
  pl.cyl("emitAmber", 3.6, 1.5, 1.55, 0.06, 0.1, "y", { segments: 8 });
  pl.collider([-3.8, 0, -1.9], [4.5, 1.1, 1.9], "panel-dolly");
}

// Two-tier bin trolley with grey / dark open bins. Local: handle at +z.
function binCart(pl, P, rand) {
  pl.box("paintedMetal", 0, 0.12, 0, 1.2, 0.06, 0.7, { color: P.impDark, texel: 2 });
  pl.box("paintedMetal", 0, 0.62, 0, 1.2, 0.06, 0.7, { color: P.impDark, texel: 2 });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      pl.box("paintedMetal", sx * 0.56, 0.5, sz * 0.31, 0.05, 1.0, 0.05, { color: P.impBlack, texel: 2 });
      pl.cyl("paintedMetal", sx * 0.5, 0.06, sz * 0.25, 0.06, 0.05, "x", { color: P.impBlack, segments: 8 });
    }
  pl.box("metal", 0, 1.02, 0.34, 1.2, 0.03, 0.03, { color: P.impGrey });
  const cols = [P.impGrey, P.impMid, P.impDark, P.impHullDark];
  for (const y of [0.15, 0.65])
    for (let i = 0; i < 3; i++) {
      if (rand() < 0.15) continue;
      pl.box("paintedMetal", -0.38 + i * 0.38, y + 0.13, 0, 0.34, 0.26, 0.6, { color: cols[Math.floor(rand() * cols.length)], texel: 2 });
    }
  pl.box("emitAmber", 0.5, 0.66, -0.36, 0.1, 0.02, 0.01);
  pl.collider([-0.65, 0, -0.4], [0.65, 1.1, 0.4], "bin-cart");
}

// Wall-mounted emergency cabinet: dark body, light-grey door plate, red lens bar. Local: faces -z.
function emergencyCabinet(pl, P) {
  pl.box("paintedMetal", 0, 1.3, 0.16, 0.9, 1.2, 0.3, { color: P.impDark, texel: 1.5 });
  pl.box("impPanel", 0, 1.25, -0.005, 0.7, 0.9, 0.02, { color: P.impGrey, uv: "keep" });
  pl.box("paintedMetal", 0.22, 1.25, -0.02, 0.03, 0.2, 0.02, { color: P.impBlack });
  pl.box("emitRedImp", 0, 1.8, -0.005, 0.5, 0.06, 0.02);
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
      ...bayMaterials(shared),
      weldArc: new THREE.MeshStandardMaterial({ color: 0x203040, emissive: new THREE.Color("#d8ecff"), emissiveIntensity: 2.4, roughness: 0.4, metalness: 0 }),
    };
  },
  build(ctx) {
    const { kit, PALETTE: P } = ctx;
    const rand = rng(ctx.seed + 4099);
    const shell = buildShell(ctx, {
      bounds: B,
      doors: DOORS,
      seed: 53,
      floor: { color: 0x3c4046, plate: 5 },
      // the west wall carries the 2.9 m fume hoods and 2.8 m bin racks: its tray runs at 4.2 m
      services: { perWall: { west: { v: 4.2 } } },
      panelsPerWall: {
        west: { stripCuts: [[82.9, 107.1], [127.4, 130.6], [133.4, 143.0], [145.6, 155.6], [158.4, 165.0], [166.1, 168.3]] },
        fwd: { stripCuts: [[-139.4, -129.4], [-127.5, -117.5], [-115.3, -113.1], [-108.1, -105.9], [-91.5, -84.9]] },
        aft: { stripCuts: [[-138.8, -133.7], [-133.3, -129.1], [-127.3, -122.2], [-120.2, -117.6], [-115.3, -112.9], [-109.3, -106.7], [-103.4, -98.3], [-96.4, -93.8], [-91.5, -86.4], [-85.6, -83.4]] },
      },
      ceiling: { beamAxis: "x", beamSpacing: 10, fixtureRows: 2, fixturesPerRow: 6, fixtureLen: 6, fixtureW: 0.9 },
    });
    const W = shell.walls;

    // ---- inbound apron from the bay door: yellow edges + end bar (no centreline), stands are marked
    floorMark(kit, -81.2, 113.4, -98, 113.6, FLOOR, YELLOW);
    floorMark(kit, -81.2, 126.4, -98, 126.6, FLOOR, YELLOW);
    floorMark(kit, -98.3, 113.4, -97.9, 126.6, FLOOR, YELLOW, { h: 0.017 });

    // ---- repair stands + diagnostic gantry cabled to the panel hub
    repairStand(kit, P, STAND_A[0], STAND_A[1], "panel");
    repairStand(kit, P, STAND_B[0], STAND_B[1], "nacelle");
    diagGantry(kit, P, -106.9, 96, [STAND_A[0] + 0.19, FLOOR + PANEL_Y, STAND_A[1]]);
    panelDolly(kit, P, -111.9, 131);
    floorRect(kit, -116.2, 128.7, -106.8, 133.3, FLOOR, P.impWhite, 0.12);
    // tool crib between stand A and the apron: racks back to back + chests
    partsRack(new Placer(kit, [-115.5, FLOOR, 106.6], 0), P, rand, { w: 3.0, h: 2.4, tiers: 3, d: 0.8 });
    partsRack(new Placer(kit, [-112.3, FLOOR, 106.6], 0), P, rand, { w: 3.0, h: 2.4, tiers: 3, d: 0.8 });
    partsRack(new Placer(kit, [-113.9, FLOOR, 107.5], 180), P, rand, { w: 3.0, h: 2.4, tiers: 3, d: 0.8 });
    toolChest(new Placer(kit, [-109.9, FLOOR, 106.3], 90), P);
    toolChest(new Placer(kit, [-117.9, FLOOR, 106.3], -90), P);
    // stand B side: terminals facing the nacelle, bin carts, component crates
    consoleUnit(new Placer(kit, [-106.5, FLOOR, 141.5], -90), P, { w: 1.8, screens: ["screenImp0", "screenImp1"] });
    consoleUnit(new Placer(kit, [-106.5, FLOOR, 146.5], -90), P, { w: 1.6, screens: ["screenImp1"] });
    binCart(new Placer(kit, [-105.6, FLOOR, 150.2], 20), P, rand);
    binCart(new Placer(kit, [-121.5, FLOOR, 150.8], -15), P, rand);
    binCart(new Placer(kit, [-131.2, FLOOR, 92.0], 95), P, rand);
    binCart(new Placer(kit, [-101.0, FLOOR, 100.5], 70), P, rand);
    for (const [x, z, c] of [[-121.2, 153.6, P.impGrey], [-122.6, 153.6, P.impMid], [-121.2, 155.0, P.impGrey]]) crateKit(new Placer(kit, [x, FLOOR, z], 0), P, { color: c });
    crateKit(new Placer(kit, [-121.9, FLOOR + 1.2, 154.3], 8), P, { color: P.impMid, h: 0.9 });
    kit.collider([-123.3, FLOOR, 152.9], [-120.5, FLOOR + 2.2, 155.7], "crates");
    statusPost(kit, P, -108.6, FLOOR, 138.5, { face: -90, lens: "emitBlue" });
    statusPost(kit, P, -108.6, FLOOR, 90.0, { face: -90, lens: "emitAmber" });

    // ---- welding stalls on the west wall (two rib gaps, each split by a curtain) + hot-work line
    weldStall(kit, P, 83.2, 88.6, { curtainZ: 88.75 });
    weldStall(kit, P, 88.9, 94.3);
    weldStall(kit, P, LIVE_STALL.z0, LIVE_STALL.z1, { live: true, curtainZ: 101.25 });
    weldStall(kit, P, 101.4, 106.8);
    floorMark(kit, -133.6, 83.0, -133.4, 107.0, FLOOR, YELLOW, { h: 0.016 });

    // ---- west wall aft of the stalls: boards + terminals flanking the rib at z 120, racks, lockers
    for (const zc of [116.2, 123.8]) {
      wallScreen(new Placer(kit, [WEST_FACE + 0.04, FLOOR, zc], -90), P, { w: 3.0, h: 1.4, y: 2.05, mat: zc < 120 ? "screenImp0" : "screenImp1" });
      consoleUnit(new Placer(kit, [-138.9, FLOOR, zc - 0.9], -90), P, { w: 1.6, screens: [zc < 120 ? "screenImp1" : "screenImp0"] });
      consoleUnit(new Placer(kit, [-138.9, FLOOR, zc + 0.9], -90), P, { w: 1.6, screens: [zc < 120 ? "screenImp0" : "screenImp1"] });
    }
    const westRack = (zc, h = 2.8) => partsRack(new Placer(kit, [WEST_FACE + 0.42, FLOOR, zc], -90), P, rand, { w: 3.0, h, tiers: 4, d: 0.8 });
    for (const zc of [129.0, 135.0, 138.4, 141.4, 147.2, 150.6, 154.0, 160.0, 163.4]) westRack(zc);
    toolChest(new Placer(kit, [-139.2, FLOOR, 155.9], -90), P);
    lockerBank(new Placer(kit, [WEST_FACE + 0.3, FLOOR, 167.2], -90), P, 4);
    emergencyCabinet(new Placer(kit, [WEST_FACE + 0.32, FLOOR, 80.0], -90), P);

    // ---- fwd wall: bin racks either side of the shuttle-bay door, lockers by the door, crates + chests
    const fwdRack = (xc) => partsRack(new Placer(kit, [xc, FLOOR, 70 + WALL_T + 0.06 + 0.42], 180), P, rand, { w: 3.0, h: 2.6, tiers: 4, d: 0.8 });
    for (const xc of [-137.8, -134.4, -131.0, -125.9, -122.5, -119.1, -89.8, -86.4]) fwdRack(xc);
    lockerBank(new Placer(kit, [-114.2, FLOOR, 70 + WALL_T + 0.06 + 0.3], 180), P, 4);
    lockerBank(new Placer(kit, [-107.0, FLOOR, 70 + WALL_T + 0.06 + 0.3], 180), P, 4);
    for (let i = 0; i < 5; i++) crateKit(new Placer(kit, [-101.8 + (i % 3) * 1.35, FLOOR + Math.floor(i / 3) * 1.2, 71.4 + (i >= 3 ? 0.05 : 0)], i >= 3 ? 6 : 0), P, { color: [P.impGrey, P.impMid, P.impGrey, P.impMid, P.impGrey][i] });
    kit.collider([-102.5, FLOOR, 70.7], [-98.4, FLOOR + 2.4, 72.1], "crate-stack");
    toolChest(new Placer(kit, [-95.9, FLOOR, 71.1], 180), P);
    toolChest(new Placer(kit, [-94.7, FLOOR, 71.1], 180), P);
    emergencyCabinet(new Placer(kit, [-82.6, FLOOR, 70 + WALL_T + 0.06 + 0.32], 180), P);

    // ---- aft wall: workbenches between the ribs (x -128/-116/-104/-92), framed boards over tool chests
    //      in the gaps, lockers in the corners, stools, a parts-wash drum
    const bench = (xc, w = 2.4) => workbench(new Placer(kit, [xc, FLOOR, 170 - WALL_T - 0.06 - 0.47], 0), P, rand, { w, d: 0.9 });
    for (const xc of [-137.5, -135.0, -126.0, -123.5, -118.9, -108.0, -102.1, -99.6, -95.1, -90.2, -87.7]) bench(xc);
    bench(-114.1, 2.2);
    for (const xc of [-121.2, -105.9, -97.35]) toolChest(new Placer(kit, [xc, FLOOR, 170 - WALL_T - 0.06 - 0.32], 0), P);
    for (const xc of [-121.2, -97.35]) wallScreen(new Placer(kit, [xc, FLOOR, 170 - WALL_T - 0.08], 0), P, { w: 1.6, h: 0.9, mat: xc < -110 ? "screenImp1" : "screenImp0" });
    lockerBank(new Placer(kit, [-131.2, FLOOR, 170 - WALL_T - 0.06 - 0.3], 0), P, 4);
    lockerBank(new Placer(kit, [-84.5, FLOOR, 170 - WALL_T - 0.06 - 0.3], 0), P, 4);
    statusPost(kit, P, -114.2, FLOOR, 166.4, { face: 0, lens: "emitBlue" });
    toolChest(new Placer(kit, [-121.6, FLOOR, 165.6], 90), P);
    binCart(new Placer(kit, [-99.2, FLOOR, 165.2], 35), P, rand);
    kit.cyl("paintedMetal", -93.3, FLOOR + 0.45, 168.4, 0.4, 0.9, "y", { color: P.impGrey, segments: 14 });
    kit.cyl("paintedMetal", -93.3, FLOOR + 0.93, 168.4, 0.42, 0.06, "y", { color: P.impBlack, segments: 14 });
    kit.cyl("paintedMetal", -93.3, FLOOR + 0.5, 168.4, 0.41, 0.06, "y", { color: P.impDark, segments: 14 });
    kit.collider([-93.75, FLOOR, 167.95], [-92.85, FLOOR + 1.0, 168.85], "drum");
    for (const x of [-125.0, -100.6]) {
      kit.cyl("paintedMetal", x, FLOOR + 0.03, 167.9, 0.24, 0.06, "y", { color: P.impBlack, segments: 12 });
      kit.cyl("metal", x, FLOOR + 0.35, 167.9, 0.03, 0.6, "y", { color: P.impGrey, segments: 8 });
      kit.cyl("paintedMetal", x, FLOOR + 0.68, 167.9, 0.18, 0.06, "y", { color: P.impDark, segments: 12 });
    }

    // ---- east wall: door-side terminals + framed boards, emergency cabinets, junctions, a crew hatch
    consoleUnit(new Placer(kit, [-81.0, FLOOR, 109.6], 90), P, { w: 1.8, screens: ["screenImp0", "screenImp1"] });
    consoleUnit(new Placer(kit, [-81.0, FLOOR, 130.4], 90), P, { w: 1.8, screens: ["screenImp1", "screenImp0"] });
    wallScreen(new Placer(kit, [-80 - WALL_T - 0.1, FLOOR, 109.6], 90), P, { w: 2.0, h: 1.2, mat: "screenImp1" });
    wallScreen(new Placer(kit, [-80 - WALL_T - 0.1, FLOOR, 130.4], 90), P, { w: 2.0, h: 1.2, mat: "screenImp0" });
    emergencyCabinet(new Placer(kit, [-80 - WALL_T - 0.06 - 0.32, FLOOR, 100.5], 90), P);
    emergencyCabinet(new Placer(kit, [-80 - WALL_T - 0.06 - 0.32, FLOOR, 139.5], 90), P);
    for (const z of [88.0, 97.5, 150.0, 162.0]) wallJunction(kit, W.east, z, P);
    crewHatch(kit, W.east, 137.5, P);
    // fwd / aft walls: a hatch and junctions in the gaps between the racks / benches
    wallJunction(kit, W.fwd, -103.2, P);
    crewHatch(kit, W.fwd, -97.4, P);
    wallJunction(kit, W.aft, -117.15, P);

    // ---- overhead crane: two rails along z over the stands, bridge parked between them
    craneRails(kit, P, { axis: "z", at: [-121, -107], from: 78, to: 162, y: CEIL - 3.0, ceilY: CEIL - 0.12, bridgeAt: 131, hookDrop: 8 });

    // ---- lighting: cool floods, harsh white key spots pooling on both stands, a bench spot, amber work
    //      points over the stands / stalls / benches, the live arc (14 descriptors)
    const L = ctx.lights;
    for (const [x, z] of [[-125, 86], [-95, 86], [-125, 120], [-95, 120], [-125, 154], [-95, 154]]) L.push(pointLight([x, FLOOR + 10.5, z], 0xdde8ff, 230, 40, 0.5));
    L.push(pointLight([STAND_A[0] - 3, FLOOR + 6, STAND_A[1] + 2], 0xffb060, 90, 18, 0.6));
    L.push(pointLight([STAND_B[0] + 3, FLOOR + 5, STAND_B[1] - 2], 0xffb060, 90, 18, 0.6));
    L.push(pointLight([-135.5, FLOOR + 5.0, 95], 0xffb060, 70, 18, 0.55));
    L.push(pointLight([-110, FLOOR + 3.5, 165], 0xffb060, 60, 16, 0.55));
    const arcLight = pointLight([-138.4, FLOOR + 1.4, (LIVE_STALL.z0 + LIVE_STALL.z1) / 2 - 0.1], 0xcfe4ff, 0, 14, 0.8);
    L.push(arcLight);
    L.push(spotLight([STAND_A[0] + 6, CEIL - 2.5, STAND_A[1]], [STAND_A[0], FLOOR + 2, STAND_A[1]], 0xf2f6ff, 900, 44, 0.42, 0.45, 0.92));
    L.push(spotLight([STAND_B[0] + 6, CEIL - 2.5, STAND_B[1]], [STAND_B[0], FLOOR + 1, STAND_B[1]], 0xf2f6ff, 900, 44, 0.42, 0.45, 0.9));
    L.push(spotLight([-110, CEIL - 3, 160], [-110, FLOOR, 168], 0xf2f6ff, 400, 40, 0.6, 0.5, 0.6));

    const arcMat = ctx.materials.weldArc;
    return {
      update(dt, t) {
        // welding arc: 1.1 s bursts every 2.6 s with fast flicker, driven by t only
        const on = t % 2.6 < 1.1;
        const fl = on ? 0.55 + 0.45 * Math.abs(Math.sin(t * 41) * Math.sin(t * 29 + 0.7)) : 0;
        arcMat.emissiveIntensity = 0.2 + 2.6 * fl;
        arcLight.intensity = 150 * fl;
      },
      api: {},
    };
  },
};
