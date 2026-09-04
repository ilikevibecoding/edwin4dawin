// Local Imperial props for the hub modules (lift lobbies + corridors): abstract signage, service
// panels, benches, fire points, ceiling coffers/channels and floor lanes. Everything goes through
// the shared placer so it can be dropped against any wall face; material keys are restricted to the
// set the shell already uses plus darkGloss / metal / hazard / the four emit* indicator colours.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { col } from "../_shared/palette.js";
import { placer, indicatorField, pipe, crate, cabinet } from "../_shared/props.js";

const LED = ["emitBlue", "emitRedImp", "emitAmber", "emitGreen"];

// Yaw that turns a prop's local +Z (its front) into the inward normal of a shell face.
export const faceYaw = (f) => Math.atan2(f.N[0], f.N[2]);

// World-space min/max rectangle [x, z] of a local rectangle, for hazard strips and lane pieces.
function worldRect(P, lx0, lz0, lx1, lz1) {
  const pts = [P.world(lx0, 0, lz0), P.world(lx1, 0, lz0), P.world(lx0, 0, lz1), P.world(lx1, 0, lz1)];
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[2]);
  return [[Math.min(...xs), Math.min(...zs)], [Math.max(...xs), Math.max(...zs)]];
}

// Door-side status plate: matte black plate with an accent bar, a red bar, three white cells and a
// green "ready" cell. pos sits ON the wall face (local z = 0), the plate is 0.07 proud.
export function statusPanel(kit, PALETTE, pos, yaw, { accent = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.025, 0.34, 0.58, 0.04, { color: col(PALETTE, "impBlack") });
  P.box("darkGloss", 0, 0, 0.055, 0.28, 0.52, 0.02);
  P.box(accent, 0, 0.18, 0.069, 0.18, 0.05, 0.008);
  P.box("emitRedImp", 0, 0.09, 0.069, 0.18, 0.05, 0.008);
  for (let k = 0; k < 3; k++) P.box("emitWhite", -0.07 + k * 0.07, -0.03, 0.069, 0.04, 0.04, 0.008);
  P.box("emitGreen", 0, -0.15, 0.069, 0.06, 0.03, 0.008);
}

// Numbered bulkhead marker (abstract): dark plate, amber band, 1–4 white bars as the "number".
export function bulkheadMarker(kit, PALETTE, pos, yaw, index) {
  const P = placer(kit, pos, yaw);
  P.box("darkGloss", 0, 0, 0.012, 0.26, 0.34, 0.02);
  P.box("emitAmber", 0, 0.1, 0.026, 0.18, 0.06, 0.008);
  const n = 1 + (index % 4);
  const w = n * 0.065;
  for (let k = 0; k < n; k++) P.box("emitWhite", -w / 2 + 0.03 + k * 0.065, -0.06, 0.026, 0.03, 0.11, 0.008);
}

// Wall junction box: dark body, black door plate, indicator field, status LED, optional pair of
// conduits rising `conduitUp` metres from the box top. pos on the wall face, box centred at pos.
export function junctionBox(kit, PALETTE, pos, yaw, { w = 0.5, h = 0.7, d = 0.14, seed = 1, conduitUp = 0, accent = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  P.box("paintedMetal", 0, 0, d / 2 + 0.005, w, h, d, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, 0, d + 0.012, w - 0.08, h - 0.08, 0.014, { color: black });
  indicatorField(P, 0, h / 2 - 0.16, d + 0.02, w - 0.16, 0.14, seed);
  P.box(accent, -w / 2 + 0.09, -h / 2 + 0.1, d + 0.023, 0.07, 0.02, 0.006);
  P.box("emitRedImp", -w / 2 + 0.2, -h / 2 + 0.1, d + 0.023, 0.04, 0.02, 0.006);
  P.box("metal", 0, -0.02, d + 0.03, 0.02, 0.22, 0.02, { color: col(PALETTE, "steel") });
  if (conduitUp > 0) {
    for (const x of [-0.13, 0.06]) P.cyl("metal", x, h / 2 + conduitUp / 2, 0.06, 0.024, conduitUp, "y", { color: col(PALETTE, "steel"), segments: 8 });
    P.box("paintedMetal", -0.035, h / 2 + 0.06, 0.06, 0.32, 0.08, 0.14, { color: black });
  }
}

// Wall vent grille: black frame with five mid-grey slats.
export function wallVent(kit, PALETTE, pos, yaw, { w = 0.9, h = 0.45 } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.035, w, h, 0.06, { color: col(PALETTE, "impBlack") });
  const n = 5;
  for (let i = 0; i < n; i++) P.box("paintedMetal", 0, -h / 2 + 0.07 + i * ((h - 0.14) / (n - 1)), 0.075, w - 0.12, 0.035, 0.02, { color: col(PALETTE, "impMid") });
}

// Deck-directory board: black frame, gloss face, accent header, rows of [colour code | label bar |
// 1–3 white cells] and an indicator footer. No text textures exist, so signage is abstract.
export function directoryBoard(kit, PALETTE, pos, yaw, { w = 1.6, h = 1.2, rows = 6, accent = "emitBlue", seed = 3 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0, 0.05, w + 0.16, h + 0.16, 0.1, { color: col(PALETTE, "impBlack"), texel: 2.5 });
  P.box("darkGloss", 0, 0, 0.11, w, h, 0.02);
  P.box(accent, 0, h / 2 - 0.09, 0.125, w - 0.24, 0.05, 0.01);
  const rowH = (h - 0.46) / rows;
  const top = h / 2 - 0.2;
  for (let i = 0; i < rows; i++) {
    const y = top - (i + 0.5) * rowH;
    P.box(LED[Math.floor(rand() * LED.length)], -w / 2 + 0.18, y, 0.125, 0.14, rowH * 0.45, 0.01);
    const len = 0.3 + rand() * (w * 0.42);
    P.box("paintedMetal", -w / 2 + 0.34 + len / 2, y, 0.125, len, rowH * 0.28, 0.01, { color: col(PALETTE, "impWhite") });
    const nd = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < nd; k++) P.box("emitWhite", w / 2 - 0.16 - k * 0.09, y, 0.125, 0.05, rowH * 0.3, 0.01);
  }
  indicatorField(P, 0, -h / 2 + 0.13, 0.125, w - 0.3, 0.12, seed + 5);
  P.box(accent, 0, -h / 2 - 0.1, 0.06, w * 0.5, 0.012, 0.01);
}

