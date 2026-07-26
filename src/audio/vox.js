// ---------------------------------------------------------------------------
// Character vocalisations.  (owner: fable4)
//
// No speech, no samples: every bark, sob and grunt is a formant synthesiser.
// A glottal source (two detuned sawtooths + a breath-noise layer) is pushed
// through three parallel band-pass "formant" filters whose centres travel
// between vowel targets. Utterances are shaped as wordless syllable gates
// with a pitch contour and an emotional posture (tense = waveshaper drive,
// breath = noise mix). Dialogue meaning arrives via UI subtitles; these only
// carry the emotional shape.
// ---------------------------------------------------------------------------

import { def } from './sfx.js';

const MIN = 0.0001;

/** Formant targets [F1, F2, F3] in Hz for an adult male tract. */
const VOWELS = {
  a: [730, 1090, 2440],
  e: [530, 1840, 2480],
  i: [390, 1990, 2550],
  o: [570, 840, 2410],
  u: [440, 1020, 2240],
  uh: [640, 1190, 2390], // open schwa - grunts
};
const F_GAIN = [1.0, 0.5, 0.25];
const F_Q = [8, 10, 11];

/**
 * Render one utterance into the kit.
 *
 * @param {import('./synth.js').Kit} k
 * @param {object} p
 * @param {number}  p.f0        base pitch in Hz
 * @param {Array}   p.contour   [[t01, pitchMult]] over the whole utterance
 * @param {Array}   p.syl       [{at, dur, vowel, amp}] glottal gates (seconds)
 * @param {number}  p.dur       total seconds
 * @param {number}  p.breath    0..1 noise mix
 * @param {number}  p.tense     0..1 waveshaper drive (strain / shouting)
 * @param {number}  p.scale     formant scale (1 = male, ~1.18 = smaller tract)
 * @param {object}  p.tremor    {rate, depth01} pitch tremor
 * @param {number}  p.gain      overall level
 * @param {AudioNode} [p.dest]  output override (for radio processing)
 */
