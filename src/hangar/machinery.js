// Hangar-deck machinery and props shared by the deck D rooms (hangar, fighterMaint, shuttleDock, cargo).
// Static props are merged into the room kit; moving machinery is built as its own meshes and returned as
// `{ object, update(dt), name }` entries for ctx.dynamic. Names double as audio hooks ("hangar.crane", ...).
import * as THREE from "three";
import { Kit, rng } from "../kit.js";
import { PALETTE } from "../materials.js";
import { decalRect, GRATE_TILE, makeCanvas, toTexture } from "../textures.js";
import { Frame, panelGrid, WALL_T, DOOR_H } from "../interior/lib.js";
import { doorOpening, DARK_PAINTS } from "../interior/shell.js";

const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
export const RAIL_H = 1.05;
// Black trim / housings. darkGloss is in every room anyway (panelGrid hatch handles), so using it for all
// black trim keeps satinBlack out of the fighter maintenance, shuttle dock and cargo kits (one draw call each).
export const BLACK = "darkGloss";

// Frame for a free-standing prop: u = right, v = up, n = forward (yaw 0 faces +z).
export function propFrame(kit, cx, cy, cz, yaw = 0) {
  return new Frame(kit, new THREE.Vector3(cx, cy, cz), new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), UP);
}

// ---------------------------------------------------------------------------
// Deck D signage: one stencil sheet of wide labels (bay names, rack numbers, warnings) in a material of its
// own, `hangarLabel`, registered on the shared material set by the first deck D room that needs it. Wide
// text does not fit the square cells of the generic decal sheet.
// ---------------------------------------------------------------------------
export const LABELS = [
  "DECK D · HANGAR", "FIGHTER MAINT · BAY 2", "SHUTTLE DOCK · BAY 3", "CARGO · BAY 4",
  "LAUNCH LANE", "RECOVERY LANE", "FLIGHT CONTROL", "READY ROOM",
  "RACK 01", "RACK 02", "RACK 03", "RACK 04", "RACK 05", "RACK 06", "RACK 07", "RACK 08",
  "DANGER · OPEN WELL", "BLAST DOOR · KEEP CLEAR", "FUEL · NO IGNITION", "TRAFFIC CONTROL",
];
const LABEL_COLS = 2;
const LABEL_ROWS = 10;
export const LABEL_ASPECT = 5; // width / height of one label cell

/** uv rect [u0, v0, u1, v1] of label `i` on the sheet. */
export function labelRect(i) {
  const c = i % LABEL_COLS;
  const r = Math.floor(i / LABEL_COLS);
  return [c / LABEL_COLS, 1 - (r + 1) / LABEL_ROWS, (c + 1) / LABEL_COLS, 1 - r / LABEL_ROWS];
}

function makeLabelSheet(size = 1024) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const cw = size / LABEL_COLS;
  const ch = size / LABEL_ROWS;
  ctx.clearRect(0, 0, size, size);
  LABELS.forEach((s, i) => {
    const x0 = (i % LABEL_COLS) * cw;
    const y0 = Math.floor(i / LABEL_COLS) * ch;
    const danger = /DANGER|BLAST/.test(s);
    const fuel = /FUEL/.test(s);
    const color = danger ? "#d8452f" : fuel ? "#ffb347" : "#d8dbe0";
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeRect(x0 + 14, y0 + 12, cw - 28, ch - 24);
    if (danger) {
      // hazard tick marks at both ends of a warning plate
      ctx.fillStyle = color;
      for (let k = 0; k < 3; k++) {
        ctx.fillRect(x0 + 30 + k * 18, y0 + 26, 8, ch - 52);
        ctx.fillRect(x0 + cw - 38 - k * 18, y0 + 26, 8, ch - 52);
      }
    }
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(ch * 0.5)}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s, x0 + cw / 2, y0 + ch / 2 + 2, cw - 120);
  });
  return toTexture(c, { srgb: true, wrap: false });
}

/** Make sure the shared material set carries the deck D label material (idempotent). */
export function ensureLabels(mats) {
  if (mats.hangarLabel) return mats.hangarLabel;
  const map = makeLabelSheet();
  mats.hangarLabel = new THREE.MeshStandardMaterial({
    map,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: map,
    emissiveIntensity: 0.22,
    transparent: true,
    depthWrite: false,
    roughness: 0.7,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    envMapIntensity: 0.3,
  });
  return mats.hangarLabel;
}

/** Wall label on a frame: width w (height w / LABEL_ASPECT), centred at (u, v), a hair off the surface. */
export function frameLabel(frame, u, v, w, index, n = 0.012) {
  frame.add("hangarLabel", new THREE.PlaneGeometry(w, w / LABEL_ASPECT), u, v, n, { uv: "keep", uvRect: labelRect(index) });
}

/** Free-standing label plane facing +z rotated by yaw about y, centred at (x, y, z). */
export function label(kit, x, y, z, w, index, yaw = 0) {
  const g = new THREE.PlaneGeometry(w, w / LABEL_ASPECT);
  g.rotateY(yaw);
  kit.add("hangarLabel", g, { pos: [x, y, z], uv: "keep", uvRect: labelRect(index) });
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
  if (kick) kit.box(BLACK, cx, y + 0.07, cz, alongX ? len : 0.04, 0.14, alongX ? 0.04 : len);
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
  const { colW = 4.2, seed = 3, depth = 0.16, paints = [PALETTE.gunmetal, PALETTE.gunmetal, PALETTE.darkMetal, PALETTE.slate], ribEvery = 2, lightRow = -1, lampMat = "emitAmber", lightMat = "emitWhiteSoft", openings = [] } = opts;
  const rand = rng(seed);
  const nCols = Math.max(1, Math.round(length / colW));
  const cw = length / nCols;
  const v0 = rows[0];
  const v1 = rows[rows.length - 1];
  const hits = (u0, u1, va, vb) => openings.some((o) => u1 > o.u0 + 1e-3 && u0 < o.u1 - 1e-3 && vb > o.v0 + 1e-3 && va < o.v1 - 1e-3);
  // u-spans of a band not covered by an opening that reaches into it
  const spans = (va, vb) => {
    let out = [[0, length]];
    for (const o of openings) {
      if (!(vb > o.v0 + 1e-3 && va < o.v1 - 1e-3)) continue;
      const next = [];
      for (const [a, b] of out) {
        if (o.u1 <= a || o.u0 >= b) next.push([a, b]);
        else {
          if (o.u0 > a) next.push([a, o.u0]);
          if (o.u1 < b) next.push([o.u1, b]);
        }
      }
      out = next;
    }
    return out.filter(([a, b]) => b - a > 0.02);
  };
  for (let r = 0; r < rows.length - 1; r++) {
    const ra = rows[r];
    const rb = rows[r + 1];
    const rh = rb - ra;
    // backing plate for the band (split around door openings), then plates and features on top
    for (const [a, b] of spans(ra, rb)) frame.box("paintedMetal", (a + b) / 2, (ra + rb) / 2, -depth / 2, b - a, rh, depth, { color: PALETTE.darkMetal, texel: 0.5 });
    for (let c = 0; c < nCols; c++) {
      const u0 = c * cw;
      const cu = u0 + cw / 2;
      const col = paints[Math.floor(rand() * paints.length)];
      const variant = Math.floor(rand() * 3);
      const f = rand();
      if (hits(u0, u0 + cw, ra, rb)) continue;
      frame.box(variant === 0 ? "painted" : "painted" + variant, cu, (ra + rb) / 2, -0.03, cw - 0.08, rh - 0.08, 0.06, { color: col, uv: "world", texel: 0.35 });
      if (r === lightRow) {
        frame.box(BLACK, cu, ra + rh * 0.5, 0.02, cw - 0.6, 0.3, 0.06);
        frame.box(lightMat, cu, ra + rh * 0.5, 0.055, cw - 0.7, 0.16, 0.01, { uv: "keep" });
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
        frame.box(lampMat, cu + cw * 0.18, ra + rh * 0.3, 0.045, 0.14, 0.06, 0.01);
      }
    }
    // horizontal seam band between rows
    if (r < rows.length - 2) for (const [a, b] of spans(rb - 0.06, rb + 0.06)) frame.box(BLACK, (a + b) / 2, rb, 0.0, b - a, 0.12, 0.05);
  }
  // pilasters (none through a door opening)
  for (let c = 0; c <= nCols; c += ribEvery) {
    const u = Math.min(length, c * cw);
    if (hits(u - 0.3, u + 0.3, v0, v1)) continue;
    frame.box("paintedMetal", u, (v0 + v1) / 2, 0.12, 0.5, v1 - v0, 0.24, { color: PALETTE.gunmetal, texel: 0.6 });
  }
}

/**
 * Walls of a tall bay: a human-scale panelGrid band (with the spec door openings) up to `lower`, large
 * bigWall plates above it, one collider slab for the upper band and the black top trim. `shell` is the
 * roomShell result (its frames); doors must fit inside the lower band.
 */
