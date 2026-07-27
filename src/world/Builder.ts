import * as THREE from 'three';
import type { MaterialId, MaterialLibrary, SpawnPoint } from '../core/Contracts';
import type { QualityConfig } from '../core/Config';
import type { SurfaceType, Team } from '../core/GameTypes';
import { Rng, clamp, perlin2 } from '../core/MathUtils';
import { applyWorldUv, computeTangents, mergeGeometries } from '../procgen';
import {
  type ColliderSpec,
  type DestructibleSpec,
  type DetailTier,
  type InstanceRef,
  type NavSurfaceSpec,
  type ObjectOptions,
  type PropOptions,
  type Sink,
  type StaticOptions,
  tileOf,
} from './kit/Kit';

/**
 * Collects everything the level authoring code emits and turns it into a small
 * number of GPU-friendly objects.
 *
 * The kit describes the town one wall and one crate at a time; taken literally
 * that is thousands of draw calls. Everything static is therefore merged per
 * spatial chunk and per material, anything repeated often enough becomes an
 * `InstancedMesh`, and every chunk keeps its own bounds so the world can cull
 * itself before three walks the scene graph.
 */

/**
 * District grid: 48 m cells across the 144 m span.
 *
 * The cell size is a trade between draw calls and cull granularity, and on a map
 * this small draw calls win. Nine districts keep the merged batch count in the
 * low hundreds while still dropping everything behind the player, and 48 m
 * happens to be exactly one district of the layout — the west road, the market,
 * the mosque quarter.
 */
export const CHUNK_SIZE = 48;
export const CHUNK_ORIGIN = -72;
export const CHUNK_COUNT = 3;

/**
 * The ground tier is merged map-wide instead of per chunk.
 *
 * The whole 144 m of terrain, road, kerb and paint is about fifteen thousand
 * triangles and is under the camera in every single view, so splitting it across
 * thirty-six cells buys no culling and costs well over a hundred draw calls.
 */
const GROUND_CHUNK = -1;

/**
 * Fewer copies than this merge into the static batch instead of instancing.
 *
 * An `InstancedMesh` is only a win once it replaces enough draw calls to pay for
 * its own; below that the copies are better off inside a batch that already
 * exists for that material, where they cost nothing at all.
 */
const INSTANCE_MIN = 10;

export interface ColliderRecord {
  center: THREE.Vector3;
  half: THREE.Vector3;
  yaw: number;
  surface: SurfaceType;
  noCover: boolean;
  noNav: boolean;
  destructible: number;
}

export interface TrimeshRecord {
  mesh: THREE.Mesh;
  surface: SurfaceType;
}

export interface InteriorRecord {
  name: string;
  box: THREE.Box3;
}

export interface InstanceSlot {
  mesh: THREE.InstancedMesh;
  index: number;
}

export interface DestructibleRecord extends DestructibleSpec {
  id: number;
  maxHealth: number;
  broken: boolean;
  /** Resolved from `instance`/`instances` once the instanced meshes exist. */
  slots: InstanceSlot[];
}

export interface Chunk {
  index: number;
  bounds: THREE.Box3;
  center: THREE.Vector3;
  structure: THREE.Group | null;
  detail: THREE.Group | null;
  /** Instanced groups whose geometry swaps for a cheaper version at range. */
  lods: Array<{ near: THREE.Object3D; far: THREE.Object3D }>;
  triangles: number;
  drawables: number;
  active: boolean;
}

export interface BuildStats {
  drawables: number;
  triangles: number;
  vertices: number;
  instancedGroups: number;
  instances: number;
  batches: number;
  colliders: number;
  trimeshTriangles: number;
}

export interface BuildResult {
  chunks: Chunk[];
  /** Map-wide ground batches; always drawn, never culled by chunk. */
  groundRoot: THREE.Group;
  colliders: ColliderRecord[];
  trimeshes: TrimeshRecord[];
  navSurfaces: NavSurfaceSpec[];
  spawns: SpawnPoint[];
  landmarks: Map<string, THREE.Vector3>;
  interiors: InteriorRecord[];
  destructibles: DestructibleRecord[];
  lights: THREE.PointLight[];
  stats: BuildStats;
}

