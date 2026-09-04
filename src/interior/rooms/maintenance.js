// Maintenance and repair bay (deck C, 8 m): an overhead gantry crane rides runway rails along the port
// and starboard walls (rail heads, conductor bars, collector arms) and slowly travels the bay with an
// underhung trolley, hoist drum, two-fall hook block and festoon cabling. Two workpieces sit under it: a
// disassembled turbolaser barrel and breech on cradles, and an ion-engine nacelle on a transport dolly
// with a rolling access platform, an opened coil bay and a diagnostics cart. A deflector-generator test
// rig, container stacks, parts trays, cable reels, welding screens and a pallet jack fill the rest of the
// floor; workbenches with pegboards line the port wall, racks with open-front bins the starboard wall;
// welding bay, droid recharge alcove and a caged parts lift take the aft wall. Tool boards and hanging
// cable drops sit at eye level; floor markings are paint, and base tubes wash the wall feet.
import * as THREE from "three";
import { Kit } from "../../kit.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { decalRect } from "../../textures.js";
import {
  yawFrame,
  beamBetween,
  cylBetween,
  pipeRun,
  valveWheel,
  railing,
  stairRail,
  cableTray,
  cageLight,
  paintStrip,
  paintRect,
  stencil,
  gauge,
  breakerColumn,
  offsetFrame,
  toolCluster,
  toolCart,
  coarseWalls,
  wallBaseTube,
  tubeFixture,
  cableDrop,
  cableReel,
  weldingScreen,
  partsTray,
  toolBoard,
} from "./deckCProps.js";

const RAIL_IN = 1.3; // crane runway rails this far from the side walls
const RAIL_TOP = 5.2; // runway girder top above the floor (rail head sits on it)
const BIN_COLS = [PALETTE.gunmetal, PALETTE.slate, PALETTE.orange, PALETTE.tealPaint, PALETTE.creamDark, PALETTE.darkMetal];

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
  // vice, tools, pegboard with hanging tools, shelf with a housed task light
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
  f.box("satinBlack", 0, 2.24, -D / 2 + 0.2, L - 0.2, 0.08, 0.12);
  f.cylU("emitWarmSoft", 0, 2.2, -D / 2 + 0.22, 0.018, L - 0.4, { segments: 8, uv: "keep" });
  f.collider(-L / 2, L / 2, 0, 1.0, -D / 2, D / 2 + 0.05, "bench");
  const sp = f.pos(0.45, 0, D / 2 + 0.45);
  kit.cyl("metal", sp.x, sp.y + 0.3, sp.z, 0.03, 0.6, "y", { color: PALETTE.gunmetal, segments: 8 });
  kit.cyl("metal", sp.x, sp.y + 0.02, sp.z, 0.2, 0.04, "y", { color: PALETTE.darkMetal, segments: 14 });
  kit.cyl("rubber", sp.x, sp.y + 0.63, sp.z, 0.19, 0.06, "y", { color: PALETTE.rubber, segments: 14 });
  kit.collider([sp.x - 0.2, sp.y, sp.z - 0.2], [sp.x + 0.2, sp.y + 0.7, sp.z + 0.2], "stool");
}

// ---------------------------------------------------------------- parts rack shelf loads
// Open-front bins: body, dark mouth with a steel lip, cream label with a code decal, parts over the rim;
// one slot empty, one bin pulled forward.
function binRow(f, v, Wd, D, bh, seed) {
  const nb = 4 + (seed % 2);
  const bw = (Wd - 0.2) / nb;
  const depth = D - 0.3;
  for (let b = 0; b < nb; b++) {
    const r = (b * 5 + seed * 3) % 11;
    if (r === 0) continue;
    const u = -Wd / 2 + 0.1 + bw * (b + 0.5);
    const nc = -0.05 + (r === 4 ? 0.14 : 0);
    const front = nc + depth / 2;
    const rim = v + 0.025 + bh;
    f.box("painted", u, v + 0.025 + bh / 2, nc, bw - 0.08, bh, depth, { color: BIN_COLS[(b + seed) % BIN_COLS.length], uv: "keep" });
    f.box("satinBlack", u, v + 0.025 + bh * 0.7, front + 0.004, bw - 0.14, bh * 0.44, 0.008);
    f.box("metal", u, v + 0.025 + bh * 0.48, front + 0.012, bw - 0.1, 0.02, 0.024, { color: PALETTE.steel });
    f.box("painted", u - (bw - 0.08) * 0.12, v + 0.025 + bh * 0.24, front + 0.005, (bw - 0.08) * 0.5, 0.09, 0.01, { color: PALETTE.cream, uv: "keep" });
    f.add("decal", new THREE.PlaneGeometry(0.14, 0.14), u + (bw - 0.08) * 0.3, v + 0.025 + bh * 0.24, front + 0.012, { uv: "keep", uvRect: decalRect([8, 9, 14, 11][(b + seed) % 4]) });
    const c = (b + seed) % 3;
    if (c === 0) {
      f.cylV("metal", u - 0.08, rim + 0.02, nc - 0.1, 0.04, 0.2, { color: PALETTE.steel, segments: 8 });
      f.cylV("metal", u + 0.1, rim + 0.01, nc - 0.05, 0.03, 0.18, { color: PALETTE.gunmetal, segments: 8 });
    } else if (c === 1) f.box("metal", u, rim + 0.03, nc - 0.12, bw - 0.2, 0.06, 0.18, { color: PALETTE.darkMetal, texel: 2 });
    else f.cylU("metal", u, rim + 0.04, nc - 0.08, 0.035, bw - 0.16, { color: PALETTE.steel, segments: 8 });
  }
}

// Long stock: tubes and bar lying along the shelf with two rubber chocks.
function stockRow(f, v, Wd, D, seed) {
  const rs = [0.05, 0.035, 0.06, 0.028];
  for (let k = 0; k < 4; k++) {
    const n = -0.3 + k * 0.18;
    const r = rs[(k + seed) % 4];
    const u = 0.1 * ((k + seed) % 3) - 0.1;
    const len = Wd - 0.5 + 0.2 * (k % 2);
    if (k === 1) f.cylU("painted", u, v + 0.025 + r, n, r, len, { color: PALETTE.orange, uv: "keep", segments: 8 });
    else f.cylU("metal", u, v + 0.025 + r, n, r, len, { color: k === 2 ? PALETTE.gunmetal : PALETTE.steel, segments: 8 });
  }
  for (const u of [-0.7, 0.7]) f.box("rubber", u, v + 0.06, 0, 0.04, 0.09, D - 0.34, { color: PALETTE.rubber });
}

// Canisters: upright drums with steel caps and a painted band.
function canisterRow(f, v, Wd, D, seed) {
  const n = 3 + (seed % 2);
  for (let k = 0; k < n; k++) {
    const u = -Wd / 2 + 0.45 + k * ((Wd - 0.9) / (n - 1));
    const h = 0.55 + ((k + seed) % 2) * 0.1;
    const col = [PALETTE.slate, PALETTE.gunmetal, PALETTE.creamDark][(k + seed) % 3];
    f.cylV("painted", u, v + 0.025 + h / 2, -0.05, 0.2, h, { color: col, uv: "keep", segments: 12 });
    f.cylV("painted", u, v + 0.025 + h * 0.55, -0.05, 0.206, 0.1, { color: PALETTE.orange, uv: "keep", segments: 12 });
    f.cylV("metal", u, v + 0.025 + h + 0.03, -0.05, 0.07, 0.06, { color: PALETTE.steel, segments: 8 });
  }
}

// Crates: two lidded boxes with edge rails and a label.
function crateRow(f, v, Wd, D, seed) {
  for (const [u, w, h, col] of [[-0.6, 1.0, 0.55, PALETTE.gunmetal], [0.55, 0.9, 0.45, PALETTE.slate]]) {
    f.box("painted", u, v + 0.025 + h / 2, -0.05, w, h, D - 0.35, { color: col, uv: "keep" });
    f.box("metal", u, v + 0.025 + h + 0.015, -0.05, w + 0.04, 0.03, D - 0.31, { color: PALETTE.darkMetal, texel: 2 });
    for (const s of [-1, 1]) f.box("metal", u + s * (w / 2 - 0.05), v + 0.025 + h / 2, -0.05, 0.03, h, D - 0.33, { color: PALETTE.darkMetal, texel: 2 });
    f.box("painted", u + w * 0.15, v + 0.025 + h * 0.62, D / 2 - 0.2 + 0.006, w * 0.4, 0.07, 0.01, { color: PALETTE.cream, uv: "keep" });
    f.add("decal", new THREE.PlaneGeometry(0.2, 0.2), u - w * 0.28, v + 0.025 + h * 0.45, D / 2 - 0.2 + 0.008, { uv: "keep", uvRect: decalRect((seed + 3) % 16) });
  }
}

