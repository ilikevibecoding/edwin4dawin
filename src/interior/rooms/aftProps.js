// Kit-bash props shared by the aft crew-deck rooms (lounge, briefing, armoury, detention, life support).
// Everything here merges into the room's Kit; nothing allocates per frame.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PALETTE } from "../../materials.js";
import { decalRect, GRATE_TILE } from "../../textures.js";
import { Frame, pointLight, WALL_T } from "../lib.js";

export const UP = new THREE.Vector3(0, 1, 0);

// Frame standing on the floor at (x, y, z) whose normal points toward `facing`; u runs left -> right as
// seen from the front (u = 0 at the frame origin), v up.
export function standFrame(kit, x, y, z, facing) {
  const U = facing === "+x" ? new THREE.Vector3(0, 0, -1) : facing === "-x" ? new THREE.Vector3(0, 0, 1) : facing === "+z" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
  return new Frame(kit, new THREE.Vector3(x, y, z), U, UP);
}

// Dark ceiling plate with cross ribs and no light channels: rooms add their own fixtures. Matte paint,
// not metal: a metallic plate throws a specular blob for every pooled light.
export function ceilingPlate(kit, room, yTop, opts = {}) {
  const { ribStep = 3.2, wallDepth = WALL_T } = opts;
  const { x0, x1, z0, z1 } = room;
  const w = x1 - x0;
  const d = z1 - z0;
  kit.boxMM("painted", [x0 - wallDepth, yTop, z0 - wallDepth], [x1 + wallDepth, yTop + 0.12, z1 + wallDepth], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  const longX = w >= d;
  const n = Math.max(1, Math.floor((longX ? w : d) / ribStep));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (longX) kit.box("paintedMetal", x0 + w * t, yTop - 0.09, (z0 + z1) / 2, 0.16, 0.18, d, { color: PALETTE.darkMetal, texel: 1.2 });
    else kit.box("paintedMetal", (x0 + x1) / 2, yTop - 0.09, z0 + d * t, w, 0.18, 0.16, { color: PALETTE.darkMetal, texel: 1.2 });
  }
}

// Wall stencil: painted plate carrying a decal from the shared sheet.
export function stencil(frame, u, v, size, idx, opts = {}) {
  const { color = PALETTE.cream, plate = true, n = 0, mat = "painted" } = opts;
  if (plate) frame.box(mat, u, v, n + 0.006, size + 0.1, size + 0.1, 0.012, { color, uv: "keep" });
  frame.add("decal", new THREE.PlaneGeometry(size, size), u, v, n + (plate ? 0.0135 : 0.002), { uv: "keep", uvRect: decalRect(idx) });
}

// Floor stencil (faces up), spun by yaw about the vertical.
export function floorStencil(kit, x, y, z, size, idx, yaw = 0) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("decal", g, { pos: [x, y + 0.004, z], uv: "keep", uvRect: decalRect(idx) });
}

// Recessed ceiling downlight can.
export function downlight(kit, x, yTop, z, mat = "emitWarmSoft", r = 0.09) {
  kit.cyl("satinBlack", x, yTop - 0.02, z, r + 0.035, 0.04, "y", { segments: 14 });
  kit.cyl(mat, x, yTop - 0.045, z, r, 0.012, "y", { segments: 14, uv: "keep" });
}

// Pendant lamp: rod, drum shade, diffuser underneath and the practical light below it.
export function pendant(kit, ctx, x, yTop, z, opts = {}) {
  const { drop = 0.8, r = 0.32, color = 0xffb070, intensity = 4, distance = 7, mat = "emitWarmSoft", family = "warm" } = opts;
  const yShade = yTop - drop;
  kit.cyl("paintedMetal", x, yTop - 0.03, z, 0.08, 0.06, "y", { color: PALETTE.gunmetal, segments: 10 });
  kit.cyl("metal", x, yTop - drop / 2 - 0.1, z, 0.012, drop - 0.2, "y", { color: PALETTE.gunmetal, segments: 6 });
  kit.cyl("satinBlack", x, yShade + 0.1, z, r, 0.2, "y", { segments: 20 });
  kit.cyl("metal", x, yShade + 0.2, z, r - 0.03, 0.02, "y", { color: PALETTE.steel, segments: 20 });
  kit.cyl(mat, x, yShade - 0.004, z, r - 0.05, 0.012, "y", { segments: 20, uv: "keep" });
  if (intensity > 0) ctx.lights[family].push(pointLight(color, intensity, distance, [x, yShade - 0.3, z]));
}

