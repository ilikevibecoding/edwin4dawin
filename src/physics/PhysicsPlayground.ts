import * as THREE from 'three';
import { Groups, setHitMeta, type GameContext, type HitMeta } from '../core/GameContext';
import type { SurfaceKind } from '../core/Events';
import type {
  CharacterMoveResult,
  IMaterialLibrary,
  MaterialName,
  RaycastHit,
} from '../core/Interfaces';
import { DEG, Noise, Rng, clamp } from '../core/MathUtils';
import { registerVantages } from '../core/Vantage';
import type PhysicsSystem from './PhysicsSystem';

/**
 * Physics test course, active on `?showcase=physics`.
 *
 * Every element exists to make one behaviour observable: three stair flights
 * that straddle the step-up limit, four ramps that straddle the slope limit, a
 * doorway narrow enough that sloppy depenetration would jam in it, a ledge to
 * fall off, a wall to slide along, a stack of panels for penetration traces and
 * a pile of loose crates for the solver.
 *
 * The course is authored in local metres and parked far from the playable level
 * so a real level landing later cannot overlap it. Its layout is published on
 * `window.__PHYS__` in world coordinates together with hooks that drive the
 * controller, the solver and the raycaster directly, which is what
 * `tools/physics-test.mjs` asserts against — the numbers the test checks come
 * from the same constants the geometry is built from, so the two cannot drift.
 */

/* --------------------------------- layout ------------------------------- */

/** Course origin, well clear of any plausible level bounds. */
const ORIGIN = new THREE.Vector3(0, 0, -300);

const DECK = { x0: -26, x1: 26, z0: -16, z1: 28, top: 0, thickness: 1.2 };
/** Height of the upper platform every stair flight and ramp climbs to. */
const UPPER = 1.8;
const PLATFORM = { x0: -22, x1: 9, z0: -14.5, z1: -9, thickness: 0.4 };
/** Deck-side edge of the first tread. Flights run from here to PLATFORM.z1. */
const STAIR_FRONT = -6;

interface StairSpec {
  name: string;
  /** Height of a single riser, in metres. */
  riser: number;
  steps: number;
  x: number;
  width: number;
  run: number;
  topY: number;
}

const STAIRS: StairSpec[] = [
  { name: 'stairs-015', riser: 0.15, steps: 12, x: -19.5, width: 3 },
  { name: 'stairs-030', riser: 0.3, steps: 6, x: -14.5, width: 3 },
  { name: 'stairs-060', riser: 0.6, steps: 3, x: -9.5, width: 3 },
].map((s) => ({
  ...s,
  run: (STAIR_FRONT - PLATFORM.z1) / s.steps,
  topY: s.riser * s.steps,
}));

interface RampSpec {
  name: string;
  deg: number;
  angle: number;
  x: number;
  width: number;
  thickness: number;
  rise: number;
  run: number;
  length: number;
  /** Deck-side end of the slope. */
  baseZ: number;
  /** Platform-side end of the slope. */
  topZ: number;
}

const RAMPS: RampSpec[] = [
  { deg: 20, x: -5.5 },
  { deg: 35, x: -1.5 },
  { deg: 50, x: 2.5 },
  { deg: 65, x: 6.5 },
].map(({ deg, x }) => {
  const angle = deg * DEG;
  const run = UPPER / Math.tan(angle);
  return {
    name: `ramp-${deg}`,
    deg,
    angle,
    x,
    width: 3.2,
    thickness: 0.3,
    rise: UPPER,
    run,
    length: UPPER / Math.sin(angle),
    baseZ: PLATFORM.z1 + run,
    topZ: PLATFORM.z1,
  };
});

const DOOR = {
  z: 4,
  thickness: 0.4,
  x0: 10,
  x1: 24,
  gapCenter: 17,
  gapWidth: 1.1,
  height: 3.2,
  /** Underside of the lintel; a 1.8 m capsule clears it walking but not jumping. */
  lintel: 2,
};

const LEDGE = { x0: -24, x1: -14, z0: 10, z1: 20, top: 1.2 };
const SLIDE_WALL = { x0: -12, x1: 12, z: 26, thickness: 0.4, height: 3 };
const TARGET = { x: 18, y: 1.5, z: 14, half: 1 };
const PANEL = { x: 22, width: 2, height: 2.4, thickness: 0.1 };
const PANELS = [
  { name: 'panel-wood', z: 20, surface: 'wood', material: 'wood_planks', group: Groups.PROP, penetration: 0.05 },
  { name: 'panel-glass', z: 18, surface: 'glass', material: 'glass', group: Groups.GLASS, penetration: 0.02 },
  { name: 'panel-steel', z: 16, surface: 'metal', material: 'steel_plate', group: Groups.WORLD, penetration: 0.4 },
] as const;
const PILE = { x0: -6, x1: 6, z0: 12, z1: 22 };

const CAPSULE_RADIUS = 0.4;
const CAPSULE_HEIGHT = 1.8;
const GRAVITY = -9.81;
const CRATE_SIZE = 0.5;
const DEBRIS_SIZE = 0.24;
/** Instance slots for loose debris; sized to exceed the 300-body target. */
const DEBRIS_SLOTS = 384;

/** Patrol loop for the demo walker, in local x/z. */
const PATROL: Array<[number, number]> = [
  [-14.5, -4.6],
  [-14.5, -11.5],
  [-5.5, -11.5],
  [-5.5, -1],
  [8, 8],
  [DOOR.gapCenter, 8],
  [DOOR.gapCenter, 0],
  [DOOR.gapCenter, 8],
  [6, 6],
  [-14.5, -1],
];

/* --------------------------------- hooks -------------------------------- */

type V3 = [number, number, number];

interface RayResult {
  distance: number;
  point: V3;
  normal: V3;
  surface: string;
  object: string;
  penetration: number;
  damageScale: number;
  entityId: number | null;
}

interface WalkOptions {
  /** World-space feet position to start from. */
  start: V3;
  /** Horizontal heading; normalised internally. */
  dir?: [number, number];
  speed?: number;
  steps?: number;
  dt?: number;
  stepHeight?: number;
  radius?: number;
  height?: number;
  gravity?: boolean;
  /** Upward velocity applied on the first step. */
  jump?: number;
  /**
   * Horizontal distance to steer for. Once spent the walk keeps simulating with
   * no input, so a course feature can be measured with the character settled on
   * it instead of mid-stride past it.
   */
  maxTravel?: number;
  /** Frames sampled at the end for the jitter measurement. */
  tail?: number;
  path?: boolean;
}

