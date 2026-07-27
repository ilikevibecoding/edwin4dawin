import * as THREE from 'three';
import { TAU } from '../../core/MathUtils';

/**
 * Spring-damper primitives for viewmodel animation.
 *
 * Springs are parameterised by frequency (Hz) and damping ratio rather than raw
 * stiffness: frequency is "how quickly it settles", ratio 1.0 is critically
 * damped, below 1 overshoots. That is the pair an animator actually reasons
 * about, and it keeps behaviour identical whatever the mass scale of the value
 * being driven.
 */

/** Integration is substepped so a 100 ms hitch cannot blow a stiff spring up. */
const MAX_STEP = 1 / 300;

export class Spring1 {
  value: number;
  velocity = 0;
  target: number;
  frequency: number;
  damping: number;

  constructor(value = 0, frequency = 12, damping = 1) {
    this.value = value;
    this.target = value;
    this.frequency = frequency;
    this.damping = damping;
  }

  step(dt: number): number {
    if (dt <= 0) return this.value;
    const omega = TAU * this.frequency;
    const k = omega * omega;
    const c = 2 * this.damping * omega;
    let remaining = dt;
    while (remaining > 1e-7) {
      const h = remaining > MAX_STEP ? MAX_STEP : remaining;
      remaining -= h;
      this.velocity += ((this.target - this.value) * k - this.velocity * c) * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  impulse(v: number): void {
    this.velocity += v;
  }

  snap(v: number): void {
    this.value = v;
    this.target = v;
    this.velocity = 0;
  }

  configure(frequency: number, damping: number): void {
    this.frequency = frequency;
    this.damping = damping;
  }

  get settled(): boolean {
    return Math.abs(this.velocity) < 1e-4 && Math.abs(this.target - this.value) < 1e-4;
  }
}

export class Spring3 {
  readonly value = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly target = new THREE.Vector3();
  frequency: number;
  damping: number;

  constructor(frequency = 12, damping = 1) {
    this.frequency = frequency;
    this.damping = damping;
  }

  step(dt: number): THREE.Vector3 {
    if (dt <= 0) return this.value;
    const omega = TAU * this.frequency;
    const k = omega * omega;
    const c = 2 * this.damping * omega;
    let remaining = dt;
    while (remaining > 1e-7) {
      const h = remaining > MAX_STEP ? MAX_STEP : remaining;
      remaining -= h;
      this.velocity.x += ((this.target.x - this.value.x) * k - this.velocity.x * c) * h;
      this.velocity.y += ((this.target.y - this.value.y) * k - this.velocity.y * c) * h;
      this.velocity.z += ((this.target.z - this.value.z) * k - this.velocity.z * c) * h;
      this.value.addScaledVector(this.velocity, h);
    }
    return this.value;
  }

  impulse(x: number, y: number, z: number): void {
    this.velocity.x += x;
    this.velocity.y += y;
    this.velocity.z += z;
  }

  snap(x = 0, y = 0, z = 0): void {
    this.value.set(x, y, z);
    this.target.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }

  configure(frequency: number, damping: number): void {
    this.frequency = frequency;
    this.damping = damping;
  }
}

/**
 * Additive pose delta. Rotations are stored as small-angle Euler radians and
 * summed; composing them as quaternions would be marginally more correct but
 * the layers never exceed a few tens of degrees, and additive Euler keeps the
 * stack commutative, which is what makes layer ordering safe to reshuffle.
 */
export class PoseDelta {
  readonly position = new THREE.Vector3();
  readonly rotation = new THREE.Vector3();
  /** Extra field-of-view scale contributed by layers (1 = untouched). */
  fovScale = 1;

  reset(): this {
    this.position.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
    this.fovScale = 1;
    return this;
  }

  addPosition(x: number, y: number, z: number, weight = 1): this {
    this.position.x += x * weight;
    this.position.y += y * weight;
    this.position.z += z * weight;
    return this;
  }

  addRotation(x: number, y: number, z: number, weight = 1): this {
    this.rotation.x += x * weight;
    this.rotation.y += y * weight;
    this.rotation.z += z * weight;
    return this;
  }

  addVectors(pos: THREE.Vector3, rot: THREE.Vector3, weight = 1): this {
    this.position.addScaledVector(pos, weight);
    this.rotation.addScaledVector(rot, weight);
    return this;
  }

  add(other: PoseDelta, weight = 1): this {
    this.position.addScaledVector(other.position, weight);
    this.rotation.addScaledVector(other.rotation, weight);
    this.fovScale *= 1 + (other.fovScale - 1) * weight;
    return this;
  }
}

/** A pose in the viewmodel's own space: where the weapon sits and how it faces. */
export class Pose {
  readonly position = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();

  copy(other: Pose): this {
    this.position.copy(other.position);
    this.quaternion.copy(other.quaternion);
    return this;
  }

  set(position: THREE.Vector3, quaternion: THREE.Quaternion): this {
    this.position.copy(position);
    this.quaternion.copy(quaternion);
    return this;
  }

  lerp(a: Pose, b: Pose, t: number): this {
    this.position.lerpVectors(a.position, b.position, t);
    this.quaternion.copy(a.quaternion).slerp(b.quaternion, t);
    return this;
  }
}

export interface AnimLayerContext {
  dt: number;
  time: number;
}

/** One additive contributor to the final viewmodel pose. */
export interface AnimLayer<S> {
  readonly name: string;
  weight: number;
  apply(dt: number, state: S, out: PoseDelta): void;
  reset?(): void;
}

/**
 * Ordered additive stack. Order matters only for layers that read the running
 * total (the obstruction layer does, to know where the muzzle ended up), so it
 * is evaluated strictly front to back.
 */
export class LayerStack<S> {
  private readonly layers: AnimLayer<S>[] = [];
  readonly delta = new PoseDelta();

  add(layer: AnimLayer<S>): this {
    this.layers.push(layer);
    return this;
  }

  get<T extends AnimLayer<S>>(name: string): T | undefined {
    return this.layers.find((l) => l.name === name) as T | undefined;
  }

  evaluate(dt: number, state: S): PoseDelta {
    this.delta.reset();
    for (const layer of this.layers) {
      if (layer.weight <= 0) continue;
      layer.apply(dt, state, this.delta);
    }
    return this.delta;
  }

  resetAll(): void {
    for (const layer of this.layers) layer.reset?.();
  }
}

/** Cheap ballistic-feeling decay used for one-shot punches. */
export const decayTo = (current: number, target: number, rate: number, dt: number): number =>
  target + (current - target) * Math.exp(-rate * dt);
