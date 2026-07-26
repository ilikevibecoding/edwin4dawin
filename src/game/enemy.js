// Hostile AI: perception (vision cone + hearing), suspicion, patrol,
// investigation, combat with cover peeking/bursts/reloads, room-aware searching,
// squad coordination (spread approach + one flanker), door discipline,
// flash/smoke reactions, archetype flavour and a never-stuck watchdog.

import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { emit } from '../core/events.js';
import { sfx } from '../core/audio.js';
import { createEnemyBody } from '../characters/bodies.js';
import { roomAt } from '../world/map.js';
import { beginNavStep, doorOnSegment, doorIsPassable, doorSidePoint } from './navigation.js';

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
  flank: ['Going around!', 'Cutting him off!'],
  smoke: ['Smoke — hold the line!', 'I have nothing through that.'],
  blind: ['I cannot see!', 'My eyes!'],
};

let barkCooldown = 0;

// ---------------------------------------------------------------- squad state
// Per-step scheduling + soft coordination live at module scope: game.js already
// ticks tickBarkCooldown() once per sim step before any entity updates, so it
// doubles as the "begin step" hook for the nav budget and shooter slots.
const MAX_SHOOTERS = 3;      // soft cap on simultaneous shooters (fairness)
const COVER_SEARCHES_PER_STEP = 2;
const shooters = new Map();  // enemy id -> seconds of slot left
let squad = null;            // { key, step, members[] } — one alert wave
let simStep = 0;
let coverBudget = COVER_SEARCHES_PER_STEP;

export function tickBarkCooldown(dt) {
  barkCooldown = Math.max(0, barkCooldown - dt);
  simStep++;
  coverBudget = COVER_SEARCHES_PER_STEP;
  beginNavStep();
  for (const [id, ttl] of shooters) {
    if (ttl - dt <= 0) shooters.delete(id);
    else shooters.set(id, ttl - dt);
  }
  if (squad && simStep - squad.step > 4) squad = null;
}

function claimShooter(id) {
  if (shooters.has(id)) { shooters.set(id, 0.7); return true; }
  if (shooters.size < MAX_SHOOTERS) { shooters.set(id, 0.7); return true; }
  return false;
}

// Everyone alerted to the same place in the same step forms one wave: they get
// distinct ring slots to approach from and exactly one flanker.
function joinSquad(enemy, pos) {
  const key = `${Math.round(pos.x / 3)}:${Math.round(pos.z / 3)}`;
  if (!squad || squad.key !== key || simStep - squad.step > 4) squad = { key, step: simStep, members: [] };
  squad.step = simStep;
  if (!squad.members.includes(enemy)) squad.members.push(enemy);
  const live = squad.members.filter((m) => m.alive);
  let flanker = null;
  for (const m of live) if (!flanker || flankRank(m) < flankRank(flanker)) flanker = m;
  live.forEach((m, i) => {
    m.squadSlot = i;
    m.squadSize = live.length;
    const wantFlank = live.length > 1 && m === flanker;
    if (wantFlank && m.role !== 'flank') { m.role = 'flank'; m.flankPlan = null; m.flankTimer = 0; }
    if (!wantFlank) m.role = 'assault';
  });
}
// scouts make the best flankers, heavies the worst; id hash breaks ties
function flankRank(e) {
  const order = { scout: 0, trooper: 1, marksman: 2, heavy: 3 };
  return (order[e.type] ?? 1) * 4096 + (e.hash % 4096);
}

