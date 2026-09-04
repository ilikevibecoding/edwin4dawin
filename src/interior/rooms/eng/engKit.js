// Engineering-deck prop vocabulary shared by the six Deck 12 rooms: structural I-beams, hazard
// kerbs, valves, tanks, pumps, transformers, scrubber cabinets, gantry cranes, beacons, ladders,
// stencils and open industrial stairs. Everything goes through the room's Kit (merged per material)
// or a mini Kit for animated assemblies (one Group, a handful of draw calls).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit, rng } from "../../../kit.js";
import { IMP, NO_SHADOW_KEYS } from "../../../materials/imperial.js";
import { impDecalRect, deckMarkRect } from "../../../materials/imperialTextures.js";
import { pointLightDesc, walkable, railing, stairs, pipeRun } from "../../impKit.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const yawQ = (yaw) => new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);

// Local-frame helper for yawed props: returns box()/cyl()/L() closures around a floor point.
export function local(kit, pos, yaw) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(pos[0], pos[1], pos[2]);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  // cylinder along a local axis
  const cyl = (mat, x, y, z, r, len, axis = "y", extra = {}) => {
    const p = L(x, y, z);
    const g = new THREE.CylinderGeometry(extra.r2 !== undefined ? extra.r2 : r, r, len, extra.segments || 14, 1, !!extra.open);
    const rq = axis === "x" ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2) : axis === "z" ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2) : new THREE.Quaternion();
    const { r2, segments, open, ...rest } = extra;
    return kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: q.clone().multiply(rq), uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  };
  const collider = (x0, y0, z0, x1, y1, z1, tag) => {
    const a = L(x0, 0, z0);
    const b = L(x1, 0, z1);
    const c = L(x0, 0, z1);
    const d = L(x1, 0, z0);
    const xs = [a.x, b.x, c.x, d.x];
    const zs = [a.z, b.z, c.z, d.z];
    return kit.collider([Math.min(...xs), pos[1] + y0, Math.min(...zs)], [Math.max(...xs), pos[1] + y1, Math.max(...zs)], tag);
  };
  return { q, L, box, cyl, collider };
}

// Build an assembly into its own Group with a throw-away Kit (for animated props).
export function miniKit(mats, build) {
  const k = new Kit(mats);
  build(k);
  const g = new THREE.Group();
  k.build(g, { noShadow: NO_SHADOW_KEYS });
  return g;
}

// Prefab for instancing: build a prop at the origin with a throw-away Kit and return one merged
// geometry per material (vertex colours baked in). instancePrefab() then draws any number of copies
// in one InstancedMesh per material.
export function prefab(mats, build) {
  const k = new Kit(mats);
  build(k);
  const out = new Map();
  for (const [key, geos] of k.groups) {
    const merged = mergeGeometries(geos, false);
    if (merged) out.set(key, merged);
  }
  return out;
}
export function instancePrefab(kit, pf, transforms, opts = {}) {
  const { colorKeys = null, ...rest } = opts;
  // per-instance colours only tint the material keys listed in colorKeys (e.g. the painted body),
  // so braces, labels and lights keep their baked colours
  const plain = colorKeys ? transforms.map(({ color, ...t }) => t) : transforms;
  for (const [key, geo] of pf) kit.instanced(key, geo.clone(), colorKeys && !colorKeys.has(key) ? plain : transforms, { castShadow: !NO_SHADOW_KEYS.has(key), ...rest });
}

// Standard Imperial cargo container prefab (body baked white so per-instance colours tint it; the
// braces, bands, handles, label and status light keep their colours). Origin at the floor centre.
export function containerPrefab(mats, size = [2.4, 2.4, 2.4], opts = {}) {
  const { label = 3, label2 = 9, light = "emitAmber" } = opts;
  const [w, h, d] = size;
  return prefab(mats, (k) => {
    k.box("impPaintedMetal", 0, h / 2, 0, w, h, d, { color: 0xffffff, texel: 1 });
    // steel corner posts with gusset plates top and bottom (steel reads on dark and light bodies alike)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        k.box("impMetal", sx * (w / 2 - 0.07), h / 2, sz * (d / 2 - 0.07), 0.16, h + 0.02, 0.16, { color: IMP.steel });
        for (const sy of [0.2, h - 0.2]) k.box("impMetal", sx * (w / 2 - 0.19), sy, sz * (d / 2 - 0.19), 0.4, 0.26, 0.4, { color: IMP.gunmetal });
      }
    }
    k.box("impMetal", 0, h * 0.25, 0, w + 0.03, 0.1, d + 0.03, { color: IMP.steel });
    k.box("impMetal", 0, h * 0.75, 0, w + 0.03, 0.1, d + 0.03, { color: IMP.steel });
    k.box("impMetal", 0, h - 0.06, 0, w - 0.3, 0.06, d - 0.3, { color: IMP.trim });
    // door end (+z): two leaves with a dark seam, hinge straps, vertical latch rods with keepers and
    // yellow handles
    k.box("impPaintedMetal", 0, h * 0.5, d / 2 + 0.008, 0.03, h * 0.78, 0.012, { color: IMP.black, texel: 1 });
    for (const s of [-1, 1]) {
      k.box("impMetal", s * w * 0.16, h * 0.5, d / 2 + 0.03, 0.05, h * 0.74, 0.05, { color: IMP.steel });
      for (const ky of [0.1, 0.9]) k.box("impMetal", s * w * 0.16, h * ky, d / 2 + 0.03, 0.12, 0.06, 0.06, { color: IMP.gunmetal });
      k.box("impMetal", s * (w * 0.16 + 0.1), h * 0.5, d / 2 + 0.045, 0.18, 0.05, 0.04, { color: IMP.hazardYellow });
      for (const hy of [0.2, 0.8]) k.box("impMetal", s * (w / 2 - 0.22), h * hy, d / 2 + 0.02, 0.2, 0.08, 0.03, { color: IMP.gunmetal });
    }
    // recessed side panels and lift pockets
    for (const s of [-1, 1]) {
      k.box("impPaintedMetal", s * (w / 2 + 0.005), h * 0.5, 0, 0.01, h * 0.34, d * 0.6, { color: 0xffffff, texel: 1 });
      k.box("impPaintedMetal", 0, 0.28, s * (d / 2 + 0.006), w * 0.7, 0.16, 0.012, { color: IMP.black, texel: 1 });
    }
    // handles on the sides, stencils on all four faces (large unit mark + small class mark)
    for (const s of [-1, 1]) {
      k.box("impMetal", s * (w / 2 + 0.03), h * 0.55, d * 0.36, 0.04, 0.1, Math.min(0.4, d * 0.25), { color: IMP.steel });
      k.add("impDecal", new THREE.PlaneGeometry(1.0, 1.0), { pos: [s * (w / 2 + 0.016), h * 0.5, -d * 0.16], rot: [0, (s * Math.PI) / 2, 0], uv: "keep", uvRect: impDecalRect(label) });
      k.add("impDecal", new THREE.PlaneGeometry(0.45, 0.45), { pos: [s * (w / 2 + 0.016), h * 0.78, d * 0.3], rot: [0, (s * Math.PI) / 2, 0], uv: "keep", uvRect: impDecalRect(label2) });
    }
    k.add("impDecal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [-w * 0.34, h * 0.55, d / 2 + 0.012], uv: "keep", uvRect: impDecalRect(label) });
    k.add("impDecal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [w * 0.2, h * 0.55, -d / 2 - 0.012], rot: [0, Math.PI, 0], uv: "keep", uvRect: impDecalRect(label2) });
    k.add("impDecal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [-w * 0.28, h * 0.55, -d / 2 - 0.012], rot: [0, Math.PI, 0], uv: "keep", uvRect: impDecalRect(label) });
    // status light (optional: it is a whole instanced batch of its own) + data plate by the door
    if (light) k.box(light, w * 0.33, h * 0.86, d / 2 + 0.012, 0.1, 0.04, 0.01);
    k.box("impMetal", w * 0.33, h * 0.76, d / 2 + 0.01, 0.4, 0.12, 0.01, { color: IMP.black });
  });
}

// Parts rack: open steel shelving with four loaded shelves (bins, canisters, coils). Origin at the
// floor centre, front = +z, footprint w x d.
export function partsRackPrefab(mats, opts = {}) {
  const { w = 2.0, h = 3.0, d = 1.0, seed = 5 } = opts;
  const rand = rng(seed);
  return prefab(mats, (k) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box("impPaintedMetal", sx * (w / 2 - 0.04), h / 2, sz * (d / 2 - 0.04), 0.08, h, 0.08, { color: IMP.trim, texel: 1 });
    const shelves = 4;
    for (let i = 0; i <= shelves; i++) {
      const sy = 0.12 + (i / shelves) * (h - 0.3);
      k.box("impPaintedMetal", 0, sy, 0, w, 0.05, d, { color: IMP.wallDark, texel: 1 });
      k.box("impMetal", 0, sy + 0.04, d / 2 - 0.02, w, 0.06, 0.03, { color: IMP.steel });
      if (i < shelves) {
        // shelf contents: a mix of bins, canisters and flat plates
        let x = -w / 2 + 0.15;
        while (x < w / 2 - 0.3) {
          const kind = rand();
          if (kind < 0.45) {
            const bw = 0.3 + rand() * 0.3;
            const bh = 0.25 + rand() * 0.25;
            k.box("impPaintedMetal", x + bw / 2, sy + 0.03 + bh / 2, -0.05 + rand() * 0.1, bw, bh, d * 0.7, { color: [IMP.gunmetal, IMP.consoleDark, IMP.hazardYellow, IMP.wallMid, IMP.red][Math.floor(rand() * 5)], texel: 1 });
            x += bw + 0.08;
          } else if (kind < 0.8) {
            const r = 0.1 + rand() * 0.08;
            const ch = 0.3 + rand() * 0.3;
            k.cyl("impMetal", x + r, sy + 0.03 + ch / 2, 0, r, ch, "y", { color: rand() < 0.5 ? IMP.steel : IMP.gunmetal, segments: 10 });
            x += r * 2 + 0.08;
          } else {
            k.box("impMetal", x + 0.25, sy + 0.03 + 0.15, 0, 0.5, 0.3, 0.06, { color: IMP.darkMetal });
            x += 0.6;
          }
        }
      }
    }
    k.box("impPaintedMetal", -w * 0.3, h - 0.45, d / 2 + 0.01, 0.5, 0.18, 0.02, { color: IMP.wallMid, texel: 1 });
    k.box(rand() < 0.5 ? "emitAmber" : "emitBlue", w * 0.35, h - 0.45, d / 2 + 0.01, 0.08, 0.04, 0.02);
  });
}

// Compressed-gas cylinder with a valve and a safety cap, chained to whatever is behind it.
export function gasCylinder(kit, pos, opts = {}) {
  const { color = IMP.red, r = 0.18, h = 1.6 } = opts;
  const [x, y, z] = pos;
  kit.cyl("impPaintedMetal", x, y + h / 2, z, r, h, "y", { color, segments: 14, texel: 0.5 });
  kit.add("impPaintedMetal", new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y + h, z], color, uv: "scale", uvScale: [2, 1] });
  kit.cyl("impMetal", x, y + h + r * 0.6 + 0.08, z, 0.05, 0.16, "y", { color: IMP.steel, segments: 8 });
  kit.box("impMetal", x + 0.06, y + h + r * 0.6 + 0.16, z, 0.16, 0.03, 0.03, { color: IMP.steel });
  kit.cyl("impMetal", x, y + h + r * 0.6 + 0.12, z, r * 0.7, 0.28, "y", { color: IMP.gunmetal, segments: 12, open: true });
  kit.box("impPaintedMetal", x, y + h * 0.7, z, r * 2 + 0.02, 0.05, r * 2 + 0.02, { color: IMP.trim });
  kit.collider([x - r, y, z - r], [x + r, y + h + 0.3, z + r], "cylinder");
}

