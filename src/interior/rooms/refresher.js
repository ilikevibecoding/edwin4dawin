// Refresher: the crew washroom. Sink counter with four basins (steel bowls, sensor taps), tinted
// mirrors under vanity bars along the forward wall; on the aft wall, from the door inward, a towel
// station, three shower stalls with frosted partitions and curtains, then two refresher cubicles at
// the far end so the entry sightline runs past the stalls instead of into a door; a water-reclamation
// unit with pipe work and valves fills the end wall. Cool white light, lighter deck, wet-floor gratings.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallLightBar, doorOpening, IMPERIAL_STYLES, IMPERIAL_PAINTS } from "../shell.js";
import { panelGrid, pointLight, WALL_T, DOOR_H } from "../lib.js";
import { rng } from "../../kit.js";
import { grabRail, wallScreen, stencil, grateStrip, pipeRun, bench, downlight, hazardBand, Frosted, Mirror } from "./crewFwdKit.js";

const BASINS = [0.95, 2.0, 3.05, 4.1]; // u along the forward wall (u = x - x0)
const STALLS = [2.45, 3.55, 4.65]; // shower stall centres on the aft wall (u = x1 - x)
const STALL_W = 1.1;
const CUBICLES = [
  [5.4, 6.7],
  [6.7, 8.0],
];

