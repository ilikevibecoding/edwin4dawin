import type * as THREE from 'three';

/**
 * Strongly-typed game event bus.
 *
 * Subsystems communicate through this rather than importing each other, which
 * keeps the module graph acyclic and lets systems be swapped or disabled.
 */
export interface GameEvents {
  'game:start': void;
  'game:pause': boolean;
  'game:over': { win: boolean; score: number };
  'game:restart': void;

  'player:spawn': { position: THREE.Vector3 };
  'player:damage': { amount: number; from: THREE.Vector3; source: string };
  'player:heal': { amount: number };
  'player:death': { killer: string };
  'player:sprint': boolean;
  'player:land': { impact: number };
  'player:footstep': { surface: string; speed: number; position: THREE.Vector3 };

  'weapon:fire': { weapon: string; muzzle: THREE.Vector3; dir: THREE.Vector3 };
  'weapon:dryfire': { weapon: string };
  'weapon:reload:start': { weapon: string; duration: number };
  'weapon:reload:end': { weapon: string };
  'weapon:switch': { from: string; to: string };
  'weapon:ads': boolean;
  'weapon:ammo': { mag: number; reserve: number };

  'hit:confirm': { headshot: boolean; lethal: boolean; position: THREE.Vector3 };
  'hit:surface': {
    point: THREE.Vector3;
    normal: THREE.Vector3;
    surface: string;
    incoming: THREE.Vector3;
    object?: THREE.Object3D;
  };

  'enemy:spawn': { id: number };
  'enemy:death': { id: number; headshot: boolean; distance: number; weapon: string };
  'enemy:alert': { id: number; position: THREE.Vector3 };

  'explosion': {
    position: THREE.Vector3;
    radius: number;
    damage: number;
    force: number;
    kind: 'grenade' | 'bomb' | 'rocket' | 'barrel';
  };

  'killstreak:earned': { id: string; name: string };
  'killstreak:armed': { id: string };
  'killstreak:cancel': { id: string };
  'airstrike:called': { position: THREE.Vector3; heading: number };
  'airstrike:inbound': { eta: number };
  'airstrike:impact': { position: THREE.Vector3 };

  'ui:notify': { text: string; sub?: string; tone?: 'good' | 'bad' | 'info' };
  'ui:killfeed': { killer: string; victim: string; weapon: string; headshot: boolean };
  'ui:objective': { text: string };

  'camera:shake': { amplitude: number; duration: number; frequency?: number };
  'camera:impulse': { pitch: number; yaw: number; roll?: number };

  'quality:changed': { preset: string };
  'debug:reload': void;
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private map = new Map<string, Set<Handler<any>>>();
  private deferred: Array<[string, any]> = [];

  on<K extends keyof GameEvents>(key: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.map.get(key as string);
    if (!set) this.map.set(key as string, (set = new Set()));
    set.add(fn);
    return () => this.off(key, fn);
  }

  once<K extends keyof GameEvents>(key: K, fn: Handler<GameEvents[K]>): () => void {
    const off = this.on(key, (p) => {
      off();
      fn(p);
    });
    return off;
  }

  off<K extends keyof GameEvents>(key: K, fn: Handler<GameEvents[K]>): void {
    this.map.get(key as string)?.delete(fn);
  }

  emit<K extends keyof GameEvents>(
    key: K,
    ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): void {
    const set = this.map.get(key as string);
    if (!set || set.size === 0) return;
    const payload = args[0];
    // Snapshot so handlers can safely unsubscribe during dispatch.
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${String(key)}" threw:`, err);
      }
    }
  }

  /** Queue an event to fire at the next flush — avoids re-entrancy hazards. */
  post<K extends keyof GameEvents>(
    key: K,
    ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): void {
    this.deferred.push([key as string, args[0]]);
  }

  flush(): void {
    if (this.deferred.length === 0) return;
    const queue = this.deferred;
    this.deferred = [];
    for (const [k, p] of queue) this.emit(k as any, p as any);
  }

  clear(): void {
    this.map.clear();
    this.deferred.length = 0;
  }
}
