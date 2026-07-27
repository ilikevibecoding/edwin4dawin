import * as THREE from 'three';
import type { QualityConfig } from '../core/Config';
import type {
  CoverPoint,
  NavGrid,
  PhysicsSystem,
  PhysicsUserData,
  PlayerSystem,
  ProcgenSystem,
  SpawnPoint,
  WorldSystem,
} from '../core/Contracts';
import type { Team } from '../core/GameTypes';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import { CHUNK_SIZE, type BuildResult, WorldBuilder } from './Builder';
import { type CullStats, ChunkCuller } from './Culling';
import { buildCoverPoints } from './CoverBuilder';
import { DestructibleField } from './Destructibles';
import { PLAY_HALF, TERRAIN_HALF, buildLayout, createField } from './Layout';
import { type WorldNavGrid, buildNavGrid } from './NavBuilder';
import { disposeGeometryCache } from './kit/Kit';
import { type TerrainField, buildHorizon, buildTerrain } from './kit/Terrain';

/**
 * The world system: "Al-Rashid Crossing".
 *
 * Everything here is generated at init. `Layout` describes the town through the
 * `Sink` interface, `WorldBuilder` turns that description into merged per-chunk
 * batches and instanced props, and this class wires the result up to the rest of
 * the engine: colliders to physics, a multi-layer grid to the AI, cover points
 * derived from the collision boxes, destructibles to combat, and chunk culling
 * to the renderer.
 *
 * See `Layout.ts` for the map itself and `kit/` for the pieces it is built from.
 */

/** Fixed so the map is identical for every player in a match. */
const SEED = 0x0b1ac0;

/**
 * Low afternoon sun from the west-south-west.
 *
 * 31 degrees of elevation throws shadows roughly 1.7x an object's height, which
 * is what rakes the three lanes with long diagonal bars of shade and rim-lights
 * every parapet. High sun flattens the whole map into one exposure.
 */
const SUN_ELEVATION = THREE.MathUtils.degToRad(31);
const SUN_BEARING = THREE.MathUtils.degToRad(242);

/** Navigation raster. Half a metre resolves doorways without bloating memory. */
const NAV_CELL = 0.5;
const NAV_HALF = 60;

/** Ambience is re-evaluated a few times a second, not every frame. */
const AMBIENCE_INTERVAL = 0.15;

/** Metres per second the wind phase advances. */
const WIND_SPEED = 1.35;

export interface AmbienceState {
  indoors: boolean;
  /** Name of the interior volume, e.g. `market_hall_f0`. */
  space: string | null;
  /** 0..1 reverb weight from the size of the enclosing volume. */
  reverb: number;
}

export interface WorldStats extends CullStats {
  colliders: number;
  trimeshTriangles: number;
  instancedGroups: number;
  instances: number;
  batches: number;
  totalTriangles: number;
  coverPoints: number;
  spawnPoints: number;
  landmarks: number;
  interiors: number;
  destructibles: number;
  navCells: number;
  navLayers: number;
  buildMs: number;
}

export class WorldSystemImpl implements WorldSystem, System {
  readonly name = 'world' as const;
  readonly order = ORDER.WORLD;
  readonly dependencies = ['procgen', 'physics'] as const;

  readonly root = new THREE.Group();
  readonly bounds = new THREE.Box3(
    new THREE.Vector3(-TERRAIN_HALF, -4, -TERRAIN_HALF),
    new THREE.Vector3(TERRAIN_HALF, 30, TERRAIN_HALF),
  );

  readonly sunDirection = new THREE.Vector3(
    Math.cos(SUN_ELEVATION) * Math.sin(SUN_BEARING),
    Math.sin(SUN_ELEVATION),
    -Math.cos(SUN_ELEVATION) * Math.cos(SUN_BEARING),
  ).normalize();

  private ctx: EngineContext | null = null;
  private field: TerrainField | null = null;
  private builder: WorldBuilder | null = null;
  private result: BuildResult | null = null;
  private nav: WorldNavGrid | null = null;
  private culler: ChunkCuller | null = null;
  private destruction: DestructibleField | null = null;

  private cover: CoverPoint[] = [];
  private readonly spawnsByTeam = new Map<Team, SpawnPoint[]>();
  private readonly emptySpawns: SpawnPoint[] = [];
  private readonly landmarks = new Map<string, THREE.Vector3>();

