import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { CoverPoint, ILevel, SpawnPoint } from '../core/Contracts';
import type { MaterialLibrary } from '../render/textures/MaterialLibrary';
import type { SurfaceKind } from '../render/textures/TextureForge';
import { makeRng } from '../core/MathX';
import { buildPlan, type Build, type CoverSeed, type LevelPlan, type MatOpts, type Solid } from './Blockout';
import { Terrain } from './Terrain';
import { buildBuildings } from './Buildings';
import { buildProps } from './Props';
import { buildVehicles } from './Vehicles';
import { buildDetail } from './Detail';
import { Navigation } from './Navigation';

/**
 * LevelSystem — builds "Al-Rashid District" and answers every ILevel query.
 *
 * The build is fully deterministic (seeded PRNG) so screenshot review is
 * reproducible. Geometry is bucketed by material and merged / instanced so the
 * whole map is a few hundred draw calls; the runtime queries never raycast the
 * mesh — ground comes from a cached heightfield, sightlines and paths from
 * rasterised grids, and cover from a pre-computed point set.
 */
export class LevelSystem implements Subsystem, ILevel {
  readonly name = 'level';
  readonly order = 10;

  readonly root = new THREE.Group();
  readonly collidables: THREE.Object3D[] = [];
  playerSpawn: SpawnPoint = { position: new THREE.Vector3(1.5, 1.7, 34), yaw: 0 };
  readonly enemySpawns: SpawnPoint[] = [];
  coverPoints: CoverPoint[] = [];
  bounds = new THREE.Box3(new THREE.Vector3(-42, -3, -72), new THREE.Vector3(42, 40, 74));

  private terrain!: Terrain;
  private nav!: Navigation;
  private plan!: LevelPlan;

  private matClones = new Set<THREE.Material>();
  private geoms = new Set<THREE.BufferGeometry>();
  private uvCache = new Map<string, number>();
  private matCache = new Map<string, THREE.Material>();

  init(ctx: EngineContext): void {
    const t0 = performance.now();
    const materials = ctx.get<MaterialLibrary>('materials');
    this.root.name = 'AlRashidDistrict';
    ctx.scene.add(this.root);

    const rng = makeRng(0x5eed01);
    const plan = buildPlan(rng);
    this.plan = plan;

    const solids: Solid[] = [];
    const interiors: THREE.Box3[] = [];
    const covers: CoverSeed[] = [];

    const env: Build = {
      rng,
      materials,
      root: this.root,
      colliders: this.collidables,
      solids,
      interiors,
      covers,
      mat: (kind, opts) => this.getMat(materials, kind, opts),
      uv: (kind) => this.getUv(materials, kind),
      windowDark: () => materials.get('window_dark'),
      // Hero panes use the transmissive glassMaterial only when USE_TRANSMISSION
      // is on. It looks great on real GPUs but adds a full-scene transmission
      // pass that roughly doubles the offline SwiftShader capture time, so the
      // reflective window_dark (which reads as glazed glass catching the sky) is
      // the default. Flip the flag for a shipping build on real hardware.
      glassHero: () =>
        USE_TRANSMISSION
          ? materials.glassMaterial({ tint: 0xaeb8ba, roughness: 1.0, envMapIntensity: 1.5 })
          : materials.get('window_dark'),
      decal: (kind) => materials.decalMaterial(kind),
      own: (geo, mat) => {
        if (geo) this.geoms.add(geo);
        if (mat) this.matClones.add(mat);
      },
    };

    // --- Build order: ground first, then structures, then dressing ---------
    this.terrain = new Terrain(plan);
    this.terrain.build(env);
    buildBuildings(env, plan);
    buildVehicles(env, plan);
    buildProps(env, plan);
    buildDetail(env, plan);

    // --- Navigation + queries ---------------------------------------------
    this.nav = new Navigation(plan.bounds, solids, interiors, {
      cell: 1,
      ground: (x, z) => this.terrain.sample(x, z),
    });
    this.nav.addSeeds(covers);
    this.coverPoints = this.nav.coverPoints;

    // --- Spawns ------------------------------------------------------------
    this.setupSpawns(plan);

    this.root.updateMatrixWorld(true);
    ctx.provide('focusTargets', this.collidables);

    // --- Stats -------------------------------------------------------------
    const { calls, tris } = this.countGeometry();
    const ms = performance.now() - t0;
    console.info(
      `[level] Al-Rashid District built in ${ms.toFixed(0)}ms — ` +
        `~${calls} draw calls, ${(tris / 1000).toFixed(0)}k triangles, ` +
        `${this.collidables.length} colliders, ${this.coverPoints.length} cover pts, ` +
        `${this.enemySpawns.length} enemy spawns`
    );
  }

