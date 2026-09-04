// Deck 3 — Mess Hall & Galley (d3_mess). Long tables with bench seating in three columns either
// side of a central aisle that runs from the door to the serving counter; the galley behind the
// counter carries ranges with amber hotplates, food processors, sinks, a prep island, ration
// storage and a cold store. Warm-white dining light, amber over the counter, cooler galley light.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impWall, wallScreen, equipmentRack, crate, pipeRun, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect, GRATE_TILE } from "../../textures.js";
import { ensureCrewMaterials, SIGN, signRect, wallSign, messTable, floorGrime, scuffRun, wallGrime, cableTray, ventGrille, valveWheel, gauge, intercom, stool, wallShelf, propFrame } from "./crewProps.js";

/** Round pedestal table (light plate top, black rim) with four stools. */
function roundTable(kit, ctx, { x, z, seed }) {
  const rand = rng(seed);
  const h = 0.76;
  kit.cyl("paintedMetal", x, h - 0.03, z, 0.66, 0.06, "y", { color: PALETTE.impBlack, segments: 24, texel: 2 });
  kit.cyl("impPanel1", x, h + 0.008, z, 0.6, 0.016, "y", { color: PALETTE.impLight, segments: 24, uv: "scale", uvScale: [1, 1] });
  kit.cyl("metal", x, (h - 0.06) / 2, z, 0.07, h - 0.06, "y", { color: PALETTE.impMid, segments: 12 });
  kit.cyl("paintedMetal", x, 0.03, z, 0.42, 0.06, "y", { color: PALETTE.impBlack, segments: 20, texel: 2 });
  kit.collider([x - 0.66, 0, z - 0.66], [x + 0.66, h + 0.02, z + 0.66], "table");
  const a0 = rand() * Math.PI;
  for (let k = 0; k < 4; k++) {
    const a = a0 + (k * Math.PI) / 2 + (rand() - 0.5) * 0.25;
    stool(kit, x + Math.cos(a) * 1.02, z + Math.sin(a) * 1.02);
  }
  // a couple of cups and a tray
  kit.cyl("metal", x + 0.25, h + 0.06, z - 0.1, 0.04, 0.1, "y", { color: PALETTE.steel, segments: 8 });
  if (rand() < 0.7) kit.cyl("paintedMetal", x - 0.2, h + 0.06, z + 0.22, 0.04, 0.1, "y", { color: PALETTE.impRed, segments: 8, texel: 3 });
  if (rand() < 0.6) kit.box("paintedMetal", x - 0.1, h + 0.03, z - 0.25, 0.42, 0.03, 0.3, { color: PALETTE.impMid, texel: 3 });
}

/** Tray trolley: open steel cart on castors with three shelves of ration trays. */
function trayTrolley(kit, x, z, yaw, seed) {
  const rand = rng(seed);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const w = 0.9;
  const d = 0.6;
  const cylAlong = (r, len, axis) => {
    const g = new THREE.CylinderGeometry(r, r, len, 8);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else if (axis === "z") g.rotateX(Math.PI / 2);
    return g;
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add("metal", cylAlong(0.014, 1.0, "y"), sx * (w / 2 - 0.03), 0.6, sz * (d / 2 - 0.03), { color: PALETTE.steel });
    add("rubber", cylAlong(0.05, 0.03, "x"), sx * (w / 2 - 0.05), 0.05, sz * (d / 2 - 0.05), { color: PALETTE.rubber });
  }
  for (let k = 0; k < 3; k++) {
    const y = 0.12 + k * 0.42;
    add("metal", new THREE.BoxGeometry(w, 0.02, d), 0, y, 0, { color: PALETTE.gunmetal, texel: 1 });
    const n = 2 + Math.floor(rand() * 4);
    for (let t = 0; t < n; t++) add("paintedMetal", new THREE.BoxGeometry(0.42, 0.02, 0.3), -w / 2 + 0.28 + (t % 2) * 0.44 + (rand() - 0.5) * 0.04, y + 0.02 + Math.floor(t / 2) * 0.025, (rand() - 0.5) * 0.14, { color: t % 2 ? PALETTE.impMid : PALETTE.impGrey, texel: 3 });
  }
  add("metal", cylAlong(0.016, w - 0.1, "x"), 0, 1.1, -d / 2 - 0.05, { color: PALETTE.steel });
  for (const sx of [-1, 1]) add("metal", cylAlong(0.014, 0.12, "z"), sx * (w / 2 - 0.08), 1.1, -d / 2 + 0.02, { color: PALETTE.steel });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (w * c + d * s) / 2 + 0.05;
  const ez = (w * s + d * c) / 2 + 0.05;
  kit.collider([x - ex, 0, z - ez], [x + ex, 1.15, z + ez], "trolley");
}