interface WalkResult {
  position: V3;
  velocity: V3;
  grounded: boolean;
  slope: number;
  slopeDeg: number;
  groundNormal: V3;
  groundSurface: string;
  hitWall: boolean;
  hitCeiling: boolean;
  frames: number;
  groundedFrames: number;
  wallFrames: number;
  ceilingFrames: number;
  minY: number;
  maxY: number;
  gainY: number;
  travel: number;
  maxStepUp: number;
  /** Peak-to-peak vertical movement over the final frames: resting jitter. */
  tailYSpread: number;
  /** Fastest speed seen over the final frames. */
  tailSpeed: number;
  path?: V3[];
}

interface BodyStats {
  count: number;
  awake: number;
  asleep: number;
  minY: number;
  maxY: number;
  maxSpeed: number;
  /** Bodies that ended up below the deck, i.e. sank through the floor. */
  belowFloor: number;
}

interface PhysHooks {
  version: number;
  layout: ReturnType<PhysicsPlayground['describe']>;
  stats(): Record<string, number>;
  ray(origin: V3, dir: V3, maxDistance: number, mask?: number): RayResult | null;
  rayAll(origin: V3, dir: V3, maxDistance: number, mask?: number): RayResult[];
  rayBrute(origin: V3, dir: V3, maxDistance: number, mask?: number): RayResult | null;
  bvhAgrees(samples: number): { tested: number; mismatches: number; worstDelta: number };
  los(from: V3, to: V3): boolean;
  sphere(origin: V3, dir: V3, radius: number, maxDistance: number): RayResult | null;
  capsule(origin: V3, dir: V3, radius: number, height: number, maxDistance: number): RayResult | null;
  groundHeight(x: number, z: number, fromY?: number): number | null;
  overlap(center: V3, radius: number, mask?: number): string[];
  walk(opts: WalkOptions): WalkResult;
  dropBoxes(opts?: { count?: number; clear?: boolean; spin?: boolean }): number;
  clearBodies(): void;
  stepBodies(seconds: number, dt?: number): number;
  bodyStats(): BodyStats;
  explode(center: V3, radius: number, force: number): void;
  benchRays(count: number): { count: number; ms: number; raysPerMs: number; hits: number };
  benchBodies(count: number, seconds: number): {
    bodies: number;
    steps: number;
    ms: number;
    msPerStep: number;
    asleep: number;
  };
  setDebug(on: boolean): void;
  freezeWalker(frozen: boolean): void;
}

declare global {
  interface Window {
    __PHYS__?: PhysHooks;
  }
}

/* -------------------------------- scratch ------------------------------- */

const _pos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _one = new THREE.Vector3(1, 1, 1);
const _hit = makeHitRecord();
const _bruteHit = makeHitRecord();

const FALLBACK_COLOR: Partial<Record<MaterialName, number>> = {
  concrete: 0x8a8579,
  concrete_painted: 0x9a9c94,
  concrete_damaged: 0x777063,
  gravel: 0x6d6455,
  brick: 0x7d4a38,
  metal_painted: 0x4a5560,
  steel_plate: 0x6d7278,
  metal_brushed: 0x9aa0a6,
  wood_planks: 0x8a6338,
  wood_crate: 0x9a7042,
  glass: 0x9fc4cc,
  rubble: 0x6b6459,
};

export class PhysicsPlayground {
  private readonly staticRoot = new THREE.Group();
  private readonly propRoot = new THREE.Group();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly lights: THREE.Object3D[] = [];
  private matLib: IMaterialLibrary | null = null;

  private walker: THREE.Mesh | null = null;
  private walkerPos = new THREE.Vector3();
  private walkerVel = new THREE.Vector3();
  private walkerTarget = 0;
  private walkerStuck = 0;
  private walkerFrozen = false;
  private walkerLift = 0;

  private crates: THREE.InstancedMesh | null = null;
  private debris: THREE.InstancedMesh | null = null;
  private debrisCursor = 0;

