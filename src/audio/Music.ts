import type { AudioEngine } from './AudioEngine';
import { applyEnvelope, note } from './dsp';
import { clamp } from '../core/mathx';

/**
 * Original score for "Starfall".
 *
 * The language is space-opera - synthesised brass, sustained strings, timpani
 * and low choir-like pads - but every melody, harmony and rhythmic figure here
 * was written for this project. Three motifs recur:
 *
 *   COURIER  a rising four-note figure in D natural minor, for the corvette and
 *            the plans. Deliberately steps rather than leaps.
 *   IRON     a low chromatic descent with a tritone at its centre, for the
 *            Empire. Slow, even, no dotted-march rhythm.
 *   EMBER    a quiet, hopeful cadence used only twice: once when the plans are
 *            copied, once as the pod falls.
 *
 * The scheduler runs on a lookahead window driven by the master timeline, so
 * seeking simply re-arms the cursor and no note is ever played twice.
 */

type Instrument = 'brass' | 'strings' | 'lowStrings' | 'pad' | 'bell' | 'timpani' | 'perc' | 'choir' | 'pluck';

interface ScoreNote {
  /** Beats from the start of the cue. */
  beat: number;
  /** Length in beats. */
  length: number;
  /** Frequency, or an array for a chord. */
  freq: number | number[];
  instrument: Instrument;
  gain?: number;
}

interface Cue {
  id: string;
  start: number;
  end: number;
  bpm: number;
  /** Repeat the pattern until the cue ends. */
  loopBeats?: number;
  notes: ScoreNote[];
  /** Overall level for the cue. */
  level?: number;
  /** Sustained drone pitches for the whole cue. */
  drone?: number[];
  droneLevel?: number;
}

const D = {
  D2: note('D2'), E2: note('E2'), F2: note('F2'), G2: note('G2'), A2: note('A2'), Bb2: note('Bb2'), C3: note('C3'),
  D3: note('D3'), E3: note('E3'), F3: note('F3'), G3: note('G3'), A3: note('A3'), Bb3: note('Bb3'), C4: note('C4'),
  D4: note('D4'), E4: note('E4'), F4: note('F4'), G4: note('G4'), A4: note('A4'), Bb4: note('Bb4'), C5: note('C5'),
  D5: note('D5'), F5: note('F5'), A5: note('A5'), D6: note('D6'),
  Ab3: note('Ab3'), Ab2: note('Ab2'), Ab1: note('Ab1'), D1: note('D1'), A1: note('A1'), F1: note('F1'), Bb1: note('Bb1'), C2: note('C2'),
  Gs3: note('G#3'), Cs4: note('C#4'), Eb3: note('Eb3'), Eb4: note('Eb4'),
};

/** COURIER: D - F - G - A, rising, then falling back to F. */
function courier(beat: number, octave = 0, instrument: Instrument = 'strings', gain = 1): ScoreNote[] {
  const m = Math.pow(2, octave);
  return [
    { beat: beat + 0, length: 1, freq: D.D4 * m, instrument, gain },
    { beat: beat + 1, length: 1, freq: D.F4 * m, instrument, gain },
    { beat: beat + 2, length: 1, freq: D.G4 * m, instrument, gain },
    { beat: beat + 3, length: 2, freq: D.A4 * m, instrument, gain },
    { beat: beat + 5, length: 3, freq: D.F4 * m, instrument, gain: gain * 0.85 },
  ];
}

/** IRON: D - C - Ab - C, low and even. The Ab against D is the tritone. */
function iron(beat: number, instrument: Instrument = 'brass', gain = 1): ScoreNote[] {
  return [
    { beat: beat + 0, length: 1.5, freq: [D.D2, D.D3], instrument, gain },
    { beat: beat + 2, length: 1.5, freq: [D.C2, D.C3], instrument, gain },
    { beat: beat + 4, length: 2, freq: [D.Ab1, D.Ab2], instrument, gain: gain * 1.1 },
    { beat: beat + 6, length: 2, freq: [D.C2, D.C3], instrument, gain: gain * 0.9 },
  ];
}

/** EMBER: a quiet plagal lift, Bb - C - D. */
function ember(beat: number, instrument: Instrument = 'strings', gain = 1): ScoreNote[] {
  return [
    { beat: beat + 0, length: 2, freq: [D.Bb3, D.D4, D.F4], instrument, gain },
    { beat: beat + 2, length: 2, freq: [D.C4, D.E4, D.G4], instrument, gain },
    { beat: beat + 4, length: 4, freq: [D.D4, D.F4, D.A4], instrument, gain: gain * 1.1 },
  ];
}

