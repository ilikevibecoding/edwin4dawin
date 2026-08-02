import * as THREE from 'three';

/**
 * GPU resource bookkeeping. Anything created by an asset factory is registered
 * here so a quality change or scene teardown can release it deterministically.
 */
export class DisposalBin {
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private targets = new Set<THREE.WebGLRenderTarget>();
  private extra: Array<() => void> = [];

  track<T extends THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.WebGLRenderTarget>(
    resource: T,
  ): T {
    if ((resource as THREE.BufferGeometry).isBufferGeometry)
      this.geometries.add(resource as THREE.BufferGeometry);
    else if ((resource as THREE.Material).isMaterial) this.materials.add(resource as THREE.Material);
    else if ((resource as THREE.Texture).isTexture) this.textures.add(resource as THREE.Texture);
    else this.targets.add(resource as THREE.WebGLRenderTarget);
    return resource;
  }

  onDispose(fn: () => void): void {
    this.extra.push(fn);
  }

  /** Recursively register everything hanging off an object. */
  trackObject(root: THREE.Object3D): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) this.track(mesh.geometry);
      const mat = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(mat)) mat.forEach((m) => this.track(m));
      else if (mat) this.track(mat);
    });
  }

  get counts(): { geometries: number; materials: number; textures: number; targets: number } {
    return {
      geometries: this.geometries.size,
      materials: this.materials.size,
      textures: this.textures.size,
      targets: this.targets.size,
    };
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.targets.forEach((t) => t.dispose());
    this.extra.forEach((fn) => fn());
    this.geometries.clear();
    this.materials.clear();
    this.textures.clear();
    this.targets.clear();
    this.extra.length = 0;
  }
}

/** Remove an object from its parent and free its GPU resources. */
export function disposeObject(root: THREE.Object3D): void {
  root.parent?.remove(root);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const mat = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose?.();
  });
}
