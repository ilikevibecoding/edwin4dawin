/**
 * PLACEHOLDER — replaced by the full procedural material pipeline.
 * Keeps the build green while modules are developed in parallel.
 */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { MaterialId, MaterialLibrary, ProcgenSystem } from '../core/Contracts';
import type { SurfaceType } from '../core/GameTypes';

class StubLibrary implements MaterialLibrary {
  private readonly cache = new Map<string, THREE.MeshStandardMaterial>();

  get(id: MaterialId): THREE.MeshStandardMaterial {
    let m = this.cache.get(id);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.85, metalness: 0 });
      m.name = id;
      this.cache.set(id, m);
    }
    return m;
  }
  clone(id: MaterialId): THREE.MeshStandardMaterial {
    return this.get(id).clone();
  }
  tiled(id: MaterialId): THREE.MeshStandardMaterial {
    return this.get(id);
  }
  has(): boolean {
    return true;
  }
  surfaceOf(): SurfaceType {
    return 'concrete';
  }
  debugList(): Array<{ id: string; maps: string[] }> {
    return [];
  }
  dispose(): void {
    for (const m of this.cache.values()) m.dispose();
    this.cache.clear();
  }
}

export class ProcgenSystemImpl implements ProcgenSystem, System {
  readonly name = 'procgen' as const;
  readonly order = ORDER.INPUT;
  readonly materials: MaterialLibrary = new StubLibrary();
  environmentMap: THREE.Texture | null = null;
  blueNoise!: THREE.DataTexture;

  init(_ctx: EngineContext): void {
    const size = 4;
    const data = new Uint8Array(size * size * 4).fill(128);
    this.blueNoise = new THREE.DataTexture(data, size, size);
    this.blueNoise.needsUpdate = true;
  }

  dispose(): void {
    this.materials.dispose();
    this.blueNoise?.dispose();
  }
}
