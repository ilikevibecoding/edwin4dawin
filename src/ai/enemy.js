// Enemy AI (Opus 3 domain): perception (vision cone + LOS + hearing), suspicion, patrol,
// investigation, combat with bursts/strafing/reload/cover, search after losing contact,
// navigation recovery, flash reaction. Kinematic movement through the collision world.
import * as THREE from 'three';
import { moveCharacter } from '../core/collide.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { CharacterRig } from '../characters/humanoid.js';
import { fireHitscan } from '../weapons/ballistics.js';
import { WEAPONS } from '../weapons/defs.js';

const TYPES = {
  scout:   { hp: 70, speed: 3.3, weapon: 'boreal-k5', acc: 0.85, burst: [3, 6], damage: 8 },
  trooper: { hp: 110, speed: 2.9, weapon: 'halcyon-hc4', acc: 1.0, burst: [2, 4], damage: 11 },
  heavy:   { hp: 170, speed: 2.35, weapon: 'vanta-s12', acc: 0.9, burst: [1, 1], damage: 7 },
};

const RADIUS = 0.34;
const HEIGHT = 1.76;
const EYE = 1.6;

let nextId = 1;

export class Enemy {
  constructor(mission, spec, diff) {
    this.mission = mission;
    this.id = spec.id || 'enemy-' + nextId++;
    this.type = spec.type;
    this.conf = TYPES[spec.type] || TYPES.trooper;
    this.diff = diff;
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
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.waitT = 0;
    this.burstLeft = 0;
    this.fireCooldown = 0;
    this.aimDelay = 0;
    this.mag = WEAPONS[this.conf.weapon].magSize;
    this.reloadT = 0;
    this.searchT = 0;
    this.searchSpots = [];
    this.flashT = 0;
    this.stuckT = 0;
    this.lastPos = this.pos.clone();
    this.strafeDir = 0;
    this.strafeT = 0;
    this.frozen = false;
    this.guardYaw = THREE.MathUtils.degToRad(spec.yawDeg ?? 0);
    this.scanPhase = mission.rng.next() * 6;

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
  }

  capsule() {
    return { x: this.pos.x, z: this.pos.z, y0: this.pos.y, y1: this.pos.y + HEIGHT, r: RADIUS + 0.03 };
  }

