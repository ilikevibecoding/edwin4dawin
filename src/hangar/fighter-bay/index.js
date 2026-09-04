// d4-fighter-bay — Fighter Maintenance & Refuel Bay (Deck 4, starboard forward).
// Two maintenance cradles (the traffic system parks the fighters; api.cradles() publishes the slots),
// a refuel gantry on the +x wall (raised deck, dark three-line manifold with flanged joints, valve
// blocks and hose reels dropping to the cradle fuel carts), wing-panel storage rack and ordnance
// trolleys in the forward third, component staging aft, lockers and wall gear at human height, an
// overhead crane, yellow/white floor markings only, harsh white key spots pooling on the cradles.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { buildShell, floorMark, floorRect, wallJunction, crewHatch, WALL_T, YELLOW } from "../bays-shared/shell.js";
import { bayMaterials } from "../bays-shared/materials.js";
import { Placer, consoleUnit, wallScreen, toolChest, partsRack, lockerBank, handrail, pipe, hose, craneRails, beaconLamp, statusPost, stairs, crateKit, hexPanel, louvredFixture, stripFixture, pointLight, spotLight } from "../bays-shared/props.js";

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

// Refuel gantry constants (deck along the +x wall)
const gX0 = 136.0;
const gX1 = 140 - WALL_T - 0.3;
const gY = FLOOR + 3.6;
const gZ0 = -30;
const gZ1 = 60;
const REEL_Z = [-21.7, -9.5, 2.8, 15, 27.2, 39.5, 51.7]; // mid-way between the wall ribs
const LADDER_Z = 9.0;
const CART_X = 118.0;