export function vocal(k, {
  f0 = 130, contour = [[0, 1], [1, 0.85]], syl = [{ at: 0, dur: 0.3, vowel: 'a', amp: 1 }],
  dur = 0.5, breath = 0.25, tense = 0.4, scale = 1, tremor = null, gain = 1, dest = null,
} = {}) {
  const ctx = k.ctx;
  const t0 = k.t;
  const out = dest || k.out;

  // --- output posture: mix -> (drive) -> out
  const mix = ctx.createGain();
  mix.gain.value = gain * (0.5 + 0.5 * (1 - breath * 0.5));
  if (tense > 0.15) {
    const drive = k.shaper(2 + tense * 8);
    const trim = k.gainNode(1 / (1 + tense * 0.9));
    mix.connect(drive); drive.connect(trim); trim.connect(out);
  } else {
    mix.connect(out);
  }

  // --- formant bank (parallel band-passes into the mix)
  const formants = [];
  for (let i = 0; i < 3; i++) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = F_Q[i];
    const g = ctx.createGain();
    g.gain.value = F_GAIN[i] * 2.6;
    f.connect(g); g.connect(mix);
    formants.push(f);
  }

  // --- glottal source: two detuned saws through the syllable gate
  const gate = ctx.createGain();
  gate.gain.value = MIN;
  for (const f of formants) gate.connect(f);

  const basePitch = f0 * k.jitter(1, 0.07);
  for (const [type, det, g] of [['sawtooth', 0, 0.6], ['sawtooth', 9, 0.28]]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.detune.value = det;
    o.frequency.setValueAtTime(Math.max(30, basePitch * contour[0][1]), t0);
    for (let i = 1; i < contour.length; i++) {
      const [tt, m] = contour[i];
      o.frequency.exponentialRampToValueAtTime(Math.max(30, basePitch * m), t0 + tt * dur);
    }
    if (tremor) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = tremor.rate * k.jitter(1, 0.1);
      const depth = ctx.createGain();
      depth.gain.value = basePitch * (tremor.depth01 ?? 0.04);
      lfo.connect(depth); depth.connect(o.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.1);
      k._track(lfo, t0 + dur + 0.1);
    }
    const og = ctx.createGain();
    og.gain.value = g;
    o.connect(og); og.connect(gate);
    o.start(t0); o.stop(t0 + dur + 0.1);
    k._track(o, t0 + dur + 0.1);
  }

  // --- breath layer through its own gate (louder relative mix when breathy)
  const breathGate = ctx.createGain();
  breathGate.gain.value = MIN;
  for (const f of formants) breathGate.connect(f);
  k.noise({ color: 'pink', dur: dur + 0.05, gain: 1, dest: breathGate, noPitch: true, env: [[0, 1], [dur + 0.05, 1]] });

  // --- syllable gates + vowel trajectories
  const gateEnv = [[0, MIN]];
  const breathEnv = [[0, MIN]];
  for (const s of syl) {
    const at = s.at * k.jitter(1, 0.08);
    const sd = s.dur * k.jitter(1, 0.1);
    const amp = (s.amp ?? 1);
    gateEnv.push([Math.max(0.001, at), MIN], [at + 0.025, amp], [at + sd * 0.7, amp * 0.75], [at + sd, MIN]);
    breathEnv.push([Math.max(0.001, at), MIN], [at + 0.02, amp * breath], [at + sd, Math.max(MIN, amp * breath * 0.4)]);
    const v = VOWELS[s.vowel] || VOWELS.a;
    for (let i = 0; i < 3; i++) {
      formants[i].frequency.setTargetAtTime(v[i] * scale * k.jitter(1, 0.05), t0 + at, 0.045);
    }
  }
  // Ensure envelope point times are strictly increasing before scheduling.
  const clean = (pts) => {
    let last = -1;
    const outPts = [];
    for (const [t, v] of pts) {
      const tt = t <= last ? last + 0.004 : t;
      outPts.push([tt, v]);
      last = tt;
    }
    return outPts;
  };
  applyEnv(gate.gain, t0, clean(gateEnv));
  applyEnv(breathGate.gain, t0, clean(breathEnv));

  return dur;
}

function applyEnv(param, t0, pts) {
  param.setValueAtTime(Math.max(pts[0][1], MIN), t0 + pts[0][0]);
  for (let i = 1; i < pts.length; i++) {
    param.exponentialRampToValueAtTime(Math.max(pts[i][1], MIN), t0 + pts[i][0]);
  }
}

// ===========================================================================
// Registrations
// ===========================================================================

const ENEMY_META = { bus: 'voice', priority: 3, hrtf: true, ref: 2.2, max: 34, duck: true };
const HOSTAGE_META = { bus: 'voice', priority: 3, hrtf: true, ref: 1.8, max: 20, duck: true };

/** Convenience: n syllables spread over dur with the given vowels. */
function syllables(vowels, dur, { gapRatio = 0.35, amps = null } = {}) {
  const n = vowels.length;
  const slot = dur / n;
  return vowels.map((v, i) => ({
    at: i * slot,
    dur: slot * (1 - gapRatio),
    vowel: v,
    amp: amps ? amps[i] : (i === 0 ? 1 : 0.85),
  }));
}

// --- hostile barks ----------------------------------------------------------
// Aggressive military shouts: low pitch, hard attack, falling contours.

