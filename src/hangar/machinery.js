// Hangar-deck machinery and props shared by the deck D rooms (hangar, fighterMaint, shuttleDock, cargo).
// Static props are merged into the room kit; moving machinery is built as its own meshes and returned as
// `{ object, update(dt), name }` entries for ctx.dynamic. Names double as audio hooks ("hangar.crane", ...).
import * as THREE from "three";
import { Kit, rng } from "../kit.js";
import { PALETTE } from "../materials.js";
import { decalRect, GRATE_TILE } from "../textures.js";
import { Frame, panelGrid, WALL_T, DOOR_H } from "../interior/lib.js";
import { doorOpening, DARK_PAINTS } from "../interior/shell.js";

const UP = new THREE.Vector3(0, 1, 0);
export const RAIL_H = 1.05;

// Frame for a free-standing prop: u = right, v = up, n = forward (yaw 0 faces +z).
export function propFrame(kit, cx, cy, cz, yaw = 0) {
  return new Frame(kit, new THREE.Vector3(cx, cy, cz), new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), UP);
}

// ---------------------------------------------------------------------------
// Railings, deck markings, walls
// ---------------------------------------------------------------------------
/** Straight axis-aligned railing from (ax,az) to (bx,bz) standing on y. Collider unless collide:false. */
export function railing(kit, ax, az, bx, bz, y, opts = {}) {
  const { h = RAIL_H, color = PALETTE.steel, postColor = PALETTE.gunmetal, postEvery = 2.0, kick = true, mid = true, collide = true, tag = "rail", mat = "metal" } = opts;
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return;
  const alongX = Math.abs(dx) >= Math.abs(dz);
  const cx = (ax + bx) / 2;
  const cz = (az + bz) / 2;
  const sx = alongX ? len : 0.05;
  const sz = alongX ? 0.05 : len;
  kit.box(mat, cx, y + h, cz, sx, 0.06, sz, { color, texel: 2 });
  if (mid) kit.box(mat, cx, y + h * 0.55, cz, alongX ? len : 0.035, 0.035, alongX ? 0.035 : len, { color, texel: 2 });
  if (kick) kit.box("satinBlack", cx, y + 0.07, cz, alongX ? len : 0.04, 0.14, alongX ? 0.04 : len);
  const n = Math.max(1, Math.round(len / postEvery));
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0.5 : i / n;
    kit.box(mat, ax + dx * t, y + h / 2, az + dz * t, 0.07, h, 0.07, { color: postColor, texel: 2 });
  }
  if (collide) kit.collider([Math.min(ax, bx) - 0.05, y, Math.min(az, bz) - 0.05], [Math.max(ax, bx) + 0.05, y + h + 0.05, Math.max(az, bz) + 0.05], tag);
}

/** Rectangular railing loop with optional open sides ("-x","+x","-z","+z") left out. */
export function railingRect(kit, x0, z0, x1, z1, y, opts = {}) {
  const { open = [] } = opts;
  if (!open.includes("-z")) railing(kit, x0, z0, x1, z0, y, opts);
  if (!open.includes("+z")) railing(kit, x0, z1, x1, z1, y, opts);
  if (!open.includes("-x")) railing(kit, x0, z0, x0, z1, y, opts);
  if (!open.includes("+x")) railing(kit, x1, z0, x1, z1, y, opts);
}

/** Flush emissive / paint strip lying on a deck at y (12 mm proud). */
export function deckStrip(kit, mat, x0, z0, x1, z1, y, opts = {}) {
  kit.boxMM(mat, [Math.min(x0, x1), y, Math.min(z0, z1)], [Math.max(x0, x1), y + 0.012, Math.max(z0, z1)], { uv: "keep", ...opts });
}

/** Hazard-striped band on a deck. */
export function hazardBand(kit, x0, z0, x1, z1, y, texel = 1.5) {
  kit.boxMM("hazard", [Math.min(x0, x1), y, Math.min(z0, z1)], [Math.max(x0, x1), y + 0.01, Math.max(z0, z1)], { uv: "world", texel });
}

/** Stencil decal lying flat on a deck (index into the decal sheet), size in metres, yaw in radians. */
export function deckDecal(kit, cx, y, cz, size, index, yaw = 0) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("decal", g, { pos: [cx, y + 0.02, cz], uv: "keep", uvRect: decalRect(index) });
}

/** Grate quad lying on a floor (x0..x1, z0..z1 at y). */
export function grateFloor(kit, x0, z0, x1, z1, y) {
  const w = x1 - x0;
  const d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], uv: "scale", uvScale: [w / GRATE_TILE[0], d / GRATE_TILE[1]] });
}

/** Vertical grate screen (safety mesh) between two points, from y0 to y1. */
export function grateScreen(kit, ax, az, bx, bz, y0, y1) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const g = new THREE.PlaneGeometry(len, y1 - y0);
  g.rotateY(Math.atan2(dx, dz) + Math.PI / 2);
  kit.add("grate", g, { pos: [(ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2], uv: "scale", uvScale: [len / GRATE_TILE[0], (y1 - y0) / GRATE_TILE[1]] });
}

/**
 * Upper wall band built from large plates (the human-scale panelGrid is far too dense for 15-38 m walls).
 * frame: wall frame (u along the wall, v up, n into the room). Columns every `colW`, rows `rows` (v cuts).
 */
export function bigWall(frame, length, rows, opts = {}) {
  const { colW = 4.2, seed = 3, depth = 0.16, paints = [PALETTE.gunmetal, PALETTE.gunmetal, PALETTE.darkMetal, PALETTE.slate], ribEvery = 2, lightRow = -1, tag = "bigwall" } = opts;
  const rand = rng(seed);
  const nCols = Math.max(1, Math.round(length / colW));
  const cw = length / nCols;
  const v0 = rows[0];
  const v1 = rows[rows.length - 1];
  // one continuous backing plate per wall band (cheap), then plate seams, ribs and features on top
  frame.box("paintedMetal", length / 2, (v0 + v1) / 2, -depth / 2, length, v1 - v0, depth, { color: PALETTE.darkMetal, texel: 0.5 });
  for (let r = 0; r < rows.length - 1; r++) {
    const ra = rows[r];
    const rb = rows[r + 1];
    const rh = rb - ra;
    for (let c = 0; c < nCols; c++) {
      const u0 = c * cw;
      const cu = u0 + cw / 2;
      const col = paints[Math.floor(rand() * paints.length)];
      const variant = Math.floor(rand() * 3);
      frame.box(variant === 0 ? "painted" : "painted" + variant, cu, (ra + rb) / 2, -0.03, cw - 0.08, rh - 0.08, 0.06, { color: col, uv: "world", texel: 0.35 });
      const f = rand();
      if (r === lightRow) {
        frame.box("satinBlack", cu, ra + rh * 0.5, 0.02, cw - 0.6, 0.3, 0.06);
        frame.box("emitWhiteSoft", cu, ra + rh * 0.5, 0.055, cw - 0.7, 0.16, 0.01, { uv: "keep" });
      } else if (f < 0.16 && rh > 2.5) {
        // big vent grille
        frame.box("metal", cu, (ra + rb) / 2, 0.0, cw * 0.6, rh * 0.5, 0.08, { color: PALETTE.gunmetal, texel: 1 });
        const slats = 5;
        for (let s = 0; s < slats; s++) frame.box("metal", cu, ra + rh * 0.3 + (s / (slats - 1)) * rh * 0.4, 0.05, cw * 0.54, 0.05, 0.05, { color: PALETTE.steel, tilt: 0.5 });
      } else if (f < 0.26) {
        // stencil decal
        const dw = Math.min(cw, rh) * 0.5;
        frame.add("decal", new THREE.PlaneGeometry(dw, dw), cu + (rand() - 0.5) * (cw - dw - 0.4), (ra + rb) / 2, 0.001, { uv: "keep", uvRect: decalRect(Math.floor(rand() * 16)) });
      } else if (f < 0.36) {
        // conduit pair
        frame.cylV("metal", cu - cw * 0.2, (ra + rb) / 2, 0.06, 0.09, rh - 0.2, { color: PALETTE.steel, segments: 8 });
        frame.cylV("metal", cu + cw * 0.2, (ra + rb) / 2, 0.06, 0.06, rh - 0.2, { color: PALETTE.gunmetal, segments: 8 });
      } else if (f < 0.44) {
        // raised access plate with a status lamp
        frame.box("paintedMetal", cu, (ra + rb) / 2, 0.02, cw * 0.5, rh * 0.5, 0.04, { color: PALETTE.slate, texel: 0.8 });
        frame.box(rand() < 0.5 ? "emitTeal" : "emitAmber", cu + cw * 0.18, ra + rh * 0.3, 0.045, 0.14, 0.06, 0.01);
      }
    }
    // horizontal seam band between rows
    if (r < rows.length - 2) frame.box("satinBlack", length / 2, rb, 0.0, length, 0.12, 0.05);
  }
  // pilasters
  for (let c = 0; c <= nCols; c += ribEvery) {
    const u = Math.min(length, c * cw);
    frame.box("paintedMetal", u, (v0 + v1) / 2, 0.12, 0.5, v1 - v0, 0.24, { color: PALETTE.gunmetal, texel: 0.6 });
  }
}

