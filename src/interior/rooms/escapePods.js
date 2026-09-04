// Escape pod bay: six round pod hatches set into the forward slab face with heavy frames, hazard
// stripes and status lamps, a pod-launch console between the two centre hatches, small portholes
// beside every pod, glowing evacuation chevrons on the deck, grab rails and emergency supply lockers.
// Lit low and amber with one red beacon: this is the one room on the deck that should feel like an alarm.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallLightBar, IMPERIAL_STYLES, IMPERIAL_PAINTS } from "../shell.js";
import { panelGrid, pointLight, wallFrame, WALL_T } from "../lib.js";
import { rng } from "../../kit.js";
import { locker, lockerRun, grabRail, wallScreen, stencil, hazardBand, HAZARD_YELLOW, floorChevron, ceilingFixture, pipeRun } from "./crewFwdKit.js";

const HATCH_U = [3, 6.6, 10.2, 13.8, 17.4, 21]; // centres along the forward wall (u = x + 12)
const HATCH_HALF = 1.0;
const HATCH_TOP = 2.75;
const DOOR_V = 1.4; // centre height of the round door
const DOOR_R = 0.78;
// The exterior tower's forward face plate (hull.js, 1.2 m thick from z 470) ends at z 471.2, i.e. 0.2 m
// inside this room, and it is drawn while the player is in here (the room lists a forward window).
// The hatch wall is therefore built on its own plane just proud of that face so nothing is buried in hull.
const FWD = 0.28;

