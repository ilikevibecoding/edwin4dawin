import * as THREE from 'three';
import { GROUP } from '../core/Physics.js';

/**
 * First-person player: kinematic capsule + camera rig.
 *
 *   player.rig    Object3D at the feet, rotated by yaw
 *   player.head   child at eye height, rotated by pitch (+ view punch / bob)
 *   camera        child of head (RenderSystem writes shake into the camera's local transform)
 *
 * Exposes: position (feet, world), eyePosition, velocity, yaw, pitch, isGrounded, isSprinting,
 * isCrouching, isAiming, speedFactor (0..1), bobPhase, health, addViewPunch(), damage(), spawn().
 * Emits: 'footstep' {surface, position, sprint}, 'player:jump', 'player:land', 'player:damaged',
 *        'player:died', 'player:respawn', 'player:health' {health, max}
 */
export class Player {
  constructor(game) {
    this.game = game;
    this.events = game.events;

    this.rig = new THREE.Object3D();
    this.rig.name = 'PlayerRig';
    this.head = new THREE.Object3D();
    this.head.name = 'PlayerHead';
    this.rig.add(this.head);
    this.head.add(game.camera);
    game.scene.add(this.rig);

    this.height = 1.8;
    this.radius = 0.35;
    this.eyeHeightStanding = 1.62;
    this.eyeHeightCrouched = 1.05;
    this.eyeHeight = this.eyeHeightStanding;

    this.walkSpeed = 4.6;
    this.sprintSpeed = 7.4;
    this.crouchSpeed = 2.4;
    this.aimSpeed = 3.0;
    this.acceleration = 42;
    this.airAcceleration = 8;
    this.friction = 11;
    this.gravity = 22;
    this.jumpSpeed = 6.6;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.eyePosition = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, -1);
    this.yaw = 0;
    this.pitch = 0;
    this.isGrounded = false;
    this.isSprinting = false;
    this.isCrouching = false;
    this.isAiming = false; // set by WeaponSystem
    this.speedFactor = 0;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this._wasGrounded = true;
    this._coyoteTime = 0;
    this._lastStepPhase = 0;
    this._fallSpeed = 0;

    this.maxHealth = 100;
    this.health = 100;
    this.alive = true;
    this._regenDelay = 0;
    this.regenRate = 32; // hp/s after delay
    this.regenAfter = 3.5;

    this._punch = new THREE.Vector2(); // pitch, yaw
    this._punchVel = new THREE.Vector2();
    this.controlsEnabled = true;

    this._tmp = new THREE.Vector3();
    this._wishDir = new THREE.Vector3();
    this._move = new THREE.Vector3();
    this._down = new THREE.Vector3(0, -1, 0);

