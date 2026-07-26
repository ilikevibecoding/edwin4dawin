// Hostage AI (Opus 3 domain): captive -> secured -> following/waiting -> extracting -> extracted.
//
// The escort has to survive a firefight, which is where it is most likely to look broken. Three
// rules hold at all times while following:
//   * The follow never stops for longer than a flinch. `freezeT` is capped at 0.8 s and has its
//     own cooldown, so a sustained volley cannot pin a hostage in a doorway.
//   * Danger lowers the profile instead of the commitment: gunfire or a fight inside 10 m puts the
//     hostage into a crouch-walk (kneel pose, ~75 % speed) rather than stopping them.
//   * Distance raises the catch-up speed, so a player who sprints ahead is followed, not lost.
import * as THREE from 'three';
import { moveCharacter } from '../core/collide.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { CharacterRig } from '../characters/humanoid.js';

const RADIUS = 0.32;
const HEIGHT = 1.72;
const DANGER_RADIUS = 10;      // gunfire / active fight inside this makes them keep their head down
const NEAR_MISS = 1.7;         // a round landing this close is worth a flinch
const FREEZE_MAX = 0.8;

// Near-miss detection: one module-level listener rather than one per hostage, and it only ever
// looks at the handful of live hostages.
const live = new Set();
let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  bus.on('impact', (e) => {
    if (!e || !e.point || !live.size) return;
    for (const h of live) h._nearMiss(e.point);
  });
}

export class Hostage {
  constructor(mission, spec) {
    this.mission = mission;
    this.id = spec.id;
    this.name = spec.name;
    this.pos = new THREE.Vector3(spec.pos[0], spec.pos[1], spec.pos[2]);
    this.yaw = THREE.MathUtils.degToRad(spec.yawDeg ?? 0);
    this.state = 'captive'; // captive|secured|following|waiting|extracting|extracted|dead
    this.hp = 100;
    this.alive = true;
    this.discovered = false;
    this.fearT = 0;
    this.dangerT = 0;
    this.dangerScanT = 0;
    this.freezeT = 0;
    this.freezeCoolT = 0;
    this.crouched = false;
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.stuckT = 0;
    this.sideT = 0;
    this.sideSign = 1;
    this.sideDir = new THREE.Vector3();
    this.doorScanT = 0;
    this.lastPos = this.pos.clone();
    this.extractTarget = null;
    this._dir = new THREE.Vector3();

    this.rig = new CharacterRig(spec.variant === 1 ? 'civ1' : 'civ0');
    this.rig.group.position.copy(this.pos);
    this.rig.group.rotation.y = this.yaw;
    this.rig.setPose('kneel');
    mission.entGroup.add(this.rig.group);
    wire();
    live.add(this);
  }

  capsule() {
    return { x: this.pos.x, z: this.pos.z, y0: this.pos.y, y1: this.pos.y + HEIGHT, r: RADIUS + 0.03 };
  }

  get secured() { return ['following', 'waiting', 'extracting', 'extracted'].includes(this.state); }

  interact() {
    if (!this.alive) return false;
    if (this.state === 'captive') {
      this.state = 'following';
      this.rig.setPose('stand');
      audio.voice('hostageRelief', this.pos);
      bus.emit('subtitle', { text: `${this.name}: "Thank you — I'll stay right behind you."`, ms: 2600 });
      bus.emit('hostage-secured', { id: this.id });
      return true;
    }
    if (this.state === 'following') {
      this.state = 'waiting';
      bus.emit('subtitle', { text: `${this.name}: "Okay, I'll wait here."`, ms: 2000 });
      bus.emit('hostage-command', { id: this.id, state: this.state });
      return true;
    }
    if (this.state === 'waiting') {
      this.state = 'following';
      bus.emit('subtitle', { text: `${this.name}: "Right behind you."`, ms: 2000 });
      bus.emit('hostage-command', { id: this.id, state: this.state });
      return true;
    }
    return false;
  }

