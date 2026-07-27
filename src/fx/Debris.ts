import * as THREE from 'three';
import type { RigidBodyHandle } from '../core/Contracts';
import { SURFACE_PROPERTIES, type SurfaceType } from '../core/GameTypes';
import { Rng, rng } from '../core/MathUtils';
import type { EngineContext } from '../core/System';
import { Basis, hexColor } from './Emit';
import { resetDesc } from './ParticleSystem';
import { familyOf, type FXDeps } from './Shared';

class Chunk {
  active = false;
  mesh!: THREE.Mesh;
  body: RigidBodyHandle | null = null;
  age = 0;
  life = 5;
  size = 0.1;
  trailAccum = 0;
  smoking = false;
  readonly velocity = new THREE.Vector3();
  readonly spin = new THREE.Vector3();
  readonly spinQuat = new THREE.Quaternion();
  groundY = -Infinity;
}

/**
 * Hero debris.
 *
 * The bulk of an ejecta cloud is GPU sprites — hundreds of them, and nobody
 * tracks an individual chip. But a handful of *large* chunks with real rigid
 * bodies, tumbling, bouncing off the kerb and dragging a thread of smoke behind
 * them, is what makes an explosion look like it broke something. Rapier's
 * dynamic-body budget is small and shared, so this pool is deliberately tiny and
 * strictly capped.
 */
export class DebrisField {
  private ctx!: EngineContext;
  private readonly root = new THREE.Group();
  private readonly chunks: Chunk[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly basis = new Basis();
  private readonly dir = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private readonly down = new THREE.Vector3(0, -1, 0);
  private readonly rayOptions = { maxDistance: 6 };

  private capacity = 12;
  private physicsCap = 8;
  private physicsLive = 0;

  constructor(private readonly deps: FXDeps) {}

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    const tier = ctx.config.tier;
    this.capacity = tier === 'low' ? 4 : tier === 'medium' ? 9 : 14;
    this.physicsCap = tier === 'low' ? 0 : tier === 'medium' ? 5 : 9;

    this.root.name = 'fx:debris';
    this.root.matrixAutoUpdate = false;
    ctx.scene.add(this.root);

    // Three irregular blocks: a jittered box reads as broken masonry far better
    // than a sphere, and at these sizes three variants is plenty of variety.
    for (let i = 0; i < 3; i++) this.shapes.push(chunkGeometry(0.55 + i * 0.2));
  }

  get roots(): readonly THREE.Object3D[] {
    return [this.root];
  }

  get liveCount(): number {
    let n = 0;
    for (const c of this.chunks) if (c.active) n++;
    return n;
  }

  get drawCalls(): number {
    return this.liveCount;
  }