// Original maintenance droid: tracked base, boxy chassis with tool arms, sensor head with a lens.
export function droid(kit, pos, yaw = 0, opts = {}) {
  const { color = IMP.wallMid, active = true } = opts;
  const { box, cyl, collider } = local(kit, pos, yaw);
  for (const s of [-1, 1]) {
    box("impRubber", s * 0.38, 0.16, 0, 0.16, 0.32, 0.9, { color: IMP.rubber });
    box("impPaintedMetal", s * 0.38, 0.16, 0, 0.1, 0.2, 0.7, { color: IMP.trim, texel: 1 });
  }
  box("impPaintedMetal", 0, 0.5, 0, 0.6, 0.5, 0.8, { color, texel: 1 });
  box("impPaintedMetal", 0, 0.78, 0, 0.66, 0.06, 0.86, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, 0.98, 0.05, 0.5, 0.34, 0.6, { color: IMP.wallDark, texel: 1 });
  // arms: one clamp, one welder
  cyl("impMetal", -0.36, 0.7, 0.35, 0.04, 0.5, "z", { color: IMP.steel, segments: 8 });
  box("impMetal", -0.36, 0.7, 0.66, 0.1, 0.16, 0.14, { color: IMP.gunmetal });
  cyl("impMetal", 0.36, 0.7, 0.3, 0.04, 0.4, "z", { color: IMP.steel, segments: 8 });
  cyl("impMetal", 0.36, 0.7, 0.55, 0.06, 0.12, "z", { color: IMP.darkMetal, segments: 8 });
  // head
  cyl("impPaintedMetal", 0, 1.32, 0.05, 0.22, 0.28, "y", { color, segments: 14 });
  cyl("impMetal", 0, 1.32, 0.29, 0.07, 0.1, "z", { color: IMP.black, segments: 10 });
  box(active ? "emitRed" : "darkGloss", 0, 1.32, 0.345, 0.06, 0.06, 0.01);
  box(active ? "emitBlue" : "darkGloss", 0.18, 0.98, 0.36, 0.1, 0.03, 0.01);
  box("impMetal", 0, 1.5, 0.05, 0.03, 0.2, 0.03, { color: IMP.steel });
  collider(-0.5, 0, -0.45, 0.5, 1.5, 0.7, "droid");
}

// Workbench: heavy steel top on cabinet bases, a vice, scattered tools and parts, a strip light on a
// back panel with a pegboard of hanging tools. yaw 0 => the worker stands at -z looking toward +z.
export function workbench(kit, pos, yaw, w = 3.0, opts = {}) {
  const { seed = 1, backPanel = true } = opts;
  const rand = rng(seed);
  const { box, cyl, collider } = local(kit, pos, yaw);
  const d = 1.0;
  const h = 0.92;
  box("impMetal", 0, h - 0.04, 0, w, 0.08, d, { color: IMP.steel, texel: 1 });
  box("impPaintedMetal", 0, h - 0.1, 0, w - 0.1, 0.06, d - 0.1, { color: IMP.trim, texel: 1 });
  for (const s of [-1, 1]) {
    box("impPaintedMetal", s * (w / 2 - 0.45), (h - 0.1) / 2, 0, 0.8, h - 0.1, d - 0.15, { color: IMP.wallDark, texel: 1 });
    for (let k = 0; k < 3; k++) box("impMetal", s * (w / 2 - 0.45), 0.2 + k * 0.25, -d / 2 + 0.08, 0.4, 0.03, 0.02, { color: IMP.steel });
    box(rand() < 0.5 ? "emitRed" : "emitAmber", s * (w / 2 - 0.45) + 0.28, h - 0.22, -d / 2 + 0.08, 0.04, 0.02, 0.01);
  }
  box("impMetal", 0, 0.08, d / 2 - 0.1, w - 1.6, 0.08, 0.3, { color: IMP.gunmetal });
  // vice
  box("impMetal", -w / 2 + 0.5, h + 0.12, -d / 2 + 0.25, 0.3, 0.22, 0.2, { color: IMP.gunmetal });
  cyl("impMetal", -w / 2 + 0.5, h + 0.12, -d / 2 + 0.05, 0.03, 0.3, "z", { color: IMP.steel, segments: 8 });
  // clutter
  for (let i = 0; i < 5; i++) {
    const tx = -w / 2 + 0.9 + rand() * (w - 1.4);
    const tz = -0.3 + rand() * 0.5;
    if (rand() < 0.5) box("impMetal", tx, h + 0.04, tz, 0.15 + rand() * 0.3, 0.06, 0.08 + rand() * 0.2, { color: [IMP.steel, IMP.gunmetal, IMP.red, IMP.hazardYellow][Math.floor(rand() * 4)], rot: [0, rand() * 1.5, 0] });
    else cyl("impMetal", tx, h + 0.06, tz, 0.04 + rand() * 0.06, 0.1 + rand() * 0.2, "y", { color: rand() < 0.5 ? IMP.steel : IMP.consoleDark, segments: 10 });
  }
  box("impPaintedMetal", w * 0.2, h + 0.12, 0.15, 0.5, 0.24, 0.35, { color: IMP.consoleDark, texel: 1 });
  box("blinkSparse", w * 0.2, h + 0.2, -0.03, 0.4, 0.1, 0.004, { uv: "keep" });
  if (backPanel) {
    box("impPaintedMetal", 0, h + 0.75, d / 2 - 0.03, w, 1.3, 0.06, { color: IMP.wallDark, texel: 1 });
    box("impPanel1", 0, h + 0.75, d / 2 - 0.065, w - 0.2, 1.1, 0.01, { color: IMP.wallMid, uv: "keep" });
    for (let i = 0; i < 7; i++) {
      const tx = -w / 2 + 0.3 + (i / 6) * (w - 0.6);
      const th = 0.25 + rand() * 0.4;
      box("impMetal", tx, h + 0.9 - th / 2 + 0.25, d / 2 - 0.09, 0.05 + rand() * 0.05, th, 0.03, { color: rand() < 0.6 ? IMP.steel : IMP.gunmetal });
      if (rand() < 0.5) box("impMetal", tx, h + 1.15, d / 2 - 0.09, 0.16, 0.06, 0.04, { color: IMP.red });
    }
    box("impPaintedMetal", 0, h + 1.45, d / 2 - 0.2, w, 0.08, 0.4, { color: IMP.trim, texel: 1 });
    box("lightBand", 0, h + 1.4, d / 2 - 0.2, w - 0.2, 0.01, 0.3, { uv: "keep" });
  }
  collider(-w / 2, 0, -d / 2, w / 2, h + 0.2, d / 2, "bench");
}

// I-beam between two points (axis-aligned: x, y or z). h = section height, w = flange width.
export function ibeam(kit, a, b, opts = {}) {
  const { h = 0.6, w = 0.3, t = 0.06, color = IMP.trim, mat = "impPaintedMetal" } = opts;
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const ax = Math.abs(d[0]) > 0.5 * len ? "x" : Math.abs(d[1]) > 0.5 * len ? "y" : "z";
  const sz = (along, up, side) => (ax === "x" ? [along, up, side] : ax === "y" ? [up, along, side] : [side, up, along]);
  const off = (up) => (ax === "y" ? [up, 0, 0] : [0, up, 0]);
  const f1 = sz(len, t, w);
  const wb = sz(len, h - 2 * t, t);
  const o = off(h / 2 - t / 2);
  kit.box(mat, mid[0] + o[0], mid[1] + o[1], mid[2] + o[2], f1[0], f1[1], f1[2], { color, texel: 1 });
  kit.box(mat, mid[0] - o[0], mid[1] - o[1], mid[2] - o[2], f1[0], f1[1], f1[2], { color, texel: 1 });
  kit.box(mat, mid[0], mid[1], mid[2], wb[0], wb[1], wb[2], { color, texel: 1 });
}

// Low kerb with a hazard-striped top along a segment from -> to ([x,z]) at floor y.
export function hazardKerb(kit, from, to, y, opts = {}) {
  const { w = 0.32, h = 0.12 } = opts;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.05) return;
  const yaw = Math.atan2(-dz, dx);
  const q = yawQ(yaw);
  const mid = [from[0] + dx / 2, from[1] + dz / 2];
  kit.add("impPaintedMetal", new THREE.BoxGeometry(L, h, w), { pos: [mid[0], y + h / 2, mid[1]], quat: q, color: IMP.trim, texel: 1 });
  const g = new THREE.PlaneGeometry(L, w - 0.04);
  g.rotateX(-Math.PI / 2);
  kit.add("hazard", g, { pos: [mid[0], y + h + 0.004, mid[1]], quat: q, uv: "scale", uvScale: [L / 0.6, 1] });
}

// Hazard-striped band on a vertical face: centre pos, length along yaw, height
export function hazardBand(kit, pos, yaw, len, h) {
  const g = new THREE.PlaneGeometry(len, h);
  kit.add("hazard", g, { pos, quat: yawQ(yaw), uv: "scale", uvScale: [len / 0.6, 1] });
}

// Stencil decal on the floor (facing up). idx: impDecal cell, yaw: rotation about y.
export function floorDecal(kit, x, y, z, size, idx, yaw = 0) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("impDecal", g, { pos: [x, y + 0.006, z], uv: "keep", uvRect: impDecalRect(idx) });
}
// Deck-marking quad (yellow lanes / hatch / numerals) on the floor. w along local x, d along z.
export function deckMark(kit, x, y, z, w, d, idx, yaw = 0) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("deckMarks", g, { pos: [x, y + 0.005, z], uv: "keep", uvRect: deckMarkRect(idx) });
}
// Dark drip stain on a horizontal surface (or a wall when normal is given as [nx,ny,nz]).
export function stain(kit, pos, size, opts = {}) {
  const { normal = [0, 1, 0], rot = 0, aspect = 1 } = opts;
  const g = new THREE.PlaneGeometry(size, size * aspect);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal).normalize());
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rot);
  kit.add("stain", g, { pos: [pos[0] + normal[0] * 0.01, pos[1] + normal[1] * 0.01, pos[2] + normal[2] * 0.01], quat: q.multiply(spin), uv: "keep" });
}

// Handwheel valve on a pipe: pos = wheel centre, normal axis 'x'|'y'|'z' (axis of the wheel), r radius.
export function valve(kit, pos, r = 0.22, axis = "y", opts = {}) {
  // dir: which way the stem leaves the wheel along the axis (+1 = toward -axis, the default)
  const { color = IMP.red, stem = 0.25, dir = 1 } = opts;
  const rot = axis === "y" ? [Math.PI / 2, 0, 0] : axis === "x" ? [0, Math.PI / 2, 0] : [0, 0, 0];
  // 6 x 18: a hexagonal cross-section on a 3 cm tube is invisible past arm's length, and the eng deck
  // has ~90 of these wheels
  kit.add("impPaintedMetal", new THREE.TorusGeometry(r, 0.03, 6, 18), { pos, rot, color, uv: "scale", uvScale: [4, 1] });
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  for (let i = 0; i < 3; i++) {
    const sq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (i / 3) * Math.PI));
    kit.add("impPaintedMetal", new THREE.BoxGeometry(r * 2, 0.04, 0.03), { pos, quat: sq, color });
  }
  // hub + stem along the axis
  const stemLen = stem;
  const cAxis = axis;
  kit.cyl("impMetal", pos[0], pos[1], pos[2], 0.06, 0.08, cAxis, { color: IMP.steel, segments: 10 });
  const so = (-dir * stemLen) / 2;
  const off = axis === "y" ? [0, so, 0] : axis === "x" ? [so, 0, 0] : [0, 0, so];
  kit.cyl("impMetal", pos[0] + off[0], pos[1] + off[1], pos[2] + off[2], 0.035, stemLen, cAxis, { color: IMP.gunmetal, segments: 8 });
}

