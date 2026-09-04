// Fighter maintenance and refuelling gallery (x 32.5..60, z 420..500, h 14). A kit TIE sits in a maintenance
// cradle turned three-quarters to the blast door (viewport toward the room, port wing removed so the bare hub
// and the open shoulder hatch face the door), the removed wing stands upright in a jig forward of the cradle,
// a monorail crane with a spreader beam travels the length of the bay under a lit ceiling, fuel and power
// lines drop from ceiling reels to the pod, ground kit (bowser, rolling ladder, carts, crates, diagnostic
// consoles) stands around the bay; parts racks along the starboard wall, workbenches and screens along the
// forward wall. Amber work lighting with white over the cradle. The blast door to the hangar is on -x.
import * as THREE from "three";
import { roomFloorY } from "../../config/shipSpec.js";
import { decalRect } from "../../textures.js";
import {
  propFrame, railing, deckStrip, deckDecal, bayWalls, crate, toolCart, fuelBowser, pedestalConsole, cabinet,
  lightBar, compactBank, cableTray, truss, pipeRun, tieWing, tieCradle, ladder, monorail, craneTrolley,
  shadowCasters, bayCeiling, doorSurround, deckLabel, ensureLabels, displayWall, frameOutline, BLACK,
} from "../../hangar/machinery.js";

// pod centre on the deck, nose 40 deg off the line to the door so the viewport and the bare port hub both face it
const CRADLE = { x: 47, z: 465.5, yaw: -1.27, podY: 4.5 };
// removed port wing standing in a jig forward of the cradle, panel turned 30 deg off face-on to the door
const JIG = { x: 43.5, z: 454.5, yaw: -2.09, cv: 4.3 };

export function build(kit, ctx, room, lib) {
  const P = lib.PALETTE;
  const mats = ctx.materials;
  const { x0, x1, z0, z1 } = room;
  const y0 = roomFloorY(room);
  const yTop = y0 + room.height;
  ensureLabels(mats);
  const shell = lib.roomShell(kit, ctx, room, { style: "dark", ceiling: false, lights: false, skipWalls: ["-z", "+z", "-x", "+x"] });
  bayWalls(kit, room, shell, y0, { rows: [2.4, 5.4, 9.7, room.height], lightRow: 1, lightMat: "emitWarmSoft", seed: 61, rowStyles: ["bays", null, "vent"] });
  bayCeiling(kit, room, y0, { rows: 3, lightMat: "emitWarmSoft" });
  // the pod, cradle and structural plates throw the shadows under the cradle spot
  shadowCasters(kit, ["paintedMetal"]);
  doorSurround(kit, room, room.doors[0], y0, { label: 0, labelW: 4.5 });

  const tf = propFrame(kit, CRADLE.x, y0, CRADLE.z, CRADLE.yaw);
  cradleBay(kit, P, tf, y0);
  wingJig(kit, P, y0);
  groundKit(kit, P, tf, y0);
  fuelLines(kit, P, tf, yTop);
  crane(kit, ctx, mats, P, yTop);
  benches(kit, P, shell, y0, z0);
  partsRacks(kit, P, x1, y0);
  consoles(kit, P, shell, room, y0);
  ceiling(kit, P, room, yTop);
  lights(ctx, lib, y0, yTop, z0);
  return shell;
}

// ---------------------------------------------------------------- cradle bay: fighter on its cradle, port wing removed
function cradleBay(kit, P, tf, y0) {
  tieCradle(kit, tf, { podY: CRADLE.podY, wings: { left: false, right: true }, variant: 1, hatch: true });
  // bay outline turned with the cradle, NO STEP stencils at the corners, bay stencil on the door lane
  frameOutline(tf, -5.4, -3.6, 5.4, 3.6, "emitAmber");
  for (const su of [-1, 1]) for (const sn of [-1, 1]) {
    const g = new THREE.PlaneGeometry(1.2, 1.2);
    g.rotateX(-Math.PI / 2);
    g.rotateY(CRADLE.yaw);
    tf.add("decal", g, su * 4.6, 0.02, sn * 2.9, { uv: "keep", uvRect: decalRect(7) });
  }
  deckLabel(kit, 41.0, y0, 460, 5, 1, -Math.PI / 2);
  // approach lane from the door: white centre dashes, stopping short of the bay stencil
  for (let x = 34.5; x < 38; x += 2) deckStrip(kit, "emitWhiteSoft", x, 459.85, x + 1.1, 460.15, y0);
  // wheel chocks against the skid wheels on the door side
  for (const su of [-3.6, 3.6]) tf.box("hazard", su, 0.12, 2.35, 0.7, 0.24, 0.3, { uv: "world", texel: 1.2 });
}

