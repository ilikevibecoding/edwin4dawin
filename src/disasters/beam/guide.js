// Preview-only vertical guide line from the target marker up to the focus altitude (one thin additive cylinder).
import * as THREE from 'three';

export class PreviewGuide {
  constructor(scene, x, y0, z, y1) {
    this.scene = scene;
    this.geometry = new THREE.CylinderGeometry(0.14, 0.14, y1 - y0, 8, 1, true);
    this.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.9, 1.0), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(x, (y0 + y1) / 2, z);
    this.mesh.renderOrder = 9;
    scene.add(this.mesh);
  }
  set(opacity) { this.material.opacity = opacity; }
  dispose() { this.scene.remove(this.mesh); this.geometry.dispose(); this.material.dispose(); }
}
