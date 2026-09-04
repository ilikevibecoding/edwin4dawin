// d1-bridge — Main Bridge (flagship room). Central command walkway at +240 between two sunken crew pits at
// +237.6, forward viewing platform under the 38 m window band (APERTURE BRIDGE), aft command deck with the
// blast door to the spine. Everything at 1:1 inside the §6.3 Deck 1 envelope.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, PIT_FLOOR, doorsFor } from "../shared/plan.js";
import { wall, floorSlab, ceiling, railing, stairs, doorOpenings, doorReveal, WALL_T } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { buildWindowWall } from "./window.js";
import { buildStations } from "./stations.js";

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
};

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
    "d1-bridge-walkway": { pos: [0, FLOOR, 505], yaw: 0, pitch: -3 },
    "d1-bridge-pit": { pos: [-8, PIT_FLOOR, 484], yaw: 40, pitch: 2 },
    "d1-bridge-window": { pos: [0, FLOOR, 462], yaw: 0, pitch: -5 },
    "d1-bridge-aft": { pos: [0, FLOOR, 468], yaw: 180, pitch: -2 },
    "d1-bridge-command": { pos: [-14, FLOOR, 510], yaw: -28, pitch: -4 },
    "d1-bridge-pit-stbd": { pos: [12, PIT_FLOOR, 470], yaw: 160, pitch: 3 },
  },
  build(ctx) {
    const { kit } = ctx;
    const xi = L.xIn;

    // --- walls. Port/starboard walls drop to the pit floor so the pits are panelled; fore/aft walls sit on +240.
    const winOpening = { a0: -19, a1: 19, y0: 241.2, y1: 245.4, kind: "window" };
    wall(kit, { face: "n", bounds: B, floorY: FLOOR, ceilY: CEILY, openings: [winOpening], seed: 11, panelW: 2.4, strip: null, tone: { light: IMP.grey, mid: IMP.mid } });
    wall(kit, { face: "s", bounds: B, floorY: FLOOR, ceilY: CEILY, openings: doorOpenings(manifest, "s", FLOOR), seed: 13, panelW: 2.4, strip: "emitWhite", stripY: 2.3, tone: { light: IMP.grey, mid: IMP.mid } });
    for (const face of ["w", "e"]) {
      wall(kit, { face, bounds: B, floorY: PIT_FLOOR, ceilY: CEILY, openings: doorOpenings(manifest, face, FLOOR), seed: face === "w" ? 17 : 19, panelW: 2.4, strip: "emitBlue", stripY: 1.9, tone: { light: IMP.grey, mid: IMP.mid } });
    }
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // --- floors: fore platform, walkway, aft command deck (thick slabs so their sides form the pit walls), pit floors
    const xs = xi + 0.05; // overlap into the wall backing (no floor/wall slit)
    kit.boxMM("blackGloss", [-xs, PIT_FLOOR - 0.2, 458.05], [xs, FLOOR, L.foreZ[1]], { color: IMP.black, texel: 0.5 });
    kit.boxMM("blackGloss", [-L.walkHalf, PIT_FLOOR - 0.2, L.pitZ[0]], [L.walkHalf, FLOOR, L.pitZ[1]], { color: IMP.black, texel: 0.5 });
    kit.boxMM("blackGloss", [-xs, PIT_FLOOR - 0.2, L.aftZ[0]], [xs, FLOOR, 511.95], { color: IMP.black, texel: 0.5 });
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -xs : L.walkHalf;
      const x1 = s < 0 ? -L.walkHalf : xs;
      kit.boxMM("impFloor", [x0, PIT_FLOOR - 0.2, L.pitZ[0]], [x1, PIT_FLOOR, L.pitZ[1]], { color: IMP.dark, texel: 0.5 });
    }
    // pit inner walls (walkway sides) and platform drops get a panelled face so they are not raw slab sides
    pitFaces(kit);

    // --- ceiling: near-black, two recessed blue-white channels flanking the walkway and a cross channel aft
    ceiling(kit, B, CEILY, { axis: "z", inset: 0.25, channels: [{ at: -6.5, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: 6.5, w: 0.5, emit: "emitWhite", emitW: 0.14 }], color: IMP.black, panelColor: IMP.black });

    // --- railings: walkway both sides, fore platform edge, aft deck edge (broken at the stairs)
    for (const s of [-1, 1]) railing(kit, [s * L.walkHalf, L.pitZ[0]], [s * L.walkHalf, L.pitZ[1]], FLOOR);
    for (const s of [-1, 1]) railing(kit, [s * L.walkHalf, L.foreZ[1]], [s * xi, L.foreZ[1]], FLOOR);
    for (const s of [-1, 1]) {
      const [sx0, sx1] = s < 0 ? L.stairX[0] : L.stairX[1];
      const inner = s * L.walkHalf;
      const outer = s * xi;
      railing(kit, [inner, L.aftZ[0]], [s < 0 ? sx1 : sx0, L.aftZ[0]], FLOOR);
      railing(kit, [s < 0 ? sx0 : sx1, L.aftZ[0]], [outer, L.aftZ[0]], FLOOR);
      stairs(kit, { x0: Math.min(sx0, sx1), x1: Math.max(sx0, sx1), z0: L.stairZ[0], z1: L.stairZ[1], yTop: FLOOR, yBottom: PIT_FLOOR, dir: "-z", mat: "impFloor", color: IMP.dark });
      // stair side rails
      railing(kit, [s < 0 ? sx0 : sx1, L.stairZ[0]], [s < 0 ? sx0 : sx1, L.stairZ[1]], PIT_FLOOR, { collide: false });
    }

    // --- window wall (reveal lining, mullions, glass, sill) and the stations (pits, sill consoles, command dais)
    buildWindowWall(kit, ctx, manifest);
    buildStations(kit, ctx, manifest, L);

    // --- lights (descriptors, §9.4): cold key from the windows, blue-white walkway pools, pit accents
    const lights = ctx.lights;
    // key: cold star-light through the band, parked inside the aperture reveal (§6.2 volume), aimed down the walkway
    lights.push({ type: "spot", pos: [0, 245.0, 455.8], target: [0, 239, 474], color: LIGHT.coolWhite, intensity: 420, distance: 70, angle: 0.8, penumbra: 0.6, priority: 1 });
    for (const z of [468, 477, 486, 495]) lights.push({ type: "point", pos: [0, CEILY - 1.2, z], color: LIGHT.coolWhite, intensity: 50, distance: 20, priority: 0.7 });
    lights.push({ type: "point", pos: [0, CEILY - 1.0, 506], color: LIGHT.coolWhite, intensity: 60, distance: 22, priority: 0.8 });
    for (const x of [-10, 10]) lights.push({ type: "point", pos: [x, CEILY - 1.0, 461], color: LIGHT.coolWhite, intensity: 45, distance: 18, priority: 0.5 });
    for (const s of [-1, 1]) {
      // pit key lights: cool white over each pit so the outer walls and console rows read (walls are 20 m off the centreline)
      for (const z of [470, 482, 494]) lights.push({ type: "point", pos: [s * 11.5, CEILY - 1.6, z], color: LIGHT.coolWhite, intensity: 70, distance: 26, priority: 0.6 });
      lights.push({ type: "point", pos: [s * 11, PIT_FLOOR + 1.6, 471], color: LIGHT.blue, intensity: 5, distance: 11, priority: 0.4 });
      lights.push({ type: "point", pos: [s * 11, PIT_FLOOR + 1.6, 491], color: LIGHT.red, intensity: 3.5, distance: 10, priority: 0.4 });
    }

    let t = 0;
    return {
      update(dt) {
        t += dt;
      },
      api: {},
    };
  },
};

