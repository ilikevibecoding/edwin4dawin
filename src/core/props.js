// Shared Imperial prop library. Every room uses these for consistency (consoles, chairs, pillars, railings,
// stairs, crates, pipes, cable bundles, door frames, computer banks, emblems…) and adds its own specifics.
// All functions take the room's Kit and world-space positions; `yaw` rotates about +Y (0 faces −Z).
import * as THREE from "three";
import { rng, prism } from "./kit.js";
import { IMP } from "./palette.js";
import { decalRect, ledRect, screenRect, DECAL } from "../textures.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Places boxes/cylinders in a local frame (origin + yaw) with world-space AABB colliders. */
export class Placer {
  constructor(kit, pos, yaw = 0) {
    this.kit = kit;
    this.o = new THREE.Vector3(pos[0], pos[1], pos[2]);
    this.yaw = yaw;
    this.q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  }
  world(lx, ly, lz) {
    return new THREE.Vector3(lx, ly, lz).applyQuaternion(this.q).add(this.o);
  }
  box(mat, lx, ly, lz, sx, sy, sz, opts = {}) {
    const p = this.world(lx, ly, lz);
    let q = this.q;
    if (opts.rot) q = this.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...opts.rot)));
    const { rot, ...rest } = opts;
    return this.kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...rest });
  }
  boxMM(mat, min, max, opts = {}) {
    return this.box(mat, (min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2, max[0] - min[0], max[1] - min[1], max[2] - min[2], opts);
  }
  cyl(mat, lx, ly, lz, r, len, axis = "y", opts = {}) {
    const p = this.world(lx, ly, lz);
    const g = new THREE.CylinderGeometry(opts.r2 !== undefined ? opts.r2 : r, r, len, opts.segments || 12, 1, opts.open || false);
    const e = axis === "x" ? new THREE.Euler(0, 0, Math.PI / 2) : axis === "z" ? new THREE.Euler(Math.PI / 2, 0, 0) : new THREE.Euler(0, 0, 0);
    const q = this.q.clone();
    if (opts.rot) q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...opts.rot)));
    q.multiply(new THREE.Quaternion().setFromEuler(e));
    const { r2, segments, open, rot, ...rest } = opts;
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  add(mat, geo, lx, ly, lz, opts = {}) {
    const p = this.world(lx, ly, lz);
    let q = this.q;
    if (opts.rot) q = this.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...opts.rot)));
    const { rot, ...rest } = opts;
    return this.kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...rest });
  }
  decal(lx, ly, lz, w, h, index, opts = {}) {
    return this.add("decal", new THREE.PlaneGeometry(w, h), lx, ly, lz, { uv: "keep", uvRect: decalRect(index), ...opts });
  }
  // world AABB of a local box: exact for yaw multiples of 90°; a rotated box is split along its long axis into
  // ~0.6 m segments so a diagonal railing does not claim its whole bounding square
  collider(min, max, tag) {
    const axisAligned = Math.abs(Math.sin(2 * this.yaw)) < 1e-3;
    const lx = max[0] - min[0];
    const lz = max[2] - min[2];
    const n = axisAligned ? 1 : Math.max(1, Math.ceil(Math.max(lx, lz) / 0.6));
    let last = null;
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const seg = lx >= lz ? [[min[0] + lx * t0, min[1], min[2]], [min[0] + lx * t1, max[1], max[2]]] : [[min[0], min[1], min[2] + lz * t0], [max[0], max[1], min[2] + lz * t1]];
      const [a, b] = seg;
      const cs = [this.world(a[0], a[1], a[2]), this.world(b[0], a[1], a[2]), this.world(a[0], a[1], b[2]), this.world(b[0], a[1], b[2]), this.world(a[0], b[1], a[2]), this.world(b[0], b[1], b[2])];
      const lo = new THREE.Vector3(Infinity, Infinity, Infinity);
      const hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      for (const c of cs) {
        lo.min(c);
        hi.max(c);
      }
      last = this.kit.collider([lo.x, lo.y, lo.z], [hi.x, hi.y, hi.z], tag);
    }
    return last;
  }
}

