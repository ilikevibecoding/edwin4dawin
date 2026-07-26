// First-person player: movement (run/walk/crouch/jump), collision, camera,
// health/armor, interaction. Weapon handling lives in weapons.js.
import { bus } from '../core/events.js';
import { settings } from '../core/settings.js';

const STAND_H = 1.78, CROUCH_H = 1.20;
const EYE_STAND = 1.62, EYE_CROUCH = 1.04;
const RADIUS = 0.32;
const RUN_SPEED = 4.7, WALK_SPEED = 2.35, CROUCH_SPEED = 1.85, AIM_MULT = 0.82;
const ACCEL_GROUND = 14, ACCEL_AIR = 2.5, GRAVITY = 20, JUMP_V = 6.1;

export class Player {
  constructor(game) {
    this.game = game;
    this.reset({ x: 0, y: 0, z: 0 }, 0);
  }

  reset(pos, yaw) {
    this.pos = { ...pos };            // feet position
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = yaw;
    this.pitch = 0;
    this.height = STAND_H;
    this.eyeH = EYE_STAND;
    this.crouched = false;
    this.onGround = true;
    this.health = 100;
    this.armor = 50;
    this.alive = true;
    this.moveState = 'idle';          // idle|walk|run|crouch|air
    this.stepAcc = 0;
    this.fallV = 0;
    this.landDip = 0;
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.viewKick = { x: 0, y: 0 };   // recoil-driven camera kick (recovers)
    this.flashAmount = 0;             // 0..1 flashbang blindness
    this.lastDamageDir = null;
    this.interactTarget = null;
    this.noclip = false;
    this.god = false;
  }

  eyePos() {
    return { x: this.pos.x, y: this.pos.y + this.eyeH - this.landDip * 0.12, z: this.pos.z };
  }

  forward() { return { x: -Math.sin(this.yaw), y: 0, z: -Math.cos(this.yaw) }; }
  right() { return { x: Math.cos(this.yaw), y: 0, z: -Math.sin(this.yaw) }; }

  // Direction the camera looks (with pitch).
  lookDir() {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    return { x: -Math.sin(this.yaw) * cp, y: sp, z: -Math.cos(this.yaw) * cp };
  }

