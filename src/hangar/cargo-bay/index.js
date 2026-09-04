// d4-cargo-bay — Cargo & Logistics Bay (Deck 4, starboard aft).
// Two straight runs of dark four-tier racking along the +x wall (thin amber edge lights, instanced
// light-grey crates with seams and lit labels sitting on the tier decks), lower racking and a drum
// store on the -x wall, a conveyor that starts in a sorter cabinet on the west wall and ends at a
// receiving table with its own terminal, a dark fork loader with a mast, a chain hoist on a monorail,
// crate marshalling squares by the hangar door, an aft dispatch office, yellow/white markings only,
// harsh white key spots pooling on the racking and the receiving station, an amber strobe at the door.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { buildShell, floorMark, floorRect, floorDashes, floorCorners, wallJunction, crewHatch, WALL_T, YELLOW } from "../bays-shared/shell.js";
import { bayMaterials } from "../bays-shared/materials.js";
import { Placer, consoleUnit, wallScreen, palletRack, partsRack, lockerBank, crateGeometry, crateLabelGeometry, drumGeometry, instanced, loader, conveyor, chainHoist, handrail, beaconLamp, statusPost, pointLight, spotLight } from "../bays-shared/props.js";

const FLOOR = -72;
const CEIL = -52;
const B = { min: [80, FLOOR, 70], max: [140, CEIL, 170] };
const DOORS = [
  { id: "d4-hangar-cargo", pos: [80, FLOOR, 120], dir: [-1, 0, 0], kind: "bay", w: 10, h: 8, to: "d4-hangar" },
  { id: "d4-fighter-cargo", pos: [111, FLOOR, 70], dir: [0, 0, -1], kind: "standard", to: "d4-fighter-bay" },
  { id: "d4-cargo-aft", pos: [111, FLOOR, 170], dir: [0, 0, 1], kind: "standard", to: "d4-corridor-east" },
];
// racking backs sit 0.6 m off the wall slab so the 0.55 m frame ribs pass behind them
const RACK_X = 140 - WALL_T - 0.6 - 0.75;
const RACK_FRONT = RACK_X - 0.75;
const WEST_RACK_X = 80 + WALL_T + 0.6 + 0.75;
const EAST_RUNS = [94.5, 145.5]; // 11 bays × 3.4 each: z 75.8–113.2 and 126.8–164.2, one straight line
const WEST_RUN = { zc: 140.2, bays: 4 }; // z 133.4–147.0
const BELT_Z = 152;
const BELT_LEN = 40;
const BELT_CX = 80 + WALL_T + 0.08 + 2.5 + BELT_LEN / 2; // sorter cabinet back against the west panels
const BELT_X1 = BELT_CX + BELT_LEN / 2;
const LANE = { z0: 115, z1: 125, xEnd: 100 };

// Lane scan gate: two dark pylons on black feet with an amber band, a blue scan strip on each inner face,
// a crossbeam with a centred sensor head (symmetric).
function scanGate(kit, P, x, z0, z1, h) {
  const zc = (z0 + z1) / 2;
  for (const z of [z0, z1]) {
    kit.box("paintedMetal", x, FLOOR + (h + 0.6) / 2, z, 0.7, h + 0.6, 0.7, { color: P.impDark, texel: 1 });
    kit.box("paintedMetal", x, FLOOR + 0.25, z, 0.9, 0.5, 0.9, { color: P.impBlack, texel: 2 });
    kit.box("emitAmber", x, FLOOR + 0.52, z, 0.92, 0.03, 0.92);
    const zi = z < zc ? z + 0.36 : z - 0.36;
    kit.box("paintedMetal", x, FLOOR + 1.9, zi, 0.2, 1.8, 0.04, { color: P.impBlack, texel: 2 });
    kit.box("emitBlue", x, FLOOR + 1.9, zi + (z < zc ? 0.021 : -0.021), 0.08, 1.6, 0.01);
    kit.box("paintedMetal", x, FLOOR + h + 0.62, z, 0.9, 0.16, 0.9, { color: P.impBlack, texel: 2 });
    kit.collider([x - 0.45, FLOOR, z - 0.45], [x + 0.45, FLOOR + 3, z + 0.45], "scan-gate");
  }
  const span = z1 - z0 - 0.7;
  kit.box("paintedMetal", x, FLOOR + h + 0.3, zc, 0.8, 0.6, span, { color: P.impDark, texel: 1 });
  kit.box("emitBlue", x, FLOOR + h - 0.01, zc, 0.4, 0.02, span - 1.2);
  kit.box("paintedMetal", x, FLOOR + h + 0.9, zc, 1.4, 0.6, 2.4, { color: P.impBlack, texel: 2 });
  for (const s of [-1, 1]) kit.box("emitAmber", x + s * 0.71, FLOOR + h + 0.9, zc, 0.02, 0.16, 1.4);
  kit.box("emitRedImp", x, FLOOR + h + 1.22, zc, 0.3, 0.06, 0.3);
}

