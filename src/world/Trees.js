import * as THREE from 'three';
import { cylinder, capsule } from './geo.js';
import { makeRng } from './util.js';
import { TREES } from './layout.js';
import { octPlanter } from './Props.js';

/**
 * Procedural plane trees: tapered trunk + main branches (capsules, bark canvas texture) and a crown of
 * alpha-tested leaf-cluster cards rendered as one InstancedMesh for all trees (with an alpha-tested depth
 * material so the shadows are dappled rather than solid blobs). Plaza trees sit in octagonal stone planters.
 */
export function buildTrees(ctx) {
  const { mats, batch, root, game } = ctx;
  const cards = [];
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();

  for (const t of TREES) {
    const rng = makeRng(500 + t.seed * 17);
    const s = t.scale;
    let baseY = 0.02;
    if (t.planter) {
      octPlanter(ctx, t.x, t.z, 1.9, 0.55);
      baseY = 0.41;
    }
    const lean = rng.range(-0.06, 0.06);
    const trunkH = 2.9 * s;
    const top = [t.x + lean * trunkH, baseY + trunkH, t.z];
    batch.add(mats.bark, cylinder(0.19 * s, 0.3 * s, trunkH, 10, { x: (t.x + top[0]) / 2, y: baseY + trunkH / 2, z: t.z, rotZ: -lean }), [1, 1, 1]);
    batch.add(mats.bark, cylinder(0.3 * s, 0.46 * s, 0.35 * s, 10, { x: t.x, y: baseY + 0.17 * s, z: t.z }), [0.9, 0.9, 0.9]);
    // Planter soil collider ring is the planter; trunk collider:
    game.physics.addStaticCylinder(new THREE.Vector3(t.x, baseY + trunkH / 2, t.z), 0.3 * s, trunkH / 2, { surface: 'wood' });

    const crownC = [top[0], top[1] + 1.7 * s, top[2]];
    const crownR = [3.1 * s, 2.3 * s, 3.1 * s];
    const n = 5 + rng.int(0, 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.35, 0.35);
      const tilt = rng.range(0.55, 1.0);
      const len = rng.range(1.9, 2.7) * s;
      const end = [top[0] + Math.sin(a) * Math.sin(tilt) * len, top[1] + Math.cos(tilt) * len, top[2] + Math.cos(a) * Math.sin(tilt) * len];
      batch.add(mats.bark, capsule(top, end, 0.1 * s, 7), [1, 1, 1]);
      const a2 = a + rng.range(-0.8, 0.8);
      const end2 = [end[0] + Math.sin(a2) * 0.9 * s, end[1] + rng.range(0.4, 0.9) * s, end[2] + Math.cos(a2) * 0.9 * s];
      batch.add(mats.bark, capsule(end, end2, 0.055 * s, 6), [1, 1, 1]);
      // Leaf clusters around the branch tips.
      for (let k = 0; k < 20; k++) {
        const r = rng.range(0.2, 1.35) * s;
        const th = rng.range(0, Math.PI * 2);
        const ph = rng.range(-0.6, 1.2);
        cards.push({
          x: end2[0] + Math.cos(th) * Math.cos(ph) * r,
          y: end2[1] + Math.sin(ph) * r * 0.8,
          z: end2[2] + Math.sin(th) * Math.cos(ph) * r,
          size: rng.range(1.3, 2.0) * s,
          rot: [rng.range(-0.5, 0.5), rng.range(0, Math.PI * 2), rng.range(-0.5, 0.5)],
        });
      }
    }
    // Filler cards inside the crown ellipsoid.
    for (let k = 0; k < 50; k++) {
      const u = rng.range(0, Math.PI * 2);
      const v = rng.range(-1, 1);
      const rr = Math.cbrt(rng());
      const sv = Math.sqrt(1 - v * v);
      cards.push({
        x: crownC[0] + Math.cos(u) * sv * rr * crownR[0],
        y: crownC[1] + v * rr * crownR[1],
        z: crownC[2] + Math.sin(u) * sv * rr * crownR[2],
        size: rng.range(1.4, 2.1) * s,
        rot: [rng.range(-0.6, 0.6), rng.range(0, Math.PI * 2), rng.range(-0.6, 0.6)],
      });
    }
    // Crown collider (so bullets hitting foliage report 'foliage'); no player blocking above head height matters.
    game.physics.addStaticBox(new THREE.Vector3(crownC[0], crownC[1], crownC[2]), new THREE.Vector3(crownR[0] * 0.7, crownR[1] * 0.7, crownR[2] * 0.7), null, { surface: 'foliage' });
  }

  if (!cards.length) return;
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mats.leaf, cards.length);
  mesh.name = 'TreeLeaves';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  cards.forEach((c, i) => {
    _e.set(c.rot[0], c.rot[1], c.rot[2]);
    _q.setFromEuler(_e);
    _p.set(c.x, c.y, c.z);
    _s.set(c.size, c.size, c.size);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  // Alpha-tested depth so shadows follow the leaf silhouettes.
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mats.leaf.map, alphaTest: 0.5, side: THREE.DoubleSide });
  root.add(mesh);
}
