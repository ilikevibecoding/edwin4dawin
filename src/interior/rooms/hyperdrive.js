// Hyperdrive room (deck C, 6 m): two rows of five stacked motivator banks flank a central inspection
// aisle whose floor grates cover an amber-lit coolant trench. The banks are blocky two-tier units with
// side heat fins, a crown of fins, amber-white glow slots that breathe, front coolant risers with frosted
// couplings and valve wheels, and a status readout. A hexagonal diagnostics island with a holo column
// closes the aisle; coolant reservoirs line the port wall, power-conditioning cabinets the starboard
// wall, a wall of pressure gauges flanks the door, a coolant trunk runs along the forward wall and an
// overhead crane rail with a parked hoist spans the aisle. Hot amber-white light, cool fill at the frost.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { decalRect } from "../../textures.js";
import {
  yawFrame,
  cylBetween,
  pipeRun,
  framePipe,
  flange,
  pipeClamp,
  valveWheel,
  cableTray,
  cageLight,
  grateDeck,
  floorStrip,
  floorRect,
  stencil,
  gauge,
  breakerColumn,
  toolCart,
  coarseWalls,
} from "./deckCProps.js";

const UNIT_W = 3.6; // along the row
const UNIT_D = 7.0; // from the aisle face back
const TIER_H = 2.3;
const TOP_V = 0.3 + 2 * TIER_H + 0.12; // top plate height of a unit
const CPL_V = TIER_H + 0.36; // coolant coupling height (tier boundary)
const ROW_Z = [486.8, 490.8, 494.8, 498.8, 502.8];
const WEST_FACE = 50.0;
const EAST_FACE = 58.0;
const TRENCH = { x0: 52.8, x1: 55.2, z0: 484.6, z1: 501.4, depth: 0.75 };
const TANK_Z = [487.5, 494.0, 500.5];

// Box geometry placed in a frame but kept out of the kit (for the separately animated glow mesh).
function glowBox(f, u, v, n, su, sv, sn) {
  const g = new THREE.BoxGeometry(su, sv, sn);
  g.applyMatrix4(new THREE.Matrix4().compose(f.pos(u, v, n), f.q, new THREE.Vector3(1, 1, 1)));
  return g;
}

