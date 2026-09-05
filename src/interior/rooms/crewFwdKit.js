// Kit-bash pieces shared by the forward crew-deck rooms (escape pods, crew quarters, refresher, mess,
// medbay). Everything here builds on a wall Frame (u along the wall, v up, n into the room) or in world
// space, and merges into the room's Kit; only the frosted-glass sheet is a separate mesh because the
// shared glass material is far too clear for partitions.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { decalRect, GRATE_TILE, makeCanvas, toTexture } from "../../textures.js";

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

// Surface-mounted round downlight can: black housing with a steel trim ring and an emitter disc.
export function downlight(kit, x, yTop, z, r = 0.16, mat = "emitWhiteSoft") {
  kit.cyl("satinBlack", x, yTop - 0.06, z, r + 0.05, 0.12, "y", { segments: 20 });
  kit.cyl("metal", x, yTop - 0.125, z, r + 0.03, 0.014, "y", { color: PALETTE.steel, segments: 20, open: true });
  kit.cyl(mat, x, yTop - 0.126, z, r, 0.012, "y", { uv: "keep", segments: 20 });
}

// Linear pendant: two stems, a long black canopy with a warm emitter strip in its underside.
export function linearPendant(kit, x, yTop, z, len, drop, axis = "x", mat = "emitWarmSoft") {
  const along = axis === "x";
  const sx = along ? len : 0.26;
  const sz = along ? 0.26 : len;
  for (const s of [-1, 1]) kit.cyl("metal", along ? x + s * (len / 2 - 0.3) : x, yTop - drop / 2, along ? z : z + s * (len / 2 - 0.3), 0.012, drop, "y", { color: PALETTE.darkMetal, segments: 8 });
  kit.box("satinBlack", x, yTop - drop - 0.06, z, sx, 0.12, sz);
  kit.box("metal", x, yTop - drop - 0.115, z, sx - 0.03, 0.01, sz - 0.03, { color: PALETTE.steel, texel: 2 });
  kit.box(mat, x, yTop - drop - 0.125, z, sx - 0.08, 0.012, sz - 0.08, { uv: "keep" });
}

// Pendant fixture: stem from the ceiling, shallow shade, emitter underneath.
export function pendant(kit, x, yTop, z, drop, r, mat = "emitWarmSoft") {
  kit.cyl("metal", x, yTop - drop / 2, z, 0.015, drop, "y", { color: PALETTE.darkMetal, segments: 8 });
  kit.cyl("paintedMetal", x, yTop - drop - 0.05, z, r, 0.1, "y", { color: PALETTE.gunmetal, segments: 20 });
  kit.cyl(mat, x, yTop - drop - 0.105, z, r - 0.03, 0.012, "y", { uv: "keep", segments: 20 });
}

// Bench: seat slab on a welded square-tube frame — a leg pair with a low stretcher every ~1.5 m, foot
// pads on the deck and two rails joining the pairs under the seat. Axis 'x' or 'z' (length along it).
export function bench(kit, cx, y0, cz, len, axis = "x", opts = {}) {
  const { seat = 0.45, w = 0.4, color = PALETTE.impGreyDark, legColor = PALETTE.gunmetal } = opts;
  const along = axis === "x";
  const sx = along ? len : w;
  const sz = along ? w : len;
  const at = (t, off) => (along ? [cx + t, cz + off] : [cx + off, cz + t]);
  kit.box("painted", cx, y0 + seat - 0.025, cz, sx, 0.05, sz, { color, uv: "keep" });
  kit.box("metal", cx, y0 + seat - 0.06, cz, sx - 0.02, 0.02, sz - 0.02, { color: PALETTE.darkMetal, texel: 2 });
  const leg = 0.05;
  const legH = seat - 0.06;
  const inset = w / 2 - 0.08;
  const pairs = Math.max(2, Math.round(len / 1.5) + 1);
  for (let i = 0; i < pairs; i++) {
    const t = -len / 2 + 0.25 + ((len - 0.5) * i) / (pairs - 1);
    for (const s of [-1, 1]) {
      const [px, pz] = at(t, s * inset);
      kit.box("metal", px, y0 + legH / 2, pz, leg, legH, leg, { color: legColor, texel: 2 });
      kit.box("metal", px, y0 + 0.01, pz, leg + 0.04, 0.02, leg + 0.04, { color: PALETTE.darkMetal, texel: 2 });
    }
    const [px, pz] = at(t, 0);
    kit.box("metal", px, y0 + 0.14, pz, along ? 0.03 : inset * 2, 0.03, along ? inset * 2 : 0.03, { color: legColor, texel: 2 });
  }
  for (const s of [-1, 1]) {
    const [px, pz] = at(0, s * inset);
    kit.box("metal", px, y0 + seat - 0.09, pz, along ? len - 0.5 : 0.03, 0.04, along ? 0.03 : len - 0.5, { color: legColor, texel: 2 });
  }
  kit.collider([cx - sx / 2, y0, cz - sz / 2], [cx + sx / 2, y0 + seat, cz + sz / 2], "bench");
}

