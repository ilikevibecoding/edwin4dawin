// First-person player: deliberate tactical movement, AABB collision with
// step-up, ramp-aware grounding, crouch, jump, camera with restrained bob,
// health/armor and damage feedback events.

import * as THREE from 'three';
import { PLAYER } from './constants.js';
import { axis, keyDown, keyPressed, consumeLook } from '../core/input.js';
import { getSetting } from '../core/settings.js';
import { emit } from '../core/events.js';
import { sfx, setListenerPose } from '../core/audio.js';
import { rng } from '../core/rng.js';

export class Player {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;
    this.pos = new THREE.Vector3(31, 0, 51.5); // feet position
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;   // radians; 0 faces -Z, PI faces +Z... see note below
    this.pitch = 0;
    this.height = PLAYER.heightStand;
    this.crouchFrac = 0;  // 0 stand .. 1 crouch
    this.grounded = true;
    this.groundSurface = 'concrete';
    this.health = PLAYER.maxHealth;
    this.armor = PLAYER.maxArmor;
    this.alive = true;
    this.adsFrac = 0;     // driven by weapon system
    this.moveState = 'idle';
    this.stepAccum = 0;
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.landDip = 0;
    this.recoilPitch = 0; // additive camera recoil (weapons write, we decay)
    this.recoilYaw = 0;
    this.recoilRecover = 9; // per-weapon recentering rate, set by applyRecoil
    this.landLock = 0;      // post-landing window with reduced ground control
    this.shake = 0;
    this.freezeLook = false;
    this.speedMult = 1;
    this.lastFallVel = 0;
    this.regenTimer = 0;
    this.regenTo = 0;
    this.damageTint = 0;
  }

  setSpawn(x, y, z, yawDeg) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    // yaw convention: yaw=0 faces -Z (north); positive rotates counter-clockwise (to west... standard three YXZ)
    this.yaw = THREE.MathUtils.degToRad(yawDeg ?? 0);
    this.pitch = 0;
  }

  get eyeHeight() {
    return THREE.MathUtils.lerp(PLAYER.eyeStand, PLAYER.eyeCrouch, this.crouchFrac);
  }
  get eyePos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z);
  }
  get aabb() {
    const r = PLAYER.radius;
    return { x0: this.pos.x - r, y0: this.pos.y, z0: this.pos.z - r, x1: this.pos.x + r, y1: this.pos.y + this.height, z1: this.pos.z + r };
  }
  forwardDir() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  // Sights scale sensitivity by the zoom actually on screen (fov ratio), so a
  // 1.12× pistol barely slows down while the 2.9× Longwatch crawls. 0.85 of the
  // way to true zoom compensation keeps big scopes usable without feeling icy.
  adsSensScale() {
    const baseFov = getSetting('fov') || 90;
    const fov = this.camera?.fov || baseFov;
    const ratio = THREE.MathUtils.clamp(fov / baseFov, 0.2, 1);
    return 1 - this.adsFrac * (1 - ratio) * 0.85;
  }

  applyLook(dx, dy) {
    const sens = 0.0021 * getSetting('mouseSensitivity') * this.adsSensScale();
    const inv = getSetting('invertY') ? -1 : 1;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens * inv;
    const lim = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  update(dt, { inputEnabled = true } = {}) {
    if (!this.alive) inputEnabled = false;
    // ---- look ----
    const look = consumeLook();
    if (inputEnabled && !this.freezeLook && (look.dx || look.dy)) this.applyLook(look.dx, look.dy);

    // ---- crouch ----
    const wantCrouch = inputEnabled && (keyDown('ControlLeft') || keyDown('ControlRight') || keyDown('KeyC'));
    const targetCrouch = wantCrouch ? 1 : 0;
    if (targetCrouch < this.crouchFrac) {
      // need headroom to stand; standing back up is the slower half of the peek
      const targetH = THREE.MathUtils.lerp(PLAYER.heightStand, PLAYER.heightCrouch, targetCrouch);
      if (!this.headroomBlocked(targetH)) this.crouchFrac = Math.max(targetCrouch, this.crouchFrac - dt * 5.5);
    } else {
      this.crouchFrac = Math.min(targetCrouch, this.crouchFrac + dt * 7);
    }
    this.height = THREE.MathUtils.lerp(PLAYER.heightStand, PLAYER.heightCrouch, this.crouchFrac);

    // ---- horizontal movement ----
    const a = inputEnabled ? axis() : { f: 0, s: 0 };
    const walking = inputEnabled && (keyDown('ShiftLeft') || keyDown('ShiftRight'));
    let speed = PLAYER.runSpeed;
    if (this.crouchFrac > 0.4) speed = PLAYER.crouchSpeed;
    else if (walking) speed = PLAYER.walkSpeed;
    speed *= THREE.MathUtils.lerp(1, PLAYER.adsSpeedMult, this.adsFrac) * this.speedMult;

    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3().addScaledVector(fwd, a.f).addScaledVector(right, a.s);
    if (wish.lengthSq() > 1) wish.normalize();

    // accelerate toward the wished velocity; decelerate via friction rate.
    // Just after a landing, ground accel is cut for a beat: you keep the speed
    // you carried in, but you cannot instantly redirect it — hopping around a
    // corner is slower than walking it.
    this.landLock = Math.max(0, this.landLock - dt);
    const landMult = this.landLock > 0 ? PLAYER.landAccelMult : 1;
    const targetX = wish.x * speed, targetZ = wish.z * speed;
    const hasInput = wish.lengthSq() > 0.01;
    const rate = this.grounded
      ? (hasInput ? PLAYER.accel * landMult : PLAYER.friction * speed)
      : PLAYER.airAccel;
    this.vel.x = approach(this.vel.x, targetX, rate * dt);
    this.vel.z = approach(this.vel.z, targetZ, rate * dt);

    // ---- jump / gravity ----
    if (inputEnabled && this.grounded && this.landLock <= 0 && keyPressed('Space') && this.crouchFrac < 0.5) {
      this.vel.y = PLAYER.jumpVel;
      this.grounded = false;
      sfx(`step_${this.groundSurface}`, { vol: 0.5, rateJitter: 0.1 });
      emit('noise', { pos: this.pos, radius: 5, type: 'footstep', source: 'player' });
    }
    if (!this.grounded) this.vel.y -= PLAYER.gravity * dt;

    // ---- integrate with collision ----
    this.moveWithCollision(dt);

    // ---- footsteps ----
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && hSpeed > 0.5) {
      const stride = this.crouchFrac > 0.4 ? 1.15 : walking ? 1.45 : 1.85;
      this.stepAccum += hSpeed * dt;
      if (this.stepAccum >= stride) {
        this.stepAccum = 0;
        const vol = this.crouchFrac > 0.4 ? 0.16 : walking ? 0.28 : 0.55;
        sfx(`step_${this.groundSurface}`, { vol, rateJitter: 0.14 });
        const radius = this.crouchFrac > 0.4 ? 2.2 : walking ? 4.5 : 10;
        emit('noise', { pos: this.pos, radius, type: 'footstep', source: 'player' });
      }
    } else this.stepAccum = Math.min(this.stepAccum, 0.6);

    // ---- movement state ----
    this.moveState = !this.grounded ? 'air'
      : hSpeed < 0.25 ? (this.crouchFrac > 0.4 ? 'crouch-idle' : 'idle')
      : this.crouchFrac > 0.4 ? 'crouch'
      : walking ? 'walk' : 'run';

    // ---- health regen (recruit) ----
    if (this.alive && this.regenTo > 0 && this.health < this.regenTo) {
      this.regenTimer += dt;
      if (this.regenTimer > 5) this.health = Math.min(this.regenTo, this.health + dt * 6);
    }

    // ---- camera ----
    this.updateCamera(dt, hSpeed, walking);
    setListenerPose(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z, fwd.x, fwd.z);
    this.damageTint = Math.max(0, this.damageTint - dt * 2.2);
  }

  headroomBlocked(targetH) {
    const r = PLAYER.radius - 0.02;
    const box = { x0: this.pos.x - r, y0: this.pos.y + this.height, z0: this.pos.z - r, x1: this.pos.x + r, y1: this.pos.y + targetH + 0.02, z1: this.pos.z + r };
    for (const c of this.world.colliders) {
      if (!c.blocksMove) continue;
      if (boxOverlap(box, c)) return true;
    }
    return false;
  }

  moveWithCollision(dt) {
    const w = this.world;
    const r = PLAYER.radius;

    // vertical first
    let newY = this.pos.y + this.vel.y * dt;
    const g = w.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.3, 0.4);
    const wasGrounded = this.grounded;
    if (this.vel.y <= 0) {
      if (newY <= g.y + 0.001) {
        newY = g.y;
        if (!wasGrounded && this.vel.y < -3) {
          const impact = Math.min(1, -this.vel.y / 8);
          this.landDip = Math.min(0.13, -this.vel.y * 0.018);
          this.landLock = PLAYER.landLockTime * (0.6 + impact * 0.6);
          sfx(`step_${g.surface}`, { vol: 0.7, rate: 0.8 });
          emit('noise', { pos: this.pos, radius: 7, type: 'footstep', source: 'player' });
        }
        this.grounded = true;
        this.vel.y = 0;
      } else if (wasGrounded && newY > g.y && newY - g.y < 0.5 && this.vel.y <= 0) {
        // walking down steps/ramps: stick to ground
        newY = g.y;
        this.vel.y = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    } else {
      this.grounded = false;
      // head bump
      const headBox = { x0: this.pos.x - r, y0: this.pos.y + this.height - 0.05, z0: this.pos.z - r, x1: this.pos.x + r, y1: newY + this.height, z1: this.pos.z + r };
      for (const c of w.colliders) {
        if (!c.blocksMove) continue;
        if (boxOverlap(headBox, c) && c.y0 >= this.pos.y + this.height * 0.6) { newY = Math.min(newY, c.y0 - this.height - 0.01); this.vel.y = 0; break; }
      }
    }
    this.pos.y = newY;

    // horizontal, axis separated with step-up
    this.moveAxis('x', this.vel.x * dt);
    this.moveAxis('z', this.vel.z * dt);
    this.groundSurface = g.surface;
  }

  moveAxis(ax, delta) {
    if (Math.abs(delta) < 1e-8) return;
    const w = this.world;
    const r = PLAYER.radius;
    const stepH = PLAYER.stepHeight;
    const tryMove = (feetY) => {
      const px = ax === 'x' ? this.pos.x + delta : this.pos.x;
      const pz = ax === 'z' ? this.pos.z + delta : this.pos.z;
      const box = { x0: px - r, y0: feetY + 0.02, z0: pz - r, x1: px + r, y1: feetY + this.height, z1: pz + r };
      for (const c of w.colliders) {
        if (!c.blocksMove) continue;
        if (boxOverlap(box, c)) return c;
      }
      return null;
    };
    let blocker = tryMove(this.pos.y);
    if (!blocker) {
      if (ax === 'x') this.pos.x += delta; else this.pos.z += delta;
      return;
    }
    // step-up: if blocker top is within step height and there's headroom
    if (this.grounded && blocker.y1 - this.pos.y <= stepH + 0.01 && blocker.y1 > this.pos.y) {
      const liftedY = blocker.y1 + 0.001;
      if (!tryMove(liftedY)) {
        this.pos.y = liftedY;
        if (ax === 'x') this.pos.x += delta; else this.pos.z += delta;
        return;
      }
    }
    // Slide: clamp to the face on the side the player is actually on. Choosing
    // by movement direction alone yanks the player backwards through a prop when
    // they walk off its far edge and start falling (the box becomes a blocker
    // again while their feet are still inside its footprint).
    if (ax === 'x') {
      const nearSide = this.pos.x <= (blocker.x0 + blocker.x1) / 2;
      this.pos.x = nearSide
        ? Math.min(this.pos.x + delta, blocker.x0 - r - 0.001)
        : Math.max(this.pos.x + delta, blocker.x1 + r + 0.001);
      this.vel.x = 0;
    } else {
      const nearSide = this.pos.z <= (blocker.z0 + blocker.z1) / 2;
      this.pos.z = nearSide
        ? Math.min(this.pos.z + delta, blocker.z0 - r - 0.001)
        : Math.max(this.pos.z + delta, blocker.z1 + r + 0.001);
      this.vel.z = 0;
    }
  }

  // Weapons push the muzzle; the recentering rate is part of the weapon's
  // signature (a pistol snaps back, a shotgun wallows).
  applyRecoil(pitchRad, yawRad, recoverRate) {
    this.recoilPitch += pitchRad;
    this.recoilYaw += yawRad;
    this.recoilRecover = recoverRate || 9;
  }

  updateCamera(dt, hSpeed, walking) {
    // recoil decay
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, this.recoilRecover, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, this.recoilRecover, dt);
    this.landDip = THREE.MathUtils.damp(this.landDip, 0, 8, dt);
    this.shake = Math.max(0, this.shake - dt * 3);

    const reduced = getSetting('reducedMotion');
    if (this.grounded && hSpeed > 0.4 && !reduced) {
      this.bobPhase += dt * (walking ? 7.5 : 10.5) * Math.min(1, hSpeed / 4);
      this.bobAmp = THREE.MathUtils.damp(this.bobAmp, Math.min(1, hSpeed / 4.4) * (this.crouchFrac > 0.4 ? 0.4 : 1), 8, dt);
    } else {
      this.bobAmp = THREE.MathUtils.damp(this.bobAmp, 0, 6, dt);
    }
    const bobY = Math.sin(this.bobPhase * 2) * 0.014 * this.bobAmp * (1 - this.adsFrac * 0.7);
    const bobX = Math.cos(this.bobPhase) * 0.009 * this.bobAmp * (1 - this.adsFrac * 0.7);

    let shakeX = 0, shakeY = 0;
    if (this.shake > 0 && !reduced) {
      shakeX = (rng.random() * 2 - 1) * 0.004 * this.shake;
      shakeY = (rng.random() * 2 - 1) * 0.004 * this.shake;
    }

    this.camera.position.set(
      this.pos.x + bobX * Math.cos(this.yaw),
      this.pos.y + this.eyeHeight + bobY - this.landDip,
      this.pos.z + bobX * Math.sin(this.yaw),
    );
    this.camera.rotation.set(
      this.pitch + this.recoilPitch + shakeY,
      this.yaw + this.recoilYaw + shakeX,
      Math.cos(this.bobPhase) * 0.0022 * this.bobAmp,
      'YXZ',
    );
  }

  takeDamage(amount, fromDir = null, kind = 'bullet') {
    if (!this.alive) return;
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = dmg * PLAYER.armorAbsorb;
      const armorCost = Math.min(this.armor, absorbed * (PLAYER.armorLossFactor + 0.55));
      this.armor = Math.max(0, this.armor - armorCost);
      dmg -= absorbed;
    }
    this.health -= dmg;
    this.regenTimer = 0;
    this.damageTint = Math.min(1, this.damageTint + 0.5 + dmg / 60);
    this.shake = Math.min(2, this.shake + 0.7);
    sfx('player_hurt', { vol: 0.75, rateJitter: 0.15 });
    emit('damage', { target: 'player', amount: dmg, dir: this.hudArcAngle(fromDir), kind });
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      emit('kill', { entity: 'player' });
    }
  }

  // Screen-space bearing for the HUD damage arc: 0 = dead ahead, growing
  // clockwise (the direction CSS rotate() turns). Shooters report their bearing
  // as atan2(dx, dz) − yaw + π, which runs counter-clockwise, so it flips sign;
  // an {x,z} source is resolved against the player's own yaw instead.
  hudArcAngle(from) {
    if (from == null) return null;
    if (typeof from === 'number') return wrapPi(-from);
    if (typeof from.x === 'number' && typeof from.z === 'number') {
      return wrapPi(this.yaw + Math.PI - Math.atan2(from.x - this.pos.x, from.z - this.pos.z));
    }
    return null;
  }

  heal(amount) { this.health = Math.min(PLAYER.maxHealth, this.health + amount); }
  addArmor(amount) { this.armor = Math.min(PLAYER.maxArmor, this.armor + amount); }
}

function boxOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0 && a.z0 < b.z1 && a.z1 > b.z0;
}

function wrapPi(a) {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

function approach(cur, target, maxDelta) {
  if (cur < target) return Math.min(cur + maxDelta, target);
  return Math.max(cur - maxDelta, target);
}
