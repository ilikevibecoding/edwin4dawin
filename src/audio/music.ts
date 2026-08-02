/**
 * Original score.
 *
 * Four leitmotifs, all newly written for this piece, recur across the
 * chapters:
 *
 *   ALLIANCE  a rising minor-to-relative-major figure — the people running
 *   EMPIRE    a low, dotted semitone rub — the thing chasing them
 *   SECRET    a slow, floating whole-tone pair — the stolen plans
 *   COURIER   a light six-eight pluck — the droids
 *
 * Instruments are subtractive synth voices: stacked detuned saws through a
 * moving low-pass for brass and strings, filtered noise plus harmonics for
 * choir, pitch-swept sine for timpani. A look-ahead scheduler queues events
 * a fraction of a second early so timing does not depend on frame rate.
 */

import { AudioEngine } from './engine';

type VoiceName = 'brass' | 'lowBrass' | 'strings' | 'highStrings' | 'choir' | 'timpani' | 'pluck' | 'perc' | 'swell';

interface Note {
  /** Beat offset within the cue's loop. */
  b: number;
  /** MIDI note number. */
  n: number;
  /** Duration in beats. */
  d: number;
  /** Velocity, 0..1. */
  v: number;
  voice: VoiceName;
}

interface Cue {
  bpm: number;
  /** Loop length in beats. */
  loop: number;
  notes: Note[];
  /** Sustained pedal tones held for the whole cue. */
  drones?: Array<{ n: number; v: number; voice: VoiceName }>;
  /** Overall level for this cue. */
  gain: number;
}

const M = AudioEngine.mtof;

/* ------------------------------------------------------------- leitmotifs */

/** Rising figure in D minor. Returns notes offset from `at` beats. */
function alliance(at: number, oct = 0, vel = 0.8, voice: VoiceName = 'brass', scale = 1): Note[] {
  const seq: Array<[number, number, number]> = [
    [0, 62, 1],
    [1, 69, 0.5],
    [1.5, 70, 0.5],
    [2, 69, 1.25],
    [3.5, 65, 0.5],
    [4, 67, 0.5],
    [4.5, 69, 0.5],
    [5, 74, 2.2],
  ];
  return seq.map(([b, n, d]) => ({ b: at + b * scale, n: n + oct * 12, d: d * scale, v: vel, voice }));
}

/** Low, dotted, semitone-rub figure. The Empire. */
function empire(at: number, oct = 0, vel = 0.85, voice: VoiceName = 'lowBrass'): Note[] {
  const seq: Array<[number, number, number]> = [
    [0, 43, 0.75],
    [0.75, 43, 0.25],
    [1, 44, 0.75],
    [1.75, 43, 0.25],
    [2, 39, 1.5],
    [4, 43, 0.75],
    [4.75, 43, 0.25],
    [5, 44, 0.75],
    [5.75, 46, 0.25],
    [6, 45, 2],
  ];
  return seq.map(([b, n, d]) => ({ b: at + b, n: n + oct * 12, d, v: vel, voice }));
}

/** Slow floating pair. The plans. */
function secret(at: number, oct = 0, vel = 0.55, voice: VoiceName = 'highStrings'): Note[] {
  const seq: Array<[number, number, number]> = [
    [0, 74, 3],
    [3, 76, 3],
    [6, 79, 2.5],
    [8.5, 78, 3.5],
  ];
  return seq.map(([b, n, d]) => ({ b: at + b, n: n + oct * 12, d, v: vel, voice }));
}

/** Light six-eight pluck. The droids. */
function courier(at: number, oct = 0, vel = 0.5): Note[] {
  const seq: Array<[number, number, number]> = [
    [0, 69, 0.25],
    [0.33, 72, 0.25],
    [0.66, 74, 0.25],
    [1, 72, 0.25],
    [1.33, 69, 0.25],
    [1.66, 65, 0.4],
    [2, 67, 0.25],
    [2.33, 69, 0.25],
    [2.66, 72, 0.6],
  ];
  return seq.map(([b, n, d]) => ({ b: at + b, n: n + oct * 12, d, v: vel, voice: 'pluck' }));
}