/**
 * Walls of a tall bay: a human-scale panelGrid band (with the spec door openings) up to `lower`, large
 * bigWall plates above it, one collider slab for the upper band and the black top trim. `shell` is the
 * roomShell result (its frames); doors must fit inside the lower band.
 */
export function bayWalls(kit, room, shell, y0, opts = {}) {
  const { lower = 6.4, panelW = 2.1, colW = 4.2, rows = null, lightRow = -1, seed = 41, paints = DARK_PAINTS, styles = { panel: 0.72, vent: 0.12, greeble: 0.08, strip: 0.08 } } = opts;
  const h = room.height;
  let upper = rows;
  if (!upper) {
    const n = Math.max(1, Math.round((h - lower) / 5.2));
    upper = Array.from({ length: n + 1 }, (_, i) => lower + ((h - lower) * i) / n);
  }
  let s = seed;
  for (const [dir, { frame, length }] of Object.entries(shell.frames)) {
    const ops = [];
    for (const door of room.doors || []) if (door[3] === dir) ops.push(doorOpening(room, door, y0, length, Math.min(h - 0.1, door[4] || DOOR_H)));
    panelGrid(frame, length, lower, { openings: ops, rows: [0, 0.45, 2.2, 4.4, lower], panelW, depth: WALL_T, seed: s++, kick: true, topPipes: false, styles, paints, tag: room.id + dir });
    bigWall(frame, length, upper, { colW, seed: s++, depth: WALL_T, lightRow, ribEvery: 2 });
    frame.collider(0, length, lower, h, -WALL_T, 0.02, room.id + dir);
    frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
  }
  return upper;
}

