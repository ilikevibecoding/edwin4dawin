// First-person player controller (Opus 2 domain): deliberate tactical movement.
// Feet-based position; capsule approximated as AABB for the collision world.
import * as THREE from 'three';
import { moveCharacter } from '../core/collide.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { settings } from '../core/settings.js';
import { Arsenal } from '../weapons/weapon.js';

const RADIUS = 0.34;
const STAND_H = 1.8;
const CROUCH_H = 1.26;
const EYE_STAND = 1.66;
const EYE_CROUCH = 1.12;
const GRAVITY = 20;

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
    this.alive = true;
    this.groundMaterial = 'concrete';
    this.stepAcc = 0;
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.landDip = 0;
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
    this.alive = true;
    this.crouched = false;
    this.height = STAND_H;
    this.flash = 0;
    this.landDip = 0;
    // NS-6: QA overrides must not survive a mission reset
    this.godMode = false;
    this.noclip = false;
    this.arsenal.equipLoadout(loadout);
  }

  get eyeY() { return this.pos.y + this.eyeSmooth; }
  get speedBase() { return 3.7; }

  forwardVec(out = new THREE.Vector3()) {
    out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
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
    const speedMul = this.crouched ? 0.42 : input.walk ? 0.46 : 1;
    const aimMul = this.arsenal.isAiming ? 0.75 : 1;
    const target = new THREE.Vector3(input.moveX, 0, -input.moveZ);
    if (target.lengthSq() > 1) target.normalize();
    target.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    target.multiplyScalar(this.speedBase * speedMul * aimMul);

    const accel = this.onGround ? 34 : 6;
    this.vel.x = THREE.MathUtils.damp(this.vel.x, target.x, accel * 0.35, dt);
    this.vel.z = THREE.MathUtils.damp(this.vel.z, target.z, accel * 0.35, dt);

    // ---- jump & gravity ----
    if (input.jump && this.onGround && !this.crouched) {
      this.vel.y = 4.4;
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
        if (wasAirborne && fallSpeed > 5.5) {
          this.landDip = Math.min(0.16, fallSpeed * 0.015);
          audio.footstep(this.groundMaterial, null, false, 0.9);
          bus.emit('noise', { pos: this.pos, radius: 8, type: 'land' });
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

    // ---- footsteps + noise ----
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hSpeed > 0.5) {
      this.stepAcc += hSpeed * dt;
      const stride = this.crouched ? 1.5 : input.walk ? 1.35 : 1.05;
      if (this.stepAcc >= stride) {
        this.stepAcc = 0;
        audio.footstep(this.groundMaterial, null, this.crouched || input.walk);
        const loud = this.crouched || input.walk ? 3 : 8;
        bus.emit('noise', { pos: this.pos, radius: loud, type: 'footstep' });
      }
    } else {
      this.stepAcc = 0;
    }

    // ---- movement state ----
    this.moveState = !this.onGround ? 'airborne'
      : this.crouched ? (hSpeed > 0.4 ? 'crouch-walking' : 'crouching')
      : hSpeed > 0.4 ? (input.walk ? 'walking' : 'moving') : 'idle';

    // ---- camera feel ----
    const targetEye = this.crouched ? EYE_CROUCH : EYE_STAND;
    this.eyeSmooth = THREE.MathUtils.damp(this.eyeSmooth, targetEye, 12, dt);
    if (!settings.get('reducedMotion') && this.onGround && hSpeed > 0.4) {
      this.bobPhase += dt * (5.4 + hSpeed * 1.3);
      this.bobAmp = THREE.MathUtils.damp(this.bobAmp, Math.min(1, hSpeed / 3.6), 8, dt);
    } else {
      this.bobAmp = THREE.MathUtils.damp(this.bobAmp, 0, 8, dt);
    }
    this.landDip = THREE.MathUtils.damp(this.landDip, 0, 7, dt);
    this.flash = Math.max(0, this.flash - dt * 0.4);

    // ---- weapons ----
    this.arsenal.update(dt, input);
  }

  applyCamera(camera) {
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.032 * this.bobAmp;
    const bobX = Math.sin(this.bobPhase * 0.5) * 0.02 * this.bobAmp;
    camera.position.set(this.pos.x + bobX * Math.cos(this.yaw), this.eyeY + bobY - this.landDip, this.pos.z + bobX * Math.sin(this.yaw));
    camera.rotation.set(this.pitch + this.arsenal.recoilPitch, this.yaw + this.arsenal.recoilYaw, this.arsenal.rollKick, 'YXZ');
  }

  damage(amount, fromPos, type = 'bullet') {
    if (!this.alive || this.godMode) return;
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.62);
      this.armor = Math.max(0, this.armor - absorbed);
      dmg -= absorbed;
    }
    this.health = Math.max(0, this.health - dmg);
    audio.ui('damage');
    if (fromPos) {
      const dx = fromPos.x - this.pos.x, dz = fromPos.z - this.pos.z;
      const worldAngle = Math.atan2(dx, -dz);
      this.lastDamageDir = worldAngle - this.yaw;
    }
    bus.emit('player-damaged', { health: this.health, armor: this.armor, dir: this.lastDamageDir, type });
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
      weapon: this.arsenal.textState(),
    };
  }
}