export function bayWalls(kit, room, shell, y0, opts = {}) {
  // Two bands: a 2.4 m human-scale panelGrid band (2 rows, wide panels; only the panel / vent styles so the
  // walls add no materials beyond the paints, metal and decals the room has anyway) and large plates above.
  // The blast-door openings (5-6 m) cut through both bands. Wall cost drives the whole zone's triangle count
  // because every deck D room is rendered from every other one, so this stays deliberately lean.
  const { lower = 2.4, panelW = 2.4, colW = 4.2, rows = null, lightRow = -1, seed = 41, paints = DARK_PAINTS, styles = { panel: 0.82, vent: 0.18 }, kick = true, lampMat = "emitAmber", lightMat = "emitWhiteSoft", firstUpper = 3.0 } = opts;
  const h = room.height;
  let upper = rows;
  if (!upper) {
    const a = lower + firstUpper;
    const n = Math.max(1, Math.round((h - a) / 5.2));
    upper = [lower, ...Array.from({ length: n }, (_, i) => a + ((h - a) * (i + 1)) / n)];
  }
  let s = seed;
  for (const [dir, { frame, length }] of Object.entries(shell.frames)) {
    const ops = [];
    for (const door of room.doors || []) if (door[3] === dir) ops.push(doorOpening(room, door, y0, length, Math.min(h - 0.1, door[4] || DOOR_H)));
    panelGrid(frame, length, lower, { openings: ops, rows: [0, 0.45, lower], panelW, depth: WALL_T, seed: s++, kick, topPipes: false, styles, paints, tag: room.id + dir });
    bigWall(frame, length, upper, { colW, seed: s++, depth: WALL_T, lightRow, ribEvery: 2, lampMat, lightMat, openings: ops });
    frame.collider(0, length, lower, h, -WALL_T, 0.02, room.id + dir);
    frame.box(BLACK, length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
  }
  return upper;
}

/**
 * Bay ceiling for the side rooms (use with roomShell ceiling: false): gunmetal plate, deep ribs across the
 * short axis and `rows` recessed light channels along the long axis. Same layout as the roomShell ceiling
 * but with the channel housings in BLACK, so the room does not pick up satinBlack for four boxes.
 */
export function bayCeiling(kit, room, y0, opts = {}) {
  const { rows = 3, lightMat = "emitWhiteSoft", ribStep = 3.2, ribDepth = 0.4, depth = WALL_T } = opts;
  const { x0, x1, z0, z1 } = room;
  const yTop = y0 + room.height;
  const w = x1 - x0;
  const d = z1 - z0;
  kit.boxMM("paintedMetal", [x0 - depth, yTop, z0 - depth], [x1 + depth, yTop + 0.12, z1 + depth], { color: PALETTE.gunmetal, uv: "world", texel: 0.7 });
  const longX = w >= d;
  const ribCount = Math.max(1, Math.floor((longX ? w : d) / ribStep));
  for (let i = 1; i < ribCount; i++) {
    const t = i / ribCount;
    if (longX) kit.box("paintedMetal", x0 + w * t, yTop - ribDepth / 2, (z0 + z1) / 2, 0.18, ribDepth, d, { color: PALETTE.darkMetal, texel: 1.2 });
    else kit.box("paintedMetal", (x0 + x1) / 2, yTop - ribDepth / 2, z0 + d * t, w, ribDepth, 0.18, { color: PALETTE.darkMetal, texel: 1.2 });
  }
  for (let r = 0; r < rows; r++) {
    const t = (r + 0.5) / rows;
    const len = (longX ? w : d) - 1.2;
    if (longX) {
      const z = z0 + d * t;
      kit.box(BLACK, (x0 + x1) / 2, yTop - 0.05, z, len + 0.16, 0.1, 0.4);
      kit.box(lightMat, (x0 + x1) / 2, yTop - 0.105, z, len, 0.02, 0.26, { uv: "keep" });
    } else {
      const x = x0 + w * t;
      kit.box(BLACK, x, yTop - 0.05, (z0 + z1) / 2, 0.4, 0.1, len + 0.16);
      kit.box(lightMat, x, yTop - 0.105, (z0 + z1) / 2, 0.26, 0.02, len, { uv: "keep" });
    }
  }
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
  const { w = 1.1, h = 0.95, d = 0.6, lamp = "emitAmber" } = opts;
  f.box(BLACK, 0, 0.2 + h / 2, 0, w, h, d);
  for (let i = 0; i < 4; i++) {
    const v = 0.3 + i * (h - 0.2) / 4;
    f.box("painted", 0, v + (h - 0.2) / 8, d / 2 + 0.01, w - 0.1, (h - 0.2) / 4 - 0.04, 0.02, { color: PALETTE.orange, uv: "keep" });
    f.box("metal", 0, v + (h - 0.2) / 8, d / 2 + 0.03, 0.3, 0.03, 0.02, { color: PALETTE.steel });
  }
  f.box(BLACK, 0, 0.2 + h + 0.02, 0, w + 0.05, 0.04, d + 0.05);
  for (const su of [-1, 1]) for (const sn of [-1, 1]) f.cylU(BLACK, su * (w / 2 - 0.12), 0.12, sn * (d / 2 - 0.1), 0.12, 0.08, { segments: 10 });
  f.cylU("metal", -w / 2 - 0.1, 0.2 + h + 0.05, 0, 0.02, 0.05, { color: PALETTE.steel, segments: 8 });
  f.cylV("metal", -w / 2 - 0.1, 0.2 + h * 0.7, 0, 0.02, h * 0.6, { color: PALETTE.steel, segments: 8 });
  f.box("metal", 0.2, 0.2 + h + 0.08, 0.1, 0.35, 0.08, 0.2, { color: PALETTE.gunmetal });
  f.box("metal", -0.25, 0.2 + h + 0.06, -0.1, 0.2, 0.04, 0.12, { color: PALETTE.steel });
  f.box(lamp, -0.3, 0.2 + h * 0.5, d / 2 + 0.04, 0.08, 0.02, 0.005, { uv: "keep" });
  f.collider(-w / 2 - 0.15, w / 2, 0, h + 0.3, -d / 2, d / 2, "cart");
}

/** Fuel bowser: wheeled chassis, horizontal tank with hazard band, hose reel and a hose to a deck nozzle. */
export function fuelBowser(kit, f, opts = {}) {
  const { hoseTo = [2.2, 0.0, 2.6], color = PALETTE.impGreyDark } = opts;
  f.box("paintedMetal", 0, 0.5, 0, 1.7, 0.3, 3.4, { color: PALETTE.gunmetal, texel: 1 });
  for (const su of [-1, 1]) for (const sn of [-1.1, 1.1]) f.cylU(BLACK, su * 0.9, 0.36, sn, 0.36, 0.28, { segments: 14 });
  f.cylN("painted2", 0, 1.55, 0, 0.85, 3.2, { color, segments: 18, uv: "world", texel: 0.5 });
  f.cylN("hazard", 0, 1.55, 0.9, 0.87, 0.35, { segments: 18, uv: "world", texel: 1 });
  f.cylN("hazard", 0, 1.55, -0.9, 0.87, 0.35, { segments: 18, uv: "world", texel: 1 });
  f.box("metal", 0, 2.45, 0, 0.5, 0.16, 1.6, { color: PALETTE.steel, texel: 1 });
  f.cylV("metal", 0, 2.6, 0.4, 0.12, 0.2, { color: PALETTE.gunmetal, segments: 10 });
  // control cabinet at the rear with a pump gauge screen
  f.box(BLACK, 0.4, 1.1, -1.85, 0.8, 1.0, 0.35);
  f.box("screen6", 0.4, 1.3, -2.03, 0.5, 0.25, 0.01, { uv: "keep" });
  f.box("emitAmber", 0.4, 0.95, -2.03, 0.5, 0.05, 0.01, { uv: "keep" });
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
  kit.add(BLACK, new THREE.TubeGeometry(curve, 14, 0.06, 6, false), { uv: "scale", uvScale: [1, 8] });
  const nz = f.pos(hoseTo[0], 0.12, hoseTo[2]);
  kit.add("metal", new THREE.CylinderGeometry(0.06, 0.09, 0.5, 8), { pos: [nz.x, nz.y, nz.z], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [1, 1] });
  f.collider(-1.0, 1.0, 0, 2.9, -2.1, 1.75, "bowser");
}

/** Deck tug / loader vehicle: orange chassis, black cab, forks at the +n end, wheels, work lights. */
export function loaderVehicle(kit, f, opts = {}) {
  const { workLight = "emitWhiteSoft" } = opts;
  f.box("paintedMetal", 0, 0.7, 0, 2.2, 0.6, 3.6, { color: PALETTE.orange, texel: 1 });
  f.box(BLACK, 0, 1.3, -0.9, 1.6, 0.6, 1.4);
  f.box(BLACK, 0, 1.75, -0.6, 1.4, 0.5, 1.2);
  f.box("paintedMetal", 0, 1.1, 1.2, 1.9, 0.2, 1.2, { color: PALETTE.impGreyDark, texel: 1 });
  for (const su of [-0.5, 0.5]) f.box("metal", su, 0.35, 2.4, 0.16, 0.06, 1.4, { color: PALETTE.steel });
  f.box("metal", 0, 1.2, 1.85, 1.6, 1.4, 0.1, { color: PALETTE.gunmetal, texel: 1 });
  for (const su of [-1, 1]) for (const sn of [-1.2, 1.2]) f.cylU(BLACK, su * 1.2, 0.45, sn, 0.45, 0.4, { segments: 14 });
  f.box("hazard", 0, 0.45, 1.85, 2.2, 0.3, 0.1, { uv: "world", texel: 1.5 });
  f.box("emitAmber", 0, 2.05, -0.6, 0.3, 0.12, 0.3);
  f.box(workLight, -0.7, 0.9, 1.92, 0.3, 0.12, 0.02);
  f.box(workLight, 0.7, 0.9, 1.92, 0.3, 0.12, 0.02);
  f.collider(-1.4, 1.4, 0, 2.1, -1.9, 3.1, "loader");
}

/** Pallet 1.2 x 1.2 with a load of strapped boxes (`tiers` high). */
export function pallet(kit, f, opts = {}) {
  const { tiers = 2, tone = PALETTE.impGrey, decal = 11 } = opts;
  for (const n of [-0.5, 0, 0.5]) f.box("metal", 0, 0.07, n, 1.2, 0.14, 0.12, { color: PALETTE.darkMetal, texel: 2 });
  f.box("metal", 0, 0.15, 0, 1.2, 0.02, 1.2, { color: PALETTE.gunmetal, texel: 2 });
  for (let t = 0; t < tiers; t++) {
    const h = 0.6;
    const y = 0.16 + t * h;
    if (t % 2 === 0) {
      f.box("painted1", -0.3, y + h / 2, 0, 0.56, h - 0.02, 1.16, { color: tone, uv: "world", texel: 1 });
      f.box("painted", 0.3, y + h / 2, 0, 0.56, h - 0.02, 1.16, { color: tone, uv: "world", texel: 1 });
    } else {
      f.box("painted", 0, y + h / 2, -0.3, 1.16, h - 0.02, 0.56, { color: tone, uv: "world", texel: 1 });
      f.box("painted1", 0, y + h / 2, 0.3, 1.16, h - 0.02, 0.56, { color: tone, uv: "world", texel: 1 });
    }
  }
  const top = 0.16 + tiers * 0.6;
  // straps
  for (const u of [-0.35, 0.35]) f.box(BLACK, u, top / 2 + 0.08, 0, 0.05, top - 0.16, 1.22);
  f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), 0, top * 0.55, 0.61, { uv: "keep", uvRect: decalRect(decal) });
  f.collider(-0.62, 0.62, 0, top, -0.62, 0.62, "pallet");
}

