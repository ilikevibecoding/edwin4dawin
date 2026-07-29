import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type {
  CoverPoint,
  ILighting,
  IMaterialLibrary,
  IPhysics,
  ISky,
  IWorld,
  LightPortal,
  SpawnPoint,
} from '../core/Interfaces';
import { Rng } from '../core/MathUtils';
import { registerVantages } from '../core/Vantage';
import { Batcher } from './Batcher';
import { updateCloth } from './Cloth';
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
import { Practicals } from './Practicals';
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
  /**
   * Every window and door cut through a wall that fronts a room, in world
   * space. The lighting bake aims its interior rays through these; see
   * `LightPortal`.
   */
  readonly portals: LightPortal[] = [];

  /** Generation statistics, surfaced in the debug overlay and the report. */
  readonly stats = {
    generationMs: 0,
    bakeMs: 0,
    navMs: 0,
    mergedMeshes: 0,
    instancedMeshes: 0,
    instances: 0,
    /** Prop placements merged into static geometry instead of instanced. */
    bakedProps: 0,
    triangles: 0,
    coverPoints: 0,
    navRays: 0,
    walkableCells: 0,
    /** Working lights handed to the lighting rig. */
    practicals: 0,
  };

  private terrain!: Terrain;
  private batch!: Batcher;
  private nav!: Nav;
  private practicals = new Practicals();
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
    Practicals.registerMaterials(this.batch);

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
    this.portals.push(...result.portals);
    this.practicals = town.practicals;

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
    /*
     * After the root is in the scene, because the rig reads each light's world
     * matrix, and before physics, because a light is not collision geometry and
     * `addStatic` traverses everything under the root.
     */
    this.practicals.attach(this.root, ctx.tryGet<ILighting>('lighting'));
    this.stats.practicals = this.practicals.count;
    this.stats.bakeMs = performance.now() - tBake;
    this.stats.mergedMeshes = this.batch.mergedMeshes;
    this.stats.instancedMeshes = this.batch.instancedMeshes;
    this.stats.instances = this.batch.instanceCount + this.batch.bakedProps;
    this.stats.bakedProps = this.batch.bakedProps;
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
        `${this.stats.instances} prop placements (${this.stats.bakedProps} baked), ` +
        `${(this.stats.triangles / 1000).toFixed(0)}k tris, ` +
        `${this.stats.practicals} practicals, ` +
        `${this.coverPoints.length} cover points, ${this.spawnPoints.length} spawns.`,
    );
  }

  update(dt: number, ctx: GameContext): void {
    const sky = ctx.tryGet<ISky>('sky');
    windTime.value += dt * (0.6 + (sky?.weather?.windSpeed ?? 4) * 0.13);
    updateCloth(sky);
    this.batch.updateLod(ctx.camera.position, ctx.quality.lodBias, ctx.quality.drawDistance);
  }

  onQualityChange(quality: GameContext['quality']): void {
    this.quality = quality;
  }

  dispose(): void {
    this.practicals.dispose();
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

  /**
   * Camera placements, and the one number every one of them is judged on.
   *
   * At the golden preset the sun sits 5.8 degrees up on an azimuth of 272 — two
   * degrees north of due west — so its horizontal direction is very nearly
   * `(-1, 0)` and every shadow on the map runs east at 9.8 metres per metre of
   * height. That single fact decides whether a frame has form in it:
   *
   *  - Looking **east** puts the key over the viewer's shoulder. Every shadow
   *    falls directly away from the lens and is hidden behind the thing casting
   *    it, so a nine-metre shadow contributes nothing and the whole frame
   *    resolves to one value. Three vantages were doing exactly this and they
   *    were measurably the flattest in the set.
   *  - Looking **north or south** along a lane is cross-light: one side of the
   *    street is lit, the other is in shade, and the shadows rake across the
   *    road between them. The map's lanes run north-south, so this is free.
   *  - Looking **west** is contre-jour, with the disc in frame.
   *
   * `dot(viewDirection, sunDirection)` in the horizontal plane is the number:
   * `-1` is the sun behind the camera, `0` is cross-light, `+1` is straight
   * into it. Anything from about `0` to `+0.7` is what a stills photographer
   * would set up for, and it is quoted per vantage below where it is the reason
   * for the framing.
   */
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
        /*
         * Aimed above the horizontal rather than below it. The arcade's whole
         * subject — the slat roof, the beams, the piers and the light coming
         * through them — sits at eye level and up, while the metre of floor
         * directly under the camera is the one part of a covered lane that no
         * light reaches at a six-degree sun. Aimed level it filled the bottom
         * four tenths of the frame with black.
         */
        lookAt: new THREE.Vector3(SOUK_CENTER_X + 0.5, g(SOUK_CENTER_X, -24) + 2.15, -24),
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
        /*
         * Diagonally across the courtyard from its north-east corner. Sun dot
         * `+0.56`.
         *
         * Aimed north-north-east from the west side, this was nominally
         * cross-lit at ninety-eight degrees and still came back flat, because
         * the azimuth number is only half the story: what the camera could see
         * of the villa was its north elevation, and with the sun two degrees
         * north of west a north wall receives a grazing beam and nothing else.
         * A frame can be cross-lit and still contain no lit surface.
         *
         * From the opposite corner the same wall is seen at three-quarters with
         * the sun behind it, so its cornice, sills and the reveals of every
         * opening throw shadows nine times their depth eastward across the
         * render — which is the strongest form a facade gets all day. The
         * courtyard floor between camera and villa takes the long shadows of the
         * west wall and the palms, running toward the lens, and the gate in the
         * west wall is a bright slot on the right.
         */
        position: eye(47.2, 24.2),
        lookAt: new THREE.Vector3(34.0, g(34, 3) + 2.6, 3.0),
        fov: 52,
        hideViewmodel: true,
        note: 'Compound courtyard across the gravel to the villa, raked by the low sun.',
      },
      {
        name: 'rooftop',
        /*
         * Down the deck to the south-west, into the light. Sun dot `+0.50`.
         *
         * This shot was aimed due east, which is the worst azimuth on the map:
         * dot `-1.00`, the sun exactly behind the lens. It was aimed there for a
         * defensible reason — the west face of the bombed apartment block across
         * the street is the brightest surface in the level and it made a bright
         * subject — but a surface lit square-on from behind the camera is a
         * surface with no modelling on it at all, and the frame came back as a
         * flat bright slab under a flat bright sky with the deck an untextured
         * band along the bottom.
         *
         * Turned a hundred and twenty degrees, everything the deck has works.
         * The water tanks, aerials, satellite dishes and air-conditioning plant
         * are between the camera and a low sun, so they are rim-lit silhouettes
         * against a bright ground plane rather than mottled grey boxes. Their
         * shadows — nine times their own height — run east, which is to say
         * straight back at the lens, so they enter the bottom of the frame as
         * long converging leading lines. And the drop off the far parapet, the
         * souk roofs beyond it and the sea past those give three depth layers at
         * decreasing contrast.
         *
         * The camera stands in the north-east corner, so the deck's full
         * eighteen metres of clutter lies between it and the parapet instead of
         * behind it — the failure of an earlier version of this shot, which
         * parked two metres off the coping and proved the opposite of what the
         * vantage exists to show.
         *
         * At fifty-four degrees the sun sits sixty degrees off axis, comfortably
         * outside the frame; the light is in the shot without the disc being.
         */
        position: new THREE.Vector3(-11.5, this.platformY('North roof') + 1.72, -41.0),
        lookAt: new THREE.Vector3(-24.0, this.platformY('North roof') + 1.1, -21.0),
        fov: 54,
        hideViewmodel: true,
        note: 'Rooftop overlook south-west down the deck into the low sun.',
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
         *
         * At the north end of the surviving strip, just south of the cross
         * partition, looking down its length. The wardrobe, bed and chair recede
         * down the left, the void and its hanging slab edge open on the right, and
         * the shell hole in the south wall closes the view as the only bright thing
         * in the room.
         *
         * Three wrong answers preceded this one and they fail in different
         * directions, which is the useful part. Backing away from a wardrobe that
         * was clipping the frame took the camera past every other piece of
         * furniture in the flat and left it staring into the one corner where two
         * blank walls meet — a probe of that framing came back with bare concrete
         * on all eighty-one rays, a shelled apartment with no evidence anyone had
         * ever lived there. Moving to the far north end put it in the small room on
         * the *other* side of the cross partition, two metres from a brick wall.
         * Hugging the west wall brought the wardrobe back at a metre and a half.
         *
         * What works is to stand on the last metre of floor before the void, with
         * the west wall's furniture behind the shoulder rather than in front of the
         * lens: the wardrobe falls sixty degrees off axis and out of frame, the bed
         * and chair recede down the left inside it, and the hole opens immediately
         * to the right.
         *
         * Worth stating the general rule: an interior vantage
         * has to be placed against the room's *furnished* state, and the furniture
         * arrives from a seeded dresser that knows nothing about where the cameras
         * are. Checking each one for what is within arm's reach is not optional.
         */
        position: new THREE.Vector3(10.6, this.roomY('Apartment upper') + 1.62, -32.7),
        lookAt: new THREE.Vector3(13.8, this.roomY('Apartment upper') + 0.85, -25.8),
        fov: 64,
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
        /*
         * Seven metres further into the lane, and the whole shot changes. Sun
         * dot `0.00`.
         *
         * The azimuth was never the problem here — looking south down a lane
         * that runs north-south is dead cross-light, one wall lit and the other
         * in shade, which is why this frame has always had the best shadow
         * structure of the set. What it had instead was nothing in the first
         * seventeen metres. At z -30 the camera stands north of where the lane
         * acquires walls on both sides, so the bottom half of the frame was
         * bare ground, the run of washing that is this level's showcase for
         * backlit cloth was a row of stamps under a distant arch, and the
         * measured result was sheets at a fiftieth of the frame's area.
         *
         * From -22.5 the same elements arrive in the right order: a nearer line
         * of washing across the middle distance at a size where the light
         * coming through it is the subject rather than a detail; the sabat
         * behind it, a dark mass of wall with the lit lane showing through its
         * opening, giving the eye a destination; two drums and the kerb line in
         * the near corner for a foreground; and the whole depth of the lane
         * behind the arch. Six metres of the old empty apron are simply gone.
         */
        position: eye(ALLEY_CENTER_X, -22.5),
        lookAt: new THREE.Vector3(ALLEY_CENTER_X - 0.1, g(ALLEY_CENTER_X, 10) + 2.2, 10),
        fov: 62,
        hideViewmodel: true,
        note: 'Player eye level in the right lane, backlit washing against the sabat.',
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
        /*
         * Turned round: west down the corridor and into the sun. Sun dot
         * `+1.00`.
         *
         * This was the other dot `-1.00` frame. The cross streets are the only
         * east-west axes on the map, and they run ninety-six metres from the
         * compound wall to open water, so there is no framing of one that does
         * not either put the sun straight behind the lens or straight in front
         * of it — an eight-metre-wide corridor allows about five degrees of
         * choice. Given the two, contre-jour is the one with a picture in it.
         *
         * Everything in the corridor becomes an edge-lit silhouette: the kerbs,
         * the rubble, the souk piers where the lane crosses it, the palms on the
         * corniche. The road surface takes the whole run of shadows head-on, so
         * they converge on the vanishing point instead of hiding behind their
         * casters, and the sea closes the view with the brightest value in the
         * level at the exact centre of the frame. It is also the only vantage
         * that shows the map's full width in one shot.
         *
         * Fifty degrees rather than sixty-four: a wide lens on a long corridor
         * shrinks the far end to nothing, and the whole subject here is the
         * depth of the run.
         */
        position: eye(23.0, CROSS_A_CENTER_Z - 1.4, 1.68),
        lookAt: new THREE.Vector3(-45.0, g(-45, CROSS_A_CENTER_Z) + 2.6, CROSS_A_CENTER_Z + 0.8),
        fov: 50,
        hideViewmodel: true,
        note: 'Cross street A west into the sun: the rotation route, contre-jour.',
      },
      {
        name: 'fountain_low',
        /*
         * Standing eye height on the east side of the carriageway, eight metres
         * short of the fountain and looking north past it. Sun dot `+0.27`.
         *
         * At forty-two centimetres this camera put the eye at the height of the
         * fountain's coping, so a metre of stone rim filled the bottom three
         * fifths of the frame — one object, one value, and no information about
         * the ground the shot exists to show. Its own luminance grid ran 36/40/37
         * across the bottom against 45/148/115 across the top: everything in the
         * picture was in the top third.
         *
         * Raising it to standing height fixed that and exposed the next problem:
         * from the far kerb the fountain was fifteen metres out and two metres
         * tall, which is a small dark lump in the middle distance, not a
         * subject. Eight metres is close enough for the basin to occupy a
         * quarter of the frame height and for its stonework to read.
         *
         * The rest follows from where the sun is. With the key almost due west
         * a cylinder can only be modelled by standing north or south of it, so
         * the camera is south of the basin and the terminator runs down its
         * face with the west coping rim-lit — and looking north puts the east
         * block's sunlit west elevation down the right of the frame and the
         * west block's shaded east elevation down the left, which is the light
         * and dark structure the shot never had.
         */
        position: eye(3.4, 10.5, 1.68),
        lookAt: new THREE.Vector3(-2.2, g(-2.2, -7) + 1.5, -7),
        fov: 60,
        hideViewmodel: true,
        note: 'Market street north past the fountain: kerbs, ruts, drifted sand, prop grounding.',
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
        /*
         * Along the alley past the gate rather than square at it. Sun dot
         * `-0.06`: cross-light.
         *
         * The third dot `-1.00` frame. The gate is in the compound's west wall,
         * so a camera in the alley looking at it necessarily looks east with the
         * sun behind — there is no placement that fixes that while keeping the
         * gate square in frame, because the gate faces the sun.
         *
         * Turning ninety degrees to look up the alley fixes it and improves the
         * subject. The alley is walled on both sides: the compound's west wall
         * on the right faces the sun and is the brightest surface in the shot,
         * the east block's east face on the left never sees it and is the
         * darkest, and the gate is then a lit opening punctuating the right-hand
         * wall two thirds of the way in — a focal accent in a frame with a
         * proper light and dark side, rather than the flat centred elevation it
         * was.
         */
        position: eye(23.4, CROSS_B_CENTER_Z + 7, 1.65),
        lookAt: new THREE.Vector3(25.2, g(25.2, 8) + 1.7, 8),
        fov: 60,
        hideViewmodel: true,
        note: 'North up the alley: shaded east block, sunlit compound wall, gate beyond.',
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
