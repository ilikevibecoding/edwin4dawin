// Imperial props shared by the Deck 4 aft-complex rooms (any deck owner may import them):
// consoles, operator seats, lockers, benches, wall placards, status boards, floor digits and the lit
// sign plates used for interactables. Everything is kit-bashed (one draw call per material key).
//
//   import { Placer, impConsole, impSeat, impLocker, impBench, deckPlacard, statusBoard, floorDigit,
//            makeSignPlate } from "../../systems/corridor/props.js";
//
// Yaw convention: yaw 0 = the prop's local +z points at world +z (toward the operator / the room);
// positive yaw turns local +z toward +x (three.js rotation about +Y).
import * as THREE from "three";
import { rng } from "../../kit.js";
import { MAT, col } from "./imperial.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

/** Places boxes/cylinders in a yawed local frame (origin at the prop's floor centre). */
export class Placer {
  constructor(kit, origin, yaw = 0) {
    this.kit = kit;
    this.o = origin;
    this.yaw = yaw;
    this.c = Math.cos(yaw);
    this.s = Math.sin(yaw);
    this.q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  }
  p(lx, ly, lz) {
    return [this.o[0] + this.c * lx + this.s * lz, this.o[1] + ly, this.o[2] - this.s * lx + this.c * lz];
  }
  quat(local = null) {
    return local ? this.q.clone().multiply(local) : this.q;
  }
  box(mat, lx, ly, lz, sx, sy, sz, opts = {}) {
    const { tilt = 0, ...rest } = opts;
    const q = tilt ? this.quat(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt)) : this.q;
    return this.kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: this.p(lx, ly, lz), quat: q, ...rest });
  }
  // cylinder along a local axis
  cyl(mat, lx, ly, lz, r, len, axis = "y", opts = {}) {
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12, 1, false);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else if (axis === "z") g.rotateX(Math.PI / 2);
    const { segments, ...rest } = opts;
    return this.kit.add(mat, g, { pos: this.p(lx, ly, lz), quat: this.q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  // point on a tilted sub-frame: centre (lx,ly,lz), tilt about local X, offset (u across, v up-the-slope, n normal)
  onTilted(lx, ly, lz, tilt, u, v, n) {
    const off = new THREE.Vector3(u, n, -v).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
    return [lx + off.x, ly + off.y, lz + off.z];
  }
  /** world AABB of a local box (for colliders) */
  aabb(lx0, lx1, ly0, ly1, lz0, lz1) {
    const pts = [this.p(lx0, 0, lz0), this.p(lx1, 0, lz0), this.p(lx0, 0, lz1), this.p(lx1, 0, lz1)];
    const min = [Math.min(...pts.map((p) => p[0])), this.o[1] + ly0, Math.min(...pts.map((p) => p[2]))];
    const max = [Math.max(...pts.map((p) => p[0])), this.o[1] + ly1, Math.max(...pts.map((p) => p[2]))];
    return [min, max];
  }
  collider(lx0, lx1, ly0, ly1, lz0, lz1, tag) {
    const [min, max] = this.aabb(lx0, lx1, ly0, ly1, lz0, lz1);
    this.kit.collider(min, max, tag);
  }
}

const IND = [MAT.red, MAT.blue, MAT.amber, MAT.blue, MAT.red];

/**
 * Traffic/operations console: matte-black desk, glossy top, sloped instrument panel with a wide display
 * and dense red/blue/amber indicator fields, vertical display bank facing the operator. Operator side = +z.
 * @param {object} o { pos:[x,floorY,z], yaw, w=2.0, d=0.9, screens=["screenImp0","screenImp1","screenImp2"], seed, collide=true, tag }
 */
export function impConsole(kit, o) {
  const { pos, yaw = 0, w = 2.0, d = 0.9, screens = ["screenImp0", "screenImp1", "screenImp2"], seed = 1, collide = true, tag = "console" } = o;
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = col("impBlack");
  const dark = col("impDark");
  // plinth + body + glossy desk top on the operator side
  P.box(MAT.dark, 0, 0.06, 0, w - 0.2, 0.12, d - 0.2, { color: black, texel: 1 });
  P.box(MAT.dark, 0, 0.12 + 0.35, 0, w, 0.7, d, { color: black, texel: 1 });
  P.box("blackGloss", 0, 0.84, d / 2 - 0.26, w, 0.04, 0.52, { color: black });
  P.box(MAT.blue, 0, 0.125, d / 2 - 0.002, w - 0.5, 0.012, 0.01);
  // side cheeks proud of the body
  for (const sx of [-1, 1]) P.box(MAT.dark, sx * (w / 2 - 0.01), 0.55, 0, 0.04, 0.86, d + 0.04, { color: dark, texel: 1 });
  // sloped instrument panel (rises toward the window side; +tilt about X lifts the -z edge)
  const tilt = 0.42;
  const pc = [0, 0.95, -0.05];
  const pl = 0.6;
  P.box(MAT.dark, pc[0], pc[1], pc[2], w - 0.08, 0.05, pl, { color: black, tilt, texel: 1 });
  const onPanel = (u, v, n) => P.onTilted(pc[0], pc[1], pc[2], tilt, u, v, 0.025 + n);
  // wide display in the upper half of the slope
  {
    const sw = Math.min(0.9, w * 0.45);
    const [x, y, z] = onPanel(0, 0.12, 0.006);
    P.box("blackGloss", x, y, z, sw + 0.05, 0.012, 0.25, { color: black, tilt });
    const [x2, y2, z2] = onPanel(0, 0.12, 0.014);
    P.box(screens[0 % screens.length], x2, y2, z2, sw, 0.006, 0.2, { tilt, uv: "keep" });
  }
  // indicator fields: two blocks of dense dots either side of the display, sliders below
  for (const side of [-1, 1]) {
    const bx = side * (w / 2 - 0.3);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        const u = bx + (c - 2) * 0.07;
        const v = 0.22 - r * 0.075;
        const [x, y, z] = onPanel(u, v, 0.004);
        const on = rand() < 0.7;
        P.box(on ? IND[Math.floor(rand() * IND.length)] : MAT.dark, x, y, z, 0.04, 0.008, 0.035, { tilt, color: black });
      }
    }
  }
  for (let c = 0; c < 12; c++) {
    const u = (c - 5.5) * (Math.min(1.5, w - 0.7) / 12);
    const [x, y, z] = onPanel(u, -0.14, 0.004);
    P.box(rand() < 0.5 ? MAT.blue : MAT.dark, x, y, z, 0.05, 0.008, 0.16, { tilt, color: dark });
    const [x2, y2, z2] = onPanel(u, -0.14 + (rand() - 0.5) * 0.1, 0.02);
    P.box(MAT.steel, x2, y2, z2, 0.04, 0.02, 0.03, { tilt, color: col("impGrey") });
  }
  // vertical display bank at the window side, screens facing the operator
  const bz = -d / 2 + 0.12;
  P.box(MAT.dark, 0, 1.12, bz, w - 0.12, 0.6, 0.1, { color: black, texel: 1 });
  P.box(MAT.dark, 0, 1.43, bz - 0.02, w - 0.04, 0.05, 0.16, { color: dark, texel: 1 });
  const sw2 = (w - 0.4) / 2;
  for (let i = 0; i < 2; i++) {
    const x = (i - 0.5) * (sw2 + 0.1);
    P.box("blackGloss", x, 1.12, bz + 0.055, sw2 + 0.04, 0.44, 0.01, { color: black });
    P.box(screens[(i + 1) % screens.length], x, 1.12, bz + 0.064, sw2, 0.38, 0.006, { uv: "keep" });
  }
  for (let c = 0; c < 10; c++) {
    const x = (c - 4.5) * ((w - 0.5) / 10);
    P.box(rand() < 0.6 ? IND[Math.floor(rand() * IND.length)] : MAT.dark, x, 0.86, bz + 0.056, 0.05, 0.02, 0.008, { color: black });
  }
  if (collide) P.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, 1.5, -d / 2 - 0.02, d / 2 + 0.02, tag);
  return P;
}

