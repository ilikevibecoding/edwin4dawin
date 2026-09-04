// d1-nav — secondary navigation (Phase 2 detail, critic round 1): a working star-chart table instrument with a
// clustered point-cloud hologram and a three-jump route, an animated chart wall, plotting stations with overhead
// readouts, the navigator's raised dais with a tilted chart desk, cable trays on the walls and ceiling,
// recessed louvred light troughs, wall greebles and painted floor inlays.
// Contract (COORDINATION.md §7): id/kind/deck/owner/bounds/doors/lift/spawn/apertures unchanged from Phase 1.
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, doorReveal, stairs } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { ScreenAtlas, UI, paintStarMap, paintStatusColumn, paintConsole, paintReadoutBar, paintGauge, paintStack, paintRoutePlot } from "./ui.js";
import { placer, wallAnchor, station, chair, stool, locker, chartChest, mapTubeRack, equipmentRack, dataColumn, junctionBox, vent, intercom, emergencyCabinet, framedScreen, readoutBar, conduitBundle, wallPipe, wallTray, stencilPlate, beam, ceilingPanels, lightTrough, lightCanopy, uplightChannel, ceilingRibs, cableTray, downlight, ceilingVent, projectorRig, floorInlay, floorHatch, stepBlock, WALL_OFF } from "./props.js";
import { buildChartTable, buildChartHolo, buildChartDesk } from "./table.js";
import { tickHolo } from "./holo.js";