// Industrial cage lamp hung from a duct or the ceiling: stem, conical hood, guard bars and the practical.
export function workLamp(kit, ctx, x, yMount, z, opts = {}) {
  const { drop = 0.5, color = 0xdfe8ff, intensity = 10, distance = 9, mat = "emitCoolSoft", family = "cool" } = opts;
  const yHood = yMount - drop;
  kit.cyl("metal", x, yMount - 0.02, z, 0.07, 0.04, "y", { color: PALETTE.darkMetal, segments: 10 });
  kit.cyl("metal", x, yMount - drop / 2, z, 0.014, drop, "y", { color: PALETTE.gunmetal, segments: 6 });
  kit.add("metal", new THREE.CylinderGeometry(0.07, 0.21, 0.18, 14), { pos: [x, yHood + 0.09, z], color: PALETTE.darkMetal, uv: "scale", uvScale: [2, 0.3] });
  kit.cyl(mat, x, yHood - 0.002, z, 0.17, 0.012, "y", { segments: 14, uv: "keep" });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    kit.cyl("satinBlack", x + Math.cos(a) * 0.18, yHood - 0.1, z + Math.sin(a) * 0.18, 0.006, 0.2, "y", { segments: 4 });
  }
  kit.add("satinBlack", new THREE.TorusGeometry(0.18, 0.007, 4, 14), { pos: [x, yHood - 0.2, z], rot: [Math.PI / 2, 0, 0], uv: "scale", uvScale: [4, 1] });
  ctx.lights[family].push(pointLight(color, intensity, distance, [x, yHood - 0.28, z]));
}

// Free-standing column lamp: cast base, slim stem, a tall drum diffuser and the practical inside it.
export function floorLamp(kit, ctx, x, y, z, opts = {}) {
  const { h = 1.7, color = 0xffb070, intensity = 6, distance = 9, mat = "emitWarmSoft", family = "warm" } = opts;
  kit.cyl("metal", x, y + 0.025, z, 0.22, 0.05, "y", { color: PALETTE.darkMetal, segments: 16 });
  kit.cyl("metal", x, y + (h - 0.45) / 2 + 0.05, z, 0.025, h - 0.45, "y", { color: PALETTE.gunmetal, segments: 8 });
  kit.cyl("satinBlack", x, y + h - 0.42, z, 0.13, 0.04, "y", { segments: 16 });
  kit.cyl(mat, x, y + h - 0.2, z, 0.11, 0.4, "y", { segments: 16, uv: "keep" });
  kit.cyl("satinBlack", x, y + h + 0.02, z, 0.13, 0.04, "y", { segments: 16 });
  kit.collider([x - 0.22, y, z - 0.22], [x + 0.22, y + h, z + 0.22], "lamp");
  ctx.lights[family].push(pointLight(color, intensity, distance, [x, y + h - 0.2, z]));
}

// Box whose long side runs along `axis`: cAlong / cAcross are the centre along / across that axis.
export function alongBox(kit, mat, axis, cAlong, cAcross, cy, len, across, h, opts = {}) {
  if (axis === "x") return kit.box(mat, cAlong, cy, cAcross, len, h, across, opts);
  return kit.box(mat, cAcross, cy, cAlong, across, h, len, opts);
}

// Padded bench on a satin-black plinth. Runs along `axis`, `facing` is the side the sitter faces:
// +1 toward +across, -1 toward -across. Adds its collider.
export function bench(kit, axis, cAlong, cAcross, y, len, opts = {}) {
  const { depth = 0.5, seatH = 0.45, back = true, color = PALETTE.fabricTeal, facing = -1, collide = true } = opts;
  alongBox(kit, "satinBlack", axis, cAlong, cAcross, y + (seatH - 0.08) / 2, len, depth - 0.08, seatH - 0.08);
  alongBox(kit, "metal", axis, cAlong, cAcross, y + 0.03, len + 0.04, depth - 0.04, 0.06, { color: PALETTE.darkMetal, texel: 2 });
  alongBox(kit, "fabric", axis, cAlong, cAcross, y + seatH - 0.04, len, depth, 0.1, { color, uv: "world", texel: 2 });
  if (back) {
    const bAcross = cAcross - facing * (depth / 2 - 0.05);
    alongBox(kit, "fabric", axis, cAlong, bAcross, y + seatH + 0.22, len, 0.1, 0.44, { color, uv: "world", texel: 2 });
    alongBox(kit, "satinBlack", axis, cAlong, bAcross - facing * 0.06, y + seatH + 0.2, len, 0.03, 0.5);
  }
  if (collide) {
    const half = depth / 2 + 0.02;
    if (axis === "x") kit.collider([cAlong - len / 2, y, cAcross - half], [cAlong + len / 2, y + seatH + 0.5, cAcross + half], "bench");
    else kit.collider([cAcross - half, y, cAlong - len / 2], [cAcross + half, y + seatH + 0.5, cAlong + len / 2], "bench");
  }
}

// Rounded box placed by centre; `rot` optional Euler.
function roundedBox(kit, mat, pos, size, radius, opts = {}) {
  kit.add(mat, new RoundedBoxGeometry(size[0], size[1], size[2], opts.segments || 2, radius), { pos, ...opts });
}

