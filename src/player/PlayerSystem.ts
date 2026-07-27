import * as THREE from 'three';
import { Groups, type GameContext, type System } from '../core/GameContext';
import type { DamageEvent, SurfaceKind } from '../core/Events';
import type {
  CharacterMoveResult,
  IPhysics,
  IPlayer,
  IWorld,
  RaycastHit,
  Stance,
} from '../core/Interfaces';
import { clamp, damp, lerp, saturate } from '../core/MathUtils';
import { CameraRig, makeRigDrive } from './CameraRig';
import { Mantle, type MantleTarget } from './Mantle';
import { T, gravityFor, jumpVelocity, stanceEye, stanceHeight } from './Tuning';

/**
 * First-person player controller.
 *
 * Every tunable lives in `./Tuning` — one commented block, real units, nothing
 * magic hidden down here.
 *
 * Shape of a frame:
 *
 *   `update` reads input once, applies the accumulated look delta immediately
 *   (aim must never be a frame behind the mouse), then runs the movement
 *   simulation on a fixed 120 Hz step. Stance, sprint, slide, mantle, collision,
 *   footsteps and every camera spring advance inside that loop, so a 30 fps
 *   machine and a 240 fps machine produce the same jump arc and the same slide
 *   distance to the millimetre.
 *
 *   `lateUpdate` composes the camera from the interpolated position and the
 *   current effect values. Splitting it this way means leftover time in the
 *   accumulator shows up as smooth motion rather than as a stutter, and it puts
 *   the final camera transform in place before the weapon system reads it.
 *
 * Button edges are latched into sticky requests rather than read straight from
 * the input manager, because a frame can run zero fixed steps at 240 fps and
 * two at 60: without the latch a crouch press would be dropped on one machine
 * and processed twice on another.
 *
 * The controller never touches `ctx.camera` while `enabled` is false or while
 * frozen. The screenshot harness poses the camera by hand, and a controller
 * that fights it produces silently wrong shots.
 */

const PROBE_MASK = Groups.WORLD | Groups.PROP | Groups.GLASS;
const UP = new THREE.Vector3(0, 1, 0);

const _v = new THREE.Vector3();
const _footPos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _dummyObject = new THREE.Object3D();

/** Input for one frame. Filled from the input manager or from a test script. */
export interface Intent {
  moveX: number;
  moveY: number;
  lookYaw: number;
  lookPitch: number;
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  ads: boolean;
  fire: boolean;
  leanLeft: boolean;
  leanRight: boolean;
  /** One-shot request, consumed by the next fixed step. */
  proneToggleRequest: boolean;
}

function makeIntent(): Intent {
  return {
    moveX: 0,
    moveY: 0,
    lookYaw: 0,
    lookPitch: 0,
    sprint: false,
    crouch: false,
    jump: false,
    ads: false,
    fire: false,
    leanLeft: false,
    leanRight: false,
    proneToggleRequest: false,
  };
}

function makeHit(): RaycastHit {
  return {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    distance: 0,
    object: _dummyObject,
    surface: 'concrete',
    damageScale: 1,
    penetration: 0.25,
  };
}

export default class PlayerSystem implements System, IPlayer {
  readonly key = 'player';
  readonly order = 40;

  enabled = true;

  /* ------------------------------- state -------------------------------- */

  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();

  private ctx: GameContext | null = null;
  private physics: IPhysics | null = null;
  private world: IWorld | null = null;
  private frozen = false;
  private wasEnabled = true;

  /** Position at the previous fixed step, for render interpolation. */
  private prevPosition = new THREE.Vector3();
  private renderPos = new THREE.Vector3();
  private accumulator = 0;
  private alpha = 0;

  private yaw = 0;
  private pitch = 0;

  private _stance: Stance = 'stand';
  private capsuleHeight = T.standHeight;
  private eyeHeight = T.standEye;
  private prevEyeHeight = T.standEye;

  private _grounded = false;
  private airTime = 0;
  private coyoteLeft = 0;
  private jumpBuffer = 0;
  private jumpCooldownLeft = 0;
  private justJumped = false;

  private _sprinting = false;
  private tactical = false;
  private tacticalArmed = false;
  private sprintRamp = 0;
  private sprintTapLeft = 0;
  private sprintOutLeft = 0;
  private _winded = 0;

  private prone = false;
  private proneLockLeft = 0;
  private ceilingBlocked = false;
  private ceilingCheckLeft = 0;

  private slideTime = 0;
  private slideCooldownLeft = 0;
  private slideSign = 1;

  private mantleActive = false;
  private mantleTime = 0;
  private mantleSign = 1;
  private mantleProbes = 0;

  private _adsFactor = 0;
  private adsTime = 0.24;
  private leanFactor = 0;

  private _health = T.maxHealth;
  private _alive = true;
  private sinceDamage = T.regenDelay;
  private regenPending = 0;
  private regenTimer = 0;
  private deathTime = 0;
  private killedBy = 'enemy';

  /* ------------------------- latched button edges ------------------------ */

  private wantCrouchEdge = false;
  private wantProneEdge = false;
  private wantSprintEdge = false;

  /* ----------------------------- machinery ------------------------------ */

  private readonly rig = new CameraRig(() => this.footstep(false));
  private readonly mantle = new Mantle();
  private readonly drive = makeRigDrive();
  private readonly intent = makeIntent();
  private readonly scripted = makeIntent();
  private readonly prevScripted = makeIntent();
  /** Set by the showcase so the harness can drive the controller without a mouse. */
  private useScriptedInput = false;

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

  private leanHit = makeHit();
  private readonly forwardVec = new THREE.Vector3(0, 0, -1);
  private readonly eyeVec = new THREE.Vector3();
  private lastForwardSpeed = 0;
  private forwardAccel = 0;
  private unsubscribe: Array<() => void> = [];
  private showcase: { update?(dt: number): void; dispose?(): void } | null = null;
  private clickToLock?: () => void;

  /* =============================== boot ================================= */

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.physics = ctx.tryGet<IPhysics>('physics') ?? null;
    this.world = ctx.tryGet<IWorld>('world') ?? null;

    ctx.camera.rotation.order = 'YXZ';
    ctx.camera.fov = T.fov;
    ctx.camera.updateProjectionMatrix();
    this.rig.setBaseFov(T.fov);

    this.spawnAtWorldSpawn();
    ctx.events.emit('player:spawn', { position: this.position.clone() });

