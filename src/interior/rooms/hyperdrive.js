// Deck 4 — Hyperdrive Chamber (d4_hyperdrive). A 22 m horizontal motivator on heavy cradles: ring
// collars, coil stacks, cooling pipes and eight wide blue energy channels whose pulse travels down
// the length of the machine. A gantry ring at y = 3.2 wraps around it (two stairs), technician
// consoles face the machine, a varied coolant tank bank stands along the far wall. Blue is the
// room's colour: saturated coil emitters, blue floods over the machine, blue under-lighting, blue
// service panels on the cradles and gantry columns.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impConsole, wallScreen, equipmentRack, stairs, platform, railing, pipeRun, wallSegment } from "../imperial.js";
import { wallFrame, pointLight } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { signPlate } from "../corridor.js";
import { ENG_PAINTS, ENG_CEIL_PAINTS, ENG_STYLES, ENG_THEME, AMBER, AMBER_DEEP, COOL, BLUE, cableTray, wallVent, wallStencil, floorStencil, floorBorder, cabinet, tank, warningLamp, pulseSet, emitMat } from "./engProps.js";

export function buildHyperdrive(kit, ctx) {
  const [min, max] = ctx.bounds; // [2.9, 0, -32] .. [36, 8, -6]
  const H = max[1];
  const rand = rng(ctx.seed + 9);

  roomShell(kit, ctx, {
    ceiling: { lights: false, paints: ENG_CEIL_PAINTS, panelW: 2.0, rowH: 2.0, along: "x", spacing: 10, styles: { panel: 0.72, greeble: 0.1, vent: 0.18 } },
    walls: { paints: ENG_PAINTS, styles: ENG_STYLES, theme: { ...ENG_THEME, accent: "emitBlue", accent2: "emitAmber", screenMats: ["impScreen0", "impScreen2", "impScreen1"] }, rows: [0, 0.5, 1.7, 3.2, 5.4, H], panelW: 2.0 },
  });

  // ---------------------------------------------------------------- the motivator
  const X0 = 9.5;
  const X1 = 31.5;
  const CZ = -25;
  const CY = 3.4;
  const R = 2.5;
  const L = X1 - X0;
  const CX = (X0 + X1) / 2;
  emitMat(ctx, "hyp_core", 0x8fc4ff, 3.0);
  emitMat(ctx, "hyp_coil", 0x3d8bff, 2.5);
  emitMat(ctx, "hyp_flood", 0x9fc8ff, 2.2, "emitWhiteSoft");
  // dark shell so the blue channels and collars carry the silhouette (a mid-grey drum read as plain)
  kit.cyl("metal", CX, CY, CZ, R, L, "x", { color: PALETTE.impDark, segments: 40, texel: 0.5 });
  // end domes (shallow) with a glowing injector disc, its ring and eight radial feed channels
  for (const [x, s] of [[X0, -1], [X1, 1]]) {
    const dome = new THREE.SphereGeometry(R, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 0.3, 1);
    dome.rotateZ(s > 0 ? -Math.PI / 2 : Math.PI / 2);
    kit.add("paintedMetal", dome, { pos: [x, CY, CZ], color: PALETTE.impGrey, uv: "scale", uvScale: [6, 2] });
    kit.cyl("paintedMetal", x + s * 0.9, CY, CZ, 1.3, 1.0, "x", { color: PALETTE.impDark, segments: 28, texel: 1 });
    kit.cyl("metal", x + s * 1.35, CY, CZ, 1.1, 0.16, "x", { color: PALETTE.steel, segments: 28 });
    kit.cyl("hyp_core", x + s * 1.44, CY, CZ, 0.95, 0.04, "x", { segments: 28 });
    kit.cyl("paintedMetal", x + s * 1.46, CY, CZ, 0.72, 0.06, "x", { color: PALETTE.impBlack, segments: 28, texel: 2 });
    kit.cyl("hyp_core", x + s * 1.5, CY, CZ, 0.55, 0.04, "x", { segments: 28 });
    kit.add("metal", new THREE.TorusGeometry(1.42, 0.09, 10, 40).rotateY(Math.PI / 2), { pos: [x + s * 1.2, CY, CZ], color: PALETTE.impDark });
    kit.add("hyp_coil", new THREE.TorusGeometry(1.42, 0.04, 8, 40).rotateY(Math.PI / 2), { pos: [x + s * 1.31, CY, CZ] });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.3, 1.2), { pos: [x + s * 0.35, CY + 1.7 * Math.cos(a), CZ + 1.7 * Math.sin(a)], rot: [a + Math.PI / 2, 0, 0], color: PALETTE.impDark, texel: 2 });
      kit.add("hyp_coil", new THREE.BoxGeometry(0.06, 0.14, 1.05), { pos: [x + s * 0.62, CY + 1.7 * Math.cos(a), CZ + 1.7 * Math.sin(a)], rot: [a + Math.PI / 2, 0, 0] });
    }
  }
  // ring collars
  for (const x of [X0 + 1.2, X0 + 5.6, X0 + 10.0, X0 + 14.4, X0 + 18.8, X1 - 1.0]) {
    kit.cyl("paintedMetal", x, CY, CZ, R + 0.28, 0.75, "x", { color: PALETTE.impBlack, segments: 40, texel: 1 });
    kit.cyl("metal", x, CY, CZ, R + 0.34, 0.25, "x", { color: PALETTE.impGrey, segments: 40 });
    kit.cyl("hyp_coil", x - 0.22, CY, CZ, R + 0.3, 0.1, "x", { segments: 40 });
    kit.cyl("hyp_coil", x + 0.22, CY, CZ, R + 0.3, 0.1, "x", { segments: 40 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      kit.box("metal", x, CY + (R + 0.3) * Math.cos(a), CZ + (R + 0.3) * Math.sin(a), 0.5, 0.12, 0.12, { color: PALETTE.steel, rot: [a, 0, 0] });
    }
  }
  // coil stacks (torus rings between the collars, the middle one glowing)
  for (const cx of [X0 + 3.0, X0 + 7.8, X0 + 12.2, X0 + 16.6]) {
    for (let k = -1; k <= 1; k++) {
      const g = new THREE.TorusGeometry(R + 0.16, 0.19, 10, 48);
      g.rotateY(Math.PI / 2);
      kit.add(k === 0 ? "hyp_coil" : "metal", g, { pos: [cx + k * 0.5, CY, CZ], color: PALETTE.gunmetal, uv: "scale", uvScale: [12, 1] });
    }
  }
  // energy channels: eight 0.5 m wide strips, segmented along the length, driven by a travelling pulse
  const pulse = pulseSet(ctx, "hyp_p", 0x7fc0ff, 6, { min: 0.9, max: 3.2, speed: 2.4 });
  const segs = 11;
  const segLen = (L - 1.0) / segs;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    for (let i = 0; i < segs; i++) {
      const x = X0 + 0.5 + segLen * (i + 0.5);
      const y = CY + (R + 0.045) * Math.cos(a);
      const z = CZ + (R + 0.045) * Math.sin(a);
      kit.add(pulse.keys[(i + k) % 6], new THREE.BoxGeometry(segLen - 0.12, 0.09, 0.5), { pos: [x, y, z], rot: [a, 0, 0] });
      // channel housing rails either side of the strip
      kit.add("paintedMetal", new THREE.BoxGeometry(segLen - 0.06, 0.08, 0.72), { pos: [x, CY + (R + 0.02) * Math.cos(a), CZ + (R + 0.02) * Math.sin(a)], rot: [a, 0, 0], color: PALETTE.impBlack, texel: 2 });
    }
  }
  ctx.anim((dt, t) => pulse.update(t));
  // cooling pipes along the top of the machine, dropping into the pump bank behind it
  const pumpX = [X0 + 3.2, X0 + 11.2, X0 + 19.2];
  [[0.0, 0.14, PALETTE.impMid], [0.45, 0.1, PALETTE.steel], [-0.45, 0.1, PALETTE.steel]].forEach(([a, r, col], k) => {
    const y = CY + (R + 0.55) * Math.cos(a);
    const z = CZ + (R + 0.55) * Math.sin(a);
    const off = (k - 1) * 0.7;
    const dz = min[2] + 0.9 + k * 0.3;
    const xa = pumpX[0] + off;
    const xb = pumpX[2] + off;
    pipeRun(kit, [[xa, 1.9, dz], [xa, y, dz], [xa, y, z], [xb, y, z], [xb, y, dz], [xb, 1.9, dz]], r, col);
    for (const x of [X0 + 6.5, X0 + 11.0, X0 + 15.5]) kit.box("metal", x, y, z, 0.3, r * 2.6, r * 2.6, { color: PALETTE.impBlack });
  });
  // cradles, each with a lit service panel on both faces
  for (const [x, i] of [[X0 + 2.0, 0], [X0 + 8.0, 1], [X0 + 14.0, 2], [X0 + 20.0, 3]]) {
    kit.box("paintedMetal", x, 0.3, CZ, 2.6, 0.6, 6.6, { color: PALETTE.impBlack, texel: 1.5 });
    kit.box("paintedMetal", x, 0.61, CZ, 2.6, 0.02, 6.6, { color: PALETTE.impLight, texel: 2 });
    for (const s of [-1, 1]) {
      kit.box("paintedMetal", x, 1.7, CZ + s * 2.55, 2.2, 2.2, 0.7, { color: PALETTE.impMid, texel: 1.5 });
      kit.add("paintedMetal", new THREE.BoxGeometry(2.2, 0.5, 1.4), { pos: [x, 2.55, CZ + s * 2.1], rot: [s * -0.7, 0, 0], color: PALETTE.impMid, texel: 1.5 });
      const fz = CZ + s * 2.905;
      const rotY = s > 0 ? 0 : Math.PI;
      kit.box("impPanel", x, 1.7, fz, 1.7, 1.5, 0.02, { color: PALETTE.impDark, uv: "keep" });
      kit.box("darkGloss", x - 0.35, 1.95, fz + s * 0.012, 0.66, 0.4, 0.01);
      kit.add(i % 2 ? "impScreen2" : "impScreen1", new THREE.PlaneGeometry(0.6, 0.34), { pos: [x - 0.35, 1.95, fz + s * 0.02], rot: [0, rotY, 0], uv: "keep" });
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) kit.box(c === 3 && r === 1 ? "emitRedDim" : rand() < 0.7 ? "emitBlueDim" : "emitAmberDim", x + 0.25 + c * 0.14, 2.08 - r * 0.2, fz + s * 0.016, 0.06, 0.04, 0.01);
      kit.box("leds", x + 0.45, 1.68, fz + s * 0.016, 0.5, 0.03, 0.01, { uv: "keep" });
      kit.box("emitBlueDim", x, 1.1, fz + s * 0.016, 1.5, 0.06, 0.01, { uv: "keep" });
      kit.box("rubber", x + 0.5, 1.4, fz + s * 0.04, 0.12, 0.2, 0.06, { color: PALETTE.rubber });
      kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [x - 0.55, 1.4, fz + s * 0.012], rot: [0, rotY, 0], uv: "keep", uvRect: decalRect(i === 2 ? 5 : 14) });
    }
    kit.box("metal", x, 0.9, CZ, 2.4, 0.6, 1.6, { color: PALETTE.gunmetal });
  }
  kit.collider([X0 - 1.5, 0.6, CZ - R], [X1 + 1.5, CY + R + 0.6, CZ + R], "motivator");
  for (const x of [X0 + 2.0, X0 + 8.0, X0 + 14.0, X0 + 20.0]) kit.collider([x - 1.3, 0, CZ - 3.3], [x + 1.3, 2.8, CZ + 3.3], "cradle");
  floorBorder(kit, X0 - 1.2, CZ - 3.6, X1 + 1.2, CZ + 3.6, { w: 0.12, color: PALETTE.impBlue });
  // blue kerb light along the near side of the machine footprint (reads from the door)
  kit.boxMM("paintedMetal", [X0 - 0.8, 0, CZ + 3.2], [X1 + 0.8, 0.05, CZ + 3.32], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitBlueDim", [X0 - 0.6, 0.05, CZ + 3.24], [X1 + 0.6, 0.06, CZ + 3.28], { uv: "keep" });
  // conduits from the far dome into the xmax wall
  for (const [y, z, r] of [[6.0, CZ - 1.0, 0.4], [6.0, CZ + 1.0, 0.4], [1.0, CZ, 0.55]]) {
    pipeRun(kit, [[X1 + 0.9, y === 1.0 ? 1.6 : CY + 1.2, z], [X1 + 1.6, y, z], [max[0] - 0.05, y, z]], r, PALETTE.impMid);
    kit.box("paintedMetal", max[0] - 0.2, y, z, 0.4, r * 2.8, r * 2.8, { color: PALETTE.impBlack, texel: 2 });
  }
  // pump bank behind the machine (zmin strip)
  for (let i = 0; i < 3; i++) {
    const x = pumpX[i];
    kit.box("paintedMetal", x, 0.7, min[2] + 1.2, 3.0, 1.4, 1.6, { color: PALETTE.impDark, texel: 1.5 });
    kit.cyl("metal", x - 0.7, 1.75, min[2] + 1.2, 0.5, 0.7, "y", { color: PALETTE.impMid, segments: 20 });
    kit.cyl("metal", x + 0.7, 1.75, min[2] + 1.2, 0.5, 0.7, "y", { color: PALETTE.impMid, segments: 20 });
    kit.box("paintedMetal", x, 0.06, min[2] + 1.2, 3.0, 0.1, 1.62, { color: PALETTE.impBlack, texel: 2 });
    kit.box("impScreen4", x, 1.05, min[2] + 2.01, 0.6, 0.3, 0.01, { uv: "keep" });
    kit.box(i === 1 ? "emitRed" : "emitAmber", x - 1.0, 1.05, min[2] + 2.01, 0.12, 0.06, 0.01);
    kit.collider([x - 1.5, 0, min[2] + 0.4], [x + 1.5, 2.1, min[2] + 2.0], "pump");
  }
  // lit service panels high on the zmin wall above the machine (the far half of the room)
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    for (const x of [14.5, 19.5, 31.0]) {
      const u = x - min[0];
      frame.box("paintedMetal", u, 6.6, 0.05, 2.4, 0.5, 0.1, { color: PALETTE.impDark, texel: 2 });
      frame.box("emitStrip", u, 6.6, 0.106, 2.1, 0.28, 0.01, { uv: "keep" });
      frame.box("emitBlueDim", u, 6.25, 0.106, 2.1, 0.03, 0.01, { uv: "keep" });
    }
    wallScreen(kit, ctx, { side: "zmin", u: 17.0 - min[0], v: 6.7, w: 1.8, h: 1.0, screen: 2 });
  }

  // ---------------------------------------------------------------- gantry ring at y = 3.2
  const GY = 3.2;
  const gx0 = 6.4;
  const gx1 = max[0];
  const ex0 = X1 + 1.1; // xmax end slab starts here
  const zn0 = CZ + R - 0.1; // inner edge (near, +z side)
  const zn1 = zn0 + 2.4;
  const zf1 = CZ - R + 0.1;
  const zf0 = zf1 - 2.4;
  platform(kit, ctx, { x0: gx0, z0: zn0, x1: ex0, z1: zn1, y: GY, mat: "paintedMetal" });
  platform(kit, ctx, { x0: gx0, z0: zf0, x1: gx1, z1: zf1, y: GY, mat: "paintedMetal" });
  platform(kit, ctx, { x0: gx0, z0: zf1, x1: gx0 + 2.0, z1: zn0, y: GY, mat: "paintedMetal" });
  platform(kit, ctx, { x0: ex0, z0: zf1, x1: gx1, z1: zn0, y: GY, mat: "paintedMetal" });
  platform(kit, ctx, { x0: ex0, z0: zn0, x1: gx1 - 2.0, z1: zn1, y: GY, mat: "paintedMetal" });
  // toe boards along the inner edges, blue under-deck light lines and support columns with lit strips
  kit.boxMM("paintedMetal", [gx0 + 2.0, GY, zn0], [ex0, GY + 0.12, zn0 + 0.06], { color: PALETTE.impLight, texel: 2 });
  kit.boxMM("paintedMetal", [gx0 + 2.0, GY, zf1 - 0.06], [ex0, GY + 0.12, zf1], { color: PALETTE.impLight, texel: 2 });
  kit.boxMM("paintedMetal", [gx0 + 2.2, GY - 0.36, zn1 - 0.4], [ex0 - 0.2, GY - 0.3, zn1 - 0.2], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitBlueDim", [gx0 + 2.4, GY - 0.37, zn1 - 0.35], [ex0 - 0.4, GY - 0.36, zn1 - 0.25], { uv: "keep" });
  kit.boxMM("paintedMetal", [gx0 + 2.2, GY - 0.36, zf0 + 0.2], [gx1 - 0.2, GY - 0.3, zf0 + 0.4], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitBlueDim", [gx0 + 2.4, GY - 0.37, zf0 + 0.25], [gx1 - 0.4, GY - 0.36, zf0 + 0.35], { uv: "keep" });
  for (let x = gx0 + 1.0; x < gx1 - 0.5; x += 4.2) {
    for (const z of [zn1 - 0.3, zf0 + 0.3]) {
      if (z > CZ && x > ex0) continue;
      kit.box("paintedMetal", x, (GY - 0.3) / 2, z, 0.3, GY - 0.3, 0.3, { color: PALETTE.impDark, texel: 2 });
      kit.box("paintedMetal", x, 0.1, z, 0.5, 0.2, 0.5, { color: PALETTE.impBlack, texel: 2 });
      const s = z > CZ ? 1 : -1;
      kit.box("emitBlueDim", x, 1.6, z + s * 0.155, 0.05, 1.8, 0.01, { uv: "keep" });
      kit.collider([x - 0.16, 0, z - 0.16], [x + 0.16, GY, z + 0.16], "column");
    }
  }
  // stairs A: along x on the near side, landing joins the near slab
  const sa0 = 30.2;
  const saTop = sa0 - 5.4;
  stairs(kit, ctx, { x: sa0, z: zn1 + 1.05, y0: 0, y1: GY, axis: "x", dir: -1, w: 2.0 });
  platform(kit, ctx, { x0: saTop - 1.4, z0: zn1, x1: saTop, z1: zn1 + 2.1, y: GY, mat: "paintedMetal" });
  kit.collider([saTop, 0, zn1 + 2.05], [sa0, GY + 1.1, zn1 + 2.15], "stairside");
  railing(kit, saTop - 1.4, zn1, saTop - 1.4, zn1 + 2.1, GY);
  railing(kit, saTop - 1.4, zn1 + 2.1, saTop, zn1 + 2.1, GY);
  // stairs B: along z against the xmax wall onto the far-end slab
  stairs(kit, ctx, { x: gx1 - 1.0, z: zn0 + 5.4, y0: 0, y1: GY, axis: "z", dir: -1, w: 2.0 });
  kit.collider([gx1 - 2.05, 0, zn0], [gx1 - 1.95, GY + 1.1, zn0 + 5.4], "stairside");
  // outer railings (gaps where the stairs land)
  railing(kit, gx0, zn1, saTop - 1.4, zn1, GY);
  railing(kit, saTop, zn1, gx1 - 2.0, zn1, GY);
  railing(kit, gx0, zf0, gx1, zf0, GY);
  railing(kit, gx0, zf0, gx0, zn1, GY);
  // red safety lamps on the gantry corners
  for (const [x, z] of [[gx0 + 0.3, zn1 - 0.3], [gx0 + 0.3, zf0 + 0.3], [gx1 - 0.4, zf0 + 0.3]]) {
    kit.box("paintedMetal", x, GY + 1.25, z, 0.08, 0.5, 0.08, { color: PALETTE.impDark, texel: 2 });
    warningLamp(kit, x, GY + 1.7, z, { r: 0.1 });
  }

  // ---------------------------------------------------------------- technician stations (+z half)
  const cz = -15.6;
  for (let i = 0; i < 4; i++) {
    const x = 13.4 + i * 3.3;
    impConsole(kit, ctx, { x, z: cz, yaw: 0, w: 2.4, d: 0.85, screens: i % 2 ? [2, 0, 2] : [2, 2], chair: true, seed: ctx.seed + i * 3, lampMat: i === 2 ? "emitRed" : "emitBlue" });
  }
  // master hyperdrive console (wide, tall) facing the machine on the +x end of the row
  impConsole(kit, ctx, { x: 27.6, z: cz, yaw: 0, w: 3.0, d: 0.9, screens: [2, 0, 2], chair: true, tall: true, seed: ctx.seed + 77, lampMat: "emitBlue" });
  // coolant tank bank along the zmax wall: two sizes, each dressed differently
  const tz = max[2] - 1.35;
  tank(kit, 12.0, tz, { r: 1.0, h: 4.4, color: PALETTE.impGrey, seed: ctx.seed, label: 5, front: -1, gauges: 2, valves: 1, ladder: true });
  tank(kit, 15.4, tz, { r: 0.72, h: 3.3, color: PALETTE.impMid, seed: ctx.seed + 1, label: 12, front: -1, gauges: 1, valves: 2, stripe: PALETTE.impBlue });
  tank(kit, 19.0, tz, { r: 1.0, h: 4.4, color: PALETTE.impGrey, seed: ctx.seed + 2, label: 14, front: -1, gauges: 1, valves: 1, inspect: true });
  tank(kit, 22.5, tz, { r: 0.72, h: 3.3, color: PALETTE.impMid, seed: ctx.seed + 3, label: 12, front: -1, gauges: 3, valves: 1, stripe: PALETTE.impAmber });
  tank(kit, 26.2, tz, { r: 1.0, h: 4.7, color: PALETTE.impDark, band: PALETTE.impGrey, seed: ctx.seed + 4, label: 5, front: -1, gauges: 2, valves: 2, ladder: true, stripe: PALETTE.impBlue });
  pipeRun(kit, [[12, 5.4, tz], [26.2, 5.4, tz], [27.6, 5.4, tz], [27.6, 6.6, tz], [27.6, 6.6, CZ + R + 0.9], [X1 - 2.0, 6.6, CZ + R + 0.9], [X1 - 2.0, 6.6, CZ + 0.9], [X1 - 2.0, CY + R + 0.15, CZ + 0.9]], 0.16, PALETTE.impMid);
  pipeRun(kit, [[12, 4.6, max[2] - 0.65], [26.4, 4.6, max[2] - 0.65]], 0.09, PALETTE.impBlue);
  // small-tank manifolds tie into the header
  for (const x of [15.4, 22.5]) pipeRun(kit, [[x, 3.6, tz], [x, 5.4, tz]], 0.08, PALETTE.steel);
  floorBorder(kit, 10.6, max[2] - 2.6, 27.8, max[2] - 0.2, { w: 0.1 });
  equipmentRack(kit, ctx, { side: "zmax", u: max[0] - 30.6, w: 1.6, h: 3.2, seed: ctx.seed + 21, lit: "emitBlue" });
  equipmentRack(kit, ctx, { side: "zmax", u: max[0] - 8.0, w: 1.6, h: 3.0, seed: ctx.seed + 22, lit: "emitAmber" });
  // logistics cabinets and racks along the xmax wall (south of the far-end stairs)
  for (const [z, h, s] of [[-13.4, 2.4, 1], [-12.0, 2.0, 2], [-10.6, 2.6, 3], [-8.2, 2.2, 4]]) cabinet(kit, max[0] - 0.36, z, { yaw: -Math.PI / 2, w: 1.3, h, d: 0.66, seed: ctx.seed + s * 5, screen: s % 2 ? 4 : 1, lamp: "emitBlueDim" });
  wallScreen(kit, ctx, { side: "xmax", u: 17.0, v: 3.3, w: 1.6, h: 0.9, screen: 2 });
  wallScreen(kit, ctx, { side: "xmax", u: 20.2, v: 3.3, w: 1.6, h: 0.9, screen: 0 });
  wallVent(kit, ctx, "xmax", 22.6, 4.4, 2.2, 0.8);
  wallVent(kit, ctx, "xmax", 5.0, 5.4, 2.2, 0.8);
  wallStencil(kit, ctx, "xmax", 18.6, 4.4, 0.8, 5);
  // lit bay sign on the far wall, the anchor of the 31 m view from the door
  signPlate(kit, ctx, { side: "xmax", u: -19 - min[2], v: 6.6, w: 5.2, h: 0.72, text: "Hyperdrive Motivator", sub: "Bay 04 · Class 2 · Standby", accent: "#4a9dff" });

  // ---------------------------------------------------------------- door wall (xmin) and zmax details
  const du = max[2] - -19; // door u along the xmin wall
  equipmentRack(kit, ctx, { side: "xmin", u: du - 5.6, w: 1.6, h: 3.0, seed: ctx.seed + 31, lit: "emitAmber" });
  equipmentRack(kit, ctx, { side: "xmin", u: du - 3.9, w: 1.6, h: 2.6, seed: ctx.seed + 32, lit: "emitBlue" });
  wallScreen(kit, ctx, { side: "xmin", u: du + 3.2, v: 1.8, w: 1.4, h: 0.8, screen: 2 });
  wallVent(kit, ctx, "xmin", du + 4.0, 4.6, 2.0, 0.8);
  wallVent(kit, ctx, "xmin", du - 8.0, 4.6, 2.0, 0.8);
  wallStencil(kit, ctx, "xmin", du + 5.2, 2.2, 0.8, 13);
  // "HYPERDRIVE" sign strip above the door, inside
  const segX = wallSegment(ctx.bounds, "xmin");
  const { frame: fx } = wallFrame(kit, segX.from, segX.to, 0);
  fx.box("paintedMetal", du, 4.0, 0.06, 3.6, 0.42, 0.12, { color: PALETTE.impBlack, texel: 2 });
  fx.box("leds", du, 4.0, 0.125, 3.2, 0.14, 0.01, { uv: "keep" });
  fx.box("emitRed", du - 1.5, 4.0, 0.125, 0.12, 0.12, 0.01);
  fx.box("emitRed", du + 1.5, 4.0, 0.125, 0.12, 0.12, 0.01);
  warningLamp(kit, min[0] + 0.25, 4.9, -19 - 2.2, { r: 0.12 });
  warningLamp(kit, min[0] + 0.25, 4.9, -19 + 2.2, { r: 0.12 });
  wallVent(kit, ctx, "zmax", 4.0, 6.2, 2.4, 0.9);
  wallVent(kit, ctx, "zmax", 28.0, 6.2, 2.4, 0.9);
  wallStencil(kit, ctx, "zmax", 30.6, 2.4, 0.9, 7);
  wallVent(kit, ctx, "zmin", 8.0, 5.8, 2.4, 0.9);
  wallVent(kit, ctx, "zmin", 24.0, 5.8, 2.4, 0.9);

  // floor markings (stencils only where they read as paint, never as light blocks on the deck)
  floorStencil(kit, 6.2, -22.2, 1.0, 5, Math.PI / 2);
  floorStencil(kit, 7.4, -16.2, 1.0, 14, 0);
  for (let i = 0; i < 6; i++) floorStencil(kit, 11 + i * 4.2, -18.2, 0.5, 2, Math.PI / 2, 0.006);

  // ---------------------------------------------------------------- overhead
  cableTray(kit, [min[0] + 1.0, -12.5], [max[0] - 1.0, -12.5], H - 0.9, { w: 0.6, ceil: H, cables: 5, seed: 3 });
  cableTray(kit, [min[0] + 1.0, -19.5], [max[0] - 1.0, -19.5], H - 0.9, { w: 0.6, ceil: H, cables: 4, seed: 4 });
  cableTray(kit, [8.0, -31.2], [8.0, -7.0], H - 1.1, { w: 0.45, ceil: H, cables: 3, seed: 5 });
  cableTray(kit, [30.0, -31.2], [30.0, -7.0], H - 1.1, { w: 0.45, ceil: H, cables: 3, seed: 6 });
  // hanging blue flood fixtures over the near flank of the machine
  const FZ = CZ + 2.6;
  for (const x of [13, 20.5, 28]) {
    kit.box("rubber", x, H - 0.55, FZ, 0.04, 1.1, 0.04, { color: PALETTE.rubber });
    kit.box("paintedMetal", x, H - 1.2, FZ, 2.2, 0.3, 0.9, { color: PALETTE.impBlack, texel: 2 });
    kit.box("hyp_flood", x, H - 1.36, FZ, 2.0, 0.02, 0.7, { uv: "keep" });
  }
  // lights (8): two blue floods, blue under-machine and under-gantry, amber consoles / tanks, cool door and far fill
  ctx.light(pointLight(0x9fc4ff, 18, 22, [14, H - 1.6, FZ]));
  ctx.light(pointLight(0x9fc4ff, 18, 22, [27, H - 1.6, FZ]));
  ctx.light(pointLight(BLUE, 12, 14, [20.5, 0.9, CZ]));
  ctx.light(pointLight(BLUE, 9, 11, [12.5, 2.4, zn1 - 1.0]));
  ctx.light(pointLight(AMBER, 7, 11, [19, 4.6, -13.5]));
  ctx.light(pointLight(AMBER_DEEP, 6, 10, [20, 5.0, max[2] - 2.4]));
  ctx.light(pointLight(COOL, 7, 11, [7.0, 4.5, -20.5]));
  ctx.light(pointLight(COOL, 8, 12, [11, 5.2, min[2] + 2.6]));
  void rand;
}