// ---------------------------------------------------------------------------------------------------
// Consoles and seating
// ---------------------------------------------------------------------------------------------------
/**
 * Imperial console station: black sloped desk with screens and a key matrix, plated base, side trim.
 * pos = floor point at the centre of the front (operator) edge; faces −Z locally (operator stands at +Z).
 */
export function consoleStation(kit, { pos, yaw = 0, w = 1.6, d = 0.8, h = 1.0, screens = 2, accent = "emitBlue", seed = 1, collide = true, screenSet = null }) {
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  // base
  P.box("paintedMetal", 0, 0.06, -d / 2, w - 0.1, 0.12, d - 0.1, { color: IMP.black, texel: 1 });
  P.box("plate", 0, h * 0.42, -d / 2, w, h * 0.72, d, { color: IMP.plateDark, uv: "keep" });
  P.box("paintedMetal", 0, h * 0.42, -d / 2, w + 0.04, 0.05, d + 0.04, { color: IMP.trim });
  // sloped desk (rises away from the operator)
  const tilt = 0.28;
  const slabD = d * 0.9;
  P.box("darkGloss", 0, h * 0.78 + 0.05, -d / 2 - 0.02, w - 0.04, 0.08, slabD, { rot: [tilt, 0, 0] });
  P.box("paintedMetal", 0, h * 0.78 + 0.01, -d / 2 - 0.02, w, 0.06, slabD + 0.04, { color: IMP.black, rot: [tilt, 0, 0] });
  // key matrix near the operator
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  const at = (x, along, lift) => new THREE.Vector3(x, h * 0.78 + 0.05, -d / 2 - 0.02).addScaledVector(fwd, along).addScaledVector(up, 0.04 + lift);
  const keys = Math.floor((w - 0.3) / 0.11);
  for (let i = 0; i < keys; i++) {
    const x = -(w - 0.3) / 2 + 0.055 + i * 0.11;
    for (let r = 0; r < 2; r++) {
      const p = at(x, -slabD * 0.32 + r * 0.11, 0.01);
      const lit = rand() < 0.3;
      P.box(lit ? (rand() < 0.5 ? accent : "emitRed") : "rubber", p.x, p.y, p.z, 0.08, 0.025, 0.08, { rot: [tilt, 0, 0], color: IMP.black });
    }
  }
  // LED strip + screens on the upper part of the slab
  {
    const p = at(0, -slabD * 0.05, 0.005);
    P.box("leds", p.x, p.y, p.z, w - 0.4, 0.07, 0.006, { rot: [tilt, 0, 0], uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
  }
  const sw = (w - 0.3) / screens - 0.08;
  for (let s = 0; s < screens; s++) {
    const x = -(w - 0.3) / 2 + sw / 2 + 0.04 + s * (sw + 0.08);
    const p = at(x, slabD * 0.25, 0.008);
    P.box("darkGloss", p.x, p.y, p.z, sw + 0.04, 0.03, sw * 0.5 + 0.04, { rot: [tilt, 0, 0] });
    const p2 = at(x, slabD * 0.25, 0.026);
    const g = new THREE.PlaneGeometry(sw, sw * 0.5);
    g.rotateX(-Math.PI / 2);
    P.add("screen", g, p2.x, p2.y, p2.z, { rot: [tilt, 0, 0], uv: "keep", uvRect: screenRect(screenSet ? screenSet[s % screenSet.length] : Math.floor(rand() * 16)) });
  }
  // back riser with a status panel (visible to people walking behind the operator)
  P.box("plate", 0, h * 0.9, -d + 0.06, w - 0.2, h * 0.36, 0.1, { color: IMP.plateDark, uv: "keep" });
  P.box("leds", 0, h * 0.95, -d + 0.005, w - 0.6, 0.08, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
  // toe light
  P.box(accent, 0, 0.14, -0.02, w - 0.3, 0.02, 0.01);
  if (collide) P.collider([-w / 2, 0, -d], [w / 2, h + 0.1, 0], "console");
  return P;
}

/** High-back Imperial operator seat facing −Z locally; pos = floor point under the seat centre. */
export function chair(kit, { pos, yaw = 0, color = IMP.fabricBlack, collide = true }) {
  const P = new Placer(kit, pos, yaw);
  P.cyl("metal", 0, 0.2, 0, 0.07, 0.4, "y", { color: IMP.gunmetal });
  P.cyl("paintedMetal", 0, 0.03, 0, 0.3, 0.06, "y", { color: IMP.black, segments: 16 });
  P.box("paintedMetal", 0, 0.42, 0, 0.5, 0.05, 0.5, { color: IMP.black });
  P.box("fabric", 0, 0.5, 0, 0.56, 0.11, 0.54, { color, uv: "world", texel: 2 });
  for (const bx of [-0.25, 0.25]) P.box("rubber", bx, 0.57, 0.02, 0.08, 0.08, 0.5, { color: IMP.black });
  // backrest leaning aft (+Z)
  P.box("fabric", 0, 0.95, 0.26, 0.5, 0.86, 0.1, { color, uv: "world", texel: 2, rot: [-0.18, 0, 0] });
  P.box("paintedMetal", 0, 0.95, 0.32, 0.54, 0.9, 0.04, { color: IMP.black, rot: [-0.18, 0, 0] });
  P.box("rubber", 0, 1.45, 0.2, 0.3, 0.16, 0.1, { color: IMP.black, rot: [-0.18, 0, 0] });
  for (const ax of [-0.33, 0.33]) {
    P.box("paintedMetal", ax, 0.7, 0.08, 0.05, 0.28, 0.08, { color: IMP.gunmetal });
    P.box("rubber", ax, 0.85, 0.04, 0.07, 0.04, 0.42, { color: IMP.black });
  }
  if (collide) P.collider([-0.3, 0, -0.3], [0.3, 1.2, 0.36], "chair");
  return P;
}

/** Cylindrical holo table / projector pedestal with an emissive ring; pos = floor centre. */
export function holoTable(kit, { pos, r = 1.2, h = 0.95, accent = "emitBlue", collide = true }) {
  const P = new Placer(kit, pos, 0);
  P.cyl("paintedMetal", 0, 0.05, 0, r + 0.1, 0.1, "y", { color: IMP.black, segments: 24 });
  P.cyl("plate", 0, h * 0.5, 0, r * 0.7, h - 0.1, "y", { color: IMP.plateDark, segments: 24, uv: "world", texel: 1 });
  P.cyl("darkGloss", 0, h - 0.03, 0, r, 0.06, "y", { segments: 32 });
  P.cyl("paintedMetal", 0, h - 0.07, 0, r + 0.04, 0.03, "y", { color: IMP.trim, segments: 32 });
  P.add(accent, new THREE.TorusGeometry(r * 0.82, 0.02, 8, 48), 0, h + 0.005, 0, { rot: [Math.PI / 2, 0, 0] });
  P.add("emitWhite", new THREE.CylinderGeometry(r * 0.12, r * 0.12, 0.01, 24), 0, h + 0.005, 0, {});
  // control ring: small panels around the rim
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * (r - 0.18);
    const z = Math.sin(a) * (r - 0.18);
    P.box("leds", x, h + 0.006, z, 0.22, 0.004, 0.08, { rot: [0, -a, 0], uv: "keep", uvRect: ledRect(i) });
  }
  if (collide) P.collider([-r, 0, -r], [r, h + 0.05, r], "holotable");
  return P;
}

// ---------------------------------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------------------------------
/** Square structural column with chamfered corners and a vertical light slot. pos = floor centre. */
export function pillar(kit, { pos, h, w = 0.8, slot = true, color = IMP.plateDark, collide = true }) {
  const P = new Placer(kit, pos, 0);
  const oct = prism(
    [
      [-w / 2, -w / 2 + w * 0.2],
      [-w / 2 + w * 0.2, -w / 2],
      [w / 2 - w * 0.2, -w / 2],
      [w / 2, -w / 2 + w * 0.2],
      [w / 2, w / 2 - w * 0.2],
      [w / 2 - w * 0.2, w / 2],
      [-w / 2 + w * 0.2, w / 2],
      [-w / 2, w / 2 - w * 0.2],
    ],
    h,
  );
  P.add("paintedMetal", oct, 0, h / 2, 0, { rot: [Math.PI / 2, 0, 0], color, uv: "world", texel: 1 });
  P.box("paintedMetal", 0, 0.2, 0, w + 0.12, 0.4, w + 0.12, { color: IMP.black, texel: 1 });
  P.box("paintedMetal", 0, h - 0.2, 0, w + 0.12, 0.4, w + 0.12, { color: IMP.black, texel: 1 });
  if (slot) {
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      P.box("emitWhiteSoft", dx * (w / 2 + 0.002), h * 0.55, dz * (w / 2 + 0.002), dx ? 0.005 : 0.03, h * 0.5, dz ? 0.005 : 0.03, { uv: "keep" });
    }
  }
  if (collide) P.collider([-w / 2, 0, -w / 2], [w / 2, h, w / 2], "pillar");
  return P;
}

/** Railing between two floor points at height y (top rail 1.05 m). Adds a collider. */
export function railing(kit, { from, to, y, h = 1.05, posts = null, color = IMP.gunmetal, kick = true, collide = true }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx); // local +X runs from -> to
  const P = new Placer(kit, [from[0], y, from[1]], yaw);
  P.cyl("metal", L / 2, h, 0, 0.03, L, "x", { color: IMP.steel, segments: 10 });
  P.box("paintedMetal", L / 2, h * 0.55, 0, L, 0.06, 0.03, { color, texel: 1 });
  if (kick) P.box("paintedMetal", L / 2, 0.08, 0, L, 0.16, 0.03, { color: IMP.black, texel: 1 });
  const n = posts || Math.max(2, Math.round(L / 2.2) + 1);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * L;
    P.box("paintedMetal", Math.min(Math.max(x, 0.04), L - 0.04), h / 2, 0, 0.07, h, 0.07, { color, texel: 1 });
    P.box("metal", Math.min(Math.max(x, 0.04), L - 0.04), 0.02, 0, 0.14, 0.04, 0.14, { color: IMP.steelDark });
  }
  if (collide) P.collider([0, 0, -0.08], [L, h + 0.05, 0.08], "railing");
  return P;
}

