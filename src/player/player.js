// First-person player controller (Opus 2 domain): deliberate tactical movement.
// Feet-based position; capsule approximated as AABB for the collision world.
//
// Movement feel (WP-014): asymmetric acceleration — a shove to get going, a slightly firmer brake
// to stop — plus micro air control, landing dips that scale with the fall, jump commitment (no
// bunny-hop chaining) and a footstep cadence locked to the camera bob so the step you hear is the
// step you see. The map has no ladders, so there is no climb state to maintain.
import * as THREE from 'three';
import { moveCharacter } from '../core/collide.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { settings } from '../core/settings.js';
import { Arsenal } from '../weapons/weapon.js';
import { ARMOR_BYPASS, ARMOR_SOAK, ARMOR_WEAR } from '../weapons/defs.js';

const RADIUS = 0.34;
const STAND_H = 1.8;
const CROUCH_H = 1.26;
const EYE_STAND = 1.66;
const EYE_CROUCH = 1.12;
const GRAVITY = 20;

// Ground handling: start firm, stop firmer. The gap is small on purpose — big enough that the stop
// feels planted, small enough that the operator still carries weight into a turn.
const ACCEL_GROUND = 26;
const DECEL_GROUND = 34;
const ACCEL_AIR = 5.5;        // micro air control only
const AIR_STEER_LIMIT = 0.42; // fraction of full walk speed a jump may redirect
const JUMP_VELOCITY = 4.4;
const LAND_LOCK = 0.24;       // seconds after a landing during which jump is refused
const LAND_STEADY = 0.2;      // brief post-land slowdown so hops cannot be chained into speed

export class Player {
  constructor(mission) {
    this.mission = mission;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.crouched = false;
    this.onGround = true;
    this.height = STAND_H;
    this.eyeSmooth = EYE_STAND;
    this.health = 100;
    this.armor = 0;
    this.armorMax = 0;
    this.alive = true;
    this.groundMaterial = 'concrete';
    this.stepAcc = 0;
    this.stepIndex = 0;      // bob valleys crossed; footsteps fire on the change
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.landDip = 0;
    this.landLockT = 0;
    this.landSteadyT = 0;
    this.moveState = 'idle';
    this.godMode = false;
    this.noclip = false;
    this.arsenal = new Arsenal(this);
    this.lastDamageDir = null;
    this.flash = 0; // flashbang blindness 0..1
  }

  spawn(pos, yawDeg, loadout, armor) {
    this.pos.set(pos[0], pos[1], pos[2]);
    this.vel.set(0, 0, 0);
    this.yaw = THREE.MathUtils.degToRad(yawDeg ?? 0);
    this.pitch = 0;
    this.health = 100;
    this.armor = armor ?? 0;
    this.armorMax = this.armor;
    this.alive = true;
    this.crouched = false;
    this.height = STAND_H;
    this.eyeSmooth = EYE_STAND;
    this.flash = 0;
    this.landDip = 0;
    this.landLockT = 0;
    this.landSteadyT = 0;
    this.stepAcc = 0;
    this.stepIndex = 0;
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.onGround = true;
    // NS-6: QA overrides must not survive a mission reset
    this.godMode = false;
    this.noclip = false;
    this.arsenal.equipLoadout(loadout);
  }

  get eyeY() { return this.pos.y + this.eyeSmooth; }
  get speedBase() { return 3.7; }

  /** Where the shot goes: aim plus the recoil offset and any scope sway currently applied. */
  get viewPitch() {
    const a = this.arsenal;
    return THREE.MathUtils.clamp(this.pitch + a.recoilPitch + a.scopeSwayY, -1.55, 1.55);
  }
  get viewYaw() {
    const a = this.arsenal;
    return this.yaw + a.recoilYaw + a.scopeSwayX;
  }

  // NOTE: this is the firing/interaction ray for the whole game, so it deliberately includes
  // recoil. A climbing pattern therefore walks the shots up the wall, which is what makes the
  // pattern learnable in the first place.
  forwardVec(out = new THREE.Vector3()) {
    const yaw = this.viewYaw, pitch = this.viewPitch;
    out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    return out;
  }

