import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { FIRE, HEALTH, MOVE, SENSE, difficultyFor } from './constants.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

export const STATES = ['spawn', 'advance', 'cover', 'engage', 'flinch', 'retreat', 'suppress', 'dead'];

/**
 * Tactical state machine for one soldier. Reads the world through `enemy` (position, eye, LOS helpers)
 * and writes an `intent` the Enemy's locomotion executes:
 *
 *   intent.move    Vector3|null   waypoint to walk toward (world, feet)
 *   intent.speed   number         desired speed (m/s)
 *   intent.aim     Vector3|null   point the rifle/torso/head aim at
 *   intent.face    Vector3|null   point the body turns toward when (nearly) stationary
 *   intent.crouch  bool
 *
 * States: spawn → advance ⇄ cover ⇄ engage, flinch (interrupt), retreat (low health), suppress (lost LOS).
 */
export class EnemyBrain {
  constructor(enemy, { wave = 1 } = {}) {
    this.enemy = enemy;
    this.game = enemy.game;
    this.nav = enemy.manager.nav;
    this.diff = difficultyFor(wave);
    this.state = 'spawn';
    this.stateTime = 0;
    this.prevState = 'advance';
    this.intent = { move: null, speed: 0, aim: null, face: null, crouch: false };
    this.memory = { lastKnown: null, lastSeen: -Infinity, lastHeard: -Infinity, canSee: false, dist: Infinity, sawPlayerOnce: false };
    this.path = null; // { points: Vector3[], index, dest: Vector3, age }
    this.destination = null;
    this.destKind = null; // 'objective' | 'cover' | 'lastKnown' | 'strafe'
    this.coverNode = null;
    this.inCover = false;
    this.peek = { phase: 'hide', timer: rand(0.4, 1.0), misses: 0 };
    this.fire = { rounds: 0, timer: 0, pause: rand(0.3, 1.0), settle: 0, index: 0, shots: 0 };
    this.losTimer = Math.random() * SENSE.losInterval;
    this.repathTimer = 0;
    this.strafeTimer = rand(2, 4);
    this.kneelTimer = 0;
    this.engageBudget = rand(6, 10);
    this.holdTimer = 0;
    this.retreated = false;
    this.flinchCooldown = 0;
    this.flinchTimer = 0;
    this.resume = null;
    this._worldFilter = groups(GROUP.ALL, GROUP.WORLD);
    this._aimPoint = new THREE.Vector3();
    this._facePoint = new THREE.Vector3();
    this._movePoint = new THREE.Vector3();
    this._suppressPoint = new THREE.Vector3();
    this._enter('spawn');
  }

  /* ------------------------------------------------------------------------------------------ perception */