export function build(kit, ctx, room, lib) {
  const { x0, x1, z0, z1, height: h } = room;
  const shell = roomShell(kit, ctx, room, {
    style: "light",
    skipWalls: ["-z"],
    lights: false,
    lightMat: "emitWarmSoft",
    lightRows: 1,
    floorColor: PALETTE.impGreyDark,
    seed: 31,
  });
  const { y0, yTop, frames } = shell;
  const rand = rng(1207);
  const zf = z0 + FWD;

  // ------------------------------------------------------------ forward wall: hatch bays + portholes
  {
    const { frame: f, length } = wallFrame(kit, [x0, zf], [x1, zf], y0);
    const openings = HATCH_U.map((u) => ({ u0: u - HATCH_HALF, u1: u + HATCH_HALF, v0: 0, v1: HATCH_TOP, type: "hatch" }));
    // one small porthole in every gap beside a pod (the centre gap carries the launch console)
    const gaps = [[0, 2], [4, 5.6], [7.6, 9.2], [14.8, 16.4], [18.4, 20], [22, 24]];
    for (const [a, b] of gaps) openings.push({ u0: a, u1: b, v0: 1.55, v1: 2.35, type: "porthole", r: 0.26 });
    panelGrid(f, length, h, { openings, depth: WALL_T, seed: 41, kick: true, topPipes: false, styles: IMPERIAL_STYLES, paints: IMPERIAL_PAINTS, tag: room.id + "-z" });
    f.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
    // blast shutters closed behind the porthole glass (there is only hull behind this wall), with a
    // status lamp on each shutter ring
    for (const [a, b] of gaps) {
      f.cylN("satinBlack", (a + b) / 2, 1.95, -0.14, 0.25, 0.02, { segments: 32 });
      f.box("emitAmber", (a + b) / 2, 1.95 + 0.3, 0.032, 0.05, 0.016, 0.006);
    }
    HATCH_U.forEach((u, i) => podHatch(kit, f, u, i, y0, zf, x0, rand));
    launchConsole(f, 12);
    // grab bar under every porthole cell so the gaps between pods have something to hold
    for (const [a, b] of gaps) grabRail(f, a + 0.2, b - 0.2, 1.0);
    for (const [a, b] of gaps) stencil(f, (a + b) / 2, 0.9 + 0.35, 0.22, 10, 0.003);
  }

  // ------------------------------------------------------------ aft wall (door wall): lockers, rails, signage
  {
    const { frame: f } = frames["+z"]; // u = x1 - x, door at u 11..13
    lockerRun(f, 1.6, 5.2, { w: 0.6, h: 2.0, d: 0.45, decals: [4, 13, 4, 13, 4], band: PALETTE.orange });
    lockerRun(f, 18.8, 22.4, { w: 0.6, h: 2.0, d: 0.45, decals: [13, 4, 13, 4, 13], band: PALETTE.orange });
    grabRail(f, 5.5, 10.3, 1.0);
    grabRail(f, 13.7, 18.5, 1.0);
    wallLightBar(f, 1.2, 10.4, 2.5, "emitAmber");
    wallLightBar(f, 13.6, 22.8, 2.5, "emitAmber");
    for (const u of [10.72, 13.28]) f.box("hazard", u, 1.15, 0.004, 0.12, 2.3, 0.006, { color: HAZARD_YELLOW, texel: 1 });
    stencil(f, 10.2, 1.85, 0.42, 1);
    stencil(f, 13.8, 1.85, 0.42, 13);
    wallScreen(f, 7.6, 1.7, 0.46, 0.28, "screen5");
    wallScreen(f, 16.4, 1.7, 0.46, 0.28, "screen0");
    extinguisher(f, 6.3);
    extinguisher(f, 17.7);
    pipeRun(f, 0.4, 23.6, 2.88, 0.045, { color: PALETTE.steel });
    pipeRun(f, 0.4, 23.6, 2.76, 0.028, { color: PALETTE.orange, clamps: false });
  }

  // ------------------------------------------------------------ side walls
  for (const dir of ["-x", "+x"]) {
    const { frame: f, length } = frames[dir]; // 7 m; u runs aft -> forward on -x, forward -> aft on +x
    const aftEnd = dir === "-x" ? 0 : length; // where the door wall is
    const sgn = dir === "-x" ? 1 : -1; // direction from the aft end toward the forward wall
    const at = (t) => aftEnd + sgn * t;
    // supply lockers near the aft corner, rail + kit along the rest
    lockerRun(f, Math.min(at(0.5), at(2.6)), Math.max(at(0.5), at(2.6)), { w: 0.7, h: 2.0, d: 0.45, decals: [4, 13, 4], band: PALETTE.orange });
    grabRail(f, Math.min(at(3.0), at(6.6)), Math.max(at(3.0), at(6.6)), 1.0);
    wallLightBar(f, 0.5, length - 0.5, 2.5, "emitAmber");
    if (dir === "-x") {
      medkit(f, at(3.7));
      wallScreen(f, at(5.4), 1.7, 0.42, 0.28, "screen0");
      maskDispenser(f, at(5.4), 1.2);
    } else {
      commPanel(f, at(3.7));
      wallScreen(f, at(5.4), 1.7, 0.42, 0.28, "screen6");
      maskDispenser(f, at(5.4), 1.2);
    }
    stencil(f, at(6.4), 2.1, 0.3, dir === "-x" ? 0 : 14);
  }

  // ------------------------------------------------------------ deck: evacuation route
  const zLat = 474.0;
  kit.boxMM("deck", [-1.3, y0, z0 + 2.2], [1.3, y0 + 0.01, z1 - 0.2], { color: PALETTE.impGrey, texel: 1 });
  kit.boxMM("deck", [-9.9, y0, zLat - 0.65], [9.9, y0 + 0.01, zLat + 0.65], { color: PALETTE.impGrey, texel: 1 });
  for (const s of [-1, 1]) kit.box("emitAmber", 0, y0 + 0.014, zLat + s * 0.62, 19.8, 0.006, 0.03, { uv: "keep" });
  for (const s of [-1, 1]) kit.box("emitAmber", s * 1.27, y0 + 0.014, (z0 + 2.85 + z1 - 0.2) / 2, 0.03, 0.006, z1 - 0.2 - (z0 + 2.85), { uv: "keep" });
  for (const z of [477.3, 476.5, 475.7, 474.9]) floorChevron(kit, "emitAmber", 0, y0 + 0.016, z, 0, 0.36, 0.09);
  for (const s of [-1, 1]) for (const x of [1.9, 3.5, 5.1, 6.7, 8.3]) floorChevron(kit, "emitAmber", s * x, y0 + 0.016, zLat, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0.3, 0.08);
  for (const u of HATCH_U) {
    const x = x0 + u;
    floorChevron(kit, "emitAmber", x, y0 + 0.016, 473.1, 0, 0.3, 0.08);
    floorChevron(kit, "emitAmber", x, y0 + 0.016, 472.4, 0, 0.3, 0.08);
  }

  // ------------------------------------------------------------ ceiling: amber downlights over the hatches, red beacons
  for (const u of HATCH_U) ceilingFixture(kit, x0 + u, yTop, zf + 0.9, 0.9, 0.18, "emitAmber");
  for (const x of [-6, 6]) {
    kit.cyl("satinBlack", x, yTop - 0.035, 476.3, 0.16, 0.07, "y", { segments: 20 });
    kit.cyl("emitRed", x, yTop - 0.11, 476.3, 0.1, 0.1, "y", { segments: 16 });
  }

  // ------------------------------------------------------------ lights: amber wash with a red beacon and a little cool fill
  for (const x of [-9, -5.4, -1.8, 1.8, 5.4, 9]) ctx.lights.warm.push(pointLight(0xffb060, 5.5, 9, [x, yTop - 0.5, zf + 1.3]));
  ctx.lights.warm.push(pointLight(0xff3a2a, 3.6, 9, [0, yTop - 0.45, 476.3]));
  for (const x of [-6, 6]) ctx.lights.cool.push(pointLight(0xdfe8ff, 4.0, 9, [x, yTop - 0.5, 476.4]));
  void frames;
  return shell;
}

