// d4-lobby — Deck 4 turbolift lobby. Imperial lift lobby between the hangar's aft blast door, the two
// service corridors, the stairwell and the T4 turbolift: dark deck-plate floor with the stencilled deck "4",
// panelled walls with strips at 2.1 m, heavy blast-door surround, deck directory with real text,
// labelled lockers, benches on brackets and eye-level wayfinding placards at every exit.
// The doors system builds every door assembly; the lifts system builds the cabin, its doors and the
// call panel in the LIFT_DOOR hole — this room only leaves the exact holes.
import { doorOpening, FRAME_W } from "../../systems/doors/helper.js";
import { LIFT_DOOR } from "../../systems/lifts/helper.js";
import { impWall, impCeiling, impFloorSlab, impRib, MAT, col } from "../../systems/corridor/imperial.js";
import { Placer, impConsole, impLocker, impBench, firePoint, deckPlacard } from "../../systems/corridor/props.js";
import { textMaterials, stencilDigit } from "../../systems/corridor/text.js";

const FLOOR = -72;
const CEIL = -67.5;
const B = { min: [-10, FLOOR, 170], max: [10, CEIL, 181] };
const T = 0.16;
const H = CEIL - FLOOR - 0.12; // wall height under the ceiling slab

const DOORS = [
  { id: "d4-hangar-aft", pos: [0, FLOOR, 170], dir: [0, 0, -1], kind: "blast", to: "d4-hangar" },
  { id: "d4-lobby-east", pos: [10, FLOOR, 171.75], dir: [1, 0, 0], kind: "standard", to: "d4-corridor-east" },
  { id: "d4-lobby-west", pos: [-10, FLOOR, 171.75], dir: [-1, 0, 0], kind: "standard", to: "d4-corridor-west" },
  { id: "d4-lobby-stairs", pos: [7, FLOOR, 181], dir: [0, 0, 1], kind: "standard", to: "d4-stairs" },
];
const LIFT = { id: "T4", pos: [0, FLOOR, 181], dir: [0, 0, -1] };

// Deck directory: black board, title, four deck rows (number, name, status lamp); this deck is marked.
function deckDirectory(kit, pos, normal) {
  const yaw = Math.atan2(normal[0], normal[2]);
  const P = new Placer(kit, pos, yaw);
  const w = 1.6;
  const h = 1.15;
  P.box(MAT.dark, 0, 0, 0.03, w, h, 0.06, { color: col("impBlack"), texel: 1 });
  P.box(MAT.dark, 0, 0, 0.065, w - 0.08, h - 0.08, 0.01, { color: col("impDark"), texel: 1 });
  P.box(MAT.strip, 0, h / 2 - 0.07, 0.072, w - 0.3, 0.016, 0.006);
  P.text("DECK DIRECTORY", -w / 2 + 0.16, h / 2 - 0.17, 0.074, { size: 0.07, color: "white", lit: true, align: "left" });
  P.text("TURBOLIFT T4", w / 2 - 0.14, h / 2 - 0.17, 0.074, { size: 0.045, color: "blue", lit: true, align: "right" });
  const rows = [
    ["01", "COMMAND TOWER", "BRIDGE - OPERATIONS", MAT.blue],
    ["02", "CREW DECK", "QUARTERS - MEDBAY - MESS", MAT.blue],
    ["03", "ENGINEERING", "REACTOR - HYPERDRIVE", MAT.amber],
    ["04", "HANGAR", "FLIGHT DECK - BAYS - CONTROL", MAT.red],
  ];
  rows.forEach(([num, name, sub, dot], i) => {
    const y = h / 2 - 0.36 - i * 0.22;
    const here = num === "04";
    const x0 = -w / 2 + 0.12;
    if (here) P.box(MAT.dark, 0, y, 0.069, w - 0.16, 0.2, 0.004, { color: col("impMid") });
    P.text(num, x0, y, 0.075, { size: 0.13, color: here ? "white" : "blue", lit: true, align: "left" });
    P.text(name, x0 + 0.24, y + 0.045, 0.075, { size: 0.065, color: "white", lit: true, align: "left" });
    P.text(sub, x0 + 0.24, y - 0.045, 0.075, { size: 0.036, color: here ? "amber" : "white", lit: !here, align: "left", maxWidth: 0.95 });
    P.box(dot, w / 2 - 0.14, y, 0.074, 0.06, 0.06, 0.006);
    if (here) P.text("YOU ARE HERE", w / 2 - 0.22, y, 0.075, { size: 0.036, color: "amber", lit: true, align: "right" });
  });
  P.box(MAT.dark, 0, -h / 2 + 0.07, 0.069, w - 0.3, 0.002, 0.004, { color: col("impGrey") });
}

