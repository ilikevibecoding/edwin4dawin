/**
 * Objective measurement of rendered audio.
 *
 * Audio cannot be checked from a screenshot, so it is checked from numbers. A
 * gunshot whose energy is all above 2 kHz is wrong, an explosion with no
 * sub-bass is wrong, and a sound whose peak is 0.02 will be inaudible in the
 * mix — all three are visible in these measurements and invisible to any visual
 * test.
 *
 * The FFT is a plain iterative radix-2 Cooley-Tukey with a Hann window. It runs
 * a handful of times per sound at init of the test, so clarity beats speed.
 */

export interface Measurement {
  id: string;
  channels: number;
  sampleRate: number;
  duration: number;
  peak: number;
  rms: number;
  /** Peak over RMS in dB: high means transient, low means sustained. */
  crestDb: number;
  /** Amplitude-weighted mean frequency, Hz. */
  centroid: number;
  /** Frequency below which 85% of the energy sits, Hz. */
  rolloff85: number;
  /**
   * Onset: seconds until the signal first reaches half its peak. This is the
   * arrival time the ear judges, and it is not the same as the time of the peak
   * sample — a close gunshot's chest thump legitimately peaks tens of
   * milliseconds after the crack that announced it.
   */
  attack: number;
  /** Seconds from the start to the loudest sample. */
  peakTime: number;
  /** Fraction of the buffer above -60 dBFS. */
  activeFraction: number;
  /** Normalised energy per octave band; see BAND_EDGES. */
  bands: number[];
  /** True when any sample exceeded full scale. */
  clipped: boolean;
  /** True when the buffer contains a non-finite sample. */
  invalid: boolean;
}

/** Octave-ish band edges in Hz. Coarse on purpose: this is a smoke test. */
export const BAND_EDGES: readonly number[] = [
  0, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000, 24000,
];

export const BAND_LABELS: readonly string[] = [
  'sub', '60', '120', '250', '500', '1k', '2k', '4k', '8k', '16k',
];

/** Downmix to mono, which is what every spectral measurement here wants. */
export function toMono(channels: readonly Float32Array[], length: number): Float32Array {
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(length);
  const scale = 1 / channels.length;
  for (const ch of channels) {
    const n = Math.min(length, ch.length);
    for (let i = 0; i < n; i++) out[i] += ch[i] * scale;
  }
  return out;
}

/**
 * In-place iterative radix-2 FFT. `re` and `im` must be a power-of-two long.
 */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + half] * curRe - im[i + k + half] * curIm;
        const bIm = re[i + k + half] * curIm + im[i + k + half] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + half] = aRe - bRe;
        im[i + k + half] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/**
 * Average magnitude spectrum over overlapping Hann-windowed frames. Averaging
 * matters: a single frame of a gunshot measures either the transient or the
 * tail depending on where it lands, and neither is the sound.
 */
export function spectrum(samples: Float32Array, sampleRate: number, size = 2048): Float32Array {
  const bins = size >> 1;
  const out = new Float32Array(bins);
  if (samples.length < 8) return out;

  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));

  const hop = size >> 1;
  const re = new Float32Array(size);
  const im = new Float32Array(size);
  let frames = 0;

  for (let start = 0; start === 0 || start + size <= samples.length; start += hop) {
    re.fill(0);
    im.fill(0);
    const n = Math.min(size, samples.length - start);
    for (let i = 0; i < n; i++) re[i] = samples[start + i] * window[i];
    fft(re, im);
    for (let b = 0; b < bins; b++) out[b] += Math.hypot(re[b], im[b]);
    frames++;
    if (frames > 240) break;
  }
  if (frames > 0) for (let b = 0; b < bins; b++) out[b] /= frames;
  void sampleRate;
  return out;
}

