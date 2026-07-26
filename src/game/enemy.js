// Hostile AI: perception (vision cone + hearing), suspicion, patrol,
// investigation, combat with bursts/strafing/reloads, searching, alerts to
// nearby allies, flash blinding, flinches and death.

import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { emit } from '../core/events.js';
import { sfx } from '../core/audio.js';
import { createEnemyBody } from '../characters/bodies.js';

const TYPES = {
  scout:    { hp: 70,  speed: 3.3, dmg: 7,  burst: [4, 7], burstCd: [0.7, 1.1], rof: 0.085, range: 26, aimTime: 0.28, mag: 25, reload: 2.1, sfx: 'shot_smg_d', name: 'Scout' },
  trooper:  { hp: 100, speed: 3.0, dmg: 10, burst: [3, 5], burstCd: [0.9, 1.4], rof: 0.115, range: 32, aimTime: 0.36, mag: 30, reload: 2.5, sfx: 'shot_carbine_d', name: 'Trooper' },
  heavy:    { hp: 150, speed: 2.5, dmg: 24, burst: [1, 1], burstCd: [1.5, 2.1], rof: 0.9,   range: 13, aimTime: 0.42, mag: 6,  reload: 3.2, sfx: 'shot_shotgun_d', name: 'Heavy' },
  marksman: { hp: 85,  speed: 2.8, dmg: 34, burst: [1, 1], burstCd: [2.0, 2.8], rof: 1.2,   range: 55, aimTime: 0.85, mag: 5,  reload: 3.0, sfx: 'shot_precision_d', name: 'Marksman' },
};

const BARKS = {
  alert: ['Contact!', 'There — hostile!', 'Weapons up!', 'Intruder on the floor!'],
  investigate: ['Heard something…', 'Checking it out.', 'Who is there?', 'Something moved.'],
  search: ['Lost him. Spread out.', 'He is close. Look sharp.', 'Where did he go?'],
  reload: ['Reloading!', 'Swapping mags!'],
  hit: ['Taking fire!', 'I am hit!'],
};

let barkCooldown = 0;
export function tickBarkCooldown(dt) { barkCooldown = Math.max(0, barkCooldown - dt); }
function bark(kind, pos) {
  if (barkCooldown > 0) return;
  barkCooldown = 2.2;
  const line = BARKS[kind][Math.floor(rng.random() * BARKS[kind].length)];
  emit('subtitle', { speaker: 'Hostile', text: line, ttl: 2.6 });
  sfx('enemy_bark', { pos, vol: 0.5, rateJitter: 0.2 });
  emit('noise', { pos, radius: 8, type: 'voice', source: 'enemy' });
}

let enemySeq = 0;

export class Enemy {
  constructor(game, spec) {
    this.game = game;
    this.id = spec.id || `enemy_${enemySeq++}`;
    this.type = spec.type;
    this.def = TYPES[spec.type] || TYPES.trooper;
    this.level = spec.level || 'g';
    const y = this.level === 'b' ? -3.6 : 0;
    this.patrol = (spec.patrol || []).map(([x, z]) => ({ x, y, z }));
    this.patrolIdx = 0;
    this.pos = new THREE.Vector3(this.patrol[0]?.x ?? 30, y, this.patrol[0]?.z ?? 20);
    this.yaw = rng.random() * Math.PI * 2;
    this.targetYaw = this.yaw;
    this.health = this.def.hp * (game.difficulty.id === 'recruit' ? 0.9 : 1);
    this.alive = true;
    this.state = 'patrol'; // patrol | suspect | investigate | combat | search | dead
    this.suspicion = 0;
    this.lastKnown = null;
    this.path = null;
    this.pathIdx = 0;
    this.repathTimer = rng.random();
    this.waitTimer = rng.range(0.5, 2.5);
    this.aimTimer = 0;
    this.burstLeft = 0;
    this.burstCd = 0;
    this.shotTimer = 0;
    this.ammo = this.def.mag;
    this.reloadTimer = 0;
    this.flinchTimer = 0;
    this.blindTimer = 0;
    this.searchTimer = 0;
    this.searchPoints = 0;
    this.alertLevel = 0;   // 0 cold, 1 has fought before
    this.crouchFrac = 0;
    this.wantCrouch = false;
    this.strafeTimer = 0;
    this.strafeDir = 0;
    this.visTimer = rng.random() * 0.15;
    this.canSeePlayer = false;
    this.lostSightTime = 0;
    this.body = createEnemyBody(this.type);
    this.body.group.position.copy(this.pos);
    this.deadTimer = 0;
    this.moveSpeed = 0;
  }