function buildScore(): Cue[] {
  return [
    // --- Prologue: almost nothing. A drone and three bells. ----------------
    {
      id: 'void',
      start: 0.5,
      end: 46,
      bpm: 48,
      level: 0.55,
      drone: [D.D1, D.D2, D.A2],
      droneLevel: 0.34,
      notes: [
        { beat: 2, length: 6, freq: D.D5, instrument: 'bell', gain: 0.5 },
        { beat: 10, length: 6, freq: D.A4, instrument: 'bell', gain: 0.42 },
        { beat: 18, length: 8, freq: D.F4, instrument: 'bell', gain: 0.38 },
        ...courier(20, 0, 'pad', 0.3),
        { beat: 26, length: 8, freq: [D.D3, D.A3, D.D4], instrument: 'choir', gain: 0.3 },
        { beat: 30, length: 4, freq: D.D5, instrument: 'bell', gain: 0.35 },
      ],
    },

    // --- Tatooine: warm, wide, unhurried. ----------------------------------
    {
      id: 'wonder',
      start: 46,
      end: 86,
      bpm: 54,
      level: 0.62,
      drone: [D.D2, D.A2, D.D3],
      droneLevel: 0.26,
      notes: [
        { beat: 0, length: 8, freq: [D.D3, D.F3, D.A3], instrument: 'pad', gain: 0.5 },
        ...courier(4, 0, 'strings', 0.55),
        { beat: 12, length: 8, freq: [D.Bb2, D.D3, D.F3], instrument: 'pad', gain: 0.45 },
        ...courier(16, 0, 'brass', 0.32),
        { beat: 22, length: 6, freq: [D.C3, D.E3, D.G3], instrument: 'pad', gain: 0.42 },
        { beat: 24, length: 4, freq: D.A4, instrument: 'strings', gain: 0.42 },
        { beat: 28, length: 6, freq: [D.D3, D.A3, D.D4], instrument: 'pad', gain: 0.5 },
        { beat: 30, length: 3, freq: D.D5, instrument: 'bell', gain: 0.24 },
      ],
    },

    // --- Pursuit: an eight-beat ostinato under rising brass. ---------------
    {
      id: 'pursuit-a',
      start: 86,
      end: 118,
      bpm: 132,
      level: 0.62,
      loopBeats: 8,
      drone: [D.D2],
      droneLevel: 0.2,
      notes: [
        { beat: 0, length: 0.5, freq: D.D3, instrument: 'lowStrings', gain: 0.55 },
        { beat: 1, length: 0.5, freq: D.D3, instrument: 'lowStrings', gain: 0.4 },
        { beat: 1.5, length: 0.5, freq: D.F3, instrument: 'lowStrings', gain: 0.45 },
        { beat: 2.5, length: 0.5, freq: D.D3, instrument: 'lowStrings', gain: 0.4 },
        { beat: 3, length: 0.5, freq: D.E3, instrument: 'lowStrings', gain: 0.45 },
        { beat: 4, length: 0.5, freq: D.D3, instrument: 'lowStrings', gain: 0.55 },
        { beat: 5, length: 0.5, freq: D.C3, instrument: 'lowStrings', gain: 0.4 },
        { beat: 5.5, length: 0.5, freq: D.D3, instrument: 'lowStrings', gain: 0.45 },
        { beat: 6.5, length: 1.5, freq: D.Bb2, instrument: 'lowStrings', gain: 0.5 },
        { beat: 0, length: 0.3, freq: 0, instrument: 'perc', gain: 0.4 },
        { beat: 2, length: 0.3, freq: 0, instrument: 'perc', gain: 0.22 },
        { beat: 4, length: 0.3, freq: 0, instrument: 'perc', gain: 0.36 },
        { beat: 6, length: 0.3, freq: 0, instrument: 'perc', gain: 0.24 },
        { beat: 0, length: 1, freq: D.D2, instrument: 'timpani', gain: 0.5 },
        { beat: 4, length: 1, freq: D.A2, instrument: 'timpani', gain: 0.36 },
      ],
    },
    {
      id: 'pursuit-iron',
      start: 100,
      end: 132,
      bpm: 132,
      level: 0.58,
      loopBeats: 16,
      notes: [
        ...iron(0, 'brass', 0.62),
        ...iron(8, 'brass', 0.5),
        { beat: 0, length: 1, freq: D.D2, instrument: 'timpani', gain: 0.55 },
        { beat: 8, length: 1, freq: D.Ab1, instrument: 'timpani', gain: 0.5 },
      ],
    },
    {
      id: 'pursuit-b',
      start: 118,
      end: 158,
      bpm: 138,
      level: 0.66,
      loopBeats: 8,
      drone: [D.D2, D.Ab2],
      droneLevel: 0.22,
      notes: [
        { beat: 0, length: 0.5, freq: D.D3, instrument: 'lowStrings', gain: 0.6 },
        { beat: 0.75, length: 0.4, freq: D.D3, instrument: 'lowStrings', gain: 0.42 },
        { beat: 1.5, length: 0.5, freq: D.Eb3, instrument: 'lowStrings', gain: 0.5 },
        { beat: 2.25, length: 0.4, freq: D.D3, instrument: 'lowStrings', gain: 0.4 },
        { beat: 3, length: 0.5, freq: D.F3, instrument: 'lowStrings', gain: 0.52 },
        { beat: 4, length: 0.5, freq: D.D3, instrument: 'lowStrings', gain: 0.6 },
        { beat: 5, length: 0.5, freq: D.Ab2, instrument: 'lowStrings', gain: 0.55 },
        { beat: 6, length: 2, freq: D.G2, instrument: 'lowStrings', gain: 0.5 },
        { beat: 0, length: 0.3, freq: 0, instrument: 'perc', gain: 0.45 },
        { beat: 1.5, length: 0.3, freq: 0, instrument: 'perc', gain: 0.24 },
        { beat: 3, length: 0.3, freq: 0, instrument: 'perc', gain: 0.4 },
        { beat: 4.5, length: 0.3, freq: 0, instrument: 'perc', gain: 0.24 },
        { beat: 6, length: 0.3, freq: 0, instrument: 'perc', gain: 0.38 },
        { beat: 0, length: 1, freq: D.D2, instrument: 'timpani', gain: 0.6 },
        { beat: 3, length: 1, freq: D.D2, instrument: 'timpani', gain: 0.32 },
        { beat: 6, length: 1, freq: D.Ab1, instrument: 'timpani', gain: 0.44 },
        { beat: 0, length: 3, freq: [D.D4, D.F4, D.A4], instrument: 'brass', gain: 0.3 },
        { beat: 4, length: 3, freq: [D.C4, D.Eb4, D.G4], instrument: 'brass', gain: 0.28 },
      ],
    },

    // --- Capture: everything stops but the low end. ------------------------
    {
      id: 'capture',
      start: 158,
      end: 196,
      bpm: 46,
      level: 0.6,
      drone: [D.D1, D.D2, D.Ab2],
      droneLevel: 0.4,
      notes: [
        { beat: 0, length: 2, freq: D.D2, instrument: 'timpani', gain: 0.6 },
        ...iron(2, 'brass', 0.5),
        { beat: 10, length: 8, freq: [D.D3, D.Ab3, D.D4], instrument: 'choir', gain: 0.36 },
        { beat: 14, length: 2, freq: D.D2, instrument: 'timpani', gain: 0.42 },
        { beat: 18, length: 8, freq: [D.Bb2, D.D3, D.F3], instrument: 'pad', gain: 0.34 },
        { beat: 22, length: 2, freq: D.Ab1, instrument: 'timpani', gain: 0.36 },
      ],
    },

    // --- Boarding: military percussion and short, hard brass. --------------
    {
      id: 'boarding',
      start: 196,
      end: 240,
      bpm: 108,
      level: 0.58,
      loopBeats: 8,
      drone: [D.D2],
      droneLevel: 0.18,
      notes: [
        { beat: 0, length: 0.25, freq: 0, instrument: 'perc', gain: 0.5 },
        { beat: 0.5, length: 0.25, freq: 0, instrument: 'perc', gain: 0.2 },
        { beat: 1, length: 0.25, freq: 0, instrument: 'perc', gain: 0.32 },
        { beat: 2, length: 0.25, freq: 0, instrument: 'perc', gain: 0.5 },
        { beat: 3, length: 0.25, freq: 0, instrument: 'perc', gain: 0.28 },
        { beat: 4, length: 0.25, freq: 0, instrument: 'perc', gain: 0.5 },
        { beat: 5.5, length: 0.25, freq: 0, instrument: 'perc', gain: 0.24 },
        { beat: 6, length: 0.25, freq: 0, instrument: 'perc', gain: 0.42 },
        { beat: 0, length: 1.5, freq: [D.D3, D.A3], instrument: 'brass', gain: 0.34 },
        { beat: 4, length: 1.5, freq: [D.C3, D.G3], instrument: 'brass', gain: 0.3 },
        { beat: 0, length: 1, freq: D.D2, instrument: 'timpani', gain: 0.45 },
      ],
    },

    // --- Vader: IRON, slow, enormous. --------------------------------------
    {
      id: 'iron-entrance',
      start: 240,
      end: 262,
      bpm: 52,
      level: 0.72,
      drone: [D.D1, D.Ab1],
      droneLevel: 0.42,
      notes: [
        { beat: 0, length: 2, freq: D.D1, instrument: 'timpani', gain: 0.75 },
        ...iron(1, 'brass', 0.8),
        { beat: 8, length: 6, freq: [D.D2, D.Ab2, D.D3], instrument: 'choir', gain: 0.42 },
        ...iron(9, 'brass', 0.62),
        { beat: 16, length: 6, freq: [D.D2, D.Ab2, D.D3], instrument: 'choir', gain: 0.38 },
      ],
    },

    // --- The plans: quiet, close, hopeful. ---------------------------------
    {
      id: 'plans',
      start: 262,
      end: 288,
      bpm: 62,
      level: 0.5,
      drone: [D.D2, D.A2],
      droneLevel: 0.2,
      notes: [
        { beat: 0, length: 6, freq: [D.D3, D.F3, D.A3], instrument: 'pad', gain: 0.4 },
        { beat: 2, length: 1, freq: D.D5, instrument: 'pluck', gain: 0.3 },
        { beat: 3, length: 1, freq: D.F5, instrument: 'pluck', gain: 0.26 },
        { beat: 4, length: 1, freq: D.A5, instrument: 'pluck', gain: 0.3 },
        ...courier(6, 0, 'strings', 0.42),
        { beat: 14, length: 6, freq: [D.Bb2, D.D3, D.F3], instrument: 'pad', gain: 0.36 },
        { beat: 16, length: 1, freq: D.D6, instrument: 'bell', gain: 0.2 },
        { beat: 20, length: 6, freq: [D.C3, D.E3, D.G3], instrument: 'pad', gain: 0.34 },
      ],
    },
    {
      id: 'transfer',
      start: 288,
      end: 306,
      bpm: 62,
      level: 0.58,
      drone: [D.D2, D.A2, D.D3],
      droneLevel: 0.24,
      notes: [
        ...ember(0, 'strings', 0.46),
        { beat: 0, length: 1, freq: D.D5, instrument: 'pluck', gain: 0.24 },
        { beat: 1.5, length: 1, freq: D.A5, instrument: 'pluck', gain: 0.2 },
        { beat: 3, length: 1, freq: D.F5, instrument: 'pluck', gain: 0.22 },
        ...courier(8, 0, 'brass', 0.34),
        { beat: 14, length: 4, freq: [D.D3, D.A3, D.D4], instrument: 'choir', gain: 0.3 },
      ],
    },

    // --- Escape: urgency resolving into release. ---------------------------
    {
      id: 'escape',
      start: 306,
      end: 330,
      bpm: 124,
      level: 0.62,
      loopBeats: 8,
      drone: [D.D2],
      droneLevel: 0.2,
      notes: [
        { beat: 0, length: 0.5, freq: D.D4, instrument: 'pluck', gain: 0.3 },
        { beat: 0.5, length: 0.5, freq: D.F4, instrument: 'pluck', gain: 0.26 },
        { beat: 1, length: 0.5, freq: D.A4, instrument: 'pluck', gain: 0.28 },
        { beat: 1.5, length: 0.5, freq: D.G4, instrument: 'pluck', gain: 0.24 },
        { beat: 2, length: 0.5, freq: D.F4, instrument: 'pluck', gain: 0.26 },
        { beat: 2.5, length: 0.5, freq: D.D4, instrument: 'pluck', gain: 0.28 },
        { beat: 3, length: 0.5, freq: D.E4, instrument: 'pluck', gain: 0.24 },
        { beat: 3.5, length: 0.5, freq: D.F4, instrument: 'pluck', gain: 0.26 },
        { beat: 0, length: 4, freq: [D.D3, D.A3], instrument: 'lowStrings', gain: 0.34 },
        { beat: 4, length: 4, freq: [D.Bb2, D.F3], instrument: 'lowStrings', gain: 0.32 },
        { beat: 0, length: 0.3, freq: 0, instrument: 'perc', gain: 0.3 },
        { beat: 4, length: 0.3, freq: 0, instrument: 'perc', gain: 0.28 },
        { beat: 0, length: 1, freq: D.D2, instrument: 'timpani', gain: 0.34 },
      ],
    },
    {
      id: 'release',
      start: 330,
      end: 356,
      bpm: 60,
      level: 0.68,
      drone: [D.D2, D.A2, D.D3],
      droneLevel: 0.28,
      notes: [
        ...courier(0, 0, 'brass', 0.5),
        { beat: 0, length: 8, freq: [D.D3, D.F3, D.A3], instrument: 'pad', gain: 0.45 },
        { beat: 8, length: 8, freq: [D.Bb2, D.D3, D.F3], instrument: 'pad', gain: 0.42 },
        ...courier(8, 0, 'strings', 0.46),
        { beat: 16, length: 8, freq: [D.C3, D.G3, D.C4], instrument: 'pad', gain: 0.4 },
        { beat: 16, length: 2, freq: D.D2, instrument: 'timpani', gain: 0.4 },
        ...ember(16, 'brass', 0.36),
      ],
    },

    // --- Epilogue: settle, then leave one note hanging. --------------------
    {
      id: 'epilogue',
      start: 356,
      end: 380,
      bpm: 50,
      level: 0.58,
      drone: [D.D2, D.A2],
      droneLevel: 0.3,
      notes: [
        ...ember(0, 'strings', 0.44),
        { beat: 4, length: 4, freq: D.D5, instrument: 'bell', gain: 0.28 },
        { beat: 8, length: 10, freq: [D.D3, D.F3, D.A3, D.D4], instrument: 'pad', gain: 0.44 },
        { beat: 10, length: 6, freq: D.A5, instrument: 'bell', gain: 0.22 },
        { beat: 14, length: 8, freq: [D.D3, D.A3, D.D4], instrument: 'choir', gain: 0.32 },
      ],
    },
  ];
}

