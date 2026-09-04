// Deck 3 hyperdrive room: a 28 m high hall around the horizontal hyperdrive motivator — a 9 m
// cylinder on three cradles, six field coils, end caps, a top gantry reached by a switchback stair
// tower, power trunks from the finned coil banks on both walls, and a circular housing in the aft
// bulkhead where the motivator meets the wall. Blue/white key on the machine, amber fills.
import * as THREE from "three";
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP, col } from "../../deck2/_shared/palette.js";
import { rail, WALL_T } from "../../deck2/_shared/shell.js";
import { console as consoleProp, crate, pipe, duct, tank, stairs, floorLine, cabinet, hazardStrip, indicatorField, placer } from "../../deck2/_shared/props.js";
import { TAU, ring, strut, powerCabinet, cableTray, toolRack, monitorPedestal, junctionBox, ventGrille, valveStation } from "../engctl/engprops.js";

const Y = 12;
const CEIL = 40;
const X0 = -30 + WALL_T;
const X1 = 30 - WALL_T;
const Z0 = 690 + WALL_T;
const Z1 = 752 - WALL_T;
const AX = Y + 8; // motivator axis height
const R = 4.5;
const MZ0 = 698; // motivator body extent along z
const MZ1 = 746;
const COILS = [702, 710, 718, 726, 734, 742];
const CRADLES = [706, 722, 738];
const GANTRY = 26.0; // gantry deck top