// The vertical faces of the walkway and platforms as seen from inside the pits: dark panels with a blue kick strip.
function pitFaces(kit) {
  const xi = L.xIn;
  const y0 = PIT_FLOOR;
  const y1 = FLOOR;
  const panel = (min, max) => kit.boxMM("paintedMetal", min, max, { color: IMP.dark, texel: 1 });
  for (const s of [-1, 1]) {
    const x = s * (L.walkHalf + 0.03);
    // walkway side
    panel([Math.min(x, s * L.walkHalf), y0, L.pitZ[0]], [Math.max(x, s * L.walkHalf), y1 - 0.02, L.pitZ[1]]);
    kit.boxMM("emitBlue", [Math.min(x, s * (L.walkHalf + 0.05)), y0 + 0.12, L.pitZ[0] + 0.3], [Math.max(x, s * (L.walkHalf + 0.05)), y0 + 0.16, L.pitZ[1] - 0.3]);
    // fore platform drop (faces +z into the pit) and aft deck drop (faces -z), leaving the stair gap
    const px0 = s < 0 ? -xi : L.walkHalf;
    const px1 = s < 0 ? -L.walkHalf : xi;
    panel([px0, y0, L.pitZ[0] - 0.03], [px1, y1 - 0.02, L.pitZ[0]]);
    const [sx0, sx1] = s < 0 ? L.stairX[0] : L.stairX[1];
    panel([px0, y0, L.pitZ[1]], [Math.min(sx0, px1), y1 - 0.02, L.pitZ[1] + 0.03]);
    panel([Math.max(sx1, px0), y0, L.pitZ[1]], [px1, y1 - 0.02, L.pitZ[1] + 0.03]);
  }
}

export default manifest;
