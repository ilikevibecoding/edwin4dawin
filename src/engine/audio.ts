/**
 * Procedural audio. No sample assets: the score, rain bed and interface sounds
 * are all synthesised with WebAudio so the build stays self-contained.
 */

type Voice = { stop: (at?: number) => void };

export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  ambienceBus!: GainNode;
  private reverb!: ConvolverNode;
  private started = false;
  private rainVoice: Voice | null = null;
  private droneVoice: Voice | null = null;
  private cue: { stop: () => void } | null = null;
  enabled = true;

  /**
   * Safe to call at any time; ideally from a user gesture. `resume()` is never
   * awaited because on a blocked context that promise can stay pending forever,
   * which would stall the whole boot sequence.
   */
  async start(): Promise<void> {
    if (this.started) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      void this.ctx.resume().catch(() => undefined);
    } catch {
      this.enabled = false;
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.6, 3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.reverb.connect(wet);
    wet.connect(this.master);

    const bus = (gain: number) => {
      const g = ctx.createGain();
      g.gain.value = gain;
      g.connect(this.master);
      g.connect(this.reverb);
      return g;
    };
    this.musicBus = bus(0.5);
    this.sfxBus = bus(0.7);
    this.ambienceBus = bus(0.55);
    this.started = true;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }

  private noiseBuffer(seconds = 2): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  get ready(): boolean {
    return this.started && this.enabled && !!this.ctx;
  }

  /* ------------------------------------------------------------ ambience */

  /** Filtered noise bed with slow modulation — rain on concrete. */
  rain(level = 0.5): void {
    if (!this.ready) return;
    this.rainVoice?.stop();
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(3);
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 420;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(level * 0.5, ctx.currentTime + 2);
    // Gusts.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = level * 0.12;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(this.ambienceBus);
    src.start();
    lfo.start();
    this.rainVoice = {
      stop: (at = 1.2) => {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + at);
        src.stop(ctx.currentTime + at + 0.1);
        lfo.stop(ctx.currentTime + at + 0.1);
      },
    };
  }

  /** Low room tone / city drone. */
  drone(freq = 55, level = 0.25): void {
    if (!this.ready) return;
    this.droneVoice?.stop();
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(level, ctx.currentTime + 3);
    g.connect(this.ambienceBus);
    const oscs: OscillatorNode[] = [];
    for (const [mult, amp, detune] of [[1, 1, 0], [2, 0.35, 4], [3.01, 0.16, -6], [0.5, 0.5, 2]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq * mult;
      o.detune.value = detune;
      const og = ctx.createGain();
      og.gain.value = amp * 0.25;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      o.connect(og);
      og.connect(lp);
      lp.connect(g);
      o.start();
      oscs.push(o);
    }
    this.droneVoice = {
      stop: (at = 2) => {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + at);
        for (const o of oscs) o.stop(ctx.currentTime + at + 0.1);
      },
    };
  }

  stopAmbience(fade = 1.5): void {
    this.rainVoice?.stop(fade);
    this.droneVoice?.stop(fade);
    this.rainVoice = null;
    this.droneVoice = null;
  }

  /* --------------------------------------------------------------- music */

  /**
   * A slow cue built from a held pad and a sparse piano-ish arpeggio. `mood`
   * shifts the scale and register: 0 calm, 1 tense, 2 tragic, 3 hopeful.
   */
  playCue(mood = 0, level = 0.5): void {
    if (!this.ready) return;
    this.cue?.stop();
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.linearRampToValueAtTime(level, ctx.currentTime + 4);
    out.connect(this.musicBus);

    const scales = [
      [0, 3, 7, 10, 14],   // calm minor 7
      [0, 1, 7, 8, 13],    // tense, phrygian colour
      [0, 3, 5, 8, 10],    // tragic
      [0, 4, 7, 11, 14],   // hopeful major 7
    ];
    const roots = [110, 98, 87.3, 130.8];
    const scale = scales[mood % 4];
    const root = roots[mood % 4];

    // Pad.
    const padOscs: OscillatorNode[] = [];
    for (const semi of [0, 7, 12]) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = root * Math.pow(2, semi / 12);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = 0.06;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        o.connect(g);
        g.connect(lp);
        lp.connect(out);
        o.start();
        padOscs.push(o);
      }
    }

    // Sparse arpeggio.
    let step = 0;
    const interval = window.setInterval(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const semi = scale[step % scale.length] + (step % 8 < 4 ? 12 : 24);
      const f = root * Math.pow(2, semi / 12);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 2.4);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 2.5);
      step += step % 3 === 2 ? 2 : 1;
    }, 1400);

    this.cue = {
      stop: () => {
        window.clearInterval(interval);
        out.gain.cancelScheduledValues(ctx.currentTime);
        out.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
        for (const o of padOscs) o.stop(ctx.currentTime + 2.7);
      },
    };
  }

  stopMusic(): void {
    this.cue?.stop();
    this.cue = null;
  }

  /* ----------------------------------------------------------------- sfx */

  private blip(freq: number, dur: number, type: OscillatorType, level: number, sweep = 0): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * sweep), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseHit(dur: number, level: number, freq: number, q = 1): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  uiMove(): void { this.blip(880, 0.06, 'sine', 0.06); }
  uiSelect(): void { this.blip(1320, 0.12, 'sine', 0.12, 1.5); this.blip(1980, 0.09, 'triangle', 0.05); }
  uiOpen(): void { this.blip(520, 0.3, 'sine', 0.09, 2.2); }
  uiBack(): void { this.blip(420, 0.14, 'sine', 0.08, 0.6); }
  scanOn(): void { this.blip(1180, 0.5, 'sine', 0.07, 1.8); this.noiseHit(0.4, 0.05, 3200, 6); }
  scanFound(): void { this.blip(1760, 0.16, 'triangle', 0.09); this.blip(2640, 0.1, 'sine', 0.04); }
  qteHit(): void { this.blip(1560, 0.1, 'square', 0.07, 1.4); this.noiseHit(0.12, 0.08, 2400, 3); }
  qteMiss(): void { this.blip(180, 0.35, 'sawtooth', 0.12, 0.5); this.noiseHit(0.3, 0.1, 300, 1); }
  heartbeat(): void { this.blip(58, 0.28, 'sine', 0.3, 0.6); }
  glass(): void { this.noiseHit(0.5, 0.16, 5200, 2); this.noiseHit(0.9, 0.08, 2600, 1); }
  gunshot(): void {
    this.noiseHit(0.5, 0.5, 900, 0.7);
    this.blip(70, 0.4, 'sawtooth', 0.35, 0.3);
  }
  impact(): void { this.noiseHit(0.45, 0.28, 260, 0.8); this.blip(90, 0.3, 'sine', 0.22, 0.4); }
  thunder(): void {
    this.noiseHit(2.4, 0.3, 140, 0.6);
    this.noiseHit(1.6, 0.18, 60, 0.5);
  }
  door(): void { this.noiseHit(0.3, 0.12, 500, 1.5); this.blip(140, 0.25, 'triangle', 0.1, 0.7); }
  step(): void { this.noiseHit(0.12, 0.05, 900, 1.4); }
  chime(): void { this.blip(1046, 0.9, 'sine', 0.08); this.blip(1568, 0.7, 'sine', 0.04); }
  stress(): void { this.blip(220, 0.6, 'sawtooth', 0.08, 0.8); this.noiseHit(0.5, 0.06, 1400, 4); }

  /** Short synthetic phoneme burst so dialogue has a voice-like presence. */
  voice(pitch = 1, duration = 1, female = false): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const base = (female ? 190 : 110) * pitch;
    const t0 = ctx.currentTime;
    const syllables = Math.max(1, Math.round(duration / 0.19));
    for (let i = 0; i < syllables; i++) {
      const t = t0 + i * (duration / syllables) * (0.85 + Math.random() * 0.3);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const f = base * (0.86 + Math.random() * 0.3);
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * (0.94 + Math.random() * 0.12), t + 0.12);
      // Two formant bands make it read as speech rather than a buzz.
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = 500 + Math.random() * 320;
      f1.Q.value = 5;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = 1500 + Math.random() * 900;
      f2.Q.value = 7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0006, t + 0.16);
      o.connect(f1);
      f1.connect(f2);
      f2.connect(g);
      g.connect(this.sfxBus);
      o.start(t);
      o.stop(t + 0.2);
    }
  }
}

export const audio = new Audio();
