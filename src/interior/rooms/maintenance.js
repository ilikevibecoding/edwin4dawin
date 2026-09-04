// Maintenance and repair bay (deck C, 8 m): an overhead gantry crane rides rails along the port and
// starboard walls and slowly travels the length of the bay with its hoist; a disassembled turbolaser
// barrel and its breech sit on cradles under it inside yellow floor lines. Workbenches with pegboards
// line the port wall, labelled parts racks the starboard wall; a welding bay behind orange curtains, a
// droid recharge alcove and a caged parts lift take the aft wall, an equipment cage the corner by the
// door. Tool carts, hanging caged work lights, floor markings; amber work light with cool fill.
import * as THREE from "three";
import { Kit } from "../../kit.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { decalRect } from "../../textures.js";
import {
  yawFrame,
  beamBetween,
  pipeRun,
  valveWheel,
  railing,
  cableTray,
  cageLight,
  floorStrip,
  floorRect,
  stencil,
  gauge,
  toolCluster,
  toolCart,
  coarseWalls,
} from "./deckCProps.js";

const RAIL_IN = 1.3; // crane rails this far from the side walls
const RAIL_TOP = 6.3; // rail top above the floor

// Workbench in a yaw frame: back edge against the wall at n < 0, worker stands at n > 0.
function workbench(kit, f, seed) {
  const L = 2.6;
  const D = 0.9;
  f.box("metal", 0, 0.88, 0, L, 0.08, D, { color: PALETTE.steel, texel: 2 });
  f.box("paintedMetal", 0, 0.42, 0, L - 0.1, 0.84, D - 0.1, { color: PALETTE.gunmetal, texel: 1.5 });
  f.box("hazard", 0, 0.07, D / 2 - 0.045, L - 0.1, 0.1, 0.01, { texel: 3 });
  for (let d = 0; d < 2; d++) {
    for (const u of [-0.85, 0, 0.85]) {
      f.box("satinBlack", u, 0.3 + d * 0.3, D / 2 - 0.04, 0.72, 0.24, 0.01);
      f.box("metal", u, 0.3 + d * 0.3, D / 2 - 0.02, 0.4, 0.025, 0.02, { color: PALETTE.steel });
    }
  }
  // vice, tools, pegboard with hanging tools, shelf with a task light
  f.box("metal", L / 2 - 0.3, 0.99, D / 2 - 0.18, 0.2, 0.14, 0.26, { color: PALETTE.darkMetal, texel: 2 });
  f.cylU("metal", L / 2 - 0.3, 1.02, D / 2 - 0.02, 0.012, 0.32, { color: PALETTE.steel, segments: 6 });
  const p = f.pos(-0.45, 0.92, 0);
  toolCluster(kit, p.x, p.y, p.z, seed);
  f.box("satinBlack", 0, 1.65, -D / 2 - 0.05, L, 1.1, 0.04);
  for (let k = 0; k < 8; k++) {
    const u = -L / 2 + 0.25 + k * 0.3;
    const h = 0.22 + ((k * 7 + seed) % 4) * 0.1;
    f.box("metal", u, 1.75 - h / 2, -D / 2 - 0.015, 0.05, h, 0.03, { color: k % 3 ? PALETTE.steel : PALETTE.orange });
    f.box("metal", u, 1.78, -D / 2 - 0.015, 0.12, 0.03, 0.03, { color: PALETTE.gunmetal });
  }
  f.box("leds", L / 2 - 0.35, 2.1, -D / 2 - 0.02, 0.5, 0.04, 0.01, { uv: "keep" });
  f.add("decal", new THREE.PlaneGeometry(0.4, 0.4), -L / 2 + 0.4, 2.05, -D / 2 - 0.028, { uv: "keep", uvRect: decalRect(6) });
  f.box("metal", 0, 2.3, -D / 2 + 0.12, L, 0.04, 0.34, { color: PALETTE.darkMetal, texel: 2 });
  f.box("emitWarmSoft", 0, 2.27, -D / 2 + 0.16, L - 0.3, 0.02, 0.1, { uv: "keep" });
  f.collider(-L / 2, L / 2, 0, 1.0, -D / 2, D / 2 + 0.05, "bench");
  const sp = f.pos(0.45, 0, D / 2 + 0.45);
  kit.cyl("metal", sp.x, sp.y + 0.3, sp.z, 0.03, 0.6, "y", { color: PALETTE.gunmetal, segments: 8 });
  kit.cyl("metal", sp.x, sp.y + 0.02, sp.z, 0.2, 0.04, "y", { color: PALETTE.darkMetal, segments: 14 });
  kit.cyl("rubber", sp.x, sp.y + 0.63, sp.z, 0.19, 0.06, "y", { color: PALETTE.rubber, segments: 14 });
  kit.collider([sp.x - 0.2, sp.y, sp.z - 0.2], [sp.x + 0.2, sp.y + 0.7, sp.z + 0.2], "stool");
}

// Parts rack with labelled bins in a yaw frame (back at n < 0).
function partsRack(f, seed) {
  const Wd = 2.6;
  const D = 1.0;
  const H = 3.6;
  for (const s of [-1, 1]) for (const n of [-D / 2 + 0.05, D / 2 - 0.05]) f.box("metal", s * (Wd / 2 - 0.04), H / 2, n, 0.08, H, 0.08, { color: PALETTE.gunmetal, texel: 2 });
  const cols = [PALETTE.orange, PALETTE.slate, PALETTE.tealPaint, PALETTE.gunmetal, PALETTE.creamDark];
  for (let lv = 0; lv < 5; lv++) {
    const v = 0.25 + lv * 0.8;
    f.box("metal", 0, v, 0, Wd, 0.05, D, { color: PALETTE.steel, texel: 2 });
    f.box("paintedMetal", 0, v - 0.07, D / 2 - 0.02, Wd, 0.12, 0.03, { color: PALETTE.darkMetal, texel: 2 });
    const nb = 4 + (lv % 2);
    const bw = (Wd - 0.2) / nb;
    for (let b = 0; b < nb; b++) {
      if ((b * 5 + lv * 3 + seed) % 7 === 0) continue;
      const u = -Wd / 2 + 0.1 + bw * (b + 0.5);
      const bh = lv === 4 ? 0.3 : 0.42;
      f.box("painted", u, v + 0.025 + bh / 2, -0.05, bw - 0.08, bh, D - 0.3, { color: cols[(b + lv + seed) % 5], uv: "keep" });
      f.add("decal", new THREE.PlaneGeometry(0.2, 0.2), u, v + 0.22, D / 2 - 0.2 + 0.002, { uv: "keep", uvRect: decalRect([8, 9, 14, 11][(b + lv + seed) % 4]) });
    }
  }
  f.box("satinBlack", 0, H + 0.1, 0, Wd, 0.3, D);
  f.box("emitAmber", 0, H + 0.1, D / 2 + 0.005, Wd - 0.5, 0.06, 0.01, { uv: "keep" });
  f.add("decal", new THREE.PlaneGeometry(0.28, 0.28), -Wd / 2 + 0.25, H + 0.1, D / 2 + 0.008, { uv: "keep", uvRect: decalRect(2) });
  f.collider(-Wd / 2 - 0.05, Wd / 2 + 0.05, 0, H + 0.3, -D / 2, D / 2 + 0.05, "rack");
}

