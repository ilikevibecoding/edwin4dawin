// Deck signatures for the turbolift lobbies and the corridors: the set pieces, small-scale fittings
// and fixtures that let each deck's lobby and corridor read as its own place (honour guard, memorial,
// weapons check, pipe manifold, fuel lines…) while the lift wall, the Imperial panels and the door
// openings stay shared. Everything is room-local and kit-merged; wall pieces are built on a wall
// Frame (u along the wall, v up, n into the room), free-standing props on a prop frame.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impCrate } from "./imperial_kit.js";
import { propFrame, bench, table, rod } from "./deck_b_props.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { rng } from "../kit.js";
import { GRATE_TILE } from "../textures.js";

const BLK = PALETTE.impBlack;
const CHR = PALETTE.impCharcoal;
const GD = PALETTE.impGreyDark;
const GREY = PALETTE.impGrey;
const WHITE = PALETTE.impWhite;
const BRASS = PALETTE.brass;
const YELLOW = PALETTE.yellow;

// ---------------------------------------------------------------------------
// Deck A — honour guard
// ---------------------------------------------------------------------------
/** Trooper helmet on a wall frame, chin at (u, v, n), visor toward +n. */
export function helmetF(F, u, v, n, opts = {}) {
  const col = opts.color || WHITE;
  F.add("impPanel1", new THREE.SphereGeometry(0.15, 14, 10), u, v + 0.16, n, { color: col, texel: 2 });
  F.box("impPanel1", u, v + 0.05, n, 0.29, 0.1, 0.29, { color: col, uv: "world", texel: 2 });
  F.box("impTrim", u, v + 0.17, n + 0.12, 0.21, 0.045, 0.08, { color: BLK });
  F.box("impTrim", u, v + 0.09, n + 0.12, 0.11, 0.05, 0.08, { color: BLK });
  for (const s of [-1, 1]) F.box("impMetal", u + s * 0.115, v + 0.08, n + 0.06, 0.05, 0.03, 0.1, { color: GD });
  F.box("impTrim", u, v + 0.02, n, 0.31, 0.02, 0.31, { color: BLK });
}

/** Stormtrooper armour set on a T-stand (original plated design), standing at (u, v0, n), chest toward +n. */
export function armourStand(F, u, n, opts = {}) {
  const { v0 = 0, accentKey = "emitBlue", color = WHITE, ledKey = "emitGreen" } = opts;
  const col = color;
  const y = (h) => v0 + h;
  F.box("impTrim", u, y(0.05), n, 0.7, 0.1, 0.7, { color: BLK, texel: 1 });
  F.box(accentKey, u, y(0.1), n, 0.5, 0.01, 0.5, { uv: "keep" });
  F.cylV("impMetal", u, y(0.95), n, 0.03, 1.7, { color: GD, segments: 8 });
  F.box("impMetal", u, y(1.6), n, 0.56, 0.04, 0.04, { color: GD });
  for (const s of [-1, 1]) {
    // boots, shin, knee, thigh
    F.box("impTrim", u + s * 0.08, y(0.17), n, 0.11, 0.32, 0.13, { color: BLK, texel: 2 });
    F.box("impTrim", u + s * 0.08, y(0.03), n + 0.09, 0.11, 0.06, 0.3, { color: BLK, texel: 2 });
    F.box("impPanel1", u + s * 0.12, y(0.5), n, 0.15, 0.44, 0.17, { color: col, uv: "world", texel: 2 });
    F.box("impTrim", u + s * 0.12, y(0.74), n, 0.13, 0.06, 0.15, { color: BLK });
    F.box("impPanel1", u + s * 0.13, y(0.93), n, 0.17, 0.32, 0.19, { color: col, uv: "world", texel: 2 });
  }
  // belt with pouches, abdomen, chest and back plates
  F.box("impTrim", u, y(1.12), n, 0.46, 0.08, 0.26, { color: BLK });
  for (const dx of [-0.14, 0, 0.14]) F.box("impPanel1", u + dx, y(1.11), n + 0.15, 0.1, 0.07, 0.05, { color: GREY, uv: "world", texel: 3 });
  F.box("impPanel1", u, y(1.22), n, 0.38, 0.14, 0.22, { color: GREY, uv: "world", texel: 2 });
  F.box("impPanel1", u, y(1.43), n + 0.02, 0.46, 0.36, 0.24, { color: col, uv: "world", texel: 2 });
  F.box("impTrim", u, y(1.43), n + 0.145, 0.02, 0.3, 0.01, { color: BLK });
  F.box("impTrim", u, y(1.3), n + 0.145, 0.3, 0.02, 0.01, { color: BLK });
  F.box("impTrim", u + 0.12, y(1.5), n + 0.145, 0.1, 0.06, 0.012, { color: BLK });
  F.box(ledKey, u + 0.12, y(1.5), n + 0.152, 0.03, 0.02, 0.005);
  F.box("impPanel1", u, y(1.42), n - 0.12, 0.4, 0.4, 0.06, { color: col, uv: "world", texel: 2 });
  F.box("impTrim", u, y(1.42), n - 0.16, 0.2, 0.2, 0.03, { color: BLK });
  // shoulder bells (tilted outward) and upper arms
  for (const s of [-1, 1]) {
    F.box("impPanel1", u + s * 0.31, y(1.6), n, 0.2, 0.09, 0.26, { color: col, uv: "world", texel: 2, spin: -s * 0.35 });
    F.box("impPanel1", u + s * 0.32, y(1.38), n, 0.13, 0.3, 0.15, { color: col, uv: "world", texel: 2 });
    F.box("impTrim", u + s * 0.32, y(1.2), n, 0.1, 0.06, 0.12, { color: BLK });
  }
  helmetF(F, u, y(1.68), n, { color: col });
}

/**
 * Honour-guard alcove proud of a wall: black cheeks and lintel, charcoal back, lit soffit, gloss
 * plinth with an accent edge, the armour set on the plinth, cog plaque above. Blocks its footprint.
 */
export function guardAlcove(F, u, opts = {}) {
  const { accentKey = "emitBlue", W = 1.7, H = 2.7, D = 0.75, ledKey = "emitGreen" } = opts;
  F.box("impMetal", u, H / 2, 0.02, W - 0.3, H, 0.03, { color: CHR, texel: 1 });
  for (const s of [-1, 1]) F.box("impTrim", u + s * (W / 2 - 0.075), H / 2, D / 2, 0.15, H, D, { color: BLK, texel: 1 });
  F.box("impTrim", u, H - 0.12, D / 2, W, 0.24, D, { color: BLK, texel: 1 });
  F.box("impMetal", u, H - 0.245, D / 2 - 0.02, W - 0.34, 0.012, D - 0.2, { color: CHR });
  F.box("emitWhiteDim", u, H - 0.252, D / 2 + 0.05, W - 0.6, 0.008, 0.1, { uv: "keep" });
  F.box("impTrim", u, 0.06, D / 2, W - 0.3, 0.12, D - 0.1, { color: BLK, texel: 1 });
  F.box("impGloss", u, 0.125, D / 2, W - 0.4, 0.01, D - 0.2);
  F.box(accentKey, u, 0.09, D - 0.045, W - 0.5, 0.02, 0.012, { uv: "keep" });
  F.box("impTrim", u, H + 0.42, 0.03, 0.9, 0.5, 0.06, { color: BLK });
  F.box("impGloss", u, H + 0.42, 0.062, 0.8, 0.4, 0.012);
  F.decal(IMP_DECAL.cog, u, H + 0.42, 0.07, 0.34);
  F.box(accentKey, u, H + 0.14, 0.062, 0.8, 0.02, 0.012, { uv: "keep" });
  armourStand(F, u, D / 2, { v0: 0.13, accentKey, ledKey });
  F.collider(u - W / 2, u + W / 2, 0, H + 0.7, 0, D + 0.02, "alcove");
}

