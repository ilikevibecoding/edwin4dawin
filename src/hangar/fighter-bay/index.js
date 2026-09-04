// d4-fighter-bay — Fighter Maintenance & Refuel Bay (Deck 4, starboard forward).
// Two maintenance cradles (the traffic system parks the fighters; api.cradles() publishes the slots),
// refuel gantry + manifold on the +x wall, tool chests, parts racks, diagnostic consoles, overhead
// crane rail, yellow cradle footprints, red/amber status lights, harsh white floods.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { buildShell, floorMark, floorRect, floorDashes, WALL_T } from "../bays-shared/shell.js";
import { Placer, consoleUnit, wallScreen, toolChest, partsRack, handrail, pipe, hose, craneRails, beaconLamp, statusPost, stairs, crateKit, stripFixture, pointLight, spotLight } from "../bays-shared/props.js";

const FLOOR = -72;
const CEIL = -50;
const B = { min: [80, FLOOR, -40], max: [140, CEIL, 70] };
const DOORS = [
  { id: "d4-hangar-fighter", pos: [80, FLOOR, 15], dir: [-1, 0, 0], kind: "bay", w: 14, h: 10, to: "d4-hangar" },
  { id: "d4-fighter-cargo", pos: [111, FLOOR, 70], dir: [0, 0, 1], kind: "standard", to: "d4-cargo-bay" },
];
const CRADLES = [
  { pos: [110, -67.8, -10], yaw: 0 },
  { pos: [110, -67.8, 30], yaw: 0 },
];