// One maintenance cradle: side base plates, two clamp pylons with pads at x = cx ± 4.0, a top arch
// with a louvred work light, a single status lens per pylon, ram housings closing the centre strip,
// yellow footprint hugging the structure. The 4.2 m sphere around `pos` stays clear.
function cradle(kit, P, pos) {
  const [cx, cy, cz] = pos;
  floorRect(kit, cx - 6.6, cz - 4.4, cx + 6.6, cz + 4.4, FLOOR, YELLOW, 0.18);
  floorMark(kit, cx - 0.08, cz - 1.6, cx + 0.08, cz + 1.6, FLOOR, P.impWhite, { h: 0.012 });
  floorMark(kit, cx - 1.6, cz - 0.08, cx + 1.6, cz + 0.08, FLOOR, P.impWhite, { h: 0.012 });
  for (const s of [-1, 1]) {
    const x0 = Math.min(cx + s * 1.7, cx + s * 5.6);
    const x1 = Math.max(cx + s * 1.7, cx + s * 5.6);
    // side base plate (0.14 high) with a black inset top and an amber edge light on the centre side
    kit.boxMM("paintedMetal", [x0, FLOOR, cz - 3.2], [x1, FLOOR + 0.14, cz + 3.2], { color: P.impDark, texel: 1 });
    kit.boxMM("paintedMetal", [x0 + 0.3, FLOOR + 0.14, cz - 2.9], [x1 - 0.3, FLOOR + 0.16, cz + 2.9], { color: P.impBlack, texel: 1 });
    const ex = cx + s * 1.78;
    kit.boxMM("emitAmber", [ex - 0.03, FLOOR + 0.14, cz - 2.9], [ex + 0.03, FLOOR + 0.165, cz + 2.9]);
    // clamp pylon (outside the sphere: inner face at |dx| = 4.7) on a black foot with a thin amber band
    const px0 = Math.min(cx + s * 4.7, cx + s * 5.9);
    const px1 = Math.max(cx + s * 4.7, cx + s * 5.9);
    kit.boxMM("paintedMetal", [px0, FLOOR, cz - 0.9], [px1, cy + 4.6, cz + 0.9], { color: P.impDark, texel: 1 });
    kit.boxMM("paintedMetal", [px0 - 0.15, FLOOR + 0.14, cz - 1.2], [px1 + 0.15, FLOOR + 1.2, cz + 1.2], { color: P.impBlack, texel: 1 });
    kit.boxMM("emitAmber", [px0 - 0.16, FLOOR + 0.62, cz - 1.21], [px1 + 0.16, FLOOR + 0.66, cz + 1.21]);
    // pistons from the pylon to the clamp pad (|dx| 4.25..4.7)
    for (const dy of [-1.4, 1.4]) {
      kit.cyl("metal", cx + s * 4.48, cy + dy, cz, 0.16, 0.46, "x", { color: P.impGrey, segments: 12 });
      kit.cyl("paintedMetal", cx + s * 4.62, cy + dy, cz, 0.24, 0.18, "x", { color: P.impBlack, segments: 12 });
    }
    // clamp pad: body |dx| 4.06..4.25, rubber-black grip plate 4.0..4.08 (inner face exactly at 4.0)
    kit.boxMM("paintedMetal", [Math.min(cx + s * 4.06, cx + s * 4.25), cy - 2.4, cz - 1.5], [Math.max(cx + s * 4.06, cx + s * 4.25), cy + 2.4, cz + 1.5], { color: P.impMid, texel: 1 });
    kit.boxMM("paintedMetal", [Math.min(cx + s * 4.0, cx + s * 4.08), cy - 2.2, cz - 1.3], [Math.max(cx + s * 4.0, cx + s * 4.08), cy + 2.2, cz + 1.3], { color: P.impBlack, texel: 1 });
    // single hooded status lens on the pylon's outer face (+ a small red lens under it)
    const fx = cx + s * 5.9;
    const hood = [Math.min(fx, fx + s * 0.16), Math.max(fx, fx + s * 0.16)];
    kit.boxMM("paintedMetal", [hood[0], cy + 1.6, cz - 0.3], [hood[1], cy + 2.2, cz + 0.3], { color: P.impBlack, texel: 2 });
    const lens = [Math.min(fx + s * 0.16, fx + s * 0.19), Math.max(fx + s * 0.16, fx + s * 0.19)];
    kit.boxMM("emitBlue", [lens[0], cy + 1.85, cz - 0.16], [lens[1], cy + 2.1, cz + 0.16]);
    kit.boxMM("emitRedImp", [lens[0], cy + 1.66, cz - 0.05], [lens[1], cy + 1.74, cz + 0.05]);
    kit.collider([px0 - 0.15, FLOOR, cz - 1.2], [px1 + 0.15, FLOOR + 3, cz + 1.2], "cradle-pylon");
    kit.collider([x0, FLOOR, cz - 3.2], [x1, FLOOR + 0.14, cz + 3.2], "cradle-plate");
  }
  // fore / aft ram housings close the centre strip so nobody walks under the fighter (outside the
  // sphere: nearest point (0, 0.6, ±2.5) vs the sphere's 2.16 m footprint radius at 0.6 m)
  for (const s of [-1, 1]) {
    const z0 = Math.min(cz + s * 2.5, cz + s * 3.5);
    const z1 = Math.max(cz + s * 2.5, cz + s * 3.5);
    kit.boxMM("paintedMetal", [cx - 1.75, FLOOR, z0], [cx + 1.75, FLOOR + 0.6, z1], { color: P.impDark, texel: 1 });
    kit.boxMM("paintedMetal", [cx - 1.6, FLOOR + 0.6, z0 + 0.1], [cx + 1.6, FLOOR + 0.62, z1 - 0.1], { color: P.impBlack, texel: 1 });
    kit.boxMM("emitAmber", [cx - 0.6, FLOOR + 0.61, z0 + 0.3], [cx + 0.6, FLOOR + 0.64, z1 - 0.3]);
    for (const dx of [-1.1, 1.1]) kit.cyl("metal", cx + dx, FLOOR + 0.66, (z0 + z1) / 2, 0.18, 0.3, "y", { color: P.impGrey, segments: 12 });
    kit.collider([cx - 1.75, FLOOR, z0], [cx + 1.75, FLOOR + 0.6, z1], "cradle-ram");
  }
  // top arch joining the pylons (bottom at cy + 4.6 → 4.6 m above the sphere centre), amber edge lights
  kit.boxMM("paintedMetal", [cx - 5.9, cy + 4.6, cz - 0.9], [cx + 5.9, cy + 5.4, cz + 0.9], { color: P.impDark, texel: 1 });
  for (const s of [-1, 1]) kit.boxMM("emitAmber", [cx - 5.6, cy + 4.58, Math.min(cz + s * 0.8, cz + s * 0.86)], [cx + 5.6, cy + 4.61, Math.max(cz + s * 0.8, cz + s * 0.86)]);
  // louvred work light under the arch (housing 2 cm into the arch, emitter at cy + 4.45)
  louvredFixture(kit, P, cx, cy + 4.46, cz, 4.2, 0.5, "x", "emitWhite", { depth: 0.16, louvre: 0.3 });
  beaconLamp(kit, P, cx, cy + 5.4, cz, "emitRedImp");
  // service pit lids beside the plates (recessed panels) + cable drops
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [cx + s * 6.4 - 0.5, FLOOR + 0.004, cz - 2], [cx + s * 6.4 + 0.5, FLOOR + 0.02, cz + 2], { color: P.impBlack, texel: 1 });
    hose(kit, "paintedMetal", [cx + s * 5.3, cy + 0.5, cz + 0.9], [cx + s * 6.4, FLOOR + 0.02, cz + 1.5], 0.6, 0.045, P.impBlack);
    hose(kit, "paintedMetal", [cx + s * 5.3, cy - 0.5, cz - 0.9], [cx + s * 6.4, FLOOR + 0.02, cz - 1.6], 0.5, 0.035, P.impDark);
  }
}

