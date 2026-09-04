// Shared Imperial prop builders for the Deck 4 side bays. All kit geometry (merged per material) except
// the instanced crate helper. Colours come from ctx.PALETTE (P); marking yellow from ./materials.js.
// Palette rule: dark-grey / near-black structure with thin amber or blue indicator bands, black/yellow
// hazard only where the room asks for it, light-grey plates for seats and worktops. Heights are real:
// consoles 0.9 m, rails 1.02 m, lockers 2.0 m, crates 1.2 m.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit, setVertexColor } from "../../kit.js";
import { YELLOW } from "./materials.js";

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Placer: a local frame (origin + yaw about Y) so a prop can be authored once around its own origin.
// Local axes: +x right, +y up, -z forward (the operator side of consoles). yaw in degrees, world yaw
// follows the player convention (yaw 0 → -Z, +90 → -X).
// ---------------------------------------------------------------------------
export class Placer {
  constructor(kit, origin, yawDeg = 0) {
    this.kit = kit;
    this.o = new THREE.Vector3(origin[0], origin[1], origin[2]);
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
  }
  point(lx, ly, lz) {
    _v.set(lx, ly, lz).applyQuaternion(this.q).add(this.o);
    return [_v.x, _v.y, _v.z];
  }
  box(mat, cx, cy, cz, sx, sy, sz, opts = {}) {
    const p = this.point(cx, cy, cz);
    let q = this.q;
    if (opts.rot) {
      _e.set(opts.rot[0], opts.rot[1], opts.rot[2]);
      q = this.q.clone().multiply(_q.setFromEuler(_e));
    }
    const { rot, ...rest } = opts;
    return this.kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: p, quat: q, ...rest });
  }
  // cylinder along local axis
  cyl(mat, cx, cy, cz, r, len, axis = "y", opts = {}) {
    const p = this.point(cx, cy, cz);
    const g = new THREE.CylinderGeometry(opts.r2 !== undefined ? opts.r2 : r, r, len, opts.segments || 12, 1, !!opts.open);
    const rot = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    _e.set(rot[0], rot[1], rot[2]);
    const q = this.q.clone().multiply(_q.setFromEuler(_e));
    const { r2, open, segments, ...rest } = opts;
    return this.kit.add(mat, g, { pos: p, quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  add(mat, geo, cx, cy, cz, opts = {}) {
    const p = this.point(cx, cy, cz);
    let q = this.q;
    if (opts.quat) q = this.q.clone().multiply(opts.quat);
    else if (opts.rot) {
      _e.set(opts.rot[0], opts.rot[1], opts.rot[2]);
      q = this.q.clone().multiply(_q.setFromEuler(_e));
    }
    const { rot, quat, ...rest } = opts;
    return this.kit.add(mat, geo, { pos: p, quat: q, ...rest });
  }
  // AABB collider of a local box (rotated corners → world AABB)
  collider(min, max, tag = "prop") {
    const mn = [Infinity, Infinity, Infinity];
    const mx = [-Infinity, -Infinity, -Infinity];
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
      const p = this.point(x, y, z);
      for (let i = 0; i < 3; i++) {
        mn[i] = Math.min(mn[i], p[i]);
        mx[i] = Math.max(mx[i], p[i]);
      }
    }
    this.kit.collider(mn, mx, tag);
  }
}

// ---------------------------------------------------------------------------
// Console: matte-black Imperial station. Desk at 0.9 m, a low raked screen bank behind it (top 1.22 m),
// a dark keypad plate with a few blue keys, three lenses on the rim. Local origin: floor centre;
// operator stands at -z.
// ---------------------------------------------------------------------------
export function consoleUnit(pl, P, opts = {}) {
  const { w = 1.6, d = 0.8, screens = ["screenImp0"], tag = "console", collide = true } = opts;
  pl.box("paintedMetal", 0, 0.04, 0, w - 0.2, 0.08, d - 0.3, { color: P.impDark, texel: 2 }); // plinth
  pl.box("paintedMetal", 0, 0.47, 0, w - 0.08, 0.78, d - 0.12, { color: P.impBlack, texel: 2 }); // body
  pl.box("paintedMetal", 0, 0.88, 0, w, 0.04, d, { color: P.impDark, texel: 2 }); // desk top
  // keypad plate on the operator half + sparse keys
  pl.box("paintedMetal", 0, 0.905, -d * 0.2, w - 0.24, 0.01, d * 0.42, { color: P.impBlack, texel: 2 });
  const nk = Math.max(3, Math.floor((w - 0.4) / 0.28));
  for (let i = 0; i < nk; i++) {
    const x = -(w - 0.4) / 2 + 0.14 + i * ((w - 0.4) / nk) * (nk / Math.max(1, nk - 0)) * 0.98;
    pl.box(i % 3 === 1 ? "emitBlue" : "paintedMetal", x, 0.915, -d * 0.28, 0.14, 0.012, 0.07, i % 3 === 1 ? {} : { color: P.impMid });
    pl.box("paintedMetal", x, 0.915, -d * 0.12, 0.14, 0.012, 0.07, { color: P.impMid });
  }
  // raked screen bank: dark back plate leaning back, screens on its front
  const tilt = -0.55;
  const bh = 0.36;
  const bz = d * 0.24;
  pl.box("paintedMetal", 0, 0.9 + bh / 2 + 0.03, bz, w - 0.04, bh, 0.12, { color: P.impBlack, texel: 2, rot: [tilt, 0, 0] });
  const n = screens.length;
  const sw = (w - 0.24) / n;
  for (let i = 0; i < n; i++) {
    const cx = -(w - 0.24) / 2 + sw * (i + 0.5);
    pl.box(screens[i], cx, 0.9 + bh / 2 + 0.03, bz - 0.066, sw - 0.08, bh - 0.1, 0.01, { uv: "keep", rot: [tilt, 0, 0] });
  }
  // three lenses on the rear rim
  const lens = ["emitBlue", "emitAmber", "emitRedImp"];
  for (let i = 0; i < 3; i++) pl.box(lens[i], -0.24 + i * 0.24, 0.915, d * 0.44, 0.08, 0.012, 0.05);
  if (collide) pl.collider([-w / 2, 0, -d / 2 - 0.05], [w / 2, 1.3, d / 2 + 0.05], tag);
}

// Wall-mounted status board (screenImp) in a heavy black bezel with a hood and two lenses. Local:
// faces -z; y = screen centre (default 1.75 so the top stays under the 2.7 m cable tray).
export function wallScreen(pl, P, opts = {}) {
  const { w = 1.4, h = 0.9, mat = "screenImp1", y = 1.75 } = opts;
  pl.box("paintedMetal", 0, y, 0.07, w + 0.36, h + 0.36, 0.14, { color: P.impBlack, texel: 2 }); // bezel
  pl.box("paintedMetal", 0, y, -0.005, w + 0.1, h + 0.1, 0.01, { color: P.impDark, texel: 2 }); // inner surround
  pl.box(mat, 0, y, -0.016, w, h, 0.01, { uv: "keep" });
  pl.box("paintedMetal", 0, y + h / 2 + 0.18, -0.06, w + 0.36, 0.05, 0.4, { color: P.impBlack, texel: 2 }); // hood
  pl.box("emitBlue", -w / 2 + 0.1, y - h / 2 - 0.1, -0.012, 0.22, 0.03, 0.005);
  pl.box("emitRedImp", -w / 2 + 0.42, y - h / 2 - 0.1, -0.012, 0.08, 0.03, 0.005);
}

// ---------------------------------------------------------------------------
// Crates. A 1.2 m Imperial cargo crate: light body, dark corner caps and lid lip, two recessed seam
// grooves, a lit label on the front. kit version for one-offs; geometry version for InstancedMesh
// (body) + crateLabelGeometry (emitAmber chip, same transforms).
// ---------------------------------------------------------------------------
function crateBody(pl, P, s, h, color, band) {
  pl.box("paintedMetal", 0, h / 2, 0, s, h, s, { color, texel: 1.5 });
  pl.box("paintedMetal", 0, h - 0.03, 0, s + 0.05, 0.06, s + 0.05, { color: band, texel: 1.5 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pl.box("paintedMetal", (sx * (s - 0.06)) / 2, h / 2, (sz * (s - 0.06)) / 2, 0.12, h + 0.02, 0.12, { color: band, texel: 1.5 });
  for (const y of [h * 0.36, h * 0.68]) pl.box("paintedMetal", 0, y, 0, s + 0.012, 0.035, s + 0.012, { color: P.impBlack, texel: 1.5 });
  pl.box("paintedMetal", 0, h * 0.52, -s / 2 - 0.004, 0.42, 0.16, 0.01, { color: P.impBlack, texel: 2 }); // label plate
}
export function crateKit(pl, P, opts = {}) {
  const { s = 1.2, color = P.impGrey, band = P.impDark, collide = false } = opts;
  const h = opts.h || s;
  crateBody(pl, P, s, h, color, band);
  pl.box("emitAmber", -0.09, h * 0.52, -s / 2 - 0.012, 0.2, 0.05, 0.01);
  if (collide) pl.collider([-s / 2, 0, -s / 2], [s / 2, h, s / 2], "crate");
}
export function crateGeometry(materials, P, opts = {}) {
  const { s = 1.2, color = P.impGrey, band = P.impDark, h = s } = opts;
  const k = new Kit(materials);
  crateBody(new Placer(k, [0, 0, 0], 0), P, s, h, color, band);
  const geo = mergeGeometries(k.groups.get("paintedMetal"), false);
  geo.computeBoundingSphere();
  return geo;
}
export function crateLabelGeometry(opts = {}) {
  const { s = 1.2, h = s } = opts;
  const g = new THREE.BoxGeometry(0.2, 0.05, 0.01);
  g.translate(-0.09, h * 0.52, -s / 2 - 0.012);
  setVertexColor(g, 0xffffff);
  g.computeBoundingSphere();
  return g;
}

// Cylindrical canister geometry (drums / fuel cells) for instancing: grey body, dark bands, dark cap
export function drumGeometry(materials, P, opts = {}) {
  const { r = 0.32, h = 1.0, color = P.impGrey, band = P.impDark } = opts;
  const k = new Kit(materials);
  const pl = new Placer(k, [0, 0, 0], 0);
  pl.cyl("paintedMetal", 0, h / 2, 0, r, h, "y", { color, segments: 14 });
  for (const y of [h * 0.2, h * 0.8]) pl.cyl("paintedMetal", 0, y, 0, r + 0.02, 0.06, "y", { color: band, segments: 14 });
  pl.cyl("paintedMetal", 0, h + 0.02, 0, r * 0.35, 0.05, "y", { color: P.impBlack, segments: 10 });
  const geo = mergeGeometries(k.groups.get("paintedMetal"), false);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * InstancedMesh of a merged geometry. items: [{pos:[x,y,z], yaw?:deg, color?:THREE.Color|number, scale?}]
 */
export function instanced(ctx, geo, materialKey, items, name = "instanced") {
  const mat = ctx.materials[materialKey];
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  items.forEach((it, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(it.yaw || 0));
    const sc = it.scale || 1;
    s.set(sc, sc, sc);
    p.set(it.pos[0], it.pos[1], it.pos[2]);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(it.color ?? 0xffffff));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  mesh.frustumCulled = true;
  mesh.computeBoundingSphere();
  ctx.group.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Handrail from (x0,z0) to (x1,z1) at floor y: posts, top rail 1.02, mid rail 0.55, kick 0.1.
// ---------------------------------------------------------------------------
export function handrail(kit, P, from, to, y, opts = {}) {
  const { h = 1.02, postEvery = 1.6, collide = true, kick = true } = opts;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.2) return;
  const axis = Math.abs(dx) > Math.abs(dz) ? "x" : "z";
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[1] + to[1]) / 2;
  kit.cyl("metal", cx, y + h, cz, 0.03, L, axis, { color: P.impGrey, segments: 10 });
  kit.cyl("metal", cx, y + 0.55, cz, 0.022, L, axis, { color: P.impGrey, segments: 8 });
  if (kick) kit.box("paintedMetal", cx, y + 0.08, cz, axis === "x" ? L : 0.05, 0.12, axis === "x" ? 0.05 : L, { color: P.impDark, texel: 2 });
  const n = Math.max(2, Math.round(L / postEvery) + 1);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const px = from[0] + dx * t;
    const pz = from[1] + dz * t;
    kit.box("paintedMetal", px, y + h / 2, pz, 0.07, h, 0.07, { color: P.impBlack, texel: 2 });
    kit.box("paintedMetal", px, y + 0.02, pz, 0.16, 0.04, 0.16, { color: P.impBlack, texel: 2 });
  }
  if (collide) {
    const pad = 0.08;
    kit.collider([Math.min(from[0], to[0]) - pad, y, Math.min(from[1], to[1]) - pad], [Math.max(from[0], to[0]) + pad, y + h + 0.1, Math.max(from[1], to[1]) + pad], "rail");
  }
}

// ---------------------------------------------------------------------------
// Tool chest (rolling cabinet): 1.1 × 1.0 × 0.6, drawers with thin light pulls, top tray with tools.
// ---------------------------------------------------------------------------
export function toolChest(pl, P, opts = {}) {
  const { w = 1.1, h = 1.0, d = 0.6, color = P.impDark } = opts;
  pl.box("paintedMetal", 0, 0.1 + (h - 0.1) / 2, 0, w, h - 0.1, d, { color, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pl.cyl("paintedMetal", (sx * (w - 0.2)) / 2, 0.07, (sz * (d - 0.2)) / 2, 0.06, 0.06, "x", { color: P.impBlack, segments: 8 });
  const nD = 4;
  for (let i = 0; i < nD; i++) {
    const y = 0.2 + i * ((h - 0.3) / nD);
    pl.box("paintedMetal", 0, y + 0.08, -d / 2 - 0.01, w - 0.1, (h - 0.3) / nD - 0.04, 0.02, { color: P.impMid, texel: 2 });
    pl.box("metal", 0, y + 0.08, -d / 2 - 0.03, w * 0.5, 0.025, 0.03, { color: P.impGrey });
  }
  // top tray with a few tools
  pl.box("paintedMetal", 0, h + 0.02, 0, w - 0.06, 0.04, d - 0.06, { color: P.impBlack, texel: 2 });
  pl.box("metal", -w * 0.25, h + 0.06, 0.05, 0.28, 0.04, 0.05, { color: P.impGrey });
  pl.cyl("metal", w * 0.1, h + 0.06, -0.1, 0.02, 0.32, "x", { color: P.impGrey, segments: 8 });
  pl.box("paintedMetal", w * 0.3, h + 0.08, 0.12, 0.12, 0.08, 0.2, { color: P.impDark, texel: 2 });
  pl.box("emitAmber", w * 0.3, h + 0.125, 0.12, 0.05, 0.01, 0.05);
  pl.collider([-w / 2, 0, -d / 2], [w / 2, h + 0.1, d / 2], "toolchest");
}

// ---------------------------------------------------------------------------
// Parts rack: dark open shelving with solid side panels, grey/dark bins, a thin amber edge light on
// each shelf lip. Local: front -z.
// ---------------------------------------------------------------------------
export function partsRack(pl, P, rand, opts = {}) {
  const { w = 3.0, d = 0.8, h = 2.4, tiers = 4, bins = true, tag = "rack" } = opts;
  for (const sx of [-1, 1]) pl.box("paintedMetal", (sx * (w - 0.05)) / 2, h / 2, 0.02, 0.05, h, d - 0.06, { color: P.impDark, texel: 2 }); // side panels
  for (let t = 0; t <= tiers; t++) {
    const y = 0.15 + (t * (h - 0.3)) / tiers;
    pl.box("paintedMetal", 0, y, 0, w, 0.05, d, { color: P.impMid, texel: 2 });
    pl.box("paintedMetal", 0, y - 0.05, -d / 2 + 0.02, w, 0.08, 0.04, { color: P.impBlack, texel: 2 });
    if (t > 0) pl.box("emitAmber", 0, y - 0.05, -d / 2 - 0.002, w - 0.3, 0.014, 0.004);
    if (bins && t < tiers) {
      const n = Math.floor(w / 0.45);
      for (let i = 0; i < n; i++) {
        if (rand() < 0.2) continue;
        const bw = 0.36 + rand() * 0.06;
        const bh = 0.22 + rand() * 0.16;
        const cols = [P.impDark, P.impMid, P.impGrey, P.impHullDark, P.impMid, P.impDark];
        const c = cols[Math.floor(rand() * cols.length)];
        pl.box("paintedMetal", -w / 2 + 0.25 + (i * (w - 0.3)) / n, y + 0.03 + bh / 2, -0.05 + (rand() - 0.5) * 0.15, bw, bh, d - 0.3, { color: c, texel: 2 });
      }
    }
  }
  pl.box("paintedMetal", 0, h / 2, d / 2 - 0.02, w - 0.1, h - 0.2, 0.02, { color: P.impBlack, texel: 1 }); // back
  pl.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], tag);
}

// ---------------------------------------------------------------------------
// Heavy pallet racking: `bays` bays × `tiers` tiers along local +x, front -z. Dark uprights and beams,
// a thin amber edge light on each front beam, grey tier decks. Returns slot centres (local) for
// crates: [{x, y, z}] one per (bay, tier); y is the deck's top surface.
// ---------------------------------------------------------------------------
export function palletRack(pl, P, opts = {}) {
  const { bays = 6, tiers = 4, bayW = 3.4, depth = 1.5, tierH = 3.4, tag = "racking" } = opts;
  const W = bays * bayW;
  const H = tiers * tierH + 0.4;
  const slots = [];
  for (let b = 0; b <= bays; b++) {
    const x = -W / 2 + b * bayW;
    for (const sz of [-1, 1]) pl.box("paintedMetal", x, H / 2, (sz * (depth - 0.12)) / 2, 0.14, H, 0.14, { color: P.impDark, texel: 2 });
    for (let t = 0; t < tiers; t++) {
      const y0 = t * tierH + 0.4;
      pl.box("paintedMetal", x, y0 + tierH * 0.5, 0, 0.06, 0.06, depth - 0.12, { color: P.impDark, texel: 2 });
      pl.box("paintedMetal", x, y0 + tierH * 0.5, 0, 0.05, tierH * 0.9, 0.05, { color: P.impDark, texel: 2, rot: [Math.atan2(depth - 0.2, tierH * 0.9), 0, 0] });
    }
    pl.box("paintedMetal", x, 0.06, 0, 0.3, 0.12, depth, { color: P.impBlack, texel: 2 });
  }
  for (let t = 0; t < tiers; t++) {
    const y = t * tierH + 0.4; // beam bottom
    for (const sz of [-1, 1]) pl.box("paintedMetal", 0, y + 0.125, (sz * (depth - 0.16)) / 2, W - 0.1, 0.25, 0.08, { color: P.impDark, texel: 2 });
    pl.box("emitAmber", 0, y + 0.06, -depth / 2 + 0.035, W - 0.4, 0.02, 0.004);
    pl.box("paintedMetal", 0, y + 0.275, 0, W - 0.16, 0.05, depth - 0.3, { color: P.impMid, texel: 1 }); // deck
    for (let b = 0; b < bays; b++) slots.push({ x: -W / 2 + (b + 0.5) * bayW, y: y + 0.3, z: 0, tier: t, bay: b });
  }
  // bay id plates on the bottom front beam
  for (let b = 0; b < bays; b++) {
    pl.box("paintedMetal", -W / 2 + (b + 0.5) * bayW, 0.52, -depth / 2 - 0.03, 0.5, 0.22, 0.02, { color: P.impBlack, texel: 2 });
    pl.box("emitAmber", -W / 2 + (b + 0.5) * bayW, 0.52, -depth / 2 - 0.045, 0.3, 0.05, 0.01);
  }
  pl.collider([-W / 2 - 0.1, 0, -depth / 2 - 0.05], [W / 2 + 0.1, H, depth / 2 + 0.05], tag);
  return { slots, W, H };
}

// ---------------------------------------------------------------------------
// Pipes / hoses
// ---------------------------------------------------------------------------
export function pipe(kit, P, from, to, r, color, opts = {}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const L = Math.hypot(dx, dy, dz);
  const axis = Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= Math.abs(dz) ? "x" : Math.abs(dy) >= Math.abs(dz) ? "y" : "z";
  const c = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  kit.cyl(opts.mat || "paintedMetal", c[0], c[1], c[2], r, L, axis, { color, segments: opts.segments || 12 });
  if (opts.flanges) {
    const n = Math.max(1, Math.floor(L / opts.flanges));
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0.5 : i / n;
      const p = [from[0] + dx * t, from[1] + dy * t, from[2] + dz * t];
      kit.cyl("paintedMetal", p[0], p[1], p[2], r * 1.35, 0.12, axis, { color: P.impBlack, segments: 12 });
      if (opts.bands) {
        const o = axis === "x" ? [0.14, 0, 0] : axis === "y" ? [0, 0.14, 0] : [0, 0, 0.14];
        kit.cyl(opts.bands, p[0] + o[0], p[1] + o[1], p[2] + o[2], r * 1.05, 0.04, axis, { segments: 12 });
      }
    }
  }
}

// Sagging hose / cable between two points (quadratic bezier with `sag` metres of droop)
export function hose(kit, mat, p0, p1, sag, r, color, opts = {}) {
  const a = new THREE.Vector3(...p0);
  const b = new THREE.Vector3(...p1);
  const m = a.clone().add(b).multiplyScalar(0.5);
  m.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, m, b);
  const g = new THREE.TubeGeometry(curve, opts.segments || 14, r, opts.radial || 6, false);
  kit.add(mat, g, { color, uv: "scale", uvScale: [1, 1] });
}