  damage(amount, fromPos, region, shooter) {
    if (!this.alive) return;
    this.hp -= amount;
    this.dangerT = Math.max(this.dangerT, 4);
    audio.voice('hostageFear', this.pos);
    bus.emit('hostage-hit', { id: this.id });
    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.rig.die();
      live.delete(this);
      bus.emit('hostage-died', { id: this.id });
    }
  }

  hearNoise(noise) {
    if (!this.alive) return;
    const loud = noise.type === 'gunshot' || noise.type === 'flash' || noise.type === 'glass';
    if (!loud) return;
    const d = this.pos.distanceTo(noise.pos);
    if (d < DANGER_RADIUS) this.dangerT = Math.max(this.dangerT, 2.6);
    if (this.state === 'captive' && d < 14) this.fearT = 3.5;
  }

  /** A round landing right beside the hostage buys a flinch, never a stop. */
  _nearMiss(point) {
    if (!this.alive || !this.secured) return;
    const dx = this.pos.x - point.x, dy = this.pos.y + 0.9 - point.y, dz = this.pos.z - point.z;
    if (dx * dx + dy * dy + dz * dz > NEAR_MISS * NEAR_MISS) return;
    this.dangerT = Math.max(this.dangerT, 3);
    if (this.freezeCoolT > 0) return;
    this.freezeT = 0.35 + Math.min(0.45, this.mission.rng.next() * 0.45);
    this.freezeCoolT = 1.8;
    audio.voice('hostageFear', this.pos);
  }

  beginExtraction(targetPos) {
    if (!this.alive || this.state === 'extracted') return;
    this.state = 'extracting';
    this.extractTarget = targetPos.clone();
    this.path = null;
  }

  /** Is there an active fight within earshot? Sampled a few times a second, never per step. */
  _scanDanger(dt) {
    this.dangerScanT -= dt;
    if (this.dangerScanT > 0) return;
    this.dangerScanT = 0.4;
    for (const e of this.mission.enemies) {
      if (!e.alive || e.state !== 'combat') continue;
      if (e.pos.distanceTo(this.pos) < DANGER_RADIUS) { this.dangerT = Math.max(this.dangerT, 1.2); return; }
    }
  }

  update(dt) {
    if (!this.alive) { this.rig.update(dt, 0); return; }
    const player = this.mission.player;
    this.repathT -= dt;
    this.dangerT = Math.max(0, this.dangerT - dt);
    this.freezeT = Math.max(0, this.freezeT - dt);
    this.freezeCoolT = Math.max(0, this.freezeCoolT - dt);
    this.sideT = Math.max(0, this.sideT - dt);
    this._scanDanger(dt);
    let speedNow = 0;

    if (this.state === 'captive') {
      this.fearT = Math.max(0, this.fearT - dt);
      this.rig.setPose(this.fearT > 0 ? 'cower' : 'kneel');
    } else if (this.state === 'waiting') {
      // held in place: keep low while there is shooting, stand up once it is quiet
      this.rig.setPose(this.dangerT > 0 ? 'cower' : 'stand');
    } else if (this.state === 'following' || this.state === 'extracting') {
      const extracting = this.state === 'extracting';
      const target = extracting
        ? this.extractTarget
        : new THREE.Vector3(player.pos.x, player.pos.y, player.pos.z);
      const dist = Math.hypot(target.x - this.pos.x, target.z - this.pos.z) + Math.abs(target.y - this.pos.y);
      const stopDist = extracting ? 0.7 : 1.9;
      this.crouched = !extracting && this.dangerT > 0;
      this.rig.setPose(this.crouched ? 'kneel' : 'stand');

      if (dist > stopDist) {
        // NS-7: the backoff gates re-pathing even when the path is null.
        if (this.repathT <= 0) {
          this.path = this.mission.findPath(this.pos, target);
          this.pathIdx = 0;
          this.repathT = 0.7;
        }
        const speed = this._followSpeed(dist, extracting);
        if (this.freezeT > 0) {
          // flinch: the follow is paused for a fraction of a second, and only that
          speedNow = 0;
        } else if (this.sideT > 0) {
          speedNow = this._step(this.sideDir, speed * 0.75, dt, false);
        } else if (this.path && this.path.length) {
          let wp = this.path[this.pathIdx];
          while (wp && Math.hypot(wp.x - this.pos.x, wp.z - this.pos.z) < 0.4 && Math.abs(wp.y - this.pos.y) < 1) {
            this.pathIdx++;
            wp = this.path[this.pathIdx];
          }
          if (wp) {
            this._dir.set(wp.x - this.pos.x, 0, wp.z - this.pos.z);
            if (this._dir.lengthSq() > 0.0001) {
              this._dir.normalize();
              this._maybeOpenDoor(this._dir, dt);
              speedNow = this._step(this._dir, speed, dt, true);
            }
          } else {
            this.path = null;
          }
        }

        // Recovery: a short snag gets a sidestep, a long one gets a fresh route. Bodies do not
        // collide, so what actually catches a hostage is prop and door-jamb geometry.
        if (this.freezeT <= 0 && this.pos.distanceTo(this.lastPos) < 0.02) this.stuckT += dt;
        else this.stuckT = 0;
        if (this.stuckT > 0.6 && this.sideT <= 0) {
          this.sideSign = -this.sideSign;
          this.sideDir.set(-this._dir.z * this.sideSign, 0, this._dir.x * this.sideSign);
          if (this.sideDir.lengthSq() < 0.0001) this.sideDir.set(this.sideSign, 0, 0);
          this.sideT = 0.5;
        }
        if (this.stuckT > 1.5) {
          this.stuckT = 0;
          this.path = null;
          this.repathT = 0;
        }
      } else if (extracting) {
        this.state = 'extracted';
        this.rig.setPose('kneel');
        this.yaw = Math.PI;
        audio.voice('hostageRelief', this.pos);
        bus.emit('hostage-extracted', { id: this.id });
      }
    } else if (this.state === 'extracted') {
      this.rig.setPose('kneel');
    } else {
      // settle with gravity
      const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
        { x: 0, y: -9 * dt, z: 0 }, { filter: (c) => c.tag !== 'enemy' });
      this.pos.set(step.pos.x, step.pos.y, step.pos.z);
    }
    this.lastPos.copy(this.pos);
    this.rig.group.position.copy(this.pos);
    this.rig.group.rotation.y = this.yaw;
    this.rig.update(dt, speedNow);
  }

  /** Base walk, plus catch-up when the player has opened a gap, minus the crouch penalty. */
  _followSpeed(dist, extracting) {
    if (extracting) return 2.6;
    let speed = dist > 16 ? 4.6 : dist > 10 ? 4.0 : dist > 6 ? 3.4 : 2.4;
    if (this.crouched) speed *= 0.75;
    return speed;
  }

  _step(dir, speed, dt, face) {
    const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
      { x: dir.x * speed * dt, y: -9 * dt, z: dir.z * speed * dt },
      { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy', trace: true });
    const jump = Math.hypot(step.pos.x - this.pos.x, step.pos.z - this.pos.z);
    if (jump > 0.5) {
      // safety net: never accept a clamp-teleport; repath instead (the backoff gates the request)
      this.path = null;
      this.repathT = 0.3;
      return 0;
    }
    this.pos.set(step.pos.x, step.pos.y, step.pos.z);
    if (face) this.yaw = dampAngle(this.yaw, Math.atan2(-dir.x, -dir.z), 9, dt);
    return speed;
  }

  _maybeOpenDoor(dir, dt) {
    this.doorScanT -= dt;
    if (this.doorScanT > 0) return;
    this.doorScanT = 0.2;
    const probe = { x: this.pos.x + dir.x * 0.85, y: this.pos.y + 1.0, z: this.pos.z + dir.z * 0.85 };
    const hits = this.mission.world.query(
      { x: probe.x - 0.65, y: probe.y - 0.8, z: probe.z - 0.65 },
      { x: probe.x + 0.65, y: probe.y + 0.8, z: probe.z + 0.65 }, []);
    for (const c of hits) {
      if (c.tag === 'door' && c.ref && c.ref.blocksPath && c.ref.open && c.ref.state !== 'locked') c.ref.open();
    }
  }

  textState(playerPos) {
    return {
      id: this.id, name: this.name, state: this.state, alive: this.alive,
      discovered: this.discovered,
      pos: [+this.pos.x.toFixed(1), +this.pos.y.toFixed(1), +this.pos.z.toFixed(1)],
      dist: playerPos ? +this.pos.distanceTo(playerPos).toFixed(1) : undefined,
      posture: this.state === 'following' || this.state === 'waiting'
        ? { crouched: !!this.crouched, danger: +this.dangerT.toFixed(1), frozen: +this.freezeT.toFixed(2) }
        : undefined,
    };
  }

  dispose() {
    live.delete(this);
    this.mission.entGroup.remove(this.rig.group);
  }
}

function dampAngle(cur, target, lambda, dt) {
  let diff = target - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return cur + diff * Math.min(1, lambda * dt);
}