/** Officers' notice board: black frame, dark felt, pinned notice plates of mixed size, one readout. */
export function noticeBoard(F, u, v, w, h, opts = {}) {
  const { accentKey = "emitBlue", seed = 1, screen = "scrWhite1" } = opts;
  const rand = rng(seed);
  F.box("impTrim", u, v, 0.04, w + 0.16, h + 0.16, 0.08, { color: BLK, texel: 1 });
  F.box("impPanel2", u, v, 0.082, w, h, 0.01, { color: GD, uv: "world", texel: 1 });
  F.box("impMetal", u, v + h / 2 - 0.08, 0.09, w - 0.1, 0.1, 0.008, { color: CHR });
  F.decal(IMP_DECAL.glyphs3, u - w / 2 + 0.45, v + h / 2 - 0.08, 0.096, 0.6, { h: 0.08 });
  F.box(accentKey, u + w / 2 - 0.3, v + h / 2 - 0.08, 0.096, 0.3, 0.02, 0.008, { uv: "keep" });
  // notices: two rows of plates, the right-hand end kept for the readout
  const cols = Math.max(2, Math.floor((w - 1.0) / 0.55));
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      const pw = 0.34 + rand() * 0.14;
      const ph = 0.3 + rand() * 0.16;
      const pu = u - w / 2 + 0.36 + c * 0.55 + (rand() - 0.5) * 0.06;
      const pv = v + (r === 0 ? 0.16 : -0.32) + (rand() - 0.5) * 0.05;
      const col = rand() < 0.7 ? WHITE : GREY;
      F.box("impPanel1", pu, pv, 0.09, pw, ph, 0.006, { color: col, uv: "world", texel: 3, spin: (rand() - 0.5) * 0.08 });
      F.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][Math.floor(rand() * 3)], pu, pv + 0.02, 0.095, pw * 0.7, { h: ph * 0.35 });
      F.box("impTrim", pu, pv + ph / 2 - 0.02, 0.094, 0.03, 0.03, 0.006, { color: BLK });
    }
  }
  F.box("impGloss", u + w / 2 - 0.46, v - 0.1, 0.09, 0.78, 0.52, 0.01);
  F.screen(screen, u + w / 2 - 0.46, v - 0.1, 0.098, 0.7, 0.44);
  F.box(accentKey, u, v - h / 2 - 0.05, 0.085, w * 0.6, 0.02, 0.012, { uv: "keep" });
  F.collider(u - w / 2 - 0.08, u + w / 2 + 0.08, v - h / 2 - 0.08, v + h / 2 + 0.08, 0, 0.11, "board");
}

/**
 * Screen lying on a slope in a frame: the plane first faces +V (a desk top), then leans by `tilt`
 * about U so its far edge rises (tilt > 0 tips the face toward +N, the operator side).
 */
export function slopedScreen(F, key, u, v, n, w, h, tilt) {
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateX(-Math.PI / 2 + tilt);
  return F.add(key, g, u, v, n, { uv: "keep" });
}

/**
 * Sentry post: chest-high black stand, sloped readout on top facing the operator (+N), red / accent
 * lamp pair on a small mast behind it, on a floor plinth.
 */
export function sentryPost(kit, x, z, yaw, opts = {}) {
  const { accentKey = "emitBlue", screen = "scrBlue3" } = opts;
  const f = propFrame(kit, x, 0, z, yaw);
  f.box("impMetal", 0, 0.05, 0, 0.9, 0.1, 0.7, { color: CHR, texel: 1 });
  f.box("impTrim", 0, 0.62, 0, 0.6, 1.14, 0.42, { color: BLK, texel: 1 });
  f.box("impMetal", 0, 0.75, 0.215, 0.5, 0.7, 0.012, { color: CHR, texel: 2 });
  f.box(accentKey, 0, 0.3, 0.222, 0.4, 0.02, 0.012, { uv: "keep" });
  f.decal(IMP_DECAL.glyphs2, 0, 0.95, 0.225, 0.3, { h: 0.12 });
  // readout: gloss slab tilted 0.45 rad toward the operator, screen on its upper face
  const tilt = 0.45;
  f.box("impGloss", 0, 1.24, 0.0, 0.62, 0.05, 0.4, { tilt });
  slopedScreen(f, screen, 0, 1.24 + 0.03 * Math.cos(tilt), 0.03 * Math.sin(tilt), 0.5, 0.26, tilt);
  // lamp mast at the back
  f.box("impTrim", 0, 1.5, -0.16, 0.34, 0.5, 0.08, { color: BLK });
  f.box("impMetal", 0, 1.5, -0.115, 0.28, 0.42, 0.01, { color: CHR });
  f.box("emitRedImp", -0.08, 1.62, -0.108, 0.07, 0.05, 0.01);
  f.box(accentKey, 0.08, 1.62, -0.108, 0.07, 0.05, 0.01);
  f.box("leds", 0, 1.42, -0.108, 0.22, 0.04, 0.008, { uv: "keep" });
  f.collider(-0.45, 0.45, 0, 1.8, -0.35, 0.35, "sentry");
}

// ---------------------------------------------------------------------------
// Deck B — memorial and officers' seating
// ---------------------------------------------------------------------------
/** Memorial wall: charcoal plinth, black glass panel with rows of engraved plaques, crest, warm cove. */
export function memorialWall(F, u0, u1, opts = {}) {
  const { accentKey = "emitBlue", seed = 2, glow = "emitAmberDim", crestEnd = 1 } = opts;
  const rand = rng(seed);
  const w = u1 - u0;
  const cu = (u0 + u1) / 2;
  const H = 2.3;
  const v0 = 0.45;
  // the plaque grid fills the panel from the end away from the crest
  const pu0 = crestEnd > 0 ? u0 + 0.45 : u0 + 2.2;
  F.box("impMetal", cu, 0.2, 0.25, w, 0.4, 0.5, { color: CHR, texel: 1 });
  F.box("impTrim", cu, 0.415, 0.25, w + 0.02, 0.03, 0.52, { color: BLK });
  F.box(accentKey, cu, 0.3, 0.506, w - 0.4, 0.02, 0.012, { uv: "keep" });
  F.box("impTrim", cu, v0 + H / 2, 0.05, w, H + 0.16, 0.1, { color: BLK, texel: 1 });
  F.box("impGloss", cu, v0 + H / 2, 0.105, w - 0.16, H, 0.012);
  const cols = Math.max(2, Math.floor((w - 2.2) / 0.62));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cols; c++) {
      const pu = pu0 + c * 0.62;
      const pv = v0 + 0.5 + r * 0.62;
      F.box("impMetal", pu, pv, 0.118, 0.46, 0.22, 0.012, { color: rand() < 0.15 ? GD : GREY, texel: 2 });
      F.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][(r + c) % 3], pu, pv + 0.03, 0.126, 0.34, { h: 0.08 });
      F.box("impTrim", pu, pv - 0.06, 0.125, 0.3, 0.012, 0.004, { color: BLK });
    }
  }
  // crest and dedication at the crest end
  const cu2 = crestEnd > 0 ? u1 - 1.0 : u0 + 1.0;
  F.decal(IMP_DECAL.cog, cu2, v0 + H * 0.64, 0.115, 0.8);
  F.decal(IMP_DECAL.glyphs3, cu2, v0 + H * 0.28, 0.115, 1.1, { h: 0.16 });
  F.box(accentKey, cu2, v0 + H * 0.38, 0.115, 0.9, 0.015, 0.006, { uv: "keep" });
  // warm cove over the glass: black channel, lens on its underside
  F.box("impTrim", cu, v0 + H + 0.2, 0.15, w, 0.12, 0.3, { color: BLK, texel: 1 });
  F.box(glow, cu, v0 + H + 0.135, 0.18, w - 0.4, 0.008, 0.16, { uv: "keep" });
  F.collider(u0, u1, 0, v0 + H + 0.3, 0, 0.52, "memorial");
}

/** Row of n benches with low tables between, facing `yaw` (bench faces -z locally), centred on x. */
export function benchRow(kit, x, z, n, yaw, opts = {}) {
  const { accentKey = "emitBlue", len = 2.0, gap = 0.6 } = opts;
  const total = n * len + (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    const bx = x - total / 2 + len / 2 + i * (len + gap);
    bench(kit, bx, z, len, yaw, { pad: "fabric", padColor: PALETTE.impGreyDark, accentKey, tag: "bench" });
    if (i < n - 1) table(kit, bx + len / 2 + gap / 2, z, 0.5, 0.56, yaw, { h: 0.5, top: "impGloss", accentKey, tag: "table" });
  }
}

/** Polished black runner with brass edge rails along z (x0..x1 wide). */
export function glossRunner(kit, x0, z0, x1, z1) {
  kit.boxMM("impGloss", [x0, 0.002, z0], [x1, 0.01, z1]);
  kit.boxMM("impMetal", [x0 - 0.06, 0.002, z0], [x0, 0.016, z1], { color: BRASS, texel: 2 });
  kit.boxMM("impMetal", [x1, 0.002, z0], [x1 + 0.06, 0.016, z1], { color: BRASS, texel: 2 });
}

/** Warm downlight can: black cylinder with a recessed amber lens (fixture only; declare the light separately). */
export function warmCan(kit, x, y, z, key = "emitAmberDim") {
  kit.cyl("impTrim", x, y - 0.12, z, 0.22, 0.24, "y", { color: BLK, segments: 18, texel: 1 });
  kit.cyl("impMetal", x, y - 0.245, z, 0.19, 0.012, "y", { color: CHR, segments: 18 });
  kit.cyl(key, x, y - 0.255, z, 0.14, 0.012, "y", { segments: 18, uv: "keep" });
}

/** Wall sconce: black hood with a warm slot on its underside and a thin lit slit on the face. */
export function sconce(F, u, v, key = "emitAmberDim", w = 0.5) {
  F.box("impTrim", u, v, 0.09, w, 0.14, 0.18, { color: BLK, texel: 1 });
  F.box("impMetal", u, v - 0.075, 0.1, w - 0.1, 0.01, 0.14, { color: CHR });
  F.box(key, u, v - 0.082, 0.1, w - 0.16, 0.008, 0.1, { uv: "keep" });
  F.box(key, u, v + 0.02, 0.182, w - 0.2, 0.015, 0.006, { uv: "keep" });
}

