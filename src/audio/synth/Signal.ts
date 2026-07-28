/**
 * Mono sample buffer with a fluent editing API.
 *
 * Every sound in the game is synthesised by writing numbers into one of these
 * at init time and handing the result to `ctx.createBuffer`. Doing the DSP in
 * plain TypeScript rather than in a Web Audio node graph buys three things that
 * matter here: it is synchronous (no `OfflineAudioContext` promise per sound
 * during boot), it is deterministic given a seed, and the exact same code path
 * can be measured offline by the test harness.
 */

/**
 * Sample storage. Pinned to a plain `ArrayBuffer` rather than the default
 * `ArrayBufferLike` so these arrays can be handed straight to
 * `AudioBuffer.copyToChannel`, which will not accept a possibly-shared buffer.
 */
export type Samples = Float32Array<ArrayBuffer>;

/** Multi-channel result handed to the engine to become an `AudioBuffer`. */
export interface RenderedSound {
  readonly channels: readonly Samples[];
  readonly sampleRate: number;
  /** Loop point in seconds, for beds that are meant to run continuously. */
  readonly loopStart?: number;
  readonly loopEnd?: number;
}

export class Signal {
  readonly data: Samples;
  readonly sampleRate: number;

  constructor(seconds: number, sampleRate: number) {
    this.sampleRate = sampleRate;
    this.data = new Float32Array(Math.max(1, Math.ceil(seconds * sampleRate)));
  }

  static wrap(data: Samples, sampleRate: number): Signal {
    const s = Object.create(Signal.prototype) as { data: Samples; sampleRate: number };
    s.data = data;
    s.sampleRate = sampleRate;
    return s as Signal;
  }

  get length(): number {
    return this.data.length;
  }

  get duration(): number {
    return this.data.length / this.sampleRate;
  }

  /** Sample index for a time in seconds, clamped into range. */
  index(seconds: number): number {
    const i = Math.round(seconds * this.sampleRate);
    return i < 0 ? 0 : i > this.data.length ? this.data.length : i;
  }

  clear(): this {
    this.data.fill(0);
    return this;
  }

  /** Per-sample generator. `t` is seconds from the start of the buffer. */
  fill(fn: (t: number, i: number) => number): this {
    const d = this.data;
    const inv = 1 / this.sampleRate;
    for (let i = 0; i < d.length; i++) d[i] = fn(i * inv, i);
    return this;
  }

  /** Per-sample transform of the existing contents. */
  map(fn: (x: number, t: number, i: number) => number): this {
    const d = this.data;
    const inv = 1 / this.sampleRate;
    for (let i = 0; i < d.length; i++) d[i] = fn(d[i], i * inv, i);
    return this;
  }

  /** Mix `other` in at `offsetSeconds`, scaled by `gain`. */
  add(other: Signal, gain = 1, offsetSeconds = 0): this {
    const dst = this.data;
    const src = other.data;
    const off = Math.round(offsetSeconds * this.sampleRate);
    const start = Math.max(0, off);
    const end = Math.min(dst.length, off + src.length);
    for (let i = start; i < end; i++) dst[i] += src[i - off] * gain;
    return this;
  }

  /** Multiply sample-for-sample by `other` (envelope or ring modulation). */
  multiply(other: Signal, offsetSeconds = 0): this {
    const dst = this.data;
    const src = other.data;
    const off = Math.round(offsetSeconds * this.sampleRate);
    for (let i = 0; i < dst.length; i++) {
      const j = i - off;
      dst[i] *= j >= 0 && j < src.length ? src[j] : 0;
    }
    return this;
  }

  gain(g: number): this {
    const d = this.data;
    for (let i = 0; i < d.length; i++) d[i] *= g;
    return this;
  }

  /** Apply an amplitude envelope expressed as a function of time in seconds. */
  envelope(fn: (t: number) => number): this {
    const d = this.data;
    const inv = 1 / this.sampleRate;
    for (let i = 0; i < d.length; i++) d[i] *= fn(i * inv);
    return this;
  }

  fadeIn(seconds: number): this {
    const n = Math.min(this.data.length, Math.round(seconds * this.sampleRate));
    for (let i = 0; i < n; i++) this.data[i] *= i / n;
    return this;
  }

  fadeOut(seconds: number): this {
    const d = this.data;
    const n = Math.min(d.length, Math.round(seconds * this.sampleRate));
    const base = d.length - n;
    for (let i = 0; i < n; i++) d[base + i] *= 1 - i / n;
    return this;
  }

  /** Trim a leading silence-free window; used to tighten transient starts. */
  slice(startSeconds: number, endSeconds?: number): Signal {
    const a = this.index(startSeconds);
    const b = endSeconds === undefined ? this.data.length : this.index(endSeconds);
    return Signal.wrap(this.data.slice(a, Math.max(a + 1, b)), this.sampleRate);
  }

  copy(): Signal {
    return Signal.wrap(this.data.slice(), this.sampleRate);
  }

  peak(): number {
    const d = this.data;
    let p = 0;
    for (let i = 0; i < d.length; i++) {
      const a = d[i] < 0 ? -d[i] : d[i];
      if (a > p) p = a;
    }
    return p;
  }

