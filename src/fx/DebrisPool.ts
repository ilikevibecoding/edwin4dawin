import * as THREE from 'three';
import { Groups, Layers, type GameContext } from '../core/GameContext';
import type { IMaterialLibrary, IPhysics, MaterialName } from '../core/Interfaces';
import { FxRng } from './Random';
import type { QualitySettings } from '../core/Quality';

/**
 * Solid debris that the physics solver owns: rubble, splinters, glass and spent
 * brass.
 *
 * Everything a blast throws up is a particle except the handful of pieces the
 * player will actually watch land. Those get real rigid bodies, because a chunk
 * of masonry that tumbles off a kerb and comes to rest against a wall is worth
 * more than fifty billboards, and because a casing has to ring when it hits the
 * floor at the moment it hits the floor.
 *
 * One instanced mesh per kind, and the physics system writes the matrices — it
 * accepts an `instanceIndex` per body, so this pool is a ring of slots and the
 * solver never has to allocate a mesh. Recycling the oldest slot removes its
 * body first, so a piece is never left frozen mid-air by a stolen index.
 */

export const Debris = {
  RUBBLE: 0,
  BOULDER: 1,
  SPLINTER: 2,
  SHARD: 3,
  BRASS: 4,
} as const;

export type DebrisKind = (typeof Debris)[keyof typeof Debris];

interface KindSpec {
  name: string;
  material: MaterialName;
  fallback: { color: number; roughness: number; metalness: number };
  /** Half-extents used for the collision box. */
  half: THREE.Vector3;
  mass: number;
  restitution: number;
  friction: number;
  lifetime: number;
  /** Fraction of the total debris budget. */
  share: number;
  build(): THREE.BufferGeometry;
}

