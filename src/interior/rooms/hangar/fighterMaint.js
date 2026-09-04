// Fighter Maintenance & Refuelling — box [60,150,100,230], floor y = -20, 14 m tall. Two hazard-striped
// maintenance bays off the hangar's east wall: bay 1 holds a complete TIE on a cradle being refuelled
// and diagnosed, bay 2 a fighter with its port wing pulled and leaning on a stand under the bridge
// crane. Fuel tanks and the manifold along the east wall, parts racks and tool chests along the south
// wall, hose reels and status boards on the north wall.
import * as THREE from "three";
import { STD } from "../../../config/layout.js";
import { wallOpenings } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { console as impConsole, chair, pipeRun, pointLightDesc, spotLightDesc, walkable, lockers, wallScreen } from "../../impKit.js";
import { bayWall, bayCeiling, deckMark, taxiLights, floorStencil, hoseReel, bowser, toolCart, wallLadder, fireStation, fuelTank, partsRack, serviceGantry, crateStack, statusBoard, tieCradle, wingStand, bridgeCrane, deckTractor, cargoSled, generator, rollingLadder, TIE_CRADLE_HANG } from "../../../hangar/hangarKit.js";
import { addTIE, addTIEWing, TIE } from "../../../hangar/tie.js";

const RIB = "impPaintedMetal";