/**
 * Straight stairs. pos = floor point at the centre of the bottom step's leading edge; local −Z is the
 * climbing direction (steps rise as z decreases). Each step is a collider (the player steps up 0.45 m).
 */
export function stairs(kit, { pos, yaw = 0, width = 2.4, rise, run = null, stepH = 0.2, stringers = true, rails = true, color = IMP.plateDark }) {
  const P = new Placer(kit, pos, yaw);
  const n = Math.max(1, Math.round(rise / stepH));
  const sh = rise / n;
  const sd = run ? run / n : 0.3;
  for (let i = 0; i < n; i++) {
    const y0 = i * sh;
    const z0 = -i * sd;
    P.box("plate", 0, y0 + sh / 2, z0 - sd / 2, width, sh, sd, { color, uv: "world", texel: 1 });
    P.box("metal", 0, y0 + sh - 0.015, z0 - 0.02, width, 0.03, 0.04, { color: IMP.steelDark });
    P.box("hazard", 0, y0 + sh + 0.003, z0 - 0.06, width - 0.2, 0.006, 0.1, { texel: 2 });
    P.collider([-width / 2, y0 - 0.01, z0 - sd], [width / 2, y0 + sh, z0], "step");
  }
  // solid riser fill under the flight
  P.add("paintedMetal", prism([[0, 0], [0, 0.01], [-n * sd, rise], [-n * sd, 0]], width - 0.1), 0, 0, 0, { rot: [0, -Math.PI / 2, 0], color: IMP.black, uv: "world", texel: 1 });
  if (stringers) {
    for (const s of [-1, 1]) {
      P.add("paintedMetal", prism([[0, 0], [0, 0.35], [-n * sd, rise + 0.35], [-n * sd, rise]], 0.08), s * (width / 2 + 0.04), 0, 0, { rot: [0, -Math.PI / 2, 0], color: IMP.plateDark, uv: "world", texel: 1 });
    }
  }
  if (rails) {
    const L = Math.hypot(n * sd, rise);
    const ang = Math.atan2(rise, n * sd);
    for (const s of [-1, 1]) {
      const x = s * (width / 2 + 0.1);
      P.cyl("metal", x, rise / 2 + 1.0, (-n * sd) / 2, 0.03, L, "y", { color: IMP.steel, segments: 10, rot: [Math.PI / 2 - ang, 0, 0] });
      for (let i = 0; i <= n; i += Math.max(1, Math.round(n / 3))) {
        P.box("paintedMetal", x, i * sh + 0.5, -i * sd - 0.05, 0.05, 1.0, 0.05, { color: IMP.gunmetal });
      }
    }
  }
  return { top: P.world(0, rise, -n * sd), length: n * sd, steps: n };
}

