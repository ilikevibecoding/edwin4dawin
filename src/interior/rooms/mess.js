// Mess hall and galley. The hall holds four rows of long tables with bench seating under warm pendants,
// a beverage station, tray return and hand-wash trough along the side walls. A full-height partition
// with an 8 m serving hatch separates the galley: serving counter with food wells, sneeze guard, tray
// rail and a gantry of amber heat lamps, menu screens on the soffit, tray racks at both ends and the
// ration dispenser (interactable). Behind the hatch: ranges under vent hoods, ovens, dispensers, storage
// racks, sink and prep stations, a prep island with a hanging pot rack, drain gratings.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallLightBar, IMPERIAL_STYLES, IMPERIAL_PAINTS } from "../shell.js";
import { panelGrid, pointLight, wallFrame, WALL_T } from "../lib.js";
import { rng } from "../../kit.js";
import { counter, grabRail, wallScreen, stencil, grateStrip, pipeRun, bench, pendant, ceilingFixture, hazardBand, Frosted } from "./crewFwdKit.js";

const PART_X = 20; // galley partition plane
const HATCH = { z0: 493, z1: 501, top: 2.4 };

export function build(kit, ctx, room, lib) {
  const { x0, x1, z0, z1, height: h } = room;
  const shell = roomShell(kit, ctx, room, {
    style: "light",
    lights: false,
    lightMat: "emitWarmSoft",
    lightRows: 2,
    floorColor: PALETTE.impGrey,
    seed: 83,
  });
  const { y0, yTop, frames } = shell;
  const rand = rng(6161);
  const frosted = new Frosted(ctx, { opacity: 0.14, color: 0xc8d8e0, roughness: 0.2 });

  // ------------------------------------------------------------ galley partition with the serving hatch
  const hallFace = wallFrame(kit, [PART_X - WALL_T, z0], [PART_X - WALL_T, z1], y0); // u = z - z0, N = -x
  const galleyFace = wallFrame(kit, [PART_X + WALL_T, z1], [PART_X + WALL_T, z0], y0); // u = z1 - z, N = +x
  const hatchOp = { u0: HATCH.z0 - z0, u1: HATCH.z1 - z0, v0: 0, v1: HATCH.top, type: "door" };
  for (const [wf, seed] of [[hallFace, 91], [galleyFace, 92]]) {
    panelGrid(wf.frame, wf.length, h, { openings: [hatchOp], depth: WALL_T, seed, kick: true, topPipes: false, styles: IMPERIAL_STYLES, paints: IMPERIAL_PAINTS, tag: room.id + "-partition" });
    wf.frame.box("satinBlack", wf.length / 2, h - 0.09, 0.02, wf.length, 0.18, 0.05);
  }
  // hatch jambs and header
  for (const z of [HATCH.z0 - 0.05, HATCH.z1 + 0.05]) kit.box("satinBlack", PART_X, y0 + HATCH.top / 2, z, 0.4, HATCH.top, 0.1);
  kit.box("satinBlack", PART_X, y0 + HATCH.top - 0.05, (HATCH.z0 + HATCH.z1) / 2, 0.4, 0.1, HATCH.z1 - HATCH.z0 + 0.2);
  kit.collider([PART_X - 0.2, y0, HATCH.z0 - 0.1], [PART_X + 0.2, y0 + h, HATCH.z0]);
  kit.collider([PART_X - 0.2, y0, HATCH.z1], [PART_X + 0.2, y0 + h, HATCH.z1 + 0.1]);

  servingCounter(kit, ctx, y0, frosted);
  {
    // hall face: fascia + menu screens over the hatch, dispensers and signage beside it
    const f = hallFace.frame;
    const uc = (HATCH.z0 + HATCH.z1) / 2 - z0;
    f.box("satinBlack", uc, 2.75, 0.03, HATCH.z1 - HATCH.z0 + 0.4, 0.5, 0.06);
    for (const du of [-2.0, 2.0]) {
      f.box("darkGloss", uc + du, 2.75, 0.062, 1.46, 0.44, 0.006);
      f.box("screen6", uc + du, 2.75, 0.066, 1.4, 0.38, 0.004, { uv: "keep" });
    }
    f.box("leds", uc, 2.75, 0.062, 1.2, 0.04, 0.006, { uv: "keep" });
    stencil(f, uc, 2.75, 0.34, 11, 0.064);
    rationDispenser(kit, ctx, f, 5.5, true);
    rationDispenser(kit, ctx, f, 16.5, false);
    waterFountain(f, 3.0);
    stencil(f, 1.2, 1.9, 0.36, 0);
    stencil(f, 20.6, 1.9, 0.36, 14);
    wallLightBar(f, 0.4, 6.4, 2.3, "emitWarmSoft");
    wallLightBar(f, 15.6, 21.6, 2.3, "emitWarmSoft");
    trayRack(kit, 19.25, y0, 492.3);
    trayRack(kit, 19.25, y0, 501.7);
  }
  {
    // galley face: stock shelves, screen, cleaning station
    const f = galleyFace.frame; // u = z1 - z
    shelfUnit(f, 1.0, 6.0, rand);
    wallScreen(f, 17.5, 2.0, 0.9, 0.45, "screen6");
    stencil(f, 16.2, 1.6, 0.3, 6);
    f.box("metalRough", 19.5, 1.15, 0.05, 0.12, 0.5, 0.1, { color: PALETTE.gunmetal });
    f.cylV("painted", 19.5, 1.1, 0.14, 0.075, 0.5, { color: PALETTE.impRed, uv: "keep", segments: 14 });
    f.cylV("metal", 19.5, 1.4, 0.14, 0.03, 0.1, { color: PALETTE.steel, segments: 10 });
    for (let k = 0; k < 4; k++) f.cylV("painted", 20.4 + k * 0.16, 1.05, 0.1, 0.035, 0.22, { color: [PALETTE.tealPaint, PALETTE.orange, PALETTE.creamDark, PALETTE.tealPaint][k], uv: "keep", segments: 10 });
    f.box("metal", 20.65, 0.93, 0.1, 0.8, 0.02, 0.25, { color: PALETTE.steel });
    wallLightBar(f, 0.4, 6.6, 2.3, "emitCoolSoft");
    wallLightBar(f, 15.4, 21.6, 2.3, "emitCoolSoft");
  }

  // ------------------------------------------------------------ hall: tables and benches
  const rows = [489.6, 493.2, 500.8, 504.4];
  const tableX = [6.75, 13.75];
  for (const z of rows) for (const cx of tableX) messTable(kit, cx, y0, z, 5.5, rand);
  for (const z of rows) for (const cx of tableX) for (const dx of [-1.5, 1.5]) pendant(kit, cx + dx, yTop, z, 0.75, 0.3, "emitWarmSoft");
  // light painted runner from the door to the hatch
  kit.boxMM("painted", [x0 + 0.4, y0, 495.7], [PART_X - 0.9, y0 + 0.01, 498.3], { color: PALETTE.impGrey, texel: 1 });
  for (const z of [495.65, 498.35]) kit.box("satinBlack", (x0 + PART_X) / 2 - 0.2, y0 + 0.006, z, PART_X - x0 - 1.2, 0.012, 0.06);

  // ------------------------------------------------------------ hall walls
  {
    const { frame: f } = frames["-z"]; // u = x - x0, hall part 0..17.84
    counter(f, 1.5, 4.5, { h: 0.9, d: 0.6, color: PALETTE.cream, doorW: 0.75, toeGlow: "emitWarm" });
    for (let k = 0; k < 3; k++) {
      const u = 2.0 + k * 1.0;
      f.box("painted", u, 1.2, 0.3, 0.42, 0.56, 0.42, { color: PALETTE.creamDark, uv: "keep" });
      f.box("metalRough", u, 1.2, 0.512, 0.36, 0.5, 0.01, { color: PALETTE.gunmetal });
      f.box("screen2", u, 1.36, 0.518, 0.24, 0.12, 0.004, { uv: "keep" });
      f.cylV("metal", u, 1.08, 0.56, 0.012, 0.12, { color: PALETTE.steel, segments: 8 });
      f.box("darkGloss", u, 0.93, 0.5, 0.3, 0.012, 0.16);
      f.box("emitOrange", u - 0.12, 1.22, 0.518, 0.02, 0.02, 0.004);
    }
    for (let k = 0; k < 5; k++) f.cylV("painted", 4.2 - k * 0.09, 0.98 + k * 0.03, 0.4, 0.045, 0.1, { color: PALETTE.cream, uv: "keep", segments: 10 });
    wallScreen(f, 3.0, 2.0, 1.0, 0.5, "screen6");
    stencil(f, 5.4, 1.8, 0.3, 4);
    ventGrille(f, 8.0, 2.55, 1.6, 0.6);
    ventGrille(f, 14.5, 2.55, 1.6, 0.6);
    // condiment shelf + notice screen
    f.box("metal", 11.0, 1.1, 0.16, 1.4, 0.025, 0.3, { color: PALETTE.steel });
    for (const [du, col, hh] of [[-0.5, PALETTE.tealPaint, 0.18], [-0.3, PALETTE.orange, 0.14], [-0.05, PALETTE.creamDark, 0.2], [0.25, PALETTE.tealPaint, 0.12], [0.5, PALETTE.creamDark, 0.16]]) f.cylV("painted", 11.0 + du, 1.11 + hh / 2, 0.16, 0.05, hh, { color: col, uv: "keep", segments: 10 });
    f.box("metalRough", 11.0, 0.95, 0.06, 1.4, 0.3, 0.1, { color: PALETTE.gunmetal });
    f.box("leds", 11.0, 0.92, 0.101, 0.9, 0.03, 0.006, { uv: "keep" });
    wallScreen(f, 11.0, 1.75, 0.8, 0.45, "screen0");
    wallLightBar(f, 6.2, 9.8, 2.2, "emitWarmSoft");
    wallLightBar(f, 12.8, 16.4, 2.2, "emitWarmSoft");
    stencil(f, 16.8, 1.6, 0.3, 13);
    f.collider(10.2, 11.8, 0.8, 1.4, 0, 0.32, "shelf");
  }
  {
    const { frame: f } = frames["+z"]; // u = x1 - x ; hall part u 6.16..24
    // tray return with a slot into the galley wall, hand-wash trough
    counter(f, 7.0, 9.5, { h: 0.9, d: 0.6, color: PALETTE.cream, doorW: 0.85 });
    f.box("satinBlack", 8.25, 1.3, 0.06, 2.0, 0.55, 0.12);
    f.box("darkGloss", 8.25, 1.22, 0.121, 1.7, 0.3, 0.006);
    f.box("emitOrange", 8.25, 1.5, 0.121, 0.3, 0.03, 0.006);
    stencil(f, 9.6, 1.5, 0.3, 11);
    for (let k = 0; k < 3; k++) f.box("darkGloss", 7.4 + k * 0.5, 0.94, 0.3, 0.4, 0.03, 0.3);
    counter(f, 10.5, 12.7, { h: 0.9, d: 0.55, color: PALETTE.impWhite, doorW: 0.55 });
    f.box("darkGloss", 11.6, 0.94, 0.28, 1.9, 0.012, 0.36);
    for (const u of [11.0, 11.6, 12.2]) {
      f.cylV("metal", u, 1.03, 0.1, 0.014, 0.2, { color: PALETTE.steel, segments: 8 });
      f.cylN("metal", u, 1.13, 0.17, 0.012, 0.16, { color: PALETTE.steel, segments: 8 });
    }
    f.box("satinBlack", 11.6, 1.45, 0.02, 2.2, 0.5, 0.04);
    f.box("emitTeal", 11.6, 1.6, 0.041, 0.6, 0.02, 0.006);
    stencil(f, 11.6, 1.36, 0.22, 12, 0.041);
    ventGrille(f, 16.5, 2.55, 1.6, 0.6);
    wallScreen(f, 15.0, 1.85, 0.8, 0.45, "screen0");
    wallScreen(f, 20.5, 1.85, 0.8, 0.45, "screen6");
    wallLightBar(f, 13.4, 18.4, 2.2, "emitWarmSoft");
    stencil(f, 18.0, 1.6, 0.3, 0);
    grabRail(f, 19.0, 23.4, 1.05);
    wallLightBar(f, 19.2, 23.4, 2.2, "emitWarmSoft");
    bench(kit, 4.8, y0, z1 - 0.32, 3.6, "x");
  }
  {
    const { frame: f, length } = frames["-x"]; // u = z1 - z ; door at u 9.8..12.2
    wallScreen(f, 5.0, 1.9, 0.9, 0.6, "screen4");
    stencil(f, 3.6, 1.8, 0.34, 0);
    for (const u of [6.4, 6.7, 7.0, 7.3, 7.6, 7.9]) f.box("metal", u, 1.75, 0.03, 0.03, 0.06, 0.06, { color: PALETTE.steel });
    for (const [u, col] of [[6.7, PALETTE.fabricTeal], [7.3, PALETTE.fabricCream], [7.9, PALETTE.fabricTeal]]) f.box("fabric", u, 1.42, 0.06, 0.26, 0.6, 0.08, { color: col, uv: "world", texel: 3 });
    wallLightBar(f, 1.0, 9.2, 2.35, "emitWarmSoft");
    wallLightBar(f, 12.8, 21.0, 2.35, "emitWarmSoft");
    wallScreen(f, 14.5, 1.9, 0.9, 0.6, "screen0");
    stencil(f, 16.2, 1.8, 0.34, 1);
    // waste / recycling units by the door
    for (const [u, col, idx] of [[17.6, PALETTE.tealPaint, 12], [18.4, PALETTE.creamDark, 11]]) {
      f.box("painted", u, 0.5, 0.3, 0.6, 1.0, 0.6, { color: col, uv: "keep" });
      f.box("satinBlack", u, 1.02, 0.3, 0.62, 0.04, 0.62);
      f.box("darkGloss", u, 1.03, 0.3, 0.3, 0.02, 0.3);
      stencil(f, u, 0.6, 0.2, idx, 0.602);
      f.collider(u - 0.31, u + 0.31, 0, 1.05, 0, 0.62, "bin");
    }
    void length;
  }

  // ------------------------------------------------------------ galley line along the starboard wall
  galley(kit, ctx, frames["+x"].frame, y0, yTop, h, rand);
  kit.boxMM("deck", [PART_X + WALL_T + 0.05, y0, z0 + 0.2], [x1 - 0.3, y0 + 0.01, z1 - 0.2], { color: PALETTE.impWhite, texel: 1 });
  grateStrip(kit, x1 - 1.15, z0 + 1.0, x1 - 0.85, z1 - 1.0, y0 + 0.008);
  frosted.build("mess-frosted");

  // ------------------------------------------------------------ lights: warm pendants over the tables, amber hatch, cool galley
  // The light pool only realises 14 fixtures at a time, so the hall uses a few strong, long-reach
  // practicals rather than one per pendant.
  for (const z of rows) for (const cx of tableX) ctx.lights.warm.push(pointLight(0xffc48c, 10.0, 14, [cx, yTop - 0.9, z]));
  for (const x of [5.0, 12.0, 17.5]) ctx.lights.warm.push(pointLight(0xffd2a8, 8.0, 12, [x, yTop - 0.6, 497]));
  for (const z of [495.0, 499.0]) ctx.lights.warm.push(pointLight(0xffb060, 5.5, 9, [PART_X - 0.3, y0 + 2.2, z]));
  for (const z of [491, 503]) ctx.lights.cool.push(pointLight(0xe0ecff, 7.5, 12, [23.5, yTop - 0.6, z]));
  ctx.lights.cool.push(pointLight(0xe0ecff, 7.0, 12, [23.5, yTop - 0.6, 497]));
  return shell;
}

