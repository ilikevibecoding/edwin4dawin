// Local Imperial props for the hub modules (lift lobbies + corridors): abstract signage, service
// panels, benches, fire points, ceiling coffers/channels and floor lanes. Everything goes through
// the shared placer so it can be dropped against any wall face; material keys are restricted to the
// set the shell already uses plus darkGloss / metal / hazard / the four emit* indicator colours.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { col } from "../_shared/palette.js";
import { placer, indicatorField, pipe } from "../_shared/props.js";

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
  P.box("paintedMetal", 0, 0, d / 2 + 0.005, w, h, d, { color: dark, texel: 1 });
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
  P.box("paintedMetal", 0, 0, 0.05, w + 0.16, h + 0.16, 0.1, { color: col(PALETTE, "impBlack"), texel: 1 });
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
  P.box("paintedMetal", 0, 0.76, 0.025, len, 0.5, 0.04, { color: dark, texel: 1 });
  P.box("paintedMetal", 0, 0.46, 0.295, len, 0.08, 0.5, { color: col(PALETTE, "impMid"), texel: 1 });
  P.box("paintedMetal", 0, 0.505, 0.295, len - 0.12, 0.01, 0.42, { color: col(PALETTE, "impGrey"), texel: 1 });
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
  P.box("paintedMetal", 0, 0.7, 0.18, 0.7, 1.4, 0.35, { color: red, texel: 1 });
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
    P.box("paintedMetal", x, h / 2 + 0.2, depth / 2 + 0.005, jamb, h + 0.4, depth, { color: dark, texel: 1 });
    P.box("paintedMetal", x, h / 2, depth + 0.025, jamb - 0.1, h - 0.7, 0.04, { color: col(PALETTE, "impMid"), texel: 1 });
    P.box("paintedMetal", x, 0.2, depth + 0.03, jamb + 0.02, 0.4, 0.05, { color: black });
    P.collider([x - jamb / 2, 0, 0], [x + jamb / 2, h + 0.4, depth + 0.03], "bay-jamb");
  }
  P.box("paintedMetal", 0, h + 0.2, depth / 2 + 0.005, w - 2 * jamb, 0.4, depth, { color: dark, texel: 1 });
  P.box("paintedMetal", 0, h - 0.06, depth / 2 + 0.005, w - 2 * jamb, 0.12, depth - 0.1, { color: black });
  P.box(lightMat, 0, h - 0.13, depth / 2 + 0.005, w - 2 * jamb - 0.4, 0.02, 0.14);
  P.box("emitRedImp", 0, h + 0.2, depth + 0.012, 0.12, 0.05, 0.01);
  P.box("impFloor", 0, 0.006, depth / 2 + 0.1, w - 2 * jamb - 0.04, 0.012, depth + 0.2, { color: black, texel: 1 });
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
  const mid = col(PALETTE, "impMid");
  kit.boxMM("paintedMetal", [x0, yb0, z0], [x1, yb1, z0 + beam], { color: dark, texel: 1 });
  kit.boxMM("paintedMetal", [x0, yb0, z1 - beam], [x1, yb1, z1], { color: dark, texel: 1 });
  kit.boxMM("paintedMetal", [x0, yb0, z0 + beam], [x0 + beam, yb1, z1 - beam], { color: dark, texel: 1 });
  kit.boxMM("paintedMetal", [x1 - beam, yb0, z0 + beam], [x1, yb1, z1 - beam], { color: dark, texel: 1 });
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
  kit.boxMM("paintedMetal", [ix0, ceilY - 0.34, iz0], [ix1, ceilY - 0.26, iz1], { color: black, texel: 1 });
  for (let i = 0; i < strips; i++) {
    if (axis === "x") {
      const z = iz0 + ((i + 0.5) / strips) * (iz1 - iz0);
      kit.boxMM("paintedMetal", [ix0 + 0.25, ceilY - 0.4, z - 0.17], [ix1 - 0.25, ceilY - 0.34, z + 0.17], { color: mid });
      kit.boxMM(stripMat, [ix0 + 0.35, ceilY - 0.425, z - 0.1], [ix1 - 0.35, ceilY - 0.4, z + 0.1]);
    } else {
      const x = ix0 + ((i + 0.5) / strips) * (ix1 - ix0);
      kit.boxMM("paintedMetal", [x - 0.17, ceilY - 0.4, iz0 + 0.25], [x + 0.17, ceilY - 0.34, iz1 - 0.25], { color: mid });
      kit.boxMM(stripMat, [x - 0.1, ceilY - 0.425, iz0 + 0.35], [x + 0.1, ceilY - 0.4, iz1 - 0.35]);
    }
  }
}