function chord(at: number, notes: number[], dur: number, vel: number, voice: VoiceName): Note[] {
  return notes.map((n) => ({ b: at, n, d: dur, v: vel, voice }));
}

function pulse(from: number, to: number, step: number, midi: number, vel: number, voice: VoiceName, dur = 0.2): Note[] {
  const out: Note[] = [];
  for (let b = from; b < to; b += step) out.push({ b, n: midi, d: dur, v: vel, voice });
  return out;
}

/* ------------------------------------------------------------------ cues */

export type CueName =
  | 'silence'
  | 'prologue'
  | 'planet'
  | 'chase'
  | 'destroyer'
  | 'battle'
  | 'capture'
  | 'corridor'
  | 'breach'
  | 'vader'
  | 'leia'
  | 'transfer'
  | 'escape'
  | 'descent'
  | 'epilogue';

const CUES: Record<CueName, Cue | null> = {
  silence: null,

  // Vast and still, with the Alliance motif stated once, far away.
  prologue: {
    bpm: 54,
    loop: 32,
    gain: 0.55,
    drones: [
      { n: 38, v: 0.34, voice: 'strings' },
      { n: 50, v: 0.16, voice: 'choir' },
    ],
    notes: [
      ...chord(0, [50, 57, 62], 8, 0.3, 'strings'),
      ...chord(8, [50, 55, 62], 8, 0.28, 'strings'),
      ...alliance(16, -1, 0.42, 'brass', 1.4),
      ...chord(16, [45, 52, 57], 12, 0.26, 'choir'),
      { b: 0, n: 38, d: 2, v: 0.5, voice: 'timpani' },
      { b: 16, n: 38, d: 2, v: 0.42, voice: 'timpani' },
    ],
  },

  // Wide, warm, lonely. Strings only, no rhythm at all.
  planet: {
    bpm: 50,
    loop: 32,
    gain: 0.5,
    drones: [{ n: 41, v: 0.3, voice: 'strings' }],
    notes: [
      ...chord(0, [53, 60, 65], 8, 0.26, 'strings'),
      ...chord(8, [53, 58, 63], 8, 0.24, 'strings'),
      ...chord(16, [51, 58, 63], 8, 0.24, 'strings'),
      ...chord(24, [53, 60, 67], 8, 0.26, 'strings'),
      { b: 4, n: 72, d: 5, v: 0.2, voice: 'choir' },
      { b: 18, n: 70, d: 6, v: 0.18, voice: 'choir' },
    ],
  },

  // Driving ostinato under fragments of the Alliance motif.
  chase: {
    bpm: 138,
    loop: 16,
    gain: 0.6,
    notes: [
      ...pulse(0, 16, 0.5, 38, 0.42, 'strings', 0.22),
      ...pulse(0, 16, 2, 26, 0.5, 'timpani', 0.3),
      { b: 1, n: 45, d: 0.4, v: 0.32, voice: 'perc' },
      { b: 3, n: 45, d: 0.4, v: 0.3, voice: 'perc' },
      { b: 5, n: 45, d: 0.4, v: 0.32, voice: 'perc' },
      { b: 7, n: 45, d: 0.4, v: 0.3, voice: 'perc' },
      { b: 9, n: 45, d: 0.4, v: 0.32, voice: 'perc' },
      { b: 11, n: 45, d: 0.4, v: 0.3, voice: 'perc' },
      { b: 13, n: 45, d: 0.4, v: 0.32, voice: 'perc' },
      { b: 15, n: 45, d: 0.4, v: 0.34, voice: 'perc' },
      ...alliance(2, 0, 0.5, 'brass', 0.75),
      ...chord(0, [50, 57], 4, 0.22, 'strings'),
      ...chord(8, [48, 55], 4, 0.22, 'strings'),
      ...chord(12, [46, 53], 4, 0.24, 'strings'),
    ],
  },

  // The reveal. Everything low and enormous.
  destroyer: {
    bpm: 88,
    loop: 16,
    gain: 0.78,
    drones: [{ n: 31, v: 0.42, voice: 'lowBrass' }],
    notes: [
      ...empire(0, 0, 0.9),
      ...empire(8, 0, 0.82),
      { b: 0, n: 26, d: 3, v: 0.85, voice: 'timpani' },
      { b: 4, n: 26, d: 2, v: 0.6, voice: 'timpani' },
      { b: 8, n: 26, d: 3, v: 0.8, voice: 'timpani' },
      { b: 12, n: 24, d: 3, v: 0.7, voice: 'timpani' },
      { b: 0, n: 55, d: 8, v: 0.2, voice: 'choir' },
      { b: 8, n: 56, d: 8, v: 0.22, voice: 'choir' },
      { b: 0, n: 40, d: 2, v: 0.5, voice: 'swell' },
    ],
  },

  // Hard, fast, mostly rhythm; the Empire motif in the bass.
  battle: {
    bpm: 152,
    loop: 16,
    gain: 0.62,
    notes: [
      ...pulse(0, 16, 0.25, 38, 0.24, 'strings', 0.14),
      ...pulse(0, 16, 1, 26, 0.44, 'timpani', 0.24),
      ...empire(0, -1, 0.55, 'lowBrass'),
      { b: 2, n: 45, d: 0.3, v: 0.34, voice: 'perc' },
      { b: 6, n: 45, d: 0.3, v: 0.34, voice: 'perc' },
      { b: 10, n: 45, d: 0.3, v: 0.34, voice: 'perc' },
      { b: 14, n: 45, d: 0.3, v: 0.4, voice: 'perc' },
      ...chord(0, [62, 65], 2, 0.24, 'brass'),
      ...chord(8, [61, 64], 2, 0.24, 'brass'),
    ],
  },

  // The engines die. Almost nothing left but a held breath.
  capture: {
    bpm: 62,
    loop: 24,
    gain: 0.52,
    drones: [{ n: 33, v: 0.4, voice: 'lowBrass' }],
    notes: [
      { b: 0, n: 26, d: 4, v: 0.5, voice: 'timpani' },
      { b: 12, n: 25, d: 4, v: 0.42, voice: 'timpani' },
      ...chord(0, [45, 52], 12, 0.2, 'choir'),
      ...chord(12, [44, 51], 12, 0.2, 'choir'),
      { b: 6, n: 39, d: 3, v: 0.3, voice: 'lowBrass' },
      { b: 18, n: 38, d: 4, v: 0.28, voice: 'lowBrass' },
    ],
  },

  // Tense, close, quiet. A clock, not a melody.
  corridor: {
    bpm: 104,
    loop: 16,
    gain: 0.46,
    drones: [{ n: 36, v: 0.24, voice: 'strings' }],
    notes: [
      ...pulse(0, 16, 1, 43, 0.2, 'pluck', 0.18),
      { b: 0, n: 26, d: 1.5, v: 0.4, voice: 'timpani' },
      { b: 8, n: 26, d: 1.5, v: 0.34, voice: 'timpani' },
      ...chord(4, [51, 56], 3, 0.18, 'strings'),
      ...chord(12, [50, 55], 3, 0.18, 'strings'),
    ],
  },

  // A single blow, then chaos underneath.
  breach: {
    bpm: 150,
    loop: 8,
    gain: 0.7,
    notes: [
      { b: 0, n: 24, d: 4, v: 0.95, voice: 'timpani' },
      { b: 0, n: 36, d: 3, v: 0.6, voice: 'swell' },
      ...pulse(0.5, 8, 0.25, 39, 0.3, 'strings', 0.12),
      ...chord(0, [51, 57, 58], 2, 0.4, 'brass'),
      { b: 4, n: 24, d: 3, v: 0.6, voice: 'timpani' },
    ],
  },

  // Vader. The Empire motif at half speed, with a heartbeat under it.
  vader: {
    bpm: 60,
    loop: 16,
    gain: 0.72,
    drones: [
      { n: 31, v: 0.44, voice: 'lowBrass' },
      { n: 43, v: 0.14, voice: 'choir' },
    ],
    notes: [
      { b: 0, n: 24, d: 2, v: 0.7, voice: 'timpani' },
      { b: 1.4, n: 24, d: 2, v: 0.42, voice: 'timpani' },
      { b: 8, n: 24, d: 2, v: 0.7, voice: 'timpani' },
      { b: 9.4, n: 24, d: 2, v: 0.42, voice: 'timpani' },
      { b: 0, n: 43, d: 3, v: 0.72, voice: 'lowBrass' },
      { b: 3, n: 44, d: 2, v: 0.7, voice: 'lowBrass' },
      { b: 5, n: 43, d: 3, v: 0.66, voice: 'lowBrass' },
      { b: 9, n: 39, d: 5, v: 0.7, voice: 'lowBrass' },
      ...chord(0, [55, 56], 7, 0.16, 'choir'),
      ...chord(8, [54, 55], 7, 0.18, 'choir'),
    ],
  },

  // The Secret motif, exposed and fragile.
  leia: {
    bpm: 68,
    loop: 24,
    gain: 0.52,
    drones: [{ n: 41, v: 0.22, voice: 'strings' }],
    notes: [
      ...secret(0, 0, 0.42),
      ...secret(12, 0, 0.36),
      ...chord(0, [53, 60], 6, 0.2, 'strings'),
      ...chord(6, [51, 58], 6, 0.2, 'strings'),
      ...chord(12, [53, 60], 6, 0.2, 'strings'),
      ...chord(18, [55, 62], 6, 0.22, 'strings'),
      { b: 8, n: 65, d: 2, v: 0.22, voice: 'pluck' },
    ],
  },

  // The moment of the handover: Secret and Alliance overlapping.
  transfer: {
    bpm: 72,
    loop: 16,
    gain: 0.58,
    drones: [{ n: 38, v: 0.24, voice: 'strings' }],
    notes: [
      ...secret(0, 0, 0.4),
      ...alliance(4, 0, 0.4, 'strings', 1),
      ...chord(0, [50, 57, 62], 8, 0.24, 'choir'),
      ...chord(8, [53, 60, 65], 8, 0.26, 'choir'),
      { b: 0, n: 31, d: 3, v: 0.4, voice: 'timpani' },
    ],
  },

  // Light, quick, hopeful. The Courier motif over a walking bass.
  escape: {
    bpm: 126,
    loop: 12,
    gain: 0.56,
    notes: [
      ...courier(0, 0, 0.4),
      ...courier(3, 0, 0.36),
      ...courier(6, 1, 0.3),
      ...pulse(0, 12, 1, 38, 0.3, 'strings', 0.4),
      { b: 0, n: 26, d: 1.5, v: 0.42, voice: 'timpani' },
      { b: 6, n: 28, d: 1.5, v: 0.4, voice: 'timpani' },
      ...alliance(8, -1, 0.38, 'brass', 0.5),
    ],
  },

  // Rising toward the planet.
  descent: {
    bpm: 84,
    loop: 16,
    gain: 0.62,
    drones: [{ n: 38, v: 0.28, voice: 'strings' }],
    notes: [
      ...chord(0, [50, 57, 62], 4, 0.28, 'strings'),
      ...chord(4, [53, 60, 65], 4, 0.3, 'strings'),
      ...chord(8, [55, 62, 67], 4, 0.32, 'strings'),
      ...chord(12, [57, 64, 69], 4, 0.34, 'strings'),
      ...alliance(4, 0, 0.44, 'brass', 1),
      ...pulse(0, 16, 2, 26, 0.34, 'timpani', 0.4),
      { b: 12, n: 45, d: 4, v: 0.3, voice: 'swell' },
    ],
  },

  // Full statement of the Alliance motif, warm and resolved.
  epilogue: {
    bpm: 66,
    loop: 24,
    gain: 0.66,
    drones: [{ n: 38, v: 0.3, voice: 'strings' }],
    notes: [
      ...alliance(0, 0, 0.6, 'brass', 1.35),
      ...chord(0, [50, 57, 62], 10, 0.28, 'strings'),
      ...chord(10, [53, 60, 65], 7, 0.3, 'strings'),
      ...chord(17, [50, 57, 62], 7, 0.3, 'strings'),
      ...chord(0, [62, 69], 12, 0.16, 'choir'),
      { b: 0, n: 31, d: 3, v: 0.4, voice: 'timpani' },
      { b: 17, n: 31, d: 5, v: 0.34, voice: 'timpani' },
      ...secret(12, -1, 0.22, 'highStrings'),
    ],
  },
};

