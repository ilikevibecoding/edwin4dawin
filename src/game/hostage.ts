import * as THREE from 'three';
import { Humanoid } from '../assets/models/characters/humanoid';
import { buildSkin, civilianOutfits } from '../assets/models/characters/skins';
import type { CollisionWorld } from '../world/collision';
import type { NavGrid } from './nav';
import type { Player } from './player';
import type { HostageStateName } from './types';
import type { Door } from '../world/doors';
import { events } from '../core/events';
import type { Interactable } from './interact';
import type { HitVolume } from './combat';

const RADIUS = 0.3;
const HEIGHT = 1.66;

export interface HostageContext {
  player: Player;
  col: CollisionWorld;
  nav: NavGrid;
  doors: Door[];
  time: number;
}

export class Hostage {
  readonly id: string;
  readonly name: string;
  pos = new THREE.Vector3();
  yaw = 0;
  state: HostageStateName = 'captive';
  readonly humanoid: Humanoid;
  readonly group: THREE.Group;
  private vy = 0;
  private path: THREE.Vector3[] | null = null;
  private pathIdx = 0;
  private repathT = 0;
  private scaredT = 0;
  private spawnPos: THREE.Vector3;
  private spawnYaw: number;
  private stuckT = 0;
  private lastPosCheck = new THREE.Vector3();
  private posCheckT = 0;
  /** target point override (extraction gather point) */
  gatherPoint: THREE.Vector3 | null = null;

