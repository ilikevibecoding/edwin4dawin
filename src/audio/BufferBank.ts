/**
 * The buffer bank: turns `SoundSpec` recipes into `AudioBuffer`s.
 *
 * Synthesis is not free — the whole library is roughly a hundred megaflops of
 * filtering — so it is done lazily with a warm-up pass. The hot set (gunfire,
 * impacts, footsteps, the interface) is rendered during `init`, the rest is
 * rendered a few sounds at a time from `update` inside a millisecond budget, and
 * anything asked for before its turn is rendered on the spot. The failure mode
 * is a sub-millisecond hitch on a sound the game has never played before, once.
 *
 * Each spec renders `variants` independent takes from a seeded RNG. Variants
 * plus per-playback detune is what stops a magazine of automatic fire from
 * sounding like one sample retriggered thirty times.
 */
import { Rng } from '../core/MathUtils';
import type { SoundLibrary, SoundSpec } from './sounds';

export interface BankEntry {
  spec: SoundSpec;
  buffers: AudioBuffer[];
  /** Round-robin cursor, offset randomly so repeats do not sync up. */
  cursor: number;
}

export interface BankStats {
  ids: number;
  buffers: number;
  frames: number;
  bytes: number;
  renderMs: number;
  pendingIds: number;
  onDemandRenders: number;
}

/** Sounds that must exist before the first trigger pull. */
const HOT_PREFIXES: readonly string[] = [
  'gun_',
  'impact_',
  'footstep_',
  'weapon_',
  'ui_hitmarker',
  'bullet_',
  'shell_',
  'player_hurt',
  'gear_rustle',
  'land_',
];

export class BufferBank {
  private readonly entries = new Map<string, BankEntry>();
  private readonly pending: string[] = [];
  private pendingIndex = 0;
  private renderMs = 0;
  private onDemandRenders = 0;
  private totalFrames = 0;
  private totalBuffers = 0;

  constructor(
    private readonly context: BaseAudioContext,
    private readonly library: SoundLibrary,
    private readonly seed = 0x0b1ac0,
  ) {
    const ids = library.ids();
    // Hot first, so a partially-warm bank is still a playable game.
    const hot: string[] = [];
    const cold: string[] = [];
    for (const id of ids) {
      (HOT_PREFIXES.some((p) => id.startsWith(p)) ? hot : cold).push(id);
    }
    this.pending = [...hot, ...cold];
  }

  get warmCount(): number {
    return this.entries.size;
  }

  get pendingCount(): number {
    return Math.max(0, this.pending.length - this.pendingIndex);
  }

  /**
   * Fetch a variant, rendering it if the warm-up has not reached it yet.
   * `variant` of -1 advances the round-robin cursor.
   */
  get(id: string, variant = -1): { spec: SoundSpec; buffer: AudioBuffer } | null {
    let entry = this.entries.get(id);
    if (!entry) {
      const spec = this.library.get(id);
      if (!spec) return null;
      entry = this.render(spec);
      this.onDemandRenders++;
    }
    const count = entry.buffers.length;
    if (count === 0) return null;
    const index =
      variant >= 0 ? variant % count : (entry.cursor = (entry.cursor + 1) % count);
    return { spec: entry.spec, buffer: entry.buffers[index] };
  }

  /** Ensure `id` is rendered now. */
  warm(id: string): boolean {
    if (this.entries.has(id)) return true;
    const spec = this.library.get(id);
    if (!spec) return false;
    this.render(spec);
    return true;
  }

  /**
   * Render pending sounds until `budgetMs` is spent. Returns true when the whole
   * library is warm.
   */
  pump(budgetMs: number): boolean {
    if (this.pendingIndex >= this.pending.length) return true;
    const start = now();
    while (this.pendingIndex < this.pending.length) {
      const id = this.pending[this.pendingIndex++];
      if (!this.entries.has(id)) {
        const spec = this.library.get(id);
        if (spec) this.render(spec);
      }
      if (now() - start >= budgetMs) break;
    }
    return this.pendingIndex >= this.pending.length;
  }

  /** Render everything. Used by `init` for the hot set and by the test harness. */
  warmAll(filter?: (spec: SoundSpec) => boolean): void {
    for (const id of this.library.ids()) {
      if (this.entries.has(id)) continue;
      const spec = this.library.get(id);
      if (!spec) continue;
      if (filter && !filter(spec)) continue;
      this.render(spec);
    }
  }

  private render(spec: SoundSpec): BankEntry {
    const start = now();
    const buffers: AudioBuffer[] = [];
    const variants = Math.max(1, spec.variants);
    for (let v = 0; v < variants; v++) {
      // Seeded per id and variant so a build is reproducible and the offline
      // measurements match what the game actually plays.
      const rng = new Rng((hashString(spec.id) ^ (this.seed + v * 0x9e3779b9)) >>> 0);
      const rendered = spec.render({ sampleRate: this.context.sampleRate, rng, variant: v });
      const channels = rendered.channels;
      const frames = channels[0]?.length ?? 0;
      if (frames === 0) continue;
      const buffer = this.context.createBuffer(channels.length, frames, rendered.sampleRate);
      for (let c = 0; c < channels.length; c++) buffer.copyToChannel(channels[c], c);
      buffers.push(buffer);
      this.totalFrames += frames * channels.length;
      this.totalBuffers++;
    }
    const entry: BankEntry = {
      spec,
      buffers,
      cursor: buffers.length > 1 ? Math.floor(Math.random() * buffers.length) : 0,
    };
    this.entries.set(spec.id, entry);
    this.renderMs += now() - start;
    return entry;
  }

  stats(): BankStats {
    return {
      ids: this.entries.size,
      buffers: this.totalBuffers,
      frames: this.totalFrames,
      bytes: this.totalFrames * 4,
      renderMs: Math.round(this.renderMs * 10) / 10,
      pendingIds: this.pendingCount,
      onDemandRenders: this.onDemandRenders,
    };
  }

  dispose(): void {
    this.entries.clear();
    this.pendingIndex = this.pending.length;
  }
}

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
