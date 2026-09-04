// Crew quarters: enlisted barracks. A central aisle runs from the door to the far wall; on both sides,
// partitions split each wing into two bunk bays. Every bay has two rows of triple-stacked bunks
// (an outer row against the hull wall and an inner row facing the aisle), footlockers and kit lockers
// in the gaps, reading lights per bunk, personal terminals on the partitions and the inner rows' back
// panels, a long bench down the aisle. Lighting is dim and warm-neutral.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallLightBar, IMPERIAL_STYLES, IMPERIAL_PAINTS } from "../shell.js";
import { panelGrid, pointLight, wallFrame, WALL_T } from "../lib.js";
import { rng } from "../../kit.js";
import { locker, lockerRun, footlocker, wallScreen, stencil, ceilingFixture, bench, bedding, pipeRun, decalRect } from "./crewFwdKit.js";

const BUNK_L = 2.0;
const BUNK_D = 0.9;
const STACK_H = 2.35;
const LEVELS = [0.5, 1.2, 1.9]; // platform tops
const X_MID = -14; // partition plane
const AISLE = { z0: 491.4, z1: 496.6 };

export function build(kit, ctx, room, lib) {
  const { x0, x1, z0, z1, height: h } = room;
  const shell = roomShell(kit, ctx, room, {
    style: "light",
    lights: false,
    lightMat: "emitWarmSoft",
    lightRows: 1,
    floorColor: PALETTE.impGreyDark,
    seed: 57,
  });
  const { y0, yTop, frames } = shell;
  const rand = rng(9021);

  // ------------------------------------------------------------ partitions at x = -14 in both wings
  for (const wing of ["north", "south"]) {
    const north = wing === "north";
    const za = north ? z0 : AISLE.z1;
    const zb = north ? AISLE.z0 : z1;
    const east = wallFrame(kit, [X_MID + WALL_T, zb], [X_MID + WALL_T, za], y0);
    const west = wallFrame(kit, [X_MID - WALL_T, za], [X_MID - WALL_T, zb], y0);
    let seed = north ? 61 : 68;
    for (const { frame, length } of [east, west]) {
      panelGrid(frame, length, h, { depth: WALL_T, seed: seed++, kick: true, topPipes: false, styles: IMPERIAL_STYLES, paints: IMPERIAL_PAINTS, tag: room.id + "-partition" });
      frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
    }
    // aisle end: a dark pilaster capping the partition, with a warm strip and the bay number
    const zEnd = north ? AISLE.z0 : AISLE.z1;
    const capZ = north ? zEnd + 0.1 : zEnd - 0.1;
    kit.boxMM("paintedMetal", [X_MID - 0.2, y0, Math.min(zEnd - 0.1, capZ)], [X_MID + 0.2, y0 + h, Math.max(zEnd - 0.1, capZ)], { color: PALETTE.darkMetal, texel: 2 });
    kit.collider([X_MID - 0.2, y0, Math.min(zEnd - 0.1, capZ)], [X_MID + 0.2, y0 + h, Math.max(zEnd - 0.1, capZ)], "pilaster");
    const cap = north ? wallFrame(kit, [X_MID - 0.2, capZ], [X_MID + 0.2, capZ], y0) : wallFrame(kit, [X_MID + 0.2, capZ], [X_MID - 0.2, capZ], y0);
    cap.frame.box("satinBlack", 0.2, 1.6, 0.01, 0.1, 1.3, 0.02);
    cap.frame.box("emitWarm", 0.2, 1.6, 0.022, 0.04, 1.2, 0.006);
    stencil(cap.frame, 0.2, 2.5, 0.26, 14, 0.003);
  }

  // ------------------------------------------------------------ bunk bays
  const bays = [
    { xa: x0, xb: X_MID - WALL_T, north: true },
    { xa: X_MID + WALL_T, xb: x1, north: true },
    { xa: x0, xb: X_MID - WALL_T, north: false },
    { xa: X_MID + WALL_T, xb: x1, north: false },
  ];
  let restBunk = null;
  for (const bay of bays) {
    const wallZ = bay.north ? z0 : z1;
    const dirIn = bay.north ? 1 : -1; // toward the aisle
    const outerZ = wallZ + dirIn * (0.05 + BUNK_D / 2);
    const innerZ = wallZ + dirIn * (0.05 + BUNK_D + 1.55 + BUNK_D / 2);
    const eastBay = bay.xa > X_MID;
    // 1.3 m access gap at the partition end, four stacks with 0.5 m gaps, a kit locker at the far end
    const gapEnd = eastBay ? bay.xa : bay.xb;
    const sgn = eastBay ? 1 : -1;
    const centres = [];
    for (let i = 0; i < 4; i++) centres.push(gapEnd + sgn * (1.3 + BUNK_L / 2 + i * (BUNK_L + 0.5)));
    for (const row of ["outer", "inner"]) {
      const cz = row === "outer" ? outerZ : innerZ;
      const inner = row === "inner";
      centres.forEach((cx, i) => {
        const headSide = (i + (inner ? 1 : 0)) % 2 === 0 ? -1 : 1;
        const wantRest = !restBunk && !bay.north && eastBay && inner && i === 1;
        const made = bunkStack(kit, ctx, cx, y0, cz, dirIn, headSide, inner, rand, wantRest);
        if (made) restBunk = made;
      });
      const backZ = cz - dirIn * (BUNK_D / 2);
      for (let i = 0; i < 3; i++) {
        const gx = (centres[i] + centres[i + 1]) / 2;
        if (i % 2 === 0) kitLocker(kit, gx, y0, backZ, dirIn, rand);
        else footlockerAt(kit, gx, y0, backZ, dirIn, rand);
      }
      kitLocker(kit, gapEnd + sgn * (1.3 + 4 * BUNK_L + 3 * 0.5 + 0.5), y0, backZ, dirIn, rand);
    }
    // aisle-facing lockers on the last stretch of the partition, a terminal above them
    const pzA = innerZ + dirIn * (BUNK_D / 2 + 0.05);
    const pzB = bay.north ? AISLE.z0 - 0.35 : AISLE.z1 + 0.35;
    const lo = Math.min(pzA, pzB);
    const hi = Math.max(pzA, pzB);
    const pf = eastBay ? wallFrame(kit, [X_MID + WALL_T, hi], [X_MID + WALL_T, lo], y0) : wallFrame(kit, [X_MID - WALL_T, lo], [X_MID - WALL_T, hi], y0);
    lockerRun(pf.frame, 0.05, pf.length - 0.05, { w: 0.6, h: 1.9, d: 0.45, decals: [14, null, 0], band: PALETTE.tealPaint });
    wallScreen(pf.frame, pf.length / 2, 2.3, 0.5, 0.3, bay.north ? "screen7" : "screen9");
  }

  // ------------------------------------------------------------ ceiling fixtures: one housing over every practical
  // (walkway pair + lane fixture per bay, four along the aisle); the point lights below sit at the same x/z
  const walkZ = (bay) => (bay.north ? z0 + 0.05 + BUNK_D + 0.775 : z1 - 0.05 - BUNK_D - 0.775);
  const laneZ = (bay) => (bay.north ? AISLE.z0 - 1.0 : AISLE.z1 + 1.0);
  const AISLE_X = [-21.5, -15.5, -9.5, -4];
  for (const bay of bays) {
    const xm = (bay.xa + bay.xb) / 2;
    for (const dx of [-2.8, 2.8]) ceilingFixture(kit, xm + dx, yTop, walkZ(bay), 1.1, 0.18, "emitWarmSoft");
    ceilingFixture(kit, xm, yTop, laneZ(bay), 1.8, 0.22, "emitWarmSoft");
  }
  // the aisle practicals hang under the shell's continuous light channel (lightRows: 1 along the aisle)

  // ------------------------------------------------------------ aisle: benches, end wall, door wall
  bench(kit, -20.5, y0, 494, 6.0, "x");
  bench(kit, -9.5, y0, 494, 6.0, "x");
  for (const bx of [-23, -18, -12, -7]) kit.box("darkGloss", bx, y0 + 0.47, 494 + (rand() - 0.5) * 0.2, 0.28, 0.012, 0.2);
  for (const bx of [-21.2, -8.1]) kit.box("fabric", bx, y0 + 0.51, 494.02, 0.36, 0.12, 0.28, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
  {
    const { frame: f, length } = frames["-x"]; // u = z1 - z ; aisle at u 5.4..10.6
    lockerRun(f, length / 2 - 2.4, length / 2 + 2.4, { w: 0.6, h: 2.0, d: 0.5, decals: [0, null, 14, null], band: PALETTE.tealPaint });
    wallScreen(f, length / 2 - 1.2, 2.45, 0.7, 0.36, "screen7");
    wallScreen(f, length / 2 + 1.2, 2.45, 0.7, 0.36, "screen3");
    wallLightBar(f, length / 2 - 2.5, length / 2 + 2.5, 2.85, "emitWarmSoft");
  }
  {
    const { frame: f } = frames["+x"]; // u = z - z0 ; door at u 7.1..8.9
    wallScreen(f, 5.6, 1.75, 0.7, 0.42, "screen2");
    wallScreen(f, 10.4, 1.75, 0.7, 0.42, "screen9");
    stencil(f, 6.6, 1.7, 0.36, 0);
    stencil(f, 9.4, 1.7, 0.36, 13);
    for (const u of [5.9, 6.2, 6.5, 9.5, 9.8, 10.1]) f.box("metal", u, 2.25, 0.03, 0.03, 0.06, 0.06, { color: PALETTE.steel });
    f.box("fabric", 6.2, 1.95, 0.05, 0.22, 0.55, 0.06, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
    f.box("fabric", 9.8, 1.98, 0.05, 0.2, 0.5, 0.06, { color: PALETTE.fabricCream, uv: "world", texel: 3 });
    wallLightBar(f, 5.5, 6.9, 2.6, "emitWarmSoft");
    wallLightBar(f, 9.1, 10.5, 2.6, "emitWarmSoft");
  }
  kit.boxMM("deck", [x0 + 0.4, y0, 493.2], [x1 - 0.2, y0 + 0.01, 494.8], { color: PALETTE.impGrey, texel: 1 });
  for (const z of [493.15, 494.85]) kit.box("satinBlack", (x0 + x1) / 2, y0 + 0.006, z, x1 - x0 - 0.6, 0.012, 0.06);

  // ------------------------------------------------------------ lights: warm walkways and lanes, warm-neutral aisle
  // Every practical hangs under one of the fixtures above, well below the ceiling plate so it lights
  // the bunks and the deck rather than the ceiling.
  for (const bay of bays) {
    const xm = (bay.xa + bay.xb) / 2;
    for (const dx of [-2.8, 2.8]) ctx.lights.warm.push(pointLight(0xffc48c, 7.5, 11, [xm + dx, yTop - 0.85, walkZ(bay)]));
    ctx.lights.warm.push(pointLight(0xffd2a8, 9.5, 12, [xm, yTop - 0.8, laneZ(bay)]));
  }
  for (const x of AISLE_X) ctx.lights.cool.push(pointLight(0xe9dfd2, 11.0, 15, [x, yTop - 0.75, 494]));

  // ------------------------------------------------------------ the interactable bunk
  if (restBunk) {
    ctx.interactables.push({
      id: "bunk",
      key: "E",
      label: "Rest",
      object: restBunk.object,
      material: restBunk.material,
      action: async ({ hud }) => {
        await hud.fadeIn(600);
        await hud.showFadeText("REST CYCLE", 1200);
        await hud.fadeOut(600);
        hud.setStatus("You rest for a cycle.");
      },
    });
  }
  return shell;
}

// Triple bunk stack centred at (cx, cz), bunks running along x, open side toward openDir (+/-z).
// headSide is -1/+1 along x. Inner-row stacks carry a back panel with a terminal and conduits toward
// the walkway. When `interactive` is set the bottom bunk's bedding becomes separate meshes and the
// function returns { object, material } for the interactable.
function bunkStack(kit, ctx, cx, y0, cz, openDir, headSide, backPanel, rand, interactive) {
  const zOpen = cz + openDir * (BUNK_D / 2);
  const zBack = cz - openDir * (BUNK_D / 2);
  const post = 0.06;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("satinBlack", cx + sx * (BUNK_L / 2 - post / 2), y0 + STACK_H / 2, cz + sz * (BUNK_D / 2 - post / 2), post, STACK_H, post);
  kit.box("satinBlack", cx, y0 + STACK_H - 0.03, cz, BUNK_L, 0.06, BUNK_D);
  let result = null;
  LEVELS.forEach((lv, li) => {
    const yP = y0 + lv;
    kit.box("metal", cx, yP - 0.03, cz, BUNK_L - post * 2, 0.06, BUNK_D - post * 2 + 0.02, { color: PALETTE.gunmetal, texel: 1.5 });
    kit.box("metal", cx, yP - 0.09, zOpen - openDir * 0.04, BUNK_L - post * 2, 0.06, 0.03, { color: PALETTE.darkMetal, texel: 2 });
    // pale mattress, blue blanket draped over the open edge, pillow: the bedding has to read from the aisle
    if (interactive && li === 0 && ctx.group) {
      const mat = ctx.materials.fabric.clone();
      const g = new THREE.Group();
      g.name = "bunk";
      const add = (col, px, py, pz, sx, sy, sz) => {
        const geo = new THREE.BoxGeometry(sx, sy, sz);
        const n = geo.attributes.position.count;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          arr[i * 3] = col.r;
          arr[i * 3 + 1] = col.g;
          arr[i * 3 + 2] = col.b;
        }
        geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(px, py, pz);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
      };
      bedding(kit, cx, yP, cz, BUNK_L, BUNK_D, headSide, openDir, { add });
      ctx.group.add(g);
      result = { object: g, material: mat };
    } else {
      bedding(kit, cx, yP, cz, BUNK_L, BUNK_D, headSide, openDir, { foldedFoot: li === 2 && rand() < 0.5 });
    }
    if (li > 0) {
      kit.cyl("metal", cx - headSide * 0.2, yP + 0.34, zOpen - openDir * 0.03, 0.014, BUNK_L * 0.55, "x", { color: PALETTE.steel, segments: 8 });
      for (const dx of [-0.5, 0.5]) kit.cyl("metal", cx - headSide * 0.2 + dx, yP + 0.17, zOpen - openDir * 0.03, 0.012, 0.34, "y", { color: PALETTE.steel, segments: 8 });
    }
    // reading light + shelf at the head end, on the closed side of the bunk
    const hx = cx + headSide * (BUNK_L / 2 - 0.25);
    kit.box("satinBlack", hx, yP + 0.58, zBack + openDir * 0.05, 0.16, 0.05, 0.09);
    kit.box("emitWarm", hx, yP + 0.552, zBack + openDir * 0.05, 0.12, 0.012, 0.06, { uv: "keep" });
    kit.box("metal", cx + headSide * 0.35, yP + 0.46, zBack + openDir * 0.08, 0.3, 0.02, 0.14, { color: PALETTE.gunmetal });
    if (rand() < 0.5) kit.cyl("painted", cx + headSide * 0.42, yP + 0.52, zBack + openDir * 0.08, 0.035, 0.1, "y", { color: rand() < 0.5 ? PALETTE.tealPaint : PALETTE.creamDark, uv: "keep", segments: 10 });
    else kit.box("darkGloss", cx + headSide * 0.3, yP + 0.48, zBack + openDir * 0.08, 0.14, 0.012, 0.1);
    if (rand() < 0.35 && !(interactive && li === 0)) kit.box("fabric", cx - headSide * 0.6, yP + 0.24, cz + openDir * 0.1, 0.32, 0.08, 0.26, { color: PALETTE.fabricCream, uv: "world", texel: 3 });
  });
  // ladder on the open side at the foot end
  const lx = cx - headSide * (BUNK_L / 2 - 0.2);
  for (const dx of [-0.14, 0.14]) kit.cyl("metal", lx + dx, y0 + 1.05, zOpen + openDir * 0.02, 0.014, 2.0, "y", { color: PALETTE.steel, segments: 8 });
  for (let k = 0; k < 6; k++) kit.cyl("metal", lx, y0 + 0.3 + k * 0.32, zOpen + openDir * 0.02, 0.011, 0.28, "x", { color: PALETTE.steel, segments: 8 });
  // every stack owns a footlocker on the deck at its head end, kit bag dropped on top of some
  const fx = cx + headSide * (BUNK_L / 2 - 0.42);
  const fz = zOpen + openDir * 0.2;
  kit.box("painted", fx, y0 + 0.21, fz, 0.72, 0.42, 0.34, { color: PALETTE.impGreyDark, uv: "keep" });
  kit.box("metal", fx, y0 + 0.36, fz, 0.74, 0.016, 0.36, { color: PALETTE.darkMetal });
  kit.box("metal", fx, y0 + 0.03, fz, 0.74, 0.06, 0.36, { color: PALETTE.darkMetal, texel: 2 });
  for (const s of [-1, 1]) kit.box("metal", fx + s * 0.22, y0 + 0.27, fz + openDir * 0.178, 0.06, 0.1, 0.016, { color: PALETTE.steel });
  kit.add("decal", new THREE.PlaneGeometry(0.16, 0.16), { pos: [fx, y0 + 0.19, fz + openDir * 0.174], rot: [0, openDir > 0 ? 0 : Math.PI, 0], uv: "keep", uvRect: decalRect(14) });
  if (rand() < 0.45) kit.box("fabric", fx + (rand() - 0.5) * 0.2, y0 + 0.5, fz, 0.34, 0.16, 0.26, { color: rand() < 0.5 ? PALETTE.fabricTeal : PALETTE.fabricCream, uv: "world", texel: 3 });
  kit.collider([fx - 0.37, y0, fz - 0.18], [fx + 0.37, y0 + 0.44, fz + 0.18], "footlocker");
  // back panel toward the walkway (inner rows only)
  if (backPanel) {
    const pz = zBack - openDir * 0.025;
    kit.box("painted", cx, y0 + STACK_H / 2, pz, BUNK_L, STACK_H, 0.04, { color: PALETTE.impGrey, uv: "keep" });
    kit.box("satinBlack", cx, y0 + 0.2, pz - openDir * 0.02, BUNK_L, 0.4, 0.02);
    const faceZ = pz - openDir * 0.021;
    const wf = openDir > 0 ? wallFrame(kit, [cx + BUNK_L / 2, faceZ], [cx - BUNK_L / 2, faceZ], y0) : wallFrame(kit, [cx - BUNK_L / 2, faceZ], [cx + BUNK_L / 2, faceZ], y0);
    wallScreen(wf.frame, BUNK_L / 2 + 0.35, 1.5, 0.34, 0.22, ["screen0", "screen9", "screen3", "screen7"][Math.floor(rand() * 4)]);
    stencil(wf.frame, BUNK_L / 2 - 0.5, 1.5, 0.26, 14, 0.003);
    pipeRun(wf.frame, 0.1, BUNK_L - 0.1, 2.15, 0.02, { color: PALETTE.steel });
    wf.frame.box("leds", BUNK_L / 2, 0.9, 0.004, 0.5, 0.03, 0.006, { uv: "keep" });
  }
  kit.collider([cx - BUNK_L / 2, y0, Math.min(zOpen, zBack) - 0.06], [cx + BUNK_L / 2, y0 + STACK_H, Math.max(zOpen, zBack) + 0.06], "bunk");
  return result;
}

// Tall personal kit locker standing in a gap between two stacks, back against the closed side.
function kitLocker(kit, gx, y0, backZ, openDir, rand) {
  const f = openDir > 0 ? wallFrame(kit, [gx - 0.25, backZ], [gx + 0.25, backZ], y0) : wallFrame(kit, [gx + 0.25, backZ], [gx - 0.25, backZ], y0);
  locker(f.frame, 0.25, { w: 0.46, h: 1.9, d: 0.45, decal: rand() < 0.5 ? 14 : null, band: PALETTE.tealPaint, tag: "kitLocker" });
  if (rand() < 0.6) for (const dx of [-0.07, 0.07]) kit.box("rubber", gx + dx, y0 + 0.12, backZ + openDir * 0.62, 0.1, 0.24, 0.28, { color: PALETTE.rubber });
}

// Footlocker in a gap, with a duffel dropped on top of it.
function footlockerAt(kit, gx, y0, backZ, openDir, rand) {
  const f = openDir > 0 ? wallFrame(kit, [gx - 0.25, backZ], [gx + 0.25, backZ], y0) : wallFrame(kit, [gx + 0.25, backZ], [gx - 0.25, backZ], y0);
  footlocker(f.frame, 0.25, { w: 0.48, h: 0.42, d: 0.45, decal: 14 });
  if (rand() < 0.7) kit.box("fabric", gx, y0 + 0.52, backZ + openDir * 0.24, 0.38, 0.18, 0.3, { color: rand() < 0.5 ? PALETTE.fabricTeal : PALETTE.fabricCream, uv: "world", texel: 3 });
}
