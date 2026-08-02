import type { MusicMood } from './AudioTypes';

/**
 * Original procedural score.
 *
 * A small look-ahead scheduler plays chords, a bass line, percussion and a
 * melodic cell drawn from mood-specific material. The motifs are written for
 * this project; nothing here quotes an existing film score.
 *
 * Instrument colours are synthesised: "brass" is a filtered saw stack with a
 * slow attack, "strings" are detuned saws through a gentle low-pass, "choir"
 * is a triangle pad, percussion is filtered noise plus a pitched thump.
 */

const A4 = 440;
const semitone = (n: number): number => A4 * Math.pow(2, (n - 9) / 12);

/** MIDI-ish note numbers relative to C4 = 0. */
function noteFreq(n: number): number {
  return semitone(n);
}

interface MoodSpec {
  /** Root offset in semitones from C. */
  root: number;
  /** Chord degrees (semitone offsets from root) per bar. */
  progression: number[][];
  bpm: number;
  /** Beats per bar. */
  meter: number;
  layers: {
    pad: number;
    bass: number;
    brass: number;
    perc: number;
    motif: number;
    ostinato: number;
  };
  motif: number[];
  motifRhythm: number[];
  ostinato: number[];
}

const MINOR = [0, 3, 7];
const MINOR7 = [0, 3, 7, 10];
const MAJOR = [0, 4, 7];
const MAJOR9 = [0, 4, 7, 14];
const SUS = [0, 5, 7];
const DIM = [0, 3, 6];

const MOODS: Record<MusicMood, MoodSpec> = {
  silence: {
    root: -12,
    progression: [MINOR],
    bpm: 50,
    meter: 4,
    layers: { pad: 0, bass: 0, brass: 0, perc: 0, motif: 0, ostinato: 0 },
    motif: [],
    motifRhythm: [],
    ostinato: [],
  },
  void: {
    root: -17,
    progression: [MINOR, MINOR, SUS, MINOR],
    bpm: 46,
    meter: 4,
    layers: { pad: 0.5, bass: 0.55, brass: 0.05, perc: 0, motif: 0, ostinato: 0 },
    motif: [],
    motifRhythm: [],
    ostinato: [],
  },
  wonder: {
    root: -10,
    progression: [MAJOR9, SUS, MAJOR, [0, 5, 9]],
    bpm: 52,
    meter: 4,
    layers: { pad: 0.62, bass: 0.4, brass: 0.16, perc: 0, motif: 0.5, ostinato: 0 },
    // Rising, open, unhurried — the "distance" cell.
    motif: [0, 7, 9, 12, 9, 7],
    motifRhythm: [2, 1, 1, 2, 1, 1],
    ostinato: [],
  },
  chase: {
    root: -14,
    progression: [MINOR, MINOR, [0, 3, 8], MINOR],
    bpm: 138,
    meter: 4,
    layers: { pad: 0.3, bass: 0.7, brass: 0.42, perc: 0.6, motif: 0.28, ostinato: 0.6 },
    motif: [12, 10, 7, 10, 12, 15],
    motifRhythm: [1, 1, 2, 1, 1, 2],
    ostinato: [0, 0, 3, 0, 7, 0, 3, 0],
  },
  battle: {
    root: -14,
    progression: [MINOR, [0, 3, 8], DIM, MINOR7],
    bpm: 152,
    meter: 4,
    layers: { pad: 0.26, bass: 0.8, brass: 0.7, perc: 0.85, motif: 0.42, ostinato: 0.72 },
    motif: [12, 13, 12, 8, 7, 3],
    motifRhythm: [1, 1, 1, 1, 2, 2],
    ostinato: [0, 0, 1, 0, 5, 0, 1, 0],
  },
  capture: {
    root: -16,
    progression: [MINOR, SUS, MINOR7, DIM],
    bpm: 62,
    meter: 4,
    layers: { pad: 0.6, bass: 0.62, brass: 0.36, perc: 0.2, motif: 0.2, ostinato: 0 },
    motif: [0, -2, -5, -2],
    motifRhythm: [3, 1, 3, 1],
    ostinato: [],
  },
  siege: {
    root: -16,
    progression: [MINOR, MINOR, DIM, [0, 3, 8]],
    bpm: 84,
    meter: 4,
    layers: { pad: 0.44, bass: 0.6, brass: 0.28, perc: 0.4, motif: 0.14, ostinato: 0.3 },
    motif: [0, 3, 2, 0],
    motifRhythm: [2, 1, 1, 4],
    ostinato: [0, 0, 0, 0, 3, 0, 0, 0],
  },
  menace: {
    root: -19,
    progression: [MINOR, [0, 1, 8], MINOR, DIM],
    bpm: 54,
    meter: 4,
    layers: { pad: 0.5, bass: 0.85, brass: 0.72, perc: 0.34, motif: 0.5, ostinato: 0 },
    // Low, descending, chromatic. Four notes, always the same, always slower.
    motif: [0, -1, -3, -4],
    motifRhythm: [2, 2, 2, 6],
    ostinato: [],
  },
  tender: {
    root: -12,
    progression: [MINOR7, [0, 5, 8], MAJOR, SUS],
    bpm: 58,
    meter: 4,
    layers: { pad: 0.62, bass: 0.36, brass: 0.08, perc: 0, motif: 0.56, ostinato: 0 },
    motif: [7, 5, 3, 5, 7, 10],
    motifRhythm: [2, 1, 1, 2, 1, 1],
    ostinato: [],
  },
  resolve: {
    root: -12,
    progression: [MINOR, [0, 5, 9], MAJOR, [0, 4, 9]],
    bpm: 96,
    meter: 4,
    layers: { pad: 0.5, bass: 0.62, brass: 0.5, perc: 0.42, motif: 0.6, ostinato: 0.3 },
    motif: [0, 5, 7, 12, 10, 7],
    motifRhythm: [1, 1, 2, 2, 1, 1],
    ostinato: [0, 7, 0, 7, 3, 7, 0, 7],
  },
  hope: {
    root: -10,
    progression: [MAJOR, SUS, MAJOR9, [0, 5, 9]],
    bpm: 68,
    meter: 4,
    layers: { pad: 0.66, bass: 0.44, brass: 0.4, perc: 0.12, motif: 0.72, ostinato: 0 },
    // The closing cell: same shape as "wonder", opened out a step.
    motif: [0, 7, 12, 14, 12, 7, 9],
    motifRhythm: [2, 1, 2, 1, 1, 1, 4],
    ostinato: [],
  },
};

