import * as THREE from 'three';
import { Humanoid } from '../../assets/models/characters/humanoid';
import { buildSkin, kestrelOutfits } from '../../assets/models/characters/skins';
import type { CollisionWorld } from '../../world/collision';
import type { NavGrid } from '../nav';
import type { Player } from '../player';
import type { DifficultyDef, EnemyStateName } from '../types';
import type { Door } from '../../world/doors';
import { PATROLS } from '../../world/layout';
import { events } from '../../core/events';
import { Rng } from '../../core/rng';
import type { HitVolume } from '../combat';

/** Enemy weapon behavior specs (visual model ids map to weapon defs). */
interface EnemyWeapon {
  id: string;
  damage: number;
  rpm: number;
  burst: [number, number];
  mag: number;
  reloadTime: number;
  baseError: number; // radians at 10m for accuracy 0
  range: number;
  loudness: number;
}

const ENEMY_WEAPONS: EnemyWeapon[] = [
  { id: 'kis10', damage: 9, rpm: 700, burst: [3, 6], mag: 30, reloadTime: 2.6, baseError: 0.09, range: 26, loudness: 30 },
  { id: 'vc7', damage: 13, rpm: 560, burst: [2, 4], mag: 30, reloadTime: 2.9, baseError: 0.075, range: 40, loudness: 42 },
  { id: 'br8', damage: 26, rpm: 70, burst: [1, 1], mag: 6, reloadTime: 3.4, baseError: 0.13, range: 14, loudness: 46 },
];

export interface AIContext {
  player: Player;
  col: CollisionWorld;
  nav: NavGrid;
  difficulty: DifficultyDef;
  doors: Door[];
  time: number;
  frozen: boolean;
  /** spheres blocking vision (smoke volumes) */
  visionBlockers: { center: THREE.Vector3; r: number; until: number }[];
  onEnemyFire: (from: THREE.Vector3, to: THREE.Vector3, weapon: EnemyWeapon, enemy: Enemy) => void;
}

const EYE = 1.58;
const RADIUS = 0.32;
const HEIGHT = 1.72;

let enemySeq = 0;

export class Enemy {
  readonly id: string;
  pos = new THREE.Vector3();
  yaw = 0;
  private vy = 0;
  health: number;
  state: EnemyStateName = 'patrol';
  stateT = 0;
  suspicion = 0;
  readonly humanoid: Humanoid;
  readonly group: THREE.Group;
  private route: THREE.Vector3[];
  private routeIdx = 0;
  private routeWait = 0;
  private path: THREE.Vector3[] | null = null;
  private pathIdx = 0;
  private repathT = 0;
  private lastKnown = new THREE.Vector3();
  private lastSeenAt = -99;
  private heardAt = -99;
  private searchPts: THREE.Vector3[] = [];
  private weapon: EnemyWeapon;
  private mag: number;
  private reloadT = -1;
  private burstLeft = 0;
  private shotCooldown = 0;
  private reactT = 0;
  private stunT = 0;
  private stuckT = 0;
  private lastPosCheck = new THREE.Vector3();
  private posCheckT = 0;
  private rng: Rng;
  private speedNow = 0;
  private coverPoint: THREE.Vector3 | null = null;
  spawnPos = new THREE.Vector3();
  spawnYaw = 0;

