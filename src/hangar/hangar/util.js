// Small shared helpers for the hangar builders: oriented cylinders, atlas labels, rails, ladders.
import * as THREE from "three";
import { LABELS } from "./materials.js";
import { RAIL_H, RAIL_MID, RAIL_KICK, HG, EM } from "./layout.js";
import { sharedTorus, Batcher } from "./batch.js";

// Every atlas decal (labels, wear streaks, baked-shadow gradients, contact blobs: ~800 quads a build)
// goes into one Batcher per kit and reaches the kit as one geometry per material + colour when the
// module's build() calls flushDecals(); 800 PlaneGeometry + kit.add round trips cost ~8 ms.
const _decals = new WeakMap();
function decals(kit) {
  let b = _decals.get(kit);
  if (!b) {
    b = new Batcher(kit);
    _decals.set(kit, b);
  }
  return b;
}
/**
 * Add the batched decals to the kit. The decal materials are transparent without depth writes, so
 * their draw order is buffer order: the black wear / shadow shapes go last, over the stencils they
 * darken (the order the builders drew them in).
 */
export function flushDecals(kit) {
  const b = _decals.get(kit);
  if (!b) return;
  b.flush((a, c) => (a.color === HG.shadow ? 1 : 0) - (c.color === HG.shadow ? 1 : 0));
  _decals.delete(kit);
}

/**
 * Housed lamp: a dark housing box with the emissive face set 1 cm proud of its open side and inset
 * 3 cm from its edges, so the emitter reads as a fixture with a body, never a bare glowing block.
 * `normal` is the open side ([0,-1,0] = downlight, [1,0,0] = shining toward +x ...); size = [w, h, d]
 * measured across, along the normal (housing depth) and the third axis.
 */
export function housedLamp(B, emitMat, center, normal, [w, depth, d], { housing = HG.gunmetal, lampColor = 0xffffff, inset = 0.03 } = {}) {
  const [nx, ny, nz] = normal;
  const ax = nx !== 0 ? 0 : ny !== 0 ? 1 : 2; // axis of the normal
  const size = [0, 0, 0];
  size[ax] = depth;
  const others = [0, 1, 2].filter((i) => i !== ax);
  size[others[0]] = w;
  size[others[1]] = d;
  const sign = nx + ny + nz;
  const c = [...center];
  // housing sits behind the face; the face is a thin slab flush-plus-1 cm with the open side
  c[ax] = center[ax] - sign * depth * 0.5;
  B.box("paintedMetal", housing, c[0], c[1], c[2], size[0], size[1], size[2]);
  const fs = [...size];
  fs[ax] = 0.03;
  fs[others[0]] = Math.max(0.04, w - 2 * inset);
  fs[others[1]] = Math.max(0.04, d - 2 * inset);
  const fc = [...center];
  fc[ax] = center[ax] - sign * 0.005;
  B.box(emitMat, lampColor, fc[0], fc[1], fc[2], fs[0], fs[1], fs[2]);
}

/**
 * Black/yellow hazard marking as alternating painted blocks (no texture): the box [min, max] is split
 * along `axis` ("x" | "z" | "y") into `block`-long yellow and black pieces, starting with yellow.
 * Emits only the faces given (default all), like Batch.box.
 */
export function hazardBlocks(B, min, max, axis = "x", { block = 0.3, faces, texel } = {}) {
  const ai = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const L = max[ai] - min[ai];
  const n = Math.max(1, Math.round(L / block));
  const step = L / n;
  const opts = faces !== undefined || texel !== undefined ? { faces, texel } : undefined;
  for (let i = 0; i < n; i++) {
    const a = [...min], b = [...max];
    a[ai] = min[ai] + i * step;
    b[ai] = min[ai] + (i + 1) * step;
    if (i % 2 === 0) B.boxMM("painted", HG.yellow, a, b, opts);
    else B.boxMM("paintedMetal", HG.black, a, b, opts);
  }
}

/** Red beacon: dark housing, pulsing red lens on the open side, a steel guard bar across the lens. */
export function redBeacon(B, center, normal, w = 0.34) {
  const depth = 0.22;
  housedLamp(B, "hgPulse", center, normal, [w, depth, w * 0.75], { housing: HG.gunmetal, inset: 0.05 });
  const [nx, ny, nz] = normal;
  const ax = nx !== 0 ? 0 : ny !== 0 ? 1 : 2;
  const sign = nx + ny + nz;
  const gc = [...center];
  gc[ax] = center[ax] + sign * 0.03;
  const gs = [0.05, 0.05, 0.05];
  const across = ax === 0 ? 2 : 0; // guard bar runs across the lens
  gs[across] = w + 0.04;
  B.box("metal", HG.steel, gc[0], gc[1], gc[2], gs[0], gs[1], gs[2]);
}

