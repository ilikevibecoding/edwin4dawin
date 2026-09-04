// Armory props (local to d2-armory): barred cage walls, stylised rifle racks, pistol lockers, charge
// racks, open armour lockers, maintenance bench, blast-shield test rig. Yaw convention as in
// _shared/props.js (local +Z = front).
import * as THREE from "three";
import { placer, indicatorField } from "../_shared/props.js";
import { col } from "../_shared/palette.js";
import { rng } from "../../../kit.js";

const C = (PALETTE, k) => col(PALETTE, k);

// Vertical bars between two world points at floor level (yFrom..yTo), one collider for the run.
// Frame: bottom + top rails in dark paint. `gap` = [u0, u1] along the run left open (no bars/collider).
export function barWall(kit, PALETTE, a, b, yFrom, yTo, { r = 0.02, pitch = 0.15, rails = true, tag = "bars", collide = true, railColor } = {}) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const axis = Math.abs(dx) > Math.abs(dz) ? "x" : "z";
  const n = Math.max(1, Math.floor(len / pitch));
  const steel = C(PALETTE, "steel");
  const dark = railColor ?? C(PALETTE, "impDark");
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0.5 : i / n;
    const x = a[0] + dx * t;
    const z = a[2] + dz * t;
    kit.cyl("metal", x, (yFrom + yTo) / 2, z, r, yTo - yFrom, "y", { color: steel, segments: 6 });
  }
  if (rails) {
    const cx = (a[0] + b[0]) / 2;
    const cz = (a[2] + b[2]) / 2;
    const sx = axis === "x" ? len : 0.08;
    const sz = axis === "x" ? 0.08 : len;
    kit.box("paintedMetal", cx, yFrom + 0.035, cz, sx, 0.07, sz, { color: dark });
    kit.box("paintedMetal", cx, yTo - 0.035, cz, sx, 0.07, sz, { color: dark });
  }
  if (collide) {
    kit.collider([Math.min(a[0], b[0]) - 0.05, yFrom, Math.min(a[2], b[2]) - 0.05], [Math.max(a[0], b[0]) + 0.05, yTo, Math.max(a[2], b[2]) + 0.05], tag);
  }
}

// Box tilted about the placer's local X axis (lean back/forward), used for rifles in angled slots.
function leanBox(kit, Q, mat, lx, ly, lz, sx, sy, sz, tilt, opts = {}) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Q.yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: Q.world(lx, ly, lz), quat: q, ...opts });
}

// Stylised long-arm silhouette standing muzzle-up, leaning back by `tilt` (radians) onto the rack.
// Pure blocks: barrel, receiver, stock block, grip, sight rail. Deliberately generic.
function rifle(kit, PALETTE, Q, lx, baseY, lz, tilt) {
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const s = Math.sin(tilt);
  const c = Math.cos(tilt);
  // a point at height h along the leaning axis
  const at = (h) => [baseY + h * c, lz + h * s];
  let [y, z] = at(0.55);
  leanBox(kit, Q, "paintedMetal", lx, y, z, 0.045, 1.0, 0.05, tilt, { color: black }); // barrel
  [y, z] = at(0.2);
  leanBox(kit, Q, "paintedMetal", lx, y, z, 0.07, 0.34, 0.16, tilt, { color: black, texel: 1 }); // stock block
  [y, z] = at(0.42);
  leanBox(kit, Q, "paintedMetal", lx, y, z, 0.06, 0.18, 0.11, tilt, { color: black }); // receiver
  [y, z] = at(0.44);
  leanBox(kit, Q, "paintedMetal", lx, y, z + 0.09, 0.035, 0.12, 0.05, tilt, { color: dark }); // grip
  [y, z] = at(0.75);
  leanBox(kit, Q, "paintedMetal", lx, y, z - 0.045, 0.03, 0.22, 0.03, tilt, { color: dark }); // sight rail
  [y, z] = at(1.02);
  leanBox(kit, Q, "metal", lx, y, z, 0.05, 0.06, 0.06, tilt, { color: C(PALETTE, "steel") }); // muzzle
}