  update(dt, input, world) {
    if (!this.alive) { this._updateCameraFeel(dt); return; }

    // ---- look ----
    const look = input.consumeLook();
    const s = settings.lookScale() * (this.game.weapons?.adsFactor() ? (1 - 0.55 * this.game.weapons.adsFactor()) : 1);
    this.yaw -= look.x * s;
    const inv = settings.get('invertY') ? -1 : 1;
    this.pitch -= look.y * s * inv;
    const lim = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    if (look.wheel !== 0) this.game.weapons?.cycle(look.wheel);

    // ---- crouch ----
    const wantCrouch = input.isDown('crouch');
    if (wantCrouch && !this.crouched) {
      this.crouched = true;
      this.height = CROUCH_H;
    } else if (!wantCrouch && this.crouched) {
      // need headroom to stand
      const c = { x: this.pos.x, y: this.pos.y + STAND_H / 2 + 0.01, z: this.pos.z };
      const blocked = world.collision.query(
        { x: c.x - RADIUS, y: this.pos.y + CROUCH_H, z: c.z - RADIUS },
        { x: c.x + RADIUS, y: this.pos.y + STAND_H, z: c.z + RADIUS },
        (b) => b.solid
      ).length > 0;
      if (!blocked) { this.crouched = false; this.height = STAND_H; }
    }
    const targetEye = this.crouched ? EYE_CROUCH : EYE_STAND;
    this.eyeH += (targetEye - this.eyeH) * Math.min(1, dt * 12);

    // ---- move intent ----
    const f = this.forward(), r = this.right();
    let mx = 0, mz = 0;
    if (input.isDown('forward')) { mx += f.x; mz += f.z; }
    if (input.isDown('back')) { mx -= f.x; mz -= f.z; }
    if (input.isDown('right')) { mx += r.x; mz += r.z; }
    if (input.isDown('left')) { mx -= r.x; mz -= r.z; }
    const len = Math.hypot(mx, mz);
    if (len > 0) { mx /= len; mz /= len; }

    const aiming = this.game.weapons?.adsFactor() > 0.4;
    let speed = RUN_SPEED;
    let gait = 'run';
    if (this.crouched) { speed = CROUCH_SPEED; gait = 'crouch'; }
    else if (input.isDown('walk')) { speed = WALK_SPEED; gait = 'walk'; }
    if (aiming) speed *= AIM_MULT;

    if (this.noclip) {
      const d = this.lookDir();
      let vx = 0, vy = 0, vz = 0;
      if (input.isDown('forward')) { vx += d.x; vy += d.y; vz += d.z; }
      if (input.isDown('back')) { vx -= d.x; vy -= d.y; vz -= d.z; }
      if (input.isDown('right')) { vx += r.x; vz += r.z; }
      if (input.isDown('left')) { vx -= r.x; vz -= r.z; }
      if (input.isDown('jump')) vy += 1;
      if (input.isDown('crouch')) vy -= 1;
      const fl = Math.hypot(vx, vy, vz) || 1;
      const spd = speed * 2.5;
      this.pos.x += (vx / fl) * spd * dt;
      this.pos.y += (vy / fl) * spd * dt;
      this.pos.z += (vz / fl) * spd * dt;
      this.vel = { x: 0, y: 0, z: 0 };
      this.moveState = 'noclip';
      this._updateCameraFeel(dt);
      return;
    }

    // ---- acceleration ----
    const accel = this.onGround ? ACCEL_GROUND : ACCEL_AIR;
    const tx = mx * speed, tz = mz * speed;
    const blend = Math.min(1, accel * dt);
    this.vel.x += (tx - this.vel.x) * blend;
    this.vel.z += (tz - this.vel.z) * blend;

    // ---- gravity & jump ----
    this.vel.y -= GRAVITY * dt;
    if (this.onGround && input.wasPressed('jump') && !this.crouched) {
      this.vel.y = JUMP_V;
      this.onGround = false;
      bus.emit('player-jump');
    }

    // ---- integrate with collision ----
    const half = { x: RADIUS, y: this.height / 2, z: RADIUS };
    const center = { x: this.pos.x, y: this.pos.y + this.height / 2, z: this.pos.z };
    const delta = { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt };
    const wasAir = !this.onGround;
    const res = world.collision.moveAABB(center, half, delta, { stepHeight: 0.38 });
    this.pos.x = res.pos.x; this.pos.z = res.pos.z; this.pos.y = res.pos.y - this.height / 2;
    if (res.onGround) {
      if (wasAir && this.vel.y < -5.5) {
        this.landDip = Math.min(1, (-this.vel.y - 5.5) / 6);
        bus.emit('player-land', -this.vel.y);
      }
      this.vel.y = 0;
      this.onGround = true;
    } else if (res.hitHead) {
      this.vel.y = Math.min(this.vel.y, 0);
      this.onGround = false;
    } else {
      // ground probe keeps us glued when walking down steps
      const probe = world.collision.moveAABB(
        { x: this.pos.x, y: this.pos.y + this.height / 2, z: this.pos.z },
        half, { x: 0, y: -0.08, z: 0 }, {});
      if (probe.onGround && this.vel.y <= 0) {
        this.pos.y = probe.pos.y - this.height / 2;
        this.onGround = true;
        this.vel.y = 0;
      } else {
        this.onGround = false;
      }
    }

    // ---- state + footsteps ----
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (!this.onGround) this.moveState = 'air';
    else if (hSpeed < 0.25) this.moveState = this.crouched ? 'crouch-idle' : 'idle';
    else this.moveState = this.crouched ? 'crouch' : gait;

    if (this.onGround && hSpeed > 0.4) {
      this.stepAcc += hSpeed * dt;
      const stride = gait === 'run' ? 2.15 : 1.5;
      if (this.stepAcc >= stride) {
        this.stepAcc = 0;
        const mat = this._floorMaterial(world);
        bus.emit('footstep', { who: 'player', material: mat, gait, pos: { ...this.pos } });
      }
      this.bobAmp += (Math.min(1, hSpeed / RUN_SPEED) - this.bobAmp) * Math.min(1, dt * 6);
      this.bobPhase += dt * (gait === 'run' ? 9.4 : 6.4);
    } else {
      this.bobAmp += (0 - this.bobAmp) * Math.min(1, dt * 8);
      this.stepAcc = Math.min(this.stepAcc, 0.6);
    }

    this._updateCameraFeel(dt);
    this._updateInteract(world, input);
  }

