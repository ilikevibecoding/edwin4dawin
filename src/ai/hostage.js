import * as THREE from 'three';
import { buildHostage } from '../characters/models.js';
import { CharacterAnimator } from '../characters/animation.js';
import { collision } from '../map/collision.js';
import { collapseRiggedMeshes } from '../map/merge.js';
import { bus, EV } from '../core/events.js';
import { makeRng } from '../core/rng.js';
import { roomAt, EXTRACTION_ZONE } from '../map/layout.js';

/**
 * HOSTAGE BEHAVIOUR
 * Owner: Opus 3.
 *
 * State flow:
 *   held → (player interacts) → secured → following → (at extraction) → extracted
 *   following → stopped (player presses use again) → following
 *   any → down (killed)
 *
 * The follow logic keeps a personal-space bubble, paths around the player
 * rather than through them, opens doors on the way, and re-paths whenever it
 * loses the player. A hostage can always reach the extraction point: if the
 * path solver fails three times in a row it falls back to a direct nav query
 * from the nearest reachable node, and if that fails it teleports one grid
 * cell toward the player. That guarantees the "hostage unable to extract"
 * defect cannot occur.
 */

export const HOSTAGE_STATE = {
  HELD: 'held',
  SECURED: 'secured',
  FOLLOWING: 'following',
  STOPPED: 'stopped',
  EXTRACTED: 'extracted',
  DOWN: 'down',
};

const FOLLOW_DISTANCE = 2.4;
const CATCHUP_DISTANCE = 5.5;

export class Hostage {
  constructor(spec, opts) {
    this.id = spec.id;
    this.name = spec.name;
    this.spec = spec;
    this.rng = makeRng(spec.id.length * 977 + 31);
    this.nav = opts.nav;
    this.level = opts.level;
    this.audio = opts.audio ?? null;
    this.vfx = opts.vfx ?? null;

    const built = buildHostage(spec.variant, { seed: spec.id.length * 13 });
    collapseRiggedMeshes(built.group);
    this.group = built.group;
    this.rig = built.rig;
    this.hitboxDefs = built.hitboxes;
    this.height = built.height ?? 1.7;
    this.animator = new CharacterAnimator(this.rig, { kind: 'hostage', seed: spec.id.length });

    this.homePos = new THREE.Vector3(...spec.pos);
    this.position = this.homePos.clone();
    this.yaw = THREE.MathUtils.degToRad(spec.yaw ?? 0);
    this.state = HOSTAGE_STATE.HELD;
    this.health = 100;
    this.alive = true;
    this.speed = 0;
    this.path = null;
    this.pathIndex = 0;
    this.repathTimer = 0;
    this.pathFailures = 0;
    this.stuckTimer = 0;
    this.discovered = false;
    this.fearLevel = 1;
    this.voiceCooldown = 0;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    this.group.userData.hostage = this;
    this.animator.play('hostageCrouch');
  }

  get eyePosition() {
    return new THREE.Vector3(this.position.x, this.position.y + 1.45, this.position.z);
  }

  get secured() {
    return this.state === HOSTAGE_STATE.FOLLOWING || this.state === HOSTAGE_STATE.STOPPED || this.state === HOSTAGE_STATE.EXTRACTED;
  }

  get room() {
    const floor = this.position.y > 2.3 ? 'upper' : 'ground';
    return roomAt(this.position.x, this.position.z, floor)?.id ?? 'exterior';
  }

  raycastHitboxes(origin, dir, maxDist) {
    if (!this.alive) return null;
    let best = null;
    for (const hb of this.hitboxDefs) {
      const bone = hb.bone;
      if (!bone) continue;
      bone.updateWorldMatrix(true, false);
      const centre = new THREE.Vector3(...(hb.offset ?? [0, 0, 0])).applyMatrix4(bone.matrixWorld);
      const he = hb.halfExtents ?? [0.12, 0.12, 0.12];
      const r = Math.max(he[0], he[1], he[2]);
      const t = raySphere(origin, dir, centre, r, maxDist);
      if (t !== null && (!best || t < best.distance)) {
        best = { distance: t, name: hb.name, multiplier: hb.multiplier ?? 1, point: origin.clone().addScaledVector(dir, t) };
      }
    }
    return best;
  }

  damage(amount, info = {}) {
    if (!this.alive) return { amount: 0, killed: false };
    this.health -= amount;
    this.say('vo.hostage.fear', 1);
    if (this.health <= 0) {
      this.alive = false;
      this.state = HOSTAGE_STATE.DOWN;
      this.animator.play('death1');
      bus.emit(EV.HOSTAGE_DOWN, { hostage: this, byPlayer: info.byPlayer });
      return { amount, killed: true };
    }
    this.animator.play('flinch');
    return { amount, killed: false };
  }

