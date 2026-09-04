// Engineering control (deck C): a 159-degree arc of satin-black power-distribution boards with the
// amber ship-status wall at its apex, two rows of engineer stations facing it, a raised supervisor
// platform beside the door, data-core racks and a plotting table, and cable trays overhead whose
// conduit bundles drop into every board. Dark shell, amber accent, blue-white instrument glow.
import * as THREE from "three";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { decalRect } from "../../textures.js";
import { yawFrame, yawToward, cableTray, pipeRun, station, gauge, breakerColumn, railing, floorStrip, stencil, valveWheel } from "./deckCProps.js";

const ARC_C = [18, 485.5]; // arc centre (x, z)
const ARC_R = 12.2; // front face radius of the boards
const PHI0 = 10.5; // degrees, arc start (starboard wall) .. 180 - PHI0 (port wall)
const SLOTS = 21;
const STATUS_SLOTS = [9, 10, 11];

const deg = (d) => (d * Math.PI) / 180;
const arcPoint = (phiDeg, r = ARC_R) => [ARC_C[0] + Math.cos(deg(phiDeg)) * r, ARC_C[1] + Math.sin(deg(phiDeg)) * r];

// Thin emissive line between two points of a frame's UV plane (ship-diagram strokes).
function stroke(f, p, q, mat, t = 0.03, n = 0.03) {
  const du = q[0] - p[0];
  const dv = q[1] - p[1];
  const len = Math.hypot(du, dv);
  f.box(mat, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, n, t, len, 0.008, { spin: Math.atan2(-du, dv), uv: "keep" });
}

