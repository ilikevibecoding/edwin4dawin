import * as THREE from 'three';
import { bus, EVT } from '../core/events.js';
import { Rng, hashString } from '../core/rng.js';
import { HOSTAGE_POINTS, EXTRACTION, roomAt, floorForY } from '../map/layout.js';
import { buildHostage } from '../characters/hostage-model.js';
import { difficultyPreset } from '../mission/objectives.js';
import { resumeIndex, climbStep, STAIR_SWEEP_PAD, STAIR_ENTRY_PAD } from './navgrid.js';

// ---------------------------------------------------------------------------
// Hostages.  (owner: opus3)
//
// STATES
//   bound       zip-tied where the crew left them, cowering
//   securing    the player is holding the use key; a 1.6 s progress action
//   secured     free, on their feet, waiting for an order
//   following   pathing to a slot ~2.2 m behind the player, opening doors,
//               ducking behind cover when rounds go off nearby
//   waiting     told to hold position; keeps their head down
//   extracting  moving to their own slot inside the vehicle bay
//   extracted   loaded; removed from play and no longer shootable
//   dead        killed by anyone, which fails that hostage's objective
//
// A hostage has no collider: they must never body-block the player in a
// corridor. Enemy fire reaches them through the EVT.ENEMY_FIRE hook below
// rather than through a physics capsule.
//
// DETERMINISM: one seeded Rng per hostage plus one for the manager, every timer
// a dt accumulator, no wall-clock reads.
// ---------------------------------------------------------------------------

export const HOSTAGE_STATE = {
  BOUND: 'bound',
  SECURING: 'securing',
  SECURED: 'secured',
  FOLLOWING: 'following',
  WAITING: 'waiting',
  EXTRACTING: 'extracting',
  EXTRACTED: 'extracted',
  DEAD: 'dead',
};

/** Hold duration for the free-the-hostage action, in seconds. */
export const SECURE_HOLD = 1.6;

const AGENT_RADIUS = 0.28;
const AGENT_HEIGHT = 1.68;
const EYE_HEIGHT = 1.52;
const CROUCH_SCALE = 0.68;
const GRAVITY = 18;

const FOLLOW_STANDOFF = 2.2;
const FOLLOW_CHASE = 3.1;      // start moving again beyond this
/** How far a held hostage may stray from her hold anchor to reach cover. */
const HOLD_COVER_RADIUS = 3.0;
const FOLLOW_SPEED = 3.1;
const FOLLOW_SPRINT = 4.0;     // used when they have fallen a long way behind
const TELEPORT_DISTANCE = 14;  // "no path and this far behind" bail-out
const TELEPORT_GRACE = 2.0;

const REPLAN_INTERVAL = 0.5;
const STUCK_WINDOW = 2.5;
const STUCK_DISTANCE = 0.35;
const STUCK_LIMIT = 3;

const ALARM_TIME = 4.0;        // how long gunfire keeps them frightened
const ALARM_RADIUS = 15;
const COVER_SEARCH_RADIUS = 6;

let uid = 0;

// =========================================================================
// One hostage
// =========================================================================

class Hostage {
  constructor(manager, point, index) {
    this.manager = manager;
    this.game = manager.game;
    this.index = index;
    this.id = point.id || `hostage-${++uid}`;
    this.name = point.name || 'Hostage';
    this.variant = point.variant || (index === 0 ? 'analyst' : 'director');
    this.intro = point.intro || '';
    this.homeRoom = point.room || null;
    this.rng = new Rng(hashString(`northstar:hostage:${this.id}`));

    this.homePos = new THREE.Vector3(point.pos[0], point.pos[1], point.pos[2]);
    this.homeYaw = point.yaw ?? 0;
    this.position = this.homePos.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = this.homeYaw;
    this.desiredYaw = this.yaw;
    this.eyeHeight = EYE_HEIGHT;
    this.speed = 0;
    this.grounded = true;
    this.hitWall = false;
    this.crouched = true;
    /** Tread height to ease toward while on a flight; null on open floor. */
    this.climbY = null;

    this.alive = true;
    this.dead = false;
    this.extracted = false;
    this.health = 100;
    this.maxHealth = 100;

    this.state = HOSTAGE_STATE.BOUND;
    this.prevState = null;
    this.stateTime = 0;
    this.secureProgress = 0;
    this.securedAt = null;
    this.following = false;
    this.revealed = false;
    this.seenByPlayer = false;

    this.fear = 1;
    this.alarmTimer = 0;
    this.cowering = true;
    this.lastThreat = null;
    this.coverPos = null;
    this.coverTimer = 0;

    this.path = null;
    this.pathIndex = 0;
    this.goal = null;
    this.replanTimer = 0;
    this.noPathTimer = 0;
    this.stuckTimer = 0;
    this.stuckFails = 0;
    this._watchPos = this.position.clone();
    this._lookTimer = 0;

    this.model = null;
    this.animator = null;
    this.group = null;
    this.hitRegions = makeRegions();
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  get room() {
    return roomAt(this.position.x, this.position.z, floorForY(this.position.y));
  }

  get secured() {
    return this.state === HOSTAGE_STATE.SECURED
      || this.state === HOSTAGE_STATE.FOLLOWING
      || this.state === HOSTAGE_STATE.WAITING
      || this.state === HOSTAGE_STATE.EXTRACTING
      || this.state === HOSTAGE_STATE.EXTRACTED;
  }

  get mobile() {
    return this.alive
      && (this.state === HOSTAGE_STATE.FOLLOWING
        || this.state === HOSTAGE_STATE.WAITING
        || this.state === HOSTAGE_STATE.EXTRACTING);
  }

  /**
   * Accepts both shapes the codebase uses: `applyDamage(amount, infoObject)`
   * from CombatSystem, and `applyDamage(amount, regionName, fromPos)`.
   */
  applyDamage(amount, region = 'chest', fromPos = null) {
    if (!this.alive || this.extracted) return 0;
    let info = null;
    let regionName = 'chest';
    let from = fromPos;
    if (region && typeof region === 'object') {
      info = region;
      regionName = info.region || 'chest';
      from = info.from || info.sourcePos || fromPos;
    } else if (typeof region === 'string') {
      regionName = region;
    }
    const dealt = Math.max(0, Number(amount) || 0);
    this.health -= dealt;
    this.fear = 1;
    this.alarmTimer = Math.max(this.alarmTimer, ALARM_TIME);
    if (from) this.lastThreat = toVec3(from);
    if (this.health <= 0) {
      this.die({ region: regionName, from: this.lastThreat, byPlayer: info?.byPlayer === true });
      return dealt;
    }
    return dealt;
  }

  notifyHit(fromPos) {
    if (fromPos) this.lastThreat = toVec3(fromPos);
    this.fear = 1;
    this.alarmTimer = Math.max(this.alarmTimer, ALARM_TIME);
  }

  /** Hostages are civilians: a flashbang just terrifies them. */
  blind(duration) {
    const d = Math.max(0, Number(duration) || 0);
    if (d <= 0) return;
    this.fear = 1;
    this.alarmTimer = Math.max(this.alarmTimer, d + 1.5);
  }

  die(info = {}) {
    if (this.dead) return;
    this.alive = false;
    this.dead = true;
    this.health = 0;
    this.path = null;
    this.velocity.set(0, 0, 0);
    this.deathClip = String(info.region || '').includes('head') ? 'death_slump'
      : this.rng.bool(0.5) ? 'death_forward' : 'death_back';
    this.manager._transition(this, HOSTAGE_STATE.DEAD, { byPlayer: info.byPlayer === true });
    this.animator?.play(this.deathClip, { fade: 0.06, force: true });
    this.manager.onDeath(this, info);
  }
}

// =========================================================================
// Manager
// =========================================================================

export class HostageManager {
  constructor(game) {
    this.game = game;
    this.rng = new Rng(hashString('northstar:hostages'));
    /** @type {Hostage[]} */
    this.hostages = [];
    this.time = 0;
    this.preset = difficultyPreset(game?.difficulty || 'operator');
    this.extractionCalled = false;
    this.intelRevealed = false;
    this.lost = 0;
    this._pool = new Map();
    this._doorCooldown = new Map();
    this._queryOut = [];
    this._holdId = null;
    this._offs = [
      bus.on('world:noise', (p) => this._onNoise(p)),
      bus.on(EVT.ENEMY_FIRE, (p) => this._onEnemyFire(p)),
    ];
    this.reset();
  }

