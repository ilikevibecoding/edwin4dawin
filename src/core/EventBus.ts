/**
 * Typed pub/sub used to decouple ownership areas. Owner: Opus 1.
 */
import type * as THREE from 'three';
import type {
  DifficultyId,
  EnemyAlertState,
  GameMode,
  HostageId,
  ObjectiveId,
  ObjectiveStatus,
  SurfaceKind,
  WeaponId,
} from './Types';

export interface GameEvents {
  'mode:changed': { from: GameMode; to: GameMode };
  'mission:start': { difficulty: DifficultyId; loadout: WeaponId[] };
  'mission:restart': Record<string, never>;
  'mission:victory': { timeSeconds: number; hostagesSaved: number };
  'mission:defeat': { reason: string };

  'objective:changed': { id: ObjectiveId; status: ObjectiveStatus };
  'announce': { text: string; tone: 'info' | 'objective' | 'warning' | 'success' | 'failure' };

  'weapon:fired': { weapon: WeaponId; ammoInMag: number };
  'weapon:dryfire': { weapon: WeaponId };
  'weapon:reload:start': { weapon: WeaponId; empty: boolean };
  'weapon:reload:end': { weapon: WeaponId; ammoInMag: number };
  'weapon:switch': { from: WeaponId | null; to: WeaponId };

  'impact': { point: THREE.Vector3; normal: THREE.Vector3; surface: SurfaceKind; energy: number };
  'glass:broken': { id: string; point: THREE.Vector3 };
  'door:state': { id: string; open: boolean; locked: boolean };

  'player:damaged': { amount: number; fromDirection: THREE.Vector3; health: number; armor: number };
  'player:died': { cause: string };
  'player:footstep': { surface: SurfaceKind; crouched: boolean; position: THREE.Vector3 };

  'enemy:alert': { id: string; state: EnemyAlertState };
  'enemy:fired': { id: string; position: THREE.Vector3 };
  'enemy:killed': { id: string; headshot: boolean; position: THREE.Vector3 };

  'hostage:secured': { id: HostageId };
  'hostage:extracted': { id: HostageId };
  'hostage:down': { id: HostageId };
  'hostage:order': { id: HostageId; behaviour: 'follow' | 'hold' };

  /** World-space noise the AI can hear. loudness is in metres of audible radius. */
  'noise': { position: THREE.Vector3; loudness: number; source: 'gunshot' | 'footstep' | 'door' | 'glass' | 'impact' };

  'settings:changed': Record<string, never>;
  'quality:changed': Record<string, never>;
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

export class EventBus {
  private readonly map = new Map<string, Set<(p: unknown) => void>>();

  on<K extends keyof GameEvents>(key: K, fn: Handler<K>): () => void {
    let set = this.map.get(key as string);
    if (!set) {
      set = new Set();
      this.map.set(key as string, set);
    }
    set.add(fn as (p: unknown) => void);
    return () => set!.delete(fn as (p: unknown) => void);
  }

  emit<K extends keyof GameEvents>(key: K, payload: GameEvents[K]): void {
    const set = this.map.get(key as string);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as Handler<K>)(payload);
      } catch (err) {
        // A listener must never break the simulation step.
        console.warn(`[EventBus] handler for "${String(key)}" threw`, err);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}
