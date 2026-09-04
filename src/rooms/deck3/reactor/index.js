// Deck 3 reactor chamber: an 88 m vertical volume around the main reactor column. The player walks a
// ring catwalk at y 12 (8 m wide), four radial bridges lead to the core service platform, and the pit
// below drops to y 4. The column is a stack of containment segments with slotted energy channels
// (pulsing), four coolant spines and radial struts to the walls; the pit holds pumps, ring conduits
// and floodlights; the catwalk is lined with consoles, valve stations, cabinets and racks. Amber /
// orange, heavy machinery, deep vertical volume (§11).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP, col } from "../../deck2/_shared/palette.js";
import { rail, WALL_T } from "../../deck2/_shared/shell.js";
import { console as consoleProp, pipe, cabinet, floorLine, hazardStrip, indicatorField, placer } from "../../deck2/_shared/props.js";
import { REACTOR_WINDOW } from "../engctl/index.js";
import { TAU, ring, strut, valveStation, toolRack, monitorPedestal, wallLamp, portalArch, cableTray, junctionBox, ventGrille, labelCrate } from "../engctl/engprops.js";

const Y = 12;
const PIT_Y = 4;
const CEIL = 100;
const CZ = 651.25; // chamber centre
const CORE_R = 9;
const PLAT_R = 13;
const WALK = 8; // catwalk ring width
const X0 = -36 + WALL_T;
const X1 = 36 - WALL_T;
const Z0 = 612.5 + WALL_T;
const Z1 = 690 - WALL_T;
const IX0 = X0 + WALK;
const IX1 = X1 - WALK;
const IZ0 = Z0 + WALK;
const IZ1 = Z1 - WALK;
const BW = 3.0; // bridge width

