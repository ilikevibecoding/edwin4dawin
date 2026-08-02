import type { AudioEngine } from './AudioEngine';
import scriptData from './narration-script.json';
import { Signal } from '../core/Signals';

/**
 * Narration playback.
 *
 * Primary path: pre-rendered Ogg clips produced offline by
 * `tools/build-narration.mjs` (original synthesized neutral voices). If those
 * files are unavailable — a bare checkout, a blocked fetch, a codec the browser
 * refuses — playback degrades to the browser's own speech synthesis, and if
 * that is missing too the subtitles still run on the scripted durations.
 */

export interface NarrationLine {
  id: string;
  chapter: string;
  voice: string;
  time: number;
  text: string;
  file?: string;
  duration: number;
}

export type NarrationMode = 'clips' | 'speech' | 'subtitles-only';

const MANIFEST_URL = 'audio/narration/manifest.json';
const CLIP_BASE = 'audio/narration/';

/** Rough spoken duration when no measured value exists (~2.6 words/second). */
function estimateDuration(text: string): number {
  return Math.max(1.6, (text.trim().split(/\s+/).length / 2.6) * 1.06 + 0.5);
}

export class Narration {
  readonly lines: NarrationLine[];
  readonly byId = new Map<string, NarrationLine>();
  readonly onLine = new Signal<{ line: NarrationLine } | null>();
  mode: NarrationMode = 'subtitles-only';
  loadError: string | null = null;

  private engine: AudioEngine;
  private buffers = new Map<string, AudioBuffer>();
  private activeSource: AudioBufferSourceNode | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeId: string | null = null;
  private activeEndsAt = 0;
  private gain: GainNode | null = null;
  private speechVoice: SpeechSynthesisVoice | null = null;

  constructor(engine: AudioEngine) {
    this.engine = engine;
    const raw = scriptData as unknown as { lines: Array<Omit<NarrationLine, 'duration'>> };
    this.lines = raw.lines.map((l) => ({ ...l, duration: estimateDuration(l.text) }));
    for (const l of this.lines) this.byId.set(l.id, l);
  }

  /** Total narration word count — surfaced in the debug overlay and README. */
  get wordCount(): number {
    return this.lines.reduce((n, l) => n + l.text.trim().split(/\s+/).length, 0);
  }

  /**
   * Fetch the manifest and decode the clips. Reports 0..1 progress.
   * Never throws: on failure it simply selects a fallback mode.
   */
  async load(onProgress?: (t: number) => void): Promise<void> {
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      const manifest = (await res.json()) as { lines: NarrationLine[] };
      for (const m of manifest.lines) {
        const line = this.byId.get(m.id);
        if (line) {
          line.duration = m.duration;
          line.file = m.file;
          line.text = m.text;
        }
      }
      if (!this.engine.ready) {
        // No audio context yet (autoplay gate). Subtitles can still be timed
        // from the manifest; buffers are decoded after the gate opens.
        this.mode = 'subtitles-only';
        onProgress?.(1);
        return;
      }
      await this.decodeAll(onProgress);
      this.mode = this.buffers.size > 0 ? 'clips' : 'speech';
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err);
      this.mode = this.pickFallback();
      onProgress?.(1);
    }
  }

  private pickFallback(): NarrationMode {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? 'speech' : 'subtitles-only';
  }

  private async decodeAll(onProgress?: (t: number) => void): Promise<void> {
    const ctx = this.engine.ctx!;
    const withFiles = this.lines.filter((l) => l.file);
    let done = 0;
    for (const line of withFiles) {
      try {
        const res = await fetch(CLIP_BASE + line.file!, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`clip ${res.status}`);
        const bytes = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(bytes);
        this.buffers.set(line.id, buf);
        line.duration = buf.duration;
      } catch {
        /* one bad clip should not sink the whole run */
      }
      done++;
      onProgress?.(done / withFiles.length);
    }
  }

  /** Decode clips after the audio context finally exists. */
  async ensureDecoded(onProgress?: (t: number) => void): Promise<void> {
    if (!this.engine.ready || this.buffers.size > 0) return;
    if (this.lines.every((l) => !l.file)) {
      this.mode = this.pickFallback();
      return;
    }
    await this.decodeAll(onProgress);
    this.mode = this.buffers.size > 0 ? 'clips' : this.pickFallback();
  }

  private ensureGain(): GainNode | null {
    if (!this.engine.ready) return null;
    if (!this.gain) {
      const ctx = this.engine.ctx!;
      this.gain = ctx.createGain();
      this.gain.gain.value = 1;
      this.gain.connect(this.engine.buses.narration);
      const send = ctx.createGain();
      send.gain.value = 0.22;
      this.gain.connect(send);
      send.connect(this.engine.reverbSend);
    }
    return this.gain;
  }

  private pickSpeechVoice(): SpeechSynthesisVoice | null {
    if (this.speechVoice) return this.speechVoice;
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    // Prefer a neutral English voice; never target a specific performer.
    const preferred =
      voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|arthur/i.test(v.name)) ??
      voices.find((v) => /en-GB/i.test(v.lang)) ??
      voices.find((v) => /^en/i.test(v.lang)) ??
      voices[0];
    this.speechVoice = preferred ?? null;
    return this.speechVoice;
  }

  /** Start a line. Any line already playing is cut. */
  play(id: string): NarrationLine | null {
    const line = this.byId.get(id);
    if (!line) return null;
    this.stop();
    this.activeId = id;
    this.activeEndsAt = performance.now() / 1000 + line.duration;

    if (this.mode === 'clips') {
      const buf = this.buffers.get(id);
      const gain = this.ensureGain();
      if (buf && gain) {
        const src = this.engine.ctx!.createBufferSource();
        src.buffer = buf;
        src.connect(gain);
        src.onended = () => {
          if (this.activeSource === src) {
            this.activeSource = null;
            this.activeId = null;
            this.onLine.emit(null);
          }
        };
        src.start();
        this.activeSource = src;
        this.onLine.emit({ line });
        return line;
      }
    }

    if (this.mode === 'speech' && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(line.text);
      const voice = this.pickSpeechVoice();
      if (voice) u.voice = voice;
      u.rate = line.voice === 'narrator' ? 0.92 : 1.0;
      u.pitch = line.voice === 'princess' ? 1.2 : line.voice === 'protocol' ? 1.1 : 0.85;
      u.volume = 1;
      u.onend = () => {
        if (this.activeUtterance === u) {
          this.activeUtterance = null;
          this.activeId = null;
          this.onLine.emit(null);
        }
      };
      this.activeUtterance = u;
      try {
        window.speechSynthesis.speak(u);
      } catch {
        this.activeUtterance = null;
      }
    }

    this.onLine.emit({ line });
    return line;
  }

  /** Stop immediately — used on pause, scrub and chapter jumps. */
  stop(): void {
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
      } catch {
        /* already stopped */
      }
      this.activeSource.disconnect();
      this.activeSource = null;
    }
    if (this.activeUtterance && 'speechSynthesis' in window) {
      this.activeUtterance.onend = null;
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }
    if (this.activeId) {
      this.activeId = null;
      this.onLine.emit(null);
    }
  }

  get speaking(): boolean {
    return this.activeId !== null && performance.now() / 1000 < this.activeEndsAt;
  }

  get currentLineId(): string | null {
    return this.activeId;
  }

  /** Which line (if any) should be audible at master-timeline time `t`. */
  lineAt(t: number): NarrationLine | null {
    for (const l of this.lines) {
      if (t >= l.time && t < l.time + l.duration) return l;
    }
    return null;
  }
}