// Wall rack of 8 rifles in angled slots with a red lock bar (front +Z, back panel at -Z).
export function rifleRack(kit, PALETTE, pos, yaw, { count = 8, pitch = 0.4, seed = 1, locked = true } = {}) {
  const Q = placer(kit, pos, yaw);
  const w = count * pitch + 0.2;
  const dark = C(PALETTE, "impDark");
  const black = C(PALETTE, "impBlack");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, 1.1, -0.03, w, 2.0, 0.06, { color: C(PALETTE, "impGrey"), texel: 1 }); // back panel (light, so the black silhouettes read)
  Q.box("paintedMetal", 0, 1.1, 0.0, w - 0.16, 1.7, 0.01, { color: mid, texel: 1 });
  Q.box("paintedMetal", 0, 2.14, 0.08, w, 0.08, 0.28, { color: black }); // top cap
  Q.box("paintedMetal", 0, 0.14, 0.13, w, 0.1, 0.38, { color: black, texel: 1 }); // base shelf
  Q.box("paintedMetal", 0, 0.04, 0.13, w - 0.1, 0.08, 0.34, { color: dark });
  // slot rail at 1.5 m, notched where the barrels pass
  const edges = [-w / 2];
  for (let i = 0; i < count; i++) {
    const lx = -w / 2 + 0.1 + (i + 0.5) * pitch;
    edges.push(lx - 0.06, lx + 0.06);
  }
  edges.push(w / 2);
  for (let i = 0; i < edges.length; i += 2) Q.box("paintedMetal", (edges[i] + edges[i + 1]) / 2, 1.5, 0.12, edges[i + 1] - edges[i], 0.06, 0.2, { color: dark });
  const tilt = -0.1;
  for (let i = 0; i < count; i++) {
    const lx = -w / 2 + 0.1 + (i + 0.5) * pitch;
    rifle(kit, PALETTE, Q, lx, 0.19, 0.15, tilt);
    Q.box("darkGloss", lx, 0.2, 0.33, 0.12, 0.05, 0.01); // slot ID plate
  }
  // lock bar across the fronts + lock box
  Q.cyl(locked ? "emitRedImp" : "emitGreen", 0, 1.12, 0.3, 0.018, w - 0.3, "x", { segments: 8 });
  Q.box("paintedMetal", -w / 2 + 0.16, 1.12, 0.26, 0.12, 0.16, 0.14, { color: black });
  Q.box("paintedMetal", w / 2 - 0.16, 1.12, 0.26, 0.12, 0.16, 0.14, { color: black });
  Q.box(locked ? "emitRedImp" : "emitGreen", w / 2 - 0.16, 1.15, 0.335, 0.05, 0.03, 0.006);
  indicatorField(Q, w / 2 - 0.45, 1.85, 0.005, 0.5, 0.16, seed, { weights: [0.6, 0.25, 0.1, 0.05] });
  Q.box("metal", 0, 1.98, 0.02, w - 0.4, 0.04, 0.04, { color: steel });
  Q.collider([-w / 2, 0, -0.06], [w / 2, 2.2, 0.36], "rifle-rack");
  return w;
}

// Wall-hung pistol locker grid (front +Z), compartments with tiny status LEDs. Bottom at local y0.
export function pistolLockers(kit, PALETTE, pos, yaw, { cols = 4, rows = 3, unit = 0.5, unitH = 0.4, y0 = 0.8, d = 0.35, seed = 2 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const w = cols * unit;
  const h = rows * unitH;
  Q.box("paintedMetal", 0, y0 + h / 2, 0, w, h, d, { color: C(PALETTE, "impDark"), texel: 1 });
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -w / 2 + (i + 0.5) * unit;
      const y = y0 + (j + 0.5) * unitH;
      Q.box("impPanel", x, y, d / 2 + 0.01, unit - 0.04, unitH - 0.04, 0.02, { color: C(PALETTE, "impGrey"), uv: "keep" });
      Q.box("metal", x + unit / 2 - 0.08, y, d / 2 + 0.03, 0.02, 0.1, 0.02, { color: C(PALETTE, "steel") });
      Q.box(rand() < 0.75 ? "emitBlue" : "emitRedImp", x - unit / 2 + 0.08, y + unitH / 2 - 0.08, d / 2 + 0.022, 0.05, 0.016, 0.006);
    }
  }
  Q.box("paintedMetal", 0, y0 + h + 0.03, 0, w + 0.04, 0.06, d + 0.04, { color: C(PALETTE, "impBlack") });
  Q.collider([-w / 2, y0, -d / 2], [w / 2, y0 + h + 0.06, d / 2 + 0.03], "pistol-lockers");
}