// ---------------------------------------------------------------------------
// Deck C — crew: roster board, weapons check, helmet rack, hazard fields
// ---------------------------------------------------------------------------
/** Duty roster board: header, 2 x 3 readouts, LED row, accent underline. */
export function rosterBoard(F, u, v, w, h, opts = {}) {
  const { accentKey = "emitBlue", screens = ["scrGreen0", "scrGreen1", "scrWhite0", "scrGreen2", "scrWhite1", "scrGreen3"] } = opts;
  F.box("impTrim", u, v, 0.06, w + 0.2, h + 0.2, 0.12, { color: BLK, texel: 1 });
  F.box("impMetal", u, v, 0.122, w, h, 0.01, { color: CHR, texel: 1 });
  F.box("impTrim", u, v + h / 2 - 0.14, 0.13, w - 0.1, 0.22, 0.01, { color: BLK });
  F.decal(IMP_DECAL.glyphs3, u - w / 2 + 0.7, v + h / 2 - 0.14, 0.136, 1.0, { h: 0.14 });
  F.box("leds", u + w / 2 - 0.55, v + h / 2 - 0.14, 0.136, 0.8, 0.05, 0.006, { uv: "keep" });
  const cols = 3;
  const rows = 2;
  const sw = (w - 0.2 - (cols - 1) * 0.1) / cols;
  const sh = (h - 0.5 - (rows - 1) * 0.1) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const su = u - w / 2 + 0.1 + sw / 2 + c * (sw + 0.1);
      const sv = v + h / 2 - 0.36 - sh / 2 - r * (sh + 0.1);
      F.box("impGloss", su, sv, 0.13, sw + 0.04, sh + 0.04, 0.008);
      F.screen(screens[(r * cols + c) % screens.length], su, sv, 0.136, sw, sh);
    }
  }
  F.box(accentKey, u, v - h / 2 - 0.06, 0.125, w * 0.7, 0.025, 0.012, { uv: "keep" });
  F.collider(u - w / 2 - 0.1, u + w / 2 + 0.1, v - h / 2 - 0.1, v + h / 2 + 0.1, 0, 0.14, "board");
}

/**
 * Weapons-check booth: full-height black cheeks and shutter housing, a half-lowered slatted shutter
 * over an issue window, the counter below, helmets and a readout on the lit back wall.
 */
export function checkBooth(F, u, w, hRoom, opts = {}) {
  const { accentKey = "emitBlue", D = 0.95, counterH = 0.95 } = opts;
  for (const s of [-1, 1]) F.box("impTrim", u + s * (w / 2 - 0.1), hRoom / 2, D / 2, 0.2, hRoom, D, { color: BLK, texel: 1 });
  const lintelV0 = 3.05;
  F.box("impTrim", u, (lintelV0 + hRoom) / 2, D / 2, w, hRoom - lintelV0, D, { color: BLK, texel: 1 });
  F.box("impMetal", u, 2.94, D - 0.14, w - 0.4, 0.22, 0.24, { color: CHR, texel: 1 });
  for (let v = 2.8; v > 1.9; v -= 0.07) F.box("impMetal", u, v, D - 0.12, w - 0.5, 0.06, 0.02, { color: GD, texel: 2 });
  F.box("chevronY", u, 1.85, D - 0.12, w - 0.5, 0.07, 0.03, { texel: 1.5 });
  // counter
  F.box("impTrim", u, counterH / 2, D - 0.35, w - 0.4, counterH, 0.7, { color: BLK, texel: 1 });
  F.box("impPanel1", u, counterH / 2 + 0.06, D - 0.004, w - 0.5, counterH - 0.32, 0.02, { color: WHITE, uv: "world", texel: 1 });
  for (let x = u - w / 2 + 1.1; x < u + w / 2 - 0.6; x += 1.1) F.box("impTrim", x, counterH / 2 + 0.06, D + 0.008, 0.02, counterH - 0.36, 0.008, { color: BLK });
  F.box("impMetal", u, counterH + 0.02, D - 0.35, w - 0.34, 0.05, 0.8, { color: GREY, texel: 1 });
  F.box("emitAmberDim", u, 0.12, D + 0.004, w - 0.7, 0.025, 0.01, { uv: "keep" });
  // interior: charcoal back, shelf with helmets, lamp, readout
  F.box("impMetal", u, 2.0, 0.02, w - 0.5, 1.9, 0.03, { color: CHR, texel: 1 });
  F.box("impMetal", u, 1.62, 0.25, w - 0.7, 0.04, 0.4, { color: GD, texel: 1 });
  for (let k = 0; k < 3; k++) helmetF(F, u - 1.1 + k * 0.75, 1.64, 0.25, {});
  F.box("impTrim", u, 2.76, 0.32, w - 0.6, 0.1, 0.26, { color: BLK });
  F.box("emitWhiteDim", u, 2.705, 0.32, w - 0.8, 0.012, 0.16, { uv: "keep" });
  F.box("impGloss", u + w / 2 - 0.95, 2.25, 0.04, 0.88, 0.56, 0.01);
  F.screen("scrAmber2", u + w / 2 - 0.95, 2.25, 0.048, 0.8, 0.48);
  F.box("impTrim", u - w / 2 + 0.8, 2.3, 0.06, 0.5, 0.7, 0.1, { color: BLK });
  F.box("leds", u - w / 2 + 0.8, 2.5, 0.112, 0.36, 0.05, 0.006, { uv: "keep" });
  F.box("emitRedImp", u - w / 2 + 0.65, 2.15, 0.112, 0.06, 0.04, 0.006);
  F.box(accentKey, u - w / 2 + 0.92, 2.15, 0.112, 0.06, 0.04, 0.006);
  // signage on the lintel face
  F.decal(IMP_DECAL.restricted, u - w / 2 + 0.7, 3.55, D + 0.006, 0.5);
  F.decal(IMP_DECAL.glyphs3, u + 0.4, 3.55, D + 0.006, 1.6, { h: 0.24 });
  F.box(accentKey, u, 3.12, D + 0.006, w - 0.6, 0.03, 0.012, { uv: "keep" });
  F.collider(u - w / 2, u + w / 2, 0, hRoom, 0, D + 0.02, "booth");
}

/** Helmet rack: black back board with a grey inset, three shelves of five helmets, accent strip, sign. */
export function helmetRack(F, u, opts = {}) {
  const { accentKey = "emitBlue", W = 3.0, H = 2.5, perShelf = 5 } = opts;
  F.box("impTrim", u, H / 2, 0.03, W, H, 0.06, { color: BLK, texel: 1 });
  F.box("impPanel1", u, H / 2, 0.062, W - 0.16, H - 0.16, 0.01, { color: GREY, uv: "world", texel: 1 });
  F.box("impMetal", u, 0.06, 0.25, W + 0.04, 0.12, 0.5, { color: CHR, texel: 1 });
  for (let s = 0; s < 3; s++) {
    const v = 0.62 + s * 0.6;
    F.box("impMetal", u, v, 0.24, W - 0.1, 0.04, 0.44, { color: GD, texel: 1 });
    for (const bx of [-1, 1]) F.box("impTrim", u + bx * (W / 2 - 0.15), v - 0.1, 0.24, 0.05, 0.16, 0.4, { color: BLK });
    for (let k = 0; k < perShelf; k++) {
      const hu = u - W / 2 + 0.35 + ((W - 0.7) * k) / (perShelf - 1);
      if (s === 2 && k === perShelf - 2) continue; // one issued out
      helmetF(F, hu, v + 0.02, 0.24, {});
    }
  }
  F.box("impTrim", u, H - 0.06, 0.1, W - 0.2, 0.06, 0.2, { color: BLK });
  F.box(accentKey, u, H - 0.095, 0.1, W - 0.6, 0.008, 0.1, { uv: "keep" });
  F.decal(IMP_DECAL.glyphs2, u, H + 0.25, 0.001, 0.8, { h: 0.16 });
  F.collider(u - W / 2 - 0.03, u + W / 2 + 0.03, 0, H, 0, 0.5, "rack");
}

