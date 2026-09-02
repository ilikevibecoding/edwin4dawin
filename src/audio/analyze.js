/**
 * Offline analysis of a rendered AudioBuffer (renderPreview): peak, RMS over the active region,
 * -60 dB duration, NaN/clip counters and a coarse 3-band energy split (low < 200 Hz, mid, high > 2.5 kHz)
 * so mixes can be sanity-checked without ears ("fizzy" = high share too big, "thin" = low share too small).
 */

const dB = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);

/** RBJ biquad (2nd order), returns a filtered copy. */
function biquad(x, sr, type, f0, Q = Math.SQRT1_2) {
  const w0 = (2 * Math.PI * f0) / sr;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  const alpha = sw / (2 * Q);
  let b0, b1, b2;
  if (type === 'lowpass') {
    b0 = (1 - cw) / 2;
    b1 = 1 - cw;
    b2 = (1 - cw) / 2;
  } else {
    b0 = (1 + cw) / 2;
    b1 = -(1 + cw);
    b2 = (1 + cw) / 2;
  }
  const a0 = 1 + alpha;
  const a1 = -2 * cw;
  const a2 = 1 - alpha;
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b0 * xi + b1 * x1 + b2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = yi;
    y[i] = yi;
  }
  return y;
}

function energy(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return s;
}

export function analyzeBuffer(buf, { threshold = 0.001 } = {}) {
  const chs = buf.numberOfChannels;
  const n = buf.length;
  const sr = buf.sampleRate;
  const data = [];
  for (let c = 0; c < chs; c++) data.push(buf.getChannelData(c));

  let peak = 0;
  let nan = 0;
  let clipped = 0;
  let first = -1;
  let last = -1;
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let c = 0; c < chs; c++) {
      const x = data[c][i];
      if (x !== x || !Number.isFinite(x)) {
        nan++;
        continue;
      }
      const ax = Math.abs(x);
      if (ax > peak) peak = ax;
      if (ax >= 0.985) clipped++;
      if (ax > threshold) {
        if (first < 0) first = i;
        last = i;
      }
      m += x;
    }
    mono[i] = m / chs;
  }

  let sumSq = 0;
  let count = 0;
  if (first >= 0) {
    for (let i = first; i <= last; i++) {
      for (let c = 0; c < chs; c++) {
        const x = data[c][i];
        if (x === x) {
          sumSq += x * x;
          count++;
        }
      }
    }
  }
  const rms = count ? Math.sqrt(sumSq / count) : 0;

  let bands = null;
  if (first >= 0) {
    const seg = mono.subarray(first, last + 1);
    const low = energy(biquad(seg, sr, 'lowpass', 200));
    const high = energy(biquad(seg, sr, 'highpass', 2500));
    const mid = energy(biquad(biquad(seg, sr, 'lowpass', 2500), sr, 'highpass', 200));
    const tot = low + mid + high || 1;
    bands = { low: +(low / tot).toFixed(3), mid: +(mid / tot).toFixed(3), high: +(high / tot).toFixed(3) };
  }

  return {
    peak: +peak.toFixed(4),
    peakDb: +dB(peak).toFixed(1),
    rms: +rms.toFixed(4),
    rmsDb: +dB(rms).toFixed(1),
    startMs: first >= 0 ? +((first / sr) * 1000).toFixed(1) : null,
    durationMs: first >= 0 ? +(((last - first + 1) / sr) * 1000).toFixed(1) : 0,
    silent: first < 0,
    nan,
    clipped,
    bands,
    sampleRate: sr,
    renderedMs: +((n / sr) * 1000).toFixed(0),
  };
}
