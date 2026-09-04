// Engineering-deck prop kit: industrial Imperial details shared by the Deck 4 rooms (engineering
// control, hyperdrive, maintenance, cargo, reactor). Darker panel mixes, amber work lights, red hazard
// trim, cable trays, vents, tanks, shelving, bar gauges and pulsing emissive materials.
//
// All positions are deck-local metres (floor at y = 0 unless stated). Helpers add merged geometry
// through `kit`; anything animated goes through `ctx.mesh` / `ctx.anim`.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { rng } from "../../kit.js";
import { decalRect, GRATE_TILE } from "../../textures.js";
import { wallFrame, pointLight } from "../builders.js";
import { wallSegment } from "../imperial.js";

// Darker Imperial panel mixes for the working decks
export const ENG_PAINTS = [
  [PALETTE.impGrey, 0.42],
  [PALETTE.impMid, 0.3],
  [PALETTE.impLight, 0.14],
  [PALETTE.impDark, 0.14],
];
export const ENG_PAINTS_DARK = [
  [PALETTE.impMid, 0.45],
  [PALETTE.impDark, 0.35],
  [PALETTE.impGrey, 0.2],
];
export const ENG_CEIL_PAINTS = [
  [PALETTE.impGrey, 0.45],
  [PALETTE.impMid, 0.4],
  [PALETTE.impDark, 0.15],
];
export const ENG_STYLES = { panel: 0.5, vent: 0.12, greeble: 0.14, strip: 0.08, screen: 0.06, conduit: 0.1 };
export const ENG_THEME = { accent: "emitAmber", accent2: "emitRed", pipeCol: PALETTE.impAmber, screenMats: ["impScreen1", "impScreen4", "impScreen1"] };

export const AMBER = 0xffa64d;
export const AMBER_DEEP = 0xff8a2a;
export const COOL = 0xdfe9ff;
export const BLUE = 0x6fb4ff;
export const RED = 0xff3a2a;

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
/** Clone an emissive kit material under `key` (guarded) with its own colour / intensity. */
export function emitMat(ctx, key, hex, intensity = 2.4, base = "emitBlue") {
  if (!ctx.materials[key]) {
    const m = ctx.materials[base].clone();
    m.emissive = new THREE.Color(hex);
    m.emissiveIntensity = intensity;
    ctx.materials[key] = m;
  }
  return ctx.materials[key];
}

/**
 * A ring of `n` emissive materials whose intensities are phase-shifted along a travelling pulse.
 * Returns { keys, update(t) }. Geometry assigned to keys[i % n] along a length reads as energy
 * flowing along it once update() runs from ctx.anim.
 */
