import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type {
  CoverPoint,
  IMaterialLibrary,
  IPhysics,
  IWorld,
  SpawnPoint,
} from '../core/Interfaces';
import { Rng } from '../core/MathUtils';
import { registerVantages } from '../core/Vantage';
import { Batcher } from './Batcher';
import {
  ALLEY_CENTER_X,
  BUS,
  CROSS_A_CENTER_Z,
  CROSS_B_CENTER_Z,
  FOUNTAIN,
  MAP,
  SEA_WALL_X,
  SOUK_CENTER_X,
  TECHNICAL,
  WORLD_SEED,
  rectContains,
  type Rect,
} from './Layout';
import { Nav } from './Nav';
import { registerProps } from './Props';
import { Terrain } from './Terrain';
import { Town, type Platform, type Room } from './Town';
import { registerVegetation } from './Vegetation';
import { windTime } from './Wind';

/**
 * "Al-Rashid Crossing" — the level.
 *
 * A sun-bleached North African coastal town at late golden hour, laid out as a
 * three-lane multiplayer map: a wide market street down the middle, a covered
 * souk to the west, a walled compound and villa to the east, cross-connected at
 * a third and two thirds so no lane is a dead end.
 *
 * The generator runs in four passes and reports progress between them:
 *
 *   1. **Ground.** A height field with dune relief, a crowned carriageway,
 *      kerbs, drifts, puddles and a storm drain, sorted into material buckets.
 *   2. **Town.** Parametric buildings, wrecks, the souk canopy, the compound,
 *      the rooftop network, and several hundred instanced props.
 *   3. **Bake.** Everything collapses into one merged mesh per material and
 *      cell, plus one instanced mesh per prop and cell, and is handed to the
 *      physics world in a single `addStatic` call.
 *   4. **Analysis.** The finished geometry is interrogated by raycast to derive
 *      the walkability grid, the cover points and the spawn headings.
 *
 * Everything is seeded from `WORLD_SEED`, so the town is identical every run.
 */
export default class WorldSystem implements System, IWorld {
  readonly key = 'world';
  readonly order = 30;

  readonly root = new THREE.Group();
  readonly bounds = new THREE.Box3(
    new THREE.Vector3(MAP.minX, -4, MAP.minZ),
    new THREE.Vector3(MAP.maxX, 34, MAP.maxZ),
  );
  readonly spawnPoints: SpawnPoint[] = [];
  readonly coverPoints: CoverPoint[] = [];
  readonly landmarks: Array<{ name: string; position: THREE.Vector3 }> = [];

  /** Elevated walkable surfaces: roofs, terraces, the mezzanine, the bridges. */
  readonly platforms: Platform[] = [];
  /** Named interior volumes, for AI room reasoning and audio reverb zones. */
  readonly rooms: Room[] = [];

  /** Generation statistics, surfaced in the debug overlay and the report. */
  readonly stats = {
    generationMs: 0,
    bakeMs: 0,
    navMs: 0,
    mergedMeshes: 0,
    instancedMeshes: 0,
    instances: 0,
    triangles: 0,
    coverPoints: 0,
    navRays: 0,
    walkableCells: 0,
  };

  private terrain!: Terrain;
  private batch!: Batcher;
  private nav!: Nav;
  private blockers: Rect[] = [];
  private quality!: GameContext['quality'];
  private scratch = new THREE.Vector3();

