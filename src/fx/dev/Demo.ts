import * as THREE from 'three';
import type { FXSystem, WeaponSystem, WorldSystem } from '../../core/Contracts';
import type { SurfaceType } from '../../core/GameTypes';
import { rng } from '../../core/MathUtils';
import type { EngineContext } from '../../core/System';
import { FXRange } from './Range';
import type { FXStats } from '../index';
import type { FXTextures } from '../Textures';

/** Named states the screenshot harness can drive directly. */
export type ScenarioName =
  | 'gunfire'
  | 'suppressed'
  | 'flash'
  | 'tracers'
  | 'tracerspan'
  | 'concrete'
  | 'metal'
  | 'glass'
  | 'dirt'
  | 'sand'
  | 'gravel'
  | 'wood'
  | 'water'
  | 'blood'
  | 'decals'
  | 'debris'
  | 'grenade'
  | 'rocket'
  | 'airstrike'
  | 'smoke'
  | 'wallsmoke'
  | 'fire'
  | 'idle';

/**
 * The parts of the FX system the dev harness needs and the public interface does
 * not expose. Built inline where the demo is constructed, so none of it exists
 * unless `?fxdemo=1` was asked for.
 */
export interface FXDevBridge {
  /** Advance the effects clock and the time-metered emitters, with no render. */
  step(dt: number): void;
  /** Pin the floor emitters land debris on, or null to probe the real world. */
  setFloor(y: number | null): void;
  stats(): FXStats;
  /** Live particle count per group. */
  groups(): Record<string, number>;
  /** The lighting a particle at this point is shaded with. */
  light(position: THREE.Vector3): { sun: number[]; ambient: number[]; visibility: number };
}

/**
 * Where the review camera stands for a scenario.
 *
 * `player` leaves the camera alone, which is the only honest way to judge a
 * first-person effect. The other two park it on the proving range: `floor` for
 * anything that happens on the ground, `wall` for impacts on a vertical surface.
 * Offsets are metres from the effect origin, +Z toward the camera.
 */
interface StageSpec {
  mode: 'player' | 'floor' | 'wall';
  /** Height of the effect above the floor. */
  lift?: number;
  eye: readonly [number, number, number];
  look: readonly [number, number, number];
}

const PLAYER_STAGE: StageSpec = { mode: 'player', eye: [0, 0, 0], look: [0, 0, 0] };

const STAGES: Record<ScenarioName, StageSpec> = {
  gunfire: PLAYER_STAGE,
  suppressed: PLAYER_STAGE,
  // The atlas boards ride in the viewmodel scene; staging only serves to clear
  // the city out from behind them.
  idle: { mode: 'floor', lift: 1.5, eye: [0, 0, 6], look: [0, 0, 0] },
  flash: { mode: 'floor', lift: 1.2, eye: [0.35, 0.1, 2.6], look: [0, 0, 0] },
  tracers: { mode: 'floor', lift: 1.5, eye: [0, 0.15, 4.5], look: [0, 0, 0] },
  // Looking along the floor's long axis instead of at the wall, so there is
  // ninety metres of depth in frame to judge a tracer's width against.
  tracerspan: { mode: 'floor', lift: 1.6, eye: [-7, 0.2, 7], look: [30, 2.2, 7] },
  concrete: { mode: 'wall', eye: [0, 0.1, 2.8], look: [0, -0.05, 0] },
  metal: { mode: 'wall', eye: [0, 0.1, 2.6], look: [0, -0.05, 0] },
  glass: { mode: 'wall', eye: [0, 0.1, 2.8], look: [0, -0.05, 0] },
  wood: { mode: 'wall', eye: [0, 0.1, 2.6], look: [0, -0.05, 0] },
  dirt: { mode: 'floor', eye: [0, 1.7, 3.6], look: [0, 0.35, 0] },
  sand: { mode: 'floor', eye: [0, 1.7, 3.6], look: [0, 0.35, 0] },
  gravel: { mode: 'floor', eye: [0, 1.7, 3.6], look: [0, 0.35, 0] },
  water: { mode: 'floor', eye: [0, 1.8, 4.2], look: [0, 0.45, 0] },
  blood: { mode: 'floor', lift: 1.4, eye: [0, 0.15, 3.2], look: [0, -0.1, 0] },
  decals: { mode: 'wall', eye: [0, 0.1, 4.2], look: [0, -0.05, 0] },
  debris: { mode: 'floor', eye: [0, 2.1, 6], look: [0, 0.9, 0] },
  // Distances are set so the effect fills roughly half the frame. Further back
  // than that and a screenshot cannot distinguish a well-shaped explosion from
  // a badly-shaped one, which is the entire point of the exercise.
  grenade: { mode: 'floor', lift: 0.4, eye: [0, 2.1, 9], look: [0, 2.4, 0] },
  rocket: { mode: 'floor', lift: 3.2, eye: [0, 1.6, 13], look: [0, 1.6, 0] },
  airstrike: { mode: 'floor', lift: 0.8, eye: [0, 4.5, 30], look: [0, 12, 0] },
  smoke: { mode: 'floor', lift: 0.9, eye: [0, 2, 9], look: [0, 2.4, 0] },
  // Raking, from the side and low: the only angle at which a quad slicing into
  // the wall and into the floor both show their seams in one frame.
  wallsmoke: { mode: 'wall', eye: [5.4, 0.5, 6.6], look: [0, -0.7, 0] },
  fire: { mode: 'floor', eye: [0, 1.6, 5.5], look: [0, 1.3, 0] },
};

