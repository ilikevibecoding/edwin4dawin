import * as THREE from 'three';
import type { MaterialLibrary } from '../core/Contracts';
import type { EventBus } from '../core/EventBus';
import type { SurfaceType } from '../core/GameTypes';
import { Rng, clamp } from '../core/MathUtils';
import type { DestructibleRecord } from './Builder';
import type { DestructibleKind } from './kit/Kit';

/**
 * Destruction runtime.
 *
 * Every breakable piece was registered at build time with its health, its
 * position and — crucially — a handle back to the instanced copy that draws it.
 * Breaking something therefore costs one matrix write rather than a rebuild, and
 * an airstrike can wreck a whole district in a single frame without a hitch.
 *
 * Each kind fails in the way that reads from ten metres: glass leaves a jagged
 * remnant in the top of the frame and rains shards, crates burst into planks,
 * sandbags slump into a heap instead of vanishing, cloth tears away, lamps go
 * dark. The falling pieces are pooled instanced bursts on a fixed budget.
 */

export interface DestructibleEvent {
  kind: DestructibleKind;
  position: THREE.Vector3;
  surface: SurfaceType;
  radius: number;
}

interface Burst {
  mesh: THREE.InstancedMesh;
  count: number;
  age: number;
  life: number;
  rest: number;
  position: Float32Array;
  velocity: Float32Array;
  rotation: Float32Array;
  spin: Float32Array;
  scale: Float32Array;
}

type ShardKind = 'glass' | 'wood' | 'stone' | 'cloth' | 'sand';

const BIN_SIZE = 8;
const GRAVITY = -16.5;

export class DestructibleField {
  private readonly records: DestructibleRecord[];
  private readonly bins = new Map<number, number[]>();
  private readonly root: THREE.Group;
  private readonly materials: MaterialLibrary;
  private readonly events: EventBus | null;
  private readonly rng = new Rng(0x51ce);

  private readonly shardGeometry = new Map<ShardKind, THREE.BufferGeometry>();
  private readonly shardMaterial = new Map<ShardKind, THREE.MeshStandardMaterial>();
  private readonly active: Burst[] = [];
  private readonly pool: Burst[] = [];
  private readonly maxBursts: number;
  private readonly shardsPerBurst: number;

  private brokenCount = 0;