    const on = ctx.events.on.bind(ctx.events);
    this.unsubscribe.push(
      on('camera:kick', (e) => {
        this.addViewKick(e.pitch, e.yaw);
        if (e.roll) this.rig.addKick(0, 0, e.roll);
      }),
      on('camera:shake', (e) => {
        let amp = e.amplitude;
        if (e.position && e.radius && e.radius > 0) {
          const d = e.position.distanceTo(this.eyePosition);
          amp *= Math.pow(saturate(1 - d / e.radius), T.shakeFalloffPower);
        }
        this.rig.shake(amp, e.duration, e.frequency);
      }),
      on('camera:fov', (e) => this.rig.requestFov(e.fov, e.duration)),
      // Firing or aiming drops you out of a sprint. The weapon system announces
      // both; the raw inputs are checked too so it works before that lands.
      on('weapon:fire', () => this.breakSprint()),
      on('weapon:ads', (aiming) => {
        if (aiming) this.breakSprint();
      }),
      on('game:restart', () => this.respawn()),
    );

    // Pointer lock needs a user gesture. Harmless if the menu system later adds
    // its own handler: `requestLock` returns immediately when already locked.
    if (typeof document !== 'undefined' && !location.search.includes('capture')) {
      this.clickToLock = () => ctx.input.requestLock();
      ctx.canvas.addEventListener('mousedown', this.clickToLock);
    }

