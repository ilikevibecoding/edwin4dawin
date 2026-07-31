/**
 * The frame snapshot.
 *
 * Widgets never reach into gameplay systems. Once per frame this samples
 * everything the HUD can display into one flat object, and the widgets diff
 * against their own last-written values. That keeps the number of cross-system
 * reads fixed no matter how many widgets are on screen, and it means a widget
 * cannot accidentally hold a reference to a pooled event payload.
 */
import * as THREE from 'three';
import { GAMEPLAY } from '../core/Config';
import type {
  AISystem,
  KillstreakId,
  KillstreakDefinition,
  KillstreakSystem,
  PlayerSystem,
  Stance,
  WeaponSystem,
} from '../core/Contracts';
import type { EngineContext } from '../core/System';
import { clamp, saturate } from '../core/MathUtils';

export type ScopeKind = 'none' | 'holo' | 'acog' | 'sniper' | 'thermal';

/** Weapon-system members past the contract, resolved defensively. */
interface WeaponExtras extends WeaponSystem {
  /** Live fire mode, which the player may have toggled away from the default. */
  readonly fireMode?: string;
  grenadeCount?(kind: 'frag' | 'flash' | 'smoke'): number;
  readonly selectedGrenade?: 'frag' | 'flash' | 'smoke';
  readonly grenadeCook?: number;
}

/**
 * The killstreak system as the HUD consumes it. Every name and cost rendered
 * comes from the system's own `definitions` table, so this module never keeps a
 * second copy of the ladder that could drift out of step.
 */
export type KillstreakExtras = KillstreakSystem;

/** The fields the HUD cannot render a streak without. */
export type StreakSource = Pick<KillstreakDefinition, 'id' | 'name' | 'cost'> &
  Partial<KillstreakDefinition>;

/** A hostile painted by a UAV sweep. */
export interface UavBlip {
  x: number;
  z: number;
  /** 1 at the moment of paint, falling to 0 as the contact goes stale. */
  strength: number;
}

/** An emit older than this means the drone has gone off station. */
const UAV_STALE = 0.4;

/**
 * Hostiles revealed by an orbiting UAV.
 *
 * The killstreak module publishes these every frame it is on station, on a
 * pooled payload: one object reused for every emit, an array that is longer
 * than the live count, and entries rewritten in place. So everything is copied
 * out synchronously here, into slots that are themselves reused — which is also
 * what lets the minimap redraw on its own clock rather than on the emit.
 */
export class UavSweep {
  /** Reused; only the first `count` entries are live. */
  readonly blips: UavBlip[] = [];
  count = 0;
  /** Bearing of the sweep arm, in radians. */
  sweep = 0;

  private stamp = -1;

  accept(contacts: ArrayLike<UavBlip> | undefined, count: number, sweep: number, now: number): void {
    const available = contacts ? contacts.length : 0;
    const live = Math.max(0, Math.min(count, available));
    for (let i = 0; i < live; i++) {
      const from = (contacts as ArrayLike<UavBlip>)[i];
      const to = this.blips[i] ?? (this.blips[i] = { x: 0, z: 0, strength: 1 });
      to.x = from.x;
      to.z = from.z;
      to.strength = from.strength;
    }
    this.count = live;
    this.sweep = sweep;
    this.stamp = now;
  }

  /**
   * True while the drone is still publishing. Derived from the emit rather than
   * from the contact count, so an empty sweep still reads as a live UAV.
   */
  active(now: number): boolean {
    return this.stamp >= 0 && now - this.stamp < UAV_STALE;
  }

  clear(): void {
    this.count = 0;
    this.stamp = -1;
  }
}

export interface Contact {
  x: number;
  z: number;
  /** Unscaled time at which the blip should disappear. */
  until: number;
}

const MAX_CONTACTS = 24;

/** Enemy positions revealed by taking fire, independently of a UAV. */
export class ContactTracker {
  readonly list: Contact[] = [];

  add(x: number, z: number, now: number, life = 4): void {
    for (const contact of this.list) {
      // One blip per rough location, refreshed rather than stacked.
      if (Math.abs(contact.x - x) < 2.5 && Math.abs(contact.z - z) < 2.5) {
        contact.x = x;
        contact.z = z;
        contact.until = now + life;
        return;
      }
    }
    if (this.list.length >= MAX_CONTACTS) this.list.shift();
    this.list.push({ x, z, until: now + life });
  }

  prune(now: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].until <= now) this.list.splice(i, 1);
    }
  }

  clear(): void {
    this.list.length = 0;
  }
}

export interface FrameState {
  time: number;
  dt: number;
  menuOpen: boolean;

  alive: boolean;
  health: number;
  maxHealth: number;
  healthFraction: number;
  regenerating: boolean;
  stance: Stance;
  sprinting: boolean;
  tacticalSprint: boolean;
  yaw: number;
  readonly eye: THREE.Vector3;

  weaponName: string;
  weaponId: string;
  weaponClass: string;
  fireMode: string;
  caliber: string;
  magSize: number;
  ammoInMag: number;
  reserve: number;
  reloading: boolean;
  aiming: boolean;
  adsAmount: number;
  spread: number;
  scope: ScopeKind;
  scopeAmount: number;
  scopeZoom: number;
  grenades: number;
  grenadeCook: number;

