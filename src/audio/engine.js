/**
 * Audio engine — buses, reverb, ducking and deterministic noise.
 *
 * Hard rule for this whole directory: every sound is scheduled ahead of time
 * against absolute times passed in by the caller. Nothing here reads
 * `ctx.currentTime`, nothing uses `setTimeout`/`setInterval`/rAF, and nothing
 * uses `Math.random()`. That is what lets the director render the finished
 * film through an `OfflineAudioContext` in a single pass and get exactly the
 * same mix as realtime playback.
 *
 *   const bus = createBus(ctx);
 *   scheduleScore(ctx, bus, sections);
 *   scheduleCues(ctx, bus, cues);
 *   for (const l of voiceLines()) bus.duckVoice(l.t, estimateLength(l));
 */

/* ------------------------------------------------------------------ *
 * Small deterministic helpers
 * ------------------------------------------------------------------ */

/** xorshift32. Same algorithm as `rng` in lego/bricks.js, kept local so the
 *  audio modules have no three.js dependency. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** FNV-1a over a list of numbers/strings -> a 32-bit seed. Lets every effect
 *  derive a stable seed from its own name and scheduled time. */
export function seedFrom(...parts) {
  let h = 0x811c9dc5;
  for (const p of parts) {
    const s = typeof p === 'number' ? (Math.round(p * 1000) + '') : String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h = Math.imul(h ^ 0x9e37, 0x01000193) >>> 0;
  }
  return h >>> 0 || 1;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const dbToGain = (db) => Math.pow(10, db / 20);
export const gainToDb = (g) => 20 * Math.log10(Math.max(1e-9, g));

/** Exponential ramps blow up on zero. Everything goes through these. */
const EPS = 1e-4;
export function setAt(param, t, v) { param.setValueAtTime(Math.max(v, 0) || 0, Math.max(0, t)); }
export function lin(param, t, v) { param.linearRampToValueAtTime(v, Math.max(0, t)); }
export function exp(param, t, v) { param.exponentialRampToValueAtTime(Math.max(EPS, v), Math.max(0, t)); }

/**
 * Percussive / plucked envelope: silence -> peak over `a`, exponential fall to
 * silence at `t + dur`. Returns the time it finishes.
 */
export function hit(param, t, peak, a, dur) {
  setAt(param, t, EPS);
  lin(param, t + a, peak);
  exp(param, t + dur, EPS * 0.5);
  setAt(param, t + dur + 0.002, 0);
  return t + dur + 0.002;
}

/**
 * Sustained ADSR. `dur` is the time from attack to the start of the release.
 * Returns the time the release finishes.
 */
export function adsr(param, t, peak, { a = 0.05, d = 0.12, s = 0.75, r = 0.25, dur = 1 } = {}) {
  const sus = Math.max(0.004, dur);
  setAt(param, t, 0);
  lin(param, t + Math.min(a, sus), peak);
  if (a + d < sus) {
    exp(param, t + a + d, Math.max(EPS, peak * s));
    setAt(param, t + sus, Math.max(EPS, peak * s));
  }
  exp(param, t + sus + r, EPS * 0.5);
  setAt(param, t + sus + r + 0.002, 0);
  return t + sus + r + 0.002;
}

/* ------------------------------------------------------------------ *
 * Note names
 * ------------------------------------------------------------------ */

const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

function nameToMidi(name) {
  const m = /^\s*([A-Ga-g])([#b s]*)(-?\d+)\s*$/.exec(String(name));
  if (!m) throw new Error('NOTE: bad note name "' + name + '"');
  let semis = PC[m[1].toLowerCase()];
  for (const c of m[2]) { if (c === '#' || c === 's') semis++; else if (c === 'b') semis--; }
  return semis + (parseInt(m[3], 10) + 1) * 12;
}

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * `NOTE('A2')` -> 110. Also usable as a namespace:
 *   NOTE.midi('Bb3')  -> 58
 *   NOTE.freq(58)     -> 233.08   (midi number -> Hz)
 *   NOTE.up('Bb3', 7) -> 'F4' midi
 *   NOTE.chord(58, NOTE.Q.maj7) -> [58, 62, 65, 69]
 */
export const NOTE = Object.assign(
  (name) => (typeof name === 'number' ? midiToFreq(name) : midiToFreq(nameToMidi(name))),
  {
    midi: (n) => (typeof n === 'number' ? n : nameToMidi(n)),
    freq: midiToFreq,
    up: (n, semis) => (typeof n === 'number' ? n : nameToMidi(n)) + semis,
    /** Chord qualities as semitone sets. */
    Q: {
      maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
      sus2: [0, 2, 7], sus4: [0, 5, 7], five: [0, 7],
      maj6: [0, 4, 7, 9], min6: [0, 3, 7, 9],
      maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10],
      m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9],
      add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
      maj9: [0, 4, 7, 11, 14], min9: [0, 3, 7, 10, 14], dom9: [0, 4, 7, 10, 14],
      dom7b9: [0, 4, 7, 10, 13], dom7s: [0, 5, 7, 10],
    },
    /** Modes as semitone offsets from the tonic, one octave. */
    SCALE: {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      hijaz: [0, 1, 4, 5, 7, 8, 10],       // phrygian dominant — the desert
      lydian: [0, 2, 4, 6, 7, 9, 11],
      harmMinor: [0, 2, 3, 5, 7, 8, 11],
    },
    chord: (root, quality) => quality.map((i) => (typeof root === 'number' ? root : nameToMidi(root)) + i),
    /** 1-indexed scale degree (8 = octave, 9 = ninth …) -> semitones. */
    degree: (deg, scale) => {
      const n = scale.length;
      const i = Math.round(deg) - 1;
      return scale[((i % n) + n) % n] + 12 * Math.floor(i / n);
    },
  },
);

/* ------------------------------------------------------------------ *
 * Deterministic buffers
 * ------------------------------------------------------------------ */

const bufCache = new WeakMap();
function cached(ctx, key, make) {
  let m = bufCache.get(ctx);
  if (!m) { m = new Map(); bufCache.set(ctx, m); }
  let b = m.get(key);
  if (!b) { b = make(); m.set(key, b); }
  return b;
}

/**
 * Seeded stereo white noise, DC-removed so nothing downstream picks up an
 * offset. Cached per (ctx, seconds, seed) — effects share buffers freely and
 * decorrelate by starting at different offsets instead.
 */
export function noiseBuffer(ctx, seconds = 2, seed = 1) {
  const secs = Math.max(1 / ctx.sampleRate, seconds);
  return cached(ctx, `n|${secs}|${seed}`, () => {
    const len = Math.max(1, Math.round(secs * ctx.sampleRate));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    const r = rng(seed);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let sum = 0;
      for (let i = 0; i < len; i++) { const v = r() * 2 - 1; d[i] = v; sum += v; }
      const mean = sum / len;
      for (let i = 0; i < len; i++) d[i] -= mean;
    }
    return buf;
  });
}