// ---------------------------------------------------------------- removed port wing standing in a jig
function wingJig(kit, P, y0) {
  const f = propFrame(kit, JIG.x, y0, JIG.z, JIG.yaw);
  tieWing(kit, f, JIG.cv, 1);
  // two stands: base plate with hazard trim, a post either side of the panel, rubber blocks gripping the lower rim
  for (const n of [-2.2, 2.2]) {
    f.box("paintedMetal", 0, 0.15, n, 2.2, 0.3, 0.7, { color: P.gunmetal, uv: "world", texel: 1 });
    f.box("hazard", 0, 0.4, n, 2.2, 0.2, 0.72, { uv: "world", texel: 1.2 });
    for (const su of [-1, 1]) f.box("paintedMetal", su * 0.55, 1.6, n, 0.24, 2.4, 0.24, { color: P.gunmetal, texel: 1 });
    for (const su of [-1, 1]) f.box(BLACK, su * 0.26, 2.7, n, 0.3, 0.5, 0.36);
    f.box("metal", 0, 2.95, n, 1.34, 0.08, 0.3, { color: P.steel });
    f.box("emitAmber", 0.62, 1.2, n, 0.02, 0.4, 0.1, { uv: "keep" });
  }
  // deck outline and a "wing" stencil on the panel-side face of the stands
  frameOutline(f, -2.6, -3.4, 2.6, 3.4, "emitAmber");
  f.collider(-1.0, 1.0, 0, 8.2, -3.0, 3.0, "wingJig");
}

// ---------------------------------------------------------------- ground kit around the cradle
function groundKit(kit, P, tf, y0) {
  // rolling ladder up to the open shoulder hatch (port side, facing the door)
  ladder(kit, propFrame(kit, 43.8, y0, 463.9, 0.95), { h: 3.6 });
  toolCart(kit, propFrame(kit, 43.4, y0, 461.2, 0.5));
  // fuel bowser aft of the cradle, rear toward the pod, hose to the fuel point at the skid edge
  fuelBowser(kit, propFrame(kit, 44.0, y0, 471.5, -0.46), { hoseTo: [0.4, 0, -3.2] });
  toolCart(kit, propFrame(kit, 50.8, y0, 471.6, 2.4));
  // diagnostic console plugged into the bare hub, crates and a spares pallet behind the pod
  pedestalConsole(kit, propFrame(kit, 47.6, y0, 459.8, -0.5), "screen8", { w: 1.4 });
  const hub = tf.pos(-3.5, CRADLE.podY, 0);
  const cons = new THREE.Vector3(47.6, y0 + 1.0, 459.8);
  const pts = [cons, new THREE.Vector3((cons.x + hub.x) / 2, y0 + 0.15, (cons.z + hub.z) / 2 + 0.4), new THREE.Vector3(hub.x, hub.y - 0.6, hub.z), hub];
  kit.add(BLACK, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 12, 0.05, 6, false), { uv: "scale", uvScale: [1, 8] });
  crate(kit, propFrame(kit, 50.6, y0, 460.0, 0.2), { decal: 6 });
  crate(kit, propFrame(kit, 50.6, y0 + 0.8, 460.0, 0.35), { decal: 11, h: 0.7 });
  crate(kit, propFrame(kit, 52.1, y0, 460.4, -0.1), { w: 0.9, d: 0.9, h: 0.9, decal: 9 });
  // spare pylon strut on a saddle stand beside the jig
  const px = 47.2;
  const pz = 451.5;
  kit.boxMM("paintedMetal", [px - 1.6, y0, pz - 0.5], [px + 1.6, y0 + 0.3, pz + 0.5], { color: P.gunmetal, uv: "world", texel: 1 });
  for (const dx of [-1.1, 1.1]) kit.box("paintedMetal", px + dx, y0 + 0.7, pz, 0.3, 0.8, 0.9, { color: P.gunmetal, texel: 1 });
  kit.add("metal", new THREE.CylinderGeometry(0.62, 0.5, 2.6, 10), { pos: [px, y0 + 1.35, pz], rot: [0, 0, Math.PI / 2], color: P.impGrey, uv: "scale", uvScale: [3, 1] });
  kit.cyl("metal", px + 1.5, y0 + 1.35, pz, 0.95, 0.4, "x", { color: P.impGreyDark, segments: 12 });
  kit.collider([px - 1.7, y0, pz - 0.6], [px + 1.8, y0 + 2.3, pz + 0.6], "pylonStand");
  deckDecal(kit, px, y0, pz + 1.4, 1.2, 7, 0);
}