// ---------------------------------------------------------------------------
// Overhead crane: two I-beam rails along `axis` at height y, a bridge girder across them with a
// trolley, hook and chain. Rails hang from the ceiling on brackets. Dark steel, amber edge lights.
// ---------------------------------------------------------------------------
export function craneRails(kit, P, opts) {
  const { axis = "z", at = [0, 0], from, to, y, ceilY, bridgeAt = null, hookDrop = 4 } = opts;
  const L = to - from;
  const c = (from + to) / 2;
  for (const a of at) {
    const pos = (t) => (axis === "z" ? [a, y, t] : [t, y, a]);
    const [cx, , cz] = pos(c);
    const sx = axis === "z" ? 0.4 : L;
    const sz = axis === "z" ? L : 0.4;
    kit.box("paintedMetal", cx, y + 0.5, cz, sx, 0.1, sz, { color: P.impDark, texel: 1 }); // top flange
    kit.box("paintedMetal", cx, y, cz, axis === "z" ? 0.08 : L, 0.9, axis === "z" ? L : 0.08, { color: P.impMid, texel: 1 }); // web
    kit.box("paintedMetal", cx, y - 0.5, cz, sx, 0.1, sz, { color: P.impDark, texel: 1 }); // bottom flange
    kit.box("emitAmber", cx, y - 0.56, cz, axis === "z" ? 0.06 : L - 0.4, 0.02, axis === "z" ? L - 0.4 : 0.06);
    const n = Math.max(2, Math.round(L / 8));
    for (let i = 0; i <= n; i++) {
      const t = from + (L * i) / n;
      const [hx, , hz] = pos(t);
      kit.box("paintedMetal", hx, (y + 0.55 + ceilY) / 2, hz, 0.3, ceilY - y - 0.55, 0.3, { color: P.impDark, texel: 1 });
    }
  }
  if (bridgeAt !== null && at.length === 2) {
    const a0 = Math.min(at[0], at[1]);
    const a1 = Math.max(at[0], at[1]);
    const span = a1 - a0 + 1.2;
    const mid = (a0 + a1) / 2;
    const bpos = axis === "z" ? [mid, y - 1.05, bridgeAt] : [bridgeAt, y - 1.05, mid];
    kit.box("paintedMetal", bpos[0], bpos[1], bpos[2], axis === "z" ? span : 1.0, 0.9, axis === "z" ? 1.0 : span, { color: P.impMid, texel: 1 });
    kit.box("paintedMetal", bpos[0], bpos[1] - 0.2, bpos[2], axis === "z" ? span : 1.04, 0.3, axis === "z" ? 1.04 : span, { color: P.impDark, texel: 1 });
    kit.box("emitAmber", bpos[0], bpos[1] - 0.36, bpos[2], axis === "z" ? span - 0.6 : 0.06, 0.02, axis === "z" ? 0.06 : span - 0.6);
    for (const a of at) {
      const tp = axis === "z" ? [a, y - 0.75, bridgeAt] : [bridgeAt, y - 0.75, a];
      kit.box("paintedMetal", tp[0], tp[1], tp[2], 1.2, 0.7, 1.2, { color: P.impDark, texel: 1 });
      kit.box("emitAmber", tp[0], tp[1] - 0.2, tp[2] + (axis === "z" ? 0.62 : 0), axis === "z" ? 0.5 : 0.02, 0.08, axis === "z" ? 0.02 : 0.5);
    }
    const tx = axis === "z" ? mid + (a1 - a0) * 0.15 : bridgeAt;
    const tz = axis === "z" ? bridgeAt : mid + (a1 - a0) * 0.15;
    kit.box("paintedMetal", tx, y - 1.75, tz, 1.4, 0.6, 1.4, { color: P.impDark, texel: 1 });
    kit.cyl("paintedMetal", tx, y - 1.75, tz, 0.35, 1.5, axis === "z" ? "x" : "z", { color: P.impBlack, segments: 12 });
    kit.box("emitRedImp", tx, y - 2.08, tz, 0.3, 0.06, 0.3);
    kit.cyl("paintedMetal", tx, y - 2.05 - hookDrop / 2, tz, 0.035, hookDrop, "y", { color: P.impGrey, segments: 8 });
    kit.box("paintedMetal", tx, y - 2.05 - hookDrop - 0.3, tz, 0.5, 0.6, 0.3, { color: P.impMid, texel: 2 });
    kit.add("metal", new THREE.TorusGeometry(0.28, 0.06, 8, 16, Math.PI * 1.5), { pos: [tx, y - 2.05 - hookDrop - 0.85, tz], rot: [0, 0, Math.PI * 0.75], color: P.impGrey, uv: "scale", uvScale: [4, 1] });
  }
}