/**
 * A synthetic room: exponentially decaying seeded noise with a one-pole
 * absorption filter that closes as the tail dies, plus a handful of discrete
 * early reflections. Used by `createBus(..., {reverb: 'convolver'})`.
 */
export function impulseResponse(ctx, seconds = 2.4, decay = 2.6, seed = 7) {
  const secs = Math.max(0.05, seconds);
  return cached(ctx, `ir|${secs}|${decay}|${seed}`, () => {
    const sr = ctx.sampleRate;
    const len = Math.max(2, Math.round(secs * sr));
    const buf = ctx.createBuffer(2, len, sr);
    const r = rng(seed);
    const build = Math.max(1, Math.round(0.010 * sr));
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      let sum = 0;
      for (let i = 0; i < len; i++) {
        const frac = i / len;
        const a = 0.62 - 0.52 * frac;                 // darkens with age
        lp += a * ((r() * 2 - 1) - lp);
        const v = lp * Math.pow(1 - frac, decay) * Math.min(1, i / build);
        d[i] = v;
        sum += v;
      }
      const mean = sum / len;
      // Early reflections, mirrored between channels for a sense of width.
      const early = [[0.0071, 0.42], [0.0134, -0.33], [0.0192, 0.27],
                     [0.0271, -0.21], [0.0363, 0.17], [0.0478, -0.13]];
      let peak = 0;
      for (let i = 0; i < len; i++) { d[i] -= mean; }
      for (const [ms, amp] of early) {
        const idx = Math.round(ms * (ch ? 1.09 : 1) * sr);
        if (idx < len) d[idx] += amp * (ch ? -1 : 1);
      }
      for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
      if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
    }
    return buf;
  });
}

