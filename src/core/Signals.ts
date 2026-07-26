/**
 * Typed, allocation-free event bus.
 *
 * Systems are deliberately decoupled: gameplay code emits, presentation code
 * (HUD, audio, VFX) listens. Nothing in `src/` should reach across subsystem
 * boundaries by direct reference when a signal will do.
 */

import type * as THREE from 'three';

export type DamageCause =
  | 'bullet'
  | 'explosion'
  | 'airstrike'
  | 'fall'
  | 'melee'
  | 'fire';

export interface HitInfo {
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  /** Surface material key, drives impact VFX + audio. */
  surface: SurfaceKind;
  /** Incoming ray direction, normalised. */
  direction: { x: number; y: number; z: number };
  /** Distance from muzzle in metres. */
  distance: number;
  /** Set when the trace landed on a damageable actor. */
  actorId?: number;
  /** Body region for damage multipliers. */
  region?: HitRegion;
}

export type HitRegion = 'head' | 'chest' | 'stomach' | 'arm' | 'leg';

export type SurfaceKind =
  | 'concrete'
  | 'metal'
  | 'sand'
  | 'dirt'
  | 'wood'
  | 'glass'
  | 'water'
  | 'flesh'
  | 'foliage'
  | 'fabric'
  | 'rubber';

export interface SignalMap {
  /** Frame-level */
  'engine:resize': { width: number; height: number; dpr: number };
  'engine:quality': { tier: string };

  /** Weapons */
  'weapon:fire': {
    weaponId: string;
    muzzleWorld: THREE.Vector3;
    direction: THREE.Vector3;
    silenced: boolean;
    ammoLeft: number;
  };
  'weapon:dryfire': { weaponId: string };
  'weapon:reloadStart': { weaponId: string; tactical: boolean; duration: number };
  'weapon:reloadEnd': { weaponId: string };
  'weapon:switch': { fromId: string | null; toId: string };
  'weapon:ads': { active: boolean; weaponId: string };
  'weapon:ammoChanged': { weaponId: string; mag: number; reserve: number };
  'weapon:casing': { position: THREE.Vector3; velocity: THREE.Vector3; caliber: string };

  /** Ballistics + damage */
  'bullet:impact': HitInfo;
  'bullet:whizby': { position: THREE.Vector3; speed: number };
  'actor:damaged': {
    actorId: number;
    amount: number;
    cause: DamageCause;
    region?: HitRegion;
    attackerId?: number;
    point?: THREE.Vector3;
    direction?: THREE.Vector3;
  };
  'actor:killed': {
    actorId: number;
    cause: DamageCause;
    attackerId?: number;
    region?: HitRegion;
    headshot: boolean;
  };
  'player:damaged': { amount: number; direction: THREE.Vector3; cause: DamageCause };
  'player:died': { cause: DamageCause };
  'player:respawn': Record<string, never>;

  /** Movement */
  'player:footstep': { surface: SurfaceKind; sprinting: boolean; position: THREE.Vector3 };
  'player:land': { impactSpeed: number; surface: SurfaceKind };
  'player:jump': Record<string, never>;
  'player:slideStart': { surface: SurfaceKind };
  'player:slideEnd': Record<string, never>;
  'player:mantle': { height: number };
  'player:stanceChanged': { stance: 'stand' | 'crouch' | 'prone' };

  /** Explosions and area effects */
  'explosion:spawn': {
    position: THREE.Vector3;
    radius: number;
    damage: number;
    cause: DamageCause;
    /** Visual scale multiplier, 1 = frag grenade. */
    scale: number;
  };

  /** Killstreaks */
  'killstreak:earned': { id: string; name: string };
  'killstreak:armed': { id: string };
  'killstreak:called': { id: string; target: THREE.Vector3; heading: number };
  'killstreak:cancelled': { id: string };
  'airstrike:inbound': { seconds: number; target: THREE.Vector3; heading: number };
  'airstrike:flyby': { position: THREE.Vector3; velocity: THREE.Vector3 };

  /** Feedback / UI */
  'ui:hitmarker': { lethal: boolean; headshot: boolean; armor: boolean };
  'ui:killfeed': { attacker: string; victim: string; weaponId: string; headshot: boolean };
  'ui:notify': { title: string; subtitle?: string; tone: 'good' | 'bad' | 'neutral' };
  'ui:objective': { text: string };
  'camera:shake': { amplitude: number; duration: number; frequency?: number };
  'camera:kick': { pitch: number; yaw: number; roll?: number };

  /** Audio */
  'audio:oneshot': { id: string; position?: THREE.Vector3; volume?: number; pitch?: number };
  'audio:music': { cue: 'calm' | 'combat' | 'danger' | 'victory' | 'defeat' };

  /** Game flow */
  'game:started': Record<string, never>;
  'game:paused': { paused: boolean };
  'game:over': { win: boolean };
  'game:scoreChanged': { score: number; streak: number };
}

export type SignalName = keyof SignalMap;
type Handler<K extends SignalName> = (payload: SignalMap[K]) => void;

class SignalBus {
  private readonly map = new Map<SignalName, Set<(p: never) => void>>();

  on<K extends SignalName>(name: K, fn: Handler<K>): () => void {
    let set = this.map.get(name);
    if (!set) {
      set = new Set();
      this.map.set(name, set);
    }
    set.add(fn as (p: never) => void);
    return () => {
      set!.delete(fn as (p: never) => void);
    };
  }

  once<K extends SignalName>(name: K, fn: Handler<K>): () => void {
    const off = this.on(name, ((p: SignalMap[K]) => {
      off();
      fn(p);
    }) as Handler<K>);
    return off;
  }

  emit<K extends SignalName>(name: K, payload: SignalMap[K]): void {
    const set = this.map.get(name);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as Handler<K>)(payload);
      } catch (err) {
        console.error(`[signals] handler for "${String(name)}" threw`, err);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}

export const Signals = new SignalBus();
