import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type { IKillstreaks, KillstreakDef } from '../core/Interfaces';
import type { QualitySettings } from '../core/Quality';
import { grabPassSupport, needsDepthPrepass } from '../fx/FrameState';
import { JetFlight, RUN_SPEED } from './Aircraft';
import { AirstrikeDirector, VARIANTS, type StrikeKind } from './Airstrike';
import { budgetFor, Deps, headingToDir, headingToRight, type Budget } from './Common';
import { AfterburnerSet, DistortionField } from './Exhaust';
import { DustHaze, GroundFire, SmokeColumns } from './Ground';
import { LADDER, type StreakDef } from './Ladder';
import { BombAssets } from './models/Bomb';
import { JetAssets } from './models/Jet';
import { OrdnanceField } from './Ordnance';
import { SupportStreaks } from './Support';
import { TacticalSymbology } from './Symbology';
import { TacticalHUD, type HudState } from './TacticalHUD';
import { Footprint, TacticalCamera, TacticalOverlay } from './Targeting';
import { TrailSystem } from './Trails';
import type { AirstrikeShowcase } from './AirstrikeShowcase';

/**
 * The killstreak system.
 *
 * Three things live here and only the first is interesting:
 *
 *  1. **The airstrike**, which is a directed three-act sequence rather than a
 *     mechanic — a targeting mode that takes the camera off the player's
 *     shoulders, a flight of aircraft that fly a real run-in, and an aftermath
 *     that refuses to clear. `Airstrike.ts` owns the direction; this file owns
 *     the frame loop, the camera and the input that get it there.
 *  2. **The economy** — the counter, the ladder and the pocket.
 *  3. **The support rewards**, which are in `Support.ts` and are deliberately
 *     quieter than the strike.
 *
 * ## The fixed step
 *
 * Everything in the package advances through `stepFixed`, which is only ever
 * called with a sixtieth of a second. Nothing reads `ctx.clock.delta`
 * directly. The reason is ballistics: a bomb whose fall is integrated at
 * whatever the frame rate happened to be lands in a slightly different place
 * every run, and the whole point of the showcase is that the crater is in the
 * same place twice. A slow frame runs the step several times rather than once
 * with a bigger number.
 *
 * ## The camera
 *
 * Two rules, both load-bearing. First, the controller is *frozen* rather than
 * disabled while the tactical view is up, because `PlayerSystem` re-adopts the
 * camera on an enabled-edge and disabling it would snap the view on the way
 * back. Second, if `player.enabled` is already false when a streak is called
 * then something else — the screenshot harness — has posed the camera, and
 * this system must not take it. The targeting *interface* still comes up in
 * that case; only the camera move is skipped, which is exactly what lets the
 * showcase photograph the tactical view from a fixed vantage point.
 *
 * The return from the tactical view is interpolated too, and the strike is
 * launched at the *start* of that interpolation rather than at the end: the
 * player confirms, the view falls back into their own eyes, and the jets are
 * already being called in over the top of the move.
 *
 * ## Allocation
 *
 * Nothing here allocates after `init`. Aircraft, stores, bomblets, ribbons,
 * fire patches, dust cells and marker vertices are pooled at boot and sized
 * from `ctx.quality`; every event payload is a module-level singleton refilled
 * in place. The one exception is `IAI.query`, which returns a fresh array and
 * is therefore polled at 8 Hz during targeting rather than once a frame.
 */

/** The simulation tick. Never varies. */
const FIXED = 1 / 60;
/** Seconds of accumulated lag the fixed step will try to catch up on. */
const MAX_CATCHUP = 0.25;
/** Seconds the player has to choose a target before the streak is handed back. */
const TARGET_TIMEOUT = 10;
/** Sky visibility below which a target is under a roof and cannot be reached. */
const SKY_MINIMUM = 0.45;
/** Metres past the world bounds beyond which a falling store is abandoned. */
const PLAY_MARGIN = 90;
/** Height above terrain at which a ground reading is worth interrogating. */
const POLE_MIN = 2.5;
/** How close a store has to be before it is worth asking. */
const POLE_CHECK = 6;
/** Where the neighbours are sampled to tell a roof from a tree, in metres. */
const POLE_PROBES: Array<[number, number]> = [
  [2, 0],
  [-2, 0],
  [0, 2],
  [0, -2],
];

/** Where the footprint is probed for overhead clearance: along, across. */
const SKY_PROBES: Array<[number, number]> = [
  [0, 0],
  [0.62, 0],
  [-0.62, 0],
  [0.3, 0.7],
  [-0.3, -0.7],
];

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _buffer = new THREE.Vector2();
const _poseQuat = new THREE.Quaternion();
/** Kicked-up masonry dust: pale, warm and slightly pink in this light. */
const _dustColor = new THREE.Color(0.76, 0.68, 0.56);

const _progressEvt = { kills: 0, next: null as string | null };
const _earnedEvt = { id: '', name: '' };
const _spentEvt = { id: '', name: '' };
const _cancelEvt = { id: '' };
const _targetingEvt = { active: false, id: '' };
const _targetEvt = {
  position: new THREE.Vector3(),
  heading: 0,
  valid: false,
  reason: '',
  enemies: 0,
  timeLeft: 0,
};
const _phaseEvt = {
  kind: 'carpet' as StrikeKind,
  phase: 'targeting' as 'targeting' | 'inbound' | 'impact' | 'aftermath',
  secondsRemaining: 0,
};
const _notify = {
  title: '',
  subtitle: '',
  duration: 3,
  tone: 'positive' as 'neutral' | 'positive' | 'warning' | 'danger',
};
const _audio = { id: '', position: new THREE.Vector3(), volume: 1, rate: 1 };
const _hud: HudState = {
  title: '',
  ordnance: '',
  pattern: '',
  heading: 0,
  enemies: 0,
  sky: 1,
  valid: true,
  reason: '',
  secondsLeft: 0,
  markerX: -1,
  markerY: -1,
  range: 0,
};

