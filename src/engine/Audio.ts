/**
 * Fully procedural audio: music beds, ambiences, sound effects and stylised
 * dialogue vocalisation. There are no audio files in this project.
 *
 * Everything degrades to a silent no-op when no audio device is available, which
 * is the normal case in the headless Chrome used for frame capture. `speak()`
 * still resolves after the requested duration in silent mode so story pacing is
 * preserved.
 */

export type MusicMood = 'silence' | 'tension' | 'melancholy' | 'wonder' | 'threat' | 'resolve' | 'chase' | 'menu';
export type AmbienceKind = 'none' | 'rainStreet' | 'rainInterior' | 'roomTone' | 'rooftopWind' | 'sirens';
export type SfxName =
  | 'uiHover' | 'uiSelect' | 'uiBack' | 'uiTick' | 'uiError'
  | 'scanOn' | 'scanOff' | 'scanPing' | 'clueFound'
  | 'ledBlip' | 'glitch' | 'stress' | 'heartbeat'
  | 'footstepConcrete' | 'footstepWood' | 'doorOpen' | 'doorClose'
  | 'thunder' | 'gunshot' | 'impact' | 'glassBreak' | 'chairScrape' | 'paperShuffle'
  | 'qtePrompt' | 'qteSuccess' | 'qteFail' | 'choiceAppear' | 'timerLow'
  | 'whoosh' | 'cameraShutter' | 'notification';

export interface VoiceProfile {
  pitch: number;
  rate: number;
  timbre: 'warm' | 'neutral' | 'bright' | 'synthetic' | 'gravel';
  android?: number;
}

/** Scale degrees of A natural minor, as semitone offsets from A. */
const A_MINOR = [0, 2, 3, 5, 7, 8, 10];
const BPM = 84;

interface MoodSpec {
  /** Chord progression as root scale-degree indices. */
  progression: number[];
  padGain: number;
  padWave: OscillatorType;
  bassGain: number;
  pluckGain: number;
  pulseGain: number;
  /** Beats between plucks. */
  pluckEvery: number;
  detune: number;
  brightness: number;
}

const MOODS: Record<Exclude<MusicMood, 'silence'>, MoodSpec> = {
  tension:    { progression: [0, 0, 5, 4], padGain: 0.16, padWave: 'sawtooth', bassGain: 0.2,  pluckGain: 0.1,  pulseGain: 0.05, pluckEvery: 3,   detune: 8,  brightness: 480 },
  melancholy: { progression: [0, 5, 3, 4], padGain: 0.2,  padWave: 'triangle', bassGain: 0.14, pluckGain: 0.16, pulseGain: 0,    pluckEvery: 2,   detune: 5,  brightness: 900 },
  wonder:     { progression: [0, 4, 5, 2], padGain: 0.22, padWave: 'triangle', bassGain: 0.1,  pluckGain: 0.14, pulseGain: 0,    pluckEvery: 1.5, detune: 12, brightness: 1600 },
  threat:     { progression: [0, 1, 0, 1], padGain: 0.18, padWave: 'sawtooth', bassGain: 0.26, pluckGain: 0.06, pulseGain: 0.14, pluckEvery: 4,   detune: 16, brightness: 380 },
  resolve:    { progression: [2, 5, 0, 4], padGain: 0.22, padWave: 'triangle', bassGain: 0.14, pluckGain: 0.18, pulseGain: 0,    pluckEvery: 1.5, detune: 4,  brightness: 1800 },
  chase:      { progression: [0, 0, 3, 4], padGain: 0.1,  padWave: 'sawtooth', bassGain: 0.28, pluckGain: 0.08, pulseGain: 0.2,  pluckEvery: 0.5, detune: 10, brightness: 700 },
  menu:       { progression: [0, 4],       padGain: 0.14, padWave: 'sine',     bassGain: 0.08, pluckGain: 0.12, pulseGain: 0,    pluckEvery: 4,   detune: 6,  brightness: 1200 },
};

function midiToFreq(semitonesFromA3: number): number {
  // A3 = 220 Hz
  return 220 * Math.pow(2, semitonesFromA3 / 12);
}

export class AudioEngine {
  readonly available: boolean;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private ambienceNodes: AudioNode[] = [];
  private ambienceGain: GainNode | null = null;
  private ambienceKind: AmbienceKind = 'none';
  private ambienceIntensity = 1;