    this.character = null;
  }

  spawn(spawnPoint) {
    const pos = spawnPoint?.position || new THREE.Vector3(0, 0, 0);
    this.yaw = spawnPoint?.yaw ?? 0;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.alive = true;
    this._regenDelay = 0;
    this.controlsEnabled = true;
    if (!this.character) {
      this.character = this.game.physics.createCharacter({
        position: new THREE.Vector3(pos.x, pos.y + this.height / 2, pos.z),
        radius: this.radius,
        halfHeight: this.height / 2 - this.radius,
        membership: GROUP.PLAYER,
        filter: GROUP.WORLD | GROUP.DEBRIS,
        data: { type: 'player', entity: this },
      });
    } else {
      this.character.teleport(new THREE.Vector3(pos.x, pos.y + this.height / 2, pos.z));
    }
    this.position.copy(pos);
    this.syncRig();
    this.events.emit('player:respawn', { position: this.position.clone() });
    this.events.emit('player:health', { health: this.health, max: this.maxHealth });
  }

  /** Teleport and set look angles (degrees). Used by debug/screenshot tooling. */
  setView(position, yawDeg, pitchDeg) {
    if (position) {
      this.position.copy(position);
      this.character?.teleport(new THREE.Vector3(position.x, position.y + this.height / 2, position.z));
      this.velocity.set(0, 0, 0);
    }
    if (yawDeg != null) this.yaw = THREE.MathUtils.degToRad(yawDeg);
    if (pitchDeg != null) this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.syncRig();
  }

  addViewPunch(pitchRad, yawRad) {
    this._punchVel.x += pitchRad * 60;
    this._punchVel.y += yawRad * 60;
  }

  damage(amount, from = null) {
    if (!this.alive || this.game.settings.godMode) return;
    this.health = Math.max(0, this.health - amount);
    this._regenDelay = this.regenAfter;
    this.events.emit('player:damaged', { amount, from, health: this.health });
    this.events.emit('player:health', { health: this.health, max: this.maxHealth });
    if (this.health <= 0) {
      this.alive = false;
      this.controlsEnabled = false;
      this.events.emit('player:died', { from });
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.events.emit('player:health', { health: this.health, max: this.maxHealth });
  }

  /** World-space ray from the eye along the view direction. */
  getViewRay(origin = new THREE.Vector3(), direction = new THREE.Vector3()) {
    this.game.camera.getWorldPosition(origin);
    this.game.camera.getWorldDirection(direction);
    return { origin, direction };
  }

  syncRig() {
    this.rig.position.copy(this.position);
    this.rig.rotation.set(0, this.yaw, 0);
    this.head.position.set(0, this.eyeHeight, 0);
    this.head.rotation.set(this.pitch + this._punch.x, this._punch.y, 0);
    this.rig.updateMatrixWorld(true);
    this.eyePosition.setFromMatrixPosition(this.game.camera.matrixWorld);
    this.forward.set(0, 0, -1).applyQuaternion(this.game.camera.getWorldQuaternion(new THREE.Quaternion()));
  }

  update(dt) {
    const { input, settings, physics } = this.game;
    if (dt <= 0) {
      this.syncRig();
      return;
    }
    const canControl = this.controlsEnabled && this.alive && this.game.isPlaying;

    // --- Look ---
    if (canControl && (input.pointerLocked || settings.shotMode)) {
      const sens = settings.mouseSensitivity * (this.isAiming ? 0.6 : 1);
      this.yaw -= input.mouseDelta.x * sens;
      this.pitch -= input.mouseDelta.y * sens * (settings.invertY ? -1 : 1);
      this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    }

    // --- Movement intent ---
    const axis = canControl ? input.moveAxis : { x: 0, y: 0 };
    const wantsSprint = canControl && input.isDown('sprint') && axis.y > 0 && !this.isAiming;
    this.isCrouching = canControl && input.isDown('crouch') && !wantsSprint;
    this.isSprinting = wantsSprint && !this.isCrouching;

    const targetEye = this.isCrouching ? this.eyeHeightCrouched : this.eyeHeightStanding;
    this.eyeHeight += (targetEye - this.eyeHeight) * Math.min(1, dt * 10);

    const maxSpeed = this.isSprinting ? this.sprintSpeed : this.isCrouching ? this.crouchSpeed : this.isAiming ? this.aimSpeed : this.walkSpeed;

    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    // forward = (-sin(yaw), 0, -cos(yaw)); right = (cos(yaw), 0, -sin(yaw))
    this._wishDir.set(-sinY * axis.y + cosY * axis.x, 0, -cosY * axis.y - sinY * axis.x);
    if (this._wishDir.lengthSq() > 1) this._wishDir.normalize();

    // --- Horizontal velocity (ground friction + acceleration) ---
    const hv = this._tmp.set(this.velocity.x, 0, this.velocity.z);
    if (this.isGrounded) {
      const speed = hv.length();
      if (speed > 0) {
        const drop = speed * this.friction * dt;
        hv.multiplyScalar(Math.max(speed - drop, 0) / speed);
      }
      const wishSpeed = maxSpeed * this._wishDir.length();
      const currentSpeed = hv.dot(this._wishDir.lengthSq() > 0 ? this._wishDir.clone().normalize() : this._wishDir);
      const addSpeed = wishSpeed - currentSpeed;
      if (addSpeed > 0 && this._wishDir.lengthSq() > 0) {
        const accel = Math.min(this.acceleration * dt * wishSpeed, addSpeed);
        hv.addScaledVector(this._wishDir.clone().normalize(), accel);
      }
    } else if (this._wishDir.lengthSq() > 0) {
      hv.addScaledVector(this._wishDir, this.airAcceleration * dt);
      const sp = hv.length();
      if (sp > maxSpeed) hv.multiplyScalar(maxSpeed / sp);
    }
    this.velocity.x = hv.x;
    this.velocity.z = hv.z;

    // --- Vertical ---
    this._coyoteTime = this.isGrounded ? 0.12 : Math.max(0, this._coyoteTime - dt);
    if (canControl && input.justPressed('jump') && (this.isGrounded || this._coyoteTime > 0)) {
      this.velocity.y = this.jumpSpeed;
      this.isGrounded = false;
      this._coyoteTime = 0;
      this.events.emit('player:jump', { position: this.position.clone() });
    }
    if (!this.isGrounded) this.velocity.y -= this.gravity * dt;
    else if (this.velocity.y < 0) this.velocity.y = -1.5; // keep pressed to ground for slopes/steps

    // --- Move capsule ---
    this._move.copy(this.velocity).multiplyScalar(dt);
    const moved = this.character.move(this._move);
    const wasGrounded = this.isGrounded;
    this.isGrounded = this.character.grounded;
    if (!wasGrounded && this.isGrounded) {
      const impact = Math.max(0, -this.velocity.y);
      this.events.emit('player:land', { position: this.position.clone(), impact });
      if (impact > 12) this.damage(Math.round((impact - 12) * 6));
      this.velocity.y = 0;
    }
    if (this.isGrounded && this.velocity.y < 0) this.velocity.y = 0;
    // Head bumps: if we tried to go up but got stopped.
    if (this.velocity.y > 0 && moved.y < this._move.y * 0.5) this.velocity.y = 0;

    // Physics body is stepped later; predict position from movement for a lag-free camera.
    const center = this.character.getPosition(this._tmp);
    this.position.set(center.x + moved.x, center.y + moved.y - this.height / 2, center.z + moved.z);

    // --- Speed / bob ---
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.speedFactor = THREE.MathUtils.clamp(hSpeed / this.sprintSpeed, 0, 1);
    const moving = this.isGrounded && hSpeed > 0.5;
    if (moving) {
      const stride = this.isSprinting ? 1.9 : this.isCrouching ? 1.1 : 1.55; // meters per cycle
      this.bobPhase += (hSpeed / stride) * dt * Math.PI * 2;
      this.bobAmount += (1 - this.bobAmount) * Math.min(1, dt * 8);
      const phase = this.bobPhase % (Math.PI * 2);
      if ((this._lastStepPhase < Math.PI && phase >= Math.PI) || phase < this._lastStepPhase) {
        this.events.emit('footstep', { position: this.position.clone(), sprint: this.isSprinting, crouch: this.isCrouching, surface: this.groundSurface() });
      }
      this._lastStepPhase = phase;
    } else {
      this.bobAmount += (0 - this.bobAmount) * Math.min(1, dt * 6);
    }

    // --- View punch spring ---
    const k = 180;
    const d = 18;
    this._punchVel.x += (-this._punch.x * k - this._punchVel.x * d) * dt;
    this._punchVel.y += (-this._punch.y * k - this._punchVel.y * d) * dt;
    this._punch.x += this._punchVel.x * dt;
    this._punch.y += this._punchVel.y * dt;

    // --- Health regen ---
    if (this.alive && this.health < this.maxHealth) {
      if (this._regenDelay > 0) this._regenDelay -= dt;
      else {
        this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt);
        this.events.emit('player:health', { health: this.health, max: this.maxHealth });
      }
    }

    // --- Camera rig ---
    this.rig.position.copy(this.position);
    this.rig.rotation.set(0, this.yaw, 0);
    // Head bob is kept subtle (MW-style: the weapon carries most of the movement read; the camera stays steady).
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.011 * this.bobAmount * (this.isSprinting ? 1.5 : 1);
    const bobRoll = Math.sin(this.bobPhase * 0.5) * 0.004 * this.bobAmount * (this.isSprinting ? 1.4 : 1);
    this.head.position.set(0, this.eyeHeight + bobY, 0);
    this.head.rotation.set(this.pitch + this._punch.x, this._punch.y, bobRoll);
    this.rig.updateMatrixWorld(true);
    this.eyePosition.setFromMatrixPosition(this.game.camera.matrixWorld);
    this.game.camera.getWorldDirection(this.forward);
  }

  /** Surface type under the feet (from physics user data). */
  groundSurface() {
    const origin = this._tmp.set(this.position.x, this.position.y + 0.3, this.position.z);
    const hit = this.game.physics.raycast(origin, this._down, 0.8, { exclude: this.character?.collider });
    return hit?.data?.surface || 'stone';
  }
}