/** What the panel calls each variant's load. Cosmetic, but it has to be right. */
const ORDNANCE: Record<StrikeKind, string> = {
  precision: '1 × 2000 LB GBU',
  carpet: '7 × 500 LB RETARDED',
  cluster: '2 × CBU DISPENSER',
  napalm: '4 × 750 LB INCENDIARY',
};

const SUPPORT_ORDNANCE: Record<string, string> = {
  uav: 'ORBITAL SWEEP',
  package: 'PARACHUTED CRATE',
  mortar: '12 × 81 MM HE',
  helicopter: '30 MM CHIN GUN',
  gunship: '105 MM / 40 MM / 25 MM',
};

/** Footprint of a streak: half-length along the run-in, half-width across it. */
interface Shape {
  length: number;
  width: number;
  round: boolean;
}

const SUPPORT_SHAPES: Record<string, Shape> = {
  package: { length: 5, width: 5, round: true },
  mortar: { length: 22, width: 22, round: true },
};

function shapeFor(def: StreakDef): Shape {
  if (def.strike) {
    const v = VARIANTS[def.strike];
    return { length: v.footLength, width: v.footWidth, round: v.round };
  }
  return SUPPORT_SHAPES[def.support ?? ''] ?? { length: 10, width: 10, round: true };
}

/* ------------------------------ targeting input ---------------------------- */

/**
 * Input for the tactical view and the gunner's seat.
 *
 * The engine's own `InputManager` is switched off for the duration and this
 * takes its place, which is heavy-handed but is the only way to stop the rifle
 * firing on the confirm click: the weapon reads `isDown('fire')`, and the
 * player controller drains the look accumulator before this system ever runs,
 * so sharing the manager would mean either a wasted round downrange or a
 * reticle that does not move.
 */
class TargetingInput {
  dx = 0;
  dy = 0;
  wheel = 0;
  primary = false;
  secondary = false;
  cancel = false;
  /** -1 rotates the run-in anticlockwise, +1 clockwise; held, not edged. */
  spin = 0;

  private readonly detach: Array<() => void> = [];
  private wasEnabled = true;

  attach(canvas: HTMLElement, input: { enabled: boolean }): void {
    if (this.detach.length) return;
    this.wasEnabled = input.enabled;
    input.enabled = false;
    this.reset();

    const on = <T extends Event>(
      target: EventTarget,
      type: string,
      fn: (e: T) => void,
      opts?: AddEventListenerOptions,
    ): void => {
      const handler = fn as EventListener;
      target.addEventListener(type, handler, opts);
      this.detach.push(() => target.removeEventListener(type, handler, opts));
    };

    on<MouseEvent>(window, 'mousemove', (e) => {
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    on<WheelEvent>(
      canvas,
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheel += e.deltaY;
      },
      { passive: false },
    );
    on<MouseEvent>(canvas, 'mousedown', (e) => {
      if (e.button === 0) this.primary = true;
      if (e.button === 2) this.secondary = true;
    });
    on<KeyboardEvent>(window, 'keydown', (e) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'Escape':
          this.cancel = true;
          break;
        case 'Space':
        case 'Enter':
          e.preventDefault();
          this.primary = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.spin = -1;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.spin = 1;
          break;
        default:
          break;
      }
    });
    on<KeyboardEvent>(window, 'keyup', (e) => {
      if ((e.code === 'KeyA' || e.code === 'ArrowLeft') && this.spin < 0) this.spin = 0;
      if ((e.code === 'KeyD' || e.code === 'ArrowRight') && this.spin > 0) this.spin = 0;
    });
    on<Event>(window, 'blur', () => this.reset());
  }

  release(input: { enabled: boolean }): void {
    for (const off of this.detach) off();
    this.detach.length = 0;
    input.enabled = this.wasEnabled;
    this.reset();
  }

  get held(): boolean {
    return this.detach.length > 0;
  }

  reset(): void {
    this.drain();
    this.spin = 0;
  }

  /** Consumes the accumulated deltas and edges, leaving held keys alone. */
  drain(): void {
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
    this.primary = false;
    this.secondary = false;
    this.cancel = false;
  }
}

/* ---------------------------------- system --------------------------------- */

const Mode = { IDLE: 0, TARGETING: 1, RETURNING: 2, GUNSHIP: 3 } as const;

export default class KillstreakSystem implements System, IKillstreaks {
  readonly key = 'killstreaks';
  readonly order = 75;

  private ctx!: GameContext;
  private readonly deps = new Deps();
  private budget!: Budget;

  private jetAssets!: JetAssets;
  private bombAssets!: BombAssets;
  private trails!: TrailSystem;
  private burners!: AfterburnerSet;
  private distortion: DistortionField | null = null;
  private fire!: GroundFire;
  private haze!: DustHaze;
  private smoke!: SmokeColumns;
  private flight!: JetFlight;
  private ordnance!: OrdnanceField;
  private director!: AirstrikeDirector;
  private support!: SupportStreaks;
  private footprint!: Footprint;
  private symbology!: TacticalSymbology;
  private overlay!: TacticalOverlay;
  private hud!: TacticalHUD;
  private readonly tactical = new TacticalCamera();
  private showcase: AirstrikeShowcase | null = null;

  /* --- economy --- */
  private kills = 0;
  private best = 0;
  private readonly pocket: string[] = [];

  /* --- targeting --- */
  private mode: number = Mode.IDLE;
  private pending: StreakDef | null = null;
  private readonly aim = new THREE.Vector3();
  private aimHeading = 0;
  private targetLeft = 0;
  private targetValid = false;
  private targetReason = '';
  private targetEnemies = 0;
  /** Positions of the hostiles inside the box, for the threat diamonds. */
  private readonly threats: THREE.Vector3[] = Array.from(
    { length: 16 },
    () => new THREE.Vector3(),
  );
  private queryAt = 0;
  private cameraOwned = false;
  private baseFov = 80;
  private readonly input = new TargetingInput();

