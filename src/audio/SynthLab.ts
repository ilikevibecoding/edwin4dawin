/**
 * SynthLab — a small runtime DSP toolbox used to synthesize every sound in the
 * game from scratch with the Web Audio API. Nothing here touches the network or
 * loads assets; the SoundBank composes these primitives inside an
 * `OfflineAudioContext` and renders finished `AudioBuffer`s.
 *
 * The functions come in two tiers:
 *   - low level: seeded RNG, noise generation, waveshaper curves, envelope
 *     scheduling helpers on `AudioParam`s.
 *   - mid level "layer" builders: crack / thump / resonant band / blast tail /
 *     metallic ping / mechanical clatter. A convincing gunshot or explosion is a
 *     handful of these layered together with slightly randomised parameters.
 */

export type Rng = () => number;
export type NoiseColor = 'white' | 'pink' | 'brown';

/** Deterministic, fast 32-bit PRNG so baked variants are reproducible. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: Rng, a: number, b: number): number {
  return a + (b - a) * rng();
}

export function randInt(rng: Rng, a: number, b: number): number {
  return Math.floor(randRange(rng, a, b + 1));
}

export function choose<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}

/** Approximately-normal deviate via summed uniforms (Irwin–Hall). */
export function gauss(rng: Rng): number {
  return (rng() + rng() + rng() + rng() - 2) * 0.7071;
}

/** Fill an array with the requested noise colour, amplitude ~[-1, 1]. */
export function fillNoise(out: Float32Array, type: NoiseColor, rng: Rng): void {
  const n = out.length;
  if (type === 'white') {
    for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
    return;
  }
  if (type === 'pink') {
    // Paul Kellet's economical pink-noise filter.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rng() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
      out[i] = pink * 0.11;
    }
    return;
  }
  // brown / red: leaky integration of white noise, normalised.
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    out[i] = last * 3.5;
  }
}

/** Create a noise `AudioBuffer` in the supplied context. */
export function noiseBuffer(
  ctx: BaseAudioContext,
  seconds: number,
  type: NoiseColor,
  rng: Rng,
  channels = 1
): AudioBuffer {
  const len = Math.max(1, Math.ceil(seconds * ctx.sampleRate));
  const buf = ctx.createBuffer(channels, len, ctx.sampleRate);
  for (let c = 0; c < channels; c++) fillNoise(buf.getChannelData(c), type, rng);
  return buf;
}

/** tanh soft-clip curve for gluey saturation. `k` sets drive. */
export function tanhCurve(k: number, n = 2048): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n);
  const kk = Math.max(0.0001, k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * kk) / Math.tanh(kk);
  }
  return curve;
}

/** Asymmetric fuzz curve — grittier, good for explosion body. */
export function fuzzCurve(amount: number, n = 2048): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n);
  const a = Math.max(0, Math.min(0.999, amount));
  const k = (2 * a) / (1 - a);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

export function makeSaturator(ctx: BaseAudioContext, drive: number, kind: 'tanh' | 'fuzz' = 'tanh'): WaveShaperNode {
  const ws = ctx.createWaveShaper();
  ws.curve = kind === 'tanh' ? tanhCurve(drive) : fuzzCurve(drive);
  ws.oversample = '4x';
  return ws;
}

const FLOOR = 0.0001;

/** Percussive envelope: fast attack, exponential decay to silence. */
export function setPerc(
  p: AudioParam,
  t0: number,
  peak: number,
  attack: number,
  decay: number
): number {
  const pk = Math.max(FLOOR, peak);
  p.setValueAtTime(FLOOR, t0);
  p.linearRampToValueAtTime(pk, t0 + attack);
  p.exponentialRampToValueAtTime(FLOOR, t0 + attack + decay);
  p.setValueAtTime(0, t0 + attack + decay + 0.001);
  return attack + decay + 0.002;
}

/** Attack / hold / release plateau envelope for sustained bits. */
export function setAHR(
  p: AudioParam,
  t0: number,
  peak: number,
  attack: number,
  hold: number,
  release: number
): number {
  const pk = Math.max(FLOOR, peak);
  p.setValueAtTime(FLOOR, t0);
  p.linearRampToValueAtTime(pk, t0 + attack);
  p.setValueAtTime(pk, t0 + attack + hold);
  p.exponentialRampToValueAtTime(FLOOR, t0 + attack + hold + release);
  p.setValueAtTime(0, t0 + attack + hold + release + 0.001);
  return attack + hold + release + 0.002;
}

function envGain(ctx: BaseAudioContext): GainNode {
  const g = ctx.createGain();
  g.gain.value = 0;
  return g;
}

/**
 * A very short high-frequency transient — the supersonic "crack" / firing-pin
 * snap. Near-instant attack, ~1-4 ms decay.
 */
export function crack(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t0: number,
  opts: { gain: number; freq: number; decay: number; rng: Rng }
): number {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, opts.decay + 0.01, 'white', opts.rng);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = opts.freq;
  hp.Q.value = 0.7;
  const g = envGain(ctx);
  setPerc(g.gain, t0, opts.gain, 0.0003, opts.decay);
  src.connect(hp).connect(g).connect(dest);
  src.start(t0);
  src.stop(t0 + opts.decay + 0.02);
  return opts.decay + 0.02;
}

/**
 * Low-frequency body: a sine/triangle with a fast downward pitch sweep and
 * exponential amplitude decay. This is what gives a shot its weight.
 */