/** Free-standing pedestal console: black desk, slanted screen, key strip. screenMat e.g. "screen4" / "screen6". */
export function pedestalConsole(kit, f, screenMat = "screen6", opts = {}) {
  const { w = 1.2, h = 1.05, d = 0.55, lamp = "emitAmber" } = opts;
  f.box(BLACK, 0, h / 2, 0, w, h, d);
  f.box(BLACK, 0, h + 0.14, d * 0.05, w, 0.28, d * 0.9, { tilt: -0.5 });
  f.box(screenMat, 0, h + 0.16, d * 0.05 + 0.13, w - 0.12, 0.2, 0.01, { uv: "keep", tilt: -0.5 });
  f.box(lamp, 0, h + 0.02, d / 2 + 0.005, w - 0.2, 0.05, 0.01, { uv: "keep" });
  f.box("metal", 0, 0.05, 0, w + 0.06, 0.1, d + 0.06, { color: PALETTE.darkMetal });
  f.collider(-w / 2, w / 2, 0, h + 0.3, -d / 2, d / 2 + 0.05, "console");
}

/** Tall equipment cabinet against a wall (frame facing into the room). */
export function cabinet(kit, f, opts = {}) {
  const { w = 1.2, h = 2.2, d = 0.6, screen = null, color = PALETTE.impGreyDark, lamp = "emitAmber" } = opts;
  f.box("painted1", 0, h / 2, 0, w, h, d, { color, uv: "world", texel: 1 });
  f.box(BLACK, 0, h / 2, d / 2 + 0.005, w - 0.16, h - 0.16, 0.01);
  if (screen) f.box(screen, 0, h * 0.7, d / 2 + 0.015, w - 0.4, 0.3, 0.01, { uv: "keep" });
  f.box(lamp, 0, h * 0.5, d / 2 + 0.015, w - 0.4, 0.05, 0.01, { uv: "keep" });
  for (let i = 0; i < 3; i++) f.box("metal", -w / 2 + 0.25 + i * 0.3, h * 0.3, d / 2 + 0.02, 0.18, 0.06, 0.02, { color: PALETTE.steel });
  f.box(lamp, w / 2 - 0.2, h * 0.9, d / 2 + 0.015, 0.06, 0.06, 0.01);
  f.collider(-w / 2, w / 2, 0, h, -d / 2, d / 2 + 0.05, "cabinet");
}

/** Wall light bar (like shell.wallLightBar, black housing in BLACK). u0..u1 along the frame at height v. */
export function lightBar(frame, u0, u1, v, mat = "emitWhiteSoft") {
  const len = u1 - u0;
  frame.box(BLACK, (u0 + u1) / 2, v, 0.03, len, 0.16, 0.06);
  frame.box(mat, (u0 + u1) / 2, v, 0.062, len - 0.06, 0.08, 0.01, { uv: "keep" });
}

/** Ceiling light bank: black housing with a soft white diffuser facing down. */
export function lightBank(kit, cx, yCeil, cz, w, d, mat = "emitWhiteSoft") {
  kit.box(BLACK, cx, yCeil - 0.18, cz, w + 0.3, 0.36, d + 0.3);
  kit.box(mat, cx, yCeil - 0.37, cz, w, 0.03, d, { uv: "keep" });
}

/**
 * Recessed light bank: an open-bottomed black housing hanging `depth` under the ceiling with the diffuser set
 * `inset` up inside it, so from the deck the emitter is mostly hidden behind the housing rim and only its
 * glow on the housing walls shows (high-bay louvre look instead of a blown white plate).
 */
export function recessedBank(kit, cx, yCeil, cz, w, d, mat = "emitWhiteSoft", depth = 0.55, inset = 0.3) {
  const t = 0.06;
  kit.boxMM(BLACK, [cx - w / 2 - t, yCeil - depth, cz - d / 2 - t], [cx - w / 2, yCeil, cz + d / 2 + t]);
  kit.boxMM(BLACK, [cx + w / 2, yCeil - depth, cz - d / 2 - t], [cx + w / 2 + t, yCeil, cz + d / 2 + t]);
  kit.boxMM(BLACK, [cx - w / 2, yCeil - depth, cz - d / 2 - t], [cx + w / 2, yCeil, cz - d / 2]);
  kit.boxMM(BLACK, [cx - w / 2, yCeil - depth, cz + d / 2], [cx + w / 2, yCeil, cz + d / 2 + t]);
  kit.box(mat, cx, yCeil - inset, cz, w - 0.02, 0.02, d - 0.02, { uv: "keep" });
}

/**
 * Visored flood fixture under a catwalk or beam: black housing with a lip on the room side and three small
 * diffusers, so it reads as a lamp cluster rather than a single blown plate. `face` is the direction the lip
 * faces (+1 → +x side lipped, -1 → -x side) when the fixture runs along z; set alongX for the other axis.
 */
export function floodFixture(kit, cx, y, cz, mat = "emitWhiteSoft", opts = {}) {
  const { alongX = false, lip = 0.28, w = 2.0 } = opts;
  const bx = alongX ? w : 0.7;
  const bz = alongX ? 0.7 : w;
  kit.box(BLACK, cx, y, cz, bx, 0.22, bz);
  // lips on both long sides (louvre) hanging below the emitter plane
  for (const s of [-1, 1]) {
    if (alongX) kit.box(BLACK, cx, y - 0.11 - lip / 2, cz + s * 0.33, bx, lip, 0.04);
    else kit.box(BLACK, cx + s * 0.33, y - 0.11 - lip / 2, cz, 0.04, lip, bz);
  }
  for (const k of [-1, 0, 1]) {
    const off = k * (w / 3);
    if (alongX) kit.box(mat, cx + off, y - 0.115, cz, w / 3 - 0.12, 0.01, 0.42, { uv: "keep" });
    else kit.box(mat, cx, y - 0.115, cz + off, 0.42, 0.01, w / 3 - 0.12, { uv: "keep" });
  }
}

/**
 * Warren truss along `axis` ("x" or "z") from `from` to `to`, centred on `at` across, chords at yTop / yBot,
 * diagonals every `panel` metres. Structural ceiling steel: dark, deep and cheap (boxes only).
 */
export function truss(kit, o) {
  const { axis = "x", from, to, at, yTop, yBot, panel = 4, chord = 0.5, web = 0.26, color = PALETTE.darkMetal, chordColor = PALETTE.gunmetal } = o;
  const len = to - from;
  const mid = (from + to) / 2;
  const depth = yTop - yBot;
  const along = (c, y, s, size, col) => {
    if (axis === "x") kit.box("paintedMetal", c, y, at, s, size, size, { color: col, uv: "world", texel: 0.6 });
    else kit.box("paintedMetal", at, y, c, size, size, s, { color: col, uv: "world", texel: 0.6 });
  };
  along(mid, yTop - chord / 2, len, chord, chordColor);
  along(mid, yBot + chord / 2, len, chord, chordColor);
  const n = Math.max(1, Math.round(len / panel));
  const p = len / n;
  for (let i = 0; i <= n; i++) {
    const c = from + i * p;
    if (axis === "x") kit.box("paintedMetal", c, (yTop + yBot) / 2, at, web, depth - chord, web, { color, texel: 1 });
    else kit.box("paintedMetal", at, (yTop + yBot) / 2, c, web, depth - chord, web, { color, texel: 1 });
  }
  const L = Math.hypot(p, depth - chord);
  const ang = Math.atan2(depth - chord, p);
  for (let i = 0; i < n; i++) {
    const c = from + (i + 0.5) * p;
    const s = i % 2 ? -1 : 1;
    if (axis === "x") kit.add("paintedMetal", new THREE.BoxGeometry(L, web, web), { pos: [c, (yTop + yBot) / 2, at], rot: [0, 0, s * ang], color, uv: "scale", uvScale: [L, 1] });
    else kit.add("paintedMetal", new THREE.BoxGeometry(web, web, L), { pos: [at, (yTop + yBot) / 2, c], rot: [-s * ang, 0, 0], color, uv: "scale", uvScale: [1, L] });
  }
}

