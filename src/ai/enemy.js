import * as THREE from 'three';
import { buildHostile, HOSTILE_VARIANTS } from '../characters/models.js';
import { CharacterAnimator } from '../characters/animation.js';
import { buildWeaponModel } from '../weapons/models.js';
import { collision } from '../map/collision.js';
import { collapseRiggedMeshes } from '../map/merge.js';
import { bus, EV } from '../core/events.js';
import { makeRng } from '../core/rng.js';
import { roomAt } from '../map/layout.js';

/**
 * HOSTILE AI
 * Owner: Opus 3.
 *
 * Behaviour is a small, legible state machine driven by a perception model:
 *
 *   patrol ─► suspicious ─► investigate ─► combat ─► search ─► patrol
 *                ▲                           │
 *                └───────── hearing ─────────┘
 *
 * Perception rules the brief demands: no seeing through walls, no firing
 * through impossible geometry, no standing still, no permanent stalls, and no
 * ignoring obvious combat events. Vision is a cone plus a distance-scaled
 * awareness build-up plus a real line-of-sight raycast that respects glass
 * (transparent), frosted glass (opaque) and active smoke volumes.
 */

export const AI_STATE = {
  IDLE: 'idle',
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  INVESTIGATE: 'investigate',
  COMBAT: 'combat',
  ADVANCE: 'advancing',
  COVER: 'in-cover',
  SEARCH: 'searching',
  RELOAD: 'reloading',
  FLANK: 'flanking',
  STUNNED: 'stunned',
  DEAD: 'dead',
};

const EYE_HEIGHT = 1.62;
const REPATH_INTERVAL = 0.55;
const STUCK_TIME = 1.4;

let seq = 0;

export class Enemy {
  constructor(opts) {
    this.id = opts.id ?? `hostile.${seq++}`;
    this.variantId = opts.variant ?? 'kestrel.assault';
    this.rng = makeRng(opts.seed ?? (seq * 7919 + 13));
    this.difficulty = opts.difficulty;
    this.nav = opts.nav;
    this.level = opts.level;
    this.vfx = opts.vfx ?? null;
    this.audio = opts.audio ?? null;
    this.voiceVariant = this.rng.int(0, 3);

    const built = buildHostile(this.variantId, { head: opts.head, seed: opts.seed });
    collapseRiggedMeshes(built.group);
    this.group = built.group;
    this.rig = built.rig;
    this.hitboxDefs = built.hitboxes;
    this.height = built.height ?? 1.82;
    this.animator = new CharacterAnimator(this.rig, { kind: 'hostile', seed: opts.seed ?? 1 });

    this.weaponId = opts.weapon ?? this.rng.pick(['smg.kestrel', 'rifle.northwind', 'pistol.vsc9']);
    try {
      const wm = buildWeaponModel(this.weaponId, { firstPerson: false, lod: 1 });
      collapseRiggedMeshes(wm.group);
      this.weaponModel = wm.group;
      this.muzzleTip = wm.muzzleTip;
      this.rig.weaponMount.add(this.weaponModel);
    } catch (err) {
      console.warn('[ai] weapon model failed', err);
    }

    this.position = new THREE.Vector3(...(opts.pos ?? [0, 0, 0]));
    this.velocity = new THREE.Vector3();
    this.yaw = opts.yaw ?? 0;
    this.targetYaw = this.yaw;
    this.lookPitch = 0;
    this.group.position.copy(this.position);

    this.maxHealth = 100 * (this.difficulty?.enemyHealthScale ?? 1);
    this.health = this.maxHealth;
    this.armor = opts.armor ?? (this.variantId === 'kestrel.heavy' ? 55 : 22);
    this.alive = true;
    this.state = AI_STATE.PATROL;
    this.stateTime = 0;
    this.awareness = 0;
    this.alerted = false;
    this.lastKnownTarget = null;
    this.lastSeenTime = -99;
    this.searchPoints = [];
    this.homeRoom = opts.room ?? null;
    this.patrolRoute = opts.patrol ?? [];
    this.patrolIndex = 0;
    this.path = null;
    this.pathIndex = 0;
    this.repathTimer = 0;
    this.stuckTimer = 0;
    this.lastPos = this.position.clone();
    this.blindUntil = 0;
    this.suppressedUntil = 0;
    this.fireCooldown = 0;
    this.burstRemaining = 0;
    this.burstGap = 0;
    this.magazine = 30;
    this.magazineSize = 30;
    this.reloadUntil = 0;
    this.coverSpot = null;
    this.coverUntil = 0;
    this.strafeDir = this.rng.sign();
    this.speed = 0;
    this.frozen = false;
    this.flinchUntil = 0;
    this.voiceCooldown = 0;
    this.hitboxes = [];
    this._box = new THREE.Box3();
    this._m = new THREE.Matrix4();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();

    this.group.userData.enemy = this;
    this.group.traverse((o) => { if (o.isMesh) o.userData.enemyRef = this; });
  }