// One maintenance cradle: side base plates, two clamp pylons with pads at x = cx ± 4.0, a top arch
// with work lights, status lamps, footprint markings. The 4.2 m sphere around `pos` stays clear.
function cradle(kit, P, pos) {
  const [cx, cy, cz] = pos;
  // footprint markings
  floorRect(kit, cx - 8, cz - 6.5, cx + 8, cz + 6.5, FLOOR, P.impAmber, 0.18);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    floorMark(kit, cx + sx * 8, cz + sz * 6.5, cx + sx * 6.2, cz + sz * 6.5 - sz * 0.5, FLOOR, P.impAmber, { h: 0.017 });
    floorMark(kit, cx + sx * 8, cz + sz * 6.5, cx + sx * 8 - sx * 0.5, cz + sz * 4.7, FLOOR, P.impAmber, { h: 0.017 });
  }
  floorMark(kit, cx - 0.1, cz - 6.3, cx + 0.1, cz + 6.3, FLOOR, P.impWhite, { h: 0.012 });
  floorMark(kit, cx - 7.8, cz - 0.1, cx + 7.8, cz + 0.1, FLOOR, P.impWhite, { h: 0.012 });
  // side base plates (0.14 high) with hazard lips; the centre strip under the fighter stays bare deck
  for (const s of [-1, 1]) {
    const x0 = cx + s * 1.7;
    const x1 = cx + s * 5.6;
    kit.boxMM("paintedMetal", [Math.min(x0, x1), FLOOR, cz - 3.2], [Math.max(x0, x1), FLOOR + 0.14, cz + 3.2], { color: P.impDark, texel: 1 });
    kit.boxMM("hazard", [Math.min(x0, x1) - 0.02, FLOOR + 0.02, cz - 3.22], [Math.max(x0, x1) + 0.02, FLOOR + 0.12, cz + 3.22], { texel: 1.5 });
    kit.boxMM("paintedMetal", [Math.min(x0, x1) + 0.3, FLOOR + 0.14, cz - 2.9], [Math.max(x0, x1) - 0.3, FLOOR + 0.16, cz + 2.9], { color: P.impBlack, texel: 1 });
    // clamp pylon (outside the sphere: inner face at |dx| = 4.7)
    const px0 = cx + s * 4.7;
    const px1 = cx + s * 5.9;
    kit.boxMM("paintedMetal", [Math.min(px0, px1), FLOOR, cz - 0.9], [Math.max(px0, px1), cy + 4.6, cz + 0.9], { color: P.impDark, texel: 1 });
    kit.boxMM("paintedMetal", [Math.min(px0, px1) - 0.15, FLOOR + 0.14, cz - 1.2], [Math.max(px0, px1) + 0.15, FLOOR + 1.2, cz + 1.2], { color: P.impBlack, texel: 1 });
    kit.boxMM("hazard", [Math.min(px0, px1) - 0.16, FLOOR + 0.3, cz - 1.21], [Math.max(px0, px1) + 0.16, FLOOR + 0.6, cz + 1.21], { texel: 1.5 });
    // pistons from the pylon to the clamp pad (|dx| 4.25..4.7)
    for (const dy of [-1.4, 1.4]) {
      kit.cyl("metal", cx + s * 4.48, cy + dy, cz, 0.16, 0.46, "x", { color: P.impGrey, segments: 12 });
      kit.cyl("paintedMetal", cx + s * 4.62, cy + dy, cz, 0.24, 0.18, "x", { color: P.impBlack, segments: 12 });
    }
    // clamp pad: body |dx| 4.06..4.25, rubber-black grip plate 4.0..4.08 (inner face exactly at 4.0)
    const padA = cx + s * 4.06;
    const padB = cx + s * 4.25;
    kit.boxMM("paintedMetal", [Math.min(padA, padB), cy - 2.4, cz - 1.5], [Math.max(padA, padB), cy + 2.4, cz + 1.5], { color: P.impMid, texel: 1 });
    const gripA = cx + s * 4.0;
    const gripB = cx + s * 4.08;
    kit.boxMM("paintedMetal", [Math.min(gripA, gripB), cy - 2.2, cz - 1.3], [Math.max(gripA, gripB), cy + 2.2, cz + 1.3], { color: P.impBlack, texel: 1 });
    // status lamps on the pylon's outer face + a work light on the inner top
    const fx = cx + s * (5.9 + 0.01);
    kit.boxMM("paintedMetal", [Math.min(fx, fx + s * 0.1), cy + 1.5, cz - 0.4], [Math.max(fx, fx + s * 0.1), cy + 2.6, cz + 0.4], { color: P.impBlack, texel: 2 });
    kit.boxMM("emitRedImp", [Math.min(fx + s * 0.1, fx + s * 0.14), cy + 2.2, cz - 0.25], [Math.max(fx + s * 0.1, fx + s * 0.14), cy + 2.4, cz + 0.25]);
    kit.boxMM("emitAmber", [Math.min(fx + s * 0.1, fx + s * 0.14), cy + 1.9, cz - 0.25], [Math.max(fx + s * 0.1, fx + s * 0.14), cy + 2.1, cz + 0.25]);
    kit.boxMM("emitBlue", [Math.min(fx + s * 0.1, fx + s * 0.14), cy + 1.6, cz - 0.25], [Math.max(fx + s * 0.1, fx + s * 0.14), cy + 1.8, cz + 0.25]);
    kit.collider([Math.min(px0, px1) - 0.15, FLOOR, cz - 1.2], [Math.max(px0, px1) + 0.15, FLOOR + 3, cz + 1.2], "cradle-pylon");
    kit.collider([Math.min(x0, x1), FLOOR, cz - 3.2], [Math.max(x0, x1), FLOOR + 0.14, cz + 3.2], "cradle-plate");
  }
  // fore / aft ram housings close the centre strip so nobody walks under the fighter (outside the
  // sphere: nearest point (0, 0.6, ±2.5) vs the sphere's 2.16 m footprint radius at 0.6 m)
  for (const s of [-1, 1]) {
    const z0 = Math.min(cz + s * 2.5, cz + s * 3.5);
    const z1 = Math.max(cz + s * 2.5, cz + s * 3.5);
    kit.boxMM("paintedMetal", [cx - 1.75, FLOOR, z0], [cx + 1.75, FLOOR + 0.6, z1], { color: P.impDark, texel: 1 });
    kit.boxMM("hazard", [cx - 1.77, FLOOR + 0.1, z0 - 0.02], [cx + 1.77, FLOOR + 0.3, z1 + 0.02], { texel: 1.5 });
    kit.boxMM("emitAmber", [cx - 0.6, FLOOR + 0.59, z0 + 0.3], [cx + 0.6, FLOOR + 0.63, z1 - 0.3]);
    for (const dx of [-1.1, 1.1]) kit.cyl("metal", cx + dx, FLOOR + 0.62, (z0 + z1) / 2, 0.18, 0.3, "y", { color: P.impGrey, segments: 12 });
    kit.collider([cx - 1.75, FLOOR, z0], [cx + 1.75, FLOOR + 0.6, z1], "cradle-ram");
  }
  // top arch joining the pylons (bottom at cy + 4.6 → 4.6 m above the sphere centre)
  kit.boxMM("paintedMetal", [cx - 5.9, cy + 4.6, cz - 0.9], [cx + 5.9, cy + 5.4, cz + 0.9], { color: P.impDark, texel: 1 });
  kit.boxMM("hazard", [cx - 5.9, cy + 4.62, cz - 0.92], [cx + 5.9, cy + 4.9, cz - 0.9], { texel: 1.5 });
  kit.boxMM("hazard", [cx - 5.9, cy + 4.62, cz + 0.9], [cx + 5.9, cy + 4.9, cz + 0.92], { texel: 1.5 });
  // work-light bar under the arch (bottom at cy + 4.46 → still 4.46 m from the centre)
  kit.boxMM("paintedMetal", [cx - 2.2, cy + 4.46, cz - 0.35], [cx + 2.2, cy + 4.6, cz + 0.35], { color: P.impBlack, texel: 2 });
  kit.boxMM("emitCoolSoft", [cx - 2.0, cy + 4.44, cz - 0.2], [cx + 2.0, cy + 4.46, cz + 0.2], { uv: "keep" });
  beaconLamp(kit, P, cx, cy + 5.4, cz, "emitRedImp");
  // service pit lids beside the plates (recessed panels) + cable drops
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [cx + s * 6.4 - 0.5, FLOOR + 0.004, cz - 2], [cx + s * 6.4 + 0.5, FLOOR + 0.02, cz + 2], { color: P.impBlack, texel: 1 });
    hose(kit, "paintedMetal", [cx + s * 5.3, cy + 0.5, cz + 0.9], [cx + s * 6.4, FLOOR + 0.02, cz + 1.5], 0.6, 0.045, P.impBlack);
    hose(kit, "paintedMetal", [cx + s * 5.3, cy - 0.5, cz - 0.9], [cx + s * 6.4, FLOOR + 0.02, cz - 1.6], 0.5, 0.035, P.impRed);
  }
}