interface Beat {
  at: number;
  name: ScenarioName;
}

const CYCLE = 10;

/** The automatic loop, used when nothing is driving the scenarios. */
const BEATS: Beat[] = [
  { at: 0.2, name: 'gunfire' },
  { at: 2.1, name: 'grenade' },
  { at: 3.0, name: 'metal' },
  { at: 3.9, name: 'smoke' },
  { at: 4.6, name: 'blood' },
  { at: 5.2, name: 'glass' },
  { at: 5.9, name: 'airstrike' },
  { at: 7.4, name: 'fire' },
  { at: 8.0, name: 'rocket' },
  { at: 8.6, name: 'gunfire' },
];

/** How far above the level the proving range floats. */
const RANGE_ALTITUDE = 34;

/**
 * `?fxdemo=1` — plays the effects library in front of the camera so it can be
 * reviewed in screenshots instead of by reading code. `window.__FXSHOT__(name)`
 * pins a single scenario and parks the camera on the proving range, where the
 * effect is framed against a one-metre grid and 1.8 m reference figures; that is
 * the only way to tell a thirty-centimetre dust puff from an eight-metre one.
 * Add `?fxatlas=1` to pin the baked atlases up in front of the camera. None of
 * it is reachable without the flag.
 */
export class FXDemo {
  private time = 0;
  private beat = 0;
  private fireTimer = 0;
  private probeTimer = 0;
  private hold = 0;
  private held: ScenarioName = 'idle';
  private driven = false;

  private readonly range = new FXRange();
  private rangeReady = false;

  private readonly eye = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly hitPoint = new THREE.Vector3();
  private readonly hitNormal = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
  private readonly scratch2 = new THREE.Vector3();
  private readonly tangent = new THREE.Vector3();
  private readonly bitangent = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly viewMuzzle = new THREE.Vector3(0.06, -0.02, -0.62);
  private readonly viewForward = new THREE.Vector3(0, 0, -1);
  private readonly worldToView = new THREE.Matrix4();
  private readonly ejectPoint = new THREE.Vector3();

  /** Effect origin and camera pose for the pinned scenario. */
  private readonly origin = new THREE.Vector3();
  private readonly originNormal = new THREE.Vector3(0, 1, 0);
  private readonly stageEye = new THREE.Vector3();
  private readonly stageTarget = new THREE.Vector3();
  private staged = false;
  private readonly hidden: THREE.Object3D[] = [];
  private readonly hiddenLevel: THREE.Object3D[] = [];

  private readonly rocket = new THREE.Object3D();
  private rocketTime = -1;

  private readonly atlasBoards: THREE.Object3D[] = [];

