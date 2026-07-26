// Hostage behavior: bound at their spot until freed, then follow/hold on
// command, crouch under fire, take stairs via nav links, recover if stuck,
// and check in at the extraction van.

import * as THREE from 'three';
import { emit } from '../core/events.js';
import { sfx } from '../core/audio.js';
import { createHostageBody } from '../characters/bodies.js';

export class Hostage {
  constructor(game, spec, index) {
    this.game = game;
    this.id = spec.id;
    this.name = spec.name;
    this.role = spec.role;
    this.pos = new THREE.Vector3(spec.x, 0, spec.z);
    this.yaw = THREE.MathUtils.degToRad(spec.faceDeg || 0);
    this.state = 'bound'; // bound | following | holding | extracting | extracted
    this.found = false;
    this.body = createHostageBody(index);
    this.body.group.position.copy(this.pos);
    this.body.setCrouch(1); // kneeling while bound
    this.path = null;
    this.pathIdx = 0;
    this.repathTimer = 0;
    this.stuckTimer = 0;
    this.lastProgressPos = this.pos.clone();
    this.fearTimer = 0;
    this.speed = 0;
    this.crouchFrac = 1;
  }

  stateLabel() {
    switch (this.state) {
      case 'bound': return this.found ? 'LOCATED' : 'MISSING';
      case 'following': return 'FOLLOWING';
      case 'holding': return 'HOLDING';
      case 'extracting': return 'AT VAN';
      case 'extracted': return 'SECURED';
      default: return this.state.toUpperCase();
    }
  }

  interactPrompt() {
    if (this.state === 'bound') return `Free ${this.name}`;
    if (this.state === 'following') return `${this.name}: hold position`;
    if (this.state === 'holding') return `${this.name}: follow me`;
    return null;
  }

  interact() {
    if (this.state === 'bound') {
      this.state = 'following';
      this.found = true;
      this.body.setCrouch(0);
      sfx('hostage_freed', { pos: this.pos, vol: 0.8 });
      emit('subtitle', { speaker: this.name.split(' ')[0], text: 'Thank you — right behind you.', ttl: 3 });
      emit('objective', { id: `free_${this.id}`, state: 'done' });
      emit('noise', { pos: this.pos, radius: 4, type: 'voice', source: 'hostage' });
    } else if (this.state === 'following') {
      this.state = 'holding';
      emit('subtitle', { speaker: this.name.split(' ')[0], text: 'Holding here.', ttl: 2.2 });
    } else if (this.state === 'holding') {
      this.state = 'following';
      emit('subtitle', { speaker: this.name.split(' ')[0], text: 'With you.', ttl: 2.2 });
    }
  }

  hitByPlayer() {
    // any player damage on a civilian fails the mission immediately
    this.game.failMission('civilian');
  }

  hitBoxes() {
    const p = this.pos;
    return [{ part: 'body', x0: p.x - 0.28, y0: p.y, z0: p.z - 0.28, x1: p.x + 0.28, y1: p.y + 1.6 - this.crouchFrac * 0.4, z1: p.z + 0.28 }];
  }

