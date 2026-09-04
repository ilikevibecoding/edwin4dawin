// Fighter maintenance and refuelling gallery (x 32.5..60, z 420..500, h 14): a TIE-style fighter sits in a
// maintenance cradle with its port wing removed and standing in a jig, fuel lines drop from ceiling reels,
// parts racks hold spare wing panels, workbenches and diagnostic screens line the forward wall, an overhead
// hoist travels the length of the cradle bay. Amber work lighting; the blast door to the hangar is on -x.
import * as THREE from "three";
import { roomFloorY } from "../../config/shipSpec.js";
import { decalRect } from "../../textures.js";
import {
  propFrame, railing, deckStrip, hazardBand, deckDecal, bayWalls, crate, toolCart, fuelBowser, pedestalConsole,
  cabinet, lightBank, lightBar, pipeRun, tieShape, tieWing, hoist, shadowCasters, bayCeiling, BLACK,
} from "../../hangar/machinery.js";

export function build(kit, ctx, room, lib) {
  const P = lib.PALETTE;
  const mats = ctx.materials;
  const { x0, x1, z0, z1 } = room;
  const y0 = roomFloorY(room);
  const yTop = y0 + room.height;
  const shell = lib.roomShell(kit, ctx, room, { style: "dark", ceiling: false, lights: false, skipWalls: ["-z", "+z", "-x", "+x"] });
  bayWalls(kit, room, shell, y0, { rows: [2.4, 5.4, 9.7, room.height], lightRow: 1, lightMat: "emitWarmSoft", seed: 61 });
  bayCeiling(kit, room, y0, { rows: 3, lightMat: "emitWarmSoft" });
  // the pod, cradle and structural plates throw the shadows under the cradle spot
  shadowCasters(kit, ["paintedMetal"]);

  // ---- cradle bay: fighter on its cradle, port wing removed
  const cx = 47;
  const cz = 462;
  const cy = y0 + 4.5;
  tieShape(kit, cx, cy, cz, { wings: { left: false, right: true } });
  // cradle: two portal frames straddling the pod, saddle beams with rubber pads under the hull
  for (const fz of [cz - 3.0, cz + 3.0]) {
    for (const fx of [cx - 3.2, cx + 3.2]) {
      kit.boxMM("paintedMetal", [fx - 0.3, y0, fz - 0.3], [fx + 0.3, y0 + 3.4, fz + 0.3], { color: P.gunmetal, uv: "world", texel: 0.6 });
      kit.collider([fx - 0.3, y0, fz - 0.3], [fx + 0.3, y0 + 3.4, fz + 0.3], "cradle");
    }
    kit.boxMM("paintedMetal", [cx - 3.5, y0 + 3.1, fz - 0.35], [cx + 3.5, y0 + 3.5, fz + 0.35], { color: P.gunmetal, uv: "world", texel: 0.6 });
    kit.boxMM("hazard", [cx - 3.5, y0 + 3.2, fz - 0.36], [cx + 3.5, y0 + 3.4, fz - 0.34], { uv: "world", texel: 1.2 });
    kit.boxMM("hazard", [cx - 3.5, y0 + 3.2, fz + 0.34], [cx + 3.5, y0 + 3.4, fz + 0.36], { uv: "world", texel: 1.2 });
  }
  // saddle under the pod (pod bottom at cy - 2 = y0 + 2.5)
  kit.boxMM("paintedMetal", [cx - 1.6, y0 + 1.6, cz - 1.4], [cx + 1.6, y0 + 2.2, cz + 1.4], { color: P.darkMetal, uv: "world", texel: 0.8 });
  kit.boxMM(BLACK, [cx - 1.3, y0 + 2.2, cz - 1.1], [cx + 1.3, y0 + 2.42, cz + 1.1]);
  kit.boxMM("paintedMetal", [cx - 0.6, y0, cz - 0.6], [cx + 0.6, y0 + 1.6, cz + 0.6], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.collider([cx - 1.6, y0, cz - 1.4], [cx + 1.6, y0 + 2.4, cz + 1.4], "cradle");
  // jack stand under the bare port pylon (collar at x = cx - 3.9)
  kit.boxMM("paintedMetal", [cx - 4.6, y0, cz - 0.6], [cx - 3.4, y0 + 0.3, cz + 0.6], { color: P.gunmetal, texel: 1 });
  kit.cyl("metal", cx - 4.0, y0 + (cy - 0.9 - y0) / 2 + 0.15, cz, 0.16, cy - 0.9 - y0 - 0.3, "y", { color: P.steel, segments: 10 });
  kit.boxMM(BLACK, [cx - 4.7, cy - 0.98, cz - 0.5], [cx - 3.3, cy - 0.86, cz + 0.5]);
  kit.collider([cx - 4.6, y0, cz - 0.6], [cx - 3.4, cy, cz + 0.6], "jack");
  // gantry steps up to the pod hatch on the starboard side
  kit.stairs("paintedMetal", cx + 1.9, cz + 1.6, cx + 1.9 + 3.6, cz + 2.9, y0, y0 + 2.4, "x", { color: P.slate, steps: 12 });
  kit.boxMM("paintedMetal", [cx + 5.5, y0 + 2.15, cz + 1.6], [cx + 7.1, y0 + 2.4, cz + 2.9], { color: P.slate, texel: 1 });
  kit.floor(cx + 5.5, cz + 1.6, cx + 7.1, cz + 2.9, y0 + 2.4);
  railing(kit, cx + 1.9, cz + 2.9, cx + 7.1, cz + 2.9, y0 + 2.4, { postEvery: 1.3, tag: "gantry" });
  railing(kit, cx + 7.1, cz + 1.6, cx + 7.1, cz + 2.9, y0 + 2.4, { postEvery: 1.3, tag: "gantry" });
  // yellow bay outline, NO STEP and hazard at the door sill
  const bay = [cx - 9, cz - 10, cx + 9, cz + 10];
  deckStrip(kit, "emitAmber", bay[0], bay[1], bay[2], bay[1] + 0.12, y0);
  deckStrip(kit, "emitAmber", bay[0], bay[3] - 0.12, bay[2], bay[3], y0);
  deckStrip(kit, "emitAmber", bay[0], bay[1], bay[0] + 0.12, bay[3], y0);
  deckStrip(kit, "emitAmber", bay[2] - 0.12, bay[1], bay[2], bay[3], y0);
  for (const [dx, dz] of [[-6.5, -7], [6.5, -7], [-6.5, 7], [6.5, 7]]) deckDecal(kit, cx + dx, y0, cz + dz, 1.4, 7, 0);
  deckDecal(kit, cx, y0, cz - 8.4, 2.4, 2, 0);
  hazardBand(kit, x0, 456.6, x0 + 1.2, 463.4, y0);
  deckDecal(kit, x0 + 2.4, y0, 460, 1.8, 1, Math.PI / 2);

  // ---- removed port wing standing in a jig aft of the cradle
  const wx = 42;
  const wz = 478;
  tieWing(kit, wx, y0 + 4.5, wz, 0.35);
  for (const dz of [-2.2, 2.2]) {
    const px = wx - Math.sin(0.35) * dz;
    const pz = wz + Math.cos(0.35) * dz;
    kit.boxMM("paintedMetal", [px - 1.1, y0, pz - 0.35], [px + 1.1, y0 + 0.3, pz + 0.35], { color: P.gunmetal, texel: 1 });
    for (const s of [-1, 1]) kit.boxMM("paintedMetal", [px + s * 0.55 - 0.12, y0 + 0.3, pz - 0.12], [px + s * 0.55 + 0.12, y0 + 2.6, pz + 0.12], { color: P.gunmetal, texel: 1 });
    kit.boxMM("hazard", [px - 1.1, y0 + 0.3, pz - 0.36], [px + 1.1, y0 + 0.5, pz + 0.36], { uv: "world", texel: 1.2 });
    kit.collider([px - 1.2, y0, pz - 0.5], [px + 1.2, y0 + 2.6, pz + 0.5], "wingJig");
  }
  kit.collider([wx - 0.9, y0, wz - 3.0], [wx + 0.9, y0 + 8.5, wz + 3.0], "wingJig");
  deckStrip(kit, "emitAmber", wx - 2.6, wz - 3.6, wx + 2.6, wz - 3.48, y0);
  deckStrip(kit, "emitAmber", wx - 2.6, wz + 3.48, wx + 2.6, wz + 3.6, y0);
  deckStrip(kit, "emitAmber", wx - 2.6, wz - 3.6, wx - 2.48, wz + 3.6, y0);
  deckStrip(kit, "emitAmber", wx + 2.48, wz - 3.6, wx + 2.6, wz + 3.6, y0);

  // ---- fuel lines: ceiling reels with hoses down to the pod hatch and to a bowser
  const reels = [[cx - 2.5, cz - 4.5], [cx + 2.5, cz - 4.5], [cx + 4, cz + 6]];
  const targets = [[cx - 0.4, cy + 2.0, cz + 0.2], [cx + 0.5, cy + 2.0, cz - 0.3], [cx + 8.5, y0 + 2.9, cz + 8.2]];
  reels.forEach(([rx, rz], i) => {
    kit.box("paintedMetal", rx, yTop - 0.7, rz, 1.6, 1.4, 0.6, { color: P.gunmetal, texel: 1 });
    kit.cyl("metal", rx, yTop - 1.9, rz, 0.55, 0.5, "z", { color: P.slate, segments: 16 });
    kit.cyl(BLACK, rx, yTop - 1.9, rz, 0.4, 0.56, "z", { segments: 16 });
    kit.box("emitAmber", rx + 0.5, yTop - 0.5, rz + 0.31, 0.2, 0.1, 0.02);
    const [tx, ty, tz] = targets[i];
    const pts = [new THREE.Vector3(rx, yTop - 2.2, rz), new THREE.Vector3(rx + (tx - rx) * 0.3, ty + (yTop - 2.2 - ty) * 0.45, rz + (tz - rz) * 0.3), new THREE.Vector3(tx + (rx - tx) * 0.1, ty + 0.9, tz + (rz - tz) * 0.1), new THREE.Vector3(tx, ty, tz)];
    kit.add(BLACK, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 16, 0.07, 6, false), { uv: "scale", uvScale: [1, 10] });
    kit.box("metal", tx, ty - 0.05, tz, 0.3, 0.3, 0.3, { color: P.gunmetal });
  });
  fuelBowser(kit, propFrame(kit, cx + 8.6, y0, cz + 8.5, Math.PI), { hoseTo: [3.2, 0, 3.6] });

  // ---- overhead hoist rail along the cradle bay
  kit.boxMM("metal", [36, yTop - 2.0, cz - 0.15], [58, yTop - 1.7, cz + 0.15], { color: P.steel, uv: "world", texel: 1 });
  for (const hx of [36.5, 47, 57.5]) kit.boxMM("paintedMetal", [hx - 0.25, yTop - 1.7, cz - 0.4], [hx + 0.25, yTop, cz + 0.4], { color: P.darkMetal, texel: 1 });
  hoist(ctx, mats, { x0: 38, x1: 56, y: yTop - 2.0, z: cz, drop: 3.5, speed: 0.35, name: "fighterMaint.hoist" });

  // ---- workbenches, wall screens and light bars along the forward wall
  const wallZ = z0 + 0.02;
  for (const bx of [36.5, 41.5, 46.5, 51.5, 56.5]) {
    const f = propFrame(kit, bx, y0, wallZ + 0.45, 0);
    f.box("metal", 0, 0.45, 0, 3.0, 0.9, 0.9, { color: P.gunmetal, texel: 1 });
    f.box("darkGloss", 0, 0.92, 0, 3.1, 0.06, 0.95);
    f.box("metal", -0.9, 1.05, -0.1, 0.5, 0.2, 0.4, { color: P.steel });
    f.box("metal", 0.7, 1.0, 0.1, 0.8, 0.1, 0.5, { color: P.slate });
    f.cylV("metal", 1.2, 1.05, -0.2, 0.08, 0.2, { color: P.orange, segments: 8 });
    f.box("emitAmber", 0, 0.7, 0.46, 1.0, 0.04, 0.01, { uv: "keep" });
    f.collider(-1.5, 1.5, 0, 1.0, -0.45, 0.5, "bench");
    kit.box("darkGloss", bx, y0 + 1.95, wallZ + 0.03, 2.4, 0.8, 0.06);
    kit.box("screen6", bx, y0 + 1.95, wallZ + 0.065, 2.2, 0.6, 0.01, { uv: "keep" });
  }
  lightBar(shell.frames["-z"].frame, 2, 26, 2.9, "emitWarmSoft");
  for (const bx of [39, 49]) toolCart(kit, propFrame(kit, bx, y0, wallZ + 1.8, 0.2));

  // ---- parts racks along the starboard wall: spare wing panels in slots, shelves with pylon parts
  const rx = x1 - 0.02;
  for (let i = 0; i < 2; i++) {
    const rz = 432 + i * 7.5;
    kit.boxMM("paintedMetal", [rx - 1.6, y0, rz - 3.2], [rx, y0 + 0.4, rz + 3.2], { color: P.gunmetal, uv: "world", texel: 0.8 });
    for (const dz of [-3.0, 3.0]) kit.boxMM("paintedMetal", [rx - 1.6, y0, rz + dz - 0.15], [rx - 1.3, y0 + 9.0, rz + dz + 0.15], { color: P.gunmetal, uv: "world", texel: 0.8 });
    kit.boxMM("paintedMetal", [rx - 1.6, y0 + 8.7, rz - 3.2], [rx - 1.3, y0 + 9.0, rz + 3.2], { color: P.gunmetal, uv: "world", texel: 0.8 });
    tieWing(kit, rx - 0.75, y0 + 4.4, rz, 0);
    kit.boxMM("hazard", [rx - 1.7, y0 + 0.4, rz - 3.2], [rx - 1.6, y0 + 0.6, rz + 3.2], { uv: "world", texel: 1.2 });
    kit.collider([rx - 1.7, y0, rz - 3.3], [rx, y0 + 9, rz + 3.3], "wingRack");
  }
  for (let i = 0; i < 3; i++) {
    const rz = 476 + i * 6;
    kit.box("metal", rx - 0.6, y0 + 1.6, rz, 1.2, 3.2, 4.8, { color: P.gunmetal, texel: 1 });
    for (let s = 0; s < 4; s++) kit.box("painted1", rx - 0.6, y0 + 0.5 + s * 0.85, rz, 1.16, 0.05, 4.7, { color: P.impGrey, uv: "world", texel: 1 });
    for (let s = 0; s < 3; s++) kit.cyl("metal", rx - 0.6, y0 + 0.85 + s * 0.85, rz - 1.5 + s * 1.2, 0.3, 1.0, "x", { color: s === 1 ? P.impGrey : P.slate, segments: 10 });
    kit.box("painted", rx - 0.6, y0 + 3.05, rz + 1.5, 0.9, 0.7, 0.9, { color: P.impGreyDark, uv: "world", texel: 1 });
    kit.collider([rx - 1.2, y0, rz - 2.4], [rx, y0 + 3.2, rz + 2.4], "partsRack");
    kit.add("decal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [rx - 1.21, y0 + 2.6, rz - 1.6], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(i === 1 ? 6 : 12) });
  }

  // ---- diagnostic consoles and cabinets
  pedestalConsole(kit, propFrame(kit, cx - 8, y0, cz - 5, Math.PI / 2), "screen6", { w: 1.6 });
  pedestalConsole(kit, propFrame(kit, cx - 8, y0, cz + 5, Math.PI / 2), "screen6", { w: 1.6 });
  for (let i = 0; i < 4; i++) cabinet(kit, propFrame(kit, x0 + 0.32, y0, 430 + i * 1.4, Math.PI / 2), { screen: i % 2 ? "screen6" : null });
  for (let i = 0; i < 3; i++) cabinet(kit, propFrame(kit, x0 + 0.32, y0, 486 + i * 1.4, Math.PI / 2), { screen: i === 1 ? "screen6" : null, color: P.slate });
  lightBar(shell.frames["-x"].frame, 2, 36, 2.9, "emitWarmSoft");
  lightBar(shell.frames["-x"].frame, 44, 78, 2.9, "emitWarmSoft");
  lightBar(shell.frames["+x"].frame, 2, 78, 2.9, "emitWarmSoft");
  // crates, carts and drums around the bay
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, 36.5 + i * 1.5, y0, 448, 0.15 * i), { decal: [6, 11, 9][i] });
  crate(kit, propFrame(kit, 37.2, y0 + 0.8, 448, 0.1), { decal: 5, h: 0.7 });
  toolCart(kit, propFrame(kit, cx - 6.5, y0, cz + 8.5, Math.PI));
  toolCart(kit, propFrame(kit, cx + 7, y0, cz - 7, -0.4));
  toolCart(kit, propFrame(kit, wx + 4.5, y0, wz + 1.0, 1.2));
  for (let i = 0; i < 4; i++) {
    const dx = 52 + (i % 2) * 1.1;
    const dz = 494 + Math.floor(i / 2) * 1.1;
    kit.cyl("painted2", dx, y0 + 0.6, dz, 0.45, 1.2, "y", { color: i % 2 ? P.orange : P.impGreyDark, segments: 14, uv: "world", texel: 1 });
  }
  kit.collider([51.4, y0, 493.4], [53.7, y0 + 1.25, 495.7], "drums");
  // aft wall: coolant / fuel pipe runs and a bulkhead vent
  pipeRun(kit, (x0 + x1) / 2, y0 + 5.2, z1 - 0.5, x1 - x0 - 2, "x", 0.22, P.steel, 6);
  pipeRun(kit, (x0 + x1) / 2, y0 + 4.6, z1 - 0.45, x1 - x0 - 2, "x", 0.14, P.orange, 6);
  lightBank(kit, cx, yTop, cz, 6, 1.4, "emitWarmSoft");
  lightBank(kit, wx, yTop, wz, 4, 1.2, "emitWarmSoft");

  // ---- lighting: amber work light over the bays, white over the cradle
  const warm = (i, d, p, c = 0xffb347) => ctx.lights.warm.push(lib.pointLight(c, i, d, p));
  for (const z of [432, 448, 476, 492]) for (const x of [39, 54]) warm(170, 36, [x, y0 + 7, z]);
  ctx.lights.cool.push(lib.pointLight(0xe8f0ff, 280, 44, [cx, yTop - 1.2, cz]));
  ctx.lights.cool.push(lib.pointLight(0xe8f0ff, 120, 30, [cx - 8, y0 + 5.5, cz]));
  warm(90, 24, [wx, y0 + 6, wz], 0xffc880);
  warm(60, 20, [46, y0 + 2.6, z0 + 1.6], 0xffd9a0);
  const sp = new THREE.SpotLight(0xfff0dd, 700 * lib.LIGHT_SCALE, 34, 0.6, 0.5, 1.8);
  sp.position.set(cx + 6, yTop - 1.0, cz - 6);
  sp.target.position.set(cx, y0, cz);
  sp.shadow.camera.near = 1;
  sp.shadow.camera.far = 30;
  sp.shadow.bias = -0.0004;
  sp.shadow.normalBias = 0.05;
  ctx.lights.spots.push(sp);
  return shell;
}