interface ScheduledCue {
  cue: Cue;
  /** Beat index already scheduled (relative to the cue start). */
  cursor: number;
  droneNodes: Array<{ osc: OscillatorNode; gain: GainNode }>;
  droneGain: GainNode | null;
}

export class MusicEngine {
  private engine: AudioEngine;
  private cues: Cue[];
  private active = new Map<string, ScheduledCue>();
  private out: GainNode;
  private lastTime = -1;
  /** How far ahead of the master clock notes are scheduled, in seconds. */
  private lookahead = 0.55;
  private intensity = 0;

  constructor(engine: AudioEngine) {
    this.engine = engine;
    this.cues = buildScore();
    this.out = engine.ctx.createGain();
    this.out.gain.value = 1;
    this.out.connect(engine.buses.music);
    const send = engine.ctx.createGain();
    send.gain.value = 0.5;
    this.out.connect(send);
    send.connect(engine.reverbSpaceSend);
  }

  /** External intensity signal (battle heat) that lifts percussion and brass. */
  setIntensity(v: number): void {
    this.intensity = clamp(v, 0, 1);
  }

  /** Called whenever the master clock jumps: silence everything and re-arm. */
  reset(): void {
    for (const [, s] of this.active) this.stopCue(s);
    this.active.clear();
    this.lastTime = -1;
  }