// ---------------------------------------------------------------------------
// Beacon lamp: dark housing + emissive dome on a short stalk.
// ---------------------------------------------------------------------------
export function beaconLamp(kit, P, x, y, z, mat = "emitRedImp", opts = {}) {
  const { r = 0.16 } = opts;
  kit.cyl("paintedMetal", x, y + 0.06, z, r + 0.05, 0.12, "y", { color: P.impBlack, segments: 12 });
  kit.add(mat, new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y + 0.12, z], uv: "keep" });
}

// Status post: dark 1.8 m column with a single lit lens in a hooded housing near the top and a thin
// amber band at 0.9 m. `lens` = emitter material; `face` = yaw (deg) the lens faces (player convention).
export function statusPost(kit, P, x, y, z, opts = {}) {
  const { h = 1.8, lens = "emitBlue", face = 0 } = opts;
  const pl = new Placer(kit, [x, y, z], face);
  pl.box("paintedMetal", 0, 0.04, 0, 0.5, 0.08, 0.5, { color: P.impBlack, texel: 2 });
  pl.box("paintedMetal", 0, h / 2, 0, 0.22, h, 0.22, { color: P.impDark, texel: 2 });
  pl.box("paintedMetal", 0, h + 0.03, 0, 0.26, 0.06, 0.26, { color: P.impBlack, texel: 2 });
  pl.box("emitAmber", 0, 0.9, 0, 0.226, 0.02, 0.226);
  // hooded lens housing on the facing side (-z local)
  pl.box("paintedMetal", 0, h - 0.32, -0.15, 0.3, 0.34, 0.1, { color: P.impBlack, texel: 2 });
  pl.box(lens, 0, h - 0.32, -0.205, 0.16, 0.16, 0.01);
  pl.box("paintedMetal", 0, h - 0.13, -0.19, 0.32, 0.03, 0.2, { color: P.impBlack, texel: 2 });
  kit.collider([x - 0.25, y, z - 0.25], [x + 0.25, y + h, z + 0.25], "post");
}