// Wall bench: dark back plate on the wall, grey seat slab on two black pedestals, accent underline.
// Back at local z = 0 (the wall face), seat reaches z 0.55.
export function bench(kit, PALETTE, pos, yaw, { len = 2.2, accent = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  const dark = col(PALETTE, "impDark");
  P.box("paintedMetal", 0, 0.76, 0.025, len, 0.5, 0.04, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, 0.46, 0.295, len, 0.08, 0.5, { color: col(PALETTE, "impMid"), texel: 2.5 });
  P.box("paintedMetal", 0, 0.505, 0.295, len - 0.12, 0.01, 0.42, { color: col(PALETTE, "impGrey"), texel: 2.5 });
  for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) P.box("paintedMetal", x, 0.21, 0.29, 0.12, 0.42, 0.4, { color: col(PALETTE, "impBlack") });
  P.box(accent, 0, 0.43, 0.551, len - 0.4, 0.012, 0.01);
  P.collider([-len / 2, 0, 0], [len / 2, 0.5, 0.56], "bench");
}

// Fire point: floor-standing red cabinet (0.7 × 1.4 × 0.35) with a black door recess, white/red
// marking, red beacon and a hazard strip on the deck in front. Back at local z = 0.
export function firePoint(kit, PALETTE, pos, yaw) {
  const P = placer(kit, pos, yaw);
  const red = col(PALETTE, "impRed");
  const black = col(PALETTE, "impBlack");
  P.box("paintedMetal", 0, 0.7, 0.18, 0.7, 1.4, 0.35, { color: red, texel: 2.5 });
  P.box("paintedMetal", 0, 0.05, 0.185, 0.74, 0.1, 0.37, { color: black });
  P.box("paintedMetal", 0, 0.82, 0.362, 0.56, 0.96, 0.014, { color: black });
  P.box("paintedMetal", 0, 0.82, 0.372, 0.5, 0.9, 0.01, { color: red });
  P.box("emitWhite", 0, 1.16, 0.383, 0.3, 0.05, 0.008);
  P.box("emitRedImp", 0, 0.95, 0.383, 0.18, 0.18, 0.008);
  P.box("emitWhite", 0, 0.62, 0.383, 0.3, 0.05, 0.008);
  P.box("metal", 0.2, 0.82, 0.385, 0.02, 0.2, 0.02, { color: col(PALETTE, "steel") });
  P.cyl("paintedMetal", 0, 1.43, 0.18, 0.07, 0.06, "y", { color: black, segments: 12 });
  P.cyl("emitRedImp", 0, 1.51, 0.18, 0.05, 0.1, "y", { segments: 12 });
  const [mn, mx] = worldRect(P, -0.5, 0.36, 0.5, 0.86);
  kit.boxMM("hazard", [mn[0], pos[1] + 0.002, mn[1]], [mx[0], pos[1] + 0.007, mx[1]], { texel: 2 });
  P.collider([-0.37, 0, 0], [0.37, 1.6, 0.37], "firepoint");
}

// Service bay: two deep jambs and a header with a recessed light strip framing a wall niche for a
// cabinet or crates, with a gloss floor plate. pos at the wall face, opening toward +Z.
export function serviceBay(kit, PALETTE, pos, yaw, { w = 2.4, h = 2.9, depth = 0.6, jamb = 0.3, lightMat = "emitWhite" } = {}) {
  const P = placer(kit, pos, yaw);
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - jamb / 2);
    P.box("impPanel", x, h / 2 + 0.2, depth / 2 + 0.005, jamb, h + 0.4, depth, { color: dark, uv: "keep" });
    P.box("impPanel", x, h / 2, depth + 0.025, jamb - 0.1, h - 0.7, 0.04, { color: col(PALETTE, "impMid"), uv: "keep" });
    P.box("paintedMetal", x, 0.2, depth + 0.03, jamb + 0.02, 0.4, 0.05, { color: black });
    P.collider([x - jamb / 2, 0, 0], [x + jamb / 2, h + 0.4, depth + 0.03], "bay-jamb");
  }
  P.box("impPanel", 0, h + 0.2, depth / 2 + 0.005, w - 2 * jamb, 0.4, depth, { color: dark, uv: "keep" });
  P.box("paintedMetal", 0, h - 0.06, depth / 2 + 0.005, w - 2 * jamb, 0.12, depth - 0.1, { color: black });
  P.box(lightMat, 0, h - 0.13, depth / 2 + 0.005, w - 2 * jamb - 0.4, 0.02, 0.14);
  P.box("emitRedImp", 0, h + 0.2, depth + 0.012, 0.12, 0.05, 0.01);
  P.box("impFloor", 0, 0.006, depth / 2 + 0.1, w - 2 * jamb - 0.04, 0.012, depth + 0.2, { color: black, texel: 1 });
}