  _perceive(dt) {
    const m = this.memory;
    const player = this.game.player;
    const now = this.game.time;
    if (!player || !player.alive) {
      m.canSee = false;
      m.dist = Infinity;
      return;
    }
    m.dist = this.enemy.position.distanceTo(player.position);
    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = SENSE.losInterval * rand(0.8, 1.2);
      m.canSee = m.dist < SENSE.engageDistance && this._hasLineOfSight();
    }
    if (m.canSee) {
      if (!m.lastKnown) m.lastKnown = new THREE.Vector3();
      m.lastKnown.copy(player.position);
      m.lastSeen = now;
      m.sawPlayerOnce = true;
    }
  }

  _hasLineOfSight() {
    const player = this.game.player;
    const eye = this.enemy.model.getEye(_v1);
    const physics = this.game.physics;
    for (const target of [player.eyePosition, _v3.copy(player.position).setY(player.position.y + 0.9)]) {
      _v2.subVectors(target, eye);
      const d = _v2.length();
      if (d < 0.5) return true;
      _v2.multiplyScalar(1 / d);
      const hit = physics.raycast(eye, _v2, d - 0.35, { filter: this._worldFilter });
      if (!hit) return true;
    }
    return false;
  }

  /** Gunfire heard nearby: remember roughly where it came from. */
  hear(position) {
    const m = this.memory;
    if (m.canSee) return;
    if (!m.lastKnown) m.lastKnown = new THREE.Vector3();
    m.lastKnown.copy(position).add(_v1.set(rand(-1.5, 1.5), 0, rand(-1.5, 1.5)));
    m.lastHeard = this.game.time;
  }

  get memoryAge() {
    return this.game.time - Math.max(this.memory.lastSeen, this.memory.lastHeard);
  }

  get hasMemory() {
    return !!this.memory.lastKnown && this.memoryAge < SENSE.memoryTime;
  }

  /* ------------------------------------------------------------------------------------------ helpers */

  _enter(state) {
    if (state !== 'flinch') this.prevState = this.state;
    this.state = state;
    this.stateTime = 0;
    this.inCover = false;
    this.intent.crouch = false;
    if (state !== 'flinch') {
      this.fire.rounds = 0;
      this.fire.settle = 0;
    }
    switch (state) {
      case 'spawn':
        this.holdTimer = rand(0.25, 0.6);
        break;
      case 'advance':
        this._chooseAdvanceDestination();
        break;
      case 'cover':
        this.peek.phase = 'hide';
        this.peek.timer = rand(0.6, 1.2);
        this.peek.misses = 0;
        this.holdTimer = rand(12, 18);
        break;
      case 'engage':
        this.engageBudget = rand(6, 11);
        this.strafeTimer = rand(1.5, 3.5);
        this.kneelTimer = 0;
        this._clearPath();
        break;
      case 'retreat': {
        this.retreated = true;
        const threat = this.game.player.eyePosition;
        const node = this.nav.findCover(this.enemy.position, threat, { minRange: 10, maxRange: 32, awayFrom: this.enemy.position, avoid: this._occupiedCover() }) || this.nav.findCover(this.enemy.position, threat, { minRange: 8, maxRange: 36, avoid: this._occupiedCover() });
        if (node) {
          this.coverNode = node;
          this._setDestination(node.position, 'cover');
        } else this._enter('engage');
        break;
      }
      case 'suppress':
        this.holdTimer = rand(3.5, 6);
        this.fire.pause = rand(0.4, 1.0);
        if (this.memory.lastKnown) this._suppressPoint.copy(this.memory.lastKnown).add(_v1.set(rand(-0.6, 0.6), 1.2, rand(-0.6, 0.6)));
        break;
      default:
        break;
    }
  }

  _occupiedCover() {
    const out = [];
    for (const e of this.enemy.manager.list) {
      if (e === this.enemy || !e.alive || !e.brain) continue;
      if (e.brain.coverNode) out.push(e.brain.coverNode.position);
    }
    return out;
  }

  _clearPath() {
    this.path = null;
    this.destination = null;
    this.destKind = null;
    this.intent.move = null;
  }

  _setDestination(pos, kind) {
    this.destination = pos.clone();
    this.destKind = kind;
    const points = this.nav.findPath(this.enemy.position, this.destination);
    this.path = { points: points || [this.destination.clone()], index: 0, age: 0 };
    this.repathTimer = 1.0;
  }

  /** Re-plan toward the current destination (after the body was unstuck / teleported). */
  replan() {
    if (this.state === 'dead') return;
    if (this.destination) this._setDestination(this.destination, this.destKind);
    else if (this.state === 'advance') this._chooseAdvanceDestination();
  }

  _chooseAdvanceDestination() {
    const player = this.game.player;
    const threat = player.eyePosition;
    if (this.hasMemory && player.alive) {
      // Take a firing position near the player's line instead of walking straight at them.
      const node = this.nav.findCover(this.enemy.position, threat, { minRange: 7, maxRange: 26, avoid: this._occupiedCover() });
      if (node && Math.random() > this.diff.aggression * 0.5) {
        this.coverNode = node;
        this._setDestination(node.position, 'cover');
        return;
      }
      const lk = this.memory.lastKnown;
      // Close to a firing distance from the last known position rather than walking into the muzzle.
      _v1.subVectors(this.enemy.position, lk);
      _v1.y = 0;
      const d = _v1.length();
      const keep = rand(9, 16);
      const stand = d > keep + 2 ? _v1.multiplyScalar(keep / d).add(lk) : this.enemy.position;
      this._setDestination(_v2.copy(stand).setY(this.enemy.position.y), 'lastKnown');
      return;
    }
    const obj = this.game.world.getObjective();
    const node = this.nav.randomNear(obj.position, 0, Math.max(3, obj.radius + 3)) || this.nav.randomNear(this.enemy.position, 6, 20);
    if (node) this._setDestination(node.position, 'objective');
    else this._clearPath();
  }

  /** Follow the current path; returns true when the destination is reached. */
  _followPath(dt, speed) {
    const p = this.path;
    if (!p) {
      this.intent.move = null;
      this.intent.speed = 0;
      return true;
    }
    p.age += dt;
    this.repathTimer -= dt;
    const pos = this.enemy.position;
    // Advance waypoints; shortcut when the next ones are directly reachable.
    while (p.index < p.points.length - 1 && pos.distanceTo(p.points[p.index]) < MOVE.waypointRadius) p.index++;
    if (this.repathTimer <= 0) {
      this.repathTimer = 0.8;
      p.index = this.nav.shortcut(pos, p.points, p.index, 3);
    }
    const target = p.points[p.index];
    const dist = Math.hypot(target.x - pos.x, target.z - pos.z);
    const last = p.index === p.points.length - 1;
    if (last && dist < MOVE.arriveRadius) {
      this.intent.move = null;
      this.intent.speed = 0;
      return true;
    }
    this.intent.move = this._movePoint.copy(target);
    this.intent.speed = speed;
    // Stuck? Re-plan from scratch toward a slightly different point.
    if (this.enemy.stuckTime > MOVE.stuckTime) {
      this.enemy.stuckTime = 0;
      const dest = this.destination;
      if (dest) {
        const alt = this.nav.randomNear(dest, 0, 6) || null;
        this._setDestination(alt ? alt.position : dest, this.destKind);
        if (this.path && this.path.points.length === 1 && alt) this.path.points.unshift(this.nav.randomNear(pos, 3, 8)?.position.clone() || alt.position.clone());
      } else this._enter('advance');
    }
    return false;
  }

  _aimAtPlayer() {
    const player = this.game.player;
    this._aimPoint.copy(player.eyePosition);
    this._aimPoint.y -= 0.32; // upper chest
    this.intent.aim = this._aimPoint;
    this.intent.face = this._facePoint.copy(player.position);
  }

  /** Burst fire control toward `target`. */
  _fireControl(dt, target, { allow, burst = null, pauseScale = 1 } = {}) {
    const f = this.fire;
    if (!allow) {
      f.rounds = 0;
      f.settle = Math.max(0, f.settle - dt * 2);
      return;
    }
    f.settle += dt;
    if (f.settle < this.diff.reaction) return;
    if (f.rounds > 0) {
      f.timer -= dt;
      if (f.timer <= 0) {
        if (!this.enemy.canShootAt(target)) return; // rifle still swinging onto the target
        this.enemy.fireRound(target, f.index++);
        f.shots++;
        f.rounds--;
        f.timer = FIRE.roundInterval;
        if (f.rounds === 0) f.pause = rand(FIRE.pauseMin, FIRE.pauseMax) * pauseScale * this.diff.pauseScale;
      }
    } else {
      f.pause -= dt;
      if (f.pause <= 0) {
        const [a, b] = burst || [this.diff.burstMin, this.diff.burstMax];
        f.rounds = randInt(a, b);
        f.index = 0;
        f.timer = 0;
      }
    }
  }

  /* ------------------------------------------------------------------------------------------ damage */

  onDamaged({ direction } = {}) {
    if (this.state === 'dead') return;
    const wasHidden = !this.memory.canSee;
    // Being shot reveals the shooter's position.
    if (this.game.player?.alive) {
      if (!this.memory.lastKnown) this.memory.lastKnown = new THREE.Vector3();
      this.memory.lastKnown.copy(this.game.player.position);
      this.memory.lastHeard = this.game.time;
    }
    if (this.flinchCooldown > 0) return;
    this.flinchCooldown = HEALTH.flinchCooldown;
    this.flinchTimer = rand(HEALTH.flinchTime[0], HEALTH.flinchTime[1]);
    this.resume = { state: this.state, stateTime: this.stateTime };
    this.state = 'flinch';
    if (direction) this.enemy.stagger(direction, HEALTH.flinchStagger);
    if (wasHidden && this.resume.state === 'cover' && this.inCover) this.peek.phase = 'hide';
  }

  /* ------------------------------------------------------------------------------------------ update */

  update(dt) {
    if (this.state === 'dead') return;
    this.stateTime += dt;
    this.flinchCooldown -= dt;
    this._perceive(dt);
    const it = this.intent;
    it.aim = null;
    it.face = null;
    const m = this.memory;
    const player = this.game.player;
    const health = this.enemy.health;

    // Low health → break for cover (once).
    if (health < HEALTH.retreatBelow && !this.retreated && this.state !== 'flinch' && this.state !== 'retreat' && player.alive) {
      this._enter('retreat');
    }

    switch (this.state) {
      case 'spawn': {
        it.move = null;
        it.speed = 0;
        this.holdTimer -= dt;
        if (this.holdTimer <= 0) this._enter('advance');
        break;
      }

      case 'advance': {
        const seeing = m.canSee;
        const arrived = this._followPath(dt, seeing && m.dist < 28 ? MOVE.walkSpeed : MOVE.runSpeed);
        if (seeing) {
          this._aimAtPlayer();
          // Shoot on the move at walking pace when the target is roughly ahead.
          this._fireControl(dt, this._aimPoint, { allow: m.dist < 30 && this.stateTime > 0.4, burst: [2, 3], pauseScale: 1.4 });
          if (m.dist < 11 || (m.dist < SENSE.preferredRange && this.destKind !== 'cover' && Math.random() < this.diff.aggression * dt)) {
            this._enter('engage');
            break;
          }
        }
        if (arrived) {
          if (this.destKind === 'cover' && this.coverNode) this._enter('cover');
          else if (seeing) this._enter('engage');
          else if (this.hasMemory && this.destKind === 'lastKnown' && this.memoryAge > 1.5) this._enter('suppress');
          else {
            // Patrol: pause briefly, look around, pick another spot near the objective.
            this.holdTimer -= dt;
            if (this.holdTimer <= 0) {
              this.holdTimer = rand(2, 5);
              this._chooseAdvanceDestination();
            }
          }
        }
        if (!arrived && !seeing && this.stateTime > 25) this._enter('advance'); // safety: never wander forever
        break;
      }

      case 'engage': {
        if (!player.alive) {
          this._enter('advance');
          break;
        }
        // Face and shoot; occasionally sidestep to a new firing spot.
        if (this.hasMemory || m.canSee) this._aimAtPlayer();
        const lost = this.game.time - m.lastSeen;
        this._fireControl(dt, this._aimPoint, { allow: m.canSee });
        this.strafeTimer -= dt;
        if (this.kneelTimer > 0) {
          this.kneelTimer -= dt;
          it.crouch = true;
        }
        if (this.path) {
          const arrived = this._followPath(dt, MOVE.walkSpeed);
          if (arrived) this._clearPath();
        } else {
          it.move = null;
          it.speed = 0;
          if (this.strafeTimer <= 0 && m.canSee) {
            this.strafeTimer = rand(2, 4.5);
            if (m.dist > 12 && this.kneelTimer <= 0 && Math.random() < 0.45) {
              this.kneelTimer = rand(2, 4); // drop to a knee and keep shooting
            } else {
              const side = Math.random() < 0.5 ? 1 : -1;
              _v1.subVectors(player.position, this.enemy.position).setY(0).normalize();
              _v2.set(-_v1.z, 0, _v1.x).multiplyScalar(side * rand(1.8, 3.2)).add(this.enemy.position);
              if (this.nav.isWalkClear(this.enemy.position, _v2)) this._setDestination(_v2, 'strafe');
            }
          }
        }
        if (!m.canSee && lost > 1.6) {
          this._enter(this.hasMemory ? 'suppress' : 'advance');
          break;
        }
        if (m.canSee && m.dist > SENSE.preferredRange && this.stateTime > 2.5 && !this.path) {
          this._enter('advance'); // too far for a plaza fight: close in / find a nearer position
          break;
        }
        if (this.stateTime > this.engageBudget && m.dist > SENSE.closeDistance) {
          const node = this.nav.findCover(this.enemy.position, player.eyePosition, { minRange: 6, maxRange: 24, avoid: this._occupiedCover() });
          if (node) {
            this.coverNode = node;
            this._setDestination(node.position, 'cover');
            this._enter('cover');
          } else this.engageBudget += rand(4, 8);
        }
        break;
      }

      case 'cover': {
        if (!player.alive) {
          this._enter('advance');
          break;
        }
        if (!this.inCover) {
          const far = this.destination ? this.enemy.position.distanceTo(this.destination) > 7 : false;
          const arrived = this._followPath(dt, far ? MOVE.runSpeed : MOVE.walkSpeed);
          if (m.canSee && m.dist < 26) {
            this._aimAtPlayer();
            this._fireControl(dt, this._aimPoint, { allow: m.dist < 22, burst: [2, 3], pauseScale: 1.5 });
          }
          if (arrived) {
            this.inCover = true;
            this.peek.phase = 'hide';
            this.peek.timer = rand(0.5, 1.1);
          }
          if (m.canSee && m.dist < SENSE.closeDistance) this._enter('engage');
          break;
        }
        // In cover: alternate hiding (crouched) and peeking (stand + fire).
        it.move = null;
        it.speed = 0;
        this.holdTimer -= dt;
        this.peek.timer -= dt;
        const hiding = this.peek.phase === 'hide';
        it.crouch = hiding;
        if (this.hasMemory || m.canSee) this._aimAtPlayer();
        if (hiding) {
          this._fireControl(dt, this._aimPoint, { allow: false });
          if (this.peek.timer <= 0) {
            this.peek.phase = 'peek';
            this.peek.timer = rand(1.6, 2.8);
          }
        } else {
          this._fireControl(dt, this._aimPoint, { allow: m.canSee });
          if (this.peek.timer <= 0) {
            if (!m.canSee) this.peek.misses++;
            else this.peek.misses = 0;
            this.peek.phase = 'hide';
            this.peek.timer = rand(1.0, 2.2) * (this.retreated ? 1.3 : 1);
          }
        }
        if (m.canSee && m.dist < SENSE.closeDistance) {
          this._enter('engage');
          break;
        }
        if (this.peek.misses >= 3 || (!this.hasMemory && this.stateTime > 6)) {
          this._enter(this.hasMemory ? 'advance' : 'advance');
          break;
        }
        if (this.holdTimer <= 0) {
          this._enter(Math.random() < this.diff.aggression ? 'engage' : 'advance');
          break;
        }
        break;
      }

      case 'retreat': {
        const arrived = this._followPath(dt, MOVE.runSpeed);
        if (m.canSee && m.dist < 14) {
          this._aimAtPlayer();
          this._fireControl(dt, this._aimPoint, { allow: true, burst: [2, 3], pauseScale: 1.6 });
        }
        if (arrived) {
          this.inCover = true;
          this.state = 'cover';
          this.stateTime = 0;
          this.peek.phase = 'hide';
          this.peek.timer = rand(1.0, 1.8);
          this.holdTimer = rand(14, 20);
        } else if (this.stateTime > 12) this._enter('engage');
        break;
      }

      case 'suppress': {
        it.move = null;
        it.speed = 0;
        this.holdTimer -= dt;
        it.aim = this._suppressPoint;
        it.face = this._facePoint.copy(this._suppressPoint);
        this._fireControl(dt, this._suppressPoint, { allow: this.hasMemory, burst: FIRE.suppressBurst, pauseScale: 1.8 });
        if (m.canSee) {
          this._enter('engage');
          break;
        }
        if (this.holdTimer <= 0 || !this.hasMemory) {
          this._enter('advance');
          break;
        }
        break;
      }

      case 'flinch': {
        it.move = null;
        it.speed = 0;
        if (this.hasMemory || m.canSee) this._aimAtPlayer();
        this.flinchTimer -= dt;
        if (this.flinchTimer <= 0) {
          const r = this.resume || { state: 'engage', stateTime: 0 };
          this.state = r.state === 'spawn' ? 'advance' : r.state;
          this.stateTime = r.stateTime;
          this.resume = null;
          if (this.state === 'advance' && !this.path) this._chooseAdvanceDestination();
        }
        break;
      }

      default:
        this._enter('advance');
    }
  }

  kill() {
    this.state = 'dead';
    this.intent.move = null;
    this.intent.speed = 0;
    this.intent.aim = null;
    this.intent.face = null;
  }
}
