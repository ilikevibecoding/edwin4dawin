// Recreation lounge (Deck 7): the west wall sits just inside the T1 terrace flank, so it is built
// here as four slanted viewport bays — the glass leans in at the terrace's 39° slope over a steel
// sill ledge, between black ribbed piers, under blast-shutter housings — looking west and down over
// the dorsal hull. A window gallery of low chairs faces the glass; a holo-game table with a ring of
// seats holds the middle; the bar runs along the south wall (stools, back bar with bottles and drink
// dispensers, pendant lamps); a viewscreen wall with benches on the east; game tables in the north
// corner. Dim amber pools and blue accents instead of white bands.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame, ceilingFrame } from "../../../core/frame.js";
import { impCeiling, wallScreen, screenArray, pointLightDesc, table, bench, chair, holoTable, lockers } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { ensureCrewMaterials, counter, shelfUnit, dispenser, floorDecal, ceilingStrip, namePlate, loungeChair, stool, sideTable, interactPlates } from "./crewKit.js";

const AMBER = 0xffb070;
const SPACE = 0x8fb8ff;
const BLUE = 0x3a70ff;
const CARPET = 0x1e2438;

export function buildLounge(kit, ctx) {
  ensureCrewMaterials(ctx.mats);
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const walls = roomWalls(room);
  const xW = x0 + STD.wallT;
  const xE = x1 - STD.wallT;
  const zN = z0 + STD.wallT;
  const zS = z1 - STD.wallT;

  buildShell(kit, ctx, ctx.id, room, {
    skip: ["west", "ceiling"],
    wall: { pitch: 3.8, tone: IMP.wallMid, toneAlt: IMP.wallDark, bandMat: "lightBandWarm", styles: { plain: 0.66, vent: 0.14, hatch: 0.12, pipes: 0.08 } },
    floor: { mat: "impGloss", tone: IMP.wallDark, texel: 0.35, strip: false },
  });
  impCeiling(ceilingFrame(kit, x0, z0, y + h), x1 - x0, z1 - z0, { lights: false, panelW: 2.2, seed: 71, tone: IMP.trim });

  // ---- west wall: four slanted viewport bays ---------------------------------------------------------
  const bayZ = [353, 361, 369, 377];
  viewportWall(kit, ctx, walls.west, y, h, bayZ);

  // ---- window gallery: carpet, chairs facing the glass, soffit with a blue cove --------------------------
  kit.boxMM("impFabric", [xW + 0.3, y + 0.004, zN + 1.4], [xW + 5.2, y + 0.014, zS - 1.4], { color: CARPET, uv: "world", texel: 1.5 });
  kit.boxMM("impMetal", [xW + 5.2, y + 0.004, zN + 1.4], [xW + 5.3, y + 0.012, zS - 1.4], { color: IMP.steel });
  for (const zc of bayZ) {
    loungeChair(kit, [xW + 3.9, y, zc - 1.15], Math.PI / 2);
    loungeChair(kit, [xW + 3.9, y, zc + 1.15], Math.PI / 2);
    sideTable(kit, [xW + 3.9, y, zc], 0.3, 0.5, { tone: IMP.consoleDark });
    // a drink and a datapad on the table
    kit.add("impMetal", new THREE.CylinderGeometry(0.04, 0.035, 0.12, 10), { pos: [xW + 3.8, y + 0.56, zc + 0.08], color: IMP.steel, uv: "scale", uvScale: [0.3, 0.2] });
    kit.box("darkGloss", xW + 4.0, y + 0.51, zc - 0.1, 0.18, 0.012, 0.12);
  }
  // soffit over the gallery with a blue cove line; two dim space-glow fills by the glass
  kit.boxMM("impPaintedMetal", [xW - 0.1, y + h - 0.55, zN], [xW + 3.0, y + h, zS], { color: IMP.trim, texel: 1 });
  kit.boxMM("impPaintedMetal", [xW + 2.9, y + h - 0.55, zN + 0.2], [xW + 3.0, y + h - 0.1, zS - 0.2], { color: IMP.consoleDark, texel: 1 });
  kit.boxMM("crewEmit", [xW + 2.96, y + h - 0.5, zN + 0.6], [xW + 3.01, y + h - 0.47, zS - 0.6], { color: BLUE });
  // faint starlight spill from outboard of the glass (no shadows, so it reaches the gallery through the slab)
  pointLightDesc(ctx, SPACE, 1.3, 12, [xW - 1.6, y + 2.6, 357], 0);
  pointLightDesc(ctx, SPACE, 1.3, 12, [xW - 1.6, y + 2.6, 373], 0);
  pointLightDesc(ctx, AMBER, 4, 9, [xW + 3.9, y + 3.2, 357], 1);
  pointLightDesc(ctx, AMBER, 4, 9, [xW + 3.9, y + 3.2, 373], 1);

  // ---- holo-game table with a ring of seats -----------------------------------------------------------
  const hx = -64.0;
  const hz = 359.0;
  kit.add("impFabric", new THREE.CylinderGeometry(4.2, 4.2, 0.012, 40), { pos: [hx, y + 0.006, hz], color: 0x3a1a1a, uv: "scale", uvScale: [8, 8] });
  kit.add("impMetal", new THREE.TorusGeometry(4.2, 0.02, 6, 60), { pos: [hx, y + 0.012, hz], rot: [Math.PI / 2, 0, 0], color: IMP.steel, uv: "scale", uvScale: [4, 1] });
  holoTable(kit, ctx, [hx, y, hz], 1.0, { content: "planet", h: 0.8 });
  for (const a of [0.9, 2.6, 4.4]) loungeChair(kit, [hx + 2.4 * Math.sin(a), y, hz + 2.4 * Math.cos(a)], a);
  bench(kit, [hx - 2.5, y, hz - 0.2], 2.4, -Math.PI / 2);
  // score board on a post beside the table
  kit.box("impMetal", hx + 2.2, y + 0.9, hz - 1.9, 0.05, 1.8, 0.05, { color: IMP.gunmetal });
  kit.box("darkGloss", hx + 2.2, y + 1.85, hz - 1.9, 0.62, 0.4, 0.04);
  kit.box("screen2", hx + 2.2, y + 1.85, hz - 1.9 + 0.022, 0.56, 0.34, 0.004, { uv: "keep" });
  kit.box("screen2", hx + 2.2, y + 1.85, hz - 1.9 - 0.022, 0.56, 0.34, 0.004, { uv: "keep" });
  kit.collider([hx + 2.1, y, hz - 2.0], [hx + 2.3, y + 2.1, hz - 1.8], "post");

  // ---- middle seating: two conversation groups --------------------------------------------------------------
  {
    const cx = -62.0;
    const cz = 372.0;
    kit.boxMM("impFabric", [cx - 3.2, y + 0.004, cz - 2.6], [cx + 3.2, y + 0.014, cz + 2.6], { color: CARPET, uv: "world", texel: 1.5 });
    table(kit, [cx, y, cz], 1.6, 0.7, { h: 0.44, tone: IMP.consoleDark });
    bench(kit, [cx, y, cz - 1.2], 2.4, Math.PI);
    bench(kit, [cx, y, cz + 1.2], 2.4, 0);
    kit.box("darkGloss", cx - 0.4, y + 0.455, cz, 0.3, 0.012, 0.2);
    for (let k = 0; k < 3; k++) kit.add("impMetal", new THREE.CylinderGeometry(0.035, 0.03, 0.1, 10), { pos: [cx + 0.3 + k * 0.14, y + 0.5, cz + 0.1 - k * 0.05], color: [IMP.steel, 0x6fa0ff, IMP.gunmetal][k], uv: "scale", uvScale: [0.3, 0.2] });
    pointLightDesc(ctx, AMBER, 5, 11, [cx, y + h - 0.6, cz], 1);
    ceilingStrip(kit, [cx, y + h, cz], 3.0, "x", { mat: "lightBandWarm", w: 0.2 });
  }
  {
    const cx = -69.5;
    const cz = 373.0;
    sideTable(kit, [cx, y, cz], 0.42, 0.5, { tone: IMP.consoleDark });
    for (const a of [0.3, 2.4, 4.3]) loungeChair(kit, [cx + 1.5 * Math.sin(a), y, cz + 1.5 * Math.cos(a)], a);
    kit.add("impMetal", new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), { pos: [cx, y + 0.52, cz], color: IMP.gunmetal, uv: "scale", uvScale: [1, 0.1] });
    kit.add("crewEmit", new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16), { pos: [cx, y + 0.545, cz], color: 0xffc890, uv: "scale", uvScale: [1, 0.1] });
  }

  // ---- bar along the south wall ----------------------------------------------------------------------
  {
    const bx0 = -72.0;
    const bx1 = -58.0;
    const bxc = (bx0 + bx1) / 2;
    const bz = zS - 1.85;
    counter(kit, [bxc, y, bz], bx1 - bx0, Math.PI, { d: 0.8, h: 1.05, doors: true, tone: IMP.consoleDark, kickLight: "emitAmber", top: "darkGloss", topTone: IMP.black, tag: "bar" });
    // steel nosing with an amber under-glow on the public edge, raised back rail with glasses
    kit.boxMM("impMetal", [bx0 - 0.05, y + 1.02, bz - 0.5], [bx1 + 0.05, y + 1.06, bz - 0.36], { color: IMP.steel, texel: 1 });
    kit.boxMM("crewEmit", [bx0 + 0.2, y + 0.98, bz - 0.47], [bx1 - 0.2, y + 1.0, bz - 0.44], { color: 0xffa040 });
    kit.boxMM("impPaintedMetal", [bx0, y + 1.08, bz + 0.25], [bx1, y + 1.2, bz + 0.42], { color: IMP.consoleDark, texel: 1 });
    for (let k = 0; k < 12; k++) kit.add("impMetal", new THREE.CylinderGeometry(0.04, 0.03, 0.1, 10), { pos: [bx0 + 0.6 + k * 1.1, y + 1.25, bz + 0.33], color: k % 3 ? IMP.steel : 0x6fa0ff, uv: "scale", uvScale: [0.3, 0.2] });
    for (let k = 0; k < 3; k++) {
      const gx = bx0 + 2.5 + k * 4.2;
      kit.box("impPaintedMetal", gx, y + 1.09, bz - 0.15, 0.36, 0.02, 0.24, { color: IMP.wallMid, texel: 2 });
      kit.add("impMetal", new THREE.CylinderGeometry(0.045, 0.035, 0.14, 10), { pos: [gx - 0.08, y + 1.17, bz - 0.15], color: IMP.steel, uv: "scale", uvScale: [0.3, 0.2] });
      kit.add("impMetal", new THREE.CylinderGeometry(0.045, 0.035, 0.14, 10), { pos: [gx + 0.08, y + 1.17, bz - 0.12], color: 0x6fa0ff, uv: "scale", uvScale: [0.3, 0.2] });
    }
    for (let k = 0; k < 9; k++) stool(kit, [bx0 + 0.9 + k * 1.5, y, bz - 0.95], { h: 0.76 });
    // pendants over the bar + one warm light
    for (const px of [-69.5, -65.0, -60.5]) {
      kit.add("impMetal", new THREE.CylinderGeometry(0.012, 0.012, h - 2.35, 6), { pos: [px, y + 2.35 + (h - 2.35) / 2, bz], color: IMP.gunmetal, uv: "scale", uvScale: [0.1, 1] });
      kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.1, 0.26, 0.3, 14, 1, true), { pos: [px, y + 2.2, bz], color: IMP.consoleDark, uv: "scale", uvScale: [1, 0.3] });
      kit.add("crewEmit", new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14), { pos: [px, y + 2.06, bz], color: 0xffc890, uv: "scale", uvScale: [1, 0.1] });
    }
    pointLightDesc(ctx, AMBER, 6, 11, [bxc, y + 2.4, bz - 0.4], 1);
    // back bar: bottle shelving, drink dispensers (interactable), a screen, the bar sign
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    shelfUnit(frame, w.u(-64.4), w.u(-71.6), 2.2, { d: 0.4, shelves: 3, seed: 81, items: "cans", palette: [IMP.steel, 0x6fa0ff, 0x8a3a2a, IMP.white, 0x3a6a3a], fill: 0.9, tone: IMP.consoleDark });
    frame.box("crewEmit", w.u(-68.0), 2.26, 0.2, 7.0, 0.02, 0.3, { color: 0x3a70ff });
    const plates = [];
    for (const dx of [-62.4, -61.2, -60.0]) {
      const { keypad, quat } = dispenser(kit, [dx, y, zS - 0.33], Math.PI, { accent: "emitBlue", screen: 2, decal: 9, tone: IMP.consoleDark });
      plates.push({ pos: [keypad.x, keypad.y, keypad.z], quat, size: [0.14, 0.09, 0.02] });
    }
    interactPlates(ctx, plates, {
      id: "lounge:bar",
      label: "Draw a drink",
      onActivate: (api) => {
        api.hud.setStatus("Drink dispensed. Off-duty personnel only.");
        return true;
      },
    });
    wallScreen(frame, w.u(-58.6), 2.3, 1.6, 0.9, 1);
    frame.box("impPaintedMetal", w.u(-68.0), 3.0, 0.07, 3.2, 0.5, 0.06, { color: IMP.consoleDark, texel: 1 });
    frame.box("crewEmit", w.u(-68.0), 3.0, 0.105, 2.9, 0.06, 0.006, { color: 0xffa040 });
    for (const [i, du] of [-1.2, -0.4, 0.4, 1.2].entries()) frame.quad("impDecal", w.u(-68.0) + du, 3.0, 0.106, 0.34, 0.34, { uvRect: impDecalRect([0, 6, 9, 15][i]) });
    frame.quad("impDecal", w.u(-73.4), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(3) });
    frame.quad("impDecal", w.u(-55.6), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(13) });
    floorDecal(kit, -56.0, y, zS - 1.2, 0.8, 9, 0);
  }

  // ---- east wall: viewscreen wall with benches, rec-gear lockers, entry details ------------------------
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    screenArray(frame, w.u(362), 2.25, 3, 2, 1.15, 0.7, { seed: 4, variants: [1, 2], leds: true });
    frame.quad("impDecal", w.u(357.4), 2.3, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", w.u(366.6), 2.3, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
    bench(kit, [xE - 2.4, y, 360.2], 3.0, -Math.PI / 2);
    bench(kit, [xE - 2.4, y, 363.8], 3.0, -Math.PI / 2);
    kit.boxMM("impFabric", [xE - 3.4, y + 0.004, 358.2], [xE - 0.4, y + 0.014, 365.8], { color: CARPET, uv: "world", texel: 1.5 });
    pointLightDesc(ctx, SPACE, 2.2, 7, [xE - 0.8, y + 2.4, 362], 0);
    lockers(frame, w.u(348.4), w.u(354.4), 2.1, { seed: 83, tone: IMP.wallMid, doorW: 0.75 });
    frame.quad("impDecal", w.u(355.6), 1.7, 0.062, 0.45, 0.45, { uvRect: impDecalRect(6) });
    // entry: emergency point + deck plate by the door, a lit placard
    frame.box("impPaintedMetal", w.u(376.6), 1.05, 0.16, 0.6, 0.5, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", w.u(376.6), 1.2, 0.262, 0.4, 0.05, 0.01, { color: 0xff2a2a });
    frame.quad("impDecal", w.u(376.6), 0.95, 0.262, 0.26, 0.26, { uvRect: impDecalRect(13) });
    namePlate(frame, w.u(374.2), 1.55, { decal: 0, led: "crewEmit", ledColor: 0x40ff70 });
    wallScreen(frame, w.u(372.0), 2.2, 1.4, 0.8, 2);
    pointLightDesc(ctx, AMBER, 4, 8, [xE - 2.0, y + h - 0.6, 380], 0);
    ceilingStrip(kit, [xE - 2.2, y + h, 380], 3.0, "x", { mat: "lightBandWarm", w: 0.2 });
    floorDecal(kit, xE - 1.4, y, 380, 1.0, 7, 90);
  }

  // ---- north wall: big viewscreen, game tables in the north-east corner ------------------------------------------
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(-66.0), 2.3, 3.0, 1.5, 1);
    frame.quad("impDecal", w.u(-68.2), 2.3, 0.062, 0.5, 0.5, { uvRect: impDecalRect(9) });
    frame.quad("impDecal", w.u(-63.8), 2.3, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
    frame.box("impPaintedMetal", w.u(-73.5), 1.05, 0.16, 0.6, 0.5, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", w.u(-73.5), 1.2, 0.262, 0.4, 0.05, 0.01, { color: 0xff2a2a });
    // three game tables with chairs, a wall-mounted holo-chess board display
    for (const gx of [-59.6, -56.4]) {
      for (const gz of [349.6, 353.4]) {
        table(kit, [gx, y, gz], 0.9, 0.9, { h: 0.74, tone: IMP.consoleDark });
        kit.box("darkGloss", gx, y + 0.745, gz, 0.6, 0.012, 0.6);
        kit.box("blink", gx, y + 0.752, gz, 0.5, 0.004, 0.5, { uv: "keep" });
        chair(kit, [gx, y, gz - 0.85], Math.PI);
        chair(kit, [gx, y, gz + 0.85], 0);
      }
    }
    kit.boxMM("impFabric", [-61.2, y + 0.004, 348.0], [-54.8, y + 0.014, 355.0], { color: 0x2a1a1a, uv: "world", texel: 1.5 });
    wallScreen(frame, w.u(-58.0), 2.3, 1.8, 1.0, 2);
    pointLightDesc(ctx, AMBER, 4, 9, [-58.0, y + h - 0.6, 351.5], 0);
    ceilingStrip(kit, [-58.0, y + h, 351.5], 4.0, "z", { mat: "lightBandWarm", w: 0.2 });
  }

  // ---- views -------------------------------------------------------------------------------------------
  ctx.view("lounge", xE - 1.0, y + STD.eye, 380, 78, -3);
  ctx.view("lounge_viewport", xW + 4.6, y + STD.eye, 361.6, 90, -8);
  ctx.view("lounge_holo", -60.8, y + STD.eye, 364.8, 34, -5);
  ctx.view("lounge_bar", -64.0, y + STD.eye, 377.6, 180, -4);
}