// Ceiling light channel between two world points (axis-aligned): black housing, grey edging and
// segmented emitter strips — the same look as the shell's channels so both can be mixed.
export function lightChannel(kit, PALETTE, a, b, ceilY, { w = 0.5, mat = "emitWhite", seg = 2.0, stripW = 0.18 } = {}) {
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[2], b[2]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[2], b[2]);
  const c = alongX ? a[2] : a[0];
  const black = col(PALETTE, "impBlack");
  const mid = col(PALETTE, "impMid");
  const r = (c0, c1, y0, y1, m, opts) => (alongX ? kit.boxMM(m, [lo, y0, c0], [hi, y1, c1], opts) : kit.boxMM(m, [c0, y0, lo], [c1, y1, hi], opts));
  r(c - w / 2, c + w / 2, ceilY - 0.12, ceilY - 0.02, "paintedMetal", { color: black });
  r(c - w / 2 - 0.05, c - w / 2, ceilY - 0.1, ceilY - 0.02, "paintedMetal", { color: mid });
  r(c + w / 2, c + w / 2 + 0.05, ceilY - 0.1, ceilY - 0.02, "paintedMetal", { color: mid });
  const len = hi - lo;
  const n = Math.max(1, Math.round(len / seg));
  for (let i = 0; i < n; i++) {
    const s0 = lo + (len * i) / n + 0.12;
    const s1 = lo + (len * (i + 1)) / n - 0.12;
    if (alongX) kit.boxMM(mat, [s0, ceilY - 0.11, c - stripW / 2], [s1, ceilY - 0.09, c + stripW / 2]);
    else kit.boxMM(mat, [c - stripW / 2, ceilY - 0.11, s0], [c + stripW / 2, ceilY - 0.09, s1]);
  }
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
  P.box("paintedMetal", 0, 0, 0.04, w + 0.12, h + 0.12, 0.08, { color: col(PALETTE, "impBlack"), texel: 1 });
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
  kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08), { pos: at(0, -0.04), quat: q, color: black, texel: 1 });
  kit.add("darkGloss", new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.01), { pos: at(0, 0.002), quat: q });
  kit.add(mat, new THREE.BoxGeometry(w, h, 0.01), { pos: at(0, 0.012), quat: q, uv: "keep" });
  kit.add(accent, new THREE.BoxGeometry(w * 0.6, 0.012, 0.01), { pos: at(-h / 2 - 0.03, 0), quat: q });
  // mount block behind the upper half (the housing back leans away from the wall there) + brackets
  P.box("paintedMetal", 0, 0.17, 0.07, w - 0.3, 0.34, 0.14, { color: dark, texel: 1 });
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
  r(c - w / 2, c + w / 2, y - 0.02, y, "paintedMetal", { color: dark, texel: 1 });
  r(c - w / 2, c - w / 2 + 0.02, y, y + h, "paintedMetal", { color: dark });
  r(c + w / 2 - 0.02, c + w / 2, y, y + h, "paintedMetal", { color: dark });
  const len = hi - lo;
  const n = Math.floor(len / strap);
  for (let i = 1; i <= n; i++) {
    const t = lo + (len * i) / (n + 1);
    if (alongX) kit.boxMM("paintedMetal", [t - 0.03, y - 0.03, c - w / 2 - 0.02], [t + 0.03, y + h + 0.01, c + w / 2 + 0.02], { color: col(PALETTE, "impBlack") });
    else kit.boxMM("paintedMetal", [c - w / 2 - 0.02, y - 0.03, t - 0.03], [c + w / 2 + 0.02, y + h + 0.01, t + 0.03], { color: col(PALETTE, "impBlack") });
  }
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
      kit.box("paintedMetal", c[0], c[1], c[2], s, s, s, { color: dark, texel: 1 });
      pipe(kit, PALETTE, f.world(u, ry, wallT - 0.05), c, run.r, { color, bracket: 99 });
      const fl = run.r * 2 + 0.24;
      kit.add("paintedMetal", new THREE.BoxGeometry(...f.size(fl, fl, 0.08)), { pos: f.world(u, ry, wallT + 0.04), color: black, texel: 1 });
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
  kit.box("paintedMetal", pos[0], pos[1], pos[2], size, 0.32, size, { color: col(PALETTE, "impDark"), texel: 1 });
  kit.box("paintedMetal", pos[0], pos[1] - 0.17, pos[2], size - 0.1, 0.02, size - 0.1, { color: col(PALETTE, "impBlack") });
}

// Wall-mounted pedestal comms terminal: black column, angled head with one screen and a key field,
// front (screen) toward local +Z.
export function commsPedestal(kit, PALETTE, pos, yaw, { screenMat = "screenImp0", accent = "emitBlue", seed = 4 } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  P.box("paintedMetal", 0, 0.55, 0, 0.6, 1.1, 0.45, { color: black, texel: 1 });
  P.box("paintedMetal", 0, 0.05, 0, 0.7, 0.1, 0.55, { color: dark });
  P.box("paintedMetal", 0, 0.7, 0.23, 0.44, 0.7, 0.02, { color: dark });
  const tilt = -0.5;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  P.add("paintedMetal", new THREE.BoxGeometry(0.7, 0.5, 0.3), 0, 1.25, -0.02, { quat: q, color: black, texel: 1 });
  const nz = 0.16 * Math.cos(tilt);
  const ny = -0.16 * Math.sin(tilt);
  kit.add("darkGloss", new THREE.BoxGeometry(0.58, 0.36, 0.02), { pos: P.world(0, 1.25 + ny, -0.02 + nz), quat: q });
  kit.add(screenMat, new THREE.BoxGeometry(0.52, 0.3, 0.02), { pos: P.world(0, 1.25 + ny * 1.08, -0.02 + nz * 1.08), quat: q, uv: "keep" });
  indicatorField(P, 0, 1.0, 0.245, 0.4, 0.14, seed);
  P.box(accent, 0, 0.88, 0.245, 0.36, 0.012, 0.01);
  P.box(accent, 0, 1.45, 0.05, 0.5, 0.012, 0.01);
  P.collider([-0.35, 0, -0.28], [0.35, 1.55, 0.28], "pedestal");
}
