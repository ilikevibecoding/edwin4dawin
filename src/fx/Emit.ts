import * as THREE from 'three';
import { rng, TAU } from '../core/MathUtils';

/**
 * Allocation-free directional sampling around an axis.
 *
 * Emitters call `set()` once with the surface normal or muzzle direction, then
 * sample as many directions as they need. Building the tangent frame from the
 * axis's smallest component keeps it well conditioned for every orientation.
 */
export class Basis {
  readonly axis = new THREE.Vector3(0, 1, 0);
  readonly t1 = new THREE.Vector3(1, 0, 0);
  readonly t2 = new THREE.Vector3(0, 0, 1);

  set(axis: THREE.Vector3): this {
    this.axis.copy(axis);
    if (this.axis.lengthSq() < 1e-8) this.axis.set(0, 1, 0);
    this.axis.normalize();
    const ax = Math.abs(this.axis.x);
    const ay = Math.abs(this.axis.y);
    const az = Math.abs(this.axis.z);
    if (ax <= ay && ax <= az) this.t1.set(1, 0, 0);
    else if (ay <= az) this.t1.set(0, 1, 0);
    else this.t1.set(0, 0, 1);
    this.t2.crossVectors(this.axis, this.t1).normalize();
    this.t1.crossVectors(this.t2, this.axis).normalize();
    return this;
  }

  /**
   * Random direction inside a cone. `spread` is 0 for straight along the axis,
   * 1 for the full hemisphere and 2 for the whole sphere.
   */
  cone(spread: number, out: THREE.Vector3): THREE.Vector3 {
    const cosTheta = 1 - rng.next() * spread;
    const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
    const phi = rng.next() * TAU;
    const c = Math.cos(phi) * sinTheta;
    const s = Math.sin(phi) * sinTheta;
    out.set(
      this.axis.x * cosTheta + this.t1.x * c + this.t2.x * s,
      this.axis.y * cosTheta + this.t1.y * c + this.t2.y * s,
      this.axis.z * cosTheta + this.t1.z * c + this.t2.z * s,
    );
    return out;
  }

  /** Random unit direction in the tangent plane. */
  tangent(out: THREE.Vector3): THREE.Vector3 {
    const phi = rng.next() * TAU;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    out.set(
      this.t1.x * c + this.t2.x * s,
      this.t1.y * c + this.t2.y * s,
      this.t1.z * c + this.t2.z * s,
    );
    return out;
  }

  /** Point offset from the origin inside a disc of `radius` on the tangent plane. */
  discOffset(radius: number, out: THREE.Vector3): THREE.Vector3 {
    const r = Math.sqrt(rng.next()) * radius;
    this.tangent(out);
    return out.multiplyScalar(r);
  }
}

/** Shared scratch space for the emitters. Never held across a call. */
export const fxScratch = {
  a: /* @__PURE__ */ new THREE.Vector3(),
  b: /* @__PURE__ */ new THREE.Vector3(),
  c: /* @__PURE__ */ new THREE.Vector3(),
  color: /* @__PURE__ */ new THREE.Color(),
  color2: /* @__PURE__ */ new THREE.Color(),
};

/** Unpack a hex colour into a scratch Color and return it. */
export function hexColor(hex: number, into: THREE.Color): THREE.Color {
  return into.setHex(hex, THREE.SRGBColorSpace);
}
