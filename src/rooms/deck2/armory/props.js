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
// Pure blocks: barrel, receiver, stock block, grip, sight rail. Deliberately generic. `kind`:
//  0 standard rifle · 1 heavy repeater (thick barrel, side power cell, top scope, muzzle brake)
//  2 short carbine (stubby barrel, folded-stock bar, pistol grip).
function rifle(kit, PALETTE, Q, lx, baseY, lz, tilt, kind = 0) {
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  const s = Math.sin(tilt);
  const c = Math.cos(tilt);
  // a point at height h along the leaning axis
  const at = (h) => [baseY + h * c, lz + h * s];
  let y, z;
  if (kind === 1) {
    // long repeater: 1.5 m barrel (stands 0.4 m above the standard rifles, past the slot rail), grey
    // receiver, chunky scope block with two rings, fore-grip under the barrel, skeleton stock
    const grey = C(PALETTE, "impGrey");
    const zo = 0.1; // stood 10 cm further out so the long lean-back keeps the muzzle off the back board
    [y, z] = at(0.9);
    leanBox(kit, Q, "paintedMetal", lx, y, z + zo, 0.055, 1.5, 0.06, tilt, { color: black, texel: 2.5 }); // barrel
    [y, z] = at(0.2);
    leanBox(kit, Q, "paintedMetal", lx, y, z + zo, 0.08, 0.4, 0.2, tilt, { color: black, texel: 2.5 }); // stock block
    leanBox(kit, Q, "paintedMetal", lx, y, z + zo + 0.06, 0.09, 0.3, 0.05, tilt, { color: dark }); // stock spine
    [y, z] = at(0.5);
    leanBox(kit, Q, "paintedMetal", lx, y, z + zo, 0.09, 0.3, 0.16, tilt, { color: grey, texel: 2.5 }); // receiver (grey)
    [y, z] = at(0.55);
    leanBox(kit, Q, "paintedMetal", lx + 0.08, y, z + zo, 0.05, 0.18, 0.1, tilt, { color: dark }); // side power cell
    leanBox(kit, Q, "emitBlue", lx + 0.108, y, z + zo, 0.006, 0.1, 0.03, tilt);
    [y, z] = at(0.44);
    leanBox(kit, Q, "paintedMetal", lx, y, z + zo + 0.13, 0.04, 0.14, 0.05, tilt, { color: dark }); // grip
    [y, z] = at(1.05);
    leanBox(kit, Q, "paintedMetal", lx, y, z + zo + 0.09, 0.045, 0.16, 0.05, tilt, { color: dark }); // fore-grip
    [y, z] = at(0.78);
    leanBox(kit, Q, "paintedMetal", lx, y, z + zo - 0.09, 0.07, 0.42, 0.08, tilt, { color: black }); // scope block
    for (const h of [0.62, 0.94]) {
      [y, z] = at(h);
      leanBox(kit, Q, "metal", lx, y, z + zo - 0.09, 0.09, 0.04, 0.08, tilt, { color: steel }); // scope rings
    }
    [y, z] = at(0.99);
    leanBox(kit, Q, "darkGloss", lx, y, z + zo - 0.09, 0.05, 0.01, 0.06, tilt); // objective lens
    [y, z] = at(1.62);
    leanBox(kit, Q, "metal", lx, y, z + zo, 0.09, 0.12, 0.09, tilt, { color: steel }); // muzzle brake
    return;
  }
  if (kind === 2) {
    // short carbine: stubby barrel, wide receiver over a drum magazine, folded stock bars, pistol grip
    [y, z] = at(0.5);
    leanBox(kit, Q, "paintedMetal", lx, y, z, 0.045, 0.5, 0.05, tilt, { color: black }); // short barrel
    [y, z] = at(0.36);
    leanBox(kit, Q, "paintedMetal", lx, y, z, 0.07, 0.26, 0.14, tilt, { color: black, texel: 2.5 }); // receiver
    [y, z] = at(0.36);
    leanBox(kit, Q, "paintedMetal", lx, y, z + 0.14, 0.12, 0.16, 0.16, tilt, { color: dark, texel: 2.5 }); // drum magazine
    leanBox(kit, Q, "emitAmber", lx + 0.062, y, z + 0.14, 0.004, 0.04, 0.04, tilt);
    [y, z] = at(0.14);
    leanBox(kit, Q, "paintedMetal", lx - 0.045, y, z, 0.025, 0.3, 0.03, tilt, { color: dark }); // folded stock bars
    leanBox(kit, Q, "paintedMetal", lx + 0.045, y, z, 0.025, 0.3, 0.03, tilt, { color: dark });
    [y, z] = at(0.02);
    leanBox(kit, Q, "paintedMetal", lx, y, z, 0.11, 0.05, 0.06, tilt, { color: dark }); // stock plate
    [y, z] = at(0.3);
    leanBox(kit, Q, "paintedMetal", lx, y, z + 0.1, 0.035, 0.14, 0.05, tilt, { color: dark }); // pistol grip
    [y, z] = at(0.55);
    leanBox(kit, Q, "paintedMetal", lx, y, z - 0.05, 0.03, 0.16, 0.03, tilt, { color: dark }); // sight rail
    [y, z] = at(0.77);
    leanBox(kit, Q, "metal", lx, y, z, 0.06, 0.06, 0.07, tilt, { color: steel }); // muzzle
    return;
  }
  [y, z] = at(0.55);
  leanBox(kit, Q, "paintedMetal", lx, y, z, 0.045, 1.0, 0.05, tilt, { color: black }); // barrel
  [y, z] = at(0.2);
  leanBox(kit, Q, "paintedMetal", lx, y, z, 0.07, 0.34, 0.16, tilt, { color: black, texel: 2.5 }); // stock block
  [y, z] = at(0.42);
  leanBox(kit, Q, "paintedMetal", lx, y, z, 0.06, 0.18, 0.11, tilt, { color: black }); // receiver
  [y, z] = at(0.44);
  leanBox(kit, Q, "paintedMetal", lx, y, z + 0.09, 0.035, 0.12, 0.05, tilt, { color: dark }); // grip
  [y, z] = at(0.75);
  leanBox(kit, Q, "paintedMetal", lx, y, z - 0.045, 0.03, 0.22, 0.03, tilt, { color: dark }); // sight rail
  [y, z] = at(1.02);
  leanBox(kit, Q, "metal", lx, y, z, 0.05, 0.06, 0.06, tilt, { color: steel }); // muzzle
}

