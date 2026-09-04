// Small shared helpers for the hangar builders: oriented cylinders, atlas labels, rails, ladders.
import * as THREE from "three";
import { LABELS } from "./materials.js";
import { RAIL_H, RAIL_MID, RAIL_KICK, HG } from "./layout.js";
import { sharedTorus } from "./batch.js";

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

/**
 * Text label quad from the atlas. `normal` is the facing direction ([0,1,0] lays it flat, with the
 * text top toward -Z; `spin` rotates it about the normal). width in metres; height from the aspect.
 */
export function label(kit, mat, name, center, normal, width, { color = 0xffffff, spin = 0 } = {}) {
  const L = LABELS[name];
  if (!L) throw new Error("hangar atlas: no label " + name);
  const h = width / L.aspect;
  const geo = new THREE.PlaneGeometry(width, h);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal).normalize());
  if (normal[1] > 0.5) q.copy(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
  return kit.add(mat, geo, { pos: center, quat: q, uv: "keep", uvRect: L.rect, color });
}

/**
 * Safety rail from [x,z] to [x,z] at floor y0: dark posts every <= 2.5 m, a thin light-grey top rail at
 * 1.02 m, a dark mid rail at 0.55 m and a 0.15 m kick plate, plus a 1.02 m tall blocking collider along
 * it. Uses the Batcher for everything (boxes only).
 */
export function railRun(B, kit, from, to, y0, { tag = "rail", collide = true, kick = true, postEvery = 2.5, colors = {} } = {}) {
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
    B.box("paintedMetal", post, x, y0 + RAIL_H / 2, z, 0.09, RAIL_H, 0.09);
    // foot plate
    B.box("paintedMetal", post, x, y0 + 0.015, z, 0.22, 0.03, 0.22);
  }
  const cx = (from[0] + to[0]) / 2, cz = (from[1] + to[1]) / 2;
  const sx = alongX ? L : 0.05, sz = alongX ? 0.05 : L;
  B.box("metal", rail, cx, y0 + RAIL_H - 0.03, cz, alongX ? L + 0.09 : 0.07, 0.06, alongX ? 0.07 : L + 0.09);
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
    const hoop = sharedTorus(0.45, 0.025, 5, 16, Math.PI);
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