// Charge-cell rack: shelving with rows of power cells (blue caps), front +Z.
export function chargeRack(kit, PALETTE, pos, yaw, { w = 3.0, h = 2.0, d = 0.5, shelves = 4, seed = 3 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const dark = C(PALETTE, "impDark");
  const black = C(PALETTE, "impBlack");
  const steel = C(PALETTE, "steel");
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (w / 2 - 0.03), h / 2, 0, 0.06, h, d, { color: dark, texel: 1 });
  Q.box("paintedMetal", 0, h / 2, -d / 2 + 0.02, w, h, 0.04, { color: black, texel: 1 });
  Q.box("paintedMetal", 0, h - 0.03, 0, w, 0.06, d, { color: dark });
  const cellsPerShelf = Math.floor((w - 0.2) / 0.24);
  for (let s = 0; s < shelves; s++) {
    const y = 0.12 + s * ((h - 0.4) / (shelves - 1));
    Q.box("metal", 0, y, 0, w - 0.1, 0.04, d - 0.04, { color: steel, texel: 1 });
    for (let i = 0; i < cellsPerShelf; i++) {
      if (rand() < 0.15) continue;
      const x = -w / 2 + 0.1 + (i + 0.5) * ((w - 0.2) / cellsPerShelf);
      Q.box("paintedMetal", x, y + 0.16, 0.02, 0.17, 0.28, 0.17, { color: rand() < 0.5 ? dark : C(PALETTE, "impMid"), texel: 1 });
      Q.box(rand() < 0.85 ? "emitBlue" : "emitAmber", x, y + 0.305, 0.02, 0.12, 0.01, 0.12);
      Q.box("darkGloss", x, y + 0.16, 0.107, 0.1, 0.16, 0.01);
    }
  }
  Q.box("emitRedImp", 0, h - 0.1, d / 2 + 0.005, w - 0.6, 0.02, 0.01);
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "charge-rack");
}

// Single open armour locker (front +Z): body, door hanging open to +X, white armour hints inside.
export function openArmourLocker(kit, PALETTE, pos, yaw, { unit = 0.7, h = 2.0, d = 0.55 } = {}) {
  const Q = placer(kit, pos, yaw);
  const mid = C(PALETTE, "impMid");
  const black = C(PALETTE, "impBlack");
  const white = C(PALETTE, "impWhite");
  const steel = C(PALETTE, "steel");
  // open box (back, sides, top, bottom)
  Q.box("paintedMetal", 0, h / 2, -d / 2 + 0.02, unit, h, 0.04, { color: black, texel: 1 });
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (unit / 2 - 0.02), h / 2, 0, 0.04, h, d, { color: mid, texel: 1 });
  Q.box("paintedMetal", 0, h - 0.02, 0, unit, 0.04, d, { color: mid });
  Q.box("paintedMetal", 0, 0.05, 0, unit, 0.1, d, { color: black });
  Q.box("paintedMetal", 0, 0.6, 0, unit - 0.08, 0.03, d - 0.06, { color: mid }); // shelf
  // door swung open ~100° on the +X side
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Q.yaw + 1.75, 0));
  const hinge = Q.world(unit / 2, h / 2, d / 2 + 0.01);
  const dx = Math.cos(Q.yaw + 1.75);
  const dz = -Math.sin(Q.yaw + 1.75);
  // the door's free edge lies at -X of its own frame, so step from the hinge against the frame's +X
  kit.add("impPanel", new THREE.BoxGeometry(unit - 0.04, h - 0.08, 0.02), { pos: [hinge[0] - (dx * (unit - 0.04)) / 2, hinge[1], hinge[2] - (dz * (unit - 0.04)) / 2], quat: q, color: C(PALETTE, "impGrey"), uv: "keep" });
  const nx = Math.sin(Q.yaw + 1.75) * 0.014;
  const nz = Math.cos(Q.yaw + 1.75) * 0.014;
  kit.add("emitWhite", new THREE.BoxGeometry(0.05, 0.02, 0.006), { pos: [hinge[0] - dx * 0.15 + nx, hinge[1] + h / 2 - 0.15, hinge[2] - dz * 0.15 + nz], quat: q });
  // armour hints: chest plate on a hanger, helmet on the shelf, plates below
  Q.cyl("metal", 0, h - 0.2, 0, 0.012, unit - 0.12, "x", { color: steel, segments: 8 });
  Q.box("paintedMetal", 0, h - 0.62, 0.02, 0.4, 0.5, 0.14, { color: white, texel: 1 });
  Q.box("paintedMetal", 0, h - 0.62, 0.095, 0.24, 0.3, 0.02, { color: black });
  Q.box("paintedMetal", 0, h - 0.35, 0.02, 0.22, 0.06, 0.12, { color: white });
  Q.cyl("paintedMetal", 0, 0.75, 0.0, 0.14, 0.26, "y", { color: white, segments: 16 });
  Q.box("paintedMetal", 0, 0.78, 0.13, 0.22, 0.06, 0.03, { color: black });
  for (let i = 0; i < 3; i++) Q.box("paintedMetal", -0.2 + i * 0.2, 0.25, 0.05, 0.14, 0.3, 0.1, { color: white, texel: 1 });
  Q.collider([-unit / 2, 0, -d / 2], [unit / 2 + 0.7, h, d / 2 + 0.7], "armour-locker");
}