  private readonly move: CharacterMoveResult = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    grounded: false,
    groundNormal: new THREE.Vector3(0, 1, 0),
    groundSurface: 'concrete',
    hitWall: false,
    slope: 0,
    hitCeiling: false,
    stepUp: 0,
  };

  /** Ray batch for the benchmark, built once so the timed loop is pure. */
  private benchOrigins: Float32Array | null = null;
  private benchDirs: Float32Array | null = null;

  constructor(
    private readonly ctx: GameContext,
    private readonly physics: PhysicsSystem,
  ) {
    this.matLib = ctx.tryGet<IMaterialLibrary>('materials') ?? null;

    this.staticRoot.name = 'phys-course';
    this.staticRoot.position.copy(ORIGIN);
    this.propRoot.name = 'phys-props';
    this.propRoot.position.copy(ORIGIN);
    setHitMeta(this.staticRoot, { surface: 'concrete', group: Groups.WORLD, penetration: 0.3 });

    this.buildApron();
    this.buildDeck();
    this.buildStairs();
    this.buildRamps();
    this.buildDoorway();
    this.buildLedge();
    this.buildSlideWall();
    this.buildTargets();

    ctx.scene.add(this.staticRoot);
    ctx.scene.add(this.propRoot);
    // The course is a single static root, so it bakes into one BVH.
    this.physics.addStatic(this.staticRoot);

    this.buildLights();
    this.buildInstancedPools();
    this.buildWalker();
    this.settleCrates();
    this.registerShots();
    this.install();

    console.log(
      `[physics] playground ready: ${this.physics.staticTriangles} static triangles`,
    );
  }

  /* ------------------------------ building ----------------------------- */

  private material(name: MaterialName, tile?: number): THREE.Material {
    if (this.matLib) {
      try {
        const mat = tile ? this.matLib.tiled(name, tile) : this.matLib.get(name);
        if (tile) this.materials.push(mat);
        return mat;
      } catch {
        /* fall through to the flat stand-in */
      }
    }
    const mat = new THREE.MeshStandardMaterial({
      color: FALLBACK_COLOR[name] ?? 0x8a8579,
      roughness: 0.85,
      metalness: name.startsWith('metal') || name.startsWith('steel') ? 0.7 : 0.05,
    });
    this.materials.push(mat);
    return mat;
  }

  /**
   * Box geometry whose UVs are rescaled to a constant world-space texel
   * density, so a 26 m deck and a 0.3 m tread read at the same detail level.
   */
  private boxGeometry(w: number, h: number, d: number, tile = 2): THREE.BoxGeometry {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    // BoxGeometry emits +x, -x, +y, -y, +z, -z, four vertices each, every face
    // parameterised 0..1 regardless of its size.
    const spans = [d, h, d, h, w, d, w, d, w, h, w, h];
    for (let f = 0; f < 6; f++) {
      const su = spans[f * 2] / tile;
      const sv = spans[f * 2 + 1] / tile;
      for (let i = 0; i < 4; i++) {
        const k = f * 4 + i;
        uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv);
      }
    }
    uv.needsUpdate = true;
    this.geometries.push(geo);
    return geo;
  }

  private slab(
    name: string,
    size: V3,
    center: V3,
    material: MaterialName,
    meta?: HitMeta,
    rotX = 0,
    tile = 2,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.boxGeometry(size[0], size[1], size[2], tile),
      this.material(material),
    );
    mesh.name = name;
    mesh.position.set(center[0], center[1], center[2]);
    if (rotX !== 0) mesh.rotation.x = rotX;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (meta) setHitMeta(mesh, meta);
    this.staticRoot.add(mesh);
    return mesh;
  }

  /**
   * Displaced ground plane under the course. It exists to give the BVH a
   * realistic triangle count — the perf target is stated against tens of
   * thousands of triangles, and a course of boxes alone is only hundreds.
   */
  private buildApron(): void {
    const geo = new THREE.PlaneGeometry(150, 150, 120, 120);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const noise = new Noise(0x5eed);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h =
        noise.noise2(x * 0.045, z * 0.045) * 0.55 + noise.noise2(x * 0.19, z * 0.19) * 0.16;
      pos.setY(i, h - 1.5);
    }
    geo.computeVertexNormals();
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 50, uv.getY(i) * 50);
    this.geometries.push(geo);

    const mesh = new THREE.Mesh(geo, this.material('gravel'));
    mesh.name = 'apron';
    mesh.receiveShadow = true;
    setHitMeta(mesh, { surface: 'dirt', group: Groups.WORLD, penetration: 1 });
    this.staticRoot.add(mesh);
  }

  private buildDeck(): void {
    const w = DECK.x1 - DECK.x0;
    const d = DECK.z1 - DECK.z0;
    this.slab(
      'deck',
      [w, DECK.thickness, d],
      [(DECK.x0 + DECK.x1) / 2, DECK.top - DECK.thickness / 2, (DECK.z0 + DECK.z1) / 2],
      'concrete',
      { surface: 'concrete', group: Groups.WORLD, penetration: 0.5 },
      0,
      3,
    );

    const pw = PLATFORM.x1 - PLATFORM.x0;
    const pd = PLATFORM.z1 - PLATFORM.z0;
    this.slab(
      'platform',
      [pw, PLATFORM.thickness, pd],
      [
        (PLATFORM.x0 + PLATFORM.x1) / 2,
        UPPER - PLATFORM.thickness / 2,
        (PLATFORM.z0 + PLATFORM.z1) / 2,
      ],
      'concrete_painted',
      { surface: 'concrete', group: Groups.WORLD, penetration: 0.4 },
      0,
      3,
    );

    // Pillars so the raised platform reads as built rather than floating.
    const pillarY = (UPPER - PLATFORM.thickness) / 2;
    for (const px of [PLATFORM.x0 + 0.6, -6, 2, PLATFORM.x1 - 0.6]) {
      for (const pz of [PLATFORM.z0 + 0.5, PLATFORM.z1 - 1.2]) {
        this.slab(
          'platform-pillar',
          [0.5, UPPER - PLATFORM.thickness, 0.5],
          [px, pillarY, pz],
          'concrete_damaged',
          { surface: 'concrete', group: Groups.WORLD, penetration: 0.5 },
        );
      }
    }
  }

  private buildStairs(): void {
    for (const flight of STAIRS) {
      for (let i = 0; i < flight.steps; i++) {
        const top = flight.riser * (i + 1);
        const z1 = STAIR_FRONT - flight.run * i;
        const z0 = z1 - flight.run;
        this.slab(
          `${flight.name}-${i}`,
          [flight.width, top, flight.run],
          [flight.x, top / 2, (z0 + z1) / 2],
          i % 2 === 0 ? 'concrete' : 'concrete_painted',
          { surface: 'concrete', group: Groups.WORLD, penetration: 0.5 },
          0,
          1.5,
        );
      }
    }
  }

  private buildRamps(): void {
    for (const ramp of RAMPS) {
      // Rotating +x by the slope angle tilts local +z downwards, so the slab
      // climbs towards -z. Solve the centre from the known top-surface corner
      // at (x, UPPER, topZ) so ramp and platform meet exactly.
      const h = ramp.length / 2;
      const t = ramp.thickness / 2;
      const sin = Math.sin(ramp.angle);
      const cos = Math.cos(ramp.angle);
      const cy = UPPER - h * sin - t * cos;
      const cz = ramp.topZ + h * cos - t * sin;
      this.slab(
        ramp.name,
        [ramp.width, ramp.thickness, ramp.length],
        [ramp.x, cy, cz],
        'steel_plate',
        { surface: 'metal', group: Groups.WORLD, penetration: 0.2 },
        ramp.angle,
        1.5,
      );

      // Side rails, outboard of the walking surface so they cannot be climbed.
      for (const side of [-1, 1]) {
        this.slab(
          `${ramp.name}-rail`,
          [0.1, 0.22, ramp.length],
          [ramp.x + side * (ramp.width / 2 + 0.05), cy + 0.24 * cos, cz + 0.24 * sin],
          'metal_painted',
          { surface: 'metal', group: Groups.WORLD, penetration: 0.1 },
          ramp.angle,
          1,
        );
      }
    }
  }

  private buildDoorway(): void {
    const gapL = DOOR.gapCenter - DOOR.gapWidth / 2;
    const gapR = DOOR.gapCenter + DOOR.gapWidth / 2;
    const meta: HitMeta = { surface: 'concrete', group: Groups.WORLD, penetration: 0.35 };

    const leftW = gapL - DOOR.x0;
    this.slab(
      'door-wall-left',
      [leftW, DOOR.height, DOOR.thickness],
      [DOOR.x0 + leftW / 2, DOOR.height / 2, DOOR.z],
      'brick',
      meta,
      0,
      1.5,
    );
    const rightW = DOOR.x1 - gapR;
    this.slab(
      'door-wall-right',
      [rightW, DOOR.height, DOOR.thickness],
      [gapR + rightW / 2, DOOR.height / 2, DOOR.z],
      'brick',
      meta,
      0,
      1.5,
    );
    this.slab(
      'door-lintel',
      [DOOR.gapWidth, DOOR.height - DOOR.lintel, DOOR.thickness],
      [DOOR.gapCenter, (DOOR.height + DOOR.lintel) / 2, DOOR.z],
      'concrete_damaged',
      meta,
      0,
      1,
    );
  }

  private buildLedge(): void {
    const w = LEDGE.x1 - LEDGE.x0;
    const d = LEDGE.z1 - LEDGE.z0;
    this.slab(
      'ledge',
      [w, LEDGE.top, d],
      [(LEDGE.x0 + LEDGE.x1) / 2, LEDGE.top / 2, (LEDGE.z0 + LEDGE.z1) / 2],
      'concrete_damaged',
      { surface: 'concrete', group: Groups.WORLD, penetration: 0.5 },
      0,
      2.5,
    );
  }

  private buildSlideWall(): void {
    const w = SLIDE_WALL.x1 - SLIDE_WALL.x0;
    this.slab(
      'slide-wall',
      [w, SLIDE_WALL.height, SLIDE_WALL.thickness],
      [(SLIDE_WALL.x0 + SLIDE_WALL.x1) / 2, SLIDE_WALL.height / 2, SLIDE_WALL.z],
      'concrete_painted',
      { surface: 'concrete', group: Groups.WORLD, penetration: 0.4 },
      0,
      3,
    );
  }

  private buildTargets(): void {
    this.slab(
      'ray-target',
      [TARGET.half * 2, TARGET.half * 2, TARGET.half * 2],
      [TARGET.x, TARGET.y, TARGET.z],
      'metal_painted',
      { surface: 'metal', group: Groups.PROP, penetration: 0.12, damageScale: 1.5 },
      0,
      1,
    );

    for (const panel of PANELS) {
      const mesh = this.slab(
        panel.name,
        [PANEL.width, PANEL.height, PANEL.thickness],
        [PANEL.x, PANEL.height / 2, panel.z],
        panel.material as MaterialName,
        {
          surface: panel.surface,
          group: panel.group,
          penetration: panel.penetration,
          breakable: panel.surface === 'glass',
        },
        0,
        1,
      );
      if (panel.surface === 'glass') {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.transparent === false) {
          const clone = mat.clone();
          clone.transparent = true;
          clone.opacity = 0.35;
          mesh.material = clone;
          this.materials.push(clone);
        }
        mesh.castShadow = false;
      }
      // Posts, so the panels do not read as floating sheets.
      for (const side of [-1, 1]) {
        this.slab(
          `${panel.name}-post`,
          [0.12, PANEL.height + 0.15, 0.12],
          [PANEL.x + side * (PANEL.width / 2), (PANEL.height + 0.15) / 2, panel.z],
          'metal_rusted',
          { surface: 'metal', group: Groups.WORLD, penetration: 0.15 },
        );
      }
    }
  }

  /**
   * The course sits outside the level's light rig, so it brings its own key
   * light. Showcase-only: nothing here runs in a normal session.
   */
  private buildLights(): void {
    const sun = new THREE.DirectionalLight(0xffe6c4, 2.7);
    sun.position.copy(ORIGIN).add(_a.set(30, 42, 26));
    sun.target.position.copy(ORIGIN).add(_a.set(0, 1, 2));
    sun.castShadow = this.ctx.quality.shadows;
    const size = Math.min(2048, this.ctx.quality.shadowMapSize);
    sun.shadow.mapSize.set(size, size);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 140;
    const extent = 40;
    sun.shadow.camera.left = -extent;
    sun.shadow.camera.right = extent;
    sun.shadow.camera.top = extent;
    sun.shadow.camera.bottom = -extent;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.025;
    this.ctx.scene.add(sun, sun.target);
    this.lights.push(sun, sun.target);

    // Cool bounce from the opposite side so the shadowed faces are not black.
    const fill = new THREE.DirectionalLight(0x7fa6d8, 0.55);
    fill.position.copy(ORIGIN).add(_a.set(-26, 16, -24));
    this.ctx.scene.add(fill);
    this.lights.push(fill);
  }

  private buildInstancedPools(): void {
    const crateGeo = this.boxGeometry(CRATE_SIZE, CRATE_SIZE, CRATE_SIZE, 0.5);
    this.crates = new THREE.InstancedMesh(crateGeo, this.material('wood_crate'), 48);
    this.crates.name = 'phys-crates';
    this.crates.castShadow = true;
    this.crates.receiveShadow = true;
    this.hideAllInstances(this.crates);
    setHitMeta(this.crates, { surface: 'wood', group: Groups.DEBRIS, penetration: 0.06 });
    this.propRoot.add(this.crates);

    const debrisGeo = this.boxGeometry(DEBRIS_SIZE, DEBRIS_SIZE, DEBRIS_SIZE, 0.25);
    this.debris = new THREE.InstancedMesh(debrisGeo, this.material('rubble'), DEBRIS_SLOTS);
    this.debris.name = 'phys-debris';
    this.debris.castShadow = true;
    this.debris.receiveShadow = true;
    this.hideAllInstances(this.debris);
    setHitMeta(this.debris, { surface: 'concrete', group: Groups.DEBRIS, penetration: 0.05 });
    this.propRoot.add(this.debris);
  }

  private hideAllInstances(mesh: THREE.InstancedMesh): void {
    _mat.makeScale(0, 0, 0);
    for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, _mat);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.userData.__physOwned = true;
  }

  private buildWalker(): void {
    const geo = new THREE.CapsuleGeometry(
      CAPSULE_RADIUS,
      CAPSULE_HEIGHT - CAPSULE_RADIUS * 2,
      6,
      18,
    );
    this.geometries.push(geo);
    // Hazard orange rather than anything from the library: this is the collision
    // capsule made visible, and it has to read instantly against grey concrete
    // in every shot of the course.
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff7a1a,
      roughness: 0.5,
      metalness: 0,
      emissive: 0x1a0800,
    });
    this.materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'phys-walker';
    mesh.castShadow = true;
    mesh.userData.__physOwned = true;
    mesh.userData.physicsIgnore = true;
    this.propRoot.add(mesh);
    this.walker = mesh;

    this.walkerPos.set(PATROL[0][0], 0.05, PATROL[0][1]).add(ORIGIN);
    this.walkerTarget = 1;
    this.syncWalkerMesh();
  }

  /** Lays a pile of crates on the deck, already at rest so shots look settled. */
  private settleCrates(): void {
    if (!this.crates) return;
    const rng = new Rng(0x2f1c3a);
    const cx = (PILE.x0 + PILE.x1) / 2 - 1;
    const cz = (PILE.z0 + PILE.z1) / 2;
    let slot = 0;
    const half = CRATE_SIZE / 2;

    // A 4-3-2-1 stack, then a few tipped strays around its foot.
    for (let row = 0; row < 4 && slot < 40; row++) {
      const n = 4 - row;
      for (let i = 0; i < n; i++) {
        const x = cx + (i - (n - 1) / 2) * (CRATE_SIZE + 0.02);
        const y = half + row * (CRATE_SIZE + 0.005);
        const z = cz + rng.range(-0.03, 0.03);
        _euler.set(0, rng.range(-0.05, 0.05), 0);
        this.spawnCrate(slot++, x, y, z, _quat.setFromEuler(_euler));
      }
    }
    for (let i = 0; i < 5 && slot < 40; i++) {
      _euler.set(rng.range(-1, 1), rng.range(-Math.PI, Math.PI), rng.range(-1, 1));
      this.spawnCrate(
        slot++,
        cx + rng.range(-2.6, 3.4),
        half + rng.range(0, 0.4),
        cz + rng.range(-2.4, 2.4),
        _quat.setFromEuler(_euler),
      );
    }

    // Hand the stack to the solver and let it find its own equilibrium before
    // anyone looks at it. Dropped crates lean and slump; what the solver settles
    // into is the honest picture, and it means a screenshot taken on the first
    // frame shows the same pile as one taken a minute in.
    for (let i = 0; i < 180; i++) this.physics.stepBodies(1 / 60);
  }

  private spawnCrate(
    slot: number,
    x: number,
    y: number,
    z: number,
    quat: THREE.Quaternion,
  ): void {
    if (!this.crates) return;
    _a.set(x, y, z);
    _mat.compose(_a, quat, _one);
    this.crates.setMatrixAt(slot, _mat);
    this.crates.instanceMatrix.needsUpdate = true;
    this.physics.addBody({
      mesh: this.crates,
      instanceIndex: slot,
      mass: 8,
      shape: 'box',
      size: new THREE.Vector3(CRATE_SIZE / 2, CRATE_SIZE / 2, CRATE_SIZE / 2),
      restitution: 0.05,
      friction: 0.72,
      group: Groups.DEBRIS,
    });
  }

  /* ------------------------------ vantages ----------------------------- */

  private registerShots(): void {
    const at = (x: number, y: number, z: number): THREE.Vector3 =>
      new THREE.Vector3(x, y, z).add(ORIGIN);
    /**
     * Debug overlay state plus a fixed pose for the walker capsule. Posed shots
     * park it: the harness steps a variable number of frames before the capture,
     * and a patrolling capsule would be somewhere different in every run.
     */
    const shot =
      (on: boolean, x?: number, z?: number, leg = 0, fromY?: number) =>
      (): void => {
        this.physics.setDebugEnabled(on);
        if (x === undefined || z === undefined) {
          this.walkerFrozen = false;
          return;
        }
        this.poseWalker(x, z, leg, fromY);
        this.walkerFrozen = true;
      };

    registerVantages([
      {
        name: 'physcourse',
        position: at(24, 14, 31),
        lookAt: at(-4, 0.4, 3),
        fov: 55,
        hideViewmodel: true,
        note: 'Physics course overview: stairs, ramps, doorway, ledge, crate pile',
        setup: shot(false, -14.5, -7.2, 1),
      },
      {
        name: 'physstairs',
        position: at(-13.5, 4.6, 6),
        lookAt: at(-15, 1.1, -8),
        fov: 46,
        hideViewmodel: true,
        note: '0.15 / 0.30 / 0.60 m stair flights; only the first two are climbable',
        setup: shot(false, -14.5, -7.2, 1),
      },
      {
        name: 'physramps',
        // Low and off the steep end: near eye level the slopes read against the
        // platform behind them instead of flattening into four panels.
        position: at(6, 2.7, 6.5),
        lookAt: at(0.2, 1.25, -7),
        fov: 40,
        hideViewmodel: true,
        note: '20 / 35 / 50 / 65 degree ramps against the 50 degree walk limit',
        setup: shot(false, -1.5, -7.6, 2),
      },
      {
        name: 'physdoor',
        position: at(DOOR.gapCenter - 1.4, 1.85, 10.5),
        lookAt: at(DOOR.gapCenter, 1.15, 3.8),
        fov: 50,
        hideViewmodel: true,
        note: '1.1 m doorway with the 0.8 m capsule standing in it',
        // Ground probe starts under the lintel, or the capsule stands on it.
        setup: shot(false, DOOR.gapCenter, 4, 6, DOOR.lintel - 0.1),
      },
      {
        name: 'physpile',
        position: at(-6.5, 2.6, 23.5),
        lookAt: at(-1, 0.8, 17),
        fov: 45,
        hideViewmodel: true,
        note: 'Crate pile settled by the solver, with the penetration panels beyond it',
        setup: shot(false, 2.5, 18.5, 8),
      },
      {
        name: 'physledge',
        position: at(-12.4, 2.5, 25.5),
        lookAt: at(-19, 0.8, 20),
        fov: 50,
        hideViewmodel: true,
        note: '1.2 m ledge: too tall to step up, so the capsule is stopped by it',
        // Parked against the front face: 1.2 m is three times the step limit.
        setup: shot(false, -19, LEDGE.z1 + CAPSULE_RADIUS + 0.05, 9),
      },
      {
        name: 'physdebug',
        // Close on the capsule, where the wireframe and contact points are big
        // enough to read; a course-wide debug view is just blue noise.
        position: at(-11.9, 2.7, -3.2),
        lookAt: at(-14.5, 1.15, -7.2),
        fov: 55,
        hideViewmodel: true,
        note: 'Collider wireframes, contact points and the character capsule',
        setup: shot(true, -14.5, -7.2, 1),
      },
    ]);
  }

  /* ------------------------------- update ------------------------------ */

  update(dt: number): void {
    if (this.walkerFrozen || !this.walker) return;
    const step = Math.min(dt, 1 / 30);
    if (step <= 0) return;

    const target = PATROL[this.walkerTarget];
    _a.set(target[0], 0, target[1]).add(ORIGIN);
    _b.set(_a.x - this.walkerPos.x, 0, _a.z - this.walkerPos.z);
    const distance = _b.length();
    if (distance < 0.55) {
      this.walkerTarget = (this.walkerTarget + 1) % PATROL.length;
      this.walkerStuck = 0;
    } else {
      _b.multiplyScalar(2.8 / distance);
      this.walkerVel.x = _b.x;
      this.walkerVel.z = _b.z;
    }

    this.walkerVel.y += GRAVITY * step;
    this.physics.moveCharacterInto(
      this.walkerPos,
      this.walkerVel,
      CAPSULE_RADIUS,
      CAPSULE_HEIGHT,
      step,
      this.move,
    );
    const travelled = this.walkerPos.distanceTo(this.move.position);
    this.walkerPos.copy(this.move.position);
    this.walkerVel.copy(this.move.velocity);
    if (this.move.grounded && this.walkerVel.y < 0) this.walkerVel.y = 0;

    // Camera-style smoothing of the step-up lift, which is what the player
    // system should do with `stepUp` so stairs do not pop.
    this.walkerLift = Math.max(0, this.walkerLift + (this.move.stepUp ?? 0) - step * 3.5);

    this.walkerStuck = travelled < 0.004 * 2.8 ? this.walkerStuck + step : 0;
    if (this.walkerStuck > 3) {
      this.walkerTarget = (this.walkerTarget + 1) % PATROL.length;
      this.walkerStuck = 0;
    }
    if (this.walkerPos.y < ORIGIN.y - 6) {
      this.walkerPos.set(PATROL[0][0], 0.5, PATROL[0][1]).add(ORIGIN);
      this.walkerVel.set(0, 0, 0);
      this.walkerTarget = 1;
    }
    this.syncWalkerMesh();
  }

  /**
   * Drops the walker onto whatever it is standing over at a course-local spot
   * and points it at the next patrol leg. Vantage setups use this so a shot
   * always frames the capsule in the same place, however many frames the
   * harness happened to step before it.
   */
  private poseWalker(x: number, z: number, targetIndex: number, fromY = 12): void {
    const y = this.physics.groundHeight(x + ORIGIN.x, z + ORIGIN.z, ORIGIN.y + fromY);
    this.walkerPos.set(x + ORIGIN.x, y ?? ORIGIN.y, z + ORIGIN.z);
    this.walkerVel.set(0, 0, 0);
    this.walkerLift = 0;
    this.walkerStuck = 0;
    this.walkerTarget = targetIndex % PATROL.length;
    // One standstill step, so the controller's own state — and the capsule the
    // debug view draws out of it — agrees with where the mesh now is.
    this.physics.moveCharacterInto(
      this.walkerPos,
      this.walkerVel,
      CAPSULE_RADIUS,
      CAPSULE_HEIGHT,
      1 / 60,
      this.move,
    );
    this.walkerPos.copy(this.move.position);
    this.walkerVel.copy(this.move.velocity);
    this.syncWalkerMesh();
  }

  private syncWalkerMesh(): void {
    if (!this.walker) return;
    this.walker.position.set(
      this.walkerPos.x - ORIGIN.x,
      this.walkerPos.y - ORIGIN.y + CAPSULE_HEIGHT / 2 - this.walkerLift,
      this.walkerPos.z - ORIGIN.z,
    );
  }

  dispose(): void {
    if (typeof window !== 'undefined' && window.__PHYS__?.version) delete window.__PHYS__;
    this.physics.clearBodies();
    this.physics.removeStatic(this.staticRoot);
    this.staticRoot.removeFromParent();
    this.propRoot.removeFromParent();
    for (const light of this.lights) light.removeFromParent();
    for (const geo of this.geometries) geo.dispose();
    for (const mat of this.materials) mat.dispose();
    this.crates?.dispose();
    this.debris?.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
    this.lights.length = 0;
  }

  /* -------------------------------- hooks ------------------------------ */

  /** World-space layout, so assertions never hard-code a coordinate. */
  private describe() {
    const w = (x: number, y: number, z: number): V3 => [
      x + ORIGIN.x,
      y + ORIGIN.y,
      z + ORIGIN.z,
    ];
    return {
      origin: [ORIGIN.x, ORIGIN.y, ORIGIN.z] as V3,
      capsule: { radius: CAPSULE_RADIUS, height: CAPSULE_HEIGHT, stepHeight: 0.4 },
      /** Walk limit the controller is configured with, in degrees. */
      maxSlopeDeg: 50,
      deckTop: DECK.top + ORIGIN.y,
      upperTop: UPPER + ORIGIN.y,
      drop: { start: w(-2, 3.2, 8), restY: DECK.top + ORIGIN.y },
      stairs: STAIRS.map((s) => ({
        name: s.name,
        riser: s.riser,
        steps: s.steps,
        run: s.run,
        topY: s.topY + ORIGIN.y,
        start: w(s.x, 0.05, STAIR_FRONT + 1.6),
        dir: [0, -1] as [number, number],
      })),
      ramps: RAMPS.map((r) => ({
        name: r.name,
        deg: r.deg,
        rise: r.rise,
        run: r.run,
        length: r.length,
        topY: UPPER + ORIGIN.y,
        start: w(r.x, 0.05, r.baseZ + 1.2),
        /** Point just above the middle of the slope, for the slope readout. */
        mid: w(r.x, r.rise / 2 + 0.06, r.topZ + r.run / 2),
        dir: [0, -1] as [number, number],
      })),
      door: {
        gapWidth: DOOR.gapWidth,
        lintel: DOOR.lintel,
        z: DOOR.z + ORIGIN.z,
        approach: w(DOOR.gapCenter, 0.05, DOOR.z + 3.4),
        inside: w(DOOR.gapCenter, 0.05, DOOR.z),
        beyond: DOOR.z - 1.6 + ORIGIN.z,
        dir: [0, -1] as [number, number],
      },
      ledge: {
        top: LEDGE.top + ORIGIN.y,
        edgeZ: LEDGE.z1 + ORIGIN.z,
        walkOff: w((LEDGE.x0 + LEDGE.x1) / 2, LEDGE.top + 0.05, LEDGE.z1 - 2),
        approach: w((LEDGE.x0 + LEDGE.x1) / 2, 0.05, LEDGE.z1 + 2.4),
      },
      slideWall: {
        faceZ: SLIDE_WALL.z - SLIDE_WALL.thickness / 2 + ORIGIN.z,
        backZ: SLIDE_WALL.z + SLIDE_WALL.thickness / 2 + ORIGIN.z,
        start: w(-6, 0.05, SLIDE_WALL.z - 4),
        dir: [0.7071, 0.7071] as [number, number],
      },
      rayTarget: {
        center: w(TARGET.x, TARGET.y, TARGET.z),
        half: TARGET.half,
        surface: 'metal' as SurfaceKind,
        origin: w(TARGET.x, TARGET.y, TARGET.z + 10),
        dir: [0, 0, -1] as V3,
        distance: 10 - TARGET.half,
        normal: [0, 0, 1] as V3,
        exitDistance: 10 + TARGET.half,
      },
      panels: {
        origin: w(PANEL.x, PANEL.height / 2, PANELS[0].z + 4),
        dir: [0, 0, -1] as V3,
        expect: PANELS.map((p) => ({
          surface: p.surface,
          penetration: p.penetration,
          front: 4 + PANELS[0].z - p.z - PANEL.thickness / 2,
          back: 4 + PANELS[0].z - p.z + PANEL.thickness / 2,
        })),
      },
      pile: {
        center: w((PILE.x0 + PILE.x1) / 2, 0, (PILE.z0 + PILE.z1) / 2),
        floorY: DECK.top + ORIGIN.y,
        boxSize: DEBRIS_SIZE,
      },
    };
  }

  private install(): void {
    if (typeof window === 'undefined') return;
    const hooks: PhysHooks = {
      version: 1,
      layout: this.describe(),
      stats: () => this.physics.stats(),
      ray: (o, d, max, mask) => this.castRay(o, d, max, mask, false),
      rayBrute: (o, d, max, mask) => this.castRay(o, d, max, mask, true),
      rayAll: (o, d, max, mask) => {
        _a.set(o[0], o[1], o[2]);
        _b.set(d[0], d[1], d[2]);
        return this.physics
          .raycastAll(_a, _b, max, mask)
          .map((hit) => toRayResult(hit));
      },
      bvhAgrees: (samples) => this.bvhAgrees(samples),
      los: (from, to) => {
        _a.set(from[0], from[1], from[2]);
        _b.set(to[0], to[1], to[2]);
        return this.physics.lineOfSight(_a, _b);
      },
      sphere: (o, d, radius, max) => {
        _a.set(o[0], o[1], o[2]);
        _b.set(d[0], d[1], d[2]);
        const hit = this.physics.sphereCast(_a, _b, radius, max);
        return hit ? toRayResult(hit) : null;
      },
      capsule: (o, d, radius, height, max) => {
        _a.set(o[0], o[1], o[2]);
        _b.set(d[0], d[1], d[2]);
        const hit = this.physics.capsuleCast(_a, _b, radius, height, max);
        return hit ? toRayResult(hit) : null;
      },
      groundHeight: (x, z, fromY) => this.physics.groundHeight(x, z, fromY),
      overlap: (center, radius, mask) => {
        _a.set(center[0], center[1], center[2]);
        return this.physics.overlapSphere(_a, radius, mask).map((o) => o.name || o.type);
      },
      walk: (opts) => this.walkTest(opts),
      dropBoxes: (opts) => this.dropBoxes(opts ?? {}),
      clearBodies: () => {
        this.physics.clearBodies();
        this.debrisCursor = 0;
        if (this.debris) this.hideAllInstances(this.debris);
        if (this.crates) this.hideAllInstances(this.crates);
      },
      stepBodies: (seconds, dt = 1 / 60) => {
        const steps = Math.max(1, Math.min(4000, Math.round(seconds / dt)));
        for (let i = 0; i < steps; i++) this.physics.stepBodies(dt);
        return steps;
      },
      bodyStats: () => this.bodyStats(),
      explode: (center, radius, force) => {
        _a.set(center[0], center[1], center[2]);
        this.physics.applyExplosionForce(_a, radius, force);
      },
      benchRays: (count) => this.benchRays(count),
      benchBodies: (count, seconds) => this.benchBodies(count, seconds),
      setDebug: (on) => this.physics.setDebugEnabled(on),
      freezeWalker: (frozen) => {
        this.walkerFrozen = frozen;
      },
    };
    window.__PHYS__ = hooks;
  }

  private castRay(
    o: V3,
    d: V3,
    max: number,
    mask: number | undefined,
    brute: boolean,
  ): RayResult | null {
    _a.set(o[0], o[1], o[2]);
    _b.set(d[0], d[1], d[2]);
    const ok = brute
      ? this.physics.raycastBruteInto(_a, _b, max, _hit, mask)
      : this.physics.raycastInto(_a, _b, max, _hit, mask);
    return ok ? toRayResult(_hit) : null;
  }

  /**
   * Fires a deterministic spread of rays through the course and compares the
   * BVH answer with a linear scan over every triangle.
   */
  private bvhAgrees(samples: number): { tested: number; mismatches: number; worstDelta: number } {
    const n = clamp(Math.round(samples), 1, 4000);
    const rng = new Rng(0x51de77);
    const brute = _bruteHit;
    let mismatches = 0;
    let worstDelta = 0;
    for (let i = 0; i < n; i++) {
      _a.set(rng.range(-30, 30), rng.range(0.2, 12), rng.range(-20, 32)).add(ORIGIN);
      rng.onSphere(_b);
      const a = this.physics.raycastInto(_a, _b, 120, _hit);
      const b = this.physics.raycastBruteInto(_a, _b, 120, brute);
      if (a !== b) {
        mismatches++;
        continue;
      }
      if (!a) continue;
      const delta = Math.abs(_hit.distance - brute.distance);
      if (delta > worstDelta) worstDelta = delta;
      if (delta > 1e-3) mismatches++;
    }
    return { tested: n, mismatches, worstDelta };
  }

  /**
   * Runs the character controller for a fixed number of steps, exactly the way
   * a player controller would: desired horizontal velocity, gravity, move,
   * then zero the downward velocity once grounded.
   */
  private walkTest(opts: WalkOptions): WalkResult {
    const dt = opts.dt ?? 1 / 60;
    const steps = clamp(Math.round(opts.steps ?? 120), 1, 6000);
    const radius = opts.radius ?? CAPSULE_RADIUS;
    const height = opts.height ?? CAPSULE_HEIGHT;
    const stepHeight = opts.stepHeight ?? 0.4;
    const speed = opts.speed ?? 3.2;
    const gravity = opts.gravity !== false;
    const tail = clamp(Math.round(opts.tail ?? 30), 1, steps);
    const sample = opts.path ? Math.max(1, Math.floor(steps / 64)) : 0;
    const budget = opts.maxTravel ?? Infinity;

    _pos.set(opts.start[0], opts.start[1], opts.start[2]);
    _vel.set(0, opts.jump ?? 0, 0);
    let dirX = 0;
    let dirZ = 0;
    if (opts.dir) {
      const len = Math.hypot(opts.dir[0], opts.dir[1]);
      if (len > 1e-6) {
        dirX = opts.dir[0] / len;
        dirZ = opts.dir[1] / len;
      }
    }

    const startX = _pos.x;
    const startZ = _pos.z;
    const startY = _pos.y;
    let minY = _pos.y;
    let maxY = _pos.y;
    let grounded = 0;
    let walls = 0;
    let ceilings = 0;
    let maxStepUp = 0;
    let tailMinY = Infinity;
    let tailMaxY = -Infinity;
    let tailSpeed = 0;
    const path: V3[] = [];

    let travelled = 0;
    for (let i = 0; i < steps; i++) {
      const drive = travelled < budget ? speed : 0;
      _vel.x = dirX * drive;
      _vel.z = dirZ * drive;
      if (gravity) _vel.y += GRAVITY * dt;

      this.physics.moveCharacterInto(_pos, _vel, radius, height, dt, this.move, stepHeight);
      _pos.copy(this.move.position);
      _vel.copy(this.move.velocity);
      if (this.move.grounded && _vel.y < 0) _vel.y = 0;

      if (this.move.grounded) grounded++;
      if (this.move.hitWall) walls++;
      if (this.move.hitCeiling) ceilings++;
      if ((this.move.stepUp ?? 0) > maxStepUp) maxStepUp = this.move.stepUp ?? 0;
      travelled = Math.hypot(_pos.x - startX, _pos.z - startZ);
      if (_pos.y < minY) minY = _pos.y;
      if (_pos.y > maxY) maxY = _pos.y;
      if (i >= steps - tail) {
        if (_pos.y < tailMinY) tailMinY = _pos.y;
        if (_pos.y > tailMaxY) tailMaxY = _pos.y;
        const s = _vel.length();
        if (s > tailSpeed) tailSpeed = s;
      }
      if (sample > 0 && i % sample === 0) path.push([_pos.x, _pos.y, _pos.z]);
    }

    const result: WalkResult = {
      position: [_pos.x, _pos.y, _pos.z],
      velocity: [_vel.x, _vel.y, _vel.z],
      grounded: this.move.grounded,
      slope: this.move.slope,
      slopeDeg: this.move.slope / DEG,
      groundNormal: [
        this.move.groundNormal.x,
        this.move.groundNormal.y,
        this.move.groundNormal.z,
      ],
      groundSurface: this.move.groundSurface,
      hitWall: this.move.hitWall,
      hitCeiling: this.move.hitCeiling,
      frames: steps,
      groundedFrames: grounded,
      wallFrames: walls,
      ceilingFrames: ceilings,
      minY,
      maxY,
      gainY: _pos.y - startY,
      travel: travelled,
      maxStepUp,
      tailYSpread: tailMaxY - tailMinY,
      tailSpeed,
    };
    if (sample > 0) result.path = path;
    return result;
  }

  private dropBoxes(opts: { count?: number; clear?: boolean; spin?: boolean }): number {
    const count = clamp(Math.round(opts.count ?? 200), 1, DEBRIS_SLOTS);
    if (opts.clear !== false) {
      this.physics.clearBodies();
      this.debrisCursor = 0;
      if (this.debris) this.hideAllInstances(this.debris);
      if (this.crates) this.hideAllInstances(this.crates);
    }
    this.physics.setBodyCap(Math.max(count + 64, 320));
    if (!this.debris) return 0;

    const rng = new Rng(0x0b0c1e);
    const half = DEBRIS_SIZE / 2;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const slot = this.debrisCursor++ % DEBRIS_SLOTS;
      // A loose column above the pile zone: they collide on the way down and
      // have to settle into a heap rather than a grid.
      const x = rng.range(PILE.x0 + 1, PILE.x1 - 1);
      const z = rng.range(PILE.z0 + 1, PILE.z1 - 1);
      const y = 1 + (i / count) * 7 + rng.range(0, 0.3);
      _euler.set(rng.range(-Math.PI, Math.PI), rng.range(-Math.PI, Math.PI), rng.range(-Math.PI, Math.PI));
      _quat.setFromEuler(_euler);
      // Instance matrices are local to the pool mesh, which hangs off the
      // course root; the solver lifts them into world space itself.
      _a.set(x, y, z);
      _mat.compose(_a, _quat, _one);
      this.debris.setMatrixAt(slot, _mat);
      this.physics.addBody({
        mesh: this.debris,
        instanceIndex: slot,
        mass: 1.4,
        shape: 'box',
        size: new THREE.Vector3(half, half, half),
        restitution: 0.04,
        friction: 0.8,
        group: Groups.DEBRIS,
        angularVelocity: opts.spin
          ? new THREE.Vector3(rng.range(-4, 4), rng.range(-4, 4), rng.range(-4, 4))
          : undefined,
      });
      spawned++;
    }
    this.debris.instanceMatrix.needsUpdate = true;
    return spawned;
  }

  private bodyStats(): BodyStats {
    let count = 0;
    let awake = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    let maxSpeed = 0;
    let belowFloor = 0;
    const floor = DECK.top + ORIGIN.y;
    this.physics.forEachBody((body) => {
      count++;
      if (!body.sleeping) awake++;
      if (body.position.y < minY) minY = body.position.y;
      if (body.position.y > maxY) maxY = body.position.y;
      const speed = body.velocity.length();
      if (speed > maxSpeed) maxSpeed = speed;
      if (body.position.y < floor - 0.2) belowFloor++;
    });
    return {
      count,
      awake,
      asleep: count - awake,
      minY: count > 0 ? minY : 0,
      maxY: count > 0 ? maxY : 0,
      maxSpeed,
      belowFloor,
    };
  }

  private benchRays(count: number): {
    count: number;
    ms: number;
    raysPerMs: number;
    hits: number;
  } {
    const n = clamp(Math.round(count), 1, 200_000);
    if (!this.benchOrigins || this.benchOrigins.length < n * 3) {
      const rng = new Rng(0xbe4c77);
      const origins = new Float32Array(n * 3);
      const dirs = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        // Muzzle-height rays crossing the course, the way bullets and
        // line-of-sight tests actually travel.
        origins[i * 3] = ORIGIN.x + rng.range(-28, 28);
        origins[i * 3 + 1] = ORIGIN.y + rng.range(0.4, 9);
        origins[i * 3 + 2] = ORIGIN.z + rng.range(-15, 27);
        rng.onSphere(_b);
        _b.y = _b.y * 0.5 - 0.25;
        _b.normalize();
        dirs[i * 3] = _b.x;
        dirs[i * 3 + 1] = _b.y;
        dirs[i * 3 + 2] = _b.z;
      }
      this.benchOrigins = origins;
      this.benchDirs = dirs;
    }
    const origins = this.benchOrigins;
    const dirs = this.benchDirs as Float32Array;

    let hits = 0;
    let ms = Infinity;
    // Best of three: this runs on whatever core the harness is given, and a
    // scheduler hiccup mid-pass would otherwise be reported as the cost of the
    // tree rather than the cost of being descheduled.
    for (let pass = 0; pass < 3; pass++) {
      hits = 0;
      const t0 = performance.now();
      for (let i = 0; i < n; i++) {
        _a.set(origins[i * 3], origins[i * 3 + 1], origins[i * 3 + 2]);
        _b.set(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]);
        if (this.physics.raycastInto(_a, _b, 120, _hit)) hits++;
      }
      const elapsed = performance.now() - t0;
      if (elapsed < ms) ms = elapsed;
    }
    return { count: n, ms, raysPerMs: n / Math.max(ms, 1e-6), hits };
  }

  private benchBodies(
    count: number,
    seconds: number,
  ): { bodies: number; steps: number; ms: number; msPerStep: number; asleep: number } {
    const spawned = this.dropBoxes({ count, clear: true, spin: true });
    const dt = 1 / 60;
    const steps = clamp(Math.round(seconds / dt), 1, 2000);
    const t0 = performance.now();
    for (let i = 0; i < steps; i++) this.physics.stepBodies(dt);
    const ms = performance.now() - t0;
    return { bodies: spawned, steps, ms, msPerStep: ms / steps, asleep: this.bodyStats().asleep };
  }
}

function makeHitRecord(): RaycastHit {
  return {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    distance: 0,
    object: new THREE.Object3D(),
    surface: 'concrete',
    entityId: undefined,
    damageScale: 1,
    penetration: 0.25,
  };
}

function toRayResult(hit: RaycastHit): RayResult {
  return {
    distance: hit.distance,
    point: [hit.point.x, hit.point.y, hit.point.z],
    normal: [hit.normal.x, hit.normal.y, hit.normal.z],
    surface: hit.surface,
    object: hit.object?.name ?? '',
    penetration: hit.penetration ?? 0,
    damageScale: hit.damageScale ?? 1,
    entityId: hit.entityId ?? null,
  };
}
