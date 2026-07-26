import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

/** Central asset loading with progress reporting. */
export class Assets {
  constructor(renderer) {
    this.renderer = renderer;
    this.manager = new THREE.LoadingManager();
    this.texLoader = new THREE.TextureLoader(this.manager);
    this.gltfLoader = new GLTFLoader(this.manager);
    this.rgbeLoader = new RGBELoader(this.manager);
    this.cache = new Map();
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
  }

  onProgress(fn) {
    this.manager.onProgress = (url, loaded, total) => fn(loaded / Math.max(total, 1), url);
  }

  texture(url, { srgb = false, repeat = null, aniso = true, wrap = THREE.RepeatWrapping } = {}) {
    const key = `tex:${url}:${srgb}:${repeat}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const t = this.texLoader.load(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = wrap;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    if (aniso) t.anisotropy = Math.min(8, this.maxAniso);
    this.cache.set(key, t);
    return t;
  }

  async gltf(url) {
    const key = `gltf:${url}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = new Promise((resolve, reject) => this.gltfLoader.load(url, resolve, undefined, reject));
    this.cache.set(key, p);
    return p;
  }

  async hdr(url) {
    const key = `hdr:${url}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = new Promise((resolve, reject) => this.rgbeLoader.load(url, (t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      resolve(t);
    }, undefined, reject));
    this.cache.set(key, p);
    return p;
  }

  /**
   * Load a PBR texture set from /assets/textures/<name>/ (diff/normal/rough/ao[/arm]).
   * Returns { map, normalMap, roughnessMap, aoMap } — only maps that exist.
   */
  pbr(name, repeat = [1, 1]) {
    const base = `/assets/textures/${name}`;
    const out = {
      map: this.texture(`${base}/diff.jpg`, { srgb: true, repeat }),
      normalMap: this.texture(`${base}/normal.jpg`, { repeat }),
    };
    out.roughnessMap = this.texture(`${base}/rough.jpg`, { repeat });
    out.aoMap = this.texture(`${base}/ao.jpg`, { repeat });
    return out;
  }
}