export default {
  id: "d4-fighter-bay",
  name: "Fighter Maintenance & Refuel Bay",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: null,
  spawn: { pos: [110, FLOOR, 50], yaw: 0 },
  apertures: [],
  views: {
    "d4-fighter-bay-door": { pos: [82.5, FLOOR, 15], yaw: -90, pitch: 4 },
    "d4-fighter-bay-cradles": { pos: [110, FLOOR, 54], yaw: 0, pitch: 5 },
    "d4-fighter-bay-gantry": { pos: [122, FLOOR, 44], yaw: -55, pitch: 10 },
    "d4-fighter-bay-racks": { pos: [95, FLOOR, 2], yaw: -38, pitch: 6 },
  },
  build(ctx) {
    const { kit, PALETTE: P } = ctx;
    const rand = rng(ctx.seed);
    buildShell(ctx, {
      bounds: B,
      doors: DOORS,
      seed: 11,
      floor: { color: P.impMid, plate: 6 },
      services: { v: 9.0 },
      ceiling: { beamAxis: "x", beamSpacing: 11, fixtureRows: 2, fixturesPerRow: 6, fixtureLen: 7, fixtureW: 1.0 },
    });

    // ---- cradles
    for (const c of CRADLES) cradle(kit, P, c.pos);

    // ---- taxi lane from the bay door to the cradle line (yellow edges, white dashed centre)
    floorMark(kit, 80 + WALL_T + 1.2, 15 - 7.2, 101.5, 15 - 7.0, FLOOR, P.impAmber);
    floorMark(kit, 80 + WALL_T + 1.2, 15 + 7.0, 101.5, 15 + 7.2, FLOOR, P.impAmber);
    floorDashes(kit, 82, 15, 101, 15, FLOOR, P.impWhite, { w: 0.2, dash: 1.6, gapLen: 1.0 });
    floorMark(kit, 101.3, 15 - 7.2, 101.7, 15 + 7.2, FLOOR, P.impAmber, { h: 0.017 });
    // hold-line bars across the lane mouth
    for (let i = 0; i < 5; i++) floorMark(kit, 84 + i * 3.2, 15 - 6.2, 84.4 + i * 3.2, 15 + 6.2, FLOOR, i % 2 ? P.impAmber : P.impWhite, { h: 0.011 });

    // ---- refuel gantry geometry constants (used by the cradle hoses too)
    const gX0 = 136.0;
    const gX1 = 140 - WALL_T - 0.3;
    const gY = FLOOR + 3.6;
    const gZ0 = -30;
    const gZ1 = 60;
    const reelZ = [];
    for (let z = gZ0 + 4; z < gZ1 - 2; z += 9) reelZ.push(z + 1.0);

    // ---- diagnostic consoles + support cluster per cradle (operator faces +x toward the cradle)
    for (const c of CRADLES) {
      const cz = c.pos[2];
      consoleUnit(new Placer(kit, [101.4, FLOOR, cz + 4.5], 90), P, { w: 2.2, screens: ["screenImp0", "screenImp1"], indicators: 2 });
      consoleUnit(new Placer(kit, [101.4, FLOOR, cz - 4.5], 90), P, { w: 1.6, screens: ["screenImp1"], indicators: 1 });
      statusPost(kit, P, 102.6, FLOOR, cz + 7.6);
      // tool chests + parts rack on the +x side of the cradle, drawers/bins facing the cradle (-x)
      toolChest(new Placer(kit, [118.4, FLOOR, cz + 4.0], 90), P);
      toolChest(new Placer(kit, [118.4, FLOOR, cz + 5.4], 90), P, { w: 0.9, h: 0.9 });
      partsRack(new Placer(kit, [119.0, FLOOR, cz - 5.2], 90), P, rand, { w: 3.2, h: 2.4, tiers: 4 });
      // fuel coupling cart beside the cradle (hose from the nearest gantry reel lands here)
      const cart = new Placer(kit, [117.6, FLOOR, cz], 0);
      cart.box("paintedMetal", 0, 0.55, 0, 1.2, 0.8, 1.6, { color: P.impDark, texel: 2 });
      cart.box("hazard", 0, 0.98, 0, 1.24, 0.06, 1.64, { texel: 2 });
      cart.cyl("paintedMetal", 0, 1.25, 0, 0.35, 0.5, "y", { color: P.impRed, segments: 14 });
      cart.box("emitAmber", 0.3, 1.02, -0.82, 0.12, 0.05, 0.02);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cart.cyl("paintedMetal", sx * 0.55, 0.15, sz * 0.7, 0.15, 0.1, "x", { color: P.impBlack, segments: 10 });
      cart.collider([-0.65, 0, -0.85], [0.65, 1.5, 0.85], "fuel-cart");
      const rz = reelZ.reduce((a, b) => (Math.abs(b - cz) < Math.abs(a - cz) ? b : a));
      hose(kit, "paintedMetal", [117.6, FLOOR + 1.5, cz], [gX0 + 0.9, gY + 0.75, rz], 2.4, 0.09, P.impBlack, { segments: 18, radial: 8 });
    }

    // ---- wall screens on the west wall flanking the bay door (facing +x, into the room)
    for (const z of [15 - 10.5, 15 + 10.5]) {
      wallScreen(new Placer(kit, [80 + WALL_T + 0.1, FLOOR, z], -90), P, { w: 2.2, h: 1.3, y: 2.0, mat: z < 15 ? "screenImp0" : "screenImp1" });
    }

    // ---- refuel gantry along the +x wall: raised platform on columns, manifold, reels, fuel cells
    kit.boxMM("paintedMetal", [gX0, gY - 0.3, gZ0], [gX1, gY, gZ1], { color: P.impDark, texel: 1 });
    kit.boxMM("impFloor", [gX0 + 0.05, gY, gZ0 + 0.05], [gX1 - 0.05, gY + 0.04, gZ1 - 0.05], { color: P.impGrey, texel: 0.5 });
    kit.boxMM("hazard", [gX0 - 0.02, gY - 0.28, gZ0], [gX0, gY - 0.02, gZ1], { texel: 1.5 });
    for (let z = gZ0 + 1; z <= gZ1 - 1; z += 6) {
      kit.box("paintedMetal", gX0 + 0.5, (FLOOR + gY - 0.3) / 2, z, 0.6, gY - 0.3 - FLOOR, 0.6, { color: P.impDark, texel: 1 });
      kit.box("hazard", gX0 + 0.5, FLOOR + 0.35, z, 0.62, 0.5, 0.62, { texel: 1.5 });
    }
    handrail(kit, P, [gX0 + 0.05, gZ0 + 0.05], [gX0 + 0.05, gZ1 - 0.05], gY + 0.04, { collide: false });
    // stairs up at both ends (rising toward the platform)
    stairs(new Placer(kit, [gX0 + 1.9, FLOOR, gZ0 - 6.0], 0), P, { w: 1.6, steps: 20, rise: 0.18, run: 0.3 });
    stairs(new Placer(kit, [gX0 + 1.9, FLOOR, gZ1 + 6.0], 180), P, { w: 1.6, steps: 20, rise: 0.18, run: 0.3 });
    // the platform itself blocks the player (they cannot climb stairs yet)
    kit.collider([gX0, FLOOR, gZ0], [gX1 + 0.5, gY + 1.2, gZ1], "gantry");
    // fuel manifold on the wall above the platform (in front of the pilasters): two mains, valves, gauges
    const mx = 140 - WALL_T - 0.45 - 0.5;
    pipe(kit, P, [mx, gY + 2.6, gZ0 + 1], [mx, gY + 2.6, gZ1 - 1], 0.32, P.impGrey, { flanges: 9 });
    pipe(kit, P, [mx + 0.1, gY + 3.5, gZ0 + 1], [mx + 0.1, gY + 3.5, gZ1 - 1], 0.22, P.impAmber, { mat: "paintedMetal", flanges: 9 });
    for (const rz of reelZ) {
      const z = rz - 1.0;
      // riser to a reel on the platform edge
      pipe(kit, P, [mx, gY + 2.6, z], [mx, gY + 0.6, z], 0.12, P.impGrey);
      pipe(kit, P, [mx, gY + 0.6, z], [gX0 + 0.9, gY + 0.6, z], 0.12, P.impGrey);
      // valve wheel on the riser
      kit.add("metal", new THREE.TorusGeometry(0.28, 0.035, 8, 20), { pos: [mx - 0.35, gY + 1.7, z], rot: [0, Math.PI / 2, 0], color: P.impAmber, uv: "scale", uvScale: [4, 1] });
      kit.cyl("metal", mx - 0.2, gY + 1.7, z, 0.04, 0.32, "x", { color: P.impGrey, segments: 8 });
      // hose reel drum at the platform edge
      kit.cyl("paintedMetal", gX0 + 0.9, gY + 0.75, rz, 0.55, 0.5, "x", { color: P.impDark, segments: 16 });
      kit.cyl("paintedMetal", gX0 + 0.9, gY + 0.75, rz, 0.45, 0.62, "x", { color: P.impBlack, segments: 16 });
      kit.box("paintedMetal", gX0 + 0.9, gY + 0.35, rz, 0.7, 0.7, 0.2, { color: P.impDark, texel: 2 });
      kit.box("emitAmber", gX0 + 1.28, gY + 1.05, rz, 0.06, 0.08, 0.2);
      // gauge cluster
      kit.box("paintedMetal", mx - 0.1, gY + 1.3, z - 1.4, 0.16, 0.7, 0.6, { color: P.impBlack, texel: 2 });
      kit.box("emitBlue", mx - 0.19, gY + 1.5, z - 1.5, 0.02, 0.14, 0.14);
      kit.box("emitRedImp", mx - 0.19, gY + 1.5, z - 1.28, 0.02, 0.14, 0.14);
      kit.box("emitAmber", mx - 0.19, gY + 1.15, z - 1.4, 0.02, 0.06, 0.4);
    }
    // fuel cells under the platform between the columns
    for (let z = gZ0 + 4; z < gZ1 - 2; z += 12) {
      kit.cyl("paintedMetal", 138.2, FLOOR + 1.5, z, 1.1, 2.6, "y", { color: P.impGrey, segments: 20 });
      kit.cyl("paintedMetal", 138.2, FLOOR + 0.6, z, 1.15, 0.24, "y", { color: P.impAmber, segments: 20 });
      kit.cyl("paintedMetal", 138.2, FLOOR + 2.4, z, 1.15, 0.24, "y", { color: P.impAmber, segments: 20 });
      kit.cyl("paintedMetal", 138.2, FLOOR + 2.95, z, 0.4, 0.3, "y", { color: P.impDark, segments: 12 });
      kit.box("hazard", 137.05, FLOOR + 1.5, z, 0.02, 0.5, 1.2, { texel: 2 });
    }
    // big fuel sign plates on the wall above the manifold
    for (const z of [-12, 15, 42]) {
      kit.boxMM("paintedMetal", [140 - WALL_T - 0.19, gY + 3.9, z - 2.2], [140 - WALL_T - 0.07, gY + 5.3, z + 2.2], { color: P.impBlack, texel: 1 });
      kit.boxMM("hazard", [140 - WALL_T - 0.21, gY + 4.0, z - 2.1], [140 - WALL_T - 0.19, gY + 4.25, z + 2.1], { texel: 1.5 });
      kit.boxMM("emitAmber", [140 - WALL_T - 0.21, gY + 4.5, z - 1.8], [140 - WALL_T - 0.19, gY + 5.0, z + 1.8]);
    }

    // ---- parts racks + crate stock along the forward wall (z = -40), between the pilasters (x 92/104/116/128)
    for (const x of [85.6, 89.4, 94.4, 97.9, 101.4, 106.4, 109.9, 113.4, 118.4, 121.9, 125.4, 130.4, 133.9]) {
      partsRack(new Placer(kit, [x, FLOOR, -40 + WALL_T + 0.06 + 0.45], 0), P, rand, { w: 3.4, h: 3.0, tiers: 5, d: 0.85 });
    }
    for (const [x, z, yaw] of [[131.6, -36.6, 0], [133.0, -36.4, 25], [131.6, -35.3, 0]]) crateKit(new Placer(kit, [x, FLOOR, z], yaw), P, { color: P.impMid, collide: true });
    crateKit(new Placer(kit, [131.6, FLOOR + 1.2, -36.6], 0), P, { color: P.impGrey, h: 0.8 });

    // ---- aft wall (z = 70): locker banks + wall screens flanking the cargo door (pilasters at x 92/104/116/128)
    for (const x of [86.5, 97.5, 124, 133.5]) {
      const pl = new Placer(kit, [x, FLOOR, 70 - WALL_T - 0.06 - 0.45], 0);
      for (let i = 0; i < 4; i++) {
        pl.box("paintedMetal", -1.5 + i * 1.0, 1.1, 0, 0.9, 2.2, 0.8, { color: i % 2 ? P.impDark : P.impMid, texel: 1.5 });
        pl.box("paintedMetal", -1.5 + i * 1.0, 1.1, -0.42, 0.8, 2.0, 0.03, { color: P.impBlack, texel: 2 });
        pl.box("emitBlue", -1.5 + i * 1.0 + 0.3, 1.9, -0.44, 0.08, 0.04, 0.01);
      }
      pl.collider([-2.0, 0, -0.45], [2.0, 2.3, 0.45], "lockers");
    }
    wallScreen(new Placer(kit, [106, FLOOR, 70 - WALL_T - 0.08], 0), P, { w: 2.4, h: 1.4, y: 2.1, mat: "screenImp0" });
    wallScreen(new Placer(kit, [119.5, FLOOR, 70 - WALL_T - 0.08], 0), P, { w: 2.4, h: 1.4, y: 2.1, mat: "screenImp1" });

    // ---- component staging (aft of cradle 2, port side): engine-unit dollies, crate stack, spares
    floorRect(kit, 85, 40, 99, 58, FLOOR, P.impWhite, 0.15);
    floorDashes(kit, 99, 40, 99, 58, FLOOR, P.impAmber, { w: 0.15, dash: 1.0, gapLen: 0.6 });
    for (let i = 0; i < 3; i++) {
      const pl = new Placer(kit, [88 + i * 4.2, FLOOR, 49], 0);
      // dolly
      pl.box("paintedMetal", 0, 0.42, 0, 1.6, 0.14, 3.6, { color: P.impDark, texel: 1.5 });
      pl.box("hazard", 0, 0.42, 0, 1.62, 0.1, 3.62, { texel: 2 });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pl.cyl("paintedMetal", sx * 0.7, 0.18, sz * 1.4, 0.18, 0.16, "x", { color: P.impBlack, segments: 12 });
      for (const sz of [-1, 1]) pl.box("paintedMetal", 0, 0.75, sz * 1.1, 1.5, 0.5, 0.12, { color: P.impMid, texel: 2 });
      // engine unit: main can, nozzle cone, front intake ring, hazard band, two straps
      pl.cyl("paintedMetal", 0, 1.2, 0.2, 0.7, 2.4, "z", { color: P.impGrey, segments: 18 });
      pl.cyl("paintedMetal", 0, 1.2, -1.45, 0.55, 0.9, "z", { color: P.impDark, segments: 18, r2: 0.7 });
      pl.cyl("emitBlue", 0, 1.2, -1.92, 0.42, 0.06, "z", { segments: 18 });
      pl.cyl("paintedMetal", 0, 1.2, 1.5, 0.74, 0.3, "z", { color: P.impAmber, segments: 18 });
      pl.cyl("paintedMetal", 0, 1.2, 0.0, 0.74, 0.12, "z", { color: P.impBlack, segments: 18 });
      for (const z of [-0.6, 0.9]) pl.box("paintedMetal", 0, 1.2, z, 1.56, 1.56, 0.08, { color: P.impBlack, texel: 2 });
      pl.box("paintedMetal", 0, 1.9, 0.4, 0.5, 0.2, 0.6, { color: P.impDark, texel: 2 });
      pl.box("emitAmber", 0.1, 2.02, 0.4, 0.12, 0.04, 0.12);
      pl.collider([-0.85, 0, -2.0], [0.85, 2.0, 1.85], "dolly");
    }
    crateKit(new Placer(kit, [87.2, FLOOR, 56.2], 0), P, { color: P.impMid, collide: true });
    crateKit(new Placer(kit, [88.6, FLOOR, 56.4], 12), P, { color: P.impMid, collide: true });
    crateKit(new Placer(kit, [87.2, FLOOR + 1.2, 56.2], 0), P, { color: P.impGrey, h: 0.9 });
    toolChest(new Placer(kit, [97.2, FLOOR, 43], -90), P);
    toolChest(new Placer(kit, [97.2, FLOOR, 44.4], -90), P, { w: 0.9, h: 0.9 });
    consoleUnit(new Placer(kit, [97.2, FLOOR, 54], -90), P, { w: 1.4, screens: ["screenImp0"], indicators: 1 });
    statusPost(kit, P, 99.6, FLOOR, 40.6);

    // ---- overhead crane: rails along z at x 104 / 116, bridge between the cradles
    craneRails(kit, P, { axis: "z", at: [104, 116], from: -36, to: 66, y: CEIL - 3.5, ceilY: CEIL - 0.12, bridgeAt: 10, hookDrop: 6 });

    // ---- lighting: floods + key spots over the cradles (descriptors only)
    const L = ctx.lights;
    for (const [x, z] of [[95, -22], [125, -22], [95, 15], [125, 15], [95, 52], [125, 52]]) L.push(pointLight([x, FLOOR + 11, z], 0xe6eeff, 260, 42, 0.55));
    L.push(pointLight([133.5, gY + 2.0, 15], 0xffb060, 45, 20, 0.5)); // amber pool over the gantry
    L.push(pointLight([84, FLOOR + 6, 15], 0xff4030, 40, 16, 0.5)); // red beacon wash at the bay door
    for (const c of CRADLES) L.push(spotLight([c.pos[0], CEIL - 2.5, c.pos[2]], [c.pos[0], FLOOR, c.pos[2]], 0xf2f6ff, 900, 40, 0.42, 0.45, 0.9));
    L.push(spotLight([84, CEIL - 3, 15], [96, FLOOR, 15], 0xf2f6ff, 500, 40, 0.5, 0.5, 0.6));

    // strip fixtures under the gantry (working light for the fuel cells)
    for (let z = gZ0 + 3; z < gZ1 - 2; z += 9) stripFixture(kit, P, 137.6, gY - 0.32, z, 3.0, "z", "emitCool");

    return {
      api: {
        cradles: () => CRADLES.map((c) => ({ pos: [...c.pos], yaw: c.yaw })),
      },
    };
  },
};