  /**
   * Throw `count` hero chunks out of `position`. `count` is the caller's total
   * ejecta count; only a fraction of it is ever promoted to a rigid body.
   */
  burst(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    count: number,
    surface: SurfaceType,
    energy: number,
    smoking: boolean,
  ): void {
    const hero = Math.min(this.capacity, Math.max(1, Math.round(count * 0.2)));
    this.basis.set(normal);
    const material = this.materialFor(surface);

    for (let i = 0; i < hero; i++) {
      const chunk = this.acquire();
      if (!chunk) return;

      const size = rng.range(0.07, 0.2) * (0.7 + energy * 0.6);
      const geometry = this.shapes[(rng.next() * this.shapes.length) | 0];
      if (!chunk.mesh) {
        chunk.mesh = new THREE.Mesh(geometry, material);
        chunk.mesh.castShadow = false;
      } else {
        chunk.mesh.geometry = geometry;
        chunk.mesh.material = material;
      }

      const mesh = chunk.mesh;
      this.basis.cone(1.1, this.dir);
      mesh.position.set(
        position.x + this.dir.x * 0.12,
        position.y + this.dir.y * 0.12 + 0.05,
        position.z + this.dir.z * 0.12,
      );
      mesh.quaternion.set(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1));
      mesh.quaternion.normalize();
      mesh.scale.setScalar(size);
      mesh.visible = true;
      mesh.matrixAutoUpdate = true;
      this.root.add(mesh);

      const speed = rng.range(5, 15) * (0.5 + energy * 0.8);
      chunk.velocity.set(
        this.dir.x * speed,
        Math.abs(this.dir.y) * speed * 0.8 + rng.range(2.5, 8),
        this.dir.z * speed,
      );
      chunk.spin.set(rng.range(-14, 14), rng.range(-14, 14), rng.range(-14, 14));
      chunk.active = true;
      chunk.age = 0;
      chunk.life = rng.range(4, 7);
      chunk.size = size;
      chunk.trailAccum = 0;
      chunk.smoking = smoking;
      chunk.body = null;
      chunk.groundY = -Infinity;

      const physics = this.deps.physics;
      if (physics && physics.ready && this.physicsLive < this.physicsCap) {
        mesh.updateWorldMatrix(true, false);
        this.tmp.setScalar(size * 0.45);
        chunk.body = physics.createRigidBody(
          mesh,
          { kind: 'box', halfExtents: this.tmp },
          {
            mass: 1.6 * size,
            restitution: 0.22,
            friction: 0.85,
            userData: { kind: 'debris', surface },
          },
        );
        chunk.body.setVelocity(chunk.velocity);
        this.tmp.copy(chunk.spin).multiplyScalar(0.0009);
        chunk.body.applyTorqueImpulse(this.tmp);
        this.physicsLive++;
      } else {
        chunk.groundY = this.probeGround(mesh.position);
      }
    }
  }

  update(dt: number): void {
    if (dt <= 0) return;
    for (const chunk of this.chunks) {
      if (!chunk.active) continue;
      chunk.age += dt;
      if (chunk.age >= chunk.life) {
        this.retire(chunk);
        continue;
      }

      if (chunk.body) chunk.body.getVelocity(chunk.velocity);
      else this.integrate(chunk, dt);

      // A chunk blown out of a detonation is on fire; the thread of smoke it
      // drags is what the eye follows.
      if (chunk.smoking && chunk.age < 1.6) {
        chunk.trailAccum += dt;
        if (chunk.trailAccum > 0.045 && chunk.velocity.lengthSq() > 4) {
          chunk.trailAccum = 0;
          this.emitTrail(chunk);
        }
      }

      const remaining = chunk.life - chunk.age;
      if (remaining < 0.5) {
        chunk.mesh.scale.setScalar(chunk.size * Math.max(0.02, remaining / 0.5));
      }
    }
  }

  private emitTrail(chunk: Chunk): void {
    const d = resetDesc();
    const p = chunk.mesh.position;
    d.px = p.x;
    d.py = p.y;
    d.pz = p.z;
    d.vx = chunk.velocity.x * -0.05;
    d.vy = chunk.velocity.y * -0.05 + 0.35;
    d.vz = chunk.velocity.z * -0.05;
    d.life = rng.range(0.5, 1.0);
    d.size0 = chunk.size * 1.2;
    d.size1 = chunk.size * rng.range(4, 7);
    d.roll = rng.range(0, Math.PI * 2);
    d.rollRate = rng.range(-0.8, 0.8);
    d.r0 = 0.26;
    d.g0 = 0.24;
    d.b0 = 0.22;
    d.r1 = 0.18;
    d.g1 = 0.17;
    d.b1 = 0.16;
    d.alpha = rng.range(0.5, 0.8);
    d.gravity = -0.3;
    d.drag = 1.6;
    d.turbulence = 0.35;
    d.cell = (rng.next() * 4) | 0;
    d.fadeIn = 0.12;
    d.softness = 0.3;
    d.priority = 120;
    this.deps.groups.dust.spawn(this.deps.now, d);
  }

  private integrate(chunk: Chunk, dt: number): void {
    const mesh = chunk.mesh;
    const v = chunk.velocity;
    v.y -= 9.81 * dt;
    v.multiplyScalar(1 - Math.min(0.4, 0.35 * dt));
    mesh.position.addScaledVector(v, dt);

    this.tmp.copy(chunk.spin).multiplyScalar(dt * 0.5);
    chunk.spinQuat.set(this.tmp.x, this.tmp.y, this.tmp.z, 1).normalize();
    mesh.quaternion.multiply(chunk.spinQuat);

    const floor = chunk.groundY + chunk.size * 0.35;
    if (mesh.position.y <= floor) {
      mesh.position.y = floor;
      if (Math.abs(v.y) < 0.4) {
        v.set(0, 0, 0);
        chunk.spin.multiplyScalar(0.1);
      } else {
        v.y = Math.abs(v.y) * 0.28;
        v.x *= 0.6;
        v.z *= 0.6;
        chunk.spin.multiplyScalar(0.5);
      }
    }
  }

  private probeGround(position: THREE.Vector3): number {
    const world = this.deps.world;
    if (world) {
      const y = world.sampleGround(position.x, position.z);
      if (y !== null) return y;
    }
    const physics = this.deps.physics;
    if (physics && physics.ready) {
      const hit = physics.raycast(position, this.down, this.rayOptions);
      if (hit) return hit.point.y;
    }
    return position.y - 1.5;
  }

  private materialFor(surface: SurfaceType): THREE.MeshStandardMaterial {
    const family = familyOf(surface);
    const cached = this.materials.get(family);
    if (cached) return cached;
    const props = SURFACE_PROPERTIES[surface] ?? SURFACE_PROPERTIES.concrete;
    hexColor(props.dustColor, this.color).multiplyScalar(0.5);
    const material = new THREE.MeshStandardMaterial({
      name: `fx:debris:${family}`,
      color: this.color.getHex(),
      roughness: family === 'metal' ? 0.42 : 0.92,
      metalness: family === 'metal' ? 0.85 : 0.02,
    });
    this.materials.set(family, material);
    return material;
  }

  private retire(chunk: Chunk): void {
    chunk.active = false;
    if (chunk.body) {
      chunk.body.destroy();
      chunk.body = null;
      this.physicsLive = Math.max(0, this.physicsLive - 1);
    }
    chunk.mesh.visible = false;
    chunk.mesh.removeFromParent();
  }

  private acquire(): Chunk | null {
    for (const c of this.chunks) if (!c.active) return c;
    if (this.chunks.length < this.capacity) {
      const c = new Chunk();
      this.chunks.push(c);
      return c;
    }
    let oldest = this.chunks[0];
    for (const c of this.chunks) if (c.age > oldest.age) oldest = c;
    this.retire(oldest);
    return oldest;
  }

  clear(): void {
    for (const c of this.chunks) if (c.active) this.retire(c);
    this.physicsLive = 0;
  }

  dispose(): void {
    this.clear();
    for (const g of this.shapes) g.dispose();
    this.shapes.length = 0;
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    this.root.removeFromParent();
  }
}