  get eyePosition() {
    return this._v.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
  }

  get forward() {
    return this._v2.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  forwardDot(dir) {
    const f = this.forward;
    return f.x * dir.x + f.z * dir.z;
  }

  /* ---------------- Damage ---------------- */

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
      const hit = raySphere(origin, dir, centre, r, maxDist);
      if (hit !== null && (!best || hit < best.distance)) {
        best = {
          distance: hit, name: hb.name, multiplier: hb.multiplier ?? 1,
          point: origin.clone().addScaledVector(dir, hit),
        };
      }
    }
    return best;
  }

  damage(amount, info = {}) {
    if (!this.alive) return { amount: 0, killed: false };
    let remaining = amount;
    let armorHit = false;
    if (this.armor > 0) {
      const pen = info.armorPen ?? 0.5;
      const blocked = Math.min(this.armor, amount * (1 - pen) * 0.7);
      this.armor = Math.max(0, this.armor - blocked * 1.4);
      remaining = amount - blocked;
      armorHit = blocked > 0.5;
    }
    this.health -= remaining;
    this.flinchUntil = Math.max(this.flinchUntil, this.stateTimeGlobal + 0.22);
    if (info.from) {
      this.lastKnownTarget = info.from.clone();
      this.alerted = true;
      this.awareness = 1;
    }
    if (this.health <= 0) {
      this.die(info);
      return { amount: remaining, killed: true, armorHit };
    }
    this.animator.play('flinch');
    this.say('vo.hostile.hit', 0.6);
    if (this.state === AI_STATE.PATROL || this.state === AI_STATE.IDLE || this.state === AI_STATE.SUSPICIOUS) {
      this.enterState(AI_STATE.COMBAT);
    }
    // Taking fire pushes them to look for cover
    this.suppressedUntil = this.stateTimeGlobal + 1.4;
    return { amount: remaining, killed: false, armorHit };
  }

  die(info = {}) {
    this.alive = false;
    this.enterState(AI_STATE.DEAD);
    const variants = ['death1', 'death2', 'death3'];
    this.animator.play(variants[this.rng.int(0, 2)]);
    this.say('vo.hostile.death', 1);
    this.audio?.play('body.fall', { pos: this.position.clone(), volume: 0.8, delay: 0.5 });
    bus.emit(EV.ENEMY_KILLED, { enemy: this, headshot: info.headshot, byPlayer: info.byPlayer });
    bus.emit(EV.NOISE, { pos: this.position.clone(), radius: 9, kind: 'death', source: 'ai' });
  }

  /* ---------------- Perception ---------------- */

  canSee(targetPos, targetIsCrouched = false, smokeVolumes = []) {
    const eye = this.eyePosition.clone();
    const head = targetPos.clone();
    head.y += targetIsCrouched ? 1.0 : 1.55;
    const toTarget = head.clone().sub(eye);
    const dist = toTarget.length();
    const range = this.difficulty?.enemySightRange ?? 38;
    if (dist > range) return { visible: false, dist };
    toTarget.normalize();
    const f = this.forward;
    const dot = f.x * toTarget.x + f.z * toTarget.z;
    const fovCos = Math.cos(THREE.MathUtils.degToRad((this.difficulty?.enemyFov ?? 105) / 2));
    const peripheral = dist < 3.2; // they notice someone right next to them
    if (dot < fovCos && !peripheral) return { visible: false, dist };
    for (const s of smokeVolumes) {
      if (s?.occludes?.(eye, head)) return { visible: false, dist };
    }
    if (!collision.lineOfSight(eye, head)) {
      const chest = targetPos.clone();
      chest.y += targetIsCrouched ? 0.7 : 1.15;
      if (!collision.lineOfSight(eye, chest)) return { visible: false, dist };
    }
    return { visible: true, dist, dot };
  }

  hear(noise) {
    if (!this.alive || this.frozen) return;
    const d = this.position.distanceTo(noise.pos);
    const scale = this.difficulty?.enemyHearingScale ?? 1;
    if (d > noise.radius * scale) return;
    // Walls muffle sound: a blocked path halves the effective radius
    const clear = collision.lineOfSight(this.eyePosition.clone(), noise.pos.clone().setY(noise.pos.y + 1.2));
    const effective = noise.radius * scale * (clear ? 1 : 0.55);
    if (d > effective) return;
    const strength = 1 - d / effective;
    if (noise.kind === 'gunshot' || noise.kind === 'explosion' || noise.kind === 'death') {
      this.awareness = Math.max(this.awareness, 0.95);
      this.lastKnownTarget = noise.pos.clone();
      this.alerted = true;
      if (this.state !== AI_STATE.COMBAT) this.enterState(AI_STATE.INVESTIGATE);
    } else {
      this.awareness = Math.min(1, this.awareness + strength * 0.55);
      if (this.awareness > 0.42 && this.state === AI_STATE.PATROL) {
        this.lastKnownTarget = noise.pos.clone();
        this.enterState(AI_STATE.SUSPICIOUS);
      }
    }
  }

  /* ---------------- State machine ---------------- */

  enterState(next) {
    if (this.state === next) return;
    this.state = next;
    this.stateTime = 0;
    this.path = null;
    switch (next) {
      case AI_STATE.INVESTIGATE:
        this.say('vo.hostile.searching', 0.5);
        this.animator.play('investigate');
        break;
      case AI_STATE.COMBAT:
        if (!this.contactCalled) {
          this.say('vo.hostile.contact', 1);
          this.contactCalled = true;
          bus.emit('ai:contact', { enemy: this, pos: this.lastKnownTarget?.clone() });
        }
        break;
      case AI_STATE.SEARCH:
        this.say('vo.hostile.lostyou', 0.7);
        this.animator.play('search');
        this.buildSearchPlan();
        break;
      default:
        break;
    }
  }

  say(id, chance = 1) {
    if (this.voiceCooldown > 0 || this.rng() > chance) return;
    this.voiceCooldown = 2.6 + this.rng() * 2;
    const h = this.audio?.play(id, { pos: this.position.clone(), volume: 0.85, variant: this.voiceVariant });
    if (h?.subtitle) bus.emit(EV.ANNOUNCE, { text: h.subtitle, speaker: h.speaker ?? 'Hostile', kind: 'enemy' });
  }

  buildSearchPlan() {
    this.searchPoints = [];
    const origin = this.lastKnownTarget ?? this.position;
    for (let i = 0; i < 4; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 2.5 + this.rng() * 7;
      const p = new THREE.Vector3(origin.x + Math.cos(a) * r, origin.y, origin.z + Math.sin(a) * r);
      const node = this.nav.nearest(p, 4);
      if (node) this.searchPoints.push(new THREE.Vector3(node.x, node.y, node.z));
    }
  }

  /* ---------------- Movement ---------------- */

  setDestination(pos) {
    if (!pos) return false;
    const path = this.nav.findPath(this.position, pos);
    if (!path || !path.length) {
      this.path = null;
      return false;
    }
    this.path = path;
    this.pathIndex = 0;
    return true;
  }

  followPath(dt, speed) {
    if (!this.path || this.pathIndex >= this.path.length) {
      this.speed = 0;
      return true;
    }
    const target = this.path[this.pathIndex];
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.34) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) { this.speed = 0; return true; }
      return false;
    }
    const inv = 1 / dist;
    const step = Math.min(speed * dt, dist);
    const delta = { x: dx * inv * step, y: -3.5 * dt, z: dz * inv * step };
    // Open doors that block the way
    this.tryOpenDoorAhead(dx * inv, dz * inv);
    const res = collision.moveCapsule(this.position, delta, 0.34, this.crouching ? 1.25 : 1.78, 0.42);
    const moved = Math.hypot(res.x - this.position.x, res.z - this.position.z);
    this.position.set(res.x, res.y, res.z);
    this.speed = moved / Math.max(dt, 1e-4);
    this.targetYaw = Math.atan2(-dx, -dz);
    if (moved < step * 0.25) {
      this.stuckTimer += dt;
      if (this.stuckTimer > STUCK_TIME) this.recoverFromStuck();
    } else {
      this.stuckTimer = 0;
    }
    return false;
  }

  tryOpenDoorAhead(dx, dz) {
    const doors = this.level?.doors;
    if (!doors) return;
    const probe = this._v.set(this.position.x + dx * 1.15, this.position.y + 1.0, this.position.z + dz * 1.15);
    const d = doors.nearest(probe, 1.35);
    if (d && !d.isPassable && !d.locked) d.toggle(false);
    else if (d && d.locked && this.alerted) d.unlock();
  }

  recoverFromStuck() {
    this.stuckTimer = 0;
    this.path = null;
    // Nudge to the nearest clear nav node and repath next tick
    const node = this.nav.nearest(this.position, 3);
    if (node) {
      const clear = !collision.overlaps(node.x, node.y + 0.05, node.z, 0.34, 1.7);
      if (clear) this.position.set(node.x, node.y, node.z);
    }
    this.repathTimer = 0;
    bus.emit('ai:recovered', { enemy: this });
  }

  /* ---------------- Combat ---------------- */

  canShootAt(targetPos, targetCrouched) {
    const muzzle = this.eyePosition.clone();
    const aim = targetPos.clone();
    aim.y += targetCrouched ? 0.85 : 1.3;
    const dir = aim.clone().sub(muzzle);
    const dist = dir.length();
    dir.divideScalar(dist);
    const hit = collision.raycast(muzzle, dir, dist - 0.15);
    if (!hit) return true;
    // Shooting through glass is legitimate; through a wall is not
    const pane = this.level?.glass?.paneFromObject(hit.object);
    return !!pane;
  }

  shoot(targetPos, targetCrouched, player) {
    const d = this.difficulty;
    const muzzle = this.eyePosition.clone();
    const aim = targetPos.clone();
    aim.y += targetCrouched ? 0.9 : 1.32;
    const dist = muzzle.distanceTo(aim);
    const dir = aim.clone().sub(muzzle).normalize();

    // Aim error grows with distance and player movement, shrinks with difficulty
    const baseErr = d?.enemyAccuracyError ?? 2.6;
    const moveErr = Math.min(1.6, (player?.horizontalSpeed ?? 0) * 0.24);
    const spread = baseErr + moveErr + Math.min(2.2, dist * 0.035);
    const shotDir = dir.clone();
    coneJitter(shotDir, spread, this.rng);

    this.magazine--;
    this.animator.play('fire');
    if (this.muzzleTip) {
      this.muzzleTip.getWorldPosition(this._v);
      this.vfx?.muzzleFlash(this._v.clone(), dir.clone(), 'smg');
    } else {
      this.vfx?.muzzleFlash(muzzle.clone().addScaledVector(dir, 0.4), dir.clone(), 'smg');
    }
    this.audio?.play('wpn.smg.fire', { pos: muzzle.clone(), volume: 0.9 });
    bus.emit(EV.NOISE, { pos: muzzle.clone(), radius: 46, kind: 'gunshot', source: 'ai' });

    const hit = collision.raycast(muzzle, shotDir, 90);
    let endPoint = muzzle.clone().addScaledVector(shotDir, 60);
    // Does the shot line reach the player?
    const toPlayer = aim.clone().sub(muzzle);
    const along = toPlayer.dot(shotDir);
    const perp = toPlayer.clone().addScaledVector(shotDir, -along).length();
    const hitsPlayer = along > 0 && perp < 0.42 && (!hit || hit.distance > along - 0.3);
    if (hitsPlayer && player) {
      const falloff = dist > 30 ? 0.62 : 1;
      const dmg = (d?.enemyDamage ?? 15) * falloff * (perp < 0.16 ? 1.35 : 1);
      player.damage(dmg, muzzle.clone(), 'bullet');
      endPoint = aim.clone();
      this.audio?.play('hit.flesh', { pos: aim.clone(), volume: 0.55 });
    } else if (hit) {
      endPoint = hit.point.clone();
      const pane = this.level?.glass?.paneFromObject(hit.object);
      if (pane && pane.state !== 'broken') {
        pane.damage(30, hit.point.clone(), shotDir.clone());
      } else {
        const surface = matSurface(hit.matName);
        this.vfx?.impact(hit.point.clone(), hit.normal.clone(), surface);
        this.audio?.play(`impact.${surface}`, { pos: hit.point.clone(), volume: 0.5 });
      }
    }
    this.vfx?.tracer(muzzle.clone().addScaledVector(dir, 0.35), endPoint, { family: 'smg', enemy: true });
  }

  findCover(threatPos) {
    if (!this.nav) return null;
    const candidates = [];
    const R = 7.5;
    for (let i = 0; i < 22; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 1.5 + this.rng() * R;
      const p = new THREE.Vector3(this.position.x + Math.cos(a) * r, this.position.y, this.position.z + Math.sin(a) * r);
      const node = this.nav.nearest(p, 1.6);
      if (!node || node.disabled) continue;
      const eye = new THREE.Vector3(node.x, node.y + EYE_HEIGHT, node.z);
      const crouchEye = new THREE.Vector3(node.x, node.y + 1.05, node.z);
      const threatEye = threatPos.clone().setY(threatPos.y + 1.5);
      const exposedStanding = collision.lineOfSight(eye, threatEye);
      const exposedCrouched = collision.lineOfSight(crouchEye, threatEye);
      if (exposedCrouched && exposedStanding) continue;
      const dist = this.position.distanceTo(new THREE.Vector3(node.x, node.y, node.z));
      const towardThreat = threatPos.distanceTo(new THREE.Vector3(node.x, node.y, node.z));
      candidates.push({
        node, score: -dist * 0.6 - Math.abs(towardThreat - 11) * 0.5 + (exposedStanding ? 1.5 : 0),
        crouch: !exposedCrouched && exposedStanding ? false : true,
      });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score);
    const c = candidates[0];
    return { pos: new THREE.Vector3(c.node.x, c.node.y, c.node.z), crouch: c.crouch };
  }

  /* ---------------- Frame ---------------- */

  update(dt, ctx) {
    this.stateTimeGlobal = (this.stateTimeGlobal ?? 0) + dt;
    if (!this.alive) {
      this.animator.update(dt, { speed: 0 });
      this.group.position.copy(this.position);
      this.group.rotation.y = this.yaw;
      return;
    }
    if (this.frozen) {
      this.animator.update(dt, { speed: 0 });
      return;
    }
    this.stateTime += dt;
    this.voiceCooldown = Math.max(0, this.voiceCooldown - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.repathTimer -= dt;

    const player = ctx.player;
    const d = this.difficulty;
    const blind = this.stateTimeGlobal < this.blindUntil;

    /* ---- Perception ---- */
    let sight = { visible: false, dist: 999 };
    if (player?.alive && !blind) {
      sight = this.canSee(player.position, player.isCrouched, ctx.smokeVolumes ?? []);
    }
    if (sight.visible) {
      const gain = (d?.enemyAwarenessRate ?? 2.4) * (1 / Math.max(0.6, sight.dist * 0.08)) * (player.isCrouched ? 0.65 : 1);
      this.awareness = Math.min(1, this.awareness + gain * dt);
      this.lastKnownTarget = player.position.clone();
      this.lastSeenTime = this.stateTimeGlobal;
      if (this.awareness >= 1 && this.state !== AI_STATE.COMBAT) this.enterState(AI_STATE.COMBAT);
      else if (this.awareness > 0.3 && (this.state === AI_STATE.PATROL || this.state === AI_STATE.IDLE)) this.enterState(AI_STATE.SUSPICIOUS);
    } else {
      this.awareness = Math.max(0, this.awareness - 0.22 * dt);
    }

    /* ---- Reload ---- */
    if (this.magazine <= 0 && this.stateTimeGlobal > this.reloadUntil) {
      this.reloadUntil = this.stateTimeGlobal + 2.4;
      this.animator.play('reload');
      this.say('vo.hostile.reloading', 0.8);
      this.audio?.play('wpn.smg.reload', { pos: this.position.clone(), volume: 0.7 });
      bus.emit(EV.NOISE, { pos: this.position.clone(), radius: 8, kind: 'reload', source: 'ai' });
    }
    if (this.magazine <= 0 && this.stateTimeGlobal >= this.reloadUntil - 0.05 && this.reloadUntil > 0) {
      this.magazine = this.magazineSize;
    }
    const reloading = this.magazine <= 0;

    /* ---- Behaviour ---- */
    switch (this.state) {
      case AI_STATE.IDLE:
      case AI_STATE.PATROL:
        this.updatePatrol(dt);
        break;
      case AI_STATE.SUSPICIOUS:
        this.updateSuspicious(dt);
        break;
      case AI_STATE.INVESTIGATE:
        this.updateInvestigate(dt);
        break;
      case AI_STATE.COMBAT:
      case AI_STATE.COVER:
      case AI_STATE.ADVANCE:
        this.updateCombat(dt, ctx, sight, reloading);
        break;
      case AI_STATE.SEARCH:
        this.updateSearch(dt);
        break;
      case AI_STATE.STUNNED:
        this.speed = 0;
        if (this.stateTimeGlobal >= this.blindUntil) this.enterState(this.lastKnownTarget ? AI_STATE.COMBAT : AI_STATE.SEARCH);
        break;
      default:
        break;
    }

    /* ---- Facing and pose ---- */
    let yawDelta = wrapAngle(this.targetYaw - this.yaw);
    const turnRate = this.state === AI_STATE.COMBAT ? 7.5 : 4.2;
    this.yaw += THREE.MathUtils.clamp(yawDelta, -turnRate * dt, turnRate * dt);
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;

    const aiming = this.state === AI_STATE.COMBAT || this.state === AI_STATE.COVER;
    let anim = 'idle';
    if (this.speed > 2.4) anim = 'run';
    else if (this.speed > 0.25) anim = this.crouching ? 'crouchWalk' : 'walk';
    else if (this.crouching) anim = 'crouchIdle';
    else if (aiming) anim = 'aim';
    else if (this.state === AI_STATE.INVESTIGATE) anim = 'investigate';
    else if (this.state === AI_STATE.SEARCH) anim = 'search';
    if (!this.animator.busy) this.animator.play(anim);

    if (this.lastKnownTarget) {
      const dy = this.lastKnownTarget.y + 1.3 - (this.position.y + EYE_HEIGHT);
      const dh = Math.hypot(this.lastKnownTarget.x - this.position.x, this.lastKnownTarget.z - this.position.z);
      this.lookPitch = THREE.MathUtils.clamp(Math.atan2(dy, Math.max(0.3, dh)), -0.6, 0.6);
    } else {
      this.lookPitch *= 0.9;
    }
    this.animator.update(dt, {
      speed: this.speed, aiming, lookYaw: 0, lookPitch: this.lookPitch, crouched: this.crouching,
    });
  }

  updatePatrol(dt) {
    this.crouching = false;
    if (!this.path || this.pathIndex >= (this.path?.length ?? 0)) {
      if (this.patrolWaitUntil && this.stateTimeGlobal < this.patrolWaitUntil) {
        this.speed = 0;
        // Look around while waiting so they never appear frozen
        this.targetYaw = this.patrolLookYaw ?? this.yaw;
        return;
      }
      const route = this.patrolRoute;
      if (route.length) {
        const next = route[this.patrolIndex % route.length];
        this.patrolIndex++;
        if (this.setDestination(next)) {
          this.patrolWaitUntil = 0;
        } else {
          this.patrolWaitUntil = this.stateTimeGlobal + 1.2;
        }
      } else {
        const p = this.nav.randomPoint(this.rng, (n) => n.room === this.homeRoom);
        if (p) this.setDestination(p);
        else this.patrolWaitUntil = this.stateTimeGlobal + 2;
      }
      if (this.patrolWaitUntil === 0) return;
      this.patrolWaitUntil = this.stateTimeGlobal + 2.2 + this.rng() * 2.6;
      this.patrolLookYaw = this.yaw + (this.rng() - 0.5) * 2.4;
      return;
    }
    const done = this.followPath(dt, 1.45);
    if (done) {
      this.patrolWaitUntil = this.stateTimeGlobal + 1.5 + this.rng() * 2.5;
      this.patrolLookYaw = this.yaw + (this.rng() - 0.5) * 2.6;
    }
  }

  updateSuspicious(dt) {
    this.speed = 0;
    this.crouching = false;
    if (this.lastKnownTarget) {
      this.targetYaw = Math.atan2(-(this.lastKnownTarget.x - this.position.x), -(this.lastKnownTarget.z - this.position.z));
    }
    if (this.awareness >= 1) { this.enterState(AI_STATE.COMBAT); return; }
    if (this.stateTime > 1.6) {
      if (this.awareness > 0.35) this.enterState(AI_STATE.INVESTIGATE);
      else this.enterState(AI_STATE.PATROL);
    }
  }

  updateInvestigate(dt) {
    this.crouching = false;
    if (!this.lastKnownTarget) { this.enterState(AI_STATE.PATROL); return; }
    if (!this.path && this.repathTimer <= 0) {
      this.repathTimer = REPATH_INTERVAL;
      if (!this.setDestination(this.lastKnownTarget)) {
        this.enterState(AI_STATE.SEARCH);
        return;
      }
    }
    const done = this.followPath(dt, 2.2);
    if (done) {
      if (this.stateTime > 2.4) this.enterState(AI_STATE.SEARCH);
      this.speed = 0;
      this.targetYaw = this.yaw + Math.sin(this.stateTime * 1.4) * 1.2;
    }
    if (this.stateTime > 22) this.enterState(AI_STATE.PATROL);
  }

  updateSearch(dt) {
    this.crouching = false;
    if (!this.searchPoints.length) {
      if (this.stateTime > 4) {
        this.alerted = false;
        this.contactCalled = false;
        this.enterState(AI_STATE.PATROL);
      }
      this.speed = 0;
      this.targetYaw = this.yaw + Math.sin(this.stateTime * 1.6) * 1.1;
      return;
    }
    if (!this.path && this.repathTimer <= 0) {
      this.repathTimer = REPATH_INTERVAL;
      const target = this.searchPoints[0];
      if (!this.setDestination(target)) this.searchPoints.shift();
    }
    const done = this.followPath(dt, 2.0);
    if (done) {
      this.searchPoints.shift();
      this.path = null;
      this.speed = 0;
    }
    if (this.stateTime > 34) {
      this.alerted = false;
      this.contactCalled = false;
      this.enterState(AI_STATE.PATROL);
    }
  }

  updateCombat(dt, ctx, sight, reloading) {
    const player = ctx.player;
    const d = this.difficulty;
    if (!player?.alive) { this.enterState(AI_STATE.SEARCH); return; }
    const since = this.stateTimeGlobal - this.lastSeenTime;
    if (since > (d?.enemyMemory ?? 6.5)) {
      this.enterState(AI_STATE.SEARCH);
      return;
    }
    const target = this.lastKnownTarget ?? player.position;
    this.targetYaw = Math.atan2(-(target.x - this.position.x), -(target.z - this.position.z));

    const wantCover = reloading || this.stateTimeGlobal < this.suppressedUntil || this.health < this.maxHealth * 0.55;
    if (wantCover && (!this.coverSpot || this.stateTimeGlobal > this.coverUntil)) {
      const cover = this.findCover(target);
      if (cover) {
        this.coverSpot = cover;
        this.coverUntil = this.stateTimeGlobal + 5.5;
        this.setDestination(cover.pos);
        this.animator.play('takeCover');
      }
    }

    if (this.coverSpot && this.position.distanceTo(this.coverSpot.pos) > 0.5) {
      this.followPath(dt, 3.1);
      this.crouching = false;
      return;
    }
    if (this.coverSpot) {
      this.crouching = !!this.coverSpot.crouch && (reloading || this.fireCooldown > 0.35);
      this.speed = 0;
      if (this.stateTimeGlobal > this.coverUntil) this.coverSpot = null;
    } else {
      // Close the distance / flank when they have the initiative
      const dist = this.position.distanceTo(player.position);
      const preferred = d?.enemyPreferredRange ?? 9;
      if (!sight.visible || dist > preferred + 4) {
        if (this.repathTimer <= 0) {
          this.repathTimer = REPATH_INTERVAL;
          const flank = this.pickFlank(player.position, preferred);
          this.setDestination(flank ?? player.position);
        }
        this.followPath(dt, 3.3);
      } else if (dist < preferred - 3.5) {
        if (this.repathTimer <= 0) {
          this.repathTimer = REPATH_INTERVAL * 2;
          const back = this.position.clone().sub(player.position).setY(0).normalize().multiplyScalar(3.5).add(this.position);
          this.setDestination(back);
        }
        this.followPath(dt, 2.4);
      } else {
        // Strafe rather than stand still
        this.speed = 0;
        if (this.repathTimer <= 0) {
          this.repathTimer = 1.1 + this.rng();
          const side = new THREE.Vector3(-Math.cos(this.targetYaw), 0, Math.sin(this.targetYaw)).multiplyScalar(this.strafeDir * 2.4);
          if (!this.setDestination(this.position.clone().add(side))) this.strafeDir *= -1;
        }
        this.followPath(dt, 1.9);
      }
      this.crouching = false;
    }

    /* ---- Firing ---- */
    if (reloading || this.fireCooldown > 0) return;
    if (!sight.visible) return;
    if (!this.canShootAt(player.position, player.isCrouched)) return;
    if (this.burstRemaining <= 0) {
      if (this.stateTimeGlobal < (this.nextBurstAt ?? 0)) return;
      this.burstRemaining = 2 + this.rng.int(0, d?.enemyBurstBonus ?? 3);
    }
    this.shoot(player.position, player.isCrouched, player);
    this.burstRemaining--;
    this.fireCooldown = 0.1;
    if (this.burstRemaining <= 0) {
      this.nextBurstAt = this.stateTimeGlobal + (d?.enemyBurstPause ?? 0.9) * (0.6 + this.rng() * 0.9);
    }
  }

  pickFlank(targetPos, preferred) {
    const a = Math.atan2(this.position.z - targetPos.z, this.position.x - targetPos.x) + this.strafeDir * 0.9;
    const p = new THREE.Vector3(
      targetPos.x + Math.cos(a) * preferred,
      targetPos.y,
      targetPos.z + Math.sin(a) * preferred,
    );
    const node = this.nav.nearest(p, 5);
    return node ? new THREE.Vector3(node.x, node.y, node.z) : null;
  }

  applyFlash(pos, radius, duration) {
    if (!this.alive) return;
    const dist = this.position.distanceTo(pos);
    if (dist > radius) return;
    const dir = pos.clone().sub(this.eyePosition).normalize();
    const facing = Math.max(0, this.forward.dot(dir));
    if (!collision.lineOfSight(this.eyePosition.clone(), pos.clone())) return;
    const strength = (1 - dist / radius) * (0.35 + facing * 0.65);
    this.blindUntil = this.stateTimeGlobal + duration * strength;
    this.awareness = Math.min(this.awareness, 0.3);
    this.enterState(AI_STATE.STUNNED);
    this.animator.play('flinch');
  }

  serialize(playerPos) {
    const room = roomAt(this.position.x, this.position.z, this.position.y > 2.3 ? 'upper' : 'ground');
    const out = {
      id: this.id,
      variant: this.variantId,
      alive: this.alive,
      health: Math.max(0, Math.round(this.health)),
      state: this.state,
      awareness: Math.round(this.awareness * 100) / 100,
      position: [r2(this.position.x), r2(this.position.y), r2(this.position.z)],
      yawDeg: Math.round(THREE.MathUtils.radToDeg(this.yaw)),
      room: room?.id ?? 'exterior',
      weapon: this.weaponId,
      magazine: this.magazine,
    };
    if (playerPos) {
      out.distance = r2(this.position.distanceTo(playerPos));
      out.hasLineOfSight = this.alive
        ? collision.lineOfSight(this.eyePosition.clone(), playerPos.clone().setY(playerPos.y + 1.5))
        : false;
    }
    return out;
  }

  dispose() {
    this.group.removeFromParent();
  }
}

/* ---------------- helpers ---------------- */

function r2(v) {
  return Math.round(v * 100) / 100;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
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

function coneJitter(dir, degrees, rng) {
  const rad = THREE.MathUtils.degToRad(degrees);
  const a = rng() * Math.PI * 2;
  const r = Math.sqrt(rng()) * rad;
  const up = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();
  dir.addScaledVector(right, Math.cos(a) * Math.tan(r));
  dir.addScaledVector(realUp, Math.sin(a) * Math.tan(r));
  dir.normalize();
}

function matSurface(matName) {
  const fam = String(matName ?? '').split('.')[0];
  const map = {
    drywall: 'drywall', plaster: 'drywall', ceiling: 'tile', carpet: 'carpet', fabric: 'carpet',
    vinyl: 'vinyl', tile: 'ceramic', concrete: 'concrete', wood: 'wood', laminate: 'wood',
    metal: 'metal', glass: 'glass', plastic: 'plastic', rubber: 'rubber', snow: 'snow',
  };
  return map[fam] ?? 'concrete';
}

export { HOSTILE_VARIANTS };
