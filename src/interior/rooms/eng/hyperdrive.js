// Hyperdrive & Propulsion Systems: three horizontal hyperdrive motivator units on cradles, ribbed
// housings slit with blue energy glow, conduits rising into a ceiling manifold that feeds the field
// generator bank on the north wall; a raised control pulpit faces the units from the south; coolant
// headers run along both side walls with valved branches to every unit; grated channels in the aisles;
// an overhead gantry with a chain hoist. Amber work light with blue conduit glow.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, chair, ceilingLight, pointLightDesc, railing, stairs, pipeRun, wallScreen, walkable, lockers, crate, rng } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { addEngMaterials } from "./engMaterials.js";
import { platform, conduit, valve, flange, craneRails, craneBridge, relayCabinet, hazardKerb, hazardBand, floorDecal, deckMark, ibeam, cableTray, cutFloor, trench, toolCart } from "./engKit.js";

export function buildHyperdrive(kit, ctx) {
  addEngMaterials(ctx.mats);
  const { room, floorY: y, id } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const CX = (x0 + x1) / 2;
  const rand = rng(53);

  buildShell(kit, ctx, id, room, {
    wall: { slabHoles: true, pitch: 4, tone: IMP.wallMid, toneAlt: IMP.wallDark, bandMat: "lightBandWarm", styles: { plain: 0.3, control: 0.15, vent: 0.2, hatch: 0.1, pipes: 0.2, screen: 0.05 } },
    ceiling: { lights: false, panelW: 2.5, tone: IMP.wallDark },
    skip: ["floor"],
  });
  const walls = roomWalls(room);

  // ------------------------------------------------------------ motivator units
  const UZ0 = 560;
  const UZ1 = 578;
  const UR = 2.0;
  const AXY = y + 2.7;
  const unitX = [CX - 8.5, CX, CX + 8.5];
  const aisleX = [(unitX[0] + unitX[1]) / 2, (unitX[1] + unitX[2]) / 2];
  const CH = { z0: UZ0 - 2, z1: UZ1 + 4, hw: 0.7, depth: 0.5 };
  const trenches = aisleX.map((ax) => [ax - CH.hw, CH.z0, ax + CH.hw, CH.z1]);
  // deck in pieces around the two grated aisle channels (the whole room stays walkable at y)
  cutFloor(kit, [x0, z0, x1, z1], y, trenches, { tone: IMP.wallDark });
  walkable(ctx, x0, z0, x1, z1, y, id);
  for (let i = 0; i < unitX.length; i++) {
    const ux = unitX[i];
    const len = UZ1 - UZ0;
    const zc = (UZ0 + UZ1) / 2;
    // skid + cradles
    kit.boxMM("impPaintedMetal", [ux - 2.4, y, UZ0 - 0.6], [ux + 2.4, y + 0.25, UZ1 + 0.6], { color: IMP.trim, texel: 1 });
    hazardBand(kit, [ux, y + 0.125, UZ1 + 0.606], 0, 4.6, 0.2);
    hazardBand(kit, [ux, y + 0.125, UZ0 - 0.606], Math.PI, 4.6, 0.2);
    for (const cz of [UZ0 + 2.5, zc, UZ1 - 2.5]) {
      kit.box("impPaintedMetal", ux, y + 0.9, cz, 4.0, 1.3, 1.0, { color: IMP.wallDark, texel: 1 });
      kit.add("impPaintedMetal", new THREE.CylinderGeometry(UR + 0.25, UR + 0.25, 1.0, 24, 1, true, Math.PI * 1.62, Math.PI * 0.76), { pos: [ux, AXY, cz], rot: [Math.PI / 2, 0, 0], color: IMP.trim, uv: "scale", uvScale: [6, 1] });
      for (const s of [-1, 1]) kit.box("impMetal", ux + s * 1.85, y + 0.6, cz, 0.3, 0.7, 1.1, { color: IMP.gunmetal, texel: 1 });
    }
    // housing: main drum, ribs, end caps, glow slots under translucent covers
    kit.cyl("impMetal", ux, AXY, zc, UR, len, "z", { color: IMP.gunmetal, segments: 28, texel: 0.5 });
    for (let rz = UZ0 + 0.9; rz < UZ1 - 0.5; rz += 1.5) kit.cyl("impPaintedMetal", ux, AXY, rz, UR + 0.16, 0.36, "z", { color: IMP.trim, segments: 28 });
    for (const [ez, s] of [[UZ0, -1], [UZ1, 1]]) {
      kit.cyl("impPaintedMetal", ux, AXY, ez + s * 0.45, UR - 0.3, 0.9, "z", { color: IMP.wallDark, segments: 28, texel: 1 });
      const dome = new THREE.SphereGeometry(UR - 0.5, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      dome.scale(1, 0.55, 1);
      dome.rotateX(s > 0 ? Math.PI / 2 : -Math.PI / 2);
      kit.add("impMetal", dome, { pos: [ux, AXY, ez + s * 0.9], color: IMP.steel, uv: "scale", uvScale: [4, 1] });
      kit.cyl("impMetal", ux, AXY, ez + s * 1.45, 0.35, 0.5, "z", { color: IMP.trim, segments: 14 });
      kit.cyl("emitBlue", ux, AXY, ez + s * 1.72, 0.22, 0.06, "z", { segments: 14 });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        kit.box("impMetal", ux + Math.cos(a) * (UR - 0.2), AXY + Math.sin(a) * (UR - 0.2), ez + s * 0.3, 0.25, 0.25, 0.3, { color: IMP.steel, rot: [0, 0, a] });
      }
    }
    for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
      const sx = Math.cos(a);
      const sy = Math.sin(a);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
      kit.add("emitBlue", new THREE.BoxGeometry(0.16, 0.5, len - 4), { pos: [ux + sx * (UR - 0.05), AXY + sy * (UR - 0.05), zc], quat: q });
      kit.add("engGlassBlue", new THREE.BoxGeometry(0.3, 0.7, len - 3.6), { pos: [ux + sx * (UR + 0.1), AXY + sy * (UR + 0.1), zc], quat: q });
    }
    // status plate on the south cap + stencils
    kit.box("impPaintedMetal", ux + 1.1, AXY - 0.4, UZ1 + 0.95, 0.9, 0.7, 0.1, { color: IMP.consoleDark, texel: 1 });
    kit.box("blink", ux + 1.1, AXY - 0.3, UZ1 + 1.005, 0.7, 0.3, 0.004, { uv: "keep" });
    kit.box("leds", ux + 1.1, AXY - 0.62, UZ1 + 1.005, 0.6, 0.06, 0.004, { uv: "keep" });
    kit.add("impDecal", new THREE.PlaneGeometry(1.1, 1.1), { pos: [ux - 1.1, AXY - 0.2, UZ1 + 0.905], uv: "keep", uvRect: impDecalRect([2, 8, 6][i]) });
    kit.add("impDecal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [ux + UR + 0.17, AXY + 1.0, zc - 5], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: impDecalRect(1) });
    kit.collider([ux - 2.4, y, UZ0 - 1.9], [ux + 2.4, y + 5, UZ1 + 1.9], "motivator");
    // conduit: from the top of the rear cap up to the ceiling manifold and back to the generator bank
    conduit(kit, [ux, AXY + UR - 0.4, UZ0 + 2.2], [ux, y + h - 1.2, UZ0 + 2.2], 0.36);
    conduit(kit, [ux, y + h - 1.2, UZ0 + 2.2], [ux, y + h - 1.2, z0 + 1.2], 0.36);
    kit.box("impPaintedMetal", ux, AXY + UR - 0.2, UZ0 + 2.2, 1.2, 0.5, 1.2, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", ux, y + h - 1.2, z0 + 1.2, 1.2, 1.2, 1.4, { color: IMP.trim, texel: 1 });
    pointLightDesc(ctx, 0x5f8fff, 3.2, 10, [ux, AXY + 2.6, zc], 1);
  }
  // cross conduit linking the three units at the front end + the manifold header along the ceiling
  conduit(kit, [unitX[0], AXY + 0.6, UZ1 + 1.9], [unitX[2], AXY + 0.6, UZ1 + 1.9], 0.26, { rings: true });
  for (const ux of unitX) kit.box("impPaintedMetal", ux, AXY + 0.6, UZ1 + 1.9, 0.7, 0.7, 0.7, { color: IMP.trim, texel: 1 });
  ibeam(kit, [x0 + 1, y + h - 0.5, z0 + 1.2], [x1 - 1, y + h - 0.5, z0 + 1.2], { h: 0.8, w: 0.5 });

  // ------------------------------------------------------------ aisle channels + lane marks
  for (let i = 0; i < aisleX.length; i++) {
    trench(kit, trenches[i], y, { depth: CH.depth, strip: "emitBlue" });
    deckMark(kit, aisleX[i], y, CH.z1 + 2.5, 2.4, 2.4, 0);
  }
  for (const ux of unitX) {
    hazardKerb(kit, [ux - 2.7, UZ1 + 0.9], [ux + 2.7, UZ1 + 0.9], y, { w: 0.25, h: 0.06 });
    floorDecal(kit, ux, y, UZ1 + 3.2, 1.2, 2);
  }

  // ------------------------------------------------------------ control pulpit
  const PL = { x0: CX - 2.6, z0: 585.8, x1: CX + 2.6, z1: 589.2 };
  const PY = y + 0.5;
  platform(kit, ctx, PL.x0, PL.z0, PL.x1, PL.z1, y, PY, { glow: "emitAmber", grate: true });
  stairs(kit, ctx, [CX, PL.z1 + 0.9], [0, -1], 2.2, y, PY, { rails: false });
  railing(kit, [PL.x0, PL.z0], [PL.x1, PL.z0], PY, { h: 1.0, lit: true });
  railing(kit, [PL.x0, PL.z0], [PL.x0, PL.z1], PY, { h: 1.0 });
  railing(kit, [PL.x1, PL.z0], [PL.x1, PL.z1], PY, { h: 1.0 });
  railing(kit, [PL.x0, PL.z1], [CX - 1.2, PL.z1], PY, { h: 1.0 });
  railing(kit, [CX + 1.2, PL.z1], [PL.x1, PL.z1], PY, { h: 1.0 });
  for (const cx of [CX - 1.5, CX, CX + 1.5]) impConsole(kit, ctx, [cx, PY, PL.z0 + 1.55], 0, { kind: "station", width: 1.4, screens: 2, seed: 80 + cx, light: false });
  chair(kit, [CX, PY, PL.z0 + 2.5], 0);
  floorDecal(kit, CX - 2.6, y, PL.z1 + 2.6, 1.2, 14);
  // marked lane from the south door to the pulpit with a glossy runner down the middle
  deckMark(kit, CX, y, (PL.z1 + 1.0 + z1 - 0.5) / 2, z1 - 0.5 - (PL.z1 + 1.0), 3.6, 0, Math.PI / 2);
  kit.boxMM("impGloss", [CX - 0.8, y - 0.001, PL.z1 + 1.0], [CX + 0.8, y + 0.006, z1 - 0.5], { color: IMP.white, texel: 0.25 });
  // lanes from the west door and into both aisles
  deckMark(kit, (x0 + PL.x0) / 2, y, 592, PL.x0 - x0 - 1, 3.0, 0, 0);

  // ------------------------------------------------------------ spare motivator core under overhaul (SE quadrant)
  {
    const sx = CX + 9.5;
    const sz0 = 589.5;
    const sz1 = 595.5;
    const szc = (sz0 + sz1) / 2;
    const cy = y + 1.5;
    const R = 1.05;
    deckMark(kit, sx, y, szc, 5.6, 8.4, 2, 0);
    for (const tz of [sz0 + 0.9, sz1 - 0.9]) {
      kit.box("impPaintedMetal", sx, y + 0.5, tz, 3.0, 0.8, 0.5, { color: IMP.hazardYellow, texel: 1 });
      for (const s of [-1, 1]) kit.box("impPaintedMetal", sx + s * 1.3, y + 0.1, tz, 0.4, 0.2, 1.0, { color: IMP.trim, texel: 1 });
      kit.add("impPaintedMetal", new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.5, 20, 1, true, Math.PI * 1.62, Math.PI * 0.76), { pos: [sx, cy, tz], rot: [Math.PI / 2, 0, 0], color: IMP.trim, uv: "scale", uvScale: [4, 1] });
    }
    // front half still in its ribbed housing; the rear half stripped down to the field coil
    kit.cyl("impMetal", sx, cy, (sz0 + szc) / 2, R, szc - sz0, "z", { color: IMP.gunmetal, segments: 24, texel: 0.5 });
    for (let rz = sz0 + 0.4; rz < szc - 0.2; rz += 0.8) kit.cyl("impPaintedMetal", sx, cy, rz, R + 0.14, 0.3, "z", { color: IMP.trim, segments: 24 });
    kit.cyl("impPaintedMetal", sx, cy, szc, R + 0.05, 0.12, "z", { color: IMP.wallDark, segments: 24 });
    kit.cyl("impMetal", sx, cy, (szc + sz1) / 2, 0.55, sz1 - szc, "z", { color: IMP.steel, segments: 18, texel: 0.5 });
    for (let rz = szc + 0.4; rz < sz1 - 0.2; rz += 0.5) kit.add("emitBlue", new THREE.TorusGeometry(0.72, 0.05, 6, 24), { pos: [sx, cy, rz], uv: "scale", uvScale: [4, 1] });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      kit.box("impMetal", sx + Math.cos(a) * 0.9, cy + Math.sin(a) * 0.9, (szc + sz1) / 2, 0.08, 0.16, sz1 - szc - 0.1, { color: IMP.gunmetal, rot: [0, 0, a] });
    }
    kit.cyl("impPaintedMetal", sx, cy, sz1, R, 0.16, "z", { color: IMP.wallDark, segments: 24 });
    kit.cyl("impMetal", sx, cy, sz1 + 0.2, 0.3, 0.3, "z", { color: IMP.trim, segments: 12 });
    // the removed housing half-shell on the deck beside it, open side up
    kit.add("impMetal", new THREE.CylinderGeometry(R, R, szc - sz0 - 0.2, 20, 1, true, Math.PI * 1.5, Math.PI), { pos: [sx - 3.0, y + R + 0.16, szc + 0.6], rot: [Math.PI / 2, 0, 0], color: IMP.gunmetal, uv: "scale", uvScale: [4, 1] });
    for (let rz = -1.0; rz <= 1.0; rz += 0.8) kit.add("impPaintedMetal", new THREE.CylinderGeometry(R + 0.14, R + 0.14, 0.3, 20, 1, true, Math.PI * 1.5, Math.PI), { pos: [sx - 3.0, y + R + 0.16, szc + 0.6 + rz], rot: [Math.PI / 2, 0, 0], color: IMP.trim, uv: "scale", uvScale: [4, 1] });
    kit.collider([sx - 1.6, y, sz0 - 0.4], [sx + 1.6, y + 3, sz1 + 0.5], "spareCore");
    kit.collider([sx - 4.1, y, szc - 0.9], [sx - 1.9, y + 1.1, szc + 2.1], "coreShell");
    toolCart(kit, [sx + 2.3, y, sz0 - 0.9], 0.3, { seed: 4 });
    crate(kit, [sx + 2.4, y, sz1 + 0.6], [1.4, 1.0, 1.0], { seed: 12 });
    crate(kit, [sx + 2.4, y + 1.0, sz1 + 0.6], [1.2, 0.8, 0.9], { seed: 13, yaw: 0.15 });
  }

  // ------------------------------------------------------------ coolant headers along both side walls
  for (const s of [-1, 1]) {
    const wx = s < 0 ? x0 + 1.0 : x1 - 1.0;
    const hz0 = 558;
    const hz1 = s < 0 ? 588 : 597;
    pipeRun(kit, [[wx, y + 3.4, hz0], [wx, y + 3.4, hz1], [wx, y + 0.6, hz1]], 0.32, { color: IMP.steel, clampPitch: 3 });
    pipeRun(kit, [[wx + s * -0.55, y + 4.2, hz0], [wx + s * -0.55, y + 4.2, hz1 - 2]], 0.18, { color: IMP.gunmetal, clampPitch: 3 });
    flange(kit, [wx, y + 1.2, hz1], 0.32, "y");
    const ux = s < 0 ? unitX[0] : unitX[2];
    for (const bz of [565, 573]) {
      pipeRun(kit, [[wx, y + 3.4, bz], [ux - s * (UR + 0.6), y + 3.4, bz], [ux - s * (UR + 0.6), AXY + 0.8, bz]], 0.22, { color: IMP.steel, clamps: false });
      valve(kit, [wx - s * 1.2, y + 3.4 + 0.36, bz], 0.26, "y", { stem: 0.3 });
      flange(kit, [ux - s * (UR + 0.6), AXY + 1.0, bz], 0.22, "y");
    }
    // wall-side stencils
    floorDecal(kit, wx - s * 1.0, y, 581, 1.0, 9, s < 0 ? -Math.PI / 2 : Math.PI / 2);
  }

  // ------------------------------------------------------------ overhead gantry + hoist
  craneRails(kit, z0 + 1.5, z1 - 1.5, x0 + 2.6, x1 - 2.6, y + h - 1.6, "z", { toWall: 2.3, bracketPitch: 10, h: 0.5, w: 0.3 });
  craneBridge(kit, x1 - x0 - 5.2, y + h - 1.6 + 0.6, 570.5, { cx: CX, tx: -4.2, drop: 1.6, girder: 0.7 });

  // ------------------------------------------------------------ wall dressing
  {
    // north wall: field generator bank (relay cabinets) where the conduits terminate
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    for (const ux of unitX) relayCabinet(frame, w.u(ux), 0, 3.2, 2.8, 90 + ux);
    relayCabinet(frame, w.u(CX - 4.25), 0, 2.2, 1.6, 95);
    relayCabinet(frame, w.u(CX + 4.25), 0, 2.2, 1.6, 96);
    cableTray(frame, 1.0, w.length - 1.0, 4.2, { n: 0.6, cables: 4 });
    frame.quad("impDecal", w.u(x0 + 2.5), 2.2, 0.064, 1.2, 1.2, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", w.u(x1 - 2.5), 2.2, 0.064, 1.2, 1.2, { uvRect: impDecalRect(13) });
  }
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(CX - 7), 2.2, 1.6, 0.9, 0);
    wallScreen(frame, w.u(CX + 7), 2.2, 1.6, 0.9, 1);
    lockers(frame, w.u(x1 - 1.5), w.u(x1 - 6.5), 2.1, { seed: 21 });
    relayCabinet(frame, w.u(x0 + 4.5), 0, 2.6, 3.0, 97);
    frame.quad("impDecal", w.u(CX - 10.5), 1.8, 0.064, 0.8, 0.8, { uvRect: impDecalRect(7) });
    frame.quad("impDecal", w.u(CX + 10.5), 1.8, 0.064, 0.8, 0.8, { uvRect: impDecalRect(15) });
  }
  {
    // east wall: energizer cabinets either side of the header drop, status screen up by the units
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(580), 2.0, 1.4, 0.8, 1);
    relayCabinet(frame, w.u(585.5), 0, 3.0, 4.0, 98);
    relayCabinet(frame, w.u(592.5), 0, 3.0, 4.0, 99);
    frame.quad("impDecal", w.u(589.2), 1.7, 0.064, 0.7, 0.7, { uvRect: impDecalRect(3) });
    cableTray(frame, w.u(583), w.u(598), 3.6, { n: 0.5, cables: 3 });
  }
  {
    // west wall: cabinets south of the door, screen by the units
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(580), 2.0, 1.4, 0.8, 2);
    relayCabinet(frame, w.u(596.5), 0, 3.0, 4.0, 100);
    frame.quad("impDecal", w.u(586), 1.7, 0.064, 0.7, 0.7, { uvRect: impDecalRect(12) });
  }
  // tool cart parked by the west unit
  toolCart(kit, [unitX[0] - 3.5, y, 582], 0.4, { seed: 2 });

  // ------------------------------------------------------------ lights
  for (const ax of [(unitX[0] + unitX[1]) / 2, (unitX[1] + unitX[2]) / 2]) {
    ceilingLight(kit, ctx, [ax, y + h, 566], 5, "z", { mat: "lightBandWarm", color: 0xffc27a, intensity: 4.5, distance: 12, priority: 1 });
    ceilingLight(kit, ctx, [ax, y + h, 578], 5, "z", { mat: "lightBandWarm", color: 0xffc27a, intensity: 4.5, distance: 12, priority: 1 });
  }
  ceilingLight(kit, ctx, [CX, y + h, 588], 6, "x", { mat: "lightBandWarm", color: 0xdfe8ff, intensity: 5, distance: 12, priority: 2 });
  pointLightDesc(ctx, 0xffc27a, 2.5, 9, [x0 + 3, y + 3.5, 592], 0);

  // ------------------------------------------------------------ views
  ctx.view("hyperdrive", CX, y + STD.eye, z1 - 2.2, 0, -2);
  ctx.view("hyperdrive_units", x0 + 3.0, y + STD.eye, 589, -50, 3);
  ctx.view("hyperdrive_aisle", (unitX[0] + unitX[1]) / 2, y + STD.eye, UZ1 + 4.5, 0, 2);
  void rand;
}
