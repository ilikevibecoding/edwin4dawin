// The score. Original themes written as note data and realised by the
// oscillator orchestra in synth.js.
//
// The film is carried by one melody -- the "hope" theme -- which shows up as a
// fanfare over the titles, alone on a horn in the desert, broken and slow at
// the sunset, and finally in full brass over the end titles. The Empire gets a
// four-note march that never resolves.

import { INSTRUMENTS, midi, hz } from './synth.js';

/** Compact melody entry: [duration, pitch] pairs, advancing the beat cursor. */
function line(start, items, { vel = 1, transpose = 0 } = {}) {
  const out = [];
  let b = start;
  for (const [d, p] of items) {
    if (p !== null && p !== undefined) out.push([b, d, midi(p) + transpose, vel]);
    b += d;
  }
  return out;
}

function chord(beat, dur, pitches, vel = 1, transpose = 0) {
  return pitches.map((p) => [beat, dur, midi(p) + transpose, vel]);
}

/** Repeats a bar-length pattern `times` times, `barLen` beats apart. */
function repeat(pattern, times, barLen, startBeat = 0) {
  const out = [];
  for (let i = 0; i < times; i++) {
    for (const [b, d, p, v] of pattern) out.push([startBeat + b + i * barLen, d, p, v]);
  }
  return out;
}

// --- the hope theme --------------------------------------------------------
// 8 bars of 4/4, written in C and transposed per cue.

const HOPE_A = [
  [1, 'C5'], [1, 'G4'], [0.5, 'A4'], [0.5, 'B4'], [1, 'C5'],
  [2, 'D5'], [1, 'C5'], [1, 'A4'],
  [1.5, 'G4'], [0.5, 'F4'], [1, 'G4'], [1, 'A4'],
  [3, 'F4'], [1, null],
];
const HOPE_B = [
  [1, 'A4'], [1, 'C5'], [0.5, 'D5'], [0.5, 'E5'], [1, 'F5'],
  [2, 'E5'], [1, 'D5'], [1, 'C5'],
  [1.5, 'D5'], [0.5, 'C5'], [1, 'B4'], [1, 'A4'],
  [4, 'G4'],
];
const HOPE_PICKUP = [[0.5, 'G4'], [0.5, 'A4']];

// Harmony under the theme, one chord per bar.
const HOPE_CHORDS_A = [
  ['C3', 'G3', 'E4'], ['B2', 'G3', 'D4'], ['A2', 'E3', 'C4'], ['F2', 'C3', 'A3'],
];
const HOPE_CHORDS_B = [
  ['F2', 'C3', 'A3'], ['C3', 'G3', 'E4'], ['G2', 'D3', 'B3'], ['C3', 'G3', 'E4'],
];

function hopeMelody(startBeat, { transpose = 0, vel = 1, withPickup = true } = {}) {
  const notes = [];
  if (withPickup) notes.push(...line(startBeat - 1, HOPE_PICKUP, { vel: vel * 0.8, transpose }));
  notes.push(...line(startBeat, HOPE_A, { vel, transpose }));
  notes.push(...line(startBeat + 16, HOPE_B, { vel, transpose }));
  return notes;
}

function hopeHarmony(startBeat, { transpose = 0, vel = 0.7, barLen = 4 } = {}) {
  const notes = [];
  [...HOPE_CHORDS_A, ...HOPE_CHORDS_B].forEach((ch, i) => {
    notes.push(...chord(startBeat + i * barLen, barLen, ch, vel, transpose));
  });
  return notes;
}

// --- the Imperial march ----------------------------------------------------

const IMP_BASS = [
  [0, 1, midi('D2'), 1], [1, 1, midi('D2'), 0.9],
  [2, 0.5, midi('D2'), 0.85], [2.5, 0.5, midi('Eb2'), 0.9], [3, 1, midi('D2'), 1],
];
const IMP_BASS_ALT = [
  [0, 1, midi('D2'), 1], [1, 1, midi('D2'), 0.9],
  [2, 1, midi('Bb1'), 0.95], [3, 1, midi('C2'), 0.95],
];
const IMP_DRUM = [[0, 0.5, 62, 1], [1, 0.4, 62, 0.6], [2, 0.5, 62, 0.9], [3, 0.4, 62, 0.6]];