/** Simple straight stair with two handrails and a landing lip; axis "x" or "z", climbing from (x0,z0) toward (x1,z1). */
export function stairRun(kit, x0, z0, x1, z1, yA, yB, axis, opts = {}) {
  const { color = PALETTE.gunmetal, rails = true } = opts;
  kit.stairs("paintedMetal", x0, z0, x1, z1, yA, yB, axis, { color, steps: Math.max(2, Math.round(Math.abs(yB - yA) / 0.2)) });
  if (!rails) return;
  const rise = yB - yA;
  if (axis === "z") {
    const L = Math.hypot(z1 - z0, rise);
    const ang = -Math.atan2(rise, z1 - z0);
    for (const rx of [Math.min(x0, x1) + 0.06, Math.max(x0, x1) - 0.06]) {
      kit.add("metal", new THREE.BoxGeometry(0.05, 0.05, L), { pos: [rx, (yA + yB) / 2 + 0.95, (z0 + z1) / 2], rot: [ang, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [1, 4] });
      for (const [pz, py] of [[z0, yA], [z1, yB]]) kit.box("metal", rx, py + 0.5, pz + (pz === z0 ? Math.sign(z1 - z0) * 0.1 : -Math.sign(z1 - z0) * 0.1), 0.06, 1.0, 0.06, { color: PALETTE.gunmetal });
    }
    kit.collider([Math.min(x0, x1) - 0.03, Math.min(yA, yB), Math.min(z0, z1)], [Math.min(x0, x1) + 0.09, Math.max(yA, yB) + 1.1, Math.max(z0, z1)], "stairRail");
    kit.collider([Math.max(x0, x1) - 0.09, Math.min(yA, yB), Math.min(z0, z1)], [Math.max(x0, x1) + 0.03, Math.max(yA, yB) + 1.1, Math.max(z0, z1)], "stairRail");
  } else {
    const L = Math.hypot(x1 - x0, rise);
    const ang = Math.atan2(rise, x1 - x0);
    for (const rz of [Math.min(z0, z1) + 0.06, Math.max(z0, z1) - 0.06]) {
      kit.add("metal", new THREE.BoxGeometry(L, 0.05, 0.05), { pos: [(x0 + x1) / 2, (yA + yB) / 2 + 0.95, rz], rot: [0, 0, ang], color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
      for (const [px, py] of [[x0, yA], [x1, yB]]) kit.box("metal", px + (px === x0 ? Math.sign(x1 - x0) * 0.1 : -Math.sign(x1 - x0) * 0.1), py + 0.5, rz, 0.06, 1.0, 0.06, { color: PALETTE.gunmetal });
    }
    kit.collider([Math.min(x0, x1), Math.min(yA, yB), Math.min(z0, z1) - 0.03], [Math.max(x0, x1), Math.max(yA, yB) + 1.1, Math.min(z0, z1) + 0.09], "stairRail");
    kit.collider([Math.min(x0, x1), Math.min(yA, yB), Math.max(z0, z1) - 0.09], [Math.max(x0, x1), Math.max(yA, yB) + 1.1, Math.max(z0, z1) + 0.03], "stairRail");
  }
}

// ---------------------------------------------------------------------------
// Static props (built into the room kit through a prop frame)
// ---------------------------------------------------------------------------
const TONES = [PALETTE.impGrey, PALETTE.impGreyDark, PALETTE.slate];

/** Cargo container 2.4 x 2.4 x len, doors at the -n end. tone 0..2, opts.open swings one door. */
export function container(kit, f, len, tone = 0, seed = 1, opts = {}) {
  const { open = false, decal = 11, label = true } = opts;
  const rand = rng(seed);
  const col = TONES[tone % TONES.length];
  const h = 2.4;
  const w = 2.4;
  const pv = rand() < 0.5 ? "painted" : "painted1";
  f.box(pv, 0, h / 2, 0, w - 0.1, h - 0.1, len - 0.1, { color: col, uv: "world", texel: 0.6 });
  // corner posts and rails
  for (const su of [-1, 1]) for (const sn of [-1, 1]) f.box("metal", su * (w / 2 - 0.05), h / 2, sn * (len / 2 - 0.05), 0.1, h, 0.1, { color: PALETTE.darkMetal, texel: 2 });
  for (const sv of [0.05, h - 0.05]) for (const su of [-1, 1]) f.box("metal", su * (w / 2 - 0.05), sv, 0, 0.1, 0.1, len, { color: PALETTE.darkMetal, texel: 2 });
  // corrugation ribs on both long sides
  const ribs = Math.max(2, Math.floor(len / 0.8));
  for (let i = 0; i < ribs; i++) {
    const n = -len / 2 + 0.4 + (i / Math.max(1, ribs - 1)) * (len - 0.8);
    for (const su of [-1, 1]) f.box(pv, su * (w / 2 - 0.02), h / 2, n, 0.06, h - 0.4, 0.12, { color: col, uv: "world", texel: 0.6 });
  }
  // doors: two leaves with locking bars
  const doorN = -len / 2 + 0.05;
  if (open) {
    f.box(pv, -w / 4, h / 2, doorN - 0.03, w / 2 - 0.08, h - 0.2, 0.06, { color: col, uv: "world", texel: 0.6 });
    // swung leaf
    const leaf = new THREE.BoxGeometry(0.06, h - 0.2, w / 2 - 0.08);
    const p = f.pos(w / 2 - 0.05, h / 2, doorN - (w / 4 - 0.04));
    kit.add(pv, leaf, { pos: [p.x, p.y, p.z], quat: f.q, color: col, uv: "world", texel: 0.6 });
    // dark interior
    f.box("metal", w / 8, h / 2, 0.2, w / 2 - 0.1, h - 0.3, len - 0.5, { color: PALETTE.darkMetal, texel: 0.5 });
    f.box("painted", w / 8, 0.5, doorN + 0.6, 0.9, 0.7, 0.7, { color: PALETTE.impGrey, uv: "world", texel: 1 });
  } else {
    for (const su of [-1, 1]) {
      f.box(pv, su * w / 4, h / 2, doorN - 0.03, w / 2 - 0.08, h - 0.2, 0.06, { color: col, uv: "world", texel: 0.6 });
      f.cylV("metal", su * (w / 4 - 0.25), h / 2, doorN - 0.09, 0.03, h - 0.5, { color: PALETTE.steel, segments: 8 });
      f.box("metal", su * (w / 4 - 0.25), h * 0.45, doorN - 0.11, 0.2, 0.06, 0.05, { color: PALETTE.gunmetal });
    }
  }
  if (label) {
    const dg = new THREE.PlaneGeometry(0.9, 0.9);
    dg.rotateY(Math.PI);
    f.add("decal", dg, 0, h * 0.62, doorN - 0.065, { uv: "keep", uvRect: decalRect(decal) });
    // side stencil
    const sg = new THREE.PlaneGeometry(0.8, 0.8);
    sg.rotateY(Math.PI / 2);
    f.add("decal", sg, w / 2 + 0.001 + 0.02, h * 0.55, len * 0.2, { uv: "keep", uvRect: decalRect(rand() < 0.5 ? 14 : 0) });
  }
  f.collider(-w / 2, w / 2, 0, h, -len / 2, len / 2, "container");
}

/** Row of stacked containers along the frame's n axis: `cols` containers deep, `stack` high. */
export function containerStack(kit, f, len, cols, stack, seed, opts = {}) {
  const rand = rng(seed);
  const gap = 0.3;
  for (let c = 0; c < cols; c++) {
    for (let s = 0; s < stack; s++) {
      if (s > 0 && rand() < 0.25) continue;
      const n = (c - (cols - 1) / 2) * (len + gap);
      const sub = new Frame(kit, f.pos(0, s * 2.45, n), f.U, f.V);
      container(kit, sub, len, Math.floor(rand() * 3), seed * 31 + c * 7 + s, { open: opts.open && s === 0 && rand() < 0.3, decal: rand() < 0.6 ? 11 : rand() < 0.5 ? 0 : 14 });
    }
  }
}

/** Parts crate 1.2 x 0.8 x 0.8 with lid, edge frame and stencil. */
export function crate(kit, f, opts = {}) {
  const { w = 1.2, h = 0.8, d = 0.8, decal = 6, color = PALETTE.impGrey } = opts;
  f.box("painted1", 0, h / 2, 0, w, h - 0.05, d, { color, uv: "world", texel: 1 });
  f.box("metal", 0, h - 0.025, 0, w + 0.04, 0.05, d + 0.04, { color: PALETTE.darkMetal, texel: 2 });
  for (const su of [-1, 1]) f.box("metal", su * (w / 2), h / 2, 0, 0.05, h, d + 0.04, { color: PALETTE.darkMetal, texel: 2 });
  f.add("decal", new THREE.PlaneGeometry(h * 0.6, h * 0.6), 0, h * 0.5, d / 2 + 0.001, { uv: "keep", uvRect: decalRect(decal) });
  f.collider(-w / 2, w / 2, 0, h, -d / 2, d / 2, "crate");
}

/** Rolling tool cart: black chest with drawers, wheels, push handle, tools on top. */
export function toolCart(kit, f, opts = {}) {
  const { w = 1.1, h = 0.95, d = 0.6 } = opts;
  f.box("satinBlack", 0, 0.2 + h / 2, 0, w, h, d);
  for (let i = 0; i < 4; i++) {
    const v = 0.3 + i * (h - 0.2) / 4;
    f.box("painted", 0, v + (h - 0.2) / 8, d / 2 + 0.01, w - 0.1, (h - 0.2) / 4 - 0.04, 0.02, { color: PALETTE.orange, uv: "keep" });
    f.box("metal", 0, v + (h - 0.2) / 8, d / 2 + 0.03, 0.3, 0.03, 0.02, { color: PALETTE.steel });
  }
  f.box("rubber", 0, 0.2 + h + 0.02, 0, w + 0.05, 0.04, d + 0.05, { color: PALETTE.rubber });
  for (const su of [-1, 1]) for (const sn of [-1, 1]) f.cylU("rubber", su * (w / 2 - 0.12), 0.12, sn * (d / 2 - 0.1), 0.12, 0.08, { color: PALETTE.rubber, segments: 10 });
  f.cylU("metal", -w / 2 - 0.1, 0.2 + h + 0.05, 0, 0.02, 0.05, { color: PALETTE.steel, segments: 8 });
  f.cylV("metal", -w / 2 - 0.1, 0.2 + h * 0.7, 0, 0.02, h * 0.6, { color: PALETTE.steel, segments: 8 });
  f.box("metal", 0.2, 0.2 + h + 0.08, 0.1, 0.35, 0.08, 0.2, { color: PALETTE.gunmetal });
  f.box("metal", -0.25, 0.2 + h + 0.06, -0.1, 0.2, 0.04, 0.12, { color: PALETTE.steel });
  f.box("leds", -0.3, 0.2 + h * 0.5, d / 2 + 0.04, 0.08, 0.02, 0.005, { uv: "keep" });
  f.collider(-w / 2 - 0.15, w / 2, 0, h + 0.3, -d / 2, d / 2, "cart");
}

/** Fuel bowser: wheeled chassis, horizontal tank with hazard band, hose reel and a hose to a deck nozzle. */
export function fuelBowser(kit, f, opts = {}) {
  const { hoseTo = [2.2, 0.0, 2.6], color = PALETTE.impGreyDark } = opts;
  f.box("paintedMetal", 0, 0.5, 0, 1.7, 0.3, 3.4, { color: PALETTE.gunmetal, texel: 1 });
  for (const su of [-1, 1]) for (const sn of [-1.1, 1.1]) f.cylU("rubber", su * 0.9, 0.36, sn, 0.36, 0.28, { color: PALETTE.rubber, segments: 14 });
  f.cylN("painted2", 0, 1.55, 0, 0.85, 3.2, { color, segments: 18, uv: "world", texel: 0.5 });
  f.cylN("hazard", 0, 1.55, 0.9, 0.87, 0.35, { segments: 18, uv: "world", texel: 1 });
  f.cylN("hazard", 0, 1.55, -0.9, 0.87, 0.35, { segments: 18, uv: "world", texel: 1 });
  f.box("metal", 0, 2.45, 0, 0.5, 0.16, 1.6, { color: PALETTE.steel, texel: 1 });
  f.cylV("metal", 0, 2.6, 0.4, 0.12, 0.2, { color: PALETTE.gunmetal, segments: 10 });
  // control cabinet at the rear with a pump gauge screen
  f.box("satinBlack", 0.4, 1.1, -1.85, 0.8, 1.0, 0.35);
  f.box("screen6", 0.4, 1.3, -2.03, 0.5, 0.25, 0.01, { uv: "keep" });
  f.box("leds", 0.4, 0.95, -2.03, 0.5, 0.05, 0.01, { uv: "keep" });
  f.box("emitAmber", 0.4, 2.85, 0, 0.16, 0.14, 0.16);
  // hose reel
  f.add("metal", new THREE.TorusGeometry(0.42, 0.13, 8, 20), -0.5, 1.15, -1.9, { color: PALETTE.rubber, uv: "scale", uvScale: [4, 1] });
  f.cylN("metal", -0.5, 1.15, -1.9, 0.12, 0.4, { color: PALETTE.steel, segments: 10 });
  // hose: from the reel to a nozzle on the deck
  const p0 = f.pos(-0.5, 0.8, -2.15);
  const p1 = f.pos(-0.9, 0.25, -2.9);
  const p2 = f.pos(hoseTo[0] * 0.5 - 0.6, 0.08, hoseTo[2] * 0.5 - 2.9);
  const p3 = f.pos(hoseTo[0], 0.09, hoseTo[2]);
  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3], false, "catmullrom", 0.4);
  kit.add("rubber", new THREE.TubeGeometry(curve, 14, 0.06, 6, false), { color: PALETTE.rubber, uv: "scale", uvScale: [1, 8] });
  const nz = f.pos(hoseTo[0], 0.12, hoseTo[2]);
  kit.add("metal", new THREE.CylinderGeometry(0.06, 0.09, 0.5, 8), { pos: [nz.x, nz.y, nz.z], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [1, 1] });
  f.collider(-1.0, 1.0, 0, 2.9, -2.1, 1.75, "bowser");
}

/** Free-standing pedestal console: black desk, slanted screen, key strip. screenMat e.g. "screen4" / "screen6". */
export function pedestalConsole(kit, f, screenMat = "screen4", opts = {}) {
  const { w = 1.2, h = 1.05, d = 0.55 } = opts;
  f.box("satinBlack", 0, h / 2, 0, w, h, d);
  f.box("satinBlack", 0, h + 0.14, d * 0.05, w, 0.28, d * 0.9, { tilt: -0.5 });
  f.box(screenMat, 0, h + 0.16, d * 0.05 + 0.13, w - 0.12, 0.2, 0.01, { uv: "keep", tilt: -0.5 });
  f.box("leds", 0, h + 0.02, d / 2 + 0.005, w - 0.2, 0.05, 0.01, { uv: "keep" });
  f.box("metal", 0, 0.05, 0, w + 0.06, 0.1, d + 0.06, { color: PALETTE.darkMetal });
  f.collider(-w / 2, w / 2, 0, h + 0.3, -d / 2, d / 2 + 0.05, "console");
}

/** Tall equipment cabinet against a wall (frame facing into the room). */
export function cabinet(kit, f, opts = {}) {
  const { w = 1.2, h = 2.2, d = 0.6, screen = null, color = PALETTE.impGreyDark } = opts;
  f.box("painted1", 0, h / 2, 0, w, h, d, { color, uv: "world", texel: 1 });
  f.box("satinBlack", 0, h / 2, d / 2 + 0.005, w - 0.16, h - 0.16, 0.01);
  if (screen) f.box(screen, 0, h * 0.7, d / 2 + 0.015, w - 0.4, 0.3, 0.01, { uv: "keep" });
  f.box("leds", 0, h * 0.5, d / 2 + 0.015, w - 0.4, 0.05, 0.01, { uv: "keep" });
  for (let i = 0; i < 3; i++) f.box("metal", -w / 2 + 0.25 + i * 0.3, h * 0.3, d / 2 + 0.02, 0.18, 0.06, 0.02, { color: PALETTE.steel });
  f.box("emitTeal", w / 2 - 0.2, h * 0.9, d / 2 + 0.015, 0.06, 0.06, 0.01);
  f.collider(-w / 2, w / 2, 0, h, -d / 2, d / 2 + 0.05, "cabinet");
}

/** Ceiling light bank: black housing with a soft white diffuser facing down. */
export function lightBank(kit, cx, yCeil, cz, w, d, mat = "emitWhiteSoft") {
  kit.box("satinBlack", cx, yCeil - 0.18, cz, w + 0.3, 0.36, d + 0.3);
  kit.box(mat, cx, yCeil - 0.37, cz, w, 0.03, d, { uv: "keep" });
}

/** Pipe run along an axis with clamps every `clampEvery` metres. */
export function pipeRun(kit, x, y, z, len, axis, r, color, clampEvery = 6) {
  kit.cyl("metal", x, y, z, r, len, axis, { color, segments: 10 });
  const n = Math.floor(len / clampEvery);
  for (let i = 0; i <= n; i++) {
    const t = -len / 2 + (i / Math.max(1, n)) * len;
    const px = axis === "x" ? x + t : x;
    const pz = axis === "z" ? z + t : z;
    kit.box("metal", px, y, pz, axis === "x" ? 0.12 : r * 2.4, r * 2.4, axis === "z" ? 0.12 : r * 2.4, { color: PALETTE.darkMetal });
  }
}

/**
 * Switchback stair tower rising from yBottom to yTop. Footprint x0..x1 (two lanes) by z0..z1; the flight run
 * sits between two landings of depth `landing`. Deck-level entry is a doorway in the `entry` z face; with an
 * even flight count the top landing is at the entry end and exits sideways through the `exit` x face.
 */
export function stairTower(kit, o) {
  const { x0, x1, z0, z1, yBottom, yTop, entry = "-z", exit = "x1", landing = 1.5, color = PALETTE.gunmetal, tag = "stairTower", light = null } = o;
  const H = yTop - yBottom;
  const n = o.flights || Math.max(2, Math.round(H / 3));
  const rise = H / n;
  const xm = (x0 + x1) / 2;
  const zEntry = entry === "-z" ? z0 : z1;
  const zFar = entry === "-z" ? z1 : z0;
  const zA = entry === "-z" ? z0 + landing : z1 - landing;
  const zB = entry === "-z" ? z1 - landing : z0 + landing;
  const landEntry = entry === "-z" ? [z0, z0 + landing] : [z1 - landing, z1];
  const landFar = entry === "-z" ? [z1 - landing, z1] : [z0, z0 + landing];
  const exitX = exit === "x1" ? 1 : -1;
  const exitLane = exit === "x1" ? [xm, x1] : [x0, xm];
  const otherLane = exit === "x1" ? [x0, xm] : [xm, x1];
  for (let i = 0; i < n; i++) {
    // the last flight climbs in the exit-side lane so the top landing is entered from the flight, not across it
    const lane = (n - 1 - i) % 2 === 0 ? exitLane : otherLane;
    const yA = yBottom + rise * i;
    const yB = yA + rise;
    const fromZ = i % 2 === 0 ? zA : zB;
    const toZ = i % 2 === 0 ? zB : zA;
    kit.stairs("paintedMetal", lane[0] + 0.02, fromZ, lane[1] - 0.02, toZ, yA, yB, "z", { color, steps: Math.max(2, Math.round(rise / 0.2)) });
    // handrail along the flight's outer edges
    const L = Math.hypot(toZ - fromZ, rise);
    const ang = -Math.atan2(rise, toZ - fromZ);
    for (const rx of [lane[0] + 0.06, lane[1] - 0.06]) {
      kit.add("metal", new THREE.BoxGeometry(0.05, 0.05, L), { pos: [rx, (yA + yB) / 2 + 0.95, (fromZ + toZ) / 2], rot: [ang, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [1, 4] });
    }
    // landing slab at the top of this flight
    const lz = i % 2 === 0 ? landFar : landEntry;
    const isTop = i === n - 1;
    kit.boxMM("paintedMetal", [x0, yB - 0.25, lz[0]], [x1 + (isTop ? exitX * 0.14 : 0), yB, lz[1]], { color, texel: 1 });
    kit.boxMM("hazard", [x0 + 0.1, yB, lz[0] + 0.1], [x1 - 0.1, yB + 0.008, lz[1] - 0.1], { uv: "world", texel: 1.2 });
    kit.floor(Math.min(x0, x0 + exitX * 0.16), lz[0], Math.max(x1, x1 + exitX * 0.16), lz[1], yB);
  }
  // the top landing's other lane drops two flights: rail it off at the landing edge
  railing(kit, otherLane[0], zA, otherLane[1], zA, yTop, { postEvery: 1.4, kick: false, tag });
  // frame posts, header and safety screens
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) kit.boxMM("satinBlack", [px - 0.08, yBottom, pz - 0.08], [px + 0.08, yTop + 1.25, pz + 0.08]);
  kit.boxMM("satinBlack", [x0 - 0.08, yTop + 1.15, z0 - 0.08], [x1 + 0.08, yTop + 1.25, z1 + 0.08]);
  kit.boxMM("satinBlack", [x0 - 0.08, yBottom + 2.6, zEntry - 0.1], [x1 + 0.08, yBottom + 2.85, zEntry + 0.1]);
  const farRail = entry === "-z" ? [z0 + landing, z1] : [z0, z1 - landing];
  const exitFaceX = exit === "x1" ? x1 : x0;
  const otherX = exit === "x1" ? x0 : x1;
  grateScreen(kit, otherX, z0, otherX, z1, yBottom, yTop + 1.15);
  grateScreen(kit, exitFaceX, z0, exitFaceX, z1, yBottom, yTop - 0.02);
  grateScreen(kit, x0, zFar, x1, zFar, yBottom, yTop + 1.15);
  grateScreen(kit, x0, zEntry, x1, zEntry, yBottom + 2.85, yTop + 1.15);
  // top rails at the landing: exit face stays open on the entry-end landing only
  railing(kit, exitFaceX, farRail[0], exitFaceX, farRail[1], yTop, { collide: false, kick: false, postEvery: 1.8 });
  railing(kit, otherX, z0, otherX, z1, yTop, { collide: false, kick: false, postEvery: 1.8 });
  // entry doorway trim + hazard sill
  kit.boxMM("hazard", [x0, yBottom, zEntry - 0.3], [x1, yBottom + 0.008, zEntry + 0.3], { uv: "world", texel: 1.2 });
  // colliders: thin walls, open only at the deck door and the top exit
  const t = 0.05;
  kit.collider([otherX - t, yBottom, z0], [otherX + t, yTop + 1.2, z1], tag);
  kit.collider([exitFaceX - t, yBottom, z0], [exitFaceX + t, yTop - 0.06, z1], tag);
  kit.collider([exitFaceX - t, yTop - 0.06, farRail[0]], [exitFaceX + t, yTop + 1.2, farRail[1]], tag);
  kit.collider([x0, yBottom, zFar - t], [x1, yTop + 1.2, zFar + t], tag);
  kit.collider([x0, yBottom + 2.6, zEntry - t], [x1, yTop + 1.2, zEntry + t], tag);
  kit.collider([xm - 0.03, yBottom, Math.min(zA, zB)], [xm + 0.03, yTop + 1.2, Math.max(zA, zB)], tag);
  // centre divider rail so the two lanes read as separate flights
  kit.boxMM("metal", [xm - 0.03, yBottom, Math.min(zA, zB)], [xm + 0.03, yTop + 0.9, Math.max(zA, zB)], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  if (light) light(xm, yBottom + H * 0.5, (z0 + z1) / 2);
  return { top: yTop, exitZ: landEntry, exitX: exitFaceX };
}

// ---------------------------------------------------------------------------
// Kit-bashed TIE-style fighter shape (static, for the maintenance cradle). Matches src/hangar/tie.js:
// 2 m pod, twin pylons at x ±2.9, hexagonal 7.6 x 5.6 m wing panels at x ±4.1, faces -z.
// ---------------------------------------------------------------------------
const WING_H = 3.8;
const WING_D = 2.8;
function hexWingGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -WING_H);
  shape.lineTo(WING_D, -WING_H * 0.5);
  shape.lineTo(WING_D, WING_H * 0.5);
  shape.lineTo(0, WING_H);
  shape.lineTo(-WING_D, WING_H * 0.5);
  shape.lineTo(-WING_D, -WING_H * 0.5);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
  g.rotateY(Math.PI / 2); // panel lies in the y-z plane, normal along x
  return g;
}