// ---------------------------------------------------------------------------
// Stairs: rises toward +y along local +z from the origin (bottom step front edge at z=0). Width w.
// Each step: tread + riser, a thin yellow nosing. One collider block (scenery; the player cannot climb).
// ---------------------------------------------------------------------------
export function stairs(pl, P, opts = {}) {
  const { w = 1.6, steps = 8, rise = 0.18, run = 0.3, collide = true, rails = true } = opts;
  for (let i = 0; i < steps; i++) {
    const y = (i + 1) * rise;
    const z = (i + 0.5) * run;
    pl.box("paintedMetal", 0, y - 0.025, z, w, 0.05, run + 0.02, { color: P.impMid, texel: 2 });
    pl.box("paintedMetal", 0, y - rise / 2 - 0.02, z + run / 2 - 0.02, w - 0.04, rise - 0.04, 0.03, { color: P.impBlack, texel: 2 });
    pl.box("painted", 0, y + 0.002, z - run / 2 + 0.05, w - 0.1, 0.006, 0.06, { color: YELLOW, uv: "keep" });
  }
  const H = steps * rise;
  const R = steps * run;
  const L = Math.hypot(H, R);
  const dir = new THREE.Vector3(0, H, R).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  for (const sx of [-1, 1]) {
    const x = (sx * (w + 0.08)) / 2;
    pl.add("paintedMetal", new THREE.BoxGeometry(0.08, 0.32, L + 0.2), x, H / 2 - 0.1, R / 2, { color: P.impDark, texel: 1, quat: q });
    if (rails) {
      pl.add("metal", new THREE.CylinderGeometry(0.03, 0.03, L, 10), x, H / 2 + 1.0, R / 2, { color: P.impGrey, uv: "scale", uvScale: [0.2, L], quat: q });
      for (const t of [0.08, 0.5, 0.92]) pl.box("paintedMetal", x, H * t + 0.5, R * t, 0.06, 1.0, 0.06, { color: P.impBlack, texel: 2 });
    }
  }
  if (collide) pl.collider([-w / 2 - 0.1, 0, 0], [w / 2 + 0.1, H + 1.1, R], "stairs");
}