// Housed light fixture hanging from the plane y = top between axis-aligned world points a..b: two
// black side rails and end caps form an open recess, a dark back plate closes it, the emitter strip
// (narrower than the housing) sits 5 cm up inside so grazing views see rails and louvres rather than
// a bare quad, grey reflectors flank it and dark louvre bars cross the opening every `louvre` m.
// `seg` > 0 breaks the emitter into segments with dark gaps.
export function housedStrip(kit, PALETTE, a, b, top, { w = 0.6, depth = 0.16, emitW = 0.14, mat = "emitWhite", louvre = 0.4, seg = 0, rail = 0.04 } = {}) {
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[2], b[2]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[2], b[2]);
  const c = alongX ? a[2] : a[0];
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const mid = col(PALETTE, "impMid");
  // r(along0, along1, across0, across1, y0, y1)
  const r = (l0, l1, c0, c1, y0, y1, m, opts = {}) => (alongX ? kit.boxMM(m, [l0, y0, c0], [l1, y1, c1], opts) : kit.boxMM(m, [c0, y0, l0], [c1, y1, l1], opts));
  const yb = top - depth;
  const iw = w - 2 * rail;
  r(lo, hi, c - w / 2, c - w / 2 + rail, yb, top - 0.02, "paintedMetal", { color: black, texel: 2.5 });
  r(lo, hi, c + w / 2 - rail, c + w / 2, yb, top - 0.02, "paintedMetal", { color: black, texel: 2.5 });
  r(lo, lo + 0.06, c - w / 2, c + w / 2, yb, top - 0.02, "paintedMetal", { color: black, texel: 2.5 });
  r(hi - 0.06, hi, c - w / 2, c + w / 2, yb, top - 0.02, "paintedMetal", { color: black, texel: 2.5 });
  r(lo + 0.06, hi - 0.06, c - iw / 2, c + iw / 2, top - 0.05, top - 0.02, "paintedMetal", { color: dark, texel: 2.5 });
  const refl = iw / 2 - emitW / 2 - 0.02;
  if (refl > 0.03) {
    r(lo + 0.06, hi - 0.06, c - iw / 2, c - iw / 2 + refl, top - 0.07, top - 0.06, "paintedMetal", { color: mid });
    r(lo + 0.06, hi - 0.06, c + iw / 2 - refl, c + iw / 2, top - 0.07, top - 0.06, "paintedMetal", { color: mid });
  }
  const len = hi - lo - 0.32;
  const n = seg > 0 ? Math.max(1, Math.round(len / seg)) : 1;
  for (let i = 0; i < n; i++) {
    const s0 = lo + 0.16 + (len * i) / n + (i > 0 ? 0.06 : 0);
    const s1 = lo + 0.16 + (len * (i + 1)) / n - (i < n - 1 ? 0.06 : 0);
    r(s0, s1, c - emitW / 2, c + emitW / 2, top - 0.11, top - 0.09, mat);
  }
  if (louvre > 0) for (let u = lo + louvre / 2 + 0.06; u < hi - 0.1; u += louvre) r(u - 0.015, u + 0.015, c - iw / 2, c + iw / 2, yb, yb + 0.02, "paintedMetal", { color: dark });
}

// Recessed ceiling coffer over a hub crossing: four dark beams (outer rectangle min..max in [x, z]),
// a black recessed field and parallel light strips inside. Beams drop `drop` below the ceiling.
export function coffer(kit, PALETTE, min, max, ceilY, { drop = 0.7, beam = 0.5, stripMat = "emitWhite", strips = 4, axis = "x" } = {}) {
  const [x0, z0] = min;
  const [x1, z1] = max;
  const yb0 = ceilY - drop;
  const yb1 = ceilY - 0.04;
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  // beams in the clean painted panel key (as the shared pillar faces): the worn-metal map at this
  // size reads as blotchy concrete even at texel 2.5
  kit.boxMM("impPanel", [x0, yb0, z0], [x1, yb1, z0 + beam], { color: dark, uv: "keep" });
  kit.boxMM("impPanel", [x0, yb0, z1 - beam], [x1, yb1, z1], { color: dark, uv: "keep" });
  kit.boxMM("impPanel", [x0, yb0, z0 + beam], [x0 + beam, yb1, z1 - beam], { color: dark, uv: "keep" });
  kit.boxMM("impPanel", [x1 - beam, yb0, z0 + beam], [x1, yb1, z1 - beam], { color: dark, uv: "keep" });
  // black seam groove along the beam undersides
  const g = 0.05;
  kit.boxMM("paintedMetal", [x0 + 0.15, yb0 - 0.005, z0 + beam / 2 - g], [x1 - 0.15, yb0 + 0.02, z0 + beam / 2 + g], { color: black });
  kit.boxMM("paintedMetal", [x0 + 0.15, yb0 - 0.005, z1 - beam / 2 - g], [x1 - 0.15, yb0 + 0.02, z1 - beam / 2 + g], { color: black });
  kit.boxMM("paintedMetal", [x0 + beam / 2 - g, yb0 - 0.005, z0 + 0.15], [x0 + beam / 2 + g, yb0 + 0.02, z1 - 0.15], { color: black });
  kit.boxMM("paintedMetal", [x1 - beam / 2 - g, yb0 - 0.005, z0 + 0.15], [x1 - beam / 2 + g, yb0 + 0.02, z1 - 0.15], { color: black });
  const ix0 = x0 + beam;
  const ix1 = x1 - beam;
  const iz0 = z0 + beam;
  const iz1 = z1 - beam;
  // recessed field in the painted key too: lit from 0.2 m by the fixtures, the worn-metal map's
  // blotches were the loudest thing on the ceiling
  kit.boxMM("impPanel", [ix0, ceilY - 0.34, iz0], [ix1, ceilY - 0.26, iz1], { color: black, uv: "keep" });
  // housed fixtures hanging from the recessed field (rails flush with it, emitter shielded inside)
  for (let i = 0; i < strips; i++) {
    if (axis === "x") {
      const z = iz0 + ((i + 0.5) / strips) * (iz1 - iz0);
      housedStrip(kit, PALETTE, [ix0 + 0.25, 0, z], [ix1 - 0.25, 0, z], ceilY - 0.32, { w: 0.46, depth: 0.16, emitW: 0.14, mat: stripMat, louvre: 0.4, seg: 2.2 });
    } else {
      const x = ix0 + ((i + 0.5) / strips) * (ix1 - ix0);
      housedStrip(kit, PALETTE, [x, 0, iz0 + 0.25], [x, 0, iz1 - 0.25], ceilY - 0.32, { w: 0.46, depth: 0.16, emitW: 0.14, mat: stripMat, louvre: 0.4, seg: 2.2 });
    }
  }
}