// Gantry crane bridge, trolley and hoist as its own merged group (moved along z by the room's update).
function buildCrane(ctx, xa, xb, yBase) {
  const ck = new Kit(ctx.materials);
  const span = xb - xa;
  const cx = (xa + xb) / 2;
  const y = yBase + 0.6; // girder bottom
  ck.box("paintedMetal", cx, y + 0.5, 0, span, 1.0, 0.7, { color: PALETTE.gunmetal, texel: 1 });
  ck.box("hazard", cx, y + 0.5, 0.351, span - 2.0, 0.28, 0.01, { texel: 3 });
  ck.box("hazard", cx, y + 0.5, -0.351, span - 2.0, 0.28, 0.01, { texel: 3 });
  ck.box("metal", cx, y + 1.05, 0, span, 0.1, 0.9, { color: PALETTE.darkMetal, texel: 2 });
  for (let x = xa + 2.0; x < xb - 1.0; x += 2.0) ck.box("metal", x, y + 0.5, 0, 0.12, 0.98, 0.76, { color: PALETTE.darkMetal, texel: 2 });
  for (const ex of [xa, xb]) {
    ck.box("metal", ex, yBase + 0.3, 0, 1.4, 0.6, 1.6, { color: PALETTE.darkMetal, texel: 1.5 });
    ck.box("painted", ex, yBase + 0.62, 0, 1.0, 0.06, 1.2, { color: PALETTE.orange, uv: "keep" });
    for (const wz of [-0.55, 0.55]) ck.cyl("metal", ex, yBase + 0.25, wz, 0.25, 1.5, "x", { color: PALETTE.steel, segments: 16 });
  }
  // trolley with hoist drum, beacons and a two-fall hook block
  const tx = xa + span * 0.4;
  ck.box("paintedMetal", tx, y - 0.5, 0, 1.6, 0.9, 1.3, { color: PALETTE.slate, texel: 1 });
  ck.box("metal", tx, y - 0.02, 0, 1.8, 0.1, 1.5, { color: PALETTE.darkMetal, texel: 2 });
  ck.cyl("metal", tx, y - 1.15, 0, 0.28, 1.2, "x", { color: PALETTE.gunmetal, segments: 16 });
  for (const s of [-1, 1]) ck.box("emitOrange", tx, y - 0.3, s * 0.655, 0.5, 0.1, 0.01, { uv: "keep" });
  ck.box("emitAmber", tx + 0.805, y - 0.5, 0, 0.01, 0.3, 0.6, { uv: "keep" });
  const hookY = y - 4.1;
  for (const dx of [-0.18, 0.18]) ck.cyl("metal", tx + dx, (y - 1.15 + hookY + 0.3) / 2, 0, 0.014, y - 1.15 - hookY - 0.3, "y", { color: PALETTE.steel, segments: 6 });
  ck.box("metal", tx, hookY, 0, 0.6, 0.6, 0.32, { color: PALETTE.darkMetal, texel: 2 });
  ck.box("hazard", tx, hookY, 0.161, 0.6, 0.14, 0.01, { texel: 3 });
  ck.box("hazard", tx, hookY, -0.161, 0.6, 0.14, 0.01, { texel: 3 });
  ck.add("metal", new THREE.TorusGeometry(0.26, 0.05, 8, 20, Math.PI * 1.5), { pos: [tx, hookY - 0.58, 0], rot: [0, 0, (3 * Math.PI) / 4], color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
  const g = new THREE.Group();
  g.name = "gantryCrane";
  ck.build(g);
  return g;
}

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", lights: false, lightRows: 3, skipWalls: ["-x", "+x", "-z", "+z"] });
  coarseWalls(kit, room, lib, shell, { seed: 6300 });
  const y0 = shell.y0;
  const yTop = shell.yTop;
  const { x0, x1, z0, z1 } = room;
  const WT = lib.WALL_T;

  // ---------------------------------------------------------------- floor markings: entry runner, walk lane, work zones
  kit.boxMM("deck", [68.6, y0, 465.0], [71.4, y0 + 0.006, z1 - 0.2], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  floorStrip(kit, 68.5, 465.0, 68.6, z1 - 0.3, y0);
  floorStrip(kit, 71.4, 465.0, 71.5, z1 - 0.3, y0);
  floorStrip(kit, 57.0, 465.0, 86.0, 465.1, y0);
  floorStrip(kit, 57.0, 467.1, 86.0, 467.2, y0);
  stencil(kit, 70, y0 + 0.009, 475.4, 1.4, 1, "up");
  stencil(kit, 70, y0 + 0.009, 466.1, 1.2, 3, "up");

  // ---------------------------------------------------------------- gantry crane: wall girders, rails, brackets, travelling bridge
  const railW = x0 + RAIL_IN;
  const railE = x1 - RAIL_IN;
  const rt = y0 + RAIL_TOP;
  for (const [rx, wx, s] of [[railW, x0, 1], [railE, x1, -1]]) {
    kit.boxMM("paintedMetal", [rx - 0.15, rt - 0.4, 446.0], [rx + 0.15, rt, 476.5], { color: PALETTE.gunmetal, texel: 1 });
    kit.boxMM("metal", [rx - 0.2, rt - 0.45, 446.0], [rx + 0.2, rt - 0.38, 476.5], { color: PALETTE.steel, texel: 2 });
    kit.boxMM("paintedMetal", [Math.min(wx, wx + s * 0.3), rt - 1.0, 445.5], [Math.max(wx, wx + s * 0.3), rt - 0.3, 477.0], { color: PALETTE.darkMetal, texel: 1 });
    for (let z = 447.0; z < 477; z += 4.0) {
      kit.boxMM("paintedMetal", [Math.min(wx, rx), rt - 0.95, z - 0.15], [Math.max(wx, rx), rt - 0.45, z + 0.15], { color: PALETTE.gunmetal, texel: 1.5 });
      beamBetween(kit, "metal", [wx, rt - 2.2, z], [rx - s * 0.1, rt - 1.0, z], 0.12, 0.12, { color: PALETTE.steel, texel: 2 });
      kit.box("hazard", rx, rt - 0.72, z, 0.32, 0.12, 0.34, { texel: 3 });
    }
    for (const ze of [446.2, 476.3]) kit.box("painted", rx, rt + 0.25, ze, 0.5, 0.5, 0.25, { color: PALETTE.orange, uv: "keep" });
  }
  {
    const crane = buildCrane(ctx, railW, railE, rt);
    const zA = 449.5;
    const zB = 472.5;
    const period = 96;
    let t = 31;
    crane.position.z = zA;
    ctx.dynamic.push({
      object: crane,
      update(dt) {
        t += dt;
        const p = (t % period) / period;
        const s = p < 0.5 ? p * 2 : 2 - p * 2;
        crane.position.z = zA + (zB - zA) * s * s * (3 - 2 * s);
      },
    });
  }

  // ---------------------------------------------------------------- centre: disassembled turbolaser barrel and breech on cradles
  {
    const bz = 458.0;
    const by = y0 + 1.55;
    const bx0 = 61.0;
    const bx1 = 72.0;
    kit.cyl("paintedMetal", (bx0 + bx1) / 2, by, bz, 0.72, bx1 - bx0, "x", { color: PALETTE.slate, segments: 32, texel: 0.7 });
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + Math.PI / 8;
      kit.add("metal", new THREE.BoxGeometry(bx1 - bx0 - 1.2, 0.14, 0.2), { pos: [(bx0 + bx1) / 2, by + Math.cos(a) * 0.76, bz + Math.sin(a) * 0.76], rot: [a, 0, 0], color: PALETTE.gunmetal, texel: 1.5 });
    }
    for (const rx of [62.0, 64.6, 67.2, 69.8, 71.6]) kit.add("metal", new THREE.TorusGeometry(0.86, 0.1, 6, 28), { pos: [rx, by, bz], rot: [0, Math.PI / 2, 0], color: PALETTE.steel, uv: "scale", uvScale: [8, 1] });
    kit.cyl("darkGloss", bx0 - 0.005, by, bz, 0.5, 0.02, "x", { segments: 24 });
    kit.cyl("metal", bx1 + 0.1, by, bz, 0.95, 0.2, "x", { color: PALETTE.darkMetal, segments: 32 });
    // breech block, detached, with its collars and the exposed coil in the bore
    kit.cyl("paintedMetal", 74.6, by, bz, 1.2, 2.6, "x", { color: PALETTE.gunmetal, segments: 32, texel: 0.7 });
    for (const cxx of [73.5, 75.7]) kit.add("metal", new THREE.CylinderGeometry(1.42, 1.42, 0.5, 8), { pos: [cxx, by, bz], rot: [0, 0, Math.PI / 2], color: PALETTE.darkMetal, texel: 1 });
    kit.cyl("darkGloss", 73.29, by, bz, 0.55, 0.02, "x", { segments: 24 });
    kit.add("emitAmber", new THREE.TorusGeometry(0.72, 0.03, 6, 32), { pos: [73.28, by, bz], rot: [0, Math.PI / 2, 0], uv: "keep" });
    kit.add("emitAmber", new THREE.TorusGeometry(0.9, 0.02, 6, 32), { pos: [73.27, by, bz], rot: [0, Math.PI / 2, 0], uv: "keep" });
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      kit.cyl("rubber", 73.6, by + Math.cos(a) * 1.05, bz + Math.sin(a) * 1.05, 0.03, 0.9, "x", { color: k % 2 ? PALETTE.orange : PALETTE.rubber, segments: 6 });
    }
    // cradles
    const cradle = (sx, top, half) => {
      for (const s of [-1, 1]) {
        beamBetween(kit, "paintedMetal", [sx, y0 + 0.1, bz + s * half], [sx, top - 0.05, bz + s * 0.3], 0.16, 0.16, { color: PALETTE.gunmetal, texel: 2 });
        kit.box("metal", sx, y0 + 0.05, bz + s * half, 0.6, 0.1, 0.3, { color: PALETTE.darkMetal, texel: 2 });
      }
      kit.box("paintedMetal", sx, top, bz, 0.3, 0.12, 0.8, { color: PALETTE.gunmetal, texel: 2 });
      kit.box("rubber", sx, top + 0.09, bz, 0.34, 0.06, 0.7, { color: PALETTE.rubber });
      kit.box("metal", sx, (y0 + top) / 2, bz, 0.06, top - y0 - 0.3, 0.06, { color: PALETTE.steel });
      kit.collider([sx - 0.3, y0, bz - half - 0.15], [sx + 0.3, top + 0.2, bz + half + 0.15], "cradle");
    };
    cradle(62.6, y0 + 0.78, 1.1);
    cradle(66.5, y0 + 0.78, 1.1);
    cradle(70.4, y0 + 0.78, 1.1);
    kit.box("paintedMetal", 74.6, y0 + 0.17, bz, 2.0, 0.34, 2.2, { color: PALETTE.darkMetal, texel: 1.5 });
    kit.box("hazard", 74.6, y0 + 0.2, bz, 2.02, 0.1, 2.22, { texel: 3 });
    kit.collider([bx0 - 0.1, y0, bz - 0.95], [bx1 + 0.2, y0 + 2.5, bz + 0.95], "barrel");
    kit.collider([73.2, y0, bz - 1.5], [76.0, y0 + 3.0, bz + 1.5], "breech");
    // loose parts: ring sections and a crate, diagnostics cart wired into the breech
    for (const [px, pz, spin] of [[59.6, 456.4, 0.3], [59.2, 459.4, -0.4]]) kit.add("metal", new THREE.TorusGeometry(0.86, 0.1, 6, 28), { pos: [px, y0 + 0.1, pz], rot: [Math.PI / 2, 0, spin], color: PALETTE.steel, uv: "scale", uvScale: [8, 1] });
    kit.box("painted", 77.6, y0 + 0.35, 455.6, 1.0, 0.7, 0.8, { color: PALETTE.slate, uv: "keep" });
    kit.box("metal", 77.6, y0 + 0.72, 455.6, 1.04, 0.04, 0.84, { color: PALETTE.darkMetal, texel: 2 });
    stencil(kit, 77.6, y0 + 0.35, 456.005, 0.4, 11, "+z");
    kit.collider([77.1, y0, 455.2], [78.1, y0 + 0.8, 456.0], "crate");
    const dc = yawFrame(kit, 76.6, y0, 461.2, Math.PI);
    dc.box("satinBlack", 0, 0.5, 0, 0.8, 1.0, 0.6);
    dc.box("screen6", 0, 0.9, 0.305, 0.6, 0.35, 0.01, { uv: "keep", tilt: -0.3 });
    dc.box("leds", 0, 0.55, 0.305, 0.5, 0.05, 0.01, { uv: "keep" });
    for (const [u, n] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) dc.cylU("rubber", u, 0.07, n, 0.07, 0.06, { color: PALETTE.rubber, segments: 10 });
    dc.collider(-0.45, 0.45, 0, 1.1, -0.35, 0.35, "diagCart");
    pipeRun(kit, "rubber", [[76.6, y0 + 0.9, 460.9], [76.6, y0 + 0.9, 459.9], [75.4, y0 + 0.4, 459.5], [74.2, y0 + 0.4, 459.3], [73.6, by + 1.05, 458.0]], 0.03, { color: PALETTE.rubber, segments: 6 });
    floorRect(kit, 59.0, 455.2, 78.4, 461.8, y0, 0.12);
    stencil(kit, 68.5, y0 + 0.009, 461.2, 0.6, 7, "up");
    stencil(kit, 64.0, y0 + 0.009, 455.8, 0.6, 15, "up");
    // the work lights over the barrel carry the middle of the 34 m bay: strong and long-reaching so the
    // pool still picks them from the door
    for (const x of [63.0, 67.5, 72.0]) cageLight(kit, ctx, x, yTop, bz, 2.6, { intensity: 150, distance: 26 });
    cageLight(kit, ctx, 75.6, yTop, 461.8, 2.6, { intensity: 80, distance: 20 });
  }

  // ---------------------------------------------------------------- port wall: workbenches, tall cabinets, pegboards
  for (const [i, z] of [449.5, 454.5, 459.5, 464.5].entries()) {
    workbench(kit, yawFrame(kit, x0 + WT + 0.45 + 0.04, y0, z, Math.PI / 2), i + 2);
    cageLight(kit, ctx, x0 + 1.3, yTop, z, 4.3, { intensity: 45, distance: 16 });
  }
  for (const z of [452.0, 462.0]) {
    kit.box("painted", x0 + WT + 0.3, y0 + 1.0, z, 0.6, 2.0, 0.9, { color: PALETTE.orange, uv: "keep" });
    kit.box("metal", x0 + WT + 0.605, y0 + 1.0, z, 0.01, 1.8, 0.8, { color: PALETTE.darkMetal });
    kit.box("metal", x0 + WT + 0.62, y0 + 1.1, z - 0.3, 0.02, 0.2, 0.03, { color: PALETTE.steel });
    stencil(kit, x0 + WT + 0.612, y0 + 1.6, z, 0.4, 6, "+x");
    kit.collider([x0, y0, z - 0.5], [x0 + WT + 0.65, y0 + 2.1, z + 0.5], "cabinet");
  }
  const W = shell.frames["-x"].frame; // u = z1 - z
  wallLightBar(W, 1.0, z1 - 466.5, 3.0);
  wallLightBar(W, z1 - 447.5, z1 - z0 - 1.0, 3.0);
  W.add("decal", new THREE.PlaneGeometry(0.6, 0.6), z1 - 467.2, 2.3, 0.005, { uv: "keep", uvRect: decalRect(13) });
  wallConsole(W, z1 - 469.0, 1.6, "screen6");
  toolCart(kit, 57.6, y0, 457.0, 1.2, 3);

  // ---------------------------------------------------------------- starboard wall: parts racks with labelled bins, rolling ladder
  for (const [i, z] of [451.5, 454.5, 457.5, 460.5, 463.5].entries()) partsRack(yawFrame(kit, x1 - WT - 0.52, y0, z, -Math.PI / 2), i);
  for (const z of [453.5, 460.5]) cageLight(kit, ctx, x1 - 2.2, yTop, z, 2.6, { intensity: 80, distance: 20 });
  {
    const lx = x1 - 2.3;
    const lz = 466.6;
    for (let s = 0; s < 6; s++) kit.box("metal", lx + 0.5 - s * 0.32, y0 + 0.3 + s * 0.4, lz, 0.5, 0.05, 0.06, { color: PALETTE.steel, texel: 2 });
    for (const dz of [-0.28, 0.28]) beamBetween(kit, "metal", [lx + 0.7, y0 + 0.1, lz + dz], [lx - 1.15, y0 + 2.4, lz + dz], 0.06, 0.06, { color: PALETTE.gunmetal, texel: 2 });
    for (const dz of [-0.28, 0.28]) kit.box("metal", lx - 1.15, y0 + 1.25, lz + dz, 0.06, 2.4, 0.06, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("metal", lx - 0.2, y0 + 2.4, lz, 1.9, 0.05, 0.62, { color: PALETTE.steel, texel: 2 });
    for (const [px, pz] of [[lx + 0.7, lz - 0.28], [lx + 0.7, lz + 0.28], [lx - 1.15, lz - 0.28], [lx - 1.15, lz + 0.28]]) kit.cyl("rubber", px, y0 + 0.08, pz, 0.08, 0.06, "z", { color: PALETTE.rubber, segments: 10 });
    kit.collider([lx - 1.25, y0, lz - 0.4], [lx + 0.8, y0 + 2.5, lz + 0.4], "ladder");
  }
  const E = shell.frames["+x"].frame; // u = z - z0
  wallLightBar(E, 1.0, 449.5 - z0, 3.0);
  wallLightBar(E, 466.0 - z0, z1 - z0 - 1.0, 3.0);
  wallConsole(E, 468.5 - z0, 1.6, "screen4");
  E.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 447.5 - z0, 2.3, 0.005, { uv: "keep", uvRect: decalRect(11) });

  // ---------------------------------------------------------------- aft wall: welding bay, droid recharge alcove, parts lift
  {
    // welding bay behind orange curtains
    const rails = [[[56.4, 450.6], [62.6, 450.6]], [[62.6, 445.0], [62.6, 450.6]]];
    for (const [a, b] of rails) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const f = new lib.Frame(kit, new THREE.Vector3(a[0], y0, a[1]), new THREE.Vector3(b[0] - a[0], 0, b[1] - a[1]), new THREE.Vector3(0, 1, 0));
      f.box("metal", len / 2, 2.62, 0, len + 0.1, 0.06, 0.1, { color: PALETTE.gunmetal, texel: 2 });
      for (let u = 0.3; u < len; u += 2.0) f.box("metal", u, 2.62 + (yTop - y0 - 2.62) / 2, 0, 0.04, yTop - y0 - 2.62, 0.04, { color: PALETTE.steel });
      const nP = Math.floor(len / 1.55);
      for (let k = 0; k < nP; k++) {
        const uc = 0.8 + k * 1.55;
        f.box("fabric", uc, 1.35, (k % 2 ? 0.03 : -0.03), 1.48, 2.5, 0.02, { color: PALETTE.fabricOrange, texel: 1 });
        for (let r = -0.6; r <= 0.6; r += 0.3) f.box("metal", uc + r, 2.6, 0, 0.03, 0.08, 0.03, { color: PALETTE.steel });
      }
      f.collider(0, len, 0, 2.6, -0.06, 0.06, "curtain");
    }
    stencil(kit, 62.61, y0 + 1.6, 448.0, 0.5, 13, "+x");
    stencil(kit, 59.5, y0 + 1.6, 450.61, 0.5, 1, "+z");
    // inside: welding table, gas bottle cart, welder, stool
    kit.box("metal", 59.0, y0 + 0.86, 447.4, 1.8, 0.08, 1.0, { color: PALETTE.steel, texel: 2 });
    for (const [dx, dz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) kit.box("metal", 59.0 + dx, y0 + 0.42, 447.4 + dz, 0.08, 0.84, 0.08, { color: PALETTE.gunmetal, texel: 2 });
    kit.cyl("metal", 59.0, y0 + 1.05, 447.4, 0.25, 0.3, "x", { color: PALETTE.darkMetal, segments: 20 });
    kit.box("metal", 59.5, y0 + 0.95, 447.6, 0.3, 0.1, 0.3, { color: PALETTE.gunmetal, texel: 2 });
    kit.collider([58.0, y0, 446.8], [60.0, y0 + 1.0, 448.0], "weldTable");
    kit.box("painted", 61.4, y0 + 0.45, 446.0, 0.7, 0.9, 0.5, { color: PALETTE.orange, uv: "keep" });
    kit.box("leds", 61.4, y0 + 0.75, 446.255, 0.4, 0.05, 0.01, { uv: "keep" });
    kit.box("emitOrange", 61.25, y0 + 0.6, 446.255, 0.06, 0.06, 0.01, { uv: "keep" });
    pipeRun(kit, "rubber", [[61.4, y0 + 0.9, 446.0], [61.0, y0 + 1.1, 446.6], [59.8, y0 + 0.95, 447.3]], 0.025, { color: PALETTE.rubber, segments: 6 });
    kit.collider([61.0, y0, 445.7], [61.8, y0 + 1.0, 446.3], "welder");
    for (const [k, gx] of [56.9, 57.25].entries()) {
      kit.cyl("painted", gx, y0 + 0.7, 448.8, 0.13, 1.3, "y", { color: k ? PALETTE.tealPaint : PALETTE.orange, uv: "keep", segments: 14 });
      kit.cyl("metal", gx, y0 + 1.42, 448.8, 0.05, 0.14, "y", { color: PALETTE.steel, segments: 10 });
    }
    kit.box("metal", 57.1, y0 + 0.05, 448.8, 0.9, 0.1, 0.5, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("metal", 57.1, y0 + 1.0, 449.06, 0.9, 0.04, 0.04, { color: PALETTE.gunmetal });
    kit.collider([56.6, y0, 448.5], [57.6, y0 + 1.5, 449.1], "gasCart");
    cageLight(kit, ctx, 59.5, yTop, 447.5, 4.2, { intensity: 45, distance: 14 });

    // droid recharge alcove (four bays)
    const ax0 = 64.0;
    const ax1 = 70.0;
    const aD = 1.0;
    const aH = 2.2;
    kit.boxMM("satinBlack", [ax0, y0, z0 + WT], [ax1, y0 + aH + 0.3, z0 + WT + 0.1]);
    kit.boxMM("satinBlack", [ax0, y0 + aH, z0 + WT], [ax1, y0 + aH + 0.3, z0 + WT + aD]);
    kit.boxMM("emitAmber", [ax0 + 0.3, y0 + aH + 0.12, z0 + WT + aD + 0.002], [ax1 - 0.3, y0 + aH + 0.18, z0 + WT + aD + 0.01], { uv: "keep" });
    kit.collider([ax0, y0 + aH, z0], [ax1, y0 + aH + 0.3, z0 + WT + aD], "alcoveTop");
    const nBays = 4;
    const bw = (ax1 - ax0) / nBays;
    for (let b = 0; b <= nBays; b++) {
      const px = ax0 + b * bw;
      kit.boxMM("satinBlack", [px - 0.05, y0, z0 + WT], [px + 0.05, y0 + aH, z0 + WT + aD]);
      kit.collider([px - 0.05, y0, z0], [px + 0.05, y0 + aH, z0 + WT + aD], "alcoveWall");
      if (b < nBays) {
        const bx = px + bw / 2;
        const bz = z0 + WT + aD * 0.55;
        kit.cyl("darkGloss", bx, y0 + 0.01, bz, 0.42, 0.02, "y", { segments: 24 });
        kit.add("emitBlue", new THREE.TorusGeometry(0.36, 0.015, 6, 32), { pos: [bx, y0 + 0.022, bz], rot: [Math.PI / 2, 0, 0], uv: "keep" });
        kit.box("satinBlack", bx, y0 + 1.1, z0 + WT + 0.16, 0.6, 0.7, 0.12);
        kit.box("leds", bx, y0 + 1.32, z0 + WT + 0.225, 0.45, 0.05, 0.01, { uv: "keep" });
        kit.box("emitBlue", bx, y0 + 1.0, z0 + WT + 0.225, 0.3, 0.12, 0.01, { uv: "keep" });
        kit.cyl("metal", bx, y0 + 0.75, z0 + WT + 0.25, 0.06, 0.16, "z", { color: PALETTE.steel, segments: 12 });
        kit.box("emitWhiteSoft", bx, y0 + aH - 0.012, bz, bw - 0.5, 0.02, 0.12, { uv: "keep" });
        kit.boxMM("hazard", [px + 0.1, y0 + 0.002, z0 + WT + aD], [px + bw - 0.1, y0 + 0.006, z0 + WT + aD + 0.25], { texel: 3 });
        stencil(kit, px + 0.051, y0 + 1.6, z0 + WT + aD - 0.3, 0.3, 8, "+x");
        if (b % 2 === 0) ctx.lights.teal.push(pointLight(0x6fb4ff, 14, 7, [px + bw, y0 + 1.9, bz]));
      }
    }
    stencil(kit, (ax0 + ax1) / 2, y0 + aH + 0.15, z0 + WT + aD + 0.02, 0.28, 4, "+z");

    // parts lift: raised platform in a hoist frame with two steps, railings and a control post
    const L = { x0: 78.2, x1: 82.2, z0: 445.2, z1: 449.2, y: y0 + 0.45 };
    kit.boxMM("paintedMetal", [L.x0 + 0.35, y0, L.z0 + 0.35], [L.x1 - 0.35, L.y - 0.1, L.z1 - 0.35], { color: PALETTE.darkMetal, texel: 1 });
    for (const [a, b] of [[[L.x0 + 0.35, L.z0 + 0.3], [L.x1 - 0.35, L.z0 + 0.3]], [[L.x0 + 0.35, L.z1 - 0.3], [L.x1 - 0.35, L.z1 - 0.3]], [[L.x0 + 0.3, L.z0 + 0.35], [L.x0 + 0.3, L.z1 - 0.35]], [[L.x1 - 0.3, L.z0 + 0.35], [L.x1 - 0.3, L.z1 - 0.35]]]) {
      beamBetween(kit, "metal", [a[0], y0 + 0.06, a[1]], [b[0], L.y - 0.14, b[1]], 0.05, 0.05, { color: PALETTE.steel, texel: 2 });
      beamBetween(kit, "metal", [a[0], L.y - 0.14, a[1]], [b[0], y0 + 0.06, b[1]], 0.05, 0.05, { color: PALETTE.steel, texel: 2 });
    }
    kit.boxMM("deck", [L.x0, L.y - 0.1, L.z0], [L.x1, L.y, L.z1], { color: PALETTE.impGrey, uv: "world", texel: 1 });
    kit.boxMM("hazard", [L.x0, L.y, L.z0], [L.x1, L.y + 0.004, L.z0 + 0.15], { texel: 3 });
    kit.boxMM("hazard", [L.x0, L.y, L.z1 - 0.15], [L.x1, L.y + 0.004, L.z1], { texel: 3 });
    kit.boxMM("hazard", [L.x0, L.y, L.z0], [L.x0 + 0.15, L.y + 0.004, L.z1], { texel: 3 });
    kit.boxMM("hazard", [L.x1 - 0.15, L.y, L.z0], [L.x1, L.y + 0.004, L.z1], { texel: 3 });
    kit.floor(L.x0, L.z0, L.x1, L.z1, L.y);
    kit.collider([L.x0, y0, L.z0], [L.x1, L.y, L.z1], "liftBase");
    kit.stairs("paintedMetal", L.x0 + 1.3, L.z1, L.x1 - 1.3, L.z1 + 0.7, y0, L.y, "z", { color: PALETTE.gunmetal, steps: 2 });
    railing(kit, L.x0, L.z1, L.x0 + 1.3, L.z1, L.y, { n0: -0.06 });
    railing(kit, L.x1 - 1.3, L.z1, L.x1, L.z1, L.y, { n0: -0.06 });
    railing(kit, L.x0, L.z0 + 0.4, L.x0, L.z1, L.y, { n0: 0.06 });
    railing(kit, L.x1, L.z0 + 0.4, L.x1, L.z1, L.y, { n0: -0.06 });
    for (const [px, pz] of [[L.x0 - 0.15, L.z0 - 0.15], [L.x1 + 0.15, L.z0 - 0.15], [L.x0 - 0.15, L.z1 + 0.15], [L.x1 + 0.15, L.z1 + 0.15]]) {
      kit.box("paintedMetal", px, y0 + 2.6, pz, 0.24, 5.2, 0.24, { color: PALETTE.gunmetal, texel: 1.5 });
      kit.box("hazard", px, y0 + 1.2, pz, 0.26, 0.5, 0.26, { texel: 3 });
      kit.collider([px - 0.13, y0, pz - 0.13], [px + 0.13, y0 + 5.2, pz + 0.13], "liftPost");
    }
    const fy = y0 + 5.1;
    kit.boxMM("paintedMetal", [L.x0 - 0.27, fy, L.z0 - 0.27], [L.x1 + 0.27, fy + 0.3, L.z0 - 0.03], { color: PALETTE.gunmetal, texel: 1.5 });
    kit.boxMM("paintedMetal", [L.x0 - 0.27, fy, L.z1 + 0.03], [L.x1 + 0.27, fy + 0.3, L.z1 + 0.27], { color: PALETTE.gunmetal, texel: 1.5 });
    kit.boxMM("paintedMetal", [L.x0 - 0.27, fy, L.z0 - 0.03], [L.x0 - 0.03, fy + 0.3, L.z1 + 0.03], { color: PALETTE.gunmetal, texel: 1.5 });
    kit.boxMM("paintedMetal", [L.x1 + 0.03, fy, L.z0 - 0.03], [L.x1 + 0.27, fy + 0.3, L.z1 + 0.03], { color: PALETTE.gunmetal, texel: 1.5 });
    const mx = (L.x0 + L.x1) / 2;
    const mz = (L.z0 + L.z1) / 2;
    kit.box("paintedMetal", mx, fy + 0.15, mz, 1.2, 0.3, L.z1 - L.z0 + 0.5, { color: PALETTE.gunmetal, texel: 1.5 });
    kit.box("paintedMetal", mx, fy - 0.3, mz, 1.0, 0.6, 0.9, { color: PALETTE.slate, texel: 1.5 });
    kit.box("emitOrange", mx, fy - 0.3, mz + 0.455, 0.4, 0.08, 0.01, { uv: "keep" });
    for (const [px, pz] of [[L.x0 + 0.4, L.z0 + 0.4], [L.x1 - 0.4, L.z0 + 0.4], [L.x0 + 0.4, L.z1 - 0.4], [L.x1 - 0.4, L.z1 - 0.4]]) kit.cyl("metal", px, (fy - 0.6 + L.y) / 2, pz, 0.012, fy - 0.6 - L.y, "y", { color: PALETTE.steel, segments: 6 });
    kit.box("emitWhiteSoft", mx, fy - 0.01, mz, 0.6, 0.02, 2.4, { uv: "keep" });
    // control post beside the steps
    const cp = yawFrame(kit, L.x1 + 0.7, y0, L.z1 + 0.5, 0);
    cp.box("satinBlack", 0, 0.6, 0, 0.3, 1.2, 0.3);
    cp.box("satinBlack", 0, 1.25, 0.05, 0.36, 0.14, 0.4, { tilt: -0.4 });
    cp.box("leds", 0, 1.3, 0.2, 0.25, 0.04, 0.01, { uv: "keep", tilt: -0.4 });
    cp.box("emitOrange", 0.08, 1.2, 0.2, 0.06, 0.06, 0.01, { uv: "keep", tilt: -0.4 });
    cp.collider(-0.2, 0.2, 0, 1.4, -0.2, 0.25, "liftPost");
    stencil(kit, mx, y0 + 0.009, L.z1 + 1.3, 0.8, 10, "up");
    floorRect(kit, L.x0 - 0.5, L.z0 - 0.5, L.x1 + 0.5, L.z1 + 1.4, y0, 0.1);
    ctx.lights.warm.push(pointLight(0xffc080, 50, 16, [mx, fy - 0.9, mz]));
  }
  const S = shell.frames["-z"].frame; // u = x - x0
  wallLightBar(S, 1.0, 62.0 - x0, 3.2);
  wallLightBar(S, 72.5 - x0, 77.0 - x0, 3.2);
  wallLightBar(S, 83.5 - x0, x1 - x0 - 1.0, 3.2);
  wallConsole(S, 74.5 - x0, 1.6, "screen6");
  wallConsole(S, 85.0 - x0, 1.6, "screen4");
  S.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 72.0 - x0, 2.4, 0.005, { uv: "keep", uvRect: decalRect(5) });
  S.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 76.5 - x0, 2.4, 0.005, { uv: "keep", uvRect: decalRect(10) });
  // coolant / air lines across the aft wall above the fixtures
  for (const [k, v] of [3.9, 4.25, 4.6].entries()) {
    S.cylU("metal", (x1 - x0) / 2, v, 0.25, 0.07 + k * 0.02, x1 - x0 - 1.4, { color: k === 1 ? PALETTE.orange : PALETTE.steel, segments: 10 });
    for (let u = 2.0; u < x1 - x0 - 1; u += 5.0) S.box("metal", u, v, 0.14, 0.24, 0.2, 0.28, { color: PALETTE.darkMetal, texel: 2 });
  }
  valveWheel(kit, 66.5, y0 + 4.25, z0 + 0.25 + 0.3, "z", 0.18, { stem: 0.02 });
  S.cylN("metal", 66.5 - x0, 4.25, 0.4, 0.025, 0.3, { color: PALETTE.gunmetal, segments: 8 });

  // ---------------------------------------------------------------- forward wall (door): equipment cage, board, trays
  {
    const c = { x0: 82.0, x1: x1 - WT - 0.3, z0: 471.0, z1: z1 - WT - 0.3, h: 2.6 };
    const mesh = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az);
      const g = new THREE.PlaneGeometry(len, c.h - 0.1);
      g.rotateY(-Math.atan2(bz - az, bx - ax));
      kit.add("grate", g, { pos: [(ax + bx) / 2, y0 + c.h / 2, (az + bz) / 2], uv: "scale", uvScale: [len / 0.45, (c.h - 0.1) / 0.33], color: 0xffffff });
      kit.collider([Math.min(ax, bx) - 0.03, y0, Math.min(az, bz) - 0.03], [Math.max(ax, bx) + 0.03, y0 + c.h, Math.max(az, bz) + 0.03], "cage");
    };
    mesh(c.x0, c.z0, c.x0, 472.6);
    mesh(c.x0, 473.9, c.x0, c.z1);
    mesh(c.x0, c.z0, c.x1, c.z0);
    mesh(c.x0, c.z1, c.x1, c.z1);
    mesh(c.x1, c.z0, c.x1, c.z1);
    for (const [px, pz] of [[c.x0, c.z0], [c.x0, c.z1], [c.x1, c.z0], [c.x1, c.z1], [c.x0, 472.6], [c.x0, 473.9], [c.x1, 473.9]]) kit.box("metal", px, y0 + c.h / 2, pz, 0.08, c.h, 0.08, { color: PALETTE.gunmetal, texel: 2 });
    kit.boxMM("metal", [c.x0 - 0.05, y0 + c.h - 0.05, c.z0 - 0.05], [c.x1 + 0.05, y0 + c.h + 0.05, c.z0 + 0.05], { color: PALETTE.gunmetal, texel: 2 });
    kit.boxMM("metal", [c.x0 - 0.05, y0 + c.h - 0.05, c.z1 - 0.05], [c.x1 + 0.05, y0 + c.h + 0.05, c.z1 + 0.05], { color: PALETTE.gunmetal, texel: 2 });
    kit.boxMM("metal", [c.x0 - 0.05, y0 + c.h - 0.05, c.z0], [c.x0 + 0.05, y0 + c.h + 0.05, c.z1], { color: PALETTE.gunmetal, texel: 2 });
    kit.boxMM("metal", [c.x1 - 0.05, y0 + c.h - 0.05, c.z0], [c.x1 + 0.05, y0 + c.h + 0.05, c.z1], { color: PALETTE.gunmetal, texel: 2 });
    kit.boxMM("paintedMetal", [c.x0 - 0.04, y0, c.z0], [c.x0 + 0.04, y0 + 0.12, c.z1], { color: PALETTE.darkMetal, texel: 2 });
    kit.boxMM("paintedMetal", [c.x0, y0, c.z0 - 0.04], [c.x1, y0 + 0.12, c.z0 + 0.04], { color: PALETTE.darkMetal, texel: 2 });
    // gate (closed) with lock box and a restricted stencil
    const gg = new THREE.PlaneGeometry(1.2, c.h - 0.2);
    gg.rotateY(-Math.PI / 2);
    kit.add("grate", gg, { pos: [c.x0 - 0.06, y0 + c.h / 2, 473.25], uv: "scale", uvScale: [1.2 / 0.45, (c.h - 0.2) / 0.33], color: 0xffffff });
    kit.box("metal", c.x0 - 0.06, y0 + c.h / 2, 473.25, 0.05, c.h - 0.2, 1.2, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("metal", c.x0 - 0.06, y0 + c.h / 2 - 0.02, 473.25, 0.06, 0.05, 1.16, { color: PALETTE.gunmetal });
    kit.box("satinBlack", c.x0 - 0.11, y0 + 1.1, 473.7, 0.06, 0.24, 0.16);
    kit.box("emitOrange", c.x0 - 0.145, y0 + 1.16, 473.7, 0.005, 0.03, 0.06, { uv: "keep" });
    stencil(kit, c.x0 - 0.15, y0 + 1.8, 473.25, 0.5, 5, "-x");
    kit.collider([c.x0 - 0.12, y0, 472.6], [c.x0 + 0.03, y0 + c.h, 473.9], "cageGate");
    // contents: two shelving units with crates
    for (const sz of [472.2, 475.2]) {
      kit.box("satinBlack", c.x1 - 0.55, y0 + 1.1, sz, 1.0, 2.2, 1.6);
      for (const v of [0.5, 1.2, 1.9]) kit.box("metal", c.x1 - 0.55, y0 + v, sz, 1.04, 0.04, 1.64, { color: PALETTE.steel, texel: 2 });
      for (const [v, dz, col] of [[0.55, -0.4, PALETTE.slate], [0.55, 0.4, PALETTE.orange], [1.25, -0.3, PALETTE.tealPaint], [1.25, 0.45, PALETTE.gunmetal]]) kit.box("painted", c.x1 - 0.55, y0 + v + 0.22, sz + dz, 0.8, 0.44, 0.6, { color: col, uv: "keep" });
    }
    kit.box("painted", c.x0 + 1.0, y0 + 0.4, 475.6, 1.2, 0.8, 1.0, { color: PALETTE.slate, uv: "keep" });
    kit.box("painted", c.x0 + 1.0, y0 + 1.1, 475.6, 0.9, 0.6, 0.8, { color: PALETTE.orange, uv: "keep" });
    kit.box("emitWhiteSoft", (c.x0 + c.x1) / 2, y0 + c.h - 0.05, (c.z0 + c.z1) / 2, 0.16, 0.02, c.z1 - c.z0 - 1.0, { uv: "keep" });
    kit.box("satinBlack", (c.x0 + c.x1) / 2, y0 + c.h - 0.02, (c.z0 + c.z1) / 2, 0.24, 0.04, c.z1 - c.z0 - 0.9);
    kit.boxMM("hazard", [c.x0 - 0.6, y0 + 0.002, 472.5], [c.x0 - 0.2, y0 + 0.006, 474.0], { texel: 3 });
    ctx.lights.cool.push(pointLight(0xdfe8ff, 28, 12, [(c.x0 + c.x1) / 2, y0 + c.h - 0.3, (c.z0 + c.z1) / 2]));
  }
  const N = shell.frames["+z"].frame; // u = x1 - x
  wallLightBar(N, x1 - 80.5, x1 - 72.5, 3.0);
  wallLightBar(N, x1 - 67.5, x1 - x0 - 1.0, 3.0);
  N.box("darkGloss", x1 - 64.5, 2.6, 0.03, 2.4, 1.0, 0.05);
  N.box("screen4", x1 - 64.5, 2.6, 0.058, 2.3, 0.9, 0.006, { uv: "keep" });
  N.box("emitAmber", x1 - 64.5, 3.15, 0.03, 2.5, 0.04, 0.01, { uv: "keep" });
  N.add("decal", new THREE.PlaneGeometry(0.6, 0.6), x1 - 72.6, 1.8, 0.005, { uv: "keep", uvRect: decalRect(1) });
  N.add("decal", new THREE.PlaneGeometry(0.6, 0.6), x1 - 67.4, 1.8, 0.005, { uv: "keep", uvRect: decalRect(7) });
  wallConsole(N, x1 - 61.5, 2.0, "screen6");
  for (let k = 0; k < 3; k++) {
    const lx = 74.0 + k * 0.95;
    kit.box("painted", lx, y0 + 1.0, z1 - WT - 0.3, 0.9, 2.0, 0.6, { color: k % 2 ? PALETTE.slate : PALETTE.gunmetal, uv: "keep" });
    kit.box("metal", lx, y0 + 1.0, z1 - WT - 0.605, 0.03, 1.7, 0.02, { color: PALETTE.darkMetal });
    kit.box("metal", lx + 0.28, y0 + 1.1, z1 - WT - 0.615, 0.03, 0.14, 0.03, { color: PALETTE.steel });
    for (let s = 0; s < 4; s++) kit.box("metal", lx, y0 + 1.6 + s * 0.06, z1 - WT - 0.61, 0.55, 0.012, 0.01, { color: PALETTE.darkMetal });
    stencil(kit, lx, y0 + 0.6, z1 - WT - 0.612, 0.24, [0, 14, 6][k], "-z");
  }
  kit.collider([73.5, y0, z1 - WT - 0.62], [76.4, y0 + 2.0, z1], "lockers");
  toolCart(kit, 66.6, y0, 470.4, -0.6, 4);
  toolCart(kit, 76.0, y0, 452.6, 2.2, 6);

  // ---------------------------------------------------------------- overhead: cable trays, ventilation duct
  cableTray(kit, [x0 + 1.0, z1 - 0.55], [x1 - 1.0, z1 - 0.55], yTop - 0.9, { w: 0.6, ceilY: yTop, cables: 5 });
  cableTray(kit, [x0 + 1.0, z0 + 0.55], [x1 - 1.0, z0 + 0.55], yTop - 0.9, { w: 0.5, ceilY: yTop, cables: 4 });
  kit.box("paintedMetal", (x0 + x1) / 2, yTop - 0.65, 468.6, x1 - x0 - 2.0, 0.6, 1.0, { color: PALETTE.darkMetal, texel: 1 });
  for (let x = x0 + 4.0; x < x1 - 2; x += 5.6) {
    kit.box("metal", x, yTop - 0.65, 468.6, 0.12, 0.7, 1.1, { color: PALETTE.gunmetal, texel: 2 });
  }
  for (const x of [59.0, 66.0, 73.0, 80.0]) {
    kit.box("paintedMetal", x, yTop - 1.2, 468.6, 0.5, 0.5, 0.5, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("satinBlack", x, yTop - 1.5, 468.6, 0.9, 0.1, 0.9);
    const g = new THREE.PlaneGeometry(0.8, 0.8);
    g.rotateX(Math.PI / 2);
    kit.add("grate", g, { pos: [x, yTop - 1.56, 468.6], uv: "scale", uvScale: [0.8 / 0.62, 0.8 / 0.45], color: 0xffffff });
  }

  // ---------------------------------------------------------------- lights: cool fill from the ceiling corners, amber by the door
  // (a 34 x 33 m bay with a 14-light pool: four long-reach fill lights plus the caged work lights above)
  for (const [lx, lz] of [[62.0, 451.0], [80.0, 451.0], [62.0, 469.5], [80.0, 469.5]]) cageLight(kit, ctx, lx, yTop, lz, 1.4, { intensity: 150, distance: 32, color: 0xdfe8ff, mat: "emitCoolSoft" });
  ctx.lights.warm.push(pointLight(0xffc080, 60, 18, [72.5, yTop - 1.2, 470.0]));
  return shell;
}
