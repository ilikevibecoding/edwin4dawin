// Deck 2 crew quarters: a 3 m central aisle with five berthing bays a side (two facing 3-tier stacks
// each = 60 bunks), locker/desk units between bays, a washroom alcove at the far end (basins,
// showers, laundry) and a duty-officer desk by the door. Neutral grey, warm white (§11).
// Door: aft wall at x −22 (standard).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { console as consoleProp, wallScreen, cabinet, lockerBank, table, pipe, duct, crate, dropLight } from "../_shared/props.js";
import { vent, junctionBox, bunk, foldDesk, bootRack, laundryCart, noticeBoard, kitShelf, washCounter, handDryer, showers, washer, foldTable, wallBench, hookRail, footLocker, extinguisher, holoTable } from "./props.js";

const Y = 40;
const CEIL = 44.6;
const X0 = -33;
const X1 = -11;
const Z0 = 340;
const Z1 = 372.5;
const CX = -22;
const W = 0.34;
const wx0 = X0 + W;
const wx1 = X1 - W;
const wz0 = Z0 + W;
const wz1 = Z1 - W;
const GREY = IMP.impGrey;
const DARK = IMP.impDark;
const BLACK = IMP.impBlack;
const STEEL = IMP.steel;
const SCR = "screenImp0";

const MOUTH = 2.6; // half-width of the nave (mouth lines at x −24.6 / −19.4); fascias sit aisle-side of it
const PANEL = 3.15; // slot-mouth panel plane (0.1 thick, aisle face at ±3.1)
const SOFFIT_Y = Y + 3.0;
const WASH_Z = 344.6; // washroom partition (0.1 thick)
const MOD0 = 344.7; // first slot starts here
const SLOT = 2.0;
const BAY = 3.1;
const MOD = SLOT + BAY;
const N_MOD = 5;
const END_Z = MOD0 + N_MOD * MOD; // 370.2: final divider

