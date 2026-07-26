import * as THREE from 'three';
import { Soldier } from './soldier.js';
import { makeRNG, clamp } from '../core/utils.js';

// ===========================================================================
// Enemy AI manager: wave spawning, combat behavior (advance / take cover /
// strafe / burst fire), hit-scan resolution against soldier hit volumes.
// ===========================================================================

const rng = makeRNG(30303);

const STATE = { ADVANCE: 0, COVER: 1, HOLD: 2, STRAFE: 3 };

export class EnemyManager {
  constructor(scene, physics, map, player, particles, impacts, tracers, audio) {
    this.scene = scene;
    this.physics = physics;
    this.map = map;
    this.player = player;
    this.particles = particles;
    this.impacts = impacts;
    this.tracers = tracers;
    this.audio = audio;

    this.enemies = [];
    this.kills = 0;
    this.wave = 1;
    this.spawnCooldown = 2;
    this.onKill = null;       // cb(enemy, headshot)
    this.onPlayerHit = null;  // cb(fromDir)
    this.maxAlive = 4;

    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();

    this.muzzleLight = new THREE.PointLight(0xffb45e, 0, 10, 2);
    scene.add(this.muzzleLight);
  }

  spawn(pos) {
    const soldier = new Soldier();
    soldier.root.position.copy(pos);
    this.scene.add(soldier.root);
    const e = {
      soldier,
      pos: soldier.root.position,
      vel: new THREE.Vector3(),
      yaw: rng() * Math.PI * 2,
      health: 100,
      state: STATE.ADVANCE,
      stateT: 0,
      burstLeft: 0,
      shotTimer: 0,
      pauseTimer: rng.range(0.4, 1.4),
      target: null,
      crouch: 0,
      dead: false,
      removeT: 0,
      accuracyMod: rng.range(0.85, 1.25),
    };
    this.enemies.push(e);
    return e;
  }

  pickSpawnPoint() {
    const pts = this.map.spawnPoints;
    const pp = this.player.position;
    // prefer far spawns without line of sight
    let best = null, bestScore = -1;
    for (let i = 0; i < 8; i++) {
      const p = pts[rng.int(0, pts.length - 1)];
      const d = p.distanceTo(pp);
      if (d < 22) continue;
      const eye = p.clone().setY(1.5);
      const playerEye = pp.clone().setY(1.5);
      const hidden = !this.physics.lineOfSight(eye, playerEye);
      const score = d * (hidden ? 2 : 1) - Math.abs(d - 42);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best ?? pts[0];
  }

  hitScan(origin, dir, maxDist) {
    let best = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      // Head sphere
      const headC = this._v.set(e.pos.x, e.pos.y + 1.62 - (e.crouch * 0.34), e.pos.z);
      const th = raySphere(origin, dir, headC, 0.17);
      if (th !== null && th < maxDist && (!best || th < best.dist)) {
        best = { enemy: e, dist: th, part: 'head', point: origin.clone().addScaledVector(dir, th) };
      }
      // Body cylinder
      const base = e.pos.y + 0.12;
      const top = e.pos.y + 1.5 - e.crouch * 0.3;
      const tb = rayCylinderY(origin, dir, e.pos.x, e.pos.z, 0.27, base, top);
      if (tb !== null && tb < maxDist && (!best || tb < best.dist)) {
        best = { enemy: e, dist: tb, part: 'body', point: origin.clone().addScaledVector(dir, tb) };
      }
    }
    return best;
  }

  applyDamage(e, dmg, dir) {
    if (e.dead) return 'dead-already';
    e.health -= dmg;
    e.soldier.flinch();
    if (e.health <= 0) {
      e.dead = true;
      e.soldier.startDeath(dir.x * -Math.sin(e.yaw) + dir.z * -Math.cos(e.yaw) > 0 ? 1 : -1);
      this.kills++;
      this.onKill?.(e, dmg >= 60);
      this.audio?.play('enemyDeath');
      return 'dead';
    }
    return 'hit';
  }