// Maintenance bench (front +Z) with drawers, a vice, tools and a pegboard on the wall behind.
export function maintenanceBench(kit, PALETTE, pos, yaw, { len = 2.4, d = 0.8, h = 0.9, seed = 4, pegboard = true } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const steel = C(PALETTE, "steel");
  const dark = C(PALETTE, "impDark");
  const black = C(PALETTE, "impBlack");
  const mid = C(PALETTE, "impMid");
  Q.box("metal", 0, h - 0.03, 0, len, 0.06, d, { color: steel, texel: 1 });
  Q.box("paintedMetal", 0, h - 0.09, 0, len - 0.08, 0.06, d - 0.08, { color: black });
  Q.box("paintedMetal", -len / 2 + 0.45, (h - 0.12) / 2, 0, 0.8, h - 0.12, d - 0.1, { color: dark, texel: 1 }); // drawer unit
  for (let i = 0; i < 3; i++) {
    Q.box("paintedMetal", -len / 2 + 0.45, 0.16 + i * 0.25, d / 2 - 0.04, 0.72, 0.2, 0.02, { color: mid });
    Q.box("metal", -len / 2 + 0.45, 0.16 + i * 0.25, d / 2 - 0.02, 0.3, 0.03, 0.03, { color: steel });
  }
  for (const sx of [len / 2 - 0.08]) for (const sz of [-1, 1]) Q.box("paintedMetal", sx, (h - 0.06) / 2, sz * (d / 2 - 0.06), 0.06, h - 0.06, 0.06, { color: dark });
  Q.box("paintedMetal", 0.2, 0.3, 0, len - 1.2, 0.04, d - 0.2, { color: dark }); // lower shelf
  // vice, parts tray, tools, magnifier lamp
  Q.box("metal", len / 2 - 0.4, h + 0.08, 0.15, 0.22, 0.16, 0.14, { color: steel });
  Q.cyl("metal", len / 2 - 0.4, h + 0.08, 0.3, 0.02, 0.2, "z", { color: steel, segments: 8 });
  Q.box("darkGloss", -0.2, h + 0.03, -0.1, 0.5, 0.06, 0.3);
  for (let i = 0; i < 5; i++) Q.box("metal", -0.4 + i * 0.1, h + 0.07, -0.1, 0.03, 0.02, 0.2 + rand() * 0.1, { color: steel });
  Q.box("paintedMetal", 0.4, h + 0.06, -0.05, 0.5, 0.12, 0.2, { color: black }); // dismantled part
  Q.cyl("metal", 0.55, h + 0.14, 0.15, 0.03, 0.4, "x", { color: steel, segments: 8 });
  Q.cyl("metal", 0.9, h + 0.35, -0.3, 0.015, 0.7, "y", { color: steel, segments: 8 });
  Q.box("paintedMetal", 0.75, h + 0.7, -0.15, 0.4, 0.06, 0.2, { color: black });
  Q.box("emitWhite", 0.75, h + 0.665, -0.15, 0.32, 0.01, 0.14);
  // pegboard on the wall behind (local -Z); free-standing benches skip it
  if (pegboard) {
    Q.box("paintedMetal", 0, 1.75, -d / 2 - 0.03, len, 1.0, 0.04, { color: dark, texel: 1 });
    for (let i = 0; i < 10; i++) {
      const x = -len / 2 + 0.25 + i * ((len - 0.5) / 9);
      const tall = 0.2 + rand() * 0.3;
      if (i % 3 === 0) Q.cyl("metal", x, 1.75, -d / 2 + 0.015, 0.025, tall, "y", { color: steel, segments: 8 });
      else Q.box("metal", x, 1.75, -d / 2 + 0.01, 0.05, tall, 0.03, { color: i % 2 ? steel : black });
    }
    Q.box("emitAmber", 0, 2.2, -d / 2 - 0.005, len - 0.4, 0.02, 0.01);
  }
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h, d / 2], "bench");
}