  update(dt, input, world) {
    if (!this.alive) {
      this.vel.set(0, 0, 0);
      this.landDip = Math.min(0.55, this.landDip + dt * 1.4);
      return;
    }
    // ---- look ----
    this.yaw -= input.lookDX;
    this.pitch = THREE.MathUtils.clamp(this.pitch - input.lookDY, -1.55, 1.55);

    // ---- crouch toggle ----
    if (input.crouchToggle) {
      if (this.crouched) {
        // try stand: need headroom
        const min = { x: this.pos.x - RADIUS, y: this.pos.y + CROUCH_H, z: this.pos.z - RADIUS };
        const max = { x: this.pos.x + RADIUS, y: this.pos.y + STAND_H, z: this.pos.z + RADIUS };
        const blocked = world.query(min, max, []).some((c) => c.blockMove);
        if (!blocked) { this.crouched = false; this.height = STAND_H; }
      } else {
        this.crouched = true;
        this.height = CROUCH_H;
      }
    }

    // ---- movement intent ----
    this.landLockT = Math.max(0, this.landLockT - dt);
    this.landSteadyT = Math.max(0, this.landSteadyT - dt);
    const speedMul = this.crouched ? 0.42 : input.walk ? 0.5 : 1;
    const steadyMul = this.landSteadyT > 0 ? 0.72 : 1;
    const target = new THREE.Vector3(input.moveX, 0, -input.moveZ);
    if (target.lengthSq() > 1) target.normalize();
    target.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    target.multiplyScalar(this.speedBase * speedMul * this.arsenal.aimMoveMul * steadyMul);

    if (this.onGround) {
      // asymmetric response: braking is a touch sharper than launching
      const wantSpeed = Math.hypot(target.x, target.z);
      const haveSpeed = Math.hypot(this.vel.x, this.vel.z);
      const rate = wantSpeed < haveSpeed - 0.05 ? DECEL_GROUND : ACCEL_GROUND;
      this.vel.x = THREE.MathUtils.damp(this.vel.x, target.x, rate * 0.35, dt);
      this.vel.z = THREE.MathUtils.damp(this.vel.z, target.z, rate * 0.35, dt);
    } else {
      // micro air control: nudge the trajectory, never redirect it
      const limit = this.speedBase * AIR_STEER_LIMIT;
      const nx = THREE.MathUtils.damp(this.vel.x, target.x, ACCEL_AIR * 0.35, dt);
      const nz = THREE.MathUtils.damp(this.vel.z, target.z, ACCEL_AIR * 0.35, dt);
      this.vel.x += THREE.MathUtils.clamp(nx - this.vel.x, -limit * dt * 6, limit * dt * 6);
      this.vel.z += THREE.MathUtils.clamp(nz - this.vel.z, -limit * dt * 6, limit * dt * 6);
    }

    // ---- jump & gravity ----
    // Jump commitment: you cannot re-launch the instant you touch down, so momentum cannot be
    // preserved across hops and every landing costs a moment of stability.
    if (input.jump && this.onGround && !this.crouched && this.landLockT <= 0) {
      this.vel.y = JUMP_VELOCITY;
      this.onGround = false;
      audio.footstep(this.groundMaterial, null, false, 0.5);
    }
    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -18) this.vel.y = -18;

    // ---- integrate with collision ----
    if (this.noclip) {
      const fly = new THREE.Vector3(target.x, (input.jump ? 4 : 0) - (this.crouched ? 4 : 0), target.z).multiplyScalar(dt * 2.4);
      this.pos.add(new THREE.Vector3(target.x * dt * 2.4, fly.y * dt * 30, target.z * dt * 2.4));
      this.vel.set(0, 0, 0);
    } else {
      const wasAirborne = !this.onGround;
      const fallSpeed = -this.vel.y;
      const res = moveCharacter(world, this.pos, RADIUS, this.height,
        { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { stepHeight: 0.35 });
      this.pos.set(res.pos.x, res.pos.y, res.pos.z);
      if (res.onGround && this.vel.y <= 0) {
        if (wasAirborne && fallSpeed > 3.2) {
          // dip scales with the drop: a stepped kerb barely registers, a storey buckles the knees
          const k = THREE.MathUtils.clamp((fallSpeed - 3.2) / 12, 0, 1);
          this.landDip = Math.max(this.landDip, 0.03 + k * k * 0.2);
          this.landLockT = LAND_LOCK;
          this.landSteadyT = LAND_STEADY * (0.5 + k);
          audio.footstep(this.groundMaterial, null, false, 0.55 + k * 0.45);
          bus.emit('noise', { pos: this.pos, radius: 5 + k * 7, type: 'land' });
        }
        this.onGround = true;
        this.vel.y = 0;
      } else if (res.hitHead && this.vel.y > 0) {
        this.vel.y = 0;
        this.onGround = false;
      } else {
        this.onGround = res.onGround;
      }
    }

    // ---- ground material for footsteps (and don't stand on characters) ----
    const g = world.raycast(this.pos.x, this.pos.y + 0.3, this.pos.z, 0, -1, 0, 0.8, (c) => c.blockMove);
    if (g) {
      this.groundMaterial = g.collider.material;
      if (g.collider.tag === 'enemy' && this.onGround) {
        // slide off characters instead of standing on them
        const ec = g.collider;
        const cx = (ec.min.x + ec.max.x) / 2, cz = (ec.min.z + ec.max.z) / 2;
        const dx = this.pos.x - cx, dz = this.pos.z - cz;
        const len = Math.max(0.05, Math.hypot(dx, dz));
        this.vel.x += (dx / len) * 3;
        this.vel.z += (dz / len) * 3;
      }
    }

    // ---- camera bob drives the footstep cadence ----
    // bobPhase advances whenever we are actually walking, independent of the reducedMotion
    // setting (that only zeroes the visible amplitude). |sin(bobPhase)| bottoms out every π, so a
    // step lands exactly when the camera does.
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    const walking = this.onGround && hSpeed > 0.5;
    if (walking) {
      const strideMul = this.crouched ? 0.8 : input.walk ? 0.85 : 1;
      this.bobPhase += dt * (4.0 + hSpeed * 1.65) * strideMul;
      const valley = Math.floor(this.bobPhase / Math.PI);
      if (valley !== this.stepIndex) {
        this.stepIndex = valley;
        const quiet = this.crouched || input.walk;
        audio.footstep(this.groundMaterial, null, quiet);
        bus.emit('noise', { pos: this.pos, radius: quiet ? 3 : 8, type: 'footstep' });
      }
      this.stepAcc = this.bobPhase % Math.PI;
    } else {
      // park the phase just short of the next valley so the first step out of a stop lands soon
      this.bobPhase = this.stepIndex * Math.PI + Math.PI * 0.72;
      this.stepAcc = 0;
    }

    // ---- movement state ----
    this.moveState = !this.onGround ? 'airborne'
      : this.crouched ? (hSpeed > 0.4 ? 'crouch-walking' : 'crouching')
      : hSpeed > 0.4 ? (input.walk ? 'walking' : 'moving') : 'idle';

    // ---- camera feel ----
    // Dropping into a crouch is quick (you fall into it); standing back up takes longer.
    const targetEye = this.crouched ? EYE_CROUCH : EYE_STAND;
    this.eyeSmooth = THREE.MathUtils.damp(this.eyeSmooth, targetEye, this.crouched ? 15 : 9.5, dt);
    const wantAmp = walking && !settings.get('reducedMotion') ? Math.min(1, hSpeed / 3.6) : 0;
    this.bobAmp = THREE.MathUtils.damp(this.bobAmp, wantAmp, 8, dt);
    this.landDip = THREE.MathUtils.damp(this.landDip, 0, 7, dt);
    this.flash = Math.max(0, this.flash - dt * 0.4);

    // ---- weapons ----
    this.arsenal.update(dt, input);
  }

