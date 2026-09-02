import * as THREE from 'three';
import { Batcher, prism, ringPrism, polygon, box, sphere, capsule, cylinder, cone } from './geo.js';
import { regularPolygon } from './util.js';
import { FOUNTAIN } from './layout.js';

/**
 * Raised octagonal fountain (two steps, blocky basin wall, dressed-stone coping), still reflective
 * water, a tall stone plinth with a stepped cornice and a bronze horse statue (Poly Haven photoscan,
 * re-materialed as patinated bronze). Stonework gets a trimesh collider; the water its own 'water'
 * surface collider. Async: the statue scan loads in parallel with the props.
 */
export async function buildFountain(ctx) {
  const { mats, root, game } = ctx;
  const F = FOUNTAIN;
  const fb = new Batcher();
  const oct = (r) => regularPolygon(F.x, F.z, r, 8, Math.PI / 8);
  const stepTint = [1.0, 0.98, 0.94];

  // Steps + basin. The basin wall carries a damp gradient (darker toward the coping where water laps and
  // splashes over) and the coping itself reads as wet stone; the outer step stays dry.
  fb.add(mats.trimStone, prism(oct(5.0), 0, 0.17), stepTint);
  fb.add(mats.trimStone, prism(oct(4.4), 0.17, 0.34), (x, y) => stepTint.map((c) => c * (y > 0.3 ? 0.93 : 1)));
  fb.add(mats.stoneBlocks, ringPrism(oct(3.6), oct(3.15), 0.34, 1.05, { top: false }), (x, y) => [1.02, 1.0, 0.96].map((c) => c * (0.72 + 0.28 * Math.min(1, Math.max(0, (1.05 - y) / 0.5)))));
  fb.add(mats.trimStone, ringPrism(oct(3.78), oct(3.02), 1.05, 1.22), [0.86, 0.85, 0.83]);
  const basinMat = mats.pbr('marble_tiles', { color: new THREE.Color(0.45, 0.66, 0.72), tile: 1.0 }, 'basin_tiles');
  fb.add(basinMat, polygon(oct(3.15), [], 0.5), [1, 1, 1]);

  // Plinth: base block, molding, shaft, stepped cornice, cap
  const P = (w, y0, y1, mat, tint = [1, 1, 1]) => fb.add(mat, box(w, y1 - y0, w, { x: F.x, y: (y0 + y1) / 2, z: F.z }), tint);
  P(2.7, 0.5, 1.1, mats.trimStone, stepTint);
  P(2.4, 1.1, 1.36, mats.trimStone, [0.98, 0.96, 0.92]);
  P(2.05, 1.36, 4.5, mats.sandstone, [1.0, 0.98, 0.94]);
  P(2.4, 4.5, 4.74, mats.trimStone, stepTint);
  P(2.7, 4.74, 4.96, mats.trimStone, stepTint);
  P(2.3, 4.96, 5.12, mats.trimStone, [0.98, 0.96, 0.92]);
  // Bronze plaque + lion-head spouts on the shaft; a dark damp streak runs from each spout down the shaft.
  fb.add(mats.bronze, box(1.1, 0.7, 0.05, { x: F.x, y: 2.6, z: F.z + 1.04 }));
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    fb.add(mats.bronze, sphere(0.17, { x: F.x + dx * 1.08, y: 1.75, z: F.z + dz * 1.08, seg: 10 }));
    fb.add(mats.bronze, cylinder(0.035, 0.035, 0.3, 8, { x: F.x + dx * 1.25, y: 1.62, z: F.z + dz * 1.25, rotZ: dx ? Math.PI / 2 : 0, rotX: dz ? Math.PI / 2 : 0 }));
  }
  const stone = fb.build(root, { name: 'Fountain' });
  for (const m of stone) game.physics.addStaticMesh(m, { surface: m.material === mats.bronze ? 'metal' : 'stone' });

  // Water surface (separate transparent mesh) + four falling streams from the spouts, each with a splash ring.
  const water = new THREE.Mesh(polygon(oct(3.15), [], 1.0), mats.water);
  water.name = 'FountainWater';
  water.receiveShadow = true;
  water.renderOrder = 2;
  root.add(water);
  game.physics.addStaticBox(new THREE.Vector3(F.x, 0.97, F.z), new THREE.Vector3(3.1, 0.03, 3.1), null, { surface: 'water' });
  const streams = new Batcher();
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const sx = F.x + dx * 1.42;
    const sz = F.z + dz * 1.42;
    // Slight outward arc: top of the stream at the spout lip, bottom 12 cm further out.
    const g = cylinder(0.022, 0.034, 0.64, 7, { x: sx + dx * 0.06, y: 1.31, z: sz + dz * 0.06, rotX: -dz * 0.18, rotZ: dx * 0.18, open: true });
    streams.add(mats.waterStream, g, null);
    const ring = new THREE.RingGeometry(0.1, 0.42, 16);
    ring.rotateX(-Math.PI / 2);
    ring.translate(sx + dx * 0.12, 1.006, sz + dz * 0.12);
    streams.add(mats.waterStream, ring, null);
  }
  for (const m of streams.build(root, { name: 'FountainStreams', castShadow: false })) m.renderOrder = 3;

  await buildStatue(ctx);
}