// Made-up bunk / bed: thick pale mattress, a blue blanket tucked from the foot end and draped over
// the open edge, a pillow at the head. (cx, yTop, cz) is the platform's top centre, the bed runs along
// x, headSide is -1/+1 along x and openDir the side (+/-z) the sleeper climbs in from.
export const MATTRESS = new THREE.Color("#c9c6bc");
export const BLANKET = new THREE.Color("#3b5583");
export function bedding(kit, cx, yTop, cz, L, D, headSide, openDir, opts = {}) {
  const { mattress = MATTRESS, blanket = BLANKET, pillow = PALETTE.impWhite, foldedFoot = false, add = null } = opts;
  const put = add || ((col, px, py, pz, sx, sy, sz) => kit.box("fabric", px, py, pz, sx, sy, sz, { color: col, uv: "world", texel: 2 }));
  const mT = 0.14;
  put(mattress, cx, yTop + mT / 2, cz, L - 0.12, mT, D - 0.1);
  // blanket: from the foot end to a hand's width short of the pillow, wider than the mattress so it hangs
  const bL = L * 0.62;
  const bx = cx - headSide * (L / 2 - 0.06 - bL / 2);
  put(blanket, bx, yTop + mT + 0.025, cz, bL, 0.05, D - 0.02);
  put(blanket, bx, yTop + mT - 0.08, cz + openDir * (D / 2 - 0.02), bL, 0.22, 0.025);
  put(pillow, cx + headSide * (L / 2 - 0.34), yTop + mT + 0.045, cz - openDir * 0.02, 0.46, 0.09, D - 0.34);
  if (foldedFoot) put(blanket, cx - headSide * (L / 2 - 0.3), yTop + mT + 0.05 + 0.05, cz, 0.36, 0.1, D - 0.3);
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

// Geometry collector for one material the shared kit does not carry (frosted glass, mirrors, label
// plates): everything added is merged into a single mesh on build(), i.e. one draw call per room.
export class Sheet {
  constructor(ctx, material, opts = {}) {
    this.ctx = ctx;
    this.geos = [];
    this.material = material;
    this.renderOrder = opts.renderOrder ?? 0;
    this.shadows = opts.shadows ?? true;
  }
  add(g, cx, cy, cz, rotY = 0) {
    if (rotY) g.rotateY(rotY);
    g.translate(cx, cy, cz);
    this.geos.push(g);
  }
  box(cx, cy, cz, sx, sy, sz, rotY = 0) {
    this.add(new THREE.BoxGeometry(sx, sy, sz), cx, cy, cz, rotY);
  }
  cyl(cx, cy, cz, r, h, segments = 40) {
    this.add(new THREE.CylinderGeometry(r, r, h, segments, 1, true), cx, cy, cz);
  }
  // Upright plane of w x h whose face normal points along yaw (0 = +z, PI/2 = +x), optional uv rect.
  plane(cx, cy, cz, w, h, yaw = 0, uvRect = null) {
    const g = new THREE.PlaneGeometry(w, h);
    if (uvRect) {
      const uv = g.attributes.uv;
      const [u0, v0, u1, v1] = uvRect;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
    this.add(g, cx, cy, cz, yaw);
  }
  build(name = "sheet") {
    if (!this.geos.length || !this.ctx.group) return null;
    const merged = mergeGeometries(this.geos.map((g) => (g.index ? g.toNonIndexed() : g)), false);
    const mesh = new THREE.Mesh(merged, this.material);
    mesh.name = name;
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = this.shadows;
    mesh.renderOrder = this.renderOrder;
    this.ctx.group.add(mesh);
    return mesh;
  }
}

// Frosted glass sheets: a cloned, milkier glass material.
export class Frosted extends Sheet {
  constructor(ctx, opts = {}) {
    const m = ctx.materials.glass.clone();
    m.opacity = opts.opacity ?? 0.34;
    m.roughness = opts.roughness ?? 0.55;
    m.color = new THREE.Color(opts.color ?? 0xaebcc6);
    m.envMapIntensity = 0.25;
    m.side = THREE.DoubleSide;
    m.depthWrite = false;
    super(ctx, m, { renderOrder: 2, shadows: false });
  }
}

// Mirror glass: a tinted, near-polished panel. Mostly metallic so it carries the environment
// reflection and sharp hits from the vanity lights, with enough dielectric tint left that it still
// shades under the room light instead of reading as a black rectangle.
export class Mirror extends Sheet {
  constructor(ctx, opts = {}) {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(opts.color ?? 0xa7b1bd),
      metalness: opts.metalness ?? 0.7,
      roughness: opts.roughness ?? 0.1,
      envMapIntensity: opts.envMapIntensity ?? 3.0,
    });
    super(ctx, m, { shadows: false });
  }
}

