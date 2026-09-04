// Kit-bash pieces shared by the forward crew-deck rooms (escape pods, crew quarters, refresher, mess,
// medbay). Everything here builds on a wall Frame (u along the wall, v up, n into the room) or in world
// space, and merges into the room's Kit; only the frosted-glass sheet is a separate mesh because the
// shared glass material is far too clear for partitions.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { decalRect, GRATE_TILE } from "../../textures.js";

// Vertex tint that turns the orange/black hazard map yellow/black (vertex colours are floats, so a
// green component above 1 is a legitimate multiplier).
export const HAZARD_YELLOW = new THREE.Color(1.05, 2.3, 0.35);

// Full-height locker on a wall frame. u is the centre along the wall, the body protrudes n = 0..d.
export function locker(f, u, opts = {}) {
  const { w = 0.6, h = 2.0, d = 0.5, color = PALETTE.cream, band = PALETTE.impGreyDark, decal = null, vents = true, led = true, tag = "locker", collide = true } = opts;
  const base = 0.06;
  f.box("metal", u, base / 2, d / 2, w, base, d, { color: PALETTE.darkMetal, texel: 2 });
  f.box("painted", u, base + (h - base) / 2, d / 2 - 0.01, w, h - base, d - 0.02, { color, uv: "keep" });
  // door plate proud of the body, dark reveal around it
  f.box("metal", u, base + (h - base) / 2, d - 0.012, w - 0.02, h - base - 0.02, 0.01, { color: PALETTE.darkMetal, texel: 2 });
  f.box("painted1", u, base + (h - base) / 2, d - 0.004, w - 0.06, h - base - 0.06, 0.012, { color, uv: "keep" });
  // recessed pull + latch LED
  f.box("metalRough", u + w * 0.3, 1.1, d + 0.002, 0.03, 0.2, 0.012, { color: PALETTE.darkMetal });
  f.box("metal", u + w * 0.3, 1.1, d + 0.014, 0.014, 0.16, 0.014, { color: PALETTE.steel });
  if (led) f.box("emitTeal", u - w * 0.32, 1.2, d + 0.004, 0.018, 0.012, 0.006);
  // trim band near the top and vent slots near the bottom
  f.box("painted", u, h - 0.32, d + 0.003, w - 0.08, 0.07, 0.008, { color: band, uv: "keep" });
  if (vents) for (let k = 0; k < 5; k++) f.box("metal", u, 0.32 + k * 0.05, d + 0.003, w * 0.5, 0.012, 0.008, { color: PALETTE.darkMetal });
  if (decal !== null) f.add("decal", new THREE.PlaneGeometry(0.22, 0.22), u, h - 0.62, d + 0.006, { uv: "keep", uvRect: decalRect(decal) });
  if (collide) f.collider(u - w / 2, u + w / 2, 0, h, 0, d, tag);
}

// A run of lockers between u0 and u1 (as many as fit), decals cycling through `decals`.
export function lockerRun(f, u0, u1, opts = {}) {
  const w = opts.w || 0.6;
  const n = Math.max(1, Math.floor((u1 - u0 + 0.01) / w));
  const start = (u0 + u1) / 2 - ((n - 1) * w) / 2;
  const decals = opts.decals || [null];
  for (let i = 0; i < n; i++) locker(f, start + i * w, { ...opts, decal: decals[i % decals.length] });
  return n;
}