// ---------------------------------------------------------------------------------------------------
// Cargo and machinery
// ---------------------------------------------------------------------------------------------------
/** Imperial cargo crate (rectangular, corner castings, hazard band, stencil). size [w,h,d]. */
export function crate(kit, { pos, yaw = 0, size = [1.2, 1.0, 1.2], color = IMP.plateDark, band = true, decal = 11, collide = true }) {
  const [w, h, d] = size;
  const P = new Placer(kit, pos, yaw);
  P.box("plate", 0, h / 2, 0, w, h, d, { color, uv: "world", texel: 1 });
  P.box("paintedMetal", 0, 0.08, 0, w + 0.04, 0.16, d + 0.04, { color: IMP.black, texel: 1 });
  P.box("paintedMetal", 0, h - 0.08, 0, w + 0.04, 0.16, d + 0.04, { color: IMP.black, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box("metal", (sx * w) / 2, h / 2, (sz * d) / 2, 0.08, h - 0.2, 0.08, { color: IMP.steelDark });
  if (band) P.box("hazard", 0, h * 0.5, 0, w + 0.01, 0.08, d + 0.01, { texel: 3 });
  if (decal !== null) {
    P.decal(0, h * 0.7, d / 2 + 0.002, Math.min(w, h) * 0.45, Math.min(w, h) * 0.45, decal);
    P.decal(0, h * 0.7, -d / 2 - 0.002, Math.min(w, h) * 0.45, Math.min(w, h) * 0.45, decal, { rot: [0, Math.PI, 0] });
  }
  if (collide) P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "crate");
  return P;
}

/** Long Imperial cargo container (the hex-profiled shipping pods). pos = floor centre. */
export function cargoContainer(kit, { pos, yaw = 0, len = 4, w = 1.6, h = 1.7, color = IMP.plate, collide = true }) {
  const P = new Placer(kit, pos, yaw);
  const hex = prism(
    [
      [-w / 2, h * 0.2],
      [-w / 2 + w * 0.15, 0],
      [w / 2 - w * 0.15, 0],
      [w / 2, h * 0.2],
      [w / 2, h * 0.8],
      [w / 2 - w * 0.15, h],
      [-w / 2 + w * 0.15, h],
      [-w / 2, h * 0.8],
    ],
    len,
  );
  P.add("plate", hex, 0, 0, 0, { color, uv: "world", texel: 0.8 });
  for (const z of [-len / 2 + 0.2, len / 2 - 0.2, 0]) P.box("paintedMetal", 0, h / 2, z, w + 0.06, h + 0.04, 0.14, { color: IMP.black, texel: 1 });
  P.box("paintedMetal", 0, 0.05, 0, w * 0.6, 0.1, len - 0.4, { color: IMP.black });
  P.box("darkGloss", w / 2 + 0.01, h * 0.5, len * 0.25, 0.02, 0.3, 0.5);
  P.box("leds", w / 2 + 0.022, h * 0.5, len * 0.25, 0.004, 0.08, 0.4, { uv: "keep", uvRect: ledRect(3) });
  P.decal(w / 2 + 0.003, h * 0.55, -len * 0.2, 0.7, 0.7, 11, { rot: [0, Math.PI / 2, 0] });
  if (collide) P.collider([-w / 2, 0, -len / 2], [w / 2, h, len / 2], "container");
  return P;
}

/** Cylindrical canister / barrel. */
export function barrel(kit, { pos, r = 0.35, h = 0.9, color = IMP.plateDark, band = IMP.hazardYellow, collide = true }) {
  const P = new Placer(kit, pos, 0);
  P.cyl("plate", 0, h / 2, 0, r, h, "y", { color, segments: 16, uv: "world", texel: 1 });
  P.cyl("paintedMetal", 0, 0.05, 0, r + 0.02, 0.1, "y", { color: IMP.black, segments: 16 });
  P.cyl("paintedMetal", 0, h - 0.05, 0, r + 0.02, 0.1, "y", { color: IMP.black, segments: 16 });
  P.cyl("paintedMetal", 0, h * 0.5, 0, r + 0.01, 0.08, "y", { color: band, segments: 16 });
  if (collide) P.collider([-r, 0, -r], [r, h, r], "barrel");
  return P;
}

/** Pipe run through a list of world points (cylinders + sphere joints), optional clamps. */
export function pipeRun(kit, { points, r = 0.08, color = IMP.steelDark, clamps = 0, clampColor = IMP.black, mat = "metal" }) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const d = new THREE.Vector3().subVectors(b, a);
    const L = d.length();
    if (L < 1e-4) continue;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    kit.add(mat, new THREE.CylinderGeometry(r, r, L, 12), { pos: [mid.x, mid.y, mid.z], quat: q, color, uv: "scale", uvScale: [2 * Math.PI * r, L] });
    if (i > 0) kit.sphere(mat, a.x, a.y, a.z, r * 1.15, { color, segments: 10 });
    if (clamps > 0) {
      const n = Math.max(1, Math.floor(L / clamps));
      for (let k = 0; k < n; k++) {
        const p = a.clone().addScaledVector(d, (k + 0.5) / n);
        kit.add("paintedMetal", new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.08, 12), { pos: [p.x, p.y, p.z], quat: q, color: clampColor });
      }
    }
  }
}