export function pulseSet(ctx, prefix, hex, n = 6, { min = 0.5, max = 3.2, speed = 2.2, base = "emitBlue" } = {}) {
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(prefix + i);
  const mats = keys.map((k) => emitMat(ctx, k, hex, min, base));
  return {
    keys,
    mats,
    update(t) {
      for (let i = 0; i < n; i++) {
        const ph = Math.sin(t * speed - (i / n) * Math.PI * 2);
        const k = Math.pow(Math.max(0, ph), 3);
        mats[i].emissiveIntensity = min + (max - min) * k;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Overhead: cable trays, pipes, vents, hanging work lights, crane rails
// ---------------------------------------------------------------------------
/**
 * Cable tray along a straight run between two points at height y: a dark U-channel with side lips,
 * bundled cables inside and hanger rods up to `ceil`.
 */
export function cableTray(kit, [x0, z0], [x1, z1], y, { w = 0.5, ceil = null, cables = 4, seed = 3, color = PALETTE.impDark } = {}) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const rot = [0, ang, 0];
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const rand = rng(seed);
  kit.add("paintedMetal", new THREE.BoxGeometry(w, 0.05, len), { pos: [cx, y, cz], rot, color, texel: 2 });
  for (const s of [-1, 1]) kit.add("paintedMetal", new THREE.BoxGeometry(0.04, 0.16, len), { pos: [cx + Math.cos(ang) * s * (w / 2), y + 0.08, cz - Math.sin(ang) * s * (w / 2)], rot, color, texel: 2 });
  // cross rungs
  const nr = Math.max(2, Math.round(len / 0.6));
  for (let i = 0; i <= nr; i++) {
    const t = i / nr;
    kit.add("metal", new THREE.BoxGeometry(w - 0.02, 0.03, 0.04), { pos: [x0 + dx * t, y + 0.03, z0 + dz * t], rot, color: PALETTE.gunmetal });
  }
  // cables: a few thick runs lying in the tray
  const cols = [PALETTE.rubber, PALETTE.impBlack, PALETTE.impAmber, PALETTE.impMid];
  for (let i = 0; i < cables; i++) {
    const r = 0.025 + rand() * 0.03;
    const off = (i / Math.max(1, cables - 1) - 0.5) * (w - 0.16);
    const g = new THREE.CylinderGeometry(r, r, len - 0.05, 8);
    g.rotateX(Math.PI / 2);
    kit.add(i % 3 === 1 ? "metal" : "rubber", g, { pos: [cx + Math.cos(ang) * off, y + 0.04 + r, cz - Math.sin(ang) * off], rot, color: cols[Math.floor(rand() * cols.length)], uv: "scale", uvScale: [0.3, len] });
  }
  // hangers
  if (ceil !== null && ceil > y + 0.1) {
    const nh = Math.max(2, Math.round(len / 3.2));
    for (let i = 0; i <= nh; i++) {
      const t = nh === 0 ? 0.5 : i / nh;
      const px = x0 + dx * t;
      const pz = z0 + dz * t;
      kit.box("metal", px, (y + ceil) / 2 + 0.04, pz, 0.04, ceil - y - 0.08, 0.04, { color: PALETTE.steel });
      kit.box("paintedMetal", px, ceil - 0.03, pz, 0.24, 0.06, 0.24, { color: PALETTE.impBlack, texel: 2 });
    }
  }
}

/** Large wall vent grille with angled slats, an amber status lamp and grime frame. */
export function wallVent(kit, ctx, side, u, v, w = 1.6, h = 0.9, { bounds = ctx.bounds, slats = null, lamp = "emitAmber" } = {}) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  frame.box("paintedMetal", u, v, 0.05, w + 0.16, h + 0.16, 0.1, { color: PALETTE.impDark, texel: 2 });
  frame.box("metal", u, v, 0.07, w, h, 0.06, { color: PALETTE.impBlack });
  const n = slats ?? Math.max(3, Math.floor(h / 0.12));
  for (let i = 0; i < n; i++) {
    const sv = v - h / 2 + 0.08 + (i / Math.max(1, n - 1)) * (h - 0.16);
    frame.box("metal", u, sv, 0.1, w - 0.1, 0.03, 0.09, { color: PALETTE.slate, tilt: 0.6 });
  }
  frame.box("metal", u - w / 2 + 0.1, v, 0.1, 0.06, h - 0.05, 0.02, { color: PALETTE.gunmetal });
  frame.box("metal", u + w / 2 - 0.1, v, 0.1, 0.06, h - 0.05, 0.02, { color: PALETTE.gunmetal });
  frame.box(lamp, u + w / 2 + 0.03, v + h / 2 + 0.03, 0.105, 0.05, 0.05, 0.01);
}

/** Stencil decal on a wall (decal sheet cell `idx`). */
export function wallStencil(kit, ctx, side, u, v, size, idx, { bounds = ctx.bounds, n = 0.012 } = {}) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  frame.add("decal", new THREE.PlaneGeometry(size, size), u, v, n, { uv: "keep", uvRect: decalRect(idx) });
}

/** Stencil decal lying on the floor (or any horizontal surface at y). */
export function floorStencil(kit, x, z, size, idx, yaw = 0, y = 0.006) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("decal", g, { pos: [x, y, z], uv: "keep", uvRect: decalRect(idx) });
}

/** Thin painted line on the floor (lane markings): from (x0,z0) to (x1,z1). */
export function floorLine(kit, x0, z0, x1, z1, { w = 0.12, mat = "paintedMetal", color = PALETTE.impAmber, y = 0.004 } = {}) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  kit.add(mat, new THREE.BoxGeometry(w, 0.006, len), { pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], rot: [0, ang, 0], color, texel: 3 });
}

/** Hazard-stripe border rectangle on the floor around x0..x1, z0..z1 (band `w` wide, outside the rect). */
export function hazardBorder(kit, x0, z0, x1, z1, w = 0.3, y = 0.004) {
  kit.boxMM("hazard", [x0 - w, y - 0.004, z0 - w], [x1 + w, y, z0], { texel: 3 });
  kit.boxMM("hazard", [x0 - w, y - 0.004, z1], [x1 + w, y, z1 + w], { texel: 3 });
  kit.boxMM("hazard", [x0 - w, y - 0.004, z0], [x0, y, z1], { texel: 3 });
  kit.boxMM("hazard", [x1, y - 0.004, z0], [x1 + w, y, z1], { texel: 3 });
}

/** Dark, glossy spill on the floor: a few overlapping flattened discs. */
export function oilStain(kit, x, z, r = 0.6, seed = 5) {
  const rand = rng(seed);
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const rr = r * (0.35 + rand() * 0.6);
    const g = new THREE.CylinderGeometry(rr, rr, 0.004, 14);
    g.scale(1, 1, 0.55 + rand() * 0.6);
    kit.add("darkGloss", g, { pos: [x + (rand() - 0.5) * r * 1.1, 0.003 + i * 0.0005, z + (rand() - 0.5) * r * 1.1], rot: [0, rand() * Math.PI, 0] });
  }
}

