/** Minimal typed event bus — no dependencies, no string typos. */
export class Signal<T = void> {
  private handlers: Array<(payload: T) => void> = [];

  add(handler: (payload: T) => void): () => void {
    this.handlers.push(handler);
    return () => this.remove(handler);
  }

  remove(handler: (payload: T) => void): void {
    const i = this.handlers.indexOf(handler);
    if (i >= 0) this.handlers.splice(i, 1);
  }

  emit(payload: T): void {
    // Iterate a copy so handlers may unsubscribe during dispatch.
    for (const h of this.handlers.slice()) h(payload);
  }

  clear(): void {
    this.handlers.length = 0;
  }

  get size(): number {
    return this.handlers.length;
  }
}
