// Deck 4 — Cargo & Logistics Bay (d4_cargo). A 45 m high-bay store: four rows of steel racking
// stacked four containers high, a marked main lane from the blast door to a closed loading dock on
// the far wall, loader vehicles, pallet jacks, a dispatcher station with inventory boards, a hoist
// rail with a travelling trolley, hanging work lights and cable trays under a 9 m ceiling.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { Kit, rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { roomShell, impConsole, wallScreen, equipmentRack, crate, pipeRun, wallSegment } from "../imperial.js";
import { wallFrame, pointLight } from "../builders.js";
import { ENG_PAINTS, ENG_CEIL_PAINTS, ENG_STYLES, ENG_THEME, AMBER, COOL, cableTray, wallVent, wallStencil, floorStencil, floorLine, hazardBorder, oilStain, workLight, warningLamp, craneRail, cabinet, shelfFrame, loader, palletJack, emitMat } from "./engProps.js";

export function buildCargo(kit, ctx) {
  const [min, max] = ctx.bounds; // [-48, 0, -64] .. [-2.9, 9, -36]
  const H = max[1];
  const rand = rng(ctx.seed + 23);

  roomShell(kit, ctx, {
    ceiling: { lights: false, paints: ENG_CEIL_PAINTS, panelW: 3.0, rowH: 3.0, along: "x", spacing: 12, styles: { panel: 0.78, greeble: 0.08, vent: 0.14 } },
    walls: { paints: ENG_PAINTS, styles: ENG_STYLES, theme: ENG_THEME, rows: [0, 0.5, 1.7, 3.2, 5.2, 7.2, H], panelW: 2.4 },
  });
  emitMat(ctx, "cargo_lane", 0xffc46a, 0.8, "emitAmber");
  // wall-frame u coordinates (see wallSegment): xmax runs +z from zmin, xmin runs -z from zmax
  const uXmax = (z) => z - min[2];
  const uXmin = (z) => max[2] - z;

  // container without its own collider (the racking frame already blocks the whole row)
  const binCols = [null, null, null, null, PALETTE.hullDark, PALETTE.impAmber.clone().multiplyScalar(0.55), PALETTE.hullGrey, PALETTE.impRed.clone().multiplyScalar(0.45)];
  const bin = (x, y, z, sx, sy, sz, seed, yaw = 0) => {
    const n = kit.colliders.length;
    crate(kit, ctx, { x, y, z, sx, sy, sz, yaw, seed, color: binCols[seed % binCols.length] });
    kit.colliders.length = n;
  };

  // ---------------------------------------------------------------- racking: four rows along x
  const LEVEL_H = 1.7;
  const rack = (x0, z0, x1, z1, seed, { rows = 1, fill = 0.82 } = {}) => {
    const heights = shelfFrame(kit, x0, z0, x1, z1, { levels: 3, levelH: LEVEL_H, color: PALETTE.impAmber });
    const r = rng(seed);
    const depth = (z1 - z0) / rows;
    const ys = [0, ...heights.map((h) => h + 0.01)];
    for (let row = 0; row < rows; row++) {
      const cz = z0 + depth * (row + 0.5);
      for (let li = 0; li < ys.length; li++) {
        let x = x0 + 0.75;
        const yy = ys[li];
        while (x < x1 - 0.7) {
          const wide = r() < 0.22;
          const sx = wide ? 2.2 : 1.05 + r() * 0.25;
          if (x + sx / 2 > x1 - 0.1) break;
          const gapChance = li === ys.length - 1 ? 0.35 : 1 - fill;
          if (r() > gapChance) {
            const sy = li === 0 ? 1.1 + r() * 0.4 : 0.8 + r() * 0.75;
            const sz = Math.min(depth - 0.12, 1.1 + r() * 0.2);
            bin(x + sx / 2, yy, cz, sx, Math.min(sy, LEVEL_H - 0.16), sz, seed + li * 31 + Math.floor(x * 7));
            if (li > 0 && r() < 0.25 && sy < LEVEL_H - 0.75) bin(x + sx / 2, yy + Math.min(sy, LEVEL_H - 0.16), cz, sx * 0.8, 0.45, sz * 0.8, seed + 3 + Math.floor(x * 5));
          }
          x += sx + 0.12;
        }
      }
    }
    // bay numbers along the aisle face and a lit rack label at the end posts
    const nb = Math.round((x1 - x0) / 2.8);
    for (let i = 0; i < nb; i++) floorStencil(kit, x0 + ((i + 0.5) / nb) * (x1 - x0), z1 + 0.55, 0.7, 8 + (i % 4), 0);
  };
  // south side (zmin): single row on the wall, double row in the middle
  rack(-45, -63.5, -11, -62.1, ctx.seed + 1);
  rack(-43, -58.8, -13, -56.0, ctx.seed + 2, { rows: 2 });
  // north side (zmax)
  rack(-43, -44.0, -13, -41.2, ctx.seed + 3, { rows: 2 });
  rack(-45, -37.9, -11, -36.5, ctx.seed + 4);
  // rack-end guards (hazard bumpers) and end-of-row lit labels
  for (const [x, z0, z1] of [
    [-45, -63.5, -62.1],
    [-11, -63.5, -62.1],
    [-43, -58.8, -56.0],
    [-13, -58.8, -56.0],
    [-43, -44.0, -41.2],
    [-13, -44.0, -41.2],
    [-45, -37.9, -36.5],
    [-11, -37.9, -36.5],
  ]) {
    kit.box("hazard", x, 0.2, (z0 + z1) / 2, 0.16, 0.4, z1 - z0 + 0.3, { texel: 3 });
    kit.box("paintedMetal", x, 2.4, (z0 + z1) / 2, 0.06, 0.5, 0.9, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitAmber", x + (x < -20 ? -0.035 : 0.035), 2.4, (z0 + z1) / 2, 0.01, 0.34, 0.7, { uv: "keep" });
  }

  // ---------------------------------------------------------------- floor markings
  const doorZ = -50;
  // main lane: yellow edges, white dashed centre line, running from the door to the dock apron
  const laneX0 = -44;
  const laneX1 = -8;
  floorLine(kit, laneX0, -53, laneX1, -53, { w: 0.16, mat: "cargo_lane" });
  floorLine(kit, laneX0, -47, laneX1, -47, { w: 0.16, mat: "cargo_lane" });
  for (let x = laneX0 + 1; x < laneX1 - 1; x += 3) floorLine(kit, x, doorZ, x + 1.6, doorZ, { w: 0.12, color: PALETTE.impWhite });
  // cross lanes at the door end and the working aisles beside the racks
  floorLine(kit, laneX1, -56, laneX1, -44, { w: 0.16, mat: "cargo_lane" });
  floorLine(kit, laneX0, -56, laneX0, -44, { w: 0.16, mat: "cargo_lane" });
  floorLine(kit, laneX0, -56, laneX1, -56, { w: 0.1, color: PALETTE.impWhite });
  floorLine(kit, laneX0, -44, laneX1, -44, { w: 0.1, color: PALETTE.impWhite });
  // pedestrian walkway hatching along the north side of the lane
  for (let x = laneX0 + 0.5; x < laneX1; x += 1.2) floorLine(kit, x, -46.9, x + 0.7, -46.2, { w: 0.08, color: PALETTE.impWhite });
  // door approach keep-clear box and dock apron
  hazardBorder(kit, max[0] - 5.2, doorZ - 3, max[0] - 0.3, doorZ + 3, 0.25);
  hazardBorder(kit, min[0] + 0.3, -55.5, min[0] + 4.2, -44.5, 0.3);
  for (let i = 0; i < 4; i++) floorStencil(kit, min[0] + 2.2, -54 + i * 2.7, 1.1, 12 + (i % 3), Math.PI / 2);
  floorStencil(kit, max[0] - 3.2, doorZ - 1.6, 1.2, 7, -Math.PI / 2);
  floorStencil(kit, max[0] - 3.2, doorZ + 1.6, 1.2, 15, -Math.PI / 2);
  floorStencil(kit, -26, doorZ, 2.2, 14, Math.PI / 2);
  oilStain(kit, -33, -54.6, 0.8, ctx.seed + 8);
  oilStain(kit, -19, -45.2, 0.6, ctx.seed + 9);

  // ---------------------------------------------------------------- loading dock: closed blast door on the far wall
  {
    const dx = min[0];
    const z0 = -55;
    const z1 = -45;
    const dh = 6.6;
    // jambs, lintel, sill
    for (const [za, zb] of [[z0 - 0.9, z0], [z1, z1 + 0.9]]) {
      kit.boxMM("paintedMetal", [dx, 0, za], [dx + 0.9, dh + 0.8, zb], { color: PALETTE.impDark, texel: 1.5 });
      kit.boxMM("hazard", [dx + 0.9, 0.3, za], [dx + 0.92, dh + 0.2, zb], { texel: 3 });
    }
    kit.boxMM("paintedMetal", [dx, dh, z0 - 0.9], [dx + 0.9, dh + 0.8, z1 + 0.9], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("paintedMetal", [dx, 0, z0], [dx + 0.6, 0.35, z1], { color: PALETTE.impBlack, texel: 2 });
    // two leaves with horizontal ribs and a centre seam
    for (const s of [0, 1]) {
      const la = s ? doorZ + 0.06 : z0;
      const lb = s ? z1 : doorZ - 0.06;
      kit.boxMM("paintedMetal", [dx + 0.2, 0.35, la], [dx + 0.55, dh, lb], { color: PALETTE.impGrey, texel: 1.2 });
      for (let i = 1; i < 5; i++) kit.boxMM("paintedMetal", [dx + 0.55, 0.35 + i * 1.25 - 0.08, la + 0.15], [dx + 0.62, 0.35 + i * 1.25 + 0.08, lb - 0.15], { color: PALETTE.impMid, texel: 2 });
      kit.boxMM("hazard", [dx + 0.55, 0.35, s ? la : lb - 0.24], [dx + 0.58, dh - 0.2, s ? la + 0.24 : lb], { texel: 3 });
      kit.add("decal", new THREE.PlaneGeometry(1.6, 1.6), { pos: [dx + 0.56, 3.6, s ? la + 2.6 : lb - 2.6], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: decalRect(s ? 3 : 4) });
    }
    kit.boxMM("paintedMetal", [dx + 0.2, 0.35, doorZ - 0.08], [dx + 0.6, dh, doorZ + 0.08], { color: PALETTE.impBlack, texel: 2 });
    // door-status lamps and a red band on the lintel, beacons above
    kit.boxMM("emitRed", [dx + 0.9, dh + 0.25, z0 + 0.5], [dx + 0.93, dh + 0.55, z1 - 0.5], { uv: "keep" });
    for (const z of [z0 + 1.5, doorZ, z1 - 1.5]) warningLamp(kit, dx + 0.5, dh + 1.3, z, { r: 0.16 });
    // big vent + supply pipes above the lintel
    wallVent(kit, ctx, "xmin", uXmin(doorZ), dh + 1.55, 5.2, 0.9, { slats: 5 });
    pipeRun(kit, [[dx + 0.5, dh + 2.4, z0 - 4], [dx + 0.5, dh + 2.4, z1 + 4]], 0.14, PALETTE.impMid);
    pipeRun(kit, [[dx + 0.5, dh + 2.4, z0 - 4], [dx + 0.5, H - 0.3, z0 - 4]], 0.14, PALETTE.impMid);
    pipeRun(kit, [[dx + 0.5, dh + 2.4, z1 + 4], [dx + 0.5, H - 0.3, z1 + 4]], 0.14, PALETTE.impMid);
    // dock control pedestal and a status board beside the door
    cabinet(kit, dx + 1.1, z1 + 2.2, { yaw: -Math.PI / 2, w: 1.3, h: 2.0, d: 0.5, seed: ctx.seed + 11, screen: 3 });
    cabinet(kit, dx + 1.1, z0 - 2.2, { yaw: -Math.PI / 2, w: 1.3, h: 2.0, d: 0.5, seed: ctx.seed + 12, screen: 2, lamp: "emitRed" });
    wallScreen(kit, ctx, { side: "xmin", u: uXmin(z1 + 4.5), v: 3.2, w: 2.0, h: 1.1, screen: 3 });
    wallScreen(kit, ctx, { side: "xmin", u: uXmin(z0 - 4.5), v: 3.2, w: 2.0, h: 1.1, screen: 1 });
    kit.collider([dx, 0, z0 - 0.9], [dx + 0.95, dh + 0.8, z1 + 0.9], "dock");
  }

  // ---------------------------------------------------------------- dispatcher station by the entrance (north of the door)
  {
    const sx = -7.5;
    const sz = -42.5;
    // inventory board: three segmented screens on a dark backing on the xmax wall
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    const u = uXmax(sz);
    frame.box("paintedMetal", u, 2.5, 0.05, 6.2, 2.3, 0.1, { color: PALETTE.impBlack, texel: 2 });
    for (let i = 0; i < 3; i++) frame.add("impScreen" + [3, 1, 4][i], new THREE.PlaneGeometry(1.9, 1.05), u + (i - 1) * 2.0, 2.9, 0.11, { uv: "keep" });
    for (let i = 0; i < 3; i++) frame.add("impScreen" + [4, 3, 3][i], new THREE.PlaneGeometry(1.9, 0.62), u + (i - 1) * 2.0, 1.9, 0.11, { uv: "keep" });
    impConsole(kit, ctx, { x: sx, z: sz - 1.1, yaw: -Math.PI / 2, w: 2.0, screens: [1, 3], chair: true, seed: ctx.seed + 5, lampMat: "emitAmber" });
    impConsole(kit, ctx, { x: sx, z: sz + 1.1, yaw: -Math.PI / 2, w: 2.0, screens: [4, 1], chair: true, seed: ctx.seed + 6, lampMat: "emitAmber" });
    floorLine(kit, sx - 2.3, sz - 3, sx - 2.3, sz + 3, { w: 0.1, color: PALETTE.impWhite });
    floorLine(kit, sx - 2.3, sz - 3, max[0] - 0.3, sz - 3, { w: 0.1, color: PALETTE.impWhite });
    floorLine(kit, sx - 2.3, sz + 3, max[0] - 0.3, sz + 3, { w: 0.1, color: PALETTE.impWhite });
    equipmentRack(kit, ctx, { side: "xmax", u: uXmax(-38.2), w: 1.4, h: 2.6, seed: ctx.seed + 7, lit: "emitAmber" });
  }
  // south of the door: manifest terminals, wall screens, weigh station
  wallScreen(kit, ctx, { side: "xmax", u: uXmax(-56.5), v: 2.6, w: 2.2, h: 1.2, screen: 1 });
  wallScreen(kit, ctx, { side: "xmax", u: uXmax(-59.5), v: 2.6, w: 2.2, h: 1.2, screen: 4 });
  equipmentRack(kit, ctx, { side: "xmax", u: uXmax(-62.0), w: 1.4, h: 2.6, seed: ctx.seed + 8, lit: "emitAmber" });
  cabinet(kit, max[0] - 0.55, -55.2, { yaw: -Math.PI / 2, w: 1.2, h: 2.2, d: 0.5, seed: ctx.seed + 13, screen: 2 });
  // weigh station: a recessed scale plate with hazard trim and a readout post
  {
    const wx = -8;
    const wz = -58.5;
    kit.boxMM("metal", [wx - 1.6, 0.001, wz - 1.6], [wx + 1.6, 0.03, wz + 1.6], { color: PALETTE.gunmetal, texel: 1.5 });
    hazardBorder(kit, wx - 1.6, wz - 1.6, wx + 1.6, wz + 1.6, 0.2, 0.031);
    kit.box("paintedMetal", wx + 2.1, 0.7, wz, 0.2, 1.4, 0.2, { color: PALETTE.impDark, texel: 2 });
    kit.box("paintedMetal", wx + 2.1, 1.5, wz, 0.5, 0.36, 0.14, { color: PALETTE.impBlack, texel: 2 });
    kit.add("impScreen4", new THREE.PlaneGeometry(0.42, 0.26), { pos: [wx + 2.03, 1.5, wz], rot: [0, -Math.PI / 2, 0], uv: "keep" });
    kit.collider([wx + 1.95, 0, wz - 0.15], [wx + 2.25, 1.7, wz + 0.15], "scale");
    crate(kit, ctx, { x: wx, z: wz, sx: 1.6, sy: 1.3, sz: 1.4, yaw: 0.2, seed: ctx.seed + 14 });
  }

  // ---------------------------------------------------------------- vehicles, floor stock, jacks
  loader(kit, ctx, -22, -54.6, { yaw: -Math.PI / 2, seed: ctx.seed + 1, carry: (x, y, z, yaw) => crate(kit, ctx, { x, y, z, sx: 1.0, sy: 0.9, sz: 1.0, yaw, seed: ctx.seed + 15 }) });
  loader(kit, ctx, -36, -45.5, { yaw: Math.PI / 2, seed: ctx.seed + 2 });
  loader(kit, ctx, -12.5, -47.9, { yaw: Math.PI, seed: ctx.seed + 3, color: PALETTE.impMid });
  palletJack(kit, -29, -54.9, Math.PI / 2);
  palletJack(kit, -16.5, -45.4, -Math.PI / 2 + 0.3);
  palletJack(kit, -41, -55.0, Math.PI);
  // floor stacks in the working aisles (with colliders: the player can walk into them)
  const stack = (x, z, yaw, n, seed) => {
    let y = 0;
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const s = 1.5 - i * 0.2;
      const sy = 0.8 + r() * 0.4;
      crate(kit, ctx, { x, y, z, sx: s, sy, sz: s, yaw: yaw + (r() - 0.5) * 0.2, seed: seed + i });
      y += sy;
    }
  };
  stack(-31.5, -54.6, 0.1, 3, ctx.seed + 21);
  stack(-33.2, -54.7, -0.2, 2, ctx.seed + 22);
  stack(-26, -45.4, 0.3, 2, ctx.seed + 23);
  stack(-40.5, -45.6, 0, 3, ctx.seed + 24);
  stack(-9.5, -61.8, 0.1, 2, ctx.seed + 25);
  stack(-9.2, -38.5, -0.15, 3, ctx.seed + 26);
  crate(kit, ctx, { x: -18, z: -54.7, sx: 2.6, sy: 1.1, sz: 1.3, yaw: 0.05, seed: ctx.seed + 27 });
  crate(kit, ctx, { x: -11.2, z: -44.6, sx: 1.3, sy: 0.9, sz: 1.3, yaw: -0.4, seed: ctx.seed + 28 });

  // ---------------------------------------------------------------- walls: vents, stencils, screens above the racks, pipes
  for (const side of ["zmin", "zmax"]) {
    const seg = wallSegment(ctx.bounds, side);
    const len = Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]);
    for (let i = 0; i < 4; i++) wallVent(kit, ctx, side, len * ((i + 0.5) / 4), 7.6, 2.4, 1.0, { slats: 6 });
    for (let i = 0; i < 3; i++) wallStencil(kit, ctx, side, len * ((i + 1) / 4) + 2.4, 6.3, 1.0, 8 + i);
    wallScreen(kit, ctx, { side, u: len * 0.5, v: 6.3, w: 2.4, h: 1.2, screen: side === "zmin" ? 3 : 1 });
  }
  wallStencil(kit, ctx, "xmax", 5, 4.6, 1.4, 14);
  wallStencil(kit, ctx, "xmax", 23, 4.6, 1.4, 15);
  for (const z of [-56.4, -43.6]) {
    warningLamp(kit, max[0] - 0.32, 3.6, z, { r: 0.12 });
  }
  pipeRun(kit, [[min[0] + 0.6, H - 0.4, min[2] + 0.5], [max[0] - 0.6, H - 0.4, min[2] + 0.5]], 0.18, PALETTE.impMid);
  pipeRun(kit, [[min[0] + 0.6, H - 0.4, min[2] + 0.95], [max[0] - 0.6, H - 0.4, min[2] + 0.95]], 0.1, PALETTE.impAmber);
  pipeRun(kit, [[min[0] + 0.6, H - 0.4, max[2] - 0.5], [max[0] - 0.6, H - 0.4, max[2] - 0.5]], 0.18, PALETTE.impMid);
  pipeRun(kit, [[min[0] + 0.6, H - 0.4, max[2] - 0.95], [max[0] - 0.6, H - 0.4, max[2] - 0.95]], 0.1, PALETTE.impAmber);

  // ---------------------------------------------------------------- overhead: hoist rails + travelling trolley, trays, high-bay lights
  const ry = H - 1.2;
  craneRail(kit, min[0] + 2.5, max[0] - 6.5, -54.5, ry, { axis: "x", ceil: H });
  craneRail(kit, min[0] + 2.5, max[0] - 6.5, -45.5, ry, { axis: "x", ceil: H });
  const trolley = new THREE.Group();
  const tk = new Kit(ctx.materials);
  tk.box("paintedMetal", 0, ry - 0.55, 0, 1.6, 0.6, 1.1, { color: PALETTE.impDark, texel: 2 });
  tk.box("hazard", 0, ry - 0.9, 0, 1.62, 0.1, 1.12, { texel: 3 });
  tk.box("paintedMetal", 0, ry - 1.1, 0, 0.5, 0.3, 0.5, { color: PALETTE.impDark, texel: 2 });
  tk.box("paintedMetal", 0, ry - 2.7, 0, 0.05, 3.0, 0.05, { color: PALETTE.impBlack, texel: 2 });
  tk.box("paintedMetal", 0, ry - 4.35, 0, 0.4, 0.5, 0.4, { color: PALETTE.impAmber, texel: 2 });
  tk.box("emitAmber", 0, ry - 4.2, 0.21, 0.16, 0.08, 0.01);
  // spreader beam and slung container
  tk.box("metal", 0, ry - 4.75, 0, 1.6, 0.12, 0.12, { color: PALETTE.gunmetal });
  for (const s of [-1, 1]) tk.box("metal", s * 0.7, ry - 5.05, 0, 0.03, 0.5, 0.03, { color: PALETTE.steel });
  crate(tk, ctx, { x: 0, y: ry - 6.35, z: 0, sx: 1.5, sy: 1.05, sz: 1.3, seed: ctx.seed + 29 });
  tk.colliders.length = 0; // the slung container moves; never a collider
  tk.build(trolley);
  ctx.mesh(trolley);
  trolley.position.set(-30, 0, -54.5);
  ctx.anim((dt, t) => {
    trolley.position.x = -26 + Math.sin(t * 0.11) * 12;
  });
  cableTray(kit, [min[0] + 1.5, -60.6], [max[0] - 1.5, -60.6], H - 0.6, { w: 0.6, ceil: H, cables: 5, seed: 3 });
  cableTray(kit, [min[0] + 1.5, -39.4], [max[0] - 1.5, -39.4], H - 0.6, { w: 0.6, ceil: H, cables: 4, seed: 4 });
  cableTray(kit, [-10, min[2] + 1.5], [-10, max[2] - 1.5], H - 0.85, { w: 0.5, ceil: H, cables: 3, seed: 5 });
  // high-bay fixtures over the lanes: long emissive troughs (no real lights) ...
  for (const z of [-58, -50, -42]) {
    for (let x = -42; x < -9; x += 8) {
      kit.box("paintedMetal", x, H - 0.5, z, 3.2, 0.2, 0.5, { color: PALETTE.impDark, texel: 2 });
      kit.box(z === -50 ? "emitWhiteSoft" : "emitAmber", x, H - 0.61, z, 3.0, 0.02, 0.36, { uv: "keep" });
      kit.box("metal", x, H - 0.3, z, 0.06, 0.4, 0.06, { color: PALETTE.steel });
    }
  }
  // ... and the six real lights: hanging work lights along the main lane, amber in the aisles, cool at the dock
  workLight(kit, ctx, -15, 6.2, -50, { ceil: H, color: 0xfff1dc, intensity: 12, distance: 16, w: 1.8, d: 0.55 });
  workLight(kit, ctx, -30, 6.2, -50, { ceil: H, color: 0xfff1dc, intensity: 12, distance: 16, w: 1.8, d: 0.55 });
  workLight(kit, ctx, -24, 6.0, -55, { ceil: H, color: AMBER, intensity: 9, distance: 14, w: 1.4, d: 0.5 });
  workLight(kit, ctx, -30, 6.0, -45, { ceil: H, color: AMBER, intensity: 9, distance: 14, w: 1.4, d: 0.5 });
  ctx.light(pointLight(COOL, 8, 13, [-44, 6.5, -50]));
  ctx.light(pointLight(0xffe2b8, 7, 12, [-7, 5.5, -46]));
  void rand;
}