interface StaticBucket {
  chunk: number;
  material: MaterialId;
  tier: DetailTier;
  geometries: THREE.BufferGeometry[];
}

interface PropBucket {
  key: string;
  chunk: number;
  material: MaterialId;
  tier: DetailTier;
  geometry: THREE.BufferGeometry;
  lod: THREE.BufferGeometry | null;
  matrices: THREE.Matrix4[];
  colors: Array<THREE.Color | null>;
  tinted: boolean;
  castShadow?: boolean;
  wind: boolean;
  /** Destructibles must stay addressable, so their group always instances. */
  forced: boolean;
}

const WIND_CACHE_KEY = 'world-wind';

const WIND_GLSL = /* glsl */ `
  vec4 windLocal = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    windLocal = instanceMatrix * windLocal;
  #endif
  vec3 windWorld = (modelMatrix * windLocal).xyz;
  float windPhase = uWindTime + windWorld.x * 0.42 + windWorld.z * 0.31;
  float windMask = clamp((transformed.y - uWindBase) * uWindScale, 0.0, 1.0);
  windMask *= windMask;
  float windGust = sin(windPhase) * 0.68 + sin(windPhase * 2.37 + 1.7) * 0.32;
  transformed.x += windGust * windMask * uWindStrength;
  transformed.z += cos(windPhase * 0.81) * windMask * uWindStrength * 0.55;
`;

export class WorldBuilder implements Sink {
  readonly rng: Rng;
  readonly config: QualityConfig;

  private readonly materials: MaterialLibrary;
  private readonly groundFn: (x: number, z: number) => number;

  private readonly staticBuckets = new Map<string, StaticBucket>();
  private readonly propBuckets = new Map<string, PropBucket>();
  private readonly loose: Array<{ object: THREE.Object3D; chunk: number; tier: DetailTier }> = [];
  private readonly overlays: THREE.Object3D[] = [];
  private readonly groundRoot = new THREE.Group();

  private readonly batchMaterials = new Map<MaterialId, THREE.MeshStandardMaterial>();
  private readonly customMaterials = new Map<string, THREE.MeshStandardMaterial>();

  readonly colliders: ColliderRecord[] = [];
  readonly trimeshes: TrimeshRecord[] = [];
  readonly navSurfaces: NavSurfaceSpec[] = [];
  readonly spawns: SpawnPoint[] = [];
  readonly landmarks = new Map<string, THREE.Vector3>();
  readonly interiors: InteriorRecord[] = [];
  readonly destructibles: DestructibleRecord[] = [];
  readonly lights: THREE.PointLight[] = [];

  /** Shared by every wind material; advanced once per frame. */
  readonly windTime = { value: 0 };

  private nextDestructibleId = 1;
  private vertexTotal = 0;

  constructor(opts: {
    materials: MaterialLibrary;
    config: QualityConfig;
    seed: number;
    ground: (x: number, z: number) => number;
  }) {
    this.materials = opts.materials;
    this.config = opts.config;
    this.rng = new Rng(opts.seed);
    this.groundFn = opts.ground;
    this.groundRoot.name = 'ground';
  }

  ground(x: number, z: number): number {
    return this.groundFn(x, z);
  }

  // -------------------------------------------------------------------------
  // Geometry intake
  // -------------------------------------------------------------------------

  addStatic(geometry: THREE.BufferGeometry, opts: StaticOptions): void {
    const tier = opts.tier ?? 'structure';
    const tile = opts.tile ?? tileOf(opts.material);
    if (opts.reproject) {
      applyWorldUv(geometry, tile, opts.uvJitter ? uvOrigin(geometry, tile) : undefined);
    }
    this.finishGeometry(geometry, tile, opts.tint ?? 0xffffff, opts.mottle ?? 0, true);

    const chunk =
      tier === 'ground'
        ? GROUND_CHUNK
        : opts.chunkAt
          ? chunkIndexAt(opts.chunkAt.x, opts.chunkAt.z)
          : chunkIndexOfGeometry(geometry);
    this.bucketFor(chunk, opts.material, tier).geometries.push(geometry);
  }