/** Operator chair facing -z (toward the console). */
export function impSeat(kit, o) {
  const { pos, yaw = 0, collide = true, tag = "seat" } = o;
  const P = new Placer(kit, pos, yaw);
  const black = col("impBlack");
  const dark = col("impDark");
  P.cyl(MAT.dark, 0, 0.03, 0, 0.27, 0.06, "y", { color: black, segments: 16 });
  P.cyl(MAT.dark, 0, 0.26, 0, 0.055, 0.42, "y", { color: dark, segments: 10 });
  P.box(MAT.dark, 0, 0.45, 0, 0.5, 0.05, 0.5, { color: black });
  P.box("blackGloss", 0, 0.51, 0, 0.5, 0.08, 0.5, { color: dark });
  P.box(MAT.dark, 0, 0.62, 0.26, 0.46, 0.2, 0.06, { color: black });
  P.box("blackGloss", 0, 0.92, 0.28, 0.46, 0.56, 0.08, { color: dark, tilt: 0.14 });
  P.box(MAT.dark, 0, 0.92, 0.32, 0.5, 0.6, 0.02, { color: black, tilt: 0.14 });
  for (const s of [-1, 1]) {
    P.box(MAT.dark, s * 0.28, 0.66, 0.08, 0.05, 0.22, 0.3, { color: black });
    P.box("blackGloss", s * 0.28, 0.78, 0.05, 0.07, 0.03, 0.34, { color: dark });
  }
  if (collide) P.collider(-0.3, 0.3, 0, 1.2, -0.3, 0.35, tag);
  return P;
}