/** Cable tray along an axis: shallow channel with cross rungs and a few cable bundles inside. */
export function cableTray(kit, x, y, z, len, axis, w = 0.8, color = PALETTE.darkMetal) {
  const alongX = axis === "x";
  const box = (cx, cy, cz, sx, sy, sz, col) => kit.box("paintedMetal", cx, cy, cz, alongX ? sx : sz, sy, alongX ? sz : sx, { color: col, uv: "world", texel: 1 });
  box(x, y, z, len, 0.06, w, color);
  for (const s of [-1, 1]) box(alongX ? x : x + s * (w / 2), y + 0.1, alongX ? z + s * (w / 2) : z, len, 0.2, 0.05, color);
  const n = Math.floor(len / 3);
  for (let i = 0; i <= n; i++) {
    const c = -len / 2 + (i / Math.max(1, n)) * len;
    box(alongX ? x + c : x, y + 0.04, alongX ? z : z + c, 0.08, 0.04, w - 0.1, PALETTE.gunmetal);
  }
  for (const [off, r, col] of [[-0.22, 0.06, PALETTE.impBlack], [0, 0.05, PALETTE.orange], [0.2, 0.07, PALETTE.impBlack]]) {
    kit.cyl("metal", alongX ? x : x + off, y + 0.09, alongX ? z + off : z, r, len - 0.2, axis, { color: col, segments: 6 });
  }
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
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) kit.boxMM(BLACK, [px - 0.08, yBottom, pz - 0.08], [px + 0.08, yTop + 1.25, pz + 0.08]);
  kit.boxMM(BLACK, [x0 - 0.08, yTop + 1.15, z0 - 0.08], [x1 + 0.08, yTop + 1.25, z1 + 0.08]);
  kit.boxMM(BLACK, [x0 - 0.08, yBottom + 2.6, zEntry - 0.1], [x1 + 0.08, yBottom + 2.85, zEntry + 0.1]);
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
// Kit-bashed TIE-style fighter (static, for cradles). Same proportions as src/hangar/tie.js: 2 m pod flattened
// at the octagonal viewport hatch and the rear hatch, twin pylons, 7 x 4.6 m hexagonal wings in the planes
// u = ±3.18 with a lattice of frame bars over eight dark solar rows (one row carries the unit band). Built in a
// prop frame: u = wing axis, v = up, n = nose direction.
// ---------------------------------------------------------------------------
const TIE = { R: 2.0, H: 3.5, D: 2.3, PX: 3.18, NOSE: 1.7, TAIL: -1.82 };
const TIE_C = {
  pod: new THREE.Color(0x9ea4ab),
  mid: new THREE.Color(0x767d86),
  frame: new THREE.Color(0x474d57),
  panel: new THREE.Color(0x353d4a),
};
const TIE_BANDS = [new THREE.Color(0x8c2424), new THREE.Color(0xc4c8ce), new THREE.Color(0x2f568f)];
const TIE_HEX = [[TIE.H, 0], [TIE.H / 2, TIE.D], [-TIE.H / 2, TIE.D], [-TIE.H, 0], [-TIE.H / 2, -TIE.D], [TIE.H / 2, -TIE.D]]; // [v, n]
const TIE_ROWS = [-TIE.H, -TIE.H * 0.75, -TIE.H / 2, -TIE.H / 4, 0, TIE.H / 4, TIE.H / 2, TIE.H * 0.75, TIE.H];
const hexDepth = (v) => (Math.abs(v) <= TIE.H / 2 ? TIE.D : (TIE.D * (TIE.H - Math.abs(v))) / (TIE.H / 2));

// two-sided trapezoid row of a wing panel in the plane u = x, between v0 and v1
function wingRowGeometry(x, v0, v1) {
  const d0 = hexDepth(v0);
  const d1 = hexDepth(v1);
  const A = [x, v0, -d0];
  const B = [x, v0, d0];
  const C = [x, v1, d1];
  const E = [x, v1, -d1];
  const pos = [];
  const nrm = [];
  const push = (tri, nx) => {
    for (const p of tri) {
      pos.push(...p);
      nrm.push(nx, 0, 0);
    }
  };
  push([A, C, B], 1);
  push([A, E, C], 1);
  push([A, B, C], -1);
  push([A, C, E], -1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}

// bar between (v0,n0) and (v1,n1) in the plane u = x, square section t: BoxGeometry along v rotated about u
function wingBar(f, x, v0, n0, v1, n1, t, color) {
  const len = Math.hypot(v1 - v0, n1 - n0);
  const rot = new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.atan2(n1 - n0, v1 - v0));
  f.add("metal", new THREE.BoxGeometry(t, len, t), x, (v0 + v1) / 2, (n0 + n1) / 2, { quat: f.quat(rot), color, uv: "scale", uvScale: [1, len] });
}

/** Hexagonal wing (panel rows + lattice) in the plane u = x of frame f, side ±1 gives the outward normal. */
export function tieWingAt(kit, f, x, side, variant = 0) {
  const band = TIE_BANDS[variant % TIE_BANDS.length];
  const bandRow = 1 + (variant % 6);
  const c = new THREE.Color();
  for (let r = 0; r < TIE_ROWS.length - 1; r++) {
    if (r === bandRow) c.copy(band);
    else c.copy(TIE_C.panel).multiplyScalar(r % 2 ? 0.85 : 1.15);
    f.add("paintedMetal", wingRowGeometry(x, TIE_ROWS[r], TIE_ROWS[r + 1]), 0, 0, 0, { color: c.clone(), uv: "world", texel: 0.5 });
  }
  for (let i = 0; i < 6; i++) {
    const [av, an] = TIE_HEX[i];
    const [bv, bn] = TIE_HEX[(i + 1) % 6];
    wingBar(f, x, av, an, bv, bn, 0.2, TIE_C.frame);
    wingBar(f, x, 0, 0, av, an, 0.13, TIE_C.frame);
  }
  for (const v of [TIE.H / 2, -TIE.H / 2]) wingBar(f, x, v, -TIE.D, v, TIE.D, 0.11, TIE_C.frame);
  for (const n of [-TIE.D / 2, TIE.D / 2]) {
    const vTop = TIE.H - (TIE.H / 2) * (Math.abs(n) / TIE.D);
    wingBar(f, x, -vTop, n, vTop, n, 0.11, TIE_C.frame);
  }
  // hub cap on the outer face
  f.cylU("metal", x + side * 0.12, 0, 0, 0.7, 0.24, { color: PALETTE.steel, segments: 12 });
}

/** Detached wing standing upright in frame f (panel centred at the frame origin + (0, cv, 0), normal along u). */
export function tieWing(kit, f, cv, variant = 0) {
  const g = new Frame(kit, f.pos(0, cv, 0), f.U, f.V);
  tieWingAt(kit, g, 0, 1, variant);
}

/**
 * Pod, pylons, hatches and optionally each wing, centred on frame f (pod centre at the frame origin).
 * wings: { left: bool (u-), right: bool (u+) }. engines: emissive material key for hot engine discs or null.
 */
export function tieShape(kit, f, opts = {}) {
  const { wings = { left: true, right: true }, variant = 0, engines = null } = opts;
  const pod = new THREE.SphereGeometry(TIE.R, 22, 14);
  const pp = pod.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setZ(i, THREE.MathUtils.clamp(pp.getZ(i), TIE.TAIL, TIE.NOSE));
  f.add("paintedMetal", pod, 0, 0, 0, { color: TIE_C.pod, uv: "world", texel: 0.6 });
  // octagonal viewport hatch: bezel, frame ring, eight struts, dark glass
  const oct = Math.PI / 8;
  const bezel = new THREE.CylinderGeometry(1.22, 1.34, 0.3, 8);
  bezel.rotateY(oct);
  bezel.rotateX(Math.PI / 2);
  f.add("metal", bezel, 0, 0, TIE.NOSE + 0.1, { color: TIE_C.mid, uv: "world", texel: 1 });
  const ring = new THREE.TorusGeometry(1.12, 0.09, 6, 8);
  ring.rotateZ(oct);
  f.add("metal", ring, 0, 0, TIE.NOSE + 0.27, { color: TIE_C.frame, uv: "scale", uvScale: [4, 1] });
  for (let i = 0; i < 8; i++) {
    const a = i * (Math.PI / 4) + oct;
    const rot = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, a - Math.PI / 2);
    f.add("metal", new THREE.BoxGeometry(0.06, 1.08, 0.06), Math.cos(a) * 0.56, Math.sin(a) * 0.56, TIE.NOSE + 0.3, { quat: f.quat(rot), color: TIE_C.frame });
  }
  const glass = new THREE.CircleGeometry(1.06, 8);
  glass.rotateZ(oct);
  f.add(BLACK, glass, 0, 0, TIE.NOSE + 0.26, { uv: "keep" });
  // rear hatch ring and plate, twin engine housings low on the aft face
  const tail = new THREE.TorusGeometry(0.72, 0.08, 6, 8);
  tail.rotateZ(oct);
  f.add("metal", tail, 0, 0, TIE.TAIL, { color: TIE_C.frame, uv: "scale", uvScale: [4, 1] });
  const plate = new THREE.CircleGeometry(0.68, 8);
  plate.rotateZ(oct);
  plate.rotateY(Math.PI);
  f.add(BLACK, plate, 0, 0, TIE.TAIL - 0.01, { uv: "keep" });
  for (const sx of [-1, 1]) {
    f.cylN("metal", sx * 0.78, -1.02, TIE.TAIL + 0.32, 0.42, 0.5, { r2: 0.34, segments: 12, color: TIE_C.frame });
    const disc = new THREE.CircleGeometry(0.34, 12);
    disc.rotateY(Math.PI);
    f.add(engines || BLACK, disc, sx * 0.78, -1.02, TIE.TAIL + 0.06, { uv: "keep" });
  }
  // pylons: collar at the pod, tapered strut, wing hub and cap
  for (const side of [-1, 1]) {
    f.cylU("metal", side * 2.02, 0, 0, 0.72, 0.3, { color: TIE_C.mid, segments: 12 });
    const strut = new THREE.CylinderGeometry(0.62, 0.5, 1.4, 10);
    strut.rotateZ(-side * Math.PI / 2);
    f.add("metal", strut, side * 2.45, 0, 0, { color: TIE_C.mid, uv: "world", texel: 1 });
    f.cylU("metal", side * 2.95, 0, 0, 0.95, 0.46, { color: TIE_C.mid, segments: 12 });
    f.cylU("metal", side * 3.36, 0, 0, 0.5, 0.22, { color: TIE_C.frame, segments: 10 });
    const has = side < 0 ? wings.left : wings.right;
    if (has) tieWingAt(kit, f, side * TIE.PX, side, variant);
    else {
      // bare hub: exposed mounting flange with bolts and a warning ring
      f.cylU("metal", side * 3.5, 0, 0, 0.75, 0.12, { color: PALETTE.darkMetal, segments: 12 });
      f.cylU("hazard", side * 3.45, 0, 0, 0.92, 0.06, { segments: 12, uv: "world", texel: 1 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        f.cylU("metal", side * 3.58, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.06, 0.06, { color: PALETTE.steel, segments: 6 });
      }
    }
  }
}

/** Half extents of the kit TIE in its frame (u, v, n). */
export const TIE_HALF = { u: 3.4, v: TIE.H + 0.1, n: TIE.D + 0.1 };