  rms(): number {
    const d = this.data;
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    return Math.sqrt(s / Math.max(1, d.length));
  }

  /** Scale so the loudest sample sits at `target`. No-op on silence. */
  normalize(target = 0.98): this {
    const p = this.peak();
    if (p > 1e-9) this.gain(target / p);
    return this;
  }

  /** Remove DC so a sub-bass layer does not eat headroom on the master bus. */
  removeDc(): this {
    const d = this.data;
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += d[i];
    const mean = sum / Math.max(1, d.length);
    if (Math.abs(mean) > 1e-7) for (let i = 0; i < d.length; i++) d[i] -= mean;
    return this;
  }

  reverse(): this {
    this.data.reverse();
    return this;
  }

  /**
   * Fold the last `seconds` back over the head so the buffer loops without a
   * seam, returning the shortened result. Used for every ambience bed.
   */
  seamlessLoop(seconds: number): Signal {
    const n = Math.min(Math.floor(this.data.length / 2), Math.round(seconds * this.sampleRate));
    if (n < 2) return this.copy();
    const before = this.peak();
    const out = this.data.slice(0, this.data.length - n);
    const tailStart = out.length;
    for (let i = 0; i < n; i++) {
      // Equal-power crossfade keeps the perceived level flat through the seam.
      const t = i / n;
      const a = Math.cos(t * Math.PI * 0.5);
      const b = Math.sin(t * Math.PI * 0.5);
      out[i] = out[i] * b + this.data[tailStart + i] * a;
    }
    const result = Signal.wrap(out, this.sampleRate);
    // Equal power holds for decorrelated content, but a bed built from tones is
    // correlated across the seam and sums to +3 dB there. Closing a loop must
    // never make it louder than the material it was cut from.
    const after = result.peak();
    if (after > before && before > 1e-9) result.gain(before / after);
    return result;
  }

  /** Read with linear interpolation, for resampling and pitch shifts. */
  sampleAt(position: number): number {
    const d = this.data;
    if (position <= 0) return d[0];
    const i = Math.floor(position);
    if (i >= d.length - 1) return d[d.length - 1];
    const f = position - i;
    return d[i] + (d[i + 1] - d[i]) * f;
  }

  toMono(): RenderedSound {
    return { channels: [this.data], sampleRate: this.sampleRate };
  }
}

/** Convenience constructor: `sig(0.4, 44100)`. */
export const sig = (seconds: number, sampleRate: number): Signal =>
  new Signal(seconds, sampleRate);

/**
 * Pseudo-stereo from a mono source: a few samples of delay plus opposing
 * spectral tilt on each side. Cheap, mono-compatible, and enough to stop UI
 * and viewmodel sounds from feeling like they come from a single point.
 */
export function widen(source: Signal, delaySeconds: number, tilt: number): RenderedSound {
  const n = source.length;
  const delay = Math.round(delaySeconds * source.sampleRate);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const d = source.data;
  let lpL = 0;
  let lpR = 0;
  // One-pole shelves in opposite directions; `tilt` in 0..1 sets the amount.
  const aL = 0.35 + 0.3 * tilt;
  const aR = 0.35 - 0.3 * tilt;
  for (let i = 0; i < n; i++) {
    const x = d[i];
    const y = i - delay >= 0 ? d[i - delay] : 0;
    lpL += (x - lpL) * aL;
    lpR += (y - lpR) * aR;
    left[i] = x * 0.72 + lpL * 0.28;
    right[i] = y * 0.72 + lpR * 0.28;
  }
  // A resonant low-passed source can ring the shelves above the input peak, and
  // callers set their level by normalising before they widen. Preserve it, and
  // measure per channel: a stereo pair can clip on one side while the mono
  // downmix looks safe.
  return capChannels([left, right], source.sampleRate, source.peak());
}

/**
 * Package two signals as a stereo pair. The channels are scaled together if
 * either would clip, so the balance between them survives — normalising each
 * side independently would move the image.
 */
export function stereo(left: Signal, right: Signal): RenderedSound {
  return capChannels([left.data, right.data], left.sampleRate, 0.99);
}

/** Scale channels together so the loudest of them sits no higher than `cap`. */
function capChannels(channels: Samples[], sampleRate: number, cap: number): RenderedSound {
  let peak = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const a = ch[i] < 0 ? -ch[i] : ch[i];
      if (a > peak) peak = a;
    }
  }
  if (peak > cap && cap > 1e-9) {
    const g = cap / peak;
    for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= g;
  }
  return { channels, sampleRate };
}

/** Peak level of a rendered sound across all channels. */
export function renderedPeak(sound: RenderedSound): number {
  let p = 0;
  for (const ch of sound.channels) {
    for (let i = 0; i < ch.length; i++) {
      const a = ch[i] < 0 ? -ch[i] : ch[i];
      if (a > p) p = a;
    }
  }
  return p;
}

export function renderedFrames(sound: RenderedSound): number {
  return sound.channels[0]?.length ?? 0;
}