export function thump(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t0: number,
  opts: {
    startFreq: number;
    endFreq: number;
    dur: number;
    gain: number;
    type?: OscillatorType;
  }
): number {
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.startFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t0 + opts.dur * 0.8);
  const g = envGain(ctx);
  setPerc(g.gain, t0, opts.gain, 0.001, opts.dur);
  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.03);
  return opts.dur + 0.03;
}

/**
 * Resonant band-passed noise with a cutoff that sweeps downward — models the
 * pitched, barrel-resonance "punch" in the mids.
 */
export function resoNoise(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t0: number,
  opts: {
    dur: number;
    gain: number;
    freq: number;
    q: number;
    sweepTo?: number;
    color?: NoiseColor;
    rng: Rng;
  }
): number {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, opts.dur + 0.02, opts.color ?? 'white', opts.rng);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(opts.freq, t0);
  if (opts.sweepTo) bp.frequency.exponentialRampToValueAtTime(Math.max(40, opts.sweepTo), t0 + opts.dur);
  bp.Q.value = opts.q;
  const g = envGain(ctx);
  setPerc(g.gain, t0, opts.gain, 0.0008, opts.dur);
  src.connect(bp).connect(g).connect(dest);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.03);
  return opts.dur + 0.03;
}

/**
 * Bright muzzle-blast tail: lowpassed noise whose cutoff falls quickly, giving a
 * shaped "whoosh" that decays into the environment tail.
 */
export function blast(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t0: number,
  opts: {
    dur: number;
    gain: number;
    cutoff0: number;
    cutoff1: number;
    color?: NoiseColor;
    q?: number;
    attack?: number;
    rng: Rng;
  }
): number {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, opts.dur + 0.02, opts.color ?? 'white', opts.rng);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(opts.cutoff0, t0);
  lp.frequency.exponentialRampToValueAtTime(Math.max(80, opts.cutoff1), t0 + opts.dur);
  lp.Q.value = opts.q ?? 0.4;
  const g = envGain(ctx);
  setPerc(g.gain, t0, opts.gain, opts.attack ?? 0.001, opts.dur);
  src.connect(lp).connect(g).connect(dest);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.03);
  return opts.dur + 0.03;
}

/**
 * Metallic ping: a set of slightly inharmonic decaying partials. Used for
 * ricochets, shell casings, metal impacts and mechanical clinks.
 */
export function ping(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t0: number,
  opts: {
    freq: number;
    dur: number;
    gain: number;
    partials?: number;
    detune?: number;
    type?: OscillatorType;
    rng: Rng;
  }
): number {
  const partials = opts.partials ?? 3;
  const ratios = [1, 2.76, 5.4, 8.93, 11.34];
  for (let i = 0; i < partials; i++) {
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    const jitter = 1 + (opts.detune ?? 0.01) * gauss(opts.rng);
    osc.frequency.value = opts.freq * ratios[i % ratios.length] * jitter;
    const g = envGain(ctx);
    const pk = opts.gain / (i + 1);
    const dur = opts.dur / (1 + i * 0.5);
    setPerc(g.gain, t0, pk, 0.0006, dur);
    osc.connect(g).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }
  return opts.dur + 0.03;
}

/**
 * Mechanical clatter — a short scatter of tiny band-passed noise/tonal clicks
 * used for bolt action, mag rattle and casing bounce.
 */
export function clatter(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t0: number,
  opts: { gain: number; dur: number; clicks?: number; freq?: number; rng: Rng }
): number {
  const clicks = opts.clicks ?? randInt(opts.rng, 3, 6);
  const baseFreq = opts.freq ?? 2600;
  for (let i = 0; i < clicks; i++) {
    const dt = randRange(opts.rng, 0, opts.dur);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.03, 'white', opts.rng);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = baseFreq * randRange(opts.rng, 0.6, 1.8);
    bp.Q.value = randRange(opts.rng, 4, 12);
    const g = envGain(ctx);
    const dur = randRange(opts.rng, 0.006, 0.02);
    setPerc(g.gain, t0 + dt, opts.gain * randRange(opts.rng, 0.4, 1), 0.0004, dur);
    src.connect(bp).connect(g).connect(dest);
    src.start(t0 + dt);
    src.stop(t0 + dt + dur + 0.02);
  }
  return opts.dur + 0.05;
}

/** Convenience: a plain gain node whose value is already set. */
export function fixedGain(ctx: BaseAudioContext, value: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

/**
 * Crossfade the tail of a rendered buffer into its head so it loops seamlessly.
 * Mutates the buffer in place. `fade` is in seconds.
 */
export function equalPowerLoopFade(buffer: AudioBuffer, fade: number): void {
  const sr = buffer.sampleRate;
  const f = Math.min(Math.floor(fade * sr), Math.floor(buffer.length / 2) - 1);
  if (f <= 0) return;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    const n = d.length;
    for (let i = 0; i < f; i++) {
      const x = i / f;
      const a = Math.cos((x * Math.PI) / 2); // fades out (applied to tail)
      const b = Math.sin((x * Math.PI) / 2); // fades in (applied to head)
      const head = d[i];
      const tail = d[n - f + i];
      d[i] = head * b + tail * a;
    }
    // Zero out the consumed tail so the loop point is the crossfade region.
    for (let i = 0; i < f; i++) d[n - f + i] = 0;
  }
}

/** Peak absolute sample across all channels — used for silence assertions. */
export function bufferPeak(buffer: AudioBuffer): number {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

/** Normalise a buffer so its peak hits `target` (default -1 dBFS ≈ 0.89). */
export function normalize(buffer: AudioBuffer, target = 0.89): void {
  const peak = bufferPeak(buffer);
  if (peak < 1e-6) return;
  const g = target / peak;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] *= g;
  }
}
