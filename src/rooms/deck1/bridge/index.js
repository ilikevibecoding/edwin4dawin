// d1-bridge — Main Bridge (flagship room). Central command walkway at +240 between two sunken crew pits at
// +237.6, forward viewing platform under the 38 m window band (APERTURE BRIDGE), aft command deck with the
// blast door to the spine. Everything at 1:1 inside the §6.3 Deck 1 envelope.
//
// Phase 2 detail pass: shell walls/floors/stairs stay on the shared helpers; ceiling.js (beams, channels,
// trays, pendants), pits.js (pit faces, wall display band, cabinets, rafts, platform edges), stations.js
// (sill bank, helm/nav, pit rows, dais, holo plinth, aft bank), window.js (armour glazing), props.js (kit-bash
// props), screens.js (module-local animated display atlas) and holo.js (additive wireframe of the ship).
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, PIT_FLOOR, doorsFor } from "../shared/plan.js";
import { wall, stairs, doorOpenings, doorReveal, WALL_T } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { buildWindowWall } from "./window.js";
import { buildStations } from "./stations.js";
import { buildCeiling } from "./ceiling.js";
import { buildPits, buildPlatforms } from "./pits.js";
import { bridgeRail } from "./props.js";
import { makeBridgeScreens } from "./screens.js";

const ID = "d1-bridge";
const B = BOUNDS[ID];
const CEILY = CEIL[ID];

// layout (world z): window wall 458 | fore platform 458.3..464 | pits + walkway 464..500 | aft command deck 500..511.7
export const L = {
  xIn: 20 - WALL_T, // 19.7 interior half width
  walkHalf: 3.5,
  foreZ: [458 + WALL_T, 464],
  pitZ: [464, 500],
  aftZ: [500, 512 - WALL_T],
  stairX: [
    [-8.4, -6.0],
    [6.0, 8.4],
  ],
  stairZ: [496, 500],
  ceilY: CEILY,
  beamsZ: [464.3, 470, 476, 482, 488, 494, 499.7, 509],
  walkwayLightsZ: [470, 482, 494],
  pendantDrop: 1.9, // walkway pendant housings hang this far below the ceiling
  daisZ: 505.5,
  raftX: 11.5,
  raftY: 244.2,
  raftZ: [467.5, 481.2, 494.9], // ~13.7 m pitch, 3.5 / 5.1 m from the pit end faces so the fore bay racks are lit; rods clear the beams
};

// module-local animated screen atlas (one 1024×512 canvas); created in materials(), redrawn in update()
let screens = null;

