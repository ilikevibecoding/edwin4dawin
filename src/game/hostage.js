// Hostage behavior: bound at their spot until freed, then follow at the
// player's shoulder (never in the firing line), hunch-run under fire, cower
// behind cover when told to hold, take stairs and doors with the same door
// discipline the AI uses, recover if stuck, and sprint aboard the van.

import * as THREE from 'three';
import { emit } from '../core/events.js';
import { sfx } from '../core/audio.js';
import { rng } from '../core/rng.js';
import { createHostageBody } from '../characters/bodies.js';
import { doorOnSegment, doorIsPassable, doorSidePoint, doorAtPoint } from './navigation.js';

const SCARED_LINES = ['Is it clear?', 'Oh god—', 'They are still out there.', 'Stay close to me. Please.'];

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
    this.followSide = index % 2 === 0 ? 1 : -1;
    this.sideBlockedTimer = 0;
    this.dodgeTimer = 0;
    this.dodgeTarget = null;
    this.barkTimer = 14;
    this.cowerSpot = null;
    this.cowerTimer = 0;
    this.sprintedToVan = false;
    this.offMeshTimer = 0;
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
      this.cowerSpot = null;
      emit('subtitle', { speaker: this.name.split(' ')[0], text: 'Holding here.', ttl: 2.2 });
    } else if (this.state === 'holding') {
      this.state = 'following';
      this.cowerSpot = null;
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
    this.barkTimer -= dt;

    if (this.state === 'bound' || this.state === 'extracted') {
      this.body.setMoveAnim(0, dt);
      return;
    }

    this.recoverOffMesh(dt);

    if (this.state === 'holding') {
      this.updateHolding(dt);
      return;
    }

    // sprint the last stretch to the van instead of trailing the player
    if (this.state === 'following' && this.nearVan()) this.breakForVan();

    // --- following / extracting ---
    const underFire = this.state === 'following' && this.combatNear(12);
    const target = this.state === 'extracting'
      ? { x: game.extraction.vanAt.x - 1.6, y: game.extraction.y, z: game.extraction.vanAt.z }
      : this.followPoint(dt, underFire);

    const d = dist2(this.pos, target);
    const playerCrouch = game.player.crouchFrac > 0.5;
    // hunch-run when rounds are close by; full crouch only when actually scared
    const crouchWant = this.fearTimer > 0.1 ? 1 : underFire ? 0.6 : (playerCrouch && this.state === 'following') ? 1 : 0;
    this.crouchFrac = THREE.MathUtils.damp(this.crouchFrac, crouchWant, 6, dt);
    this.body.setCrouch(this.crouchFrac);
    if (underFire || this.fearTimer > 0) this.scaredBark();

    if (this.state === 'extracting' && d < 0.8) {
      this.state = 'extracted';
      this.body.setCrouch(1);
      emit('subtitle', { speaker: this.name.split(' ')[0], text: 'I am in the van. Go!', ttl: 3 });
      emit('objective', { id: `extract_${this.id}`, state: 'done' });
      sfx('hostage_secured', { vol: 0.8 });
      return;
    }
    const dodging = this.dodgeTimer > 0 && !!this.dodgeTarget;
    // tight enough that she actually reaches the shoulder slot rather than
    // settling anywhere on a wide circle around it (which reads as trailing)
    const holdDist = dodging ? 0.3 : 0.5;
    if (this.state === 'following' && d < holdDist) {
      this.body.setMoveAnim(0, dt);
      // face the player, but never park inside a doorway
      const p = game.player.pos;
      this.yaw = Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z));
      this.stuckTimer = 0;
      this.clearDoorway(dt);
      this.snapToGround(dt);
      return;
    }

    // path following
    this.repathTimer -= dt;
    const goalMoved = this.path && this.path.length && dist2(this.path[this.path.length - 1], target) > 2.2;
    if (!this.path || this.pathIdx >= this.path.length || (this.repathTimer <= 0 && goalMoved)) {
      this.repathTimer = 0.7;
      this.path = game.nav.findPath(this.pos, target, { priority: true });
      this.pathIdx = 0;
    }
    if (this.path && this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      if (dist2(this.pos, wp) < 0.35) { this.pathIdx++; }
      else if (!this.waitForDoor(wp, dt)) {
        const sprint = this.state === 'extracting' || this.sprintedToVan;
        let speed = d > 7 ? 4.1 : d > 3.5 ? 3.1 : 2.3;
        if (dodging) speed = 3;
        if (sprint) speed = 4.4;
        speed *= this.crouchFrac > 0.75 ? 0.62 : this.crouchFrac > 0.4 ? 0.85 : 1;
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
        const spot = game.nav.randomNearby(level, game.player.pos.x, game.player.pos.z, 3, () => rng.random());
        if (spot && !game.playerCanSee(spot)) {
          this.pos.set(spot.x, spot.y, spot.z);
          this.path = null;
          this.stuckTimer = 0;
        }
      }
    }

    this.snapToGround(dt);
  }

  // Entity collisions can shove a civilian into a wall; slide them back onto
  // the walkable set instead of letting them grind against geometry.
  recoverOffMesh(dt) {
    const nav = this.game.nav;
    const level = nav.levelOf(this.pos.y);
    if (nav.isWalkable(level, this.pos.x, this.pos.z)) { this.offMeshTimer = 0; return; }
    this.offMeshTimer = (this.offMeshTimer || 0) + dt;
    if (this.offMeshTimer < 1) return;
    this.offMeshTimer = 0;
    const spot = nav.nearestWalkable(level, this.pos.x, this.pos.z, 3);
    if (spot) { this.pos.x = spot.x; this.pos.z = spot.z; this.path = null; }
  }

  snapToGround(dt) {
    const g = this.game.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.4, 0.5);
    if (g.y > -100) this.pos.y = THREE.MathUtils.damp(this.pos.y, g.y, 14, dt);
    this.body.group.position.copy(this.pos);
    this.body.group.rotation.y = this.yaw;
  }

  // ------------------------------------------------------------------ holding
  updateHolding(dt) {
    const scared = this.fearTimer > 0 || this.combatNear(14);
    if (scared) {
      this.scaredBark();
      this.cowerTimer -= dt;
      if (!this.cowerSpot && this.cowerTimer <= 0) {
        this.cowerTimer = 1.4;
        this.cowerSpot = this.findHidingSpot();
      }
    } else {
      this.cowerSpot = null;
    }
    const crouch = scared ? 1 : 0.25;
    this.crouchFrac = THREE.MathUtils.damp(this.crouchFrac, crouch, 6, dt);
    this.body.setCrouch(this.crouchFrac);

    if (this.cowerSpot && dist2(this.pos, this.cowerSpot) > 0.4) {
      this.stepToward(this.cowerSpot, 2.4, dt);
      this.snapToGround(dt);
      return;
    }
    this.body.setMoveAnim(0, dt);
  }

  // A crouch-height hiding place: fully out of sight of the nearest threat.
  findHidingSpot() {
    const game = this.game;
    const threat = this.nearestThreat();
    if (!threat) return null;
    const level = game.nav.levelOf(this.pos.y);
    const te = { x: threat.x, y: (threat.y ?? 0) + 1.55, z: threat.z };
    let best = null;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8 + this.pos.x * 0.1;
      const r = 1.4 + (i % 2) * 1.3;
      const x = this.pos.x + Math.cos(a) * r, z = this.pos.z + Math.sin(a) * r;
      if (!game.nav.isWalkable(level, x, z)) continue;
      if (doorAtPoint(game.world, x, z, this.pos.y)) continue;
      const g = game.world.groundAt(x, z, this.pos.y + 0.4, 0.5);
      if (g.y < -100 || Math.abs(g.y - this.pos.y) > 0.5) continue;
      // hide fully: even the crouched head must be out of the threat's view
      if (game.world.lineOfSight(x, g.y + 1.0, z, te.x, te.y, te.z)) continue;
      const score = r;
      if (!best || score < best.score) best = { x, y: g.y, z, score };
    }
    return best;
  }

  nearestThreat() {
    let best = null, bd = Infinity;
    for (const e of this.game.enemies) {
      if (!e.alive) continue;
      const d = dist2(e.pos, this.pos);
      if (d < bd && d < 22) { bd = d; best = e.pos; }
    }
    return best;
  }

  combatNear(radius) {
    for (const e of this.game.enemies) {
      if (!e.alive || e.state !== 'combat') continue;
      if (dist2(e.pos, this.pos) < radius) return true;
    }
    return false;
  }

  scaredBark() {
    if (this.barkTimer > 0) return;
    this.barkTimer = rng.range(20, 34);
    emit('subtitle', { speaker: this.name.split(' ')[0], text: rng.pick(SCARED_LINES), ttl: 2.4 });
  }

  // ---------------------------------------------------------------- follow
  nearVan() {
    const ex = this.game.extraction;
    if (Math.abs(this.pos.y - ex.y) > 1.5) return false;
    return dist2(this.pos, ex.vanAt) < 8;
  }

  breakForVan() {
    if (this.sprintedToVan) return;
    this.sprintedToVan = true;
    this.path = null;
    emit('subtitle', { speaker: this.name.split(' ')[0], text: 'The van — I see it!', ttl: 2.6 });
  }

  // Shoulder position: back-left or back-right of the player, whichever has
  // room, and a sidestep out of the player's aim line.
  followPoint(dt, underFire = false) {
    const game = this.game;
    const p = game.player;
    if (this.sprintedToVan) {
      const ex = game.extraction;
      return { x: ex.vanAt.x - 1.6, y: ex.y, z: ex.vanAt.z };
    }
    const fwd = p.forwardDir();
    const level = game.nav.levelOf(p.pos.y);
    const back = underFire ? 1.15 : 1.55;   // tuck in when rounds are close
    const out = underFire ? 0.7 : 0.95;
    const spot = (side) => ({
      x: p.pos.x - fwd.x * back - fwd.z * out * side,
      y: p.pos.y,
      z: p.pos.z - fwd.z * back + fwd.x * out * side,
    });
    const free = (s) => {
      const q = spot(s);
      return game.nav.isWalkable(level, q.x, q.z) && !doorAtPoint(game.world, q.x, q.z, p.pos.y);
    };
    if (!free(this.followSide)) {
      this.sideBlockedTimer += dt;
      if (this.sideBlockedTimer > 0.35 && free(-this.followSide)) {
        this.followSide = -this.followSide;
        this.sideBlockedTimer = 0;
      }
    } else {
      this.sideBlockedTimer = 0;
    }

    // aim-line dodge: if the player is pointing at us up close, step aside
    this.dodgeTimer -= dt;
    const toMe = { x: this.pos.x - p.pos.x, z: this.pos.z - p.pos.z };
    const dMe = Math.hypot(toMe.x, toMe.z) || 1;
    const aimDot = (fwd.x * toMe.x + fwd.z * toMe.z) / dMe;
    if (aimDot < 0.86) { this.dodgeTimer = 0; this.dodgeTarget = null; }
    else if (dMe < 5 && this.dodgeTimer <= 0) {
      this.dodgeTimer = 1.2;
      const perp = { x: -fwd.z, z: fwd.x };
      const lateral = toMe.x * perp.x + toMe.z * perp.z;
      for (const s of (lateral >= 0 ? [1, -1] : [-1, 1])) {
        const q = { x: this.pos.x + perp.x * 1.4 * s, y: this.pos.y, z: this.pos.z + perp.z * 1.4 * s };
        if (!game.nav.isWalkable(level, q.x, q.z) || doorAtPoint(game.world, q.x, q.z, p.pos.y)) continue;
        this.dodgeTarget = q;
        break;
      }
    }
    if (this.dodgeTimer > 0 && this.dodgeTarget) return this.dodgeTarget;
    this.dodgeTarget = null;
    return spot(this.followSide);
  }

  // When idling next to the player, never stand in a door span.
  clearDoorway(dt) {
    const door = doorAtPoint(this.game.world, this.pos.x, this.pos.z, this.pos.y, 0.25);
    if (!door) return false;
    const out = doorSidePoint(door, this.game.player.pos, 1.4);
    const level = this.game.nav.levelOf(this.pos.y);
    if (!this.game.nav.isWalkable(level, out.x, out.z)) return false;
    this.stepToward({ x: out.x, y: this.pos.y, z: out.z }, 2.2, dt);
    return true;
  }

  // Same door discipline as the AI: stop short, open once, wait for clearance.
  waitForDoor(wp, dt) {
    const door = doorOnSegment(this.game.world, this.pos, wp, this.pos.y);
    if (!door || doorIsPassable(door)) return false;
    if (door.locked) { this.path = null; this.repathTimer = 0; return true; }
    const stop = doorSidePoint(door, this.pos, 0.8);
    if (dist2(this.pos, door.center) > 1.05 && dist2(this.pos, stop) > 0.3) {
      this.stepToward({ x: stop.x, y: this.pos.y, z: stop.z }, 2.2, dt);
      return true;
    }
    this.yaw = Math.atan2(-(door.center.x - this.pos.x), -(door.center.z - this.pos.z));
    if (door.state === 'closed') door.setOpen(true, 'ai');
    this.body.setMoveAnim(0, dt);
    return true;
  }

  stepToward(wp, speed, dt) {
    const dx = wp.x - this.pos.x, dy = (wp.y ?? this.pos.y) - this.pos.y, dz = wp.z - this.pos.z;
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
