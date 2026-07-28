/**
 * The player controller.
 *
 * This file is the orchestrator: it owns the character capsule, samples input,
 * and drives `Movement`, `StanceMachine`, `Mantle`, `Footsteps`, `CameraRig` and
 * `Health` in the one order that makes them agree with each other. All of the
 * behaviour lives in those files; what lives here is sequencing, the system
 * contract, and the small amount of policy that spans them.
 *
 * The sequencing problem is worth stating, because it is the reason for the shape
 * of this file. The engine runs zero, one or several 120 Hz fixed steps and then
 * exactly one variable-rate update, in that order. Physics has already stepped by
 * the time `fixedUpdate` runs, so the capsule is authoritative there and the
 * camera — presentation, and needing the final state — belongs in `update` and
 * `lateUpdate`.
 *
 * That leaves edge-triggered input, which is cleared once per *frame* by the
 * engine and so cannot be read once per *step*: at 200 fps some frames run no
 * fixed step at all and a jump read there would be dropped, while at 30 fps four
 * steps share one frame and a jump read in each would fire four times. So input
 * is latched exactly once per frame, by whichever callback gets there first, and
 * the latch — not the raw device — is what the fixed step reads. Presses become
 * timed buffers, which is also what makes coyote time and jump buffering fall out
 * for free rather than needing special cases.
 *
 * Geometry, since three different positions are all reasonable answers and
 * callers rely on which is which:
 *
 *   `position`            capsule feet, the contact point — what the world module
 *                         samples ambience and ground from
 *   `entity.getPosition`  centre of mass, feet + half height — what damage,
 *                         explosions and AI aim at
 *   `getEyePosition`      the composited camera, bob and lean included — where
 *                         bullets start, because it is what the player sees from
 */
import * as THREE from 'three';
import type {
  AudioSystem,
  CharacterControllerHandle,
  PhysicsSystem,
  PlayerSystem,
  RenderSystem,
  Stance,
  UISystem,
  WeaponSystem,
  WorldSystem,
} from '../core/Contracts';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import { GAMEPLAY } from '../core/Config';
import type { Damageable, SurfaceType } from '../core/GameTypes';
import { clamp, saturate } from '../core/MathUtils';
import { CameraRig } from './CameraRig';
import { Footsteps } from './Footsteps';
import { Health } from './Health';
import { Mantle } from './Mantle';
import { Movement } from './Movement';
import { StanceMachine } from './Stance';
import {
  clearPlayerInput,
  consumePresses,
  createPlayerInput,
  createPlayerState,
  type PlayerInput,
  type PlayerState,
} from './State';
import { STAND_HEIGHT, TUNE } from './Tuning';

const P = GAMEPLAY.player;
const ZERO_LOOK = { x: 0, y: 0 };
const AXIS_SCRATCH = { x: 0, y: 0 };

export class PlayerSystemImpl implements PlayerSystem, System {
  readonly name = 'player' as const;
  readonly order = ORDER.PLAYER;
  readonly dependencies = ['physics', 'world', 'combat'] as const;

  private readonly state = createPlayerState();
  private readonly input: PlayerInput = createPlayerInput();

  private readonly movement = new Movement();
  private readonly stanceMachine = new StanceMachine();
  private readonly mantle = new Mantle();
  private readonly footsteps = new Footsteps();
  private readonly rig = new CameraRig();
  private readonly health: Health;

  /** Mirrors the capsule feet; exposed as `position`, so it must not be reused. */
  private readonly feet = new THREE.Vector3();
  private readonly listenerUp = new THREE.Vector3(0, 1, 0);

  private ctx!: EngineContext;
  private physics: PhysicsSystem | null = null;
  private handle: CharacterControllerHandle | null = null;

  /** Frame number the input latch was last filled for. */
  private sampledFrame = -1;
  private forwardTapTime = -1;
  private sprintTapTime = -1;
  /** True while this system is the one holding the weapon lockout. */
  private weaponsLocked = false;
  private everLocked = false;
  private lockOff: (() => void) | null = null;
  private clickOff: (() => void) | null = null;
  /** Deferred so the spawn is announced once every system has initialised. */
  private spawnPending = true;

  constructor() {
    this.health = new Health(
      this.state,
      (type, payload) => this.ctx?.events.emit(type, payload),
      () => this.onDeath(),
    );
  }

