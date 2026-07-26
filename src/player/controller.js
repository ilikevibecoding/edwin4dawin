import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _delta = new THREE.Vector3();

const WALK_SPEED = 4.6;
const SPRINT_SPEED = 7.4;
const CROUCH_SPEED = 2.3;
const ADS_SPEED = 2.9;
const SLIDE_SPEED = 9.5;
const ACCEL_GROUND = 42;
const ACCEL_AIR = 9;
const FRICTION = 11;
const JUMP_VEL = 5.2;
const GRAVITY = 15.5;
const STAND_HEIGHT = 1.78;
const CROUCH_HEIGHT = 1.12;
const RADIUS = 0.34;
const EYE_RATIO = 0.925; // eye height as fraction of capsule height

export class PlayerController {
  constructor(game) {
    this.game = game;
    this.position = new THREE.Vector3(0, 0, 0); // capsule foot
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.height = STAND_HEIGHT;
    this.onGround = true;
    this.sprinting = false;
    this.crouching = false;
    this.sliding = false;
    this.slideTimer = 0;
    this.aiming = false;        // set by weapons system
    this.moveSpeed01 = 0;       // normalized planar speed for animation
    this.coyote = 0;
    this.airTime = 0;

    this.health = 100;
    this.maxHealth = 100;
    this.alive = true;
    this.regenDelay = 0;

    this.sensitivity = 0.0021;
    this.baseFov = 72;
    this.fovOffset = 0;         // weapons set ADS zoom via this

    // camera effects
    this.trauma = 0;            // 0..1 shake amount
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.landDip = 0;
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.leanRoll = 0;

    // group attached to camera for viewmodel (weapons)
    this.viewmodelRoot = new THREE.Group();
    game.camera.add(this.viewmodelRoot);
    game.scene.add(game.camera);

    game.events.on('explosion', ({ position, radius, damage }) => {
      const d = this.eyePos().distanceTo(position);
      if (d < radius * 2.2) this.addShake(Math.min(0.9, (1 - d / (radius * 2.2)) * 1.1));
      if (damage > 0 && d < radius) {
        const falloff = 1 - d / radius;
        this.damage(damage * falloff * falloff, position);
        const push = this.eyePos().sub(position).normalize();
        this.velocity.addScaledVector(push, falloff * 9);
        this.velocity.y += falloff * 4;
      }
    });
  }

  eyePos() {
    return new THREE.Vector3(this.position.x, this.position.y + this.height * EYE_RATIO, this.position.z);
  }