/** Equipment locker; door faces +z. */
export function impLocker(kit, o) {
  const { pos, yaw = 0, w = 0.6, h = 2.0, d = 0.5, status = MAT.blue, seed = 1, collide = true, tag = "locker" } = o;
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box(MAT.dark, 0, h / 2, 0, w, h, d, { color: col("impDark"), texel: 1 });
  P.box(MAT.dark, 0, 0.04, 0, w - 0.04, 0.08, d - 0.04, { color: col("impBlack") });
  P.box(MAT.panel, 0, h / 2 + 0.03, d / 2 + 0.01, w - 0.06, h - 0.14, 0.02, { color: col(rand() < 0.5 ? "impGrey" : "impWhite"), uv: "keep" });
  // vent slats low, handle + status high
  for (let k = 0; k < 4; k++) P.box(MAT.dark, 0, 0.3 + k * 0.05, d / 2 + 0.024, w - 0.2, 0.014, 0.01, { color: col("impBlack") });
  P.box(MAT.steel, w / 2 - 0.12, h * 0.55, d / 2 + 0.035, 0.03, 0.18, 0.03, { color: col("impGrey") });
  P.box(status, -w / 2 + 0.12, h - 0.25, d / 2 + 0.024, 0.06, 0.02, 0.01);
  P.box(MAT.dark, 0, h - 0.25, d / 2 + 0.024, w - 0.36, 0.06, 0.01, { color: col("impBlack") });
  if (collide) P.collider(-w / 2, w / 2, 0, h, -d / 2, d / 2 + 0.04, tag);
  return P;
}

/** Wall bench (no back); sits along local x, wall at -z. */
export function impBench(kit, o) {
  const { pos, yaw = 0, len = 1.8, collide = true, tag = "bench" } = o;
  const P = new Placer(kit, pos, yaw);
  P.box("blackGloss", 0, 0.45, 0, len, 0.06, 0.45, { color: col("impDark") });
  P.box(MAT.dark, 0, 0.4, 0, len - 0.1, 0.05, 0.4, { color: col("impBlack") });
  for (const s of [-1, 1]) {
    P.box(MAT.dark, s * (len / 2 - 0.12), 0.2, 0, 0.08, 0.4, 0.4, { color: col("impDark"), texel: 1 });
    P.box(MAT.dark, s * (len / 2 - 0.12), 0.02, 0, 0.14, 0.04, 0.44, { color: col("impBlack") });
  }
  P.box(MAT.strip, 0, 0.36, 0.2, len - 0.4, 0.01, 0.01);
  if (collide) P.collider(-len / 2, len / 2, 0, 0.6, -0.25, 0.25, tag);
  return P;
}

/**
 * Wall-mounted fire point: red cabinet with label bars, handle and a hazard base plate. `pos` is the
 * cabinet centre at floor level on the wall's inner face; local +z (yaw) points into the room.
 */
export function firePoint(kit, o) {
  const { pos, yaw = 0, collide = true, tag = "firepoint" } = o;
  const P = new Placer(kit, pos, yaw);
  P.box(MAT.dark, 0, 1.1, 0.11, 0.5, 0.7, 0.22, { color: col("impDark"), texel: 1 });
  P.box(MAT.panel, 0, 1.1, 0.225, 0.42, 0.62, 0.01, { color: col("impRed"), uv: "keep" });
  P.box(MAT.panel, 0, 1.3, 0.232, 0.3, 0.03, 0.004, { color: col("impWhite"), uv: "keep" });
  P.box(MAT.panel, 0, 0.98, 0.232, 0.2, 0.03, 0.004, { color: col("impWhite"), uv: "keep" });
  P.box(MAT.steel, 0.15, 1.1, 0.24, 0.03, 0.12, 0.02, { color: col("impGrey") });
  P.box("hazard", 0, 0.03, 0.14, 0.6, 0.06, 0.28, { texel: 3 });
  if (collide) P.collider(-0.3, 0.3, 0, 1.6, 0, 0.3, tag);
  return P;
}

