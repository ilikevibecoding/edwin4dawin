import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { DEATH, FIRE, GROUP_ENEMY_BODY, HEALTH, MOVE } from './constants.js';
import { EnemyBrain } from './EnemyBrain.js';
import { Hitboxes } from './Hitboxes.js';
import { SoldierModel, wrapAngle } from './SoldierModel.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);

/**
 * One AI soldier: visuals (SoldierModel), kinematic movement capsule, bone hitboxes and a brain.
 * Public shape (used by Combat / GameMode / HUD / Killstreaks):
 *   { id, position (Vector3, feet), alive, health, object (Object3D), team, state }
 */
export class Enemy {
  constructor(manager, { id, position, yaw = 0, wave = 1, scripted = null }) {
    this.manager = manager;
    this.game = manager.game;
    this.id = id;
    this.team = 'red';
    this.alive = true;
    this.health = HEALTH.max;
    this.maxHealth = HEALTH.max;
    this.wave = wave;
    this.model = new SoldierModel(this.game, manager.shared, { tint: Math.random(), seed: Math.random() });
    this.object = this.model.root;
    this.object.position.copy(position);
    this.position = this.object.position; // feet, world
    this.yaw = yaw;
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.stuckTime = 0;
    this.grounded = false;
    this.spawnTime = this.game.time;
    this.shotsFired = 0;
    this.hits = 0;
    this.deathTime = 0;
    this.disposed = false;
    this.scripted = scripted; // debug: { speed, yaw, aim, crouch, move } bypasses the brain
    this._stagger = new THREE.Vector3();
    this._anchors = [];
    this._eye = new THREE.Vector3();
    this._muzzle = new THREE.Vector3();
    this._worldFilter = groups(GROUP.ALL, GROUP.WORLD);

    const physics = this.game.physics;
    this.character = physics.createCharacter({
      position: new THREE.Vector3(position.x, position.y + MOVE.capsuleHalfHeight + MOVE.capsuleRadius, position.z),
      radius: MOVE.capsuleRadius,
      halfHeight: MOVE.capsuleHalfHeight,
      membership: GROUP.ENEMY,
      filter: GROUP.WORLD,
      data: { type: 'enemy_body', entity: this, surface: 'flesh' },
    });
    // Bullets must reach the bone hitboxes: keep the capsule out of the ENEMY group (see constants.js).
    this.character.collider.setCollisionGroups(groups(GROUP_ENEMY_BODY, GROUP.WORLD));
    // Curbs yes, planters/doorsteps against façades no — climbing those wedges the capsule in corners.
    this.character.controller.enableAutostep(MOVE.stepHeight, 0.2, true);
    this._avoid = new THREE.Vector3();
    this._avoidSide = Math.random() < 0.5 ? 1 : -1;
    this.hardStuckTime = 0;

    manager.root.add(this.object);
    this.model.update(0, 0, yaw);
    this.model.getAnchors(this._anchors);
    this.hitboxes = new Hitboxes(physics, this, this._anchors);
    this.brain = scripted ? null : new EnemyBrain(this, { wave });
  }

  get state() {
    if (!this.alive) return 'dead';
    return this.brain ? this.brain.state : 'scripted';
  }

  /* ----------------------------------------------------------------------------------------- perception helpers */

  getEye(out = this._eye) {
    return this.model.getEye(out);
  }

  /** True when the rifle points close enough to `target` to fire without the tracer looking wrong. */
  canShootAt(target) {
    const muzzle = this.model.getMuzzle(_v1);
    _v2.subVectors(target, muzzle);
    const d = _v2.length();
    if (d < 0.5) return true;
    _v2.multiplyScalar(1 / d);
    return this.model.rifleForward.dot(_v2) > Math.cos(FIRE.aimTolerance) && this.model.aimBlend > 0.75;
  }

  /* ----------------------------------------------------------------------------------------- combat */