  get eyePos() {
    return { x: this.pos.x, y: this.pos.y + this.body.headHeight(), z: this.pos.z };
  }
  facingDir() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
  hitBoxes() {
    const p = this.pos;
    const hh = this.body.headHeight();
    const crouchScale = 1 - this.crouchFrac * 0.24;
    return [
      { part: 'head', x0: p.x - 0.15, y0: p.y + hh - 0.14, z0: p.z - 0.15, x1: p.x + 0.15, y1: p.y + hh + 0.15, z1: p.z + 0.15 },
      { part: 'body', x0: p.x - 0.3, y0: p.y + 0.35 * crouchScale, z0: p.z - 0.3, x1: p.x + 0.3, y1: p.y + 1.45 * crouchScale, z1: p.z + 0.3 },
      { part: 'legs', x0: p.x - 0.24, y0: p.y, z0: p.z - 0.24, x1: p.x + 0.24, y1: p.y + 0.4, z1: p.z + 0.24 },
    ];
  }

  hearNoise(noise) {
    if (!this.alive || this.game.aiFrozen) return;
    if (noise.source === 'enemy') return;
    const d = dist3(noise.pos, this.pos);
    const radius = noise.radius * this.game.difficulty.hearingMult;
    if (d > radius) return;
    const strength = 1 - d / (radius + 1);
    if (noise.type === 'gunshot' || noise.type === 'glass') {
      this.investigate(noise.pos, true);
      this.suspicion = Math.max(this.suspicion, 0.9);
    } else if (this.state === 'patrol' || this.state === 'suspect') {
      this.suspicion = Math.min(1.2, this.suspicion + strength * 0.55);
      if (this.suspicion > 0.5) this.investigate(noise.pos, false);
      else { this.state = 'suspect'; this.faceToward(noise.pos); this.waitTimer = 2.2; }
    }
  }

  alertTo(pos) {
    if (!this.alive) return;
    this.lastKnown = { x: pos.x, y: pos.y, z: pos.z };
    if (this.state !== 'combat') { this.state = 'combat'; this.aimTimer = this.def.aimTime * 1.4; }
    this.alertLevel = 1;
  }

  investigate(pos, urgent) {
    if (this.state === 'combat') return;
    this.state = 'investigate';
    this.lastKnown = { x: pos.x, y: pos.y, z: pos.z };
    this.path = null;
    this.repathTimer = 0;
    this.waitTimer = 0;
    if (!urgent) bark('investigate', this.pos);
  }

  takeDamage(amount, part, fromPos, weaponId) {
    if (!this.alive) return;
    this.health -= amount;
    this.flinchTimer = 0.22;
    this.suspicion = 1.2;
    this.alertLevel = 1;
    if (fromPos) this.lastKnown = { x: fromPos.x, y: fromPos.y, z: fromPos.z };
    if (this.state !== 'combat') { this.state = 'combat'; this.aimTimer = this.def.aimTime * 0.9; bark('hit', this.pos); }
    this.game.alertAlliesNear(this.pos, 13, this.lastKnown);
    sfx('enemy_hurt', { pos: this.pos, vol: 0.55, rateJitter: 0.2 });
    if (this.health <= 0) this.die(part === 'head', weaponId);
    else emit('hit-marker', { kind: part === 'head' ? 'headshot' : 'hit' });
  }

  die(headshot) {
    this.alive = false;
    this.state = 'dead';
    this.health = 0;
    this.body.playDeath();
    sfx('enemy_death', { pos: this.pos, vol: 0.7, rateJitter: 0.15 });
    emit('hit-marker', { kind: 'kill' });
    emit('kill', { entity: this, headshot });
    emit('noise', { pos: this.pos, radius: 7, type: 'voice', source: 'enemy-death' });
    if (rng.chance(0.4)) this.game.spawnAmmoDrop(this.pos);
  }