  /** Retry hook: physics may still be booting when the map finishes building. */
  private collisionPending = true;

  private ambience: AmbienceState = { indoors: false, space: null, reverb: 0 };
  private ambienceTimer = 0;
  private readonly probe = new THREE.Vector3();

  private readonly stats: WorldStats = {
    chunks: 0,
    visible: 0,
    shadowOnly: 0,
    drawables: 0,
    triangles: 0,
    colliders: 0,
    trimeshTriangles: 0,
    instancedGroups: 0,
    instances: 0,
    batches: 0,
    totalTriangles: 0,
    coverPoints: 0,
    spawnPoints: 0,
    landmarks: 0,
    interiors: 0,
    destructibles: 0,
    navCells: 0,
    navLayers: 0,
    buildMs: 0,
  };

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.root.name = 'World';

    const started = performance.now();
    const materials = ctx.get<ProcgenSystem>('procgen').materials;
    const field = createField();
    this.field = field;

    const builder = new WorldBuilder({
      materials,
      config: ctx.config,
      seed: SEED,
      ground: (x, z) => field.height(x, z),
    });
    this.builder = builder;

    // Window glass: procgen authors it as a physically transmissive material,
    // which costs three an extra full-scene render whenever one pane is on
    // screen. Sixty panes of alpha glass with a strong environment reflection
    // read the same from the street for none of that.
    for (const id of ['glass_dirty', 'glass_clear'] as const) {
      builder.tuneMaterial(id, (m) => {
        (m as THREE.MeshPhysicalMaterial).transmission = 0;
        m.transparent = true;
        m.opacity = 0.34;
        m.depthWrite = false;
        m.envMapIntensity = 1.9;
        m.side = THREE.DoubleSide;
      });
    }

    // Sand at full relief is a wall of ripple crests under a low sun: every one
    // of them catches the rim light, and forty metres of open ground reads as
    // ribbed fabric rather than as a surface. Worse, the projection is planar and
    // world-aligned, so every sand mesh on the map shares one ripple phase and the
    // comb runs unbroken from spawn to spawn. Taken this far down the drift and
    // the grain survive and the corduroy does not.
    builder.tuneMaterial('sand_ground', (m) => {
      m.normalScale.setScalar(0.3);
    });

    // Same problem on the carriageway, worse because the sun rakes straight down
    // it: at full relief every chip of aggregate lights its own edge and the road
    // reads as loose cobbles rather than as chipseal that has been driven on. The
    // ambient occlusion is the other half of it — a dark ring around every stone
    // separates the aggregate into individual pebbles instead of binding it into
    // a surface, so both roads and the gravel come down together.
    for (const id of ['asphalt', 'asphalt_worn', 'gravel'] as const) {
      builder.tuneMaterial(id, (m) => {
        m.normalScale.setScalar(id === 'gravel' ? 0.42 : 0.55);
        m.aoMapIntensity = 0.6;
      });
    }

    // Dirt is the town floor now, so it is what most of the open ground is made
    // of and its crack network tiles across the widest spans on the map. Pulled
    // back it reads as compacted earth rather than as dried lakebed.
    builder.tuneMaterial('dirt_ground', (m) => {
      m.normalScale.setScalar(0.7);
      m.aoMapIntensity = 0.75;
    });

    // Painted steel, not bare zinc. Both metal surfaces are authored galvanised,
    // so a container side is a fully metallic sheet mirroring a bright sky, cut
    // into by dielectric rust blooms — the contrast between the two reads as
    // camouflage at any distance. Pulling metalness down turns the sheet into the
    // painted dielectric a container actually is and keeps the rust as colour.
    for (const id of ['metal_corrugated', 'metal_panel'] as const) {
      builder.tuneMaterial(id, (m) => {
        m.metalness = 0.42;
        m.envMapIntensity = 0.75;
      });
    }

    buildTerrain(builder, field, {
      minX: -TERRAIN_HALF,
      minZ: -TERRAIN_HALF,
      maxX: TERRAIN_HALF,
      maxZ: TERRAIN_HALF,
      step: 3,
      collisionStep: 6,
      chunkSize: CHUNK_SIZE,
    });
    buildHorizon(builder, field, {
      inner: TERRAIN_HALF,
      outer: 420,
      rings: 12,
      // 3 m spacing on the inner ring, matching the terrain shell's step exactly
      // so the two meshes share their boundary vertices.
      edgeSamples: (TERRAIN_HALF * 2) / 3,
    });
    buildLayout(builder, field);

