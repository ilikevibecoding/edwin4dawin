// Temporary budgeting helper: build every registered ship in node and report
// triangles / meshes. Deleted before hand-off.
import * as THREE from 'three';
import './index.js';
import { models, make } from '../registry.js';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...models.keys()];
for (const id of ids) {
  const o = await make(id);
  let tris = 0, meshes = 0;
  const box = new THREE.Box3().setFromObject(o);
  o.traverse((m) => {
    if (!m.isMesh) return;
    meshes++;
    const g = m.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  const s = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  console.log(`${id.padEnd(14)} tris=${String(tris).padStart(7)} meshes=${String(meshes).padStart(3)}`
    + `  size=${s.x.toFixed(1)}x${s.y.toFixed(1)}x${s.z.toFixed(1)}`
    + `  centre=(${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)})`
    + `  nodes=[${Object.keys(o.userData.nodes || {}).join(',')}]`);
}