/**
 * The west wall: solid piers and sill / head bands with four slanted viewport bays. In each bay the
 * glass leans inward along the terrace slope (sill 2.9 m outboard of the wall face, head at the face),
 * over a steel ledge, between panelled cheeks, under a blast-shutter housing.
 */
function viewportWall(kit, ctx, w, y, h, bayZ) {
  const { frame, length: L } = wallFrame(kit, w.from, w.to, y); // u = z1 - z, +n into the room
  const depth = 0.25;
  const BAY = 6.0;
  const V0 = 1.0;
  const V1 = 3.4;
  const RUN = 2.9;
  const S = Math.hypot(V1 - V0, RUN);
  const tilt = Math.atan2(RUN, V1 - V0); // rotation about u so the pane's top leans into the room
  const trim = (cu, cv, cn, su, sv, sn, extra = {}) => frame.box("impPaintedMetal", cu, cv, cn, su, sv, sn, { color: IMP.trim, texel: 1, ...extra });
  const centres = bayZ.map((z) => w.u(z)).sort((a, b) => a - b);
  // solid backing slab below the sill and above the head; piers between and beside the bays
  trim(L / 2, V0 / 2, -depth / 2, L, V0, depth);
  trim(L / 2, (V1 + h) / 2, -depth / 2, L, h - V1, depth);
  const piers = [];
  let cur = 0;
  for (const c of centres) {
    piers.push([cur, c - BAY / 2]);
    cur = c + BAY / 2;
  }
  piers.push([cur, L]);
  for (const [a, b] of piers) {
    const pu = (a + b) / 2;
    const pw = b - a;
    trim(pu, (V0 + V1) / 2, -depth / 2, pw, V1 - V0, depth);
    // pier face: kick, panels with the warm band, cornice, black ribs at the bay edges
    trim(pu, 0.16, 0.084, pw + 0.02, 0.32, 0.168);
    frame.box("impPanel", pu, (0.32 + 1.97) / 2, 0.03, pw - 0.5, 1.97 - 0.32 - 0.04, 0.06, { color: IMP.wallMid, uv: "keep" });
    trim(pu, 2.05, -0.03, pw - 0.4, 0.2, 0.06);
    frame.box("lightBandWarm", pu, 2.05, -0.005, pw - 0.6, 0.1, 0.01, { uv: "keep" });
    frame.box("impPanel1", pu, (2.13 + h - 0.22) / 2, 0.03, pw - 0.5, h - 0.22 - 2.13 - 0.04, 0.06, { color: IMP.wallMid, uv: "keep" });
    trim(pu, h - 0.11, 0.07, pw + 0.02, 0.22, 0.14);
    if (a > 0) trim(a + 0.14, h / 2, 0.08, 0.28, h, 0.16);
    if (b < L) trim(b - 0.14, h / 2, 0.08, 0.28, h, 0.16);
    if (pw > 3) {
      frame.quad("impDecal", pu, 2.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(a === 0 ? 3 : 0) });
      frame.box("impPaintedMetal", pu, 1.1, 0.1, 0.6, 0.5, 0.14, { color: IMP.consoleDark, texel: 1 });
      frame.box("blinkSparse", pu, 1.1, 0.172, 0.5, 0.36, 0.006, { uv: "keep" });
    }
  }
  for (const [i, uc] of centres.entries()) {
    // sill band below the bay with a steel ledge running outboard under the glass, blue under-lip
    trim(uc, 0.16, 0.084, BAY, 0.32, 0.168);
    frame.box("impPanel", uc, (0.32 + V0) / 2, 0.03, BAY - 0.1, V0 - 0.32 - 0.06, 0.06, { color: IMP.wallDark, uv: "keep" });
    // rubber-matted ledge: the low sun rakes in through the bays, and a polished steel ledge threw a
    // blown-out glint at grazing angles (painted metal still flared); matting reads as non-slip trim
    frame.box("impRubber", uc, V0 + 0.025, (0.2 - RUN) / 2, BAY - 0.1, 0.05, RUN + 0.2, { color: IMP.gunmetal, texel: 1 });
    frame.box("impPaintedMetal", uc, V0 + 0.025, 0.17, BAY - 0.1, 0.06, 0.06, { color: IMP.steel, texel: 1 });
    frame.box("crewEmit", uc, V0 - 0.03, 0.19, BAY - 0.5, 0.015, 0.01, { color: 0x3a70ff });
    // head band panel + blast-shutter housing with a status lamp and an indicator strip
    frame.box("impPanel1", uc, (V1 + 0.45 + h - 0.22) / 2, 0.03, BAY - 0.1, h - 0.22 - V1 - 0.5, 0.06, { color: IMP.wallDark, uv: "keep" });
    trim(uc, h - 0.11, 0.07, BAY, 0.22, 0.14);
    frame.box("impPaintedMetal", uc, V1 + 0.22, -0.15, BAY - 0.2, 0.42, 0.5, { color: IMP.consoleDark, texel: 1 });
    frame.box("emitAmber", uc - BAY / 2 + 0.5, V1 + 0.22, 0.105, 0.14, 0.05, 0.01);
    frame.box("leds", uc + 0.4, V1 + 0.1, 0.105, 1.4, 0.05, 0.01, { uv: "keep" });
    frame.quad("impDecal", uc + BAY / 2 - 0.5, V1 + 0.22, 0.106, 0.26, 0.26, { uvRect: impDecalRect([2, 5, 8, 12][i % 4]) });
    // the slanted pane and its casement: rails along the top and bottom edges, side rails and a mullion along the slope
    const pane = new THREE.PlaneGeometry(BAY - 0.3, S - 0.16);
    pane.rotateX(tilt);
    frame.add("crewGlass", pane, uc, (V0 + V1) / 2, -RUN / 2, { uv: "keep" });
    frame.box("impMetal", uc, V1 - 0.03, -0.05, BAY - 0.2, 0.1, 0.1, { color: IMP.gunmetal, texel: 1, tilt });
    frame.box("impMetal", uc, V0 + 0.04, -RUN + 0.06, BAY - 0.2, 0.1, 0.1, { color: IMP.gunmetal, texel: 1, tilt });
    for (const du of [-(BAY / 2 - 0.12), 0, BAY / 2 - 0.12]) frame.box("impMetal", uc + du, (V0 + V1) / 2, -RUN / 2, du === 0 ? 0.06 : 0.1, S - 0.1, du === 0 ? 0.06 : 0.1, { color: IMP.gunmetal, texel: 1, tilt });
    // shutter tracks along the slope on both cheeks
    for (const s of [-1, 1]) frame.box("impMetal", uc + s * (BAY / 2 - 0.22), (V0 + V1) / 2 + 0.04, -RUN / 2 - 0.04, 0.05, S - 0.3, 0.05, { color: IMP.steel, tilt });
    // cheeks: triangular plates closing the alcove sides between the sill ledge, the wall face and the glass
    const tri = new THREE.Shape([new THREE.Vector2(0, V0), new THREE.Vector2(-RUN, V0), new THREE.Vector2(0, V1)]);
    for (const s of [-1, 1]) {
      const g = new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false });
      g.rotateY(-Math.PI / 2); // shape x -> local n, shape y -> local v, extrusion -> -u
      frame.add("impPaintedMetal", g, uc + s * (BAY / 2 - 0.05) + 0.05, 0, 0, { color: IMP.wallMid, texel: 1 });
    }
  }
  frame.collider(0, L, 0, h, -RUN - 0.2, 0.25, "viewportWall");
}