/** Hexagonal wing panel with rim and spokes, centred at (cx,cy,cz), panel normal along x rotated by yaw about y. */
export function tieWing(kit, cx, cy, cz, yaw = 0) {
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const place = (mat, geo, lx, ly, lz, localRot, opts) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
    const qq = localRot ? q.clone().multiply(localRot) : q;
    kit.add(mat, geo, { pos: [cx + p.x, cy + p.y, cz + p.z], quat: qq, ...opts });
  };
  place("painted2", hexWingGeometry(), -0.07, 0, 0, null, { color: PALETTE.impBlack, uv: "world", texel: 0.5 });
  // rim: six boxes along the hexagon edges (vertices in the y-z plane)
  const verts = [[0, -WING_H], [-WING_D, -WING_H / 2], [-WING_D, WING_H / 2], [0, WING_H], [WING_D, WING_H / 2], [WING_D, -WING_H / 2]]; // [z, y]
  for (let i = 0; i < 6; i++) {
    const [z0, y0] = verts[i];
    const [z1, y1] = verts[(i + 1) % 6];
    const L = Math.hypot(z1 - z0, y1 - y0) + 0.2;
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan2(-(y1 - y0), z1 - z0));
    place("metal", new THREE.BoxGeometry(0.3, 0.3, L), 0, (y0 + y1) / 2, (z0 + z1) / 2, rot, { color: PALETTE.slate, uv: "scale", uvScale: [1, 3] });
  }
  for (const [dy, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.5, 0.5], [0.5, -0.5], [-0.5, 0.5], [-0.5, -0.5]]) {
    const len = Math.hypot(dy * WING_H, dz * WING_D);
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan2(dz * WING_D, dy * WING_H));
    place("metal", new THREE.BoxGeometry(0.2, len, 0.2), 0, (dy * WING_H) / 2, (dz * WING_D) / 2, rot, { color: PALETTE.slate, uv: "scale", uvScale: [1, 3] });
  }
  place("metal", new THREE.CylinderGeometry(0.7, 0.7, 0.36, 12), 0, 0, 0, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), { color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
}

