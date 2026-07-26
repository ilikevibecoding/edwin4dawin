// Hostage AI (Opus 3 domain): captive -> secured -> following/waiting -> extracting -> extracted.
// Fear responses to nearby gunfire while captive; robust follow with repath + recovery.
import * as THREE from 'three';
import { moveCharacter } from '../core/collide.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { CharacterRig } from '../characters/humanoid.js';

const RADIUS = 0.32;
const HEIGHT = 1.72;

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
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.stuckT = 0;
    this.lastPos = this.pos.clone();
    this.extractTarget = null;

    this.rig = new CharacterRig(spec.variant === 1 ? 'civ1' : 'civ0');
    this.rig.group.position.copy(this.pos);
    this.rig.group.rotation.y = this.yaw;
    this.rig.setPose('kneel');
    mission.entGroup.add(this.rig.group);
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
    audio.voice('hostageFear', this.pos);
    bus.emit('hostage-hit', { id: this.id });
    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.rig.die();
      bus.emit('hostage-died', { id: this.id });
    }
  }

  hearNoise(noise) {
    if (!this.alive) return;
    if (this.state === 'captive' && (noise.type === 'gunshot' || noise.type === 'flash')) {
      const d = this.pos.distanceTo(noise.pos);
      if (d < 14) this.fearT = 3.5;
    }
  }

  beginExtraction(targetPos) {
    if (!this.alive || this.state === 'extracted') return;
    this.state = 'extracting';
    this.extractTarget = targetPos.clone();
    this.path = null;
  }

  update(dt) {
    if (!this.alive) { this.rig.update(dt, 0); return; }
    const player = this.mission.player;
    this.repathT -= dt;
    let speedNow = 0;

    if (this.state === 'captive') {
      this.fearT = Math.max(0, this.fearT - dt);
      this.rig.setPose(this.fearT > 0 ? 'cower' : 'kneel');
    } else if (this.state === 'waiting') {
      this.rig.setPose('stand');
    } else if (this.state === 'following' || this.state === 'extracting') {
      this.rig.setPose('stand');
      const target = this.state === 'extracting'
        ? this.extractTarget
        : new THREE.Vector3(player.pos.x, player.pos.y, player.pos.z);
      const dist = Math.hypot(target.x - this.pos.x, target.z - this.pos.z) + Math.abs(target.y - this.pos.y);
      const stopDist = this.state === 'extracting' ? 0.7 : 1.9;
      if (dist > stopDist) {
        if (!this.path || this.repathT <= 0) {
          this.path = this.mission.nav.pathBetween(this.pos, target);
          this.pathIdx = 0;
          this.repathT = 0.7;
        }
        if (this.path && this.path.length) {
          let wp = this.path[this.pathIdx];
          while (wp && Math.hypot(wp.x - this.pos.x, wp.z - this.pos.z) < 0.4 && Math.abs(wp.y - this.pos.y) < 1) {
            this.pathIdx++;
            wp = this.path[this.pathIdx];
          }
          if (wp) {
            const dir = new THREE.Vector3(wp.x - this.pos.x, 0, wp.z - this.pos.z);
            if (dir.lengthSq() > 0.0001) {
              dir.normalize();
              this._maybeOpenDoor(dir);
              const speed = this.state === 'extracting' ? 2.6 : dist > 6 ? 3.4 : 2.4;
              const step = moveCharacter(this.mission.world, this.pos, RADIUS, HEIGHT,
                { x: dir.x * speed * dt, y: -9 * dt, z: dir.z * speed * dt },
                { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy' });
              this.pos.set(step.pos.x, step.pos.y, step.pos.z);
              speedNow = speed;
              const face = Math.atan2(-dir.x, -dir.z);
              this.yaw = dampAngle(this.yaw, face, 9, dt);
            }
          } else {
            this.path = null;
          }
        }
        // recovery when stuck
        if (this.pos.distanceTo(this.lastPos) < 0.02) this.stuckT += dt;
        else this.stuckT = 0;
        if (this.stuckT > 2) {
          this.stuckT = 0;
          this.path = null;
          this.repathT = 0;
        }
      } else if (this.state === 'extracting') {
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

  _maybeOpenDoor(dir) {
    const probe = { x: this.pos.x + dir.x * 0.85, y: this.pos.y + 1.0, z: this.pos.z + dir.z * 0.85 };
    const hits = this.mission.world.query(
      { x: probe.x - 0.35, y: probe.y - 0.8, z: probe.z - 0.35 },
      { x: probe.x + 0.35, y: probe.y + 0.8, z: probe.z + 0.35 }, []);
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
    };
  }

  dispose() {
    this.mission.entGroup.remove(this.rig.group);
  }
}

function dampAngle(cur, target, lambda, dt) {
  let diff = target - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return cur + diff * Math.min(1, lambda * dt);
}
