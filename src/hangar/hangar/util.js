// Small shared helpers for the hangar builders: oriented cylinders, atlas labels, rails, ladders.
import * as THREE from "three";
import { LABELS } from "./materials.js";
import { RAIL_H, HG } from "./layout.js";
import { sharedTorus } from "./batch.js";

const HOOP_Q = { 1: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2)), "-1": new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2)) };

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
 * Safety rail (posts every <= 2.5 m, two rails, kick plate) from [x,z] to [x,z] at floor y0, and a
 * 1.02 m tall blocking collider along it. Uses the Batcher for everything (boxes only).
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
    B.box("metal", post, x, y0 + RAIL_H / 2, z, 0.08, RAIL_H, 0.08);
    // foot plate
    B.box("metal", post, x, y0 + 0.015, z, 0.2, 0.03, 0.2);
  }
  const cx = (from[0] + to[0]) / 2, cz = (from[1] + to[1]) / 2;
  const sx = alongX ? L : 0.06, sz = alongX ? 0.06 : L;
  B.box("metal", rail, cx, y0 + RAIL_H - 0.025, cz, alongX ? L + 0.06 : 0.07, 0.05, alongX ? 0.07 : L + 0.06);
  B.box("metal", rail, cx, y0 + RAIL_H * 0.55, cz, sx, 0.04, sz);
  if (kick) B.box("metal", colors.kick || HG.gunmetal, cx, y0 + 0.11, cz, alongX ? L : 0.03, 0.22, alongX ? 0.03 : L);
  if (collide) {
    const hw = 0.06;
    kit.collider(
      [Math.min(from[0], to[0]) - hw, y0, Math.min(from[1], to[1]) - hw],
      [Math.max(from[0], to[0]) + hw, y0 + RAIL_H, Math.max(from[1], to[1]) + hw],
      tag,
    );
  }
}

/** Vertical ladder against a wall. `nx` = wall normal (+1/-1 along x); cage hoops optional. */
export function ladder(B, kit, x, z, y0, y1, nx, { cage = true, collide = true } = {}) {
  const h = y1 - y0;
  const stileOff = 0.2; // ladder stands 0.2 m off the wall
  const lx = x + nx * stileOff;
  for (const s of [-0.25, 0.25]) B.box("metal", HG.gunmetal, lx, (y0 + y1) / 2, z + s, 0.05, h, 0.05);
  const rungs = Math.floor(h / 0.3);
  for (let i = 1; i <= rungs; i++) B.box("metal", HG.steel, lx, y0 + i * 0.3, z, 0.03, 0.03, 0.5);
  // wall brackets every 2 m
  for (let y = y0 + 1; y < y1; y += 2) for (const s of [-0.25, 0.25]) B.box("metal", HG.gunmetal, x + (nx * stileOff) / 2, y, z + s, stileOff, 0.05, 0.05);
  if (cage) {
    const hoop = sharedTorus(0.45, 0.025, 5, 16, Math.PI);
    for (let y = y0 + 2.4; y < y1 - 0.5; y += 1.5) B.geo("metal", HG.gunmetal, hoop, [lx + nx * 0.15, y, z], HOOP_Q[nx > 0 ? 1 : -1]);
    for (const s of [-0.42, 0.42]) B.box("metal", HG.gunmetal, lx + nx * 0.35, (y0 + 2.4 + y1) / 2, z + s, 0.04, y1 - y0 - 2.4, 0.04);
  }
  if (collide) kit.collider([Math.min(x, lx + nx * 0.6), y0, z - 0.5], [Math.max(x, lx + nx * 0.6), y1, z + 0.5], "ladder");
}