def('voice_enemy_contact', ENEMY_META, (k) => vocal(k, {
  f0: 138, dur: 0.55, tense: 0.85, breath: 0.15,
  contour: [[0, 1.3], [0.4, 1.05], [1, 0.78]],
  syl: syllables(['o', 'a'], 0.55, { amps: [1, 1.1] }),
  gain: 1.15,
}));
def('voice_enemy_suspicious', ENEMY_META, (k) => vocal(k, {
  f0: 126, dur: 0.7, tense: 0.35, breath: 0.3,
  contour: [[0, 0.95], [0.7, 1.0], [1, 1.22]], // rising question
  syl: syllables(['u', 'e', 'a'], 0.7, { amps: [0.8, 0.85, 1] }),
}));
def('voice_enemy_investigate', ENEMY_META, (k) => vocal(k, {
  f0: 124, dur: 0.75, tense: 0.3, breath: 0.3,
  contour: [[0, 1.05], [1, 0.85]],
  syl: syllables(['e', 'i', 'a', 'u'], 0.75),
}));
def('voice_enemy_searching', ENEMY_META, (k) => vocal(k, {
  f0: 132, dur: 0.8, tense: 0.55, breath: 0.2,
  contour: [[0, 1.15], [0.5, 1.0], [1, 0.9]],
  syl: syllables(['e', 'i', 'e', 'o'], 0.8, { gapRatio: 0.42 }),
}));
def('voice_enemy_lost', ENEMY_META, (k) => vocal(k, {
  f0: 128, dur: 0.7, tense: 0.4, breath: 0.35,
  contour: [[0, 1.0], [0.6, 1.1], [1, 1.3]],
  syl: syllables(['e', 'i', 'o'], 0.7),
}));
def('voice_enemy_clear', ENEMY_META, (k) => vocal(k, {
  f0: 120, dur: 0.65, tense: 0.2, breath: 0.4,
  contour: [[0, 1.05], [1, 0.8]],
  syl: syllables(['a', 'i', 'u'], 0.65, { amps: [1, 0.8, 0.7] }),
}));
def('voice_enemy_reload', ENEMY_META, (k) => vocal(k, {
  f0: 136, dur: 0.7, tense: 0.7, breath: 0.18,
  contour: [[0, 1.2], [0.5, 1.05], [1, 0.9]],
  syl: syllables(['i', 'o', 'i'], 0.7, { amps: [1.05, 1, 0.9] }),
}));
def('voice_enemy_moving', ENEMY_META, (k) => vocal(k, {
  f0: 140, dur: 0.5, tense: 0.7, breath: 0.15,
  contour: [[0, 1.1], [0.6, 1.25], [1, 1.0]],
  syl: syllables(['u', 'a'], 0.5, { amps: [0.95, 1.1] }),
}));
def('voice_enemy_flank', ENEMY_META, (k) => vocal(k, {
  f0: 134, dur: 0.75, tense: 0.65, breath: 0.2,
  contour: [[0, 1.2], [0.4, 1.0], [1, 0.85]],
  syl: syllables(['o', 'a', 'i'], 0.75),
}));
def('voice_enemy_suppress', ENEMY_META, (k) => vocal(k, {
  f0: 142, dur: 0.8, tense: 0.85, breath: 0.12,
  contour: [[0, 1.25], [0.5, 1.1], [1, 0.9]],
  syl: syllables(['u', 'e', 'i'], 0.8, { amps: [1.1, 1, 1] }),
  gain: 1.1,
}));
def('voice_enemy_cover', ENEMY_META, (k) => vocal(k, {
  f0: 132, dur: 0.5, tense: 0.6, breath: 0.2,
  contour: [[0, 1.15], [1, 0.85]],
  syl: syllables(['a', 'o'], 0.5),
}));
def('voice_enemy_hit', { ...ENEMY_META, priority: 3 }, (k) => vocal(k, {
  // clenched pain grunt - short, spiking, strangled
  f0: 150, dur: 0.18, tense: 0.95, breath: 0.3,
  contour: [[0, 1.45], [0.3, 1.2], [1, 0.75]],
  syl: [{ at: 0, dur: 0.16, vowel: 'uh', amp: 1.2 }],
  gain: 1.1,
}));
def('voice_enemy_down', ENEMY_META, (k) => vocal(k, {
  f0: 140, dur: 0.6, tense: 0.8, breath: 0.2,
  contour: [[0, 1.3], [0.5, 1.05], [1, 0.75]],
  syl: syllables(['a', 'o'], 0.6, { amps: [1, 1.15] }),
  gain: 1.15,
}));
def('voice_enemy_blinded', ENEMY_META, (k) => vocal(k, {
  // panicked, higher, fast repeated syllables
  f0: 156, dur: 0.9, tense: 0.75, breath: 0.35,
  contour: [[0, 1.3], [0.5, 1.35], [1, 1.1]],
  syl: syllables(['a', 'i', 'a', 'i'], 0.9, { gapRatio: 0.45 }),
  tremor: { rate: 9, depth01: 0.05 },
}));
def('voice_enemy_retreat', ENEMY_META, (k) => vocal(k, {
  f0: 130, dur: 0.8, tense: 0.6, breath: 0.35,
  contour: [[0, 1.2], [0.6, 0.95], [1, 0.8]],
  syl: syllables(['o', 'i', 'a'], 0.8),
  tremor: { rate: 7, depth01: 0.03 },
}));

