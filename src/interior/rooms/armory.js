// Armoury (deck B, starboard, x 2..18 / z 526..540, h 3.0). A floor-to-ceiling grated partition with a
// barred issue counter and an open gate splits the room: the issue side has the weapons-check terminal,
// a queue rail, waiting bench, personal lockers and a heavy locked cabinet; the cage holds rifle racks
// (wall and free-standing), helmet / armour shelves, power-cell crates and red status lighting.
import * as THREE from "three";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { PALETTE } from "../../materials.js";
import { pointLight } from "../lib.js";
import { stencil, floorStencil, bench, locker, rifle, rifleRack, helmet, chestPlate, crate, grateQuad } from "./aftProps.js";

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", lights: false, lightRows: 2, lightMat: "emitCoolSoft", seed: 51 });
  const { y0, yTop, frames } = shell;
  const { x0, x1, z0, z1 } = room;
  const fW = frames["-x"].frame; // door wall, u = z1 - z
  const fE = frames["+x"].frame; // far wall (rifle racks), u = z - z0
  const fN = frames["-z"].frame; // forward wall (cabinet, terminal, helmet shelves), u = x - x0
  const fS = frames["+z"].frame; // aft wall (lockers, crates), u = x1 - x
  const px = 7.0; // partition plane

  // ------------------------------------------------------------ lights
  // The pool keeps the 14 best-scoring fixtures (intensity / distance^2 from the camera), so the room
  // uses a few strong practicals: two over the issue side, one over the counter, one just behind the
  // barred window, two in the cage and one over the far-wall racks; red accents sit low over the racks
  // and the counter.
  ctx.lights.cool.push(pointLight(0xe0e8ff, 11, 14, [4.6, yTop - 0.4, 529.5]));
  ctx.lights.cool.push(pointLight(0xe0e8ff, 11, 14, [4.6, yTop - 0.4, 536.5]));
  ctx.lights.cool.push(pointLight(0xe0e8ff, 10, 12, [5.8, yTop - 0.4, 533]));
  ctx.lights.cool.push(pointLight(0xe0e8ff, 14, 14, [8.6, yTop - 0.4, 533]));
  ctx.lights.cool.push(pointLight(0xe0e8ff, 16, 15, [10.5, yTop - 0.4, 530.5]));
  ctx.lights.cool.push(pointLight(0xe0e8ff, 16, 15, [10.5, yTop - 0.4, 535.5]));
  ctx.lights.cool.push(pointLight(0xe0e8ff, 18, 16, [16.2, yTop - 0.4, 533]));
  ctx.lights.teal.push(pointLight(0xff3a2a, 5, 10, [12.5, yTop - 0.5, 533]));
  ctx.lights.teal.push(pointLight(0xff3a2a, 4, 9, [16.8, yTop - 0.7, 529.5]));
  ctx.lights.teal.push(pointLight(0xff3a2a, 4, 9, [16.8, yTop - 0.7, 535.5]));
  ctx.lights.teal.push(pointLight(0xff3a2a, 2.5, 7, [6.5, yTop - 0.8, 533]));

  // ------------------------------------------------------------ partition: posts, rails, solid skirts, grate, counter, gate
  {
    const post = (z, h = 3.0) => kit.box("satinBlack", px, y0 + h / 2, z, 0.12, h, 0.12);
    for (const z of [526.15, 530.4, 535.6, 536.1, 537.5, 538.4, 539.85]) post(z);
    kit.boxMM("satinBlack", [px - 0.06, yTop - 0.12, z0], [px + 0.06, yTop, z1]);
    const grateWall = (za, zb, ya, yb) => {
      const g = new THREE.PlaneGeometry(zb - za, yb - ya);
      g.rotateY(Math.PI / 2);
      grateQuad(kit, g, [px, y0 + (ya + yb) / 2, (za + zb) / 2], zb - za, yb - ya);
      kit.boxMM("metal", [px - 0.04, y0 + ya - 0.04, za], [px + 0.04, y0 + ya + 0.04, zb], { color: PALETTE.gunmetal, texel: 2 });
      kit.boxMM("metal", [px - 0.04, y0 + yb - 0.04, za], [px + 0.04, y0 + yb + 0.04, zb], { color: PALETTE.gunmetal, texel: 2 });
    };
    const skirt = (za, zb) => {
      kit.boxMM("painted", [px - 0.05, y0 + 0.02, za], [px + 0.05, y0 + 1.0, zb], { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
      kit.boxMM("rubber", [px - 0.06, y0, za], [px + 0.06, y0 + 0.08, zb], { color: PALETTE.rubber, texel: 2 });
    };
    skirt(526.2, 530.4);
    grateWall(526.2, 530.4, 1.0, 2.88);
    skirt(535.6, 536.1);
    grateWall(535.6, 536.1, 1.0, 2.88);
    grateWall(536.1, 537.5, 2.55, 2.88);
    skirt(537.5, 539.85);
    grateWall(537.5, 539.85, 1.0, 2.88);
    // stencils on the issue side of the skirts
    const fP = new lib.Frame(kit, new THREE.Vector3(px - 0.05, y0, z1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
    stencil(fP, z1 - 528.3, 0.55, 0.42, 1, { plate: false });
    stencil(fP, z1 - 538.7, 0.55, 0.42, 5, { plate: false });
    stencil(fP, z1 - 529.6, 0.55, 0.3, 8, { plate: false });
    // counter with a barred window above it
    kit.boxMM("painted", [6.35, y0 + 0.02, 530.4], [px + 0.05, y0 + 0.88, 535.6], { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
    kit.boxMM("rubber", [6.33, y0, 530.4], [px + 0.06, y0 + 0.08, 535.6], { color: PALETTE.rubber, texel: 2 });
    kit.boxMM("metal", [6.25, y0 + 0.88, 530.35], [px + 0.1, y0 + 0.94, 535.65], { color: PALETTE.steel, texel: 2 });
    kit.boxMM("painted", [6.34, y0 + 0.4, 530.5], [6.36, y0 + 0.46, 535.5], { color: PALETTE.orange, uv: "keep" });
    kit.boxMM("leds", [6.34, y0 + 0.8, 530.6], [6.35, y0 + 0.83, 535.4], { uv: "keep" });
    for (const z of [531.7, 533.0, 534.3]) kit.boxMM("metal", [6.34, y0 + 0.15, z - 0.006], [6.36, y0 + 0.78, z + 0.006], { color: PALETTE.darkMetal });
    kit.boxMM("metal", [px - 0.04, y0 + 1.22, 530.4], [px + 0.04, y0 + 1.28, 535.6], { color: PALETTE.gunmetal, texel: 2 });
    kit.boxMM("metal", [px - 0.04, y0 + 2.05, 530.4], [px + 0.04, y0 + 2.11, 535.6], { color: PALETTE.gunmetal, texel: 2 });
    for (let z = 530.55; z < 535.6; z += 0.16) kit.cyl("metal", px, y0 + 2.06, z, 0.018, 1.64, "y", { color: PALETTE.steel, segments: 8 });
    // pass-through tray, hand scanner and the check terminal on the counter
    kit.box("metal", 6.7, y0 + 0.955, 532.2, 0.6, 0.03, 0.42, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("metal", 6.7, y0 + 0.985, 532.0, 0.6, 0.03, 0.02, { color: PALETTE.steel });
    kit.box("darkGloss", 6.6, y0 + 0.95, 533.3, 0.28, 0.02, 0.2);
    kit.box("emitRed", 6.6, y0 + 0.962, 533.3, 0.2, 0.004, 0.02);
    kit.box("satinBlack", 6.6, y0 + 1.15, 534.6, 0.36, 0.34, 0.06, { rot: [0, 0.2, 0.0] });
    kit.box("screen5", 6.565, y0 + 1.16, 534.6, 0.008, 0.26, 0.3, { rot: [0, 0.2, 0], uv: "keep" });
    kit.cyl("metal", 6.6, y0 + 0.97, 534.6, 0.05, 0.06, "y", { color: PALETTE.gunmetal, segments: 12 });
    kit.collider([6.25, y0, 530.35], [px + 0.1, y0 + 1.0, 535.65], "counter");
    kit.collider([px - 0.1, y0, z0], [px + 0.1, yTop, 536.15], "partition");
    kit.collider([px - 0.1, y0, 537.45], [px + 0.1, yTop, z1], "partition");
    // gate: header, open barred leaf parked against the cage side, status lamp
    kit.boxMM("satinBlack", [px - 0.08, y0 + 2.42, 536.05], [px + 0.08, y0 + 2.56, 537.55]);
    kit.box("emitRed", px, y0 + 2.5, 536.8, 0.12, 0.05, 0.02);
    const gx = px + 0.16;
    kit.boxMM("satinBlack", [gx - 0.03, y0 + 0.02, 537.55], [gx + 0.03, y0 + 2.4, 538.85]);
    kit.boxMM("painted", [gx - 0.04, y0 + 0.02, 537.55], [gx + 0.04, y0 + 0.9, 538.85], { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
    for (let z = 537.7; z < 538.85; z += 0.14) kit.cyl("metal", gx, y0 + 1.65, z, 0.016, 1.5, "y", { color: PALETTE.steel, segments: 8 });
    kit.boxMM("metal", [gx - 0.05, y0 + 1.3, 537.55], [gx + 0.05, y0 + 1.36, 538.85], { color: PALETTE.gunmetal, texel: 2 });
    kit.box("metal", gx + 0.05, y0 + 1.1, 537.7, 0.04, 0.2, 0.06, { color: PALETTE.steel });
    kit.collider([gx - 0.08, y0, 537.5], [gx + 0.08, y0 + 2.4, 538.9], "gate");
    // red status lamps along the partition top, issue side
    for (const z of [531.0, 533.0, 535.0]) {
      kit.box("satinBlack", px - 0.16, y0 + 2.7, z, 0.14, 0.12, 0.14);
      kit.cyl("emitRed", px - 0.16, y0 + 2.62, z, 0.05, 0.05, "y", { segments: 12 });
    }
    kit.boxMM("emitRedSoft", [px - 0.09, y0 + 2.82, 530.5], [px - 0.07, y0 + 2.86, 535.5], { uv: "keep" });
    kit.boxMM("hazard", [6.0, y0 + 0.001, 530.4], [6.25, y0 + 0.006, 535.6], { texel: 3 });
    floorStencil(kit, 4.9, y0, 533.0, 1.1, 1, -Math.PI / 2);
  }

  // ------------------------------------------------------------ issue side: heavy cabinet, check terminal, rail, bench, lockers
  {
    const u = 1.15;
    fN.box("paintedMetal", u, 1.1, 0.35, 1.5, 2.2, 0.7, { color: PALETTE.darkMetal, texel: 1.5 });
    fN.box("satinBlack", u, 1.12, 0.705, 1.3, 1.95, 0.02);
    fN.box("metal", u, 2.19, 0.36, 1.54, 0.03, 0.72, { color: PALETTE.steel, texel: 2 });
    for (const v of [0.5, 1.15, 1.8]) fN.box("metal", u - 0.66, v, 0.72, 0.06, 0.2, 0.08, { color: PALETTE.steel });
    fN.box("metal", u + 0.1, 1.1, 0.735, 0.9, 0.08, 0.05, { color: PALETTE.steel });
    fN.cylN("metal", u + 0.45, 1.1, 0.75, 0.09, 0.06, { color: PALETTE.gunmetal, segments: 14 });
    fN.box("darkGloss", u + 0.42, 1.55, 0.72, 0.18, 0.26, 0.02);
    fN.box("screen5", u + 0.42, 1.6, 0.732, 0.14, 0.1, 0.004, { uv: "keep" });
    fN.box("emitRed", u + 0.42, 1.47, 0.732, 0.05, 0.03, 0.004);
    fN.box("hazard", u, 0.3, 0.716, 1.3, 0.08, 0.01, { texel: 3 });
    stencil(fN, u - 0.2, 1.6, 0.4, 8, { plate: false, n: 0.716 });
    fN.collider(u - 0.8, u + 0.8, 0, 2.25, 0, 0.78, "vault");
    wallConsole(fN, 3.4, 1.4, "screen5");
    fN.box("satinBlack", 3.4, 1.8, 0.04, 0.9, 0.56, 0.08);
    fN.box("screen5", 3.4, 1.8, 0.082, 0.78, 0.44, 0.006, { uv: "keep" });
    stencil(fN, 4.5, 1.75, 0.36, 9, { color: PALETTE.creamDark });
    wallLightBar(fN, 2.4, 4.8, 2.55, "emitCoolSoft");
    // queue rail
    for (const z of [531.2, 534.8]) {
      for (const x of [3.8, 5.8]) {
        kit.cyl("satinBlack", x, y0 + 0.47, z, 0.035, 0.94, "y", { segments: 10 });
        kit.cyl("metal", x, y0 + 0.02, z, 0.16, 0.04, "y", { color: PALETTE.darkMetal, segments: 14 });
      }
      kit.cyl("metal", 4.8, y0 + 0.92, z, 0.02, 2.0, "x", { color: PALETTE.steel, segments: 8 });
      kit.cyl("metal", 4.8, y0 + 0.5, z, 0.014, 2.0, "x", { color: PALETTE.gunmetal, segments: 8 });
      kit.collider([3.7, y0, z - 0.06], [5.9, y0 + 0.95, z + 0.06], "rail");
    }
    // waiting bench + stencils on the door wall forward of the door
    bench(kit, "z", 528.6, 2.42, y0, 3.0, { facing: 1, depth: 0.5, color: PALETTE.fabricTeal });
    stencil(fW, z1 - 528.6, 1.6, 0.5, 0, { color: PALETTE.creamDark });
    stencil(fW, z1 - 529.9, 1.6, 0.4, 7, { color: PALETTE.cream });
    wallLightBar(fW, z1 - 530.6, z1 - 526.6, 2.5, "emitCoolSoft");
    // aft of the door: fire cabinet + comm panel
    fW.box("metal", z1 - 536.2, 1.2, 0.08, 0.9, 1.1, 0.16, { color: PALETTE.gunmetal, texel: 1.5 });
    fW.box("painted", z1 - 536.2, 1.2, 0.165, 0.76, 0.96, 0.01, { color: PALETTE.impRed, uv: "keep" });
    stencil(fW, z1 - 536.2, 1.35, 0.4, 13, { color: PALETTE.cream, n: 0.17 });
    fW.box("metal", z1 - 536.2, 0.85, 0.19, 0.4, 0.05, 0.05, { color: PALETTE.steel });
    fW.collider(z1 - 536.7, z1 - 535.7, 0, 1.8, 0, 0.2, "fireCabinet");
    wallConsole(fW, z1 - 538.3, 1.2, "screen5", { height: 1.0, depth: 0.45 });
    wallLightBar(fW, z1 - 539.5, z1 - 535.2, 2.5, "emitCoolSoft");
    // personal lockers on the aft wall, issue side
    for (let k = 0; k < 4; k++) locker(fS, x1 - (3.05 + k * 0.92), 0.88, 2.1, { color: PALETTE.impGreyDark, band: PALETTE.impRed, decal: [14, 0, 9, 6][k] });
    wallLightBar(fS, x1 - 6.6, x1 - 2.5, 2.5, "emitCoolSoft");
  }

  // ------------------------------------------------------------ cage: wall rifle racks
  rifleRack(fE, 1.0, 6.0);
  rifleRack(fE, 7.0, 12.0);
  stencil(fE, 3.5, 2.4, 0.4, 14, { color: PALETTE.creamDark });
  stencil(fE, 9.5, 2.4, 0.4, 0, { color: PALETTE.creamDark });
  stencil(fE, 6.5, 1.2, 0.36, 10, { color: PALETTE.cream });
  wallLightBar(fE, 0.6, 5.4, 2.65, "emitCoolSoft");
  wallLightBar(fE, 7.6, 12.4, 2.65, "emitCoolSoft");
  // forward corner of the far wall: maintenance bench with tools
  {
    fE.box("metal", 13.2, 0.44, 0.35, 1.6, 0.06, 0.7, { color: PALETTE.steel, texel: 2 });
    fE.box("painted", 13.2, 0.9, 0.35, 1.6, 0.04, 0.7, { color: PALETTE.gunmetal, uv: "world", texel: 1 });
    for (const du of [-0.72, 0.72]) fE.box("metal", 13.2 + du, 0.45, 0.35, 0.08, 0.9, 0.66, { color: PALETTE.darkMetal, texel: 2 });
    fE.box("satinBlack", 13.0, 0.98, 0.3, 0.5, 0.12, 0.34);
    fE.box("emitAmber", 12.85, 1.05, 0.3, 0.04, 0.02, 0.04);
    fE.cylV("metal", 13.6, 1.0, 0.45, 0.04, 0.16, { color: PALETTE.gunmetal, segments: 10 });
    fE.box("metal", 13.2, 1.7, 0.03, 1.4, 0.7, 0.06, { color: PALETTE.gunmetal, texel: 2 });
    for (let k = 0; k < 5; k++) fE.cylV("metal", 12.7 + k * 0.25, 1.65, 0.08, 0.012, 0.3, { color: PALETTE.steel, segments: 6 });
    fE.box("leds", 13.2, 1.4, 0.065, 0.9, 0.03, 0.006, { uv: "keep" });
    fE.collider(12.3, 14.1, 0, 1.0, 0, 0.75, "bench");
  }

  // ------------------------------------------------------------ cage: free-standing double-sided rack
  {
    const rx = 12.5;
    const za = 528.5;
    const zb = 536.5;
    const zm = (za + zb) / 2;
    const len = zb - za;
    kit.box("metal", rx, y0 + 0.06, zm, 0.8, 0.12, len + 0.2, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("satinBlack", rx, y0 + 1.05, zm, 0.08, 1.9, len);
    kit.box("metal", rx, y0 + 2.02, zm, 0.3, 0.08, len + 0.1, { color: PALETTE.gunmetal, texel: 2 });
    for (const s of [-1, 1]) {
      kit.box("metal", rx + s * 0.22, y0 + 0.22, zm, 0.36, 0.05, len, { color: PALETTE.gunmetal, texel: 2 });
      kit.box("metal", rx + s * 0.2, y0 + 1.36, zm, 0.05, 0.04, len, { color: PALETTE.steel, texel: 2 });
      kit.box("emitRed", rx + s * 0.15, y0 + 1.97, zm, 0.02, 0.03, len - 0.2);
      kit.box("leds", rx + s * 0.4, y0 + 0.3, zm, 0.006, 0.03, len - 0.4, { uv: "keep" });
      for (let z = za + 0.18; z < zb - 0.1; z += 0.3) {
        kit.box("metal", rx + s * 0.22, y0 + 1.36, z, 0.1, 0.08, 0.05, { color: PALETTE.gunmetal });
        rifle(kit, rx + s * 0.2, y0 + 0.25, z, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }
    for (const z of [za - 0.1, zb + 0.1]) {
      kit.box("satinBlack", rx, y0 + 1.05, z, 0.5, 2.1, 0.1);
      const f = new lib.Frame(kit, new THREE.Vector3(rx, y0, z + (z < zm ? -0.05 : 0.05)), new THREE.Vector3(z < zm ? -1 : 1, 0, 0), new THREE.Vector3(0, 1, 0));
      stencil(f, 0, 1.5, 0.3, z < zm ? 14 : 0, { plate: false });
      f.box("hazard", 0, 0.5, 0.005, 0.44, 0.1, 0.01, { texel: 3 });
    }
    kit.collider([rx - 0.45, y0, za - 0.15], [rx + 0.45, y0 + 2.1, zb + 0.15], "rack");
    kit.boxMM("painted", [8.0, y0 + 0.001, 527.0], [8.08, y0 + 0.005, 539.0], { color: PALETTE.impRed, uv: "keep" });
    floorStencil(kit, 9.6, y0, 528.0, 0.8, 10, Math.PI / 2);
    floorStencil(kit, 9.6, y0, 538.0, 0.8, 10, Math.PI / 2);
  }

  // ------------------------------------------------------------ cage: helmet and armour shelves (forward wall)
  {
    const u0 = 6.0;
    const u1 = 15.5;
    const uc = (u0 + u1) / 2;
    const len = u1 - u0;
    fN.box("painted", uc, 1.15, 0.015, len, 2.2, 0.03, { color: PALETTE.impGreyDark, uv: "world", texel: 0.8 });
    for (let u = u0; u <= u1 + 0.01; u += 2.375) fN.box("metal", u, 1.1, 0.225, 0.06, 2.2, 0.45, { color: PALETTE.gunmetal, texel: 2 });
    for (const v of [0.5, 1.1, 1.7]) {
      fN.box("metal", uc, v, 0.225, len, 0.04, 0.45, { color: PALETTE.gunmetal, texel: 2 });
      fN.box("metal", uc, v + 0.03, 0.44, len, 0.03, 0.02, { color: PALETTE.steel });
      fN.box("emitCoolSoft", uc, v - 0.025, 0.4, len - 0.3, 0.008, 0.06, { uv: "keep" });
    }
    fN.box("metal", uc, 2.22, 0.225, len + 0.1, 0.05, 0.47, { color: PALETTE.darkMetal, texel: 2 });
    for (let u = u0 + 0.3; u < u1 - 0.2; u += 0.42) {
      const p = fN.pos(u, 0.52, 0.22);
      helmet(kit, p.x, p.y, p.z, 0);
    }
    for (let u = u0 + 0.35; u < u1 - 0.3; u += 0.55) {
      const p = fN.pos(u, 1.12, 0.2);
      chestPlate(kit, p.x, p.y, p.z, 0);
    }
    let k = 0;
    for (let u = u0 + 0.3; u < u1 - 0.3; u += 0.46, k++) {
      const p = fN.pos(u, 1.72, 0.22);
      if (k % 3 === 2) {
        kit.box("painted", p.x, p.y + 0.16, p.z, 0.4, 0.3, 0.36, { color: PALETTE.impWhite, uv: "keep" });
        kit.box("metal", p.x, p.y + 0.3, p.z, 0.42, 0.03, 0.38, { color: PALETTE.gunmetal });
        kit.add("decal", new THREE.PlaneGeometry(0.18, 0.18), { pos: [p.x, p.y + 0.15, p.z + 0.185], uv: "keep", uvRect: lib.decalRect ? lib.decalRect(9) : undefined });
      } else helmet(kit, p.x, p.y, p.z, 0);
    }
    stencil(fN, u0 + 0.4, 2.42, 0.3, 14, { plate: false });
    stencil(fN, u1 - 0.4, 2.42, 0.3, 6, { plate: false });
    fN.collider(u0 - 0.1, u1 + 0.1, 0, 2.3, 0, 0.5, "shelves");
    wallLightBar(fN, u0, u1, 2.7, "emitCoolSoft");
  }

  // ------------------------------------------------------------ cage: power-cell crates and cell rack (aft wall)
  {
    const stacks = [
      [8.7, 2, PALETTE.gunmetal, 5],
      [9.7, 3, PALETTE.impGreyDark, 13],
      [10.7, 1, PALETTE.slate, 5],
      [12.4, 2, PALETTE.impGreyDark, 11],
      [13.4, 2, PALETTE.gunmetal, 5],
      [15.2, 3, PALETTE.slate, 13],
      [16.2, 1, PALETTE.gunmetal, 5],
    ];
    for (const [cx, n, col, dec] of stacks) {
      for (let i = 0; i < n; i++) crate(kit, cx, y0 + 0.26 + i * 0.52, z1 - 0.35, 0.86, 0.5, 0.62, col, { decal: i === n - 1 ? dec : null, face: "-z", band: i === 0 });
      kit.collider([cx - 0.45, y0, z1 - 0.7], [cx + 0.45, y0 + 0.52 * n + 0.02, z1], "crates");
    }
    crate(kit, 10.7, y0 + 0.7, z1 - 0.4, 0.5, 0.36, 0.5, PALETTE.gunmetal, { decal: 8, face: "-z", band: false });
    // power cells on a two-shelf rack
    const ru = x1 - 17.2;
    fS.box("metal", ru, 1.0, 0.2, 1.1, 2.0, 0.4, { color: PALETTE.gunmetal, texel: 2 });
    fS.box("painted", ru, 1.0, 0.01, 1.0, 1.9, 0.02, { color: PALETTE.impGreyDark, uv: "world", texel: 0.8 });
    for (const v of [0.35, 0.95, 1.55]) {
      fS.box("metal", ru, v, 0.2, 1.06, 0.04, 0.4, { color: PALETTE.steel, texel: 2 });
      for (let k = 0; k < 5; k++) {
        const p = fS.pos(ru - 0.4 + k * 0.2, v + 0.02, 0.2);
        kit.cyl("painted", p.x, p.y + 0.15, p.z, 0.07, 0.3, "y", { color: PALETTE.gunmetal, uv: "keep", segments: 12 });
        kit.cyl(k % 2 ? "emitRed" : "emitAmber", p.x, p.y + 0.31, p.z, 0.05, 0.02, "y", { segments: 12 });
      }
    }
    fS.box("emitRed", ru, 1.98, 0.35, 0.9, 0.03, 0.02);
    stencil(fS, ru, 2.3, 0.3, 5, { plate: false });
    fS.collider(ru - 0.6, ru + 0.6, 0, 2.1, 0, 0.45, "cellRack");
    wallLightBar(fS, x1 - 16.5, x1 - 8.0, 2.55, "emitCoolSoft");
    stencil(fS, x1 - 11.5, 1.9, 0.5, 1, { color: PALETTE.creamDark });
  }
  return shell;
}