  constructor(
    private readonly fx: FXSystem,
    private readonly ctx: EngineContext,
    textures: FXTextures,
    private readonly bridge: FXDevBridge,
  ) {
    this.rocket.name = 'fx:demoRocket';
    ctx.scene.add(this.rocket);
    if (new URLSearchParams(location.search).get('fxatlas') === '1') {
      this.showAtlases(textures);
    }
    (window as unknown as { __FXSHOT__: (name: string) => Promise<void> }).__FXSHOT__ = (name) =>
      this.scenario(name as ScenarioName);
    (window as unknown as { __FXPHASE__: unknown }).__FXPHASE__ = {
      begin: (name: string) => this.phaseBegin(name as ScenarioName),
      fire: () => this.once(this.held),
      advance: (seconds: number) => this.phaseAdvance(seconds),
      report: () => this.phaseReport(),
      end: () => this.phaseEnd(),
    };
  }

  /** Pin a scenario, park the camera on it, and resolve once frames have drawn. */
  private scenario(name: ScenarioName): Promise<void> {
    // Every scenario starts from nothing. Without this the airstrike's forty-six
    // metre smoke column is still standing over the next four shots, its decals
    // are still on the wall the bullet holes are being reviewed against, and the
    // reviewer is looking at the sum of the library rather than at one effect.
    this.fx.clearAll();
    this.driven = true;
    this.held = name;
    // Long enough that the effect is still being fed while the harness waits on
    // a frame from a software rasteriser.
    this.hold = 10;
    this.trackCamera();
    this.buildRange();
    this.setStage(name);
    this.findViewMuzzle();
    // The atlas boards hang a metre in front of the lens, so they have to stand
    // down for every scenario but their own.
    for (const board of this.atlasBoards) board.visible = name === 'idle';
    this.once(name);
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  // -------------------------------------------------------------------------
  // Phase capture
  // -------------------------------------------------------------------------

  /**
   * `window.__FXPHASE__` — drive one effect through its own lifetime on a clock
   * the harness controls.
   *
   * A screenshot harness can only wait in wall-clock frames, and that is not
   * good enough for an explosion. Under the software rasteriser the captures run
   * on, one frame is about a second of wall clock but only 100 ms of simulation,
   * because the frame delta is clamped. So "wait six frames after ignition and
   * shoot" is 600 ms of effect, by which time a grenade's fireball has already
   * burned out — which is exactly why the QA capture of a detonation showed a
   * grey smudge and no fireball, and why judging phase timing from it was
   * impossible. Freezing the clock and stepping it directly makes 8 ms and 12 s
   * equally reachable, and each sample costs one frame instead of two minutes.
   */
  private phaseBegin(name: ScenarioName): void {
    this.fx.clearAll();
    this.driven = true;
    this.held = name;
    // Nothing runs on its own: every particle in the shot is emitted from inside
    // `phaseAdvance`, on a step whose size the harness chose.
    this.hold = 0;
    this.fireTimer = 0;
    this.rocketTime = -1;
    this.trackCamera();
    this.buildRange();
    this.setStage(name);
    this.findViewMuzzle();
    for (const board of this.atlasBoards) board.visible = name === 'idle';
    // The range is visual meshes with no colliders, so debris would decide there
    // is nothing under it and hang in the air. Here is where the floor is.
    this.bridge.setFloor(this.staged ? this.range.floorCenter.y : null);
    this.ctx.time.timeScale = 0;
  }

  private phaseAdvance(seconds: number): void {
    let left = Math.max(0, seconds);
    while (left > 1e-6) {
      const step = Math.min(PHASE_STEP, left);
      left -= step;
      // Clock first, so anything emitted on this step carries this step's time.
      this.bridge.step(step);
      this.continuous(this.held, step);
      if (this.rocketTime >= 0) this.flyRocket(step);
    }
  }

  private phaseReport(): Record<string, unknown> {
    return {
      scenario: this.held,
      elapsed: Math.round(this.ctx.time.elapsed * 1000) / 1000,
      groups: this.bridge.groups(),
      fx: this.bridge.stats(),
      light: this.bridge.light(this.origin),
    };
  }

  private phaseEnd(): void {
    this.bridge.setFloor(null);
    this.ctx.time.timeScale = 1;
  }

  update(dt: number): void {
    this.trackCamera();

    this.probeTimer -= dt;
    if (this.probeTimer <= 0) {
      this.probeTimer = 0.25;
      if (!this.staged) this.findViewMuzzle();
    }

    if (this.driven) {
      if (this.hold > 0) {
        this.hold -= dt;
        this.continuous(this.held, dt);
      }
    } else {
      this.time += dt;
      if (this.time >= CYCLE) {
        this.time -= CYCLE;
        this.beat = 0;
      }
      while (this.beat < BEATS.length && BEATS[this.beat].at <= this.time) {
        const beat = BEATS[this.beat++];
        this.once(beat.name);
        this.held = beat.name;
        this.hold = 1.4;
      }
      if (this.hold > 0) {
        this.hold -= dt;
        this.continuous(this.held, dt);
      }
    }

    if (this.rocketTime >= 0) this.flyRocket(dt);
  }

  /**
   * Runs from the FX system's own `lateUpdate`, which is after the player has
   * written the camera for the frame and before anything reads it, so this is
   * the only place a staged pose survives to the render.
   */
  lateUpdate(): void {
    if (!this.staged) {
      if (this.hidden.length) this.restoreWeapon();
      if (this.hiddenLevel.length) this.restoreLevel();
      return;
    }
    this.hideWeapon();
    this.hideLevel();
    const camera = this.ctx.camera;
    camera.position.copy(this.stageEye);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.stageTarget);
    camera.updateMatrixWorld(true);
    this.trackCamera();
  }