  constructor(routePoints: THREE.Vector3[], outfitIdx: number, headVariant: number, weaponIdx: number, hp: number, rng: Rng) {
    this.id = `enemy-${enemySeq++}`;
    this.rng = rng;
    this.route = routePoints;
    this.health = hp;
    this.weapon = ENEMY_WEAPONS[weaponIdx % ENEMY_WEAPONS.length];
    this.mag = this.weapon.mag;
    const outfits = kestrelOutfits();
    this.humanoid = new Humanoid(buildSkin(outfits[outfitIdx % outfits.length], headVariant, true));
    this.group = this.humanoid.root;
    this.pos.copy(routePoints[0]);
    this.spawnPos.copy(routePoints[0]);
    this.group.position.copy(this.pos);
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  eye(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(this.pos.x, this.pos.y + EYE, this.pos.z);
  }

  damage(amount: number, part: 'head' | 'body' | 'limb', from: THREE.Vector3, dir: THREE.Vector3): void {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.state = 'dead';
      this.humanoid.die(dir, this.rng.chance(0.5) ? 1 : -1);
      events.emit('enemy:killed', { id: this.id, byPlayer: true });
      return;
    }
    // getting shot: instant combat awareness toward shooter
    this.humanoid.setAnim('flinch');
    this.suspicion = 1;
    this.lastKnown.copy(from);
    this.enterCombat();
    // consider cover when hurt
    if (this.health < 45) this.coverPoint = null; // force re-eval
  }

  stun(duration: number): void {
    this.stunT = Math.max(this.stunT, duration);
    this.suspicion = 1;
  }

  private enterCombat(): void {
    if (this.state !== 'combat') {
      this.state = 'combat';
      this.stateT = 0;
      this.reactT = 0;
      this.burstLeft = 0;
      events.emit('enemy:alerted', { id: this.id });
    }
  }

  step(dt: number, ctx: AIContext): void {
    if (!this.alive) {
      this.humanoid.update(dt, 0);
      return;
    }
    if (ctx.frozen) {
      this.humanoid.update(dt, 0);
      return;
    }
    this.stateT += dt;
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    if (this.stunT > 0) {
      this.stunT -= dt;
      this.humanoid.setAnim('flinch');
      this.humanoid.update(dt, 0);
      this.applyTransform(dt, 0, 0);
      return;
    }
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      if (this.reloadT >= this.weapon.reloadTime) {
        this.reloadT = -1;
        this.mag = this.weapon.mag;
      }
    }

    const seen = this.canSeePlayer(ctx);
    if (seen) {
      const d = this.pos.distanceTo(ctx.player.pos);
      const crouchFactor = ctx.player.crouchT > 0.5 ? 0.5 : 1;
      const moveFactor = 0.55 + Math.min(1, Math.hypot(ctx.player.vel.x, ctx.player.vel.z) / 4) * 0.8;
      const proximityFactor = THREE.MathUtils.clamp(1.6 - d / ctx.difficulty.visionRange, 0.25, 1.8);
      this.suspicion = Math.min(1.2, this.suspicion + dt * 1.7 * crouchFactor * moveFactor * proximityFactor);
      if (this.suspicion >= 1) {
        this.lastKnown.copy(ctx.player.pos);
        this.lastSeenAt = ctx.time;
        this.enterCombat();
      } else if (this.suspicion > 0.35 && (this.state === 'patrol' || this.state === 'idle')) {
        this.state = 'suspicious';
        this.stateT = 0;
        this.lastKnown.copy(ctx.player.pos);
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.35);
    }