// half-torus cage hoop orientations: bulging toward +/-x (x-plane walls) or +/-z (z-plane walls)
const HOOP_Q = {
  x: { 1: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2)), "-1": new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2)) },
  z: { 1: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), "-1": new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)) },
};

const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();

/** Quaternion rotating +Y onto the direction from a to b. */
export function quatAlong(a, b) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  return new THREE.Quaternion().setFromUnitVectors(_up, _d);
}

/** Cylinder between two world points (kit.add, so it merges per material). */
export function tube(kit, mat, a, b, r, opts = {}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const g = new THREE.CylinderGeometry(opts.r2 ?? r, r, len, opts.segments || 12, 1, !!opts.open);
  const { r2, segments, open, ...rest } = opts;
  return kit.add(mat, g, {
    pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    quat: quatAlong(a, b),
    uv: "scale",
    uvScale: [2 * Math.PI * r, len],
    ...rest,
  });
}

/** base orientation of a decal quad facing `normal` (flat ones keep their top toward -Z) */
function decalQuat(normal) {
  if (normal[1] > 0.5) return new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal).normalize());
}

/**
 * Text label quad from the atlas. `normal` is the facing direction ([0,1,0] lays it flat, with the
 * text top toward -Z; `spin` rotates it about the normal). width in metres; height from the aspect
 * unless `height` is given (stretched alpha shapes: streaks, gradients).
 */
export function label(kit, mat, name, center, normal, width, { color = 0xffffff, spin = 0, height = null } = {}) {
  const L = LABELS[name];
  if (!L) throw new Error("hangar atlas: no label " + name);
  const h = height ?? width / L.aspect;
  const q = decalQuat(normal);
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
  decals(kit).quad(mat, color, center, q, width, h, L.rect);
}

const _ex = new THREE.Vector3(), _ey = new THREE.Vector3(), _dir = new THREE.Vector3();
/**
 * Baked-shadow gradient (atlas GRAD: opaque at its u = 0 edge, gone at u = 1) on a surface facing
 * `normal`: `len` metres of falloff along `dir` (world direction from the occluder out into the light,
 * in the surface plane), `span` metres across it. Black by default; `tone` is the vertex colour (a dark
 * grey for a lighter shadow).
 */
export function shadowGrad(kit, center, normal, dir, len, span, { tone = HG.shadow, mat = "hgDecal" } = {}) {
  const L = LABELS.GRAD;
  const q = decalQuat(normal);
  _ex.set(1, 0, 0).applyQuaternion(q);
  _ey.set(0, 1, 0).applyQuaternion(q);
  _dir.set(dir[0], dir[1], dir[2]).normalize();
  // spin about the normal so the quad's local +x (the fade direction) points along dir
  const spin = Math.atan2(_dir.dot(_ey), _dir.dot(_ex));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
  decals(kit).quad(mat, tone, center, q, len, span, L.rect);
}

/**
 * Worn-paint streak (atlas STREAK: strongest at its u = 0 end, 20 % at the far end, a bell across) from
 * point `from` running along `dir` for `len` metres, `width` metres wide, on the deck (normal +y) or a
 * wall. Tyre tracks along the lanes, drag marks at the doors, skids on the pads.
 */
export function wearStreak(kit, from, normal, dir, len, width, { tone = HG.shadow } = {}) {
  const L = LABELS.STREAK;
  const q = decalQuat(normal);
  _ex.set(1, 0, 0).applyQuaternion(q);
  _ey.set(0, 1, 0).applyQuaternion(q);
  _dir.set(dir[0], dir[1], dir[2]).normalize();
  const spin = Math.atan2(_dir.dot(_ey), _dir.dot(_ex));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
  const center = [from[0] + _dir.x * len / 2, from[1] + _dir.y * len / 2, from[2] + _dir.z * len / 2];
  decals(kit).quad("hgDecal", tone, center, q, len, width, L.rect);
}

/**
 * Safety rail from [x,z] to [x,z] at floor y0: dark posts every <= 2.5 m, a round light-grey handrail
 * (3 cm radius) at 1.02 m, a dark mid rail at 0.55 m and a 0.15 m kick plate, plus a 1.02 m tall blocking
 * collider along it. `lit` adds a 1 cm light strip under the handrail and (unless `caps` is false) a lit
 * cap lens on every post, so the rail still reads at night and from 70 m; `soft` puts that strip on the
 * vertex-level emitter under the bloom threshold (a rail 1.5 m from the eye must not smear).
 */
