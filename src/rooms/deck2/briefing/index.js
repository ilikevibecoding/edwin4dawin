// Deck 2 briefing room: a tiered tactical auditorium. Three raised seating platforms (two blocks of
// six fixed seats each, desks with lit key strips) step up toward the aft door; a floor-level carpeted
// aisle leads forward to a large holo table under a recessed blue coffer, podium consoles and a
// three-screen display wall. Blue displays, amber status strips, holo cyan (§11). The walking floor
// stays at y 40 everywhere; the tiers are collided platforms the player looks at, not walks on.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng } from "../../../kit.js";
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { rail } from "../_shared/shell.js";
import { placer, console as consoleProp, indicatorField, wallScreen, crate, holoTable, cabinet, floorLine } from "../_shared/props.js";
import { fixedSeat, deskRow, statusBoard, statusStrip, cableTray, lightChannel, junctionBox, dutyDesk, podiumBack, podiumTop, lectern, ventGrille, duct } from "./props.js";

const Y = 40;
const CEIL = 46;
const IX0 = 11.3; // inner wall faces
const IX1 = 32.7;
const IZ0 = 348.3;
const IZ1 = 372.2;
const CX = 22;
const AISLE = [20.8, 23.2];
const TIER_Z0 = 358;
const TIER_D = 3;
const RISER = 0.35;
const HOLO = [CX, Y, 354.6];
const BLACK = IMP.impBlack;
const DARK = IMP.impDark;
const MID = IMP.impMid;
const CARPET = 0x272b34;