  /* --- frame --- */
  private accumulator = 0;
  private simTime = 0;
  private frozen = false;
  private readonly teardown: Array<() => void> = [];
  private disposed = false;

  /* ================================= boot ================================= */

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.deps.refresh(ctx);
    this.budget = budgetFor(ctx);

    const shadows = ctx.quality.shadows;
    const grab = grabPassSupport(ctx.renderer, ctx.quality);
    const canGrab = grab.enabled && this.budget.grabPass;

    this.jetAssets = new JetAssets(this.deps.materials, shadows);
    this.bombAssets = new BombAssets(this.deps.materials);
    this.burners = new AfterburnerSet();
    // Three aircraft lay a contrail and two vortices each, and half a stick
    // trails smoke. Allocated once; the pool is never grown mid-strike.
    this.trails = new TrailSystem(ctx.scene, 14, this.budget.trailSegments);

    this.distortion = canGrab
      ? new DistortionField(ctx.scene, this.budget.hazeCells, true, grab.type)
      : null;
    this.fire = new GroundFire(ctx.scene, this.budget.fireQuads);
    this.smoke = new SmokeColumns(ctx.scene, this.budget.smokePuffs);
    this.haze = new DustHaze(ctx.scene, this.budget.dustCells);
    this.flight = new JetFlight(ctx.scene, this.jetAssets, this.burners, this.trails, 3);
    this.ordnance = new OrdnanceField(
      ctx.scene,
      this.bombAssets,
      this.trails,
      shadows,
      this.budget.bomblets * 2,
    );

    const ground = (x: number, z: number): number => this.deps.groundAt(x, z);
    this.ordnance.groundAt = this.ordnanceGround;
    this.ordnance.inPlay = this.inPlay;
    this.fire.groundAt = ground;

    this.director = new AirstrikeDirector(
      ctx,
      this.deps,
      this.budget,
      this.flight,
      this.ordnance,
      this.fire,
      this.haze,
      this.smoke,
      this.distortion,
    );
    this.support = new SupportStreaks(ctx, this.deps, this.budget, this.haze, shadows);
    this.footprint = new Footprint(ctx.scene);
    this.symbology = new TacticalSymbology(ctx.scene);
    this.overlay = new TacticalOverlay(ctx.scene, grab.enabled, grab.type);
    this.hud = new TacticalHUD();
    this.overlay.setHud(this.hud.texture);

    ctx.renderer.getDrawingBufferSize(_buffer);
    this.resize(_buffer.x, _buffer.y);

    this.listen();
    this.emitProgress();