  addProp(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, opts: PropOptions): InstanceRef {
    const tier = opts.tier ?? 'structure';
    const tile = opts.tile ?? tileOf(opts.material);
    if (opts.reproject && !geometry.hasAttribute('color')) applyWorldUv(geometry, tile);
    this.finishGeometry(geometry, tile, 0xffffff, 0, false);
    if (opts.lod) this.finishGeometry(opts.lod, tile, 0xffffff, 0, false);

    const chunk =
      tier === 'ground' || opts.global
        ? GROUND_CHUNK
        : chunkIndexAt(matrix.elements[12], matrix.elements[14]);
    const wind = opts.wind === true;
    const key = `${chunk}|${opts.material}|${tier}|${wind ? 'w' : 's'}|${geometry.name || geometry.uuid}`;
    let bucket = this.propBuckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        chunk,
        material: opts.material,
        tier,
        geometry,
        lod: opts.lod ?? null,
        matrices: [],
        colors: [],
        tinted: false,
        castShadow: opts.castShadow,
        wind,
        // Wind lives on a material variant the static batch does not use.
        forced: wind,
      };
      this.propBuckets.set(key, bucket);
    }
    bucket.matrices.push(matrix.clone());
    if (opts.tint !== undefined) {
      bucket.colors.push(new THREE.Color().setHex(opts.tint, THREE.SRGBColorSpace));
      bucket.tinted = true;
    } else {
      bucket.colors.push(null);
    }
    return { key, index: bucket.matrices.length - 1 };
  }

  /** Like `addProp` but guarantees an `InstancedMesh`, so copies stay addressable. */
  addInstancedProp(
    geometry: THREE.BufferGeometry,
    matrix: THREE.Matrix4,
    opts: PropOptions,
  ): InstanceRef {
    const ref = this.addProp(geometry, matrix, opts);
    const bucket = this.propBuckets.get(ref.key);
    if (bucket) bucket.forced = true;
    return ref;
  }

  /**
   * Escape hatch for the handful of meshes that span the whole map (ground blend
   * patches, decal sheets). They are exempt from chunk culling and rely on
   * three's own bounding-sphere test.
   */
  addOverlay(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
    });
    this.overlays.push(object);
  }

  addObject(object: THREE.Object3D, opts: ObjectOptions = {}): void {
    const tier = opts.tier ?? 'detail';
    const at = opts.chunkAt ?? object.position;
    const cast = opts.castShadow ?? tier === 'structure';
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
    });
    const chunk = tier === 'ground' ? GROUND_CHUNK : chunkIndexAt(at.x, at.z);
    this.loose.push({ object, chunk, tier });
  }

  // -------------------------------------------------------------------------
  // Gameplay data intake
  // -------------------------------------------------------------------------

  addCollider(center: THREE.Vector3, half: THREE.Vector3, yaw: number, spec: ColliderSpec): void {
    this.colliders.push({
      center: center.clone(),
      half: half.clone(),
      yaw,
      surface: spec.surface,
      noCover: spec.noCover === true,
      noNav: spec.noNav === true,
      destructible: spec.destructible ?? 0,
    });
  }

  addTrimesh(mesh: THREE.Mesh, surface: SurfaceType): void {
    this.trimeshes.push({ mesh, surface });
  }

  addWalkable(spec: NavSurfaceSpec): void {
    this.navSurfaces.push(spec);
  }

  addSpawn(x: number, z: number, yaw: number, team: Team, priority = 1): void {
    this.spawns.push({
      position: new THREE.Vector3(x, this.groundFn(x, z), z),
      yaw,
      team,
      priority,
    });
  }

  addLandmark(name: string, x: number, y: number, z: number): void {
    this.landmarks.set(name, new THREE.Vector3(x, y, z));
  }

  addInterior(name: string, box: THREE.Box3): void {
    this.interiors.push({ name, box: box.clone() });
  }

  addDestructible(spec: DestructibleSpec): void {
    this.destructibles.push({
      ...spec,
      id: this.nextDestructibleId++,
      maxHealth: spec.health,
      broken: false,
      slots: [],
    });
  }

  addLight(light: THREE.PointLight): void {
    this.lights.push(light);
  }

  // -------------------------------------------------------------------------
  // Materials
  // -------------------------------------------------------------------------

  material(id: MaterialId): THREE.MeshStandardMaterial {
    return this.materials.get(id);
  }

  /**
   * Tunes the shared batch material for an id. Glass is the reason this exists:
   * the procgen glass is a physical transmissive material, and transmission makes
   * three render an extra full-scene pass. A map with sixty window panes wants
   * cheap alpha glass with a strong environment reflection instead.
   */
  tuneMaterial(id: MaterialId, setup: (m: THREE.MeshStandardMaterial) => void): void {
    const material = this.batchMaterial(id);
    setup(material);
    material.needsUpdate = true;
  }

  ownMaterial(
    key: string,
    id: MaterialId,
    setup: (m: THREE.MeshStandardMaterial) => void,
  ): THREE.MeshStandardMaterial {
    const existing = this.customMaterials.get(key);
    if (existing) return existing;
    const material = this.materials.clone(id);
    material.name = `world:${key}`;
    setup(material);
    material.needsUpdate = true;
    this.customMaterials.set(key, material);
    return material;
  }

  /**
   * Foliage material with a vertex-shader sway.
   *
   * The phase comes from the instance's world position, so one instanced set of
   * cards animates with no per-frame CPU cost and no two plants move together.
   */
  windMaterial(id: MaterialId, tint: number, doubleSided: boolean): THREE.MeshStandardMaterial {
    const key = `wind|${id}|${tint.toString(16)}|${doubleSided ? 'ds' : 'fs'}`;
    const existing = this.customMaterials.get(key);
    if (existing) return existing;

    const material = this.materials.clone(id);
    material.name = `world:${key}`;
    material.color.setHex(tint, THREE.SRGBColorSpace);
    material.vertexColors = true;
    if (doubleSided) material.side = THREE.DoubleSide;

    const time = this.windTime;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = time;
      shader.uniforms.uWindStrength = { value: 0.09 };
      shader.uniforms.uWindBase = { value: 0.1 };
      shader.uniforms.uWindScale = { value: 0.75 };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uWindTime;
uniform float uWindStrength;
uniform float uWindBase;
uniform float uWindScale;`,
        )
        .replace('#include <project_vertex>', `${WIND_GLSL}\n#include <project_vertex>`);
    };
    material.customProgramCacheKey = () => WIND_CACHE_KEY;
    material.needsUpdate = true;

    this.customMaterials.set(key, material);
    return material;
  }

  /** Vertex-coloured variant used by merged batches and instanced props. */
  private batchMaterial(id: MaterialId): THREE.MeshStandardMaterial {
    const existing = this.batchMaterials.get(id);
    if (existing) return existing;
    const material = this.materials.clone(id);
    material.name = `world:batch:${id}`;
    material.vertexColors = true;
    material.needsUpdate = true;
    this.batchMaterials.set(id, material);
    return material;
  }

  // -------------------------------------------------------------------------
  // Finalisation
  // -------------------------------------------------------------------------

  finalize(root: THREE.Group): BuildResult {
    const chunks: Chunk[] = [];
    for (let i = 0; i < CHUNK_COUNT * CHUNK_COUNT; i++) chunks.push(makeChunk(i));

    const groundCounts = { drawables: 0, triangles: 0 };
    const tally = (index: number, triangles: number): void => {
      if (index === GROUND_CHUNK) {
        groundCounts.drawables++;
        groundCounts.triangles += triangles;
        return;
      }
      chunks[index].drawables++;
      chunks[index].triangles += triangles;
    };

    let instancedGroups = 0;
    let instances = 0;

    // Instance what repeats; fold the rest into the static batches so a cluster
    // of three crates does not cost a draw call of its own.
    for (const bucket of this.propBuckets.values()) {
      const count = bucket.matrices.length;
      if (!bucket.forced && count < INSTANCE_MIN) {
        const target = this.bucketFor(bucket.chunk, bucket.material, bucket.tier);
        for (const matrix of bucket.matrices) {
          const copy = bucket.geometry.clone();
          copy.userData = {};
          copy.applyMatrix4(matrix);
          target.geometries.push(copy);
        }
        continue;
      }

      const material = bucket.wind
        ? this.windMaterial(bucket.material, 0xffffff, true)
        : this.batchMaterial(bucket.material);
      const mesh = new THREE.InstancedMesh(bucket.geometry, material, count);
      mesh.name = `prop:${bucket.material}:${count}`;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, bucket.matrices[i]);
      mesh.instanceMatrix.needsUpdate = true;
      if (bucket.tinted) {
        for (let i = 0; i < count; i++) mesh.setColorAt(i, bucket.colors[i] ?? WHITE);
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      applyShadowFlags(mesh, bucket.tier, bucket.castShadow);
      mesh.computeBoundingSphere();
      this.attach(chunks, bucket.chunk, bucket.tier, mesh);
      tally(bucket.chunk, triangleCount(bucket.geometry) * count);
      instancedGroups++;
      instances += count;

      if (bucket.lod) {
        const far = new THREE.InstancedMesh(bucket.lod, material, count);
        far.name = `${mesh.name}:lod`;
        far.instanceMatrix = mesh.instanceMatrix;
        if (mesh.instanceColor) far.instanceColor = mesh.instanceColor;
        far.count = count;
        applyShadowFlags(far, bucket.tier, bucket.castShadow);
        far.computeBoundingSphere();
        far.visible = false;
        this.attach(chunks, bucket.chunk, bucket.tier, far);
        if (bucket.chunk !== GROUND_CHUNK) chunks[bucket.chunk].lods.push({ near: mesh, far });
      }

      for (const record of this.destructibles) {
        if (record.instance?.key === bucket.key) {
          record.slots.push({ mesh, index: record.instance.index });
        }
        if (record.instances) {
          for (const ref of record.instances) {
            if (ref.key === bucket.key) record.slots.push({ mesh, index: ref.index });
          }
        }
      }
    }

    let batches = 0;
    for (const bucket of this.staticBuckets.values()) {
      if (bucket.geometries.length === 0) continue;
      const merged =
        bucket.geometries.length === 1
          ? bucket.geometries[0]
          : mergeGeometries(bucket.geometries, false);
      if (!merged) {
        console.warn(`[world] merge failed for ${bucket.material} in chunk ${bucket.chunk}`);
        continue;
      }
      if (bucket.geometries.length > 1) {
        for (const geometry of bucket.geometries) geometry.dispose();
      }
      merged.computeBoundingBox();
      merged.computeBoundingSphere();

      const mesh = new THREE.Mesh(merged, this.batchMaterial(bucket.material));
      mesh.name = `batch:${bucket.tier}:${bucket.material}`;
      applyShadowFlags(mesh, bucket.tier);
      this.attach(chunks, bucket.chunk, bucket.tier, mesh);
      tally(bucket.chunk, triangleCount(merged));
      batches++;
    }

    for (const entry of this.loose) {
      this.attach(chunks, entry.chunk, entry.tier, entry.object);
      entry.object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        tally(entry.chunk, triangleCount(mesh.geometry));
      });
    }

    let drawables = groundCounts.drawables;
    let triangles = groundCounts.triangles;
    root.add(this.groundRoot);
    if (this.overlays.length > 0) {
      const overlayGroup = new THREE.Group();
      overlayGroup.name = 'overlays';
      for (const object of this.overlays) {
        overlayGroup.add(object);
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          drawables++;
          triangles += triangleCount(mesh.geometry);
        });
      }
      root.add(overlayGroup);
    }
    for (const chunk of chunks) {
      const group = new THREE.Group();
      group.name = `chunk${chunk.index}`;
      for (const tier of CHUNK_TIERS) {
        const tierGroup = chunk[tier];
        if (tierGroup) group.add(tierGroup);
      }
      chunk.active = group.children.length > 0;
      if (chunk.active) root.add(group);
      drawables += chunk.drawables;
      triangles += chunk.triangles;
    }

    // Real content bounds beat cell bounds for culling: a sixteen-metre building
    // filed by its centre reaches well past the cell it lives in.
    root.updateMatrixWorld(true);
    for (const chunk of chunks) {
      if (!chunk.active) continue;
      const box = new THREE.Box3();
      for (const tier of CHUNK_TIERS) {
        const tierGroup = chunk[tier];
        if (tierGroup) box.union(new THREE.Box3().setFromObject(tierGroup));
      }
      if (!box.isEmpty()) {
        chunk.bounds.copy(box);
        chunk.bounds.getCenter(chunk.center);
      }
    }

    let trimeshTriangles = 0;
    for (const record of this.trimeshes) trimeshTriangles += triangleCount(record.mesh.geometry);

    return {
      chunks,
      groundRoot: this.groundRoot,
      colliders: this.colliders,
      trimeshes: this.trimeshes,
      navSurfaces: this.navSurfaces,
      spawns: this.spawns,
      landmarks: this.landmarks,
      interiors: this.interiors,
      destructibles: this.destructibles,
      lights: this.lights,
      stats: {
        drawables,
        triangles,
        vertices: this.vertexTotal,
        instancedGroups,
        instances,
        batches,
        colliders: this.colliders.length,
        trimeshTriangles,
      },
    };
  }

  dispose(): void {
    for (const material of this.batchMaterials.values()) material.dispose();
    for (const material of this.customMaterials.values()) material.dispose();
    this.batchMaterials.clear();
    this.customMaterials.clear();
    this.staticBuckets.clear();
    this.propBuckets.clear();
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private bucketFor(chunk: number, material: MaterialId, tier: DetailTier): StaticBucket {
    const key = `${chunk}|${material}|${tier}`;
    let bucket = this.staticBuckets.get(key);
    if (!bucket) {
      bucket = { chunk, material, tier, geometries: [] };
      this.staticBuckets.set(key, bucket);
    }
    return bucket;
  }

  private attach(chunks: Chunk[], index: number, tier: DetailTier, object: THREE.Object3D): void {
    if (index === GROUND_CHUNK || tier === 'ground') {
      this.groundRoot.add(object);
      return;
    }
    const chunk = chunks[index];
    let group = chunk[tier];
    if (!group) {
      group = new THREE.Group();
      group.name = `chunk${index}:${tier}`;
      chunk[tier] = group;
    }
    group.add(object);
  }

  /**
   * Brings a geometry into the one attribute layout every batch shares:
   * position, normal, uv, tangent and an 8-bit vertex colour.
   *
   * Tangents matter because without them a normal map is reconstructed from
   * screen-space derivatives and the detail visibly swims under camera motion.
   * The colour attribute is what breaks up tiling: identical plaster on forty
   * walls reads as a texture atlas, the same plaster with per-vertex grime reads
   * as a street.
   */
  private finishGeometry(
    geometry: THREE.BufferGeometry,
    tile: number,
    tint: number,
    mottle: number,
    rewriteColor: boolean,
  ): void {
    if (!geometry.hasAttribute('uv')) applyWorldUv(geometry, tile);
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();
    if (!geometry.hasAttribute('tangent')) computeTangents(geometry);

    if (!rewriteColor && geometry.hasAttribute('color')) return;

    const position = geometry.attributes.position;
    const count = position.count;
    this.vertexTotal += count;

    const colors = new Uint8Array(count * 3);
    const base = SCRATCH_COLOR.setHex(tint, THREE.SRGBColorSpace);
    const br = base.r * 255;
    const bg = base.g * 255;
    const bb = base.b * 255;

    if (mottle <= 0) {
      colors.fill(0);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = br;
        colors[i * 3 + 1] = bg;
        colors[i * 3 + 2] = bb;
      }
    } else {
      for (let i = 0; i < count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        // One octave is plenty: this is a large-scale grime gradient, not detail.
        const n = perlin2(x * 0.085 + z * 0.021, z * 0.085 - y * 0.043);
        const shade = 1 - mottle * (0.5 - 0.5 * n);
        colors[i * 3] = clamp(br * shade, 0, 255);
        colors[i * 3 + 1] = clamp(bg * shade, 0, 255);
        colors[i * 3 + 2] = clamp(bb * shade, 0, 255);
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
  }
}

const WHITE = new THREE.Color(1, 1, 1);
const SCRATCH_COLOR = new THREE.Color();
const SCRATCH_BOX = new THREE.Box3();
const SCRATCH_VEC = new THREE.Vector3();

/** Tiers a chunk owns; `ground` lives in one map-wide group instead. */
const CHUNK_TIERS = ['structure', 'detail'] as const;

function makeChunk(index: number): Chunk {
  const cx = index % CHUNK_COUNT;
  const cz = Math.floor(index / CHUNK_COUNT);
  const minX = CHUNK_ORIGIN + cx * CHUNK_SIZE;
  const minZ = CHUNK_ORIGIN + cz * CHUNK_SIZE;
  const bounds = new THREE.Box3(
    new THREE.Vector3(minX, -4, minZ),
    new THREE.Vector3(minX + CHUNK_SIZE, 26, minZ + CHUNK_SIZE),
  );
  return {
    index,
    bounds,
    center: bounds.getCenter(new THREE.Vector3()),
    structure: null,
    detail: null,
    lods: [],
    triangles: 0,
    drawables: 0,
    active: false,
  };
}

export function chunkIndexAt(x: number, z: number): number {
  const cx = clamp(Math.floor((x - CHUNK_ORIGIN) / CHUNK_SIZE), 0, CHUNK_COUNT - 1);
  const cz = clamp(Math.floor((z - CHUNK_ORIGIN) / CHUNK_SIZE), 0, CHUNK_COUNT - 1);
  return cz * CHUNK_COUNT + cx;
}

function chunkIndexOfGeometry(geometry: THREE.BufferGeometry): number {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? SCRATCH_BOX;
  box.getCenter(SCRATCH_VEC);
  return chunkIndexAt(SCRATCH_VEC.x, SCRATCH_VEC.z);
}

/**
 * Per-piece world UV origin, hashed from the piece's own centre.
 *
 * Hashed rather than drawn from the sequence rng so a panel's texture placement
 * does not depend on the order the level was authored in: the same wall keeps the
 * same grime whatever else changes upstream of it.
 */
function uvOrigin(geometry: THREE.BufferGeometry, tile: number): THREE.Vector3 {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return SCRATCH_VEC.set(0, 0, 0);
  box.getCenter(SCRATCH_VEC);
  const span = tile * 16;
  return SCRATCH_VEC.set(
    hash3(SCRATCH_VEC.x, SCRATCH_VEC.y, SCRATCH_VEC.z) * span,
    hash3(SCRATCH_VEC.y, SCRATCH_VEC.z, SCRATCH_VEC.x + 7.3) * span,
    hash3(SCRATCH_VEC.z, SCRATCH_VEC.x, SCRATCH_VEC.y - 3.1) * span,
  );
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function applyShadowFlags(mesh: THREE.Mesh, tier: DetailTier, override?: boolean): void {
  mesh.castShadow = override ?? tier === 'structure';
  mesh.receiveShadow = true;
}

function triangleCount(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return index.count / 3;
  const position = geometry.getAttribute('position');
  return position ? position.count / 3 : 0;
}
