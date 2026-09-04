// d1-tactical — holo planning room (Phase 2 detail): a 5 × 3 m holo table projecting an animated fleet plot,
// the commander's raised tier with rail, stairs and lectern, an animated display wall behind it, stepped
// briefing seating for 18 facing the table from the west, sensor stations along the side walls, lockers,
// weapons-status boards, ceiling structure and wall greebles.
// Contract (COORDINATION.md §7): id/kind/deck/owner/bounds/doors/lift/spawn/apertures unchanged from Phase 1.
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, railing, stairs, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { ScreenAtlas, UI, paintTacticalMap, paintFleetList, paintWeaponsBoard, paintStatusColumn, paintConsole, paintReadoutBar, paintGauge } from "../nav/ui.js";
import { placer, wallAnchor, station, chair, locker, dataColumn, junctionBox, vent, intercom, emergencyCabinet, framedScreen, readoutBar, conduitBundle, wallPipe, stencilPlate, wallLuminaire, beam, ceilingRibs, cableTray, downlight, ceilingVent, projectorRig, floorInlay, floorHatch, stepBlock, lowRail, WALL_OFF } from "../nav/props.js";
import { tickHolo } from "../nav/holo.js";
import { buildHoloTable, buildFleetPlot, lectern, wallRack, seatBlock } from "./plot.js";

const ID = "d1-tactical";
const B = BOUNDS[ID];
const CY = CEIL[ID];
const IN = { min: [B.min[0] + 0.3, FLOOR, B.min[2] + 0.3], max: [B.max[0] - 0.3, CY, B.max[2] - 0.3] };
const CX = (B.min[0] + B.max[0]) / 2; // 33.8
const CZ = (B.min[2] + B.max[2]) / 2; // 477
const TIER = FLOOR + 0.3;
const TX = IN.max[0] - 4.0; // tier front edge (x = 39.7)
const DL = 7.6; // downlight rows at CX ± DL (over the back seating rows and the tier)

let atlas = null;