// Sheet of short backlit label plates ("POD 01", "BAY 3" ...): one canvas texture with a 4 x 4 grid of
// 4:1 cells, dark plate, accent bar and light monospace text like the door signs. An entry may be a
// plain string or { t, accent } to give that one plate its own accent colour (red for a warning).
export class Labels extends Sheet {
  constructor(ctx, texts, opts = {}) {
    const { accent = "#ffb347", ink = "#e4e7ec", plate = "#0b0d11" } = opts;
    const W = 1024;
    const H = 256;
    const cols = 4;
    const cw = W / cols;
    const ch = H / cols;
    const c = makeCanvas(W, H);
    const g = c.getContext("2d");
    texts.slice(0, cols * cols).forEach((t, i) => {
      const x = (i % cols) * cw;
      const y = Math.floor(i / cols) * ch;
      g.fillStyle = plate;
      g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      g.fillStyle = (t && typeof t === "object" && t.accent) || accent;
      g.fillRect(x + 12, y + 10, 5, ch - 20);
      g.fillStyle = ink;
      let px = Math.floor(ch * 0.55);
      const font = () => `bold ${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;
      g.font = font();
      const s = String(t && typeof t === "object" ? t.t : t).toUpperCase();
      while (g.measureText(s).width > cw - 44 && px > 10) {
        px -= 2;
        g.font = font();
      }
      g.textBaseline = "middle";
      g.textAlign = "center";
      g.fillText(s, x + cw / 2 + 8, y + ch / 2);
    });
    const tex = toTexture(c, { srgb: true, wrap: false });
    const m = new THREE.MeshStandardMaterial({ color: 0x8a8f96, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0 });
    super(ctx, m, { shadows: false });
    this.cols = cols;
  }
  // Plate `idx` centred at (cx, cy, cz), w x h, facing yaw (0 = +z, PI/2 = +x).
  label(idx, cx, cy, cz, w, h, yaw = 0) {
    const n = this.cols;
    const col = idx % n;
    const row = Math.floor(idx / n);
    this.plane(cx, cy, cz, w, h, yaw, [col / n, 1 - (row + 1) / n, (col + 1) / n, 1 - row / n]);
  }
  // Same, expressed on a wall frame (u along, v up, n proud of the wall); the plate faces the frame normal.
  onFrame(f, idx, u, v, n, w, h) {
    const p = f.pos(u, v, n);
    this.label(idx, p.x, p.y, p.z, w, h, Math.atan2(f.N.x, f.N.z));
  }
}

export { decalRect, PALETTE };