export class MusicEngine {
  private ctx: AudioContext;
  private out: GainNode;
  private noise: AudioBuffer;
  private mood: MusicMood = 'silence';
  private targetIntensity = 0;
  private intensity = 0;
  private nextBeatTime = 0;
  private beat = 0;
  private bar = 0;
  private running = false;
  private convolver: ConvolverNode | null = null;
  private wet: GainNode;
  private dry: GainNode;

  constructor(ctx: AudioContext, destination: AudioNode, noise: AudioBuffer) {
    this.ctx = ctx;
    this.noise = noise;
    this.out = ctx.createGain();
    this.out.gain.value = 1;

    // A short synthetic hall keeps the orchestra from sounding boxed in.
    this.wet = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet.gain.value = 0.32;
    this.dry.gain.value = 0.85;
    this.out.connect(this.dry).connect(destination);
    try {
      this.convolver = ctx.createConvolver();
      this.convolver.buffer = makeImpulse(ctx, 2.6, 2.4);
      this.out.connect(this.convolver).connect(this.wet).connect(destination);
    } catch {
      this.convolver = null;
    }
  }

  setMood(mood: MusicMood, intensity: number): void {
    if (mood !== this.mood) {
      this.mood = mood;
      this.bar = 0;
      this.beat = 0;
      this.nextBeatTime = Math.max(this.nextBeatTime, this.ctx.currentTime + 0.05);
    }
    this.targetIntensity = Math.max(0, Math.min(1.2, intensity));
    this.running = true;
  }

  stop(): void {
    this.running = false;
    this.targetIntensity = 0;
  }

  /** Called from the main loop; schedules ahead of the audio clock. */
  update(): void {
    if (!this.running) return;
    const now = this.ctx.currentTime;
    this.intensity += (this.targetIntensity - this.intensity) * 0.02;
    const spec = MOODS[this.mood];
    const beatDur = 60 / spec.bpm;
    if (this.nextBeatTime < now) this.nextBeatTime = now + 0.06;
    while (this.nextBeatTime < now + 0.35) {
      this.scheduleBeat(spec, this.nextBeatTime, beatDur);
      this.nextBeatTime += beatDur;
      this.beat++;
      if (this.beat % spec.meter === 0) this.bar++;
    }
  }

