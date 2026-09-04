// Main Reactor Chamber (Deck 12 hero room). The walking deck (y = 8) is a gallery ring around a
// great pit; a lower service ring at y = -6 is reached by two long open stairs down the pit walls;
// the pit floor at y = -18 carries transformers and coolant headers around the base of the core: a
// 56 m caged energy column that rises through the ceiling collar, banded with armour rings and orbited
// by slowly turning field rings. Blue-white core light is the key, amber work lights on the gallery,
// red beacons at the pit corners.
import * as THREE from "three";
import { roomWalls, wallOpenings } from "../../shell.js";
import { wallFrame, ceilingFrame } from "../../../core/frame.js";
import { impWall, impCeiling, impFloor, doorSign, walkable, railing, pipeRun, console as impConsole, chair, pointLightDesc, wallScreen, rng } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { addEngMaterials } from "./engMaterials.js";
import { ibeam, hazardKerb, hazardBand, floorDecal, deckMark, beacon, transformer, pump, valve, flange, industrialStair, landing, craneRails, craneBridge, miniKit, relayCabinet, ladder } from "./engKit.js";

const LOWER_H = 5.2; // panelled wall height at gallery level; industrial structure above

export function buildReactor(kit, ctx) {
  addEngMaterials(ctx.mats);
  const { room, floorY: y, id } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const H = room.h;
  const top = y + H;
  const CX = (x0 + x1) / 2;
  const CZ = (z0 + z1) / 2;
  const PIT = { x0: -20, z0: 552, x1: 20, z1: 588 };
  const INNER = { x0: -16, z0: 556, x1: 16, z1: 584 };
  const RING_Y = y - 14; // -6
  const PIT_Y = y - room.floorDrop; // -18
  const CORE_R = 9;
  const rand = rng(77);

  // ---------------------------------------------------------------- gallery floor (4 bands)
  const bands = [
    [x0, PIT.z1, x1, z1],
    [x0, z0, x1, PIT.z0],
    [x0, PIT.z0, PIT.x0, PIT.z1],
    [PIT.x1, PIT.z0, x1, PIT.z1],
  ];
  for (const b of bands) {
    impFloor(kit, b, y, { tone: IMP.wallDark, trim: false, texel: 0.5 });
    walkable(ctx, b[0], b[1], b[2], b[3], y, id);
  }
  // glossy circulation strips from the doors to the pit edge
  kit.boxMM("impGloss", [CX - 1.4, y - 0.001, PIT.z1 + 0.6], [CX + 1.4, y + 0.006, z1], { color: IMP.white, texel: 0.25 });
  kit.boxMM("impGloss", [x0, y - 0.001, 590.8], [PIT.x0 - 0.6, y + 0.006, 593.2], { color: IMP.white, texel: 0.25 });
  kit.boxMM("impGloss", [PIT.x1 + 0.6, y - 0.001, 590.8], [x1, y + 0.006, 593.2], { color: IMP.white, texel: 0.25 });

  // ---------------------------------------------------------------- outer walls
  const walls = roomWalls(room);
  let wi = 0;
  for (const key of ["north", "south", "west", "east"]) {
    wi++;
    const w = walls[key];
    const openings = [...wallOpenings(id, room, key)];
    // observation window shared with Engineering Control (its east wall carries the matching opening)
    if (key === "west") openings.push({ type: "window", u0: 14, u1: 40, v0: 1.0, v1: 4.0 });
    const { frame, length } = wallFrame(kit, w.from, w.to, y);
    impWall(frame, length, LOWER_H, {
      openings,
      slabHoles: true,
      pitch: 4,
      seed: 900 + wi * 13,
      tone: IMP.wallMid,
      toneAlt: IMP.wallDark,
      bandMat: "lightBandWarm",
      styles: { plain: 0.3, control: 0.16, vent: 0.16, hatch: 0.1, pipes: 0.16, screen: 0.06, niche: 0.06 },
      tag: id + ":" + key,
    });
    for (const op of openings) if (op.type === "door") doorSign(frame, (op.u0 + op.u1) / 2, op.v1 + 0.28, { decal: 7 });
    upperWall(frame, length, LOWER_H, H, 300 + wi * 17);
    // stencils flanking the doors at eye height
    for (const op of openings) {
      if (op.type !== "door") continue;
      frame.quad("impDecal", op.u0 - 1.0, 1.9, 0.064, 0.7, 0.7, { uvRect: impDecalRect(1) });
      frame.quad("impDecal", op.u1 + 1.0, 1.9, 0.064, 0.7, 0.7, { uvRect: impDecalRect(2) });
    }
  }

  // ---------------------------------------------------------------- ceiling with core collar
  {
    const hole = [CX - 12, CZ - 12, CX + 12, CZ + 12];
    const pieces = [
      [x0, z0, x1, hole[1]],
      [x0, hole[3], x1, z1],
      [x0, hole[1], hole[0], hole[3]],
      [hole[2], hole[1], x1, hole[3]],
    ];
    let s = 0;
    for (const p of pieces) {
      const f = ceilingFrame(kit, p[0], p[1], top);
      impCeiling(f, p[2] - p[0], p[3] - p[1], { lights: false, panelW: 4.5, tone: IMP.wallDark, seed: 40 + s++ });
    }
    // collar: the core passes up through the deck above
    kit.cyl("impPaintedMetal", CX, top - 1.6, CZ, 12.6, 3.2, "y", { color: IMP.wallDark, segments: 48, texel: 0.5 });
    kit.cyl("impMetal", CX, top - 3.25, CZ, 12.8, 0.3, "y", { color: IMP.steel, segments: 48 });
    kit.cyl("impPaintedMetal", CX, top - 2.2, CZ, 12.75, 0.5, "y", { color: IMP.trim, segments: 48 });
    hazardRing(kit, CX, top - 2.95, CZ, 12.7, 0.35);
    // ceiling beams (interrupted by the collar)
    for (const bz of [546, 552, 558, 564, 570, 576, 582, 588, 594]) {
      if (bz > CZ - 12.6 && bz < CZ + 12.6) {
        const half = Math.sqrt(Math.max(0, 12.6 * 12.6 - (bz - CZ) * (bz - CZ)));
        ibeam(kit, [x0 + 0.3, top - 0.9, bz], [CX - half + 0.2, top - 0.9, bz], { h: 1.4, w: 0.7 });
        ibeam(kit, [CX + half - 0.2, top - 0.9, bz], [x1 - 0.3, top - 0.9, bz], { h: 1.4, w: 0.7 });
      } else ibeam(kit, [x0 + 0.3, top - 0.9, bz], [x1 - 0.3, top - 0.9, bz], { h: 1.4, w: 0.7 });
    }
    for (const bx of [-18, 18]) ibeam(kit, [bx, top - 0.9, z0 + 0.3], [bx, top - 0.9, z1 - 0.3], { h: 1.4, w: 0.7 });
    // work-light housings under the beams over the galleries (amber)
    for (const [lx, lz] of [[0, 594], [0, 546], [-25, 570], [25, 570], [-25, 546], [25, 546], [-25, 594], [25, 594]]) {
      kit.box("impPaintedMetal", lx, top - 1.9, lz, 1.6, 0.4, 1.0, { color: IMP.trim, texel: 1 });
      kit.box("lightBandWarm", lx, top - 2.11, lz, 1.4, 0.02, 0.8, { uv: "keep" });
    }
  }

  // ---------------------------------------------------------------- the pit
  // upper pit walls (gallery edge down to the service ring) face inward
  const pitFaces = (b, yBot, yTop, deep) => {
    const h = yTop - yBot;
    const specs = [
      { from: [b.x0, b.z0], to: [b.x1, b.z0] }, // north face, looks +z
      { from: [b.x1, b.z1], to: [b.x0, b.z1] }, // south face, looks -z
      { from: [b.x0, b.z1], to: [b.x0, b.z0] }, // west face, looks +x
      { from: [b.x1, b.z0], to: [b.x1, b.z1] }, // east face, looks -x
    ];
    let i = 0;
    for (const s of specs) {
      const { frame, length } = wallFrame(kit, s.from, s.to, yBot);
      pitWall(frame, length, h, { deep, seed: 500 + i++ * 7 });
    }
  };
  pitFaces(PIT, RING_Y, y, false);
  pitFaces(INNER, PIT_Y, RING_Y, true);
  // upper pit wall colliders (the ring walker must not pass under the gallery)
  kit.collider([PIT.x0 - 0.5, RING_Y, PIT.z0 - 0.5], [PIT.x1 + 0.5, y - 0.1, PIT.z0], "pitWall");
  kit.collider([PIT.x0 - 0.5, RING_Y, PIT.z1], [PIT.x1 + 0.5, y - 0.1, PIT.z1 + 0.5], "pitWall");
  kit.collider([PIT.x0 - 0.5, RING_Y, PIT.z0], [PIT.x0, y - 0.1, PIT.z1], "pitWall");
  kit.collider([PIT.x1, RING_Y, PIT.z0], [PIT.x1 + 0.5, y - 0.1, PIT.z1], "pitWall");

  // gallery edge: fascia, hazard kerb, railing (gaps at the two stair heads)
  const stairW = 2.6;
  const stairX = [PIT.x0 + stairW / 2, PIT.x1 - stairW / 2]; // stair centre x (west, east)
  const edgeRail = (a, b) => railing(kit, a, b, y, { h: 1.1, postPitch: 2.5, lit: true });
  edgeRail([PIT.x0, PIT.z0], [PIT.x1, PIT.z0]);
  edgeRail([PIT.x0, PIT.z0], [PIT.x0, PIT.z1]);
  edgeRail([PIT.x1, PIT.z0], [PIT.x1, PIT.z1]);
  edgeRail([PIT.x0 + stairW + 0.1, PIT.z1], [PIT.x1 - stairW - 0.1, PIT.z1]);
  hazardKerb(kit, [PIT.x0 - 0.2, PIT.z0 - 0.2], [PIT.x1 + 0.2, PIT.z0 - 0.2], y);
  hazardKerb(kit, [PIT.x0 - 0.2, PIT.z0 - 0.2], [PIT.x0 - 0.2, PIT.z1 + 0.2], y);
  hazardKerb(kit, [PIT.x1 + 0.2, PIT.z0 - 0.2], [PIT.x1 + 0.2, PIT.z1 + 0.2], y);
  hazardKerb(kit, [PIT.x0 + stairW + 0.1, PIT.z1 + 0.2], [PIT.x1 - stairW - 0.1, PIT.z1 + 0.2], y);
  // stair-head markings
  for (const sx of stairX) {
    deckMark(kit, sx, y, PIT.z1 + 1.9, stairW + 0.6, 3.0, 2);
    floorDecal(kit, sx, y, PIT.z1 + 4.2, 1.2, 14);
  }

  // ---------------------------------------------------------------- service ring at y = -6
  const ringSlabs = [
    [PIT.x0, PIT.z0, PIT.x1, INNER.z0],
    [PIT.x0, INNER.z1, PIT.x1, PIT.z1],
    [PIT.x0, INNER.z0, INNER.x0, INNER.z1],
    [INNER.x1, INNER.z0, PIT.x1, INNER.z1],
  ];
  for (const s of ringSlabs) {
    kit.boxMM("impDeck", [s[0], RING_Y - 0.16, s[1]], [s[2], RING_Y, s[3]], { color: IMP.wallDark, texel: 0.5 });
    walkable(ctx, s[0], s[1], s[2], s[3], RING_Y, "ring");
  }
  // grate strip along the inner edge + kerb + railing all round the deep pit
  const innerRail = (a, b) => railing(kit, a, b, RING_Y, { h: 1.1, postPitch: 2.5 });
  innerRail([INNER.x0, INNER.z0], [INNER.x1, INNER.z0]);
  innerRail([INNER.x0, INNER.z1], [INNER.x1, INNER.z1]);
  innerRail([INNER.x0, INNER.z0], [INNER.x0, INNER.z1]);
  innerRail([INNER.x1, INNER.z0], [INNER.x1, INNER.z1]);
  hazardKerb(kit, [INNER.x0 - 0.2, INNER.z0 - 0.2], [INNER.x1 + 0.2, INNER.z0 - 0.2], RING_Y);
  hazardKerb(kit, [INNER.x0 - 0.2, INNER.z1 + 0.2], [INNER.x1 + 0.2, INNER.z1 + 0.2], RING_Y);
  hazardKerb(kit, [INNER.x0 - 0.2, INNER.z0 - 0.2], [INNER.x0 - 0.2, INNER.z1 + 0.2], RING_Y);
  hazardKerb(kit, [INNER.x1 + 0.2, INNER.z0 - 0.2], [INNER.x1 + 0.2, INNER.z1 + 0.2], RING_Y);
  // amber wall lights + relay cabinets on the upper pit wall at ring level (kept north of the stairs,
  // which hang over the southern 22 m of the west / east ledges)
  for (const s of [-1, 1]) {
    const { frame } = wallFrame(kit, s < 0 ? [PIT.x0, PIT.z1] : [PIT.x1, PIT.z0], s < 0 ? [PIT.x0, PIT.z0] : [PIT.x1, PIT.z1], RING_Y);
    const u0 = s < 0 ? 22.5 : 0.5; // free span in this face's u (z 552..566)
    relayCabinet(frame, u0 + 2.0, 0, 2.2, 2.2, 61 + s);
    relayCabinet(frame, u0 + 11.0, 0, 2.2, 2.2, 63 + s);
    wallScreen(frame, u0 + 6.5, 1.6, 1.4, 0.8, 2);
    for (const u of [u0 + 0.6, u0 + 4.3, u0 + 8.7, u0 + 12.4]) {
      frame.box("impPaintedMetal", u, 2.6, 0.12, 0.6, 0.2, 0.2, { color: IMP.trim });
      frame.box("emitAmber", u, 2.6, 0.23, 0.5, 0.08, 0.01);
    }
  }
  for (const s of [-1, 1]) {
    const { frame } = wallFrame(kit, s < 0 ? [PIT.x0, PIT.z0] : [PIT.x1, PIT.z1], s < 0 ? [PIT.x1, PIT.z0] : [PIT.x0, PIT.z1], RING_Y);
    for (const u of [6, 14, 26, 34]) {
      frame.box("impPaintedMetal", u, 2.6, 0.12, 0.6, 0.2, 0.2, { color: IMP.trim });
      frame.box("emitAmber", u, 2.6, 0.23, 0.5, 0.08, 0.01);
    }
    frame.quad("impDecal", 20, 3.6, 0.42, 1.6, 1.6, { uvRect: impDecalRect(s < 0 ? 3 : 15) });
  }

  // ---------------------------------------------------------------- stairs (west + east, from the south gallery)
  for (const sx of stairX) {
    const landZ0 = 576.2;
    const landZ1 = 578.2;
    // upper flight: lands on the gallery at z = 588; lower flight: lands on the ring at z ≈ 566.4
    industrialStair(kit, ctx, [sx, landZ1], [0, 1], stairW, y - 7, y);
    industrialStair(kit, ctx, [sx, landZ1 - 2 - 9.8], [0, 1], stairW, RING_Y, y - 7);
    const lx0 = sx - stairW / 2;
    const lx1 = sx + stairW / 2;
    landing(kit, ctx, lx0, landZ0, lx1, landZ1, y - 7, [sx < 0 ? "e" : "w"]);
    // wall brackets under the landing
    const wx = sx < 0 ? PIT.x0 : PIT.x1;
    kit.box("impPaintedMetal", wx + (sx < 0 ? 0.6 : -0.6), y - 7.6, (landZ0 + landZ1) / 2, 1.2, 0.3, 1.6, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", sx, y - 7.9, (landZ0 + landZ1) / 2, stairW, 0.25, 0.25, { color: IMP.trim, texel: 1 });
  }

  // ---------------------------------------------------------------- pit floor (y = -18)
  impFloor(kit, [INNER.x0, INNER.z0, INNER.x1, INNER.z1], PIT_Y, { tone: IMP.wallDark, trim: false, texel: 0.5 });
  // base collar + glow ring
  kit.cyl("impPaintedMetal", CX, PIT_Y + 1.3, CZ, 11.6, 2.6, "y", { color: IMP.wallDark, segments: 48, texel: 0.5 });
  kit.cyl("impMetal", CX, PIT_Y + 2.7, CZ, 11.75, 0.25, "y", { color: IMP.steel, segments: 48 });
  hazardRing(kit, CX, PIT_Y + 2.05, CZ, 11.7, 0.4);
  kit.add("emitBlue", new THREE.TorusGeometry(12.3, 0.1, 6, 64), { pos: [CX, PIT_Y + 0.06, CZ], rot: [Math.PI / 2, 0, 0] });
  kit.add("emitBlue", new THREE.TorusGeometry(10.8, 0.08, 6, 64), { pos: [CX, PIT_Y + 2.65, CZ], rot: [Math.PI / 2, 0, 0] });
  // grate apron around the collar
  for (const [ax0, az0, ax1, az1] of [
    [INNER.x0 + 0.4, INNER.z0 + 0.4, INNER.x1 - 0.4, INNER.z0 + 2.0],
    [INNER.x0 + 0.4, INNER.z1 - 2.0, INNER.x1 - 0.4, INNER.z1 - 0.4],
  ]) {
    const g = new THREE.PlaneGeometry(ax1 - ax0, az1 - az0);
    g.rotateX(-Math.PI / 2);
    kit.add("impGrate", g, { pos: [(ax0 + ax1) / 2, PIT_Y + 0.01, (az0 + az1) / 2], uv: "scale", uvScale: [(ax1 - ax0) / 1.24, (az1 - az0) / 0.9], color: 0xffffff });
  }
  // transformers in the four corners + coolant headers into the collar
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = sx * 13;
      const tz = CZ + sz * 11;
      transformer(kit, [tx, PIT_Y, tz], [3.6, 2.8, 3.4], { yaw: sz < 0 ? 0 : Math.PI, seed: 5 + sx + sz * 2, fins: 8 });
      // header from the transformer top into the collar
      const hy = PIT_Y + 3.6;
      const dir = new THREE.Vector2(-tx, CZ - tz).normalize();
      const end = [CX - dir.x * 11.2, hy - 0.8, CZ - dir.y * 11.2];
      pipeRun(kit, [[tx, PIT_Y + 2.8, tz], [tx, hy, tz], [tx + dir.x * 2.5, hy, tz + dir.y * 2.5], [end[0], end[1] + 0.8, end[2]]], 0.42, { color: IMP.gunmetal, clampPitch: 5 });
      flange(kit, [tx, PIT_Y + 3.0, tz], 0.42, "y");
    }
    // big coolant mains along the x walls: riser from the pit floor up the whole pit to the gallery pumps
    for (const mz of [CZ - 4, CZ + 4]) {
      const wx = sx * (INNER.x1 - 0.7);
      pipeRun(kit, [[CX + sx * 11.4, PIT_Y + 1.2, mz], [wx, PIT_Y + 1.2, mz], [wx, RING_Y - 0.9, mz]], 0.5, { color: IMP.steel, clampPitch: 5 });
      flange(kit, [wx, RING_Y - 0.6, mz], 0.5, "y");
      valve(kit, [CX + sx * 14, PIT_Y + 1.2 + 0.72, mz], 0.3, "y", { stem: 0.35 });
    }
  }
  // sump drains + lighting fixtures on the pit floor
  for (const [dx, dz] of [[-8, 558], [8, 558], [-8, 582], [8, 582]]) {
    kit.box("impPaintedMetal", dx, PIT_Y + 0.02, dz, 1.2, 0.04, 1.2, { color: IMP.trim });
    kit.box("emitBlue", dx, PIT_Y + 0.045, dz, 0.9, 0.01, 0.9);
    kit.box("impMetal", dx, PIT_Y + 0.06, dz, 1.0, 0.03, 0.06, { color: IMP.gunmetal });
    kit.box("impMetal", dx, PIT_Y + 0.06, dz, 0.06, 0.03, 1.0, { color: IMP.gunmetal });
  }

  // ---------------------------------------------------------------- the core
  const coreBot = PIT_Y + 2.6;
  const coreLen = top - coreBot + 2;
  kit.cyl("emitReactor", CX, coreBot + coreLen / 2, CZ, 7.6, coreLen, "y", { segments: 48, uv: "scale", uvScale: [1, coreLen / 4] });
  // cage: 12 vertical ribs + armour rings every 6 m with bolt collars
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rr = 8.5;
    kit.add("impPaintedMetal", new THREE.BoxGeometry(0.7, coreLen - 2, 0.9), { pos: [CX + Math.cos(a) * rr, coreBot + coreLen / 2 - 1, CZ + Math.sin(a) * rr], rot: [0, -a, 0], color: IMP.trim, texel: 1 });
  }
  const boltXf = [];
  for (let ry = coreBot + 2.5; ry < top - 1; ry += 6) {
    kit.cyl("impPaintedMetal", CX, ry, CZ, CORE_R + 0.3, 1.7, "y", { color: IMP.wallDark, segments: 48, texel: 0.5 });
    kit.cyl("impMetal", CX, ry + 0.9, CZ, CORE_R + 0.45, 0.22, "y", { color: IMP.steel, segments: 48 });
    kit.cyl("impMetal", CX, ry - 0.9, CZ, CORE_R + 0.45, 0.22, "y", { color: IMP.steel, segments: 48 });
    kit.cyl("emitBlue", CX, ry, CZ, CORE_R + 0.32, 0.08, "y", { segments: 48 });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + 0.13;
      boltXf.push({ pos: [CX + Math.cos(a) * (CORE_R + 0.42), ry + 0.45, CZ + Math.sin(a) * (CORE_R + 0.42)], rot: [0, -a, 0], color: IMP.gunmetal });
      boltXf.push({ pos: [CX + Math.cos(a) * (CORE_R + 0.42), ry - 0.45, CZ + Math.sin(a) * (CORE_R + 0.42)], rot: [0, -a, 0], color: IMP.gunmetal });
    }
  }
  kit.instanced("impMetal", new THREE.BoxGeometry(0.34, 0.3, 0.34), boltXf, { uv: "world", texel: 1 });
  // slowly turning field rings (own group per ring so each can spin at its own rate)
  const rings = [
    { ry: y - 6, r: 11.9, speed: 0.06 },
    { ry: y + 8, r: 12.3, speed: -0.045 },
    { ry: y + 20, r: 11.9, speed: 0.08 },
  ];
  for (const rg of rings) {
    const g = miniKit(ctx.mats, (k) => {
      k.add("impMetal", new THREE.TorusGeometry(rg.r, 0.36, 10, 72), { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: IMP.gunmetal, uv: "scale", uvScale: [8, 1] });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.add("impPaintedMetal", new THREE.BoxGeometry(1.0, 1.1, 1.3), { pos: [Math.cos(a) * rg.r, 0, Math.sin(a) * rg.r], rot: [0, -a, 0], color: IMP.trim, texel: 1 });
        if (i % 2 === 0) k.add("emitBlue", new THREE.BoxGeometry(0.5, 0.3, 1.5), { pos: [Math.cos(a) * rg.r, 0, Math.sin(a) * rg.r], rot: [0, -a, 0] });
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
        k.add("emitWhite", new THREE.BoxGeometry(2.2, 0.12, 0.12), { pos: [Math.cos(a) * (rg.r + 0.4), 0.3, Math.sin(a) * (rg.r + 0.4)], rot: [0, -a + Math.PI / 2, 0] });
      }
    });
    g.position.set(CX, rg.ry, CZ);
    ctx.add(g);
    ctx.animate((dt) => {
      g.rotation.y += dt * rg.speed;
    });
  }
  // energy arcs: a faint additive sheath (beam material) just outside the glow between rings
  kit.cyl("beam", CX, coreBot + coreLen / 2, CZ, 8.1, coreLen - 4, "y", { segments: 32, open: true });

  // ---------------------------------------------------------------- gallery equipment
  // south gallery: two pairs of control stations facing the core across the pit, chairs behind
  for (const cx of [-8.2, -5.2, 5.2, 8.2]) {
    impConsole(kit, ctx, [cx, y, 591.6], 0, { kind: "wide", width: 2.6, screens: 3, seed: 10 + Math.round(cx), light: false });
    chair(kit, [cx, y, 592.5], 0);
  }
  // north gallery: three coolant pump sets fed from the pit, discharge into the ceiling loop
  for (const px of [-14, 0, 14]) {
    const p = pump(kit, [px, y, 546], -Math.PI / 2, { scale: 1.9, seed: 3 + px });
    // suction: over the kerb and down into the pit to the collar / transformers
    pipeRun(kit, [p.suction, [px, y + 1.15, PIT.z0 + 0.7], [px, PIT_Y + 1.2, PIT.z0 + 0.7], [px, PIT_Y + 1.2, INNER.z0 + 0.6]], 0.42, { color: IMP.gunmetal, clampPitch: 3 });
    kit.collider([px - 0.5, y, 548.3], [px + 0.5, y + 1.6, PIT.z0], "suction");
    // sleeve where the suction passes the service ring
    kit.box("impPaintedMetal", px, RING_Y + 0.4, PIT.z0 + 0.7, 1.3, 0.8, 1.3, { color: IMP.trim, texel: 1 });
    kit.collider([px - 0.65, RING_Y, PIT.z0], [px + 0.65, RING_Y + 0.8, PIT.z0 + 1.35], "sleeve");
    // discharge: up to the coolant loop at y + 15
    pipeRun(kit, [p.discharge, [px, y + 15, 546], [px, y + 15, z0 + 0.8]], 0.36, { color: IMP.steel, clampPitch: 3 });
    valve(kit, [px, y + 4.6, 546], 0.32, "z", { stem: 0.5 });
    floorDecal(kit, px + 2.8, y, 549.5, 0.9, 6);
  }
  // coolant loop: a big header running around all four upper walls
  const lp = 0.8;
  const ly = y + 15;
  pipeRun(kit, [[x0 + lp, ly, z0 + lp], [x1 - lp, ly, z0 + lp], [x1 - lp, ly, z1 - lp], [x0 + lp, ly, z1 - lp], [x0 + lp, ly, z0 + lp]], 0.45, { color: IMP.gunmetal, clampPitch: 8 });
  pipeRun(kit, [[x0 + lp, ly + 1.1, z0 + lp], [x1 - lp, ly + 1.1, z0 + lp], [x1 - lp, ly + 1.1, z1 - lp], [x0 + lp, ly + 1.1, z1 - lp], [x0 + lp, ly + 1.1, z0 + lp]], 0.22, { color: IMP.steel, clampPitch: 8 });
  // east gallery: capacitor bank against the east wall with a busbar header
  for (let i = 0; i < 6; i++) {
    const cz = 557 + i * 5.2;
    kit.cyl("impPaintedMetal", x1 - 2.2, y + 0.2, cz, 1.2, 0.4, "y", { color: IMP.trim, segments: 20 });
    kit.cyl("impMetal", x1 - 2.2, y + 2.2, cz, 1.0, 3.6, "y", { color: IMP.gunmetal, segments: 20 });
    for (const by of [1.2, 2.4, 3.6]) kit.cyl("impPaintedMetal", x1 - 2.2, y + by, cz, 1.06, 0.18, "y", { color: IMP.trim, segments: 20 });
    kit.cyl("impMetal", x1 - 2.2, y + 4.6, cz, 0.16, 1.2, "y", { color: IMP.steel, segments: 8 });
    kit.box("emitAmber", x1 - 3.22, y + 2.0, cz, 0.02, 1.6, 0.14);
    kit.collider([x1 - 3.4, y, cz - 1.2], [x1 - 1.0, y + 4, cz + 1.2], "capacitor");
    floorDecal(kit, x1 - 4.2, y, cz, 0.8, 9, Math.PI / 2);
  }
  pipeRun(kit, [[x1 - 2.2, y + 5.2, 556], [x1 - 2.2, y + 5.2, 583.5]], 0.28, { color: IMP.steel, clampPitch: 5.2 });
  pipeRun(kit, [[x1 - 2.2, y + 5.2, 583.5], [x1 - 2.2, y + 5.2, 586], [x1 - 0.6, y + 5.2, 586]], 0.28, { color: IMP.steel, clamps: false });
  deckMark(kit, x1 - 4.2, y, 570, 2.2, 30, 0, Math.PI / 2);
  // west gallery: low monitoring stations facing the core (kept low so Engineering Control sees over them)
  for (const cz of [563, 570, 577]) {
    impConsole(kit, ctx, [x0 + 8.4, y, cz], -Math.PI / 2, { kind: "wide", width: 2.4, screens: 3, seed: 20 + cz, light: false });
  }
  ladder(kit, x0 + 0.5, 546, y, y + LOWER_H + 1.5, "+x");
  ladder(kit, x1 - 0.5, 594, y, y + LOWER_H + 1.5, "-x");
  // beacons at the pit corners
  const beacons = [];
  for (const [bx, bz] of [[PIT.x0 - 1.2, PIT.z0 - 1.2], [PIT.x1 + 1.2, PIT.z0 - 1.2], [PIT.x0 - 1.2, PIT.z1 + 1.2], [PIT.x1 + 1.2, PIT.z1 + 1.2]]) beacons.push(beacon(kit, ctx, [bx, y, bz]));
  ctx.animate((dt, t) => {
    for (let i = 0; i < beacons.length; i++) beacons[i].dim = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7));
  });
  // overhead crane over the north gallery
  craneRails(kit, z0 + 1, z1 - 1, x0 + 3.2, x1 - 3.2, top - 4.4, "z", { toWall: 2.9, bracketPitch: 12 });
  craneBridge(kit, x1 - x0 - 6.4, top - 4.4 + 0.75, 546, { tx: -9, drop: 6 });
  // wall stencils along the galleries
  for (const [dx, dz] of [[-24, 598], [24, 598], [-12, 542], [12, 542]]) floorDecal(kit, dx, y, dz, 1.4, 0, 0);

  // ---------------------------------------------------------------- lights
  const core = 0x9fc4ff;
  pointLightDesc(ctx, core, 10, 48, [CX - 13, y + 5, CZ], 2);
  pointLightDesc(ctx, core, 10, 48, [CX + 13, y + 5, CZ], 2);
  pointLightDesc(ctx, core, 10, 48, [CX, y + 5, CZ - 13], 2);
  pointLightDesc(ctx, core, 10, 48, [CX, y + 5, CZ + 13], 2);
  pointLightDesc(ctx, core, 7, 32, [CX - 13, PIT_Y + 6, CZ], 1);
  pointLightDesc(ctx, core, 7, 32, [CX + 13, PIT_Y + 6, CZ], 1);
  pointLightDesc(ctx, core, 6, 34, [CX - 13, top - 8, CZ], 0);
  pointLightDesc(ctx, core, 6, 34, [CX + 13, top - 8, CZ], 0);
  const amber = 0xffb35c;
  pointLightDesc(ctx, amber, 5, 16, [0, y + 4.2, 594.5], 1);
  pointLightDesc(ctx, amber, 5, 16, [0, y + 4.2, 546], 1);
  pointLightDesc(ctx, amber, 4.5, 15, [x0 + 5, y + 4.2, CZ], 1);
  pointLightDesc(ctx, amber, 4.5, 15, [x1 - 5, y + 4.2, CZ], 1);
  pointLightDesc(ctx, 0xdfe8ff, 3.5, 9, [CX, y + 3.2, z1 - 2.5], 1);

  // ---------------------------------------------------------------- views
  ctx.view("reactor", CX, y + STD.eye, z1 - 2.2, 0, -4);
  ctx.view("reactor_core", x0 + 6.5, y + STD.eye, CZ + 6, -70, 8);
  ctx.view("reactor_pit", PIT.x0 + 2.0, RING_Y + STD.eye, INNER.z0 + 3, -100, 24);
  ctx.view("reactor_north", 24.5, y + STD.eye, 549.5, 140, -4);
}