  applyCamera(camera) {
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.032 * this.bobAmp;
    const bobX = Math.sin(this.bobPhase * 0.5) * 0.02 * this.bobAmp;
    camera.position.set(this.pos.x + bobX * Math.cos(this.yaw), this.eyeY + bobY - this.landDip, this.pos.z + bobX * Math.sin(this.yaw));
    // Same offsets forwardVec() uses, so where the crosshair sits is where the round goes.
    camera.rotation.set(this.viewPitch, this.viewYaw, this.arsenal.rollKick, 'YXZ');
  }

  /**
   * Incoming damage. `region` is what the ballistics layer reports for the hit ('head'|'torso'|
   * 'legs'); anything else (a debug hit, an explosion) is treated as unarmoured.
   */
  damage(amount, fromPos, region = 'torso', shooter = null) {
    if (!this.alive || this.godMode) return;
    let dmg = amount;
    const bypass = ARMOR_BYPASS[region];
    if (this.armor > 0 && bypass != null) {
      // A plate only covers part of you, and a head shot mostly goes around it.
      const covered = dmg * (1 - bypass);
      const absorbed = Math.min(this.armor / ARMOR_WEAR, covered * ARMOR_SOAK);
      this.armor = Math.max(0, this.armor - absorbed * ARMOR_WEAR);
      dmg -= absorbed;
      if (this.armor <= 0) {
        // the moment the plate gives out is worth telling the player about
        bus.emit('armor-broken', { health: this.health, dir: this.lastDamageDir, region });
        audio.ui('damage');
      }
    }
    this.health = Math.max(0, this.health - dmg);
    audio.ui('damage');
    if (fromPos) {
      const dx = fromPos.x - this.pos.x, dz = fromPos.z - this.pos.z;
      const worldAngle = Math.atan2(dx, -dz);
      this.lastDamageDir = worldAngle - this.yaw;
    }
    bus.emit('player-damaged', {
      health: this.health, armor: this.armor, dir: this.lastDamageDir,
      type: bypass != null ? 'bullet' : region, region, shooter,
    });
    if (this.health <= 0) {
      this.alive = false;
      bus.emit('player-died', {});
    }
  }

  applyFlash(strength) {
    this.flash = Math.min(1, Math.max(this.flash, strength));
    bus.emit('player-flashed', { strength: this.flash });
  }

  textState() {
    const fwd = this.forwardVec();
    return {
      position: [+this.pos.x.toFixed(2), +this.pos.y.toFixed(2), +this.pos.z.toFixed(2)],
      yawDeg: +THREE.MathUtils.radToDeg(this.yaw).toFixed(1),
      pitchDeg: +THREE.MathUtils.radToDeg(this.pitch).toFixed(1),
      forward: [+fwd.x.toFixed(2), +fwd.y.toFixed(2), +fwd.z.toFixed(2)],
      velocity: [+this.vel.x.toFixed(2), +this.vel.y.toFixed(2), +this.vel.z.toFixed(2)],
      health: Math.round(this.health),
      armor: Math.round(this.armor),
      alive: this.alive,
      moveState: this.moveState,
      onGround: this.onGround,
      weapon: this.arsenal.textState(),
    };
  }
}