  /** Explosion damage in a radius (used by air strikes). */
  explosionAt(center, radius, maxDamage) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = this._v.set(e.pos.x, e.pos.y + 0.9, e.pos.z).distanceTo(center);
      if (d < radius) {
        const dmg = maxDamage * (1 - d / radius);
        const dir = this._v2.subVectors(e.pos, center).normalize();
        this.applyDamage(e, dmg, dir);
      }
    }
    // Player too
    const pd = this.player.position.clone().setY(this.player.position.y + 1).distanceTo(center);
    if (pd < radius * 0.85) {
      this.player.damage(maxDamage * 0.7 * (1 - pd / radius), null);
    }
  }

  fireAt(e, playerEye) {
    e.soldier.triggerFlash();
    this.audio?.play('enemyShot', e.pos.distanceTo(this.player.position));

    const muzzle = new THREE.Vector3();
    e.soldier.muzzle.getWorldPosition(muzzle);

    // Accuracy: worse at range, worse when player sprints, worse when enemy moving
    const dist = e.pos.distanceTo(this.player.position);
    const playerSpeedPenalty = this.player.moveSpeedNormalized * 0.7;
    const missCone = (0.010 + dist * 0.0011 + playerSpeedPenalty * 0.03) * e.accuracyMod;
    const dir = playerEye.clone().sub(muzzle).normalize();
    dir.x += (rng() - 0.5) * 2 * missCone;
    dir.y += (rng() - 0.5) * 2 * missCone;
    dir.z += (rng() - 0.5) * 2 * missCone;
    dir.normalize();

    // Does the shot hit the player? (cylinder test)
    const tp = rayCylinderY(muzzle, dir, this.player.position.x, this.player.position.z, 0.34, this.player.position.y, this.player.position.y + 1.75);
    const worldHit = this.physics.raycast(muzzle, dir, 200);
    const worldT = worldHit ? worldHit.dist : 200;

    if (tp !== null && tp < worldT) {
      const hitPoint = muzzle.clone().addScaledVector(dir, tp);
      this.tracers.fire(muzzle, hitPoint, 380);
      this.player.damage(rng.range(7, 13), dir);
      this.onPlayerHit?.(dir);
      this.audio?.play('playerHit');
    } else if (worldHit) {
      this.tracers.fire(muzzle, worldHit.point, 380);
      this.impacts.bulletImpact(worldHit.point, worldHit.normal, 'concrete');
      if (worldHit.dist > 3 && worldHit.point.distanceTo(playerEye) < 3.5) this.audio?.play('whizz');
    } else {
      this.tracers.fire(muzzle, muzzle.clone().addScaledVector(dir, 120), 380);
    }

    this.muzzleLight.position.copy(muzzle);
    this.muzzleLight.intensity = 18 + rng() * 6;
  }

  update(dt, time) {
    // ---- Spawning ----
    this.maxAlive = clamp(3 + Math.floor(this.kills / 4), 3, 9);
    const alive = this.enemies.filter((e) => !e.dead).length;
    this.spawnCooldown -= dt;
    if (alive < this.maxAlive && this.spawnCooldown <= 0 && !this.player.dead) {
      this.spawn(this.pickSpawnPoint());
      this.spawnCooldown = rng.range(1.4, 3.2);
    }

    const playerEye = this._v2.set(this.player.position.x, this.player.position.y + 1.55, this.player.position.z).clone();
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 220);

    // ---- Per-enemy behavior ----
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.dead) {
        e.removeT += dt;
        e.soldier.update(dt, 0, 0, 0);
        if (e.removeT > 9) {
          this.scene.remove(e.soldier.root);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      const toPlayer = this._v.subVectors(this.player.position, e.pos);
      const dist = toPlayer.length();
      const eye = e.pos.clone().setY(e.pos.y + 1.55);
      const hasLOS = dist < 70 && this.physics.lineOfSight(eye, playerEye);

      e.stateT -= dt;

      // ---- State transitions ----
      if (e.stateT <= 0) {
        if (!hasLOS) {
          e.state = STATE.ADVANCE;
          e.stateT = rng.range(1.2, 2.4);
        } else if (dist > 34) {
          e.state = rng.chance(0.6) ? STATE.ADVANCE : STATE.HOLD;
          e.stateT = rng.range(1.2, 2.6);
        } else if (dist < 9) {
          e.state = STATE.STRAFE;
          e.stateT = rng.range(0.8, 1.6);
          e.strafeDir = rng.chance(0.5) ? 1 : -1;
        } else {
          const roll = rng();
          if (roll < 0.38) { e.state = STATE.HOLD; e.stateT = rng.range(1.4, 2.8); }
          else if (roll < 0.62) { e.state = STATE.STRAFE; e.stateT = rng.range(0.7, 1.5); e.strafeDir = rng.chance(0.5) ? 1 : -1; }
          else if (roll < 0.85) { e.state = STATE.ADVANCE; e.stateT = rng.range(0.8, 1.8); }
          else {
            e.state = STATE.COVER;
            e.stateT = rng.range(2.0, 3.6);
            e.target = this.nearestCover(e.pos);
          }
        }
      }

      // ---- Movement intent ----
      let moveDir = null;
      let crouchTarget = 0;
      const fwd = toPlayer.clone().setY(0).normalize();
      switch (e.state) {
        case STATE.ADVANCE:
          if (dist > 7) moveDir = fwd.clone();
          break;
        case STATE.STRAFE:
          moveDir = new THREE.Vector3(-fwd.z * e.strafeDir, 0, fwd.x * e.strafeDir);
          break;
        case STATE.COVER:
          if (e.target && e.pos.distanceTo(e.target) > 1.2) {
            moveDir = e.target.clone().sub(e.pos).setY(0).normalize();
          } else {
            crouchTarget = 0.8;
          }
          break;
        case STATE.HOLD:
          crouchTarget = hasLOS && dist < 22 ? 0.45 : 0;
          break;
      }

      // Obstacle avoidance feelers + enemy separation
      if (moveDir) {
        const feelOrigin = e.pos.clone().setY(0.9);
        const blocked = this.physics.raycast(feelOrigin, moveDir, 1.4);
        if (blocked) {
          const side = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
          const leftBlocked = this.physics.raycast(feelOrigin, side, 1.6);
          moveDir = leftBlocked ? side.multiplyScalar(-1) : side;
        }
        for (const o of this.enemies) {
          if (o === e || o.dead) continue;
          const d2 = e.pos.distanceToSquared(o.pos);
          if (d2 < 3.4) {
            moveDir.add(e.pos.clone().sub(o.pos).setY(0).normalize().multiplyScalar(0.8));
          }
        }
        moveDir.normalize();
      }

      // ---- Integrate movement ----
      const speed = e.state === STATE.ADVANCE && !hasLOS ? 4.4 : 3.0;
      if (moveDir) {
        e.vel.x = moveDir.x * speed;
        e.vel.z = moveDir.z * speed;
      } else {
        e.vel.x *= Math.max(0, 1 - dt * 10);
        e.vel.z *= Math.max(0, 1 - dt * 10);
      }
      e.vel.y -= 14 * dt;
      e.pos.addScaledVector(e.vel, dt);
      const res = this.physics.collideCapsule(e.pos, 0.34, 1.75);
      if (res.onGround && e.vel.y < 0) e.vel.y = 0;

      // Face the player (or movement direction when no LOS). The soldier
      // model faces -Z at yaw 0, so facing dir f solves (-sin y, -cos y) = f.
      const faceTarget = hasLOS || dist < 26 ? fwd : (moveDir ?? fwd);
      const targetYaw = Math.atan2(-faceTarget.x, -faceTarget.z);
      let dy = targetYaw - e.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      e.yaw += clamp(dy, -dt * 7, dt * 7);
      e.soldier.root.rotation.y = e.yaw;

      e.crouch += clamp(crouchTarget - e.crouch, -dt * 4, dt * 4);

      // ---- Firing ----
      if (hasLOS && !this.player.dead && dist > 2.5) {
        if (e.burstLeft > 0) {
          e.shotTimer -= dt;
          if (e.shotTimer <= 0) {
            this.fireAt(e, playerEye);
            e.burstLeft--;
            e.shotTimer = 0.105;
            if (e.burstLeft === 0) e.pauseTimer = rng.range(0.7, 1.9);
          }
        } else {
          e.pauseTimer -= dt;
          if (e.pauseTimer <= 0) {
            e.burstLeft = rng.int(3, 6);
            e.shotTimer = rng.range(0, 0.1);
          }
        }
      }

      // Aim pitch toward player for pose
      const aimPitch = Math.atan2(playerEye.y - (e.pos.y + 1.4), Math.max(dist, 0.1));
      const moveSpeed = Math.hypot(e.vel.x, e.vel.z);
      // Local-space velocity so the soldier can lean into his run direction
      const sinY = Math.sin(e.yaw), cosY = Math.cos(e.yaw);
      const fwdVel = -e.vel.x * sinY - e.vel.z * cosY;
      const sideVel = e.vel.x * cosY - e.vel.z * sinY;
      // Weapon-ready weight: shouldered while firing / about to fire,
      // low-ready while watching, slung-low patrol carry without LOS.
      const aimW = hasLOS ? (e.burstLeft > 0 || e.pauseTimer < 0.45 ? 1 : 0.25) : 0;
      e.soldier.update(dt, moveSpeed, e.crouch, aimPitch, {
        fwd: fwdVel, side: sideVel, alert: aimW,
      });
    }
  }

  nearestCover(pos) {
    let best = null, bestD = 1e9;
    for (const c of this.map.coverSpots) {
      const d = c.distanceToSquared(pos);
      if (d < bestD && d > 4) { bestD = d; best = c; }
    }
    return best ? best.clone() : null;
  }
}

// ---- Ray primitive helpers -------------------------------------------------
function raySphere(origin, dir, center, radius) {
  const ox = origin.x - center.x, oy = origin.y - center.y, oz = origin.z - center.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : null;
}

function rayCylinderY(origin, dir, cx, cz, radius, yMin, yMax) {
  const ox = origin.x - cx, oz = origin.z - cz;
  const a = dir.x * dir.x + dir.z * dir.z;
  if (a < 1e-9) return null;
  const b = ox * dir.x + oz * dir.z;
  const c = ox * ox + oz * oz - radius * radius;
  const disc = b * b - a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / a;
  if (t <= 0) return null;
  const y = origin.y + dir.y * t;
  if (y < yMin || y > yMax) return null;
  return t;
}
