/**
 * Interactive doors, shutters and breakable glass. Owner: Fable 2 (visuals) + Opus 2 (interaction).
 *
 * A door owns three synchronised representations: the animated mesh, the collision brush that
 * blocks bodies and bullets, and the navigation link the AI reads. They are updated from one
 * place so the rendered state, the text state and the AI's belief can never disagree.
 */
import * as THREE from 'three';
import type { CollisionWorld, Brush } from './Collision';
import type { EventBus } from '../core/EventBus';
import type { PortalDef } from './MapLayout';
import { garageShutter } from './ArchKit';

export type DoorMotion = 'closed' | 'opening' | 'open' | 'closing';

export class Door {
  readonly id: string;
  readonly kind: PortalDef['kind'];
  readonly label: string;
  readonly position = new THREE.Vector3();
  readonly group = new THREE.Group();

  /** 0 closed .. 1 fully open. */
  openAmount = 0;
  motion: DoorMotion = 'closed';
  locked: boolean;
  /** Doors that never move (glass storefront panels used as scenery). */
  readonly interactive: boolean;
  /** Door opens automatically when an actor is close (vestibule sliding pairs). */
  readonly auto: boolean;
  readonly cardReader: boolean;
  /** Time to travel from closed to open, seconds. */
  readonly travelTime: number;

  private leaves: { pivot: THREE.Object3D; sign: number; closedYaw: number; openYaw: number }[] = [];
  private brushes: Brush[] = [];
  private initialLocked: boolean;
  private closeTimer = 0;
  /** Fire doors and the vestibule pair swing shut on their own. */
  readonly selfClosing: boolean;
  damaged = 0;

  constructor(opts: {
    id: string;
    kind: PortalDef['kind'];
    label: string;
    locked: boolean;
    cardReader: boolean;
    interactive: boolean;
    auto: boolean;
    selfClosing: boolean;
    travelTime: number;
  }) {
    this.id = opts.id;
    this.kind = opts.kind;
    this.label = opts.label;
    this.locked = opts.locked;
    this.initialLocked = opts.locked;
    this.cardReader = opts.cardReader;
    this.interactive = opts.interactive;
    this.auto = opts.auto;
    this.selfClosing = opts.selfClosing;
    this.travelTime = opts.travelTime;
    this.group.name = `door:${opts.id}`;
  }

  addLeaf(pivot: THREE.Object3D, closedYaw: number, openYaw: number): void {
    pivot.rotation.y = closedYaw;
    this.leaves.push({ pivot, sign: Math.sign(openYaw - closedYaw) || 1, closedYaw, openYaw });
  }

  addBrush(b: Brush): void {
    this.brushes.push(b);
  }

  get isOpen(): boolean {
    return this.openAmount > 0.55;
  }

  get isMoving(): boolean {
    return this.motion === 'opening' || this.motion === 'closing';
  }

  toggle(bus?: EventBus): boolean {
    if (!this.interactive) return false;
    if (this.locked) {
      bus?.emit('door:state', { id: this.id, open: false, locked: true });
      return false;
    }
    if (this.motion === 'open' || this.motion === 'opening') this.close();
    else this.open();
    bus?.emit('door:state', { id: this.id, open: this.motion !== 'closing', locked: false });
    return true;
  }

  open(): void {
    if (this.locked || !this.interactive) return;
    if (this.motion !== 'open') this.motion = 'opening';
    this.closeTimer = this.selfClosing ? 4.5 : 0;
  }

  close(): void {
    if (!this.interactive) return;
    if (this.motion !== 'closed') this.motion = 'closing';
  }

  /** Force a state instantly, used by mission reset. */
  reset(): void {
    this.openAmount = 0;
    this.motion = 'closed';
    this.locked = this.initialLocked;
    this.damaged = 0;
    this.closeTimer = 0;
    this.applyTransform();
    this.syncCollision();
  }

  update(dt: number): void {
    if (this.motion === 'opening') {
      this.openAmount = Math.min(1, this.openAmount + dt / this.travelTime);
      if (this.openAmount >= 1) this.motion = 'open';
    } else if (this.motion === 'closing') {
      this.openAmount = Math.max(0, this.openAmount - dt / (this.travelTime * 1.25));
      if (this.openAmount <= 0) this.motion = 'closed';
    } else if (this.motion === 'open' && this.selfClosing) {
      this.closeTimer -= dt;
      if (this.closeTimer <= 0) this.close();
    }
    this.applyTransform();
    this.syncCollision();
  }

  private applyTransform(): void {
    // Ease-out so the leaf settles instead of snapping.
    const t = this.openAmount;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    for (const l of this.leaves) {
      l.pivot.rotation.y = l.closedYaw + (l.openYaw - l.closedYaw) * eased;
    }
  }

