import type { GameEvents, EventKey } from './Events';

type Handler<K extends EventKey> = (payload: GameEvents[K]) => void;

/**
 * Small synchronous pub/sub bus.
 *
 * Handlers are copied before dispatch so a listener may safely subscribe or
 * unsubscribe (including its own removal) while an event is being delivered.
 */
export class EventBus {
  private handlers = new Map<EventKey, Set<Handler<never>>>();
  private onceHandlers = new WeakMap<Handler<never>, Handler<never>>();

  on<K extends EventKey>(key: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(key, handler);
  }

  once<K extends EventKey>(key: K, handler: Handler<K>): () => void {
    const wrapper = ((payload: GameEvents[K]) => {
      this.off(key, wrapper as Handler<K>);
      handler(payload);
    }) as Handler<K>;
    this.onceHandlers.set(handler as Handler<never>, wrapper as Handler<never>);
    return this.on(key, wrapper);
  }

  off<K extends EventKey>(key: K, handler: Handler<K>): void {
    const set = this.handlers.get(key);
    if (!set) return;
    set.delete(handler as Handler<never>);
    const wrapper = this.onceHandlers.get(handler as Handler<never>);
    if (wrapper) {
      set.delete(wrapper);
      this.onceHandlers.delete(handler as Handler<never>);
    }
  }

  emit<K extends EventKey>(
    key: K,
    ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): void {
    const set = this.handlers.get(key);
    if (!set || set.size === 0) return;
    const payload = args[0] as GameEvents[K];
    // Snapshot so mutation during dispatch cannot invalidate the iterator.
    for (const handler of Array.from(set)) {
      try {
        (handler as Handler<K>)(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${String(key)}" threw:`, err);
      }
    }
  }

  clear(key?: EventKey): void {
    if (key) this.handlers.delete(key);
    else this.handlers.clear();
  }

  listenerCount(key: EventKey): number {
    return this.handlers.get(key)?.size ?? 0;
  }
}
