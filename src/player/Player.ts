import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { TUNING, QUALITY } from '../core/Config';
import { Signals, type SurfaceKind } from '../core/Signals';
import type { PhysicsSystem } from '../physics/Physics';
import type { LevelSystem } from '../world/Level';

export type Stance = 'stand' | 'crouch' | 'prone';

/**
 * First-person player: movement, stance, camera dynamics, and health.
 *
 * The movement model is deliberately Quake-derived (accelerate toward a
 * wish-direction, clamp the projection onto it, apply friction only when
 * grounded) because that is what modern shooters still use — it gives crisp
 * strafing and air control without the floaty overshoot of a naive
 * force-based controller.
 *
 * Everything the camera does beyond raw look input — bob, sway, lean, breath,
 * landing dip, recoil recovery — is layered as an offset on top of the logical
 * eye transform. Gameplay never reads those offsets, so aim stays honest while
 * the presentation is free to be as animated as it needs to be.
 */
export class PlayerSystem implements System {
  readonly name = 'player';
  readonly order = 10;

  readonly position = new THREE.Vector3(0, 2, 44);
  readonly velocity = new THREE.Vector3();
  /** Logical look angles, radians. Yaw is applied around Y, pitch around X. */
  yaw = Math.PI;
  pitch = 0;

  stance: Stance = 'stand';
  grounded = false;
  sprinting = false;
  tacticalSprint = false;
  sliding = false;
  mantling = false;
  ads = false;
  health = 100;
  maxHealth = 100;
  alive = true;
  actorId = 0;

  /** Surface the player is currently standing on, for footsteps and VFX. */
  groundSurface: SurfaceKind = 'sand';

  /** Additive camera offsets, written by weapons and gameplay. */
  readonly recoilOffset = new THREE.Euler(0, 0, 0, 'YXZ');
  readonly viewKick = new THREE.Vector2();

  private ctx!: EngineContext;
  private physics!: PhysicsSystem;
  private level!: LevelSystem;

  private eyeHeight: number = TUNING.eyeHeight;
  private targetEyeHeight: number = TUNING.eyeHeight;
  private readonly groundNormal = new THREE.Vector3(0, 1, 0);
  private coyoteTime = 0;
  private jumpBuffer = 0;
  private slideTimer = 0;
  private slideCooldown = 0;
  private sprintHeldTime = 0;
  private lastGroundedSpeed = 0;
  private fallStartY = 0;
  private falling = false;
  private regenDelay = 0;
  private lean = 0;
  private leanTarget = 0;

  // Camera dynamics state.
  private bobPhase = 0;
  private bobAmount = 0;
  private readonly swayOffset = new THREE.Vector2();
  private readonly swayVelocity = new THREE.Vector2();
  private breathPhase = 0;
  private landDip = 0;
  private landDipVel = 0;
  private stepDistance = 0;
  private rollAngle = 0;
  private fovBase = 80;
  private fovCurrent = 80;
  private fovTarget = 80;

  private readonly resolveOut = {
    grounded: false,
    groundNormal: new THREE.Vector3(0, 1, 0),
    surface: 'sand' as SurfaceKind,
    hitWall: false,
  };

  private readonly _wish = new THREE.Vector3();
  private readonly _fwd = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _tmp = new THREE.Vector3();
  private readonly _mouse = { x: 0, y: 0 };

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.physics = ctx.get<PhysicsSystem>('physics')!;
    this.level = ctx.get<LevelSystem>('level')!;

    const spawn = this.level.spawns.find((s) => s.team === 'player');
    if (spawn) {
      this.position.copy(spawn.position).add(new THREE.Vector3(0, 0.2, 0));
      this.yaw = spawn.yaw;
    }

    this.fovBase = ctx.camera.fov;
    this.fovCurrent = this.fovBase;
    this.fovTarget = this.fovBase;

