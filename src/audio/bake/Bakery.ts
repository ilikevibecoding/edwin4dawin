/**
 * The baked-asset store and its incremental scheduler.
 *
 * Sound design that never changes is rendered once into a `Clip` and played
 * back from an `AudioBuffer`; only the parts that must differ per event are
 * built live. This class holds the results, keyed by name with any number of
 * variants per name, and meters the work so that boot is not held up by it:
 * a small essential set is rendered synchronously during `init`, and everything
 * else is trickled in later against a per-frame millisecond budget.
 *
 * Nothing here touches WebAudio. A `Clip` becomes an `AudioBuffer` only when
 * something actually plays it, so a page whose audio context never unlocks
 * still pays nothing but the arithmetic.
 */

import { Clip, Rng } from '../dsp/Kernel';

export type BakeStep = (b: Bakery) => void;

interface Task {
  label: string;
  step: BakeStep;
}

export class Bakery {
  private store = new Map<string, Clip[]>();
  private tasks: Task[] = [];
  private cursor = 0;
  private rng: Rng;
  /** Milliseconds spent baking, split by phase, for the debug bridge. */
  eagerMs = 0;
  deferredMs = 0;
  /** Labels that threw, so a single bad recipe cannot take the engine down. */
  readonly failures: string[] = [];

  constructor(
    readonly sampleRate: number,
    /** 0..1 detail scalar derived from the quality preset. */
    readonly quality: number,
    seed = 0x5eed1e,
  ) {
    this.rng = new Rng(seed);
  }

  /** A fresh deterministic stream, so a recipe's output never depends on order. */
  stream(name: string): Rng {
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
      h ^= name.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return new Rng(h);
  }

  get shared(): Rng {
    return this.rng;
  }

  /** Number of variants to render for a sound with `base` at full quality. */
  variants(base: number): number {
    return Math.max(1, Math.round(base * (0.5 + 0.5 * this.quality)));
  }

  /**
   * A store rate suited to a recipe that is band-limited by construction.
   *
   * A 130 Hz rumble kept in a 44.1 kHz buffer spends an order of magnitude more
   * memory than the bandwidth it actually contains, and the long beds are the
   * bulk of the sample budget. The source node resamples on playback at no cost
   * to us, so the only thing that matters is keeping Nyquist clear of the
   * highest frequency the recipe synthesises — with margin, because a filter
   * skirt does not stop dead and the naive oscillators fold a little down.
   *
   * `topHz` is the highest frequency the recipe puts into the buffer, not the
   * corner of its last filter. The floor of 8 kHz is the lowest rate every
   * implementation is required to accept for an `AudioBuffer`.
   */
  rateFor(topHz: number): number {
    const want = topHz * 2.6;
    for (const r of [8000, 11025, 16000, 22050, 32000]) {
      if (r >= want) return Math.min(r, this.sampleRate);
    }
    return this.sampleRate;
  }

  add(name: string, c: Clip): void {
    const list = this.store.get(name);
    if (list) list.push(c);
    else this.store.set(name, [c]);
  }

  set(name: string, clips: Clip[]): void {
    this.store.set(name, clips);
  }

  has(name: string): boolean {
    return this.store.has(name);
  }

  list(name: string): Clip[] | undefined {
    return this.store.get(name);
  }

  first(name: string): Clip | null {
    const list = this.store.get(name);
    return list && list.length > 0 ? list[0] : null;
  }

  /** Picks a variant. Allocation-free: an index into an existing array. */
  variant(name: string, rng: Rng): Clip | null {
    const list = this.store.get(name);
    if (!list || list.length === 0) return null;
    return list.length === 1 ? list[0] : list[rng.int(list.length)];
  }

  /** Picks the variant at an explicit index, wrapping. For reproducible tests. */
  at(name: string, index: number): Clip | null {
    const list = this.store.get(name);
    if (!list || list.length === 0) return null;
    return list[((index % list.length) + list.length) % list.length];
  }

  names(): string[] {
    return Array.from(this.store.keys()).sort();
  }

  get clipCount(): number {
    let n = 0;
    for (const list of this.store.values()) n += list.length;
    return n;
  }

  /** Total sample memory held, in bytes, for the perf overlay. */
  get bytes(): number {
    let n = 0;
    for (const list of this.store.values()) {
      for (const c of list) n += c.length * c.channelCount * 4;
    }
    return n;
  }

  /** Sample memory for one name, so the debug bridge can rank the hogs. */
  bytesOf(name: string): number {
    const list = this.store.get(name);
    if (!list) return 0;
    let n = 0;
    for (const c of list) n += c.length * c.channelCount * 4;
    return n;
  }

  /** Runs a recipe now. Used for anything the first second of play needs. */
  run(label: string, step: BakeStep): void {
    const t0 = now();
    try {
      step(this);
    } catch (err) {
      this.failures.push(`${label}: ${(err as Error)?.message ?? err}`);
    }
    this.eagerMs += now() - t0;
  }

  /** Defers a recipe to the background trickle. */
  queue(label: string, step: BakeStep): void {
    this.tasks.push({ label, step });
  }

  get pending(): number {
    return this.tasks.length - this.cursor;
  }

  /**
   * Runs deferred recipes until the budget is spent. Always completes at least
   * one so progress cannot stall, and returns true once the queue is empty.
   */
  pump(budgetMs: number): boolean {
    if (this.cursor >= this.tasks.length) {
      if (this.tasks.length > 0) {
        this.tasks.length = 0;
        this.cursor = 0;
      }
      return true;
    }
    const t0 = now();
    do {
      const task = this.tasks[this.cursor++];
      try {
        task.step(this);
      } catch (err) {
        this.failures.push(`${task.label}: ${(err as Error)?.message ?? err}`);
      }
    } while (this.cursor < this.tasks.length && now() - t0 < budgetMs);
    this.deferredMs += now() - t0;
    return this.cursor >= this.tasks.length;
  }

  /** Forces every remaining recipe. Used by the test harness and by disposal. */
  finish(): void {
    while (!this.pump(1e9));
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