// Fuel coupling cart beside a cradle (the reel hose lands on its top connector). Local: 1.2 × 1.6.
function fuelCart(pl, P) {
  pl.box("paintedMetal", 0, 0.55, 0, 1.2, 0.8, 1.6, { color: P.impDark, texel: 2 });
  pl.box("paintedMetal", 0, 0.97, 0, 1.1, 0.04, 1.5, { color: P.impBlack, texel: 2 });
  pl.cyl("paintedMetal", 0, 1.25, 0.2, 0.35, 0.5, "y", { color: P.impMid, segments: 14 });
  pl.cyl("emitAmber", 0, 1.25, 0.2, 0.355, 0.03, "y", { segments: 14 });
  pl.cyl("metal", 0, 1.56, 0.2, 0.12, 0.14, "y", { color: P.impGrey, segments: 10 });
  pl.box("paintedMetal", 0, 1.1, -0.55, 0.5, 0.22, 0.3, { color: P.impBlack, texel: 2 });
  pl.box("emitBlue", -0.1, 1.15, -0.71, 0.1, 0.05, 0.01);
  pl.box("emitRedImp", 0.12, 1.15, -0.71, 0.06, 0.05, 0.01);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pl.cyl("paintedMetal", sx * 0.55, 0.15, sz * 0.7, 0.15, 0.1, "x", { color: P.impBlack, segments: 10 });
  pl.collider([-0.65, 0, -0.85], [0.65, 1.7, 0.85], "fuel-cart");
}

// Vertical ladder on the gantry face with hoops above the deck
function ladder(kit, P, x, z, y0, y1) {
  for (const dz of [-0.28, 0.28]) kit.cyl("metal", x, (y0 + y1) / 2, z + dz, 0.025, y1 - y0, "y", { color: P.impGrey, segments: 8 });
  for (let y = y0 + 0.3; y < y1 - 1.0; y += 0.3) kit.cyl("metal", x, y, z, 0.018, 0.56, "z", { color: P.impGrey, segments: 6 });
  for (const y of [y0 + 0.6, y0 + 2.0, gY - 0.2]) kit.box("paintedMetal", x + 0.08, y, z, 0.16, 0.06, 0.7, { color: P.impBlack, texel: 2 });
  kit.collider([x - 0.15, y0, z - 0.4], [x + 0.15, y0 + 2.2, z + 0.4], "ladder");
}

// A-frame storage rack holding three spare wing panels upright
function wingRack(kit, P, cx, cz) {
  const pl = new Placer(kit, [cx, FLOOR, cz], 0);
  const H = 7.7;
  for (const sx of [-1, 1]) {
    pl.box("paintedMetal", sx * 2.2, 0.15, 0, 0.3, 0.3, 8.6, { color: P.impDark, texel: 1 });
    for (const sz of [-1, 1]) {
      pl.box("paintedMetal", sx * 2.2, H / 2, sz * 4.15, 0.3, H, 0.3, { color: P.impDark, texel: 1 });
      pl.box("paintedMetal", sx * 2.2, 0.06, sz * 4.15, 0.7, 0.12, 0.7, { color: P.impBlack, texel: 2 });
      pl.box("emitAmber", sx * 2.2 + sx * 0.16, 1.6, sz * 4.15, 0.01, 0.16, 0.08);
    }
    pl.box("paintedMetal", sx * 2.2, H - 0.15, 0, 0.3, 0.3, 8.6, { color: P.impMid, texel: 1 });
  }
  for (const sz of [-1, 1]) {
    pl.box("paintedMetal", 0, 0.15, sz * 4.15, 4.4, 0.3, 0.3, { color: P.impDark, texel: 1 });
    pl.box("paintedMetal", 0, H - 0.15, sz * 4.15, 4.4, 0.3, 0.3, { color: P.impMid, texel: 1 });
  }
  for (const x of [-1.4, 0, 1.4]) {
    hexPanel(pl, P, { r: 3.5, thick: 0.16, at: [x, 3.85, 0] });
    for (const z of [-0.6, 0.6]) pl.box("paintedMetal", x, 0.42, z, 0.5, 0.24, 0.3, { color: P.impBlack, texel: 2 }); // rest blocks
    for (const z of [-3.3, 3.3]) pl.box("paintedMetal", x, 3.85, z, 0.4, 0.5, 0.3, { color: P.impBlack, texel: 2 }); // rim clamps
    pl.box("paintedMetal", x, H - 0.3, 0, 0.3, 0.3, 0.7, { color: P.impBlack, texel: 2 }); // top hanger
  }
  pl.collider([-2.5, 0, -4.4], [2.5, H, 4.4], "wing-rack");
  floorRect(kit, cx - 3.0, cz - 4.8, cx + 3.0, cz + 4.8, FLOOR, YELLOW, 0.14);
}