  faceToward(p) {
    this.targetYaw = Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z));
  }

  // ---------------- main update ----------------
  update(dt) {
    this.body.update(dt);
    if (!this.alive) { this.deadTimer += dt; return; }
    if (this.game.aiFrozen) { this.body.setMoveAnim(0, dt); return; }

    this.blindTimer = Math.max(0, this.blindTimer - dt);
    this.flinchTimer = Math.max(0, this.flinchTimer - dt);
    this.reloadTimer = Math.max(0, this.reloadTimer - dt);

    // perception every 0.15s
    this.visTimer -= dt;
    if (this.visTimer <= 0) {
      this.visTimer = 0.15;
      this.canSeePlayer = this.checkVision();
    }
    if (this.canSeePlayer) {
      const p = this.game.player.pos;
      this.lastKnown = { x: p.x, y: p.y, z: p.z };
      this.lostSightTime = 0;
      if (this.state !== 'combat') {
        const rate = (1 / Math.max(0.12, this.game.difficulty.reactionTime)) * (this.alertLevel ? 2.2 : 1);
        const prox = THREE.MathUtils.clamp(1.6 - dist3(p, this.pos) / 26, 0.35, 1.6);
        const moveFactor = this.game.player.moveState === 'run' ? 1.5 : this.game.player.moveState.startsWith('crouch') ? 0.55 : 1;
        this.suspicion += rate * prox * moveFactor * dt;
        if (this.suspicion >= 1) {
          this.state = 'combat';
          this.aimTimer = this.def.aimTime * (this.alertLevel ? 0.7 : 1.15);
          bark('alert', this.pos);
          this.game.alertAlliesNear(this.pos, 14, this.lastKnown);
        } else if (this.suspicion > 0.42 && this.state === 'patrol') {
          this.state = 'suspect';
          this.faceToward(p);
          this.waitTimer = 1.6;
        }
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.28);
      this.lostSightTime += dt;
    }

    switch (this.state) {
      case 'patrol': this.updatePatrol(dt); break;
      case 'suspect': this.updateSuspect(dt); break;
      case 'investigate': this.updateInvestigate(dt); break;
      case 'combat': this.updateCombat(dt); break;
      case 'search': this.updateSearch(dt); break;
    }

    // crouch easing
    const crouchTarget = this.wantCrouch ? 1 : 0;
    this.crouchFrac += Math.sign(crouchTarget - this.crouchFrac) * Math.min(Math.abs(crouchTarget - this.crouchFrac), dt * 4);
    this.body.setCrouch(this.crouchFrac);

    // smooth turn
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += THREE.MathUtils.clamp(dy, -dt * 7, dt * 7);

    // ground snap
    const g = this.game.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.4, 0.5);
    if (g.y > -100) this.pos.y = THREE.MathUtils.damp(this.pos.y, g.y, 14, dt);

    this.body.group.position.set(this.pos.x, this.pos.y + (this.body.group.userData.baseY || 0), this.pos.z);
    this.body.group.rotation.y = this.yaw;
    this.body.setMoveAnim(this.moveSpeed, dt);
    this.moveSpeed = 0;
  }

  checkVision() {
    if (this.blindTimer > 0) return false;
    const player = this.game.player;
    if (!player.alive) return false;
    const eye = this.eyePos;
    const pe = player.eyePos;
    const range = this.def.range * this.game.difficulty.visionMult * (player.crouchFrac > 0.5 && player.moveState.includes('idle') ? 0.62 : 1);
    const d = dist3(pe, eye);
    if (d > range) return false;
    // FOV check (wider when alerted)
    const toP = Math.atan2(-(pe.x - eye.x), -(pe.z - eye.z));
    let dy = toP - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    const half = (this.alertLevel ? 1.35 : 1.05);
    if (Math.abs(dy) > half && d > 2.2) return false;
    if (this.game.smokeBlocks(eye, pe)) return false;
    // LOS to eye or chest
    if (this.game.world.lineOfSight(eye.x, eye.y, eye.z, pe.x, pe.y, pe.z)) return true;
    return this.game.world.lineOfSight(eye.x, eye.y, eye.z, pe.x, pe.y - 0.55, pe.z);
  }

  updatePatrol(dt) {
    this.wantCrouch = false;
    if (this.patrol.length < 2) {
      // stationary guard: slow scan
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) { this.waitTimer = rng.range(2, 4.5); this.targetYaw = this.yaw + rng.range(-1.4, 1.4); }
      return;
    }
    const target = this.patrol[this.patrolIdx];
    if (dist2(this.pos, target) < 0.5) {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
        this.path = null;
        this.waitTimer = rng.range(0.4, 2.2);
      }
      return;
    }
    this.followPathTo(target, this.def.speed * 0.5, dt);
  }

  updateSuspect(dt) {
    this.waitTimer -= dt;
    if (this.waitTimer <= 0) {
      if (this.suspicion > 0.4 && this.lastKnown) this.state = 'investigate';
      else this.state = 'patrol';
    }
  }

  updateInvestigate(dt) {
    if (!this.lastKnown) { this.state = 'patrol'; return; }
    if (dist2(this.pos, this.lastKnown) < 1.2) {
      this.state = 'search';
      this.searchTimer = 0;
      this.searchPoints = 3;
      return;
    }
    this.followPathTo(this.lastKnown, this.def.speed * 0.72, dt);
  }

  updateSearch(dt) {
    this.searchTimer -= dt;
    if (this.searchTimer <= 0) {
      if (this.searchPoints <= 0) {
        bark('search', this.pos);
        this.state = 'patrol';
        this.path = null;
        return;
      }
      this.searchPoints--;
      const level = this.game.nav.levelOf(this.pos.y);
      const pt = this.game.nav.randomNearby(level, this.lastKnown?.x ?? this.pos.x, this.lastKnown?.z ?? this.pos.z, 5.5, () => rng.random());
      if (pt) { this.searchTarget = pt; this.path = null; }
      this.searchTimer = rng.range(2.4, 4);
    }
    if (this.searchTarget && dist2(this.pos, this.searchTarget) > 0.7) {
      this.followPathTo(this.searchTarget, this.def.speed * 0.6, dt);
    } else {
      this.targetYaw = this.yaw + dt * 1.2; // scan
    }
  }

  updateCombat(dt) {
    const player = this.game.player;
    if (!player.alive) { this.state = 'patrol'; return; }
    const d = this.canSeePlayer ? dist3(player.pos, this.pos) : Infinity;

    if (this.canSeePlayer) {
      this.faceToward(player.pos);
      this.aimTimer = Math.max(0, this.aimTimer - dt);
      // behavior picking
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = rng.range(0.9, 1.9);
        const roll = rng.random();
        this.wantCrouch = roll < 0.3;
        this.strafeDir = roll > 0.62 ? (rng.chance(0.5) ? 1 : -1) : 0;
      }
      // positioning by archetype
      const idealMin = this.type === 'heavy' ? 3 : this.type === 'marksman' ? 12 : 6;
      const idealMax = this.type === 'heavy' ? 9 : this.type === 'marksman' ? 40 : 24;
      if (d > idealMax) this.moveDirect(player.pos, this.def.speed, dt);
      else if (d < idealMin) this.moveAway(player.pos, this.def.speed * 0.8, dt);
      else if (this.strafeDir && !this.wantCrouch) this.strafe(player.pos, this.strafeDir, this.def.speed * 0.55, dt);

      this.updateFiring(dt, d);
    } else {
      this.wantCrouch = false;
      if (this.lostSightTime > 1.4 && this.lastKnown) {
        if (dist2(this.pos, this.lastKnown) < 1.3) {
          this.state = 'search';
          this.searchTimer = 0;
          this.searchPoints = 4;
          bark('search', this.pos);
        } else {
          this.followPathTo(this.lastKnown, this.def.speed, dt);
        }
      }
    }
  }

  updateFiring(dt, d) {
    if (this.aimTimer > 0 || this.flinchTimer > 0 || this.blindTimer > 0) return;
    if (this.reloadTimer > 0) return;
    if (this.ammo <= 0) {
      this.reloadTimer = this.def.reload;
      this.ammo = this.def.mag;
      bark('reload', this.pos);
      sfx('reload_mag', { pos: this.pos, vol: 0.4 });
      return;
    }
    this.burstCd -= dt;
    if (this.burstLeft <= 0 && this.burstCd <= 0) {
      this.burstLeft = Math.round(rng.range(this.def.burst[0], this.def.burst[1]));
      this.burstCd = rng.range(this.def.burstCd[0], this.def.burstCd[1]);
      this.shotTimer = 0;
    }
    if (this.burstLeft > 0) {
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        this.shotTimer = this.def.rof;
        this.burstLeft--;
        this.ammo--;
        this.fireShot(d);
      }
    }
  }

  fireShot(d) {
    const game = this.game;
    const player = game.player;
    const diff = game.difficulty;
    // hit model
    let acc = diff.enemyAccuracy;
    acc *= THREE.MathUtils.clamp(1.25 - d / this.def.range, 0.18, 1);
    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    acc *= hSpeed > 3 ? 0.55 : hSpeed > 1 ? 0.75 : 1;
    if (player.crouchFrac > 0.5) acc *= 0.82;
    const eye = this.eyePos;
    sfx(this.def.sfx, { pos: eye, vol: 0.85, rateJitter: 0.06 });
    emit('noise', { pos: this.pos, radius: 30, type: 'gunshot', source: 'enemy' });
    const pe = player.eyePos;
    if (rng.random() < acc) {
      const dmg = this.def.dmg * diff.enemyDamageMult * rng.range(0.85, 1.15);
      const dirAng = Math.atan2(this.pos.x - player.pos.x, this.pos.z - player.pos.z) - player.yaw + Math.PI;
      player.takeDamage(dmg, dirAng);
      emit('enemy-shot', { from: eye, to: pe, hit: true });
    } else {
      // near miss: impact a point near the player
      const off = () => rng.range(-1.1, 1.1);
      const target = { x: pe.x + off(), y: pe.y + rng.range(-0.7, 0.5), z: pe.z + off() };
      const dir = norm3(sub3(target, eye));
      const r = game.world.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, 60, { blocking: 'move' });
      if (r && r.collider) emit('impact', { kind: r.collider.surface || 'concrete', point: r.point, normal: r.normal });
      sfx('bullet_whiz', { vol: 0.35, rateJitter: 0.25 });
      emit('enemy-shot', { from: eye, to: target, hit: false });
    }
  }

  // ---------------- movement helpers ----------------
  followPathTo(target, speed, dt) {
    this.repathTimer -= dt;
    const needRepath = !this.path || this.pathIdx >= this.path.length ||
      (this.repathTimer <= 0 && dist2(this.path[this.path.length - 1], target) > 1.5);
    if (needRepath) {
      this.repathTimer = 1.2 + rng.random() * 0.6;
      this.path = this.game.nav.findPath(this.pos, { x: target.x, y: target.y ?? this.pos.y, z: target.z });
      this.pathIdx = 0;
      if (!this.path) { this.stuckFallback(dt); return; }
    }
    const wp = this.path[this.pathIdx];
    if (!wp) return;
    if (dist2(this.pos, wp) < 0.35) { this.pathIdx++; return; }
    this.stepToward(wp, speed, dt);
    // open doors in the way
    this.game.tryAiOpenDoors(this);
  }

  moveDirect(target, speed, dt) { this.followPathTo(target, speed, dt); }

  moveAway(from, speed, dt) {
    const dir = norm3(sub3(this.pos, from));
    const dest = { x: this.pos.x + dir.x * 3, y: this.pos.y, z: this.pos.z + dir.z * 3 };
    const level = this.game.nav.levelOf(this.pos.y);
    if (this.game.nav.isWalkable(level, dest.x, dest.z)) this.stepToward(dest, speed, dt, false);
  }

  strafe(target, dir, speed, dt) {
    const to = norm3(sub3(target, this.pos));
    const side = { x: -to.z * dir, y: 0, z: to.x * dir };
    const dest = { x: this.pos.x + side.x * 2, y: this.pos.y, z: this.pos.z + side.z * 2 };
    const level = this.game.nav.levelOf(this.pos.y);
    if (this.game.nav.isWalkable(level, dest.x, dest.z)) this.stepToward(dest, speed, dt, false);
    else this.strafeDir = -dir;
  }

  stepToward(wp, speed, dt, face = true) {
    const dir = norm3(sub3(wp, this.pos));
    const step = speed * dt;
    const nx = this.pos.x + dir.x * step;
    const nz = this.pos.z + dir.z * step;
    // slide along blockers using nav walkability as cheap collision
    const level = this.game.nav.levelOf(this.pos.y + dir.y);
    if (this.game.nav.isWalkable(level, nx, nz) || Math.abs(dir.y) > 0.2) {
      this.pos.x = nx; this.pos.z = nz;
    } else if (this.game.nav.isWalkable(level, nx, this.pos.z)) {
      this.pos.x = nx;
    } else if (this.game.nav.isWalkable(level, this.pos.x, nz)) {
      this.pos.z = nz;
    }
    if (Math.abs(dir.y) > 0.05) this.pos.y += dir.y * step; // stairs: follow waypoint Y
    if (face) this.targetYaw = Math.atan2(-dir.x, -dir.z);
    this.moveSpeed = speed;
    // footsteps
    this._stepAcc = (this._stepAcc || 0) + step;
    if (this._stepAcc > 1.7) {
      this._stepAcc = 0;
      const g = this.game.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.4);
      sfx(`step_${g.surface}`, { pos: this.pos, vol: speed > 2.6 ? 0.5 : 0.3, rateJitter: 0.15 });
    }
  }

  stuckFallback(dt) {
    // nudge randomly so a failed path never leaves the AI frozen
    const level = this.game.nav.levelOf(this.pos.y);
    const pt = this.game.nav.randomNearby(level, this.pos.x, this.pos.z, 3, () => rng.random());
    if (pt) { this.path = [pt]; this.pathIdx = 0; }
  }
}

function dist3(a, b) { const dx = a.x - b.x, dy = (a.y ?? 0) - (b.y ?? 0), dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
function sub3(a, b) { return { x: a.x - b.x, y: (a.y ?? 0) - (b.y ?? 0), z: a.z - b.z }; }
function norm3(v) { const l = Math.hypot(v.x, v.y ?? 0, v.z) || 1; return { x: v.x / l, y: (v.y ?? 0) / l, z: v.z / l }; }