/** Sagging cable bundle between two world points (segmented). */
export function cableBundle(kit, { from, to, sag = 0.4, n = 3, r = 0.02, color = IMP.black, segments = 8 }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const rand = rng(Math.floor(a.x * 7 + b.z * 13));
  for (let c = 0; c < n; c++) {
    const off = new THREE.Vector3((rand() - 0.5) * 0.1, (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.1);
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = a.clone().lerp(b, t).add(off);
      p.y -= sag * (1 - (2 * t - 1) ** 2) * (0.85 + rand() * 0.3);
      pts.push([p.x, p.y, p.z]);
    }
    pipeRun(kit, { points: pts, r: r * (0.8 + rand() * 0.5), color, mat: "rubber" });
  }
}

/**
 * Angular Imperial door frame around an opening (jambs, trapezoid lintel, hazard sill, status light).
 * pos = floor centre of the opening; local −Z is "through" the door; the frame spans depth `d` (the wall gap).
 */
export function doorFrame(kit, { pos, yaw = 0, w, h, d = 0.5, accent = "emitBlue", sill = true, wide = false }) {
  const P = new Placer(kit, pos, yaw);
  const j = wide ? 0.45 : 0.28;
  // jambs with chamfered inner faces
  for (const s of [-1, 1]) {
    P.box("paintedMetal", s * (w / 2 + j / 2), h / 2, 0, j, h, d + 0.3, { color: IMP.plateDark, texel: 1 });
    P.box("paintedMetal", s * (w / 2 + j + 0.04), h / 2, 0, 0.08, h + 0.3, d + 0.36, { color: IMP.black, texel: 1 });
    P.box("metal", s * (w / 2 + 0.01), h / 2, 0, 0.02, h, d + 0.34, { color: IMP.steelDark });
  }
  // lintel: trapezoid (wider at the top) — the Imperial doorway signature
  const lint = prism([[-w / 2 - j, h], [w / 2 + j, h], [w / 2 + j + 0.3, h + 0.5], [-w / 2 - j - 0.3, h + 0.5]], d + 0.3);
  P.add("paintedMetal", lint, 0, 0, 0, { color: IMP.plateDark, uv: "world", texel: 1 });
  P.box("paintedMetal", 0, h + 0.5 + 0.06, 0, w + 2 * j + 0.6, 0.12, d + 0.36, { color: IMP.black, texel: 1 });
  // status light + sign
  P.box("darkGloss", 0, h + 0.25, d / 2 + 0.16, 0.5, 0.16, 0.04);
  P.box(accent, 0, h + 0.25, d / 2 + 0.185, 0.36, 0.06, 0.01);
  P.box("darkGloss", 0, h + 0.25, -d / 2 - 0.16, 0.5, 0.16, 0.04);
  P.box(accent, 0, h + 0.25, -d / 2 - 0.185, 0.36, 0.06, 0.01);
  if (sill) P.box("hazard", 0, 0.004, 0, w, 0.008, d + 0.3, { texel: 3 });
  P.box("paintedMetal", 0, -0.06, 0, w + 2 * j, 0.12, d + 0.3, { color: IMP.black, texel: 1 });
  // tunnel lining through the wall gap
  P.box("paintedMetal", 0, h + 0.02, 0, w, 0.04, d + 0.3, { color: IMP.black, texel: 1 });
  P.collider([-w / 2 - j - 0.08, 0, -d / 2 - 0.18], [-w / 2, h + 0.6, d / 2 + 0.18], "jamb");
  P.collider([w / 2, 0, -d / 2 - 0.18], [w / 2 + j + 0.08, h + 0.6, d / 2 + 0.18], "jamb");
  return P;
}