// Ordnance trolley: dark frame on four wheels carrying two dark torpedo-shaped stores, amber tip lenses
function ordnanceTrolley(pl, P) {
  pl.box("paintedMetal", 0, 0.6, 0, 1.1, 0.12, 3.2, { color: P.impDark, texel: 1.5 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    pl.box("paintedMetal", sx * 0.45, 0.35, sz * 1.3, 0.08, 0.5, 0.08, { color: P.impBlack, texel: 2 });
    pl.cyl("paintedMetal", sx * 0.5, 0.16, sz * 1.3, 0.16, 0.1, "x", { color: P.impBlack, segments: 10 });
  }
  for (const sx of [-1, 1]) {
    pl.cyl("paintedMetal", sx * 0.3, 0.92, 0.2, 0.22, 2.6, "z", { color: P.impDark, segments: 14 });
    pl.cyl("paintedMetal", sx * 0.3, 0.92, -1.5, 0.05, 0.8, "z", { color: P.impMid, segments: 14, r2: 0.22 });
    pl.cyl("emitAmber", sx * 0.3, 0.92, -1.91, 0.03, 0.03, "z", { segments: 8 });
    for (const z of [-0.6, 1.0]) pl.box("paintedMetal", sx * 0.3, 0.92, z, 0.5, 0.5, 0.08, { color: P.impBlack, texel: 2 });
    pl.box("emitBlue", sx * 0.3 + 0.12, 1.18, 1.3, 0.06, 0.02, 0.06);
  }
  pl.box("paintedMetal", 0, 0.75, 1.55, 0.6, 0.3, 0.1, { color: P.impBlack, texel: 2 });
  pl.collider([-0.6, 0, -1.9], [0.6, 1.3, 1.65], "ordnance");
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
    "d4-fighter-bay-cradles": { pos: [110, FLOOR, -32], yaw: 180, pitch: 6 },
    "d4-fighter-bay-gantry": { pos: [122, FLOOR, 44], yaw: -55, pitch: 10 },
    "d4-fighter-bay-racks": { pos: [99, FLOOR, -18], yaw: 45, pitch: 5 },
  },
  materials(shared) {
    return { ...bayMaterials(shared) };
  },
  build(ctx) {
    const { kit, PALETTE: P } = ctx;
    const rand = rng(ctx.seed);
    const shell = buildShell(ctx, {
      bounds: B,
      doors: DOORS,
      seed: 11,
      floor: { color: 0x3f434a, plate: 6 },
      // the refuel deck runs along the east wall; the forward wall carries 3 m racks
      services: { perWall: { east: false, fwd: { v: 3.4 } } },
      ceiling: { beamAxis: "x", beamSpacing: 11, fixtureRows: 2, fixturesPerRow: 6, fixtureLen: 7, fixtureW: 1.0 },
    });

    // ---- cradles + the white cradle line joining them (broken where the fighters sit)
    for (const c of CRADLES) cradle(kit, P, c.pos);
    for (const [z0, z1] of [[-34, -14.8], [-5.2, 25.2], [34.8, 52]]) floorMark(kit, 109.94, z0, 110.06, z1, FLOOR, P.impWhite, { h: 0.012 });
    for (const z of [-34, 52]) floorMark(kit, 108.8, z - 0.06, 111.2, z + 0.06, FLOOR, P.impWhite, { h: 0.012 });

    // ---- taxi lane from the bay door to the cradle line: yellow edges, one white hold bar, end bar
    floorMark(kit, 80 + WALL_T + 1.2, 15 - 7.2, 101.5, 15 - 7.0, FLOOR, YELLOW);
    floorMark(kit, 80 + WALL_T + 1.2, 15 + 7.0, 101.5, 15 + 7.2, FLOOR, YELLOW);
    floorMark(kit, 101.3, 15 - 7.2, 101.7, 15 + 7.2, FLOOR, YELLOW, { h: 0.017 });
    floorMark(kit, 86.0, 15 - 6.4, 86.5, 15 + 6.4, FLOOR, P.impWhite, { h: 0.011 });
    for (let i = 0; i < 6; i++) floorMark(kit, 86.6, 15 - 6.4 + i * 2.3, 88.0, 15 - 6.4 + i * 2.3 + 0.3, FLOOR, P.impWhite, { h: 0.011 });

    // ---- per cradle: diagnostic consoles (operator faces +x), one status post, chests, rack, fuel cart
    for (const c of CRADLES) {
      const cz = c.pos[2];
      consoleUnit(new Placer(kit, [100.2, FLOOR, cz + 4.5], 90), P, { w: 2.2, screens: ["screenImp0", "screenImp1"] });
      consoleUnit(new Placer(kit, [100.2, FLOOR, cz - 4.5], 90), P, { w: 1.6, screens: ["screenImp1"] });
      statusPost(kit, P, 100.6, FLOOR, cz + 7.8, { face: -90, lens: "emitBlue" });
      toolChest(new Placer(kit, [118.4, FLOOR, cz + 4.0], 90), P);
      toolChest(new Placer(kit, [118.4, FLOOR, cz + 5.4], 90), P, { w: 0.9, h: 0.9 });
      partsRack(new Placer(kit, [119.0, FLOOR, cz - 5.2], 90), P, rand, { w: 3.2, h: 2.4, tiers: 4 });
      fuelCart(new Placer(kit, [CART_X, FLOOR, cz], 0), P);
      const rz = REEL_Z.reduce((a, b) => (Math.abs(b - cz) < Math.abs(a - cz) ? b : a));
      hose(kit, "paintedMetal", [CART_X, FLOOR + 1.62, cz + 0.2], [gX0 + 0.9, gY + 0.75, rz], 2.4, 0.09, P.impBlack, { segments: 18, radial: 8 });
    }

    // ---- west wall: boards flanking the bay door, junction cabinets + a sealed crew hatch at human height
    for (const z of [2.5, 27.5]) wallScreen(new Placer(kit, [80 + WALL_T + 0.1, FLOOR, z], -90), P, { w: 2.2, h: 1.2, mat: z < 15 ? "screenImp0" : "screenImp1" });
    for (const z of [-21.7, 39.5, 51.7]) wallJunction(kit, shell.walls.west, z, P);
    crewHatch(kit, shell.walls.west, -9.5, P);

    // ---- refuel gantry: raised deck on columns, rail with returns, end stairs + a mid ladder
    kit.boxMM("paintedMetal", [gX0, gY - 0.3, gZ0], [gX1, gY, gZ1], { color: P.impDark, texel: 1 });
    kit.boxMM("impPanel", [gX0 + 0.05, gY, gZ0 + 0.05], [gX1 - 0.05, gY + 0.04, gZ1 - 0.05], { color: P.impGrey, texel: 0.5 });
    kit.boxMM("emitAmber", [gX0 - 0.02, gY - 0.2, gZ0 + 0.3], [gX0, gY - 0.16, gZ1 - 0.3]);
    for (let z = gZ0 + 1; z <= gZ1 - 1; z += 6) {
      kit.box("paintedMetal", gX0 + 0.5, (FLOOR + gY - 0.3) / 2, z, 0.6, gY - 0.3 - FLOOR, 0.6, { color: P.impDark, texel: 1 });
      kit.box("paintedMetal", gX0 + 0.5, FLOOR + 0.15, z, 0.8, 0.3, 0.8, { color: P.impBlack, texel: 2 });
      kit.box("emitAmber", gX0 + 0.5, FLOOR + 1.2, z, 0.62, 0.03, 0.62);
    }
    const railY = gY + 0.04;
    handrail(kit, P, [gX0 + 0.05, gZ0 + 0.05], [gX0 + 0.05, LADDER_Z - 0.6], railY, { collide: false });
    handrail(kit, P, [gX0 + 0.05, LADDER_Z + 0.6], [gX0 + 0.05, gZ1 - 0.05], railY, { collide: false });
    for (const z of [gZ0 + 0.05, gZ1 - 0.05]) {
      handrail(kit, P, [gX0 + 0.05, z], [137.0, z], railY, { collide: false });
      handrail(kit, P, [138.8, z], [gX1 - 0.05, z], railY, { collide: false });
    }
    stairs(new Placer(kit, [gX0 + 1.9, FLOOR, gZ0 - 6.0], 0), P, { w: 1.6, steps: 20, rise: 0.18, run: 0.3 });
    stairs(new Placer(kit, [gX0 + 1.9, FLOOR, gZ1 + 6.0], 180), P, { w: 1.6, steps: 20, rise: 0.18, run: 0.3 });
    ladder(kit, P, gX0 - 0.15, LADDER_Z, FLOOR + 0.1, gY + 1.1);
    // the deck itself blocks the player (they cannot climb stairs yet)
    kit.collider([gX0, FLOOR, gZ0], [gX1 + 0.5, gY + 1.2, gZ1], "gantry");

    // ---- fuel manifold on the wall above the deck: three dark lines, flanged joints with amber bands,
    //      wall brackets, a valve block per reel with a hand wheel + gauges, risers to the hose reels
    const mx = 140 - WALL_T - 0.45 - 0.5;
    const lines = [
      [mx, gY + 2.2, 0.26, P.impDark, "emitAmber"],
      [mx + 0.15, gY + 2.85, 0.17, P.impBlack, null],
      [mx + 0.25, gY + 3.3, 0.11, P.impMid, "emitBlue"],
    ];
    for (const [x, y, r, col, band] of lines) pipe(kit, P, [x, y, gZ0 + 1], [x, y, gZ1 - 1], r, col, { flanges: 6, bands: band, segments: 14 });
    for (let z = gZ0 + 4; z < gZ1 - 1; z += 6) {
      if (shell.pilasters.east.some((u) => Math.abs(u - z) < 1.0)) continue; // the lines pass in front of the ribs
      kit.boxMM("paintedMetal", [140 - WALL_T - 0.16, gY + 1.85, z - 0.06], [140 - WALL_T - 0.05, gY + 3.55, z + 0.06], { color: P.impBlack, texel: 2 });
      for (const [x, y] of lines) kit.boxMM("paintedMetal", [x, y - 0.04, z - 0.05], [140 - WALL_T - 0.1, y + 0.04, z + 0.05], { color: P.impBlack, texel: 2 });
    }
    for (const rz of REEL_Z) {
      // valve block spanning the lines, wheel on a stem toward the room, two gauge lenses
      kit.boxMM("paintedMetal", [mx - 0.45, gY + 1.95, rz - 0.5], [140 - WALL_T - 0.06, gY + 3.55, rz + 0.5], { color: P.impBlack, texel: 1 });
      kit.boxMM("paintedMetal", [mx - 0.5, gY + 2.1, rz - 0.38], [mx - 0.45, gY + 3.4, rz + 0.38], { color: P.impDark, texel: 2 });
      kit.cyl("metal", mx - 0.58, gY + 2.7, rz, 0.04, 0.26, "x", { color: P.impGrey, segments: 8 });
      kit.add("metal", new THREE.TorusGeometry(0.3, 0.035, 8, 20), { pos: [mx - 0.72, gY + 2.7, rz], rot: [0, Math.PI / 2, 0], color: P.impGrey, uv: "scale", uvScale: [4, 1] });
      kit.box("emitBlue", mx - 0.51, gY + 3.25, rz - 0.2, 0.02, 0.12, 0.12);
      kit.box("emitRedImp", mx - 0.51, gY + 3.25, rz + 0.2, 0.02, 0.12, 0.12);
      kit.box("emitAmber", mx - 0.51, gY + 2.25, rz, 0.02, 0.05, 0.5);
      // riser down and out to the reel at the deck edge
      pipe(kit, P, [mx - 0.1, gY + 1.95, rz], [mx - 0.1, gY + 0.6, rz], 0.1, P.impMid, { segments: 10 });
      kit.cyl("paintedMetal", mx - 0.1, gY + 0.6, rz, 0.16, 0.14, "y", { color: P.impBlack, segments: 10 });
      pipe(kit, P, [mx - 0.1, gY + 0.6, rz], [gX0 + 1.3, gY + 0.6, rz], 0.1, P.impMid, { segments: 10 });
      // hose reel on an A-frame stand at the deck edge
      for (const dz of [-0.36, 0.36]) kit.box("paintedMetal", gX0 + 0.9, gY + 0.5, rz + dz, 0.7, 0.9, 0.06, { color: P.impDark, texel: 2 });
      kit.box("paintedMetal", gX0 + 0.9, gY + 0.08, rz, 0.9, 0.08, 0.9, { color: P.impBlack, texel: 2 });
      kit.cyl("paintedMetal", gX0 + 0.9, gY + 0.75, rz, 0.52, 0.56, "z", { color: P.impDark, segments: 16 });
      kit.cyl("paintedMetal", gX0 + 0.9, gY + 0.75, rz, 0.44, 0.66, "z", { color: P.impBlack, segments: 16 });
      kit.cyl("metal", gX0 + 0.9, gY + 0.75, rz, 0.12, 0.78, "z", { color: P.impGrey, segments: 10 });
      kit.box("emitAmber", gX0 + 1.26, gY + 1.0, rz - 0.36, 0.05, 0.08, 0.02);
    }
    // fuel cells under the deck between the columns: grey cans, dark bands, an amber ring, lit id plate
    for (let z = gZ0 + 4; z < gZ1 - 2; z += 12) {
      kit.cyl("paintedMetal", 138.2, FLOOR + 1.5, z, 1.1, 2.6, "y", { color: P.impGrey, segments: 20 });
      for (const y of [0.6, 2.4]) kit.cyl("paintedMetal", 138.2, FLOOR + y, z, 1.14, 0.2, "y", { color: P.impDark, segments: 20 });
      kit.cyl("emitAmber", 138.2, FLOOR + 0.77, z, 1.13, 0.04, "y", { segments: 20 });
      kit.cyl("paintedMetal", 138.2, FLOOR + 2.95, z, 0.4, 0.3, "y", { color: P.impDark, segments: 12 });
      kit.box("paintedMetal", 137.05, FLOOR + 1.5, z, 0.02, 0.5, 1.2, { color: P.impBlack, texel: 2 });
      kit.box("emitAmber", 137.035, FLOOR + 1.62, z, 0.01, 0.12, 0.8);
    }
    // bay id plates on the wall above the manifold: black plate + amber lit bar
    for (const z of [-12, 15, 42]) {
      kit.boxMM("paintedMetal", [140 - WALL_T - 0.19, gY + 4.2, z - 2.2], [140 - WALL_T - 0.07, gY + 5.4, z + 2.2], { color: P.impBlack, texel: 1 });
      kit.boxMM("emitAmber", [140 - WALL_T - 0.21, gY + 4.55, z - 1.8], [140 - WALL_T - 0.19, gY + 5.05, z + 1.8]);
    }
    // strip fixtures under the deck (working light for the fuel cells)
    for (let z = gZ0 + 3; z < gZ1 - 2; z += 9) stripFixture(kit, P, 137.6, gY - 0.32, z, 3.0, "z", "emitWhite");

    // ---- forward third: parts racks along the fwd wall (z = -40) between the ribs (x 92/104/116/128),
    //      a wing-panel storage rack, ordnance trolleys, crate stock
    for (const x of [85.6, 89.4, 94.4, 97.9, 101.4, 106.4, 109.9, 113.4, 118.4, 121.9, 125.4, 130.4, 133.9]) {
      partsRack(new Placer(kit, [x, FLOOR, -40 + WALL_T + 0.06 + 0.45], 0), P, rand, { w: 3.4, h: 3.0, tiers: 5, d: 0.85 });
    }
    wingRack(kit, P, 91.5, -26);
    for (const x of [121.0, 124.4, 127.8]) ordnanceTrolley(new Placer(kit, [x, FLOOR, -27], 0), P);
    floorRect(kit, 119.6, -29.4, 129.2, -24.6, FLOOR, YELLOW, 0.14);
    for (const [x, z, yaw] of [[131.6, -36.6, 0], [133.0, -36.4, 25], [131.6, -35.3, 0]]) crateKit(new Placer(kit, [x, FLOOR, z], yaw), P, { color: P.impGrey, collide: true });
    crateKit(new Placer(kit, [131.6, FLOOR + 1.2, -36.6], 0), P, { color: P.impMid, h: 0.8 });
    statusPost(kit, P, 96.0, FLOOR, -30.5, { face: 90, lens: "emitAmber" });

    // ---- aft wall (z = 70): locker banks + boards flanking the cargo door, junction + crew hatch
    for (const x of [86.5, 97.5, 124, 133.5]) lockerBank(new Placer(kit, [x, FLOOR, 70 - WALL_T - 0.06 - 0.3], 0), P, 8);
    wallScreen(new Placer(kit, [106, FLOOR, 70 - WALL_T - 0.08], 0), P, { w: 2.4, h: 1.2, mat: "screenImp0" });
    wallScreen(new Placer(kit, [119.5, FLOOR, 70 - WALL_T - 0.08], 0), P, { w: 2.4, h: 1.2, mat: "screenImp1" });
    wallJunction(kit, shell.walls.aft, 90.5, P);
    crewHatch(kit, shell.walls.aft, 101.5, P);

    // ---- component staging (aft of cradle 2, port side): engine-unit dollies, crate stack, spares
    floorRect(kit, 85, 40, 99, 58, FLOOR, P.impWhite, 0.15);
    for (let i = 0; i < 3; i++) {
      const pl = new Placer(kit, [88 + i * 4.2, FLOOR, 49], 0);
      pl.box("paintedMetal", 0, 0.42, 0, 1.6, 0.14, 3.6, { color: P.impDark, texel: 1.5 });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pl.cyl("paintedMetal", sx * 0.7, 0.18, sz * 1.4, 0.18, 0.16, "x", { color: P.impBlack, segments: 12 });
      for (const sz of [-1, 1]) pl.box("paintedMetal", 0, 0.75, sz * 1.1, 1.5, 0.5, 0.12, { color: P.impMid, texel: 2 });
      pl.box("emitAmber", -0.7, 0.5, -1.7, 0.1, 0.02, 0.1);
      // engine unit: main can, nozzle cone, front intake ring, dark bands, two straps
      pl.cyl("paintedMetal", 0, 1.2, 0.2, 0.7, 2.4, "z", { color: P.impGrey, segments: 18 });
      pl.cyl("paintedMetal", 0, 1.2, -1.45, 0.55, 0.9, "z", { color: P.impDark, segments: 18, r2: 0.7 });
      pl.cyl("emitBlue", 0, 1.2, -1.92, 0.42, 0.06, "z", { segments: 18 });
      pl.cyl("paintedMetal", 0, 1.2, 1.5, 0.74, 0.3, "z", { color: P.impDark, segments: 18 });
      pl.cyl("emitAmber", 0, 1.2, 1.32, 0.72, 0.03, "z", { segments: 18 });
      pl.cyl("paintedMetal", 0, 1.2, 0.0, 0.74, 0.12, "z", { color: P.impBlack, segments: 18 });
      for (const z of [-0.6, 0.9]) pl.box("paintedMetal", 0, 1.2, z, 1.56, 1.56, 0.08, { color: P.impBlack, texel: 2 });
      pl.box("paintedMetal", 0, 1.9, 0.4, 0.5, 0.2, 0.6, { color: P.impDark, texel: 2 });
      pl.box("emitAmber", 0.1, 2.02, 0.4, 0.12, 0.04, 0.12);
      pl.collider([-0.85, 0, -2.0], [0.85, 2.0, 1.85], "dolly");
    }
    crateKit(new Placer(kit, [87.2, FLOOR, 56.2], 0), P, { color: P.impGrey, collide: true });
    crateKit(new Placer(kit, [88.6, FLOOR, 56.4], 12), P, { color: P.impMid, collide: true });
    crateKit(new Placer(kit, [87.2, FLOOR + 1.2, 56.2], 0), P, { color: P.impGrey, h: 0.9 });
    toolChest(new Placer(kit, [97.2, FLOOR, 43], -90), P);
    toolChest(new Placer(kit, [97.2, FLOOR, 44.4], -90), P, { w: 0.9, h: 0.9 });
    consoleUnit(new Placer(kit, [97.2, FLOOR, 54], -90), P, { w: 1.4, screens: ["screenImp0"] });
    statusPost(kit, P, 99.6, FLOOR, 40.6, { face: 90, lens: "emitBlue" });

    // ---- overhead crane: rails along z at x 104 / 116, bridge between the cradles
    craneRails(kit, P, { axis: "z", at: [104, 116], from: -36, to: 66, y: CEIL - 3.5, ceilY: CEIL - 0.12, bridgeAt: 10, hookDrop: 6 });

    // ---- lighting: floods + key spots pooling on the cradles (descriptors only)
    const L = ctx.lights;
    for (const [x, z] of [[95, -22], [125, -22], [95, 15], [125, 15], [95, 52], [125, 52]]) L.push(pointLight([x, FLOOR + 11, z], 0xe6eeff, 260, 42, 0.5));
    L.push(pointLight([133.5, gY + 2.0, 15], 0xffb060, 45, 20, 0.6)); // amber pool over the manifold
    L.push(pointLight([84, FLOOR + 6, 15], 0xff4030, 40, 16, 0.5)); // red beacon wash at the bay door
    for (const c of CRADLES) L.push(spotLight([c.pos[0], CEIL - 2.5, c.pos[2]], [c.pos[0], FLOOR, c.pos[2]], 0xf2f6ff, 900, 40, 0.42, 0.45, 0.95));
    L.push(spotLight([84, CEIL - 3, 15], [96, FLOOR, 15], 0xf2f6ff, 500, 40, 0.5, 0.5, 0.6));

    return {
      api: {
        cradles: () => CRADLES.map((c) => ({ pos: [...c.pos], yaw: c.yaw })),
      },
    };
  },
};
