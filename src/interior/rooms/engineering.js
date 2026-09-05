// Engineering control (deck C): a 159-degree arc of satin-black power-distribution boards in five
// variants (gauge boards, breaker cabinets, dark failed panels, open cable-tray bays and one board with
// its door swung open on the wiring) with the amber ship-status wall at its apex, two rows of engineer
// stations facing it, a ship-status holo table in the middle of the floor, a raised supervisor platform
// beside the door, data-core racks and a plotting table, cable trays overhead whose conduit bundles drop
// into every board. Dark shell; pendant tube fittings keep the ceiling clean so the screens light the
// consoles; low fill along the wall bases; amber accent, blue-white instrument glow.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { decalRect } from "../../textures.js";
import { yawFrame, yawToward, cableTray, pipeRun, framePipe, station, chair, gauge, breakerColumn, railing, paintStrip, stencil, valveWheel, tubeFixture, wallBaseTube } from "./deckCProps.js";

const ARC_C = [18, 485.5]; // arc centre (x, z)
const ARC_R = 12.2; // front face radius of the boards
const PHI0 = 10.5; // degrees, arc start (starboard wall) .. 180 - PHI0 (port wall)
const SLOTS = 21;
const STATUS_SLOTS = [9, 10, 11];
// board variant per slot: 0 gauge board, 1 breaker cabinet, 2 dark / failed, 3 cable-tray bay, 4 open panel
const VARIANTS = { 0: 1, 1: 0, 2: 3, 3: 0, 4: 2, 5: 0, 6: 1, 7: 4, 8: 0, 12: 0, 13: 2, 14: 0, 15: 1, 16: 0, 17: 3, 18: 0, 19: 1, 20: 0 };
const HOLO = { x: 18, z: 490.6 };

const deg = (d) => (d * Math.PI) / 180;
const arcPoint = (phiDeg, r = ARC_R) => [ARC_C[0] + Math.cos(deg(phiDeg)) * r, ARC_C[1] + Math.sin(deg(phiDeg)) * r];

// Thin emissive line between two points of a frame's UV plane (ship-diagram strokes).
function stroke(f, p, q, mat, t = 0.03, n = 0.03) {
  const du = q[0] - p[0];
  const dv = q[1] - p[1];
  const len = Math.hypot(du, dv);
  f.box(mat, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, n, t, len, 0.008, { spin: Math.atan2(-du, dv), uv: "keep" });
}

const BW = 1.52;
const BH = 2.75;
const BD = 0.75;

// Cabinet body shared by every board variant: satin-black box, steel edge posts, kick with a toe light
// under a lip, conduit collar on top.
function boardBody(f, open = false) {
  f.box("satinBlack", 0, BH / 2, -BD / 2 - 0.03, BW, BH, BD - 0.06);
  for (const s of [-1, 1]) f.box("metal", s * (BW / 2 - 0.03), BH / 2, -0.03, 0.06, BH, 0.06, { color: PALETTE.steel, texel: 2 });
  f.box("metal", 0, 0.15, -0.035, BW - 0.12, 0.3, 0.05, { color: PALETTE.darkMetal, texel: 2 });
  f.box("satinBlack", 0, 0.1, 0.0, BW - 0.3, 0.02, 0.06);
  f.box("emitAmber", 0, 0.075, 0.01, BW - 0.4, 0.02, 0.01, { uv: "keep" });
  if (!open) for (const [v0, v1] of [[0.34, 1.15], [1.19, 2.05], [2.09, 2.62]]) f.box("satinBlack", 0, (v0 + v1) / 2, -0.03, BW - 0.12, v1 - v0, 0.06);
  f.box("metal", 0, BH - 0.05, -BD / 2, BW + 0.02, 0.1, BD + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  f.box("paintedMetal", 0, BH + 0.08, -BD / 2, 0.7, 0.16, 0.36, { color: PALETTE.gunmetal, texel: 2 });
}

// Variant 0: gauge board (breakers, rotary selector, amber readout, three gauges).
function gaugeBoard(f, i) {
  boardBody(f);
  breakerColumn(f, -0.46, 0.46, 4);
  breakerColumn(f, -0.26, 0.46, 4);
  f.cylN("metal", 0.18, 0.78, 0.03, 0.12, 0.06, { color: PALETTE.gunmetal, segments: 16 });
  f.box("painted", 0.18, 0.78, 0.065, 0.03, 0.16, 0.02, { color: PALETTE.orange, uv: "keep", spin: ((i * 53) % 7) * 0.4 });
  f.box("leds", 0.45, 0.48, 0.005, 0.3, 0.04, 0.01, { uv: "keep" });
  f.add("decal", new THREE.PlaneGeometry(0.28, 0.28), 0.46, 0.92, 0.003, { uv: "keep", uvRect: decalRect([5, 6, 9][i % 3]) });
  f.box("darkGloss", 0, 1.62, 0.012, 1.12, 0.62, 0.025);
  f.box("screen6", 0, 1.62, 0.026, 1.04, 0.54, 0.006, { uv: "keep" });
  f.box("leds", 0, 1.24, 0.005, 0.8, 0.045, 0.01, { uv: "keep" });
  for (const [k, u] of [-0.42, 0, 0.42].entries()) gauge(f, u, 2.35, 0.17, { needle: 0.3 + (((i * 37 + k * 11) % 10) / 10) * 0.5 });
}

// Variant 1: breaker cabinet (three tall lever columns, main isolator, two gauges, a tactical readout).
function breakerCabinet(f, i) {
  boardBody(f);
  for (const u of [-0.5, -0.27, -0.04]) breakerColumn(f, u, 0.42, 9, { step: 0.17 });
  f.box("metal", -0.27, 1.16, 0.0, 0.8, 1.72, 0.012, { color: PALETTE.darkMetal, texel: 2 });
  f.cylN("metal", 0.44, 1.15, 0.03, 0.2, 0.08, { color: PALETTE.gunmetal, segments: 18 });
  f.cylN("darkGloss", 0.44, 1.15, 0.071, 0.16, 0.004, { segments: 18 });
  f.box("painted", 0.44, 1.15, 0.09, 0.05, 0.32, 0.04, { color: PALETTE.orange, uv: "keep", spin: 0.35 + (i % 3) * 0.6 });
  f.box("leds", 0.44, 0.7, 0.005, 0.42, 0.04, 0.01, { uv: "keep" });
  f.box("emitAmber", 0.44, 0.55, 0.005, 0.1, 0.05, 0.01, { uv: "keep" });
  f.add("decal", new THREE.PlaneGeometry(0.3, 0.3), 0.44, 1.6, 0.003, { uv: "keep", uvRect: decalRect(8) });
  gauge(f, -0.4, 2.35, 0.15, { needle: 0.35 + (i % 4) * 0.1 });
  gauge(f, -0.02, 2.35, 0.15, { mat: "emitWhite", needle: 0.6 - (i % 3) * 0.1 });
  f.box("darkGloss", 0.44, 2.35, 0.012, 0.5, 0.5, 0.025);
  f.box("screen4", 0.44, 2.35, 0.026, 0.44, 0.44, 0.006, { uv: "keep" });
}

// Variant 2: dark / failed panel (dead screens, unlit gauges, a fault lamp and a lockout tag).
function failedBoard(f, i) {
  boardBody(f);
  breakerColumn(f, -0.46, 0.46, 4);
  f.box("metal", -0.26, 0.7, 0.02, 0.09, 0.6, 0.04, { color: PALETTE.darkMetal });
  f.box("painted", -0.26, 0.55, 0.06, 0.16, 0.22, 0.01, { color: PALETTE.orange, uv: "keep", spin: 0.15 });
  f.box("metal", -0.26, 0.68, 0.055, 0.02, 0.06, 0.02, { color: PALETTE.steel });
  f.box("darkGloss", 0, 1.62, 0.012, 1.12, 0.62, 0.025);
  f.box("darkGloss", 0, 1.24, 0.005, 0.8, 0.045, 0.02);
  f.box("emitRed", 0.5, 2.0, 0.008, 0.06, 0.06, 0.01, { uv: "keep" });
  f.box("leds", 0.15, 0.48, 0.005, 0.3, 0.04, 0.01, { uv: "keep" });
  for (const [k, u] of [-0.42, 0, 0.42].entries()) gauge(f, u, 2.35, 0.17, { mat: "metal", needle: k === 1 ? 0.02 : 0.0 });
  f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), 0, 1.0, 0.003, { uv: "keep", uvRect: decalRect(5) });
  f.add("decal", new THREE.PlaneGeometry(0.3, 0.3), -0.5, 1.0, 0.003, { uv: "keep", uvRect: decalRect(13) });
  void i;
}