// Wall rack of `count` angled slots with a red lock bar (front +Z, back panel at -Z). Per rack (from the
// seed) two slots are issued-out (empty, with the slot plate and the empty-slot amber LED) and one slot
// holds a different weapon silhouette, so racks do not read as copies.
export function rifleRack(kit, PALETTE, pos, yaw, { count = 8, pitch = 0.4, seed = 1, locked = true, empties = 2, variantKind: forcedKind } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const w = count * pitch + 0.2;
  const dark = C(PALETTE, "impDark");
  const black = C(PALETTE, "impBlack");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  // back board: dark slab carrying light clean panel plates (the worn-metal grain on a 3.4 m light-grey
  // slab read as dirty concrete); light, so the black silhouettes read against it
  Q.box("paintedMetal", 0, 1.1, -0.03, w, 2.0, 0.06, { color: dark, texel: 2.5 });
  {
    const n = Math.max(1, Math.round(w / 1.15));
    for (let i = 0; i < n; i++) {
      const u0 = -w / 2 + 0.05 + (i * (w - 0.1)) / n + 0.02;
      const u1 = -w / 2 + 0.05 + ((i + 1) * (w - 0.1)) / n - 0.02;
      Q.box("impPanel", (u0 + u1) / 2, 1.17, 0.006, u1 - u0, 1.74, 0.012, { color: C(PALETTE, "impGrey"), uv: "keep" });
    }
  }
  Q.box("paintedMetal", 0, 2.14, 0.08, w, 0.08, 0.28, { color: black, texel: 2.5 }); // top cap
  Q.box("paintedMetal", 0, 0.14, 0.13, w, 0.1, 0.38, { color: black, texel: 2.5 }); // base shelf
  Q.box("paintedMetal", 0, 0.04, 0.13, w - 0.1, 0.08, 0.34, { color: dark });
  // slot rail at 1.5 m, notched where the barrels pass
  const edges = [-w / 2];
  for (let i = 0; i < count; i++) {
    const lx = -w / 2 + 0.1 + (i + 0.5) * pitch;
    edges.push(lx - 0.06, lx + 0.06);
  }
  edges.push(w / 2);
  for (let i = 0; i < edges.length; i += 2) Q.box("paintedMetal", (edges[i] + edges[i + 1]) / 2, 1.5, 0.12, edges[i + 1] - edges[i], 0.06, 0.2, { color: dark });
  // slot states
  const empty = new Set();
  while (empty.size < Math.min(empties, count - 1)) empty.add(Math.floor(rand() * count));
  let variant = Math.floor(rand() * count);
  while (empty.has(variant)) variant = (variant + 1) % count;
  const variantKind = forcedKind ?? 1 + Math.floor(rand() * 2);
  const tilt = -0.1;
  for (let i = 0; i < count; i++) {
    const lx = -w / 2 + 0.1 + (i + 0.5) * pitch;
    Q.box("darkGloss", lx, 0.2, 0.33, 0.12, 0.05, 0.01); // slot ID plate
    if (empty.has(i)) {
      // empty slot: visible slot cradle on the shelf + amber "issued" LED
      Q.box("paintedMetal", lx, 0.22, 0.15, 0.14, 0.06, 0.2, { color: dark });
      Q.box("emitAmber", lx, 0.2, 0.34, 0.06, 0.02, 0.006);
      continue;
    }
    rifle(kit, PALETTE, Q, lx, 0.19, 0.15, tilt, i === variant ? variantKind : 0);
  }
  // lock bar across the fronts + lock box (blue = released)
  Q.cyl(locked ? "emitRedImp" : "emitBlue", 0, 1.12, 0.3, 0.018, w - 0.3, "x", { segments: 8 });
  Q.box("paintedMetal", -w / 2 + 0.16, 1.12, 0.26, 0.12, 0.16, 0.14, { color: black });
  Q.box("paintedMetal", w / 2 - 0.16, 1.12, 0.26, 0.12, 0.16, 0.14, { color: black });
  Q.box(locked ? "emitRedImp" : "emitBlue", w / 2 - 0.16, 1.15, 0.335, 0.05, 0.03, 0.006);
  indicatorField(Q, w / 2 - 0.45, 1.85, 0.024, 0.5, 0.16, seed, { weights: [0.6, 0.25, 0.1, 0.05] });
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
  // matte plated top (the bare `metal` top mirrored the bench fill into a white hotspot)
  Q.box("impPanel", 0, h - 0.03, 0, len, 0.06, d, { color: steel, uv: "scale", uvScale: [Math.max(1, Math.round(len / 1.2)), 1] });
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
  kit.box("paintedMetal", cx, y + h / 2, cz, len, h, d, { color: dark, texel: 2.5 });
  kit.box("paintedMetal", cx, y + 0.06, cz, len - 0.04, 0.12, d + 0.02, { color: black });
  const n = Math.round(len / 1.25);
  for (let i = 0; i < n; i++) kit.box("paintedMetal", x0 + (i + 0.5) * (len / n), y + 0.52, z0 - 0.012, len / n - 0.12, 0.6, 0.024, { color: black, texel: 2.5 });
  // matte plated top: painted-panel material in 1.25 m plates (smooth roughness, no worn-metal speckle;
  // the bare `metal` top mirrored the fills into a hotspot, paintedMetal read as grime)
  kit.box("impPanel", cx, y + h + 0.02, cz, len + 0.06, 0.04, d + 0.1, { color: steel, uv: "scale", uvScale: [Math.round(len / 1.25), 1] });
  kit.box("emitRedImp", cx, y + h - 0.12, z0 - 0.02, len - 0.4, 0.02, 0.01);
  // issue side: drawer units either end (clean panel plates, steel pulls), a double-door cupboard under
  // the hatch, and a kick rail, so the counter is not a bare slab from behind
  const mid = C(PALETTE, "impMid");
  const fz = z1 + 0.012;
  for (const ux of [x0 + 0.85, x1 - 0.85]) {
    for (let i = 0; i < 3; i++) {
      const dy = y + 0.2 + i * 0.235;
      kit.box("impPanel", ux, dy, fz, 1.3, 0.2, 0.024, { color: mid, uv: "keep" });
      kit.box("metal", ux, dy + 0.05, fz + 0.03, 0.36, 0.025, 0.03, { color: steel });
    }
  }
  for (const sx of [-1, 1]) {
    kit.box("impPanel", cx + sx * 0.42, y + 0.45, fz, 0.78, 0.7, 0.024, { color: mid, uv: "keep" });
    kit.box("metal", cx + sx * 0.08, y + 0.5, fz + 0.03, 0.025, 0.2, 0.03, { color: steel });
  }
  kit.box("emitBlue", cx - 0.32, y + 0.76, fz + 0.014, 0.05, 0.02, 0.006);
  // hatch tray + pass-through scanner (centre): the frame standing on the counter is a labelled item
  // scanner — sensor posts with blue emitter lines on their inner faces, a header carrying a readout
  // screen strip, three status lamps and a stencil label plate toward the door, red strip on top
  kit.box("paintedMetal", cx, y + h + 0.06, cz, 1.0, 0.04, d - 0.1, { color: black, texel: 2.5 });
  kit.box("paintedMetal", cx, y + h + 0.12, cz, 1.3, 0.08, 0.2, { color: black });
  const hy = y + h + 0.76; // header centre (its top clears the cage bars that start at 1.76 m)
  const hf = cz - 0.12; // header face toward the door
  kit.box("paintedMetal", cx, hy, cz, 1.3, 0.16, 0.24, { color: black, texel: 2.5 });
  for (const sx of [-1, 1]) {
    kit.box("paintedMetal", cx + sx * 0.6, y + h + 0.43, cz, 0.12, 0.66, 0.2, { color: dark, texel: 2.5 });
    kit.box("darkGloss", cx + sx * 0.535, y + h + 0.43, cz, 0.01, 0.46, 0.12);
    kit.box("emitBlue", cx + sx * 0.528, y + h + 0.43, cz, 0.006, 0.4, 0.02);
  }
  kit.box("emitBlue", cx, y + h + 0.145, cz, 0.9, 0.012, 0.04); // scan line on the sill
  kit.box("darkGloss", cx - 0.2, hy - 0.01, hf - 0.006, 0.7, 0.11, 0.012);
  kit.box("screenImp1", cx - 0.2, hy - 0.01, hf - 0.015, 0.62, 0.08, 0.006, { uv: "keep" });
  for (const [i, m] of ["emitGreen", "emitAmber", "emitRedImp"].entries()) kit.box(m, cx + 0.3 + i * 0.09, hy - 0.01, hf - 0.015, 0.05, 0.05, 0.006);
  kit.box("emitWhite", cx - 0.35, hy + 0.06, hf - 0.015, 0.4, 0.014, 0.004); // stencil label line
  kit.box("paintedMetal", cx + 0.5, hy + 0.06, hf - 0.015, 0.14, 0.024, 0.004, { color: C(PALETTE, "impRed") });
  // the clerk's face of the header (the issue view sees the scanner from inside the cage) carries the
  // same readout strip, lamps and label, so it reads as the scanner from both sides
  const hb = cz + 0.12;
  kit.box("darkGloss", cx + 0.2, hy - 0.01, hb + 0.006, 0.7, 0.11, 0.012);
  kit.box("screenImp2", cx + 0.2, hy - 0.01, hb + 0.015, 0.62, 0.08, 0.006, { uv: "keep" });
  for (const [i, m] of ["emitGreen", "emitAmber", "emitRedImp"].entries()) kit.box(m, cx - 0.3 - i * 0.09, hy - 0.01, hb + 0.015, 0.05, 0.05, 0.006);
  kit.box("emitWhite", cx + 0.35, hy + 0.06, hb + 0.015, 0.4, 0.014, 0.004);
  kit.box("paintedMetal", cx - 0.5, hy + 0.06, hb + 0.015, 0.14, 0.024, 0.004, { color: C(PALETTE, "impRed") });
  kit.box("emitRedImp", cx, hy + 0.086, cz, 0.6, 0.012, 0.03);
  // counter-top kit on the issue side of the hatch: datapad, tag rack, hand scanner in its cradle, a
  // stack of charge tins, and a signature slate + stylus by the hatch
  const t = y + h + 0.04;
  const Q = placer(kit, [cx, t, cz], 0);
  // datapad (west of the hatch, angled)
  Q.box("darkGloss", -1.15, 0.015, 0.05, 0.28, 0.03, 0.2, { rot: [0, 0.35, 0] });
  Q.box("screenImp3", -1.15, 0.032, 0.05, 0.22, 0.004, 0.14, { rot: [0, 0.35, 0], uv: "keep" });
  // tag rack: two posts, a steel rail, seven hanging ID tags in three colours with white ID lines
  for (const sx of [-1.98, -1.52]) Q.box("paintedMetal", sx, 0.16, -0.15, 0.03, 0.32, 0.03, { color: black });
  Q.cyl("metal", -1.75, 0.31, -0.15, 0.008, 0.5, "x", { color: steel, segments: 8 });
  const tagCols = [C(PALETTE, "impRed"), C(PALETTE, "impBlue"), AMBER_PAINT];
  for (let i = 0; i < 7; i++) {
    const tx = -1.94 + i * 0.064;
    Q.box("paintedMetal", tx, 0.21, -0.15, 0.05, 0.16, 0.008, { color: tagCols[i % 3] });
    Q.box("emitWhite", tx, 0.2, -0.145, 0.03, 0.012, 0.004);
    Q.box("metal", tx, 0.3, -0.15, 0.012, 0.03, 0.012, { color: steel }); // clip
  }
  // hand scanner in a cradle (east of the hatch): lit readout face + blue sensor bar
  Q.box("paintedMetal", 1.2, 0.03, 0.02, 0.24, 0.06, 0.18, { color: black });
  Q.box("paintedMetal", 1.2, 0.12, -0.02, 0.12, 0.18, 0.07, { color: dark, rot: [0.5, 0, 0] });
  Q.box("screenImp0", 1.2, 0.135, -0.055, 0.09, 0.1, 0.006, { rot: [0.5, 0, 0], uv: "keep" });
  Q.box("emitBlue", 1.2, 0.205, -0.085, 0.08, 0.02, 0.012, { rot: [0.5, 0, 0] });
  Q.box("emitRedImp", 1.28, 0.005, 0.11, 0.03, 0.06, 0.004);
  // charge cells in an open carry case: dark case, amber caps on three cells, one lying beside it
  Q.box("paintedMetal", 1.75, 0.04, -0.05, 0.42, 0.08, 0.26, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", 1.75, 0.045, -0.05, 0.38, 0.08, 0.22, { color: black });
  for (let i = 0; i < 3; i++) {
    Q.cyl("paintedMetal", 1.63 + i * 0.12, 0.1, -0.05, 0.045, 0.12, "y", { color: C(PALETTE, "impMid"), segments: 12 });
    Q.cyl("emitAmber", 1.63 + i * 0.12, 0.163, -0.05, 0.03, 0.006, "y", { segments: 12 });
  }
  Q.cyl("paintedMetal", 1.75, 0.045, 0.16, 0.045, 0.12, "x", { color: C(PALETTE, "impMid"), segments: 12 });
  Q.cyl("emitAmber", 1.813, 0.045, 0.16, 0.03, 0.006, "x", { segments: 12 });
  // signature slate + stylus on the hatch tray edge
  Q.box("darkGloss", -0.42, 0.05, 0.2, 0.2, 0.01, 0.14);
  Q.box("emitAmber", -0.42, 0.056, 0.2, 0.14, 0.002, 0.02);
  Q.cyl("metal", -0.3, 0.052, 0.12, 0.006, 0.16, "x", { color: steel, segments: 6 });
  kit.collider([x0, y, z0], [x1, y + h + 0.2, z1], "counter");
}

// Blast-shield test rig: pedestal emitter facing local +Z, plus a control post. The field 1.2 m ahead is
// two crossed additive `holo` planes (it reads as a volume from any angle instead of a 2D line), thrown
// between a ceiling emitter housing at `fieldTop` and a floor receptor plate.
export function shieldRig(kit, PALETTE, pos, yaw, { fieldTop = 2.9 } = {}) {
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
  // field: crossed holo planes between the floor receptor (0.12) and the emitter housing lip
  const fz = 1.2;
  const y0 = 0.12;
  const y1 = fieldTop - 0.3;
  Q.box("holo", 0, (y0 + y1) / 2, fz, 1.4, y1 - y0, 0.01, { uv: "keep" });
  Q.box("holo", 0, (y0 + y1) / 2, fz, 0.01, y1 - y0, 0.5, { uv: "keep" });
  Q.box("holo", 0, (y0 + y1) / 2, fz, 0.16, y1 - y0, 0.16, { uv: "keep" }); // bright core column
  // floor receptor: dark plate with a blue slot
  Q.box("paintedMetal", 0, 0.04, fz, 1.7, 0.08, 0.5, { color: black, texel: 2.5 });
  Q.box("emitBlue", 0, 0.082, fz, 1.5, 0.006, 0.05);
  // ceiling emitter housing: black box with steel lips, blue emitter slot underneath, two feed conduits
  Q.box("paintedMetal", 0, fieldTop - 0.15, fz, 1.7, 0.3, 0.5, { color: black, texel: 2.5 });
  for (const s of [-1, 1]) Q.box("paintedMetal", 0, fieldTop - 0.31, fz + s * 0.25, 1.76, 0.02, 0.06, { color: steel });
  Q.box("emitBlue", 0, fieldTop - 0.302, fz, 1.5, 0.006, 0.05);
  for (const s of [-1, 1]) Q.box("paintedMetal", s * 0.6, fieldTop - 0.15, fz - 0.28, 0.12, 0.2, 0.06, { color: dark });
  Q.box("emitRedImp", 0.72, fieldTop - 0.1, fz + 0.254, 0.05, 0.03, 0.006); // "field live" lamp
  Q.collider([-0.42, 0, -0.42], [0.42, 1.4, 0.42], "shield-rig");
}

// Target plate on a wall (front +Z): clean dark plate in a black frame with three square target rings, a
// red centre, an LED hit column at the right and four corner impact sensors.
export function targetPlate(kit, PALETTE, pos, yaw, { w = 1.8, h = 1.8, seed = 9 } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, 0, 0.05, w + 0.2, h + 0.2, 0.1, { color: black, texel: 2.5 });
  Q.box("impPanel", 0, 0, 0.105, w, h, 0.01, { color: C(PALETTE, "impDark"), uv: "keep" });
  for (const r of [0.7, 0.45, 0.2]) {
    for (const [x, y, sx, sy] of [[0, r, 2 * r, 0.03], [0, -r, 2 * r, 0.03], [-r, 0, 0.03, 2 * r], [r, 0, 0.03, 2 * r]]) Q.box("paintedMetal", x, y, 0.114, sx, sy, 0.006, { color: steel });
  }
  Q.box("emitRedImp", 0, 0, 0.114, 0.1, 0.1, 0.006);
  for (const [x, y] of [[-w / 2 + 0.1, -h / 2 + 0.1], [w / 2 - 0.1, -h / 2 + 0.1], [-w / 2 + 0.1, h / 2 - 0.1], [w / 2 - 0.1, h / 2 - 0.1]]) Q.box("emitRedImp", x, y, 0.114, 0.06, 0.06, 0.006);
  Q.box("darkGloss", w / 2 - 0.1, 0, 0.114, 0.1, 0.9, 0.006); // hit-count column
  const rand = rng(seed);
  for (let i = 0; i < 7; i++) Q.box(rand() < 0.6 ? "emitAmber" : "emitGreen", w / 2 - 0.1, -0.36 + i * 0.12, 0.12, 0.05, 0.03, 0.004);
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

// Swung-open cage gate leaf standing along world Z from its hinge post at `a` to `b`: heavy frame, a
// solid kick panel to 0.9 m, bars above, a lock box with LED and a top rail. One collider.
export function gateLeaf(kit, PALETTE, a, b, yTop = 2.3) {
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  const x = a[0];
  const y = a[1];
  const z0 = Math.min(a[2], b[2]);
  const z1 = Math.max(a[2], b[2]);
  const cz = (z0 + z1) / 2;
  const len = z1 - z0;
  for (const z of [z0 + 0.04, z1 - 0.04]) kit.box("paintedMetal", x, y + yTop / 2, z, 0.08, yTop, 0.08, { color: black, texel: 2.5 });
  kit.box("paintedMetal", x, y + yTop - 0.04, cz, 0.08, 0.08, len, { color: black });
  kit.box("paintedMetal", x, y + 0.45, cz, 0.06, 0.9, len - 0.08, { color: dark, texel: 2.5 }); // kick panel
  kit.box("paintedMetal", x, y + 0.45, cz, 0.07, 0.6, len - 0.3, { color: black, texel: 2.5 }); // recessed centre
  kit.box("paintedMetal", x, y + 0.94, cz, 0.08, 0.08, len, { color: black }); // mid rail
  const n = Math.max(2, Math.floor((len - 0.16) / 0.14));
  for (let i = 0; i <= n; i++) kit.cyl("metal", x, y + 0.9 + (yTop - 0.98) / 2, z0 + 0.08 + ((len - 0.16) * i) / n, 0.02, yTop - 0.98, "y", { color: steel, segments: 6 });
  // lock box on the free end
  kit.box("paintedMetal", x, y + 1.1, z1 - 0.16, 0.14, 0.24, 0.16, { color: black });
  kit.box("emitRedImp", x + 0.072, y + 1.16, z1 - 0.16, 0.006, 0.03, 0.06);
  kit.box("emitRedImp", x - 0.072, y + 1.16, z1 - 0.16, 0.006, 0.03, 0.06);
  kit.collider([x - 0.08, y, z0], [x + 0.08, y + yTop, z1], "gate-leaf");
}

// Housed recessed ceiling fixture: hollow black housing let into the ceiling, steel-grey lips, the
// emitter set 8 cm up inside so the housing walls shade it (no bare quad on the ceiling).
export function ceilingFixture(kit, PALETTE, x, ceilY, z, { w = 0.9, d = 0.9, mat = "emitWhite" } = {}) {
  const black = C(PALETTE, "impBlack");
  const mid = C(PALETTE, "impMid");
  const depth = 0.16;
  const yb = ceilY - depth; // bottom edge of the housing
  kit.box("paintedMetal", x, ceilY - 0.03, z, w, 0.02, d, { color: black });
  for (const sz of [-1, 1]) kit.box("paintedMetal", x, yb + depth / 2, z + sz * (d / 2 - 0.025), w, depth, 0.05, { color: black, texel: 2.5 });
  for (const sx of [-1, 1]) kit.box("paintedMetal", x + sx * (w / 2 - 0.025), yb + depth / 2, z, 0.05, depth, d - 0.1, { color: black, texel: 2.5 });
  for (const sz of [-1, 1]) kit.box("paintedMetal", x, yb - 0.01, z + sz * (d / 2), w + 0.12, 0.02, 0.12, { color: mid });
  for (const sx of [-1, 1]) kit.box("paintedMetal", x + sx * (w / 2), yb - 0.01, z, 0.12, 0.02, d - 0.12, { color: mid });
  kit.box(mat, x, yb + 0.08, z, w - 0.3, 0.01, d - 0.3);
}

// Hanging bench light: stem from the ceiling, dark hood with steel-grey lips, the emitter set 7 cm up
// inside the hood so the lips shade it (the shared dropLight's bare diffuser read as a white bar).
export function benchLight(kit, PALETTE, pos, { w = 1.8, d = 0.36, stem = 1.2, mat = "emitWhite" } = {}) {
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const [x, yTop, z] = pos;
  const depth = 0.22; // hood depth: from 5 m away the emitter tubes are hidden behind the side walls
  const yTopHood = yTop - stem; // underside of the hood's top plate
  const yb = yTopHood - depth; // bottom edge of the hood
  kit.box("paintedMetal", x, yTop - stem / 2, z, 0.06, stem, 0.06, { color: black });
  kit.box("paintedMetal", x, yTopHood + 0.03, z, w, 0.06, d, { color: dark, texel: 1 }); // hood top
  for (const sz of [-1, 1]) kit.box("paintedMetal", x, yb + depth / 2, z + sz * (d / 2 - 0.02), w, depth, 0.04, { color: dark, texel: 1 });
  for (const sx of [-1, 1]) kit.box("paintedMetal", x + sx * (w / 2 - 0.02), yb + depth / 2, z, 0.04, depth, d - 0.08, { color: dark, texel: 1 });
  for (const sz of [-1, 1]) kit.box("paintedMetal", x, yb - 0.01, z + sz * (d / 2), w + 0.06, 0.02, 0.08, { color: mid });
  for (const sx of [-1, 1]) kit.box("paintedMetal", x + sx * (w / 2), yb - 0.01, z, 0.08, 0.02, d - 0.08, { color: mid });
  // twin tubes 14 cm up inside the hood + a reflector plate behind them
  kit.box("paintedMetal", x, yTopHood - 0.005, z, w - 0.1, 0.01, d - 0.1, { color: mid });
  for (const sz of [-1, 1]) kit.box(mat, x, yb + 0.14, z + sz * 0.07, w - 0.3, 0.02, 0.05);
  kit.box("emitRedImp", x + w / 2 - 0.12, yTopHood + 0.03, z + d / 2 + 0.004, 0.06, 0.02, 0.006); // "on" lamp on the hood edge
}

// Housed light channel along world X under the ceiling (over the cage line): dark trough with steel-grey
// lips, emitter segments 0.14 m wide set 6 cm up inside the trough. The trough walls are impDark at
// texel 4: seen from the issue side the aft channel's 13 m outer wall runs across the top of the frame
// next to the cage header, and in black at texel 2.5 the two read as one speckled black band.
export function channelFixture(kit, PALETTE, x0, x1, z, ceilY, { w = 0.5, mat = "emitWhite", segment = 2.0 } = {}) {
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  const drop = 0.16;
  kit.box("paintedMetal", cx, ceilY - 0.03, z, len, 0.02, w, { color: black });
  for (const sz of [-1, 1]) kit.box("paintedMetal", cx, ceilY - drop / 2, z + sz * (w / 2 - 0.025), len, drop, 0.05, { color: dark, texel: 4 });
  for (const sx of [-1, 1]) kit.box("paintedMetal", cx + sx * (len / 2 - 0.025), ceilY - drop / 2, z, 0.05, drop, w - 0.1, { color: dark, texel: 4 });
  for (const sz of [-1, 1]) kit.box("paintedMetal", cx, ceilY - drop - 0.01, z + sz * (w / 2), len + 0.1, 0.02, 0.1, { color: mid });
  const nSeg = Math.max(1, Math.round(len / segment));
  for (let i = 0; i < nSeg; i++) {
    const s0 = x0 + (len * i) / nSeg + 0.12;
    const s1 = x0 + (len * (i + 1)) / nSeg - 0.12;
    kit.boxMM(mat, [s0, ceilY - drop + 0.06, z - 0.07], [s1, ceilY - drop + 0.07, z + 0.07]);
  }
}

// Range header sign over the alcove walkway (front +Z): dark plate, red header bar, three white text
// lines, hazard band along the bottom, amber "range active" lamp at the right.
export function rangeSign(kit, PALETTE, pos, yaw, { w = 2.0, h = 0.5 } = {}) {
  const Q = placer(kit, pos, yaw);
  Q.box("paintedMetal", 0, 0, 0.03, w, h, 0.06, { color: C(PALETTE, "impBlack"), texel: 2.5 });
  Q.box("darkGloss", 0, 0.02, 0.062, w - 0.1, h - 0.14, 0.006);
  Q.box("emitRedImp", 0, h / 2 - 0.09, 0.066, w - 0.3, 0.04, 0.004);
  for (let i = 0; i < 3; i++) Q.box("emitWhite", -0.15, h / 2 - 0.2 - i * 0.08, 0.066, (w - 0.9) * (1 - i * 0.2), 0.022, 0.004);
  const segs = 12;
  const bw = (w - 0.1) / segs;
  for (let k = 0; k < segs; k++) Q.box("paintedMetal", -(w - 0.1) / 2 + (k + 0.5) * bw, -h / 2 + 0.04, 0.065, bw, 0.06, 0.004, { color: k % 2 ? C(PALETTE, "impBlack") : AMBER_PAINT });
  Q.box("paintedMetal", w / 2 - 0.3, -0.02, 0.07, 0.24, 0.24, 0.02, { color: C(PALETTE, "impDark") });
  Q.box("emitAmber", w / 2 - 0.3, -0.02, 0.082, 0.16, 0.16, 0.004);
}

// Caged red warning beacon on a base plate (used on top of the alcove partition): the room's red fill
// sits inside it, so the light source is explained.
export function beacon(kit, PALETTE, pos) {
  const [x, y, z] = pos;
  const black = C(PALETTE, "impBlack");
  const steel = C(PALETTE, "steel");
  kit.box("paintedMetal", x, y + 0.04, z, 0.34, 0.08, 0.34, { color: black });
  kit.cyl("paintedMetal", x, y + 0.11, z, 0.11, 0.06, "y", { color: C(PALETTE, "impDark"), segments: 16 });
  kit.cyl("emitRedImp", x, y + 0.24, z, 0.085, 0.2, "y", { segments: 16 });
  kit.cyl("paintedMetal", x, y + 0.36, z, 0.1, 0.04, "y", { color: black, segments: 16 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.cyl("metal", x + sx * 0.12, y + 0.22, z + sz * 0.12, 0.008, 0.28, "y", { color: steel, segments: 6 });
  kit.cyl("metal", x, y + 0.3, z, 0.15, 0.012, "y", { color: steel, segments: 16, open: true });
}

// Muted painted amber (the palette's impAmber under the range lamp read as saturated orange).
export const AMBER_PAINT = 0xb07a30;

// Alternating painted amber/black floor band (no `hazard` key: the striped texture glowed orange).
export function hazardBand(kit, PALETTE, min, max, y, { seg = 0.3 } = {}) {
  const alongX = max[0] - min[0] >= max[1] - min[1];
  const len = alongX ? max[0] - min[0] : max[1] - min[1];
  const segs = Math.max(2, Math.round(len / seg));
  for (let k = 0; k < segs; k++) {
    const c = k % 2 ? C(PALETTE, "impBlack") : AMBER_PAINT;
    const u0 = (alongX ? min[0] : min[1]) + (k * len) / segs;
    const u1 = u0 + len / segs;
    if (alongX) kit.boxMM("paintedMetal", [u0, y, min[1]], [u1, y + 0.005, max[1]], { color: c });
    else kit.boxMM("paintedMetal", [min[0], y, u0], [max[0], y + 0.005, u1], { color: c });
  }
}

// Painted floor zone marking between two XZ corners: 0.1 m matte red outline with hatched corners and a
// row of white stencil bars along the north edge (paint sits 4 mm over the deck; no emitter).
export function floorMarking(kit, PALETTE, min, max, y, { seed = 7, line = 0.1 } = {}) {
  const red = C(PALETTE, "impRed");
  const white = C(PALETTE, "impWhite");
  const [x0, z0] = min;
  const [x1, z1] = max;
  const yt = y + 0.004;
  kit.boxMM("paintedMetal", [x0, y, z0], [x1, yt, z0 + line], { color: red });
  kit.boxMM("paintedMetal", [x0, y, z1 - line], [x1, yt, z1], { color: red });
  kit.boxMM("paintedMetal", [x0, y, z0], [x0 + line, yt, z1], { color: red });
  kit.boxMM("paintedMetal", [x1 - line, y, z0], [x1, yt, z1], { color: red });
  // hatched corners: three short diagonal bars inside each corner
  for (const [cx, cz, sx, sz] of [[x0, z0, 1, 1], [x1, z0, -1, 1], [x0, z1, 1, -1], [x1, z1, -1, -1]]) {
    for (let i = 1; i <= 3; i++) {
      const o = line + i * 0.16;
      kit.box("paintedMetal", cx + sx * o, y + 0.002, cz + sz * o, 0.42, 0.004, 0.06, { color: red, rot: [0, sx * sz * Math.PI / 4, 0] });
    }
  }
  const rand = rng(seed);
  let u = x0 + 0.5;
  while (u < x1 - 0.6) {
    const w = 0.18 + rand() * 0.22;
    kit.boxMM("paintedMetal", [u, y, z0 + line + 0.08], [u + w, yt, z0 + line + 0.2], { color: white });
    u += w + 0.1;
  }
}

// Cargo tag panel on a crate face (front +Z). Three styles so neighbouring tags do not read as copies:
//  0 gloss plate + indicator field + red seal strip · 1 small manifest screen + amber seal strip ·
//  2 stencil plate: white text bars + a coloured class square + green seal lamp.
export function crateTag(kit, PALETTE, pos, yaw, seed = 5, style = 0) {
  const Q = placer(kit, pos, yaw);
  if (style === 1) {
    Q.box("paintedMetal", 0, 0, 0.005, 0.5, 0.34, 0.01, { color: C(PALETTE, "impBlack") });
    // screen layout from the seed (two manifest tags in one view were the same screen twice)
    Q.box("screenImp" + (seed % 4), 0, 0.04, 0.012, 0.4, 0.18, 0.004, { uv: "keep" });
    Q.box("emitAmber", 0, -0.11, 0.012, 0.36, 0.03, 0.004);
    return;
  }
  if (style === 2) {
    Q.box("paintedMetal", 0, 0, 0.005, 0.5, 0.34, 0.01, { color: C(PALETTE, "impDark"), texel: 2.5 });
    const rand = rng(seed);
    for (let i = 0; i < 3; i++) Q.box("emitWhite", -0.08, 0.1 - i * 0.06, 0.012, 0.22 * (0.6 + rand() * 0.4), 0.018, 0.004);
    Q.box("paintedMetal", 0.15, 0.07, 0.012, 0.12, 0.12, 0.004, { color: rand() < 0.5 ? AMBER_PAINT : C(PALETTE, "impRed") });
    Q.box("emitGreen", 0.15, -0.09, 0.012, 0.06, 0.03, 0.004);
    Q.box("emitRedImp", -0.14, -0.09, 0.012, 0.16, 0.02, 0.004);
    return;
  }
  Q.box("darkGloss", 0, 0, 0.005, 0.5, 0.34, 0.01);
  indicatorField(Q, 0, 0.06, 0.012, 0.4, 0.14, seed, { weights: [0.5, 0.35, 0.1, 0.05] });
  Q.box("emitRedImp", 0, -0.11, 0.012, 0.36, 0.03, 0.004);
  Q.box("emitWhite", -0.1, -0.05, 0.012, 0.2, 0.012, 0.004);
}

// Wheeled weapon cart (local X = length): four-post frame, rimmed top tray lined with a clean plate holding
// two flat rifle silhouettes and a charge tin, lower shelf with an ammo box, a manifest tag on the end.
export function weaponCart(kit, PALETTE, pos, yaw, { len = 1.2, w = 0.6, h = 0.9, seed = 3 } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Q.box("paintedMetal", sx * (len / 2 - 0.04), h / 2, sz * (w / 2 - 0.04), 0.05, h, 0.05, { color: black, texel: 2.5 });
  Q.box("paintedMetal", 0, h - 0.03, 0, len, 0.06, w, { color: dark, texel: 2.5 }); // tray
  Q.box("impPanel", 0, h + 0.005, 0, len - 0.1, 0.01, w - 0.1, { color: mid, uv: "keep" }); // tray liner
  for (const sz of [-1, 1]) Q.box("paintedMetal", 0, h + 0.04, sz * (w / 2 - 0.02), len, 0.08, 0.04, { color: black }); // rims
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (len / 2 - 0.02), h + 0.04, 0, 0.04, 0.08, w, { color: black });
  Q.box("paintedMetal", 0, 0.3, 0, len - 0.1, 0.04, w - 0.1, { color: dark, texel: 2.5 }); // lower shelf
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Q.cyl("paintedMetal", sx * (len / 2 - 0.14), 0.08, sz * (w / 2 + 0.01), 0.08, 0.04, "z", { color: black, segments: 12 }); // wheels
  Q.box("metal", 0, h + 0.12, -w / 2 - 0.02, len - 0.3, 0.025, 0.025, { color: steel }); // push handle
  for (const sx of [-1, 1]) Q.box("metal", sx * (len / 2 - 0.15), h + 0.1, -w / 2 - 0.02, 0.025, 0.06, 0.025, { color: steel });
  // two rifles lying in the tray, muzzles opposite ways
  for (const [m, sz] of [[1, -0.13], [-1, 0.13]]) {
    Q.box("paintedMetal", m * -0.12, h + 0.035, sz, 0.85, 0.045, 0.05, { color: black }); // barrel
    Q.box("paintedMetal", m * 0.36, h + 0.05, sz, 0.3, 0.08, 0.13, { color: black, texel: 2.5 }); // stock
    Q.box("paintedMetal", m * 0.12, h + 0.055, sz, 0.2, 0.09, 0.1, { color: dark }); // receiver
    Q.box("paintedMetal", m * 0.16, h + 0.03, sz + m * 0.09, 0.05, 0.04, 0.1, { color: dark }); // grip (sideways)
    Q.box("emitBlue", m * 0.12, h + 0.101, sz, 0.05, 0.004, 0.02); // charge LED
  }
  Q.cyl("paintedMetal", 0.45, h + 0.06, 0, 0.045, 0.11, "y", { color: mid, segments: 12 }); // charge tin
  Q.cyl("emitAmber", 0.45, h + 0.118, 0, 0.03, 0.006, "y", { segments: 12 });
  // ammo box on the lower shelf
  Q.box("paintedMetal", -0.2, 0.44, 0, 0.5, 0.24, 0.36, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", -0.2, 0.44, 0.185, 0.36, 0.14, 0.01, { color: black });
  Q.box("emitRedImp", -0.2, 0.5, 0.192, 0.2, 0.02, 0.004);
  crateTag(kit, PALETTE, Q.world(len / 2 + 0.005, 0.62, 0), yaw + Math.PI / 2, seed, 1);
  Q.collider([-len / 2 - 0.05, 0, -w / 2 - 0.1], [len / 2 + 0.05, h + 0.12, w / 2 + 0.05], "weapon-cart");
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
