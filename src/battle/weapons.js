// Turbolaser / laser bolts: one InstancedMesh of glowing capsules, pooled. A bolt flies from a hardpoint
// to a target point; on arrival it reports a hit (explosion, damage) through the callback.
import * as THREE from "three";

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _dir = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export const BOLT_COLORS = {
  republic: new THREE.Color(1.0, 0.22, 0.12), // red turbolasers
  separatist: new THREE.Color(0.25, 1.0, 0.75), // teal-green
  fighterRepublic: new THREE.Color(1.0, 0.3, 0.2),
  fighterSeparatist: new THREE.Color(0.9, 0.35, 0.2),
  jedi: new THREE.Color(0.3, 1.0, 0.35),
  ion: new THREE.Color(0.45, 0.7, 1.0),
};

export class Bolts {
  constructor(scene, capacity = 1500) {
    this.capacity = capacity;
    // unit capsule along +Z: a stretched cylinder with a bright core and a soft outer layer (two meshes)
    const core = new THREE.CylinderGeometry(0.42, 0.42, 1, 8, 1, false);
    core.rotateX(Math.PI / 2);
    const glow = new THREE.CylinderGeometry(1, 1, 1, 8, 1, false);
    glow.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.core = new THREE.InstancedMesh(core, coreMat, capacity);
    this.glow = new THREE.InstancedMesh(glow, glowMat, capacity);
    for (const im of [this.core, this.glow]) {
      im.frustumCulled = false;
      im.count = 0;
      im.name = "bolts";
      im.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(capacity * 3).fill(1),
        3,
      );
      im.instanceColor.setUsage(THREE.DynamicDrawUsage);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(im);
    }
    this.core.renderOrder = 10;
    this.glow.renderOrder = 9;
    this.bolts = [];
    this.onHit = null; // (bolt) => void
    this.fired = 0;
  }

  /**
   * @param from Vector3, to Vector3 (world), opts { color: Color, speed, length, radius, damage, target, side }
   */
  fire(from, to, opts = {}) {
    if (this.bolts.length >= this.capacity) return null;
    const b = {
      from: from.clone(),
      to: to.clone(),
      dir: to.clone().sub(from),
      speed: opts.speed || 2600,
      length: opts.length || 60,
      radius: opts.radius || 2.2,
      color: opts.color || BOLT_COLORS.republic,
      damage: opts.damage || 1,
      target: opts.target || null,
      side: opts.side || "republic",
      kind: opts.kind || "turbo",
      t: 0,
    };
    b.dist = b.dir.length();
    b.dir.normalize();
    this.bolts.push(b);
    this.fired++;
    return b;
  }

  update(dt) {
    let n = 0;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.t += b.speed * dt;
      if (b.t >= b.dist) {
        if (this.onHit) this.onHit(b);
        this.bolts[i] = this.bolts[this.bolts.length - 1];
        this.bolts.pop();
        continue;
      }
    }
    for (const b of this.bolts) {
      // capsule centre trails the head by half its length
      const head = Math.min(b.t, b.dist);
      const tail = Math.max(0, head - b.length);
      const len = Math.max(1, head - tail);
      _p.copy(b.from).addScaledVector(b.dir, (head + tail) / 2);
      _q.setFromUnitVectors(Z, b.dir);
      _s.set(b.radius, b.radius, len);
      _m.compose(_p, _q, _s);
      this.core.setMatrixAt(n, _m);
      this.core.setColorAt(n, b.color);
      _s.set(b.radius * 2.6, b.radius * 2.6, len * 1.05);
      _m.compose(_p, _q, _s);
      this.glow.setMatrixAt(n, _m);
      this.glow.setColorAt(n, b.color);
      n++;
    }
    for (const im of [this.core, this.glow]) {
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
    }
  }

  get alive() {
    return this.bolts.length;
  }
}