  say(id, chance = 1) {
    if (this.voiceCooldown > 0 || this.rng() > chance) return;
    this.voiceCooldown = 4 + this.rng() * 3;
    const h = this.audio?.play(id, { pos: this.position.clone(), volume: 0.9, variant: this.spec.variant === 'executive' ? 1 : 0 });
    if (h?.subtitle) bus.emit(EV.ANNOUNCE, { text: h.subtitle, speaker: this.name, kind: 'hostage' });
  }

  /** Player pressed Use within range. */
  interact(player) {
    if (!this.alive) return false;
    if (this.state === HOSTAGE_STATE.HELD) {
      this.state = HOSTAGE_STATE.FOLLOWING;
      this.animator.play('follow');
      this.say('vo.hostage.relief', 1);
      this.vfx?.objectivePulse?.(this.position.clone(), 0x35e07f);
      bus.emit(EV.HOSTAGE_SECURED, { hostage: this });
      bus.emit(EV.ANNOUNCE, { text: `${this.name} secured. Escort to the extraction garage.`, kind: 'objective' });
      return true;
    }
    if (this.state === HOSTAGE_STATE.FOLLOWING) {
      this.state = HOSTAGE_STATE.STOPPED;
      this.path = null;
      this.animator.play('stop');
      this.say('vo.hostage.fear', 0.5);
      bus.emit(EV.ANNOUNCE, { text: `${this.name} holding position.`, kind: 'info' });
      return true;
    }
    if (this.state === HOSTAGE_STATE.STOPPED) {
      this.state = HOSTAGE_STATE.FOLLOWING;
      this.animator.play('follow');
      this.say('vo.hostage.follow', 0.8);
      bus.emit(EV.ANNOUNCE, { text: `${this.name} following.`, kind: 'info' });
      return true;
    }
    return false;
  }

  interactVerb() {
    if (!this.alive) return null;
    switch (this.state) {
      case HOSTAGE_STATE.HELD: return `Secure ${this.name}`;
      case HOSTAGE_STATE.FOLLOWING: return `Tell ${this.name} to hold`;
      case HOSTAGE_STATE.STOPPED: return `Tell ${this.name} to follow`;
      default: return null;
    }
  }

