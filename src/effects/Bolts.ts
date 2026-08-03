import * as THREE from 'three';

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
}

export class BoltSystem {
  readonly group = new THREE.Group();
  private core: THREE.InstancedMesh;
  private halo: THREE.InstancedMesh;
  private records: BoltRecord[] = [];
  private capacity: number;
  private cursor = 0;
  private matrix = new THREE.Matrix4();
  private quat = new THREE.Quaternion();
  private scale = new THREE.Vector3();
  private tint = new THREE.Color();

  constructor(capacity: number) {
    this.capacity = capacity;
    this.group.name = 'BoltSystem';

    // Two concentric capsules: a near-white core inside a wider, dimmer
    // sheath of the bolt's own colour. A round sprite would read as a ball
    // of light, which is exactly what a tracer must not look like.
    const build = (segments: number): THREE.InstancedMesh => {
      const geo = new THREE.CapsuleGeometry(1, 1, 2, segments);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, capacity);
      mesh.frustumCulled = false;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
      this.group.add(mesh);
      return mesh;
    };
    this.core = build(8);
    this.halo = build(6);
    this.halo.renderOrder = -1;

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
  }

  update(dt: number): void {
    const forward = _forward;
    for (let i = 0; i < this.capacity; i++) {
      const r = this.records[i];
      if (!r.alive) {
        this.matrix.makeScale(0, 0, 0);
        this.core.setMatrixAt(i, this.matrix);
        this.halo.setMatrixAt(i, this.matrix);
        continue;
      }
      const step = Math.min(r.speed * dt, r.distanceLeft);
      r.position.addScaledVector(r.direction, step);
      r.distanceLeft -= step;

      this.quat.setFromUnitVectors(forward, r.direction);
      // CapsuleGeometry's caps add `radius` at each end, so the cylinder part
      // is scaled to leave the overall bolt the requested length.
      this.scale.set(r.radius, r.radius, Math.max(0.001, r.length - r.radius * 2));
      this.matrix.compose(r.position, this.quat, this.scale);
      this.core.setMatrixAt(i, this.matrix);
      this.tint.copy(r.color).lerp(WHITE, 0.72);
      this.core.instanceColor!.setXYZ(i, this.tint.r, this.tint.g, this.tint.b);

      this.scale.set(r.radius * 2.7, r.radius * 2.7, Math.max(0.001, r.length * 1.1));
      this.matrix.compose(r.position, this.quat, this.scale);
      this.halo.setMatrixAt(i, this.matrix);
      this.tint.copy(r.color).multiplyScalar(0.34);
      this.halo.instanceColor!.setXYZ(i, this.tint.r, this.tint.g, this.tint.b);

      if (r.distanceLeft <= 1e-4) {
        r.alive = false;
        r.onImpact?.(r.position.clone());
      }
    }
    for (const m of [this.core, this.halo]) {
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor!.needsUpdate = true;
    }
  }

  reset(): void {
    this.records.forEach((r) => {
      r.alive = false;
      r.onImpact = undefined;
    });
    this.cursor = 0;
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.capacity; i++) {
      this.core.setMatrixAt(i, m);
      this.halo.setMatrixAt(i, m);
    }
    this.core.instanceMatrix.needsUpdate = true;
    this.halo.instanceMatrix.needsUpdate = true;
  }
}

const WHITE = new THREE.Color(1, 1, 1);
const _forward = new THREE.Vector3(0, 0, 1);