  teleport(pos, yaw = this.yaw, pitch = this.pitch) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.syncCamera(0);
  }

  addShake(amount) { this.trauma = Math.min(1, this.trauma + amount); }
  addRecoil(pitchKick, yawKick) { this.recoilPitch += pitchKick; this.recoilYaw += yawKick; }

  damage(amount, fromPos = null) {
    if (!this.alive) return;
    this.health -= amount;
    this.regenDelay = 4.0;
    const dir = fromPos ? fromPos.clone().sub(this.eyePos()) : null;
    this.game.events.emit('player:damage', { amount, direction: dir });
    this.addShake(Math.min(0.45, amount * 0.012));
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.game.events.emit('player:death', {});
    }
  }

  respawn(pos) {
    this.health = this.maxHealth;
    this.alive = true;
    this.teleport(pos ?? new THREE.Vector3(0, 0, 0));
    this.game.events.emit('player:respawn', {});
  }

  update(dt) {
    const { input, camera } = this.game;
    if (dt === 0) { this.syncCamera(0); return; }

    // ---- look -------------------------------------------------------------
    if (this.alive) {
      const sens = this.sensitivity * (this.aiming ? 0.62 : 1);
      this.yaw -= input.mouseDX * sens;
      this.pitch -= input.mouseDY * sens;
    }
    // recoil spring
    this.pitch += this.recoilPitch * dt * 22;
    this.yaw += this.recoilYaw * dt * 22;
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 14, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, 14, dt);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);

    // ---- stance -----------------------------------------------------------
    const wantCrouch = input.down('KeyC') || input.down('ControlLeft');
    const fwdInput = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
    const rightInput = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    const moving = fwdInput !== 0 || rightInput !== 0;
    const wantSprint = input.down('ShiftLeft') && fwdInput > 0 && !this.aiming && this.alive;

    // slide: start when sprinting + crouch pressed
    if (wantSprint === false && this.sliding) { /* keep sliding until timer */ }
    if (this.sprinting && wantCrouch && this.onGround && !this.sliding && this.moveSpeed01 > 0.7) {
      this.sliding = true;
      this.slideTimer = 0.85;
      const dir = this.planarVelocityDir();
      this.velocity.x = dir.x * SLIDE_SPEED;
      this.velocity.z = dir.z * SLIDE_SPEED;
      this.game.events.emit('player:footstep', { surface: 'slide', sprint: true });
    }
    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0 || !this.onGround || this.planarSpeed() < 2.5) this.sliding = false;
    }
    this.crouching = (wantCrouch || this.sliding) && this.alive;
    this.sprinting = wantSprint && !this.crouching && moving && this.onGround;

    const targetHeight = this.crouching ? CROUCH_HEIGHT : STAND_HEIGHT;
    this.height = THREE.MathUtils.damp(this.height, targetHeight, 12, dt);

    // ---- movement ---------------------------------------------------------
    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(-_fwd.z, 0, _fwd.x);
    _wish.set(0, 0, 0).addScaledVector(_fwd, fwdInput).addScaledVector(_right, rightInput);
    if (_wish.lengthSq() > 1) _wish.normalize();

    let maxSpeed = WALK_SPEED;
    if (this.sprinting) maxSpeed = SPRINT_SPEED;
    else if (this.sliding) maxSpeed = SLIDE_SPEED;
    else if (this.crouching) maxSpeed = CROUCH_SPEED;
    else if (this.aiming) maxSpeed = ADS_SPEED;
    if (!this.alive) { _wish.set(0, 0, 0); maxSpeed = 0; }

    if (this.onGround) {
      this.coyote = 0.12;
      // friction
      const speed = this.planarSpeed();
      if (speed > 0) {
        const drop = speed * (this.sliding ? 1.6 : FRICTION) * dt;
        const scale = Math.max(speed - drop, 0) / speed;
        this.velocity.x *= scale;
        this.velocity.z *= scale;
      }
      if (!this.sliding) {
        this.velocity.x += _wish.x * ACCEL_GROUND * dt;
        this.velocity.z += _wish.z * ACCEL_GROUND * dt;
        const s = this.planarSpeed();
        if (s > maxSpeed) { const k = maxSpeed / s; this.velocity.x *= k; this.velocity.z *= k; }
      }
    } else {
      this.coyote -= dt;
      this.velocity.x += _wish.x * ACCEL_AIR * dt;
      this.velocity.z += _wish.z * ACCEL_AIR * dt;
      const s = this.planarSpeed();
      const cap = Math.max(maxSpeed, 8);
      if (s > cap) { const k = cap / s; this.velocity.x *= k; this.velocity.z *= k; }
    }

    // jump
    if (input.pressed('Space') && this.alive && (this.onGround || this.coyote > 0) && !this.crouching) {
      this.velocity.y = JUMP_VEL;
      this.onGround = false;
      this.coyote = 0;
      this.game.events.emit('player:footstep', { surface: 'jump', sprint: this.sprinting });
    }

    this.velocity.y -= GRAVITY * dt;
    if (this.velocity.y < -30) this.velocity.y = -30;

    const wasGround = this.onGround;
    const fallSpeed = -this.velocity.y;
    _delta.copy(this.velocity).multiplyScalar(dt);
    const res = this.game.world.colliders.capsuleMove(this.position, RADIUS, this.height, _delta);
    this.onGround = res.onGround;
    if (res.hitCeiling && this.velocity.y > 0) this.velocity.y = 0;
    if (this.onGround && this.velocity.y < 0) this.velocity.y = 0;

    if (!wasGround && this.onGround && fallSpeed > 3) {
      this.landDip = Math.min(0.5, fallSpeed * 0.035);
      this.game.events.emit('player:land', { velocity: fallSpeed });
      if (fallSpeed > 14) this.damage((fallSpeed - 14) * 6);
    }
    if (!this.onGround) this.airTime += dt; else this.airTime = 0;

    // ---- health regen -------------------------------------------------------
    if (this.alive && this.health < this.maxHealth) {
      this.regenDelay -= dt;
      if (this.regenDelay <= 0) {
        this.health = Math.min(this.maxHealth, this.health + 38 * dt);
        this.game.events.emit('player:heal', {});
      }
    }

    // ---- camera feel --------------------------------------------------------
    const planar = this.planarSpeed();
    this.moveSpeed01 = THREE.MathUtils.clamp(planar / SPRINT_SPEED, 0, 1);

    // head bob
    const bobTarget = this.onGround && !this.sliding ? this.moveSpeed01 : 0;
    this.bobAmp = THREE.MathUtils.damp(this.bobAmp, bobTarget, 8, dt);
    const bobRate = this.sprinting ? 11.5 : 8.2;
    if (bobTarget > 0.05) this.bobPhase += dt * bobRate;

    // footsteps from bob cycle
    const prevSin = Math.sin(this.bobPhase - dt * bobRate);
    const curSin = Math.sin(this.bobPhase);
    if (this.onGround && this.bobAmp > 0.15 && prevSin > 0 && curSin <= 0) {
      this.game.events.emit('player:footstep', { surface: 'concrete', sprint: this.sprinting });
    }

    this.landDip = THREE.MathUtils.damp(this.landDip, 0, 7, dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.4);

    // lean roll from strafe
    const targetRoll = THREE.MathUtils.clamp(-rightInput * 0.012 - (this.sliding ? 0.05 : 0), -0.06, 0.06);
    this.leanRoll = THREE.MathUtils.damp(this.leanRoll, targetRoll, 8, dt);

    this.syncCamera(dt);
  }

  planarSpeed() { return Math.hypot(this.velocity.x, this.velocity.z); }
  planarVelocityDir() {
    const s = this.planarSpeed();
    if (s < 1e-4) return _fwd.clone();
    return new THREE.Vector3(this.velocity.x / s, 0, this.velocity.z / s);
  }

  syncCamera(dt) {
    const cam = this.game.camera;
    const t = this.game.time;

    // shake (trauma^2, layered sines approximating noise)
    const sh = this.trauma * this.trauma;
    const shakeYaw = sh * 0.017 * (Math.sin(t * 31.7) * 0.6 + Math.sin(t * 47.3 + 1.7) * 0.4);
    const shakePitch = sh * 0.015 * (Math.sin(t * 37.1 + 0.5) * 0.6 + Math.sin(t * 53.9 + 2.3) * 0.4);
    const shakeRoll = sh * 0.012 * Math.sin(t * 41.3 + 4.1);

    // bob: figure-8
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.028 * this.bobAmp;
    const bobX = Math.sin(this.bobPhase) * 0.014 * this.bobAmp;
    const bobRoll = Math.sin(this.bobPhase) * 0.006 * this.bobAmp;

    const eyeY = this.position.y + this.height * EYE_RATIO - this.landDip + (this.aiming ? bobY * 0.25 : bobY);
    cam.position.set(this.position.x + bobX * Math.cos(this.yaw), eyeY, this.position.z + bobX * Math.sin(this.yaw));
    cam.rotation.set(
      this.pitch + shakePitch,
      this.yaw + shakeYaw,
      this.leanRoll + bobRoll + shakeRoll,
      'YXZ'
    );

    // FOV: sprint widens, ADS narrows (weapons drive fovOffset)
    const sprintFov = this.sprinting ? 6 : 0;
    const targetFov = this.baseFov + sprintFov + this.fovOffset;
    if (dt > 0) cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 10, dt);
    else cam.fov = targetFov;
    cam.updateProjectionMatrix();
  }
}