// Low footlocker / kit box on a wall frame (or anywhere, with a small frame). Lid line, latches, stencil.
export function footlocker(f, u, opts = {}) {
  const { w = 0.8, h = 0.45, d = 0.45, color = PALETTE.impGreyDark, decal = 14, n0 = 0 } = opts;
  f.box("painted", u, h / 2, n0 + d / 2, w, h, d, { color, uv: "keep" });
  f.box("metal", u, h - 0.08, n0 + d / 2, w + 0.02, 0.016, d + 0.02, { color: PALETTE.darkMetal });
  f.box("metal", u, 0.03, n0 + d / 2, w + 0.02, 0.06, d + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  for (const s of [-1, 1]) f.box("metal", u + s * w * 0.3, h - 0.18, n0 + d + 0.008, 0.06, 0.1, 0.016, { color: PALETTE.steel });
  if (decal !== null) f.add("decal", new THREE.PlaneGeometry(0.18, 0.18), u, h * 0.45, n0 + d + 0.004, { uv: "keep", uvRect: decalRect(decal) });
  f.collider(u - w / 2, u + w / 2, 0, h, n0, n0 + d, "footlocker");
}

// Grab rail: steel tube on standoff brackets along a wall frame.
export function grabRail(f, u0, u1, v, opts = {}) {
  const { n = 0.09, r = 0.021, color = PALETTE.steel } = opts;
  const len = u1 - u0;
  f.cylU("metal", (u0 + u1) / 2, v, n, r, len, { color, segments: 10 });
  const brackets = Math.max(2, Math.round(len / 1.4) + 1);
  for (let i = 0; i < brackets; i++) {
    const u = u0 + 0.08 + ((len - 0.16) * i) / (brackets - 1);
    f.box("metalRough", u, v, n / 2 - 0.01, 0.05, 0.05, n - 0.02, { color: PALETTE.gunmetal });
    f.box("metal", u, v, 0.006, 0.09, 0.09, 0.012, { color: PALETTE.gunmetal, texel: 2 });
  }
}

// Wall-mounted screen with a satin bezel and an indicator strip under it.
export function wallScreen(f, u, v, w, h, mat = "screen0", opts = {}) {
  const { n = 0, leds = true } = opts;
  f.box("satinBlack", u, v, n + 0.02, w + 0.08, h + 0.08, 0.04);
  f.box("darkGloss", u, v, n + 0.041, w + 0.02, h + 0.02, 0.004);
  f.box(mat, u, v, n + 0.045, w, h, 0.004, { uv: "keep" });
  if (leds) f.box("leds", u, v - h / 2 - 0.02, n + 0.042, Math.min(w * 0.7, 0.5), 0.03, 0.006, { uv: "keep" });
}

// Small stencil decal on a frame.
export function stencil(f, u, v, size, idx, n = 0.002) {
  f.add("decal", new THREE.PlaneGeometry(size, size), u, v, n, { uv: "keep", uvRect: decalRect(idx) });
}

// Yellow/black hazard band on a frame (world UVs keep the stripe pitch at 25 cm).
export function hazardBand(f, u0, u1, v, h, n = 0.004) {
  f.box("hazard", (u0 + u1) / 2, v, n, u1 - u0, h, 0.006, { color: HAZARD_YELLOW, texel: 1 });
}

// Flush ceiling fixture: black housing with a soft emitter face, hung just under the ceiling plane.
export function ceilingFixture(kit, x, yTop, z, sx, sz, mat = "emitWhiteSoft") {
  kit.box("satinBlack", x, yTop - 0.04, z, sx + 0.12, 0.08, sz + 0.12);
  kit.box(mat, x, yTop - 0.082, z, sx, 0.012, sz, { uv: "keep" });
}

// Pendant fixture: stem from the ceiling, shallow shade, emitter underneath.
export function pendant(kit, x, yTop, z, drop, r, mat = "emitWarmSoft") {
  kit.cyl("metal", x, yTop - drop / 2, z, 0.015, drop, "y", { color: PALETTE.darkMetal, segments: 8 });
  kit.cyl("paintedMetal", x, yTop - drop - 0.05, z, r, 0.1, "y", { color: PALETTE.gunmetal, segments: 20 });
  kit.cyl(mat, x, yTop - drop - 0.105, z, r - 0.03, 0.012, "y", { uv: "keep", segments: 20 });
}

// Bench: seat slab on two pedestals, axis 'x' or 'z' (length along that axis).
export function bench(kit, cx, y0, cz, len, axis = "x", opts = {}) {
  const { seat = 0.45, w = 0.42, color = PALETTE.impGreyDark } = opts;
  const along = axis === "x";
  const sx = along ? len : w;
  const sz = along ? w : len;
  kit.box("painted", cx, y0 + seat - 0.025, cz, sx, 0.05, sz, { color, uv: "keep" });
  kit.box("satinBlack", cx, y0 + seat - 0.07, cz, sx - 0.04, 0.04, sz - 0.04);
  const n = Math.max(2, Math.round(len / 1.6) + 1);
  for (let i = 0; i < n; i++) {
    const t = -len / 2 + 0.25 + ((len - 0.5) * i) / (n - 1);
    const px = along ? cx + t : cx;
    const pz = along ? cz : cz + t;
    kit.box("satinBlack", px, y0 + (seat - 0.09) / 2, pz, along ? 0.08 : w - 0.1, seat - 0.09, along ? w - 0.1 : 0.08);
  }
  kit.collider([cx - sx / 2, y0, cz - sz / 2], [cx + sx / 2, y0 + seat, cz + sz / 2], "bench");
}

// Floor chevron pointing along `yaw` (0 = -z, +PI/2 = -x, -PI/2 = +x, PI = +z). s is the arm length.
export function floorChevron(kit, mat, x, y, z, yaw, s = 0.35, w = 0.1, t = 0.006) {
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const place = (lx, lz) => [x + lx * c + lz * sn, z - lx * sn + lz * c];
  const arm = s * Math.SQRT2 + w * 0.4;
  const [ax, az] = place(s / 2, -s / 2);
  kit.box(mat, ax, y, az, arm, t, w, { rot: [0, yaw - Math.PI / 4, 0], uv: "keep" });
  const [bx, bz] = place(-s / 2, -s / 2);
  kit.box(mat, bx, y, bz, arm, t, w, { rot: [0, yaw + Math.PI / 4, 0], uv: "keep" });
}

// Floor grating strip (single textured quad) between two corners at height y.
export function grateStrip(kit, x0, z0, x1, z1, y) {
  const w = x1 - x0;
  const d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], uv: "scale", uvScale: [w / GRATE_TILE[0], d / GRATE_TILE[1]] });
  kit.box("metal", (x0 + x1) / 2, y - 0.025, (z0 + z1) / 2, w + 0.06, 0.03, d + 0.06, { color: PALETTE.darkMetal, texel: 2 });
}