/** Pod, pylons, collars and optionally each wing. wings: { left: bool (x-), right: bool (x+) }. */
export function tieShape(kit, cx, cy, cz, opts = {}) {
  const { wings = { left: true, right: true } } = opts;
  kit.add("paintedMetal", new THREE.SphereGeometry(2.0, 22, 14), { pos: [cx, cy, cz], color: PALETTE.impGrey, uv: "world", texel: 0.6 });
  kit.cyl("darkGloss", cx, cy, cz - 1.95, 1.1, 0.25, "z", { segments: 8 });
  kit.add("metal", new THREE.TorusGeometry(1.15, 0.09, 6, 8), { pos: [cx, cy, cz - 2.0], color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
  kit.add("metal", new THREE.TorusGeometry(0.9, 0.1, 6, 12), { pos: [cx, cy, cz + 1.95], color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
  for (const x of [-0.45, 0.45]) kit.cyl("emitRed", cx + x, cy - 0.3, cz + 2.05, 0.28, 0.04, "z", { segments: 12 });
  // top hatch ring
  kit.add("metal", new THREE.TorusGeometry(0.6, 0.07, 6, 16), { pos: [cx, cy + 1.96, cz], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
  for (const side of [-1, 1]) {
    kit.cyl("metal", cx + side * 2.9, cy, cz, 0.6, 2.2, "x", { color: PALETTE.slate, segments: 10 });
    kit.cyl("paintedMetal", cx + side * 3.9, cy, cz, 0.9, 0.5, "x", { color: PALETTE.impGrey, segments: 10 });
    const has = side < 0 ? wings.left : wings.right;
    if (has) tieWing(kit, cx + side * 4.1, cy, cz, 0);
    else {
      // bare hub: exposed mounting flange with bolts and a warning ring
      kit.cyl("metal", cx + side * 4.2, cy, cz, 0.75, 0.12, "x", { color: PALETTE.darkMetal, segments: 12 });
      kit.cyl("hazard", cx + side * 4.15, cy, cz, 0.92, 0.06, "x", { segments: 12, uv: "world", texel: 1 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        kit.cyl("metal", cx + side * 4.28, cy + Math.cos(a) * 0.55, cz + Math.sin(a) * 0.55, 0.06, 0.06, "x", { color: PALETTE.steel, segments: 6 });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Moving machinery (ctx.dynamic entries)
// ---------------------------------------------------------------------------
function buildGroup(mats, name, fn) {
  const g = new THREE.Group();
  g.name = name;
  const k = new Kit(mats);
  fn(k, g);
  k.build(g, { castShadow: true, receiveShadow: true });
  return g;
}

/**
 * Overhead gantry crane: a twin-girder bridge spanning x0..x1 on wall rails at y, travelling along z between
 * zMin and zMax; a trolley wanders along the bridge and a hoisted load hangs below.
 */
export function gantryCrane(ctx, mats, o) {
  const { x0, x1, y, zMin, zMax, trolleyRange = [-8, 8], hookDrop = 7, load = true, speed = 0.7, name = "hangar.crane" } = o;
  const span = x1 - x0;
  const cx = (x0 + x1) / 2;
  const bridge = buildGroup(mats, name + ".bridge", (k) => {
    for (const dz of [-1.3, 1.3]) k.box("paintedMetal", 0, 0, dz, span, 1.6, 0.8, { color: PALETTE.gunmetal, texel: 0.7 });
    for (let x = -span / 2 + 3; x < span / 2 - 2; x += 6) k.box("paintedMetal", x, 0.5, 0, 0.3, 0.5, 2.0, { color: PALETTE.darkMetal });
    k.box("hazard", 0, -0.6, -1.71, span - 2, 0.35, 0.02, { uv: "world", texel: 1.5 });
    k.box("hazard", 0, -0.6, 1.71, span - 2, 0.35, 0.02, { uv: "world", texel: 1.5 });
    for (const sx of [-1, 1]) {
      k.box("paintedMetal", sx * (span / 2 - 0.8), -0.4, 0, 1.6, 2.4, 3.8, { color: PALETTE.darkMetal, texel: 0.7 });
      k.box("emitAmber", sx * (span / 2 - 0.8), 1.1, 0, 0.5, 0.25, 0.5);
      k.box("emitRed", sx * (span / 2 - 1.6), -1.4, 1.95, 0.4, 0.15, 0.02);
    }
    k.box("satinBlack", 0, 0.9, 0, span - 4, 0.05, 2.4);
    k.box("emitWhiteSoft", 0, -0.82, 0, span - 6, 0.02, 0.6, { uv: "keep" });
  });
  const trolley = buildGroup(mats, name + ".trolley", (k) => {
    k.box("paintedMetal", 0, -1.4, 0, 3.2, 1.3, 3.4, { color: PALETTE.slate, texel: 1 });
    k.box("metal", 0, -2.3, 0, 1.6, 0.6, 1.6, { color: PALETTE.darkMetal });
    k.box("emitAmber", 1.4, -1.0, 1.72, 0.3, 0.2, 0.02);
    for (const dx of [-0.5, 0.5]) k.cyl("metal", dx, -2.6 - hookDrop / 2, 0, 0.04, hookDrop, "y", { color: PALETTE.steel, segments: 6 });
    k.box("metal", 0, -2.6 - hookDrop, 0, 1.4, 0.5, 0.7, { color: PALETTE.gunmetal });
    k.box("hazard", 0, -2.6 - hookDrop, 0, 1.42, 0.2, 0.72, { uv: "world", texel: 1.5 });
    if (load) {
      const f = new Frame(k, new THREE.Vector3(0, -2.6 - hookDrop - 0.3 - 2.4, 0), new THREE.Vector3(1, 0, 0), UP);
      container(k, f, 6, 1, 77, { label: true, decal: 11 });
      for (const [dx, dz] of [[-1.1, -2.9], [1.1, -2.9], [-1.1, 2.9], [1.1, 2.9]]) {
        const len = Math.hypot(dx, dz, 0.4);
        k.add("metal", new THREE.CylinderGeometry(0.025, 0.025, len, 5), { pos: [dx / 2, -2.6 - hookDrop - 0.35, dz / 2], rot: [Math.atan2(dz, 0.4) * 0.5, 0, -Math.atan2(dx, 0.4) * 0.5], color: PALETTE.steel, uv: "scale", uvScale: [1, 1] });
      }
    }
  });
  // colliders are not needed: the crane lives far above the walkable decks
  bridge.add(trolley);
  bridge.position.set(cx, y, (zMin + zMax) / 2);
  const state = { z: (zMin + zMax) / 2, dir: 1, pause: 4, tx: 0, tdir: 1 };
  const update = (dt) => {
    if (state.pause > 0) state.pause -= dt;
    else {
      state.z += state.dir * speed * dt;
      if (state.z > zMax) (state.z = zMax), (state.dir = -1), (state.pause = 6);
      if (state.z < zMin) (state.z = zMin), (state.dir = 1), (state.pause = 6);
    }
    state.tx += state.tdir * speed * 0.35 * dt;
    if (state.tx > trolleyRange[1]) (state.tx = trolleyRange[1]), (state.tdir = -1);
    if (state.tx < trolleyRange[0]) (state.tx = trolleyRange[0]), (state.tdir = 1);
    bridge.position.z = state.z;
    trolley.position.x = state.tx;
  };
  update(0);
  const entry = { object: bridge, update, name, state };
  ctx.dynamic.push(entry);
  return entry;
}

/**
 * Well blast-door leaves: two thick plates below the deck, stowed open with their edges just inside the well
 * throat. They creep closed by `travel` metres and back every `period` seconds (never reaching the fighters'
 * drop columns).
 */
export function blastLeaves(ctx, mats, o) {
  const { well, y, thickness = 0.9, protrude = 1.0, travel = 0.6, period = 34, name = "hangar.blastDoor" } = o;
  const len = well.z1 - well.z0 + 1.2;
  const halfW = (well.x1 - well.x0) / 2;
  const leafW = halfW + 0.6;
  const cz = (well.z0 + well.z1) / 2;
  const leaves = [];
  const group = new THREE.Group();
  group.name = name;
  for (const side of [-1, 1]) {
    const leaf = buildGroup(mats, name + (side < 0 ? ".port" : ".stbd"), (k) => {
      k.box("paintedMetal", 0, 0, 0, leafW, thickness, len, { color: PALETTE.darkMetal, texel: 0.5 });
      // inner edge: hazard band, tooth blocks and red edge lights
      const edge = -side * leafW / 2;
      k.box("hazard", edge + side * 0.01, 0, 0, 0.02, thickness - 0.1, len - 0.4, { uv: "world", texel: 1.2 });
      for (let z = -len / 2 + 2; z < len / 2 - 1; z += 4) {
        k.box("paintedMetal", edge + side * 0.6, thickness * 0.15, z, 1.2, thickness * 0.5, 1.2, { color: PALETTE.gunmetal });
        k.box("emitRed", edge - side * 0.02, -thickness * 0.2, z, 0.03, 0.12, 0.6);
      }
      // ribs on the underside face the void
      for (let x = -leafW / 2 + 2; x < leafW / 2; x += 4) k.box("paintedMetal", x, -thickness / 2 - 0.1, 0, 0.6, 0.2, len - 0.2, { color: PALETTE.gunmetal, texel: 0.5 });
    });
    const stowX = side * (halfW - protrude + leafW / 2);
    leaf.position.set(stowX, y, cz);
    leaf.userData.stowX = stowX;
    leaf.userData.side = side;
    group.add(leaf);
    leaves.push(leaf);
  }
  const state = { t: 0, open: 1 };
  const update = (dt) => {
    state.t += dt;
    const phase = state.t % period;
    // creep in over 5 s, hold 4 s, creep back over 5 s, then rest
    let k = 0;
    if (phase < 5) k = phase / 5;
    else if (phase < 9) k = 1;
    else if (phase < 14) k = 1 - (phase - 9) / 5;
    const e = k * k * (3 - 2 * k);
    state.open = 1 - e;
    for (const leaf of leaves) leaf.position.x = leaf.userData.stowX - leaf.userData.side * travel * e;
  };
  update(0);
  const entry = { object: group, update, name, state };
  ctx.dynamic.push(entry);
  return entry;
}

/**
 * Rotating amber beacons: one InstancedMesh of lenses that spin and pulse (shared cloned material), posts and
 * housings merged into the room kit. positions: [[x, yBase, z, postHeight], ...]
 */
export function beacons(kit, ctx, mats, positions, name = "hangar.beacons") {
  for (const [x, y, z, ph] of positions) {
    if (ph > 0) {
      kit.cyl("metal", x, y + ph / 2, z, 0.06, ph, "y", { color: PALETTE.gunmetal, segments: 8 });
      kit.cyl("metal", x, y + 0.05, z, 0.22, 0.1, "y", { color: PALETTE.darkMetal, segments: 10 });
    }
    kit.cyl("satinBlack", x, y + ph + 0.06, z, 0.24, 0.12, "y", { segments: 12 });
    kit.cyl("satinBlack", x, y + ph + 0.62, z, 0.2, 0.06, "y", { segments: 12 });
  }
  const mat = mats.emitAmber.clone();
  mat.emissiveIntensity = 2.5;
  const geo = new THREE.BoxGeometry(0.36, 0.42, 0.14);
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  mesh.name = name;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  const state = { t: 0 };
  const update = (dt) => {
    state.t += dt;
    for (let i = 0; i < positions.length; i++) {
      const [x, y, z, ph] = positions[i];
      q.setFromAxisAngle(UP, state.t * 3.2 + i * 1.3);
      p.set(x, y + ph + 0.35, z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mat.emissiveIntensity = 1.4 + 1.6 * Math.max(0, Math.sin(state.t * 3.2));
  };
  update(0);
  const entry = { object: mesh, update, name, state };
  ctx.dynamic.push(entry);
  return entry;
}

/**
 * Tractor-beam emitter array: ceiling projectors with blue lenses (kit) and faint additive beam cones toward
 * the well mouth (one merged mesh, pulsing opacity).
 */
export function tractorEmitters(kit, ctx, o) {
  const { positions, yCeil, yTarget, color = 0x66b6ff, radius = 3.2, name = "hangar.tractor" } = o;
  const cones = [];
  for (const [x, z] of positions) {
    kit.cyl("paintedMetal", x, yCeil - 0.8, z, 1.0, 1.6, "y", { color: PALETTE.gunmetal, segments: 16 });
    kit.cyl("paintedMetal", x, yCeil - 1.7, z, 0.7, 0.3, "y", { color: PALETTE.darkMetal, segments: 16 });
    kit.cyl("emitBlue", x, yCeil - 1.88, z, 0.62, 0.08, "y", { segments: 16 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      kit.box("metal", x + Math.cos(a) * 1.05, yCeil - 0.6, z + Math.sin(a) * 1.05, 0.25, 1.0, 0.25, { color: PALETTE.steel });
    }
    const h = yCeil - 1.9 - yTarget;
    const cone = new THREE.CylinderGeometry(0.5, radius, h, 20, 1, true);
    cone.translate(x, yTarget + h / 2, z);
    cones.push(cone);
  }
  // one merged, open, single-sided cone mesh; vertex colour fades the beam out toward the well mouth
  const merged = mergeGeos(cones, (y) => 0.15 + 0.85 * THREE.MathUtils.clamp((y - yTarget) / (yCeil - yTarget), 0, 1) ** 1.5);
  const mat = new THREE.MeshBasicMaterial({ color, vertexColors: true, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.name = name;
  mesh.renderOrder = 2;
  const state = { t: 0 };
  const update = (dt) => {
    state.t += dt;
    mat.opacity = 0.026 + 0.008 * Math.sin(state.t * 1.6) + 0.004 * Math.sin(state.t * 5.1);
  };
  const entry = { object: mesh, update, name, state };
  ctx.dynamic.push(entry);
  return entry;
}

function mergeGeos(geos, shade = null) {
  let total = 0;
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of parts) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  let off = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, off * 3);
    off += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  if (shade) {
    const col = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      const s = shade(pos[i * 3 + 1]);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = s;
    }
    out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  out.computeVertexNormals();
  return out;
}

/**
 * Cargo lift: an open platform on guide columns that rides between yLow and yHigh. The platform carries the
 * player (carry floor), its side rails move with it (colliders updated per frame). Static frame goes into the
 * room kit. openSides: platform sides without rails ("-z" etc.).
 */
export function cargoLift(kit, ctx, mats, o) {
  const { x0, x1, z0, z1, yLow, yHigh, period = 44, dwell = 9, phase = 0, openSides = ["-z", "+z"], name = "hangar.cargoLift", frameSide = "+z" } = o;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = x1 - x0;
  const d = z1 - z0;
  const H = yHigh - yLow;
  const alongX = frameSide === "+z" || frameSide === "-z";
  // guide columns + head beam on the frame side
  const colPos = frameSide === "+z" ? [[x0 + 0.3, z1 + 0.35], [x1 - 0.3, z1 + 0.35]] : frameSide === "-z" ? [[x0 + 0.3, z0 - 0.35], [x1 - 0.3, z0 - 0.35]] : frameSide === "+x" ? [[x1 + 0.35, z0 + 0.3], [x1 + 0.35, z1 - 0.3]] : [[x0 - 0.35, z0 + 0.3], [x0 - 0.35, z1 - 0.3]];
  for (const [px, pz] of colPos) {
    kit.boxMM("paintedMetal", [px - 0.3, yLow, pz - 0.3], [px + 0.3, yHigh + 2.6, pz + 0.3], { color: PALETTE.gunmetal, uv: "world", texel: 0.6 });
    kit.boxMM("metal", [px - 0.06, yLow, pz - 0.36], [px + 0.06, yHigh + 2.4, pz - 0.28], { color: PALETTE.steel, uv: "world", texel: 1 });
    kit.collider([px - 0.3, yLow, pz - 0.3], [px + 0.3, yHigh + 2.6, pz + 0.3], name);
    const inward = frameSide === "+z" ? [0, -0.31] : frameSide === "-z" ? [0, 0.31] : frameSide === "+x" ? [-0.31, 0] : [0.31, 0];
    for (let y = yLow + 1.5; y < yHigh + 2; y += 3) kit.box("emitAmber", px + inward[0], y, pz + inward[1], alongX ? 0.3 : 0.02, 0.06, alongX ? 0.02 : 0.3);
  }
  const hb = alongX ? [[x0, yHigh + 2.6, colPos[0][1] - 0.4], [x1, yHigh + 3.2, colPos[0][1] + 0.4]] : [[colPos[0][0] - 0.4, yHigh + 2.6, z0], [colPos[0][0] + 0.4, yHigh + 3.2, z1]];
  kit.boxMM("paintedMetal", hb[0], hb[1], { color: PALETTE.gunmetal, texel: 0.6 });
  kit.boxMM("hazard", [x0 - 0.3, yLow, z0 - 0.3], [x1 + 0.3, yLow + 0.008, z1 + 0.3], { uv: "world", texel: 1.2 });
  kit.boxMM("deck", [x0 - 0.05, yLow - 0.02, z0 - 0.05], [x1 + 0.05, yLow + 0.006, z1 + 0.05], { color: PALETTE.impBlack, uv: "world", texel: 1 });

  const plat = buildGroup(mats, name, (k) => {
    k.boxMM("paintedMetal", [-w / 2, -0.3, -d / 2], [w / 2, 0, d / 2], { color: PALETTE.gunmetal, uv: "world", texel: 1 });
    k.boxMM("deck", [-w / 2 + 0.05, 0, -d / 2 + 0.05], [w / 2 - 0.05, 0.02, d / 2 - 0.05], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    k.boxMM("hazard", [-w / 2, 0.02, -d / 2], [w / 2, 0.03, -d / 2 + 0.3], { uv: "world", texel: 1.5 });
    k.boxMM("hazard", [-w / 2, 0.02, d / 2 - 0.3], [w / 2, 0.03, d / 2], { uv: "world", texel: 1.5 });
    k.boxMM("hazard", [-w / 2, -0.3, -d / 2 - 0.01], [w / 2, 0, -d / 2], { uv: "world", texel: 1.5 });
    k.boxMM("hazard", [-w / 2, -0.3, d / 2], [w / 2, 0, d / 2 + 0.01], { uv: "world", texel: 1.5 });
    for (const side of ["-x", "+x", "-z", "+z"]) {
      if (openSides.includes(side)) continue;
      if (side === "-x") railing(k, -w / 2 + 0.1, -d / 2 + 0.1, -w / 2 + 0.1, d / 2 - 0.1, 0.02, { collide: false });
      if (side === "+x") railing(k, w / 2 - 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1, 0.02, { collide: false });
      if (side === "-z") railing(k, -w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, -d / 2 + 0.1, 0.02, { collide: false });
      if (side === "+z") railing(k, -w / 2 + 0.1, d / 2 - 0.1, w / 2 - 0.1, d / 2 - 0.1, 0.02, { collide: false });
    }
    // guide shoes toward the columns
    for (const [px, pz] of colPos) k.box("metal", px - cx, 0.4, pz - cz + (frameSide === "+z" ? -0.45 : frameSide === "-z" ? 0.45 : 0), 0.5, 1.0, 0.3, { color: PALETTE.darkMetal });
    k.box("satinBlack", alongX ? -w / 2 + 0.5 : 0, 1.0, alongX ? d / 2 - 0.2 : -d / 2 + 0.5, 0.3, 1.2, 0.2);
    k.box("emitAmber", alongX ? -w / 2 + 0.5 : 0, 1.4, alongX ? d / 2 - 0.31 : -d / 2 + 0.5, 0.15, 0.1, 0.02);
  });
  plat.position.set(cx, yLow, cz);
  // moving rails: colliders follow the platform
  const rails = [];
  const pushRail = (min, max) => {
    const c = kit.collider(min, max, name + ".rail");
    rails.push({ c, h0: min[1] - yLow, h1: max[1] - yLow });
  };
  if (!openSides.includes("-x")) pushRail([x0, yLow, z0], [x0 + 0.2, yLow + 1.2, z1]);
  if (!openSides.includes("+x")) pushRail([x1 - 0.2, yLow, z0], [x1, yLow + 1.2, z1]);
  if (!openSides.includes("-z")) pushRail([x0, yLow, z0], [x1, yLow + 1.2, z0 + 0.2]);
  if (!openSides.includes("+z")) pushRail([x0, yLow, z1 - 0.2], [x1, yLow + 1.2, z1]);
  const state = { t: phase, y: yLow };
  const floor = kit.floor(x0, z0, x1, z1, yLow, { carry: true });
  Object.defineProperty(floor, "y", { get: () => state.y + 0.02, enumerable: true });
  const update = (dt) => {
    state.t = (state.t + dt) % period;
    const travel = period / 2 - dwell;
    let k;
    if (state.t < dwell) k = 0;
    else if (state.t < dwell + travel) k = (state.t - dwell) / travel;
    else if (state.t < period / 2 + dwell) k = 1;
    else k = 1 - (state.t - period / 2 - dwell) / travel;
    const e = k * k * (3 - 2 * k);
    state.y = yLow + H * e;
    plat.position.y = state.y;
    for (const r of rails) {
      r.c.min.y = state.y + r.h0;
      r.c.max.y = state.y + r.h1;
    }
  };
  update(0);
  const entry = { object: plat, update, name, state, floor };
  ctx.dynamic.push(entry);
  return entry;
}

/** Overhead hoist trolley travelling along an x-axis rail with a hanging hook (fighterMaint / cargo). */
export function hoist(ctx, mats, o) {
  const { x0, x1, y, z, drop = 3, speed = 0.4, name = "hangar.hoist" } = o;
  const trolley = buildGroup(mats, name, (k) => {
    k.box("paintedMetal", 0, -0.35, 0, 1.4, 0.7, 1.0, { color: PALETTE.slate, texel: 1 });
    k.box("emitAmber", 0.55, -0.3, 0.51, 0.2, 0.12, 0.02);
    k.cyl("metal", 0, -0.7 - drop / 2, 0, 0.03, drop, "y", { color: PALETTE.steel, segments: 6 });
    k.box("metal", 0, -0.7 - drop, 0, 0.5, 0.35, 0.3, { color: PALETTE.gunmetal });
    k.add("metal", new THREE.TorusGeometry(0.22, 0.05, 6, 12), { pos: [0, -0.7 - drop - 0.4, 0], rot: [0, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
  });
  const state = { x: (x0 + x1) / 2, dir: 1, pause: 3 };
  trolley.position.set(state.x, y, z);
  const update = (dt) => {
    if (state.pause > 0) state.pause -= dt;
    else {
      state.x += state.dir * speed * dt;
      if (state.x > x1) (state.x = x1), (state.dir = -1), (state.pause = 5);
      if (state.x < x0) (state.x = x0), (state.dir = 1), (state.pause = 5);
    }
    trolley.position.x = state.x;
  };
  const entry = { object: trolley, update, name, state };
  ctx.dynamic.push(entry);
  return entry;
}

/** Slowly pulsing emissive strip material clone (status lights that "breathe"). Returns { material, update }. */
export function pulsingMaterial(ctx, base, { min = 0.8, max = 2.4, rate = 1.2, name = "hangar.pulse" } = {}) {
  const material = base.clone();
  const state = { t: 0 };
  const update = (dt) => {
    state.t += dt;
    material.emissiveIntensity = min + (max - min) * (0.5 + 0.5 * Math.sin(state.t * rate));
  };
  ctx.dynamic.push({ object: null, update, name, state });
  return { material, update };
}
