import * as THREE from 'three';
import { mergeAll } from '../assets/geometry';
import { Rng } from '../core/Rng';
import { saturate } from '../core/mathx';
import type { MaterialLibrary } from '../assets/materials';

/**
 * Tumbling hull fragments thrown off by heavy impacts.
 *
 * Like every other effect in the production this is a precomputed event table
 * evaluated as a pure function of time - no accumulating physics state, so a
 * scrub backwards puts every chunk exactly where it was.
 */

export interface DebrisEvent {
  t0: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  count: number;
  speed: number;
  size: number;
  life: number;
}

interface Chunk {
  t0: number;
  life: number;
  origin: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  scale: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(0, 1e9, 0);

export class DebrisField {
  readonly mesh: THREE.InstancedMesh;
  private chunks: Chunk[] = [];
  private capacity: number;
  private rng: Rng;

  constructor(lib: MaterialLibrary, capacity = 220, material?: THREE.Material, seed = 'debris') {
    this.capacity = capacity;
    this.rng = new Rng(seed);

    // One irregular chunk shape shared by every fragment; rotation and scale
    // variation make it read as many different pieces.
    const parts = [
      new THREE.TetrahedronGeometry(0.6, 0),
      new THREE.BoxGeometry(1.1, 0.28, 0.7),
      new THREE.BoxGeometry(0.4, 0.4, 1.3),
    ];
    parts[1].translate(0.2, 0.1, 0);
    parts[2].rotateY(0.6);
    const geo = mergeAll(parts) ?? new THREE.BoxGeometry(1, 0.4, 0.7);
    lib.registry.track(geo);

    const mat = material ?? lib.rebel.greeble;
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.name = 'debris';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = capacity;
  }

  emit(e: DebrisEvent): void {
    const dir = e.direction.clone().normalize();
    for (let i = 0; i < e.count; i++) {
      if (this.chunks.length >= this.capacity) break;
      const v = new THREE.Vector3(
        dir.x + this.rng.signed(0.75),
        dir.y + this.rng.signed(0.75),
        dir.z + this.rng.signed(0.75),
      ).normalize().multiplyScalar(e.speed * this.rng.range(0.4, 1.3));
      this.chunks.push({
        t0: e.t0 + this.rng.range(0, 0.12),
        life: e.life * this.rng.range(0.6, 1.4),
        origin: e.position.clone(),
        velocity: v,
        spin: new THREE.Vector3(this.rng.signed(3), this.rng.signed(3), this.rng.signed(3)),
        scale: e.size * this.rng.range(0.35, 1.5),
      });
    }
  }

  get count(): number {
    return this.chunks.length;
  }

  update(t: number): void {
    let slot = 0;
    for (const c of this.chunks) {
      const age = t - c.t0;
      if (age < 0 || age > c.life) continue;
      if (slot >= this.capacity) break;
      const f = saturate(age / c.life);
      _p.copy(c.origin).addScaledVector(c.velocity, age);
      _e.set(c.spin.x * age, c.spin.y * age, c.spin.z * age);
      _q.setFromEuler(_e);
      const shrink = 1 - f * f * 0.85;
      _s.setScalar(c.scale * shrink);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(slot, _m);
      slot++;
    }
    for (let i = slot; i < this.capacity; i++) this.mesh.setMatrixAt(i, HIDDEN);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
