/**
 * Measurement, not synthesis.
 *
 * The audio engine cannot be verified by listening to it in CI, so every claim
 * it makes about a sound has to be expressed as a number: how fast the
 * transient rises, where the spectral energy sits, how long a room rings. These
 * are the functions that produce those numbers, and they are shared by the bake
 * (which sanity-checks its own output) and by `tools/audio-test.mjs`.
 */

export interface Stats {
  peak: number;
  rms: number;
  /** Seconds from the first sample above -60 dBFS to the peak. */
  attack: number;
  /**
   * Seconds from the start of the signal to its loudest sample.
   *
   * Distinct from `attack`, which is measured from the onset and so says how
   * fast the sound rose; this says where in the sound the loudest moment is at
   * all. They separate for anything that begins quietly — a distant report, a
   * sound arriving after a predelay — and for a percussive one-shot the useful
   * question is usually this one: an explosion whose peak is nine milliseconds
   * in has the wrong shape whatever its rise time was.
   */
  peakAt: number;
  /** Amplitude-weighted mean frequency, in Hz. */
  centroid: number;
  /** Seconds until the level has fallen 60 dB below the peak. */
  decay: number;
  /** True when any sample reaches full scale. */
  clipped: boolean;
  duration: number;
}

export function peak(data: Float32Array, start = 0, len = -1): number {
  const end = len < 0 ? data.length : Math.min(data.length, start + len);
  let p = 0;
  for (let i = start; i < end; i++) {
    const a = Math.abs(data[i]);
    if (a > p) p = a;
  }
  return p;
}

export function rms(data: Float32Array, start = 0, len = -1): number {
  const end = len < 0 ? data.length : Math.min(data.length, start + len);
  let s = 0;
  for (let i = start; i < end; i++) s += data[i] * data[i];
  const n = Math.max(1, end - start);
  return Math.sqrt(s / n);
}

/**
 * Attack time: how long the signal takes to rise into its loudest moment.
 *
 * Measured on a smoothed envelope rather than on raw samples, because a
 * broadband transient's individual samples zero-cross constantly and the raw
 * argmax lands wherever the noise happened to align. The time constant is a
 * quarter of a millisecond, short enough to resolve the sub-millisecond rise a
 * gunshot needs.
 *
 * Two passes, and both are necessary. Finding the envelope's maximum first and
 * only then walking forward to the last moment it was 60 dB beneath that
 * maximum is what makes the figure survive a signal that does not begin at
 * sample zero — a distant report is delayed by its flight time and preceded by
 * near-silence, and a single forward pass latches its running maximum on that
 * silence and reports an attack of exactly nothing.
 */
export function attackTime(
  data: Float32Array,
  sampleRate: number,
  floorDb = -60,
  windowSec = 0.05,
): number {
  const p = peak(data);
  if (data.length < 4 || p < 1e-7) return 0;

  /*
   * Where the event starts, which is not necessarily sample zero. A shot 300 m
   * away is preceded by most of a second of nothing, and its direct path never
   * arrives at all.
   */
  const onsetGate = p * 0.01;
  let first = 0;
  while (first < data.length && Math.abs(data[first]) < onsetGate) first++;
  if (first >= data.length) return 0;

  /*
   * And the moment being timed is the loudest excursion within `windowSec` of
   * that start. Both halves of that matter.
   *
   * Restricting the window is what keeps the room out of the answer: a gunshot
   * in a street is followed forty milliseconds later by its own reflection off
   * the buildings, and by the time the master chain has band-limited a
   * three-hundred-microsecond shock front, that reflection is comfortably the
   * larger excursion in the file. Timing it would report the attack of the
   * street rather than the attack of the weapon. Taking the waveform's peak
   * rather than the envelope's avoids the mirror-image error, since a sustained
   * sound's smoothed envelope beats a spike's on the same reasoning.
   */
  const end = Math.min(data.length, first + Math.max(8, Math.round(windowSec * sampleRate)));
  let best = 0;
  let target = first;
  for (let i = first; i < end; i++) {
    const v = Math.abs(data[i]);
    if (v > best) {
      best = v;
      target = i;
    }
  }

  // A one-pole follower with a 0.25 ms time constant, walked up to that moment,
  // remembering the last time it sat `floorDb` beneath where it ends up. Read
  // backwards from the peak, so a delayed onset costs nothing.
  const a = 1 - Math.exp(-1 / (sampleRate * 0.00025));
  let acc = 0;
  for (let i = 0; i <= target; i++) acc += (Math.abs(data[i]) - acc) * a;
  const floor = Math.max(1e-9, acc) * Math.pow(10, floorDb / 20);

  acc = 0;
  let onset = 0;
  for (let i = 0; i <= target; i++) {
    acc += (Math.abs(data[i]) - acc) * a;
    if (acc < floor) onset = i;
  }
  return Math.max(0, (target - onset) / sampleRate);
}