// ---------------------------------------------------------------- fuel / power lines from ceiling reels to the pod
function fuelLines(kit, P, tf, yTop) {
  const reels = [[44.4, 472.0], [50.0, 462.0]]; // (clear of the ceiling fixture at (48.2, 469.6))
  const targets = [tf.pos(0.5, CRADLE.podY + 1.85, -0.4), tf.pos(-0.6, CRADLE.podY + 1.85, 0.3)];
  reels.forEach(([rx, rz], i) => {
    kit.box("paintedMetal", rx, yTop - 0.7, rz, 1.6, 1.4, 0.6, { color: P.gunmetal, texel: 1 });
    kit.cyl("metal", rx, yTop - 1.9, rz, 0.55, 0.5, "z", { color: P.slate, segments: 16 });
    kit.cyl(BLACK, rx, yTop - 1.9, rz, 0.4, 0.56, "z", { segments: 16 });
    kit.box("emitAmber", rx + 0.5, yTop - 0.5, rz + 0.31, 0.2, 0.1, 0.02);
    const t = targets[i];
    const top = new THREE.Vector3(rx, yTop - 2.2, rz);
    const pts = [top, new THREE.Vector3(rx + (t.x - rx) * 0.3, t.y + (top.y - t.y) * 0.45, rz + (t.z - rz) * 0.3), new THREE.Vector3(t.x + (rx - t.x) * 0.1, t.y + 0.9, t.z + (rz - t.z) * 0.1), t];
    kit.add(BLACK, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 16, i ? 0.05 : 0.08, 6, false), { uv: "scale", uvScale: [1, 10] });
    kit.box("metal", t.x, t.y - 0.05, t.z, 0.3, 0.3, 0.3, { color: P.gunmetal });
  });
}

// ---------------------------------------------------------------- monorail crane along the cradle bay
function crane(kit, ctx, mats, P, yTop) {
  const y = yTop - 2.0;
  monorail(kit, { x0: 35, x1: 58, y, z: CRADLE.z, yTop, hangEvery: 6 });
  craneTrolley(ctx, mats, { x0: 37, x1: 56, y, z: CRADLE.z, drop: 2.6, speed: 0.3, load: "none", name: "fighterMaint.crane" });
}

// ---------------------------------------------------------------- workbenches, wall screens and light bars along the forward wall
function benches(kit, P, shell, y0, z0) {
  const wallZ = z0 + 0.02;
  for (const bx of [36.5, 41.5, 46.5, 51.5, 56.5]) {
    const f = propFrame(kit, bx, y0, wallZ + 0.45, 0);
    f.box("metal", 0, 0.45, 0, 3.0, 0.9, 0.9, { color: P.gunmetal, texel: 1 });
    f.box(BLACK, 0, 0.92, 0, 3.1, 0.06, 0.95);
    f.box("metal", -0.9, 1.05, -0.1, 0.5, 0.2, 0.4, { color: P.steel });
    f.box("metal", 0.7, 1.0, 0.1, 0.8, 0.1, 0.5, { color: P.slate });
    f.cylV("metal", 1.2, 1.05, -0.2, 0.08, 0.2, { color: P.orange, segments: 8 });
    f.box("emitAmber", 0, 0.7, 0.46, 1.0, 0.04, 0.01, { uv: "keep" });
    f.collider(-1.5, 1.5, 0, 1.0, -0.45, 0.5, "bench");
    kit.box(BLACK, bx, y0 + 1.95, wallZ + 0.03, 2.4, 0.8, 0.06);
    kit.box("screen6", bx, y0 + 1.95, wallZ + 0.065, 2.2, 0.6, 0.01, { uv: "keep" });
  }
  lightBar(shell.frames["-z"].frame, 2, 26, 2.9, "emitWarmSoft");
  for (const bx of [39, 49]) toolCart(kit, propFrame(kit, bx, y0, wallZ + 1.8, 0.2));
}