// Axis-aligned wall-mounted plate helper: `pos` is the plate centre on the wall's inner face, `normal`
// points into the room. Returns a Placer whose local +z is the normal.
function wallPlacer(kit, pos, normal) {
  const yaw = Math.atan2(normal[0], normal[2]);
  return new Placer(kit, pos, yaw);
}

/** Small wayfinding placard: black plate, light text bars, an icon block and an accent dot. */
export function deckPlacard(kit, o) {
  const { pos, normal = [0, 0, 1], w = 0.9, h = 0.5, lines = 3, accent = "impBlue", seed = 3 } = o;
  const P = wallPlacer(kit, pos, normal);
  const rand = rng(seed + Math.round(pos[0] * 7 + pos[2] * 13));
  P.box(MAT.dark, 0, 0, 0.012, w, h, 0.024, { color: col("impBlack"), texel: 2 });
  P.box(MAT.panel, -w / 2 + 0.2, 0, 0.026, 0.26, h - 0.14, 0.006, { color: col("impWhite"), uv: "keep" });
  const x0 = -w / 2 + 0.42;
  for (let i = 0; i < lines; i++) {
    const len = (w - 0.55) * (0.5 + rand() * 0.5);
    P.box(MAT.panel, x0 + len / 2, h / 2 - 0.1 - i * ((h - 0.16) / Math.max(1, lines)), 0.026, len, 0.035, 0.006, { color: col("impGrey"), uv: "keep" });
  }
  const acc = accent === "impRed" ? MAT.red : accent === "impAmber" ? MAT.amber : MAT.blue;
  P.box(acc, w / 2 - 0.08, -h / 2 + 0.08, 0.026, 0.06, 0.06, 0.006);
  return P;
}

/**
 * Large wall status board: frame, 2×2 display panels, legend column with coloured dots, title strip.
 * pos = board centre on the wall face, normal into the room.
 */
export function statusBoard(kit, o) {
  const { pos, normal = [0, 0, 1], w = 3.0, h = 1.6, screens = ["screenImp0", "screenImp1", "screenImp2", "screenImp0"], legend = 6, seed = 5 } = o;
  const P = wallPlacer(kit, pos, normal);
  const rand = rng(seed);
  P.box(MAT.dark, 0, 0, 0.04, w, h, 0.08, { color: col("impBlack"), texel: 1 });
  P.box(MAT.dark, 0, 0, 0.085, w - 0.08, h - 0.08, 0.01, { color: col("impDark"), texel: 1 });
  P.box(MAT.strip, 0, h / 2 - 0.07, 0.092, w - 0.3, 0.02, 0.006);
  const legendW = 0.7;
  const gridW = w - legendW - 0.3;
  const sw = (gridW - 0.1) / 2;
  const sh = (h - 0.4) / 2;
  for (let i = 0; i < 4; i++) {
    const cx = -w / 2 + 0.12 + sw / 2 + (i % 2) * (sw + 0.1);
    const cy = -0.05 + (i < 2 ? sh / 2 + 0.05 : -sh / 2 - 0.05);
    P.box("blackGloss", cx, cy, 0.092, sw + 0.03, sh + 0.03, 0.008, { color: col("impBlack") });
    P.box(screens[i % screens.length], cx, cy, 0.1, sw, sh, 0.006, { uv: "keep" });
  }
  const lx = w / 2 - legendW / 2 - 0.1;
  for (let i = 0; i < legend; i++) {
    const y = h / 2 - 0.25 - i * ((h - 0.45) / legend);
    P.box(IND[Math.floor(rand() * IND.length)], lx - legendW / 2 + 0.06, y, 0.094, 0.05, 0.05, 0.006);
    P.box(MAT.panel, lx + 0.06, y, 0.094, legendW - 0.3, 0.03, 0.006, { color: col("impGrey"), uv: "keep" });
    if (rand() < 0.5) P.box(MAT.panel, lx + 0.06 + (legendW - 0.3) / 4, y - 0.05, 0.094, (legendW - 0.3) / 2, 0.02, 0.006, { color: col("impMid"), uv: "keep" });
  }
  return P;
}