export default defineRoom({
  id: "d2-quarters",
  name: "Crew Quarters",
  deck: 2,
  x: [X0, X1],
  z: [Z0, Z1],
  ceil: CEIL,
  spawn: { pos: [CX, Y, 370], yaw: 0 },
  views: {
    "d2-quarters-door": { pos: [CX, Y, 370.6], yaw: 0, pitch: -3 },
    "d2-quarters-bunks": { pos: [-29.0, Y, 357.9], yaw: 120, pitch: 2 },
    "d2-quarters-aisle": { pos: [-22.6, Y, 346.0], yaw: 172, pitch: -2 },
    "d2-quarters-wash": { pos: [-17.6, Y, 344.1], yaw: 45, pitch: -2 },
  },
  shell: {
    panelW: 1.6,
    wallColor: GREY,
    wallAlt: IMP.impWhite,
    stripMat: "emitWarm",
    floor: { color: IMP.impMid, strip: { axis: "z", width: 3.0, color: 0x0e0f12, mat: "impFloor" } },
    ceiling: { channels: 30, axis: "z", stripMat: "emitWarm", segment: 2.5 },
    lights: false,
  },
  detail(ctx) {
    const { kit, PALETTE } = ctx;
    const mm = (mat, a, b, opts) => kit.boxMM(mat, [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])], opts);
    const coll = (a, b, tag) => kit.collider([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])], tag);

    for (const s of [-1, 1]) {
      const wallX = CX + s * 10.66;
      const mouthX = CX + s * MOUTH;
      const faceX = mouthX - s * 0.1; // aisle face of the fascia
      const panelX = CX + s * (PANEL - 0.05); // aisle face of the slot panel
      const faceYaw = -s * (Math.PI / 2); // prop front toward the aisle
      // soffit over the bays (3.0 m) and the fascia above it along the mouth line; cove + edge strips
      mm("impPanel", [wallX, SOFFIT_Y, MOD0], [mouthX, SOFFIT_Y + 0.3, END_Z + 0.08], { color: GREY, texel: 0.5 });
      mm("paintedMetal", [mouthX, SOFFIT_Y - 0.08, MOD0 - 0.02], [faceX, CEIL, END_Z + 0.1], { color: DARK, texel: 1 });
      mm("emitWarm", [faceX, SOFFIT_Y - 0.02, MOD0 + 0.2], [faceX - s * 0.008, SOFFIT_Y + 0.02, END_Z - 0.1]);
      mm("paintedMetal", [faceX, CEIL - 0.42, MOD0], [faceX - s * 0.18, CEIL - 0.36, END_Z + 0.1], { color: BLACK });
      mm("emitWarm", [faceX - s * 0.02, CEIL - 0.36, MOD0 + 0.2], [faceX - s * 0.16, CEIL - 0.35, END_Z - 0.1]);
      duct(kit, PALETTE, [faceX - s * 0.24, Y + 3.95, MOD0 + 0.3], [faceX - s * 0.24, Y + 3.95, END_Z - 0.2], 0.44, 0.34, { color: IMP.impMid });
      // corner post closing the soffit / fascia end at the aft strip
      kit.box("paintedMetal", mouthX - s * 0.03, (Y + CEIL) / 2, END_Z + 0.05, 0.16, CEIL - Y, 0.16, { color: DARK, texel: 1 });
      // floor night-light along the mouth line (aisle side)
      mm("emitAmber", [mouthX - s * 0.03, Y, MOD0], [mouthX - s * 0.07, Y + 0.006, END_Z]);
      // high pipe along the outer wall above the stacks
      pipe(kit, PALETTE, [wallX - s * 0.12, Y + 2.8, MOD0 + 0.2], [wallX - s * 0.12, Y + 2.8, END_Z - 0.2], 0.05, { bracket: 3.1 });

      const partition = (z) => {
        mm("impPanel", [wallX, Y, z], [mouthX, SOFFIT_Y, z + 0.08], { color: GREY, texel: 0.5 });
        mm("paintedMetal", [wallX, Y, z - 0.01], [mouthX, Y + 0.1, z + 0.09], { color: BLACK });
        kit.box("paintedMetal", mouthX - s * 0.03, SOFFIT_Y / 2 - Y / 2 + Y, z + 0.04, 0.14, SOFFIT_Y - Y, 0.14, { color: DARK, texel: 1 });
        coll([wallX, Y, z], [mouthX, SOFFIT_Y, z + 0.08], "partition");
      };

      for (let k = 0; k < N_MOD; k++) {
        const sz0 = MOD0 + k * MOD;
        const sz1 = sz0 + SLOT;
        const bz0 = sz1;
        const bz1 = bz0 + BAY;
        const bc = (bz0 + bz1) / 2;
        // divider partitions (wall → mouth line), full height to the soffit; k=0 uses the washroom wall
        if (k > 0) partition(sz0);
        partition(sz1 - 0.08);
        // slot mouth: recessed panel, lockers (count 2) facing the aisle, fold-out desk + stool, kit above
        const pz0 = k > 0 ? sz0 + 0.08 : sz0;
        mm("impPanel", [CX + s * (PANEL - 0.05), Y, pz0], [CX + s * (PANEL + 0.05), SOFFIT_Y, sz1 - 0.08], { color: IMP.impWhite, texel: 0.5 });
        coll([CX + s * (PANEL - 0.05), Y, pz0], [CX + s * (PANEL + 0.05), SOFFIT_Y, sz1 - 0.08], "slot-panel");
        lockerBank(kit, PALETTE, [CX + s * (MOUTH + 0.25), Y, sz0 + 0.72], faceYaw, { count: 2, unit: 0.6, h: 2.0, d: 0.5, color: k % 2 ? IMP.impMid : GREY });
        foldDesk(kit, [panelX, Y, sz0 + 1.62], faceYaw, 40 + k * 2 + (s + 1) / 2);
        if (k % 2) wallScreen(kit, [panelX, Y + 2.5, sz0 + 0.72], faceYaw, 0.7, 0.4, SCR);
        else vent(kit, [panelX, Y + 2.55, sz0 + 0.72], faceYaw, 0.7, 0.3);
        junctionBox(kit, [panelX, Y + 2.35, sz0 + 1.62], faceYaw, 50 + k);
        kit.box("emitWarm", panelX - s * 0.006, Y + 2.9, sz0 + 1.62, 0.012, 0.06, 0.5);
        kit.box("emitWarm", CX + s * (MOUTH + 0.25), SOFFIT_Y - 0.02, sz0 + 1.62, 0.5, 0.012, 0.12);
        // fascia kit over the slot / bay (vent, junction box, section lamp)
        vent(kit, [faceX, Y + 3.5, (sz0 + sz1) / 2], faceYaw, 0.6, 0.3);
        junctionBox(kit, [faceX, Y + 3.45, bc + 0.9], faceYaw, 60 + k);
        kit.box("paintedMetal", faceX - s * 0.006, Y + 3.45, bc - 0.6, 0.012, 0.31, 0.31, { color: BLACK });
        kit.box("emitWhite", faceX - s * 0.014, Y + 3.45, bc - 0.6, 0.012, 0.25, 0.25);

        // bay: two facing 3-tier stacks, heads on the outer wall, a foot locker at each ladder end
        const bx = CX + s * 9.57;
        const sd = 700 + k * 4 + (s + 1);
        bunk(kit, PALETTE, [bx, Y, bz0 + 0.51], 0, { seed: sd, head: s });
        bunk(kit, PALETTE, [bx, Y, bz1 - 0.51], Math.PI, { seed: sd + 1, head: -s });
        footLocker(kit, [CX + s * 8.22, Y, bz0 + 0.51], faceYaw, sd + 2);
        footLocker(kit, [CX + s * 8.22, Y, bz1 - 0.51], faceYaw, sd + 3);
        // wall kit between the stacks: status plate, hook rail
        kit.box("darkGloss", wallX - s * 0.015, Y + 1.95, bc, 0.03, 0.3, 0.5);
        for (let i = 0; i < 3; i++) kit.box(["emitGreen", "emitBlue", "emitAmber"][i], wallX - s * 0.033, Y + 2.0, bc - 0.15 + i * 0.15, 0.006, 0.04, 0.04);
        kit.cyl("metal", wallX - s * 0.06, Y + 1.55, bc, 0.012, 0.9, "z", { color: STEEL, segments: 8 });
        for (let i = 0; i < 3; i++) kit.cyl("metal", wallX - s * 0.09, Y + 1.5, bc - 0.3 + i * 0.3, 0.01, 0.08, "y", { color: STEEL, segments: 6 });
        // nook: even bays a mess table with benches, odd bays a lounge (wall benches + holo-table)
        if (k % 2 === 0) {
          table(kit, PALETTE, [CX + s * 6.0, Y, bc], 0, { len: 1.4, w: 0.7, h: 0.76, benches: true });
        } else {
          holoTable(kit, [CX + s * 6.0, Y, bc], 0);
          for (const t of [-1, 1]) wallBench(kit, [CX + s * 6.0, Y, bc + t * 1.15], 0, 2.0);
        }
        kit.box("paintedMetal", CX + s * 6.0, SOFFIT_Y - 0.012, bc, 2.5, 0.024, 0.26, { color: BLACK });
        kit.box("emitWarm", CX + s * 6.0, SOFFIT_Y - 0.022, bc, 2.4, 0.012, 0.16);
        kit.box("paintedMetal", bx, SOFFIT_Y - 0.012, bc, 1.3, 0.024, 0.22, { color: BLACK });
        kit.box("emitWarm", bx, SOFFIT_Y - 0.022, bc, 1.2, 0.012, 0.12);
        // partition faces (z = bz0 facing +z, z = bz1 facing −z): hook rail with tunics on one side,
        // notice board + suppressant cylinder on the other; wall lamps on both; swapped on odd bays
        const [zA, yawA, zB, yawB] = k % 2 === 0 ? [bz0 + 0.001, 0, bz1 - 0.001, Math.PI] : [bz1 - 0.001, Math.PI, bz0 + 0.001, 0];
        hookRail(kit, [CX + s * 7.0, Y + 1.75, zA], yawA, 1.6, 120 + k * 2 + (s + 1) / 2);
        noticeBoard(kit, [CX + s * 7.3, Y + 1.75, zB], yawB, 0.9, 0.6, 110 + k * 2 + (s + 1) / 2);
        extinguisher(kit, [CX + s * 6.2, Y + 1.05, zB], yawB);
        for (const [z, yaw] of [[zA, yawA], [zB, yawB]]) {
          const dz = yaw === 0 ? 1 : -1;
          kit.box("paintedMetal", CX + s * 7.0, Y + 2.35, z + dz * 0.03, 1.4, 0.08, 0.06, { color: BLACK });
          kit.box("emitWarm", CX + s * 7.0, Y + 2.33, z + dz * 0.062, 1.3, 0.03, 0.006);
        }
        // bay mouth: boot rack (even) or a stack of two foot lockers (odd) on the bz0 side, kit shelf on bz1
        if (k % 2 === 0) bootRack(kit, [CX + s * 3.85, Y, bz0 + 0.2], 0, 4, 80 + k * 2 + (s + 1) / 2);
        else for (const dy of [0, 0.45]) footLocker(kit, [CX + s * 3.85, Y + dy, bz0 + 0.24], 0, 84 + k * 2 + (s + 1) / 2 + dy);
        kitShelf(kit, [CX + s * 4.2, Y, bz1 - 0.22], Math.PI, { w: 1.2, h: 1.8, d: 0.4, seed: 90 + k * 2 + (s + 1) / 2 });
        if ((k === 2 && s < 0) || (k === 4 && s > 0)) laundryCart(kit, [CX + s * 4.7, Y, bc + 0.6], 0.3 * s, 100 + k);
      }
      // final divider after the last bay (up to the soffit; the soffit's own end face closes the top)
      partition(END_Z);
    }

    // ---------------------------------------------------------------- washroom alcove (z 340.3..344.6)
    // wet-area floor: light tile plate over the deck (covers the aisle strip), drain grate along the basins
    mm("impPanel", [wx0, Y, wz0], [wx1, Y + 0.02, WASH_Z], { color: IMP.impGrey, texel: 0.5 });
    mm("paintedMetal", [-25.2, Y + 0.02, wz0 + 0.9], [-18.8, Y + 0.03, wz0 + 1.14], { color: BLACK });
    for (let x = -25.0; x < -18.8; x += 0.2) kit.box("metal", x, Y + 0.032, wz0 + 1.02, 0.03, 0.006, 0.2, { color: STEEL });
    for (const x of [CX - 5.6, CX + 1.2, CX + 5.2]) kit.box("darkGloss", x, Y + 0.024, 342.9, 0.4, 0.008, 0.4);
    for (const s of [-1, 1]) {
      const wallX = CX + s * 10.66;
      const mouthX = CX + s * MOUTH;
      mm("impPanel", [wallX, Y, WASH_Z], [mouthX, CEIL, WASH_Z + 0.1], { color: GREY, texel: 0.5 });
      mm("paintedMetal", [wallX, Y, WASH_Z - 0.01], [mouthX, Y + 0.1, WASH_Z + 0.11], { color: BLACK });
      coll([wallX, Y, WASH_Z], [mouthX, CEIL, WASH_Z + 0.1], "wash-wall");
      kit.box("paintedMetal", mouthX - s * 0.02, Y + 1.5, WASH_Z + 0.05, 0.16, 3.0, 0.16, { color: DARK, texel: 1 });
    }
    mm("paintedMetal", [CX - MOUTH + 0.05, SOFFIT_Y, WASH_Z - 0.03], [CX + MOUTH - 0.05, SOFFIT_Y + 0.4, WASH_Z + 0.13], { color: DARK, texel: 1 });
    mm("impPanel", [CX - MOUTH + 0.05, SOFFIT_Y + 0.4, WASH_Z], [CX + MOUTH - 0.05, CEIL, WASH_Z + 0.1], { color: GREY, texel: 0.5 });
    mm("emitWarm", [CX - MOUTH + 0.3, SOFFIT_Y - 0.012, WASH_Z + 0.02], [CX + MOUTH - 0.3, SOFFIT_Y, WASH_Z + 0.08]);
    mm("emitWarm", [CX - MOUTH + 0.3, SOFFIT_Y + 0.1, WASH_Z + 0.13], [CX + MOUTH - 0.3, SOFFIT_Y + 0.14, WASH_Z + 0.136]);
    washCounter(kit, [CX, Y, wz0], 0, 4, 1.6);
    handDryer(kit, [CX - 3.65, Y + 1.2, wz0], 0);
    handDryer(kit, [CX + 3.65, Y + 1.2, wz0], 0);
    showers(kit, [CX - 8.1, Y, wz0], 0, 4, { pitch: 1.25, d: 1.4, seed: 17 });
    wallBench(kit, [CX - 8.1, Y, wz0 + 2.4], 0, 3.6);
    // changing side: second bench and towel hooks on the washroom face of the partition; drop lights
    wallBench(kit, [CX - 6.6, Y, WASH_Z - 0.22], Math.PI, 3.0);
    hookRail(kit, [CX - 6.6, Y + 1.75, WASH_Z - 0.001], Math.PI, 2.4, 36, true);
    hookRail(kit, [CX + 4.4, Y + 1.75, WASH_Z - 0.001], Math.PI, 1.6, 37, true);
    for (const x of [CX - 6.5, CX - 1.6, CX + 3.3]) dropLight(kit, PALETTE, [x, CEIL, 342.4], { w: 2.0, d: 0.45, stem: 0.5, mat: "emitWarm" });
    // towel rail with hanging towels between the showers and the basins
    kit.box("metal", -26.7, Y + 1.2, wz0 + 0.06, 1.4, 0.04, 0.06, { color: STEEL });
    for (let i = 0; i < 4; i++) kit.box("fabric", -27.2 + i * 0.33, Y + 0.85, wz0 + 0.05, 0.26, 0.7, 0.03, { color: i % 2 ? IMP.impWhite : GREY, texel: 2 });
    washer(kit, [CX + 5.3, Y, wz0 + 0.36], 0, 19);
    washer(kit, [CX + 6.2, Y, wz0 + 0.36], 0, 20);
    foldTable(kit, [CX + 8.6, Y, wz0 + 0.5], 0, 1.8, 23);
    kitShelf(kit, [wx1 - 0.2, Y, 342.7], -Math.PI / 2, { w: 1.6, h: 2.0, d: 0.4, seed: 27 });
    laundryCart(kit, [CX + 6.4, Y, 342.9], 0.3, 31);
    laundryCart(kit, [CX + 8.3, Y, 343.3], -0.25, 32);
    vent(kit, [CX - 8.1, Y + 3.2, wz0 - 0.02], 0, 0.7, 0.35);
    vent(kit, [CX + 7.4, Y + 3.2, wz0 - 0.02], 0, 0.7, 0.35);
    junctionBox(kit, [wx1 - 0.02, Y + 1.6, 341.3], -Math.PI / 2, 33);
    junctionBox(kit, [wx0 + 0.02, Y + 1.6, 343.6], Math.PI / 2, 34);
    pipe(kit, PALETTE, [wx0 + 0.2, Y + 3.6, wz0 + 0.2], [wx1 - 0.2, Y + 3.6, wz0 + 0.2], 0.07, { bracket: 2.6 });
    pipe(kit, PALETTE, [wx0 + 0.2, Y + 3.85, wz0 + 0.2], [wx1 - 0.2, Y + 3.85, wz0 + 0.2], 0.05, { bracket: 2.6, color: IMP.impAmber });

    // ---------------------------------------------------------------- aft strip: duty desk, notice board
    consoleProp(kit, PALETTE, [-27.4, Y, 370.8], 0, { w: 1.8, d: 0.9, screens: 2, sit: true, seed: 5, screenMat: SCR });
    wallScreen(kit, [-27.4, Y + 2.85, wz1 - 0.07], Math.PI, 1.6, 0.9, SCR);
    cabinet(kit, PALETTE, [-32.05, Y, wz1 - 0.25], Math.PI, { h: 1.8, color: IMP.impMid, seed: 61 });
    cabinet(kit, PALETTE, [-30.8, Y, wz1 - 0.25], Math.PI, { h: 1.8, color: GREY, seed: 62 });
    crate(kit, PALETTE, [-29.35, Y, wz1 - 0.66], 0, { seed: 71 });
    vent(kit, [-29.6, Y + 3.5, wz1 - 0.02], Math.PI, 0.7, 0.35);
    junctionBox(kit, [-31.5, Y + 3.2, wz1 - 0.02], Math.PI, 63);
    noticeBoard(kit, [-18.2, Y + 1.75, wz1 - 0.04], Math.PI, 1.8, 1.0, 64);
    wallBench(kit, [-18.2, Y, wz1 - 0.3], Math.PI, 1.8);
    bootRack(kit, [-16.2, Y, wz1 - 0.2], Math.PI, 4, 65);
    cabinet(kit, PALETTE, [-14.6, Y, wz1 - 0.25], Math.PI, { h: 1.4, color: 0x8a1a12, emit: "emitRedImp", seed: 66 });
    cabinet(kit, PALETTE, [-13.25, Y, wz1 - 0.25], Math.PI, { h: 1.8, color: IMP.impMid, seed: 67 });
    cabinet(kit, PALETTE, [-11.98, Y, wz1 - 0.25], Math.PI, { h: 1.8, color: GREY, seed: 68 });
    wallScreen(kit, [-13.0, Y + 2.85, wz1 - 0.07], Math.PI, 1.4, 0.8, SCR);
    vent(kit, [-16.2, Y + 3.5, wz1 - 0.02], Math.PI, 0.7, 0.35);
    // aft wall top band: pipe run (> 1 m above the 3 m door lintel)
    pipe(kit, PALETTE, [wx0 + 0.2, Y + 4.2, wz1 - 0.2], [wx1 - 0.2, Y + 4.2, wz1 - 0.2], 0.06, { bracket: 2.6 });

    // ---------------------------------------------------------------- lights (warm white)
    const L = (x, z, intensity = 26, distance = 10, color = 0xffe0bd, y = Y + 4.2, priority = 0.5) => ctx.lights.push({ type: "point", pos: [x, y, z], color, intensity, distance, priority });
    for (const z of [347.5, 352.5, 357.5, 362.5, 367.5]) L(CX, z);
    // bay nook lights under the soffit (alternating sides)
    for (const k of [0, 2, 4]) L(CX - 7.0, MOD0 + k * MOD + SLOT + BAY / 2, 14, 9, 0xffe6cc, Y + 2.8, 0.4);
    for (const k of [1, 3]) L(CX + 7.0, MOD0 + k * MOD + SLOT + BAY / 2, 14, 9, 0xffe6cc, Y + 2.8, 0.4);
    L(CX, 341.8, 20, 10, 0xfff0e0);
    L(CX, 371.0, 22, 9);
    return {};
  },
});