export default defineRoom({
  id: "d3-reactor",
  name: "Reactor Chamber",
  deck: 3,
  x: [-36, 36],
  z: [612.5, 690],
  y0: PIT_Y,
  ceil: CEIL,
  openings: [{ face: "n", ...REACTOR_WINDOW, glass: true, id: "reactor-engctl-window" }],
  spawn: { pos: [6.5, Y, 616], yaw: 180 },
  views: {
    "d3-reactor-entry": { pos: [6.5, Y, 616.5], yaw: 170, pitch: 14 },
    "d3-reactor-core": { pos: [-28.6, Y, 645], yaw: -75, pitch: 16 },
    "d3-reactor-bridge": { pos: [0, Y, 683.5], yaw: 0, pitch: 10 },
    "d3-reactor-pit": { pos: [-12, Y, 620.2], yaw: -155, pitch: -20 },
    "d3-reactor-engctl-door": { pos: [2.6, Y, 617.9], yaw: 6, pitch: 9 },
  },
  shell: {
    panelW: 3.2,
    rows: [0, 0.4, 2.05, 2.27, 6, 12, 20, 30, 42, 56, 70, 84, 87.45, 88],
    wallColor: IMP.impMid,
    wallAlt: IMP.impDark,
    stripMat: "emitAmber",
    floor: false,
    ceiling: { channels: 0, color: IMP.impBlack, panelW: 6 },
    lights: false,
    doorDressing: { accent: "emitAmber" },
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const P = (k) => col(PALETTE, k);
    const black = P("impBlack");
    const dark = P("impDark");
    const mid = P("impMid");
    const steel = P("steel");
    let seed = 300;
    // geometry for the pulsing white-hot channel mesh (core slots + collar line), built into one mesh below
    const chanGeos = [];

    // ---- pit floor, pit walls with ribs, hazard edges, trays ---------------------------------------
    kit.boxMM("impFloor", [X0, PIT_Y, Z0], [X1, PIT_Y + 0.5, Z1], { color: dark, texel: 0.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, 612.5], [36, Y, Z0], { color: dark, texel: 2.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, Z1], [36, Y, 690], { color: dark, texel: 2.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, Z0], [X0, Y, Z1], { color: dark, texel: 2.5 });
    kit.boxMM("paintedMetal", [X1, PIT_Y, Z0], [36, Y, Z1], { color: dark, texel: 2.5 });
    for (const y of [PIT_Y + 2.2, PIT_Y + 5.2]) {
      kit.boxMM("paintedMetal", [X0, y, Z0 + 0.45], [X0 + 0.45, y + 0.35, Z1 - 0.45], { color: black });
      kit.boxMM("paintedMetal", [X1 - 0.45, y, Z0 + 0.45], [X1, y + 0.35, Z1 - 0.45], { color: black });
      kit.boxMM("paintedMetal", [X0, y, Z0], [X1, y + 0.35, Z0 + 0.45], { color: black });
      kit.boxMM("paintedMetal", [X0, y, Z1 - 0.45], [X1, y + 0.35, Z1], { color: black });
    }
    hazardStrip(kit, [X0, Z0], [X1, Z0 + 0.7], PIT_Y + 0.505);
    hazardStrip(kit, [X0, Z1 - 0.7], [X1, Z1], PIT_Y + 0.505);
    hazardStrip(kit, [X0, Z0 + 0.7], [X0 + 0.7, Z1 - 0.7], PIT_Y + 0.505);
    hazardStrip(kit, [X1 - 0.7, Z0 + 0.7], [X1, Z1 - 0.7], PIT_Y + 0.505);
    cableTray(kit, PALETTE, [X0 + 0.5, PIT_Y + 3.6, Z0 + 1], [X0 + 0.5, PIT_Y + 3.6, Z1 - 1], { w: 0.7 });
    cableTray(kit, PALETTE, [X1 - 0.5, PIT_Y + 3.6, Z0 + 1], [X1 - 0.5, PIT_Y + 3.6, Z1 - 1], { w: 0.7 });
    cableTray(kit, PALETTE, [X0 + 1, PIT_Y + 3.6, Z0 + 0.5], [X1 - 1, PIT_Y + 3.6, Z0 + 0.5], { w: 0.7 });
    cableTray(kit, PALETTE, [X0 + 1, PIT_Y + 3.6, Z1 - 0.5], [X1 - 1, PIT_Y + 3.6, Z1 - 0.5], { w: 0.7 });
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      junctionBox(kit, PALETTE, [X0, PIT_Y + 1.2, Z0 + (Z1 - Z0) * t], Math.PI / 2, { seed: seed++, w: 0.7, h: 0.8 });
      junctionBox(kit, PALETTE, [X1, PIT_Y + 1.2, Z0 + (Z1 - Z0) * t], -Math.PI / 2, { seed: seed++, w: 0.7, h: 0.8 });
      ventGrille(kit, PALETTE, [X0 + (X1 - X0) * t, PIT_Y + 1.5, Z0], 0, { w: 1.6, h: 0.7 });
      ventGrille(kit, PALETTE, [X0 + (X1 - X0) * t, PIT_Y + 1.5, Z1], Math.PI, { w: 1.6, h: 0.7 });
    }

    // ---- lower service ring, ring conduits, pumps, floodlights -------------------------------------
    kit.cyl("impFloor", 0, PIT_Y + 0.65, CZ, 16, 0.3, "y", { color: 0x2a2d33, segments: 40, texel: 0.5 });
    kit.cyl("paintedMetal", 0, PIT_Y + 0.95, CZ, 16.05, 0.3, "y", { color: black, segments: 40, open: true });
    for (const [r, y] of [[11.3, PIT_Y + 1.7], [12.6, PIT_Y + 2.7]]) {
      ring(kit, "metal", [0, y, CZ], r, 0.36, "y", { color: steel, tubular: 48 });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + Math.PI / 8;
        kit.box("paintedMetal", Math.cos(a) * r, (PIT_Y + 0.8 + y) / 2, CZ + Math.sin(a) * r, 0.5, y - PIT_Y - 0.8, 0.5, { color: black, rot: [0, -a, 0] });
        kit.box("paintedMetal", Math.cos(a) * r, y, CZ + Math.sin(a) * r, 0.6, 0.9, 0.6, { color: dark, rot: [0, -a, 0] });
      }
    }
    const toCentre = (a) => Math.atan2(-Math.cos(a), -Math.sin(a));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + Math.PI / 12;
      const r = 20.5;
      pumpBlock(kit, PALETTE, [Math.cos(a) * r, PIT_Y + 0.5, CZ + Math.sin(a) * r], toCentre(a), seed++, k % 3);
      pipe(kit, PALETTE, [Math.cos(a) * 18.9, PIT_Y + 1.6, CZ + Math.sin(a) * 18.9], [Math.cos(a) * 12.7, PIT_Y + 2.7, CZ + Math.sin(a) * 12.7], 0.26, { bracket: 3, color: steel });
    }
    // lit core base: black collar (y 4.5..7.7) with an amber/orange emission band and a pulsing
    // white-hot centre line at 6.75..7.45 — above the two ring conduits, which hide anything lower on
    // the collar from the catwalk — plus glow slots near the deck, a hazard ring on the service deck
    // and eight coolant feed pipes radiating from the collar to the deck edge
    kit.cyl("paintedMetal", 0, PIT_Y + 1.6, CZ, 10.4, 3.2, "y", { color: black, segments: 40, texel: 2.5 });
    kit.cyl("emitAmber", 0, PIT_Y + 3.1, CZ, 10.46, 0.7, "y", { segments: 40, open: true });
    kit.cyl("emitOrange", 0, PIT_Y + 3.1, CZ, 10.49, 0.4, "y", { segments: 40, open: true });
    {
      const g = new THREE.CylinderGeometry(10.53, 10.53, 0.16, 40, 1, true);
      g.translate(0, PIT_Y + 3.1, CZ);
      chanGeos.push(g.toNonIndexed());
    }
    kit.cyl("paintedMetal", 0, PIT_Y + 3.6, CZ, 10.6, 0.3, "y", { color: dark, segments: 40, texel: 2.5 });
    kit.cyl("paintedMetal", 0, PIT_Y + 2.55, CZ, 10.6, 0.3, "y", { color: dark, segments: 40, texel: 2.5 });
    kit.cyl("paintedMetal", 0, PIT_Y + 0.6, CZ, 10.7, 0.3, "y", { color: dark, segments: 40, texel: 2.5 });
    for (let k = 0; k < 24; k++) {
      if (k % 6 === 3) continue; // coolant spines stand here
      const a = (k / 24) * TAU;
      kit.box(k % 2 ? "emitAmber" : "emitOrange", Math.cos(a) * 10.44, PIT_Y + 1.05, CZ + Math.sin(a) * 10.44, 0.5, 0.22, 0.1, { rot: [0, Math.PI / 2 - a, 0] });
    }
    kit.add("hazard", new THREE.RingGeometry(10.85, 11.55, 64), { pos: [0, PIT_Y + 0.958, CZ], rot: [-Math.PI / 2, 0, 0], texel: 2 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + (10 * Math.PI) / 180;
      const ux = Math.cos(a);
      const uz = Math.sin(a);
      const py = PIT_Y + 1.08;
      pipe(kit, PALETTE, [ux * 10.5, py, CZ + uz * 10.5], [ux * 15.7, py, CZ + uz * 15.7], 0.22, { bracket: 2, color: steel, segments: 10 });
      kit.cyl("paintedMetal", ux * 10.75, py, CZ + uz * 10.75, 0.34, 0.3, "x", { color: black, segments: 12, rot: [0, -a, Math.PI / 2] });
      kit.cyl("metal", ux * 15.7, py - 0.1, CZ + uz * 15.7, 0.22, 0.26, "y", { color: steel, segments: 10 });
      kit.cyl("paintedMetal", ux * 15.7, PIT_Y + 1.0, CZ + uz * 15.7, 0.3, 0.12, "y", { color: black, segments: 12 });
    }
    // corner heat exchangers with trunk lines into the outer ring conduit
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      const r = 30;
      exchanger(kit, PALETTE, [Math.cos(a) * r, PIT_Y + 0.5, CZ + Math.sin(a) * r], toCentre(a), seed++);
      pipe(kit, PALETTE, [Math.cos(a) * 26.8, PIT_Y + 2.4, CZ + Math.sin(a) * 26.8], [Math.cos(a) * 12.8, PIT_Y + 2.7, CZ + Math.sin(a) * 12.8], 0.32, { bracket: 4, color: dark, mat: "paintedMetal" });
    }
    // radial floor cable trays from the service ring outward, floodlights aimed at the column
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      const r0 = 16.4;
      const r1 = 31;
      const rm = (r0 + r1) / 2;
      kit.box("paintedMetal", Math.cos(a) * rm, PIT_Y + 0.58, CZ + Math.sin(a) * rm, r1 - r0, 0.16, 0.6, { color: black, rot: [0, -a, 0], texel: 2.5 });
      kit.box("paintedMetal", Math.cos(a) * rm, PIT_Y + 0.62, CZ + Math.sin(a) * rm, r1 - r0 - 0.4, 0.1, 0.44, { color: mid, rot: [0, -a, 0], texel: 2.5 });
    }
    // housed pit lamps high on the pit walls (hooded faces aimed down, hidden from the catwalk)
    for (const z of [CZ - 24, CZ - 8, CZ + 8, CZ + 24]) {
      wallLamp(kit, PALETTE, [X0, PIT_Y + 6.2, z], Math.PI / 2, { w: 1.1, tilt: 0.75 });
      wallLamp(kit, PALETTE, [X1, PIT_Y + 6.2, z], -Math.PI / 2, { w: 1.1, tilt: 0.75 });
    }
    for (const x of [-24, -8, 8, 24]) {
      wallLamp(kit, PALETTE, [x, PIT_Y + 6.2, Z0], 0, { w: 1.1, tilt: 0.75 });
      wallLamp(kit, PALETTE, [x, PIT_Y + 6.2, Z1], Math.PI, { w: 1.1, tilt: 0.75 });
    }
    // amber service-lane ring and hazard kerb around the pumps' lane
    kit.add("emitAmber", new THREE.RingGeometry(23.1, 23.3, 64), { pos: [0, PIT_Y + 0.508, CZ], rot: [-Math.PI / 2, 0, 0] });
    kit.add("emitAmber", new THREE.RingGeometry(16.6, 16.75, 64), { pos: [0, PIT_Y + 0.508, CZ], rot: [-Math.PI / 2, 0, 0] });

    // catwalk supports: pillars + beams under the ring's inner edge, props under the bridges, braces
    // from the column under the core platform (nothing walkable floats)
    const supportCol = (x, z, size = 0.6) => kit.boxMM("paintedMetal", [x - size / 2, PIT_Y + 0.5, z - size / 2], [x + size / 2, Y - 0.5, z + size / 2], { color: dark, texel: 2.5 });
    for (let z = IZ0 + 1.5; z < IZ1; z += 9.5) {
      if (Math.abs(z - CZ) < 3) continue;
      supportCol(IX0 + 0.45, z);
      supportCol(IX1 - 0.45, z);
    }
    for (let x = IX0 + 1.5; x < IX1; x += 9.5) {
      if (Math.abs(x) < 3) continue;
      supportCol(x, IZ0 + 0.45);
      supportCol(x, IZ1 - 0.45);
    }
    kit.boxMM("paintedMetal", [IX0, Y - 1.1, IZ0], [IX0 + 0.9, Y - 0.5, IZ1], { color: black, texel: 2.5 });
    kit.boxMM("paintedMetal", [IX1 - 0.9, Y - 1.1, IZ0], [IX1, Y - 0.5, IZ1], { color: black, texel: 2.5 });
    kit.boxMM("paintedMetal", [IX0 + 0.9, Y - 1.1, IZ0], [IX1 - 0.9, Y - 0.5, IZ0 + 0.9], { color: black, texel: 2.5 });
    kit.boxMM("paintedMetal", [IX0 + 0.9, Y - 1.1, IZ1 - 0.9], [IX1 - 0.9, Y - 0.5, IZ1], { color: black, texel: 2.5 });
    supportCol(20.3, CZ, 0.8);
    supportCol(-20.3, CZ, 0.8);
    supportCol(0, CZ + 20.3, 0.8);
    supportCol(0, CZ - 20.3, 0.8);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      strut(kit, "paintedMetal", [Math.cos(a) * 9.2, Y - 3.6, CZ + Math.sin(a) * 9.2], [Math.cos(a) * 12.4, Y - 0.6, CZ + Math.sin(a) * 12.4], 0.35, 0.35, { color: black });
    }

    // ---- ring catwalk, inner rails, bridges, core platform -----------------------------------------
    const deck = (a, b) => kit.boxMM("impFloor", [a[0], Y - 0.5, a[1]], [b[0], Y, b[1]], { color: mid, texel: 0.5 });
    deck([X0, Z0], [X1, IZ0]);
    deck([X0, IZ1], [X1, Z1]);
    deck([X0, IZ0], [IX0, IZ1]);
    deck([IX1, IZ0], [X1, IZ1]);
    // deck edge fascia + amber edge line
    kit.boxMM("paintedMetal", [IX0, Y - 0.5, IZ0], [IX1, Y - 0.35, IZ0 + 0.06], { color: black });
    kit.boxMM("paintedMetal", [IX0, Y - 0.5, IZ1 - 0.06], [IX1, Y - 0.35, IZ1], { color: black });
    kit.boxMM("paintedMetal", [IX0, Y - 0.5, IZ0], [IX0 + 0.06, Y - 0.35, IZ1], { color: black });
    kit.boxMM("paintedMetal", [IX1 - 0.06, Y - 0.5, IZ0], [IX1, Y - 0.35, IZ1], { color: black });
    const edge = 0.4;
    floorLine(kit, [IX0 + edge, Y, IZ0 + edge], [-BW / 2 - 0.9, Y, IZ0 + edge]);
    floorLine(kit, [BW / 2 + 0.9, Y, IZ0 + edge], [IX1 - edge, Y, IZ0 + edge]);
    floorLine(kit, [IX0 + edge, Y, IZ1 - edge], [-BW / 2 - 0.9, Y, IZ1 - edge]);
    floorLine(kit, [BW / 2 + 0.9, Y, IZ1 - edge], [IX1 - edge, Y, IZ1 - edge]);
    floorLine(kit, [IX0 + edge, Y, IZ0 + edge], [IX0 + edge, Y, CZ - BW / 2 - 0.9]);
    floorLine(kit, [IX0 + edge, Y, CZ + BW / 2 + 0.9], [IX0 + edge, Y, IZ1 - edge]);
    floorLine(kit, [IX1 - edge, Y, IZ0 + edge], [IX1 - edge, Y, CZ - BW / 2 - 0.9]);
    floorLine(kit, [IX1 - edge, Y, CZ + BW / 2 + 0.9], [IX1 - edge, Y, IZ1 - edge]);
    // inner-edge rails, broken where the bridges land
    rail(kit, PALETTE, [IX0, Y, IZ0], [-BW / 2, Y, IZ0], Y);
    rail(kit, PALETTE, [BW / 2, Y, IZ0], [IX1, Y, IZ0], Y);
    rail(kit, PALETTE, [IX0, Y, IZ1], [-BW / 2, Y, IZ1], Y);
    rail(kit, PALETTE, [BW / 2, Y, IZ1], [IX1, Y, IZ1], Y);
    rail(kit, PALETTE, [IX0, Y, IZ0], [IX0, Y, CZ - BW / 2], Y);
    rail(kit, PALETTE, [IX0, Y, CZ + BW / 2], [IX0, Y, IZ1], Y);
    rail(kit, PALETTE, [IX1, Y, IZ0], [IX1, Y, CZ - BW / 2], Y);
    rail(kit, PALETTE, [IX1, Y, CZ + BW / 2], [IX1, Y, IZ1], Y);

    // radial bridges with under-trusses, rails, portal arches at the ring landings
    // bridge: dark deck read as grating (steel cross-bars every 0.5 m over a black base), amber edge
    // strips, under-trusses
    const bridge = (a, b) => {
      kit.boxMM("impFloor", [a[0], Y - 0.5, a[1]], [b[0], Y - 0.02, b[1]], { color: black, texel: 0.5 });
      const alongX = b[0] - a[0] > b[1] - a[1];
      if (alongX) {
        for (const s of [-1, 1]) kit.boxMM("paintedMetal", [a[0], Y - 1.1, CZ + s * (BW / 2 - 0.2) - 0.1], [b[0], Y - 0.5, CZ + s * (BW / 2 - 0.2) + 0.1], { color: black, texel: 2.5 });
        for (let x = a[0] + 2; x < b[0] - 1; x += 4) kit.boxMM("paintedMetal", [x, Y - 1.1, CZ - BW / 2 + 0.1], [x + 0.2, Y - 0.5, CZ + BW / 2 - 0.1], { color: black });
        for (let x = a[0] + 0.3; x < b[0] - 0.1; x += 0.6) kit.boxMM("metal", [x - 0.03, Y - 0.02, CZ - BW / 2 + 0.25], [x + 0.03, Y, CZ + BW / 2 - 0.25], { color: mid });
        for (const s of [-1, 1]) {
          kit.boxMM("paintedMetal", [a[0], Y - 0.02, CZ + s * (BW / 2 - 0.12) - 0.12], [b[0], Y, CZ + s * (BW / 2 - 0.12) + 0.12], { color: dark });
          kit.boxMM("emitAmber", [a[0] + 0.3, Y, CZ + s * (BW / 2 - 0.12) - 0.03], [b[0] - 0.3, Y + 0.006, CZ + s * (BW / 2 - 0.12) + 0.03]);
        }
      } else {
        for (const s of [-1, 1]) kit.boxMM("paintedMetal", [s * (BW / 2 - 0.2) - 0.1, Y - 1.1, a[1]], [s * (BW / 2 - 0.2) + 0.1, Y - 0.5, b[1]], { color: black, texel: 2.5 });
        for (let z = a[1] + 2; z < b[1] - 1; z += 4) kit.boxMM("paintedMetal", [-BW / 2 + 0.1, Y - 1.1, z], [BW / 2 - 0.1, Y - 0.5, z + 0.2], { color: black });
        for (let z = a[1] + 0.3; z < b[1] - 0.1; z += 0.6) kit.boxMM("metal", [-BW / 2 + 0.25, Y - 0.02, z - 0.03], [BW / 2 - 0.25, Y, z + 0.03], { color: mid });
        for (const s of [-1, 1]) {
          kit.boxMM("paintedMetal", [s * (BW / 2 - 0.12) - 0.12, Y - 0.02, a[1]], [s * (BW / 2 - 0.12) + 0.12, Y, b[1]], { color: dark });
          kit.boxMM("emitAmber", [s * (BW / 2 - 0.12) - 0.03, Y, a[1] + 0.3], [s * (BW / 2 - 0.12) + 0.03, Y + 0.006, b[1] - 0.3]);
        }
      }
    };
    bridge([PLAT_R - 0.5, CZ - BW / 2], [IX1, CZ + BW / 2]);
    bridge([IX0, CZ - BW / 2], [-PLAT_R + 0.5, CZ + BW / 2]);
    bridge([-BW / 2, PLAT_R - 0.5 + CZ], [BW / 2, IZ1]);
    bridge([-BW / 2, IZ0], [BW / 2, CZ - PLAT_R + 0.5]);
    for (const s of [-1, 1]) {
      rail(kit, PALETTE, [PLAT_R, Y, CZ + (s * BW) / 2], [IX1, Y, CZ + (s * BW) / 2], Y);
      rail(kit, PALETTE, [IX0, Y, CZ + (s * BW) / 2], [-PLAT_R, Y, CZ + (s * BW) / 2], Y);
      rail(kit, PALETTE, [(s * BW) / 2, Y, CZ + PLAT_R], [(s * BW) / 2, Y, IZ1], Y);
      rail(kit, PALETTE, [(s * BW) / 2, Y, IZ0], [(s * BW) / 2, Y, CZ - PLAT_R], Y);
    }
    // (each gantry carries a hooded floodlight aimed down its bridge; the amber pool lights sit under them)
    portalArch(kit, PALETTE, [IX0 + 0.45, Y, CZ], Math.PI / 2, { lamp: 1 });
    portalArch(kit, PALETTE, [IX1 - 0.45, Y, CZ], Math.PI / 2, { lamp: -1 });
    portalArch(kit, PALETTE, [0, Y, IZ0 + 0.45], 0, { lamp: 1 });
    portalArch(kit, PALETTE, [0, Y, IZ1 - 0.45], 0, { lamp: -1 });

    // core platform ring with edge posts, kerb, hatches and monitor pedestals
    kit.cyl("impFloor", 0, Y - 0.25, CZ, PLAT_R, 0.5, "y", { color: mid, segments: 48, texel: 0.5 });
    kit.cyl("paintedMetal", 0, Y - 0.42, CZ, PLAT_R + 0.03, 0.16, "y", { color: black, segments: 48, open: true });
    kit.cyl("paintedMetal", 0, Y + 0.15, CZ, CORE_R + 0.35, 0.3, "y", { color: black, segments: 32 });
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU;
      const a1 = ((i + 1) / n) * TAU;
      const am = (a0 + a1) / 2;
      if (Math.abs(Math.sin(am)) < 0.2 || Math.abs(Math.cos(am)) < 0.2) continue; // bridge landings
      const p0 = [Math.cos(a0) * PLAT_R, Y, CZ + Math.sin(a0) * PLAT_R];
      const p1 = [Math.cos(a1) * PLAT_R, Y, CZ + Math.sin(a1) * PLAT_R];
      const len = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
      const rot = [0, -Math.atan2(p1[2] - p0[2], p1[0] - p0[0]), Math.PI / 2];
      kit.cyl("metal", (p0[0] + p1[0]) / 2, Y + 1.02, (p0[2] + p1[2]) / 2, 0.03, len, "x", { color: steel, segments: 8, rot });
      kit.cyl("metal", (p0[0] + p1[0]) / 2, Y + 0.56, (p0[2] + p1[2]) / 2, 0.018, len, "x", { color: dark, segments: 8, rot });
      kit.box("paintedMetal", p0[0], Y + 0.51, p0[2], 0.06, 1.02, 0.06, { color: dark });
      kit.box("paintedMetal", p1[0], Y + 0.51, p1[2], 0.06, 1.02, 0.06, { color: dark });
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      const r = 11.6;
      monitorPedestal(kit, PALETTE, [Math.cos(a) * r, Y, CZ + Math.sin(a) * r], Math.atan2(Math.cos(a), Math.sin(a)), { screenMat: "screenImp2" });
      const ha = (k / 4) * TAU + Math.PI / 4 + Math.PI / 8;
      kit.box("paintedMetal", Math.cos(ha) * 10.4, Y + 0.03, CZ + Math.sin(ha) * 10.4, 1.4, 0.05, 1.0, { color: black, rot: [0, -ha, 0] });
      kit.box("emitAmber", Math.cos(ha) * 10.4, Y + 0.06, CZ + Math.sin(ha) * 10.4, 1.2, 0.01, 0.06, { rot: [0, -ha, 0] });
    }
    kit.collider([-CORE_R - 0.4, Y, CZ - CORE_R - 0.4], [CORE_R + 0.4, Y + 3, CZ + CORE_R + 0.4], "core");

    // ---- the column: stacked containment segments, slotted energy channels, spines, struts, collar --
    // Energy channels: layered emissive core behind deep slotted grilles — amber rim (full band),
    // orange mid band, and a pulsing white-hot centre band on its own cloned material.
    let y = PIT_Y + 0.5;
    const CHANNELS = new Set([3, 8, 13]);
    for (let i = 0; i < 16; i++) {
      if (CHANNELS.has(i)) {
        const h = 4.0;
        kit.cyl("emitAmber", 0, y + h / 2, CZ, 8.8, h - 0.3, "y", { segments: 32, open: true });
        kit.cyl("emitOrange", 0, y + h / 2, CZ, 8.84, 2.2, "y", { segments: 32, open: true });
        const g = new THREE.CylinderGeometry(8.88, 8.88, 1.0, 32, 1, true);
        g.translate(0, y + h / 2, CZ);
        chanGeos.push(g.toNonIndexed());
        const ns = 36;
        for (let k = 0; k < ns; k++) {
          const a = (k / ns) * TAU;
          kit.box("paintedMetal", Math.cos(a) * 9.2, y + h / 2, CZ + Math.sin(a) * 9.2, 0.7, h - 0.5, 0.56, { color: black, rot: [0, Math.PI / 2 - a, 0], texel: 2.5 });
        }
        kit.cyl("paintedMetal", 0, y + 0.2, CZ, 9.5, 0.4, "y", { color: black, segments: 32, texel: 2.5 });
        kit.cyl("paintedMetal", 0, y + h - 0.2, CZ, 9.5, 0.4, "y", { color: black, segments: 32, texel: 2.5 });
        y += h;
      } else {
        const h = 5.7;
        const wide = i % 2 === 1;
        const r = wide ? 9.6 : 9.0;
        kit.cyl("paintedMetal", 0, y + h / 2, CZ, r, h, "y", { color: wide ? dark : mid, segments: 32, texel: 2.5 });
        if (wide) {
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * TAU;
            kit.box("paintedMetal", Math.cos(a) * 9.55, y + h / 2, CZ + Math.sin(a) * 9.55, 0.7, h - 0.6, 0.3, { color: black, rot: [0, Math.PI / 2 - a, 0] });
          }
        } else if (i > 0) {
          // (segment 0's band would sit inside the core-base collar)
          kit.cyl("emitAmber", 0, y + h / 2, CZ, r + 0.07, 0.12, "y", { segments: 32, open: true });
          kit.cyl("paintedMetal", 0, y + h / 2, CZ, r + 0.03, 0.4, "y", { color: black, segments: 32, open: true });
        }
        y += h;
      }
      kit.cyl("paintedMetal", 0, y + 0.15, CZ, 9.85, 0.3, "y", { color: black, segments: 32 });
      y += 0.3;
    }
    // glowing top collar and ceiling socket
    kit.cyl("paintedMetal", 0, y + 1.0, CZ, 10.2, 2.0, "y", { color: dark, segments: 32, texel: 2.5 });
    kit.cyl("emitAmber", 0, y + 1.0, CZ, 10.3, 0.5, "y", { segments: 32, open: true });
    kit.cyl("emitWhite", 0, y + 1.0, CZ, 10.34, 0.12, "y", { segments: 32, open: true });
    kit.cyl("paintedMetal", 0, y + 2.4, CZ, 9.2, 0.8, "y", { color: black, segments: 32, texel: 2.5 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      kit.box("paintedMetal", Math.cos(a) * 10.4, y + 1.6, CZ + Math.sin(a) * 10.4, 1.0, 2.6, 0.5, { color: black, rot: [0, Math.PI / 2 - a, 0] });
    }
    kit.cyl("paintedMetal", 0, (y + 2.8 + CEIL) / 2, CZ, 11, CEIL - y - 2.8, "y", { color: black, segments: 32 });
    const collarY = y + 1.0;
    // coolant spines at 45° with clamps and column ties
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      const r = 10.5;
      const sx = Math.cos(a) * r;
      const sz = CZ + Math.sin(a) * r;
      kit.cyl("metal", sx, (PIT_Y + 0.5 + collarY) / 2, sz, 0.6, collarY - PIT_Y - 0.5, "y", { color: steel, segments: 14, texel: 0.5 });
      for (let cy = PIT_Y + 4.6; cy < collarY - 1; cy += 9) {
        kit.cyl("paintedMetal", sx, cy, sz, 0.78, 0.5, "y", { color: black, segments: 14 });
        kit.box("paintedMetal", Math.cos(a) * 9.9, cy, CZ + Math.sin(a) * 9.9, 0.5, 0.4, 1.2, { color: black, rot: [0, Math.PI / 2 - a, 0] });
      }
      kit.collider([sx - 0.75, Y, sz - 0.75], [sx + 0.75, Y + 3, sz + 0.75], "spine");
    }
    // radial struts to the walls at y 35 and y 65
    for (const sy of [35, 65]) {
      const flange = (min, max) => kit.boxMM("paintedMetal", min, max, { color: black, texel: 2.5 });
      const glow = (a, b) => kit.boxMM("emitOrange", a, b);
      kit.boxMM("paintedMetal", [9.4, sy - 0.75, CZ - 0.75], [X1 + 0.05, sy + 0.75, CZ + 0.75], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [X0 - 0.05, sy - 0.75, CZ - 0.75], [-9.4, sy + 0.75, CZ + 0.75], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [-0.75, sy - 0.75, CZ + 9.4], [0.75, sy + 0.75, Z1 + 0.05], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [-0.75, sy - 0.75, Z0 - 0.05], [0.75, sy + 0.75, CZ - 9.4], { color: dark, texel: 2.5 });
      flange([9.4, sy - 1.15, CZ - 1.15], [10.1, sy + 1.15, CZ + 1.15]);
      flange([-10.1, sy - 1.15, CZ - 1.15], [-9.4, sy + 1.15, CZ + 1.15]);
      flange([-1.15, sy - 1.15, CZ + 9.4], [1.15, sy + 1.15, CZ + 10.1]);
      flange([-1.15, sy - 1.15, CZ - 10.1], [1.15, sy + 1.15, CZ - 9.4]);
      flange([X1 - 0.7, sy - 1.15, CZ - 1.15], [X1, sy + 1.15, CZ + 1.15]);
      flange([X0, sy - 1.15, CZ - 1.15], [X0 + 0.7, sy + 1.15, CZ + 1.15]);
      flange([-1.15, sy - 1.15, Z1 - 0.7], [1.15, sy + 1.15, Z1]);
      flange([-1.15, sy - 1.15, Z0], [1.15, sy + 1.15, Z0 + 0.7]);
      glow([10.2, sy - 0.79, CZ - 0.05], [X1 - 0.8, sy - 0.75, CZ + 0.05]);
      glow([X0 + 0.8, sy - 0.79, CZ - 0.05], [-10.2, sy - 0.75, CZ + 0.05]);
      glow([-0.05, sy - 0.79, CZ + 10.2], [0.05, sy - 0.75, Z1 - 0.8]);
      glow([-0.05, sy - 0.79, Z0 + 0.8], [0.05, sy - 0.75, CZ - 10.2]);
    }
    // pulsing white-hot channel centres: one mesh, cloned emissive material (intensity 2.5–3.5)
    const chanMat = ctx.materials.emitWhite.clone();
    chanMat.emissiveIntensity = 3.0;
    const channel = new THREE.Mesh(mergeGeometries(chanGeos, false), chanMat);
    ctx.group.add(channel);

    // ---- walls: vertical pipes, conduit bands, ring ledges at y 40 / 70 -----------------------------
    const pipeTop = collarY - 2;
    for (const z of [624.5, 638, 664.5, 678]) {
      pipe(kit, PALETTE, [X0 + 0.35, Y + 0.3, z], [X0 + 0.35, pipeTop, z], 0.15, { bracket: 12, color: steel });
      pipe(kit, PALETTE, [X1 - 0.35, Y + 0.3, z], [X1 - 0.35, pipeTop, z], 0.15, { bracket: 12, color: steel });
    }
    for (const x of [-34.6, 14, 22, 34.6]) pipe(kit, PALETTE, [x, Y + 0.3, Z0 + 0.35], [x, pipeTop, Z0 + 0.35], 0.15, { bracket: 12, color: steel });
    for (const x of [-32, -18, -8, 8, 18, 32]) pipe(kit, PALETTE, [x, Y + 0.3, Z1 - 0.35], [x, pipeTop, Z1 - 0.35], 0.15, { bracket: 12, color: steel });
    for (const by of [20, 37, 60]) {
      kit.boxMM("paintedMetal", [X0 + 0.05, by - 0.25, Z0 + 0.6], [X0 + 0.55, by + 0.25, Z1 - 0.6], { color: black, texel: 2.5 });
      kit.boxMM("paintedMetal", [X1 - 0.55, by - 0.25, Z0 + 0.6], [X1 - 0.05, by + 0.25, Z1 - 0.6], { color: black, texel: 2.5 });
      kit.boxMM("paintedMetal", [X0, by - 0.25, Z0 + 0.05], [X1, by + 0.25, Z0 + 0.55], { color: black, texel: 2.5 });
      kit.boxMM("paintedMetal", [X0, by - 0.25, Z1 - 0.55], [X1, by + 0.25, Z1 - 0.05], { color: black, texel: 2.5 });
      kit.boxMM("emitAmber", [X0 + 0.56, by - 0.03, Z0 + 1.5], [X0 + 0.58, by + 0.03, Z1 - 1.5]);
      kit.boxMM("emitAmber", [X1 - 0.58, by - 0.03, Z0 + 1.5], [X1 - 0.56, by + 0.03, Z1 - 1.5]);
      kit.boxMM("emitAmber", [X0 + 1.5, by - 0.03, Z0 + 0.56], [X1 - 1.5, by + 0.03, Z0 + 0.58]);
      kit.boxMM("emitAmber", [X0 + 1.5, by - 0.03, Z1 - 0.58], [X1 - 1.5, by + 0.03, Z1 - 0.56]);
    }
    // ring walkways receding up the shaft (y 25 … 85): ledge, fascia, edge glow line, rail, and
    // small marker lamps every 6 m on the fascia (amber / white alternating per ring) so the 88 m reads
    for (const [ri, ly] of [25, 40, 55, 70, 85].entries()) {
      const L = 1.5;
      const lamp = ri % 2 ? "emitWhite" : "emitAmber";
      kit.boxMM("impFloor", [X0, ly - 0.4, Z0], [X1, ly, Z0 + L], { color: dark, texel: 0.5 });
      kit.boxMM("impFloor", [X0, ly - 0.4, Z1 - L], [X1, ly, Z1], { color: dark, texel: 0.5 });
      kit.boxMM("impFloor", [X0, ly - 0.4, Z0 + L], [X0 + L, ly, Z1 - L], { color: dark, texel: 0.5 });
      kit.boxMM("impFloor", [X1 - L, ly - 0.4, Z0 + L], [X1, ly, Z1 - L], { color: dark, texel: 0.5 });
      kit.boxMM("paintedMetal", [X0 + L, ly - 0.75, Z0 + L], [X0 + L + 0.04, ly, Z1 - L], { color: black });
      kit.boxMM("paintedMetal", [X1 - L - 0.04, ly - 0.75, Z0 + L], [X1 - L, ly, Z1 - L], { color: black });
      kit.boxMM("paintedMetal", [X0 + L, ly - 0.75, Z0 + L], [X1 - L, ly, Z0 + L + 0.04], { color: black });
      kit.boxMM("paintedMetal", [X0 + L, ly - 0.75, Z1 - L - 0.04], [X1 - L, ly, Z1 - L], { color: black });
      kit.boxMM("emitAmber", [X0 + L + 0.04, ly - 0.3, Z0 + L], [X0 + L + 0.06, ly - 0.24, Z1 - L]);
      kit.boxMM("emitAmber", [X1 - L - 0.06, ly - 0.3, Z0 + L], [X1 - L - 0.04, ly - 0.24, Z1 - L]);
      kit.boxMM("emitAmber", [X0 + L, ly - 0.3, Z0 + L + 0.04], [X1 - L, ly - 0.24, Z0 + L + 0.06]);
      kit.boxMM("emitAmber", [X0 + L, ly - 0.3, Z1 - L - 0.06], [X1 - L, ly - 0.24, Z1 - L - 0.04]);
      for (let z = Z0 + L + 3; z < Z1 - L - 2; z += 9) {
        kit.box(lamp, X0 + L + 0.07, ly - 0.58, z, 0.02, 0.14, 0.5);
        kit.box(lamp, X1 - L - 0.07, ly - 0.58, z, 0.02, 0.14, 0.5);
      }
      for (let x = X0 + L + 3; x < X1 - L - 2; x += 9) {
        kit.box(lamp, x, ly - 0.58, Z0 + L + 0.07, 0.5, 0.14, 0.02);
        kit.box(lamp, x, ly - 0.58, Z1 - L - 0.07, 0.5, 0.14, 0.02);
      }
      rail(kit, PALETTE, [X0 + L - 0.06, ly, Z0 + L], [X0 + L - 0.06, ly, Z1 - L], ly, { post: 4.8 });
      rail(kit, PALETTE, [X1 - L + 0.06, ly, Z0 + L], [X1 - L + 0.06, ly, Z1 - L], ly, { post: 4.8 });
      rail(kit, PALETTE, [X0 + L, ly, Z0 + L - 0.06], [X1 - L, ly, Z0 + L - 0.06], ly, { post: 4.8 });
      rail(kit, PALETTE, [X0 + L, ly, Z1 - L + 0.06], [X1 - L, ly, Z1 - L + 0.06], ly, { post: 4.8 });
      // corner light masts on the ledge
      for (const [cx, cz] of [[X0 + 0.75, Z0 + 0.75], [X1 - 0.75, Z0 + 0.75], [X0 + 0.75, Z1 - 0.75], [X1 - 0.75, Z1 - 0.75]]) {
        kit.box("paintedMetal", cx, ly + 1.2, cz, 0.16, 2.4, 0.16, { color: black });
        kit.box("paintedMetal", cx, ly + 2.5, cz, 0.5, 0.2, 0.5, { color: dark });
        kit.box(lamp, cx, ly + 2.38, cz, 0.36, 0.04, 0.36);
      }
    }

    // ---- catwalk kit along the outer walls (facing the core) ----------------------------------------
    // Each wall: [along-coordinate, kind]. Forward wall keeps the doors (blast x 3.5..9.5, engctl door
    // x −1.2..3.2) and the engctl window (x −26..−2, above y 13.2: low items only) clear; aft wall keeps
    // x −3..3 clear.
    const westList = [
      [618, "crates"],
      [622, "valve"],
      [627, "console"],
      [631.7, "cabinets"],
      [636, "rack"],
      [641, "console"],
      [645.5, "valve"],
      [657, "console"],
      [661.7, "cabinets"],
      [666, "crates"],
      [670, "valve"],
      [675, "rack"],
      [680, "console"],
      [685, "cabinet"],
    ];
    const eastList = [
      [617.5, "cabinet"],
      [621.5, "console"],
      [626.5, "rack"],
      [631, "valve"],
      [635.5, "crates"],
      [641, "cabinets"],
      [646, "console"],
      [657, "valve"],
      [661.5, "console"],
      [667, "rack"],
      [671.5, "cabinets"],
      [675.5, "console"],
      [680.5, "valve"],
      [685, "crates"],
    ];
    const place = (kind, pos, yawWall, yawRoom, depthFn) => {
      // pos(d): world position of an item whose back is at the wall face, given its depth-from-wall offset
      switch (kind) {
        case "console":
          consoleProp(kit, PALETTE, pos(1.6), yawWall, { w: 2.4, screens: 2, seed: seed++, screenMat: seed % 2 ? "screenImp1" : "screenImp3" });
          break;
        case "cabinet":
          cabinet(kit, PALETTE, pos(0.28), yawRoom, { seed: seed++, emit: seed % 3 ? "emitBlue" : "emitAmber" });
          break;
        case "cabinets":
          cabinet(kit, PALETTE, depthFn(0.28, -0.7), yawRoom, { seed: seed++ });
          cabinet(kit, PALETTE, depthFn(0.28, 0.7), yawRoom, { seed: seed++, emit: "emitAmber" });
          break;
        case "rack":
          toolRack(kit, PALETTE, pos(0.06), yawRoom, { seed: seed++ });
          break;
        case "valve":
          valveStation(kit, PALETTE, pos(0.05), yawRoom);
          break;
        case "crates":
          labelCrate(kit, PALETTE, pos(0.68), yawRoom + 0.08, { seed: seed++ });
          labelCrate(kit, PALETTE, depthFn(0.7, 1.3), yawRoom - 0.12, { seed: seed++, w: 1.0, h: 1.0, d: 1.0 });
          labelCrate(kit, PALETTE, depthFn(0.68, 0, 1.2), yawRoom + 0.25, { seed: seed++, w: 1.0, h: 0.8, d: 1.0 });
          break;
      }
    };
    for (const [z, k] of westList) place(k, (d) => [X0 + d, Y, z], -Math.PI / 2, Math.PI / 2, (d, dz, dy = 0) => [X0 + d, Y + dy, z + dz]);
    for (const [z, k] of eastList) place(k, (d) => [X1 - d, Y, z], Math.PI / 2, -Math.PI / 2, (d, dz, dy = 0) => [X1 - d, Y + dy, z + dz]);
    const fwdList = [
      [-33, "cabinet"],
      [-30.3, "rack"],
      [-22, "console"],
      [-18, "console"],
      [-12, "console"],
      [-6.5, "console"],
      [12, "valve"],
      [15.7, "cabinets"],
      [20, "rack"],
      [25, "console"],
      [29.5, "cabinet"],
      [33, "cabinet"],
    ];
    for (const [x, k] of fwdList) place(k, (d) => [x, Y, Z0 + d], Math.PI, 0, (d, dx, dy = 0) => [x + dx, Y + dy, Z0 + d]);
    const aftList = [
      [-33.5, "cabinet"],
      [-30, "crates"],
      [-25, "console"],
      [-20, "rack"],
      [-15.5, "cabinets"],
      [-11, "valve"],
      [-6, "console"],
      [6, "console"],
      [11, "valve"],
      [15.5, "cabinets"],
      [20, "rack"],
      [25, "console"],
      [30, "crates"],
      [33.5, "cabinet"],
    ];
    for (const [x, k] of aftList) place(k, (d) => [x, Y, Z1 - d], 0, Math.PI, (d, dx, dy = 0) => [x + dx, Y + dy, Z1 - d]);
    // status panels flanking the doors: blast door (x 10.3), engctl door (x −1.6, on the 1.8 m strip
    // between the window edge x −2 and the hole x −0.2), hyperdrive door (±4); the two under the engctl
    // window stay below its sill at y 13.2
    for (const [x, z, yaw, yc, w] of [[10.3, Z0, 0, Y + 1.5, 0.7], [-1.6, Z0, 0, Y + 1.5, 0.6], [-8.6, Z0, 0, Y + 0.65, 0.7], [-15.4, Z0, 0, Y + 0.65, 0.7], [-4.0, Z1, Math.PI, Y + 1.5, 0.7], [4.0, Z1, Math.PI, Y + 1.5, 0.7]]) {
      const F = placer(kit, [x, 0, z], yaw);
      F.box("paintedMetal", 0, yc, 0.05, w, 0.9, 0.06, { color: black });
      indicatorField(F, 0, yc + 0.1, 0.09, w - 0.1, 0.5, seed++);
      F.box(x > 0 ? "emitRedImp" : "emitAmber", 0, yc - 0.34, 0.085, w - 0.3, 0.06, 0.01);
    }
    // under-sill conduit along the engctl window wall, behind the consoles
    pipe(kit, PALETTE, [-25.5, Y + 0.95, Z0 + 0.25], [-2.6, Y + 0.95, Z0 + 0.25], 0.1, { bracket: 4, color: steel, segments: 10 });
    // corner crates on the ring
    labelCrate(kit, PALETTE, [X0 + 0.75, Y, Z1 - 0.75], 0.2, { seed: seed++ });
    labelCrate(kit, PALETTE, [X1 - 0.75, Y, Z0 + 0.75], -0.15, { seed: seed++ });
    // heavy door surround on the forward wall: structural pier between the engctl door (x −0.2..2.2)
    // and the blast door (x 4.5..8.5) above the shell's keypad/sign, a header beam over both doors
    // with an amber strip, vent + conduit drop on the pier (covers the bare shell panels there)
    // (clean painted face plates over the pier and the beam: the worn-metal map reads as stained
    // concrete at this size even at texel 2.5)
    kit.boxMM("paintedMetal", [2.45, Y + 2.6, Z0], [4.25, Y + 5.4, Z0 + 0.14], { color: dark, texel: 2.5 });
    kit.boxMM("impPanel", [2.53, Y + 2.68, Z0 + 0.14], [4.17, Y + 5.32, Z0 + 0.152], { color: mid, uv: "keep" });
    ventGrille(kit, PALETTE, [3.35, Y + 3.3, Z0 + 0.152], 0, { w: 1.3, h: 0.7 });
    junctionBox(kit, PALETTE, [3.35, Y + 4.1, Z0 + 0.152], 0, { seed: seed++, w: 0.6, h: 0.5 });
    kit.boxMM("paintedMetal", [-1.0, Y + 5.4, Z0], [9.6, Y + 6.3, Z0 + 0.6], { color: dark, texel: 2.5 });
    kit.boxMM("impPanel", [-0.92, Y + 5.48, Z0 + 0.6], [9.52, Y + 6.22, Z0 + 0.612], { color: dark, uv: "keep" });
    kit.boxMM("paintedMetal", [-1.0, Y + 5.3, Z0], [9.6, Y + 5.4, Z0 + 0.66], { color: black });
    kit.boxMM("emitAmber", [-0.6, Y + 5.85, Z0 + 0.612], [9.2, Y + 5.95, Z0 + 0.632]);
    for (const x of [-0.4, 3.35, 9.0]) kit.boxMM("paintedMetal", [x - 0.25, Y + 6.3, Z0], [x + 0.25, Y + 8.0, Z0 + 0.5], { color: black, texel: 2.5 });

    // ---- lights: amber pools by the core, cool fills at the corners, amber core-base glow in the pit,
    // two mid-height shaft lights, a top light and a warm pool at the forward door approach (14) --------
    const L = (pos, color, intensity, distance, priority = 0.5) => ctx.lights.push({ type: "point", pos, color, intensity, distance, priority });
    // amber pools: spots in the four gantry lamp heads aimed almost straight down at the bridge decks.
    // A point light anywhere on a bridge axis mirrors off the column as a round dot exactly on the
    // axis of the entry/bridge views; a 57° cone leaning 11° toward the core never reaches the column
    // above the service platform, so the pool reads as the lamp's own light and the drum stays clean.
    for (const [gx, gz] of [[IX0 + 0.45, CZ], [IX1 - 0.45, CZ], [0, IZ0 + 0.45], [0, IZ1 - 0.45]]) {
      const len = Math.hypot(-gx, CZ - gz);
      const ux = -gx / len;
      const uz = (CZ - gz) / len;
      ctx.lights.push({ type: "spot", pos: [gx + ux * 0.4, Y + 4.0, gz + uz * 0.4], target: [gx + ux * 1.2, Y, gz + uz * 1.2], color: 0xffa040, intensity: 100, distance: 30, angle: 1.0, penumbra: 0.5, priority: 0.8 });
    }
    for (const [x, z] of [[X0 + 4, Z0 + 4], [X1 - 4, Z0 + 4], [X0 + 4, Z1 - 4], [X1 - 4, Z1 - 4]]) L([x, Y + 6, z], 0xcfd8ff, 50, 30, 0.5);
    L([0, CEIL - 10, CZ], 0xffb060, 200, 80, 0.4);
    L([13, PIT_Y + 2.6, CZ], 0xffa040, 110, 36, 0.6);
    L([-13, PIT_Y + 2.6, CZ], 0xffa040, 110, 36, 0.6);
    L([-18, 52, CZ], 0xffa040, 140, 50, 0.3);
    L([18, 78, CZ], 0xffb060, 140, 50, 0.3);
    L([3, Y + 3.6, Z0 + 3], 0xffc890, 30, 14, 0.4);

    return {
      update(dt, t) {
        chanMat.emissiveIntensity = 3.0 + 0.4 * Math.sin(t * 1.3) + 0.1 * Math.sin(t * 4.1);
      },
    };
  },
});

