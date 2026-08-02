import type { AudioEngine } from './AudioEngine';

/**
 * Narration playback.
 *
 * Clips are pre-rendered from an original script with a local, open text-to
 * speech voice and committed to the repository, so nothing is fetched from a
 * third party at runtime and no API key exists anywhere in this codebase. If a
 * clip cannot be loaded for any reason, the player degrades to the browser's
 * own speech synthesis with the same text; if that is unavailable too, the
 * subtitles still carry the whole script.
 */

export interface NarrationCue {
  id: string;
  chapter: string;
  time: number;
  speaker: string;
  text: string;
  duration: number;
  file: string;
}

export interface NarrationManifest {
  words: number;
  cues: NarrationCue[];
}

export type NarrationMode = 'audio' | 'speech' | 'silent';

export class NarrationPlayer {
  private engine: AudioEngine;
  private buffers = new Map<string, AudioBuffer>();
  private cues: NarrationCue[] = [];
  private current: { cue: NarrationCue; source: AudioBufferSourceNode } | null = null;
  private currentSpeech: { cue: NarrationCue; utterance: SpeechSynthesisUtterance } | null = null;
  private ducking: GainNode;
  private mode: NarrationMode = 'silent';
  private enabled = true;
  private baseUrl: string;

  constructor(engine: AudioEngine, baseUrl = import.meta.env.BASE_URL ?? '/') {
    this.engine = engine;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    this.ducking = engine.ctx.createGain();
    this.ducking.gain.value = 1;
    this.ducking.connect(engine.buses.narration);
    const send = engine.ctx.createGain();
    send.gain.value = 0.16;
    this.ducking.connect(send);
    send.connect(engine.reverbSpaceSend);
  }

  get manifestCues(): NarrationCue[] {
    return this.cues;
  }

  get playbackMode(): NarrationMode {
    return this.mode;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  /**
   * Load the manifest and decode every clip.
   * @param onProgress called with 0..1 as clips decode
   */
  async load(onProgress?: (progress: number, label: string) => void): Promise<NarrationManifest | null> {
    let manifest: NarrationManifest | null = null;
    try {
      const res = await fetch(`${this.baseUrl}audio/narration/manifest.json`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      manifest = (await res.json()) as NarrationManifest;
    } catch (err) {
      console.warn('[narration] manifest unavailable, falling back to speech synthesis', err);
      this.mode = 'speech';
      return null;
    }

    this.cues = [...manifest.cues].sort((a, b) => a.time - b.time);
    let done = 0;
    let failures = 0;

    // Decode in small batches so the loading bar moves smoothly.
    const batchSize = 6;
    for (let i = 0; i < this.cues.length; i += batchSize) {
      const batch = this.cues.slice(i, i + batchSize);
      await Promise.all(batch.map(async (cue) => {
        try {
          const res = await fetch(`${this.baseUrl}${cue.file}`, { cache: 'force-cache' });
          if (!res.ok) throw new Error(`${cue.file} ${res.status}`);
          const bytes = await res.arrayBuffer();
          const buffer = await this.engine.ctx.decodeAudioData(bytes);
          this.buffers.set(cue.id, buffer);
        } catch (err) {
          failures++;
          console.warn(`[narration] could not decode ${cue.id}`, err);
        } finally {
          done++;
          onProgress?.(done / this.cues.length, `Narration ${done}/${this.cues.length}`);
        }
      }));
    }

    this.mode = failures >= this.cues.length ? 'speech' : 'audio';
    return manifest;
  }

  /** The cue that should be sounding at time `t`, if any. */
  cueAt(t: number): NarrationCue | null {
    for (const cue of this.cues) {
      if (t >= cue.time && t < cue.time + cue.duration + 0.05) return cue;
    }
    return null;
  }

  /**
   * Idempotent playback. Called every frame; starting the same cue twice is
   * impossible because the player compares against what is already sounding.
   */
  update(t: number, playing: boolean): void {
    if (!this.enabled) return;
    const cue = playing ? this.cueAt(t) : null;
    const currentId = this.current?.cue.id ?? this.currentSpeech?.cue.id ?? null;
    if (cue?.id === currentId) return;

    this.stop();
    if (!cue) return;

    const offset = Math.max(0, t - cue.time);
    if (offset > cue.duration - 0.25) return;

    const buffer = this.buffers.get(cue.id);
    if (buffer) {
      const source = this.engine.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ducking);
      source.start(this.engine.now, offset);
      source.onended = () => {
        if (this.current?.source === source) this.current = null;
      };
      this.current = { cue, source };
      this.mode = 'audio';
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && offset < 0.4) {
      this.speak(cue);
    }
  }

  private speak(cue: NarrationCue): void {
    try {
      const utterance = new SpeechSynthesisUtterance(cue.text);
      utterance.rate = 0.92;
      utterance.pitch = cue.speaker === 'PRINCESS' ? 1.2 : 0.95;
      utterance.volume = 1;
      // Prefer a neutral, locally installed voice; never request a named person.
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => /en[-_](GB|US)/i.test(v.lang) && !/novelty/i.test(v.name));
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => {
        if (this.currentSpeech?.utterance === utterance) this.currentSpeech = null;
      };
      window.speechSynthesis.speak(utterance);
      this.currentSpeech = { cue, utterance };
      this.mode = 'speech';
    } catch (err) {
      console.warn('[narration] speech synthesis unavailable', err);
      this.mode = 'silent';
    }
  }

  /** Duck narration under a very loud moment without changing the user's mix. */
  duck(amount: number): void {
    this.ducking.gain.setTargetAtTime(1 - Math.max(0, Math.min(0.7, amount)), this.engine.now, 0.15);
  }

  stop(): void {
    if (this.current) {
      try {
        this.current.source.onended = null;
        this.current.source.stop();
      } catch {
        /* already stopped */
      }
      this.current = null;
    }
    if (this.currentSpeech) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
      this.currentSpeech = null;
    }
  }

  /** QA hook: how many clips actually decoded. */
  get loadedCount(): number {
    return this.buffers.size;
  }

  get cueCount(): number {
    return this.cues.length;
  }
}