/**
 * Hanging work light: cable from the ceiling, a boxy industrial housing with a soft emissive
 * diffuser underneath and an amber tell-tale. Optionally registers the real point light.
 */
export function workLight(kit, ctx, x, y, z, { ceil, color = COOL, intensity = 6, distance = 11, light = true, w = 0.9, d = 0.35, emit = "emitWhiteSoft" } = {}) {
  if (ceil !== undefined && ceil > y) {
    kit.box("rubber", x, (y + ceil) / 2 + 0.1, z, 0.03, ceil - y - 0.2, 0.03, { color: PALETTE.rubber });
    kit.box("paintedMetal", x, ceil - 0.04, z, 0.3, 0.08, 0.3, { color: PALETTE.impBlack, texel: 2 });
  }
  kit.box("paintedMetal", x, y + 0.1, z, w, 0.2, d, { color: PALETTE.impDark, texel: 2 });
  kit.box("metal", x, y + 0.22, z, w * 0.5, 0.06, d * 0.5, { color: PALETTE.gunmetal });
  kit.box(emit, x, y - 0.005, z, w - 0.1, 0.02, d - 0.1, { uv: "keep" });
  kit.box("emitAmber", x + w / 2 - 0.06, y + 0.12, z + d / 2 + 0.006, 0.05, 0.03, 0.01);
  if (light) ctx.light(pointLight(color, intensity, distance, [x, y - 0.3, z]));
}

/** Wall-mounted red rotating-beacon style warning lamp (dome + cage). */
export function warningLamp(kit, x, y, z, { mat = "emitRed", r = 0.12 } = {}) {
  kit.box("paintedMetal", x, y - r * 0.9, z, r * 2.6, 0.08, r * 2.6, { color: PALETTE.impBlack, texel: 2 });
  kit.add(mat, new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y - r * 0.85, z] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box("metal", x + Math.cos(a) * r * 1.05, y - r * 0.4, z + Math.sin(a) * r * 1.05, 0.015, r * 1.1, 0.015, { color: PALETTE.steel });
  }
}

/** Overhead crane rail: an I-beam along x (or z) at height y with support brackets to the ceiling. */
export function craneRail(kit, a0, a1, fixed, y, { axis = "x", ceil = null, color = PALETTE.impAmber, seed = 1 } = {}) {
  const len = a1 - a0;
  const c = (a0 + a1) / 2;
  const sz = (l, h, t) => (axis === "x" ? [l, h, t] : [t, h, l]);
  const pos = (yy) => (axis === "x" ? [c, yy, fixed] : [fixed, yy, c]);
  kit.box("paintedMetal", ...pos(y), ...sz(len, 0.06, 0.5), { color, texel: 1.5 });
  kit.box("paintedMetal", ...pos(y + 0.3), ...sz(len, 0.5, 0.08), { color: PALETTE.impDark, texel: 1.5 });
  kit.box("paintedMetal", ...pos(y + 0.6), ...sz(len, 0.06, 0.5), { color, texel: 1.5 });
  if (ceil !== null) {
    const n = Math.max(2, Math.round(len / 5));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * len;
      const p = axis === "x" ? [a, 0, fixed] : [fixed, 0, a];
      kit.box("paintedMetal", p[0], (y + 0.63 + ceil) / 2, p[2], 0.14, ceil - y - 0.63, 0.14, { color: PALETTE.impDark, texel: 2 });
      kit.box("paintedMetal", p[0], ceil - 0.04, p[2], 0.5, 0.08, 0.5, { color: PALETTE.impBlack, texel: 2 });
    }
  }
}