// Pipe flange collar: at pos on a pipe of radius r running along axis
export function flange(kit, pos, r, axis = "y", opts = {}) {
  const { color = IMP.trim, t = 0.1 } = opts;
  kit.cyl("impPaintedMetal", pos[0], pos[1], pos[2], r + 0.08, t, axis, { color, segments: 14 });
}

// Warning beacon: black post, guard cage, red dome and a pulsing red light descriptor (returned so the
// room can animate `desc.dim`).
export function beacon(kit, ctx, pos, opts = {}) {
  const { h = 2.3, color = 0xff2a1a, mat = "emitRed", intensity = 2.2, distance = 9, priority = 0, light = true } = opts;
  const [x, y, z] = pos;
  kit.cyl("impPaintedMetal", x, y + 0.03, z, 0.22, 0.06, "y", { color: IMP.trim, segments: 12 });
  kit.cyl("impMetal", x, y + h / 2, z, 0.05, h - 0.3, "y", { color: IMP.gunmetal, segments: 8 });
  kit.box("impPaintedMetal", x, y + h - 0.25, z, 0.34, 0.1, 0.34, { color: IMP.trim, texel: 1 });
  kit.add(mat, new THREE.SphereGeometry(0.16, 12, 8), { pos: [x, y + h - 0.05, z] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.add("impMetal", new THREE.BoxGeometry(0.02, 0.36, 0.02), { pos: [x + Math.cos(a) * 0.2, y + h - 0.05, z + Math.sin(a) * 0.2], color: IMP.steel });
  }
  kit.box("impMetal", x, y + h + 0.13, z, 0.3, 0.02, 0.3, { color: IMP.steel });
  kit.collider([x - 0.22, y, z - 0.22], [x + 0.22, y + h, z + 0.22], "beacon");
  return light ? pointLightDesc(ctx, color, intensity, distance, [x, y + h + 0.1, z], priority) : null;
}

// Power transformer / capacitor block: dark housing, cooling fins on two faces, insulator stack on top,
// amber status slit and a stencil. pos = floor centre, size [w,h,d], yaw.
export function transformer(kit, pos, size, opts = {}) {
  const { yaw = 0, seed = 1, fins = 7, tone = IMP.wallDark, collide = true, insulators = 3 } = opts;
  const [w, h, d] = size;
  const rand = rng(seed);
  const { box, cyl, collider } = local(kit, pos, yaw);
  box("impPaintedMetal", 0, 0.1, 0, w - 0.2, 0.2, d - 0.2, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, h / 2 + 0.1, 0, w, h - 0.2, d, { color: tone, texel: 1 });
  box("impMetal", 0, h + 0.03, 0, w + 0.06, 0.08, d + 0.06, { color: IMP.trim });
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < fins; i++) {
      const z = -d / 2 + 0.25 + (i / (fins - 1)) * (d - 0.5);
      box("impMetal", s * (w / 2 + 0.12), h * 0.5, z, 0.24, h * 0.7, 0.05, { color: IMP.gunmetal });
    }
  }
  for (let i = 0; i < insulators; i++) {
    const x = -w / 2 + ((i + 0.5) / insulators) * w;
    for (let k = 0; k < 3; k++) cyl("impPaintedMetal", x, h + 0.25 + k * 0.22, 0, 0.16 - k * 0.02, 0.1, "y", { color: IMP.consoleDark, segments: 12 });
    cyl("impMetal", x, h + 0.45, 0, 0.05, 0.9, "y", { color: IMP.steel, segments: 8 });
    box("impMetal", x, h + 0.92, 0, 0.3, 0.06, 0.2, { color: IMP.steel });
  }
  box("emitAmber", 0, h * 0.72, d / 2 + 0.004, w * 0.5, 0.05, 0.008);
  box("darkGloss", -w * 0.25, h * 0.4, d / 2 + 0.004, 0.5, 0.3, 0.008);
  box("blinkSparse", -w * 0.25, h * 0.4, d / 2 + 0.01, 0.4, 0.2, 0.004, { uv: "keep" });
  const g = new THREE.PlaneGeometry(0.5, 0.5);
  const lp = new THREE.Vector3(w * 0.25, h * 0.4, d / 2 + 0.006).applyQuaternion(yawQ(yaw)).add(new THREE.Vector3(...pos));
  kit.add("impDecal", g, { pos: [lp.x, lp.y, lp.z], quat: yawQ(yaw), uv: "keep", uvRect: impDecalRect([1, 10, 13][Math.floor(rand() * 3)]) });
  if (collide) collider(-w / 2 - 0.3, 0, -d / 2, w / 2 + 0.3, h + 1, d / 2, "transformer");
}

// Vertical storage tank: body, domed top, base skirt, bands, manway, sight-gauge with a glowing fill
// level, a drain nozzle with a valve and a stencil. pos = floor centre.
export function tank(kit, pos, r, h, opts = {}) {
  const { color = IMP.steel, level = 0.6, gaugeColor = "emitGreen", label = 9, collide = true, ladder: withLadder = true, seed = 1 } = opts;
  const [x, y, z] = pos;
  kit.cyl("impPaintedMetal", x, y + 0.2, z, r + 0.12, 0.4, "y", { color: IMP.trim, segments: 28 });
  kit.cyl("impMetal", x, y + 0.4 + (h - 0.4) / 2, z, r, h - 0.4, "y", { color, segments: 28, texel: 0.5 });
  const dome = new THREE.SphereGeometry(r, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.35, 1);
  kit.add("impMetal", dome, { pos: [x, y + h, z], color, uv: "scale", uvScale: [4, 1] });
  for (const f of [0.3, 0.62, 0.92]) kit.cyl("impPaintedMetal", x, y + h * f, z, r + 0.04, 0.16, "y", { color: IMP.trim, segments: 28 });
  // manway + top vent
  kit.cyl("impPaintedMetal", x + r * 0.4, y + h + r * 0.3, z, 0.42, 0.25, "y", { color: IMP.trim, segments: 16 });
  kit.cyl("impMetal", x - r * 0.4, y + h + r * 0.35 + 0.4, z, 0.1, 0.8, "y", { color: IMP.gunmetal, segments: 8 });
  // sight gauge on the -z face
  const gz = z - r - 0.1;
  kit.box("impPaintedMetal", x, y + h * 0.5, gz, 0.26, h * 0.7 + 0.2, 0.12, { color: IMP.trim, texel: 1 });
  kit.box("glassDark", x, y + h * 0.5, gz - 0.07, 0.14, h * 0.7, 0.03);
  const fillH = h * 0.7 * level;
  kit.box(gaugeColor, x, y + h * 0.15 + fillH / 2, gz - 0.065, 0.1, fillH, 0.02);
  for (let i = 0; i <= 5; i++) kit.box("impMetal", x + 0.11, y + h * 0.15 + (i / 5) * h * 0.7, gz - 0.06, 0.06, 0.015, 0.01, { color: IMP.steel });
  kit.box("darkGloss", x, y + h * 0.85 + 0.25, gz - 0.07, 0.24, 0.2, 0.02);
  kit.box("blinkSparse", x, y + h * 0.85 + 0.25, gz - 0.082, 0.2, 0.14, 0.004, { uv: "keep" });
  // drain nozzle + valve
  kit.cyl("impMetal", x, y + 0.7, z - r - 0.35, 0.12, 0.7, "z", { color: IMP.gunmetal, segments: 10 });
  flange(kit, [x, y + 0.7, z - r - 0.05], 0.12, "z");
  valve(kit, [x, y + 0.7 + 0.32, z - r - 0.5], 0.2, "y");
  // label
  const g = new THREE.PlaneGeometry(1.0, 1.0);
  kit.add("impDecal", g, { pos: [x + r * 0.6, y + h * 0.5, z - r * 0.8 - 0.004], rot: [0, -Math.PI * 0.2, 0], uv: "keep", uvRect: impDecalRect(label) });
  if (withLadder) ladder(kit, x + r + 0.25, z, y, y + h + 0.3, "-x");
  if (collide) kit.collider([x - r - 0.2, y, z - r - 0.6], [x + r + 0.45, y + h, z + r + 0.2], "tank");
  return { r, h };
}

// Maintenance ladder against a surface: rails + rungs. facing: side the climber stands on.
export function ladder(kit, x, z, y0, y1, facing = "-x") {
  const h = y1 - y0;
  const n = Math.max(2, Math.floor(h / 0.3));
  const dx = facing === "-x" ? -0.12 : facing === "+x" ? 0.12 : 0;
  const dz = facing === "-z" ? -0.12 : facing === "+z" ? 0.12 : 0;
  const along = dx !== 0 ? "z" : "x";
  for (const s of [-1, 1]) {
    const px = along === "z" ? x : x + s * 0.22;
    const pz = along === "z" ? z + s * 0.22 : z;
    kit.box("impMetal", px, y0 + h / 2, pz, 0.05, h, 0.05, { color: IMP.gunmetal });
  }
  for (let i = 1; i <= n; i++) {
    const ry = y0 + (i / (n + 0.5)) * h;
    kit.box("impMetal", x, ry, z, along === "x" ? 0.44 : 0.03, 0.03, along === "z" ? 0.44 : 0.03, { color: IMP.steel });
  }
  // stand-offs to the surface
  for (const ry of [y0 + 0.4, y1 - 0.4]) kit.box("impPaintedMetal", x - dx * 0.5, ry, z - dz * 0.5, dx !== 0 ? 0.14 : 0.5, 0.05, dz !== 0 ? 0.14 : 0.5, { color: IMP.trim });
}

// Pump set on a skid: motor + coupling + pump housing with suction / discharge flanges. Axis along
// local x; yaw rotates. pos = floor centre. Returns the world positions of the two nozzles.
export function pump(kit, pos, yaw = 0, opts = {}) {
  const { scale = 1, color = IMP.gunmetal, seed = 1, collide = true } = opts;
  const s = scale;
  const { box, cyl, collider, L } = local(kit, pos, yaw);
  box("impPaintedMetal", 0, 0.1 * s, 0, 2.6 * s, 0.2 * s, 1.1 * s, { color: IMP.trim, texel: 1 });
  hazardBand(kit, L(0, 0.1 * s, 0.56 * s).toArray(), yaw, 2.4 * s, 0.14 * s);
  // motor
  cyl("impMetal", -0.7 * s, 0.6 * s, 0, 0.36 * s, 1.2 * s, "x", { color, segments: 16 });
  for (let i = 0; i < 5; i++) cyl("impPaintedMetal", -1.1 * s + i * 0.2 * s, 0.6 * s, 0, 0.4 * s, 0.05 * s, "x", { color: IMP.trim, segments: 16 });
  box("impPaintedMetal", -0.7 * s, 1.0 * s, 0, 0.5 * s, 0.22 * s, 0.4 * s, { color: IMP.trim, texel: 1 });
  box("emitGreen", -0.7 * s, 1.0 * s, 0.205 * s, 0.14 * s, 0.05 * s, 0.01);
  // coupling guard
  box("impPaintedMetal", 0.05 * s, 0.6 * s, 0, 0.3 * s, 0.5 * s, 0.5 * s, { color: IMP.hazardYellow, texel: 1 });
  // pump housing (volute) + nozzles
  cyl("impMetal", 0.6 * s, 0.6 * s, 0, 0.42 * s, 0.6 * s, "x", { color: IMP.steel, segments: 18 });
  cyl("impMetal", 1.05 * s, 0.6 * s, 0, 0.22 * s, 0.35 * s, "x", { color: IMP.steel, segments: 12 });
  flange(kit, L(1.2 * s, 0.6 * s, 0).toArray(), 0.22 * s, "x");
  cyl("impMetal", 0.6 * s, 1.15 * s, 0, 0.18 * s, 0.5 * s, "y", { color: IMP.steel, segments: 12 });
  flange(kit, L(0.6 * s, 1.38 * s, 0).toArray(), 0.18 * s, "y");
  // feet
  for (const fx of [-1.1, -0.3, 0.6]) box("impPaintedMetal", fx * s, 0.3 * s, 0, 0.3 * s, 0.2 * s, 0.9 * s, { color: IMP.trim, texel: 1 });
  if (collide) collider(-1.3 * s, 0, -0.55 * s, 1.3 * s, 1.4 * s, 0.55 * s, "pump");
  return { suction: L(1.3 * s, 0.6 * s, 0).toArray(), discharge: L(0.6 * s, 1.4 * s, 0).toArray(), q: yawQ(yaw) };
}