  constructor(id: string, name: string, variant: number, pos: [number, number, number], yaw: number) {
    this.id = id;
    this.name = name;
    const outfit = civilianOutfits()[variant % 2];
    this.humanoid = new Humanoid(buildSkin(outfit, variant, false));
    this.group = this.humanoid.root;
    this.pos.set(pos[0], pos[1], pos[2]);
    this.spawnPos = this.pos.clone();
    this.spawnYaw = yaw;
    this.yaw = yaw;
    this.group.position.copy(this.pos);
    this.group.rotation.y = yaw + Math.PI;
    this.humanoid.setAnim('kneel');
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  get secured(): boolean {
    return this.state === 'following' || this.state === 'waiting' || this.state === 'extracted';
  }

  interactable(): Interactable {
    return {
      id: `hostage:${this.id}`,
      getPos: () => this.pos.clone().add(new THREE.Vector3(0, 1.1, 0)),
      radius: 0.6,
      prompt: () => {
        if (this.state === 'captive') return `Free ${this.name}`;
        if (this.state === 'following') return `${this.name}: hold position`;
        if (this.state === 'waiting') return `${this.name}: follow me`;
        return '';
      },
      enabled: () => this.alive && this.state !== 'extracted',
      interact: () => {
        if (this.state === 'captive') {
          this.setState('following');
          events.emit('announce', { text: `${this.name} freed — escort to the extraction garage`, kind: 'objective' });
        } else if (this.state === 'following') {
          this.setState('waiting');
          events.emit('announce', { text: `${this.name} holding position`, kind: 'info' });
        } else if (this.state === 'waiting') {
          this.setState('following');
          events.emit('announce', { text: `${this.name} following`, kind: 'info' });
        }
      },
    };
  }

  setState(s: HostageStateName): void {
    if (this.state === s) return;
    this.state = s;
    this.path = null;
    events.emit('hostage:state', { id: this.id, state: s });
  }

  damage(amount: number): void {
    if (!this.alive) return;
    this.setState('dead');
    this.humanoid.die(new THREE.Vector3(0, 0, 1), 1);
  }

  scare(): void {
    this.scaredT = 1.6;
  }

  step(dt: number, ctx: HostageContext): void {
    if (this.state === 'dead') {
      this.humanoid.update(dt, 0);
      return;
    }
    if (this.scaredT > 0) this.scaredT -= dt;

    switch (this.state) {
      case 'captive': {
        this.humanoid.setAnim('kneel');
        this.humanoid.update(dt, 0);
        break;
      }
      case 'waiting': {
        this.humanoid.setAnim(this.scaredT > 0 ? 'fear' : 'crouch-idle');
        this.humanoid.update(dt, 0);
        break;
      }
      case 'extracted': {
        this.humanoid.setAnim('crouch-idle');
        this.humanoid.update(dt, 0);
        break;
      }
      case 'following': {
        const target = this.gatherPoint ?? ctx.player.pos;
        const d = Math.hypot(target.x - this.pos.x, target.z - this.pos.z);
        const wantMove = this.gatherPoint ? d > 0.8 : d > 2.0;
        if (this.scaredT > 0.9) {
          this.humanoid.setAnim('fear');
          this.humanoid.update(dt, 0);
          break;
        }
        if (wantMove) {
          this.moveTo(dt, ctx, target, d > 6 ? 3.3 : 2.2);
        } else {
          this.humanoid.setAnim(ctx.player.crouchT > 0.5 ? 'crouch-idle' : 'idle');
          this.facePoint(ctx.player.pos, dt, 4);
          this.humanoid.update(dt, 0);
        }
        break;
      }
    }
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw + Math.PI;
  }

  private moveTo(dt: number, ctx: HostageContext, target: THREE.Vector3, speed: number): void {
    this.repathT -= dt;
    const dest = this.path && this.path.length > 0 ? this.path[this.path.length - 1] : null;
    if (!this.path || this.pathIdx >= this.path.length || this.repathT <= 0 || (dest && dest.distanceTo(target) > 1.6)) {
      this.path = ctx.nav.findPath(this.pos, target);
      this.pathIdx = 0;
      this.repathT = 0.7;
      if (!this.path) {
        const n = ctx.nav.nearest(this.pos, 4);
        if (n) {
          const w = ctx.nav.worldOf(n);
          this.pos.set(w.x, w.y, w.z);
        }
        return;
      }
    }
    const wp = this.path[this.pathIdx];
    const dx = wp.x - this.pos.x;
    const dz = wp.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.32) {
      this.pathIdx++;
      return;
    }
    // open doors ahead (civilians can push doors open)
    for (const door of ctx.doors) {
      if (door.isFullyClosed || door.state === 'closing') {
        const d2 = (door.center.x - this.pos.x) ** 2 + (door.center.z - this.pos.z) ** 2;
        if (d2 < 1.7 && Math.abs(door.center.y - (this.pos.y + 1)) < 2) door.open();
      }
    }
    const vx = (dx / d) * speed;
    const vz = (dz / d) * speed;
    this.vy -= 16 * dt;
    const res = ctx.col.capsuleMove(this.pos, RADIUS, HEIGHT, vx * dt, this.vy * dt, vz * dt, 0.36);
    this.pos.copy(res.pos);
    if (res.onGround && this.vy < 0) this.vy = 0;
    this.faceTowards(Math.atan2(-dx, -dz), dt, 8);
    this.humanoid.setAnim('follow');
    this.humanoid.update(dt, speed);
    // stuck recovery
    this.posCheckT += dt;
    if (this.posCheckT > 1.8) {
      if (this.pos.distanceTo(this.lastPosCheck) < 0.2) {
        this.stuckT += this.posCheckT;
        this.path = null;
        if (this.stuckT > 6) {
          // teleport recovery to a nav node near the player (documented navigation recovery)
          const n = ctx.nav.nearest(ctx.player.pos, 4);
          if (n) {
            const w = ctx.nav.worldOf(n);
            this.pos.set(w.x, w.y, w.z);
          }
          this.stuckT = 0;
        }
      } else {
        this.stuckT = 0;
      }
      this.lastPosCheck.copy(this.pos);
      this.posCheckT = 0;
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

  hitVolumes(): HitVolume[] {
    if (!this.alive) return [];
    return this.humanoid.hitVolumes(`hostage:${this.id}`) as HitVolume[];
  }

  reset(): void {
    this.pos.copy(this.spawnPos);
    this.yaw = this.spawnYaw;
    this.state = 'captive';
    this.path = null;
    this.gatherPoint = null;
    this.scaredT = 0;
    this.humanoid.reset();
    this.humanoid.setAnim('kneel');
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw + Math.PI;
  }

  snapshot(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      pos: [Math.round(this.pos.x * 100) / 100, Math.round(this.pos.y * 100) / 100, Math.round(this.pos.z * 100) / 100],
      state: this.state,
    };
  }
}