  get list() {
    return this.hostages;
  }

  get securedCount() {
    return this.hostages.filter((h) => h.alive && h.secured).length;
  }

  get extractedCount() {
    return this.hostages.filter((h) => h.state === HOSTAGE_STATE.EXTRACTED).length;
  }

  get aliveCount() {
    return this.hostages.filter((h) => h.alive).length;
  }

  get lostCount() {
    return this.hostages.filter((h) => !h.alive).length;
  }

  get allSecured() {
    return this.hostages.length > 0 && this.hostages.every((h) => h.alive && h.secured);
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
  }

  // ------------------------------------------------------------------- reset

  /** Full rebuild. Nothing from the previous run may survive this. */
  reset() {
    this.preset = difficultyPreset(this.game?.difficulty || 'operator');
    this.time = 0;
    this.extractionCalled = false;
    this.intelRevealed = false;
    this.lost = 0;
    this._doorCooldown.clear();
    this._holdId = null;
    this.rng.reseed(hashString('northstar:hostages'));
    // Idempotent, and harmless if `EnemyManager.reset` already did it: whichever
    // of the two resets last, the grid's fallback stream ends up at the top.
    this.game.nav?.resetRun?.();
    uid = 0;

    for (const h of this.hostages) this._release(h);
    this.hostages.length = 0;

    for (let i = 0; i < HOSTAGE_POINTS.length; i++) {
      this._spawn(HOSTAGE_POINTS[i], i);
    }
    return this;
  }

  _spawn(point, index) {
    const h = new Hostage(this, point, index);
    const nav = this.game.nav;
    // Snap onto the mesh so the very first path plan cannot fail.
    if (nav && !nav.isWalkable?.(h.position)) {
      const snap = nav.nearestWalkable?.(h.position, 3);
      if (snap) h.position.copy(snap);
    }
    h.homePos.copy(h.position);
    h._watchPos.copy(h.position);
    this._attachModel(h);
    // Before the first update, so a hostage in a frozen world can still be hit.
    this._updateRegions(h);
    this.hostages.push(h);
    return h;
  }

  _attachModel(h) {
    const pool = this._pool.get(h.variant) || [];
    let model = pool.pop();
    if (!model) {
      try {
        model = buildHostage(h.variant);
      } catch (err) {
        console.warn('[ai] hostage model failed', err);
        return;
      }
    }
    this._pool.set(h.variant, pool);
    h.model = model;
    h.animator = model.animator;
    h.group = model.group;
    h.name = h.name || model.displayName;
    model.setSecured?.(false);
    model.setLOD?.(0);
    h.group.visible = true;
    h.group.position.copy(h.position);
    h.group.rotation.y = h.yaw;
    h.animator.breathe = true;
    h.animator.play('hostage_idle', { force: true });
    this.game.scene?.add?.(h.group);
  }

  _release(h) {
    const model = h.model;
    if (model) {
      this.game.scene?.remove?.(model.group);
      model.group.visible = false;
      model.setSecured?.(false);
      model.setLOD?.(0);
      if (model.animator) {
        model.animator.breathe = true;
        model.animator.play('hostage_idle', { force: true });
      }
      const pool = this._pool.get(h.variant) || [];
      pool.push(model);
      this._pool.set(h.variant, pool);
    }
    h.model = null;
    h.animator = null;
    h.group = null;
  }

  // ------------------------------------------------------------------ events

  /** Gunfire nearby makes a hostage duck; a hostage never ignores it. */
  _onNoise(p) {
    if (!p) return;
    const kind = String(p.kind || '');
    if (kind !== 'gunshot' && kind !== 'explosion' && kind !== 'detonation') return;
    const pos = toVec3(p.position);
    const loud = Math.max(0.2, Number(p.loudness) || 1);
    for (const h of this.hostages) {
      if (!h.alive || h.extracted) continue;
      const d = h.position.distanceTo(pos);
      if (d > ALARM_RADIUS * loud) continue;
      const panic = this.preset.hostagePanic ?? 1;
      h.fear = Math.min(1, h.fear + (1 - d / (ALARM_RADIUS * loud)) * 0.9 * panic);
      h.alarmTimer = Math.max(h.alarmTimer, ALARM_TIME * panic);
      h.lastThreat = pos;
      // Break for cover on the next think, not from inside an event handler.
      h.coverTimer = Math.min(h.coverTimer, 0.05);
    }
  }

