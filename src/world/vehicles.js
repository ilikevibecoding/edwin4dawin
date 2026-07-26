// Vehicles — owner: Fable 4 (Wave B). Currently the placeholder van moved out
// of game.js so the detailed replacement stays in one owned file.
// Contract: createExtractionVan(world, group) places the van at
// MAP.EXTRACTION.vanAt, registers its collider, returns the THREE.Group.

import * as THREE from 'three';
import { getMaterial } from './materials.js';
import * as MAP from './map.js';

export function createExtractionVan(world, group) {
  // PLACEHOLDER VEH-000 — replaced by the vehicle art pass
  const van = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.9, 4.6), getMaterial('metal_painted'));
  body.position.y = 1.35;
  body.castShadow = true;
  van.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.1, 1.4), getMaterial('metal_dark'));
  cab.position.set(0, 1.0, -2.6);
  van.add(cab);
  for (const [wx, wz] of [[-0.95, -1.6], [0.95, -1.6], [-0.95, 1.6], [0.95, 1.6]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), getMaterial('rubber'));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    van.add(wheel);
  }
  const v = MAP.EXTRACTION.vanAt;
  van.position.set(v.x, MAP.EXTRACTION.y, v.z);
  van.rotation.y = THREE.MathUtils.degToRad(v.faceDeg + 90);
  group.add(van);
  world.addCollider({
    x0: v.x - 2.4, y0: MAP.EXTRACTION.y, z0: v.z - 1.3, x1: v.x + 2.4, y1: MAP.EXTRACTION.y + 2.2, z1: v.z + 1.3,
    blocksMove: true, blocksSight: true, kind: 'prop', surface: 'metal',
  });
  return van;
}