  /** Everything needed to tell "never spawned" from "spawned but invisible". */
  get diagnostics(): Record<string, unknown> {
    const round = (v: THREE.Vector3): number[] => [
      Math.round(v.x * 1000) / 1000,
      Math.round(v.y * 1000) / 1000,
      Math.round(v.z * 1000) / 1000,
    ];
    return {
      held: this.held,
      staged: this.staged,
      viewMuzzle: round(this.viewMuzzle),
      viewForward: round(this.viewForward),
      origin: round(this.origin),
      stageEye: round(this.stageEye),
      rangeReady: this.rangeReady,
      viewChildren: this.ctx.viewScene.children.map((c) => `${c.name}:${c.visible ? 1 : 0}`),
    };
  }

  // -------------------------------------------------------------------------
  // Scenarios
  // -------------------------------------------------------------------------

  /** The instantaneous part of a scenario. */
  private once(name: ScenarioName): void {
    switch (name) {
      case 'grenade':
        this.fx.explosion(this.origin, 5.4, 'grenade');
        break;
      case 'airstrike':
        this.fx.explosion(this.origin, 14, 'airstrike');
        break;
      case 'rocket':
        this.rocketPass();
        break;
      case 'smoke':
        this.fx.smoke(this.origin, 3.2, 14, 0xd8dade);
        this.fx.dust(this.origin, 2.6, 0.8);
        break;
      case 'wallsmoke':
        // Deliberately buried: the cloud centre sits about a metre off the wall
        // with sprites wider than that, and its base straddles the floor line,
        // so every sprite in it is intersecting something. If the depth fade is
        // working there is no straight edge anywhere in the frame.
        this.scratch.copy(this.origin).addScaledVector(this.originNormal, 1.0);
        this.scratch.y -= 1.1;
        this.fx.smoke(this.scratch, 2.2, 14, 0xc9ccd0);
        this.fx.dust(this.scratch, 2.2, 0.9);
        break;
      case 'fire':
        this.fx.fire(this.origin, 1.3, 26);
        break;
      case 'debris':
        this.fx.debrisBurst(this.origin, this.originNormal, 40, 'concrete');
        this.fx.impact(this.origin, this.originNormal, 'concrete', 1);
        break;
      case 'decals':
        this.decalBoard();
        break;
      case 'gunfire':
      case 'suppressed':
        // Also fired here so a driven capture always has a shot on the frame it
        // was asked for, rather than waiting on the cyclic timer.
        this.fireTimer = 0.086;
        this.shoot(name === 'suppressed');
        break;
      case 'flash':
        this.fireTimer = 0.1;
        this.worldFlash(false);
        break;
      case 'tracers':
        this.fireTimer = 0.05;
        this.crossTracer();
        break;
      case 'tracerspan':
        this.tracerSpan();
        break;
      default:
        break;
    }
  }