/** Hazard bars along an axis-aligned segment: alternating yellow / black plates (mesh edges, no shimmer). */
export function hazardBars(kit, x0, z0, x1, z1, opts = {}) {
  const { w = 0.28, bar = 0.32, color = YELLOW, y = 0 } = opts;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const lo = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
  const hi = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const c = alongX ? z0 : x0;
  let k = 0;
  for (let a = lo; a < hi - 0.02; a += bar, k++) {
    const b = Math.min(hi, a + bar);
    const col = k % 2 ? BLK : color;
    if (alongX) kit.boxMM("impPanel1", [a, y + 0.002, c - w / 2], [b, y + 0.012, c + w / 2], { color: col, uv: "world", texel: 1 });
    else kit.boxMM("impPanel1", [c - w / 2, y + 0.002, a], [c + w / 2, y + 0.012, b], { color: col, uv: "world", texel: 1 });
  }
}
/** Hazard border (four bar strips) around a floor rectangle. */
export function hazardBorder(kit, x0, z0, x1, z1, w = 0.28, color = YELLOW) {
  hazardBars(kit, x0, z0 + w / 2, x1, z0 + w / 2, { w, color });
  hazardBars(kit, x0, z1 - w / 2, x1, z1 - w / 2, { w, color });
  hazardBars(kit, x0 + w / 2, z0 + w, x0 + w / 2, z1 - w, { w, color });
  hazardBars(kit, x1 - w / 2, z0 + w, x1 - w / 2, z1 - w, { w, color });
}

// ---------------------------------------------------------------------------
// Deck D — engineering: manifold, vent stack, gratings, warning lamps
// ---------------------------------------------------------------------------
/** Hand valve wheel in the wall frame's plane (axis along n) at (u, v, n). */
export function valveWheelF(F, u, v, n, r, color = PALETTE.impRed) {
  F.add("impMetalRough", new THREE.TorusGeometry(r, r * 0.13, 8, 20), u, v, n, { color, uv: "scale", uvScale: [4, 1] });
  for (let k = 0; k < 3; k++) F.box("impMetalRough", u, v, n, r * 0.12, r * 2, r * 0.12, { color, spin: (k * Math.PI) / 3 });
  F.cylN("impMetal", u, v, n, r * 0.22, r * 0.3, { color: GD, segments: 10 });
  F.cylN("impMetal", u, v, n - 0.18, r * 0.14, 0.36, { color: GD, segments: 8 });
}
/** Dial gauge facing +n: black housing, white face, grey bezel, needle and a red tick. */
export function gaugeF(F, u, v, n, r = 0.1, opts = {}) {
  const { seed = 1 } = opts;
  const rand = rng(seed);
  F.cylN("impTrim", u, v, n - 0.05, r * 1.15, 0.1, { color: BLK, segments: 16 });
  F.cylN("impPanel", u, v, n + 0.002, r * 0.95, 0.004, { color: WHITE, segments: 16, uv: "world", texel: 3 });
  F.add("impMetal", new THREE.TorusGeometry(r, r * 0.09, 6, 18), u, v, n + 0.005, { color: GREY, uv: "scale", uvScale: [3, 1] });
  const ang = -0.9 + rand() * 1.8;
  F.box("impTrim", u + Math.sin(ang) * r * 0.25, v + Math.cos(ang) * r * 0.25, n + 0.009, r * 0.08, r * 1.1, 0.004, { color: BLK, spin: -ang });
  F.box("emitRedImp", u + r * 0.55, v + r * 0.55, n + 0.009, r * 0.14, r * 0.14, 0.003);
}

/**
 * Wall pipe manifold: low and high headers with flanges, risers carrying valve wheels, gauges and
 * T-blocks, end blocks with clamped drops into the ceiling, a drip tray. Blocks its footprint.
 */
export function pipeManifold(F, u0, u1, hRoom, opts = {}) {
  const { yLo = 1.25, yHi = 3.15, risers = 5, seed = 4 } = opts;
  const rand = rng(seed);
  const cu = (u0 + u1) / 2;
  const len = u1 - u0;
  const n = 0.5;
  F.cylU("impMetal", cu, yLo, n, 0.15, len + 0.6, { color: GD, segments: 12 });
  F.cylU("impMetal", cu, yHi, n, 0.11, len + 0.6, { color: GREY, segments: 12 });
  for (let x = u0 + 0.6; x < u1 - 0.3; x += 2.2) {
    F.cylU("impMetal", x, yLo, n, 0.2, 0.12, { color: CHR, segments: 12 });
    F.cylU("impMetal", x + 0.9, yHi, n, 0.15, 0.1, { color: CHR, segments: 12 });
  }
  for (let k = 0; k < risers; k++) {
    const x = u0 + (len * k) / Math.max(1, risers - 1);
    const ym = (yLo + yHi) / 2;
    F.cylV("impMetal", x, ym, n, 0.07, yHi - yLo, { color: k % 2 ? GD : GREY, segments: 10 });
    F.box("impTrim", x, yLo, n, 0.3, 0.42, 0.42, { color: BLK, texel: 1 });
    F.box("impTrim", x, ym + 0.1, n, 0.2, 0.3, 0.22, { color: BLK, texel: 1 });
    valveWheelF(F, x, ym + 0.1, n + 0.42, 0.17, k % 3 === 2 ? PALETTE.impAmber : PALETTE.impRed);
    if (k % 2 === 0 && k < risers - 1) gaugeF(F, x + 0.5, yHi - 0.55, n + 0.14, 0.1, { seed: seed + k });
    if (k % 2 === 1) F.box(rand() < 0.5 ? "emitAmber" : "emitGreen", x + 0.22, yLo + 0.28, n + 0.12, 0.05, 0.04, 0.01);
  }
  for (const x of [u0 - 0.35, u1 + 0.35]) {
    F.box("impTrim", x, (yLo + yHi) / 2, 0.3, 0.7, yHi - yLo + 0.9, 0.6, { color: BLK, texel: 1 });
    F.box("impMetal", x, yHi + 0.5, 0.3, 0.8, 0.1, 0.7, { color: CHR, texel: 1 });
    F.cylV("impMetal", x, (yHi + 0.55 + hRoom) / 2, 0.3, 0.11, hRoom - yHi - 0.55, { color: GD, segments: 12 });
    F.box("impTrim", x, yHi + 0.9, 0.3, 0.32, 0.1, 0.32, { color: BLK });
    F.decal(IMP_DECAL.power, x, yLo + 0.2, 0.605, 0.3);
    F.box("emitRedDim", x, yHi + 0.3, 0.605, 0.4, 0.03, 0.01, { uv: "keep" });
  }
  F.box("impMetal", cu, 0.05, 0.47, len + 1.4, 0.1, 0.94, { color: CHR, texel: 1 });
  F.collider(u0 - 0.75, u1 + 0.75, 0, yHi + 0.6, 0, 0.98, "manifold");
}

/**
 * Bank of tool lockers along a wall (u0..u1): black carcass on a charcoal plinth, grey doors with
 * louvre slots, latch plates, number decals, one door standing open showing a lit tool board.
 */
export function lockerBank(F, u0, u1, opts = {}) {
  const { H = 2.2, D = 0.55, openIndex = 2, accentKey = "emitAmber", seed = 5 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  const n = Math.max(2, Math.floor(len / 1.05));
  const lw = len / n;
  const cu = (u0 + u1) / 2;
  F.box("impTrim", cu, H / 2, D / 2 - 0.02, len, H, D - 0.04, { color: BLK, texel: 1 });
  F.box("impMetal", cu, 0.06, D / 2, len + 0.08, 0.12, D + 0.08, { color: CHR, texel: 1 });
  F.box("impMetal", cu, H + 0.04, D / 2, len + 0.04, 0.08, D + 0.04, { color: CHR, texel: 1 });
  F.box(accentKey, cu, H + 0.005, D + 0.03, len - 0.4, 0.02, 0.012, { uv: "keep" });
  for (let i = 0; i < n; i++) {
    const lu = u0 + lw * (i + 0.5);
    const open = i === openIndex;
    if (!open) {
      F.box("impPanel1", lu, H / 2 + 0.06, D - 0.005, lw - 0.1, H - 0.3, 0.03, { color: rand() < 0.25 ? GD : GREY, uv: "world", texel: 1.5 });
      for (let s = 0; s < 4; s++) F.box("impTrim", lu, H - 0.5 - s * 0.09, D + 0.012, lw - 0.4, 0.03, 0.01, { color: BLK });
      F.box("impTrim", lu + lw / 2 - 0.2, 1.05, D + 0.014, 0.06, 0.26, 0.02, { color: BLK });
      F.box("impMetal", lu + lw / 2 - 0.2, 1.05, D + 0.026, 0.03, 0.12, 0.01, { color: GD });
      F.box(rand() < 0.7 ? "emitGreen" : "emitRedImp", lu - lw / 2 + 0.16, H - 0.36, D + 0.012, 0.04, 0.04, 0.008);
    } else {
      // open door swung out along +N from the hinge side, lit interior with a tool board
      F.box("impMetal", lu, H / 2 + 0.06, 0.03, lw - 0.16, H - 0.3, 0.02, { color: CHR, texel: 1 });
      F.box("emitWhiteDim", lu, H - 0.26, D / 2, lw - 0.36, 0.01, 0.12, { uv: "keep" });
      for (let k = 0; k < 4; k++) {
        const tu = lu - lw / 2 + 0.22 + k * ((lw - 0.44) / 3);
        F.box("impMetal", tu, 1.05 + (k % 2) * 0.35, 0.09, 0.05, 0.5 + rand() * 0.3, 0.05, { color: [GD, GREY, BLK][k % 3] });
        F.box("impTrim", tu, 1.45 + (k % 2) * 0.35, 0.09, 0.09, 0.08, 0.09, { color: BLK });
      }
      F.box("impMetal", lu, 0.5, D / 2 - 0.02, lw - 0.3, 0.04, D - 0.2, { color: GD, texel: 1 });
      F.box("impTrim", lu - 0.1, 0.62, D / 2, 0.36, 0.2, 0.26, { color: BLK });
      F.box("impPanel1", lu + lw / 2 - 0.08, H / 2 + 0.06, D + (lw - 0.1) / 2, 0.03, H - 0.3, lw - 0.1, { color: GREY, uv: "world", texel: 1.5 });
    }
    F.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][i % 3], lu, H - 0.12, D + 0.012, 0.22);
    if (i > 0) F.box("impTrim", lu - lw / 2, H / 2, D - 0.01, 0.04, H, 0.06, { color: BLK });
  }
  F.decal(IMP_DECAL.power, u0 + 0.5, H + 0.45, 0.001, 0.36);
  F.decal(IMP_DECAL.glyphs3, cu, H + 0.45, 0.001, 1.4, { h: 0.18 });
  const openU = u0 + lw * (openIndex + 0.5);
  F.collider(u0 - 0.04, u1 + 0.04, 0, H + 0.1, 0, D + 0.05, "lockers");
  F.collider(openU + lw / 2 - 0.12, openU + lw / 2 + 0.02, 0, H, D, D + lw - 0.1, "lockerdoor");
}