// Variant 3: open cable-tray bay (no front: a rung ladder of trays with vertical looms and a junction box).
function cableBay(f, i) {
  f.box("satinBlack", 0, BH / 2, -BD + 0.03, BW - 0.12, BH - 0.2, 0.06);
  for (const s of [-1, 1]) f.box("metal", s * (BW / 2 - 0.05), BH / 2, -BD / 2, 0.1, BH, BD, { color: PALETTE.gunmetal, texel: 2 });
  f.box("metal", 0, 0.15, -BD / 2, BW, 0.3, BD, { color: PALETTE.darkMetal, texel: 2 });
  f.box("metal", 0, BH - 0.1, -BD / 2, BW + 0.02, 0.2, BD + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  f.box("paintedMetal", 0, BH + 0.08, -BD / 2, 0.7, 0.16, 0.36, { color: PALETTE.gunmetal, texel: 2 });
  for (let r = 0; r < 6; r++) f.box("metal", 0, 0.5 + r * 0.4, -BD + 0.2, BW - 0.3, 0.03, 0.03, { color: PALETTE.steel });
  const cols = [PALETTE.rubber, PALETTE.orange, PALETTE.steel, PALETTE.rubber, PALETTE.slate, PALETTE.rubber, PALETTE.orange];
  for (let c = 0; c < 7; c++) {
    const u = -0.54 + c * 0.18;
    const r = 0.03 + ((c + i) % 3) * 0.008;
    f.cylV("rubber", u, 1.45, -BD + 0.28, r, 2.1, { color: cols[(c + i) % cols.length], segments: 7 });
    for (const v of [0.7, 1.5, 2.3]) f.box("metal", u, v, -BD + 0.28, r * 2 + 0.03, 0.03, r * 2 + 0.03, { color: PALETTE.darkMetal });
  }
  f.box("paintedMetal", 0.3, 1.4, -BD + 0.42, 0.5, 0.36, 0.16, { color: PALETTE.darkMetal, texel: 2 });
  f.box("leds", 0.3, 1.46, -BD + 0.505, 0.36, 0.03, 0.005, { uv: "keep" });
  f.box("emitAmber", 0.18, 1.33, -BD + 0.505, 0.04, 0.04, 0.005, { uv: "keep" });
  framePipe(f, [[0.3, 1.22, -BD + 0.42], [0.3, 0.95, -BD + 0.45], [0.55, 0.6, -BD + 0.3], [0.55, 0.3, -BD + 0.3]], 0.025, { mat: "rubber", color: PALETTE.rubber, segments: 6 });
  f.add("decal", new THREE.PlaneGeometry(0.3, 0.3), 0, BH - 0.1, 0.012, { uv: "keep", uvRect: decalRect(i % 2 ? 6 : 14) });
  f.box("emitAmber", 0, 0.075, 0.01, BW - 0.4, 0.02, 0.01, { uv: "keep" });
}

// Variant 4: gauge board with its door swung open on the wiring (boards, looms, bus bars, relay bank).
function openBoard(kit, f, i) {
  boardBody(f, true);
  f.box("satinBlack", 0, (2.09 + 2.62) / 2, -0.03, BW - 0.12, 0.53, 0.06);
  for (const [k, u] of [-0.42, 0, 0.42].entries()) gauge(f, u, 2.35, 0.17, { needle: 0.3 + (((i * 37 + k * 11) % 10) / 10) * 0.5 });
  // cavity behind the door: back plate, three circuit boards, bus bars, relay grid, cable loom
  f.box("satinBlack", 0, 1.2, -BD + 0.08, BW - 0.2, 1.7, 0.04);
  for (const [k, u] of [-0.42, -0.1, 0.22].entries()) {
    f.box("darkGloss", u, 1.5, -BD + 0.15, 0.26, 0.6, 0.02);
    f.box("leds", u, 1.72, -BD + 0.165, 0.2, 0.03, 0.005, { uv: "keep" });
    f.box(k === 1 ? "emitAmber" : "emitBlue", u - 0.08, 1.3, -BD + 0.165, 0.03, 0.03, 0.005, { uv: "keep" });
    for (let c = 0; c < 4; c++) f.box("metal", u - 0.09 + c * 0.06, 1.5, -BD + 0.17, 0.03, 0.2, 0.02, { color: PALETTE.darkMetal });
  }
  for (const v of [0.55, 0.68, 0.81]) f.box("metal", -0.1, v, -BD + 0.14, 0.9, 0.05, 0.02, { color: PALETTE.brass, texel: 2 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) f.box("metal", 0.32 + c * 0.09, 0.98 + r * 0.1, -BD + 0.14, 0.07, 0.08, 0.08, { color: c % 2 ? PALETTE.darkMetal : PALETTE.slate });
  for (let c = 0; c < 5; c++) {
    const u = 0.48 + c * 0.04;
    f.cylV("rubber", u, 1.5, -BD + 0.2, 0.012, 0.9, { color: c % 2 ? PALETTE.orange : PALETTE.rubber, segments: 5 });
  }
  framePipe(f, [[0.55, 1.95, -BD + 0.2], [0.3, 2.0, -BD + 0.4], [-0.4, 1.95, -BD + 0.45], [-0.55, 1.6, -BD + 0.4]], 0.02, { mat: "rubber", color: PALETTE.rubber, segments: 6 });
  f.box("emitWarmSoft", -0.6, 1.95, -BD + 0.35, 0.06, 0.06, 0.12, { uv: "keep" });
  // the door, hinged on the left edge and swung 100 degrees into the room; its inner face carries the
  // readout that normally faces the operator
  const hinge = f.pos(-BW / 2 + 0.06, 0, 0.0);
  const yaw = Math.atan2(-f.U.z, f.U.x) - 1.75;
  const df = yawFrame(kit, hinge.x, hinge.y, hinge.z, yaw);
  const dw = BW - 0.16;
  df.box("satinBlack", dw / 2, 1.2, 0.0, dw, 1.7, 0.04);
  df.box("metal", 0.02, 1.2, 0.0, 0.05, 1.72, 0.06, { color: PALETTE.steel, texel: 2 });
  df.box("darkGloss", dw / 2, 1.42, -0.032, 1.12, 0.62, 0.025);
  df.box("screen6", dw / 2, 1.42, -0.046, 1.04, 0.54, 0.006, { uv: "keep" });
  df.box("leds", dw / 2, 1.0, -0.028, 0.8, 0.045, 0.01, { uv: "keep" });
  df.box("metal", dw - 0.1, 1.2, 0.03, 0.03, 0.2, 0.03, { color: PALETTE.steel });
  df.collider(0, dw, 0, 2.1, -0.06, 0.06, "boardDoor");
  f.add("decal", new THREE.PlaneGeometry(0.3, 0.3), 0.5, 0.45, 0.003, { uv: "keep", uvRect: decalRect(13) });
}

function board(kit, f, i) {
  const v = VARIANTS[i] ?? 0;
  if (v === 1) breakerCabinet(f, i);
  else if (v === 2) failedBoard(f, i);
  else if (v === 3) cableBay(f, i);
  else if (v === 4) openBoard(kit, f, i);
  else gaugeBoard(f, i);
  f.collider(-BW / 2, BW / 2, 0, BH + 0.2, -BD, 0.12, "board");
}

// Status wall: flat 4.8 m panel at the arc apex with three amber readouts and the ship diagram.
function statusWall(f) {
  const w = 4.8;
  const h = 3.5;
  const d = 0.6;
  f.box("satinBlack", 0, h / 2, -d / 2 - 0.03, w, h, d - 0.06);
  for (const s of [-1, 1]) f.box("metal", s * (w / 2 - 0.03), h / 2, -0.03, 0.06, h, 0.06, { color: PALETTE.steel, texel: 2 });
  f.box("metal", 0, 0.15, -0.035, w - 0.12, 0.3, 0.05, { color: PALETTE.darkMetal, texel: 2 });
  f.box("satinBlack", 0, 0.1, 0.0, w - 0.4, 0.02, 0.06);
  f.box("emitAmber", 0, 0.075, 0.01, w - 0.5, 0.02, 0.01, { uv: "keep" });
  f.box("satinBlack", 0, (0.34 + 1.42) / 2, -0.03, w - 0.12, 1.08, 0.06);
  f.box("satinBlack", 0, (1.46 + 3.4) / 2, -0.03, w - 0.12, 1.94, 0.06);
  for (const u of [-1.55, 0, 1.55]) {
    f.box("darkGloss", u, 0.92, 0.012, 1.3, 0.72, 0.025);
    f.box("screen6", u, 0.92, 0.026, 1.22, 0.64, 0.006, { uv: "keep" });
    f.box("leds", u, 0.48, 0.005, 0.9, 0.045, 0.01, { uv: "keep" });
  }
  // diagram plate
  f.box("darkGloss", 0, 2.43, 0.012, w - 0.3, 1.82, 0.025);
  f.box("emitAmber", 0, 3.28, 0.03, w - 0.6, 0.035, 0.008, { uv: "keep" });
  const apex = [0, 3.15];
  const bl = [-1.75, 1.72];
  const br = [1.75, 1.72];
  stroke(f, apex, bl, "emitAmber");
  stroke(f, apex, br, "emitAmber");
  stroke(f, bl, br, "emitAmber");
  stroke(f, [0, 3.0], [0, 1.78], "emitBlue", 0.015);
  // superstructure, tower, engines
  f.box("emitBlue", 0, 2.05, 0.03, 0.42, 0.2, 0.008, { uv: "keep" });
  f.box("emitBlue", 0, 2.2, 0.03, 0.14, 0.1, 0.008, { uv: "keep" });
  for (const u of [-0.5, 0, 0.5]) f.box("emitAmber", u, 1.66, 0.03, 0.2, 0.09, 0.008, { uv: "keep" });
  // system nodes: blue for nominal, amber for the engineering deck (reactor node ringed)
  for (const [u, v] of [[-0.35, 2.15], [0.35, 2.15], [-0.7, 1.95], [0.7, 1.95], [-1.15, 1.85], [1.15, 1.85], [0, 2.6], [0, 2.85], [-0.25, 2.45], [0.25, 2.45]]) f.box("emitBlue", u, v, 0.032, 0.06, 0.06, 0.008, { uv: "keep" });
  f.box("emitAmber", 0, 1.9, 0.032, 0.11, 0.11, 0.008, { uv: "keep" });
  f.add("emitAmber", new THREE.TorusGeometry(0.16, 0.01, 6, 24), 0, 1.9, 0.034);
  for (const [u, v] of [[-0.9, 1.78], [0.9, 1.78]]) f.box("emitAmber", u, v, 0.032, 0.08, 0.08, 0.008, { uv: "keep" });
  // side data columns
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const len = 0.25 + (((k * 7 + (s > 0 ? 3 : 0)) % 5) / 5) * 0.35;
      f.box(k % 4 === 1 ? "emitAmber" : "emitBlue", s * (2.0 - len / 2) - s * 0.05, 3.0 - k * 0.22, 0.03, len, 0.05, 0.008, { uv: "keep" });
      f.box("leds", s * 1.9, 3.0 - k * 0.22 - 0.09, 0.03, 0.4, 0.03, 0.006, { uv: "keep" });
    }
  }
  f.box("metal", 0, h - 0.05, -d / 2, w + 0.02, 0.1, d + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  for (const u of [-1.4, 0, 1.4]) f.box("paintedMetal", u, h + 0.08, -d / 2, 0.7, 0.16, 0.36, { color: PALETTE.gunmetal, texel: 2 });
  f.collider(-w / 2, w / 2, 0, h + 0.2, -d, 0.12, "statusWall");
}

// Data-core rack: black cabinet with a column of drive slots and blue-white activity leds.
function dataRack(kit, x, y, z, seed) {
  const w = 1.3;
  const h = 2.5;
  const d = 0.9;
  kit.box("satinBlack", x, y + h / 2, z + d / 2, w, h, d);
  kit.box("metal", x, y + 0.12, z + d + 0.005, w - 0.1, 0.24, 0.02, { color: PALETTE.darkMetal, texel: 2 });
  kit.box("metal", x, y + h - 0.05, z + d / 2, w + 0.02, 0.1, d + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  for (let k = 0; k < 9; k++) {
    const v = y + 0.4 + k * 0.22;
    kit.box("darkGloss", x, v, z + d + 0.012, w - 0.24, 0.16, 0.02);
    kit.box("leds", x - 0.1, v, z + d + 0.024, 0.6, 0.03, 0.004, { uv: "keep" });
    if ((k * 7 + seed) % 3 !== 0) kit.box("emitBlue", x + 0.42, v, z + d + 0.024, 0.05, 0.05, 0.004, { uv: "keep" });
  }
  kit.box("emitBlue", x, y + h - 0.16, z + d + 0.006, w - 0.4, 0.02, 0.01, { uv: "keep" });
  kit.collider([x - w / 2, y, z], [x + w / 2, y + h + 0.1, z + d + 0.05], "dataRack");
}

// Ship-status holo table: round satin-black plotting table with a slowly turning translucent wireframe
// Star Destroyer, a projection cone and status rings above it.
function holoTable(kit, ctx, x, y, z) {
  kit.cyl("metal", x, y + 0.06, z, 1.42, 0.12, "y", { color: PALETTE.darkMetal, segments: 32, texel: 1 });
  kit.cyl("satinBlack", x, y + 0.5, z, 1.28, 0.78, "y", { segments: 32 });
  kit.cyl("metal", x, y + 0.9, z, 1.34, 0.05, "y", { color: PALETTE.steel, segments: 32 });
  kit.cyl("darkGloss", x, y + 0.935, z, 1.24, 0.03, "y", { segments: 32 });
  kit.add("emitBlue", new THREE.TorusGeometry(1.08, 0.014, 6, 48).rotateX(Math.PI / 2), { pos: [x, y + 0.955, z] });
  kit.add("emitAmber", new THREE.TorusGeometry(0.3, 0.012, 6, 32).rotateX(Math.PI / 2), { pos: [x, y + 0.955, z] });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    kit.box(k % 4 === 0 ? "emitAmber" : "emitBlue", x + Math.cos(a) * 1.3, y + 0.7, z + Math.sin(a) * 1.3, 0.04, 0.05, 0.04);
  }
  for (const a of [0.5, 2.6, 4.7]) {
    const f = yawFrame(kit, x + Math.sin(a) * 1.28, y, z + Math.cos(a) * 1.28, a);
    f.box("darkGloss", 0, 0.62, 0.005, 0.7, 0.16, 0.02);
    f.box("leds", 0, 0.62, 0.02, 0.6, 0.03, 0.005, { uv: "keep" });
    f.box("darkGloss", 0, 0.8, 0.12, 0.8, 0.03, 0.24, { tilt: 0.15 });
  }
  kit.collider([x - 1.42, y, z - 1.42], [x + 1.42, y + 1.0, z + 1.42], "holoTable");
  // hologram
  const holoMat = new THREE.MeshBasicMaterial({ color: 0x5fb0ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const ring = (r, yy, tube = 0.012, tiltX = 0) => {
    const g = new THREE.TorusGeometry(r, tube, 6, 64);
    g.rotateX(Math.PI / 2 + tiltX);
    g.translate(0, yy, 0);
    return g;
  };
  const cone = new THREE.CylinderGeometry(1.15, 0.3, 1.7, 40, 1, true);
  cone.translate(0, 0.85, 0);
  const parts = [cone, ring(1.1, 0.02), ring(1.3, 1.75), ring(1.15, 1.75, 0.008), ring(1.2, 1.75, 0.006, 0.5), ring(1.2, 1.75, 0.006, -0.5)];
  const holo = new THREE.Group();
  holo.position.set(x, y + 0.97, z);
  holo.add(new THREE.Mesh(mergeGeometries(parts, false), holoMat));
  // the ship: wedge hull + neck + tower, as a faint solid and a brighter wireframe
  const hull = new THREE.Shape();
  hull.moveTo(0, 1.35);
  hull.lineTo(0.78, -0.95);
  hull.lineTo(-0.78, -0.95);
  hull.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(hull, { depth: 0.14, bevelEnabled: false });
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.translate(0, 0.0, 0);
  const ridge = new THREE.BoxGeometry(0.3, 0.1, 1.2);
  ridge.translate(0, 0.19, -0.3);
  const neck = new THREE.BoxGeometry(0.12, 0.22, 0.2);
  neck.translate(0, 0.35, -0.7);
  const tower = new THREE.BoxGeometry(0.42, 0.08, 0.16);
  tower.translate(0, 0.5, -0.7);
  const engines = [];
  for (const ex of [-0.3, 0, 0.3]) {
    const e = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10);
    e.rotateX(Math.PI / 2);
    e.translate(ex, 0.07, -1.0);
    engines.push(e);
  }
  // the extruded hull is non-indexed; the primitives must match it before merging
  const shipGeo = mergeGeometries([hullGeo, ridge, neck, tower, ...engines].map((g) => (g.index ? g.toNonIndexed() : g)), false);
  const solidMat = new THREE.MeshBasicMaterial({ color: 0x4a9cff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x9fd0ff, wireframe: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const ship = new THREE.Group();
  ship.add(new THREE.Mesh(shipGeo, solidMat));
  ship.add(new THREE.Mesh(shipGeo, wireMat));
  ship.position.y = 1.05;
  ship.rotation.x = 0.12;
  holo.add(ship);
  // amber status marker over the engineering deck (aft third of the hull)
  const markMat = new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mark = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 6, 24).rotateX(Math.PI / 2), markMat);
  mark.position.set(0, 0.2, -0.55);
  ship.add(mark);
  let t = 0;
  ctx.dynamic.push({
    object: holo,
    update(dt) {
      t += dt;
      ship.rotation.y += dt * 0.3;
      holoMat.opacity = 0.2 + 0.05 * Math.sin(t * 2.1);
      markMat.opacity = 0.45 + 0.35 * Math.sin(t * 4.0);
    },
  });
  ctx.lights.teal.push(pointLight(0x66b6ff, 8, 8, [x, y + 1.9, z]));
}

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", lights: false, lightRows: 2 });
  const y0 = shell.y0;
  const yTop = shell.yTop;
  const { x0, x1, z0, z1 } = room;

  // ---------------------------------------------------------------- floor: centre runner + painted edges, ring around the holo table
  kit.boxMM("deck", [16.5, y0, z0 + 0.16], [19.5, y0 + 0.006, 488.6], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  paintStrip(kit, 16.4, z0 + 0.3, 16.5, 488.6, y0);
  paintStrip(kit, 19.5, z0 + 0.3, 19.6, 488.6, y0);
  stencil(kit, 18, y0 + 0.009, 485.2, 1.4, 1, "up");
  {
    const g = new THREE.RingGeometry(1.7, 1.8, 48);
    g.rotateX(-Math.PI / 2);
    kit.add("painted", g, { pos: [HOLO.x, y0 + 0.004, HOLO.z], color: PALETTE.impAmber, uv: "keep" });
  }

  // ---------------------------------------------------------------- the arc of boards + status wall
  const step = (180 - 2 * PHI0) / SLOTS;
  for (let i = 0; i < SLOTS; i++) {
    const phi = PHI0 + (i + 0.5) * step;
    if (STATUS_SLOTS.includes(i)) {
      if (i !== STATUS_SLOTS[1]) continue;
      const [px, pz] = arcPoint(phi);
      statusWall(yawFrame(kit, px, y0, pz, yawToward(px, pz, ARC_C[0], ARC_C[1])));
      continue;
    }
    const [px, pz] = arcPoint(phi);
    board(kit, yawFrame(kit, px, y0, pz, yawToward(px, pz, ARC_C[0], ARC_C[1])), i);
  }
  // ---------------------------------------------------------------- overhead: cable trays and conduit drops
  const trayY = yTop - 0.5;
  const trayR = ARC_R - 1.35;
  const trayPhis = [];
  for (let k = 0; k <= 8; k++) trayPhis.push(PHI0 + 4 + ((180 - 2 * PHI0 - 8) * k) / 8);
  for (let k = 0; k + 1 < trayPhis.length; k++) cableTray(kit, arcPoint(trayPhis[k], trayR), arcPoint(trayPhis[k + 1], trayR), trayY, { w: 0.5, ceilY: yTop, cables: 4 });
  for (const tx of [11, 25]) {
    const dz = Math.sqrt(trayR * trayR - (tx - ARC_C[0]) ** 2);
    cableTray(kit, [tx, z0 + 0.4], [tx, ARC_C[1] + dz - 0.3], trayY, { w: 0.4, ceilY: yTop, cables: 3 });
  }
  for (let i = 0; i < SLOTS; i++) {
    const phi = PHI0 + (i + 0.5) * step;
    const isStatus = STATUS_SLOTS.includes(i);
    const [cx, cz] = arcPoint(phi, ARC_R + (isStatus ? 0.3 : 0.375));
    const [tx, tz] = arcPoint(phi, trayR + 0.1);
    const topY = y0 + (isStatus ? 3.5 : 2.75) + 0.16;
    const upY = Math.max(trayY - 0.35, topY + 0.12);
    for (const off of [-0.16, 0.16]) {
      const [ox, oz] = [Math.sin(deg(phi)) * off, -Math.cos(deg(phi)) * off];
      pipeRun(kit, "rubber", [[cx + ox, topY, cz + oz], [cx + ox, upY, cz + oz], [tx + ox, trayY + 0.08, tz + oz]], 0.035, { color: PALETTE.rubber, segments: 8 });
    }
    pipeRun(kit, "metal", [[cx, topY, cz], [cx, upY + 0.1, cz], [tx, trayY + 0.1, tz]], 0.05, { color: PALETTE.steel, segments: 10 });
  }

  // ---------------------------------------------------------------- engineer stations (two rows facing the arc), holo table between them
  for (const [sx, sz, w] of [[12.4, 488.6, 3.4], [23.6, 488.6, 3.4], [13.6, 492.0, 3.0], [22.4, 492.0, 3.0]]) {
    station(kit, sx, y0, sz, yawToward(sx, sz, ARC_C[0], 497.7), w, { chairs: 2, screen: "screen6" });
  }
  holoTable(kit, ctx, HOLO.x, y0, HOLO.z);

  // ---------------------------------------------------------------- supervisor platform (starboard of the door)
  const P = { x0: 21.0, x1: x1 - 0.4, z0: z0 + 0.16, z1: 486.2, y: y0 + 0.6 };
  kit.boxMM("paintedMetal", [P.x0, y0, P.z0], [P.x1, P.y - 0.05, P.z1], { color: PALETTE.darkMetal, texel: 1 });
  kit.boxMM("deck", [P.x0, P.y - 0.05, P.z0], [P.x1, P.y, P.z1], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  kit.boxMM("hazard", [P.x0, P.y, P.z0], [P.x0 + 0.14, P.y + 0.004, P.z1], { texel: 3 });
  kit.boxMM("hazard", [P.x0, P.y, P.z1 - 0.14], [P.x1, P.y + 0.004, P.z1], { texel: 3 });
  // toe lights under a lip along the platform edges
  kit.boxMM("satinBlack", [P.x0 - 0.06, y0 + 0.08, P.z0 + 0.2], [P.x0, y0 + 0.11, P.z1 - 0.2]);
  kit.boxMM("emitAmber", [P.x0 - 0.02, y0 + 0.04, P.z0 + 0.2], [P.x0, y0 + 0.065, P.z1 - 0.2], { uv: "keep" });
  kit.boxMM("satinBlack", [P.x0 + 0.2, y0 + 0.08, P.z1], [P.x1 - 0.2, y0 + 0.11, P.z1 + 0.06]);
  kit.boxMM("emitAmber", [P.x0 + 0.2, y0 + 0.04, P.z1], [P.x1 - 0.2, y0 + 0.065, P.z1 + 0.02], { uv: "keep" });
  kit.floor(P.x0, P.z0, P.x1, P.z1, P.y);
  kit.collider([P.x0, y0, P.z0], [P.x1, P.y, P.z1], "platform");
  kit.stairs("paintedMetal", P.x0 - 0.9, 483.0, P.x0, 484.6, y0, P.y, "x", { color: PALETTE.gunmetal, steps: 3 });
  railing(kit, P.x0, P.z0 + 0.1, P.x0, 483.0, P.y, { n0: -0.06 });
  railing(kit, P.x0, 484.6, P.x0, P.z1, P.y, { n0: -0.06 });
  railing(kit, P.x0, P.z1, P.x1, P.z1, P.y, { n0: -0.06 });
  stencil(kit, P.x0 + 0.001, y0 + 0.3, 483.8, 0.36, 7, "-x");
  stencil(kit, P.x0 + 0.001, y0 + 0.3, 485.5, 0.36, 15, "-x");
  // supervisor console facing the status wall, holo-plinth, lockers against the aft wall
  station(kit, 25.4, P.y, 484.7, yawToward(25.4, 484.7, ARC_C[0], 497.7), 3.2, { chairs: 1, screen: "screen6", glow: "emitBlue" });
  {
    const hx = 28.3;
    const hz = 485.3;
    kit.cyl("satinBlack", hx, P.y + 0.45, hz, 0.36, 0.9, "y", { segments: 16 });
    kit.cyl("metal", hx, P.y + 0.92, hz, 0.4, 0.04, "y", { color: PALETTE.steel, segments: 16 });
    kit.cyl("glass", hx, P.y + 1.25, hz, 0.3, 0.6, "y", { segments: 16 });
    kit.cyl("emitBlue", hx, P.y + 1.15, hz, 0.05, 0.4, "y", { segments: 8 });
    kit.box("emitBlue", hx, P.y + 1.28, hz, 0.36, 0.02, 0.02, { uv: "keep" });
    kit.box("emitBlue", hx, P.y + 1.28, hz, 0.02, 0.02, 0.36, { uv: "keep" });
    kit.collider([hx - 0.4, P.y, hz - 0.4], [hx + 0.4, P.y + 1.6, hz + 0.4], "holo");
  }
  for (let k = 0; k < 4; k++) {
    const lx = 22.2 + k * 0.85;
    kit.box("painted", lx, P.y + 0.95, P.z0 + 0.3, 0.8, 1.9, 0.55, { color: k % 2 ? PALETTE.slate : PALETTE.gunmetal, uv: "keep" });
    kit.box("metal", lx, P.y + 0.95, P.z0 + 0.58, 0.03, 1.6, 0.02, { color: PALETTE.darkMetal });
    kit.box("metal", lx + 0.25, P.y + 1.05, P.z0 + 0.59, 0.03, 0.14, 0.03, { color: PALETTE.steel });
    for (let s = 0; s < 4; s++) kit.box("metal", lx, P.y + 1.55 + s * 0.06, P.z0 + 0.585, 0.5, 0.012, 0.01, { color: PALETTE.darkMetal });
    stencil(kit, lx, P.y + 0.55, P.z0 + 0.586, 0.22, [0, 14, 6, 11][k], "+z");
  }
  kit.collider([21.8, P.y, P.z0], [25.6, P.y + 1.9, P.z0 + 0.6], "lockers");

  // ---------------------------------------------------------------- port side: data-core racks, plotting table with two chairs
  for (const [k, rx] of [7.7, 9.3, 10.9].entries()) dataRack(kit, rx, y0, z0 + 0.2, k);
  {
    const tx = 13.6;
    const tz = 484.2;
    kit.box("satinBlack", tx, y0 + 0.45, tz, 1.8, 0.9, 1.0);
    kit.box("metal", tx, y0 + 0.06, tz, 1.6, 0.12, 0.8, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("darkGloss", tx, y0 + 0.915, tz, 1.7, 0.03, 0.9);
    kit.box("screen4", tx, y0 + 0.932, tz, 1.56, 0.004, 0.78, { uv: "keep" });
    kit.box("emitBlue", tx, y0 + 0.9, tz - 0.5, 1.8, 0.02, 0.01, { uv: "keep" });
    kit.box("emitBlue", tx, y0 + 0.9, tz + 0.5, 1.8, 0.02, 0.01, { uv: "keep" });
    kit.collider([tx - 0.9, y0, tz - 0.5], [tx + 0.9, y0 + 1.0, tz + 0.5], "table");
    chair(yawFrame(kit, tx - 1.35, y0, tz, Math.PI / 2), 0, 0);
    chair(yawFrame(kit, tx + 1.35, y0, tz, -Math.PI / 2), 0, 0);
  }
  // coolant unit by the port wall with risers into the ceiling tray
  {
    const ux = x0 + 0.75;
    const uz = 486.0;
    kit.box("paintedMetal", ux, y0 + 0.7, uz, 1.3, 1.4, 1.1, { color: PALETTE.gunmetal, texel: 1.5 });
    kit.box("metal", ux, y0 + 1.43, uz, 1.34, 0.06, 1.14, { color: PALETTE.darkMetal, texel: 2 });
    for (let k = 0; k < 8; k++) kit.box("metal", ux + 0.66, y0 + 0.35 + k * 0.1, uz, 0.02, 0.03, 0.9, { color: PALETTE.steel });
    kit.box("emitAmber", ux + 0.66, y0 + 1.25, uz, 0.01, 0.06, 0.6, { uv: "keep" });
    for (const [k, pz] of [uz - 0.3, uz + 0.3].entries()) {
      pipeRun(kit, "metal", [[ux, y0 + 1.46, pz], [ux, yTop - 0.7 - k * 0.15, pz], [ux + 1.0, yTop - 0.7 - k * 0.15, pz], [ux + 1.0, yTop - 0.05, pz]], 0.07, { color: k ? PALETTE.orange : PALETTE.steel });
      valveWheel(kit, ux, y0 + 2.1, pz + 0.27, "z", 0.16);
    }
    kit.collider([x0, y0, uz - 0.6], [ux + 0.7, y0 + 1.5, uz + 0.6], "coolantUnit");
  }

  // ---------------------------------------------------------------- walls: fixtures on every free stretch
  const S = shell.frames["-z"].frame; // u = x - x0
  const doorU0 = 18 - x0 - 1.2 - 0.3;
  const doorU1 = 18 - x0 + 1.2 + 0.3;
  wallLightBar(S, 0.6, doorU0 - 0.2, 3.0);
  wallLightBar(S, doorU1 + 0.2, 23.4, 3.45);
  S.add("decal", new THREE.PlaneGeometry(0.5, 0.5), doorU0 - 0.5, 1.75, 0.005, { uv: "keep", uvRect: decalRect(5) });
  S.add("decal", new THREE.PlaneGeometry(0.5, 0.5), doorU1 + 0.5, 1.75, 0.005, { uv: "keep", uvRect: decalRect(1) });
  wallBaseTube(S, 6.2, doorU0 - 0.3, 0.4, "emitCoolSoft");
  // deck-plan display above the platform lockers
  S.box("darkGloss", 18.0, 2.9, 0.03, 1.5, 0.75, 0.05);
  S.box("screen4", 18.0, 2.9, 0.058, 1.4, 0.65, 0.006, { uv: "keep" });
  const W = shell.frames["-x"].frame; // u = z1 - z
  {
    const u0 = z1 - 487.4; // wall stretch between the arc end and the aft wall
    const u1 = z1 - z0 - 0.3;
    wallLightBar(W, u0 + 0.3, u1 - 0.3, 2.35);
    wallBaseTube(W, u0 + 0.3, u1 - 4.2, 0.4, "emitCoolSoft");
    wallConsole(W, u1 - 2.4, 1.4, "screen6");
    // fire cabinet + shutoff valves
    W.box("painted", u1 - 1.1, 1.35, 0.14, 0.6, 0.9, 0.28, { color: PALETTE.orange, uv: "keep" });
    W.box("metal", u1 - 1.1, 1.35, 0.285, 0.5, 0.8, 0.01, { color: PALETTE.darkMetal });
    W.box("metal", u1 - 0.88, 1.35, 0.29, 0.03, 0.2, 0.02, { color: PALETTE.steel });
    W.add("decal", new THREE.PlaneGeometry(0.3, 0.3), u1 - 1.1, 2.05, 0.005, { uv: "keep", uvRect: decalRect(13) });
    W.collider(u1 - 1.45, u1 - 0.75, 0.8, 1.85, 0, 0.32, "fireCab");
  }
  const E = shell.frames["+x"].frame; // u = z - z0
  {
    // gauge cluster and manifold above the supervisor platform
    const u0 = 0.3;
    const u1 = 487.4 - z0;
    E.box("paintedMetal", 2.25, 2.6, 0.04, 3.5, 1.3, 0.08, { color: PALETTE.gunmetal, texel: 1.5 });
    for (let k = 0; k < 6; k++) gauge(E, 0.9 + k * 0.5, 2.9, 0.2, { needle: 0.2 + ((k * 3) % 7) / 10 });
    E.box("leds", 3.35, 2.25, 0.085, 0.7, 0.05, 0.01, { uv: "keep" });
    E.box("darkGloss", 2.1, 2.25, 0.082, 1.5, 0.42, 0.006);
    E.box("screen6", 2.1, 2.25, 0.09, 1.4, 0.34, 0.006, { uv: "keep" });
    for (let k = 0; k < 3; k++) {
      const u = u1 - 0.5 - k * 0.5;
      E.cylV("metal", u, 2.0, 0.16, 0.07, 4.0, { color: k === 1 ? PALETTE.orange : PALETTE.steel, segments: 10 });
      E.box("metal", u, 1.9 + k * 0.1, 0.16, 0.24, 0.12, 0.24, { color: PALETTE.darkMetal, texel: 2 });
      E.box("metal", u, 3.6, 0.16, 0.24, 0.12, 0.24, { color: PALETTE.darkMetal, texel: 2 });
    }
    valveWheel(kit, x1 - 0.32, y0 + 1.75, z0 + u1 - 1.0, "x", 0.18);
    E.collider(u1 - 1.8, u1 - 0.2, 0, 4, 0, 0.3, "manifold");
    wallLightBar(E, u0 + 0.3, u1 - 2.0, 3.4);
  }

  // ---------------------------------------------------------------- lights: pendant tubes over the boards and stations (no ceiling
  // hot spots), low fill along the arc foot and the platform so floors and bases read
  for (const phi of [38, 90, 142]) {
    const [lx, lz] = arcPoint(phi, ARC_R - 2.6);
    const [ux, uz] = arcPoint(phi, ARC_R - 2.6 + 1);
    tubeFixture(kit, ctx, lx, yTop, lz, 2.6, Math.abs(ux - lx) > Math.abs(uz - lz) ? "z" : "x", { drop: 1.1, intensity: 26, distance: 15, color: 0xffcf98 });
  }
  for (const phi of [60, 120]) {
    const [lx, lz] = arcPoint(phi, ARC_R - 1.2);
    ctx.lights.cool.push(pointLight(0xbfd8ff, 14, 9, [lx, y0 + 0.9, lz]));
  }
  ctx.lights.cool.push(pointLight(0xbfd8ff, 14, 9, [18, y0 + 0.9, 496.4]));
  tubeFixture(kit, ctx, 25.5, yTop, 484.0, 2.4, "x", { drop: 1.0, intensity: 16, distance: 11, color: 0xffcf98 });
  ctx.lights.teal.push(pointLight(0x6fb4ff, 10, 10, [18, yTop - 1.4, 494.6]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 8, 7, [13.4, yTop - 1.2, 484.2]));
  tubeFixture(kit, ctx, 12.8, yTop, 490.4, 2.6, "x", { drop: 1.0, intensity: 30, distance: 16, color: 0xdfe8ff, mat: "emitCoolSoft", family: "cool" });
  tubeFixture(kit, ctx, 23.2, yTop, 490.4, 2.6, "x", { drop: 1.0, intensity: 30, distance: 16, color: 0xdfe8ff, mat: "emitCoolSoft", family: "cool" });
  ctx.lights.cool.push(pointLight(0xdfe8ff, 18, 12, [18, yTop - 0.9, 483.5]));
  ctx.lights.cool.push(pointLight(0xbfd8ff, 12, 9, [9.5, y0 + 0.9, 484.6]));
  return shell;
}