    const result = builder.finalize(this.root);
    this.result = result;
    ctx.scene.add(this.root);

    for (const light of result.lights) this.root.add(light);

    this.computeBounds(result);
    this.groupSpawns(result.spawns);
    for (const [name, position] of result.landmarks) this.landmarks.set(name, position);

    this.nav = buildNavGrid(result.navSurfaces, result.colliders, {
      originX: -NAV_HALF,
      originZ: -NAV_HALF,
      width: Math.round((NAV_HALF * 2) / NAV_CELL),
      depth: Math.round((NAV_HALF * 2) / NAV_CELL),
      cellSize: NAV_CELL,
      ground: (x, z) => field.height(x, z),
    });
    this.cover = buildCoverPoints(result.colliders, { nav: this.nav });

    this.destruction = new DestructibleField({
      records: result.destructibles,
      root: this.root,
      materials,
      events: ctx.events,
      debrisBudget: ctx.config.debrisBudget,
    });

    this.culler = new ChunkCuller(result.chunks, result.groundRoot, {
      sunDirection: this.sunDirection,
      config: ctx.config,
    });

    this.registerCollision();

    ctx.events.on<{ position: THREE.Vector3; radius: number; damage: number }>(
      'combat:explosion',
      this.onExplosion,
    );
    ctx.events.on<{ position: THREE.Vector3 }>(
      'killstreak:airstrikeImpact',
      this.onAirstrikeImpact,
    );