  init(ctx: GameContext): void {
    const t0 = performance.now();
    this.quality = ctx.quality;
    const lib = ctx.get<IMaterialLibrary>('materials');
    const physics = ctx.tryGet<IPhysics>('physics');
    const progress = (p: number, label: string): void => {
      ctx.events.emit('loading:progress', { progress: p, label });
    };

    progress(0.02, 'Generating Al-Rashid Crossing');
    const rng = new Rng(WORLD_SEED);
    this.batch = new Batcher(lib, 80);
    this.terrain = new Terrain(WORLD_SEED);

    registerProps(this.batch);
    registerVegetation(this.batch, ctx.quality.vegetationDensity);

    progress(0.06, 'Grading the ground');
    this.terrain.build(this.batch, rng);

    const town = new Town(
      this.batch,
      this.terrain,
      rng,
      ctx.quality.vegetationDensity,
      ctx.quality.debrisDensity,
    );
    const result = town.build(progress);
    this.blockers = result.blockers;
    this.landmarks.push(...result.landmarks);
    this.platforms.push(...result.platforms);
    this.rooms.push(...result.rooms);

    // Level of detail: distant cells swap to their simplified representation.
    // The town is small enough that this is mostly about the skyline blocks and
    // the instanced clutter, which is exactly where the wins are.
    for (const group of ['outskirts', 'sea'] as const) {
      this.batch.configureCell(group, { switchDistance: 260 });
    }

    progress(0.94, 'Baking the level');
    const tBake = performance.now();
    this.root.name = 'AlRashidCrossing';
    this.batch.build(this.root);
    this.root.matrixAutoUpdate = false;
    this.root.updateMatrix();
    ctx.scene.add(this.root);
    this.stats.bakeMs = performance.now() - tBake;
    this.stats.mergedMeshes = this.batch.mergedMeshes;
    this.stats.instancedMeshes = this.batch.instancedMeshes;
    this.stats.instances = this.batch.instanceCount;
    this.stats.triangles = Math.round(this.batch.triangles);

    if (physics) physics.addStatic(this.root);

    progress(0.97, 'Reading the ground');
    const tNav = performance.now();
    if (physics) {
      this.nav = new Nav({
        terrain: this.terrain,
        physics,
        blockers: this.blockers,
        platforms: this.platforms,
        rooms: this.rooms,
        hotspots: result.hotspots,
        rng: new Rng(WORLD_SEED ^ 0x9e37),
      });
      this.nav.buildGrid();
      this.nav.deriveCover(300, 2.0);
      this.nav.addSpawns(SPAWNS);
      this.coverPoints.push(...this.nav.coverPoints);
      this.spawnPoints.push(...this.nav.spawnPoints);
      this.stats.navRays = this.nav.rayCount;
      this.stats.walkableCells = this.nav.walkableCells;
    } else {
      // Without a physics world there is nothing to interrogate; fall back to
      // the authored intentions so the level is still playable.
      for (const s of SPAWNS) {
        this.spawnPoints.push({
          position: new THREE.Vector3(s.x, this.terrain.surfaceHeight(s.x, s.z) + 0.05, s.z),
          heading: s.heading,
          team: s.team,
          weight: s.weight ?? 1,
        });
      }
    }
    this.stats.navMs = performance.now() - tNav;
    this.stats.coverPoints = this.coverPoints.length;

    this.registerVantages();
    this.stats.generationMs = performance.now() - t0;
    progress(1, 'Al-Rashid Crossing ready');
    console.log(
      `[world] Al-Rashid Crossing built in ${this.stats.generationMs.toFixed(0)} ms ` +
        `(bake ${this.stats.bakeMs.toFixed(0)} ms, nav ${this.stats.navMs.toFixed(0)} ms) — ` +
        `${this.stats.mergedMeshes} merged + ${this.stats.instancedMeshes} instanced meshes, ` +
        `${this.stats.instances} instances, ${(this.stats.triangles / 1000).toFixed(0)}k tris, ` +
        `${this.coverPoints.length} cover points, ${this.spawnPoints.length} spawns.`,
    );
  }

  update(dt: number, ctx: GameContext): void {
    windTime.value += dt * (0.6 + (ctx.tryGet<{ weather?: { windSpeed: number } }>('sky')?.weather?.windSpeed ?? 4) * 0.13);
    this.batch.updateLod(ctx.camera.position, ctx.quality.lodBias, ctx.quality.drawDistance);
  }

  onQualityChange(quality: GameContext['quality']): void {
    this.quality = quality;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.batch?.dispose();
  }

  /* ------------------------------- IWorld -------------------------------- */

  terrainHeight(x: number, z: number): number {
    return this.terrain.surfaceHeight(x, z);
  }

  inBounds(p: THREE.Vector3): boolean {
    if (p.x < MAP.minX || p.x > MAP.maxX || p.z < MAP.minZ || p.z > MAP.maxZ) return false;
    if (p.y < -6 || p.y > 40) return false;
    return true;
  }

  isWalkable(x: number, z: number): boolean {
    if (x < MAP.minX || x > MAP.maxX || z < MAP.minZ || z > MAP.maxZ) return false;
    if (this.nav) return this.nav.isWalkable(x, z);
    for (const b of this.blockers) {
      if (rectContains(b, x, z, 0.3)) return false;
    }
    return true;
  }

  nearestNavPoint(p: THREE.Vector3, out?: THREE.Vector3): THREE.Vector3 {
    const target = out ?? new THREE.Vector3();
    if (this.nav) return this.nav.nearestNavPoint(p, target);
    return target.set(p.x, this.terrain.surfaceHeight(p.x, p.z), p.z);
  }