// Hazard-striped band wrapped around a cylinder (open tube)
function hazardRing(kit, x, y, z, r, h) {
  kit.add("hazard", new THREE.CylinderGeometry(r + 0.02, r + 0.02, h, 48, 1, true), { pos: [x, y, z], uv: "scale", uvScale: [(2 * Math.PI * r) / 0.6, 1] });
}

// Industrial pit wall: dark slab, horizontal rib bands, vertical ribs, amber rim lights (upper wall)
// or vent grilles + floor-level blue light line (deep wall). frame origin = bottom of the face.
function pitWall(frame, L, h, opts = {}) {
  const { deep = false, seed = 1 } = opts;
  const rand = rng(seed);
  frame.box("impPaintedMetal", L / 2, h / 2, -0.2, L, h, 0.4, { color: IMP.wallDark, texel: 0.5 });
  frame.box("impPaintedMetal", L / 2, h - 0.2, 0.06, L, 0.4, 0.12, { color: IMP.trim, texel: 1 });
  frame.box("impMetal", L / 2, h - 0.42, 0.11, L, 0.03, 0.01, { color: IMP.steel });
  hazardBandFrame(frame, L, h - 0.75, 0.3);
  for (let v = 3.5; v < h - 1.5; v += 3.5) frame.box("impPaintedMetal", L / 2, v, 0.05, L, 0.26, 0.1, { color: IMP.trim, texel: 1 });
  const pitch = 4;
  const n = Math.round(L / pitch);
  for (let i = 0; i <= n; i++) {
    const u = Math.min(Math.max((i / n) * L, 0.2), L - 0.2);
    frame.box("impPaintedMetal", u, h / 2, 0.12, 0.4, h, 0.24, { color: IMP.trim, texel: 1 });
  }
  for (let i = 0; i < n; i++) {
    const cu = ((i + 0.5) / n) * L;
    const bw = L / n - 0.6;
    const r = rand();
    if (deep) {
      // vent grille low down + a panel seam + occasional pipe stub
      frame.box("impPaintedMetal", cu, 1.6, 0.05, bw * 0.7, 1.4, 0.06, { color: IMP.consoleDark, texel: 1 });
      for (let s = 0; s < 4; s++) frame.box("impMetal", cu, 1.0 + s * 0.33, 0.09, bw * 0.7 - 0.2, 0.05, 0.06, { color: IMP.gunmetal, tilt: 0.5 });
      frame.box("emitBlue", cu, 0.35, 0.03, bw * 0.8, 0.05, 0.02);
      if (r < 0.4) {
        frame.cylN("impMetal", cu - bw * 0.25, h - 3.2, 0.3, 0.3, 0.6, { color: IMP.steel, segments: 12 });
        frame.box("impPaintedMetal", cu - bw * 0.25, h - 3.2, 0.62, 0.9, 0.9, 0.08, { color: IMP.trim, texel: 1 });
      } else if (r < 0.7) frame.quad("impDecal", cu, h - 3.5, 0.062, 1.4, 1.4, { uvRect: impDecalRect([2, 9, 10][Math.floor(rand() * 3)]) });
    } else {
      // recessed dark panel field with a horizontal light slit and a stencil, some bays get a pipe pair
      frame.box("impPanel1", cu, h * 0.5, 0.02, bw, h - 3, 0.04, { color: IMP.wallDark, uv: "keep" });
      if (r < 0.35) {
        for (const du of [-0.5, 0.5]) frame.cylV("impMetal", cu + du * bw * 0.5, h * 0.5, 0.25, 0.14, h - 3.4, { color: du < 0 ? IMP.steel : IMP.gunmetal, segments: 10 });
        frame.box("impPaintedMetal", cu, 2.6, 0.25, bw * 0.7, 0.2, 0.5, { color: IMP.trim, texel: 1 });
        frame.box("impPaintedMetal", cu, h - 3.0, 0.25, bw * 0.7, 0.2, 0.5, { color: IMP.trim, texel: 1 });
      } else if (r < 0.6) {
        frame.box("impPaintedMetal", cu, h * 0.45, 0.06, bw * 0.55, 2.2, 0.08, { color: IMP.consoleDark, texel: 1 });
        frame.box("blink", cu, h * 0.45 + 0.4, 0.105, bw * 0.45, 0.8, 0.01, { uv: "keep" });
        frame.box("leds", cu, h * 0.45 - 0.6, 0.105, bw * 0.4, 0.06, 0.01, { uv: "keep" });
      } else frame.quad("impDecal", cu, h * 0.5, 0.045, 1.6, 1.6, { uvRect: impDecalRect([3, 6, 15, 0][Math.floor(rand() * 4)]) });
    }
  }
}

