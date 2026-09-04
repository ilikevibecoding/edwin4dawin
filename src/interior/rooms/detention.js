// Security and detention block (deck B, port, x -24..-2 / z 542..556, h 3.0). A barred security
// partition with a scanner gate splits the room lengthwise. Guard side: checkpoint desk with red
// monitors under a monitor wall, the guards' rifle rack, an evidence safe, a detainee processing bench
// with restraint rings, effects lockers, an interrogation table under a harsh pendant and a sealed heavy
// door. Behind the bars a 2.4 m corridor runs past six 2.4 m cells (bunk slab, sanitary unit, harsh
// ceiling light), each sealed by a shimmering red containment field between emitter rails.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { PALETTE } from "../../materials.js";
import { pointLight, Frame } from "../lib.js";
import { stencil, floorStencil, locker, rifleRack, stool, table, crate, pendant, standFrame, sevenSegText, scanlineTexture, holoMaterial, UP } from "./aftProps.js";

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

  // ------------------------------------------------------------ lights: harsh white mains, red at the gate and cells
  ctx.lights.cool.push(pointLight(0xf2f4ff, 12, 13, [-4.8, yTop - 0.4, 546.6]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 12, 13, [-11.5, yTop - 0.4, 546.4]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 12, 13, [-19.0, yTop - 0.4, 546.4]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 10, 11, [-8.5, yTop - 0.35, 551.9]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 10, 11, [-15.0, yTop - 0.35, 551.9]));
  ctx.lights.cool.push(pointLight(0xf2f4ff, 10, 11, [-21.5, yTop - 0.35, 551.9]));
  ctx.lights.teal.push(pointLight(0xff3020, 4, 8, [-5.0, yTop - 0.5, 551.6]));
  ctx.lights.teal.push(pointLight(0xff3020, 4, 8, [-12.0, yTop - 0.6, 552.6]));
  ctx.lights.teal.push(pointLight(0xff3020, 4, 8, [-19.0, yTop - 0.6, 552.6]));
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
    // partition stencils, guard side
    const fP = new Frame(kit, new THREE.Vector3(x1, y0, pz - 0.05), new THREE.Vector3(-1, 0, 0), UP);
    stencil(fP, x1 - gate[1] + 0.9, 0.55, 0.36, 13, { plate: false });
    stencil(fP, x1 + 8.6, 0.55, 0.36, 5, { plate: false });
    stencil(fP, x1 + 16.4, 0.55, 0.36, 5, { plate: false });
    stencil(fP, x1 + 11.2, 0.55, 0.5, 14, { plate: false });
  }

  // ------------------------------------------------------------ guard checkpoint desk + monitor wall
  {
    const dz0 = 545.9;
    const dz1 = 546.7;
    kit.boxMM("satinBlack", [-6.6, y0 + 0.02, dz0], [x1 - 0.02, y0 + 0.86, dz1]);
    kit.boxMM("rubber", [-6.62, y0, dz0 - 0.02], [x1 - 0.02, y0 + 0.08, dz1 + 0.02], { color: PALETTE.rubber, texel: 2 });
    kit.boxMM("metal", [-6.66, y0 + 0.86, dz0 - 0.06], [x1 - 0.02, y0 + 0.9, dz1 + 0.06], { color: PALETTE.steel, texel: 2 });
    kit.boxMM("painted", [-6.5, y0 + 0.42, dz1 + 0.002], [x1 - 0.1, y0 + 0.48, dz1 + 0.014], { color: PALETTE.impRed, uv: "keep" });
    kit.boxMM("leds", [-6.4, y0 + 0.78, dz1 + 0.002], [x1 - 0.2, y0 + 0.81, dz1 + 0.01], { uv: "keep" });
    for (const x of [-5.6, -4.4, -3.2]) kit.boxMM("metal", [x - 0.006, y0 + 0.15, dz1 + 0.002], [x + 0.006, y0 + 0.74, dz1 + 0.02], { color: PALETTE.darkMetal });
    // inner work surface, keyboard, three tilted red monitors facing the guard, a hand scanner for the public side
    kit.boxMM("satinBlack", [-6.5, y0 + 0.72, dz0 - 0.36], [x1 - 0.1, y0 + 0.75, dz0]);
    for (const x of [-5.8, -4.0]) kit.box("satinBlack", x, y0 + 0.36, dz0 - 0.18, 0.08, 0.72, 0.34);
    kit.box("darkGloss", -4.6, y0 + 0.765, dz0 - 0.18, 0.5, 0.02, 0.18);
    kit.box("leds", -4.6, y0 + 0.777, dz0 - 0.18, 0.42, 0.004, 0.1, { uv: "keep" });
    const fD = standFrame(kit, -2.1, y0 + 0.9, dz0 + 0.42, "-z"); // u runs west along the desk top
    for (const u of [1.0, 2.1, 3.2]) {
      fD.box("satinBlack", u, 0.05, 0, 0.14, 0.1, 0.1);
      fD.box("darkGloss", u, 0.28, 0.02, 0.5, 0.36, 0.04, { tilt: -0.28 });
      fD.box("screen5", u, 0.285, 0.044, 0.44, 0.3, 0.006, { tilt: -0.28, uv: "keep" });
    }
    kit.box("darkGloss", -6.2, y0 + 0.91, dz1 - 0.2, 0.3, 0.02, 0.2);
    kit.box("emitRed", -6.2, y0 + 0.922, dz1 - 0.2, 0.2, 0.004, 0.02);
    kit.box("metal", -2.7, y0 + 0.93, dz1 - 0.15, 0.4, 0.03, 0.22, { color: PALETTE.darkMetal, texel: 2 });
    stool(kit, -4.6, y0, 545.15);
    kit.collider([-6.7, y0, dz0 - 0.4], [x1, y0 + 0.95, dz1 + 0.1], "desk");
    // monitor wall above the desk end: six red feeds, status strip
    fX.box("satinBlack", 3.0, 1.85, 0.04, 3.7, 1.5, 0.08);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) fX.box("screen5", 1.85 + c * 1.15, 1.5 + r * 0.7, 0.082, 1.05, 0.6, 0.006, { uv: "keep" });
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
    // aft of the partition: fire cabinet + comm panel on the corridor's east end
    fX.box("metal", 9.6, 1.2, 0.08, 0.9, 1.1, 0.16, { color: PALETTE.gunmetal, texel: 1.5 });
    fX.box("painted", 9.6, 1.2, 0.165, 0.76, 0.96, 0.01, { color: PALETTE.impRed, uv: "keep" });
    stencil(fX, 9.6, 1.35, 0.4, 13, { color: PALETTE.cream, n: 0.17 });
    fX.box("metal", 9.6, 0.85, 0.19, 0.4, 0.05, 0.05, { color: PALETTE.steel });
    fX.collider(9.1, 10.1, 0, 1.8, 0, 0.2, "fireCabinet");
    fX.box("satinBlack", 12.2, 1.6, 0.04, 1.6, 0.9, 0.08);
    fX.box("screen5", 11.9, 1.6, 0.082, 0.8, 0.6, 0.006, { uv: "keep" });
    for (let k = 0; k < 6; k++) fX.box(k % 2 ? "emitRed" : "emitWhite", 12.55 + (k % 2) * 0.18, 1.85 - Math.floor(k / 2) * 0.16, 0.082, 0.12, 0.06, 0.006);
    fX.box("leds", 12.2, 1.1, 0.05, 1.3, 0.04, 0.02, { uv: "keep" });
    wallLightBar(fX, 9.0, 13.6, 2.6, "emitWhiteSoft");
  }

  // ------------------------------------------------------------ forward wall: lockers, console, processing bench, safe, guards' rack
  {
    for (let k = 0; k < 6; k++) locker(fN, 1.4 + k * 0.82, 0.78, 1.9, { color: PALETTE.impGreyDark, band: PALETTE.impRed, decal: [9, 6, 9, 14, 9, 6][k] });
    wallLightBar(fN, 0.9, 6.3, 2.5, "emitWhiteSoft");
    stencil(fN, 3.45, 2.2, 0.36, 11, { color: PALETTE.creamDark });
    wallConsole(fN, 7.4, 1.6, "screen5");
    stencil(fN, 7.4, 1.95, 0.42, 6, { color: PALETTE.creamDark });
    wallLightBar(fN, 6.5, 8.3, 2.5, "emitWhiteSoft");
    // processing bench: bare slab, cuff rail and restraint rings, red stand-off line
    const bx0 = -15.4;
    const bx1 = -10.4;
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
    stencil(fN, 11.1, 1.7, 0.5, 1, { color: PALETTE.cream });
    stencil(fN, 9.4, 1.6, 0.36, 9, { color: PALETTE.creamDark });
    stencil(fN, 12.8, 1.6, 0.36, 9, { color: PALETTE.creamDark });
    wallLightBar(fN, 8.6, 13.6, 2.5, "emitWhiteSoft");
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
    wallLightBar(fN, 14.6, 17.2, 2.5, "emitWhiteSoft");
    // guards' rifle rack inside the checkpoint pocket
    rifleRack(fN, 17.6, 21.0);
    stencil(fN, 19.3, 2.4, 0.36, 5, { plate: false });
    wallLightBar(fN, 17.5, 21.6, 2.65, "emitWhiteSoft");
    // effects crates by the lockers
    crate(kit, -22.6, y0 + 0.25, 543.4, 0.8, 0.48, 0.6, PALETTE.impGreyDark, { decal: 11, face: "+x", collide: true });
    crate(kit, -22.6, y0 + 0.73, 543.4, 0.8, 0.48, 0.6, PALETTE.gunmetal, { decal: 9, face: "+x", band: false, collide: true });
    crate(kit, -21.7, y0 + 0.25, 543.5, 0.8, 0.48, 0.6, PALETTE.slate, { decal: 14, face: "+x", collide: true });
  }

  // ------------------------------------------------------------ west wall: sealed heavy door, keypad, console
  {
    const du = 9.2;
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
    fW.box("darkGloss", 11.0, 1.35, 0.04, 0.3, 0.5, 0.08);
    fW.box("screen5", 11.0, 1.45, 0.082, 0.22, 0.18, 0.006, { uv: "keep" });
    for (let k = 0; k < 6; k++) fW.box(k === 4 ? "emitRed" : "leds", 10.9 + (k % 2) * 0.12, 1.24 - Math.floor(k / 2) * 0.08, 0.082, 0.08, 0.05, 0.006, { uv: "keep" });
    wallConsole(fW, 12.6, 1.5, "screen5");
    stencil(fW, 12.6, 1.95, 0.4, 9, { color: PALETTE.creamDark });
    wallLightBar(fW, 5.8, 13.6, 2.6, "emitWhiteSoft");
    stencil(fW, 6.6, 1.7, 0.5, 1, { color: PALETTE.cream });
  }

  // ------------------------------------------------------------ interrogation table under a harsh pendant
  {
    const tx = -19.4;
    const tz = 546.6;
    table(kit, tx, y0, tz, 1.6, 0.9, { h: 0.75, top: PALETTE.darkMetal });
    kit.cyl("metal", tx, y0 + 0.8, tz, 0.02, 1.2, "x", { color: PALETTE.steel, segments: 8 });
    for (const dx of [-0.5, 0.5]) {
      kit.box("metal", tx + dx, y0 + 0.78, tz, 0.06, 0.06, 0.1, { color: PALETTE.gunmetal });
      kit.add("metal", new THREE.TorusGeometry(0.05, 0.01, 6, 14).rotateX(Math.PI / 2), { pos: [tx + dx, y0 + 0.81, tz + 0.2], color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
    }
    kit.box("darkGloss", tx - 0.35, y0 + 0.765, tz - 0.25, 0.32, 0.02, 0.2);
    kit.box("screen5", tx - 0.35, y0 + 0.777, tz - 0.25, 0.26, 0.004, 0.14, { uv: "keep" });
    stool(kit, tx, y0, tz - 0.85);
    stool(kit, tx - 0.5, y0, tz + 0.85);
    stool(kit, tx + 0.5, y0, tz + 0.85);
    pendant(kit, ctx, tx, yTop, tz, { drop: 1.0, r: 0.3, color: 0xf4f6ff, intensity: 7, distance: 9, mat: "emitWhiteSoft", family: "cool" });
    floorStencil(kit, tx, y0, tz, 2.6, 10, 0);
    kit.boxMM("painted", [tx - 1.6, y0 + 0.001, tz - 1.6], [tx + 1.6, y0 + 0.006, tz - 1.54], { color: PALETTE.cream, uv: "keep" });
    kit.boxMM("painted", [tx - 1.6, y0 + 0.001, tz + 1.54], [tx + 1.6, y0 + 0.006, tz + 1.6], { color: PALETTE.cream, uv: "keep" });
  }

  // ------------------------------------------------------------ floor markings, guard side
  kit.boxMM("painted", [-6.7, y0 + 0.001, 547.4], [x1 - 0.2, y0 + 0.006, 547.46], { color: PALETTE.impRed, uv: "keep" });
  kit.boxMM("painted", [-7.0, y0 + 0.001, 542.4], [-6.94, y0 + 0.006, 550.4], { color: PALETTE.cream, uv: "keep" });
  for (let x = -22.4; x < -8.0; x += 1.2) kit.boxMM("painted", [x, y0 + 0.001, 549.17], [x + 0.7, y0 + 0.006, 549.23], { color: PALETTE.cream, uv: "keep" });
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
    wallConsole(fS, 3.0, 1.8, "screen5");
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
    stool(kit, -3.6, y0, 554.2);
    kit.cyl("metal", -6.6, y0 + 0.3, 555.5, 0.2, 0.6, "y", { color: PALETTE.gunmetal, segments: 14 });
  }

  // ------------------------------------------------------------ six cells
  const fC = new Frame(kit, new THREE.Vector3(x1, y0, cz - 0.08), new THREE.Vector3(-1, 0, 0), UP); // cell fronts, u = x1 - x
  const tex = scanlineTexture();
  tex.repeat.set(1, 36);
  const fieldMats = [holoMaterial(0xffb0a0, 0.2, tex), holoMaterial(0xffb0a0, 0.2, tex)];
  const fieldGeos = [[], []];
  for (const { xa, xb, n } of cells) {
    const xc = (xa + xb) / 2;
    // side wall (west of the cell), front panels, header
    kit.boxMM("painted", [xa - 0.2, y0, cz - 0.08], [xa, yTop, z1], { color: PALETTE.impGreyDark, uv: "world", texel: 0.8 });
    kit.boxMM("satinBlack", [xa - 0.21, yTop - 0.18, cz], [xa + 0.01, yTop, z1]);
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
    // bunk slab with pad and pillow along the back wall
    kit.boxMM("metal", [xa + 0.2, y0 + 0.42, z1 - 0.85], [xb - 0.2, y0 + 0.48, z1 - 0.04], { color: PALETTE.gunmetal, texel: 2 });
    for (const x of [xa + 0.35, xb - 0.35]) kit.box("satinBlack", x, y0 + 0.21, z1 - 0.42, 0.1, 0.42, 0.7);
    kit.boxMM("fabric", [xa + 0.25, y0 + 0.48, z1 - 0.8], [xb - 0.25, y0 + 0.54, z1 - 0.08], { color: PALETTE.impGreyDark, uv: "world", texel: 2 });
    kit.box("fabric", xa + 0.6, y0 + 0.58, z1 - 0.45, 0.5, 0.08, 0.34, { color: PALETTE.fabricCream, uv: "world", texel: 2 });
    kit.collider([xa + 0.2, y0, z1 - 0.9], [xb - 0.2, y0 + 0.6, z1], "bunk");
    // sanitary unit against the west wall near the front
    kit.box("satinBlack", xa + 0.28, y0 + 0.5, cz + 0.6, 0.5, 1.0, 0.5);
    kit.cyl("metal", xa + 0.28, y0 + 1.015, cz + 0.6, 0.16, 0.03, "y", { color: PALETTE.steel, segments: 14 });
    kit.cyl("metal", xa + 0.1, y0 + 1.12, cz + 0.6, 0.012, 0.2, "y", { color: PALETTE.steel, segments: 6 });
    kit.box("satinBlack", xa + 0.28, y0 + 0.22, cz + 1.25, 0.44, 0.44, 0.44);
    kit.cyl("metal", xa + 0.28, y0 + 0.455, cz + 1.25, 0.18, 0.03, "y", { color: PALETTE.steel, segments: 14 });
    kit.collider([xa, y0, cz + 0.3], [xa + 0.56, y0 + 1.1, cz + 1.5], "sanitary");
    // harsh ceiling light, vent slats, red strip over the bunk, inner cell number
    kit.box("satinBlack", xc, yTop - 0.03, 554.5, 0.7, 0.06, 0.28);
    kit.box("emitWhite", xc, yTop - 0.065, 554.5, 0.6, 0.012, 0.16, { uv: "keep" });
    for (let k = 0; k < 5; k++) kit.box("metal", xb - 0.03, y0 + 2.45 + k * 0.05, cz + 1.0, 0.02, 0.015, 0.4, { color: PALETTE.steel });
    kit.boxMM("emitRedSoft", [xa + 0.3, y0 + 2.35, z1 - 0.03], [xb - 0.3, y0 + 2.4, z1 - 0.005], { uv: "keep" });
    kit.boxMM("painted", [xa + 0.3, y0 + 0.001, cz + 0.2], [xb - 0.3, y0 + 0.006, cz + 0.26], { color: PALETTE.cream, uv: "keep" });
  }
  const last = cells[cells.length - 1];
  kit.boxMM("painted", [last.xb, y0, cz - 0.08], [last.xb + 0.2, yTop, z1], { color: PALETTE.impGreyDark, uv: "world", texel: 0.8 });
  kit.boxMM("satinBlack", [last.xb - 0.01, yTop - 0.18, cz], [last.xb + 0.21, yTop, z1]);
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
        fieldMats[0].opacity = 0.15 + 0.07 * (0.5 + 0.5 * Math.sin(t * 2.3));
        fieldMats[1].opacity = 0.15 + 0.07 * (0.5 + 0.5 * Math.sin(t * 2.3 + 1.9));
      },
    });
  }
  return shell;
}