    if (typeof location !== 'undefined' && location.search.includes('showcase=player')) {
      try {
        const mod = await import('./PlayerShowcase');
        this.showcase = new mod.PlayerShowcase(ctx, this);
      } catch (err) {
        console.error('[player] showcase failed to load:', err);
      }
    }
  }

  /** Places the player at the best player spawn the world offers. */
  private spawnAtWorldSpawn(): void {
    const spawns = this.world?.spawnPoints ?? [];
    let best: { position: THREE.Vector3; heading: number; weight?: number } | null = null;
    for (const s of spawns) {
      if (s.team === 'enemy') continue;
      if (!best || (s.weight ?? 1) > (best.weight ?? 1)) best = s;
    }
    if (best) {
      this.teleport(best.position, best.heading);
      return;
    }
    const y = this.physics?.groundHeight(0, 20, 40) ?? 0;
    _v.set(0, y, 20);
    this.teleport(_v, Math.PI);
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    if (this.clickToLock && this.ctx) {
      this.ctx.canvas.removeEventListener('mousedown', this.clickToLock);
    }
    this.showcase?.dispose?.();
    this.showcase = null;
  }

  /* ============================== frame ================================= */

  update(dt: number, ctx: GameContext): void {
    // Adopt whatever the harness left the camera pointing at, so handing
    // control back after a posed shot does not snap the view.
    if (this.enabled && !this.wasEnabled) this.adoptCamera(ctx);
    this.wasEnabled = this.enabled;

    if (!this.enabled) {
      // Still drain the look accumulator, or it all arrives at once later.
      ctx.input.consumeLook(dt, this._adsFactor);
      return;
    }

    this.sampleInput(dt, ctx);
    if (this.frozen) return;

    this.applyLook();

    // A non-finite delta would poison the accumulator and stall the simulation
    // for the rest of the session with nothing in the console to show why.
    this.accumulator += Number.isFinite(dt) ? clamp(dt, 0, 0.25) : 0;
    let steps = 0;
    while (this.accumulator >= T.fixedDt && steps < T.maxFixedSteps) {
      this.fixedStep(T.fixedDt);
      this.accumulator -= T.fixedDt;
      steps++;
    }
    // A hitch longer than the step budget is dropped rather than paid back;
    // catching up would teleport the player across the level.
    if (steps === T.maxFixedSteps) this.accumulator = 0;
    this.alpha = saturate(this.accumulator / T.fixedDt);

    this.showcase?.update?.(dt);
  }

  lateUpdate(_dt: number, ctx: GameContext): void {
    if (!this.enabled || this.frozen) return;
    this.composeCamera(ctx);
  }

  /* ============================== input ================================= */

  private sampleInput(dt: number, ctx: GameContext): void {
    const it = this.intent;
    if (this.useScriptedInput) {
      const s = this.scripted;
      const p = this.prevScripted;
      it.moveX = s.moveX;
      it.moveY = s.moveY;
      it.lookYaw = s.lookYaw;
      it.lookPitch = s.lookPitch;
      it.sprint = s.sprint;
      it.crouch = s.crouch;
      it.jump = s.jump;
      it.ads = s.ads;
      it.fire = s.fire;
      it.leanLeft = s.leanLeft;
      it.leanRight = s.leanRight;
      if (s.crouch && !p.crouch) this.wantCrouchEdge = true;
      if (s.sprint && !p.sprint) this.wantSprintEdge = true;
      if (s.jump && !p.jump) this.jumpBuffer = T.jumpBufferTime;
      if (s.proneToggleRequest) {
        this.wantProneEdge = true;
        s.proneToggleRequest = false;
      }
      p.moveX = s.moveX;
      p.moveY = s.moveY;
      p.sprint = s.sprint;
      p.crouch = s.crouch;
      p.jump = s.jump;
      p.ads = s.ads;
      p.fire = s.fire;
      return;
    }

    const input = ctx.input;
    // Assembled by hand rather than through `moveVector()` so the hot path
    // allocates nothing; the analogue stick is still folded in.
    let mx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    let my = (input.isDown('forward') ? 1 : 0) - (input.isDown('back') ? 1 : 0);
    mx += input.stick.moveX;
    my += input.stick.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    it.moveX = mx;
    it.moveY = my;

    const look = input.consumeLook(dt, this._adsFactor);
    it.lookYaw = look.yaw;
    it.lookPitch = look.pitch;

    it.sprint = input.isDown('sprint');
    it.crouch = input.isDown('crouch');
    it.jump = input.isDown('jump');
    it.ads = input.isDown('ads');
    it.fire = input.isDown('fire');
    it.leanLeft = input.isDown('leanLeft');
    it.leanRight = input.isDown('leanRight');

    if (input.wasPressed('crouch')) this.wantCrouchEdge = true;
    if (input.wasPressed('prone')) this.wantProneEdge = true;
    if (input.wasPressed('sprint')) this.wantSprintEdge = true;
    if (input.wasPressed('jump')) this.jumpBuffer = T.jumpBufferTime;
  }

  private applyLook(): void {
    const it = this.intent;
    if (!Number.isFinite(it.lookYaw) || !Number.isFinite(it.lookPitch)) return;
    if (!this._alive) return;
    this.yaw += it.lookYaw;
    // Wrapping keeps yaw bounded forever; a session-long drift would eventually
    // cost float precision on the trig.
    if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    else if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
    this.pitch = clamp(this.pitch + it.lookPitch, -T.pitchLimit, T.pitchLimit);
    this.rig.addLook(it.lookYaw, it.lookPitch);
  }

  /* ============================ fixed step ============================== */

  private fixedStep(h: number): void {
    this.prevPosition.copy(this.position);
    this.prevEyeHeight = this.eyeHeight;

    this.stepTimers(h);

    if (!this._alive) {
      this.deathTime = Math.min(T.deathTime, this.deathTime + h);
      this.updateHeights(h);
      this.moveStep(h, true);
      this.stepRig(h);
      this.sanitiseState();
      this.clearEdges();
      return;
    }

    this.updateAds(h);
    this.updateStance(h);
    this.updateSprint(h);
    this.updateLean();

    if (this.mantleActive) {
      this.stepMantle(h);
    } else {
      this.tryMantle();
      if (!this.mantleActive) this.moveStep(h, false);
    }

    this.updateHeights(h);
    this.stepRig(h);
    this.sanitiseState();
    this.clearEdges();
  }

  /** Latched edges live exactly one fixed step. */
  private clearEdges(): void {
    this.wantCrouchEdge = false;
    this.wantProneEdge = false;
    this.wantSprintEdge = false;
  }

  private stepTimers(h: number): void {
    // Only airborne steps spend the coyote budget. Charging it while grounded
    // and draining it here would cost the step the player walks off on, so the
    // window a player actually gets would be shorter than the tuned one.
    if (!this._grounded) this.coyoteLeft = Math.max(0, this.coyoteLeft - h);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - h);
    this.jumpCooldownLeft = Math.max(0, this.jumpCooldownLeft - h);
    this.slideCooldownLeft = Math.max(0, this.slideCooldownLeft - h);
    this.sprintTapLeft = Math.max(0, this.sprintTapLeft - h);
    this.sprintOutLeft = Math.max(0, this.sprintOutLeft - h);
    this.proneLockLeft = Math.max(0, this.proneLockLeft - h);
    this.ceilingCheckLeft -= h;

    // Exertion: sprinting winds you, everything else pays it back. Drives the
    // breathing sway and, through it, the weapon's idle drift.
    this._winded = saturate(
      this._winded + (this._sprinting ? h / T.windedTime : -h / T.windedRecoverTime),
    );

    if (!this._alive) return;
    this.sinceDamage += h;
    if (this._health < T.maxHealth && this.sinceDamage >= T.regenDelay) {
      const before = this._health;
      this._health = Math.min(T.maxHealth, this._health + T.regenRate * h);
      this.regenPending += this._health - before;
      this.regenTimer += h;
      if (this.regenTimer >= T.regenEventInterval || this._health >= T.maxHealth) {
        if (this.regenPending > 0) {
          this.ctx?.events.emit('player:heal', { amount: this.regenPending });
        }
        this.regenPending = 0;
        this.regenTimer = 0;
      }
    }
  }

  /* ============================== stance ================================ */

  private updateStance(h: number): void {
    const it = this.intent;

    if (this.wantProneEdge && this.proneLockLeft <= 0 && this._grounded) {
      if (this.prone) {
        if (this.canRaiseTo(T.crouchHeight)) {
          this.prone = false;
          this.proneLockLeft = T.proneTransitionTime;
        }
      } else {
        this.prone = true;
        this.proneLockLeft = T.proneTransitionTime;
        if (this._stance === 'slide') this.endSlide();
        this.setStance('prone');
      }
    }

    if (this._stance === 'slide') {
      this.slideTime += h;
      const ended =
        this.slideTime >= T.slideDuration ||
        this.horizontalSpeed() < T.slideMinSpeed ||
        !it.crouch ||
        this.airTime > 0.2 ||
        this.move.hitCeiling;
      if (ended) this.endSlide();
      else return;
    }

    if (this.prone) {
      this.setStance('prone');
      return;
    }

    // Sprint plus crouch is a slide, not a crouch — checked before the crouch
    // hold below, which would otherwise consume the same press.
    if (
      this.wantCrouchEdge &&
      this._grounded &&
      this._sprinting &&
      this._stance === 'stand' &&
      this.slideCooldownLeft <= 0 &&
      this.horizontalSpeed() >= T.sprintSpeed * T.slideEntryFraction
    ) {
      this.startSlide();
      return;
    }

    if (it.crouch) {
      this.setStance('crouch');
      return;
    }
    if (this._stance === 'stand') return;

    // Standing up is refused under a low ceiling. This is the only capsule cast
    // in the steady-state loop, so it runs on a throttle.
    if (this.ceilingCheckLeft <= 0) {
      this.ceilingCheckLeft = 0.12;
      this.ceilingBlocked = !this.canRaiseTo(T.standHeight);
    }
    this.setStance(this.ceilingBlocked ? 'crouch' : 'stand');
  }

  private setStance(s: Stance): void {
    if (this._stance === s) return;
    this._stance = s;
    this.ctx?.events.emit('player:stance', { stance: s });
  }

  /** True when the capsule can grow to `height` without meeting a ceiling. */
  private canRaiseTo(height: number): boolean {
    const need = height - this.capsuleHeight;
    if (need <= 1e-3) return true;
    if (!this.physics) return true;
    const hit = this.physics.capsuleCast(
      this.position,
      UP,
      T.capsuleRadius,
      this.capsuleHeight,
      need + 0.05,
      PROBE_MASK,
    );
    return !hit || hit.distance >= need;
  }

  /**
   * Interpolates the capsule and the eye toward the current stance. The stance
   * machine has already refused any stance that does not fit, so there is
   * nothing to re-check here.
   */
  private updateHeights(h: number): void {
    const lambda = this.prone || this.proneLockLeft > 0 ? T.proneLambda : T.stanceLambda;
    let targetEye = stanceEye(this._stance);
    if (!this._alive) {
      targetEye = lerp(targetEye, T.deathEye, saturate(this.deathTime / T.deathTime));
    }
    this.capsuleHeight = damp(this.capsuleHeight, stanceHeight(this._stance), lambda, h);
    this.eyeHeight = damp(this.eyeHeight, targetEye, lambda, h);
  }

  /* =============================== slide ================================ */

  private startSlide(): void {
    this.setStance('slide');
    this.slideTime = 0;
    // Alternate the shoulder the slide rolls onto so a run of slides does not
    // look like the same canned animation twice.
    this.slideSign = -this.slideSign;
    const speed = this.horizontalSpeed();
    let dx: number;
    let dz: number;
    if (speed > 0.2) {
      dx = this.velocity.x / speed;
      dz = this.velocity.z / speed;
    } else {
      dx = -Math.sin(this.yaw);
      dz = -Math.cos(this.yaw);
    }
    const boosted = Math.min(speed + T.slideBoost, T.slideMaxSpeed);
    this.velocity.x = dx * boosted;
    this.velocity.z = dz * boosted;
    this.stopSprint();
    this.ctx?.events.emit('player:slide', true);
  }

  private endSlide(): void {
    if (this._stance !== 'slide') return;
    this.slideCooldownLeft = T.slideCooldown;
    this.slideTime = 0;
    const stand = !this.intent.crouch && this.canRaiseTo(T.standHeight);
    this.setStance(stand ? 'stand' : 'crouch');
    this.ctx?.events.emit('player:slide', false);
  }

  /**
   * Slide integration: a friction ramp that starts at almost nothing and grows
   * quadratically, gravity along the ground plane so a downhill slide carries
   * further, and lateral-only steering so the slide can be aimed but never
   * driven out of.
   */
  private slideStep(h: number, wishX: number, wishZ: number): void {
    const k = saturate(this.slideTime / T.slideDuration);
    const friction =
      T.slideFrictionStart + (T.slideFrictionEnd - T.slideFrictionStart) * k * k;
    let speed = this.horizontalSpeed();
    if (speed > 1e-4) {
      const scale = Math.max(0, speed - speed * friction * h) / speed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
      speed *= scale;
    }

    // Downhill acceleration. Gravity projected onto the ground plane has the
    // horizontal components (n.x * n.y, n.z * n.y) times g, which is zero on
    // the flat and grows with the slope exactly as it should.
    const n = this.move.groundNormal;
    if (this._grounded && n.y < 0.9995) {
      const a = T.gravity * T.slideSlopeScale * h;
      this.velocity.x += n.x * n.y * a;
      this.velocity.z += n.z * n.y * a;
    }

    if (speed > 0.5 && (wishX !== 0 || wishZ !== 0)) {
      const dx = this.velocity.x / speed;
      const dz = this.velocity.z / speed;
      const px = -dz;
      const pz = dx;
      const lat = wishX * px + wishZ * pz;
      this.velocity.x += px * lat * T.slideSteerAccel * h;
      this.velocity.z += pz * lat * T.slideSteerAccel * h;
    }

    const capped = this.horizontalSpeed();
    if (capped > T.slideMaxSpeed) {
      const s = T.slideMaxSpeed / capped;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }
  }

  /* =============================== sprint =============================== */

  private updateSprint(h: number): void {
    const it = this.intent;
    if (this.wantSprintEdge) {
      if (this.sprintTapLeft > 0) this.tacticalArmed = true;
      this.sprintTapLeft = T.doubleTapWindow;
    }
    if (!it.sprint) this.tacticalArmed = false;

    const blocked =
      it.ads ||
      it.fire ||
      this._adsFactor > 0.15 ||
      this._stance !== 'stand' ||
      this.mantleActive ||
      !this._alive;
    const wants = it.sprint && it.moveY > T.sprintEntryForward && !blocked;
    // Sprint survives a jump; it cannot be started from a standstill.
    const airborneGrace = this._grounded || this.airTime < 0.45;
    const fastEnough = this._sprinting || this.horizontalSpeed() >= T.sprintEntrySpeed;

    if (wants && airborneGrace && fastEnough) {
      if (!this._sprinting) {
        this._sprinting = true;
        this.sprintRamp = 0;
        this.ctx?.events.emit('player:sprint', true);
      }
      this.sprintRamp = Math.min(1, this.sprintRamp + h / Math.max(1e-3, T.sprintSpinUp));
      this.tactical = this.tacticalArmed;
    } else if (this._sprinting) {
      this.stopSprint();
    }
  }

  private stopSprint(): void {
    if (!this._sprinting) return;
    this._sprinting = false;
    this.sprintOutLeft = this.tactical ? T.tacticalSprintOutTime : T.sprintOutTime;
    this.tactical = false;
    this.sprintRamp = 0;
    this.ctx?.events.emit('player:sprint', false);
  }

  /** Firing or aiming ends a sprint and starts the sprint-out delay. */
  private breakSprint(): void {
    this.tacticalArmed = false;
    this.stopSprint();
  }

  private updateAds(h: number): void {
    const want =
      this.intent.ads && this._alive && this._stance !== 'slide' && !this.mantleActive;
    this._adsFactor = damp(
      this._adsFactor,
      want ? 1 : 0,
      3 / Math.max(0.05, this.adsTime),
      h,
    );
  }

  /* ================================ lean ================================ */

  private updateLean(): void {
    const it = this.intent;
    let want = (it.leanRight ? 1 : 0) - (it.leanLeft ? 1 : 0);
    if (
      want !== 0 &&
      (this.horizontalSpeed() > T.leanMaxSpeed ||
        this._stance === 'prone' ||
        this._stance === 'slide' ||
        this.mantleActive ||
        !this._alive)
    ) {
      want = 0;
    }
    if (want !== 0 && this.physics) {
      // The capsule does not move when leaning, so nothing else stops the eye
      // from ending up inside a wall.
      const cos = Math.cos(this.yaw);
      const sin = Math.sin(this.yaw);
      _dir.set(cos * want, 0, -sin * want);
      _eye.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
      const reach = T.leanOffset + T.leanClearance;
      if (this.physics.raycastInto(_eye, _dir, reach, this.leanHit, PROBE_MASK)) {
        want *= saturate((this.leanHit.distance - T.leanClearance) / T.leanOffset);
      }
    }
    this.leanFactor = want;
  }

  /* =========================== mantle / vault =========================== */

  private tryMantle(): void {
    if (!this.physics || this.mantleActive || !this._alive) return;
    if (this._stance === 'prone' || this.proneLockLeft > 0) return;
    if (this.intent.moveY < T.mantleForwardInput) return;

    const wantJump = this.jumpBuffer > 0 && this.jumpCooldownLeft <= 0;
    const autoVault = this.move.hitWall && this.horizontalSpeed() > T.vaultAutoSpeed;
    if (!wantJump && !autoVault) return;
    // Probing costs three casts; throttle the automatic path so running along a
    // wall does not pay for it every step.
    if (!wantJump && ++this.mantleProbes % T.mantleProbeInterval !== 0) return;

    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    if (!this.mantle.detect(this.physics, this.position, fx, fz, this.capsuleHeight, true)) {
      return;
    }
    // Automatic engagement is for vaults only. Climbing onto something is a
    // decision, and taking it away from the player reads as losing control.
    if (!wantJump && !this.mantle.target.vault) return;
    this.startMantle();
  }

  private startMantle(): void {
    this.mantleActive = true;
    this.mantleTime = 0;
    this.mantleSign = -this.mantleSign;
    this.jumpBuffer = 0;
    this.coyoteLeft = 0;
    this.jumpCooldownLeft = T.jumpCooldown;
    this._grounded = false;
    if (this._stance === 'slide') this.endSlide();
    const t = this.mantle.target;
    // A vault is a continuation of a run; a mantle is a stop and a climb.
    if (t.vault) {
      this.velocity.set(t.dirX * T.vaultExitSpeed, 0, t.dirZ * T.vaultExitSpeed);
    } else {
      this.velocity.set(0, 0, 0);
      this.stopSprint();
    }
    this.ctx?.events.emit(t.vault ? 'player:vault' : 'player:mantle');
  }

  private stepMantle(h: number): void {
    const t = this.mantle.target;
    this.mantleTime += h;
    const k = t.duration > 1e-4 ? this.mantleTime / t.duration : 1;
    this.mantle.sample(k, _v);
    if (!Number.isFinite(_v.x) || !Number.isFinite(_v.y) || !Number.isFinite(_v.z)) {
      this.mantleActive = false;
      return;
    }
    // Velocity follows the path, so anything reading it during the climb — audio,
    // the weapon's sway — sees real motion rather than a frozen zero.
    if (h > 1e-6) {
      this.velocity.set(
        (_v.x - this.position.x) / h,
        (_v.y - this.position.y) / h,
        (_v.z - this.position.z) / h,
      );
    }
    this.position.copy(_v);
    this.airTime = 0;

    if (k < 1) return;
    this.mantleActive = false;
    this.velocity.set(t.dirX * t.exitSpeed, 0, t.dirZ * t.exitSpeed);
    this._grounded = true;
    this.coyoteLeft = T.coyoteTime;
    if (!this.canRaiseTo(T.standHeight)) this.setStance('crouch');
  }

  /* ============================== movement ============================== */

  private moveStep(h: number, dead: boolean): void {
    const it = this.intent;
    const sliding = this._stance === 'slide';
    const locked = this.proneLockLeft > 0;

    // Wish velocity: body-relative input scaled per axis, then rotated by yaw.
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    const fwdX = -sin;
    const fwdZ = -cos;
    const rightX = cos;
    const rightZ = -sin;

    const moveX = dead || locked ? 0 : it.moveX;
    // Sliding keeps the steering input but never the drive.
    const moveY = dead || locked || sliding ? 0 : it.moveY;

    const top = this.stanceTopSpeed();
    let fScale = moveY >= 0 ? 1 : T.backScale;
    let sScale = T.strafeScale;
    if (this._adsFactor > 0) {
      fScale *= lerp(1, T.adsSpeedScale, this._adsFactor);
      sScale *= lerp(1, T.adsStrafeScale, this._adsFactor);
    }
    let wishX = (rightX * moveX * sScale + fwdX * moveY * fScale) * top;
    let wishZ = (rightZ * moveX * sScale + fwdZ * moveY * fScale) * top;
    let wishSpeed = Math.hypot(wishX, wishZ);
    if (wishSpeed > 1e-5) {
      wishX /= wishSpeed;
      wishZ /= wishSpeed;
    } else {
      wishX = 0;
      wishZ = 0;
      wishSpeed = 0;
    }

    if (sliding) {
      this.slideStep(h, wishX, wishZ);
    } else if (this._grounded) {
      this.applyFriction(h, wishSpeed > 0, wishX, wishZ);
      this.accelerate(h, wishX, wishZ, wishSpeed, T.groundAccel);
    } else {
      this.accelerate(h, wishX, wishZ, Math.min(wishSpeed, top * T.airSpeedCap), T.airAccel);
    }

    if (!dead) this.handleJump();

    // Leapfrog gravity: half a kick, the move, then the other half. The apex of
    // a jump is then exact at any step size instead of drifting with it.
    const g = gravityFor(this.velocity.y);
    this.velocity.y += g * h * 0.5;

    const vyBefore = this.velocity.y;
    const wasGrounded = this._grounded;
    if (this.physics) {
      this.physics.moveCharacterInto(
        this.position,
        this.velocity,
        T.capsuleRadius,
        Math.max(T.proneHeight, this.capsuleHeight),
        h,
        this.move,
        this._stance === 'prone' ? 0.2 : T.stepHeight,
      );
      this.position.copy(this.move.position);
      this.velocity.copy(this.move.velocity);
      this._grounded = this.move.grounded;
      if (this.move.stepUp) this.rig.applyStepUp(this.move.stepUp);
    } else {
      // No physics system: fall onto a flat floor at y=0 so the game still boots.
      this.position.addScaledVector(this.velocity, h);
      this._grounded = this.position.y <= 0;
      if (this._grounded) {
        this.position.y = 0;
        this.velocity.y = 0;
      }
      this.move.grounded = this._grounded;
      this.move.groundNormal.set(0, 1, 0);
      this.move.hitWall = false;
      this.move.stepUp = 0;
    }

    if (this.justJumped) {
      this._grounded = false;
      this.justJumped = false;
    }
    if (!this._grounded) this.velocity.y += g * h * 0.5;

    if (this._grounded) {
      this.airTime = 0;
      this.coyoteLeft = T.coyoteTime;
      if (!wasGrounded) this.land(-vyBefore);
    } else {
      this.airTime += h;
      if (wasGrounded && this.coyoteLeft <= 0) this.coyoteLeft = T.coyoteTime;
    }

    // Forward acceleration, for the momentum pitch. Measured along the facing
    // rather than along the velocity, so braking reads as braking.
    const forwardSpeed = this.velocity.x * fwdX + this.velocity.z * fwdZ;
    this.forwardAccel = damp(
      this.forwardAccel,
      (forwardSpeed - this.lastForwardSpeed) / h,
      22,
      h,
    );
    this.lastForwardSpeed = forwardSpeed;

    this.sanitisePosition();
  }

  /**
   * Friction first, acceleration second, clamped so the wish speed is never
   * exceeded. Deceleration is therefore exponential — heavy at speed, gentle at
   * the end — with a linear floor so the player actually comes to rest.
   */
  private applyFriction(h: number, hasInput: boolean, wishX: number, wishZ: number): void {
    const speed = this.horizontalSpeed();
    if (speed < 1e-5) return;
    let f = T.groundFriction;
    if (hasInput) {
      const align = (this.velocity.x * wishX + this.velocity.z * wishZ) / speed;
      if (align < 0) f *= T.brakeFrictionScale;
    }
    const control = Math.max(speed, T.frictionStopSpeed);
    const scale = Math.max(0, speed - control * f * h) / speed;
    this.velocity.x *= scale;
    this.velocity.z *= scale;
  }

  private accelerate(
    h: number,
    wishX: number,
    wishZ: number,
    wishSpeed: number,
    accel: number,
  ): void {
    if (wishSpeed <= 0) return;
    const current = this.velocity.x * wishX + this.velocity.z * wishZ;
    const add = wishSpeed - current;
    if (add <= 0) return;
    const delta = Math.min(accel * h, add);
    this.velocity.x += wishX * delta;
    this.velocity.z += wishZ * delta;
  }

  private handleJump(): void {
    if (this.jumpBuffer <= 0 || this.jumpCooldownLeft > 0) return;
    if (!this._grounded && this.coyoteLeft <= 0) return;
    if (this._stance === 'prone') {
      // Out of prone first; the jump request survives in the buffer.
      if (this.proneLockLeft <= 0 && this.canRaiseTo(T.crouchHeight)) {
        this.prone = false;
        this.proneLockLeft = T.proneTransitionTime;
      }
      return;
    }
    if (this._stance === 'crouch' && !this.canRaiseTo(T.standHeight)) return;

    const sliding = this._stance === 'slide';
    this.velocity.y = jumpVelocity() * (sliding ? T.slideJumpScale : 1);
    if (T.jumpSpeedKeep < 1) {
      this.velocity.x *= T.jumpSpeedKeep;
      this.velocity.z *= T.jumpSpeedKeep;
    }
    if (sliding) this.endSlide();
    this._grounded = false;
    this.justJumped = true;
    this.jumpBuffer = 0;
    this.coyoteLeft = 0;
    this.jumpCooldownLeft = T.jumpCooldown;
    this.airTime = 0;
    this.ctx?.events.emit('player:jump');
  }

  private land(impact: number): void {
    this.rig.land(impact);
    // Settling onto a spawn point or brushing a kerb is not a landing.
    if (impact < 0.8) return;
    this.footstep(true);
    this.ctx?.events.emit('player:land', {
      velocity: impact,
      surface: this.move.groundSurface,
    });
    if (impact > T.fallDamageSpeed && this._alive) {
      const t =
        (impact - T.fallDamageSpeed) / Math.max(1e-3, T.fallLethalSpeed - T.fallDamageSpeed);
      this.damage({
        amount: T.maxHealth * clamp(t * t, 0.05, 1.5),
        kind: 'fall',
        attacker: 'enemy',
      });
    }
  }

  private footstep(landing: boolean): void {
    if (!this._alive || !this.ctx) return;
    _footPos.copy(this.position);
    this.ctx.events.emit('player:footstep', {
      surface: this.move.groundSurface,
      running: this._sprinting || landing,
      position: _footPos,
    });
  }

  /** Top speed for the current stance, before directional and ADS scaling. */
  private stanceTopSpeed(): number {
    switch (this._stance) {
      case 'prone':
        return T.proneSpeed;
      case 'crouch':
        return T.crouchSpeed;
      case 'slide':
        return T.slideMaxSpeed;
      default:
        break;
    }
    if (!this._sprinting) return T.walkSpeed;
    const full = this.tactical ? T.tacticalSprintSpeed : T.sprintSpeed;
    return lerp(T.walkSpeed, full, saturate(this.sprintRamp));
  }

  private horizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /**
   * Last line of defence. A single NaN in the position propagates into the
   * camera matrix and hides the entire scene with nothing in the console, so an
   * impossible state is rolled back to the last good one instead.
   */
  private sanitisePosition(): void {
    const p = this.position;
    const v = this.velocity;
    if (
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) &&
      Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)
    ) {
      return;
    }
    p.copy(this.prevPosition);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      p.set(0, 0, 0);
    }
    v.set(0, 0, 0);
    console.warn('[player] non-finite state recovered');
  }

  /**
   * The scalars that survive between steps, checked once per step. `position`
   * has its own rollback above; these have no previous value worth keeping, so
   * a poisoned one is reset to its resting value. Without this a single NaN
   * arriving from another system — a weapon asking for a NaN aim time, a hit
   * with a NaN damage amount — would stay in the state for the whole session.
   */
  private sanitiseState(): void {
    // Yaw is wrapped here as well as in `applyLook`, because recoil adds to it
    // and a dead player never runs the look path at all. Wrapped by remainder
    // rather than by a single subtraction, so a wildly out-of-range value from
    // another system lands in range in one step instead of staying there.
    if (Number.isFinite(this.yaw)) {
      if (this.yaw > Math.PI || this.yaw < -Math.PI) {
        const tau = Math.PI * 2;
        this.yaw = ((((this.yaw + Math.PI) % tau) + tau) % tau) - Math.PI;
      }
    } else {
      this.yaw = 0;
    }
    if (Number.isFinite(this.pitch)) {
      this.pitch = clamp(this.pitch, -T.pitchLimit, T.pitchLimit);
    } else {
      this.pitch = 0;
    }
    if (!Number.isFinite(this._adsFactor)) this._adsFactor = 0;
    if (!Number.isFinite(this.leanFactor)) this.leanFactor = 0;
    if (!Number.isFinite(this.sprintRamp)) this.sprintRamp = 0;
    if (!Number.isFinite(this._winded)) this._winded = 0;
    if (!Number.isFinite(this.forwardAccel)) this.forwardAccel = 0;
    if (!Number.isFinite(this.lastForwardSpeed)) this.lastForwardSpeed = 0;
    if (!Number.isFinite(this.capsuleHeight)) this.capsuleHeight = stanceHeight(this._stance);
    if (!Number.isFinite(this.eyeHeight)) this.eyeHeight = stanceEye(this._stance);
    if (!Number.isFinite(this.prevEyeHeight)) this.prevEyeHeight = this.eyeHeight;
    if (!Number.isFinite(this._health)) this._health = T.maxHealth;
  }

  /* =============================== camera =============================== */

  private stepRig(h: number): void {
    const d = this.drive;
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    d.speed = this.horizontalSpeed();
    d.grounded = this._grounded;
    d.stance = this._stance;
    d.sprinting = this._sprinting;
    d.tacticalSprint = this.tactical;
    d.adsFactor = this._adsFactor;
    d.lateralSpeed = this.velocity.x * cos + this.velocity.z * -sin;
    d.forwardAccel = this.forwardAccel;
    d.winded = this._winded;
    d.leanInput = this.leanFactor;
    d.alive = this._alive;
    d.slideT = this._stance === 'slide' ? 1 - saturate(this.slideTime / T.slideDuration) : 0;
    d.slideSign = this.slideSign;
    d.mantleT =
      this.mantleActive && this.mantle.target.duration > 0
        ? saturate(this.mantleTime / this.mantle.target.duration)
        : 0;
    d.mantleSign = this.mantleSign;
    d.deathT = this._alive ? 0 : saturate(this.deathTime / T.deathTime);
    this.rig.step(h, d);
  }

  private composeCamera(ctx: GameContext): void {
    const a = this.alpha;
    this.renderPos.lerpVectors(this.prevPosition, this.position, a);
    const eye = lerp(this.prevEyeHeight, this.eyeHeight, a);
    this.rig.compose(
      ctx.camera,
      this.renderPos.x,
      this.renderPos.y + eye,
      this.renderPos.z,
      this.yaw,
      this.pitch,
      this.drive,
    );
    this.eyeVec.copy(ctx.camera.position);
    this.forwardVec.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion);

    // The viewmodel is drawn by a second camera that has to sit exactly where
    // this one does. The weapon system offsets the model, not the camera.
    const vm = ctx.viewmodelCamera;
    vm.position.copy(ctx.camera.position);
    vm.quaternion.copy(ctx.camera.quaternion);
    vm.updateMatrixWorld();
  }

  /** Takes the harness's posed camera as the new aim, so control returns cleanly. */
  private adoptCamera(ctx: GameContext): void {
    const e = ctx.camera.rotation;
    if (e.order !== 'YXZ') e.reorder('YXZ');
    this.yaw = e.y;
    this.pitch = clamp(e.x, -T.pitchLimit, T.pitchLimit);
    this.accumulator = 0;
    this.alpha = 0;
  }

  /* =============================== IPlayer ============================== */

  get eyePosition(): THREE.Vector3 {
    if (this.eyeVec.lengthSq() === 0) {
      this.eyeVec.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
    }
    return this.eyeVec;
  }

  get forward(): THREE.Vector3 {
    return this.forwardVec;
  }

  get health(): number {
    return this._health;
  }

  get maxHealth(): number {
    return T.maxHealth;
  }

  get alive(): boolean {
    return this._alive;
  }

  get stance(): Stance {
    return this._stance;
  }

  get sprinting(): boolean {
    return this._sprinting;
  }

  get grounded(): boolean {
    return this._grounded;
  }

  get adsFactor(): number {
    return this._adsFactor;
  }

  get speedFactor(): number {
    return clamp(this.horizontalSpeed() / T.sprintSpeed, 0, 1.4);
  }

  /* --------- additive surface for the weapon, HUD and audio rigs --------- */

  get tacticalSprint(): boolean {
    return this.tactical;
  }

  get sliding(): boolean {
    return this._stance === 'slide';
  }

  get mantling(): boolean {
    return this.mantleActive;
  }

  get airborneTime(): number {
    return this.airTime;
  }

  /** Seconds left of the sprint-out delay; the weapon must not fire until zero. */
  get sprintOutRemaining(): number {
    return this.sprintOutLeft;
  }

  get canFire(): boolean {
    return this._alive && this.sprintOutLeft <= 0 && !this.mantleActive;
  }

  get eyeHeightMeters(): number {
    return this.eyeHeight;
  }

  get capsuleHeightMeters(): number {
    return this.capsuleHeight;
  }

  get capsuleRadius(): number {
    return T.capsuleRadius;
  }

  get viewYaw(): number {
    return this.yaw;
  }

  get viewPitch(): number {
    return this.pitch;
  }

  get winded(): number {
    return this._winded;
  }

  get leanAmount(): number {
    return this.leanFactor;
  }

  get breathHeld(): boolean {
    return this.rig.breathHeld;
  }

  get breathReserve(): number {
    return this.rig.breathReserve;
  }

  get fov(): number {
    return this.rig.fov;
  }

  /** Weapons ask for an ADS field of view here, or via the `camera:fov` event. */
  requestFov(fov: number, duration = 0.15): void {
    this.rig.requestFov(fov, duration);
  }

  setBaseFov(fov: number): void {
    this.rig.setBaseFov(fov);
  }

  /** Per-weapon aim time, so a sniper is slower to raise than an SMG. */
  setAdsTime(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    this.adsTime = clamp(seconds, 0.05, 1.5);
  }

  /** Sniper breath hold. Returns false when there is no breath left. */
  holdBreath(hold: boolean): boolean {
    const ok = this.rig.holdBreath(hold);
    this.ctx?.events.emit('player:breath', ok && hold);
    return ok;
  }

  damage(evt: DamageEvent): void {
    if (!this._alive || !(evt.amount > 0)) return;
    this._health = Math.max(0, this._health - evt.amount);
    this.sinceDamage = 0;
    this.regenPending = 0;
    this.ctx?.events.emit('player:damage', evt);

    // Directional feedback: the head is knocked along the incoming direction,
    // which puts the view kick away from whoever fired.
    const scale = clamp(evt.amount / 35, 0.25, 2);
    let yawKick = 0.35;
    let pitchKick = 1;
    if (evt.from) {
      _dir.copy(this.position).sub(evt.from);
      _dir.y = 0;
      if (_dir.lengthSq() > 1e-6) {
        _dir.normalize();
        const cos = Math.cos(this.yaw);
        const sin = Math.sin(this.yaw);
        const right = _dir.x * cos + _dir.z * -sin;
        const fwd = _dir.x * -sin + _dir.z * -cos;
        yawKick = -right;
        pitchKick = 0.55 + 0.45 * -fwd;
      }
    }
    this.ctx?.events.emit('camera:kick', {
      pitch: T.damageKickPitch * scale * pitchKick,
      yaw: T.damageKickYaw * scale * yawKick,
    });
    this.rig.shake(T.damageShake * scale, 0.22, 18);
    if (this._health <= 0) this.die(evt);
  }

  private die(evt: DamageEvent): void {
    this._alive = false;
    this._health = 0;
    this.deathTime = 0;
    this.killedBy = evt.kind === 'fall' ? 'falling' : (evt.attacker ?? 'enemy');
    this.stopSprint();
    if (this._stance === 'slide') this.endSlide();
    this._adsFactor = 0;
    this.rig.holdBreath(false);
    this.ctx?.events.emit('player:death', { by: this.killedBy });
  }

  heal(amount: number): void {
    if (!this._alive || !(amount > 0)) return;
    const before = this._health;
    this._health = Math.min(T.maxHealth, this._health + amount);
    if (this._health > before) {
      this.ctx?.events.emit('player:heal', { amount: this._health - before });
    }
  }

  teleport(position: THREE.Vector3, heading?: number): void {
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      return;
    }
    this.position.copy(position);
    // Drop onto the surface when the caller hands over a point in the air.
    if (this.physics) {
      const g = this.physics.groundHeight(position.x, position.z, position.y + 1.2);
      if (g !== null && Math.abs(g - position.y) < 1.2) this.position.y = g + 0.02;
    }
    this.prevPosition.copy(this.position);
    this.velocity.set(0, 0, 0);
    if (heading !== undefined && Number.isFinite(heading)) {
      this.yaw = heading;
      this.pitch = 0;
    }
    this._stance = 'stand';
    this.prone = false;
    this.proneLockLeft = 0;
    this.capsuleHeight = T.standHeight;
    this.eyeHeight = T.standEye;
    this.prevEyeHeight = T.standEye;
    this._grounded = false;
    this.airTime = 0;
    this.mantleActive = false;
    this.slideTime = 0;
    this.slideCooldownLeft = 0;
    this.jumpBuffer = 0;
    this.jumpCooldownLeft = 0;
    this.coyoteLeft = 0;
    this.sprintRamp = 0;
    this._sprinting = false;
    this.tactical = false;
    this.tacticalArmed = false;
    this.sprintTapLeft = 0;
    this.sprintOutLeft = 0;
    this._adsFactor = 0;
    this.leanFactor = 0;
    this.forwardAccel = 0;
    this.lastForwardSpeed = 0;
    this.ceilingBlocked = false;
    this.ceilingCheckLeft = 0;
    this.justJumped = false;
    this.wantCrouchEdge = false;
    this.wantProneEdge = false;
    this.wantSprintEdge = false;
    this.accumulator = 0;
    this.alpha = 0;
    this.rig.reset();
    this.move.grounded = false;
    this.move.groundSurface = 'concrete';
    this.move.groundNormal.set(0, 1, 0);
    this.move.hitWall = false;
    this.move.hitCeiling = false;
    this.move.stepUp = 0;
    this.eyeVec.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
  }

  /** Full reset: health, stance and camera, at a spawn point. */
  respawn(position?: THREE.Vector3, heading?: number): void {
    this._alive = true;
    this._health = T.maxHealth;
    this.sinceDamage = T.regenDelay;
    this.deathTime = 0;
    this._winded = 0;
    if (position) this.teleport(position, heading);
    else this.spawnAtWorldSpawn();
    this.ctx?.events.emit('player:spawn', { position: this.position.clone() });
  }

  /**
   * Recoil. The transient part springs back; `recoilRecovered` of the kick is
   * returned and the rest becomes a permanent aim change, which is what makes a
   * held burst climb the way a real one does.
   */
  addViewKick(pitch: number, yaw: number): void {
    if (!Number.isFinite(pitch) || !Number.isFinite(yaw)) return;
    // Capped here as well as in the rig: the permanent share moves the aim
    // itself, which the rig's own cap cannot reach.
    const k = T.recoilMaxKick;
    const p = clamp(pitch, -k, k);
    const y = clamp(yaw, -k, k);
    this.rig.addKick(p * T.recoilRecovered, y * T.recoilYawRecovered);
    this.pitch = clamp(
      this.pitch + p * (1 - T.recoilRecovered),
      -T.pitchLimit,
      T.pitchLimit,
    );
    this.yaw += y * (1 - T.recoilYawRecovered);
  }

  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen) {
      this.velocity.set(0, 0, 0);
      this.accumulator = 0;
    }
  }

  get isFrozen(): boolean {
    return this.frozen;
  }

  /* ========================= showcase interface ========================= */

  /**
   * Hands input over to a script, so `tools/player-test.mjs` can drive the
   * controller frame by frame without an input device.
   */
  setScriptedInput(on: boolean): Intent {
    this.useScriptedInput = on;
    const s = this.scripted;
    const p = this.prevScripted;
    s.moveX = s.moveY = s.lookYaw = s.lookPitch = 0;
    s.sprint = s.crouch = s.jump = s.ads = s.fire = false;
    s.leanLeft = s.leanRight = false;
    s.proneToggleRequest = false;
    p.moveX = p.moveY = 0;
    p.sprint = p.crouch = p.jump = p.ads = p.fire = false;
    return s;
  }

  /** Runs exactly one frame of the controller, for the test harness. */
  stepFrame(dt: number, ctx: GameContext): void {
    this.update(dt, ctx);
    this.lateUpdate(dt, ctx);
  }

  /** Numeric snapshot for the test harness and the debug overlay. */
  snapshot(out: Record<string, number>): Record<string, number> {
    out.x = this.position.x;
    out.y = this.position.y;
    out.z = this.position.z;
    out.vx = this.velocity.x;
    out.vy = this.velocity.y;
    out.vz = this.velocity.z;
    out.speed = this.horizontalSpeed();
    // Signed along the facing, so braking and reversing are distinguishable —
    // `speed` alone cannot tell a stop from a full reversal.
    out.forwardSpeed = this.lastForwardSpeed;
    out.forwardAccel = this.forwardAccel;
    out.stance = this.stanceCode();
    out.grounded = this._grounded ? 1 : 0;
    out.sprinting = this._sprinting ? 1 : 0;
    out.tactical = this.tactical ? 1 : 0;
    out.sprintRamp = this.sprintRamp;
    out.sprintOut = this.sprintOutLeft;
    out.mantling = this.mantleActive ? 1 : 0;
    out.mantleT = this.drive.mantleT;
    out.vault = this.mantleActive && this.mantle.target.vault ? 1 : 0;
    out.slideTime = this.slideTime;
    out.ads = this._adsFactor;
    out.lean = this.leanFactor;
    out.health = this._health;
    out.alive = this._alive ? 1 : 0;
    out.yaw = this.yaw;
    out.pitch = this.pitch;
    out.eyeHeight = this.eyeHeight;
    out.capsuleHeight = this.capsuleHeight;
    out.airTime = this.airTime;
    out.coyote = this.coyoteLeft;
    out.jumpBuffer = this.jumpBuffer;
    out.winded = this._winded;
    out.speedFactor = this.speedFactor;
    this.rig.snapshot(out);
    return out;
  }

  /** Stance as a number, so traces can live in typed arrays. */
  stanceCode(): number {
    switch (this._stance) {
      case 'crouch':
        return 1;
      case 'prone':
        return 2;
      case 'slide':
        return 3;
      default:
        return 0;
    }
  }

  get mantleReason(): string {
    return this.mantle.reason;
  }

  /** The climb the last probe resolved, for the showcase readout. */
  get mantleTarget(): MantleTarget {
    return this.mantle.target;
  }

  /** True when the rig caught and scrubbed a non-finite value last step. */
  get rigSanitised(): boolean {
    return this.rig.sanitised;
  }

  /** Probes for a climb without performing one; used by the mantle tests. */
  probeMantle(): boolean {
    if (!this.physics) return false;
    return this.mantle.detect(
      this.physics,
      this.position,
      -Math.sin(this.yaw),
      -Math.cos(this.yaw),
      this.capsuleHeight,
      true,
    );
  }

  get groundSurface(): SurfaceKind {
    return this.move.groundSurface;
  }
}