export default {
  id: "d4-lobby",
  name: "Deck 4 Lift Lobby",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: LIFT,
  spawn: { pos: [0, FLOOR, 176], yaw: 0 },
  apertures: [],
  materials: textMaterials,
  views: {
    "d4-lobby-lift": { pos: [0, FLOOR, 173.5], yaw: 180, pitch: 2 },
    "d4-lobby-hangar-door": { pos: [0, FLOOR, 179], yaw: 0, pitch: 0 },
    "d4-lobby-east-wall": { pos: [-4.5, FLOOR, 176.5], yaw: -70, pitch: 2 },
    "d4-lobby-directory": { pos: [-5.8, FLOOR, 178.8], yaw: 62, pitch: 0 },
  },
  build(ctx) {
    const { kit, seed } = ctx;
    const { min, max } = B;
    const holes = DOORS.map((d) => doorOpening(d));
    holes.push({ min: [LIFT.pos[0] - LIFT_DOOR.w / 2, FLOOR, 181 - T], max: [LIFT.pos[0] + LIFT_DOOR.w / 2, FLOOR + LIFT_DOOR.h, 181 + T] });

    // ---- floor: the shared dark deck plate (impFloor, continuous with the corridors — blackGloss mirrored
    // the environment into sourceless blobs), stencilled deck numeral (outlined, worn), walkway lines, one
    // hazard band (the chevron sill) at the blast door — the door leaves carry the doors system's chevrons
    impFloorSlab(kit, { x0: min[0], x1: max[0], z0: min[2], z1: max[2], y: FLOOR, tint: "impDark", texel: 0.5 });
    stencilDigit(kit, { digit: "4", pos: [0, FLOOR + 0.004, 176.1], normal: [0, 1, 0], up: [0, 0, -1], size: 4.2, color: "grey" });
    for (const x of [-1.9, 1.9]) kit.boxMM(MAT.panel, [x - 0.04, FLOOR, 170.7], [x + 0.04, FLOOR + 0.008, 180.5], { color: col("impGrey"), uv: "keep" });
    kit.boxMM("hazard", [-2.4, FLOOR, 170.16], [2.4, FLOOR + 0.008, 170.62], { texel: 2.5 });
    kit.boxMM(MAT.dark, [min[0] + T, FLOOR, min[2] + T], [max[0] - T, FLOOR + 0.006, min[2] + T + 0.2], { color: col("impBlack") });
    kit.boxMM(MAT.dark, [min[0] + T, FLOOR, max[2] - T - 0.2], [max[0] - T, FLOOR + 0.006, max[2] - T], { color: col("impBlack") });

    // ---- walls (holes from the door contract + lift door); greebles stay clear of the placards, the
    // directory and the fire point placed further down
    const wallOpts = { y0: FLOOR, h: H, holes, tint: "impWhite", tint2: "impGrey", greebles: 0.05 };
    impWall(kit, { ...wallOpts, plane: "z", at: min[2], inward: 1, a0: min[0], a1: max[0], seed: seed + 1, tag: "lobby-fwd", clear: [[3.0, 4.4]] });
    impWall(kit, { ...wallOpts, plane: "z", at: max[2], inward: -1, a0: min[0], a1: max[0], seed: seed + 2, tag: "lobby-aft", clear: [[2.0, 4.6], [8.5, 9.9]] });
    impWall(kit, { ...wallOpts, plane: "x", at: min[0], inward: 1, a0: min[2], a1: max[2], seed: seed + 3, tag: "lobby-west", clear: [[173.4, 176.6]] });
    impWall(kit, { ...wallOpts, plane: "x", at: max[0], inward: -1, a0: min[2], a1: max[2], seed: seed + 4, tag: "lobby-east", clear: [[173.4, 174.7]] });

    // ---- ceiling: three light channels running fore-aft (housed fixtures), two ribs across the hall
    const ceilY = CEIL - 0.12;
    impCeiling(kit, {
      x0: min[0],
      x1: max[0],
      z0: min[2],
      z1: max[2],
      y: ceilY,
      seed: seed + 5,
      channels: [
        { axis: "z", at: 0, width: 0.7, c0: 170.6, c1: 180.4, fixtureAt: [172.9, 175.5, 178.1], fixtureLen: 2.2 },
        { axis: "z", at: -6, width: 0.5, c0: 172.5, c1: 179.5, fixtureAt: [176], fixtureLen: 2.4 },
        { axis: "z", at: 6, width: 0.5, c0: 172.5, c1: 179.5, fixtureAt: [176], fixtureLen: 2.4 },
      ],
    });
    for (const [z, i] of [
      [174.0, 0],
      [178.0, 1],
    ]) impRib(kit, { axis: "z", at: z, c0: min[0] + T, c1: max[0] - T, y0: FLOOR, h: H, depth: 0.28, proud: 0.2, index: i });

    // ---- heavy blast-door surround (outside the doors system's FRAME_W reveal): dark posts with a
    // recessed steel channel and an amber light line, beacons on top, lintel with the cycling indicator
    {
      const hw = 2.0 + FRAME_W + 0.08; // post inner edge
      const z0 = min[2] + T;
      for (const s of [-1, 1]) {
        const x0 = Math.min(s * hw, s * (hw + 0.6));
        const x1 = Math.max(s * hw, s * (hw + 0.6));
        kit.boxMM(MAT.dark, [x0, FLOOR, z0], [x1, CEIL - 0.12, z0 + 0.36], { color: col("impDark"), texel: 1 });
        kit.boxMM(MAT.dark, [x0 + 0.1, FLOOR + 0.3, z0 + 0.36], [x1 - 0.1, FLOOR + 0.36, z0 + 0.38], { color: col("impBlack") });
        kit.boxMM(MAT.steel, [x0 + 0.12, FLOOR + 0.5, z0 + 0.36], [x1 - 0.12, FLOOR + 3.4, z0 + 0.375], { color: col("impMid"), texel: 1 });
        kit.boxMM(MAT.dark, [x0 + 0.26, FLOOR + 0.6, z0 + 0.36], [x1 - 0.26, FLOOR + 3.3, z0 + 0.385], { color: col("impBlack") });
        kit.boxMM(MAT.amber, [x0 + 0.28, FLOOR + 0.65, z0 + 0.385], [x1 - 0.28, FLOOR + 3.25, z0 + 0.392]);
        // beacon housing + red lamp on top of each post
        kit.boxMM(MAT.dark, [x0 + 0.15, CEIL - 0.6, z0 + 0.36], [x1 - 0.15, CEIL - 0.3, z0 + 0.5], { color: col("impBlack") });
        kit.boxMM(MAT.red, [x0 + 0.19, CEIL - 0.56, z0 + 0.5], [x1 - 0.19, CEIL - 0.34, z0 + 0.52]);
        kit.collider([x0, FLOOR, z0], [x1, FLOOR + 3, z0 + 0.36], "blast-post");
      }
      kit.boxMM(MAT.dark, [-(hw + 0.6), FLOOR + 4.3, z0], [hw + 0.6, CEIL - 0.12, z0 + 0.36], { color: col("impDark"), texel: 1 });
      kit.boxMM(MAT.dark, [-1.0, FLOOR + 4.05, z0], [1.0, FLOOR + 4.28, z0 + 0.06], { color: col("impBlack") });
      kit.boxMM(MAT.amber, [-0.8, FLOOR + 4.12, z0 + 0.06], [0.8, FLOOR + 4.2, z0 + 0.07]);
      kit.boxMM(MAT.panel, [-2.2, FLOOR + 4.3, z0 + 0.36], [2.2, FLOOR + 4.36, z0 + 0.4], { color: col("impGrey"), uv: "keep" });
    }

    // (lift door frame, lintel indicator and call panel are built by the lifts system in the
    // liftLobbyClearance volume — this room only leaves the LIFT_DOOR hole)

    // ---- furniture: labelled lockers + benches on the east wall (lockers 1.85 m so the 2.1 m strip
    // housing keeps clear wall above their lids), directory + bench + wall terminal on the west/aft walls
    const east = max[0] - T;
    const west = min[0] + T;
    const fwd = min[2] + T;
    const aft = max[2] - T;
    [
      [175.02, MAT.blue, "LKR 01"],
      [175.67, MAT.red, "LKR 02"],
      [176.32, MAT.blue, "LKR 03"],
    ].forEach(([z, status, label], i) => impLocker(kit, { pos: [east - 0.26, FLOOR, z], yaw: -Math.PI / 2, h: 1.85, seed: seed + 11 + i, status, label }));
    impBench(kit, { pos: [east - 0.26, FLOOR, 177.55], yaw: -Math.PI / 2, len: 1.6, gloss: MAT.floor });
    impBench(kit, { pos: [east - 0.26, FLOOR, 179.6], yaw: -Math.PI / 2, len: 1.6, gloss: MAT.floor });
    deckDirectory(kit, [west, FLOOR + 1.4, 175.6], [1, 0, 0]); // top edge 1.975: clear of the 2.1 m strip band
    impBench(kit, { pos: [west + 0.26, FLOOR, 179.3], yaw: Math.PI / 2, len: 1.8, gloss: MAT.floor });
    impConsole(kit, { pos: [-5.6, FLOOR, aft - 0.42], yaw: Math.PI, w: 1.3, d: 0.7, layout: 3, screens: ["screenImp2", "screenImp1", "screenImp2", "screenImp1"], seed: seed + 21, gloss: MAT.floor, tag: "terminal" });
    // wall-mounted fire point beside the stairs door (yaw PI: local +z points into the room, world -z)
    firePoint(kit, { pos: [4.2, FLOOR, aft], yaw: Math.PI, hazard: false }); // the blast-door sill is the lobby's one hazard marking

    // ---- wayfinding placards at reading height (1.7 m) beside every exit
    deckPlacard(kit, { pos: [2.7, FLOOR + 1.7, aft], normal: [0, 0, -1], w: 1.1, h: 0.34, title: "TURBOLIFT T4", sub: "DECKS 01 - 04", accent: "impBlue" });
    deckPlacard(kit, { pos: [9.2, FLOOR + 1.7, aft], normal: [0, 0, -1], w: 1.1, h: 0.34, title: "STAIRWELL 4-S", sub: "FLIGHT CONTROL", arrow: "↑", accent: "impBlue" });
    deckPlacard(kit, { pos: [3.7, FLOOR + 1.7, fwd], normal: [0, 0, 1], w: 1.2, h: 0.34, title: "HANGAR BAY 4", sub: "BLAST DOOR - STAND CLEAR", accent: "impRed" });
    deckPlacard(kit, { pos: [east, FLOOR + 1.7, 174.05], normal: [-1, 0, 0], w: 1.1, h: 0.34, title: "CORRIDOR 4-E", sub: "CARGO BAY", arrow: "←", accent: "impAmber" });
    deckPlacard(kit, { pos: [west, FLOOR + 1.7, 174.05], normal: [1, 0, 0], w: 1.1, h: 0.34, title: "CORRIDOR 4-W", sub: "REPAIR BAY", arrow: "→", accent: "impBlue" });

    // ---- lights (6 descriptors): pools under the ceiling channels only, none near the lift wall — the
    // reflective floor mirrors every point light, and the lifts system lights its own door. Tuned for the
    // harness's dark-hall environment (no ambient fill): 3.8 m pools at 20 land ~1.4 on the floor.
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.7, 172.9], color: 0xdfe8ff, intensity: 20, distance: 13, priority: 0.7 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.7, 175.5], color: 0xdfe8ff, intensity: 20, distance: 13, priority: 0.6 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.7, 177.6], color: 0xdfe8ff, intensity: 14, distance: 11, priority: 0.55 });
    for (const x of [-6, 6]) ctx.lights.push({ type: "point", pos: [x, CEIL - 0.7, 176], color: 0xdfe8ff, intensity: 12, distance: 10, priority: 0.5 }); // under the side channels' fixtures: lockers, benches, directory
    ctx.lights.push({ type: "point", pos: [0, FLOOR + 3.6, 170.9], color: 0xff6a4a, intensity: 5, distance: 5, priority: 0.45 });
    return {};
  },
};
