// d4-cargo-bay — Cargo & Logistics Bay (Deck 4, starboard aft).
// Four-tier pallet racking along the +x wall filled with instanced crates / drums, aisle markings, a
// loader vehicle, a conveyor line with a scan arch, manifest terminals, a chain hoist, crate stacks by
// the hangar door, a pulsing amber strobe over the bay door, cooler white light.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { buildShell, floorMark, floorRect, floorDashes, WALL_T } from "../bays-shared/shell.js";
import { Placer, consoleUnit, wallScreen, palletRack, partsRack, crateGeometry, drumGeometry, instanced, loader, conveyor, chainHoist, handrail, beaconLamp, statusPost, pointLight, spotLight } from "../bays-shared/props.js";

const FLOOR = -72;
const CEIL = -52;
const B = { min: [80, FLOOR, 70], max: [140, CEIL, 170] };
const DOORS = [
  { id: "d4-hangar-cargo", pos: [80, FLOOR, 120], dir: [-1, 0, 0], kind: "bay", w: 10, h: 8, to: "d4-hangar" },
  { id: "d4-fighter-cargo", pos: [111, FLOOR, 70], dir: [0, 0, -1], kind: "standard", to: "d4-fighter-bay" },
  { id: "d4-cargo-aft", pos: [111, FLOOR, 170], dir: [0, 0, 1], kind: "standard", to: "d4-corridor-east" },
];

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
    return { strobe: new THREE.MeshStandardMaterial({ color: 0x1a0c02, emissive: new THREE.Color("#ffa028"), emissiveIntensity: 2.5, roughness: 0.5, metalness: 0 }) };
  },
  build(ctx) {
    const { kit, PALETTE: P } = ctx;
    const rand = rng(ctx.seed);
    buildShell(ctx, {
      bounds: B,
      doors: DOORS,
      seed: 37,
      floor: { color: P.impMid, plate: 5 },
      services: { v: 5.2 },
      ceiling: { beamAxis: "x", beamSpacing: 10, fixtureRows: 2, fixturesPerRow: 6, fixtureLen: 6, fixtureW: 1.0, floodMat: "emitCoolSoft" },
    });

    // ---- tall pallet racking along the +x wall: two runs of 11 bays × 4 tiers
    const rackX = 140 - WALL_T - 0.06 - 0.35 - 0.75; // back face ~0.35 m off the panels
    const crateItems = [];
    const drumItems = [];
    const crateCols = [P.impMid, P.impGrey, P.impDark, P.impMid, P.impHullDark, P.impGrey];
    const fillSlot = (wx, wy, wz, tier) => {
      // slot spans 3.4 m along z (rack local x) and 1.5 m deep; crates sit centred on the tier deck
      const n = rand() < 0.12 ? 0 : 1 + Math.floor(rand() * 2.6);
      const drums = rand() < 0.22 && tier > 0;
      if (drums) {
        for (let i = 0; i < 3; i++) if (rand() < 0.85) drumItems.push({ pos: [wx + (rand() - 0.5) * 0.3, wy, wz - 1.05 + i * 1.05], yaw: rand() * 360, color: rand() < 0.5 ? P.impGrey : P.impHullLight });
        return;
      }
      for (let i = 0; i < n; i++) {
        const dz = n === 1 ? 0 : -1.1 + (2.2 * i) / (n - 1);
        crateItems.push({ pos: [wx + (rand() - 0.5) * 0.2, wy, wz + dz], yaw: (rand() - 0.5) * 8, color: crateCols[Math.floor(rand() * crateCols.length)] });
        if (rand() < 0.35 && tier < 3) crateItems.push({ pos: [wx, wy + 1.2, wz + dz], yaw: (rand() - 0.5) * 8, color: crateCols[Math.floor(rand() * crateCols.length)], scale: 0.85 });
      }
    };
    for (const zc of [94.5, 145.5]) {
      const pl = new Placer(kit, [rackX, FLOOR, zc], 90); // local +x → world -z; front (-z local) → -x (the aisle)
      const { slots } = palletRack(pl, P, { bays: 11, tiers: 4, bayW: 3.4, depth: 1.5, tierH: 3.4 });
      for (const s of slots) {
        const w = pl.point(s.x, s.y, s.z);
        fillSlot(w[0], w[1], w[2], s.tier);
      }
      // bay number plates (emissive) high on the uprights + aisle edge line
      floorMark(kit, rackX - 0.95 - 1.6, zc - 18.9, rackX - 0.95 - 1.45, zc + 18.9, FLOOR, P.impAmber);
    }
    // aisle guard posts (bollards) at the rack run ends
    for (const z of [74.6, 114.4, 125.6, 165.4]) {
      kit.cyl("paintedMetal", rackX - 1.4, FLOOR + 0.5, z, 0.12, 1.0, "y", { color: P.impAmber, segments: 10 });
      kit.cyl("paintedMetal", rackX - 1.4, FLOOR + 0.06, z, 0.24, 0.12, "y", { color: P.impBlack, segments: 12 });
      kit.collider([rackX - 1.65, FLOOR, z - 0.25], [rackX - 1.15, FLOOR + 1.1, z + 0.25], "bollard");
    }
    // cross-aisle between the runs: hatching + a wall console
    for (let i = 0; i < 6; i++) floorMark(kit, rackX - 0.8 - i * 1.2, 115.2, rackX - 0.5 - i * 1.2, 124.8, FLOOR, P.impAmber, { h: 0.011 });
    consoleUnit(new Placer(kit, [rackX - 0.2, FLOOR, 120], -90), P, { w: 1.6, screens: ["screenImp1"], indicators: 1 });

    // ---- lower racking on the west wall, north of the bay door (2 tiers, wide bays) + bulk drums
    {
      const pl = new Placer(kit, [80 + WALL_T + 0.06 + 0.35 + 0.75, FLOOR, 148], -90); // front toward +x
      const { slots } = palletRack(pl, P, { bays: 9, tiers: 2, bayW: 3.4, depth: 1.5, tierH: 3.0 });
      for (const s of slots) {
        const w = pl.point(s.x, s.y, s.z);
        fillSlot(w[0], w[1], w[2], s.tier + 1);
      }
    }
    for (let i = 0; i < 10; i++) {
      const x = 84 + (i % 5) * 0.75;
      const z = 74.5 + Math.floor(i / 5) * 0.8;
      drumItems.push({ pos: [x, FLOOR, z], yaw: rand() * 360, color: i % 3 ? P.impGrey : P.impHullLight });
    }
    kit.collider([83.5, FLOOR, 74], [87.8, FLOOR + 1.1, 75.8], "drums");

    // ---- crate stacks by the hangar door (marshalling squares), instanced
    const stackAt = (x0, z0, cols, rows, high) => {
      floorRect(kit, x0 - 0.3, z0 - 0.3, x0 + cols * 1.35 + 0.3 - 0.15, z0 + rows * 1.35 + 0.3 - 0.15, FLOOR, P.impWhite, 0.12);
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          const h = 1 + Math.floor(rand() * high);
          for (let k = 0; k < h; k++) crateItems.push({ pos: [x0 + 0.6 + c * 1.35, FLOOR + k * 1.2, z0 + 0.6 + r * 1.35], yaw: (rand() - 0.5) * 6, color: crateCols[Math.floor(rand() * crateCols.length)] });
        }
      kit.collider([x0, FLOOR, z0], [x0 + cols * 1.35 - 0.15, FLOOR + 1.2 * high, z0 + rows * 1.35 - 0.15], "crate-stack");
    };
    stackAt(86, 104, 3, 3, 3);
    stackAt(91, 108.2, 3, 2, 2);
    stackAt(86, 128, 3, 3, 2);
    stackAt(91, 129.4, 3, 2, 3);
    // hazard hatching on the threshold of the bay door + inbound lane
    floorMark(kit, 81.4, 114.8, 100, 115.0, FLOOR, P.impAmber);
    floorMark(kit, 81.4, 125.0, 100, 125.2, FLOOR, P.impAmber);
    floorDashes(kit, 82, 120, 100, 120, FLOOR, P.impWhite, { w: 0.2, dash: 1.4, gapLen: 0.9 });
    floorMark(kit, 99.8, 114.8, 100.2, 125.2, FLOOR, P.impAmber, { h: 0.017 });
    // cargo scan gate across the lane: two pylons + a crossbeam with a blue scan strip and a sensor head
    {
      const gx = 96;
      for (const z of [113.6, 126.4]) {
        kit.box("paintedMetal", gx, FLOOR + 3.25, z, 0.7, 6.5, 0.7, { color: P.impDark, texel: 1 });
        kit.box("hazard", gx, FLOOR + 0.4, z, 0.74, 0.5, 0.74, { texel: 1 });
        kit.box("emitBlue", gx, FLOOR + 1.7, z + (z < 120 ? 0.36 : -0.36), 0.08, 1.4, 0.02);
        kit.box("paintedMetal", gx, FLOOR + 6.72, z, 0.9, 0.5, 0.9, { color: P.impBlack, texel: 2 });
        kit.collider([gx - 0.4, FLOOR, z - 0.4], [gx + 0.4, FLOOR + 3, z + 0.4], "scan-gate");
      }
      kit.box("paintedMetal", gx, FLOOR + 6.8, 120, 0.8, 0.6, 12.4, { color: P.impDark, texel: 1 });
      kit.box("emitBlue", gx, FLOOR + 6.49, 120, 0.4, 0.04, 11.6);
      kit.box("paintedMetal", gx, FLOOR + 7.38, 120, 1.4, 0.6, 2.4, { color: P.impBlack, texel: 2 });
      kit.box("emitAmber", gx - 0.71, FLOOR + 7.38, 120, 0.02, 0.16, 1.4);
      kit.box("emitRedImp", gx, FLOOR + 7.7, 120, 0.3, 0.06, 0.3);
    }

    // ---- manifest terminals: two by the bay door facing the lane, one cluster by the aft door
    consoleUnit(new Placer(kit, [89.5, FLOOR, 112.6], 180), P, { w: 1.8, screens: ["screenImp0", "screenImp1"], indicators: 2 });
    consoleUnit(new Placer(kit, [89.5, FLOOR, 127.4], 0), P, { w: 1.8, screens: ["screenImp1", "screenImp0"], indicators: 2 });
    wallScreen(new Placer(kit, [80 + WALL_T + 0.1, FLOOR, 109.5], -90), P, { w: 2.0, h: 1.2, y: 2.0, mat: "screenImp0" });
    wallScreen(new Placer(kit, [80 + WALL_T + 0.1, FLOOR, 130.5], -90), P, { w: 2.0, h: 1.2, y: 2.0, mat: "screenImp1" });
    // aft door office: three terminals in an L + a wall display (aft wall pilasters at x 92/104/116/128)
    consoleUnit(new Placer(kit, [120.5, FLOOR, 166.6], 180), P, { w: 2.0, screens: ["screenImp0", "screenImp1"], indicators: 2 });
    consoleUnit(new Placer(kit, [123.0, FLOOR, 163.5], 90), P, { w: 1.6, screens: ["screenImp1"], indicators: 1 });
    wallScreen(new Placer(kit, [121.5, FLOOR, 170 - WALL_T - 0.08], 0), P, { w: 3.0, h: 1.5, y: 2.3, mat: "screenImp0" });
    handrail(kit, P, [117.5, 162.5], [117.5, 168.5], FLOOR);
    statusPost(kit, P, 108.4, FLOOR, 166.8);
    statusPost(kit, P, 113.6, FLOOR, 166.8);

    // ---- loader vehicle in the main aisle, facing the racks
    loader(new Placer(kit, [129.5, FLOOR, 104], -70), P, { liftH: 0.9 });
    // pallet with crates in front of the forks
    {
      const pl = new Placer(kit, [133.3, FLOOR, 105.4], -70);
      pl.box("paintedMetal", 0, 0.08, -2.2, 1.4, 0.16, 1.4, { color: P.impDark, texel: 2 });
      crateItems.push({ pos: pl.point(0, 0.16, -2.2), yaw: -70, color: P.impMid });
    }
    // staged pallets waiting for the loader (crates / drums) in a white marshalling box
    for (const [z, kind] of [[94.6, "c2"], [97.3, "d"], [100.0, "c1"]]) {
      kit.box("paintedMetal", 127.4, FLOOR + 0.08, z, 1.5, 0.16, 1.5, { color: P.impDark, texel: 2 });
      if (kind === "d") for (const [dx, dz] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) drumItems.push({ pos: [127.4 + dx, FLOOR + 0.16, z + dz], yaw: rand() * 360, color: P.impGrey });
      else {
        crateItems.push({ pos: [127.4, FLOOR + 0.16, z], yaw: (rand() - 0.5) * 6, color: P.impMid });
        if (kind === "c2") crateItems.push({ pos: [127.4, FLOOR + 1.36, z], yaw: (rand() - 0.5) * 10, color: P.impGrey, scale: 0.85 });
      }
    }
    kit.collider([126.6, FLOOR, 93.8], [128.2, FLOOR + 1.5, 100.8], "staged-pallets");
    floorRect(kit, 126.3, 93.4, 128.6, 101.2, FLOOR, P.impWhite, 0.12);

    // ---- conveyor line along x at z = 150 with a scan arch and crates riding it
    conveyor(new Placer(kit, [108, FLOOR, 150], 0), P, { len: 34, w: 1.2, h: 0.75 });
    for (const x of [93, 99.5, 104, 112.5, 118, 121.5]) crateItems.push({ pos: [x, FLOOR + 0.8, 150], yaw: (rand() - 0.5) * 6, color: crateCols[Math.floor(rand() * crateCols.length)], scale: x % 2 ? 0.8 : 1 });
    {
      const ax = 108;
      for (const sz of [-1, 1]) kit.box("paintedMetal", ax, FLOOR + 1.4, 150 + sz * 1.0, 0.3, 2.8, 0.3, { color: P.impDark, texel: 2 });
      kit.box("paintedMetal", ax, FLOOR + 2.9, 150, 0.4, 0.3, 2.4, { color: P.impDark, texel: 2 });
      kit.box("emitBlue", ax, FLOOR + 2.72, 150, 0.06, 0.04, 1.6);
      kit.box("paintedMetal", ax, FLOOR + 3.5, 150 + 1.3, 0.9, 0.7, 0.12, { color: P.impBlack, texel: 2 });
      kit.box("screenImp1", ax, FLOOR + 3.5, 150 + 1.24, 0.8, 0.55, 0.01, { uv: "keep" });
      kit.box("emitRedImp", ax + 0.16, FLOOR + 2.9, 150 - 1.15, 0.1, 0.08, 0.02);
    }
    // sorting station at the conveyor's east end: bench + terminal + bins
    consoleUnit(new Placer(kit, [127.5, FLOOR, 152.6], 180), P, { w: 1.6, screens: ["screenImp0"], indicators: 1 });
    partsRack(new Placer(kit, [131.5, FLOOR, 150], 90), P, rand, { w: 3.0, h: 2.2, tiers: 3, d: 0.8 });

    // ---- chain hoist on a ceiling monorail over the marshalling zone, slinging a crate
    {
      const y = CEIL - 4.5;
      kit.box("paintedMetal", 112, y + 0.45, 136, 24, 0.1, 0.4, { color: P.impDark, texel: 1 });
      kit.box("paintedMetal", 112, y, 136, 24, 0.8, 0.08, { color: P.impMid, texel: 1 });
      kit.box("paintedMetal", 112, y - 0.45, 136, 24, 0.1, 0.4, { color: P.impDark, texel: 1 });
      for (const x of [101, 112, 123]) kit.box("paintedMetal", x, (y + 0.5 + CEIL - 0.12) / 2, 136, 0.3, CEIL - 0.12 - y - 0.5, 0.3, { color: P.impDark, texel: 1 });
      chainHoist(kit, P, 116, y - 0.5, 136, 9.5, { load: true });
      floorRect(kit, 112, 132, 120, 140, FLOOR, P.impAmber, 0.15);
      for (let i = 0; i < 4; i++) floorMark(kit, 112.6 + i * 1.9, 132.4, 112.9 + i * 1.9, 139.6, FLOOR, P.impAmber, { h: 0.011 });
    }

    // ---- amber strobe over the bay door (inside), plus the wall of the door's inner face
    const strobeMat = ctx.materials.strobe;
    kit.box("paintedMetal", 80 + WALL_T + 0.55, FLOOR + 9.9, 120, 0.7, 0.5, 1.6, { color: P.impBlack, texel: 2 });
    kit.add("strobe", new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [80 + WALL_T + 0.55, FLOOR + 10.15, 120], uv: "keep" });
    kit.add("strobe", new THREE.CylinderGeometry(0.34, 0.34, 0.08, 14), { pos: [80 + WALL_T + 0.55, FLOOR + 10.19, 120], uv: "keep" });
    beaconLamp(kit, P, 80 + WALL_T + 0.55, FLOOR + 10.15, 119.3, "emitRedImp", { r: 0.12 });
    beaconLamp(kit, P, 80 + WALL_T + 0.55, FLOOR + 10.15, 120.7, "emitRedImp", { r: 0.12 });

    // ---- instanced stock
    const cGeo = crateGeometry(ctx.materials, P, { s: 1.2 });
    instanced(ctx, cGeo, "paintedMetal", crateItems, "cargo-crates");
    const dGeo = drumGeometry(ctx.materials, P, { r: 0.34, h: 1.05 });
    instanced(ctx, dGeo, "paintedMetal", drumItems, "cargo-drums");

    // ---- lighting: cooler white floods, blue-white key over the racks, pulsing amber at the door
    const L = ctx.lights;
    for (const [x, z] of [[97, 85], [125, 85], [97, 120], [125, 120], [97, 155], [125, 155]]) L.push(pointLight([x, FLOOR + 10, z], 0xd8e6ff, 240, 40, 0.55));
    const strobeLight = pointLight([80 + WALL_T + 1.2, FLOOR + 9.5, 120], 0xffa028, 60, 22, 0.7);
    L.push(strobeLight);
    L.push(pointLight([116, CEIL - 6, 136], 0xd8e6ff, 80, 20, 0.5)); // hoist zone
    L.push(spotLight([131, CEIL - 2.5, 94.5], [rackX - 1, FLOOR, 94.5], 0xe8f0ff, 380, 40, 0.55, 0.5, 0.85));
    L.push(spotLight([131, CEIL - 2.5, 145.5], [rackX - 1, FLOOR, 145.5], 0xe8f0ff, 380, 40, 0.55, 0.5, 0.85));
    L.push(spotLight([108, CEIL - 2.5, 150], [108, FLOOR, 150], 0xe8f0ff, 300, 40, 0.45, 0.5, 0.7));
    L.push(spotLight([84, CEIL - 3, 120], [96, FLOOR, 120], 0xe8f0ff, 320, 40, 0.5, 0.5, 0.6));

    return {
      update(dt, t) {
        // amber strobe: sharp double flash every 1.6 s, driven by t only
        const ph = (t % 1.6) / 1.6;
        const flash = ph < 0.08 || (ph > 0.16 && ph < 0.24) ? 1 : 0;
        strobeMat.emissiveIntensity = 0.4 + 3.2 * flash;
        strobeLight.intensity = 8 + 110 * flash;
      },
      api: {},
    };
  },
};
