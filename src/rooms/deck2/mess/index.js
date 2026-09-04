// Deck 2 mess hall + galley: long tables under a high ceiling, a 10 m serving line at the aft end with
// the galley (vats, hood, prep islands, cooler) visible over a half-height wall. Neutral grey, warm
// white (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP, col } from "../_shared/palette.js";
import { cabinet, wallScreen, dropLight, duct, pipe, floorLine } from "../_shared/props.js";
import { rng } from "../../../kit.js";
import * as M from "./props.js";

const Y = 40;
const CEIL = 46.5;
const X0 = -62;
const X1 = -30;
const Z0 = 377.5;
const Z1 = 412;
const IX0 = X0 + 0.3;
const IX1 = X1 - 0.3;
const IZ0 = Z0 + 0.3;
const IZ1 = Z1 - 0.3;
const HALF = Math.PI / 2;

// Serving line geometry (shared by several elements)
const COUNTER = { x0: -51, x1: -41, zFront: 402.7, depth: 0.8 };
const OPENING = { x0: -53.2, x1: -38.8 }; // gap in the half-height galley wall
const PART_Z = 403.85; // dining face of the half wall
const PART_H = 2.2;
const TABLE_COLS = [-57.5, -50.5, -41.5, -34.5];
const TABLE_ROWS = [385.8, 389.4, 393.0, 396.6];
const hashSeed = 4171;