  private scheduleBeat(spec: MoodSpec, time: number, beatDur: number): void {
    const g = this.intensity;
    if (g < 0.02) return;
    const beatInBar = this.beat % spec.meter;
    const chord = spec.progression[this.bar % spec.progression.length];
    const root = spec.root;

    // Pad / strings on the downbeat, sustained through the bar.
    if (beatInBar === 0 && spec.layers.pad > 0) {
      for (const iv of chord) {
        this.strings(noteFreq(root + 12 + iv), time, beatDur * spec.meter * 1.02, spec.layers.pad * g * 0.16);
      }
    }
    // Bass.
    if (spec.layers.bass > 0 && (beatInBar === 0 || (spec.bpm > 100 && beatInBar % 2 === 0))) {
      this.bassNote(noteFreq(root - 12), time, beatDur * (spec.bpm > 100 ? 0.9 : 3.2), spec.layers.bass * g * 0.3);
    }
    // Brass stabs.
    if (spec.layers.brass > 0 && (beatInBar === 0 || (g > 0.7 && beatInBar === 2))) {
      for (const iv of chord.slice(0, 3)) {
        this.brass(noteFreq(root + iv), time + 0.01, beatDur * 1.6, spec.layers.brass * g * 0.13);
      }
    }
    // Percussion.
    if (spec.layers.perc > 0) {
      if (beatInBar === 0) this.drum(time, 78, 0.5, spec.layers.perc * g * 0.5);
      if (spec.bpm > 100 && beatInBar === 2) this.drum(time, 62, 0.42, spec.layers.perc * g * 0.36);
      if (spec.bpm > 130 && beatInBar % 2 === 1) this.snare(time, spec.layers.perc * g * 0.18);
    }
    // Driving ostinato, one note per eighth.
    if (spec.layers.ostinato > 0 && spec.ostinato.length) {
      for (let half = 0; half < 2; half++) {
        const idx = (this.beat * 2 + half) % spec.ostinato.length;
        const n = spec.ostinato[idx];
        this.pluck(
          noteFreq(root + n),
          time + half * beatDur * 0.5,
          beatDur * 0.42,
          spec.layers.ostinato * g * 0.1,
        );
      }
    }
    // Melodic cell, one bar in every two.
    if (spec.layers.motif > 0 && spec.motif.length && this.bar % 2 === 0 && beatInBar === 0) {
      let cursor = 0;
      const unit = beatDur * 0.5;
      for (let i = 0; i < spec.motif.length; i++) {
        const dur = spec.motifRhythm[i] * unit;
        this.lead(
          noteFreq(root + 12 + spec.motif[i]),
          time + cursor,
          dur * 0.95,
          spec.layers.motif * g * 0.13,
          spec.bpm < 80,
        );
        cursor += dur;
      }
    }
  }

  /* ------------------------------------------------------- instruments */

  private strings(freq: number, time: number, dur: number, gain: number): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + dur * 0.32);
    g.gain.setValueAtTime(gain, time + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    filter.Q.value = 0.6;
    for (const detune of [-7, 0, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = detune;
      o.start(time);
      o.stop(time + dur + 0.1);
      o.connect(filter);
    }
    filter.connect(g).connect(this.out);
  }

  private brass(freq: number, time: number, dur: number, gain: number): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.09);
    g.gain.exponentialRampToValueAtTime(gain * 0.55, time + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, time);
    filter.frequency.exponentialRampToValueAtTime(2800, time + 0.12);
    filter.frequency.exponentialRampToValueAtTime(900, time + dur);
    filter.Q.value = 2.2;
    for (const [detune, type] of [
      [-5, 'sawtooth'],
      [4, 'sawtooth'],
      [0, 'square'],
    ] as Array<[number, OscillatorType]>) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.start(time);
      o.stop(time + dur + 0.1);
      o.connect(filter);
    }
    filter.connect(g).connect(this.out);
  }

  private lead(freq: number, time: number, dur: number, gain: number, soft: boolean): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + (soft ? 0.14 : 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = soft ? 2200 : 3400;
    const o = ctx.createOscillator();
    o.type = soft ? 'triangle' : 'sawtooth';
    o.frequency.value = freq;
    o.start(time);
    o.stop(time + dur + 0.1);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    o2.detune.value = 4;
    o2.start(time);
    o2.stop(time + dur + 0.1);
    const g2 = ctx.createGain();
    g2.gain.value = 0.28;
    o.connect(filter);
    o2.connect(g2).connect(filter);
    filter.connect(g).connect(this.out);
  }

  private bassNote(freq: number, time: number, dur: number, gain: number): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    o.start(time);
    o.stop(time + dur + 0.1);
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2;
    o2.start(time);
    o2.stop(time + dur + 0.1);
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.out);
  }

  private pluck(freq: number, time: number, dur: number, gain: number): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    o.start(time);
    o.stop(time + dur + 0.05);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    o.connect(f).connect(g).connect(this.out);
  }

  private drum(time: number, freq: number, dur: number, gain: number): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 2.1, time);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, time + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.start(time);
    o.stop(time + dur + 0.05);
    o.connect(g).connect(this.out);
  }

  private snare(time: number, gain: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.17);
    src.start(time, 0.3, 0.25);
    src.stop(time + 0.25);
    src.connect(f).connect(g).connect(this.out);
  }
}

function makeImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  let seed = 0x1a2b3c4d;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}
