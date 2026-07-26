/** Minimal typed event bus for cross-system communication. */
export type GameEventMap = {
  'weapon:fired': { weaponId: string; pos: [number, number, number]; loudness: number };
  'weapon:reload': { weaponId: string; stage: string };
  'weapon:switched': { weaponId: string };
  'impact': { surface: string; pos: [number, number, number]; normal: [number, number, number] };
  'enemy:alerted': { id: string };
  'enemy:killed': { id: string; byPlayer: boolean };
  'player:damaged': { amount: number; dirYaw: number };
  'player:died': Record<string, never>;
  'door:state': { id: string; state: string };
  'glass:broken': { id: string };
  'hostage:state': { id: string; state: string };
  'objective:update': { id: string; state: string; text: string };
  'mission:state': { state: string };
  'announce': { text: string; kind: 'info' | 'objective' | 'danger' | 'success' };
  'noise': { pos: [number, number, number]; radius: number; kind: string };
  'ui:hitmarker': { kill: boolean };
  'settings:changed': { key: string };
};

type Handler<T> = (payload: T) => void;

class EventBus {
  private handlers = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof GameEventMap>(event: K, fn: Handler<GameEventMap[K]>): () => void {
    let set = this.handlers.get(event as string);
    if (!set) {
      set = new Set();
      this.handlers.set(event as string, set);
    }
    set.add(fn as Handler<unknown>);
    return () => set!.delete(fn as Handler<unknown>);
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.handlers.get(event as string);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const events = new EventBus();