/** Death Star style computer bank: black wall unit with rows of indicator lights and small screens. */
export function computerBank(kit, { pos, yaw = 0, w = 3, h = 2.4, d = 0.6, seed = 3, accent = "emitBlue" }) {
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, h / 2, -d / 2, w, h, d, { color: IMP.black, texel: 1 });
  P.box("plate", 0, h / 2, -d / 2, w + 0.06, h - 0.3, d - 0.1, { color: IMP.plateDark, uv: "keep" });
  const cols = Math.max(1, Math.floor(w / 0.75));
  const cw = w / cols;
  for (let c = 0; c < cols; c++) {
    const x = -w / 2 + cw * (c + 0.5);
    P.box("darkGloss", x, h / 2, 0.005, cw - 0.1, h - 0.5, 0.02);
    const rows = Math.floor((h - 0.7) / 0.32);
    for (let r = 0; r < rows; r++) {
      const y = 0.45 + r * 0.32;
      if (rand() < 0.75) P.box("leds", x, y, 0.017, cw - 0.22, 0.09, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
      else P.box("screen", x, y + 0.02, 0.017, cw - 0.24, 0.2, 0.005, { uv: "keep", uvRect: screenRect(Math.floor(rand() * 16)) });
    }
    P.box(rand() < 0.5 ? accent : "emitRed", x - cw / 2 + 0.12, h - 0.35, 0.02, 0.05, 0.05, 0.01);
  }
  P.box("paintedMetal", 0, 0.1, 0, w, 0.2, 0.1, { color: IMP.trim });
  P.collider([-w / 2, 0, -d], [w / 2, h, 0.04], "computer");
  return P;
}