// Pit heat exchanger: long plinth, finned body, three drums on top, manifold toward the core. Front = +Z.
function exchanger(kit, PALETTE, pos, yaw, seed) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const mid = col(PALETTE, "impMid");
  const steel = col(PALETTE, "steel");
  P.box("paintedMetal", 0, 0.2, 0, 7.4, 0.4, 5.2, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, 2.1, 0, 6.4, 3.4, 4.2, { color: dark, texel: 2.5 });
  for (let i = 0; i < 7; i++) P.box("paintedMetal", 0, 0.9 + i * 0.4, 0, 6.8, 0.1, 4.6, { color: mid, texel: 2.5 });
  P.box("paintedMetal", 0, 3.9, 0, 6.6, 0.2, 4.4, { color: black });
  for (const x of [-2.1, 0, 2.1]) {
    P.cyl("metal", x, 4.9, 0, 0.9, 4.0, "z", { color: steel, segments: 16, texel: 0.5 });
    P.cyl("paintedMetal", x, 4.9, 1.6, 0.98, 0.25, "z", { color: black, segments: 16 });
    P.cyl("paintedMetal", x, 4.9, -1.6, 0.98, 0.25, "z", { color: black, segments: 16 });
  }
  P.cyl("metal", 0, 4.9, 2.3, 0.3, 4.6, "x", { color: steel, segments: 12 });
  P.cyl("metal", 0, 1.9, 2.4, 0.32, 3.4, "y", { color: steel, segments: 12 });
  P.box("emitAmber", -2.4, 2.6, 2.11, 1.2, 0.08, 0.01);
  P.box("emitRedImp", -2.4, 2.4, 2.11, 0.3, 0.08, 0.01);
  indicatorField(P, 2.2, 2.6, 2.11, 1.4, 0.3, seed);
  for (let i = 0; i < 6; i++) P.box("paintedMetal", 2.2, 0.8 + i * 0.12, 2.11, 1.6, 0.04, 0.02, { color: black });
}

