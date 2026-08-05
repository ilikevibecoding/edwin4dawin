/**
 * Sound.
 *
 * Two halves. Dialogue is pre-rendered offline with espeak-ng into one file per
 * line, pitch- and rate-shifted per character so the cast is distinguishable,
 * and shipped with a viseme track for lip sync. Everything else — the score, the
 * rain, the impacts, the interface blips — is synthesised at runtime from
 * oscillators and filtered noise, because a night-time storm scene needs a
 * continuous bed rather than loop points, and because it costs no download.
 */

export interface VoiceLine {
  /** Audio file relative to the audio root. */
  file: string;
  duration: number;
  /** Mouth-open envelope, one sample every `visemeStep` seconds. */
  visemes: number[];
  visemeStep: number;
}

export type VoiceBank = Record<string, VoiceLine>;

const NOTE = (semitonesFromA4: number): number => 440 * Math.pow(2, semitonesFromA4 / 12);

export class AudioEngine {
  readonly ctx: AudioContext;
  private master: GainNode;
  private musicBus: GainNode;
  private sfxBus: GainNode;
  private voiceBus: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private bank: VoiceBank = {};
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private musicVoices: { osc: OscillatorNode; gain: GainNode }[] = [];
  private musicTimer = 0;
  private musicStep = 0;
  private musicRoot = NOTE(-24);
  private musicIntensity = 0;
  private currentVoice: AudioBufferSourceNode | null = null;
  private voiceStartedAt = 0;
  private voicePlaying: VoiceLine | null = null;
  private heartbeatGain: GainNode | null = null;

  constructor(private root = 'audio/') {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    // A gentle limiter keeps thunder and gunshots from clipping the bed.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    comp.connect(this.master);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.0;
    this.musicBus.connect(comp);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.65;
    this.sfxBus.connect(comp);

    this.voiceBus = this.ctx.createGain();
    this.voiceBus.gain.value = 1.0;
    this.voiceBus.connect(comp);
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  get time(): number {
    return this.ctx.currentTime;
  }

  // ------------------------------------------------------------------ dialogue

  async loadVoiceBank(url = `${this.root}voices.json`): Promise<void> {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      this.bank = (await res.json()) as VoiceBank;
    } catch {
      // Voice pack is optional: the game plays silently captioned without it.
      this.bank = {};
    }
  }

  hasLine(id: string): boolean {
    return Boolean(this.bank[id]);
  }

  lineDuration(id: string, fallback: number): number {
    return this.bank[id]?.duration ?? fallback;
  }

  private async buffer(file: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(file);
    if (cached) return cached;
    try {
      const res = await fetch(this.root + file);
      if (!res.ok) return null;
      const bytes = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(bytes);
      this.buffers.set(file, buf);
      return buf;
    } catch {
      return null;
    }
  }