  skyVisibility(p: THREE.Vector3): number {
    if (this.nav) return this.nav.skyVisibility(p);
    return 1;
  }

  /* ------------------------- additive conveniences ------------------------ */

  /** Height of the surface an agent stands on at this point, floors included. */
  floorHeight(x: number, z: number): number {
    return this.nav ? this.nav.floorAt(x, z) : this.terrain.surfaceHeight(x, z);
  }

  /** Acoustic zone at a point, for `IAudio.setReverbZone`. */
  zoneAt(p: THREE.Vector3): 'outdoor' | 'street' | 'interior' | 'tunnel' {
    for (const room of this.rooms) {
      if (rectContains(room.rect, p.x, p.z, 0.2) && p.y > room.y - 1.0 && p.y < room.y + room.height + 0.6) {
        return 'interior';
      }
    }
    // The souk is roofed for most of its run, which is a tunnel acoustically.
    if (p.x > -34.5 && p.x < -25.5 && p.z > -60 && p.z < 58 && p.y < 6) return 'tunnel';
    if (p.x < -40 || p.y > 6.5) return 'outdoor';
    return 'street';
  }

  /* ------------------------------- vantages ------------------------------ */

  private registerVantages(): void {
    const g = (x: number, z: number): number => this.terrain.surfaceHeight(x, z);
    const eye = (x: number, z: number, h = 1.65): THREE.Vector3 =>
      new THREE.Vector3(x, g(x, z) + h, z);
    const v = this.scratch;
    void v;

    registerVantages([
      {
        name: 'market_hero',
        position: eye(-3.9, 51, 2.5),
        lookAt: new THREE.Vector3(0.6, g(0, -12) + 3.0, -20),
        fov: 58,
        hideViewmodel: true,
        note: 'Hero establishing shot north up the market street: bus, stalls, fountain, gate.',
      },
      {
        name: 'market_eye',
        position: eye(2.6, 22),
        lookAt: new THREE.Vector3(-0.6, g(0, -6) + 1.6, -6),
        hideViewmodel: true,
        note: 'Player eye level in the centre lane, fountain mid-ground.',
      },
      {
        name: 'souk',
        position: eye(SOUK_CENTER_X - 0.5, 10.5),
        lookAt: new THREE.Vector3(SOUK_CENTER_X + 0.5, g(SOUK_CENTER_X, -24) + 1.5, -24),
        fov: 62,
        hideViewmodel: true,
        note: 'Inside the covered souk looking north through the arcade.',
      },
      {
        name: 'souk_low',
        position: eye(SOUK_CENTER_X - 2.2, -30, 0.42),
        lookAt: new THREE.Vector3(SOUK_CENTER_X + 1.0, g(SOUK_CENTER_X, -8) + 1.1, -8),
        fov: 66,
        hideViewmodel: true,
        note: 'Knee height in the souk: ground detail, drifted sand, stall bases.',
      },
      {
        name: 'villa_court',
        position: eye(36.8, 23.4),
        lookAt: new THREE.Vector3(41.0, g(41, 1) + 3.2, -0.5),
        fov: 62,
        hideViewmodel: true,
        note: 'Compound courtyard looking at the villa across the gravel, outbuilding and palms framing.',
      },
      {
        name: 'rooftop',
        /*
         * Across the market street, not along the deck.
         *
         * Three earlier positions all failed on the same physics. The sun is six
         * degrees above the horizon and almost due west, so a roof collects a
         * tenth of the beam its own parapet does; any camera aimed down the deck
         * fills two thirds of the frame with the darkest surface on the map and
         * the shot reads as an empty yard at dusk. Turned ninety degrees the deck
         * is a strip along the bottom edge, and what fills the frame is the west
         * face of the bombed apartment block twenty metres away — which, facing
         * the sun square on, is the brightest thing in the level.
         */
        position: new THREE.Vector3(-11.4, this.platformY('North roof') + 1.7, -33.6),
        lookAt: new THREE.Vector3(16, this.platformY('North roof') - 0.4, -31.0),
        fov: 68,
        hideViewmodel: true,
        note: 'Rooftop overlook east across the market street to the ruined block.',
      },
      {
        name: 'rooftop_bridge',
        position: new THREE.Vector3(-19.5, this.platformY('North roof') + 1.7, -28),
        lookAt: new THREE.Vector3(-19.5, this.platformY('West roof') + 0.9, -8),
        fov: 62,
        hideViewmodel: true,
        note: 'Standing at the plank bridge over cross street A.',
      },
      {
        name: 'cafe_window',
        /*
         * Set back into the far corner of the flat and angled across it, rather
         * than stood four metres off the window wall. From close in, the shot is
         * a flat plane of plaster with two bright holes in it; from the corner the
         * room's own depth, its floor and its furniture all sit between the camera
         * and the light, which is the whole point of an interior shot.
         */
        position: new THREE.Vector3(-13.9, this.roomY('Cafe upper') + 1.62, -9.0),
        lookAt: new THREE.Vector3(-8.5, this.roomY('Cafe upper') + 1.05, -2.4),
        fov: 62,
        hideViewmodel: true,
        note: 'Interior room looking out of a first-floor window into bright light.',
      },
      {
        name: 'apartment_ruin',
        /*
         * On the surviving strip of first floor west of the collapse, looking
         * diagonally across the hole at the shell entry in the south wall. The
         * void, the hanging slab edge and the rubble two storeys down all sit
         * between the camera and the only bright thing in the room.
         */
        position: new THREE.Vector3(9.8, this.roomY('Apartment upper') + 1.6, -31.6),
        lookAt: new THREE.Vector3(15.7, this.roomY('Apartment upper') + 0.95, -26.0),
        fov: 66,
        hideViewmodel: true,
        note: 'Inside the shelled apartment, across the collapsed slab to the shell hole.',
      },
      {
        name: 'alley',
        position: eye(ALLEY_CENTER_X + 0.8, 20),
        lookAt: new THREE.Vector3(ALLEY_CENTER_X - 0.6, g(ALLEY_CENTER_X, -16) + 1.5, -16),
        fov: 66,
        hideViewmodel: true,
        note: 'Tight alley between the east block and the compound wall.',
      },
      {
        name: 'alley_eye',
        position: eye(ALLEY_CENTER_X, -30),
        lookAt: new THREE.Vector3(ALLEY_CENTER_X + 0.4, g(ALLEY_CENTER_X, 4) + 1.6, 4),
        hideViewmodel: true,
        note: 'Player eye level in the right lane looking south.',
      },
      {
        name: 'sea_wall',
        // Backed off the palm rank so the nearest trunk is six metres out and
        // frames the shot instead of filling it.
        position: eye(-43.4, -27.5, 1.68),
        lookAt: new THREE.Vector3(-42.6, g(-43, 12) + 1.3, 12),
        fov: 62,
        hideViewmodel: true,
        note: 'Corniche and the breached sea wall, palms against the sun.',
      },
      {
        name: 'cross_street',
        position: eye(-13, CROSS_A_CENTER_Z),
        lookAt: new THREE.Vector3(24, g(24, CROSS_A_CENTER_Z) + 1.6, CROSS_A_CENTER_Z + 0.5),
        fov: 64,
        hideViewmodel: true,
        note: 'Cross street A: the rotation route, raked by the low sun.',
      },
      {
        name: 'fountain_low',
        /*
         * Knee height on the west pavement looking north, with the kerb running
         * away to the right and the fountain sitting off-centre in the mid-ground.
         * Aimed at the basin from four metres it filled two thirds of the frame
         * with one smooth pale surface, which taught nothing about the ground —
         * which is what this shot is for.
         */
        position: new THREE.Vector3(-6.9, g(-6.9, 14) + 0.42, 14),
        lookAt: new THREE.Vector3(-2.0, g(-2, -6) + 1.15, -6),
        fov: 60,
        hideViewmodel: true,
        note: 'Low shot at the fountain: kerbs, ruts, drifted sand, prop grounding.',
      },
      {
        name: 'garage',
        position: new THREE.Vector3(10.4, this.roomY('Workshop') + 1.65, 39.5),
        lookAt: new THREE.Vector3(9.0, this.roomY('Workshop') + 1.4, 28.0),
        fov: 64,
        hideViewmodel: true,
        note: 'Inside the workshop looking out through the roller door.',
      },
      {
        name: 'gate_approach',
        position: eye(0.8, -46, 1.7),
        lookAt: new THREE.Vector3(-0.4, g(0, -60) + 4.2, -61),
        fov: 56,
        hideViewmodel: true,
        note: 'North end: the technical, the gate arch and the barricade beyond.',
      },
      {
        name: 'villa_roof',
        position: new THREE.Vector3(40, this.platformY('Villa roof') + 1.7, 3),
        lookAt: new THREE.Vector3(4, g(4, 6) + 3.0, 6),
        fov: 64,
        hideViewmodel: true,
        note: 'Villa roof terrace looking back across the whole map to the sea.',
      },
      {
        name: 'bus_cover',
        position: eye(-3.4, BUS.z + 9, 1.55),
        lookAt: new THREE.Vector3(BUS.x + 1.0, g(BUS.x, BUS.z) + 1.8, BUS.z - 1),
        fov: 60,
        hideViewmodel: true,
        note: 'Approaching the wrecked bus from the south spawn.',
      },
      {
        name: 'technical',
        position: eye(4.2, TECHNICAL.z + 8, 1.6),
        lookAt: new THREE.Vector3(TECHNICAL.x, g(TECHNICAL.x, TECHNICAL.z) + 1.3, TECHNICAL.z),
        fov: 58,
        hideViewmodel: true,
        note: 'The burnt technical, framed by the cross street and the west block.',
      },
      {
        name: 'compound_gate',
        position: eye(24.5, CROSS_B_CENTER_Z - 4, 1.65),
        lookAt: new THREE.Vector3(34, g(34, 16) + 1.8, 16),
        fov: 62,
        hideViewmodel: true,
        note: 'Alley mouth at the compound gate, villa beyond.',
      },
    ]);
  }