  private syncCollision(): void {
    const blocking = this.openAmount < 0.35;
    for (const b of this.brushes) b.active = blocking;
  }

  /** Serialised state for render_game_to_text(). */
  describe(): { id: string; label: string; open: boolean; locked: boolean; motion: DoorMotion; amount: number } {
    return {
      id: this.id,
      label: this.label,
      open: this.isOpen,
      locked: this.locked,
      motion: this.motion,
      amount: Math.round(this.openAmount * 100) / 100,
    };
  }
}

/** Roller shutter with a rebuildable curtain. */
export class Shutter {
  readonly id: string;
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
  openAmount = 0;
  target = 0;
  private width: number;
  private height: number;
  private curtain: THREE.Group | null = null;
  private brushes: Brush[] = [];
  private lastBuilt = -1;
  readonly speed = 0.28;

  constructor(id: string, width: number, height: number) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.group.name = `shutter:${id}`;
    this.rebuild();
  }

  addBrush(b: Brush): void {
    this.brushes.push(b);
  }

  private rebuild(): void {
    const quantised = Math.round(this.openAmount * 24) / 24;
    if (quantised === this.lastBuilt) return;
    this.lastBuilt = quantised;
    if (this.curtain) {
      this.group.remove(this.curtain);
      this.curtain.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
    }
    this.curtain = garageShutter(this.width, this.height, quantised);
    this.group.add(this.curtain);
  }

  setTarget(v: number): void {
    this.target = Math.max(0, Math.min(1, v));
  }

  reset(): void {
    this.openAmount = 0;
    this.target = 0;
    this.rebuild();
    for (const b of this.brushes) b.active = true;
  }

  update(dt: number): void {
    if (Math.abs(this.target - this.openAmount) > 1e-3) {
      const dir = Math.sign(this.target - this.openAmount);
      this.openAmount = Math.max(0, Math.min(1, this.openAmount + dir * this.speed * dt));
      this.rebuild();
      const blocking = this.openAmount < 0.4;
      for (const b of this.brushes) b.active = blocking;
    }
  }
}

/** Registry so systems can look doors up by id or by proximity. */
export class DoorSystem {
  readonly doors = new Map<string, Door>();
  readonly shutters = new Map<string, Shutter>();
  private world: CollisionWorld;

  constructor(world: CollisionWorld) {
    this.world = world;
  }

  add(d: Door): void {
    this.doors.set(d.id, d);
  }

  addShutter(s: Shutter): void {
    this.shutters.set(s.id, s);
  }

  get(id: string): Door | undefined {
    return this.doors.get(id);
  }

  update(dt: number): void {
    for (const d of this.doors.values()) d.update(dt);
    for (const s of this.shutters.values()) s.update(dt);
  }

  resetAll(): void {
    for (const d of this.doors.values()) d.reset();
    for (const s of this.shutters.values()) s.reset();
  }

  /** Nearest interactive door within `radius` of a point, in front of `forward` if given. */
  nearest(p: THREE.Vector3, radius: number, forward?: THREE.Vector3): Door | null {
    let best: Door | null = null;
    let bestScore = Infinity;
    for (const d of this.doors.values()) {
      if (!d.interactive) continue;
      const dist = d.position.distanceTo(p);
      if (dist > radius) continue;
      let score = dist;
      if (forward) {
        const to = d.position.clone().sub(p).normalize();
        const dot = to.dot(forward);
        if (dot < 0.2) continue;
        score = dist * (1.6 - dot);
      }
      if (score < bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  /** Doors within a radius, for the text state dump. */
  near(p: THREE.Vector3, radius: number): Door[] {
    const out: Door[] = [];
    for (const d of this.doors.values()) {
      if (d.position.distanceTo(p) <= radius) out.push(d);
    }
    out.sort((a, b) => a.position.distanceTo(p) - b.position.distanceTo(p));
    return out;
  }

  /** Auto doors driven by nearby actors (the vestibule pair). */
  updateAuto(actorPositions: THREE.Vector3[]): void {
    for (const d of this.doors.values()) {
      if (!d.auto) continue;
      let near = false;
      for (const p of actorPositions) {
        if (p.distanceTo(d.position) < 2.2) {
          near = true;
          break;
        }
      }
      if (near && !d.locked && d.motion !== 'open' && d.motion !== 'opening') d.open();
      else if (!near && (d.motion === 'open' || d.motion === 'opening')) d.close();
    }
  }

  getWorld(): CollisionWorld {
    return this.world;
  }
}