// Radio calls: same shout pushed through a small speaker - narrow band-pass,
// hard drive, squelch clicks either side.
function radioVoice(k, params) {
  const band = k.chain(k.filter('bandpass', 1400, 0.5), k.shaper(10), k.gainNode(0.7));
  k.click({ freq: 2400, Q: 3, dur: 0.02, gain: 0.18 });
  const dur = vocal(k, { ...params, dest: band });
  k.click({ at: dur + 0.06, freq: 2000, Q: 3, dur: 0.02, gain: 0.14 });
  // faint carrier hiss under the voice
  const hiss = k.chain(k.filter('bandpass', 3000, 1), k.gainNode(0.05));
  k.noise({ dur: dur + 0.1, gain: 1, dest: hiss, noPitch: true });
}
def('voice_enemy_radio', ENEMY_META, (k) => radioVoice(k, {
  f0: 132, dur: 0.95, tense: 0.6, breath: 0.2,
  contour: [[0, 1.1], [0.5, 1.0], [1, 0.85]],
  syl: syllables(['o', 'e', 'a', 'u'], 0.95),
}));
def('voice_enemy_loud', ENEMY_META, (k) => radioVoice(k, {
  f0: 140, dur: 0.85, tense: 0.8, breath: 0.15,
  contour: [[0, 1.25], [0.5, 1.05], [1, 0.85]],
  syl: syllables(['a', 'i', 'a'], 0.85, { amps: [1.1, 1, 1.05] }),
}));

def('enemy_death', { ...ENEMY_META, priority: 3, max: 30 }, (k) => {
  vocal(k, {
    // falling groan collapsing into breath
    f0: 126, dur: 0.85, tense: 0.5, breath: 0.75,
    contour: [[0, 1.2], [0.35, 0.95], [1, 0.55]],
    syl: [
      { at: 0, dur: 0.3, vowel: 'uh', amp: 1.1 },
      { at: 0.34, dur: 0.45, vowel: 'o', amp: 0.7 },
    ],
    tremor: { rate: 6, depth01: 0.05 },
  });
  // body handled by effects; add the gear hitting the floor
  k.thump({ at: 0.5, freq0: 150, freq1: 60, dur: 0.09, gain: 0.4 });
});

// --- player ------------------------------------------------------------------
def('voice_player_hurt', { bus: 'voice', priority: 3, max: 1e9 }, (k) => vocal(k, {
  f0: 118, dur: 0.16, tense: 0.9, breath: 0.5,
  contour: [[0, 1.35], [1, 0.8]],
  syl: [{ at: 0, dur: 0.14, vowel: 'uh', amp: 0.9 }],
  gain: 0.7,
}));

// --- hostages ------------------------------------------------------------------
// Smaller, higher, breathier tract; fear reads as tremor + breath.