// Pit pump block: plinth, body, tangential motor drum, top valve wheel and a status lamp. Front = +Z.
// variant 1: side hatch open with a red fault lamp and a cable loop; variant 2: filter drum + coolant
// sight tube on top instead of the wheel.
function pumpBlock(kit, PALETTE, pos, yaw, seed, variant = 0) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const steel = col(PALETTE, "steel");
  P.box("paintedMetal", 0, 0.15, 0, 3.4, 0.3, 2.6, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, 1.25, 0, 2.8, 1.9, 2.0, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, 2.28, 0, 3.0, 0.16, 2.2, { color: black });
  // motor drum on the top deck (so the block reads as a pump from the catwalk above): saddle, steel
  // drum overhanging both sides, black end bells and centre band; outlet stub on the front
  P.box("paintedMetal", 0, 2.5, -0.45, 2.0, 0.3, 1.0, { color: black });
  P.cyl("metal", 0, 2.95, -0.45, 0.55, 3.2, "x", { color: steel, segments: 16, texel: 0.5 });
  P.cyl("paintedMetal", 1.65, 2.95, -0.45, 0.62, 0.22, "x", { color: black, segments: 16 });
  P.cyl("paintedMetal", -1.65, 2.95, -0.45, 0.62, 0.22, "x", { color: black, segments: 16 });
  P.cyl("paintedMetal", 0, 2.95, -0.45, 0.6, 0.5, "x", { color: black, segments: 16 });
  P.cyl("metal", 0, 1.6, 1.2, 0.26, 1.0, "z", { color: steel, segments: 12 });
  if (variant === 2) {
    P.cyl("metal", 0.8, 2.85, 0.55, 0.42, 1.0, "y", { color: steel, segments: 14, texel: 0.5 });
    P.cyl("paintedMetal", 0.8, 3.38, 0.55, 0.48, 0.12, "y", { color: black, segments: 14 });
    P.cyl("emitBlue", 1.3, 2.85, 0.55, 0.04, 0.7, "y", { segments: 6 });
    P.cyl("metal", -0.6, 2.9, 0.55, 0.05, 1.1, "y", { color: steel, segments: 6 });
  } else {
    P.add("metal", new THREE.TorusGeometry(0.3, 0.035, 8, 24), 0.9, 2.6, 0.55, { rot: [Math.PI / 2, 0, 0], color: col(PALETTE, "impRed") });
    P.cyl("metal", 0.9, 2.5, 0.55, 0.05, 0.3, "y", { color: steel, segments: 8 });
  }
  if (variant === 1) {
    // hatch swung open on the front-right: opening, hinged panel, cable loop to the floor, fault lamp
    P.box("paintedMetal", 0.75, 1.15, 1.0, 0.9, 1.1, 0.06, { color: black });
    const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + 1.2, 0));
    kit.add("paintedMetal", new THREE.BoxGeometry(0.9, 1.1, 0.04), { pos: P.world(1.2 - 0.16, 1.15, 1.04 + 0.42), quat: hq, color: dark, texel: 2.5 });
    for (let k = 0; k < 3; k++) P.cyl("metal", 0.5 + k * 0.2, 1.0, 1.06, 0.03, 0.9, "y", { color: [black, dark, steel][k], segments: 6 });
    P.box("emitRedImp", 0.35, 1.55, 1.03, 0.1, 0.06, 0.01);
    P.box("emitAmber", 0.75, 0.75, 1.03, 0.3, 0.04, 0.01);
  } else {
    indicatorField(P, -0.7, 1.9, 1.01, 0.9, 0.24, seed);
  }
  P.box("emitAmber", -0.7, 0.9, 1.01, 0.6, 0.05, 0.01);
  for (let i = 0; i < 5; i++) P.box("paintedMetal", -0.7, 0.3 + i * 0.1, 1.01, 0.9, 0.03, 0.02, { color: black });
}