const ID = "d1-nav";
const B = BOUNDS[ID];
const CY = CEIL[ID];
const IN = { min: [B.min[0] + 0.3, FLOOR, B.min[2] + 0.3], max: [B.max[0] - 0.3, CY, B.max[2] - 0.3] };
const CX = (B.min[0] + B.max[0]) / 2; // -33.8
const CZ = (B.min[2] + B.max[2]) / 2; // 477
const TY = FLOOR + 3.2; // wall cable-tray underside
const DLX = [CX - 6.4, CX + 6.4]; // downlight rows (3.5 m off the side walls: no hot specular blobs on the panels)
const DLZ = [472.6, CZ, 481.4];
// dais light canopy footprint (hung 0.5 m under the ceiling over the raised dais, open on the wall side)
const CAN = { x0: -37.9, x1: -29.7, z0: 482.9, z1: B.max[2] - 0.3, depth: 0.5 };
// indirect (soffit-wash) channel under the canopy: z of its centre line, x of its three sources
const UPL = { z: 483.2, xs: [CX - 2.9, CX, CX + 2.9] };

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

    // ---- atlas regions (canvas px, top-down) → uv rects; non-overlapping columns x 0..352 / 352..768 / 768..1024
    const cells = {
      map: atlas.region(0, 0, 1024, 380, paintStarMap(1201)),
      colA: atlas.region(0, 380, 140, 300, paintStatusColumn(1301, { title: "LANE STATUS" })),
      colB: atlas.region(140, 380, 140, 300, paintStatusColumn(1302, { title: "GRAV SHADOW", accent: UI.amber })),
      wall: [atlas.region(352, 716, 300, 180, paintRoutePlot(1951, { title: "JUMP SOLUTION  ·  LANE 7" })), atlas.region(0, 684, 300, 180, paintConsole(2002, { title: "BEACON NET", accent: UI.amber }))],
      deskDisp: atlas.region(0, 868, 300, 150, paintRoutePlot(1952, { title: "CHART DESK  ·  PLOTTED LEGS" })),
      con: [0, 1, 2].map((i) => atlas.region(352, 380 + i * 64, 416, 64, paintConsole(1401 + i, { title: "PLOT STN" }))),
      rb: [0, 1].map((i) => atlas.region(352, 572 + i * 48, 416, 48, paintReadoutBar(1501 + i, { accent: i ? UI.cyan : UI.amber }))),
      rb2: atlas.region(352, 668, 416, 48, paintReadoutBar(1901, { accent: UI.cyan, labels: ["LANE", "LEG", "ETA", "DEV", "MASS", "GRAV", "SYNC", "BCN"] })),
      board: atlas.region(352, 900, 280, 116, paintStatusColumn(2101, { title: "HYPERLANE 7 · READY", accent: UI.cyan })),
      desk: [0, 1].map((i) => atlas.region(768, 380 + i * 112, 176, 112, paintGauge(1601 + i, { label: i ? "ALIGN" : "DRIVE" }))),
      gauge: [0, 1, 2].map((i) => atlas.region(768 + (i % 2) * 112, 604 + Math.floor(i / 2) * 112, 112, 112, paintGauge(1701 + i, { label: ["MASS", "SYNC", "REF"][i], accent: [UI.cyan, UI.amber, UI.blue][i] }))),
      stack: atlas.region(880, 716, 80, 300, paintStack(1801, { title: "LINK" })),
    };
    atlas.paint(ctx.time());
    const M = "navAtlas";

    // ---- shell: light-grey panels with the recessed blue strip; own ceiling — clean dark panels with two
    //      recessed louvred light troughs (segmented emitCoolSoft diffusers 15 cm up behind the blades)
    roomShell(kit, manifest, { floorY: FLOOR, ceilY: CY, seed: 61, panelW: 2.4, strip: "emitBlue", ceiling: null });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);
    const TR = [CX - 5, CX + 5];
    ceilingPanels(kit, B, CY, { axis: "z", inset: 0.25, gaps: TR.map((x) => ({ at: x, w: 0.5 })) });
    for (const x of TR) lightTrough(kit, "z", x, B.min[2] + 0.25, B.max[2] - 0.25, CY + 0.2, { w: 0.5, depth: 0.2 });

    // ---- star-chart table + hologram
    const { top } = buildChartTable(kit, M, cells, CX, FLOOR, CZ, { seed: 3 });
    const holo = buildChartHolo(CX, top, CZ, { seed: 7, spin: 0.05 });
    ctx.group.add(holo.stars, holo.lines);
    holoObjects.push(holo.stars, holo.lines);

    // ---- floor inlays (black plate, painted light-grey lines): door → table, table → chart wall, table → dais
    floorInlay(kit, [-31.15, FLOOR, CZ - 0.7], [IN.max[0] - 0.1, FLOOR, CZ + 0.7]);
    floorInlay(kit, [CX - 0.55, FLOOR, 470.4], [CX + 0.55, FLOOR, CZ - 2.95]);
    floorInlay(kit, [CX - 0.55, FLOOR, CZ + 2.95], [CX + 0.55, FLOOR, 481.9]);

    // ---- ceiling: cross beams, projector rig, cable trays, bezelled downlights, ribs both ways, vents
    beam(kit, [IN.min[0], CY - 0.32, 472.0], [IN.max[0], CY, 472.35]);
    beam(kit, [IN.min[0], CY - 0.32, 481.65], [IN.max[0], CY, 482.0]);
    projectorRig(kit, CX, CY - 0.62, CZ, { shape: "octagon", rx: 1.65, ceilY: CY, emit: "emitBlue" });
    cableTray(kit, [CX, CZ - 1.55], [CX, 472.4], CY - 0.2, { w: 0.36, hangTo: CY });
    cableTray(kit, [CX, 471.95], [CX, IN.min[2] + 0.35], CY - 0.2, { w: 0.36, hangTo: CY });
    cableTray(kit, [CX + 0.18, 475.0], [IN.max[0] - 0.35, 475.0], CY - 0.2, { w: 0.3, hangTo: CY, cables: 2 });
    for (const x of DLX) for (const z of DLZ) downlight(kit, x, CY, z);
    downlight(kit, CX + 0.8, CY, 470.9); // the console-bank pool's source (beside the ceiling tray)
    // dais canopy: hung fascia box over the dais footprint with three louvred light channels across it (the
    // dais key/wash spot sits inside the room-side channel). Under its soffit, an indirect light channel runs
    // the canopy's width just behind the fascia (three low sources inside it wash the soffit, so the canopy's
    // underside reads as a lit surface from the room), and two cable trays branch off it over the wall screens
    // to the south wall tray.
    lightCanopy(kit, [CAN.x0, CAN.z0], [CAN.x1, CAN.z1], CY, { depth: CAN.depth, channels: 3 });
    {
      const soffitY = CY - CAN.depth;
      const chY = soffitY - 0.61; // channel bottom (its top rim 0.1 m higher sits just under the wall tray level)
      uplightChannel(kit, CAN.x0 + 0.3, CAN.x1 - 0.3, UPL.z, chY, soffitY, { w: 0.3, hangers: [CX - 3.45, CX - 1.45, CX + 1.45, CX + 3.45] });
      for (const x of [CX - 2.4, CX + 2.4]) cableTray(kit, [x, UPL.z + 0.17], [x, IN.max[2] - 0.42], chY, { w: 0.3, hangTo: soffitY, cables: 2 });
    }
    ceilingRibs(kit, [CX - 7.5, CX + 7.5], IN.min[2] + 0.3, IN.max[2] - 0.3, CY);
    ceilingRibs(kit, [CX - 2.5, CX + 2.5], IN.min[2] + 0.3, CAN.z0 - 0.1, CY);
    for (const [x0, x1] of [
      [IN.min[0] + 0.3, CX - 5.3],
      [CX - 4.7, CX + 4.7],
      [CX + 5.3, IN.max[0] - 0.3],
    ])
      ceilingRibs(kit, [474.7, 479.3], x0, x1, CY, { axis: "x" });
    ceilingVent(kit, CX + 3.2, CY, 470.0);
    ceilingVent(kit, CX - 5.6, CY, 484.6);
    // ceiling tray → east wall tray: short conduit bundle down the wall (clear of the door opening)
    conduitBundle(kit, wallAnchor(kit, "e", IN, 475.0, FLOOR), { y0: 3.32, y1: CY - FLOOR - 0.12, pipes: [[-0.06, 0.025], [0.06, 0.025]] });

    // ---- wall cable trays at 3.2 m (0.4 m channels on brackets) around the west, south and east walls plus the
    //      north-wall corners; conduit drops feed the displays, junctions, lockers and the rack below
    wallTray(kit, "n", IN, IN.min[0] + 0.05, CX - 6.75, TY);
    wallTray(kit, "n", IN, CX + 6.75, IN.max[0] - 0.05, TY, { drops: [{ a: IN.max[0] - 1.9, y1: FLOOR + 1.81 }] });
    wallTray(kit, "w", IN, IN.min[2] + 0.45, IN.max[2] - 0.45, TY, {
      skip: [[479.5, 480.5]],
      drops: [
        { a: 472.8, y1: FLOOR + 2.75 },
        { a: 474.6, y1: FLOOR + 1.76 },
        { a: 478.2, y1: FLOOR + 1.76 },
        { a: 483.75, y1: FLOOR + 2.42 },
      ],
    });
    wallTray(kit, "e", IN, IN.min[2] + 0.45, IN.max[2] - 0.45, TY, {
      skip: [[475.6, 478.4]],
      drops: [
        { a: 470.2, y1: FLOOR + 2.75 },
        { a: 471.7, y1: FLOOR + 1.76 },
        { a: 483.0, y1: FLOOR + 2.74 },
      ],
    });
    wallTray(kit, "s", IN, IN.min[0] + 0.45, IN.max[0] - 0.45, TY, {
      drops: [
        { a: -39.1, y1: FLOOR + 1.81 },
        { a: -29.05, y1: FLOOR + 2.24 },
        { a: -26.2, y1: FLOOR + 1.06 },
      ],
    });

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
    // NW corner: two equipment columns (conduits end in the wall tray); NE corner: emergency cabinet, intercom,
    // junction fed from the tray, vent up in the ceiling band
    dataColumn(kit, wallAnchor(kit, "n", IN, IN.min[0] + 0.55, FLOOR), { ceilY: 3.2, seed: 1, screenMat: M, screenRect: cells.desk[1] });
    dataColumn(kit, wallAnchor(kit, "n", IN, IN.min[0] + 1.5, FLOOR), { ceilY: 3.2, seed: 2 });
    emergencyCabinet(kit, wallAnchor(kit, "n", IN, IN.max[0] - 0.5, FLOOR + 1.25));
    intercom(kit, wallAnchor(kit, "n", IN, IN.max[0] - 1.15, FLOOR + 1.45));
    junctionBox(kit, wallAnchor(kit, "n", IN, IN.max[0] - 1.9, FLOOR + 1.6), { down: 1.1, seed: 1 });
    vent(kit, wallAnchor(kit, "n", IN, IN.max[0] - 1.2, FLOOR + 3.75), { w: 1.2, h: 0.36 });
    stencilPlate(kit, wallAnchor(kit, "n", IN, IN.max[0] - 0.5, FLOOR + 2.7), 0.3, 14);

    // ---- west wall: three plotting stations facing the wall under a standard bar, a double-width bar and a
    //      vertical link column; junctions fed from the tray, equipment rack with cabling in the SW corner
    {
      const xc = IN.min[0] + WALL_OFF + 0.57;
      [472.8, 476.4, 480.0].forEach((z, i) => {
        station(kit, placer(kit, xc, FLOOR, z, 1), { w: 2.4, screenMat: M, screenRect: cells.con[(i + 1) % 3], deskMat: M, deskRect: cells.desk[i % 2], seed: 30 + i, label: 6 });
        chair(kit, placer(kit, xc + 1.05, FLOOR, z + (i % 2 ? -0.15 : 0.15), 1));
      });
      readoutBar(kit, wallAnchor(kit, "w", IN, 472.8, FLOOR + 2.55), { w: 2.4, mat: M, uvRect: cells.rb[0] });
      readoutBar(kit, wallAnchor(kit, "w", IN, 476.4, FLOOR + 2.55), { w: 3.4, mat: M, uvRect: cells.rb[1], uvRect2: cells.rb2, caps: "emitBlue" });
      framedScreen(kit, wallAnchor(kit, "w", IN, 480.0, FLOOR + 2.35), { w: 0.5, h: 1.4, mat: M, uvRect: cells.stack, bezel: 0.06, deep: 0.1, leds: false });
      for (const z of [474.6, 478.2]) junctionBox(kit, wallAnchor(kit, "w", IN, z, FLOOR + 1.55), { down: 1.05, seed: Math.round(z) });
      conduitBundle(kit, wallAnchor(kit, "w", IN, 482.2, FLOOR), { y0: 1.15, y1: 3.18 });
      equipmentRack(kit, wallAnchor(kit, "w", IN, 483.75, FLOOR), { w: 1.6, h: 2.0, seed: 4, screenMat: M, screenRect: cells.desk[1] });
      vent(kit, wallAnchor(kit, "w", IN, 483.75, FLOOR + 3.75), { w: 1.4, h: 0.36 });
      intercom(kit, wallAnchor(kit, "w", IN, 485.1, FLOOR + 1.5));
      // NW: keep the corner clear at eye level (harness view), dress it above the tray and at the skirting
      wallPipe(kit, wallAnchor(kit, "w", IN, 469.9, FLOOR + 3.8), { len: 3.0, r: 0.035 });
      wallPipe(kit, wallAnchor(kit, "w", IN, 469.9, FLOOR + 3.6), { len: 3.0, r: 0.022, color: IMP.dark });
      stencilPlate(kit, wallAnchor(kit, "w", IN, 469.2, FLOOR + 1.6), 0.28, 2);
    }

    // ---- east wall: door (reveal only, D builds the assembly), two stations north of it, a narrow and a wide
    //      locker (the wide one open, showing its shelves) + board south of it
    {
      const xc = IN.max[0] - WALL_OFF - 0.57;
      [470.2, 473.2].forEach((z, i) => {
        station(kit, placer(kit, xc, FLOOR, z, 3), { w: 2.4, screenMat: M, screenRect: cells.con[(i + 2) % 3], deskMat: M, deskRect: cells.desk[(i + 1) % 2], seed: 40 + i, label: 9 });
        chair(kit, placer(kit, xc - 1.05, FLOOR, z + (i ? 0.12 : -0.12), 3));
        readoutBar(kit, wallAnchor(kit, "e", IN, z, FLOOR + 2.55), { w: 2.4, mat: M, uvRect: cells.rb[(i + 1) % 2] });
      });
      junctionBox(kit, wallAnchor(kit, "e", IN, 471.7, FLOOR + 1.55), { down: 1.05, seed: 5 });
      intercom(kit, wallAnchor(kit, "e", IN, 479.0, FLOOR + 1.35));
      stencilPlate(kit, wallAnchor(kit, "e", IN, 479.0, FLOOR + 1.9), 0.3, 14);
      locker(kit, wallAnchor(kit, "e", IN, 479.9, FLOOR), { w: 0.6, seed: 3, label: 6 });
      locker(kit, wallAnchor(kit, "e", IN, 480.75, FLOOR), { w: 0.9, seed: 4, label: 9, open: true });
      junctionBox(kit, wallAnchor(kit, "e", IN, 480.35, FLOOR + 2.85), { w: 0.5, h: 0.3, up: 0.2, seed: 6, decal: null });
      framedScreen(kit, wallAnchor(kit, "e", IN, 483.0, FLOOR + 2.15), { w: 2.4, h: 1.0, mat: M, uvRect: cells.board, bezel: 0.08, deep: 0.12 });
      vent(kit, wallAnchor(kit, "e", IN, 483.0, FLOOR + 3.75), { w: 1.2, h: 0.32 });
      emergencyCabinet(kit, wallAnchor(kit, "e", IN, 485.2, FLOOR + 1.3));
      floorHatch(kit, IN.max[0] - 1.4, FLOOR, 483.0);
    }

    // ---- south: navigator's raised dais (a 0.3 m plate: mid-grey, steel nosing, blue edge glow, hazard riser)
    //      with a centre step — no guard rail: a 0.3 m platform does not warrant one, and a rail box around the
    //      desk read as a fence. The step tread carries blue step-light strips under both nosings. The tilted
    //      chart desk stands against the wall with two stools, route plot + beacon screen and gauges above it.
    {
      const dx0 = -37.6;
      const dx1 = -30.0;
      const dz0 = 482.9;
      stepBlock(kit, [dx0, FLOOR, dz0], [dx1, FLOOR + 0.3, IN.max[2]], { edges: ["n", "e", "w"], hazardRiser: true, glow: "emitBlue", color: IMP.mid, tag: "dais" });
      stairs(kit, { x0: CX - 0.8, x1: CX + 0.8, z0: 482.0, z1: dz0, yTop: FLOOR + 0.3, yBottom: FLOOR, dir: "-z", color: IMP.mid });
      // step lights: a strip on the intermediate step's riser (z 482.45, 0.15 m tread) and one on the dais riser
      // above the step, both just under the nosing; steel edge trims either side of the step
      kit.boxMM("emitBlue", [CX - 0.72, FLOOR + 0.105, 482.444], [CX + 0.72, FLOOR + 0.125, 482.45]);
      kit.boxMM("emitBlue", [CX - 0.72, FLOOR + 0.255, dz0 - 0.006], [CX + 0.72, FLOOR + 0.275, dz0]);
      for (const s of [-1, 1]) kit.boxMM("metal", [CX + s * 0.8 - 0.02, FLOOR, 482.0], [CX + s * 0.8 + 0.02, FLOOR + 0.16, dz0], { color: IMP.steel, texel: 2 });
      // chart desk: 2 × 1 m display tilted toward the navigators (who sit on the room side, facing the wall screens)
      buildChartDesk(kit, placer(kit, CX, FLOOR + 0.3, 485.0, 2), M, cells.deskDisp, { w: 2.6, d: 1.4, seed: 50 });
      for (const s of [-1, 1]) stool(kit, placer(kit, CX + s * 0.7, FLOOR + 0.3, 483.95, 0));
      framedScreen(kit, wallAnchor(kit, "s", IN, CX - 2.4, FLOOR + 2.45), { w: 2.0, h: 1.2, mat: M, uvRect: cells.wall[0] });
      framedScreen(kit, wallAnchor(kit, "s", IN, CX + 2.4, FLOOR + 2.45), { w: 2.0, h: 1.2, mat: M, uvRect: cells.wall[1] });
      for (let i = 0; i < 3; i++) framedScreen(kit, wallAnchor(kit, "s", IN, CX - 0.6 + i * 0.6, FLOOR + 2.75), { w: 0.46, h: 0.46, mat: M, uvRect: cells.gauge[i], bezel: 0.05, deep: 0.08, leds: false });
      stencilPlate(kit, wallAnchor(kit, "s", IN, CX, FLOOR + 3.6), 0.3, 7);
      // west of the dais: equipment column, big vent, junction fed from the tray, pipe runs above the tray
      dataColumn(kit, wallAnchor(kit, "s", IN, -42.6, FLOOR), { ceilY: 3.2, seed: 3, screenMat: M, screenRect: cells.desk[0] });
      vent(kit, wallAnchor(kit, "s", IN, -40.6, FLOOR + 1.35), { w: 1.3, h: 0.44 });
      junctionBox(kit, wallAnchor(kit, "s", IN, -39.1, FLOOR + 1.6), { down: 1.1, seed: 7 });
      wallPipe(kit, wallAnchor(kit, "s", IN, -40.5, FLOOR + 3.6), { len: 5.4, r: 0.04 });
      wallPipe(kit, wallAnchor(kit, "s", IN, -40.5, FLOOR + 3.85), { len: 5.4, r: 0.025, color: IMP.dark });
      stencilPlate(kit, wallAnchor(kit, "s", IN, -41.8, FLOOR + 2.4), 0.3, 5);
      // east of the dais: chart-drawer chest + map-tube rack (nav-specific storage instead of the stock locker
      // bank), low chart cabinet, junction, vent, pipe
      chartChest(kit, wallAnchor(kit, "s", IN, -29.2, FLOOR), { w: 1.3, h: 1.45, seed: 5, pulled: 2 });
      mapTubeRack(kit, wallAnchor(kit, "s", IN, -28.1, FLOOR), { w: 0.7, h: 2.0, seed: 6 });
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
      junctionBox(kit, wallAnchor(kit, "s", IN, -28.65, FLOOR + 2.85), { w: 0.5, h: 0.3, up: 0.2, seed: 8, decal: null });
      vent(kit, wallAnchor(kit, "s", IN, -25.6, FLOOR + 3.75), { w: 1.2, h: 0.32 });
      wallPipe(kit, wallAnchor(kit, "s", IN, -26.6, FLOOR + 2.6), { len: 5.6, r: 0.03 });
      intercom(kit, wallAnchor(kit, "s", IN, -24.6, FLOOR + 1.5));
    }

    // ---- lights (14 descriptors: 11 point + 3 spot; corridor keeps 1 point + 1 spot pool slots)
    // Downlight points sit 1.0 m under their housings, 3.5 m off the side walls and ≥ 4.3 m off the end walls,
    // so they pool on the floor (and softly on the matte ceiling) instead of throwing hot specular blobs onto
    // the glossy wall panels; the end walls get down-aimed spots whose cones cut off before the panel band a
    // floor camera mirrors.
    ctx.lights.push({ type: "point", pos: [CX, FLOOR + 2.85, CZ], color: 0x4fd8ff, intensity: 9, distance: 9, priority: 0.9 });
    ctx.lights.push({ type: "spot", pos: [CX, CY - 0.85, CZ], color: LIGHT.coolWhite, intensity: 10, distance: 8, target: [CX, top, CZ], angle: 0.8, penumbra: 0.4, priority: 0.85 });
    for (const x of DLX) for (const z of [472.6, 481.4]) ctx.lights.push({ type: "point", pos: [x, CY - 1.0, z], color: LIGHT.coolWhite, intensity: 11, distance: 11, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [DLX[0], CY - 1.0, CZ], color: LIGHT.coolWhite, intensity: 10, distance: 10, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [DLX[1], CY - 1.0, CZ], color: LIGHT.coolWhite, intensity: 9, distance: 10, priority: 0.45 });
    // chart-wall console bank: down-aimed pool over the four stations
    ctx.lights.push({ type: "spot", pos: [CX + 0.8, CY - 0.5, 470.9], color: 0xbfd4ff, intensity: 15, distance: 8, target: [CX, FLOOR, 470.4], angle: 1.05, penumbra: 0.5, priority: 0.6 });
    // navigator's dais: one spot inside the canopy's room-side light channel (a closed dark trough; the cone
    // points down and away, so nothing of the fixture is inside it), aimed at the foot of the chart desk. From
    // the room side it keys the desk's light-grey face and display (the desk reads as a lit instrument instead
    // of a silhouette), pools on the dais plate and stools, and washes the south wall to ≈ 3.6 m; the panel
    // band a floor camera mirrors (≈ 4.1 m, under the canopy) is outside the cone.
    {
      const zc = CAN.z0 + 0.08 + (CAN.z1 - CAN.z0 - 0.08) / 6;
      ctx.lights.push({ type: "spot", pos: [CX, CY - CAN.depth + 0.1, zc], color: LIGHT.coolWhite, intensity: 14, distance: 7.5, target: [CX, FLOOR + 0.6, 485.2], angle: 0.8, penumbra: 0.5, priority: 0.62 });
    }
    // canopy soffit wash: three low sources inside the indirect channel 0.55 m under the soffit (E ≈ 3.3 on the
    // light-grey impPanel soffit above each, ≈ 0.3 midway) — the canopy's underside reads as a lit surface; the
    // channel is a convex dark housing, the spot above sits outside its own cone's reach of the channel
    for (const x of UPL.xs) ctx.lights.push({ type: "point", pos: [x, CY - CAN.depth - 0.55, UPL.z], color: LIGHT.coolWhite, intensity: 1.0, distance: 4, priority: 0.4 });
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
