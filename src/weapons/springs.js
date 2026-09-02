import * as THREE from 'three';

/** Critically-damped-ish 3D spring used for procedural view-model motion. */
export class Spring3 {
  constructor(stiffness = 120, damping = 12) {
    this.value = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.stiffness = stiffness;
    this.damping = damping;
  }

  /** Add an instantaneous velocity impulse. */
  kick(x, y, z) {
    this.velocity.x += x;
    this.velocity.y += y;
    this.velocity.z += z;
  }

  update(dt) {
    // Semi-implicit Euler, sub-stepped for stability at low frame rates.
    const steps = dt > 1 / 50 ? Math.ceil(dt / (1 / 60)) : 1;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const ax = (this.target.x - this.value.x) * this.stiffness - this.velocity.x * this.damping;
      const ay = (this.target.y - this.value.y) * this.stiffness - this.velocity.y * this.damping;
      const az = (this.target.z - this.value.z) * this.stiffness - this.velocity.z * this.damping;
      this.velocity.x += ax * h;
      this.velocity.y += ay * h;
      this.velocity.z += az * h;
      this.value.x += this.velocity.x * h;
      this.value.y += this.velocity.y * h;
      this.value.z += this.velocity.z * h;
    }
    return this.value;
  }
}

export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeIn = (t) => t * t * t;
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
export const clamp01 = (t) => Math.min(1, Math.max(0, t));
/** Normalised progress of `t` within [a, b], clamped to [0, 1]. */
export const phase = (t, [a, b]) => clamp01((t - a) / (b - a));
