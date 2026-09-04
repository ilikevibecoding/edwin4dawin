// Enlisted crew quarters (Deck 7): a wide central aisle from the spine door with seven berthing
// modules on each side — two facing banks of seven three-tier bunks per module, footlockers under
// the bottom tier, personal lockers at every passage end — a day zone by the door (duty roster,
// lockers, mess table, caf dispenser) and a partitioned washroom (basins, mirrors, showers, stalls).
// Cool white light bands over the passages, warm reading lamps in the bunks, a worn aisle deck.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame, ceilingFrame } from "../../../core/frame.js";
import { impCeiling, bunk, lockers, wallScreen, ceilingLight, pointLightDesc, table, bench, crate } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { ensureCrewMaterials, instancedProp, partition, counter, dispenser, washStation, floorDecal, ceilingStrip, namePlate } from "./crewKit.js";

export function buildCrewQuarters(kit, ctx) {
  ensureCrewMaterials(ctx.mats);
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const walls = roomWalls(room);

  buildShell(kit, ctx, ctx.id, room, {
    skip: ["ceiling"],
    wall: { pitch: 3.5, tone: IMP.wallLight, toneAlt: IMP.wallMid, styles: { plain: 0.62, vent: 0.16, hatch: 0.14, pipes: 0.08 } },
    floor: { tone: IMP.wallDark, strip: false },
  });
  // ceiling without the default troughs: the passages get their own strips
  impCeiling(ceilingFrame(kit, x0, z0, y + h), x1 - x0, z1 - z0, { lights: false, panelW: 1.75, seed: 41 });

  // ---- central aisle ------------------------------------------------------------------------
  const aisleZ0 = 418.0;
  const aisleZ1 = 422.0;
  const aisleC = (aisleZ0 + aisleZ1) / 2;
  // worn lighter deck strip where the boots go
  kit.boxMM("impDeck", [x0 + 0.3, y + 0.002, aisleZ0 + 0.2], [x1 - 0.3, y + 0.008, aisleZ1 - 0.2], { color: IMP.wallMid, texel: 0.5 });
  kit.boxMM("impMetal", [x0 + 0.3, y + 0.004, aisleZ0 + 0.1], [x1 - 0.3, y + 0.01, aisleZ0 + 0.2], { color: IMP.steel });
  kit.boxMM("impMetal", [x0 + 0.3, y + 0.004, aisleZ1 - 0.2], [x1 - 0.3, y + 0.01, aisleZ1 - 0.1], { color: IMP.steel });
  for (const [i, lx] of [8, 17, 26].entries()) ceilingLight(kit, ctx, [lx, y + h, aisleC], 7.5, "x", { intensity: 7, distance: 13, priority: i === 1 ? 2 : 1, color: 0xdfe8ff });
  ceilingLight(kit, ctx, [31.6, y + h, aisleC], 3.2, "x", { intensity: 4, distance: 9, priority: 0, color: 0xdfe8ff });
  floorDecal(kit, 4.6, y, aisleC, 1.1, 7, -90);
  floorDecal(kit, 6.2, y, aisleC + 1.1, 0.7, 0, 0);

  // ---- berthing modules -----------------------------------------------------------------------
  const modules = 7;
  const pitch = 3.5;
  const xStart = (i) => 9.1 + i * pitch;
  const bunkTransforms = [];
  const lockerTransforms = [];
  const nBunks = 7;
  const bunkPitch = 2.45;
  const sides = [
    { sign: 1, zFirst: 401.65, zc: 409.1, wall: "north" }, // north side: bunks run from the north wall toward the aisle
    { sign: -1, zFirst: 438.35, zc: 430.9, wall: "south" },
  ];
  for (let i = 0; i < modules; i++) {
    const xs = xStart(i);
    const xA = xs + 0.45;
    const xB = xs + 2.95;
    const passX = xs + 1.7;
    for (const side of sides) {
      let zMin = Infinity;
      let zMax = -Infinity;
      for (let b = 0; b < nBunks; b++) {
        const zc = side.zFirst + side.sign * b * bunkPitch;
        zMin = Math.min(zMin, zc - 1.0);
        zMax = Math.max(zMax, zc + 1.0);
        const tint = 0.92 + ((i * 7 + b * 3) % 5) * 0.02;
        bunkTransforms.push({ pos: [xA, y, zc], rot: [0, 0, 0], color: new THREE.Color(tint, tint, tint) });
        bunkTransforms.push({ pos: [xB, y, zc], rot: [0, Math.PI, 0], color: new THREE.Color(tint, tint, tint) });
        // footlockers under the bottom tier, latch toward the passage
        lockerTransforms.push({ pos: [xs + 0.72, y, zc + 0.62], rot: [0, 0, 0] });
        lockerTransforms.push({ pos: [xs + 2.68, y, zc - 0.62], rot: [0, Math.PI, 0] });
      }
      // one collider per bank
      kit.collider([xs, y, zMin], [xs + 0.9, y + 3.3, zMax], "bunks");
      kit.collider([xs + 2.5, y, zMin], [xs + 3.4, y + 3.3, zMax], "bunks");
      // passage light strip + bay number on the deck at the aisle end
      ceilingStrip(kit, [passX, y + h, side.zc], 16.6, "z", { mat: "lightBand", w: 0.22 });
      floorDecal(kit, passX, y, side.sign > 0 ? aisleZ0 - 0.6 : aisleZ1 + 0.6, 0.7, 2, side.sign > 0 ? 0 : 180);
      // lockers at the passage end (outer wall)
      const w = walls[side.wall];
      const { frame } = wallFrame(kit, w.from, w.to, y);
      const ua = w.u(xs + 0.95);
      const ub = w.u(xs + 2.45);
      lockers(frame, Math.min(ua, ub), Math.max(ua, ub), 2.1, { seed: 11 + i * 3 + (side.sign > 0 ? 0 : 1), tone: IMP.wallMid });
    }
    // divider between this module's east bank and the next module's west bank, with a bay plate at the aisle
    if (i < modules - 1) {
      const px = xs + 3.45;
      for (const side of sides) {
        const za = side.sign > 0 ? z0 + 0.4 : aisleZ1 + 0.2;
        const zb = side.sign > 0 ? aisleZ0 - 0.2 : z1 - 0.4;
        kit.boxMM("impPanel", [px - 0.05, y, za], [px + 0.05, y + 3.0, zb], { color: IMP.wallMid, uv: "world", texel: 0.5 });
        kit.boxMM("impPaintedMetal", [px - 0.07, y + 2.96, za], [px + 0.07, y + 3.04, zb], { color: IMP.trim, texel: 1 });
        const zEnd = side.sign > 0 ? zb : za;
        kit.box("impPaintedMetal", px, y + 1.5, zEnd + (side.sign > 0 ? -0.06 : 0.06), 0.16, 3.0, 0.14, { color: IMP.trim, texel: 1 });
        const g = new THREE.PlaneGeometry(0.34, 0.34);
        if (side.sign < 0) g.rotateY(Math.PI);
        kit.add("impDecal", g, { pos: [px, y + 1.9, zEnd + (side.sign > 0 ? 0.012 : -0.012)], uv: "keep", uvRect: impDecalRect(2) });
        kit.box("emitBlue", px, y + 2.3, zEnd + (side.sign > 0 ? 0.012 : -0.012), 0.08, 0.03, 0.006);
      }
    }
  }
  // the bunks and footlockers: one draw call per material however many. Each tier gets a warm glow
  // strip under its lip on the passage side (+x) and an occupant plate on the head post.
  instancedProp(
    kit,
    (k) => {
      bunk(k, [0, 0, 0], 0, { tiers: 3, collide: false, color: IMP.fabricGrey });
      for (let t = 0; t < 3; t++) {
        const by = 0.45 + t * 0.95;
        // warm glow strip under the lip, occupant plate with a status LED on the head post
        k.box("crewEmit", 0.456, by - 0.03, -0.45, 0.008, 0.03, 0.7, { color: 0xc07040 });
        k.box("impPaintedMetal", 0.465, by + 0.42, -0.86, 0.01, 0.12, 0.2, { color: IMP.consoleDark, texel: 1 });
        const dg = new THREE.PlaneGeometry(0.16, 0.1);
        dg.rotateY(Math.PI / 2);
        k.add("impDecal", dg, { pos: [0.472, by + 0.42, -0.86], uv: "keep", uvRect: impDecalRect(t === 1 ? 6 : 15) });
        k.box("crewEmit", 0.472, by + 0.5, -0.86, 0.006, 0.02, 0.06, { color: t === 2 ? 0xffb020 : 0x3a86ff });
      }
      // kit bag on the middle tier's shelf and a folded blanket stack on the top one
      k.box("impFabric", -0.2, 0.45 + 0.95 + 0.26, 0.55, 0.36, 0.22, 0.5, { color: IMP.fabricOlive, uv: "world", texel: 2 });
      k.box("impFabric", 0.1, 0.45 + 1.9 + 0.22, 0.6, 0.4, 0.14, 0.4, { color: IMP.fabricGrey, uv: "world", texel: 2 });
    },
    bunkTransforms,
  );
  instancedProp(
    kit,
    (k) => {
      k.box("impPaintedMetal", 0, 0.13, 0, 0.42, 0.26, 0.6, { color: IMP.gunmetal, texel: 2 });
      k.box("impPaintedMetal", 0, 0.2, 0, 0.44, 0.016, 0.62, { color: IMP.trim, texel: 2 });
      k.box("impPaintedMetal", 0.222, 0.12, 0, 0.012, 0.06, 0.14, { color: IMP.steel, texel: 2 });
      const dg = new THREE.PlaneGeometry(0.14, 0.14);
      dg.rotateY(Math.PI / 2);
      k.add("impDecal", dg, { pos: [0.226, 0.14, 0.2], uv: "keep", uvRect: impDecalRect(6) });
    },
    lockerTransforms,
  );
  // fill for the berthing bays: cool from the passage strips, a warm pool mid-way at bunk height
  for (const side of sides) {
    for (const lx of [xStart(1) + 1.7, xStart(5) + 1.7]) pointLightDesc(ctx, 0xdfe8ff, 11, 20, [lx, y + 3.1, side.zc], 0);
    pointLightDesc(ctx, 0xffc890, 4, 12, [xStart(3) + 1.7, y + 2.2, side.zc], 0);
  }

  // ---- day zone (north of the door) -----------------------------------------------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    // duty roster: big screen with a header plate and the deck code
    wallScreen(frame, w.u(414), 1.75, 2.4, 1.15, 1);
    frame.box("impPaintedMetal", w.u(414), 2.5, 0.08, 2.6, 0.22, 0.04, { color: IMP.trim, texel: 1 });
    frame.quad("impDecal", w.u(414) - 0.9, 2.5, 0.102, 0.2, 0.2, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", w.u(414) + 0.3, 2.5, 0.102, 0.2, 0.2, { uvRect: impDecalRect(15) });
    frame.box("emitBlue", w.u(414) + 1.0, 2.5, 0.102, 0.24, 0.04, 0.01);
    // notice board: dark plate with stencils
    frame.box("impPaintedMetal", w.u(410.5), 1.6, 0.075, 1.4, 1.0, 0.03, { color: IMP.consoleDark, texel: 1 });
    for (let i = 0; i < 4; i++) frame.quad("impDecal", w.u(410.5) - 0.48 + (i % 2) * 0.62, 1.86 - Math.floor(i / 2) * 0.5, 0.092, 0.4, 0.4, { uvRect: impDecalRect([3, 9, 15, 6][i]) });
    lockers(frame, w.u(409), w.u(401), 2.1, { seed: 21, tone: IMP.wallMid });
    namePlate(frame, w.u(417.2), 1.55, { decal: 0, led: "emitBlue" });
  }
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, w.u(3.1), w.u(8.6), 2.1, { seed: 23, tone: IMP.wallMid });
  }
  table(kit, [6.0, y, 412.6], 0.9, 4.4, { tone: IMP.wallDark });
  bench(kit, [4.95, y, 412.6], 4.0, -Math.PI / 2);
  bench(kit, [7.05, y, 412.6], 4.0, Math.PI / 2);
  dispenser(kit, [3.25, y, 416.6], Math.PI / 2, { accent: "emitAmber", screen: 1, decal: 15 });
  crate(kit, [7.9, y, 401.4], [1.0, 0.7, 0.8], { seed: 4, tone: IMP.wallMid });
  crate(kit, [7.9, y + 0.7, 401.4], [0.8, 0.5, 0.7], { seed: 5, tone: IMP.gunmetal, collide: false });
  crate(kit, [6.6, y, 401.4], [0.9, 0.5, 0.8], { seed: 6, tone: IMP.consoleDark });
  ceilingLight(kit, ctx, [5.8, y + h, 409.5], 7, "z", { intensity: 8, distance: 12, priority: 1, color: 0xdfe8ff });
  floorDecal(kit, 6.0, y, 408.2, 0.9, 9, 0);
  floorDecal(kit, 4.2, y, 418.6, 0.6, 13, -90);

  // ---- washroom (south of the door) ------------------------------------------------------------
  const wx1 = 8.7;
  const wz0 = 422.3;
  partition(kit, [x0 + 0.25, wz0], [wx1, wz0], y, h - 0.05, { openings: [{ u0: 6.55 - x0 - 0.25, u1: 8.4 - x0 - 0.25, h: 2.3 }], tone: IMP.wallLight, seed: 31, tag: "washroom" });
  partition(kit, [wx1, wz0], [wx1, z1 - 0.25], y, h - 0.05, { tone: IMP.wallLight, seed: 32, tag: "washroom" });
  // hygienic gloss floor inside
  kit.boxMM("impGloss", [x0 + 0.4, y + 0.001, wz0 + 0.1], [wx1 - 0.1, y + 0.006, z1 - 0.4], { color: IMP.wallMid, texel: 0.25 });
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    counter(kit, [3.09, y, 428.9], 7.4, Math.PI / 2, { d: 0.56, h: 0.88, doors: false, tone: IMP.wallDark, tag: "basins" });
    for (let k = 0; k < 6; k++) washStation(frame, w.u(425.9 + k * 1.2), { counterH: 0.88, counterD: 0.68 });
    // hand dryers + towel rail + waste bin beyond the basins
    frame.box("impPaintedMetal", w.u(433.4), 1.25, 0.12, 0.3, 0.42, 0.22, { color: IMP.consoleDark, texel: 1 });
    frame.box("emitBlue", w.u(433.4), 1.1, 0.235, 0.14, 0.02, 0.01);
    frame.box("impMetal", w.u(434.8), 1.1, 0.08, 1.4, 0.03, 0.03, { color: IMP.steel });
    for (const du of [-0.6, 0.6]) frame.box("impMetal", w.u(434.8) + du, 1.1, 0.04, 0.03, 0.03, 0.08, { color: IMP.steel });
    frame.quad("impDecal", w.u(433.4), 1.75, 0.062, 0.36, 0.36, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", w.u(437.2), 1.6, 0.062, 0.5, 0.5, { uvRect: impDecalRect(9) });
    kit.add("impMetal", new THREE.CylinderGeometry(0.22, 0.2, 0.62, 14), { pos: [3.3, y + 0.31, 436.6], color: IMP.gunmetal, uv: "scale", uvScale: [1.4, 0.6] });
    kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.23, 0.23, 0.03, 14), { pos: [3.3, y + 0.635, 436.6], color: IMP.trim, uv: "scale", uvScale: [1, 1] });
    kit.collider([3.05, y, 436.35], [3.55, y + 0.65, 436.85], "bin");
  }
  // shower bay along the east partition: kerb, drain grate, three heads with half partitions
  {
    const sx0 = 7.25;
    const sx1 = wx1 - 0.1;
    const sz0 = 432.7;
    const sz1 = 437.3;
    kit.boxMM("impPaintedMetal", [sx0 - 0.08, y, sz0 - 0.08], [sx0, y + 0.08, sz1 + 0.08], { color: IMP.trim, texel: 1 });
    kit.boxMM("impPaintedMetal", [sx0 - 0.08, y, sz0 - 0.08], [sx1, y + 0.08, sz0], { color: IMP.trim, texel: 1 });
    kit.boxMM("impPaintedMetal", [sx0 - 0.08, y, sz1], [sx1, y + 0.08, sz1 + 0.08], { color: IMP.trim, texel: 1 });
    const g = new THREE.PlaneGeometry(sx1 - sx0, sz1 - sz0);
    g.rotateX(-Math.PI / 2);
    kit.add("impGrate", g, { pos: [(sx0 + sx1) / 2, y + 0.012, (sz0 + sz1) / 2], uv: "scale", uvScale: [(sx1 - sx0) / 1.24, (sz1 - sz0) / 0.9], color: 0xffffff });
    for (let k = 0; k < 3; k++) {
      const z = sz0 + 0.75 + k * 1.55;
      kit.box("impMetal", sx1 - 0.03, y + 1.5, z, 0.04, 2.0, 0.04, { color: IMP.steel });
      kit.box("impMetal", sx1 - 0.2, y + 2.48, z, 0.36, 0.04, 0.04, { color: IMP.steel });
      kit.add("impMetal", new THREE.CylinderGeometry(0.09, 0.03, 0.06, 12), { pos: [sx1 - 0.38, y + 2.42, z], color: IMP.steel, uv: "scale", uvScale: [0.5, 0.1] });
      kit.box("impPaintedMetal", sx1 - 0.1, y + 1.1, z, 0.12, 0.12, 0.2, { color: IMP.consoleDark, texel: 1 });
      kit.box("emitBlue", sx1 - 0.17, y + 1.1, z, 0.01, 0.02, 0.08);
      if (k < 2) kit.boxMM("impPanel", [sx0 + 0.25, y + 0.08, z + 0.76], [sx1, y + 2.0, z + 0.8], { color: IMP.wallLight, uv: "world", texel: 0.5 });
    }
  }
  // stalls along the south wall
  {
    const sx0 = 3.15;
    const n = 4;
    const sw = 1.25;
    const depth = 1.3;
    const zf = z1 - 0.25 - depth;
    for (let i = 0; i <= n; i++) kit.boxMM("impPanel", [sx0 + i * sw - 0.02, y + 0.1, zf], [sx0 + i * sw + 0.02, y + 2.15, z1 - 0.3], { color: IMP.wallLight, uv: "world", texel: 0.5 });
    for (let i = 0; i < n; i++) {
      const cx = sx0 + (i + 0.5) * sw;
      kit.box("impPanel", cx, y + 1.15, zf, sw - 0.14, 1.95, 0.03, { color: IMP.wallMid, uv: "keep" });
      kit.box("impMetal", cx - 0.35, y + 1.05, zf - 0.025, 0.03, 0.12, 0.02, { color: IMP.steel });
      kit.box("crewEmit", cx + 0.3, y + 1.9, zf - 0.02, 0.05, 0.03, 0.006, { color: i % 3 === 1 ? 0xff2a2a : 0x40ff70 });
      for (let s = 0; s < 5; s++) kit.box("impPaintedMetal", cx, y + 0.45 + s * 0.06, zf - 0.02, sw * 0.5, 0.012, 0.008, { color: IMP.trim });
    }
    kit.boxMM("impPaintedMetal", [sx0 - 0.04, y + 2.12, zf - 0.04], [sx0 + n * sw + 0.04, y + 2.24, z1 - 0.3], { color: IMP.trim, texel: 1 });
    kit.collider([sx0 - 0.05, y, zf - 0.05], [sx0 + n * sw + 0.05, y + 2.2, z1 - 0.25], "stalls");
  }
  ceilingLight(kit, ctx, [5.8, y + h, 431], 7, "z", { intensity: 4, distance: 10, priority: 1, color: 0xf0f4ff });
  ceilingStrip(kit, [7.4, y + h, 429.5], 12, "z", { mat: "lightBand", w: 0.2 });

  // ---- east end of the aisle ------------------------------------------------------------------
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(aisleC), 1.75, 1.6, 0.9, 0);
    frame.quad("impDecal", w.u(aisleC) - 1.3, 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", w.u(aisleC) + 1.3, 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(4) });
    frame.box("impPaintedMetal", w.u(aisleC) + 1.3, 0.9, 0.16, 0.5, 0.36, 0.14, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", w.u(aisleC) + 1.3, 1.0, 0.235, 0.3, 0.05, 0.01, { color: 0xff2a2a });
    frame.quad("impDecal", w.u(aisleC) + 1.3, 0.8, 0.232, 0.22, 0.22, { uvRect: impDecalRect(13) });
  }

  // ---- views -----------------------------------------------------------------------------------
  ctx.view("crewQuarters", 4.4, y + STD.eye, aisleC, -90, -3);
  ctx.view("crewQuarters_bay", xStart(2) + 1.7, y + STD.eye, aisleZ0 - 0.4, 0, -4);
  ctx.view("crewQuarters_wash", 7.7, y + STD.eye, 424.6, 165, -5);
  ctx.view("crewQuarters_day", 8.2, y + STD.eye, 416.8, 40, -4);
}