  /**
   * @param t master timeline time
   * @param playing whether the timeline is advancing
   */
  update(t: number, playing: boolean): void {
    if (!playing) {
      // Hold sustained material but stop scheduling new notes.
      this.lastTime = t;
      for (const [, s] of this.active) {
        if (s.droneGain) s.droneGain.gain.setTargetAtTime(0, this.engine.now, 0.35);
      }
      return;
    }
    if (this.lastTime < 0 || Math.abs(t - this.lastTime) > 1.0) {
      // A jump: restart from here without replaying anything.
      this.reset();
      this.lastTime = t;
    }

    const windowEnd = t + this.lookahead;

    // Start and stop cues.
    for (const cue of this.cues) {
      const shouldRun = t >= cue.start - 0.2 && t < cue.end;
      const running = this.active.get(cue.id);
      if (shouldRun && !running) this.startCue(cue, t);
      else if (!shouldRun && running) {
        this.stopCue(running);
        this.active.delete(cue.id);
      }
    }

    for (const [, s] of this.active) {
      this.scheduleCue(s, t, windowEnd);
    }
    this.lastTime = t;
  }

  private startCue(cue: Cue, t: number): void {
    const ctx = this.engine.ctx;
    const entry: ScheduledCue = { cue, cursor: (t - cue.start) * (cue.bpm / 60), droneNodes: [], droneGain: null };
    if (cue.drone?.length) {
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.connect(this.out);
      g.gain.setTargetAtTime((cue.droneLevel ?? 0.25) * (cue.level ?? 1), ctx.currentTime, 1.4);
      for (const f of cue.drone) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 320;
        lp.Q.value = 0.6;
        const og = ctx.createGain();
        og.gain.value = 0.3;
        // Slow detune beating keeps the drone alive.
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.07 + Math.random() * 0.06;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = f * 0.004;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        osc.connect(lp);
        lp.connect(og);
        og.connect(g);
        osc.start();
        entry.droneNodes.push({ osc, gain: og });
        entry.droneNodes.push({ osc: lfo, gain: lfoGain });
      }
      entry.droneGain = g;
    }
    this.active.set(cue.id, entry);
  }

  private stopCue(s: ScheduledCue): void {
    const now = this.engine.ctx.currentTime;
    if (s.droneGain) {
      s.droneGain.gain.cancelScheduledValues(now);
      s.droneGain.gain.setTargetAtTime(0.0001, now, 0.4);
    }
    for (const n of s.droneNodes) {
      try {
        n.osc.stop(now + 2.2);
      } catch {
        /* already stopped */
      }
    }
  }

  private scheduleCue(s: ScheduledCue, t: number, windowEnd: number): void {
    const cue = s.cue;
    const spb = 60 / cue.bpm;
    const loop = cue.loopBeats ?? Number.POSITIVE_INFINITY;
    const endBeat = (cue.end - cue.start) / spb;
    const windowEndBeat = Math.min(endBeat, (windowEnd - cue.start) / spb);

    if (s.droneGain) {
      s.droneGain.gain.setTargetAtTime((cue.droneLevel ?? 0.25) * (cue.level ?? 1), this.engine.now, 0.5);
    }

    while (s.cursor < windowEndBeat) {
      const beatStart = Math.max(0, Math.floor(s.cursor * 4) / 4);
      const nextCursor = beatStart + 0.25;
      // Fire everything whose beat falls inside this quarter-beat slice.
      for (const n of cue.notes) {
        const positions: number[] = [];
        if (Number.isFinite(loop)) {
          for (let base = 0; base <= endBeat; base += loop) {
            const b = base + n.beat;
            if (b >= beatStart && b < nextCursor && b <= endBeat) positions.push(b);
          }
        } else if (n.beat >= beatStart && n.beat < nextCursor) {
          positions.push(n.beat);
        }
        for (const b of positions) {
          const when = cue.start + b * spb;
          if (when < t - 0.05) continue;
          const delay = Math.max(0, when - t);
          this.playNote(n, this.engine.now + delay, spb, cue.level ?? 1);
        }
      }
      s.cursor = nextCursor;
    }
  }

  private playNote(n: ScoreNote, when: number, spb: number, cueLevel: number): void {
    const freqs = Array.isArray(n.freq) ? n.freq : [n.freq];
    const duration = n.length * spb;
    const gain = (n.gain ?? 1) * cueLevel;
    for (const f of freqs) {
      this.voice(n.instrument, f, when, duration, gain / Math.sqrt(freqs.length));
    }
  }

  private voice(instrument: Instrument, freq: number, when: number, duration: number, gain: number): void {
    const ctx = this.engine.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(this.out);

    const boost = 1 + this.intensity * 0.35;

    switch (instrument) {
      case 'brass': {
        const shaper = ctx.createWaveShaper();
        shaper.curve = this.engine.saturation;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(freq * 2.2, when);
        lp.frequency.linearRampToValueAtTime(freq * 6 * boost, when + 0.12);
        lp.frequency.linearRampToValueAtTime(freq * 3, when + duration);
        lp.Q.value = 1.2;
        for (const detune of [-7, 0, 7]) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          osc.connect(shaper);
          osc.start(when);
          osc.stop(when + duration + 0.6);
        }
        shaper.connect(lp);
        lp.connect(g);
        applyEnvelope(g.gain, when, duration, gain * 0.3 * boost, { attack: 0.06, decay: 0.14, sustain: 0.72, release: 0.4 });
        break;
      }
      case 'strings':
      case 'lowStrings': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = instrument === 'strings' ? freq * 5 : freq * 3.4;
        lp.Q.value = 0.7;
        for (const detune of [-9, 4, 11]) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          osc.connect(lp);
          osc.start(when);
          osc.stop(when + duration + 0.8);
        }
        lp.connect(g);
        const attack = instrument === 'strings' ? 0.16 : 0.02;
        applyEnvelope(g.gain, when, duration, gain * 0.24, { attack, decay: 0.2, sustain: 0.7, release: 0.5 });
        break;
      }
      case 'pad':
      case 'choir': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = instrument === 'choir' ? freq * 3.2 : freq * 4.5;
        for (const [type, detune, level] of [['sine', 0, 0.5], ['triangle', 6, 0.34], ['sawtooth', -6, 0.14]] as const) {
          const osc = ctx.createOscillator();
          osc.type = type;
          osc.frequency.value = freq;
          osc.detune.value = detune;
          const og = ctx.createGain();
          og.gain.value = level;
          osc.connect(og);
          og.connect(lp);
          osc.start(when);
          osc.stop(when + duration + 1.4);
        }
        lp.connect(g);
        applyEnvelope(g.gain, when, duration, gain * 0.22, { attack: 0.7, decay: 0.4, sustain: 0.85, release: 1.2 });
        break;
      }
      case 'bell': {
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = freq;
        const mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = freq * 2.76;
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(freq * 2.4, when);
        modGain.gain.exponentialRampToValueAtTime(freq * 0.05, when + duration * 0.6);
        mod.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(g);
        carrier.start(when);
        mod.start(when);
        carrier.stop(when + duration + 1.6);
        mod.stop(when + duration + 1.6);
        applyEnvelope(g.gain, when, duration * 0.2, gain * 0.2, { attack: 0.005, decay: duration * 0.5, sustain: 0.14, release: 1.4 });
        break;
      }
      case 'pluck': {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(freq * 6, when);
        lp.frequency.exponentialRampToValueAtTime(freq * 1.4, when + duration);
        osc.connect(lp);
        lp.connect(g);
        osc.start(when);
        osc.stop(when + duration + 0.5);
        applyEnvelope(g.gain, when, duration * 0.35, gain * 0.26, { attack: 0.004, decay: 0.12, sustain: 0.25, release: 0.4 });
        break;
      }
      case 'timpani': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.9, when);
        osc.frequency.exponentialRampToValueAtTime(freq, when + 0.09);
        const noise = ctx.createBufferSource();
        noise.buffer = this.engine.noiseBuffer;
        noise.loop = true;
        const nf = ctx.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.value = freq * 3;
        nf.Q.value = 1.2;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(gain * 0.22 * boost, when);
        ng.gain.exponentialRampToValueAtTime(0.0002, when + 0.13);
        noise.connect(nf);
        nf.connect(ng);
        ng.connect(this.out);
        noise.start(when);
        noise.stop(when + 0.3);
        osc.connect(g);
        osc.start(when);
        osc.stop(when + duration + 1.2);
        applyEnvelope(g.gain, when, 0.05, gain * 0.5 * boost, { attack: 0.004, decay: 0.3, sustain: 0.22, release: 1.1 });
        break;
      }
      case 'perc': {
        const noise = ctx.createBufferSource();
        noise.buffer = this.engine.noiseBuffer;
        noise.loop = true;
        noise.playbackRate.value = 1.4;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1900;
        bp.Q.value = 0.9;
        noise.connect(bp);
        bp.connect(g);
        noise.start(when);
        noise.stop(when + 0.35);
        applyEnvelope(g.gain, when, 0.02, gain * 0.2 * boost, { attack: 0.002, decay: 0.06, sustain: 0.12, release: 0.14 });
        break;
      }
    }
  }
}
