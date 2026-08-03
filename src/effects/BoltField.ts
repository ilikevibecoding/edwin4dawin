import * as THREE from 'three';
import type { MaterialLibrary } from '../assets/materials';
import { saturate } from '../core/mathx';

/**
 * Energy bolts with honest travel time.
 *
 * A bolt is declared as "leaves A at t0, arrives at B at t1". The renderer
 * interpolates along that segment, so the viewer can watch turbolaser fire
 * cross the gap between two ships - the single most important readability cue
 * in the pursuit sequence. Everything is precomputed, so the whole field is a
 * pure function of time.
 */

export interface BoltEvent {
  t0: number;
  t1: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: THREE.ColorRepresentation;
  /** Bolt half-length in world units. */
  length: number;
  radius: number;
  /** Optional muzzle-flash radius; 0 disables. */
  muzzle?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _color = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(0, 1e9, 0);

export class BoltField {
  readonly mesh: THREE.InstancedMesh;
  readonly glow: THREE.InstancedMesh;
  private events: BoltEvent[] = [];
  private capacity: number;
  /** Index of the first event whose t1 >= current time, for cheap scanning. */
  private sorted = true;

  constructor(lib: MaterialLibrary, capacity = 96, name = 'bolts') {
    this.capacity = capacity;

    // The bolt core: a capsule-ish cylinder pointing down +Z after rotation.
    const coreGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, false);
    coreGeo.rotateX(Math.PI / 2);
    lib.registry.track(coreGeo);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, toneMapped: false, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    lib.registry.track(coreMat);
    this.mesh = new THREE.InstancedMesh(coreGeo, coreMat, capacity);
    this.mesh.name = `${name}:core`;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = capacity;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

    // A softer, fatter halo around the core sells the energy read.
    const glowGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, false);
    glowGeo.rotateX(Math.PI / 2);
    lib.registry.track(glowGeo);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.24,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    lib.registry.track(glowMat);
    this.glow = new THREE.InstancedMesh(glowGeo, glowMat, capacity);
    this.glow.name = `${name}:glow`;
    this.glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.glow.frustumCulled = false;
    this.glow.count = capacity;
    this.glow.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.glow.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }

  add(event: BoltEvent): void {
    this.events.push(event);
    this.sorted = false;
  }

  addAll(events: BoltEvent[]): void {
    for (const e of events) this.events.push(e);
    this.sorted = false;
  }

  get count(): number {
    return this.events.length;
  }

  /** Bolts active at `t`, used by the audio system and QA assertions. */
  activeAt(t: number): number {
    let n = 0;
    for (const e of this.events) if (t >= e.t0 && t <= e.t1) n++;
    return n;
  }

  update(t: number): void {
    if (!this.sorted) {
      this.events.sort((a, b) => a.t0 - b.t0);
      this.sorted = true;
    }
    let slot = 0;
    for (const e of this.events) {
      if (t < e.t0 || t > e.t1) continue;
      if (slot >= this.capacity) break;

      const f = saturate((t - e.t0) / Math.max(1e-4, e.t1 - e.t0));
      _dir.copy(e.to).sub(e.from);
      const dist = _dir.length();
      if (dist < 1e-6) continue;
      _dir.divideScalar(dist);

      _pos.copy(e.from).addScaledVector(_dir, dist * f);
      _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _dir);
      // Squash the head of the bolt as it lands so it appears to be absorbed.
      const tail = f > 0.94 ? (1 - f) / 0.06 : 1;
      _scale.set(e.radius, e.radius, e.length * Math.max(0.25, tail));
      _m.compose(_pos, _q, _scale);
      this.mesh.setMatrixAt(slot, _m);
      _color.set(e.color);
      this.mesh.setColorAt(slot, _color);

      _scale.set(e.radius * 2.4, e.radius * 2.4, e.length * Math.max(0.25, tail) * 1.12);
      _m.compose(_pos, _q, _scale);
      this.glow.setMatrixAt(slot, _m);
      this.glow.setColorAt(slot, _color);
      slot++;
    }
    for (let i = slot; i < this.capacity; i++) {
      this.mesh.setMatrixAt(i, HIDDEN);
      this.glow.setMatrixAt(i, HIDDEN);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.glow.instanceColor) this.glow.instanceColor.needsUpdate = true;
  }
}