/** Caged warning lamp (dome axis up) at a room-local position. */
export function warningLamp(kit, x, y, z, key = "emitRedImp", r = 0.09) {
  kit.add(key, new THREE.SphereGeometry(r, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), { pos: [x, y - r * 0.15, z] });
  kit.cyl("impTrim", x, y - r * 0.15 - 0.03, z, r * 1.2, 0.06, "y", { color: BLK, segments: 12 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box("impMetal", x + Math.cos(a) * r * 0.9, y + r * 0.35, z + Math.sin(a) * r * 0.9, 0.012, r * 1.3, 0.012, { color: GD });
  }
  kit.add("impMetal", new THREE.TorusGeometry(r * 0.95, 0.008, 6, 14), { pos: [x, y + r * 0.85, z], rot: [Math.PI / 2, 0, 0], color: GD, uv: "scale", uvScale: [4, 1] });
}
/** Caged warning lamp on a wall frame, dome pointing into the room. */
export function warningLampF(F, u, v, key = "emitRedImp", r = 0.09) {
  F.box("impTrim", u, v, 0.03, r * 2.8, r * 2.8, 0.06, { color: BLK });
  F.cylN("impTrim", u, v, 0.09, r * 1.2, 0.06, { color: BLK, segments: 12 });
  F.add(key, new THREE.SphereGeometry(r, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(Math.PI / 2), u, v, 0.12);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    F.box("impMetal", u + Math.cos(a) * r * 0.9, v + Math.sin(a) * r * 0.9, 0.16, 0.012, 0.012, r * 1.3, { color: GD });
  }
  F.add("impMetal", new THREE.TorusGeometry(r * 0.95, 0.008, 6, 14), u, v, 0.21, { color: GD, uv: "scale", uvScale: [4, 1] });
}

/**
 * Floor grating strip: black pit plate, optional lit strip beneath, grate quad with proud rail bars,
 * grey curb. The room's default floor keeps it walkable.
 */
export function gratingStrip(kit, x0, z0, x1, z1, opts = {}) {
  const { glow = null, y = 0, bars = true } = opts;
  const w = x1 - x0;
  const d = z1 - z0;
  const alongZ = d >= w;
  kit.boxMM("impTrim", [x0, y + 0.002, z0], [x1, y + 0.008, z1], { color: BLK, texel: 1 });
  if (glow) {
    if (alongZ) kit.boxMM(glow, [(x0 + x1) / 2 - 0.07, y + 0.009, z0 + 0.15], [(x0 + x1) / 2 + 0.07, y + 0.016, z1 - 0.15], { uv: "keep" });
    else kit.boxMM(glow, [x0 + 0.15, y + 0.009, (z0 + z1) / 2 - 0.07], [x1 - 0.15, y + 0.016, (z0 + z1) / 2 + 0.07], { uv: "keep" });
  }
  kit.boxMM("impMetal", [x0 - 0.06, y + 0.002, z0 - 0.06], [x1 + 0.06, y + 0.034, z0], { color: GD });
  kit.boxMM("impMetal", [x0 - 0.06, y + 0.002, z1], [x1 + 0.06, y + 0.034, z1 + 0.06], { color: GD });
  kit.boxMM("impMetal", [x0 - 0.06, y + 0.002, z0], [x0, y + 0.034, z1], { color: GD });
  kit.boxMM("impMetal", [x1, y + 0.002, z0], [x1 + 0.06, y + 0.034, z1], { color: GD });
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(x0 + x1) / 2, y + 0.028, (z0 + z1) / 2], uv: "scale", uvScale: [w / GRATE_TILE[0], d / GRATE_TILE[1]] });
  if (bars) {
    if (alongZ) for (let z = z0 + 0.3; z < z1 - 0.15; z += 0.6) kit.box("impMetal", (x0 + x1) / 2, y + 0.036, z, w, 0.016, 0.03, { color: GD, texel: 2 });
    else for (let x = x0 + 0.3; x < x1 - 0.15; x += 0.6) kit.box("impMetal", x, y + 0.036, (z0 + z1) / 2, 0.03, 0.016, d, { color: GD, texel: 2 });
  }
}

/**
 * Vent stack in a corner: full-height louvred black column with three amber slits humming behind the
 * slats on the room-facing sides, a duct into the ceiling, a caged red lamp and a hazard border.
 */
export function ventStack(kit, x, z, h, faces, opts = {}) {
  const { W = 1.1, glow = "emitAmberDim", lampKey = "emitRedImp" } = opts;
  kit.box("impTrim", x, h / 2, z, W, h, W, { color: BLK, texel: 1 });
  kit.box("impMetal", x, 0.08, z, W + 0.12, 0.16, W + 0.12, { color: CHR, texel: 1 });
  kit.box("impMetal", x, 3.52, z, W + 0.1, 0.14, W + 0.1, { color: CHR, texel: 1 });
  kit.cyl("impMetal", x, (3.6 + h) / 2, z, 0.32, h - 3.6, "y", { color: GD, segments: 16 });
  kit.cyl("impTrim", x, 3.68, z, 0.38, 0.1, "y", { color: BLK, segments: 16 });
  for (const face of faces) {
    const nx = face === "-x" ? -1 : face === "+x" ? 1 : 0;
    const nz = face === "-z" ? -1 : face === "+z" ? 1 : 0;
    const fx = x + nx * (W / 2);
    const fz = z + nz * (W / 2);
    const along = nx ? "z" : "x";
    const slitOff = [-0.3, 0, 0.3];
    for (const o of slitOff) {
      const sx = fx + nx * 0.006 + (along === "x" ? o : 0);
      const sz = fz + nz * 0.006 + (along === "z" ? o : 0);
      kit.box(glow, sx, 1.95, sz, along === "x" ? 0.09 : 0.006, 2.6, along === "z" ? 0.09 : 0.006, { uv: "keep" });
    }
    for (let v = 0.7; v < 3.25; v += 0.2) {
      const px = fx + nx * 0.05;
      const pz = fz + nz * 0.05;
      kit.box("impMetal", px, v, pz, along === "x" ? W - 0.24 : 0.09, 0.045, along === "z" ? W - 0.24 : 0.09, { color: GD, rot: [along === "x" ? -nz * 0.6 : 0, 0, along === "z" ? nx * 0.6 : 0] });
    }
    kit.box("impTrim", fx + nx * 0.03, 0.48, fz + nz * 0.03, along === "x" ? W - 0.1 : 0.06, 0.08, along === "z" ? W - 0.1 : 0.06, { color: BLK });
    kit.box("impTrim", fx + nx * 0.03, 3.4, fz + nz * 0.03, along === "x" ? W - 0.1 : 0.06, 0.08, along === "z" ? W - 0.1 : 0.06, { color: BLK });
  }
  const f0 = faces[0];
  const lx = x + (f0 === "-x" ? -W / 2 - 0.1 : f0 === "+x" ? W / 2 + 0.1 : 0);
  const lz = z + (f0 === "-z" ? -W / 2 - 0.1 : f0 === "+z" ? W / 2 + 0.1 : 0);
  kit.box("impTrim", lx, 3.05, lz, f0.includes("x") ? 0.2 : 0.4, 0.12, f0.includes("z") ? 0.2 : 0.4, { color: BLK });
  warningLamp(kit, lx, 3.2, lz, lampKey, 0.08);
  const g = new THREE.PlaneGeometry(0.42, 0.42);
  if (f0 === "-x") g.rotateY(-Math.PI / 2);
  else if (f0 === "+x") g.rotateY(Math.PI / 2);
  else if (f0 === "-z") g.rotateY(Math.PI);
  kit.add("decalImp", g, { pos: [x + (f0 === "-x" ? -W / 2 - 0.004 : f0 === "+x" ? W / 2 + 0.004 : 0), 2.0, z + (f0 === "-z" ? -W / 2 - 0.004 : f0 === "+z" ? W / 2 + 0.004 : 0)], uv: "keep", uvRect: impDecalRect(IMP_DECAL.vacuum) });
  hazardBorder(kit, x - W / 2 - 0.5, z - W / 2 - 0.5, x + W / 2 + 0.5, z + W / 2 + 0.5, 0.22);
  kit.collider([x - W / 2 - 0.08, 0, z - W / 2 - 0.08], [x + W / 2 + 0.08, h, z + W / 2 + 0.08], "stack");
}