// ---------------------------------------------------------------------------
// Hexagonal panel prop (TIE-style solar wing): frame ring, dark cell plate, radial spokes. Axis along
// local +x (the panel stands vertically facing ±x when yaw 0).
// ---------------------------------------------------------------------------
export function hexPanel(pl, P, opts = {}) {
  const { r = 3.5, thick = 0.16, at = [0, 0, 0], rot = [0, 0, Math.PI / 2], ring = P.impGrey, spoke = P.impHullLight, cells = P.impBlack, hub = P.impMid } = opts;
  const R = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  const place = (mat, geo, off, q, o) => {
    const d = new THREE.Vector3(off[0], off[1], off[2]).applyQuaternion(R);
    pl.add(mat, geo, at[0] + d.x, at[1] + d.y, at[2] + d.z, { ...o, quat: q ? R.clone().multiply(q) : R });
  };
  place("paintedMetal", new THREE.CylinderGeometry(r, r, thick, 6, 1), [0, 0, 0], null, { color: ring, uv: "world", texel: 1 });
  place("paintedMetal", new THREE.CylinderGeometry(r - 0.35, r - 0.35, thick + 0.04, 6, 1), [0, 0, 0], null, { color: cells, uv: "world", texel: 1 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
    const off = [Math.sin(a) * ((r - 0.5) / 2), 0, Math.cos(a) * ((r - 0.5) / 2)];
    place("paintedMetal", new THREE.BoxGeometry(0.16, thick + 0.1, r - 0.5), off, q, { color: spoke, texel: 2 });
  }
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const w = 2 * Math.sqrt(Math.max(0, r * r * 0.75 - (i * r * 0.28) ** 2)) * 0.92;
    place("paintedMetal", new THREE.BoxGeometry(w, thick + 0.06, 0.05), [0, 0, i * r * 0.28], null, { color: spoke, texel: 2 });
  }
  place("paintedMetal", new THREE.CylinderGeometry(0.5, 0.5, thick + 0.2, 12, 1), [0, 0, 0], null, { color: hub, uv: "world", texel: 1 });
  for (const s of [-1, 1]) place("emitAmber", new THREE.BoxGeometry(0.2, 0.02, 0.08), [0.22, s * (thick / 2 + 0.1), 0], null, { uv: "keep" });
}