  update(dt) {
    this.body.update(dt);
    const game = this.game;
    this.fearTimer = Math.max(0, this.fearTimer - dt);

    if (this.state === 'bound' || this.state === 'extracted') {
      this.body.setMoveAnim(0, dt);
      return;
    }

    if (this.state === 'holding') {
      // crouch when shooting nearby
      const crouch = this.fearTimer > 0 ? 1 : 0.25;
      this.crouchFrac = THREE.MathUtils.damp(this.crouchFrac, crouch, 6, dt);
      this.body.setCrouch(this.crouchFrac);
      this.body.setMoveAnim(0, dt);
      return;
    }

    // --- following / extracting ---
    const target = this.state === 'extracting'
      ? { x: game.extraction.vanAt.x - 1.6, y: game.extraction.y, z: game.extraction.vanAt.z }
      : this.followPoint();

    const d = dist2(this.pos, target);
    const playerCrouch = game.player.crouchFrac > 0.5;
    const wantCrouch = this.fearTimer > 0.1 || (playerCrouch && this.state === 'following');
    this.crouchFrac = THREE.MathUtils.damp(this.crouchFrac, wantCrouch ? 1 : 0, 6, dt);
    this.body.setCrouch(this.crouchFrac);

    if (this.state === 'extracting' && d < 0.8) {
      this.state = 'extracted';
      this.body.setCrouch(1);
      emit('subtitle', { speaker: this.name.split(' ')[0], text: 'I am in the van. Go!', ttl: 3 });
      emit('objective', { id: `extract_${this.id}`, state: 'done' });
      sfx('hostage_secured', { vol: 0.8 });
      return;
    }
    if (this.state === 'following' && d < 1.6) {
      this.body.setMoveAnim(0, dt);
      // face the player
      const p = game.player.pos;
      this.yaw = Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z));
      this.body.group.rotation.y = this.yaw;
      this.stuckTimer = 0;
      return;
    }

    // path following
    this.repathTimer -= dt;
    const goalMoved = this.path && this.path.length && dist2(this.path[this.path.length - 1], target) > 2.2;
    if (!this.path || this.pathIdx >= this.path.length || (this.repathTimer <= 0 && goalMoved)) {
      this.repathTimer = 0.7;
      this.path = game.nav.findPath(this.pos, target);
      this.pathIdx = 0;
    }
    if (this.path && this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      if (dist2(this.pos, wp) < 0.35) { this.pathIdx++; }
      else {
        const speed = (d > 7 ? 4.1 : d > 3.5 ? 3.1 : 2.3) * (this.crouchFrac > 0.6 ? 0.62 : 1);
        this.stepToward(wp, speed, dt);
        game.tryAiOpenDoors(this);
      }
    }

    // stuck recovery: teleport near the player if far, unseen, and stuck
    if (dist2(this.pos, this.lastProgressPos) > 0.5) {
      this.lastProgressPos.copy(this.pos);
      this.stuckTimer = 0;
    } else if (this.state === 'following') {
      this.stuckTimer += dt;
      const dToPlayer = dist2(this.pos, game.player.pos);
      if (this.stuckTimer > 5 && dToPlayer > 9) {
        const level = game.nav.levelOf(game.player.pos.y);
        const spot = game.nav.randomNearby(level, game.player.pos.x, game.player.pos.z, 3, Math.random);
        if (spot && !game.playerCanSee(spot)) {
          this.pos.set(spot.x, spot.y, spot.z);
          this.path = null;
          this.stuckTimer = 0;
        }
      }
    }

    // ground snap
    const g = game.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.4, 0.5);
    if (g.y > -100) this.pos.y = THREE.MathUtils.damp(this.pos.y, g.y, 14, dt);
    this.body.group.position.copy(this.pos);
    this.body.group.rotation.y = this.yaw;
  }

  followPoint() {
    // a spot slightly behind the player
    const p = this.game.player;
    const back = p.forwardDir().multiplyScalar(-1.4);
    return { x: p.pos.x + back.x, y: p.pos.y, z: p.pos.z + back.z };
  }

  stepToward(wp, speed, dt) {
    const dx = wp.x - this.pos.x, dy = wp.y - this.pos.y, dz = wp.z - this.pos.z;
    const l = Math.hypot(dx, dy, dz) || 1;
    const step = speed * dt;
    const nx = this.pos.x + (dx / l) * step, nz = this.pos.z + (dz / l) * step;
    const level = this.game.nav.levelOf(this.pos.y + dy / l);
    if (this.game.nav.isWalkable(level, nx, nz) || Math.abs(dy / l) > 0.2) { this.pos.x = nx; this.pos.z = nz; }
    else if (this.game.nav.isWalkable(level, nx, this.pos.z)) this.pos.x = nx;
    else if (this.game.nav.isWalkable(level, this.pos.x, nz)) this.pos.z = nz;
    if (Math.abs(dy / l) > 0.05) this.pos.y += (dy / l) * step;
    this.yaw = Math.atan2(-dx, -dz);
    this.body.setMoveAnim(speed, dt);
    this._stepAcc = (this._stepAcc || 0) + step;
    if (this._stepAcc > 1.8) {
      this._stepAcc = 0;
      const g = this.game.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.4);
      sfx(`step_${g.surface}`, { pos: this.pos, vol: 0.28, rateJitter: 0.15 });
    }
  }

  onCombatNearby() { this.fearTimer = 2.5; }
}

function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