// Parts rack in a yaw frame (back at n < 0): braced uprights, five shelves with mixed loads, a black
// header with the bay label lit from a recessed channel.
function partsRack(f, seed) {
  const Wd = 2.6;
  const D = 1.0;
  const H = 3.6;
  for (const s of [-1, 1]) for (const n of [-D / 2 + 0.05, D / 2 - 0.05]) f.box("metal", s * (Wd / 2 - 0.04), H / 2, n, 0.08, H, 0.08, { color: PALETTE.gunmetal, texel: 2 });
  for (const v of [0.12, 1.75, H - 0.1]) for (const s of [-1, 1]) f.box("metal", s * (Wd / 2 - 0.04), v, 0, 0.05, 0.05, D - 0.1, { color: PALETTE.gunmetal });
  const braceAng = Math.atan2(1.55, Wd - 0.16);
  const braceLen = Math.hypot(1.55, Wd - 0.16);
  for (const v of [0.95, 2.6]) for (const s of [-1, 1]) f.box("metal", 0, v, -D / 2 + 0.05, braceLen, 0.03, 0.02, { color: PALETTE.steel, spin: s * braceAng });
  for (let lv = 0; lv < 5; lv++) {
    const v = 0.25 + lv * 0.8;
    f.box("metal", 0, v, 0, Wd, 0.05, D, { color: PALETTE.steel, texel: 2 });
    f.box("paintedMetal", 0, v - 0.07, D / 2 - 0.02, Wd, 0.12, 0.03, { color: PALETTE.darkMetal, texel: 2 });
    const kind = (lv * 3 + seed) % 6;
    if (kind === 0) stockRow(f, v, Wd, D, seed + lv);
    else if (kind === 1) canisterRow(f, v, Wd, D, seed + lv);
    else if (kind === 2 && lv < 4) crateRow(f, v, Wd, D, seed + lv);
    else binRow(f, v, Wd, D, lv === 4 ? 0.3 : 0.42, seed + lv);
  }
  f.box("satinBlack", 0, H + 0.1, 0, Wd, 0.3, D);
  f.box("satinBlack", 0, H + 0.12, D / 2 + 0.03, Wd - 0.4, 0.08, 0.06);
  f.cylU("emitAmber", 0, H + 0.07, D / 2 + 0.045, 0.016, Wd - 0.5, { segments: 8, uv: "keep" });
  f.add("decal", new THREE.PlaneGeometry(0.28, 0.28), -Wd / 2 + 0.22, H + 0.1, D / 2 + 0.008, { uv: "keep", uvRect: decalRect(2) });
  f.add("decal", new THREE.PlaneGeometry(0.28, 0.28), Wd / 2 - 0.22, H + 0.1, D / 2 + 0.008, { uv: "keep", uvRect: decalRect([8, 9, 14, 11, 12][seed % 5]) });
  f.collider(-Wd / 2 - 0.05, Wd / 2 + 0.05, 0, H + 0.3, -D / 2, D / 2 + 0.05, "rack");
}