/**
 * Soft-knee clipper curve. Perfectly linear below `th`, asymptotic to
 * `ceiling` above it, so the master can never hand a sample past 0 dBFS to the
 * renderer even if a cue stack lands on one frame.
 */
export function softClipCurve(th = 0.7, ceiling = 0.97, n = 2049) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= th ? a : th + (1 - th) * Math.tanh((a - th) / (1 - th));
    c[i] = Math.sign(x) * y * ceiling;
  }
  return c;
}

/* ------------------------------------------------------------------ *
 * Reverb — feedback delay network, no convolution, no impulse files
 * ------------------------------------------------------------------ */

/** Schroeder allpass: y = -g·v + v[n-M], v = x + g·v[n-M]. */
function allpass(ctx, delayTime, g) {
  const input = ctx.createGain();
  const sum = ctx.createGain();
  const delay = ctx.createDelay(0.25);
  delay.delayTime.value = delayTime;
  const fb = ctx.createGain(); fb.gain.value = g;
  const ff = ctx.createGain(); ff.gain.value = -g;
  const output = ctx.createGain();
  input.connect(sum);
  sum.connect(delay);
  delay.connect(fb); fb.connect(sum);
  delay.connect(output);
  sum.connect(ff); ff.connect(output);
  return { input, output };
}

/**
 * Six damped comb filters per channel into two series allpasses. Delay lengths
 * are offset between channels so the two sides decorrelate. Every feedback
 * loop is far longer than one 128-sample render quantum, which is what Web
 * Audio requires for a cycle to be legal.
 */
function fdnReverb(ctx, { seconds = 2.6, damp = 6200, preDelay = 0.02, width = 0.024, drive = 0.10, seed = 1 } = {}) {
  const sr = ctx.sampleRate;
  const minDelay = 192 / sr;
  const input = ctx.createGain();
  input.channelCount = 1;
  input.channelCountMode = 'explicit';
  const output = ctx.createGain();

  const pre = ctx.createDelay(0.5); pre.delayTime.value = Math.max(minDelay, preDelay);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 170; hp.Q.value = 0.6;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8200; lp.Q.value = 0.6;
  input.connect(pre); pre.connect(hp); hp.connect(lp);

  const merger = ctx.createChannelMerger(2);
  const COMB = [0.02974, 0.03715, 0.04117, 0.04371, 0.05053, 0.05689];
  const AP = [0.00521, 0.00374];
  const r = rng(seed);

  for (let ch = 0; ch < 2; ch++) {
    const sum = ctx.createGain();
    sum.gain.value = drive;
    for (const base of COMB) {
      const dt = base * (1 + (ch ? width : 0)) * (1 + (r() - 0.5) * 0.012);
      const d = ctx.createDelay(0.25); d.delayTime.value = dt;
      const damper = ctx.createBiquadFilter();
      damper.type = 'lowpass'; damper.frequency.value = damp; damper.Q.value = 0.35;
      const fb = ctx.createGain();
      fb.gain.value = clamp(Math.pow(10, (-3 * dt) / seconds), 0, 0.93);
      lp.connect(d);
      d.connect(damper); damper.connect(fb); fb.connect(d);
      d.connect(sum);
    }
    let node = sum;
    for (const apt of AP) {
      const ap = allpass(ctx, Math.max(minDelay, apt * (1 + (ch ? width * 1.8 : 0))), 0.62);
      node.connect(ap.input);
      node = ap.output;
    }
    node.connect(merger, 0, ch);
  }
  merger.connect(output);
  return { input, output, kind: 'fdn' };
}

