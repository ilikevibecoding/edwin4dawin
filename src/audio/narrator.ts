/**
 * Narration playback and subtitles.
 *
 * Clips are pre-rendered offline (see `tools/generate-narration.mjs`) and
 * decoded into Web Audio buffers at load time so a cue never stutters. If the
 * generated files are missing — or the browser cannot decode Ogg Vorbis — the
 * narrator falls back to the Web Speech API, and if that is unavailable too,
 * the subtitles still run on the scripted timings so the story is never lost.
 *
 * Cues are keyed by id and guarded against double-firing, which matters when
 * the viewer scrubs the timeline.
 */

import type { AudioEngine } from './engine';

export interface ScriptLine {
  id: string;
  chapter: number;
  t: number;
  voice: string;
  text: string;
}

export interface NarrationScript {
  voices: Record<string, { model: string; chain: string }>;
  prologueCards: string[];
  epilogueCard: string;
  lines: ScriptLine[];
}

interface ClipInfo {
  file: string;
  duration: number;
  voice: string;
  words: number;
}

export interface SubtitleCue {
  id: string;
  speaker: string | null;
  text: string;
  start: number;
  end: number;
}

const SPEAKER_LABELS: Record<string, string | null> = {
  narrator: null,
  princess: 'The Princess',
  captain: 'Ship security',
  droid: 'Protocol droid',
};

/** Rough spoken duration when no clip is available, at ~2.7 words/second. */
function estimateDuration(text: string): number {
  return Math.max(1.4, (text.split(/\s+/).length / 2.7) * 1.06 + 0.4);
}

export class Narrator {
  private engine: AudioEngine;
  private script: NarrationScript;
  private clips = new Map<string, ClipInfo>();
  private buffers = new Map<string, AudioBuffer>();
  private cues: SubtitleCue[] = [];
  private playing: { id: string; source: AudioBufferSourceNode } | null = null;
  private speechUtterance: SpeechSynthesisUtterance | null = null;
  private useSpeechSynthesis = false;
  private loaded = false;

  /** Set false to mute narration audio while keeping subtitles. */
  enabled = true;

  constructor(engine: AudioEngine, script: NarrationScript) {
    this.engine = engine;
    this.script = script;
    this.buildCues();
  }

  private buildCues(): void {
    this.cues = this.script.lines.map((l) => ({
      id: l.id,
      speaker: SPEAKER_LABELS[l.voice] ?? null,
      text: l.text,
      start: l.t,
      end: l.t + estimateDuration(l.text),
    }));
  }

  /**
   * Fetch the manifest and decode every clip.
   * @param onProgress reports 0..1 as clips decode.
   */
  async load(onProgress?: (fraction: number, label: string) => void): Promise<void> {
    if (this.loaded) return;
    let manifest: { clips: Record<string, ClipInfo> } | null = null;
    try {
      const res = await fetch('audio/narration/manifest.json', { cache: 'force-cache' });
      if (res.ok) manifest = await res.json();
    } catch {
      manifest = null;
    }

    if (!manifest) {
      this.useSpeechSynthesis = 'speechSynthesis' in window;
      this.loaded = true;
      onProgress?.(1, 'narration: browser voice');
      return;
    }

    for (const [id, info] of Object.entries(manifest.clips)) this.clips.set(id, info);

    // Recompute subtitle windows from the real measured durations.
    for (const cue of this.cues) {
      const clip = this.clips.get(cue.id);
      if (clip) cue.end = cue.start + clip.duration;
    }

    const ctx = this.engine.ctx;
    if (!ctx) {
      this.loaded = true;
      onProgress?.(1, 'narration: subtitles only');
      return;
    }

    const ids = [...this.clips.keys()];
    let done = 0;
    // Decode a few at a time: unbounded parallel decodes stall weaker machines.
    const batchSize = 6;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (id) => {
          const info = this.clips.get(id)!;
          try {
            const res = await fetch(`audio/narration/${info.file}`, { cache: 'force-cache' });
            if (!res.ok) throw new Error(String(res.status));
            const bytes = await res.arrayBuffer();
            this.buffers.set(id, await ctx.decodeAudioData(bytes));
          } catch {
            /* leave it out; the subtitle still shows and speech may cover it */
          } finally {
            done++;
            onProgress?.(done / ids.length, `narration ${done}/${ids.length}`);
          }
        }),
      );
    }

    if (this.buffers.size === 0) this.useSpeechSynthesis = 'speechSynthesis' in window;
    this.loaded = true;
  }

  get lines(): ScriptLine[] {
    return this.script.lines;
  }

  get subtitleCues(): SubtitleCue[] {
    return this.cues;
  }

  get prologueCards(): string[] {
    return this.script.prologueCards;
  }

  get epilogueCard(): string {
    return this.script.epilogueCard;
  }

  /** Total spoken duration, used by the diagnostics overlay. */
  get totalSpokenSeconds(): number {
    return this.cues.reduce((n, c) => n + (c.end - c.start), 0);
  }

  /** Which subtitle should be on screen at `t`, if any. */
  cueAt(t: number): SubtitleCue | null {
    for (const c of this.cues) {
      if (t >= c.start && t < c.end + 0.35) return c;
    }
    return null;
  }

  /**
   * Speak a line. `offset` lets the timeline resume mid-clip after a scrub so
   * narration stays locked to the picture.
   */
  speak(id: string, offset = 0): void {
    if (!this.enabled) return;
    this.stop();
    const ctx = this.engine.ctx;
    const buffer = this.buffers.get(id);
    if (ctx && buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.engine.bus('narration'));
      const start = Math.max(0, Math.min(offset, buffer.duration - 0.05));
      src.start(0, start);
      src.onended = () => {
        if (this.playing?.source === src) this.playing = null;
      };
      this.playing = { id, source: src };
      return;
    }
    if (this.useSpeechSynthesis && offset < 0.6) {
      const line = this.script.lines.find((l) => l.id === id);
      if (!line) return;
      try {
        const u = new SpeechSynthesisUtterance(line.text);
        u.rate = 0.88;
        u.pitch = line.voice === 'princess' ? 1.15 : 0.92;
        u.volume = 1;
        this.speechUtterance = u;
        window.speechSynthesis.speak(u);
      } catch {
        /* subtitles carry the line */
      }
    }
  }

  stop(): void {
    if (this.playing) {
      try {
        this.playing.source.onended = null;
        this.playing.source.stop();
      } catch {
        /* already finished */
      }
      this.playing = null;
    }
    if (this.speechUtterance && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.speechUtterance = null;
    }
  }

  get isSpeaking(): boolean {
    return this.playing !== null;
  }

  get currentId(): string | null {
    return this.playing?.id ?? null;
  }

  /** Diagnostics: which clips failed to decode. */
  missingClips(): string[] {
    return this.script.lines.filter((l) => !this.buffers.has(l.id)).map((l) => l.id);
  }

  get usingFallback(): boolean {
    return this.buffers.size === 0;
  }
}