/**
 * Statue: the horse_statue_01 photoscan (12k tris) scaled to monument size, wooden display base removed,
 * re-materialed as dark patinated bronze while keeping the scan's own normal/roughness maps. Falls back
 * to the primitive equestrian statue if the scan is unavailable.
 */
async function buildStatue(ctx) {
  const { mats, root, game } = ctx;
  const F = FOUNTAIN;
  const capY = 5.12;
  let statue;
  try {
    const gltf = await game.assets.loadModel('horse_statue_01');
    const src = gltf.scene;
    src.updateMatrixWorld(true);
    statue = new THREE.Group();
    statue.name = 'HorseStatue';
    const bronze = mats.bronzeDark;
    const local = new THREE.Box3();
    src.traverse((o) => {
      if (!o.isMesh || /base/i.test(o.material?.name || '')) return;
      const geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      const mat = bronze.clone();
      mat.name = 'bronze_statue';
      mat.normalMap = o.material.normalMap || null;
      mat.normalScale.set(1, 1);
      mat.roughnessMap = o.material.roughnessMap || null;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      statue.add(mesh);
      geo.computeBoundingBox();
      local.union(geo.boundingBox);
    });
    if (!statue.children.length) throw new Error('no horse mesh');
    const size = local.getSize(new THREE.Vector3());
    const s = 3.4 / size.y; // ~3.4 m tall rearing horse (≈1.4× life-size, monument scale)
    // Feet on the cap, footprint centred; horse length runs along local X → face the plaza centre.
    const c = local.getCenter(new THREE.Vector3());
    for (const m of statue.children) m.geometry.translate(-c.x, -local.min.y, -c.z);
    statue.scale.setScalar(s);
    statue.position.set(F.x, capY, F.z);
    statue.rotation.y = Math.atan2(F.z, -F.x) + STATUE_YAW_OFFSET;
  } catch (err) {
    console.warn('[world] horse statue scan unavailable, using primitive statue:', err.message);
    statue = buildEquestrianStatue(mats);
    statue.position.set(F.x, capY, F.z);
    statue.rotation.y = Math.atan2(F.z, -F.x);
    statue.scale.setScalar(1.3);
  }
  root.add(statue);
  game.render.setupObject(statue);
  statue.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(statue);
  const c = bb.getCenter(new THREE.Vector3());
  const sz = bb.getSize(new THREE.Vector3());
  game.physics.addStaticBox(c, new THREE.Vector3(sz.x * 0.4, sz.y / 2, sz.z * 0.4), null, { surface: 'metal' });
}

/** The scan's horse faces local -X (nose toward negative X); flip so it rears toward the plaza. */
const STATUE_YAW_OFFSET = Math.PI;

