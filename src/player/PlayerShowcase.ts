import * as THREE from 'three';
import { Groups, setHitMeta, type GameContext, type HitMeta } from '../core/GameContext';
import type { SurfaceKind } from '../core/Events';
import type { IMaterialLibrary, IPhysics, MaterialName } from '../core/Interfaces';
import { Rng, clamp, saturate } from '../core/MathUtils';
import { registerVantages } from '../core/Vantage';
import { T } from './Tuning';
import type PlayerSystem from './PlayerSystem';
import type { Intent } from './PlayerSystem';

/**
 * Player test course, active on `?showcase=player`.
 *
 * Every feature exists so one claim about the controller can be measured rather
 * than eyeballed: long clear lanes for the speed and acceleration curves, a bank
 * of ledges that straddles both ends of the mantle window, a thin rail with a
 * drop behind it that must vault rather than mantle, a ramp so a downhill slide
 * can be compared against a flat one, a ledge to walk off for coyote time, a
 * low ceiling that must refuse a stand, and a wall close enough to clamp a lean.
 *
 * The course is authored in local metres and parked far from the playable level.
 * Its layout is published on `window.__PLAYER_TEST__` in world coordinates
 * alongside the whole tuning block and hooks that step the controller frame by
 * frame, which is what `tools/player-test.mjs` asserts against. No expectation
 * in that script is written twice: it reads the tuning it is checking, so the
 * spec and the code cannot drift apart silently.
 */

/* --------------------------------- layout ------------------------------- */

/** Course origin, far from any plausible level bounds. */
const ORIGIN = new THREE.Vector3(0, 0, -600);

const DECK = { x0: -32, x1: 32, z0: -40, z1: 40, top: 0, thickness: 1.2 };

/** Clear north-south lanes, one per measurement that needs a long run. */
const LANE = { speed: -26, slide: -20, downhill: -14, camera: -6 };

/** How far the metal footstep lane stands above the deck it sits on. */
const METAL_LANE_LIP = 0.012;

/** Plateau and ramp for the downhill slide, so it can be compared to the flat. */
const RAMP = { x: LANE.downhill, width: 4, topY: 2.4, zTop: 26, zBottom: 6, thickness: 0.4 };
const PLATEAU = { x0: -17, x1: -11, z0: 26, z1: 38, top: RAMP.topY, thickness: 0.4 };

/** Wall placed so the lean wall check clamps but the capsule still fits. */
const LEAN = { x: 0, z: 10, gap: 0.5, thickness: 0.4, height: 2.6, z0: 4, z1: 16 };

/** Slab low enough that a crouched player cannot stand up under it. */
const CEILING = { x: 7, z: 10, y0: 1.25, y1: 1.75, x0: 4, x1: 10, z0: 5, z1: 15 };

/** Platform to walk off, for coyote time and for landing impact. */
const LEDGE = { x0: 10, x1: 20, z0: 2, z1: 16, top: 1.6 };

/** Shallow flight, well inside the step-up limit, for step smoothing. */
const STAIRS = { x: 26, width: 3, riser: 0.16, run: 0.34, steps: 14, frontZ: 34 };

/**
 * Near face of every mantle block, and how deep and wide they are. Deep enough
 * that a run-up which keeps its stick down after the climb still has plenty of
 * top left, so a test measuring the landing height cannot accidentally be
 * measuring the far edge.
 */
const BANK = { faceZ: -20, depth: 14, width: 4 };

interface BlockSpec {
  name: string;
  x: number;
  height: number;
  /** What the controller should decide, for the readout. */
  expect: 'step' | 'mantle' | 'refuse';
}

const BLOCKS: BlockSpec[] = [
  // Under the mantle window: the physics step-up owns this one.
  { name: 'step', x: -4, height: 0.35, expect: 'step' },
  { name: 'low', x: 2, height: 0.7, expect: 'mantle' },
  { name: 'mid', x: 8, height: 1.2, expect: 'mantle' },
  { name: 'high', x: 14, height: 1.55, expect: 'mantle' },
  { name: 'over', x: 20, height: 1.8, expect: 'refuse' },
  { name: 'wall', x: 26, height: 2.2, expect: 'refuse' },
];

/** Waist-high rail with clear deck behind it: a vault, not a climb. */
const RAIL = { x: -10, z: BANK.faceZ, height: 0.9, thickness: 0.3, width: 4 };

/** Height the fall-damage probe drops from, well past the lethal speed. */
const DROP_HEIGHT = 42;

const CONCRETE: HitMeta = { surface: 'concrete', group: Groups.WORLD, penetration: 0.5 };

/* --------------------------------- hooks -------------------------------- */

type V3 = [number, number, number];

/** One segment of a scripted run. Every field is optional and sticky-free. */
interface Phase {
  frames?: number;
  dt?: number;
  /** Body-relative stick: x is strafe, y is forward. */
  move?: [number, number];
  /** Radians of look applied per frame. */
  look?: [number, number];
  sprint?: boolean;
  crouch?: boolean;
  jump?: boolean;
  ads?: boolean;
  fire?: boolean;
  /** -1 leans left, +1 leans right. */
  lean?: number;
  /** Requests the prone toggle once, on the first frame of the phase. */
  prone?: boolean;
  /** Stops the phase early once this becomes true. */
  until?:
    | 'grounded'
    | 'airborne'
    | 'mantling'
    | 'notMantling'
    | 'sliding'
    | 'notSliding'
    | 'stopped'
    | 'landed';
}

interface PhaseResult {
  frames: number;
  seconds: number;
  startSpeed: number;
  endSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  /** Horizontal distance covered during the phase. */
  travel: number;
  gainY: number;
  /** Highest point reached above where the phase started. */
  apex: number;
  /** Seconds until the speed first reached 90% of this phase's peak. */
  timeTo90: number;
  stances: number[];
  events: Record<string, number>;
  /** Frames the controller spent grounded. */
  groundedFrames: number;
  endSnapshot: Record<string, number>;
}

interface RunResult {
  frames: number;
  seconds: number;
  phases: PhaseResult[];
  end: Record<string, number>;
  camera: CameraSnapshot;
  events: Record<string, number>;
  travel: number;
  maxSpeed: number;
  maxY: number;
  minY: number;
  /** Peak absolute camera pitch and roll seen at any point, in radians. */
  maxPitch: number;
  maxRoll: number;
  /**
   * Peak-to-peak travel of the camera above the feet. On flat ground this is
   * exactly the vertical excursion of the view bob and the landing dip, which
   * is the number that decides whether the camera is nauseating.
   */
  camHeightSpan: number;
  /** Deepest landing dip, in metres (negative). */
  minLandDip: number;
  maxBobAmp: number;
  maxRecoilPitch: number;
  minFov: number;
  maxFov: number;
  /** Frames on which any part of the camera transform was not finite. */
  nonFinite: number;
  /** Frames on which the rig caught and scrubbed a NaN. */
  sanitised: number;
  columns?: string[];
  trace?: number[][];
}