// ---------------------------------------------------------------------------
// Workbench 0.9 m: light-grey top, dark carcass, a pegboard back with a louvred task light.
// Local: front -z, back panel at +z.
// ---------------------------------------------------------------------------
export function workbench(pl, P, rand, opts = {}) {
  const { w = 2.4, d = 0.9, back = true } = opts;
  pl.box("paintedMetal", 0, 0.87, 0, w, 0.06, d, { color: P.impGrey, texel: 1.5 });
  pl.box("paintedMetal", 0, 0.45, 0, w - 0.12, 0.8, d - 0.16, { color: P.impDark, texel: 1.5 });
  for (const sx of [-1, 1]) pl.box("paintedMetal", (sx * (w - 0.1)) / 2, 0.42, 0, 0.1, 0.84, d - 0.05, { color: P.impBlack, texel: 2 });
  for (let i = 0; i < Math.floor(w / 0.6); i++) {
    pl.box("paintedMetal", -w / 2 + 0.35 + i * 0.6, 0.65, -d / 2 + 0.01, 0.5, 0.18, 0.03, { color: P.impMid, texel: 2 });
    pl.box("metal", -w / 2 + 0.35 + i * 0.6, 0.65, -d / 2 - 0.01, 0.2, 0.025, 0.03, { color: P.impGrey });
  }
  const n = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.3 + rand() * (w - 0.6);
    const z = -d / 2 + 0.2 + rand() * (d - 0.4);
    const k = rand();
    if (k < 0.35) pl.box("metal", x, 0.93, z, 0.1 + rand() * 0.25, 0.05, 0.06 + rand() * 0.1, { color: P.impGrey, rot: [0, rand() * 3, 0] });
    else if (k < 0.6) pl.cyl("metal", x, 0.93, z, 0.02, 0.2 + rand() * 0.3, "x", { color: P.impGrey, segments: 8 });
    else if (k < 0.8) pl.box("paintedMetal", x, 0.96, z, 0.25, 0.12, 0.18, { color: P.impBlack, texel: 2 });
    else pl.box("paintedMetal", x, 0.95, z, 0.16, 0.1, 0.12, { color: P.impDark, texel: 2 });
  }
  if (back) {
    pl.box("paintedMetal", 0, 1.5, d / 2 - 0.02, w, 1.2, 0.04, { color: P.impDark, texel: 1 });
    for (let i = 0; i < Math.floor(w / 0.3); i++) {
      const x = -w / 2 + 0.2 + i * 0.3;
      const h = 0.15 + rand() * 0.35;
      pl.box("metal", x, 1.75 - h / 2, d / 2 - 0.07, 0.05 + rand() * 0.06, h, 0.04, { color: P.impGrey });
    }
    // task light: housing + emitter + louvre bars
    pl.box("paintedMetal", 0, 2.18, d / 2 - 0.12, w - 0.2, 0.08, 0.24, { color: P.impBlack, texel: 2 });
    pl.box("emitWhite", 0, 2.135, d / 2 - 0.12, w - 0.36, 0.01, 0.12, { uv: "keep" });
    for (let x = -w / 2 + 0.3; x < w / 2 - 0.2; x += 0.25) pl.box("paintedMetal", x, 2.12, d / 2 - 0.12, 0.025, 0.02, 0.16, { color: P.impBlack });
  }
  pl.collider([-w / 2, 0, -d / 2], [w / 2, 1.0, d / 2], "workbench");
}

// Imperial bench seat: dark tube frame, thin light-grey slotted seat plate at 0.45 m, low back rail.
export function benchSeat(pl, P, opts = {}) {
  const { len = 3.0 } = opts;
  for (const sx of [-1, 1]) {
    const x = (sx * (len - 0.4)) / 2;
    for (const z of [-0.2, 0.2]) pl.box("paintedMetal", x, 0.21, z, 0.05, 0.42, 0.05, { color: P.impBlack, texel: 2 });
    pl.box("paintedMetal", x, 0.02, 0, 0.06, 0.04, 0.5, { color: P.impBlack, texel: 2 });
    pl.box("paintedMetal", x, 0.6, 0.24, 0.05, 0.36, 0.05, { color: P.impBlack, texel: 2 });
  }
  pl.box("paintedMetal", 0, 0.41, 0, len - 0.2, 0.05, 0.08, { color: P.impBlack, texel: 2 }); // spine
  for (const z of [-0.14, 0.14]) pl.box("paintedMetal", 0, 0.45, z, len, 0.035, 0.24, { color: P.impGrey, texel: 1.5 }); // slotted seat
  pl.cyl("metal", 0, 0.78, 0.24, 0.025, len - 0.36, "x", { color: P.impGrey, segments: 8 }); // back rail
  pl.collider([-len / 2, 0, -0.3], [len / 2, 0.8, 0.3], "bench");
}