// Gantry crane bridge as its own merged group (the room's update drives it along z): box girder on
// two end trucks (wheels on the rail heads, buffers, drive motors, collector arms down to the conductor
// bars), an underhung trolley with control cabinet, hoist drum, rope falls and a two-cheek hook block,
// festoon cable loops along the girder, a hoisted pendant, beacon and work-light panel.
function buildCrane(ctx, xa, xb, yBase) {
  const ck = new Kit(ctx.materials);
  const span = xb - xa;
  const cx = (xa + xb) / 2;
  const y = yBase + 0.6; // girder bottom
  const G = 1.0;
  ck.box("paintedMetal", cx, y + G / 2, 0, span, G, 0.7, { color: PALETTE.gunmetal, texel: 1 });
  ck.box("metal", cx, y + G + 0.05, 0, span, 0.1, 0.9, { color: PALETTE.darkMetal, texel: 2 });
  ck.box("metal", cx, y - 0.05, 0, span, 0.1, 0.9, { color: PALETTE.darkMetal, texel: 2 });
  for (let x = xa + 1.5; x < xb - 1.0; x += 2.0) ck.box("metal", x, y + G / 2, 0, 0.12, G - 0.02, 0.76, { color: PALETTE.darkMetal, texel: 2 });
  for (const ex of [xa + 1.9, xb - 1.9]) for (const s of [-1, 1]) ck.box("hazard", ex, y + G / 2, s * 0.351, 1.2, 0.5, 0.01, { texel: 3 });
  for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(0.7, 0.7);
    if (s < 0) g.rotateY(Math.PI);
    ck.add("decal", g, { pos: [cx + 3.5, y + G / 2, s * 0.352], uv: "keep", uvRect: decalRect(12) });
  }
  // end trucks
  const rt = yBase - 0.08; // runway girder top
  for (const [ex, s] of [[xa, 1], [xb, -1]]) {
    ck.box("metal", ex, yBase + 0.45, 0, 1.4, 0.5, 1.9, { color: PALETTE.darkMetal, texel: 1.5 });
    ck.box("painted", ex, yBase + 0.72, 0, 1.0, 0.06, 1.4, { color: PALETTE.orange, uv: "keep" });
    for (const wz of [-0.7, 0.7]) {
      ck.cyl("metal", ex, yBase + 0.25, wz, 0.25, 0.5, "x", { color: PALETTE.steel, segments: 16 });
      ck.box("paintedMetal", ex, yBase + 0.56, wz, 0.62, 0.1, 0.62, { color: PALETTE.gunmetal, texel: 2 });
    }
    for (const bz of [-1.0, 1.0]) ck.cyl("rubber", ex, yBase + 0.3, bz, 0.08, 0.12, "z", { color: PALETTE.rubber, segments: 8 });
    ck.cyl("metal", ex - s * 0.15, yBase + 0.95, -0.55, 0.16, 0.5, "z", { color: PALETTE.gunmetal, segments: 12 });
    ck.box("satinBlack", ex - s * 0.15, yBase + 0.95, 0.55, 0.4, 0.3, 0.4);
    // collector arm from the truck down to the conductor bars hung under the runway girder
    beamBetween(ck, "metal", [ex + s * 0.7, yBase + 0.25, 0.4], [ex + s * 0.64, rt - 0.74, 0.4], 0.06, 0.06, { color: PALETTE.steel, texel: 2 });
    ck.box("metal", ex + s * 0.58, rt - 0.74, 0.4, 0.08, 0.26, 0.16, { color: PALETTE.darkMetal, texel: 2 });
  }
  // underhung trolley at 40 % span
  const tx = xa + span * 0.4;
  for (const s of [-1, 1]) {
    ck.box("paintedMetal", tx, y - 0.45, s * 0.6, 1.7, 0.9, 0.16, { color: PALETTE.slate, texel: 1 });
    for (const dx of [-0.6, 0.6]) ck.box("metal", tx + dx, y - 0.1, s * 0.63, 0.36, 0.3, 0.22, { color: PALETTE.gunmetal, texel: 2 });
  }
  ck.box("paintedMetal", tx, y - 0.95, 0, 1.8, 0.12, 1.4, { color: PALETTE.darkMetal, texel: 2 });
  ck.box("satinBlack", tx - 0.55, y - 0.55, 0, 0.5, 0.6, 1.0);
  ck.box("leds", tx - 0.55, y - 0.45, 0.505, 0.3, 0.04, 0.01, { uv: "keep" });
  ck.box("emitAmber", tx - 0.55, y - 0.65, 0.505, 0.08, 0.08, 0.01, { uv: "keep" });
  const dy = y - 1.3;
  ck.cyl("metal", tx + 0.2, dy, 0, 0.26, 1.1, "x", { color: PALETTE.gunmetal, segments: 16 });
  ck.cyl("metal", tx + 0.2, dy, 0, 0.3, 0.55, "x", { color: PALETTE.steel, segments: 16 });
  for (const k of [-1, 1]) ck.cyl("metal", tx + 0.2 + k * 0.6, dy, 0, 0.34, 0.08, "x", { color: PALETTE.darkMetal, segments: 16 });
  ck.cyl("metal", tx - 0.65, dy, 0, 0.18, 0.5, "x", { color: PALETTE.gunmetal, segments: 12 });
  for (const s of [-1, 1]) ck.box("metal", tx + 0.2 + s * 0.75, dy + 0.18, 0, 0.1, 0.7, 0.5, { color: PALETTE.darkMetal, texel: 2 });
  ck.cyl("metal", tx + 0.6, y - 1.04, 0.72, 0.1, 0.06, "y", { color: PALETTE.gunmetal, segments: 10 });
  ck.cyl("emitOrange", tx + 0.6, y - 1.13, 0.72, 0.07, 0.12, "y", { segments: 10, uv: "keep" });
  ck.box("satinBlack", tx - 0.4, y - 1.06, 0.7, 0.5, 0.1, 0.3);
  ck.box("emitWarmSoft", tx - 0.4, y - 1.115, 0.7, 0.4, 0.01, 0.2, { uv: "keep" });
  // rope falls, hook block (two cheek plates around the sheave), swivel and hook with safety latch
  const hookY = y - 2.4;
  const ropeTop = dy - 0.1;
  for (const dx of [-0.2, 0.2]) ck.cyl("metal", tx + 0.2 + dx, (ropeTop + hookY + 0.3) / 2, 0, 0.014, ropeTop - hookY - 0.3, "y", { color: PALETTE.steel, segments: 6 });
  for (const s of [-1, 1]) {
    ck.box("metal", tx + 0.2, hookY, s * 0.17, 0.7, 0.6, 0.04, { color: PALETTE.darkMetal, texel: 2 });
    ck.box("hazard", tx + 0.2, hookY - 0.14, s * 0.191, 0.7, 0.14, 0.01, { texel: 3 });
  }
  ck.cyl("metal", tx + 0.2, hookY + 0.04, 0, 0.24, 0.3, "z", { color: PALETTE.gunmetal, segments: 16 });
  ck.box("metal", tx + 0.2, hookY - 0.28, 0, 0.5, 0.06, 0.4, { color: PALETTE.darkMetal, texel: 2 });
  ck.cyl("metal", tx + 0.2, hookY - 0.42, 0, 0.06, 0.24, "y", { color: PALETTE.steel, segments: 8 });
  ck.add("metal", new THREE.TorusGeometry(0.26, 0.05, 8, 20, Math.PI * 1.5), { pos: [tx + 0.2, hookY - 0.78, 0], rot: [0, 0, (3 * Math.PI) / 4], color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
  ck.box("metal", tx + 0.08, hookY - 0.62, 0, 0.03, 0.3, 0.03, { color: PALETTE.gunmetal });
  // festoon: C-track on the -z face from the port truck to the trolley, carriers and hanging loops
  const trackY = y - 0.2;
  const fx0 = xa + 0.9;
  const fx1 = tx - 0.95;
  ck.box("metal", (fx0 + fx1) / 2, trackY, -0.42, fx1 - fx0 + 0.2, 0.06, 0.06, { color: PALETTE.gunmetal });
  const n = Math.max(2, Math.floor((fx1 - fx0) / 0.9));
  const pitch = (fx1 - fx0) / n;
  for (let i = 0; i <= n; i++) ck.box("metal", fx0 + i * pitch, trackY - 0.08, -0.42, 0.06, 0.16, 0.05, { color: PALETTE.steel });
  for (let i = 0; i < n; i++) {
    for (const [r, off, col] of [[pitch / 2, -0.44, PALETTE.rubber], [pitch / 2 - 0.05, -0.49, PALETTE.orange]]) {
      const g = new THREE.TorusGeometry(r, 0.02, 5, 12, Math.PI);
      g.rotateZ(Math.PI);
      ck.add("rubber", g, { pos: [fx0 + (i + 0.5) * pitch, trackY - 0.16, off], color: col, uv: "scale", uvScale: [4, 1] });
    }
  }
  cylBetween(ck, "rubber", [fx1, trackY - 0.16, -0.44], [tx - 0.55, y - 0.85, -0.5], 0.02, { color: PALETTE.rubber, segments: 6 });
  cylBetween(ck, "rubber", [xa + 0.7, yBase + 0.7, -0.44], [fx0, trackY - 0.16, -0.44], 0.02, { color: PALETTE.rubber, segments: 6 });
  // hoisted pendant controller
  ck.cyl("rubber", tx - 0.3, y - 1.7, 0.55, 0.012, 1.2, "y", { color: PALETTE.rubber, segments: 6 });
  ck.box("painted", tx - 0.3, y - 2.45, 0.55, 0.12, 0.3, 0.08, { color: PALETTE.orange, uv: "keep" });
  ck.box("leds", tx - 0.3, y - 2.4, 0.595, 0.06, 0.12, 0.01, { uv: "keep" });
  const g = new THREE.Group();
  g.name = "gantryCrane";
  ck.build(g);
  return g;
}

// Ion-engine nacelle under repair: body along x with its open face (flange, dark bore, protruding core,
// coolant glow rings, field-coil blocks) at ex and the capped nozzle bell toward -x, on a wheeled
// transport dolly with saddle cradles; one side panel removed and leaning on the dolly, exposed coils.
function ionEngine(kit, ex, y0, ez) {
  const r = 1.25;
  const cy = y0 + 0.55 + r;
  const bodyL = 4.2;
  const bx1 = ex;
  const bx0 = ex - bodyL;
  const mid = (bx0 + bx1) / 2;
  kit.cyl("paintedMetal", mid, cy, ez, r, bodyL, "x", { color: PALETTE.slate, segments: 28, texel: 0.7 });
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    kit.add("metal", new THREE.BoxGeometry(bodyL - 0.6, 0.12, 0.22), { pos: [mid, cy + Math.cos(a) * (r + 0.04), ez + Math.sin(a) * (r + 0.04)], rot: [a, 0, 0], color: PALETTE.gunmetal, texel: 1.5 });
  }
  for (const x of [bx0 + 0.5, bx0 + 2.3, bx1 - 0.45]) kit.add("metal", new THREE.TorusGeometry(r + 0.08, 0.08, 6, 28), { pos: [x, cy, ez], rot: [0, Math.PI / 2, 0], color: PALETTE.steel, uv: "scale", uvScale: [8, 1] });
  // opened coil bay facing the walkway (+z, slightly up): dark recess, exposed coils, the removed panel
  {
    const a = 1.15;
    const px = bx0 + 1.4;
    kit.add("darkGloss", new THREE.BoxGeometry(1.4, 0.06, 0.9), { pos: [px, cy + Math.cos(a) * r, ez + Math.sin(a) * r], rot: [a, 0, 0] });
    for (const dx of [-0.36, 0.36]) kit.add("metal", new THREE.TorusGeometry(0.22, 0.05, 6, 16), { pos: [px + dx, cy + Math.cos(a) * (r + 0.02), ez + Math.sin(a) * (r + 0.02)], rot: [a - Math.PI / 2, 0, 0], color: PALETTE.brass, uv: "scale", uvScale: [6, 1] });
    kit.add("metal", new THREE.BoxGeometry(1.0, 0.05, 0.12), { pos: [px, cy + Math.cos(a) * (r + 0.05), ez + Math.sin(a) * (r + 0.05)], rot: [a, 0, 0], color: PALETTE.gunmetal, texel: 2 });
    kit.add("paintedMetal", new THREE.BoxGeometry(1.4, 0.9, 0.05), { pos: [px, y0 + 0.47, ez + 1.62], rot: [-0.35, 0, 0], color: PALETTE.slate, texel: 1 });
    kit.collider([px - 0.7, y0, ez + 1.4], [px + 0.7, y0 + 0.9, ez + 1.85], "panel");
  }
  // capped nozzle bell (blanking cover with a stencil) and the open +x face
  kit.add("paintedMetal", new THREE.CylinderGeometry(r * 0.8, r + 0.4, 1.5, 28), { pos: [bx0 - 0.75, cy, ez], rot: [0, 0, -Math.PI / 2], color: PALETTE.gunmetal, texel: 0.8 });
  kit.add("metal", new THREE.TorusGeometry(r + 0.42, 0.07, 6, 28), { pos: [bx0 - 1.5, cy, ez], rot: [0, Math.PI / 2, 0], color: PALETTE.steel, uv: "scale", uvScale: [8, 1] });
  kit.cyl("painted", bx0 - 1.53, cy, ez, r + 0.3, 0.05, "x", { color: PALETTE.creamDark, uv: "keep", segments: 28 });
  stencil(kit, bx0 - 1.56, cy, ez, 1.2, 5, "-x");
  kit.cyl("metal", bx1 + 0.06, cy, ez, r + 0.1, 0.12, "x", { color: PALETTE.darkMetal, segments: 28 });
  kit.cyl("darkGloss", bx1 + 0.125, cy, ez, r - 0.1, 0.02, "x", { segments: 28 });
  kit.cyl("metal", bx1 + 0.38, cy, ez, 0.55, 0.5, "x", { color: PALETTE.gunmetal, segments: 20 });
  kit.cyl("darkGloss", bx1 + 0.64, cy, ez, 0.4, 0.02, "x", { segments: 20 });
  kit.add("emitCoolSoft", new THREE.TorusGeometry(0.72, 0.035, 6, 32), { pos: [bx1 + 0.16, cy, ez], rot: [0, Math.PI / 2, 0], uv: "keep" });
  kit.add("emitCoolSoft", new THREE.TorusGeometry(1.02, 0.025, 6, 32), { pos: [bx1 + 0.15, cy, ez], rot: [0, Math.PI / 2, 0], uv: "keep" });
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    kit.add("metal", new THREE.BoxGeometry(0.34, 0.16, 0.3), { pos: [bx1 + 0.3, cy + Math.cos(a) * 0.86, ez + Math.sin(a) * 0.86], rot: [a, 0, 0], color: PALETTE.brass, texel: 2 });
  }
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + Math.PI / 12;
    kit.cyl("metal", bx1 + 0.13, cy + Math.cos(a) * (r + 0.02), ez + Math.sin(a) * (r + 0.02), 0.03, 0.04, "x", { color: PALETTE.steel, segments: 6 });
  }
  // transport dolly: two longitudinal beams, cross beams, saddle cradles, wheels, jack posts, tow bar
  const dz = 0.95;
  for (const s of [-1, 1]) kit.boxMM("paintedMetal", [bx0 - 0.6, y0 + 0.3, ez + s * dz - 0.1], [bx1 + 0.4, y0 + 0.55, ez + s * dz + 0.1], { color: PALETTE.gunmetal, texel: 1.5 });
  for (const x of [bx0 - 0.4, bx0 + 1.9, bx1 + 0.2]) kit.boxMM("paintedMetal", [x - 0.1, y0 + 0.3, ez - dz], [x + 0.1, y0 + 0.55, ez + dz], { color: PALETTE.gunmetal, texel: 1.5 });
  for (const x of [bx0 + 0.7, bx1 - 0.7]) {
    kit.box("paintedMetal", x, y0 + 0.75, ez, 0.4, 0.4, 2.0, { color: PALETTE.darkMetal, texel: 1.5 });
    kit.box("rubber", x, y0 + 0.97, ez, 0.44, 0.06, 1.6, { color: PALETTE.rubber });
  }
  for (const x of [bx0 - 0.3, bx1 + 0.1]) for (const s of [-1, 1]) {
    kit.cyl("rubber", x, y0 + 0.2, ez + s * (dz + 0.17), 0.2, 0.12, "z", { color: PALETTE.rubber, segments: 14 });
    kit.cyl("metal", x, y0 + 0.2, ez + s * (dz + 0.17), 0.06, 0.16, "z", { color: PALETTE.steel, segments: 8 });
    kit.cyl("metal", x + 0.45, y0 + 0.15, ez + s * dz, 0.04, 0.3, "y", { color: PALETTE.steel, segments: 8 });
  }
  kit.box("metal", bx0 - 1.0, y0 + 0.36, ez, 0.8, 0.06, 0.08, { color: PALETTE.steel, texel: 2 });
  kit.box("hazard", bx0 - 0.6, y0 + 0.425, ez, 0.06, 0.26, 2 * dz + 0.2, { texel: 3 });
  kit.box("hazard", bx1 + 0.4, y0 + 0.425, ez, 0.06, 0.26, 2 * dz + 0.2, { texel: 3 });
  kit.collider([bx0 - 1.6, y0, ez - dz - 0.3], [bx1 + 0.75, y0 + 0.6, ez + dz + 0.3], "dolly");
  kit.collider([bx0 - 1.6, y0, ez - r - 0.1], [bx1 + 0.75, y0 + 3.2, ez + r + 0.1], "engine");
}