interface CameraSnapshot {
  position: V3;
  forward: V3;
  /** Aim angles recovered from the composed quaternion, in radians. */
  pitch: number;
  yaw: number;
  roll: number;
  fov: number;
  /** Elevation of the view direction; the geometric form of the pitch limit. */
  elevation: number;
  finite: boolean;
}

interface MantleProbe {
  ok: boolean;
  reason: string;
  vault: boolean;
  rise: number;
  duration: number;
  end: V3;
  peakY: number;
}

interface FuzzResult {
  frames: number;
  seconds: number;
  nonFiniteFrames: number;
  /** First field that went non-finite, for a usable failure message. */
  firstBad: string;
  sanitisedFrames: number;
  maxElevation: number;
  maxRoll: number;
  maxSpeed: number;
  minFov: number;
  maxFov: number;
  deaths: number;
  respawns: number;
  positionRecoveries: number;
  endFinite: boolean;
  /** Frames the controller was still producing a usable transform at the end. */
  settledRoll: number;
  settledElevation: number;
}

interface ScanResult {
  dt: number;
  /** Frames between the jump press and the moment it could have fired. */
  lead: number[];
  fired: boolean[];
}

interface AllocResult {
  frames: number;
  supported: boolean;
  bytesPerFrame: number;
  before: number;
  after: number;
}

interface PlayerHooks {
  version: number;
  layout: ReturnType<PlayerShowcase['describe']>;
  /** The live tuning block, so the test derives its expectations from it. */
  tuning: typeof T;
  spots(): string[];
  reset(spot?: string, heading?: number): Record<string, number>;
  teleport(position: V3, heading?: number): Record<string, number>;
  run(plan: Phase[], opts?: { trace?: boolean }): RunResult;
  snapshot(): Record<string, number>;
  camera(): CameraSnapshot;
  probeMantle(): MantleProbe;
  coyoteScan(maxDelay: number): ScanResult;
  jumpBufferScan(): ScanResult;
  fuzz(frames: number, seed: number): FuzzResult;
  alloc(frames: number): AllocResult;
  hurt(amount: number, from?: V3): Record<string, number>;
  heal(amount: number): Record<string, number>;
  kick(pitch: number, yaw: number): void;
  shake(amplitude: number, duration: number, frequency?: number, at?: V3, radius?: number): void;
  requestFov(fov: number, duration: number): void;
  holdBreath(hold: boolean): boolean;
  setAdsTime(seconds: number): void;
  events(): Record<string, number>;
  /** Hands the scripted intent back so a screenshot can be posed mid-move. */
  hold(phase: Phase): void;
  release(): void;
}

declare global {
  interface Window {
    __PLAYER_TEST__?: PlayerHooks;
  }
}

/* -------------------------------- scratch ------------------------------- */

const _v = new THREE.Vector3();
const _from = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _snap: Record<string, number> = {};

const TRACE_COLUMNS = [
  'phase',
  't',
  'x',
  'y',
  'z',
  'speed',
  'vy',
  'stance',
  'grounded',
  'camX',
  'camY',
  'camZ',
  'pitch',
  'roll',
  'fov',
  'bobPhase',
  'bobAmp',
];

/** Every player event the showcase counts, so traces can assert on cadence. */
const TRACKED = [
  'player:spawn',
  'player:damage',
  'player:death',
  'player:heal',
  'player:footstep',
  'player:land',
  'player:sprint',
  'player:slide',
  'player:mantle',
  'player:jump',
  'player:vault',
  'player:stance',
  'player:breath',
] as const;

const FALLBACK_COLOR: Partial<Record<MaterialName, number>> = {
  concrete: 0x8a8579,
  concrete_painted: 0x9a9c94,
  concrete_damaged: 0x777063,
  gravel: 0x6d6455,
  brick: 0x7d4a38,
  metal_painted: 0x4a5560,
  steel_plate: 0x6d7278,
  wood_planks: 0x8a6338,
};

export class PlayerShowcase {
  private readonly root = new THREE.Group();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly lights: THREE.Object3D[] = [];
  private readonly matLib: IMaterialLibrary | null;
  private readonly physics: IPhysics | null;

  private readonly counts = new Map<string, number>();
  private readonly unsubscribe: Array<() => void> = [];
  /** Latest landing impact in m/s, so the test can check the dip scales with it. */
  private lastLandSpeed = 0;
  private lastFootstepSurface: SurfaceKind = 'concrete';

  private scripted: Intent | null = null;
  private held = false;

