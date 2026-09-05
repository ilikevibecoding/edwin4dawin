// Security and detention block (deck B, port, x -24..-2 / z 542..556, h 3.0). A barred security
// partition with a scanner gate splits the room lengthwise. Guard side: a checkpoint desk with red
// monitors, a duty board and desk clutter under a mixed monitor wall by the door, the guards' rifle rack,
// an evidence safe, a detainee processing bench with restraint rings, effects lockers, a sealed heavy
// door and, closing the far west end on the door sightline, a walled interrogation alcove (fixed detainee
// seat, table with cuff rail, harsh pendant, recording panel, acoustic tiles). Behind the bars a 2.4 m
// corridor runs past six 2.4 m cells with pale liners, each lit by its own caged ceiling lamp, a cot along
// the side wall and a sanitary unit at the back, sealed by a shimmering red containment field.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { PALETTE } from "../../materials.js";
import { pointLight, Frame } from "../lib.js";
import { stencil, floorStencil, locker, rifleRack, stool, table, crate, pendant, standFrame, sevenSegText, scanlineTexture, holoMaterial, cup, UP } from "./aftProps.js";

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", lights: false, lightRows: 2, lightMat: "emitWhiteSoft", seed: 61 });
  const { y0, yTop, frames } = shell;
  const { x0, x1, z0, z1 } = room;
  const fX = frames["+x"].frame; // door wall, u = z - z0
  const fW = frames["-x"].frame; // west wall, u = z1 - z
  const fN = frames["-z"].frame; // forward wall (guard side), u = x - x0
  const fS = frames["+z"].frame; // aft wall (cell backs), u = x1 - x
  const pz = 550.6; // security partition plane
  const cz = 553.0; // cell fronts
  const gate = [-5.9, -4.1]; // gate post centres
  const cells = Array.from({ length: 6 }, (_, i) => ({ xa: -22.8 + i * 2.6, xb: -20.4 + i * 2.6, n: i + 1 }));
  const ax1 = -20.6; // interrogation alcove: inner east face
  const az1 = 546.6; // interrogation alcove: inner south face

  // ------------------------------------------------------------ lights: harsh white mains under the ceiling strips, red at the gate and door
  // (each cell adds its own caged lamp below; the alcove adds its pendant)
  // (pool note: a fixture only takes a slot while the camera is within 1.6 x its distance, so everything
  // that must read from the door view gets a distance of at least 12)
  ctx.lights.cool.push(pointLight(0xf2f4ff, 16, 14, [-4.8, yTop - 0.4, 546.4]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 16, 14, [-11.5, yTop - 0.4, 546.0]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 16, 14, [-17.6, yTop - 0.4, 546.4]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 12, 13, [-10.5, yTop - 0.35, 551.9]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 12, 13, [-19.0, yTop - 0.35, 551.9]));
  ctx.lights.teal.push(pointLight(0xff3020, 4, 8, [-5.0, yTop - 0.5, 551.6]));
  ctx.lights.teal.push(pointLight(0xff3020, 3, 6, [-2.7, y0 + 2.3, 545.0]));

  // ------------------------------------------------------------ security partition with scanner gate
  {
    const bars = (xa, xb) => {
      kit.boxMM("painted", [xa, y0 + 0.02, pz - 0.05], [xb, y0 + 0.9, pz + 0.05], { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
      kit.boxMM("rubber", [xa, y0, pz - 0.06], [xb, y0 + 0.08, pz + 0.06], { color: PALETTE.rubber, texel: 2 });
      kit.boxMM("metal", [xa, y0 + 0.9, pz - 0.06], [xb, y0 + 0.96, pz + 0.06], { color: PALETTE.steel, texel: 2 });
      kit.boxMM("satinBlack", [xa, y0 + 2.84, pz - 0.07], [xb, yTop, pz + 0.07]);
      for (let x = xa + 0.1; x < xb - 0.05; x += 0.15) kit.cyl("metal", x, y0 + 1.9, pz, 0.018, 1.88, "y", { color: PALETTE.steel, segments: 8 });
      kit.boxMM("metal", [xa, y0 + 1.9, pz - 0.03], [xb, y0 + 1.94, pz + 0.03], { color: PALETTE.gunmetal, texel: 2 });
    };
    const posts = [x0 + 0.07, -22.9, -20.3, -17.7, -15.1, -12.5, -9.9, -7.3, gate[0], gate[1], x1 - 0.07];
    for (const x of posts) kit.box("satinBlack", x, y0 + 1.5, pz, 0.14, 3.0, 0.14);
    for (let i = 0; i < posts.length - 1; i++) {
      if (posts[i] === gate[0]) continue;
      bars(posts[i] + 0.07, posts[i + 1] - 0.07);
    }
    kit.collider([x0, y0, pz - 0.1], [gate[0], yTop, pz + 0.1], "partition");
    kit.collider([gate[1], y0, pz - 0.1], [x1, yTop, pz + 0.1], "partition");
    // scanner gate: header with red lamp, sensor strips on the posts, hazard strip and a parked barred leaf
    kit.boxMM("satinBlack", [gate[0], y0 + 2.6, pz - 0.12], [gate[1], y0 + 2.86, pz + 0.12]);
    kit.box("emitRed", (gate[0] + gate[1]) / 2, y0 + 2.73, pz - 0.125, 0.5, 0.06, 0.01);
    kit.box("emitWhiteSoft", (gate[0] + gate[1]) / 2, y0 + 2.595, pz, 1.4, 0.01, 0.16, { uv: "keep" });
    for (const [x, s] of [[gate[0], 1], [gate[1], -1]]) {
      kit.box("leds", x + s * 0.075, y0 + 1.5, pz, 0.006, 1.8, 0.08, { uv: "keep" });
      kit.box("darkGloss", x, y0 + 1.5, pz - 0.075, 0.1, 2.0, 0.01);
      kit.box("emitRed", x, y0 + 2.4, pz - 0.081, 0.05, 0.05, 0.004);
    }
    kit.boxMM("hazard", [gate[0] + 0.07, y0 + 0.001, pz - 0.28], [gate[1] - 0.07, y0 + 0.006, pz + 0.28], { texel: 2 });
    const gx0 = -7.7;
    const gx1 = -6.05;
    const gz = pz + 0.2;
    kit.boxMM("satinBlack", [gx0, y0 + 0.03, gz - 0.03], [gx1, y0 + 0.9, gz + 0.03]);
    kit.boxMM("satinBlack", [gx0, y0 + 2.36, gz - 0.03], [gx1, y0 + 2.46, gz + 0.03]);
    for (const x of [gx0 + 0.03, gx1 - 0.03]) kit.box("satinBlack", x, y0 + 1.25, gz, 0.06, 2.46, 0.06);
    for (let x = gx0 + 0.15; x < gx1 - 0.05; x += 0.14) kit.cyl("metal", x, y0 + 1.63, gz, 0.015, 1.46, "y", { color: PALETTE.steel, segments: 8 });
    kit.boxMM("metal", [gx0 - 0.1, y0 + 2.46, gz - 0.05], [gate[1] + 0.1, y0 + 2.54, gz + 0.05], { color: PALETTE.gunmetal, texel: 2 });
    kit.box("metal", gx1 - 0.15, y0 + 1.1, gz + 0.06, 0.2, 0.06, 0.04, { color: PALETTE.steel });
    kit.collider([gx0 - 0.05, y0, gz - 0.06], [gx1 + 0.05, y0 + 2.5, gz + 0.06], "gateLeaf");
    // partition stencils on the base panels, guard side (u = x1 - x; the gate opening is u 1.9..3.9)
    const fP = new Frame(kit, new THREE.Vector3(x1, y0, pz - 0.05), new THREE.Vector3(-1, 0, 0), UP);
    stencil(fP, 1.15, 0.5, 0.34, 13, { plate: false });
    stencil(fP, 6.6, 0.55, 0.36, 5, { plate: false });
    stencil(fP, 14.4, 0.55, 0.36, 5, { plate: false });
    stencil(fP, 9.2, 0.55, 0.5, 14, { plate: false });
    stencil(fP, 19.0, 0.55, 0.5, 0, { plate: false });
  }

  // ------------------------------------------------------------ guard checkpoint desk + monitor wall
  {
    const dz0 = 545.9;
    const dz1 = 546.7;
    kit.boxMM("satinBlack", [-6.6, y0 + 0.02, dz0], [x1 - 0.02, y0 + 0.86, dz1]);
    kit.boxMM("rubber", [-6.62, y0, dz0 - 0.02], [x1 - 0.02, y0 + 0.08, dz1 + 0.02], { color: PALETTE.rubber, texel: 2 });
    kit.boxMM("metal", [-6.66, y0 + 0.86, dz0 - 0.06], [x1 - 0.02, y0 + 0.9, dz1 + 0.06], { color: PALETTE.steel, texel: 2 });
    // public face: red band, led strip, ribs, stencil plates
    kit.boxMM("painted", [-6.5, y0 + 0.42, dz1 + 0.002], [x1 - 0.1, y0 + 0.48, dz1 + 0.014], { color: PALETTE.impRed, uv: "keep" });
    kit.boxMM("leds", [-6.4, y0 + 0.78, dz1 + 0.002], [x1 - 0.2, y0 + 0.81, dz1 + 0.01], { uv: "keep" });
    for (const x of [-5.9, -4.6, -3.3]) kit.boxMM("metal", [x - 0.006, y0 + 0.15, dz1 + 0.002], [x + 0.006, y0 + 0.74, dz1 + 0.02], { color: PALETTE.darkMetal });
    const fF = new Frame(kit, new THREE.Vector3(-6.6, y0, dz1), new THREE.Vector3(1, 0, 0), UP); // public face, faces +z, u = x + 6.6
    stencil(fF, 1.3, 0.62, 0.26, 0, { color: PALETTE.creamDark, n: 0.008 });
    stencil(fF, 3.95, 0.62, 0.26, 14, { color: PALETTE.creamDark, n: 0.008 });
    // low privacy rail along the public edge carrying three duty-board tiles tilted up toward the queue
    kit.boxMM("satinBlack", [-6.5, y0 + 0.9, dz1 - 0.14], [x1 - 0.1, y0 + 1.12, dz1 + 0.02]);
    kit.boxMM("metal", [-6.5, y0 + 1.12, dz1 - 0.15], [x1 - 0.1, y0 + 1.14, dz1 + 0.03], { color: PALETTE.steel, texel: 2 });
    for (const [u, mat] of [[1.5, "screen9"], [2.2, "screen5"], [2.9, "screen7"]]) fF.box(mat, u, 1.01, 0.032, 0.5, 0.18, 0.008, { uv: "keep", tilt: -0.2 });
    fF.box("emitRed", 4.15, 1.01, 0.026, 0.16, 0.05, 0.006);
    fF.box("leds", 0.75, 1.01, 0.026, 0.5, 0.05, 0.006, { uv: "keep" });
    // inner work surface, keyboard, three tilted red monitors facing the guard
    kit.boxMM("satinBlack", [-6.5, y0 + 0.72, dz0 - 0.36], [x1 - 0.1, y0 + 0.75, dz0]);
    for (const x of [-5.8, -4.0]) kit.box("satinBlack", x, y0 + 0.36, dz0 - 0.18, 0.08, 0.72, 0.34);
    kit.box("darkGloss", -4.6, y0 + 0.765, dz0 - 0.18, 0.5, 0.02, 0.18);
    kit.box("leds", -4.6, y0 + 0.777, dz0 - 0.18, 0.42, 0.004, 0.1, { uv: "keep" });
    const fD = standFrame(kit, -2.1, y0 + 0.9, dz0 + 0.42, "-z"); // u runs west along the desk top
    for (const u of [1.0, 2.1, 3.2]) {
      fD.box("satinBlack", u, 0.05, 0, 0.14, 0.1, 0.1);
      fD.box("darkGloss", u, 0.28, 0.02, 0.5, 0.36, 0.04, { tilt: -0.28 });
      fD.box("screen5", u, 0.285, 0.044, 0.44, 0.3, 0.006, { tilt: -0.28, uv: "keep" });
      // on the tilted back plane (seen from the queue): led strip at the pivot height, red lamp higher up
      fD.box("leds", u, 0.28, -0.004, 0.2, 0.02, 0.004, { tilt: -0.28, uv: "keep" });
      fD.box("emitRed", u + 0.18, 0.35, -0.025, 0.03, 0.03, 0.004, { tilt: -0.28 });
    }
    // desk clutter: datapad rack with three pads, comm handset on a cradle, cup, cuffs, desk lamp, beacon
    kit.box("satinBlack", -6.2, y0 + 0.96, dz0 + 0.55, 0.36, 0.12, 0.2);
    for (let k = 0; k < 3; k++) {
      kit.box("darkGloss", -6.3 + k * 0.1, y0 + 1.1, dz0 + 0.55, 0.02, 0.24, 0.16, { rot: [0, 0, 0.12] });
      kit.box("screen9", -6.29 + k * 0.1, y0 + 1.12, dz0 + 0.55, 0.004, 0.16, 0.11, { rot: [0, 0, 0.12], uv: "keep" });
    }
    kit.box("satinBlack", -2.6, y0 + 0.93, dz0 + 0.6, 0.26, 0.06, 0.14);
    kit.box("darkGloss", -2.6, y0 + 0.99, dz0 + 0.6, 0.2, 0.06, 0.06, { rot: [0, 0, 0.1] });
    kit.box("emitTeal", -2.52, y0 + 0.965, dz0 + 0.68, 0.03, 0.01, 0.01);
    cup(kit, -5.35, y0 + 0.9, dz0 + 0.62, PALETTE.gunmetal);
    for (let k = 0; k < 2; k++) kit.add("metal", new THREE.TorusGeometry(0.05, 0.008, 6, 14).rotateX(Math.PI / 2), { pos: [-3.5 + k * 0.09, y0 + 0.91, dz0 + 0.62], color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
    kit.cyl("metal", -2.35, y0 + 0.95, dz0 + 0.2, 0.06, 0.1, "y", { color: PALETTE.darkMetal, segments: 12 });
    kit.cyl("metal", -2.45, y0 + 1.22, dz0 + 0.3, 0.012, 0.5, "y", { color: PALETTE.gunmetal, segments: 6 });
    kit.box("satinBlack", -2.6, y0 + 1.46, dz0 + 0.42, 0.26, 0.08, 0.14, { rot: [0.35, 0.4, 0] });
    kit.box("emitWhiteSoft", -2.6, y0 + 1.42, dz0 + 0.44, 0.2, 0.01, 0.1, { rot: [0.35, 0.4, 0], uv: "keep" });
    kit.cyl("satinBlack", -6.35, y0 + 0.94, dz0 + 0.18, 0.05, 0.08, "y", { segments: 10 });
    kit.cyl("emitRed", -6.35, y0 + 1.03, dz0 + 0.18, 0.04, 0.1, "y", { segments: 10 });
    // hand scanner and a tray on the public side of the rail
    kit.box("darkGloss", -6.2, y0 + 1.15, dz1 - 0.07, 0.24, 0.02, 0.12);
    kit.box("emitRed", -6.2, y0 + 1.162, dz1 - 0.07, 0.16, 0.004, 0.02);
    kit.box("metal", -2.7, y0 + 1.15, dz1 - 0.07, 0.4, 0.02, 0.12, { color: PALETTE.darkMetal, texel: 2 });
    stool(kit, -4.6, y0, 545.15, { ring: true, face: Math.PI, id: "detention-guard-desk" });
    kit.collider([-6.7, y0, dz0 - 0.4], [x1, y0 + 1.2, dz1 + 0.1], "desk");
    // monitor wall above the desk end: mixed feeds (cell cams, logs, sensor sweep, deck schematic)
    fX.box("satinBlack", 3.0, 1.85, 0.04, 3.7, 1.5, 0.08);
    const feeds = [["screen5", "screen9", "screen5"], ["screen8", "screen5", "screen7"]];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) fX.box(feeds[r][c], 1.85 + c * 1.15, 1.5 + r * 0.7, 0.082, 1.05, 0.6, 0.006, { uv: "keep" });
    fX.box("leds", 3.0, 1.05, 0.05, 3.2, 0.04, 0.02, { uv: "keep" });
    fX.box("emitRed", 3.0, 2.64, 0.05, 3.4, 0.03, 0.02);
    fX.collider(1.1, 4.9, 1.0, 2.7, 0, 0.1, "monitors");
    stencil(fX, 0.6, 2.2, 0.36, 14, { color: PALETTE.creamDark });
    // door controls beside the door, block code over it
    fX.box("satinBlack", 5.5, 1.4, 0.04, 0.5, 0.7, 0.08);
    fX.box("screen5", 5.5, 1.52, 0.082, 0.36, 0.26, 0.006, { uv: "keep" });
    fX.box("emitRed", 5.38, 1.22, 0.082, 0.08, 0.05, 0.006);
    fX.box("emitWhite", 5.62, 1.22, 0.082, 0.08, 0.05, 0.006);
    stencil(fX, 7.0, 2.55, 0.4, 14, { color: PALETTE.cream });
    wallLightBar(fX, 0.4, 5.8, 2.6, "emitWhiteSoft");
    // aft of the partition: fire cabinet + status log panel on the corridor's east end
    fX.box("metal", 9.6, 1.2, 0.08, 0.9, 1.1, 0.16, { color: PALETTE.gunmetal, texel: 1.5 });
    fX.box("painted", 9.6, 1.2, 0.165, 0.76, 0.96, 0.01, { color: PALETTE.impRed, uv: "keep" });
    stencil(fX, 9.6, 1.35, 0.4, 13, { color: PALETTE.cream, n: 0.17 });
    fX.box("metal", 9.6, 0.85, 0.19, 0.4, 0.05, 0.05, { color: PALETTE.steel });
    fX.collider(9.1, 10.1, 0, 1.8, 0, 0.2, "fireCabinet");
    fX.box("satinBlack", 12.2, 1.6, 0.04, 1.6, 0.9, 0.08);
    fX.box("screen9", 11.9, 1.6, 0.082, 0.8, 0.6, 0.006, { uv: "keep" });
    for (let k = 0; k < 6; k++) fX.box(k % 2 ? "emitRed" : "emitWhite", 12.55 + (k % 2) * 0.18, 1.85 - Math.floor(k / 2) * 0.16, 0.082, 0.12, 0.06, 0.006);
    fX.box("leds", 12.2, 1.1, 0.05, 1.3, 0.04, 0.02, { uv: "keep" });
    wallLightBar(fX, 9.0, 13.6, 2.6, "emitWhiteSoft");
  }

  // ------------------------------------------------------------ forward wall: lockers, manifest console, processing bench, safe, guards' rack
  {
    for (let k = 0; k < 5; k++) locker(fN, 4.3 + k * 0.8, 0.76, 1.9, { color: PALETTE.impGreyDark, band: PALETTE.impRed, decal: [9, 6, 9, 14, 9][k] });
    wallLightBar(fN, 3.9, 7.9, 2.5, "emitWhiteSoft");
    stencil(fN, 5.9, 2.2, 0.36, 11, { color: PALETTE.creamDark });
    wallConsole(fN, 8.9, 1.6, "screen9");
    kit.marker("station", [x0 + 8.9, y0, z0 + 0.9], 0, { id: "detention-manifest" });
    stencil(fN, 8.9, 1.95, 0.42, 6, { color: PALETTE.creamDark });
    wallLightBar(fN, 8.1, 9.7, 2.5, "emitWhiteSoft");
    // processing bench: bare slab, cuff rail and restraint rings, red stand-off line
    const bx0 = -13.6;
    const bx1 = -9.4;
    kit.boxMM("satinBlack", [bx0, y0 + 0.4, z0 + 0.05], [bx1, y0 + 0.47, z0 + 0.55]);
    kit.boxMM("metal", [bx0, y0 + 0.47, z0 + 0.03], [bx1, y0 + 0.485, z0 + 0.57], { color: PALETTE.steel, texel: 2 });
    for (const x of [bx0 + 0.15, (bx0 + bx1) / 2, bx1 - 0.15]) kit.box("satinBlack", x, y0 + 0.2, z0 + 0.3, 0.1, 0.4, 0.44);
    kit.cyl("metal", (bx0 + bx1) / 2, y0 + 0.72, z0 + 0.09, 0.02, bx1 - bx0 - 0.4, "x", { color: PALETTE.steel, segments: 8 });
    for (let x = bx0 + 0.45; x < bx1; x += 1.0) {
      kit.box("metal", x, y0 + 0.72, z0 + 0.05, 0.06, 0.1, 0.1, { color: PALETTE.gunmetal });
      kit.box("metal", x, y0 + 1.0, z0 + 0.02, 0.12, 0.08, 0.04, { color: PALETTE.gunmetal });
      kit.add("metal", new THREE.TorusGeometry(0.06, 0.011, 6, 16), { pos: [x, y0 + 0.9, z0 + 0.045], color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
    }
    kit.boxMM("painted", [bx0 - 0.2, y0 + 0.001, z0 + 1.15], [bx1 + 0.2, y0 + 0.006, z0 + 1.21], { color: PALETTE.impRed, uv: "keep" });
    kit.collider([bx0, y0, z0], [bx1, y0 + 0.5, z0 + 0.6], "bench");
    for (const x of [bx0 + 0.8, (bx0 + bx1) / 2, bx1 - 0.8]) kit.marker("seat", [x, y0, z0 + 0.3], Math.PI, { id: "detention-bench" });
    stencil(fN, 12.5, 1.7, 0.5, 1, { color: PALETTE.cream });
    stencil(fN, 10.9, 1.6, 0.36, 9, { color: PALETTE.creamDark });
    stencil(fN, 14.1, 1.6, 0.36, 9, { color: PALETTE.creamDark });
    wallLightBar(fN, 10.3, 14.5, 2.5, "emitWhiteSoft");
    // evidence safe
    const su = 16.0;
    fN.box("paintedMetal", su, 1.0, 0.3, 1.3, 2.0, 0.6, { color: PALETTE.darkMetal, texel: 1.5 });
    fN.box("satinBlack", su, 1.02, 0.605, 1.1, 1.75, 0.02);
    fN.box("metal", su, 1.99, 0.31, 1.34, 0.03, 0.62, { color: PALETTE.steel, texel: 2 });
    for (const v of [0.5, 1.05, 1.6]) fN.box("metal", su - 0.56, v, 0.62, 0.06, 0.2, 0.08, { color: PALETTE.steel });
    fN.box("metal", su + 0.1, 1.0, 0.635, 0.7, 0.07, 0.05, { color: PALETTE.steel });
    fN.box("darkGloss", su + 0.35, 1.45, 0.62, 0.18, 0.24, 0.02);
    fN.box("screen5", su + 0.35, 1.5, 0.632, 0.14, 0.1, 0.004, { uv: "keep" });
    fN.box("emitRed", su + 0.35, 1.37, 0.632, 0.05, 0.03, 0.004);
    fN.box("hazard", su, 0.25, 0.616, 1.1, 0.08, 0.01, { texel: 3 });
    stencil(fN, su - 0.2, 1.5, 0.36, 14, { plate: false, n: 0.616 });
    fN.collider(su - 0.7, su + 0.7, 0, 2.05, 0, 0.68, "safe");
    wallLightBar(fN, 14.9, 17.2, 2.5, "emitWhiteSoft");
    // guards' rifle rack inside the checkpoint pocket
    rifleRack(fN, 17.6, 21.0);
    stencil(fN, 19.3, 2.4, 0.36, 5, { plate: false });
    wallLightBar(fN, 17.5, 21.6, 2.65, "emitWhiteSoft");
    // effects crates stacked against the alcove's outer wall
    crate(kit, -23.3, y0 + 0.25, 547.2, 0.8, 0.48, 0.6, PALETTE.impGreyDark, { decal: 11, face: "+x", collide: true });
    crate(kit, -23.3, y0 + 0.73, 547.2, 0.8, 0.48, 0.6, PALETTE.gunmetal, { decal: 9, face: "+x", band: false, collide: true });
    crate(kit, -22.4, y0 + 0.25, 547.25, 0.8, 0.48, 0.6, PALETTE.slate, { decal: 14, face: "+x", collide: true });
  }

  // ------------------------------------------------------------ west wall (guard side, south of the alcove): sealed heavy door, keypad
  {
    const du = 7.05; // door centre z 548.95, leaf spans z 547.6..550.3
    fW.box("satinBlack", du, 1.28, 0.08, 2.7, 2.56, 0.16);
    fW.box("painted", du, 1.25, 0.17, 2.3, 2.42, 0.04, { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
    fW.box("satinBlack", du, 1.25, 0.195, 0.06, 2.42, 0.01);
    for (const v of [0.55, 1.25, 1.95]) fW.box("metal", du, v, 0.195, 2.2, 0.06, 0.02, { color: PALETTE.steel, texel: 2 });
    fW.box("hazard", du, 0.16, 0.195, 2.2, 0.1, 0.01, { texel: 3 });
    stencil(fW, du - 0.6, 1.6, 0.5, 14, { color: PALETTE.cream, n: 0.195 });
    stencil(fW, du + 0.6, 1.6, 0.5, 8, { color: PALETTE.cream, n: 0.195 });
    fW.box("satinBlack", du, 2.72, 0.06, 0.6, 0.16, 0.12);
    fW.box("emitRed", du, 2.72, 0.125, 0.4, 0.06, 0.01);
    fW.collider(du - 1.4, du + 1.4, 0, 2.6, 0, 0.25, "sealedDoor");
    fW.box("darkGloss", 8.8, 1.35, 0.04, 0.3, 0.5, 0.08);
    fW.box("screen5", 8.8, 1.45, 0.082, 0.22, 0.18, 0.006, { uv: "keep" });
    for (let k = 0; k < 6; k++) fW.box(k === 4 ? "emitRed" : "leds", 8.7 + (k % 2) * 0.12, 1.24 - Math.floor(k / 2) * 0.08, 0.082, 0.08, 0.05, 0.006, { uv: "keep" });
    stencil(fW, 8.8, 2.15, 0.4, 1, { color: PALETTE.cream });
    wallLightBar(fW, 5.7, 6.6, 2.74, "emitWhiteSoft"); // flanking the door's red lamp housing
    wallLightBar(fW, 7.5, 9.1, 2.74, "emitWhiteSoft");
  }

  // ------------------------------------------------------------ interrogation alcove: walled bay at the far west end, open toward the door sightline
  {
    const wall = (min, max) => kit.boxMM("painted", min, max, { color: PALETTE.impGreyDark, uv: "world", texel: 0.8 });
    const oz0 = 543.3; // opening in the east wall
    const oz1 = 545.7;
    wall([x0, y0, az1], [ax1 + 0.2, yTop, az1 + 0.2]);
    wall([ax1, y0, z0], [ax1 + 0.2, yTop, oz0]);
    wall([ax1, y0, oz1], [ax1 + 0.2, yTop, az1 + 0.2]);
    wall([ax1, y0 + 2.3, oz0], [ax1 + 0.2, yTop, oz1]);
    kit.boxMM("satinBlack", [x0, y0, az1 - 0.02], [ax1 + 0.22, y0 + 0.12, az1 + 0.22]);
    kit.boxMM("satinBlack", [ax1 - 0.02, y0, z0], [ax1 + 0.22, y0 + 0.12, oz0 + 0.02]);
    kit.boxMM("satinBlack", [ax1 - 0.02, y0, oz1 - 0.02], [ax1 + 0.22, y0 + 0.12, az1 + 0.22]);
    kit.boxMM("satinBlack", [x0, yTop - 0.18, az1 - 0.02], [ax1 + 0.22, yTop, az1 + 0.22]);
    kit.boxMM("satinBlack", [ax1 - 0.02, yTop - 0.18, z0], [ax1 + 0.22, yTop, az1 + 0.22]);
    for (const z of [oz0, oz1]) kit.boxMM("metal", [ax1 - 0.02, y0 + 0.12, z - 0.04], [ax1 + 0.22, y0 + 2.3, z + 0.04], { color: PALETTE.steel, texel: 2 });
    kit.boxMM("metal", [ax1 - 0.02, y0 + 2.26, oz0 - 0.04], [ax1 + 0.22, y0 + 2.34, oz1 + 0.04], { color: PALETTE.steel, texel: 2 });
    kit.collider([x0, y0, az1], [ax1 + 0.2, yTop, az1 + 0.2], "alcoveWall");
    kit.collider([ax1, y0, z0], [ax1 + 0.2, yTop, oz0], "alcovePier");
    kit.collider([ax1, y0, oz1], [ax1 + 0.2, yTop, az1 + 0.2], "alcovePier");
    // east face (faces the door, u = az1 + 0.2 - z): red header strip, in-use lamp, restricted stencil, threshold stripe
    const fAE = new Frame(kit, new THREE.Vector3(ax1 + 0.2, y0, az1 + 0.2), new THREE.Vector3(0, 0, -1), UP);
    fAE.box("emitRed", az1 + 0.2 - (oz0 + oz1) / 2, 2.52, 0.006, oz1 - oz0 - 0.3, 0.05, 0.012, { uv: "keep" });
    fAE.box("satinBlack", 0.55, 2.0, 0.04, 0.34, 0.16, 0.08);
    fAE.box("emitRed", 0.55, 2.0, 0.085, 0.24, 0.06, 0.01);
    stencil(fAE, 4.15, 1.6, 0.5, 0, { color: PALETTE.cream });
    stencil(fAE, 0.55, 1.5, 0.36, 8, { color: PALETTE.creamDark });
    kit.boxMM("hazard", [ax1 + 0.2, y0 + 0.001, oz0 + 0.04], [ax1 + 0.45, y0 + 0.006, oz1 - 0.04], { texel: 3 });
    // south face (guard side, u = x - x0): recording monitor (audio bars), intercom, light bar, stencil
    const fAS = new Frame(kit, new THREE.Vector3(x0, y0, az1 + 0.2), new THREE.Vector3(1, 0, 0), UP);
    fAS.box("satinBlack", 1.7, 1.55, 0.04, 1.1, 0.7, 0.08);
    fAS.box("screen10", 1.7, 1.58, 0.082, 0.96, 0.52, 0.006, { uv: "keep" });
    fAS.box("leds", 1.7, 1.24, 0.082, 0.9, 0.04, 0.006, { uv: "keep" });
    fAS.box("emitRed", 2.15, 1.24, 0.082, 0.08, 0.05, 0.006);
    fAS.box("satinBlack", 3.0, 1.45, 0.04, 0.3, 0.44, 0.08);
    fAS.box("screen5", 3.0, 1.55, 0.082, 0.22, 0.16, 0.006, { uv: "keep" });
    for (let k = 0; k < 6; k++) fAS.box("metal", 3.0, 1.26 + k * 0.03, 0.082, 0.2, 0.01, 0.004, { color: PALETTE.steel });
    stencil(fAS, 0.6, 1.6, 0.4, 14, { color: PALETTE.creamDark });
    wallLightBar(fAS, 0.3, 3.3, 2.55, "emitWhiteSoft");
    // inside: pale floor plate, acoustic tiles on all three walls, recording panel with REC lamp
    kit.boxMM("painted", [x0 + 0.02, y0 + 0.001, z0 + 0.02], [ax1 - 0.02, y0 + 0.008, az1 - 0.02], { color: PALETTE.slate, uv: "world", texel: 1 });
    const tile = (frame, u, v) => {
      frame.box("satinBlack", u, v, 0.02, 0.72, 0.72, 0.04);
      frame.box("fabric", u, v, 0.05, 0.64, 0.64, 0.02, { color: PALETTE.fabricTeal, uv: "world", texel: 2 });
    };
    for (const u of [10.0, 10.8, 12.2, 13.0]) tile(fW, u, 1.05);
    for (const u of [10.0, 10.8, 11.6, 12.4, 13.2]) tile(fW, u, 1.85);
    for (const u of [0.6, 1.4, 2.2, 3.0]) tile(fN, u, 1.85);
    for (const u of [0.6, 1.4]) tile(fN, u, 1.05);
    const fAI = new Frame(kit, new THREE.Vector3(ax1, y0, az1), new THREE.Vector3(-1, 0, 0), UP); // inner south face, faces -z, u = ax1 - x
    for (const u of [0.5, 2.9]) tile(fAI, u, 1.85);
    for (const u of [0.5, 2.9]) tile(fAI, u, 1.05);
    fAI.box("satinBlack", 1.7, 1.5, 0.04, 1.3, 0.8, 0.08);
    fAI.box("screen5", 1.4, 1.55, 0.082, 0.56, 0.42, 0.006, { uv: "keep" });
    fAI.box("screen10", 2.02, 1.55, 0.082, 0.5, 0.42, 0.006, { uv: "keep" });
    fAI.box("emitRed", 1.2, 1.22, 0.082, 0.1, 0.05, 0.006);
    fAI.box("leds", 1.85, 1.22, 0.082, 0.7, 0.04, 0.006, { uv: "keep" });
    stencil(fN, 2.2, 1.05, 0.36, 9, { color: PALETTE.creamDark });
    stencil(fN, 3.0, 1.05, 0.36, 6, { color: PALETTE.creamDark });
    // table with a cuff rail and rings along its west edge; fixed detainee seat against the west wall
    const tx = -22.45;
    const tz = 544.5;
    table(kit, tx, y0, tz, 0.9, 1.5, { h: 0.75, top: PALETTE.darkMetal });
    kit.cyl("metal", tx - 0.35, y0 + 0.8, tz, 0.02, 1.1, "z", { color: PALETTE.steel, segments: 8 });
    for (const dz of [-0.45, 0.45]) {
      kit.box("metal", tx - 0.35, y0 + 0.78, tz + dz, 0.1, 0.06, 0.06, { color: PALETTE.gunmetal });
      kit.add("metal", new THREE.TorusGeometry(0.05, 0.01, 6, 14).rotateX(Math.PI / 2), { pos: [tx - 0.2, y0 + 0.81, tz + dz], color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
    }
    kit.box("darkGloss", tx + 0.2, y0 + 0.765, tz - 0.4, 0.32, 0.02, 0.2);
    kit.box("screen9", tx + 0.2, y0 + 0.777, tz - 0.4, 0.26, 0.004, 0.14, { uv: "keep" });
    cup(kit, tx + 0.25, y0 + 0.75, tz + 0.5, PALETTE.gunmetal);
    kit.boxMM("metal", [x0 + 0.02, y0, tz - 0.4], [x0 + 0.6, y0 + 0.08, tz + 0.4], { color: PALETTE.darkMetal, texel: 2 });
    kit.boxMM("satinBlack", [x0 + 0.06, y0 + 0.08, tz - 0.35], [x0 + 0.55, y0 + 0.45, tz + 0.35]);
    kit.boxMM("satinBlack", [x0 + 0.06, y0 + 0.45, tz - 0.35], [x0 + 0.18, y0 + 1.05, tz + 0.35]);
    kit.boxMM("metal", [x0 + 0.18, y0 + 0.9, tz - 0.3], [x0 + 0.2, y0 + 0.96, tz + 0.3], { color: PALETTE.steel, texel: 2 });
    for (const dz of [-0.25, 0.25]) kit.add("metal", new THREE.TorusGeometry(0.045, 0.009, 6, 14).rotateX(Math.PI / 2), { pos: [x0 + 0.5, y0 + 0.47, tz + dz], color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
    kit.collider([x0, y0, tz - 0.4], [x0 + 0.6, y0 + 1.05, tz + 0.4], "detaineeSeat");
    kit.marker("seat", [x0 + 0.3, y0, tz], -Math.PI / 2, { id: "detention-detainee" });
    for (const z of [tz - 0.42, tz + 0.42]) stool(kit, tx + 0.9, y0, z, { face: Math.PI / 2, id: "detention-interrogator" });
    pendant(kit, ctx, tx, yTop, tz, { drop: 1.0, r: 0.3, color: 0xf4f6ff, intensity: 10, distance: 14, mat: "emitWhiteSoft", family: "cool" });
    floorStencil(kit, tx, y0 + 0.006, tz, 2.0, 10, 0);
    // ceiling camera dome in the far corner and a cream stand-off line inside the threshold
    kit.cyl("satinBlack", ax1 - 0.35, yTop - 0.02, z0 + 0.35, 0.13, 0.04, "y", { segments: 14 });
    kit.add("darkGloss", new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { pos: [ax1 - 0.35, yTop - 0.04, z0 + 0.35] });
    kit.boxMM("painted", [ax1 - 0.45, y0 + 0.009, oz0 + 0.1], [ax1 - 0.39, y0 + 0.014, oz1 - 0.1], { color: PALETTE.cream, uv: "keep" });
  }

  // ------------------------------------------------------------ floor markings, guard side
  kit.boxMM("painted", [-6.7, y0 + 0.001, 547.4], [x1 - 0.2, y0 + 0.006, 547.46], { color: PALETTE.impRed, uv: "keep" });
  kit.boxMM("painted", [-7.0, y0 + 0.001, 542.4], [-6.94, y0 + 0.006, 550.4], { color: PALETTE.cream, uv: "keep" });
  for (let x = -20.0; x < -8.0; x += 1.2) kit.boxMM("painted", [x, y0 + 0.001, 549.17], [x + 0.7, y0 + 0.006, 549.23], { color: PALETTE.cream, uv: "keep" });
  floorStencil(kit, -5.0, y0, 549.4, 0.9, 10, 0);
  floorStencil(kit, -8.6, y0, 546.4, 0.8, 1, Math.PI / 2);

  // ------------------------------------------------------------ cell corridor: floor lines, west utility chase, east control console
  kit.boxMM("painted", [-23.0, y0 + 0.001, 552.47], [-7.2, y0 + 0.006, 552.53], { color: PALETTE.impRed, uv: "keep" });
  for (let x = -22.6; x < -7.4; x += 1.2) kit.boxMM("painted", [x, y0 + 0.001, 551.77], [x + 0.8, y0 + 0.006, 551.83], { color: PALETTE.cream, uv: "keep" });
  {
    kit.boxMM("painted", [x0, y0, pz + 0.07], [-23.0, yTop, z1], { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
    const fU = new Frame(kit, new THREE.Vector3(-23.0, y0, cz), new THREE.Vector3(0, 0, -1), UP);
    for (const [u, col, r] of [[0.5, PALETTE.steel, 0.06], [0.9, PALETTE.orange, 0.04], [1.3, PALETTE.gunmetal, 0.05], [1.8, PALETTE.steel, 0.07]]) fU.cylV("metal", u, 1.5, r + 0.02, r, 2.8, { color: col, segments: 10 });
    for (const v of [0.6, 2.3]) fU.box("metal", 1.15, v, 0.06, 2.0, 0.08, 0.12, { color: PALETTE.darkMetal, texel: 2 });
    fU.box("satinBlack", 1.2, 1.4, 0.05, 0.6, 0.5, 0.1);
    fU.box("leds", 1.2, 1.5, 0.105, 0.5, 0.04, 0.006, { uv: "keep" });
    fU.box("emitRed", 1.05, 1.32, 0.105, 0.06, 0.06, 0.006);
    stencil(fU, 1.2, 0.9, 0.36, 12, { color: PALETTE.creamDark });
    fU.collider(0, 2.4, 0, 3.0, 0, 0.2, "chase");
  }
  {
    wallConsole(fS, 3.0, 1.8, "screen7");
    kit.marker("station", [x1 - 3.0, y0, z1 - 0.9], Math.PI, { id: "detention-cell-control" });
    fS.box("satinBlack", 3.0, 1.85, 0.04, 2.0, 0.7, 0.08);
    const fS2 = new Frame(kit, fS.pos(0, 0, 0.082), fS.U, fS.V);
    for (let k = 0; k < 6; k++) {
      const u = 2.2 + k * 0.32;
      sevenSegText(fS2, u, 1.98, 0, String(k + 1), 0.16, "painted", { color: PALETTE.cream });
      fS2.box(k === 3 ? "emitAmber" : "emitRed", u, 1.75, 0, 0.14, 0.06, 0.006);
    }
    fS.box("leds", 3.0, 1.55, 0.05, 1.7, 0.04, 0.02, { uv: "keep" });
    stencil(fS, 1.1, 1.8, 0.4, 14, { color: PALETTE.creamDark });
    stencil(fS, 4.7, 1.8, 0.36, 13, { color: PALETTE.cream });
    wallLightBar(fS, 0.6, 5.0, 2.6, "emitWhiteSoft");
    // guards' stool and a bin at the corridor end
    stool(kit, -3.6, y0, 554.2, { face: Math.PI / 2, id: "detention-corridor-guard" });
    kit.cyl("metal", -6.6, y0 + 0.3, 555.5, 0.2, 0.6, "y", { color: PALETTE.gunmetal, segments: 14 });
  }

  // ------------------------------------------------------------ six cells
  const fC = new Frame(kit, new THREE.Vector3(x1, y0, cz - 0.08), new THREE.Vector3(-1, 0, 0), UP); // cell fronts, u = x1 - x
  const tex = scanlineTexture();
  tex.repeat.set(1, 36);
  const fieldMats = [holoMaterial(0xffb0a0, 0.14, tex), holoMaterial(0xffb0a0, 0.14, tex)]; // thin enough to see the lit cell behind
  const fieldGeos = [[], []];
  for (const { xa, xb, n } of cells) {
    const xc = (xa + xb) / 2;
    // side wall (west of the cell) in pale grey so the cell lamp has something to light; satin base and cap
    kit.boxMM("painted", [xa - 0.2, y0, cz - 0.08], [xa, yTop, z1], { color: PALETTE.impGrey, uv: "world", texel: 0.8 });
    kit.boxMM("satinBlack", [xa - 0.21, yTop - 0.18, cz], [xa + 0.01, yTop, z1]);
    kit.boxMM("satinBlack", [xa - 0.21, y0, cz + 0.09], [xa + 0.01, y0 + 0.1, z1]);
    // pale back-wall liner with a vent grille and a lighter floor plate
    kit.boxMM("painted", [xa + 0.01, y0 + 0.1, z1 - 0.04], [xb - 0.01, yTop - 0.18, z1], { color: PALETTE.impGrey, uv: "world", texel: 0.8 });
    kit.boxMM("satinBlack", [xa + 0.01, y0, z1 - 0.05], [xb - 0.01, y0 + 0.1, z1]);
    kit.boxMM("painted", [xa + 0.01, y0 + 0.001, cz + 0.09], [xb - 0.01, y0 + 0.008, z1 - 0.05], { color: PALETTE.slate, uv: "world", texel: 1 });
    for (let k = 0; k < 6; k++) kit.box("metal", xc, y0 + 2.3 + k * 0.05, z1 - 0.06, 0.6, 0.015, 0.02, { color: PALETTE.gunmetal });
    // front panels, header
    for (const [wa, wb] of [[xa, xa + 0.5], [xb - 0.5, xb]]) kit.boxMM("painted", [wa, y0, cz - 0.08], [wb, yTop, cz + 0.08], { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
    kit.boxMM("painted", [xa + 0.5, y0 + 2.25, cz - 0.08], [xb - 0.5, yTop, cz + 0.08], { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
    kit.boxMM("rubber", [xa, y0, cz - 0.09], [xb, y0 + 0.08, cz + 0.09], { color: PALETTE.rubber, texel: 2 });
    // door frame, sill, emitter rails
    kit.boxMM("satinBlack", [xa + 0.44, y0, cz - 0.12], [xa + 0.58, y0 + 2.32, cz + 0.12]);
    kit.boxMM("satinBlack", [xb - 0.58, y0, cz - 0.12], [xb - 0.44, y0 + 2.32, cz + 0.12]);
    kit.boxMM("satinBlack", [xa + 0.44, y0 + 2.18, cz - 0.12], [xb - 0.44, y0 + 2.32, cz + 0.12]);
    kit.boxMM("metal", [xa + 0.5, y0, cz - 0.12], [xb - 0.5, y0 + 0.06, cz + 0.12], { color: PALETTE.steel, texel: 2 });
    kit.boxMM("emitRed", [xa + 0.58, y0 + 0.1, cz - 0.02], [xa + 0.61, y0 + 2.15, cz + 0.02]);
    kit.boxMM("emitRed", [xb - 0.61, y0 + 0.1, cz - 0.02], [xb - 0.58, y0 + 2.15, cz + 0.02]);
    kit.boxMM("emitRed", [xa + 0.61, y0 + 2.14, cz - 0.02], [xb - 0.61, y0 + 2.17, cz + 0.02]);
    // status lamp over the door, cell number on the left panel, HV stencil on the right
    kit.box("satinBlack", xc, y0 + 2.6, cz - 0.11, 0.34, 0.14, 0.06);
    kit.box("emitRed", xc, y0 + 2.6, cz - 0.145, 0.24, 0.06, 0.01);
    sevenSegText(fC, x1 - (xb - 0.25), 1.75, 0.003, "0" + n, 0.34, "painted", { color: PALETTE.cream });
    fC.box("leds", x1 - (xb - 0.25), 1.45, 0.004, 0.3, 0.03, 0.006, { uv: "keep" });
    stencil(fC, x1 - (xa + 0.25), 1.55, 0.3, 5, { plate: false });
    // containment field
    const g = new THREE.PlaneGeometry(1.22, 2.1);
    g.translate(xc, y0 + 1.11, cz);
    fieldGeos[n % 2].push(g);
    kit.collider([xa + 0.5, y0, cz - 0.06], [xb - 0.5, y0 + 2.2, cz + 0.06], "field");
    // cot along the west wall (seen through the field from the door): steel frame on two legs, grey pad,
    // folded blanket, pillow at the back end
    const cx0 = xa + 0.12;
    const cx1 = xa + 0.92;
    const cz0 = cz + 0.45;
    const cz1 = cz + 2.45;
    kit.boxMM("metal", [cx0, y0 + 0.4, cz0], [cx1, y0 + 0.46, cz1], { color: PALETTE.gunmetal, texel: 2 });
    for (const z of [cz0 + 0.1, cz1 - 0.1]) kit.box("satinBlack", (cx0 + cx1) / 2, y0 + 0.2, z, 0.6, 0.4, 0.08);
    kit.boxMM("metal", [cx0 - 0.02, y0 + 0.44, cz0 - 0.02], [cx1 + 0.02, y0 + 0.47, cz1 + 0.02], { color: PALETTE.steel, texel: 2 });
    kit.boxMM("fabric", [cx0 + 0.04, y0 + 0.47, cz0 + 0.04], [cx1 - 0.04, y0 + 0.55, cz1 - 0.04], { color: PALETTE.fabricCream, uv: "world", texel: 2 });
    kit.boxMM("fabric", [cx0 + 0.06, y0 + 0.55, cz0 + 0.7], [cx1 - 0.06, y0 + 0.61, cz1 - 0.5], { color: PALETTE.fabricTeal, uv: "world", texel: 2 });
    kit.box("fabric", (cx0 + cx1) / 2, y0 + 0.59, cz1 - 0.25, 0.5, 0.08, 0.34, { color: PALETTE.impWhite, uv: "world", texel: 2 });
    kit.collider([cx0, y0, cz0], [cx1, y0 + 0.62, cz1], "cot");
    kit.marker("idle", [xc + 0.3, y0, cz + 1.6], Math.PI / 2, { id: "detention-cell-" + n });
    // sanitary unit in the back-east corner: toilet block and a basin column on the east wall
    kit.box("satinBlack", xb - 0.32, y0 + 0.22, z1 - 0.34, 0.44, 0.44, 0.44);
    kit.cyl("metal", xb - 0.32, y0 + 0.455, z1 - 0.34, 0.18, 0.03, "y", { color: PALETTE.steel, segments: 14 });
    kit.box("satinBlack", xb - 0.3, y0 + 0.5, z1 - 1.05, 0.5, 1.0, 0.5);
    kit.cyl("metal", xb - 0.3, y0 + 1.015, z1 - 1.05, 0.16, 0.03, "y", { color: PALETTE.steel, segments: 14 });
    kit.cyl("metal", xb - 0.1, y0 + 1.12, z1 - 1.05, 0.012, 0.2, "y", { color: PALETTE.steel, segments: 6 });
    kit.collider([xb - 0.58, y0, z1 - 1.32], [xb, y0 + 1.1, z1], "sanitary");
    // caged ceiling lamp with its practical, red strip over the back wall, cream threshold line
    kit.box("satinBlack", xc, yTop - 0.03, cz + 1.5, 0.56, 0.06, 0.3);
    kit.box("emitWhite", xc, yTop - 0.065, cz + 1.5, 0.46, 0.012, 0.18, { uv: "keep" });
    for (let k = -1; k <= 1; k++) kit.box("metal", xc + k * 0.16, yTop - 0.085, cz + 1.5, 0.012, 0.012, 0.3, { color: PALETTE.steel });
    kit.box("metal", xc, yTop - 0.085, cz + 1.5, 0.5, 0.012, 0.012, { color: PALETTE.steel });
    ctx.lights.cool.push(pointLight(0xfff1e6, 7, 10, [xc, yTop - 0.45, cz + 1.5]));
    kit.boxMM("emitRedSoft", [xa + 0.3, y0 + 2.2, z1 - 0.07], [xb - 0.3, y0 + 2.25, z1 - 0.04], { uv: "keep" });
    kit.boxMM("painted", [xa + 0.3, y0 + 0.009, cz + 0.2], [xb - 0.3, y0 + 0.014, cz + 0.26], { color: PALETTE.cream, uv: "keep" });
  }
  const last = cells[cells.length - 1];
  kit.boxMM("painted", [last.xb, y0, cz - 0.08], [last.xb + 0.1, yTop, z1], { color: PALETTE.impGrey, uv: "world", texel: 0.8 });
  kit.boxMM("painted", [last.xb + 0.1, y0, cz - 0.08], [last.xb + 0.2, yTop, z1], { color: PALETTE.impGreyDark, uv: "world", texel: 0.8 });
  kit.boxMM("satinBlack", [last.xb - 0.01, yTop - 0.18, cz], [last.xb + 0.21, yTop, z1]);
  kit.boxMM("satinBlack", [last.xb - 0.01, y0, cz + 0.09], [last.xb + 0.21, y0 + 0.1, z1]);
  for (const { xa } of cells) kit.collider([xa - 0.2, y0, cz - 0.14], [xa, yTop, z1], "cellWall");
  kit.collider([last.xb, y0, cz - 0.14], [last.xb + 0.2, yTop, z1], "cellWall");
  for (const { xa, xb } of cells) {
    kit.collider([xa, y0, cz - 0.14], [xa + 0.6, yTop, cz + 0.14], "cellFront");
    kit.collider([xb - 0.6, y0, cz - 0.14], [xb, yTop, cz + 0.14], "cellFront");
  }
  // east-end block face (x = -7.2): stencil and a light bar over the corridor end
  {
    const fE = new Frame(kit, new THREE.Vector3(last.xb + 0.2, y0, z1), new THREE.Vector3(0, 0, -1), UP); // faces +x, u = z1 - z
    stencil(fE, 1.5, 1.7, 0.5, 14, { color: PALETTE.cream });
    stencil(fE, 0.6, 1.7, 0.3, 5, { plate: false });
    wallLightBar(fE, 0.3, 2.8, 2.55, "emitWhiteSoft");
  }

  // ------------------------------------------------------------ fields: scrolling scanlines + out-of-phase opacity pulse
  {
    const group = new THREE.Group();
    group.name = "cellFields";
    fieldGeos.forEach((gs, k) => {
      const m = new THREE.Mesh(mergeGeometries(gs, false), fieldMats[k]);
      m.castShadow = m.receiveShadow = false;
      group.add(m);
    });
    let t = 0;
    ctx.dynamic.push({
      object: group,
      update(dt) {
        t += dt;
        tex.offset.y = (tex.offset.y + dt * 0.11) % 1;
        fieldMats[0].opacity = 0.1 + 0.06 * (0.5 + 0.5 * Math.sin(t * 2.3));
        fieldMats[1].opacity = 0.1 + 0.06 * (0.5 + 0.5 * Math.sin(t * 2.3 + 1.9));
      },
    });
  }
  return shell;
}