function convolverReverb(ctx, { seconds = 2.4, decay = 2.6, seed = 7 } = {}) {
  const input = ctx.createGain();
  const conv = ctx.createConvolver();
  conv.normalize = true;
  conv.buffer = impulseResponse(ctx, seconds, decay, seed);
  const output = ctx.createGain();
  input.connect(conv); conv.connect(output);
  return { input, output, kind: 'convolver' };
}

function makeReverb(ctx, kind, opts) {
  if (kind === 'convolver') return convolverReverb(ctx, opts);
  return fdnReverb(ctx, opts);
}

/* ------------------------------------------------------------------ *
 * The bus
 * ------------------------------------------------------------------ */

/**
 * Build the mix tree.
 *
 *   music  ─┐                      musicFx ─► hall ─► hallWet ─┐
 *           ├─► musicDuck ◄────────────────────────────────────┘
 *   sfx    ─┤                      fx      ─► room ─► roomWet ─┐
 *   voice  ─┤◄─────────────────────────────────────────────────┘
 *           └─► mix ─► compressor ─► soft clip ─► master ─► destination
 *
 * Sources connect their dry signal to `bus.music` / `bus.sfx` / `bus.voice`
 * and their reverb send to `bus.musicFx` / `bus.fx`. The send buses carry the
 * same fader value as their dry counterparts, so a send stays at a fixed
 * proportion of the dry level.
 *
 * @returns {{ctx, master, music, sfx, voice, duckVoice: (t0:number, dur:number, o?:object)=>void}}
 *          plus `mix`, `comp`, `limiter`, `fx`, `musicFx`, `hall`, `room`,
 *          `setMusicGain`, `duckWindows`, `nodeCount`.
 */