// Issue counter along world X with a hatch in the cage above (cage bars are added by the room).
export function issueCounter(kit, PALETTE, { x0, x1, z0, z1, y, h = 0.9 }) {
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const len = x1 - x0;
  const d = z1 - z0;
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  kit.box("paintedMetal", cx, y + h / 2, cz, len, h, d, { color: dark, texel: 1 });
  kit.box("paintedMetal", cx, y + 0.06, cz, len - 0.04, 0.12, d + 0.02, { color: black });
  const n = Math.round(len / 1.25);
  for (let i = 0; i < n; i++) kit.box("paintedMetal", x0 + (i + 0.5) * (len / n), y + 0.52, z0 - 0.012, len / n - 0.12, 0.6, 0.024, { color: black, texel: 1 });
  kit.box("metal", cx, y + h + 0.02, cz, len + 0.06, 0.04, d + 0.1, { color: steel, texel: 1 });
  kit.box("emitRedImp", cx, y + h - 0.12, z0 - 0.02, len - 0.4, 0.02, 0.01);
  // hatch tray + frame (centre)
  kit.box("metal", cx, y + h + 0.06, cz, 1.0, 0.04, d - 0.1, { color: steel });
  kit.box("paintedMetal", cx, y + h + 0.12, cz, 1.24, 0.08, 0.14, { color: black });
  kit.box("paintedMetal", cx, y + h + 0.78, cz, 1.24, 0.08, 0.14, { color: black });
  for (const sx of [-1, 1]) kit.box("paintedMetal", cx + sx * 0.58, y + h + 0.45, cz, 0.08, 0.7, 0.14, { color: black });
  kit.box("emitRedImp", cx, y + h + 0.83, z0 + 0.02, 0.6, 0.02, 0.01);
  kit.collider([x0, y, z0], [x1, y + h + 0.2, z1], "counter");
}