  /**
   * Stray hostile rounds. Hostages carry no collider (so they can never wedge
   * the player in a doorway), so a near-miss along the shot line is what puts
   * them in danger instead.
   */
  _onEnemyFire(p) {
    if (!p?.position || !p?.direction) return;
    const from = toVec3(p.position);
    const dir = toVec3(p.direction);
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();
    for (const h of this.hostages) {
      if (!h.alive || h.extracted) continue;
      const chest = new THREE.Vector3(h.position.x, h.position.y + 1.1, h.position.z);
      const along = chest.clone().sub(from).dot(dir);
      if (along < 1.0 || along > 45) continue;
      const closest = from.clone().addScaledVector(dir, along);
      if (closest.distanceTo(chest) > 0.26) continue;
      if (this.game.collision?.lineOfSight?.(from, chest) === false) continue;
      h.fear = 1;
      h.alarmTimer = Math.max(h.alarmTimer, ALARM_TIME);
      // A burst may not chain-kill: one hostile round can land per hostage per
      // 1.2 s, so standing them in a firefight is a risk, not a coin flip.
      if (this.time - (h.lastGrazed ?? -99) < 1.2) continue;
      if (!this.rng.bool(0.25)) continue;
      h.lastGrazed = this.time;
      h.applyDamage(8 + Math.round(this.rng.float() * 6), 'chest', from);
    }
  }

  // ------------------------------------------------------------------ update

  update(dt) {
    if (dt <= 0) return;
    this.time += dt;
    const holdTarget = this._pollHold();

    for (const h of this.hostages) {
      h.stateTime += dt;
      h.coverTimer = Math.max(0, h.coverTimer - dt);
      h.replanTimer = Math.max(0, h.replanTimer - dt);
      h.alarmTimer = Math.max(0, h.alarmTimer - dt);
      h._lookTimer = Math.max(0, h._lookTimer - dt);
      if (h.alarmTimer <= 0) h.fear = Math.max(0, h.fear - dt * 0.35);

      if (!h.alive) {
        h.deathTimer = (h.deathTimer || 0) + dt;
        h.velocity.set(0, 0, 0);
        this._updateRegions(h);
        continue;
      }
      if (h.extracted) {
        this._updateRegions(h);
        continue;
      }

      this._think(h, dt, holdTarget);
      this._integrate(h, dt);
      this._watchdog(h, dt);
      this._updateRegions(h);
      this._noticePlayer(h);
    }
  }

  /**
   * The hold-to-free action. `game.handleInteraction` refreshes
   * `currentInteractable` earlier in the same fixed step, so this reads the
   * player's actual aim rather than guessing.
   */
  _pollHold() {
    const game = this.game;
    const target = game?.currentInteractable;
    const holding = game?.state === 'playing'
      && !!game?.input?.isDown?.('use')
      && target?.kind === 'hostage'
      && target?.action === 'secure';
    this._holdId = holding ? String(target.id) : null;
    return this._holdId;
  }

  // ---------------------------------------------------------------- thinking

  _think(h, dt, holdTarget) {
    switch (h.state) {
      case HOSTAGE_STATE.BOUND:
      case HOSTAGE_STATE.SECURING:
        this._stateBound(h, dt, holdTarget);
        break;
      case HOSTAGE_STATE.SECURED:
        this._stateSecured(h, dt);
        break;
      case HOSTAGE_STATE.FOLLOWING:
        this._stateFollowing(h, dt);
        break;
      case HOSTAGE_STATE.WAITING:
        this._stateWaiting(h, dt);
        break;
      case HOSTAGE_STATE.EXTRACTING:
        this._stateExtracting(h, dt);
        break;
      default:
        break;
    }
  }

  /** Bound and cowering; the only thing that changes is the hold meter. */
  _stateBound(h, dt, holdTarget) {
    h.crouched = true;
    h.velocity.x = 0;
    h.velocity.z = 0;
    h.path = null;
    if (holdTarget === h.id) {
      h.secureProgress = Math.min(1, h.secureProgress + dt / SECURE_HOLD);
      if (h.state !== HOSTAGE_STATE.SECURING) {
        this._transition(h, HOSTAGE_STATE.SECURING);
      }
      // Look up at whoever is cutting the ties.
      const player = this.game.player;
      if (player) this._faceTowards(h, player.position);
      if (h.secureProgress >= 1) this.secure(h);
      return;
    }
    // Let go and the ties are still on: the meter drains.
    if (h.secureProgress > 0) {
      h.secureProgress = Math.max(0, h.secureProgress - dt * 1.6);
      if (h.secureProgress <= 0 && h.state === HOSTAGE_STATE.SECURING) {
        this._transition(h, HOSTAGE_STATE.BOUND);
      }
    }
    if (h._lookTimer <= 0) {
      h._lookTimer = 2.2 + h.rng.float() * 2.4;
      h.desiredYaw = h.homeYaw + h.rng.range(-0.5, 0.5);
    }
  }

  /** Freed but not yet told what to do: stand up, stay put, watch the player. */
  _stateSecured(h, dt) {
    h.crouched = this._shouldCower(h);
    h.velocity.x = 0;
    h.velocity.z = 0;
    h.path = null;
    const player = this.game.player;
    if (player) this._faceTowards(h, player.position);
    // Default order is "on me": nobody wants to micro-manage an escort.
    if (h.stateTime > 0.8) {
      h.following = true;
      this._transition(h, HOSTAGE_STATE.FOLLOWING);
    }
  }

