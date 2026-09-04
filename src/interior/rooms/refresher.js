// Refresher: the crew washroom. Sink counter with four basins, mirrors and vanity bars along the
// forward wall, three shower stalls with frosted partitions and curtains plus two refresher cubicles
// along the aft wall, a linen rack and bench by the door, water-processing panel and pipe work on the
// end wall, wet-floor gratings. Cool white light, lighter deck.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallLightBar } from "../shell.js";
import { pointLight, wallFrame } from "../lib.js";
import { rng } from "../../kit.js";
import { counter, grabRail, wallScreen, stencil, grateStrip, pipeRun, bench, Frosted } from "./crewFwdKit.js";

export function build(kit, ctx, room, lib) {
  const { x0, x1, z0, z1, height: h } = room;
  const shell = roomShell(kit, ctx, room, {
    style: "light",
    lights: false,
    lightMat: "emitCoolSoft",
    lightRows: 1,
    floorColor: PALETTE.impGrey,
    seed: 77,
  });
  const { y0, yTop, frames } = shell;
  const rand = rng(4411);
  const frosted = new Frosted(ctx, { opacity: 0.26, color: 0xa9bccb, roughness: 0.4 });

  // ------------------------------------------------------------ forward wall: sink counter, mirrors, linen rack
  {
    const { frame: f } = frames["-z"]; // u = x - x0
    counter(f, 0.4, 4.6, { h: 0.9, d: 0.55, color: PALETTE.impWhite, top: PALETTE.steel, doorW: 0.7 });
    f.box("satinBlack", 2.5, 1.06, 0.012, 4.2, 0.3, 0.024);
    const basins = [0.95, 2.0, 3.05, 4.1];
    basins.forEach((u, i) => {
      f.box("metal", u, 0.94, 0.3, 0.48, 0.02, 0.38, { color: PALETTE.steel, texel: 2 });
      f.box("darkGloss", u, 0.952, 0.3, 0.42, 0.012, 0.32);
      f.cylV("metal", u, 1.03, 0.1, 0.014, 0.2, { color: PALETTE.steel, segments: 8 });
      f.cylN("metal", u, 1.13, 0.17, 0.012, 0.16, { color: PALETTE.steel, segments: 8 });
      f.box("metal", u, 1.13, 0.1, 0.06, 0.03, 0.05, { color: PALETTE.gunmetal });
      // mirror in a satin surround, vanity bar above
      f.box("satinBlack", u, 1.66, 0.015, 0.78, 0.68, 0.03);
      f.box("darkGloss", u, 1.66, 0.035, 0.72, 0.62, 0.012);
      f.box("satinBlack", u, 2.05, 0.06, 0.74, 0.06, 0.12);
      f.box("emitCoolSoft", u, 2.017, 0.06, 0.66, 0.012, 0.08, { uv: "keep" });
      // soap dispenser on the band
      f.box("painted", u + 0.3, 1.16, 0.05, 0.08, 0.16, 0.08, { color: PALETTE.creamDark, uv: "keep" });
      f.box("emitTeal", u + 0.3, 1.21, 0.092, 0.02, 0.012, 0.006);
      if (i < basins.length - 1) {
        const m = (u + basins[i + 1]) / 2;
        f.box("painted", m, 1.55, 0.05, 0.24, 0.3, 0.1, { color: PALETTE.creamDark, uv: "keep" });
        f.box("darkGloss", m, 1.44, 0.101, 0.18, 0.03, 0.006);
        f.box("leds", m, 1.66, 0.101, 0.14, 0.02, 0.006, { uv: "keep" });
      }
    });
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
        f.box("fabric", u + w / 2, v + 0.0125 + hh / 2, 0.22, w, hh, 0.36, { color: rand() < 0.4 ? PALETTE.fabricTeal : PALETTE.fabricCream, uv: "world", texel: 3 });
        u += w + 0.04;
      }
    }
    f.box("metal", ru, 2.0, 0.22, 0.94, 0.03, 0.44, { color: PALETTE.gunmetal, texel: 2 });
    stencil(f, ru, 2.25, 0.24, 11);
    f.collider(ru - 0.47, ru + 0.47, 0, 2.05, 0, 0.46, "linen");
    wallLightBar(f, 5.3, 7.6, 2.45, "emitCoolSoft");
  }
  bench(kit, -2.85, y0, z0 + 0.32, 0.9, "x", { color: PALETTE.impGreyDark });
  kit.boxMM("rubber", [-9.7, y0, z0 + 0.6], [-5.3, y0 + 0.015, z0 + 1.45], { color: PALETTE.rubber, texel: 3 });

  // ------------------------------------------------------------ aft wall: showers + refresher cubicles
  {
    const { frame: f } = frames["+z"]; // u = x1 - x ; N = -z
    // shower stalls at x -9.7..-6.4 (u 4.4..7.7), 1.0 m deep
    const stalls = [4.95, 6.05, 7.15];
    stalls.forEach((u, i) => {
      const x = x1 - u;
      f.box("painted", u, 1.2, 0.012, 1.06, 2.3, 0.024, { color: PALETTE.impWhite, uv: "keep" });
      f.box("satinBlack", u, 0.9, 0.026, 1.06, 0.12, 0.006);
      f.cylN("metal", u, 2.05, 0.16, 0.012, 0.3, { color: PALETTE.steel, segments: 8 });
      f.cylV("metal", u, 2.03, 0.3, 0.07, 0.02, { color: PALETTE.steel, segments: 16 });
      f.box("satinBlack", u, 1.3, 0.02, 0.14, 0.24, 0.03);
      f.cylN("metal", u, 1.34, 0.045, 0.03, 0.03, { color: PALETTE.steel, segments: 12 });
      f.box("emitTeal", u - 0.04, 1.22, 0.036, 0.02, 0.02, 0.006);
      f.box("emitOrange", u + 0.04, 1.22, 0.036, 0.02, 0.02, 0.006);
      grabRail(f, u - 0.4, u + 0.4, 1.05, { n: 0.07, r: 0.016 });
      grateStrip(kit, x - 0.46, z1 - 0.95, x + 0.46, z1 - 0.06, y0 + 0.018);
      kit.cyl("darkGloss", x, y0 + 0.03, z1 - 0.5, 0.05, 0.006, "y", { segments: 12 });
      // curtain rail + curtain (first drawn, second half, third bunched)
      kit.cyl("metal", x, y0 + 2.12, z1 - 1.02, 0.012, 1.08, "x", { color: PALETTE.steel, segments: 8 });
      const cw = [1.02, 0.55, 0.16][i];
      const cx = x + (i === 0 ? 0 : 0.53 - cw / 2);
      kit.box("fabric", cx, y0 + 1.14, z1 - 1.02, cw, 1.9, 0.025, { color: PALETTE.fabricCream, uv: "world", texel: 2 });
    });
    for (const u of [4.4, 5.5, 6.6, 7.7]) {
      const x = x1 - u;
      frosted.box(x, y0 + 1.16, z1 - 0.5, 0.03, 2.0, 0.94);
      kit.box("metal", x, y0 + 2.17, z1 - 0.5, 0.05, 0.03, 0.94, { color: PALETTE.steel, texel: 2 });
      kit.box("metal", x, y0 + 0.15, z1 - 0.5, 0.05, 0.03, 0.94, { color: PALETTE.steel, texel: 2 });
      kit.cyl("metal", x, y0 + 1.1, z1 - 0.99, 0.02, 2.14, "y", { color: PALETTE.steel, segments: 10 });
      kit.collider([x - 0.03, y0, z1 - 1.0], [x + 0.03, y0 + 2.2, z1], "shower-partition");
    }
    grateStrip(kit, -9.75, z1 - 1.3, -6.35, z1 - 1.06, y0 + 0.006);
    // refresher cubicles at x -6.2..-3.6 (u 1.6..4.2), 1.4 m deep
    const cubX = [
      [1.6, 2.9],
      [2.9, 4.2],
    ];
    cubX.forEach(([ua, ub], i) => {
      const uc = (ua + ub) / 2;
      const x = x1 - uc;
      for (const u of i === 0 ? [ua, ub] : [ub]) {
        f.box("painted", u, 1.15, 0.7, 0.04, 1.9, 1.4, { color: PALETTE.impGrey, uv: "keep" });
        f.box("metal", u, 0.2, 0.7, 0.05, 0.03, 1.4, { color: PALETTE.gunmetal });
        f.collider(u - 0.02, u + 0.02, 0, 2.1, 0, 1.4, "cubicle");
      }
      // toilet unit against the wall
      f.cylV("metal", uc, 0.2, 0.42, 0.17, 0.4, { color: PALETTE.steel, segments: 16 });
      f.cylV("metal", uc, 0.42, 0.42, 0.23, 0.06, { color: PALETTE.steel, segments: 20 });
      f.add("rubber", new THREE.TorusGeometry(0.2, 0.04, 8, 24), uc, 0.48, 0.42, { color: PALETTE.rubber, uv: "scale", uvScale: [2, 1] });
      f.box("painted", uc, 0.65, 0.12, 0.5, 0.6, 0.24, { color: PALETTE.impWhite, uv: "keep" });
      f.box("metal", uc, 0.98, 0.16, 0.16, 0.03, 0.08, { color: PALETTE.steel });
      f.cylN("metal", uc + 0.5, 0.75, 0.06, 0.012, 0.12, { color: PALETTE.steel, segments: 8 });
      f.cylN("painted", uc + 0.5, 0.75, 0.13, 0.055, 0.1, { color: PALETTE.cream, uv: "keep", segments: 12 });
      f.collider(uc - 0.3, uc + 0.3, 0, 1.0, 0, 0.7, "toilet");
      // door: first closed with an occupied lamp, second ajar
      if (i === 0) {
        f.box("painted", uc, 1.1, 1.38, ub - ua - 0.12, 1.8, 0.03, { color: PALETTE.cream, uv: "keep" });
        f.box("metal", uc, 0.22, 1.38, ub - ua - 0.12, 0.05, 0.04, { color: PALETTE.gunmetal });
        f.box("metal", uc - 0.45, 1.0, 1.41, 0.03, 0.14, 0.03, { color: PALETTE.steel });
        f.box("emitRed", uc, 1.9, 1.397, 0.06, 0.03, 0.006);
        stencil(f, uc, 1.55, 0.2, 9, 1.396);
        f.collider(ua, ub, 0, 2.0, 1.36, 1.4, "cubicle-door");
      } else {
        const theta = 0.7;
        const hinge = f.pos(ua + 0.06, 1.1, 1.38);
        const dw = ub - ua - 0.12;
        const cxw = hinge.x - (dw / 2) * Math.cos(theta);
        const czw = hinge.z + (dw / 2) * Math.sin(theta);
        kit.box("painted", cxw, hinge.y, czw, dw, 1.8, 0.03, { color: PALETTE.cream, uv: "keep", rot: [0, Math.PI + theta, 0] });
        kit.box("emitTeal", cxw - 0.02 * Math.sin(theta), hinge.y + 0.8, czw - 0.02 * Math.cos(theta), 0.06, 0.03, 0.006, { rot: [0, Math.PI + theta, 0] });
        kit.collider([Math.min(hinge.x, cxw * 2 - hinge.x) - 0.05, y0, Math.min(hinge.z, czw * 2 - hinge.z) - 0.05], [Math.max(hinge.x, cxw * 2 - hinge.x) + 0.05, y0 + 2.0, Math.max(hinge.z, czw * 2 - hinge.z) + 0.05], "cubicle-door");
      }
      // header over the cubicle front with a small light
      f.box("satinBlack", uc, 2.15, 1.38, ub - ua + 0.04, 0.12, 0.06);
      f.box("emitCoolSoft", uc, 2.09, 1.38, ub - ua - 0.3, 0.012, 0.04, { uv: "keep" });
      void x;
    });
    stencil(f, 1.2, 1.8, 0.3, 12);
    wallLightBar(f, 0.3, 1.3, 2.45, "emitCoolSoft");
  }

  // ------------------------------------------------------------ port end wall: water processing
  {
    const { frame: f } = frames["-x"]; // u = z1 - z ; N = +x
    f.box("satinBlack", 2.0, 1.45, 0.05, 0.9, 1.3, 0.1);
    wallScreen(f, 1.8, 1.75, 0.4, 0.25, "screen0", { n: 0.1 });
    for (let k = 0; k < 3; k++) {
      f.cylN("metal", 2.28, 1.72 - k * 0.22, 0.11, 0.06, 0.03, { color: PALETTE.steel, segments: 16 });
      f.cylN("darkGloss", 2.28, 1.72 - k * 0.22, 0.13, 0.045, 0.01, { segments: 16 });
      f.box(k === 1 ? "emitOrange" : "emitTeal", 2.28 + 0.03, 1.72 - k * 0.22 + 0.03, 0.136, 0.012, 0.012, 0.004);
    }
    f.box("leds", 1.95, 1.05, 0.101, 0.6, 0.03, 0.006, { uv: "keep" });
    for (const du of [-0.3, -0.15, 0.0, 0.15]) f.box("rubber", 1.85 + du, 0.95, 0.11, 0.06, 0.06, 0.02, { color: PALETTE.rubber });
    stencil(f, 1.7, 1.2, 0.2, 12, 0.101);
    pipeRun(f, 0.2, 3.8, 2.42, 0.05, { color: PALETTE.steel });
    pipeRun(f, 0.2, 3.8, 2.56, 0.03, { color: PALETTE.tealPaint, clamps: false });
    for (const u of [0.55, 3.45]) {
      f.cylV("metal", u, 1.35, 0.09, 0.045, 2.1, { color: PALETTE.steel, segments: 12 });
      f.add("painted", new THREE.TorusGeometry(0.09, 0.014, 8, 20), u, 1.5, 0.2, { color: PALETTE.orange, uv: "scale", uvScale: [4, 1] });
      f.cylN("metal", u, 1.5, 0.14, 0.02, 0.12, { color: PALETTE.steel, segments: 8 });
    }
    grabRail(f, 2.7, 3.4, 1.2, { n: 0.08, r: 0.014 });
    f.box("fabric", 2.85, 0.98, 0.09, 0.28, 0.46, 0.03, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
    f.box("fabric", 3.2, 0.96, 0.09, 0.26, 0.5, 0.03, { color: PALETTE.fabricCream, uv: "world", texel: 3 });
    // mop bucket in the corner
    kit.cyl("rubber", x0 + 0.35, y0 + 0.16, z0 + 0.45, 0.16, 0.32, "y", { color: PALETTE.rubber, segments: 14 });
    kit.cyl("metal", x0 + 0.3, y0 + 0.75, z0 + 0.4, 0.012, 1.4, "y", { color: PALETTE.steel, segments: 8 });
    kit.collider([x0, y0, z0 + 0.25], [x0 + 0.55, y0 + 0.4, z0 + 0.65], "bucket");
  }

  // ------------------------------------------------------------ door wall: hooks, screen, bin
  {
    const { frame: f } = frames["+x"]; // u = z - z0 ; door at u 1.4..2.6 ; N = -x
    wallScreen(f, 0.7, 1.75, 0.4, 0.26, "screen0");
    for (const u of [0.35, 0.6, 0.85, 1.1]) f.box("metal", u, 1.35, 0.03, 0.03, 0.06, 0.06, { color: PALETTE.steel });
    f.box("fabric", 0.6, 1.05, 0.05, 0.2, 0.55, 0.06, { color: PALETTE.fabricCream, uv: "world", texel: 3 });
    f.box("fabric", 1.1, 1.08, 0.05, 0.18, 0.5, 0.06, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
    f.box("satinBlack", 3.3, 1.3, 0.06, 0.2, 0.26, 0.12);
    f.box("emitTeal", 3.3, 1.38, 0.121, 0.03, 0.012, 0.006);
    stencil(f, 3.3, 1.7, 0.22, 4);
    wallLightBar(f, 2.9, 3.8, 2.45, "emitCoolSoft");
    kit.cyl("satinBlack", x1 - 0.3, y0 + 0.3, z1 - 0.4, 0.17, 0.6, "y", { segments: 16 });
    kit.cyl("metal", x1 - 0.3, y0 + 0.6, z1 - 0.4, 0.18, 0.03, "y", { color: PALETTE.steel, segments: 16 });
    kit.collider([x1 - 0.5, y0, z1 - 0.6], [x1 - 0.1, y0 + 0.65, z1 - 0.2], "bin");
  }

  frosted.build("refresher-frosted");

  // ------------------------------------------------------------ lights: cool white, brightest over the basins
  for (const x of [-8.6, -6.4]) ctx.lights.cool.push(pointLight(0xdfe8ff, 5.0, 7, [x, yTop - 0.45, z0 + 0.9]));
  ctx.lights.cool.push(pointLight(0xd8e6ff, 4.5, 7, [-8.05, yTop - 0.4, z1 - 1.2]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 4.5, 7, [-4.2, yTop - 0.45, z0 + 2.2]));
  void h;
  return shell;
}