// Ceiling light channel between two world points (axis-aligned): a housed fixture (rails, end caps,
// louvres, segmented shielded emitter) hanging from the ceiling plane.
export function lightChannel(kit, PALETTE, a, b, ceilY, { w = 0.5, mat = "emitWhite", seg = 2.0, stripW = 0.14 } = {}) {
  housedStrip(kit, PALETTE, a, b, ceilY, { w, depth: 0.16, emitW: stripW, mat, louvre: 0.4, seg });
}

// Floor lane: black deck-plate band with two accent edge lines, from a to b (axis-aligned, y = deck).
// Dark plating rather than gloss: the gloss material mirrors the environment at grazing angles and
// blows out whenever the player looks along the lane.
export function floorLane(kit, PALETTE, a, b, y, { w = 1.0, accent = "emitBlue", line = 0.06, gap = 0.05, mat = "impFloor" } = {}) {
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[2], b[2]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[2], b[2]);
  const c = alongX ? a[2] : a[0];
  const black = col(PALETTE, "impBlack");
  const r = (c0, c1, y0, y1, m, opts) => (alongX ? kit.boxMM(m, [lo, y0, c0], [hi, y1, c1], opts) : kit.boxMM(m, [c0, y0, lo], [c1, y1, hi], opts));
  r(c - w / 2, c + w / 2, y, y + 0.012, mat, { color: black, texel: 1 });
  r(c - w / 2 - gap - line, c - w / 2 - gap, y, y + 0.006, accent);
  r(c + w / 2 + gap, c + w / 2 + gap + line, y, y + 0.006, accent);
}

// Hub marking under a lobby coffer: black plating disc with a thin accent ring; lanes run over it.
export function hubRing(kit, PALETTE, pos, r, accent = "emitBlue") {
  kit.cyl("impFloor", pos[0], pos[1] + 0.004, pos[2], r + 0.15, 0.008, "y", { color: col(PALETTE, "impBlack"), segments: 48, texel: 0.5 });
  kit.add(accent, new THREE.RingGeometry(r - 0.06, r, 64), { pos: [pos[0], pos[1] + 0.0105, pos[2]], rot: [-Math.PI / 2, 0, 0], uv: "keep" });
  kit.add(accent, new THREE.RingGeometry(r * 0.35, r * 0.35 + 0.04, 48), { pos: [pos[0], pos[1] + 0.0105, pos[2]], rot: [-Math.PI / 2, 0, 0], uv: "keep" });
}

// Door identification sign for the wall above a lobby blast door: black plate, wide accent bar and
// three white cells (abstract door number).
export function doorSign(kit, PALETTE, pos, yaw, { w = 2.4, h = 0.6, accent = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.04, w + 0.12, h + 0.12, 0.08, { color: col(PALETTE, "impBlack"), texel: 2.5 });
  P.box("darkGloss", 0, 0, 0.09, w, h, 0.02);
  P.box(accent, 0, h / 2 - 0.1, 0.105, w - 0.3, 0.07, 0.01);
  for (let k = 0; k < 3; k++) P.box("emitWhite", -0.45 + k * 0.45, -0.07, 0.105, 0.22, 0.22, 0.01);
  P.box("emitRedImp", w / 2 - 0.25, -0.07, 0.105, 0.14, 0.22, 0.01);
}

// Overhead bulkhead display angled `tilt` rad down toward the viewer on a dark mount block with two
// top brackets. The tilt is functional: a flat glossy screen at 2.7 m mirrors the nearest ceiling
// fill straight into the eye, the angled face reflects the deck instead. pos = screen-centre height
// on the wall face; the housing's back-bottom edge sits on the wall, the top stands ~0.3 m proud.
export function tiltedScreen(kit, PALETTE, pos, yaw, { w = 2.0, h = 1.1, mat = "screenImp0", tilt = 0.25, accent = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const s = Math.sin(tilt);
  const c = Math.cos(tilt);
  const out = (h / 2 + 0.06) * s + 0.08 * c;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  const at = (y, z) => P.world(0, y * c - z * s, out + y * s + z * c);
  kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08), { pos: at(0, -0.04), quat: q, color: black, texel: 2.5 });
  kit.add("darkGloss", new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.01), { pos: at(0, 0.002), quat: q });
  kit.add(mat, new THREE.BoxGeometry(w, h, 0.01), { pos: at(0, 0.012), quat: q, uv: "keep" });
  kit.add(accent, new THREE.BoxGeometry(w * 0.6, 0.012, 0.01), { pos: at(-h / 2 - 0.03, 0), quat: q });
  // mount block behind the upper half (the housing back leans away from the wall there) + brackets
  P.box("paintedMetal", 0, 0.17, 0.07, w - 0.3, 0.34, 0.14, { color: dark, texel: 2.5 });
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) P.box("paintedMetal", x, (h / 2) * c - 0.1, (out + 0.06) / 2, 0.06, 0.06, out + 0.06, { color: black });
}