  _stateFollowing(h, dt) {
    const player = this.game.player;
    if (!player) return;
    if (this.extractionCalled) {
      this._transition(h, HOSTAGE_STATE.EXTRACTING);
      return;
    }

    const dist = h.position.distanceTo(player.position);
    const cower = this._shouldCower(h);
    h.crouched = cower && dist < FOLLOW_CHASE + 1.2;

    // Rounds going off close by: get behind something solid, then resume.
    if (h.alarmTimer > 0 && !cower && h.coverTimer <= 0 && dist < 9) {
      this._seekCover(h);
    }
    if (h.coverPos && h.alarmTimer > 0) {
      if (h.position.distanceTo(h.coverPos) > 0.55) {
        this._driveTo(h, h.coverPos, FOLLOW_SPEED, dt);
      } else {
        h.path = null;
        h.crouched = true;
        this._faceTowards(h, h.lastThreat || player.position);
      }
      return;
    }
    h.coverPos = null;

    if (cower && dist < FOLLOW_CHASE + 1.2) {
      h.path = null;
      h.velocity.x = 0;
      h.velocity.z = 0;
      this._faceTowards(h, h.lastThreat || player.position);
      return;
    }

    if (dist <= FOLLOW_CHASE && this._clearToPlayer(h)) {
      h.path = null;
      h.velocity.x = 0;
      h.velocity.z = 0;
      h.noPathTimer = 0;
      this._faceTowards(h, player.position);
      return;
    }

    const slot = this._followSlot(h);
    const speed = dist > 8 ? FOLLOW_SPRINT : FOLLOW_SPEED;
    this._driveTo(h, slot, speed, dt);
    this._teleportGuard(h, dt, dist);
  }

  /**
   * Told to hold: stay on the spot, duck when it gets loud.
   *
   * "Hold here" has to mean here. Cover-seeking is still allowed, because a
   * hostage standing upright through a firefight looks absurd, but it is
   * anchored: she may only take cover within HOLD_COVER_RADIUS of where she was
   * told to stop, and she walks back to that spot once the shooting stops. A
   * cover position left over from following her escort is discarded outright —
   * that was letting a held hostage trail the player right across the map.
   */
  _stateWaiting(h, dt) {
    if (this.extractionCalled) {
      this._transition(h, HOSTAGE_STATE.EXTRACTING);
      return;
    }
    if (!h.holdAnchor) h.holdAnchor = h.position.clone();
    h.crouched = this._shouldCower(h) || h.alarmTimer > 0;

    if (h.coverPos && h.coverPos.distanceTo(h.holdAnchor) > HOLD_COVER_RADIUS) h.coverPos = null;
    if (h.alarmTimer > 0 && h.coverTimer <= 0 && !h.coverPos) {
      this._seekCover(h);
      if (h.coverPos && h.coverPos.distanceTo(h.holdAnchor) > HOLD_COVER_RADIUS) h.coverPos = null;
    }
    if (h.coverPos && h.position.distanceTo(h.coverPos) > 0.55) {
      this._driveTo(h, h.coverPos, FOLLOW_SPEED, dt);
      return;
    }
    // Drift back to the spot once it is quiet again.
    if (h.alarmTimer <= 0 && h.position.distanceTo(h.holdAnchor) > 0.8) {
      h.coverPos = null;
      this._driveTo(h, h.holdAnchor, FOLLOW_SPEED, dt);
      return;
    }
    h.path = null;
    h.velocity.x = 0;
    h.velocity.z = 0;
    if (h._lookTimer <= 0) {
      h._lookTimer = 1.8 + h.rng.float() * 2.0;
      const threat = h.lastThreat || this.game.player?.position;
      if (threat) this._faceTowards(h, threat);
      else h.desiredYaw = h.yaw + h.rng.range(-0.7, 0.7);
    }
  }

  /** Head for the vehicle bay under their own steam and wait there. */
  _stateExtracting(h, dt) {
    const slot = this._extractionSlot(h);
    const inside = insideExtraction(h.position);
    h.crouched = false;
    if (inside && h.position.distanceTo(slot) < 0.7) {
      h.path = null;
      h.velocity.x = 0;
      h.velocity.z = 0;
      const player = this.game.player;
      this._faceTowards(h, player ? player.position : new THREE.Vector3(EXTRACTION.center[0] + 4, 0, EXTRACTION.center[2]));
      return;
    }
    this._driveTo(h, slot, FOLLOW_SPRINT, dt);
    // Nothing may leave a hostage stranded outside the bay.
    const player = this.game.player;
    if (player) this._teleportGuard(h, dt, h.position.distanceTo(player.position));
  }

  // ----------------------------------------------------------------- helpers

  _shouldCower(h) {
    const player = this.game.player;
    if (!player) return false;
    const crouched = (player.crouchBlend ?? 0) > 0.5;
    const underFire = h.alarmTimer > 0;
    return crouched && underFire;
  }

  _clearToPlayer(h) {
    const player = this.game.player;
    const collision = this.game.collision;
    if (!player || !collision?.lineOfSight) return true;
    const a = new THREE.Vector3(h.position.x, h.position.y + 1.2, h.position.z);
    const b = new THREE.Vector3(player.position.x, player.position.y + 1.2, player.position.z);
    return collision.lineOfSight(a, b);
  }

  /** A slot about 2.2 m behind the player, offset so two hostages don't stack. */
  _followSlot(h) {
    const player = this.game.player;
    const base = player.position.clone();
    const fwd = player.forward ? toVec3(player.forward).setY(0) : new THREE.Vector3(0, 0, -1);
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const side = h.index % 2 === 0 ? -0.65 : 0.65;
    const slot = base
      .addScaledVector(fwd, -FOLLOW_STANDOFF)
      .addScaledVector(right, side);
    const nav = this.game.nav;
    if (!nav) return slot;
    if (nav.isWalkable?.(slot)) return slot;
    return nav.nearestWalkable?.(slot, 2.5) || nav.nearestWalkable?.(player.position, 2.5) || slot;
  }

  _extractionSlot(h) {
    const c = EXTRACTION.center;
    const side = h.index % 2 === 0 ? -1 : 1;
    const raw = new THREE.Vector3(c[0] - 0.9, c[1], c[2] + side * 1.1);
    const nav = this.game.nav;
    if (!nav) return raw;
    if (nav.isWalkable?.(raw)) return raw;
    return nav.nearestWalkable?.(raw, 3) || raw;
  }