// Lounge sofa: dark satin shell on a recessed plinth, fat rounded seat and back cushions (one per seat),
// padded armrests with a pale accent pad, a warm glow strip under the front edge. Runs along `axis`,
// `facing` like bench() (+1 sitter faces +across).
export function sofa(kit, axis, cAlong, cAcross, y, len, opts = {}) {
  const { color = PALETTE.fabricTeal, cushion = color, accent = PALETTE.fabricCream, facing = 1, depth = 0.95, shell = PALETTE.impGreyDark, glow = "emitWarmSoft" } = opts;
  const X = axis === "x";
  const P = (a, yy, c) => (X ? [a, yy, c] : [c, yy, a]);
  const S = (sa, sy, sc) => (X ? [sa, sy, sc] : [sc, sy, sa]);
  const R = (tiltAcross) => (X ? [tiltAcross, 0, 0] : [0, 0, -tiltAcross]);
  const armW = 0.22;
  const inner = len - 2 * armW;
  const bAcross = cAcross - facing * (depth / 2 - 0.11); // back shell centre
  // plinth (recessed, so the shell appears to float), base shell, glow strip
  alongBox(kit, "satinBlack", axis, cAlong, cAcross, y + 0.045, len - 0.24, depth - 0.34, 0.09);
  roundedBox(kit, "painted", P(cAlong, y + 0.24, cAcross), S(len, 0.3, depth - 0.06), 0.04, { color: shell, uv: "world", texel: 0.8 });
  alongBox(kit, glow, axis, cAlong, cAcross + facing * (depth / 2 - 0.2), y + 0.1, len - 0.5, 0.04, 0.02, { uv: "keep" });
  // back shell (a tall rounded slab) with a satin cap rail
  roundedBox(kit, "painted", P(cAlong, y + 0.6, bAcross), S(len, 0.72, 0.2), 0.04, { color: shell, uv: "world", texel: 0.8 });
  alongBox(kit, "satinBlack", axis, cAlong, bAcross, y + 0.965, len + 0.02, 0.24, 0.03);
  // one seat + back cushion per place
  const n = Math.max(1, Math.round(inner / 0.72));
  const secLen = inner / n;
  for (let i = 0; i < n; i++) {
    const a = cAlong - inner / 2 + secLen * (i + 0.5);
    roundedBox(kit, "fabric", P(a, y + 0.48, cAcross + facing * 0.09), S(secLen - 0.035, 0.2, depth - 0.42), 0.07, { color: cushion, uv: "world", texel: 2, segments: 3 });
    roundedBox(kit, "fabric", P(a, y + 0.76, bAcross + facing * 0.17), S(secLen - 0.035, 0.5, 0.17), 0.07, { color, uv: "world", texel: 2, segments: 3, rot: R(-facing * 0.12) });
    // pale piping seam between seat and back
    alongBox(kit, "fabric", axis, a, bAcross + facing * 0.26, y + 0.585, secLen - 0.08, 0.03, 0.02, { color: accent, uv: "world", texel: 2 });
  }
  // armrests: shell block + fabric pad
  for (const s of [-1, 1]) {
    const a = cAlong + s * (len / 2 - armW / 2);
    roundedBox(kit, "painted", P(a, y + 0.42, cAcross), S(armW, 0.66, depth - 0.1), 0.04, { color: shell, uv: "world", texel: 0.8 });
    roundedBox(kit, "fabric", P(a, y + 0.78, cAcross + facing * 0.03), S(armW - 0.02, 0.08, depth - 0.28), 0.03, { color: accent, uv: "world", texel: 2 });
  }
  const half = depth / 2 + 0.02;
  if (X) kit.collider([cAlong - len / 2, y, cAcross - half], [cAlong + len / 2, y + 1.05, cAcross + half], "sofa");
  else kit.collider([cAcross - half, y, cAlong - len / 2], [cAcross + half, y + 1.05, cAlong + len / 2], "sofa");
}

// Single armchair spun by yaw (0 faces +z), same shell language as the sofa.
export function armchair(kit, x, y, z, yaw, opts = {}) {
  const { color = PALETTE.fabricTeal, cushion = color, accent = PALETTE.fabricCream, shell = PALETTE.impGreyDark } = opts;
  const rot = [0, yaw, 0];
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  const P = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c];
  kit.box("satinBlack", ...P(0, 0.045, 0), 0.6, 0.09, 0.6, { rot });
  roundedBox(kit, "painted", P(0, 0.24, 0), [0.86, 0.3, 0.84], 0.04, { rot, color: shell, uv: "world", texel: 0.8 });
  roundedBox(kit, "fabric", P(0, 0.48, 0.08), [0.5, 0.2, 0.52], 0.07, { rot, color: cushion, uv: "world", texel: 2, segments: 3 });
  roundedBox(kit, "painted", P(0, 0.62, -0.34), [0.86, 0.74, 0.2], 0.04, { rot: [-0.1, yaw, 0], color: shell, uv: "world", texel: 0.8 });
  roundedBox(kit, "fabric", P(0, 0.76, -0.2), [0.5, 0.5, 0.17], 0.07, { rot: [-0.12, yaw, 0], color, uv: "world", texel: 2, segments: 3 });
  kit.box("fabric", ...P(0, 0.585, -0.1), 0.46, 0.03, 0.02, { rot, color: accent, uv: "world", texel: 2 });
  for (const sd of [-1, 1]) {
    roundedBox(kit, "painted", P(sd * 0.32, 0.42, 0.02), [0.22, 0.66, 0.8], 0.04, { rot, color: shell, uv: "world", texel: 0.8 });
    roundedBox(kit, "fabric", P(sd * 0.32, 0.78, 0.04), [0.2, 0.08, 0.62], 0.03, { rot, color: accent, uv: "world", texel: 2 });
  }
  kit.collider([x - 0.5, y, z - 0.5], [x + 0.5, y + 1.05, z + 0.5], "chair");
}