  score: number;
  kills: number;
  deaths: number;
  streak: number;
  available: readonly KillstreakId[];

  aliveEnemies: number;
  /** The killstreak module's tablet owns the screen; the HUD stands down. */
  targeting: boolean;

  /** 0..1 transient feedback levels, decayed here rather than in the widgets. */
  damageFlash: number;
  suppression: number;

  fps: number;
}

export function createFrameState(): FrameState {
  return {
    time: 0,
    dt: 0,
    menuOpen: false,
    alive: true,
    health: GAMEPLAY.player.maxHealth,
    maxHealth: GAMEPLAY.player.maxHealth,
    healthFraction: 1,
    regenerating: false,
    stance: 'stand',
    sprinting: false,
    tacticalSprint: false,
    yaw: 0,
    eye: new THREE.Vector3(),
    weaponName: '',
    weaponId: '',
    weaponClass: 'ar',
    fireMode: 'auto',
    caliber: '',
    magSize: 0,
    ammoInMag: 0,
    reserve: 0,
    reloading: false,
    aiming: false,
    adsAmount: 0,
    spread: 0.02,
    scope: 'none',
    scopeAmount: 0,
    scopeZoom: 1,
    grenades: 0,
    grenadeCook: 0,
    score: 0,
    kills: 0,
    deaths: 0,
    streak: 0,
    available: [],
    aliveEnemies: 0,
    targeting: false,
    damageFlash: 0,
    suppression: 0,
    fps: 60,
  };
}

/** Cached system handles; `tryGet` is cheap but this keeps the frame path flat. */
export class Sampler {
  private player: PlayerSystem | undefined;
  private weapons: WeaponExtras | undefined;
  private ai: AISystem | undefined;
  private killstreaks: KillstreakExtras | undefined;

  /** Seconds since the player last took damage, for the regeneration readout. */
  sinceDamage = Number.POSITIVE_INFINITY;

  resolve(ctx: EngineContext): void {
    this.player ??= ctx.tryGet<PlayerSystem>('player');
    this.weapons ??= ctx.tryGet<WeaponExtras>('weapons');
    this.ai ??= ctx.tryGet<AISystem>('ai');
    this.killstreaks ??= ctx.tryGet<KillstreakExtras>('killstreaks');
  }

  get killstreakSystem(): KillstreakExtras | undefined {
    return this.killstreaks;
  }

  sample(state: FrameState, ctx: EngineContext, dt: number): void {
    this.resolve(ctx);
    const time = ctx.time.elapsedUnscaled;
    state.time = time;
    state.dt = dt;

    const player = this.player;
    if (player) {
      const entity = player.entity;
      state.health = Math.max(0, entity.health);
      state.maxHealth = Math.max(1, entity.maxHealth);
      state.healthFraction = saturate(state.health / state.maxHealth);
      state.alive = entity.isAlive;
      state.stance = player.stance;
      state.sprinting = player.isSprinting;
      state.tacticalSprint = player.isTacticalSprinting;
      state.yaw = player.yaw;
      player.getEyePosition(state.eye);
    }
    this.sinceDamage += dt;
    state.regenerating =
      state.alive &&
      state.health < state.maxHealth &&
      this.sinceDamage > GAMEPLAY.player.regenDelay;

    const weapons = this.weapons;
    const def = weapons?.current ?? null;
    if (def) {
      state.weaponName = def.displayName;
      state.weaponId = def.id;
      state.weaponClass = def.class;
      state.caliber = def.caliber;
      state.magSize = def.magSize;
      state.scopeZoom = def.adsZoom;
      state.fireMode = weapons?.fireMode ?? def.fireMode;
    }
    if (weapons) {
      state.ammoInMag = weapons.ammoInMag;
      state.reserve = weapons.reserveAmmo;
      state.reloading = weapons.isReloading;
      state.aiming = weapons.isAiming;
      state.adsAmount = saturate(weapons.adsAmount);
      state.grenadeCook = saturate(weapons.grenadeCook ?? 0);
      const kind = weapons.selectedGrenade ?? 'frag';
      state.grenades = weapons.grenadeCount?.(kind) ?? 0;
    }

    // Enemy positions are deliberately not sampled: what the player is entitled
    // to see on the map is what the UAV painted, and the killstreak module
    // publishes exactly that.
    if (this.ai) state.aliveEnemies = this.ai.aliveCount;

    const streaks = this.killstreaks;
    if (streaks) {
      state.streak = streaks.streak;
      state.available = streaks.available;
      state.targeting = streaks.isTargeting;
    }
    state.fps = ctx.time.fps;

    // Transients decay on the unscaled clock so they keep running when a
    // killstreak sequence slows time down.
    state.damageFlash = Math.max(0, state.damageFlash - dt * 1.15);
    state.suppression = Math.max(0, state.suppression - dt * 1.35);
  }

  noteDamage(state: FrameState, amount: number): void {
    this.sinceDamage = 0;
    state.damageFlash = clamp(state.damageFlash + amount / 42, 0, 1);
  }

  reset(): void {
    this.sinceDamage = Number.POSITIVE_INFINITY;
  }
}
