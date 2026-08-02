/**
 * Blaster and turbolaser bolts.
 *
 * Bolts are real objects with real travel time: they are spawned at a muzzle,
 * move at a finite speed, and either strike something or expire. That travel
 * time is what makes an exchange of fire readable — you can watch a shot cross
 * the corridor and see it miss.
 *
 * Each colour gets its own instanced pool so the whole battle costs a couple
 * of draw calls.
 */

import * as THREE from 'three';
import { additiveMaterial, emissiveMaterial } from '../assets/materials';
import { glowSprite } from '../assets/textures';

export interface BoltSpec {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  color: string;
  /** Metres. Bolts are long and thin; scale with the ship or the corridor. */
  length: number;
  radius: number;
  /** Seconds before the bolt despawns if it hits nothing. */
  life: number;
  /** Optional world point the bolt should detonate at. */
  hitAt?: THREE.Vector3;
  /** Fired when the bolt reaches `hitAt` or expires. */
  onEnd?: (position: THREE.Vector3, hit: boolean) => void;
}

interface Bolt {
  active: boolean;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  length: number;
  radius: number;
  age: number;
  life: number;
  hitDist: number;
  travelled: number;
  onEnd?: (position: THREE.Vector3, hit: boolean) => void;
}

class BoltPool {
  readonly mesh: THREE.InstancedMesh;
  readonly glow: THREE.InstancedMesh;
  private bolts: Bolt[] = [];
  private matrix = new THREE.Matrix4();
  private quat = new THREE.Quaternion();
  private scale = new THREE.Vector3();
  private hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  private up = new THREE.Vector3(0, 1, 0);

  constructor(color: string, capacity: number) {
    // A capsule aligned to +Y; we rotate it onto the flight direction.
    const geo = new THREE.CapsuleGeometry(1, 1, 3, 8);
    const mat = emissiveMaterial(`bolt-${color}`, '#ffffff', 5, { toneMapped: false }).clone();
    mat.emissive = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.55);
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.name = `Bolts-${color}`;

    const glowMat = additiveMaterial(`boltGlow-${color}`, color, 0.75, glowSprite(0.3)).clone();
    this.glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat, capacity);
    this.glow.frustumCulled = false;
    this.glow.name = `BoltGlow-${color}`;

    for (let i = 0; i < capacity; i++) {
      this.bolts.push({
        active: false,
        pos: new THREE.Vector3(),
        dir: new THREE.Vector3(0, 0, -1),
        speed: 0,
        length: 1,
        radius: 0.05,
        age: 0,
        life: 1,
        hitDist: Infinity,
        travelled: 0,
      });
      this.mesh.setMatrixAt(i, this.hidden);
      this.glow.setMatrixAt(i, this.hidden);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
  }

  spawn(spec: BoltSpec): boolean {
    const b = this.bolts.find((x) => !x.active);
    if (!b) return false;
    b.active = true;
    b.pos.copy(spec.origin);
    b.dir.copy(spec.direction).normalize();
    b.speed = spec.speed;
    b.length = spec.length;
    b.radius = spec.radius;
    b.age = 0;
    b.life = spec.life;
    b.travelled = 0;
    b.hitDist = spec.hitAt ? spec.origin.distanceTo(spec.hitAt) : Infinity;
    b.onEnd = spec.onEnd;
    return true;
  }

  update(dt: number, camera: THREE.Camera): void {
    let dirty = false;
    for (let i = 0; i < this.bolts.length; i++) {
      const b = this.bolts[i];
      if (!b.active) continue;
      const step = b.speed * dt;
      b.pos.addScaledVector(b.dir, step);
      b.travelled += step;
      b.age += dt;

      const hit = b.travelled >= b.hitDist;
      if (hit || b.age >= b.life) {
        b.active = false;
        this.mesh.setMatrixAt(i, this.hidden);
        this.glow.setMatrixAt(i, this.hidden);
        b.onEnd?.(b.pos.clone(), hit);
        b.onEnd = undefined;
        dirty = true;
        continue;
      }

      this.quat.setFromUnitVectors(this.up, b.dir);
      this.scale.set(b.radius, b.length, b.radius);
      this.matrix.compose(b.pos, this.quat, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);

      // Glow card faces the camera but keeps its long axis on the flight path.
      this.quat.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(b.pos, camera.position, b.dir),
      );
      this.scale.set(b.radius * 8.5, b.length * 2.4, 1);
      this.matrix.compose(b.pos, this.quat, this.scale);
      this.glow.setMatrixAt(i, this.matrix);
      dirty = true;
    }
    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.glow.instanceMatrix.needsUpdate = true;
    }
  }

  clear(): void {
    for (let i = 0; i < this.bolts.length; i++) {
      this.bolts[i].active = false;
      this.bolts[i].onEnd = undefined;
      this.mesh.setMatrixAt(i, this.hidden);
      this.glow.setMatrixAt(i, this.hidden);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
  }

  get activeCount(): number {
    return this.bolts.reduce((n, b) => n + (b.active ? 1 : 0), 0);
  }
}

export class BoltSystem {
  readonly group = new THREE.Group();
  private pools = new Map<string, BoltPool>();
  private capacity: number;

  constructor(capacityPerColour = 64) {
    this.group.name = 'Bolts';
    this.capacity = capacityPerColour;
  }

  private pool(color: string): BoltPool {
    let p = this.pools.get(color);
    if (!p) {
      p = new BoltPool(color, this.capacity);
      this.pools.set(color, p);
      this.group.add(p.mesh, p.glow);
    }
    return p;
  }

  fire(spec: BoltSpec): void {
    this.pool(spec.color).spawn(spec);
  }

  update(dt: number, camera: THREE.Camera): void {
    for (const p of this.pools.values()) p.update(dt, camera);
  }

  /** Called on timeline seek so bolts never survive a scrub. */
  clear(): void {
    for (const p of this.pools.values()) p.clear();
  }

  get activeCount(): number {
    let n = 0;
    for (const p of this.pools.values()) n += p.activeCount;
    return n;
  }
}
