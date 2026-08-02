import type { AudioEngine } from './AudioEngine';
import { Rng, freshRng } from '../core/Random';
import { clamp01 } from '../core/math';

/**
 * Original procedural score.
 *
 * The music is generated bar by bar by a look-ahead scheduler. Cues select a
 * key, tempo, chord plan, active instrument layers and which of the four
 * original leitmotifs (if any) is stated. No melody, harmony or rhythm here is
 * derived from any existing film score.
 *
 * Leitmotifs (all original):
 *   stolenLight  — 5, b6, 5, 4, 2 : a rising semitone that falls away again.
 *   ironWedge    — 1, 1, b2, 1, b7 : low march ostinato with downward gravity.
 *   smallCourage — 1, 3, 5, 6, 5 : light, skipping, played high and staccato.
 *   longFall     — open fifths with a suspended fourth resolving downward.
 */

const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

export type MotifName = 'stolenLight' | 'ironWedge' | 'smallCourage' | 'longFall' | 'none';

interface MotifDef {
  /** Scale-degree indices (may be negative for the octave below). */
  degrees: number[];
  /** Beat offsets, same length as `degrees`. */
  beats: number[];
  /** Note lengths in beats. */
  lengths: number[];
  octave: number;
  voice: 'brass' | 'strings' | 'pluck' | 'choir';
}

const MOTIFS: Record<Exclude<MotifName, 'none'>, MotifDef> = {
  stolenLight: {
    degrees: [4, 5, 4, 3, 1],
    beats: [0, 1.5, 2, 3, 4.5],
    lengths: [1.4, 0.45, 0.9, 1.4, 2.6],
    octave: 1,
    voice: 'strings',
  },
  ironWedge: {
    degrees: [0, 0, 1, 0, -1],
    beats: [0, 1, 2, 3, 4],
    lengths: [0.85, 0.85, 0.85, 0.85, 2.4],
    octave: -1,
    voice: 'brass',
  },
  smallCourage: {
    degrees: [0, 2, 4, 5, 4],
    beats: [0, 0.5, 1, 1.75, 2.25],
    lengths: [0.4, 0.4, 0.6, 0.4, 1.1],
    octave: 1,
    voice: 'pluck',
  },
  longFall: {
    degrees: [0, 4, 3, 2],
    beats: [0, 2, 5, 7],
    lengths: [2, 2.8, 1.8, 3.2],
    octave: 0,
    voice: 'choir',
  },
};

export interface MusicCue {
  id: string;
  tempo: number;
  /** MIDI note of the tonic. */
  root: number;
  mode: number[];
  /** Chord roots as scale-degree indices, one per bar (cycles). */
  progression: number[];
  motif: MotifName;
  /** Bars between motif statements. */
  motifEvery: number;
  layers: {
    drone?: number;
    pad?: number;
    brass?: number;
    perc?: number;
    choir?: number;
    pulse?: number;
    highStrings?: number;
  };
  /** Beats per bar. */
  meter: number;
  intensity: number;
}