    switch (this.state) {
      case 'patrol': this.doPatrol(dt, ctx); break;
      case 'idle': this.doIdle(dt, ctx); break;
      case 'suspicious': this.doSuspicious(dt, ctx, seen); break;
      case 'investigate': this.doInvestigate(dt, ctx); break;
      case 'combat': this.doCombat(dt, ctx, seen); break;
      case 'search': this.doSearch(dt, ctx); break;
      case 'dead': break;
    }
  }

  hearNoise(pos: THREE.Vector3, radius: number, kind: string, ctx: AIContext): void {
    if (!this.alive || this.stunT > 0) return;
    const d = this.pos.distanceTo(pos);
    const effective = radius * ctx.difficulty.hearingMult;
    if (d > effective) return;
    this.heardAt = ctx.time;
    const loud = kind === 'gunshot' || kind === 'glass' || kind === 'radio-alert';
    if (this.state === 'combat') {
      if (loud) this.lastKnown.copy(pos);
      return;
    }
    if (loud || d < effective * 0.6) {
      this.lastKnown.copy(pos);
      if (loud) {
        this.suspicion = Math.max(this.suspicion, 0.85);
        this.state = 'investigate';
        this.stateT = 0;
        this.path = null;
        events.emit('enemy:alerted', { id: this.id });
      } else if (this.state !== 'investigate') {
        this.suspicion = Math.max(this.suspicion, 0.5);
        this.state = 'suspicious';
        this.stateT = 0;
      }
    }
  }

  private canSeePlayer(ctx: AIContext): boolean {
    if (!ctx.player.alive) return false;
    const d = this.pos.distanceTo(ctx.player.pos);
    const range = ctx.difficulty.visionRange * (ctx.player.crouchT > 0.5 ? 0.72 : 1);
    if (d > range) return false;
    // FOV check
    const toP = Math.atan2(-(ctx.player.pos.x - this.pos.x), -(ctx.player.pos.z - this.pos.z));
    let dyaw = toP - this.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    const fov = this.state === 'combat' ? Math.PI * 0.85 : Math.PI * 0.58;
    if (Math.abs(dyaw) > fov / 2 && d > 1.6) return false;
    // LOS (clear glass transparent, smoke blocks)
    const eye = this.eye();
    const pEye = ctx.player.eyePos();
    for (const s of ctx.visionBlockers) {
      if (s.until > ctx.time && segSphere(eye, pEye, s.center, s.r)) return false;
    }
    return ctx.col.hasLineOfSight(eye, pEye);
  }

  // ---- states ----

  private doPatrol(dt: number, ctx: AIContext): void {
    if (this.route.length < 2) {
      this.state = 'idle';
      return;
    }
    const target = this.route[this.routeIdx];
    if (this.routeWait > 0) {
      this.routeWait -= dt;
      this.humanoid.setAnim('idle');
      this.faceTowards(this.yaw + Math.sin(this.stateT * 0.6) * 0.7, dt, 2);
      this.applyTransform(dt, 0, 0);
      this.humanoid.update(dt, 0);
      return;
    }
    const arrived = this.moveAlongNav(dt, ctx, target, 1.35, 'walk');
    if (arrived) {
      this.routeIdx = (this.routeIdx + 1) % this.route.length;
      this.routeWait = 0.8 + this.rng.next() * 2.4;
      this.path = null;
    }
  }

  private doIdle(dt: number, ctx: AIContext): void {
    this.humanoid.setAnim('idle');
    this.faceTowards(this.spawnYaw + Math.sin(ctx.time * 0.35 + this.pos.x) * 0.5, dt, 1.6);
    this.applyTransform(dt, 0, 0);
    this.humanoid.update(dt, 0);
  }

  private doSuspicious(dt: number, ctx: AIContext, seen: boolean): void {
    this.humanoid.setAnim('idle');
    this.facePoint(this.lastKnown, dt, 5);
    this.applyTransform(dt, 0, 0);
    this.humanoid.update(dt, 0);
    if (this.stateT > 1.1) {
      this.state = 'investigate';
      this.stateT = 0;
      this.path = null;
    }
    if (!seen && this.suspicion < 0.1 && this.stateT > 2) {
      this.state = 'patrol';
      this.stateT = 0;
    }
  }

  private doInvestigate(dt: number, ctx: AIContext): void {
    const d = Math.hypot(this.lastKnown.x - this.pos.x, this.lastKnown.z - this.pos.z);
    if (d > 1.2) {
      this.moveAlongNav(dt, ctx, this.lastKnown, 1.9, 'search');
    } else {
      this.humanoid.setAnim('search');
      this.faceTowards(this.yaw + dt * 1.4, dt, 3);
      this.applyTransform(dt, 0, 0);
      this.humanoid.update(dt, 0);
      if (this.stateT > 3.2) {
        this.state = 'patrol';
        this.stateT = 0;
        this.path = null;
        this.suspicion = 0;
      }
    }
  }

  private doCombat(dt: number, ctx: AIContext, seen: boolean): void {
    if (seen) {
      this.lastSeenAt = ctx.time;
      this.lastKnown.copy(ctx.player.pos);
    }
    const sinceSeen = ctx.time - this.lastSeenAt;
    if (sinceSeen > 6) {
      this.state = 'search';
      this.stateT = 0;
      this.searchPts = [];
      this.path = null;
      return;
    }
    // reload behavior: find cover-ish spot while reloading
    if (this.mag <= 0 && this.reloadT < 0) {
      this.reloadT = 0;
      events.emit('weapon:reload', { weaponId: `${this.id}:${this.weapon.id}`, stage: 'enemy' });
    }

    const dist = this.pos.distanceTo(ctx.player.pos);
    const desired = this.weapon.range * 0.55;
    let moved = false;
    if (this.reloadT >= 0 && seen) {
      // seek cover during reload
      if (!this.coverPoint) this.coverPoint = this.findCover(ctx);
      if (this.coverPoint && this.pos.distanceTo(this.coverPoint) > 0.5) {
        this.moveAlongNav(dt, ctx, this.coverPoint, 2.7, 'aim-walk');
        moved = true;
      }
    } else if (!seen && sinceSeen > 0.7) {
      // push toward last known
      this.moveAlongNav(dt, ctx, this.lastKnown, 2.5, 'aim-walk');
      moved = true;
    } else if (dist > desired + 4) {
      this.moveAlongNav(dt, ctx, ctx.player.pos, 2.3, 'aim-walk');
      moved = true;
    } else if (dist < 3.5 && this.weapon.id !== 'br8') {
      // back off slightly
      const away = this.pos.clone().sub(ctx.player.pos).setY(0).normalize().multiplyScalar(4).add(this.pos);
      const pt = ctx.nav.randomNear(away, 2, () => this.rng.next());
      if (pt) {
        this.moveAlongNav(dt, ctx, pt, 2.1, 'aim-walk');
        moved = true;
      }
    }
    if (!moved) {
      this.humanoid.setAnim('aim');
      this.facePoint(ctx.player.pos, dt, 7);
      this.applyTransform(dt, 0, 0);
      this.humanoid.update(dt, 0);
    }
    // aim pitch for visuals
    const dy = ctx.player.eyePos().y - (this.pos.y + EYE);
    this.humanoid.aimPitch = Math.atan2(dy, Math.max(0.5, dist));

    // firing
    if (seen && this.reloadT < 0 && this.mag > 0) {
      this.reactT += dt;
      if (this.reactT >= ctx.difficulty.enemyReactionTime) {
        if (this.burstLeft <= 0 && this.shotCooldown <= 0) {
          this.burstLeft = Math.round(this.rng.range(this.weapon.burst[0], this.weapon.burst[1]));
          this.shotCooldown = 0;
        }
        if (this.burstLeft > 0 && this.shotCooldown <= 0) {
          this.fireAtPlayer(ctx);
          this.burstLeft--;
          this.mag--;
          this.shotCooldown = this.burstLeft > 0 ? 60 / this.weapon.rpm : this.rng.range(0.5, 1.1);
        }
      }
    } else {
      this.reactT = Math.min(this.reactT, ctx.difficulty.enemyReactionTime * 0.6);
    }
  }

  private doSearch(dt: number, ctx: AIContext): void {
    if (this.searchPts.length === 0) {
      for (let i = 0; i < 3; i++) {
        const p = ctx.nav.randomNear(this.lastKnown, 6, () => this.rng.next());
        if (p) this.searchPts.push(p);
      }
      if (this.searchPts.length === 0) {
        this.state = 'patrol';
        return;
      }
    }
    const target = this.searchPts[0];
    const arrived = this.moveAlongNav(dt, ctx, target, 1.9, 'search');
    if (arrived) {
      this.searchPts.shift();
      this.path = null;
      if (this.searchPts.length === 0 || this.stateT > 16) {
        this.state = 'patrol';
        this.stateT = 0;
        this.suspicion = 0;
        events.emit('enemy:alerted', { id: `${this.id}:standdown` });
      }
    }
  }

  // ---- helpers ----

  private fireAtPlayer(ctx: AIContext): void {
    const from = this.humanoid.muzzleWorld(new THREE.Vector3());
    const targetEye = ctx.player.eyePos();
    // aim error
    const dist = from.distanceTo(targetEye);
    const acc = ctx.difficulty.enemyAccuracy;
    const err = this.weapon.baseError * (1 - acc * 0.75) * (dist / 10 + 0.4)
      * (ctx.player.crouchT > 0.5 ? 0.85 : 1)
      * (Math.hypot(ctx.player.vel.x, ctx.player.vel.z) > 2 ? 1.35 : 1);
    const hitRoll = this.rng.next();
    const pHit = THREE.MathUtils.clamp(acc * (1.15 - dist / (this.weapon.range * 1.6)), 0.06, 0.85);
    const aim = targetEye.clone().add(new THREE.Vector3(
      (this.rng.next() - 0.5) * 2, (this.rng.next() - 0.5) * 1.2, (this.rng.next() - 0.5) * 2,
    ).multiplyScalar(hitRoll < pHit ? 0.05 : err * dist * 0.5 + 0.25));
    const dir = aim.sub(from).normalize();
    // verify path is actually clear of world geometry to avoid shooting through walls
    const worldHit = ctx.col.raycast(from, dir, dist + 2, {});
    const clearToPlayer = !worldHit || worldHit.t > dist - 0.4;
    if (hitRoll < pHit && clearToPlayer && ctx.player.alive) {
      ctx.player.damage(this.weapon.damage * ctx.difficulty.enemyDamageMult, this.pos);
    } else {
      // impact near player for feedback
      const impactPoint = worldHit;
      if (impactPoint) {
        events.emit('impact', {
          surface: impactPoint.box.surface,
          pos: [impactPoint.point.x, impactPoint.point.y, impactPoint.point.z],
          normal: [impactPoint.normal.x, impactPoint.normal.y, impactPoint.normal.z],
        });
      }
    }
    this.humanoid.fire();
    events.emit('weapon:fired', { weaponId: `enemy:${this.weapon.id}`, pos: [from.x, from.y, from.z], loudness: this.weapon.loudness });
    events.emit('noise', { pos: [from.x, from.y, from.z], radius: this.weapon.loudness, kind: 'gunshot' });
    ctx.onEnemyFire(from, from.clone().addScaledVector(dir, dist + 2), this.weapon, this);
  }

  private findCover(ctx: AIContext): THREE.Vector3 | null {
    const pEye = ctx.player.eyePos();
    for (let i = 0; i < 8; i++) {
      const p = ctx.nav.randomNear(this.pos, 6, () => this.rng.next());
      if (!p) continue;
      const standEye = p.clone();
      standEye.y += EYE;
      if (!ctx.col.hasLineOfSight(standEye, pEye)) return p;
    }
    return null;
  }

  /** returns true when arrived at target (horizontal arrival; stimuli may float) */
  private moveAlongNav(dt: number, ctx: AIContext, target: THREE.Vector3, speed: number, anim: 'walk' | 'search' | 'aim-walk'): boolean {
    const dyPenalty = Math.abs(target.y - this.pos.y) > 2 ? 2 : 0;
    const flatDist = Math.hypot(target.x - this.pos.x, target.z - this.pos.z) + dyPenalty;
    if (flatDist < 0.45) {
      this.humanoid.setAnim(anim === 'aim-walk' ? 'aim' : 'idle');
      this.applyTransform(dt, 0, 0);
      this.humanoid.update(dt, 0);
      return true;
    }
    this.repathT -= dt;
    if (!this.path || this.pathIdx >= this.path.length || this.repathT <= 0) {
      const dest = this.path && this.pathIdx < this.path.length ? this.path[this.path.length - 1] : null;
      if (!this.path || this.repathT <= 0 || !dest || dest.distanceTo(target) > 1.2) {
        this.path = ctx.nav.findPath(this.pos, target);
        this.pathIdx = 0;
        this.repathT = 1.1 + this.rng.next() * 0.4;
        if (!this.path) {
          // navigation recovery: nudge to nearest node
          const n = ctx.nav.nearest(this.pos, 4);
          if (n) {
            const w = ctx.nav.worldOf(n);
            this.pos.set(w.x, w.y, w.z);
          }
          this.humanoid.setAnim('idle');
          this.applyTransform(dt, 0, 0);
          this.humanoid.update(dt, 0);
          return false;
        }
      }
    }
    const wp = this.path[this.pathIdx];
    const dx = wp.x - this.pos.x;
    const dz = wp.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.34) {
      this.pathIdx++;
      return this.pathIdx >= this.path.length
        && Math.hypot(target.x - this.pos.x, target.z - this.pos.z) < 0.9;
    }
    // open doors ahead
    this.maybeOpenDoors(ctx);
    const vx = (dx / d) * speed;
    const vz = (dz / d) * speed;
    this.vy -= 16 * dt;
    const res = ctx.col.capsuleMove(this.pos, RADIUS, HEIGHT, vx * dt, this.vy * dt, vz * dt, 0.36);
    this.pos.copy(res.pos);
    if (res.onGround && this.vy < 0) this.vy = 0;
    const moveYaw = Math.atan2(-dx, -dz);
    const combatFacing = anim === 'aim-walk' && (ctx.time - this.lastSeenAt) < 1.5;
    if (combatFacing) this.facePoint(ctx.player.pos, dt, 8);
    else this.faceTowards(moveYaw, dt, 9);
    this.humanoid.setAnim(anim === 'walk' ? 'walk' : anim === 'search' ? 'search' : 'aim-walk');
    this.speedNow = speed;
    this.applyTransform(dt, vx, vz);
    this.humanoid.update(dt, speed);
    // stuck watchdog
    this.posCheckT += dt;
    if (this.posCheckT > 1.6) {
      const moved = this.pos.distanceTo(this.lastPosCheck);
      if (moved < 0.22) {
        this.stuckT += this.posCheckT;
        this.path = null;
        this.repathT = 0;
        if (this.stuckT > 5) {
          const n = ctx.nav.nearest(target, 3) ?? ctx.nav.nearest(this.pos, 5);
          if (n) {
            const w = ctx.nav.worldOf(n);
            this.pos.set(w.x, w.y + 0.02, w.z);
          }
          this.stuckT = 0;
        }
      } else {
        this.stuckT = 0;
      }
      this.lastPosCheck.copy(this.pos);
      this.posCheckT = 0;
    }
    return false;
  }

  private maybeOpenDoors(ctx: AIContext): void {
    for (const door of ctx.doors) {
      if (door.isFullyClosed || door.state === 'closing') {
        const d2 = (door.center.x - this.pos.x) ** 2 + (door.center.z - this.pos.z) ** 2;
        const dy = Math.abs(door.center.y - (this.pos.y + 1));
        if (d2 < 1.7 && dy < 2) {
          door.open();
        }
      }
    }
  }

  private faceTowards(targetYaw: number, dt: number, rate: number): void {
    let d = targetYaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, rate * dt);
  }

  private facePoint(p: THREE.Vector3, dt: number, rate: number): void {
    this.faceTowards(Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z)), dt, rate);
  }

  private applyTransform(dt: number, vx: number, vz: number): void {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw + Math.PI; // rig faces +Z; yaw0 = -Z
  }

  hitVolumes(): HitVolume[] {
    if (!this.alive) return [];
    return this.humanoid.hitVolumes(this.id) as HitVolume[];
  }

  reset(): void {
    this.pos.copy(this.spawnPos);
    this.yaw = this.spawnYaw;
    this.state = 'patrol';
    this.stateT = 0;
    this.suspicion = 0;
    this.path = null;
    this.routeIdx = 0;
    this.routeWait = 0;
    this.mag = this.weapon.mag;
    this.reloadT = -1;
    this.stunT = 0;
    this.stuckT = 0;
    this.humanoid.reset();
    this.group.position.copy(this.pos);
  }

  snapshot(): Record<string, unknown> {
    return {
      id: this.id,
      pos: [round2(this.pos.x), round2(this.pos.y), round2(this.pos.z)],
      state: this.state,
      health: Math.max(0, Math.round(this.health)),
      suspicion: Math.round(this.suspicion * 100) / 100,
    };
  }
}

