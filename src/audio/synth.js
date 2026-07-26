// ---------------------------------------------------------------------------
// Synthesis toolkit.  (owner: fable4)
//
// Everything the audio engine plays is generated at runtime with the Web
// Audio API - there are no audio files anywhere in the project. This module
// owns the shared raw material (noise AudioBuffers rendered once per context,
// procedurally generated reverb impulse responses) and the `Kit` helper that
// sound recipes use to wire oscillators, noise sources, filters and
// waveshapers into a voice with sample-accurate envelopes.
// ---------------------------------------------------------------------------

const MIN_GAIN = 0.0001; // exponential ramps cannot reach zero

// ------------------------------------------------------------- noise buffers

/** Per-context cache so buffers are rendered exactly once and reused. */
const bufferCache = new WeakMap();

/**
 * A 2-second looping mono noise buffer. Colors:
 *  - white:   flat spectrum, the basis of cracks and hiss
 *  - pink:    -3 dB/oct, natural for cloth / air / footfall
 *  - brown:   -6 dB/oct, rumbles, HVAC, storm
 *  - crackle: sparse random impulses, splinters / fire / electrical arcing
 */
export function noiseBuffer(ctx, color = 'white') {
  let store = bufferCache.get(ctx);
  if (!store) {
    store = {};
    bufferCache.set(ctx, store);
  }
  if (store[color]) return store[color];

  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);

  if (color === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (color === 'pink') {
    // Paul Kellet's economy pink filter.
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
    }
  } else if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
  } else if (color === 'crackle') {
    // Sparse impulses with tiny decaying tails.
    let i = 0;
    while (i < len) {
      if (Math.random() < 0.0035) {
        const amp = (Math.random() * 2 - 1) * (0.3 + Math.random() * 0.7);
        const tail = 8 + Math.floor(Math.random() * 40);
        for (let j = 0; j < tail && i + j < len; j++) {
          d[i + j] += amp * Math.pow(1 - j / tail, 2) * (Math.random() * 0.6 + 0.4);
        }
        i += tail;
      } else {
        i++;
      }
    }
  }
  store[color] = buf;
  return buf;
}

// -------------------------------------------------------- impulse responses

/**
 * Procedurally generated stereo reverb impulse response: exponentially
 * decaying noise with progressive one-pole low-pass damping (rooms get darker
 * as the tail dies), optional pre-delay, sparse early reflections and an
 * optional flutter comb for small parallel-walled rooms.
 *
 * @param {AudioContext} ctx
 * @param {object} p
 * @param {number} p.seconds     total tail length
 * @param {number} p.decay       exponent - higher dies faster at the start
 * @param {number} p.brightStart 0..1 low-pass openness at t=0
 * @param {number} p.brightEnd   0..1 low-pass openness at the very end
 * @param {number} p.predelayMs  silence before the diffuse tail
 * @param {number} p.earlyMs     spacing of a handful of early reflections
 * @param {number} p.flutterMs   comb period for flutter echo (0 = off)
 */
export function impulseResponse(ctx, {
  seconds = 1.2,
  decay = 2.6,
  brightStart = 0.7,
  brightEnd = 0.12,
  predelayMs = 6,
  earlyMs = 11,
  flutterMs = 0,
} = {}) {
  const rate = ctx.sampleRate;
  const len = Math.max(64, Math.floor(rate * seconds));
  const pre = Math.floor(rate * predelayMs / 1000);
  const buf = ctx.createBuffer(2, len + pre, rate);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const envelope = Math.pow(1 - t, decay);
      const openness = brightStart + (brightEnd - brightStart) * t;
      let s = (Math.random() * 2 - 1) * envelope;
      if (flutterMs > 0) {
        const period = rate * flutterMs / 1000;
        s *= 0.55 + 0.45 * Math.abs(Math.sin(Math.PI * i / period));
      }
      lp += Math.min(1, openness) * (s - lp);
      d[i + pre] = lp;
    }
    // Early reflections: a few discrete taps ahead of the diffuse body.
    for (let e = 1; e <= 4; e++) {
      const at = pre + Math.floor(rate * (earlyMs * e + (ch ? 1.7 : 0)) / 1000);
      if (at < d.length) d[at] += (0.5 / e) * (Math.random() * 0.4 + 0.8);
    }
  }
  return buf;
}

// ------------------------------------------------------------------ helpers

/**
 * Schedule an envelope on an AudioParam as [timeOffset, value] pairs.
 * Exponential by default (natural for loudness), values clamped above zero.
 */
export function scheduleEnv(param, t0, points, { exp = true } = {}) {
  if (!points || !points.length) return;
  param.cancelScheduledValues(t0);
  param.setValueAtTime(Math.max(points[0][1], MIN_GAIN), t0 + points[0][0]);
  for (let i = 1; i < points.length; i++) {
    const [t, v] = points[i];
    if (exp) param.exponentialRampToValueAtTime(Math.max(v, MIN_GAIN), t0 + t);
    else param.linearRampToValueAtTime(v, t0 + t);
  }
}

/** Frequency trajectory as [timeOffset, hz] pairs (exponential glides). */
export function scheduleFreq(param, t0, points) {
  param.setValueAtTime(Math.max(points[0][1], 1), t0 + points[0][0]);
  for (let i = 1; i < points.length; i++) {
    const [t, v] = points[i];
    param.exponentialRampToValueAtTime(Math.max(v, 1), t0 + t);
  }
}

const shaperCache = new WeakMap();

