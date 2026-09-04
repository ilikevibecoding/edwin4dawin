// Deck 3 engineering control: a two-level control room whose aft wall is a wide window onto the
// reactor chamber. Three arcs of consoles face the window, a command console with a holo schematic
// sits at the centre, a mezzanine runs along the west and forward walls under a wall of status
// screens, and power-distribution cabinets feed cable trays and heavy conduit trunks that converge on
// a header above the window. Amber + orange, thick pipes, big machinery (§11).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP, col } from "../../deck2/_shared/palette.js";
import { rail } from "../../deck2/_shared/shell.js";
import { placer, console as consoleProp, indicatorField, wallScreen, crate, pipe, duct, pillar, stairs, holoTable, floorLine, cabinet, hazardStrip } from "../../deck2/_shared/props.js";
import { arcLine, arcPos, powerCabinet, cableTray, toolRack, junctionBox, ventGrille, yawBox } from "./engprops.js";

const Y = 12;
const CEIL = 22;
const X0 = -30 + 0.3;
const X1 = 4 - 0.3;
const Z0 = 572 + 0.3;
const Z1 = 612.5 - 0.3;
const MEZZ = Y + 4; // mezzanine deck top
const D2R = Math.PI / 180;

// Window onto the reactor, shared plane z 612.5 with d3-reactor (which cuts the same hole).
export const REACTOR_WINDOW = { a0: -26, a1: -2, y0: Y + 1.2, y1: Y + 5.5 };

// Console arcs are centred on x −12 at the aft wall plane (window x −26..−2). The east ends of the two
// outer arcs are left open so a 2.8 m aisle (x −0.4..2.4) runs from the command post to the reactor
// door at x 1 (hole x −0.2..2.2).
const CX = -12;
const CZ = 612.5;
const ARCS = [
  { r: 8, phis: [-49.4, -25, 25, 49.4] },
  { r: 12, phis: [-65.3, -49.1, -32.9, -16.7, 16.7, 32.9, 49.1] },
  { r: 16, phis: [-49.1, -36.9, -24.7, -12.5, 12.5, 24.7, 36.9] },
];