  /** Preloads a set of lines so playback never stalls mid-scene. */
  async preloadLines(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map(async (id) => {
        const line = this.bank[id];
        if (line) await this.buffer(line.file);
      })
    );
  }

  async playLine(id: string): Promise<number> {
    const line = this.bank[id];
    if (!line) return 0;
    const buf = await this.buffer(line.file);
    if (!buf) return line.duration;
    this.stopLine();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    // A touch of room so voices are not bone dry against the rain.
    const dry = this.ctx.createGain();
    dry.gain.value = 0.92;
    src.connect(dry).connect(this.voiceBus);
    src.start();
    this.currentVoice = src;
    this.voiceStartedAt = this.ctx.currentTime;
    this.voicePlaying = line;
    return buf.duration;
  }

  stopLine(): void {
    if (this.currentVoice) {
      try {
        this.currentVoice.stop();
      } catch {
        /* already finished */
      }
      this.currentVoice = null;
    }
    this.voicePlaying = null;
  }

  /**
   * Current mouth-open amount for the speaking line, 0..1. Driven from the
   * pre-computed viseme track so lips match syllables rather than a noise wave.
   */
  mouthOpen(): number {
    const line = this.voicePlaying;
    if (!line || !line.visemes.length) return 0;
    const t = this.ctx.currentTime - this.voiceStartedAt;
    if (t < 0 || t > line.duration + 0.1) return 0;
    const idx = t / line.visemeStep;
    const i0 = Math.max(0, Math.min(line.visemes.length - 1, Math.floor(idx)));
    const i1 = Math.min(line.visemes.length - 1, i0 + 1);
    const f = idx - i0;
    return line.visemes[i0] * (1 - f) + line.visemes[i1] * f;
  }

  // --------------------------------------------------------------------- score

  /**
   * The score is a slow minor drone with a sparse arpeggio on top. `intensity`
   * moves it from three sustained voices to a tense pulse without a transition,
   * so a beat can tighten mid-scene.
   */
  startMusic(rootSemitone = -24, intensity = 0.3): void {
    this.stopMusic();
    this.musicRoot = NOTE(rootSemitone);
    this.musicIntensity = intensity;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0.5, this.ctx.currentTime, 1.6);

    // Sustained bed: root, fifth, minor tenth, each slightly detuned.
    for (const [mult, detune, gain, type] of [
      [1, -4, 0.16, 'sine'],
      [1.5, 5, 0.1, 'sine'],
      [2.378, -7, 0.055, 'triangle'],
      [0.5, 3, 0.11, 'sine'],
    ] as [number, number, number, OscillatorType][]) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = this.musicRoot * mult;
      osc.detune.value = detune;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(gain, this.ctx.currentTime, 2.2);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      osc.connect(g).connect(lp).connect(this.musicBus);
      osc.start();
      this.musicVoices.push({ osc, gain: g });
    }
  }

  setMusicIntensity(v: number): void {
    this.musicIntensity = Math.max(0, Math.min(1, v));
    this.musicBus.gain.setTargetAtTime(0.34 + this.musicIntensity * 0.42, this.ctx.currentTime, 1.2);
  }

  fadeMusic(to: number, seconds = 2): void {
    this.musicBus.gain.setTargetAtTime(to, this.ctx.currentTime, seconds / 3);
  }

  stopMusic(): void {
    for (const v of this.musicVoices) {
      v.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      try {
        v.osc.stop(this.ctx.currentTime + 1.6);
      } catch {
        /* ignore */
      }
    }
    this.musicVoices = [];
  }

  /** Advances the sparse arpeggio; called every frame. */
  update(dt: number): void {
    if (!this.musicVoices.length) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    const beat = 1.15 - this.musicIntensity * 0.5;
    this.musicTimer = beat;
    this.musicStep = (this.musicStep + 1) % 8;
    // Aeolian pattern: the pulse only lands on some steps, which keeps it from
    // turning into a melody and fighting the dialogue.
    const pattern = [0, 3, 7, 10, 7, 3, 12, 7];
    if (this.musicStep % 2 === 1 && this.musicIntensity < 0.45) return;
    const semis = pattern[this.musicStep];
    const freq = this.musicRoot * 4 * Math.pow(2, semis / 12);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    const peak = 0.028 + this.musicIntensity * 0.05;
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.9);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 1.4;
    bp.Q.value = 1.6;
    osc.connect(g).connect(bp).connect(this.musicBus);
    osc.start(t);
    osc.stop(t + beat * 2);
  }

  // ------------------------------------------------------------- rain and SFX

  private noiseBuffer(seconds = 3): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        // One-pole smoothing turns white noise into something closer to rain.
        last = last * 0.72 + white * 0.28;
        data[i] = last * 1.4;
      }
      // Crossfade the tail into the head so the loop has no seam.
      const fade = Math.floor(this.ctx.sampleRate * 0.25);
      for (let i = 0; i < fade; i++) {
        const k = i / fade;
        data[i] = data[i] * k + data[len - fade + i] * (1 - k);
      }
    }
    return buf;
  }

  startRain(level = 0.55): void {
    if (this.rainSource) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 420;
    const shelf = this.ctx.createBiquadFilter();
    shelf.type = 'peaking';
    shelf.frequency.value = 2600;
    shelf.gain.value = 5;
    shelf.Q.value = 0.7;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(level, this.ctx.currentTime, 1.4);
    src.connect(hp).connect(shelf).connect(gain).connect(this.sfxBus);
    src.start();
    this.rainSource = src;
    this.rainGain = gain;
  }

  setRain(level: number, seconds = 1.2): void {
    this.rainGain?.gain.setTargetAtTime(Math.max(0, level), this.ctx.currentTime, seconds / 3);
  }

  stopRain(): void {
    if (!this.rainSource) return;
    this.rainGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    const src = this.rainSource;
    setTimeout(() => {
      try {
        src.stop();
      } catch {
        /* ignore */
      }
    }, 2000);
    this.rainSource = null;
    this.rainGain = null;
  }

  thunder(distance = 0.6): void {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2.5);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400 - distance * 900, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 2.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55 * (1 - distance * 0.55), t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 2.6);
    src.connect(lp).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + 2.8);
  }

  /** Sharp transient: gunshot, glass, impact. */
  bang(opts: { level?: number; pitch?: number; tail?: number } = {}): void {
    const t = this.ctx.currentTime;
    const level = opts.level ?? 0.8;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(1);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800 * (opts.pitch ?? 1), t);
    bp.frequency.exponentialRampToValueAtTime(180, t + 0.22);
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + (opts.tail ?? 0.5));
    src.connect(bp).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + (opts.tail ?? 0.5) + 0.1);

    // Low thump underneath so it has body on small speakers.
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 * (opts.pitch ?? 1), t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(level * 0.7, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.3);
    osc.connect(og).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /** Interface blip. `kind` picks the pitch contour. */
  blip(kind: 'select' | 'confirm' | 'scan' | 'found' | 'fail' | 'tick' = 'select'): void {
    const t = this.ctx.currentTime;
    const spec: Record<string, [number, number, number, OscillatorType]> = {
      select: [880, 880, 0.05, 'sine'],
      confirm: [660, 1320, 0.12, 'triangle'],
      scan: [1760, 2200, 0.09, 'sine'],
      found: [1320, 1980, 0.16, 'triangle'],
      fail: [400, 180, 0.24, 'sawtooth'],
      tick: [2400, 2400, 0.025, 'square'],
    };
    const [f0, f1, dur, type] = spec[kind];
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(kind === 'tick' ? 0.06 : 0.15, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    osc.connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Rising synthetic whine used when an android's stress spikes. */
  stressWhine(level: number): void {
    if (!this.heartbeatGain) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 74;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      osc.connect(g).connect(lp).connect(this.sfxBus);
      osc.start();
      this.heartbeatGain = g;
    }
    this.heartbeatGain.gain.setTargetAtTime(Math.max(0, level) * 0.09, this.ctx.currentTime, 0.6);
  }

  /** Single heartbeat thump, used to pace tense beats. */
  heartbeat(level = 0.5): void {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(64, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level * 0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.34);
    osc.connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  setMasterVolume(v: number): void {
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.1);
  }
}