// Air-scrubber cabinet: tall body, a stack of filter drawers with handles, a fan grille, status
// lights and a stencil. pos = floor centre of the front face's footprint, yaw 0 => front faces +z.
export function cabinet(kit, pos, yaw, size, opts = {}) {
  const { seed = 1, tone = IMP.wallMid, drawers = 5, fan = true, collide = true } = opts;
  const [w, h, d] = size;
  const rand = rng(seed);
  const { box, cyl, collider } = local(kit, pos, yaw);
  box("impPaintedMetal", 0, 0.08, 0, w - 0.1, 0.16, d - 0.1, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, h / 2, 0, w, h, d, { color: tone, texel: 1 });
  for (const sx of [-1, 1]) box("impPaintedMetal", sx * (w / 2 - 0.05), h / 2, 0, 0.1, h + 0.02, d + 0.02, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, h + 0.02, 0, w + 0.02, 0.06, d + 0.02, { color: IMP.trim, texel: 1 });
  const zf = d / 2 + 0.005;
  const fanH = fan ? w * 0.75 : 0;
  const drawerZone = h - 0.5 - fanH;
  const dh = drawerZone / drawers;
  for (let i = 0; i < drawers; i++) {
    const cy = 0.3 + dh * (i + 0.5);
    box("impPanel1", 0, cy, zf + 0.01, w - 0.3, dh - 0.06, 0.02, { color: IMP.wallDark, uv: "keep" });
    box("impMetal", 0, cy, zf + 0.03, w * 0.35, 0.04, 0.03, { color: IMP.steel });
    // vent slots on every other drawer
    if (i % 2 === 0) for (let k = 0; k < 3; k++) box("impPaintedMetal", -w * 0.28 + k * 0.12, cy, zf + 0.022, 0.03, dh * 0.5, 0.005, { color: IMP.trim });
    box(rand() < 0.8 ? "emitGreen" : "emitAmber", w / 2 - 0.25, cy, zf + 0.022, 0.05, 0.025, 0.01);
  }
  if (fan) {
    const fy = h - 0.25 - fanH / 2;
    const fr = fanH / 2 - 0.05;
    box("impPaintedMetal", 0, fy, zf + 0.01, w - 0.3, fanH, 0.02, { color: IMP.consoleDark, texel: 1 });
    cyl("impMetal", 0, fy, zf + 0.05, fr, 0.06, "z", { color: IMP.trim, segments: 20, open: true });
    cyl("impMetal", 0, fy, zf + 0.05, 0.12, 0.08, "z", { color: IMP.steel, segments: 12 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const q = yawQ(yaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a));
      const p = new THREE.Vector3(Math.cos(a) * fr * 0.5, fy + Math.sin(a) * fr * 0.5, zf + 0.05).applyQuaternion(yawQ(yaw)).add(new THREE.Vector3(...pos));
      kit.add("impMetal", new THREE.BoxGeometry(fr * 0.9, fr * 0.32, 0.02), { pos: [p.x, p.y, p.z], quat: q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5)), color: IMP.gunmetal });
    }
    for (let k = 0; k < 3; k++) box("impMetal", 0, fy - fr + 0.15 + k * fr * 0.85, zf + 0.09, fr * 2, 0.025, 0.02, { color: IMP.steel });
  }
  box("darkGloss", -w * 0.2, h - 0.15, zf + 0.01, 0.4, 0.14, 0.01);
  box("blinkSparse", -w * 0.2, h - 0.15, zf + 0.018, 0.34, 0.1, 0.004, { uv: "keep" });
  const g = new THREE.PlaneGeometry(0.34, 0.34);
  const lp = new THREE.Vector3(w * 0.25, h - 0.15, zf + 0.022).applyQuaternion(yawQ(yaw)).add(new THREE.Vector3(...pos));
  kit.add("impDecal", g, { pos: [lp.x, lp.y, lp.z], quat: yawQ(yaw), uv: "keep", uvRect: impDecalRect([0, 3, 6, 15][Math.floor(rand() * 4)]) });
  if (collide) collider(-w / 2, 0, -d / 2, w / 2, h, d / 2 + 0.05, "cabinet");
}

// Waste hopper: square inverted-pyramid bin on four legs, top collar, discharge chute + motor.
export function hopper(kit, pos, size, opts = {}) {
  const { yaw = 0, color = IMP.gunmetal, collide = true } = opts;
  const [w, h] = size;
  const { box, cyl, collider } = local(kit, pos, yaw);
  const legH = h * 0.45;
  const binH = h * 0.55;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("impPaintedMetal", sx * (w / 2 - 0.1), (legH + binH * 0.5) / 2, sz * (w / 2 - 0.1), 0.14, legH + binH * 0.5, 0.14, { color: IMP.trim, texel: 1 });
  const cone = new THREE.CylinderGeometry((w / 2) * Math.SQRT2, 0.35, binH, 4, 1, false);
  cone.rotateY(Math.PI / 4);
  const p = new THREE.Vector3(0, legH + binH / 2, 0).applyQuaternion(yawQ(yaw)).add(new THREE.Vector3(...pos));
  kit.add("impMetal", cone, { pos: [p.x, p.y, p.z], quat: yawQ(yaw), color, uv: "world", texel: 0.5 });
  box("impPaintedMetal", 0, legH + binH + 0.3, 0, w + 0.1, 0.6, w + 0.1, { color: IMP.wallDark, texel: 1 });
  box("impMetal", 0, legH + binH + 0.62, 0, w + 0.14, 0.06, w + 0.14, { color: IMP.trim });
  hazardBand(kit, new THREE.Vector3(0, legH + binH + 0.3, w / 2 + 0.06).applyQuaternion(yawQ(yaw)).add(new THREE.Vector3(...pos)).toArray(), yaw, w * 0.8, 0.2);
  // discharge chute to the side + motor
  cyl("impMetal", 0, legH * 0.5, 0, 0.28, legH * 0.6, "y", { color: IMP.steel, segments: 12 });
  cyl("impMetal", 0.55, legH * 0.28, 0, 0.28, 1.1, "x", { color: IMP.steel, segments: 12 });
  cyl("impMetal", 1.2, legH * 0.28, 0, 0.32, 0.5, "x", { color: IMP.gunmetal, segments: 12 });
  box("impPaintedMetal", 1.2, legH * 0.28 + 0.4, 0, 0.3, 0.2, 0.3, { color: IMP.trim, texel: 1 });
  box("emitAmber", 1.2, legH * 0.28 + 0.4, 0.16, 0.12, 0.04, 0.01);
  if (collide) collider(-w / 2, 0, -w / 2, w / 2 + 1.2, h + 0.6, w / 2, "hopper");
}

// Wheeled tool cart: yellow drawer body, trim top, three drawer pulls, rubber wheels, a handle.
export function toolCart(kit, pos, yaw = 0, opts = {}) {
  const { color = IMP.hazardYellow, seed = 1 } = opts;
  const rand = rng(seed);
  const { box, cyl, collider } = local(kit, pos, yaw);
  box("impPaintedMetal", 0, 0.5, 0, 0.9, 0.7, 0.6, { color, texel: 1 });
  box("impPaintedMetal", 0, 0.9, 0, 0.94, 0.06, 0.64, { color: IMP.trim, texel: 1 });
  for (let d = 0; d < 3; d++) box("impMetal", 0, 0.3 + d * 0.2, 0.31, 0.6, 0.03, 0.02, { color: IMP.steel });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl("impRubber", sx * 0.35, 0.1, sz * 0.22, 0.1, 0.06, "x", { color: IMP.rubber, segments: 10 });
  box("impMetal", 0, 1.0, -0.2, 0.4, 0.14, 0.14, { color: IMP.gunmetal });
  // odds and ends on the top tray
  box("impMetal", -0.25, 0.96, 0.1, 0.3, 0.06, 0.12, { color: IMP.steel });
  cyl("impMetal", 0.2, 0.98, 0.12, 0.05, 0.4, "x", { color: IMP.gunmetal, segments: 8 });
  if (rand() < 0.7) box("emitAmber", 0.3, 0.95, -0.15, 0.1, 0.04, 0.1);
  collider(-0.5, 0, -0.35, 0.5, 1.0, 0.35, "cart");
}

// Overhead crane runway rails: two I-beams along `axis` at height y on wall brackets.
export function craneRails(kit, a0, a1, side0, side1, y, axis = "z", opts = {}) {
  const { h = 0.7, w = 0.36, brackets = true, bracketPitch = 8, toWall = 0, mat = "impPaintedMetal", color = IMP.trim } = opts;
  for (const s of [side0, side1]) {
    if (axis === "z") ibeam(kit, [s, y, a0], [s, y, a1], { h, w, mat, color });
    else ibeam(kit, [a0, y, s], [a1, y, s], { h, w, mat, color });
    if (brackets) {
      const dir = s === side0 ? -1 : 1;
      for (let t = a0 + 1; t < a1; t += bracketPitch) {
        const bx = axis === "z" ? s : t;
        const bz = axis === "z" ? t : s;
        // knee bracket to the wall (toWall = distance from rail to the wall face)
        if (axis === "z") kit.box("impPaintedMetal", bx + (dir * toWall) / 2, y - h / 2 - 0.2, bz, toWall + 0.3, 0.4, 0.5, { color: IMP.trim, texel: 1 });
        else kit.box("impPaintedMetal", bx, y - h / 2 - 0.2, bz + (dir * toWall) / 2, 0.5, 0.4, toWall + 0.3, { color: IMP.trim, texel: 1 });
      }
    }
  }
}

// Crane bridge assembly built in local coordinates (span along local x, centred), trolley at x = tx,
// hook hanging `drop` below the bridge. `k` is any Kit (room kit with offsets baked, or a mini kit).
export function craneBridge(k, span, y, z, opts = {}) {
  // mat: girder material; the painted yellow reads cleanest on the map-less impMatte (the worn-metal
  // albedo of impPaintedMetal shows through bright paint as a mottle)
  const { tx = 0, drop = 3, girder = 0.9, color = IMP.hazardYellow, cx = 0, lamp = true, bands = true, mat = "impPaintedMetal" } = opts;
  // with a map-less girder material the trucks, trolley and hoist gear take it too, so an animated
  // bridge in its own mini kit is a single batch (they hang 6+ m up, where the maps never read)
  const dark = mat === "impPaintedMetal" ? "impPaintedMetal" : mat;
  const metal = mat === "impPaintedMetal" ? "impMetal" : mat;
  const X = (x) => cx + x;
  ibeam(k, [X(-span / 2), y, z - 0.6], [X(span / 2), y, z - 0.6], { h: girder, w: 0.4, color, mat });
  ibeam(k, [X(-span / 2), y, z + 0.6], [X(span / 2), y, z + 0.6], { h: girder, w: 0.4, color, mat });
  for (const s of [-1, 1]) {
    k.box(dark, X((s * span) / 2), y - 0.15, z, 0.6, girder + 0.3, 1.9, { color: IMP.trim, texel: 1 });
    k.cyl(metal, X((s * span) / 2 + (s > 0 ? 0.35 : -0.35)), y - girder / 2 - 0.35, z - 0.6, 0.25, 0.3, "x", { color: IMP.gunmetal, segments: 12 });
    k.cyl(metal, X((s * span) / 2 + (s > 0 ? 0.35 : -0.35)), y - girder / 2 - 0.35, z + 0.6, 0.25, 0.3, "x", { color: IMP.gunmetal, segments: 12 });
    if (bands) hazardBand(k, [X((s * span) / 2), y - 0.15, z + 0.96], 0, 0.5, girder * 0.6);
  }
  for (let x = -span / 2 + 2; x < span / 2 - 1; x += 3) k.box(dark, X(x), y, z, 0.12, girder - 0.12, 1.2, { color: IMP.trim, texel: 1 });
  // trolley + hoist drum + cable + hook block
  k.box(dark, X(tx), y + girder / 2 + 0.35, z, 1.8, 0.7, 1.6, { color: IMP.trim, texel: 1 });
  k.cyl(metal, X(tx), y + girder / 2 + 0.4, z, 0.3, 1.0, "z", { color: IMP.gunmetal, segments: 14 });
  if (lamp) k.box("emitAmber", X(tx + 0.7), y + girder / 2 + 0.45, z + 0.81, 0.3, 0.06, 0.01);
  k.cyl(metal, X(tx), y - drop / 2, z, 0.03, drop, "y", { color: IMP.steel, segments: 6 });
  k.box(dark, X(tx), y - drop - 0.25, z, 0.5, 0.5, 0.3, { color, texel: 1 });
  k.add(metal, new THREE.TorusGeometry(0.28, 0.06, 8, 14, Math.PI * 1.4), { pos: [X(tx), y - drop - 0.75, z], rot: [0, 0, Math.PI * 0.8], color: IMP.steel, uv: "scale", uvScale: [2, 1] });
}