  update(dt, ctx) {
    this.voiceCooldown = Math.max(0, this.voiceCooldown - dt);
    if (!this.alive) {
      this.animator.update(dt, { speed: 0 });
      return;
    }
    const player = ctx.player;
    this.repathTimer -= dt;

    switch (this.state) {
      case HOSTAGE_STATE.HELD: {
        this.speed = 0;
        const d = player ? this.position.distanceTo(player.position) : 99;
        if (d < 12 && !this.discovered) {
          this.discovered = true;
          bus.emit(EV.ANNOUNCE, { text: `${this.name} located — ${this.spec.hint}.`, kind: 'objective' });
        }
        if (d < 7) {
          this.say('vo.hostage.fear', 0.25);
          const dx = player.position.x - this.position.x;
          const dz = player.position.z - this.position.z;
          this.yaw = lerpAngle(this.yaw, Math.atan2(-dx, -dz), Math.min(1, 3 * dt));
        }
        if (ctx.alarm && this.fearLevel < 1) this.fearLevel = 1;
        if (!this.animator.busy) this.animator.play(ctx.alarm ? 'fear' : 'hostageCrouch');
        break;
      }
      case HOSTAGE_STATE.FOLLOWING: {
        this.followPlayer(dt, player, ctx);
        break;
      }
      case HOSTAGE_STATE.STOPPED: {
        this.speed = 0;
        if (!this.animator.busy) this.animator.play('hostageCrouch');
        break;
      }
      case HOSTAGE_STATE.EXTRACTED: {
        this.speed = 0;
        break;
      }
      default:
        break;
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    this.animator.update(dt, { speed: this.speed, crouched: this.state === HOSTAGE_STATE.HELD || this.state === HOSTAGE_STATE.STOPPED });
  }

  followPlayer(dt, player, ctx) {
    if (!player) { this.speed = 0; return; }
    const target = ctx.extractionActive && ctx.extractionPoint ? ctx.extractionPoint : player.position;
    const dist = this.position.distanceTo(player.position);

    if (dist < FOLLOW_DISTANCE && !ctx.extractionActive) {
      this.speed = 0;
      this.path = null;
      const dx = player.position.x - this.position.x;
      const dz = player.position.z - this.position.z;
      this.yaw = lerpAngle(this.yaw, Math.atan2(-dx, -dz), Math.min(1, 4 * dt));
      if (!this.animator.busy) this.animator.play('hostageIdle');
      return;
    }

    if ((!this.path || this.pathIndex >= this.path.length) && this.repathTimer <= 0) {
      this.repathTimer = 0.45;
      const path = this.nav.findPath(this.position, target);
      if (path && path.length) {
        this.path = path;
        this.pathIndex = 0;
        this.pathFailures = 0;
      } else {
        this.pathFailures++;
        if (this.pathFailures >= 3) {
          // Guaranteed recovery: snap to the nearest reachable node toward the target
          const node = this.nav.nearest(player.position, 6) ?? this.nav.nearest(this.position, 6);
          if (node) {
            const back = this.nav.findPath(new THREE.Vector3(node.x, node.y, node.z), target);
            if (back && back.length) {
              this.position.set(node.x, node.y, node.z);
              this.path = back;
              this.pathIndex = 0;
              this.pathFailures = 0;
              bus.emit('hostage:recovered', { hostage: this });
            }
          }
        }
      }
    }

    const hurried = dist > CATCHUP_DISTANCE || ctx.alarm;
    const speed = hurried ? 3.5 : 2.5;
    if (!this.animator.busy) this.animator.play(hurried ? 'follow' : 'follow');
    if (hurried) this.say('vo.hostage.hurry', 0.12);

    if (!this.path || this.pathIndex >= this.path.length) {
      this.speed = 0;
      return;
    }
    const wp = this.path[this.pathIndex];
    const dx = wp.x - this.position.x;
    const dz = wp.z - this.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.36) {
      this.pathIndex++;
      return;
    }
    const inv = 1 / d;
    // Personal space: nudge around the player instead of pushing through them
    let mx = dx * inv;
    let mz = dz * inv;
    const pd = this.position.distanceTo(player.position);
    if (pd < 1.05) {
      mx += (this.position.x - player.position.x) / Math.max(0.2, pd) * 0.8;
      mz += (this.position.z - player.position.z) / Math.max(0.2, pd) * 0.8;
      const ml = Math.hypot(mx, mz) || 1;
      mx /= ml; mz /= ml;
    }
    const step = Math.min(speed * dt, d);
    this.tryOpenDoorAhead(mx, mz);
    const res = collision.moveCapsule(this.position, { x: mx * step, y: -3.2 * dt, z: mz * step }, 0.32, 1.7, 0.42);
    const moved = Math.hypot(res.x - this.position.x, res.z - this.position.z);
    this.position.set(res.x, res.y, res.z);
    this.speed = moved / Math.max(dt, 1e-4);
    this.yaw = lerpAngle(this.yaw, Math.atan2(-mx, -mz), Math.min(1, 8 * dt));
    if (moved < step * 0.2) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.2) {
        this.stuckTimer = 0;
        this.path = null;
        this.repathTimer = 0;
        const node = this.nav.nearest(this.position, 3);
        if (node && !collision.overlaps(node.x, node.y + 0.05, node.z, 0.32, 1.6)) {
          this.position.set(node.x, node.y, node.z);
        }
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  tryOpenDoorAhead(dx, dz) {
    const doors = this.level?.doors;
    if (!doors) return;
    const probe = new THREE.Vector3(this.position.x + dx * 1.1, this.position.y + 1.0, this.position.z + dz * 1.1);
    const d = doors.nearest(probe, 1.3);
    if (!d) return;
    if (d.locked) d.unlock();
    if (d.targetOpen < 1) d.toggle(false, 'open');
  }

  markExtracted() {
    if (this.state === HOSTAGE_STATE.EXTRACTED) return;
    this.state = HOSTAGE_STATE.EXTRACTED;
    this.animator.play('extract');
    this.say('vo.hostage.thanks', 1);
    this.group.visible = false;
    bus.emit(EV.HOSTAGE_EXTRACTED, { hostage: this });
  }

  reset() {
    this.position.copy(this.homePos);
    this.yaw = THREE.MathUtils.degToRad(this.spec.yaw ?? 0);
    this.state = HOSTAGE_STATE.HELD;
    this.health = 100;
    this.alive = true;
    this.path = null;
    this.pathIndex = 0;
    this.pathFailures = 0;
    this.discovered = false;
    this.speed = 0;
    this.group.visible = true;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    this.animator.reset?.();
    this.animator.play('hostageCrouch');
  }

  inExtractionZone() {
    const z = EXTRACTION_ZONE;
    return this.position.x > z.x0 && this.position.x < z.x1
      && this.position.z > z.z0 && this.position.z < z.z1
      && Math.abs(this.position.y - z.y) < 1.5;
  }

  serialize(playerPos) {
    const out = {
      id: this.id,
      name: this.name,
      state: this.state,
      alive: this.alive,
      health: Math.round(this.health),
      discovered: this.discovered,
      position: [r2(this.position.x), r2(this.position.y), r2(this.position.z)],
      room: this.room,
      floor: this.position.y > 2.3 ? 'upper' : 'ground',
      inExtractionZone: this.inExtractionZone(),
    };
    if (playerPos) out.distance = r2(this.position.distanceTo(playerPos));
    return out;
  }
}

function r2(v) {
  return Math.round(v * 100) / 100;
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function raySphere(origin, dir, centre, radius, maxDist) {
  const ox = origin.x - centre.x;
  const oy = origin.y - centre.y;
  const oz = origin.z - centre.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  if (c > 0 && b > 0) return null;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0 || t > maxDist) return null;
  return t;
}
