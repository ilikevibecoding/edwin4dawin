#!/usr/bin/env node
/**
 * Procedural score for the demo render: rain bed, evolving synth pads, sub
 * pulses and occasional metallic pings, written straight to a WAV. No samples,
 * no libraries - the same "everything in code" rule as the renderer.
 *
 *   node tools/make-audio.mjs --seconds 520 --out render/demo/score.wav
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from './harness.mjs';

const args = parseArgs(process.argv.slice(2));
const seconds = Number(args.seconds ?? 520);
const outFile = path.resolve(args.out ?? 'render/score.wav');
const RATE = 44100;
const N = Math.floor(seconds * RATE);

// Deterministic noise so re-runs match.
let seed = 0x2f6b1a7d;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

const left = new Float32Array(N);
const right = new Float32Array(N);

// ---------------------------------------------------------------- rain bed
{
  // Two one-pole filters shape white noise into a wet hiss, plus slow gusts.
  let lp = 0;
  let hp = 0;
  let lp2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / RATE;
    const white = rnd() * 2 - 1;
    lp += (white - lp) * 0.42;
    hp = white - lp;
    lp2 += (hp - lp2) * 0.16;
    const gust = 0.55 + 0.45 * Math.sin(t * 0.07) * Math.sin(t * 0.031 + 1.3);
    const drops = lp2 * 0.5 + hp * 0.22;
    const amp = 0.085 * gust;
    left[i] += drops * amp;
    right[i] += (lp2 * 0.46 + hp * 0.25) * amp;
  }
}

// -------------------------------------------------------------------- pads
const CHORDS = [
  [55.0, 65.41, 82.41], // A minor-ish
  [49.0, 58.27, 73.42], // G
  [43.65, 51.91, 65.41], // F
  [41.2, 49.0, 61.74], // E
  [55.0, 69.3, 82.41], // A sus
  [46.25, 55.0, 69.3], // F# dim colour
];
{
  const barLength = 11.5;
  for (let bar = 0; bar * barLength < seconds; bar++) {
    const chord = CHORDS[bar % CHORDS.length];
    const start = Math.floor(bar * barLength * RATE);
    const len = Math.floor(barLength * 1.25 * RATE);
    for (let v = 0; v < chord.length; v++) {
      // Two detuned voices per note, one octave up at low level.
      for (const [mult, gain, detune] of [
        [1, 0.115, 0],
        [1, 0.09, 0.14],
        [2, 0.045, -0.1],
        [4, 0.016, 0.2],
      ]) {
        const freq = chord[v] * mult + detune;
        const phase0 = rnd() * Math.PI * 2;
        let filt = 0;
        for (let i = 0; i < len; i++) {
          const idx = start + i;
          if (idx >= N) break;
          const t = i / RATE;
          // Slow attack, long release.
          const env =
            Math.min(1, t / 3.2) * Math.min(1, Math.max(0, (barLength * 1.25 - t) / 4.0));
          const ph = phase0 + 2 * Math.PI * freq * t;
          // Saw-ish tone from a few harmonics, then lowpassed.
          const raw =
            Math.sin(ph) + 0.42 * Math.sin(ph * 2) + 0.22 * Math.sin(ph * 3) + 0.1 * Math.sin(ph * 5);
          const cutoff = 0.03 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.11 + bar));
          filt += (raw - filt) * cutoff;
          const pan = v === 0 ? -0.35 : v === 1 ? 0.3 : 0.05;
          const s = filt * env * gain;
          left[idx] += s * (1 - Math.max(0, pan));
          right[idx] += s * (1 + Math.min(0, pan));
        }
      }
    }
  }
}

// --------------------------------------------------------------- sub pulses
{
  const period = 5.75;
  for (let k = 0; k * period < seconds; k++) {
    const start = Math.floor(k * period * RATE);
    const len = Math.floor(2.4 * RATE);
    const freq = 41.2;
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      if (idx >= N) break;
      const t = i / RATE;
      const env = Math.exp(-t * 1.5) * Math.min(1, t / 0.02);
      const s = Math.sin(2 * Math.PI * freq * t + Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.6) * 0.16 * env;
      left[idx] += s;
      right[idx] += s;
    }
  }
}

// ------------------------------------------------------------------- pings
{
  // Sparse metallic bells, tuned to the pad, panned wide.
  let t = 6;
  while (t < seconds - 4) {
    const start = Math.floor(t * RATE);
    const base = [329.6, 392.0, 440.0, 523.3][Math.floor(rnd() * 4)];
    const pan = rnd() * 1.6 - 0.8;
    const len = Math.floor(3.4 * RATE);
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      if (idx >= N) break;
      const tt = i / RATE;
      const env = Math.exp(-tt * 1.9);
      const s =
        (Math.sin(2 * Math.PI * base * tt) * 0.6 +
          Math.sin(2 * Math.PI * base * 2.76 * tt) * 0.25 +
          Math.sin(2 * Math.PI * base * 5.4 * tt) * 0.12) *
        0.05 *
        env;
      left[idx] += s * (1 - Math.max(0, pan));
      right[idx] += s * (1 + Math.min(0, pan));
    }
    t += 7 + rnd() * 11;
  }
}

// ------------------------------------------------------------------- reverb
{
  // Cheap Schroeder-ish tail: a few combs into two allpasses.
  const combs = [1487, 1601, 1747, 1873].map((d) => ({ d, buf: new Float32Array(d), i: 0, g: 0.78 }));
  const allpass = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0, g: 0.6 }));
  const wet = 0.32;
  for (const ch of [left, right]) {
    for (const c of combs) c.buf.fill(0);
    for (const a of allpass) a.buf.fill(0);
    for (let i = 0; i < N; i++) {
      const dry = ch[i];
      let acc = 0;
      for (const c of combs) {
        const out = c.buf[c.i];
        c.buf[c.i] = dry + out * c.g;
        c.i = (c.i + 1) % c.d;
        acc += out;
      }
      acc *= 0.25;
      for (const a of allpass) {
        const bufOut = a.buf[a.i];
        const out = -acc + bufOut;
        a.buf[a.i] = acc + bufOut * a.g;
        a.i = (a.i + 1) % a.d;
        acc = out;
      }
      ch[i] = dry * (1 - wet * 0.5) + acc * wet;
    }
  }
}

// --------------------------------------------------------- normalise + fades
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const norm = peak > 0 ? 0.82 / peak : 1;
const fade = Math.floor(3.5 * RATE);
for (let i = 0; i < N; i++) {
  let g = norm;
  if (i < fade) g *= i / fade;
  if (i > N - fade) g *= (N - i) / fade;
  left[i] *= g;
  right[i] *= g;
}

// --------------------------------------------------------------- write WAV
const bytes = Buffer.alloc(44 + N * 4);
bytes.write('RIFF', 0);
bytes.writeUInt32LE(36 + N * 4, 4);
bytes.write('WAVE', 8);
bytes.write('fmt ', 12);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(2, 22);
bytes.writeUInt32LE(RATE, 24);
bytes.writeUInt32LE(RATE * 4, 28);
bytes.writeUInt16LE(4, 32);
bytes.writeUInt16LE(16, 34);
bytes.write('data', 36);
for (let i = 0; i < N; i++) {
  bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767))), 44 + i * 4);
  bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767))), 46 + i * 4);
}
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, bytes);
console.log(`wrote ${outFile} (${seconds}s, ${(bytes.length / 1e6).toFixed(1)} MB)`);