// ---------------------------------------------------------------------------
// Machinery and storage
// ---------------------------------------------------------------------------
/** Vertical coolant / fuel tank: cylinder, domed top, bands, plinth, valve wheel, gauge. */
export function tank(kit, x, z, { r = 0.9, h = 3.6, y = 0, color = PALETTE.impMid, band = PALETTE.impDark, lamp = "emitBlue", seed = 2, label = 12, front = 1 } = {}) {
  kit.box("paintedMetal", x, y + 0.1, z, r * 2.3, 0.2, r * 2.3, { color: PALETTE.impBlack, texel: 2 });
  kit.box("hazard", x, y + 0.2, z, r * 2.0, 0.02, r * 2.0, { texel: 3 });
  kit.cyl("paintedMetal", x, y + 0.2 + (h - r) / 2, z, r, h - r, "y", { color, segments: 28, texel: 0.8 });
  kit.add("paintedMetal", new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y + 0.2 + h - r, z], color, uv: "scale", uvScale: [4, 2] });
  for (const f of [0.18, 0.5, 0.82]) kit.cyl("metal", x, y + 0.2 + (h - r) * f, z, r + 0.05, 0.14, "y", { color: band, segments: 28 });
  // top fittings
  kit.cyl("metal", x, y + 0.2 + h + 0.15, z, r * 0.25, 0.4, "y", { color: PALETTE.steel, segments: 12 });
  kit.box("paintedMetal", x, y + 0.2 + h + 0.4, z, r * 0.7, 0.14, r * 0.7, { color: PALETTE.impDark, texel: 2 });
  // gauge + valve on the front face (front = +1: +z, -1: -z)
  const f = front;
  const fz = z + f * (r + 0.02);
  const rotY = f > 0 ? 0 : Math.PI;
  kit.box("paintedMetal", x, y + 1.3, fz, 0.36, 0.5, 0.08, { color: PALETTE.impDark, texel: 2 });
  kit.add("impScreen4", new THREE.PlaneGeometry(0.28, 0.16), { pos: [x, y + 1.38, fz + f * 0.045], rot: [0, rotY, 0], uv: "keep" });
  kit.box(lamp, x - 0.1, y + 1.14, fz + f * 0.045, 0.06, 0.04, 0.01);
  kit.box("emitRed", x + 0.1, y + 1.14, fz + f * 0.045, 0.06, 0.04, 0.01);
  const wheel = new THREE.TorusGeometry(0.14, 0.02, 8, 20);
  kit.add("metal", wheel, { pos: [x, y + 0.75, z + f * (r + 0.16)], color: PALETTE.impRed });
  kit.cyl("metal", x, y + 0.75, z + f * (r + 0.1), 0.03, 0.16, "z", { color: PALETTE.steel });
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [x, y + 2.1, z + f * (r + 0.003)], rot: [0, rotY, 0], uv: "keep", uvRect: decalRect(label) });
  void seed;
  kit.collider([x - r - 0.1, y, z - r - 0.15], [x + r + 0.1, y + h + 0.6, z + r + 0.15], "tank");
}

/**
 * Free-standing cabinet / breaker panel: dark body, grey face plate, rows of lamps and switches,
 * a screen and a stencil. Faces +Z before `yaw`.
 */
export function cabinet(kit, x, z, { yaw = 0, w = 1.2, h = 2.2, d = 0.6, y = 0, seed = 4, lamp = "emitAmber", screen = 1, color = PALETTE.impDark } = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  add("paintedMetal", new THREE.BoxGeometry(w, h, d), 0, h / 2, 0, { color, texel: 1.5 });
  add("impPanel1", new THREE.BoxGeometry(w - 0.12, h - 0.3, 0.02), 0, h / 2 + 0.05, d / 2 + 0.005, { color: PALETTE.impMid, uv: "keep" });
  add("hazard", new THREE.BoxGeometry(w, 0.08, d + 0.01), 0, 0.04, 0, { texel: 3 });
  // lamp rows
  const rows = Math.floor((h - 0.9) / 0.32);
  for (let r = 0; r < rows; r++) {
    const ly = 0.55 + r * 0.32;
    add("metal", new THREE.BoxGeometry(w - 0.3, 0.22, 0.03), 0, ly, d / 2 + 0.02, { color: rand() < 0.5 ? PALETTE.impBlack : PALETTE.gunmetal });
    const nl = 2 + Math.floor(rand() * 5);
    for (let i = 0; i < nl; i++) {
      const m = rand() < 0.15 ? "emitRed" : rand() < 0.2 ? "emitGreen" : lamp;
      add(m, new THREE.BoxGeometry(0.05, 0.03, 0.01), -w / 2 + 0.25 + i * 0.1, ly + 0.05, d / 2 + 0.04);
    }
    if (rand() < 0.5) add("rubber", new THREE.BoxGeometry(0.08, 0.05, 0.04), w / 2 - 0.3, ly - 0.04, d / 2 + 0.05, { color: PALETTE.rubber });
  }
  if (screen !== null) {
    add("darkGloss", new THREE.BoxGeometry(w * 0.6, 0.34, 0.02), 0, h - 0.4, d / 2 + 0.02);
    add("impScreen" + (screen % 5), new THREE.PlaneGeometry(w * 0.56, 0.3), 0, h - 0.4, d / 2 + 0.035, { uv: "keep" });
  }
  add("decal", new THREE.PlaneGeometry(0.3, 0.3), w * 0.25, 0.32, d / 2 + 0.018, { uv: "keep", uvRect: decalRect(5 + Math.floor(rand() * 2)) });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (w * c + d * s) / 2;
  const ez = (w * s + d * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + h, z + ez], "cabinet");
}