  eye(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + EYE, this.pos.z); }

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
      audio.voice('hostileAlert', this.pos);
      bus.emit('enemy-killed', { id: this.id, pos: this.pos.clone(), region });
      return;
    }
    // getting shot reveals the shooter's rough position
    if (fromPos) {
      this.lastKnown = new THREE.Vector3(fromPos.x, fromPos.y - 1.2, fromPos.z);
      this._enterCombat(false);
    }
  }

  applyFlash(strength) {
    if (!this.alive) return;
    this.flashT = Math.max(this.flashT, strength * 3.4);
    bus.emit('enemy-flashed', { id: this.id });
  }

  hearNoise(noise) {
    if (!this.alive || this.frozen || this.flashT > 0) return;
    const d = this.pos.distanceTo(noise.pos);
    // walls muffle: check sight-blocking geometry between
    const blocked = !this._clearSight(this.eye(), new THREE.Vector3(noise.pos.x, (noise.pos.y ?? this.pos.y) + 1.2, noise.pos.z));
    const effective = noise.radius * this.diff.hearingRadius * (blocked ? 0.55 : 1);
    if (d > effective) return;
    const loud = noise.type === 'gunshot' || noise.type === 'glass' || noise.type === 'flash';
    const p = new THREE.Vector3(noise.pos.x, noise.pos.y ?? this.pos.y, noise.pos.z);
    if (this.state === 'combat') {
      if (loud) this.lastKnown = p;
      return;
    }
    this.suspicion = Math.min(1, this.suspicion + (loud ? 0.65 : 0.3));
    if (loud || this.suspicion > 0.4) {
      this.investigatePos = p;
      if (this.state !== 'investigate' || loud) {
        this.state = 'investigate';
        this.path = null;
        this.waitT = 0.2 + this.mission.rng.next() * 0.8; // reaction stagger
        if (loud) audio.voice('hostileAlert', this.pos);
      }
    }
  }

  _clearSight(from, to) {
    const d = new THREE.Vector3().subVectors(to, from);
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
    const eye = this.eye();
    const pEye = new THREE.Vector3(player.pos.x, player.eyeY - 0.1, player.pos.z);
    const to = new THREE.Vector3().subVectors(pEye, eye);
    const dist = to.length();
    const range = 26 * this.diff.visionRange;
    if (dist > range) return 0;
    to.normalize();
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const dot = fwd.dot(new THREE.Vector3(to.x, 0, to.z).normalize());
    const fovCos = Math.cos(THREE.MathUtils.degToRad(60));
    if (dot < fovCos && dist > 1.6) return 0;
    if (this.mission.vfx.isSmoked(eye, pEye)) return 0;
    if (!this._clearSight(eye, pEye)) {
      // also try chest (peek over low cover situations)
      const chest = new THREE.Vector3(player.pos.x, player.pos.y + 0.9, player.pos.z);
      if (!this._clearSight(eye, chest)) return 0;
    }
    let exposure = THREE.MathUtils.clamp(1.35 - dist / range, 0.12, 1);
    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    if (hSpeed > 2.4) exposure *= 1.5;
    else if (player.crouched && hSpeed < 0.6) exposure *= 0.55;
    if (dist < 5) exposure = Math.max(exposure, 1.4);
    return exposure;
  }

  _enterCombat(shout = true) {
    if (this.state === 'combat' || !this.alive) return;
    this.state = 'combat';
    this.suspicion = 1;
    this.aimDelay = 0.28 * this.diff.enemyReaction + this.mission.rng.next() * 0.25;
    this.path = null;
    this.strafeT = 0;
    if (shout) audio.voice('hostileCombat', this.pos);
    bus.emit('enemy-alerted', { id: this.id });
  }

  update(dt) {
    if (!this.alive) { this.rig.update(dt, 0); return; }
    if (this.frozen) { this.rig.update(dt, 0); return; }
    const rng = this.mission.rng;
    const player = this.mission.player;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.repathT -= dt;

    // ---------- perception ----------
    if (this.flashT <= 0) {
      const exposure = this._seePlayer();
      if (exposure > 0) {
        this.losTimer = 0;
        this.lastKnown = new THREE.Vector3(player.pos.x, player.pos.y, player.pos.z);
        const gain = (1.7 / Math.max(0.4, this.diff.enemyReaction)) * exposure;
        this.suspicion = Math.min(1.2, this.suspicion + gain * dt);
        if (this.suspicion >= 1) this._enterCombat();
        else if (this.suspicion > 0.42 && this.state !== 'combat' && this.state !== 'investigate') {
          this.state = 'investigate';
          this.investigatePos = this.lastKnown.clone();
          this.path = null;
          this.waitT = 0.15;
        }
      } else {
        this.losTimer += dt;
        if (this.state !== 'combat') this.suspicion = Math.max(0, this.suspicion - dt * 0.16);
      }
    } else {
      this.losTimer += dt;
    }

    // ---------- state behaviors ----------
    let wantMove = null;
    let runSpeed = this.conf.speed;
    let aiming = false;

    switch (this.state) {
      case 'guard': {
        this.scanPhase += dt * 0.5;
        this.yaw = this.guardYaw + Math.sin(this.scanPhase) * 0.7;
        break;
      }
      case 'patrol': {
        runSpeed = this.conf.speed * 0.42;
        const wp = this.patrol[this.patrolIdx];
        const target = new THREE.Vector3(wp[0], wp[1], wp[2]);
        if (this.pos.distanceTo(target) < 0.6) {
          this.waitT = 1.2 + rng.next() * 2.4;
          this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
          this.path = null;
          this.state = 'patrol-wait';
        } else {
          wantMove = target;
        }
        break;
      }
      case 'patrol-wait': {
        this.waitT -= dt;
        this.scanPhase += dt * 0.4;
        this.yaw += Math.sin(this.scanPhase) * dt * 0.5;
        if (this.waitT <= 0) this.state = 'patrol';
        break;
      }
      case 'investigate': {
        if (this.waitT > 0) { this.waitT -= dt; break; }
        runSpeed = this.conf.speed * (this.suspicion > 0.7 ? 0.9 : 0.55);
        const p = this.investigatePos || this.lastKnown;
        if (!p || this.pos.distanceTo(p) < 1.2) {
          this.searchT = 4 + rng.next() * 3;
          this.state = 'search';
          this.searchSpots = [];
          this.path = null;
        } else {
          wantMove = p;
        }
        break;
      }
      case 'search': {
        this.searchT -= dt;
        if (this.searchT <= 0) {
          if (this.suspicion > 0.5) {
            // extend the search around
            const center = this.lastKnown || this.pos;
            const idx = this.mission.nav.randomNodeNear(center.x, center.y, center.z, 7, rng);
            if (idx >= 0) {
              const n = this.mission.nav.nodes[idx];
              this.investigatePos = new THREE.Vector3(n.x, n.y, n.z);
              this.state = 'investigate';
              this.suspicion -= 0.25;
              this.path = null;
              break;
            }
          }
          this.state = this.patrol.length > 1 ? 'patrol' : 'guard';
          this.suspicion = 0;
          this.path = null;
          break;
        }
        this.scanPhase += dt;
        this.yaw += Math.sin(this.scanPhase * 1.7) * dt * 1.4;
        break;
      }
      case 'combat': {
        aiming = true;
        const seen = this.losTimer < 0.35;
        const targetPos = seen ? new THREE.Vector3(player.pos.x, player.pos.y, player.pos.z) : this.lastKnown;
        if (targetPos) {
          const d = new THREE.Vector3().subVectors(targetPos, this.pos);
          const dist = d.length();
          const face = Math.atan2(-d.x, -d.z);
          this.yaw = dampAngle(this.yaw, face, 14, dt);
          this.rig.aimPitch = THREE.MathUtils.clamp(Math.atan2((player.eyeY - 0.2) - (this.pos.y + 1.4), Math.hypot(d.x, d.z)), -0.6, 0.6);

          if (this.reloadT > 0) {
            this.reloadT -= dt;
            if (this.reloadT <= 0) { this.mag = WEAPONS[this.conf.weapon].magSize; audio.mech('magin', this.pos); }
            // move to cover while reloading
            if (this.coverPos) wantMove = this.coverPos;
            runSpeed = this.conf.speed;
            aiming = false;
          } else if (seen) {
            this.aimDelay -= dt;
            const idealRange = this.conf.weapon === 'vanta-s12' ? 7 : 14;
            // strafe rhythm & spacing
            this.strafeT -= dt;
            if (this.strafeT <= 0) {
              this.strafeT = 0.7 + rng.next() * 1.1;
              this.strafeDir = rng.next() < 0.5 ? -1 : 1;
              if (rng.next() < 0.25) this.strafeDir = 0;
            }
            if (dist > idealRange * 1.5) {
              wantMove = targetPos;
              runSpeed = this.conf.speed * 0.85;
            } else if (dist < idealRange * 0.4) {
              // back up while firing
              const back = this.pos.clone().addScaledVector(d.normalize(), -2.2);
              wantMove = back;
              runSpeed = this.conf.speed * 0.6;
            } else if (this.strafeDir !== 0) {
              const right = new THREE.Vector3(-d.z, 0, d.x).normalize();
              wantMove = this.pos.clone().addScaledVector(right, this.strafeDir * 1.6);
              runSpeed = this.conf.speed * 0.5;
            }
            // firing
            if (this.aimDelay <= 0 && this.fireCooldown <= 0 && this.flashT <= 0) {
              this._fireAt(player, dist);
            }
          } else {
            // lost sight: push to last known
            if (this.losTimer > 2.2 && targetPos) {
              wantMove = targetPos;
              runSpeed = this.conf.speed * 0.9;
              if (this.pos.distanceTo(targetPos) < 1.4) {
                this.state = 'search';
                this.searchT = 5 + rng.next() * 4;
                this.suspicion = 0.9;
                audio.voice('hostileAlert', this.pos);
              }
            }
          }
        }
        break;
      }
    }

    // ---------- movement via nav path ----------
    let speedNow = 0;
    if (wantMove && this.flashT <= 0) {
      // NS-7: the backoff must gate re-pathing even when the path is null, or clamp-guard
      // path resets cause dozens of A* requests per second per enemy.
      if (this.repathT <= 0) {
        this.path = this.mission.findPath(this.pos, wantMove);
        this.pathIdx = 0;
        this.repathT = 0.9 + rng.next() * 0.7;
      }
      if (this.path && this.path.length) {
        let wp = this.path[this.pathIdx];
        while (wp && Math.hypot(wp.x - this.pos.x, wp.z - this.pos.z) < 0.42 && Math.abs(wp.y - this.pos.y) < 1) {
          this.pathIdx++;
          wp = this.path[this.pathIdx];
        }
        if (wp) {
          const dir = new THREE.Vector3(wp.x - this.pos.x, 0, wp.z - this.pos.z);
          const dl = dir.length();
          if (dl > 0.01) {
            dir.normalize();
            // open doors ahead
            this._maybeOpenDoor(dir);
            const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
              { x: dir.x * runSpeed * dt, y: -9 * dt, z: dir.z * runSpeed * dt },
              { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy' });
            const jump = Math.hypot(step.pos.x - this.pos.x, step.pos.z - this.pos.z);
            if (jump > 0.5) {
              // safety net: never accept a clamp-teleport; repath instead
              this.path = null;
              this.repathT = 0.2;
            } else {
              this.pos.set(step.pos.x, step.pos.y, step.pos.z);
            }
            speedNow = runSpeed;
            if (!aiming) {
              const face = Math.atan2(-dir.x, -dir.z);
              this.yaw = dampAngle(this.yaw, face, 10, dt);
            }
          }
        } else {
          this.path = null;
        }
      }
      // stuck recovery
      if (this.pos.distanceTo(this.lastPos) < 0.05 * (runSpeed / 3)) this.stuckT += dt;
      else this.stuckT = 0;
      if (this.stuckT > 1.6) {
        this.stuckT = 0;
        this.path = null;
        this.repathT = 0;
        const idx = this.mission.nav.randomNodeNear(this.pos.x, this.pos.y, this.pos.z, 3.5, rng);
        if (idx >= 0) {
          const n = this.mission.nav.nodes[idx];
          this.pos.x += (n.x - this.pos.x) * 0.08;
          this.pos.z += (n.z - this.pos.z) * 0.08;
        }
      }
    } else {
      // idle gravity settle
      const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
        { x: 0, y: -9 * dt, z: 0 }, { filter: (c) => c.tag !== 'enemy' });
      this.pos.set(step.pos.x, step.pos.y, step.pos.z);
    }
    this.lastPos.copy(this.pos);

    // ---------- rig sync ----------
    this.rig.group.position.copy(this.pos);
    this.rig.group.rotation.y = this.yaw;
    this.rig.setAiming(aiming && this.flashT <= 0);
    if (this.flashT > 0) this.rig.setPose('cower');
    else if (this.rig.pose === 'cower') this.rig.setPose('stand');
    this.rig.update(dt, speedNow);
    this._syncCollider();

    // footstep noises for the player to hear (and audio)
    this.stepAcc = (this.stepAcc || 0) + speedNow * dt;
    if (this.stepAcc > 1.35 && speedNow > 0.3) {
      this.stepAcc = 0;
      audio.footstep(this._groundMat(), this.pos, false, 0.7);
    }
  }

  _groundMat() {
    const g = this.mission.world.raycast(this.pos.x, this.pos.y + 0.3, this.pos.z, 0, -1, 0, 0.8, (c) => c.blockMove && c.tag !== 'enemy');
    return g ? g.collider.material : 'concrete';
  }

  _maybeOpenDoor(dir) {
    const probe = {
      x: this.pos.x + dir.x * 0.85, y: this.pos.y + 1.0, z: this.pos.z + dir.z * 0.85,
    };
    const hits = this.mission.world.query(
      { x: probe.x - 0.65, y: probe.y - 0.8, z: probe.z - 0.65 },
      { x: probe.x + 0.65, y: probe.y + 0.8, z: probe.z + 0.65 }, []);
    for (const c of hits) {
      if (c.tag === 'door' && c.ref && c.ref.blocksPath && c.ref.open) {
        if (c.ref.state === 'locked') continue;
        c.ref.open();
      }
    }
  }

  _fireAt(player, dist) {
    const def = WEAPONS[this.conf.weapon];
    const rng = this.mission.rng;
    if (this.burstLeft <= 0) {
      this.burstLeft = this.conf.burst[0] + Math.floor(rng.next() * (this.conf.burst[1] - this.conf.burst[0] + 1));
      this.fireCooldown = 0.5 + rng.next() * 0.6; // inter-burst pause
      return;
    }
    if (this.mag <= 0) {
      this.reloadT = (def.reloadEmptyMs ?? 2400) / 1000;
      audio.mech('magout', this.pos);
      this.coverPos = this._findCover();
      return;
    }
    this.burstLeft--;
    this.mag--;
    this.fireCooldown = 60 / (def.rpm * 0.55); // AI fires slower than the weapon's max
    const muzzle = this.rig.getMuzzleWorld();
    // aim at chest with error
    const targetY = player.pos.y + (player.crouched ? 0.75 : 1.25);
    const aim = new THREE.Vector3(player.pos.x, targetY, player.pos.z);
    const dir = new THREE.Vector3().subVectors(aim, muzzle).normalize();
    const spreadDeg = (3.2 / (this.conf.acc * this.diff.enemyAccuracy)) * (1 + dist / 26) * (Math.hypot(player.vel.x, player.vel.z) > 2.4 ? 1.5 : 1);
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

  _findCover() {
    const rng = this.mission.rng;
    const player = this.mission.player;
    const pEye = new THREE.Vector3(player.pos.x, player.eyeY, player.pos.z);
    for (let i = 0; i < 8; i++) {
      const idx = this.mission.nav.randomNodeNear(this.pos.x, this.pos.y, this.pos.z, 7, rng);
      if (idx < 0) continue;
      const n = this.mission.nav.nodes[idx];
      const spot = new THREE.Vector3(n.x, n.y + 1.4, n.z);
      if (!this._clearSightFrom(pEye, spot)) return new THREE.Vector3(n.x, n.y, n.z);
    }
    return null;
  }

  _clearSightFrom(from, to) {
    const d = new THREE.Vector3().subVectors(to, from);
    const dist = d.length();
    d.normalize();
    const hit = this.mission.world.raycast(from.x, from.y, from.z, d.x, d.y, d.z, dist, (c) => c.blockSight && c.tag !== 'enemy');
    return !hit;
  }

  textState(playerPos) {
    return {
      id: this.id, type: this.type, state: this.flashT > 0 ? 'flashed' : this.state,
      hp: Math.max(0, Math.round(this.hp)), alive: this.alive,
      pos: [+this.pos.x.toFixed(1), +this.pos.y.toFixed(1), +this.pos.z.toFixed(1)],
      dist: playerPos ? +this.pos.distanceTo(playerPos).toFixed(1) : undefined,
      suspicion: +this.suspicion.toFixed(2),
    };
  }

  dispose() {
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
