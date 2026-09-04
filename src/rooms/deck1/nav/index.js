// d1-nav — secondary navigation (Phase 2 detail): a working star-chart table instrument with a rotating
// point-cloud hologram and plotted route, an animated chart wall, plotting stations with overhead readouts,
// the navigator's raised desk, cable trays from the ceiling to the table, wall greebles, floor inlays.
// Contract (COORDINATION.md §7): id/kind/deck/owner/bounds/doors/lift/spawn/apertures unchanged from Phase 1.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, doorReveal, railing, stairs } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { ScreenAtlas, UI, paintStarMap, paintStatusColumn, paintConsole, paintReadoutBar, paintGauge, paintStack } from "./ui.js";
import { placer, wallAnchor, station, chair, locker, dataColumn, junctionBox, vent, intercom, emergencyCabinet, framedScreen, readoutBar, conduitBundle, wallPipe, stencilPlate, beam, ceilingRibs, cableTray, downlight, ceilingVent, projectorRig, floorInlay, floorHatch, stepBlock, WALL_OFF } from "./props.js";
import { buildChartTable, buildChartHolo } from "./table.js";
import { tickHolo } from "./holo.js";

const ID = "d1-nav";
const B = BOUNDS[ID];
const CY = CEIL[ID];
const IN = { min: [B.min[0] + 0.3, FLOOR, B.min[2] + 0.3], max: [B.max[0] - 0.3, CY, B.max[2] - 0.3] };
const CX = (B.min[0] + B.max[0]) / 2; // -33.8
const CZ = (B.min[2] + B.max[2]) / 2; // 477

let atlas = null;

