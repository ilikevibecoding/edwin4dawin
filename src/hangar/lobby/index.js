// d4-lobby — Deck 4 turbolift lobby. Imperial lift lobby between the hangar's aft blast door, the two
// service corridors, the stairwell and the T4 turbolift: dark gloss floor with the deck "4" marking,
// panelled walls with strips at 2.1 m, heavy blast-door surround, deck directory, lockers and benches.
// The doors system builds every door assembly; the lifts system builds the cabin, its doors and the
// call panel in the LIFT_DOOR hole — this room only leaves the exact holes.
import { doorOpening, FRAME_W } from "../../systems/doors/helper.js";
import { LIFT_DOOR } from "../../systems/lifts/helper.js";
import { impWall, impCeiling, impFloorSlab, impRib, MAT, col } from "../../systems/corridor/imperial.js";
import { Placer, impConsole, impLocker, impBench, floorDigit, firePoint } from "../../systems/corridor/props.js";

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

// Deck directory: black board, title strip, four deck rows (digit block, text bars, status dot).
function deckDirectory(kit, pos, normal) {
  const yaw = Math.atan2(normal[0], normal[2]);
  const P = new Placer(kit, pos, yaw);
  const w = 1.6;
  const h = 1.15;
  P.box(MAT.dark, 0, 0, 0.03, w, h, 0.06, { color: col("impBlack"), texel: 1 });
  P.box(MAT.dark, 0, 0, 0.065, w - 0.08, h - 0.08, 0.01, { color: col("impDark"), texel: 1 });
  P.box(MAT.strip, 0, h / 2 - 0.07, 0.072, w - 0.3, 0.016, 0.006);
  P.box(MAT.panel, -w / 2 + 0.3, h / 2 - 0.16, 0.072, 0.36, 0.035, 0.006, { color: col("impWhite"), uv: "keep" });
  const rows = [
    ["1", "impGrey", MAT.blue, [0.55, 0.3]],
    ["2", "impGrey", MAT.blue, [0.42, 0.36]],
    ["3", "impGrey", MAT.amber, [0.5, 0.26]],
    ["4", "impWhite", MAT.red, [0.62, 0.4]],
  ];
  // 7-segment digits in the board plane
  const SEG = { 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc" };
  rows.forEach(([d, tint, dot, bars], i) => {
    const y = h / 2 - 0.36 - i * 0.22;
    const x0 = -w / 2 + 0.16;
    const s = 0.14;
    const b = 0.024;
    const segs = SEG[d];
    const seg = (cx, cy, sx, sy) => P.box(MAT.panel, x0 + cx, y + cy, 0.074, sx, sy, 0.006, { color: col(tint), uv: "keep" });
    if (segs.includes("a")) seg(0, s / 2, s * 0.6, b);
    if (segs.includes("d")) seg(0, -s / 2, s * 0.6, b);
    if (segs.includes("g")) seg(0, 0, s * 0.6, b);
    if (segs.includes("b")) seg(s * 0.3, s / 4, b, s / 2);
    if (segs.includes("c")) seg(s * 0.3, -s / 4, b, s / 2);
    if (segs.includes("f")) seg(-s * 0.3, s / 4, b, s / 2);
    if (segs.includes("e")) seg(-s * 0.3, -s / 4, b, s / 2);
    P.box(MAT.panel, x0 + 0.2 + bars[0] / 2, y + 0.035, 0.072, bars[0], 0.03, 0.006, { color: col(tint), uv: "keep" });
    P.box(MAT.panel, x0 + 0.2 + bars[1] / 2, y - 0.035, 0.072, bars[1], 0.02, 0.006, { color: col("impMid"), uv: "keep" });
    P.box(dot, w / 2 - 0.14, y, 0.074, 0.06, 0.06, 0.006);
    if (d === "4") P.box(MAT.dark, x0 - 0.1, y, 0.071, 0.02, 0.18, 0.004, { color: col("impRed") });
  });
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

    // ---- floor: dark gloss slab, deck numeral, white walkway lines, hazard band at the blast door
    impFloorSlab(kit, { x0: min[0], x1: max[0], z0: min[2], z1: max[2], y: FLOOR, mat: "blackGloss", tint: "impDark", texel: 0.5 });
    floorDigit(kit, { digit: "4", pos: [0, FLOOR, 176.2], size: 2.6, bar: 0.3, up: [0, 0, -1] });
    for (const x of [-1.9, 1.9]) kit.boxMM(MAT.panel, [x - 0.04, FLOOR, 170.7], [x + 0.04, FLOOR + 0.008, 180.5], { color: col("impWhite"), uv: "keep" });
    kit.boxMM("hazard", [-2.4, FLOOR, 170.16], [2.4, FLOOR + 0.008, 170.62], { texel: 2.5 });
    kit.boxMM(MAT.dark, [min[0] + T, FLOOR, min[2] + T], [max[0] - T, FLOOR + 0.006, min[2] + T + 0.2], { color: col("impBlack") });
    kit.boxMM(MAT.dark, [min[0] + T, FLOOR, max[2] - T - 0.2], [max[0] - T, FLOOR + 0.006, max[2] - T], { color: col("impBlack") });

    // ---- walls (holes from the door contract + lift door)
    const wallOpts = { y0: FLOOR, h: H, holes, tint: "impWhite", tint2: "impGrey", greebles: 0.06 };
    impWall(kit, { ...wallOpts, plane: "z", at: min[2], inward: 1, a0: min[0], a1: max[0], seed: seed + 1, tag: "lobby-fwd" });
    impWall(kit, { ...wallOpts, plane: "z", at: max[2], inward: -1, a0: min[0], a1: max[0], seed: seed + 2, tag: "lobby-aft" });
    impWall(kit, { ...wallOpts, plane: "x", at: min[0], inward: 1, a0: min[2], a1: max[2], seed: seed + 3, tag: "lobby-west" });
    impWall(kit, { ...wallOpts, plane: "x", at: max[0], inward: -1, a0: min[2], a1: max[2], seed: seed + 4, tag: "lobby-east" });

    // ---- ceiling: three light channels running fore-aft, two ribs across the hall
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

    // ---- heavy blast-door surround (outside the doors system's FRAME_W reveal)
    {
      const hw = 2.0 + FRAME_W + 0.08; // post inner edge
      const z0 = min[2] + T;
      for (const s of [-1, 1]) {
        const x0 = Math.min(s * hw, s * (hw + 0.6));
        const x1 = Math.max(s * hw, s * (hw + 0.6));
        kit.boxMM(MAT.dark, [x0, FLOOR, z0], [x1, CEIL - 0.12, z0 + 0.36], { color: col("impDark"), texel: 1 });
        kit.boxMM("hazard", [s > 0 ? x0 - 0.001 : x1 - 0.14, FLOOR + 0.3, z0 + 0.36], [s > 0 ? x0 + 0.14 : x1 + 0.001, FLOOR + 3.6, z0 + 0.372], { texel: 2.5 });
        kit.boxMM(MAT.dark, [x0 + 0.1, FLOOR + 0.3, z0 + 0.36], [x1 - 0.1, FLOOR + 0.36, z0 + 0.38], { color: col("impBlack") });
        kit.boxMM(MAT.steel, [x0 + 0.12, FLOOR + 0.5, z0 + 0.36], [x1 - 0.12, FLOOR + 3.4, z0 + 0.375], { color: col("impMid"), texel: 1 });
        // beacon housing + red lamp on top of each post
        kit.boxMM(MAT.dark, [x0 + 0.15, CEIL - 0.6, z0 + 0.36], [x1 - 0.15, CEIL - 0.3, z0 + 0.5], { color: col("impBlack") });
        kit.boxMM(MAT.red, [x0 + 0.19, CEIL - 0.56, z0 + 0.5], [x1 - 0.19, CEIL - 0.34, z0 + 0.52]);
        kit.collider([x0, FLOOR, z0], [x1, FLOOR + 3, z0 + 0.36], "blast-post");
      }
      // lintel + cycling indicator plate above the door
      kit.boxMM(MAT.dark, [-(hw + 0.6), FLOOR + 4.3, z0], [hw + 0.6, CEIL - 0.12, z0 + 0.36], { color: col("impDark"), texel: 1 });
      kit.boxMM(MAT.dark, [-1.0, FLOOR + 4.05, z0], [1.0, FLOOR + 4.28, z0 + 0.06], { color: col("impBlack") });
      kit.boxMM(MAT.amber, [-0.8, FLOOR + 4.12, z0 + 0.06], [0.8, FLOOR + 4.2, z0 + 0.07]);
      kit.boxMM(MAT.panel, [-2.2, FLOOR + 4.3, z0 + 0.36], [2.2, FLOOR + 4.36, z0 + 0.4], { color: col("impGrey"), uv: "keep" });
    }

    // (lift door frame, lintel indicator and call panel are built by the lifts system in the
    // liftLobbyClearance volume — this room only leaves the LIFT_DOOR hole)

    // ---- furniture: lockers + bench on the east wall, directory + bench + wall terminal on the west/aft walls
    const east = max[0] - T;
    const west = min[0] + T;
    impLocker(kit, { pos: [east - 0.26, FLOOR, 174.62], yaw: -Math.PI / 2, seed: seed + 11, status: MAT.blue });
    impLocker(kit, { pos: [east - 0.26, FLOOR, 175.27], yaw: -Math.PI / 2, seed: seed + 12, status: MAT.red });
    impLocker(kit, { pos: [east - 0.26, FLOOR, 175.92], yaw: -Math.PI / 2, seed: seed + 13, status: MAT.blue });
    impBench(kit, { pos: [east - 0.26, FLOOR, 177.05], yaw: -Math.PI / 2, len: 1.6 });
    impBench(kit, { pos: [east - 0.26, FLOOR, 179.4], yaw: -Math.PI / 2, len: 1.6 });
    deckDirectory(kit, [west, FLOOR + 1.4, 175.6], [1, 0, 0]); // top edge 1.975: clear of the 2.1 m strip band
    impBench(kit, { pos: [west + 0.26, FLOOR, 179.3], yaw: Math.PI / 2, len: 1.8 });
    impConsole(kit, { pos: [-5.6, FLOOR, max[2] - T - 0.42], yaw: Math.PI, w: 1.3, d: 0.7, screens: ["screenImp2", "screenImp1", "screenImp2"], seed: seed + 21, tag: "terminal" });
    // wall-mounted fire point beside the stairs door (yaw PI: local +z points into the room, world -z)
    firePoint(kit, { pos: [4.2, FLOOR, max[2] - T], yaw: Math.PI });

    // ---- lights (6 descriptors; several softer pools rather than two hot ones — the gloss floor
    // mirrors every point light as a highlight)
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.7, 172.9], color: 0xdfe8ff, intensity: 9, distance: 12, priority: 0.7 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.7, 175.5], color: 0xdfe8ff, intensity: 8, distance: 12, priority: 0.6 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.7, 178.1], color: 0xdfe8ff, intensity: 9, distance: 12, priority: 0.7 });
    ctx.lights.push({ type: "point", pos: [-6, CEIL - 0.9, 176], color: 0xcfdcff, intensity: 7, distance: 10, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [6, CEIL - 0.9, 176], color: 0xcfdcff, intensity: 7, distance: 10, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [0, FLOOR + 3.6, 170.9], color: 0xff6a4a, intensity: 5, distance: 5, priority: 0.45 });
    return {};
  },
};
