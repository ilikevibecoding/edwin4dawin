import * as THREE from 'three';
import { radialTexture } from '../assets/Textures';

/**
 * Energy bolts with real travel time.
 *
 * A bolt is an elongated additive capsule that flies from muzzle to target at
 * a finite speed; the impact callback fires when it arrives, which is what
 * makes the exchange of fire feel like an exchange rather than a light show.
 */

export interface BoltSpawn {
  origin: THREE.Vector3;
  target: THREE.Vector3;
  speed: number;
  color: THREE.Color;
  length: number;
  radius: number;
  /** Called at the moment of arrival with the impact point. */
  onImpact?: (point: THREE.Vector3) => void;
  /** Miss offset applied to the target, in world units. */
  scatter?: number;
}

interface BoltRecord {
  alive: boolean;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  distanceLeft: number;
  length: number;
  radius: number;
  color: THREE.Color;
  onImpact?: (point: THREE.Vector3) => void;
  glow: THREE.Sprite | null;
}

const UP = new THREE.Vector3(0, 1, 0);

export class BoltSystem {
  readonly group = new THREE.Group();
  private mesh: THREE.InstancedMesh;
  private records: BoltRecord[] = [];
  private capacity: number;
  private cursor = 0;
  private matrix = new THREE.Matrix4();
  private quat = new THREE.Quaternion();
  private scale = new THREE.Vector3();
  private glowPool: THREE.Sprite[] = [];
  private glowCursor = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.group.name = 'BoltSystem';

    const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, false);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      opacity: 1,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.group.add(this.mesh);

    const glowTex = radialTexture('bolt-glow', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)', 2);
    for (let i = 0; i < Math.min(capacity, 48); i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          toneMapped: false,
        }),
      );
      s.visible = false;
      this.glowPool.push(s);
      this.group.add(s);
    }

    for (let i = 0; i < capacity; i++) {
      this.records.push({
        alive: false,
        position: new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, -1),
        speed: 0,
        distanceLeft: 0,
        length: 1,
        radius: 0.05,
        color: new THREE.Color(),
        glow: null,
      });
    }
    this.reset();
  }

  get activeCount(): number {
    return this.records.reduce((n, r) => n + (r.alive ? 1 : 0), 0);
  }

  spawn(spec: BoltSpawn): void {
    const rec = this.records[this.cursor];
    this.cursor = (this.cursor + 1) % this.capacity;
    const target = spec.target.clone();
    if (spec.scatter) {
      target.x += (Math.random() * 2 - 1) * spec.scatter;
      target.y += (Math.random() * 2 - 1) * spec.scatter;
      target.z += (Math.random() * 2 - 1) * spec.scatter;
    }
    rec.alive = true;
    rec.position.copy(spec.origin);
    rec.direction.copy(target).sub(spec.origin);
    rec.distanceLeft = rec.direction.length();
    if (rec.distanceLeft < 1e-4) {
      rec.alive = false;
      return;
    }
    rec.direction.multiplyScalar(1 / rec.distanceLeft);
    rec.speed = spec.speed;
    rec.length = spec.length;
    rec.radius = spec.radius;
    rec.color.copy(spec.color);
    rec.onImpact = spec.onImpact;

    const glow = this.glowPool[this.glowCursor];
    this.glowCursor = (this.glowCursor + 1) % Math.max(1, this.glowPool.length);
    if (glow) {
      glow.visible = true;
      (glow.material as THREE.SpriteMaterial).color.copy(spec.color);
      glow.scale.setScalar(spec.radius * 12);
      rec.glow = glow;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const r = this.records[i];
      if (!r.alive) {
        this.matrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.matrix);
        continue;
      }
      const step = Math.min(r.speed * dt, r.distanceLeft);
      r.position.addScaledVector(r.direction, step);
      r.distanceLeft -= step;

      this.quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), r.direction);
      this.scale.set(r.radius, r.radius, r.length);
      this.matrix.compose(r.position, this.quat, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
      this.mesh.instanceColor!.setXYZ(i, r.color.r, r.color.g, r.color.b);
      if (r.glow) r.glow.position.copy(r.position);

      if (r.distanceLeft <= 1e-4) {
        r.alive = false;
        if (r.glow) {
          r.glow.visible = false;
          r.glow = null;
        }
        r.onImpact?.(r.position.clone());
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
    UP.set(0, 1, 0);
  }

  reset(): void {
    this.records.forEach((r) => {
      r.alive = false;
      r.onImpact = undefined;
      if (r.glow) r.glow.visible = false;
      r.glow = null;
    });
    this.cursor = 0;
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.capacity; i++) this.mesh.setMatrixAt(i, m);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.glowPool.forEach((g) => (g.visible = false));
  }
}