export default defineRoom({
  id: "d2-briefing",
  name: "Briefing Room",
  deck: 2,
  x: [11, 33],
  z: [348, 372.5],
  ceil: CEIL,
  spawn: { pos: [22, Y, 370], yaw: 0 },
  views: {
    "d2-briefing-door": { pos: [22, Y, 369.6], yaw: 0, pitch: -2 },
    "d2-briefing-holo": { pos: [14.7, Y, 357.3], yaw: -52, pitch: 2 },
    "d2-briefing-seats": { pos: [22, Y, 357.0], yaw: 180, pitch: 1 },
    "d2-briefing-aft": { pos: [30.2, Y, 368.4], yaw: 122, pitch: -2 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    floor: { color: IMP.impDark, mat: "blackGloss" },
    // own ceiling below (texel 4 slab): the shell's painted panels read as low-frequency mottling under
    // the blue fills and its 2.5-texel plates as speckle
    ceiling: false,
    lights: false,
    doorDressing: { accent: "emitBlue" },
    // tray + pipe runs at 3.5 m on the side walls only: on the aft wall the polished pipes threw two
    // bare white highlights at 3 m in the seats view, so that wall carries matte ducting instead
    serviceBand: { y: 3.5, faces: ["e", "w"] },
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const seatRand = rng(4242);

    // ---- seating tiers ---------------------------------------------------------------------------
    const blocks = [
      { x0: 12.7, x1: AISLE[0], seats: [0, 1, 2, 3, 4, 5].map((i) => 13.95 + 1.1 * i), railX: AISLE[0] - 0.05, edgeX: AISLE[0] },
      { x0: AISLE[1], x1: 31.3, seats: [0, 1, 2, 3, 4, 5].map((i) => 24.55 + 1.1 * i), railX: AISLE[1] + 0.05, edgeX: AISLE[1] },
    ];
    // two cushion colours alternate along every row (charcoal / oxblood), the middle row has solid
    // panel arms, ~15 % of seats are folded up and a few are swivelled
    const cushions = [0x1e2126, 0x4a3038];
    for (let k = 0; k < 3; k++) {
      const z0 = TIER_Z0 + k * TIER_D;
      const z1 = z0 + TIER_D;
      const top = Y + RISER * (k + 1);
      for (const b of blocks) {
        kit.boxMM("paintedMetal", [b.x0, Y, z0], [b.x1, top - 0.02, z1], { color: DARK, texel: 2.5 });
        kit.boxMM("blackGloss", [b.x0, top - 0.02, z0], [b.x1, top, z1], { color: DARK });
        // riser nosing + aisle edge light
        kit.boxMM("emitWhite", [b.x0 + 0.1, top - 0.04, z0 - 0.015], [b.x1 - 0.1, top - 0.025, z0 + 0.005]);
        // aisle-side edge light: 0.01 proud into the aisle, 0.005 embedded in the platform
        const ex0 = b.edgeX === AISLE[0] ? b.edgeX - 0.005 : b.edgeX - 0.01;
        kit.boxMM("emitBlue", [ex0, top - 0.05, z0 + 0.1], [ex0 + 0.015, top - 0.035, z1 - 0.1]);
        deskRow(kit, b.seats[0] - 0.65, b.seats[5] + 0.65, top, z0, b.seats, 100 + k * 7 + b.x0);
        b.seats.forEach((sx, i) => {
          const v = seatRand();
          fixedSeat(kit, sx, top, z0 + 1.7, {
            yaw: v > 0.6 ? (seatRand() - 0.5) * 0.7 : 0,
            folded: v < 0.15,
            headrest: k === 0,
            cushion: cushions[(i + k) % 2],
            arms: k === 1 ? 1 : 0,
          });
        });
        rail(kit, PALETTE, [b.railX, top, z0 + 0.1], [b.railX, top, z1 - 0.1], top, { h: 1.02, post: 1.4 });
      }
    }
    // back rails on the top tier (1.05 m drop to the entry floor) and block colliders
    const topY = Y + RISER * 3;
    const zBack = TIER_Z0 + 3 * TIER_D;
    // back wall of the top tier: mid-grey trim band, recessed dark panel, amber edge dashes
    for (const [bx0, bx1] of [[IX0 + 0.04, AISLE[0]], [AISLE[1], IX1 - 0.04]]) {
      kit.boxMM("paintedMetal", [bx0 + 0.05, Y + 0.12, zBack], [bx1 - 0.05, Y + 0.82, zBack + 0.012], { color: BLACK, texel: 2.5 });
      kit.boxMM("paintedMetal", [bx0, Y + 0.5, zBack], [bx1, Y + 0.56, zBack + 0.03], { color: MID });
      for (let x = bx0 + 0.3; x < bx1 - 0.6; x += 1.5) kit.boxMM("emitAmber", [x, topY - 0.09, zBack], [x + 0.5, topY - 0.06, zBack + 0.012]);
    }
    // row markers on the aisle faces of every tier (lit plate at the front corner of each platform)
    for (let k = 0; k < 3; k++) {
      const z0 = TIER_Z0 + k * TIER_D;
      const top = Y + RISER * (k + 1);
      for (const [ex, s] of [[AISLE[0], 1], [AISLE[1], -1]]) {
        const x0 = s > 0 ? ex : ex - 0.02;
        kit.boxMM("darkGloss", [x0, top - 0.3, z0 + 0.25], [x0 + 0.02, top - 0.1, z0 + 0.65]);
        kit.boxMM("emitAmber", [x0 + (s > 0 ? 0.02 : -0.006), top - 0.25, z0 + 0.32], [x0 + (s > 0 ? 0.026 : 0.0), top - 0.15, z0 + 0.42]);
        kit.boxMM("emitBlue", [x0 + (s > 0 ? 0.02 : -0.006), top - 0.25, z0 + 0.48], [x0 + (s > 0 ? 0.026 : 0.0), top - 0.15, z0 + 0.58]);
      }
    }
    rail(kit, PALETTE, [11.45, topY, zBack - 0.06], [AISLE[0] - 0.05, topY, zBack - 0.06], topY, { h: 1.02, post: 1.5 });
    rail(kit, PALETTE, [AISLE[1] + 0.05, topY, zBack - 0.06], [32.55, topY, zBack - 0.06], topY, { h: 1.02, post: 1.5 });
    for (const b of blocks) kit.collider([b.x0, Y, TIER_Z0], [b.x1, Y + 2.6, zBack], "tier");

    // stepped side aisles against the walls (0.175 m treads climbing with the tiers)
    for (const [sx0, sx1] of [[IX0 + 0.04, 12.7], [31.3, IX1 - 0.04]]) {
      for (let i = 0; i < 6; i++) {
        const z0 = TIER_Z0 + i * 1.5;
        const t = Y + 0.175 * (i + 1);
        kit.boxMM("paintedMetal", [sx0, Y, z0], [sx1, t - 0.02, z0 + 1.5], { color: DARK, texel: 2.5 });
        kit.boxMM("blackGloss", [sx0, t - 0.02, z0], [sx1, t, z0 + 1.5], { color: DARK });
        kit.boxMM("emitWhite", [sx0 + 0.08, t - 0.035, z0 - 0.015], [sx1 - 0.08, t - 0.022, z0 + 0.005]);
      }
      kit.collider([sx0, Y, TIER_Z0], [sx1, Y + 2.6, zBack], "steps");
    }
    // aisle: dark carpet filling the aisle wall to wall (ends buried 0.1 in the tier blocks), running
    // from the front of the tiers right up to the shell's threshold strip (z 371.5), with dim grey edge
    // lines; no bare floor is left between the runner and the strip to catch the fill as a pale pad
    const CZ1 = 371.46;
    kit.boxMM("fabric", [AISLE[0] - 0.1, Y, TIER_Z0 - 0.6], [AISLE[1] + 0.1, Y + 0.012, CZ1], { color: CARPET, texel: 2 });
    for (const x of [AISLE[0] + 0.14, AISLE[1] - 0.17]) kit.boxMM("paintedMetal", [x, Y + 0.012, TIER_Z0 - 0.5], [x + 0.03, Y + 0.015, CZ1 - 0.1], { color: IMP.impGrey });
    kit.boxMM("paintedMetal", [AISLE[0] + 0.14, Y + 0.012, CZ1 - 0.13], [AISLE[1] - 0.14, Y + 0.015, CZ1 - 0.1], { color: IMP.impGrey });
    kit.boxMM("paintedMetal", [AISLE[0] + 0.14, Y + 0.012, TIER_Z0 - 0.5], [AISLE[1] - 0.14, Y + 0.015, TIER_Z0 - 0.47], { color: IMP.impGrey });

    // ---- front: holo table, dais, podium consoles with audience-facing top screens, lectern ----------
    kit.cyl("darkGloss", HOLO[0], Y + 0.01, HOLO[2], 2.7, 0.02, "y", { segments: 48 });
    kit.add("emitBlue", new THREE.TorusGeometry(2.62, 0.02, 6, 72), { pos: [HOLO[0], Y + 0.03, HOLO[2]], rot: [Math.PI / 2, 0, 0] });
    const holo = holoTable(ctx, HOLO, { r: 1.8, h: 0.95, holoH: 2.3 });
    consoleProp(kit, PALETTE, [17.3, Y, 353.7], Math.PI, { w: 1.6, d: 0.8, h: 1.2, screens: 2, seed: 31, screenMat: "screenImp1" });
    podiumBack(kit, [17.3, Y, 354.105], 0, 1.6, { screenMat: "screenImp2" });
    podiumTop(kit, [17.3, Y, 353.7], Math.PI, 1.6, { h: 1.2, d: 0.8, screenMat: "screenImp0" });
    consoleProp(kit, PALETTE, [26.7, Y, 353.7], Math.PI, { w: 1.2, d: 0.8, h: 1.15, screens: 1, seed: 32, screenMat: "screenImp0" });
    podiumBack(kit, [26.7, Y, 354.105], 0, 1.2, { screenMat: "screenImp3" });
    podiumTop(kit, [26.7, Y, 353.7], Math.PI, 1.2, { h: 1.15, d: 0.8, screenMat: "screenImp2" });
    // the briefing officer's lectern beside the podium, facing the seats
    lectern(kit, [15.7, Y, 355.05], 0.12, { screenMat: "screenImp1" });

    // ---- forward display wall ------------------------------------------------------------------------
    const FZ = IZ0 + 0.02;
    kit.boxMM("paintedMetal", [15.4, Y + 0.5, FZ], [28.6, 45.45, FZ + 0.1], { color: BLACK, texel: 2.5 });
    for (const [a, b] of [[[15.4, Y + 0.5], [28.6, Y + 0.66]], [[15.4, 45.29], [28.6, 45.45]]]) kit.boxMM("paintedMetal", [a[0], a[1], FZ + 0.1], [b[0], b[1], FZ + 0.14], { color: DARK, texel: 2.5 });
    for (const x of [15.4, 28.44]) kit.boxMM("paintedMetal", [x, Y + 0.5, FZ + 0.1], [x + 0.16, 45.45, FZ + 0.14], { color: DARK, texel: 2.5 });
    for (const x of [15.6, 28.36]) kit.boxMM("emitBlue", [x, Y + 0.8, FZ + 0.1], [x + 0.04, 45.15, FZ + 0.115]);
    kit.collider([15.4, Y, IZ0], [28.6, Y + 5.5, FZ + 0.3], "display-wall");
    const screenMats = ["screenImp0", "screenImp1", "screenImp3"];
    [18, 22, 26].forEach((x, i) => wallScreen(kit, [x, 43.05, FZ + 0.1 + 0.08], 0, 3.6, 2.0, screenMats[i]));
    kit.boxMM("emitBlue", [16.0, 44.5, FZ + 0.1], [28.0, 44.56, FZ + 0.112]);
    {
      const P = placer(kit, [CX, 0, FZ + 0.1], 0);
      indicatorField(P, 0, 44.95, 0, 12.0, 0.36, 77, { density: 0.5, weights: [0.2, 0.6, 0.2, 0] });
    }
    [18, 22, 26].forEach((x, i) => statusBoard(kit, [x, 41.35, FZ + 0.1], 0, 3.3, 1.1, 200 + i, { rows: 4, accent: i === 1 ? "emitAmber" : "emitBlue", secondary: i === 1 ? "emitBlue" : "emitAmber" }));
    // flanking equipment cabinets, boards above them, corner conduit bundles
    for (const [xa, xb, cx] of [[13.3, 14.6, 14.0], [29.4, 30.7, 30.0]]) {
      cabinet(kit, PALETTE, [xa, Y, IZ0 + 0.32], 0, { w: 1.2, h: 2.0, d: 0.6, color: DARK, emit: "emitBlue", seed: 13 + xa });
      cabinet(kit, PALETTE, [xb, Y, IZ0 + 0.32], 0, { w: 1.2, h: 2.0, d: 0.6, color: DARK, emit: "emitAmber", seed: 14 + xb });
      statusBoard(kit, [cx, 42.75, IZ0], 0, 2.4, 1.1, 300 + cx, { rows: 4 });
    }
    for (const x of [11.75, 32.25]) {
      for (const dz of [-0.12, 0, 0.12]) kit.cyl("metal", x, Y + 3, IZ0 + 0.45 + dz, 0.05, 6, "y", { color: DARK, segments: 8 });
      for (const y of [41.0, 43.0, 45.0]) kit.box("paintedMetal", x, y, IZ0 + 0.3, 0.2, 0.12, 0.6, { color: BLACK });
      kit.collider([x - 0.2, Y, IZ0], [x + 0.2, Y + 6, IZ0 + 0.75], "conduit");
    }

    // ---- side walls: amber status strips, boards and screens in the 1.5-2.8 m band, junction boxes ----
    for (const side of [{ x: IX0, yaw: Math.PI / 2, d: 1, mats: ["screenImp2", "screenImp3"] }, { x: IX1, yaw: -Math.PI / 2, d: -1, mats: ["screenImp0", "screenImp1"] }]) {
      statusStrip(kit, [side.x, 44.6, 360.4], side.yaw, 22.6);
      statusBoard(kit, [side.x, 42.15, 352.8], side.yaw, 3.0, 1.3, 400 + side.x, { rows: 5 });
      wallScreen(kit, [side.x + side.d * 0.1, 42.0, 355.7], side.yaw, 1.6, 0.9, side.mats[0]);
      junctionBox(kit, [side.x, 42.9, 349.6], side.yaw, { conduitUp: 0.38 });
      statusBoard(kit, [side.x, 42.15, 360.0], side.yaw, 2.6, 1.2, 410 + side.x, { rows: 4, accent: "emitBlue", secondary: "emitAmber" });
      wallScreen(kit, [side.x + side.d * 0.1, 42.0, 362.4], side.yaw, 1.4, 0.9, side.mats[1]);
      statusBoard(kit, [side.x, 42.15, 364.8], side.yaw, 2.6, 1.2, 420 + side.x, { rows: 4 });
      // 2.9-3.4 m band between the boards and the shell's service tray: vent grilles + junction boxes
      // with conduits up to the tray
      for (const z of [353.0, 358.2, 362.4, 367.4]) ventGrille(kit, [side.x, 43.15, z], side.yaw, 0.9, 0.45);
      for (const z of [355.7, 364.8, 370.2]) junctionBox(kit, [side.x, 43.1, z], side.yaw, { w: 0.34, h: 0.4, conduitUp: 0.19 });
    }

    // ---- aft zone: duty stations backed against the aft wall either side of the door, comms console,
    //      equipment locker, crates, rear boards ---------------------------------------------------------
    consoleProp(kit, PALETTE, [IX1 - 0.45, Y, 370.3], -Math.PI / 2, { w: 1.6, d: 0.8, h: 1.2, screens: 1, seed: 41, screenMat: "screenImp0" });
    wallScreen(kit, [IX1 - 0.1, 42.0, 370.3], -Math.PI / 2, 1.4, 0.9, "screenImp2");
    junctionBox(kit, [IX1, 42.6, 368.2], -Math.PI / 2, { conduitUp: 0.65 });
    cabinet(kit, PALETTE, [IX0 + 0.32, Y, 368.6], Math.PI / 2, { w: 1.2, h: 1.9, d: 0.6, color: MID, emit: "emitAmber", seed: 17 });
    crate(kit, PALETTE, [12.35, Y, 371.15], 0.12, { seed: 5, color: MID, bumperMat: "paintedMetal" });
    crate(kit, PALETTE, [13.75, Y, 371.3], -0.08, { seed: 6, color: DARK, bumperMat: "paintedMetal" });
    crate(kit, PALETTE, [12.35, Y + 1.2, 371.15], 0.12, { w: 0.8, h: 0.6, d: 0.8, seed: 7, color: IMP.impGrey, bumperMat: "paintedMetal" });
    // duty desks: backs to the aft wall under their status boards, officers facing the wall screens;
    // the shell's door dressing supplies keypad, sign, lintel indicator and threshold strip
    dutyDesk(kit, [16.9, Y, IZ1 - 0.45], Math.PI, { screenMat: "screenImp2", seed: 61 });
    statusBoard(kit, [16.9, 42.3, IZ1], Math.PI, 3.2, 1.2, 500, { rows: 4 });
    dutyDesk(kit, [27.1, Y, IZ1 - 0.45], Math.PI, { screenMat: "screenImp1", seed: 62 });
    statusBoard(kit, [27.1, 42.3, IZ1], Math.PI, 2.4, 1.2, 501, { rows: 4, accent: "emitBlue", secondary: "emitAmber" });
    // station bays marked on the deck (three-sided, open to the wall) so the aft floor in front of the
    // camera carries a read instead of bare gloss
    for (const [x0, x1] of [[15.4, 18.4], [25.6, 30.1]]) {
      floorLine(kit, [x0, Y + 0.012, 369.5], [x1, Y + 0.012, 369.5], 0.06, "paintedMetal", IMP.impGrey);
      for (const x of [x0, x1]) floorLine(kit, [x, Y + 0.012, 369.5], [x, Y + 0.012, IZ1 - 0.12], 0.06, "paintedMetal", IMP.impGrey);
    }
    wallScreen(kit, [24.95, 42.0, IZ1 - 0.1], Math.PI, 1.2, 0.9, "screenImp3");
    wallScreen(kit, [30.6, 42.0, IZ1 - 0.1], Math.PI, 1.4, 0.9, "screenImp2");
    junctionBox(kit, [32.15, 41.6, IZ1], Math.PI, { w: 0.4, h: 0.5, conduitUp: 1.6 });
    // equipment cases stacked beside the starboard duty station
    crate(kit, PALETTE, [29.0, Y, 371.5], -0.06, { seed: 8, color: MID, bumperMat: "paintedMetal" });
    crate(kit, PALETTE, [29.0, Y + 1.2, 371.5], 0.1, { w: 0.8, h: 0.6, d: 0.8, seed: 9, color: DARK, bumperMat: "paintedMetal" });
    // aft wall 2.9-4.0 m: vents above the boards, junction boxes, a matte duct run at 3.85 m
    for (const x of [13.5, 19.3, 24.95, 30.6]) ventGrille(kit, [x, 43.15, IZ1], Math.PI, 0.9, 0.45);
    for (const x of [14.9, 29.1]) junctionBox(kit, [x, 43.2, IZ1], Math.PI, { w: 0.34, h: 0.4, conduitUp: 0.3 });
    duct(kit, [IX0 + 0.6, 43.85, IZ1 - 0.24], [IX1 - 0.6, 43.85, IZ1 - 0.24], { w: 0.44, h: 0.3, flange: 2.4 });

    // ---- ceiling: plated slab with a 2 m seam grid (texel 4 keeps the worn-metal map sub-pixel) ----------
    kit.boxMM("paintedMetal", [room.bounds.min[0], CEIL - 0.06, room.bounds.min[2]], [room.bounds.max[0], CEIL + 0.5, room.bounds.max[2]], { color: DARK, texel: 4 });
    for (let x = IX0 + 2.0; x < IX1 - 0.5; x += 2.0) kit.boxMM("paintedMetal", [x - 0.015, CEIL - 0.072, IZ0], [x + 0.015, CEIL - 0.06, IZ1], { color: BLACK });
    for (let z = IZ0 + 2.0; z < IZ1 - 0.5; z += 2.0) kit.boxMM("paintedMetal", [IX0, CEIL - 0.072, z - 0.015], [IX1, CEIL - 0.06, z + 0.015], { color: BLACK });

    // ---- high level: cable trays, light channels, holo coffer ------------------------------------------
    cableTray(kit, [IX0 + 0.3, 45.25, 349.0], [IX0 + 0.3, 45.25, 371.5], { wallDir: [-1, 0, 0] });
    cableTray(kit, [IX1 - 0.3, 45.25, 349.0], [IX1 - 0.3, 45.25, 371.5], { wallDir: [1, 0, 0] });
    cableTray(kit, [IX0 + 0.55, 45.25, IZ1 - 0.3], [IX1 - 0.55, 45.25, IZ1 - 0.3], { wallDir: [0, 0, 1] });
    for (const z of [350.3, 359.7, 362.7, 365.7, 369.6]) lightChannel(kit, 12.4, 31.6, z, CEIL);
    {
      const [ox0, ox1, oz0, oz1] = [18.5, 25.5, 351.1, 358.1];
      const [nx0, nx1, nz0, nz1] = [19.3, 24.7, 351.9, 357.3];
      const yb = CEIL - 0.45;
      const yt = CEIL - 0.06;
      // clean plates (texel 4): the panel map's grime and the 2.5-texel worn metal both read as dirt here
      kit.boxMM("paintedMetal", [ox0, yb, oz0], [ox1, yt, nz0], { color: BLACK, texel: 4 });
      kit.boxMM("paintedMetal", [ox0, yb, nz1], [ox1, yt, oz1], { color: BLACK, texel: 4 });
      kit.boxMM("paintedMetal", [ox0, yb, nz0], [nx0, yt, nz1], { color: BLACK, texel: 4 });
      kit.boxMM("paintedMetal", [nx1, yb, nz0], [ox1, yt, nz1], { color: BLACK, texel: 4 });
      // outer lip and inner blue ring
      kit.boxMM("paintedMetal", [ox0 - 0.05, yb - 0.02, oz0 - 0.05], [ox1 + 0.05, yb + 0.06, oz1 + 0.05], { color: MID, texel: 4 });
      const sy0 = yb + 0.14;
      const sy1 = yb + 0.24;
      kit.boxMM("emitBlue", [nx0 + 0.05, sy0, nz0 - 0.005], [nx1 - 0.05, sy1, nz0 + 0.02]);
      kit.boxMM("emitBlue", [nx0 + 0.05, sy0, nz1 - 0.02], [nx1 - 0.05, sy1, nz1 + 0.005]);
      kit.boxMM("emitBlue", [nx0 - 0.005, sy0, nz0 + 0.05], [nx0 + 0.02, sy1, nz1 - 0.05]);
      kit.boxMM("emitBlue", [nx1 - 0.02, sy0, nz0 + 0.05], [nx1 + 0.005, sy1, nz1 - 0.05]);
      // blue underside glow line on the coffer's bottom face
      kit.boxMM("emitBlue", [ox0 + 0.3, yb - 0.012, oz0 + 0.3], [ox1 - 0.3, yb + 0.005, oz0 + 0.34]);
      kit.boxMM("emitBlue", [ox0 + 0.3, yb - 0.012, oz1 - 0.34], [ox1 - 0.3, yb + 0.005, oz1 - 0.3]);
      kit.boxMM("emitBlue", [ox0 + 0.3, yb - 0.012, oz0 + 0.34], [ox0 + 0.34, yb + 0.005, oz1 - 0.34]);
      kit.boxMM("emitBlue", [ox1 - 0.34, yb - 0.012, oz0 + 0.34], [ox1 - 0.3, yb + 0.005, oz1 - 0.34]);
      kit.boxMM("darkGloss", [nx0 + 0.05, CEIL - 0.1, nz0 + 0.05], [nx1 - 0.05, CEIL - 0.07, nz1 - 0.05]);
      // holo projector: a drum hung 0.7 m into the coffer on a stem, mid-grey band, dark lens inside a
      // blue lens ring, status LEDs, and three feed cables running out to the coffer frame
      const PJ = CEIL - 0.1;
      kit.cyl("paintedMetal", HOLO[0], PJ - 0.2, HOLO[2], 0.05, 0.4, "y", { color: BLACK, segments: 10, texel: 2.5 });
      kit.cyl("paintedMetal", HOLO[0], PJ - 0.55, HOLO[2], 0.42, 0.3, "y", { color: BLACK, segments: 28, texel: 4 });
      kit.cyl("paintedMetal", HOLO[0], PJ - 0.62, HOLO[2], 0.44, 0.05, "y", { color: MID, segments: 28, open: true });
      kit.cyl("paintedMetal", HOLO[0], PJ - 0.44, HOLO[2], 0.44, 0.04, "y", { color: MID, segments: 28, open: true });
      kit.cyl("darkGloss", HOLO[0], PJ - 0.715, HOLO[2], 0.2, 0.03, "y", { segments: 24 });
      kit.add("emitBlue", new THREE.TorusGeometry(0.27, 0.014, 6, 48), { pos: [HOLO[0], PJ - 0.705, HOLO[2]], rot: [Math.PI / 2, 0, 0] });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        kit.box(i === 1 ? "emitRedImp" : "emitAmber", HOLO[0] + Math.sin(a) * 0.425, PJ - 0.53, HOLO[2] + Math.cos(a) * 0.425, 0.03, 0.02, 0.03);
      }
      const cableCols = [BLACK, DARK, 0x3a3f5a];
      [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6].forEach((a, i) => {
        // run to the square inner face of the frame (half-width 2.7), 3 cm into it
        const t = Math.min(2.7 / Math.max(Math.abs(Math.sin(a)), 1e-3), 2.7 / Math.max(Math.abs(Math.cos(a)), 1e-3)) + 0.03;
        const from = new THREE.Vector3(HOLO[0] + Math.sin(a) * 0.3, PJ - 0.4, HOLO[2] + Math.cos(a) * 0.3);
        const to = new THREE.Vector3(HOLO[0] + Math.sin(a) * t, yb + 0.1, HOLO[2] + Math.cos(a) * t);
        const d = to.clone().sub(from);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        // 6 cm cables: at 15 m (door view) that is two pixels, thin enough to read as a cable, thick
        // enough not to alias into a dotted line
        kit.add("paintedMetal", new THREE.CylinderGeometry(0.03, 0.03, d.length(), 8), { pos: from.clone().add(to).multiplyScalar(0.5).toArray(), quat: q, color: cableCols[i], uv: "scale", uvScale: [0.3, d.length()] });
      });
    }

    // ---- lights (fills 1.3 m below the ceiling, each under a light channel) -----------------------------
    const L = (pos, color, intensity, distance, priority = 0.5) => ctx.lights.push({ type: "point", pos, color, intensity, distance, priority });
    L([HOLO[0], Y + 3.4, HOLO[2]], 0x4fd8ff, 34, 9, 0.9);
    L([CX, 43.0, 350.2], 0x7aa6ff, 26, 10, 0.7);
    L([16.5, 44.7, 359.7], 0xd6e2ff, 26, 12);
    L([27.5, 44.7, 359.7], 0xd6e2ff, 26, 12);
    L([16.5, 44.7, 365.7], 0xd6e2ff, 26, 12);
    L([27.5, 44.7, 365.7], 0xd6e2ff, 26, 12);
    // aft fills over the two duty stations instead of one over the door approach (whose pool on the
    // gloss floor read as a pale pad at the end of the runner)
    L([17.2, 44.7, 369.6], 0xd6e2ff, 14, 9, 0.6);
    L([26.8, 44.7, 369.6], 0xd6e2ff, 14, 9, 0.6);
    L([12.2, 44.3, 353.0], 0xffa540, 10, 6, 0.3);
    L([31.8, 44.3, 353.0], 0xffa540, 10, 6, 0.3);

    // ---- hologram: tactical plot rings, a wire planet with an orbit ring and a wedge ship on it ---------
    const hm = holo.material;
    const canPulse = typeof hm.opacity === "number";
    holo.cone.scale.set(0.62, 1, 0.62); // slimmer projection beam, the subject sits inside it
    const wire = (geo) => new THREE.Mesh(geo, hm);
    const ringGeo = mergeGeometries([
      new THREE.TorusGeometry(0.72, 0.015, 6, 48).rotateX(Math.PI / 2),
      new THREE.TorusGeometry(1.15, 0.012, 6, 64).rotateX(Math.PI / 2),
      new THREE.BoxGeometry(2.3, 0.01, 0.02),
      new THREE.BoxGeometry(0.02, 0.01, 2.3),
    ], false);
    const rings = wire(ringGeo);
    rings.position.set(HOLO[0], Y + 0.95 + 0.9, HOLO[2]);
    const subject = new THREE.Group();
    subject.position.set(HOLO[0], Y + 0.95 + 1.3, HOLO[2]);
    const R = 0.5;
    const planet = new THREE.Group();
    const eq = wire(new THREE.TorusGeometry(R, 0.012, 6, 64));
    eq.rotation.x = Math.PI / 2;
    planet.add(eq);
    for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const m = wire(new THREE.TorusGeometry(R, 0.01, 6, 64));
      m.rotation.y = a;
      planet.add(m);
    }
    for (const phi of [0.75, -0.75]) {
      const t = wire(new THREE.TorusGeometry(R * Math.cos(phi), 0.009, 6, 48));
      t.rotation.x = Math.PI / 2;
      t.position.y = R * Math.sin(phi);
      planet.add(t);
    }
    planet.add(wire(new THREE.BoxGeometry(0.008, 2 * R + 0.5, 0.008)));
    // wedge ship (plan-view outline + spine + bridge tower) riding a tilted orbit ring
    const edge = (a, b) => {
      const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const m = wire(new THREE.BoxGeometry(0.008, d.length(), 0.008));
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return m;
    };
    const ship = new THREE.Group();
    ship.add(edge([0.26, 0, 0], [-0.16, 0, 0.13]), edge([0.26, 0, 0], [-0.16, 0, -0.13]), edge([-0.16, 0, 0.13], [-0.16, 0, -0.13]));
    ship.add(edge([-0.16, 0, 0], [0.22, 0, 0]), edge([-0.06, 0, 0], [-0.06, 0.08, 0]), edge([-0.16, 0.03, 0.06], [-0.16, 0.03, -0.06]));
    const tower = wire(new THREE.BoxGeometry(0.06, 0.03, 0.05));
    tower.position.set(-0.06, 0.085, 0);
    ship.add(tower);
    ship.position.set(0.95, 0, 0);
    const orbitSpin = new THREE.Group();
    const orbitRing = wire(new THREE.TorusGeometry(0.95, 0.007, 6, 96));
    orbitRing.rotation.x = Math.PI / 2;
    orbitSpin.add(orbitRing, ship);
    const orbit = new THREE.Group();
    orbit.rotation.set(0.38, 0, 0.12);
    orbit.add(orbitSpin);
    subject.add(planet, orbit);
    ctx.group.add(rings, subject);
    return {
      update(dt, t) {
        holo.grid.rotation.z = t * 0.45;
        rings.rotation.y = -t * 0.3;
        planet.rotation.y = t * 0.25;
        orbitSpin.rotation.y = -t * 0.5;
        if (canPulse) hm.opacity = 0.3 + 0.08 * Math.sin(t * 2.1);
      },
    };
  },
});