/** Imperial-style cog emblem decal on a wall frame position (world quad facing +Z locally). */
export function emblem(kit, { pos, yaw = 0, size = 1.5, mat = "decal" }) {
  const P = new Placer(kit, pos, yaw);
  P.decal(0, 0, 0, size, size, DECAL.EMBLEM);
  return P;
}

/** Floor grate strip (cut-out texture quad) between min/max on the floor plane y. */
export function floorGrate(kit, min, max, y, { tile = [1.24, 0.9] } = {}) {
  const w = max[0] - min[0];
  const d = max[1] - min[1];
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(min[0] + max[0]) / 2, y, (min[1] + max[1]) / 2], uv: "scale", uvScale: [w / tile[0], d / tile[1]], color: 0xffffff });
}

/** Ceiling light fixture: housing + diffuser strip, plus an optional point light request. */
export function ceilingStrip(kit, { pos, len, w = 0.35, axis = "z", mat = "emitWhiteSoft", housing = IMP.black }) {
  const sx = axis === "x" ? len : w + 0.16;
  const sz = axis === "x" ? w + 0.16 : len;
  kit.box("paintedMetal", pos[0], pos[1] - 0.07, pos[2], sx, 0.14, sz, { color: housing, texel: 1 });
  kit.box(mat, pos[0], pos[1] - 0.14, pos[2], axis === "x" ? len - 0.2 : w, 0.01, axis === "x" ? w : len - 0.2, { uv: "keep" });
}