// Area rug with real thickness: rounded body, a pale border band and a thin inner accent line.
export function rug(kit, xa, za, xb, zb, y, opts = {}) {
  const { color = PALETTE.fabricTeal, border = PALETTE.fabricCream, line = PALETTE.fabricOrange, bw = 0.22 } = opts;
  const cx = (xa + xb) / 2;
  const cz = (za + zb) / 2;
  const w = xb - xa;
  const d = zb - za;
  roundedBox(kit, "fabric", [cx, y + 0.017, cz], [w, 0.034, d], 0.012, { color: border, uv: "world", texel: 1.5 });
  kit.box("fabric", cx, y + 0.036, cz, w - 2 * bw, 0.004, d - 2 * bw, { color, uv: "world", texel: 1.5 });
  const lw = 0.04;
  const ins = bw + 0.12;
  kit.box("fabric", cx, y + 0.039, za + ins, w - 2 * ins, 0.003, lw, { color: line, uv: "world", texel: 1.5 });
  kit.box("fabric", cx, y + 0.039, zb - ins, w - 2 * ins, 0.003, lw, { color: line, uv: "world", texel: 1.5 });
  kit.box("fabric", xa + ins, y + 0.039, cz, lw, 0.003, d - 2 * ins, { color: line, uv: "world", texel: 1.5 });
  kit.box("fabric", xb - ins, y + 0.039, cz, lw, 0.003, d - 2 * ins, { color: line, uv: "world", texel: 1.5 });
}

// Low table on a pedestal; top at 0.42 m (lounge) or 0.75 m (dining) via opts.h.
export function table(kit, x, y, z, sx, sz, opts = {}) {
  const { h = 0.42, top = PALETTE.gunmetal } = opts;
  kit.box("satinBlack", x, y + h - 0.02, z, sx, 0.04, sz);
  kit.box("metal", x, y + h - 0.045, z, sx - 0.08, 0.012, sz - 0.08, { color: top, texel: 2 });
  kit.box("metal", x, y + (h - 0.06) / 2, z, Math.min(0.5, sx * 0.4), h - 0.06, Math.min(0.35, sz * 0.4), { color: PALETTE.darkMetal, texel: 2 });
  kit.box("metal", x, y + 0.02, z, Math.min(0.9, sx * 0.7), 0.04, Math.min(0.6, sz * 0.7), { color: PALETTE.gunmetal, texel: 2 });
  kit.collider([x - sx / 2, y, z - sz / 2], [x + sx / 2, y + h, z + sz / 2], "table");
}