// Overhead cable tray: an open channel (two lips + bottom) with cross straps, between world points.
export function cableTray(kit, PALETTE, a, b, { w = 0.35, h = 0.08, strap = 2.0 } = {}) {
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[2], b[2]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[2], b[2]);
  const c = alongX ? a[2] : a[0];
  const y = a[1];
  const dark = col(PALETTE, "impDark");
  const r = (c0, c1, y0, y1, m, opts) => (alongX ? kit.boxMM(m, [lo, y0, c0], [hi, y1, c1], opts) : kit.boxMM(m, [c0, y0, lo], [c1, y1, hi], opts));
  r(c - w / 2, c + w / 2, y - 0.02, y, "paintedMetal", { color: dark, texel: 2.5 });
  r(c - w / 2, c - w / 2 + 0.02, y, y + h, "paintedMetal", { color: dark });
  r(c + w / 2 - 0.02, c + w / 2, y, y + h, "paintedMetal", { color: dark });
  // cables lying in the tray
  const cableCols = [col(PALETTE, "impBlack"), col(PALETTE, "impMid"), col(PALETTE, "impAmber")];
  const nc = Math.max(1, Math.floor((w - 0.08) / 0.09));
  for (let k = 0; k < nc; k++) {
    const cc = c - w / 2 + 0.06 + k * ((w - 0.12) / Math.max(1, nc - 1));
    r(cc - 0.02, cc + 0.02, y, y + 0.04, "paintedMetal", { color: cableCols[k % 3] });
  }
  const len = hi - lo;
  const n = Math.floor(len / strap);
  for (let i = 1; i <= n; i++) {
    const t = lo + (len * i) / (n + 1);
    if (alongX) kit.boxMM("paintedMetal", [t - 0.03, y - 0.03, c - w / 2 - 0.02], [t + 0.03, y + h + 0.01, c + w / 2 + 0.02], { color: col(PALETTE, "impBlack") });
    else kit.boxMM("paintedMetal", [c - w / 2 - 0.02, y - 0.03, t - 0.03], [c + w / 2 + 0.02, y + h + 0.01, t + 0.03], { color: col(PALETTE, "impBlack") });
  }
}

// Service run on a shell face between u0..u1 at height y (above the floor): the same cable tray +
// three cables + two bracketed pipes as the shell's `serviceBand`, for faces where the shell band
// must not run (e.g. over a lift hole) so the room's upper wall band still reads continuous. Black
// end caps close both ends.
export function serviceRun(kit, PALETTE, f, u0, u1, y, { wallT = 0.3 } = {}) {
  const P = (k) => col(PALETTE, k);
  const box = (mat, u, v, n, su, sv, sn, opts = {}) => kit.add(mat, new THREE.BoxGeometry(...f.size(su, sv, sn)), { pos: f.world(u, v, n), ...opts });
  const cu = (u0 + u1) / 2;
  const len = u1 - u0;
  if (len < 0.8) return;
  const alongX = Math.abs(f.U[0]) > 0.5;
  box("paintedMetal", cu, y, wallT + 0.22, len, 0.03, 0.36, { color: P("impDark"), texel: 2.5 });
  box("paintedMetal", cu, y + 0.06, wallT + 0.05, len, 0.12, 0.02, { color: P("impDark"), texel: 2.5 });
  box("paintedMetal", cu, y + 0.06, wallT + 0.39, len, 0.12, 0.02, { color: P("impDark"), texel: 2.5 });
  for (let k = 0; k < 3; k++) box("paintedMetal", cu, y + 0.035, wallT + 0.12 + k * 0.1, len - 0.2, 0.04, 0.04, { color: [P("impBlack"), P("impMid"), P("impAmber")][k] });
  for (const [dy, r, c] of [[0.42, 0.05, P("steel")], [0.58, 0.035, P("impMid")]]) {
    const pc = f.world(cu, y + dy, wallT + 0.14);
    kit.cyl("metal", pc[0], pc[1], pc[2], r, len, alongX ? "x" : "z", { color: c, segments: 10 });
  }
  for (let u = u0 + 1.0; u < u1 - 0.5; u += 3) box("paintedMetal", u, y + 0.5, wallT + 0.09, 0.08, 0.3, 0.18, { color: P("impDark") });
  for (const u of [u0 + 0.03, u1 - 0.03]) box("paintedMetal", u, y + 0.31, wallT + 0.21, 0.06, 0.68, 0.42, { color: P("impBlack"), texel: 2.5 });
}

// Door dressing for every door hole of a shell (lift openings excluded): 0.4 m hazard strip on the
// deck outside the hole and a status panel beside it, on the side farther from `avoid` ([x, z]).
export function doorDressing(kit, PALETTE, shell, floorY, { accent = "emitBlue", avoid = null, wallT = 0.3 } = {}) {
  for (const fk of ["n", "s", "e", "w"]) {
    const f = shell.faces[fk];
    const yaw = faceYaw(f);
    for (const o of shell.openings[fk]) {
      if (!o.isDoor || o.kind === "lift") continue;
      const p = f.world(o.u0, 0, wallT);
      const q = f.world(o.u1, 0, wallT + 0.4);
      kit.boxMM("hazard", [Math.min(p[0], q[0]), floorY + 0.014, Math.min(p[2], q[2])], [Math.max(p[0], q[0]), floorY + 0.019, Math.max(p[2], q[2])], { texel: 2 });
      const cands = [];
      if (o.u1 + 0.95 <= f.L - wallT) cands.push(o.u1 + 0.75);
      if (o.u0 - 0.95 >= wallT) cands.push(o.u0 - 0.75);
      if (!cands.length) continue;
      let u = cands[0];
      if (avoid && cands.length > 1) {
        const d = (uu) => {
          const w = f.world(uu, 0, wallT);
          return Math.hypot(w[0] - avoid[0], w[2] - avoid[1]);
        };
        u = cands.reduce((best, c) => (d(c) > d(best) ? c : best), cands[0]);
      }
      statusPanel(kit, PALETTE, f.world(u, 1.45, wallT), yaw, { accent });
    }
  }
}