// ---------------------------------------------------------------------------
// Moving machinery (ctx.dynamic entries)
// ---------------------------------------------------------------------------
// Moving machinery lives above the pooled spot lights (crane, hoists) or below the deck (blast leaves), so
// none of it casts: every caster costs one extra draw per shadowed spot.
function buildGroup(mats, name, fn) {
  const g = new THREE.Group();
  g.name = name;
  const k = new Kit(mats);
  fn(k, g);
  k.build(g, { castShadow: false, receiveShadow: true });
  return g;
}

/**
 * Restrict the room kit's shadow casters to the listed material keys. Every pooled spot renders every caster
 * whose bounding sphere touches its frustum, and a merged room mesh touches everything, so a 20-material room
 * costs 20 shadow draws per spot; the big structural plates (catwalks, platforms, stair towers) sell the
 * shadows on their own. Wraps kit.build, which the registry calls after the builder returns.
 */
export function shadowCasters(kit, keys) {
  const allow = new Set(keys);
  const build = kit.build.bind(kit);
  kit.build = (parent, opts) => {
    const meshes = build(parent, opts);
    for (const m of meshes) if (!allow.has(m.name.replace(/^kit_/, ""))) m.castShadow = false;
    return meshes;
  };
}

/**
 * Overhead gantry crane: a twin-girder bridge spanning x0..x1 on wall rails at y, travelling along z between
 * zMin and zMax; a trolley wanders along the bridge and a hoisted load hangs below.
 */
