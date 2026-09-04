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
import { wall, doorOpenings, doorReveal, WALL_T } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { buildWindowWall } from "./window.js";
import { buildStations } from "./stations.js";
import { buildCeiling } from "./ceiling.js";
import { buildPits, buildPlatforms, buildStairs, PLATE } from "./pits.js";
import { bridgeRail } from "./props.js";
import { makeBridgeScreens } from "./screens.js";
import { DAIS_H } from "./stations.js";

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
  walkwayLightsZ: [467.2, 479, 491], // bay centres: a pendant under a beam lit its flange white and its rods cut the web
  pendantDrop: 1.9, // walkway pendant housings hang this far below the ceiling
  daisZ: 505.5,
  aftPendantZ: 508.2, // warm pendant over the aft station bank, between the 499.7 and 509 beams
  aftCornerPendants: [
    [-14, 507],
    [14, 507],
  ], // warm pendants over the outer aft bank, inboard of the ±15.2 cable trays (0.5 m clear) and 5.7 m off the side walls
  raftX: 11.5,
  raftY: 244.2,
  raftZ: [467.5, 481.2, 494.9], // ~13.7 m pitch, 3.5 / 5.1 m from the pit end faces so the fore bay racks are lit; rods clear the beams
};

// module-local animated screen atlas (one 1024×512 canvas); created in materials(), redrawn in update()
let screens = null;

// Black gloss deck for the walkway, fore/aft platforms and the dais top. The shared blackGloss (roughness 0.18)
// mirrors every pool light as a clipped white disc (peak specular ≈ 6–10 × irradiance) that then blooms; at
// roughness 0.55 the overhead pools read as soft sheen (peak ≈ 0.1–0.3) and the grazing reflection of the window
// key becomes a cold streak toward the window (GGX peak ≈ 0.7 at the aft cameras, under the 1.15 bloom threshold —
// at 0.45 and 600 cd the same streak peaked ≈ 5, the clipped white blob on the walkway at z ≈ 480). +1 draw call.
function makeBridgeFloor() {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, metalness: 0.15, envMapIntensity: 1.0 });
}
// Deck-plate joints on that floor: the same lobe (roughness 0.55) so the seam never inverts against the deck's
// sheen, but a dielectric with specularIntensity 0.25 (F0 0.01, grazing Fresnel capped at 0.25 instead of 1) and
// 0.3 env: a joint in a groove reflects less than the plate. Any other roughness read as a light line under the
// key's grazing specular in the centreline views (darkGloss → sharp streak, paintedMetal 1.15 → haze). +1 draw call.
function makeBridgeSeam() {
  return new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, metalness: 0, specularIntensity: 0.25, envMapIntensity: 0.3 });
}
// Pit floors: the shared paintedMetal's worn-plating maps (same texel scale) as a dielectric with specularIntensity
// 0.3. From the walkway cameras the pit floors are seen at grazing angles with the 100 cd rafts above the eye
// line, and a MeshStandardMaterial (F90 = 1 whatever the roughness) turned both pits into bright blue planes
// brighter than the consoles standing on them; capping the grazing Fresnel at 0.3 keeps them as dark wells with
// the raft pools on them. Falls back to plain plating when the registry passes no shared set. +1 draw call.
function makePitFloor(shared) {
  const pm = shared && shared.paintedMetal;
  // No albedo/roughness map: paintedMetal's worn-metal chips read as spilled-fluid blotches on a floor this large
  // (critic round 1). The normal map alone keeps a faint plating grain; 0xa0a0a0 stands in for the map's mean.
  return new THREE.MeshPhysicalMaterial({
    normalMap: (pm && pm.normalMap) || null,
    normalScale: new THREE.Vector2(0.35, 0.35),
    color: 0xa0a0a0,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
    specularIntensity: 0.3,
    envMapIntensity: 0.5,
  });
}