  // -------------------------------------------------------------------------
  // Contract surface
  // -------------------------------------------------------------------------

  get entity(): Damageable {
    return this.health.entity;
  }

  /** Capsule feet: the point where the body touches the floor. */
  get position(): THREE.Vector3 {
    return this.feet;
  }

  get velocity(): THREE.Vector3 {
    return this.state.velocity;
  }

  get stance(): Stance {
    return this.state.stance;
  }

  get grounded(): boolean {
    return this.state.grounded;
  }

  get speed(): number {
    return this.state.speed;
  }

  get sprintAmount(): number {
    return this.state.sprintAmount;
  }

  get isSprinting(): boolean {
    return this.state.isSprinting;
  }

  get isTacticalSprinting(): boolean {
    return this.state.isTacticalSprinting;
  }

  get yaw(): number {
    return this.state.yaw;
  }

  get pitch(): number {
    return this.state.pitch;
  }

  get currentSurface(): SurfaceType {
    return this.state.groundSurface;
  }

  getEyePosition(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.rig.eyePosition);
  }

  /**
   * The composited view axis, not the raw aim. The crosshair is drawn at the
   * centre of the screen, so anything that rotates the camera has to rotate the
   * shot with it or the reticle is lying about where the bullet goes.
   */
  getLookDirection(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.rig.forward);
  }

  addCameraRecoil(pitch: number, yaw: number): void {
    this.rig.addRecoil(pitch, yaw, this.state);
  }

  addViewPunch(pitch: number, yaw: number, roll: number): void {
    this.rig.addPunch(pitch, yaw, roll);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.physics = ctx.tryGet<PhysicsSystem>('physics') ?? null;
    this.health.attach(ctx);
    this.health.reset();

    // The same chooser the respawn uses. No enemies exist yet at boot, so this
    // reduces to the authored priority plus a little noise.
    const spawn = this.health.pickSpawn();
    const position = spawn ? spawn.position : this.fallbackSpawn();
    this.state.feet.copy(position);
    this.state.yaw = spawn ? spawn.yaw : 0;
    this.state.pitch = 0;
    this.feet.copy(position);

    this.acquireCapsule();
    this.resetBody();

    this.lockOff = ctx.input.onLockChange((locked) => this.onLockChange(locked));
    this.attachClickToPlay(ctx);

    ctx.camera.rotation.order = 'YXZ';
    this.rig.reset(this.state);
    this.rig.writeTo(ctx.camera);
    this.updateListener(ctx);
  }

  dispose(): void {
    this.lockOff?.();
    this.clickOff?.();
    this.lockOff = this.clickOff = null;
    this.health.detach();
    this.handle?.destroy();
    this.handle = null;
  }

  // -------------------------------------------------------------------------
  // Fixed step: everything that touches the capsule
  // -------------------------------------------------------------------------

  fixedUpdate(dt: number, ctx: EngineContext): void {
    this.sampleFrame(ctx);
    this.health.update(dt);

    const handle = this.handle;
    const physics = this.physics;
    if (!handle || !physics?.ready) return;

    this.stepBody(dt, ctx, handle, physics);
    // Exactly here, once per step: every consumer above has now seen this frame's
    // presses, and the remaining steps of the frame must not see them again.
    consumePresses(this.input);
  }

  private stepBody(
    dt: number,
    ctx: EngineContext,
    handle: CharacterControllerHandle,
    physics: PhysicsSystem,
  ): void {
    const s = this.state;
    const input = this.input;
    this.mantle.tick(dt);
    input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);

    if (this.mantle.active) {
      this.mantle.step(dt, s, handle, physics);
      // The stance machine still runs so the capsule keeps shrinking to crouch
      // height, the sprint meters keep ticking and the lean keeps unwinding.
      this.stanceMachine.update(dt, s, input, handle, physics, ctx.events);
      this.feet.copy(s.feet);
      return;
    }

    this.stanceMachine.update(dt, s, input, handle, physics, ctx.events);
    this.resolveTraversal(s, handle, input);

    if (this.mantle.active) {
      this.feet.copy(s.feet);
      return;
    }

    const result = this.movement.step(dt, s, input, handle);
    this.feet.copy(s.feet);

    if (result.stepUpDelta !== 0) this.rig.notifyStepUp(result.stepUpDelta);

    if (result.landed && result.impactSpeed > 0.4) {
      ctx.events.emit('player:landed', {
        impactSpeed: result.impactSpeed,
        surface: s.groundSurface,
      });
      this.rig.notifyLanding(result.impactSpeed, this.lateralSign(s));
      this.footsteps.landing(s, result.impactSpeed, ctx.events);
      this.health.fallDamage(result.impactSpeed);
    }

    this.footsteps.step(dt, s, ctx.events);

    if (this.health.respawnDue) this.respawn();
  }

  /**
   * Jump, vault and mantle, resolved together because they compete for the same
   * press. A ledge in front of you wins: in a modern shooter, jumping at a wall
   * you could climb and getting a jump instead is always the wrong answer.
   */
  private resolveTraversal(
    s: PlayerState,
    handle: CharacterControllerHandle,
    input: PlayerInput,
  ): void {
    if (!this.physics || !s.alive) return;

    if (input.jumpBuffer > 0 && s.stance !== 'mantle') {
      if (this.mantle.tryStart(s, handle, this.physics, true)) {
        input.jumpBuffer = 0;
        this.ctx.events.emit('player:mantleStart', { height: this.mantle.ledgeHeight });
        return;
      }
      if (this.movement.jumpReady(s) && this.stanceMachine.allowJump(s, handle, input)) {
        input.jumpBuffer = 0;
        this.movement.launchJump(s);
      }
    }

    // Automatic vault: leaning on a low obstacle for a moment while pushing
    // forward. Height-limited to a vault, so a roof edge always needs a jump.
    if (
      s.grounded &&
      s.stance !== 'slide' &&
      s.blockedTime > TUNE.autoVaultHold &&
      input.moveZ > TUNE.autoVaultForward &&
      this.mantle.tryStart(s, handle, this.physics, false)
    ) {
      this.ctx.events.emit('player:mantleStart', { height: this.mantle.ledgeHeight });
    }
  }

  /** -1..1 across the direction of travel, for the landing roll. */
  private lateralSign(s: PlayerState): number {
    const rx = Math.cos(s.yaw);
    const rz = -Math.sin(s.yaw);
    return clamp((s.velocity.x * rx + s.velocity.z * rz) / Math.max(1, P.walkSpeed), -1, 1);
  }

  // -------------------------------------------------------------------------
  // Frame: camera, borrowed state, weapon coupling
  // -------------------------------------------------------------------------

  update(dt: number, ctx: EngineContext): void {
    this.sampleFrame(ctx);
    // Physics reports ready only once Rapier has loaded, which may be after this
    // system initialised; take the capsule on the first frame it exists.
    if (!this.handle) this.acquireCapsule();
    this.rig.update(dt, this.state, this.input);
    this.rig.writeTo(ctx.camera);
    this.updateWeaponLock(ctx);
    this.updateListener(ctx);

    if (this.spawnPending) {
      this.spawnPending = false;
      ctx.events.emit('player:spawn', { position: this.feet.clone() });
    }
  }

  /**
   * The camera is written again here, after every other system has had its turn.
   * The write is absolute, so doing it twice costs one Euler-to-quaternion and
   * guarantees the render module's screen shake — which saves this transform,
   * adds its delta and restores it after the frame is presented — rides on top of
   * the final aim rather than on a stale one.
   */
  lateUpdate(_dt: number, ctx: EngineContext): void {
    this.rig.writeTo(ctx.camera);
  }

  // -------------------------------------------------------------------------
  // Input latch
  // -------------------------------------------------------------------------

  /**
   * Fill the latch for this frame. Runs from whichever of `fixedUpdate` and
   * `update` reaches it first, so a frame with no fixed step still consumes its
   * mouse motion and a frame with four still only counts one jump press.
   */
  private sampleFrame(ctx: EngineContext): void {
    if (this.sampledFrame === ctx.time.frame) return;
    this.sampledFrame = ctx.time.frame;

    const input = ctx.input;
    const i = this.input;
    const s = this.state;
    const dt = Math.max(1e-4, ctx.time.delta);

    const weapons = ctx.tryGet<WeaponSystem>('weapons');
    s.adsAmount = saturate(weapons?.adsAmount ?? 0);
    const def = weapons?.current ?? null;
    s.adsZoom = def?.adsZoom ?? 1;
    // A magnified optic renders its own sight picture; see TUNE.scopedFovDivisor.
    s.scoped = def?.scope === 'acog' || def?.scope === 'sniper' || def?.scope === 'thermal';
    this.stanceMachine.setWeaponWeight(def?.weight ?? TUNE.weaponWeightReference);

    const menuOpen = ctx.tryGet<UISystem>('ui')?.isMenuOpen ?? false;
    const accepting = !ctx.engine.isPaused && !menuOpen && s.alive;

    // Always consumed, even when discarded: mouse deltas accumulate whenever the
    // pointer is locked, so skipping the read would bank them up behind a menu
    // and snap the view the moment it closed.
    const look = input.consumeLook(s.adsAmount);
    if (accepting && input.locked) this.rig.applyLook(look, dt, s);
    else this.rig.applyLook(ZERO_LOOK, dt, s);

    if (!accepting) {
      this.clearIntent();
      return;
    }

    const axis = input.moveAxis(AXIS_SCRATCH);
    i.moveX = axis.x;
    i.moveZ = axis.y;
    i.enabled = true;

    i.sprintHeld = input.isDown('sprint');
    i.crouchHeld = input.isDown('crouch');
    i.jumpHeld = input.isDown('jump');
    i.fireHeld = input.isDown('fire');
    i.aimHeld = input.isDown('aim');
    i.leanAxis =
      (input.isDown('leanRight') ? 1 : 0) - (input.isDown('leanLeft') ? 1 : 0);

    // Presses accumulate instead of being assigned: a frame that happens to run no
    // fixed step still has to hand its press to the next one that does.
    if (input.wasPressed('crouch')) i.crouchPressed = true;
    if (input.wasPressed('prone')) i.pronePressed = true;
    if (input.wasPressed('fire')) i.firePressed = true;

    // A press is kept alive for a window rather than consumed on the spot, which
    // is what turns "pressed slightly too early" into a jump on touchdown.
    if (input.wasPressed('jump')) i.jumpBuffer = TUNE.jumpBuffer;

    // Tactical sprint is asked for by double-tapping either forward or sprint.
    // Both are the same gesture, so both are resolved here rather than leaving the
    // stance machine to infer a second press from a state it has already changed.
    if (this.doubleTapped('forward', ctx) || this.doubleTapped('sprint', ctx)) {
      i.tacticalRequested = true;
    }
  }

  /** True when this action was just pressed for the second time in the window. */
  private doubleTapped(action: 'forward' | 'sprint', ctx: EngineContext): boolean {
    if (!ctx.input.wasPressed(action)) return false;
    const now = ctx.time.elapsed;
    const last = action === 'forward' ? this.forwardTapTime : this.sprintTapTime;
    const paired = last >= 0 && now - last < TUNE.doubleTapWindow;
    const next = paired ? -1 : now;
    if (action === 'forward') this.forwardTapTime = next;
    else this.sprintTapTime = next;
    return paired;
  }

  /** Drop movement intent but keep the latch coherent. */
  private clearIntent(): void {
    clearPlayerInput(this.input);
    this.input.enabled = false;
    this.forwardTapTime = -1;
    this.sprintTapTime = -1;
  }

  // -------------------------------------------------------------------------
  // Weapon coupling
  // -------------------------------------------------------------------------

  /**
   * The weapon lockout, held for two reasons: while dead, and for the sprint-out
   * window after coming off a sprint — a real, felt delay before the gun is back
   * up and able to fire, which is the price the sprint speed is bought with.
   *
   * Driven off edges only. The weapon module has a single lockout switch shared
   * with anything else that wants it, so this releases exactly what it took and
   * never asserts a state it did not ask for.
   */
  private updateWeaponLock(ctx: EngineContext): void {
    const weapons = ctx.tryGet<WeaponSystem>('weapons');
    if (!weapons) return;
    const wantLock = !this.state.alive || this.state.sprintOut > 0;
    if (wantLock === this.weaponsLocked) return;
    this.weaponsLocked = wantLock;
    weapons.setInputEnabled(!wantLock);
  }

  private updateListener(ctx: EngineContext): void {
    ctx
      .tryGet<AudioSystem>('audio')
      ?.setListener(this.rig.eyePosition, this.rig.forward, this.listenerUp, this.state.velocity);
  }

  // -------------------------------------------------------------------------
  // Pointer lock
  // -------------------------------------------------------------------------

  /**
   * Click to play. A DOM listener rather than the `fire` action, because reading
   * the action would fire the weapon on the same click that captures the pointer,
   * and because it has to keep working while the engine is paused and this system
   * is not being updated at all.
   */
  private attachClickToPlay(ctx: EngineContext): void {
    const canvas = ctx.engine.canvas;
    const onDown = (): void => {
      if (ctx.tryGet<UISystem>('ui')?.isMenuOpen) return;
      // A user gesture is the only moment either of these is allowed.
      void ctx.tryGet<AudioSystem>('audio')?.unlock();
      if (!ctx.input.locked) void ctx.input.requestLock();
    };
    canvas.addEventListener('mousedown', onDown);
    this.clickOff = () => canvas.removeEventListener('mousedown', onDown);
  }

  /**
   * Losing the pointer — Escape, alt-tab, a dropped context — pauses. Regaining
   * it resumes. Chrome enforces about 1.25 s between an Escape release and the
   * next lock request, but the click handler is a DOM listener and keeps firing,
   * so the request lands as soon as the browser allows it.
   */
  private onLockChange(locked: boolean): void {
    if (locked) {
      this.everLocked = true;
      this.ctx.engine.setPaused(false);
      return;
    }
    if (this.everLocked) this.ctx.engine.setPaused(true);
  }

  // -------------------------------------------------------------------------
  // Placement
  // -------------------------------------------------------------------------

  teleport(position: THREE.Vector3, yaw?: number, pitch?: number): void {
    this.state.feet.copy(position);
    this.feet.copy(position);
    if (yaw !== undefined) this.state.yaw = yaw;
    if (pitch !== undefined) this.state.pitch = clamp(pitch, -TUNE.maxPitch, TUNE.maxPitch);
    this.handle?.setPosition(position);
    this.resetBody();
    this.rig.reset(this.state);
    if (this.ctx) this.rig.writeTo(this.ctx.camera);
  }

  respawn(): void {
    const target = this.health.pickSpawn();
    const position = target ? target.position : this.fallbackSpawn();
    const yaw = target ? target.yaw : this.state.yaw;

    this.health.reset();
    this.state.pitch = 0;
    this.teleport(position, yaw);
    this.ctx?.tryGet<RenderSystem>('render')?.setConcussion(0, 0);
    // The weapon lockout releases itself now that the player is alive again.
    this.spawnPending = true;
  }

  /** Zero the body and put every stateful helper back to rest. */
  private resetBody(): void {
    const s = this.state;
    s.velocity.set(0, 0, 0);
    s.speed = 0;
    s.grounded = false;
    s.groundNormal.set(0, 1, 0);
    s.airTime = 0;
    s.groundTime = 0;
    s.blockedTime = 0;
    s.jumped = false;
    s.stepDistance = 0;
    s.adsAmount = 0;
    s.holdingBreath = false;
    this.movement.reset();
    this.mantle.reset();
    this.stanceMachine.reset(s, this.handle);
    this.footsteps.reset(s);
    this.input.jumpBuffer = 0;
    this.forwardTapTime = -1;
  }

  private acquireCapsule(): void {
    const physics = this.physics ?? this.ctx.tryGet<PhysicsSystem>('physics') ?? null;
    this.physics = physics;
    if (!physics?.ready) return;
    this.handle = physics.createCharacter(this.state.feet, STAND_HEIGHT, P.radius, {
      kind: 'character',
      entity: this.health.entity,
      team: 'player',
    });
    this.resetBody();
  }

  /** For the case where the map published no spawn points at all. */
  private fallbackSpawn(): THREE.Vector3 {
    const ground = this.ctx?.tryGet<WorldSystem>('world')?.sampleGround(0, 48);
    return new THREE.Vector3(0, ground ?? 0, 48);
  }

  private onDeath(): void {
    this.clearIntent();
    this.state.velocity.set(0, 0, 0);
    this.mantle.cancel(this.state);
  }
}