    this.stats.buildMs = Math.round(performance.now() - started);
    this.publishStats();
    ctx.events.emit('world:ready', {
      bounds: this.bounds,
      landmarks: this.landmarks,
      sunDirection: this.sunDirection,
    });
  }

  update(dt: number, ctx: EngineContext): void {
    if (this.builder) this.builder.windTime.value += dt * WIND_SPEED;
    this.destruction?.update(dt);
    if (this.collisionPending) this.registerCollision();

    this.ambienceTimer += dt;
    if (this.ambienceTimer >= AMBIENCE_INTERVAL) {
      this.ambienceTimer = 0;
      this.updateAmbience(ctx);
    }
  }

  lateUpdate(_dt: number, ctx: EngineContext): void {
    // Culling runs a frame behind the camera system, which is why the culler
    // dilates the frustum rather than testing it exactly.
    ctx.camera.updateMatrixWorld();
    this.culler?.update(ctx.camera, ctx.config);
  }

  onQualityChanged(config: QualityConfig, _ctx: EngineContext): void {
    this.culler?.onQualityChanged(config);
  }

  dispose(): void {
    const ctx = this.ctx;
    if (ctx) {
      ctx.events.off('combat:explosion', this.onExplosion);
      ctx.events.off('killstreak:airstrikeImpact', this.onAirstrikeImpact);
    }
    this.culler?.reset();
    this.destruction?.dispose();
    this.root.removeFromParent();
    this.root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    this.root.clear();
    for (const record of this.result?.trimeshes ?? []) record.mesh.geometry.dispose();
    this.builder?.dispose();
    disposeGeometryCache();
    this.cover = [];
    this.spawnsByTeam.clear();
    this.landmarks.clear();
    this.result = null;
    this.nav = null;
    this.culler = null;
    this.destruction = null;
    this.builder = null;
    this.ctx = null;
  }

  // -------------------------------------------------------------------------
  // WorldSystem
  // -------------------------------------------------------------------------

  getSpawnPoints(team: Team): readonly SpawnPoint[] {
    return this.spawnsByTeam.get(team) ?? this.emptySpawns;
  }

  getCoverPoints(): readonly CoverPoint[] {
    return this.cover;
  }

  getNavGrid(): NavGrid {
    if (!this.nav) throw new Error('[world] getNavGrid() before the map was built');
    return this.nav;
  }

  /**
   * Walkable height at a world XZ, or null outside the map.
   *
   * The navigation raster answers first because it accounts for slabs, pads and
   * walkways; the analytic terrain is the fallback outside the rasterised area.
   */
  sampleGround(x: number, z: number): number | null {
    const nav = this.nav;
    if (nav) {
      const height = nav.groundAt(x, z);
      if (height !== null) return height;
    }
    if (!this.field) return null;
    if (Math.abs(x) > TERRAIN_HALF || Math.abs(z) > TERRAIN_HALF) return null;
    return this.field.height(x, z);
  }

  damageAt(point: THREE.Vector3, radius: number, amount: number): void {
    this.destruction?.damageAt(point, radius, amount);
  }

  getLandmarks(): ReadonlyMap<string, THREE.Vector3> {
    return this.landmarks;
  }

  // -------------------------------------------------------------------------
  // World-specific API (navigation layers, ambience, debug)
  // -------------------------------------------------------------------------

  /**
   * The full multi-layer navigation grid.
   *
   * `getNavGrid()` can only return one pair of arrays, so it returns the ground
   * layer. Agents that walk on roofs and upper floors resolve a position with
   * `layerAt`/`heightAt` and step between cells with `neighbours`.
   */
  getNavLayers(): WorldNavGrid | null {
    return this.nav;
  }

  /** Walkable height nearest to `y`, so a roof is not confused with the street. */
  sampleSurface(x: number, z: number, y: number): number | null {
    return this.nav?.heightAt(x, z, y) ?? this.sampleGround(x, z);
  }

  /** Named interior volumes, for reverb zones and objective placement. */
  getInteriors(): ReadonlyArray<{ name: string; box: THREE.Box3 }> {
    return this.result?.interiors ?? [];
  }

  /** Interior containing `point`, or null when outdoors. */
  interiorAt(point: THREE.Vector3): { name: string; box: THREE.Box3 } | null {
    for (const interior of this.result?.interiors ?? []) {
      if (interior.box.containsPoint(point)) return interior;
    }
    return null;
  }

  isIndoors(point: THREE.Vector3): boolean {
    return this.interiorAt(point) !== null;
  }

  /** Latest indoor/outdoor classification of the player, for audio reverb. */
  getAmbience(): AmbienceState {
    return this.ambience;
  }

  /** Breaks everything in a radius outright; used by scripted demolition. */
  destroyAt(point: THREE.Vector3, radius: number): number {
    return this.destruction?.destroyAt(point, radius) ?? 0;
  }

  /** Live counts, refreshed on demand. Exposed for the debug overlay. */
  getStats(): WorldStats {
    if (this.culler) {
      const measured = this.culler.measure();
      this.stats.chunks = measured.chunks;
      this.stats.visible = measured.visible;
      this.stats.shadowOnly = measured.shadowOnly;
      this.stats.drawables = measured.drawables;
      this.stats.triangles = measured.triangles;
    }
    this.stats.destructibles = this.destruction?.count ?? 0;
    return this.stats;
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * Hands the collision description to physics.
   *
   * Boxes for everything box-shaped, which is nearly everything: a trimesh is
   * the most expensive shape Rapier has and a wall is a cuboid. Only the terrain
   * shell and the rubble berms are irregular enough to need one.
   */
  private registerCollision(): void {
    const ctx = this.ctx;
    const result = this.result;
    if (!ctx || !result) return;
    const physics = ctx.tryGet<PhysicsSystem>('physics');
    if (!physics || physics.ready === false) return;

    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);

    for (const record of result.colliders) {
      quaternion.setFromAxisAngle(up, record.yaw);
      physics.addStaticBox(record.center, record.half, quaternion, {
        kind: 'static',
        surface: record.surface,
        object3D: this.root,
        destructible: record.destructible > 0 ? record.destructible : undefined,
      } satisfies PhysicsUserData);
    }

    for (const record of result.trimeshes) {
      record.mesh.updateMatrixWorld(true);
      physics.addStaticMesh(record.mesh, {
        kind: 'static',
        surface: record.surface,
        object3D: this.root,
      } satisfies PhysicsUserData);
    }

    this.collisionPending = false;
  }

  private computeBounds(result: BuildResult): void {
    const box = new THREE.Box3();
    for (const chunk of result.chunks) {
      if (chunk.active) box.union(chunk.bounds);
    }
    if (box.isEmpty()) return;
    // Headroom above the tallest roof for airstrike approach paths and the
    // shadow cascade fit; a floor below the terrain for fall-out detection.
    box.min.y = Math.min(box.min.y, -4);
    box.max.y = Math.max(box.max.y + 6, 26);
    this.bounds.copy(box);
  }

  private groupSpawns(spawns: readonly SpawnPoint[]): void {
    for (const spawn of spawns) {
      let list = this.spawnsByTeam.get(spawn.team);
      if (!list) {
        list = [];
        this.spawnsByTeam.set(spawn.team, list);
      }
      list.push(spawn);
    }
    // Highest priority first, so a caller that just takes the first free point
    // still gets a sensible one.
    for (const list of this.spawnsByTeam.values()) {
      list.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Tracks whether the player is under a roof and publishes it for audio.
   *
   * Interiors are registered as boxes by the building kit, so this is a handful
   * of containment tests. The reverb weight comes from the volume of the space:
   * a stairwell and a market hall should not sound alike.
   */
  private updateAmbience(ctx: EngineContext): void {
    const player = ctx.tryGet<PlayerSystem>('player');
    if (!player) return;
    this.probe.copy(player.position);
    // Sample at chest height: a doorway threshold should not flicker.
    this.probe.y += 1.0;

    const interior = this.interiorAt(this.probe);
    const indoors = interior !== null;
    const space = interior?.name ?? null;
    if (indoors === this.ambience.indoors && space === this.ambience.space) return;

    let reverb = 0;
    if (interior) {
      const size = interior.box.getSize(SCRATCH_SIZE);
      const volume = size.x * size.y * size.z;
      // ~40 m3 of cupboard is dry, ~900 m3 of hall is wet.
      reverb = THREE.MathUtils.clamp((volume - 40) / 860, 0.15, 1);
    }
    this.ambience = { indoors, space, reverb };
    ctx.events.emit<AmbienceState>('world:ambience', this.ambience);
  }

  private publishStats(): void {
    const result = this.result;
    const nav = this.nav;
    if (!result) return;
    this.stats.colliders = result.stats.colliders;
    this.stats.trimeshTriangles = result.stats.trimeshTriangles;
    this.stats.instancedGroups = result.stats.instancedGroups;
    this.stats.instances = result.stats.instances;
    this.stats.batches = result.stats.batches;
    this.stats.totalTriangles = result.stats.triangles;
    this.stats.coverPoints = this.cover.length;
    this.stats.spawnPoints = result.spawns.length;
    this.stats.landmarks = this.landmarks.size;
    this.stats.interiors = result.interiors.length;
    this.stats.destructibles = result.destructibles.length;
    this.stats.navCells = nav ? nav.width * nav.depth : 0;
    this.stats.navLayers = nav ? nav.layerCount : 0;
    if (this.culler) {
      const measured = this.culler.measure();
      this.stats.chunks = measured.chunks;
      this.stats.drawables = measured.drawables;
      this.stats.triangles = measured.triangles;
    }
    console.info(
      `[world] Al-Rashid Crossing built in ${this.stats.buildMs} ms — ` +
        `${this.stats.drawables} drawables / ${(this.stats.totalTriangles / 1e6).toFixed(2)}M tris, ` +
        `${this.stats.batches} merged batches, ${this.stats.instancedGroups} instanced groups ` +
        `(${this.stats.instances} copies), ${this.stats.colliders} box colliders + ` +
        `${this.stats.trimeshTriangles} trimesh tris, ${this.stats.coverPoints} cover points, ` +
        `${this.stats.spawnPoints} spawns, ${this.stats.landmarks} landmarks, ` +
        `${this.stats.destructibles} destructibles, ${this.stats.navLayers}-layer nav grid`,
    );
  }

  private readonly onExplosion = (payload: {
    position: THREE.Vector3;
    radius: number;
    damage: number;
  }): void => {
    if (!payload?.position) return;
    this.destruction?.damageAt(payload.position, payload.radius, payload.damage);
  };

  private readonly onAirstrikeImpact = (payload: { position: THREE.Vector3 }): void => {
    if (!payload?.position) return;
    this.destruction?.destroyAt(payload.position, 8.5);
  };
}

const SCRATCH_SIZE = new THREE.Vector3();

export { PLAY_HALF, TERRAIN_HALF };
