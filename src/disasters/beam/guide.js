// Preview-only guide line(s): thin additive cylinders between arbitrary points, merged into ONE geometry / draw call.
// Used to show the aim line from the target marker up to the station's firing position (brighter) and on toward
// where the station first appears (fainter). With additive blending the per-vertex colour doubles as opacity.
import * as THREE from 'three';

export class PreviewGuide {
  // segments: [{a:{x,y,z}, b:{x,y,z}, brightness, radius}]
  constructor(scene, segments) {
    this.scene = scene;
    const pos = [], col = [], idx = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    for (const s of segments) {
      dir.set(s.b.x - s.a.x, s.b.y - s.a.y, s.b.z - s.a.z);
      const len = dir.length();
      if (len < 0.01) continue;
      dir.divideScalar(len);
      const g = new THREE.CylinderGeometry(s.radius || 0.14, s.radius || 0.14, len, 8, 1, true);
      q.setFromUnitVectors(up, dir);
      m.makeRotationFromQuaternion(q).setPosition((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2, (s.a.z + s.b.z) / 2);
      g.applyMatrix4(m);
      const base = pos.length / 3;
      const p = g.attributes.position.array;
      const k = s.brightness ?? 1;
      for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); col.push(0.45 * k, 0.95 * k, 0.6 * k); }
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(base + ix[i]);
      g.dispose();
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.geometry.setIndex(idx);
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    scene.add(this.mesh);
  }
  set(opacity) { this.material.opacity = opacity; }
  dispose() { this.scene.remove(this.mesh); this.geometry.dispose(); this.material.dispose(); }
}