export function build(kit, ctx, room, lib) {
  const { x0, x1, z0, z1, height: h } = room;
  const shell = roomShell(kit, ctx, room, {
    style: "light",
    skipWalls: ["-z", "+z", "-x", "+x"],
    lights: false,
    lightRows: 0,
    floorColor: PALETTE.impGrey,
    seed: 78,
  });
  const { y0, yTop, frames } = shell;
  const rand = rng(4411);
  const frosted = new Frosted(ctx, { opacity: 0.26, color: 0xa9bccb, roughness: 0.4 });
  const mirror = new Mirror(ctx);

  // walls: the standard Imperial panel mix minus the dark-red accent paint and the vent panels with
  // their orange marker band (a washroom has no reason for a red panel, and the reviewer read the one
  // the shell rolled as unexplained)
  {
    const paints = IMPERIAL_PAINTS.filter(([c]) => c !== PALETTE.orange);
    const styles = { ...IMPERIAL_STYLES, vent: 0 };
    let seed = 78;
    for (const [dir, { frame, length }] of Object.entries(frames)) {
      const ops = [];
      for (const door of room.doors || []) if (door[3] === dir) ops.push(doorOpening(room, door, y0, length, Math.min(h - 0.1, door[4] || DOOR_H)));
      panelGrid(frame, length, h, { openings: ops, depth: WALL_T, seed: seed++, kick: true, topPipes: false, styles, paints, tag: room.id + dir });
      frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
    }
  }

  // ------------------------------------------------------------ forward wall: sink counter, mirrors, linen rack
  {
    const { frame: f } = frames["-z"]; // u = x - x0, N = +z
    sinkCounter(f, 0.4, 4.6, mirror);
    // hand dryer past the last basin
    f.box("satinBlack", 5.0, 1.25, 0.1, 0.28, 0.32, 0.2);
    f.box("metal", 5.0, 1.07, 0.16, 0.16, 0.05, 0.1, { color: PALETTE.steel });
    f.box("emitTeal", 5.0, 1.36, 0.201, 0.05, 0.012, 0.006);
    stencil(f, 5.0, 1.6, 0.2, 12);
    // linen rack: open steel shelving with folded towels
    const ru = 6.0;
    for (const du of [-0.45, 0.45]) f.box("metal", ru + du, 1.0, 0.22, 0.04, 2.0, 0.44, { color: PALETTE.gunmetal, texel: 2 });
    for (const v of [0.3, 0.75, 1.2, 1.65]) {
      f.box("metal", ru, v, 0.22, 0.9, 0.025, 0.44, { color: PALETTE.steel, texel: 2 });
      let u = ru - 0.36;
      while (u < ru + 0.3) {
        const w = 0.22 + rand() * 0.1;
        const hh = 0.06 + rand() * 0.1;
        f.box("fabric", u + w / 2, v + 0.0125 + hh / 2, 0.22, w, hh, 0.36, { color: rand() < 0.4 ? PALETTE.fabricTeal : PALETTE.impWhite, uv: "world", texel: 3 });
        u += w + 0.04;
      }
    }
    f.box("metal", ru, 2.0, 0.22, 0.94, 0.03, 0.44, { color: PALETTE.gunmetal, texel: 2 });
    stencil(f, ru, 2.25, 0.24, 11);
    f.collider(ru - 0.47, ru + 0.47, 0, 2.05, 0, 0.46, "linen");
    wallScreen(f, 7.1, 1.8, 0.5, 0.3, "screen9");
    stencil(f, 7.6, 1.8, 0.22, 4);
    wallLightBar(f, 5.3, 7.7, 2.45, "emitCoolSoft");
  }
  bench(kit, -2.95, y0, z0 + 0.32, 1.0, "x", { color: PALETTE.impGreyDark });
  kit.box("fabric", -3.1, y0 + 0.5, z0 + 0.32, 0.3, 0.1, 0.24, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
  kit.boxMM("rubber", [-9.7, y0, z0 + 0.6], [-5.3, y0 + 0.015, z0 + 1.45], { color: PALETTE.rubber, texel: 3 });

  // ------------------------------------------------------------ aft wall: towel station, showers, cubicles
  {
    const { frame: f } = frames["+z"]; // u = x1 - x ; N = -z
    // towel station just inside the door: hooks with towels, wet-floor stencil, a small status screen
    for (const u of [0.45, 0.75, 1.05, 1.35]) f.box("metal", u, 1.45, 0.03, 0.03, 0.06, 0.06, { color: PALETTE.steel });
    f.box("fabric", 0.75, 1.15, 0.05, 0.22, 0.58, 0.06, { color: PALETTE.impWhite, uv: "world", texel: 3 });
    f.box("fabric", 1.35, 1.18, 0.05, 0.2, 0.52, 0.06, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
    grabRail(f, 0.3, 1.6, 0.95, { n: 0.07, r: 0.016 });
    wallScreen(f, 0.9, 2.0, 0.5, 0.3, "screen4");
    stencil(f, 1.55, 2.0, 0.22, 15);
    wallLightBar(f, 0.3, 1.7, 2.45, "emitCoolSoft");
    // shower stalls, 1.0 m deep, curtain states: nearest open (bunched), middle half drawn, far one closed
    STALLS.forEach((u, i) => {
      const x = x1 - u;
      f.box("painted", u, 1.2, 0.012, STALL_W - 0.04, 2.3, 0.024, { color: PALETTE.impWhite, uv: "keep" });
      f.box("satinBlack", u, 0.9, 0.026, STALL_W - 0.04, 0.12, 0.006);
      f.cylN("metal", u, 2.05, 0.16, 0.012, 0.3, { color: PALETTE.steel, segments: 8 });
      f.cylV("metal", u, 2.03, 0.3, 0.07, 0.02, { color: PALETTE.steel, segments: 16 });
      f.box("satinBlack", u, 1.3, 0.02, 0.14, 0.24, 0.03);
      f.cylN("metal", u, 1.34, 0.045, 0.03, 0.03, { color: PALETTE.steel, segments: 12 });
      f.box("emitTeal", u - 0.04, 1.22, 0.036, 0.02, 0.02, 0.006);
      f.box("emitOrange", u + 0.04, 1.22, 0.036, 0.02, 0.02, 0.006);
      grabRail(f, u - 0.4, u + 0.4, 1.05, { n: 0.07, r: 0.016 });
      f.box("metal", u + 0.3, 1.6, 0.08, 0.2, 0.02, 0.1, { color: PALETTE.steel });
      f.cylV("painted", u + 0.3, 1.66, 0.08, 0.03, 0.1, { color: PALETTE.tealPaint, uv: "keep", segments: 8 });
      grateStrip(kit, x - 0.48, z1 - 0.95, x + 0.48, z1 - 0.06, y0 + 0.018);
      kit.cyl("darkGloss", x, y0 + 0.03, z1 - 0.5, 0.05, 0.006, "y", { segments: 12 });
      kit.cyl("metal", x, y0 + 2.12, z1 - 1.02, 0.012, STALL_W - 0.04, "x", { color: PALETTE.steel, segments: 8 });
      const cw = [0.16, 0.55, STALL_W - 0.08][i];
      const cx = x + (i === 2 ? 0 : 0.5 - cw / 2);
      kit.box("fabric", cx, y0 + 1.14, z1 - 1.02, cw, 1.9, 0.025, { color: PALETTE.impWhite, uv: "world", texel: 2 });
    });
    for (let k = 0; k <= STALLS.length; k++) {
      const x = x1 - (STALLS[0] - STALL_W / 2 + k * STALL_W);
      frosted.box(x, y0 + 1.16, z1 - 0.5, 0.03, 2.0, 0.94);
      kit.box("metal", x, y0 + 2.17, z1 - 0.5, 0.05, 0.03, 0.94, { color: PALETTE.steel, texel: 2 });
      kit.box("metal", x, y0 + 0.15, z1 - 0.5, 0.05, 0.03, 0.94, { color: PALETTE.steel, texel: 2 });
      kit.cyl("metal", x, y0 + 1.1, z1 - 0.99, 0.02, 2.14, "y", { color: PALETTE.steel, segments: 10 });
      kit.collider([x - 0.03, y0, z1 - 1.0], [x + 0.03, y0 + 2.2, z1], "shower-partition");
    }
    grateStrip(kit, x1 - STALLS[2] - STALL_W / 2 - 0.05, z1 - 1.3, x1 - STALLS[0] + STALL_W / 2 + 0.05, z1 - 1.06, y0 + 0.006);
    // refresher cubicles at the far end, 1.4 m deep: first door ajar, second closed with the occupied lamp
    CUBICLES.forEach(([ua, ub], i) => {
      const uc = (ua + ub) / 2;
      // side partition at ua (the end wall closes the last cubicle)
      f.box("painted", ua, 1.15, 0.7, 0.04, 1.9, 1.4, { color: PALETTE.impGrey, uv: "keep" });
      f.box("metal", ua, 0.2, 0.7, 0.05, 0.03, 1.4, { color: PALETTE.gunmetal });
      f.collider(ua - 0.02, ua + 0.02, 0, 2.1, 0, 1.4, "cubicle");
      // toilet unit against the wall
      f.cylV("metal", uc, 0.2, 0.42, 0.17, 0.4, { color: PALETTE.steel, segments: 16 });
      f.cylV("metal", uc, 0.42, 0.42, 0.23, 0.06, { color: PALETTE.steel, segments: 20 });
      f.add("rubber", new THREE.TorusGeometry(0.2, 0.04, 8, 24), uc, 0.48, 0.42, { color: PALETTE.rubber, uv: "scale", uvScale: [2, 1] });
      f.box("painted", uc, 0.65, 0.12, 0.5, 0.6, 0.24, { color: PALETTE.impWhite, uv: "keep" });
      f.box("metal", uc, 0.98, 0.16, 0.16, 0.03, 0.08, { color: PALETTE.steel });
      f.cylN("metal", uc + 0.5, 0.75, 0.06, 0.012, 0.12, { color: PALETTE.steel, segments: 8 });
      f.cylN("painted", uc + 0.5, 0.75, 0.13, 0.055, 0.1, { color: PALETTE.cream, uv: "keep", segments: 12 });
      f.collider(uc - 0.3, uc + 0.3, 0, 1.0, 0, 0.7, "toilet");
      const dw = ub - ua - 0.12;
      if (i === 1) {
        f.box("painted", uc, 1.1, 1.38, dw, 1.8, 0.03, { color: PALETTE.cream, uv: "keep" });
        f.box("metal", uc, 0.22, 1.38, dw, 0.05, 0.04, { color: PALETTE.gunmetal });
        f.box("metal", uc - 0.45, 1.0, 1.41, 0.03, 0.14, 0.03, { color: PALETTE.steel });
        f.box("emitRed", uc, 1.9, 1.397, 0.06, 0.03, 0.006);
        stencil(f, uc, 1.55, 0.2, 9, 1.396);
        f.collider(ua, ub, 0, 2.0, 1.36, 1.4, "cubicle-door");
      } else {
        const theta = 0.7;
        const hinge = f.pos(ua + 0.06, 1.1, 1.38);
        const cxw = hinge.x - (dw / 2) * Math.cos(theta);
        const czw = hinge.z + (dw / 2) * Math.sin(theta);
        kit.box("painted", cxw, hinge.y, czw, dw, 1.8, 0.03, { color: PALETTE.cream, uv: "keep", rot: [0, Math.PI + theta, 0] });
        kit.box("emitTeal", cxw - 0.02 * Math.sin(theta), hinge.y + 0.8, czw - 0.02 * Math.cos(theta), 0.06, 0.03, 0.006, { rot: [0, Math.PI + theta, 0] });
        kit.collider([Math.min(hinge.x, cxw * 2 - hinge.x) - 0.05, y0, Math.min(hinge.z, czw * 2 - hinge.z) - 0.05], [Math.max(hinge.x, cxw * 2 - hinge.x) + 0.05, y0 + 2.0, Math.max(hinge.z, czw * 2 - hinge.z) + 0.05], "cubicle-door");
      }
      // header over the cubicle front with a small light
      f.box("satinBlack", uc, 2.15, 1.38, ub - ua + 0.04, 0.12, 0.06);
      f.box("emitCoolSoft", uc, 2.09, 1.38, ub - ua - 0.3, 0.012, 0.04, { uv: "keep" });
    });
    stencil(f, 5.4, 2.5, 0.3, 12);
  }

  // ------------------------------------------------------------ port end wall: water reclamation unit
  {
    const { frame: f } = frames["-x"]; // u = z1 - z ; N = +x ; u 0..1.4 is inside the last cubicle
    const uc = 2.7;
    f.box("paintedMetal", uc, 1.3, 0.14, 2.4, 2.2, 0.28, { color: PALETTE.darkMetal, texel: 1.5 });
    f.box("satinBlack", uc, 1.3, 0.29, 2.3, 2.1, 0.02);
    f.box("metal", uc, 2.42, 0.14, 2.44, 0.05, 0.32, { color: PALETTE.steel, texel: 2 });
    hazardBand(f, uc - 1.2, uc + 1.2, 0.3, 0.08, 0.301);
    // two upright reclamation cylinders behind sight glasses
    for (const du of [-0.72, -0.24]) {
      f.cylV("metal", uc + du, 1.25, 0.18, 0.17, 1.5, { color: PALETTE.steel, segments: 20 });
      for (const v of [0.7, 1.25, 1.8]) f.cylV("metal", uc + du, v, 0.18, 0.19, 0.05, { color: PALETTE.gunmetal, segments: 20 });
      f.box("emitTeal", uc + du, 1.25, 0.352, 0.03, 0.9, 0.006);
      f.cylV("metal", uc + du, 2.1, 0.18, 0.05, 0.3, { color: PALETTE.steel, segments: 10 });
    }
    // control column: screen, gauges, valve wheels, indicator strip
    wallScreen(f, uc + 0.7, 1.95, 0.7, 0.4, "screen9", { n: 0.3 });
    for (let k = 0; k < 3; k++) {
      const gu = uc + 0.4 + k * 0.3;
      f.cylN("metal", gu, 1.4, 0.31, 0.08, 0.03, { color: PALETTE.steel, segments: 16 });
      f.cylN("darkGloss", gu, 1.4, 0.33, 0.065, 0.01, { segments: 16 });
      f.box(k === 1 ? "emitOrange" : "emitTeal", gu + 0.04, 1.44, 0.336, 0.012, 0.012, 0.004);
    }
    for (const gu of [uc + 0.45, uc + 0.95]) {
      f.cylN("metal", gu, 0.95, 0.36, 0.012, 0.12, { color: PALETTE.steel, segments: 8 });
      f.add("painted", new THREE.TorusGeometry(0.09, 0.014, 8, 20), gu, 0.95, 0.4, { color: PALETTE.orange, uv: "scale", uvScale: [4, 1] });
    }
    f.box("leds", uc + 0.7, 0.62, 0.301, 0.7, 0.03, 0.006, { uv: "keep" });
    for (const du of [-0.3, -0.15, 0.0, 0.15]) f.box("rubber", uc + 0.7 + du, 0.5, 0.31, 0.06, 0.06, 0.02, { color: PALETTE.rubber });
    stencil(f, uc + 0.7, 1.05, 0.22, 12, 0.301);
    stencil(f, uc - 0.5, 2.2, 0.26, 9, 0.301);
    f.collider(uc - 1.22, uc + 1.22, 0, 2.45, 0, 0.34, "reclaim");
    // pipe work above the unit, down into it and along the ceiling line
    pipeRun(f, 1.5, 3.9, 2.52, 0.045, { color: PALETTE.steel });
    pipeRun(f, 1.5, 3.9, 2.64, 0.028, { color: PALETTE.tealPaint, clamps: false });
    for (const du of [-0.72, -0.24]) f.cylV("metal", uc + du, 2.48, 0.09, 0.04, 0.1, { color: PALETTE.steel, segments: 10 });
    // mop bucket in the corner
    kit.cyl("rubber", x0 + 0.35, y0 + 0.16, z0 + 0.45, 0.16, 0.32, "y", { color: PALETTE.rubber, segments: 14 });
    kit.cyl("metal", x0 + 0.3, y0 + 0.75, z0 + 0.4, 0.012, 1.4, "y", { color: PALETTE.steel, segments: 8 });
    kit.collider([x0, y0, z0 + 0.25], [x0 + 0.55, y0 + 0.4, z0 + 0.65], "bucket");
  }

  // ------------------------------------------------------------ door wall: dispenser, bin, signage
  {
    const { frame: f } = frames["+x"]; // u = z - z0 ; door at u 1.4..2.6 ; N = -x
    f.box("satinBlack", 0.7, 1.3, 0.06, 0.3, 0.36, 0.12);
    f.box("emitTeal", 0.7, 1.4, 0.121, 0.03, 0.012, 0.006);
    f.box("darkGloss", 0.7, 1.2, 0.121, 0.22, 0.05, 0.006);
    stencil(f, 0.7, 1.7, 0.22, 4);
    wallScreen(f, 3.3, 1.8, 0.4, 0.26, "screen0");
    stencil(f, 3.3, 1.4, 0.22, 15);
    wallLightBar(f, 2.9, 3.8, 2.45, "emitCoolSoft");
    kit.cyl("satinBlack", x1 - 0.3, y0 + 0.3, z1 - 0.4, 0.17, 0.6, "y", { segments: 16 });
    kit.cyl("metal", x1 - 0.3, y0 + 0.6, z1 - 0.4, 0.18, 0.03, "y", { color: PALETTE.steel, segments: 16 });
    kit.collider([x1 - 0.5, y0, z1 - 0.6], [x1 - 0.1, y0 + 0.65, z1 - 0.2], "bin");
  }

  frosted.build("refresher-frosted");
  mirror.build("refresher-mirrors");

  // ------------------------------------------------------------ lights: cool white, each under a downlight can
  const LIGHTS = [
    [-8.6, z0 + 0.9, 5.0],
    [-6.4, z0 + 0.9, 5.0],
    [-5.1, z1 - 1.25, 4.5],
    [-8.7, z1 - 1.6, 4.0],
    [-3.3, 506.0, 4.5],
  ];
  for (const [x, z, i] of LIGHTS) {
    downlight(kit, x, yTop, z, 0.15, "emitCoolSoft");
    ctx.lights.cool.push(pointLight(0xdfe8ff, i, 7, [x, yTop - 0.55, z]));
  }
  void lib;
  return shell;
}

// Sink counter: plinth, white cabinet with doors, a steel top with a rectangular bowl cut for every
// basin (bowl, drain, rim), sensor taps on the splashback, soap dispensers, tinted mirrors under
// vanity bars, LED dividers between the mirrors.
function sinkCounter(f, u0, u1, mirror) {
  const H = 0.88;
  const D = 0.58;
  const len = u1 - u0;
  const uc = (u0 + u1) / 2;
  const bw = 0.44;
  const bd = 0.3;
  const bn0 = 0.14;
  f.box("metal", uc, 0.05, D / 2 + 0.03, len, 0.1, D - 0.06, { color: PALETTE.darkMetal, texel: 2 });
  // cabinet body stops under the bowls; an apron closes the front and the ends up to the top slab
  f.box("painted", uc, 0.1 + 0.6 / 2, D / 2 - 0.01, len, 0.6, D - 0.02, { color: PALETTE.impWhite, uv: "keep" });
  f.box("painted", uc, 0.7 + (H - 0.04 - 0.7) / 2, D - 0.02, len, H - 0.04 - 0.7, 0.02, { color: PALETTE.impWhite, uv: "keep" });
  for (const u of [u0 + 0.01, u1 - 0.01]) f.box("painted", u, 0.7 + (H - 0.04 - 0.7) / 2, D / 2, 0.02, H - 0.04 - 0.7, D - 0.04, { color: PALETTE.impWhite, uv: "keep" });
  const doors = Math.round(len / 0.7);
  for (let i = 0; i < doors; i++) {
    const u = u0 + ((i + 0.5) * len) / doors;
    if (i > 0) f.box("metal", u0 + (i * len) / doors, 0.4, D - 0.005, 0.012, 0.56, 0.012, { color: PALETTE.darkMetal });
    f.box("metal", u, 0.62, D + 0.012, 0.22, 0.02, 0.025, { color: PALETTE.steel });
  }
  // top slab in strips around the bowls
  const top = (ua, ub, na, nb) => f.box("metalRough", (ua + ub) / 2, H - 0.02, (na + nb) / 2, ub - ua, 0.04, nb - na, { color: PALETTE.steel, texel: 1.5 });
  top(u0 - 0.02, u1 + 0.02, 0, bn0);
  top(u0 - 0.02, u1 + 0.02, bn0 + bd, D + 0.02);
  let ua = u0 - 0.02;
  for (const u of BASINS) {
    top(ua, u - bw / 2, bn0, bn0 + bd);
    ua = u + bw / 2;
  }
  top(ua, u1 + 0.02, bn0, bn0 + bd);
  f.box("satinBlack", uc, H + 0.16, 0.012, len - 0.4, 0.3, 0.024);
  BASINS.forEach((u, i) => {
    const nc = bn0 + bd / 2;
    // bowl: bottom and four walls, brushed steel, drain and a rim proud of the slab
    const depth = 0.13;
    f.box("painted", u, H - depth - 0.005, nc, bw, 0.01, bd, { color: PALETTE.impWhite, uv: "keep" });
    for (const s of [-1, 1]) f.box("painted", u + s * (bw / 2 - 0.006), H - depth / 2, nc, 0.012, depth, bd, { color: PALETTE.impWhite, uv: "keep" });
    for (const s of [-1, 1]) f.box("painted", u, H - depth / 2, nc + s * (bd / 2 - 0.006), bw, depth, 0.012, { color: PALETTE.impWhite, uv: "keep" });
    f.cylV("darkGloss", u, H - depth + 0.002, nc, 0.03, 0.004, { segments: 12 });
    for (const s of [-1, 1]) f.box("metal", u + s * (bw / 2 + 0.01), H + 0.004, nc, 0.04, 0.008, bd + 0.06, { color: PALETTE.steel });
    for (const s of [-1, 1]) f.box("metal", u, H + 0.004, nc + s * (bd / 2 + 0.01), bw + 0.06, 0.008, 0.04, { color: PALETTE.steel });
    // sensor tap: riser on the splashback, gooseneck spout over the bowl, lever
    f.cylV("metal", u, H + 0.12, 0.07, 0.016, 0.24, { color: PALETTE.steel, segments: 10 });
    f.cylN("metal", u, H + 0.24, 0.16, 0.014, 0.2, { color: PALETTE.steel, segments: 10 });
    f.cylV("metal", u, H + 0.21, 0.25, 0.014, 0.06, { color: PALETTE.steel, segments: 10 });
    f.box("metal", u + 0.05, H + 0.1, 0.07, 0.08, 0.02, 0.02, { color: PALETTE.gunmetal });
    f.box("emitTeal", u, H + 0.05, 0.088, 0.012, 0.012, 0.004);
    // soap dispenser
    f.box("painted", u + 0.32, H + 0.24, 0.05, 0.08, 0.16, 0.08, { color: PALETTE.creamDark, uv: "keep" });
    f.box("emitTeal", u + 0.32, H + 0.29, 0.092, 0.02, 0.012, 0.006);
    // mirror in a satin surround, vanity bar above
    f.box("satinBlack", u, 1.66, 0.015, 0.78, 0.68, 0.03);
    const p = f.pos(u, 1.66, 0.035);
    mirror.plane(p.x, p.y, p.z, 0.72, 0.62, Math.atan2(f.N.x, f.N.z));
    f.box("satinBlack", u, 2.05, 0.06, 0.74, 0.06, 0.12);
    f.box("emitCoolSoft", u, 2.017, 0.06, 0.66, 0.012, 0.08, { uv: "keep" });
    if (i < BASINS.length - 1) {
      const m = (u + BASINS[i + 1]) / 2;
      f.box("painted", m, 1.55, 0.05, 0.24, 0.3, 0.1, { color: PALETTE.creamDark, uv: "keep" });
      f.box("darkGloss", m, 1.44, 0.101, 0.18, 0.03, 0.006);
      f.box("leds", m, 1.66, 0.101, 0.14, 0.02, 0.006, { uv: "keep" });
    }
  });
  f.collider(u0, u1, 0, H, 0, D + 0.02, "counter");
}