export const CUES: Record<string, MusicCue> = {
  silence: {
    id: 'silence',
    tempo: 60,
    root: 45,
    mode: AEOLIAN,
    progression: [0],
    motif: 'none',
    motifEvery: 99,
    layers: {},
    meter: 4,
    intensity: 0,
  },
  prologue: {
    id: 'prologue',
    tempo: 58,
    root: 45,
    mode: AEOLIAN,
    progression: [0, 5, 3, 4],
    motif: 'longFall',
    motifEvery: 2,
    layers: { drone: 0.5, pad: 0.42, choir: 0.3, perc: 0.16 },
    meter: 4,
    intensity: 0.4,
  },
  wonder: {
    id: 'wonder',
    tempo: 54,
    root: 50,
    mode: DORIAN,
    progression: [0, 3, 5, 3],
    motif: 'longFall',
    motifEvery: 2,
    layers: { drone: 0.38, pad: 0.5, choir: 0.34, highStrings: 0.28 },
    meter: 4,
    intensity: 0.32,
  },
  pursuit: {
    id: 'pursuit',
    tempo: 138,
    root: 43,
    mode: AEOLIAN,
    progression: [0, 0, 5, 4],
    motif: 'stolenLight',
    motifEvery: 4,
    layers: { drone: 0.4, pad: 0.24, brass: 0.42, perc: 0.5, pulse: 0.36 },
    meter: 4,
    intensity: 0.78,
  },
  empire: {
    id: 'empire',
    tempo: 96,
    root: 41,
    mode: PHRYGIAN,
    progression: [0, 0, 1, 0],
    motif: 'ironWedge',
    motifEvery: 2,
    layers: { drone: 0.55, brass: 0.5, perc: 0.42, pulse: 0.2 },
    meter: 4,
    intensity: 0.85,
  },
  capture: {
    id: 'capture',
    tempo: 72,
    root: 41,
    mode: PHRYGIAN,
    progression: [0, 1, 0, 6],
    motif: 'ironWedge',
    motifEvery: 3,
    layers: { drone: 0.6, pad: 0.3, brass: 0.3, perc: 0.2 },
    meter: 4,
    intensity: 0.55,
  },
  boarding: {
    id: 'boarding',
    tempo: 124,
    root: 43,
    mode: AEOLIAN,
    progression: [0, 0, 6, 5],
    motif: 'none',
    motifEvery: 99,
    layers: { drone: 0.45, brass: 0.3, perc: 0.55, pulse: 0.42 },
    meter: 4,
    intensity: 0.8,
  },
  dread: {
    id: 'dread',
    tempo: 60,
    root: 39,
    mode: PHRYGIAN,
    progression: [0, 0, 1, 0],
    motif: 'ironWedge',
    motifEvery: 2,
    layers: { drone: 0.72, brass: 0.42, choir: 0.24, perc: 0.14 },
    meter: 4,
    intensity: 0.7,
  },
  resolve: {
    id: 'resolve',
    tempo: 78,
    root: 48,
    mode: AEOLIAN,
    progression: [0, 5, 3, 4],
    motif: 'stolenLight',
    motifEvery: 2,
    layers: { drone: 0.34, pad: 0.42, highStrings: 0.4, choir: 0.2 },
    meter: 4,
    intensity: 0.5,
  },
  escape: {
    id: 'escape',
    tempo: 132,
    root: 48,
    mode: DORIAN,
    progression: [0, 4, 5, 3],
    motif: 'smallCourage',
    motifEvery: 2,
    layers: { drone: 0.3, pad: 0.3, perc: 0.44, pulse: 0.4, highStrings: 0.3 },
    meter: 4,
    intensity: 0.72,
  },
  descent: {
    id: 'descent',
    tempo: 66,
    root: 50,
    mode: AEOLIAN,
    progression: [0, 3, 5, 0],
    motif: 'stolenLight',
    motifEvery: 2,
    layers: { drone: 0.36, pad: 0.5, choir: 0.4, highStrings: 0.34 },
    meter: 4,
    intensity: 0.45,
  },
  epilogue: {
    id: 'epilogue',
    tempo: 56,
    root: 45,
    mode: AEOLIAN,
    progression: [0, 5, 3, 0],
    motif: 'stolenLight',
    motifEvery: 2,
    layers: { drone: 0.42, pad: 0.44, choir: 0.36 },
    meter: 4,
    intensity: 0.38,
  },
};

const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

export class MusicEngine {
  private engine: AudioEngine;
  private out!: GainNode;
  private cue: MusicCue = CUES.silence;
  private nextCue: MusicCue | null = null;
  private bar = 0;
  private nextBarTime = 0;
  private running = false;
  private rng: Rng;
  private cueGain!: GainNode;
  private duckAmount = 1;
  private masterLevel = 1;

  constructor(engine: AudioEngine) {
    this.engine = engine;
    this.rng = freshRng('music');
  }

  init(): void {
    if (!this.engine.ready || this.out) return;
    const ctx = this.engine.ctx!;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.cueGain = ctx.createGain();
    this.cueGain.gain.value = 0;
    this.out.connect(this.cueGain);
    this.cueGain.connect(this.engine.buses.music);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    this.cueGain.connect(send);
    send.connect(this.engine.reverbSend);
  }

  get currentCue(): string {
    return this.cue.id;
  }

  /** Switch cue at the next bar line (or immediately when `hard`). */
  setCue(id: string, hard = false): void {
    const cue = CUES[id] ?? CUES.silence;
    if (cue.id === this.cue.id && !this.nextCue) return;
    if (hard || !this.running) {
      this.cue = cue;
      this.nextCue = null;
      this.bar = 0;
      if (this.engine.ready) this.nextBarTime = this.engine.currentTime + 0.05;
    } else {
      this.nextCue = cue;
    }
  }

  start(): void {
    if (!this.engine.ready) return;
    this.init();
    this.running = true;
    this.nextBarTime = this.engine.currentTime + 0.1;
    this.rng.reset();
  }