  constructor(opts: {
    records: DestructibleRecord[];
    root: THREE.Group;
    materials: MaterialLibrary;
    events?: EventBus;
    debrisBudget: number;
  }) {
    this.records = opts.records;
    this.root = opts.root;
    this.materials = opts.materials;
    this.events = opts.events ?? null;
    this.shardsPerBurst = clamp(Math.round(opts.debrisBudget / 24), 4, 14);
    this.maxBursts = clamp(Math.round(opts.debrisBudget / 20), 4, 20);

    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      const key = binKey(record.position.x, record.position.z);
      let list = this.bins.get(key);
      if (!list) {
        list = [];
        this.bins.set(key, list);
      }
      list.push(i);
      // Pieces near a bin edge must be reachable from the neighbouring bin too.
      for (const [dx, dz] of NEIGHBOURS) {
        const nk = binKey(record.position.x + dx * record.radius, record.position.z + dz * record.radius);
        if (nk === key) continue;
        let near = this.bins.get(nk);
        if (!near) {
          near = [];
          this.bins.set(nk, near);
        }
        if (!near.includes(i)) near.push(i);
      }
    }
  }

  get broken(): number {
    return this.brokenCount;
  }

  get count(): number {
    return this.records.length;
  }

  /**
   * Applies `amount` of damage inside `radius`, falling off linearly. Returns the
   * number of pieces that broke, which the caller can use to decide whether the
   * hit deserves a sound.
   */
  damageAt(point: THREE.Vector3, radius: number, amount: number): number {
    const minX = Math.floor((point.x - radius) / BIN_SIZE);
    const maxX = Math.floor((point.x + radius) / BIN_SIZE);
    const minZ = Math.floor((point.z - radius) / BIN_SIZE);
    const maxZ = Math.floor((point.z + radius) / BIN_SIZE);
    let broke = 0;
    const seen = new Set<number>();

    for (let bz = minZ; bz <= maxZ; bz++) {
      for (let bx = minX; bx <= maxX; bx++) {
        const list = this.bins.get(bx * 73856093 + bz * 19349663);
        if (!list) continue;
        for (const index of list) {
          if (seen.has(index)) continue;
          seen.add(index);
          const record = this.records[index];
          if (record.broken) continue;
          const distance = record.position.distanceTo(point);
          const reach = radius + record.radius;
          if (distance > reach) continue;
          const falloff = 1 - clamp((distance - record.radius) / Math.max(radius, 0.01), 0, 1);
          record.health -= amount * (0.35 + 0.65 * falloff);
          if (record.health <= 0) {
            this.break(record);
            broke++;
          }
        }
      }
    }

    // A big blast dusts everything nearby even where nothing breakable stood.
    if (radius > 1.6) {
      this.spawnBurst('stone', point, Math.min(radius * 0.5, 2.2), 1);
    }
    return broke;
  }

  /** Breaks everything in a radius regardless of health, for scripted events. */
  destroyAt(point: THREE.Vector3, radius: number): number {
    return this.damageAt(point, radius, 1e6);
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const burst = this.active[i];
      burst.age += dt;
      const fade = 1 - clamp((burst.age - burst.life * 0.7) / (burst.life * 0.3), 0, 1);

      for (let s = 0; s < burst.count; s++) {
        const o = s * 3;
        burst.velocity[o + 1] += GRAVITY * dt;
        burst.position[o] += burst.velocity[o] * dt;
        burst.position[o + 1] += burst.velocity[o + 1] * dt;
        burst.position[o + 2] += burst.velocity[o + 2] * dt;
        if (burst.position[o + 1] <= burst.rest) {
          burst.position[o + 1] = burst.rest;
          burst.velocity[o] *= 0.42;
          burst.velocity[o + 2] *= 0.42;
          burst.velocity[o + 1] *= -0.24;
          burst.spin[o] *= 0.5;
          burst.spin[o + 1] *= 0.5;
          burst.spin[o + 2] *= 0.5;
        }
        burst.rotation[o] += burst.spin[o] * dt;
        burst.rotation[o + 1] += burst.spin[o + 1] * dt;
        burst.rotation[o + 2] += burst.spin[o + 2] * dt;

        SCRATCH_POS.set(burst.position[o], burst.position[o + 1], burst.position[o + 2]);
        SCRATCH_EULER.set(burst.rotation[o], burst.rotation[o + 1], burst.rotation[o + 2]);
        SCRATCH_QUAT.setFromEuler(SCRATCH_EULER);
        const scale = burst.scale[s] * fade;
        SCRATCH_SCALE.set(scale, scale, scale);
        SCRATCH_MATRIX.compose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
        burst.mesh.setMatrixAt(s, SCRATCH_MATRIX);
      }
      burst.mesh.instanceMatrix.needsUpdate = true;

      if (burst.age >= burst.life) {
        burst.mesh.visible = false;
        this.root.remove(burst.mesh);
        this.active.splice(i, 1);
        this.pool.push(burst);
      }
    }
  }

  dispose(): void {
    for (const burst of [...this.active, ...this.pool]) {
      this.root.remove(burst.mesh);
      burst.mesh.dispose();
    }
    this.active.length = 0;
    this.pool.length = 0;
    for (const geometry of this.shardGeometry.values()) geometry.dispose();
    for (const material of this.shardMaterial.values()) material.dispose();
    this.shardGeometry.clear();
    this.shardMaterial.clear();
  }

  // -------------------------------------------------------------------------
  // Breaking
  // -------------------------------------------------------------------------

  private break(record: DestructibleRecord): void {
    record.broken = true;
    record.health = 0;
    this.brokenCount++;

    switch (record.kind) {
      case 'glass':
        this.shatterGlass(record);
        break;
      case 'sandbag':
        this.slumpSandbags(record);
        break;
      case 'crate':
        this.hideSlots(record);
        this.spawnBurst('wood', record.position, record.radius, 1.15);
        break;
      case 'stall':
        this.hideSlots(record);
        this.spawnBurst('wood', record.position, record.radius, 1.35);
        this.spawnBurst('cloth', record.position, record.radius * 0.8, 0.8);
        break;
      case 'barrel':
        this.hideSlots(record);
        this.spawnBurst('stone', record.position, record.radius, 1);
        break;
      case 'lamp':
        this.hideSlots(record);
        this.spawnBurst('glass', record.position, 0.5, 0.9);
        if (record.light) record.light.intensity = 0;
        break;
      case 'sign':
        this.tiltSlots(record);
        this.spawnBurst('stone', record.position, 0.5, 0.5);
        break;
      case 'awning':
        this.hideSlots(record);
        if (record.object) record.object.visible = false;
        this.spawnBurst('cloth', record.position, record.radius, 1);
        break;
      case 'plaster':
        this.spawnBurst('stone', record.position, record.radius, 1);
        break;
    }

    if (record.debris) record.debris.visible = true;
    this.events?.emit<DestructibleEvent>('world:destroyed', {
      kind: record.kind,
      position: record.position.clone(),
      surface: record.surface,
      radius: record.radius,
    });
  }

  /**
   * Glass keeps its instance but is squashed into the head of the opening, which
   * is what a blown-out pane actually looks like: a jagged strip left in the
   * frame, not a clean empty hole.
   */
  private shatterGlass(record: DestructibleRecord): void {
    const height = record.size?.y ?? 1.2;
    for (const slot of record.slots) {
      slot.mesh.getMatrixAt(slot.index, SCRATCH_MATRIX);
      SCRATCH_MATRIX.decompose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      const keep = 0.22;
      SCRATCH_POS.y += (height * (1 - keep)) / 2;
      SCRATCH_SCALE.set(SCRATCH_SCALE.x * 0.97, SCRATCH_SCALE.y * keep, SCRATCH_SCALE.z);
      SCRATCH_MATRIX.compose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      slot.mesh.setMatrixAt(slot.index, SCRATCH_MATRIX);
      slot.mesh.instanceMatrix.needsUpdate = true;
    }
    this.spawnBurst('glass', record.position, record.radius, 1);
  }

  /** Bags settle into a lower, wider heap rather than disappearing. */
  private slumpSandbags(record: DestructibleRecord): void {
    for (const slot of record.slots) {
      slot.mesh.getMatrixAt(slot.index, SCRATCH_MATRIX);
      SCRATCH_MATRIX.decompose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      const drop = (SCRATCH_POS.y - record.position.y + record.radius) * 0.35;
      SCRATCH_POS.y -= Math.max(0.05, drop);
      SCRATCH_POS.x += this.rng.range(-0.28, 0.28);
      SCRATCH_POS.z += this.rng.range(-0.28, 0.28);
      SCRATCH_EULER.set(this.rng.range(-0.4, 0.4), this.rng.range(-0.6, 0.6), this.rng.range(-0.4, 0.4));
      SCRATCH_QUAT.multiply(TEMP_QUAT.setFromEuler(SCRATCH_EULER));
      SCRATCH_SCALE.multiplyScalar(0.92);
      SCRATCH_MATRIX.compose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      slot.mesh.setMatrixAt(slot.index, SCRATCH_MATRIX);
      slot.mesh.instanceMatrix.needsUpdate = true;
    }
    this.spawnBurst('sand', record.position, record.radius, 1);
  }

  private hideSlots(record: DestructibleRecord): void {
    for (const slot of record.slots) {
      slot.mesh.getMatrixAt(slot.index, SCRATCH_MATRIX);
      SCRATCH_MATRIX.decompose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      SCRATCH_SCALE.set(0, 0, 0);
      SCRATCH_MATRIX.compose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      slot.mesh.setMatrixAt(slot.index, SCRATCH_MATRIX);
      slot.mesh.instanceMatrix.needsUpdate = true;
    }
    if (record.object) record.object.visible = false;
  }

  /** Signs and panels stay attached but hang off their fixing. */
  private tiltSlots(record: DestructibleRecord): void {
    for (const slot of record.slots) {
      slot.mesh.getMatrixAt(slot.index, SCRATCH_MATRIX);
      SCRATCH_MATRIX.decompose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      SCRATCH_EULER.set(0, 0, this.rng.range(0.7, 1.25) * this.rng.sign());
      SCRATCH_QUAT.multiply(TEMP_QUAT.setFromEuler(SCRATCH_EULER));
      SCRATCH_POS.y -= 0.12;
      SCRATCH_MATRIX.compose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
      slot.mesh.setMatrixAt(slot.index, SCRATCH_MATRIX);
      slot.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // -------------------------------------------------------------------------
  // Debris bursts
  // -------------------------------------------------------------------------

  private spawnBurst(
    kind: ShardKind,
    origin: THREE.Vector3,
    spread: number,
    energy: number,
  ): void {
    if (this.active.length >= this.maxBursts) {
      // Recycle the oldest burst: a new explosion matters more than an old one.
      const oldest = this.active.shift();
      if (oldest) {
        this.root.remove(oldest.mesh);
        this.pool.push(oldest);
      }
    }

    const geometry = this.geometryFor(kind);
    const material = this.materialFor(kind);
    let burst = this.pool.pop();
    if (!burst || burst.mesh.geometry !== geometry || burst.mesh.material !== material) {
      if (burst) {
        burst.mesh.dispose();
        burst = undefined;
      }
      const mesh = new THREE.InstancedMesh(geometry, material, this.shardsPerBurst);
      mesh.name = `debris:${kind}`;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      burst = {
        mesh,
        count: this.shardsPerBurst,
        age: 0,
        life: 1,
        rest: 0,
        position: new Float32Array(this.shardsPerBurst * 3),
        velocity: new Float32Array(this.shardsPerBurst * 3),
        rotation: new Float32Array(this.shardsPerBurst * 3),
        spin: new Float32Array(this.shardsPerBurst * 3),
        scale: new Float32Array(this.shardsPerBurst),
      };
    }

    burst.age = 0;
    burst.life = kind === 'cloth' ? 2.6 : 1.9;
    burst.rest = origin.y - spread * 0.7;
    burst.count = this.shardsPerBurst;

    for (let s = 0; s < burst.count; s++) {
      const o = s * 3;
      burst.position[o] = origin.x + this.rng.range(-spread, spread) * 0.5;
      burst.position[o + 1] = origin.y + this.rng.range(-spread, spread) * 0.4;
      burst.position[o + 2] = origin.z + this.rng.range(-spread, spread) * 0.5;
      const speed = energy * this.rng.range(1.4, 4.2);
      const angle = this.rng.range(0, Math.PI * 2);
      const lift = this.rng.range(0.3, 1.5) * energy;
      burst.velocity[o] = Math.cos(angle) * speed;
      burst.velocity[o + 1] = lift * 2.2;
      burst.velocity[o + 2] = Math.sin(angle) * speed;
      burst.rotation[o] = this.rng.range(0, Math.PI);
      burst.rotation[o + 1] = this.rng.range(0, Math.PI);
      burst.rotation[o + 2] = this.rng.range(0, Math.PI);
      burst.spin[o] = this.rng.range(-9, 9);
      burst.spin[o + 1] = this.rng.range(-9, 9);
      burst.spin[o + 2] = this.rng.range(-9, 9);
      burst.scale[s] = this.rng.range(0.6, 1.5);
    }
    burst.mesh.visible = true;
    burst.mesh.count = burst.count;
    this.root.add(burst.mesh);
    this.active.push(burst);
  }

  private geometryFor(kind: ShardKind): THREE.BufferGeometry {
    const existing = this.shardGeometry.get(kind);
    if (existing) return existing;
    let geometry: THREE.BufferGeometry;
    switch (kind) {
      case 'glass':
        geometry = new THREE.TetrahedronGeometry(0.075, 0);
        break;
      case 'wood':
        geometry = new THREE.BoxGeometry(0.34, 0.035, 0.075);
        break;
      case 'cloth':
        geometry = new THREE.PlaneGeometry(0.28, 0.22);
        break;
      case 'sand':
        geometry = new THREE.BoxGeometry(0.2, 0.09, 0.13);
        break;
      default:
        geometry = new THREE.IcosahedronGeometry(0.1, 0);
        break;
    }
    this.shardGeometry.set(kind, geometry);
    return geometry;
  }

  private materialFor(kind: ShardKind): THREE.MeshStandardMaterial {
    const existing = this.shardMaterial.get(kind);
    if (existing) return existing;
    let material: THREE.MeshStandardMaterial;
    switch (kind) {
      case 'glass':
        material = this.materials.clone('glass_dirty');
        // Transmission would cost an extra full-scene pass for a few shards.
        (material as THREE.MeshPhysicalMaterial).transmission = 0;
        material.transparent = true;
        material.opacity = 0.65;
        material.depthWrite = false;
        break;
      case 'wood':
        material = this.materials.clone('wood_plank');
        break;
      case 'cloth':
        material = this.materials.clone('fabric_canvas');
        material.side = THREE.DoubleSide;
        break;
      case 'sand':
        material = this.materials.clone('sandbag');
        break;
      default:
        material = this.materials.clone('concrete_damaged');
        break;
    }
    material.name = `world:debris:${kind}`;
    this.shardMaterial.set(kind, material);
    return material;
  }
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const SCRATCH_MATRIX = new THREE.Matrix4();
const SCRATCH_POS = new THREE.Vector3();
const SCRATCH_QUAT = new THREE.Quaternion();
const SCRATCH_SCALE = new THREE.Vector3();
const SCRATCH_EULER = new THREE.Euler();
const TEMP_QUAT = new THREE.Quaternion();

function binKey(x: number, z: number): number {
  return Math.floor(x / BIN_SIZE) * 73856093 + Math.floor(z / BIN_SIZE) * 19349663;
}