/** Wall-mounted control panel with LEDs and a screen, on a frame at (u, v). */
export function wallPanel(kit, frame, u, v, { w = 0.9, h = 0.6, screen = true, accent = "emitBlue", seed = 5 }) {
  const rand = rng(seed);
  frame.box("paintedMetal", u, v, 0.03, w + 0.08, h + 0.08, 0.06, { color: IMP.black, texel: 1 });
  frame.box("darkGloss", u, v, 0.062, w, h, 0.01);
  frame.box("leds", u, v - h * 0.3, 0.07, w - 0.12, 0.08, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
  if (screen) frame.box("screen", u, v + h * 0.15, 0.07, w - 0.16, h * 0.42, 0.005, { uv: "keep", uvRect: screenRect(Math.floor(rand() * 16)) });
  frame.box(accent, u + w / 2 - 0.08, v + h / 2 - 0.08, 0.07, 0.05, 0.05, 0.005);
}

/** Stormtrooper-style locker row along a wall frame: n lockers of width lw starting at u0. */
export function lockerRow(kit, frame, u0, n, { lw = 0.6, h = 2.0, d = 0.5, color = IMP.plateDark } = {}) {
  for (let i = 0; i < n; i++) {
    const u = u0 + lw * (i + 0.5);
    frame.box("plate", u, h / 2, d / 2, lw - 0.04, h, d, { color, uv: "keep" });
    frame.box("paintedMetal", u, h / 2, d + 0.005, lw - 0.1, h - 0.1, 0.01, { color: IMP.black });
    frame.box("metal", u + lw * 0.3, h * 0.55, d + 0.03, 0.03, 0.14, 0.04, { color: IMP.steel });
    for (let k = 0; k < 4; k++) frame.box("metal", u, h * 0.85 - k * 0.06, d + 0.012, lw * 0.5, 0.012, 0.02, { color: IMP.steelDark });
    frame.decal(u, h * 0.3, d + 0.012, 0.22, 0.22, DECAL.NUMBER0 + (i % 4));
  }
  frame.collider(u0, u0 + n * lw, 0, h, 0, d + 0.05, "lockers");
}

/** Bunk (frame + mattress + pillow); pos = floor centre; length along local Z. */
export function bunk(kit, { pos, yaw = 0, level = 0.5, len = 2.0, w = 0.9, fabric = IMP.fabricGrey, collide = true }) {
  const P = new Placer(kit, pos, yaw);
  P.box("paintedMetal", 0, level - 0.08, 0, w, 0.16, len, { color: IMP.black, texel: 1 });
  P.box("plate", 0, level - 0.3, 0, w - 0.1, 0.3, len - 0.1, { color: IMP.plateDark, uv: "world", texel: 1 });
  P.box("fabric", 0, level + 0.07, 0, w - 0.08, 0.14, len - 0.08, { color: fabric, uv: "world", texel: 2 });
  P.box("fabric", 0, level + 0.17, len / 2 - 0.3, w * 0.55, 0.1, 0.4, { color: IMP.plateLight, uv: "world", texel: 2 });
  P.box("paintedMetal", -w / 2 + 0.03, level + 0.05, 0, 0.04, 0.12, len, { color: IMP.steelDark });
  if (collide) P.collider([-w / 2, 0, -len / 2], [w / 2, level + 0.2, len / 2], "bunk");
  return P;
}

export { DECAL, decalRect, ledRect, screenRect };