/**
 * Steel storage shelving frame from (x0,z0) to (x1,z1): posts every ~2.8 m, `levels` beams, wire
 * decking on each level. Returns the level heights so callers can stack crates on them.
 */
export function shelfFrame(kit, x0, z0, x1, z1, { levels = 3, levelH = 1.5, y = 0, color = PALETTE.impAmber, post = PALETTE.impDark, collide = true } = {}) {
  const w = x1 - x0;
  const d = z1 - z0;
  const alongX = w >= d;
  const len = alongX ? w : d;
  const nBays = Math.max(1, Math.round(len / 2.8));
  const top = y + levels * levelH;
  const heights = [];
  for (let i = 0; i <= nBays; i++) {
    const a = (alongX ? x0 : z0) + (i / nBays) * len;
    for (const s of [0, 1]) {
      const px = alongX ? a : s ? x1 : x0;
      const pz = alongX ? (s ? z1 : z0) : a;
      kit.box("paintedMetal", px, (y + top) / 2, pz, 0.1, top - y, 0.1, { color: post, texel: 2 });
      kit.box("paintedMetal", px, y + 0.05, pz, 0.2, 0.1, 0.2, { color: PALETTE.impBlack, texel: 2 });
    }
  }
  for (let l = 1; l <= levels; l++) {
    const ly = y + l * levelH;
    heights.push(ly);
    // long beams (both sides), bright safety paint
    for (const s of [0, 1]) {
      if (alongX) kit.box("paintedMetal", (x0 + x1) / 2, ly - 0.06, s ? z1 : z0, w, 0.12, 0.06, { color, texel: 1.5 });
      else kit.box("paintedMetal", s ? x1 : x0, ly - 0.06, (z0 + z1) / 2, 0.06, 0.12, d, { color, texel: 1.5 });
    }
    // deck
    kit.boxMM("metal", [x0 + 0.05, ly - 0.05, z0 + 0.05], [x1 - 0.05, ly - 0.02, z1 - 0.05], { color: PALETTE.gunmetal, texel: 2 });
  }
  // back cross bracing
  if (alongX) {
    for (let i = 0; i < nBays; i++) {
      const a = x0 + ((i + 0.5) / nBays) * len;
      const g = new THREE.BoxGeometry(0.04, Math.hypot(len / nBays, top - y) * 0.9, 0.04);
      kit.add("metal", g, { pos: [a, (y + top) / 2, z0 + 0.03], rot: [0, 0, Math.atan2(len / nBays, top - y) * (i % 2 ? 1 : -1)], color: PALETTE.steel });
    }
  }
  if (collide) kit.collider([x0 - 0.05, y, z0 - 0.05], [x1 + 0.05, top, z1 + 0.05], "shelf");
  return heights;
}

