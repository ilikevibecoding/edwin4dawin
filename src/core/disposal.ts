/** GPU resource bookkeeping. Anything allocated here is guaranteed released. */

import * as THREE from 'three';

type Disposable = { dispose(): void };

export class DisposalBin {
  private items = new Set<Disposable>();

  track<T extends Disposable>(item: T): T {
    this.items.add(item);
    return item;
  }

  trackAll<T extends Disposable>(...items: T[]): void {
    for (const i of items) this.items.add(i);
  }

  /** Walk an object graph and register every geometry, material and texture. */
  trackTree(root: THREE.Object3D): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) this.items.add(mesh.geometry);
      const mat = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(mat)) mat.forEach((m) => this.trackMaterial(m));
      else if (mat) this.trackMaterial(mat);
    });
  }

  private trackMaterial(m: THREE.Material): void {
    this.items.add(m);
    for (const value of Object.values(m as unknown as Record<string, unknown>)) {
      if (value && (value as THREE.Texture).isTexture) this.items.add(value as THREE.Texture);
    }
  }

  get size(): number {
    return this.items.size;
  }

  dispose(): void {
    for (const item of this.items) {
      try {
        item.dispose();
      } catch {
        /* a double-dispose is harmless; keep unwinding */
      }
    }
    this.items.clear();
  }
}

/** Detach `obj` from its parent and release everything it owns. */
export function destroy(obj: THREE.Object3D): void {
  obj.removeFromParent();
  const bin = new DisposalBin();
  bin.trackTree(obj);
  bin.dispose();
}