/** Conduit run along a ceiling (or any axis-aligned z run): pipes with clamps every `clampStep`. */
export function conduitRun(kit, xs, y, z0, z1, opts = {}) {
  const { rs = [0.06, 0.045, 0.08], colors = [GD, CHR, GREY], clampStep = 3.0 } = opts;
  xs.forEach((x, i) => {
    const r = rs[i % rs.length];
    kit.cyl("impMetal", x, y, (z0 + z1) / 2, r, z1 - z0, "z", { color: colors[i % colors.length], segments: 10 });
  });
  const x0 = Math.min(...xs) - 0.1;
  const x1 = Math.max(...xs) + 0.1;
  for (let z = z0 + 1.0; z < z1 - 0.5; z += clampStep) kit.boxMM("impTrim", [x0, y - 0.1, z - 0.04], [x1, y + 0.1, z + 0.04], { color: BLK, texel: 2 });
}

// ---------------------------------------------------------------------------
// Deck E — hangar: fuel lines, crates, status board, deck lane, work lights
// ---------------------------------------------------------------------------
/** Fuel lines along a wall: heavy main with flanges and clamps, a thinner return, coupler stations with hanging hoses. */
export function fuelLine(F, u0, u1, v, opts = {}) {
  const { stations = 3, seed = 6 } = opts;
  const rand = rng(seed);
  const cu = (u0 + u1) / 2;
  const len = u1 - u0;
  F.cylU("impMetal", cu, v, 0.18, 0.09, len, { color: GD, segments: 12 });
  F.cylU("impMetal", cu, v + 0.32, 0.15, 0.055, len, { color: GREY, segments: 10 });
  for (let x = u0 + 0.8; x < u1 - 0.4; x += 1.6) {
    F.box("impTrim", x, v + 0.16, 0.08, 0.1, 0.62, 0.18, { color: BLK });
    F.cylU("impMetal", x + 0.6, v, 0.18, 0.12, 0.1, { color: CHR, segments: 12 });
  }
  for (let k = 0; k < stations; k++) {
    const us = u0 + (len * (k + 0.5)) / stations;
    F.cylU("impMetal", us, v, 0.18, 0.15, 0.3, { color: CHR, segments: 12 });
    F.cylV("impMetal", us, v - 0.3, 0.32, 0.075, 0.3, { color: GD, segments: 10 });
    F.cylV("impTrim", us, v - 0.48, 0.32, 0.09, 0.08, { color: BLK, segments: 10 });
    F.box("impMetal", us, v - 0.2, 0.32, 0.22, 0.06, 0.22, { color: GREY, texel: 2 });
    // hanging hose loop to a capped end
    F.add("impMetal", new THREE.TorusGeometry(0.42, 0.028, 8, 24, Math.PI).rotateZ(Math.PI), us + 0.42, v - 0.4, 0.32, { color: BLK, uv: "scale", uvScale: [6, 1] });
    F.cylV("impMetal", us + 0.84, v - 0.5, 0.32, 0.045, 0.34, { color: GD, segments: 8 });
    F.cylV("impTrim", us + 0.84, v - 0.7, 0.32, 0.06, 0.08, { color: BLK, segments: 8 });
    F.box(rand() < 0.7 ? "emitGreen" : "emitRedImp", us, v + 0.14, 0.34, 0.05, 0.03, 0.01);
    F.decal(IMP_DECAL.hazard, us, v + 0.66, 0.001, 0.3);
    F.decal(IMP_DECAL.glyphs1, us + 0.5, v + 0.66, 0.001, 0.36, { h: 0.1 });
  }
  F.collider(u0, u1, v - 0.8, v + 0.45, 0, 0.5, "fuel");
}

/** Bay status board: four amber readouts under bay numerals, LED row, hazard bar along the bottom. */
export function bayStatusBoard(F, u, v, w, h, opts = {}) {
  const { accentKey = "emitAmber", screens = ["scrAmber0", "scrAmber1", "scrAmber2", "scrAmber3"], labels = [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs1] } = opts;
  F.box("impTrim", u, v, 0.06, w + 0.2, h + 0.2, 0.12, { color: BLK, texel: 1 });
  F.box("impPanel1", u, v, 0.122, w, h, 0.01, { color: GD, uv: "world", texel: 1 });
  const n = screens.length;
  const sw = (w - 0.2 - (n - 1) * 0.12) / n;
  for (let i = 0; i < n; i++) {
    const su = u - w / 2 + 0.1 + sw / 2 + i * (sw + 0.12);
    F.box("impTrim", su, v + h / 2 - 0.2, 0.13, sw, 0.3, 0.01, { color: BLK });
    F.decal(labels[i % labels.length], su - sw / 2 + 0.22, v + h / 2 - 0.2, 0.136, 0.26);
    F.box(i === 2 ? "emitRedImp" : accentKey, su + sw / 2 - 0.15, v + h / 2 - 0.2, 0.136, 0.1, 0.06, 0.008);
    F.box("impGloss", su, v - 0.12, 0.13, sw + 0.02, h - 0.72, 0.008);
    F.screen(screens[i], su, v - 0.12, 0.136, sw - 0.06, h - 0.8);
  }
  F.box("chevronY", u, v - h / 2 - 0.04, 0.125, w + 0.1, 0.1, 0.012, { texel: 1.5 });
  F.collider(u - w / 2 - 0.1, u + w / 2 + 0.1, v - h / 2 - 0.1, v + h / 2 + 0.1, 0, 0.14, "board");
}

/**
 * Painted deck lane over the floor rect: yellow edge lines along the long axis, dashed centre line and
 * direction arrows `arrows: [{ at, yaw }]` (at = position along the long axis; yaw 0 = -z, PI = +z,
 * PI/2 = -x, -PI/2 = +x).
 */
export function deckLane(kit, x0, z0, x1, z1, opts = {}) {
  const { arrows = [], dashes = true, size = 1.6 } = opts;
  const alongZ = z1 - z0 >= x1 - x0;
  if (alongZ) {
    kit.boxMM("impPanel1", [x0, 0.003, z0], [x0 + 0.14, 0.009, z1], { color: YELLOW, uv: "world", texel: 1 });
    kit.boxMM("impPanel1", [x1 - 0.14, 0.003, z0], [x1, 0.009, z1], { color: YELLOW, uv: "world", texel: 1 });
    const cx = (x0 + x1) / 2;
    if (dashes) for (let z = z0 + 0.6; z < z1 - 0.8; z += 1.6) kit.boxMM("impPanel1", [cx - 0.05, 0.003, z], [cx + 0.05, 0.009, z + 0.8], { color: WHITE, uv: "world", texel: 1 });
  } else {
    kit.boxMM("impPanel1", [x0, 0.003, z0], [x1, 0.009, z0 + 0.14], { color: YELLOW, uv: "world", texel: 1 });
    kit.boxMM("impPanel1", [x0, 0.003, z1 - 0.14], [x1, 0.009, z1], { color: YELLOW, uv: "world", texel: 1 });
    const cz = (z0 + z1) / 2;
    if (dashes) for (let x = x0 + 0.6; x < x1 - 0.8; x += 1.6) kit.boxMM("impPanel1", [x, 0.003, cz - 0.05], [x + 0.8, 0.009, cz + 0.05], { color: WHITE, uv: "world", texel: 1 });
  }
  for (const { at, yaw } of arrows) {
    const g = new THREE.PlaneGeometry(size, size);
    g.rotateX(-Math.PI / 2);
    g.rotateY(yaw);
    const pos = alongZ ? [(x0 + x1) / 2, 0.012, at] : [at, 0.012, (z0 + z1) / 2];
    kit.add("decalImp", g, { pos, uv: "keep", uvRect: impDecalRect(IMP_DECAL.arrowUp) });
  }
}