// One motivator bank. Frame origin: centre of the aisle-facing face at floor level, n > 0 into the aisle.
function motivator(kit, f, i, glow) {
  const W = UNIT_W;
  const D = UNIT_D;
  const hw = W / 2;
  f.box("paintedMetal", 0, 0.15, -D / 2, W + 0.1, 0.3, D + 0.1, { color: PALETTE.darkMetal, texel: 1.5 });
  f.box("hazard", 0, 0.26, -D / 2, W + 0.12, 0.08, D + 0.12, { texel: 3 });
  for (let t = 0; t < 2; t++) {
    const v0 = 0.3 + t * (TIER_H + 0.12);
    const vc = v0 + TIER_H / 2;
    f.box("paintedMetal", 0, vc, -D / 2 - 0.1, W - 0.2, TIER_H, D - 0.2, { color: PALETTE.gunmetal, texel: 1 });
    for (const s of [-1, 1]) f.box("metal", s * (hw - 0.1), vc, -0.1, 0.2, TIER_H, 0.2, { color: PALETTE.steel, texel: 2 });
    f.box("satinBlack", 0, vc, -0.04, W - 0.5, TIER_H - 0.2, 0.08);
    for (let s = 0; s < 4; s++) {
      const v = v0 + 0.5 + s * 0.42;
      f.box("darkGloss", 0, v, 0.002, W - 0.9, 0.16, 0.02);
      glow.push(glowBox(f, 0, v, 0.014, W - 1.0, 0.09, 0.01));
    }
    for (let k = 0; k < 9; k++) {
      const n = -0.8 - k * 0.7;
      for (const s of [-1, 1]) f.box("metal", s * (hw - 0.02), vc, n, 0.36, TIER_H - 0.5, 0.05, { color: PALETTE.slate, texel: 2 });
    }
    if (t === 0) f.box("metal", 0, v0 + TIER_H + 0.06, -D / 2, W, 0.12, D, { color: PALETTE.darkMetal, texel: 2 });
  }
  // crown: top plate with a fin stack and the rear coolant collar
  f.box("metal", 0, TOP_V + 0.05, -D / 2 - 0.1, W - 0.4, 0.1, D - 0.4, { color: PALETTE.darkMetal, texel: 2 });
  for (let k = 0; k < 11; k++) f.box("metal", 0, TOP_V + 0.32, -0.7 - k * 0.6, W - 0.8, 0.45, 0.05, { color: PALETTE.slate, texel: 2 });
  f.cylV("metal", 0, TOP_V + 0.25, -D + 0.5, 0.3, 0.3, { color: PALETTE.darkMetal, segments: 16 });
  // readout, unit numeral and warning stencil on the front plate
  f.box("darkGloss", -hw + 0.75, 1.5, 0.05, 0.7, 0.5, 0.03);
  f.box("screen6", -hw + 0.75, 1.5, 0.068, 0.62, 0.42, 0.006, { uv: "keep" });
  f.box("leds", -hw + 0.75, 1.16, 0.05, 0.5, 0.04, 0.01, { uv: "keep" });
  f.add("decal", new THREE.PlaneGeometry(0.9, 0.9), hw - 0.8, 1.55, 0.045, { uv: "keep", uvRect: decalRect(2) });
  f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), hw - 0.8, 0.72, 0.045, { uv: "keep", uvRect: decalRect(5) });
  f.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 0, 3.9 + (i % 2) * 0.6, 0.045, { uv: "keep", uvRect: decalRect(i % 3 ? 9 : 6) });
  // coolant risers with frosted couplings and hand valves
  for (const s of [-1, 1]) {
    const u = s * (hw - 0.55);
    f.cylV("metal", u, 2.95, 0.3, 0.1, 5.1, { color: PALETTE.steel, segments: 12 });
    framePipe(f, [[u, 5.5, 0.3], [u, 5.5, -0.5], [u, TOP_V + 0.05, -0.5]], 0.1, { color: PALETTE.steel, segments: 12 });
    f.box("metal", u, CPL_V, 0.3, 0.44, 0.5, 0.44, { color: PALETTE.darkMetal, texel: 2 });
    const frost = new THREE.TorusGeometry(0.2, 0.05, 6, 14);
    frost.rotateX(Math.PI / 2);
    f.add("emitCoolSoft", frost, u, CPL_V + 0.36, 0.3, { uv: "keep" });
    f.cylV("emitCoolSoft", u, CPL_V - 0.34, 0.3, 0.15, 0.1, { segments: 14, uv: "keep" });
    const wp = f.pos(u, 1.45, 0.3);
    const wn = f.pos(u, 1.45, 0.62);
    valveWheel(kit, wn.x, wn.y, wn.z, "x", 0.19, { stem: 0.02 });
    cylBetween(kit, "metal", [wp.x, wp.y, wp.z], [wn.x, wn.y, wn.z], 0.028, { color: PALETTE.gunmetal, segments: 8 });
    f.box("metal", u, 1.45, 0.3, 0.26, 0.22, 0.26, { color: PALETTE.gunmetal, texel: 2 });
  }
  f.collider(-hw - 0.15, hw + 0.15, 0, 6, -D - 0.1, 0.5, "motivator");
}

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", floor: false, lights: false, lightRows: 3, skipWalls: ["-x", "+x", "-z", "+z"] });
  coarseWalls(kit, room, lib, shell, { seed: 5200 });
  const y0 = shell.y0;
  const yTop = shell.yTop;
  const { x0, x1, z0, z1 } = room;
  const WT = lib.WALL_T;
  const T = TRENCH;
  const tb = y0 - T.depth;

  // ---------------------------------------------------------------- floor: four deck plates around the trench
  const slab = (ax, az, bx, bz) => {
    kit.boxMM("deck", [ax, y0 - 0.12, az], [bx, y0, bz], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    kit.floor(ax, az, bx, bz, y0);
  };
  slab(x0 - WT, z0 - WT, T.x0, z1 + WT);
  slab(T.x1, z0 - WT, x1 + WT, z1 + WT);
  slab(T.x0, z0 - WT, T.x1, T.z0);
  slab(T.x0, T.z1, T.x1, z1 + WT);
  // aisle markings: amber lines at the bank fronts, hazard chevrons around the trench, door stencils
  floorStrip(kit, WEST_FACE + 0.55, 484.4, WEST_FACE + 0.65, 505.2, y0);
  floorStrip(kit, EAST_FACE - 0.65, 484.4, EAST_FACE - 0.55, 505.2, y0);
  kit.boxMM("hazard", [T.x0 - 0.55, y0 + 0.002, T.z0 - 0.55], [T.x0 - 0.2, y0 + 0.006, T.z1 + 0.55], { texel: 3 });
  kit.boxMM("hazard", [T.x1 + 0.2, y0 + 0.002, T.z0 - 0.55], [T.x1 + 0.55, y0 + 0.006, T.z1 + 0.55], { texel: 3 });
  kit.boxMM("hazard", [T.x0 - 0.55, y0 + 0.002, T.z0 - 0.55], [T.x1 + 0.55, y0 + 0.006, T.z0 - 0.2], { texel: 3 });
  kit.boxMM("hazard", [T.x0 - 0.55, y0 + 0.002, T.z1 + 0.2], [T.x1 + 0.55, y0 + 0.006, T.z1 + 0.55], { texel: 3 });
  stencil(kit, 54, y0 + 0.009, 483.0, 1.4, 1, "up");
  stencil(kit, 51.4, y0 + 0.009, 484.2, 0.6, 15, "up");
  stencil(kit, 56.6, y0 + 0.009, 484.2, 0.6, 15, "up");

  // ---------------------------------------------------------------- the lit trench under the aisle grates
  kit.boxMM("metal", [T.x0 - 0.16, tb - 0.1, T.z0 - 0.16], [T.x1 + 0.16, tb, T.z1 + 0.16], { color: PALETTE.darkMetal, uv: "world", texel: 1 });
  kit.boxMM("paintedMetal", [T.x0 - 0.16, tb, T.z0 - 0.16], [T.x0, y0, T.z1 + 0.16], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("paintedMetal", [T.x1, tb, T.z0 - 0.16], [T.x1 + 0.16, y0, T.z1 + 0.16], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("paintedMetal", [T.x0, tb, T.z0 - 0.16], [T.x1, y0, T.z0], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("paintedMetal", [T.x0, tb, T.z1], [T.x1, y0, T.z1 + 0.16], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("emitAmber", [T.x0 + 0.005, tb + 0.3, T.z0 + 0.2], [T.x0 + 0.035, tb + 0.38, T.z1 - 0.2], { uv: "keep" });
  kit.boxMM("emitAmber", [T.x1 - 0.035, tb + 0.3, T.z0 + 0.2], [T.x1 - 0.005, tb + 0.38, T.z1 - 0.2], { uv: "keep" });
  const tzc = (T.z0 + T.z1) / 2;
  const tl = T.z1 - T.z0 - 0.3;
  kit.cyl("metal", 53.45, tb + 0.17, tzc, 0.15, tl, "z", { color: PALETTE.steel, segments: 12 });
  kit.cyl("metal", 54.55, tb + 0.13, tzc, 0.11, tl, "z", { color: PALETTE.orange, segments: 10 });
  kit.cyl("rubber", 54.0, tb + 0.07, tzc, 0.06, tl, "z", { color: PALETTE.rubber, segments: 8 });
  for (let z = T.z0 + 1.5; z < T.z1 - 1; z += 3.0) {
    pipeClamp(kit, 53.45, tb + 0.17, z, 0.15, { axis: "z" });
    pipeClamp(kit, 54.55, tb + 0.13, z, 0.11, { axis: "z" });
    flange(kit, [53.45, tb + 0.17, z + 1.2], [0, 0, 1], 0.21);
  }
  const nSec = 7;
  const secL = (T.z1 - T.z0) / nSec;
  for (let i = 0; i < nSec; i++) grateDeck(kit, T.x0, T.z0 + i * secL, T.x1, T.z0 + (i + 1) * secL, y0, { bearerStep: 1.2 });
  for (const z of [488.0, 493.0, 498.0]) ctx.lights.warm.push(pointLight(0xffa040, 5, 7, [54, tb + 0.4, z]));

  // ---------------------------------------------------------------- the two rows of motivator banks
  const glow = [];
  for (const [i, zc] of ROW_Z.entries()) {
    motivator(kit, yawFrame(kit, WEST_FACE, y0, zc, Math.PI / 2), i, glow);
    motivator(kit, yawFrame(kit, EAST_FACE, y0, zc, -Math.PI / 2), i + 5, glow);
  }
  const rowMid = (ROW_Z[0] + ROW_Z[4]) / 2;
  const rowLen = ROW_Z[4] - ROW_Z[0] + UNIT_W;
  for (const [fx, s] of [[WEST_FACE, 1], [EAST_FACE, -1]]) {
    // front coolant header through every coupling block, rear header on the unit tops
    kit.cyl("metal", fx + s * 0.3, y0 + CPL_V, rowMid, 0.09, rowLen, "z", { color: PALETTE.steel, segments: 12 });
    kit.cyl("metal", fx - s * (UNIT_D - 0.5), y0 + TOP_V + 0.5, rowMid, 0.16, rowLen + 0.6, "z", { color: PALETTE.orange, segments: 12 });
    for (const zc of ROW_Z) flange(kit, [fx - s * (UNIT_D - 0.5), y0 + TOP_V + 0.5, zc + UNIT_W / 2 + 0.2], [0, 0, 1], 0.24);
    // cable tray above the row fronts, conduit drops into every unit top
    const tx = fx + s * 0.9;
    cableTray(kit, [tx, 484.6], [tx, 505.0], yTop - 0.3, { w: 0.5, ceilY: yTop, cables: 4, hangerStep: 4.0 });
    for (const zc of ROW_Z) {
      for (const dz of [-0.9, 0.9]) pipeRun(kit, "metal", [[tx, yTop - 0.36, zc + dz], [fx - s * 0.45, yTop - 0.36, zc + dz], [fx - s * 0.45, y0 + TOP_V + 0.08, zc + dz]], 0.045, { color: PALETTE.steel, segments: 8 });
      pipeRun(kit, "rubber", [[tx, yTop - 0.34, zc], [fx - s * 0.45, yTop - 0.34, zc], [fx - s * 0.45, y0 + TOP_V + 0.08, zc]], 0.035, { color: PALETTE.rubber, segments: 8 });
    }
  }
  if (glow.length) {
    // just over the bloom threshold: the slots read as hot amber bars, not white blobs
    const mat = ctx.materials.emitAmber.clone();
    mat.emissive = new THREE.Color("#ffb860");
    mat.emissiveIntensity = 1.25;
    const mesh = new THREE.Mesh(mergeGeometries(glow, false), mat);
    mesh.name = "motivatorGlow";
    const base = mat.emissiveIntensity;
    let t = 0;
    ctx.dynamic.push({
      object: mesh,
      update(dt) {
        t += dt;
        mat.emissiveIntensity = base * (0.9 + 0.07 * Math.sin(t * 2.1) + 0.03 * Math.sin(t * 9.3));
      },
    });
  }

  // ---------------------------------------------------------------- diagnostics island at the head of the aisle
  {
    const IX = 54;
    const IZ = 503.6;
    const IR = 1.25;
    const cr = IR / Math.cos(Math.PI / 6);
    kit.add("satinBlack", new THREE.CylinderGeometry(cr, cr, 1.1, 6), { pos: [IX, y0 + 0.55, IZ] });
    kit.add("metal", new THREE.CylinderGeometry(cr + 0.05, cr + 0.05, 0.12, 6), { pos: [IX, y0 + 0.06, IZ], color: PALETTE.darkMetal, texel: 2 });
    kit.add("emitBlue", new THREE.CylinderGeometry(cr + 0.02, cr + 0.02, 0.03, 6), { pos: [IX, y0 + 1.12, IZ], uv: "keep" });
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      const f = yawFrame(kit, IX + Math.cos(a) * IR, y0, IZ + Math.sin(a) * IR, Math.atan2(Math.cos(a), Math.sin(a)));
      wallConsole(f, 0, 1.3, k % 2 ? "screen6" : "screen4");
      f.box("emitAmber", 0, 0.35, 0.56, 1.0, 0.03, 0.01, { uv: "keep" });
    }
    kit.cyl("glass", IX, y0 + 1.75, IZ, 0.55, 1.2, "y", { segments: 24, open: true });
    kit.cyl("metal", IX, y0 + 2.38, IZ, 0.6, 0.08, "y", { color: PALETTE.gunmetal, segments: 24 });
    kit.cyl("emitBlue", IX, y0 + 1.7, IZ, 0.03, 1.0, "y", { segments: 8, uv: "keep" });
    for (const [r, v] of [[0.42, 1.4], [0.3, 1.75], [0.18, 2.05]]) kit.add("emitBlue", new THREE.TorusGeometry(r, 0.012, 6, 32), { pos: [IX, y0 + v, IZ], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    kit.collider([IX - 1.0, y0, IZ - 1.0], [IX + 1.0, y0 + 2.4, IZ + 1.0], "island");
    // ring fixture above the island
    kit.add("satinBlack", new THREE.TorusGeometry(1.5, 0.08, 8, 48), { pos: [IX, yTop - 0.9, IZ], rot: [Math.PI / 2, 0, 0] });
    kit.add("emitWhiteSoft", new THREE.TorusGeometry(1.5, 0.04, 6, 48), { pos: [IX, yTop - 0.96, IZ], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    for (let k = 0; k < 3; k++) {
      const a = k * ((2 * Math.PI) / 3) + 0.5;
      kit.cyl("metal", IX + Math.cos(a) * 1.5, yTop - 0.45, IZ + Math.sin(a) * 1.5, 0.015, 0.9, "y", { color: PALETTE.steel, segments: 6 });
    }
    ctx.lights.cool.push(pointLight(0xdfe8ff, 12, 12, [IX, yTop - 1.3, IZ]));
  }

  // ---------------------------------------------------------------- overhead crane rail with a parked hoist
  for (const rx of [52.0, 56.0]) {
    kit.boxMM("paintedMetal", [rx - 0.15, yTop - 0.75, 483.6], [rx + 0.15, yTop - 0.45, 505.2], { color: PALETTE.gunmetal, texel: 1 });
    kit.boxMM("metal", [rx - 0.22, yTop - 0.8, 483.6], [rx + 0.22, yTop - 0.74, 505.2], { color: PALETTE.steel, texel: 2 });
    for (let z = 484.5; z < 505; z += 4.0) kit.box("metal", rx, yTop - 0.22, z, 0.14, 0.45, 0.14, { color: PALETTE.darkMetal, texel: 2 });
    for (const ze of [483.75, 505.05]) kit.box("painted", rx, yTop - 0.6, ze, 0.5, 0.36, 0.2, { color: PALETTE.orange, uv: "keep" });
  }
  {
    const bz = 496.4;
    kit.box("paintedMetal", 54, yTop - 1.0, bz, 4.9, 0.36, 0.4, { color: PALETTE.gunmetal, texel: 1 });
    for (const rx of [52.0, 56.0]) kit.box("metal", rx, yTop - 0.9, bz, 0.5, 0.36, 0.7, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("paintedMetal", 54.6, yTop - 1.42, bz, 0.8, 0.5, 0.7, { color: PALETTE.slate, texel: 1.5 });
    kit.box("emitOrange", 54.6, yTop - 1.2, bz + 0.355, 0.3, 0.06, 0.01, { uv: "keep" });
    const hookY = y0 + 3.5;
    kit.cyl("metal", 54.6, (yTop - 1.67 + hookY + 0.2) / 2, bz, 0.015, yTop - 1.67 - hookY - 0.2, "y", { color: PALETTE.steel, segments: 6 });
    kit.box("metal", 54.6, hookY, bz, 0.26, 0.4, 0.2, { color: PALETTE.darkMetal, texel: 2 });
    kit.add("metal", new THREE.TorusGeometry(0.14, 0.03, 6, 16, Math.PI * 1.5), { pos: [54.6, hookY - 0.34, bz], rot: [0, 0, (3 * Math.PI) / 4], color: PALETTE.steel, uv: "scale", uvScale: [3, 1] });
  }

  // ---------------------------------------------------------------- port side: coolant reservoirs and the overhead feed network
  const headerX = 40.2;
  const headerY = yTop - 0.75;
  kit.cyl("metal", headerX, headerY, 494.5, 0.2, 19.0, "z", { color: PALETTE.steel, segments: 16 });
  for (const [i, tz] of TANK_Z.entries()) {
    const tx = x0 + 1.9;
    kit.cyl("paintedMetal", tx, y0 + 0.15, tz, 1.55, 0.3, "y", { color: PALETTE.darkMetal, segments: 24, texel: 1 });
    kit.cyl("paintedMetal", tx, y0 + 2.65, tz, 1.35, 4.7, "y", { color: i % 2 ? PALETTE.slate : PALETTE.gunmetal, segments: 28, texel: 0.7 });
    kit.cyl("paintedMetal", tx, y0 + 5.15, tz, 1.1, 0.3, "y", { color: PALETTE.darkMetal, segments: 24 });
    kit.cyl("metal", tx, y0 + 5.32, tz, 0.5, 0.04, "y", { color: PALETTE.steel, segments: 20 });
    for (const v of [1.5, 3.9]) kit.add("metal", new THREE.TorusGeometry(1.37, 0.07, 8, 40), { pos: [tx, y0 + v, tz], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [8, 1] });
    // sight glass with the coolant level glowing frost-blue, nameplate, gauge
    kit.box("darkGloss", tx + 1.33, y0 + 2.7, tz, 0.08, 3.4, 0.24);
    kit.box("emitCoolSoft", tx + 1.375, y0 + 1.85, tz, 0.01, 1.6 + i * 0.25, 0.14, { uv: "keep" });
    kit.box("metal", tx + 1.36, y0 + 4.5, tz - 0.6, 0.06, 0.5, 0.8, { color: PALETTE.darkMetal, texel: 2 });
    const np = new THREE.PlaneGeometry(0.6, 0.4);
    np.rotateY(Math.PI / 2);
    kit.add("decal", np, { pos: [tx + 1.395, y0 + 4.5, tz - 0.6], uv: "keep", uvRect: decalRect(9) });
    const gf = yawFrame(kit, tx + 1.35, y0, tz + 0.75, Math.PI / 2);
    gf.box("metal", 0, 1.4, 0.0, 0.5, 0.5, 0.1, { color: PALETTE.darkMetal, texel: 2 });
    gauge(gf, 0, 1.4, 0.16, { mat: "emitWhite", needle: 0.35 + i * 0.15 });
    // feed to the header
    pipeRun(kit, "metal", [[tx, y0 + 5.3, tz], [tx, headerY, tz], [headerX, headerY, tz]], 0.16, { color: PALETTE.steel, segments: 14 });
    flange(kit, [tx, y0 + 5.7, tz], [0, 1, 0], 0.24);
    valveWheel(kit, tx, y0 + 4.7, tz + 1.55, "z", 0.2);
    kit.cyl("metal", tx, y0 + 4.7, tz + 1.35, 0.1, 0.4, "z", { color: PALETTE.gunmetal, segments: 10 });
    kit.collider([tx - 1.6, y0, tz - 1.6], [tx + 1.6, y0 + 5.5, tz + 1.6], "tank");
  }
  for (const [i, zc] of ROW_Z.entries()) {
    const bx = WEST_FACE - UNIT_D + 0.5;
    pipeRun(kit, "metal", [[headerX, headerY, zc], [bx, headerY, zc], [bx, y0 + TOP_V + 0.6, zc]], 0.13, { color: i % 2 ? PALETTE.orange : PALETTE.steel, segments: 12 });
    valveWheel(kit, headerX, headerY + 0.42, zc, "y", 0.22);
    kit.cyl("metal", headerX, headerY + 0.24, zc, 0.09, 0.2, "y", { color: PALETTE.gunmetal, segments: 10 });
    flange(kit, [bx, headerY - 0.7, zc], [0, 1, 0], 0.2);
  }
  // port wall fixtures between the tanks (u = z1 - z)
  const W = shell.frames["-x"].frame;
  for (const [ua, ub] of [[1.0, 3.8], [7.6, 10.4], [14.1, 16.9], [20.6, 24.0]]) {
    wallLightBar(W, ua, ub, 3.4);
    W.add("decal", new THREE.PlaneGeometry(0.5, 0.5), (ua + ub) / 2, 2.6, 0.005, { uv: "keep", uvRect: decalRect(ua > 10 ? 12 : 6) });
  }
  wallConsole(W, 22.3, 1.6, "screen6");
  for (const u of [8.4, 15.2]) {
    W.box("paintedMetal", u, 1.3, 0.1, 1.1, 1.6, 0.2, { color: PALETTE.gunmetal, texel: 1.5 });
    const bf = yawFrame(kit, x0 + 0.2, y0, z1 - u, Math.PI / 2);
    breakerColumn(bf, -0.3, 0.7, 7);
    breakerColumn(bf, 0.0, 0.7, 7);
    breakerColumn(bf, 0.3, 0.7, 7);
    W.collider(u - 0.6, u + 0.6, 0, 2.2, 0, 0.3, "breakers");
  }
  cableTray(kit, [x0 + 0.65, 482.6], [x0 + 0.65, 505.4], yTop - 1.3, { w: 0.5, ceilY: yTop, cables: 4 });
  for (const z of [488.5, 498.5]) ctx.lights.warm.push(pointLight(0xffb060, 20, 16, [42.5, yTop - 0.9, z]));
  ctx.lights.cool.push(pointLight(0xcfe4ff, 9, 11, [39.8, y0 + 5.0, 494.0]));

  // ---------------------------------------------------------------- starboard side: power-conditioning cabinets, spare core, cart
  const E = shell.frames["+x"].frame; // u = z - z0
  for (const [i, zc] of ROW_Z.entries()) {
    const u = zc - z0;
    E.box("paintedMetal", u, 2.1, 0.6, 2.4, 4.2, 1.2, { color: PALETTE.gunmetal, texel: 1 });
    E.box("satinBlack", u, 2.15, 1.24, 2.2, 3.9, 0.08);
    E.box("metal", u, 0.12, 0.6, 2.5, 0.24, 1.3, { color: PALETTE.darkMetal, texel: 2 });
    for (let s = 0; s < 6; s++) E.box("emitAmber", u - 0.5, 1.0 + s * 0.5, 1.285, 0.9, 0.05, 0.01, { uv: "keep" });
    E.box("darkGloss", u + 0.55, 1.6, 1.285, 0.8, 0.6, 0.02);
    E.box("screen6", u + 0.55, 1.6, 1.3, 0.72, 0.5, 0.006, { uv: "keep" });
    E.box("leds", u + 0.55, 2.2, 1.285, 0.7, 0.05, 0.01, { uv: "keep" });
    E.add("decal", new THREE.PlaneGeometry(0.6, 0.6), u + 0.55, 3.3, 1.285, { uv: "keep", uvRect: decalRect(5) });
    E.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u - 0.6, 3.75, 1.285, { uv: "keep", uvRect: decalRect(8) });
    E.box("hazard", u, 4.26, 0.6, 2.42, 0.1, 1.22, { texel: 3 });
    E.cylV("metal", u, 4.9, 0.6, 0.08, 1.2, { color: PALETTE.steel, segments: 10 });
    E.collider(u - 1.25, u + 1.25, 0, 4.4, 0, 1.35, "cabinet");
    if (i + 1 < ROW_Z.length) {
      const g = u + 2.0;
      E.box("paintedMetal", g, 3.0, 0.15, 0.4, 6.0, 0.3, { color: PALETTE.darkMetal, texel: 1 });
      E.box("hazard", g, 2.0, 0.31, 0.42, 0.3, 0.01, { texel: 3 });
    }
  }
  wallLightBar(E, 1.0, ROW_Z[0] - 1.3 - z0, 3.4);
  wallLightBar(E, ROW_Z[4] + 1.3 - z0, z1 - z0 - 1.0, 3.4);
  E.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 2.0, 2.4, 0.005, { uv: "keep", uvRect: decalRect(5) });
  cableTray(kit, [x1 - 0.7, 483.0], [x1 - 0.7, 505.2], yTop - 0.9, { w: 0.6, ceilY: yTop, cables: 5 });
  {
    const sx = 67.6;
    const sz = 492.0;
    for (const dz of [-1.8, 1.8]) {
      kit.box("paintedMetal", sx, y0 + 0.5, sz + dz, 2.2, 1.0, 0.3, { color: PALETTE.gunmetal, texel: 1.5 });
      kit.box("hazard", sx, y0 + 0.55, sz + dz, 2.22, 0.1, 0.32, { texel: 3 });
      kit.box("metal", sx, y0 + 1.02, sz + dz, 1.4, 0.06, 0.4, { color: PALETTE.darkMetal, texel: 2 });
    }
    kit.cyl("paintedMetal", sx, y0 + 1.75, sz, 0.75, 5.0, "z", { color: PALETTE.slate, segments: 28, texel: 0.7 });
    for (let k = 0; k < 8; k++) kit.add("metal", new THREE.TorusGeometry(0.9, 0.05, 6, 36), { pos: [sx, y0 + 1.75, sz - 2.1 + k * 0.6], color: PALETTE.steel, uv: "scale", uvScale: [6, 1] });
    kit.cyl("metal", sx, y0 + 1.75, sz - 2.55, 0.85, 0.12, "z", { color: PALETTE.darkMetal, segments: 28 });
    kit.cyl("metal", sx, y0 + 1.75, sz + 2.55, 0.85, 0.12, "z", { color: PALETTE.darkMetal, segments: 28 });
    kit.cyl("emitAmber", sx, y0 + 1.75, sz + 2.63, 0.4, 0.04, "z", { segments: 20, uv: "keep" });
    floorRect(kit, sx - 1.5, sz - 3.2, sx + 1.5, sz + 3.2, y0, 0.1);
    stencil(kit, sx, y0 + 0.009, sz + 3.7, 0.6, 6, "up");
    kit.collider([sx - 1.2, y0, sz - 2.7], [sx + 1.2, y0 + 2.6, sz + 2.7], "spareCore");
    toolCart(kit, 69.3, y0, 496.6, 0.4, 2);
    toolCart(kit, 66.2, y0, 486.2, -1.2, 5);
    cageLight(kit, ctx, 67.8, yTop, 488.0, 1.0, { intensity: 20, distance: 16 });
    cageLight(kit, ctx, 67.8, yTop, 500.0, 1.0, { intensity: 20, distance: 16 });
  }

  // ---------------------------------------------------------------- aft wall: gauge wall (port of the door), status board and switchgear (starboard)
  const S = shell.frames["-z"].frame; // u = x - x0
  {
    S.box("paintedMetal", 8.5, 2.15, 0.06, 12.0, 2.3, 0.12, { color: PALETTE.gunmetal, texel: 1 });
    for (let r = 0; r < 3; r++) {
      S.cylU("metal", 8.5, 1.1 + r * 0.72, 0.16, 0.06, 12.0, { color: r === 1 ? PALETTE.orange : PALETTE.steel, segments: 10 });
      for (let c = 0; c < 8; c++) {
        const u = 3.25 + c * 1.5;
        const v = 1.45 + r * 0.72;
        gauge(S, u, v, 0.24, { mat: r === 1 ? "emitWhite" : "emitAmber", needle: 0.25 + ((r * 5 + c * 3) % 8) / 12 });
        S.cylV("metal", u, v - 0.25, 0.16, 0.035, 0.36, { color: PALETTE.steel, segments: 8 });
      }
    }
    S.cylU("metal", 8.5, 0.55, 0.35, 0.18, 12.2, { color: PALETTE.steel, segments: 16 });
    for (let c = 0; c < 8; c++) {
      const u = 3.25 + c * 1.5;
      valveWheel(kit, x0 + u, y0 + 0.55, z0 + 0.35 + 0.3, "z", 0.2, { stem: 0.02 });
      S.cylN("metal", u, 0.55, 0.5, 0.03, 0.3, { color: PALETTE.gunmetal, segments: 8 });
      S.cylV("metal", u, 0.8, 0.35, 0.05, 0.5, { color: PALETTE.steel, segments: 8 });
    }
    S.box("leds", 8.5, 3.36, 0.125, 10.0, 0.05, 0.01, { uv: "keep" });
    S.add("decal", new THREE.PlaneGeometry(0.8, 0.8), 8.5, 3.85, 0.005, { uv: "keep", uvRect: decalRect(5) });
    S.add("decal", new THREE.PlaneGeometry(0.5, 0.5), 3.0, 3.75, 0.005, { uv: "keep", uvRect: decalRect(9) });
    S.collider(2.4, 14.6, 0, 3.4, 0, 0.62, "gaugeWall");
  }
  {
    S.box("satinBlack", 26.0, 2.3, 0.05, 7.0, 1.4, 0.1);
    for (let k = 0; k < 4; k++) {
      const u = 23.4 + k * 1.75;
      S.box("darkGloss", u, 2.4, 0.11, 1.5, 0.9, 0.02);
      S.box("screen6", u, 2.4, 0.125, 1.4, 0.8, 0.006, { uv: "keep" });
      S.box("leds", u, 1.75, 0.11, 1.2, 0.05, 0.01, { uv: "keep" });
    }
    S.box("emitAmber", 26.0, 3.06, 0.11, 6.6, 0.05, 0.01, { uv: "keep" });
    wallConsole(S, 26.0, 3.0, "screen6");
    for (let k = 0; k < 3; k++) {
      const u = 31.2 + k * 1.3;
      S.box("paintedMetal", u, 1.2, 0.2, 1.2, 2.4, 0.4, { color: PALETTE.gunmetal, texel: 1 });
      S.box("satinBlack", u, 1.2, 0.42, 1.1, 2.2, 0.04);
      const bf = yawFrame(kit, x0 + u, y0, z0 + 0.44, 0);
      for (const bu of [-0.3, 0, 0.3]) breakerColumn(bf, bu, 0.45, 8);
      gauge(bf, 0, 2.05, 0.15, { needle: 0.3 + k * 0.2 });
      bf.add("decal", new THREE.PlaneGeometry(0.4, 0.4), 0.38, 2.05, 0.002, { uv: "keep", uvRect: decalRect(8) });
    }
    S.collider(30.5, 35.0, 0, 2.5, 0, 0.5, "switchgear");
    // fire cabinet beside the door
    S.box("painted", 20.9, 1.35, 0.14, 0.6, 0.9, 0.28, { color: PALETTE.orange, uv: "keep" });
    S.box("metal", 20.9, 1.35, 0.285, 0.5, 0.8, 0.01, { color: PALETTE.darkMetal });
    S.box("metal", 21.12, 1.35, 0.29, 0.03, 0.2, 0.02, { color: PALETTE.steel });
    S.add("decal", new THREE.PlaneGeometry(0.3, 0.3), 20.9, 2.05, 0.005, { uv: "keep", uvRect: decalRect(13) });
    S.collider(20.55, 21.25, 0.8, 1.85, 0, 0.32, "fireCab");
  }
  wallLightBar(S, 2.5, 14.5, 3.6);
  wallLightBar(S, 21.5, 35.0, 3.6);
  S.box("emitAmber", 18, 2.7, 0.03, 2.8, 0.06, 0.02, { uv: "keep" });
  S.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 15.7, 1.75, 0.005, { uv: "keep", uvRect: decalRect(5) });
  S.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 20.3, 1.75, 0.005, { uv: "keep", uvRect: decalRect(1) });
  cableTray(kit, [37.0, z0 + 0.45], [71.0, z0 + 0.45], yTop - 1.1, { w: 0.5, ceilY: yTop, cables: 4 });
  ctx.lights.cool.push(pointLight(0xdfe8ff, 10, 12, [44.5, y0 + 4.2, 484.0]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 10, 12, [63.5, y0 + 4.2, 484.0]));

  // ---------------------------------------------------------------- forward wall: coolant trunk, pump units, status board behind the island
  const N = shell.frames["+z"].frame; // u = x1 - x
  {
    const trunkY = y0 + 3.6;
    const tz = z1 - 1.05;
    kit.cyl("metal", (x0 + x1) / 2, trunkY, tz, 0.8, x1 - x0 - 3.0, "x", { color: PALETTE.steel, segments: 28, texel: 0.7 });
    for (const fx of [39.5, 45.5, 51.5, 56.5, 62.5, 68.5]) flange(kit, [fx, trunkY, tz], [1, 0, 0], 0.95, { t: 0.2 });
    for (const fx of [38.5, 47.0, 54.0, 61.0, 69.5]) kit.box("paintedMetal", fx, trunkY, z1 - 0.45, 0.5, 1.9, 0.7, { color: PALETTE.gunmetal, texel: 1 });
    for (const [i, px] of [42.0, 48.0, 60.0, 66.0].entries()) {
      pipeRun(kit, "metal", [[px, trunkY, tz], [px, y0 + 1.5, tz], [px, y0 + 1.5, z1 - 1.6]], 0.3, { color: i % 2 ? PALETTE.orange : PALETTE.steel, segments: 14 });
      kit.box("paintedMetal", px, y0 + 0.65, z1 - 1.9, 1.8, 1.3, 1.4, { color: PALETTE.gunmetal, texel: 1.2 });
      kit.box("metal", px, y0 + 1.33, z1 - 1.9, 1.84, 0.06, 1.44, { color: PALETTE.darkMetal, texel: 2 });
      kit.box("metal", px, y0 + 0.1, z1 - 1.9, 1.9, 0.2, 1.5, { color: PALETTE.darkMetal, texel: 2 });
      kit.cyl("paintedMetal", px, y0 + 0.7, z1 - 2.7, 0.5, 0.3, "z", { color: PALETTE.slate, segments: 20 });
      const pf = yawFrame(kit, px, y0, z1 - 2.6, Math.PI);
      gauge(pf, -0.45, 1.05, 0.15, { needle: 0.3 + i * 0.12 });
      pf.box("leds", 0.3, 1.05, 0.01, 0.5, 0.04, 0.01, { uv: "keep" });
      pf.box("emitAmber", 0.3, 0.85, 0.01, 0.2, 0.06, 0.01, { uv: "keep" });
      valveWheel(kit, px + 0.62, y0 + 2.5, tz, "x", 0.22, { stem: 0.02 });
      kit.cyl("metal", px + 0.4, y0 + 2.5, tz, 0.03, 0.44, "x", { color: PALETTE.gunmetal, segments: 8 });
      kit.cyl("metal", px + 0.3, y0 + 2.5, tz, 0.1, 0.2, "x", { color: PALETTE.gunmetal, segments: 10 });
      kit.collider([px - 0.95, y0, z1 - 2.75], [px + 0.95, y0 + 1.5, z1], "pump");
    }
    for (const [ua, ub] of [[1.0, 5.0], [7.2, 10.8], [13.2, 22.8], [25.2, 28.8], [31.0, 35.0]]) wallLightBar(N, ua, ub, 2.5);
    // status board behind the island
    N.box("satinBlack", 18.0, 1.7, 0.05, 6.0, 1.6, 0.1);
    for (let k = 0; k < 3; k++) {
      const u = 16.2 + k * 1.8;
      N.box("darkGloss", u, 1.8, 0.11, 1.6, 1.0, 0.02);
      N.box(k === 1 ? "screen4" : "screen6", u, 1.8, 0.125, 1.5, 0.9, 0.006, { uv: "keep" });
      N.box("leds", u, 1.15, 0.11, 1.3, 0.05, 0.01, { uv: "keep" });
    }
    N.box("emitAmber", 18.0, 2.42, 0.11, 5.6, 0.05, 0.01, { uv: "keep" });
    N.collider(15.0, 21.0, 0, 2.6, 0, 0.15, "statusBoard");
    wallConsole(N, 9.0, 1.6, "screen4");
    wallConsole(N, 27.0, 1.6, "screen6");
    for (const [u, idx] of [[3.0, 12], [8.9, 6], [27.1, 6], [33.0, 12]]) N.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u, 1.9, 0.005, { uv: "keep", uvRect: decalRect(idx) });
    ctx.lights.warm.push(pointLight(0xffb060, 14, 15, [45, y0 + 4.8, 503.5]));
    ctx.lights.warm.push(pointLight(0xffb060, 14, 15, [63, y0 + 4.8, 503.5]));
  }

  // ---------------------------------------------------------------- aisle lighting: hot amber-white
  // (the pool keeps the 14 best-scoring fixtures, so the aisle carries the room with few strong lights
  // whose reach covers the whole 24 m from the door)
  for (const z of [486.0, 491.0, 496.0, 501.0]) ctx.lights.warm.push(pointLight(0xffc080, 30, 20, [54, yTop - 0.9, z]));
  ctx.lights.warm.push(pointLight(0xffc080, 10, 10, [54, yTop - 0.9, 483.3]));
  return shell;
}
