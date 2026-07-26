// Enemy AI (Opus 3 domain).
//
// Perception (vision cone + LOS + hearing), suspicion, patrol, investigation, cover-based combat
// with a peek/tuck rhythm and bounded coordinated pressure, information propagation between
// hostiles, corpse discovery, methodical search, grenade reactions, door tactics, navigation
// recovery. Kinematic movement through the collision world.
//
// Performance contract (see docs/reports/wp-008.md NS-7/NS-8 and docs/reports/wp-015.md):
//   * At most two world raycasts per hostile per simulation step. `_rayGate()` counts them against
//     the mission clock — so rays spent inside noise/shout dispatch, which arrives from another
//     hostile's update, are inside the budget too — and every optional ray is skipped once spent.
//   * `mission.findPath` is only ever called when `repathT` has expired — the backoff has the last
//     word — and short tactical repositions steer directly instead of asking for a route at all.
//   * Nothing scales with the navigation graph. Cover comes from the bake-time map in ./cover.js,
//     squad tokens from ./squad.js which walks only the mission's own hostile list.
import * as THREE from 'three';
import { moveCharacter } from '../core/collide.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { CharacterRig } from '../characters/humanoid.js';
import { fireHitscan } from '../weapons/ballistics.js';
import { WEAPONS } from '../weapons/defs.js';
import { aiTuning } from '../game/difficulty.js';
import { coordinate, registerEnemy, unregisterEnemy } from './squad.js';

const TYPES = {
  scout:   { hp: 70, speed: 3.3, weapon: 'boreal-k5', acc: 0.85, burst: [3, 6], damage: 8, range: 16 },
  trooper: { hp: 110, speed: 2.9, weapon: 'halcyon-hc4', acc: 1.0, burst: [2, 4], damage: 11, range: 13 },
  heavy:   { hp: 170, speed: 2.35, weapon: 'vanta-s12', acc: 0.9, burst: [1, 1], damage: 7, range: 6.5 },
};

const RADIUS = 0.34;
const HEIGHT = 1.76;
const EYE = 1.6;
const EYE_LOW = 1.14;          // eye height while tucked down behind cover
const COVER_ARRIVE = 0.6;      // within this of the cover point counts as "in position"
const RAY_BUDGET = 2;

let nextId = 1;