// 7-segment digit map: a b c d e f g  (top, upper-right, lower-right, bottom, lower-left, upper-left, middle)
const SEG7 = {
  0: "abcdef",
  1: "bc",
  2: "abged",
  3: "abgcd",
  4: "fgbc",
  5: "afgcd",
  6: "afgedc",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
};
/** Big floor digit (deck number), 1 cm proud, built from bars. size = digit height; centre at pos. */
export function floorDigit(kit, o) {
  const { digit = "4", pos, size = 2.4, mat = MAT.panel, tint = "impWhite", bar = 0.28, y = pos[1], up = [0, 0, -1] } = o;
  const segs = SEG7[String(digit)] || "";
  const hgt = size;
  const wid = size * 0.55;
  const yaw = Math.atan2(up[0], up[2]) + Math.PI; // local +z (glyph "up") points along `up`
  const P = new Placer(kit, [pos[0], y, pos[2]], yaw);
  const H = (cx, cz, len) => P.box(mat, cx, 0.005, cz, len, 0.01, bar, { color: col(tint), uv: "keep" });
  const V = (cx, cz, len) => P.box(mat, cx, 0.005, cz, bar, 0.01, len, { color: col(tint), uv: "keep" });
  const hw = wid / 2;
  const hh = hgt / 2;
  const half = hh / 2;
  // local z: glyph up is -z (we rotated by PI so that -z maps to `up`)
  if (segs.includes("a")) H(0, -hh + bar / 2, wid);
  if (segs.includes("d")) H(0, hh - bar / 2, wid);
  if (segs.includes("g")) H(0, 0, wid);
  if (segs.includes("b")) V(hw - bar / 2, -half, hh);
  if (segs.includes("c")) V(hw - bar / 2, half, hh);
  if (segs.includes("f")) V(-hw + bar / 2, -half, hh);
  if (segs.includes("e")) V(-hw + bar / 2, half, hh);
  return P;
}

/**
 * Lit sign plate for interactables: returns { group, material }. Give the group to ctx.group and the
 * material to the interactable (the hover tint edits material.emissive). `arrow`: "up" | "down" | null.
 * normal: facing direction (axis-aligned or any), w/h plate size.
 */
export function makeSignPlate(materials, o) {
  const { w = 0.6, h = 0.32, color = 0x0d0f14, emissive = 0x3a7bff, emissiveIntensity = 0.9, arrow = null, pos = [0, 0, 0], normal = [0, 0, 1] } = o;
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(emissive), emissiveIntensity, roughness: 0.35, metalness: 0.1 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), material);
  plate.position.z = 0.015;
  group.add(plate);
  // frame behind the plate
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.6, metalness: 0.2 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.02), frameMat);
  frame.position.z = 0.004;
  group.add(frame);
  if (arrow && materials && materials.emitWhite) {
    const dir = arrow === "up" ? 1 : -1;
    const stem = new THREE.BoxGeometry(0.05, h * 0.5, 0.012).toNonIndexed();
    const headL = new THREE.BoxGeometry(0.05, h * 0.3, 0.012).toNonIndexed();
    const headR = new THREE.BoxGeometry(0.05, h * 0.3, 0.012).toNonIndexed();
    headL.rotateZ(dir * 0.75);
    headL.translate(-0.06, dir * h * 0.2, 0);
    headR.rotateZ(-dir * 0.75);
    headR.translate(0.06, dir * h * 0.2, 0);
    const merged = mergeSimple([stem, headL, headR]);
    const am = new THREE.Mesh(merged, materials.emitWhite);
    am.position.set(-w / 2 + 0.14, 0, 0.036);
    group.add(am);
    // three "text" bars to the right of the arrow
    const bars = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.BoxGeometry(w - 0.36 - i * 0.08, 0.022, 0.006).toNonIndexed();
      b.translate(0.1 - i * 0.04, 0.07 - i * 0.07, 0);
      bars.push(b);
    }
    const bm = new THREE.Mesh(mergeSimple(bars), new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.6, metalness: 0 }));
    bm.position.set(0.06, 0, 0.033);
    group.add(bm);
  }
  group.position.set(pos[0], pos[1], pos[2]);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(normal[0], normal[1], normal[2]).normalize());
  return { group, material };
}

// minimal non-indexed merge (positions + normals + uvs) so props.js has no dependency on the addons
function mergeSimple(geos) {
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const u = g.attributes.uv;
    pos.set(p.array, off * 3);
    if (n) nor.set(n.array, off * 3);
    if (u) uv.set(u.array, off * 2);
    off += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}