// ---------------------------------------------------------------------------
// Cues. Each is { bpm, beats, tracks: [{ inst, gain, send, notes }] }
// ---------------------------------------------------------------------------

export const CUES = {
  /** Logo hit + crawl. Brass fanfare, then the theme twice with strings. */
  mainTitle: {
    bpm: 104,
    tracks: [
      {
        inst: 'brass', gain: 1.0, send: 0.4,
        notes: [
          ...chord(0, 1.6, ['C4', 'G4', 'C5'], 1.15),
          ...line(2, [[0.5, 'G4'], [0.5, 'C5'], [1, 'E5'], [2, 'G5']], { vel: 1.1 }),
          ...line(6, [[0.5, 'F5'], [0.5, 'E5'], [1, 'D5'], [2, 'C5']], { vel: 1.0 }),
          ...hopeMelody(12, { vel: 1.05 }),
          ...hopeMelody(44, { vel: 1.1, transpose: 0 }),
        ],
      },
      {
        inst: 'horn', gain: 0.62, send: 0.5,
        notes: [
          ...chord(0, 2, ['C3', 'G3'], 1),
          ...hopeHarmony(12, { vel: 0.55, transpose: -12 }),
          ...hopeHarmony(44, { vel: 0.6, transpose: -12 }),
        ],
      },
      {
        inst: 'strings', gain: 0.8, send: 0.55,
        notes: [
          ...chord(2, 8, ['C3', 'G3', 'E4'], 0.55),
          ...hopeHarmony(12, { vel: 0.6 }),
          ...hopeHarmony(44, { vel: 0.7 }),
          ...chord(76, 8, ['C3', 'G3', 'C4', 'E4'], 0.8),
        ],
      },
      {
        inst: 'timpani', gain: 0.9, send: 0.3,
        notes: [
          [0, 0.7, 48, 1.1], [1.5, 0.5, 48, 0.7], [2.6, 0.5, 43, 0.8],
          ...repeat([[0, 0.6, 48, 0.9], [2, 0.5, 43, 0.6]], 8, 4, 12),
          ...repeat([[0, 0.6, 48, 1.0], [2, 0.5, 43, 0.7], [3.5, 0.3, 48, 0.5]], 8, 4, 44),
          [76, 1.2, 48, 1.2],
        ],
      },
      { inst: 'cymbal', gain: 0.5, send: 0.6, notes: [[0, 2.4, 60, 1], [12, 2, 60, 0.6], [44, 2, 60, 0.7], [76, 3, 60, 1]] },
      {
        inst: 'harp', gain: 0.5, send: 0.5,
        notes: repeat([[0, 0.25, midi('C5'), 0.6], [0.25, 0.25, midi('E5'), 0.5], [0.5, 0.25, midi('G5'), 0.45], [0.75, 0.25, midi('C6'), 0.4]], 8, 4, 44),
      },
    ],
  },

  /** Imperial pursuit: the march, low and relentless. */
  imperial: {
    bpm: 92,
    tracks: [
      { inst: 'lowBrass', gain: 1.0, send: 0.35, notes: [...repeat(IMP_BASS, 4, 4, 0), ...repeat(IMP_BASS_ALT, 2, 4, 16), ...repeat(IMP_BASS, 6, 4, 24)] },
      {
        inst: 'brass', gain: 0.85, send: 0.45,
        notes: [
          ...line(8, [[2, 'A3'], [1, 'F3'], [1, 'A3'], [2, 'Bb3'], [2, 'A3']], { vel: 0.95 }),
          ...line(16, [[1, 'F3'], [1, 'E3'], [2, 'F3'], [4, 'D3']], { vel: 1.0 }),
          ...line(32, [[2, 'A3'], [1, 'F3'], [1, 'A3'], [2, 'Bb3'], [2, 'C4']], { vel: 1.05 }),
          ...line(40, [[1, 'Bb3'], [1, 'A3'], [2, 'F3'], [4, 'D3']], { vel: 1.1 }),
        ],
      },
      { inst: 'strings', gain: 0.55, send: 0.5, notes: [...chord(0, 16, ['D3', 'A3', 'D4'], 0.45), ...chord(16, 8, ['Bb2', 'F3', 'D4'], 0.45), ...chord(24, 24, ['D3', 'A3', 'F4'], 0.5)] },
      { inst: 'timpani', gain: 1.0, send: 0.25, notes: repeat(IMP_DRUM, 12, 4, 0) },
      { inst: 'snare', gain: 0.3, send: 0.3, notes: repeat([[0.5, 0.12, 60, 0.5], [1.5, 0.12, 60, 0.35], [3.25, 0.1, 60, 0.4], [3.75, 0.1, 60, 0.5]], 12, 4, 0) },
    ],
  },

  /** Boarding: sparse, tense, mostly texture. */
  menace: {
    bpm: 70,
    tracks: [
      { inst: 'pad', gain: 0.8, send: 0.6, notes: [...chord(0, 12, ['D2', 'A2', 'Eb3'], 0.7), ...chord(12, 12, ['D2', 'Bb2', 'E3'], 0.7)] },
      { inst: 'lowBrass', gain: 0.9, send: 0.4, notes: [[0, 3, midi('D2'), 0.9], [8, 2, midi('Eb2'), 0.85], [14, 4, midi('D2'), 1.0], [22, 4, midi('C2'), 0.9]] },
      { inst: 'timpani', gain: 0.8, send: 0.4, notes: [[4, 1.2, 45, 0.8], [11, 1.2, 45, 0.7], [18, 1.2, 43, 0.9], [23, 1.4, 45, 1.0]] },
      { inst: 'choir', gain: 0.45, send: 0.7, notes: [...chord(6, 8, ['A3', 'Eb4'], 0.5), ...chord(16, 8, ['Bb3', 'E4'], 0.55)] },
    ],
  },

  /** Escape pod: falling, weightless. */
  drift: {
    bpm: 72,
    tracks: [
      { inst: 'strings', gain: 0.8, send: 0.7, notes: [...chord(0, 8, ['F2', 'C3', 'A3'], 0.5), ...chord(8, 8, ['Eb2', 'Bb2', 'G3'], 0.5), ...chord(16, 8, ['F2', 'C3', 'F3'], 0.55)] },
      { inst: 'horn', gain: 0.7, send: 0.6, notes: line(4, [[2, 'C4'], [2, 'D4'], [4, 'F4'], [2, null], [2, 'C4'], [4, 'Bb3']], { vel: 0.7 }) },
      { inst: 'harp', gain: 0.5, send: 0.6, notes: repeat([[0, 0.5, midi('F4'), 0.5], [1, 0.5, midi('A4'), 0.4], [2, 0.5, midi('C5'), 0.45], [3, 0.5, midi('A4'), 0.35]], 6, 4, 0) },
    ],
  },

  /** The desert: one lonely horn over a drone, modal and dry. */
  desert: {
    bpm: 64,
    tracks: [
      { inst: 'pad', gain: 0.55, send: 0.7, notes: chord(0, 40, ['A1', 'E2', 'A2'], 0.5) },
      {
        inst: 'horn', gain: 0.9, send: 0.75,
        notes: [
          ...line(2, [[2, 'A3'], [1, 'Bb3'], [1, 'C#4'], [3, 'D4'], [1, 'C#4']], { vel: 0.8 }),
          ...line(10, [[2, 'Bb3'], [2, 'A3'], [4, null]], { vel: 0.75 }),
          ...line(18, [[2, 'E4'], [1, 'F4'], [1, 'E4'], [2, 'D4'], [2, 'C#4']], { vel: 0.85 }),
          ...line(26, [[4, 'Bb3'], [4, 'A3']], { vel: 0.7 }),
        ],
      },
      { inst: 'strings', gain: 0.4, send: 0.8, notes: [...chord(16, 10, ['A2', 'E3', 'C#4'], 0.35), ...chord(26, 12, ['A2', 'D3', 'A3'], 0.4)] },
      { inst: 'bell', gain: 0.3, send: 0.8, notes: [[8, 2, midi('A5'), 0.4], [24, 2, midi('E5'), 0.35]] },
    ],
  },

  /** Binary sunset: the theme, slow, on strings and one horn. The heart. */
  sunset: {
    bpm: 58,
    tracks: [
      { inst: 'strings', gain: 1.0, send: 0.8, notes: hopeHarmony(0, { vel: 0.65, transpose: -12 }) },
      { inst: 'horn', gain: 1.0, send: 0.8, notes: hopeMelody(0, { vel: 0.9, transpose: -12 }) },
      { inst: 'choir', gain: 0.4, send: 0.9, notes: [...chord(16, 16, ['F3', 'C4', 'A4'], 0.4)] },
      { inst: 'harp', gain: 0.45, send: 0.7, notes: repeat([[0, 0.5, midi('C4'), 0.4], [1.5, 0.5, midi('G4'), 0.32], [2.5, 0.5, midi('E5'), 0.3]], 8, 4, 0) },
      { inst: 'timpani', gain: 0.5, send: 0.5, notes: [[28, 1.6, 41, 0.6], [30, 1.2, 43, 0.5]] },
    ],
  },

  /** Departure and the jump to lightspeed: accelerating, then release. */
  departure: {
    bpm: 116,
    tracks: [
      {
        inst: 'strings', gain: 0.85, send: 0.5,
        notes: repeat([
          [0, 0.5, midi('D3'), 0.6], [0.5, 0.5, midi('A3'), 0.5], [1, 0.5, midi('D4'), 0.55], [1.5, 0.5, midi('A3'), 0.5],
          [2, 0.5, midi('F3'), 0.6], [2.5, 0.5, midi('A3'), 0.5], [3, 0.5, midi('D4'), 0.55], [3.5, 0.5, midi('A3'), 0.5],
        ], 8, 4, 0),
      },
      {
        inst: 'brass', gain: 1.0, send: 0.45,
        notes: [
          ...line(4, [[1, 'D4'], [1, 'F4'], [2, 'A4'], [2, 'G4'], [2, 'F4']], { vel: 0.95 }),
          ...line(12, [[1, 'A4'], [1, 'Bb4'], [2, 'C5'], [4, 'D5']], { vel: 1.05 }),
          ...chord(20, 3, ['D4', 'A4', 'D5'], 1.15),
          ...chord(24, 8, ['D3', 'A3', 'D4', 'F4'], 1.1),
        ],
      },
      { inst: 'timpani', gain: 0.9, send: 0.3, notes: repeat([[0, 0.4, 50, 0.85], [2, 0.4, 45, 0.7]], 8, 4, 0) },
      { inst: 'cymbal', gain: 0.45, send: 0.6, notes: [[20, 2.5, 60, 0.9], [24, 3, 60, 0.7]] },
    ],
  },

  /** The duel: two motifs circling each other, no resolution. */
  duel: {
    bpm: 84,
    tracks: [
      { inst: 'lowBrass', gain: 0.95, send: 0.4, notes: [...repeat(IMP_BASS, 4, 4, 0), ...repeat(IMP_BASS_ALT, 4, 4, 16), ...repeat(IMP_BASS, 4, 4, 32)] },
      {
        inst: 'strings', gain: 0.8, send: 0.6,
        notes: [
          ...repeat([[0, 0.25, midi('D4'), 0.45], [0.25, 0.25, midi('E4'), 0.4], [0.5, 0.25, midi('F4'), 0.45], [0.75, 0.25, midi('E4'), 0.4],
            [1, 0.25, midi('D4'), 0.45], [1.25, 0.25, midi('E4'), 0.4], [1.5, 0.25, midi('F4'), 0.45], [1.75, 0.25, midi('G4'), 0.4],
            [2, 0.25, midi('A4'), 0.5], [2.25, 0.25, midi('G4'), 0.4], [2.5, 0.25, midi('F4'), 0.45], [2.75, 0.25, midi('E4'), 0.4],
            [3, 0.5, midi('D4'), 0.5], [3.5, 0.5, midi('C#4'), 0.45]], 12, 4, 0),
        ],
      },
      { inst: 'horn', gain: 0.8, send: 0.6, notes: [...line(8, [[2, 'A3'], [2, 'Bb3'], [4, 'A3']], { vel: 0.8 }), ...line(24, [[2, 'D4'], [2, 'C4'], [4, 'A3']], { vel: 0.85 }), ...line(40, [[4, 'F4'], [4, 'E4']], { vel: 0.9 })] },
      { inst: 'timpani', gain: 0.85, send: 0.35, notes: repeat([[0, 0.5, 50, 0.9], [1.5, 0.4, 45, 0.5], [3, 0.4, 50, 0.7]], 12, 4, 0) },
      { inst: 'choir', gain: 0.35, send: 0.9, notes: [...chord(32, 12, ['D3', 'A3', 'F4'], 0.5)] },
    ],
  },

  /** Trench run: fast ostinato, brass stabs, drums. */
  battle: {
    bpm: 148,
    tracks: [
      {
        inst: 'strings', gain: 0.85, send: 0.35,
        notes: repeat([
          [0, 0.5, midi('D3'), 0.65], [0.5, 0.5, midi('D3'), 0.5], [1, 0.5, midi('F3'), 0.6], [1.5, 0.5, midi('D3'), 0.5],
          [2, 0.5, midi('G3'), 0.6], [2.5, 0.5, midi('D3'), 0.5], [3, 0.5, midi('A3'), 0.65], [3.5, 0.5, midi('G3'), 0.5],
        ], 24, 4, 0),
      },
      {
        inst: 'brass', gain: 1.0, send: 0.4,
        notes: [
          ...line(8, [[1, 'D4'], [0.5, 'F4'], [0.5, 'G4'], [2, 'A4']], { vel: 1.0 }),
          ...line(16, [[1, 'A4'], [0.5, 'G4'], [0.5, 'F4'], [2, 'D4']], { vel: 1.0 }),
          ...line(32, [[1, 'F4'], [0.5, 'G4'], [0.5, 'A4'], [1, 'Bb4'], [1, 'A4']], { vel: 1.05 }),
          ...line(48, [[2, 'D5'], [1, 'C5'], [1, 'Bb4'], [2, 'A4'], [2, 'G4']], { vel: 1.1 }),
          ...chord(64, 2, ['D4', 'A4', 'D5'], 1.15),
          ...chord(72, 4, ['Bb3', 'F4', 'D5'], 1.1),
          ...chord(84, 6, ['D4', 'A4', 'F5'], 1.2),
        ],
      },
      { inst: 'lowBrass', gain: 0.9, send: 0.3, notes: repeat([[0, 1, midi('D2'), 0.9], [2, 1, midi('D2'), 0.8], [3, 0.5, midi('C2'), 0.7]], 24, 4, 0) },
      { inst: 'taiko', gain: 1.0, send: 0.25, notes: repeat([[0, 0.4, 55, 1.0], [1, 0.3, 55, 0.5], [2, 0.4, 50, 0.85], [3, 0.3, 55, 0.55], [3.5, 0.25, 55, 0.6]], 24, 4, 0) },
      { inst: 'snare', gain: 0.35, send: 0.3, notes: repeat([[0.75, 0.1, 60, 0.5], [1.75, 0.1, 60, 0.4], [2.75, 0.1, 60, 0.5], [3.25, 0.08, 60, 0.35], [3.625, 0.08, 60, 0.45]], 24, 4, 0) },
      { inst: 'cymbal', gain: 0.4, send: 0.5, notes: [[0, 2, 60, 0.7], [32, 2, 60, 0.6], [64, 2.5, 60, 0.9], [84, 3, 60, 1.0]] },
    ],
  },

  /** Victory: the theme, full brass, no apologies. */
  finale: {
    bpm: 96,
    tracks: [
      { inst: 'brass', gain: 1.1, send: 0.45, notes: [...chord(0, 2, ['D4', 'A4', 'D5'], 1.2), ...hopeMelody(4, { vel: 1.15 })] },
      { inst: 'horn', gain: 0.7, send: 0.5, notes: hopeHarmony(4, { vel: 0.6, transpose: -12 }) },
      { inst: 'strings', gain: 0.9, send: 0.55, notes: [...hopeHarmony(4, { vel: 0.7 }), ...chord(36, 10, ['C3', 'G3', 'C4', 'E4'], 0.85)] },
      { inst: 'lowBrass', gain: 0.85, send: 0.3, notes: [[0, 2, midi('D2'), 1.0], ...repeat([[0, 3.6, midi('C2'), 0.8]], 8, 4, 4), [36, 8, midi('C2'), 0.95]] },
      { inst: 'timpani', gain: 0.95, send: 0.35, notes: [[0, 1, 50, 1.1], ...repeat([[0, 0.6, 48, 0.9], [2, 0.5, 43, 0.6], [3.5, 0.3, 48, 0.5]], 8, 4, 4), [36, 1.6, 48, 1.2], [38, 1.4, 43, 1.0]] },
      { inst: 'cymbal', gain: 0.55, send: 0.6, notes: [[0, 2.5, 60, 1.0], [20, 2, 60, 0.6], [36, 4, 60, 1.1]] },
      { inst: 'harp', gain: 0.45, send: 0.6, notes: repeat([[0, 0.25, midi('C5'), 0.5], [0.25, 0.25, midi('E5'), 0.4], [0.5, 0.25, midi('G5'), 0.4], [0.75, 0.25, midi('C6'), 0.35]], 8, 4, 4) },
    ],
  },

  /** Quiet closing chord bed under the end titles. */
  endTitle: {
    bpm: 60,
    tracks: [
      { inst: 'pad', gain: 0.7, send: 0.8, notes: [...chord(0, 12, ['C2', 'G2', 'C3'], 0.6), ...chord(12, 14, ['F2', 'C3', 'A3'], 0.6)] },
      { inst: 'choir', gain: 0.5, send: 0.9, notes: [...chord(2, 10, ['C4', 'E4', 'G4'], 0.45), ...chord(13, 12, ['C4', 'F4', 'A4'], 0.45)] },
      { inst: 'bell', gain: 0.4, send: 0.8, notes: [[1, 3, midi('C6'), 0.5], [13, 3, midi('A5'), 0.45], [22, 4, midi('C6'), 0.4]] },
    ],
  },
};