// Glowing energy conduit: translucent blue housing around an emissive rod between two points.
export function conduit(kit, a, b, r = 0.35, opts = {}) {
  const { core = "emitBlue", housing = "engGlassBlue", rings = true } = opts;
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  if (len < 1e-3) return;
  const mid = A.clone().addScaledVector(d, 0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, d.clone().normalize());
  kit.add(core, new THREE.CylinderGeometry(r * 0.45, r * 0.45, len, 10), { pos: mid.toArray(), quat: q, uv: "scale", uvScale: [1, len] });
  kit.add(housing, new THREE.CylinderGeometry(r, r, len, 14, 1, true), { pos: mid.toArray(), quat: q, uv: "scale", uvScale: [1, len] });
  if (rings) {
    const n = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) {
      const p = A.clone().addScaledVector(d, i / n);
      // (matte: the ring caps show through the glass housing, and polar UVs smear the metal maps on them)
      kit.add("impMatte", new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.16, 14), { pos: p.toArray(), quat: q, color: IMP.trim, uv: "scale", uvScale: [4, 0.2] });
    }
  }
}

// Open industrial stair with stringers under the treads (wraps impKit.stairs with open treads).
export function industrialStair(kit, ctx, from, dir, w, y0, y1, opts = {}) {
  const res = stairs(kit, ctx, from, dir, w, y0, y1, { open: true, riser: 0.2, tread: 0.28, tone: IMP.gunmetal, ...opts });
  const run = res.run;
  const rise = y1 - y0;
  const ux = dir[0];
  const uz = dir[1];
  const yaw = Math.atan2(-uz, ux);
  const q = yawQ(yaw);
  const len = Math.hypot(run, rise);
  const tilt = Math.atan2(rise, run) * (ux !== 0 ? Math.sign(ux) : Math.sign(uz));
  const tq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), tilt));
  const mid = [from[0] + (ux * run) / 2, from[1] + (uz * run) / 2];
  for (const s of [-1, 1]) {
    const sx = -uz * s * (w / 2 - 0.06);
    const sz = ux * s * (w / 2 - 0.06);
    kit.add("impPaintedMetal", new THREE.BoxGeometry(len, 0.42, 0.1), { pos: [mid[0] + sx, (y0 + y1) / 2 - 0.3, mid[1] + sz], quat: tq, color: IMP.trim, texel: 1 });
  }
  return res;
}

// Grated landing plate with a walkable + optional railing on given sides ('n','s','e','w')
export function landing(kit, ctx, x0, z0, x1, z1, y, rails = []) {
  kit.boxMM("impPaintedMetal", [x0, y - 0.14, z0], [x1, y - 0.02, z1], { color: IMP.trim, texel: 1 });
  const g = new THREE.PlaneGeometry(x1 - x0 - 0.06, z1 - z0 - 0.06);
  g.rotateX(-Math.PI / 2);
  kit.add("impGrate", g, { pos: [(x0 + x1) / 2, y - 0.008, (z0 + z1) / 2], uv: "scale", uvScale: [(x1 - x0) / 1.24, (z1 - z0) / 0.9], color: 0xffffff });
  walkable(ctx, x0, z0, x1, z1, y, "landing");
  for (const side of rails) {
    if (side === "n") railing(kit, [x0, z0 + 0.06], [x1, z0 + 0.06], y);
    if (side === "s") railing(kit, [x0, z1 - 0.06], [x1, z1 - 0.06], y);
    if (side === "w") railing(kit, [x0 + 0.06, z0], [x0 + 0.06, z1], y);
    if (side === "e") railing(kit, [x1 - 0.06, z0], [x1 - 0.06, z1], y);
  }
}

// Raised platform slab (walkable on top, collider on the sides), dark deck with trim + kick glow.
export function platform(kit, ctx, x0, z0, x1, z1, y0, y1, opts = {}) {
  const { glow = "emitAmber", tone = IMP.wallDark, tag = "platform", grate = false } = opts;
  kit.boxMM("impPaintedMetal", [x0, y0, z0], [x1, y1 - 0.12, z1], { color: IMP.trim, texel: 1 });
  if (grate) {
    kit.boxMM("impPaintedMetal", [x0, y1 - 0.12, z0], [x1, y1 - 0.02, z1], { color: IMP.trim, texel: 1 });
    const g = new THREE.PlaneGeometry(x1 - x0 - 0.1, z1 - z0 - 0.1);
    g.rotateX(-Math.PI / 2);
    kit.add("impGrate", g, { pos: [(x0 + x1) / 2, y1 - 0.008, (z0 + z1) / 2], uv: "scale", uvScale: [(x1 - x0) / 1.24, (z1 - z0) / 0.9], color: 0xffffff });
  } else kit.boxMM("impDeck", [x0, y1 - 0.12, z0], [x1, y1, z1], { color: tone, texel: 0.5 });
  kit.boxMM("impMetal", [x0 - 0.02, y1 - 0.03, z0 - 0.02], [x1 + 0.02, y1 + 0.005, z0 + 0.06], { color: IMP.steel });
  kit.boxMM("impMetal", [x0 - 0.02, y1 - 0.03, z1 - 0.06], [x1 + 0.02, y1 + 0.005, z1 + 0.02], { color: IMP.steel });
  kit.boxMM("impMetal", [x0 - 0.02, y1 - 0.03, z0], [x0 + 0.06, y1 + 0.005, z1], { color: IMP.steel });
  kit.boxMM("impMetal", [x1 - 0.06, y1 - 0.03, z0], [x1 + 0.02, y1 + 0.005, z1], { color: IMP.steel });
  if (glow) {
    const gy = y0 + Math.min(0.12, (y1 - y0) * 0.3);
    kit.boxMM(glow, [x0 + 0.2, gy, z0 - 0.02], [x1 - 0.2, gy + 0.02, z0 - 0.005]);
    kit.boxMM(glow, [x0 + 0.2, gy, z1 + 0.005], [x1 - 0.2, gy + 0.02, z1 + 0.02]);
    kit.boxMM(glow, [x0 - 0.02, gy, z0 + 0.2], [x0 - 0.005, gy + 0.02, z1 - 0.2]);
    kit.boxMM(glow, [x1 + 0.005, gy, z0 + 0.2], [x1 + 0.02, gy + 0.02, z1 - 0.2]);
  }
  walkable(ctx, x0, z0, x1, z1, y1, tag);
  kit.collider([x0, y0, z0], [x1, y1, z1], tag);
}

// Deck slab covering `box` minus the axis-aligned `cuts` ([x0,z0,x1,z1] each; may overlap). Emits one
// impDeck piece per uncovered cell of the x-sweep partition, so grated trenches can be seen into.
export function cutFloor(kit, box, y, cuts, opts = {}) {
  const { tone = IMP.wallDark, texel = 0.5 } = opts;
  const [X0, Z0, X1, Z1] = box;
  const xs = [...new Set([X0, X1, ...cuts.flatMap((c) => [c[0], c[2]])])].filter((x) => x >= X0 && x <= X1).sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    const xa = xs[i];
    const xb = xs[i + 1];
    if (xb - xa < 1e-4) continue;
    const xm = (xa + xb) / 2;
    const spans = cuts.filter((c) => c[0] < xm && c[2] > xm).map((c) => [Math.max(Z0, c[1]), Math.min(Z1, c[3])]).sort((a, b) => a[0] - b[0]);
    let z = Z0;
    for (const [c0, c1] of spans) {
      if (c0 > z + 1e-4) kit.boxMM("impDeck", [xa, y - 0.12, z], [xb, y, c0], { color: tone, texel });
      z = Math.max(z, c1);
    }
    if (Z1 > z + 1e-4) kit.boxMM("impDeck", [xa, y - 0.12, z], [xb, y, Z1], { color: tone, texel });
  }
}

// Grated service trench let into a cutFloor opening [x0,z0,x1,z1] at deck level y: dark bottom, side
// walls under the slab, an optional emissive strip and service pipes along the bottom, an impGrate
// flush with the deck and steel nosing over the edges. The deck above stays walkable.
export function trench(kit, box, y, opts = {}) {
  const { depth = 0.5, strip = "emitBlue", bottom = "impPaintedMetal", bottomColor = IMP.black, pipes = true, wall = IMP.wallDark } = opts;
  const [x0, z0, x1, z1] = box;
  const yb = y - depth;
  const along = x1 - x0 >= z1 - z0 ? "x" : "z";
  const L = along === "x" ? x1 - x0 : z1 - z0;
  const W = along === "x" ? z1 - z0 : x1 - x0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  kit.boxMM(bottom, [x0 - 0.06, yb - 0.08, z0 - 0.06], [x1 + 0.06, yb, z1 + 0.06], { color: bottomColor, texel: 1 });
  kit.boxMM("impPaintedMetal", [x0 - 0.06, yb, z0 - 0.06], [x0, y - 0.12, z1 + 0.06], { color: wall, texel: 1 });
  kit.boxMM("impPaintedMetal", [x1, yb, z0 - 0.06], [x1 + 0.06, y - 0.12, z1 + 0.06], { color: wall, texel: 1 });
  kit.boxMM("impPaintedMetal", [x0, yb, z0 - 0.06], [x1, y - 0.12, z0], { color: wall, texel: 1 });
  kit.boxMM("impPaintedMetal", [x0, yb, z1], [x1, y - 0.12, z1 + 0.06], { color: wall, texel: 1 });
  if (pipes && L > 2) {
    const o1 = -W * 0.26;
    const o2 = W * 0.23;
    const P = (o, yy, t) => (along === "x" ? [x0 + t, yy, cz + o] : [cx + o, yy, z0 + t]);
    pipeRun(kit, [P(o1, yb + 0.14, 0.3), P(o1, yb + 0.14, L - 0.3)], Math.min(0.12, W * 0.09), { color: IMP.steel, clamps: false });
    pipeRun(kit, [P(o2, yb + 0.1, 0.3), P(o2, yb + 0.1, L - 0.3)], Math.min(0.08, W * 0.06), { color: IMP.gunmetal, clamps: false });
  }
  if (strip) {
    for (let t = 0.4; t < L - 0.4; t += 3) {
      const seg = Math.min(2.6, L - 0.4 - t);
      if (along === "x") kit.box(strip, x0 + t + seg / 2, yb + 0.012, cz, seg, 0.02, 0.08);
      else kit.box(strip, cx, yb + 0.012, z0 + t + seg / 2, 0.08, 0.02, seg);
    }
  }
  const g = new THREE.PlaneGeometry(x1 - x0 - 0.04, z1 - z0 - 0.04);
  g.rotateX(-Math.PI / 2);
  kit.add("impGrate", g, { pos: [cx, y - 0.004, cz], uv: "scale", uvScale: [(x1 - x0) / 1.24, (z1 - z0) / 0.9], color: 0xffffff });
  kit.boxMM("impMetal", [x0 - 0.08, y, z0 - 0.08], [x0 + 0.05, y + 0.02, z1 + 0.08], { color: IMP.steel });
  kit.boxMM("impMetal", [x1 - 0.05, y, z0 - 0.08], [x1 + 0.08, y + 0.02, z1 + 0.08], { color: IMP.steel });
  kit.boxMM("impMetal", [x0, y, z0 - 0.08], [x1, y + 0.02, z0 + 0.05], { color: IMP.steel });
  kit.boxMM("impMetal", [x0, y, z1 - 0.05], [x1, y + 0.02, z1 + 0.08], { color: IMP.steel });
}

