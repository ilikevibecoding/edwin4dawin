/**
 * Timed procedural sequences over the weapon rig.
 *
 * A reload is not a canned clip here, it is a list of channel tracks over named
 * rig nodes plus a list of events that fire as the playhead passes them. That
 * buys three things a baked animation would not: the whole sequence can be
 * scaled to whatever `reloadTime` the weapon's stats declare and still land its
 * beats in the right proportion, the shell-by-shell loop can be re-entered as
 * many times as there are shells to load, and every track is *additive* over
 * the sway, bob and recoil that keep running underneath it.
 *
 * Everything is built once when the weapon is built. Evaluation is a scan over
 * flat arrays with no allocation.
 */

export type Channel = 0 | 1 | 2 | 3 | 4 | 5;
export const CH = { PX: 0, PY: 1, PZ: 2, RX: 3, RY: 4, RZ: 5 } as const;

export type Ease = 'linear' | 'smooth' | 'out' | 'in' | 'snap';

export interface Track {
  /** Rig node name, or the empty string for the weapon root. */
  node: string;
  channel: Channel;
  /** Flat `[t0, v0, t1, v1, ...]`, times normalised to 0..1 of the sequence. */
  keys: number[];
  ease: Ease;
  /** Resolved once by the rig: index into its node table, or -1 for the root. */
  nodeIndex?: number;
}

export interface SeqEvent {
  /** Normalised time. */
  t: number;
  name: string;
}

export interface Sequence {
  name: string;
  /** Nominal duration in seconds; the player may scale it. */
  duration: number;
  tracks: Track[];
  events: SeqEvent[];
  /** Fraction of the sequence over which the additive pose fades in and out. */
  blend: number;
}

export function seq(
  name: string,
  duration: number,
  tracks: Track[],
  events: SeqEvent[] = [],
  blend = 0.12,
): Sequence {
  return { name, duration, tracks, events, blend };
}

export function track(node: string, channel: Channel, ease: Ease, keys: number[]): Track {
  return { node, channel, keys, ease };
}

function applyEase(t: number, ease: Ease): number {
  switch (ease) {
    case 'linear':
      return t;
    case 'out':
      return 1 - (1 - t) * (1 - t) * (1 - t);
    case 'in':
      return t * t * t;
    case 'snap':
      return t < 0.5 ? 0 : 1;
    default:
      return t * t * (3 - 2 * t);
  }
}

/** Samples one track at normalised time `t`. */
export function sampleTrack(tr: Track, t: number): number {
  const k = tr.keys;
  const n = k.length;
  if (n < 2) return 0;
  if (t <= k[0]) return k[1];
  if (t >= k[n - 2]) return k[n - 1];
  for (let i = 0; i + 3 < n; i += 2) {
    const t0 = k[i];
    const t1 = k[i + 2];
    if (t >= t0 && t <= t1) {
      const span = t1 - t0;
      const u = span > 1e-6 ? (t - t0) / span : 1;
      const e = applyEase(u, tr.ease);
      return k[i + 1] + (k[i + 3] - k[i + 1]) * e;
    }
  }
  return k[n - 1];
}

/**
 * Runs one sequence at a time and reports the events it crosses. A queued
 * sequence starts the moment the running one ends, which is what lets the
 * shotgun's load loop chain into its close-the-action beat without a frame of
 * the weapon sitting still.
 */
export class SequencePlayer {
  current: Sequence | null = null;
  /** Seconds into the sequence. */
  time = 0;
  /** Seconds the current run lasts, after scaling. */
  duration = 0;
  /** 0..1 envelope, so a sequence eases in over the layers below it. */
  weight = 0;
  /** Set by the owner; sequences that loop are restarted rather than ended. */
  loop = false;

  private pending: Sequence | null = null;
  private pendingDuration = 0;
  private pendingLoop = false;
  private eventCursor = 0;

  play(sequence: Sequence, duration = sequence.duration, loop = false): void {
    this.current = sequence;
    this.duration = Math.max(0.01, duration);
    this.time = 0;
    this.eventCursor = 0;
    this.loop = loop;
    this.pending = null;
  }

  queue(sequence: Sequence, duration = sequence.duration, loop = false): void {
    if (!this.current) {
      this.play(sequence, duration, loop);
      return;
    }
    this.pending = sequence;
    this.pendingDuration = duration;
    this.pendingLoop = loop;
  }

  stop(): void {
    this.current = null;
    this.pending = null;
    this.time = 0;
    this.weight = 0;
  }

  get playing(): boolean {
    return this.current !== null;
  }

  get progress(): number {
    return this.current ? Math.min(1, this.time / this.duration) : 0;
  }

  /**
   * Advances the playhead. `onEvent` is called for every event crossed this
   * frame, in order; it may call `play` to redirect, which ends the scan.
   */
  update(dt: number, onEvent: (name: string) => void): void {
    const s = this.current;
    if (!s) {
      this.weight = 0;
      return;
    }
    const before = this.time / this.duration;
    this.time += dt;
    const t = this.time / this.duration;

    for (let i = this.eventCursor; i < s.events.length; i++) {
      const e = s.events[i];
      if (e.t > t) break;
      if (e.t < before && i !== this.eventCursor) continue;
      this.eventCursor = i + 1;
      onEvent(e.name);
      if (this.current !== s) return;
    }

    if (t >= 1) {
      if (this.loop) {
        this.time -= this.duration;
        this.eventCursor = 0;
        this.weight = 1;
        return;
      }
      const next = this.pending;
      if (next) {
        const d = this.pendingDuration;
        const l = this.pendingLoop;
        this.pending = null;
        this.play(next, d, l);
        return;
      }
      this.current = null;
      this.weight = 0;
      this.time = 0;
      onEvent('end');
      return;
    }

    // Ease the whole additive layer in and out, so a sequence never snaps on.
    const b = Math.max(1e-3, s.blend);
    const inW = Math.min(1, t / b);
    const outW = Math.min(1, (1 - t) / b);
    const w = Math.min(inW, outW);
    this.weight = w * w * (3 - 2 * w);
  }
}