/** Tripod work light: three splayed legs, mast, hooded head aimed down-forward, cable on the deck. */
export function workLight(kit, x, z, yaw, opts = {}) {
  const { key = "emitWhiteSoft", headY = 2.35 } = opts;
  const f = propFrame(kit, x, 0, z, yaw);
  const hub = f.pos(0, 1.15, 0);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
    const foot = f.pos(Math.cos(a) * 0.5, 0.02, Math.sin(a) * 0.5);
    rod(kit, "impMetal", hub.toArray(), foot.toArray(), 0.018, { color: GD });
    f.box("impTrim", Math.cos(a) * 0.5, 0.025, Math.sin(a) * 0.5, 0.1, 0.05, 0.1, { color: BLK });
  }
  f.cylV("impMetal", 0, 1.15, 0, 0.05, 0.16, { color: CHR, segments: 10 });
  f.cylV("impMetal", 0, (1.2 + headY) / 2, 0, 0.025, headY - 1.2, { color: GD, segments: 8 });
  f.box("impMetal", 0, headY, 0, 0.12, 0.14, 0.14, { color: CHR, texel: 2 });
  // hood: open box tilted 35° down toward -z (the prop's front), lens recessed inside
  const tilt = 0.6;
  f.box("impTrim", 0, headY + 0.05, -0.12, 0.5, 0.06, 0.34, { color: BLK, tilt });
  f.box("impTrim", 0, headY - 0.13, -0.24, 0.5, 0.06, 0.12, { color: BLK, tilt });
  for (const s of [-1, 1]) f.box("impTrim", s * 0.235, headY - 0.03, -0.14, 0.03, 0.22, 0.34, { color: BLK, tilt });
  f.box("impMetal", 0, headY - 0.02, -0.02, 0.44, 0.18, 0.02, { color: CHR, tilt });
  f.box(key, 0, headY - 0.03, -0.05, 0.36, 0.14, 0.012, { uv: "keep", tilt });
  f.box("impMetal", 0, headY + 0.13, 0.05, 0.16, 0.03, 0.03, { color: GD });
  // cable to the deck
  const a = f.pos(0.05, 1.05, 0.1);
  const b = f.pos(0.6, 0.02, 0.9);
  rod(kit, "impMetal", a.toArray(), b.toArray(), 0.014, { color: BLK });
  f.collider(-0.5, 0.5, 0, headY + 0.3, -0.5, 0.5, "worklight");
}

/** Two stacked Imperial crates and a small one beside, in a corner. */
export function crateCorner(kit, x, z, opts = {}) {
  const { seed = 3 } = opts;
  impCrate(kit, x, 0, z, 1.3, 1.0, 1.2, { color: GD, seed, decal: IMP_DECAL.bay02 });
  impCrate(kit, x + 0.05, 1.0, z - 0.02, 1.2, 0.9, 1.1, { color: GREY, seed: seed + 1, decal: IMP_DECAL.hazard });
  impCrate(kit, x - 1.35, 0, z + 0.2, 0.9, 0.8, 0.9, { color: GD, seed: seed + 2, decal: IMP_DECAL.bay03 });
  impCrate(kit, x - 1.3, 0.8, z + 0.25, 0.7, 0.6, 0.7, { color: GREY, seed: seed + 3, decal: IMP_DECAL.glyphs1 });
}

// ---------------------------------------------------------------------------
// Shared lobby pieces
// ---------------------------------------------------------------------------
/** Deck-letter floor inlay (charcoal disc, accent ring, painted decal) at any scale / height. */
export function deckInlay(kit, x, z, inlayKey, accentKey, scale = 1, opts = {}) {
  const { y = 0, disc = "impMetal", discColor = CHR } = opts;
  const r = 2.05 * scale;
  kit.cyl(disc, x, y + 0.003, z, r, 0.006, "y", { color: discColor, segments: 48 });
  kit.cyl(accentKey, x, y + 0.004, z, r + 0.07 * scale, 0.006, "y", { segments: 48, uv: "keep" });
  kit.cyl(disc, x, y + 0.0055, z, r, 0.005, "y", { color: discColor, segments: 48 });
  kit.add(inlayKey, new THREE.PlaneGeometry(3.9 * scale, 3.9 * scale).rotateX(-Math.PI / 2), { pos: [x, y + 0.012, z], uv: "keep" });
}

// ---------------------------------------------------------------------------
// Corridor pieces
// ---------------------------------------------------------------------------
/** Continuous recessed ceiling light channel along z: U-spine under the beams, dim bar behind louvre fins. */
export function ceilingChannel(kit, z0, z1, y, opts = {}) {
  const { w = 0.8, key = "emitWhiteDim", finStep = 0.3 } = opts;
  const hw = w / 2;
  kit.boxMM("impTrim", [-hw, y - 0.24, z0], [hw, y - 0.2, z1], { color: BLK, texel: 1 });
  kit.boxMM("impTrim", [-hw, y - 0.38, z0], [-hw + 0.08, y - 0.24, z1], { color: BLK, texel: 1 });
  kit.boxMM("impTrim", [hw - 0.08, y - 0.38, z0], [hw, y - 0.24, z1], { color: BLK, texel: 1 });
  kit.boxMM("impMetal", [-hw + 0.1, y - 0.26, z0 + 0.1], [hw - 0.1, y - 0.25, z1 - 0.1], { color: CHR, texel: 1 });
  kit.boxMM(key, [-0.14, y - 0.272, z0 + 0.3], [0.14, y - 0.262, z1 - 0.3], { uv: "keep" });
  for (let f = z0 + 0.2; f < z1 - 0.1; f += finStep) kit.boxMM("impTrim", [-hw + 0.06, y - 0.36, f], [hw - 0.06, y - 0.33, f + 0.02], { color: BLK });
}

/** Inset status screen (command corridor): black recess frame, gloss bezel, readout, LED row and a stencil. */
export function insetScreen(F, u, v, key, opts = {}) {
  const { w = 1.3, h = 0.8, accentKey = "emitBlue" } = opts;
  F.box("impTrim", u, v, 0.05, w + 0.3, h + 0.34, 0.1, { color: BLK, texel: 1 });
  F.box("impMetal", u, v, 0.102, w + 0.18, h + 0.22, 0.01, { color: CHR, texel: 2 });
  F.box("impGloss", u, v + 0.04, 0.108, w + 0.06, h + 0.06, 0.012);
  F.screen(key, u, v + 0.04, 0.116, w, h);
  F.box("leds", u - w / 2 + 0.3, v - h / 2 - 0.08, 0.11, 0.5, 0.04, 0.006, { uv: "keep" });
  F.box(accentKey, u + w / 2 - 0.2, v - h / 2 - 0.08, 0.11, 0.3, 0.02, 0.006, { uv: "keep" });
  F.decal(IMP_DECAL.glyphs1, u, v + h / 2 + 0.12, 0.11, 0.5, { h: 0.09 });
}

/** Linear ceiling bar fixture hung under the slab: black housing, charcoal reflector, lit tube. Fixture only. */
export function barFixture(kit, x, y, z, len, axis = "x", key = "emitWhiteSoft") {
  const ax = axis === "x";
  kit.box("impTrim", x, y - 0.06, z, ax ? len : 0.3, 0.12, ax ? 0.3 : len, { color: BLK, texel: 1 });
  kit.box("impMetal", x, y - 0.125, z, ax ? len - 0.1 : 0.22, 0.01, ax ? 0.22 : len - 0.1, { color: CHR });
  kit.box(key, x, y - 0.135, z, ax ? len - 0.3 : 0.08, 0.012, ax ? 0.08 : len - 0.3, { uv: "keep" });
  for (const s of [-1, 1]) kit.cyl("impMetal", x + (ax ? s * (len / 2 - 0.3) : 0), y + 0.1, z + (ax ? 0: s * (len / 2 - 0.3)), 0.015, 0.2, "y", { color: GD, segments: 6 });
}

/** Industrial high-bay lamp: stem, black cone hood, charcoal reflector ring and an amber lens. Fixture only. */
export function highBayLamp(kit, x, y, z, key = "emitAmberDim") {
  kit.cyl("impMetal", x, y + 0.45, z, 0.025, 0.9, "y", { color: GD, segments: 8 });
  kit.cyl("impTrim", x, y - 0.14, z, 0.36, 0.3, "y", { color: BLK, r2: 0.12, segments: 18, texel: 1 });
  kit.cyl("impMetal", x, y - 0.295, z, 0.3, 0.012, "y", { color: CHR, segments: 18 });
  kit.cyl(key, x, y - 0.305, z, 0.22, 0.012, "y", { segments: 18, uv: "keep" });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    kit.box("impMetal", x + Math.cos(a) * 0.2, y - 0.4, z + Math.sin(a) * 0.2, 0.012, 0.16, 0.012, { color: GD });
  }
  kit.add("impMetal", new THREE.TorusGeometry(0.28, 0.008, 6, 20), { pos: [x, y - 0.48, z], rot: [Math.PI / 2, 0, 0], color: GD, uv: "scale", uvScale: [4, 1] });
}