// Lamp diffusers (pendant / downlight / raft undersides, console task lights, head-height wall strips): cool
// white at emissive 1.05, i.e. ≈ 226 sRGB after ACES and under the 1.15 bloom threshold, so a lit diffuser reads
// as a lit panel in its housing instead of a clipped square with a halo (the shared emitWhite is 1.35 → ≈ 236
// plus bloom, right at the clip level; critic round 2: "fixture is a white blob", "lamp heads clip"). +1 draw
// call, paid for by dropping `fabric` (seat cushions are darkGloss now); metalRough still arrives through the
// shared wall() helper's panel joints, so the bridge's own metalRough boxes went to paintedMetal for nothing.
function makeBridgeLamp() {
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe6eeff, emissiveIntensity: 1.05, roughness: 0.6, metalness: 0 });
}

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
    // money shot: standing on the dais at the commander's right shoulder (eye 0.1 m over the 1.4 m back), so the
    // chair is a left-foreground silhouette and the walkway runs to the window; from the aft deck the back hid the walkway
    "d1-bridge-dais": { pos: [0.9, FLOOR + DAIS_H, 507.4], yaw: 0, pitch: -3 },
    // low camera (eye 0.7 m over the platform) 1.1 m back so the sill shelf, the console row and the floor share
    // the frame; 3 m back would put the fore platform rail (z 464) across the middle of the shot
    "d1-bridge-sill": { pos: [8.6, FLOOR - 1.0, 463.8], yaw: 22, pitch: 8 },
  },
  materials(shared) {
    screens = makeBridgeScreens();
    return { bridgeScreen: screens.material, bridgeFloor: makeBridgeFloor(), bridgeSeam: makeBridgeSeam(), bridgePitFloor: makePitFloor(shared), bridgeLamp: makeBridgeLamp() };
  },
  build(ctx) {
    const { kit } = ctx;
    const xi = L.xIn;
    if (!ctx.materials.bridgeScreen) {
      // registry without a materials() hook: create the local materials on demand
      screens = makeBridgeScreens();
      ctx.materials.bridgeScreen = screens.material;
    }
    if (!ctx.materials.bridgeFloor) ctx.materials.bridgeFloor = makeBridgeFloor();
    if (!ctx.materials.bridgeSeam) ctx.materials.bridgeSeam = makeBridgeSeam();
    if (!ctx.materials.bridgePitFloor) ctx.materials.bridgePitFloor = makePitFloor(ctx.materials);
    if (!ctx.materials.bridgeLamp) ctx.materials.bridgeLamp = makeBridgeLamp();

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
    kit.boxMM("bridgeFloor", [-xs, PIT_FLOOR - 0.2, 458.05], [xs, FLOOR, L.foreZ[1]], { color: IMP.black, texel: 0.5 });
    kit.boxMM("bridgeFloor", [-L.walkHalf, PIT_FLOOR - 0.2, L.pitZ[0]], [L.walkHalf, FLOOR, L.pitZ[1]], { color: IMP.black, texel: 0.5 });
    kit.boxMM("bridgeFloor", [-xs, PIT_FLOOR - 0.2, L.aftZ[0]], [xs, FLOOR, 511.95], { color: IMP.black, texel: 0.5 });
    // pit floors: matte painted deck plating in the low-Fresnel bridgePitFloor (impFloor's metalness 0.6 on a
    // near-black tint read as a void; IMP.grey paintedMetal read as bright planes from the walkway). PLATE
    // (pits.js, ≈ 0.72 × IMP.grey, 1.7 × the previous IMP.mid) keeps the pits as wells with grey pools under the
    // rafts that still register from the aft deck (critic round 3: the starboard pit floor was "one flat black slab")
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -xs : L.walkHalf;
      const x1 = s < 0 ? -L.walkHalf : xs;
      kit.boxMM("bridgePitFloor", [x0, PIT_FLOOR - 0.2, L.pitZ[0]], [x1, PIT_FLOOR, L.pitZ[1]], { color: PLATE, texel: 0.5 });
    }

    // --- ceiling, pits (faces, wall band, rafts, floor), platform edges
    buildCeiling(kit, { xIn: xi, z0: L.foreZ[0], z1: L.aftZ[1], ceilY: CEILY, beamsZ: L.beamsZ, walkwayLightsZ: L.walkwayLightsZ, aftPendants: [[0, L.aftPendantZ], ...L.aftCornerPendants], pendantDrop: L.pendantDrop, platformLights: [[-9.5, 462.4], [9.5, 462.4]], daisZ: L.daisZ });
    buildPits(kit, ctx, L);
    buildPlatforms(kit, L);

    // --- railings (hand-polished top rail, blue post markers): walkway both sides, fore platform edge (split at
    // the fore stair heads, x ±4.7..5.9), aft deck edge (split at the aft stair heads); both stair pairs with their
    // lit nosings, sloped handrails and chevrons come from buildStairs
    for (const s of [-1, 1]) bridgeRail(kit, [s * L.walkHalf, L.pitZ[0]], [s * L.walkHalf, L.pitZ[1]], FLOOR);
    for (const s of [-1, 1]) {
      bridgeRail(kit, [s * L.walkHalf, L.foreZ[1]], [s * 4.58, L.foreZ[1]], FLOOR, { postEvery: 1.1 });
      bridgeRail(kit, [s * 6.02, L.foreZ[1]], [s * xi, L.foreZ[1]], FLOOR);
    }
    for (const s of [-1, 1]) {
      const [sx0, sx1] = s < 0 ? L.stairX[0] : L.stairX[1];
      const inner = s * L.walkHalf;
      const outer = s * xi;
      bridgeRail(kit, [inner, L.aftZ[0]], [s < 0 ? sx1 : sx0, L.aftZ[0]], FLOOR);
      bridgeRail(kit, [s < 0 ? sx0 : sx1, L.aftZ[0]], [outer, L.aftZ[0]], FLOOR);
    }
    buildStairs(kit, L);

    // --- window wall (reveal lining, mullions, glass, sill instruments) and the stations (holo returned for update)
    buildWindowWall(kit, ctx, manifest);
    const holo = buildStations(kit, ctx, manifest, L);

    // --- lights (descriptors, §9.4). Pool renders 12 points + 4 spots sorted by priority then distance.
    // The window is the key: a cold key over the window head raking the walkway from the fore end, two wide
    // cold fills parked inside the reveal head over the fore platform / pit fronts, and every ceiling pool ramps
    // from 100 % at the window end to ~40 % aft. Spots: key + 2 fills + the dais spot fill the 4 slots. Points:
    // 3 pendants + 2 fore + 6 rafts + 3 aft + 4 pit accents = 18 candidates for the 12 point slots (score =
    // priority − d/120, six dropped per camera): the aft walkway cameras drop the two fore rafts and the four
    // accents, the fore cameras drop the two aft-corner pendants and the accents; down in a pit the accents of that
    // pit come in and displace the far side's rafts and corner pendant.
    // Every point sits INSIDE its closed fixture housing, just under the housing top (ceiling.js / pits.js): there
    // is no shadowing, so a point in an open housing lit the housing's own walls and louvre to E ≈ 300–1500 and
    // every fixture read as a white blob; inside a closed box every outer face has N·L < 0 and stays dark.
    // The harness gives the first spot in sort order a shadow map: the dais spot (priority 1, a narrow
    // near-vertical cone) keeps it from every camera — the grazing key would show shadow acne along the walkway.
    const lights = ctx.lights;
    const COOL = LIGHT.coolWhite;
    const PIT = 0xaac6ff; // colder blue-white over the pits
    const WARM = 0xffe6cc; // slightly warmer aft deck
    // key: at the ceiling just inside the window head, aimed down the walkway (cone's near edge lands at the pit
    // fronts, z ≈ 467.5). Its job is the cold sheen on the floor, rails and console faces toward the window: on
    // the roughness-0.55 floor its grazing specular peaks ≈ 0.7 at the aft cameras (600 cd on 0.45 gave ≈ 5, a
    // clipped white streak); the diffuse key work near the window is done by the two fills.
    lights.push({ type: "spot", pos: [0, CEILY - 0.6, 458.6], target: [0, FLOOR, 480], color: COOL, intensity: 170, distance: 70, angle: 0.36, penumbra: 0.6, priority: 0.5 });
    // fills: inside the reveal at the pane centres (x ±9.5, between the 7.6 and 11.4 mullions), just over the
    // transom (y 244.14), 40° half-angle aimed straight down the pane. At head height (245.0) each fill sat 0.28 m
    // under the head lining and its grazing specular on the lining read as a white blob at the window head from
    // every aft camera; with a 51.6° cone at x ±9 the near mullion blade (1.4 m away, ~29° off-axis) blew out the
    // same way in the sill view. Now the lining (0.98 m up) and both blades (1.7 m away, ~39° off-axis, ≈ 3 %
    // attenuation) are outside the lit cone, and the transom top it grazes is invisible from every eye height.
    for (const s of [-1, 1]) lights.push({ type: "spot", pos: [s * 9.5, 244.3, 456.6], target: [s * 9.5, PIT_FLOOR + 1.0, 472], color: COOL, intensity: 80, distance: 30, angle: 0.7, penumbra: 0.5, priority: 0.45 });
    lights.push({ type: "spot", pos: [0, CEILY - 0.7, L.daisZ - 0.5], target: [0, FLOOR + 0.9, L.daisZ + 0.6], color: WARM, intensity: 50, distance: 14, angle: 0.4, penumbra: 0.5, priority: 1 });
    // walkway pendants 100 / 70 / 40 %, the point just under the housing top (6.2 m over the deck)
    const pendantY = CEILY - L.pendantDrop + 0.13;
    L.walkwayLightsZ.forEach((z, i) => lights.push({ type: "point", pos: [0, pendantY, z], color: COOL, intensity: [75, 52, 30][i], distance: 18, priority: 1 }));
    // aft deck: one warm pendant pool over the aft station bank and two over the outer aft bank at x ±14: with
    // the centre pendant alone the 40 × 12 m aft deck was a black void from the command camera (E ≈ 0.13 in its
    // corners) — everything on the aft deck is matte black, so the walls (5.7 m from these pendants) are what
    // carries the brightness. Critic round 2 ("command view underexposed") = one more stop: 45 → 85 cd on the
    // corner pendants (E ≈ 2.4 on the pod tops under them, ≈ 1.3 on the side wall) and 45 → 70 on the centre,
    // reach 20 m so the two pools overlap on the aft wall cabinets. Same priority as the rafts, so the distance
    // term swaps them in for the aft cameras (they take the slots of the 40 m-away fore rafts) and out forward.
    lights.push({ type: "point", pos: [0, pendantY, L.aftPendantZ], color: WARM, intensity: 70, distance: 20, priority: 0.85 });
    // distance 10, not 20: at 20 the port pendant reached the port passage's west wall through the door wall (no
    // shadows in the pool) at E ≈ 0.6 — as much as the passage's own pools — and the passage could not be dimmed.
    // 10 keeps ≈ 0.9 of the reach on the aft wall (5 m) and ≈ 0.75 on the side walls (6 m), 0.4 in the passage.
    for (const [x, z] of L.aftCornerPendants) lights.push({ type: "point", pos: [x, pendantY, z], color: WARM, intensity: 85, distance: 10, priority: 0.75 });
    for (const s of [-1, 1]) {
      // fore platform downlights, inside the recessed ceiling housings (0.3 m boxes under the slab)
      lights.push({ type: "point", pos: [s * 9.5, CEILY - 0.05, 462.4], color: COOL, intensity: 80, distance: 18, priority: 0.85 });
      // pit rafts, inside the closed raft housings just under their tops (6.7 m over the pit floor); 100 / 70 / 60 %:
      // at 40 % the aft bay's console rows were unreadable silhouettes from the walkway cameras; the aft raft went
      // 50 → 60 with the lighter pit plating so its pool reads on the aft bay floor from the dais
      L.raftZ.forEach((z, i) => lights.push({ type: "point", pos: [s * L.raftX, L.raftY + 0.13, z], color: PIT, intensity: [100, 70, 60][i], distance: 22, priority: 0.75 }));
      // low pit accents (blue fore bay, red aft bay) colour the console kicks and the aisle floor from inside the pit
      lights.push({ type: "point", pos: [s * 12.5, PIT_FLOOR + 1.4, 468.5], color: LIGHT.blue, intensity: 8, distance: 10, priority: 0.6 });
      lights.push({ type: "point", pos: [s * 12.5, PIT_FLOOR + 1.4, 490.5], color: LIGHT.red, intensity: 7, distance: 10, priority: 0.6 });
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
