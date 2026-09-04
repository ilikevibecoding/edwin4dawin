// Engineering Control: the reactor's watch room. Its east wall is the shared wall with the reactor
// chamber and carries a 26 m observation window so the core is visible from every station. Two tiers
// of consoles face the window: a lower row on the deck and an upper row on a raised platform reached
// by two short stairs, with the chief engineer's station in the middle of the platform. Behind them a
// wall of status screens; a reactor schematic on the north wall; cable trays feed every row.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, chair, ceilingLight, pointLightDesc, railing, stairs, lockers, wallScreen, walkable, table, rng } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { addEngMaterials } from "./engMaterials.js";
import { platform, cableTray, cableDrop, screenBank, relayCabinet, floorDecal, hazardKerb } from "./engKit.js";

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
    extraOpenings: { east: [{ type: "window", u0: 4, u1: 30, v0: 1.0, v1: 4.0 }] },
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
  for (const sz of [566, 586]) hazardKerb(kit, [P.x1 + 1.35, sz - 1.4], [P.x1 + 1.35, sz + 1.4], y, { w: 0.2, h: 0.03 });

  // upper row: four wide consoles facing the window, chief's station in the middle
  for (const cz of [564.5, 569, 579, 583.5]) {
    impConsole(kit, ctx, [P.x0 + 6.6, PY, cz], -Math.PI / 2, { kind: "wide", width: 2.8, screens: 3, seed: 40 + cz, light: false });
    chair(kit, [P.x0 + 5.7, PY, cz], -Math.PI / 2);
  }
  // chief engineer: a dais step, a 3.4 m console and two pedestal displays
  kit.boxMM("impPaintedMetal", [P.x0 + 1.2, PY, 571.6], [P.x0 + 6.0, PY + 0.12, 576.4], { color: IMP.trim, texel: 1 });
  kit.boxMM("impGloss", [P.x0 + 1.3, PY + 0.12, 571.7], [P.x0 + 5.9, PY + 0.126, 576.3], { color: IMP.white, texel: 0.25 });
  walkable(ctx, P.x0 + 1.2, 571.6, P.x0 + 6.0, 576.4, PY + 0.12, "dais");
  impConsole(kit, ctx, [P.x0 + 5.0, PY + 0.12, 574], -Math.PI / 2, { kind: "wide", width: 3.4, screens: 4, seed: 7, light: true });
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
  // glossy walkway from the doors along the window and the row
  kit.boxMM("impGloss", [x0 + 20.5, y - 0.001, z0 + 1], [x0 + 22.5, y + 0.006, z1 - 1], { color: IMP.white, texel: 0.25 });
  kit.boxMM("impGloss", [x0 + 12, y - 0.001, z1 - 5], [x1 - 1, y + 0.006, z1 - 3], { color: IMP.white, texel: 0.25 });

  // ------------------------------------------------------------ walls: screen wall, schematic, trays
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    screenBank(frame, w.u(576), 2.95, 6, 2, 1.55, 0.86, 5);
    relayCabinet(frame, w.u(594.5), 0, 2.3, 2.0, 71);
    relayCabinet(frame, w.u(557.5), 0, 2.3, 2.0, 73);
    frame.quad("impDecal", w.u(587), 1.5, 0.064, 0.9, 0.9, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", w.u(565), 1.5, 0.064, 0.9, 0.9, { uvRect: impDecalRect(4) });
  }
  {
    // north wall: reactor schematic (emissive line diagram) between two status screens + cable tray
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const cu = w.u(x0 + 13);
    frame.box("impPaintedMetal", cu, 2.6, 0.05, 7.0, 3.0, 0.08, { color: IMP.consoleDark, texel: 1 });
    frame.box("darkGloss", cu, 2.6, 0.095, 6.8, 2.8, 0.01);
    frame.add("emitBlue", new THREE.TorusGeometry(0.75, 0.035, 6, 40), cu, 2.7, 0.11, {});
    frame.add("emitReactor", new THREE.CircleGeometry(0.55, 32), cu, 2.7, 0.108, { uv: "keep" });
    for (const s of [-1, 1]) {
      frame.box("emitBlue", cu + s * 1.9, 2.7, 0.11, 2.2, 0.03, 0.01);
      frame.box("emitBlue", cu + s * 3.0, 2.2, 0.11, 0.03, 1.0, 0.01);
      frame.box("emitAmber", cu + s * 3.0, 1.55, 0.11, 0.9, 0.35, 0.01);
      frame.box("blinkSparse", cu + s * 3.0, 3.35, 0.11, 0.9, 0.5, 0.01, { uv: "keep" });
      frame.box("emitBlue", cu + s * 0.9, 1.75, 0.11, 0.03, 1.0, 0.01);
      frame.box("emitGreen", cu + s * 0.9, 1.3, 0.11, 0.6, 0.12, 0.01);
    }
    frame.box("leds", cu, 1.3, 0.11, 3.0, 0.06, 0.01, { uv: "keep" });
    frame.quad("impDecal", cu, 3.75, 0.11, 0.5, 0.5, { uvRect: impDecalRect(11) });
    wallScreen(frame, w.u(x0 + 5), 2.4, 1.8, 1.0, 2);
    wallScreen(frame, w.u(x0 + 21), 2.4, 1.8, 1.0, 0);
    cableTray(frame, 1.0, w.length - 1.0, h - 0.6, { n: 0.4, cables: 4 });
    cableDrop(frame, w.u(x0 + 19), 0.9, h - 0.65, { n: 0.12 });
  }
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, 1.5, 7.5, 2.1, { seed: 9 });
    cableTray(frame, 1.0, w.length - 1.0, h - 0.6, { n: 0.4, cables: 4 });
    wallScreen(frame, w.u(x0 + 6), 2.3, 1.6, 0.9, 1);
    frame.quad("impDecal", w.u(x0 + 9), 1.8, 0.064, 0.7, 0.7, { uvRect: impDecalRect(7) });
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
  // shift-briefing table west of the corridor door, under the south wall screen
  {
    const bx = x0 + 6.5;
    const bz = z1 - 5.2;
    table(kit, [bx, y, bz], 2.8, 1.3, { h: 0.8, tone: IMP.consoleDark, top: "impPaintedMetal" });
    kit.box("emitBlue", bx, y + 0.815, bz, 1.8, 0.01, 0.7, { color: IMP.blue });
    kit.box("darkGloss", bx, y + 0.812, bz, 1.9, 0.004, 0.8);
    for (const s of [-1, 1]) kit.box("blinkSparse", bx + s * 1.1, y + 0.815, bz, 0.4, 0.004, 0.6, { uv: "keep" });
    chair(kit, [bx - 0.6, y, bz + 1.3], 0);
    chair(kit, [bx + 0.6, y, bz + 1.3], 0);
    chair(kit, [bx - 0.6, y, bz - 1.3], Math.PI);
    chair(kit, [bx + 0.6, y, bz - 1.3], Math.PI);
    floorDecal(kit, bx, y, bz + 2.6, 0.9, 11);
  }
  // deck stencils
  floorDecal(kit, x0 + 21.5, y, z1 - 6.5, 1.2, 0);
  floorDecal(kit, x0 + 15.5, y, z0 + 3, 1.0, 15);

  // ------------------------------------------------------------ lights
  for (const [lz, pri] of [[566, 1], [576, 2], [586, 1]]) ceilingLight(kit, ctx, [x0 + 16, y + h, lz], 6, "x", { intensity: 4.2, distance: 12, color: 0xd6e2ff, priority: pri });
  ceilingLight(kit, ctx, [x0 + 7.5, y + h, 576], 8, "z", { intensity: 3.2, distance: 11, color: 0xd6e2ff, priority: 1 });
  ceilingLight(kit, ctx, [x0 + 12, y + h, 594.5], 7, "x", { intensity: 3.6, distance: 11, color: 0xd6e2ff, priority: 1 }); // entrance bay
  pointLightDesc(ctx, 0x8fb8ff, 4.5, 16, [x1 - 1.6, y + 3.4, 573], 1); // core spill through the window
  pointLightDesc(ctx, 0x6fa0ff, 2.6, 8, [x0 + 1.5, y + 2.9, 576], 0); // screen wall glow
  pointLightDesc(ctx, IMP.blue, 1.4, 6, [P.x1 + 0.4, y + 0.3, 576], 0); // platform kick glow
  pointLightDesc(ctx, 0xdfe8ff, 2.5, 7, [x0 + 13, y + h - 0.6, z1 - 2], 0); // door

  // ------------------------------------------------------------ views
  ctx.view("engControl", x0 + 13, y + STD.eye, z1 - 2.2, 28, -3);
  ctx.view("engControl_window", x0 + 15, y + STD.eye, 574, -90, 3);
  ctx.view("engControl_screens", x0 + 21, y + STD.eye, 575, 90, 1);
  void rand;
}
