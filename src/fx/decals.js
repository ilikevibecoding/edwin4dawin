import * as THREE from 'three';
import { bulletHoleSprite, scorchSprite, tex } from '../world/textures.js';

/**
 * Scorch sprite deepened for range readability: near-opaque charred core
 * (~2-3m at explosion scale) with the ragged fringe kept — the stock bake
 * washed out beyond ~20m against the bright desert ground.
 */
function deepScorchCanvas(size = 256) {
  const c = scorchSprite(size);
  const ctx = c.getContext('2d');
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = y / size - 0.5;
    for (let x = 0; x < size; x++) {
      const u = x / size - 0.5;
      const r = Math.sqrt(u * u + v * v) * 2;
      const k = Math.max(0, Math.min(1, (r - 0.3) / 0.45));
      const boost = 1.55 - 0.55 * k; // core alpha x1.55, fringe untouched
      const i = (y * size + x) * 4;
      d[i + 3] = Math.min(255, d[i + 3] * boost);
      d[i] *= 0.72; d[i + 1] *= 0.72; d[i + 2] *= 0.72;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Pooled surface decals: bullet holes + explosion scorch marks. */
export class DecalSystem {
  constructor(scene, { holes = 140, scorches = 26 } = {}) {
    this.scene = scene;
    this.holes = this._makePool(bulletHoleSprite(64), holes, 0.14);
    this.scorches = this._makePool(deepScorchCanvas(256), scorches, 4.4);
  }

  _makePool(sprite, capacity, baseSize) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex(sprite),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    mat.map.wrapS = mat.map.wrapT = THREE.ClampToEdgeWrapping;
    const pool = { meshes: [], idx: 0, baseSize };
    for (let i = 0; i < capacity; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.visible = false;
      m.renderOrder = 4;
      this.scene.add(m);
      pool.meshes.push(m);
    }
    return pool;
  }

  _place(pool, pos, normal, scale) {
    const m = pool.meshes[pool.idx];
    pool.idx = (pool.idx + 1) % pool.meshes.length;
    m.visible = true;
    m.position.copy(pos).addScaledVector(normal, 0.015 + Math.random() * 0.008);
    const target = pos.clone().add(normal);
    m.lookAt(target);
    m.rotateZ(Math.random() * Math.PI * 2);
    const s = pool.baseSize * scale;
    m.scale.set(s, s, s);
  }

  bulletHole(pos, normal) {
    this._place(this.holes, pos, normal, 0.8 + Math.random() * 0.5);
  }

  scorch(pos, scale = 1) {
    this._place(this.scorches, pos.clone().setY(Math.max(pos.y, 0.02)), new THREE.Vector3(0, 1, 0), scale);
  }
}