function hazardBandFrame(frame, L, v, h) {
  frame.add("hazard", new THREE.PlaneGeometry(L, h), L / 2, v, 0.125, { uv: "scale", uvScale: [L / 0.6, 1] });
}

// The industrial upper wall above the panelled gallery wall: dark slab, buttresses every 6 m, two
// girder lines with light strips, vent grilles / pipe pairs / status walls in the lower bays,
// recessed panels above, red marker lights along the top.
function upperWall(frame, L, v0, v1, seed) {
  const rand = rng(seed);
  const H = v1 - v0;
  frame.box("impPaintedMetal", L / 2, v0 + H / 2, -0.18, L, H, 0.36, { color: IMP.wallDark, texel: 0.5 });
  const g1 = v0 + 6.4;
  const g2 = v0 + 15.6;
  for (const gv of [g1, g2]) {
    frame.box("impPaintedMetal", L / 2, gv, 0.25, L, 0.6, 0.5, { color: IMP.trim, texel: 1 });
    frame.box("lightBand", L / 2, gv - 0.42, 0.14, L - 0.6, 0.16, 0.02, { uv: "keep" });
  }
  frame.box("impPaintedMetal", L / 2, v1 - 0.35, 0.25, L, 0.7, 0.5, { color: IMP.trim, texel: 1 });
  const pitch = 6;
  const n = Math.max(1, Math.round(L / pitch));
  for (let i = 0; i <= n; i++) {
    const u = Math.min(Math.max((i / n) * L, 0.45), L - 0.45);
    frame.box("impPaintedMetal", u, v0 + H / 2, 0.35, 0.9, H, 0.7, { color: IMP.trim, texel: 1 });
    frame.box("impMetal", u, v0 + H / 2, 0.705, 0.05, H - 1, 0.01, { color: IMP.gunmetal });
  }
  for (let i = 0; i < n; i++) {
    const cu = ((i + 0.5) / n) * L;
    const bw = L / n - 1.1;
    // lower bay (v0 .. g1)
    const r = rand();
    const lc = (v0 + g1 - 0.3) / 2;
    const lh = g1 - 0.3 - v0 - 0.4;
    if (r < 0.3) {
      frame.box("impPaintedMetal", cu, lc, 0.06, bw * 0.8, lh * 0.8, 0.08, { color: IMP.consoleDark, texel: 1 });
      const slats = 5;
      for (let s = 0; s < slats; s++) frame.box("impMetal", cu, lc - lh * 0.34 + (s / (slats - 1)) * lh * 0.68, 0.11, bw * 0.8 - 0.3, 0.07, 0.12, { color: IMP.gunmetal, tilt: 0.5 });
    } else if (r < 0.55) {
      for (const du of [-0.3, 0, 0.3]) frame.cylV("impMetal", cu + du * bw, lc, 0.32, 0.18, lh, { color: du === 0 ? IMP.gunmetal : IMP.steel, segments: 10 });
      frame.box("impPaintedMetal", cu, v0 + 0.7, 0.3, bw * 0.75, 0.24, 0.6, { color: IMP.trim, texel: 1 });
      frame.box("impPaintedMetal", cu, g1 - 0.75, 0.3, bw * 0.75, 0.24, 0.6, { color: IMP.trim, texel: 1 });
    } else if (r < 0.75) {
      frame.box("impPaintedMetal", cu, lc, 0.08, bw * 0.7, lh * 0.7, 0.12, { color: IMP.consoleDark, texel: 1 });
      frame.box("blinkDense", cu, lc + lh * 0.1, 0.145, bw * 0.6, lh * 0.35, 0.01, { uv: "keep" });
      frame.box("screen" + Math.floor(rand() * 3), cu, lc - lh * 0.22, 0.145, bw * 0.5, lh * 0.2, 0.004, { uv: "keep" });
    } else {
      frame.box("impPanel1", cu, lc, 0.03, bw, lh, 0.06, { color: IMP.wallMid, uv: "keep" });
      frame.quad("impDecal", cu, lc, 0.065, Math.min(2.4, bw * 0.6), Math.min(2.4, bw * 0.6), { uvRect: impDecalRect([2, 4, 11, 15][Math.floor(rand() * 4)]) });
    }
    // middle bay (g1 .. g2): recessed panel + a thin vertical light slit
    const mc = (g1 + g2) / 2;
    const mh = g2 - g1 - 1.2;
    frame.box("impPanel", cu, mc, 0.02, bw, mh, 0.04, { color: IMP.wallDark, uv: "keep" });
    frame.box("impPaintedMetal", cu, mc, 0.05, bw * 0.5, mh * 0.8, 0.04, { color: IMP.consoleDark, texel: 1 });
    if (rand() < 0.5) frame.box("emitBlue", cu, mc, 0.08, 0.06, mh * 0.6, 0.01);
    // upper bay (g2 .. cornice): panel with a red marker light
    const uc = (g2 + v1 - 0.7) / 2;
    const uh = v1 - 0.7 - g2 - 1.0;
    frame.box("impPanel1", cu, uc, 0.02, bw, uh, 0.04, { color: IMP.wallDark, uv: "keep" });
    frame.box("impPaintedMetal", cu, uc, 0.05, bw * 0.6, 0.16, 0.06, { color: IMP.trim, texel: 1 });
    frame.box("emitRed", cu, v1 - 1.1, 0.08, 0.3, 0.1, 0.02);
  }
}
