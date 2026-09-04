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

// Dark ceiling plate with cross ribs and no light channels: rooms add their own fixtures.
export function ceilingPlate(kit, room, yTop, opts = {}) {
  const { ribStep = 3.2, wallDepth = WALL_T } = opts;
  const { x0, x1, z0, z1 } = room;
  const w = x1 - x0;
  const d = z1 - z0;
  kit.boxMM("paintedMetal", [x0 - wallDepth, yTop, z0 - wallDepth], [x1 + wallDepth, yTop + 0.12, z1 + wallDepth], { color: PALETTE.gunmetal, uv: "world", texel: 0.7 });
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
  ctx.lights[family].push(pointLight(color, intensity, distance, [x, yShade - 0.3, z]));
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

// Lounge sofa: light-grey Imperial shell, rounded cushions, armrests and a warm under-glow strip.
// Runs along `axis`, facing like bench().
export function sofa(kit, axis, cAlong, cAcross, y, len, opts = {}) {
  const { color = PALETTE.fabricTeal, cushion = PALETTE.fabricCream, facing = 1, depth = 0.9, shell = PALETTE.impGrey, glow = "emitWarmSoft" } = opts;
  const seatH = 0.45;
  alongBox(kit, "painted", axis, cAlong, cAcross, y + 0.2, len, depth - 0.1, 0.32, { color: shell, uv: "world", texel: 0.8 });
  alongBox(kit, "satinBlack", axis, cAlong, cAcross, y + 0.02, len - 0.1, depth - 0.3, 0.04);
  alongBox(kit, glow, axis, cAlong, cAcross + facing * (depth / 2 - 0.16), y + 0.035, len - 0.3, 0.04, 0.02, { uv: "keep" });
  const bAcross = cAcross - facing * (depth / 2 - 0.13);
  alongBox(kit, "painted", axis, cAlong, bAcross, y + seatH + 0.28, len, 0.16, 0.56, { color: shell, uv: "world", texel: 0.8 });
  alongBox(kit, "satinBlack", axis, cAlong, bAcross, y + seatH + 0.57, len + 0.02, 0.2, 0.03);
  const sections = Math.max(1, Math.round((len - 0.3) / 1.0));
  const secLen = (len - 0.3) / sections;
  for (let i = 0; i < sections; i++) {
    const a = cAlong - (len - 0.3) / 2 + secLen * (i + 0.5);
    const seat = new RoundedBoxGeometry(axis === "x" ? secLen - 0.04 : depth - 0.36, 0.16, axis === "x" ? depth - 0.36 : secLen - 0.04, 3, 0.05);
    const sp = axis === "x" ? [a, y + 0.42, cAcross + facing * 0.06] : [cAcross + facing * 0.06, y + 0.42, a];
    kit.add("fabric", seat, { pos: sp, color: cushion, uv: "world", texel: 2 });
    const back = new RoundedBoxGeometry(axis === "x" ? secLen - 0.04 : 0.14, 0.46, axis === "x" ? 0.14 : secLen - 0.04, 3, 0.05);
    const bp = axis === "x" ? [a, y + seatH + 0.27, bAcross + facing * 0.12] : [bAcross + facing * 0.12, y + seatH + 0.27, a];
    const tilt = -facing * 0.1;
    kit.add("fabric", back, { pos: bp, rot: axis === "x" ? [tilt, 0, 0] : [0, 0, -tilt], color, uv: "world", texel: 2 });
  }
  for (const s of [-1, 1]) {
    const a = cAlong + s * (len / 2 - 0.075);
    alongBox(kit, "painted", axis, a, cAcross, y + 0.33, 0.15, depth - 0.1, 0.66, { color: shell, uv: "world", texel: 0.8 });
    alongBox(kit, "fabric", axis, a, cAcross, y + 0.67, 0.15, depth - 0.14, 0.04, { color, uv: "world", texel: 2 });
  }
  const half = depth / 2 + 0.02;
  if (axis === "x") kit.collider([cAlong - len / 2, y, cAcross - half], [cAlong + len / 2, y + 1.0, cAcross + half], "sofa");
  else kit.collider([cAcross - half, y, cAlong - len / 2], [cAcross + half, y + 1.0, cAlong + len / 2], "sofa");
}

// Single armchair spun by yaw (0 faces +z), same shell language as the sofa.
export function armchair(kit, x, y, z, yaw, opts = {}) {
  const { color = PALETTE.fabricTeal, cushion = PALETTE.fabricCream, shell = PALETTE.impGrey } = opts;
  const rot = [0, yaw, 0];
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  const P = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c];
  kit.box("painted", ...P(0, 0.2, 0), 0.8, 0.32, 0.8, { rot, color: shell, uv: "world", texel: 0.8 });
  kit.box("satinBlack", ...P(0, 0.02, 0), 0.7, 0.04, 0.7, { rot });
  kit.add("fabric", new RoundedBoxGeometry(0.56, 0.16, 0.56, 3, 0.05), { pos: P(0, 0.42, 0.06), rot, color: cushion, uv: "world", texel: 2 });
  kit.box("painted", ...P(0, 0.72, -0.34), 0.8, 0.56, 0.14, { rot: [-0.1, yaw, 0], color: shell, uv: "world", texel: 0.8 });
  kit.add("fabric", new RoundedBoxGeometry(0.56, 0.46, 0.14, 3, 0.05), { pos: P(0, 0.72, -0.24), rot: [-0.1, yaw, 0], color, uv: "world", texel: 2 });
  for (const sd of [-1, 1]) {
    kit.box("painted", ...P(sd * 0.34, 0.33, 0), 0.12, 0.66, 0.8, { rot, color: shell, uv: "world", texel: 0.8 });
    kit.box("fabric", ...P(sd * 0.34, 0.68, 0), 0.12, 0.04, 0.76, { rot, color, uv: "world", texel: 2 });
  }
  kit.collider([x - 0.5, y, z - 0.5], [x + 0.5, y + 1.0, z + 0.5], "chair");
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
  const { seatH = 0.46, collide = true } = opts;
  kit.cyl("metal", x, y + 0.02, z, 0.2, 0.04, "y", { color: PALETTE.darkMetal, segments: 16 });
  kit.cyl("metal", x, y + seatH / 2, z, 0.045, seatH - 0.06, "y", { color: PALETTE.gunmetal, segments: 10 });
  kit.cyl("rubber", x, y + seatH - 0.035, z, 0.2, 0.07, "y", { color: PALETTE.rubber, segments: 16 });
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

// Blaster-rifle silhouette standing upright (muzzle up), front toward local +z, spun by yaw.
export function rifle(kit, x, y, z, yaw = 0) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const rot = [0, yaw, 0];
  const P = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c];
  kit.box("satinBlack", ...P(0, 0.14, -0.035), 0.05, 0.28, 0.13, { rot });
  kit.box("satinBlack", ...P(0, 0.5, 0), 0.07, 0.44, 0.17, { rot });
  kit.box("satinBlack", ...P(0, 0.4, 0.12), 0.045, 0.22, 0.07, { rot });
  kit.box("metal", ...P(0, 0.64, -0.1), 0.03, 0.16, 0.05, { rot, color: PALETTE.gunmetal });
  kit.cyl("metal", ...P(0, 0.93, 0.03), 0.016, 0.42, "y", { color: PALETTE.gunmetal, segments: 8 });
  kit.cyl("metal", ...P(0, 0.8, 0.03), 0.032, 0.18, "y", { color: PALETTE.darkMetal, segments: 8 });
  kit.cyl("metal", ...P(0, 0.72, -0.115), 0.024, 0.2, "y", { color: PALETTE.darkMetal, segments: 8 });
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
// Runs along x from xa to xb, centred on cz with width w.
export function gratedTrench(kit, xa, xb, cz, w, y0, opts = {}) {
  const { depth = 0.5, light = "emitTeal" } = opts;
  const len = xb - xa;
  const xm = (xa + xb) / 2;
  const h = w / 2;
  kit.boxMM("metal", [xa, y0 - depth - 0.08, cz - h - 0.05], [xb, y0 - depth, cz + h + 0.05], { color: PALETTE.darkMetal, texel: 1 });
  kit.boxMM("metal", [xa, y0 - depth, cz - h - 0.06], [xb, y0, cz - h], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [xa, y0 - depth, cz + h], [xb, y0, cz + h + 0.06], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [xa - 0.06, y0 - depth, cz - h - 0.06], [xa, y0, cz + h + 0.06], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [xb, y0 - depth, cz - h - 0.06], [xb + 0.06, y0, cz + h + 0.06], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM(light, [xa + 0.2, y0 - depth + 0.005, cz - h + 0.08], [xb - 0.2, y0 - depth + 0.03, cz - h + 0.14]);
  kit.boxMM(light, [xa + 0.2, y0 - depth + 0.005, cz + h - 0.14], [xb - 0.2, y0 - depth + 0.03, cz + h - 0.08]);
  kit.cyl("metal", xm, y0 - depth + 0.22, cz - h * 0.35, 0.07, len - 0.1, "x", { color: PALETTE.steel, segments: 10 });
  kit.cyl("metal", xm, y0 - depth + 0.16, cz + h * 0.2, 0.045, len - 0.1, "x", { color: PALETTE.orange, segments: 8 });
  kit.cyl("metal", xm, y0 - depth + 0.3, cz + h * 0.55, 0.035, len - 0.1, "x", { color: PALETTE.gunmetal, segments: 8 });
  for (let x = xa + 0.7; x < xb - 0.3; x += 1.6) {
    kit.box("metal", x, y0 - depth + 0.22, cz - h * 0.35, 0.1, 0.2, 0.2, { color: PALETTE.darkMetal });
    kit.box("metal", x + 0.5, y0 - depth + 0.14, cz + h * 0.3, 0.12, 0.14, 0.3, { color: PALETTE.darkMetal });
  }
  const g = new THREE.PlaneGeometry(len, w);
  g.rotateX(-Math.PI / 2);
  grateQuad(kit, g, [xm, y0 - 0.004, cz], len, w);
  for (let i = 0; i <= 4; i++) kit.box("metal", xm, y0 - 0.02, cz - h + (w * i) / 4, len, 0.05, 0.035, { color: PALETTE.gunmetal, texel: 2 });
  for (let x = xa; x <= xb + 0.01; x += 1.2) kit.box("metal", Math.min(x, xb), y0 - 0.02, cz, 0.05, 0.05, w + 0.1, { color: PALETTE.gunmetal, texel: 2 });
  kit.boxMM("rubber", [xa - 0.06, y0, cz - h - 0.12], [xb + 0.06, y0 + 0.015, cz - h - 0.04], { color: PALETTE.rubber, texel: 2 });
  kit.boxMM("rubber", [xa - 0.06, y0, cz + h + 0.04], [xb + 0.06, y0 + 0.015, cz + h + 0.12], { color: PALETTE.rubber, texel: 2 });
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

// Additive holographic material (cloned per room so pulses stay independent).
export function holoMaterial(color, opacity = 0.35) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
}

export { pointLight, PALETTE, decalRect };
