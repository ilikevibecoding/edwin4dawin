/**
 * Low-level synthesis helpers shared by every sound builder.
 *
 * Everything here works on both a live AudioContext and an OfflineAudioContext (used by
 * AudioSystem.renderPreview), so the same builder code is verified headless and played live.
 * Buffers (noise, impulse responses) are cached per context because sample rates may differ.
 */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
/** Random multiplier in [1-s, 1+s] — used for per-instance pitch/gain variation. */
export const vary = (s) => 1 + (Math.random() * 2 - 1) * s;

const NOISE_SECONDS = 2;
const noiseCache = new WeakMap();

/**
 * Looping stereo noise buffer (decorrelated channels), cached per context.
 * kind: 'white' (flat) | 'pink' (-3 dB/oct, Paul Kellet filter) | 'brown' (-6 dB/oct)
 */
export function getNoiseBuffer(ctx, kind = 'white') {
  let cache = noiseCache.get(ctx);
  if (!cache) {
    cache = {};
    noiseCache.set(ctx, cache);
  }
  if (cache[kind]) return cache[kind];
  const n = Math.ceil(ctx.sampleRate * NOISE_SECONDS);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    if (kind === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    } else {
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
  }
  cache[kind] = buf;
  return buf;
}

// Early reflections of a stone plaza: [seconds, gain]. Direct sound is the dry signal, not part of the IR.
const EARLY_REFLECTIONS = [
  [0.011, 0.55],
  [0.019, 0.42],
  [0.027, 0.36],
  [0.041, 0.3],
  [0.058, 0.24],
  [0.083, 0.2],
  [0.117, 0.14],
];

/**
 * Procedural outdoor impulse response: decaying noise whose one-pole low-pass drifts darker over time
 * (high frequencies die first), preceded by a handful of discrete early reflections.
 */
export function makeImpulseResponse(ctx, { seconds = 2.5, decay = 3.4, predelay = 0.012, early = EARLY_REFLECTIONS, lpStart = 0.85, lpEnd = 0.07 } = {}) {
  const sr = ctx.sampleRate;
  const n = Math.ceil(sr * seconds);
  const buf = ctx.createBuffer(2, n, sr);
  const pd = Math.floor(predelay * sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let y = 0;
    for (let i = pd; i < n; i++) {
      const t = (i - pd) / sr;
      const u = Math.min(1, (t / seconds) * 1.6);
      const a = lpStart + (lpEnd - lpStart) * u; // one-pole coefficient: 1 = no filtering
      const env = Math.exp(-decay * t) * Math.min(1, t / 0.03); // let early reflections dominate the first 30 ms
      const w = (Math.random() * 2 - 1) * env;
      y += a * (w - y);
      d[i] = y;
    }
    for (const [tm, gn] of early) {
      const idx = pd + Math.floor((tm + (ch ? 0.0006 : 0) + Math.random() * 0.0004) * sr);
      if (idx + 2 < n) {
        const s = Math.random() < 0.5 ? -1 : 1;
        d[idx] += gn * s;
        d[idx + 1] += gn * s * 0.6;
        d[idx + 2] += gn * s * 0.25;
      }
    }
  }
  return buf;
}

const irCache = new WeakMap();
export function getImpulseResponse(ctx) {
  let ir = irCache.get(ctx);
  if (!ir) {
    ir = makeImpulseResponse(ctx);
    irCache.set(ctx, ir);
  }
  return ir;
}

let softClip = null;
/**
 * Soft-knee limiter curve: unity below `knee`, tanh squash above it, asymptote at 1.0.
 * Unlike a plain tanh drive this does not colour normal-level material — it only rounds peaks.
 */
export function getSoftClipCurve(knee = 0.6, n = 4097) {
  if (softClip) return softClip;
  const c = new Float32Array(n);
  const span = 1 - knee;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const ax = Math.abs(x);
    const y = ax <= knee ? ax : knee + span * Math.tanh((ax - knee) / span);
    c[i] = x < 0 ? -y : y;
  }
  softClip = c;
  return c;
}

let radioCurve = null;
/** Gentle asymmetric saturation used for the radio "voice" chain. */
export function getRadioCurve(n = 1025) {
  if (radioCurve) return radioCurve;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * 2.6 + 0.15) - Math.tanh(0.15);
  }
  radioCurve = c;
  return c;
}

/** Envelope length in seconds at which an exponential (setTargetAtTime) decay is below -60 dB. */
export const envLength = (a = 0, hold = 0, tau = 0.05) => a + hold + tau * 7;

/**
 * A Patch is one scheduled sound: it tracks every source it creates so the voice can be stopped
 * early (voice stealing) and knows when the last node goes silent (cleanup).
 */
export class Patch {
  constructor(ctx, dest, o = {}) {
    this.ctx = ctx;
    this.dest = dest;
    this.o = o;
    this.lib = o.lib;
    this.t = o.t ?? ctx.currentTime;
    this.pitch = o.pitch || 1;
    this.sources = [];
    this.endTime = this.t;
  }

  mark(end) {
    if (end > this.endTime) this.endTime = end;
  }