/** Wall sign plate: black plate, grey field with a large stencil, accent bar, optional hazard band beneath. */
export function signPlate(F, u, v, w, h, opts = {}) {
  const { accentKey = "emitAmber", decal = IMP_DECAL.glyphs3, decalW = w * 0.7, decalH = h * 0.4, hazard = false, badge = null } = opts;
  F.box("impTrim", u, v, 0.04, w + 0.16, h + 0.16, 0.08, { color: BLK, texel: 1 });
  F.box("impMetal", u, v, 0.082, w, h, 0.012, { color: GD, texel: 1 });
  F.decal(decal, u + (badge !== null ? 0.3 : 0), v + 0.05, 0.09, decalW, { h: decalH });
  if (badge !== null) F.decal(badge, u - w / 2 + 0.45, v + 0.05, 0.09, Math.min(h * 0.7, 0.7));
  F.box(accentKey, u, v - h / 2 + 0.12, 0.09, w - 0.3, 0.03, 0.012, { uv: "keep" });
  if (hazard) F.box("chevronY", u, v - h / 2 - 0.14, 0.05, w + 0.16, 0.12, 0.02, { texel: 1.5 });
  F.collider(u - w / 2 - 0.08, u + w / 2 + 0.08, v - h / 2 - 0.2, v + h / 2 + 0.08, 0, 0.1, "sign");
}

/** Framed wall panel (officers' deck): black frame, brass inner frame, gloss plate with a crest, picture light. */
export function framedPanel(F, u, v, w, h, opts = {}) {
  const { decal = IMP_DECAL.cog, glow = "emitAmberDim" } = opts;
  F.box("impTrim", u, v, 0.03, w + 0.14, h + 0.14, 0.06, { color: BLK, texel: 1 });
  F.box("impMetal", u, v, 0.062, w + 0.05, h + 0.05, 0.008, { color: BRASS, texel: 2 });
  F.box("impGloss", u, v, 0.068, w, h, 0.008);
  F.decal(decal, u, v + 0.04, 0.075, Math.min(w, h) * 0.62);
  F.decal(IMP_DECAL.glyphs3, u, v - h / 2 + 0.12, 0.075, w * 0.6, { h: 0.08 });
  F.box("impTrim", u, v + h / 2 + 0.2, 0.12, 0.5, 0.05, 0.22, { color: BLK });
  F.box(glow, u, v + h / 2 + 0.172, 0.15, 0.4, 0.008, 0.12, { uv: "keep" });
}

/** Flat pilaster with brass base and cap lines (officers' deck ribs). */
export function pilaster(F, u, h, opts = {}) {
  const { w = 0.36 } = opts;
  F.box("impTrim", u, h / 2, 0.05, w, h, 0.1, { color: BLK, texel: 1 });
  F.box("impMetal", u, 0.45, 0.105, w - 0.04, 0.04, 0.012, { color: BRASS, texel: 2 });
  F.box("impMetal", u, h - 0.45, 0.105, w - 0.04, 0.04, 0.012, { color: BRASS, texel: 2 });
  F.box("impMetal", u, h * 0.5, 0.105, 0.03, h - 1.1, 0.012, { color: CHR });
}

/** Open cable tray on a wall (u0..u1 at height v): back plate, lips, cables, clamp bars, end junction box. */
export function cableTrayWall(F, u0, u1, v, opts = {}) {
  const { seed = 1, cables = 3, accentKey = "emitAmber", w = 0.34 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  F.box("impTrim", cu, v, 0.01, len, w, 0.02, { color: CHR, texel: 1 });
  F.box("impTrim", cu, v + w / 2, 0.07, len, 0.025, 0.14, { color: BLK, texel: 1 });
  F.box("impTrim", cu, v - w / 2, 0.07, len, 0.025, 0.14, { color: BLK, texel: 1 });
  const cols = [BLK, GD, PALETTE.impBlueDeep, CHR, PALETTE.impRed];
  for (let k = 0; k < cables; k++) {
    const r = 0.022 + rand() * 0.02;
    const dv = -w / 2 + 0.06 + ((w - 0.12) * (k + 0.5)) / cables;
    F.cylU("impMetal", cu, v + dv, 0.04 + r, r, len - 0.1, { color: cols[Math.floor(rand() * cols.length)], segments: 8 });
  }
  for (let x = u0 + 0.8; x < u1 - 0.4; x += 2.2) F.box("impMetal", x, v, 0.12, 0.05, w - 0.02, 0.02, { color: GD });
  F.box("impTrim", u1 - 0.14, v, 0.09, 0.28, w + 0.16, 0.18, { color: BLK, texel: 1 });
  F.box(accentKey, u1 - 0.14, v + w / 2 + 0.02, 0.182, 0.06, 0.03, 0.008);
  F.decal(IMP_DECAL.power, u1 - 0.14, v - w / 2 - 0.16, 0.001, 0.2);
}

/** Pipe along a wall at height v with clamps and flanges. */
export function pipeWall(F, u0, u1, v, r, opts = {}) {
  const { color = GD, clampStep = 2.0, flangeStep = 4.0 } = opts;
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  F.cylU("impMetal", cu, v, 0.08 + r, r, len, { color, segments: 10 });
  for (let x = u0 + 0.5; x < u1 - 0.3; x += clampStep) F.box("impTrim", x, v, 0.04 + r, 0.08, r * 2 + 0.08, r * 2 + 0.08, { color: BLK });
  for (let x = u0 + 1.5; x < u1 - 0.5; x += flangeStep) F.cylU("impMetal", x, v, 0.08 + r, r * 1.35, 0.1, { color: CHR, segments: 10 });
}

/** Numbered bulkhead frame across a corridor at z: posts, header, number plates and amber lamps on the ±z faces. */
export function bulkheadFrame(kit, z, w, h, index, opts = {}) {
  const { lampKey = "emitAmberDim", post = 0.3, proud = 0.3 } = opts;
  const decal = [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][index % 3];
  for (const s of [-1, 1]) {
    kit.box("impTrim", s * (w / 2 - proud / 2), h / 2, z, proud, h, post, { color: BLK, texel: 1 });
    kit.box("impMetal", s * (w / 2 - proud - 0.01), h * 0.5, z, 0.02, h * 0.45, post * 0.5, { color: CHR });
    for (const f of [-1, 1]) {
      const g = new THREE.PlaneGeometry(0.22, 0.22);
      if (f < 0) g.rotateY(Math.PI);
      kit.add("impGloss", new THREE.BoxGeometry(0.26, 0.26, 0.01), { pos: [s * (w / 2 - proud / 2), 2.1, z + f * (post / 2 + 0.005)] });
      kit.add("decalImp", g, { pos: [s * (w / 2 - proud / 2), 2.1, z + f * (post / 2 + 0.012)], uv: "keep", uvRect: impDecalRect(decal) });
      kit.box(lampKey, s * (w / 2 - proud / 2), h - 0.45, z + f * (post / 2 + 0.006), 0.12, 0.04, 0.012, { uv: "keep" });
    }
    kit.collider([s > 0 ? w / 2 - proud : -w / 2, 0, z - post / 2], [s > 0 ? w / 2 : -w / 2 + proud, h, z + post / 2], "bulkhead");
  }
  kit.box("impTrim", 0, h - 0.16, z, w, 0.32, post, { color: BLK, texel: 1 });
  kit.box("chevronY", 0, 0.004, z, w - 0.9, 0.008, post + 0.2, { texel: 1.5 });
}

/** Heavy engineering rib across a corridor at z: thick posts and header, hazard band at the base, optional red lamp. */
export function heavyRib(kit, z, w, h, opts = {}) {
  const { accentKey = "emitAmber", lamp = false, post = 0.5, proud = 0.4 } = opts;
  for (const s of [-1, 1]) {
    const cx = s * (w / 2 - proud / 2);
    kit.box("impTrim", cx, h / 2, z, proud, h, post, { color: BLK, texel: 1 });
    kit.box("chevronY", cx, 0.72, z, proud + 0.02, 0.44, post + 0.02, { texel: 1.2 });
    kit.box("impMetal", s * (w / 2 - proud - 0.01), h * 0.58, z, 0.02, h * 0.4, post * 0.6, { color: CHR });
    kit.box(accentKey, s * (w / 2 - proud - 0.022), h * 0.58, z, 0.01, h * 0.34, 0.04);
    for (const yy of [1.3, 2.4]) kit.cyl("impMetal", s * (w / 2 - proud - 0.02), yy, z, 0.03, 0.04, "x", { color: GD, segments: 6 });
    kit.collider([s > 0 ? w / 2 - proud : -w / 2, 0, z - post / 2], [s > 0 ? w / 2 : -w / 2 + proud, h, z + post / 2], "rib");
  }
  kit.box("impTrim", 0, h - 0.25, z, w, 0.5, post, { color: BLK, texel: 1 });
  kit.box("impMetal", 0, h - 0.52, z, w - 2 * proud - 0.2, 0.04, post - 0.1, { color: CHR });
  if (lamp) {
    kit.box("impTrim", 0, h - 0.62, z, 0.3, 0.16, 0.3, { color: BLK });
    warningLamp(kit, 0, h - 0.72, z, "emitRedDim", 0.08);
  }
}