/**
 * Schedules a music cue into an audio context.
 * @param {BaseAudioContext} ctx
 * @param {{dry: GainNode, wet: GainNode}} bus
 * @param {string} cueId
 * @param {number} when context time of beat 0
 * @param {object} opts { gain, skipBefore } -- skipBefore drops notes that
 *        would have started before the playhead (used when seeking).
 */
export function scheduleCue(ctx, bus, cueId, when, { gain = 1, skipBefore = -Infinity, fadeOut = null } = {}) {
  const cue = CUES[cueId];
  if (!cue) { console.warn('unknown cue', cueId); return 0; }
  const spb = 60 / cue.bpm;
  let last = 0;
  for (const track of cue.tracks) {
    const inst = INSTRUMENTS[track.inst];
    if (!inst) { console.warn('unknown instrument', track.inst); continue; }
    const trackGain = ctx.createGain();
    trackGain.gain.value = (track.gain ?? 1) * gain;
    trackGain.connect(bus.dry);
    if (track.send) {
      const send = ctx.createGain();
      send.gain.value = track.send;
      trackGain.connect(send);
      send.connect(bus.wet);
    }
    for (const [beat, durBeats, pitch, vel = 1] of track.notes) {
      const t = when + beat * spb;
      const dur = durBeats * spb;
      if (t + dur < skipBefore) continue;
      last = Math.max(last, beat * spb + dur);
      if (fadeOut !== null && beat * spb > fadeOut) continue;
      inst(ctx, trackGain, { when: Math.max(t, skipBefore), dur, freq: hz(pitch), vel });
    }
  }
  return last;
}

/** Length of a cue in seconds. */
export function cueLength(cueId) {
  const cue = CUES[cueId];
  if (!cue) return 0;
  const spb = 60 / cue.bpm;
  let last = 0;
  for (const track of cue.tracks) {
    for (const [beat, dur] of track.notes) last = Math.max(last, (beat + dur) * spb);
  }
  return last;
}