  stop(): void {
    this.running = false;
    if (this.cueGain && this.engine.ready) {
      this.cueGain.gain.setTargetAtTime(0, this.engine.currentTime, 0.2);
    }
  }

  /** Duck the score under narration (1 = no duck). */
  setDuck(v: number): void {
    this.duckAmount = clamp01(v);
  }

  setLevel(v: number): void {
    this.masterLevel = clamp01(v);
  }

  /** Reset the scheduler — used when the timeline is scrubbed. */
  reset(): void {
    this.bar = 0;
    this.rng.reset();
    if (this.engine.ready) this.nextBarTime = this.engine.currentTime + 0.05;
  }

  update(): void {
    if (!this.running || !this.engine.ready || !this.out) return;
    const ctx = this.engine.ctx!;
    const now = ctx.currentTime;
    const target = this.cue.id === 'silence' ? 0 : this.masterLevel * this.duckAmount;
    this.cueGain.gain.setTargetAtTime(target, now, 0.35);

    // Schedule up to 1.5 s ahead.
    let guard = 0;
    while (this.nextBarTime < now + 1.5 && guard++ < 8) {
      if (this.nextBarTime < now - 0.5) this.nextBarTime = now + 0.05;
      const beat = 60 / this.cue.tempo;
      const barLen = beat * this.cue.meter;
      if (this.cue.id !== 'silence') this.scheduleBar(this.nextBarTime, beat);
      this.nextBarTime += barLen;
      this.bar++;
      if (this.nextCue && this.bar % 2 === 0) {
        this.cue = this.nextCue;
        this.nextCue = null;
        this.bar = 0;
      }
    }
  }

  // -- synthesis -------------------------------------------------------------

  private scaleFreq(degree: number, octave = 0): number {
    const mode = this.cue.mode;
    const n = mode.length;
    let d = degree;
    let oct = octave;
    while (d < 0) {
      d += n;
      oct--;
    }
    while (d >= n) {
      d -= n;
      oct++;
    }
    return midiToFreq(this.cue.root + mode[d] + oct * 12);
  }

  private scheduleBar(t0: number, beat: number): void {
    const cue = this.cue;
    const chordDegree = cue.progression[this.bar % cue.progression.length];
    const L = cue.layers;
    const barLen = beat * cue.meter;

    if (L.drone) {
      this.drone(t0, barLen * 1.05, this.scaleFreq(chordDegree, -2), L.drone);
    }
    if (L.pad) {
      const chord = [chordDegree, chordDegree + 2, chordDegree + 4];
      for (let i = 0; i < chord.length; i++) {
        this.pad(t0 + i * 0.02, barLen * 1.02, this.scaleFreq(chord[i], i === 0 ? -1 : 0), L.pad / 1.6);
      }
    }
    if (L.choir) {
      const chord = [chordDegree, chordDegree + 4];
      for (const c of chord) this.choir(t0, barLen, this.scaleFreq(c, 1), L.choir / 1.5);
    }
    if (L.highStrings) {
      this.strings(t0, barLen * 0.98, this.scaleFreq(chordDegree + 4, 1), L.highStrings * 0.7);
    }
    if (L.brass) {
      // Rhythmic stabs on beats 1 and 3.
      for (const b of [0, 2]) {
        this.brass(t0 + b * beat, beat * 0.85, this.scaleFreq(chordDegree, -1), L.brass);
      }
    }
    if (L.pulse) {
      const div = cue.tempo > 110 ? 2 : 1;
      for (let i = 0; i < cue.meter * div; i++) {
        const accent = i % div === 0 ? 1 : 0.55;
        this.pulseNote(t0 + (i * beat) / div, beat / div, this.scaleFreq(chordDegree, -1), L.pulse * accent);
      }
    }
    if (L.perc) {
      this.timpani(t0, this.scaleFreq(chordDegree, -3), L.perc);
      if (cue.tempo > 100) {
        this.timpani(t0 + beat * 2, this.scaleFreq(chordDegree, -3) * 1.5, L.perc * 0.6);
        this.snareish(t0 + beat, L.perc * 0.34);
        this.snareish(t0 + beat * 3, L.perc * 0.34);
      }
      if (this.bar % 8 === 0) this.crash(t0, L.perc * 0.5);
    }

    if (cue.motif !== 'none' && this.bar % cue.motifEvery === 0) {
      this.playMotif(MOTIFS[cue.motif], t0, beat, chordDegree);
    }
  }