  /** Somewhere solid to put between a frightened civilian and the shooting. */
  _seekCover(h) {
    h.coverTimer = 1.1 + h.rng.float() * 0.6;
    const nav = this.game.nav;
    const collision = this.game.collision;
    const threat = h.lastThreat;
    if (!nav || !collision?.query || !threat) return null;

    const R = COVER_SEARCH_RADIUS;
    const min = new THREE.Vector3(h.position.x - R, h.position.y - 0.3, h.position.z - R);
    const max = new THREE.Vector3(h.position.x + R, h.position.y + 2.6, h.position.z + R);
    const hits = collision.query(min, max, this._queryOut).slice();

    let best = null;
    let bestScore = Infinity;
    let examined = 0;
    for (const c of hits) {
      if (examined > 18) break;
      if (!c.enabled) continue;
      const tag = c.tag || '';
      if (/^(character|floor:|deck:|ceil|railing:|stairrail:)/.test(tag)) continue;
      const top = c.max.y - h.position.y;
      if (top < 0.6 || top > 3.2) continue;
      const cx = (c.min.x + c.max.x) * 0.5;
      const cz = (c.min.z + c.max.z) * 0.5;
      const hx = (c.max.x - c.min.x) * 0.5;
      const hz = (c.max.z - c.min.z) * 0.5;
      if (hx > 6 || hz > 6) continue;
      const away = new THREE.Vector3(cx - threat.x, 0, cz - threat.z);
      if (away.lengthSq() < 0.01) continue;
      away.normalize();
      examined++;

      const reach = Math.max(hx, hz) + AGENT_RADIUS + 0.3;
      const spot = new THREE.Vector3(cx + away.x * reach, h.position.y, cz + away.z * reach);
      if (!nav.isWalkable?.(spot)) continue;
      const snapped = nav.nearestWalkable?.(spot, 0.9);
      if (!snapped) continue;
      const crouchHead = new THREE.Vector3(snapped.x, snapped.y + 0.9, snapped.z);
      if (collision.lineOfSight(new THREE.Vector3(threat.x, threat.y + 1.5, threat.z), crouchHead)) continue;

      let score = h.position.distanceTo(snapped);
      // Cover the player has already walked past is no use to an escort.
      const player = this.game.player;
      if (player) score += Math.max(0, snapped.distanceTo(player.position) - 5) * 0.8;
      if (score < bestScore) {
        bestScore = score;
        best = snapped;
      }
    }
    h.coverPos = best;
    return best;
  }

  /** Path (re-planning on a throttle) and then walk toward a world point. */
  _driveTo(h, target, speed, dt) {
    if (!target) return;
    const needPlan = !h.path
      || h.replanTimer <= 0
      || !h.goal
      || h.goal.distanceToSquared(target) > 1.4;
    if (needPlan) this._setGoal(h, target);
    if (h.path) {
      h.noPathTimer = 0;
      this._followPath(h, dt, speed);
      return;
    }
    // No route: walk the straight line and let the watchdog sort it out.
    h.noPathTimer += dt;
    const dir = new THREE.Vector3(target.x - h.position.x, 0, target.z - h.position.z);
    if (dir.lengthSq() > 0.04) {
      dir.normalize();
      h.velocity.x = dir.x * speed * 0.7;
      h.velocity.z = dir.z * speed * 0.7;
      h.desiredYaw = Math.atan2(-dir.x, -dir.z);
    } else {
      h.velocity.x = 0;
      h.velocity.z = 0;
    }
  }

  _setGoal(h, target) {
    const nav = this.game.nav;
    h.replanTimer = REPLAN_INTERVAL;
    if (!nav || !target) return false;
    // Halfway down a flight there is no cell under our feet, so a re-plan would
    // snap back to the stair head and send us up again. Finish the flight first.
    if (h.path && nav.stairAt?.(h.position)) return true;
    h.goal = toVec3(target);
    const path = nav.findPath(h.position, h.goal);
    if (!path || !path.length) {
      h.path = null;
      return false;
    }
    h.path = path;
    h.pathIndex = resumeIndex(h.position, path);
    // The watchdog window is deliberately NOT reset here: a hostage that
    // re-plans every half second while wedged must still be detected.
    return true;
  }

  _followPath(h, dt, speed) {
    const path = h.path;
    if (!path || h.pathIndex >= path.length) {
      h.path = null;
      h.velocity.x = 0;
      h.velocity.z = 0;
      return;
    }
    let wp = path[h.pathIndex];
    // Doorway waypoints have to be hit tightly or the corner-cut clips a jamb.
    const arrive = Math.abs(wp.y - h.position.y) > 0.6 ? 0.5
      : this.game.nav?.doorIdAt?.(wp) ? 0.24 : 0.34;
    if (Math.hypot(wp.x - h.position.x, wp.z - h.position.z) < arrive) {
      h.pathIndex++;
      if (h.pathIndex >= path.length) {
        h.path = null;
        h.velocity.x = 0;
        h.velocity.z = 0;
        return;
      }
      wp = path[h.pathIndex];
    }

    this._openDoorsAhead(h, wp);
    h.climbY = this._climbTarget(h, wp);

    const dir = new THREE.Vector3(wp.x - h.position.x, 0, wp.z - h.position.z);
    if (dir.lengthSq() > 1e-6) dir.normalize();
    // Keep the pair from walking through each other.
    for (const other of this.hostages) {
      if (other === h || !other.alive || other.extracted) continue;
      const ox = h.position.x - other.position.x;
      const oz = h.position.z - other.position.z;
      const d2 = ox * ox + oz * oz;
      if (d2 > 0.55 || d2 < 1e-5) continue;
      const inv = 1 / Math.sqrt(d2);
      dir.x += ox * inv * 0.6;
      dir.z += oz * inv * 0.6;
    }
    if (dir.lengthSq() > 1e-6) dir.normalize();

    h.velocity.x = dir.x * speed;
    h.velocity.z = dir.z * speed;
    h.desiredYaw = Math.atan2(-dir.x, -dir.z);
  }

  /**
   * Height to ease toward while walking a flight, or null on open floor. The
   * traversal itself is `climbStep` in navgrid.js, which explains why a flight
   * cannot be walked with the capsule sweep.
   */
  _climbTarget(h, waypoint) {
    const nav = this.game.nav;
    if (!nav?.stairAt) return null;
    if (nav.stairAt(waypoint)) {
      return nav.stairAt(h.position, STAIR_ENTRY_PAD) ? waypoint.y : null;
    }
    // Also covers the step off the bottom tread: the capsule keeps overlapping
    // that tread for its own radius past the last step, and the sweep reads the
    // overlap as deep penetration.
    return nav.stairAt(h.position, STAIR_SWEEP_PAD) ? waypoint.y : null;
  }