  /** Fire one round toward `target` (world point). `index` = position in the current burst. */
  fireRound(target, index = 0) {
    const { combat, player } = this.game;
    const origin = this.model.getMuzzle(this._muzzle).clone();
    const dir = _v1.subVectors(target, origin);
    const dist = dir.length();
    if (dist < 0.01) return;
    dir.multiplyScalar(1 / dist);
    // Accuracy: base spread, worse at range and against moving targets, tighter when the player stands still.
    const playerSpeed = player ? Math.hypot(player.velocity.x, player.velocity.z) : 0;
    const moving = playerSpeed > 1.2 ? FIRE.movingTargetSpread : playerSpeed < 0.3 ? FIRE.stillTargetSpread : 1;
    const diff = this.brain ? this.brain.diff : { spread: 1, damage: 1 };
    const spread = (FIRE.baseSpread + FIRE.spreadPerMeter * dist) * moving * diff.spread * (1 + FIRE.burstGrowth * index);
    const damage = rand(FIRE.damageMin, FIRE.damageMax) * (diff.damage || 1);
    this.shotsFired++;
    this.manager.stats.shots++;
    const direction = dir.clone();
    this.game.events.emit('enemy:fire', { enemy: this, origin, direction });
    const hit = combat.fireRay({ origin, direction, damage, spread, source: 'enemy', shooter: this });
    if (hit && hit.data?.type === 'player') {
      this.hits++;
      this.manager.stats.hits++;
    }
    this.model.recoil(1);
    this.manager.fx?.flash(origin, this.model.rifleForward);
  }

  /** Small knock-back used by the flinch reaction. */
  stagger(direction, amount = HEALTH.flinchStagger) {
    this._stagger.set(direction.x, 0, direction.z);
    if (this._stagger.lengthSq() > 1e-6) this._stagger.normalize().multiplyScalar(amount * 6);
  }