export function buildMess(kit, ctx) {
  ensureCrewMaterials(ctx);
  const [min, max] = ctx.bounds; // x 2.9..30, y 0..4, z -30..-8
  const H = max[1];
  const rand = rng(ctx.seed + 5);
  const cols0 = [7.6, 12.6, 17.6];

  // walls in a regular band scheme instead of the procedural light/dark chequer: light plate below and
  // above a continuous grey equipment band (1.6-2.7 m) that carries the vents, screens and greebles.
  // The three walls in the fixed view are built band by band (no doors on them, so the split is safe);
  // the door wall behind the camera keeps one light paint so it matches.
  const BAND_SIDES = ["zmin", "zmax", "xmax"];
  const warmTheme = { accent: "emitAmberDim", accent2: "emitWhiteDim" };
  roomShell(kit, ctx, {
    // no white ceiling strips: the warm square fixtures own the light hierarchy
    ceiling: { lights: false, strips: false, along: "x" },
    skip: BAND_SIDES,
    walls: { rows: [0, 0.5, 1.6, 2.7, H], paints: [[PALETTE.impLight, 1]], styles: { panel: 0.8, vent: 0.1, greeble: 0.1 }, theme: warmTheme },
  });
  for (const side of BAND_SIDES) {
    const galley = side === "xmax";
    const seed = (ctx.seed + 5) * 31 + side.length * 7;
    impWall(kit, ctx, side, { noDoors: true, base: 0, height: 1.6, rows: [0, 0.5, 1.6], paints: [[PALETTE.impLight, 1]], styles: { panel: galley ? 0.75 : 0.9, vent: galley ? 0.25 : 0.1 }, theme: warmTheme, seed, tag: side + "L" });
    impWall(kit, ctx, side, { noDoors: true, base: 1.6, height: 1.1, rows: [0, 1.1], kick: false, trim: false, paints: [[PALETTE.impGrey, 1]], styles: galley ? { panel: 0.45, vent: 0.25, greeble: 0.2, conduit: 0.1 } : { panel: 0.6, vent: 0.1, greeble: 0.14, screen: 0.08, conduit: 0.08 }, theme: warmTheme, seed: seed + 1, tag: side + "M" });
    impWall(kit, ctx, side, { noDoors: true, base: 2.7, height: H - 2.7, rows: [0, H - 2.7], kick: false, trim: false, collide: false, paints: [[PALETTE.impLight, 1]], styles: { panel: 0.94, strip: 0.06 }, theme: warmTheme, seed: seed + 2, tag: side + "U" });
    // black reveal lines at the band edges so the band reads as a deliberate course, not a paint change
    const seg = wallSegment(ctx.bounds, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    for (const v of [1.6, 2.7]) frame.box("paintedMetal", length / 2, v, 0.005, length, 0.05, 0.03, { color: PALETTE.impBlack, texel: 2 });
  }

  // ------------------------------------------------------------------ lights (6)
  const warm = 0xffcf98;
  for (const [x, z] of [
    [8.6, -24.5],
    [8.6, -13.2],
    [15.6, -24.5],
    [15.6, -13.2],
  ]) ctx.light(pointLight(warm, 17, 15, [x, H - 0.7, z]));
  ctx.light(pointLight(0xffc48a, 9, 11, [20.9, 2.7, -20.0]));
  ctx.light(pointLight(0xeaf0ff, 12, 14, [26.2, H - 0.5, -19.5]));
  // warm square ceiling fixtures over the table columns (the real lights hang under these). Two of the
  // six differ: a louvred unit over the far mid column and a twin-tube unit with one tube ageing
  // amber over the near right column, so the ceiling is not six identical squares.
  for (const x of cols0) {
    for (const z of [-24.8, -13.2]) {
      kit.box("paintedMetal", x, H - 0.05, z, 2.0, 0.08, 1.4, { color: PALETTE.impDark, texel: 2 });
      if (x === 12.6 && z === -13.2) {
        kit.box("emitWarmSoft", x, H - 0.095, z, 1.8, 0.02, 1.2, { uv: "keep" });
        for (let k = 0; k < 7; k++) kit.box("paintedMetal", x - 0.75 + k * 0.25, H - 0.115, z, 0.05, 0.03, 1.28, { color: PALETTE.impBlack, texel: 2 });
        kit.box("paintedMetal", x, H - 0.115, z, 1.7, 0.03, 0.05, { color: PALETTE.impBlack, texel: 2 });
      } else if (x === 17.6 && z === -24.8) {
        kit.box("paintedMetal", x, H - 0.09, z, 1.8, 0.02, 1.2, { color: PALETTE.impBlack, texel: 2 });
        kit.cyl("emitWarmSoft", x, H - 0.15, z - 0.3, 0.05, 1.6, "x", { segments: 12, uv: "keep" });
        kit.cyl("emitAmberDim", x, H - 0.15, z + 0.3, 0.05, 1.6, "x", { segments: 12, uv: "keep" });
        for (const s of [-1, 1]) for (const e of [-1, 1]) kit.box("metal", x + e * 0.84, H - 0.15, z + s * 0.3, 0.08, 0.12, 0.12, { color: PALETTE.gunmetal });
      } else {
        kit.box("emitWarmSoft", x, H - 0.095, z, 1.8, 0.02, 1.2, { uv: "keep" });
        for (const s of [-1, 1]) kit.box("paintedMetal", x + s * 0.6, H - 0.1, z, 0.04, 0.03, 1.3, { color: PALETTE.impBlack, texel: 2 });
      }
    }
  }

  // ------------------------------------------------------------------ dining tables
  // near column (by the door) turned 90° so the first thing seen is bench ends, not a wall of
  // identical slabs; two mid-column slots are round four-stool tables; bench fabric alternates by column
  const cols = cols0;
  const rows = [-28.3, -25.0, -21.7, -16.3, -13.0, -9.9];
  // seat cushions in two issue fabrics well above the bench's dark frame (impMid/impDark pads read
  // as part of the plank): warm tan on the outer columns, slate on the middle one
  const TAN = new THREE.Color("#8c7b5c");
  const SLATE = new THREE.Color("#6a7488");
  let ti = 0;
  for (const z of [-27.4, -23.4, -14.7, -10.6]) {
    ti++;
    messTable(kit, ctx, { x: cols[0], z, yaw: Math.PI / 2, seed: ctx.seed * 3 + ti, props: ti % 3 !== 0, fabric: TAN });
  }
  for (const z of rows) {
    for (const x of cols.slice(1)) {
      ti++;
      // one slot left empty for the tray-return station
      if (x === 17.6 && z === -9.9) continue;
      if (x === 12.6 && (z === -25.0 || z === -13.0)) {
        roundTable(kit, ctx, { x, z, seed: ctx.seed * 3 + ti });
        continue;
      }
      messTable(kit, ctx, { x, z, seed: ctx.seed * 3 + ti, props: ti % 4 !== 0, fabric: x === 12.6 ? SLATE : TAN });
    }
  }
  // tray trolley parked at the side of the cross-aisle, loaded: a steel urn, a jug, cup stacks, a red
  // ration crate and a cutlery bin on the top shelf (it read as an empty frame from the door)
  trayTrolley(kit, 15.1, -20.1, 0.18, ctx.seed + 8);
  {
    const T = propFrame(kit, 15.1, -20.1, 0.18);
    const ty = 0.97;
    T.cyl("metal", -0.25, ty + 0.19, 0.05, 0.13, 0.38, "y", { color: PALETTE.steel, segments: 14 });
    T.cyl("paintedMetal", -0.25, ty + 0.4, 0.05, 0.14, 0.04, "y", { color: PALETTE.impBlack, segments: 14, texel: 2 });
    T.cyl("metal", -0.25, ty + 0.12, -0.12, 0.012, 0.1, "z", { color: PALETTE.gunmetal, segments: 6 });
    T.box("emitAmber", -0.25, ty + 0.3, -0.135, 0.05, 0.03, 0.01);
    T.cyl("metal", 0.06, ty + 0.1, -0.14, 0.06, 0.2, "y", { color: PALETTE.steel, segments: 12 });
    for (let k = 0; k < 2; k++) T.cyl("paintedMetal", 0.08 + k * 0.11, ty + 0.06, 0.16, 0.04, 0.12, "y", { color: k ? PALETTE.impMid : PALETTE.impWhite, segments: 10, texel: 3 });
    T.box("paintedMetal", 0.3, ty + 0.09, 0.0, 0.26, 0.18, 0.34, { color: PALETTE.impRed, texel: 2 });
    T.box("paintedMetal", 0.3, ty + 0.19, 0.0, 0.2, 0.01, 0.28, { color: PALETTE.impBlack, texel: 2 });
    T.box("paintedMetal", -0.05, ty + 0.06, 0.18, 0.2, 0.12, 0.14, { color: PALETTE.impDark, texel: 2 });
    for (let k = 0; k < 5; k++) T.cyl("metal", -0.12 + k * 0.035, ty + 0.16, 0.18 + (k % 2) * 0.03, 0.006, 0.18, "y", { color: PALETTE.steel, segments: 5 });
  }
  // tray-return station in the empty slot: cart with tray slots, waste bin, wall screen above
  {
    const x = 17.6;
    const z = -9.6;
    kit.box("paintedMetal", x, 0.5, z, 1.4, 1.0, 0.7, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("impPanel", x, 0.55, z + 0.36, 1.3, 0.8, 0.02, { color: PALETTE.impLight, uv: "keep" });
    for (let k = 0; k < 5; k++) kit.box("paintedMetal", x, 0.25 + k * 0.15, z + 0.37, 1.2, 0.012, 0.03, { color: PALETTE.impBlack, texel: 2 });
    kit.box("metal", x, 1.02, z, 1.44, 0.04, 0.74, { color: PALETTE.steel, texel: 1 });
    for (let k = 0; k < 6; k++) kit.box("paintedMetal", x - 0.55 + k * 0.22, 1.1, z, 0.02, 0.12, 0.6, { color: PALETTE.impMid, texel: 2 });
    kit.box("emitAmber", x, 0.9, z + 0.375, 0.6, 0.03, 0.01);
    kit.collider([x - 0.72, 0, z - 0.37], [x + 0.72, 1.12, z + 0.4], "trayreturn");
    // waste bin
    kit.cyl("paintedMetal", x + 1.1, 0.4, z, 0.26, 0.8, "y", { color: PALETTE.impMid, segments: 14, texel: 2 });
    kit.cyl("paintedMetal", x + 1.1, 0.82, z, 0.28, 0.06, "y", { color: PALETTE.impBlack, segments: 14, texel: 2 });
    kit.box("hazard", x + 1.1, 0.5, z + 0.265, 0.3, 0.06, 0.01, { texel: 3 });
    kit.collider([x + 0.82, 0, z - 0.28], [x + 1.38, 0.9, z + 0.28], "bin");
  }

  // ------------------------------------------------------------------ serving counter (x ≈ 21.5)
  const cx0 = 21.0;
  const cx1 = 21.9;
  const cz0 = -28.8;
  const cz1 = -11.2;
  const cH = 0.92;
  kit.boxMM("paintedMetal", [cx0, 0, cz0], [cx1, cH, cz1], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("paintedMetal", [cx0 - 0.03, 0, cz0 - 0.03], [cx1 + 0.03, 0.1, cz1 + 0.03], { color: PALETTE.impBlack, texel: 2 });
  // dining-side front panels with seams, toe-kick amber strip, tray rail
  for (let z = cz0; z < cz1 - 0.05; z += 1.6) {
    const w = Math.min(1.6, cz1 - z) - 0.04;
    kit.box("impPanel", cx0 - 0.012, 0.52, z + w / 2 + 0.02, 0.024, 0.72, w, { color: PALETTE.impLight, uv: "keep" });
  }
  kit.boxMM("emitAmber", [cx0 - 0.02, 0.11, cz0 + 0.2], [cx0 - 0.005, 0.135, cz1 - 0.2]);
  for (const y of [0.98, 0.9]) kit.cyl("metal", cx0 - 0.22, y, (cz0 + cz1) / 2, 0.018, cz1 - cz0 - 0.4, "z", { color: PALETTE.steel, segments: 8 });
  for (let z = cz0 + 0.4; z < cz1 - 0.3; z += 2.2) {
    kit.box("metal", cx0 - 0.12, 0.94, z, 0.22, 0.03, 0.04, { color: PALETTE.gunmetal });
    kit.box("metal", cx0 - 0.22, 0.94, z, 0.03, 0.12, 0.04, { color: PALETTE.gunmetal });
  }
  // steel top with a raised back lip
  kit.boxMM("metal", [cx0 - 0.1, cH, cz0 - 0.05], [cx1 + 0.15, cH + 0.05, cz1 + 0.05], { color: PALETTE.steel, texel: 1 });
  kit.boxMM("metal", [cx1 + 0.05, cH + 0.05, cz0], [cx1 + 0.15, cH + 0.12, cz1], { color: PALETTE.impMid, texel: 1 });
  // heated wells (hot section) with amber rings and a glass sneeze guard
  for (let i = 0; i < 6; i++) {
    const z = -27.6 + i * 1.15;
    kit.box("darkGloss", 21.45, cH + 0.052, z, 0.6, 0.012, 0.95);
    kit.add("emitAmber", new THREE.TorusGeometry(0.22, 0.014, 8, 24), { pos: [21.45, cH + 0.06, z], rot: [Math.PI / 2, 0, 0] });
    kit.box("metal", 21.45, cH + 0.07, z, 0.5, 0.02, 0.06, { color: PALETTE.gunmetal });
  }
  for (const z of [-27.9, -21.2]) kit.cyl("metal", 20.98, cH + 0.42, z, 0.02, 0.8, "y", { color: PALETTE.steel, segments: 8 });
  kit.add("crew_glass", new THREE.PlaneGeometry(6.6, 0.55), { pos: [20.94, cH + 0.6, -24.55], rot: [0, Math.PI / 2, 0.0], uv: "keep" });
  kit.box("metal", 20.98, cH + 0.85, -24.55, 0.03, 0.03, 6.7, { color: PALETTE.steel });
  // cold section: drink towers with taps, cup stacks
  for (const z of [-19.0, -17.8, -16.6]) {
    kit.cyl("metal", 21.55, cH + 0.36, z, 0.14, 0.62, "y", { color: PALETTE.steel, segments: 14 });
    kit.cyl("paintedMetal", 21.55, cH + 0.7, z, 0.15, 0.06, "y", { color: PALETTE.impBlack, segments: 14, texel: 2 });
    kit.cyl("metal", 21.3, cH + 0.5, z, 0.02, 0.24, "x", { color: PALETTE.gunmetal, segments: 8 });
    kit.box("rubber", 21.19, cH + 0.55, z, 0.03, 0.08, 0.03, { color: PALETTE.rubber });
    kit.box(rand() < 0.5 ? "emitBlue" : "emitAmber", 21.55, cH + 0.55, z - 0.145, 0.06, 0.03, 0.01);
  }
  for (const [x, z, h] of [
    [21.35, -15.2, 0.2],
    [21.55, -15.45, 0.28],
    [21.35, -15.7, 0.16],
  ]) kit.cyl("metal", x, cH + 0.05 + h / 2, z, 0.045, h, "y", { color: PALETTE.steel, segments: 10 });
  // tray stack + rations sign, condiment bottles
  for (let k = 0; k < 8; k++) kit.box("paintedMetal", 21.5, cH + 0.07 + k * 0.03, -13.4, 0.44, 0.02, 0.32, { color: k % 2 ? PALETTE.impMid : PALETTE.impGrey, texel: 3 });
  for (let k = 0; k < 4; k++) kit.cyl("paintedMetal", 21.65, cH + 0.15, -12.4 + k * 0.18, 0.035, 0.2, "y", { color: [PALETTE.impRed, PALETTE.impAmber, PALETTE.impMid, PALETTE.impWhite][k], segments: 8, texel: 3 });
  // taller service items that show above the counter lip from the door: lidded pots on two of the hot
  // wells, a soup kettle with a ladle, a bowl stack, a bread basket, a vertical tray rack and a menu board
  for (const z of [-26.45, -24.15]) {
    kit.cyl("metal", 21.45, cH + 0.16, z, 0.19, 0.2, "y", { color: PALETTE.steel, segments: 16 });
    kit.cyl("metal", 21.45, cH + 0.275, z, 0.2, 0.03, "y", { color: PALETTE.gunmetal, segments: 16 });
    kit.cyl("metal", 21.45, cH + 0.32, z, 0.03, 0.06, "y", { color: PALETTE.impBlack, segments: 8 });
    for (const s of [-1, 1]) kit.box("metal", 21.45, cH + 0.2, z + s * 0.23, 0.06, 0.03, 0.08, { color: PALETTE.gunmetal });
  }
  kit.cyl("paintedMetal", 21.45, cH + 0.24, -22.35, 0.24, 0.36, "y", { color: PALETTE.impDark, segments: 18, texel: 2 });
  kit.cyl("metal", 21.45, cH + 0.435, -22.35, 0.25, 0.03, "y", { color: PALETTE.steel, segments: 18 });
  kit.cyl("metal", 21.55, cH + 0.62, -22.15, 0.012, 0.4, "y", { color: PALETTE.steel, segments: 6 });
  kit.box("emitAmber", 21.45, cH + 0.2, -22.1, 0.04, 0.03, 0.01);
  for (let k = 0; k < 6; k++) kit.cyl("paintedMetal", 21.5, cH + 0.075 + k * 0.045, -20.2, 0.12 - k * 0.004, 0.05, "y", { color: k % 2 ? PALETTE.impWhite : PALETTE.impLight, segments: 14, texel: 3 });
  kit.box("fabric", 21.5, cH + 0.11, -14.4, 0.5, 0.12, 0.34, { color: new THREE.Color("#8c7b5c"), texel: 3 });
  for (let k = 0; k < 5; k++) kit.cyl("paintedMetal", 21.38 + (k % 3) * 0.11, cH + 0.2, -14.5 + Math.floor(k / 3) * 0.12 + (k % 2) * 0.05, 0.05, 0.08, "z", { color: PALETTE.impAmber, segments: 8, texel: 3 });
  kit.box("paintedMetal", 21.6, cH + 0.25, -11.5, 0.4, 0.4, 0.04, { color: PALETTE.impBlack, texel: 2 });
  for (let k = 0; k < 5; k++) kit.box("paintedMetal", 21.6, cH + 0.27, -11.7 + k * 0.1, 0.34, 0.36, 0.014, { color: k % 2 ? PALETTE.impMid : PALETTE.impGrey, texel: 3 });
  {
    // A-frame menu board at the tray-return end of the counter
    const g = new THREE.PlaneGeometry(0.5, 0.125);
    g.rotateY(-Math.PI / 2);
    kit.box("paintedMetal", 21.35, cH + 0.32, -28.45, 0.03, 0.6, 0.6, { color: PALETTE.impBlack, texel: 2 });
    kit.box("darkGloss", 21.33, cH + 0.34, -28.45, 0.01, 0.5, 0.52);
    kit.add("crew_signLit", g, { pos: [21.322, cH + 0.42, -28.45], uv: "keep", uvRect: signRect(SIGN.MENU) });
    for (const s of [-1, 1]) kit.box("metal", 21.42, cH + 0.2, -28.45 + s * 0.27, 0.16, 0.02, 0.03, { color: PALETTE.gunmetal });
  }
  kit.collider([cx0 - 0.3, 0, cz0 - 0.05], [cx1 + 0.15, cH + 0.9, cz1 + 0.05], "counter");
  // staff pass at the zmax end: hazard sill and a swing gate (open)
  kit.boxMM("hazard", [cx0 - 0.1, 0.005, cz1 + 0.1], [cx1 + 0.1, 0.014, -8.4], { texel: 3 });
  kit.box("paintedMetal", 21.45, 0.5, cz1 + 0.02, 0.9, 1.0, 0.04, { color: PALETTE.impMid, texel: 2 });
  kit.box("metal", 21.45, 1.02, cz1 + 0.02, 0.9, 0.04, 0.05, { color: PALETTE.steel });
  // soffit over the counter: menu screens facing the dining hall, pendant lights along the rail
  kit.boxMM("paintedMetal", [20.4, 3.05, cz0 - 0.2], [22.7, 3.45, cz1 + 0.2], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("impPanel", [20.38, 3.05, cz0 - 0.2], [20.4, 3.45, cz1 + 0.2], { color: PALETTE.impGrey, uv: "keep" });
  for (const z of [-26.4, -20.6, -14.8]) {
    kit.box("darkGloss", 20.365, 3.25, z, 0.03, 0.34, 2.2);
    const sg = new THREE.PlaneGeometry(2.1, 0.3);
    sg.rotateY(-Math.PI / 2);
    kit.add("impScreen4", sg, { pos: [20.346, 3.25, z], uv: "keep" });
  }
  for (const z of [-17.7, -23.5]) {
    // MENU signs between the screens
    const g = new THREE.PlaneGeometry(1.5, 0.375);
    g.rotateY(-Math.PI / 2);
    kit.add("crew_signLit", g, { pos: [20.372, 3.25, z], uv: "keep", uvRect: signRect(SIGN.MENU) });
  }
  // lit GALLEY sign riding on top of the soffit, centred on the aisle and facing the door
  {
    kit.box("paintedMetal", 20.5, 3.7, -19, 0.12, 0.5, 2.0, { color: PALETTE.impBlack, texel: 2 });
    kit.box("darkGloss", 20.44, 3.7, -19, 0.02, 0.42, 1.86);
    const g = new THREE.PlaneGeometry(1.7, 0.425);
    g.rotateY(-Math.PI / 2);
    kit.add("crew_signLit", g, { pos: [20.425, 3.7, -19], uv: "keep", uvRect: signRect(SIGN.GALLEY) });
  }
  kit.boxMM("paintedMetal", [21.3, 3.0, cz0 + 0.2], [21.7, 3.06, cz1 - 0.2], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitWarmSoft", [21.38, 3.02, cz0 + 0.3], [21.62, 3.04, cz1 - 0.3], { uv: "keep" });
  for (let i = 0; i < 7; i++) {
    const z = -27.5 + i * 2.6;
    kit.cyl("metal", 20.15, 3.32, z, 0.012, 1.3, "y", { color: PALETTE.gunmetal, segments: 6 });
    kit.add("paintedMetal", new THREE.CylinderGeometry(0.06, 0.2, 0.22, 14), { pos: [20.15, 2.6, z], color: PALETTE.impBlack, uv: "scale", uvScale: [1, 1] });
    kit.cyl("emitWarmSoft", 20.15, 2.49, z, 0.16, 0.02, "y", { segments: 14, uv: "keep" });
  }

  // ------------------------------------------------------------------ galley: ranges on the xmax wall
  const gx = max[0]; // 30
  const rangeUnit = (z0, z1, seed) => {
    const r = rng(seed);
    const d = 0.85;
    kit.boxMM("paintedMetal", [gx - d, 0, z0], [gx - 0.02, 0.9, z1], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("metal", [gx - d - 0.03, 0.9, z0 - 0.02], [gx - 0.02, 0.95, z1 + 0.02], { color: PALETTE.steel, texel: 1 });
    kit.boxMM("paintedMetal", [gx - d - 0.03, 0, z0 - 0.02], [gx - 0.02, 0.1, z1 + 0.02], { color: PALETTE.impBlack, texel: 2 });
    // oven doors
    const n = Math.round((z1 - z0) / 1.1);
    for (let i = 0; i < n; i++) {
      const zc = z0 + ((i + 0.5) / n) * (z1 - z0);
      const w = (z1 - z0) / n - 0.1;
      kit.box("impPanel", gx - d - 0.012, 0.5, zc, 0.024, 0.66, w, { color: PALETTE.impGrey, uv: "keep" });
      kit.box("darkGloss", gx - d - 0.02, 0.55, zc, 0.01, 0.3, w - 0.3);
      kit.box("emitAmber", gx - d - 0.014, 0.55, zc, 0.004, 0.22, w - 0.4);
      kit.box("metal", gx - d - 0.04, 0.8, zc, 0.03, 0.03, w - 0.4, { color: PALETTE.steel });
      // knobs on a strip under the top
      for (let k = 0; k < 4; k++) kit.cyl("metal", gx - d - 0.03, 0.865, zc - w / 2 + 0.15 + k * 0.18, 0.022, 0.03, "x", { color: r() < 0.7 ? PALETTE.impBlack : PALETTE.impRed, segments: 8 });
    }
    // hotplate rings
    const rings = Math.round((z1 - z0) / 0.55);
    for (let i = 0; i < rings; i++) {
      const zc = z0 + ((i + 0.5) / rings) * (z1 - z0);
      const lit = r() < 0.7;
      kit.add("paintedMetal", new THREE.TorusGeometry(0.17, 0.02, 8, 24), { pos: [gx - d / 2, 0.955, zc], rot: [Math.PI / 2, 0, 0], color: PALETTE.impBlack, texel: 3 });
      kit.add(lit ? "emitAmber" : "rubber", new THREE.TorusGeometry(0.12, 0.014, 8, 24), { pos: [gx - d / 2, 0.955, zc], rot: [Math.PI / 2, 0, 0], color: PALETTE.rubber });
      kit.cyl("darkGloss", gx - d / 2, 0.951, zc, 0.1, 0.006, "y", { segments: 16 });
    }
    // splash back + hood + duct
    kit.boxMM("metal", [gx - 0.06, 0.95, z0], [gx - 0.02, 1.7, z1], { color: PALETTE.steel, texel: 1 });
    kit.boxMM("paintedMetal", [gx - 1.0, 2.0, z0 - 0.1], [gx - 0.02, 2.4, z1 + 0.1], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("metal", [gx - 0.98, 1.98, z0], [gx - 0.1, 2.0, z1], { color: PALETTE.gunmetal, texel: 1 });
    for (let s = 0; s < 6; s++) kit.box("metal", gx - 0.55, 1.99, z0 + 0.3 + s * ((z1 - z0 - 0.6) / 5), 0.8, 0.012, 0.03, { color: PALETTE.steel });
    kit.box("emitWhiteSoft", gx - 0.5, 1.95, (z0 + z1) / 2, 0.5, 0.06, z1 - z0 - 0.8, { uv: "keep" });
    kit.cyl("metal", gx - 0.5, (2.4 + H) / 2, (z0 + z1) / 2, 0.28, H - 2.4, "y", { color: PALETTE.impMid, segments: 16 });
    kit.collider([gx - d - 0.1, 0, z0 - 0.02], [gx, 1.0, z1 + 0.02], "range");
  };
  rangeUnit(-29.2, -26.0, ctx.seed + 11);
  rangeUnit(-25.6, -22.6, ctx.seed + 12);
  // wall-mounted utensil rail + hanging tools between the ranges and the processors
  kit.cyl("metal", gx - 0.12, 1.55, -21.9, 0.012, 1.2, "z", { color: PALETTE.steel, segments: 8 });
  for (const [dz, len] of [[-0.45, 0.3], [-0.2, 0.36], [0.1, 0.26], [0.4, 0.34]]) kit.cyl("metal", gx - 0.14, 1.55 - len / 2, -21.9 + dz, 0.012, len, "y", { color: PALETTE.gunmetal, segments: 6 });
  // food processors: tall drums with hoppers, spouts and readouts
  for (let i = 0; i < 3; i++) {
    const z = -19.6 + i * 1.5;
    const x = gx - 0.75;
    kit.cyl("impPanel1", x, 1.05, z, 0.5, 2.1, "y", { color: i === 1 ? PALETTE.impGrey : PALETTE.impLight, segments: 20, uv: "scale", uvScale: [3, 2] });
    kit.cyl("paintedMetal", x, 0.06, z, 0.56, 0.12, "y", { color: PALETTE.impBlack, segments: 20, texel: 2 });
    kit.cyl("paintedMetal", x, 2.14, z, 0.52, 0.1, "y", { color: PALETTE.impBlack, segments: 20, texel: 2 });
    kit.add("paintedMetal", new THREE.CylinderGeometry(0.42, 0.25, 0.5, 16), { pos: [x, 2.45, z], color: PALETTE.impMid, uv: "world", texel: 1 });
    kit.cyl("metal", x, (2.7 + H) / 2, z, 0.1, H - 2.7, "y", { color: PALETTE.steel, segments: 10 });
    for (const y of [0.7, 1.4]) kit.add("paintedMetal", new THREE.TorusGeometry(0.505, 0.03, 8, 24), { pos: [x, y, z], rot: [Math.PI / 2, 0, 0], color: PALETTE.impBlack, texel: 3 });
    // control face toward the room (-x)
    kit.box("darkGloss", x - 0.5, 1.5, z, 0.02, 0.26, 0.4);
    const sg = new THREE.PlaneGeometry(0.34, 0.2);
    sg.rotateY(-Math.PI / 2);
    kit.add("impScreen1", sg, { pos: [x - 0.512, 1.5, z], uv: "keep" });
    kit.box("leds", x - 0.51, 1.28, z, 0.01, 0.03, 0.3, { uv: "keep" });
    kit.box("emitGreen", x - 0.51, 1.18, z - 0.12, 0.01, 0.03, 0.03);
    kit.box(rand() < 0.5 ? "emitAmber" : "emitRed", x - 0.51, 1.18, z + 0.12, 0.01, 0.03, 0.03);
    // spout and catch tray
    kit.cyl("metal", x - 0.62, 1.0, z, 0.03, 0.3, "x", { color: PALETTE.steel, segments: 8 });
    kit.cyl("metal", x - 0.77, 0.9, z, 0.03, 0.2, "y", { color: PALETTE.steel, segments: 8 });
    kit.box("metal", x - 0.7, 0.72, z, 0.36, 0.04, 0.5, { color: PALETTE.gunmetal });
    kit.collider([x - 0.85, 0, z - 0.55], [gx, 2.7, z + 0.55], "processor");
  }
  // feed pipes from the processors along the wall to the ceiling
  pipeRun(kit, [[gx - 0.3, 2.4, -19.6], [gx - 0.3, 3.3, -19.6], [gx - 0.3, 3.3, -13.6], [gx - 0.3, H - 0.1, -13.6]], 0.07, PALETTE.impMid);
  pipeRun(kit, [[gx - 0.18, 2.4, -16.6], [gx - 0.18, 3.1, -16.6], [gx - 0.18, 3.1, -12.6]], 0.045, PALETTE.steel);
  {
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    valveWheel(kit, gx - 0.42, 3.3, -15.2, 0.12, "x", PALETTE.impRed);
    gauge(frame, 30 - 13.2, 3.0, 0.02, 0.1, "impScreen1");
    gauge(frame, 30 - 12.7, 3.0, 0.02, 0.08, "impScreen4");
    intercom(frame, 30 - 10.4, 1.5);
    // dispensers: two wall units with nozzles and cup shelves
    for (const z of [-11.6, -10.3]) {
      const u = z + 30;
      frame.box("paintedMetal", u, 1.45, 0.16, 0.7, 1.1, 0.32, { color: PALETTE.impGrey, texel: 1.5 });
      frame.box("darkGloss", u, 1.7, 0.325, 0.5, 0.3, 0.01);
      frame.box("impScreen2", u, 1.7, 0.33, 0.42, 0.22, 0.005, { uv: "keep" });
      frame.box("paintedMetal", u, 1.1, 0.34, 0.5, 0.2, 0.04, { color: PALETTE.impBlack, texel: 2 });
      frame.cylV("metal", u, 1.02, 0.28, 0.02, 0.16, { color: PALETTE.steel, segments: 8 });
      frame.box("emitBlue", u, 1.25, 0.325, 0.4, 0.02, 0.006);
      frame.collider(u - 0.36, u + 0.36, 0.9, 2.0, 0, 0.35, "dispenser");
      wallShelf(frame, u, 0.82, 0.7, 0.3);
      for (let k = 0; k < 3; k++) frame.cylV("metal", u - 0.2 + k * 0.2, 0.9, 0.15, 0.04, 0.12, { color: PALETTE.steel, segments: 10 });
    }
  }

  // ------------------------------------------------------------------ galley: sinks on the zmin wall
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    const u0 = 22.6 - min[0];
    const u1 = 28.6 - min[0];
    const cu = (u0 + u1) / 2;
    const w = u1 - u0;
    frame.box("paintedMetal", cu, 0.42, 0.34, w, 0.84, 0.68, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("metal", cu, 0.87, 0.36, w + 0.04, 0.06, 0.74, { color: PALETTE.steel, texel: 1 });
    frame.box("metal", cu, 1.25, 0.03, w, 0.7, 0.06, { color: PALETTE.steel, texel: 1 });
    for (let i = 0; i < 3; i++) {
      const bu = u0 + 0.9 + i * 1.7;
      frame.box("darkGloss", bu, 0.9, 0.36, 0.9, 0.012, 0.5);
      frame.box("metal", bu, 0.905, 0.36, 0.8, 0.006, 0.42, { color: PALETTE.impBlack, texel: 2 });
      frame.cylV("metal", bu + 0.3, 1.05, 0.12, 0.016, 0.34, { color: PALETTE.steel, segments: 8 });
      frame.cylN("metal", bu + 0.3, 1.22, 0.24, 0.016, 0.26, { color: PALETTE.steel, segments: 8 });
      frame.box("rubber", bu + 0.3, 1.26, 0.12, 0.08, 0.02, 0.03, { color: PALETTE.rubber });
    }
    // drying rack of trays + a pot
    for (let k = 0; k < 6; k++) frame.box("paintedMetal", u1 - 0.5, 1.0 + k * 0.05, 0.4 - k * 0.015, 0.5, 0.02, 0.36, { color: k % 2 ? PALETTE.impMid : PALETTE.impGrey, texel: 3 });
    frame.cylV("metal", u0 + 0.35, 1.02, 0.4, 0.16, 0.24, { color: PALETTE.steel, segments: 14 });
    // cupboard doors under the sink and pipes below
    for (let k = 0; k < 5; k++) frame.box("impPanel", u0 + 0.6 + k * 1.2, 0.42, 0.69, 1.1, 0.62, 0.02, { color: PALETTE.impGrey, uv: "keep" });
    frame.cylU("metal", cu, 0.16, 0.72, 0.035, w - 0.4, { color: PALETTE.gunmetal, segments: 8 });
    // wall grime above the sinks + a WASH stencil
    wallGrime(kit, ctx, "zmin", cu, 1.7, 3.0, 0.9);
    frame.collider(u0, u1, 0, 1.0, 0, 0.72, "sink");
    ventGrille(frame, u1 + 0.6, 0.35, 0.6, 0.3);
  }
  wallSign(kit, ctx, { side: "zmin", u: 25.6 - min[0], v: 2.35, w: 0.9, cell: SIGN.WASH, lit: false, plate: false });

  // ------------------------------------------------------------------ galley: prep island
  {
    const ix0 = 24.9;
    const ix1 = 27.1;
    const iz0 = -26.4;
    const iz1 = -21.6;
    kit.boxMM("paintedMetal", [ix0, 0, iz0], [ix1, 0.86, iz1], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("paintedMetal", [ix0 - 0.03, 0, iz0 - 0.03], [ix1 + 0.03, 0.1, iz1 + 0.03], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("metal", [ix0 - 0.06, 0.86, iz0 - 0.06], [ix1 + 0.06, 0.92, iz1 + 0.06], { color: PALETTE.steel, texel: 1 });
    for (const s of [ix0 - 0.005, ix1 + 0.005]) for (let k = 0; k < 4; k++) kit.box("impPanel", s, 0.47, iz0 + 0.6 + k * 1.2, 0.02, 0.62, 1.1, { color: PALETTE.impGrey, uv: "keep" });
    // cutting boards, knife block, bowls, a rack over the island
    kit.box("rubber", 25.6, 0.935, -25.4, 0.5, 0.03, 0.36, { color: PALETTE.rubber });
    kit.box("paintedMetal", 26.5, 0.99, -25.6, 0.2, 0.14, 0.3, { color: PALETTE.impBlack, texel: 2 });
    for (let k = 0; k < 4; k++) kit.box("metal", 26.5, 1.12, -25.7 + k * 0.07, 0.02, 0.14, 0.012, { color: PALETTE.steel });
    kit.cyl("metal", 26.0, 0.98, -23.6, 0.2, 0.12, "y", { color: PALETTE.steel, segments: 16 });
    kit.cyl("metal", 25.4, 0.97, -22.6, 0.14, 0.1, "y", { color: PALETTE.gunmetal, segments: 14 });
    kit.box("paintedMetal", 26.6, 0.95, -22.3, 0.5, 0.06, 0.4, { color: PALETTE.impMid, texel: 3 });
    // overhead pot rack hung on two rods
    kit.box("metal", (ix0 + ix1) / 2, 2.35, (iz0 + iz1) / 2, 1.2, 0.04, 3.6, { color: PALETTE.gunmetal, texel: 1 });
    for (const z of [iz0 + 0.6, iz1 - 0.6]) for (const x of [25.5, 26.5]) kit.cyl("metal", x, (2.35 + H) / 2, z, 0.012, H - 2.35, "y", { color: PALETTE.gunmetal, segments: 6 });
    for (let k = 0; k < 6; k++) {
      const z = iz0 + 0.5 + k * 0.72;
      kit.cyl("metal", 25.5 + (k % 2) * 1.0, 2.2, z, 0.1 + (k % 3) * 0.03, 0.22, "y", { color: k % 2 ? PALETTE.steel : PALETTE.gunmetal, segments: 12 });
    }
    kit.box("emitWhiteSoft", (ix0 + ix1) / 2, 2.33, (iz0 + iz1) / 2, 0.5, 0.01, 3.2, { uv: "keep" });
    kit.collider([ix0 - 0.06, 0, iz0 - 0.06], [ix1 + 0.06, 0.95, iz1 + 0.06], "island");
    // anti-slip mats + a floor drain grate
    kit.boxMM("rubber", [ix1 + 0.4, 0, iz0], [ix1 + 1.6, 0.012, iz1], { color: PALETTE.rubber, texel: 2 });
    kit.boxMM("rubber", [ix0 - 1.6, 0, iz0], [ix0 - 0.4, 0.012, iz1], { color: PALETTE.rubber, texel: 2 });
    kit.boxMM("paintedMetal", [25.4, -0.08, -19.3], [26.6, 0.0, -18.4], { color: PALETTE.impBlack, texel: 2 });
    const g = new THREE.PlaneGeometry(1.2, 0.9);
    g.rotateX(-Math.PI / 2);
    kit.add("grate", g, { pos: [26.0, 0.003, -18.85], uv: "scale", uvScale: [1.2 / GRATE_TILE[0], 0.9 / GRATE_TILE[1]] });
  }

  // ------------------------------------------------------------------ galley: storage on the zmax wall
  equipmentRack(kit, ctx, { side: "zmax", u: max[0] - 28.6, w: 1.4, h: 2.6, seed: ctx.seed + 3, lit: "emitAmber" });
  {
    // cold store door: heavy framed panel with a wheel latch and frost-blue strip
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    const u = max[0] - 26.2;
    frame.box("paintedMetal", u, 1.3, 0.1, 1.9, 2.6, 0.2, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("impPanel1", u, 1.3, 0.21, 1.5, 2.3, 0.02, { color: PALETTE.impGrey, uv: "keep" });
    frame.box("emitBlue", u, 2.5, 0.215, 1.3, 0.04, 0.01);
    frame.box("hazard", u, 0.12, 0.215, 1.5, 0.1, 0.01, { texel: 3 });
    frame.add("decal", new THREE.PlaneGeometry(0.4, 0.4), u - 0.4, 1.7, 0.222, { uv: "keep", uvRect: decalRect(8) });
    frame.collider(u - 0.95, u + 0.95, 0, 2.6, 0, 0.22, "coldstore");
    const dx = max[0] - u; // 26.2: door centre in x
    valveWheel(kit, dx + 0.45, 1.25, max[2] - 0.28, 0.14, "z", PALETTE.impMid);
    // pipes feeding the cold store: up the wall, out along the ceiling
    pipeRun(kit, [[dx + 0.5, 2.7, max[2] - 0.12], [dx + 0.5, 3.4, max[2] - 0.12], [dx + 0.5, 3.4, max[2] - 0.9], [dx + 0.5, H - 0.1, max[2] - 0.9]], 0.05, PALETTE.steel);
  }
  // ration crates stacked by the cold store, with a RATIONS stencil
  {
    const cz = -8.75;
    crate(kit, ctx, { x: 24.5, z: cz, sx: 1.1, sy: 0.8, sz: 1.1, seed: ctx.seed + 21 });
    crate(kit, ctx, { x: 24.5, y: 0.8, z: cz, sx: 0.9, sy: 0.7, sz: 0.9, yaw: 0.12, seed: ctx.seed + 22 });
    crate(kit, ctx, { x: 23.2, z: cz + 0.1, sx: 1.0, sy: 0.6, sz: 0.9, yaw: -0.08, seed: ctx.seed + 23 });
    crate(kit, ctx, { x: 25.9, z: cz - 0.7, sx: 0.8, sy: 0.5, sz: 0.8, yaw: 0.4, seed: ctx.seed + 24 });
    wallSign(kit, ctx, { side: "zmax", u: max[0] - 24.0, v: 2.1, w: 1.1, cell: SIGN.RATIONS, lit: false, plate: false });
  }
  // galley sign on the pass, and a caution decal on the range hood end
  wallSign(kit, ctx, { side: "zmax", u: max[0] - 21.45, v: 2.6, w: 1.4, cell: SIGN.GALLEY, lit: true });
  {
    const g = new THREE.PlaneGeometry(0.34, 0.34);
    g.rotateY(-Math.PI / 2);
    kit.add("decal", g, { pos: [gx - 1.005, 2.2, -25.9], uv: "keep", uvRect: decalRect(1) });
  }
  // stools at the pass (staff break spot)
  stool(kit, 22.9, -10.3);
  stool(kit, 23.6, -10.7);

  // ------------------------------------------------------------------ dining walls: screens, signs, trays, wear
  wallSign(kit, ctx, { side: "xmin", u: max[2] - (-19), v: 3.6, w: 1.8, cell: SIGN.MESS, lit: true });
  wallScreen(kit, ctx, { side: "zmin", u: 6.2 - min[0], v: 2.4, w: 1.8, h: 1.0, screen: 1 });
  wallScreen(kit, ctx, { side: "zmin", u: 12.6 - min[0], v: 2.4, w: 1.8, h: 1.0, screen: 2 });
  wallScreen(kit, ctx, { side: "zmax", u: max[0] - 12.6, v: 2.4, w: 2.6, h: 1.2, screen: 0 });
  wallScreen(kit, ctx, { side: "zmax", u: max[0] - 6.4, v: 2.4, w: 1.4, h: 0.8, screen: 4 });
  cableTray(kit, ctx, "zmin", 0.6, 17.0, 3.55);
  cableTray(kit, ctx, "zmax", 0.6, 16.5, 3.55);
  {
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    intercom(frame, max[0] - 4.2, 1.5);
    ventGrille(frame, max[0] - 9.5, 0.4, 0.8, 0.35);
    ventGrille(frame, max[0] - 15.8, 0.4, 0.8, 0.35);
  }
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    ventGrille(frame, 9.0 - min[0], 0.4, 0.8, 0.35);
    ventGrille(frame, 16.2 - min[0], 0.4, 0.8, 0.35);
    // condiment / tray shelf along the dining zmin wall
    wallShelf(frame, 4.6 - min[0], 1.1, 1.4, 0.3);
    for (let k = 0; k < 5; k++) frame.box("paintedMetal", 4.6 - min[0], 1.12 + k * 0.03, 0.15, 0.42, 0.02, 0.3, { color: k % 2 ? PALETTE.impMid : PALETTE.impGrey, texel: 3 });
    frame.collider(4.6 - min[0] - 0.7, 4.6 - min[0] + 0.7, 0.9, 1.3, 0, 0.32, "shelf");
  }
  // wear: scuffed aisle, grime in the corners and under the counter rail
  scuffRun(kit, 3.6, -19, 20.2, -19, 7, ctx.seed + 31, 1.0);
  scuffRun(kit, 21.6, -10.0, 26.6, -10.0, 3, ctx.seed + 32, 0.8);
  floorGrime(kit, 3.6, -29.3, 1.6, 1.2, 0.3);
  floorGrime(kit, 3.6, -8.7, 1.4, 1.2, -0.2);
  floorGrime(kit, 29.3, -21.6, 1.6, 2.2, 0.1);
  floorGrime(kit, 20.6, -25.0, 1.0, 6.0, 0.0);
  wallGrime(kit, ctx, "xmax", 2.4, 2.85, 3.2, 0.8); // soot over the range hoods
  wallGrime(kit, ctx, "xmax", 6.0, 2.85, 2.4, 0.7);
  wallGrime(kit, ctx, "xmin", 2.0, 0.6, 2.0, 0.9);
  // floor stencil at the door approach
  {
    const g = new THREE.PlaneGeometry(0.9, 0.9);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI / 2);
    kit.add("decal", g, { pos: [4.4, 0.005, -19], uv: "keep", uvRect: decalRect(14) });
  }
  // ambient hum from the galley machinery
  if (ctx.audioZone) ctx.audioZone({ kind: "machinery", pos: [27, 1.5, -18], radius: 8 });
}