export default defineRoom({
  id: "d3-engctl",
  name: "Engineering Control",
  deck: 3,
  x: [-30, 4],
  z: [572, 612.5],
  ceil: CEIL,
  openings: [{ face: "s", ...REACTOR_WINDOW, glass: true, id: "engctl-reactor-window" }],
  spawn: { pos: [2, Y, 590], yaw: 90 },
  views: {
    "d3-engctl-door": { pos: [2.2, Y, 590], yaw: 105, pitch: 5 },
    "d3-engctl-window": { pos: [-12, Y, 597.8], yaw: 180, pitch: 7 },
    "d3-engctl-status": { pos: [-9, Y, 596], yaw: 62, pitch: 10 },
    "d3-engctl-mezz": { pos: [-27.4, MEZZ, 577.2], yaw: -138, pitch: -9 },
    "d3-engctl-aft-door": { pos: [1, Y, 602.5], yaw: 172, pitch: 6 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impMid,
    wallAlt: IMP.impGrey,
    stripMat: "emitAmber",
    floor: { mat: "impFloor", color: 0x2b2e34 },
    ceiling: { channels: 5, axis: "x", color: IMP.impDark, stripMat: "emitAmber" },
    lights: false,
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const P = (k) => col(PALETTE, k);
    const black = P("impBlack");
    const dark = P("impDark");
    const mid = P("impMid");
    const steel = P("steel");
    let seed = 100;

    // ---- console arcs facing the window --------------------------------------------------------
    ARCS.forEach((arc, ai) => {
      for (const deg of arc.phis) {
        const phi = deg * D2R;
        const [x, z] = arcPos(CX, CZ, arc.r, phi);
        consoleProp(kit, PALETTE, [x, Y, z], Math.PI - phi, { w: 3, screens: 3, seed: seed++, screenMat: seed % 2 ? "screenImp1" : "screenImp2" });
      }
      // orange marking arcs on the screen side of each row, broken at the central aisle; each end
      // runs 8° past its last console (the east ends stop short of the door aisle)
      const rr = arc.r - 0.75;
      const gap = Math.asin(2.1 / rr);
      arcLine(kit, CX, Y, CZ, rr, (arc.phis[0] - 8) * D2R, -gap);
      arcLine(kit, CX, Y, CZ, rr, gap, (arc.phis[arc.phis.length - 1] + 8) * D2R);
    });
    // central aisle edges + landing bars
    floorLine(kit, [CX - 2.1, Y, 596.5], [CX - 2.1, Y, 610.4], 0.12, "emitOrange");
    floorLine(kit, [CX + 2.1, Y, 596.5], [CX + 2.1, Y, 610.4], 0.12, "emitOrange");

    // ---- command console + holo table ----------------------------------------------------------
    const holo = holoTable(ctx, [CX, Y, 592], { r: 1.2, h: 0.95, holoH: 1.4 });
    consoleProp(kit, PALETTE, [CX, Y, 589.5], Math.PI, { w: 3, screens: 3, seed: seed++, screenMat: "screenImp1" });
    consoleProp(kit, PALETTE, [CX - 4.1, Y, 590.7], Math.PI + 0.45, { w: 2.4, screens: 2, seed: seed++, screenMat: "screenImp2" });
    consoleProp(kit, PALETTE, [CX + 4.1, Y, 590.7], Math.PI - 0.45, { w: 2.4, screens: 2, seed: seed++, screenMat: "screenImp2" });
    arcLine(kit, CX, Y, 592, 2.6, -Math.PI * 0.62, Math.PI * 0.62, { mat: "emitOrange", w: 0.1 });
    // reactor schematic hologram (one merged mesh, rotated in update)
    const geos = [];
    const push = (g, pos, rot = [0, 0, 0]) => {
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)));
      geos.push(g.index ? g.toNonIndexed() : g);
    };
    push(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 16, 1, true), [0, 0.5, 0]);
    push(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16, 1, true), [0, 0.28, 0]);
    push(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16, 1, true), [0, 0.72, 0]);
    for (const y of [0.12, 0.5, 0.88]) push(new THREE.TorusGeometry(0.44, 0.012, 6, 32), [0, y, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      push(new THREE.BoxGeometry(0.03, 1.1, 0.03), [Math.cos(a) * 0.56, 0.55, Math.sin(a) * 0.56]);
    }
    push(new THREE.TorusGeometry(0.72, 0.008, 4, 40), [0, 0.02, 0], [Math.PI / 2, 0, 0]);
    const schematic = new THREE.Mesh(mergeGeometries(geos, false), ctx.materials.holo);
    schematic.position.set(CX, Y + 0.95 + 0.22, 592);
    ctx.group.add(schematic);

    // ---- continuous sill console under the window (x −26.6..−3.4, four 5.8 m sections) ----------------
    for (const x of [-23.7, -17.9, -12.1, -6.3]) sillConsole(kit, PALETTE, [x, Y, 611.72], Math.PI, { w: 5.8, seed: seed++ });
    // reactor door (hole x −0.2..2.2): status panel on the strip of wall between window and door
    {
      const F = placer(kit, [-1.6, 0, Z1], Math.PI);
      F.box("paintedMetal", 0, Y + 1.5, 0.05, 0.6, 0.9, 0.06, { color: black });
      indicatorField(F, 0, Y + 1.6, 0.09, 0.5, 0.5, seed++);
      F.box("emitAmber", 0, Y + 1.15, 0.085, 0.36, 0.06, 0.01);
    }
    // window mullions + header manifold the ceiling trunks feed into
    for (const x of [-20, -14, -8]) kit.box("paintedMetal", x, (REACTOR_WINDOW.y0 + REACTOR_WINDOW.y1) / 2, Z1 - 0.1, 0.16, REACTOR_WINDOW.y1 - REACTOR_WINDOW.y0 - 0.06, 0.16, { color: dark });
    kit.boxMM("paintedMetal", [-27, Y + 6.2, Z1 - 0.95], [-1, Y + 9.4, Z1 - 0.05], { color: dark, texel: 1 });
    kit.boxMM("paintedMetal", [-27.1, Y + 6.2, Z1 - 1.0], [-0.9, Y + 6.5, Z1 - 0.05], { color: black });
    kit.boxMM("paintedMetal", [-27.1, Y + 9.1, Z1 - 1.0], [-0.9, Y + 9.4, Z1 - 0.05], { color: black });
    kit.boxMM("emitAmber", [-26.5, Y + 6.55, Z1 - 0.96], [-1.5, Y + 6.62, Z1 - 0.9]);
    kit.boxMM("emitAmber", [-26.5, Y + 8.98, Z1 - 0.96], [-1.5, Y + 9.05, Z1 - 0.9]);
    for (let i = 0; i < 12; i++) {
      const x = -25.5 + i * 2.15;
      kit.cyl("darkGloss", x, Y + 7.8, Z1 - 0.97, 0.32, 0.06, "z", { segments: 16 });
      kit.box(i % 3 === 0 ? "emitRedImp" : "emitAmber", x, Y + 7.8, Z1 - 1.0, 0.16, 0.05, 0.01);
      kit.box("paintedMetal", x + 1.07, Y + 7.8, Z1 - 0.98, 0.5, 1.6, 0.06, { color: black });
      for (let j = 0; j < 8; j++) kit.box("paintedMetal", x + 1.07, Y + 7.1 + j * 0.2, Z1 - 1.02, 0.4, 0.04, 0.02, { color: mid });
    }

    // ---- mezzanine along the west and forward walls ---------------------------------------------
    const MW = -26.7; // west deck inner edge
    const MZ = 575.3; // forward deck inner edge
    const WEST_END = 605;
    const FWD_END = -14;
    kit.boxMM("impFloor", [X0, MEZZ - 0.3, Z0], [MW, MEZZ, WEST_END], { color: mid, texel: 0.5 });
    kit.boxMM("impFloor", [MW, MEZZ - 0.3, Z0], [FWD_END, MEZZ, MZ], { color: mid, texel: 0.5 });
    // edge trims, toe plates, support beams and pillars
    kit.boxMM("paintedMetal", [MW - 0.3, MEZZ - 0.7, MZ], [MW, MEZZ - 0.3, WEST_END], { color: black, texel: 1 });
    kit.boxMM("paintedMetal", [X0, MEZZ - 0.7, MZ - 0.3], [FWD_END, MEZZ - 0.3, MZ], { color: black, texel: 1 });
    kit.boxMM("paintedMetal", [X0, MEZZ - 0.7, WEST_END - 0.3], [MW, MEZZ - 0.3, WEST_END], { color: black, texel: 1 });
    kit.boxMM("paintedMetal", [MW - 0.02, MEZZ, MZ], [MW + 0.06, MEZZ + 0.12, WEST_END], { color: black });
    kit.boxMM("paintedMetal", [X0, MEZZ, MZ - 0.02], [FWD_END, MEZZ + 0.12, MZ + 0.06], { color: black });
    kit.boxMM("emitAmber", [MW - 0.01, MEZZ - 0.45, MZ + 0.3], [MW + 0.0, MEZZ - 0.4, WEST_END - 0.3]);
    kit.boxMM("emitAmber", [X0 + 0.3, MEZZ - 0.45, MZ - 0.01], [FWD_END - 0.3, MEZZ - 0.4, MZ]);
    for (const z of [578.5, 584.5, 590.5, 596.5, 601.5, WEST_END - 0.25]) pillar(kit, PALETTE, [MW - 0.25, Y, z], 0.5, MEZZ - 0.7 - Y, { strip: true });
    for (const x of [MW - 0.25, -22.5, -18.5, FWD_END - 0.25]) pillar(kit, PALETTE, [x, Y, MZ - 0.25], 0.5, MEZZ - 0.7 - Y, { strip: x !== MW - 0.25 });
    // rails on the inner edges (gaps where the two stairs land)
    rail(kit, PALETTE, [MW - 0.05, MEZZ, MZ], [MW - 0.05, MEZZ, WEST_END], MEZZ);
    rail(kit, PALETTE, [MW, MEZZ, MZ - 0.05], [FWD_END, MEZZ, MZ - 0.05], MEZZ);
    rail(kit, PALETTE, [-27.65, MEZZ, WEST_END - 0.05], [MW, MEZZ, WEST_END - 0.05], MEZZ);
    rail(kit, PALETTE, [FWD_END - 0.05, MEZZ, 574.35], [FWD_END - 0.05, MEZZ, MZ], MEZZ);
    // stairs: west wall (climbing forward) and forward wall (climbing west)
    stairs(kit, PALETTE, [-28.6, Y, WEST_END + 6], Math.PI, { rise: MEZZ - Y, run: 6, w: 1.8 });
    stairs(kit, PALETTE, [-8, Y, 573.4], -Math.PI / 2, { rise: MEZZ - Y, run: 6, w: 1.8 });
    hazardStrip(kit, [-29.6, WEST_END + 6.05], [-27.6, WEST_END + 6.55], Y + 0.005);
    hazardStrip(kit, [-7.95, 572.45], [-7.45, 574.35], Y + 0.005);
    // mezzanine kit: consoles facing the window, cabinets and a rack on the forward deck
    for (const z of [581, 587, 593, 599]) consoleProp(kit, PALETTE, [-28.25, MEZZ, z], Math.PI, { w: 2.4, screens: 2, seed: seed++, screenMat: "screenImp1" });
    for (const x of [-27.6, -26.0, -24.4, -21.2]) cabinet(kit, PALETTE, [x, MEZZ, Z0 + 0.28], 0, { seed: seed++, emit: x === -21.2 ? "emitAmber" : "emitBlue" });
    toolRack(kit, PALETTE, [-18.4, MEZZ, Z0 + 0.06], 0, { w: 1.6, seed: seed++ });
    for (const x of [-25.0, -19.6]) junctionBox(kit, PALETTE, [x, MEZZ + 2.4, Z0], 0, { seed: seed++ });

    // ---- west wall: status screens above the mezzanine, cabinets and crates below ------------------
    const SX = X0 + 0.1;
    let si = 0;
    for (const z of [578, 587, 596]) {
      for (const yc of [MEZZ + 2.2, MEZZ + 4.35]) wallScreen(kit, [SX, yc, z], Math.PI / 2, 1.6, 1.8, si++ % 2 ? "screenImp1" : "screenImp2");
    }
    for (const z of [582.5, 591.5]) {
      const F = placer(kit, [X0 + 0.04, 0, z], Math.PI / 2);
      indicatorField(F, 0, MEZZ + 2.2, 0, 2.6, 1.0, seed++, { density: 0.5 });
      indicatorField(F, 0, MEZZ + 4.35, 0, 2.6, 1.0, seed++, { density: 0.5 });
      F.box("paintedMetal", 0, MEZZ + 3.28, 0.03, 2.8, 0.1, 0.06, { color: black });
      F.box("emitAmber", 0, MEZZ + 3.28, 0.07, 2.4, 0.04, 0.01);
    }
    kit.boxMM("emitAmber", [X0 + 0.02, MEZZ + 5.3, 576.5], [X0 + 0.04, MEZZ + 5.36, 598.5]);
    for (const z of [579.5, 587.5, 595.5]) cabinet(kit, PALETTE, [X0 + 0.28, Y, z], Math.PI / 2, { seed: seed++ });
    for (const z of [583.5, 599.5]) crate(kit, PALETTE, [X0 + 0.75, Y, z], 0.1, { seed: seed++ });
    crate(kit, PALETTE, [X0 + 0.7, Y, 600.9], -0.08, { seed: seed++, w: 1.0, h: 0.8, d: 1.0 });
    toolRack(kit, PALETTE, [X0 + 0.06, Y, 591.6], Math.PI / 2, { w: 1.6, seed: seed++ });
    for (const z of [581.5, 597.6]) ventGrille(kit, PALETTE, [X0, Y + 3.0, z], Math.PI / 2, { w: 1.4, h: 0.5 });

    // ---- power distribution: east wall and forward wall cabinets, cables into ceiling trays -------
    const trayY = CEIL - 0.85;
    const eastZ = [575.3, 577.3, 579.3, 581.3, 583.3, 585.3, 594.5, 596.5, 598.5, 600.5, 602.5, 604.5, 606.5, 608.5];
    for (const z of eastZ) {
      powerCabinet(kit, PALETTE, [X1 - 0.42, Y, z], -Math.PI / 2, { seed: seed++ });
      for (const s of [-1, 1]) pipe(kit, PALETTE, [X1 - 0.42, Y + 2.4, z + s * 0.35], [X1 - 0.42, trayY + 0.02, z + s * 0.35], 0.08, { bracket: 3.2, color: s > 0 ? black : dark });
    }
    cableTray(kit, PALETTE, [X1 - 0.42, trayY, 573.2], [X1 - 0.42, trayY, 611.4], { w: 0.7 });
    const fwdX = [-5.6, -3.6, -1.6, 0.4, 2.4];
    for (const x of fwdX) {
      powerCabinet(kit, PALETTE, [x, Y, Z0 + 0.42], 0, { seed: seed++ });
      for (const s of [-1, 1]) pipe(kit, PALETTE, [x + s * 0.35, Y + 2.4, Z0 + 0.42], [x + s * 0.35, trayY + 0.02, Z0 + 0.42], 0.08, { bracket: 3.2, color: s > 0 ? black : dark });
    }
    cableTray(kit, PALETTE, [-7, trayY, Z0 + 0.42], [X1 - 0.85, trayY, Z0 + 0.42], { w: 0.7 });
    for (const z of [576.3, 580.3, 584.3, 597.5, 601.5, 605.5]) junctionBox(kit, PALETTE, [X1, Y + 3.2, z], -Math.PI / 2, { seed: seed++ });
    for (const z of [578.3, 582.3, 599.5, 607.5]) ventGrille(kit, PALETTE, [X1, Y + 4.6, z], -Math.PI / 2, { w: 1.6, h: 0.6 });
    for (const x of [-4.6, 1.4]) junctionBox(kit, PALETTE, [x, Y + 3.2, Z0], 0, { seed: seed++ });
    crate(kit, PALETTE, [X1 - 0.7, Y, 573.85], 0.05, { seed: seed++ });
    // door-side indicator panel by the corridor door (east wall, forward of the hole)
    {
      const F = placer(kit, [X1, 0, 586.6], -Math.PI / 2);
      F.box("paintedMetal", 0, Y + 1.5, 0.05, 0.7, 0.9, 0.06, { color: black });
      indicatorField(F, 0, Y + 1.6, 0.09, 0.6, 0.5, seed++);
      F.box("emitRedImp", 0, Y + 1.15, 0.085, 0.4, 0.06, 0.01);
    }

    // ---- systems bay: two back-to-back cabinet islands on the open forward floor, fed from trays ------
    const islandX = [-11, -9.2, -7.4, -5.6];
    for (const zc of [581.5, 586.0]) {
      for (const x of islandX) {
        for (const s of [-1, 1]) {
          powerCabinet(kit, PALETTE, [x, Y, zc + s * 0.42], s > 0 ? 0 : Math.PI, { seed: seed++ });
          pipe(kit, PALETTE, [x + s * 0.35, Y + 2.4, zc + s * 0.42], [x + s * 0.35, trayY + 0.02, zc + s * 0.42], 0.08, { bracket: 3.2, color: s > 0 ? black : dark });
        }
      }
      cableTray(kit, PALETTE, [islandX[0] - 1.2, trayY, zc], [islandX[3] + 1.2, trayY, zc], { w: 0.7 });
      kit.boxMM("paintedMetal", [islandX[0] - 0.9, Y + 2.4, zc - 0.05], [islandX[3] + 0.9, Y + 2.55, zc + 0.05], { color: black, texel: 1 });
      floorLine(kit, [islandX[0] - 1.3, Y, zc - 1.3], [islandX[3] + 1.3, Y, zc - 1.3], 0.1, "emitAmber");
      floorLine(kit, [islandX[0] - 1.3, Y, zc + 1.3], [islandX[3] + 1.3, Y, zc + 1.3], 0.1, "emitAmber");
    }
    // walk lane: corridor door -> command post, with a branch aft along the open east side of the arcs
    // to the reactor door (hole x −0.2..2.2; lines stop 1.6 m short of the aft wall)
    floorLine(kit, [2.8, Y, 588.6], [-4.6, Y, 588.6], 0.12, "emitOrange");
    floorLine(kit, [2.8, Y, 591.4], [-4.6, Y, 591.4], 0.12, "emitOrange");
    floorLine(kit, [-0.4, Y, 591.5], [-0.4, Y, 610.9], 0.12, "emitOrange");
    floorLine(kit, [2.4, Y, 591.5], [2.4, Y, 610.9], 0.12, "emitOrange");
    // spares bay in front of the west mezzanine: hazard outline, crates
    hazardStrip(kit, [-23.5, 580.0], [-17.5, 580.4], Y + 0.005);
    hazardStrip(kit, [-23.5, 584.6], [-17.5, 585.0], Y + 0.005);
    crate(kit, PALETTE, [-22.4, Y, 581.6], 0.12, { seed: seed++ });
    crate(kit, PALETTE, [-22.4, Y + 1.2, 581.6], -0.1, { seed: seed++, w: 1.0, d: 1.0, h: 0.8 });
    crate(kit, PALETTE, [-20.8, Y, 583.4], -0.2, { seed: seed++ });
    crate(kit, PALETTE, [-18.7, Y, 581.7], 0.3, { seed: seed++, w: 1.0, d: 1.0, h: 1.0 });
    crate(kit, PALETTE, [-19.0, Y, 583.6], 0.05, { seed: seed++, w: 1.4, d: 1.0, h: 0.7 });
    crate(kit, PALETTE, [-20.5, Y, 581.4], 0.15, { seed: seed++ });
    crate(kit, PALETTE, [-20.5, Y + 1.2, 581.4], -0.1, { seed: seed++, w: 1.0, d: 1.0, h: 0.8 });

    // ---- ceiling: heavy trunks converging on the header, ducts, trays ------------------------------
    const trunkY = CEIL - 1.6;
    const trunks = [
      [[-26, trunkY, Z0 - 0.1], [-18.5, trunkY, Z1 - 0.9]],
      [[CX, trunkY, Z0 - 0.1], [CX, trunkY, Z1 - 0.9]],
      [[2, trunkY, Z0 - 0.1], [-6, trunkY, Z1 - 0.9]],
    ];
    for (const [a, b] of trunks) {
      pipe(kit, PALETTE, a, b, 0.3, { bracket: 6, color: dark, mat: "paintedMetal" });
      const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
      yawBox(kit, "paintedMetal", [a[0] + (b[0] - a[0]) * 0.02, trunkY, a[2] + (b[2] - a[2]) * 0.02], [0.9, 0.9, 0.5], yaw, { color: black });
      yawBox(kit, "paintedMetal", [a[0] + (b[0] - a[0]) * 0.985, trunkY, a[2] + (b[2] - a[2]) * 0.985], [0.9, 0.9, 0.5], yaw, { color: black });
      yawBox(kit, "emitAmber", [a[0] + (b[0] - a[0]) * 0.5, trunkY - 0.31, a[2] + (b[2] - a[2]) * 0.5], [0.08, 0.02, 12], yaw);
    }
    duct(kit, PALETTE, [-26.5, CEIL - 0.7, 580], [2.6, CEIL - 0.7, 580], 0.8, 0.45, { color: mid });
    duct(kit, PALETTE, [-26.5, CEIL - 0.7, 596], [2.6, CEIL - 0.7, 596], 0.8, 0.45, { color: mid });
    duct(kit, PALETTE, [-26.5, CEIL - 0.7, 580], [-26.5, CEIL - 0.7, 596], 0.8, 0.45, { color: mid });

    // ---- lights (shell fills off): warm pools over the arcs, cool over the command post -------------
    const L = (pos, color, intensity, distance, priority = 0.5) => ctx.lights.push({ type: "point", pos, color, intensity, distance, priority });
    L([CX, CEIL - 1.2, 605.5], 0xffb060, 36, 18, 0.7);
    L([CX - 9, CEIL - 1.2, 601], 0xffb060, 34, 18, 0.6);
    L([CX + 9, CEIL - 1.2, 601], 0xffb060, 34, 18, 0.6);
    L([CX, CEIL - 1.5, 591], 0xc4d2ff, 30, 16, 0.7);
    L([-24, CEIL - 0.8, 588], 0xffc890, 30, 16, 0.5);
    L([-20, CEIL - 0.9, 577.5], 0xffc890, 32, 16, 0.5);
    L([-1, CEIL - 1.0, 584], 0xffd0a0, 28, 16, 0.5);
    L([-14, Y + 2.6, 609.6], 0xff8a30, 14, 9, 0.4);
    L([1, CEIL - 1.2, 606], 0xffc890, 26, 14, 0.4);

    return {
      update(dt, t) {
        schematic.rotation.y = t * 0.35;
        schematic.position.y = Y + 0.95 + 0.22 + Math.sin(t * 0.8) * 0.03;
        holo.cone.rotation.y = -t * 0.1;
      },
    };
  },
});