    Signals.on('player:damaged', ({ amount, direction }) => {
      if (!this.alive) return;
      this.health = Math.max(0, this.health - amount);
      this.regenDelay = 4.2;
      const pipeline = ctx.engine.pipeline;
      pipeline.damageFlash = Math.min(1, pipeline.damageFlash + amount / 45);
      // Project the hit direction into screen space for the directional
      // indicator; the composite shader only needs the XY.
      this._tmp.copy(direction).applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw);
      pipeline.damageDir.set(this._tmp.x, -this._tmp.z, 0).normalize();
      Signals.emit('camera:shake', { amplitude: Math.min(0.06, amount * 0.0022), duration: 0.28 });
      if (this.health <= 0) {
        this.alive = false;
        Signals.emit('player:died', { cause: 'bullet' });
      }
    });

    Signals.on('player:respawn', () => {
      this.health = this.maxHealth;
      this.alive = true;
      this.velocity.setScalar(0);
      const sp = this.level.spawns.find((s) => s.team === 'player');
      if (sp) {
        this.position.copy(sp.position).add(new THREE.Vector3(0, 0.2, 0));
        this.yaw = sp.yaw;
        this.pitch = 0;
      }
    });
  }

  get eyePosition(): THREE.Vector3 {
    return this._tmp.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
  }

  get height(): number {
    return this.stance === 'prone' ? 0.7 : this.stance === 'crouch' ? 1.25 : TUNING.playerHeight;
  }

  get speedFraction(): number {
    const horizontal = Math.hypot(this.velocity.x, this.velocity.z);
    return THREE.MathUtils.clamp(horizontal / TUNING.tacticalSprintSpeed, 0, 1);
  }

  // ------------------------------------------------------------ look -------

  update(dt: number, ctx: EngineContext): void {
    if (!this.alive) return;
    const input = ctx.input;

    input.consumeMouseDelta(this._mouse);
    let sens = input.sensitivity;
    if (this.ads) sens *= input.adsSensitivityScale * (this.fovCurrent / this.fovBase);

    this.yaw -= this._mouse.x * sens;
    this.pitch -= this._mouse.y * sens;

    // Gamepad look with an acceleration curve; linear sticks feel sluggish
    // at small deflections and twitchy at full.
    if (input.gamepadActive) {
      const lx = input.stickLook.x;
      const ly = input.stickLook.y;
      const curve = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2.1);
      const rate = 3.4 * (this.ads ? 0.55 : 1);
      this.yaw -= curve(lx) * rate * dt;
      this.pitch -= curve(ly) * rate * dt * (input.invertY ? -1 : 1);
    }

    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    this.yaw = ((this.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

    // Lean, bound to Q/E-style keys via the tactical/use actions when held
    // with a modifier. Kept simple: peek left/right around a pivot.
    this.leanTarget = 0;
    if (input.down('lean_left')) this.leanTarget = -1;
    if (input.down('lean_right')) this.leanTarget = 1;
    this.lean = THREE.MathUtils.damp(this.lean, this.leanTarget, 9, dt);

    this.updateStance(input, dt);
    this.updateHealth(dt);
    this.updateCameraDynamics(dt);
  }

  private updateStance(input: EngineContext['input'], dt: number): void {
    if (input.pressed('crouch')) {
      if (this.stance === 'crouch' && this.canStand()) this.setStance('stand');
      else if (this.stance !== 'crouch') this.setStance('crouch');
    }
    if (input.pressed('prone')) {
      this.setStance(this.stance === 'prone' ? (this.canStand() ? 'stand' : 'crouch') : 'prone');
    }

    const wantsSprint = input.down('sprint');
    const movingForward = input.down('forward') || (input.gamepadActive && input.stickMove.y < -0.4);

    if (wantsSprint && movingForward && this.grounded && !this.ads && this.stance !== 'prone') {
      this.sprintHeldTime += dt;
      this.sprinting = true;
      // Tactical sprint: a short burst of extra speed available for the first
      // couple of seconds, then it decays back to a normal sprint.
      this.tacticalSprint = this.sprintHeldTime < 2.2;
    } else {
      this.sprinting = false;
      this.tacticalSprint = false;
      this.sprintHeldTime = Math.max(0, this.sprintHeldTime - dt * 1.6);
    }

    // Slide: requires sprint speed, has a cooldown, and cancels sprint.
    this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    if (
      input.pressed('crouch') && this.sprinting && this.grounded &&
      !this.sliding && this.slideCooldown <= 0 &&
      Math.hypot(this.velocity.x, this.velocity.z) > TUNING.walkSpeed * 1.15
    ) {
      this.sliding = true;
      this.slideTimer = TUNING.slideDuration;
      this.setStance('crouch');
      this._tmp.set(this.velocity.x, 0, this.velocity.z).normalize();
      this.velocity.addScaledVector(this._tmp, TUNING.slideImpulse * 0.42);
      Signals.emit('player:slideStart', { surface: this.groundSurface });
      Signals.emit('camera:shake', { amplitude: 0.012, duration: 0.2 });
    }

    if (this.sliding) {
      this.slideTimer -= dt;
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (this.slideTimer <= 0 || speed < 2.2 || !this.grounded || input.pressed('jump')) {
        this.sliding = false;
        this.slideCooldown = 0.55;
        Signals.emit('player:slideEnd', {});
        if (this.canStand() && !input.down('crouch')) this.setStance('stand');
      }
    }

    this.ads = input.down('ads') && !this.sprinting && !this.sliding;
  }

  private setStance(next: Stance): void {
    if (this.stance === next) return;
    this.stance = next;
    this.targetEyeHeight =
      next === 'prone' ? TUNING.proneEyeHeight
      : next === 'crouch' ? TUNING.crouchEyeHeight
      : TUNING.eyeHeight;
    Signals.emit('player:stanceChanged', { stance: next });
  }

  private canStand(): boolean {
    const head = this._tmp.copy(this.position);
    head.y += this.height;
    const hit = this.physics.trace(head, new THREE.Vector3(0, 1, 0), TUNING.playerHeight - this.height + 0.15);
    return !hit.hit;
  }

  private updateHealth(dt: number): void {
    this.regenDelay = Math.max(0, this.regenDelay - dt);
    if (this.regenDelay <= 0 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + 32 * dt);
    }
    const pipeline = this.ctx.engine.pipeline;
    pipeline.damageFlash = Math.max(0, pipeline.damageFlash - dt * 1.6);
    // Low health desaturates and tunnels the frame.
    const hurt = 1 - this.health / this.maxHealth;
    pipeline.suppression = Math.max(pipeline.suppression * (1 - dt * 2.2), hurt > 0.55 ? (hurt - 0.55) / 0.45 * 0.7 : 0);
    pipeline.concussion = Math.max(0, pipeline.concussion - dt * 0.9);
  }

  // -------------------------------------------------------- simulation -----

  fixedUpdate(dt: number, ctx: EngineContext): void {
    if (!this.alive) {
      this.velocity.y -= TUNING.gravity * dt;
      this.position.addScaledVector(this.velocity, dt);
      this.physics.resolveCapsule(this.position, TUNING.playerRadius, 0.6, this.resolveOut);
      return;
    }

    const input = ctx.input;

    // ---- wish direction ----
    this._fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).negate();
    this._right.set(this._fwd.z, 0, -this._fwd.x);

    let fwdAxis = 0;
    let rightAxis = 0;
    if (input.down('forward')) fwdAxis += 1;
    if (input.down('back')) fwdAxis -= 1;
    if (input.down('right')) rightAxis += 1;
    if (input.down('left')) rightAxis -= 1;
    if (input.gamepadActive) {
      fwdAxis = THREE.MathUtils.clamp(fwdAxis - input.stickMove.y, -1, 1);
      rightAxis = THREE.MathUtils.clamp(rightAxis + input.stickMove.x, -1, 1);
    }

    this._wish.set(0, 0, 0)
      .addScaledVector(this._fwd, fwdAxis)
      .addScaledVector(this._right, rightAxis);
    const wishLen = this._wish.length();
    if (wishLen > 1e-4) this._wish.divideScalar(wishLen);

    let maxSpeed = this.targetSpeed();
    // Strafing and backpedalling are slower, as in every modern shooter —
    // it is what makes forward movement feel committed.
    if (fwdAxis < 0) maxSpeed *= 0.78;
    else if (fwdAxis === 0 && rightAxis !== 0) maxSpeed *= 0.86;

    // ---- jump ----
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (input.pressed('jump')) this.jumpBuffer = 0.14;
    this.coyoteTime = this.grounded ? 0.12 : Math.max(0, this.coyoteTime - dt);

    if (this.jumpBuffer > 0 && this.coyoteTime > 0 && !this.mantling) {
      if (this.stance !== 'stand' && this.canStand()) this.setStance('stand');
      if (this.stance === 'stand') {
        this.velocity.y = TUNING.jumpVelocity;
        this.grounded = false;
        this.coyoteTime = 0;
        this.jumpBuffer = 0;
        this.sliding = false;
        Signals.emit('player:jump', {});
      }
    }

    // ---- mantle ----
    if (!this.grounded && this.velocity.y > -2 && fwdAxis > 0) this.tryMantle(dt);

    // ---- acceleration ----
    if (this.grounded) {
      if (this.sliding) {
        // Sliding preserves momentum with much lower friction and no control
        // authority beyond a small steering nudge.
        this.applyFriction(dt, 2.4);
        this.accelerate(this._wish, maxSpeed * 0.35, 8, dt);
      } else {
        this.applyFriction(dt, TUNING.groundFriction);
        this.accelerate(this._wish, maxSpeed, TUNING.groundAccel, dt);
      }
    } else {
      this.accelerate(this._wish, maxSpeed, TUNING.airAccel, dt);
      this.velocity.y -= TUNING.gravity * dt;
    }

    // ---- integrate + resolve ----
    const wasGrounded = this.grounded;
    this.position.addScaledVector(this.velocity, dt);

    this.resolveOut.surface = this.groundSurface;
    this.physics.resolveCapsule(this.position, TUNING.playerRadius, this.height, this.resolveOut);

    // Step-up: probe forward and up so small obstacles do not stop the player.
    if (this.resolveOut.hitWall && this.grounded && wishLen > 0.1) {
      this.tryStepUp(dt);
    }

    this.grounded = this.resolveOut.grounded;
    this.groundNormal.copy(this.resolveOut.groundNormal);
    this.groundSurface = this.resolveOut.surface;

    if (this.grounded) {
      if (this.velocity.y < 0) this.velocity.y = 0;
      // Project velocity onto the ground plane so slopes do not bleed speed.
      const vn = this.velocity.dot(this.groundNormal);
      if (vn < 0) this.velocity.addScaledVector(this.groundNormal, -vn);
    }

    // ---- landing ----
    if (!wasGrounded && this.grounded) {
      const impact = Math.abs(this.lastGroundedSpeed);
      if (impact > 3.2) {
        this.landDipVel -= Math.min(impact * 0.022, 0.16);
        Signals.emit('player:land', { impactSpeed: impact, surface: this.groundSurface });
        Signals.emit('camera:shake', {
          amplitude: Math.min(0.03, impact * 0.0022),
          duration: 0.22,
        });
      }
      if (impact > 12.5) {
        const damage = (impact - 12.5) * 7.5;
        Signals.emit('player:damaged', {
          amount: damage,
          direction: new THREE.Vector3(0, 1, 0),
          cause: 'fall',
        });
      }
      this.falling = false;
    }
    if (!this.grounded) {
      if (!this.falling) {
        this.falling = true;
        this.fallStartY = this.position.y;
      }
      this.lastGroundedSpeed = -this.velocity.y;
    }
    void this.fallStartY;

    // ---- footsteps ----
    if (this.grounded && !this.sliding) {
      const horizontal = Math.hypot(this.velocity.x, this.velocity.z);
      this.stepDistance += horizontal * dt;
      const stride =
        this.stance === 'prone' ? 1.1 :
        this.stance === 'crouch' ? 1.5 :
        this.sprinting ? 2.05 : 1.72;
      if (this.stepDistance > stride && horizontal > 0.6) {
        this.stepDistance = 0;
        Signals.emit('player:footstep', {
          surface: this.groundSurface,
          sprinting: this.sprinting,
          position: this.position.clone(),
        });
      }
    }

    // Keep the player inside the playable bounds.
    const b = this.level.bounds;
    this.position.x = THREE.MathUtils.clamp(this.position.x, b.min.x, b.max.x);
    this.position.z = THREE.MathUtils.clamp(this.position.z, b.min.z, b.max.z);
    if (this.position.y < -8) {
      Signals.emit('player:damaged', { amount: 200, direction: new THREE.Vector3(0, 1, 0), cause: 'fall' });
    }
  }

  private targetSpeed(): number {
    let base: number;
    if (this.stance === 'prone') base = TUNING.proneSpeed;
    else if (this.stance === 'crouch') base = TUNING.crouchSpeed;
    else if (this.tacticalSprint) base = TUNING.tacticalSprintSpeed;
    else if (this.sprinting) base = TUNING.sprintSpeed;
    else base = TUNING.walkSpeed;
    if (this.ads) base *= TUNING.adsSpeedScale;
    return base;
  }

  private applyFriction(dt: number, coefficient: number): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed < 1e-4) return;
    // Constant deceleration below a floor keeps stopping crisp instead of
    // asymptotic, which is what makes counter-strafing feel responsive.
    const control = Math.max(speed, 3.2);
    const drop = control * coefficient * dt;
    const scale = Math.max(0, speed - drop) / speed;
    this.velocity.x *= scale;
    this.velocity.z *= scale;
  }

  private accelerate(wish: THREE.Vector3, maxSpeed: number, accel: number, dt: number): void {
    const currentSpeed = this.velocity.dot(wish);
    const addSpeed = maxSpeed - currentSpeed;
    if (addSpeed <= 0) return;
    const accelSpeed = Math.min(accel * maxSpeed * dt, addSpeed);
    this.velocity.addScaledVector(wish, accelSpeed);
  }

  private tryStepUp(dt: number): void {
    const dir = this._wish.clone().normalize();
    if (dir.lengthSq() < 0.1) return;

    const probeStart = this._tmp.copy(this.position);
    probeStart.y += TUNING.maxStepHeight + 0.05;
    const forward = this.physics.trace(probeStart, dir, TUNING.playerRadius + 0.22);
    if (forward.hit) return;

    const above = probeStart.clone().addScaledVector(dir, TUNING.playerRadius + 0.18);
    const down = this.physics.trace(above, new THREE.Vector3(0, -1, 0), TUNING.maxStepHeight + 0.1);
    if (!down.hit || down.normal.y < 0.7) return;

    const rise = down.point.y - this.position.y;
    if (rise > 0.02 && rise <= TUNING.maxStepHeight) {
      this.position.y = down.point.y + 0.01;
      this.grounded = true;
    }
    void dt;
  }

  private tryMantle(dt: number): void {
    const dir = this._fwd.clone();
    const chest = this._tmp.copy(this.position);
    chest.y += 1.0;
    const wall = this.physics.trace(chest, dir, 0.85);
    if (!wall.hit || wall.normal.y > 0.5) return;

    const ledgeProbe = wall.point.clone().addScaledVector(dir, 0.35);
    ledgeProbe.y = this.position.y + TUNING.mantleMaxHeight + 0.4;
    const down = this.physics.trace(ledgeProbe, new THREE.Vector3(0, -1, 0), TUNING.mantleMaxHeight + 0.6);
    if (!down.hit || down.normal.y < 0.7) return;

    const rise = down.point.y - this.position.y;
    if (rise < 0.5 || rise > TUNING.mantleMaxHeight) return;

    // Pull the player up and over rather than teleporting: applying velocity
    // keeps the camera motion continuous and lets the animation read.
    this.velocity.y = Math.sqrt(2 * TUNING.gravity * (rise + 0.35));
    this.velocity.addScaledVector(dir, 2.6);
    this.mantling = true;
    Signals.emit('player:mantle', { height: rise });
    Signals.emit('camera:shake', { amplitude: 0.014, duration: 0.3, frequency: 18 });
    setTimeout(() => { this.mantling = false; }, 420);
    void dt;
  }

  // ---------------------------------------------------- camera dynamics ----

  private updateCameraDynamics(dt: number): void {
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, this.targetEyeHeight, 11, dt);

    const horizontal = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = this.grounded && horizontal > 0.4 && !this.sliding;

    // ---- head bob ----
    // Figure-eight path: the vertical component runs at twice the horizontal
    // frequency, which is what an actual gait produces.
    const bobFreq = this.sprinting ? 9.4 : this.stance === 'crouch' ? 5.6 : 7.2;
    if (moving) this.bobPhase += dt * bobFreq * THREE.MathUtils.clamp(horizontal / TUNING.walkSpeed, 0.5, 1.6);
    const bobTarget = moving ? THREE.MathUtils.clamp(horizontal / TUNING.sprintSpeed, 0, 1) : 0;
    this.bobAmount = THREE.MathUtils.damp(this.bobAmount, bobTarget, 7, dt);

    // ---- breathing ----
    this.breathPhase += dt * (this.ads ? 1.15 : 1.55);

    // ---- weapon sway from look input ----
    // Spring-damper on the mouse delta: the camera leads, the view model
    // trails. This is the main cue that the weapon has mass.
    const swayInput = new THREE.Vector2(-this._mouse.x * 0.0016, -this._mouse.y * 0.0016);
    this.swayVelocity.addScaledVector(swayInput, 26);
    this.swayVelocity.multiplyScalar(Math.max(0, 1 - 11 * dt));
    this.swayOffset.addScaledVector(this.swayVelocity, dt);
    this.swayOffset.multiplyScalar(Math.max(0, 1 - 7 * dt));
    this.swayOffset.x = THREE.MathUtils.clamp(this.swayOffset.x, -0.05, 0.05);
    this.swayOffset.y = THREE.MathUtils.clamp(this.swayOffset.y, -0.05, 0.05);

    // ---- landing dip (critically damped spring) ----
    const stiffness = 190;
    const damping = 22;
    this.landDipVel += (-stiffness * this.landDip - damping * this.landDipVel) * dt;
    this.landDip += this.landDipVel * dt;
    this.landDip = THREE.MathUtils.clamp(this.landDip, -0.4, 0.12);

    // ---- strafe roll ----
    const strafe = this.velocity.dot(this._right) / Math.max(TUNING.sprintSpeed, 1);
    const rollTarget = -strafe * 0.026 + this.lean * 0.22 + (this.sliding ? 0.05 : 0);
    this.rollAngle = THREE.MathUtils.damp(this.rollAngle, rollTarget, 8, dt);

    // ---- FOV ----
    const sprintFov = this.tacticalSprint ? 9 : this.sprinting ? 6 : 0;
    const slideFov = this.sliding ? 7 : 0;
    this.fovTarget = this.fovBase + sprintFov + slideFov;
    this.fovCurrent = THREE.MathUtils.damp(this.fovCurrent, this.fovTarget, 8, dt);

    // ---- recoil recovery ----
    this.recoilOffset.x = THREE.MathUtils.damp(this.recoilOffset.x, 0, 7.5, dt);
    this.recoilOffset.y = THREE.MathUtils.damp(this.recoilOffset.y, 0, 7.5, dt);
    this.recoilOffset.z = THREE.MathUtils.damp(this.recoilOffset.z, 0, 6, dt);
  }

  lateUpdate(dt: number, ctx: EngineContext): void {
    const cam = ctx.camera;

    const bobX = Math.sin(this.bobPhase) * 0.036 * this.bobAmount;
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.028 * this.bobAmount;
    const breathY = Math.sin(this.breathPhase) * (this.ads ? 0.0022 : 0.0055);
    const breathX = Math.sin(this.breathPhase * 0.7) * (this.ads ? 0.0016 : 0.004);

    // Lean pivots the camera around a point roughly at the shoulder.
    const leanOffset = this._right.clone().multiplyScalar(this.lean * 0.42);

    cam.position.set(
      this.position.x + bobX + breathX + leanOffset.x,
      this.position.y + this.eyeHeight + bobY + breathY + this.landDip,
      this.position.z + leanOffset.z,
    );

    cam.rotation.set(
      this.pitch + this.recoilOffset.x + this.swayOffset.y * 0.35 + Math.sin(this.bobPhase * 2) * 0.0025 * this.bobAmount,
      this.yaw + this.recoilOffset.y + this.swayOffset.x * 0.35,
      this.rollAngle + this.recoilOffset.z,
      'YXZ',
    );

    if (Math.abs(cam.fov - this.fovCurrent) > 0.01) {
      cam.fov = this.fovCurrent;
      cam.updateProjectionMatrix();
    }

    // The view-model camera shares orientation but not the bob/lean offsets;
    // the view model applies its own, larger versions of those in local space.
    ctx.viewCamera.position.copy(cam.position);
    ctx.viewCamera.quaternion.copy(cam.quaternion);

    // Feed the renderer's DOF focus with what the player is actually looking
    // at, so pulling up into a doorway refocuses like a real camera operator.
    if (QUALITY.depthOfField) {
      const pipeline = ctx.engine.pipeline;
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      const hit = this.physics.trace(cam.position, dir, 120);
      const target = hit.hit ? hit.distance : 90;
      pipeline.focusDistance = THREE.MathUtils.damp(pipeline.focusDistance, target, 5, dt);
    }
  }

  /** Applies weapon recoil to the view. Called by the weapon system. */
  addRecoil(pitch: number, yaw: number, roll: number): void {
    this.recoilOffset.x += pitch;
    this.recoilOffset.y += yaw;
    this.recoilOffset.z += roll;
  }

  /** World-space forward vector including recoil, used for bullet direction. */
  aimDirection(out: THREE.Vector3): THREE.Vector3 {
    return out.set(0, 0, -1).applyQuaternion(this.ctx.camera.quaternion).normalize();
  }
}