function detail(ctx) {
  const { kit, PALETTE, lights } = ctx;
  const P = (k) => col(PALETTE, k);
  const dark = P("impDark");
  const mid = P("impMid");
  const black = P("impBlack");
  const steel = P("steel");

  // ---- dining hall: 2 blocks × (2 columns × 4 rows) of 6 m tables, 3 m aisle from the door ------
  const rand = rng(hashSeed);
  for (const tx of TABLE_COLS) {
    for (const tz of TABLE_ROWS) {
      M.messTable(kit, PALETTE, [tx, Y, tz], 0, { len: 6, w: 0.9, seed: Math.floor(rand() * 1000) });
      dropLight(kit, PALETTE, [tx, CEIL, tz], { w: 4.6, d: 0.35, stem: 2.3, mat: "emitWarmSoft" });
      // trays left on the tables (8 seats: 4 a side)
      for (let s = 0; s < 8; s++) {
        if (rand() > 0.45) continue;
        const sx = tx - 2.25 + (s % 4) * 1.5;
        const sz = tz + (s < 4 ? -0.22 : 0.22);
        M.tableware(kit, PALETTE, [sx, Y + 0.78, sz], 100 + Math.floor(rand() * 1000));
      }
    }
  }
  // aisle edge lines (painted, not lit) from the door approach to the queue lane
  for (const x of [-47.5, -44.5]) kit.boxMM("paintedMetal", [x - 0.06, Y, 380.6], [x + 0.06, Y + 0.006, 400.1], { color: P("impWhite") });

  // ---- entry zone: hand-wash trough (west of door), tray return (east of door); a freestanding
  //      recycling station stands on the exit path east of the aisle (the hall's empty forward-east
  //      strip), the beverage point fills the forward-west strip (all clear of the 4 m door approach)
  M.washTrough(kit, PALETTE, [-53.2, Y, IZ0 + 0.26], 0, { len: 5, d: 0.5 });
  M.trayReturn(kit, PALETTE, [-39, Y, IZ0 + 0.46], 0, { len: 5, d: 0.9 });
  M.recyclingStation(kit, PALETTE, [-40.5, Y, 382.7], 0, { len: 3.0 });
  M.dispenserTower(kit, PALETTE, [-60.5, Y, 381.6], 0, 31);
  M.dispenserTower(kit, PALETTE, [-58.1, Y, 381.6], 0, 32);
  M.cupStand(kit, PALETTE, [-59.3, Y, 381.6], 0, { len: 1.2, d: 0.5 });
  wallScreen(kit, [-53.2, Y + 2.95, IZ0 + 0.09], 0, 2.4, 0.9, "screenImp2");
  wallScreen(kit, [-39, Y + 2.95, IZ0 + 0.09], 0, 2.4, 0.9, "screenImp3");
  wallScreen(kit, [-46, Y + 5.2, IZ0 + 0.09], 0, 3.2, 1.0, "screenImp0");
  // forward wall above the service band (3.8–6.5 m was plain in the hall view): the room's 0.7 m duct
  // continues across at 5.95 m on brackets, framed grille vents at 4.6 m between the screens
  duct(kit, PALETTE, [IX0 + 0.2, Y + 6.05, IZ0 + 0.55], [IX1 - 0.2, Y + 6.05, IZ0 + 0.55], 0.7, 0.5, { color: mid });
  for (let x = IX0 + 2; x < IX1 - 1; x += 4) kit.box("paintedMetal", x, Y + 6.38, IZ0 + 0.4, 0.12, 0.24, 0.8, { color: black, texel: 2.5 });
  for (const x of [-58, -50, -42, -34]) {
    kit.box("paintedMetal", x, Y + 4.6, IZ0 + 0.04, 1.4, 0.7, 0.08, { color: dark, texel: 2.5 });
    kit.box("grate", x, Y + 4.6, IZ0 + 0.086, 1.2, 0.5, 0.012);
  }
  cabinet(kit, PALETTE, [-60.6, Y, IZ0 + 0.26], 0, { w: 1.4, h: 1.9, d: 0.5, seed: 12 });
  cabinet(kit, PALETTE, [-31.4, Y, IZ0 + 0.26], 0, { w: 1.4, h: 1.9, d: 0.5, seed: 13, emit: "emitRedImp" });
  M.wallPanel(kit, PALETTE, [-58.6, Y + 1.5, IZ0 + 0.01], 0, 21);
  M.wallPanel(kit, PALETTE, [-32.6, Y + 1.5, IZ0 + 0.01], 0, 22);

  // ---- side walls of the hall: cable duct at 4.45 m (shell service band runs below it), screens,
  //      cabinets, intercom panels
  for (const side of [-1, 1]) {
    const wx = side < 0 ? IX0 : IX1; // wall face
    const yaw = side < 0 ? HALF : -HALF; // face into the room
    const off = (d) => wx + side * -1 * d; // distance into the room from the wall face
    duct(kit, PALETTE, [off(0.28), Y + 4.45, 383.5], [off(0.28), Y + 4.45, 402.5], 0.5, 0.3, { color: dark });
    for (const z of [386, 392, 398]) kit.box("paintedMetal", off(0.12), Y + 4.45, z, 0.24, 0.5, 0.6, { color: black, texel: 2.5 });
    for (const [z, sm] of [[388.2, side < 0 ? "screenImp0" : "screenImp3"], [394.8, side < 0 ? "screenImp2" : "screenImp0"]]) wallScreen(kit, [off(0.09), Y + 2.95, z], yaw, 1.6, 0.9, sm);
    cabinet(kit, PALETTE, [off(0.21), Y, 385.6], yaw, { w: 1.0, h: 1.8, d: 0.4, seed: 30 + side });
    cabinet(kit, PALETTE, [off(0.21), Y, 399.4], yaw, { w: 1.0, h: 1.8, d: 0.4, seed: 33 + side });
    M.wallPanel(kit, PALETTE, [off(0.01), Y + 1.5, 391.5], yaw, 40 + side);
    // vertical risers in the forward corners
    pipe(kit, PALETTE, [off(0.5), Y + 0.2, 379.0], [off(0.5), Y + 6.2, 379.0], 0.09, { color: steel, bracket: 2.0 });
    pipe(kit, PALETTE, [off(0.5), Y + 0.2, 379.4], [off(0.5), Y + 6.2, 379.4], 0.06, { color: dark, bracket: 2.0 });
  }

  // ---- serving line ----------------------------------------------------------------------------
  M.servingCounter(kit, PALETTE, { ...COUNTER, y: Y, h: 0.9 });
  M.dispenserTower(kit, PALETTE, [COUNTER.x0 - 0.42, Y, 403.15], Math.PI, 51);
  M.dispenserTower(kit, PALETTE, [COUNTER.x1 + 0.42, Y, 403.15], Math.PI, 52);
  // queue lane: two amber lines with position ticks
  floorLine(kit, [OPENING.x0, Y, 400.5], [OPENING.x1, Y, 400.5], 0.1);
  floorLine(kit, [OPENING.x0, Y, 402.15], [OPENING.x1, Y, 402.15], 0.1);
  for (let x = COUNTER.x0; x <= COUNTER.x1 + 0.01; x += 1.25) floorLine(kit, [x, Y, 400.55], [x, Y, 400.95], 0.08);
  // half-height galley wall: end sections + header beam over the whole width
  for (const [a, b] of [[IX0, OPENING.x0], [OPENING.x1, IX1]]) {
    kit.boxMM("paintedMetal", [a, Y, PART_Z], [b, Y + PART_H, PART_Z + 0.3], { color: black, texel: 2.5 });
    const n = Math.max(1, Math.round((b - a) / 1.7));
    for (let i = 0; i < n; i++) {
      const u0 = a + (i * (b - a)) / n + 0.03;
      const u1 = a + ((i + 1) * (b - a)) / n - 0.03;
      kit.boxMM("impPanel", [u0, Y + 0.42, PART_Z - 0.03], [u1, Y + PART_H - 0.04, PART_Z], { color: mid, uv: "keep" });
      kit.boxMM("impPanel", [u0, Y + 0.42, PART_Z + 0.3], [u1, Y + PART_H - 0.04, PART_Z + 0.33], { color: mid, uv: "keep" });
    }
    kit.boxMM("paintedMetal", [a, Y, PART_Z - 0.04], [b, Y + 0.4, PART_Z + 0.34], { color: dark, texel: 2.5 });
    kit.boxMM("paintedMetal", [a, Y + PART_H - 0.04, PART_Z - 0.05], [b, Y + PART_H, PART_Z + 0.35], { color: steel, texel: 2.5 });
    kit.collider([a, Y, PART_Z - 0.05], [b, Y + PART_H, PART_Z + 0.35], "half-wall");
    // menu board on the dining face (text-list layout)
    wallScreen(kit, [(a + b) / 2, Y + 1.45, PART_Z - 0.09], Math.PI, 2.4, 0.9, "screenImp2");
  }
  // header beam over the whole width: dark body, clean panel plates on the dining face (no worn-metal
  // grain on a 31 m beam), black cap
  kit.boxMM("paintedMetal", [IX0, Y + PART_H, PART_Z - 0.1], [IX1, Y + PART_H + 0.3, PART_Z + 0.4], { color: dark, texel: 2.5 });
  {
    const n = Math.round((IX1 - IX0) / 1.7);
    for (let i = 0; i < n; i++) {
      const u0 = IX0 + (i * (IX1 - IX0)) / n + 0.03;
      const u1 = IX0 + ((i + 1) * (IX1 - IX0)) / n - 0.03;
      kit.boxMM("impPanel", [u0, Y + PART_H + 0.03, PART_Z - 0.12], [u1, Y + PART_H + 0.27, PART_Z - 0.1], { color: mid, uv: "keep" });
    }
  }
  kit.boxMM("paintedMetal", [IX0, Y + PART_H + 0.3, PART_Z - 0.14], [IX1, Y + PART_H + 0.36, PART_Z + 0.36], { color: black, texel: 2.5 });
  // light slots mounted on the header's dining face (U-channel housing, steel lips, recessed emitter)
  for (let x = OPENING.x0 + 0.3; x < OPENING.x1 - 0.3; x += 2.4) M.beamSlotLight(kit, PALETTE, x, Math.min(x + 1.8, OPENING.x1 - 0.3), Y + PART_H + 0.15, PART_Z - 0.22);
  // heat lamps hung from the header over the counter
  for (let x = COUNTER.x0 + 1.0; x <= COUNTER.x1 - 0.9; x += 1.6) M.heatLamp(kit, PALETTE, x, Y + PART_H, 403.2, { drop: 0.45 });
  // queue-lane fixtures over the serving line approach (the fills for the counter hang under these)
  for (const x of [-50, -46, -42]) dropLight(kit, PALETTE, [x, CEIL, 401.3], { w: 3.0, d: 0.35, stem: 2.3, mat: "emitWarmSoft" });
  // hazard bands at the two staff pass-throughs
  M.hazardBand(kit, PALETTE, [OPENING.x0 + 0.05, 402.6], [COUNTER.x0 - 0.85, 404.3], Y);
  M.hazardBand(kit, PALETTE, [COUNTER.x1 + 0.85, 402.6], [OPENING.x1 - 0.05, 404.3], Y);

  // ---- galley ----------------------------------------------------------------------------------
  M.coolerDoor(kit, PALETTE, [-60.3, Y, IZ1], Math.PI, { w: 2.0, h: 2.6 });
  // three different appliances: a wide low vat, a tall oven with a programme screen, a vat with one
  // hatch open (glowing interior) nearest the serving view's centreline so the variety reads from the queue
  M.vat(kit, PALETTE, [-56.6, Y, IZ1 - 0.62], Math.PI, { seed: 63, w: 3.0, h: 1.7 });
  M.vat(kit, PALETTE, [-53.6, Y, IZ1 - 0.62], Math.PI, { seed: 62, w: 2.0, h: 2.2, style: "oven" });
  M.vat(kit, PALETTE, [-50.5, Y, IZ1 - 0.62], Math.PI, { seed: 61, w: 2.4, h: 1.9, open: true });
  M.hood(kit, PALETTE, [-58.0, Y + 2.4, IZ1 - 1.4], [-49.0, Y + 3.4, IZ1]);
  M.vertDuct(kit, PALETTE, -51.5, IZ1 - 0.7, Y + 3.4, CEIL, 0.8);
  M.sinkLine(kit, PALETTE, [-44, Y, IZ1 - 0.35], Math.PI, { len: 6, d: 0.7, basins: 3 });
  M.dishwasher(kit, PALETTE, [-38.6, Y, IZ1 - 0.5], Math.PI, { seed: 64 });
  cabinet(kit, PALETTE, [-35.9, Y, IZ1 - 0.25], Math.PI, { w: 1.4, h: 2.0, d: 0.5, seed: 65 });
  cabinet(kit, PALETTE, [-33.9, Y, IZ1 - 0.25], Math.PI, { w: 1.4, h: 2.0, d: 0.5, seed: 66, emit: "emitAmber" });
  M.supplyBox(kit, PALETTE, [-31.4, Y, IZ1 - 0.55], Math.PI, { w: 1.6, h: 1.2, d: 1.0 });
  M.supplyBox(kit, PALETTE, [-31.4, Y + 1.2, IZ1 - 0.55], Math.PI, { w: 1.6, h: 0.9, d: 1.0, color: P("impGrey") });
  // prep islands and tray racks
  M.prepIsland(kit, PALETTE, [-55.5, Y, 407.6], 0, { seed: 71 });
  M.prepIsland(kit, PALETTE, [-46.5, Y, 407.6], 0, { seed: 72 });
  M.prepIsland(kit, PALETTE, [-38.5, Y, 407.6], 0, { seed: 73 });
  M.trayRack(kit, PALETTE, [IX0 + 0.31, Y, 406.3], HALF);
  M.trayRack(kit, PALETTE, [IX0 + 0.31, Y, 408.0], HALF);
  M.trayRack(kit, PALETTE, [IX1 - 0.31, Y, 406.3], -HALF);
  cabinet(kit, PALETTE, [IX1 - 0.26, Y, 408.6], -HALF, { w: 1.2, h: 1.9, d: 0.5, seed: 67, emit: "emitRedImp" });
  wallScreen(kit, [IX0 + 0.09, Y + 2.95, 409.6], HALF, 1.6, 0.9, "screenImp0");
  wallScreen(kit, [IX1 - 0.09, Y + 2.95, 405.6], -HALF, 1.6, 0.9, "screenImp3");
  M.wallPanel(kit, PALETTE, [IX0 + 0.01, Y + 1.5, 410.6], HALF, 44);
  // galley floor drain grate along the aft equipment line
  kit.boxMM("grate", [-60.5, Y + 0.001, 409.75], [-31.0, Y + 0.009, 410.15]);
  // mezzanine-style service run at 5 m along the galley (aft) wall
  duct(kit, PALETTE, [IX0 + 0.2, Y + 5.0, IZ1 - 0.55], [IX1 - 0.2, Y + 5.0, IZ1 - 0.55], 0.7, 0.5, { color: mid });
  pipe(kit, PALETTE, [IX0 + 0.2, Y + 4.4, IZ1 - 0.35], [IX1 - 0.2, Y + 4.4, IZ1 - 0.35], 0.1, { color: steel, bracket: 4 });
  pipe(kit, PALETTE, [IX0 + 0.2, Y + 4.15, IZ1 - 0.3], [IX1 - 0.2, Y + 4.15, IZ1 - 0.3], 0.06, { color: P("impAmber"), bracket: 4 });
  for (let x = IX0 + 2; x < IX1 - 1; x += 4) kit.box("paintedMetal", x, Y + 4.68, IZ1 - 0.4, 0.12, 0.14, 0.8, { color: black, texel: 2.5 });
  // galley ceiling fixtures (cool white)
  for (const x of [-56, -46, -36]) dropLight(kit, PALETTE, [x, CEIL, 407.6], { w: 2.4, d: 0.5, stem: 1.0, mat: "emitWhite" });

  // ---- lights (14 descriptors; 1/d^2 falloff, so every fill keeps >= 1.2 m from any fixture hood) ---
  // Pool note: the runtime keeps the 12 nearest point lights weighted by distance/(0.5+priority) and the
  // west corridor's six priority-1 lights sit 6 m behind the door view, so the hall fills carry priority
  // 1 and the serving fills 1.5 — otherwise the far counter loses its light exactly in the door view.
  // hall fills between the table rows (z midway between rows, x between the columns: 1.2 m from the
  // nearest hood end and 1.8 m from the rows either side), 2.5 m below the ceiling
  for (const x of [-54, -38]) for (const z of [387.6, 391.2, 394.8]) lights.push({ type: "point", pos: [x, Y + 4.0, z], color: 0xffe0c0, intensity: 42, distance: 16, priority: 1.0 });
  lights.push({ type: "point", pos: [-46, Y + 4.0, 381.5], color: 0xffe6d0, intensity: 30, distance: 13, priority: 0.7 });
  // serving line: three warm fills 1.2 m aft of the queue-lane fixtures (their hoods are not lit from
  // below) light the counter front and the galley wall from above; one small amber pool under the heat lamps
  for (const x of [-50, -46, -42]) lights.push({ type: "point", pos: [x, Y + 3.8, 402.5], color: 0xffe0c0, intensity: 26, distance: 10, priority: 1.5 });
  // amber pool: 3 cm under the rim of the heat lamp at x -46.8 (it hung between two lamps at 7 cd, a bare
  // hot disc on the counter 0.5 m below); 1.4 cd at 0.6 m tints the trays without a hotspot
  lights.push({ type: "point", pos: [-46.8, Y + 1.5, 403.2], color: 0xffb060, intensity: 1.4, distance: 3.2, priority: 0.4 });
  // galley: cool fills 0.8 m aft of the galley fixtures, 2.5 m below the ceiling, over the aisle between
  // the islands and the appliance line. At z 409.2 / 4.5 m they sat 25 cm under the mezzanine duct's
  // underside and 2 m in front of it: from the galley aisle that grazing pair read as the "hood lamp seen
  // edge-on" streak where the hood meets the ceiling (clipped white + bloom); 1.6 m out and 0.5 m lower
  // the same duct face peaks at ~230
  for (const x of [-56, -46, -36]) lights.push({ type: "point", pos: [x, Y + 4.0, 408.4], color: 0xe8f0ff, intensity: 30, distance: 12, priority: 0.5 });
  return {};
}