// Aisle guard bollard: dark 1.0 m post, black base, amber ring lens, black cap
function bollard(kit, P, x, z) {
  kit.cyl("paintedMetal", x, FLOOR + 0.5, z, 0.14, 1.0, "y", { color: P.impDark, segments: 10 });
  kit.cyl("paintedMetal", x, FLOOR + 0.06, z, 0.26, 0.12, "y", { color: P.impBlack, segments: 12 });
  kit.cyl("emitAmber", x, FLOOR + 0.9, z, 0.15, 0.06, "y", { segments: 12 });
  kit.cyl("paintedMetal", x, FLOOR + 1.03, z, 0.17, 0.06, "y", { color: P.impBlack, segments: 12 });
  kit.collider([x - 0.26, FLOOR, z - 0.26], [x + 0.26, FLOOR + 1.1, z + 0.26], "bollard");
}

// Receiving table at the belt's +x end: dark frame, light-grey top flush with the roller tops (0.84), a
// scanner post with a screen on the arrival corner, sorted crates on top (instanced by the caller).
const TABLE_TOP = 0.84;
function receivingTable(kit, P, x0, z) {
  const pl = new Placer(kit, [x0 + 1.0, FLOOR, z], 0);
  pl.box("paintedMetal", 0, TABLE_TOP - 0.03, 0, 2.0, 0.06, 2.6, { color: P.impGrey, texel: 1.5 });
  pl.box("paintedMetal", 0, TABLE_TOP - 0.085, 0, 1.9, 0.05, 2.5, { color: P.impBlack, texel: 2 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pl.box("paintedMetal", sx * 0.9, (TABLE_TOP - 0.06) / 2, sz * 1.2, 0.1, TABLE_TOP - 0.06, 0.1, { color: P.impDark, texel: 2 });
  pl.box("paintedMetal", 0, 0.3, 0, 1.8, 0.04, 2.4, { color: P.impDark, texel: 2 });
  for (let i = 0; i < 3; i++) pl.box("paintedMetal", -0.4 + i * 0.5, 0.48, 0.5, 0.42, 0.3, 0.7, { color: i === 1 ? P.impGrey : P.impMid, texel: 2 });
  pl.box("emitAmber", 1.01, TABLE_TOP - 0.02, 0, 0.01, 0.02, 2.4);
  // scanner post + screen head on the far arrival corner
  pl.box("paintedMetal", 0.9, 1.0, 1.2, 0.12, 2.0, 0.12, { color: P.impBlack, texel: 2 });
  pl.box("paintedMetal", 0.9, 1.75, 0.85, 0.12, 0.4, 0.6, { color: P.impBlack, texel: 2 });
  pl.box("screenImp1", 0.83, 1.75, 0.85, 0.01, 0.3, 0.5, { uv: "keep" });
  pl.box("emitBlue", 0.9, 2.04, 1.2, 0.14, 0.02, 0.14);
  pl.collider([-1.0, 0, -1.3], [1.0, TABLE_TOP + 0.02, 1.3], "receiving-table");
  return pl;
}

export default {
  id: "d4-cargo-bay",
  name: "Cargo & Logistics Bay",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: null,
  spawn: { pos: [110, FLOOR, 120], yaw: 0 },
  apertures: [],
  views: {
    "d4-cargo-bay-door": { pos: [82.5, FLOOR, 120], yaw: -90, pitch: 4 },
    "d4-cargo-bay-racking": { pos: [125, FLOOR, 98], yaw: -135, pitch: 10 },
    "d4-cargo-bay-loader": { pos: [124.5, FLOOR, 108.5], yaw: -48, pitch: 3 },
    "d4-cargo-bay-conveyor": { pos: [99, FLOOR, 157], yaw: -62, pitch: 3 },
  },
  materials(shared) {
    return { ...bayMaterials(shared), strobe: new THREE.MeshStandardMaterial({ color: 0x1a0c02, emissive: new THREE.Color("#ffa028"), emissiveIntensity: 1.6, roughness: 0.5, metalness: 0 }) };
  },
  build(ctx) {
    const { kit, PALETTE: P } = ctx;
    const rand = rng(ctx.seed);
    const shell = buildShell(ctx, {
      bounds: B,
      doors: DOORS,
      seed: 37,
      floor: { color: 0x3c4046, plate: 5 },
      // racking covers the east wall; the west wall carries the lower racking + the sorter cabinet
      services: { perWall: { east: false } },
      panelsPerWall: {
        east: { stripCuts: EAST_RUNS.map((zc) => [zc - 18.9, zc + 18.9]) },
        west: { stripCuts: [[WEST_RUN.zc - 7.0, WEST_RUN.zc + 7.0], [BELT_Z - 1.7, BELT_Z + 1.7], [160.3, 167.1]] },
        fwd: { stripCuts: [[117.9, 122.1]] },
        aft: { stripCuts: [[97.9, 102.1], [124.7, 126.9]] },
      },
      ceiling: { beamAxis: "x", beamSpacing: 10, fixtureRows: 2, fixturesPerRow: 6, fixtureLen: 6, fixtureW: 1.0 },
    });
    const W = shell.walls;

    // ---- instanced stock: light crates (body baked white so the instance colour is the crate colour)
    const crateItems = [];
    const drumItems = [];
    const crateCols = [P.impGrey, P.impMid, P.impGrey, P.impHullLight, P.impGrey, P.impMid];
    const pick = () => crateCols[Math.floor(rand() * crateCols.length)];
    const crate = (pos, yaw = 0, scale = 1, color = pick()) => crateItems.push({ pos, yaw, scale, color });
    // one racking slot: 0–2 crates side by side on the tier deck (each 1.2 m in a 3.4 m bay), one of them
    // sometimes carrying a smaller crate; every fifth slot above the floor holds three drums instead
    const fillSlot = (pl, s) => {
      if (s.tier > 0 && rand() < 0.2) {
        for (let i = 0; i < 3; i++) if (rand() < 0.85) drumItems.push({ pos: pl.point(s.x - 1.05 + i * 1.05, s.y, s.z + (rand() - 0.5) * 0.1), yaw: rand() * 360, color: rand() < 0.6 ? P.impGrey : P.impHullLight });
        return;
      }
      const n = rand() < 0.1 ? 0 : rand() < 0.45 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const dx = n === 1 ? (rand() - 0.5) * 0.6 : (i - 0.5) * 1.44;
        const dz = (rand() - 0.5) * 0.1;
        crate(pl.point(s.x + dx, s.y, s.z + dz), (rand() - 0.5) * 3);
        if (rand() < 0.4) crate(pl.point(s.x + dx, s.y + 1.2, s.z + dz), (rand() - 0.5) * 6, 0.85);
      }
    };

    // ---- east wall: two straight runs of four-tier racking with a cross-aisle between them
    for (const zc of EAST_RUNS) {
      const pl = new Placer(kit, [RACK_X, FLOOR, zc], 90); // local +x → world -z, front (-z local) → -x (the aisle)
      const { slots } = palletRack(pl, P, { bays: 11, tiers: 4, bayW: 3.4, depth: 1.5, tierH: 3.4 });
      for (const s of slots) fillSlot(pl, s);
      floorMark(kit, RACK_FRONT - 1.75, zc - 18.7, RACK_FRONT - 1.6, zc + 18.7, FLOOR, YELLOW); // aisle edge
    }
    for (const z of [75.0, 114.0, 126.0, 165.0]) bollard(kit, P, RACK_FRONT - 0.7, z);
    // cross-aisle: white end bars, two terminals flanking the rib at z 120 (operators face the wall)
    for (const z of [113.2, 126.8]) floorMark(kit, 128, z - 0.1, RACK_FRONT - 0.2, z + 0.1, FLOOR, P.impWhite);
    for (const z of [117.3, 122.7]) {
      consoleUnit(new Placer(kit, [RACK_FRONT - 0.8, FLOOR, z], 90), P, { w: 1.6, screens: [z < 120 ? "screenImp0" : "screenImp1"] });
      wallJunction(kit, W.east, z, P);
    }

    // ---- west wall (north of the bay door): lower racking, the sorter cabinet, drum store, kit racks
    {
      const pl = new Placer(kit, [WEST_RACK_X, FLOOR, WEST_RUN.zc], -90); // local +x → world +z, front → +x
      const { slots } = palletRack(pl, P, { bays: WEST_RUN.bays, tiers: 2, bayW: 3.4, depth: 1.5, tierH: 3.0 });
      for (const s of slots) fillSlot(pl, { ...s, tier: s.tier + 1 });
    }
    for (let i = 0; i < 15; i++) drumItems.push({ pos: [82.3 + (i % 5) * 0.75, FLOOR, 157.2 + Math.floor(i / 5) * 0.8], yaw: rand() * 360, color: i % 4 ? P.impGrey : P.impHullLight });
    for (let i = 0; i < 4; i++) drumItems.push({ pos: [82.3 + i * 0.75, FLOOR + 1.05, 157.6], yaw: rand() * 360, color: P.impGrey });
    kit.collider([81.9, FLOOR, 156.8], [85.7, FLOOR + 2.1, 159.6], "drums");
    floorRect(kit, 81.6, 156.4, 86.0, 160.0, FLOOR, P.impWhite, 0.12);
    for (const z of [162.0, 165.4]) partsRack(new Placer(kit, [80 + WALL_T + 0.06 + 0.42, FLOOR, z], -90), P, rand, { w: 3.0, h: 2.6, tiers: 4, d: 0.8 });

    // ---- hangar-door lane: yellow edges, white centre dashes, a yellow end bar; scan gate across it
    floorMark(kit, 80 + WALL_T + 1.0, LANE.z0 - 0.2, LANE.xEnd, LANE.z0, FLOOR, YELLOW);
    floorMark(kit, 80 + WALL_T + 1.0, LANE.z1, LANE.xEnd, LANE.z1 + 0.2, FLOOR, YELLOW);
    floorMark(kit, LANE.xEnd - 0.2, LANE.z0 - 0.2, LANE.xEnd + 0.2, LANE.z1 + 0.2, FLOOR, YELLOW, { h: 0.017 });
    floorDashes(kit, 82.5, 120, LANE.xEnd - 0.6, 120, FLOOR, P.impWhite, { w: 0.2, dash: 1.4, gapLen: 0.9 });
    scanGate(kit, P, 96, LANE.z0 - 1.4, LANE.z1 + 1.4, 6.8);

    // ---- marshalling squares either side of the lane: crate stacks with white corner brackets that
    //      hug the stack footprint
    const stackAt = (x0, z0, cols, rows, high) => {
      const x1 = x0 + cols * 1.35 - 0.15;
      const z1 = z0 + rows * 1.35 - 0.15;
      floorCorners(kit, x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, FLOOR, P.impWhite, 1.2, 0.14);
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          const h = 1 + Math.floor(rand() * high);
          for (let k = 0; k < h; k++) crate([x0 + 0.6 + c * 1.35, FLOOR + k * 1.2, z0 + 0.6 + r * 1.35], (rand() - 0.5) * 3, k === h - 1 && k > 0 && rand() < 0.4 ? 0.85 : 1);
        }
      kit.collider([x0, FLOOR, z0], [x1, FLOOR + 1.2 * high, z1], "crate-stack");
    };
    stackAt(86, 102, 3, 3, 3);
    stackAt(91.2, 106.6, 2, 2, 2);
    stackAt(86, 128, 3, 3, 2);
    stackAt(91.2, 129.6, 2, 2, 3);
    // manifest terminals facing the lane + boards on the wall beside the door
    consoleUnit(new Placer(kit, [90.5, FLOOR, 112.4], 180), P, { w: 1.8, screens: ["screenImp0", "screenImp1"] });
    consoleUnit(new Placer(kit, [90.5, FLOOR, 127.6], 0), P, { w: 1.8, screens: ["screenImp1", "screenImp0"] });
    wallScreen(new Placer(kit, [80 + WALL_T + 0.1, FLOOR, 109.5], -90), P, { w: 2.0, h: 1.2, mat: "screenImp0" });
    wallScreen(new Placer(kit, [80 + WALL_T + 0.1, FLOOR, 130.5], -90), P, { w: 2.0, h: 1.2, mat: "screenImp1" });
    statusPost(kit, P, 98.6, FLOOR, 112.6, { face: 180, lens: "emitBlue" });

    // ---- loader in the main aisle facing the racking, a pallet on its forks, staged pallets in a box
    loader(new Placer(kit, [130.5, FLOOR, 104], -70), P, { liftH: 0.9 });
    {
      const pl = new Placer(kit, [130.5, FLOOR, 104], -70);
      pl.box("paintedMetal", 0, 0.98, -2.2, 1.4, 0.16, 1.4, { color: P.impDark, texel: 2 });
      crate(pl.point(0, 1.06, -2.2), -70, 1, P.impGrey);
    }
    for (const [z, kind] of [[94.6, "c2"], [97.3, "d"], [100.0, "c1"]]) {
      kit.box("paintedMetal", 127.4, FLOOR + 0.08, z, 1.5, 0.16, 1.5, { color: P.impDark, texel: 2 });
      if (kind === "d") for (const [dx, dz] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) drumItems.push({ pos: [127.4 + dx, FLOOR + 0.16, z + dz], yaw: rand() * 360, color: P.impGrey });
      else {
        crate([127.4, FLOOR + 0.16, z], (rand() - 0.5) * 4, 1, P.impGrey);
        if (kind === "c2") crate([127.4, FLOOR + 1.36, z], (rand() - 0.5) * 8, 0.85, P.impMid);
      }
    }
    kit.collider([126.6, FLOOR, 93.8], [128.2, FLOOR + 1.5, 100.8], "staged-pallets");
    floorRect(kit, 126.3, 93.4, 128.6, 101.2, FLOOR, P.impWhite, 0.12);

    // ---- conveyor: out of a sorter cabinet on the west wall, along x at z 152, into the receiving table
    conveyor(new Placer(kit, [BELT_CX, FLOOR, BELT_Z], 0), P, { len: BELT_LEN, w: 1.6, h: 0.75, inlet: true });
    for (const x of [86, 91.5, 98, 106.5, 112, 117.5]) crate([x, FLOOR + 0.83, BELT_Z], (rand() - 0.5) * 6, x % 2 ? 0.8 : 0.7); // roller tops at 0.83
    {
      // scan arch over the belt (symmetric posts clear of the rails, sensor head centred)
      const ax = 100;
      for (const sz of [-1, 1]) kit.box("paintedMetal", ax, FLOOR + 1.5, BELT_Z + sz * 1.15, 0.3, 3.0, 0.3, { color: P.impDark, texel: 2 });
      kit.box("paintedMetal", ax, FLOOR + 3.1, BELT_Z, 0.4, 0.3, 2.6, { color: P.impDark, texel: 2 });
      kit.box("emitBlue", ax, FLOOR + 2.94, BELT_Z, 0.06, 0.02, 2.0);
      kit.box("paintedMetal", ax, FLOOR + 3.55, BELT_Z, 0.9, 0.6, 1.0, { color: P.impBlack, texel: 2 });
      kit.box("screenImp1", ax - 0.46, FLOOR + 3.55, BELT_Z, 0.01, 0.4, 0.8, { uv: "keep" });
      for (const sz of [-1, 1]) kit.box("emitRedImp", ax, FLOOR + 3.2, BELT_Z + sz * 1.15, 0.32, 0.06, 0.32);
    }
    // receiving station: table flush with the rollers, two sorted crates, terminal, bins, dispatch pallet
    const table = receivingTable(kit, P, BELT_X1 + 0.05, BELT_Z);
    crate(table.point(-0.35, TABLE_TOP, -0.6), 4, 0.8, P.impGrey);
    crate(table.point(0.25, TABLE_TOP, -0.2), -12, 0.7, P.impMid);
    consoleUnit(new Placer(kit, [BELT_X1 + 1.05, FLOOR, BELT_Z - 2.5], 0), P, { w: 1.6, screens: ["screenImp0"] });
    partsRack(new Placer(kit, [BELT_X1 + 3.6, FLOOR, BELT_Z], 90), P, rand, { w: 3.0, h: 2.2, tiers: 3, d: 0.8 });
    kit.box("paintedMetal", BELT_X1 + 1.0, FLOOR + 0.08, BELT_Z + 3.0, 1.5, 0.16, 1.5, { color: P.impDark, texel: 2 });
    crate([BELT_X1 + 1.0, FLOOR + 0.16, BELT_Z + 3.0], 3, 1, P.impGrey);
    kit.collider([BELT_X1 + 0.2, FLOOR, BELT_Z + 2.2], [BELT_X1 + 1.8, FLOOR + 1.4, BELT_Z + 3.8], "dispatch-pallet");
    floorCorners(kit, BELT_X1 - 0.3, BELT_Z - 3.5, BELT_X1 + 4.3, BELT_Z + 4.0, FLOOR, P.impWhite, 1.2, 0.14);

    // ---- chain hoist on a ceiling monorail over the marshalling zone, slinging a crate; yellow box below
    {
      const y = CEIL - 4.5;
      kit.box("paintedMetal", 112, y + 0.45, 136, 24, 0.1, 0.4, { color: P.impDark, texel: 1 });
      kit.box("paintedMetal", 112, y, 136, 24, 0.8, 0.08, { color: P.impMid, texel: 1 });
      kit.box("paintedMetal", 112, y - 0.45, 136, 24, 0.1, 0.4, { color: P.impDark, texel: 1 });
      kit.box("emitAmber", 112, y - 0.51, 136, 23, 0.02, 0.06);
      for (const x of [101, 112, 123]) kit.box("paintedMetal", x, (y + 0.5 + CEIL - 0.12) / 2, 136, 0.3, CEIL - 0.12 - y - 0.5, 0.3, { color: P.impDark, texel: 1 });
      chainHoist(kit, P, 116, y - 0.5, 136, 9.5, { load: true });
      floorRect(kit, 112, 132, 120, 140, FLOOR, YELLOW, 0.15);
    }

    // ---- aft dispatch office east of the aft door: L of terminals, lockers, board, guard rail returning
    //      to the wall, one status post
    consoleUnit(new Placer(kit, [120.8, FLOOR, 168.9], 0), P, { w: 2.0, screens: ["screenImp0", "screenImp1"] });
    consoleUnit(new Placer(kit, [123.8, FLOOR, 164.2], 90), P, { w: 1.6, screens: ["screenImp1"] });
    wallScreen(new Placer(kit, [121.5, FLOOR, 170 - WALL_T - 0.08], 0), P, { w: 2.6, h: 1.2, mat: "screenImp0" });
    lockerBank(new Placer(kit, [125.8, FLOOR, 170 - WALL_T - 0.06 - 0.3], 0), P, 4);
    handrail(kit, P, [117.2, 161.5], [117.2, 170 - WALL_T - 0.1], FLOOR);
    handrail(kit, P, [117.2, 161.5], [127.4, 161.5], FLOOR);
    statusPost(kit, P, 114.6, FLOOR, 167.6, { face: 0, lens: "emitBlue" });

    // ---- forward wall: drum store in the west corner, lockers + board east of the door
    for (let i = 0; i < 10; i++) drumItems.push({ pos: [83.2 + (i % 5) * 0.75, FLOOR, 73.4 + Math.floor(i / 5) * 0.8], yaw: rand() * 360, color: i % 3 ? P.impGrey : P.impHullLight });
    kit.collider([82.8, FLOOR, 73.0], [86.6, FLOOR + 1.1, 74.7], "drums");
    floorRect(kit, 82.5, 72.7, 86.9, 75.0, FLOOR, P.impWhite, 0.12);
    lockerBank(new Placer(kit, [120, FLOOR, 70 + WALL_T + 0.06 + 0.3], 180), P, 8);
    wallScreen(new Placer(kit, [125.5, FLOOR, 70 + WALL_T + 0.08], 180), P, { w: 2.0, h: 1.2, mat: "screenImp1" });

    // ---- wall gear at human height (ribs on x walls at z 82.5/95/107.5/(120)/132.5/145/157.5, on z walls at x 92/104/116/128)
    crewHatch(kit, W.west, 88.7, P);
    for (const z of [76.4, 101.3, 127.6] ) wallJunction(kit, W.west, z, P);
    crewHatch(kit, W.fwd, 98, P);
    wallJunction(kit, W.fwd, 133.5, P);
    crewHatch(kit, W.aft, 87, P);
    lockerBank(new Placer(kit, [100, FLOOR, 170 - WALL_T - 0.06 - 0.3], 0), P, 4);
    wallJunction(kit, W.aft, 134, P);

    // ---- amber strobe over the bay door (above the sign plate), red beacons either side
    const strobeMat = ctx.materials.strobe;
    const sx = 80 + WALL_T + 0.06 + 0.35;
    kit.box("paintedMetal", sx, FLOOR + 11.6, 120, 0.7, 0.5, 1.6, { color: P.impBlack, texel: 2 });
    kit.add("strobe", new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [sx, FLOOR + 11.85, 120], uv: "keep" });
    kit.add("strobe", new THREE.CylinderGeometry(0.34, 0.34, 0.08, 14), { pos: [sx, FLOOR + 11.89, 120], uv: "keep" });
    beaconLamp(kit, P, sx, FLOOR + 11.85, 119.3, "emitRedImp", { r: 0.12 });
    beaconLamp(kit, P, sx, FLOOR + 11.85, 120.7, "emitRedImp", { r: 0.12 });

    // ---- instanced stock
    const cGeo = crateGeometry(ctx.materials, P, { s: 1.2, color: 0xffffff, band: P.impDark });
    instanced(ctx, cGeo, "paintedMetal", crateItems, "cargo-crates");
    instanced(ctx, crateLabelGeometry({ s: 1.2 }), "emitAmber", crateItems, "cargo-crate-labels");
    const dGeo = drumGeometry(ctx.materials, P, { r: 0.34, h: 1.05, color: 0xffffff, band: P.impDark });
    instanced(ctx, dGeo, "paintedMetal", drumItems, "cargo-drums");

    // ---- lighting: cool floods, harsh white key spots on both racking runs and the receiving station,
    //      amber work points at the stations, the strobe at the door (14 descriptors)
    const L = ctx.lights;
    for (const [x, z] of [[97, 85], [125, 85], [97, 120], [125, 120], [97, 155], [125, 155]]) L.push(pointLight([x, FLOOR + 11, z], 0xdde8ff, 240, 40, 0.5));
    const strobeLight = pointLight([sx + 0.8, FLOOR + 11.2, 120], 0xffa028, 60, 22, 0.7);
    L.push(strobeLight);
    L.push(pointLight([116, CEIL - 6, 136], 0xdde8ff, 80, 20, 0.5)); // hoist zone
    for (const zc of EAST_RUNS) L.push(spotLight([RACK_FRONT - 8, CEIL - 2.5, zc], [RACK_FRONT - 0.5, FLOOR, zc], 0xf2f6ff, 800, 44, 0.5, 0.5, 0.9));
    L.push(spotLight([BELT_X1 - 4, CEIL - 2.5, BELT_Z - 2], [BELT_X1 + 1.5, FLOOR, BELT_Z], 0xf2f6ff, 600, 40, 0.42, 0.5, 0.85));
    L.push(spotLight([84, CEIL - 3, 120], [96, FLOOR, 120], 0xf2f6ff, 450, 40, 0.5, 0.5, 0.6));
    L.push(pointLight([BELT_X1 + 1.5, FLOOR + 3, BELT_Z - 1], 0xffb060, 45, 14, 0.6));
    L.push(pointLight([121.5, FLOOR + 3, 165], 0xffb060, 40, 12, 0.55));

    return {
      update(dt, t) {
        // amber strobe: sharp double flash every 1.6 s, driven by t only
        const ph = (t % 1.6) / 1.6;
        const flash = ph < 0.08 || (ph > 0.16 && ph < 0.24) ? 1 : 0;
        strobeMat.emissiveIntensity = 0.4 + 1.6 * flash;
        strobeLight.intensity = 8 + 110 * flash;
      },
      api: {},
    };
  },
};