// One pod hatch: recessed cast bay plate, heavy bolted frame, hazard strips, round door with rim,
// viewport, lock dogs, hinges and lever, status lamps above, release plate below, threshold on the deck.
function podHatch(kit, f, u, idx, y0, z0, x0, rand) {
  const fw = 0.16;
  f.box("metal", u, HATCH_TOP / 2, -0.11, HATCH_HALF * 2, HATCH_TOP, 0.1, { color: PALETTE.darkMetal, texel: 1.2 });
  f.box("metalRough", u, HATCH_TOP / 2, -0.035, HATCH_HALF * 2 - 0.04, HATCH_TOP - 0.04, 0.07, { color: PALETTE.gunmetal, texel: 1 });
  for (const s of [-1, 1]) f.box("paintedMetal", u + s * (HATCH_HALF - fw / 2), HATCH_TOP / 2, 0.06, fw, HATCH_TOP, 0.12, { color: PALETTE.darkMetal, texel: 2 });
  f.box("paintedMetal", u, HATCH_TOP - fw / 2, 0.06, HATCH_HALF * 2, fw, 0.12, { color: PALETTE.darkMetal, texel: 2 });
  f.box("paintedMetal", u, fw / 2, 0.06, HATCH_HALF * 2, fw, 0.12, { color: PALETTE.darkMetal, texel: 2 });
  for (const v of [0.4, 1.0, 1.8, 2.4]) for (const s of [-1, 1]) f.cylN("metal", u + s * (HATCH_HALF - fw / 2), v, 0.125, 0.018, 0.02, { color: PALETTE.steel, segments: 8 });
  for (const s of [-1, 1]) f.box("hazard", u + s * 0.78, 1.45, 0.004, 0.1, 2.3, 0.006, { color: HAZARD_YELLOW, texel: 1 });
  // the door itself
  f.cylN("painted1", u, DOOR_V, 0.06, DOOR_R, 0.12, { color: PALETTE.impGrey, segments: 40, uv: "world", texel: 1 });
  f.add("metalRough", new THREE.TorusGeometry(DOOR_R + 0.02, 0.05, 10, 48), u, DOOR_V, 0.1, { color: PALETTE.gunmetal, uv: "scale", uvScale: [4, 1] });
  f.add("painted", new THREE.TorusGeometry(0.64, 0.018, 8, 48), u, DOOR_V, 0.125, { color: PALETTE.orange, uv: "scale", uvScale: [4, 1] });
  f.cylN("darkGloss", u, DOOR_V + 0.12, 0.124, 0.19, 0.012, { segments: 32 });
  f.add("metal", new THREE.TorusGeometry(0.2, 0.022, 8, 32), u, DOOR_V + 0.12, 0.13, { color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
  f.box("emitAmber", u - 0.21, DOOR_V + 0.02, 0.126, 0.02, 0.05, 0.006);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    f.box("metal", u + 0.88 * Math.cos(a), DOOR_V + 0.88 * Math.sin(a), 0.11, 0.12, 0.06, 0.06, { color: PALETTE.steel, spin: a });
  }
  for (const dv of [-0.42, 0.42]) f.box("metalRough", u - 0.9, DOOR_V + dv, 0.1, 0.1, 0.24, 0.18, { color: PALETTE.darkMetal });
  f.cylN("metal", u + 0.45, DOOR_V - 0.2, 0.15, 0.055, 0.06, { color: PALETTE.steel, segments: 12 });
  f.cylV("metal", u + 0.45, DOOR_V + 0.0, 0.19, 0.016, 0.4, { color: PALETTE.steel, segments: 8 });
  f.box("rubber", u + 0.45, DOOR_V + 0.2, 0.19, 0.04, 0.09, 0.04, { color: PALETTE.rubber });
  stencil(f, u, DOOR_V - 0.44, 0.34, 8, 0.121);
  stencil(f, u - 0.62, 2.5, 0.3, [2, 14, 0][idx % 3], 0.002);
  // status lamps above the door
  f.box("satinBlack", u, 2.52, 0.07, 0.6, 0.16, 0.14);
  f.box("emitAmber", u, 2.52, 0.141, 0.46, 0.07, 0.01, { uv: "keep" });
  f.cylN("emitRed", u + 0.5, 2.52, 0.02, 0.035, 0.04, { segments: 12 });
  // release plate under the door
  f.box("painted", u, 0.36, 0.015, 0.5, 0.24, 0.03, { color: PALETTE.creamDark, uv: "keep" });
  stencil(f, u - 0.1, 0.36, 0.2, 13, 0.031);
  f.box("emitTeal", u + 0.18, 0.42, 0.031, 0.02, 0.02, 0.006);
  f.box("emitOrange", u + 0.18, 0.3, 0.031, 0.02, 0.02, 0.006);
  f.cylU("metal", u, 0.2, 0.06, 0.012, 0.22, { color: PALETTE.steel, segments: 8 });
  f.collider(u - HATCH_HALF, u + HATCH_HALF, 0, HATCH_TOP, 0, 0.24, "hatch");
  // threshold + hazard strip on the deck
  const x = x0 + u;
  kit.box("metal", x, y0 + 0.008, z0 + 0.15, HATCH_HALF * 2, 0.016, 0.3, { color: PALETTE.steel, texel: 2 });
  kit.box("hazard", x, y0 + 0.006, z0 + 0.42, HATCH_HALF * 2, 0.012, 0.18, { color: HAZARD_YELLOW, texel: 1 });
}

// Pod-launch console in the centre gap: slanted desk with a status display, six pod lamps and a covered
// launch button, plus a wall board above with the alert screen and the release lamps.
function launchConsole(f, u) {
  const t = 0.5;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const S = { v: 0.98, n: 0.32 };
  const on = (dx, dy, dz) => [u + dx, S.v + dy * ct - dz * st, S.n + dy * st + dz * ct];
  f.box("satinBlack", u, 0.42, 0.28, 1.3, 0.84, 0.56);
  f.box("metal", u, 0.04, 0.26, 1.2, 0.08, 0.5, { color: PALETTE.darkMetal, texel: 2 });
  f.box("leds", u, 0.12, 0.562, 0.9, 0.03, 0.006, { uv: "keep" });
  f.box("satinBlack", ...on(0, 0, 0), 1.3, 0.04, 0.6, { tilt: t });
  f.box("screen6", ...on(-0.3, 0.024, -0.06), 0.56, 0.006, 0.3, { uv: "keep", tilt: t });
  for (let i = 0; i < 6; i++) {
    f.box("metal", ...on(0.12 + i * 0.09, 0.03, -0.17), 0.075, 0.02, 0.075, { color: PALETTE.steel, tilt: t });
    f.box(i === 2 ? "emitRed" : "emitAmber", ...on(0.12 + i * 0.09, 0.045, -0.17), 0.055, 0.012, 0.055, { tilt: t });
  }
  f.box("satinBlack", ...on(0.36, 0.035, 0.1), 0.2, 0.03, 0.2, { tilt: t });
  f.box("emitRed", ...on(0.36, 0.07, 0.1), 0.12, 0.05, 0.12, { tilt: t });
  f.box("metal", ...on(0.1, 0.03, 0.1), 0.06, 0.03, 0.06, { color: PALETTE.steel, tilt: t });
  f.box("rubber", ...on(0.1, 0.055, 0.1), 0.02, 0.03, 0.05, { color: PALETTE.rubber, tilt: t });
  f.box("leds", ...on(-0.3, 0.024, 0.19), 0.5, 0.006, 0.03, { uv: "keep", tilt: t });
  f.collider(u - 0.65, u + 0.65, 0, 1.15, 0, 0.62, "console");
  // wall board
  f.box("satinBlack", u, 1.95, 0.03, 1.5, 1.0, 0.06);
  f.box("screen5", u - 0.35, 2.12, 0.065, 0.62, 0.34, 0.006, { uv: "keep" });
  for (let i = 0; i < 6; i++) {
    const lu = u - 0.45 + i * 0.18;
    f.box("metal", lu, 1.66, 0.066, 0.14, 0.14, 0.012, { color: PALETTE.steel });
    f.box(i === 2 ? "emitRed" : "emitAmber", lu, 1.66, 0.074, 0.1, 0.1, 0.006);
  }
  stencil(f, u + 0.42, 2.14, 0.3, 13, 0.062);
  f.cylN("metal", u + 0.42, 1.86, 0.075, 0.04, 0.03, { color: PALETTE.steel, segments: 12 });
  f.box("leds", u, 1.52, 0.062, 1.0, 0.03, 0.006, { uv: "keep" });
  f.box("satinBlack", u, 2.5, 0.05, 0.4, 0.1, 0.1);
  f.box("emitRed", u, 2.5, 0.101, 0.3, 0.05, 0.006);
}

function extinguisher(f, u) {
  f.box("metalRough", u, 1.15, 0.05, 0.12, 0.5, 0.1, { color: PALETTE.gunmetal });
  f.cylV("painted", u, 1.1, 0.14, 0.075, 0.5, { color: PALETTE.impRed, uv: "keep", segments: 14 });
  f.cylV("metal", u, 1.4, 0.14, 0.03, 0.1, { color: PALETTE.steel, segments: 10 });
  f.box("metal", u + 0.05, 1.46, 0.14, 0.12, 0.03, 0.03, { color: PALETTE.darkMetal });
  stencil(f, u, 1.62, 0.16, 5, 0.003);
}

function medkit(f, u) {
  f.box("paintedMetal", u, 1.55, 0.08, 0.54, 0.68, 0.16, { color: PALETTE.darkMetal, texel: 2 });
  f.box("painted", u, 1.55, 0.168, 0.48, 0.62, 0.015, { color: PALETTE.cream, uv: "keep" });
  f.box("painted", u, 1.55, 0.178, 0.3, 0.07, 0.008, { color: PALETTE.orange, uv: "keep" });
  f.box("painted", u, 1.55, 0.178, 0.07, 0.3, 0.008, { color: PALETTE.orange, uv: "keep" });
  f.box("metal", u + 0.2, 1.55, 0.185, 0.03, 0.12, 0.02, { color: PALETTE.steel });
  f.box("emitTeal", u - 0.2, 1.82, 0.178, 0.02, 0.012, 0.006);
  stencil(f, u, 1.08, 0.18, 9);
}

function commPanel(f, u) {
  f.box("satinBlack", u, 1.5, 0.04, 0.34, 0.5, 0.08);
  f.box("screen0", u, 1.62, 0.081, 0.24, 0.14, 0.005, { uv: "keep" });
  f.box("leds", u, 1.5, 0.081, 0.24, 0.03, 0.005, { uv: "keep" });
  f.box("rubber", u - 0.08, 1.36, 0.11, 0.07, 0.16, 0.06, { color: PALETTE.rubber });
  for (const dx of [0.03, 0.09]) f.box("rubber", u + dx, 1.36, 0.085, 0.035, 0.035, 0.012, { color: PALETTE.rubber });
  stencil(f, u, 1.1, 0.18, 6);
}

function maskDispenser(f, u, v) {
  f.box("satinBlack", u, v, 0.08, 0.42, 0.3, 0.16);
  f.box("painted", u, v + 0.09, 0.161, 0.36, 0.06, 0.006, { color: PALETTE.orange, uv: "keep" });
  for (let i = 0; i < 4; i++) f.box("emitTeal", u - 0.12 + i * 0.08, v - 0.02, 0.161, 0.03, 0.03, 0.006);
  f.box("darkGloss", u, v - 0.1, 0.161, 0.34, 0.05, 0.006);
  stencil(f, u, v - 0.29, 0.14, 4, 0.003);
}