  /** The part of a scenario that has to keep running to fill every frame. */
  private continuous(name: ScenarioName, dt: number): void {
    switch (name) {
      case 'gunfire':
      case 'suppressed':
        // A realistic cyclic rate for the case and the tracer. The flash itself
        // is fired separately below, because a 50 ms flash on a 700 rpm cycle is
        // alive for well under half the frames and a screenshot then catches it
        // absent more often than present — which looks exactly like a flash that
        // was never emitted.
        this.every(dt, 0.086, () => this.shoot(name === 'suppressed'));
        if (this.driven) this.viewFlash(name === 'suppressed');
        break;
      case 'flash':
        this.every(dt, 0.1, () => this.worldFlash(false));
        break;
      case 'tracers':
        this.every(dt, 0.05, () => this.crossTracer());
        break;
      case 'concrete':
      case 'metal':
      case 'glass':
      case 'wood':
        this.every(dt, 0.07, () => this.strike(name as SurfaceType));
        break;
      case 'dirt':
      case 'sand':
      case 'gravel':
      case 'water':
        this.every(dt, 0.1, () => this.strike(name as SurfaceType));
        break;
      case 'blood':
        this.every(dt, 0.22, () => this.gore());
        break;
      default:
        break;
    }
  }

  private every(dt: number, period: number, action: () => void): void {
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;
    this.fireTimer = period;
    action();
  }

  /**
   * The first-person flash, at the viewmodel's own muzzle.
   *
   * The muzzle has to be measured rather than guessed: particles are depth
   * tested against the weapon, so a flash authored a few centimetres short of
   * the barrel is drawn entirely inside the gun and never appears.
   *
   * Fired once per frame while the scenario is held. A muzzle flash lives for
   * 50 ms, so at any frame rate a screenshot could plausibly be taken at, one
   * per frame is also one per flash — nothing stacks, and the shot is never of
   * the gap between two of them.
   */
  private viewFlash(suppressed: boolean): void {
    this.fx.muzzleFlash(this.viewMuzzle, this.viewForward, 1.05, suppressed, true);
  }

  private shoot(suppressed: boolean): void {
    if (!this.driven) this.viewFlash(suppressed);

    // The port sits back along the bore from the muzzle, on the right of the
    // receiver. Ejection is violent — 4 m/s out and up — and the case has to
    // clear the right edge of the frame while still ahead of the lens.
    this.ejectPoint
      .copy(this.viewMuzzle)
      .addScaledVector(this.viewForward, -0.3)
      .addScaledVector(RIGHT, 0.04);
    this.velocity.set(rng.range(3.2, 4.4), rng.range(1.4, 2.2), rng.range(-1.1, -0.4));
    this.fx.shellEject(this.ejectPoint, this.velocity, '5.56x45', true);

    this.worldFlash(suppressed);
  }

  /**
   * A shot fired across the view: a muzzle flash pointing sideways, the tracer
   * it launches and the case it throws. Fired down the camera axis it is a few
   * bright pixels and tells you nothing about the shape of any of them.
   */
  private worldFlash(suppressed: boolean): void {
    if (this.staged) {
      this.scratch.copy(this.origin).addScaledVector(this.right, -0.5);
      this.scratch2.copy(this.right);
    } else {
      this.scratch
        .copy(this.eye)
        .addScaledVector(this.right, -1.7)
        .addScaledVector(this.forward, 2.4)
        .addScaledVector(this.up, -0.2);
      this.scratch2.copy(this.forward);
    }
    this.fx.muzzleFlash(this.scratch, this.scratch2, 1.25, suppressed, false);

    this.hitPoint.copy(this.scratch).addScaledVector(this.scratch2, 26);
    this.fx.tracer(this.scratch, this.hitPoint, 0xffd39a, 760, 0.045);

    this.velocity
      .copy(this.scratch2)
      .multiplyScalar(-1.2)
      .addScaledVector(UP, 1.9)
      .addScaledVector(this.up, 0.3);
    this.fx.shellEject(this.scratch, this.velocity, '5.56x45', false);
  }

  private crossTracer(): void {
    this.scratch
      .copy(this.origin)
      .addScaledVector(this.right, -16)
      .addScaledVector(UP, rng.range(-0.3, 0.5));
    this.scratch2.copy(this.scratch).addScaledVector(this.right, 32);
    this.scratch2.y += rng.range(-0.2, 0.2);
    this.fx.tracer(this.scratch, this.scratch2, 0xffcf8a, 820, 0.05);
  }