// Blast-shield test rig: pedestal emitter facing local +Z with a blue field disc, plus a control post.
export function shieldRig(kit, PALETTE, pos, yaw) {
  const Q = placer(kit, pos, yaw);
  const dark = C(PALETTE, "impDark");
  const black = C(PALETTE, "impBlack");
  const steel = C(PALETTE, "steel");
  Q.cyl("paintedMetal", 0, 0.08, 0, 0.42, 0.16, "y", { color: black, segments: 20 });
  Q.cyl("paintedMetal", 0, 0.55, 0, 0.26, 0.8, "y", { color: dark, segments: 20, texel: 1 });
  Q.cyl("metal", 0, 1.0, 0, 0.2, 0.1, "y", { color: steel, segments: 20 });
  Q.box("paintedMetal", 0, 1.2, 0.05, 0.36, 0.3, 0.5, { color: black, texel: 1 });
  Q.cyl("metal", 0, 1.2, 0.32, 0.14, 0.06, "z", { color: steel, segments: 20 });
  Q.cyl("emitBlue", 0, 1.2, 0.36, 0.1, 0.02, "z", { segments: 20 });
  indicatorField(Q, 0, 1.2, -0.21, 0.3, 0.2, 17);
  // field disc hint (glass with a blue rim) 1.2 m ahead
  Q.box("glass", 0, 1.3, 1.2, 1.6, 2.0, 0.02, { uv: "keep" });
  for (const [x, y, sx, sy] of [[0, 2.3, 1.6, 0.03], [0, 0.3, 1.6, 0.03], [-0.8, 1.3, 0.03, 2.0], [0.8, 1.3, 0.03, 2.0]]) Q.box("emitBlue", x, y, 1.2, sx, sy, 0.03);
  Q.collider([-0.42, 0, -0.42], [0.42, 1.4, 0.42], "shield-rig");
}

// Target plate on a wall (front +Z): dark scarred plate with impact sensors.
export function targetPlate(kit, PALETTE, pos, yaw, { w = 1.8, h = 1.8, seed = 9 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  Q.box("paintedMetal", 0, 0, 0.05, w + 0.2, h + 0.2, 0.1, { color: C(PALETTE, "impBlack"), texel: 1 });
  Q.box("darkGloss", 0, 0, 0.105, w, h, 0.01);
  for (let i = 0; i < 9; i++) Q.box("paintedMetal", (rand() - 0.5) * (w - 0.4), (rand() - 0.5) * (h - 0.4), 0.112, 0.15 + rand() * 0.2, 0.15 + rand() * 0.2, 0.004, { color: C(PALETTE, "impDark") });
  for (const [x, y] of [[-w / 2 + 0.1, -h / 2 + 0.1], [w / 2 - 0.1, -h / 2 + 0.1], [-w / 2 + 0.1, h / 2 - 0.1], [w / 2 - 0.1, h / 2 - 0.1]]) Q.box("emitRedImp", x, y, 0.112, 0.06, 0.06, 0.006);
}

// Waiting bench with a wall rail behind (front +Z, back against a wall).
export function waitBench(kit, PALETTE, pos, yaw, { len = 2.4 } = {}) {
  const Q = placer(kit, pos, yaw);
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, 0.45, 0.1, len, 0.06, 0.45, { color: C(PALETTE, "impMid"), texel: 1 });
  for (const sx of [-len / 2 + 0.3, len / 2 - 0.3]) Q.box("paintedMetal", sx, 0.21, 0.1, 0.1, 0.42, 0.36, { color: dark });
  Q.cyl("metal", 0, 1.02, 0.06, 0.025, len, "x", { color: steel, segments: 10 });
  for (const sx of [-len / 2 + 0.2, 0, len / 2 - 0.2]) Q.box("paintedMetal", sx, 1.02, 0.02, 0.06, 0.06, 0.1, { color: dark });
  Q.collider([-len / 2, 0, -0.15], [len / 2, 0.5, 0.35], "bench");
}

// Rules / notice board: dark plate with red text-line hints (front +Z).
export function noticeBoard(kit, PALETTE, pos, yaw, { w = 1.2, h = 0.8, lines = 6, seed = 6 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  Q.box("paintedMetal", 0, 0, 0.02, w + 0.08, h + 0.08, 0.04, { color: C(PALETTE, "impBlack") });
  Q.box("darkGloss", 0, 0, 0.045, w, h, 0.01);
  Q.box("emitRedImp", 0, h / 2 - 0.1, 0.052, w - 0.2, 0.05, 0.004);
  for (let i = 0; i < lines; i++) {
    const lw = (w - 0.3) * (0.5 + rand() * 0.5);
    Q.box("emitWhite", -w / 2 + 0.15 + lw / 2, h / 2 - 0.28 - i * ((h - 0.4) / lines), 0.052, lw, 0.018, 0.004);
  }
}