/**
 * Attack time of the transient band alone.
 *
 * The perceptual attack of a gunshot is its shock front, which is broadband but
 * lives audibly above a kilohertz. The absolute waveform peak of a heavy
 * calibre is something else entirely — the low-frequency punch, which peaks
 * several milliseconds in and legitimately so, exactly as it does in a
 * recording. Measuring the rise of the highpassed signal measures the shock
 * front rather than the punch, which is the figure the sound design is actually
 * making a claim about.
 */
export function attackTimeHf(data: Float32Array, sampleRate: number, cornerHz = 1500): number {
  const hp = new Float32Array(data.length);
  hp.set(data);
  // One-pole highpass, applied twice. Steep enough to reject the sub without
  // the pre-ringing a resonant biquad would add to the very thing being timed.
  const rc = 1 / (2 * Math.PI * cornerHz);
  const a = rc / (rc + 1 / sampleRate);
  for (let pass = 0; pass < 2; pass++) {
    let prevIn = 0;
    let prevOut = 0;
    for (let i = 0; i < hp.length; i++) {
      const x = hp[i];
      const y = a * (prevOut + x - prevIn);
      prevIn = x;
      prevOut = y;
      hp[i] = y;
    }
  }
  return attackTime(hp, sampleRate);
}

/**
 * Spectral centroid via a sparse DFT on a log-spaced probe set. A full FFT is
 * unnecessary: the centroid is an integral over the magnitude spectrum, and 96
 * geometrically-spaced Goertzel probes from 40 Hz up integrate it to well
 * inside the precision any of these assertions need, at a fraction of the cost.
 */
export function spectrum(
  data: Float32Array,
  sampleRate: number,
  bins = 96,
  lowHz = 40,
  highHz = 16000,
): { freqs: Float32Array; mags: Float32Array } {
  const freqs = new Float32Array(bins);
  const mags = new Float32Array(bins);
  const nyq = sampleRate * 0.5;
  const hi = Math.min(highHz, nyq * 0.95);
  const ratio = Math.pow(hi / lowHz, 1 / Math.max(1, bins - 1));
  const n = data.length;
  for (let b = 0; b < bins; b++) {
    const f = lowHz * Math.pow(ratio, b);
    freqs[b] = f;
    const w = (2 * Math.PI * f) / sampleRate;
    const coeff = 2 * Math.cos(w);
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < n; i++) {
      s0 = data[i] + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
    mags[b] = Math.sqrt(Math.max(0, power)) / Math.max(1, n);
  }
  return { freqs, mags };
}

export function centroidOf(freqs: Float32Array, mags: Float32Array): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < mags.length; i++) {
    // Weight by bandwidth so a log-spaced probe set integrates like a linear one.
    const bw = i === 0 ? freqs[1] - freqs[0] : freqs[i] - freqs[i - 1];
    const m = mags[i] * bw;
    num += freqs[i] * m;
    den += m;
  }
  return den > 1e-20 ? num / den : 0;
}

export function spectralCentroid(data: Float32Array, sampleRate: number): number {
  const s = spectrum(data, sampleRate);
  return centroidOf(s.freqs, s.mags);
}