def('voice_hostage_breathing', HOSTAGE_META, (k) => {
  // fear breathing: two shaky noise-only cycles through the formant bank
  vocal(k, {
    f0: 230, dur: 2.0, tense: 0, breath: 1,
    contour: [[0, 1], [1, 1]],
    syl: [
      { at: 0.05, dur: 0.5, vowel: 'i', amp: 0.5 },
      { at: 0.7, dur: 0.28, vowel: 'u', amp: 0.4 },
      { at: 1.15, dur: 0.5, vowel: 'i', amp: 0.55 },
      { at: 1.75, dur: 0.22, vowel: 'u', amp: 0.4 },
    ],
    scale: 1.16, gain: 0.55, tremor: { rate: 7.5, depth01: 0.02 },
  });
});
def('voice_hostage_sob', HOSTAGE_META, (k) => vocal(k, {
  // three little rising-falling whimpers
  f0: 252, dur: 1.05, tense: 0.15, breath: 0.65,
  contour: [[0, 1.05], [0.3, 1.2], [0.6, 1.0], [1, 0.85]],
  syl: [
    { at: 0, dur: 0.2, vowel: 'i', amp: 0.8 },
    { at: 0.32, dur: 0.22, vowel: 'e', amp: 0.95 },
    { at: 0.68, dur: 0.3, vowel: 'u', amp: 0.7 },
  ],
  scale: 1.18, gain: 0.7, tremor: { rate: 6.2, depth01: 0.06 },
}));
def('voice_hostage_scared', HOSTAGE_META, (k) => vocal(k, {
  // sharp frightened intake + cry
  f0: 265, dur: 0.5, tense: 0.4, breath: 0.55,
  contour: [[0, 1.35], [0.4, 1.15], [1, 0.9]],
  syl: [{ at: 0.05, dur: 0.38, vowel: 'a', amp: 1 }],
  scale: 1.18, gain: 0.85, tremor: { rate: 8, depth01: 0.05 },
}));
def('voice_hostage_relieved', HOSTAGE_META, (k) => vocal(k, {
  // long exhale settling downward: "oh, thank god" without the words
  f0: 235, dur: 1.0, tense: 0.05, breath: 0.6,
  contour: [[0, 1.15], [0.4, 1.0], [1, 0.8]],
  syl: [
    { at: 0, dur: 0.42, vowel: 'o', amp: 0.9 },
    { at: 0.5, dur: 0.42, vowel: 'a', amp: 0.6 },
  ],
  scale: 1.16, gain: 0.8,
}));
def('voice_hostage_follow', HOSTAGE_META, (k) => vocal(k, {
  // quick tight assent
  f0: 245, dur: 0.4, tense: 0.2, breath: 0.4,
  contour: [[0, 1.0], [0.5, 1.18], [1, 1.05]],
  syl: syllables(['u', 'e'], 0.4, { amps: [0.7, 0.9] }),
  scale: 1.17, gain: 0.7,
}));
def('voice_hostage_wait', HOSTAGE_META, (k) => vocal(k, {
  f0: 238, dur: 0.5, tense: 0.15, breath: 0.45,
  contour: [[0, 1.1], [1, 0.9]],
  syl: syllables(['o', 'e'], 0.5),
  scale: 1.17, gain: 0.65,
}));
def('voice_hostage_death', { ...HOSTAGE_META, priority: 4 }, (k) => vocal(k, {
  f0: 255, dur: 0.9, tense: 0.45, breath: 0.7,
  contour: [[0, 1.35], [0.3, 1.1], [1, 0.55]],
  syl: [
    { at: 0, dur: 0.28, vowel: 'a', amp: 1.05 },
    { at: 0.34, dur: 0.5, vowel: 'o', amp: 0.6 },
  ],
  scale: 1.18, gain: 0.95, tremor: { rate: 6, depth01: 0.07 },
}));