  constructor(
    private readonly ctx: GameContext,
    private readonly player: PlayerSystem,
  ) {
    this.matLib = ctx.tryGet<IMaterialLibrary>('materials') ?? null;
    this.physics = ctx.tryGet<IPhysics>('physics') ?? null;

    this.root.name = 'player-course';
    this.root.position.copy(ORIGIN);
    setHitMeta(this.root, CONCRETE);

    this.buildApron();
    this.buildDeck();
    this.buildRamp();
    this.buildLeanWall();
    this.buildCeiling();
    this.buildLedge();
    this.buildStairs();
    this.buildBank();

    ctx.scene.add(this.root);
    this.physics?.addStatic(this.root);

    this.buildLights();
    this.trackEvents();
    this.registerShots();
    this.install();

    // Drop the player onto the course rather than wherever the level spawned it;
    // a showcase that needs the console to become useful is not a showcase.
    this.reset('runway');
    console.log('[player] showcase ready — window.__PLAYER_TEST__');
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

  /** Box whose UVs are rescaled to a constant world texel density. */
  private boxGeometry(w: number, h: number, d: number, tile = 2): THREE.BoxGeometry {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
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
    meta: HitMeta = CONCRETE,
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
    setHitMeta(mesh, meta);
    this.root.add(mesh);
    return mesh;
  }

  /** Gravel skirt, so the course does not read as a slab floating in the void. */
  private buildApron(): void {
    const geo = new THREE.PlaneGeometry(190, 190, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 60, uv.getY(i) * 60);
    this.geometries.push(geo);
    const mesh = new THREE.Mesh(geo, this.material('gravel'));
    mesh.name = 'player-apron';
    mesh.position.y = -DECK.thickness;
    mesh.receiveShadow = true;
    setHitMeta(mesh, { surface: 'dirt', group: Groups.WORLD, penetration: 1 });
    this.root.add(mesh);
  }

  private buildDeck(): void {
    this.slab(
      'player-deck',
      [DECK.x1 - DECK.x0, DECK.thickness, DECK.z1 - DECK.z0],
      [
        (DECK.x0 + DECK.x1) / 2,
        DECK.top - DECK.thickness / 2,
        (DECK.z0 + DECK.z1) / 2,
      ],
      'concrete',
      CONCRETE,
      0,
      3,
    );

    // A metal strip along one lane, so the footstep surface can be asserted to
    // come from `CharacterMoveResult.groundSurface` rather than a default. It
    // stands a few millimetres proud of the deck on purpose: flush with it, the
    // two surfaces are coplanar and which one is "under foot" is a coin toss.
    this.slab(
      'player-metal-lane',
      [3, 0.08, 24],
      [LANE.camera, DECK.top + METAL_LANE_LIP - 0.04, 18],
      'steel_plate',
      { surface: 'metal', group: Groups.WORLD, penetration: 0.2 },
      0,
      1.5,
    );
  }

  private buildRamp(): void {
    // Rotating +x by the slope angle tilts local +z down, so the slab descends
    // toward +z. Solve the centre from the known top corner so ramp and plateau
    // meet exactly.
    const run = RAMP.zBottom - RAMP.zTop;
    const angle = Math.atan2(RAMP.topY, Math.abs(run));
    const length = Math.hypot(RAMP.topY, run);
    const h = length / 2;
    const t = RAMP.thickness / 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    this.slab(
      'player-ramp',
      [RAMP.width, RAMP.thickness, length],
      [RAMP.x, RAMP.topY - h * sin - t * cos, RAMP.zTop - h * cos + t * sin],
      'concrete_painted',
      CONCRETE,
      -angle,
      2,
    );

    this.slab(
      'player-plateau',
      [PLATEAU.x1 - PLATEAU.x0, PLATEAU.thickness, PLATEAU.z1 - PLATEAU.z0],
      [
        (PLATEAU.x0 + PLATEAU.x1) / 2,
        PLATEAU.top - PLATEAU.thickness / 2,
        (PLATEAU.z0 + PLATEAU.z1) / 2,
      ],
      'concrete_painted',
      CONCRETE,
      0,
      2.5,
    );
    for (const px of [PLATEAU.x0 + 0.5, PLATEAU.x1 - 0.5]) {
      for (const pz of [PLATEAU.z0 + 0.6, PLATEAU.z1 - 0.6]) {
        this.slab(
          'player-plateau-pillar',
          [0.5, PLATEAU.top - PLATEAU.thickness, 0.5],
          [px, (PLATEAU.top - PLATEAU.thickness) / 2, pz],
          'concrete_damaged',
        );
      }
    }
  }

  private buildLeanWall(): void {
    this.slab(
      'player-lean-wall',
      [LEAN.thickness, LEAN.height, LEAN.z1 - LEAN.z0],
      [
        LEAN.x + LEAN.gap + LEAN.thickness / 2,
        LEAN.height / 2,
        (LEAN.z0 + LEAN.z1) / 2,
      ],
      'brick',
      { surface: 'concrete', group: Groups.WORLD, penetration: 0.35 },
      0,
      1.5,
    );
  }

  private buildCeiling(): void {
    this.slab(
      'player-low-ceiling',
      [CEILING.x1 - CEILING.x0, CEILING.y1 - CEILING.y0, CEILING.z1 - CEILING.z0],
      [
        (CEILING.x0 + CEILING.x1) / 2,
        (CEILING.y0 + CEILING.y1) / 2,
        (CEILING.z0 + CEILING.z1) / 2,
      ],
      'concrete_damaged',
      CONCRETE,
      0,
      2,
    );
    // Legs at the corners, outside the crawl space.
    for (const px of [CEILING.x0 + 0.3, CEILING.x1 - 0.3]) {
      for (const pz of [CEILING.z0 + 0.3, CEILING.z1 - 0.3]) {
        this.slab(
          'player-ceiling-leg',
          [0.4, CEILING.y0, 0.4],
          [px, CEILING.y0 / 2, pz],
          'metal_painted',
          { surface: 'metal', group: Groups.WORLD, penetration: 0.2 },
          0,
          1,
        );
      }
    }
  }

  private buildLedge(): void {
    this.slab(
      'player-ledge',
      [LEDGE.x1 - LEDGE.x0, LEDGE.top, LEDGE.z1 - LEDGE.z0],
      [
        (LEDGE.x0 + LEDGE.x1) / 2,
        LEDGE.top / 2,
        (LEDGE.z0 + LEDGE.z1) / 2,
      ],
      'concrete_damaged',
      CONCRETE,
      0,
      2.5,
    );
  }

  private buildStairs(): void {
    for (let i = 0; i < STAIRS.steps; i++) {
      const top = STAIRS.riser * (i + 1);
      const z1 = STAIRS.frontZ - STAIRS.run * i;
      this.slab(
        `player-stair-${i}`,
        [STAIRS.width, top, STAIRS.run],
        [STAIRS.x, top / 2, z1 - STAIRS.run / 2],
        i % 2 === 0 ? 'concrete' : 'concrete_painted',
        CONCRETE,
        0,
        1.5,
      );
    }
    // Landing at the top, deep enough to settle on.
    this.slab(
      'player-stair-landing',
      [STAIRS.width, STAIRS.riser * STAIRS.steps, 4],
      [
        STAIRS.x,
        (STAIRS.riser * STAIRS.steps) / 2,
        STAIRS.frontZ - STAIRS.run * STAIRS.steps - 2,
      ],
      'concrete',
      CONCRETE,
      0,
      2,
    );
  }

  private buildBank(): void {
    for (const block of BLOCKS) {
      this.slab(
        `player-ledge-${block.name}`,
        [BANK.width, block.height, BANK.depth],
        [block.x, block.height / 2, BANK.faceZ - BANK.depth / 2],
        block.height > T.mantleMaxHeight ? 'brick' : 'concrete_painted',
        block.height > T.mantleMaxHeight
          ? { surface: 'concrete', group: Groups.WORLD, penetration: 0.35 }
          : CONCRETE,
        0,
        2,
      );
    }
    this.slab(
      'player-vault-rail',
      [RAIL.width, RAIL.height, RAIL.thickness],
      [RAIL.x, RAIL.height / 2, RAIL.z - RAIL.thickness / 2],
      'wood_planks',
      { surface: 'wood', group: Groups.WORLD, penetration: 0.08 },
      0,
      1,
    );
  }

  /** The course sits outside the level's light rig, so it brings its own. */
  private buildLights(): void {
    const sun = new THREE.DirectionalLight(0xffe6c4, 2.7);
    sun.position.copy(ORIGIN).add(_v.set(34, 46, 30));
    sun.target.position.copy(ORIGIN).add(_v.set(0, 1, 0));
    sun.castShadow = this.ctx.quality.shadows;
    const size = Math.min(2048, this.ctx.quality.shadowMapSize);
    sun.shadow.mapSize.set(size, size);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 160;
    const extent = 46;
    sun.shadow.camera.left = -extent;
    sun.shadow.camera.right = extent;
    sun.shadow.camera.top = extent;
    sun.shadow.camera.bottom = -extent;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.025;
    this.ctx.scene.add(sun, sun.target);
    this.lights.push(sun, sun.target);

    const fill = new THREE.DirectionalLight(0x7fa6d8, 0.55);
    fill.position.copy(ORIGIN).add(_v.set(-30, 18, -28));
    this.ctx.scene.add(fill);
    this.lights.push(fill);
  }

  /* ------------------------------ vantages ----------------------------- */

  private registerShots(): void {
    const at = (x: number, y: number, z: number): THREE.Vector3 =>
      new THREE.Vector3(x, y, z).add(ORIGIN);
    registerVantages([
      {
        name: 'playercourse',
        position: at(-2, 26, 30),
        lookAt: at(6, 0, -18),
        fov: 60,
        hideViewmodel: true,
        note: 'Player course overview: speed lanes, slide ramp, ledge bank, stairs',
      },
      {
        name: 'playerledges',
        position: at(-2, 3.4, -13),
        lookAt: at(17, 1.2, -21),
        fov: 52,
        hideViewmodel: true,
        note: 'Mantle bank at 0.35 / 0.7 / 1.2 / 1.55 / 1.8 / 2.2 m against the 1.6 m window',
      },
      {
        name: 'playerslope',
        position: at(-8, 4.2, 20),
        lookAt: at(-14, 0.6, 4),
        fov: 50,
        hideViewmodel: true,
        note: 'Slide ramp and plateau, for the downhill slide comparison',
      },
    ]);
  }

  /* ------------------------------- events ------------------------------ */

  private trackEvents(): void {
    const on = this.ctx.events.on.bind(this.ctx.events);
    for (const key of TRACKED) {
      // `on` is generic over the payload; the counter ignores it entirely.
      this.unsubscribe.push(
        on(key, (() => {
          this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
        }) as never),
      );
    }
    this.unsubscribe.push(
      on('player:land', (e) => {
        this.lastLandSpeed = e.velocity;
      }),
      on('player:footstep', (e) => {
        this.lastFootstepSurface = e.surface;
      }),
    );
  }

  private eventCounts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const key of TRACKED) out[key] = this.counts.get(key) ?? 0;
    out.landSpeed = this.lastLandSpeed;
    out.footstepSurfaceMetal = this.lastFootstepSurface === 'metal' ? 1 : 0;
    return out;
  }

  private clearEvents(): void {
    this.counts.clear();
    this.lastLandSpeed = 0;
    this.lastFootstepSurface = 'concrete';
  }

  /* -------------------------------- update ----------------------------- */

  /**
   * Nothing to drive in a normal frame: the controller runs itself and the test
   * harness steps it explicitly. The one job here is keeping a held pose alive
   * so a screenshot can be taken mid-stride.
   */
  update(_dt: number): void {
    if (!this.held || !this.scripted) return;
    // The controller consumes the prone request; everything else is a hold.
    this.scripted.proneToggleRequest = false;
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    if (typeof window !== 'undefined') delete window.__PLAYER_TEST__;
    this.physics?.removeStatic(this.root);
    this.root.removeFromParent();
    for (const light of this.lights) light.removeFromParent();
    for (const geo of this.geometries) geo.dispose();
    for (const mat of this.materials) mat.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
    this.lights.length = 0;
  }

  /* ------------------------------ described ---------------------------- */

  /** World-space layout, so no assertion has to hard-code a coordinate. */
  private describe() {
    const w = (x: number, y: number, z: number): V3 => [
      x + ORIGIN.x,
      y + ORIGIN.y,
      z + ORIGIN.z,
    ];
    const bankSpotZ = BANK.faceZ + T.capsuleRadius + 1.4;
    const spots: Record<string, V3> = {
      runway: w(LANE.speed, 0.05, 34),
      slide: w(LANE.slide, 0.05, 34),
      downhill: w(RAMP.x, PLATEAU.top + 0.05, 36),
      camera: w(LANE.camera, METAL_LANE_LIP + 0.05, 30),
      lean: w(LEAN.x, 0.05, LEAN.z),
      ceiling: w(CEILING.x, 0.05, CEILING.z),
      ledge: w((LEDGE.x0 + LEDGE.x1) / 2, LEDGE.top + 0.05, LEDGE.z0 + 2),
      stairs: w(STAIRS.x, 0.05, STAIRS.frontZ + 1.6),
      vault: w(RAIL.x, 0.05, bankSpotZ),
      sky: w(LANE.speed, DROP_HEIGHT, 20),
    };
    // One start per mantle block, a short run-up from its near face.
    for (const b of BLOCKS) spots[`ledge:${b.name}`] = w(b.x, 0.05, bankSpotZ);
    return {
      origin: [ORIGIN.x, ORIGIN.y, ORIGIN.z] as V3,
      deckTop: DECK.top + ORIGIN.y,
      /** Facing that points a spot down its lane, in radians. */
      heading: 0,
      spots,
      /** Lane length ahead of each start, so a run cannot fall off the deck. */
      laneLength: 34 - DECK.z0 - 2,
      ledges: BLOCKS.map((b) => ({
        name: b.name,
        height: b.height,
        expect: b.expect,
        topY: b.height + ORIGIN.y,
        spot: w(b.x, 0.05, bankSpotZ),
      })),
      vault: {
        height: RAIL.height,
        thickness: RAIL.thickness,
        landingY: DECK.top + ORIGIN.y,
      },
      lean: {
        /** Metres from the eye to the wall face on the right-hand side. */
        gap: LEAN.gap,
        /** What the wall check should reduce a full lean to. */
        expected: saturate((LEAN.gap - T.leanClearance) / T.leanOffset),
      },
      ceiling: { clearance: CEILING.y0 },
      ledge: { top: LEDGE.top + ORIGIN.y, edgeZ: LEDGE.z0 + ORIGIN.z },
      stairs: {
        riser: STAIRS.riser,
        run: STAIRS.run,
        steps: STAIRS.steps,
        topY: STAIRS.riser * STAIRS.steps + ORIGIN.y,
      },
      ramp: {
        topY: RAMP.topY + ORIGIN.y,
        /** Slope of the ramp in radians, for the downhill slide expectation. */
        angle: Math.atan2(RAMP.topY, Math.abs(RAMP.zBottom - RAMP.zTop)),
      },
      dropHeight: DROP_HEIGHT,
      surfaces: { deck: 'concrete' as SurfaceKind, lane: 'metal' as SurfaceKind },
    };
  }

  /* -------------------------------- hooks ------------------------------ */

  private install(): void {
    if (typeof window === 'undefined') return;
    const hooks: PlayerHooks = {
      version: 1,
      layout: this.describe(),
      tuning: T,
      spots: () => Object.keys(this.describe().spots),
      reset: (spot, heading) => this.reset(spot, heading),
      teleport: (p, heading) => {
        _v.set(p[0], p[1], p[2]);
        this.player.teleport(_v, heading);
        return this.snapshot();
      },
      run: (plan, opts) => this.run(plan, opts),
      snapshot: () => this.snapshot(),
      camera: () => this.cameraSnapshot(),
      probeMantle: () => this.probe(),
      coyoteScan: (maxDelay) => this.coyoteScan(maxDelay),
      jumpBufferScan: () => this.jumpBufferScan(),
      fuzz: (frames, seed) => this.fuzz(frames, seed),
      alloc: (frames) => this.alloc(frames),
      hurt: (amount, from) => {
        if (from) {
          _from.set(from[0], from[1], from[2]);
          this.player.damage({ amount, kind: 'bullet', attacker: 'enemy', from: _from });
        } else {
          this.player.damage({ amount, kind: 'bullet', attacker: 'enemy' });
        }
        return this.snapshot();
      },
      heal: (amount) => {
        this.player.heal(amount);
        return this.snapshot();
      },
      kick: (pitch, yaw) => this.player.addViewKick(pitch, yaw),
      shake: (amplitude, duration, frequency, at, radius) => {
        if (at) {
          this.ctx.events.emit('camera:shake', {
            amplitude,
            duration,
            frequency,
            position: new THREE.Vector3(at[0], at[1], at[2]),
            radius,
          });
        } else {
          this.ctx.events.emit('camera:shake', { amplitude, duration, frequency });
        }
      },
      requestFov: (fov, duration) => this.player.requestFov(fov, duration),
      holdBreath: (hold) => this.player.holdBreath(hold),
      setAdsTime: (seconds) => this.player.setAdsTime(seconds),
      events: () => this.eventCounts(),
      hold: (phase) => {
        this.applyPhase(this.intent(), phase);
        this.held = true;
      },
      release: () => {
        this.held = false;
        this.scripted = null;
        this.player.setScriptedInput(false);
      },
    };
    window.__PLAYER_TEST__ = hooks;
  }

  /* ------------------------------- driving ----------------------------- */

  /**
   * Parks the controller at a named spot with a clean state and takes input
   * over. Every measurement starts here, so nothing leaks between them.
   */
  private reset(spot = 'runway', heading?: number): Record<string, number> {
    const spots = this.describe().spots;
    const target = spots[spot];
    if (!target) {
      throw new Error(
        `unknown spot "${spot}"; known spots are ${Object.keys(spots).join(', ')}`,
      );
    }
    _v.set(target[0], target[1], target[2]);
    this.player.enabled = true;
    this.player.setFrozen(false);
    this.player.respawn(_v, heading ?? 0);
    // Clears the buttons and the edge history both, so the first frame of the
    // next plan is an honest press.
    this.scripted = this.player.setScriptedInput(true);
    this.held = false;
    this.clearEvents();
    // Two settling steps, so the capsule is resting on the surface and the
    // camera rig has a composed transform before anything is measured.
    this.player.stepFrame(T.fixedDt, this.ctx);
    this.player.stepFrame(T.fixedDt, this.ctx);
    this.clearEvents();
    return this.snapshot();
  }

  /**
   * The scripted intent for the current session, starting one if a hook was
   * called before any `reset`.
   */
  private intent(): Intent {
    if (!this.scripted) this.scripted = this.player.setScriptedInput(true);
    return this.scripted;
  }

  private applyPhase(intent: Intent, phase: Phase): void {
    intent.moveX = phase.move ? clamp(phase.move[0], -1, 1) : 0;
    intent.moveY = phase.move ? clamp(phase.move[1], -1, 1) : 0;
    intent.lookYaw = phase.look ? phase.look[0] : 0;
    intent.lookPitch = phase.look ? phase.look[1] : 0;
    intent.sprint = !!phase.sprint;
    intent.crouch = !!phase.crouch;
    intent.jump = !!phase.jump;
    intent.ads = !!phase.ads;
    intent.fire = !!phase.fire;
    intent.leanLeft = (phase.lean ?? 0) < 0;
    intent.leanRight = (phase.lean ?? 0) > 0;
  }

  private phaseDone(until: Phase['until'], frame: number): boolean {
    const p = this.player;
    switch (until) {
      case 'grounded':
        return p.grounded;
      case 'airborne':
        return !p.grounded;
      case 'mantling':
        return p.mantling;
      case 'notMantling':
        return !p.mantling;
      case 'sliding':
        return p.stance === 'slide';
      case 'notSliding':
        return p.stance !== 'slide';
      case 'stopped':
        return frame > 2 && Math.hypot(p.velocity.x, p.velocity.z) < 0.02;
      case 'landed':
        return frame > 2 && p.grounded;
      default:
        return false;
    }
  }

  /**
   * Runs a scripted plan a frame at a time and reports what happened. Every
   * quantity a test could want is measured here rather than reconstructed from
   * a trace, so an assertion reads as a statement about the controller.
   */
  private run(plan: Phase[], opts?: { trace?: boolean }): RunResult {
    const p = this.player;
    // Deliberately not `setScriptedInput`: that clears the previous-frame
    // input the controller diffs against, so every `run` would look like a
    // fresh press of whatever the first phase holds down. Calling `run` in a
    // loop would then read as a double tap and silently promote a plain sprint
    // to a tactical one. `reset` owns starting a clean session.
    const intent = this.intent();
    this.held = false;
    this.clearEvents();

    const trace: number[][] = [];
    const wantTrace = !!opts?.trace;
    const phases: PhaseResult[] = [];

    const startX = p.position.x;
    const startY = p.position.y;
    const startZ = p.position.z;
    let totalFrames = 0;
    let seconds = 0;
    let maxSpeed = 0;
    let maxY = startY;
    let minY = startY;
    let maxPitch = 0;
    let maxRoll = 0;
    let camHeightMin = Infinity;
    let camHeightMax = -Infinity;
    let minLandDip = 0;
    let maxBobAmp = 0;
    let maxRecoilPitch = 0;
    let minFov = Infinity;
    let maxFov = -Infinity;
    let nonFinite = 0;
    let sanitised = 0;

    for (let pi = 0; pi < plan.length; pi++) {
      const phase = plan[pi];
      const dt = phase.dt && phase.dt > 0 ? phase.dt : T.fixedDt;
      const limit = Math.max(0, Math.min(Math.round(phase.frames ?? 60), 20000));
      this.applyPhase(intent, phase);
      if (phase.prone) intent.proneToggleRequest = true;

      const before = this.eventCounts();
      const pStartY = p.position.y;
      const pStartX = p.position.x;
      const pStartZ = p.position.z;
      const startSpeed = Math.hypot(p.velocity.x, p.velocity.z);
      let phaseFrames = 0;
      let phaseSeconds = 0;
      let phaseMax = startSpeed;
      let phaseMin = startSpeed;
      let phaseApex = 0;
      let grounded = 0;
      const stances = new Set<number>();
      const speeds: number[] = [];

      for (let f = 0; f < limit; f++) {
        p.stepFrame(dt, this.ctx);
        phaseFrames++;
        totalFrames++;
        phaseSeconds += dt;
        seconds += dt;

        const snap = p.snapshot(_snap);
        const speed = snap.speed;
        speeds.push(speed);
        if (speed > phaseMax) phaseMax = speed;
        if (speed < phaseMin) phaseMin = speed;
        if (speed > maxSpeed) maxSpeed = speed;
        if (p.position.y > maxY) maxY = p.position.y;
        if (p.position.y < minY) minY = p.position.y;
        if (p.position.y - pStartY > phaseApex) phaseApex = p.position.y - pStartY;
        if (snap.grounded) grounded++;
        stances.add(snap.stance);
        if (snap.landDip < minLandDip) minLandDip = snap.landDip;
        if (snap.bobAmp > maxBobAmp) maxBobAmp = snap.bobAmp;
        if (Math.abs(snap.recoilPitch) > maxRecoilPitch) {
          maxRecoilPitch = Math.abs(snap.recoilPitch);
        }

        const cam = this.cameraSnapshot();
        if (!cam.finite) nonFinite++;
        if (Math.abs(cam.elevation) > maxPitch) maxPitch = Math.abs(cam.elevation);
        if (Math.abs(cam.roll) > maxRoll) maxRoll = Math.abs(cam.roll);
        if (cam.fov < minFov) minFov = cam.fov;
        if (cam.fov > maxFov) maxFov = cam.fov;
        const camHeight = this.ctx.camera.position.y - p.position.y;
        if (camHeight < camHeightMin) camHeightMin = camHeight;
        if (camHeight > camHeightMax) camHeightMax = camHeight;
        if (p.rigSanitised) sanitised++;

        if (wantTrace) {
          trace.push([
            pi,
            seconds,
            p.position.x,
            p.position.y,
            p.position.z,
            speed,
            p.velocity.y,
            snap.stance,
            snap.grounded,
            this.ctx.camera.position.x,
            this.ctx.camera.position.y,
            this.ctx.camera.position.z,
            cam.pitch,
            cam.roll,
            cam.fov,
            snap.bobPhase,
            snap.bobAmp,
          ]);
        }

        if (this.phaseDone(phase.until, phaseFrames)) break;
      }

      // The 90% mark is measured against the peak this phase actually reached,
      // which is what makes the acceleration check independent of the top speed.
      let timeTo90 = -1;
      for (let f = 0; f < speeds.length; f++) {
        if (speeds[f] >= phaseMax * 0.9) {
          timeTo90 = (f + 1) * dt;
          break;
        }
      }

      const after = this.eventCounts();
      const delta: Record<string, number> = {};
      for (const key of Object.keys(after)) delta[key] = after[key] - (before[key] ?? 0);
      delta.landSpeed = after.landSpeed;

      phases.push({
        frames: phaseFrames,
        seconds: phaseSeconds,
        startSpeed,
        endSpeed: Math.hypot(p.velocity.x, p.velocity.z),
        maxSpeed: phaseMax,
        minSpeed: phaseMin,
        travel: Math.hypot(p.position.x - pStartX, p.position.z - pStartZ),
        gainY: p.position.y - pStartY,
        apex: phaseApex,
        timeTo90,
        stances: Array.from(stances),
        events: delta,
        groundedFrames: grounded,
        endSnapshot: { ...p.snapshot(_snap) },
      });
    }

    const result: RunResult = {
      frames: totalFrames,
      seconds,
      phases,
      end: { ...p.snapshot(_snap) },
      camera: this.cameraSnapshot(),
      events: this.eventCounts(),
      travel: Math.hypot(p.position.x - startX, p.position.z - startZ),
      maxSpeed,
      maxY,
      minY,
      maxPitch,
      maxRoll,
      camHeightSpan: camHeightMax > camHeightMin ? camHeightMax - camHeightMin : 0,
      minLandDip,
      maxBobAmp,
      maxRecoilPitch,
      minFov: Number.isFinite(minFov) ? minFov : NaN,
      maxFov: Number.isFinite(maxFov) ? maxFov : NaN,
      nonFinite,
      sanitised,
    };
    if (wantTrace) {
      result.columns = TRACE_COLUMNS;
      result.trace = trace;
    }
    return result;
  }

  private snapshot(): Record<string, number> {
    return { ...this.player.snapshot(_snap) };
  }

  /**
   * The composed camera, plus the two quantities the pitch-limit and
   * roll-accumulation assertions are actually about: the elevation of the view
   * direction, which is independent of yaw and roll, and the roll recovered
   * from the quaternion rather than from any internal accumulator.
   */
  private cameraSnapshot(): CameraSnapshot {
    const cam = this.ctx.camera;
    _euler.setFromQuaternion(cam.quaternion, 'YXZ');
    _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const finite =
      Number.isFinite(cam.position.x) &&
      Number.isFinite(cam.position.y) &&
      Number.isFinite(cam.position.z) &&
      Number.isFinite(cam.quaternion.x) &&
      Number.isFinite(cam.quaternion.y) &&
      Number.isFinite(cam.quaternion.z) &&
      Number.isFinite(cam.quaternion.w) &&
      Number.isFinite(cam.fov) &&
      Number.isFinite(_v.x) &&
      Number.isFinite(_v.y) &&
      Number.isFinite(_v.z);
    return {
      position: [cam.position.x, cam.position.y, cam.position.z],
      forward: [_v.x, _v.y, _v.z],
      pitch: _euler.x,
      yaw: _euler.y,
      roll: _euler.z,
      fov: cam.fov,
      elevation: finite ? Math.asin(clamp(_v.y, -1, 1)) : NaN,
      finite,
    };
  }

  private probe(): MantleProbe {
    const ok = this.player.probeMantle();
    const t = this.player.mantleTarget;
    return {
      ok,
      reason: this.player.mantleReason,
      vault: t.vault,
      rise: t.rise,
      duration: t.duration,
      end: [t.endX, t.endY, t.endZ],
      peakY: t.peakY,
    };
  }

  /* ------------------------------- scans ------------------------------- */

  /**
   * Walks off the ledge, waits a growing number of frames, then presses jump.
   * Reports the delay at which the grace period stops working, which is the
   * only honest way to test a window measured in frames.
   */
  private coyoteScan(maxDelay = 24): ScanResult {
    const dt = T.fixedDt;
    const lead: number[] = [];
    const fired: boolean[] = [];
    for (let delay = 0; delay <= maxDelay; delay++) {
      this.reset('ledge');
      // Walk off the edge, then coast the requested number of airborne frames.
      const plan: Phase[] = [
        { move: [0, 1], frames: 400, dt, until: 'airborne' },
        { move: [0, 1], frames: delay, dt },
        { move: [0, 1], jump: true, frames: 1, dt },
        { move: [0, 1], frames: 2, dt },
      ];
      const res = this.run(plan, {});
      lead.push(delay);
      // A coyote jump is unmistakable: the fall reverses.
      fired.push(res.phases[2].endSnapshot.vy > 1);
    }
    return { dt, lead, fired };
  }

  /**
   * Jumps, presses jump again a growing number of frames later, and measures how
   * many frames were left before touchdown when the press landed. A press
   * inside the buffer window has to fire on landing; one outside must not.
   */
  private jumpBufferScan(): ScanResult {
    const dt = T.fixedDt;
    const lead: number[] = [];
    const fired: boolean[] = [];
    const bufferFrames = Math.round(T.jumpBufferTime / dt);

    // How long the fall lasts with no second press. The controller is
    // deterministic and the flight takes no input, so waiting `fall - before`
    // airborne steps puts the press exactly `before` steps from touchdown —
    // which is why the lead can be reported as the number asked for rather
    // than measured afterwards. Measuring it after the press cannot work: a
    // buffered jump leaves the ground again on the very step it would be
    // measured on.
    this.reset('runway');
    const control = this.run(
      [
        { jump: true, frames: 1, dt },
        { frames: 400, dt, until: 'airborne' },
        { frames: 400, dt, until: 'landed' },
      ],
      {},
    );
    const fall = control.phases[2].frames;

    // Straddle the window from well outside to well inside it.
    for (const before of [
      bufferFrames * 3,
      bufferFrames * 2,
      bufferFrames + 4,
      bufferFrames - 3,
      4,
      1,
    ]) {
      const wait = Math.max(0, fall - before);
      this.reset('runway');
      const res = this.run(
        [
          { jump: true, frames: 1, dt },
          { frames: 400, dt, until: 'airborne' },
          { frames: wait, dt },
          { jump: true, frames: 1, dt },
          { frames: 400, dt, until: 'landed' },
          { frames: 4, dt },
        ],
        {},
      );
      lead.push(Math.min(before, fall));
      fired.push((res.events['player:jump'] ?? 0) >= 2);
    }
    return { dt, lead, fired };
  }

  /* -------------------------------- fuzz ------------------------------- */

  /**
   * Randomised abuse. Deliberately includes values no caller should ever pass —
   * NaN look deltas, infinite recoil, negative fields of view, zero and
   * non-finite frame times — because a NaN reaching the camera matrix hides the
   * entire scene with nothing in the console, and that is the one failure mode
   * worth building a guard rail for.
   */
  private fuzz(frames: number, seed = 0xf0e1d2): FuzzResult {
    const n = clamp(Math.round(frames), 1, 200000);
    const rng = new Rng(seed);
    const p = this.player;
    const spots = Object.values(this.describe().spots);
    this.reset('camera');
    const intent = p.setScriptedInput(true);

    const garbage = [NaN, Infinity, -Infinity, 1e30, -1e30, 0];
    let nonFiniteFrames = 0;
    let firstBad = '';
    let sanitisedFrames = 0;
    let maxElevation = 0;
    let maxRoll = 0;
    let maxSpeed = 0;
    let minFov = Infinity;
    let maxFov = -Infinity;
    let seconds = 0;
    const before = this.eventCounts();

    for (let i = 0; i < n; i++) {
      // Frame time: normal, hitching, zero, and occasionally not a number.
      let dt = rng.range(1 / 240, 1 / 20);
      const roll = rng.next();
      if (roll < 0.01) dt = rng.range(0.25, 1.5);
      else if (roll < 0.02) dt = 0;
      else if (roll < 0.025) dt = rng.pick(garbage);

      intent.moveX = rng.bool(0.1) ? rng.pick([-1, 0, 1]) : rng.range(-1, 1);
      intent.moveY = rng.bool(0.1) ? rng.pick([-1, 0, 1]) : rng.range(-1, 1);
      intent.lookYaw = rng.bool(0.02) ? rng.pick(garbage) : rng.range(-6, 6);
      intent.lookPitch = rng.bool(0.02) ? rng.pick(garbage) : rng.range(-6, 6);
      intent.sprint = rng.bool(0.5);
      intent.crouch = rng.bool(0.3);
      intent.jump = rng.bool(0.25);
      intent.ads = rng.bool(0.25);
      intent.fire = rng.bool(0.2);
      intent.leanLeft = rng.bool(0.12);
      intent.leanRight = rng.bool(0.12);
      if (rng.bool(0.02)) intent.proneToggleRequest = true;

      // Everything another system can do to the camera, including the things it
      // should never do.
      if (rng.bool(0.06)) {
        p.addViewKick(
          rng.bool(0.15) ? rng.pick(garbage) : rng.range(-1.5, 1.5),
          rng.bool(0.15) ? rng.pick(garbage) : rng.range(-1.5, 1.5),
        );
      }
      if (rng.bool(0.05)) {
        this.ctx.events.emit('camera:kick', {
          pitch: rng.bool(0.2) ? rng.pick(garbage) : rng.range(-1, 1),
          yaw: rng.bool(0.2) ? rng.pick(garbage) : rng.range(-1, 1),
          roll: rng.bool(0.3) ? rng.pick(garbage) : rng.range(-1, 1),
        });
      }
      if (rng.bool(0.04)) {
        this.ctx.events.emit('camera:shake', {
          amplitude: rng.bool(0.2) ? rng.pick(garbage) : rng.range(0, 40),
          duration: rng.bool(0.2) ? rng.pick(garbage) : rng.range(0, 2),
          frequency: rng.bool(0.2) ? rng.pick(garbage) : rng.range(0, 4000),
        });
      }
      if (rng.bool(0.03)) {
        this.ctx.events.emit('camera:fov', {
          fov: rng.bool(0.25) ? rng.pick(garbage) : rng.range(-40, 400),
          duration: rng.bool(0.25) ? rng.pick(garbage) : rng.range(-1, 2),
        });
      }
      if (rng.bool(0.02)) p.setAdsTime(rng.bool(0.4) ? rng.pick(garbage) : rng.range(0, 3));
      if (rng.bool(0.01)) p.setBaseFov(rng.bool(0.4) ? rng.pick(garbage) : rng.range(-10, 300));
      if (rng.bool(0.02)) {
        p.damage({
          amount: rng.bool(0.3) ? rng.pick(garbage) : rng.range(-20, 45),
          kind: 'bullet',
          attacker: 'enemy',
          from: rng.bool(0.3)
            ? new THREE.Vector3(rng.pick(garbage), rng.pick(garbage), rng.pick(garbage))
            : new THREE.Vector3(rng.range(-40, 40), rng.range(0, 4), rng.range(-40, 40)).add(
                ORIGIN,
              ),
        });
      }
      if (rng.bool(0.01)) p.heal(rng.bool(0.4) ? rng.pick(garbage) : rng.range(-10, 60));
      if (rng.bool(0.02)) p.holdBreath(rng.bool());
      if (rng.bool(0.01)) {
        const spot = rng.pick(spots);
        _v.set(spot[0], spot[1], spot[2]);
        if (rng.bool(0.25)) _v.set(rng.pick(garbage), rng.pick(garbage), rng.pick(garbage));
        p.teleport(_v, rng.bool(0.3) ? rng.pick(garbage) : rng.range(-8, 8));
      }
      if (rng.bool(0.004)) p.respawn();
      if (rng.bool(0.01)) p.setFrozen(true);
      else if (rng.bool(0.05)) p.setFrozen(false);

      p.stepFrame(dt, this.ctx);
      if (Number.isFinite(dt)) seconds += clamp(dt, 0, 0.25);

      const snap = p.snapshot(_snap);
      const cam = this.cameraSnapshot();
      if (p.rigSanitised) sanitisedFrames++;
      const bad = this.firstNonFinite(snap, cam);
      if (bad) {
        nonFiniteFrames++;
        if (!firstBad) firstBad = `frame ${i}: ${bad}`;
      } else {
        if (Math.abs(cam.elevation) > maxElevation) maxElevation = Math.abs(cam.elevation);
        if (Math.abs(cam.roll) > maxRoll) maxRoll = Math.abs(cam.roll);
        if (snap.speed > maxSpeed) maxSpeed = snap.speed;
        if (cam.fov < minFov) minFov = cam.fov;
        if (cam.fov > maxFov) maxFov = cam.fov;
      }
    }

    // Let go and settle, so the report can state that the rig came back rather
    // than merely that it never blew up. Counted before the reset, because the
    // reset itself spawns. The player is put back on its feet first: the death
    // camera holds a deliberate roll, and settling face-down would make the
    // "roll returns to zero" reading meaningless.
    const after = this.eventCounts();
    p.setFrozen(false);
    this.reset('camera');
    const settle = this.run([{ frames: Math.round(4 / T.fixedDt) }], {});

    return {
      frames: n,
      seconds,
      nonFiniteFrames,
      firstBad,
      sanitisedFrames,
      maxElevation,
      maxRoll,
      maxSpeed,
      minFov: Number.isFinite(minFov) ? minFov : NaN,
      maxFov: Number.isFinite(maxFov) ? maxFov : NaN,
      deaths: (after['player:death'] ?? 0) - (before['player:death'] ?? 0),
      respawns: (after['player:spawn'] ?? 0) - (before['player:spawn'] ?? 0),
      positionRecoveries: 0,
      endFinite: settle.camera.finite && settle.nonFinite === 0,
      settledRoll: Math.abs(settle.camera.roll),
      settledElevation: Math.abs(settle.camera.elevation),
    };
  }

  /** Names the first field that stopped being a number, for the failure text. */
  private firstNonFinite(
    snap: Record<string, number>,
    cam: CameraSnapshot,
  ): string | null {
    if (!cam.finite) return 'camera transform';
    for (const key of Object.keys(snap)) {
      if (!Number.isFinite(snap[key])) return `snapshot.${key}`;
    }
    const vm = this.ctx.viewmodelCamera;
    if (
      !Number.isFinite(vm.position.x) ||
      !Number.isFinite(vm.position.y) ||
      !Number.isFinite(vm.position.z) ||
      !Number.isFinite(vm.quaternion.w)
    ) {
      return 'viewmodel camera';
    }
    return null;
  }

  /**
   * Heap growth over a long plain-movement run. Needs `--expose-gc`; without it
   * the result is reported as unsupported rather than as a pass, because a
   * measurement nobody can trust is worse than no measurement.
   */
  private alloc(frames: number): AllocResult {
    const n = clamp(Math.round(frames), 1, 100000);
    const gc = (window as unknown as { gc?: () => void }).gc;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    if (!gc || !mem) {
      return { frames: n, supported: false, bytesPerFrame: 0, before: 0, after: 0 };
    }

    this.reset('camera');
    const intent = this.player.setScriptedInput(true);
    intent.moveY = 1;
    intent.sprint = true;
    // Warm every path once so lazily-built hidden classes are not counted.
    for (let i = 0; i < 600; i++) this.player.stepFrame(T.fixedDt, this.ctx);

    gc();
    const before = mem.usedJSHeapSize;
    for (let i = 0; i < n; i++) {
      // Exercise stance changes, jumps and landings, not just a straight run.
      intent.crouch = i % 600 > 480;
      intent.jump = i % 240 === 0;
      intent.ads = i % 900 > 780;
      this.player.stepFrame(T.fixedDt, this.ctx);
    }
    const after = mem.usedJSHeapSize;
    return {
      frames: n,
      supported: true,
      bytesPerFrame: (after - before) / n,
      before,
      after,
    };
  }
}