/** Summed magnitude between two frequencies, bandwidth-weighted. */
export function bandEnergy(
  freqs: Float32Array,
  mags: Float32Array,
  loHz: number,
  hiHz: number,
): number {
  let sum = 0;
  for (let i = 0; i < mags.length; i++) {
    if (freqs[i] < loHz || freqs[i] > hiHz) continue;
    const bw = i === 0 ? freqs[1] - freqs[0] : freqs[i] - freqs[i - 1];
    sum += mags[i] * bw;
  }
  return sum;
}

/**
 * Ratio of energy below `splitHz` to energy above it. A far more stable
 * fingerprint than the centroid alone for telling a .338 from a 9 mm, because
 * it is insensitive to the very top octave where a distance filter lives.
 */
export function tiltRatio(data: Float32Array, sampleRate: number, splitHz = 700): number {
  const s = spectrum(data, sampleRate);
  const lo = bandEnergy(s.freqs, s.mags, 40, splitHz);
  const hi = bandEnergy(s.freqs, s.mags, splitHz, sampleRate * 0.47);
  return hi > 1e-20 ? lo / hi : Number.POSITIVE_INFINITY;
}

/**
 * RT60 by Schroeder backward integration of the energy decay curve, fitted
 * over the -5 dB to -25 dB span and extrapolated. Fitting the early part and
 * extrapolating is the standard method and is far more robust on a short or
 * noisy tail than waiting for a true 60 dB drop.
 */
export function rt60(data: Float32Array, sampleRate: number): number {
  const n = data.length;
  if (n < 64) return 0;
  const energy = new Float64Array(n);
  let acc = 0;
  for (let i = n - 1; i >= 0; i--) {
    acc += data[i] * data[i];
    energy[i] = acc;
  }
  const e0 = energy[0];
  if (e0 < 1e-20) return 0;

  let i5 = -1;
  let i25 = -1;
  for (let i = 0; i < n; i++) {
    const db = 10 * Math.log10(Math.max(1e-30, energy[i] / e0));
    if (i5 < 0 && db <= -5) i5 = i;
    if (i25 < 0 && db <= -25) {
      i25 = i;
      break;
    }
  }
  if (i5 < 0) i5 = 0;
  if (i25 < 0 || i25 <= i5) return 0;
  const span = (i25 - i5) / sampleRate;
  // 20 dB of measured decay extrapolated to 60.
  return span * 3;
}

/** Every headline figure for a mono signal in one pass-ish. */
export function statsOf(data: Float32Array, sampleRate: number): Stats {
  const p = peak(data);
  const floor = p * 0.001;
  let last = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (Math.abs(data[i]) > floor) {
      last = i;
      break;
    }
  }
  let peakIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) >= p - 1e-9) {
      peakIdx = i;
      break;
    }
  }
  return {
    peak: p,
    rms: rms(data),
    attack: attackTime(data, sampleRate),
    peakAt: peakIdx / sampleRate,
    centroid: spectralCentroid(data, sampleRate),
    decay: Math.max(0, (last - peakIdx) / sampleRate),
    clipped: p >= 0.9999,
    duration: data.length / sampleRate,
  };
}

/** Mean absolute difference between two signals, on the shorter length. */
export function difference(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s / n;
}

/** Normalised cross-correlation at zero lag; 1 means identical shape. */
export function correlation(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += a[i] * b[i];
    saa += a[i] * a[i];
    sbb += b[i] * b[i];
  }
  const d = Math.sqrt(saa * sbb);
  return d > 1e-20 ? sab / d : 0;
}

/**
 * Coarse envelope in dBFS, for dumping a waveform to text and eyeballing the
 * shape of something that cannot be listened to.
 */
export function envelopeDb(data: Float32Array, buckets = 64): Float32Array {
  const out = new Float32Array(buckets);
  const per = Math.max(1, Math.floor(data.length / buckets));
  for (let b = 0; b < buckets; b++) {
    const start = b * per;
    const p = peak(data, start, per);
    out[b] = 20 * Math.log10(Math.max(1e-6, p));
  }
  return out;
}