  /** Apply damage; returns true if this killed the soldier. Events are emitted by Enemies.damage(). */
  applyDamage(amount, info) {
    if (!this.alive) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die(info);
      return true;
    }
    this.brain?.onDamaged(info);
    return false;
  }

  die({ direction = null, headshot = false } = {}) {
    if (!this.alive) return;
    this.alive = false;
    this.deathTime = 0;
    this.brain?.kill();
    this.hitboxes.remove();
    this.character.remove();
    this.character = null;
    const chest = this.model.getChest(_v3);
    const physics = this.game.physics;
    const filter = this._worldFilter;
    this.model.startDeath({
      direction,
      headshot,
      groundAt: (x, z) => this.manager.groundHeight(x, z, this.position.y),
      blockedAt: (dir, dist) => !!physics.raycast(chest, dir, dist, { filter }),
    });
    this._dropRifle(direction);
  }

  _dropRifle(direction) {
    const rifle = this.model.rifle;
    const physics = this.game.physics;
    rifle.updateWorldMatrix(true, false);
    const pos = rifle.getWorldPosition(new THREE.Vector3());
    const quat = rifle.getWorldQuaternion(new THREE.Quaternion());
    this.game.scene.attach(rifle);
    const push = direction ? _v4.set(direction.x, 0, direction.z).normalize() : _v4.set(0, 0, 0);
    this.rifleBody = physics.addDynamicBody({
      position: pos,
      quaternion: quat,
      shape: { type: 'box', hx: 0.035, hy: 0.06, hz: 0.42 },
      mass: 3.6,
      friction: 0.7,
      restitution: 0.15,
      linvel: { x: push.x * rand(0.6, 1.4), y: rand(0.4, 1.0), z: push.z * rand(0.6, 1.4) },
      angvel: { x: rand(-3, 3), y: rand(-2, 2), z: rand(-3, 3) },
      angularDamping: 0.6,
      linearDamping: 0.1,
      object: rifle,
      data: { surface: 'metal', kind: 'rifle' },
    });
  }

  /* ----------------------------------------------------------------------------------------- update */

  update(dt) {
    if (this.disposed) return;
    if (!this.alive) {
      this.deathTime += dt;
      this.model.update(dt, 0, this.yaw);
      if (this.deathTime > DEATH.bodyTime) {
        const t = (this.deathTime - DEATH.bodyTime) / DEATH.sinkTime;
        if (t >= 1) this.dispose();
        else this.model.setSink(t);
      }
      return;
    }
    if (dt <= 0) {
      this.model.update(0, this.speed, this.yaw);
      return;
    }

    let intent;
    if (this.brain) {
      this.brain.update(dt);
      intent = this.brain.intent;
    } else intent = this._scriptedIntent();

    this._move(dt, intent);
    this.model.crouchTarget = intent.crouch ? 1 : 0;
    this.model.setAim(intent.aim);
    this.model.update(dt, this.speed, this.yaw);
    this.model.getAnchors(this._anchors);
    this.hitboxes.sync(this._anchors);
  }

  _scriptedIntent() {
    const s = this.scripted || {};
    return { move: s.move || null, speed: s.speed || 0, aim: s.aim || null, face: s.face || null, crouch: !!s.crouch };
  }

  _move(dt, intent) {
    const pos = this.position;
    const desired = _v1.set(0, 0, 0);
    let desiredSpeed = 0;
    if (intent.move && intent.speed > 0) {
      _v2.set(intent.move.x - pos.x, 0, intent.move.z - pos.z);
      const dist = _v2.length();
      if (dist > 0.05) {
        _v2.multiplyScalar(1 / dist);
        desiredSpeed = Math.min(intent.speed, Math.max(0.6, dist * 2.5));
        desired.copy(_v2).multiplyScalar(desiredSpeed);
      }
    }
    // Separation from other soldiers and the player (soft, steering-only).
    for (const other of this.manager.list) {
      if (other === this || !other.alive) continue;
      _v3.set(pos.x - other.position.x, 0, pos.z - other.position.z);
      const d = _v3.length();
      if (d < MOVE.separationRadius && d > 1e-3) desired.addScaledVector(_v3.multiplyScalar(1 / d), (1 - d / MOVE.separationRadius) * MOVE.separationForce);
    }
    const player = this.game.player;
    if (player) {
      _v3.set(pos.x - player.position.x, 0, pos.z - player.position.z);
      const d = _v3.length();
      if (d < MOVE.playerSeparationRadius && d > 1e-3) desired.addScaledVector(_v3.multiplyScalar(1 / d), (1 - d / MOVE.playerSeparationRadius) * MOVE.separationForce * 1.5);
    }
    if (this._stagger.lengthSq() > 1e-4) {
      desired.add(this._stagger);
      this._stagger.multiplyScalar(Math.max(0, 1 - dt * 9));
    }
    // Whisker: a wall / planter / corner ahead pushes the steering along its surface (the capsule
    // controller only slides, it never walks around a corner it is pressed into).
    if (desiredSpeed > 0.3) {
      const len = desired.length();
      if (len > 1e-3) {
        _v3.copy(desired).multiplyScalar(1 / len);
        _v4.set(pos.x, pos.y + 0.9, pos.z);
        const hit = this.game.physics.raycast(_v4, _v3, MOVE.whiskerRange, { filter: this._worldFilter });
        if (hit) {
          const w = 1 - hit.distance / MOVE.whiskerRange;
          const n = hit.normal;
          // Slide direction: the tangent that keeps a consistent side so we do not dither in corners.
          _v4.set(-n.z, 0, n.x).multiplyScalar(this._avoidSide);
          if (_v4.dot(_v3) < -0.2) _v4.negate();
          desired.addScaledVector(_v4, w * desiredSpeed * 1.2).addScaledVector(_v3.set(n.x, 0, n.z), w * desiredSpeed * 0.8);
        }
      }
    }
    const maxSpeed = Math.max(desiredSpeed, this._stagger.length()) + 0.8;
    if (desired.length() > maxSpeed) desired.setLength(maxSpeed);

    // Horizontal velocity → desired (accelerate / brake).
    const rate = desired.lengthSq() > this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z ? MOVE.accel : MOVE.decel;
    const k = Math.min(1, dt * rate);
    this.velocity.x += (desired.x - this.velocity.x) * k;
    this.velocity.z += (desired.z - this.velocity.z) * k;
    // Gravity / ground snap.
    if (!this.grounded) this.velocity.y = Math.max(this.velocity.y - MOVE.gravity * dt, -20);
    else this.velocity.y = -1.5;

    _v2.copy(this.velocity).multiplyScalar(dt);
    const moved = this.character.move(_v2);
    this.grounded = this.character.grounded;
    if (this.grounded && this.velocity.y < 0) this.velocity.y = 0;
    const center = this.character.getPosition(_v3);
    const nx = center.x + moved.x;
    const ny = center.y + moved.y - (MOVE.capsuleHalfHeight + MOVE.capsuleRadius);
    const nz = center.z + moved.z;
    if (Number.isFinite(nx + ny + nz)) pos.set(nx, ny, nz);

    const hSpeed = Math.hypot(moved.x, moved.z) / dt;
    this.speed += (Math.min(hSpeed, MOVE.runSpeed * 1.2) - this.speed) * Math.min(1, dt * 12);
    if (desiredSpeed > 0.5 && hSpeed < desiredSpeed * MOVE.stuckSpeedRatio) {
      this.stuckTime += dt;
      this.hardStuckTime += dt;
      if (this.hardStuckTime > MOVE.hardStuckTime) this._unstick();
    } else {
      this.stuckTime = Math.max(0, this.stuckTime - dt * 2);
      this.hardStuckTime = 0;
    }

    // Body yaw: follow the movement direction while moving, otherwise turn toward the face point.
    let targetYaw = this.yaw;
    let turnRate = MOVE.turnRate;
    const moving = hSpeed > 0.6 && desiredSpeed > 0.3;
    if (moving) targetYaw = Math.atan2(-this.velocity.x, -this.velocity.z);
    else if (intent.face) {
      targetYaw = Math.atan2(-(intent.face.x - pos.x), -(intent.face.z - pos.z));
      turnRate = MOVE.aimTurnRate;
    } else if (intent.aim) {
      targetYaw = Math.atan2(-(intent.aim.x - pos.x), -(intent.aim.z - pos.z));
      turnRate = MOVE.aimTurnRate;
    }
    const dYaw = wrapAngle(targetYaw - this.yaw);
    const maxStep = turnRate * dt;
    this.yaw = wrapAngle(this.yaw + THREE.MathUtils.clamp(dYaw, -maxStep, maxStep));
  }

  /**
   * Last resort when the capsule is wedged (corner + ledge): hop to the nearest clear nav node. A 1–3 m
   * pop is invisible at engagement range and beats a soldier frozen against a wall.
   */
  _unstick() {
    this.hardStuckTime = 0;
    this.stuckTime = 0;
    this._avoidSide = -this._avoidSide;
    const node = this.manager.nav?.nearest(this.position, { maxDist: 6 });
    if (!node || !this.character) return;
    const p = node.position;
    const gy = this.manager.groundHeight(p.x, p.z, p.y);
    this.character.teleport(_v2.set(p.x, gy + MOVE.capsuleHalfHeight + MOVE.capsuleRadius, p.z));
    this.position.set(p.x, gy, p.z);
    this.velocity.set(0, 0, 0);
    this.brain?.replan();
    this.manager.stats.unsticks++;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.alive) {
      this.alive = false;
      this.hitboxes.remove();
      this.character?.remove();
      this.character = null;
    }
    if (this.rifleBody) {
      this.game.physics.removeBody(this.rifleBody);
      this.rifleBody = null;
    }
    this.model.rifle.removeFromParent();
    this.model.dispose();
    this.manager._onDisposed(this);
  }
}