// QA-only introspection (?qa=1 installs window.__qa): the public snapshot does
// not carry tactical internals, so the probe tooling reads them from here.
let qaGame = null;
function installQaProbe(game) {
  qaGame = game;
  if (typeof window === 'undefined' || !window.__qa || window.__aiProbe) return;
  const r2 = (n) => Math.round(n * 100) / 100;
  window.__navProbe = (from, to) => {
    if (!qaGame) return null;
    const pts = qaGame.nav.findPath(from, to, { priority: true });
    if (!pts) return pts === undefined ? 'deferred' : null;
    return pts.map((p) => [r2(p.x), r2(p.y), r2(p.z)]);
  };
  window.__navWalk = (level, x, z) => (qaGame ? qaGame.nav.isWalkable(level, x, z) : null);
  window.__aiProbe = () => {
    const g = qaGame;
    if (!g || !g.built) return null;
    return {
      shooters: [...shooters.keys()],
      enemies: g.enemies.filter((e) => e.alive).map((e) => ({
        id: e.id, type: e.type, state: e.state, role: e.role, sees: e.canSeePlayer,
        blind: r2(e.blindTimer), smokeHold: !!e.smokeShift,
        pos: [r2(e.pos.x), r2(e.pos.y), r2(e.pos.z)], crouch: r2(e.crouchFrac),
        cover: e.cover ? [r2(e.cover.x), r2(e.cover.z), e.cover.peek ? 1 : 0] : null,
        slot: e.squadSlot, stuckRescues: e.stuckRescues, stuckFor: r2(e.stuckTime),
        search: e.searchTarget ? [r2(e.searchTarget.x), r2(e.searchTarget.z)] : null,
        lastKnown: e.lastKnown ? [r2(e.lastKnown.x), r2(e.lastKnown.z)] : null,
        wp: e.path && e.path[e.pathIdx] ? [r2(e.path[e.pathIdx].x), r2(e.path[e.pathIdx].z)] : null,
        pathLeft: e.path ? e.path.length - e.pathIdx : 0,
      })),
      hostages: g.hostages.map((h) => ({
        id: h.id, state: h.state, pos: [r2(h.pos.x), r2(h.pos.y), r2(h.pos.z)],
        crouch: r2(h.crouchFrac), side: h.followSide, dodging: h.dodgeTimer > 0,
      })),
    };
  };
}

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
    // a spawn point buried in furniture would leave the body inside a collider
    if (game.nav && !game.nav.isWalkable(this.level, this.pos.x, this.pos.z)) {
      const spot = game.nav.nearestWalkable(this.level, this.pos.x, this.pos.z, 3);
      if (spot) this.pos.set(spot.x, y, spot.z);
    }
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
    this.searchList = null;
    this.searchTarget = null;
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

    // --- tactics ---
    this.hash = hashId(this.id);
    this.role = 'assault';       // assault | flank
    this.squadSlot = this.hash % 5;
    this.squadSize = 3;
    this.cover = null;           // {x,y,z, peek:{x,y,z}|null}
    this.coverAnchor = null;     // player position when the cover was chosen
    this.coverTimer = rng.random();
    this.coverCheckTimer = 0;
    this.coverPhase = 0;
    this.flankPlan = null;
    this.flankTimer = 0;
    this.smokeShift = null;
    this.smokeShiftTimer = 0;
    this.stumbleTimer = 0;
    this.stumbleTo = null;
    this.postShots = 0;          // marksman: shots fired from the current post
    this.cqbMode = false;
    this.wantsMove = false;
    this.stuckTime = 0;
    this.stuckRepathed = false;
    this.stuckRef = this.pos.clone();
    this.stuckRescues = 0;
    installQaProbe(game);
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
    this.searchList = null;
    joinSquad(this, this.lastKnown);
    if (this.role === 'flank') { this.flankPlan = null; this.flankTimer = 0; }
  }

  investigate(pos, urgent) {
    if (this.state === 'combat') return;
    this.state = 'investigate';
    this.lastKnown = { x: pos.x, y: pos.y, z: pos.z };
    this.path = null;
    this.repathTimer = 0;
    this.waitTimer = 0;
    this.searchList = null;
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
    // shot from an unseen angle: the current cover is worthless
    this.cover = null;
    this.game.alertAlliesNear(this.pos, 13, this.lastKnown);
    sfx('enemy_hurt', { pos: this.pos, vol: 0.55, rateJitter: 0.2 });
    if (this.health <= 0) this.die(part === 'head', weaponId);
    else emit('hit-marker', { kind: part === 'head' ? 'headshot' : 'hit' });
  }

  die(headshot) {
    this.alive = false;
    this.state = 'dead';
    this.health = 0;
    shooters.delete(this.id);
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
          this.cover = null;
          this.searchList = null;
          bark('alert', this.pos);
          joinSquad(this, this.lastKnown);
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

    this.updateStuckWatchdog(dt);

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
    this.cover = null;
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
      this.enterSearch(3);
      return;
    }
    // spread out: each responder converges on its own slot around the noise
    const goal = this.approachPoint(this.lastKnown);
    if (dist2(this.pos, goal) < 1.0) { this.enterSearch(3); return; }
    this.followPathTo(goal, this.def.speed * 0.72, dt);
  }

  enterSearch(points) {
    this.state = 'search';
    this.searchTimer = 0;
    this.searchPoints = points;
    this.searchList = null;
    this.searchTarget = null;
    this.path = null;
  }

  // -------------------------------------------------------------- searching
  updateSearch(dt) {
    this.wantCrouch = false;
    this.searchTimer -= dt;
    if (this.searchTimer <= 0) {
      if (this.searchPoints <= 0) {
        bark('search', this.pos);
        this.state = 'patrol';
        this.path = null;
        this.searchTarget = null;
        return;
      }
      this.searchPoints--;
      this.searchTarget = this.nextSearchPoint();
      this.path = null;
      this.searchTimer = rng.range(2.4, 4);
    }
    if (this.searchTarget && dist2(this.pos, this.searchTarget) > 0.7) {
      this.followPathTo(this.searchTarget, this.def.speed * 0.6, dt);
    } else if (this.searchTarget && this.searchTarget.face) {
      this.faceToward(this.searchTarget.face);   // check the corner / doorway
    } else {
      this.targetYaw = this.yaw + dt * 1.2;      // scan
    }
  }

  nextSearchPoint() {
    if (!this.searchList || !this.searchList.length) this.searchList = this.buildSearchPoints();
    if (!this.searchList.length) {
      const level = this.game.nav.levelOf(this.pos.y);
      return this.game.nav.randomNearby(level, this.lastKnown?.x ?? this.pos.x, this.lastKnown?.z ?? this.pos.z, 5.5, () => rng.random());
    }
    const k = rng.int(0, Math.min(2, this.searchList.length - 1));
    return this.searchList.splice(k, 1)[0];
  }

  // Believable sweep: the corners of the room the contact was in, plus the
  // doorways leading out of it, each faced while checked.
  buildSearchPoints() {
    const game = this.game;
    const lk = this.lastKnown || this.pos;
    const level = game.nav.levelOf(lk.y ?? this.pos.y);
    const y = level === 'b' ? -3.6 : 0;
    const pts = [];
    const push = (x, z, face) => {
      let p = { x, z };
      if (!game.nav.isWalkable(level, x, z)) {
        const w = game.nav.nearestWalkable(level, x, z, 1.6);
        if (!w) return;
        p = w;
      }
      if (dist2(p, this.pos) < 1.2) return;
      pts.push({ x: p.x, y, z: p.z, face });
    };
    const room = roomAt(lk.x, lk.z, y);
    if (room) {
      for (const [x0, z0, x1, z1] of room.rects) {
        if (x1 - x0 < 2.4 || z1 - z0 < 2.4) { push((x0 + x1) / 2, (z0 + z1) / 2, { x: x0, z: z0 }); continue; }
        const in_ = 1.7;
        push(x0 + in_, z0 + in_, { x: x0, z: z0 });
        push(x1 - in_, z0 + in_, { x: x1, z: z0 });
        push(x0 + in_, z1 - in_, { x: x0, z: z1 });
        push(x1 - in_, z1 - in_, { x: x1, z: z1 });
      }
    }
    for (const door of game.world.doors) {
      if (door.def.level !== level) continue;
      if (dist2(door.center, lk) > 12) continue;
      const p = doorSidePoint(door, lk, 1.6);
      push(p.x, p.z, { x: door.center.x, z: door.center.z });
    }
    pts.sort((a, b) => dist2(a, this.pos) - dist2(b, this.pos));
    return pts.slice(0, 6);
  }

  // ---------------------------------------------------------------- combat
  updateCombat(dt) {
    const player = this.game.player;
    if (!player.alive) { this.state = 'patrol'; this.cover = null; return; }
    if (this.blindTimer > 0) { this.updateBlinded(dt); return; }

    if (this.canSeePlayer) {
      const d = dist3(player.pos, this.pos);
      this.faceToward(player.pos);
      this.aimTimer = Math.max(0, this.aimTimer - dt);
      if (this.type === 'marksman') this.cqbMode = d < 8;
      // a reloading or flinching shooter releases its slot so an ally can use it
      const ready = this.reloadTimer <= 0 && this.aimTimer <= 0 && this.flinchTimer <= 0 && this.ammo > 0;
      if (!ready) shooters.delete(this.id);
      const mayShoot = (ready && claimShooter(this.id)) || d < 6;
      const band = this.rangeBand();

      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = rng.range(0.9, 1.9);
        const roll = rng.random();
        this.wantCrouch = roll < 0.3;
        this.strafeDir = roll > 0.62 ? (rng.chance(0.5) ? 1 : -1) : 0;
      }

      if (d > band.max) {
        this.cover = null;
        this.moveDirect(player.pos, this.def.speed, dt);
      } else if (d < band.min) {
        this.cover = null;
        // cornered with nowhere to back off: keep moving laterally instead
        if (!this.moveAway(player.pos, this.def.speed * 0.8, dt) && this.strafeDir) {
          this.strafe(player.pos, this.strafeDir, this.def.speed * 0.5, dt);
        }
      } else {
        this.holdGround(dt, d, mayShoot);
      }

      this.updateFiring(dt, d, mayShoot);
    } else {
      // Ducked behind our own cover: keep the peek cycle instead of charging.
      if (this.cover && this.atCover() && this.lostSightTime < 3.5) {
        this.burstCd = Math.max(0, this.burstCd - dt);
        this.wantCrouch = !this.wantFireWindow();
        if (this.lastKnown) this.faceToward(this.lastKnown);
        return;
      }
      this.wantCrouch = false;
      if (this.lostSightTime > 1.4 && this.lastKnown) this.pressLastKnown(dt);
    }
  }

  rangeBand() {
    if (this.type === 'heavy') return { min: 2.5, max: 9 };
    if (this.type === 'marksman') return this.cqbMode ? { min: 9, max: 44 } : { min: 12, max: 44 };
    if (this.type === 'scout') return { min: 5, max: 22 };
    return { min: 6, max: 24 };
  }

  wantFireWindow() {
    return this.reloadTimer <= 0 && this.aimTimer <= 0 && (this.burstLeft > 0 || this.burstCd <= 0.35);
  }
  atCover() {
    return !!this.cover && dist2(this.pos, this.cover) < 0.7;
  }

  // In-band behaviour: heavies keep pushing with suppressive fire, everyone
  // else works a cover point (crouch behind it, pop up to shoot).
  holdGround(dt, d, mayShoot) {
    const player = this.game.player;
    if (this.type === 'heavy') {
      this.cover = null;
      if (d > 5) this.moveDirect(player.pos, this.def.speed * 0.8, dt);
      else if (this.strafeDir) this.strafe(player.pos, this.strafeDir, this.def.speed * 0.5, dt);
      return;
    }
    // marksman: relocate after two shots from the same post
    if (this.type === 'marksman' && this.postShots >= 2) {
      this.cover = null;
      this.postShots = 0;
      this.coverTimer = 0;
      this.coverPhase += 1.1;
    }
    this.maintainCover(dt);
    if (!this.cover) {
      if (this.strafeDir && !this.wantCrouch) this.strafe(player.pos, this.strafeDir, this.def.speed * 0.55, dt);
      return;
    }
    const fire = mayShoot && this.wantFireWindow();
    const slot = fire && this.cover.peek ? this.cover.peek : this.cover;
    if (dist2(this.pos, slot) > 0.45) {
      this.wantCrouch = false;
      this.stepToward({ x: slot.x, y: this.pos.y, z: slot.z }, this.def.speed * 0.9, dt, false);
      this.faceToward(player.pos);
      this.wantsMove = true;
    } else {
      this.wantCrouch = !fire;
    }
  }

  maintainCover(dt) {
    const player = this.game.player;
    if (this.cover) {
      this.coverCheckTimer -= dt;
      if (this.coverCheckTimer <= 0) {
        this.coverCheckTimer = 0.5;
        if (!this.coverStillGood()) { this.cover = null; this.coverPhase += 0.7; }
      }
    }
    if (this.cover) return;
    this.coverTimer -= dt;
    if (this.coverTimer > 0 || coverBudget <= 0) return;
    this.coverTimer = rng.range(1.2, 2.1);
    coverBudget--;
    const found = this.searchCoverPoint();
    if (found) {
      this.cover = found;
      this.coverAnchor = { x: player.pos.x, z: player.pos.z };
      this.coverCheckTimer = 0.5;
      this.postShots = 0;
    }
  }

  coverStillGood() {
    const c = this.cover;
    if (!c) return false;
    const game = this.game;
    if (this.coverAnchor && dist2(this.coverAnchor, game.player.pos) > 6) return false;
    const level = game.nav.levelOf(this.pos.y);
    if (!game.nav.isWalkable(level, c.x, c.z)) return false;
    const pe = game.player.eyePos;
    // flanked: the player can see us even while we are crouched behind it
    if (game.world.lineOfSight(c.x, c.y + 1.18, c.z, pe.x, pe.y, pe.z)) return false;
    return true;
  }

  // Ring sample around the current position: a point counts as cover when a
  // crouching body there is hidden from the player's eye but a standing body
  // (or a short lean to the side) still has the shot.
  searchCoverPoint() {
    const game = this.game;
    const player = game.player;
    const pe = player.eyePos;
    const level = game.nav.levelOf(this.pos.y);
    const band = this.rangeBand();
    const N = 10;
    const base = ((this.hash % 1000) / 1000) * Math.PI * 2 + this.coverPhase;
    let best = null;
    for (let i = 0; i < N; i++) {
      const a = base + (i * Math.PI * 2) / N;
      const r = 1.5 + (i % 3) * 1.25;
      const x = this.pos.x + Math.cos(a) * r;
      const z = this.pos.z + Math.sin(a) * r;
      if (!game.nav.isWalkable(level, x, z)) continue;
      const g = game.world.groundAt(x, z, this.pos.y + 0.4, 0.5);
      if (g.y < -100 || Math.abs(g.y - this.pos.y) > 0.5) continue;
      if (game.world.lineOfSight(x, g.y + 1.18, z, pe.x, pe.y, pe.z)) continue; // no concealment
      let peek = null;
      if (!game.world.lineOfSight(x, g.y + 1.62, z, pe.x, pe.y, pe.z)) {
        peek = this.leanPoint(x, z, g.y, pe, level);   // hard cover: lean out instead
        if (!peek) continue;
      }
      if (this.allyCrowds(x, z)) continue;                            // one body per slab
      const dPlayer = dist2({ x, z }, player.pos);
      const rangeCost = dPlayer < band.min ? (band.min - dPlayer) * 1.4
        : dPlayer > band.max ? (dPlayer - band.max) * 1.1 : 0;
      const score = r * 0.55 + rangeCost + (peek ? 1.1 : 0);
      if (!best || score < best.score) best = { x, y: g.y, z, peek, score };
    }
    return best;
  }

  allyCrowds(x, z) {
    for (const other of this.game.enemies) {
      if (other === this || !other.alive) continue;
      if (Math.abs(other.pos.y - this.pos.y) > 1.6) continue;
      if (dist2(other.pos, { x, z }) < 1) return true;
      if (other.cover && dist2(other.cover, { x, z }) < 1.3) return true;
    }
    return false;
  }

  leanPoint(x, z, gy, pe, level) {
    const to = norm3({ x: pe.x - x, y: 0, z: pe.z - z });
    for (const s of [1, -1]) {
      const lx = x - to.z * 0.95 * s, lz = z + to.x * 0.95 * s;
      if (!this.game.nav.isWalkable(level, lx, lz)) continue;
      const g = this.game.world.groundAt(lx, lz, gy + 0.4, 0.5);
      if (g.y < -100 || Math.abs(g.y - gy) > 0.5) continue;
      if (this.game.world.lineOfSight(lx, g.y + 1.62, lz, pe.x, pe.y, pe.z)) return { x: lx, y: g.y, z: lz };
    }
    return null;
  }

  // ------------------------------------------------- pressing a lost contact
  pressLastKnown(dt) {
    const lk = this.lastKnown;
    const eye = this.eyePos;
    if (this.game.smokeBlocks(eye, { x: lk.x, y: (lk.y ?? 0) + 1.2, z: lk.z }) && this.type !== 'heavy') {
      this.holdOffSmoke(dt);
      return;
    }
    if (this.role === 'flank') { this.runFlank(dt); return; }
    if (dist2(this.pos, lk) < 1.3) { this.enterSearch(4); bark('search', this.pos); return; }
    const goal = this.approachPoint(lk);
    if (dist2(this.pos, goal) < 0.9) { this.enterSearch(4); bark('search', this.pos); return; }
    this.followPathTo(goal, this.def.speed, dt);
  }

  // Deterministic ring slot so a wave of responders fans out instead of
  // stacking on one point.
  approachPoint(lk) {
    if (dist2(this.pos, lk) < 4.5) return lk;
    const slots = Math.max(3, this.squadSize || 3);
    const ang = ((this.hash % 360) / 360) * Math.PI * 2 + ((this.squadSlot || 0) * Math.PI * 2) / slots;
    const r = 1.7 + (this.hash % 5) * 0.16;
    const level = this.game.nav.levelOf(lk.y ?? this.pos.y);
    const x = lk.x + Math.cos(ang) * r, z = lk.z + Math.sin(ang) * r;
    if (this.game.nav.isWalkable(level, x, z)) return { x, y: lk.y, z };
    return lk;
  }

  holdOffSmoke(dt) {
    const lk = this.lastKnown;
    this.faceToward(lk);
    this.wantCrouch = true;
    this.smokeShiftTimer -= dt;
    if (!this.smokeShift || this.smokeShiftTimer <= 0) {
      this.smokeShiftTimer = rng.range(1.8, 3);
      const to = norm3(sub3(lk, this.pos));
      const s = rng.chance(0.5) ? 1 : -1;
      const p = { x: this.pos.x - to.z * 3.2 * s, y: this.pos.y, z: this.pos.z + to.x * 3.2 * s };
      const level = this.game.nav.levelOf(this.pos.y);
      this.smokeShift = this.game.nav.isWalkable(level, p.x, p.z) ? p : null;
      bark('smoke', this.pos);
    }
    if (this.smokeShift && dist2(this.pos, this.smokeShift) > 0.5) {
      this.wantCrouch = false;
      this.stepToward(this.smokeShift, this.def.speed * 0.6, dt, false);
      this.wantsMove = true;
    }
  }

  // Flanker: aim for a spot beside/behind the contact, preferring a route
  // through a different doorway when the detour is not much longer.
  runFlank(dt) {
    const lk = this.lastKnown;
    this.flankTimer -= dt;
    if (!this.flankPlan || this.flankTimer <= 0 || dist2(this.flankPlan.origin, lk) > 5) {
      this.flankTimer = 3.5;
      const plan = this.planFlank(lk);
      if (plan === undefined) { /* deferred by the path budget: retry next step */ }
      else if (plan) { this.flankPlan = plan; bark('flank', this.pos); }
      else { this.role = 'assault'; return; }
    }
    const plan = this.flankPlan;
    if (!plan) return;
    while (plan.route.length && dist2(this.pos, plan.route[0]) < 1.4) plan.route.shift();
    const goal = plan.route[0] || plan.goal;
    if (dist2(this.pos, goal) < 1.1) { this.enterSearch(4); this.flankPlan = null; return; }
    this.followPathTo(goal, this.def.speed, dt);
  }

  planFlank(lk) {
    const game = this.game;
    const level = game.nav.levelOf(lk.y ?? this.pos.y);
    const toLk = Math.atan2(lk.z - this.pos.z, lk.x - this.pos.x);
    let goal = null;
    for (const off of [0.7, -0.7, 1.25, -1.25, 2.1]) {
      const a = toLk + off;
      const p = game.nav.nearestWalkable(level, lk.x + Math.cos(a) * 4.2, lk.z + Math.sin(a) * 4.2, 1.6);
      if (p && dist2(p, this.pos) > 3) { goal = p; break; }
    }
    if (!goal) return null;
    const direct = game.nav.findPath(this.pos, goal);
    if (direct === undefined) return undefined;
    if (!direct) return null;
    const directCost = polyLen(direct);
    // alternative entry: the closest doorway to the goal that the direct route
    // does not already use
    let altDoor = null, altDist = Infinity;
    for (const door of game.world.doors) {
      if (door.def.level !== level || door.locked) continue;
      const dd = dist2(door.center, goal);
      if (dd > 14) continue;
      if (routeTouches(direct, door.center, 1.6)) continue;
      if (dd < altDist) { altDist = dd; altDoor = door; }
    }
    if (altDoor) {
      const via = doorSidePoint(altDoor, goal, 1.1);
      const legA = game.nav.findPath(this.pos, { x: via.x, y: lk.y ?? this.pos.y, z: via.z });
      if (legA === undefined) return undefined;
      if (legA) {
        const legB = game.nav.findPath({ x: via.x, y: this.pos.y, z: via.z }, goal);
        if (legB === undefined) return undefined;
        if (legB && polyLen(legA) + polyLen(legB) < directCost * 1.9) {
          return { origin: { x: lk.x, z: lk.z }, goal, route: [{ x: via.x, y: this.pos.y, z: via.z }, goal] };
        }
      }
    }
    return { origin: { x: lk.x, z: lk.z }, goal, route: [goal] };
  }

  // -------------------------------------------------------- flash reactions
  updateBlinded(dt) {
    this.wantCrouch = false;
    if (this.lastKnown) this.faceToward(this.lastKnown);
    this.stumbleTimer -= dt;
    if (this.stumbleTimer <= 0) {
      this.stumbleTimer = rng.range(0.3, 0.65);
      const a = rng.random() * Math.PI * 2;
      this.stumbleTo = { x: this.pos.x + Math.cos(a) * 0.9, y: this.pos.y, z: this.pos.z + Math.sin(a) * 0.9 };
      this.targetYaw = this.yaw + rng.range(-1.3, 1.3);
      if (rng.chance(0.25)) bark('blind', this.pos);
    }
    if (this.stumbleTo) {
      const level = this.game.nav.levelOf(this.pos.y);
      if (this.game.nav.isWalkable(level, this.stumbleTo.x, this.stumbleTo.z)) {
        this.stepToward(this.stumbleTo, this.def.speed * 0.35, dt, false);
      }
    }
    // panic fire: rare, wild, and physically impossible to hit through walls
    this.burstCd -= dt;
    if (this.burstCd > 0 || this.reloadTimer > 0 || this.ammo <= 0) return;
    this.burstCd = rng.range(1, 2.2);
    if (!this.alertLevel || !rng.chance(0.35)) return;
    this.ammo--;
    const player = this.game.player;
    const eye = this.eyePos, pe = player.eyePos;
    const los = this.game.world.lineOfSight(eye.x, eye.y, eye.z, pe.x, pe.y, pe.z);
    this.fireShot(dist3(player.pos, this.pos), { wild: true, forceMiss: !los });
  }

  updateFiring(dt, d, mayShoot = true) {
    if (this.reloadTimer > 0) return;
    if (this.ammo <= 0) {
      this.reloadTimer = this.def.reload;
      this.ammo = this.def.mag;
      this.burstLeft = 0;
      bark('reload', this.pos);
      sfx('reload_mag', { pos: this.pos, vol: 0.4 });
      return;
    }
    if (this.aimTimer > 0 || this.flinchTimer > 0 || this.blindTimer > 0) return;
    if (!mayShoot) { this.burstCd = Math.max(0, this.burstCd - dt); return; }
    const shape = this.burstShape();
    this.burstCd -= dt;
    if (this.burstLeft <= 0 && this.burstCd <= 0) {
      this.burstLeft = Math.round(rng.range(shape.burst[0], shape.burst[1]));
      this.burstCd = rng.range(shape.cd[0], shape.cd[1]);
      this.shotTimer = 0;
    }
    if (this.burstLeft > 0) {
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        this.shotTimer = shape.rof;
        this.burstLeft--;
        this.ammo--;
        this.postShots++;
        this.fireShot(d);
      }
    }
  }

  // Archetype fire rhythm: heavies suppress slowly while advancing, a marksman
  // forced into close quarters abandons its slow deliberate rhythm.
  burstShape() {
    const def = this.def;
    if (this.type === 'marksman' && this.cqbMode) return { burst: [2, 3], cd: [0.8, 1.2], rof: 0.5 };
    if (this.type === 'heavy') return { burst: def.burst, cd: [1.9, 2.6], rof: def.rof };
    return { burst: def.burst, cd: def.burstCd, rof: def.rof };
  }

  fireShot(d, opts = {}) {
    const game = this.game;
    const player = game.player;
    const diff = game.difficulty;
    // hit model
    let acc = diff.enemyAccuracy;
    acc *= THREE.MathUtils.clamp(1.25 - d / this.def.range, 0.18, 1);
    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    acc *= hSpeed > 3 ? 0.55 : hSpeed > 1 ? 0.75 : 1;
    if (player.crouchFrac > 0.5) acc *= 0.82;
    if (opts.wild) acc *= 0.12;
    if (opts.forceMiss) acc = 0;
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
      // near miss: impact a point near the player (much wider when firing wild)
      const spread = opts.wild ? 4.5 : 1.1;
      const off = () => rng.range(-spread, spread);
      const target = { x: pe.x + off(), y: pe.y + rng.range(-0.7, 0.5) * (opts.wild ? 2 : 1), z: pe.z + off() };
      const dir = norm3(sub3(target, eye));
      const r = game.world.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, 60, { blocking: 'move' });
      if (r && r.collider) emit('impact', { kind: r.collider.surface || 'concrete', point: r.point, normal: r.normal });
      sfx('bullet_whiz', { vol: 0.35, rateJitter: 0.25 });
      emit('enemy-shot', { from: eye, to: target, hit: false });
    }
  }

  // ---------------- movement helpers ----------------
  followPathTo(target, speed, dt) {
    this.wantsMove = true;
    this.repathTimer -= dt;
    const needRepath = !this.path || this.pathIdx >= this.path.length ||
      (this.repathTimer <= 0 && dist2(this.path[this.path.length - 1], target) > 1.5);
    if (needRepath) {
      const res = this.game.nav.findPath(this.pos, { x: target.x, y: target.y ?? this.pos.y, z: target.z });
      if (res !== undefined) {
        this.repathTimer = 1.2 + rng.random() * 0.6;
        if (res) { this.path = res; this.pathIdx = 0; }
        else { this.path = null; this.stuckFallback(); }
      }
    }
    if (!this.path || this.pathIdx >= this.path.length) return;
    let wp = this.path[this.pathIdx];
    if (dist2(this.pos, wp) < 0.35) {
      this.pathIdx++;
      wp = this.path[this.pathIdx];
      if (!wp) return;
    }
    if (this.handleDoorGate(wp, dt)) return;
    this.stepToward(wp, speed, dt);
    // open doors in the way
    this.game.tryAiOpenDoors(this);
  }

  // Door discipline: stop short of a closed door, open it once, wait until the
  // leaf is actually out of the way, then walk through. Never toggles a door.
  handleDoorGate(wp, dt) {
    const door = doorOnSegment(this.game.world, this.pos, wp, this.pos.y);
    if (!door || doorIsPassable(door)) return false;
    if (door.locked) {
      this.game.nav.refreshDoor(door);   // locked doors are walls until unlocked
      this.path = null;
      this.repathTimer = 0;
      return true;
    }
    const stop = doorSidePoint(door, this.pos, 0.8);
    if (dist2(this.pos, door.center) > 1.05 && dist2(this.pos, stop) > 0.3) {
      this.stepToward({ x: stop.x, y: this.pos.y, z: stop.z }, Math.min(this.def.speed, 2.4), dt);
      return true;
    }
    this.faceToward(door.center);
    if (door.state === 'closed') door.setOpen(true, 'ai');
    return true;
  }

  moveDirect(target, speed, dt) { this.followPathTo(target, speed, dt); }

  moveAway(from, speed, dt) {
    const dir = norm3(sub3(this.pos, from));
    const level = this.game.nav.levelOf(this.pos.y);
    for (const turn of [0, 0.7, -0.7]) {
      const c = Math.cos(turn), s = Math.sin(turn);
      const dx = dir.x * c - dir.z * s, dz = dir.x * s + dir.z * c;
      const dest = { x: this.pos.x + dx * 2.5, y: this.pos.y, z: this.pos.z + dz * 2.5 };
      if (!this.game.nav.isWalkable(level, dest.x, dest.z)) continue;
      this.stepToward(dest, speed, dt, false);
      this.wantsMove = true;
      return true;
    }
    return false;
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

  stuckFallback() {
    // nudge randomly so a failed path never leaves the AI frozen
    const level = this.game.nav.levelOf(this.pos.y);
    const pt = this.game.nav.randomNearby(level, this.pos.x, this.pos.z, 3, () => rng.random());
    if (pt) { this.path = [pt]; this.pathIdx = 0; }
  }

  // Anyone who means to move but has not moved gets a repath, then a nudge onto
  // the nearest walkable cell. Counted, never logged.
  updateStuckWatchdog(dt) {
    if (!this.wantsMove) {
      this.stuckTime = 0;
      this.stuckRepathed = false;
      this.stuckRef.copy(this.pos);
      return;
    }
    this.wantsMove = false;
    if (dist2(this.pos, this.stuckRef) > 0.4) {
      this.stuckRef.copy(this.pos);
      this.stuckTime = 0;
      this.stuckRepathed = false;
      return;
    }
    this.stuckTime += dt;
    // shoved off the walkable set (entity collisions near walls): recover fast
    const level = this.game.nav.levelOf(this.pos.y);
    const offMesh = !this.game.nav.isWalkable(level, this.pos.x, this.pos.z);
    if (this.stuckTime > (offMesh ? 1.2 : 12)) {
      this.forceUnstick(offMesh);
    } else if (this.stuckTime > 6 && !this.stuckRepathed) {
      this.stuckRepathed = true;
      this.path = null;
      this.repathTimer = 0;
    }
  }

  forceUnstick(offMesh = false) {
    this.stuckTime = 0;
    this.stuckRepathed = false;
    const nav = this.game.nav;
    const level = nav.levelOf(this.pos.y);
    const wp = this.path?.[this.pathIdx];
    this.path = null;
    this.repathTimer = 0;
    const dir = wp ? norm3(sub3(wp, this.pos))
      : { x: Math.cos(this.hash % 6.283), y: 0, z: Math.sin(this.hash % 6.283) };
    const spot = offMesh
      ? nav.nearestWalkable(level, this.pos.x, this.pos.z, 1.5) || nav.nearestWalkable(level, this.pos.x, this.pos.z, 3)
      : nav.nearestWalkable(level, this.pos.x + dir.x * 1.2, this.pos.z + dir.z * 1.2, 3)
        || nav.nearestWalkable(level, this.pos.x, this.pos.z, 4);
    if (spot && dist2(spot, this.pos) > 0.15) {
      this.pos.x = spot.x;
      this.pos.z = spot.z;
      this.stuckRescues++;
    }
    this.stuckRef.copy(this.pos);
  }
}

function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return L;
}
function routeTouches(pts, p, r) {
  for (const q of pts) if (Math.hypot(q.x - p.x, q.z - p.z) < r) return true;
  return false;
}
function dist3(a, b) { const dx = a.x - b.x, dy = (a.y ?? 0) - (b.y ?? 0), dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
function sub3(a, b) { return { x: a.x - b.x, y: (a.y ?? 0) - (b.y ?? 0), z: a.z - b.z }; }
function norm3(v) { const l = Math.hypot(v.x, v.y ?? 0, v.z) || 1; return { x: v.x / l, y: (v.y ?? 0) / l, z: v.z / l }; }