/** Horse + rider from spheres/capsules; silhouette first. Local: horse faces +X, feet at y=0. */
export function buildEquestrianStatue(mats) {
  const b = new Batcher();
  const M = mats.bronze;
  const add = (g) => b.add(M, g);
  // Horse body
  add(sphere(0.5, { x: 0, y: 1.35, z: 0, sx: 1.9, sy: 0.95, sz: 0.76, seg: 20 }));
  add(sphere(0.42, { x: 0.72, y: 1.38, z: 0, sx: 1.0, sy: 1.05, sz: 0.9, seg: 16 }));
  add(sphere(0.45, { x: -0.72, y: 1.42, z: 0, sx: 1.0, sy: 1.0, sz: 0.92, seg: 16 }));
  // Neck, mane, head
  add(capsule([0.85, 1.55, 0], [1.3, 2.25, 0], 0.26, 12));
  add(capsule([0.8, 1.8, 0], [1.28, 2.48, 0], 0.11, 8));
  add(sphere(0.3, { x: 1.58, y: 2.24, z: 0, sx: 1.15, sy: 0.55, sz: 0.5, rotZ: -0.5, seg: 14 }));
  add(sphere(0.13, { x: 1.88, y: 2.0, z: 0, sx: 1.1, sy: 0.85, sz: 0.85, seg: 10 }));
  add(cone(0.05, 0.17, 6, { x: 1.4, y: 2.52, z: 0.08, rotX: -0.2 }));
  add(cone(0.05, 0.17, 6, { x: 1.4, y: 2.52, z: -0.08, rotX: 0.2 }));
  // Legs: front-right planted, front-left raised (bent), hind legs angled
  const leg = (a, bb, r = 0.1) => add(capsule(a, bb, r, 10));
  leg([0.62, 1.0, 0.26], [0.66, 0.12, 0.28]);
  add(cylinder(0.12, 0.13, 0.1, 10, { x: 0.66, y: 0.05, z: 0.28 }));
  leg([0.62, 1.0, -0.26], [0.98, 0.66, -0.28], 0.11);
  leg([0.98, 0.66, -0.28], [0.72, 0.36, -0.3], 0.09);
  add(cylinder(0.11, 0.12, 0.1, 10, { x: 0.7, y: 0.32, z: -0.3, rotX: 0.2 }));
  add(sphere(0.22, { x: -0.72, y: 1.05, z: 0.27, sx: 1.3, sy: 1.25, sz: 0.7, seg: 12 }));
  add(sphere(0.22, { x: -0.72, y: 1.05, z: -0.27, sx: 1.3, sy: 1.25, sz: 0.7, seg: 12 }));
  leg([-0.72, 1.05, 0.28], [-0.98, 0.56, 0.29]);
  leg([-0.98, 0.56, 0.29], [-0.88, 0.12, 0.29], 0.09);
  add(cylinder(0.12, 0.13, 0.1, 10, { x: -0.88, y: 0.05, z: 0.29 }));
  leg([-0.72, 1.05, -0.28], [-0.82, 0.12, -0.29]);
  add(cylinder(0.12, 0.13, 0.1, 10, { x: -0.82, y: 0.05, z: -0.29 }));
  // Tail
  add(capsule([-1.12, 1.48, 0], [-1.45, 0.78, 0.05], 0.085, 8));
  add(capsule([-1.45, 0.78, 0.05], [-1.52, 0.3, 0.08], 0.06, 8));
  // Saddle + blanket
  add(box(0.7, 0.06, 0.78, { x: 0.05, y: 1.82, z: 0 }));
  add(box(0.6, 0.14, 0.5, { x: 0.05, y: 1.9, z: 0 }));
  // Rider
  add(capsule([0.05, 1.98, 0], [0.02, 2.56, 0], 0.2, 12));
  add(sphere(0.24, { x: 0.02, y: 2.56, z: 0, sx: 0.9, sy: 0.6, sz: 1.4, seg: 12 }));
  add(sphere(0.14, { x: 0.05, y: 2.86, z: 0, seg: 12 }));
  add(sphere(0.16, { x: 0.05, y: 2.9, z: 0, sy: 0.75, seg: 12 }));
  add(capsule([-0.02, 3.0, 0], [-0.3, 3.15, 0], 0.05, 8)); // helmet crest
  add(capsule([0.05, 2.55, 0.24], [0.36, 2.74, 0.32], 0.07, 8));
  add(capsule([0.36, 2.74, 0.32], [0.56, 3.06, 0.3], 0.065, 8));
  add(cylinder(0.018, 0.022, 1.05, 6, { x: 0.68, y: 3.5, z: 0.3, rotZ: -0.3 })); // sword
  add(box(0.2, 0.04, 0.06, { x: 0.6, y: 3.1, z: 0.3 }));
  add(capsule([0.05, 2.55, -0.24], [0.46, 2.15, -0.2], 0.07, 8));
  for (const s of [-1, 1]) {
    add(capsule([0.05, 1.96, s * 0.3], [0.36, 1.4, s * 0.43], 0.1, 8));
    add(capsule([0.36, 1.4, s * 0.43], [0.26, 0.96, s * 0.46], 0.08, 8));
    add(box(0.28, 0.1, 0.12, { x: 0.32, y: 0.93, z: s * 0.46 }));
  }
  add(sphere(0.3, { x: -0.36, y: 2.3, z: 0, sx: 0.6, sy: 1.2, sz: 1.0, seg: 12 })); // cloak
  // Reins
  add(capsule([0.46, 2.15, -0.2], [1.6, 2.15, -0.1], 0.015, 5));
  const g = new THREE.Group();
  g.name = 'EquestrianStatue';
  b.build(g, { name: 'Statue' });
  return g;
}