  /**
   * The same round crossing the view at four depths at once.
   *
   * A tracer authored in metres is four centimetres wide, which is well under
   * one pixel by fifty metres out — so it either disappears or, worse, aliases
   * into a dotted line. Four in one frame at known distances is the only way to
   * see where that starts, and whether the fix holds the near ones honest.
   */
  private tracerSpan(): void {
    // Laid out on a level line at eye height, not along the camera's forward
    // axis: the stage looks slightly down at the floor, so stepping out along
    // `forward` from a floor-level origin buries the far end of the span under
    // the ground plane, where the depth test quietly removes it.
    this.velocity.copy(this.forward).setY(0);
    if (this.velocity.lengthSq() < 1e-6) this.velocity.set(0, 0, -1);
    this.velocity.normalize();
    for (let i = 0; i < TRACER_SPAN.length; i++) {
      const distance = TRACER_SPAN[i];
      this.scratch
        .copy(this.eye)
        .addScaledVector(this.velocity, distance)
        .addScaledVector(this.right, -TRACER_SPAN_LEAD);
      // Held a touch under the eye line so the streak crosses the ground plane
      // rather than the sky: a bright line on a bright sky is the one place a
      // tracer's width cannot be judged. Each depth is stepped down a little
      // further, because four horizontal lines at one height all project to the
      // same row of pixels and stack into what looks like a single tracer.
      this.scratch.y = this.eye.y - 0.35 - i * 0.55;
      this.scratch2
        .copy(this.scratch)
        .addScaledVector(this.right, TRACER_SPAN_LEAD + TRACER_SPAN_LEAD);
      this.fx.tracer(this.scratch, this.scratch2, 0xffcf8a, TRACER_SPAN_SPEED, 0.045);
    }
  }

  /**
   * Where the first-person flash goes, in the viewmodel scene's own space.
   *
   * The weapon module publishes its muzzle in world space, and the viewmodel
   * scene *is* camera space, so the camera's inverse world matrix converts one
   * to the other exactly. Guessing instead — a bounding-box centre, or the
   * frontmost vertex of the whole viewmodel — lands the flash inside the
   * receiver or on the magazine, where it is depth-tested away and the shot
   * appears to produce no flash at all.
   */
  private findViewMuzzle(): void {
    const weapons = this.ctx.tryGet<WeaponSystem>('weapons');
    if (weapons) {
      weapons.getMuzzlePosition(this.scratch);
      const camera = this.ctx.camera;
      camera.updateMatrixWorld();
      // Built here rather than read off the camera: three.js only refreshes the
      // inverse inside render(), so the camera's own copy is a frame stale.
      this.worldToView.copy(camera.matrixWorld).invert();
      this.viewMuzzle.copy(this.scratch).applyMatrix4(this.worldToView);
      if (this.viewMuzzle.lengthSq() > 1e-4) {
        // The bore points where the player is looking, which in the viewmodel
        // scene is straight down -Z. Taking the eye-to-muzzle line instead tilts
        // the axis by however far the barrel sits off the eye — six degrees up
        // and right at a ready pose — and sends the gas cone and the smoke off
        // across the sight picture instead of down the bore.
        this.viewForward.set(0, 0, -1);
        // Nudge clear of the crown so the flash is not half inside the barrel.
        this.viewMuzzle.addScaledVector(this.viewForward, 0.02);
        return;
      }
    }
    this.viewMuzzle.set(0.06, -0.02, -0.62);
    this.viewForward.set(0, 0, -1);
  }

  /** Impacts clustered on the staged surface, jittered across it. */
  private strike(surface: SurfaceType): void {
    const spread = 0.4;
    this.hitNormal.copy(this.originNormal);
    this.hitPoint
      .copy(this.origin)
      .addScaledVector(this.tangent, rng.range(-spread, spread))
      .addScaledVector(this.bitangent, rng.range(-spread, spread));
    this.fx.impact(this.hitPoint, this.hitNormal, surface, rng.range(0.7, 1));
    this.fx.decal(this.hitPoint, this.hitNormal, surface, rng.range(0.1, 0.16));
    this.scratch
      .copy(this.hitPoint)
      .addScaledVector(this.hitNormal, 8)
      .addScaledVector(this.tangent, -5);
    this.fx.tracer(this.scratch, this.hitPoint, 0xffd39a, 760, 0.04);
  }