/** Full measurement of one rendered buffer. */
export function measure(
  id: string,
  channels: readonly Float32Array[],
  sampleRate: number,
): Measurement {
  const length = channels[0]?.length ?? 0;
  const mono = toMono(channels, length);

  let peak = 0;
  let peakAt = 0;
  let sumSq = 0;
  let clipped = false;
  let invalid = false;
  let active = 0;
  for (let i = 0; i < length; i++) {
    const v = mono[i];
    if (!Number.isFinite(v)) {
      invalid = true;
      continue;
    }
    const a = v < 0 ? -v : v;
    if (a > peak) {
      peak = a;
      peakAt = i;
    }
    if (a > 1.0) clipped = true;
    if (a > 0.001) active++;
    sumSq += v * v;
  }
  // Any channel individually can clip even when the downmix does not.
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const a = ch[i] < 0 ? -ch[i] : ch[i];
      if (a > 1.0) clipped = true;
    }
  }

  let onsetAt = peakAt;
  const half = peak * 0.5;
  for (let i = 0; i < length; i++) {
    const a = mono[i] < 0 ? -mono[i] : mono[i];
    if (a >= half) {
      onsetAt = i;
      break;
    }
  }

  const rms = Math.sqrt(sumSq / Math.max(1, length));
  const mags = spectrum(mono, sampleRate);
  const binHz = sampleRate / (mags.length * 2);

  let weighted = 0;
  let total = 0;
  for (let b = 1; b < mags.length; b++) {
    weighted += b * binHz * mags[b];
    total += mags[b];
  }
  const centroid = total > 1e-9 ? weighted / total : 0;

  // Energy rolloff: the frequency below which 85% of the magnitude lives.
  let running = 0;
  let rolloff = 0;
  const target = total * 0.85;
  for (let b = 1; b < mags.length; b++) {
    running += mags[b];
    if (running >= target) {
      rolloff = b * binHz;
      break;
    }
  }

  const bands = new Array<number>(BAND_EDGES.length - 1).fill(0);
  for (let b = 1; b < mags.length; b++) {
    const hz = b * binHz;
    for (let k = 0; k < bands.length; k++) {
      if (hz >= BAND_EDGES[k] && hz < BAND_EDGES[k + 1]) {
        bands[k] += mags[b];
        break;
      }
    }
  }
  const bandTotal = bands.reduce((a, b) => a + b, 0);
  const normalised = bands.map((v) => (bandTotal > 1e-9 ? v / bandTotal : 0));

  return {
    id,
    channels: channels.length,
    sampleRate,
    duration: length / sampleRate,
    peak,
    rms,
    crestDb: rms > 1e-9 ? 20 * Math.log10(peak / rms) : 0,
    centroid,
    rolloff85: rolloff,
    attack: onsetAt / sampleRate,
    peakTime: peakAt / sampleRate,
    activeFraction: length > 0 ? active / length : 0,
    bands: normalised,
    clipped,
    invalid,
  };
}

export interface DecayMeasurement {
  /** Seconds until the first sample above -40 dBFS. */
  predelay: number;
  /**
   * RT60 in seconds, by Schroeder backward integration. Measured as T30 (the
   * -5 dB to -35 dB slope, doubled) because the last 25 dB of a synthetic tail
   * runs into the noise floor and a literal -60 dB reading is unreliable.
   */
  rt60: number;
  /** Fraction of total energy in the first 80 ms: the early-reflection field. */
  earlyFraction: number;
  /** Discrete reflections in the first 80 ms, counted as local energy peaks. */
  earlyReflections: number;
  /** 1 means the channels are identical, 0 means fully decorrelated. */
  correlation: number;
}

/**
 * Decay analysis for an impulse response. A reverb whose measured RT60 does not
 * match the space it claims to be is objectively wrong, and it is invisible to
 * every other measurement here.
 */