const manifest = {
  id: ID,
  name: "Tactical Planning",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [25.5, FLOOR, 477], yaw: -90 },
  apertures: [],
  views: {
    "d1-tactical-table": { pos: [26, FLOOR, 477], yaw: -90, pitch: -6 },
    "d1-tactical-screens": { pos: [31, FLOOR, 477], yaw: -90, pitch: 2 },
    "d1-tactical-overview": { pos: [42.5, TIER, 470], yaw: 140, pitch: -5 },
    "d1-tactical-plot": { pos: [36.9, FLOOR, 480.9], yaw: 38, pitch: -6 },
    "d1-tactical-lectern": { pos: [42.7, TIER, 477.9], yaw: 90, pitch: -8 },
  },
  // one module-local canvas texture (1024²) carrying every custom display in the room
  materials() {
    atlas = new ScreenAtlas(1024, { intensity: 1.35, fps: 8 });
    return { tacAtlas: atlas.material };
  },
  build(ctx) {
    const { kit } = ctx;
    const holoObjects = [];
    if (!atlas) manifest.materials();

    // ---- atlas regions (canvas px, top-down) → uv rects
    // (non-overlapping grid: left column x 0..352, middle x 352..768, right x 768..1024 below the 380 px map)
    const cells = {
      map: atlas.region(0, 0, 1024, 380, paintTacticalMap(3101)),
      fleet: [atlas.region(0, 380, 176, 380, paintFleetList(3201, { title: "TASK FORCE · ROSTER" })), atlas.region(176, 380, 176, 380, paintFleetList(3202, { title: "CONTACTS · TRACK", accent: UI.red }))],
      wpn: [atlas.region(0, 764, 336, 140, paintWeaponsBoard(3701)), atlas.region(0, 904, 336, 120, paintWeaponsBoard(3702, { title: "ORDNANCE · TUBES", cols: 6, rows: 3 }))],
      con: [0, 1, 2, 3].map((i) => atlas.region(352, 380 + i * 64, 416, 64, paintConsole(3301 + i, { title: i % 2 ? "SENSOR STN" : "EDGE PNL", accent: i % 2 ? UI.amber : UI.blue }))),
      rb: [0, 1].map((i) => atlas.region(352, 636 + i * 48, 416, 48, paintReadoutBar(3401 + i, { accent: i ? UI.cyan : UI.amber, labels: i ? ["RNG", "BRG", "CLS", "VEL", "TTI", "ROE", "SOL", "PWR"] : ["TRK", "CNT", "ECM", "SNR", "LNK", "BAT", "SHD", "ALT"] }))),
      lect: atlas.region(352, 740, 300, 180, paintConsole(3801, { title: "CMD LECTERN", accent: UI.cyan })),
      gauge: [0, 1, 2, 3].map((i) => atlas.region(768 + (i % 2) * 112, 380 + Math.floor(i / 2) * 112, 112, 112, paintGauge(3501 + i, { label: ["PWR", "SHLD", "BATT", "SENS"][i], accent: [UI.cyan, UI.blue, UI.amber, UI.cyan][i] }))),
      desk: [0, 1].map((i) => atlas.region(768, 604 + i * 102, 160, 102, paintGauge(3651 + i, { label: ["TRACK", "SOLUTION"][i], accent: [UI.cyan, UI.amber][i] }))),
      brief: atlas.region(768, 810, 256, 170, paintStatusColumn(3901, { title: "BRIEFING · TIMELINE", accent: UI.amber })),
    };
    atlas.paint(ctx.time());
    const M = "tacAtlas";

    // ---- shell (unchanged Phase-1 helpers)
    roomShell(kit, manifest, {
      floorY: FLOOR,
      ceilY: CY,
      seed: 71,
      panelW: 2.4,
      strip: "emitBlue",
      ceiling: { axis: "z", inset: 0.25, channels: [{ at: CX - 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: CX + 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }] },
    });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // ---- holo table + fleet plot
    const { top } = buildHoloTable(kit, M, cells, CX, FLOOR, CZ, { seed: 5 });
    const plot = buildFleetPlot(CX, top, CZ, { seed: 11, sweep: 0.7 });
    ctx.group.add(plot.lines, plot.points);
    holoObjects.push(plot.lines, plot.points);

    // ---- floor inlays: door aisle → table, table → tier stairs, tier edge line
    floorInlay(kit, [IN.min[0] + 0.1, FLOOR, CZ - 0.6], [CX - 2.15, FLOOR, CZ + 0.6]);
    floorInlay(kit, [CX + 2.15, FLOOR, CZ - 0.55], [TX - 0.85, FLOOR, CZ + 0.55]);
    floorInlay(kit, [TX + 0.35, TIER, IN.min[2] + 0.5], [TX + 0.65, TIER, IN.max[2] - 0.5], { ticks: false });
    for (const i of [0, 1]) placer(kit, IN.min[0] + 3.0 + i * 3.8, FLOOR + 0.02, CZ, 0).decal(0, 0, 0, 0.5, i ? 9 : 6, -Math.PI / 2);

    // ---- raised tier (east) with nosing, hazard riser, step lights, rails and two-step stairs
    stepBlock(kit, [TX, FLOOR, IN.min[2]], [IN.max[0], TIER, IN.max[2]], { edges: ["w"], hazardRiser: true, tag: "tier" });
    kit.boxMM("emitBlue", [TX - 0.006, FLOOR + 0.18, IN.min[2] + 0.05], [TX, FLOOR + 0.2, CZ - 1.65]);
    kit.boxMM("emitBlue", [TX - 0.006, FLOOR + 0.18, CZ + 1.65], [TX, FLOOR + 0.2, IN.max[2] - 0.05]);
    stairs(kit, { x0: TX - 0.8, x1: TX, z0: CZ - 1.6, z1: CZ + 1.6, yTop: TIER, yBottom: FLOOR, dir: "-x" });
    railing(kit, [TX, IN.min[2] + 0.3], [TX, CZ - 1.6], TIER);
    railing(kit, [TX, CZ + 1.6], [TX, IN.max[2] - 0.3], TIER);
    lectern(kit, placer(kit, TX + 1.3, TIER, CZ, 1), { w: 1.2, screenMat: M, screenRect: cells.lect, stripRect: cells.rb[1], seed: 2 });
    // two sensor stations on the tier facing the flank displays
    {
      const xc = IN.max[0] - WALL_OFF - 0.57;
      [470.9, 483.1].forEach((z, i) => {
        station(kit, placer(kit, xc, TIER, z, 3), { w: 2.2, screenMat: M, screenRect: cells.con[1 + i * 2], deskMat: M, deskRect: cells.desk[i], seed: 60 + i, label: 9 });
        chair(kit, placer(kit, xc - 1.05, TIER, z + (i ? 0.12 : -0.12), 3));
      });
    }

    // ---- display wall (east): main plot, fleet columns, weapons boards, corner columns, rack under the plot
    {
      const yMid = FLOOR + 2.55;
      framedScreen(kit, wallAnchor(kit, "e", IN, CZ, yMid), { w: 6.4, h: 2.4, mat: M, uvRect: cells.map, bezel: 0.12, deep: 0.16 });
      framedScreen(kit, wallAnchor(kit, "e", IN, CZ + 4.05, yMid), { w: 1.2, h: 2.4, mat: M, uvRect: cells.fleet[0], bezel: 0.08, deep: 0.14 });
      framedScreen(kit, wallAnchor(kit, "e", IN, CZ - 4.05, yMid), { w: 1.2, h: 2.4, mat: M, uvRect: cells.fleet[1], bezel: 0.08, deep: 0.14 });
      framedScreen(kit, wallAnchor(kit, "e", IN, CZ + 6.15, yMid), { w: 2.4, h: 1.0, mat: M, uvRect: cells.wpn[0], bezel: 0.08, deep: 0.12 });
      framedScreen(kit, wallAnchor(kit, "e", IN, CZ - 6.15, yMid), { w: 2.4, h: 1.0, mat: M, uvRect: cells.wpn[1], bezel: 0.08, deep: 0.12 });
      wallRack(kit, wallAnchor(kit, "e", IN, CZ, TIER), { w: 6.0, h: 0.9, seed: 3, screenMat: M, screenRect: cells.con[2] });
      for (const s of [-1, 1]) {
        stencilPlate(kit, wallAnchor(kit, "e", IN, CZ + s * 4.05, TIER + 0.75), 0.3, s > 0 ? 6 : 9);
        junctionBox(kit, wallAnchor(kit, "e", IN, CZ + s * 3.7, TIER + 0.45), { w: 0.26, h: 0.3, seed: 2, decal: null });
        junctionBox(kit, wallAnchor(kit, "e", IN, CZ + s * 7.65, FLOOR + 3.5), { w: 0.4, h: 0.3, seed: 4, decal: null });
        wallPipe(kit, wallAnchor(kit, "e", IN, CZ + s * 5.7, FLOOR + 3.5), { len: 2.6, r: 0.035 });
        wallPipe(kit, wallAnchor(kit, "e", IN, CZ + s * 5.7, FLOOR + 3.3), { len: 2.6, r: 0.022, color: IMP.dark });
        stencilPlate(kit, wallAnchor(kit, "e", IN, CZ + s * 5.5, FLOOR + 3.85), 0.26, 14);
      }
      dataColumn(kit, wallAnchor(kit, "e", IN, IN.min[2] + 0.7, TIER), { ceilY: CY - TIER, seed: 4, screenMat: M, screenRect: cells.desk[1] });
      dataColumn(kit, wallAnchor(kit, "e", IN, IN.max[2] - 0.7, TIER), { ceilY: CY - TIER, seed: 5, screenMat: M, screenRect: cells.desk[0] });
    }

    // ---- briefing seating (west): 2 blocks × 3 stepped rows × 3 seats, low rails front and back
    {
      const rows = [
        { x: 29.9, y: FLOOR },
        { x: 28.8, y: FLOOR + 0.17 },
        { x: 27.7, y: FLOOR + 0.34 },
      ];
      const blocks = [
        { zMin: 473.75, zMax: 476.25, seatZ: [474.2, 475.0, 475.8] },
        { zMin: 477.75, zMax: 480.25, seatZ: [478.2, 479.0, 479.8] },
      ];
      for (const b of blocks) {
        seatBlock(kit, FLOOR, { rows, zMin: b.zMin, zMax: b.zMax, seatZ: b.seatZ, facing: 3, chairFn: (p) => chair(kit, p, { padColor: IMP.grey, shellColor: IMP.mid, backLed: true }) });
        lowRail(kit, [30.5, b.zMin], [30.5, b.zMax], FLOOR, { postEvery: 1.2 });
        lowRail(kit, [27.15, b.zMin], [27.15, b.zMax], FLOOR + 0.34, { postEvery: 1.2 });
        lowRail(kit, [27.15, b.zMin], [28.25, b.zMin], FLOOR + 0.34, { postEvery: 1.2, collide: false });
        lowRail(kit, [27.15, b.zMax], [28.25, b.zMax], FLOOR + 0.34, { postEvery: 1.2, collide: false });
      }
    }

    // ---- ceiling: cross beams, projector rig over the table, cable trays, downlights, vents
    beam(kit, [IN.min[0], CY - 0.32, 471.6], [IN.max[0], CY, 471.95]);
    beam(kit, [IN.min[0], CY - 0.32, 482.05], [IN.max[0], CY, 482.4]);
    projectorRig(kit, CX, CY - 0.62, CZ, { shape: "rect", rx: 1.35, rz: 2.35, ceilY: CY, lenses: 8, emit: "emitBlue" });
    cableTray(kit, [CX, CZ - 2.45], [CX, IN.min[2] + 0.35], CY - 0.2, { w: 0.36, hangTo: CY });
    cableTray(kit, [CX + 1.45, CZ - 1.0], [IN.max[0] - 0.35, CZ - 1.0], CY - 0.2, { w: 0.3, hangTo: CY, cables: 2 });
    cableTray(kit, [IN.min[0] + 0.35, CZ + 1.0], [CX - 1.45, CZ + 1.0], CY - 0.2, { w: 0.3, hangTo: CY, cables: 2 });
    for (const x of [CX - DL, CX + DL]) for (const z of [471.0, CZ, 483.0]) downlight(kit, x, CY, z);
    ceilingRibs(kit, [CX - 6.3, CX - 2.5, CX + 2.5, CX + 6.3], IN.min[2] + 0.3, IN.max[2] - 0.3, CY);
    ceilingVent(kit, CX - 3.2, CY, 470.0);
    ceilingVent(kit, CX + 3.2, CY, 484.6);
    conduitBundle(kit, wallAnchor(kit, "e", IN, CZ - 1.0, FLOOR), { y0: 3.95, y1: CY - FLOOR - 0.12, pipes: [[-0.06, 0.025], [0.06, 0.025]] });
    conduitBundle(kit, wallAnchor(kit, "w", IN, CZ + 1.0, FLOOR), { y0: 2.15, y1: CY - FLOOR - 0.12, pipes: [[-0.06, 0.025], [0.06, 0.025]] });

    // ---- west wall: door (reveal only) with a lintel luminaire over the seating, weapons board + lockers north
    //      of it, briefing screen + lockers south
    {
      wallLuminaire(kit, wallAnchor(kit, "w", IN, CZ, FLOOR + 3.5), { w: 0.9 });
      locker(kit, wallAnchor(kit, "w", IN, 469.0, FLOOR), { seed: 1, label: 6 });
      locker(kit, wallAnchor(kit, "w", IN, 469.9, FLOOR), { seed: 2, label: 9 });
      vent(kit, wallAnchor(kit, "w", IN, 469.45, FLOOR + 2.95), { w: 1.4, h: 0.36 });
      conduitBundle(kit, wallAnchor(kit, "w", IN, 470.75, FLOOR), { y0: 1.15, y1: 3.75 });
      framedScreen(kit, wallAnchor(kit, "w", IN, 472.5, FLOOR + 2.1), { w: 2.4, h: 1.0, mat: M, uvRect: cells.wpn[1], bezel: 0.08, deep: 0.12 });
      junctionBox(kit, wallAnchor(kit, "w", IN, 471.6, FLOOR + 1.2), { up: 0.2, down: 0.75, seed: 3 });
      vent(kit, wallAnchor(kit, "w", IN, 473.0, FLOOR + 1.1), { w: 1.0, h: 0.32 });
      intercom(kit, wallAnchor(kit, "w", IN, 474.9, FLOOR + 1.5));
      stencilPlate(kit, wallAnchor(kit, "w", IN, 474.9, FLOOR + 2.0), 0.3, 14);
      wallPipe(kit, wallAnchor(kit, "w", IN, 471.9, FLOOR + 3.55), { len: 6.2, r: 0.035 });
      wallPipe(kit, wallAnchor(kit, "w", IN, 471.9, FLOOR + 3.35), { len: 6.2, r: 0.022, color: IMP.dark });
      emergencyCabinet(kit, wallAnchor(kit, "w", IN, 479.0, FLOOR + 1.3));
      stencilPlate(kit, wallAnchor(kit, "w", IN, 479.0, FLOOR + 2.4), 0.3, 5);
      intercom(kit, wallAnchor(kit, "w", IN, 479.6, FLOOR + 1.5));
      framedScreen(kit, wallAnchor(kit, "w", IN, 481.0, FLOOR + 2.4), { w: 1.8, h: 1.2, mat: M, uvRect: cells.brief });
      junctionBox(kit, wallAnchor(kit, "w", IN, 482.6, FLOOR + 1.6), { up: 0.4, down: 1.1, seed: 5 });
      locker(kit, wallAnchor(kit, "w", IN, 483.6, FLOOR), { seed: 3, label: 6 });
      locker(kit, wallAnchor(kit, "w", IN, 484.5, FLOOR), { seed: 4, label: 9 });
      vent(kit, wallAnchor(kit, "w", IN, 484.05, FLOOR + 2.95), { w: 1.4, h: 0.36 });
      wallPipe(kit, wallAnchor(kit, "w", IN, 482.2, FLOOR + 3.55), { len: 6.4, r: 0.035 });
      floorHatch(kit, IN.min[0] + 1.5, FLOOR, 482.3);
    }

    // ---- north wall: corner columns, greebles, three sensor stations with overhead readouts, lockers by the tier
    {
      dataColumn(kit, wallAnchor(kit, "n", IN, IN.min[0] + 0.55, FLOOR), { ceilY: CY - FLOOR, seed: 1, screenMat: M, screenRect: cells.gauge[0] });
      dataColumn(kit, wallAnchor(kit, "n", IN, IN.min[0] + 1.5, FLOOR), { ceilY: CY - FLOOR, seed: 2 });
      emergencyCabinet(kit, wallAnchor(kit, "n", IN, 26.5, FLOOR + 1.3));
      stencilPlate(kit, wallAnchor(kit, "n", IN, 26.5, FLOOR + 2.4), 0.3, 13);
      intercom(kit, wallAnchor(kit, "n", IN, 27.2, FLOOR + 1.5));
      junctionBox(kit, wallAnchor(kit, "n", IN, 27.9, FLOOR + 1.6), { up: 0.35, down: 1.1, seed: 6 });
      wallPipe(kit, wallAnchor(kit, "n", IN, 26.8, FLOOR + 3.5), { len: 5.2, r: 0.04 });
      wallPipe(kit, wallAnchor(kit, "n", IN, 26.8, FLOOR + 3.3), { len: 5.2, r: 0.025, color: IMP.dark });
      const zc = IN.min[2] + WALL_OFF + 0.57;
      [30.0, 32.6, 35.2].forEach((x, i) => {
        station(kit, placer(kit, x, FLOOR, zc, 0), { w: 2.4, screenMat: M, screenRect: cells.con[(i + 1) % 4], deskMat: M, deskRect: cells.desk[i % 2], seed: 70 + i, label: i % 2 ? 6 : 9 });
        chair(kit, placer(kit, x + (i % 2 ? 0.2 : -0.2), FLOOR, zc + 1.05, 0));
        readoutBar(kit, wallAnchor(kit, "n", IN, x, FLOOR + 2.55), { w: 2.4, mat: M, uvRect: cells.rb[i % 2] });
      });
      conduitBundle(kit, wallAnchor(kit, "n", IN, 36.7, FLOOR), { y0: 1.15, y1: 3.75 });
      locker(kit, wallAnchor(kit, "n", IN, 37.4, FLOOR), { seed: 5, label: 6 });
      locker(kit, wallAnchor(kit, "n", IN, 38.3, FLOOR), { seed: 6, label: 9 });
      vent(kit, wallAnchor(kit, "n", IN, 37.85, FLOOR + 3.3), { w: 1.4, h: 0.36 });
      junctionBox(kit, wallAnchor(kit, "n", IN, 39.1, FLOOR + 1.6), { up: 0.3, down: 1.1, seed: 7 });
      // on the tier
      junctionBox(kit, wallAnchor(kit, "n", IN, 40.6, TIER + 1.5), { up: 0.3, down: 0.9, seed: 8 });
      stencilPlate(kit, wallAnchor(kit, "n", IN, 41.6, TIER + 1.6), 0.3, 7);
      vent(kit, wallAnchor(kit, "n", IN, 41.4, TIER + 3.0), { w: 1.2, h: 0.36 });
      wallPipe(kit, wallAnchor(kit, "n", IN, 41.2, TIER + 2.3), { len: 2.6, r: 0.03 });
    }

    // ---- south wall: corner column, wide station + weapons board, lockers, cabinet, greebles
    {
      dataColumn(kit, wallAnchor(kit, "s", IN, 25.2, FLOOR), { ceilY: CY - FLOOR, seed: 3, screenMat: M, screenRect: cells.gauge[1] });
      junctionBox(kit, wallAnchor(kit, "s", IN, 26.3, FLOOR + 1.6), { up: 0.35, down: 1.1, seed: 9 });
      vent(kit, wallAnchor(kit, "s", IN, 26.6, FLOOR + 3.3), { w: 1.2, h: 0.36 });
      const zc = IN.max[2] - WALL_OFF - 0.57;
      station(kit, placer(kit, 28.6, FLOOR, zc, 2), { w: 3.0, screenMat: M, screenRect: cells.con[0], deskMat: M, deskRect: cells.desk[1], seed: 80, label: 9 });
      chair(kit, placer(kit, 28.4, FLOOR, zc - 1.05, 2));
      readoutBar(kit, wallAnchor(kit, "s", IN, 28.6, FLOOR + 2.55), { w: 3.0, mat: M, uvRect: cells.rb[1] });
      station(kit, placer(kit, 32.5, FLOOR, zc, 2), { w: 2.4, screenMat: M, screenRect: cells.con[3], deskMat: M, deskRect: cells.desk[0], seed: 81, label: 6 });
      chair(kit, placer(kit, 32.7, FLOOR, zc - 1.05, 2));
      framedScreen(kit, wallAnchor(kit, "s", IN, 32.5, FLOOR + 2.55), { w: 2.4, h: 1.0, mat: M, uvRect: cells.wpn[0], bezel: 0.08, deep: 0.12 });
      framedScreen(kit, wallAnchor(kit, "s", IN, 34.45, FLOOR + 2.3), { w: 0.9, h: 2.0, mat: M, uvRect: cells.fleet[0], bezel: 0.06, deep: 0.1, leds: false });
      locker(kit, wallAnchor(kit, "s", IN, 35.55, FLOOR), { seed: 7, label: 6 });
      locker(kit, wallAnchor(kit, "s", IN, 36.45, FLOOR), { seed: 8, label: 9 });
      vent(kit, wallAnchor(kit, "s", IN, 36.0, FLOOR + 2.95), { w: 1.4, h: 0.36 });
      emergencyCabinet(kit, wallAnchor(kit, "s", IN, 37.3, FLOOR + 1.3));
      intercom(kit, wallAnchor(kit, "s", IN, 38.0, FLOOR + 1.5));
      junctionBox(kit, wallAnchor(kit, "s", IN, 38.8, FLOOR + 1.6), { up: 0.3, down: 1.1, seed: 10 });
      stencilPlate(kit, wallAnchor(kit, "s", IN, 37.3, FLOOR + 2.4), 0.3, 5);
      wallPipe(kit, wallAnchor(kit, "s", IN, 37.0, FLOOR + 3.55), { len: 5.0, r: 0.035 });
      wallPipe(kit, wallAnchor(kit, "s", IN, 37.0, FLOOR + 3.35), { len: 5.0, r: 0.022, color: IMP.dark });
      conduitBundle(kit, wallAnchor(kit, "s", IN, 39.25, FLOOR), { y0: 1.15, y1: 3.75 });
      // on the tier
      junctionBox(kit, wallAnchor(kit, "s", IN, 40.6, TIER + 1.5), { up: 0.3, down: 0.9, seed: 11 });
      stencilPlate(kit, wallAnchor(kit, "s", IN, 41.6, TIER + 1.6), 0.3, 2);
      vent(kit, wallAnchor(kit, "s", IN, 41.4, TIER + 3.0), { w: 1.2, h: 0.36 });
      wallPipe(kit, wallAnchor(kit, "s", IN, 41.2, TIER + 2.3), { len: 2.6, r: 0.03 });
    }

    // ---- lights (14 descriptors: 11 point + 3 spot; corridor keeps 1 point + 1 spot pool slots)
    // downlight points sit 0.8 m under their housings so the dark ceiling panels around them pick up light too
    ctx.lights.push({ type: "point", pos: [CX, FLOOR + 2.7, CZ], color: 0x4fd8ff, intensity: 9, distance: 9, priority: 0.9 });
    ctx.lights.push({ type: "spot", pos: [CX, CY - 0.85, CZ], color: LIGHT.coolWhite, intensity: 10, distance: 8, target: [CX, top, CZ], angle: 0.9, penumbra: 0.4, priority: 0.85 });
    for (const x of [CX - DL, CX + DL]) for (const z of [471.0, CZ, 483.0]) ctx.lights.push({ type: "point", pos: [x, CY - 0.8, z], color: LIGHT.coolWhite, intensity: 14, distance: 12, priority: 0.5 });
    ctx.lights.push({ type: "spot", pos: [IN.max[0] - 2.6, CY - 0.7, CZ], color: 0xbfd4ff, intensity: 12, distance: 8, target: [IN.max[0], FLOOR + 2.0, CZ], angle: 1.0, penumbra: 0.6, priority: 0.6 });
    // commander's position: white pool on the lectern, low amber accent
    ctx.lights.push({ type: "spot", pos: [TX + 1.3, CY - 0.6, CZ], color: LIGHT.coolWhite, intensity: 16, distance: 6, target: [TX + 1.3, TIER + 1.1, CZ], angle: 0.65, penumbra: 0.5, priority: 0.6 });
    ctx.lights.push({ type: "point", pos: [TX + 2.4, TIER + 2.2, CZ], color: LIGHT.amber, intensity: 2.5, distance: 4, priority: 0.45 });
    // briefing seats: pool over the rows plus a lintel light above the door that lights the seat backs (seen from the door)
    ctx.lights.push({ type: "point", pos: [28.6, CY - 0.7, CZ], color: LIGHT.coolWhite, intensity: 16, distance: 9, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [IN.min[0] + 0.5, FLOOR + 3.4, CZ], color: LIGHT.coolWhite, intensity: 9, distance: 9, priority: 0.55 });
    ctx.lights.push({ type: "point", pos: [CX, CY - 0.8, 470.2], color: LIGHT.coolWhite, intensity: 7, distance: 6, priority: 0.4 });

    return {
      update(dt, t) {
        atlas.update(t);
        tickHolo(holoObjects, t);
      },
    };
  },
};
export default manifest;