// Long mess table with a bench on both sides, pedestal bases, and a scatter of trays and cups.
function messTable(kit, cx, y0, cz, len, rand) {
  kit.box("painted", cx, y0 + 0.745, cz, len, 0.05, 0.8, { color: PALETTE.impGrey, uv: "keep" });
  kit.box("satinBlack", cx, y0 + 0.69, cz, len - 0.1, 0.06, 0.7);
  for (const dx of [-2.2, 0, 2.2]) {
    kit.box("satinBlack", cx + dx, y0 + 0.33, cz, 0.12, 0.66, 0.6);
    kit.box("metal", cx + dx, y0 + 0.02, cz, 0.5, 0.04, 0.72, { color: PALETTE.darkMetal, texel: 2 });
  }
  kit.collider([cx - len / 2, y0, cz - 0.4], [cx + len / 2, y0 + 0.77, cz + 0.4], "table");
  for (const s of [-1, 1]) {
    const bz = cz + s * 0.72;
    kit.box("painted", cx, y0 + 0.425, bz, len, 0.05, 0.36, { color: PALETTE.impGreyDark, uv: "keep" });
    kit.box("satinBlack", cx, y0 + 0.38, bz, len - 0.1, 0.04, 0.3);
    for (const dx of [-2.2, 0, 2.2]) kit.box("satinBlack", cx + dx, y0 + 0.18, bz, 0.1, 0.36, 0.3);
    kit.collider([cx - len / 2, y0, bz - 0.18], [cx + len / 2, y0 + 0.45, bz + 0.18], "bench");
  }
  for (let i = 0; i < 8; i++) {
    if (rand() > 0.35) continue;
    const tx = cx - len / 2 + 0.5 + i * ((len - 1.0) / 7) + (rand() - 0.5) * 0.2;
    const tz = cz + (rand() < 0.5 ? -0.18 : 0.18);
    kit.box("darkGloss", tx, y0 + 0.777, tz, 0.42, 0.014, 0.3);
    kit.cyl("painted", tx + 0.14, y0 + 0.83, tz - 0.08, 0.035, 0.09, "y", { color: rand() < 0.5 ? PALETTE.tealPaint : PALETTE.creamDark, uv: "keep", segments: 10 });
    if (rand() < 0.5) kit.box("painted", tx - 0.08, y0 + 0.8, tz + 0.04, 0.16, 0.03, 0.12, { color: PALETTE.cream, uv: "keep" });
  }
}