  // -------------------------------------------------------------------------
  // Material / uv helpers (tinted clones, tracked for disposal)
  // -------------------------------------------------------------------------

  private getUv(materials: MaterialLibrary, kind: SurfaceKind | string): number {
    const c = this.uvCache.get(kind);
    if (c !== undefined) return c;
    const v = materials.worldSizeOf(kind as SurfaceKind);
    this.uvCache.set(kind, v);
    return v;
  }

  private getMat(materials: MaterialLibrary, kind: SurfaceKind | string, opts?: MatOpts): THREE.Material {
    const base = materials.get(kind as SurfaceKind);
    if (!opts || (opts.tint === undefined && opts.rough === undefined && opts.metal === undefined && opts.normalScale === undefined && opts.ao === undefined && !opts.key)) {
      return base;
    }
    const key = `${kind}|${opts.key ?? ''}|${opts.tint ?? ''}|${opts.rough ?? ''}|${opts.metal ?? ''}|${opts.normalScale ?? ''}|${opts.ao ?? ''}`;
    const cached = this.matCache.get(key);
    if (cached) return cached;
    const clone = (base as THREE.MeshStandardMaterial).clone();
    if (opts.tint !== undefined) clone.color = new THREE.Color(opts.tint);
    if (opts.rough !== undefined) clone.roughness = opts.rough;
    if (opts.metal !== undefined) clone.metalness = opts.metal;
    // Calm the procedural relief on large architectural surfaces so walls read
    // as weathered plaster/brick, not melted wax. Per-kind defaults, overridable.
    const calm = CALM[String(this.resolveKind(kind))];
    const nS = opts.normalScale ?? calm?.n;
    const ao = opts.ao ?? calm?.a;
    if (nS !== undefined) clone.normalScale.set(nS, nS);
    if (ao !== undefined) clone.aoMapIntensity = ao;
    clone.name = `${base.name}_${opts.key ?? 'tint'}`;
    this.matCache.set(key, clone);
    this.matClones.add(clone);
    return clone;
  }

  private resolveKind(kind: string): string {
    const aliases: Record<string, string> = {
      wall_concrete: 'concrete_cast',
      wall_concrete_old: 'concrete_rough',
      wall_brick: 'brick_clay',
      wall_plaster: 'plaster_painted',
      road: 'asphalt',
      ground_sand: 'sand_dune',
      ground_gravel: 'sand_gravel',
      ground_dirt: 'dirt_ground',
      floor_tile: 'tile_ceramic',
      roof_metal: 'corrugated_metal',
      crate_wood: 'wood_plank',
      barrier_sandbag: 'sandbag',
      window: 'glass_dirty',
      debris: 'rubble',
    };
    return aliases[kind] ?? kind;
  }

  // -------------------------------------------------------------------------
  // Spawns
  // -------------------------------------------------------------------------