// Wall-mounted cable tray (open channel) along a wall frame at height v, from u0 to u1, standing off n.
export function cableTray(frame, u0, u1, v, opts = {}) {
  const { n = 0.35, w = 0.4, cables = 3 } = opts;
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  frame.box("impMetal", cu, v, n, len, 0.04, w, { color: IMP.gunmetal, texel: 1 });
  frame.box("impMetal", cu, v + 0.08, n - w / 2 + 0.02, len, 0.16, 0.04, { color: IMP.gunmetal, texel: 1 });
  frame.box("impMetal", cu, v + 0.08, n + w / 2 - 0.02, len, 0.16, 0.04, { color: IMP.gunmetal, texel: 1 });
  for (let i = 0; i < cables; i++) frame.cylU("impRubber", cu, v + 0.06, n - w / 2 + 0.08 + (i / Math.max(1, cables - 1)) * (w - 0.16), 0.035, len - 0.1, { color: [IMP.rubber, IMP.gunmetal, IMP.darkMetal][i % 3], segments: 8 });
  for (let u = u0 + 0.8; u < u1; u += 2.5) frame.box("impPaintedMetal", u, v - 0.02, n / 2, 0.08, 0.08, n, { color: IMP.trim });
}

// Vertical cable bundle drop along a wall frame from v0 up to v1 at u, standing off n
export function cableDrop(frame, u, v0, v1, opts = {}) {
  const { n = 0.1, count = 3 } = opts;
  for (let i = 0; i < count; i++) frame.cylV("impRubber", u - 0.06 * (count - 1) * 0.5 + i * 0.06, (v0 + v1) / 2, n, 0.03, v1 - v0, { color: i % 2 ? IMP.gunmetal : IMP.rubber, segments: 8 });
  for (let v = v0 + 0.5; v < v1; v += 1.2) frame.box("impPaintedMetal", u, v, n, 0.06 * count + 0.08, 0.06, 0.06, { color: IMP.trim });
}

// Grid of wall screens with a shared bezel plate (frame coords: centre u,v; cols x rows).
// opts.variants: screen indices to draw from (default the three blue layouts); opts.dark: fraction of
// cells left as switched-off glass; opts.wide: [[col,row], ...] cells that merge with their right-hand
// neighbour into one double-width display; opts.header: stencil + light strip across the top.
export function screenBank(frame, u, v, cols, rows, sw, sh, seed = 1, opts = {}) {
  const { variants = [0, 1, 2], dark = 0, wide = [], header = false } = opts;
  const rand = rng(seed);
  const gap = 0.12;
  const W = cols * sw + (cols + 1) * gap;
  const H = rows * sh + (rows + 1) * gap;
  frame.box("impPaintedMetal", u, v, 0.05, W, H, 0.08, { color: IMP.consoleDark, texel: 1 });
  const skip = new Set(wide.map(([c, r]) => (c + 1) + ":" + r));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (skip.has(i + ":" + j)) continue;
      const isWide = wide.some(([c, r]) => c === i && r === j) && i + 1 < cols;
      const cw = isWide ? sw * 2 + gap : sw;
      const cu = u - W / 2 + gap + cw / 2 + i * (sw + gap);
      const cv = v - H / 2 + gap + sh / 2 + j * (sh + gap);
      frame.box("darkGloss", cu, cv, 0.093, cw, sh, 0.01);
      if (rand() < dark) continue;
      // variants: screen indices or full material keys (e.g. "screenBars"), so a bank can mix the
      // authored displays a room already draws instead of adding screen3/4 batches
      const pick = variants[Math.floor(rand() * variants.length)];
      frame.box(typeof pick === "number" ? "screen" + pick : pick, cu, cv, 0.1, cw - 0.04, sh - 0.04, 0.004, { uv: "keep" });
    }
  }
  frame.box("leds", u, v - H / 2 - 0.1, 0.07, Math.min(W * 0.6, 2.4), 0.05, 0.01, { uv: "keep" });
  if (header) {
    frame.box("impPaintedMetal", u, v + H / 2 + 0.16, 0.05, W, 0.24, 0.08, { color: IMP.trim, texel: 1 });
    frame.box("lightBand", u, v + H / 2 + 0.16, 0.095, W - 0.6, 0.06, 0.01, { uv: "keep" });
    frame.quad("impDecal", u - W / 2 + 0.6, v + H / 2 + 0.16, 0.1, 0.36, 0.36, { uvRect: impDecalRect(11) });
  }
}

// Panel of dark boxes with tiny indicator lights standing off a wall frame (breaker / relay cabinet)
export function relayCabinet(frame, u, v0, v1, w, seed = 1) {
  const rand = rng(seed);
  const h = v1 - v0;
  frame.box("impPaintedMetal", u, (v0 + v1) / 2, 0.22, w, h, 0.44, { color: IMP.consoleDark, texel: 1 });
  frame.box("impMetal", u, (v0 + v1) / 2, 0.445, w - 0.2, h - 0.2, 0.01, { color: IMP.gunmetal });
  const rows = Math.max(2, Math.floor(h / 0.5));
  for (let r = 0; r < rows; r++) {
    const cv = v0 + 0.3 + r * ((h - 0.5) / rows);
    frame.box("impPaintedMetal", u, cv, 0.46, w - 0.4, 0.28, 0.02, { color: IMP.trim, texel: 1 });
    frame.box(rand() < 0.5 ? "blinkSparse" : "leds", u - w * 0.12, cv, 0.475, w * 0.5, 0.08, 0.004, { uv: "keep" });
    frame.box(rand() < 0.7 ? "emitAmber" : "emitRed", u + w * 0.3, cv, 0.475, 0.06, 0.06, 0.004);
  }
  frame.quad("impDecal", u + w * 0.25, v1 - 0.3, 0.472, 0.3, 0.3, { uvRect: impDecalRect(Math.floor(rand() * 16)) });
  frame.collider(u - w / 2, u + w / 2, v0, v1, 0, 0.5, "relay");
}

// ===========================================================================
// Review round 1 additions: guard rails for drops, cradle saddles, conduit collars, floor junction
// boxes, wall gauge clusters / valve manifolds / pipe trunks, upper-wall status boards, crisp hazard
// zones, field-generator cabinets and the holographic reactor schematic.
// ===========================================================================

// Guard rail for a drop: steel top rail, mid rail and a kick plate on painted posts with base plates
// and caps. Same segment interface as impKit.railing (from/to are [x,z] at floor y).
export function guardRail(kit, from, to, y, opts = {}) {
  const { h = 1.1, postPitch = 2.0, collide = true, tag = "rail", lit = false, kick = 0.15 } = opts;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.05) return;
  const yaw = Math.atan2(-dz, dx);
  const q = yawQ(yaw);
  const mid = [from[0] + dx / 2, from[1] + dz / 2];
  const bar = (mat, yy, sy, sz, color) => kit.add(mat, new THREE.BoxGeometry(L, sy, sz), { pos: [mid[0], y + yy, mid[1]], quat: q, color, texel: 1 });
  bar("impMetal", h, 0.06, 0.09, IMP.steel);
  bar("impMetal", h * 0.52, 0.05, 0.06, IMP.steel);
  bar("impPaintedMetal", kick / 2 + 0.01, kick, 0.03, IMP.trim);
  bar("impMetal", kick + 0.02, 0.02, 0.05, IMP.steel);
  if (lit) kit.add("emitBlue", new THREE.BoxGeometry(L - 0.2, 0.012, 0.03), { pos: [mid[0], y + h - 0.04, mid[1]], quat: q });
  const n = Math.max(2, Math.round(L / postPitch) + 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const px = from[0] + dx * t;
    const pz = from[1] + dz * t;
    kit.add("impPaintedMetal", new THREE.BoxGeometry(0.08, h, 0.08), { pos: [px, y + h / 2, pz], quat: q, color: IMP.trim, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(0.18, 0.02, 0.18), { pos: [px, y + 0.01, pz], quat: q, color: IMP.gunmetal });
    kit.add("impMetal", new THREE.BoxGeometry(0.11, 0.04, 0.11), { pos: [px, y + h + 0.02, pz], quat: q, color: IMP.steel });
  }
  if (collide) {
    const pad = 0.12;
    kit.collider([Math.min(from[0], to[0]) - pad, y, Math.min(from[1], to[1]) - pad], [Math.max(from[0], to[0]) + pad, y + h + 0.1, Math.max(from[1], to[1]) + pad], tag);
  }
}

// Cradle saddle for a horizontal drum of radius r whose axis runs along `axis` ('x'|'z') at height
// cy: a hazard-banded plinth on the deck, a pedestal and a thick saddle band hugging the underside of
// the drum, with bolt lugs closing the ends of the arc. pos = [x, floorY, z] under the axis.
export function saddle(kit, pos, r, cy, axis = "z", opts = {}) {
  const { w = 1.0, t = 0.28, arc = Math.PI * 0.72, plinth = [3.6, 0.3, 1.6], color = IMP.trim, hazard = true } = opts;
  const [x, y, z] = pos;
  const R = r + t;
  const bottom = cy - R;
  const along = (across, len) => (axis === "z" ? [across, len] : [len, across]);
  const [pw, ph, pd] = plinth;
  const [sx, sz] = along(pw, pd);
  kit.box("impPaintedMetal", x, y + ph / 2, z, sx, ph, sz, { color: IMP.wallDark, texel: 1 });
  kit.box("impMetal", x, y + ph + 0.02, z, sx + 0.04, 0.04, sz + 0.04, { color: IMP.steel });
  if (hazard) {
    if (axis === "z") {
      hazardBand(kit, [x, y + ph / 2, z + sz / 2 + 0.006], 0, sx - 0.2, ph - 0.06);
      hazardBand(kit, [x, y + ph / 2, z - sz / 2 - 0.006], Math.PI, sx - 0.2, ph - 0.06);
    } else {
      hazardBand(kit, [x + sx / 2 + 0.006, y + ph / 2, z], -Math.PI / 2, sz - 0.2, ph - 0.06);
      hazardBand(kit, [x - sx / 2 - 0.006, y + ph / 2, z], Math.PI / 2, sz - 0.2, ph - 0.06);
    }
  }
  const chord = 2 * R * Math.sin(arc / 2);
  const [px, pz] = along(chord * 0.7, w);
  const pedTop = bottom + t * 0.5;
  kit.box("impPaintedMetal", x, (y + ph + pedTop) / 2, z, px, pedTop - (y + ph), pz, { color, texel: 1 });
  // the band: a capped partial cylinder centred on the bottom of the drum (its inner faces lie inside it)
  const rot = axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2];
  const thetaC = axis === "z" ? 0 : -Math.PI / 2;
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(R, R, w, 20, 1, false, thetaC - arc / 2, arc), { pos: [x, cy, z], rot, color, uv: "scale", uvScale: [4, 1] });
  for (const s of [-1, 1]) {
    const a = arc / 2;
    const off = s * (r + t * 0.5) * Math.sin(a);
    const yy = cy - (r + t * 0.5) * Math.cos(a);
    const [lx, lz] = along(0.3, w + 0.1);
    if (axis === "z") kit.box("impMetal", x + off, yy, z, lx, 0.3, lz, { color: IMP.gunmetal, rot: [0, 0, -s * (Math.PI / 2 - a)] });
    else kit.box("impMetal", x, yy, z + off, lx, 0.3, lz, { color: IMP.gunmetal, rot: [s * (Math.PI / 2 - a), 0, 0] });
  }
}