export function gantryCrane(ctx, mats, o) {
  const { x0, x1, y, zMin, zMax, trolleyRange = [-8, 8], hookDrop = 7, load = true, speed = 0.7, name = "hangar.crane" } = o;
  const span = x1 - x0;
  const cx = (x0 + x1) / 2;
  // one material on the bridge and one on the trolley: each one is a draw call in every deck D view, and the
  // crane runs 30 m above the deck where painted amber marker plates read the same as lit ones
  const bridge = buildGroup(mats, name + ".bridge", (k) => {
    for (const dz of [-1.3, 1.3]) k.box("paintedMetal", 0, 0, dz, span, 1.6, 0.8, { color: PALETTE.gunmetal, texel: 0.7 });
    for (let x = -span / 2 + 3; x < span / 2 - 2; x += 6) k.box("paintedMetal", x, 0.5, 0, 0.3, 0.5, 2.0, { color: PALETTE.darkMetal });
    k.box("paintedMetal", 0, -0.6, -1.71, span - 2, 0.35, 0.02, { color: PALETTE.impAmber, uv: "world", texel: 1.5 });
    k.box("paintedMetal", 0, -0.6, 1.71, span - 2, 0.35, 0.02, { color: PALETTE.impAmber, uv: "world", texel: 1.5 });
    for (const sx of [-1, 1]) {
      k.box("paintedMetal", sx * (span / 2 - 0.8), -0.4, 0, 1.6, 2.4, 3.8, { color: PALETTE.darkMetal, texel: 0.7 });
      k.box("paintedMetal", sx * (span / 2 - 0.8), 1.1, 0, 0.5, 0.25, 0.5, { color: PALETTE.impAmber, texel: 2 });
      k.box("paintedMetal", sx * (span / 2 - 1.6), -1.4, 1.95, 0.4, 0.15, 0.02, { color: PALETTE.impAmber, texel: 2 });
    }
    k.box("paintedMetal", 0, 0.9, 0, span - 4, 0.05, 2.4, { color: PALETTE.darkMetal, texel: 0.7 });
  });
  const trolley = buildGroup(mats, name + ".trolley", (k) => {
    k.box("metal", 0, -1.4, 0, 3.2, 1.3, 3.4, { color: PALETTE.slate, texel: 1 });
    k.box("metal", 0, -2.3, 0, 1.6, 0.6, 1.6, { color: PALETTE.darkMetal });
    for (const dx of [-0.5, 0.5]) k.cyl("metal", dx, -2.6 - hookDrop / 2, 0, 0.04, hookDrop, "y", { color: PALETTE.steel, segments: 6 });
    k.box("metal", 0, -2.6 - hookDrop, 0, 1.4, 0.5, 0.7, { color: PALETTE.gunmetal });
    if (load) {
      // slung cargo pod: tinted body, steel corner frame and four slings up to the hook block
      const py = -2.6 - hookDrop - 0.3 - 1.2;
      k.box("metal", 0, py, 0, 2.4, 2.4, 6, { color: PALETTE.slate, uv: "world", texel: 0.5 });
      for (const dx of [-1.2, 1.2]) for (const dz of [-3, 3]) k.box("metal", dx, py, dz, 0.16, 2.5, 0.16, { color: PALETTE.gunmetal });
      for (const dz of [-3, 3]) k.box("metal", 0, py + 1.25, dz, 2.5, 0.1, 0.16, { color: PALETTE.gunmetal });
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
      // inner edge: amber warning band and tooth blocks (one material per leaf)
      const edge = -side * leafW / 2;
      k.box("paintedMetal", edge + side * 0.01, 0, 0, 0.02, thickness - 0.1, len - 0.4, { color: PALETTE.impAmber, uv: "world", texel: 1.2 });
      for (let z = -len / 2 + 2; z < len / 2 - 1; z += 4) k.box("paintedMetal", edge + side * 0.6, thickness * 0.15, z, 1.2, thickness * 0.5, 1.2, { color: PALETTE.gunmetal });
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
 * Rotating amber beacons: posts and housings merged into the room kit, lenses in ONE InstancedMesh shared by
 * every room built with the same material set (the whole deck): the first room to call this owns the mesh
 * and its update, later rooms only append lenses. The deck D rooms are all within two portal hops of each
 * other, so whenever a room is visible the owner's group is too. Beacon lenses are not frustum culled, so
 * separate per-room meshes would have cost one draw call each in every deck view.
 * positions: [[x, yBase, z, postHeight], ...]
 */
const BEACON_CAPACITY = 48;
const beaconPools = new WeakMap();
export function beacons(kit, ctx, mats, positions, name = "hangar.beacons") {
  for (const [x, y, z, ph] of positions) {
    if (ph > 0) {
      kit.cyl("metal", x, y + ph / 2, z, 0.06, ph, "y", { color: PALETTE.gunmetal, segments: 8 });
      kit.cyl("metal", x, y + 0.05, z, 0.22, 0.1, "y", { color: PALETTE.darkMetal, segments: 10 });
    }
    kit.cyl(BLACK, x, y + ph + 0.06, z, 0.24, 0.12, "y", { segments: 12 });
    kit.cyl(BLACK, x, y + ph + 0.62, z, 0.2, 0.06, "y", { segments: 12 });
  }
  let pool = beaconPools.get(mats);
  if (pool && pool.positions.length + positions.length > BEACON_CAPACITY) pool = null;
  if (pool) {
    pool.positions.push(...positions);
    pool.mesh.count = pool.positions.length;
    pool.entry.update(0);
    return pool.entry;
  }
  const all = [...positions];
  const mat = mats.emitAmber.clone();
  mat.emissiveIntensity = 2.5;
  const geo = new THREE.BoxGeometry(0.36, 0.42, 0.14);
  const mesh = new THREE.InstancedMesh(geo, mat, BEACON_CAPACITY);
  mesh.count = all.length;
  mesh.name = name;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  const state = { t: 0 };
  const update = (dt) => {
    state.t += dt;
    for (let i = 0; i < all.length; i++) {
      const [x, y, z, ph] = all[i];
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
  beaconPools.set(mats, { mesh, positions: all, entry });
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

  // the moving platform is one material (plate, amber-tinted edges, rails); the hazard texture stays on the deck
  const plat = buildGroup(mats, name, (k) => {
    k.boxMM("paintedMetal", [-w / 2, -0.3, -d / 2], [w / 2, 0, d / 2], { color: PALETTE.gunmetal, uv: "world", texel: 1 });
    k.boxMM("paintedMetal", [-w / 2 + 0.05, 0, -d / 2 + 0.05], [w / 2 - 0.05, 0.02, d / 2 - 0.05], { color: PALETTE.darkMetal, uv: "world", texel: 1.5 });
    const A = { color: PALETTE.impAmber, uv: "world", texel: 1.5 };
    k.boxMM("paintedMetal", [-w / 2, 0.02, -d / 2], [w / 2, 0.03, -d / 2 + 0.3], A);
    k.boxMM("paintedMetal", [-w / 2, 0.02, d / 2 - 0.3], [w / 2, 0.03, d / 2], A);
    k.boxMM("paintedMetal", [-w / 2, -0.3, -d / 2 - 0.01], [w / 2, 0, -d / 2], A);
    k.boxMM("paintedMetal", [-w / 2, -0.3, d / 2], [w / 2, 0, d / 2 + 0.01], A);
    const ro = { collide: false, mat: "paintedMetal", kick: false };
    for (const side of ["-x", "+x", "-z", "+z"]) {
      if (openSides.includes(side)) continue;
      if (side === "-x") railing(k, -w / 2 + 0.1, -d / 2 + 0.1, -w / 2 + 0.1, d / 2 - 0.1, 0.02, ro);
      if (side === "+x") railing(k, w / 2 - 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1, 0.02, ro);
      if (side === "-z") railing(k, -w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, -d / 2 + 0.1, 0.02, ro);
      if (side === "+z") railing(k, -w / 2 + 0.1, d / 2 - 0.1, w / 2 - 0.1, d / 2 - 0.1, 0.02, ro);
    }
    // guide shoes toward the columns and a control pedestal
    for (const [px, pz] of colPos) k.box("paintedMetal", px - cx, 0.4, pz - cz + (frameSide === "+z" ? -0.45 : frameSide === "-z" ? 0.45 : 0), 0.5, 1.0, 0.3, { color: PALETTE.darkMetal });
    k.box("paintedMetal", alongX ? -w / 2 + 0.5 : 0, 1.0, alongX ? d / 2 - 0.2 : -d / 2 + 0.5, 0.3, 1.2, 0.2, { color: PALETTE.darkMetal });
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
    k.box("metal", 0, -0.35, 0, 1.4, 0.7, 1.0, { color: PALETTE.slate, texel: 1 });
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

// ---------------------------------------------------------------------------
// Wave 2 additions: launch cradle, door surrounds, well shaft, shimmer sheet, shuttle, crane trolley
// ---------------------------------------------------------------------------

/**
 * Drop-rail launch cradle: a heavy rail beam across the well (static, in the room kit) and a travelling carriage
 * (dynamic) whose clamp arms grip a kit TIE by the wings, hanging over the void. Carriage top is 0.1 below the
 * rail underside `y`; the fighter's pod hangs 5.7 m below that. Moves slowly along x between x0 and x1.
 */
export function launchCradle(kit, ctx, mats, o) {
  const { z, y, x0, x1, postX, yDeck, xStart = 0, speed = 0.22, variant = 3, name = "hangar.launchCradle" } = o;
  // rail beam on two A-frame posts standing on the deck edges
  kit.boxMM("paintedMetal", [-postX - 0.6, y, z - 0.7], [postX + 0.6, y + 1.4, z + 0.7], { color: PALETTE.gunmetal, uv: "world", texel: 0.6 });
  kit.boxMM("metal", [-postX - 0.6, y - 0.14, z - 1.0], [postX + 0.6, y, z + 1.0], { color: PALETTE.steel, uv: "world", texel: 1 });
  kit.boxMM("hazard", [-postX - 0.61, y + 0.3, z - 0.71], [postX + 0.61, y + 0.7, z - 0.69], { uv: "world", texel: 1.2 });
  kit.boxMM("hazard", [-postX - 0.61, y + 0.3, z + 0.69], [postX + 0.61, y + 0.7, z + 0.71], { uv: "world", texel: 1.2 });
  for (const s of [-1, 1]) {
    const px = s * postX;
    kit.boxMM("paintedMetal", [px - 0.5, yDeck, z - 0.5], [px + 0.5, y + 1.4, z + 0.5], { color: PALETTE.gunmetal, uv: "world", texel: 0.6 });
    kit.boxMM("paintedMetal", [px - 0.9, yDeck, z - 0.9], [px + 0.9, yDeck + 0.8, z + 0.9], { color: PALETTE.darkMetal, uv: "world", texel: 0.6 });
    kit.boxMM("hazard", [px - 0.91, yDeck + 0.3, z - 0.91], [px + 0.91, yDeck + 0.6, z + 0.91], { uv: "world", texel: 1.2 });
    kit.collider([px - 0.9, yDeck, z - 0.9], [px + 0.9, y, z + 0.9], "cradlePost");
    // knee braces along the rail
    const L = Math.hypot(4, 3);
    kit.add("paintedMetal", new THREE.BoxGeometry(L, 0.3, 0.3), { pos: [px - s * 2, y - 1.5, z], rot: [0, 0, s * Math.atan2(3, 4)], color: PALETTE.darkMetal, uv: "scale", uvScale: [L, 1] });
    kit.box("emitAmber", px - s * 0.52, y + 1.0, z, 0.02, 0.2, 0.6);
  }
  const g = buildGroup(mats, name, (k) => {
    // carriage under the running flange
    k.box("paintedMetal", 0, -0.95, 0, 5.6, 1.7, 2.8, { color: PALETTE.slate, texel: 0.8 });
    k.box("hazard", 0, -1.62, 0, 5.62, 0.32, 2.82, { uv: "world", texel: 1.5 });
    for (const dx of [-2.0, 2.0]) for (const dz of [-1.0, 1.0]) k.box("metal", dx, -0.06, dz, 0.7, 0.24, 0.7, { color: PALETTE.darkMetal });
    k.box("paintedMetal", 0, -0.4, 1.41, 3.2, 0.7, 0.04, { color: PALETTE.impAmber, uv: "world", texel: 1.5 });
    // clamp arms down the outside of both wings, pads gripping the wing faces at two heights
    const podY = -5.7;
    const armX = TIE.PX + 0.62;
    for (const s of [-1, 1]) {
      k.boxMM("paintedMetal", [s * armX - 0.3, podY - 1.6, -0.35], [s * armX + 0.3, -1.75, 0.35], { color: PALETTE.gunmetal, texel: 0.8 });
      k.boxMM("paintedMetal", [Math.min(s * 2.0, s * armX), -2.35, -0.35], [Math.max(s * 2.0, s * armX), -1.75, 0.35], { color: PALETTE.gunmetal, texel: 0.8 });
      for (const py of [podY + 1.9, podY - 0.9]) {
        k.box("paintedMetal", s * (armX - 0.2), py, 0, 0.5, 0.7, 1.5, { color: PALETTE.darkMetal, texel: 1 });
        k.box(BLACK, s * (TIE.PX + 0.16), py, 0, 0.14, 0.6, 1.3);
        k.box("emitAmber", s * (armX + 0.31), py, 0, 0.02, 0.12, 0.8);
      }
      // hydraulic rams beside the arm
      k.cyl("metal", s * (armX + 0.45), podY + 1.2, 0.5, 0.09, 3.6, "y", { color: PALETTE.steel, segments: 8 });
      k.cyl("metal", s * (armX + 0.45), podY + 1.2, -0.5, 0.09, 3.6, "y", { color: PALETTE.steel, segments: 8 });
    }
    // work lamps under the carriage lighting the fighter, status beacon housing on top
    for (const s of [-1, 1]) {
      k.box(BLACK, s * 2.3, -1.95, 0, 0.7, 0.24, 1.6);
      k.box("emitWhiteSoft", s * 2.3, -2.08, 0, 0.5, 0.02, 1.4, { uv: "keep" });
    }
    k.box(BLACK, 0, -1.9, -1.2, 1.2, 0.2, 0.3);
    k.box("emitAmber", 0, -2.01, -1.2, 1.0, 0.02, 0.2, { uv: "keep" });
    // the fighter, nose toward -z (launch direction)
    const f = new Frame(k, new THREE.Vector3(0, podY, 0), new THREE.Vector3(-1, 0, 0), UP);
    tieShape(k, f, { variant, engines: "emitAmber" });
  });
  g.position.set(xStart, y - 0.1, z);
  const state = { x: xStart, dir: 1, pause: 8 };
  const update = (dt) => {
    if (state.pause > 0) state.pause -= dt;
    else {
      state.x += state.dir * speed * dt;
      if (state.x > x1) (state.x = x1), (state.dir = -1), (state.pause = 14);
      if (state.x < x0) (state.x = x0), (state.dir = 1), (state.pause = 14);
    }
    g.position.x = state.x;
  };
  update(0);
  const entry = { object: g, update, name, state };
  ctx.dynamic.push(entry);
  return entry;
}

/** Wall frame for a spec door [x, z, w, dir, h]: origin at the door's centre on the floor, n into the room. */
export function doorWallFrame(kit, room, door, y0) {
  const [dx, dz, , dir] = door;
  const U = dir === "-x" ? new THREE.Vector3(0, 0, -1) : dir === "+x" ? new THREE.Vector3(0, 0, 1) : dir === "-z" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
  return new Frame(kit, new THREE.Vector3(dx, y0, dz), U, UP);
}

/**
 * Heavy surround for a doorway (the DoorSystem draws the leaves and a thin frame): pilasters and a lintel
 * standing 0.5 m off the wall, hazard bands on the jambs and under the lintel, a label plate above, indicator
 * lamps beside the opening and a threshold band on the deck. Nothing is built inside the opening.
 */
export function doorSurround(kit, room, door, y0, opts = {}) {
  const [, , w, , hh] = door;
  const h = hh || DOOR_H;
  const blast = w >= 4;
  const fw = blast ? 0.45 : 0.16; // DoorSystem frame width
  const { label: idx = null, labelW = Math.min(w, 4.5), pilaster = blast ? 1.0 : 0.6, depth = blast ? 0.5 : 0.3, lintel = blast ? 1.6 : 0.7, lamps = true, threshold = true, color = PALETTE.gunmetal } = opts;
  const f = doorWallFrame(kit, room, door, y0);
  const top = h + fw + lintel;
  const n0 = 0.05;
  for (const s of [-1, 1]) {
    const u = s * (w / 2 + fw + pilaster / 2);
    f.box("paintedMetal", u, top / 2, n0 + depth / 2, pilaster, top, depth, { color, uv: "world", texel: 0.6 });
    // hazard band on the jamb face and a raised plate on the room face
    f.box("hazard", s * (w / 2 + fw + 0.005), h * 0.5, n0 + depth / 2, 0.01, h - 0.3, depth - 0.1, { uv: "world", texel: 1.2 });
    f.box("paintedMetal", u, h * 0.5, n0 + depth + 0.02, pilaster - 0.3, h - 0.6, 0.04, { color: PALETTE.darkMetal, texel: 1 });
    if (lamps) {
      f.box(BLACK, u, h - 0.35, n0 + depth + 0.05, pilaster - 0.4, 0.5, 0.08);
      f.box("emitAmber", u, h - 0.24, n0 + depth + 0.095, pilaster - 0.5, 0.1, 0.01, { uv: "keep" });
      f.box("emitBlue", u, h - 0.46, n0 + depth + 0.095, pilaster - 0.5, 0.1, 0.01, { uv: "keep" });
    }
    f.collider(u - pilaster / 2, u + pilaster / 2, 0, top, n0, n0 + depth + 0.1, "doorFrame");
  }
  const span = w + 2 * fw + 2 * pilaster;
  f.box("paintedMetal", 0, h + fw + lintel / 2, n0 + depth / 2, span, lintel, depth, { color, uv: "world", texel: 0.6 });
  f.box("hazard", 0, h + fw + 0.02, n0 + depth / 2, w + 2 * fw, 0.04, depth - 0.1, { uv: "world", texel: 1.2 });
  f.box("hazard", 0, h + fw + 0.18, n0 + depth + 0.005, w + 2 * fw, 0.3, 0.01, { uv: "world", texel: 1.2 });
  if (idx !== null) {
    const lw = labelW;
    f.box(BLACK, 0, h + fw + lintel * 0.66, n0 + depth + 0.005, lw + 0.3, lw / LABEL_ASPECT + 0.16, 0.02);
    frameLabel(f, 0, h + fw + lintel * 0.66, lw, idx, n0 + depth + 0.02);
  }
  if (threshold) f.box("hazard", 0, 0.005, n0 + depth + 0.45, w + 2 * fw, 0.01, 0.9, { uv: "world", texel: 1.5 });
  return f;
}

/**
 * Well shaft: lining walls inside the opening from the deck down to the exterior plate, a raised lip around the
 * mouth, recessed rim lights on the shaft faces, and the blast-leaf tracks with rack teeth on the two short
 * faces (the leaves slide along x on them).
 */
export function wellShaft(kit, W, y0, opts = {}) {
  const { depth = 2.5, lip = 0.42, lining = 0.4, rimY = 0.9, trackY = 1.45 } = opts;
  const yB = y0 - depth;
  const c = PALETTE.gunmetal;
  // lining (inside the opening) and lip cap (over the exterior curb and the slab edge)
  kit.boxMM("paintedMetal", [W.x0, yB, W.z0], [W.x0 + lining, y0 + lip, W.z1], { color: c, uv: "world", texel: 0.6 });
  kit.boxMM("paintedMetal", [W.x1 - lining, yB, W.z0], [W.x1, y0 + lip, W.z1], { color: c, uv: "world", texel: 0.6 });
  kit.boxMM("paintedMetal", [W.x0, yB, W.z0], [W.x1, y0 + lip, W.z0 + lining], { color: c, uv: "world", texel: 0.6 });
  kit.boxMM("paintedMetal", [W.x0, yB, W.z1 - lining], [W.x1, y0 + lip, W.z1], { color: c, uv: "world", texel: 0.6 });
  const out = 0.75;
  kit.boxMM("paintedMetal", [W.x0 - out, y0 - 0.02, W.z0 - out], [W.x0 + lining, y0 + lip, W.z1 + out], { color: PALETTE.darkMetal, uv: "world", texel: 0.6 });
  kit.boxMM("paintedMetal", [W.x1 - lining, y0 - 0.02, W.z0 - out], [W.x1 + out, y0 + lip, W.z1 + out], { color: PALETTE.darkMetal, uv: "world", texel: 0.6 });
  kit.boxMM("paintedMetal", [W.x0 - out, y0 - 0.02, W.z0 - out], [W.x1 + out, y0 + lip, W.z0 + lining], { color: PALETTE.darkMetal, uv: "world", texel: 0.6 });
  kit.boxMM("paintedMetal", [W.x0 - out, y0 - 0.02, W.z1 - lining], [W.x1 + out, y0 + lip, W.z1 + out], { color: PALETTE.darkMetal, uv: "world", texel: 0.6 });
  // hazard chevrons on the lip top
  kit.boxMM("hazard", [W.x0 - out, y0 + lip, W.z0 - out], [W.x1 + out, y0 + lip + 0.01, W.z1 + out], { uv: "world", texel: 1.5 });
  // the lip is a step, not a wall: walkable on top (four strips, never the well), invisible stop at its inner edge
  kit.floor(W.x0 - out, W.z0 - out, W.x0 + lining, W.z1 + out, y0 + lip);
  kit.floor(W.x1 - lining, W.z0 - out, W.x1 + out, W.z1 + out, y0 + lip);
  kit.floor(W.x0 - out, W.z0 - out, W.x1 + out, W.z0 + lining, y0 + lip);
  kit.floor(W.x0 - out, W.z1 - lining, W.x1 + out, W.z1 + out, y0 + lip);
  kit.collider([W.x0 + lining - 0.05, y0, W.z0], [W.x0 + lining + 0.05, y0 + lip + 1.2, W.z1], "wellLip");
  kit.collider([W.x1 - lining - 0.05, y0, W.z0], [W.x1 - lining + 0.05, y0 + lip + 1.2, W.z1], "wellLip");
  kit.collider([W.x0, y0, W.z0 + lining - 0.05], [W.x1, y0 + lip + 1.2, W.z0 + lining + 0.05], "wellLip");
  kit.collider([W.x0, y0, W.z1 - lining - 0.05], [W.x1, y0 + lip + 1.2, W.z1 - lining + 0.05], "wellLip");
  // ribs down the long faces, rim light strips recessed into every face
  for (let z = W.z0 + 5; z < W.z1 - 1; z += 5) {
    kit.boxMM("metal", [W.x0 + lining, yB + 0.1, z - 0.12], [W.x0 + lining + 0.14, y0 - 0.15, z + 0.12], { color: PALETTE.steel, texel: 1 });
    kit.boxMM("metal", [W.x1 - lining - 0.14, yB + 0.1, z - 0.12], [W.x1 - lining, y0 - 0.15, z + 0.12], { color: PALETTE.steel, texel: 1 });
  }
  const ry = y0 - rimY;
  kit.boxMM(BLACK, [W.x0 + lining - 0.02, ry - 0.1, W.z0 + 1], [W.x0 + lining + 0.06, ry + 0.1, W.z1 - 1]);
  kit.boxMM("emitWhiteSoft", [W.x0 + lining + 0.06, ry - 0.05, W.z0 + 1.2], [W.x0 + lining + 0.07, ry + 0.05, W.z1 - 1.2], { uv: "keep" });
  kit.boxMM(BLACK, [W.x1 - lining - 0.06, ry - 0.1, W.z0 + 1], [W.x1 - lining + 0.02, ry + 0.1, W.z1 - 1]);
  kit.boxMM("emitWhiteSoft", [W.x1 - lining - 0.07, ry - 0.05, W.z0 + 1.2], [W.x1 - lining - 0.06, ry + 0.05, W.z1 - 1.2], { uv: "keep" });
  kit.boxMM(BLACK, [W.x0 + 1, ry - 0.1, W.z0 + lining - 0.02], [W.x1 - 1, ry + 0.1, W.z0 + lining + 0.06]);
  kit.boxMM("emitWhiteSoft", [W.x0 + 1.2, ry - 0.05, W.z0 + lining + 0.06], [W.x1 - 1.2, ry + 0.05, W.z0 + lining + 0.07], { uv: "keep" });
  kit.boxMM(BLACK, [W.x0 + 1, ry - 0.1, W.z1 - lining - 0.06], [W.x1 - 1, ry + 0.1, W.z1 - lining + 0.02]);
  kit.boxMM("emitWhiteSoft", [W.x0 + 1.2, ry - 0.05, W.z1 - lining - 0.07], [W.x1 - 1.2, ry + 0.05, W.z1 - lining - 0.06], { uv: "keep" });
  // leaf tracks on the short faces: rail, rack teeth, end stops
  const ty = y0 - trackY;
  for (const zf of [W.z0 + lining, W.z1 - lining]) {
    const sgn = zf < (W.z0 + W.z1) / 2 ? 1 : -1;
    kit.boxMM("metal", [W.x0 + lining, ty - 0.14, zf], [W.x1 - lining, ty + 0.14, zf + sgn * 0.3], { color: PALETTE.steel, uv: "world", texel: 1 });
    for (let x = W.x0 + lining + 0.6; x < W.x1 - lining - 0.4; x += 1.2) kit.boxMM("metal", [x - 0.15, ty + 0.14, zf], [x + 0.15, ty + 0.3, zf + sgn * 0.26], { color: PALETTE.darkMetal, texel: 1 });
  }
}

/**
 * Containment shimmer: a barely-there additive sheet just below the deck across the well mouth, facing up
 * (the exterior draws its own down-facing sheet), breathing between 0.018 and 0.03 opacity.
 */
export function shimmerSheet(ctx, W, y, color = 0x66b6ff, name = "hangar.shimmer") {
  const g = new THREE.PlaneGeometry(W.x1 - W.x0 - 1.2, W.z1 - W.z0 - 1.2);
  g.rotateX(-Math.PI / 2);
  g.translate((W.x0 + W.x1) / 2, y, (W.z0 + W.z1) / 2);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.024, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = name;
  mesh.renderOrder = 2;
  const state = { t: 0 };
  const update = (dt) => {
    state.t += dt;
    mat.opacity = 0.024 + 0.006 * Math.sin(state.t * 0.9) * Math.sin(state.t * 2.3);
  };
  const entry = { object: mesh, update, name, state };
  ctx.dynamic.push(entry);
  return entry;
}

// plate from a 2D outline (points [a, b]) extruded `t` thick: a → local n, b → local v, thickness along u
function outlinePlate(points, t) {
  const shape = new THREE.Shape();
  points.forEach(([a, b], i) => (i ? shape.lineTo(a, b) : shape.moveTo(a, b)));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2);
  g.rotateY(-Math.PI / 2); // shape x -> +z (n), extrusion -> -x (u)
  return g;
}

/**
 * Kit-bashed shuttle, folded wings (~19 m nose to tail, 10 m tall folded). Frame f: origin on the pad under the
 * hull centre, n = nose direction. Dark hull, three fins (one dorsal, two folded wings), cockpit wedge, twin
 * engines, three-strut landing gear with chocks. Returns the wing plane positions for a cradle to grip.
 */
export function shuttleShape(kit, f, opts = {}) {
  const { hull = PALETTE.impGreyDark, fin = PALETTE.darkMetal, trim = PALETTE.slate } = opts;
  const gear = 1.2; // hull underside above the pad
  // fuselage: lower hull, upper hull, sponsons, spine
  f.box("paintedMetal", 0, gear + 0.9, -0.5, 4.6, 1.8, 13.0, { color: hull, uv: "world", texel: 0.5 });
  f.box("paintedMetal", 0, gear + 2.5, -1.5, 3.4, 1.5, 10.5, { color: hull, uv: "world", texel: 0.5 });
  f.box("paintedMetal", 0, gear + 3.35, -2.5, 1.6, 0.4, 7.0, { color: trim, uv: "world", texel: 0.5 });
  for (const s of [-1, 1]) {
    f.box("paintedMetal", s * 2.6, gear + 0.8, -1.0, 0.7, 1.3, 7.5, { color: fin, uv: "world", texel: 0.5 });
    f.box("hazard", s * 2.96, gear + 0.8, -1.0, 0.02, 0.24, 6.0, { uv: "world", texel: 1.2 });
    f.box("emitBlue", s * 2.97, gear + 1.3, -3.5, 0.01, 0.1, 0.5);
  }
  // nose: square frustum from the hull front to the tip, cockpit wedge with dark glazing on top
  const nose = new THREE.CylinderGeometry(0.85, 2.9, 5.2, 4, 1);
  nose.rotateY(Math.PI / 4);
  nose.rotateX(Math.PI / 2);
  nose.scale(1, 0.7, 1);
  f.add("paintedMetal", nose, 0, gear + 1.3, 8.6, { color: hull, uv: "world", texel: 0.5 });
  f.box("paintedMetal", 0, gear + 2.6, 7.4, 2.2, 1.1, 2.6, { color: hull, uv: "world", texel: 0.5, tilt: 0.25 });
  f.box(BLACK, 0, gear + 2.75, 8.2, 1.9, 0.7, 1.2, { tilt: 0.3 });
  f.box("emitBlue", 0, gear + 1.0, 11.15, 0.5, 0.06, 0.02);
  // dorsal fin: swept plate rising from the spine
  f.add("paintedMetal", outlinePlate([[-4.5, gear + 3.5], [1.6, gear + 3.5], [-2.2, gear + 9.8], [-5.6, gear + 9.8]], 0.4), 0, 0, 0, { color: fin, uv: "world", texel: 0.5 });
  f.add("metal", outlinePlate([[-5.6, gear + 9.8], [-2.2, gear + 9.8], [-2.35, gear + 9.55], [-5.45, gear + 9.55]], 0.46), 0, 0, 0, { color: trim, uv: "world", texel: 1 });
  f.box("emitAmber", 0, gear + 9.4, -5.5, 0.5, 0.16, 0.16);
  // folded wings: plates leaning 24 degrees outward from the hull shoulders
  const root = { u: 2.35, v: gear + 2.2 };
  const tilt = 0.42;
  const span = 8.2;
  const wingPts = [[-6.0, 0], [5.8, 0], [1.6, span], [-6.0, span]];
  for (const s of [-1, 1]) {
    const g = outlinePlate(wingPts, 0.3);
    g.rotateZ(-s * tilt);
    g.translate(s * root.u, root.v, 0);
    f.add("paintedMetal", g, 0, 0, 0, { color: fin, uv: "world", texel: 0.5 });
    // rim along the leading edge and tip, two panel seams, a squadron stripe
    const rim = outlinePlate([[5.8, 0], [1.6, span], [1.25, span], [5.35, 0]], 0.34);
    rim.rotateZ(-s * tilt);
    rim.translate(s * root.u, root.v, 0);
    f.add("metal", rim, 0, 0, 0, { color: trim, uv: "world", texel: 1 });
    for (const sv of [span * 0.35, span * 0.7]) {
      const seam = outlinePlate([[-6.0, sv - 0.06], [5.8 - (sv / span) * 4.2, sv - 0.06], [5.8 - (sv / span) * 4.2, sv + 0.06], [-6.0, sv + 0.06]], 0.34);
      seam.rotateZ(-s * tilt);
      seam.translate(s * root.u, root.v, 0);
      f.add("metal", seam, 0, 0, 0, { color: PALETTE.gunmetal, uv: "world", texel: 1 });
    }
    const stripe = outlinePlate([[-6.0, span * 0.5], [3.5, span * 0.5], [3.3, span * 0.56], [-6.0, span * 0.56]], 0.33);
    stripe.rotateZ(-s * tilt);
    stripe.translate(s * root.u, root.v, 0);
    f.add("paintedMetal", stripe, 0, 0, 0, { color: PALETTE.orange, uv: "world", texel: 1 });
    // wing hinge fairing at the shoulder
    f.cylN("metal", s * 2.35, gear + 2.2, -0.1, 0.55, 11.8, { color: trim, segments: 12 });
    f.box("emitBlue", s * 2.35, gear + 2.2, 5.85, 0.2, 0.2, 0.02);
  }
  // engines at the tail with cold nozzles, tail hatch
  for (const s of [-1, 1]) {
    f.cylN("metal", s * 1.35, gear + 2.0, -7.0, 0.72, 1.6, { color: PALETTE.gunmetal, segments: 14 });
    f.cylN(BLACK, s * 1.35, gear + 2.0, -7.85, 0.56, 0.12, { segments: 14 });
  }
  f.box(BLACK, 0, gear + 0.9, -7.05, 2.0, 1.2, 0.1);
  f.box("hazard", 0, gear + 1.6, -7.06, 2.2, 0.16, 0.02, { uv: "world", texel: 1.2 });
  // landing gear: three struts on pads, chocks against the pads
  for (const [u, n] of [[0, 6.0], [-1.9, -3.6], [1.9, -3.6]]) {
    f.cylV(BLACK, u, gear / 2 + 0.1, n, 0.17, gear - 0.2, { segments: 10 });
    f.box("metal", u, 0.08, n, 1.0, 0.16, 1.2, { color: PALETTE.darkMetal, texel: 1 });
    f.box("hazard", u, 0.14, n + 0.75, 0.9, 0.28, 0.3, { uv: "world", texel: 1.5 });
    f.box("hazard", u, 0.14, n - 0.75, 0.9, 0.28, 0.3, { uv: "world", texel: 1.5 });
  }
  // open boarding ramp at the port side, hazard edged, and a tied-down cargo strap over the hull
  const ramp = new THREE.BoxGeometry(2.6, 0.12, 1.4);
  const rp = f.pos(-3.2, gear / 2 + 0.05, 1.5);
  kit.add("paintedMetal", ramp, { pos: [rp.x, rp.y, rp.z], quat: f.quat(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, Math.atan2(gear - 0.1, 2.4))), color: PALETTE.slate, uv: "world", texel: 1 });
  f.box("hazard", -1.95, gear + 0.02, 1.5, 0.3, 0.02, 1.4, { uv: "world", texel: 1.5 });
  f.box(BLACK, -2.31, gear + 0.85, 1.5, 0.02, 1.5, 1.3);
  f.box("emitWarmSoft", -2.32, gear + 1.55, 1.5, 0.01, 0.06, 1.1, { uv: "keep" });
  f.collider(-2.9, 2.9, 0, gear + 4.0, -7.6, 8.0, "shuttleHull");
  f.collider(-1.6, 1.6, 0, gear + 3.2, 8.0, 11.3, "shuttleNose");
  f.collider(-4.6, -2.9, 0, gear, 0.8, 2.2, "shuttleRamp");
  return { root, tilt, span, gear };
}

/**
 * Crane trolley for the side rooms: a boxy hoist trolley with a spreader beam and a slung load travelling along
 * an x-axis rail at y (the rail itself is built by the room). Dynamic entry.
 */
export function craneTrolley(ctx, mats, o) {
  const { x0, x1, y, z, drop = 4, speed = 0.4, load = "container", name = "hangar.trolley" } = o;
  const trolley = buildGroup(mats, name, (k) => {
    k.box("paintedMetal", 0, -0.55, 0, 2.6, 1.1, 2.2, { color: PALETTE.slate, texel: 1 });
    for (const dx of [-0.9, 0.9]) for (const dz of [-0.8, 0.8]) k.box("metal", dx, -0.02, dz, 0.5, 0.3, 0.5, { color: PALETTE.darkMetal });
    k.box("paintedMetal", 0, -0.55, 1.11, 1.6, 0.4, 0.02, { color: PALETTE.impAmber, uv: "world", texel: 1.5 });
    k.box(BLACK, 0, -1.2, 0, 0.9, 0.3, 0.9);
    k.box("emitWhiteSoft", 0, -1.36, 0, 0.7, 0.02, 0.7, { uv: "keep" });
    for (const dx of [-0.5, 0.5]) k.cyl("metal", dx, -1.3 - drop / 2, 0, 0.035, drop, "y", { color: PALETTE.steel, segments: 6 });
    // spreader beam and slings
    k.box("paintedMetal", 0, -1.3 - drop, 0, 3.0, 0.3, 0.3, { color: PALETTE.impAmber, uv: "world", texel: 1.5 });
    if (load === "container") {
      const py = -1.3 - drop - 0.25 - 1.3;
      k.box("paintedMetal", 0, py, 0, 2.4, 2.5, 6, { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
      for (const dx of [-1.2, 1.2]) for (const dz of [-3, 3]) k.box("metal", dx, py, dz, 0.16, 2.6, 0.16, { color: PALETTE.darkMetal });
      for (const [dx, dz] of [[-1.15, -2.9], [1.15, -2.9], [-1.15, 2.9], [1.15, 2.9]]) {
        const len = Math.hypot(dx - Math.sign(dx) * 1.4, dz, 1.3);
        k.add("metal", new THREE.CylinderGeometry(0.03, 0.03, len, 5), { pos: [dx * 0.55, -1.3 - drop - 0.7, dz / 2], rot: [Math.atan2(dz, 1.3) * 0.5, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [1, 1] });
      }
    } else if (load === "wing") {
      const py = -1.3 - drop - 0.3;
      const f = new Frame(k, new THREE.Vector3(0, py - TIE.H, 0), new THREE.Vector3(0, 0, 1), UP);
      tieWingAt(k, f, 0, 1, 4);
      for (const dz of [-1.0, 1.0]) k.box("metal", 0, py - 0.15, dz, 0.1, 0.3, 0.1, { color: PALETTE.steel });
    }
  });
  const state = { x: (x0 + x1) / 2, dir: 1, pause: 4 };
  trolley.position.set(state.x, y, z);
  const update = (dt) => {
    if (state.pause > 0) state.pause -= dt;
    else {
      state.x += state.dir * speed * dt;
      if (state.x > x1) (state.x = x1), (state.dir = -1), (state.pause = 6);
      if (state.x < x0) (state.x = x0), (state.dir = 1), (state.pause = 6);
    }
    trolley.position.x = state.x;
  };
  const entry = { object: trolley, update, name, state };
  ctx.dynamic.push(entry);
  return entry;
}