  /** A hostage opens the door in front of them rather than clipping through. */
  _openDoorsAhead(h, waypoint) {
    const nav = this.game.nav;
    const doors = this.game.doors;
    if (!nav?.doorIdAt || !doors?.get) return;
    const id = nav.doorIdAt(waypoint) || nav.doorIdAt(h.position);
    if (!id) return;
    const door = doors.get(id);
    if (!door || door.isPassable) return;
    if (Math.hypot(door.spec.x - h.position.x, door.spec.z - h.position.z) > 1.9) return;
    const last = this._doorCooldown.get(id) ?? -99;
    if (this.time - last < 1.2) return;
    this._doorCooldown.set(id, this.time);
    // Civilians have no badge, so a secured door stays shut for them.
    door.use(false, this.game.engine?.simTime || this.time, false);
    nav.invalidate?.();
  }

  _integrate(h, dt) {
    const turnRate = h.mobile ? 6.0 : 3.0;
    h.yaw = turnToward(h.yaw, h.desiredYaw, turnRate * dt);

    if (!h.path) {
      h.velocity.x *= Math.max(0, 1 - 12 * dt);
      h.velocity.z *= Math.max(0, 1 - 12 * dt);
    }

    // Consumed once per step, so anything that stops following a path drops
    // straight back to the swept move.
    const climbY = h.climbY;
    h.climbY = null;
    if (climbY !== null && climbY !== undefined) {
      h.speed = climbStep(h, dt, climbY) / Math.max(1e-5, dt);
      return;
    }
    // Halted on a flight: the sweep would eject them clear of the staircase,
    // because a capsule on a tread reads as deeply inside the treads above it.
    if (this.game.nav?.stairAt?.(h.position, STAIR_SWEEP_PAD)) {
      h.velocity.x = 0;
      h.velocity.z = 0;
      h.velocity.y = 0;
      h.speed = 0;
      h.grounded = true;
      h.hitWall = false;
      return;
    }

    h.velocity.y -= GRAVITY * dt;
    if (h.velocity.y < -28) h.velocity.y = -28;

    const collision = this.game.collision;
    if (!collision?.moveCapsule) return;
    const before = h.position.clone();
    const res = collision.moveCapsule(h.position, h.velocity, dt, {
      radius: AGENT_RADIUS,
      height: h.crouched ? AGENT_HEIGHT * CROUCH_SCALE : AGENT_HEIGHT,
      stepHeight: 0.34,
      ignore: (c) => (c.tag || '').startsWith('character'),
    });
    // moveCapsule resolves into a fresh vector rather than in place.
    if (res.position) h.position.copy(res.position);
    h.grounded = res.grounded;
    h.hitWall = res.hitWall;
    h.speed = before.distanceTo(h.position) / Math.max(1e-5, dt);

    if (h.position.y < -6) {
      const snap = this.game.nav?.nearestWalkable?.(h.homePos, 6) || h.homePos;
      h.position.copy(snap);
      h.velocity.set(0, 0, 0);
    }
  }

  /**
   * Same watchdog the hostiles use: no progress for 2.5 s with a live path is a
   * re-plan, three failures is a snap to the nearest walkable cell.
   */
  _watchdog(h, dt) {
    if (!h.path) {
      h.stuckTimer = 0;
      h.wallTimer = 0;
      h._watchPos.copy(h.position);
      return;
    }

    // Fast recovery for the common case: shoulder against a door jamb after
    // cutting a corner. Re-planning from where they actually are fixes it long
    // before the 2.5 s watchdog would.
    if (h.hitWall && h.speed < 0.6) {
      h.wallTimer = (h.wallTimer || 0) + dt;
      if (h.wallTimer > 0.4) {
        h.wallTimer = 0;
        const goal = h.goal;
        h.path = null;
        if (goal) this._setGoal(h, goal);
        return;
      }
    } else {
      h.wallTimer = 0;
    }

    h.stuckTimer += dt;
    if (h.stuckTimer < STUCK_WINDOW) return;
    const moved = h._watchPos.distanceTo(h.position);
    h.stuckTimer = 0;
    h._watchPos.copy(h.position);
    if (moved >= STUCK_DISTANCE) {
      h.stuckFails = 0;
      return;
    }
    h.stuckFails++;
    if (h.stuckFails < STUCK_LIMIT) {
      const goal = h.goal;
      h.path = null;
      this.game.nav?.invalidate?.();
      if (goal && !this._setGoal(h, goal)) {
        const detour = this.game.nav?.randomPointNear?.(h.position, 3, h.rng);
        if (detour) this._setGoal(h, detour);
      }
      return;
    }
    const snap = this.game.nav?.nearestWalkable?.(h.position, 6);
    if (snap) {
      h.position.copy(snap);
      this.game.collision?.resolveOverlap?.(h.position, AGENT_RADIUS, AGENT_HEIGHT);
    }
    h.velocity.set(0, 0, 0);
    h.stuckFails = 0;
    h.path = null;
  }

  /**
   * Last-resort escort recovery: a hostage that is more than 14 m behind with
   * no usable route is placed next to the player. Better a small teleport than
   * a mission that cannot be completed.
   */
  _teleportGuard(h, dt, distance) {
    if (distance <= TELEPORT_DISTANCE || h.path) {
      if (h.path) h.noPathTimer = 0;
      return false;
    }
    if (h.noPathTimer < TELEPORT_GRACE) return false;
    const player = this.game.player;
    const nav = this.game.nav;
    if (!player) return false;
    const behind = this._followSlot(h);
    const spot = nav?.nearestWalkable?.(behind, 3) || behind;
    h.position.copy(spot);
    h.velocity.set(0, 0, 0);
    h.path = null;
    h.noPathTimer = 0;
    h.stuckFails = 0;
    this.game.collision?.resolveOverlap?.(h.position, AGENT_RADIUS, AGENT_HEIGHT);
    return true;
  }

  _faceTowards(h, point) {
    const dx = point.x - h.position.x;
    const dz = point.z - h.position.z;
    if (dx * dx + dz * dz < 1e-5) return;
    h.desiredYaw = Math.atan2(-dx, -dz);
  }