  _updateCameraFeel(dt) {
    this.landDip = Math.max(0, this.landDip - dt * 3.2);
    // recoil recovery
    this.viewKick.x *= Math.max(0, 1 - dt * 7);
    this.viewKick.y *= Math.max(0, 1 - dt * 7);
    this.flashAmount = Math.max(0, this.flashAmount - dt * (this.flashAmount > 0.75 ? 0.14 : 0.42));
  }

  _floorMaterial(world) {
    const hit = world.collision.raycast(
      { x: this.pos.x, y: this.pos.y + 0.3, z: this.pos.z },
      { x: 0, y: -1, z: 0 }, 1.0, { mode: 'solid' });
    return hit ? hit.box.material : 'concrete';
  }

  _updateInteract(world, input) {
    const eye = this.eyePos();
    const dir = this.lookDir();
    this.interactTarget = this.game.queryInteract(eye, dir, 2.6);
    if (this.interactTarget && input.wasPressed('interact')) {
      this.game.doInteract(this.interactTarget);
    }
  }

  applyRecoil(pitchKick, yawKick) {
    this.viewKick.x += pitchKick;
    this.viewKick.y += yawKick;
    this.pitch = Math.min(Math.PI / 2 - 0.02, this.pitch + pitchKick * 0.8);
    this.yaw += yawKick * 0.8;
  }

  damage(amount, dirFrom, kind = 'bullet') {
    if (!this.alive || this.god) return;
    let dmg = amount;
    if (this.armor > 0 && kind === 'bullet') {
      const absorbed = Math.min(this.armor, dmg * 0.6);
      this.armor = Math.max(0, Math.round(this.armor - absorbed * 0.8));
      dmg -= absorbed;
    }
    this.health = Math.max(0, Math.round(this.health - dmg));
    this.lastDamageDir = dirFrom ? { ...dirFrom, t: 1 } : null;
    bus.emit('player-damaged', { amount: dmg, dirFrom, health: this.health });
    if (this.health <= 0) {
      this.alive = false;
      bus.emit('player-died');
    }
  }

  heal(hp) { this.health = Math.min(100, this.health + hp); }

  // camera transform values consumed by the renderer
  cameraPose() {
    const reduced = settings.get('reducedMotion');
    const bobY = reduced ? 0 : Math.abs(Math.sin(this.bobPhase)) * 0.028 * this.bobAmp;
    const bobX = reduced ? 0 : Math.sin(this.bobPhase * 0.5) * 0.012 * this.bobAmp;
    const eye = this.eyePos();
    return {
      x: eye.x + Math.cos(this.yaw) * bobX,
      y: eye.y + bobY - this.landDip * 0.14,
      z: eye.z - Math.sin(this.yaw) * bobX,
      yaw: this.yaw + this.viewKick.y,
      pitch: this.pitch + this.viewKick.x,
      roll: reduced ? 0 : Math.sin(this.bobPhase * 0.5) * 0.004 * this.bobAmp,
    };
  }
}

export const PLAYER_RADIUS = RADIUS;
