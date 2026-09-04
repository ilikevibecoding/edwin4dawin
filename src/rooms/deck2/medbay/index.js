// Deck 2 medbay: reception behind a curved counter, an eight-bed ward in two facing rows of bays
// (west wall / low spine), a glass-walled surgical bay in the far port corner, three bacta-style
// treatment tanks along the starboard wall, a pharmacy behind a counter in the far starboard corner.
// White panels, cool blue light, green vitals (§11). Door: aft wall at x −48 (standard).
import * as THREE from "three";
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { rail } from "../_shared/shell.js";
import { console as consoleProp, chair, wallScreen, cabinet, pipe, floorLine, dropLight } from "../_shared/props.js";
import { rod, vitalsBoard, vent, junctionBox, medBed, bayDivider, bactaTank, shelfUnit, arcCounter, counter, glassWall, operatingTable, surgeryLight, gurney, equipmentCart, ivStand, scrubBasin, bench, curtain, scanner, deskTerminal, datapad, hazardBand, supplyDolly } from "./props.js";

const Y = 40;
const CEIL = 45;
const X0 = -60;
const X1 = -36;
const Z0 = 340;
const Z1 = 372.5;
const W = 0.34; // wall face + kick clearance
const wx0 = X0 + W;
const wx1 = X1 - W;
const wz0 = Z0 + W;
const wz1 = Z1 - W;
const WHITE = IMP.medWhite;
const BLUE = IMP.medBlue;
const DARK = IMP.impDark;
const BLACK = IMP.impBlack;
const STEEL = IMP.steel;
// Three of the four Imperial screen layouts (schematic / tactical grid / text columns): the room's
// 16 draw calls are all spent, so the fourth key is not affordable.
const SCR = "screenImp0";
const SCR2 = "screenImp1";
const SCR3 = "screenImp2";
const BED_SCR = [SCR2, SCR3, SCR];
// suspended fixtures hug the ceiling (emitter at CEIL − 0.625); each fill hangs 1.3 m under its
// emitter and 1.9 m below the ceiling, so neither the housing nor the ceiling gets a blown disc
const FIX_STEM = 0.5;
const FILL_Y = CEIL - 1.9;

// ward geometry
const BAY_Z = [352.0, 355.5, 359.0, 362.5, 366.0];
const SPINE_X = -49.86; // west face of the low spine; east face at -49.7
const WEST_BED_X = wx0 + 1.12;
const EAST_BED_X = SPINE_X - 1.12;
const WEST_FRONT = wx0 + 2.7;
const EAST_FRONT = SPINE_X - 2.7;
const SOFFIT_Y = Y + 3.25;
const TRACK_Y = Y + 2.55;
const TANK_X = -37.9;
const TANK_Z = [354.6, 359.0, 363.4];