// Perimeter conduit runs along a wall face between u0..u1 at height y (metres above the floor);
// a run may carry its own `y`. ends: "open" (a corner block or another run hides the ends) or
// "wall" (each end elbows back into the wall through a dark junction block and a flanged
// penetration, for runs that stop mid-wall).
export function wallConduits(kit, PALETTE, f, u0, u1, y, { runs = [{ r: 0.07, n: 0.45 }, { r: 0.05, n: 0.68 }], ends = "open", wallT = 0.3 } = {}) {
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  for (const run of runs) {
    const ry = run.y ?? y;
    const color = col(PALETTE, run.r > 0.06 ? "steel" : "impGrey");
    pipe(kit, PALETTE, f.world(u0, ry, run.n), f.world(u1, ry, run.n), run.r, { color, bracket: 4 });
    if (ends !== "wall") continue;
    for (const u of [u0, u1]) {
      const s = run.r * 2.4;
      const c = f.world(u, ry, run.n);
      kit.box("paintedMetal", c[0], c[1], c[2], s, s, s, { color: dark, texel: 2.5 });
      pipe(kit, PALETTE, f.world(u, ry, wallT - 0.05), c, run.r, { color, bracket: 99 });
      const fl = run.r * 2 + 0.24;
      kit.add("paintedMetal", new THREE.BoxGeometry(...f.size(fl, fl, 0.08)), { pos: f.world(u, ry, wallT + 0.04), color: black, texel: 2.5 });
    }
  }
}

// Kick-level light strips along the given faces, broken 0.6 m clear of door holes and `liftMargin`
// clear of lift openings (that wall zone belongs to the lift team).
export function kickStrips(kit, shell, faceKeys, mat, { wallT = 0.3, liftMargin = 1.5 } = {}) {
  for (const fk of faceKeys) {
    const f = shell.faces[fk];
    let spans = [[wallT + 0.02, f.L - wallT - 0.02]];
    for (const o of shell.openings[fk]) {
      if (!o.isDoor) continue;
      const m = o.kind === "lift" ? liftMargin : 0.6;
      const next = [];
      for (const [s0, s1] of spans) {
        if (o.u1 + m <= s0 || o.u0 - m >= s1) next.push([s0, s1]);
        else {
          if (o.u0 - m > s0) next.push([s0, o.u0 - m]);
          if (o.u1 + m < s1) next.push([o.u1 + m, s1]);
        }
      }
      spans = next;
    }
    for (const [s0, s1] of spans) {
      if (s1 - s0 < 0.3) continue;
      kit.add(mat, new THREE.BoxGeometry(...f.size(s1 - s0, 0.03, 0.02)), { pos: f.world((s0 + s1) / 2, 0.1, wallT + 0.035) });
    }
  }
}

// Dark junction block hiding the pipe joints where two perimeter runs meet in a room corner.
export function cornerBlock(kit, PALETTE, pos, size = 0.5) {
  kit.box("paintedMetal", pos[0], pos[1], pos[2], size, 0.32, size, { color: col(PALETTE, "impDark"), texel: 2.5 });
  kit.box("paintedMetal", pos[0], pos[1] - 0.17, pos[2], size - 0.1, 0.02, size - 0.1, { color: col(PALETTE, "impBlack") });
}