/**
 * A unit box with its eight corners pushed around, so no two chunks look alike.
 * The displacement is keyed off the corner, not off the vertex, because a box
 * duplicates every corner across three faces and jittering them independently
 * would tear the solid apart.
 *
 * Corners are pulled in rather than pushed out, and the result is renormalised to
 * fit the unit cube. Both matter: displacement that can grow the box means the
 * mesh no longer measures one metre per unit of scale, so a chunk asked for at
 * twenty centimetres arrives at fifty and the physics half-extents no longer
 * match the mesh — which is how a shower of gravel becomes a scatter of
 * suitcases.
 */
function chunkGeometry(irregularity: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const local = new Rng(0x51ed270b ^ Math.round(irregularity * 1000));
  const offsets = new Float32Array(24);
  for (let i = 0; i < 24; i++) offsets[i] = local.range(0, 0.62) * irregularity;

  let extent = 1e-4;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const corner = ((x > 0 ? 1 : 0) | (y > 0 ? 2 : 0) | (z > 0 ? 4 : 0)) * 3;
    const nx = x * (1 - offsets[corner]);
    const ny = y * (1 - offsets[corner + 1]);
    const nz = z * (1 - offsets[corner + 2]);
    position.setXYZ(i, nx, ny, nz);
    extent = Math.max(extent, Math.abs(nx), Math.abs(ny), Math.abs(nz));
  }
  const norm = 0.5 / extent;
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(i, position.getX(i) * norm, position.getY(i) * norm, position.getZ(i) * norm);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
