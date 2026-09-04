import * as THREE from 'three';
import { mulberry32 } from '../textures/core.js';

// ---------------------------------------------------------------------------
// The camp's own coordinate frame.
//
// Everything in the camp is laid out in (u, v): u runs along the mainline in
// the direction of increasing t, v runs away from the road into the clearing.
// The camp group is rotated so that its local +x is u; because the camp sits on
// the road's right (WORLD.camp.side = -1) the road's left-lateral is local +z,
// which means "into the camp" is local -z. `toLocal` hides that sign so every
// builder can think in u/v and the group can be turned to follow the road.
//
// Heights are never assumed. The terrain agent is grading a pad here, but until
// it lands the ground under the camp rolls by a few metres, so every object asks
// `ground(u, v)` for the height under its own feet.
// ---------------------------------------------------------------------------

export function createFrame(terrain, anchor) {
  const heading = Math.atan2(-anchor.tz, anchor.tx);
  const group = new THREE.Group();
  group.position.set(anchor.x, 0, anchor.z);
  group.rotation.y = heading;

  const toWorld = (u, v) => ({
    x: anchor.x + anchor.tx * u - anchor.lx * v,
    z: anchor.z + anchor.tz * u - anchor.lz * v,
  });
  const ground = (u, v) => {
    const p = toWorld(u, v);
    return terrain.heightAt(p.x, p.z);
  };
  // Least-squares plane through four samples, so a 5 m tent sits on the ground
  // it covers rather than on the one point under its centre.
  const groundPlane = (u, v, half = 1.5) => {
    const y0 = ground(u - half, v);
    const y1 = ground(u + half, v);
    const y2 = ground(u, v - half);
    const y3 = ground(u, v + half);
    return {
      y: (y0 + y1 + y2 + y3) * 0.25,
      slopeU: (y1 - y0) / (2 * half),
      slopeV: (y3 - y2) / (2 * half),
    };
  };
  // Rotation about y for an object built with its front along local +z, so that
  // the front points along (du, dv) in camp coordinates.
  const yaw = (du, dv) => Math.atan2(du, -dv);
  // World heading in the driver's convention (facing = (sin h, cos h)).
  const worldHeading = (du, dv) => {
    const dx = anchor.tx * du - anchor.lx * dv;
    const dz = anchor.tz * du - anchor.lz * dv;
    return Math.atan2(dx, dz);
  };
  return { group, heading, toWorld, ground, groundPlane, yaw, worldHeading, toLocal: (u, v) => [u, -v] };
}

/** Seeded random helpers shared by every builder, so the camp is the same each boot. */
export function rng(seed) {
  const r = mulberry32(seed);
  return {
    next: r,
    range: (a, b) => a + (b - a) * r(),
    sign: () => (r() < 0.5 ? -1 : 1),
    pick: (arr) => arr[Math.min(arr.length - 1, (r() * arr.length) | 0)],
    jitter: (amt) => (r() - 0.5) * 2 * amt,
    chance: (p) => r() < p,
  };
}