// Tool board: dark backing plate with a black peg field, a steel top rail and a seeded set of hung
// tools (wrenches, a hammer, a cable coil, a clipboard, a canister) over a parts shelf; hazard plate
// and a lit tab. pos = board centre on the wall face, front toward local +Z.
export function toolBoard(kit, PALETTE, pos, yaw, { w = 1.2, h = 0.9, seed = 1, accent = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  const steel = col(PALETTE, "steel");
  P.box("paintedMetal", 0, 0, 0.025, w, h, 0.05, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, 0.03, 0.055, w - 0.12, h - 0.18, 0.01, { color: black });
  P.box("metal", 0, h / 2 - 0.1, 0.085, w - 0.2, 0.03, 0.03, { color: steel });
  // shelf along the bottom with two parts boxes
  P.box("paintedMetal", 0, -h / 2 + 0.14, 0.11, w - 0.2, 0.03, 0.14, { color: dark, texel: 2.5 });
  P.box("paintedMetal", -w / 2 + 0.22, -h / 2 + 0.21, 0.11, 0.2, 0.11, 0.12, { color: col(PALETTE, "impGrey"), texel: 2.5 });
  P.box("paintedMetal", -w / 2 + 0.46, -h / 2 + 0.2, 0.11, 0.18, 0.09, 0.12, { color: col(PALETTE, "impMid"), texel: 2.5 });
  // hung tools from the rail
  const slots = Math.max(4, Math.floor((w - 0.3) / 0.16));
  const offset = Math.floor(rand() * 5);
  const step = rand() < 0.5 ? 1 : 2; // rotate through all five tool kinds so neighbours differ
  for (let i = 0; i < slots; i++) {
    const x = -w / 2 + 0.2 + (i * (w - 0.4)) / (slots - 1);
    const kind = (offset + i * step) % 5;
    const top = h / 2 - 0.13;
    if (kind === 0) {
      P.cyl("metal", x, top - 0.17, 0.09, 0.014, 0.34, "y", { color: steel, segments: 8 });
      P.box("metal", x, top - 0.02, 0.09, 0.07, 0.05, 0.025, { color: steel });
    } else if (kind === 1) {
      P.cyl("metal", x, top - 0.16, 0.09, 0.012, 0.3, "y", { color: dark, segments: 8 });
      P.box("paintedMetal", x, top - 0.02, 0.09, 0.1, 0.045, 0.045, { color: black });
    } else if (kind === 2) {
      P.cyl("paintedMetal", x, top - 0.13, 0.085, 0.085, 0.03, "z", { color: black, segments: 14 });
      P.cyl("paintedMetal", x, top - 0.13, 0.085, 0.045, 0.034, "z", { color: dark, segments: 12 });
    } else if (kind === 3) {
      P.box("paintedMetal", x, top - 0.15, 0.075, 0.16, 0.24, 0.012, { color: col(PALETTE, "impWhite") });
      P.box("paintedMetal", x, top - 0.1, 0.083, 0.1, 0.02, 0.006, { color: black });
      P.box("paintedMetal", x, top - 0.16, 0.083, 0.1, 0.02, 0.006, { color: black });
    } else {
      P.cyl("paintedMetal", x, top - 0.12, 0.09, 0.04, 0.2, "y", { color: col(PALETTE, "impRed"), segments: 10 });
      P.cyl("metal", x, top - 0.005, 0.09, 0.015, 0.03, "y", { color: steel, segments: 8 });
    }
  }
  P.box("hazard", -w / 2 + 0.3, -h / 2 + 0.035, 0.056, 0.36, 0.05, 0.006, { texel: 2 });
  P.box(accent, w / 2 - 0.12, h / 2 - 0.05, 0.056, 0.1, 0.02, 0.006);
  P.box("emitRedImp", w / 2 - 0.26, h / 2 - 0.05, 0.056, 0.04, 0.02, 0.006);
}

// Wall-hung equipment cabinet (two doors, handles, seam, status LEDs) with its centre at pos on the
// wall face; body d proud of the wall. Collides (head height).
export function wallCabinet(kit, PALETTE, pos, yaw, { w = 0.9, h = 0.8, d = 0.3, color, accent = "emitBlue", seed = 1 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = col(PALETTE, "impBlack");
  P.box("paintedMetal", 0, 0, d / 2, w, h, d, { color: color || col(PALETTE, "impMid"), texel: 2.5 });
  for (const s of [-1, 1]) {
    P.box("impPanel", (s * (w / 2 - 0.02)) / 2, 0, d + 0.01, w / 2 - 0.06, h - 0.1, 0.02, { color: col(PALETTE, "impGrey"), uv: "keep" });
    P.box("metal", s * 0.07, -0.05, d + 0.035, 0.02, 0.16, 0.02, { color: col(PALETTE, "steel") });
  }
  P.box("paintedMetal", 0, 0, d + 0.021, 0.02, h - 0.1, 0.01, { color: black });
  P.box("paintedMetal", 0, -h / 2 + 0.04, d + 0.021, w - 0.1, 0.03, 0.01, { color: black });
  P.box(rand() < 0.5 ? accent : "emitGreen", w / 2 - 0.12, h / 2 - 0.05, d + 0.024, 0.08, 0.02, 0.006);
  if (rand() < 0.5) P.box("emitRedImp", w / 2 - 0.24, h / 2 - 0.05, d + 0.024, 0.04, 0.02, 0.006);
  P.collider([-w / 2, -h / 2, 0], [w / 2, h / 2, d + 0.04], "wall-cabinet");
}

// Workbench against a wall (back at local z = 0, top at 0.9 m): dark slab on two black pedestals,
// under-shelf, back splash with an indicator field and accent line, seeded bench-top items (parts
// box, canister, vise, slate, tools).
export function workbench(kit, PALETTE, pos, yaw, { len = 2.4, depth = 0.8, accent = "emitAmber", seed = 1 } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const dark = col(PALETTE, "impDark");
  const black = col(PALETTE, "impBlack");
  const steel = col(PALETTE, "steel");
  P.box("paintedMetal", 0, 0.88, depth / 2, len, 0.06, depth, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, 0.915, depth / 2, len - 0.08, 0.01, depth - 0.08, { color: col(PALETTE, "impMid"), texel: 2.5 });
  for (const s of [-1, 1]) P.box("paintedMetal", s * (len / 2 - 0.2), 0.425, depth / 2, 0.14, 0.85, depth - 0.15, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, 0.32, depth / 2, len - 0.6, 0.04, depth - 0.25, { color: col(PALETTE, "impMid"), texel: 2.5 });
  P.box("paintedMetal", 0, 0.06, depth / 2, len - 0.3, 0.12, depth - 0.2, { color: black, texel: 2.5 });
  // back splash on the wall
  P.box("paintedMetal", 0, 1.17, 0.03, len, 0.5, 0.06, { color: dark, texel: 2.5 });
  indicatorField(P, -len / 4, 1.2, 0.065, len / 2 - 0.3, 0.16, seed + 3);
  P.box("darkGloss", len / 4, 1.2, 0.065, len / 2 - 0.3, 0.2, 0.02);
  for (let i = 0; i < 5; i++) P.box(i % 2 ? "emitRedImp" : accent, len / 4 - 0.3 + i * 0.15, 1.2, 0.08, 0.06, 0.03, 0.006);
  P.box(accent, 0, 0.945, 0.03, len - 0.4, 0.012, 0.01);
  // bench-top items
  P.box("paintedMetal", -len / 2 + 0.45, 1.03, depth / 2 - 0.05, 0.42, 0.24, 0.3, { color: col(PALETTE, "impGrey"), texel: 2.5 });
  P.box("paintedMetal", -len / 2 + 0.45, 1.16, depth / 2 - 0.05, 0.36, 0.02, 0.24, { color: black });
  P.box("paintedMetal", -len / 2 + 1.05, 1.02, depth / 2 - 0.15, 0.24, 0.2, 0.2, { color: black, texel: 2.5 });
  P.cyl("metal", -len / 2 + 1.05, 1.16, depth / 2 - 0.15, 0.03, 0.26, "x", { color: steel, segments: 10 });
  P.cyl("paintedMetal", len / 2 - 0.5, 1.07, depth / 2 - 0.2, 0.08, 0.32, "y", { color: rand() < 0.5 ? col(PALETTE, "impRed") : col(PALETTE, "impAmber"), segments: 12 });
  P.box("darkGloss", len / 2 - 1.0, 0.925, depth / 2 + 0.1, 0.4, 0.015, 0.28);
  P.box(accent, len / 2 - 1.0, 0.935, depth / 2 + 0.1, 0.28, 0.004, 0.16);
  P.cyl("metal", len / 2 - 0.25, 0.94, depth / 2 - 0.1, 0.012, 0.3, "x", { color: steel, segments: 8 });
  P.collider([-len / 2, 0, 0], [len / 2, 0.95, depth], "workbench");
}

// Shared crate plus shipping dressing on the front (+Z) face: white label plate with two text bars,
// hazard tape band, two steel latches clamping the raised panel edge, a coloured stencil bar.
export function dressedCrate(kit, PALETTE, pos, yaw, opts = {}) {
  const { w = 1.2, h = 1.2, d = 1.2, seed = 5 } = opts;
  crate(kit, PALETTE, pos, yaw, opts);
  const P = placer(kit, pos, yaw);
  const rand = rng(seed * 17 + 3);
  const black = col(PALETTE, "impBlack");
  const zf = d / 2;
  if (w >= 0.7) {
    P.box("paintedMetal", -w / 4, h * 0.42, zf + 0.022, 0.24, 0.15, 0.01, { color: col(PALETTE, "impWhite") });
    P.box("paintedMetal", -w / 4, h * 0.42 + 0.035, zf + 0.029, 0.16, 0.02, 0.004, { color: black });
    P.box("paintedMetal", -w / 4 - 0.02, h * 0.42 - 0.02, zf + 0.029, 0.12, 0.02, 0.004, { color: black });
    P.box("paintedMetal", w / 4, h * 0.42, zf + 0.022, 0.26, 0.05, 0.01, { color: rand() < 0.5 ? col(PALETTE, "impAmber") : col(PALETTE, "impRed") });
  }
  P.box("hazard", 0, h * 0.2, zf + 0.021, w - 0.34, 0.05, 0.008, { texel: 2 });
  for (const s of [-1, 1]) P.box("metal", s * (w / 2 - 0.12), h - 0.3, zf + 0.03, 0.06, 0.09, 0.04, { color: col(PALETTE, "steel") });
}

// Shared cabinet plus door dressing so it stops reading as a grey box: a white label plate with text
// bars at chest height, three dark vent slats on the lower door, a hazard band along the base, a
// recessed latch strip and a second (red) status LED.
export function dressedCabinet(kit, PALETTE, pos, yaw, opts = {}) {
  const { w = 1.2, h = 1.8, d = 0.5, seed = 9 } = opts;
  cabinet(kit, PALETTE, pos, yaw, opts);
  const P = placer(kit, pos, yaw);
  const rand = rng(seed * 13 + 5);
  const black = col(PALETTE, "impBlack");
  const zf = d / 2 + 0.024;
  P.box("paintedMetal", -w / 4, h * 0.62, zf + 0.008, 0.22, 0.14, 0.008, { color: col(PALETTE, "impWhite") });
  P.box("paintedMetal", -w / 4, h * 0.62 + 0.03, zf + 0.014, 0.15, 0.018, 0.004, { color: black });
  P.box("paintedMetal", -w / 4 - 0.02, h * 0.62 - 0.02, zf + 0.014, 0.11, 0.018, 0.004, { color: black });
  for (let k = 0; k < 3; k++) P.box("paintedMetal", w / 4, 0.42 + k * 0.09, zf + 0.008, w / 2 - 0.3, 0.035, 0.008, { color: black });
  P.box("hazard", 0, 0.1, zf + 0.006, w - 0.2, 0.06, 0.006, { texel: 2 });
  P.box("paintedMetal", 0, h * 0.5, zf + 0.006, 0.05, 0.4, 0.008, { color: black });
  P.box(rand() < 0.5 ? "emitRedImp" : "emitGreen", -w / 2 + 0.15, h - 0.42, zf + 0.006, 0.04, 0.02, 0.006);
}

// Wall-mounted pedestal comms terminal: black column, angled head with one screen and a key field,
// front (screen) toward local +Z.
export function commsPedestal(kit, PALETTE, pos, yaw, { screenMat = "screenImp0", accent = "emitBlue", seed = 4 } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  P.box("paintedMetal", 0, 0.55, 0, 0.6, 1.1, 0.45, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, 0.05, 0, 0.7, 0.1, 0.55, { color: dark });
  P.box("paintedMetal", 0, 0.7, 0.23, 0.44, 0.7, 0.02, { color: dark });
  const tilt = -0.5;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  P.add("paintedMetal", new THREE.BoxGeometry(0.7, 0.5, 0.3), 0, 1.25, -0.02, { quat: q, color: black, texel: 2.5 });
  const nz = 0.16 * Math.cos(tilt);
  const ny = -0.16 * Math.sin(tilt);
  kit.add("darkGloss", new THREE.BoxGeometry(0.58, 0.36, 0.02), { pos: P.world(0, 1.25 + ny, -0.02 + nz), quat: q });
  kit.add(screenMat, new THREE.BoxGeometry(0.52, 0.3, 0.02), { pos: P.world(0, 1.25 + ny * 1.08, -0.02 + nz * 1.08), quat: q, uv: "keep" });
  indicatorField(P, 0, 1.0, 0.245, 0.4, 0.14, seed);
  P.box(accent, 0, 0.88, 0.245, 0.36, 0.012, 0.01);
  P.box(accent, 0, 1.45, 0.05, 0.5, 0.012, 0.01);
  P.collider([-0.35, 0, -0.28], [0.35, 1.55, 0.28], "pedestal");
}