// Deflector-generator dome on a ring stand, wired to a diagnostics rack (facing the dome).
function testRig(kit, x, y0, z) {
  const ringY = y0 + 0.95;
  kit.add("metal", new THREE.TorusGeometry(0.95, 0.06, 8, 24), { pos: [x, ringY, z], rot: [Math.PI / 2, 0, 0], color: PALETTE.gunmetal, uv: "scale", uvScale: [8, 1] });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    beamBetween(kit, "paintedMetal", [x + Math.cos(a) * 1.25, y0 + 0.05, z + Math.sin(a) * 1.25], [x + Math.cos(a) * 0.9, ringY - 0.05, z + Math.sin(a) * 0.9], 0.08, 0.08, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("metal", x + Math.cos(a) * 1.25, y0 + 0.03, z + Math.sin(a) * 1.25, 0.24, 0.06, 0.24, { color: PALETTE.darkMetal, texel: 2 });
  }
  kit.cyl("metal", x, ringY + 0.12, z, 0.98, 0.24, "y", { color: PALETTE.darkMetal, segments: 24 });
  kit.add("paintedMetal", new THREE.SphereGeometry(0.88, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, ringY + 0.24, z], color: PALETTE.slate, texel: 0.7 });
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    kit.box("metal", x + Math.cos(a) * 0.62, ringY + 0.86, z + Math.sin(a) * 0.62, 0.16, 0.1, 0.16, { color: PALETTE.gunmetal, texel: 2 });
  }
  kit.cyl("emitCoolSoft", x, ringY + 1.12, z, 0.12, 0.1, "y", { segments: 12, uv: "keep" });
  kit.add("emitCoolSoft", new THREE.TorusGeometry(0.9, 0.02, 5, 32), { pos: [x, ringY + 0.25, z], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  kit.collider([x - 1.1, y0, z - 1.1], [x + 1.1, ringY + 1.2, z + 1.1], "testRig");
  const rack = yawFrame(kit, x + 2.8, y0, z - 0.2, -Math.PI / 2);
  rack.box("satinBlack", 0, 1.0, 0, 0.9, 2.0, 0.7);
  rack.box("metal", 0, 2.02, 0, 0.94, 0.04, 0.74, { color: PALETTE.darkMetal, texel: 2 });
  rack.box("screen6", 0, 1.55, 0.355, 0.7, 0.4, 0.01, { uv: "keep" });
  rack.box("leds", 0, 1.25, 0.355, 0.6, 0.05, 0.01, { uv: "keep" });
  const face = offsetFrame(rack, 0.35);
  gauge(face, -0.22, 0.95, 0.14, { needle: 0.55 });
  gauge(face, 0.22, 0.95, 0.14, { needle: 0.3, mat: "emitCoolSoft" });
  breakerColumn(face, -0.3, 0.3, 3);
  rack.box("hazard", 0, 0.1, 0.355, 0.8, 0.12, 0.01, { texel: 3 });
  rack.collider(-0.5, 0.5, 0, 2.1, -0.4, 0.4, "testRack");
  pipeRun(kit, "rubber", [[x + 2.45, y0 + 0.6, z - 0.1], [x + 1.9, y0 + 0.12, z - 0.1], [x + 1.1, y0 + 0.12, z], [x + 0.95, ringY + 0.1, z]], 0.03, { color: PALETTE.rubber, segments: 6 });
  pipeRun(kit, "rubber", [[x + 2.45, y0 + 0.7, z - 0.3], [x + 1.7, y0 + 0.12, z - 0.5], [x + 0.8, y0 + 0.12, z - 0.6], [x + 0.6, ringY + 0.05, z - 0.7]], 0.025, { color: PALETTE.orange, segments: 6 });
}

// Imperial cargo container: satin-black body, corner posts and rails, recessed side panel, lit label
// channel, code decal and a handle.
function container(kit, x, y, z, yaw, w, h, d, seed) {
  const f = yawFrame(kit, x, y, z, yaw);
  f.box("satinBlack", 0, h / 2, 0, w, h, d);
  for (const su of [-1, 1]) for (const sn of [-1, 1]) f.box("metal", su * (w / 2 - 0.05), h / 2, sn * (d / 2 - 0.05), 0.12, h + 0.02, 0.12, { color: PALETTE.gunmetal, texel: 2 });
  for (const sv of [0.06, h - 0.06]) for (const sn of [-1, 1]) f.box("metal", 0, sv, sn * d / 2, w, 0.1, 0.03, { color: PALETTE.gunmetal, texel: 2 });
  for (const sn of [-1, 1]) {
    f.box("paintedMetal", 0, h / 2, sn * (d / 2 + 0.005), w - 0.4, h - 0.4, 0.01, { color: PALETTE.gunmetal, texel: 1.5 });
    f.box("satinBlack", -w / 4, h * 0.7, sn * (d / 2 + 0.02), 0.4, 0.09, 0.03);
    f.box("emitAmber", -w / 4, h * 0.7, sn * (d / 2 + 0.036), 0.32, 0.03, 0.004, { uv: "keep" });
    f.box("metal", 0, h * 0.3, sn * (d / 2 + 0.03), 0.5, 0.05, 0.04, { color: PALETTE.steel });
  }
  const g = new THREE.PlaneGeometry(0.3, 0.3);
  f.add("decal", g, w / 4, h * 0.55, d / 2 + 0.017, { uv: "keep", uvRect: decalRect((seed * 5) % 16) });
  f.collider(-w / 2, w / 2, 0, h, -d / 2, d / 2, "container");
  return f;
}

// Standing tripod work light aimed along yaw: three legs, mast, tilted head with a soft panel and a
// warm practical in front of it; power lead to the floor.
function tripodLamp(kit, ctx, x, y0, z, yaw, opts = {}) {
  const { intensity = 45, distance = 12 } = opts;
  const hubY = y0 + 1.6;
  for (let k = 0; k < 3; k++) {
    const a = yaw + (k * 2 * Math.PI) / 3 + Math.PI / 3;
    beamBetween(kit, "metal", [x + Math.sin(a) * 0.55, y0 + 0.02, z + Math.cos(a) * 0.55], [x, hubY, z], 0.04, 0.04, { color: PALETTE.gunmetal, texel: 2 });
  }
  kit.cyl("metal", x, hubY + 0.35, z, 0.03, 0.9, "y", { color: PALETTE.steel, segments: 8 });
  kit.cyl("metal", x, hubY, z, 0.08, 0.14, "y", { color: PALETTE.darkMetal, segments: 10 });
  const f = yawFrame(kit, x, hubY + 0.8, z, yaw);
  f.box("satinBlack", 0, 0, 0, 0.5, 0.36, 0.22, { tilt: 0.5 });
  f.box("emitWarmSoft", 0, -0.055, 0.101, 0.42, 0.28, 0.01, { tilt: 0.5, uv: "keep" });
  f.box("metal", 0, -0.22, 0, 0.08, 0.1, 0.06, { color: PALETTE.steel });
  const lp = f.pos(0, -0.2, 0.4);
  ctx.lights.warm.push(pointLight(0xffd2a4, intensity, distance, [lp.x, lp.y, lp.z]));
  const foot = f.pos(0.3, -hubY - 0.8, -0.5);
  pipeRun(kit, "rubber", [[x, hubY - 0.1, z], [x + 0.15, y0 + 0.05, z - 0.35], [foot.x, y0 + 0.03, foot.z]], 0.014, { color: PALETTE.rubber, segments: 6 });
  kit.collider([x - 0.55, y0, z - 0.55], [x + 0.55, hubY + 1.1, z + 0.55], "lamp");
}

// Hand pallet jack.
function palletJack(kit, x, y0, z, yaw) {
  const f = yawFrame(kit, x, y0, z, yaw);
  for (const u of [-0.25, 0.25]) {
    f.box("painted", u, 0.1, 0.35, 0.16, 0.08, 1.2, { color: PALETTE.orange, uv: "keep" });
    f.cylU("rubber", u, 0.06, 0.85, 0.06, 0.08, { color: PALETTE.rubber, segments: 8 });
  }
  f.box("painted", 0, 0.3, -0.35, 0.7, 0.5, 0.3, { color: PALETTE.orange, uv: "keep" });
  f.box("satinBlack", 0, 0.42, -0.51, 0.3, 0.14, 0.02);
  f.cylV("metal", 0, 0.95, -0.42, 0.02, 0.9, { color: PALETTE.steel, segments: 6 });
  f.box("metal", 0, 1.4, -0.42, 0.36, 0.04, 0.04, { color: PALETTE.steel });
  f.cylU("rubber", 0, 0.1, -0.35, 0.1, 0.3, { color: PALETTE.rubber, segments: 10 });
  f.collider(-0.4, 0.4, 0, 1.45, -0.55, 0.95, "palletJack");
}

// Caged work light on a wall arm (wall frame at u, arm at height v reaching `reach` into the room):
// nothing hangs from the ceiling inside the crane's travel envelope.
function armLight(kit, ctx, frame, u, v, reach, opts) {
  frame.box("metal", u, v, 0.04, 0.18, 0.28, 0.08, { color: PALETTE.darkMetal, texel: 2 });
  frame.box("metal", u, v, reach / 2, 0.06, 0.06, reach, { color: PALETTE.gunmetal, texel: 2 });
  const a = frame.pos(u, v - 0.5, 0.04);
  const b = frame.pos(u, v - 0.03, reach - 0.15);
  beamBetween(kit, "metal", a.toArray(), b.toArray(), 0.03, 0.03, { color: PALETTE.steel, texel: 2 });
  const p = frame.pos(u, v, reach);
  cageLight(kit, ctx, p.x, p.y, p.z, 0.45, opts);
}

// Floor-standing cable boom: post with an arm carrying a retractable reel whose cable hangs to eye
// level (the crane sweeps the whole ceiling, so drops come from booms, not the ceiling).
function boomDrop(kit, px, y0, pz, yaw, reach, yEnd, opts = {}) {
  const f = yawFrame(kit, px, y0, pz, yaw);
  const H = 3.3;
  f.cylV("metal", 0, H / 2, 0, 0.06, H, { color: PALETTE.gunmetal, segments: 10 });
  f.cylV("metal", 0, 0.03, 0, 0.3, 0.06, { color: PALETTE.darkMetal, segments: 14 });
  f.box("hazard", 0, 0.5, 0, 0.13, 0.4, 0.13, { texel: 3 });
  f.box("metal", 0, H - 0.04, reach / 2, 0.06, 0.08, reach + 0.1, { color: PALETTE.gunmetal, texel: 2 });
  const a = f.pos(0, H - 0.8, 0);
  const b = f.pos(0, H - 0.08, reach);
  beamBetween(kit, "metal", a.toArray(), b.toArray(), 0.03, 0.03, { color: PALETTE.steel, texel: 2 });
  const e = f.pos(0, H - 0.08, reach);
  cableDrop(kit, e.x, e.y, e.z, yEnd, opts);
  f.collider(-0.3, 0.3, 0, 1.2, -0.3, 0.3, "boomPost");
}

// Rolling access platform beside a workpiece: deck with railings on three sides, five steps toward +z,
// casters; walkable.
function rollingPlatform(kit, x0, x1, zTop0, zTop1, y0, h) {
  const top = y0 + h;
  kit.boxMM("paintedMetal", [x0, top - 0.08, zTop0], [x1, top, zTop1], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("hazard", [x0, top, zTop0], [x1, top + 0.004, zTop0 + 0.1], { texel: 3 });
  kit.boxMM("hazard", [x0, top, zTop1 - 0.1], [x1, top + 0.004, zTop1], { texel: 3 });
  kit.floor(x0, zTop0, x1, zTop1, top);
  for (const [px, pz] of [[x0 + 0.06, zTop0 + 0.06], [x1 - 0.06, zTop0 + 0.06], [x0 + 0.06, zTop1 - 0.06], [x1 - 0.06, zTop1 - 0.06]]) {
    kit.box("metal", px, y0 + 0.1 + (top - 0.1 - y0) / 2, pz, 0.06, top - 0.1 - y0, 0.06, { color: PALETTE.gunmetal, texel: 2 });
    kit.cyl("rubber", px, y0 + 0.07, pz, 0.07, 0.05, "z", { color: PALETTE.rubber, segments: 10 });
  }
  beamBetween(kit, "metal", [x0 + 0.06, y0 + 0.25, zTop0 + 0.06], [x1 - 0.06, top - 0.2, zTop1 - 0.06], 0.04, 0.04, { color: PALETTE.gunmetal, texel: 2 });
  railing(kit, x1, zTop0, x1, zTop1, top, { n0: -0.06, tag: "platRail" });
  railing(kit, x0, zTop0, x1, zTop0, top, { n0: 0.06, tag: "platRail" });
  const stepL = 1.3;
  kit.stairs("paintedMetal", x0, zTop1 + stepL, x1, zTop1, y0, top, "z", { color: PALETTE.gunmetal, steps: 5 });
  stairRail(kit, [x0, y0, zTop1 + stepL], [x0, top, zTop1], [-0.03, 0]);
  stairRail(kit, [x1, y0, zTop1 + stepL], [x1, top, zTop1], [0.03, 0]);
  kit.collider([x0, y0, zTop0], [x1, top, zTop1], "platform");
}

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", lights: false, lightRows: 3, skipWalls: ["-x", "+x", "-z", "+z"] });
  coarseWalls(kit, room, lib, shell, { seed: 6300, bandMat: "emitWarmSoft" });
  const y0 = shell.y0;
  const yTop = shell.yTop;
  const { x0, x1, z0, z1 } = room;
  const WT = lib.WALL_T;

  // ---------------------------------------------------------------- floor markings (paint): entry runner, work zones
  kit.boxMM("deck", [68.6, y0, 462.5], [71.4, y0 + 0.006, z1 - 0.2], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
  paintStrip(kit, 68.5, 462.5, 68.6, z1 - 0.3, y0);
  paintStrip(kit, 71.4, 462.5, 71.5, z1 - 0.3, y0);
  for (let z = 462.6; z < 464.2; z += 0.4) paintStrip(kit, 68.6, z, 71.4, z + 0.12, y0);
  stencil(kit, 70, y0 + 0.009, 475.4, 1.4, 1, "up");
  stencil(kit, 70, y0 + 0.009, 465.0, 1.2, 3, "up");
  paintRect(kit, 59.0, 455.2, 78.4, 461.8, y0, 0.1);
  paintRect(kit, 58.2, 465.2, 67.9, 473.8, y0, 0.1);
  paintRect(kit, 72.4, 462.4, 82.0, 472.0, y0, 0.1);
  paintStrip(kit, 55.6, 465.9, 58.2, 466.0, y0);
  paintStrip(kit, 82.0, 466.9, 85.6, 467.0, y0);

  // ---------------------------------------------------------------- gantry crane: runway girders, rail heads, brackets, conductor bars, travelling bridge
  const railW = x0 + RAIL_IN;
  const railE = x1 - RAIL_IN;
  const rt = y0 + RAIL_TOP;
  for (const [rx, wx, s] of [[railW, x0 + WT, 1], [railE, x1 - WT, -1]]) {
    kit.boxMM("paintedMetal", [rx - 0.15, rt - 0.45, 445.5], [rx + 0.15, rt - 0.05, 477.0], { color: PALETTE.gunmetal, texel: 1 });
    kit.boxMM("metal", [rx - 0.22, rt - 0.5, 445.5], [rx + 0.22, rt - 0.44, 477.0], { color: PALETTE.darkMetal, texel: 2 });
    kit.boxMM("metal", [rx - 0.22, rt - 0.06, 445.5], [rx + 0.22, rt, 477.0], { color: PALETTE.darkMetal, texel: 2 });
    kit.boxMM("metal", [rx - 0.06, rt, 445.5], [rx + 0.06, rt + 0.08, 477.0], { color: PALETTE.steel, texel: 2 });
    kit.boxMM("paintedMetal", [Math.min(wx, wx + s * 0.25), rt - 1.1, 445.3], [Math.max(wx, wx + s * 0.25), rt - 0.1, 477.2], { color: PALETTE.darkMetal, texel: 1 });
    for (let z = 447.0; z < 477; z += 4.0) {
      kit.boxMM("paintedMetal", [Math.min(wx, rx), rt - 0.95, z - 0.15], [Math.max(wx, rx), rt - 0.5, z + 0.15], { color: PALETTE.gunmetal, texel: 1.5 });
      beamBetween(kit, "metal", [wx, rt - 2.3, z], [rx - s * 0.1, rt - 1.0, z], 0.12, 0.12, { color: PALETTE.steel, texel: 2 });
      kit.box("metal", wx + s * 0.1, rt - 2.3, z, 0.2, 0.5, 0.4, { color: PALETTE.darkMetal, texel: 2 });
    }
    // conductor channel with three bars hung under the girder on the room side; buffers at the rail ends
    const cxr = rx + s * 0.42;
    kit.boxMM("satinBlack", [cxr - 0.08, rt - 0.86, 446.0], [cxr + 0.08, rt - 0.62, 476.5]);
    for (let z = 447.0; z < 477; z += 4.0) kit.box("metal", cxr - s * 0.14, rt - 0.56, z, 0.34, 0.12, 0.05, { color: PALETTE.gunmetal, texel: 2 });
    for (const v of [rt - 0.8, rt - 0.74, rt - 0.68]) kit.boxMM("metal", [Math.min(rx + s * 0.5, rx + s * 0.54), v - 0.012, 446.0], [Math.max(rx + s * 0.5, rx + s * 0.54), v + 0.012, 476.5], { color: PALETTE.brass, texel: 2 });
    for (const ze of [446.0, 476.6]) {
      kit.box("painted", rx, rt + 0.3, ze, 0.5, 0.5, 0.3, { color: PALETTE.orange, uv: "keep" });
      kit.box("hazard", rx, rt + 0.3, ze, 0.52, 0.16, 0.32, { texel: 3 });
    }
  }
  {
    const crane = buildCrane(ctx, railW, railE, rt + 0.08);
    const zA = 451.4;
    const zB = 472.4;
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
    // loose ring sections, a container, diagnostics cart wired into the breech, a parts tray
    for (const [px, pz, spin] of [[59.6, 456.4, 0.3], [59.2, 459.4, -0.4]]) kit.add("metal", new THREE.TorusGeometry(0.86, 0.1, 6, 28), { pos: [px, y0 + 0.1, pz], rot: [Math.PI / 2, 0, spin], color: PALETTE.steel, uv: "scale", uvScale: [8, 1] });
    container(kit, 77.6, y0, 455.8, 0.15, 1.2, 0.8, 0.9, 3);
    const dc = yawFrame(kit, 76.6, y0, 461.2, Math.PI);
    dc.box("satinBlack", 0, 0.5, 0, 0.8, 1.0, 0.6);
    dc.box("screen6", 0, 0.9, 0.305, 0.6, 0.35, 0.01, { uv: "keep", tilt: -0.3 });
    dc.box("leds", 0, 0.55, 0.305, 0.5, 0.05, 0.01, { uv: "keep" });
    for (const [u, n] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) dc.cylU("rubber", u, 0.07, n, 0.07, 0.06, { color: PALETTE.rubber, segments: 10 });
    dc.collider(-0.45, 0.45, 0, 1.1, -0.35, 0.35, "diagCart");
    pipeRun(kit, "rubber", [[76.6, y0 + 0.9, 460.9], [76.6, y0 + 0.9, 459.9], [75.4, y0 + 0.4, 459.5], [74.2, y0 + 0.4, 459.3], [73.6, by + 1.05, 458.0]], 0.03, { color: PALETTE.rubber, segments: 6 });
    partsTray(kit, 60.6, y0, 453.4, 0.3, 2);
    stencil(kit, 68.5, y0 + 0.009, 461.2, 0.6, 7, "up");
    stencil(kit, 64.0, y0 + 0.009, 455.8, 0.6, 15, "up");
    // caged work lights over the barrel hang short so the crane passes under them
    for (const x of [62.0, 65.0, 72.0]) cageLight(kit, ctx, x, yTop, bz, 0.6, { intensity: 120, distance: 24 });
    cageLight(kit, ctx, 75.6, yTop, 461.8, 0.6, { intensity: 70, distance: 18 });
    boomDrop(kit, 73.6, y0, 462.6, Math.PI, 1.2, y0 + 1.75, { head: "plug", yaw: 0.4 });
  }

  // ---------------------------------------------------------------- port-forward: ion-engine nacelle on its dolly, access platform, diagnostics, screens
  {
    const ez = 469.2;
    ionEngine(kit, 64.6, y0, ez);
    rollingPlatform(kit, 65.9, 67.1, 468.3, 470.0, y0, 1.1);
    // diagnostics cart wired into the core face
    const dc = yawFrame(kit, 66.5, y0, 466.5, Math.PI * 0.75);
    dc.box("satinBlack", 0, 0.5, 0, 0.8, 1.0, 0.6);
    dc.box("screen4", 0, 0.9, 0.305, 0.6, 0.35, 0.01, { uv: "keep", tilt: -0.3 });
    dc.box("leds", 0, 0.55, 0.305, 0.5, 0.05, 0.01, { uv: "keep" });
    for (const [u, n] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) dc.cylU("rubber", u, 0.07, n, 0.07, 0.06, { color: PALETTE.rubber, segments: 10 });
    dc.collider(-0.45, 0.45, 0, 1.1, -0.35, 0.35, "diagCart");
    pipeRun(kit, "rubber", [[66.3, y0 + 0.95, 466.8], [65.9, y0 + 0.5, 467.6], [65.4, y0 + 0.5, 468.6], [65.15, y0 + 1.8, ez - 0.3]], 0.03, { color: PALETTE.rubber, segments: 6 });
    pipeRun(kit, "rubber", [[66.6, y0 + 0.95, 466.9], [66.2, y0 + 0.3, 467.9], [65.6, y0 + 0.3, 468.9], [65.3, y0 + 1.5, ez + 0.4]], 0.02, { color: PALETTE.orange, segments: 6 });
    weldingScreen(kit, 60.6, y0, 465.9, Math.PI);
    weldingScreen(kit, 63.4, y0, 465.9, Math.PI + 0.12);
    partsTray(kit, 61.3, y0, 472.9, 0.15, 1);
    cableReel(kit, 66.4, y0, 472.9, Math.PI / 2, { color: PALETTE.orange });
    tripodLamp(kit, ctx, 59.3, y0, 472.6, Math.PI * 0.72, { intensity: 40, distance: 12 });
    toolCart(kit, 67.0, y0, 464.3, 0.5, 3);
    boomDrop(kit, 62.2, y0, 471.9, Math.PI, 1.0, y0 + 1.8, { head: "gun", yaw: 0.3 });
    boomDrop(kit, 67.5, y0, 472.0, -Math.PI / 2, 1.3, y0 + 1.9, { head: "plug", yaw: -0.5 });
    tubeFixture(kit, ctx, 63.0, yTop, 466.4, 3.0, "x", { drop: 0.55, intensity: 60, distance: 18, color: 0xffe2c0 });
    tubeFixture(kit, ctx, 63.0, yTop, 472.2, 3.0, "x", { drop: 0.55, intensity: 60, distance: 18, color: 0xffe2c0 });
  }

  // ---------------------------------------------------------------- starboard-forward: deflector test rig, containers, trays, reels, pallet jack
  {
    testRig(kit, 77.6, y0, 465.2);
    container(kit, 74.3, y0, 463.8, 0.1, 1.6, 1.1, 1.0, 1);
    container(kit, 74.3, y0 + 1.1, 463.8, 0.1, 1.2, 0.7, 0.8, 2);
    container(kit, 73.9, y0, 466.6, -0.25, 1.4, 1.0, 1.0, 4);
    partsTray(kit, 77.4, y0, 469.6, 0.4, 3);
    partsTray(kit, 80.4, y0, 468.6, -0.1, 5);
    cableReel(kit, 74.7, y0, 470.2, 0, { color: PALETTE.slate });
    palletJack(kit, 79.2, y0, 471.0, 0.3);
    tripodLamp(kit, ctx, 80.8, y0, 470.6, Math.PI * 1.25, { intensity: 40, distance: 12 });
    boomDrop(kit, 76.2, y0, 468.4, Math.PI / 2, 1.4, y0 + 1.8, { head: "plug", yaw: 0.2 });
    tubeFixture(kit, ctx, 77.5, yTop, 466.0, 3.0, "x", { drop: 0.55, intensity: 60, distance: 18, color: 0xffe2c0 });
    tubeFixture(kit, ctx, 77.5, yTop, 471.4, 3.0, "x", { drop: 0.55, intensity: 60, distance: 18, color: 0xffe2c0 });
    // aft-starboard stock between the breech and the racks
    container(kit, 82.6, y0, 454.6, 0.05, 1.6, 1.1, 1.0, 6);
    container(kit, 82.6, y0 + 1.1, 454.6, -0.08, 1.2, 0.7, 0.8, 7);
    container(kit, 81.0, y0, 459.4, 0.3, 1.2, 0.8, 0.9, 8);
    cableReel(kit, 83.6, y0, 459.8, Math.PI / 2, { color: PALETTE.orange });
    partsTray(kit, 80.2, y0, 452.3, -0.2, 4);
  }

  // ---------------------------------------------------------------- port wall: workbenches, tall cabinets, tool boards
  for (const [i, z] of [449.5, 454.5, 459.5, 464.5].entries()) workbench(kit, yawFrame(kit, x0 + WT + 0.45 + 0.04, y0, z, Math.PI / 2), i + 2);
  for (const z of [452.0, 462.0]) {
    kit.box("painted", x0 + WT + 0.3, y0 + 1.0, z, 0.6, 2.0, 0.9, { color: PALETTE.orange, uv: "keep" });
    kit.box("metal", x0 + WT + 0.605, y0 + 1.0, z, 0.01, 1.8, 0.8, { color: PALETTE.darkMetal });
    kit.box("metal", x0 + WT + 0.62, y0 + 1.1, z - 0.3, 0.02, 0.2, 0.03, { color: PALETTE.steel });
    stencil(kit, x0 + WT + 0.612, y0 + 1.6, z, 0.4, 6, "+x");
    kit.collider([x0, y0, z - 0.5], [x0 + WT + 0.65, y0 + 2.1, z + 0.5], "cabinet");
  }
  const W = shell.frames["-x"].frame; // u = z1 - z
  for (const z of [449.5, 454.5, 459.5, 464.5]) armLight(kit, ctx, W, z1 - z, 3.4, 1.4, { intensity: 40, distance: 15 });
  wallLightBar(W, 1.0, z1 - 466.5, 3.0);
  wallLightBar(W, z1 - 447.5, z1 - z0 - 1.0, 3.0);
  W.add("decal", new THREE.PlaneGeometry(0.6, 0.6), z1 - 467.2, 2.6, 0.005, { uv: "keep", uvRect: decalRect(13) });
  wallConsole(W, z1 - 469.0, 1.6, "screen6");
  toolBoard(W, z1 - 457.0, 1.6, 1.6, 1.1, 1);
  toolBoard(W, z1 - 472.2, 1.6, 2.0, 1.1, 2);
  wallBaseTube(W, 1.2, z1 - 466.6, 0.42);
  wallBaseTube(W, z1 - 448.0, z1 - z0 - 1.0, 0.42);
  toolCart(kit, 57.6, y0, 457.0, 1.2, 3);
  cableReel(kit, 57.2, y0, 467.6, 0, { color: PALETTE.slate, r: 0.45, w: 0.4 });

  // ---------------------------------------------------------------- starboard wall: parts racks with labelled bins, rolling ladder, tool board
  for (const [i, z] of [451.5, 454.5, 457.5, 460.5, 463.5].entries()) partsRack(yawFrame(kit, x1 - WT - 0.52, y0, z, -Math.PI / 2), i);
  const E = shell.frames["+x"].frame; // u = z - z0
  for (const z of [453.0, 459.0, 465.0]) armLight(kit, ctx, E, z - z0, 4.4, 2.2, { intensity: 60, distance: 17 });
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
  wallLightBar(E, 1.0, 449.5 - z0, 3.0);
  wallLightBar(E, 466.0 - z0, z1 - z0 - 1.0, 3.0);
  wallConsole(E, 467.0 - z0, 1.6, "screen4");
  toolBoard(E, 448.3 - z0, 1.6, 1.8, 1.1, 3);
  toolBoard(E, 469.4 - z0, 1.6, 1.5, 1.1, 4);
  E.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 446.2 - z0, 2.6, 0.005, { uv: "keep", uvRect: decalRect(11) });
  wallBaseTube(E, 1.0, 450.0 - z0, 0.42);
  wallBaseTube(E, 465.0 - z0, 470.6 - z0, 0.42);

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
        f.box("fabric", uc, 1.35, k % 2 ? 0.03 : -0.03, 1.48, 2.5, 0.02, { color: PALETTE.fabricOrange, texel: 1 });
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
    cableDrop(kit, 58.6, yTop, 446.6, y0 + 1.8, { head: "gun", yaw: 0.6 });

    // droid recharge alcove (four bays)
    const ax0 = 64.0;
    const ax1 = 70.0;
    const aD = 1.0;
    const aH = 2.2;
    kit.boxMM("satinBlack", [ax0, y0, z0 + WT], [ax1, y0 + aH + 0.3, z0 + WT + 0.1]);
    kit.boxMM("satinBlack", [ax0, y0 + aH, z0 + WT], [ax1, y0 + aH + 0.3, z0 + WT + aD]);
    kit.boxMM("satinBlack", [ax0 + 0.3, y0 + aH + 0.13, z0 + WT + aD], [ax1 - 0.3, y0 + aH + 0.21, z0 + WT + aD + 0.06]);
    kit.cyl("emitAmber", (ax0 + ax1) / 2, y0 + aH + 0.11, z0 + WT + aD + 0.045, 0.016, ax1 - ax0 - 0.8, "x", { segments: 8, uv: "keep" });
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
        kit.box("satinBlack", bx, y0 + aH - 0.03, bz, bw - 0.4, 0.06, 0.2);
        kit.cyl("emitWhiteSoft", bx, y0 + aH - 0.055, bz, 0.02, bw - 0.5, "x", { segments: 8, uv: "keep" });
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
    kit.boxMM("deck", [L.x0, L.y - 0.1, L.z0], [L.x1, L.y, L.z1], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    kit.boxMM("hazard", [L.x0, L.y, L.z0], [L.x1, L.y + 0.004, L.z0 + 0.15], { texel: 3 });
    kit.boxMM("hazard", [L.x0, L.y, L.z1 - 0.15], [L.x1, L.y + 0.004, L.z1], { texel: 3 });
    kit.boxMM("hazard", [L.x0, L.y, L.z0], [L.x0 + 0.15, L.y + 0.004, L.z1], { texel: 3 });
    kit.boxMM("hazard", [L.x1 - 0.15, L.y, L.z0], [L.x1, L.y + 0.004, L.z1], { texel: 3 });
    kit.floor(L.x0, L.z0, L.x1, L.z1, L.y);
    kit.collider([L.x0, y0, L.z0], [L.x1, L.y, L.z1], "liftBase");
    kit.stairs("paintedMetal", L.x0 + 1.3, L.z1 + 0.7, L.x1 - 1.3, L.z1, y0, L.y, "z", { color: PALETTE.gunmetal, steps: 2 });
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
    kit.box("satinBlack", mx, fy - 0.04, mz, 0.3, 0.08, 2.6);
    kit.cyl("emitWhiteSoft", mx, fy - 0.085, mz, 0.025, 2.4, "z", { segments: 8, uv: "keep" });
    const cp = yawFrame(kit, L.x1 + 0.7, y0, L.z1 + 0.5, 0);
    cp.box("satinBlack", 0, 0.6, 0, 0.3, 1.2, 0.3);
    cp.box("satinBlack", 0, 1.25, 0.05, 0.36, 0.14, 0.4, { tilt: -0.4 });
    cp.box("leds", 0, 1.3, 0.2, 0.25, 0.04, 0.01, { uv: "keep", tilt: -0.4 });
    cp.box("emitOrange", 0.08, 1.2, 0.2, 0.06, 0.06, 0.01, { uv: "keep", tilt: -0.4 });
    cp.collider(-0.2, 0.2, 0, 1.4, -0.2, 0.25, "liftPost");
    stencil(kit, mx, y0 + 0.009, L.z1 + 1.3, 0.8, 10, "up");
    paintRect(kit, L.x0 - 0.5, L.z0 - 0.5, L.x1 + 0.5, L.z1 + 1.4, y0, 0.1);
    ctx.lights.warm.push(pointLight(0xffc080, 50, 16, [mx, fy - 0.9, mz]));
  }
  const S = shell.frames["-z"].frame; // u = x - x0
  wallLightBar(S, 1.0, 62.0 - x0, 3.2);
  wallLightBar(S, 72.5 - x0, 77.0 - x0, 3.2);
  wallLightBar(S, 83.5 - x0, x1 - x0 - 1.0, 3.2);
  wallConsole(S, 74.5 - x0, 1.6, "screen6");
  wallConsole(S, 85.0 - x0, 1.6, "screen4");
  toolBoard(S, 71.8 - x0, 1.6, 1.6, 1.1, 5);
  toolBoard(S, 76.6 - x0, 1.6, 1.4, 1.1, 6);
  S.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 72.0 - x0, 2.75, 0.005, { uv: "keep", uvRect: decalRect(5) });
  S.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 76.5 - x0, 2.75, 0.005, { uv: "keep", uvRect: decalRect(10) });
  wallBaseTube(S, 1.0, 9.0, 0.42);
  wallBaseTube(S, 71.0 - x0, 77.6 - x0, 0.42);
  wallBaseTube(S, 83.0 - x0, x1 - x0 - 1.0, 0.42);
  // coolant / air lines across the aft wall above the fixtures
  for (const [k, v] of [3.9, 4.25, 4.6].entries()) {
    S.cylU("metal", (x1 - x0) / 2, v, 0.25, 0.07 + k * 0.02, x1 - x0 - 1.4, { color: k === 1 ? PALETTE.orange : PALETTE.steel, segments: 10 });
    for (let u = 2.0; u < x1 - x0 - 1; u += 5.0) S.box("metal", u, v, 0.14, 0.24, 0.2, 0.28, { color: PALETTE.darkMetal, texel: 2 });
  }
  valveWheel(kit, 66.5, y0 + 4.25, z0 + 0.25 + 0.3, "z", 0.18, { stem: 0.02 });
  S.cylN("metal", 66.5 - x0, 4.25, 0.4, 0.025, 0.3, { color: PALETTE.gunmetal, segments: 8 });

  // ---------------------------------------------------------------- forward wall (door): equipment cage, board, lockers, tool board
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
    // contents: two shelving units with crates, containers on the floor
    for (const sz of [472.2, 475.2]) {
      kit.box("satinBlack", c.x1 - 0.55, y0 + 1.1, sz, 1.0, 2.2, 1.6);
      for (const v of [0.5, 1.2, 1.9]) kit.box("metal", c.x1 - 0.55, y0 + v, sz, 1.04, 0.04, 1.64, { color: PALETTE.steel, texel: 2 });
      for (const [v, dz, col] of [[0.55, -0.4, PALETTE.slate], [0.55, 0.4, PALETTE.orange], [1.25, -0.3, PALETTE.tealPaint], [1.25, 0.45, PALETTE.gunmetal]]) kit.box("painted", c.x1 - 0.55, y0 + v + 0.22, sz + dz, 0.8, 0.44, 0.6, { color: col, uv: "keep" });
    }
    container(kit, c.x0 + 1.1, y0, 475.5, 0.05, 1.3, 0.9, 1.0, 9);
    container(kit, c.x0 + 1.1, y0 + 0.9, 475.5, -0.1, 1.0, 0.6, 0.8, 10);
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
  N.box("satinBlack", x1 - 64.5, 3.2, 0.04, 2.5, 0.08, 0.08);
  N.cylU("emitAmber", x1 - 64.5, 3.14, 0.07, 0.014, 2.3, { segments: 8, uv: "keep" });
  N.add("decal", new THREE.PlaneGeometry(0.6, 0.6), x1 - 72.6, 1.8, 0.005, { uv: "keep", uvRect: decalRect(1) });
  N.add("decal", new THREE.PlaneGeometry(0.6, 0.6), x1 - 67.4, 1.8, 0.005, { uv: "keep", uvRect: decalRect(7) });
  wallConsole(N, x1 - 61.5, 2.0, "screen6");
  toolBoard(N, x1 - 79.0, 1.6, 1.6, 1.1, 7);
  toolBoard(N, x1 - 59.6, 1.6, 1.8, 1.1, 8);
  wallBaseTube(N, x1 - 81.6, x1 - 77.0, 0.42);
  wallBaseTube(N, x1 - 68.2, x1 - x0 - 1.0, 0.42);
  for (let k = 0; k < 3; k++) {
    const lx = 74.0 + k * 0.95;
    kit.box("painted", lx, y0 + 1.0, z1 - WT - 0.3, 0.9, 2.0, 0.6, { color: k % 2 ? PALETTE.slate : PALETTE.gunmetal, uv: "keep" });
    kit.box("metal", lx, y0 + 1.0, z1 - WT - 0.605, 0.03, 1.7, 0.02, { color: PALETTE.darkMetal });
    kit.box("metal", lx + 0.28, y0 + 1.1, z1 - WT - 0.615, 0.03, 0.14, 0.03, { color: PALETTE.steel });
    for (let s = 0; s < 4; s++) kit.box("metal", lx, y0 + 1.6 + s * 0.06, z1 - WT - 0.61, 0.55, 0.012, 0.01, { color: PALETTE.darkMetal });
    stencil(kit, lx, y0 + 0.6, z1 - WT - 0.612, 0.24, [0, 14, 6][k], "-z");
  }
  kit.collider([73.5, y0, z1 - WT - 0.62], [76.4, y0 + 2.0, z1], "lockers");
  cableReel(kit, 64.4, y0, 476.1, 0, { color: PALETTE.orange, r: 0.5, w: 0.45 });
  toolCart(kit, 61.2, y0, 475.6, 2.6, 5);
  toolCart(kit, 76.0, y0, 452.6, 2.2, 6);

  // ---------------------------------------------------------------- overhead: cable trays, ventilation duct (flat on the ceiling, aft of the crane travel)
  cableTray(kit, [x0 + 1.0, z1 - 0.55], [x1 - 1.0, z1 - 0.55], yTop - 0.9, { w: 0.6, ceilY: yTop, cables: 5 });
  cableTray(kit, [x0 + 1.0, z0 + 0.55], [x1 - 1.0, z0 + 0.55], yTop - 0.9, { w: 0.5, ceilY: yTop, cables: 4 });
  kit.box("paintedMetal", (x0 + x1) / 2, yTop - 0.3, 447.6, x1 - x0 - 2.0, 0.6, 1.0, { color: PALETTE.darkMetal, texel: 1 });
  for (let x = x0 + 4.0; x < x1 - 2; x += 5.6) kit.box("metal", x, yTop - 0.3, 447.6, 0.12, 0.7, 1.1, { color: PALETTE.gunmetal, texel: 2 });
  for (const x of [59.0, 66.0, 73.0, 85.0]) {
    kit.box("paintedMetal", x, yTop - 0.8, 447.6, 0.5, 0.5, 0.5, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("satinBlack", x, yTop - 1.1, 447.6, 0.9, 0.1, 0.9);
    const g = new THREE.PlaneGeometry(0.8, 0.8);
    g.rotateX(Math.PI / 2);
    kit.add("grate", g, { pos: [x, yTop - 1.16, 447.6], uv: "scale", uvScale: [0.8 / 0.62, 0.8 / 0.45], color: 0xffffff });
  }

  // ---------------------------------------------------------------- lights: cool fill from the ceiling corners, warm-white over the door
  // (a 34 x 33 m bay with a 14-light pool: four long-reach fill lights plus the caged work lights above)
  for (const [lx, lz] of [[62.0, 451.0], [80.0, 451.0], [62.0, 469.5], [80.0, 469.5]]) cageLight(kit, ctx, lx, yTop, lz, 0.6, { intensity: 130, distance: 30, color: 0xdfe8ff, mat: "emitCoolSoft" });
  tubeFixture(kit, ctx, 70.0, yTop, 474.2, 3.2, "x", { drop: 1.2, intensity: 70, distance: 18, color: 0xffe2c0 });
  ctx.lights.warm.push(pointLight(0xffc080, 30, 12, [72.5, y0 + 2.4, 470.0]));
  return shell;
}
