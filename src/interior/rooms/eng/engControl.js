// Engineering Control: the reactor's watch room. Its east wall is the shared wall with the reactor
// chamber and carries a 26 m observation window so the core is visible from every station. Two tiers
// of consoles face the window: a lower row on the deck and an upper row on a raised platform reached
// by two short stairs, with the chief engineer's station in the middle of the platform. The north wall
// is a status wall of screens readable from both tiers; a reactor schematic hangs behind the upper
// tier on the west wall; cable trays feed every row.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, chair, ceilingLight, pointLightDesc, railing, stairs, lockers, wallScreen, walkable, table, rng } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { addEngMaterials } from "./engMaterials.js";
import { platform, cableTray, cableDrop, screenBank, relayCabinet, floorDecal, deckMark, statusBoard, holoReactor, gaugeCluster } from "./engKit.js";

export function buildEngControl(kit, ctx) {
  addEngMaterials(ctx.mats);
  const { room, floorY: y, id } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const rand = rng(31);
  ctx.portal("reactor"); // the window: the core must render while we stand here

  buildShell(kit, ctx, id, room, {
    wall: { slabHoles: true, pitch: 4, tone: IMP.wallMid, toneAlt: IMP.wallLight, bandMat: "lightBand", styles: { plain: 0.4, control: 0.25, vent: 0.1, hatch: 0.05, pipes: 0.05, screen: 0.15 } },
    walls: { east: { styles: { plain: 0.6, control: 0.2, screen: 0.2 } } },
    ceiling: { lights: false, panelW: 2.0, tone: IMP.wallDark },
    floor: { tone: IMP.wallDark },
    // smoked pane: the core is a 30 m emitter and read blown white through clear glass; glassDark keeps
    // it a readable blue-white plasma column from the watch floor
    extraOpenings: { east: [{ type: "window", u0: 4, u1: 30, v0: 1.0, v1: 4.0, glass: "glassDark" }] },
  });
  const walls = roomWalls(room);

  // ------------------------------------------------------------ upper tier platform + stairs
  const P = { x0: x0 + 2.5, z0: 561, x1: x0 + 12.5, z1: 591 };
  const PY = y + 0.8;
  platform(kit, ctx, P.x0, P.z0, P.x1, P.z1, y, PY, { glow: "emitBlue", tone: IMP.wallDark });
  for (const sz of [566, 586]) stairs(kit, ctx, [P.x1 + 1.2, sz], [-1, 0], 2.4, y, PY, { rails: false });
  // guard rails along the drop, gaps at the stairs
  railing(kit, [P.x1, P.z0], [P.x1, 566 - 1.3], PY, { h: 0.95, lit: true });
  railing(kit, [P.x1, 566 + 1.3], [P.x1, 586 - 1.3], PY, { h: 0.95, lit: true });
  railing(kit, [P.x1, 586 + 1.3], [P.x1, P.z1], PY, { h: 0.95, lit: true });
  railing(kit, [P.x0, P.z0], [P.x1, P.z0], PY, { h: 0.95 });
  railing(kit, [P.x0, P.z1], [P.x1, P.z1], PY, { h: 0.95 });

  // upper row: four wide consoles facing the window, chief's station in the middle
  for (const cz of [564.5, 569, 579, 583.5]) {
    impConsole(kit, ctx, [P.x0 + 6.6, PY, cz], -Math.PI / 2, { kind: "wide", width: 2.8, screens: 3, seed: 40 + cz, light: false });
    chair(kit, [P.x0 + 5.7, PY, cz], -Math.PI / 2);
  }
  // chief engineer: a dais step, a 3.4 m console and two pedestal displays
  kit.boxMM("impPaintedMetal", [P.x0 + 1.2, PY, 571.6], [P.x0 + 6.0, PY + 0.12, 576.4], { color: IMP.trim, texel: 1 });
  kit.boxMM("impGlossSoft", [P.x0 + 1.3, PY + 0.12, 571.7], [P.x0 + 5.9, PY + 0.126, 576.3], { color: IMP.white, texel: 0.25 });
  walkable(ctx, P.x0 + 1.2, 571.6, P.x0 + 6.0, 576.4, PY + 0.12, "dais");
  impConsole(kit, ctx, [P.x0 + 5.0, PY + 0.12, 574], -Math.PI / 2, { kind: "wide", width: 3.4, screens: 4, seed: 7, light: false });
  chair(kit, [P.x0 + 4.0, PY + 0.12, 574], -Math.PI / 2, { color: IMP.fabricGrey });
  for (const dz of [-2.2, 2.2]) {
    kit.box("impPaintedMetal", P.x0 + 4.6, PY + 0.75, 574 + dz, 0.5, 1.5, 0.5, { color: IMP.consoleDark, texel: 1 });
    kit.box("darkGloss", P.x0 + 4.86, PY + 1.2, 574 + dz, 0.01, 0.5, 0.4);
    kit.box("screen" + (dz < 0 ? 2 : 1), P.x0 + 4.866, PY + 1.2, 574 + dz, 0.004, 0.42, 0.34, { uv: "keep" });
    kit.box("blinkSparse", P.x0 + 4.86, PY + 0.6, 574 + dz, 0.006, 0.2, 0.4, { uv: "keep" });
  }
  floorDecal(kit, P.x0 + 3.5, PY + 0.126, 578.2, 0.9, 4, Math.PI / 2);

  // ------------------------------------------------------------ lower tier: five stations on the deck
  for (const cz of [563, 567.5, 572, 576.5, 581]) {
    impConsole(kit, ctx, [x0 + 18.6, y, cz], -Math.PI / 2, { kind: "wide", width: 2.6, screens: 3, seed: 60 + cz, light: false });
    chair(kit, [x0 + 17.7, y, cz], -Math.PI / 2);
  }
  // sill-height rail under the window with a status strip, so nobody leans on the glass
  kit.boxMM("impPaintedMetal", [x1 - 0.7, y, 560], [x1 - 0.3, y + 0.95, 586], { color: IMP.trim, texel: 1 });
  kit.boxMM("impMetal", [x1 - 0.72, y + 0.95, 560], [x1 - 0.28, y + 1.0, 586], { color: IMP.steel });
  kit.boxMM("blinkSparse", [x1 - 0.71, y + 0.5, 560.5], [x1 - 0.7, y + 0.7, 585.5], { uv: "keep" });
  kit.collider([x1 - 0.8, y, 560], [x1 - 0.3, y + 1.0, 586], "sill");
  // glossy walkways (soft gloss: the point lights otherwise pool white on them) from the doors along the
  // window and the row, and from the corridor door to the platform stair
  kit.boxMM("impGlossSoft", [x0 + 20.5, y - 0.001, z0 + 1], [x0 + 22.5, y + 0.006, z1 - 1], { color: IMP.white, texel: 0.25 });
  kit.boxMM("impGlossSoft", [x0 + 12, y - 0.001, z1 - 5], [x1 - 1, y + 0.006, z1 - 3], { color: IMP.white, texel: 0.25 });
  kit.boxMM("impGlossSoft", [x0 + 12.6, y - 0.001, 587.3], [x0 + 14.2, y + 0.006, z1 - 5], { color: IMP.white, texel: 0.25 });

  // ------------------------------------------------------------ walls: screen wall, schematic, trays
  {
    // north wall: the status wall — 8 x 3 screens the whole watch can read from the deck, flanked by
    // two larger displays, cable tray above with a drop to the lower row
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    // five display variants across the bank (the three tactical screens plus the bar and gauge
    // readouts the room already draws)
    screenBank(frame, w.u(x0 + 15), 2.6, 8, 3, 1.55, 0.86, 5, { variants: [0, 1, 2, "screenBars", "screenGauges", 0, 1, 2], dark: 0.1, wide: [[1, 1], [5, 2], [3, 0]], header: true });
    wallScreen(frame, w.u(x0 + 4.6), 2.4, 1.8, 1.0, "Bars");
    wallScreen(frame, w.u(x0 + 24.2), 2.4, 1.6, 0.9, "Gauges");
    statusBoard(frame, w.u(x0 + 4.6), 3.95, 3.0, 1.1, 3, { displays: ["screen2", "screenBars"], ok: "emitBlue" });
    statusBoard(frame, w.u(x0 + 24.2), 3.95, 3.0, 1.1, 4, { displays: ["screenGauges", "screen0"], ok: "emitBlue" });
    frame.quad("impDecal", w.u(x0 + 6.8), 1.2, 0.064, 0.7, 0.7, { uvRect: impDecalRect(11) });
    cableTray(frame, 1.0, w.length - 1.0, h - 0.3, { n: 0.4, cables: 4 });
    cableDrop(frame, w.u(x0 + 19), 0.9, h - 0.35, { n: 0.12 });
  }
  {
    // west wall behind the upper tier: reactor schematic (emissive line diagram) between two status
    // screens, relay cabinets in the corners
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    relayCabinet(frame, w.u(594.5), 0, 2.3, 2.0, 71);
    relayCabinet(frame, w.u(557.5), 0, 2.3, 2.0, 73);
    frame.quad("impDecal", w.u(590), 1.5, 0.064, 0.9, 0.9, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", w.u(562), 1.5, 0.064, 0.9, 0.9, { uvRect: impDecalRect(4) });
    wallScreen(frame, w.u(566), 2.4, 1.8, 1.0, 2);
    wallScreen(frame, w.u(586), 2.4, 1.8, 1.0, "Gauges");
    // status boards along the upper wall over the screens and cabinets
    statusBoard(frame, w.u(566), 3.9, 3.4, 1.2, 11, { displays: ["screenBars", "screen0"], ok: "emitBlue" });
    statusBoard(frame, w.u(586), 3.9, 3.4, 1.2, 12, { displays: ["screen2", "screenGauges"], ok: "emitBlue" });
    statusBoard(frame, w.u(594.5), 3.9, 2.8, 1.1, 13, { displays: ["screen1"], ok: "emitBlue" });
    statusBoard(frame, w.u(557.5), 3.9, 2.8, 1.1, 14, { displays: ["screenBars"], ok: "emitBlue" });
    gaugeCluster(frame, w.u(560.0), 1.9, { n: 3, seed: 15 });
    gaugeCluster(frame, w.u(592.2), 1.9, { n: 3, seed: 16 });
    const cu = w.u(576);
    frame.box("impPaintedMetal", cu, 2.6, 0.05, 7.0, 3.0, 0.08, { color: IMP.consoleDark, texel: 1 });
    frame.box("darkGloss", cu, 2.6, 0.095, 6.8, 2.8, 0.01);
    // the core drawn as two rings (a filled emitter disc bloomed into a blob on this dim wall)
    frame.add("emitBlue", new THREE.TorusGeometry(0.75, 0.035, 6, 40), cu, 2.7, 0.11, {});
    frame.add("emitBlue", new THREE.TorusGeometry(0.42, 0.025, 6, 32), cu, 2.7, 0.11, {});
    for (const s of [-1, 1]) {
      frame.box("emitBlue", cu + s * 1.9, 2.7, 0.11, 2.2, 0.03, 0.01);
      frame.box("emitBlue", cu + s * 3.0, 2.2, 0.11, 0.03, 1.0, 0.01);
      frame.box("emitAmber", cu + s * 3.0, 1.55, 0.11, 0.9, 0.35, 0.01);
      frame.box("blinkSparse", cu + s * 3.0, 3.35, 0.11, 0.9, 0.5, 0.01, { uv: "keep" });
      frame.box("emitBlue", cu + s * 0.9, 1.75, 0.11, 0.03, 1.0, 0.01);
      frame.box("emitAmber", cu + s * 0.9, 1.3, 0.11, 0.6, 0.12, 0.01);
    }
    frame.box("leds", cu, 1.3, 0.11, 3.0, 0.06, 0.01, { uv: "keep" });
    frame.quad("impDecal", cu, 3.75, 0.11, 0.5, 0.5, { uvRect: impDecalRect(11) });
  }
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, 1.5, 7.5, 2.1, { seed: 9 });
    cableTray(frame, 1.0, w.length - 1.0, h - 0.3, { n: 0.4, cables: 4 });
    wallScreen(frame, w.u(x0 + 6), 2.3, 1.6, 0.9, 1);
    frame.quad("impDecal", w.u(x0 + 9), 1.8, 0.064, 0.7, 0.7, { uvRect: impDecalRect(7) });
    statusBoard(frame, w.u(x0 + 4.5), 3.85, 3.6, 1.2, 17, { displays: ["screenBars", "screen2"], ok: "emitBlue" });
    statusBoard(frame, w.u(x0 + 19.5), 3.85, 4.2, 1.2, 18, { displays: ["screen1", "screenGauges", "screenBars"], ok: "emitBlue" });
    wallScreen(frame, w.u(x0 + 19.5), 2.3, 1.8, 1.0, 0);
    gaugeCluster(frame, w.u(x0 + 23.2), 1.9, { n: 2, seed: 19 });
  }
  // overhead trays from the west wall to both console rows, with drops to the lower row
  for (const tz of [566, 582]) {
    kit.boxMM("impMetal", [x0 + 0.4, y + h - 0.7, tz - 0.2], [x0 + 19, y + h - 0.66, tz + 0.2], { color: IMP.gunmetal, texel: 1 });
    kit.boxMM("impMetal", [x0 + 0.4, y + h - 0.7, tz - 0.22], [x0 + 19, y + h - 0.5, tz - 0.18], { color: IMP.gunmetal, texel: 1 });
    kit.boxMM("impMetal", [x0 + 0.4, y + h - 0.7, tz + 0.18], [x0 + 19, y + h - 0.5, tz + 0.22], { color: IMP.gunmetal, texel: 1 });
    for (let i = 0; i < 3; i++) kit.cyl("impRubber", x0 + 9.7, y + h - 0.63, tz - 0.1 + i * 0.1, 0.03, 18.6, "x", { color: i % 2 ? IMP.gunmetal : IMP.rubber, segments: 8 });
    for (let x = x0 + 3; x < x0 + 19; x += 4) kit.box("impPaintedMetal", x, y + h - 0.35, tz, 0.08, 0.7, 0.08, { color: IMP.trim });
    kit.cyl("impRubber", x0 + 18.9, y + (h - 0.7 + 0.9) / 2, tz, 0.05, h - 1.6, "y", { color: IMP.rubber, segments: 8 });
    kit.cyl("impRubber", x0 + 6.6 + 0.4, y + (h - 0.7 + PY - y + 0.9) / 2, tz, 0.05, h - 0.7 - (PY - y) - 0.9, "y", { color: IMP.gunmetal, segments: 8 });
  }
  // shift-briefing holo station west of the corridor door: a projector table throwing a wireframe
  // schematic of the reactor, two station consoles flanking it and four seats
  {
    const bx = x0 + 6.5;
    const bz = z1 - 5.2;
    table(kit, [bx, y, bz], 3.0, 1.7, { h: 0.82, tone: IMP.consoleDark, top: "impPaintedMetal" });
    kit.box("impMetal", bx, y + 0.84, bz, 2.4, 0.03, 1.2, { color: IMP.steel });
    kit.box("darkGloss", bx, y + 0.86, bz, 2.2, 0.012, 1.0);
    kit.add("emitBlue", new THREE.TorusGeometry(0.56, 0.02, 6, 40), { pos: [bx, y + 0.87, bz], rot: [Math.PI / 2, 0, 0] });
    kit.cyl("impMetal", bx, y + 0.88, bz, 0.5, 0.02, "y", { color: IMP.black, segments: 32 });
    for (const s of [-1, 1]) {
      kit.box("impPaintedMetal", bx + s * 1.25, y + 0.85, bz, 0.4, 0.03, 1.4, { color: IMP.consoleDark, texel: 1 });
      kit.box("leds", bx + s * 1.25, y + 0.868, bz, 0.3, 0.004, 1.0, { uv: "keep" });
      kit.box("emitAmber", bx + s * 1.25, y + 0.868, bz + 0.62, 0.2, 0.004, 0.06);
    }
    holoReactor(kit, ctx, [bx, y + 0.86, bz], { lift: 1.2, scale: 0.85 });
    impConsole(kit, ctx, [bx - 2.9, y, bz], -Math.PI / 2, { kind: "station", width: 1.4, screens: 2, seed: 91, light: false });
    impConsole(kit, ctx, [bx + 2.9, y, bz], Math.PI / 2, { kind: "station", width: 1.4, screens: 2, seed: 92, light: false });
    chair(kit, [bx - 3.8, y, bz], -Math.PI / 2, { color: IMP.fabricGrey });
    chair(kit, [bx + 3.8, y, bz], Math.PI / 2, { color: IMP.fabricGrey });
    chair(kit, [bx - 0.7, y, bz + 1.5], 0, { color: IMP.fabricGrey });
    chair(kit, [bx + 0.7, y, bz + 1.5], 0, { color: IMP.fabricGrey });
    chair(kit, [bx - 0.7, y, bz - 1.5], Math.PI, { color: IMP.fabricGrey });
    chair(kit, [bx + 0.7, y, bz - 1.5], Math.PI, { color: IMP.fabricGrey });
    floorDecal(kit, bx, y, bz + 2.8, 0.9, 11);
  }
  // deck stencils + the marked walkway from the corridor door to the platform stair (blue/amber status
  // indicators throughout the room keep the green emitter batch, and so the lane, inside the budget)
  floorDecal(kit, x0 + 21.5, y, z1 - 6.5, 1.2, 0);
  floorDecal(kit, x0 + 15.5, y, z0 + 3, 1.0, 15);
  deckMark(kit, x0 + 13.4, y, 591.4, 6.8, 2.6, 0, Math.PI / 2);

  // ------------------------------------------------------------ lights
  // A 5 m ceiling over a 26 x 44 m watch room: two rows of recessed bars (over the upper tier and over
  // the deck stations) with their point sources dropped to 3.6 m so the dark deck reads at ~2 lux, the
  // entrance bay and the holo station lit on their own. Priority 2 keeps them ahead of the reactor's
  // descriptors (visible through the window) in the shared pool.
  for (const lz of [566, 576, 586]) ceilingLight(kit, ctx, [x0 + 7.5, y + h, lz], 6, "z", { intensity: 30, distance: 16, color: 0xd6e2ff, priority: 2, drop: 1.4 });
  for (const lz of [563, 573, 583]) ceilingLight(kit, ctx, [x0 + 17, y + h, lz], 6, "x", { intensity: 40, distance: 16, color: 0xd6e2ff, priority: 2, drop: 1.4 });
  ceilingLight(kit, ctx, [x0 + 14, y + h, 594.5], 7, "x", { intensity: 40, distance: 16, color: 0xd6e2ff, priority: 2, drop: 1.4 }); // entrance bay
  ceilingLight(kit, ctx, [x0 + 4.5, y + h, 594.5], 4, "x", { intensity: 22, distance: 12, color: 0xd6e2ff, priority: 1, drop: 1.4 }); // holo station
  ceilingLight(kit, ctx, [x0 + 15, y + h, z0 + 3.2], 8, "x", { intensity: 30, distance: 14, color: 0xd6e2ff, priority: 1, drop: 1.4 }); // status wall
  pointLightDesc(ctx, 0x8fb8ff, 12, 16, [x1 - 1.6, y + 3.4, 573], 1); // core spill through the window
  pointLightDesc(ctx, 0xdfe8ff, 12, 9, [x0 + 13, y + h - 0.8, z1 - 2], 1); // door

  // ------------------------------------------------------------ views
  ctx.view("engControl", x0 + 13, y + STD.eye, z1 - 2.2, 28, -3);
  ctx.view("engControl_window", x0 + 15, y + STD.eye, 574, -90, 3);
  ctx.view("engControl_screens", x0 + 15.6, y + STD.eye, 569.0, 4, 3);
  void rand;
}