  private playMotif(m: MotifDef, t0: number, beat: number, chordDegree: number): void {
    for (let i = 0; i < m.degrees.length; i++) {
      const t = t0 + m.beats[i] * beat;
      const dur = m.lengths[i] * beat;
      const f = this.scaleFreq(chordDegree + m.degrees[i], m.octave);
      const g = 0.3 * this.cue.intensity + 0.12;
      switch (m.voice) {
        case 'brass':
          this.brass(t, dur, f, g);
          break;
        case 'strings':
          this.strings(t, dur, f, g * 0.9);
          break;
        case 'choir':
          this.choir(t, dur, f, g * 0.8);
          break;
        case 'pluck':
          this.pluck(t, dur, f, g);
          break;
      }
    }
  }

  private voiceOut(): GainNode {
    return this.out;
  }

  private drone(t: number, dur: number, freq: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain * 0.5, t + dur * 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    for (const [type, mul, amp] of [
      ['sine', 1, 1],
      ['triangle', 2.002, 0.35],
      ['sine', 0.5, 0.6],
    ] as Array<[OscillatorType, number, number]>) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * mul;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
    lp.connect(g);
    g.connect(this.voiceOut());
  }

  private pad(t: number, dur: number, freq: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);
    lp.Q.value = 0.9;
    for (const det of [-7, -2, 3, 8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq * Math.pow(2, det / 1200);
      const og = ctx.createGain();
      og.gain.value = 0.25;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
    lp.connect(g);
    g.connect(this.voiceOut());
  }

  private strings(t: number, dur: number, freq: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(0.35, dur * 0.3));
    g.gain.setValueAtTime(gain, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vibGain = ctx.createGain();
    vibGain.gain.value = freq * 0.006;
    vib.connect(vibGain);
    vib.start(t);
    vib.stop(t + dur + 0.2);
    for (const det of [-5, 0, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq * Math.pow(2, det / 1200);
      vibGain.connect(o.frequency);
      const og = ctx.createGain();
      og.gain.value = 0.34;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
    lp.connect(g);
    g.connect(this.voiceOut());
  }

  private brass(t: number, dur: number, freq: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.06);
    g.gain.linearRampToValueAtTime(gain * 0.72, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    // The filter sweep is what makes a saw stack read as brass.
    lp.frequency.setValueAtTime(freq * 2, t);
    lp.frequency.linearRampToValueAtTime(freq * 7.5, t + 0.09);
    lp.frequency.linearRampToValueAtTime(freq * 3.4, t + dur);
    lp.Q.value = 2.2;
    for (const [mul, amp] of [
      [1, 0.4],
      [1.005, 0.32],
      [2, 0.16],
      [3, 0.08],
    ] as Array<[number, number]>) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq * mul;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.15);
    }
    lp.connect(g);
    g.connect(this.voiceOut());
  }

  private choir(t: number, dur: number, freq: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.value = 640;
    formant1.Q.value = 5;
    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.value = 1180;
    formant2.Q.value = 7;
    const mix = ctx.createGain();
    for (const det of [-9, 0, 11]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq * Math.pow(2, det / 1200);
      const og = ctx.createGain();
      og.gain.value = 0.3;
      o.connect(og);
      og.connect(mix);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
    mix.connect(formant1);
    mix.connect(formant2);
    formant1.connect(g);
    formant2.connect(g);
    g.connect(this.voiceOut());
  }

  private pluck(t: number, dur: number, freq: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.12, dur));
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = freq * 2;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.16;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(freq * 8, t);
    lp.frequency.exponentialRampToValueAtTime(freq * 2, t + dur);
    o.connect(lp);
    o2.connect(o2g);
    o2g.connect(lp);
    lp.connect(g);
    g.connect(this.voiceOut());
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.2);
    o2.stop(t + dur + 0.2);
  }

  private pulseNote(t: number, dur: number, freq: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * 0.55, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.85);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    o.connect(lp);
    lp.connect(g);
    g.connect(this.voiceOut());
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  private timpani(t: number, freq: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.09);
    o.connect(g);
    const noise = this.engine.noiseSource();
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain * 0.4, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(this.voiceOut());
    noise.start(t);
    noise.stop(t + 0.2);
    g.connect(this.voiceOut());
    o.start(t);
    o.stop(t + 1.3);
  }

  private snareish(t: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const noise = this.engine.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    noise.connect(bp);
    bp.connect(g);
    g.connect(this.voiceOut());
    noise.start(t);
    noise.stop(t + 0.25);
  }

  private crash(t: number, gain: number): void {
    const ctx = this.engine.ctx!;
    const noise = this.engine.noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.voiceOut());
    noise.start(t);
    noise.stop(t + 2);
  }
}
