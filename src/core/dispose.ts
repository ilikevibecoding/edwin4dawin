import * as THREE from 'three';

/**
 * Recursively release GPU resources owned by a subtree.
 *
 * Materials and textures are reference-counted by hand: shared library
 * materials register themselves in `protectedResources` so that disposing one
 * scene never rips textures out from under another.
 */
const protectedResources = new Set<THREE.Material | THREE.Texture>();

export function protectResource<T extends THREE.Material | THREE.Texture>(res: T): T {
  protectedResources.add(res);
  return res;
}

function disposeMaterial(material: THREE.Material): void {
  if (protectedResources.has(material)) return;
  for (const value of Object.values(material as unknown as Record<string, unknown>)) {
    if (value && (value as THREE.Texture).isTexture) {
      const tex = value as THREE.Texture;
      if (!protectedResources.has(tex)) tex.dispose();
    }
  }
  material.dispose();
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(mat)) mat.forEach(disposeMaterial);
    else if (mat) disposeMaterial(mat);
  });
  root.parent?.remove(root);
  root.clear();
}

/** Count live GPU objects — surfaced in the debug overlay. */
export function resourceReport(renderer: THREE.WebGLRenderer): string {
  const info = renderer.info;
  return `geo ${info.memory.geometries} tex ${info.memory.textures} calls ${info.render.calls} tris ${info.render.triangles}`;
}