  private mood: MusicMood = 'silence';
  private moodGain: GainNode | null = null;
  private musicIntensity = 0.6;
  private musicEnabled = true;
  private voiceEnabled = false;
  private nextNoteTime = 0;
  private beat = 0;
  private liveVoices = 0;
  private speaking: { cancel: () => void } | null = null;

  constructor() {
    let ok = false;
    try {
      const Ctor = (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (Ctor) {
        this.ctx = new Ctor();
        const ctx = this.ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(ctx.destination);

        const makeBus = (gain: number) => {
          const g = ctx.createGain();
          g.gain.value = gain;
          g.connect(this.master!);
          return g;
        };
        this.musicBus = makeBus(0.5);
        this.sfxBus = makeBus(0.7);
        this.voiceBus = makeBus(0.85);

        // Convolution reverb from an exponentially decaying noise impulse
        const seconds = 2.6;
        const len = Math.floor(ctx.sampleRate * seconds);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const data = ir.getChannelData(c);
          for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
          }
        }
        const convolver = ctx.createConvolver();
        convolver.buffer = ir;
        const wet = ctx.createGain();
        wet.gain.value = 0.5;
        convolver.connect(wet);
        wet.connect(this.master);
        this.reverbSend = ctx.createGain();
        this.reverbSend.gain.value = 1;
        this.reverbSend.connect(convolver);

        // Looping pink-ish noise for ambience
        const nlen = Math.floor(ctx.sampleRate * 3);
        this.noiseBuffer = ctx.createBuffer(1, nlen, ctx.sampleRate);
        const nd = this.noiseBuffer.getChannelData(0);
        let b0 = 0;
        let b1 = 0;
        for (let i = 0; i < nlen; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99 * b0 + white * 0.05;
          b1 = 0.92 * b1 + white * 0.18;
          nd[i] = Math.max(-1, Math.min(1, b0 + b1 + white * 0.12));
        }
        // Cross-fade the loop seam
        const fade = Math.floor(ctx.sampleRate * 0.05);
        for (let i = 0; i < fade; i++) {
          const k = i / fade;
          nd[i] = nd[i] * k + nd[nlen - fade + i] * (1 - k);
        }

        this.nextNoteTime = ctx.currentTime;
        ok = true;
      }
    } catch {
      ok = false;
    }
    this.available = ok;
  }

  async unlock(): Promise<void> {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch {
      // A blocked resume is not fatal; playback simply stays silent.
    }
  }

  setMasterVolume(v: number) {
    if (this.master) this.master.gain.value = Math.max(0, v);
  }
  setMusicVolume(v: number) {
    if (this.musicBus) this.musicBus.gain.value = Math.max(0, v);
  }
  setSfxVolume(v: number) {
    if (this.sfxBus) this.sfxBus.gain.value = Math.max(0, v);
  }
  setVoiceEnabled(on: boolean) {
    this.voiceEnabled = on;
  }
  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (this.moodGain && this.ctx) this.moodGain.gain.value = on ? 1 : 0;
  }

  // -------------------------------------------------------------------------
  // Music
  // -------------------------------------------------------------------------

  setMusic(mood: MusicMood, fade = 2) {
    if (this.mood === mood) return;
    this.mood = mood;
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    if (this.moodGain) {
      const old = this.moodGain;
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setValueAtTime(old.gain.value, ctx.currentTime);
      old.gain.linearRampToValueAtTime(0, ctx.currentTime + Math.max(0.05, fade));
      setTimeout(() => old.disconnect(), (fade + 0.3) * 1000);
    }
    if (mood === 'silence') {
      this.moodGain = null;
      return;
    }
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(this.musicEnabled ? 1 : 0, ctx.currentTime + Math.max(0.05, fade));
    g.connect(this.musicBus);
    this.moodGain = g;
    this.beat = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;
  }

  setMusicIntensity(v: number) {
    this.musicIntensity = Math.max(0, Math.min(1, v));
  }

  musicStinger(kind: 'reveal' | 'shock' | 'sad' | 'hope' = 'reveal') {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const spec = {
      reveal: { notes: [0, 7, 12], wave: 'triangle' as OscillatorType, dur: 2.4, gain: 0.18 },
      shock: { notes: [0, 1, 6], wave: 'sawtooth' as OscillatorType, dur: 1.6, gain: 0.22 },
      sad: { notes: [0, 3, 7], wave: 'sine' as OscillatorType, dur: 3, gain: 0.16 },
      hope: { notes: [0, 4, 9], wave: 'triangle' as OscillatorType, dur: 3, gain: 0.18 },
    }[kind];
    for (const n of spec.notes) {
      const osc = ctx.createOscillator();
      osc.type = spec.wave;
      osc.frequency.value = midiToFreq(n + (kind === 'shock' ? -12 : 0));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(spec.gain, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
      osc.connect(g);
      g.connect(this.musicBus);
      if (this.reverbSend) g.connect(this.reverbSend);
      osc.start(now);
      osc.stop(now + spec.dur + 0.05);
    }
  }

  /** Lookahead scheduler: queues notes slightly ahead of the audio clock. */
  private scheduleMusic() {
    if (!this.ctx || !this.moodGain || this.mood === 'silence') return;
    const ctx = this.ctx;
    const spec = MOODS[this.mood as Exclude<MusicMood, 'silence'>];
    const beatDur = 60 / BPM;
    const lookahead = 0.15;

    while (this.nextNoteTime < ctx.currentTime + lookahead) {
      const t = this.nextNoteTime;
      const bar = Math.floor(this.beat / 4) % spec.progression.length;
      const rootDegree = spec.progression[bar];
      const root = A_MINOR[rootDegree % 7] + (rootDegree >= 7 ? 12 : 0);
      const onBar = this.beat % 4 === 0;
      const inten = this.musicIntensity;

      // Pad: a sustained triad, refreshed each bar
      if (onBar && spec.padGain > 0) {
        for (const interval of [0, 3, 7, 10]) {
          for (const detuneSign of [-1, 1]) {
            const osc = ctx.createOscillator();
            osc.type = spec.padWave;
            osc.frequency.value = midiToFreq(root + interval);
            osc.detune.value = detuneSign * spec.detune;
            const filt = ctx.createBiquadFilter();
            filt.type = 'lowpass';
            filt.frequency.value = spec.brightness * (0.6 + inten * 0.8);
            filt.Q.value = 0.7;
            const g = ctx.createGain();
            const dur = beatDur * 4.2;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime((spec.padGain * (0.5 + inten * 0.5)) / 4, t + beatDur * 0.8);
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
            osc.connect(filt);
            filt.connect(g);
            g.connect(this.moodGain);
            if (this.reverbSend) g.connect(this.reverbSend);
            osc.start(t);
            osc.stop(t + dur + 0.05);
          }
        }
      }

      // Bass on the bar
      if (onBar && spec.bassGain > 0) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = midiToFreq(root - 24);
        const g = ctx.createGain();
        const dur = beatDur * 3.6;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(spec.bassGain * (0.5 + inten * 0.5), t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g);
        g.connect(this.moodGain);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      }

      // FM pluck on an irregular grid
      if (spec.pluckGain > 0 && this.beat % Math.max(1, Math.round(spec.pluckEvery)) === 0) {
        const degree = A_MINOR[(rootDegree + (this.beat % 3) * 2) % 7];
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = midiToFreq(degree + 12);
        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = midiToFreq(degree + 12) * 2;
        const modGain = ctx.createGain();
        modGain.gain.value = 220;
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        const g = ctx.createGain();
        const dur = beatDur * 2;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(spec.pluckGain * (0.35 + inten * 0.65), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        carrier.connect(g);
        g.connect(this.moodGain);
        if (this.reverbSend) g.connect(this.reverbSend);
        carrier.start(t);
        modulator.start(t);
        carrier.stop(t + dur + 0.05);
        modulator.stop(t + dur + 0.05);
      }

      // Driving pulse
      if (spec.pulseGain > 0 && inten > 0.3) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = midiToFreq(root - 12);
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 300 + inten * 900;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(spec.pulseGain * inten, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beatDur * 0.4);
        osc.connect(filt);
        filt.connect(g);
        g.connect(this.moodGain);
        osc.start(t);
        osc.stop(t + beatDur * 0.5);
      }

      this.beat++;
      this.nextNoteTime += beatDur;
    }
  }

  // -------------------------------------------------------------------------
  // Ambience
  // -------------------------------------------------------------------------

  setAmbience(kind: AmbienceKind, fade = 1.5) {
    if (this.ambienceKind === kind) return;
    this.ambienceKind = kind;
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const ctx = this.ctx;

    if (this.ambienceGain) {
      const old = this.ambienceGain;
      const dying = this.ambienceNodes;
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setValueAtTime(old.gain.value, ctx.currentTime);
      old.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
      setTimeout(() => {
        old.disconnect();
        for (const n of dying) {
          try {
            (n as AudioScheduledSourceNode).stop?.();
          } catch {
            // already stopped
          }
          n.disconnect();
        }
      }, (fade + 0.3) * 1000);
    }
    this.ambienceNodes = [];
    if (kind === 'none') {
      this.ambienceGain = null;
      return;
    }

    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.linearRampToValueAtTime(1, ctx.currentTime + fade);
    out.connect(this.master);
    this.ambienceGain = out;

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filt = ctx.createBiquadFilter();
    const level = ctx.createGain();

    switch (kind) {
      case 'rainStreet':
        filt.type = 'lowpass';
        filt.frequency.value = 5200;
        filt.Q.value = 0.6;
        level.gain.value = 0.34;
        break;
      case 'rainInterior':
        filt.type = 'lowpass';
        filt.frequency.value = 1400;
        filt.Q.value = 0.8;
        level.gain.value = 0.22;
        break;
      case 'roomTone':
        filt.type = 'lowpass';
        filt.frequency.value = 420;
        level.gain.value = 0.1;
        break;
      case 'rooftopWind':
        filt.type = 'bandpass';
        filt.frequency.value = 620;
        filt.Q.value = 1.4;
        level.gain.value = 0.24;
        break;
      case 'sirens':
        filt.type = 'bandpass';
        filt.frequency.value = 900;
        filt.Q.value = 3;
        level.gain.value = 0.08;
        break;
    }

    // Slow filter movement keeps the loop from sounding static
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = kind === 'rooftopWind' ? 0.08 : 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = filt.frequency.value * 0.25;
    lfo.connect(lfoGain);
    lfoGain.connect(filt.frequency);

    source.connect(filt);
    filt.connect(level);
    level.connect(out);
    source.start();
    lfo.start();
    this.ambienceNodes.push(source, lfo);
    this.setAmbienceIntensity(this.ambienceIntensity);
  }

  setAmbienceIntensity(v: number) {
    this.ambienceIntensity = Math.max(0, Math.min(1, v));
    if (this.ambienceGain && this.ctx) {
      this.ambienceGain.gain.setTargetAtTime(0.3 + this.ambienceIntensity * 0.7, this.ctx.currentTime, 0.4);
    }
  }

  // -------------------------------------------------------------------------
  // Sound effects
  // -------------------------------------------------------------------------

  play(name: SfxName, opts: { volume?: number; rate?: number; delay?: number } = {}) {
    if (!this.ctx || !this.sfxBus || this.liveVoices > 48) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const vol = (opts.volume ?? 1) * 0.9;
    const rate = opts.rate ?? 1;

    const tone = (
      freq: number,
      dur: number,
      wave: OscillatorType,
      gain: number,
      sweepTo?: number,
      wet = 0.2
    ) => {
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq * rate, t);
      if (sweepTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo * rate), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain * vol, t + Math.min(0.01, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.sfxBus!);
      if (this.reverbSend && wet > 0) {
        const send = ctx.createGain();
        send.gain.value = wet;
        g.connect(send);
        send.connect(this.reverbSend);
      }
      osc.start(t);
      osc.stop(t + dur + 0.05);
      this.liveVoices++;
      osc.onended = () => {
        this.liveVoices--;
        g.disconnect();
      };
    };

    const noise = (dur: number, gain: number, type: BiquadFilterType, freq: number, q = 1, wet = 0.25) => {
      if (!this.noiseBuffer) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = type;
      filt.frequency.value = freq;
      filt.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain * vol, t + Math.min(0.015, dur * 0.25));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.sfxBus!);
      if (this.reverbSend && wet > 0) {
        const send = ctx.createGain();
        send.gain.value = wet;
        g.connect(send);
        send.connect(this.reverbSend);
      }
      src.start(t);
      src.stop(t + dur + 0.05);
      this.liveVoices++;
      src.onended = () => {
        this.liveVoices--;
        g.disconnect();
      };
    };

    switch (name) {
      case 'uiHover': tone(1400, 0.06, 'sine', 0.05, 1700, 0.05); break;
      case 'uiSelect': tone(880, 0.1, 'triangle', 0.12, 1320); break;
      case 'uiBack': tone(660, 0.12, 'triangle', 0.1, 440); break;
      case 'uiTick': tone(2200, 0.03, 'square', 0.04, undefined, 0); break;
      case 'uiError': tone(220, 0.22, 'square', 0.1, 160); break;
      case 'scanOn': tone(500, 0.5, 'sine', 0.1, 1600, 0.4); break;
      case 'scanOff': tone(1600, 0.4, 'sine', 0.08, 400, 0.4); break;
      case 'scanPing': tone(1800, 0.3, 'sine', 0.09, 1800, 0.5); break;
      case 'clueFound': tone(1046, 0.35, 'triangle', 0.12, 1568, 0.45); break;
      case 'ledBlip': tone(2400, 0.05, 'sine', 0.06, undefined, 0.1); break;
      case 'glitch': noise(0.22, 0.24, 'bandpass', 1800, 6, 0.1); tone(120, 0.2, 'square', 0.1, 60, 0); break;
      case 'stress': tone(90, 0.7, 'sawtooth', 0.14, 70, 0.3); break;
      case 'heartbeat': tone(60, 0.16, 'sine', 0.3, 44, 0.1); tone(58, 0.14, 'sine', 0.2, 42, 0.1); break;
      case 'footstepConcrete': noise(0.1, 0.16, 'lowpass', 700, 1, 0.15); break;
      case 'footstepWood': noise(0.09, 0.14, 'bandpass', 380, 2, 0.2); break;
      case 'doorOpen': noise(0.6, 0.12, 'bandpass', 300, 3, 0.3); tone(180, 0.5, 'sawtooth', 0.05, 120, 0.3); break;
      case 'doorClose': noise(0.16, 0.24, 'lowpass', 240, 1, 0.3); break;
      case 'thunder': noise(2.4, 0.4, 'lowpass', 180, 0.7, 0.6); break;
      case 'gunshot': noise(0.34, 0.7, 'highpass', 900, 0.7, 0.5); tone(80, 0.3, 'square', 0.35, 40, 0.4); break;
      case 'impact': noise(0.2, 0.4, 'lowpass', 420, 1, 0.3); tone(70, 0.24, 'sine', 0.28, 45, 0.2); break;
      case 'glassBreak': noise(0.5, 0.3, 'highpass', 3200, 1.5, 0.4); break;
      case 'chairScrape': noise(0.45, 0.16, 'bandpass', 1100, 4, 0.25); break;
      case 'paperShuffle': noise(0.3, 0.1, 'highpass', 2600, 1, 0.2); break;
      case 'qtePrompt': tone(1320, 0.12, 'square', 0.1, 1760, 0.1); break;
      case 'qteSuccess': tone(880, 0.14, 'triangle', 0.14, 1320); tone(1320, 0.2, 'triangle', 0.1, 1760, 0.3); break;
      case 'qteFail': tone(300, 0.3, 'sawtooth', 0.16, 140); break;
      case 'choiceAppear': tone(700, 0.4, 'sine', 0.09, 1400, 0.4); break;
      case 'timerLow': tone(1760, 0.06, 'square', 0.07, undefined, 0); break;
      case 'whoosh': noise(0.5, 0.2, 'bandpass', 800, 1.2, 0.4); break;
      case 'cameraShutter': noise(0.06, 0.3, 'highpass', 2000, 1, 0.1); break;
      case 'notification': tone(1568, 0.16, 'sine', 0.1, 2093, 0.3); break;
    }
  }

  // -------------------------------------------------------------------------
  // Dialogue
  // -------------------------------------------------------------------------

  /**
   * Speaks a line. Uses SpeechSynthesis when enabled and voices exist, otherwise
   * synthesises a stylised vocalisation whose rhythm follows the sentence.
   */
  speak(text: string, profile: VoiceProfile, targetSeconds?: number): Promise<void> {
    this.stopSpeaking();
    const duration = targetSeconds ?? Math.max(1.2, text.split(/\s+/).length / 2.9);

    if (this.voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        return new Promise<void>((resolve) => {
          const utter = new SpeechSynthesisUtterance(text);
          utter.pitch = Math.max(0.1, Math.min(2, profile.pitch));
          utter.rate = Math.max(0.5, Math.min(2, profile.rate));
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            this.speaking = null;
            resolve();
          };
          utter.onend = finish;
          utter.onerror = finish;
          const guard = setTimeout(finish, (duration + 3) * 1000);
          this.speaking = {
            cancel: () => {
              clearTimeout(guard);
              window.speechSynthesis.cancel();
              finish();
            },
          };
          window.speechSynthesis.speak(utter);
        });
      }
    }

    if (!this.ctx || !this.voiceBus) {
      // Silent mode still has to preserve pacing
      return new Promise<void>((resolve) => {
        const id = setTimeout(resolve, duration * 1000);
        this.speaking = {
          cancel: () => {
            clearTimeout(id);
            resolve();
          },
        };
      });
    }

    const ctx = this.ctx;
    const start = ctx.currentTime + 0.02;
    const syllables = text.split(/\s+/).flatMap((w) => {
      const n = Math.max(1, Math.round(w.replace(/[^a-z]/gi, '').length / 2.6));
      return new Array(n).fill(w.length);
    });
    const questioning = text.trim().endsWith('?');
    const per = duration / Math.max(1, syllables.length);
    const baseFreq = { warm: 150, neutral: 170, bright: 250, synthetic: 190, gravel: 110 }[profile.timbre] * profile.pitch;
    const formant = { warm: 700, neutral: 900, bright: 1300, synthetic: 1100, gravel: 500 }[profile.timbre];

    for (let i = 0; i < syllables.length; i++) {
      const t = start + i * per;
      const progress = i / Math.max(1, syllables.length - 1);
      // Falls at the end of a statement, rises for a question
      const contour = questioning ? 1 + progress * 0.35 : 1.08 - progress * 0.22;
      const jitter = 0.94 + Math.random() * 0.12;
      const osc = ctx.createOscillator();
      osc.type = profile.timbre === 'gravel' ? 'sawtooth' : 'triangle';
      osc.frequency.value = baseFreq * contour * jitter;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = formant * (0.85 + Math.random() * 0.3);
      filt.Q.value = profile.timbre === 'synthetic' ? 6 : 2.4;
      const g = ctx.createGain();
      const dur = per * 0.72;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + dur * 0.2);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.connect(filt);
      filt.connect(g);
      g.connect(this.voiceBus);
      if ((profile.android ?? 0) > 0) {
        // Ring modulation gives the synthetic edge
        const ring = ctx.createOscillator();
        ring.type = 'square';
        ring.frequency.value = 90;
        const ringGain = ctx.createGain();
        ringGain.gain.value = (profile.android ?? 0) * 0.4;
        ring.connect(ringGain);
        ringGain.connect(g.gain);
        ring.start(t);
        ring.stop(t + dur + 0.05);
      }
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    return new Promise<void>((resolve) => {
      const id = setTimeout(resolve, duration * 1000);
      this.speaking = {
        cancel: () => {
          clearTimeout(id);
          resolve();
        },
      };
    });
  }

  stopSpeaking() {
    const s = this.speaking;
    this.speaking = null;
    s?.cancel();
  }

  /** Ducks music and ambience while dialogue plays. */
  duck(amount: number, seconds = 0.3) {
    if (!this.ctx) return;
    const target = Math.max(0, Math.min(1, amount));
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(0.5 * target, this.ctx.currentTime, seconds);
    if (this.ambienceGain) {
      this.ambienceGain.gain.setTargetAtTime(
        (0.3 + this.ambienceIntensity * 0.7) * Math.max(0.55, target),
        this.ctx.currentTime,
        seconds
      );
    }
  }

  update(_dt: number) {
    if (!this.ctx) return;
    this.scheduleMusic();
  }

  dispose() {
    this.stopSpeaking();
    this.setAmbience('none', 0.05);
    this.setMusic('silence', 0.05);
    try {
      void this.ctx?.close();
    } catch {
      // closing an already-closed context is harmless
    }
  }
}

export async function audioSelfTest(engine: AudioEngine): Promise<void> {
  const moods: MusicMood[] = ['menu', 'tension', 'melancholy', 'wonder', 'threat', 'chase', 'resolve'];
  for (const m of moods) {
    engine.setMusic(m, 0.4);
    engine.setMusicIntensity(0.8);
    await new Promise((r) => setTimeout(r, 1200));
  }
  engine.setAmbience('rainStreet', 0.4);
  await new Promise((r) => setTimeout(r, 800));
  engine.setAmbience('none', 0.3);
}
