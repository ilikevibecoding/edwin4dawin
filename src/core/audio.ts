import { clamp01 } from './math';

type Bus = 'sfx' | 'ambient' | 'music';

/** Semitone offsets from A4 for a note name like "D4" or "F#3". */
const NOTE_OFFSETS: Record<string, number> = {
  C: -9,
  'C#': -8,
  D: -7,
  'D#': -6,
  E: -5,
  F: -4,
  'F#': -3,
  G: -2,
  'G#': -1,
  A: 0,
  'A#': 1,
  B: 2,
};

function noteFreq(name: string): number {
  const match = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!match) return 440;
  const semis = NOTE_OFFSETS[match[1]] + (Number(match[2]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

/**
 * Everything you hear is synthesised at runtime - there are no audio files in
 * this project. Ambience (waves, wind, rain, hull creaks) runs as continuous
 * voices whose filters and gains are driven by the simulation, one-shots are
 * built per trigger, and the shanty is a tiny sequencer over a bellows-ish
 * sawtooth voice.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: Record<Bus, GainNode>;
  private noise!: AudioBuffer;

  private waveGain!: GainNode;
  private waveFilter!: BiquadFilterNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private rainGain!: GainNode;
  private underwaterGain!: GainNode;

  private started = false;
  private shantyTimer = 0;
  private shantyNextBar = 0;
  private shantyBar = 0;
  private shantyPlaying = false;

  muted = false;

  /** Must be called from a user gesture so the context is allowed to start. */
  start(): void {
    if (this.started) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.started = true;
    this.ctx = new Ctor();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);

    this.buses = {
      sfx: ctx.createGain(),
      ambient: ctx.createGain(),
      music: ctx.createGain(),
    };
    this.buses.sfx.gain.value = 0.9;
    this.buses.ambient.gain.value = 0.55;
    this.buses.music.gain.value = 0.28;
    for (const bus of Object.values(this.buses)) bus.connect(this.master);

    this.noise = this.makeNoiseBuffer(4);
    this.buildAmbience();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.85;
  }

  private makeNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      // Slight low-pass keeps the noise from sounding like a hissing tape.
      last = last * 0.35 + white * 0.65;
      data[i] = last;
    }
    return buffer;
  }

  private loopedNoise(gain: GainNode, playbackRate = 1): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = playbackRate;
    src.connect(gain);
    src.start();
  }

  private buildAmbience(): void {
    const ctx = this.ctx!;

    // --- Ocean swell: band-passed noise with a slow breathing LFO.
    this.waveFilter = ctx.createBiquadFilter();
    this.waveFilter.type = 'bandpass';
    this.waveFilter.frequency.value = 420;
    this.waveFilter.Q.value = 0.7;
    this.waveGain = ctx.createGain();
    this.waveGain.gain.value = 0.24;
    this.waveFilter.connect(this.waveGain).connect(this.buses.ambient);
    const waveSrc = ctx.createGain();
    waveSrc.connect(this.waveFilter);
    this.loopedNoise(waveSrc, 0.55);

    const swell = ctx.createOscillator();
    swell.frequency.value = 0.14;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.13;
    swell.connect(swellDepth).connect(this.waveGain.gain);
    swell.start();

    const swell2 = ctx.createOscillator();
    swell2.frequency.value = 0.061;
    const swell2Depth = ctx.createGain();
    swell2Depth.gain.value = 180;
    swell2.connect(swell2Depth).connect(this.waveFilter.frequency);
    swell2.start();

    // --- Wind: darker noise, gain and cutoff driven by weather.
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 700;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.05;
    this.windFilter.connect(this.windGain).connect(this.buses.ambient);
    const windSrc = ctx.createGain();
    windSrc.connect(this.windFilter);
    this.loopedNoise(windSrc, 0.22);

    // --- Rain: bright noise, silent until a storm rolls in.
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1800;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rainFilter.connect(this.rainGain).connect(this.buses.ambient);
    const rainSrc = ctx.createGain();
    rainSrc.connect(rainFilter);
    this.loopedNoise(rainSrc, 1.6);

    // --- Underwater rumble for when the player goes for a swim.
    const uwFilter = ctx.createBiquadFilter();
    uwFilter.type = 'lowpass';
    uwFilter.frequency.value = 260;
    this.underwaterGain = ctx.createGain();
    this.underwaterGain.gain.value = 0;
    uwFilter.connect(this.underwaterGain).connect(this.buses.ambient);
    const uwSrc = ctx.createGain();
    uwSrc.connect(uwFilter);
    this.loopedNoise(uwSrc, 0.12);
  }

  /**
   * Ambience mix. `windStrength`/`speed` are 0..1, `rain` is 0..1 storm intensity.
   */
  updateAmbience(opts: {
    windStrength: number;
    shipSpeed: number;
    rain: number;
    underwater: boolean;
    nearSurf: number;
    dt: number;
  }): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const smooth = (param: AudioParam, value: number) => {
      param.setTargetAtTime(value, now, 0.35);
    };

    const surf = clamp01(opts.nearSurf);
    smooth(this.waveGain.gain, 0.16 + surf * 0.3 + opts.shipSpeed * 0.1 + opts.rain * 0.08);
    smooth(this.waveFilter.frequency, 380 + surf * 900 + opts.shipSpeed * 320);
    smooth(this.windGain.gain, 0.03 + opts.windStrength * 0.1 + opts.rain * 0.16);
    smooth(this.windFilter.frequency, 520 + opts.windStrength * 900 + opts.rain * 900);
    smooth(this.rainGain.gain, opts.rain * 0.2);
    smooth(this.underwaterGain.gain, opts.underwater ? 0.32 : 0);
    smooth(this.buses.ambient.gain, opts.underwater ? 0.2 : 0.55);
    smooth(this.buses.music.gain, opts.underwater ? 0.06 : 0.28);

    this.updateShanty(opts.dt);
  }

  // ------------------------------------------------------------- one-shots

  private tone(opts: {
    freq: number;
    type?: OscillatorType;
    at?: number;
    duration: number;
    gain: number;
    attack?: number;
    endFreq?: number;
    bus?: Bus;
    detune?: number;
  }): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = (opts.at ?? 0) + ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t + opts.duration);
    if (opts.detune) osc.detune.value = opts.detune;

    const gain = ctx.createGain();
    const attack = opts.attack ?? 0.004;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);

    osc.connect(gain).connect(this.buses[opts.bus ?? 'sfx']);
    osc.start(t);
    osc.stop(t + opts.duration + 0.02);
  }

  private burst(opts: {
    at?: number;
    duration: number;
    gain: number;
    type?: BiquadFilterType;
    freq: number;
    endFreq?: number;
    q?: number;
    rate?: number;
    bus?: Bus;
  }): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = (opts.at ?? 0) + ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = opts.rate ?? 1;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? 'lowpass';
    filter.frequency.setValueAtTime(opts.freq, t);
    if (opts.endFreq !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(30, opts.endFreq), t + opts.duration);
    filter.Q.value = opts.q ?? 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);

    src.connect(filter).connect(gain).connect(this.buses[opts.bus ?? 'sfx']);
    src.start(t, Math.random() * 2);
    src.stop(t + opts.duration + 0.02);
  }

  /** Distance attenuation helper: 1 at the listener, fading to 0 at `range`. */
  private falloff(distance: number, range: number): number {
    return clamp01(1 - distance / range) ** 1.6;
  }

  cannonFire(distance = 0): void {
    const a = this.falloff(distance, 260);
    if (a <= 0.01) return;
    this.burst({ duration: 0.85, gain: 0.75 * a, freq: 900, endFreq: 90, q: 0.8, rate: 0.8 });
    this.tone({ freq: 130, endFreq: 34, type: 'sine', duration: 0.55, gain: 0.55 * a });
    this.burst({ at: 0.02, duration: 0.2, gain: 0.3 * a, type: 'highpass', freq: 2600, rate: 1.4 });
  }

  cannonLoad(): void {
    this.burst({ duration: 0.16, gain: 0.18, freq: 1200, endFreq: 400, rate: 1.1 });
    this.tone({ freq: 220, endFreq: 120, type: 'square', duration: 0.1, gain: 0.06 });
  }

  woodImpact(distance = 0): void {
    const a = this.falloff(distance, 220);
    if (a <= 0.01) return;
    this.burst({ duration: 0.3, gain: 0.4 * a, freq: 700, endFreq: 140, q: 1.4, rate: 0.9 });
    this.tone({ freq: 96, endFreq: 52, type: 'triangle', duration: 0.32, gain: 0.32 * a });
  }

  splash(distance = 0, size = 1): void {
    const a = this.falloff(distance, 200);
    if (a <= 0.01) return;
    this.burst({
      duration: 0.34 * size,
      gain: 0.3 * a * size,
      type: 'bandpass',
      freq: 1500 / size,
      endFreq: 420 / size,
      q: 0.9,
      rate: 1.3,
    });
  }

  swordSwing(): void {
    this.burst({ duration: 0.22, gain: 0.22, type: 'bandpass', freq: 2400, endFreq: 700, q: 1.6, rate: 1.5 });
  }

  swordHit(metal: boolean): void {
    if (metal) {
      this.tone({ freq: 1720, endFreq: 900, type: 'triangle', duration: 0.3, gain: 0.22 });
      this.tone({ freq: 2480, endFreq: 1400, type: 'sine', duration: 0.22, gain: 0.14, at: 0.005 });
      this.burst({ duration: 0.12, gain: 0.16, type: 'highpass', freq: 3800, rate: 1.6 });
    } else {
      this.burst({ duration: 0.2, gain: 0.3, freq: 520, endFreq: 160, q: 1.2, rate: 0.9 });
    }
  }

  pistolShot(): void {
    this.burst({ duration: 0.35, gain: 0.5, freq: 2400, endFreq: 260, q: 0.9, rate: 1.2 });
    this.tone({ freq: 220, endFreq: 70, type: 'square', duration: 0.16, gain: 0.2 });
  }

  dig(): void {
    this.burst({ duration: 0.28, gain: 0.24, type: 'bandpass', freq: 900, endFreq: 260, q: 0.8, rate: 0.7 });
  }

  chestOpen(): void {
    this.tone({ freq: 300, endFreq: 520, type: 'triangle', duration: 0.4, gain: 0.14 });
    this.burst({ duration: 0.25, gain: 0.16, freq: 1100, endFreq: 500, rate: 0.8 });
    for (let i = 0; i < 5; i++) {
      this.tone({ freq: 900 + i * 260, type: 'sine', duration: 0.5, gain: 0.07, at: 0.06 * i + 0.1 });
    }
  }

  coins(): void {
    for (let i = 0; i < 7; i++) {
      this.tone({
        freq: 1200 + Math.random() * 1400,
        type: 'triangle',
        duration: 0.28,
        gain: 0.08,
        at: Math.random() * 0.28,
      });
    }
  }

  footstep(onWood: boolean, running: boolean): void {
    const g = (running ? 0.11 : 0.06) * (0.85 + Math.random() * 0.3);
    if (onWood) {
      this.burst({ duration: 0.09, gain: g, freq: 340 + Math.random() * 120, endFreq: 130, q: 1.4, rate: 0.8 });
      this.tone({ freq: 74 + Math.random() * 18, endFreq: 48, type: 'sine', duration: 0.1, gain: g * 0.8 });
    } else {
      this.burst({ duration: 0.12, gain: g * 0.9, type: 'bandpass', freq: 1500, endFreq: 700, q: 0.7, rate: 1.5 });
    }
  }

  creak(): void {
    this.tone({
      freq: 150 + Math.random() * 90,
      endFreq: 110 + Math.random() * 60,
      type: 'sawtooth',
      duration: 0.9 + Math.random() * 0.6,
      gain: 0.035,
      attack: 0.25,
      bus: 'ambient',
    });
  }

  thunder(closeness: number): void {
    const g = 0.35 + closeness * 0.5;
    this.burst({ duration: 2.2, gain: g, freq: 300, endFreq: 55, q: 0.6, rate: 0.5 });
    this.burst({ at: 0.35, duration: 1.6, gain: g * 0.6, freq: 180, endFreq: 40, q: 0.5, rate: 0.4 });
    this.tone({ freq: 52, endFreq: 26, type: 'sine', duration: 1.6, gain: g * 0.5, attack: 0.08 });
  }

  seagull(): void {
    const base = 900 + Math.random() * 500;
    for (let i = 0; i < 3; i++) {
      this.tone({
        freq: base,
        endFreq: base * 1.7,
        type: 'triangle',
        duration: 0.16,
        gain: 0.05,
        at: i * 0.22,
      });
    }
  }

  skeletonRattle(distance = 0): void {
    const a = this.falloff(distance, 90);
    if (a <= 0.02) return;
    for (let i = 0; i < 6; i++) {
      this.burst({
        at: Math.random() * 0.3,
        duration: 0.05,
        gain: 0.08 * a,
        type: 'bandpass',
        freq: 2000 + Math.random() * 1800,
        q: 3,
        rate: 1.7,
      });
    }
  }

  bell(): void {
    for (const [mult, gain] of [
      [1, 0.16],
      [2.01, 0.1],
      [3.02, 0.06],
      [4.2, 0.03],
    ] as const) {
      this.tone({ freq: 620 * mult, type: 'sine', duration: 2.6, gain, attack: 0.005 });
    }
  }

  hurt(): void {
    this.tone({ freq: 320, endFreq: 140, type: 'sawtooth', duration: 0.2, gain: 0.16 });
    this.burst({ duration: 0.16, gain: 0.14, freq: 700, endFreq: 200, rate: 0.7 });
  }

  uiClick(): void {
    this.tone({ freq: 720, type: 'triangle', duration: 0.09, gain: 0.1 });
    this.tone({ freq: 1080, type: 'sine', duration: 0.12, gain: 0.05, at: 0.03 });
  }

  // ------------------------------------------------------------ the shanty

  /** Two-bar phrases of a minor-key shanty, played on a bellows-ish voice. */
  private static readonly SHANTY: { note: string; beat: number; len: number }[][] = [
    [
      { note: 'D4', beat: 0, len: 0.9 },
      { note: 'D4', beat: 1, len: 0.45 },
      { note: 'F4', beat: 1.5, len: 0.45 },
      { note: 'A4', beat: 2, len: 0.9 },
      { note: 'A4', beat: 3, len: 0.9 },
    ],
    [
      { note: 'A#4', beat: 0, len: 1.4 },
      { note: 'A4', beat: 1.5, len: 0.45 },
      { note: 'G4', beat: 2, len: 0.9 },
      { note: 'F4', beat: 3, len: 0.9 },
    ],
    [
      { note: 'D4', beat: 0, len: 0.45 },
      { note: 'F4', beat: 0.5, len: 0.45 },
      { note: 'A4', beat: 1, len: 0.9 },
      { note: 'D5', beat: 2, len: 1.4 },
    ],
    [
      { note: 'C5', beat: 0, len: 0.9 },
      { note: 'A#4', beat: 1, len: 0.9 },
      { note: 'A4', beat: 2, len: 0.45 },
      { note: 'G4', beat: 2.5, len: 0.45 },
      { note: 'F4', beat: 3, len: 1.4 },
    ],
  ];

  private static readonly SHANTY_BASS = ['D2', 'A#1', 'D2', 'F2'];

  private updateShanty(dt: number): void {
    if (!this.ctx) return;
    this.shantyTimer += dt;

    if (!this.shantyPlaying) {
      // Long gaps between songs so it stays atmospheric rather than a jingle.
      if (this.shantyTimer > this.shantyNextBar) {
        this.shantyPlaying = true;
        this.shantyBar = 0;
        this.shantyTimer = 0;
        this.shantyNextBar = 0;
      }
      return;
    }

    const barLength = 2.6;
    if (this.shantyTimer >= this.shantyNextBar) {
      this.playShantyBar(this.shantyBar, barLength);
      this.shantyBar++;
      this.shantyNextBar += barLength;
      if (this.shantyBar >= 8) {
        this.shantyPlaying = false;
        this.shantyTimer = 0;
        this.shantyNextBar = 55 + Math.random() * 70;
      }
    }
  }

  /** Kick off a shanty shortly after the game starts. */
  scheduleShanty(delay = 8): void {
    this.shantyPlaying = false;
    this.shantyTimer = 0;
    this.shantyNextBar = delay;
  }

  private playShantyBar(bar: number, barLength: number): void {
    const phrase = AudioEngine.SHANTY[bar % AudioEngine.SHANTY.length];
    const beat = barLength / 4;

    for (const n of phrase) {
      const f = noteFreq(n.note);
      const at = n.beat * beat;
      const dur = n.len * beat;
      this.tone({ freq: f, type: 'sawtooth', duration: dur, gain: 0.055, attack: 0.05, at, bus: 'music' });
      this.tone({ freq: f * 1.005, type: 'sawtooth', duration: dur, gain: 0.04, attack: 0.07, at, bus: 'music', detune: 6 });
      this.tone({ freq: f * 2, type: 'sine', duration: dur * 0.7, gain: 0.02, attack: 0.03, at, bus: 'music' });
    }

    const bass = noteFreq(AudioEngine.SHANTY_BASS[bar % AudioEngine.SHANTY_BASS.length]);
    this.tone({ freq: bass, type: 'triangle', duration: barLength * 0.9, gain: 0.05, attack: 0.06, bus: 'music' });
    // Skeletal percussion: a barrel-thump on 1 and 3.
    for (const b of [0, 2]) {
      this.burst({
        at: b * beat,
        duration: 0.14,
        gain: 0.06,
        freq: 260,
        endFreq: 90,
        rate: 0.7,
        bus: 'music',
      });
    }
  }
}