export function createBus(ctx, {
  musicGain = 0.55,
  sfxGain = 0.8,
  voiceGain = 1.0,
  masterGain = 1.0,
  seed = 90210,
  reverb = 'algorithmic',            // 'algorithmic' | 'convolver' | 'none'
  hallSeconds = 3.0,
  roomSeconds = 1.4,
  hallWet = 0.34,
  roomWet = 0.30,
  limiter = true,
  compress = true,
  duck = {},
} = {}) {
  const master = ctx.createGain();
  master.gain.value = masterGain;
  master.connect(ctx.destination);

  let tail = master;
  let shaper = null;
  if (limiter) {
    shaper = ctx.createWaveShaper();
    shaper.curve = softClipCurve(0.70, 0.97);
    shaper.oversample = '4x';
    shaper.connect(master);
    tail = shaper;
  }

  let comp = null;
  if (compress) {
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -15;
    comp.knee.value = 14;
    comp.ratio.value = 3;
    comp.attack.value = 0.006;
    comp.release.value = 0.24;
    comp.connect(tail);
    tail = comp;
  }

  const mix = ctx.createGain();
  mix.gain.value = 1;
  mix.connect(tail);

  // --- music -------------------------------------------------------
  const music = ctx.createGain(); music.gain.value = musicGain;
  const musicFx = ctx.createGain(); musicFx.gain.value = musicGain;
  const musicDuck = ctx.createGain(); musicDuck.gain.value = 1;
  music.connect(musicDuck);
  musicDuck.connect(mix);

  // --- sfx ---------------------------------------------------------
  const sfx = ctx.createGain(); sfx.gain.value = sfxGain;
  const fx = ctx.createGain(); fx.gain.value = sfxGain;
  sfx.connect(mix);

  // --- voice -------------------------------------------------------
  const voice = ctx.createGain(); voice.gain.value = voiceGain;
  voice.connect(mix);

  // --- reverb ------------------------------------------------------
  let hall = null;
  let room = null;
  if (reverb !== 'none') {
    hall = makeReverb(ctx, reverb === 'convolver' ? 'convolver' : 'fdn', {
      seconds: hallSeconds, decay: 2.4, damp: 5200, preDelay: 0.028,
      width: 0.026, drive: 0.10, seed,
    });
    const hw = ctx.createGain(); hw.gain.value = hallWet;
    musicFx.connect(hall.input); hall.output.connect(hw); hw.connect(musicDuck);
    hall.wet = hw;

    room = makeReverb(ctx, reverb === 'convolver' ? 'convolver' : 'fdn', {
      seconds: roomSeconds, decay: 3.0, damp: 7400, preDelay: 0.012,
      width: 0.019, drive: 0.10, seed: seed ^ 0x5bd1,
    });
    const rw = ctx.createGain(); rw.gain.value = roomWet;
    fx.connect(room.input); room.output.connect(rw); rw.connect(mix);
    room.wet = rw;
  }

  // --- narration ducking -------------------------------------------
  const D = { amount: 0.34, attack: 0.20, release: 0.45, lead: 0.12, ...duck };
  const windows = [];

  function rebuildDuck() {
    windows.sort((x, y) => x.a - y.a);
    const merged = [];
    for (const w of windows) {
      const last = merged[merged.length - 1];
      if (last && w.a - w.attack <= last.b + last.release + 0.05) {
        last.b = Math.max(last.b, w.b);
        last.amount = Math.min(last.amount, w.amount);
        last.release = Math.max(last.release, w.release);
      } else {
        merged.push({ ...w });
      }
    }
    const p = musicDuck.gain;
    p.cancelScheduledValues(0);
    p.setValueAtTime(1, 0);
    let prev = 0;
    for (const w of merged) {
      const t1 = Math.max(prev + 0.005, w.a - w.attack);
      const t2 = Math.max(t1 + 0.02, w.a);
      const t3 = Math.max(t2 + 0.02, w.b);
      const t4 = t3 + w.release;
      p.setValueAtTime(1, t1);
      p.linearRampToValueAtTime(w.amount, t2);
      p.setValueAtTime(w.amount, t3);
      p.linearRampToValueAtTime(1, t4);
      prev = t4;
    }
  }

  /**
   * Dip the music (and its reverb return) so a narration line sits on top.
   * Overlapping calls are merged, and the whole envelope is rebuilt from
   * scratch, so cues may be handed over in any order — as long as they are all
   * scheduled before rendering/playback starts, which is the offline contract.
   */
  function duckVoice(t0, dur, o = {}) {
    const w = {
      a: Math.max(0, t0 - (o.lead ?? D.lead)),
      b: Math.max(0, t0 + Math.max(0.05, dur)),
      amount: clamp(o.amount ?? D.amount, 0.02, 1),
      attack: o.attack ?? D.attack,
      release: o.release ?? D.release,
    };
    windows.push(w);
    rebuildDuck();
    return w.b + w.release;
  }

  return {
    ctx, master, music, sfx, voice, duckVoice,
    mix, comp, limiter: shaper, musicDuck,
    fx, musicFx, hall, room,
    reverbKind: reverb === 'none' ? 'none' : (hall ? hall.kind : 'none'),
    setMusicGain(v) { music.gain.value = v; musicFx.gain.value = v; },
    setSfxGain(v) { sfx.gain.value = v; fx.gain.value = v; },
    duckWindows: () => windows.slice(),
  };
}