/** A lumpy low-poly rock. Smooth spheres read as bubbles at any size. */
function rock(radius: number, seed: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, 0);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  let s = seed;
  const rand = (): number => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < position.count; i++) {
    const k = 0.55 + rand() * 0.85;
    position.setXYZ(i, position.getX(i) * k, position.getY(i) * k * 0.82, position.getZ(i) * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function shardGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  // A tapered sliver rather than a square: broken glass is all points.
  const v = new Float32Array([
    0, 0.09, 0, -0.035, -0.06, 0.004, 0.045, -0.05, -0.004, 0, 0.09, 0, 0.045, -0.05, -0.004,
    -0.035, -0.06, 0.004,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const SPECS: KindSpec[] = [
  {
    name: 'rubble',
    material: 'concrete_damaged',
    fallback: { color: 0x9d968a, roughness: 0.95, metalness: 0 },
    half: new THREE.Vector3(0.045, 0.035, 0.045),
    mass: 0.6,
    restitution: 0.22,
    friction: 0.75,
    lifetime: 22,
    share: 0.34,
    build: () => rock(0.05, 7717),
  },
  {
    name: 'boulder',
    material: 'rubble',
    fallback: { color: 0x8e857a, roughness: 0.95, metalness: 0 },
    half: new THREE.Vector3(0.15, 0.12, 0.15),
    mass: 9,
    restitution: 0.14,
    friction: 0.85,
    lifetime: 30,
    share: 0.1,
    build: () => rock(0.17, 30011),
  },
  {
    name: 'splinter',
    material: 'wood_planks',
    fallback: { color: 0x8a6a42, roughness: 0.85, metalness: 0 },
    half: new THREE.Vector3(0.012, 0.012, 0.075),
    mass: 0.12,
    restitution: 0.24,
    friction: 0.7,
    lifetime: 18,
    share: 0.18,
    build: () => new THREE.BoxGeometry(0.022, 0.016, 0.15),
  },
  {
    name: 'shard',
    material: 'glass_broken',
    fallback: { color: 0xbdd7dd, roughness: 0.08, metalness: 0 },
    half: new THREE.Vector3(0.04, 0.05, 0.008),
    mass: 0.2,
    restitution: 0.1,
    friction: 0.5,
    lifetime: 16,
    share: 0.18,
    build: shardGeometry,
  },
  {
    name: 'brass',
    material: 'gun_metal',
    fallback: { color: 0xc9a44c, roughness: 0.28, metalness: 1 },
    half: new THREE.Vector3(0.0048, 0.0048, 0.012),
    mass: 0.012,
    restitution: 0.42,
    friction: 0.36,
    lifetime: 14,
    share: 0.2,
    build: () => new THREE.CylinderGeometry(0.0042, 0.0048, 0.024, 7, 1),
  },
];

class DebrisRing {
  readonly mesh: THREE.InstancedMesh;
  readonly spec: KindSpec;
  readonly capacity: number;
  private handles: Int32Array;
  private cursor = 0;
  private highWater = 0;
  private ownedGeometry: THREE.BufferGeometry;
  private ownedMaterial: THREE.Material | null;

  constructor(spec: KindSpec, capacity: number, library: IMaterialLibrary | undefined) {
    this.spec = spec;
    this.capacity = Math.max(4, capacity);
    this.handles = new Int32Array(this.capacity).fill(-1);

    this.ownedGeometry = spec.build();
    let material: THREE.Material | null = null;
    if (library) {
      try {
        material = library.get(spec.material);
      } catch {
        material = null;
      }
    }
    if (!material) {
      material = new THREE.MeshStandardMaterial(spec.fallback);
      this.ownedMaterial = material;
    } else {
      this.ownedMaterial = null;
    }

    this.mesh = new THREE.InstancedMesh(this.ownedGeometry, material, this.capacity);
    this.mesh.name = `fx.debris.${spec.name}`;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Debris is small and everywhere; keeping it out of screen-space
    // reflections costs nothing visually and saves a lot of ray marching.
    this.mesh.layers.enable(Layers.NO_SSR);
    for (let i = 0; i < this.capacity; i++) this.mesh.setMatrixAt(i, ZERO);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Claims the oldest slot, retiring whatever body still holds it. */
  claim(physics: IPhysics): number {
    const slot = this.cursor;
    this.cursor = this.cursor + 1 === this.capacity ? 0 : this.cursor + 1;
    if (slot + 1 > this.highWater) {
      this.highWater = slot + 1;
      this.mesh.count = this.highWater;
    }
    if (this.handles[slot] >= 0) {
      physics.removeBody(this.handles[slot]);
      this.handles[slot] = -1;
    }
    return slot;
  }

  setHandle(slot: number, handle: number): void {
    this.handles[slot] = handle;
  }

  clear(physics: IPhysics | undefined): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.handles[i] >= 0) physics?.removeBody(this.handles[i]);
      this.handles[i] = -1;
      this.mesh.setMatrixAt(i, ZERO);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.count = 0;
    this.cursor = 0;
    this.highWater = 0;
  }

  dispose(physics: IPhysics | undefined): void {
    this.clear(physics);
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.ownedGeometry.dispose();
    this.ownedMaterial?.dispose();
  }
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _one = new THREE.Vector3(1, 1, 1);
const _linear = new THREE.Vector3();
const _angular = new THREE.Vector3();
const rng = new FxRng(0x51ab77);

const _desc = {
  mesh: null as unknown as THREE.Object3D,
  mass: 1,
  shape: 'box' as const,
  size: new THREE.Vector3(),
  restitution: 0.2,
  friction: 0.6,
  linearVelocity: _linear,
  angularVelocity: _angular,
  lifetime: 10,
  group: Groups.DEBRIS,
  instanceIndex: 0,
};

export class DebrisPool {
  private rings: DebrisRing[] = [];
  private group = new THREE.Group();
  private physics: IPhysics | undefined;
  private budget = 0;

  constructor() {
    this.group.name = 'fx.debris';
    this.group.matrixAutoUpdate = false;
  }

  attach(ctx: GameContext, quality: QualitySettings): void {
    ctx.scene.add(this.group);
    this.build(ctx, quality);
  }

  private build(ctx: GameContext, quality: QualitySettings): void {
    for (const ring of this.rings) ring.dispose(this.physics);
    this.rings.length = 0;

    const library = ctx.tryGet<IMaterialLibrary>('materials');
    // Solid debris is the most expensive thing here per unit of screen impact,
    // so the budget is deliberately small and scales hard with the preset.
    this.budget = Math.round(120 * Math.max(0.25, quality.debrisDensity));
    for (const spec of SPECS) {
      this.rings.push(new DebrisRing(spec, Math.round(this.budget * spec.share), library));
    }
    for (const ring of this.rings) this.group.add(ring.mesh);
  }

  onQualityChange(ctx: GameContext, quality: QualitySettings): void {
    this.build(ctx, quality);
  }

  setPhysics(physics: IPhysics | undefined): void {
    this.physics = physics;
  }

  get available(): boolean {
    return this.physics !== undefined;
  }

  /**
   * Throws one piece. `spin` is radians per second about a random axis; the
   * caller supplies the launch velocity because only it knows whether this is a
   * ricochet, an ejection or a blast.
   */
  spawn(
    kind: DebrisKind,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    spin: number,
    lifetimeScale = 1,
  ): boolean {
    const physics = this.physics;
    const ring = this.rings[kind];
    if (!physics || !ring) return false;

    const slot = ring.claim(physics);
    _position.set(x, y, z);
    _quaternion.set(rng.range(-0.5, 0.5), rng.range(-0.5, 0.5), rng.range(-0.5, 0.5), rng.next());
    if (_quaternion.lengthSq() < 1e-6) _quaternion.set(0, 0, 0, 1);
    _quaternion.normalize();
    _matrix.compose(_position, _quaternion, _one);
    ring.mesh.setMatrixAt(slot, _matrix);
    ring.mesh.instanceMatrix.needsUpdate = true;

    const spec = ring.spec;
    _linear.set(vx, vy, vz);
    _angular
      .set(rng.range(-0.5, 0.5), rng.range(-0.5, 0.5), rng.range(-0.5, 0.5))
      .normalize()
      .multiplyScalar(spin);

    _desc.mesh = ring.mesh;
    _desc.mass = spec.mass;
    _desc.size.copy(spec.half);
    _desc.restitution = spec.restitution;
    _desc.friction = spec.friction;
    _desc.lifetime = spec.lifetime * lifetimeScale;
    _desc.instanceIndex = slot;
    ring.setHandle(slot, physics.addBody(_desc));
    return true;
  }

  clear(): void {
    for (const ring of this.rings) ring.clear(this.physics);
  }

  dispose(): void {
    for (const ring of this.rings) ring.dispose(this.physics);
    this.rings.length = 0;
    this.group.removeFromParent();
  }
}