export default defineRoom({
  id: "d2-mess",
  name: "Mess Hall & Galley",
  deck: 2,
  x: [X0, X1],
  z: [Z0, Z1],
  ceil: CEIL,
  spawn: { pos: [-46, Y, 380], yaw: 180 },
  views: {
    // 3 m inside the door (the aisle was 45 % of the frame from the threshold), pitch eased a degree
    "d2-mess-door": { pos: [-46, Y, 384.4], yaw: 180, pitch: -2 },
    "d2-mess-hall": { pos: [-32.4, Y, 382.6], yaw: 130, pitch: -3 },
    "d2-mess-serving": { pos: [-44.2, Y, 400.2], yaw: 162, pitch: -3 },
    // from the galley aisle looking west along the appliance line (open-hatch vat, oven, wide vat, hood,
    // cooler door), sink line at the left, prep islands at the right
    "d2-mess-galley": { pos: [-48.4, Y, 408.6], yaw: 120, pitch: -2 },
    "d2-mess-entry": { pos: [-46, Y, 391.5], yaw: 0, pitch: -1 },
  },
  shell: {
    panelW: 1.8,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impWhite,
    floor: { color: IMP.impMid },
    ceiling: { channels: 5.2, axis: "z", segment: 2.5 },
    lights: false,
    doorDressing: { accent: "emitBlue" },
    // cable tray + pipe runs at 3.55 m on the forward and side walls (below the room's own duct at 4.45 m);
    // the aft wall already carries the mezzanine run and the hood
    serviceBand: { y: 3.55, faces: ["n", "e", "w"] },
  },
  detail,
});