  /**
   * One bullet hole per surface family, laid out on the wall against the metre
   * grid, at the size combat actually asks for.
   *
   * Decals are the effect most easily fooled about: a hole that has silently
   * ended up two centimetres across, or back-facing, or clipped away, looks
   * exactly like no decal at all in a screenshot of a firefight. A labelled row
   * at a known size turns that into one glance.
   */
  private decalBoard(): void {
    const surfaces: SurfaceType[] = [
      'concrete',
      'brick',
      'plaster',
      'metal',
      'wood',
      'glass',
      'dirt',
      'flesh',
    ];
    const spacing = 0.42;
    const left = (-(surfaces.length - 1) * spacing) / 2;
    this.hitNormal.copy(this.originNormal);
    for (let i = 0; i < surfaces.length; i++) {
      // Top row at the size combat passes, bottom row at four times that, so a
      // mark that is merely small is distinguishable from one that is broken.
      for (let row = 0; row < 2; row++) {
        this.hitPoint
          .copy(this.origin)
          .addScaledVector(this.tangent, left + i * spacing)
          .addScaledVector(this.bitangent, row === 0 ? 0.36 : -0.3);
        this.fx.decal(this.hitPoint, this.hitNormal, surfaces[i], row === 0 ? 0.09 : 0.36);
      }
    }
  }

  private gore(): void {
    this.hitPoint.copy(this.origin);
    this.hitNormal.copy(this.stageEye).sub(this.hitPoint).setY(0.12).normalize();
    this.fx.bloodSpray(this.hitPoint, this.hitNormal, 1);
  }

  private rocketPass(): void {
    this.rocketTime = 0;
    this.rocket.position.copy(this.origin).addScaledVector(this.right, -13);
    this.fx.contrail(this.rocket, 3.5);
  }

  private flyRocket(dt: number): void {
    this.rocketTime += dt;
    // Timed so the rocket is near the middle of the frame with most of its trail
    // behind it when the harness takes the shot, and detonates on the far side.
    this.rocket.position.addScaledVector(this.right, 22 * dt);
    if (this.rocketTime > 1.15) {
      this.rocketTime = -1;
      this.fx.explosion(this.rocket.position, 5, 'rocket');
    }
  }

  // -------------------------------------------------------------------------
  // Staging
  // -------------------------------------------------------------------------

  private trackCamera(): void {
    const camera = this.ctx.camera;
    camera.getWorldPosition(this.eye);
    const m = camera.matrixWorld.elements;
    this.right.set(m[0], m[1], m[2]).normalize();
    this.up.set(m[4], m[5], m[6]).normalize();
    this.forward.set(-m[8], -m[9], -m[10]).normalize();
  }

  /** The range floats above the level, keyed off wherever the player spawned. */
  private buildRange(): void {
    if (this.rangeReady) return;
    const world = this.ctx.tryGet<WorldSystem>('world');
    const ground = world?.sampleGround(this.eye.x, this.eye.z);
    this.scratch.set(
      this.eye.x,
      (ground ?? this.eye.y - 1.65) + RANGE_ALTITUDE,
      this.eye.z,
    );
    this.range.build(this.ctx, this.scratch);
    this.rangeReady = true;
  }