/* -------------------------------------------------------------- director */

interface ActiveCue {
  name: CueName;
  cue: Cue;
  out: GainNode;
  startTime: number;
  nextBeat: number;
  drones: Array<{ osc: OscillatorNode[]; gain: GainNode }>;
  ending: boolean;
}

export class MusicDirector {
  private engine: AudioEngine;
  private active: ActiveCue | null = null;
  private retiring: ActiveCue[] = [];
  private lookAhead = 0.45;
  private masterOut: GainNode | null = null;
  private duckAmount = 0;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  private ensureOut(): GainNode | null {
    const ctx = this.engine.ctx;
    if (!ctx) return null;
    if (!this.masterOut) {
      this.masterOut = ctx.createGain();
      this.masterOut.gain.value = 1;
      this.masterOut.connect(this.engine.bus('music'));
    }
    return this.masterOut;
  }

  get currentCue(): CueName {
    return this.active?.name ?? 'silence';
  }

  /** Switch cues with a crossfade. Re-selecting the current cue is a no-op. */
  setCue(name: CueName, fade = 2.5): void {
    const ctx = this.engine.ctx;
    if (!ctx) return;
    if (this.active?.name === name) return;
    const parent = this.ensureOut();
    if (!parent) return;

    if (this.active) {
      const old = this.active;
      old.ending = true;
      old.out.gain.cancelScheduledValues(ctx.currentTime);
      old.out.gain.setValueAtTime(old.out.gain.value, ctx.currentTime);
      old.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fade);
      for (const d of old.drones) {
        d.gain.gain.cancelScheduledValues(ctx.currentTime);
        d.gain.gain.setValueAtTime(d.gain.gain.value, ctx.currentTime);
        d.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fade);
        for (const o of d.osc) o.stop(ctx.currentTime + fade + 0.1);
      }
      this.retiring.push(old);
      window.setTimeout(() => {
        old.out.disconnect();
        this.retiring = this.retiring.filter((r) => r !== old);
      }, (fade + 0.4) * 1000);
      this.active = null;
    }

    const cue = CUES[name];
    if (!cue) return;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(cue.gain, ctx.currentTime + Math.max(0.12, fade * 0.75));
    out.connect(parent);

    const drones: ActiveCue['drones'] = [];
    for (const d of cue.drones ?? []) {
      drones.push(this.startDrone(d.n, d.v, d.voice, out, fade));
    }

    this.active = {
      name,
      cue,
      out,
      startTime: ctx.currentTime + 0.08,
      nextBeat: 0,
      drones,
      ending: false,
    };
  }

  /** Temporarily lower the music, e.g. under narration. 0..1. */
  duck(amount: number): void {
    const ctx = this.engine.ctx;
    const out = this.ensureOut();
    if (!ctx || !out) return;
    if (Math.abs(amount - this.duckAmount) < 0.01) return;
    this.duckAmount = amount;
    out.gain.setTargetAtTime(1 - amount * 0.42, ctx.currentTime, 0.25);
  }

  stop(fade = 1.5): void {
    this.setCue('silence', fade);
  }

  /** Called every frame; schedules any notes inside the look-ahead window. */
  update(): void {
    const ctx = this.engine.ctx;
    const a = this.active;
    if (!ctx || !a) return;
    const spb = 60 / a.cue.bpm;
    const horizon = ctx.currentTime + this.lookAhead;

    // Guard against a huge catch-up burst if the tab was suspended.
    let scheduled = 0;
    while (a.startTime + a.nextBeat * spb < horizon && scheduled < 96) {
      const loopIndex = Math.floor(a.nextBeat / a.cue.loop);
      const beatInLoop = a.nextBeat - loopIndex * a.cue.loop;
      for (const note of a.cue.notes) {
        if (note.b >= beatInLoop && note.b < beatInLoop + 1) {
          const when = a.startTime + (loopIndex * a.cue.loop + note.b) * spb;
          if (when >= ctx.currentTime - 0.02) {
            this.playNote(note, when, note.d * spb, a.out);
            scheduled++;
          }
        }
      }
      a.nextBeat += 1;
    }
    if (a.startTime + a.nextBeat * spb < ctx.currentTime) {
      // We fell far behind (suspended tab). Re-anchor rather than catch up.
      a.startTime = ctx.currentTime;
      a.nextBeat = 0;
    }
  }

  /* ------------------------------------------------------------- voices */

  private startDrone(midi: number, vel: number, voice: VoiceName, out: GainNode, fade: number) {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vel * 0.4, ctx.currentTime + Math.max(0.5, fade));
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = voice === 'choir' ? 1400 : 620;
    filter.Q.value = 0.6;
    g.connect(filter);
    filter.connect(out);

    const oscs: OscillatorNode[] = [];
    const freq = M(midi);
    const detunes = voice === 'choir' ? [-7, 0, 6] : [-5, 0, 5, 12];
    for (const dt of detunes) {
      const o = ctx.createOscillator();
      o.type = voice === 'choir' ? 'triangle' : 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = dt;
      const vg = ctx.createGain();
      vg.gain.value = 1 / detunes.length;
      o.connect(vg);
      vg.connect(g);
      o.start();
      oscs.push(o);
    }
    // Slow amplitude drift keeps a sustained pad from sounding synthetic.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = vel * 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    lfo.start();
    oscs.push(lfo);

    return { osc: oscs, gain: g };
  }

  private playNote(note: Note, when: number, dur: number, out: GainNode): void {
    const ctx = this.engine.ctx;
    if (!ctx) return;
    const f = M(note.n);
    switch (note.voice) {
      case 'brass':
        this.brass(f, when, dur, note.v * 0.34, out, 2600);
        break;
      case 'lowBrass':
        this.brass(f, when, dur, note.v * 0.4, out, 1100);
        break;
      case 'strings':
        this.strings(f, when, dur, note.v * 0.24, out);
        break;
      case 'highStrings':
        this.strings(f, when, dur, note.v * 0.18, out, 0.6);
        break;
      case 'choir':
        this.choir(f, when, dur, note.v * 0.24, out);
        break;
      case 'timpani':
        this.timpani(f, when, note.v * 0.5, out);
        break;
      case 'pluck':
        this.pluck(f, when, dur, note.v * 0.26, out);
        break;
      case 'perc':
        this.perc(when, note.v * 0.3, out);
        break;
      case 'swell':
        this.swell(when, dur, note.v * 0.3, out);
        break;
    }
  }

  private brass(freq: number, when: number, dur: number, gain: number, out: GainNode, cutoff: number): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.4;
    // The characteristic brass "bloom": the filter opens after the attack.
    filter.frequency.setValueAtTime(freq * 1.4, when);
    filter.frequency.linearRampToValueAtTime(cutoff, when + Math.min(0.22, dur * 0.4));
    filter.frequency.linearRampToValueAtTime(freq * 2.2, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.085);
    g.gain.setValueAtTime(gain, when + Math.max(0.1, dur * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.28);
    filter.connect(g);
    g.connect(out);

    for (const [type, det, mul] of [
      ['sawtooth', -6, 0.5],
      ['sawtooth', 7, 0.5],
      ['square', 0, 0.22],
    ] as Array<[OscillatorType, number, number]>) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = det;
      const vg = ctx.createGain();
      vg.gain.value = mul;
      o.connect(vg);
      vg.connect(filter);
      o.start(when);
      o.stop(when + dur + 0.4);
    }
  }

  private strings(freq: number, when: number, dur: number, gain: number, out: GainNode, brightness = 1): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900 + freq * 3.4 * brightness;
    filter.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + Math.min(0.5, dur * 0.45));
    g.gain.setValueAtTime(gain, when + Math.max(0.2, dur * 0.75));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.5);
    filter.connect(g);
    g.connect(out);
    for (const det of [-9, -3, 4, 10]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      const vg = ctx.createGain();
      vg.gain.value = 0.25;
      o.connect(vg);
      vg.connect(filter);
      o.start(when);
      o.stop(when + dur + 0.6);
    }
  }

  private choir(freq: number, when: number, dur: number, gain: number, out: GainNode): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + Math.min(0.9, dur * 0.5));
    g.gain.setValueAtTime(gain, when + Math.max(0.3, dur * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.8);
    g.connect(out);

    // Two formant bands over a soft harmonic stack reads as "voices".
    for (const [mult, amp] of [[1, 0.5], [2, 0.2], [3, 0.11], [4, 0.06]] as Array<[number, number]>) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      o.detune.value = (Math.random() - 0.5) * 12;
      const vg = ctx.createGain();
      vg.gain.value = amp;
      o.connect(vg);
      vg.connect(g);
      o.start(when);
      o.stop(when + dur + 0.9);
    }
    const nb = ctx.createBufferSource();
    nb.buffer = this.engine.noise('pink', 2);
    nb.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 3.2;
    bp.Q.value = 5;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    nb.connect(bp);
    bp.connect(ng);
    ng.connect(g);
    nb.start(when, Math.random());
    nb.stop(when + dur + 0.9);
  }

  private timpani(freq: number, when: number, gain: number, out: GainNode): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.5);
    g.connect(out);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.6, when);
    o.frequency.exponentialRampToValueAtTime(freq, when + 0.09);
    o.connect(g);
    o.start(when);
    o.stop(when + 1.6);
    // Mallet transient.
    this.engine.noiseBurst({
      to: out,
      start: when,
      duration: 0.07,
      gain: gain * 0.5,
      type: 'lowpass',
      freq: 900,
      kind: 'brown',
    });
  }

  private pluck(freq: number, when: number, dur: number, gain: number, out: GainNode): void {
    const ctx = this.engine.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.25, dur));
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 8, when);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, when + 0.2);
    filter.connect(g);
    g.connect(out);
    for (const [type, amp] of [['triangle', 0.7], ['sawtooth', 0.25]] as Array<[OscillatorType, number]>) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const vg = ctx.createGain();
      vg.gain.value = amp;
      o.connect(vg);
      vg.connect(filter);
      o.start(when);
      o.stop(when + Math.max(0.3, dur) + 0.1);
    }
  }

  private perc(when: number, gain: number, out: GainNode): void {
    this.engine.noiseBurst({
      to: out,
      start: when,
      duration: 0.16,
      gain: gain * 0.5,
      type: 'highpass',
      freq: 1800,
      kind: 'white',
    });
    this.engine.noiseBurst({
      to: out,
      start: when,
      duration: 0.09,
      gain: gain * 0.45,
      type: 'bandpass',
      freq: 420,
      q: 1.2,
      kind: 'pink',
    });
  }

  private swell(when: number, dur: number, gain: number, out: GainNode): void {
    const ctx = this.engine.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.engine.noise('pink', 2);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(300, when);
    bp.frequency.exponentialRampToValueAtTime(4200, when + dur);
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + dur * 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.5);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(when, Math.random());
    src.stop(when + dur + 0.6);
  }
}
