import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/** Cached asset loading with a single progress signal for the loading screen. */
export class Assets {
  private gltfLoader = new GLTFLoader();
  private rgbeLoader = new RGBELoader();
  private texLoader = new THREE.TextureLoader();
  private gltfCache = new Map<string, Promise<GLTF>>();
  private texCache = new Map<string, Promise<THREE.Texture>>();
  private hdrCache = new Map<string, Promise<THREE.DataTexture>>();

  private total = 0;
  private done = 0;
  onProgress: ((fraction: number, label: string) => void) | null = null;

  constructor(private base = 'assets/') {}

  private track<T>(label: string, p: Promise<T>): Promise<T> {
    this.total++;
    this.emit(label);
    return p.then(
      (v) => {
        this.done++;
        this.emit(label);
        return v;
      },
      (e) => {
        this.done++;
        this.emit(label);
        throw e;
      }
    );
  }

  private emit(label: string): void {
    this.onProgress?.(this.total === 0 ? 1 : this.done / this.total, label);
  }

  gltf(path: string): Promise<GLTF> {
    const url = this.base + path;
    let p = this.gltfCache.get(url);
    if (!p) {
      p = this.track(path, this.gltfLoader.loadAsync(url));
      this.gltfCache.set(url, p);
    }
    return p;
  }

  hdr(path: string): Promise<THREE.DataTexture> {
    const url = this.base + path;
    let p = this.hdrCache.get(url);
    if (!p) {
      p = this.track(
        path,
        this.rgbeLoader.loadAsync(url).then((t) => {
          t.mapping = THREE.EquirectangularReflectionMapping;
          return t;
        })
      );
      this.hdrCache.set(url, p);
    }
    return p;
  }

  texture(
    path: string,
    opts: { srgb?: boolean; repeat?: [number, number]; anisotropy?: number } = {}
  ): Promise<THREE.Texture> {
    const key = `${path}|${JSON.stringify(opts)}`;
    let p = this.texCache.get(key);
    if (!p) {
      p = this.track(
        path,
        this.texLoader.loadAsync(this.base + path).then((t) => {
          if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
          if (opts.anisotropy) t.anisotropy = opts.anisotropy;
          return t;
        })
      );
      this.texCache.set(key, p);
    }
    return p;
  }

  /** JSON side-car data (voice line manifests, lipsync envelopes). */
  async json<T>(path: string): Promise<T> {
    const res = await this.track(path, fetch(this.base + path));
    if (!res.ok) throw new Error(`asset ${path}: ${res.status}`);
    return (await res.json()) as T;
  }

  async maybeJson<T>(path: string): Promise<T | null> {
    try {
      return await this.json<T>(path);
    } catch {
      return null;
    }
  }
}