// Pipe run along a wall frame with clamps every ~1.2 m; r is the pipe radius, n the standoff.
export function pipeRun(f, u0, u1, v, r, opts = {}) {
  const { n = r + 0.04, color = PALETTE.steel, clamps = true } = opts;
  f.cylU("metal", (u0 + u1) / 2, v, n, r, u1 - u0, { color, segments: 10 });
  if (!clamps) return;
  for (let u = u0 + 0.3; u < u1 - 0.2; u += 1.2) f.box("metalRough", u, v, n / 2, 0.07, r * 2 + 0.05, n + r, { color: PALETTE.darkMetal });
}

// Cabinet with a counter top (kitchen / lab / med): doors below, steel top at `h`. Builds on a frame.
export function counter(f, u0, u1, opts = {}) {
  const { h = 0.9, d = 0.6, color = PALETTE.cream, top = PALETTE.steel, doorW = 0.6, toeGlow = null } = opts;
  const len = u1 - u0;
  const uc = (u0 + u1) / 2;
  f.box("metal", uc, 0.05, d / 2 + 0.03, len, 0.1, d - 0.06, { color: PALETTE.darkMetal, texel: 2 });
  f.box("painted", uc, 0.1 + (h - 0.16) / 2, d / 2 - 0.01, len, h - 0.16, d - 0.02, { color, uv: "keep" });
  f.box("metal", uc, h - 0.03, d / 2, len + 0.04, 0.06, d + 0.04, { color: top, texel: 1.5 });
  const n = Math.max(1, Math.round(len / doorW));
  for (let i = 0; i < n; i++) {
    const u = u0 + ((i + 0.5) * len) / n;
    if (i > 0) f.box("metal", u0 + (i * len) / n, 0.1 + (h - 0.16) / 2, d - 0.005, 0.012, h - 0.2, 0.012, { color: PALETTE.darkMetal });
    f.box("metal", u, h - 0.16, d + 0.012, Math.min(0.24, len / n - 0.2), 0.02, 0.025, { color: PALETTE.steel });
  }
  if (toeGlow) f.box(toeGlow, uc, 0.05, d - 0.036, len - 0.2, 0.02, 0.008);
  f.collider(u0, u1, 0, h, 0, d + 0.02, "counter");
}

// Frosted glass sheets: separate mesh with a cloned, milkier glass material (one draw call per room).
export class Frosted {
  constructor(ctx, opts = {}) {
    this.ctx = ctx;
    this.geos = [];
    const m = ctx.materials.glass.clone();
    m.opacity = opts.opacity ?? 0.34;
    m.roughness = opts.roughness ?? 0.55;
    m.color = new THREE.Color(opts.color ?? 0xaebcc6);
    m.envMapIntensity = 0.25;
    m.side = THREE.DoubleSide;
    m.depthWrite = false;
    this.material = m;
  }
  box(cx, cy, cz, sx, sy, sz) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(cx, cy, cz);
    this.geos.push(g);
  }
  cyl(cx, cy, cz, r, h, segments = 40) {
    const g = new THREE.CylinderGeometry(r, r, h, segments, 1, true);
    g.translate(cx, cy, cz);
    this.geos.push(g);
  }
  build(name = "frosted") {
    if (!this.geos.length || !this.ctx.group) return null;
    const merged = mergeGeometries(this.geos.map((g) => (g.index ? g.toNonIndexed() : g)), false);
    const mesh = new THREE.Mesh(merged, this.material);
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 2;
    this.ctx.group.add(mesh);
    return mesh;
  }
}

export { decalRect, PALETTE };