export class Enemy {
  constructor(mission, spec, diff) {
    this.mission = mission;
    this.id = spec.id || 'enemy-' + nextId++;
    this.type = spec.type;
    this.conf = TYPES[spec.type] || TYPES.trooper;
    this.diff = diff;
    this.ai = aiTuning(diff);
    this.pos = new THREE.Vector3(spec.pos[0], spec.pos[1], spec.pos[2]);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.hp = this.conf.hp * diff.enemyHealth;
    this.alive = true;
    this.state = spec.patrol && spec.patrol.length > 1 ? 'patrol' : 'guard';
    this.patrol = spec.patrol || [spec.pos];
    this.patrolIdx = 0;
    this.homeRoom = spec.room;
    this.suspicion = 0;
    this.lastKnown = null;
    this.losTimer = 0;         // time since last LOS on player
    this.lostT = 0;            // time without contact that counts towards giving up
    this.hunting = false;      // pushing to the last known position, cover suspended
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.pathGapT = 0;         // hard floor under the re-path interval, see _steerPath
    this.waitT = 0;
    this.burstLeft = 0;
    this.fireCooldown = 0;
    this.aimDelay = 0;
    this.mag = WEAPONS[this.conf.weapon].magSize;
    this.reloadT = 0;
    this.searchT = 0;
    this.searchQueue = [];
    this.searchCover = [];         // parallel to searchQueue: did this spot come from the cover map
    this.searchPause = 0;
    this.searchAnchor = this.pos.clone();   // last place it made real ground, for the watchdog
    this.searchStallT = 0;
    this.investT = 0;              // budget for the current investigation, see the watchdog
    this.investAnchor = this.pos.clone();
    this.investStallT = 0;
    this.investFor = null;         // the target the budget was opened for
    this.crouchCheckT = 0;
    this.flashT = 0;
    this.stumbleT = 0;
    this.stumbleDir = new THREE.Vector3();
    this.stuckT = 0;
    this.lastPos = this.pos.clone();
    this.strafeDir = 0;
    this.strafeT = 0;
    this.frozen = false;
    this.guardYaw = THREE.MathUtils.degToRad(spec.yawDeg ?? 0);
    this.scanPhase = mission.rng.next() * 6;

    // --- tactical state -----------------------------------------------------
    this.role = 'push';        // 'push' | 'hold', assigned by ./squad.js
    this.flankBearing = null;
    this.holdT = 0;
    this.cover = -1;           // index into mission.nav.cover, -1 = fighting in the open
    this.coverPos = new THREE.Vector3();
    this.coverPeek = new THREE.Vector3();
    this.coverFull = false;
    this.coverT = 0;           // cooldown before the cover choice is revisited
    this.inCover = false;
    this.tucked = false;
    this.peekT = 0;
    this.peeking = true;
    this.suppress = 0;         // 0..1, near misses and hits
    this.selfFireT = 0;
    this.wary = 0;             // alert-posture countdown after a search
    this.knownBodies = new Set();
    this.bodyCheckT = mission.rng.next() * 0.5;
    this.glanceT = 0;
    this.glanceAt = null;
    this.doorScanT = 0;
    this.doorPauseT = 0;
    this.pendingDoor = null;
    this.entryT = 0;
    this.openedDoors = [];
    this.doorCloseT = 1 + mission.rng.next() * 2;
    this.rays = 0;
    this._rayT = -1;
    this.told = false;
    this.shoutT = 0;
    this._coverBuf = [];
    this._vTarget = new THREE.Vector3();   // combat target, valid for one step
    this._vMove = new THREE.Vector3();     // movement request built by _fightPlan
    this._vSteer = new THREE.Vector3();    // steering direction
    this._vA = new THREE.Vector3();        // cover / body scratch
    this._vB = new THREE.Vector3();
    this._rayD = new THREE.Vector3();

    this.rig = new CharacterRig(spec.type);
    this.rig.attachWeapon(this.conf.weapon);
    this.rig.group.position.copy(this.pos);
    mission.entGroup.add(this.rig.group);

    this.collider = mission.world.add({
      min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 },
      material: 'flesh', tag: 'enemy', dynamic: true, ref: this,
      blockSight: false, blockShot: false,
    });
    this._syncCollider();
    registerEnemy(this);
  }

  capsule() {
    return { x: this.pos.x, z: this.pos.z, y0: this.pos.y, y1: this.pos.y + HEIGHT, r: RADIUS + 0.03 };
  }

  get eyeHeight() { return this.tucked || this.crouchCheckT > 0 ? EYE_LOW : EYE; }

  eye(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z); }

  _syncCollider() {
    if (!this.alive) return;
    this.mission.world.updateBounds(this.collider,
      { x: this.pos.x - RADIUS, y: this.pos.y, z: this.pos.z - RADIUS },
      { x: this.pos.x + RADIUS, y: this.pos.y + HEIGHT, z: this.pos.z + RADIUS });
  }

  damage(amount, fromPos, region, shooter) {
    if (!this.alive) return;
    this.hp -= amount;
    this.rig.flinch();
    bus.emit('enemy-hit', { id: this.id, region, damage: amount });
    if (this.hp <= 0) {
      this.alive = false;
      this.rig.die();
      this.mission.world.remove(this.collider);
      unregisterEnemy(this);
      audio.voice('hostileAlert', this.pos);
      bus.emit('enemy-killed', { id: this.id, pos: this.pos.clone(), region });
      return;
    }
    // Taking fire both reveals the shooter and pins the target down.
    this.suppress = Math.min(1, this.suppress + 0.55 * this.ai.suppressGain);
    if (fromPos) {
      this.lastKnown = new THREE.Vector3(fromPos.x, fromPos.y - 1.2, fromPos.z);
      this._enterCombat(true);
    }
  }

  /** A round landed close by without hitting: duck, shoot less, prefer deeper cover. */
  onNearMiss(point) {
    if (!this.alive || this.frozen || this.mission.aiFrozen) return;
    this.suppress = Math.min(1, this.suppress + 0.3 * this.ai.suppressGain);
    if (this.state !== 'combat' && this.suspicion < 0.9) {
      this.suspicion = Math.min(1, this.suspicion + 0.35);
      if (!this.lastKnown) this.lastKnown = new THREE.Vector3(point.x, this.pos.y, point.z);
    }
  }

  applyFlash(strength) {
    if (!this.alive) return;
    this.flashT = Math.max(this.flashT, strength * 3.4);
    // stumble away from the burst rather than standing there blinking
    const p = this.mission.vfx?.flashLight?.position;
    if (p) {
      this.stumbleDir.set(this.pos.x - p.x, 0, this.pos.z - p.z);
      if (this.stumbleDir.lengthSq() < 0.01) this.stumbleDir.set(1, 0, 0);
      this.stumbleDir.normalize();
      this.stumbleT = 0.55 + strength * 0.35;
    }
    bus.emit('enemy-flashed', { id: this.id });
  }

  // ---------------------------------------------------------------------------
  hearNoise(noise) {
    if (!this.alive || this.frozen || this.flashT > 0) return;
    if (noise.type === 'shout') { this._hearShout(noise); return; }
    const d = this.pos.distanceTo(noise.pos);
    // Walls muffle: check sight-blocking geometry between. With the step's rays already spent,
    // assume muffled — the cheap answer is the conservative one.
    const blocked = !this._rayGate()
      || !this._clearSight(this.eye(this._vA), this._vB.set(noise.pos.x, (noise.pos.y ?? this.pos.y) + 1.2, noise.pos.z));
    const effective = noise.radius * this.diff.hearingRadius * (blocked ? 0.55 : 1);
    if (d > effective) return;
    const loud = noise.type === 'gunshot' || noise.type === 'glass' || noise.type === 'flash';
    const p = new THREE.Vector3(noise.pos.x, noise.pos.y ?? this.pos.y, noise.pos.z);
    if (this.state === 'combat') {
      if (loud) this.lastKnown = p;
      // A smoke cloud landing on the firefight ruins the angle: take a different one.
      if (noise.type === 'smoke' && d < 9) { this.cover = -1; this.coverT = 0; }
      return;
    }
    if (noise.type === 'smoke' && !loud) return;
    this.suspicion = Math.min(1, this.suspicion + (loud ? 0.65 : 0.3) * (this.wary > 0 ? this.ai.waryAlertness : 1));
    if (loud || this.suspicion > 0.4) {
      this.investigatePos = p;
      if (this.state !== 'investigate' || loud) {
        this.state = 'investigate';
        this.repathT = 0;      // a fresh alert may ask for a route immediately
        this.waitT = (0.2 + this.mission.rng.next() * 0.8) * this.diff.enemyReaction;
        if (loud) audio.voice('hostileAlert', this.pos);
      }
    }
  }

  /**
   * An ally called out a contact. Reaches us within `radius` if we can see the caller or share a
   * room with them; the position is only handed over on the difficulties that pass it on.
   */
  _hearShout(noise) {
    if (noise.from === this.id || !this.mission.active) return;
    const d = this.pos.distanceTo(noise.pos);
    if (d > noise.radius) return;
    const sameRoom = !!noise.room && noise.room === this.homeRoom;
    if (!sameRoom) {
      // Out of rays for this step: fall back to shouting distance instead of line of sight, so
      // information still travels but only to the allies who are genuinely close.
      const heard = this._rayGate()
        ? this._clearSight(this.eye(this._vA), this._vB.set(noise.pos.x, noise.pos.y + 1.2, noise.pos.z))
        : d < noise.radius * 0.6;
      if (!heard) return;
    }
    // A body is news, not a contact: it tells allies where to look, never where to shoot.
    if (noise.kind === 'body') {
      if (this.state === 'combat' || this.knownBodies.has(noise.body)) return;
      this.knownBodies.add(noise.body);
      this.suspicion = Math.min(1, this.suspicion + 0.7);
      this.wary = Math.max(this.wary, this.ai.warySec);
      this.investigatePos = new THREE.Vector3(noise.pos.x, noise.pos.y, noise.pos.z);
      if (this.state !== 'investigate') {
        this.state = 'investigate';
        this.repathT = 0;
        this.waitT = (0.3 + this.mission.rng.next() * 0.6) * this.diff.enemyReaction;
      }
      return;
    }
    if (this.state === 'combat') {
      if (noise.lastKnown) this.lastKnown = new THREE.Vector3(noise.lastKnown.x, noise.lastKnown.y, noise.lastKnown.z);
      return;
    }
    if (noise.lastKnown) {
      this.lastKnown = new THREE.Vector3(noise.lastKnown.x, noise.lastKnown.y, noise.lastKnown.z);
      this.told = true;
      this.suspicion = 1;
      this._enterCombat(false);
      audio.voice('hostileAlert', this.pos);
      // Being told is not the same as seeing: the hand-off costs an extra beat on target.
      this.aimDelay += 0.35 * this.diff.enemyReaction;
      if ((noise.hops || 0) < this.ai.shoutHops) this._shout(noise.hops || 0);
    } else {
      // No position shared — go and look where the shout came from.
      this.suspicion = Math.min(1, this.suspicion + 0.6);
      this.investigatePos = new THREE.Vector3(noise.pos.x, noise.pos.y, noise.pos.z);
      if (this.state !== 'investigate') {
        this.state = 'investigate';
        this.repathT = 0;
        this.waitT = (0.25 + this.mission.rng.next() * 0.5) * this.diff.enemyReaction;
      }
    }
  }

  /**
   * Calls the contact out to nearby allies. Routed through the mission's own noise dispatch so no
   * extra wiring is needed; the hop count bounds the cascade and the cooldown bounds the rate.
   */
  _shout(hops = 0, kind = 'contact', bodyId = null) {
    const ai = this.ai;
    if (this.shoutT > 0) return;
    this.shoutT = 2.5;
    if (this.mission.rng.next() > ai.shoutChance) return;
    bus.emit('noise', {
      pos: this.pos.clone(), radius: ai.shoutRadius, type: 'shout', source: 'enemy',
      from: this.id, room: this.homeRoom, hops: hops + 1, kind, body: bodyId,
      lastKnown: kind === 'contact' && ai.shoutPos && this.lastKnown ? this.lastKnown.clone() : null,
    });
  }

  // ---------------------------------------------------------------------------
  /**
   * True while this hostile still has raycasts left in the current simulation step.
   *
   * The budget rolls over on the mission clock rather than at the top of `update`, because noise
   * and shout dispatch reach a hostile from *another* hostile's update — a counter reset in
   * `update` would let those rays escape the budget entirely (they did: worst case was 3).
   */
  _rayGate() {
    if (this.mission.timer !== this._rayT) { this._rayT = this.mission.timer; this.rays = 0; }
    return this.rays < RAY_BUDGET;
  }

  _clearSight(from, to) {
    this._rayGate();
    this.rays++;
    const d = this._rayD;
    d.subVectors(to, from);
    const dist = d.length();
    if (dist < 0.01) return true;
    d.normalize();
    const hit = this.mission.world.raycast(from.x, from.y, from.z, d.x, d.y, d.z, dist,
      (c) => c.blockSight && c.tag !== 'enemy');
    return !hit;
  }

  _seePlayer() {
    const player = this.mission.player;
    if (!player.alive) return 0;
    // Noise or shout dispatch can arrive before this hostile's own update and spend the step's
    // rays. Skipping perception for one 1/120 s step is invisible; going over budget is not.
    if (!this._rayGate()) return 0;
    const eye = this.eye();
    const pEye = new THREE.Vector3(player.pos.x, player.eyeY - 0.1, player.pos.z);
    const to = new THREE.Vector3().subVectors(pEye, eye);
    const dist = to.length();
    const range = 26 * this.diff.visionRange;
    if (dist > range) return 0;
    to.normalize();
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const dot = fwd.dot(new THREE.Vector3(to.x, 0, to.z).normalize());
    const fovCos = Math.cos(THREE.MathUtils.degToRad(this.wary > 0 ? 66 : 60));
    if (dot < fovCos && dist > 1.6) return 0;
    if (this.mission.vfx.isSmoked(eye, pEye)) return 0;
    if (!this._clearSight(eye, pEye)) {
      // also try chest (the player peeking over low cover), budget permitting
      if (!this._rayGate()) return 0;
      const chest = new THREE.Vector3(player.pos.x, player.pos.y + 0.9, player.pos.z);
      if (!this._clearSight(eye, chest)) return 0;
    }
    let exposure = THREE.MathUtils.clamp(1.35 - dist / range, 0.12, 1);
    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    if (hSpeed > 2.4) exposure *= 1.5;
    else if (player.crouched && hSpeed < 0.6) exposure *= 0.55;
    if (dist < 5) exposure = Math.max(exposure, 1.4);
    if (this.wary > 0) exposure *= this.ai.waryAlertness;
    return exposure;
  }

  _enterCombat(shout = true) {
    if (this.state === 'combat' || !this.alive) return;
    this.state = 'combat';
    this.suspicion = 1;
    const fuse = this.wary > 0 ? 0.7 : 1;
    this.aimDelay = (0.28 * this.diff.enemyReaction + this.mission.rng.next() * 0.25) * fuse;
    this.repathT = 0;          // engagement cannot wait on the backoff
    this.strafeT = 0;
    this.lostT = 0;
    this.hunting = false;
    this.cover = -1;
    this.coverT = 0;
    this.peeking = true;
    this.peekT = 0;
    this.searchQueue.length = 0;
    this.searchCover.length = 0;
    if (shout) {
      audio.voice('hostileCombat', this.pos);
      this._shout(0);
    }
    bus.emit('enemy-alerted', { id: this.id, pos: this.lastKnown ? this.lastKnown.clone() : this.pos.clone() });
  }

  // ---------------------------------------------------------------------------
  update(dt) {
    if (!this.alive) { this.rig.update(dt, 0); return; }
    if (this.frozen) { this.rig.update(dt, 0); return; }
    const rng = this.mission.rng;
    const player = this.mission.player;
    this._rayGate();
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.selfFireT = Math.max(0, this.selfFireT - dt);
    this.repathT -= dt;
    this.pathGapT -= dt;
    this.coverT -= dt;
    this.holdT -= dt;
    this.entryT = Math.max(0, this.entryT - dt);
    this.crouchCheckT = Math.max(0, this.crouchCheckT - dt);
    this.wary = Math.max(0, this.wary - dt);
    this.shoutT = Math.max(0, this.shoutT - dt);
    this.suppress = Math.max(0, this.suppress - dt * 0.42);
    this.stumbleT = Math.max(0, this.stumbleT - dt);
    // Reloads finish wherever the hostile happens to be, including outside combat: a magazine
    // that only refills while a fight is on leaves a hostile permanently unable to shoot.
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) { this.mag = WEAPONS[this.conf.weapon].magSize; audio.mech('magin', this.pos); }
    }

    // ---------- perception ----------
    // Bodies first. It runs at 2 Hz and perception runs at 120 Hz, so letting the corpse check take
    // the step's second ray on its own tick costs perception almost nothing — whereas the other
    // order starves it completely: whenever the player is out of sight, perception spends both rays
    // (eye, then the chest fallback) and a hostile would walk past its dead colleagues forever.
    this._checkBodies(dt);
    if (this.flashT <= 0) {
      const exposure = this._seePlayer();
      if (exposure > 0) {
        this.losTimer = 0;
        this.lastKnown = new THREE.Vector3(player.pos.x, player.pos.y, player.pos.z);
        const gain = (1.7 / Math.max(0.4, this.diff.enemyReaction * this.ai.suspicionFuse)) * exposure;
        this.suspicion = Math.min(1.2, this.suspicion + gain * dt);
        if (this.suspicion >= 1) this._enterCombat();
        else if (this.suspicion > 0.42 && this.state !== 'combat' && this.state !== 'investigate') {
          this.state = 'investigate';
          this.investigatePos = this.lastKnown.clone();
          this.repathT = 0;
          this.waitT = 0.15 * this.diff.enemyReaction;
        }
      } else {
        this.losTimer += dt;
        // Suspicion only cools off while going about the round. A hostile on its way to check
        // something out does not talk itself down before it gets there.
        if (this.state !== 'combat' && this.state !== 'investigate') {
          this.suspicion = Math.max(0, this.suspicion - dt * 0.16);
        }
      }
    } else {
      this.losTimer += dt;
    }

    this._checkDevices(dt, rng);
    if (this.state === 'combat') coordinate(this.mission);

    // ---------- state behaviors ----------
    let wantMove = null;
    let wantDirect = false;
    let runSpeed = this.conf.speed;
    let aiming = false;
    this.tucked = false;

    switch (this.state) {
      case 'guard': {
        this.scanPhase += dt * (this.wary > 0 ? 0.85 : 0.5);
        this.yaw = this.guardYaw + Math.sin(this.scanPhase) * (this.wary > 0 ? 1.0 : 0.7);
        break;
      }
      case 'patrol': {
        runSpeed = this.conf.speed * (this.wary > 0 ? 0.55 : 0.42);
        const wp = this.patrol[this.patrolIdx];
        const target = new THREE.Vector3(wp[0], wp[1], wp[2]);
        if (this.pos.distanceTo(target) < 0.6) {
          this.waitT = 1.2 + rng.next() * 2.4;
          this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
          this.repathT = 0;    // arriving at a waypoint may ask for the next leg immediately
          this.path = null;
          this.state = 'patrol-wait';
        } else {
          wantMove = target;
        }
        break;
      }
      case 'patrol-wait': {
        this.waitT -= dt;
        this.scanPhase += dt * (this.wary > 0 ? 0.8 : 0.4);
        this.yaw += Math.sin(this.scanPhase) * dt * (this.wary > 0 ? 1.1 : 0.5);
        if (this.waitT <= 0) this.state = 'patrol';
        break;
      }
      case 'investigate': {
        if (this.waitT > 0) { this.waitT -= dt; break; }
        runSpeed = this.conf.speed * (this.suspicion > 0.7 ? 0.9 : 0.55);
        const p = this.investigatePos || this.lastKnown;
        // Budget the trip. Several stimuli hand over a position no hostile capsule can reach — a
        // shout from the floor above, a body wedged behind a desk — and without a give-up the
        // hostile grinds against the geometry indefinitely instead of moving on to searching.
        if (!p || !this.investFor || this.investFor.distanceToSquared(p) > 0.25) {
          this.investFor = p ? p.clone() : null;
          this.investT = p ? Math.min(30, 7 + this.pos.distanceTo(p) * 1.4) : 0;
          this.investAnchor.copy(this.pos);
          this.investStallT = 0;
        }
        this.investT -= dt;
        if (this.pos.distanceToSquared(this.investAnchor) > 0.25) {
          this.investAnchor.copy(this.pos);
          this.investStallT = 0;
        } else this.investStallT += dt;
        const giveUp = this.investT <= 0 || this.investStallT > 3;
        if (!p || this.pos.distanceTo(p) < 1.2 || giveUp) {
          // Giving up searches from where it stands; arriving searches around the thing it came for.
          this._planSearch(giveUp ? this.pos : (p || this.pos));
          this.state = 'search';
        } else {
          wantMove = p;
        }
        break;
      }
      case 'search': {
        runSpeed = this.conf.speed * 0.6;
        this.searchT -= dt;
        if (this.searchPause > 0) {
          this.searchPause -= dt;
          this.scanPhase += dt * 2.1;
          this.yaw += Math.sin(this.scanPhase * 1.7) * dt * 1.7;
          break;
        }
        const spot = this.searchQueue[0];
        if (!spot) { this._endSearch(); break; }
        const toSpot = this.pos.distanceTo(spot);
        // Progress watchdog. A spot behind a desk or inside a wall is reachable on the graph but
        // not on the ground, and standing in front of it until the six-second timer expires is the
        // single most robotic thing a searcher can do. Measured on ground covered rather than on
        // distance to the spot, because routing around an obstacle legitimately moves away from it.
        if (this.pos.distanceToSquared(this.searchAnchor) > 0.25) {
          this.searchAnchor.copy(this.pos);
          this.searchStallT = 0;
        } else this.searchStallT += dt;
        if (toSpot < 1.15 || this.searchStallT > 2.2 || this.searchT <= 0) {
          // A spot it stalled out next to still counts as checked: it stops and looks over the
          // thing it could not quite get behind, which is what the stall usually means.
          const arrived = toSpot < 1.15 || (this.searchStallT > 2.2 && toSpot < 2.6);
          const wasCover = this.searchCover.shift();
          this.searchQueue.shift();
          this.searchAnchor.copy(this.pos);
          this.searchStallT = 0;
          this.searchT = 6;
          this.path = null;
          const [lo, hi] = this.ai.searchDwell;
          // A place it could not get to still gets a look from where it stands, just a shorter one.
          this.searchPause = arrived ? lo + (hi - lo) * rng.next() : 0.5 + 0.4 * rng.next();
          // Checking behind a crate means going down to look behind it; open floor is a coin toss.
          if (arrived && (wasCover || rng.next() < this.ai.crouchCheckChance)) {
            this.crouchCheckT = this.searchPause * 0.7;
          }
        } else {
          wantMove = spot;
        }
        break;
      }
      case 'combat': {
        aiming = true;
        const plan = this._fightPlan(dt, rng);
        wantMove = plan.move;
        wantDirect = plan.direct;
        runSpeed = plan.speed;
        aiming = plan.aiming;
        break;
      }
    }

    // ---------- movement ----------
    let speedNow = 0;
    if (this.flashT > 0) {
      // blinded: stumble away from the burst, then stand and cower
      if (this.stumbleT > 0) {
        const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
          { x: this.stumbleDir.x * 1.5 * dt, y: -9 * dt, z: this.stumbleDir.z * 1.5 * dt },
          { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy' });
        if (Math.hypot(step.pos.x - this.pos.x, step.pos.z - this.pos.z) < 0.5) {
          this.pos.set(step.pos.x, step.pos.y, step.pos.z);
          speedNow = 1.5;
        }
      } else {
        const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
          { x: 0, y: -9 * dt, z: 0 }, { filter: (c) => c.tag !== 'enemy' });
        this.pos.set(step.pos.x, step.pos.y, step.pos.z);
      }
    } else if (wantMove) {
      const dxz = Math.hypot(wantMove.x - this.pos.x, wantMove.z - this.pos.z);
      const level = Math.abs(wantMove.y - this.pos.y) < 0.7;
      if (wantDirect && level && dxz < 2.8) {
        speedNow = this._steerDirect(wantMove, runSpeed, dt, aiming);
      } else {
        speedNow = this._steerPath(wantMove, runSpeed, dt, aiming, rng);
      }
      // Stuck recovery. Two conditions, both necessary: the hostile has to be trying to travel (a
      // tucked shooter standing on its cover point is not stuck) and it has to be covering much
      // less ground than the speed it asked for. The comparison is against the distance this step
      // should have produced — a fixed threshold reads as "stuck" for every hostile at 120 Hz.
      const wanted = speedNow * dt;
      if (speedNow > 0.05 && this.pos.distanceTo(this.lastPos) < wanted * 0.3) this.stuckT += dt;
      else this.stuckT = 0;
      if (this.stuckT > 1.6) {
        this.stuckT = 0;
        this.path = null;
        this.repathT = 0;
        this.cover = -1;
        this.coverT = 0;
        // Shove towards open navigation, through the mover so the capsule stays legal — the nav
        // graph clears 0.24 m and a body needs 0.37, so hostiles do wedge in doorway corners.
        const idx = this.mission.nav.randomNodeNear(this.pos.x, this.pos.y, this.pos.z, 3.5, rng);
        if (idx >= 0) {
          const n = this.mission.nav.nodes[idx];
          const ox = n.x - this.pos.x, oz = n.z - this.pos.z;
          const ol = Math.hypot(ox, oz) || 1;
          const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
            { x: (ox / ol) * 0.35, y: -9 * dt, z: (oz / ol) * 0.35 },
            { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy' });
          if (Math.hypot(step.pos.x - this.pos.x, step.pos.z - this.pos.z) < 0.6) {
            this.pos.set(step.pos.x, step.pos.y, step.pos.z);
          }
        }
      }
    } else {
      // idle gravity settle
      const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
        { x: 0, y: -9 * dt, z: 0 }, { filter: (c) => c.tag !== 'enemy' });
      this.pos.set(step.pos.x, step.pos.y, step.pos.z);
      this.stuckT = 0;
    }
    this.lastPos.copy(this.pos);
    this._tidyDoors(dt, rng);

    // ---------- look ----------
    if (this.glanceT > 0 && this.glanceAt) {
      const face = Math.atan2(-(this.glanceAt.x - this.pos.x), -(this.glanceAt.z - this.pos.z));
      this.yaw = dampAngle(this.yaw, face, 7, dt);
    }

    // ---------- rig sync ----------
    this.rig.group.position.copy(this.pos);
    this.rig.group.rotation.y = this.yaw;
    this.rig.setAiming(aiming && this.flashT <= 0 && !this.tucked);
    if (this.flashT > 0) this.rig.setPose('cower');
    else if (this.tucked || this.crouchCheckT > 0) this.rig.setPose('kneel');
    else this.rig.setPose('stand');
    this.rig.update(dt, speedNow);
    this._syncCollider();

    // footstep noises for the player to hear (and audio)
    this.stepAcc = (this.stepAcc || 0) + speedNow * dt;
    if (this.stepAcc > 1.35 && speedNow > 0.3) {
      this.stepAcc = 0;
      audio.footstep(this._groundMat(), this.pos, false, 0.7);
    }
  }

  // ---------------------------------------------------------------------------
  // Combat
  // ---------------------------------------------------------------------------
  /**
   * Decides where to stand and whether to shoot. Returns the movement request for this step.
   * Cover comes from the baked cover map; the peek/tuck rhythm and the push/hold token decide
   * whether the hostile is exposed at all.
   */
  _fightPlan(dt, rng) {
    const player = this.mission.player;
    const out = { move: null, direct: false, speed: this.conf.speed, aiming: true };
    const seen = this.losTimer < 0.35;
    if (seen) this._vTarget.set(player.pos.x, player.pos.y, player.pos.z);
    else if (this.lastKnown) this._vTarget.copy(this.lastKnown);
    else { this._planSearch(this.pos); this.state = 'search'; return out; }
    const targetPos = this._vTarget;

    const dx = targetPos.x - this.pos.x, dz = targetPos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    this.yaw = dampAngle(this.yaw, Math.atan2(-dx, -dz), 14, dt);
    this.rig.aimPitch = THREE.MathUtils.clamp(
      Math.atan2((player.eyeY - 0.2) - (this.pos.y + 1.4), Math.max(0.4, dist)), -0.6, 0.6);

    if (seen) { this.lostT = 0; this.hunting = false; }

    // ---- reloading: get behind something and stay there ----
    if (this.reloadT > 0) {
      this._maintainCover(targetPos, dist, rng, true);
      out.aiming = false;
      this.tucked = this.cover >= 0 && this.inCover;
      if (this.cover >= 0 && !this.inCover) { out.move = this.coverPos; out.direct = this._coverIsNear(); }
      out.speed = this.conf.speed;
      if (!seen) this.lostT += dt;
      return out;
    }

    // ---- give up the contact? ----
    if (!seen) {
      if (!this.tucked) this.lostT += dt;
      if (this.lostT > 2.5) this.hunting = true;
      if (this.hunting) {
        this.cover = -1;
        out.move = targetPos;
        out.speed = this.conf.speed * 0.92;
        if (this.pos.distanceTo(targetPos) < 1.5 || this.lostT > 5.5) {
          this._planSearch(targetPos);
          this.state = 'search';
          this.suspicion = 0.9;
          audio.voice('hostileAlert', this.pos);
        }
        return out;
      }
    }

    const R = this.conf.range;

    // ---- long approach: close the distance before worrying about cover ----
    if (dist > R * 1.45) {
      this.cover = -1;
      out.move = this._roleAnchor(targetPos, R);
      out.speed = this.conf.speed * (this.role === 'push' ? 0.9 : 0.8);
      if (seen && this.aimDelay <= 0 && this.fireCooldown <= 0) this._tryFire(player, dist);
      this.aimDelay -= dt;
      return out;
    }

    this._maintainCover(targetPos, dist, rng, false);

    if (this.cover >= 0) {
      if (!this.inCover) {
        // moving up: keep the weapon on the target and shoot on the way in
        out.move = this.coverPos;
        out.direct = this._coverIsNear();
        out.speed = this.conf.speed * (this.suppress > this.ai.suppressTuck ? 0.95 : 0.8);
      } else {
        // Peek / tuck rhythm. Incoming fire shortens the look and lengthens the tuck, but it never
        // stops the rhythm: a hostile that stays down for as long as the trigger is held reads as
        // broken rather than as cautious, so even a pinned one snaps out to trade a burst.
        this.peekT -= dt;
        const pinned = this.suppress > this.ai.suppressTuck;
        if (this.peekT <= 0) {
          this.peeking = !this.peeking;
          const [lo, hi] = this.peeking ? this.ai.peekOut : this.ai.peekIn;
          let win = lo + (hi - lo) * rng.next();
          if (this.peeking) { if (pinned) win = Math.min(win, this.ai.pinnedPeek); }
          else win *= 1 + this.suppress * this.ai.pinnedTuck;
          this.peekT = win;
        }
        // A burst landing mid-peek cuts the look short.
        if (pinned && this.peeking && this.peekT > this.ai.pinnedPeek) this.peekT = this.ai.pinnedPeek;
        const exposed = this.peeking;
        this.tucked = !exposed;
        out.move = exposed ? this.coverPeek : this.coverPos;
        out.direct = true;
        out.speed = this.conf.speed * 0.55;
        out.aiming = exposed;
      }
    } else {
      // ---- no cover available: the old open-ground dance, kept as the fallback ----
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeT = 0.7 + rng.next() * 1.1;
        this.strafeDir = rng.next() < 0.5 ? -1 : 1;
        if (rng.next() < 0.25) this.strafeDir = 0;
      }
      if (dist < R * 0.4) {
        out.move = this._vMove.set(this.pos.x - (dx / (dist || 1)) * 2.2, this.pos.y, this.pos.z - (dz / (dist || 1)) * 2.2);
        out.direct = true;
        out.speed = this.conf.speed * 0.6;
      } else if (this.strafeDir !== 0) {
        out.move = this._vMove.set(this.pos.x + (-dz / (dist || 1)) * this.strafeDir * 1.6, this.pos.y,
          this.pos.z + (dx / (dist || 1)) * this.strafeDir * 1.6);
        out.direct = true;
        out.speed = this.conf.speed * 0.5;
      }
      if (this.role === 'hold' && this.flankBearing != null && dist < R * 0.75) {
        // hold the angle at range rather than crowding in
        out.move = this._roleAnchor(targetPos, R);
        out.direct = false;
        out.speed = this.conf.speed * 0.7;
      }
    }

    // ---- firing ----
    this.aimDelay -= dt;
    if (seen && !this.tucked && this.aimDelay <= 0 && this.fireCooldown <= 0 && this.flashT <= 0) {
      this._tryFire(player, dist);
    }
    return out;
  }

  /** Where this hostile wants to be relative to the target, given its push/hold token. */
  _roleAnchor(targetPos, R) {
    if (this.role === 'hold' && this.flankBearing != null) {
      return this._vMove.set(
        targetPos.x + Math.cos(this.flankBearing) * R * 0.85,
        targetPos.y,
        targetPos.z + Math.sin(this.flankBearing) * R * 0.85);
    }
    return targetPos;
  }

  _coverIsNear() {
    return Math.hypot(this.coverPos.x - this.pos.x, this.coverPos.z - this.pos.z) < 2.6
      && Math.abs(this.coverPos.y - this.pos.y) < 0.7;
  }

  /**
   * Keeps `this.cover` pointing at a usable cover point, re-selecting at most a few times a
   * second. Costs one coarse-grid query plus arithmetic, and at most one LOS ray (only when the
   * perception pass left budget).
   */
  _maintainCover(targetPos, dist, rng, forReload) {
    const cm = this.mission.nav.cover;
    if (!cm || !cm.count) { this.cover = -1; return; }

    if (this.cover >= 0) {
      const stillCovers = cm.protects(this.cover, targetPos.x, targetPos.z);
      const cd = Math.hypot(cm.x[this.cover] - targetPos.x, cm.z[this.cover] - targetPos.z);
      const usable = stillCovers && cd > this.conf.range * 0.25 && cd < this.conf.range * 2.0;
      if (usable) {
        this.inCover = Math.hypot(this.coverPos.x - this.pos.x, this.coverPos.z - this.pos.z) < COVER_ARRIVE
          && Math.abs(this.coverPos.y - this.pos.y) < 0.8;
        return;
      }
      if (this.coverT > 0) return;   // the choice is stale but the cooldown owns the decision
      this.cover = -1;
    }
    if (this.coverT > 0) return;

    // Hostiles that are told to fight in the open sometimes do; recruits more often.
    if (!forReload && rng.next() > this.ai.coverChance) {
      this.coverT = 1.5 + rng.next() * 0.9;
      this.inCover = false;
      return;
    }

    const prefer = THREE.MathUtils.clamp(dist, this.conf.range * 0.5, this.conf.range);
    const cands = cm.near(this.pos.x, this.pos.y, this.pos.z, 8.5, this._coverBuf);
    let best = -1, bestScore = -Infinity;
    for (const i of cands) {
      if (!cm.protects(i, targetPos.x, targetPos.z)) continue;
      const toT = Math.hypot(cm.x[i] - targetPos.x, cm.z[i] - targetPos.z);
      if (toT < 1.2) continue;
      const toMe = Math.hypot(cm.x[i] - this.pos.x, cm.z[i] - this.pos.z);
      let score = -Math.abs(toT - prefer) * 0.9 - toMe * 0.5;
      if (cm.full[i]) score += 1.4;
      if (forReload) score += -toMe * 0.8 + (cm.full[i] ? 1.5 : 0);
      if (this.role === 'hold' && this.flankBearing != null) {
        const bearing = Math.atan2(cm.z[i] - targetPos.z, cm.x[i] - targetPos.x);
        score -= Math.abs(angleDelta(bearing, this.flankBearing)) * 2.2;
      }
      if (this.suppress > 0.4) score += cm.full[i] ? 1.2 : -0.6;
      // a cover point whose firing line is inside a smoke cloud is worthless
      cm.peekPos(i, this._vA);
      this._vA.y += EYE;
      if (this.mission.vfx.isSmoked(this._vA, targetPos)) score -= 7;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) {
      this.coverT = 0.9 + rng.next() * 0.6;
      this.inCover = false;
      return;
    }

    // Verify the lean-out actually sees the target — one ray, only if perception left room.
    if (this._rayGate()) {
      cm.peekPos(best, this._vA);
      this._vA.y += EYE;
      this._vB.set(targetPos.x, targetPos.y + 1.2, targetPos.z);
      if (!this._clearSight(this._vA, this._vB)) {
        this.coverT = 0.4;       // try a different one shortly
        this.cover = -1;
        this.inCover = false;
        return;
      }
    }
    this.coverT = 1.5 + rng.next() * 0.9;
    this.cover = best;
    this.coverFull = !!cm.full[best];
    this.coverPos.set(cm.x[best], cm.y[best], cm.z[best]);
    cm.peekPos(best, this.coverPeek);
    this.inCover = false;
    this.peeking = false;        // arrive tucked, then lean out
    this.peekT = 0.25 + rng.next() * 0.3;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  /** Last known position, then a handful of plausible hiding places around it. */
  _planSearch(center) {
    const rng = this.mission.rng;
    const nav = this.mission.nav;
    const want = this.ai.searchSpots;
    // The head of the queue is where the contact was lost, which is where the *player* stood: a
    // 0.37 m capsule frequently cannot get there, so it is snapped onto the navmesh first. The
    // hostile checks the nearest place it can stand rather than shuffling against a desk.
    const head = nav.nearestNode(center.x, center.y, center.z);
    const hn = head >= 0 ? nav.nodes[head] : null;
    const spots = [hn && Math.abs(hn.y - center.y) < 0.45
      ? new THREE.Vector3(hn.x, hn.y, hn.z)
      : new THREE.Vector3(center.x, center.y, center.z)];
    const fromCover = [false];
    const far = (p) => !spots.some((s) => s.distanceToSquared(p) < 4);

    const cm = nav.cover;
    if (cm && cm.count) {
      const cands = cm.near(center.x, center.y, center.z, 8, this._coverBuf);
      for (let guard = 0; guard < 10 && spots.length <= want && cands.length; guard++) {
        const i = cands[Math.floor(rng.next() * cands.length)];
        const p = new THREE.Vector3(cm.x[i], cm.y[i], cm.z[i]);
        if (far(p)) { spots.push(p); fromCover.push(true); }
      }
    }
    for (let guard = 0; guard < 10 && spots.length <= want; guard++) {
      const idx = nav.randomNodeNear(center.x, center.y, center.z, 7, rng);
      if (idx < 0) break;
      const n = nav.nodes[idx];
      const p = new THREE.Vector3(n.x, n.y, n.z);
      if (far(p)) { spots.push(p); fromCover.push(false); }
    }

    this.searchCover = fromCover;
    this.searchQueue = spots;
    this.searchPause = 0;
    this.searchT = 6;
    this.searchAnchor.copy(this.pos);
    this.searchStallT = 0;
    this.path = null;
    this.repathT = 0;
    this.cover = -1;
    this.hunting = false;
    this.lostT = 0;
    this.investFor = null;
  }

  _endSearch() {
    this.state = this.patrol.length > 1 ? 'patrol' : 'guard';
    this.suspicion = 0;
    this.searchQueue.length = 0;
    this.searchCover.length = 0;
    this.investigatePos = null;
    this.path = null;
    this.wary = this.ai.warySec;   // alert posture: faster scan, tighter reaction
    this.told = false;
  }

  // ---------------------------------------------------------------------------
  // Corpses and devices
  // ---------------------------------------------------------------------------
  /** A body in view is worth escalating over — once. */
  _checkBodies(dt) {
    this.bodyCheckT -= dt;
    if (this.bodyCheckT > 0) return;
    this.bodyCheckT = 0.5;
    if (this.state === 'combat' || this.flashT > 0) return;
    if (!this._rayGate()) return;
    const radius = this.ai.corpseRadius;
    let body = null, bd = radius * radius;
    for (const e of this.mission.enemies) {
      if (e.alive || e === this) continue;
      if (this.knownBodies.has(e.id)) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
      if (Math.abs(e.pos.y - this.pos.y) > 2.2) continue;
      const d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; body = e; }
    }
    if (!body) return;
    // must be roughly in front, then confirmed with a single ray
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const len = Math.sqrt(bd) || 1;
    if ((fx * (body.pos.x - this.pos.x) + fz * (body.pos.z - this.pos.z)) / len < 0.2 && len > 2.5) return;
    const clear = this._clearSight(this.eye(this._vA), this._vB.set(body.pos.x, body.pos.y + 0.35, body.pos.z));
    if (!clear) return;
    this.knownBodies.add(body.id);
    this.suspicion = 1;
    this.investigatePos = new THREE.Vector3(body.pos.x, body.pos.y, body.pos.z);
    this.state = 'investigate';
    this.repathT = 0;
    this.waitT = 0.35 * this.diff.enemyReaction;
    this.wary = Math.max(this.wary, this.ai.warySec);
    audio.voice('hostileAlert', this.pos);
    bus.emit('enemy-found-body', { id: this.id, body: body.id, pos: this.investigatePos.clone() });
    this._shout(0, 'body', body.id);
  }

  /** A device bouncing across the floor gets a look, and pulls an idle hostile over to it. */
  _checkDevices(dt, rng) {
    if (this.glanceT > 0) { this.glanceT = Math.max(0, this.glanceT - dt); return; }
    const projs = this.mission.projectiles;
    if (!projs || !projs.length || this.flashT > 0) return;
    let best = null, bd = 81;
    for (const pr of projs) {
      const dx = pr.pos.x - this.pos.x, dz = pr.pos.z - this.pos.z;
      if (Math.abs(pr.pos.y - this.pos.y) > 3) continue;
      const d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = pr; }
    }
    if (!best) return;
    if (!this.glanceAt) this.glanceAt = new THREE.Vector3();
    this.glanceAt.set(best.pos.x, best.pos.y, best.pos.z);
    this.glanceT = 0.5 + rng.next() * 0.3;
    if (this.state !== 'combat') {
      this.suspicion = Math.min(1, this.suspicion + 0.3);
      if (this.suspicion > 0.5 && this.state !== 'investigate') {
        this.investigatePos = this.glanceAt.clone();
        this.state = 'investigate';
        this.repathT = 0;
        this.waitT = 0.3 * this.diff.enemyReaction;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Movement helpers
  // ---------------------------------------------------------------------------
  /** Short tactical steps (lean out, tuck back, sidestep) never ask the pathfinder. */
  _steerDirect(target, runSpeed, dt, aiming) {
    const dir = this._vSteer.set(target.x - this.pos.x, 0, target.z - this.pos.z);
    const dl = dir.length();
    if (dl < 0.08) return 0;
    dir.multiplyScalar(1 / dl);
    const speed = Math.min(runSpeed, dl / Math.max(dt, 1e-4));
    const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
      { x: dir.x * speed * dt, y: -9 * dt, z: dir.z * speed * dt },
      { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy' });
    if (Math.hypot(step.pos.x - this.pos.x, step.pos.z - this.pos.z) > 0.5) return 0;
    this.pos.set(step.pos.x, step.pos.y, step.pos.z);
    if (!aiming) this.yaw = dampAngle(this.yaw, Math.atan2(-dir.x, -dir.z), 10, dt);
    return speed;
  }

  /** Long moves go through the nav graph, with the re-path backoff gating every request (NS-7). */
  _steerPath(wantMove, runSpeed, dt, aiming, rng) {
    if (this.repathT <= 0 && this.pathGapT <= 0) {
      this.path = this.mission.findPath(this.pos, wantMove);
      this.pathIdx = 0;
      this.repathT = 0.9 + rng.next() * 0.7;
      // Floor under the backoff. Several things legitimately zero `repathT` — a fresh alert, a
      // shout, arriving at a waypoint, stuck recovery — and a hostile wedged in geometry can hit
      // the clamp guard below on consecutive steps. This makes the worst case ~3 requests a second
      // no matter how the resets pile up (NS-7, PW-25).
      this.pathGapT = 0.34;
    }
    if (!this.path || !this.path.length) {
      // No route. Usually the goal is simply unreachable, but it also happens when the mover has
      // pushed the hostile onto a desk or a planter: its feet are then on a different navigation
      // level and A* has nothing to work with. Walking at the goal directly keeps `speedNow`
      // non-zero, which lets the stuck detector above notice and shove it back onto the graph.
      return this._steerDirect(wantMove, runSpeed * 0.6, dt, aiming);
    }
    let wp = this.path[this.pathIdx];
    while (wp && Math.hypot(wp.x - this.pos.x, wp.z - this.pos.z) < 0.42 && Math.abs(wp.y - this.pos.y) < 1) {
      this.pathIdx++;
      wp = this.path[this.pathIdx];
    }
    if (!wp) { this.path = null; return 0; }
    const dir = this._vSteer.set(wp.x - this.pos.x, 0, wp.z - this.pos.z);
    const dl = dir.length();
    if (dl <= 0.01) return 0;
    dir.multiplyScalar(1 / dl);

    // door tactics: pause, open, then push through faster
    if (this._doorGate(dir, dt, rng) === 'pause') return 0;
    const speed = runSpeed * (this.entryT > 0 ? 1.22 : 1);
    const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
      { x: dir.x * speed * dt, y: -9 * dt, z: dir.z * speed * dt },
      { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy' });
    const jump = Math.hypot(step.pos.x - this.pos.x, step.pos.z - this.pos.z);
    if (jump > 0.5) {
      // Safety net: never accept a clamp-teleport. Drop the route and let the backoff decide when
      // to ask for another — `Math.max` so a wedged hostile cannot shorten its own interval.
      this.path = null;
      this.repathT = Math.max(this.repathT, 0.2);
    } else {
      this.pos.set(step.pos.x, step.pos.y, step.pos.z);
    }
    if (!aiming) this.yaw = dampAngle(this.yaw, Math.atan2(-dir.x, -dir.z), 10, dt);
    return speed;
  }

  _groundMat() {
    if (!this._rayGate()) return this._lastGround || 'concrete';
    this.rays++;
    const g = this.mission.world.raycast(this.pos.x, this.pos.y + 0.3, this.pos.z, 0, -1, 0, 0.8, (c) => c.blockMove && c.tag !== 'enemy');
    this._lastGround = g ? g.collider.material : 'concrete';
    return this._lastGround;
  }

  // ---------------------------------------------------------------------------
  // Doors
  // ---------------------------------------------------------------------------
  _doorAhead(dir) {
    const probe = { x: this.pos.x + dir.x * 0.9, y: this.pos.y + 1.0, z: this.pos.z + dir.z * 0.9 };
    const hits = this.mission.world.query(
      { x: probe.x - 0.65, y: probe.y - 0.8, z: probe.z - 0.65 },
      { x: probe.x + 0.65, y: probe.y + 0.8, z: probe.z + 0.65 }, []);
    for (const c of hits) {
      if (c.tag === 'door' && c.ref && c.ref.blocksPath && c.ref.open) return c.ref;
    }
    return null;
  }

  /**
   * 'pause' for the beat before entering a room, 'go' otherwise. A hostile in contact stacks up
   * on the door for a third of a second, opens it and enters with the weapon up and a faster step.
   */
  _doorGate(dir, dt, rng) {
    if (this.doorPauseT > 0) {
      this.doorPauseT -= dt;
      if (this.doorPauseT <= 0) {
        if (this.pendingDoor && this.pendingDoor.state !== 'locked') {
          this.pendingDoor.open();
          this._noteOpened(this.pendingDoor);
          this.entryT = 0.85;
        }
        this.pendingDoor = null;
        return 'go';
      }
      return 'pause';
    }
    this.doorScanT -= dt;
    if (this.doorScanT > 0) return 'go';
    this.doorScanT = 0.18;
    const door = this._doorAhead(dir);
    if (!door || door.state === 'locked') return 'go';
    if (door.state !== 'closed' && door.state !== 'closing') return 'go';
    const tactical = this.state === 'combat' || this.state === 'investigate' || this.state === 'search';
    if (tactical) {
      this.pendingDoor = door;
      this.doorPauseT = 0.3 + rng.next() * 0.2;
      return 'pause';
    }
    door.open();
    this._noteOpened(door);
    return 'go';
  }

  _noteOpened(door) {
    if (this.openedDoors.includes(door)) return;
    this.openedDoors.push(door);
    if (this.openedDoors.length > 4) this.openedDoors.shift();
  }

  /** Patrols occasionally close the doors they opened. Never while there is a fight on. */
  _tidyDoors(dt, rng) {
    this.doorCloseT -= dt;
    if (this.doorCloseT > 0) return;
    this.doorCloseT = 1.2;
    if (!this.openedDoors.length) return;
    if (this.state !== 'patrol' && this.state !== 'patrol-wait' && this.state !== 'guard') return;
    const door = this.openedDoors[0];
    const d = this.pos.distanceTo(door.center);
    if (d > 11) { this.openedDoors.shift(); return; }
    if (d < 2.4 || d > 8) return;
    if (door.state !== 'open' && door.state !== 'opening') { this.openedDoors.shift(); return; }
    if (rng.next() > 0.3) return;
    // never shut it on somebody standing in the doorway
    if (this.mission.player.pos.distanceTo(door.center) < 1.8) return;
    for (const e of this.mission.enemies) {
      if (e.alive && e !== this && e.pos.distanceTo(door.center) < 1.8) return;
    }
    door.close();
    this.openedDoors.shift();
  }

  // ---------------------------------------------------------------------------
  // Shooting
  // ---------------------------------------------------------------------------
  _tryFire(player, dist) {
    const def = WEAPONS[this.conf.weapon];
    const rng = this.mission.rng;
    if (this.mag <= 0) {
      this.reloadT = (def.reloadEmptyMs ?? 2400) / 1000;
      audio.mech('magout', this.pos);
      this.rig.playReload();
      this.coverT = 0;         // reload is a reason to move
      return;
    }
    // A new burst starts on this same call. Charging a between-burst pause up front would mean a
    // hostile leaning out of cover for half a second never actually got a round off.
    if (this.burstLeft <= 0) {
      this.burstLeft = this.conf.burst[0] + Math.floor(rng.next() * (this.conf.burst[1] - this.conf.burst[0] + 1));
    }
    this.burstLeft--;
    this.mag--;
    this.selfFireT = 0.05;     // our own impacts are not incoming fire
    this.fireCooldown = this.burstLeft > 0
      ? 60 / (def.rpm * 0.55)                                    // inside the burst; slower than max rpm
      : (0.5 + rng.next() * 0.6) * (1 + this.suppress * 0.8);    // suppressed shooters hesitate longer
    const muzzle = this.rig.getMuzzleWorld();
    // aim at chest with error
    const targetY = player.pos.y + (player.crouched ? 0.75 : 1.25);
    const aim = new THREE.Vector3(player.pos.x, targetY, player.pos.z);
    const dir = new THREE.Vector3().subVectors(aim, muzzle).normalize();
    const spreadDeg = (3.2 / (this.conf.acc * this.diff.enemyAccuracy))
      * (1 + dist / 26)
      * (Math.hypot(player.vel.x, player.vel.z) > 2.4 ? 1.5 : 1)
      * (1 + this.suppress * 0.7);
    const spread = THREE.MathUtils.degToRad(spreadDeg);
    dir.x += (rng.next() - 0.5) * spread;
    dir.y += (rng.next() - 0.5) * spread * 0.7;
    dir.z += (rng.next() - 0.5) * spread;
    dir.normalize();
    const pellets = def.pellets ?? 1;
    for (let i = 0; i < pellets; i++) {
      const d2 = dir.clone();
      if (pellets > 1) {
        const ps = THREE.MathUtils.degToRad(def.spread.base);
        d2.x += (rng.next() - 0.5) * ps; d2.y += (rng.next() - 0.5) * ps; d2.z += (rng.next() - 0.5) * ps;
        d2.normalize();
      }
      fireHitscan({
        world: this.mission.world,
        entities: [{ kind: 'player', ref: player, alive: player.alive, capsule: () => ({ x: player.pos.x, z: player.pos.z, y0: player.pos.y, y1: player.pos.y + player.height, r: 0.36 }) }],
        origin: muzzle, dir: d2, def: { ...def, damage: this.conf.damage * this.diff.enemyDamage },
        shooter: this, rng,
      });
    }
    audio.gunshot(def.sound, this.pos, 0.85);
    this.mission.vfx.muzzleFlash(muzzle, dir, 0.9);
    const tracerEnd = muzzle.clone().addScaledVector(dir, Math.min(30, dist));
    if (def.tracer) this.mission.vfx.tracer(muzzle, tracerEnd);
    bus.emit('noise', { pos: this.pos.clone(), radius: def.noise * 0.8, type: 'gunshot', source: 'enemy' });
  }

  // Kept for compatibility with existing tools/tests that ask a hostile for a hiding place.
  _findCover() {
    const cm = this.mission.nav.cover;
    const player = this.mission.player;
    if (!cm || !cm.count) return null;
    const cands = cm.near(this.pos.x, this.pos.y, this.pos.z, 8, this._coverBuf);
    let best = -1, bd = Infinity;
    for (const i of cands) {
      if (!cm.protects(i, player.pos.x, player.pos.z)) continue;
      const d = Math.hypot(cm.x[i] - this.pos.x, cm.z[i] - this.pos.z);
      if (d < bd) { bd = d; best = i; }
    }
    return best < 0 ? null : new THREE.Vector3(cm.x[best], cm.y[best], cm.z[best]);
  }

  // ---------------------------------------------------------------------------
  textState(playerPos) {
    return {
      id: this.id, type: this.type, state: this.flashT > 0 ? 'flashed' : this.state,
      hp: Math.max(0, Math.round(this.hp)), alive: this.alive,
      pos: [+this.pos.x.toFixed(1), +this.pos.y.toFixed(1), +this.pos.z.toFixed(1)],
      dist: playerPos ? +this.pos.distanceTo(playerPos).toFixed(1) : undefined,
      suspicion: +this.suspicion.toFixed(2),
      posture: this.state === 'combat'
        ? { role: this.role, cover: this.cover >= 0 ? (this.coverFull ? 'full' : 'low') : 'none',
          inCover: this.inCover, tucked: this.tucked, suppress: +this.suppress.toFixed(2),
          told: this.told || undefined }
        : (this.wary > 0 ? { wary: +this.wary.toFixed(0) } : undefined),
    };
  }

  dispose() {
    unregisterEnemy(this);
    this.mission.entGroup.remove(this.rig.group);
    if (this.alive) this.mission.world.remove(this.collider);
  }
}

function dampAngle(cur, target, lambda, dt) {
  let diff = target - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return cur + diff * Math.min(1, lambda * dt);
}

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