  /** First sighting marks them on the HUD even without the intel terminal. */
  _noticePlayer(h) {
    if (h.revealed) return;
    const player = this.game.player;
    if (!player) return;
    if (h.position.distanceTo(player.position) > 12) return;
    const eye = player.eyePosition || player.position;
    const chest = new THREE.Vector3(h.position.x, h.position.y + 1.2, h.position.z);
    if (this.game.collision?.lineOfSight?.(eye, chest) === false) return;
    h.revealed = true;
    h.seenByPlayer = true;
  }

  // ---------------------------------------------------------------- commands

  /** bound|securing -> secured. Safe to call from QA or a script. */
  secure(hostage) {
    const h = this._resolve(hostage);
    if (!h || !h.alive || h.secured) return false;
    h.secureProgress = 1;
    h.crouched = false;
    h.fear = Math.min(h.fear, 0.5);
    h.securedAt = this.time;
    h.revealed = true;
    h.model?.setSecured?.(true);
    this._transition(h, HOSTAGE_STATE.SECURED);
    return true;
  }

  /** Player toggle: "on me" / "hold here". */
  toggleFollow(hostage) {
    const h = this._resolve(hostage);
    if (!h || !h.alive) return null;
    if (h.state === HOSTAGE_STATE.EXTRACTING || h.state === HOSTAGE_STATE.EXTRACTED) return h.state;
    if (h.state === HOSTAGE_STATE.FOLLOWING) {
      h.following = false;
      h.path = null;
      // Anchor the hold to where she is standing when the order is given, and
      // drop any cover slot chosen while she was escorting.
      h.holdAnchor = h.position.clone();
      h.coverPos = null;
      h.coverTimer = 0;
      this._transition(h, HOSTAGE_STATE.WAITING);
    } else if (h.secured) {
      h.following = true;
      h.path = null;
      h.holdAnchor = null;
      this._transition(h, HOSTAGE_STATE.FOLLOWING);
    }
    return h.state;
  }

  /** Director hook: the bay is open, make for the vehicle. */
  beginExtraction() {
    if (this.extractionCalled) return false;
    this.extractionCalled = true;
    for (const h of this.hostages) {
      if (!h.alive || !h.secured || h.extracted) continue;
      h.path = null;
      h.coverPos = null;
      this._transition(h, HOSTAGE_STATE.EXTRACTING);
    }
    return true;
  }

  /** Director hook: extraction finished, take them off the board. */
  markExtracted() {
    let n = 0;
    for (const h of this.hostages) {
      if (!h.alive || h.state === HOSTAGE_STATE.EXTRACTED) continue;
      h.extracted = true;
      h.path = null;
      h.velocity.set(0, 0, 0);
      if (h.group) h.group.visible = false;
      this._transition(h, HOSTAGE_STATE.EXTRACTED);
      n++;
    }
    return n;
  }

  /** Director hook for `revealIntel()`. */
  reveal() {
    this.intelRevealed = true;
    for (const h of this.hostages) h.revealed = true;
    return this.hostages.length;
  }

  /** How many living hostages are standing in the extraction volume. */
  countInExtraction() {
    let n = 0;
    for (const h of this.hostages) {
      if (!h.alive) continue;
      if (h.state === HOSTAGE_STATE.EXTRACTED || insideExtraction(h.position)) n++;
    }
    return n;
  }

  onDeath(h, info = {}) {
    this.lost++;
    this.game.effects?.bloodSpray?.(
      new THREE.Vector3(h.position.x, h.position.y + 1.1, h.position.z),
      new THREE.Vector3(0, 1, 0), { damage: 30 }
    );
    this.game.director?.onHostageLost?.(h, info);
  }

  _resolve(hostage) {
    if (!hostage) return null;
    if (typeof hostage === 'string') return this.hostages.find((h) => h.id === hostage) || null;
    return hostage;
  }

  _transition(h, next, extra = {}) {
    if (h.state === next) return;
    h.prevState = h.state;
    h.state = next;
    h.stateTime = 0;
    bus.emit(EVT.HOSTAGE_STATE, {
      hostage: h,
      id: h.id,
      name: h.name,
      variant: h.variant,
      state: next,
      previous: h.prevState,
      position: h.position.toArray(),
      room: h.room?.id || null,
      ...extra,
    });
  }

  // ----------------------------------------------------------- interaction --

  /**
   * The thing under the crosshair. Bound hostages give a hold-to-free action
   * with a progress value the HUD draws as an arc; freed ones give the
   * follow/hold toggle.
   */
  findInteractable(eye, dir) {
    if (!eye || !dir) return null;
    const eyeV = toVec3(eye);
    const dirV = toVec3(dir);
    let best = null;
    for (const h of this.hostages) {
      if (!h.alive || h.extracted) continue;
      if (h.state === HOSTAGE_STATE.EXTRACTING) continue;
      const chest = new THREE.Vector3(h.position.x, h.position.y + (h.crouched ? 0.85 : 1.2), h.position.z);
      const to = chest.clone().sub(eyeV);
      const dist = to.length();
      const reach = h.secured ? 2.6 : 2.2;
      if (dist > reach) continue;
      const dot = to.normalize().dot(dirV);
      if (dot < 0.72 && dist > 1.1) continue;
      const score = dist * (1.7 - dot);
      if (best && score >= best.score) continue;

      if (!h.secured) {
        best = {
          kind: 'hostage',
          action: 'secure',
          id: h.id,
          hostageId: h.id,
          distance: dist,
          score,
          label: `FREE ${shortName(h.name).toUpperCase()}`,
          key: 'E',
          hold: true,
          holdDuration: SECURE_HOLD,
          duration: SECURE_HOLD,
          progress: h.secureProgress,
          holdProgress: h.secureProgress,
          activate: (game) => {
            // No input layer to hold (tests, QA): free them outright.
            if (typeof game?.input?.isDown !== 'function') this.secure(h);
          },
        };
      } else {
        const following = h.state === HOSTAGE_STATE.FOLLOWING;
        best = {
          kind: 'hostage',
          action: 'order',
          id: h.id,
          hostageId: h.id,
          distance: dist,
          score,
          label: following ? `${shortName(h.name).toUpperCase()} — HOLD HERE` : `${shortName(h.name).toUpperCase()} — ON ME`,
          key: 'E',
          hold: false,
          holdDuration: 0,
          progress: 0,
          activate: () => this.toggleFollow(h),
        };
      }
    }
    return best;
  }

