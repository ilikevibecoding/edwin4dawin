// Shared vocabulary for the hangar complex (workstream HANGAR): industrial 40 m walls with structural
// ribs, instanced railings, grated catwalks, switchback stair towers, floodlights, blinking beacon
// groups and deck machinery (bowsers, hose reels, tool carts, scissor lifts, cranes, crate stacks,
// magnetic floor sockets). Everything is room-local and goes through the Kit (merged per material or
// instanced), so a whole hangar stays within a few dozen draw calls.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE, setDomain } from "../materials.js";
import { rng, rectUVs } from "../kit.js";
import { UP, impWallGear, impWallLight, impConsole } from "./imperial_kit.js";
import { impDecalRect, IMP_DECAL } from "../textures_imperial.js";
import { HG_DECAL, hgDecalRect, ensureHangarMaterials } from "../textures_hangar.js";

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Register the hangar materials on this kit's library and mark the non-casting keys. */
export function hgSetup(kit) {
  ensureHangarMaterials(kit.materials);
  for (const k of ["glowDisc", "hangar_glowBlue", "hangar_amberDim", "hangar_ceilWarm", "hangar_spillWarm", "decalImp", "hangar_decal", "viewGlass", "holo", "holoBright", "field"]) kit.noShadowKeys.add(k);
}

// ---------------------------------------------------------------------------
// Instancing helpers
// ---------------------------------------------------------------------------
/** Push one instance: key, material, geometry factory, position, optional quaternion / colour / scale. */
export function inst(kit, key, mat, geoFactory, pos, quat = null, color = 0xffffff, scale = null) {
  _p.set(pos[0], pos[1], pos[2]);
  if (scale) _s.set(scale[0], scale[1], scale[2]);
  else _s.set(1, 1, 1);
  _m.compose(_p, quat || _q.identity(), _s);
  kit.instance(key, mat, geoFactory, _m, color);
}
/** Quaternion whose local +Z points along `dir` (roll kept level). */
export function quatLookZ(dir) {
  const d = dir.clone().normalize();
  if (Math.abs(d.y) > 0.999) d.x += 0.001;
  _m.lookAt(d, ZERO, UP);
  return new THREE.Quaternion().setFromRotationMatrix(_m);
}
export function yawQuat(yaw) {
  return new THREE.Quaternion().setFromAxisAngle(UP, yaw);
}

// ---------------------------------------------------------------------------
// Placer: build a prop in its own frame (origin + yaw), room-local output
// ---------------------------------------------------------------------------
export class Placer {
  constructor(kit, x, y, z, yaw = 0) {
    this.kit = kit;
    this.o = new THREE.Vector3(x, y, z);
    this.q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  }
  p(lx, ly, lz) {
    return new THREE.Vector3(lx, ly, lz).applyQuaternion(this.q).add(this.o);
  }
  rot(extra) {
    let q = this.q;
    if (extra.tilt) q = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, extra.tilt));
    if (extra.roll) q = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, extra.roll));
    if (extra.spin) q = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, extra.spin));
    return q;
  }
  box(mat, lx, ly, lz, sx, sy, sz, extra = {}) {
    const p = this.p(lx, ly, lz);
    const { tilt, roll, spin, ...rest } = extra;
    return this.kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: this.rot(extra), ...rest });
  }
  cyl(mat, lx, ly, lz, r, len, axis = "y", extra = {}) {
    const g = new THREE.CylinderGeometry(extra.r2 !== undefined ? extra.r2 : r, r, len, extra.segments || 12, 1, !!extra.open);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else if (axis === "z") g.rotateX(Math.PI / 2);
    const p = this.p(lx, ly, lz);
    const { r2, segments, open, tilt, roll, spin, ...rest } = extra;
    return this.kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: this.rot(extra), uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  add(mat, geo, lx, ly, lz, extra = {}) {
    const p = this.p(lx, ly, lz);
    const { tilt, roll, spin, ...rest } = extra;
    return this.kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: this.rot(extra), ...rest });
  }
  /** Plane w×h facing local +Z (before yaw); `face` = "+z" | "-z" | "+x" | "-x" | "up". */
  plane(mat, lx, ly, lz, w, h, face = "+z", extra = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (face === "-z") g.rotateY(Math.PI);
    else if (face === "+x") g.rotateY(Math.PI / 2);
    else if (face === "-x") g.rotateY(-Math.PI / 2);
    else if (face === "up") g.rotateX(-Math.PI / 2);
    return this.add(mat, g, lx, ly, lz, { uv: "keep", ...extra });
  }
  decal(index, lx, ly, lz, size, face = "+z", h = null) {
    return this.plane("decalImp", lx, ly, lz, size, h || size, face, { uvRect: impDecalRect(index) });
  }
  hgDecal(index, lx, ly, lz, size, face = "+z", h = null, color = 0xffffff) {
    return this.plane("hangar_decal", lx, ly, lz, size, h || size, face, { uvRect: hgDecalRect(index), color });
  }
  collider(lx0, ly0, lz0, lx1, ly1, lz1, tag = "prop", extra = null) {
    const cs = [this.p(lx0, ly0, lz0), this.p(lx1, ly0, lz0), this.p(lx0, ly0, lz1), this.p(lx1, ly0, lz1)];
    const min = new THREE.Vector3(Infinity, this.o.y + ly0, Infinity);
    const max = new THREE.Vector3(-Infinity, this.o.y + ly1, -Infinity);
    for (const c of cs) {
      min.x = Math.min(min.x, c.x);
      min.z = Math.min(min.z, c.z);
      max.x = Math.max(max.x, c.x);
      max.z = Math.max(max.z, c.z);
    }
    this.kit.collider([min.x, min.y, min.z], [max.x, max.y, max.z], tag);
    if (extra) Object.assign(this.kit.colliders[this.kit.colliders.length - 1], extra);
  }
}

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------
/** Box whose long (Z) axis runs from `a` to `b` (Vector3), cross-section w × h. */
export function tiltedBox(kit, mat, a, b, w, h, extra = {}) {
  const d = b.clone().sub(a);
  const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, d.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return kit.add(mat, new THREE.BoxGeometry(w, h, L), { pos: [mid.x, mid.y, mid.z], quat: q, ...extra });
}
/** Cylinder from `a` to `b`. */
export function tube(kit, mat, a, b, r, extra = {}) {
  const d = b.clone().sub(a);
  const L = d.length();
  const g = new THREE.CylinderGeometry(extra.r2 !== undefined ? extra.r2 : r, r, L, extra.segments || 10, 1, !!extra.open);
  g.rotateX(Math.PI / 2);
  const q = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, d.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const { r2, segments, open, ...rest } = extra;
  return kit.add(mat, g, { pos: [mid.x, mid.y, mid.z], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, L], ...rest });
}
/** Sagging hose / cable: quadratic curve a -> b drooping by `sag`, as `n` short tubes. */
export function hose(kit, mat, a, b, sag, r, n = 6, extra = {}) {
  const c = a.clone().add(b).multiplyScalar(0.5);
  c.y -= sag;
  let prev = a.clone();
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().copy(a).multiplyScalar((1 - t) * (1 - t)).addScaledVector(c, 2 * (1 - t) * t).addScaledVector(b, t * t);
    tube(kit, mat, prev, p, r, { segments: 8, ...extra });
    prev = p;
  }
}
/** Flat decal on a horizontal surface (deck), yaw about Y. */
export function deckDecal(kit, index, x, z, size, yaw = 0, y = 0.006, opts = {}) {
  const g = new THREE.PlaneGeometry(size, opts.h || size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  return kit.add("hangar_decal", g, { pos: [x, y, z], uv: "keep", uvRect: hgDecalRect(index), color: opts.color || 0xffffff });
}
export function deckDecalImp(kit, index, x, z, size, yaw = 0, y = 0.006) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  return kit.add("decalImp", g, { pos: [x, y, z], uv: "keep", uvRect: impDecalRect(index) });
}
/** Decal on a wall frame from the hangar atlas. */
export function frameHgDecal(frame, index, cu, cv, cn, size, h = null) {
  const g = new THREE.PlaneGeometry(size, h || size);
  return frame.add("hangar_decal", g, cu, cv, cn, { uv: "keep", uvRect: hgDecalRect(index) });
}
/** Dashed line on the deck between two points (thin boxes). */
export function dashedLine(kit, from, to, opts = {}) {
  const { dash = 2.4, gap = 2.4, w = 0.22, mat = "painted", color = PALETTE.yellow, y = 0.008 } = opts;
  const a = new THREE.Vector3(from[0], y, from[1]);
  const b = new THREE.Vector3(to[0], y, to[1]);
  const d = b.clone().sub(a);
  const L = d.length();
  d.normalize();
  const yaw = Math.atan2(d.x, d.z);
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  for (let s = 0; s + dash * 0.5 < L; s += dash + gap) {
    const len = Math.min(dash, L - s);
    const p = a.clone().addScaledVector(d, s + len / 2);
    kit.add(mat, new THREE.BoxGeometry(w, 0.012, len), { pos: [p.x, p.y, p.z], quat: q, color, uv: "keep" });
  }
}
/** Solid painted line on the deck. */
export function deckLine(kit, from, to, w = 0.25, color = PALETTE.yellow, y = 0.008, mat = "painted") {
  const a = new THREE.Vector3(from[0], y, from[1]);
  const b = new THREE.Vector3(to[0], y, to[1]);
  tiltedBox(kit, mat, a, b, w, 0.012, { color, uv: "keep" });
}

// ---------------------------------------------------------------------------
// Railing with instanced posts (posts tagged by height so the geometry factory is stable)
// ---------------------------------------------------------------------------
export function hgRailing(kit, from, to, y, opts = {}) {
  const { h = 1.1, postStep = 2.0, color = PALETTE.impGreyDark, postColor = PALETTE.impBlack, kick = true, collide = true, tag = "rail", light = null, midRail = true, walkable = false } = opts;
  const a = new THREE.Vector3(from[0], y, from[1]);
  const b = new THREE.Vector3(to[0], y, to[1]);
  const dir = b.clone().sub(a);
  const L = dir.length();
  if (L < 0.2) return;
  dir.normalize();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const yaw = Math.atan2(dir.x, dir.z);
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const rail = (yy, r) => kit.add("impMetal", new THREE.CylinderGeometry(r, r, L, 8).rotateX(Math.PI / 2), { pos: [mid.x, yy, mid.z], quat: q, color, uv: "scale", uvScale: [0.3, L] });
  rail(y + h, 0.035);
  if (midRail) rail(y + h * 0.55, 0.022);
  if (kick) kit.add("impTrim", new THREE.BoxGeometry(0.04, 0.14, L), { pos: [mid.x, y + 0.08, mid.z], quat: q, color: postColor, texel: 1 });
  if (light) kit.add(light, new THREE.BoxGeometry(0.03, 0.03, Math.max(0.2, L - 0.3)), { pos: [mid.x, y + h - 0.07, mid.z], quat: q });
  const n = Math.max(2, Math.round(L / postStep) + 1);
  const key = `hg_post_${h.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p = a.clone().addScaledVector(dir, (L * i) / (n - 1));
    inst(kit, key, "impTrim", () => new THREE.BoxGeometry(0.07, h, 0.07).translate(0, h / 2, 0), [p.x, y, p.z], q, postColor);
  }
  if (collide) {
    const min = new THREE.Vector3(Math.min(a.x, b.x) - 0.1, y, Math.min(a.z, b.z) - 0.1);
    const max = new THREE.Vector3(Math.max(a.x, b.x) + 0.1, y + h, Math.max(a.z, b.z) + 0.1);
    kit.collider([min.x, min.y, min.z], [max.x, max.y, max.z], tag);
    // a knee-high barrier the player may step over (the collider is ignored when its top is within STEP_UP)
    if (walkable) kit.colliders[kit.colliders.length - 1].walkable = true;
  }
}
/** Railing along an axis-aligned segment with gaps: axis "x" => from [x0..x1] at z; gaps = [[a,b],...] in axis coords. */
export function hgRailingGaps(kit, axis, fixed, a0, a1, y, gaps = [], opts = {}) {
  const spans = cutSpans([[Math.min(a0, a1), Math.max(a0, a1)]], gaps);
  for (const [s0, s1] of spans) {
    if (s1 - s0 < 0.3) continue;
    if (axis === "x") hgRailing(kit, [s0, fixed], [s1, fixed], y, opts);
    else hgRailing(kit, [fixed, s0], [fixed, s1], y, opts);
  }
}
/** Sloped railing along a stair flight from a (x,y,z) to b, posts vertical on the slope. */
export function hgRailingSloped(kit, a, b, h = 1.0, opts = {}) {
  const { color = PALETTE.impGreyDark, postColor = PALETTE.impBlack, collide = true } = opts;
  const up = new THREE.Vector3(0, h, 0);
  tube(kit, "impMetal", a.clone().add(up), b.clone().add(up), 0.035, { color, segments: 8 });
  tube(kit, "impMetal", a.clone().addScaledVector(up, 0.55), b.clone().addScaledVector(up, 0.55), 0.022, { color, segments: 8 });
  const n = Math.max(2, Math.round(a.distanceTo(b) / 2.2) + 1);
  const key = `hg_post_${h.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, i / (n - 1));
    inst(kit, key, "impTrim", () => new THREE.BoxGeometry(0.07, h, 0.07).translate(0, h / 2, 0), [p.x, p.y, p.z], null, postColor);
  }
  if (collide) kit.collider([Math.min(a.x, b.x) - 0.1, Math.min(a.y, b.y), Math.min(a.z, b.z) - 0.1], [Math.max(a.x, b.x) + 0.1, Math.max(a.y, b.y) + h, Math.max(a.z, b.z) + 0.1], "rail");
}

