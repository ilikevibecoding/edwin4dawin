// Geometry helpers for the Acclamator model: vertical lofts (tapered blocks from plan-view footprints),
// footprint shapes, flat decals (stripes, roundels) placed on a loft surface frame, and window rows on
// arbitrary faces. Object space (ship forward -Z, up +Y), non-indexed so the assembler can merge per
// material.
import * as THREE from "three";
import { loftProfile, frameMatrix } from "./venatorKit.js";

// Loft along +y from [{ y, pts: [[x, z], ...] }] (plan-view footprints, same point count each). Returns
// { tag: geometry } like loftProfile; the bottom cap is dropped by default (blocks stand on a surface).
export function yLoft(secs, opts = {}) {
  const out = loftProfile(
    secs.map(({ y, pts }) => ({ z: y, pts: pts.map(([x, z]) => [x, -z]) })),
    { capStart: false, ...opts },
  );
  for (const g of Object.values(out)) g.rotateX(-Math.PI / 2);
  return out;
}

export const rect = (hx, z0, z1) => [
  [-hx, z0],
  [hx, z0],
  [hx, z1],
  [-hx, z1],
];

// rectangle with clipped corners (c metres), for rounded-looking heads and domes
export const octRect = (hx, z0, z1, c) => [
  [-hx + c, z0],
  [hx - c, z0],
  [hx, z0 + c],
  [hx, z1 - c],
  [hx - c, z1],
  [-hx + c, z1],
  [-hx, z1 - c],
  [-hx, z0 + c],
];

/**
 * Tapered block standing on y0: footprint half-width hx0 over z0..z1 at the base, hx1 over
 * (z0 + zf)..(z1 - zb) at the top y1, so the front, back and side faces all slope. Returns one geometry.
 */
export function frustum(y0, y1, hx0, z0, z1, hx1, zf = 0, zb = 0, opts = {}) {
  return yLoft(
    [
      { y: y0, pts: rect(hx0, z0, z1) },
      { y: y1, pts: rect(hx1, z0 + zf, z1 - zb) },
    ],
    opts,
  ).hull;
}

// Same with clipped corners (c0 at the base, c1 at the top).
export function frustumOct(y0, y1, hx0, z0, z1, hx1, zf, zb, c0, c1, opts) {
  return yLoft(
    [
      { y: y0, pts: octRect(hx0, z0, z1, c0) },
      { y: y1, pts: octRect(hx1, z0 + zf, z1 - zb, c1) },
    ],
    opts,
  ).hull;
}

/**
 * Flat decal quad lying on a surface frame: `w` along u and `len` along v, rotated by `angle` about the
 * normal, offset by (du, dv) along the frame and lifted off the surface.
 */
export function decalQuad(
  frame,
  w,
  len,
  angle = 0,
  { du = 0, dv = 0, lift = 0.12 } = {},
) {
  const g = new THREE.PlaneGeometry(w, len).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  if (angle) g.rotateY(angle);
  const p = frame.p
    .clone()
    .addScaledVector(frame.u, du)
    .addScaledVector(frame.v, dv)
    .addScaledVector(frame.n, lift);
  g.applyMatrix4(frameMatrix(p, frame.n, frame.v));
  return g;
}

// Flat disc (or annulus when rIn > 0) lying on a surface frame.
export function decalDisc(frame, rIn, rOut, seg = 20, { lift = 0.12 } = {}) {
  const g = (
    rIn > 0
      ? new THREE.RingGeometry(rIn, rOut, seg, 1)
      : new THREE.CircleGeometry(rOut, seg)
  ).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  const p = frame.p.clone().addScaledVector(frame.n, lift);
  g.applyMatrix4(frameMatrix(p, frame.n, frame.v));
  return g;
}

/**
 * Row of window quads on a flat face: `n` windows of w x h spaced `pitch` apart along `along` (unit),
 * centred on `center`, facing `normal`, lifted 0.25 m. `skip(i)` may drop windows for irregular rows.
 */
export function windowRow(center, normal, along, n, pitch, w, h, skip = null) {
  const out = [];
  const nrm = new THREE.Vector3(...normal).normalize();
  const dir = new THREE.Vector3(...along);
  dir.addScaledVector(nrm, -dir.dot(nrm)).normalize();
  const up = new THREE.Vector3().crossVectors(nrm, dir).normalize();
  const c = new THREE.Vector3(...center).addScaledVector(nrm, 0.25);
  for (let i = 0; i < n; i++) {
    if (skip && skip(i)) continue;
    const q = new THREE.PlaneGeometry(w, h).toNonIndexed();
    const m = new THREE.Matrix4().makeBasis(dir, up, nrm);
    m.setPosition(c.clone().addScaledVector(dir, (i - (n - 1) / 2) * pitch));
    q.applyMatrix4(m);
    out.push(q);
  }
  return out;
}

// Box of size [sx, sy, sz] centred at c, its local +z (aft) aligned with `along` and +y with `up`.
export function orientedBoxAt(size, c, up, along) {
  const y = new THREE.Vector3(...up).normalize();
  const z = new THREE.Vector3(...along);
  z.addScaledVector(y, -z.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.setPosition(new THREE.Vector3(...c));
  const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
  g.applyMatrix4(m);
  return g;
}