  /** Mirrors PropPopulator's shape so the HUD can list nearby prompts. */
  interactablesNear(pos, radius = 4) {
    const p = toVec3(pos);
    const out = [];
    for (const h of this.hostages) {
      if (!h.alive || h.extracted) continue;
      const dist = h.position.distanceTo(p);
      if (dist > radius) continue;
      out.push({
        id: h.id,
        kind: 'hostage',
        label: h.secured ? `${shortName(h.name)} — escort` : `Free ${shortName(h.name)}`,
        position: h.position.toArray(),
        distance: +dist.toFixed(2),
      });
    }
    out.sort((a, b) => a.distance - b.distance);
    return out;
  }

  // -------------------------------------------------------------- hitboxes --

  _updateRegions(h) {
    const scale = h.alive ? (h.crouched ? CROUCH_SCALE : 1) : 0.24;
    const s = Math.sin(h.yaw);
    const c = Math.cos(h.yaw);
    const rx = -c;
    const rz = s;
    for (const r of h.hitRegions) {
      const lay = r.layout;
      r.center.set(
        h.position.x + rx * lay.side,
        h.position.y + lay.y * scale,
        h.position.z + rz * lay.side
      );
      r.size.set(lay.sx, lay.sy * scale, lay.sz);
      r.halfExtents.set(lay.sx * 0.5, lay.sy * scale * 0.5, lay.sz * 0.5);
    }
    h.eyeHeight = EYE_HEIGHT * scale;
  }

  // ---------------------------------------------------------------- visuals --

  updateVisual(dt) {
    const camera = this.game.camera;
    for (const h of this.hostages) {
      const group = h.group;
      if (!group) continue;
      group.position.copy(h.position);
      group.rotation.y = h.yaw;
      if (camera && group.visible) h.model?.updateLOD?.(camera.position, 1);

      const animator = h.animator;
      if (!animator) continue;
      if (!h.alive) {
        if ((h.deathTimer || 0) > 1.35) animator.breathe = false;
        animator.update(dt, { speed: 0, aiming: false, crouched: false });
        continue;
      }
      const clip = this._clipFor(h);
      if (clip) animator.play(clip, { fade: 0.2 });
      animator.update(dt, { speed: h.speed, aiming: false, crouched: h.crouched });
    }
  }

  _clipFor(h) {
    if (h.speed > 0.35) {
      return h.state === HOSTAGE_STATE.EXTRACTING ? 'hostage_extract' : 'hostage_follow';
    }
    switch (h.state) {
      case HOSTAGE_STATE.BOUND: return h.fear > 0.55 ? 'hostage_fear' : 'hostage_idle';
      case HOSTAGE_STATE.SECURING: return 'hostage_fear';
      case HOSTAGE_STATE.EXTRACTED: return 'hostage_stop';
      default: return h.crouched ? 'hostage_crouch' : 'hostage_stop';
    }
  }

  // ------------------------------------------------------------------ state --

  toJSON(playerPos) {
    const p = playerPos ? toVec3(playerPos) : null;
    const list = this.hostages.map((h) => ({
      id: h.id,
      name: h.name,
      variant: h.variant,
      state: h.state,
      alive: h.alive,
      secured: h.secured,
      following: h.state === HOSTAGE_STATE.FOLLOWING,
      extracted: h.state === HOSTAGE_STATE.EXTRACTED,
      revealed: h.revealed,
      health: Math.max(0, Math.round(h.health)),
      position: [+h.position.x.toFixed(2), +h.position.y.toFixed(2), +h.position.z.toFixed(2)],
      room: h.room?.id || null,
      fear: +h.fear.toFixed(2),
      secureProgress: +h.secureProgress.toFixed(2),
      inExtraction: h.state === HOSTAGE_STATE.EXTRACTED || insideExtraction(h.position),
      hasPath: !!h.path,
      ...(p ? { distance: +p.distanceTo(h.position).toFixed(2) } : {}),
    }));
    return {
      count: this.hostages.length,
      secured: this.securedCount,
      extracted: this.extractedCount,
      lost: this.lostCount,
      inExtraction: this.countInExtraction(),
      extractionCalled: this.extractionCalled,
      intelRevealed: this.intelRevealed,
      list,
    };
  }
}

// ------------------------------------------------------------------ helpers --

/** Is a point inside the extraction volume from `layout.js`? */
export function insideExtraction(pos) {
  const c = EXTRACTION.center;
  const s = EXTRACTION.size;
  return Math.abs(pos.x - c[0]) <= s[0] / 2
    && Math.abs(pos.z - c[2]) <= s[2] / 2
    && pos.y >= c[1] - 1.2 && pos.y <= c[1] + s[1];
}

/**
 * Civilian hit boxes: axis-aligned world boxes rebuilt on the fixed step, the
 * same contract `CombatSystem` reads from the hostiles.
 */
function makeRegions() {
  const layout = [
    { name: 'head', side: 0, y: 1.56, sx: 0.23, sy: 0.25, sz: 0.25, mult: 4.0 },
    { name: 'chest', side: 0, y: 1.22, sx: 0.42, sy: 0.38, sz: 0.28, mult: 1.0 },
    { name: 'stomach', side: 0, y: 0.93, sx: 0.35, sy: 0.27, sz: 0.25, mult: 1.25 },
    { name: 'leg_l', side: -0.12, y: 0.45, sx: 0.2, sy: 0.9, sz: 0.22, mult: 0.75 },
    { name: 'leg_r', side: 0.12, y: 0.45, sx: 0.2, sy: 0.9, sz: 0.22, mult: 0.75 },
  ];
  return layout.map((l) => ({
    name: l.name,
    layout: l,
    center: new THREE.Vector3(),
    size: new THREE.Vector3(l.sx, l.sy, l.sz),
    halfExtents: new THREE.Vector3(l.sx / 2, l.sy / 2, l.sz / 2),
    damageMultiplier: l.mult,
  }));
}

function toVec3(v) {
  if (!v) return new THREE.Vector3();
  if (v.isVector3) return v.clone();
  if (Array.isArray(v)) return new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0);
  return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
}

function turnToward(current, target, maxStep) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}


function shortName(name) {
  const parts = String(name || '').replace(/^Dr\.\s*/i, '').trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : (parts[0] || 'Hostage');
}

export default HostageManager;