export function railRun(B, kit, from, to, y0, { tag = "rail", collide = true, kick = true, foot = true, lit = false, caps = true, soft = false, postEvery = 2.5, colors = {} } = {}) {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.2) return;
  const ux = dx / L, uz = dz / L;
  const alongX = Math.abs(ux) > Math.abs(uz);
  const post = colors.post || HG.gunmetal;
  const rail = colors.rail || HG.steel;
  const n = Math.max(1, Math.ceil(L / postEvery));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = from[0] + dx * t, z = from[1] + dz * t;
    B.box("paintedMetal", post, x, y0 + RAIL_H / 2 - 0.02, z, 0.07, RAIL_H - 0.04, 0.07);
    // foot plate (skipped on rails nobody gets near, e.g. the catwalk ring 36 m up)
    if (foot) B.box("paintedMetal", post, x, y0 + 0.015, z, 0.22, 0.03, 0.22);
    if (lit && caps) B.box("emitWhite", 0xffffff, x, y0 + RAIL_H + 0.015, z, 0.05, 0.03, 0.05);
  }
  const cx = (from[0] + to[0]) / 2, cz = (from[1] + to[1]) / 2;
  const sx = alongX ? L : 0.05, sz = alongX ? 0.05 : L;
  // round handrail (a tube, not a box beam), painted light grey: bare metal 1 m from a point light drew
  // a specular streak the length of the rail
  B.tube("paintedMetal", rail, [from[0] - ux * 0.045, y0 + RAIL_H - 0.03, from[1] - uz * 0.045], [to[0] + ux * 0.045, y0 + RAIL_H - 0.03, to[1] + uz * 0.045], 0.03, 10);
  if (lit) {
    if (soft) B.box("hgEmit", EM.strip, cx, y0 + RAIL_H - 0.068, cz, alongX ? L - 0.1 : 0.03, 0.01, alongX ? 0.03 : L - 0.1);
    else B.box("emitWhite", 0xffffff, cx, y0 + RAIL_H - 0.068, cz, alongX ? L - 0.1 : 0.03, 0.01, alongX ? 0.03 : L - 0.1);
  }
  B.box("paintedMetal", post, cx, y0 + RAIL_MID, cz, sx, 0.05, sz);
  if (kick) B.box("paintedMetal", colors.kick || post, cx, y0 + 0.02 + RAIL_KICK / 2, cz, alongX ? L : 0.03, RAIL_KICK, alongX ? 0.03 : L);
  if (collide) {
    const hw = 0.06;
    kit.collider(
      [Math.min(from[0], to[0]) - hw, y0, Math.min(from[1], to[1]) - hw],
      [Math.max(from[0], to[0]) + hw, y0 + RAIL_H, Math.max(from[1], to[1]) + hw],
      tag,
    );
  }
}

/**
 * Vertical ladder against a wall from y0 to y1. plane "x": wall at x = `wall`, ladder at z = `along`;
 * plane "z": wall at z = `wall`, ladder at x = `along`. `n` = wall normal sign along the plane axis.
 * Cage hoops (every 3 m from 2.4 m up) optional.
 */
export function ladder(B, kit, wall, along, y0, y1, n, { cage = true, collide = true, plane = "x" } = {}) {
  const h = y1 - y0;
  const stileOff = 0.2; // ladder stands 0.2 m off the wall
  const lw = wall + n * stileOff;
  const P = plane === "x" ? (w, a) => [w, a] : (w, a) => [a, w];
  const box = (mat, color, w, y, a, sw, sy, sa) => {
    const [x, z] = P(w, a);
    const [sx, sz] = P(sw, sa);
    B.box(mat, color, x, y, z, sx, sy, sz);
  };
  for (const s of [-0.25, 0.25]) box("metal", HG.gunmetal, lw, (y0 + y1) / 2, along + s, 0.05, h, 0.05);
  const rungs = Math.floor(h / 0.3);
  for (let i = 1; i <= rungs; i++) box("metal", HG.steel, lw, y0 + i * 0.3, along, 0.03, 0.03, 0.5);
  // wall brackets every 2 m
  for (let y = y0 + 1; y < y1; y += 2) for (const s of [-0.25, 0.25]) box("metal", HG.gunmetal, wall + (n * stileOff) / 2, y, along + s, stileOff, 0.05, 0.05);
  if (cage && h > 3.5) {
    const hoop = sharedTorus(0.45, 0.025, 4, 10, Math.PI);
    const q = HOOP_Q[plane][n > 0 ? 1 : -1];
    for (let y = y0 + 2.4; y < y1 - 0.5; y += 3.0) {
      const [x, z] = P(lw + n * 0.15, along);
      B.geo("metal", HG.gunmetal, hoop, [x, y, z], q);
    }
    for (const s of [-0.42, 0.42]) box("metal", HG.gunmetal, lw + n * 0.35, (y0 + 2.4 + y1) / 2, along + s, 0.04, y1 - y0 - 2.4, 0.04);
  }
  if (collide) {
    const [a0, b0] = P(Math.min(wall, lw + n * 0.6), along - 0.5);
    const [a1, b1] = P(Math.max(wall, lw + n * 0.6), along + 0.5);
    kit.collider([Math.min(a0, a1), y0, Math.min(b0, b1)], [Math.max(a0, a1), y1, Math.max(b0, b1)], "ladder");
  }
}