  private platformY(name: string): number {
    const p = this.platforms.find((q) => q.name === name);
    return p ? p.y : 7.5;
  }

  private roomY(name: string): number {
    const r = this.rooms.find((q) => q.name === name);
    return r ? r.y : 0;
  }
}

/* -------------------------------- spawns ---------------------------------- */

/**
 * Spawn intentions. The player enters from the south, the attacking force from
 * the north gate, and both sets are spread across all three lanes so a spawn
 * camper cannot lock one down. Every one sits against something — a doorway, a
 * wreck, a barricade — rather than in the open, and faces up its own lane.
 */
const SPAWNS: Array<{ x: number; z: number; heading: number; team: SpawnPoint['team']; weight?: number }> = [
  // Player: south end.
  { x: 2.6, z: 56, heading: Math.PI, team: 'player', weight: 1.4 },
  { x: -3.2, z: 50.5, heading: Math.PI - 0.15, team: 'player', weight: 1.2 },
  { x: SOUK_CENTER_X + 1.2, z: 52, heading: Math.PI, team: 'player', weight: 1.1 },
  { x: SOUK_CENTER_X - 1.6, z: 44, heading: Math.PI + 0.1, team: 'player' },
  { x: ALLEY_CENTER_X, z: 50, heading: Math.PI, team: 'player', weight: 1.1 },
  { x: -42.5, z: 48, heading: Math.PI - 0.2, team: 'player' },
  { x: 14.5, z: 50, heading: Math.PI + 0.2, team: 'player' },

  // Enemy: north end, around the gate.
  { x: -2.4, z: -54, heading: 0, team: 'enemy', weight: 1.4 },
  { x: 3.6, z: -48.5, heading: 0.12, team: 'enemy', weight: 1.2 },
  { x: SOUK_CENTER_X - 1.4, z: -50, heading: 0, team: 'enemy', weight: 1.1 },
  { x: SOUK_CENTER_X + 1.8, z: -42, heading: -0.1, team: 'enemy' },
  { x: ALLEY_CENTER_X, z: -44, heading: 0, team: 'enemy', weight: 1.1 },
  { x: -42.5, z: -46, heading: 0.2, team: 'enemy' },
  { x: 15.0, z: -46, heading: -0.2, team: 'enemy' },

  // Neutral: the middle of the map, used for reinforcements and objectives.
  { x: 33.5, z: 20.5, heading: -Math.PI * 0.5, team: 'any' },
  { x: 40, z: -14, heading: Math.PI * 0.5, team: 'any' },
  { x: -13.5, z: -6, heading: Math.PI * 0.5, team: 'any' },
  { x: 12.5, z: 34, heading: -Math.PI * 0.5, team: 'any' },
  { x: -37, z: 0, heading: Math.PI * 0.5, team: 'any' },
  { x: 0, z: 3 + 6.5, heading: Math.PI, team: 'any' },
  { x: ALLEY_CENTER_X, z: 0, heading: 0, team: 'any' },
  { x: -30, z: -10, heading: 0, team: 'any' },
];