/** Workbench with a vice, tool clutter, an under-shelf and a lit task lamp. Faces +Z before yaw. */
export function workbench(kit, x, z, { yaw = 0, w = 2.4, y = 0, seed = 6, lamp = true } = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  const d = 0.9;
  add("metal", new THREE.BoxGeometry(w, 0.08, d), 0, 0.92, 0, { color: PALETTE.steel, texel: 1.5 });
  add("paintedMetal", new THREE.BoxGeometry(w, 0.1, d), 0, 0.83, 0, { color: PALETTE.impDark, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.08, 0.8, 0.08), sx * (w / 2 - 0.08), 0.4, sz * (d / 2 - 0.08), { color: PALETTE.impDark, texel: 2 });
  add("metal", new THREE.BoxGeometry(w - 0.2, 0.04, d - 0.2), 0, 0.3, 0, { color: PALETTE.gunmetal, texel: 2 });
  // drawers under one half
  add("paintedMetal", new THREE.BoxGeometry(w * 0.4, 0.44, d - 0.1), -w * 0.25, 0.56, 0, { color: PALETTE.impMid, texel: 2 });
  for (let i = 0; i < 2; i++) add("metal", new THREE.BoxGeometry(w * 0.25, 0.03, 0.03), -w * 0.25, 0.45 + i * 0.2, d / 2 - 0.03, { color: PALETTE.steel });
  // vice
  add("metal", new THREE.BoxGeometry(0.22, 0.16, 0.16), w / 2 - 0.35, 1.04, 0.1, { color: PALETTE.gunmetal });
  add("metal", new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), w / 2 - 0.35, 1.04, 0.3, { color: PALETTE.steel, rot: null });
  // clutter: parts, a datapad, small boxes
  const n = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const bx = (rand() - 0.5) * (w - 0.8);
    const bz = (rand() - 0.5) * (d - 0.4);
    const r = rand();
    if (r < 0.4) add("metal", new THREE.BoxGeometry(0.1 + rand() * 0.25, 0.04 + rand() * 0.1, 0.1 + rand() * 0.2), bx, 1.0, bz, { color: [PALETTE.steel, PALETTE.gunmetal, PALETTE.impRed][Math.floor(rand() * 3)] });
    else if (r < 0.7) add("rubber", new THREE.CylinderGeometry(0.03 + rand() * 0.05, 0.03 + rand() * 0.05, 0.12 + rand() * 0.2, 10), bx, 1.06, bz, { color: PALETTE.rubber });
    else add("impScreen4", new THREE.BoxGeometry(0.22, 0.015, 0.16), bx, 0.97, bz, { uv: "keep" });
  }
  // tool board behind the bench with hung tools
  add("paintedMetal", new THREE.BoxGeometry(w - 0.2, 0.9, 0.04), 0, 1.65, -d / 2 + 0.02, { color: PALETTE.impMid, texel: 2 });
  const nt = Math.floor((w - 0.4) / 0.22);
  for (let i = 0; i < nt; i++) {
    const tx = -w / 2 + 0.3 + i * 0.22;
    const th = 0.2 + rand() * 0.35;
    add("metal", new THREE.BoxGeometry(0.03, th, 0.03), tx, 1.95 - th / 2, -d / 2 + 0.06, { color: PALETTE.steel });
    if (rand() < 0.6) add("rubber", new THREE.BoxGeometry(0.06, 0.12, 0.04), tx, 1.95 - th - 0.06, -d / 2 + 0.06, { color: PALETTE.rubber });
  }
  if (lamp) {
    add("metal", new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), w / 2 - 0.15, 1.35, -d / 2 + 0.1, { color: PALETTE.steel });
    add("paintedMetal", new THREE.BoxGeometry(0.4, 0.06, 0.16), w / 2 - 0.35, 1.72, -d / 2 + 0.25, { color: PALETTE.impDark, texel: 2 });
    add("emitWhiteSoft", new THREE.BoxGeometry(0.34, 0.01, 0.1), w / 2 - 0.35, 1.685, -d / 2 + 0.25, { uv: "keep" });
  }
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (w * c + d * s) / 2;
  const ez = (w * s + d * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + 1.0, z + ez], "bench");
}

/**
 * Floor grating over a lit trench: recessed channel (dark walls, floor at -depth) with an emissive
 * strip along its bottom and a single grate quad on top. Walkable (the trench is covered).
 */
export function gratedTrench(kit, x0, z0, x1, z1, { depth = 0.55, emit = "emitAmber", y = 0 } = {}) {
  const w = x1 - x0;
  const d = z1 - z0;
  kit.boxMM("paintedMetal", [x0, y - depth - 0.05, z0], [x1, y - depth, z1], { color: PALETTE.impBlack, texel: 2 });
  // walls
  const t = 0.06;
  kit.boxMM("paintedMetal", [x0 - t, y - depth, z0 - t], [x1 + t, y - 0.02, z0], { color: PALETTE.impDark, texel: 2 });
  kit.boxMM("paintedMetal", [x0 - t, y - depth, z1], [x1 + t, y - 0.02, z1 + t], { color: PALETTE.impDark, texel: 2 });
  kit.boxMM("paintedMetal", [x0 - t, y - depth, z0], [x0, y - 0.02, z1], { color: PALETTE.impDark, texel: 2 });
  kit.boxMM("paintedMetal", [x1, y - depth, z0], [x1 + t, y - 0.02, z1], { color: PALETTE.impDark, texel: 2 });
  // pipes and a light strip at the bottom
  const alongX = w >= d;
  if (alongX) {
    kit.boxMM(emit, [x0 + 0.1, y - depth + 0.005, (z0 + z1) / 2 - 0.05], [x1 - 0.1, y - depth + 0.02, (z0 + z1) / 2 + 0.05], { uv: "keep" });
    kit.cyl("metal", (x0 + x1) / 2, y - depth + 0.12, z0 + 0.18, 0.06, w - 0.2, "x", { color: PALETTE.steel });
    kit.cyl("rubber", (x0 + x1) / 2, y - depth + 0.09, z1 - 0.18, 0.04, w - 0.2, "x", { color: PALETTE.rubber });
  } else {
    kit.boxMM(emit, [(x0 + x1) / 2 - 0.05, y - depth + 0.005, z0 + 0.1], [(x0 + x1) / 2 + 0.05, y - depth + 0.02, z1 - 0.1], { uv: "keep" });
    kit.cyl("metal", x0 + 0.18, y - depth + 0.12, (z0 + z1) / 2, 0.06, d - 0.2, "z", { color: PALETTE.steel });
  }
  // grate quad (cut-out texture, tiled in metres)
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(x0 + x1) / 2, y - 0.01, (z0 + z1) / 2], uv: "scale", uvScale: [w / GRATE_TILE[0], d / GRATE_TILE[1]] });
  // edge rails
  kit.boxMM("metal", [x0 - t, y - 0.03, z0 - t], [x1 + t, y, z0], { color: PALETTE.steel });
  kit.boxMM("metal", [x0 - t, y - 0.03, z1], [x1 + t, y, z1 + t], { color: PALETTE.steel });
  kit.boxMM("metal", [x0 - t, y - 0.03, z0], [x0, y, z1], { color: PALETTE.steel });
  kit.boxMM("metal", [x1, y - 0.03, z0], [x1 + t, y, z1], { color: PALETTE.steel });
}