export function buildFighterMaint(kit, ctx) {
  const id = ctx.id;
  const room = ctx.room;
  const y = ctx.floorY; // -20
  const H = room.h; // 14
  const yC = y + H;
  const [x0, z0, x1, z1] = room.box;
  const t = STD.wallT;

  // ---- enclosure --------------------------------------------------------------------------
  const wallSpecs = {
    north: { from: [x0, z0 + t], to: [x1, z0 + t] },
    south: { from: [x1, z1 - t], to: [x0, z1 - t] },
    west: { from: [x0 + t, z1], to: [x0 + t, z0] },
    east: { from: [x1 - t, z0], to: [x1 - t, z1] },
  };
  const frames = {};
  let wi = 0;
  for (const key of ["north", "south", "west", "east"]) {
    const w = wallSpecs[key];
    const { frame, length } = wallFrame(kit, w.from, w.to, y);
    frames[key] = { frame, length };
    const openings = wallOpenings(id, room, key);
    bayWall(frame, length, H, { openings, ribPitch: 8, tiers: [0, 7.6, H], seed: 71 + wi++ * 13, tag: id + ":" + key, kick: 0.9, cornice: 0.7, featureScale: 0.7 });
    for (const op of openings) {
      const u = (op.u0 + op.u1) / 2;
      frame.box(RIB, u, op.v1 + 0.7, 0.12, 5, 0.6, 0.1, { color: IMP.trim, texel: 1 });
      frame.box("emitBlue", u + 1.0, op.v1 + 0.7, 0.18, 0.5, 0.16, 0.02);
      frame.quad("impDecal", u - 0.9, op.v1 + 0.7, 0.18, 0.44, 0.44, { uvRect: impDecalRect(7) });
      frame.box("hazard", u, op.v1 + 0.28, 0.12, op.u1 - op.u0 + 1.2, 0.26, 0.05, { uv: "world", texel: 1 });
    }
  }
  const troughs = [];
  for (const z of [162, 178, 202, 218]) troughs.push([80, z, 14, "x"]);
  bayCeiling(kit, room.box, yC, { girderPitch: 10, longitudinals: [70, 90], panel: 8, troughs, seed: 6 });
  // deck
  kit.boxMM("impDeck", [x0, y - 0.15, z0], [x1, y, z1], { color: IMP.wallDark, texel: 0.35 });
  walkable(ctx, x0, z0, x1, z1, y, id);
  // plate seams as dark grooves in the deck material (a glossier strip reads as a white hairline at
  // grazing angles)
  for (let x = x0 + 10; x < x1; x += 10) kit.boxMM("impDeck", [x - 0.05, y, z0], [x + 0.05, y + 0.006, z1], { color: IMP.trim, texel: 0.35 });
  for (let z = z0 + 10; z < z1; z += 10) kit.boxMM("impDeck", [x0, y, z - 0.05], [x1, y + 0.006, z + 0.05], { color: IMP.trim, texel: 0.35 });

  // ---- bays: hazard borders, landing crosses, numerals ------------------------------------------
  const bays = [
    { cx: 81, cz: 170, n: 5, yaw: Math.PI / 2 + 0.3 },
    { cx: 83, cz: 212, n: 6, yaw: 0.25 },
  ];
  for (const b of bays) {
    const hw = 8.5;
    const hd = 9;
    const s = 0.3;
    kit.boxMM("hazard", [b.cx - hw, y + 0.004, b.cz - hd], [b.cx + hw, y + 0.012, b.cz - hd + s], { uv: "world", texel: 1 });
    kit.boxMM("hazard", [b.cx - hw, y + 0.004, b.cz + hd - s], [b.cx + hw, y + 0.012, b.cz + hd], { uv: "world", texel: 1 });
    kit.boxMM("hazard", [b.cx - hw, y + 0.004, b.cz - hd], [b.cx - hw + s, y + 0.012, b.cz + hd], { uv: "world", texel: 1 });
    kit.boxMM("hazard", [b.cx + hw - s, y + 0.004, b.cz - hd], [b.cx + hw, y + 0.012, b.cz + hd], { uv: "world", texel: 1 });
    deckMark(kit, b.cx, b.cz, y, 10, 10, 1);
    deckMark(kit, b.cx - hw + 2.6, b.cz - hd + 2.6, y, 3.2, 3.2, 3);
    floorStencil(kit, b.cx + hw - 2.4, y, b.cz + hd - 2.4, 2.4, 8);
  }
  // lane from the door to both bays, with marker lights
  for (const b of bays) deckMark(kit, 66, b.cz, y, 8, 3.6, 0, Math.PI / 2);
  deckMark(kit, 66, 191, y, 3.6, 44, 0);
  taxiLights(kit, [66, 170], [66, 212], y, { pitch: 6, halfW: 2.4 });

  // ---- deck between the door wall and the bays: tractor + sled by the north wall, power units, stores
  deckTractor(kit, [71, y, 158.5], Math.PI / 2 + 0.3);
  cargoSled(kit, [76.2, y, 156.9], Math.PI / 2 + 0.3, { seed: 31, n: 2 });
  rollingLadder(kit, [90, y, 162], -2.2, { h: 2.4 });
  crateStack(kit, [92, y, 156], 0.2, { seed: 71, n: 2 });
  crateStack(kit, [95.5, y, 156.5], -0.1, { seed: 74, n: 1 });
  // (kept off the door view's centre line so the room still reads across to the pump skid)
  generator(kit, [73, y, 182.5], 0.5);
  toolCart(kit, [76, y, 185.5], 1.0, { seed: 18 });
  deckTractor(kit, [80, y, 197], 0.15);
  crateStack(kit, [92, y, 186], 0.1, { seed: 77, n: 2, size: [2, 1.2, 1.6] });

  // ---- bay 1: complete fighter on a cradle, refuelling + diagnostics ----------------------------
  {
    const b = bays[0];
    tieCradle(kit, [b.cx, y, b.cz], b.yaw);
    addTIE(kit, [b.cx, y + TIE_CRADLE_HANG, b.cz], b.yaw, { lod: 0 });
    serviceGantry(kit, [b.cx - 1.5, y, b.cz - 7.6], Math.PI, { h: 3.6, len: 3.6 });
    // diagnostic console facing the fighter with a cable bundle to the ball's rear hatch
    impConsole(kit, ctx, [b.cx + 7.2, y, b.cz + 2.2], -Math.PI / 2 - 0.3, { kind: "station", seed: 41, light: false });
    chair(kit, [b.cx + 8.0, y, b.cz + 2.6], -Math.PI / 2 - 0.3);
    pipeRun(kit, [[b.cx + 6.4, y + 0.1, b.cz + 2.0], [b.cx + 3.2, y + 0.1, b.cz + 1.2], [b.cx + 1.6, y + 1.6, b.cz + 1.0], [b.cx + 0.9, y + 2.7, b.cz + 1.2]], 0.05, { mat: "impRubber", color: IMP.rubber, clamps: false });
    // fuel hose from the bowser to the port pylon
    bowser(kit, [b.cx - 6.5, y, b.cz + 6.5], 0.6);
    pipeRun(kit, [[b.cx - 7.4, y + 1.2, b.cz + 7.4], [b.cx - 5.5, y + 0.15, b.cz + 4.5], [b.cx - 3.0, y + 0.15, b.cz + 1.8], [b.cx - 2.2, y + 3.9, b.cz + 0.6]], 0.07, { mat: "impRubber", color: IMP.rubber, clamps: false });
    toolCart(kit, [b.cx + 5.6, y, b.cz - 4.4], 0.4, { seed: 5 });
    toolCart(kit, [b.cx - 7.0, y, b.cz - 3.0], -1.2, { seed: 6 });
    // wheel chocks / spare canopy ring on the deck
    kit.box("impRubber", b.cx + 4.6, y + 0.12, b.cz + 5.2, 0.5, 0.24, 0.5, { color: IMP.rubber });
  }

  // ---- bay 2: port wing pulled, on the stand; crane holding the hoist over the empty pylon ------
  {
    const b = bays[1];
    tieCradle(kit, [b.cx, y, b.cz], b.yaw, { wings: [1] });
    addTIE(kit, [b.cx, y + TIE_CRADLE_HANG, b.cz], b.yaw, { lod: 0, wings: [1] });
    // the wing leans on the stand 7 m to the west of the fighter, panel facing the door
    const lean = 0.2;
    const wingYaw = b.yaw + 0.55;
    const wx = b.cx - 8.2;
    const wz = b.cz - 1.5;
    wingStand(kit, [wx, y, wz], wingYaw, { lean });
    addTIEWing(kit, [wx, y + TIE.wingTop * Math.cos(lean) + 0.03, wz], { yaw: wingYaw, tilt: lean, side: -1 });
    // hoist slings hanging from the crane hook down to the exposed pylon flange
    const crane = bridgeCrane(kit, { rx0: x0 + t + 1.0, rx1: x1 - t - 1.0, z0: 196, z1: 228, z: b.cz - 1.2, y: yC - 3.2, trolleyX: b.cx - 2.6, hookDrop: 3.6 });
    const pylonX = b.cx - Math.cos(b.yaw) * 3.1;
    const pylonZ = b.cz + Math.sin(b.yaw) * 3.1;
    pipeRun(kit, [[b.cx - 2.6, crane.hookY, b.cz - 1.2], [pylonX, y + TIE_CRADLE_HANG + 0.8, pylonZ]], 0.04, { color: IMP.steel, clamps: false });
    pipeRun(kit, [[b.cx - 2.6, crane.hookY, b.cz - 1.2], [pylonX + 0.4, y + TIE_CRADLE_HANG - 0.7, pylonZ + 0.3]], 0.04, { color: IMP.steel, clamps: false });
    serviceGantry(kit, [b.cx + 1.0, y, b.cz + 7.4], 0, { h: 3.6, len: 3.6 });
    toolCart(kit, [b.cx - 4.2, y, b.cz + 5.2], 2.0, { seed: 7 });
    toolCart(kit, [b.cx + 6.8, y, b.cz - 3.6], -0.4, { seed: 8 });
    // ground power unit by the bay entrance, cable across the deck to the ball
    const gpu = generator(kit, [86.5, y, 199.5], -0.5);
    pipeRun(kit, [gpu, [85.2, y + 0.12, 203.2], [b.cx + 0.6, y + 0.12, b.cz - 1.8], [b.cx + 0.4, y + 3.0, b.cz - 1.5]], 0.05, { mat: "impRubber", color: IMP.rubber, clamps: false });
    // the pulled hub bolts and a spare spoke laid out on a tarp
    kit.box("impRubber", b.cx - 5.6, y + 0.01, b.cz + 1.6, 2.6, 0.02, 1.8, { color: IMP.wallDark });
    for (let i = 0; i < 5; i++) kit.cyl("impMetal", b.cx - 6.5 + i * 0.4, y + 0.06, b.cz + 1.2, 0.07, 0.1, "y", { color: IMP.steel, segments: 8 });
    kit.box(RIB, b.cx - 5.4, y + 0.09, b.cz + 2.0, 2.2, 0.14, 0.2, { color: new THREE.Color("#6e737b"), texel: 1 });
  }

  // ---- east wall: fuel tanks + manifold ------------------------------------------------------
  const ex = x1 - t;
  fuelTank(kit, [ex - 2.7, y, 165], 1.7, 9, "z", { tone: IMP.wallMid });
  fuelTank(kit, [ex - 2.7, y, 178], 1.7, 9, "z", { tone: IMP.wallLight });
  fuelTank(kit, [ex - 2.7, y, 214], 1.4, 7, "z", { tone: IMP.wallMid });
  pipeRun(kit, [[ex - 1.0, y + 4.2, 158], [ex - 1.0, y + 4.2, 226]], 0.2, { color: IMP.steel });
  pipeRun(kit, [[ex - 1.0, y + 4.7, 158], [ex - 1.0, y + 4.7, 226]], 0.14, { color: IMP.gunmetal });
  for (const z of [165, 178, 214]) pipeRun(kit, [[ex - 2.7, y + 3.9, z], [ex - 1.0, y + 4.2, z]], 0.12, { color: IMP.steel, clamps: false });
  // pump skid between the tanks
  kit.box(RIB, ex - 2.4, y + 0.6, 196, 2.4, 1.2, 3.0, { color: IMP.consoleDark, texel: 1 });
  kit.cyl("impMetal", ex - 2.4, y + 1.6, 196, 0.5, 1.4, "z", { color: IMP.gunmetal, segments: 14 });
  kit.box("blinkSparse", ex - 3.61, y + 0.8, 196, 0.01, 0.3, 1.6, { uv: "keep" });
  kit.box("hazard", ex - 2.4, y + 0.1, 196, 2.5, 0.2, 3.1, { uv: "world", texel: 1 });
  kit.collider([ex - 3.7, y, 194.4], [ex, y + 2.4, 197.6], "pumpSkid");
  pipeRun(kit, [[ex - 2.4, y + 2.3, 196], [ex - 1.0, y + 4.2, 196]], 0.12, { color: IMP.steel, clamps: false });
  hoseReel(kit, [ex - 1.2, y, 188], -Math.PI / 2);
  hoseReel(kit, [ex - 1.2, y, 204], -Math.PI / 2);
  fireStation(frames.east.frame, 12, { big: true });
  fireStation(frames.east.frame, 70, { big: true });

  // ---- north wall: hose reels, status boards, lockers, ladder -----------------------------------
  {
    const f = frames.north.frame;
    statusBoard(f, 14, 3.2, 6, 2.2, { seed: 51 });
    statusBoard(f, 26, 3.2, 6, 2.2, { seed: 52 });
    wallScreen(f, 20, 3.4, 2.4, 1.4, 2);
    lockers(f, 30.5, 36.5, 2.1, { seed: 9 });
    wallLadder(f, 38.2, 0, H - 1.6, {});
    frame_placards(f, [6, 22, 34]);
    hoseReel(kit, [70, y, z0 + 1.2], 0);
    hoseReel(kit, [76, y, z0 + 1.2], 0);
    fireStation(f, 3, { big: true });
  }
  // ---- south wall: parts racks, tool chests, crates ----------------------------------------------
  {
    const f = frames.south.frame;
    partsRack(kit, [66, y, z1 - 1.0], 0, { w: 4, h: 3.0, seed: 12 });
    partsRack(kit, [71, y, z1 - 1.0], 0, { w: 4, h: 3.0, seed: 13 });
    partsRack(kit, [76, y, z1 - 1.0], 0, { w: 4, h: 3.0, seed: 14 });
    partsRack(kit, [86, y, z1 - 1.0], 0, { w: 4, h: 2.4, seed: 15 });
    toolCart(kit, [81, y, z1 - 1.4], 0, { seed: 16 });
    toolCart(kit, [82.4, y, z1 - 1.4], 0, { seed: 17 });
    crateStack(kit, [92.5, y, z1 - 1.8], 0.05, { seed: 61, n: 2 });
    crateStack(kit, [95.6, y, z1 - 1.6], -0.1, { seed: 64, n: 3, size: [2, 1.2, 1.6] });
    crateStack(kit, [93, y, z1 - 4.6], 0.3, { seed: 67, n: 1 });
    statusBoard(f, 20, 4.6, 5, 1.8, { seed: 53 });
    frame_placards(f, [10, 30]);
    wallLadder(f, 2.0, 0, H - 1.6, {});
  }
  // ---- west wall (door wall): lockers + spare wing panel racked against the wall ---------------
  {
    const f = frames.west.frame;
    lockers(f, 4, 10, 2.1, { seed: 19 });
    fireStation(f, 30, { big: true });
    fireStation(f, 50, { big: true });
    frame_placards(f, [20, 62]);
    // a crated spare wing frame leaning on the wall south of the door
    addTIEWing(kit, [x0 + t + 0.95, y + TIE.wingTop * Math.cos(0.12) + 0.03, 218], { yaw: 0, tilt: 0.12, side: 1, lod: 1 });
    for (const z of [216.2, 219.8]) kit.box("impRubber", x0 + t + 1.4, y + 0.12, z, 0.6, 0.24, 0.5, { color: IMP.rubber });
    kit.collider([x0, y, 214.5], [x0 + 2.0, y + 7.6, 221.5], "spareWing");
    kit.boxMM("hazard", [x0 + t, y + 0.004, 214.6], [x0 + t + 2.4, y + 0.012, 221.4], { uv: "world", texel: 1 });
  }

  // ---- lights ------------------------------------------------------------------------------------
  for (const b of bays) spotLightDesc(ctx, 0xdfe8ff, 900, 40, [b.cx, yC - 1.2, b.cz], [b.cx, y, b.cz], { angle: 0.8, penumbra: 0.5, shadow: true, priority: 2 });
  pointLightDesc(ctx, 0xcfd9ff, 40, 30, [66, y + 8, 190], 1);
  pointLightDesc(ctx, 0xcfd9ff, 36, 28, [72, y + 9, 160], 1);
  pointLightDesc(ctx, 0xcfd9ff, 36, 28, [72, y + 9, 222], 0);
  pointLightDesc(ctx, 0xcfd9ff, 36, 28, [94, y + 9, 170], 0);
  pointLightDesc(ctx, 0xcfd9ff, 36, 28, [94, y + 9, 212], 0);
  pointLightDesc(ctx, IMP.amber, 14, 14, [92, y + 3, 196], 0);

  // ---- views -------------------------------------------------------------------------------------
  ctx.view("fighterMaint", 62.0, y + STD.eye, 190, 270, -3);
  ctx.view("fighterMaint_bays", 64, y + STD.eye, 156, 228, -4);
  ctx.view("fighterMaint_wing", 92, y + STD.eye, 199, 132, -2);
}

// small placards (decals) at eye height along a wall frame
function frame_placards(frame, us) {
  us.forEach((u, i) => frame.quad("impDecal", u, 2.2, 0.02, 0.7, 0.7, { uvRect: impDecalRect([2, 9, 15, 0][i % 4]) }));
}