// Torus collar with a bolted flange disc where a conduit or pipe of radius r meets a surface. axis is
// the conduit's axis at pos; the ring lies in the plane perpendicular to it.
export function collar(kit, pos, r, axis = "z", opts = {}) {
  const { color = IMP.trim, ring = 0.1, flange: fl = 0.08 } = opts;
  const rot = axis === "y" ? [Math.PI / 2, 0, 0] : axis === "x" ? [0, Math.PI / 2, 0] : [0, 0, 0];
  // map-less ring: the worn-metal maps wrapped round a 0.1 m tube read as wood grain at arm's length
  kit.add("impMatte", new THREE.TorusGeometry(r + ring, ring, 8, 24), { pos, rot, color, uv: "scale", uvScale: [6, 1] });
  // planar UVs on the flange: its flat faces are what the eye sees, and polar UVs smear the metal maps
  if (fl > 0) kit.cyl("impMetal", pos[0], pos[1], pos[2], r + ring * 2.2, fl, axis, { color: IMP.steel, segments: 24, uv: "world", texel: 1 });
}

// Floor-standing junction / distribution box: plinth, housing with a hinged louvred door, handle, a
// small instrument display and indicator strip, conduit stubs out of the top. yaw 0 => door faces +z.
export function junctionBox(kit, pos, yaw = 0, opts = {}) {
  // ok: material of the "healthy" indicator (rooms without another green emitter pass an amber/blue key
  // so the box does not cost them a draw call)
  const { w = 0.9, h = 1.5, d = 0.5, tone = IMP.consoleDark, seed = 1, stubs = 2, display = "screenBars", ok = "emitGreen" } = opts;
  const rand = rng(seed);
  const { box, cyl, collider, L } = local(kit, pos, yaw);
  box("impPaintedMetal", 0, 0.06, 0, w - 0.06, 0.12, d - 0.06, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, 0.12 + (h - 0.12) / 2, 0, w, h - 0.12, d, { color: tone, texel: 1 });
  box("impMetal", 0, h + 0.02, 0, w + 0.04, 0.04, d + 0.04, { color: IMP.trim });
  box("impPanel1", 0, h * 0.52, d / 2 + 0.008, w - 0.16, h - 0.4, 0.016, { color: IMP.wallMid, uv: "keep" });
  box("impMetal", -w / 2 + 0.1, h * 0.52, d / 2 + 0.02, 0.03, h - 0.5, 0.02, { color: IMP.steel });
  box("impMetal", w / 2 - 0.16, h * 0.5, d / 2 + 0.035, 0.04, 0.16, 0.03, { color: IMP.steel });
  for (let k = 0; k < 4; k++) box("impPaintedMetal", -w * 0.15, 0.4 + k * 0.06, d / 2 + 0.02, w * 0.4, 0.015, 0.01, { color: IMP.trim });
  box("darkGloss", 0, h - 0.32, d / 2 + 0.02, w - 0.3, 0.26, 0.01);
  box(display, 0, h - 0.32, d / 2 + 0.027, w - 0.34, 0.22, 0.004, { uv: "keep" });
  box("leds", -w * 0.1, h - 0.52, d / 2 + 0.022, w * 0.5, 0.04, 0.004, { uv: "keep" });
  box(rand() < 0.6 ? ok : "emitAmber", w * 0.3, h - 0.52, d / 2 + 0.022, 0.06, 0.04, 0.004);
  const lp = L(w * 0.25, 0.75, d / 2 + 0.025);
  kit.add("impDecal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [lp.x, lp.y, lp.z], quat: yawQ(yaw), uv: "keep", uvRect: impDecalRect([1, 10, 13, 5][Math.floor(rand() * 4)]) });
  for (let i = 0; i < stubs; i++) {
    const sx = -w / 2 + ((i + 0.5) / stubs) * w;
    cyl("impMetal", sx, h + 0.3, -d * 0.15, 0.06, 0.6, "y", { color: IMP.gunmetal, segments: 8 });
    cyl("impPaintedMetal", sx, h + 0.06, -d * 0.15, 0.1, 0.08, "y", { color: IMP.trim, segments: 10 });
  }
  collider(-w / 2, 0, -d / 2, w / 2, h, d / 2, "junction");
}

// Wall-mounted gauge cluster: a backing plate with a row of round dials (steel bezel, dark face, white
// scale ticks, red band, amber needle) fed by a small pipe manifold underneath, plus a stencil.
// lite: dials for high walls (5 m+ over the deck): no ticks or hub and coarser bezels, since a dial is
// 4 pieces instead of 10 and the reactor's upper walls carry 60 of them.
export function gaugeCluster(frame, u, v, opts = {}) {
  const { n = 3, r = 0.22, seed = 1, manifold = true, lite = false } = opts;
  const rand = rng(seed);
  const pitch = r * 2 + 0.16;
  const W = n * pitch + 0.2;
  const H = r * 2 + 0.36;
  const seg = lite ? 14 : 20;
  frame.box("impPaintedMetal", u, v, 0.04, W, H, 0.08, { color: IMP.consoleDark, texel: 1 });
  frame.box("impMetal", u, v + H / 2 - 0.02, 0.085, W, 0.03, 0.01, { color: IMP.steel });
  for (let i = 0; i < n; i++) {
    const cu = u - W / 2 + 0.1 + pitch * (i + 0.5);
    const cv = v + 0.06;
    frame.cylN("impMetal", cu, cv, 0.1, r, 0.06, { color: IMP.steel, segments: seg });
    frame.cylN("darkGloss", cu, cv, 0.135, r - 0.03, 0.01, { segments: seg });
    if (!lite) {
      for (let k = 0; k < 5; k++) {
        const a = Math.PI * 1.25 - (k / 4) * Math.PI * 1.5;
        frame.box("impMetal", cu + Math.cos(a) * (r - 0.07), cv + Math.sin(a) * (r - 0.07), 0.142, 0.025, 0.05, 0.004, { color: IMP.white, spin: a - Math.PI / 2 });
      }
    }
    const ra = -Math.PI * 0.2;
    frame.box("emitRed", cu + Math.cos(ra) * (r - 0.07), cv + Math.sin(ra) * (r - 0.07), 0.142, 0.03, 0.07, 0.004, { spin: ra - Math.PI / 2 });
    const na = Math.PI * 1.25 - rand() * Math.PI * 1.3;
    frame.box("emitAmber", cu + Math.cos(na) * (r - 0.1) * 0.5, cv + Math.sin(na) * (r - 0.1) * 0.5, 0.145, r - 0.1, 0.02, 0.004, { spin: na });
    if (!lite) frame.cylN("impMetal", cu, cv, 0.146, 0.025, 0.02, { color: IMP.steel, segments: 8 });
  }
  if (manifold) {
    const mv = v - H / 2 - 0.12;
    frame.cylU("impMetal", u, mv, 0.12, 0.05, W - 0.1, { color: IMP.steel, segments: 10 });
    for (let i = 0; i < n; i++) {
      const cu = u - W / 2 + 0.1 + pitch * (i + 0.5);
      frame.cylV("impMetal", cu, mv + 0.1, 0.12, 0.025, 0.24, { color: IMP.gunmetal, segments: 8 });
    }
    frame.cylV("impMetal", u - W / 2 + 0.1, mv - 0.3, 0.12, 0.05, 0.6, { color: IMP.steel, segments: 10 });
    frame.box("impPaintedMetal", u + W * 0.3, mv, 0.12, 0.14, 0.14, 0.14, { color: IMP.red, texel: 1 });
  }
  frame.quad("impDecal", u + W / 2 - 0.22, v - H / 2 + 0.14, 0.085, 0.22, 0.22, { uvRect: impDecalRect([1, 4, 10][Math.floor(rand() * 3)]) });
}

// Wall pipe manifold between u0 and u1 at height v: a header with n valved branches dropping to a
// lower header, flanges and wall brackets at the ends and a pressure gauge; handwheels face the room.
export function valveManifold(frame, u0, u1, v, opts = {}) {
  const { n = 3, r = 0.14, drop = 1.2, color = IMP.steel, seed = 1 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  const N = 0.3;
  frame.cylU("impMetal", cu, v, N, r, len, { color, segments: 14 });
  frame.cylU("impMetal", cu, v - drop, N, r * 0.8, len, { color: IMP.gunmetal, segments: 12 });
  for (const e of [u0 + 0.1, u1 - 0.1]) {
    frame.cylU("impPaintedMetal", e, v, N, r + 0.06, 0.1, { color: IMP.trim, segments: 14 });
    frame.box("impPaintedMetal", e, v - drop / 2, N * 0.5, 0.16, drop + 0.6, N, { color: IMP.trim, texel: 1 });
  }
  const kit = frame.kit;
  const axis = Math.abs(frame.N.x) > 0.5 ? "x" : "z";
  const dir = frame.N[axis] > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const bu = u0 + ((i + 0.5) / n) * len;
    frame.cylV("impMetal", bu, v - drop / 2, N, r * 0.6, drop - r, { color, segments: 10 });
    const p = frame.pos(bu, v - drop * 0.45, N + r * 0.6 + 0.16);
    valve(kit, [p.x, p.y, p.z], 0.16, axis, { color: rand() < 0.7 ? IMP.red : IMP.hazardYellow, stem: 0.2, dir });
  }
  const gu = u0 + len * 0.2;
  frame.cylN("impMetal", gu, v + r + 0.16, N + 0.02, 0.09, 0.05, { color: IMP.steel, segments: 14 });
  frame.cylN("darkGloss", gu, v + r + 0.16, N + 0.05, 0.07, 0.01, { segments: 14 });
  frame.box("emitAmber", gu + 0.02, v + r + 0.18, N + 0.056, 0.05, 0.012, 0.004, { spin: 0.6 });
  frame.cylV("impMetal", gu, v + r * 0.5 + 0.04, N, 0.02, r + 0.08, { color: IMP.steel, segments: 6 });
}

// Service trunk: 3-4 parallel pipes of mixed radius along a wall on shared brackets, flanges every few
// metres and handwheel valves on the main line.
export function pipeTrunk(frame, u0, u1, v, opts = {}) {
  const { n = 3, seed = 1, N = 0.4, valves = 2 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  const radii = [0.22, 0.14, 0.18, 0.1];
  const colors = [IMP.steel, IMP.gunmetal, IMP.steel, IMP.darkMetal];
  let vv = v;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const r = radii[i % 4];
    lines.push({ v: vv, r });
    frame.cylU("impMetal", cu, vv, N, r, len, { color: colors[i % 4], segments: 12 });
    for (let u = u0 + 3 + i * 1.3; u < u1 - 1; u += 7) frame.cylU("impPaintedMetal", u, vv, N, r + 0.05, 0.14, { color: IMP.trim, segments: 12 });
    vv += r + radii[(i + 1) % 4] + 0.16;
  }
  const H = vv - v;
  for (let u = u0 + 1; u < u1; u += 4) {
    frame.box("impPaintedMetal", u, v + H / 2 - 0.2, N / 2, 0.12, H + 0.4, N + 0.3, { color: IMP.trim, texel: 1 });
    frame.box("impMetal", u, v + H / 2 - 0.2, N + 0.28, 0.1, H + 0.2, 0.06, { color: IMP.steel });
  }
  // handwheels on the room side of the main line (the lines stack vertically, so nothing sits on top)
  const kit = frame.kit;
  const axis = Math.abs(frame.N.x) > 0.5 ? "x" : "z";
  const dir = frame.N[axis] > 0 ? 1 : -1;
  for (let k = 0; k < valves; k++) {
    const u = u0 + len * (0.25 + 0.5 * (valves > 1 ? k / (valves - 1) : 0.5)) + (rand() - 0.5);
    const p = frame.pos(u, lines[0].v, N + lines[0].r + 0.22);
    valve(kit, [p.x, p.y, p.z], 0.2, axis, { stem: 0.3, dir });
  }
}

// Upper-wall status board: header strip with a stencil and light band, authored displays, a lamp row
// and a short indicator strip. Sized w x h, centred at u, v.
export function statusBoard(frame, u, v, w, h, seed = 1, opts = {}) {
  // strip: the header light's material (rooms lit by lightBandCool / lightBandWarm pass their own key);
  // ok: the "healthy" indicator emitter (rooms with no other green emitter pass one they already draw)
  const { displays = ["screenBars", "screen1"], header = true, strip = "lightBand", ok = "emitGreen" } = opts;
  const rand = rng(seed);
  frame.box("impPaintedMetal", u, v, 0.05, w, h, 0.1, { color: IMP.consoleDark, texel: 1 });
  frame.box("impMetal", u, v, 0.1, w - 0.1, h - 0.1, 0.01, { color: IMP.gunmetal });
  if (header) {
    frame.box("impPaintedMetal", u, v + h / 2 - 0.15, 0.09, w, 0.26, 0.08, { color: IMP.trim, texel: 1 });
    frame.box(strip, u + 0.3, v + h / 2 - 0.15, 0.135, w - 1.2, 0.06, 0.01, { uv: "keep" });
    frame.quad("impDecal", u - w / 2 + 0.35, v + h / 2 - 0.15, 0.14, 0.3, 0.3, { uvRect: impDecalRect(Math.floor(rand() * 16)) });
  }
  const dh = h - 0.7;
  const dw = (w - 0.5) / displays.length;
  displays.forEach((d, i) => {
    const cu = u - w / 2 + 0.25 + dw * (i + 0.5);
    frame.box("darkGloss", cu, v - 0.05, 0.11, dw - 0.16, dh * 0.62, 0.01);
    frame.box(d, cu, v - 0.05, 0.117, dw - 0.2, dh * 0.62 - 0.04, 0.004, { uv: "keep" });
  });
  const lv = v - h / 2 + 0.22;
  for (let i = 0; i < 6; i++) {
    const cu = u - w / 2 + 0.4 + i * 0.3;
    const on = rand();
    frame.box(on < 0.5 ? ok : on < 0.8 ? "emitAmber" : "darkGloss", cu, lv, 0.115, 0.14, 0.1, 0.01);
  }
  frame.box("leds", u + w * 0.22, lv, 0.115, w * 0.4, 0.05, 0.004, { uv: "keep" });
}

// Crisp red / black hazard-striped work zone on the deck with a steel edge line. With `border` > 0
// only a striped band of that width is painted around the zone (a keep-clear outline), with a second
// edge line on its inner side.
export function hazardZone(kit, x0, z0, x1, z1, y, opts = {}) {
  const { edge = true, pitch = 0.9, border = 0 } = opts;
  const strip = (ax0, az0, ax1, az1) => {
    const g = new THREE.PlaneGeometry(ax1 - ax0, az1 - az0);
    g.rotateX(-Math.PI / 2);
    kit.add("hazardRed", g, { pos: [(ax0 + ax1) / 2, y + 0.006, (az0 + az1) / 2], uv: "scale", uvScale: [(ax1 - ax0) / pitch, (az1 - az0) / pitch] });
  };
  const outline = (ax0, az0, ax1, az1) => {
    kit.boxMM("impMetal", [ax0 - 0.04, y + 0.004, az0 - 0.04], [ax1 + 0.04, y + 0.012, az0 + 0.02], { color: IMP.steel });
    kit.boxMM("impMetal", [ax0 - 0.04, y + 0.004, az1 - 0.02], [ax1 + 0.04, y + 0.012, az1 + 0.04], { color: IMP.steel });
    kit.boxMM("impMetal", [ax0 - 0.04, y + 0.004, az0], [ax0 + 0.02, y + 0.012, az1], { color: IMP.steel });
    kit.boxMM("impMetal", [ax1 - 0.02, y + 0.004, az0], [ax1 + 0.04, y + 0.012, az1], { color: IMP.steel });
  };
  if (border > 0 && border * 2 < Math.min(x1 - x0, z1 - z0)) {
    strip(x0, z0, x1, z0 + border);
    strip(x0, z1 - border, x1, z1);
    strip(x0, z0 + border, x0 + border, z1 - border);
    strip(x1 - border, z0 + border, x1, z1 - border);
    if (edge) outline(x0 + border, z0 + border, x1 - border, z1 - border);
  } else strip(x0, z0, x1, z1);
  if (edge) outline(x0, z0, x1, z1);
}

// Field-generator cabinet on a wall frame: tall housing with a louvred coil window glowing blue, an
// insulator stack and bus bar on top, side vents, an instrument display, stencil and plinth band.
export function generatorCabinet(frame, u, w, h, d, seed = 1, opts = {}) {
  const { glow = "emitBlue", display = "screenBars" } = opts;
  const rand = rng(seed);
  frame.box("impPaintedMetal", u, 0.1, d / 2, w - 0.1, 0.2, d - 0.1, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", u, h / 2 + 0.1, d / 2, w, h - 0.2, d, { color: IMP.wallDark, texel: 1 });
  frame.box("impMetal", u, h + 0.03, d / 2, w + 0.06, 0.08, d + 0.06, { color: IMP.trim });
  const ww = w * 0.6;
  const wh = h * 0.42;
  const wv = h * 0.5;
  frame.box("impPaintedMetal", u, wv, d + 0.005, ww + 0.24, wh + 0.24, 0.06, { color: IMP.consoleDark, texel: 1 });
  frame.box(glow, u, wv, d + 0.02, ww, wh, 0.01);
  const slats = 7;
  for (let k = 0; k < slats; k++) frame.box("impMetal", u, wv - wh / 2 + (k + 0.5) * (wh / slats), d + 0.05, ww + 0.1, (wh / slats) * 0.55, 0.06, { color: IMP.gunmetal, tilt: 0.4 });
  for (const s of [-1, 1]) frame.box("impMetal", u + s * (ww / 2 + 0.08), wv, d + 0.05, 0.06, wh + 0.2, 0.06, { color: IMP.steel });
  // insulator stack + bus bar sit toward the wall so a conduit can drop into the outer half of the top
  const inN = d * 0.25;
  for (let i = 0; i < 3; i++) {
    const iu = u - w / 2 + ((i + 0.5) / 3) * w;
    for (let k = 0; k < 3; k++) frame.cylV("impPaintedMetal", iu, h + 0.2 + k * 0.2, inN, 0.14 - k * 0.02, 0.1, { color: IMP.consoleDark, segments: 12 });
    frame.cylV("impMetal", iu, h + 0.45, inN, 0.05, 0.9, { color: IMP.steel, segments: 8 });
  }
  frame.box("impMetal", u, h + 0.92, inN, w - 0.4, 0.06, 0.2, { color: IMP.steel });
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) frame.box("impMetal", u + s * (w / 2 + 0.03), h * 0.6 + k * 0.3, d / 2, 0.06, 0.05, d * 0.6, { color: IMP.gunmetal });
  frame.box("darkGloss", u - w * 0.25, h - 0.55, d + 0.01, 0.7, 0.4, 0.01);
  frame.box(display, u - w * 0.25, h - 0.55, d + 0.017, 0.66, 0.36, 0.004, { uv: "keep" });
  frame.box("leds", u + w * 0.25, h - 0.45, d + 0.012, 0.6, 0.05, 0.004, { uv: "keep" });
  frame.box("emitAmber", u + w * 0.25, h - 0.62, d + 0.012, 0.1, 0.06, 0.004);
  frame.quad("impDecal", u + w * 0.3, 0.9, d + 0.01, 0.6, 0.6, { uvRect: impDecalRect([13, 1, 10][Math.floor(rand() * 3)]) });
  frame.add("hazard", new THREE.PlaneGeometry(w - 0.3, 0.14), u, 0.1, d + 0.006, { uv: "scale", uvScale: [(w - 0.3) / 0.6, 1] });
  frame.collider(u - w / 2, u + w / 2, 0, h + 1, 0, d + 0.1, "generator");
}

// Holographic reactor schematic: wireframe core column with armour rings, field rings, transformer
// blocks and a base collar (one holoWire + one holo draw call), a light cone from the projector and a
// slow spin with a bob. pos = [x, y, z] of the projector surface. Returns the group.
export function holoReactor(kit, ctx, pos, opts = {}) {
  const { lift = 1.25, scale = 1.0, light = true } = opts;
  const [x, y, z] = pos;
  const mats = ctx.mats;
  const nonIdx = (g) => (g.index ? g.toNonIndexed() : g);
  const wire = [];
  wire.push(new THREE.CylinderGeometry(0.28, 0.28, 2.0, 16, 6, true));
  for (const ry of [-0.7, -0.1, 0.5]) {
    const t = new THREE.TorusGeometry(0.5, 0.03, 6, 32);
    t.rotateX(Math.PI / 2);
    t.translate(0, ry, 0);
    wire.push(t);
  }
  for (const ry of [-0.4, 0.2]) {
    const t = new THREE.TorusGeometry(0.34, 0.02, 4, 24);
    t.rotateX(Math.PI / 2);
    t.translate(0, ry, 0);
    wire.push(t);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const b = new THREE.BoxGeometry(0.22, 0.2, 0.22);
    b.translate(Math.cos(a) * 0.75, -0.9, Math.sin(a) * 0.75);
    wire.push(b);
  }
  const base = new THREE.CylinderGeometry(0.95, 0.95, 0.1, 32, 1, true);
  base.translate(0, -0.95, 0);
  wire.push(base);
  const group = new THREE.Group();
  group.position.set(x, y + lift, z);
  group.scale.setScalar(scale);
  group.add(new THREE.Mesh(mergeGeometries(wire.map(nonIdx), false), mats.holoWire));
  // projection cone (solid at the lens, fading to a trace where it meets the schematic) and the
  // plasma core inside the wireframe share one additive mesh, faded by RGBA vertex colour: the cone
  // runs 1/3 -> 1/20 of the material opacity, the core the full value
  const coneH = lift + 0.9 * scale;
  const coneGeo = new THREE.CylinderGeometry(1.0 * scale, 0.5, coneH, 32, 1, true);
  coneGeo.translate(0, coneH / 2, 0);
  const fade = (geo, a0, a1) => {
    const p = geo.attributes.position;
    const box = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
    const rgba = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) - box.min.y) / Math.max(1e-6, box.max.y - box.min.y);
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 1;
      rgba[i * 4 + 3] = a0 + (a1 - a0) * t;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(rgba, 4));
    return geo;
  };
  fade(coneGeo, 1 / 3, 0.05);
  const coreGeo = new THREE.CylinderGeometry(0.26 * scale, 0.26 * scale, 2.0 * scale, 16, 1, true);
  coreGeo.translate(0, lift, 0);
  fade(coreGeo, 1, 1);
  const glow = new THREE.Mesh(mergeGeometries([coneGeo, coreGeo].map(nonIdx), false), mats.holoCone);
  glow.position.set(x, y, z);
  kit.object(glow);
  kit.object(group);
  ctx.animate((dt, t) => {
    group.rotation.y += dt * 0.22;
    group.position.y = y + lift + Math.sin(t * 0.7) * 0.04;
  });
  if (light) pointLightDesc(ctx, IMP.holo, 3.0, 7, [x, y + lift + 0.4, z], 2);
  return group;
}

export { yawQ, Y_AXIS };
