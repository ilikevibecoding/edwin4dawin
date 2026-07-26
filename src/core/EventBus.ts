/**
 * Tiny synchronous pub/sub used to decouple gameplay systems.
 * Handlers added during a dispatch are not invoked until the next dispatch.
 */
export type Handler<T = unknown> = (payload: T) => void;

export class EventBus {
  private readonly map = new Map<string, Set<Handler<never>>>();

  on<T>(type: string, handler: Handler<T>): () => void {
    let set = this.map.get(type);
    if (!set) {
      set = new Set();
      this.map.set(type, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(type, handler);
  }

  once<T>(type: string, handler: Handler<T>): () => void {
    const off = this.on<T>(type, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<T>(type: string, handler: Handler<T>): void {
    this.map.get(type)?.delete(handler as Handler<never>);
  }

  emit<T>(type: string, payload?: T): void {
    const set = this.map.get(type);
    if (!set || set.size === 0) return;
    // Snapshot so handlers may safely subscribe/unsubscribe while dispatching.
    for (const handler of Array.from(set)) {
      try {
        (handler as Handler<T | undefined>)(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${type}" threw`, err);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}