export function measureDecay(
  channels: readonly Float32Array[],
  sampleRate: number,
): DecayMeasurement {
  const length = channels[0]?.length ?? 0;
  const mono = toMono(channels, length);

  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(mono[i]));
  const onsetThreshold = peak * 0.01;
  let predelay = 0;
  for (let i = 0; i < length; i++) {
    if (Math.abs(mono[i]) >= onsetThreshold) {
      predelay = i / sampleRate;
      break;
    }
  }

  // Schroeder: integrate the energy backwards, so the curve is monotonic and
  // free of the noise that makes a raw envelope unusable for a slope fit.
  const energy = new Float64Array(length);
  let running = 0;
  for (let i = length - 1; i >= 0; i--) {
    running += mono[i] * mono[i];
    energy[i] = running;
  }
  const total = energy[0];
  let rt60 = 0;
  if (total > 1e-12) {
    const at = (db: number): number => {
      const target = total * Math.pow(10, db / 10);
      for (let i = 0; i < length; i++) if (energy[i] <= target) return i / sampleRate;
      return length / sampleRate;
    };
    const t5 = at(-5);
    const t35 = at(-35);
    rt60 = t35 > t5 ? (t35 - t5) * 2 : 0;
  }

  const earlyEnd = Math.min(length, Math.round(0.08 * sampleRate));
  let early = 0;
  for (let i = 0; i < earlyEnd; i++) early += mono[i] * mono[i];
  const earlyFraction = total > 1e-12 ? early / total : 0;

  // Count discrete arrivals: local maxima in a 1 ms envelope that stand clearly
  // above their neighbourhood. This is the image-source field made countable.
  const win = Math.max(1, Math.round(0.001 * sampleRate));
  const envLength = Math.floor(earlyEnd / win);
  let reflections = 0;
  const env = new Float64Array(Math.max(1, envLength));
  for (let b = 0; b < envLength; b++) {
    let m = 0;
    for (let i = b * win; i < (b + 1) * win; i++) m = Math.max(m, Math.abs(mono[i]));
    env[b] = m;
  }
  for (let b = 1; b < envLength - 1; b++) {
    if (env[b] > env[b - 1] && env[b] >= env[b + 1] && env[b] > peak * 0.04) reflections++;
  }

  let correlation = 1;
  if (channels.length >= 2) {
    const [l, r] = channels;
    let dot = 0;
    let ll = 0;
    let rr = 0;
    const n = Math.min(l.length, r.length);
    for (let i = 0; i < n; i++) {
      dot += l[i] * r[i];
      ll += l[i] * l[i];
      rr += r[i] * r[i];
    }
    correlation = ll > 1e-12 && rr > 1e-12 ? Math.abs(dot) / Math.sqrt(ll * rr) : 1;
  }

  return { predelay, rt60, earlyFraction, earlyReflections: reflections, correlation };
}

/** Fraction of the energy inside a frequency range, from a measurement. */
export function bandEnergy(m: Measurement, fromHz: number, toHz: number): number {
  let sum = 0;
  for (let k = 0; k < m.bands.length; k++) {
    const lo = BAND_EDGES[k];
    const hi = BAND_EDGES[k + 1];
    if (hi <= fromHz || lo >= toHz) continue;
    sum += m.bands[k];
  }
  return sum;
}

/** One-line summary, sized for a console log that has to stay readable. */
export function format(m: Measurement): string {
  const bands = m.bands.map((v) => Math.round(v * 99).toString().padStart(2, '0')).join(' ');
  return (
    `${m.id.padEnd(30)} ` +
    `pk ${m.peak.toFixed(3)} ` +
    `rms ${m.rms.toFixed(4)} ` +
    `crest ${m.crestDb.toFixed(1).padStart(5)}dB ` +
    `dur ${m.duration.toFixed(3)}s ` +
    `cen ${Math.round(m.centroid).toString().padStart(5)}Hz ` +
    `r85 ${Math.round(m.rolloff85).toString().padStart(5)}Hz ` +
    `atk ${(m.attack * 1000).toFixed(1).padStart(6)}ms ` +
    `pkt ${(m.peakTime * 1000).toFixed(1).padStart(6)}ms ` +
    `ch${m.channels} ` +
    `[${bands}]` +
    (m.clipped ? ' CLIP' : '') +
    (m.invalid ? ' NAN' : '')
  );
}