export default defineRoom({
  id: "d3-hyperdrive",
  name: "Hyperdrive Room",
  deck: 3,
  x: [-30, 30],
  z: [690, 752],
  ceil: CEIL,
  spawn: { pos: [0, Y, 693], yaw: 180 },
  views: {
    "d3-hyperdrive-door": { pos: [-4.6, Y, 693.4], yaw: -156, pitch: 12 },
    "d3-hyperdrive-side": { pos: [-14.5, Y, 704], yaw: -142, pitch: 12 },
    "d3-hyperdrive-housing": { pos: [-9.5, Y, 740.5], yaw: -136, pitch: 14 },
    "d3-hyperdrive-aft": { pos: [13, Y, 748.5], yaw: 30, pitch: 12 },
  },
  shell: {
    panelW: 3.0,
    rows: [0, 0.4, 2.05, 2.27, 5, 9, 14, 20, 27.45, 28],
    wallColor: IMP.impMid,
    wallAlt: IMP.impDark,
    stripMat: "emitAmber",
    floor: { color: IMP.impDark },
    ceiling: { channels: 6, axis: "z", color: IMP.impBlack, panelW: 4 },
    lights: false,
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const P = (k) => col(PALETTE, k);
    const black = P("impBlack");
    const dark = P("impDark");
    const mid = P("impMid");
    const steel = P("steel");
    let seed = 500;

    // ---- motivator body, seams, side slots -----------------------------------------------------------
    kit.cyl("paintedMetal", 0, AX, (MZ0 + MZ1) / 2, R, MZ1 - MZ0 + 0.2, "z", { color: dark, segments: 40, texel: 0.4 });
    for (let z = MZ0 + 4; z < MZ1 - 1; z += 4) {
      if (COILS.some((c) => Math.abs(c - z) < 1.5) || CRADLES.some((c) => Math.abs(c - z) < 1.5)) continue;
      kit.cyl("paintedMetal", 0, AX, z, R + 0.04, 0.1, "z", { color: black, segments: 40, open: true });
    }
    for (const s of [-1, 1]) {
      kit.box("emitBlue", s * (R + 0.02), AX, (MZ0 + MZ1) / 2, 0.12, 0.3, MZ1 - MZ0 - 4);
      kit.box("paintedMetal", s * (R + 0.01), AX, (MZ0 + MZ1) / 2, 0.14, 0.7, MZ1 - MZ0 - 3.6, { color: black });
    }
    // hull plates: eight shallow longitudinal ribs
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.16, MZ1 - MZ0 - 2), { pos: [Math.cos(a) * (R + 0.02), AX + Math.sin(a) * (R + 0.02), (MZ0 + MZ1) / 2], rot: [0, 0, a - Math.PI / 2], color: black });
    }
    // end caps: stacked discs with an emissive hub; the aft end runs a neck into the wall housing
    const cap = (z, dir) => {
      kit.cyl("paintedMetal", 0, AX, z + dir * 0.4, R + 0.3, 0.8, "z", { color: mid, segments: 40, texel: 0.5 });
      kit.cyl("paintedMetal", 0, AX, z + dir * 1.05, 3.6, 0.5, "z", { color: dark, segments: 32 });
      kit.cyl("paintedMetal", 0, AX, z + dir * 1.55, 2.4, 0.5, "z", { color: black, segments: 32 });
      kit.cyl("emitBlue", 0, AX, z + dir * 1.35, 3.0, 0.08, "z", { segments: 32, open: true });
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        kit.cyl("metal", Math.cos(a) * 4.2, AX + Math.sin(a) * 4.2, z + dir * 0.85, 0.12, 0.1, "z", { color: steel, segments: 8 });
      }
    };
    cap(MZ0 - 0.1, -1);
    cap(MZ1 + 0.1, 1);
    kit.cyl("paintedMetal", 0, AX, MZ0 - 2.1, 1.3, 0.6, "z", { color: dark, segments: 24 });
    kit.cyl("emitBlue", 0, AX, MZ0 - 2.43, 0.9, 0.14, "z", { segments: 24 });
    kit.cyl("paintedMetal", 0, AX, (MZ1 + 1.7 + Z1 - 0.62) / 2, 3.0, Z1 - 0.62 - (MZ1 + 1.7), "z", { color: dark, segments: 32, texel: 0.5 });
    kit.cyl("paintedMetal", 0, AX, MZ1 + 2.1, 3.3, 0.4, "z", { color: black, segments: 32 });

    // ---- field coils: dark tori with a blue inner ring and side lugs -----------------------------------
    for (const z of COILS) {
      ring(kit, "paintedMetal", [0, AX, z], 5.2, 0.5, "z", { radial: 10, tubular: 40, color: dark });
      ring(kit, "emitBlue", [0, AX, z], 4.62, 0.09, "z", { radial: 6, tubular: 40 });
      ring(kit, "paintedMetal", [0, AX, z], 5.7, 0.08, "z", { radial: 6, tubular: 40, color: black });
      for (const s of [-1, 1]) {
        kit.box("paintedMetal", s * 5.4, AX, z, 0.9, 1.4, 1.3, { color: black, texel: 1 });
        kit.box("emitBlue", s * 5.87, AX, z, 0.03, 0.6, 0.5);
      }
    }

    // ---- cradles: base, saddle, diagonal struts, clamp ring, hazard border -----------------------------
    for (const z of CRADLES) {
      kit.boxMM("paintedMetal", [-6, Y, z - 1.9], [6, Y + 1.4, z + 1.9], { color: dark, texel: 0.5 });
      kit.boxMM("paintedMetal", [-6.1, Y, z - 2.0], [6.1, Y + 0.25, z + 2.0], { color: black });
      kit.boxMM("paintedMetal", [-3.2, Y + 1.4, z - 1.5], [3.2, Y + 4.0, z + 1.5], { color: black, texel: 0.5 });
      for (const s of [-1, 1]) {
        strut(kit, "paintedMetal", [s * 5.4, Y + 1.4, z], [s * 4.0, Y + 7.0, z], 0.5, 0.6, { color: dark });
        kit.box("emitAmber", s * 6.02, Y + 0.5, z, 0.03, 0.06, 3.0);
        indicatorField(placer(kit, [s * 6.03, Y + 1.0, z], s > 0 ? Math.PI / 2 : -Math.PI / 2), 0, 0, 0, 1.6, 0.3, seed++);
      }
      ring(kit, "paintedMetal", [0, AX, z], 4.9, 0.35, "z", { radial: 8, tubular: 40, color: mid });
      hazardStrip(kit, [-6.7, z - 2.6], [6.7, z - 2.0], Y + 0.005);
      hazardStrip(kit, [-6.7, z + 2.0], [6.7, z + 2.6], Y + 0.005);
      hazardStrip(kit, [-6.7, z - 2.0], [-6.1, z + 2.0], Y + 0.005);
      hazardStrip(kit, [6.1, z - 2.0], [6.7, z + 2.0], Y + 0.005);
      kit.collider([-6.1, Y, z - 2.0], [6.1, Y + 4, z + 2.0], "cradle");
    }

    // ---- top gantry: deck on the cylinder crown, rails, bridge to the stair tower ----------------------
    const GZ0 = 698.5;
    const GZ1 = 745.5;
    kit.boxMM("impFloor", [-1, GANTRY - 0.2, GZ0], [1, GANTRY, GZ1], { color: mid, texel: 0.5 });
    kit.boxMM("paintedMetal", [-1.05, GANTRY - 0.5, GZ0], [-0.85, GANTRY - 0.2, GZ1], { color: black });
    kit.boxMM("paintedMetal", [0.85, GANTRY - 0.5, GZ0], [1.05, GANTRY - 0.2, GZ1], { color: black });
    for (const z of [700, 706, 714, 722, 730, 738, 744]) kit.boxMM("paintedMetal", [-0.35, AX + R - 0.05, z - 0.3], [0.35, GANTRY - 0.2, z + 0.3], { color: dark });
    rail(kit, PALETTE, [-1, GANTRY, GZ0], [-1, GANTRY, GZ1], GANTRY);
    rail(kit, PALETTE, [1, GANTRY, 700.1], [1, GANTRY, GZ1], GANTRY);
    rail(kit, PALETTE, [-1, GANTRY, GZ0], [1, GANTRY, GZ0], GANTRY);
    rail(kit, PALETTE, [-1, GANTRY, GZ1], [1, GANTRY, GZ1], GANTRY);
    kit.boxMM("emitWhite", [-0.9, GANTRY + 0.005, GZ0 + 0.3], [-0.86, GANTRY + 0.012, GZ1 - 0.3]);
    kit.boxMM("emitWhite", [0.86, GANTRY + 0.005, GZ0 + 0.3], [0.9, GANTRY + 0.012, GZ1 - 0.3]);
    // bridge from the gantry to the tower's top landing
    kit.boxMM("impFloor", [1, GANTRY - 0.2, 698.5], [6.4, GANTRY, 700.1], { color: mid, texel: 0.5 });
    kit.boxMM("paintedMetal", [1, GANTRY - 0.5, 698.5], [6.4, GANTRY - 0.2, 698.7], { color: black });
    kit.boxMM("paintedMetal", [1, GANTRY - 0.5, 699.9], [6.4, GANTRY - 0.2, 700.1], { color: black });
    rail(kit, PALETTE, [1, GANTRY, 698.5], [6.4, GANTRY, 698.5], GANTRY);
    rail(kit, PALETTE, [1, GANTRY, 700.1], [6.4, GANTRY, 700.1], GANTRY);
    strut(kit, "paintedMetal", [6.4, Y + 0.3, 699.3], [3.7, GANTRY - 0.5, 699.3], 0.3, 0.3, { color: dark });

    // ---- switchback stair tower (x 6.4..9.9, z 696.9..704.6), four flights of 3.5 m -------------------
    const TX0 = 6.4;
    const TX1 = 9.9;
    const flight = (x, y, z, yaw) => stairs(kit, PALETTE, [x, y, z], yaw, { rise: 3.5, run: 4.5, w: 1.4 });
    const landing = (y, z0, z1) => kit.boxMM("impFloor", [TX0, y - 0.2, z0], [TX1, y, z1], { color: mid, texel: 0.5 });
    flight(7.1, Y, 696.9, 0);
    landing(Y + 3.5, 701.4, 703.0);
    flight(9.2, Y + 3.5, 703.0, Math.PI);
    landing(Y + 7.0, 696.9, 698.5);
    flight(7.1, Y + 7.0, 698.5, 0);
    landing(Y + 10.5, 703.0, 704.6);
    flight(9.2, Y + 10.5, 704.6, Math.PI);
    landing(GANTRY, 698.5, 700.1);
    for (const [x, z] of [[TX0, 696.7], [TX1, 696.7], [TX0, 704.8], [TX1, 704.8]]) {
      kit.boxMM("paintedMetal", [x - 0.15, Y, z - 0.15], [x + 0.15, GANTRY + 0.6, z + 0.15], { color: dark, texel: 1 });
      kit.collider([x - 0.2, Y, z - 0.2], [x + 0.2, Y + 3, z + 0.2], "tower");
    }
    kit.boxMM("paintedMetal", [TX0 - 0.15, GANTRY + 0.4, 696.55], [TX1 + 0.15, GANTRY + 0.6, 704.95], { color: dark });
    kit.boxMM("paintedMetal", [TX0 - 0.15, Y + 0.1, 704.55], [TX1 + 0.15, Y + 0.3, 704.95], { color: black });
    // landing rails on the open edges
    const R1 = Y + 3.5;
    const R2 = Y + 7.0;
    const R3 = Y + 10.5;
    rail(kit, PALETTE, [TX0, R1, 703.0], [8.5, R1, 703.0], R1);
    rail(kit, PALETTE, [TX0, R1, 701.4], [TX0, R1, 703.0], R1);
    rail(kit, PALETTE, [TX1, R1, 701.4], [TX1, R1, 703.0], R1);
    rail(kit, PALETTE, [TX0, R2, 696.9], [TX1, R2, 696.9], R2);
    rail(kit, PALETTE, [TX0, R2, 696.9], [TX0, R2, 698.5], R2);
    rail(kit, PALETTE, [TX1, R2, 696.9], [TX1, R2, 698.5], R2);
    rail(kit, PALETTE, [TX0, R3, 704.6], [TX1, R3, 704.6], R3);
    rail(kit, PALETTE, [TX0, R3, 703.0], [TX0, R3, 704.6], R3);
    rail(kit, PALETTE, [TX1, R3, 703.0], [TX1, R3, 704.6], R3);
    rail(kit, PALETTE, [TX0, GANTRY, 698.5], [TX1, GANTRY, 698.5], GANTRY);
    rail(kit, PALETTE, [TX1, GANTRY, 698.5], [TX1, GANTRY, 700.1], GANTRY);
    rail(kit, PALETTE, [TX0, GANTRY, 700.1], [8.5, GANTRY, 700.1], GANTRY);
    hazardStrip(kit, [TX0 - 0.1, 696.2], [TX1 + 0.1, 696.55], Y + 0.005);

    // ---- coil banks along both walls (finned, amber glow between fins) + power trunks ----------------
    for (const s of [-1, 1]) {
      for (let k = 0; k < 7; k++) {
        const zc = 698.5 + k * 8;
        const cx = s * 22;
        kit.boxMM("paintedMetal", [cx - 3.2, Y, zc - 2.7], [cx + 3.2, Y + 0.4, zc + 2.7], { color: black, texel: 1 });
        // dark core with thick fins; the heat glow is a thin amber line recessed in each fin gap
        kit.boxMM("paintedMetal", [cx - 2.6, Y + 0.4, zc - 2.3], [cx + 2.6, Y + 8.8, zc + 2.3], { color: dark, texel: 0.5 });
        for (let i = 0; i < 9; i++) {
          const fy = Y + 1.0 + i * 0.9;
          kit.boxMM("paintedMetal", [cx - 3.0, fy, zc - 2.5], [cx + 3.0, fy + 0.36, zc + 2.5], { color: mid, texel: 1 });
          if (i < 8) kit.boxMM("emitAmber", [cx - 2.62, fy + 0.58, zc - 2.32], [cx + 2.62, fy + 0.68, zc + 2.32]);
        }
        kit.boxMM("paintedMetal", [cx - 3.2, Y + 8.8, zc - 2.7], [cx + 3.2, Y + 9.3, zc + 2.7], { color: black, texel: 1 });
        kit.cyl("paintedMetal", cx - s * 1.0, Y + 9.6, zc, 0.55, 0.6, "y", { color: black, segments: 12 });
        kit.box("emitBlue", cx - s * 3.23, Y + 0.65, zc, 0.02, 0.06, 4.0);
        pipe(kit, PALETTE, [cx - s * 1.0, Y + 9.9, zc], [s * 2.6, AX + 3.4, zc], 0.3, { bracket: 4, color: dark, mat: "paintedMetal" });
        kit.collider([cx - 3.2, Y, zc - 2.7], [cx + 3.2, Y + 9.3, zc + 2.7], "coil");
      }
      // service lane behind the banks: wall cabinets in the gaps, a cable tray, vertical feeders
      for (const zc of [702.5, 718.5, 734.5]) cabinet(kit, PALETTE, [s * (X1 - 0.28), Y, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: seed++, emit: "emitAmber" });
      for (const zc of [710.5, 726.5, 742.5]) valveStation(kit, PALETTE, [s * (X1 - 0.05), Y, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2);
      cableTray(kit, PALETTE, [s * (X1 - 0.5), Y + 10.5, 694], [s * (X1 - 0.5), Y + 10.5, Z1 - 1.5], { w: 0.8, cables: 4 });
      for (let k = 0; k < 7; k++) pipe(kit, PALETTE, [s * (X1 - 0.5), Y + 10.4, 698.5 + k * 8], [s * 25.2, Y + 9.0, 698.5 + k * 8], 0.12, { bracket: 3, color: black });
      for (const zc of [706, 722, 738]) ventGrille(kit, PALETTE, [s * X1, Y + 12.5, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2, { w: 2.0, h: 0.8 });
      for (const zc of [700, 730, 746]) junctionBox(kit, PALETTE, [s * X1, Y + 11.4, zc], s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: seed++ });
    }

    // ---- floor: consoles facing the motivator, rails with openings, safety lines --------------------
    for (const z of [714, 730]) {
      consoleProp(kit, PALETTE, [-11.5, Y, z], -Math.PI / 2, { w: 3, screens: 3, seed: seed++, screenMat: "screenImp1" });
      consoleProp(kit, PALETTE, [11.5, Y, z], Math.PI / 2, { w: 3, screens: 3, seed: seed++, screenMat: "screenImp1" });
    }
    for (const [a, b] of [[697, 711], [717, 727], [733, 747]]) rail(kit, PALETTE, [-8, Y, a], [-8, Y, b], Y);
    for (const [a, b] of [[705.5, 711], [717, 727], [733, 747]]) rail(kit, PALETTE, [8, Y, a], [8, Y, b], Y);
    floorLine(kit, [-7.4, Y, 697], [-7.4, Y, 747], 0.12, "emitOrange");
    floorLine(kit, [7.4, Y, 705.5], [7.4, Y, 747], 0.12, "emitOrange");
    floorLine(kit, [-7.4, Y, 747], [7.4, Y, 747], 0.12, "emitOrange");
    floorLine(kit, [-7.4, Y, 697], [6.4, Y, 697], 0.12, "emitOrange");
    for (const s of [-1, 1]) floorLine(kit, [s * 17.5, Y, 694], [s * 17.5, Y, 750], 0.1, "emitAmber");
    monitorPedestal(kit, PALETTE, [-5, Y, 693.8], Math.PI, { screenMat: "screenImp1" });
    monitorPedestal(kit, PALETTE, [5, Y, 693.8], Math.PI, { screenMat: "screenImp1" });

    // ---- forward wall: power cabinets + cables into a tray, racks, crates in the corners --------------
    const trayY = Y + 12;
    for (const x of [-19.3, -17.3, 17.3, 19.3]) {
      powerCabinet(kit, PALETTE, [x, Y, Z0 + 0.42], 0, { seed: seed++ });
      for (const s of [-1, 1]) pipe(kit, PALETTE, [x + s * 0.35, Y + 2.4, Z0 + 0.42], [x + s * 0.35, trayY + 0.02, Z0 + 0.42], 0.08, { bracket: 4, color: s > 0 ? black : dark });
    }
    cableTray(kit, PALETTE, [-24, trayY, Z0 + 0.42], [24, trayY, Z0 + 0.42], { w: 0.7 });
    for (const x of [-7.2, 7.2]) toolRack(kit, PALETTE, [x, Y, Z0 + 0.06], 0, { w: 1.8, seed: seed++ });
    for (const x of [-12.2, -13.6, 12.2, 13.6]) cabinet(kit, PALETTE, [x, Y, Z0 + 0.28], 0, { seed: seed++, emit: x > 0 ? "emitBlue" : "emitAmber" });
    for (const s of [-1, 1]) {
      crate(kit, PALETTE, [s * 27.6, Y, Z0 + 0.72], s * 0.08, { seed: seed++ });
      crate(kit, PALETTE, [s * 27.6, Y + 1.2, Z0 + 0.72], -s * 0.2, { seed: seed++, w: 1.0, d: 1.0, h: 0.8 });
      crate(kit, PALETTE, [s * 26.9, Y, Z0 + 2.2], s * 0.25, { seed: seed++, w: 1.0, d: 1.0, h: 1.0 });
      junctionBox(kit, PALETTE, [s * 15.5, Y + 3.2, Z0], 0, { seed: seed++ });
      ventGrille(kit, PALETTE, [s * 10, Y + 4.4, Z0], 0, { w: 1.6, h: 0.6 });
    }
    // door status panels either side of the blast door (hole x −2..2; approach kept clear)
    for (const x of [-3.6, 3.6]) {
      const F = placer(kit, [x, 0, Z0], 0);
      F.box("paintedMetal", 0, Y + 1.5, 0.05, 0.7, 0.9, 0.06, { color: black });
      indicatorField(F, 0, Y + 1.6, 0.09, 0.6, 0.5, seed++);
      F.box(x > 0 ? "emitRedImp" : "emitBlue", 0, Y + 1.16, 0.085, 0.4, 0.06, 0.01);
    }

    // ---- aft wall: bulkhead panel with the recessed housing, tanks in the corners, cabinets ----------
    kit.boxMM("paintedMetal", [-8.2, Y + 0.4, Z1 - 0.65], [8.2, Y + 16.2, Z1 - 0.02], { color: black, texel: 1 });
    for (const s of [-1, 1]) {
      kit.boxMM("paintedMetal", [s * 8.6 - 0.35, Y + 0.3, Z1 - 0.8], [s * 8.6 + 0.35, Y + 17.4, Z1 - 0.02], { color: dark, texel: 1 });
      kit.boxMM("emitAmber", [s * 8.6 - 0.04, Y + 2.0, Z1 - 0.84], [s * 8.6 + 0.04, Y + 15.5, Z1 - 0.82]);
    }
    kit.boxMM("paintedMetal", [-8.95, Y + 16.2, Z1 - 0.8], [8.95, Y + 17.4, Z1 - 0.02], { color: dark, texel: 1 });
    kit.boxMM("emitAmber", [-8.4, Y + 16.75, Z1 - 0.84], [8.4, Y + 16.85, Z1 - 0.82]);
    kit.cyl("paintedMetal", 0, AX, Z1 - 0.95, 6.5, 0.6, "z", { color: black, segments: 48, open: true });
    kit.cyl("paintedMetal", 0, AX, Z1 - 0.66, 6.45, 0.04, "z", { color: dark, segments: 48 });
    ring(kit, "emitBlue", [0, AX, Z1 - 0.95], 6.05, 0.09, "z", { radial: 6, tubular: 48 });
    ring(kit, "emitBlue", [0, AX, Z1 - 0.8], 5.0, 0.05, "z", { radial: 6, tubular: 48 });
    ring(kit, "paintedMetal", [0, AX, Z1 - 1.25], 6.55, 0.22, "z", { radial: 8, tubular: 48, color: mid });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      kit.cyl("metal", Math.cos(a) * 7.1, AX + Math.sin(a) * 7.1, Z1 - 0.71, 0.14, 0.12, "z", { color: steel, segments: 8 });
      if (k % 4 === 0) strut(kit, "paintedMetal", [Math.cos(a) * 3.2, AX + Math.sin(a) * 3.2, Z1 - 1.1], [Math.cos(a) * 6.3, AX + Math.sin(a) * 6.3, Z1 - 0.7], 0.4, 0.3, { color: dark });
    }
    for (const s of [-1, 1]) {
      tank(kit, PALETTE, [s * 27.7, Y, Z1 - 2.05], Math.PI, { r: 1.2, h: 4, emit: "emitBlue" });
      cabinet(kit, PALETTE, [s * 12.4, Y, Z1 - 0.28], Math.PI, { seed: seed++ });
      cabinet(kit, PALETTE, [s * 13.8, Y, Z1 - 0.28], Math.PI, { seed: seed++, emit: "emitAmber" });
      powerCabinet(kit, PALETTE, [s * 20.5, Y, Z1 - 0.42], Math.PI, { seed: seed++ });
      pipe(kit, PALETTE, [s * 20.5 - 0.35, Y + 2.4, Z1 - 0.42], [s * 20.5 - 0.35, Y + 10.35, Z1 - 0.42], 0.08, { bracket: 4, color: black });
      pipe(kit, PALETTE, [s * 20.5 + 0.35, Y + 2.4, Z1 - 0.42], [s * 20.5 + 0.35, Y + 10.35, Z1 - 0.42], 0.08, { bracket: 4, color: dark });
      crate(kit, PALETTE, [s * 16.6, Y, Z1 - 0.72], s * 0.1, { seed: seed++ });
      junctionBox(kit, PALETTE, [s * 11, Y + 3.4, Z1], Math.PI, { seed: seed++ });
      cableTray(kit, PALETTE, [s * 9.6, Y + 10.5, Z1 - 0.5], [s * 24, Y + 10.5, Z1 - 0.5], { w: 0.7 });
    }

    // ---- ceiling: two big ducts along the hall and cross ducts, feeding the coil-bank trays ---------
    for (const s of [-1, 1]) {
      duct(kit, PALETTE, [s * 13, CEIL - 1.0, 692.5], [s * 13, CEIL - 1.0, 749.5], 1.2, 0.8, { color: mid });
      for (const z of [700, 722, 744]) duct(kit, PALETTE, [s * 13.6, CEIL - 1.0, z], [s * (X1 - 0.3), CEIL - 1.0, z], 0.9, 0.6, { color: mid });
    }
    duct(kit, PALETTE, [-12.4, CEIL - 1.0, 711], [12.4, CEIL - 1.0, 711], 0.9, 0.6, { color: mid });
    duct(kit, PALETTE, [-12.4, CEIL - 1.0, 733], [12.4, CEIL - 1.0, 733], 0.9, 0.6, { color: mid });

    // ---- lights (shell fills off): blue/white key on the motivator, amber fills, housing accent ------
    const L = (pos, color, intensity, distance, priority = 0.5) => ctx.lights.push({ type: "point", pos, color, intensity, distance, priority });
    L([0, AX + 10, 710], 0x7aa8ff, 110, 38, 0.8);
    L([0, AX + 10, 736], 0x7aa8ff, 110, 38, 0.8);
    L([0, CEIL - 6, 722], 0xe8f0ff, 60, 40, 0.5);
    L([-16, Y + 14, 704], 0xffc080, 55, 28, 0.5);
    L([16, Y + 14, 704], 0xffc080, 55, 28, 0.5);
    L([-16, Y + 14, 722], 0xffc080, 50, 26, 0.4);
    L([16, Y + 14, 722], 0xffc080, 50, 26, 0.4);
    L([-16, Y + 14, 740], 0xffc080, 55, 28, 0.5);
    L([16, Y + 14, 740], 0xffc080, 55, 28, 0.5);
    L([0, AX + 2, Z1 - 3.5], 0x6a9bff, 70, 20, 0.6);
    L([0, Y + 10, 694], 0xffd0a0, 40, 18, 0.5);
    return {};
  },
});
