// Deck 2 briefing room: a tiered tactical auditorium. Three raised seating platforms (two blocks of
// six fixed seats each, desks with lit key strips) step up toward the aft door; a floor-level central
// aisle leads forward to a large holo table under a recessed blue coffer, a podium console and a
// three-screen display wall. Blue displays, amber status strips, holo cyan (§11). The walking floor
// stays at y 40 everywhere; the tiers are collided platforms the player looks at, not walks on.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { rail } from "../_shared/shell.js";
import { placer, console as consoleProp, indicatorField, wallScreen, crate, holoTable, cabinet } from "../_shared/props.js";
import { fixedSeat, deskRow, statusBoard, statusStrip, cableTray, doorPanel, lightChannel, junctionBox } from "./props.js";

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
    "d2-briefing-holo": { pos: [14.4, Y, 357.6], yaw: -52, pitch: 1 },
    "d2-briefing-seats": { pos: [22, Y, 357.0], yaw: 180, pitch: 1 },
    "d2-briefing-aft": { pos: [30.2, Y, 368.4], yaw: 118, pitch: -2 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    floor: { color: IMP.impDark, mat: "blackGloss" },
    ceiling: { channels: 0, color: IMP.impDark, panelW: 2.0 },
    lights: false,
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;

    // ---- seating tiers ---------------------------------------------------------------------------
    const blocks = [
      { x0: 12.7, x1: AISLE[0], seats: [0, 1, 2, 3, 4, 5].map((i) => 13.95 + 1.1 * i), railX: AISLE[0] - 0.05, edgeX: AISLE[0] },
      { x0: AISLE[1], x1: 31.3, seats: [0, 1, 2, 3, 4, 5].map((i) => 24.55 + 1.1 * i), railX: AISLE[1] + 0.05, edgeX: AISLE[1] },
    ];
    for (let k = 0; k < 3; k++) {
      const z0 = TIER_Z0 + k * TIER_D;
      const z1 = z0 + TIER_D;
      const top = Y + RISER * (k + 1);
      for (const b of blocks) {
        kit.boxMM("paintedMetal", [b.x0, Y, z0], [b.x1, top - 0.02, z1], { color: DARK, texel: 1 });
        kit.boxMM("blackGloss", [b.x0, top - 0.02, z0], [b.x1, top, z1], { color: DARK });
        // riser nosing + aisle edge light
        kit.boxMM("emitWhite", [b.x0 + 0.1, top - 0.04, z0 - 0.015], [b.x1 - 0.1, top - 0.025, z0 + 0.005]);
        // aisle-side edge light: 0.01 proud into the aisle, 0.005 embedded in the platform
        const ex0 = b.edgeX === AISLE[0] ? b.edgeX - 0.005 : b.edgeX - 0.01;
        kit.boxMM("emitBlue", [ex0, top - 0.05, z0 + 0.1], [ex0 + 0.015, top - 0.035, z1 - 0.1]);
        deskRow(kit, b.seats[0] - 0.65, b.seats[5] + 0.65, top, z0, b.seats, 100 + k * 7 + b.x0);
        for (const sx of b.seats) fixedSeat(kit, sx, top, z0 + 1.7);
        rail(kit, PALETTE, [b.railX, top, z0 + 0.1], [b.railX, top, z1 - 0.1], top, { h: 1.02, post: 1.4 });
      }
    }
    // back rails on the top tier (1.05 m drop to the entry floor) and block colliders
    const topY = Y + RISER * 3;
    const zBack = TIER_Z0 + 3 * TIER_D;
    // back wall of the top tier: mid-grey trim band, recessed dark panel, amber edge dashes
    for (const [bx0, bx1] of [[IX0 + 0.04, AISLE[0]], [AISLE[1], IX1 - 0.04]]) {
      kit.boxMM("paintedMetal", [bx0 + 0.05, Y + 0.12, zBack], [bx1 - 0.05, Y + 0.82, zBack + 0.012], { color: BLACK });
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
        kit.boxMM("paintedMetal", [sx0, Y, z0], [sx1, t - 0.02, z0 + 1.5], { color: DARK, texel: 1 });
        kit.boxMM("blackGloss", [sx0, t - 0.02, z0], [sx1, t, z0 + 1.5], { color: DARK });
        kit.boxMM("emitWhite", [sx0 + 0.08, t - 0.035, z0 - 0.015], [sx1 - 0.08, t - 0.022, z0 + 0.005]);
      }
      kit.collider([sx0, Y, TIER_Z0], [sx1, Y + 2.6, zBack], "steps");
    }
    // aisle runner: grey carpet (fabric: low env reflectance, so it does not sheen out at grazing
    // view angles the way paintedMetal does when seen down the aisle from the front) with amber dashes
    // (fills the aisle wall to wall, ends buried 0.1 in the tier blocks, so no gloss strip is left
    // beside it to mirror the ceiling)
    kit.boxMM("fabric", [AISLE[0] - 0.1, Y, TIER_Z0 - 0.6], [AISLE[1] + 0.1, Y + 0.012, IZ1 - 1.1], { color: MID, texel: 2 });
    for (let z = TIER_Z0 - 0.2; z < IZ1 - 1.7; z += 1.5) {
      kit.boxMM("emitAmber", [CX - 1.0, Y + 0.012, z], [CX - 0.94, Y + 0.016, z + 0.5]);
      kit.boxMM("emitAmber", [CX + 0.94, Y + 0.012, z], [CX + 1.0, Y + 0.016, z + 0.5]);
    }
    // entry landing between the top tier and the door approach: matte dark deck plate with a white
    // border. The gloss floor there mirrors the ceiling at grazing angles when seen from the front row.
    const LZ0 = zBack + 0.12;
    const LZ1 = IZ1 - 1.0;
    kit.boxMM("impFloor", [12.7, Y, LZ0], [31.3, Y + 0.005, LZ1], { color: DARK, texel: 0.5 });
    const line = (a, b) => kit.boxMM("paintedMetal", [a[0], Y, a[1]], [b[0], Y + 0.009, b[1]], { color: IMP.impWhite });
    line([12.7, LZ0], [AISLE[0] - 0.15, LZ0 + 0.06]);
    line([AISLE[1] + 0.15, LZ0], [31.3, LZ0 + 0.06]);
    line([12.7, LZ1 - 0.06], [31.3, LZ1]);
    line([12.7, LZ0], [12.76, LZ1]);
    line([31.24, LZ0], [31.3, LZ1]);

    // ---- front: holo table, dais, podium consoles ---------------------------------------------------
    kit.cyl("darkGloss", HOLO[0], Y + 0.01, HOLO[2], 2.7, 0.02, "y", { segments: 48 });
    kit.add("emitBlue", new THREE.TorusGeometry(2.62, 0.02, 6, 72), { pos: [HOLO[0], Y + 0.03, HOLO[2]], rot: [Math.PI / 2, 0, 0] });
    const holo = holoTable(ctx, HOLO, { r: 1.8, h: 0.95, holoH: 2.3 });
    consoleProp(kit, PALETTE, [17.3, Y, 353.7], Math.PI, { w: 1.6, d: 0.8, h: 1.2, screens: 2, seed: 31, screenMat: "screenImp1" });
    consoleProp(kit, PALETTE, [26.7, Y, 353.7], Math.PI, { w: 1.2, d: 0.8, h: 1.15, screens: 1, seed: 32, screenMat: "screenImp0" });

    // ---- forward display wall ------------------------------------------------------------------------
    const FZ = IZ0 + 0.02;
    kit.boxMM("paintedMetal", [15.4, Y + 0.5, FZ], [28.6, 45.45, FZ + 0.1], { color: BLACK, texel: 1 });
    for (const [a, b] of [[[15.4, Y + 0.5], [28.6, Y + 0.66]], [[15.4, 45.29], [28.6, 45.45]]]) kit.boxMM("paintedMetal", [a[0], a[1], FZ + 0.1], [b[0], b[1], FZ + 0.14], { color: DARK });
    for (const x of [15.4, 28.44]) kit.boxMM("paintedMetal", [x, Y + 0.5, FZ + 0.1], [x + 0.16, 45.45, FZ + 0.14], { color: DARK });
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
      statusBoard(kit, [cx, 43.35, IZ0], 0, 2.4, 1.2, 300 + cx, { rows: 4 });
    }
    for (const x of [11.75, 32.25]) {
      for (const dz of [-0.12, 0, 0.12]) kit.cyl("metal", x, Y + 3, IZ0 + 0.45 + dz, 0.05, 6, "y", { color: DARK, segments: 8 });
      for (const y of [41.0, 43.0, 45.0]) kit.box("paintedMetal", x, y, IZ0 + 0.3, 0.2, 0.12, 0.6, { color: BLACK });
      kit.collider([x - 0.2, Y, IZ0], [x + 0.2, Y + 6, IZ0 + 0.75], "conduit");
    }

    // ---- side walls: amber status strips, boards, screens, junction boxes ------------------------------
    for (const side of [{ x: IX0, yaw: Math.PI / 2, d: 1 }, { x: IX1, yaw: -Math.PI / 2, d: -1 }]) {
      statusStrip(kit, [side.x, 44.6, 360.4], side.yaw, 22.6);
      statusBoard(kit, [side.x, 43.2, 352.8], side.yaw, 3.0, 1.4, 400 + side.x, { rows: 5 });
      wallScreen(kit, [side.x + side.d * 0.1, 43.3, 355.7], side.yaw, 1.6, 0.9, side.d > 0 ? "screenImp0" : "screenImp1");
      junctionBox(kit, [side.x, 42.9, 349.6], side.yaw, { conduitUp: 2.15 });
      statusBoard(kit, [side.x, 43.25, 360.0], side.yaw, 2.6, 1.3, 410 + side.x, { rows: 4, accent: "emitBlue", secondary: "emitAmber" });
      wallScreen(kit, [side.x + side.d * 0.1, 43.3, 362.4], side.yaw, 1.4, 0.9, side.d > 0 ? "screenImp3" : "screenImp0");
      statusBoard(kit, [side.x, 43.25, 364.8], side.yaw, 2.6, 1.3, 420 + side.x, { rows: 4 });
    }

    // ---- aft zone: comms console, equipment locker, crates, door panels, rear boards ---------------------
    consoleProp(kit, PALETTE, [IX1 - 0.45, Y, 370.3], -Math.PI / 2, { w: 1.6, d: 0.8, h: 1.2, screens: 1, seed: 41, screenMat: "screenImp0" });
    wallScreen(kit, [IX1 - 0.1, 43.2, 370.3], -Math.PI / 2, 1.4, 0.9, "screenImp1");
    junctionBox(kit, [IX1, 42.6, 368.2], -Math.PI / 2, { conduitUp: 2.45 });
    cabinet(kit, PALETTE, [IX0 + 0.32, Y, 368.6], Math.PI / 2, { w: 1.2, h: 1.9, d: 0.6, color: MID, emit: "emitAmber", seed: 17 });
    crate(kit, PALETTE, [12.35, Y, 371.15], 0.12, { seed: 5, color: MID });
    crate(kit, PALETTE, [13.75, Y, 371.3], -0.08, { seed: 6, color: DARK });
    crate(kit, PALETTE, [12.35, Y + 1.2, 371.15], 0.12, { w: 0.8, h: 0.6, d: 0.8, seed: 7, color: IMP.impGrey });
    // seated duty stations flanking the door approach, facing the tiers
    consoleProp(kit, PALETTE, [16.6, Y, 368.9], 0, { w: 2.0, d: 0.8, h: 1.1, screens: 2, seed: 61, sit: true, screenMat: "screenImp3" });
    consoleProp(kit, PALETTE, [27.6, Y, 368.9], 0, { w: 2.0, d: 0.8, h: 1.1, screens: 2, seed: 62, sit: true, screenMat: "screenImp0" });
    // rear wall
    consoleProp(kit, PALETTE, [16.2, Y, IZ1 - 0.47], Math.PI, { w: 2.4, d: 0.9, h: 1.15, screens: 2, seed: 51 });
    statusBoard(kit, [16.2, 43.2, IZ1], Math.PI, 3.2, 1.4, 500, { rows: 5 });
    statusBoard(kit, [27.8, 43.2, IZ1], Math.PI, 3.2, 1.4, 501, { rows: 5, accent: "emitBlue", secondary: "emitAmber" });
    wallScreen(kit, [26.4, 41.45, IZ1 - 0.1], Math.PI, 1.4, 0.9, "screenImp1");
    wallScreen(kit, [28.9, 41.45, IZ1 - 0.1], Math.PI, 1.4, 0.9, "screenImp3");
    junctionBox(kit, [31.4, 41.5, IZ1], Math.PI, { w: 0.4, h: 0.5, conduitUp: 3.55 });
    doorPanel(kit, [19.6, 41.3, IZ1], Math.PI);
    doorPanel(kit, [24.4, 41.3, IZ1], Math.PI, { lit: "emitAmber" });

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
      kit.boxMM("paintedMetal", [ox0, yb, oz0], [ox1, yt, nz0], { color: BLACK, texel: 1 });
      kit.boxMM("paintedMetal", [ox0, yb, nz1], [ox1, yt, oz1], { color: BLACK, texel: 1 });
      kit.boxMM("paintedMetal", [ox0, yb, nz0], [nx0, yt, nz1], { color: BLACK, texel: 1 });
      kit.boxMM("paintedMetal", [nx1, yb, nz0], [ox1, yt, nz1], { color: BLACK, texel: 1 });
      // outer lip and inner blue ring
      kit.boxMM("paintedMetal", [ox0 - 0.05, yb - 0.02, oz0 - 0.05], [ox1 + 0.05, yb + 0.06, oz1 + 0.05], { color: MID });
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
      // holo projector
      kit.cyl("paintedMetal", HOLO[0], CEIL - 0.25, HOLO[2], 0.4, 0.3, "y", { color: BLACK, segments: 24 });
      kit.cyl("emitBlue", HOLO[0], CEIL - 0.405, HOLO[2], 0.22, 0.02, "y", { segments: 24 });
    }

    // ---- lights ----------------------------------------------------------------------------------------
    const L = (pos, color, intensity, distance, priority = 0.5) => ctx.lights.push({ type: "point", pos, color, intensity, distance, priority });
    L([HOLO[0], Y + 3.4, HOLO[2]], 0x4fd8ff, 34, 9, 0.9);
    L([CX, 43.6, 350.4], 0x7aa6ff, 26, 10, 0.7);
    L([16.5, 45.3, 360.2], 0xd6e2ff, 20, 12);
    L([27.5, 45.3, 360.2], 0xd6e2ff, 20, 12);
    L([16.5, 45.3, 365.2], 0xd6e2ff, 20, 12);
    L([27.5, 45.3, 365.2], 0xd6e2ff, 20, 12);
    L([CX, 45.3, 369.8], 0xd6e2ff, 16, 10, 0.6);
    L([12.2, 44.0, 353.0], 0xffa540, 10, 6, 0.3);
    L([31.8, 44.0, 353.0], 0xffa540, 10, 6, 0.3);

    // ---- holo animation ---------------------------------------------------------------------------------
    const holoMat = holo.cone.material;
    const coneMat = holoMat.clone();
    holo.cone.material = coneMat;
    const canPulse = typeof coneMat.opacity === "number";
    const ringGeo = mergeGeometries([
      new THREE.TorusGeometry(0.72, 0.015, 6, 48).rotateX(Math.PI / 2),
      new THREE.TorusGeometry(1.15, 0.012, 6, 64).rotateX(Math.PI / 2),
      new THREE.BoxGeometry(2.3, 0.01, 0.02),
      new THREE.BoxGeometry(0.02, 0.01, 2.3),
      new THREE.SphereGeometry(0.42, 18, 12),
    ], false);
    const rings = new THREE.Mesh(ringGeo, holoMat);
    rings.position.set(HOLO[0], Y + 0.95 + 1.0, HOLO[2]);
    ctx.group.add(rings);
    return {
      update(dt, t) {
        holo.grid.rotation.z = t * 0.45;
        rings.rotation.y = -t * 0.3;
        if (canPulse) coneMat.opacity = 0.27 + 0.09 * Math.sin(t * 2.1);
      },
    };
  },
});