// Bar stool: cast base, column, rubber seat.
export function stool(kit, x, y, z, opts = {}) {
  const { seatH = 0.46, collide = true, ring = false, seat = PALETTE.rubber } = opts;
  kit.cyl("metal", x, y + 0.02, z, 0.2, 0.04, "y", { color: PALETTE.darkMetal, segments: 16 });
  kit.cyl("metal", x, y + seatH / 2, z, 0.045, seatH - 0.06, "y", { color: PALETTE.gunmetal, segments: 10 });
  kit.cyl("rubber", x, y + seatH - 0.035, z, 0.2, 0.07, "y", { color: seat, segments: 16 });
  if (ring) kit.add("metal", new THREE.TorusGeometry(0.17, 0.012, 6, 16).rotateX(Math.PI / 2), { pos: [x, y + 0.3, z], color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
  if (collide) kit.collider([x - 0.2, y, z - 0.2], [x + 0.2, y + seatH, z + 0.2], "stool");
}

// Mug / cup on a surface.
export function cup(kit, x, y, z, color = PALETTE.tealPaint) {
  kit.cyl("painted", x, y + 0.05, z, 0.04, 0.1, "y", { color, uv: "keep", segments: 10 });
}

// Small storage crate with steel edge bands, an optional hazard stripe and a stencil on the front face.
// `face` is the outward normal of the labelled side (+z default).
export function crate(kit, cx, cy, cz, sx, sy, sz, color, opts = {}) {
  const { decal = null, band = true, face = "+z", collide = false } = opts;
  kit.box("painted", cx, cy, cz, sx, sy, sz, { color, uv: "keep" });
  kit.box("metal", cx, cy - sy / 2 + 0.04, cz, sx + 0.02, 0.08, sz + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  kit.box("metal", cx, cy + sy / 2 - 0.04, cz, sx + 0.02, 0.08, sz + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  for (const s of [-1, 1]) kit.box("metal", cx + s * (sx / 2 - 0.04), cy, cz, 0.08, sy - 0.16, sz + 0.02, { color: PALETTE.darkMetal, texel: 2 });
  if (band) kit.box("hazard", cx, cy + sy * 0.1, cz, sx + 0.012, 0.05, sz + 0.012, { texel: 3 });
  for (const s of [-1, 1]) kit.box("metal", cx + s * (sx / 2 + 0.015), cy + sy * 0.3, cz, 0.03, 0.05, Math.min(0.3, sz * 0.5), { color: PALETTE.steel });
  if (decal !== null) {
    const d = Math.min(sx, sy) * 0.55;
    const g = new THREE.PlaneGeometry(d, d);
    const n = face === "+z" ? [0, 0, 1] : face === "-z" ? [0, 0, -1] : face === "+x" ? [1, 0, 0] : [-1, 0, 0];
    if (face === "-z") g.rotateY(Math.PI);
    if (face === "+x") g.rotateY(Math.PI / 2);
    if (face === "-x") g.rotateY(-Math.PI / 2);
    const off = face === "+z" || face === "-z" ? sz / 2 : sx / 2;
    kit.add("decal", g, { pos: [cx + n[0] * (off + 0.008), cy - sy * 0.05, cz + n[2] * (off + 0.008)], uv: "keep", uvRect: decalRect(decal) });
  }
  if (collide) kit.collider([cx - sx / 2, cy - sy / 2, cz - sz / 2], [cx + sx / 2, cy + sy / 2, cz + sz / 2], "crate");
}

// Blaster rifle standing upright (muzzle up) with its profile in the local y-z plane (muzzle side +z,
// scope side -z) and its right flank toward local +x, spun by yaw about the vertical. Built from
// distinct parts in contrasting finishes so it reads at rack distance: gloss stock with a rubber butt,
// gunmetal receiver with a steel side plate and a red charge lamp, black magazine and grip, long steel
// barrel in a dark shroud with a muzzle flange, and a scope tube with a lens on top of the receiver.
export function rifle(kit, x, y, z, yaw = 0) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const rot = [0, yaw, 0];
  const P = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c];
  // stock and butt pad (the butt is the lowest part; the stock leans back toward -z)
  kit.box("rubber", ...P(0, 0.015, -0.06), 0.06, 0.03, 0.15, { rot, color: PALETTE.rubber });
  kit.box("darkGloss", ...P(0, 0.17, -0.07), 0.05, 0.28, 0.13, { rot });
  kit.box("darkGloss", ...P(0, 0.31, -0.02), 0.05, 0.06, 0.2, { rot });
  // receiver body with a steel side plate, charge lamp and ejection slot
  kit.box("metal", ...P(0, 0.52, 0.0), 0.07, 0.4, 0.18, { rot, color: PALETTE.gunmetal, texel: 3 });
  kit.box("metal", ...P(0.04, 0.55, 0.0), 0.012, 0.22, 0.1, { rot, color: PALETTE.steel, texel: 3 });
  kit.box("emitRed", ...P(0.042, 0.66, -0.05), 0.006, 0.02, 0.02, { rot });
  kit.box("satinBlack", ...P(0.042, 0.45, 0.03), 0.006, 0.04, 0.07, { rot });
  // pistol grip (raked) and trigger guard, magazine ahead of the grip
  kit.box("satinBlack", ...P(0, 0.4, 0.12), 0.04, 0.16, 0.05, { rot: [0.35, yaw, 0] });
  kit.box("satinBlack", ...P(0, 0.335, 0.05), 0.03, 0.012, 0.09, { rot });
  kit.box("satinBlack", ...P(0, 0.44, 0.21), 0.05, 0.2, 0.05, { rot: [-0.12, yaw, 0] });
  // barrel: steel tube in a dark shroud, muzzle flange, forward handguard
  kit.box("metal", ...P(0, 0.79, 0.06), 0.06, 0.16, 0.1, { rot, color: PALETTE.gunmetal, texel: 3 });
  kit.cyl("metal", ...P(0, 0.98, 0.09), 0.03, 0.26, "y", { color: PALETTE.darkMetal, segments: 8 });
  kit.cyl("metal", ...P(0, 1.14, 0.09), 0.015, 0.5, "y", { color: PALETTE.steel, segments: 8 });
  kit.cyl("metal", ...P(0, 1.36, 0.09), 0.03, 0.06, "y", { color: PALETTE.darkMetal, segments: 8 });
  kit.box("metal", ...P(0, 1.1, 0.06), 0.02, 0.1, 0.03, { rot, color: PALETTE.gunmetal });
  // scope: two mounts, tube, lens cap, power dot
  for (const dy of [0.5, 0.64]) kit.box("metal", ...P(0, dy, -0.115), 0.03, 0.03, 0.05, { rot, color: PALETTE.gunmetal });
  kit.cyl("metal", ...P(0, 0.6, -0.15), 0.024, 0.3, "y", { color: PALETTE.darkMetal, segments: 8 });
  kit.cyl("darkGloss", ...P(0, 0.753, -0.15), 0.026, 0.01, "y", { segments: 8 });
  kit.box("emitTeal", ...P(0.02, 0.5, -0.15), 0.012, 0.012, 0.012, { rot });
}

// Trooper-style helmet: white dome, dark visor band, cast ring at the rim. Front toward local +z.
export function helmet(kit, x, y, z, yaw = 0) {
  const g = new THREE.SphereGeometry(0.14, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
  kit.add("painted", g, { pos: [x, y + 0.09, z], rot: [0, yaw, 0], color: PALETTE.impWhite, uv: "world", texel: 2 });
  kit.cyl("metal", x, y + 0.02, z, 0.135, 0.04, "y", { color: PALETTE.gunmetal, segments: 14 });
  kit.box("darkGloss", x + Math.sin(yaw) * 0.1, y + 0.11, z + Math.cos(yaw) * 0.1, 0.2, 0.05, 0.07, { rot: [0, yaw, 0] });
}

// Chest plate standing on a shelf, leaning slightly back against the wall behind it.
export function chestPlate(kit, x, y, z, yaw = 0) {
  kit.add("painted", new RoundedBoxGeometry(0.38, 0.44, 0.1, 3, 0.04), { pos: [x, y + 0.23, z], rot: [-0.12, yaw, 0], color: PALETTE.impWhite, uv: "world", texel: 2 });
  kit.box("darkGloss", x, y + 0.2, z + 0.052, 0.3, 0.03, 0.012, { rot: [-0.12, yaw, 0] });
}

// Grated floor / partition quad using the cut-out grate texture; `w` is the tile-across direction.
export function grateQuad(kit, geo, pos, w, len, opts = {}) {
  kit.add("grate", geo, { pos, uv: "scale", uvScale: [w / GRATE_TILE[0], len / GRATE_TILE[1]], color: 0xffffff, ...opts });
}

// Recessed trench with pipes, a teal light channel and a grated cover the player walks on.
// Runs along `axis` ('x' | 'z') from a to b, centred on c across, width w; the room's own floor
// slabs must leave the trench footprint open.
export function gratedTrench(kit, a, b, c, w, y0, opts = {}) {
  const { depth = 0.5, light = "emitTeal", axis = "x" } = opts;
  const X = axis === "x";
  // world min/max from (along0, y0, across0) .. (along1, y1, across1)
  const MM = (mat, a0, ya, c0, a1, yb, c1, o = {}) => (X ? kit.boxMM(mat, [a0, ya, c0], [a1, yb, c1], o) : kit.boxMM(mat, [c0, ya, a0], [c1, yb, a1], o));
  const BOX = (mat, ca, cy, cc, sa, sy, sc, o = {}) => (X ? kit.box(mat, ca, cy, cc, sa, sy, sc, o) : kit.box(mat, cc, cy, ca, sc, sy, sa, o));
  const CYL = (mat, ca, cy, cc, r, len, o = {}) => (X ? kit.cyl(mat, ca, cy, cc, r, len, "x", o) : kit.cyl(mat, cc, cy, ca, r, len, "z", o));
  const len = b - a;
  const m = (a + b) / 2;
  const h = w / 2;
  MM("metal", a, y0 - depth - 0.08, c - h - 0.05, b, y0 - depth, c + h + 0.05, { color: PALETTE.darkMetal, texel: 1 });
  MM("metal", a, y0 - depth, c - h - 0.06, b, y0, c - h, { color: PALETTE.gunmetal, texel: 1 });
  MM("metal", a, y0 - depth, c + h, b, y0, c + h + 0.06, { color: PALETTE.gunmetal, texel: 1 });
  MM("metal", a - 0.06, y0 - depth, c - h - 0.06, a, y0, c + h + 0.06, { color: PALETTE.gunmetal, texel: 1 });
  MM("metal", b, y0 - depth, c - h - 0.06, b + 0.06, y0, c + h + 0.06, { color: PALETTE.gunmetal, texel: 1 });
  MM(light, a + 0.2, y0 - depth + 0.005, c - h + 0.08, b - 0.2, y0 - depth + 0.03, c - h + 0.14);
  MM(light, a + 0.2, y0 - depth + 0.005, c + h - 0.14, b - 0.2, y0 - depth + 0.03, c + h - 0.08);
  CYL("metal", m, y0 - depth + 0.22, c - h * 0.35, 0.07, len - 0.1, { color: PALETTE.steel, segments: 10 });
  CYL("metal", m, y0 - depth + 0.16, c + h * 0.2, 0.045, len - 0.1, { color: PALETTE.orange, segments: 8 });
  CYL("metal", m, y0 - depth + 0.3, c + h * 0.55, 0.035, len - 0.1, { color: PALETTE.gunmetal, segments: 8 });
  for (let t = a + 0.7; t < b - 0.3; t += 1.6) {
    BOX("metal", t, y0 - depth + 0.22, c - h * 0.35, 0.1, 0.2, 0.2, { color: PALETTE.darkMetal });
    BOX("metal", t + 0.5, y0 - depth + 0.14, c + h * 0.3, 0.12, 0.14, 0.3, { color: PALETTE.darkMetal });
  }
  const g = new THREE.PlaneGeometry(X ? len : w, X ? w : len);
  g.rotateX(-Math.PI / 2);
  grateQuad(kit, g, X ? [m, y0 - 0.004, c] : [c, y0 - 0.004, m], X ? len : w, X ? w : len);
  for (let i = 0; i <= 4; i++) BOX("metal", m, y0 - 0.02, c - h + (w * i) / 4, len, 0.05, 0.035, { color: PALETTE.gunmetal, texel: 2 });
  for (let t = a; t <= b + 0.01; t += 1.2) BOX("metal", Math.min(t, b), y0 - 0.02, c, 0.05, 0.05, w + 0.1, { color: PALETTE.gunmetal, texel: 2 });
  MM("rubber", a - 0.06, y0, c - h - 0.12, b + 0.06, y0 + 0.015, c - h - 0.04, { color: PALETTE.rubber, texel: 2 });
  MM("rubber", a - 0.06, y0, c + h + 0.04, b + 0.06, y0 + 0.015, c + h + 0.12, { color: PALETTE.rubber, texel: 2 });
}

// Pipe run with flanges and a clamp every `step` metres; along 'x' | 'z' between a and b at (across, y).
export function pipeRun(kit, axis, a, b, across, y, r, opts = {}) {
  const { color = PALETTE.steel, step = 2.4, clamps = true } = opts;
  const len = Math.abs(b - a);
  const m = (a + b) / 2;
  if (axis === "x") kit.cyl("metal", m, y, across, r, len, "x", { color, segments: 12 });
  else kit.cyl("metal", across, y, m, r, len, "z", { color, segments: 12 });
  if (!clamps) return;
  for (let t = Math.min(a, b) + step / 2; t < Math.max(a, b); t += step) {
    if (axis === "x") kit.cyl("metal", t, y, across, r + 0.03, 0.08, "x", { color: PALETTE.darkMetal, segments: 12 });
    else kit.cyl("metal", across, y, t, r + 0.03, 0.08, "z", { color: PALETTE.darkMetal, segments: 12 });
  }
}

// Hand-wheel valve on a vertical pipe stub: hub, wheel, stem. Wheel faces `facing`.
export function valveWheel(kit, x, y, z, facing = "+z", r = 0.16) {
  const axis = facing === "+x" || facing === "-x" ? "x" : "z";
  const n = facing === "+x" || facing === "+z" ? 1 : -1;
  const off = (d) => (axis === "x" ? [x + n * d, y, z] : [x, y, z + n * d]);
  kit.cyl("metal", ...off(0.05), 0.05, 0.1, axis, { color: PALETTE.darkMetal, segments: 10 });
  kit.cyl("metal", ...off(0.12), 0.02, 0.14, axis, { color: PALETTE.steel, segments: 8 });
  const torus = new THREE.TorusGeometry(r, 0.018, 8, 20);
  if (axis === "x") torus.rotateY(Math.PI / 2);
  kit.add("painted", torus, { pos: off(0.17), color: PALETTE.orange, uv: "scale", uvScale: [4, 1] });
  const p = off(0.17);
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * Math.PI;
    if (axis === "x") kit.box("metal", p[0], p[1], p[2], 0.02, 0.02, r * 2, { rot: [ang, 0, 0], color: PALETTE.steel });
    else kit.box("metal", p[0], p[1], p[2], r * 2, 0.02, 0.02, { rot: [0, 0, ang], color: PALETTE.steel });
  }
}

// Round gauge with a bezel, a dark dial and an emissive needle, on a wall frame.
export function gauge(frame, u, v, r = 0.12, needle = "emitTeal") {
  frame.cylN("metal", u, v, 0.03, r + 0.02, 0.06, { color: PALETTE.steel, segments: 18 });
  frame.cylN("darkGloss", u, v, 0.061, r, 0.006, { segments: 18 });
  frame.box(needle, u + r * 0.25, v + r * 0.25, 0.066, r * 0.8, 0.012, 0.004, { spin: 0.8 });
  frame.box("leds", u, v - r * 0.55, 0.066, r * 0.9, 0.03, 0.004, { uv: "keep" });
}

// Locker column: painted door with a recessed pull, vent slots, latch and a stencil, on a wall frame.
export function locker(frame, u, w, h, opts = {}) {
  const { color = PALETTE.cream, band = PALETTE.orange, decal = 9, depth = 0.5 } = opts;
  frame.box("metal", u, h / 2, depth / 2, w, h, depth, { color: PALETTE.darkMetal, texel: 1.5 });
  frame.box("painted", u, h / 2 + 0.03, depth + 0.008, w - 0.06, h - 0.1, 0.016, { color, uv: "keep" });
  frame.box("painted", u, h * 0.72, depth + 0.02, w - 0.06, 0.07, 0.01, { color: band, uv: "keep" });
  frame.box("metal", u + w / 2 - 0.1, h * 0.5, depth + 0.03, 0.03, 0.14, 0.03, { color: PALETTE.steel });
  for (let k = 0; k < 4; k++) frame.box("metal", u, h * 0.2 + k * 0.05, depth + 0.02, w * 0.5, 0.012, 0.01, { color: PALETTE.darkMetal });
  frame.add("decal", new THREE.PlaneGeometry(w * 0.4, w * 0.4), u, h * 0.86, depth + 0.02, { uv: "keep", uvRect: decalRect(decal) });
  frame.collider(u - w / 2, u + w / 2, 0, h, 0, depth + 0.05, "locker");
}

// Wall rifle rack: back board, floor tray, mid clamp rail, red status strip and a stencilled header, with
// upright rifle silhouettes every 0.28 m. Rifles face into the room (yaw derived from the frame normal).
export function rifleRack(frame, u0, u1, opts = {}) {
  const { pitch = 0.34, light = "emitCoolSoft" } = opts;
  const kit = frame.kit;
  const uc = (u0 + u1) / 2;
  const len = u1 - u0;
  const yaw = Math.atan2(-frame.N.z, frame.N.x); // rifle profile (local +x) toward the room
  // pale back board so the dark rifles read as silhouettes, with a satin frame
  frame.box("satinBlack", uc, 1.05, 0.025, len + 0.08, 2.1, 0.05);
  frame.box("painted", uc, 1.05, 0.055, len - 0.04, 1.9, 0.01, { color: PALETTE.slate, uv: "world", texel: 0.8 });
  frame.box("metal", uc, 0.22, 0.18, len, 0.05, 0.36, { color: PALETTE.gunmetal, texel: 2 });
  frame.box("metal", uc, 0.03, 0.18, len + 0.04, 0.06, 0.4, { color: PALETTE.darkMetal, texel: 2 });
  frame.box("metal", uc, 1.36, 0.2, len, 0.04, 0.05, { color: PALETTE.steel, texel: 2 });
  frame.box("leds", uc, 0.3, 0.37, len - 0.4, 0.03, 0.006, { uv: "keep" });
  // header hood with a downward diffuser lighting the rack, red status strip on its face
  frame.box("satinBlack", uc, 2.06, 0.2, len + 0.08, 0.12, 0.4);
  frame.box(light, uc, 1.995, 0.22, len - 0.2, 0.01, 0.24, { uv: "keep" });
  frame.box("emitRed", uc, 2.06, 0.405, len - 0.2, 0.03, 0.01);
  for (let u = u0 + pitch / 2; u < u1 - pitch / 2 + 0.01; u += pitch) {
    frame.box("metal", u, 1.36, 0.22, 0.05, 0.08, 0.1, { color: PALETTE.gunmetal });
    frame.box("metal", u, 0.3, 0.24, 0.04, 0.1, 0.02, { color: PALETTE.steel });
    const p = frame.pos(u, 0.25, 0.2);
    rifle(kit, p.x, p.y, p.z, yaw);
  }
  frame.collider(u0 - 0.02, u1 + 0.02, 0, 2.15, 0, 0.42, "rack");
}

// Seven-segment numeral built from thin boxes on a wall frame: (u, v) is the digit centre, h its height.
const SEGMENTS = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g" };
export function sevenSeg(frame, u, v, n, digit, h, mat = "painted", opts = {}) {
  const w = h * 0.55;
  const t = h * 0.13;
  const segs = SEGMENTS[String(digit)] || "";
  const geo = { a: [0, h / 2 - t / 2, w, t], d: [0, -h / 2 + t / 2, w, t], g: [0, 0, w, t], b: [w / 2 - t / 2, h / 4, t, h / 2], c: [w / 2 - t / 2, -h / 4, t, h / 2], e: [-w / 2 + t / 2, -h / 4, t, h / 2], f: [-w / 2 + t / 2, h / 4, t, h / 2] };
  for (const s of segs) {
    const [du, dv, su, sv] = geo[s];
    frame.box(mat, u + du, v + dv, n, su, sv, 0.008, { uv: "keep", ...opts });
  }
}
// A row of numerals centred on u (string of digits / dashes).
export function sevenSegText(frame, u, v, n, text, h, mat = "painted", opts = {}) {
  const pitch = h * 0.75;
  const start = u - ((text.length - 1) * pitch) / 2;
  for (let i = 0; i < text.length; i++) sevenSeg(frame, start + i * pitch, v, n, text[i], h, mat, opts);
}

// Horizontal scanline texture for containment fields (repeat-wrapped so its offset can scroll).
export function scanlineTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, "#5a1e18");
  grad.addColorStop(0.45, "#ff5a48");
  grad.addColorStop(0.5, "#ffd0c8");
  grad.addColorStop(0.55, "#ff5a48");
  grad.addColorStop(1, "#5a1e18");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  g.fillStyle = "rgba(0,0,0,0.45)";
  for (let y = 0; y < 64; y += 4) g.fillRect(0, y, 4, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Additive holographic material (cloned per room so pulses stay independent).
export function holoMaterial(color, opacity = 0.35, map = null) {
  return new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
}

export { pointLight, PALETTE, decalRect };