// Locker bank: n lockers 0.5 wide × 2.0 tall × 0.55 deep on a plinth, doors facing -z, vent slots and
// a blue lens per door. Local origin: floor centre of the run.
export function lockerBank(pl, P, n = 4, opts = {}) {
  const { w = 0.5, h = 2.0, d = 0.55 } = opts;
  const W = n * w;
  pl.box("paintedMetal", 0, 0.05, 0, W, 0.1, d, { color: P.impBlack, texel: 2 });
  pl.box("paintedMetal", 0, 0.1 + (h - 0.1) / 2, 0.02, W, h - 0.1, d - 0.04, { color: P.impDark, texel: 1.5 });
  pl.box("paintedMetal", 0, h + 0.03, 0, W + 0.04, 0.06, d + 0.02, { color: P.impBlack, texel: 2 });
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + w * (i + 0.5);
    pl.box("paintedMetal", x, 0.1 + (h - 0.2) / 2 + 0.03, -d / 2 - 0.01, w - 0.06, h - 0.26, 0.02, { color: i % 2 ? P.impMid : P.impDark, texel: 2 });
    for (let k = 0; k < 3; k++) pl.box("paintedMetal", x, 1.45 + k * 0.08, -d / 2 - 0.025, 0.24, 0.02, 0.01, { color: P.impBlack });
    pl.box("metal", x + 0.14, 1.0, -d / 2 - 0.03, 0.03, 0.14, 0.02, { color: P.impGrey });
    pl.box("emitBlue", x - 0.12, h - 0.16, -d / 2 - 0.025, 0.06, 0.03, 0.01);
  }
  pl.collider([-W / 2, 0, -d / 2 - 0.05], [W / 2, h + 0.1, d / 2], "lockers");
}

// ---------------------------------------------------------------------------
// Loader vehicle: dark boxy chassis, driver station under a low cage, a tall twin-channel mast with a
// carriage and two forks, black wheels with grey hubs, an amber beacon and thin amber bands.
// Local: forks point -z.
// ---------------------------------------------------------------------------
export function loader(pl, P, opts = {}) {
  const { liftH = 0.5, mastH = 3.4 } = opts;
  pl.box("paintedMetal", 0, 0.7, 0.3, 1.5, 0.6, 2.2, { color: P.impDark, texel: 1.5 }); // chassis
  pl.box("paintedMetal", 0, 1.05, 0.95, 1.3, 0.3, 0.9, { color: P.impBlack, texel: 1.5 }); // counterweight top
  pl.box("emitAmber", 0, 0.85, 1.41, 1.0, 0.03, 0.01);
  pl.box("paintedMetal", 0, 1.02, -0.05, 1.3, 0.06, 0.9, { color: P.impMid, texel: 2 }); // deck
  pl.box("paintedMetal", 0, 1.3, 0.55, 0.6, 0.5, 0.45, { color: P.impBlack, texel: 2 }); // seat
  pl.box("paintedMetal", 0, 1.75, 0.78, 0.6, 0.45, 0.08, { color: P.impBlack, texel: 2 });
  pl.box("paintedMetal", 0, 1.3, -0.25, 0.5, 0.35, 0.3, { color: P.impBlack, texel: 2 }); // control pod
  pl.box("screenImp0", 0, 1.49, -0.25, 0.32, 0.01, 0.18, { uv: "keep" });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pl.box("paintedMetal", sx * 0.62, 1.75, 0.3 + sz * 0.8, 0.1, 1.5, 0.1, { color: P.impDark, texel: 2 });
  pl.box("paintedMetal", 0, 2.53, 0.3, 1.4, 0.08, 1.8, { color: P.impDark, texel: 2 });
  for (let i = -2; i <= 2; i++) pl.box("paintedMetal", 0, 2.5, 0.3 + i * 0.4, 1.3, 0.04, 0.05, { color: P.impBlack });
  beaconLampLocal(pl, P, 0.45, 2.57, 0.95, "emitAmber");
  for (const sx of [-1, 1]) {
    for (const z of [-0.5, 1.1]) {
      pl.cyl("paintedMetal", sx * 0.8, 0.4, z, 0.4, 0.3, "x", { color: P.impBlack, segments: 16 });
      pl.cyl("metal", sx * 0.96, 0.4, z, 0.2, 0.02, "x", { color: P.impGrey, segments: 12 });
    }
  }
  // mast: two channels + cross ties, carriage, forks
  for (const sx of [-1, 1]) pl.box("paintedMetal", sx * 0.5, mastH / 2 + 0.05, -1.0, 0.14, mastH, 0.22, { color: P.impDark, texel: 2 });
  for (const y of [0.9, 2.0, mastH - 0.1]) pl.box("paintedMetal", 0, y, -1.0, 1.1, 0.12, 0.14, { color: P.impBlack, texel: 2 });
  pl.cyl("metal", 0.5, mastH / 2 + 0.05, -1.12, 0.03, mastH - 0.2, "y", { color: P.impGrey, segments: 8 });
  pl.box("paintedMetal", 0, liftH + 0.5, -1.2, 1.1, 0.9, 0.1, { color: P.impMid, texel: 2 }); // carriage
  pl.box("emitAmber", 0, liftH + 0.92, -1.26, 0.8, 0.02, 0.01);
  for (const sx of [-1, 1]) {
    pl.box("metal", sx * 0.36, liftH + 0.03, -1.9, 0.12, 0.06, 1.4, { color: P.impGrey });
    pl.box("metal", sx * 0.36, liftH + 0.35, -1.22, 0.12, 0.7, 0.06, { color: P.impGrey });
  }
  pl.collider([-1.0, 0, -2.6], [1.0, 2.6, 1.45], "loader");
}

function beaconLampLocal(pl, P, x, y, z, mat) {
  pl.cyl("paintedMetal", x, y + 0.05, z, 0.14, 0.1, "y", { color: P.impBlack, segments: 10 });
  pl.add(mat, new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), x, y + 0.1, z, { uv: "keep" });
}

