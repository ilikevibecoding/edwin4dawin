import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The ship is modelled as several hundred small primitives, which is pleasant
 * to author and terrible to draw. Everything that never moves is baked into one
 * merged mesh per material; anything tagged `userData.dynamic` (sails, guns,
 * the wheel, the rudder, lanterns) is left alone.
 */
export function mergeStatic(root) {
  const byMaterial = new Map();
  const lines = [];

  const visit = (object) => {
    for (const child of [...object.children]) {
      if (child.userData.dynamic) continue;
      if (child.isMesh && child.geometry?.attributes.position) {
        const key = child.material;
        if (!byMaterial.has(key)) byMaterial.set(key, []);
        byMaterial.get(key).push(child);
      } else if (child.isLineSegments) {
        lines.push(child);
      }
      visit(child);
    }
  };
  visit(root);

  const cleanup = [];

  for (const [material, meshes] of byMaterial) {
    if (meshes.length < 2) continue;
    const geometries = [];
    for (const mesh of meshes) {
      mesh.updateWorldMatrix(true, false);
      const geometry = mesh.geometry.clone();
      // Merging requires an identical attribute set on every input.
      for (const name of Object.keys(geometry.attributes)) {
        if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
      }
      if (!geometry.attributes.normal) geometry.computeVertexNormals();
      if (!geometry.attributes.uv) {
        geometry.setAttribute(
          'uv',
          new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2),
        );
      }
      geometry.applyMatrix4(root.matrixWorld.clone().invert().multiply(mesh.matrixWorld));
      geometry.morphAttributes = {};
      geometries.push(geometry.index ? geometry.toNonIndexed() : geometry);
      cleanup.push(mesh);
    }

    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) continue;

    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `merged:${material.name || material.uuid.slice(0, 6)}`;
    root.add(mesh);
  }

  if (lines.length > 1) {
    const positions = [];
    for (const line of lines) {
      line.updateWorldMatrix(true, false);
      const geometry = line.geometry.clone();
      geometry.applyMatrix4(root.matrixWorld.clone().invert().multiply(line.matrixWorld));
      positions.push(...geometry.attributes.position.array);
      geometry.dispose();
      cleanup.push(line);
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const combined = new THREE.LineSegments(merged, lines[0].material);
    combined.name = 'merged:rigging';
    root.add(combined);
  }

  // The originals were never drawn, so there is no GPU buffer to release.
  for (const object of cleanup) object.removeFromParent();

  // Drop the now-empty scaffolding groups.
  const prune = (object) => {
    for (const child of [...object.children]) {
      prune(child);
      if (
        child.type === 'Group' &&
        child.children.length === 0 &&
        !child.userData.dynamic &&
        !child.userData.keep
      ) {
        child.removeFromParent();
      }
    }
  };
  prune(root);
}