/** Subtract intervals from spans. */
export function cutSpans(spans, cuts) {
  let out = spans.map((s) => [s[0], s[1]]);
  for (const [c0, c1] of cuts) {
    const next = [];
    for (const [a, b] of out) {
      if (c1 <= a || c0 >= b) next.push([a, b]);
      else {
        if (c0 > a) next.push([a, c0]);
        if (c1 < b) next.push([c1, b]);
      }
    }
    out = next;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Catwalk: grated deck, kick plates, edge beams, railings, hangers / legs, floor + collider
// ---------------------------------------------------------------------------
export function hgCatwalk(kit, x0, z0, x1, z1, y, opts = {}) {
  const { rails = { N: true, S: true, E: true, W: true }, gaps = {}, hangers = null, legs = null, tag = "catwalk", railH = 1.1, floor = true, light = null } = opts;
  const t = 0.1;
  // deck grate (double-sided cut-out) over a thin dark slab so it never reads as a hole
  kit.boxMM("impMetalRough", [x0, y - t, z0], [x1, y - 0.02, z1], { color: PALETTE.impCharcoal, texel: 0.5 });
  kit.boxMM("hangar_grate", [x0 + 0.02, y - 0.02, z0 + 0.02], [x1 - 0.02, y, z1 - 0.02], { texel: 1, color: 0xffffff });
  // edge beams (C-channel look) under the deck
  const b = 0.32;
  kit.boxMM("impTrim", [x0, y - b - t, z0], [x0 + 0.12, y - t + 0.02, z1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impTrim", [x1 - 0.12, y - b - t, z0], [x1, y - t + 0.02, z1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impTrim", [x0, y - b - t, z0], [x1, y - t + 0.02, z0 + 0.12], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impTrim", [x0, y - b - t, z1 - 0.12], [x1, y - t + 0.02, z1], { color: PALETTE.impBlack, texel: 1 });
  // hazard edge stripe on the outside of the beams
  for (const [a, c, d, e] of [[x0 - 0.01, z0, x0 + 0.01, z1], [x1 - 0.01, z0, x1 + 0.01, z1]]) kit.boxMM("chevronY", [a, y - b - t + 0.04, c], [d, y - t - 0.04, e], { texel: 1.5 });
  if (rails.W) hgRailingGaps(kit, "z", x0 + 0.06, z0, z1, y, gaps.W || [], { h: railH, light });
  if (rails.E) hgRailingGaps(kit, "z", x1 - 0.06, z0, z1, y, gaps.E || [], { h: railH, light });
  if (rails.N) hgRailingGaps(kit, "x", z0 + 0.06, x0, x1, y, gaps.N || [], { h: railH });
  if (rails.S) hgRailingGaps(kit, "x", z1 - 0.06, x0, x1, y, gaps.S || [], { h: railH });
  if (floor) kit.floor(x0, z0, x1, z1, y, tag);
  kit.collider([x0, y - b - t, z0], [x1, y - 0.02, z1], tag + "-slab");
  kit.colliders[kit.colliders.length - 1].walkable = true;
  if (hangers) {
    // rods from the ceiling to the outer beams, with a yoke under the deck; `at` overrides the pitch
    const { yTop, step = 12.5, start = z0 + 2, end = z1 - 2, axis = "z", at = null } = hangers;
    const stations = at || [];
    if (!at) for (let s = start; s <= end + 1e-6; s += step) stations.push(s);
    for (const s of stations) {
      const pts = axis === "z" ? [[x0 + 0.35, s], [x1 - 0.35, s]] : [[s, z0 + 0.35], [s, z1 - 0.35]];
      for (const [px, pz] of pts) kit.cyl("impMetal", px, (y - b - t + yTop) / 2, pz, 0.09, yTop - (y - b - t), "y", { color: PALETTE.impGreyDark, segments: 8 });
      if (axis === "z") kit.boxMM("impTrim", [x0, y - b - t - 0.2, s - 0.15], [x1, y - b - t + 0.02, s + 0.15], { color: PALETTE.impBlack });
      else kit.boxMM("impTrim", [s - 0.15, y - b - t - 0.2, z0], [s + 0.15, y - b - t + 0.02, z1], { color: PALETTE.impBlack });
    }
  }
  if (legs) {
    const { yBase = 0, step = 6, axis = "z" } = legs;
    const n = Math.max(2, Math.round((axis === "z" ? z1 - z0 : x1 - x0) / step) + 1);
    for (let i = 0; i < n; i++) {
      const s = axis === "z" ? z0 + 0.3 + ((z1 - z0 - 0.6) * i) / (n - 1) : x0 + 0.3 + ((x1 - x0 - 0.6) * i) / (n - 1);
      const pts = axis === "z" ? [[x0 + 0.2, s], [x1 - 0.2, s]] : [[s, z0 + 0.2], [s, z1 - 0.2]];
      for (const [px, pz] of pts) {
        kit.box("impTrim", px, (yBase + y - t) / 2, pz, 0.3, y - t - yBase, 0.3, { color: PALETTE.impBlack, texel: 1 });
        kit.collider([px - 0.15, yBase, pz - 0.15], [px + 0.15, y, pz + 0.15], "leg");
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Switchback stair tower: two lanes along z separated by a spine, landings at both ends.
// `rises` = height of each flight; flights alternate lanes; the first flight leaves the aft (z1)
// landing in lane A (inner) toward -z. Returns landing rectangles per level.
// ---------------------------------------------------------------------------
export function hgStairTower(kit, opts) {
  const { x0, x1, z0, z1, rises, wallSide = "W", landingD = 1.7, tag = "tower", accentKey = "emitAmber", openFaces = {} } = opts;
  // openFaces: { [level]: "end" | "inner" | "both" } — landing faces left without a railing (exits to catwalks)
  const spine = 0.3;
  const laneW = (x1 - x0 - spine) / 2;
  // lane A = the lane away from the wall (inner), lane B = against the wall
  const laneA = wallSide === "W" ? [x1 - laneW, x1] : [x0, x0 + laneW];
  const laneB = wallSide === "W" ? [x0, x0 + laneW] : [x1 - laneW, x1];
  const spineX = wallSide === "W" ? [x0 + laneW, x0 + laneW + spine] : [x1 - laneW - spine, x1 - laneW];
  const zFwd = [z0, z0 + landingD];
  const zAft = [z1 - landingD, z1];
  const runZ0 = z0 + landingD;
  const runZ1 = z1 - landingD;
  const run = runZ1 - runZ0;
  const H = rises.reduce((a, b) => a + b, 0);
  const landings = [];
  const treadMat = "impMetalRough";
  const treadCol = PALETTE.impGreyDark;
  // landing slab helper
  const landing = (zr, y, level) => {
    if (y > 0.01) {
      kit.boxMM("impMetalRough", [x0, y - 0.12, zr[0]], [x1, y - 0.02, zr[1]], { color: PALETTE.impCharcoal, texel: 0.5 });
      kit.boxMM("hangar_grate", [x0 + 0.02, y - 0.02, zr[0] + 0.02], [x1 - 0.02, y, zr[1] - 0.02], { texel: 1 });
      kit.boxMM("impTrim", [x0, y - 0.4, zr[0]], [x1, y - 0.1, zr[0] + 0.1], { color: PALETTE.impBlack });
      kit.boxMM("impTrim", [x0, y - 0.4, zr[1] - 0.1], [x1, y - 0.1, zr[1]], { color: PALETTE.impBlack });
      kit.floor(x0, zr[0], x1, zr[1], y, tag + "-landing");
      kit.collider([x0, y - 0.4, zr[0]], [x1, y - 0.02, zr[1]], tag + "-slab");
      kit.colliders[kit.colliders.length - 1].walkable = true; // a climber arriving from below steps onto it, not into it
    }
    landings.push({ level, y, x0, x1, z0: zr[0], z1: zr[1], end: zr === zAft ? "aft" : "fwd" });
  };
  landing(zAft, 0, 0);
  let y = 0;
  for (let i = 0; i < rises.length; i++) {
    const rise = rises[i];
    const lane = i % 2 === 0 ? laneA : laneB;
    const dirFwd = i % 2 === 0; // even flights climb toward -z
    const from = dirFwd ? runZ1 : runZ0;
    const to = dirFwd ? runZ0 : runZ1;
    const n = Math.max(3, Math.round(rise / 0.18));
    kit.stairs(lane[0] + 0.05, Math.min(from, to), lane[1] - 0.05, Math.max(from, to), "z", from, to, y, y + rise, n);
    const stepRun = run / n;
    const stepRise = rise / n;
    for (let k = 0; k < n; k++) {
      const za = from + (to - from) * (k / n);
      const zb = from + (to - from) * ((k + 1) / n);
      const yt = y + stepRise * (k + 1);
      kit.boxMM(treadMat, [lane[0] + 0.08, yt - 0.05, Math.min(za, zb) - 0.02], [lane[1] - 0.08, yt, Math.max(za, zb) + 0.02], { color: treadCol, texel: 2 });
      // nosing strip
      kit.boxMM("chevronY", [lane[0] + 0.1, yt + 0.001, dirFwd ? zb - 0.02 : za - 0.02], [lane[1] - 0.1, yt + 0.008, dirFwd ? zb + 0.06 : za + 0.06], { texel: 3 });
    }
    // stringers (both sides of the lane)
    const a = new THREE.Vector3(0, y - 0.15, from);
    const b = new THREE.Vector3(0, y + rise - 0.15, to);
    for (const sx of [lane[0] + 0.04, lane[1] - 0.04]) {
      a.x = sx;
      b.x = sx;
      tiltedBox(kit, "impTrim", a, b, 0.08, 0.34, { color: PALETTE.impBlack, texel: 1 });
    }
    // railing on the open side of the lane (the side not against the spine)
    const openX = lane === laneA ? (wallSide === "W" ? lane[1] - 0.06 : lane[0] + 0.06) : wallSide === "W" ? lane[0] + 0.06 : lane[1] - 0.06;
    const ra = new THREE.Vector3(openX, y, from);
    const rb = new THREE.Vector3(openX, y + rise, to);
    hgRailingSloped(kit, ra, rb, 1.0);
    // riser lights every few steps on the spine side
    const lightX = lane === laneA ? spineX[wallSide === "W" ? 1 : 0] : spineX[wallSide === "W" ? 0 : 1];
    for (let k = 2; k < n; k += 6) {
      const zz = from + (to - from) * ((k + 0.5) / n);
      kit.box(accentKey, lightX, y + stepRise * (k + 1) + 0.25, zz, 0.03, 0.06, 0.4);
    }
    y += rise;
    landing(dirFwd ? zFwd : zAft, y, i + 1);
    void stepRun;
  }
  // spine wall between the lanes (full height), tower columns, top cap
  kit.boxMM("impTrim", [spineX[0], 0, runZ0 - 0.1], [spineX[1], H + 1.2, runZ1 + 0.1], { color: PALETTE.impBlack, texel: 0.5 });
  kit.collider([spineX[0] - 0.02, 0, runZ0 - 0.1], [spineX[1] + 0.02, H + 1.2, runZ1 + 0.1], tag + "-spine");
  for (const [cx, cz] of [[x0 + 0.2, z0 + 0.2], [x1 - 0.2, z0 + 0.2], [x0 + 0.2, z1 - 0.2], [x1 - 0.2, z1 - 0.2], [x0 + 0.2, runZ0], [x1 - 0.2, runZ0], [x0 + 0.2, runZ1], [x1 - 0.2, runZ1]]) {
    kit.box("impTrim", cx, (H + 1.2) / 2, cz, 0.4, H + 1.2, 0.4, { color: PALETTE.impBlack, texel: 1 });
    kit.collider([cx - 0.2, 0, cz - 0.2], [cx + 0.2, H + 1.2, cz + 0.2], tag + "-col");
  }
  // horizontal ties at each landing level on the outer faces
  for (const l of landings) {
    if (l.y < 0.1) continue;
    kit.boxMM("impMetal", [x0 - 0.05, l.y - 0.5, z0], [x1 + 0.05, l.y - 0.32, z0 + 0.12], { color: PALETTE.impGreyDark });
    kit.boxMM("impMetal", [x0 - 0.05, l.y - 0.5, z1 - 0.12], [x1 + 0.05, l.y - 0.32, z1], { color: PALETTE.impGreyDark });
  }
  // equipment locker under the first forward landing (blocks the under-stair void)
  const h0 = rises[0];
  kit.boxMM("impPanel1", [x0 + 0.1, 0, z0 + 0.1], [x1 - 0.1, h0 - 0.45, z0 + landingD - 0.05], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  kit.boxMM("impTrim", [x0 + 0.1, 0, z0 + 0.1], [x1 - 0.1, 0.35, z0 + landingD - 0.05], { color: PALETTE.impBlack });
  kit.collider([x0, 0, z0], [x1, h0 - 0.4, z0 + landingD], tag + "-locker");
  const lockerFrame = { u: (x0 + x1) / 2 };
  kit.add("decalImp", new THREE.PlaneGeometry(1.0, 1.0), { pos: [lockerFrame.u, 1.6, z0 + landingD - 0.03], uv: "keep", uvRect: impDecalRect(IMP_DECAL.power) });
  // landing railings: end face, inner face and wall face of every raised landing, except the faces
  // declared open (catwalk exits); the entry (level 0, aft) stays open
  const innerX = wallSide === "W" ? x1 - 0.06 : x0 + 0.06;
  const wallX = wallSide === "W" ? x0 + 0.06 : x1 - 0.06;
  for (const l of landings) {
    if (l.y < 0.1) continue;
    const open = openFaces[l.level] || "";
    const zEdge = l.end === "aft" ? l.z1 - 0.06 : l.z0 + 0.06;
    if (open !== "end" && open !== "both") hgRailing(kit, [x0, zEdge], [x1, zEdge], l.y, { h: 1.1 });
    if (open !== "inner" && open !== "both") hgRailing(kit, [innerX, l.z0], [innerX, l.z1], l.y, { h: 1.1, postStep: 1.7 });
    hgRailing(kit, [wallX, l.z0], [wallX, l.z1], l.y, { h: 1.1, postStep: 1.7 });
    // level marker on the spine end
    kit.box(accentKey, (x0 + x1) / 2, l.y + 1.6, l.end === "aft" ? l.z1 - 0.02 : l.z0 + 0.02, 0.5, 0.08, 0.03);
  }
  return { landings, H, laneA, laneB, spineX, x0, x1, z0, z1, innerX };
}

// ---------------------------------------------------------------------------
// Floodlight (instanced housing + lamp face). `dir` = beam direction (room-local).
// ---------------------------------------------------------------------------
export function hgFloodlight(kit, pos, dir, opts = {}) {
  const { lamp = "emitWhite", size = 1 } = opts;
  const q = quatLookZ(dir);
  const sc = [size, size, size];
  inst(kit, "hg_flood_house", "impTrim", () => new THREE.BoxGeometry(1.1, 0.5, 0.8), pos, q, PALETTE.impBlack, sc);
  inst(kit, "hg_flood_rim", "impMetal", () => new THREE.BoxGeometry(1.2, 0.6, 0.12).translate(0, 0, 0.36), pos, q, PALETTE.impCharcoal, sc);
  inst(kit, "hg_flood_lamp_" + lamp, lamp, () => new THREE.BoxGeometry(0.96, 0.36, 0.04).translate(0, 0, 0.41), pos, q, 0xffffff, sc);
}
/** Yoke-mounted floodlight bank: bracket + n lamps tilted toward `aim` (a point). */
export function hgFloodBank(kit, pos, aim, n = 3, opts = {}) {
  const { spread = 1.3, along = new THREE.Vector3(1, 0, 0) } = opts;
  const p = new THREE.Vector3(...pos);
  kit.box("impTrim", p.x, p.y + 0.35, p.z, along.x ? spread * (n - 1) + 0.6 : 0.3, 0.3, along.z ? spread * (n - 1) + 0.6 : 0.3, { color: PALETTE.impBlack });
  for (let i = 0; i < n; i++) {
    const o = along.clone().multiplyScalar((i - (n - 1) / 2) * spread);
    const lp = p.clone().add(o);
    const dir = new THREE.Vector3(...aim).sub(lp);
    hgFloodlight(kit, [lp.x, lp.y, lp.z], dir, opts);
  }
}

// ---------------------------------------------------------------------------
// Blinking beacon group: one merged mesh with its own emissive material, animated per frame
// ---------------------------------------------------------------------------
export function hgBeacons(kit, materials, key, boxes, opts = {}) {
  const { period = 1.4, phase = 0, min = 0.12, max = 3.4, duty = 0.45, soft = false } = opts;
  if (!boxes.length) return null;
  const geos = boxes.map(([x, y, z, sx, sy, sz]) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
  const geo = mergeGeometries(geos, false);
  const mat = materials[key].clone();
  setDomain(mat, "interior");
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "hg_beacons_" + key;
  mesh.castShadow = false;
  kit.attach(mesh);
  const w = 2 * Math.PI;
  kit.onUpdate((dt, t) => {
    if (soft) {
      const s = 0.5 + 0.5 * Math.sin(w * (t / period + phase));
      mat.emissiveIntensity = min + (max - min) * s * s;
    } else {
      const f = (t / period + phase) % 1;
      mat.emissiveIntensity = f < duty ? max : min;
    }
  });
  return mesh;
}

// ---------------------------------------------------------------------------
// Deck machinery
// ---------------------------------------------------------------------------
export function hgFuelBowser(kit, x, z, yaw, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  const seed = opts.seed || 1;
  P.box("impTrim", 0, 0.55, 0, 1.8, 0.24, 4.2, { color: PALETTE.impBlack, texel: 1 });
  P.cyl("impMetal", 0, 1.5, -0.1, 0.85, 3.3, "z", { color: PALETTE.impGreyDark, segments: 18, texel: 0.5 });
  P.cyl("impMetal", 0, 1.5, 1.65, 0.62, 0.3, "z", { color: PALETTE.impGrey, segments: 18, r2: 0.62 });
  P.cyl("impMetal", 0, 1.5, -1.85, 0.62, 0.3, "z", { color: PALETTE.impGrey, segments: 18 });
  P.cyl("chevronY", 0, 1.5, 0.6, 0.87, 0.42, "z", { segments: 18, texel: 1 });
  for (const zz of [-1.15, 1.05]) P.box("impTrim", 0, 0.85, zz, 1.9, 0.5, 0.3, { color: PALETTE.impBlack });
  for (const [sx, sz] of [[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.3], [0.95, 1.3]]) {
    P.cyl("rubber", sx, 0.38, sz, 0.38, 0.3, "x", { color: PALETTE.impCharcoal, segments: 14 });
    P.cyl("impMetal", sx, 0.38, sz, 0.16, 0.34, "x", { color: PALETTE.impGrey, segments: 10 });
  }
  // pump cabinet at the rear
  P.box("impTrim", 0, 1.1, 2.35, 1.3, 1.15, 0.6, { color: PALETTE.impBlack, texel: 1 });
  P.box("impMetal", 0, 1.1, 2.66, 1.1, 0.95, 0.02, { color: PALETTE.impCharcoal });
  P.plane("scrAmber0", -0.25, 1.25, 2.68, 0.5, 0.3);
  for (let k = 0; k < 3; k++) P.box(k === 1 ? "emitRedImp" : "emitAmber", 0.3 + k * 0.14, 1.4, 2.68, 0.08, 0.08, 0.01);
  P.cyl("impMetal", 0.35, 0.85, 2.68, 0.12, 0.06, "z", { color: PALETTE.impGrey, segments: 10 });
  P.box("emitRedImp", 0.35, 0.85, 2.72, 0.05, 0.16, 0.02);
  // hose to a nozzle on the deck
  hose(kit, "rubber", P.p(0.5, 1.4, 2.66), P.p(1.4, 0.15, 3.4), 0.2, 0.06, 6, { color: PALETTE.impCharcoal });
  P.box("impMetal", 1.4, 0.12, 3.5, 0.2, 0.2, 0.5, { color: PALETTE.impGrey });
  // tow bar + hazard decal + stencil
  P.box("impMetal", 0, 0.5, -2.55, 0.14, 0.1, 0.9, { color: PALETTE.impGrey, tilt: 0.25 });
  P.decal(IMP_DECAL.hazard, 0.87, 1.6, 0.0, 0.7, "+x");
  P.decal(IMP_DECAL.hazard, -0.87, 1.6, 0.0, 0.7, "-x");
  P.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2][seed % 2], 0.87, 1.0, -1.0, 0.5, "+x");
  P.collider(-1.05, 0, -2.4, 1.05, 2.4, 2.7, "bowser");
}

export function hgHoseReel(kit, x, z, yaw, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  P.box("impMetal", 0, 0.05, 0, 1.3, 0.1, 0.8, { color: PALETTE.impCharcoal });
  for (const sx of [-0.55, 0.55]) P.box("impTrim", sx, 0.65, 0, 0.1, 1.2, 0.1, { color: PALETTE.impBlack });
  P.cyl("rubber", 0, 0.8, 0, 0.48, 0.8, "x", { color: PALETTE.impCharcoal, segments: 16 });
  P.cyl("impMetal", 0, 0.8, 0, 0.13, 1.25, "x", { color: PALETTE.impGrey, segments: 10 });
  for (const sx of [-0.35, 0.35]) P.cyl("impMetal", sx, 0.8, 0, 0.5, 0.04, "x", { color: PALETTE.impGreyDark, segments: 16 });
  P.box("impTrim", 0.62, 1.25, 0, 0.12, 0.12, 0.3, { color: PALETTE.impBlack });
  P.box("emitAmber", 0.62, 1.32, 0, 0.06, 0.02, 0.2);
  // hose on the deck, zig-zagging away from the reel
  if (opts.hoseOut !== false) {
    hose(kit, "rubber", P.p(0.2, 0.55, 0.45), P.p(0.6, 0.06, 1.6), 0.0, 0.05, 4, { color: PALETTE.impCharcoal });
    tube(kit, "rubber", P.p(0.6, 0.06, 1.6), P.p(-1.4, 0.06, 2.4), 0.05, { color: PALETTE.impCharcoal, segments: 8 });
    tube(kit, "rubber", P.p(-1.4, 0.06, 2.4), P.p(-1.9, 0.06, 3.6), 0.05, { color: PALETTE.impCharcoal, segments: 8 });
    P.box("impMetal", -1.95, 0.1, 3.75, 0.16, 0.16, 0.4, { color: PALETTE.impGrey });
  }
  P.collider(-0.7, 0, -0.45, 0.7, 1.35, 0.45, "reel");
}

export function hgToolCart(kit, x, z, yaw, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  const rand = rng(opts.seed || 5);
  P.box("impTrim", 0, 0.6, 0, 1.2, 0.85, 0.7, { color: PALETTE.impBlack, texel: 1 });
  for (let k = 0; k < 4; k++) {
    P.box("impMetal", 0, 0.3 + k * 0.19, 0.355, 1.08, 0.15, 0.02, { color: k % 2 ? PALETTE.impGreyDark : PALETTE.impGrey });
    P.box("impGloss", 0, 0.3 + k * 0.19, 0.37, 0.4, 0.03, 0.02);
  }
  P.box("impMetal", 0, 1.05, 0, 1.26, 0.06, 0.76, { color: PALETTE.impGrey });
  P.box("impTrim", 0, 1.1, -0.34, 1.26, 0.06, 0.06, { color: PALETTE.impBlack });
  for (let k = 0; k < 5; k++) {
    const mats = ["impMetal", "impGloss", "impTrim", "emitAmber", "impMetal"];
    P.box(mats[k], -0.45 + k * 0.22, 1.13, -0.1 + rand() * 0.3, 0.12 + rand() * 0.1, 0.08, 0.2 + rand() * 0.2, { color: PALETTE.impGrey, spin: rand() * 0.6 });
  }
  for (const [sx, sz] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) P.cyl("rubber", sx, 0.1, sz, 0.1, 0.06, "x", { color: PALETTE.impCharcoal, segments: 10 });
  P.cyl("impMetal", 0.7, 0.9, 0, 0.02, 0.6, "z", { color: PALETTE.impGrey, segments: 8 });
  P.decal(IMP_DECAL.cog, -0.45, 0.6, 0.36, 0.25);
  P.collider(-0.62, 0, -0.38, 0.72, 1.2, 0.38, "cart");
}

export function hgPowerBox(kit, x, z, yaw, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  P.box("impPanel1", 0, 0.95, 0, 0.78, 0.92, 0.58, { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
  P.box("impTrim", 0, 1.44, 0, 0.62, 0.1, 0.44, { color: PALETTE.impBlack });
  P.box("impTrim", 0, 0.5, 0, 0.8, 0.06, 0.6, { color: PALETTE.impBlack });
  for (const sx of [-0.2, 0.2]) {
    P.box("impTrim", sx, 0.25, 0, 0.2, 0.5, 0.26, { color: PALETTE.impBlack });
    P.box("impMetal", sx, 0.04, 0.02, 0.26, 0.08, 0.34, { color: PALETTE.impCharcoal });
  }
  P.box("impMetal", 0, 0.95, 0.3, 0.6, 0.6, 0.02, { color: PALETTE.impCharcoal });
  P.box(opts.on === false ? "emitRedImp" : "emitGreen", -0.18, 1.15, 0.315, 0.06, 0.06, 0.01);
  P.box("emitAmber", -0.06, 1.15, 0.315, 0.06, 0.06, 0.01);
  P.cyl("impMetal", 0.15, 0.8, 0.32, 0.08, 0.05, "z", { color: PALETTE.impGrey, segments: 10 });
  P.decal(IMP_DECAL.power, 0.15, 1.15, 0.32, 0.22);
  P.collider(-0.4, 0, -0.3, 0.4, 1.5, 0.3, "powerbox");
}

export function hgDiagConsole(kit, x, z, yaw, opts = {}) {
  impConsole(kit, x, 0, z, opts.w || 1.7, 0.8, { yaw, seed: opts.seed || 7, screens: opts.screens || ["scrAmber0", "scrAmber1"], accentKey: opts.accentKey || "emitAmber", tall: opts.tall !== false });
  if (opts.cableTo) {
    const P = new Placer(kit, x, 0, z, yaw);
    const a = P.p(0, 0.12, -0.42);
    const b = new THREE.Vector3(opts.cableTo[0], 0.05, opts.cableTo[1]);
    tube(kit, "rubber", a, b, 0.04, { color: PALETTE.impCharcoal, segments: 8 });
  }
}

export function hgScissorLift(kit, x, z, yaw, h = 3.2, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  P.box("impTrim", 0, 0.32, 0, 2.3, 0.36, 1.25, { color: PALETTE.impBlack, texel: 1 });
  P.box("chevronY", 0, 0.32, 0, 2.32, 0.14, 1.27, { texel: 2 });
  for (const [sx, sz] of [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]]) P.cyl("rubber", sx, 0.16, sz, 0.16, 0.2, "z", { color: PALETTE.impCharcoal, segments: 12 });
  // scissor stages
  const stages = 2;
  const y0 = 0.5;
  const top = h - 0.12;
  const sh = (top - y0) / stages;
  const armLen = Math.hypot(sh, 1.9);
  const ang = Math.atan2(sh, 1.9);
  for (let s = 0; s < stages; s++) {
    const yb = y0 + s * sh;
    for (const sz of [-0.5, 0.5]) {
      tiltedBox(kit, "impMetal", P.p(-0.95, yb, sz), P.p(0.95, yb + sh, sz), 0.08, 0.1, { color: PALETTE.impGrey });
      tiltedBox(kit, "impMetal", P.p(0.95, yb, sz), P.p(-0.95, yb + sh, sz), 0.08, 0.1, { color: PALETTE.impGrey });
    }
    P.cyl("impMetal", 0, yb + sh / 2, 0, 0.05, 1.1, "z", { color: PALETTE.impGreyDark, segments: 8 });
  }
  void armLen;
  void ang;
  // platform with railing
  P.box("impMetalRough", 0, top + 0.06, 0, 2.5, 0.12, 1.4, { color: PALETTE.impCharcoal, texel: 1 });
  const corners = [P.p(-1.25, 0, -0.7), P.p(1.25, 0, -0.7), P.p(1.25, 0, 0.7), P.p(-1.25, 0, 0.7)];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    hgRailing(kit, [a.x, a.z], [b.x, b.z], top + 0.12, { h: 1.0, collide: false, kick: false, postStep: 1.3 });
  }
  P.box("impTrim", 0.9, top + 0.75, -0.6, 0.4, 0.3, 0.2, { color: PALETTE.impBlack });
  P.box("emitAmber", 0.9, top + 0.75, -0.71, 0.2, 0.1, 0.02);
  P.collider(-1.2, 0, -0.65, 1.2, 0.6, 0.65, "lift");
}

/** Gantry crane: two rails along z at x = ±xr, bridge at zBridge, trolley at xT, hook down to hookY. */
export function hgGantryCrane(kit, xr, z0, z1, yRail, zBridge, xT, hookY, opts = {}) {
  const ibeam = (x, y, za, zb) => {
    kit.boxMM("impTrim", [x - 0.6, y + 0.85, za], [x + 0.6, y + 1.0, zb], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impTrim", [x - 0.12, y, za], [x + 0.12, y + 1.0, zb], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impTrim", [x - 0.6, y, za], [x + 0.6, y + 0.15, zb], { color: PALETTE.impBlack, texel: 1 });
  };
  for (const s of [-1, 1]) ibeam(s * xr, yRail, z0, z1);
  // end trucks + twin girders spanning the bay
  for (const s of [-1, 1]) kit.box("impMetal", s * xr, yRail - 0.6, zBridge, 1.8, 1.2, 3.2, { color: PALETTE.impGreyDark, texel: 1 });
  for (const dz of [-1.0, 1.0]) {
    kit.boxMM("impTrim", [-xr - 0.6, yRail - 2.2, zBridge + dz - 0.35], [xr + 0.6, yRail - 0.9, zBridge + dz + 0.35], { color: PALETTE.impBlack, texel: 0.5 });
    kit.boxMM("chevronY", [-xr - 0.61, yRail - 2.0, zBridge + dz - 0.36], [-xr + 3, yRail - 1.1, zBridge + dz + 0.36], { texel: 0.8 });
    kit.boxMM("chevronY", [xr - 3, yRail - 2.0, zBridge + dz - 0.36], [xr + 0.61, yRail - 1.1, zBridge + dz + 0.36], { texel: 0.8 });
  }
  // catwalk along the girder (decorative: unreachable)
  kit.boxMM("hangar_grate", [-xr + 2, yRail - 0.9, zBridge + 1.4], [xr - 2, yRail - 0.88, zBridge + 2.2], { texel: 1 });
  hgRailing(kit, [-xr + 2, zBridge + 2.15], [xr - 2, zBridge + 2.15], yRail - 0.9, { h: 1.0, collide: false, postStep: 3 });
  // trolley + hoist + cables + hook block
  kit.box("impTrim", xT, yRail - 1.4, zBridge, 3.0, 1.6, 3.0, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", xT, yRail - 0.5, zBridge, 2.4, 0.6, 2.4, { color: PALETTE.impGreyDark, texel: 1 });
  kit.cyl("impMetal", xT, yRail - 2.4, zBridge, 0.5, 2.2, "x", { color: PALETTE.impGrey, segments: 14 });
  for (const dx of [-0.5, 0.5]) kit.cyl("impMetal", xT + dx, (yRail - 2.4 + hookY) / 2, zBridge, 0.04, yRail - 2.4 - hookY, "y", { color: PALETTE.impGrey, segments: 6 });
  kit.box("impTrim", xT, hookY - 0.5, zBridge, 1.0, 1.1, 0.6, { color: PALETTE.impBlack });
  kit.box("chevronY", xT, hookY - 0.5, zBridge, 1.02, 0.4, 0.62, { texel: 1.5 });
  kit.add("impMetal", new THREE.TorusGeometry(0.4, 0.1, 8, 14, Math.PI * 1.35).rotateZ(-Math.PI * 0.2), { pos: [xT, hookY - 1.5, zBridge], color: PALETTE.impGrey, uv: "scale", uvScale: [1, 1] });
  for (const dx of [-1.4, 1.4]) kit.box("emitAmber", xT + dx, yRail - 0.75, zBridge, 0.25, 0.25, 0.25);
  if (opts.beacons) opts.beacons.push([xT, yRail - 0.05, zBridge + 1.6, 0.3, 0.3, 0.3]);
}

/** Magnetic clamp socket set into the deck (instanced). */
export function hgFloorSocket(kit, x, z) {
  inst(kit, "hg_sock_ring", "impTrim", () => new THREE.BoxGeometry(0.8, 0.05, 0.8).translate(0, 0.025, 0), [x, 0, z], null, PALETTE.impBlack);
  inst(kit, "hg_sock_core", "impMetal", () => new THREE.CylinderGeometry(0.22, 0.22, 0.07, 12).translate(0, 0.035, 0), [x, 0, z], null, PALETTE.impGrey);
}
/** Small deck marker lamp (instanced), e.g. around landing pads or along the coaming top. */
export function hgDeckLamp(kit, x, z, key = "emitAmber", y = 0) {
  inst(kit, "hg_lamp_ring", "impTrim", () => new THREE.CylinderGeometry(0.22, 0.26, 0.08, 10).translate(0, 0.04, 0), [x, y, z], null, PALETTE.impBlack);
  inst(kit, "hg_lamp_" + key, key, () => new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10).translate(0, 0.05, 0), [x, y, z]);
}

/** Merged geometry of a sagging hose from `a` to `b` (local coords), for instancing. */
export function hoseGeometry(a, b, sag, r, n = 6) {
  const c = a.clone().add(b).multiplyScalar(0.5);
  c.y -= sag;
  const parts = [];
  let prev = a.clone();
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().copy(a).multiplyScalar((1 - t) * (1 - t)).addScaledVector(c, 2 * (1 - t) * t).addScaledVector(b, t * t);
    const d = p.clone().sub(prev);
    const L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, 8);
    g.rotateX(Math.PI / 2);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z_AXIS, d.clone().normalize()));
    const mid = prev.clone().add(p).multiplyScalar(0.5);
    g.translate(mid.x, mid.y, mid.z);
    parts.push(g.toNonIndexed());
    prev = p;
  }
  return mergeGeometries(parts, false);
}

// ---------------------------------------------------------------------------
// Instanced crates in three sizes; a stack is one collider
// ---------------------------------------------------------------------------
export const CRATE_SIZES = { a: [1.2, 1.0, 1.2], b: [1.6, 1.2, 1.0], c: [0.8, 0.8, 0.8], d: [2.4, 2.2, 2.4], e: [3.6, 2.4, 2.4] };
const CRATE_COLORS = [PALETTE.impGreyDark, PALETTE.impGrey, new THREE.Color("#5a5348"), new THREE.Color("#4a5560"), new THREE.Color("#6b3f2e"), new THREE.Color("#4d5a3e")];
const CRATE_DECAL = { a: IMP_DECAL.bay01, b: IMP_DECAL.bay02, c: IMP_DECAL.glyphs2, d: IMP_DECAL.bay03, e: IMP_DECAL.hazard };
function cageGeometry(sx, sy, sz) {
  const t = 0.06;
  const parts = [];
  const edge = (w, h, d, x, y, z) => parts.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) edge(t, sy + 0.02, t, (dx * sx) / 2, sy / 2, (dz * sz) / 2);
  for (const yy of [0.03, sy - 0.03, sy * 0.5]) {
    for (const dz of [-1, 1]) edge(sx + 0.02, t, t, 0, yy, (dz * sz) / 2);
    for (const dx of [-1, 1]) edge(t, t, sz + 0.02, (dx * sx) / 2, yy, 0);
  }
  return mergeGeometries(parts, false);
}
export function hgCrate(kit, size, x, y, z, yaw = 0, colorIdx = 0, decal = true) {
  const [sx, sy, sz] = CRATE_SIZES[size];
  const q = yawQuat(yaw);
  inst(kit, "hg_crate_" + size, "impPanel1", () => new THREE.BoxGeometry(sx, sy, sz).translate(0, sy / 2, 0), [x, y, z], q, CRATE_COLORS[colorIdx % CRATE_COLORS.length]);
  inst(kit, "hg_cage_" + size, "impTrim", () => cageGeometry(sx, sy, sz), [x, y, z], q, PALETTE.impBlack);
  if (decal) {
    inst(
      kit,
      "hg_cdec_" + size,
      "decalImp",
      () => {
        const g = new THREE.PlaneGeometry(Math.min(sx, sy) * 0.42, Math.min(sx, sy) * 0.42).translate(0, sy * 0.55, sz / 2 + 0.004);
        rectUVs(g, impDecalRect(CRATE_DECAL[size]));
        return g;
      },
      [x, y, z],
      q,
    );
  }
}
/** Stack of crates at (x, z): `layout` = [[size, dx, dy, dz, yaw?, color?], ...]; one collider covers them. */
export function hgCrateStack(kit, x, z, yaw, layout, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  const min = new THREE.Vector3(Infinity, 0, Infinity);
  const max = new THREE.Vector3(-Infinity, 0, -Infinity);
  let i = 0;
  for (const [size, dx, dy, dz, ry = 0, col = null] of layout) {
    const p = P.p(dx, dy, dz);
    hgCrate(kit, size, p.x, p.y, p.z, yaw + ry, col ?? (opts.seed || 0) + i, opts.decal !== false);
    const [sx, sy, sz] = CRATE_SIZES[size];
    const r = Math.hypot(sx, sz) / 2;
    min.x = Math.min(min.x, p.x - r);
    min.z = Math.min(min.z, p.z - r);
    max.x = Math.max(max.x, p.x + r);
    max.z = Math.max(max.z, p.z + r);
    max.y = Math.max(max.y, dy + sy);
    i++;
  }
  kit.collider([min.x + 0.15, 0, min.z + 0.15], [max.x - 0.15, max.y, max.z - 0.15], "crates");
}

/** Hazard-striped border (chevronY strips of width `w`) around a deck rectangle. */
export function hgHazardBorder(kit, x0, z0, x1, z1, w = 0.5, y = 0.003) {
  kit.boxMM("chevronY", [x0, y, z0], [x1, y + 0.009, z0 + w], { texel: 0.8 });
  kit.boxMM("chevronY", [x0, y, z1 - w], [x1, y + 0.009, z1], { texel: 0.8 });
  kit.boxMM("chevronY", [x0, y, z0 + w], [x0 + w, y + 0.009, z1 - w], { texel: 0.8 });
  kit.boxMM("chevronY", [x1 - w, y, z0 + w], [x1, y + 0.009, z1 - w], { texel: 0.8 });
}

/** Floor drain: dark pit under an open grate with a raised rim (flush with the deck, no collider). */
export function hgFloorDrain(kit, x, z, w = 1.2, d = 1.2) {
  kit.boxMM("impTrim", [x - w / 2, 0.001, z - d / 2], [x + w / 2, 0.02, z + d / 2], { color: 0x07080a, texel: 1 });
  kit.boxMM("hangar_grate", [x - w / 2 + 0.06, 0.03, z - d / 2 + 0.06], [x + w / 2 - 0.06, 0.04, z + d / 2 - 0.06], { texel: 1 });
  const r = 0.07;
  kit.boxMM("impMetal", [x - w / 2 - r, 0, z - d / 2 - r], [x + w / 2 + r, 0.05, z - d / 2], { color: PALETTE.impGreyDark });
  kit.boxMM("impMetal", [x - w / 2 - r, 0, z + d / 2], [x + w / 2 + r, 0.05, z + d / 2 + r], { color: PALETTE.impGreyDark });
  kit.boxMM("impMetal", [x - w / 2 - r, 0, z - d / 2], [x - w / 2, 0.05, z + d / 2], { color: PALETTE.impGreyDark });
  kit.boxMM("impMetal", [x + w / 2, 0, z - d / 2], [x + w / 2 + r, 0.05, z + d / 2], { color: PALETTE.impGreyDark });
}

/**
 * Overhead hoist: an I-beam runway along `axis` at height y between a and b, a trolley at `at` with a
 * hoist block, twin chains and a hook block hanging to `hookY`. Room-local; `fixed` is the other axis.
 */
export function hgHoist(kit, axis, a, b, fixed, y, at, hookY, opts = {}) {
  const { accentKey = "emitAmber", beacons = null } = opts;
  const P = (s, dy, off = 0) => (axis === "x" ? [s, y + dy, fixed + off] : [fixed + off, y + dy, s]);
  const L = Math.abs(b - a);
  const mid = (a + b) / 2;
  const beam = (dy, h, w) => {
    const p = P(mid, dy);
    kit.box("impTrim", p[0], p[1], p[2], axis === "x" ? L : w, h, axis === "x" ? w : L, { color: PALETTE.impBlack, texel: 1 });
  };
  beam(0.45, 0.14, 0.7); // top flange
  beam(0, 0.8, 0.14); // web
  beam(-0.45, 0.14, 0.7); // bottom flange
  // end stops
  for (const s of [a, b]) {
    const p = P(s, 0);
    kit.box("chevronY", p[0], p[1], p[2], axis === "x" ? 0.3 : 0.9, 1.0, axis === "x" ? 0.9 : 0.3, { texel: 1 });
  }
  // trolley (straddles the bottom flange), hoist block, motor, chains, hook block
  const t = P(at, -0.75);
  kit.box("impMetal", t[0], t[1] + 0.35, t[2], 1.1, 0.5, 1.1, { color: PALETTE.impGreyDark, texel: 1 });
  kit.box("impTrim", t[0], t[1] - 0.35, t[2], 1.4, 0.9, 1.0, { color: PALETTE.impBlack, texel: 1 });
  kit.cyl("impMetal", t[0], t[1] - 0.35, t[2], 0.32, 1.5, axis === "x" ? "x" : "z", { color: PALETTE.impGrey, segments: 12 });
  kit.box(accentKey, t[0] + (axis === "x" ? 0 : 0.51), t[1] - 0.2, t[2] + (axis === "x" ? 0.51 : 0), axis === "x" ? 0.3 : 0.02, 0.08, axis === "x" ? 0.02 : 0.3);
  const chainTop = t[1] - 0.8;
  for (const o of [-0.25, 0.25]) {
    const c = axis === "x" ? [t[0] + o, 0, t[2]] : [t[0], 0, t[2] + o];
    kit.cyl("impMetal", c[0], (chainTop + hookY + 0.5) / 2, c[2], 0.03, chainTop - hookY - 0.5, "y", { color: PALETTE.impGrey, segments: 6 });
  }
  kit.box("impTrim", t[0], hookY + 0.25, t[2], 0.5, 0.5, 0.35, { color: PALETTE.impBlack });
  kit.box("chevronY", t[0], hookY + 0.25, t[2], 0.52, 0.2, 0.37, { texel: 1.5 });
  kit.add("impMetal", new THREE.TorusGeometry(0.22, 0.05, 8, 14, Math.PI * 1.4).rotateZ(-Math.PI * 0.2), { pos: [t[0], hookY - 0.2, t[2]], color: PALETTE.impGrey, uv: "scale", uvScale: [1, 1] });
  if (beacons) beacons.push([t[0], t[1] + 0.68, t[2], 0.22, 0.22, 0.22]);
}

/**
 * Tool wall on a wall frame: pegboard panel with hanging tools, a workbench with a vise and a lamp.
 * `u` = centre along the wall, `w` = width. Adds the bench collider.
 */
export function hgToolWall(frame, u, w, opts = {}) {
  const { seed = 3, accentKey = "emitAmber", bench = true, tag = "bench" } = opts;
  const rand = rng(seed);
  frame.box("impTrim", u, 2.15, 0.08, w, 2.3, 0.16, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impPanel2", u, 2.15, 0.165, w - 0.2, 2.1, 0.01, { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
  // rows of tools: wrenches (thin boxes), drivers (cylinders), a few hanging power tools (boxes)
  const nCols = Math.max(3, Math.floor(w / 0.45));
  for (let c = 0; c < nCols; c++) {
    const tu = u - w / 2 + 0.35 + (c * (w - 0.7)) / (nCols - 1);
    const kind = Math.floor(rand() * 4);
    const tv = 2.6 + rand() * 0.3;
    if (kind === 0) frame.box("impMetal", tu, tv - 0.3, 0.2, 0.06, 0.6, 0.03, { color: PALETTE.impGrey, spin: (rand() - 0.5) * 0.2 });
    else if (kind === 1) frame.cylV("impMetal", tu, tv - 0.25, 0.2, 0.025, 0.45, { color: PALETTE.impGreyDark, segments: 8 });
    else if (kind === 2) {
      frame.box("impTrim", tu, tv - 0.25, 0.24, 0.2, 0.32, 0.14, { color: PALETTE.impBlack });
      frame.box(accentKey, tu, tv - 0.15, 0.315, 0.06, 0.03, 0.01);
    } else frame.cylN("impMetal", tu, tv - 0.2, 0.22, 0.12, 0.05, { color: PALETTE.impGrey, segments: 12 });
    frame.box("impMetal", tu, tv + 0.08, 0.19, 0.04, 0.04, 0.06, { color: PALETTE.impGrey }); // peg
  }
  // lower shelf row: parts bins
  for (let k = 0; k < Math.floor(w / 0.6); k++) frame.box("painted", u - w / 2 + 0.4 + k * 0.6, 1.35, 0.25, 0.5, 0.28, 0.34, { color: k % 3 === 1 ? new THREE.Color("#8a4a2a") : PALETTE.impGreyDark, uv: "keep" });
  frame.box("impMetal", u, 1.2, 0.25, w - 0.2, 0.03, 0.4, { color: PALETTE.impGrey });
  // strip lamp over the board
  frame.box("impTrim", u, 3.4, 0.2, w - 0.4, 0.12, 0.3, { color: PALETTE.impBlack });
  frame.box("emitWhiteSoft", u, 3.34, 0.25, w - 0.7, 0.02, 0.16, { uv: "keep" });
  if (bench) {
    const bd = 0.9;
    frame.box("impTrim", u, 0.42, 0.16 + bd / 2, w - 0.3, 0.84, bd - 0.12, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impMetal", u, 0.88, 0.16 + bd / 2, w - 0.1, 0.08, bd, { color: PALETTE.impGreyDark, texel: 1 });
    for (let k = 0; k < Math.floor((w - 0.6) / 0.7); k++) frame.box("impMetal", u - w / 2 + 0.5 + k * 0.7, 0.55, 0.16 + bd - 0.02, 0.5, 0.35, 0.02, { color: k % 2 ? PALETTE.impGrey : PALETTE.impGreyDark });
    frame.box("impTrim", u + w / 2 - 0.55, 1.02, 0.16 + bd - 0.25, 0.3, 0.2, 0.3, { color: PALETTE.impBlack }); // vise
    frame.cylU("impMetal", u + w / 2 - 0.55, 1.02, 0.16 + bd - 0.25, 0.03, 0.5, { color: PALETTE.impGrey, segments: 8 });
    for (let k = 0; k < 3; k++) frame.box(["impMetal", "impGloss", "impMetal"][k], u - w / 2 + 0.6 + k * 0.5 + rand() * 0.2, 0.97, 0.16 + bd / 2 + (rand() - 0.5) * 0.3, 0.2 + rand() * 0.15, 0.1, 0.3, { color: PALETTE.impGrey, spin: rand() });
    frame.collider(u - w / 2 + 0.15, u + w / 2 - 0.15, 0, 1.1, 0, 0.16 + bd, tag);
  }
}

/** Steel shelving rack (frame-mounted along `axis` at the wall): posts, shelves, assorted parts. */
export function hgShelfRack(kit, x, z, yaw, w = 3.0, h = 3.6, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  const rand = rng(opts.seed || 9);
  const d = 1.1;
  const levels = opts.levels || 3;
  for (const [sx, sz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) P.box("impTrim", sx, h / 2, sz, 0.1, h, 0.1, { color: PALETTE.impBlack });
  for (let l = 0; l <= levels; l++) {
    const y = 0.12 + (l * (h - 0.3)) / levels;
    P.box("impMetal", 0, y, 0, w, 0.06, d, { color: PALETTE.impGreyDark, texel: 1 });
    P.box("impTrim", 0, y + 0.06, d / 2 - 0.02, w, 0.08, 0.04, { color: PALETTE.impBlack });
    if (l < levels) {
      // contents: cannon barrels, hatch rings, small crates, coils
      const kind = Math.floor(rand() * 4);
      if (kind === 0) for (let k = 0; k < 3; k++) P.cyl("impMetal", -w / 2 + 0.5 + k * ((w - 1) / 2), y + 0.15, 0, 0.09, d - 0.2, "z", { color: PALETTE.impGreyDark, segments: 10 });
      else if (kind === 1) for (let k = 0; k < 2; k++) P.add("impMetal", new THREE.TorusGeometry(0.32, 0.06, 8, 18), -w / 4 + (k * w) / 2, y + 0.4, 0, { color: PALETTE.impGrey, uv: "scale", uvScale: [1, 1], tilt: Math.PI / 2 });
      else if (kind === 2) for (let k = 0; k < Math.floor(w / 0.9); k++) hgCrate(kit, "c", P.p(-w / 2 + 0.5 + k * 0.9, y + 0.03, 0).x, y + 0.03, P.p(-w / 2 + 0.5 + k * 0.9, y + 0.03, 0).z, yaw + (rand() - 0.5) * 0.2, k + (opts.seed || 0), false);
      else for (let k = 0; k < 2; k++) P.cyl("rubber", -w / 4 + (k * w) / 2, y + 0.28, 0, 0.3, 0.5, "y", { color: PALETTE.impCharcoal, segments: 14 });
    }
  }
  P.box("impTrim", 0, h - 0.15, 0, w + 0.1, 0.12, d + 0.1, { color: PALETTE.impBlack });
  P.decal(IMP_DECAL.glyphs1, -w / 2 + 0.6, h - 0.15, d / 2 + 0.07, 0.4);
  P.collider(-w / 2 - 0.05, 0, -d / 2 - 0.05, w / 2 + 0.05, h, d / 2 + 0.05, "rack");
}

/** Cargo pallet: skid, strapped load of crates / drums, ident decal. */
export function hgPallet(kit, x, z, yaw, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  const rand = rng(opts.seed || 2);
  const w = opts.w || 2.4;
  const d = opts.d || 2.0;
  P.box("impTrim", 0, 0.08, 0, w, 0.16, d, { color: PALETTE.impBlack, texel: 1 });
  P.box("chevronY", 0, 0.08, 0, w + 0.02, 0.08, d + 0.02, { texel: 2 });
  for (const sx of [-w / 2 + 0.3, w / 2 - 0.3]) P.box("impMetal", sx, 0.2, 0, 0.4, 0.08, d, { color: PALETTE.impGrey });
  const kind = opts.kind || Math.floor(rand() * 3);
  let top = 0.24;
  if (kind === 0) {
    // crate stack
    hgCrate(kit, "b", P.p(-0.35, 0.24, 0).x, 0.24, P.p(-0.35, 0.24, 0).z, yaw, (opts.seed || 0) + 1);
    hgCrate(kit, "a", P.p(0.85, 0.24, 0.1).x, 0.24, P.p(0.85, 0.24, 0.1).z, yaw + 0.1, (opts.seed || 0) + 2);
    hgCrate(kit, "c", P.p(-0.3, 1.44, 0.1).x, 1.44, P.p(-0.3, 1.44, 0.1).z, yaw - 0.2, (opts.seed || 0) + 3);
    top = 2.3;
  } else if (kind === 1) {
    // drums
    for (const [sx, sz] of [[-0.65, -0.45], [0.65, -0.45], [-0.65, 0.45], [0.65, 0.45]]) {
      P.cyl("impMetal", sx, 0.24 + 0.55, sz, 0.42, 1.1, "y", { color: rand() < 0.5 ? PALETTE.impGreyDark : new THREE.Color("#5a5348"), segments: 16, texel: 0.5 });
      P.cyl("impTrim", sx, 0.24 + 1.1, sz, 0.43, 0.06, "y", { color: PALETTE.impBlack, segments: 16 });
      P.cyl("impTrim", sx, 0.24 + 0.55, sz, 0.44, 0.06, "y", { color: PALETTE.impBlack, segments: 16 });
    }
    P.decal(IMP_DECAL.hazard, -0.65, 0.9, 0.9, 0.35);
    top = 1.4;
  } else {
    // shrink-wrapped block with straps
    P.box("impPanel1", 0, 0.24 + 0.7, 0, w - 0.3, 1.4, d - 0.3, { color: new THREE.Color("#4a5560"), uv: "world", texel: 1 });
    for (const sx of [-0.6, 0.6]) P.box("impTrim", sx, 0.24 + 0.7, 0, 0.1, 1.44, d - 0.26, { color: PALETTE.impBlack });
    P.box("impTrim", 0, 0.24 + 0.7, 0, w - 0.26, 1.44, 0.1, { color: PALETTE.impBlack });
    P.decal(IMP_DECAL.bay02, 0.3, 1.1, d / 2 - 0.14, 0.5);
    top = 1.7;
  }
  P.collider(-w / 2, 0, -d / 2, w / 2, top, d / 2, "pallet");
}

/** Wall-mounted fuel / coolant manifold: a pipe run at height y with valve stations every `step`. */
export function hgManifold(kit, from, to, y, opts = {}) {
  const { r = 0.22, step = 12.5, colors = [PALETTE.impGreyDark, PALETTE.impGrey], accentKey = "emitAmber", drops = true, bracket = 0.6 } = opts;
  const a = new THREE.Vector3(from[0], y, from[1]);
  const b = new THREE.Vector3(to[0], y, to[1]);
  const d = b.clone().sub(a);
  const L = d.length();
  d.normalize();
  const side = new THREE.Vector3(-d.z, 0, d.x); // toward the room (caller orients from -> to so that this points inward)
  tube(kit, "impMetal", a, b, r, { color: colors[0], segments: 12 });
  tube(kit, "impMetal", a.clone().addScaledVector(side, -0.55).setY(y + 0.7), b.clone().addScaledVector(side, -0.55).setY(y + 0.7), r * 0.7, { color: colors[1], segments: 10 });
  for (let s = step / 2; s < L; s += step) {
    const p = a.clone().addScaledVector(d, s);
    // flange + valve wheel + tap with a short hose stub
    tube(kit, "impTrim", p.clone().addScaledVector(d, -0.2), p.clone().addScaledVector(d, 0.2), r + 0.08, { color: PALETTE.impBlack, segments: 12 });
    kit.add("impMetal", new THREE.TorusGeometry(0.28, 0.035, 6, 16), { pos: [p.x + side.x * (r + 0.32), y, p.z + side.z * (r + 0.32)], quat: quatLookZ(side), color: PALETTE.impGrey, uv: "scale", uvScale: [1, 1] });
    tube(kit, "impMetal", p, p.clone().addScaledVector(side, r + 0.32), 0.05, { color: PALETTE.impGrey, segments: 8 });
    kit.box("impTrim", p.x + side.x * 0.1, y - 0.5, p.z + side.z * 0.1, 0.4, 0.4, 0.4, { color: PALETTE.impBlack });
    kit.box(accentKey, p.x + side.x * 0.31, y - 0.5, p.z + side.z * 0.31, side.z ? 0.12 : 0.02, 0.12, side.x ? 0.12 : 0.02);
    if (drops) {
      const top = p.clone().setY(y - 0.2);
      const foot = p.clone().setY(0.35);
      tube(kit, "impMetal", top, foot, 0.06, { color: PALETTE.impGreyDark, segments: 8 });
      kit.box("impTrim", foot.x, 0.25, foot.z, 0.5, 0.5, 0.5, { color: PALETTE.impBlack });
      kit.collider([foot.x - 0.3, 0, foot.z - 0.3], [foot.x + 0.3, 0.55, foot.z + 0.3], "manifold");
    }
    // wall bracket: from behind the pipes back to the wall face (`bracket` metres)
    kit.box("impTrim", p.x - side.x * (bracket / 2), y - 0.4, p.z - side.z * (bracket / 2), side.z ? 0.4 : bracket + 0.02, 1.2, side.x ? 0.4 : bracket + 0.02, { color: PALETTE.impBlack });
  }
}

// ---------------------------------------------------------------------------
// Industrial hangar wall. Openings are [u0,u1]×[v0,v1] rectangles in the wall frame; they may touch
// or overlap (the slab is decomposed exactly). Doors are built by the system into those holes.
// ---------------------------------------------------------------------------
export function hgWall(frame, length, height, opts = {}) {
  const kit = frame.kit;
  const {
    openings = [],
    ribPitch = 12.5,
    seed = 1,
    plateH = 8,
    depth = 0.4,
    tag = "wall",
    accentKey = "emitAmber",
    floods = true,
    floodV = 25,
    floodAim = 18,
    plateColor = PALETTE.impWhite,
    plateAlt = PALETTE.impGrey,
    upperColor = PALETTE.impCharcoal,
    ducts = true,
    lightBays = true,
    collide = true,
    ribs: ribsOn = true,
    ribW = 1.2,
    ribD = 0.9,
    rowH = 8,
    bigDecals = true,
    features = null,
    lightKey = "emitWhiteSoft",
    quiet = [], // [u0,u1] ranges whose second upper row stays plain (room for the caller's giant stencils)
    // dark structural bays: one row of small amber lamp points at every gallery level instead of backlit glazing
    lampRows = false,
    lampKey = "emitAmber",
    lampStep = 4.2,
    // vertical accent strips on every other rib (tall rooms); pass null to omit
    ribAccentKey = accentKey,
    // lamp face key of the flood banks (amber = sodium floods)
    floodLamp = "emitWhite",
    ribColor = PALETTE.impBlack,
    ribCapColor = PALETTE.impCharcoal,
    // key of the thin continuous strips (deck-band cornice, top cornice); null omits them
    corniceKey = lightKey,
  } = opts;
  const rand = rng(seed);
  const isQuiet = (u) => quiet.some(([q0, q1]) => u > q0 && u < q1);
  const ops = openings.map((o) => ({ u0: Math.max(0, o.u0), u1: Math.min(length, o.u1), v0: Math.max(0, o.v0), v1: Math.min(height, o.v1) })).filter((o) => o.u1 > o.u0 && o.v1 > o.v0);
  const intersects = (u0, u1, v0, v1, m = 0) => ops.some((o) => o.u0 - m < u1 && o.u1 + m > u0 && o.v0 - m < v1 && o.v1 + m > v0);
  const solidSpans = (v0, v1, u0 = 0, u1 = length) => cutSpans([[u0, u1]], ops.filter((o) => o.v0 < v1 && o.v1 > v0).map((o) => [o.u0, o.u1]));

  // --- backing slab: vertical strips between opening edges, each with its own solid v-intervals
  // (the same decomposition drives the wall colliders, so a raised doorway is really passable)
  const strips = [];
  {
    const edges = new Set([0, length]);
    for (const o of ops) {
      edges.add(o.u0);
      edges.add(o.u1);
    }
    const E = [...edges].sort((a, b) => a - b);
    let prevKey = null;
    let prevA = 0;
    let prevIntervals = null;
    const flush = (a, b, intervals) => {
      if (b - a < 0.01) return;
      strips.push({ a, b, intervals });
      for (const [va, vb] of intervals) if (vb - va > 0.01) frame.box("impTrim", (a + b) / 2, (va + vb) / 2, -depth / 2 - 0.02, b - a, vb - va, depth, { color: PALETTE.impBlack, texel: 0.3 });
    };
    for (let i = 0; i < E.length - 1; i++) {
      const a = E[i];
      const b = E[i + 1];
      const cuts = ops.filter((o) => o.u0 < b - 1e-6 && o.u1 > a + 1e-6).map((o) => [o.v0, o.v1]);
      const intervals = cutSpans([[0, height]], cuts);
      const key = JSON.stringify(intervals);
      if (key !== prevKey) {
        if (prevIntervals) flush(prevA, a, prevIntervals);
        prevKey = key;
        prevA = a;
        prevIntervals = intervals;
      }
    }
    if (prevIntervals) flush(prevA, length, prevIntervals);
  }

  // --- structural ribs
  let ribs = [];
  if (ribsOn) {
    const n = Math.max(1, Math.round(length / ribPitch));
    for (let i = 0; i <= n; i++) ribs.push((i / n) * length);
    // keep-out intervals around every opening, merged so that a rib pushed off one opening cannot land
    // in a neighbouring one (e.g. a raised door flanked by window strips)
    const keepOut = ops.map((o) => [o.u0 - ribW / 2 - 0.75, o.u1 + ribW / 2 + 0.75]).sort((p, q) => p[0] - q[0]);
    const merged = [];
    for (const k of keepOut) {
      const last = merged[merged.length - 1];
      if (last && k[0] <= last[1]) last[1] = Math.max(last[1], k[1]);
      else merged.push([k[0], k[1]]);
    }
    const adjusted = [];
    for (let u of ribs) {
      const hit = merged.find(([lo, hi]) => u > lo && u < hi);
      if (hit) u = u - hit[0] < hit[1] - u ? hit[0] : hit[1];
      adjusted.push(Math.min(Math.max(u, ribW / 2), length - ribW / 2));
    }
    adjusted.sort((a, b) => a - b);
    ribs = adjusted.filter((u, i) => i === 0 || u - adjusted[i - 1] > 2.5);
    // opening edges always get a rib (frames the blast doors)
    for (const o of ops) {
      if (o.v0 > 0.5) continue;
      for (const e of [o.u0 - ribW / 2 - 0.75, o.u1 + ribW / 2 + 0.75]) if (e > ribW / 2 && e < length - ribW / 2 && !ribs.some((r) => Math.abs(r - e) < 2.0)) ribs.push(e);
    }
    // never let a rib (or its collider) stand in an opening
    ribs = ribs.filter((u) => !ops.some((o) => u + ribW / 2 + 0.3 > o.u0 && u - ribW / 2 - 0.3 < o.u1));
    ribs.sort((a, b) => a - b);
    for (let i = 0; i < ribs.length; i++) {
      const u = ribs[i];
      const corner = u < ribW || u > length - ribW;
      const u0 = corner ? (u < ribW ? 0 : length - ribW) : u - ribW / 2;
      const cu = u0 + ribW / 2;
      frame.box("impTrim", cu, height / 2, ribD / 2, ribW, height, ribD, { color: ribColor, texel: 0.5 });
      frame.box("impMetal", cu, 0.7, ribD / 2 + 0.1, ribW + 0.4, 1.4, ribD + 0.2, { color: ribCapColor, texel: 1 });
      frame.box("impMetal", cu, height - 0.8, ribD / 2 + 0.1, ribW + 0.4, 1.6, ribD + 0.2, { color: ribCapColor, texel: 1 });
      frame.box("impMetal", cu, plateH, ribD / 2 + 0.05, ribW + 0.2, 0.5, ribD + 0.1, { color: PALETTE.impGreyDark, texel: 1 });
      if (!corner && i % 2 === 1 && height > 20 && ribAccentKey) {
        // short accent bar (a 12 m strip reads as a laser line in a dark bay)
        const al = Math.min(height * 0.3, 5.5);
        frame.box("impTrim", cu, height * 0.42, ribD + 0.03, 0.34, al + 0.6, 0.08, { color: PALETTE.impBlack });
        frame.box(ribAccentKey, cu, height * 0.42, ribD + 0.08, 0.14, al, 0.02);
      }
      if (collide) frame.collider(u0, u0 + ribW, 0, height, -depth, ribD, tag + "-rib");
    }
  }
  const bays = [];
  if (ribs.length >= 2) for (let i = 0; i < ribs.length - 1; i++) bays.push([ribs[i] + ribW / 2 + 0.05, ribs[i + 1] - ribW / 2 - 0.05]);
  else bays.push([0.05, length - 0.05]);

  // --- deck-level band: pale plates with black kick, illuminated cornice, equipment
  const feat = features || { gear: 0.22, light: 0.12, vent: 0.12, pipes: 0.12, cabinet: 0.08, stencil: 0.1 };
  const bandTop = plateH - 0.5;
  for (const [ba, bb] of bays) {
    for (const [a, b] of solidSpans(0, plateH, ba, bb)) {
      const w = b - a;
      if (w < 0.6) continue;
      const cu = (a + b) / 2;
      frame.box("impTrim", cu, 0.25, 0.06, w, 0.5, 0.12, { color: PALETTE.impBlack, texel: 1 });
      frame.box("impMetal", cu, 0.5, 0.11, w - 0.1, 0.04, 0.02, { color: PALETTE.impGreyDark });
      frame.box("impTrim", cu, plateH - 0.25, 0.11, w, 0.5, 0.22, { color: PALETTE.impBlack, texel: 1 });
      if (w > 1.2) {
        frame.box("impMetal", cu, plateH - 0.56, 0.14, w - 0.2, 0.12, 0.08, { color: PALETTE.impCharcoal });
        if (corniceKey) frame.box(corniceKey, cu, plateH - 0.56, 0.185, w - 0.4, 0.06, 0.015, { uv: "keep" });
      }
      const m = Math.max(1, Math.round(w / 3.2));
      const pw = w / m;
      for (let k = 0; k < m; k++) {
        const pu0 = a + k * pw;
        const pu1 = pu0 + pw;
        const pc = (pu0 + pu1) / 2;
        const variant = Math.floor(rand() * 3);
        const pKey = variant === 0 ? "impPanel" : "impPanel" + variant;
        const col = rand() < 0.22 ? plateAlt : plateColor;
        // split: lower panel (0.5..3.6) and upper panel (3.6..bandTop)
        const vSplit = Math.min(3.6, bandTop - 0.4);
        frame.box(pKey, pc, (0.5 + vSplit) / 2, 0.03, pw - 0.16, vSplit - 0.5 - 0.06, 0.06, { color: col, uv: "world", texel: 1 });
        if (bandTop - vSplit > 0.3) frame.box(variant === 2 ? "impPanel" : "impPanel2", pc, (vSplit + bandTop) / 2, 0.03, pw - 0.16, bandTop - vSplit - 0.06, 0.06, { color: col, uv: "world", texel: 1 });
        frame.box("impTrim", pc, (0.5 + bandTop) / 2, 0.05, 0.12, bandTop - 0.5, 0.1, { color: PALETTE.impBlack });
        if (k === 0) frame.box("impTrim", a + 0.06, (0.5 + bandTop) / 2, 0.05, 0.12, bandTop - 0.5, 0.1, { color: PALETTE.impBlack });
        if (k === m - 1) frame.box("impTrim", b - 0.06, (0.5 + bandTop) / 2, 0.05, 0.12, bandTop - 0.5, 0.1, { color: PALETTE.impBlack });
        frame.box("impTrim", pc, vSplit, 0.05, pw - 0.16, 0.08, 0.07, { color: PALETTE.impBlack });
        // features
        let r = rand();
        let pick = "plain";
        for (const k2 of Object.keys(feat)) {
          r -= feat[k2];
          if (r <= 0) {
            pick = k2;
            break;
          }
        }
        if (pw < 2.2) pick = pick === "gear" || pick === "light" ? pick : "plain";
        switch (pick) {
          case "gear":
            impWallGear(frame, pc - 0.2, 1.7, { seed: Math.floor(rand() * 1000), accentKey });
            break;
          case "light":
            impWallLight(frame, pc, 3.0, { key: lightKey, w: Math.min(1.4, pw - 0.6) });
            break;
          case "vent": {
            const vw = Math.min(2.0, pw - 0.6);
            frame.box("impTrim", pc, 2.2, 0.07, vw, 1.4, 0.1, { color: PALETTE.impCharcoal, texel: 1 });
            for (let s = 0; s < 8; s++) frame.box("impMetal", pc, 1.6 + s * 0.17, 0.12, vw - 0.2, 0.04, 0.08, { color: PALETTE.impGreyDark, tilt: 0.5 });
            break;
          }
          case "pipes": {
            const np = 2 + Math.floor(rand() * 2);
            for (let p = 0; p < np; p++) {
              const pr = 0.06 + rand() * 0.06;
              const pu = pc - 0.6 + (p / (np - 1)) * 1.2;
              frame.cylV("impMetal", pu, (0.5 + bandTop) / 2, 0.1 + pr, pr, bandTop - 0.7, { color: [PALETTE.impGreyDark, PALETTE.impGrey][p % 2], segments: 10 });
              for (const vv of [1.2, 4.0, bandTop - 0.6]) frame.box("impTrim", pu, vv, 0.1 + pr, pr * 2 + 0.1, 0.12, pr * 2 + 0.06, { color: PALETTE.impBlack });
            }
            frame.box("impTrim", pc, 1.0, 0.2, 0.7, 0.5, 0.3, { color: PALETTE.impBlack });
            frame.box(accentKey, pc - 0.2, 1.05, 0.36, 0.08, 0.08, 0.01);
            frame.box("emitRedImp", pc + 0.05, 1.05, 0.36, 0.08, 0.08, 0.01);
            break;
          }
          case "cabinet":
            frame.box("impTrim", pc, 1.6, 0.16, 1.0, 1.6, 0.3, { color: PALETTE.impBlack, texel: 1 });
            frame.box("painted", pc, 1.6, 0.32, 0.9, 1.5, 0.02, { color: new THREE.Color("#a8332a"), uv: "keep" });
            frame.decal(IMP_DECAL.hazard, pc, 1.9, 0.335, 0.5);
            frame.box("impMetal", pc + 0.3, 1.3, 0.34, 0.06, 0.3, 0.03, { color: PALETTE.impGrey });
            frame.collider(pc - 0.5, pc + 0.5, 0, 2.4, 0, 0.32, tag + "-cabinet");
            break;
          case "stencil":
            frame.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs3, IMP_DECAL.keepClear, IMP_DECAL.cog, IMP_DECAL.arrowRight][Math.floor(rand() * 5)], pc, 2.0 + rand() * 0.8, 0.065, Math.min(1.2, pw * 0.4));
            break;
          default:
            if (rand() < 0.5) frame.box("impTrim", pc, 1.6 + rand() * 1.4, 0.062, pw - 0.4, 0.03, 0.01, { color: PALETTE.impBlack });
        }
        // upper-panel stencil (bay glyphs) now and then
        if (bandTop - vSplit > 1.5 && rand() < 0.3) frame.decal([IMP_DECAL.glyphs2, IMP_DECAL.bay01, IMP_DECAL.bay03, IMP_DECAL.vacuum][Math.floor(rand() * 4)], pc, vSplit + (bandTop - vSplit) * 0.5, 0.065, Math.min(1.3, pw * 0.35, bandTop - vSplit - 0.5));
      }
    }
  }

  // --- upper band: dark plates in rows, light bays, vents, flood banks, ducts, cornice
  const rows = [];
  for (let v = plateH; v < height - 0.01; v += rowH) rows.push([v, Math.min(height, v + rowH)]);
  let bayIdx = 0;
  for (const [ba, bb] of bays) {
    for (let ri = 0; ri < rows.length; ri++) {
      const [v0, v1] = rows[ri];
      for (const [a, b] of solidSpans(v0, v1, ba, bb)) {
        const w = b - a;
        if (w < 0.8) continue;
        const cu = (a + b) / 2;
        const cv = (v0 + v1) / 2;
        const rh = v1 - v0;
        frame.box("impMetalRough", cu, cv, 0.025, w - 0.16, rh - 0.3, 0.05, { color: upperColor, texel: 0.25 });
        frame.box("impTrim", cu, v1 - 0.12, 0.06, w, 0.24, 0.12, { color: PALETTE.impBlack, texel: 1 });
        if (w > 5) frame.box("impTrim", cu, cv, 0.055, 0.14, rh - 0.3, 0.02, { color: PALETTE.impBlack });
        const last = ri === rows.length - 1;
        if (lampRows && !last && w > 2) {
          // gallery-level lamp points: small hooded lamps on a black ledge at the bottom of every row
          const lv = v0 + 0.55;
          frame.box("impTrim", cu, lv - 0.2, 0.18, w - 0.3, 0.1, 0.36, { color: PALETTE.impBlack, texel: 1 });
          const nLamps = Math.max(1, Math.floor((w - 1.2) / lampStep));
          for (let k = 0; k < nLamps; k++) {
            const lu = cu + (k - (nLamps - 1) / 2) * lampStep;
            const p = frame.pos(lu, lv, 0.22);
            inst(kit, "hg_wlamp_hood", "impTrim", () => new THREE.BoxGeometry(0.5, 0.22, 0.3), [p.x, p.y, p.z], frame.q, PALETTE.impBlack);
            inst(kit, "hg_wlamp_" + lampKey, lampKey, () => new THREE.BoxGeometry(0.34, 0.08, 0.26).translate(0, -0.1, 0.02), [p.x, p.y, p.z], frame.q);
          }
        }
        if (ri === 0 && lightBays && w > 3 && rh > 3) {
          // louvred light bay
          const lw = w - 1.2;
          const lv = v0 + rh * 0.55;
          frame.box("impTrim", cu, lv, 0.2, lw, 1.7, 0.4, { color: PALETTE.impBlack, texel: 1 });
          frame.box(lightKey, cu, lv, 0.405, lw - 0.3, 0.9, 0.015, { uv: "keep" });
          for (let f = 0; f < 4; f++) frame.box("impMetal", cu, lv - 0.6 + f * 0.4, 0.55, lw - 0.1, 0.05, 0.3, { color: PALETTE.impGreyDark, tilt: -0.35 });
          // stencil under the bay
          frame.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2][bayIdx % 2], cu, v0 + 0.9, 0.06, Math.min(1.4, w * 0.2));
        } else if (ri === 0 && !lightBays && w > 3 && rh > 3) {
          // dark structural bay: recessed service hatch with a stencil and a bay glyph (no backlighting)
          const hw = Math.min(w - 2.4, 5);
          frame.box("impTrim", cu, v0 + rh * 0.5, 0.1, hw, Math.min(rh - 2.4, 3.6), 0.2, { color: PALETTE.impBlack, texel: 1 });
          frame.box("impPanel1", cu, v0 + rh * 0.5, 0.21, hw - 0.4, Math.min(rh - 2.4, 3.6) - 0.4, 0.02, { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
          frame.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.bay02, IMP_DECAL.vacuum][bayIdx % 4], cu, v0 + rh * 0.5, 0.23, Math.min(1.6, hw * 0.35));
        } else if (ri === 1 && rh > 3 && !isQuiet(cu)) {
          if (bayIdx % 2 === 0 && bigDecals && w > 6) frame.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.cog][bayIdx % 4], cu, cv, 0.06, Math.min(w - 2, rh - 1.2, 6));
          else if (w > 3) {
            const vw = Math.min(w - 1.6, 6);
            frame.box("impTrim", cu, cv, 0.15, vw, Math.min(rh - 1.6, 3.4), 0.3, { color: PALETTE.impBlack, texel: 1 });
            const nf = 8;
            const fh = Math.min(rh - 1.6, 3.4);
            for (let f = 0; f < nf; f++) frame.box("impMetal", cu, cv - fh / 2 + (f + 0.5) * (fh / nf), 0.32, vw - 0.3, 0.06, 0.22, { color: PALETTE.impGreyDark, tilt: 0.5 });
          }
        }
        if (floods && v0 <= floodV && v1 > floodV && w > 3) {
          // flood bank on a yoke bracket, aimed at the deck `floodAim` metres into the room
          const nL = Math.max(1, Math.min(4, Math.floor(w / 3.6)));
          const bp = frame.pos(cu, floodV, 0.75);
          const aim = frame.pos(cu, 0, floodAim);
          const along = frame.U.clone();
          frame.box("impTrim", cu, floodV + 0.4, 0.45, Math.min(w - 0.8, nL * 1.5 + 0.8), 0.32, 0.9, { color: PALETTE.impBlack, texel: 1 });
          frame.box("impTrim", cu, floodV + 1.3, 0.2, 0.5, 1.6, 0.4, { color: PALETTE.impBlack });
          hgFloodBank(kit, [bp.x, bp.y, bp.z], [aim.x, aim.y, aim.z], nL, { spread: 1.5, along, lamp: floodLamp });
          // conduit up to the bank
          frame.cylV("impMetal", cu + 0.7, (v0 + floodV) / 2, 0.12, 0.05, floodV - v0 - 0.2, { color: PALETTE.impGreyDark, segments: 8 });
        }
        if (last && height > 20) {
          // big square duct along the top row + cornice
          const dv = v0 + rh * 0.35;
          frame.box("impTrim", cu, dv, 0.55, w + 0.1, 1.6, 1.1, { color: PALETTE.impCharcoal, texel: 0.5 });
          for (let f = a + 3; f < b - 1; f += 6) frame.box("impMetal", f, dv, 0.6, 0.25, 1.9, 1.3, { color: PALETTE.impGreyDark, texel: 1 });
          frame.box("impTrim", cu, height - 0.6, 0.3, w + 0.1, 1.2, 0.6, { color: PALETTE.impBlack, texel: 1 });
          frame.box("impMetal", cu, height - 1.25, 0.32, w - 0.4, 0.1, 0.05, { color: PALETTE.impCharcoal });
          if (corniceKey) frame.box(corniceKey, cu, height - 1.25, 0.35, w - 0.6, 0.05, 0.012, { uv: "keep" });
        } else if (last) {
          frame.box("impTrim", cu, height - 0.3, 0.2, w + 0.1, 0.6, 0.4, { color: PALETTE.impBlack, texel: 1 });
        }
      }
    }
    bayIdx++;
  }
  // --- pipe runs along the wall just above the plates (skip openings taller than the pipes)
  if (ducts && height > plateH + 3) {
    const pv = [plateH + 1.4, plateH + 2.4];
    const pr = [0.32, 0.22];
    for (let i = 0; i < 2; i++) {
      for (const [a, b] of solidSpans(pv[i] - 0.5, pv[i] + 0.5)) {
        if (b - a < 1) continue;
        frame.cylU("impMetal", (a + b) / 2, pv[i], 0.55, pr[i], b - a, { color: i ? PALETTE.impGrey : PALETTE.impGreyDark, segments: 12 });
      }
    }
    for (const u of ribs) {
      if (intersects(u - 0.5, u + 0.5, pv[0] - 1, pv[1] + 1)) continue;
      frame.box("impTrim", u, (pv[0] + pv[1]) / 2, 0.5, 0.25, pv[1] - pv[0] + 1.0, 0.9, { color: PALETTE.impBlack, texel: 1 });
    }
  }
  // --- colliders: one per solid slab piece (openings at any height stay passable)
  if (collide) {
    for (const s of strips) {
      for (const [va, vb] of s.intervals) if (vb - va > 0.05) frame.collider(s.a, s.b, va, vb, -depth, 0.3, tag);
    }
  }
  return { ribs, bays, strips };
}