// ---------------------------------------------------------------------------
// Conveyor line: rollers between two side rails on legs, along local +x from -len/2 to +len/2. With
// `inlet`, the -x end runs into a sorter cabinet (dark box with a lit throat) so the belt starts
// somewhere. `w` is the clear belt width; crates riding it should be <= w - 0.2.
// ---------------------------------------------------------------------------
export function conveyor(pl, P, opts = {}) {
  const { len = 12, w = 1.6, h = 0.75, inlet = false } = opts;
  for (const sz of [-1, 1]) pl.box("paintedMetal", 0, h, (sz * (w + 0.1)) / 2, len, 0.16, 0.1, { color: P.impDark, texel: 1.5 });
  const n = Math.floor(len / 0.35);
  for (let i = 0; i < n; i++) pl.cyl("metal", -len / 2 + 0.2 + i * 0.35, h + 0.02, 0, 0.06, w, "z", { color: P.impGrey, segments: 8 });
  for (let x = -len / 2 + 0.5; x <= len / 2 - 0.5; x += 2.5) {
    for (const sz of [-1, 1]) pl.box("paintedMetal", x, h / 2, (sz * (w + 0.02)) / 2, 0.08, h - 0.05, 0.08, { color: P.impBlack, texel: 2 });
    pl.box("paintedMetal", x, 0.04, 0, 0.3, 0.08, w + 0.1, { color: P.impBlack, texel: 2 });
  }
  pl.box("emitAmber", 0, h + 0.085, -(w + 0.1) / 2 - 0.045, len - 0.6, 0.012, 0.01); // edge light on the front rail
  // drive box at the +x end
  pl.box("paintedMetal", len / 2 - 0.4, h - 0.1, w / 2 + 0.35, 0.6, 0.5, 0.4, { color: P.impDark, texel: 2 });
  pl.box("emitBlue", len / 2 - 0.4, h + 0.1, w / 2 + 0.56, 0.1, 0.04, 0.02);
  pl.collider([-len / 2, 0, -w / 2 - 0.1], [len / 2, h + 0.3, w / 2 + 0.6], "conveyor");
  if (inlet) {
    const cx = -len / 2 - 1.2;
    pl.box("paintedMetal", cx, 1.4, 0, 2.6, 2.8, w + 1.6, { color: P.impDark, texel: 1 });
    pl.box("paintedMetal", cx, 2.85, 0, 2.7, 0.1, w + 1.7, { color: P.impBlack, texel: 1 });
    pl.box("paintedMetal", cx + 1.31, h + 0.55, 0, 0.02, 1.1, w + 0.3, { color: P.impBlack, texel: 1 }); // throat
    pl.box("emitBlue", cx + 1.32, h + 1.12, 0, 0.01, 0.04, w + 0.2);
    pl.box("emitRedImp", cx + 1.32, 2.4, (w + 1.6) / 2 - 0.4, 0.01, 0.1, 0.1);
    pl.box("paintedMetal", cx + 1.32, 2.2, 0, 0.02, 0.5, 1.2, { color: P.impBlack, texel: 2 });
    pl.box("screenImp1", cx + 1.33, 2.2, 0, 0.01, 0.4, 1.0, { uv: "keep" });
    pl.collider([cx - 1.3, 0, -(w + 1.6) / 2], [cx + 1.3, 2.9, (w + 1.6) / 2], "sorter");
  }
}

// ---------------------------------------------------------------------------
// Chain hoist hanging from a point: motor block, chain, hook (optionally holding a crate).
// ---------------------------------------------------------------------------
export function chainHoist(kit, P, x, y, z, drop, opts = {}) {
  kit.box("paintedMetal", x, y - 0.35, z, 0.9, 0.7, 0.7, { color: P.impDark, texel: 2 });
  kit.box("emitRedImp", x, y - 0.55, z - 0.36, 0.2, 0.05, 0.02);
  kit.cyl("paintedMetal", x, y - 0.7 - drop / 2, z, 0.03, drop, "y", { color: P.impGrey, segments: 8 });
  kit.box("paintedMetal", x, y - 0.7 - drop - 0.2, z, 0.35, 0.4, 0.25, { color: P.impMid, texel: 2 });
  kit.add("metal", new THREE.TorusGeometry(0.2, 0.045, 8, 16, Math.PI * 1.5), { pos: [x, y - 0.7 - drop - 0.6, z], rot: [0, 0, Math.PI * 0.75], color: P.impGrey, uv: "scale", uvScale: [4, 1] });
  if (opts.load) {
    const s = 1.2;
    const cy = y - 0.7 - drop - 0.85 - s;
    const pl = new Placer(kit, [x, cy, z], 20);
    crateKit(pl, P, { color: P.impGrey });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) hose(kit, "paintedMetal", [x, y - 0.7 - drop - 0.8, z], pl.point(sx * 0.55, s, sz * 0.55), -0.05, 0.02, P.impBlack);
  }
}

// ---------------------------------------------------------------------------
// Light fixtures: a dark housing, the emitter 1 cm under it, louvre bars across the opening so it
// reads as a fixture rather than a bare glowing slab. y = housing underside. axis 'x' or 'z'.
// ---------------------------------------------------------------------------
export function louvredFixture(kit, P, x, y, z, len, w, axis, mat = "emitWhite", opts = {}) {
  const { depth = 0.3, louvre = 0.3 } = opts;
  const sx = axis === "x" ? len : w;
  const sz = axis === "x" ? w : len;
  kit.box("paintedMetal", x, y + depth / 2, z, sx + 0.3, depth, sz + 0.3, { color: P.impBlack, texel: 1 });
  kit.box(mat, x, y - 0.01, z, sx, 0.02, sz, { uv: "keep" });
  const n = Math.floor(len / louvre);
  for (let i = 0; i < n; i++) {
    const t = -len / 2 + louvre * (i + 0.5);
    if (axis === "x") kit.box("paintedMetal", x + t, y - 0.04, z, 0.03, 0.03, w + 0.06, { color: P.impBlack });
    else kit.box("paintedMetal", x, y - 0.04, z + t, w + 0.06, 0.03, 0.03, { color: P.impBlack });
  }
  for (const d of [-len / 2 - 0.12, len / 2 + 0.12]) {
    if (axis === "x") kit.box("paintedMetal", x + d, y - 0.03, z, 0.06, 0.1, w + 0.3, { color: P.impBlack });
    else kit.box("paintedMetal", x, y - 0.03, z + d, w + 0.3, 0.1, 0.06, { color: P.impBlack });
  }
}

// Small strip fixture (work lights on props): housing + emitter + louvre. y = housing underside.
export function stripFixture(kit, P, x, y, z, len, axis, mat = "emitWhite", opts = {}) {
  const { w = 0.18 } = opts;
  louvredFixture(kit, P, x, y, z, len, w, axis, mat, { depth: 0.08, louvre: 0.22 });
}

// Flood point descriptor helper
export function pointLight(pos, color, intensity, distance, priority = 0.5) {
  return { type: "point", pos, color, intensity, distance, priority };
}
export function spotLight(pos, target, color, intensity, distance, angle = 0.6, penumbra = 0.5, priority = 0.7) {
  return { type: "spot", pos, target, color, intensity, distance, angle, penumbra, priority };
}
