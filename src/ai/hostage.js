// Hostage AI: captive -> secured (follows player) -> waiting/following toggle
// -> extracted. Cowers under fire, keeps distance behind the player, can die
// to stray fire (mission failure).
import * as THREE from 'three';
import { bus } from '../core/events.js';

const FOLLOW_NEAR = 1.7, FOLLOW_FAR = 2.8, WALK = 2.2, RUN = 3.9;

export class Hostage {
  constructor(game, spec) {
    this.game = game;
    this.id = spec.id;
    this.name = spec.name;
    this.variant = spec.variant;
    this.pos = { ...spec.pos };
    this.yaw = spec.yaw || 0;
    this.spawnSpec = spec;
    this.state = 'captive';   // captive | following | waiting | extracted | dead
    this.health = 60;
    this.alive = true;
    this.found = false;
    this.fearT = 0;
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.stuckT = 0;
    this.lastProgressPos = { ...spec.pos };
    this._buildVisual();
  }

  _buildVisual() {
    if (this.game.characters) {
      this.visual = this.game.characters.buildHostage(this.variant, this.id);
    } else {
      const g = new THREE.Group();
      const color = this.variant === 'analyst' ? 0x5b7d9e : 0x7d6a52;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.8, 4, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.92 }));
      body.position.y = 0.82;
      body.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd4a98c, roughness: 0.85 }));
      head.position.y = 1.42;
      head.castShadow = true;
      g.add(body, head);
      this.visual = { group: g, setState: () => {}, setMoving: () => {}, update: () => {} };
    }
    this.group = this.visual.group;
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.name = this.id;
    this._applyPose();
  }

  _applyPose() {
    // captive pose: kneeling (graybox: lower the body)
    const kneel = this.state === 'captive';
    this.visual.setState?.(this.state, this.fearT > 0);
    if (!this.visual.setState) this.group.scale.y = kneel ? 0.72 : 1;
  }

  hitTest(origin, dir, maxDist) {
    const body = rayCapsuleApprox(origin, dir, this.pos, this.state === 'captive' ? 1.15 : 1.55, 0.3, maxDist);
    if (body != null) return { dist: body, part: 'body' };
    return null;
  }

  takeDamage(amount, info = {}) {
    if (!this.alive) return;
    this.health -= amount;
    this.fearT = 4;
    bus.emit('hostage-damaged', { id: this.id, remaining: this.health });
    if (this.health <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.group.rotation.x = -Math.PI / 2 * 0.9;
      bus.emit('hostage-died', { id: this.id, name: this.name });
    }
  }

  secure() {
    if (this.state !== 'captive') return false;
    this.state = 'following';
    this._applyPose();
    bus.emit('hostage-secured', { id: this.id, name: this.name });
    return true;
  }

  toggleFollow() {
    if (this.state === 'following') {
      this.state = 'waiting';
      this.path = null;
      bus.emit('hostage-waiting', { id: this.id, name: this.name });
    } else if (this.state === 'waiting') {
      this.state = 'following';
      bus.emit('hostage-following', { id: this.id, name: this.name });
    }
    this._applyPose();
  }

  markExtracted() {
    if (this.state === 'extracted') return;
    this.state = 'extracted';
    this.path = null;
    bus.emit('hostage-extracted', { id: this.id, name: this.name });
    this._applyPose();
  }

  interactPrompt() {
    if (this.state === 'captive') return `Secure ${this.name}`;
    if (this.state === 'following') return `${this.name}: Hold position`;
    if (this.state === 'waiting') return `${this.name}: Follow me`;
    return null;
  }

  update(dt) {
    if (!this.alive) return;
    this.fearT = Math.max(0, this.fearT - dt);
    const player = this.game.player;

    // discovery check (mission "locate" objective)
    if (!this.found && player.alive) {
      const d = Math.hypot(player.pos.x - this.pos.x, player.pos.y - this.pos.y, player.pos.z - this.pos.z);
      if (d < 5) {
        const eye = player.eyePos();
        if (this.game.ai.hasLineOfSight(eye, { x: this.pos.x, y: this.pos.y + 1.0, z: this.pos.z })) {
          this.found = true;
          bus.emit('hostage-found', { id: this.id, name: this.name });
        }
      }
    }

    if (this.state === 'following' && player.alive) {
      const d = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      const heightDiff = Math.abs(player.pos.y - this.pos.y);
      if (d > FOLLOW_FAR || heightDiff > 0.6) {
        this.repathT -= dt;
        const stale = !this.path || this.pathIdx >= this.path.length;
        if (this.repathT <= 0 || stale) {
          this.game.ai.requestHostagePath(this, player.pos);
          this.repathT = 0.7;
        }
        if (this.path && this.fearT < 2.2) {
          this._moveAlong(dt, d > 6 ? RUN : WALK);
        }
      } else if (d < FOLLOW_NEAR) {
        this.path = null;
        // face the player
        const ty = Math.atan2(-(player.pos.x - this.pos.x), -(player.pos.z - this.pos.z));
        this.yaw = turnToward(this.yaw, ty, 6 * dt);
      } else {
        this.path = null;
      }
    }
    this._syncVisual(dt);
  }

  _moveAlong(dt, speed) {
    if (!this.path || this.pathIdx >= this.path.length) return;
    const wp = this.path[this.pathIdx];
    const dx = wp.x - this.pos.x, dz = wp.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) { this.pathIdx++; return; }
    const ty = Math.atan2(-dx, -dz);
    this.yaw = turnToward(this.yaw, ty, 8 * dt);
    const step = Math.min(d, speed * dt);
    // open doors ahead
    for (const door of this.game.world.nearbyDoors(this.pos, 1.5)) {
      if (door.isClosed && !door.locked && !door.moving) door.toggle(this.pos);
    }
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    this.pos.y += (wp.y - this.pos.y) * Math.min(1, dt * 10);

    const prog = Math.hypot(this.pos.x - this.lastProgressPos.x, this.pos.z - this.lastProgressPos.z);
    if (prog > 0.25) { this.lastProgressPos = { ...this.pos }; this.stuckT = 0; }
    else {
      this.stuckT += dt;
      if (this.stuckT > 2.2) {
        const c = this.game.ai.nav.cellNear(this.pos.x, this.pos.z, this.pos.y);
        if (c) { this.pos.x = c.x; this.pos.z = c.z; this.pos.y = c.y; }
        this.path = null;
        this.stuckT = 0;
      }
    }
  }

  _syncVisual(dt) {
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.rotation.y = this.yaw;
    const moving = this.path && this.pathIdx < (this.path?.length ?? 0);
    this.visual.setMoving?.(!!moving, false);
    this.visual.update?.(dt);
    this._applyPose();
  }

  stateInfo() {
    return {
      id: this.id, name: this.name, state: this.state,
      found: this.found, hp: Math.max(0, this.health),
      pos: [r2(this.pos.x), r2(this.pos.y), r2(this.pos.z)],
    };
  }
}

function turnToward(cur, target, maxStep) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + Math.max(-maxStep, Math.min(maxStep, d));
}
function r2(v) { return Math.round(v * 100) / 100; }
function rayCapsuleApprox(o, d, base, h, r, maxDist) {
  let best = null;
  for (const yOff of [0.3, 0.75, 1.2]) {
    if (yOff > h) continue;
    const ox = o.x - base.x, oy = o.y - (base.y + yOff), oz = o.z - base.z;
    const b = ox * d.x + oy * d.y + oz * d.z;
    const cc = ox * ox + oy * oy + oz * oz - r * r;
    const disc = b * b - cc;
    if (disc < 0) continue;
    const t = -b - Math.sqrt(disc);
    if (t >= 0 && t <= maxDist && (best == null || t < best)) best = t;
  }
  return best;
}