const manifest = {
  id: ID,
  name: "Navigation",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [-25.5, FLOOR, 477], yaw: 90 },
  apertures: [],
  views: {
    "d1-nav-table": { pos: [-26, FLOOR, 477], yaw: 90, pitch: -5 },
    "d1-nav-chart": { pos: [-34, FLOOR, 481], yaw: 0, pitch: 3 },
    "d1-nav-corner": { pos: [-42.5, FLOOR, 470], yaw: -140, pitch: -4 },
    "d1-nav-holo": { pos: [-30.2, FLOOR, 479.6], yaw: 54, pitch: 10 },
    "d1-nav-dais": { pos: [-31.3, FLOOR, 479.3], yaw: 158, pitch: -3 },
  },
  // one module-local canvas texture (1024²) carrying every custom display in the room
  materials() {
    atlas = new ScreenAtlas(1024, { intensity: 1.35, fps: 8 });
    return { navAtlas: atlas.material };
  },
  build(ctx) {
    const { kit } = ctx;
    const holoObjects = [];
    if (!atlas) manifest.materials();

    // ---- atlas regions (canvas px, top-down) → uv rects
    // (non-overlapping grid: left column x 0..352, middle x 352..768, right x 768..1024 below the 380 px map)
    const cells = {
      map: atlas.region(0, 0, 1024, 380, paintStarMap(1201)),
      colA: atlas.region(0, 380, 176, 380, paintStatusColumn(1301, { title: "LANE STATUS" })),
      colB: atlas.region(176, 380, 176, 380, paintStatusColumn(1302, { title: "GRAV SHADOW", accent: UI.amber })),
      wall: [atlas.region(352, 724, 300, 180, paintConsole(2001, { title: "DRIVE PLOT", accent: UI.blue })), atlas.region(0, 764, 300, 180, paintConsole(2002, { title: "BEACON NET", accent: UI.amber }))],
      con: [0, 1, 2].map((i) => atlas.region(352, 380 + i * 64, 416, 64, paintConsole(1401 + i, { title: "PLOT STN" }))),
      rb: [0, 1].map((i) => atlas.region(352, 572 + i * 48, 416, 48, paintReadoutBar(1501 + i, { accent: i ? UI.cyan : UI.amber }))),
      navdesk: atlas.region(352, 672, 416, 48, paintReadoutBar(1901, { accent: UI.cyan, labels: ["LANE", "LEG", "ETA", "DEV", "MASS", "GRAV", "SYNC", "BCN"] })),
      board: atlas.region(352, 908, 280, 116, paintStatusColumn(2101, { title: "HYPERLANE 7 · READY", accent: UI.cyan })),
      desk: [0, 1].map((i) => atlas.region(768, 380 + i * 112, 176, 112, paintGauge(1601 + i, { label: i ? "ALIGN" : "DRIVE" }))),
      gauge: [0, 1, 2].map((i) => atlas.region(768 + (i % 2) * 112, 604 + Math.floor(i / 2) * 112, 112, 112, paintGauge(1701 + i, { label: ["MASS", "SYNC", "REF"][i], accent: [UI.cyan, UI.amber, UI.blue][i] }))),
      stack: atlas.region(880, 716, 80, 300, paintStack(1801, { title: "LINK" })),
    };
    atlas.paint(ctx.time());
    const M = "navAtlas";

    // ---- shell (unchanged Phase-1 helpers): light-grey panels, blue strip, two ceiling light channels
    roomShell(kit, manifest, {
      floorY: FLOOR,
      ceilY: CY,
      seed: 61,
      panelW: 2.4,
      strip: "emitBlue",
      ceiling: { axis: "z", inset: 0.25, channels: [{ at: CX - 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: CX + 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }] },
    });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // ---- star-chart table + hologram
    const { top } = buildChartTable(kit, M, cells, CX, FLOOR, CZ, { seed: 3 });
    const holo = buildChartHolo(CX, top, CZ, { seed: 7, spin: 0.05 });
    ctx.group.add(holo.stars, holo.lines);
    holoObjects.push(holo.stars, holo.lines);

    // ---- floor inlays: door → table, table → chart wall, table → dais
    floorInlay(kit, [-31.15, FLOOR, CZ - 0.7], [IN.max[0] - 0.1, FLOOR, CZ + 0.7]);
    floorInlay(kit, [CX - 0.55, FLOOR, 470.4], [CX + 0.55, FLOOR, CZ - 2.95]);
    floorInlay(kit, [CX - 0.55, FLOOR, CZ + 2.95], [CX + 0.55, FLOOR, 481.9]);

    // ---- ceiling: cross beams, projector rig, cable trays, downlights, vents
    beam(kit, [IN.min[0], CY - 0.32, 472.0], [IN.max[0], CY, 472.35]);
    beam(kit, [IN.min[0], CY - 0.32, 481.65], [IN.max[0], CY, 482.0]);
    projectorRig(kit, CX, CY - 0.62, CZ, { shape: "octagon", rx: 1.65, ceilY: CY, emit: "emitBlue" });
    cableTray(kit, [CX, CZ - 1.55], [CX, 472.4], CY - 0.2, { w: 0.36, hangTo: CY });
    cableTray(kit, [CX, 471.95], [CX, IN.min[2] + 0.35], CY - 0.2, { w: 0.36, hangTo: CY });
    cableTray(kit, [CX + 1.55, CZ - 0.9], [IN.max[0] - 0.35, CZ - 0.9], CY - 0.2, { w: 0.3, hangTo: CY, cables: 2 });
    for (const x of [CX - 8.2, CX + 8.2]) for (const z of [471.0, CZ, 483.0]) downlight(kit, x, CY, z);
    ceilingRibs(kit, [CX - 7.5, CX - 2.5, CX + 2.5, CX + 7.5], IN.min[2] + 0.3, IN.max[2] - 0.3, CY);
    ceilingVent(kit, CX + 3.2, CY, 470.0);
    ceilingVent(kit, CX - 3.2, CY, 484.6);
    // conduit drop from the east ceiling tray to the door junction
    conduitBundle(kit, wallAnchor(kit, "e", IN, CZ - 0.9, FLOOR), { y0: 2.35, y1: CY - FLOOR - 0.12, pipes: [[-0.06, 0.025], [0.06, 0.025]] });

    // ---- chart wall (north): main route display, two status columns, two link stacks, control desk
    {
      const yMid = FLOOR + 2.65;
      framedScreen(kit, wallAnchor(kit, "n", IN, CX, yMid), { w: 7.0, h: 2.6, mat: M, uvRect: cells.map, bezel: 0.12, deep: 0.16 });
      framedScreen(kit, wallAnchor(kit, "n", IN, CX - 4.8, yMid), { w: 1.2, h: 2.6, mat: M, uvRect: cells.colA, bezel: 0.08, deep: 0.14 });
      framedScreen(kit, wallAnchor(kit, "n", IN, CX + 4.8, yMid), { w: 1.2, h: 2.6, mat: M, uvRect: cells.colB, bezel: 0.08, deep: 0.14 });
      framedScreen(kit, wallAnchor(kit, "n", IN, CX - 6.15, yMid), { w: 0.6, h: 2.6, mat: M, uvRect: cells.stack, bezel: 0.06, deep: 0.12, leds: false });
      framedScreen(kit, wallAnchor(kit, "n", IN, CX + 6.15, yMid), { w: 0.6, h: 2.6, mat: M, uvRect: cells.stack, bezel: 0.06, deep: 0.12, leds: false });
      // control desk: four stations facing the wall, chairs behind them
      const zc = IN.min[2] + WALL_OFF + 0.68; // housing clears the chart display's lower bezel
      [-4.15, -1.38, 1.38, 4.15].forEach((dx, i) => {
        station(kit, placer(kit, CX + dx, FLOOR, zc, 0), { w: 2.6, screenMat: M, screenRect: cells.con[i % 3], deskMat: M, deskRect: cells.desk[i % 2], seed: 20 + i, label: i % 2 ? 6 : 9 });
        chair(kit, placer(kit, CX + dx + (i % 2 ? 0.2 : -0.2), FLOOR, zc + 1.05, 0));
      });
    }
    // NW corner: two equipment columns; NE corner: emergency cabinet, intercom, junction, vent
    dataColumn(kit, wallAnchor(kit, "n", IN, IN.min[0] + 0.55, FLOOR), { ceilY: CY - FLOOR, seed: 1, screenMat: M, screenRect: cells.desk[1] });
    dataColumn(kit, wallAnchor(kit, "n", IN, IN.min[0] + 1.5, FLOOR), { ceilY: CY - FLOOR, seed: 2 });
    emergencyCabinet(kit, wallAnchor(kit, "n", IN, IN.max[0] - 0.5, FLOOR + 1.25));
    intercom(kit, wallAnchor(kit, "n", IN, IN.max[0] - 1.15, FLOOR + 1.45));
    junctionBox(kit, wallAnchor(kit, "n", IN, IN.max[0] - 1.9, FLOOR + 1.6), { up: 0.3, down: 1.1, seed: 1 });
    vent(kit, wallAnchor(kit, "n", IN, IN.max[0] - 1.2, FLOOR + 3.3), { w: 1.2, h: 0.36 });
    stencilPlate(kit, wallAnchor(kit, "n", IN, IN.max[0] - 0.5, FLOOR + 2.7), 0.3, 14);

    // ---- west wall: three plotting stations facing the wall, overhead readout bars, greebles, lockers
    {
      const xc = IN.min[0] + WALL_OFF + 0.57;
      [472.8, 476.4, 480.0].forEach((z, i) => {
        station(kit, placer(kit, xc, FLOOR, z, 1), { w: 2.4, screenMat: M, screenRect: cells.con[(i + 1) % 3], deskMat: M, deskRect: cells.desk[i % 2], seed: 30 + i, label: 6 });
        chair(kit, placer(kit, xc + 1.05, FLOOR, z + (i % 2 ? -0.15 : 0.15), 1));
        readoutBar(kit, wallAnchor(kit, "w", IN, z, FLOOR + 2.55), { w: 2.4, mat: M, uvRect: cells.rb[i % 2] });
      });
      for (const z of [474.6, 478.2]) junctionBox(kit, wallAnchor(kit, "w", IN, z, FLOOR + 1.55), { up: 0.35, down: 1.05, seed: Math.round(z) });
      conduitBundle(kit, wallAnchor(kit, "w", IN, 482.2, FLOOR), { y0: 1.15, y1: 3.75 });
      locker(kit, wallAnchor(kit, "w", IN, 483.3, FLOOR), { seed: 1, label: 6 });
      locker(kit, wallAnchor(kit, "w", IN, 484.2, FLOOR), { seed: 2, label: 9 });
      vent(kit, wallAnchor(kit, "w", IN, 483.75, FLOOR + 3.3), { w: 1.4, h: 0.36 });
      intercom(kit, wallAnchor(kit, "w", IN, 485.1, FLOOR + 1.5));
      // NW: keep the corner clear at eye level (harness view), dress it above 2.4 m and at the skirting
      wallPipe(kit, wallAnchor(kit, "w", IN, 469.9, FLOOR + 3.55), { len: 3.0, r: 0.035 });
      wallPipe(kit, wallAnchor(kit, "w", IN, 469.9, FLOOR + 3.35), { len: 3.0, r: 0.022, color: IMP.dark });
      stencilPlate(kit, wallAnchor(kit, "w", IN, 469.2, FLOOR + 1.6), 0.28, 2);
    }

    // ---- east wall: door (reveal only, D builds the assembly), two stations north of it, lockers + board south
    {
      const xc = IN.max[0] - WALL_OFF - 0.57;
      [470.2, 473.2].forEach((z, i) => {
        station(kit, placer(kit, xc, FLOOR, z, 3), { w: 2.4, screenMat: M, screenRect: cells.con[(i + 2) % 3], deskMat: M, deskRect: cells.desk[(i + 1) % 2], seed: 40 + i, label: 9 });
        chair(kit, placer(kit, xc - 1.05, FLOOR, z + (i ? 0.12 : -0.12), 3));
        readoutBar(kit, wallAnchor(kit, "e", IN, z, FLOOR + 2.55), { w: 2.4, mat: M, uvRect: cells.rb[(i + 1) % 2] });
      });
      junctionBox(kit, wallAnchor(kit, "e", IN, 471.7, FLOOR + 1.55), { up: 0.35, down: 1.05, seed: 5 });
      intercom(kit, wallAnchor(kit, "e", IN, 479.0, FLOOR + 1.35));
      stencilPlate(kit, wallAnchor(kit, "e", IN, 479.0, FLOOR + 1.9), 0.3, 14);
      locker(kit, wallAnchor(kit, "e", IN, 480.0, FLOOR), { seed: 3, label: 6 });
      locker(kit, wallAnchor(kit, "e", IN, 480.9, FLOOR), { seed: 4, label: 9 });
      junctionBox(kit, wallAnchor(kit, "e", IN, 480.45, FLOOR + 3.05), { w: 0.5, h: 0.3, up: 0.6, seed: 6, decal: null });
      framedScreen(kit, wallAnchor(kit, "e", IN, 483.0, FLOOR + 2.15), { w: 2.4, h: 1.0, mat: M, uvRect: cells.board, bezel: 0.08, deep: 0.12 });
      vent(kit, wallAnchor(kit, "e", IN, 483.0, FLOOR + 3.3), { w: 1.2, h: 0.32 });
      emergencyCabinet(kit, wallAnchor(kit, "e", IN, 485.2, FLOOR + 1.3));
      floorHatch(kit, IN.max[0] - 1.4, FLOOR, 483.0);
    }

    // ---- south: navigator's raised dais with steps, rails, desk; wall screens and gauges behind it
    {
      const dx0 = -37.6;
      const dx1 = -30.0;
      const dz0 = 482.9;
      // lighter deck plate than the main floor so the platform reads under the ceiling pool
      stepBlock(kit, [dx0, FLOOR, dz0], [dx1, FLOOR + 0.3, IN.max[2]], { edges: ["n", "e", "w"], hazardRiser: true, glow: "emitBlue", color: IMP.mid, tag: "dais" });
      // centre steps at the end of the floor inlay from the table; rails either side and along the flanks
      stairs(kit, { x0: CX - 0.8, x1: CX + 0.8, z0: 482.0, z1: dz0, yTop: FLOOR + 0.3, yBottom: FLOOR, dir: "-z", color: IMP.mid });
      railing(kit, [dx0, dz0], [CX - 0.9, dz0], FLOOR + 0.3);
      railing(kit, [CX + 0.9, dz0], [dx1, dz0], FLOOR + 0.3);
      railing(kit, [dx1, dz0], [dx1, IN.max[2] - 0.3], FLOOR + 0.3);
      railing(kit, [dx0, dz0], [dx0, IN.max[2] - 0.3], FLOOR + 0.3);
      station(kit, placer(kit, CX, FLOOR + 0.3, 484.0, 0), { w: 3.0, screenMat: M, screenRect: cells.navdesk, deskMat: M, deskRect: cells.desk[0], seed: 50, label: 9 });
      chair(kit, placer(kit, CX, FLOOR + 0.3, 485.05, 0));
      framedScreen(kit, wallAnchor(kit, "s", IN, CX - 2.4, FLOOR + 2.55), { w: 2.0, h: 1.2, mat: M, uvRect: cells.wall[0] });
      framedScreen(kit, wallAnchor(kit, "s", IN, CX + 2.4, FLOOR + 2.55), { w: 2.0, h: 1.2, mat: M, uvRect: cells.wall[1] });
      for (let i = 0; i < 3; i++) framedScreen(kit, wallAnchor(kit, "s", IN, CX - 0.6 + i * 0.6, FLOOR + 2.75), { w: 0.46, h: 0.46, mat: M, uvRect: cells.gauge[i], bezel: 0.05, deep: 0.08, leds: false });
      stencilPlate(kit, wallAnchor(kit, "s", IN, CX, FLOOR + 3.55), 0.3, 7);
      // west of the dais: equipment column, big vent, junction, pipe runs
      dataColumn(kit, wallAnchor(kit, "s", IN, -42.6, FLOOR), { ceilY: CY - FLOOR, seed: 3, screenMat: M, screenRect: cells.desk[0] });
      vent(kit, wallAnchor(kit, "s", IN, -40.6, FLOOR + 1.35), { w: 1.3, h: 0.44 });
      junctionBox(kit, wallAnchor(kit, "s", IN, -39.1, FLOOR + 1.6), { up: 0.3, down: 1.1, seed: 7 });
      wallPipe(kit, wallAnchor(kit, "s", IN, -40.5, FLOOR + 3.05), { len: 5.4, r: 0.04 });
      wallPipe(kit, wallAnchor(kit, "s", IN, -40.5, FLOOR + 3.3), { len: 5.4, r: 0.025, color: IMP.dark });
      stencilPlate(kit, wallAnchor(kit, "s", IN, -41.8, FLOOR + 2.4), 0.3, 5);
      // east of the dais: lockers, low chart cabinet, junction, vent, pipes
      locker(kit, wallAnchor(kit, "s", IN, -29.1, FLOOR), { seed: 5, label: 6 });
      locker(kit, wallAnchor(kit, "s", IN, -28.2, FLOOR), { seed: 6, label: 9 });
      {
        const p = wallAnchor(kit, "s", IN, -26.2, FLOOR);
        p.box("paintedMetal", 0, 0.5, WALL_OFF + 0.3, 1.4, 1.0, 0.6, { color: IMP.dark, texel: 1 });
        p.box("metal", 0, 1.015, WALL_OFF + 0.3, 1.44, 0.03, 0.64, { color: IMP.mid, texel: 2 });
        for (let k = 0; k < 3; k++) {
          p.box("paintedMetal", 0, 0.2 + k * 0.28, WALL_OFF + 0.605, 1.3, 0.24, 0.01, { color: IMP.black, texel: 1 });
          p.box("metal", 0, 0.2 + k * 0.28, WALL_OFF + 0.62, 0.3, 0.03, 0.02, { color: IMP.steel, texel: 2 });
        }
        p.decal(0.5, 0.76, WALL_OFF + 0.612, 0.18, 9);
        p.collider(-0.72, 0.72, 0, 1.05, 0, WALL_OFF + 0.65, "cabinet");
      }
      junctionBox(kit, wallAnchor(kit, "s", IN, -28.65, FLOOR + 3.0), { w: 0.5, h: 0.3, up: 0.65, seed: 8, decal: null });
      vent(kit, wallAnchor(kit, "s", IN, -25.6, FLOOR + 3.3), { w: 1.2, h: 0.32 });
      wallPipe(kit, wallAnchor(kit, "s", IN, -26.6, FLOOR + 2.3), { len: 5.6, r: 0.03 });
      intercom(kit, wallAnchor(kit, "s", IN, -24.6, FLOOR + 1.5));
    }

    // ---- lights (13 descriptors: 10 point + 3 spot; corridor keeps 2 point + 1 spot pool slots)
    // downlight points sit 0.8 m under their housings so the dark ceiling panels around them pick up light too
    ctx.lights.push({ type: "point", pos: [CX, FLOOR + 2.85, CZ], color: 0x4fd8ff, intensity: 9, distance: 9, priority: 0.9 });
    ctx.lights.push({ type: "spot", pos: [CX, CY - 0.85, CZ], color: LIGHT.coolWhite, intensity: 10, distance: 8, target: [CX, top, CZ], angle: 0.8, penumbra: 0.4, priority: 0.85 });
    for (const x of [CX - 8.2, CX + 8.2]) for (const z of [471.0, CZ, 483.0]) ctx.lights.push({ type: "point", pos: [x, CY - 0.8, z], color: LIGHT.coolWhite, intensity: 14, distance: 12, priority: 0.5 });
    ctx.lights.push({ type: "spot", pos: [CX, CY - 0.7, 471.0], color: 0xbfd4ff, intensity: 12, distance: 8, target: [CX, FLOOR + 1.5, IN.min[2]], angle: 1.05, penumbra: 0.6, priority: 0.6 });
    // navigator's dais: narrow white pool straight down onto the desk plus a wider fill over the platform / wall screens
    // (pool surfaces are dark: mid-grey deck plate + black desk, so this spot runs hotter than the downlights)
    ctx.lights.push({ type: "spot", pos: [CX, CY - 0.5, 484.0], color: LIGHT.coolWhite, intensity: 30, distance: 7, target: [CX, FLOOR + 1.2, 484.1], angle: 0.62, penumbra: 0.45, priority: 0.62 });
    ctx.lights.push({ type: "point", pos: [CX, CY - 0.9, 483.4], color: LIGHT.coolWhite, intensity: 12, distance: 7, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [IN.max[0] - 1.3, CY - 0.8, CZ], color: LIGHT.coolWhite, intensity: 7, distance: 6, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [CX, FLOOR + 0.35, CZ], color: LIGHT.blue, intensity: 1.5, distance: 4.5, priority: 0.3 });

    return {
      update(dt, t) {
        atlas.update(t);
        tickHolo(holoObjects, t);
      },
    };
  },
};
export default manifest;
