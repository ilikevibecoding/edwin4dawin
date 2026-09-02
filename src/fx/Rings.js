import * as THREE from 'three';
import { CELLS, setPlaneUvToCell } from './textures.js';

const _q = new THREE.Quaternion();
const Z = new THREE.Vector3(0, 0, 1);

/**
 * Pooled flat expanding rings laid on a surface (explosion shockwave/dust ring, water splash ring).
 * Each ring is a small quad mesh with the RING atlas cell; a handful at most, so plain meshes are fine.
 */
export class Rings {
  constructor(fx, count = 8) {
    this.fx = fx;
    this.items = [];
    const geo = setPlaneUvToCell(new THREE.PlaneGeometry(1, 1), fx.atlas, CELLS.RING);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: fx.atlas.map,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        toneMapped: false,
        opacity: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 6;
      mesh.frustumCulled = false;
      fx.root.add(mesh);
      this.items.push({ mesh, age: 0, life: 0, s0: 1, s1: 2, alpha: 1, ease: 2 });
    }
  }

  /**
   * Spawn a ring at `point` in the plane perpendicular to `normal`, growing from s0 to s1 meters
   * (diameter) over `life` seconds while fading out.
   */
  spawn(point, normal, { s0 = 1, s1 = 6, life = 0.6, alpha = 0.8, color = 0xffffff, additive = false, ease = 2.2, lift = 0.03 } = {}) {
    let item = this.items.find((it) => !it.mesh.visible);
    if (!item) item = this.items.reduce((a, b) => (a.age / a.life > b.age / b.life ? a : b));
    const m = item.mesh;
    m.position.copy(point).addScaledVector(normal, lift);
    _q.setFromUnitVectors(Z, normal);
    m.quaternion.copy(_q);
    m.rotateZ(Math.random() * Math.PI * 2);
    m.scale.setScalar(s0);
    m.material.color.set(color);
    m.material.opacity = alpha;
    m.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    m.visible = true;
    item.age = 0;
    item.life = life;
    item.s0 = s0;
    item.s1 = s1;
    item.alpha = alpha;
    item.ease = ease;
    return item;
  }

  update(dt) {
    if (dt <= 0) return;
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.age += dt;
      const t = it.age / it.life;
      if (t >= 1) {
        it.mesh.visible = false;
        continue;
      }
      const te = 1 - Math.pow(1 - t, it.ease);
      it.mesh.scale.setScalar(it.s0 + (it.s1 - it.s0) * te);
      it.mesh.material.opacity = it.alpha * (1 - t) * (1 - t);
    }
  }
}