/** Cached tanh drive curve; `k` sets hardness. */
export function driveCurve(ctx, k = 6) {
  let store = shaperCache.get(ctx);
  if (!store) {
    store = new Map();
    shaperCache.set(ctx, store);
  }
  const key = Math.round(k * 10);
  if (store.has(key)) return store.get(key);
  const n = 512;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  store.set(key, curve);
  return curve;
}

// ---------------------------------------------------------------------- Kit

/**
 * Per-trigger construction toolkit handed to every sound recipe.
 *
 * A recipe receives a Kit wired to the voice's output gain and calls osc() /
 * noise() / chain() to build its layers. Every source is start/stop scheduled
 * up front so nothing can run away, and the Kit tracks the latest stop time
 * so the engine knows when the voice can be reclaimed. `pitch` is a global
 * multiplier applied to oscillator frequencies and noise playback rates,
 * which is how per-trigger randomisation keeps repeats from machine-gunning.
 */
export class Kit {
  constructor(ctx, out, t0, { pitch = 1, rng = Math.random } = {}) {
    this.ctx = ctx;
    this.out = out;
    this.t = t0;
    this.pitch = pitch;
    this.rng = rng;
    this.sources = [];
    this.end = t0;
  }

  rand(a = 0, b = 1) {
    return a + (b - a) * this.rng();
  }

  pick(arr) {
    return arr[Math.floor(this.rng() * arr.length) % arr.length];
  }

  jitter(v, amount = 0.06) {
    return v * (1 + (this.rng() * 2 - 1) * amount);
  }

  _track(src, stopAt) {
    this.sources.push(src);
    if (stopAt > this.end) this.end = stopAt;
  }

  /** Hard-stop every scheduled source (used for voice stealing / loops). */
  stopAll(when = this.ctx.currentTime + 0.03) {
    for (const s of this.sources) {
      try { s.stop(when); } catch { /* already stopped */ }
    }
  }

  gainNode(v = 1) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }

  /**
   * Biquad with optional frequency glide. Filter frequencies are NOT pitch
   * scaled (formants and body resonances stay put while pitch jitters).
   */
  filter(type, freq, Q = 1, { at = 0, glideTo = null, glideDur = 0.1 } = {}) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = Q;
    if (glideTo != null) {
      f.frequency.setValueAtTime(Math.max(freq, 1), this.t + at);
      f.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), this.t + at + glideDur);
    } else {
      f.frequency.value = freq;
    }
    return f;
  }

  shaper(k = 6) {
    const s = this.ctx.createWaveShaper();
    s.curve = driveCurve(this.ctx, k);
    return s;
  }

  /** Chain nodes left to right and connect the last one to the voice out. */
  chain(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    nodes[nodes.length - 1].connect(this.out);
    return nodes[0];
  }

  /**
   * Envelope-shaped oscillator layer.
   * env: [[t, gain]...] relative to (this.t + at). freqEnv: [[t, hz]...].
   */
  osc({
    type = 'sine', freq = 440, detune = 0, at = 0, dur = 0.25, gain = 1,
    env = null, freqEnv = null, dest = null, noPitch = false,
  } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    const scale = noPitch ? 1 : this.pitch;
    const t = this.t + at;
    if (freqEnv) scheduleFreq(o.frequency, t, freqEnv.map(([tt, hz]) => [tt, hz * scale]));
    else o.frequency.value = Math.max(1, freq * scale);
    if (detune) o.detune.value = detune;
    const g = this.ctx.createGain();
    scheduleEnv(g.gain, t, env || [[0, MIN_GAIN], [0.004, gain], [dur, MIN_GAIN]]);
    o.connect(g);
    g.connect(dest || this.out);
    o.start(t);
    o.stop(t + dur + 0.06);
    this._track(o, t + dur + 0.06);
    return g;
  }

  /** Envelope-shaped looping noise layer with random loop phase. */
  noise({
    color = 'white', at = 0, dur = 0.3, rate = 1, gain = 1,
    env = null, dest = null, noPitch = false,
  } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx, color);
    src.loop = true;
    src.playbackRate.value = rate * (noPitch ? 1 : this.pitch);
    const g = this.ctx.createGain();
    const t = this.t + at;
    scheduleEnv(g.gain, t, env || [[0, MIN_GAIN], [0.004, gain], [dur, MIN_GAIN]]);
    src.connect(g);
    g.connect(dest || this.out);
    src.start(t, this.rand(0, 1.6));
    src.stop(t + dur + 0.06);
    this._track(src, t + dur + 0.06);
    return g;
  }

  // ------------------------------------------------- composite conveniences

  /** Pitched body thump: oscillator gliding down, the "weight" layer. */
  thump({ freq0 = 180, freq1 = 52, dur = 0.14, gain = 1, at = 0, type = 'sine', dest = null } = {}) {
    return this.osc({
      type, at, dur, gain, dest,
      freqEnv: [[0, freq0], [dur * 0.85, freq1]],
      env: [[0, MIN_GAIN], [0.003, gain], [dur, MIN_GAIN]],
    });
  }

  /** Band-passed noise click - latch taps, keys, mechanical contact. */
  click({ freq = 2400, Q = 2.2, dur = 0.03, gain = 0.7, at = 0, color = 'white' } = {}) {
    const f = this.chain(this.filter('bandpass', this.jitter(freq, 0.1), Q));
    return this.noise({ color, at, dur, gain, dest: f });
  }

  /** Resonant decaying sine ping - metal rings, chimes, glass edges. */
  ping({ freq = 1200, dur = 0.25, gain = 0.5, at = 0, type = 'sine', dest = null } = {}) {
    return this.osc({
      type, at, dur, gain, dest, freq,
      env: [[0, MIN_GAIN], [0.002, gain], [dur, MIN_GAIN]],
    });
  }
}