  /**
   * Resolve a scenario's effect origin and camera pose once, at the moment it is
   * pinned, so the camera is dead still for every frame of the capture instead
   * of following the player's idle sway.
   */
  private setStage(name: ScenarioName): void {
    const spec = STAGES[name];
    if (spec.mode === 'player') {
      this.staged = false;
      this.origin.copy(this.eye).addScaledVector(this.forward, 8);
      this.originNormal.set(0, 1, 0);
      this.tangent.set(1, 0, 0);
      this.bitangent.set(0, 0, 1);
      return;
    }

    if (spec.mode === 'wall') {
      this.origin.copy(this.range.wallPoint);
      this.originNormal.copy(this.range.wallNormal);
      this.tangent.set(1, 0, 0);
      this.bitangent.set(0, 1, 0);
    } else {
      this.origin.copy(this.range.floorCenter);
      this.origin.y += spec.lift ?? 0;
      this.originNormal.set(0, 1, 0);
      this.tangent.set(1, 0, 0);
      this.bitangent.set(0, 0, 1);
    }

    this.stageEye.set(
      this.origin.x + spec.eye[0],
      this.origin.y + spec.eye[1],
      this.origin.z + spec.eye[2],
    );
    this.stageTarget.set(
      this.origin.x + spec.look[0],
      this.origin.y + spec.look[1],
      this.origin.z + spec.look[2],
    );

    this.staged = true;
    // Pose the camera immediately so the effect that is about to be emitted is
    // authored against the framing it will be photographed in.
    const camera = this.ctx.camera;
    camera.position.copy(this.stageEye);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.stageTarget);
    camera.updateMatrixWorld(true);
    this.trackCamera();
  }

  private hideWeapon(): void {
    for (const child of this.ctx.viewScene.children) {
      if (child.name.startsWith('fx:') || !child.visible) continue;
      child.visible = false;
      if (!this.hidden.includes(child)) this.hidden.push(child);
    }
  }

  private restoreWeapon(): void {
    for (const child of this.hidden) child.visible = true;
    this.hidden.length = 0;
  }

  /**
   * Take the city out of a staged shot.
   *
   * Two reasons, and the second is the one that matters. A block of buildings
   * behind a dust puff is visual noise that makes it impossible to tell a
   * well-shaped puff from a badly-shaped one; and it is nine hundred draw calls
   * and three million triangles, which on the software rasteriser the capture
   * runs under is the difference between a frame arriving and the screenshot
   * timing out. Lights and sky stay so the range is lit exactly as the level is.
   */
  private hideLevel(): void {
    if (this.hiddenLevel.length) return;
    for (const child of this.ctx.scene.children) {
      if (!child.visible) continue;
      const light = child as THREE.Light;
      if (light.isLight) continue;
      if (child.name.startsWith('fx:')) continue;
      if (/sky/i.test(child.name)) continue;
      child.visible = false;
      this.hiddenLevel.push(child);
    }
  }

  private restoreLevel(): void {
    for (const child of this.hiddenLevel) child.visible = true;
    this.hiddenLevel.length = 0;
  }

  /**
   * `?fxatlas=1` — pin every baked atlas up in the viewmodel scene so the
   * procedural textures can be inspected directly instead of inferred from how a
   * sprite looked at forty metres.
   */
  private showAtlases(textures: FXTextures): void {
    const maps: THREE.Texture[] = [
      textures.glow.texture,
      textures.decal.texture,
      textures.smokeFlip.texture,
      textures.fireFlip.texture,
      textures.fireballFlip.texture,
      textures.puff.texture,
      textures.chip.texture,
      textures.blood.texture,
      textures.spark,
    ];
    const cols = 5;
    const rows = Math.ceil(maps.length / cols);
    const cell = 0.26;
    const z = -0.85;
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * cell * 1.06, rows * cell * 1.06),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a }),
    );
    backing.name = 'fx:atlasBacking';
    backing.position.set(0, 0, z - 0.01);
    backing.renderOrder = 39;
    this.ctx.viewScene.add(backing);
    this.atlasBoards.push(backing);

    for (let i = 0; i < maps.length; i++) {
      const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(cell * 0.96, cell * 0.96),
        new THREE.MeshBasicMaterial({ map: maps[i], transparent: true }),
      );
      quad.name = 'fx:atlasQuad';
      quad.position.set(
        ((i % cols) - (cols - 1) / 2) * cell,
        ((rows - 1) / 2 - Math.floor(i / cols)) * cell,
        z,
      );
      quad.renderOrder = 40;
      this.ctx.viewScene.add(quad);
      this.atlasBoards.push(quad);
    }
  }

  dispose(): void {
    this.restoreWeapon();
    this.restoreLevel();
    this.range.dispose();
    this.rocket.removeFromParent();
  }
}

const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);
const RIGHT = /* @__PURE__ */ new THREE.Vector3(1, 0, 0);

/** Simulation step the phase harness advances in. */
const PHASE_STEP = 1 / 60;

/** Distances, in metres, the tracer-span scenario puts a round at. */
const TRACER_SPAN: readonly number[] = [5, 15, 40, 90];

/**
 * Every round in the span flies the same path length from the same offset, so
 * one sample catches all four at the same point in their flight. Sizing the
 * path to the distance instead — the obvious thing — gives the near round a
 * four-metre trip it finishes in five milliseconds while the far one is still
 * leaving, and no single frame ever holds more than one of them.
 *
 * The heads all reach the centre of the view at `LEAD / SPEED`, which is the
 * moment worth photographing.
 */
const TRACER_SPAN_SPEED = 820;
const TRACER_SPAN_LEAD = 45;