export default defineRoom({
  id: "d2-medbay",
  name: "Medbay",
  deck: 2,
  x: [X0, X1],
  z: [Z0, Z1],
  ceil: CEIL,
  spawn: { pos: [-48, Y, 370], yaw: 0 },
  views: {
    "d2-medbay-door": { pos: [-48.1, Y, 368.6], yaw: -12, pitch: -2 },
    "d2-medbay-wards": { pos: [-54.8, Y, 368.2], yaw: 0, pitch: -4 },
    "d2-medbay-tanks": { pos: [-44.35, Y, 364.55], yaw: -50, pitch: -1 },
    "d2-medbay-surgery": { pos: [-54.6, Y, 351.4], yaw: 4, pitch: -4 },
  },
  shell: {
    panelW: 1.6,
    wallColor: WHITE,
    wallAlt: IMP.impWhite,
    corniceColor: IMP.impGrey,
    altChance: 0.1,
    floor: { color: IMP.impGrey },
    // plain mid-grey panel ceiling: lit by the suspended fixture grid below (no bare strips); grey rather
    // than dark so the fills leave soft discs around the bars instead of a black plane between them
    ceiling: { channels: 0, color: IMP.impMid },
    // blue waist strip keeps emitWhite out of the room's 16 material keys (emitCoolSoft replaces it)
    stripMat: "emitBlue",
    lights: false,
    doorDressing: { accent: "emitBlue" },
    // cable tray + pipe runs along the starboard wall above the vitals boards (fills the 3–4 m band)
    serviceBand: { y: 3.35, faces: ["e"] },
  },
  detail(ctx) {
    const { kit, PALETTE } = ctx;

    // ---------------------------------------------------------------- reception (z 366..372)
    // supply cabinets both sides of the door (door hole x −49.2..−46.8; 1 m approach kept clear)
    const aftZ = wz1 - 0.25;
    for (const [x, h, c] of [[-45.0, 1.8, IMP.impMid], [-43.75, 1.8, WHITE], [-42.5, 1.8, IMP.impMid], [-51.2, 1.8, IMP.impMid], [-52.45, 1.5, WHITE]]) {
      cabinet(kit, PALETTE, [x, Y, aftZ], Math.PI, { h, color: c, seed: Math.round(-x * 7) });
    }
    shelfUnit(kit, [-40.5, Y, aftZ + 0.03], Math.PI, { w: 2.2, h: 2.0, d: 0.44, seed: 21 });
    cabinet(kit, PALETTE, [-38.6, Y, aftZ], Math.PI, { h: 1.5, color: WHITE, emit: "emitTeal", seed: 33 });
    wallScreen(kit, [-43.75, Y + 2.95, wz1 - 0.06], Math.PI, 1.8, 1.0, SCR3);
    vitalsBoard(kit, [-40.5, Y + 2.95, wz1 - 0.05], Math.PI, 1.6, 0.7, 41);
    vent(kit, [-38.4, Y + 3.1, wz1 - 0.02], Math.PI, 0.7, 0.4);
    bench(kit, [-55.5, Y, wz1 - 0.3], Math.PI, 2.4);
    wallScreen(kit, [-55.5, Y + 2.9, wz1 - 0.06], Math.PI, 1.6, 0.9, SCR2);
    vitalsBoard(kit, [-58.1, Y + 2.9, wz1 - 0.05], Math.PI, 1.2, 0.6, 43);
    vitalsBoard(kit, [-52.4, Y + 2.9, wz1 - 0.05], Math.PI, 1.0, 0.5, 44);
    junctionBox(kit, [-58.9, Y + 1.5, wz1 - 0.02], Math.PI, 8);
    gurney(kit, [-59.0, Y, 368.4], Math.PI / 2);
    // curved counter facing the door (offset right of the door line), receptionist console behind it
    const C = [-44.6, Y, 366.4];
    arcCounter(kit, C, 2.3, (80 * Math.PI) / 180, (190 * Math.PI) / 180, 7);
    const dd = [-0.506, 0.863]; // unit direction from C to the door
    consoleProp(kit, PALETTE, [C[0] + 0.6 * dd[0], Y, C[2] + 0.6 * dd[1]], Math.atan2(-dd[0], -dd[1]), { w: 1.6, d: 0.9, screens: 2, sit: true, seed: 12, screenMat: SCR2 });
    // desk top kit: a check-in terminal facing the door, the receptionist's terminal facing in, a datapad
    {
      const onArc = (deg, r = 2.3) => [C[0] + Math.cos((deg * Math.PI) / 180) * r, Y + 1.13, C[2] + Math.sin((deg * Math.PI) / 180) * r];
      const outward = (deg) => Math.atan2(Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180));
      deskTerminal(kit, onArc(135), outward(135), SCR, { seed: 14 });
      deskTerminal(kit, onArc(103.6), outward(103.6) + Math.PI, SCR3, { w: 0.38, h: 0.26, seed: 15 });
      datapad(kit, onArc(166.4), outward(166.4) + 0.4, SCR2);
      // a stack of med-cartridges and a cup on the inner worktop
      const wt = onArc(150.7, 1.8);
      kit.box("paintedMetal", wt[0], Y + 0.78, wt[2], 0.22, 0.1, 0.16, { color: IMP.impGrey });
      kit.box("paintedMetal", wt[0] + 0.02, Y + 0.87, wt[2], 0.18, 0.08, 0.14, { color: WHITE });
      kit.cyl("paintedMetal", wt[0] + 0.35, Y + 0.79, wt[2] - 0.1, 0.04, 0.1, "y", { color: DARK, segments: 10 });
    }
    gurney(kit, [-37.0, Y, 366.6], Math.PI / 2);
    equipmentCart(kit, [-38.2, Y, 368.9], 2.4, { seed: 63, screenMat: SCR3 });
    // east wall of the reception: waiting chairs, screens, dispenser
    for (const z of [371.0, 370.3, 369.6]) chair(kit, PALETTE, [wx1 - 0.35, Y, z], -Math.PI / 2);
    wallScreen(kit, [wx1 - 0.06, Y + 2.7, 369.9], -Math.PI / 2, 1.8, 1.0, SCR);
    vitalsBoard(kit, [wx1 - 0.05, Y + 2.7, 367.7], -Math.PI / 2, 1.4, 0.7, 45);
    // above the waiting chairs: queue display, pamphlet rack, sanitiser dispenser
    wallScreen(kit, [wx1 - 0.06, Y + 1.75, 371.2], -Math.PI / 2, 0.6, 0.4, SCR3);
    {
      const rz = 370.0;
      kit.box("paintedMetal", wx1 - 0.03, Y + 1.65, rz, 0.06, 0.7, 0.9, { color: DARK, texel: 2.5 });
      for (let r = 0; r < 3; r++) {
        kit.box("paintedMetal", wx1 - 0.09, Y + 1.4 + r * 0.24, rz, 0.06, 0.03, 0.86, { color: STEEL });
        for (let k = 0; k < 4; k++) kit.box("paintedMetal", wx1 - 0.085, Y + 1.5 + r * 0.24, rz - 0.33 + k * 0.22, 0.01, 0.17, 0.14, { color: [WHITE, BLUE, IMP.impGrey, WHITE][(k + r) % 4] });
      }
      kit.box("paintedMetal", wx1 - 0.06, Y + 1.3, 369.1, 0.12, 0.26, 0.14, { color: WHITE });
      kit.box("paintedMetal", wx1 - 0.13, Y + 1.36, 369.1, 0.04, 0.06, 0.1, { color: BLACK });
      kit.box("emitGreen", wx1 - 0.121, Y + 1.4, 369.1, 0.006, 0.015, 0.05);
    }
    {
      const P = { x: wx1 - 0.3, z: 368.4 };
      kit.box("paintedMetal", P.x, Y + 0.75, P.z, 0.6, 1.5, 0.55, { color: WHITE, texel: 2.5 });
      kit.box("paintedMetal", P.x, Y + 0.05, P.z, 0.62, 0.1, 0.57, { color: BLACK });
      kit.box("darkGloss", P.x - 0.28, Y + 1.1, P.z, 0.02, 0.5, 0.4);
      kit.box("emitBlue", P.x - 0.29, Y + 1.3, P.z, 0.006, 0.03, 0.3);
      kit.box("emitTeal", P.x - 0.29, Y + 0.95, P.z, 0.006, 0.12, 0.12);
      kit.collider([P.x - 0.3, Y, P.z - 0.28], [P.x + 0.3, Y + 1.5, P.z + 0.28], "dispenser");
    }
    // west wall of the reception
    wallScreen(kit, [wx0 + 0.06, Y + 2.7, 368.6], Math.PI / 2, 1.6, 0.9, SCR);
    cabinet(kit, PALETTE, [wx0 + 0.25, Y, 366.7], Math.PI / 2, { h: 1.8, color: IMP.impMid, seed: 51 });
    vent(kit, [wx0 + 0.02, Y + 4.1, 369.5], Math.PI / 2, 0.7, 0.4);
    // intake zone marked on the deck between the desk and the ward mouth (foreground of the door view):
    // white outline, blue chevrons at the ends, medical roundel in the middle
    {
      const [ix, iz, hw, hd] = [-48.3, 366.3, 1.0, 0.75];
      for (const [a, b] of [[[-hw, -hd], [hw, -hd]], [[-hw, hd], [hw, hd]], [[-hw, -hd], [-hw, hd]], [[hw, -hd], [hw, hd]]]) floorLine(kit, [ix + a[0], Y, iz + a[1]], [ix + b[0], Y, iz + b[1]], 0.08, "paintedMetal", WHITE);
      for (const sx of [-1, 1]) for (const k of [0, 1]) floorLine(kit, [ix + sx * (hw - 0.2 - k * 0.14), Y, iz - 0.4], [ix + sx * (hw - 0.2 - k * 0.14), Y, iz + 0.4], 0.05, "paintedMetal", BLUE);
      kit.box("paintedMetal", ix, Y + 0.004, iz, 0.56, 0.006, 0.13, { color: WHITE });
      kit.box("paintedMetal", ix, Y + 0.004, iz, 0.13, 0.006, 0.56, { color: WHITE });
      kit.add("paintedMetal", new THREE.TorusGeometry(0.4, 0.035, 6, 32), { pos: [ix, Y + 0.004, iz], rot: [Math.PI / 2, 0, 0], color: WHITE });
    }

    // ---------------------------------------------------------------- ward (z 352..366)
    // low spine between the east bed row and the corridor
    kit.boxMM("paintedMetal", [SPINE_X, Y, BAY_Z[0]], [SPINE_X + 0.16, Y + 0.08, BAY_Z[4]], { color: BLACK });
    kit.boxMM("impPanel", [SPINE_X + 0.02, Y + 0.08, BAY_Z[0] + 0.05], [SPINE_X + 0.14, Y + 1.44, BAY_Z[4] - 0.05], { color: WHITE, uv: "keep" });
    kit.cyl("metal", SPINE_X + 0.08, Y + 1.5, (BAY_Z[0] + BAY_Z[4]) / 2, 0.03, BAY_Z[4] - BAY_Z[0], "z", { color: STEEL, segments: 10 });
    kit.box("emitBlue", SPINE_X + 0.21, Y + 0.03, (BAY_Z[0] + BAY_Z[4]) / 2, 0.01, 0.02, BAY_Z[4] - BAY_Z[0] - 0.4);
    kit.collider([SPINE_X - 0.02, Y, BAY_Z[0]], [SPINE_X + 0.24, Y + 1.5, BAY_Z[4]], "spine");
    for (const z of BAY_Z) kit.box("paintedMetal", SPINE_X + 0.08, Y + 0.76, z, 0.2, 1.52, 0.14, { color: DARK });
    for (let i = 0; i < 4; i++) {
      const zc = (BAY_Z[i] + BAY_Z[i + 1]) / 2;
      vitalsBoard(kit, [SPINE_X + 0.22, Y + 1.0, zc], Math.PI / 2, 1.0, 0.42, 400 + i);
      kit.box("emitBlue", SPINE_X + 0.175, Y + 1.32, zc, 0.01, 0.06, 0.24);
    }

    // soffits over both rows, with recessed strips; the curtain tracks hang from them
    for (const side of [-1, 1]) {
      const [xa, xb] = side < 0 ? [wx0, WEST_FRONT] : [EAST_FRONT, SPINE_X];
      kit.boxMM("impPanel", [xa, SOFFIT_Y, BAY_Z[0]], [xb, SOFFIT_Y + 0.3, BAY_Z[4]], { color: WHITE, texel: 0.5 });
      const fx = side < 0 ? xb : xa;
      const out = side < 0 ? 1 : -1; // toward the ward aisle
      kit.boxMM("paintedMetal", [fx - 0.05, SOFFIT_Y - 0.06, BAY_Z[0] - 0.02], [fx + 0.05, SOFFIT_Y + 0.34, BAY_Z[4] + 0.02], { color: DARK, texel: 2.5 });
      kit.boxMM("emitBlue", [Math.min(fx + out * 0.05, fx + out * 0.062), SOFFIT_Y + 0.05, BAY_Z[0] + 0.2], [Math.max(fx + out * 0.05, fx + out * 0.062), SOFFIT_Y + 0.09, BAY_Z[4] - 0.2]);
      for (let i = 0; i < 4; i++) {
        const z0 = BAY_Z[i];
        const z1 = BAY_Z[i + 1];
        const zc = (z0 + z1) / 2;
        const cx = (xa + xb) / 2;
        // housed bay fixture: dark surface-mounted trough with a recessed soft diffuser
        kit.box("paintedMetal", cx, SOFFIT_Y - 0.045, zc, 2.3, 0.09, 0.34, { color: BLACK, texel: 2.5 });
        kit.box("emitCoolSoft", cx, SOFFIT_Y - 0.094, zc, 2.0, 0.012, 0.16, { uv: "keep" });
        // curtain track: U around the bay at TRACK_Y, hung on rods
        const front = side < 0 ? WEST_FRONT - 0.02 : EAST_FRONT + 0.02;
        const back = side < 0 ? wx0 + 0.35 : SPINE_X - 0.35;
        kit.box("metal", front, TRACK_Y, zc, 0.03, 0.03, z1 - z0 - 0.5, { color: STEEL });
        for (const z of [z0 + 0.25, z1 - 0.25]) {
          kit.box("metal", (front + back) / 2, TRACK_Y, z, Math.abs(front - back), 0.03, 0.03, { color: STEEL });
          rod(kit, [front, TRACK_Y, z], [front, SOFFIT_Y, z], 0.012);
          rod(kit, [back, TRACK_Y, z], [back, SOFFIT_Y, z], 0.012);
        }
      }
    }
    // beds, dividers, bedside kit
    const occupied = [true, false, true, false, false, true, false, true];
    for (let i = 0; i < 4; i++) {
      const z0 = BAY_Z[i];
      const z1 = BAY_Z[i + 1];
      const zc = (z0 + z1) / 2;
      // west row (heads on the west wall), east row (heads on the spine)
      medBed(kit, PALETTE, [WEST_BED_X, Y, zc], 0, { seed: 100 + i, occupied: occupied[i], screenMat: BED_SCR[(2 * i) % 3] });
      medBed(kit, PALETTE, [EAST_BED_X, Y, zc], Math.PI, { seed: 200 + i, occupied: occupied[4 + i], screenMat: BED_SCR[(2 * i + 1) % 3] });
      // monitor mast on the headboard top + vitals board above each bed (opposite corner to the lamp)
      for (const side of [-1, 1]) {
        const hx = side < 0 ? WEST_BED_X - 1.04 : EAST_BED_X + 1.04;
        const bx = hx - side * 0.22;
        const mz = zc + side * 0.3;
        rod(kit, [hx, Y + 1.38, mz], [hx, Y + 2.35, mz], 0.02);
        rod(kit, [hx, Y + 2.3, mz], [bx, Y + 2.3, mz], 0.015);
        vitalsBoard(kit, [bx, Y + 2.1, mz], side < 0 ? Math.PI / 2 : -Math.PI / 2, 0.7, 0.4, 300 + i * 2 + (side + 1) / 2);
      }
      // gas panel on the west wall, bedside unit / IV stand / cart alternating
      {
        const P = { x: wx0 + 0.03, z: z0 + 0.6 };
        kit.box("darkGloss", P.x, Y + 1.5, P.z, 0.03, 0.5, 0.5);
        for (let k = 0; k < 3; k++) {
          kit.cyl("metal", P.x + 0.05, Y + 1.38, P.z - 0.15 + k * 0.15, 0.03, 0.07, "x", { color: k === 1 ? BLUE : STEEL, segments: 10 });
          kit.box(k === 0 ? "emitGreen" : k === 1 ? "emitBlue" : "emitAmber", P.x + 0.018, Y + 1.62, P.z - 0.15 + k * 0.15, 0.006, 0.05, 0.05);
        }
      }
      const bedside = (x, z) => {
        kit.box("paintedMetal", x, Y + 0.38, z, 0.45, 0.76, 0.45, { color: WHITE, texel: 2.5 });
        kit.box("paintedMetal", x, Y + 0.04, z, 0.4, 0.08, 0.4, { color: BLACK });
        kit.box("darkGloss", x, Y + 0.775, z, 0.42, 0.02, 0.42);
        kit.box("metal", x, Y + 0.55, z + 0.23, 0.2, 0.02, 0.02, { color: STEEL });
        kit.box("metal", x, Y + 0.25, z + 0.23, 0.2, 0.02, 0.02, { color: STEEL });
        kit.collider([x - 0.23, Y, z - 0.23], [x + 0.23, Y + 0.8, z + 0.23], "bedside");
      };
      bedside(WEST_BED_X - 0.55, z1 - 0.45);
      bedside(EAST_BED_X + 0.55, z0 + 0.45);
      if (i % 2 === 0) ivStand(kit, [WEST_BED_X + 0.9, Y, z0 + 0.5]);
      else ivStand(kit, [EAST_BED_X - 0.9, Y, z1 - 0.5]);
    }
    for (const z of BAY_Z) {
      bayDivider(kit, [wx0, Y, z], [WEST_FRONT, Y, z]);
      bayDivider(kit, [SPINE_X, Y, z], [EAST_FRONT, Y, z]);
    }
    // carts parked inside the bays against the bed feet (west bay 1, east bay 3), clear of the curtains
    equipmentCart(kit, [-57.55, Y, 356.2], 0.2, { seed: 61, screenMat: SCR });
    equipmentCart(kit, [-51.9, Y, 363.15], -0.3, { seed: 62, screenMat: SCR3 });
    // partly drawn curtains on a few bays
    curtain(kit, [WEST_FRONT - 0.02, TRACK_Y, BAY_Z[1] + 0.25], [0, 0, 1], 1.4, 1.85);
    curtain(kit, [WEST_FRONT - 0.02, TRACK_Y, BAY_Z[4] - 0.25], [0, 0, -1], 1.1, 1.85);
    curtain(kit, [WEST_FRONT - 0.02, TRACK_Y, BAY_Z[0] + 0.25], [-1, 0, 0], 1.4, 1.85);
    curtain(kit, [EAST_FRONT + 0.02, TRACK_Y, BAY_Z[2] + 0.25], [0, 0, 1], 1.2, 1.85);
    curtain(kit, [EAST_FRONT + 0.02, TRACK_Y, BAY_Z[3] + 0.25], [1, 0, 0], 1.6, 1.85);
    // floor markings: bay fronts in white, ward aisle centreline in blue light, corridor edges
    for (let i = 0; i < 4; i++) {
      floorLine(kit, [WEST_FRONT + 0.1, Y, BAY_Z[i] + 0.1], [WEST_FRONT + 0.1, Y, BAY_Z[i + 1] - 0.1], 0.08, "paintedMetal", WHITE);
      floorLine(kit, [EAST_FRONT - 0.1, Y, BAY_Z[i] + 0.1], [EAST_FRONT - 0.1, Y, BAY_Z[i + 1] - 0.1], 0.08, "paintedMetal", WHITE);
    }
    floorLine(kit, [(WEST_FRONT + EAST_FRONT) / 2, Y, BAY_Z[0] + 0.3], [(WEST_FRONT + EAST_FRONT) / 2, Y, BAY_Z[4] - 0.3], 0.05, "emitBlue");
    floorLine(kit, [-40.7, Y, 352.2], [-40.7, Y, 366.4], 0.08, "paintedMetal", BLUE);
    floorLine(kit, [-49.5, Y, 351.2], [-40.7, Y, 351.2], 0.1, "paintedMetal", WHITE);
    // diagnostic scanner in the corridor, with its floor outline
    scanner(kit, [-46.6, Y, 354.6], 0, 64);
    for (const [a, b] of [[[-48.2, 353.0], [-44.8, 353.0]], [[-48.2, 356.2], [-44.8, 356.2]], [[-48.2, 353.0], [-48.2, 356.2]], [[-44.8, 353.0], [-44.8, 356.2]]]) {
      floorLine(kit, [a[0], Y, a[1]], [b[0], Y, b[1]], 0.06, "paintedMetal", WHITE);
    }

    // ---------------------------------------------------------------- corridor + bacta tanks
    // three tanks in three states: full, half-cycled, drained for service (amber status)
    const tankState = [{ level: 1 }, { level: 0.62 }, { level: 0.05, drained: true }];
    for (let i = 0; i < 3; i++) {
      const z = TANK_Z[i];
      bactaTank(kit, [TANK_X, Y, z], { pipeTopY: Y + 4.5, facing: -1, seed: 70 + i, ...tankState[i] });
      for (const s of [-0.35, 0.35]) kit.cyl("metal", (TANK_X + s + wx1 - 0.05) / 2, Y + 4.5, z, 0.06, wx1 - 0.05 - (TANK_X + s), "x", { color: STEEL, segments: 12 });
      consoleProp(kit, PALETTE, [-40.1, Y, z + 1.55], -Math.PI / 2, { w: 1.0, d: 0.6, h: 1.05, screens: 1, seed: 80 + i, screenMat: [SCR2, SCR3, SCR][i] });
      const drained = !!tankState[i].drained;
      ctx.lights.push({ type: "point", pos: [TANK_X - 1.1, Y + 2.4, z], color: drained ? 0xffb050 : 0x4fd8cc, intensity: drained ? 6 : 12, distance: 6, priority: 0.3 });
    }
    // service kit at the drained tank: open access panel on the plinth, tool case, coiled hose
    {
      const z = TANK_Z[2];
      kit.box("paintedMetal", TANK_X - 1.02, Y + 0.16, z - 0.55, 0.06, 0.24, 0.5, { color: IMP.impMid, rot: [0, 0.6, 0] });
      const [cx, cz] = [TANK_X - 0.3, z - 2.2]; // between the plinths of tanks 1 and 2, off the rail line
      kit.box("paintedMetal", cx, Y + 0.14, cz, 0.5, 0.28, 0.36, { color: DARK, texel: 2.5 });
      kit.box("paintedMetal", cx, Y + 0.29, cz, 0.52, 0.02, 0.38, { color: BLACK });
      kit.box("emitAmber", cx - 0.253, Y + 0.2, cz, 0.006, 0.02, 0.1);
      kit.add("metal", new THREE.TorusGeometry(0.28, 0.035, 8, 24), { pos: [TANK_X - 0.1, Y + 0.04, z + 1.7], rot: [Math.PI / 2, 0, 0], color: STEEL });
      kit.collider([cx - 0.28, Y, cz - 0.2], [cx + 0.28, Y + 0.3, cz + 0.2], "toolcase");
    }
    // canister dolly parked in the corridor between the station and the tank consoles (foreground of
    // the tanks view), handle toward the reception
    supplyDolly(kit, [-42.5, Y, 361.7], Math.PI / 2 + 0.25, 73);
    pipe(kit, PALETTE, [wx1 - 0.3, Y + 4.5, 352.4], [wx1 - 0.3, Y + 4.5, 366.2], 0.1, { bracket: 2.4 });
    rail(kit, PALETTE, [-39.2, Y, 352.8], [-39.2, Y, 365.4], Y);
    for (const z of [356.8, 361.2]) {
      vitalsBoard(kit, [wx1 - 0.06, Y + 2.85, z], -Math.PI / 2, 1.4, 0.65, Math.round(z));
      junctionBox(kit, [wx1 - 0.02, Y + 1.5, z], -Math.PI / 2, Math.round(z));
      kit.box("paintedMetal", wx1 - 0.04, Y + 0.9, z, 0.08, 1.0, 0.5, { color: DARK });
      kit.box("emitBlue", wx1 - 0.085, Y + 1.2, z, 0.006, 0.02, 0.4);
    }
    for (const z of TANK_Z) {
      // tank status plate on the wall behind each tank
      const Q = { x: wx1 - 0.03, z };
      kit.box("darkGloss", Q.x, Y + 1.7, Q.z, 0.03, 0.6, 0.5);
      kit.box("emitTeal", Q.x - 0.02, Y + 1.85, Q.z, 0.006, 0.1, 0.36);
      for (let k = 0; k < 6; k++) kit.box(k % 2 ? "emitBlue" : "emitGreen", Q.x - 0.02, Y + 1.55, Q.z - 0.18 + k * 0.072, 0.006, 0.05, 0.03);
    }
    vent(kit, [wx1 - 0.02, Y + 3.0, 365.6], -Math.PI / 2, 0.6, 0.35);
    vent(kit, [wx1 - 0.02, Y + 3.0, 352.5], -Math.PI / 2, 0.6, 0.35);
    // nurses' station island: two consoles back to back around a monitor mast
    consoleProp(kit, PALETTE, [-44.7, Y, 359.0], -Math.PI / 2, { w: 2.0, d: 0.9, screens: 2, sit: true, seed: 90, screenMat: SCR });
    consoleProp(kit, PALETTE, [-43.5, Y, 359.0], Math.PI / 2, { w: 2.0, d: 0.9, screens: 2, sit: true, seed: 91, screenMat: SCR3 });
    kit.box("paintedMetal", -44.1, Y + 1.15, 359.0, 0.24, 2.3, 1.3, { color: DARK, texel: 2.5 });
    kit.box("paintedMetal", -44.1, Y + 2.33, 359.0, 0.3, 0.06, 1.4, { color: BLACK });
    kit.box("emitCoolSoft", -44.1, Y + 2.37, 359.0, 0.1, 0.02, 1.2, { uv: "keep" });
    datapad(kit, [-45.05, Y + 0.745, 358.3], -Math.PI / 2 + 0.3, SCR2);
    vitalsBoard(kit, [-44.1, Y + 1.85, 358.33], Math.PI, 1.0, 0.5, 95);
    vitalsBoard(kit, [-44.1, Y + 1.85, 359.67], 0, 1.0, 0.5, 96);
    kit.collider([-44.25, Y, 358.35], [-43.95, Y + 2.3, 359.65], "mast");

    // ---------------------------------------------------------------- surgical bay (far port corner)
    const SX = -50.0;
    const SZ = 349.6;
    glassWall(kit, [wx0, Y, SZ], [SX, Y, SZ], { h: 3.0, gaps: [[4.06, 5.66]] });
    glassWall(kit, [SX, Y, SZ - 0.14], [SX, Y, wz0], { h: 3.0 });
    hazardBand(kit, [-55.7, SZ + 0.1], [-53.9, SZ + 0.42], Y + 0.005);
    operatingTable(kit, [-54.8, Y, 345.0], 0);
    // theatre bar beside the pendant's own ceiling mount (mount 1.6 m west of the head)
    dropLight(kit, PALETTE, [-53.4, CEIL, 345.0], { w: 2.2, d: 0.5, stem: FIX_STEM, mat: "emitCoolSoft" });
    surgeryLight(kit, [-54.8, Y + 2.85, 345.0], CEIL);
    const nZ = wz0 + 0.25;
    cabinet(kit, PALETTE, [-58.9, Y, nZ], 0, { h: 1.8, color: IMP.impMid, seed: 101 });
    cabinet(kit, PALETTE, [-57.6, Y, nZ], 0, { h: 1.8, color: WHITE, seed: 102 });
    shelfUnit(kit, [-55.6, Y, nZ - 0.02], 0, { w: 2.2, h: 2.0, d: 0.44, seed: 103, colors: [STEEL, WHITE, DARK, 0xb0b8c0, 0x3fa8a0] });
    cabinet(kit, PALETTE, [-53.7, Y, nZ], 0, { h: 1.8, color: IMP.impMid, seed: 104 });
    scrubBasin(kit, [-52.3, Y, wz0], 0);
    scrubBasin(kit, [-51.4, Y, wz0], 0);
    vitalsBoard(kit, [-55.6, Y + 2.7, wz0 + 0.05], 0, 2.0, 0.9, 105);
    wallScreen(kit, [-52.6, Y + 2.7, wz0 + 0.06], 0, 1.4, 0.9, SCR3);
    consoleProp(kit, PALETTE, [wx0 + 0.36, Y, 343.2], Math.PI / 2, { w: 1.6, d: 0.7, h: 1.25, screens: 2, seed: 106, screenMat: SCR });
    consoleProp(kit, PALETTE, [wx0 + 0.36, Y, 346.6], Math.PI / 2, { w: 1.6, d: 0.7, h: 1.25, screens: 2, seed: 107, screenMat: SCR2 });
    vitalsBoard(kit, [wx0 + 0.05, Y + 2.3, 344.9], Math.PI / 2, 1.4, 0.7, 108);
    vent(kit, [wx0 + 0.02, Y + 4.1, 345.0], Math.PI / 2, 0.7, 0.4);
    junctionBox(kit, [wx0 + 0.02, Y + 1.3, 348.6], Math.PI / 2, 109);
    equipmentCart(kit, [-57.3, Y, 347.6], 0.3, { seed: 110, screenMat: SCR2 });
    equipmentCart(kit, [-52.4, Y, 346.5], -0.7, { seed: 111, screenMat: SCR3 });
    ivStand(kit, [-53.4, Y, 343.8]);
    for (const [a, b] of [[[-56.6, 343.4], [-53.0, 343.4]], [[-56.6, 346.6], [-53.0, 346.6]], [[-56.6, 343.4], [-56.6, 346.6]], [[-53.0, 343.4], [-53.0, 346.6]]]) {
      floorLine(kit, [a[0], Y, a[1]], [b[0], Y, b[1]], 0.06, "paintedMetal", WHITE);
    }
    // scrub station + wall kit just outside the surgery door
    scrubBasin(kit, [wx0, Y, 350.9], Math.PI / 2);
    junctionBox(kit, [wx0 + 0.02, Y + 1.6, 351.6], Math.PI / 2, 112);
    // pipe run high on the west wall (above the soffit line)
    pipe(kit, PALETTE, [wx0 + 0.18, Y + 4.3, wz0 + 0.3], [wx0 + 0.18, Y + 4.3, wz1 - 0.3], 0.07, { bracket: 2.6 });
    pipe(kit, PALETTE, [wx0 + 0.18, Y + 4.05, wz0 + 0.3], [wx0 + 0.18, Y + 4.05, wz1 - 0.3], 0.05, { bracket: 2.6, color: BLUE });

    // ---------------------------------------------------------------- corridor end (far wall)
    vitalsBoard(kit, [-48.15, Y + 2.75, wz0 + 0.05], 0, 2.6, 1.2, 120);
    cabinet(kit, PALETTE, [-49.3, Y, nZ], 0, { h: 1.8, color: IMP.impMid, seed: 121 });
    cabinet(kit, PALETTE, [-47.0, Y, nZ], 0, { h: 1.8, color: WHITE, emit: "emitRedImp", seed: 122 });
    vent(kit, [-48.15, Y + 4.1, wz0 + 0.02], 0, 0.8, 0.45);

    // ---------------------------------------------------------------- pharmacy (far starboard corner)
    const PZ = 348.2;
    counter(kit, [-42.3, Y, PZ], 0, 7.4);
    hazardBand(kit, [-38.55, PZ - 0.2], [-37.25, PZ + 0.2], Y + 0.005);
    deskTerminal(kit, [-44.3, Y + 1.13, PZ], Math.PI, SCR2, { w: 0.38, h: 0.26, seed: 16 });
    datapad(kit, [-40.4, Y + 1.13, PZ + 0.05], 0.5, SCR3);
    floorLine(kit, [-46.0, Y, PZ + 0.75], [-38.6, Y, PZ + 0.75], 0.08, "paintedMetal", WHITE);
    for (const x of [-44.85, -42.9, -40.95, -39.0]) shelfUnit(kit, [x, Y, wz0 + 0.225], 0, { w: 1.9, h: 2.1, d: 0.45, seed: Math.round(-x * 3) });
    for (const z of [342.0, 344.0, 346.0]) shelfUnit(kit, [wx1 - 0.225, Y, z], -Math.PI / 2, { w: 1.9, h: 2.1, d: 0.45, seed: Math.round(z) });
    shelfUnit(kit, [-46.1, Y, 341.5], Math.PI / 2, { w: 2.0, h: 2.1, d: 0.45, seed: 131 });
    shelfUnit(kit, [-46.1, Y, 343.6], Math.PI / 2, { w: 2.0, h: 2.1, d: 0.45, seed: 132 });
    cabinet(kit, PALETTE, [-46.05, Y, 345.4], Math.PI / 2, { h: 2.0, color: IMP.impMid, emit: "emitTeal", seed: 133 });
    cabinet(kit, PALETTE, [-46.05, Y, 346.9], Math.PI / 2, { h: 2.0, color: IMP.impMid, emit: "emitTeal", seed: 134 });
    consoleProp(kit, PALETTE, [-42.6, Y, 346.3], Math.PI, { w: 1.6, d: 0.9, screens: 2, sit: true, seed: 135, screenMat: SCR3 });
    vitalsBoard(kit, [wx1 - 0.05, Y + 2.75, 344.0], -Math.PI / 2, 1.6, 0.7, 136);
    wallScreen(kit, [-42.2, Y + 2.85, wz0 + 0.06], 0, 1.6, 0.9, SCR2);
    vent(kit, [wx1 - 0.02, Y + 4.35, 344.0], -Math.PI / 2, 0.7, 0.4);
    junctionBox(kit, [wx1 - 0.02, Y + 1.6, 348.9], -Math.PI / 2, 137);
    // 1.2 m supply module on a pallet by the pharmacy gate (scale reference; no rubber material)
    {
      const x = -37.3;
      const z = 350.6;
      kit.box("paintedMetal", x, Y + 0.06, z, 1.3, 0.12, 1.3, { color: BLACK });
      kit.box("paintedMetal", x, Y + 0.72, z, 1.2, 1.2, 1.2, { color: WHITE, texel: 2.5 });
      for (const [dx, dz, sx, sz] of [[0, 0.601, 0.9, 0.03], [0, -0.601, 0.9, 0.03], [0.601, 0, 0.03, 0.9], [-0.601, 0, 0.03, 0.9]]) {
        kit.box("paintedMetal", x + dx, Y + 0.72, z + dz, sx, 0.9, sz, { color: BLUE });
      }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box("paintedMetal", x + sx * 0.56, Y + 0.72, z + sz * 0.56, 0.1, 1.22, 0.1, { color: DARK });
      kit.box("emitBlue", x - 0.62, Y + 1.15, z + 0.35, 0.006, 0.03, 0.14);
      kit.collider([x - 0.65, Y, z - 0.65], [x + 0.65, Y + 1.32, z + 0.65], "crate");
    }

    // ---------------------------------------------------------------- ceiling fixture grid
    // Suspended housed fixtures explain every fill: crosswise bars over the reception, ward aisle and
    // pharmacy; lengthwise bars down the corridor and between the tanks. Emitters at CEIL − 1.225.
    const fixture = (x, z, along = "x", len = 2.4) => dropLight(kit, PALETTE, [x, CEIL, z], { w: along === "x" ? len : 0.5, d: along === "x" ? 0.5 : len, stem: FIX_STEM, mat: "emitCoolSoft" });
    for (const z of [369.4, 366.9]) for (const x of [-52.6, -46.0, -39.6]) fixture(x, z);
    for (const z of [353.75, 357.25, 360.75, 364.25]) fixture(-54.8, z, "x", 2.0);
    for (const x of [-47.8, -44.4]) for (const z of [353.4, 357.2, 361.0, 364.8]) fixture(x, z, "z");
    for (const z of [356.8, 361.2]) fixture(-39.7, z, "z", 2.0);
    for (const x of [-44.2, -40.0]) fixture(x, 344.6);
    fixture(-46.8, 350.6, "x", 2.0);

    // ---------------------------------------------------------------- lights (cool blue-white)
    // fills hang 1.9 m below the ceiling, centred between the paired bar rows (reception, corridor)
    // or under single bars (tanks, surgery, pharmacy); 10 fills + 3 tank accents = 13 descriptors
    const L = (x, z, intensity = 26, distance = 12, color = 0xdbe8ff, y = FILL_Y, priority = 0.5) => ctx.lights.push({ type: "point", pos: [x, y, z], color, intensity, distance, priority });
    L(-46.0, 368.15, 28, 12);
    L(-52.6, 368.15, 16, 9);
    L(-39.6, 368.15, 18, 9);
    L(-54.8, 355.5, 24, 11);
    L(-54.8, 362.5, 24, 11);
    L(-46.1, 355.3, 26, 12);
    L(-46.1, 362.9, 26, 12);
    L(-39.7, 359.0, 16, 9);
    L(-53.6, 345.0, 26, 11, 0xf2f7ff, FILL_Y, 0.7);
    L(-42.1, 344.6, 26, 11);
    return {};
  },
});