// ---------------------------------------------------------------- parts racks along the starboard wall
function partsRacks(kit, P, x1, y0) {
  const rx = x1 - 0.02;
  // pylon / hub spares: two uprights, three shelves each cradling a tapered strut, hub caps hung on pegs
  for (const rz of [432, 440]) {
    kit.boxMM("paintedMetal", [rx - 1.8, y0, rz - 2.6], [rx, y0 + 0.4, rz + 2.6], { color: P.gunmetal, uv: "world", texel: 0.8 });
    kit.boxMM("hazard", [rx - 1.81, y0 + 0.4, rz - 2.6], [rx - 1.8, y0 + 0.6, rz + 2.6], { uv: "world", texel: 1.2 });
    for (const dz of [-2.4, 2.4]) kit.boxMM("paintedMetal", [rx - 1.7, y0, rz + dz - 0.15], [rx - 1.4, y0 + 5.2, rz + dz + 0.15], { color: P.gunmetal, uv: "world", texel: 0.8 });
    for (let i = 0; i < 3; i++) {
      const y = y0 + 1.3 + i * 1.5;
      kit.boxMM("paintedMetal", [rx - 1.7, y - 0.55, rz - 2.6], [rx - 0.2, y - 0.45, rz + 2.6], { color: P.slate, uv: "world", texel: 1 });
      kit.add("metal", new THREE.CylinderGeometry(0.5, 0.62, 3.2, 10), { pos: [rx - 0.95, y + 0.1, rz], rot: [Math.PI / 2, 0, 0], color: i === 1 ? P.impGrey : P.slate, uv: "scale", uvScale: [3, 1] });
      for (const dz of [-1.2, 1.2]) kit.box("metal", rx - 0.95, y - 0.35, rz + dz, 1.3, 0.2, 0.3, { color: P.darkMetal });
    }
    for (let k = 0; k < 3; k++) kit.cyl("metal", rx - 0.5, y0 + 5.0, rz - 1.4 + k * 1.4, 0.55, 0.2, "x", { color: P.impGreyDark, segments: 12 });
    kit.collider([rx - 1.9, y0, rz - 2.7], [rx, y0 + 5.2, rz + 2.7], "pylonRack");
  }
  // shelf racks with canisters and a parts bin
  for (let i = 0; i < 3; i++) {
    const rz = 476 + i * 6;
    kit.box("metal", rx - 0.6, y0 + 1.6, rz, 1.2, 3.2, 4.8, { color: P.gunmetal, texel: 1 });
    for (let s = 0; s < 4; s++) kit.box("painted1", rx - 0.6, y0 + 0.5 + s * 0.85, rz, 1.16, 0.05, 4.7, { color: P.impGrey, uv: "world", texel: 1 });
    for (let s = 0; s < 3; s++) kit.cyl("metal", rx - 0.6, y0 + 0.85 + s * 0.85, rz - 1.5 + s * 1.2, 0.3, 1.0, "x", { color: s === 1 ? P.impGrey : P.slate, segments: 10 });
    kit.box("painted", rx - 0.6, y0 + 3.05, rz + 1.5, 0.9, 0.7, 0.9, { color: P.impGreyDark, uv: "world", texel: 1 });
    kit.collider([rx - 1.2, y0, rz - 2.4], [rx, y0 + 3.2, rz + 2.4], "partsRack");
    kit.add("decal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [rx - 1.21, y0 + 2.6, rz - 1.6], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(i === 1 ? 6 : 12) });
  }
}

// ---------------------------------------------------------------- diagnostic consoles, cabinets, displays, drums
function consoles(kit, P, shell, room, y0) {
  const { x0, x1, z0, z1 } = room;
  pedestalConsole(kit, propFrame(kit, 41.5, y0, 470.0, 2.2), "screen6", { w: 1.6 });
  for (let i = 0; i < 4; i++) cabinet(kit, propFrame(kit, x0 + 0.32, y0, 430 + i * 1.4, Math.PI / 2), { screen: i % 2 ? "screen6" : null });
  for (let i = 0; i < 3; i++) cabinet(kit, propFrame(kit, x0 + 0.32, y0, 486 + i * 1.4, Math.PI / 2), { screen: i === 1 ? "screen6" : null, color: P.slate });
  lightBar(shell.frames["-x"].frame, 2, 36, 2.9, "emitWarmSoft");
  lightBar(shell.frames["-x"].frame, 44, 78, 2.9, "emitWarmSoft");
  lightBar(shell.frames["+x"].frame, 2, 38, 2.9, "emitWarmSoft");
  lightBar(shell.frames["+x"].frame, 52, 78, 2.9, "emitWarmSoft");
  // maintenance status display on the starboard wall opposite the door (two screen materials, not four: each
  // kit material is a draw call and this room renders the hangar's list through the blast door as well)
  displayWall(shell.frames["+x"].frame, 466 - z0, 4.6, 5.2, 2.2, ["screen6", "screen8", "screen8", "screen6"], 1, { cols: 2, lamp: "emitAmber" });
  // crates and drums in the aft corner
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, 36.5 + i * 1.5, y0, 448, 0.15 * i), { decal: [6, 11, 9][i] });
  crate(kit, propFrame(kit, 37.2, y0 + 0.8, 448, 0.1), { decal: 5, h: 0.7 });
  for (let i = 0; i < 4; i++) {
    const dx = 52 + (i % 2) * 1.1;
    const dz = 494 + Math.floor(i / 2) * 1.1;
    kit.cyl("painted2", dx, y0 + 0.6, dz, 0.45, 1.2, "y", { color: i % 2 ? P.orange : P.impGreyDark, segments: 14, uv: "world", texel: 1 });
  }
  kit.collider([51.4, y0, 493.4], [53.7, y0 + 1.25, 495.7], "drums");
  // aft wall: coolant / fuel pipe runs
  pipeRun(kit, (x0 + x1) / 2, y0 + 5.2, z1 - 0.5, x1 - x0 - 2, "x", 0.22, P.steel, 6);
  pipeRun(kit, (x0 + x1) / 2, y0 + 4.6, z1 - 0.45, x1 - x0 - 2, "x", 0.14, P.orange, 6);
  // railed inspection step by the aft racks
  railing(kit, 56.5, 470, 59.9, 470, y0, { postEvery: 1.7, tag: "rackRail", collide: false });
}