  gain(v = 1, to = this.dest) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    if (to) g.connect(to);
    return g;
  }

  filter(type, f, q = 1, to = null) {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = clamp(f, 10, 20000);
    b.Q.value = q;
    if (to) b.connect(to);
    return b;
  }

  /** Exponential frequency (or any positive param) sweep. */
  sweep(param, t, f0, f1, dur) {
    param.setValueAtTime(Math.max(1, f0), t);
    param.exponentialRampToValueAtTime(Math.max(1, f1), t + Math.max(0.001, dur));
  }

  /** Percussive envelope: linear attack to `peak`, optional hold, then exponential decay with time constant `tau`. */
  env(t, { peak = 1, a = 0.001, hold = 0, tau = 0.05, to = this.dest } = {}) {
    const g = this.gain(0, to);
    const p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(0, t + a + hold, tau);
    this.mark(t + envLength(a, hold, tau));
    return g;
  }

  /** Looping noise source, randomly offset so simultaneous bursts are decorrelated. dur may be Infinity. */
  noise(kind, t, dur, rate = 1, to = null) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.lib.noise(kind);
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(t, Math.random() * (NOISE_SECONDS - 0.2));
    if (Number.isFinite(dur)) {
      s.stop(t + dur + 0.005);
      this.mark(t + dur);
    } else this.mark(Infinity);
    this.sources.push(s);
    if (to) s.connect(to);
    return s;
  }

  osc(type, f, t, dur, to = null) {
    const s = this.ctx.createOscillator();
    s.type = type;
    s.frequency.value = clamp(f, 1, 20000);
    s.start(t);
    if (Number.isFinite(dur)) {
      s.stop(t + dur + 0.005);
      this.mark(t + dur);
    } else this.mark(Infinity);
    this.sources.push(s);
    if (to) s.connect(to);
    return s;
  }

  /** Low-frequency oscillator driving an AudioParam: param = offset + depth * lfo. */
  lfo(param, t, dur, { f = 1, depth = 1, offset = null, type = 'sine' } = {}) {
    if (offset != null) param.value = offset;
    const g = this.gain(depth, null);
    g.connect(param);
    return this.osc(type, f, t, dur, g);
  }

  /**
   * Filtered noise burst with a percussive envelope.
   * type/f/q describe a biquad; f1 sweeps the filter to f1 over `sweepDur`.
   */
  burst(t, { kind = 'white', peak = 0.5, a = 0.001, hold = 0, tau = 0.02, type = null, f = 1000, f1 = null, sweepDur = null, q = 1, rate = 1, dur = null, to = this.dest } = {}) {
    const g = this.env(t, { peak, a, hold, tau, to });
    let node = g;
    if (type) {
      const flt = this.filter(type, f, q, g);
      if (f1 != null) this.sweep(flt.frequency, t, f, f1, sweepDur ?? envLength(a, hold, tau) * 0.6);
      node = flt;
    }
    const len = Math.max(dur ?? 0, envLength(a, hold, tau));
    this.noise(kind, t, len, rate, node);
    return g;
  }

  /** Oscillator tone with a percussive envelope; f1 sweeps the pitch over sweepDur. */
  tone(t, { type = 'sine', f = 440, f1 = null, sweepDur = null, peak = 0.5, a = 0.002, hold = 0, tau = 0.05, lp = null, dur = null, to = this.dest } = {}) {
    const g = this.env(t, { peak, a, hold, tau, to });
    let node = g;
    if (lp) node = this.filter('lowpass', lp, 0.7, g);
    const len = Math.max(dur ?? 0, envLength(a, hold, tau));
    const s = this.osc(type, f, t, len, node);
    if (f1 != null) this.sweep(s.frequency, t, f, f1, sweepDur ?? len * 0.6);
    return s;
  }

  /** Metallic hit: a few detuned partials with fast individual decays. */
  metal(t, { freqs = [1800, 2700, 4100], decay = 0.06, peak = 0.2, detune = 0.012, type = 'sine', a = 0.0005, to = this.dest } = {}) {
    for (let i = 0; i < freqs.length; i++) {
      const f = freqs[i] * this.pitch * vary(detune);
      this.tone(t, { type, f, peak: peak * (1 - i * 0.14), a, tau: decay * (1 - i * 0.1), to });
    }
  }

  /** Very short broadband click (the "transient" layer). */
  click(t, { peak = 0.4, hp = 2500, tau = 0.0008, to = this.dest } = {}) {
    return this.burst(t, { peak, a: 0.0002, tau, type: 'highpass', f: hp, q: 0.7, to });
  }

  /** Small equipment rattle (buckles, mag pouch, sling). */
  rattle(t, { peak = 0.06, to = this.dest } = {}) {
    for (let i = 0; i < 2; i++) {
      const tt = t + i * rnd(0.018, 0.035);
      const f = rnd(3000, 5200);
      this.metal(tt, { freqs: [f, f * 1.51], decay: 0.018, peak: peak * (1 - i * 0.3), to });
    }
    this.burst(t + 0.004, { peak: peak * 1.6, a: 0.001, tau: 0.006, type: 'bandpass', f: 4200, q: 1.5, to });
  }

  /**
   * Feed `from` into the shared reverb at `level`. When the voice is spatialized far enough to carry a
   * propagation delay, the send is delayed by the same amount so reflections never precede the direct sound.
   */
  send(from, level) {
    const dest = this.lib && this.lib.send;
    if (!dest || !(level > 0)) return;
    let node = from;
    const d = this.o.extraDelay;
    if (d > 0) {
      const delay = this.ctx.createDelay(d + 0.1);
      delay.delayTime.value = d;
      from.connect(delay);
      node = delay;
    }
    node.connect(this.gain(level, dest));
  }

  /** Stop handle used by the voice manager. */
  handle(extra = null) {
    const sources = this.sources;
    const h = {
      end: this.endTime,
      stop(when) {
        for (let i = 0; i < sources.length; i++) {
          try {
            sources[i].stop(when);
          } catch {
            /* already stopped */
          }
        }
      },
    };
    return extra ? Object.assign(h, extra) : h;
  }
}