    if (location.search.includes('showcase=airstrike')) {
      try {
        const mod = await import('./AirstrikeShowcase');
        this.showcase = new mod.AirstrikeShowcase(ctx, this);
      } catch (err) {
        console.error('[killstreaks] showcase failed to load:', err);
      }
    }
  }

  private listen(): void {
    const events = this.ctx.events;
    this.teardown.push(
      events.on('enemy:death', () => this.onKill()),
      events.on('player:death', () => this.onPlayerDeath()),
      events.on('killstreak:call', (e) => {
        this.activate(e.id);
      }),
      events.on('airstrike:request', (e) => {
        this.callAirstrikeKind(e.kind, this.defaultTarget(_v2));
      }),
      events.on('game:restart', () => {
        this.reset();
        this.kills = 0;
        this.pocket.length = 0;
        this.emitProgress();
      }),
    );
  }

  /* =============================== economy ================================ */

  private onKill(): void {
    this.kills++;
    if (this.kills > this.best) this.best = this.kills;
    for (const def of LADDER) {
      if (def.killsRequired !== this.kills) continue;
      if (this.pocket.includes(def.id)) break;
      this.pocket.push(def.id);
      _earnedEvt.id = def.id;
      _earnedEvt.name = def.name;
      this.ctx.events.emit('killstreak:earned', _earnedEvt);
      _notify.title = def.name;
      _notify.subtitle = def.description;
      _notify.duration = 3.4;
      _notify.tone = 'positive';
      this.ctx.events.emit('ui:notify', _notify);
      this.sound('killstreak_earned', 0.9);
      break;
    }
    this.emitProgress();
  }

  /**
   * Death costs the counter but not the pocket.
   *
   * The alternative — losing an unspent fifteen-kill reward to a stray
   * grenade — is faithful to the games this borrows from and teaches exactly
   * the wrong lesson, which is to cash a streak the instant it lands rather
   * than hold it for the moment it is worth the most. The counter resets;
   * what has already been earned stays earned.
   */
  private onPlayerDeath(): void {
    this.kills = 0;
    this.emitProgress();
    if (this.mode === Mode.TARGETING) this.cancel();
  }

  private emitProgress(): void {
    _progressEvt.kills = this.kills;
    _progressEvt.next = this.nextDef()?.id ?? null;
    this.ctx.events.emit('killstreak:progress', _progressEvt);
  }

  private nextDef(): StreakDef | null {
    for (const def of LADDER) {
      if (!this.pocket.includes(def.id) && def.killsRequired > this.kills) return def;
    }
    return null;
  }

  /* ============================== IKillstreaks ============================= */

  get available(): KillstreakDef[] {
    return LADDER;
  }

  get earned(): string[] {
    return this.pocket;
  }

  get killstreak(): number {
    return this.kills;
  }

  get bestStreak(): number {
    return this.best;
  }

  get active(): boolean {
    return this.director.active || this.support.anyActive || this.mode !== Mode.IDLE;
  }

  get targeting(): boolean {
    return this.mode === Mode.TARGETING;
  }

  get activeStreak(): string | null {
    if (this.mode === Mode.TARGETING) return this.pending?.id ?? null;
    if (this.director.active) return this.director.kind;
    if (this.support.gunshipLeft > 0) return 'gunship';
    if (this.support.anyActive) return 'support';
    return null;
  }

  get next(): KillstreakDef | null {
    return this.nextDef();
  }

  get killsToNext(): number {
    const def = this.nextDef();
    return def ? Math.max(0, def.killsRequired - this.kills) : 0;
  }

  get uavActive(): boolean {
    return this.support.uavLeft > 0;
  }

  /** Enters targeting for a streak, or fires it outright if it needs no target. */
  activate(id: string): boolean {
    if (!this.pocket.includes(id)) return false;
    const def = LADDER.find((s) => s.id === id);
    if (!def) return false;
    if (this.mode !== Mode.IDLE) return false;
    // One aircraft over the map at a time. Two overlapping strikes are not
    // twice the spectacle, they are a mess in which neither can be read.
    if (this.director.active && def.strike) return false;

    if (!def.targeted) {
      this.spend(def);
      this.fireSupport(def, this.defaultTarget(_v2), this.playerHeading());
      return true;
    }
    return this.enterTargeting(def);
  }

  cancel(): void {
    if (this.mode === Mode.TARGETING) {
      const def = this.pending;
      this.leaveTargeting();
      if (def) {
        _cancelEvt.id = def.id;
        this.ctx.events.emit('killstreak:cancel', _cancelEvt);
        // Nothing was spent, so it goes back where it came from.
        if (!this.pocket.includes(def.id)) this.pocket.push(def.id);
      }
      return;
    }
    if (this.director.active) this.director.end(true);
    if (this.mode === Mode.GUNSHIP) this.endGunship();
  }

  /** Aborts the cinematic. Ordnance already in the air is left to land. */
  skip(): void {
    if (this.mode === Mode.TARGETING) {
      this.confirm();
      return;
    }
    if (this.director.active) this.director.skip();
    if (this.mode === Mode.GUNSHIP) this.endGunship();
  }

  grant(id: string): boolean {
    const def = LADDER.find((s) => s.id === id);
    if (!def || this.pocket.includes(id)) return false;
    this.pocket.push(id);
    _earnedEvt.id = def.id;
    _earnedEvt.name = def.name;
    this.ctx.events.emit('killstreak:earned', _earnedEvt);
    this.emitProgress();
    return true;
  }

  callAirstrike(target: THREE.Vector3, heading?: number): void {
    this.callAirstrikeKind('carpet', target, heading);
  }

  callAirstrikeKind(kind: StrikeKind, target: THREE.Vector3, heading?: number): boolean {
    if (this.director.active) return false;
    this.director.begin(kind, target, heading ?? this.playerHeading());
    return true;
  }

  private spend(def: StreakDef): void {
    const index = this.pocket.indexOf(def.id);
    if (index >= 0) this.pocket.splice(index, 1);
    _spentEvt.id = def.id;
    _spentEvt.name = def.name;
    this.ctx.events.emit('killstreak:spent', _spentEvt);
    this.emitProgress();
  }

  /* ============================== targeting =============================== */

  private enterTargeting(def: StreakDef): boolean {
    this.pending = def;
    this.mode = Mode.TARGETING;
    this.targetLeft = TARGET_TIMEOUT;
    this.queryAt = 0;
    this.tactical.blend = 0;

    this.defaultTarget(this.aim);
    this.aimHeading = this.playerHeading();

    const camera = this.ctx.camera;
    this.baseFov = camera.fov;
    this.tactical.capture(camera);
    const shape = shapeFor(def);
    this.tactical.frame(this.deps.sky?.sunAzimuth ?? 2.2, Math.max(shape.length, shape.width));

    // The harness poses the camera by disabling the controller. When that has
    // happened the interface still comes up — the showcase photographs it —
    // but the camera and the input stay exactly where they were put.
    const player = this.deps.player;
    this.cameraOwned = !!player && player.enabled !== false;
    if (this.cameraOwned) {
      player?.setFrozen?.(true);
      this.input.attach(this.ctx.canvas, this.ctx.input);
    }

    // Held down from the activation click, or the confirm fires on frame one.
    this.input.drain();

    _targetingEvt.active = true;
    _targetingEvt.id = def.id;
    this.ctx.events.emit('killstreak:targeting', _targetingEvt);
    if (def.strike) this.emitPhase(def.strike, 'targeting', TARGET_TIMEOUT);
    this.sound('killstreak_tactical_open', 0.8);
    return true;
  }

  /**
   * Hands the controls back and starts the camera home.
   *
   * The eye does not cut back: `RETURNING` keeps the pose for the length of
   * the fall, which is why a confirmed strike is called in over the top of the
   * move rather than after it.
   */
  private leaveTargeting(): void {
    const def = this.pending;
    if (this.input.held) this.input.release(this.ctx.input);
    this.footprint.hide();
    this.symbology.hide();
    this.pending = null;
    if (def) {
      _targetingEvt.active = false;
      _targetingEvt.id = def.id;
      this.ctx.events.emit('killstreak:targeting', _targetingEvt);
    }
    if (this.cameraOwned) {
      this.mode = Mode.RETURNING;
    } else {
      this.overlay.set(0, this.simTime);
      this.mode = Mode.IDLE;
    }
  }

  private stepReturn(dt: number): void {
    this.tactical.blend = Math.max(0, this.tactical.blend - dt * 2.4);
    this.overlay.set(this.tactical.blend, this.simTime);
    if (this.tactical.blend > 0) return;
    // Landing exactly on the captured pose, so unfreezing the controller is
    // not a jump: the player never moved, and neither did their eye.
    this.tactical.apply(this.ctx.camera, this.aim, this.baseFov);
    this.overlay.set(0, this.simTime);
    this.deps.player?.setFrozen?.(false);
    this.cameraOwned = false;
    this.mode = Mode.IDLE;
  }

  private confirm(): void {
    const def = this.pending;
    if (!def) return;
    if (!this.targetValid) {
      this.sound('ui_denied', 0.6);
      return;
    }
    _v.copy(this.aim);
    const heading = this.aimHeading;
    this.spend(def);
    this.leaveTargeting();
    if (def.strike) this.director.begin(def.strike, _v, heading);
    else this.fireSupport(def, _v, heading);
  }

  private stepTargeting(dt: number): void {
    const def = this.pending;
    if (!def) return;

    // The lift. Fast enough not to be a wait, slow enough to read.
    this.tactical.blend = Math.min(1, this.tactical.blend + dt * 1.7);

    if (this.cameraOwned) {
      const input = this.input;
      // Metres per pixel, derived from the standoff rather than tuned, so the
      // reticle covers the same ground per centimetre of mouse at every
      // altitude the lift passes through.
      const camera = this.ctx.camera;
      this.ctx.renderer.getDrawingBufferSize(_buffer);
      const drop = Math.max(6, camera.position.y - this.aim.y);
      const mpp = (2 * drop * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, _buffer.y);
      const gain = mpp * 1.4;

      // Screen right and screen forward, flattened onto the ground: pushing
      // the mouse away must push the marker away from the camera.
      camera.getWorldDirection(_fwd);
      _fwd.y = 0;
      if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1);
      _fwd.normalize();
      _right.set(-_fwd.z, 0, _fwd.x);
      this.aim.addScaledVector(_right, input.dx * gain);
      this.aim.addScaledVector(_fwd, -input.dy * gain);

      this.aimHeading += input.wheel * 0.0024 + input.spin * dt * 1.5;

      const bail = input.cancel || input.secondary;
      const go = input.primary;
      input.drain();
      if (bail) {
        this.cancel();
        return;
      }
      if (go) {
        this.confirm();
        return;
      }
    }

    this.clampToBounds(this.aim);
    this.aim.y = this.deps.groundAt(this.aim.x, this.aim.z, this.aim.y + 60);

    this.validate(def, dt);
    this.paint(def, this.tactical.blend);

    this.targetLeft -= dt;
    if (this.targetLeft <= 0) {
      this.sound('killstreak_timeout', 0.7);
      this.cancel();
    }
  }

  /**
   * Whether the marker is somewhere the ordnance can reach.
   *
   * Sky visibility is the whole test and it is the right one: a target under
   * the souk canopy or inside the underpass is not merely a bad idea, it is
   * geometrically unreachable by something falling out of an aeroplane. The
   * footprint is probed at five points rather than one, so a marker sitting
   * half under an arcade fails — which is the same thing the player can see
   * happening to the marker itself, since the marker is depth-tested.
   */
  private validate(def: StreakDef, dt: number): void {
    const world = this.deps.world;
    const shape = shapeFor(def);
    this.targetReason = '';
    this.targetValid = true;

    headingToDir(this.aimHeading, _fwd);
    headingToRight(this.aimHeading, _right);

    if (world && !world.inBounds(this.aim)) {
      this.targetValid = false;
      this.targetReason = 'OUT OF SECTOR';
    } else if (world) {
      let sky = 0;
      for (const [along, across] of SKY_PROBES) {
        _v.set(
          this.aim.x + _fwd.x * along * shape.length + _right.x * across * shape.width,
          this.aim.y + 1.2,
          this.aim.z + _fwd.z * along * shape.length + _right.z * across * shape.width,
        );
        sky += world.skyVisibility(_v);
      }
      if (sky / SKY_PROBES.length < SKY_MINIMUM) {
        this.targetValid = false;
        this.targetReason = 'NO OVERHEAD CLEARANCE';
      }
    }

    // `IAI.query` returns a fresh array, so it is polled rather than sampled
    // every frame; eight times a second is quicker than the eye reads a digit.
    this.queryAt -= dt;
    if (this.queryAt > 0) return;
    this.queryAt = 0.125;
    const ai = this.deps.ai;
    if (!ai) {
      this.targetEnemies = 0;
      return;
    }
    const list = ai.query(this.aim, Math.max(shape.length, shape.width));
    let inside = 0;
    for (const enemy of list) {
      if (!enemy.alive) continue;
      _v.copy(enemy.position).sub(this.aim);
      const along = Math.abs(_v.dot(_fwd)) / shape.length;
      const across = Math.abs(_v.dot(_right)) / shape.width;
      if (shape.round ? along * along + across * across <= 1 : along <= 1 && across <= 1) {
        if (inside < this.threats.length) this.threats[inside].copy(enemy.position);
        inside++;
      }
    }
    this.targetEnemies = inside;
  }

  private paint(def: StreakDef, fade: number): void {
    const shape = shapeFor(def);
    this.footprint.place(
      this.aim,
      this.aimHeading,
      shape.length,
      shape.width,
      shape.round,
      this.groundSampler,
    );
    this.footprint.setValidity(this.targetValid, this.simTime, fade);

    // Where the stick will actually land, from the same numbers the director
    // integrates, so the chevrons are a promise rather than an illustration.
    const variant = def.strike ? VARIANTS[def.strike] : null;
    const spacing = variant ? RUN_SPEED * variant.interval : 0;
    const craters = variant ? variant.count : 0;
    this.symbology.build(
      this.aim,
      this.aimHeading,
      shape.length,
      shape.width,
      shape.round,
      this.targetValid,
      this.simTime,
      fade,
      spacing,
      craters,
      this.threats,
      Math.min(this.targetEnemies, this.threats.length),
      Math.ceil(Math.max(0, this.targetLeft)),
      this.groundSampler,
    );
    this.paintHud(def, variant, shape);
    // Full strength, not nine tenths. The last tenth of the untreated frame is
    // still HDR, and at golden hour a tenth of a sunlit roof is brighter than
    // the whole of the flattened image underneath it — the grade came out warm
    // and the map read as itself with a grid drawn on it.
    this.overlay.set(fade, this.simTime);

    _targetEvt.position.copy(this.aim);
    _targetEvt.heading = this.aimHeading;
    _targetEvt.valid = this.targetValid;
    _targetEvt.reason = this.targetReason;
    _targetEvt.enemies = this.targetEnemies;
    _targetEvt.timeLeft = Math.max(0, this.targetLeft);
    this.ctx.events.emit('killstreak:target', _targetEvt);
  }

  /**
   * Fills the screen-space panel.
   *
   * The marker position is the aim point projected through the *live* camera,
   * so the reticle bracket and its leader track the box through the whole
   * camera lift rather than snapping into place at the top of it.
   */
  private paintHud(def: StreakDef, variant: (typeof VARIANTS)[StrikeKind] | null, shape: Shape): void {
    const state = _hud;
    state.title = def.name.toUpperCase();
    state.ordnance = variant ? ORDNANCE[def.strike as StrikeKind] : SUPPORT_ORDNANCE[def.id] ?? '—';
    state.pattern = shape.round
      ? `${Math.round(shape.length * 2)} M CIRCLE`
      : `${Math.round(shape.length * 2)} × ${Math.round(shape.width * 2)} M`;
    state.heading = this.aimHeading;
    state.enemies = this.targetEnemies;
    state.sky = this.skyAt(this.aim);
    state.valid = this.targetValid;
    state.reason = this.targetReason;
    state.secondsLeft = Math.max(0, this.targetLeft);
    state.range = this.deps.player
      ? Math.hypot(this.aim.x - this.deps.player.position.x, this.aim.z - this.deps.player.position.z)
      : 0;

    _v.copy(this.aim).project(this.ctx.camera);
    const onScreen = _v.z > -1 && _v.z < 1;
    state.markerX = onScreen ? _v.x * 0.5 + 0.5 : -1;
    state.markerY = onScreen ? 0.5 - _v.y * 0.5 : -1;

    this.hud.update(state);
  }

  /** Overhead clearance over the aim point, for the panel's readout. */
  private skyAt(at: THREE.Vector3): number {
    const world = this.deps.world;
    if (!world) return 1;
    _v2.set(at.x, at.y + 1.2, at.z);
    return world.skyVisibility(_v2);
  }

  /**
   * The surface the footprint marker is laid on. Bound once so rebuilding the
   * marker does not allocate a closure a frame.
   *
   * Terrain, deliberately, rather than the collision floor. A marker that
   * follows the collision floor climbs every roof it crosses, and since the
   * whole point of the plan view is to show a strike walking *between* the
   * buildings, a footprint that walks over them instead reads as a scatter of
   * green marks on rooftops rather than as a box drawn on a street. Following
   * the terrain draws the box the player is actually thinking about and lets
   * the buildings occlude the parts of it they stand on, which is the correct
   * answer to "can I put ordnance there" anyway.
   */
  private readonly groundSampler = (x: number, z: number): number =>
    (this.deps.world?.terrainHeight(x, z) ?? this.deps.groundAt(x, z, this.aim.y + 40)) + 0.06;

  /**
   * What a falling store is allowed to hit.
   *
   * There are two things wrong with asking the physics world for a ground
   * height and detonating a bomb on it, and both of them put craters in the
   * wrong place.
   *
   * The first is outside the level. A store released three hundred metres out
   * at seventy metres is descending across ground the level was never built to
   * be flown over, and the collision geometry out there is not landscape — it
   * is whatever holds the skybox up. Al-Rashid Crossing has a fourteen-metre
   * slab of it a couple of metres past the north wall, and every carpet run
   * from the north used to detonate its first two bombs in mid-air over open
   * desert. Past the wire, therefore, the terrain and nothing else.
   *
   * The second is street furniture. A downward raycast does not know the
   * difference between the roof of a house and the crown of a date palm, and
   * the street this range is sited down is lined with them: the stick lost two
   * of seven bombs to trees, each detonating seven metres up and leaving a gap
   * in the walking line. A 227 kg bomb arriving at forty metres a second is
   * not stopped by a palm, so a reading that stands well above terrain has to
   * earn it — if the ground two metres to either side is not also high, the
   * thing under the bomb is a trunk or a mast and the bomb goes through it.
   *
   * The four extra rays only happen for a store that is within a few metres of
   * something tall, which is a handful of frames at the end of a fall.
   */
  private readonly ordnanceGround = (x: number, z: number, y: number): number => {
    const world = this.deps.world;
    const terrain = world?.terrainHeight(x, z) ?? 0;
    if (world && !world.inBounds(_v3.set(x, 0, z))) return terrain;
    const ground = this.deps.groundAt(x, z);
    if (ground < terrain + POLE_MIN || y > ground + POLE_CHECK) return ground;
    let broad = 0;
    for (let i = 0; i < POLE_PROBES.length; i++) {
      const [dx, dz] = POLE_PROBES[i];
      if (this.deps.groundAt(x + dx, z + dz) > terrain + POLE_MIN * 0.5) broad++;
    }
    return broad >= 2 ? ground : terrain;
  };

  /** Far enough out that a store is never coming back; it is simply binned. */
  private readonly inPlay = (x: number, z: number): boolean => {
    const bounds = this.deps.world?.bounds;
    if (!bounds) return true;
    return (
      x > bounds.min.x - PLAY_MARGIN &&
      x < bounds.max.x + PLAY_MARGIN &&
      z > bounds.min.z - PLAY_MARGIN &&
      z < bounds.max.z + PLAY_MARGIN
    );
  };

  /* ============================== support ================================ */

  private fireSupport(def: StreakDef, target: THREE.Vector3, heading: number): void {
    switch (def.support) {
      case 'uav':
        this.support.startUav(def.duration ?? 30);
        break;
      case 'package':
        this.support.dropPackage(target);
        break;
      case 'mortar':
        this.support.startMortars(target, heading);
        break;
      case 'helicopter':
        this.support.startHelicopter(def.duration ?? 58);
        break;
      case 'gunship':
        this.startGunship(def);
        break;
      default:
        break;
    }
  }

  private startGunship(def: StreakDef): void {
    const player = this.deps.player;
    // The gunship takes the camera outright. If the harness owns it, the
    // rounds still land — the player simply watches from where they are.
    this.cameraOwned = !!player && player.enabled !== false;
    if (this.cameraOwned) {
      this.baseFov = this.ctx.camera.fov;
      player?.setFrozen?.(true);
      this.input.attach(this.ctx.canvas, this.ctx.input);
      this.input.drain();
    }
    this.mode = Mode.GUNSHIP;
    this.support.startGunship(def.duration ?? 42);
  }

  private stepGunship(dt: number): void {
    const input = this.input;
    const bail = input.cancel;
    const still = this.support.stepGunship(
      dt,
      input.dx * 0.0011,
      input.dy * 0.0011,
      input.primary,
      input.secondary,
      this.ctx.camera,
    );
    input.drain();
    if (!still || bail) this.endGunship();
  }

  private endGunship(): void {
    this.support.gunshipLeft = 0;
    if (this.input.held) this.input.release(this.ctx.input);
    if (this.cameraOwned) {
      this.ctx.camera.fov = this.baseFov;
      this.ctx.camera.updateProjectionMatrix();
      this.deps.player?.setFrozen?.(false);
    }
    this.cameraOwned = false;
    this.mode = Mode.IDLE;
  }

  /* ================================ frame ================================= */

  update(dt: number, ctx: GameContext): void {
    this.deps.refresh(ctx);
    this.pollHotkeys();
    if (this.frozen) return;

    this.accumulator += Math.min(dt, MAX_CATCHUP);
    let guard = 8;
    while (this.accumulator >= FIXED && guard-- > 0) {
      this.accumulator -= FIXED;
      this.stepFixed(FIXED);
    }
    if (guard <= 0) this.accumulator = 0;
  }

  /**
   * One tick of everything the package owns.
   *
   * Order matters in two places. The distortion field is opened before the
   * aircraft fly, because that is when they fill it, and committed after. The
   * ribbons are advanced last, because their timestamps come from points laid
   * during the flight update.
   */
  stepFixed(dt: number): void {
    this.simTime += dt;
    const time = this.simTime;

    if (this.mode === Mode.TARGETING) this.stepTargeting(dt);
    else if (this.mode === Mode.RETURNING) this.stepReturn(dt);
    else if (this.mode === Mode.GUNSHIP) this.stepGunship(dt);

    this.distortion?.begin(time);
    this.director.step(dt, time);
    this.support.step(dt, time);
    this.distortion?.commit();

    this.fire.update(dt, time);
    this.smoke.update(dt, time);
    this.haze.update(dt, time);
    this.trails.update(dt, this.ctx.camera.position);
  }

  lateUpdate(_dt: number, ctx: GameContext): void {
    // The player controller has finished with the camera by now; taking it
    // here rather than in `update` means nothing writes over the pose.
    if (this.cameraOwned && (this.mode === Mode.TARGETING || this.mode === Mode.RETURNING)) {
      this.tactical.apply(ctx.camera, this.aim, this.baseFov);
    }
    this.bindDepth(ctx);
  }

  private bindDepth(ctx: GameContext): void {
    const depth = needsDepthPrepass(ctx.quality)
      ? (this.deps.pipeline?.depthTexture ?? null)
      : null;
    const size = ctx.renderer.getDrawingBufferSize(_buffer);
    const near = ctx.camera.near;
    const far = ctx.camera.far;
    this.fire.setDepth(depth, near, far, size.x, size.y);
    this.smoke.setDepth(depth, near, far, size.x, size.y);
    this.haze.setDepth(depth, near, far, size.x, size.y);
    this.distortion?.setDepth(depth, near, far, size.x, size.y);
    this.overlay.setDepth(depth, near, far, size.x, size.y);

    const sky = this.deps.sky;
    if (sky) {
      this.haze.setLighting(sky.sunDirection, sky.sunColor, _dustColor);
      this.smoke.setLighting(sky.sunDirection, sky.sunColor, sky.skyColor);
    }
  }

  private pollHotkeys(): void {
    const input = this.ctx.input;
    if (!input.enabled) return;
    for (let i = 0; i < 3; i++) {
      const action = HOTKEYS[i];
      if (!input.wasPressed(action)) continue;
      const id = this.pocket[i];
      if (id) this.activate(id);
      else this.sound('ui_denied', 0.5);
    }
  }

  resize(width: number, height: number): void {
    this.distortion?.resize(width, height);
    this.overlay?.resize(width, height);
  }

  onQualityChange(_quality: QualitySettings, ctx: GameContext): void {
    this.budget = budgetFor(ctx);
    this.distortion?.setEnabled(this.budget.grabPass);
  }

  /* ================================ helpers =============================== */

  /** Where the player is looking, snapped to the ground and inside the wire. */
  private defaultTarget(out: THREE.Vector3): THREE.Vector3 {
    const camera = this.ctx.camera;
    const eye = this.deps.player?.eyePosition ?? camera.position;
    camera.getWorldDirection(_fwd);
    const hit = this.deps.physics?.raycast?.(eye, _fwd, 260);
    if (hit) {
      out.copy(hit.point);
    } else {
      // Nothing downrange: put the marker on the ground plane sixty out.
      out.copy(eye).addScaledVector(_fwd, 60);
    }
    this.clampToBounds(out);
    out.y = this.deps.groundAt(out.x, out.z, Math.max(out.y, eye.y) + 40);
    return out;
  }

  private clampToBounds(p: THREE.Vector3): void {
    const bounds = this.deps.world?.bounds;
    if (!bounds) return;
    // A little inside the wire, so the footprint does not hang over the edge.
    p.x = Math.min(bounds.max.x - 4, Math.max(bounds.min.x + 4, p.x));
    p.z = Math.min(bounds.max.z - 4, Math.max(bounds.min.z + 4, p.z));
  }

  private playerHeading(): number {
    this.ctx.camera.getWorldDirection(_fwd);
    if (Math.abs(_fwd.x) < 1e-5 && Math.abs(_fwd.z) < 1e-5) return 0;
    return Math.atan2(_fwd.x, -_fwd.z);
  }

  private emitPhase(
    kind: StrikeKind,
    phase: 'targeting' | 'inbound' | 'impact' | 'aftermath',
    remaining: number,
  ): void {
    _phaseEvt.kind = kind;
    _phaseEvt.phase = phase;
    _phaseEvt.secondsRemaining = remaining;
    this.ctx.events.emit('airstrike:phase', _phaseEvt);
  }

  private sound(id: string, volume: number): void {
    _audio.id = id;
    _audio.volume = volume;
    _audio.rate = 1;
    _audio.position.copy(this.ctx.camera.position);
    this.ctx.events.emit('audio:play', _audio);
  }

  /* ========================= harness and showcase ========================= */

  /*
   * Everything below exists for the showcase and the screenshot harness. It is
   * public because the showcase is a separate module, and it is grouped here
   * so it is obvious that none of it sits on a gameplay path.
   */

  /** Holds the simulation where it stands without stopping the frame loop. */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen) this.accumulator = 0;
    this.deps.fx?.setFrozen?.(frozen);
  }

  /**
   * Runs the sequence forward by an exact number of seconds.
   *
   * The effects clock is advanced in lockstep with the simulation rather than
   * afterwards, so a blast triggered at t = 9.0 s is a quarter of a second old
   * when the simulation reaches 9.25 s. That is the entire point: a stack of
   * explosions all aged from the same instant is not a walking line.
   */
  advanceTo(seconds: number): void {
    const fx = this.deps.fx;
    fx?.setFrozen?.(true);
    let left = Math.max(0, Math.min(90, seconds));
    while (left > 1e-5) {
      const dt = Math.min(FIXED, left);
      this.stepFixed(dt);
      fx?.advance?.(dt);
      left -= dt;
    }
    this.frozen = true;
    this.accumulator = 0;
  }

  /** Clears the world of everything this package put in it. */
  reset(): void {
    if (this.mode !== Mode.IDLE) {
      if (this.input.held) this.input.release(this.ctx.input);
      if (this.cameraOwned) this.deps.player?.setFrozen?.(false);
      this.cameraOwned = false;
      this.mode = Mode.IDLE;
      this.pending = null;
    }
    this.director.clear();
    this.support.clear();
    this.ordnance.clear();
    this.trails.clear();
    this.fire.clear();
    this.smoke.clear();
    this.haze.clear();
    this.distortion?.clear();
    this.footprint.hide();
    this.symbology.hide();
    this.overlay.set(0, this.simTime);
    this.accumulator = 0;
    this.frozen = false;
    this.deps.fx?.setFrozen?.(false);
    this.deps.fx?.clear();
    this.deps.pipeline?.setHeatHaze(0);
    this.deps.pipeline?.setRadialBlur(0);
  }

  /** Starts a strike with no economy, no targeting and no camera move. */
  beginStrike(kind: StrikeKind, target: THREE.Vector3, heading: number): void {
    this.director.begin(kind, target, heading);
  }

  /**
   * Raises the tactical interface without taking the camera.
   *
   * The showcase poses the camera itself, from `tacticalPose`, so the shot is
   * of the interface rather than of a camera move caught halfway through.
   */
  showTargeting(id: string, target: THREE.Vector3, heading: number): boolean {
    const def = LADDER.find((s) => s.id === id);
    if (!def) return false;
    this.mode = Mode.TARGETING;
    this.pending = def;
    this.cameraOwned = false;
    this.targetLeft = TARGET_TIMEOUT * 0.72;
    this.queryAt = 0;
    this.tactical.blend = 1;
    this.aim.copy(target);
    this.aim.y = this.deps.groundAt(target.x, target.z, target.y + 60);
    this.aimHeading = heading;
    this.tactical.capture(this.ctx.camera);
    const shape = shapeFor(def);
    this.tactical.frame(this.deps.sky?.sunAzimuth ?? 2.2, Math.max(shape.length, shape.width));
    this.validate(def, 1);
    this.paint(def, 1);
    return true;
  }

  /**
   * Where the tactical camera would stand, so a vantage can borrow the pose.
   * The camera is put back exactly as it was found.
   */
  tacticalPose(target: THREE.Vector3, out: THREE.Vector3): number {
    const camera = this.ctx.camera;
    const savedFov = camera.fov;
    _v2.copy(camera.position);
    _poseQuat.copy(camera.quaternion);
    this.tactical.blend = 1;
    this.tactical.apply(camera, target, this.baseFov);
    out.copy(camera.position);
    const fov = camera.fov;
    camera.position.copy(_v2);
    camera.quaternion.copy(_poseQuat);
    camera.fov = savedFov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    return fov;
  }

  /** Live state the showcase frames its shots from. */
  get strike(): AirstrikeDirector {
    return this.director;
  }

  get simClock(): number {
    return this.simTime;
  }

  get burning(): number {
    return this.fire.count;
  }

  get dustCells(): number {
    return this.haze.count;
  }

  /* ================================ teardown ============================== */

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const off of this.teardown) off();
    this.teardown.length = 0;
    if (this.input.held) this.input.release(this.ctx.input);
    if (this.cameraOwned) this.deps.player?.setFrozen?.(false);
    this.showcase?.dispose();
    this.showcase = null;
    this.director.clear();
    this.support.dispose();
    this.ordnance.dispose();
    this.flight.dispose();
    this.trails.dispose();
    this.burners.dispose();
    this.distortion?.dispose();
    this.fire.dispose();
    this.smoke.dispose();
    this.haze.dispose();
    this.footprint.dispose();
    this.symbology.dispose();
    this.overlay.setHud(null);
    this.overlay.dispose();
    this.hud.dispose();
    this.jetAssets.dispose();
    this.bombAssets.dispose();
  }
}

const HOTKEYS = ['killstreak1', 'killstreak2', 'killstreak3'] as const;