/**
 * Door openings of a room on one wall side, as hgWall rectangles. Doors with a long passage (the big
 * blast doors sit up to ~5 m off the wall face) still count; the Kestrel's door (in the middle of the
 * hangar, flagged `kestrel` in the spec) does not.
 */
export function hgWallOpenings(room, doors, side) {
  const [w, , d] = room.size;
  const out = [];
  for (const dd of doors) {
    if (dd.side !== side) continue;
    if (dd.door && dd.door.kestrel) continue;
    const onWall = side === "N" ? Math.abs(dd.lz + d / 2) < 8 : side === "S" ? Math.abs(dd.lz - d / 2) < 8 : side === "W" ? Math.abs(dd.lx + w / 2) < 8 : Math.abs(dd.lx - w / 2) < 8;
    if (!onWall) continue;
    let u;
    if (side === "N") u = dd.lx + w / 2;
    else if (side === "S") u = w / 2 - dd.lx;
    else if (side === "W") u = d / 2 - dd.lz;
    else u = dd.lz + d / 2;
    out.push({ u0: u - dd.w / 2, u1: u + dd.w / 2, v0: dd.ly || 0, v1: (dd.ly || 0) + dd.h, door: dd });
  }
  return out;
}

/** Dark industrial ceiling: slab, cross beams, light troughs along z, round ducts. */
export function hgCeiling(kit, x0, z0, x1, z1, y, opts = {}) {
  const { beamStep = 12.5, beamAxis = "x", troughsX = [], ductsX = [], lightKey = "emitWhiteSoft", skip = null, beamH = 1.4 } = opts;
  const inSkip = (x, z) => skip && x > skip.x0 && x < skip.x1 && z > skip.z0 && z < skip.z1;
  // boxMM that ignores degenerate pieces (skip rectangles touching the room edge)
  const piece = (mat, min, max, o) => {
    if (max[0] - min[0] > 0.02 && max[2] - min[2] > 0.02) kit.boxMM(mat, min, max, o);
  };
  // slab (split around a skipped rectangle if given)
  const slabOpts = { color: PALETTE.impCharcoal, texel: 0.2 };
  if (!skip) kit.boxMM("impMetalRough", [x0, y, z0], [x1, y + 0.4, z1], slabOpts);
  else {
    piece("impMetalRough", [x0, y, z0], [x1, y + 0.4, skip.z0], slabOpts);
    piece("impMetalRough", [x0, y, skip.z1], [x1, y + 0.4, z1], slabOpts);
    piece("impMetalRough", [x0, y, skip.z0], [skip.x0, y + 0.4, skip.z1], slabOpts);
    piece("impMetalRough", [skip.x1, y, skip.z0], [x1, y + 0.4, skip.z1], slabOpts);
  }
  const beams = [];
  if (beamAxis === "x") {
    const n = Math.max(1, Math.round((z1 - z0) / beamStep));
    for (let i = 1; i < n; i++) {
      const z = z0 + ((z1 - z0) * i) / n;
      beams.push(z);
      const xs = skip && z > skip.z0 - 0.7 && z < skip.z1 + 0.7 ? [[x0, skip.x0], [skip.x1, x1]] : [[x0, x1]];
      for (const [a, b] of xs) {
        piece("impTrim", [a, y - beamH, z - 0.5], [b, y + 0.01, z + 0.5], { color: PALETTE.impBlack, texel: 0.5 });
        piece("impMetal", [a, y - beamH, z - 0.7], [b, y - beamH + 0.16, z + 0.7], { color: PALETTE.impGreyDark, texel: 0.5 });
      }
    }
  }
  // light troughs along z between beams
  for (const tx of troughsX) {
    const edges = [z0, ...beams, z1];
    for (let i = 0; i < edges.length - 1; i++) {
      const za = edges[i] + 1.2;
      const zb = edges[i + 1] - 1.2;
      if (zb - za < 2 || inSkip(tx, (za + zb) / 2)) continue;
      kit.boxMM("impTrim", [tx - 0.9, y - 0.5, za], [tx + 0.9, y + 0.01, zb], { color: PALETTE.impBlack, texel: 0.5 });
      kit.boxMM("impMetal", [tx - 0.7, y - 0.5, za + 0.2], [tx + 0.7, y - 0.4, zb - 0.2], { color: PALETTE.impCharcoal, texel: 0.5 });
      kit.boxMM(lightKey, [tx - 0.55, y - 0.52, za + 0.3], [tx + 0.55, y - 0.48, zb - 0.3], { uv: "keep" });
      for (let f = za + 1.0; f < zb - 0.5; f += 1.0) kit.boxMM("impTrim", [tx - 0.6, y - 0.62, f], [tx + 0.6, y - 0.52, f + 0.06], { color: PALETTE.impBlack });
    }
  }
  // round ducts along z with hanger straps
  for (const dx of ductsX) {
    const r = 0.9;
    const dy = y - beamH - r - 0.2;
    const segs = skip && dx > skip.x0 && dx < skip.x1 ? [[z0 + 1, skip.z0 - 0.5], [skip.z1 + 0.5, z1 - 1]] : [[z0 + 1, z1 - 1]];
    for (const [za, zb] of segs) {
      if (zb - za < 2) continue;
      kit.cyl("impMetal", dx, dy, (za + zb) / 2, r, zb - za, "z", { color: PALETTE.impGreyDark, segments: 16, texel: 0.3 });
      for (let s = za + 6; s < zb; s += 12) {
        kit.cyl("impTrim", dx, dy, s, r + 0.08, 0.5, "z", { color: PALETTE.impBlack, segments: 16 });
        kit.box("impTrim", dx, (dy + r + y - beamH) / 2, s, 0.2, y - beamH - dy - r + 0.02, 0.2, { color: PALETTE.impBlack });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Ground-crew kit for parked fighters: deck cradle, wheeled maintenance ladder, power droid, hazard
// bollards, wheel chocks, deck cable runs, painted berth outlines
// ---------------------------------------------------------------------------
/**
 * Deck cradle for a parked TIE at (x, z) facing `yaw` (nose = local -z, wings at local x = ±halfSpan):
 * skid rails under both wings, V-block saddles around the wing's bottom edge, clamp jaws with hydraulic
 * rams at the wing ends, a hazard stop bar across the nose end.
 */
export function hgTieCradle(kit, x, z, yaw, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  const hs = opts.halfSpan ?? 3.3;
  const ww = opts.wingW ?? 4.4;
  for (const s of [-1, 1]) {
    P.box("impTrim", s * hs, 0.08, 0, 1.1, 0.16, ww + 1.3, { color: PALETTE.impBlack, texel: 1 });
    P.box("chevronY", s * hs, 0.08, 0, 1.12, 0.09, ww + 1.32, { texel: 1.5 });
    for (const dz of [-ww * 0.3, ww * 0.3]) {
      P.box("impMetal", s * hs - 0.28, 0.3, dz, 0.46, 0.34, 0.7, { color: PALETTE.impGreyDark, roll: 0.55 });
      P.box("impMetal", s * hs + 0.28, 0.3, dz, 0.46, 0.34, 0.7, { color: PALETTE.impGreyDark, roll: -0.55 });
    }
    for (const dz of [-ww / 2 - 0.4, ww / 2 + 0.4]) {
      P.box("impTrim", s * hs, 0.5, dz, 0.55, 1.0, 0.34, { color: PALETTE.impBlack, texel: 1 });
      P.cyl("impMetal", s * hs, 1.1, dz, 0.08, 0.9, "y", { color: PALETTE.impGrey, segments: 8 });
      P.box("impMetal", s * hs, 1.5, dz + (dz < 0 ? 0.28 : -0.28), 0.34, 0.14, 0.56, { color: PALETTE.impGreyDark });
      P.box("emitAmber", s * hs + 0.28, 0.8, dz, 0.02, 0.08, 0.14);
      P.box("emitAmber", s * hs - 0.28, 0.8, dz, 0.02, 0.08, 0.14);
    }
    P.collider(s * hs - 0.6, 0, -ww / 2 - 0.65, s * hs + 0.6, 0.6, ww / 2 + 0.65, "cradle");
  }
  P.box("impTrim", 0, 0.2, -ww / 2 - 1.5, 2 * hs - 1.4, 0.4, 0.3, { color: PALETTE.impBlack, texel: 1 });
  P.box("chevronY", 0, 0.2, -ww / 2 - 1.5, 2 * hs - 1.38, 0.2, 0.32, { texel: 2 });
  P.collider(-hs + 0.7, 0, -ww / 2 - 1.65, hs - 0.7, 0.4, -ww / 2 - 1.35, "cradle-bar");
}

/** Painted berth outline: solid rectangle with corner brackets and a dashed centre tick, yaw about Y. */
export function hgBerthOutline(kit, x, z, yaw, hw, hd, opts = {}) {
  const { color = PALETTE.yellow, w = 0.26, y = 0.0085 } = opts;
  const P = new Placer(kit, x, 0, z, yaw);
  const c = [P.p(-hw, 0, -hd), P.p(hw, 0, -hd), P.p(hw, 0, hd), P.p(-hw, 0, hd)];
  for (let i = 0; i < 4; i++) {
    const a = c[i];
    const b = c[(i + 1) % 4];
    deckLine(kit, [a.x, a.z], [b.x, b.z], w, color, y);
  }
  // inner corner brackets
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const cx = sx * (hw - 0.7);
    const cz = sz * (hd - 0.7);
    const p0 = P.p(cx, 0, cz);
    const p1 = P.p(cx - sx * 1.4, 0, cz);
    const p2 = P.p(cx, 0, cz - sz * 1.4);
    deckLine(kit, [p0.x, p0.z], [p1.x, p1.z], w * 0.7, PALETTE.impWhite, y);
    deckLine(kit, [p0.x, p0.z], [p2.x, p2.z], w * 0.7, PALETTE.impWhite, y);
  }
}

/** Tall wheeled maintenance ladder: castored base, sloped stringers with treads, top platform + hoop rail. Top toward local -z. */
export function hgLadder(kit, x, z, yaw, h = 3.4, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  const w = 0.9;
  const run = h * 0.5;
  P.box("impTrim", 0, 0.14, run / 2 - 0.2, w + 0.4, 0.1, run + 1.2, { color: PALETTE.impBlack, texel: 1 });
  for (const [sx, sz] of [[-w / 2 - 0.15, -0.6], [w / 2 + 0.15, -0.6], [-w / 2 - 0.15, run + 0.2], [w / 2 + 0.15, run + 0.2]]) P.cyl("rubber", sx, 0.1, sz, 0.1, 0.08, "x", { color: PALETTE.impCharcoal, segments: 10 });
  for (const sx of [-w / 2, w / 2]) tiltedBox(kit, "impTrim", P.p(sx, 0.2, run), P.p(sx, h, 0.1), 0.08, 0.22, { color: PALETTE.impBlack });
  const n = Math.max(4, Math.round(h / 0.3));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    P.box("impMetal", 0, 0.2 + (h - 0.2) * t, run - (run - 0.1) * t, w, 0.05, 0.24, { color: PALETTE.impGreyDark });
  }
  P.box("impMetalRough", 0, h + 0.03, -0.35, w + 0.3, 0.08, 1.0, { color: PALETTE.impCharcoal });
  P.box("chevronY", 0, h + 0.03, -0.35, w + 0.32, 0.04, 1.02, { texel: 2 });
  for (const sx of [-w / 2 - 0.15, w / 2 + 0.15]) {
    P.box("impTrim", sx, h / 2 + 0.5, -0.82, 0.08, h + 1.0, 0.08, { color: PALETTE.impBlack });
    P.box("impMetal", sx, h + 1.0, -0.35, 0.05, 0.05, 1.0, { color: PALETTE.impGrey });
    P.box("impMetal", sx, h + 0.5, -0.35, 0.05, 0.05, 1.0, { color: PALETTE.impGrey });
  }
  P.box("impMetal", 0, h + 1.0, -0.82, w + 0.3, 0.05, 0.05, { color: PALETTE.impGrey });
  P.box(opts.lamp || "emitAmber", 0, h + 0.75, -0.85, 0.3, 0.06, 0.02);
  P.collider(-w / 2 - 0.25, 0, -0.95, w / 2 + 0.25, h + 1.05, run + 0.45, "ladder");
}

/** Boxy power droid (GNK): body, stumpy legs, front lamp panel, side grille, optional cable to a deck point. */
export function hgPowerDroid(kit, x, z, yaw, opts = {}) {
  const P = new Placer(kit, x, 0, z, yaw);
  const col = opts.color || PALETTE.impGreyDark;
  P.box("impPanel1", 0, 1.05, 0, 0.9, 1.1, 0.7, { color: col, uv: "world", texel: 1 });
  P.box("impTrim", 0, 1.62, 0, 0.94, 0.06, 0.74, { color: PALETTE.impBlack });
  P.box("impTrim", 0, 0.5, 0, 0.94, 0.06, 0.74, { color: PALETTE.impBlack });
  for (const sx of [-0.25, 0.25]) {
    P.box("impTrim", sx, 0.27, 0, 0.26, 0.48, 0.36, { color: PALETTE.impBlack });
    P.box("impMetal", sx, 0.05, 0.04, 0.32, 0.1, 0.48, { color: PALETTE.impCharcoal });
  }
  P.box("impMetal", 0, 1.1, 0.36, 0.72, 0.72, 0.02, { color: PALETTE.impCharcoal });
  P.box(opts.on === false ? "emitRedImp" : "emitGreen", -0.2, 1.32, 0.375, 0.08, 0.08, 0.01);
  P.box("emitAmber", -0.05, 1.32, 0.375, 0.08, 0.08, 0.01);
  for (let s = 0; s < 4; s++) P.box("impTrim", 0.15, 0.84 + s * 0.09, 0.375, 0.34, 0.03, 0.01, { color: PALETTE.impBlack });
  P.cyl("impMetal", 0.25, 1.32, 0.37, 0.07, 0.06, "z", { color: PALETTE.impGrey, segments: 10 });
  P.decal(IMP_DECAL.power, -0.2, 0.86, 0.38, 0.3);
  for (let s = 0; s < 5; s++) P.box("impTrim", 0.455, 0.78 + s * 0.14, 0, 0.01, 0.04, 0.5, { color: PALETTE.impBlack });
  if (opts.cableTo) {
    const a = P.p(0.25, 1.32, 0.42);
    const mid = P.p(0.6, 0.06, 1.3);
    hose(kit, "rubber", a, mid, 0.15, 0.04, 5, { color: PALETTE.impCharcoal });
    tube(kit, "rubber", mid, new THREE.Vector3(opts.cableTo[0], 0.05, opts.cableTo[1]), 0.04, { color: PALETTE.impCharcoal, segments: 8 });
  }
  P.collider(-0.5, 0, -0.4, 0.5, 1.7, 0.4, "droid");
}

/** Hazard bollard (instanced): black base, yellow post with two black bands, amber lamp cap. */
export function hgBollard(kit, x, z, key = "emitAmber") {
  inst(kit, "hg_boll_base", "impTrim", () => new THREE.CylinderGeometry(0.28, 0.34, 0.12, 12).translate(0, 0.06, 0), [x, 0, z], null, PALETTE.impBlack);
  inst(kit, "hg_boll_post", "painted", () => new THREE.CylinderGeometry(0.13, 0.15, 1.0, 12).translate(0, 0.62, 0), [x, 0, z], null, PALETTE.yellow);
  inst(
    kit,
    "hg_boll_bands",
    "impTrim",
    () => mergeGeometries([new THREE.CylinderGeometry(0.145, 0.15, 0.14, 12).translate(0, 0.45, 0), new THREE.CylinderGeometry(0.135, 0.14, 0.14, 12).translate(0, 0.85, 0), new THREE.CylinderGeometry(0.17, 0.14, 0.14, 12).translate(0, 1.19, 0)], false),
    [x, 0, z],
    null,
    PALETTE.impBlack,
  );
  inst(kit, "hg_boll_lamp_" + key, key, () => new THREE.CylinderGeometry(0.1, 0.11, 0.08, 10).translate(0, 1.3, 0), [x, 0, z]);
  kit.collider([x - 0.3, 0, z - 0.3], [x + 0.3, 1.35, z + 0.3], "bollard");
}

/** Pair of wheel chocks (instanced wedges) straddling a wheel at (x, z); `yaw` = wheel axis direction. */
export function hgChocks(kit, x, z, yaw, gap = 0.7) {
  const q = yawQuat(yaw);
  const wedge = () => {
    const g = new THREE.BoxGeometry(0.42, 0.24, 0.22);
    g.translate(0, 0.12, 0);
    return g;
  };
  for (const s of [-1, 1]) {
    const p = new THREE.Vector3(0, 0, s * gap).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    inst(kit, "hg_chock", "painted", wedge, [p.x, 0, p.z], q, PALETTE.yellow);
  }
}

/** Cable / hose run lying on the deck through the given [x, z] points. */
export function hgDeckCable(kit, pts, opts = {}) {
  const { r = 0.05, mat = "rubber", color = PALETTE.impCharcoal } = opts;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(pts[i][0], r, pts[i][1]);
    const b = new THREE.Vector3(pts[i + 1][0], r, pts[i + 1][1]);
    if (a.distanceTo(b) < 0.05) continue;
    tube(kit, mat, a, b, r, { color, segments: 6 });
  }
}

/** Ceiling fixture with louvre fins (a hooded, dim strip): the fixture reads as a light without blowing out. */
export function hgLouvredFixture(kit, x, y, z, w, d, opts = {}) {
  const { lightKey = "emitWhiteDim", axis = "x" } = opts;
  kit.box("impTrim", x, y - 0.14, z, w + 0.2, 0.28, d + 0.2, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", x, y - 0.29, z, w, 0.02, d, { color: PALETTE.impCharcoal });
  kit.box(lightKey, x, y - 0.3, z, w - 0.16, 0.02, d - 0.16, { uv: "keep" });
  const L = axis === "x" ? w : d;
  const n = Math.max(2, Math.floor(L / 0.32));
  for (let i = 0; i < n; i++) {
    const s = -L / 2 + (i + 0.5) * (L / n);
    if (axis === "x") kit.box("impTrim", x + s, y - 0.36, z, 0.03, 0.12, d - 0.1, { color: PALETTE.impBlack });
    else kit.box("impTrim", x, y - 0.36, z + s, w - 0.1, 0.12, 0.03, { color: PALETTE.impBlack });
  }
}

export { HG_DECAL, hgDecalRect };