// One power-distribution board. Frame origin: front-face centre at floor level, n > 0 into the room.
function board(f, i) {
  const w = 1.52;
  const h = 2.75;
  const d = 0.75;
  f.box("satinBlack", 0, h / 2, -d / 2 - 0.03, w, h, d - 0.06);
  for (const s of [-1, 1]) f.box("metal", s * (w / 2 - 0.03), h / 2, -0.03, 0.06, h, 0.06, { color: PALETTE.steel, texel: 2 });
  f.box("metal", 0, 0.15, -0.035, w - 0.12, 0.3, 0.05, { color: PALETTE.darkMetal, texel: 2 });
  f.box("emitAmber", 0, 0.06, -0.008, w - 0.4, 0.025, 0.01, { uv: "keep" });
  for (const [v0, v1] of [[0.34, 1.15], [1.19, 2.05], [2.09, 2.62]]) f.box("satinBlack", 0, (v0 + v1) / 2, -0.03, w - 0.12, v1 - v0, 0.06);
  // lower section: breaker levers, rotary selector, status leds, stencil
  breakerColumn(f, -0.46, 0.46, 4);
  breakerColumn(f, -0.26, 0.46, 4);
  f.cylN("metal", 0.18, 0.78, 0.03, 0.12, 0.06, { color: PALETTE.gunmetal, segments: 16 });
  f.box("painted", 0.18, 0.78, 0.065, 0.03, 0.16, 0.02, { color: PALETTE.orange, uv: "keep", spin: ((i * 53) % 7) * 0.4 });
  f.box("leds", 0.45, 0.48, 0.005, 0.3, 0.04, 0.01, { uv: "keep" });
  f.add("decal", new THREE.PlaneGeometry(0.28, 0.28), 0.46, 0.92, 0.003, { uv: "keep", uvRect: decalRect([5, 6, 9][i % 3]) });
  // middle section: amber readout
  f.box("darkGloss", 0, 1.62, 0.012, 1.12, 0.62, 0.025);
  f.box("screen6", 0, 1.62, 0.026, 1.04, 0.54, 0.006, { uv: "keep" });
  f.box("leds", 0, 1.24, 0.005, 0.8, 0.045, 0.01, { uv: "keep" });
  // top section: three amber gauges
  for (const [k, u] of [-0.42, 0, 0.42].entries()) gauge(f, u, 2.35, 0.17, { needle: 0.3 + (((i * 37 + k * 11) % 10) / 10) * 0.5 });
  // cap with conduit collar
  f.box("metal", 0, h - 0.05, -d / 2, w + 0.02, 0.1, d + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  f.box("paintedMetal", 0, h + 0.08, -d / 2, 0.7, 0.16, 0.36, { color: PALETTE.gunmetal, texel: 2 });
  f.collider(-w / 2, w / 2, 0, h + 0.2, -d, 0.12, "board");
}

// Status wall: flat 4.8 m panel at the arc apex with three amber readouts and the ship diagram.
function statusWall(f) {
  const w = 4.8;
  const h = 3.5;
  const d = 0.6;
  f.box("satinBlack", 0, h / 2, -d / 2 - 0.03, w, h, d - 0.06);
  for (const s of [-1, 1]) f.box("metal", s * (w / 2 - 0.03), h / 2, -0.03, 0.06, h, 0.06, { color: PALETTE.steel, texel: 2 });
  f.box("metal", 0, 0.15, -0.035, w - 0.12, 0.3, 0.05, { color: PALETTE.darkMetal, texel: 2 });
  f.box("emitAmber", 0, 0.06, -0.008, w - 0.5, 0.025, 0.01, { uv: "keep" });
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

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", lights: false, lightRows: 2 });
  const y0 = shell.y0;
  const yTop = shell.yTop;
  const { x0, x1, z0, z1 } = room;

  // ---------------------------------------------------------------- floor: centre runner + amber edges
  kit.boxMM("deck", [16.5, y0, z0 + 0.16], [19.5, y0 + 0.006, 494.6], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  floorStrip(kit, 16.4, z0 + 0.3, 16.5, 494.6, y0);
  floorStrip(kit, 19.5, z0 + 0.3, 19.6, 494.6, y0);
  stencil(kit, 18, y0 + 0.009, 486.5, 1.4, 1, "up");

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
    board(yawFrame(kit, px, y0, pz, yawToward(px, pz, ARC_C[0], ARC_C[1])), i);
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

  // ---------------------------------------------------------------- engineer stations (two rows facing the arc)
  for (const [sx, sz, w] of [[12.4, 488.6, 3.4], [23.6, 488.6, 3.4], [13.6, 492.0, 3.0], [22.4, 492.0, 3.0]]) {
    station(kit, sx, y0, sz, yawToward(sx, sz, ARC_C[0], 497.7), w, { chairs: 2, screen: "screen6" });
  }

  // ---------------------------------------------------------------- supervisor platform (starboard of the door)
  const P = { x0: 21.0, x1: x1 - 0.4, z0: z0 + 0.16, z1: 486.2, y: y0 + 0.6 };
  kit.boxMM("paintedMetal", [P.x0, y0, P.z0], [P.x1, P.y - 0.05, P.z1], { color: PALETTE.darkMetal, texel: 1 });
  kit.boxMM("deck", [P.x0, P.y - 0.05, P.z0], [P.x1, P.y, P.z1], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  kit.boxMM("hazard", [P.x0, P.y, P.z0], [P.x0 + 0.14, P.y + 0.004, P.z1], { texel: 3 });
  kit.boxMM("hazard", [P.x0, P.y, P.z1 - 0.14], [P.x1, P.y + 0.004, P.z1], { texel: 3 });
  kit.boxMM("emitAmber", [P.x0 - 0.02, y0 + 0.04, P.z0 + 0.2], [P.x0, y0 + 0.07, P.z1 - 0.2], { uv: "keep" });
  kit.boxMM("emitAmber", [P.x0 + 0.2, y0 + 0.04, P.z1], [P.x1 - 0.2, y0 + 0.07, P.z1 + 0.02], { uv: "keep" });
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

  // ---------------------------------------------------------------- port side: data-core racks, plotting table
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
    for (const sx of [tx - 1.3, tx + 1.3]) {
      kit.cyl("metal", sx, y0 + 0.24, tz, 0.05, 0.48, "y", { color: PALETTE.gunmetal });
      kit.cyl("metal", sx, y0 + 0.02, tz, 0.22, 0.04, "y", { color: PALETTE.darkMetal, segments: 16 });
      kit.cyl("rubber", sx, y0 + 0.5, tz, 0.2, 0.06, "y", { color: PALETTE.rubber, segments: 16 });
      kit.collider([sx - 0.22, y0, tz - 0.22], [sx + 0.22, y0 + 0.56, tz + 0.22], "stool");
    }
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
  // deck-plan display above the platform lockers
  S.box("darkGloss", 18.0, 2.9, 0.03, 1.5, 0.75, 0.05);
  S.box("screen4", 18.0, 2.9, 0.058, 1.4, 0.65, 0.006, { uv: "keep" });
  const W = shell.frames["-x"].frame; // u = z1 - z
  {
    const u0 = z1 - 487.4; // wall stretch between the arc end and the aft wall
    const u1 = z1 - z0 - 0.3;
    wallLightBar(W, u0 + 0.3, u1 - 0.3, 2.35);
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

  // ---------------------------------------------------------------- lights: amber over the boards, cool over the stations
  for (const phi of [40, 90, 140]) {
    const [lx, lz] = arcPoint(phi, ARC_R - 2.4);
    ctx.lights.warm.push(pointLight(0xffb060, 16, 16, [lx, yTop - 0.7, lz]));
  }
  ctx.lights.warm.push(pointLight(0xffb060, 8, 10, [25.5, yTop - 0.8, 484.0]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 7.0, 10, [18, yTop - 1.4, 494.6]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 4.0, 7, [13.4, yTop - 1.2, 484.2]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 14.0, 18, [12.8, yTop - 0.5, 490.4]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 14.0, 18, [23.2, yTop - 0.5, 490.4]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 9.0, 12, [18, yTop - 0.6, 483.5]));
  return shell;
}