const manifest = {
  id: ID,
  name: "Main Bridge",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [0, FLOOR, 508], yaw: 0 },
  apertures: ["bridge"],
  views: {
    "d1-bridge-walkway": { pos: [0, FLOOR, 499], yaw: 0, pitch: -3 },
    "d1-bridge-pit": { pos: [-13.2, PIT_FLOOR, 484], yaw: 38, pitch: 2 },
    "d1-bridge-window": { pos: [0, FLOOR, 463.6], yaw: 0, pitch: -3 },
    "d1-bridge-aft": { pos: [0, FLOOR, 467.5], yaw: 180, pitch: -2 },
    "d1-bridge-command": { pos: [-14, FLOOR, 510], yaw: -28, pitch: -4 },
    "d1-bridge-pit-stbd": { pos: [14.8, PIT_FLOOR, 466.2], yaw: 168, pitch: 8 },
    "d1-bridge-dais": { pos: [2.3, FLOOR, 509.6], yaw: 4, pitch: -3 },
    "d1-bridge-sill": { pos: [8.6, FLOOR, 462.7], yaw: 22, pitch: 6 },
  },
  materials() {
    screens = makeBridgeScreens();
    return { bridgeScreen: screens.material };
  },
  build(ctx) {
    const { kit } = ctx;
    const xi = L.xIn;
    if (!ctx.materials.bridgeScreen) {
      // registry without a materials() hook: create the local material on demand
      screens = makeBridgeScreens();
      ctx.materials.bridgeScreen = screens.material;
    }

    // --- walls. Port/starboard walls drop to the pit floor so the pits are panelled; fore/aft walls sit on +240.
    const winOpening = { a0: -19, a1: 19, y0: 241.2, y1: 245.4, kind: "window" };
    wall(kit, { face: "n", bounds: B, floorY: FLOOR, ceilY: CEILY, openings: [winOpening], seed: 11, panelW: 2.4, strip: null, tone: { light: IMP.grey, mid: IMP.mid } });
    wall(kit, { face: "s", bounds: B, floorY: FLOOR, ceilY: CEILY, openings: doorOpenings(manifest, "s", FLOOR), seed: 13, panelW: 2.4, strip: "emitWhite", stripY: 2.3, tone: { light: IMP.grey, mid: IMP.mid } });
    for (const face of ["w", "e"]) {
      // detail 0: the lower 3 m of these walls is covered by the pit display band / cabinets / trays anyway.
      // strip at +4.8 over the pit floor = 2.4 m over the fore/aft decks, clear of the tray and the wall displays
      wall(kit, { face, bounds: B, floorY: PIT_FLOOR, ceilY: CEILY, openings: doorOpenings(manifest, face, FLOOR), seed: face === "w" ? 17 : 19, panelW: 3.0, detail: 0, strip: "emitBlue", stripY: 4.8, tone: { light: IMP.grey, mid: IMP.mid } });
    }
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // --- floors: fore platform, walkway, aft command deck (thick slabs so their sides form the pit walls), pit floors
    const xs = xi + 0.05; // overlap into the wall backing (no floor/wall slit)
    kit.boxMM("blackGloss", [-xs, PIT_FLOOR - 0.2, 458.05], [xs, FLOOR, L.foreZ[1]], { color: IMP.black, texel: 0.5 });
    kit.boxMM("blackGloss", [-L.walkHalf, PIT_FLOOR - 0.2, L.pitZ[0]], [L.walkHalf, FLOOR, L.pitZ[1]], { color: IMP.black, texel: 0.5 });
    kit.boxMM("blackGloss", [-xs, PIT_FLOOR - 0.2, L.aftZ[0]], [xs, FLOOR, 511.95], { color: IMP.black, texel: 0.5 });
    // pit floors: matte painted deck plating (impFloor's metalness 0.6 on a near-black tint read as a void)
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -xs : L.walkHalf;
      const x1 = s < 0 ? -L.walkHalf : xs;
      kit.boxMM("paintedMetal", [x0, PIT_FLOOR - 0.2, L.pitZ[0]], [x1, PIT_FLOOR, L.pitZ[1]], { color: IMP.grey, texel: 0.5 });
    }

    // --- ceiling, pits (faces, wall band, rafts, floor), platform edges
    buildCeiling(kit, { xIn: xi, z0: L.foreZ[0], z1: L.aftZ[1], ceilY: CEILY, beamsZ: L.beamsZ, walkwayLightsZ: L.walkwayLightsZ, pendantDrop: L.pendantDrop, platformLights: [[-9.5, 462.4], [9.5, 462.4]], daisZ: L.daisZ });
    buildPits(kit, ctx, L);
    buildPlatforms(kit, L);

    // --- railings (hand-polished top rail, blue post markers): walkway both sides, fore platform edge, aft deck edge
    for (const s of [-1, 1]) bridgeRail(kit, [s * L.walkHalf, L.pitZ[0]], [s * L.walkHalf, L.pitZ[1]], FLOOR);
    for (const s of [-1, 1]) bridgeRail(kit, [s * L.walkHalf, L.foreZ[1]], [s * xi, L.foreZ[1]], FLOOR);
    for (const s of [-1, 1]) {
      const [sx0, sx1] = s < 0 ? L.stairX[0] : L.stairX[1];
      const inner = s * L.walkHalf;
      const outer = s * xi;
      bridgeRail(kit, [inner, L.aftZ[0]], [s < 0 ? sx1 : sx0, L.aftZ[0]], FLOOR);
      bridgeRail(kit, [s < 0 ? sx0 : sx1, L.aftZ[0]], [outer, L.aftZ[0]], FLOOR);
      stairs(kit, { x0: Math.min(sx0, sx1), x1: Math.max(sx0, sx1), z0: L.stairZ[0], z1: L.stairZ[1], yTop: FLOOR, yBottom: PIT_FLOOR, dir: "-z", mat: "paintedMetal", color: IMP.grey });
      // stair side rails (no collider: the stairs-pending blocker from stairs() already closes the head)
      bridgeRail(kit, [s < 0 ? sx0 : sx1, L.stairZ[0]], [s < 0 ? sx0 : sx1, L.stairZ[1]], PIT_FLOOR, { collide: false, markers: false });
    }

    // --- window wall (reveal lining, mullions, glass, sill instruments) and the stations (holo returned for update)
    buildWindowWall(kit, ctx, manifest);
    const holo = buildStations(kit, ctx, manifest, L);

    // --- lights (descriptors, §9.4). Pool renders 12 points + 4 spots sorted by priority then distance:
    // walkway pendants and the key are always on, then the holo glow and fore platform, then the pit rafts,
    // wall washes and low pit accents which only win slots when the camera is in / near a pit.
    const lights = ctx.lights;
    const COOL = LIGHT.coolWhite;
    const PIT = 0xaac6ff; // colder blue-white over the pits
    const WARM = 0xffe6cc; // slightly warmer aft deck
    // key: cold star-light through the band, parked low in the reveal under the transom so no reveal face sits in
    // the cone; aimed flat down the walkway (floor from z ≈ 461 on)
    lights.push({ type: "spot", pos: [0, 243.5, 456.8], target: [0, 239.6, 482], color: COOL, intensity: 240, distance: 60, angle: 0.5, penumbra: 0.7, priority: 1 });
    lights.push({ type: "spot", pos: [0, CEILY - 0.7, L.daisZ], target: [0, FLOOR + 0.2, L.daisZ + 0.3], color: WARM, intensity: 70, distance: 14, angle: 0.45, penumbra: 0.5, priority: 0.95 });
    lights.push({ type: "spot", pos: [0, CEILY - 0.6, 508.6], target: [0, FLOOR, 511.2], color: WARM, intensity: 62, distance: 16, angle: 0.95, penumbra: 0.6, priority: 0.8 });
    lights.push({ type: "spot", pos: [0, CEILY - 0.6, 461.8], target: [0, FLOOR, 461.0], color: COOL, intensity: 74, distance: 16, angle: 0.8, penumbra: 0.7, priority: 0.8 });
    for (const z of L.walkwayLightsZ) lights.push({ type: "point", pos: [0, CEILY - L.pendantDrop - 0.35, z], color: COOL, intensity: 46, distance: 18, priority: 1 });
    lights.push({ type: "point", pos: [0, FLOOR + 1.5, 501.6], color: LIGHT.blue, intensity: 4, distance: 8, priority: 0.9 });
    for (const s of [-1, 1]) {
      lights.push({ type: "point", pos: [s * 9.5, CEILY - 1.4, 462.4], color: COOL, intensity: 64, distance: 18, priority: 0.85 });
      for (const z of L.raftZ) lights.push({ type: "point", pos: [s * L.raftX, L.raftY - 0.45, z], color: PIT, intensity: 62, distance: 22, priority: 0.72 });
      for (const z of [476, 490]) lights.push({ type: "point", pos: [s * 16.8, 246.2, z], color: COOL, intensity: 28, distance: 16, priority: 0.68 });
      // low pit accents (blue fore bay, red aft bay): the pool's distance term lets them win slots only from
      // inside that pit, where they colour the console kicks and the aisle floor
      lights.push({ type: "point", pos: [s * 12.5, PIT_FLOOR + 1.4, 468.5], color: LIGHT.blue, intensity: 6, distance: 10, priority: 0.6 });
      lights.push({ type: "point", pos: [s * 12.5, PIT_FLOOR + 1.4, 490.5], color: LIGHT.red, intensity: 5, distance: 10, priority: 0.6 });
    }

    const scr = screens;
    return {
      update(dt, t) {
        const now = typeof t === "number" ? t : ctx.time ? ctx.time() : 0;
        if (scr) scr.update(now);
        if (holo) holo.update(now);
      },
      api: {},
    };
  },
};

export default manifest;