/**
 * Bank of animated bar gauges: two InstancedMeshes (amber + blue) whose bar heights follow slow
 * noise. Positioned in a wall frame: `frame`, u centre, v base, n offset. Returns the meshes.
 */
export function barGauges(ctx, frame, u, v, n, { count = 10, w = 0.16, gap = 0.08, maxH = 1.2, blueEvery = 4 } = {}) {
  const geo = new THREE.BoxGeometry(w, 1, 0.03);
  geo.translate(0, 0.5, 0);
  const amber = new THREE.InstancedMesh(geo, ctx.materials.emitAmber, count);
  const blue = new THREE.InstancedMesh(geo.clone(), ctx.materials.emitBlue, count);
  amber.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  blue.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  amber.frustumCulled = false;
  blue.frustumCulled = false;
  const total = count * (w + gap) - gap;
  const m = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const seeds = [];
  const rand = rng(31);
  for (let i = 0; i < count; i++) seeds.push([rand() * 6, 0.4 + rand() * 0.6, rand() * 6]);
  const place = (i, h, mesh) => {
    const uu = u - total / 2 + w / 2 + i * (w + gap);
    const p = frame.pos(uu, v, n);
    m.compose(p, frame.q, new THREE.Vector3(1, Math.max(0.02, h), 1));
    mesh.setMatrixAt(i, m);
  };
  const update = (t) => {
    for (let i = 0; i < count; i++) {
      const [a, b, c] = seeds[i];
      const lvl = 0.45 + 0.28 * Math.sin(t * 0.6 * b + a) + 0.14 * Math.sin(t * 2.1 + c) + 0.08 * Math.sin(t * 5.3 + a * 2);
      const h = THREE.MathUtils.clamp(lvl, 0.06, 1) * maxH;
      const isBlue = i % blueEvery === blueEvery - 1;
      place(i, h, isBlue ? blue : amber);
      (isBlue ? amber : blue).setMatrixAt(i, zero);
    }
    amber.instanceMatrix.needsUpdate = true;
    blue.instanceMatrix.needsUpdate = true;
  };
  update(0);
  ctx.mesh(amber);
  ctx.mesh(blue);
  ctx.anim((dt, t) => update(t));
  // dark channel behind each bar + scale ticks
  for (let i = 0; i < count; i++) {
    const uu = u - total / 2 + w / 2 + i * (w + gap);
    frame.box("paintedMetal", uu, v + maxH / 2, n - 0.02, w + 0.04, maxH + 0.06, 0.02, { color: PALETTE.impBlack, texel: 2 });
    for (let k = 1; k < 5; k++) frame.box("metal", uu + w / 2 + 0.03, v + (k / 5) * maxH, n - 0.005, 0.03, 0.006, 0.01, { color: PALETTE.steel });
  }
  return { amber, blue };
}

