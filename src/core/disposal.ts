import * as THREE from 'three';

/**
 * GPU resource bookkeeping.
 *
 * Every factory registers the geometries, materials and textures it creates so
 * that a scene teardown (quality change, restart, unload) can release them
 * instead of leaking. `disposeSubtree` is the belt-and-braces sweep for
 * anything that slipped through.
 */
export class DisposalRegistry {
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private extra = new Set<{ dispose(): void }>();

  track<T extends THREE.BufferGeometry | THREE.Material | THREE.Texture | { dispose(): void }>(item: T): T {
    if (item instanceof THREE.BufferGeometry) this.geometries.add(item);
    else if (item instanceof THREE.Material) this.materials.add(item);
    else if (item instanceof THREE.Texture) this.textures.add(item);
    else this.extra.add(item as { dispose(): void });
    return item;
  }

  trackAll<T extends THREE.Material>(items: T[]): T[] {
    items.forEach((m) => this.track(m));
    return items;
  }

  get size(): number {
    return this.geometries.size + this.materials.size + this.textures.size + this.extra.size;
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.extra.forEach((e) => e.dispose());
    this.geometries.clear();
    this.materials.clear();
    this.textures.clear();
    this.extra.clear();
  }
}

/** Recursively dispose the GPU payload of a subtree and detach it. */
export function disposeSubtree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(mat)) mat.forEach(disposeMaterial);
    else if (mat) disposeMaterial(mat);
  });
  root.parent?.remove(root);
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material as unknown as Record<string, unknown>)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}