function segSphere(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, r: number): boolean {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(c.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  const closest = a.clone().addScaledVector(ab, t);
  return closest.distanceToSquared(c) < r * r;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export class AISystem {
  enemies: Enemy[] = [];
  readonly group = new THREE.Group();
  frozen = false;
  private rng: Rng;
  private unsub: (() => void)[] = [];

  constructor(rng: Rng) {
    this.rng = rng;
    this.group.name = 'enemies';
  }

  spawn(ctx: { nav: NavGrid; difficulty: DifficultyDef }): void {
    for (const e of this.enemies) this.group.remove(e.group);
    this.enemies = [];
    enemySeq = 0;
    const count = ctx.difficulty.enemyCount;
    const routes = [...PATROLS];
    let created = 0;
    let idx = 0;
    while (created < count) {
      const route = routes[idx % routes.length];
      const pts = route.points.map(([x, z]) => {
        const p = new THREE.Vector3(x, route.floorY, z);
        const n = ctx.nav.nearest(p, 3);
        return n ? ctx.nav.worldOf(n) : p;
      });
      // offset start point on second pass over the same route
      const startOffset = Math.floor(idx / routes.length) * 2 + (idx % 2);
      const rotated = pts.slice(startOffset % pts.length).concat(pts.slice(0, startOffset % pts.length));
      const enemy = new Enemy(
        rotated,
        this.rng.int(0, 2),
        this.rng.int(0, 3),
        this.rng.int(0, 2),
        ctx.difficulty.enemyHealth,
        this.rng.fork(created + 11),
      );
      enemy.spawnYaw = this.rng.range(-Math.PI, Math.PI);
      this.enemies.push(enemy);
      this.group.add(enemy.group);
      created++;
      idx++;
    }
  }

  bindNoise(getCtx: () => AIContext): void {
    this.unsub.push(events.on('noise', ({ pos, radius, kind }) => {
      const ctx = getCtx();
      if (ctx.frozen) return;
      const p = new THREE.Vector3(pos[0], pos[1], pos[2]);
      for (const e of this.enemies) e.hearNoise(p, radius, kind, ctx);
    }));
    this.unsub.push(events.on('enemy:killed', ({ id }) => {
      const ctx = getCtx();
      const victim = this.enemies.find((e) => e.id === id);
      if (!victim) return;
      // witnesses investigate
      for (const e of this.enemies) {
        if (e === victim || !e.alive) continue;
        const d = e.pos.distanceTo(victim.pos);
        if (d < 18 && ctx.col.hasLineOfSight(e.eye(), victim.eye())) {
          e.hearNoise(victim.pos, 40, 'radio-alert', ctx);
        }
      }
    }));
  }

  step(dt: number, ctx: AIContext): void {
    ctx.frozen = this.frozen;
    for (const e of this.enemies) e.step(dt, ctx);
  }

  hitVolumes(): HitVolume[] {
    const out: HitVolume[] = [];
    for (const e of this.enemies) out.push(...e.hitVolumes());
    return out;
  }

  byId(id: string): Enemy | undefined {
    return this.enemies.find((e) => e.id === id);
  }

  aliveCount(): number {
    return this.enemies.filter((e) => e.alive).length;
  }

  reset(): void {
    for (const e of this.enemies) e.reset();
  }

  dispose(): void {
    for (const u of this.unsub) u();
    this.unsub = [];
  }
}