// Long, low sill console under the window: black body, tilted screen strip, three dense indicator
// panels along the desk. Operator side = local +Z.
function sillConsole(kit, PALETTE, pos, yaw, { w = 6, seed = 1 } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const d = 0.9;
  const deskH = 0.78;
  const h = 1.12;
  P.box("paintedMetal", 0, deskH / 2, 0, w, deskH, d, { color: black, texel: 1 });
  P.box("paintedMetal", 0, 0.06, 0, w - 0.1, 0.12, d - 0.1, { color: dark });
  const slopeH = h - deskH;
  const tilt = -0.5;
  const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  P.add("paintedMetal", new THREE.BoxGeometry(w, slopeH + 0.08, 0.42), 0, deskH + slopeH / 2, -d / 2 + 0.26, { quat: tq, color: black, texel: 1 });
  const nz = 0.2 * Math.cos(tilt);
  const ny = -0.2 * Math.sin(tilt);
  const n = 4;
  const sw = (w - 0.3) / n - 0.1;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.15 + (i + 0.5) * ((w - 0.3) / n);
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.05, slopeH * 0.7 + 0.05, 0.02), { pos: P.world(x, deskH + slopeH * 0.5 + ny, -d / 2 + 0.26 + nz), quat: tq });
    kit.add(i % 2 ? "screenImp1" : "screenImp2", new THREE.BoxGeometry(sw, slopeH * 0.7, 0.02), { pos: P.world(x, deskH + slopeH * 0.5 + ny * 1.08, -d / 2 + 0.26 + nz * 1.08), quat: tq, uv: "keep" });
  }
  P.box("paintedMetal", 0, deskH + 0.005, 0.12, w - 0.1, 0.01, 0.6, { color: dark });
  for (let i = 0; i < 3; i++) indicatorField(P, -w / 3 + (i * w) / 3, deskH + 0.14, 0.05, w / 3 - 0.2, 0.22, seed + i);
  for (let i = 0; i < 14; i++) P.box(i % 3 === 0 ? "emitRedImp" : i % 3 === 1 ? "emitBlue" : "emitAmber", -w / 2 + 0.6 + i * ((w - 1.2) / 13), deskH + 0.03, 0.34, 0.06, 0.02, 0.06);
  P.box("emitBlue", 0, deskH - 0.03, d / 2 + 0.006, w - 0.3, 0.012, 0.01);
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "console");
  return P;
}