/** Boxy Imperial loader vehicle (forklift-style): chassis, wheels, cab cage, mast with forks, beacon. */
export function loader(kit, ctx, x, z, { yaw = 0, seed = 8, color = PALETTE.impAmber, carry = null } = {}) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  // chassis (front is -Z local)
  add("paintedMetal", new THREE.BoxGeometry(1.5, 0.5, 2.4), 0, 0.55, 0.2, { color, texel: 1.5 });
  add("paintedMetal", new THREE.BoxGeometry(1.4, 0.3, 1.0), 0, 0.95, 0.8, { color: PALETTE.impDark, texel: 1.5 });
  add("hazard", new THREE.BoxGeometry(1.52, 0.1, 0.08), 0, 0.45, 1.42, { texel: 3 });
  // wheels
  for (const sx of [-1, 1]) for (const sz of [-0.8, 0.9]) {
    const g = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 16);
    g.rotateZ(Math.PI / 2);
    add("rubber", g, sx * 0.75, 0.34, sz, { color: PALETTE.rubber });
    add("metal", new THREE.CylinderGeometry(0.16, 0.16, 0.32, 12).rotateZ(Math.PI / 2), sx * 0.75, 0.34, sz, { color: PALETTE.steel });
  }
  // seat + controls + cage
  add("rubber", new THREE.BoxGeometry(0.6, 0.1, 0.5), 0, 0.85, 0.5, { color: PALETTE.rubber });
  add("rubber", new THREE.BoxGeometry(0.6, 0.6, 0.1), 0, 1.2, 0.8, { color: PALETTE.rubber });
  add("paintedMetal", new THREE.BoxGeometry(0.7, 0.3, 0.1), 0, 1.1, -0.1, { color: PALETTE.impDark, texel: 2 });
  add("impScreen1", new THREE.PlaneGeometry(0.4, 0.14), 0, 1.15, -0.04, { uv: "keep" });
  for (const sx of [-1, 1]) for (const sz of [-0.3, 1.1]) add("paintedMetal", new THREE.BoxGeometry(0.06, 1.5, 0.06), sx * 0.7, 1.55, sz, { color: PALETTE.impDark, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(1.5, 0.08, 1.5), 0, 2.32, 0.4, { color: PALETTE.impDark, texel: 2 });
  add("emitAmber", new THREE.CylinderGeometry(0.08, 0.1, 0.14, 10), 0.55, 2.43, 0.4);
  // mast + forks at the front
  for (const sx of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.1, 2.6, 0.14), sx * 0.45, 1.3, -1.05, { color: PALETTE.impMid, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(1.0, 0.1, 0.1), 0, 2.55, -1.05, { color: PALETTE.impMid, texel: 2 });
  const forkY = carry ? 0.3 : 0.1;
  add("metal", new THREE.BoxGeometry(1.0, 0.3, 0.08), 0, forkY + 0.3, -1.14, { color: PALETTE.gunmetal });
  for (const sx of [-1, 1]) add("metal", new THREE.BoxGeometry(0.12, 0.05, 1.1), sx * 0.3, forkY, -1.7, { color: PALETTE.steel });
  add("emitWhite", new THREE.BoxGeometry(0.16, 0.06, 0.02), -0.55, 0.75, -1.0);
  add("emitWhite", new THREE.BoxGeometry(0.16, 0.06, 0.02), 0.55, 0.75, -1.0);
  add("emitRed", new THREE.BoxGeometry(0.16, 0.06, 0.02), -0.55, 0.75, 1.42);
  add("emitRed", new THREE.BoxGeometry(0.16, 0.06, 0.02), 0.55, 0.75, 1.42);
  add("decal", new THREE.PlaneGeometry(0.3, 0.3), 0.55, 0.6, 1.43, { uv: "keep", uvRect: decalRect(14) });
  if (carry) {
    const p = local(0, forkY + 0.03, -1.75);
    carry(p.x, p.y, p.z, yaw);
  }
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (1.6 * c + 3.6 * s) / 2;
  const ez = (1.6 * s + 3.6 * c) / 2;
  const cc = local(0, 0, -0.3);
  kit.collider([cc.x - ex, 0, cc.z - ez], [cc.x + ex, 2.4, cc.z + ez], "loader");
}

/** Hand pallet jack (small, low). Faces -Z before yaw. */
export function palletJack(kit, x, z, yaw = 0) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  for (const sx of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.16, 0.08, 1.2), sx * 0.27, 0.1, -0.5, { color: PALETTE.impAmber, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(0.7, 0.3, 0.3), 0, 0.2, 0.25, { color: PALETTE.impAmber, texel: 2 });
  add("metal", new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), 0, 0.7, 0.42, { color: PALETTE.steel, rot: null });
  add("rubber", new THREE.BoxGeometry(0.4, 0.05, 0.05), 0, 1.15, 0.42, { color: PALETTE.rubber });
  kit.collider([x - 0.45, 0, z - 1.2], [x + 0.45, 0.4, z + 0.5], "jack");
}

/** Spot light helper (deck-local position + target). */
export function spotLight(color, intensity, distance, pos, target, { angle = 0.7, penumbra = 0.5, shadow = false } = {}) {
  const s = new THREE.SpotLight(color, intensity * 0.8, distance, angle, penumbra, 1.6);
  s.position.set(pos[0], pos[1], pos[2]);
  s.target.position.set(target[0], target[1], target[2]);
  if (shadow) {
    s.castShadow = true;
    s.shadow.mapSize.set(1024, 1024);
    s.shadow.camera.near = 0.5;
    s.shadow.camera.far = distance;
    s.shadow.bias = -0.0005;
    s.shadow.normalBias = 0.02;
  }
  return s;
}
