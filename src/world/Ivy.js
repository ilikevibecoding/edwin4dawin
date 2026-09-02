import * as THREE from 'three';
import { makeRng } from './util.js';
import { IVY } from './layout.js';

/**
 * Ivy / vine patches climbing walls: overlapping alpha-tested leaf-cluster cards scattered over a wall
 * rectangle, dense at the root and thinning into separate tendrils toward the top. All patches share
 * one InstancedMesh (one draw call) with an alpha-tested depth material so the shadows keep the leafy
 * silhouette. Each patch: { x, z, yaw, w, h, seed } where (x, z) is the wall-base center of the patch
 * and yaw the direction the wall faces (0 → +Z, π/2 → +X).
 */
export function buildIvy(ctx, patches = IVY) {
  const { mats, root } = ctx;
  const cards = [];
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();

  for (const p of patches) {
    const rng = makeRng(900 + (p.seed || 0) * 31);
    const cs = Math.cos(p.yaw);
    const sn = Math.sin(p.yaw);
    // Local → world: u along the wall, n out of the wall.
    const place = (u, y, n) => ({ x: p.x + u * cs + n * sn, y, z: p.z - u * sn + n * cs });
    const nCards = Math.round(p.w * p.h * (p.density || 4.5));
    for (let i = 0; i < nCards; i++) {
      const t = rng(); // 0 at base → 1 at top; bias toward the base
      const y = p.h * Math.pow(t, 1.35);
      // Spread narrows toward the top so the patch reads as tendrils climbing.
      const spread = p.w * (0.5 - 0.3 * (y / p.h));
      const u = rng.range(-spread, spread);
      const size = rng.range(0.55, 0.95) * (1 - 0.3 * (y / p.h));
      const w = place(u, Math.max(size * 0.45, y), rng.range(0.04, 0.14));
      cards.push({ ...w, size, yaw: p.yaw + rng.range(-0.25, 0.25), roll: rng.range(0, Math.PI * 2), tilt: rng.range(-0.15, 0.15) });
    }
    // Extra tendrils: 2–3 thin vertical runs of small cards reaching above the main mass.
    const runs = 2 + rng.int(0, 1);
    for (let r = 0; r < runs; r++) {
      const u0 = rng.range(-p.w * 0.4, p.w * 0.4);
      const top = p.h * rng.range(1.0, 1.25);
      for (let y = p.h * 0.6; y < top; y += 0.32) {
        const w = place(u0 + rng.range(-0.15, 0.15), y, rng.range(0.05, 0.1));
        cards.push({ ...w, size: rng.range(0.32, 0.5), yaw: p.yaw + rng.range(-0.3, 0.3), roll: rng.range(0, Math.PI * 2), tilt: rng.range(-0.2, 0.2) });
      }
    }
  }
  if (!cards.length) return;

  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mats.ivy, cards.length);
  mesh.name = 'Ivy';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  cards.forEach((c, i) => {
    _e.set(c.tilt, c.yaw, c.roll, 'YXZ');
    _q.setFromEuler(_e);
    _p.set(c.x, c.y, c.z);
    _s.set(c.size, c.size, 1);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mats.ivy.map, alphaTest: 0.5, side: THREE.DoubleSide });
  root.add(mesh);
}