// ---------------------------------------------------------------- ceiling: recessed banks over the work, trusses, trays
function ceiling(kit, P, room, yTop) {
  const { x0, x1, z0, z1 } = room;
  // compact fixtures at the two pooled ceiling lights (see lights), beside the crane rail and clear of the
  // bayCeiling ribs (every 3.2 m from z0) and its light strips (x 37.1 / 46.25 / 55.4)
  compactBank(kit, CRADLE.x + 1.2, yTop, CRADLE.z + 4.1, "emitWhiteSoft");
  compactBank(kit, JIG.x, yTop, JIG.z, "emitWhiteSoft");
  for (const z of [436, 484]) truss(kit, { axis: "x", from: x0, to: x1, at: z, yTop, yBot: yTop - 1.4, panel: 3.5, chord: 0.35, web: 0.18, color: P.gunmetal, chordColor: P.slate });
  cableTray(kit, x0 + 2.5, yTop - 1.1, (z0 + z1) / 2, z1 - z0 - 2, "z", 0.7);
  cableTray(kit, x1 - 2.5, yTop - 1.1, (z0 + z1) / 2, z1 - z0 - 2, "z", 0.7);
}

// ---------------------------------------------------------------- lighting: amber work light over the bays, white over the cradle
function lights(ctx, lib, y0, yTop, z0) {
  const warm = (i, d, p, c = 0xffb347) => ctx.lights.warm.push(lib.pointLight(c, i, d, p));
  for (const z of [432, 448, 480, 494]) for (const x of [39, 54]) warm(150, 34, [x, y0 + 7, z]);
  // (both in the ceiling plane inside their housings: hung a metre under the plate they lit it into halos)
  ctx.lights.cool.push(lib.pointLight(0xe8f0ff, 300, 44, [CRADLE.x + 1.2, yTop + 0.04, CRADLE.z + 4.1]));
  ctx.lights.cool.push(lib.pointLight(0xe8f0ff, 120, 30, [40.5, y0 + 6, 461]));
  warm(90, 24, [JIG.x, yTop + 0.04, JIG.z], 0xffc880);
  warm(60, 20, [46, y0 + 2.6, z0 + 1.6], 0xffd9a0);
  // shadowed spot from the far side of the cradle: pod, cradle and ladder shadows fall toward the door
  const sp = new THREE.SpotLight(0xfff0dd, 700 * lib.LIGHT_SCALE, 34, 0.6, 0.5, 1.8);
  sp.position.set(CRADLE.x + 6, yTop - 1.0, CRADLE.z - 5);
  sp.target.position.set(CRADLE.x, y0, CRADLE.z);
  sp.shadow.camera.near = 1;
  sp.shadow.camera.far = 30;
  sp.shadow.bias = -0.0004;
  sp.shadow.normalBias = 0.05;
  ctx.lights.spots.push(sp);
}