// Serving counter set into the hatch: food wells, sneeze guard, tray rail and the heat-lamp gantry.
function servingCounter(kit, ctx, y0, frosted) {
  const xa = PART_X - 0.65;
  const xb = PART_X + 0.65;
  const za = HATCH.z0 + 0.05;
  const zb = HATCH.z1 - 0.05;
  const zc = (za + zb) / 2;
  const len = zb - za;
  kit.boxMM("satinBlack", [xa + 0.05, y0, za + 0.05], [xb - 0.05, y0 + 0.08, zb - 0.05]);
  kit.boxMM("painted", [xa, y0 + 0.08, za], [xb, y0 + 0.86, zb], { color: PALETTE.impWhite, uv: "keep" });
  kit.box("emitWarm", xa + 0.02, y0 + 0.05, zc, 0.006, 0.02, len - 0.4);
  for (let z = za + 0.9; z < zb - 0.3; z += 0.9) kit.box("metal", xa - 0.003, y0 + 0.47, z, 0.012, 0.7, 0.012, { color: PALETTE.darkMetal });
  kit.boxMM("metal", [xa - 0.03, y0 + 0.86, za - 0.03], [xb + 0.03, y0 + 0.92, zb + 0.03], { color: PALETTE.steel, texel: 1.5 });
  for (let i = 0; i < 6; i++) {
    const z = za + 0.75 + i * 1.28;
    kit.box("metal", PART_X + 0.1, y0 + 0.925, z, 0.6, 0.012, 1.0, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("darkGloss", PART_X + 0.1, y0 + 0.932, z, 0.52, 0.012, 0.92);
    if (i % 2 === 0) kit.box("metal", PART_X + 0.1, y0 + 0.94, z, 0.5, 0.02, 0.9, { color: PALETTE.steel, texel: 2 });
  }
  for (const z of [za + 0.4, zb - 0.4]) kit.cyl("painted", PART_X - 0.4, y0 + 0.99, z, 0.05, 0.14, "y", { color: PALETTE.tealPaint, uv: "keep", segments: 10 });
  // sneeze guard on posts
  frosted.box(PART_X - 0.42, y0 + 1.36, zc, 0.016, 0.42, len - 0.5);
  kit.box("metal", PART_X - 0.42, y0 + 1.58, zc, 0.04, 0.03, len - 0.5, { color: PALETTE.steel, texel: 2 });
  for (const z of [za + 0.3, za + len / 3, zb - len / 3, zb - 0.3]) kit.cyl("metal", PART_X - 0.42, y0 + 1.26, z, 0.015, 0.68, "y", { color: PALETTE.steel, segments: 8 });
  // tray rail along the hall side
  kit.cyl("metal", xa - 0.2, y0 + 0.95, zc, 0.02, len - 0.2, "z", { color: PALETTE.steel, segments: 10 });
  kit.cyl("metal", xa - 0.2, y0 + 0.88, zc, 0.02, len - 0.2, "z", { color: PALETTE.steel, segments: 10 });
  for (let z = za + 0.4; z < zb; z += 1.9) kit.box("metal", xa - 0.1, y0 + 0.915, z, 0.2, 0.03, 0.04, { color: PALETTE.gunmetal });
  kit.collider([xa - 0.25, y0, za], [xb + 0.05, y0 + 1.0, zb], "counter");
  // heat-lamp gantry hung from the header
  kit.box("satinBlack", PART_X - 0.1, y0 + 2.12, zc, 0.1, 0.08, len - 0.2);
  for (const z of [za + 0.5, zc, zb - 0.5]) kit.cyl("metal", PART_X - 0.1, y0 + 2.25, z, 0.015, 0.2, "y", { color: PALETTE.darkMetal, segments: 8 });
  for (let i = 0; i < 6; i++) {
    const z = za + 0.75 + i * 1.28;
    kit.cyl("metal", PART_X - 0.1, y0 + 2.04, z, 0.012, 0.08, "y", { color: PALETTE.darkMetal, segments: 8 });
    kit.cyl("paintedMetal", PART_X - 0.1, y0 + 1.93, z, 0.16, 0.16, "y", { color: PALETTE.gunmetal, segments: 20 });
    kit.cyl("emitAmber", PART_X - 0.1, y0 + 1.845, z, 0.13, 0.012, "y", { uv: "keep", segments: 20 });
  }
  // cutlery and napkin station at the hall end of the counter
  kit.box("metal", xa - 0.12, y0 + 1.0, zb - 0.6, 0.24, 0.02, 0.5, { color: PALETTE.steel });
  for (const dz of [-0.15, 0, 0.15]) kit.box("darkGloss", xa - 0.12, y0 + 1.06, zb - 0.6 + dz, 0.16, 0.1, 0.12);
}

// Ration dispenser on the hall face of the partition. The first one is the interactable (separate group).
function rationDispenser(kit, ctx, f, u, interactive) {
  const p = (dv, dn) => f.pos(u, dv, dn);
  const build = (mk) => {
    mk("painted", PALETTE.creamDark, [0.7, 1.3, 0.42], p(1.55, 0.21), "keep");
    mk("metalRough", PALETTE.gunmetal, [0.62, 1.2, 0.02], p(1.55, 0.43), "world");
    mk("painted", PALETTE.orange, [0.7, 0.06, 0.43], p(2.1, 0.215), "keep");
    mk("darkGloss", null, [0.42, 0.26, 0.02], p(1.15, 0.445), "world");
    mk("screen2", null, [0.36, 0.2, 0.006], p(1.72, 0.445), "keep");
    mk("emitOrange", null, [0.3, 0.03, 0.006], p(1.5, 0.445), "world");
    mk("metal", PALETTE.steel, [0.5, 0.02, 0.16], p(0.99, 0.5), "world");
    mk("painted", PALETTE.tealPaint, [0.2, 0.06, 0.12], p(1.03, 0.5), "keep");
  };
  if (interactive && ctx.group) {
    const mat = ctx.materials.painted.clone();
    const g = new THREE.Group();
    g.name = "rationDispenser";
    build((key, col, size, pos, uv) => {
      const geo = new THREE.BoxGeometry(...size);
      const n = geo.attributes.position.count;
      const c = col || new THREE.Color(0xffffff);
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = c.r;
        arr[i * 3 + 1] = c.g;
        arr[i * 3 + 2] = c.b;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
      const m = new THREE.Mesh(geo, key === "painted" ? mat : ctx.materials[key]);
      m.position.copy(pos);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      void uv;
    });
    ctx.group.add(g);
    ctx.interactables.push({
      id: "rationDispenser",
      key: "E",
      label: "Ration dispenser",
      object: g,
      material: mat,
      action: async ({ hud }) => {
        hud.setStatus("Dispensing ration...");
        await new Promise((r) => setTimeout(r, 600));
        hud.setStatus("Ration dispensed.");
      },
    });
  } else {
    build((key, col, size, pos, uv) => kit.box(key, pos.x, pos.y, pos.z, size[0], size[1], size[2], { color: col || 0xffffff, uv }));
  }
  stencil(f, u + 0.22, 0.6, 0.22, 9, 0.003);
  f.collider(u - 0.36, u + 0.36, 0, 2.2, 0, 0.5, "dispenser");
}

function waterFountain(f, u) {
  f.box("satinBlack", u, 0.42, 0.18, 0.5, 0.84, 0.36);
  f.box("metal", u, 0.87, 0.2, 0.5, 0.06, 0.4, { color: PALETTE.steel, texel: 2 });
  f.box("darkGloss", u, 0.902, 0.22, 0.36, 0.006, 0.26);
  f.cylV("metal", u - 0.12, 0.98, 0.1, 0.012, 0.16, { color: PALETTE.steel, segments: 8 });
  f.box("emitTeal", u + 0.15, 0.7, 0.362, 0.03, 0.03, 0.006);
  stencil(f, u, 1.3, 0.22, 4);
  f.collider(u - 0.25, u + 0.25, 0, 0.92, 0, 0.4, "fountain");
}

function trayRack(kit, x, y0, z) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("metal", x + sx * 0.26, y0 + 0.8, z + sz * 0.2, 0.03, 1.5, 0.03, { color: PALETTE.steel });
  for (let i = 0; i < 6; i++) {
    const y = y0 + 0.25 + i * 0.24;
    kit.box("metal", x, y, z, 0.55, 0.015, 0.44, { color: PALETTE.gunmetal, texel: 2 });
    if (i < 5) kit.box("darkGloss", x, y + 0.04, z, 0.42, 0.05, 0.3);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl("rubber", x + sx * 0.22, y0 + 0.05, z + sz * 0.16, 0.05, 0.03, "x", { color: PALETTE.rubber, segments: 10 });
  kit.collider([x - 0.3, y0, z - 0.25], [x + 0.3, y0 + 1.6, z + 0.25], "trayRack");
}

function ventGrille(f, u, v, w, hh) {
  f.box("paintedMetal", u, v, 0.04, w, hh, 0.08, { color: PALETTE.gunmetal, texel: 2 });
  const slats = Math.max(4, Math.floor((hh - 0.12) / 0.07));
  for (let s = 0; s < slats; s++) f.box("metal", u, v - hh / 2 + 0.08 + (s * (hh - 0.16)) / (slats - 1), 0.07, w - 0.16, 0.02, 0.06, { color: PALETTE.steel, tilt: 0.5 });
  f.box("painted", u, v - hh / 2 + 0.03, 0.081, w - 0.1, 0.04, 0.006, { color: PALETTE.orange, uv: "keep" });
}

// Open steel shelving with stacked stock (canisters, boxes) between u0 and u1.
function shelfUnit(f, u0, u1, rand) {
  const len = u1 - u0;
  const uc = (u0 + u1) / 2;
  for (const u of [u0, uc, u1]) f.box("metal", u, 1.05, 0.25, 0.04, 2.1, 0.5, { color: PALETTE.gunmetal, texel: 2 });
  for (const v of [0.3, 0.85, 1.4, 1.95]) {
    f.box("metal", uc, v, 0.25, len, 0.03, 0.5, { color: PALETTE.steel, texel: 2 });
    let u = u0 + 0.1;
    while (u < u1 - 0.25) {
      const r = rand();
      if (r < 0.5) {
        const rad = 0.08 + rand() * 0.07;
        const hh = 0.22 + rand() * 0.2;
        f.cylV("painted", u + rad, v + 0.015 + hh / 2, 0.25, rad, hh, { color: [PALETTE.tealPaint, PALETTE.creamDark, PALETTE.orange, PALETTE.cream][Math.floor(rand() * 4)], uv: "keep", segments: 12 });
        f.cylV("metal", u + rad, v + 0.03 + hh, 0.25, rad * 0.7, 0.03, { color: PALETTE.steel, segments: 12 });
        u += rad * 2 + 0.06;
      } else {
        const w = 0.25 + rand() * 0.25;
        const hh = 0.18 + rand() * 0.22;
        f.box("painted", u + w / 2, v + 0.015 + hh / 2, 0.25, w, hh, 0.4, { color: rand() < 0.5 ? PALETTE.creamDark : PALETTE.tealPaint, uv: "keep" });
        f.box("metal", u + w / 2, v + 0.015 + hh * 0.5, 0.25, w + 0.01, 0.04, 0.41, { color: PALETTE.darkMetal });
        u += w + 0.06;
      }
    }
  }
  f.collider(u0 - 0.02, u1 + 0.02, 0, 2.1, 0, 0.52, "shelving");
}

// Food-prep line along the starboard wall plus the prep island and pot rack.
function galley(kit, ctx, f, y0, yTop, h, rand) {
  // u = z - 486 along the +x wall, N = -x
  // walk-in cooler door
  f.box("metal", 1.6, 1.15, 0.05, 1.3, 2.3, 0.1, { color: PALETTE.steel, texel: 1.5 });
  f.box("metalRough", 1.6, 1.15, 0.11, 1.1, 2.1, 0.02, { color: PALETTE.gunmetal });
  f.cylV("metal", 2.05, 1.1, 0.16, 0.02, 0.5, { color: PALETTE.steel, segments: 8 });
  f.box("emitTeal", 1.3, 1.9, 0.121, 0.16, 0.05, 0.006, { uv: "keep" });
  stencil(f, 1.6, 1.55, 0.3, 9, 0.121);
  f.collider(0.9, 2.3, 0, 2.3, 0, 0.14, "cooler");
  shelfUnit(f, 2.5, 4.5, rand);
  // sink station
  counter(f, 4.7, 6.7, { h: 0.9, d: 0.65, color: PALETTE.creamDark, doorW: 0.65 });
  f.box("darkGloss", 5.7, 0.94, 0.33, 1.7, 0.012, 0.44);
  for (const u of [5.2, 6.2]) {
    f.cylV("metal", u, 1.05, 0.1, 0.014, 0.24, { color: PALETTE.steel, segments: 8 });
    f.cylN("metal", u, 1.17, 0.2, 0.012, 0.22, { color: PALETTE.steel, segments: 8 });
  }
  // two ranges under a vent hood
  for (const uc of [7.5, 8.7]) {
    f.box("satinBlack", uc, 0.45, 0.36, 1.16, 0.9, 0.72);
    f.box("metal", uc, 0.91, 0.36, 1.18, 0.03, 0.74, { color: PALETTE.steel, texel: 2 });
    for (const du of [-0.28, 0.28]) for (const dn of [0.2, 0.52]) f.add("emitOrange", new THREE.TorusGeometry(0.11, 0.014, 8, 24), uc + du, 0.93, dn, { rot: null, uv: "keep" });
    f.box("darkGloss", uc, 0.4, 0.725, 1.0, 0.42, 0.01);
    f.box("metal", uc, 0.66, 0.74, 1.0, 0.03, 0.03, { color: PALETTE.steel });
    for (let k = 0; k < 4; k++) f.cylN("metal", uc - 0.36 + k * 0.24, 0.8, 0.74, 0.025, 0.03, { color: PALETTE.steel, segments: 10 });
    f.box("emitAmber", uc + 0.5, 0.8, 0.726, 0.02, 0.02, 0.004);
    f.collider(uc - 0.6, uc + 0.6, 0, 0.95, 0, 0.75, "range");
  }
  f.box("paintedMetal", 8.1, 2.4, 0.45, 2.7, 0.5, 0.9, { color: PALETTE.gunmetal, texel: 1.5 });
  f.box("metal", 8.1, 2.15, 0.9, 2.5, 0.06, 0.06, { color: PALETTE.steel });
  f.box("emitWarmSoft", 8.1, 2.148, 0.45, 2.4, 0.012, 0.6, { uv: "keep" });
  for (let s = 0; s < 6; s++) f.box("metal", 8.1, 2.22 + s * 0.06, 0.905, 2.2, 0.016, 0.05, { color: PALETTE.steel, tilt: 0.5 });
  f.cylV("metal", 8.1, 2.65 + (h - 2.65) / 2, 0.45, 0.22, h - 2.65, { color: PALETTE.gunmetal, segments: 16 });
  // utensil rail above the ranges
  f.cylU("metal", 8.1, 1.7, 0.12, 0.012, 2.4, { color: PALETTE.steel, segments: 8 });
  for (const du of [-1.0, -0.6, -0.2, 0.3, 0.7, 1.0]) {
    f.box("metal", 8.1 + du, 1.7, 0.12, 0.03, 0.05, 0.02, { color: PALETTE.gunmetal });
    f.cylV("metal", 8.1 + du, 1.53, 0.12, 0.008, 0.3, { color: PALETTE.steel, segments: 6 });
    if (rand() < 0.5) f.add("rubber", new THREE.SphereGeometry(0.04, 10, 8), 8.1 + du, 1.36, 0.12, { color: PALETTE.rubber });
    else f.box("metal", 8.1 + du, 1.36, 0.12, 0.08, 0.05, 0.02, { color: PALETTE.steel });
  }
  // double ovens
  for (const uc of [9.9, 10.9]) {
    f.box("metal", uc, 1.0, 0.36, 0.95, 2.0, 0.72, { color: PALETTE.gunmetal, texel: 1.5 });
    for (const v of [0.55, 1.35]) {
      f.box("darkGloss", uc, v, 0.725, 0.78, 0.5, 0.01);
      f.box("metal", uc, v + 0.3, 0.74, 0.7, 0.03, 0.03, { color: PALETTE.steel });
    }
    f.box("screen2", uc - 0.2, 1.85, 0.726, 0.3, 0.12, 0.004, { uv: "keep" });
    f.box("emitAmber", uc + 0.25, 1.85, 0.726, 0.03, 0.03, 0.004);
    f.collider(uc - 0.5, uc + 0.5, 0, 2.05, 0, 0.75, "oven");
  }
  // dispensers
  for (let k = 0; k < 3; k++) {
    const uc = 11.8 + k * 0.75;
    f.box("painted", uc, 1.0, 0.3, 0.7, 2.0, 0.6, { color: PALETTE.creamDark, uv: "keep" });
    f.box("metalRough", uc, 1.0, 0.605, 0.62, 1.9, 0.01, { color: PALETTE.gunmetal });
    f.box("screen2", uc, 1.62, 0.612, 0.4, 0.22, 0.004, { uv: "keep" });
    f.cylN("metal", uc, 1.15, 0.66, 0.02, 0.1, { color: PALETTE.steel, segments: 8 });
    f.box("darkGloss", uc, 0.88, 0.66, 0.36, 0.02, 0.12);
    f.box("emitOrange", uc - 0.22, 1.35, 0.612, 0.02, 0.02, 0.004);
    f.box("painted", uc, 1.95, 0.612, 0.6, 0.05, 0.006, { color: PALETTE.orange, uv: "keep" });
    stencil(f, uc, 0.5, 0.2, 9, 0.612);
    f.collider(uc - 0.36, uc + 0.36, 0, 2.05, 0, 0.66, "dispenser");
  }
  shelfUnit(f, 14.2, 16.2, rand);
  counter(f, 16.5, 20.5, { h: 0.9, d: 0.7, color: PALETTE.creamDark, doorW: 0.8 });
  for (const [u, col, sz] of [[17.0, PALETTE.creamDark, [0.4, 0.03, 0.3]], [18.6, PALETTE.tealPaint, [0.35, 0.03, 0.25]]]) f.box("painted", u, 0.945, 0.35, sz[0], sz[1], sz[2], { color: col, uv: "keep" });
  f.cylV("metal", 17.8, 1.0, 0.35, 0.16, 0.16, { color: PALETTE.steel, segments: 16 });
  f.cylV("metal", 19.6, 0.98, 0.3, 0.12, 0.12, { color: PALETTE.gunmetal, segments: 14 });
  f.box("darkGloss", 20.0, 0.95, 0.4, 0.42, 0.06, 0.3);
  // waste compactor in the far corner
  f.box("satinBlack", 21.3, 0.6, 0.36, 1.1, 1.2, 0.72);
  hazardBand(f, 20.8, 21.8, 0.9, 0.08, 0.725);
  f.box("darkGloss", 21.3, 0.5, 0.725, 0.6, 0.4, 0.01);
  f.box("emitRed", 21.6, 1.1, 0.725, 0.03, 0.03, 0.004);
  f.collider(20.7, 21.9, 0, 1.25, 0, 0.75, "compactor");
  // wall dressing above the line
  wallScreen(f, 11.0, 2.55, 0.9, 0.45, "screen6");
  wallScreen(f, 18.5, 2.2, 0.8, 0.42, "screen0");
  pipeRun(f, 0.5, 21.5, 3.0, 0.05, { color: PALETTE.steel });
  pipeRun(f, 0.5, 21.5, 2.86, 0.03, { color: PALETTE.orange, clamps: false });
  stencil(f, 5.7, 1.8, 0.3, 12);
  stencil(f, 15.2, 2.5, 0.3, 11);
  wallLightBar(f, 12.6, 16.0, 2.55, "emitCoolSoft");
  wallLightBar(f, 16.6, 20.6, 2.55, "emitCoolSoft");
  // prep island with a hanging pot rack
  const ix = 22.9;
  const iz0 = 494.6;
  const iz1 = 499.4;
  kit.boxMM("painted", [ix - 0.55, y0 + 0.08, iz0], [ix + 0.55, y0 + 0.84, iz1], { color: PALETTE.creamDark, uv: "keep" });
  kit.boxMM("satinBlack", [ix - 0.5, y0, iz0 + 0.05], [ix + 0.5, y0 + 0.08, iz1 - 0.05]);
  kit.boxMM("metal", [ix - 0.62, y0 + 0.84, iz0 - 0.05], [ix + 0.62, y0 + 0.9, iz1 + 0.05], { color: PALETTE.steel, texel: 1.5 });
  for (let z = iz0 + 0.7; z < iz1 - 0.3; z += 0.7) for (const s of [-1, 1]) kit.box("metal", ix + s * 0.545, y0 + 0.46, z, 0.012, 0.6, 0.012, { color: PALETTE.darkMetal });
  kit.cyl("metal", ix - 0.2, y0 + 1.0, iz0 + 1.0, 0.18, 0.2, "y", { color: PALETTE.steel, segments: 16 });
  kit.cyl("metal", ix + 0.2, y0 + 0.97, iz0 + 1.6, 0.13, 0.14, "y", { color: PALETTE.gunmetal, segments: 14 });
  kit.box("painted", ix, y0 + 0.915, iz0 + 2.6, 0.5, 0.03, 0.35, { color: PALETTE.creamDark, uv: "keep" });
  kit.box("painted", ix - 0.1, y0 + 0.915, iz0 + 3.5, 0.4, 0.03, 0.3, { color: PALETTE.tealPaint, uv: "keep" });
  kit.box("darkGloss", ix + 0.2, y0 + 0.95, iz0 + 4.2, 0.42, 0.1, 0.3);
  kit.box("metal", ix, y0 + 0.97, iz0 + 3.3, 0.04, 0.02, 0.5, { color: PALETTE.steel });
  kit.collider([ix - 0.62, y0, iz0 - 0.05], [ix + 0.62, y0 + 0.95, iz1 + 0.05], "island");
  const ry = yTop - 1.0;
  kit.box("metal", ix, ry, (iz0 + iz1) / 2, 0.8, 0.04, iz1 - iz0 - 1.0, { color: PALETTE.gunmetal, texel: 2 });
  kit.box("metal", ix, ry, (iz0 + iz1) / 2, 0.7, 0.05, 0.05, { color: PALETTE.steel });
  for (const z of [iz0 + 0.9, iz1 - 0.9]) for (const s of [-1, 1]) kit.cyl("metal", ix + s * 0.35, ry + 0.5, z, 0.012, 1.0, "y", { color: PALETTE.darkMetal, segments: 8 });
  for (let i = 0; i < 5; i++) {
    const z = iz0 + 0.9 + i * 0.75;
    const s = i % 2 === 0 ? -1 : 1;
    kit.cyl("metal", ix + s * 0.28, ry - 0.2, z, 0.1 + (i % 3) * 0.02, 0.16, "y", { color: i % 2 ? PALETTE.gunmetal : PALETTE.steel, segments: 14 });
    kit.cyl("metal", ix + s * 0.28, ry - 0.06, z, 0.008, 0.12, "y", { color: PALETTE.steel, segments: 6 });
  }
  ceilingFixture(kit, 23.2, yTop, 490.5, 1.6, 0.2, "emitCoolSoft");
  ceilingFixture(kit, 23.2, yTop, 503.5, 1.6, 0.2, "emitCoolSoft");
  void ctx;
}