  private setupSpawns(plan: LevelPlan): void {
    const gy = (x: number, z: number) => (this.terrain.sample(x, z) ?? 0) + 1.7;
    this.playerSpawn = {
      position: new THREE.Vector3(plan.playerSpawn.x, gy(plan.playerSpawn.x, plan.playerSpawn.z), plan.playerSpawn.z),
      yaw: plan.playerSpawn.yaw,
      tag: 'player',
    };

    // Curated enemy positions: interiors, behind cover, alleys, market, court.
    const spots: [number, number, string][] = [
      [-19, 2, 'W_M interior'],
      [-22, -4, 'W_M interior'],
      [19, -4, 'E_M interior'],
      [22, 3, 'E_M interior'],
      [20, 28, 'E_S interior'],
      [0.5, 4.5, 'checkpoint'],
      [-2.6, -6.5, 'wreck'],
      [3.2, -22, 'wreck'],
      [-20, 34, 'courtyard'],
      [-27, 26, 'courtyard'],
      [-21, -22, 'W_L'],
      [-4, -33, 'north rubble'],
      [4.5, -42, 'north street'],
      [10.5, 16, 'alley'],
      [-22, -46, 'landmark'],
    ];
    for (const [x, z, tag] of spots) {
      const dz = plan.playerSpawn.z - z;
      const dx = plan.playerSpawn.x - x;
      const yaw = Math.atan2(dx, dz); // face roughly toward the player's approach
      this.enemySpawns.push({
        position: new THREE.Vector3(x, this.terrain.sample(x, z) ?? 0, z),
        yaw,
        tag,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  private countGeometry(): { calls: number; tris: number } {
    let calls = 0;
    let tris = 0;
    this.root.traverse((o) => {
      const mesh = o as THREE.Mesh & { isInstancedMesh?: boolean; count?: number };
      const g = (mesh as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (!g || !(mesh as THREE.Mesh).isMesh) return;
      if ((mesh.material as THREE.Material)?.visible === false) return;
      calls++;
      const idx = g.getIndex();
      const posAttr = g.getAttribute('position');
      const faceCount = idx ? idx.count / 3 : posAttr ? posAttr.count / 3 : 0;
      const instances = mesh.isInstancedMesh ? mesh.count ?? 1 : 1;
      tris += faceCount * instances;
    });
    return { calls, tris: Math.round(tris) };
  }

  // -------------------------------------------------------------------------
  // ILevel
  // -------------------------------------------------------------------------

  sampleGround(x: number, z: number): number | null {
    return this.terrain.sample(x, z);
  }

  lineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    return this.nav.lineOfSight(from, to);
  }

  findCover(from: THREE.Vector3, threat: THREE.Vector3, maxDist?: number): CoverPoint | null {
    return this.nav.findCover(from, threat, maxDist);
  }

  findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] | null {
    return this.nav.findPath(from, to);
  }

  isIndoors(position: THREE.Vector3): boolean {
    return this.nav.isIndoors(position);
  }

  // -------------------------------------------------------------------------

  dispose(): void {
    for (const g of this.geoms) g.dispose();
    for (const m of this.matClones) m.dispose();
    this.geoms.clear();
    this.matClones.clear();
    this.matCache.clear();
    this.root.traverse((o) => {
      const inst = o as THREE.InstancedMesh;
      if (inst.isInstancedMesh) inst.dispose();
    });
    this.root.clear();
  }
}

/**
 * Transmissive hero glass looks best on real hardware but roughly doubles the
 * software (SwiftShader) capture time. Off by default for tractable offline
 * review; the reflective window_dark reads as glazed glass in the meantime.
 */
const USE_TRANSMISSION = false;

/** Per-kind normal/AO calming so procedural relief doesn't read as melted wax. */
const CALM: Record<string, { n: number; a: number }> = {
  plaster_painted: { n: 0.26, a: 0.42 },
  brick_clay: { n: 0.55, a: 0.6 },
  concrete_cast: { n: 0.45, a: 0.7 },
  concrete_rough: { n: 0.45, a: 0.7 },
  asphalt: { n: 0.3, a: 0.8 },
  sand_dune: { n: 0.5, a: 0.7 },
  sand_gravel: { n: 0.55, a: 0.75 },
  dirt_ground: { n: 0.55, a: 0.75 },
  tile_ceramic: { n: 0.4, a: 0.7 },
  rubble: { n: 0.7, a: 0.8 },
};
