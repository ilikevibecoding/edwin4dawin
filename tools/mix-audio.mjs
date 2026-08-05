/**
 * Soundtrack mixer for the offline recording.
 *
 * The live game synthesises its rain, score and effects in WebAudio, which
 * cannot be captured from a screenshot loop. The Director therefore logs every
 * audio event with the game time it fired at, and this script rebuilds the same
 * mix on the same timeline: dialogue is placed from the rendered voice pack, and
 * the rain, drone, arpeggio and one-shots are re-synthesised here with the same
 * shapes the runtime uses.
 *
 *   node tools/mix-audio.mjs --cues .render/cues.json --out .render/track.wav --duration 620
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};

const CUES = arg('cues', '.render/cues.json');
const OUT = arg('out', '.render/track.wav');
const RATE = 48000;
const cues = JSON.parse(fs.readFileSync(CUES, 'utf8'));
const manifest = JSON.parse(fs.readFileSync('public/audio/voices.json', 'utf8'));
const lastCue = cues.length ? cues[cues.length - 1].time : 0;
const DURATION = Number(arg('duration', Math.ceil(lastCue + 12)));
const N = Math.ceil(DURATION * RATE);

const left = new Float32Array(N);
const right = new Float32Array(N);

const add = (at, sample, gain, pan = 0) => {
  const i = Math.floor(at * RATE);
  if (i < 0 || i >= N) return;
  const l = gain * (1 - Math.max(0, pan));
  const r = gain * (1 + Math.min(0, pan));
  left[i] += sample * l;
  right[i] += sample * r;
};

// -------------------------------------------------------------------- dialogue

const tmp = fs.mkdtempSync('/tmp/vo-');
function decode(file) {
  const wav = path.join(tmp, `${path.basename(file, path.extname(file))}.raw`);
  execFileSync('ffmpeg', ['-v', 'quiet', '-y', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(RATE), wav]);
  const buf = fs.readFileSync(wav);
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
}

let voiceCount = 0;
for (const cue of cues) {
  if (cue.kind !== 'voice') continue;
  const entry = manifest[cue.id];
  if (!entry) continue;
  const pcm = decode(path.join('public/audio', entry.file));
  const start = Math.floor(cue.time * RATE);
  for (let i = 0; i < pcm.length; i++) {
    const j = start + i;
    if (j >= N) break;
    // Dialogue sits centre and loud; everything else is bedded under it.
    left[j] += pcm[i] * 1.0;
    right[j] += pcm[i] * 1.0;
  }
  voiceCount++;
}
fs.rmSync(tmp, { recursive: true, force: true });

/** Windows where dialogue is playing, used to duck the bed. */
const speech = [];
for (const cue of cues) {
  if (cue.kind !== 'voice') continue;
  const entry = manifest[cue.id];
  if (entry) speech.push([cue.time - 0.15, cue.time + entry.duration + 0.35]);
}
const duckAt = (t) => (speech.some(([a, b]) => t >= a && t <= b) ? 0.55 : 1);

// ------------------------------------------------------------------------ rain

// Two-pole smoothed noise, one-pole high-passed: the same recipe the runtime
// uses, which is what makes the recorded bed match the live one.
let rl = 0;
let rr = 0;
let hl = 0;
let hr = 0;
for (let i = 0; i < N; i++) {
  const t = i / RATE;
  rl = rl * 0.7 + (Math.random() * 2 - 1) * 0.3;
  rr = rr * 0.7 + (Math.random() * 2 - 1) * 0.3;
  const cut = 0.55;
  hl += (rl - hl) * cut;
  hr += (rr - hr) * cut;
  const gust = 0.82 + 0.18 * Math.sin(t * 0.19) + 0.08 * Math.sin(t * 0.53 + 1.2);
  const level = 0.14 * gust * duckAt(t);
  left[i] += (rl - hl) * level * 1.6;
  right[i] += (rr - hr) * level * 1.6;
}

// ----------------------------------------------------------------------- score

const NOTE = (s) => 440 * Math.pow(2, s / 12);
const musicRoot = NOTE(-24);
// Sustained bed: root, fifth, minor tenth, sub.
const bed = [
  [1, 0.16, 0],
  [1.5, 0.1, -0.3],
  [2.378, 0.055, 0.35],
  [0.5, 0.11, 0],
];
for (let i = 0; i < N; i++) {
  const t = i / RATE;
  const swell = 0.62 + 0.38 * Math.sin(t * 0.07);
  let s = 0;
  for (const [mult, gain] of bed) {
    s += Math.sin(2 * Math.PI * musicRoot * mult * t) * gain;
  }
  const level = 0.42 * swell * duckAt(t);
  left[i] += s * level;
  right[i] += s * level * 0.94;
}

// Sparse arpeggio, one note every beat, exponentially decaying.
const pattern = [0, 3, 7, 10, 7, 3, 12, 7];
{
  let t = 2.5;
  let step = 0;
  while (t < DURATION) {
    const beat = 0.95;
    const freq = musicRoot * 4 * Math.pow(2, pattern[step % pattern.length] / 12);
    const peak = 0.05 * duckAt(t);
    const len = Math.floor(beat * 1.9 * RATE);
    const start = Math.floor(t * RATE);
    for (let i = 0; i < len; i++) {
      const j = start + i;
      if (j >= N) break;
      const lt = i / RATE;
      const env = Math.exp(-lt * 3.1);
      const s = Math.sin(2 * Math.PI * freq * lt) * 0.7 + Math.sin(2 * Math.PI * freq * 2 * lt) * 0.18;
      left[j] += s * env * peak;
      right[j] += s * env * peak;
    }
    step += step % 2 === 1 ? 2 : 1;
    t += beat * 2;
  }
}

// ------------------------------------------------------------------- one-shots

function thunder(at, distance) {
  const len = Math.floor(2.8 * RATE);
  const start = Math.floor(at * RATE);
  let lp = 0;
  const level = 0.5 * (1 - distance * 0.55);
  for (let i = 0; i < len; i++) {
    const j = start + i;
    if (j >= N) break;
    const t = i / RATE;
    // Cutoff sweeps down, which is what makes it read as distance rather than
    // just a noise burst.
    const cut = Math.max(0.002, 0.06 * Math.exp(-t * 1.4));
    lp += ((Math.random() * 2 - 1) - lp) * cut;
    const env = t < 0.08 ? t / 0.08 : Math.exp(-(t - 0.08) * 1.5);
    add(t + at, lp * 6, env * level, 0);
    void j;
  }
}

function bang(at, level) {
  const len = Math.floor(0.55 * RATE);
  let bp = 0;
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const n = Math.random() * 2 - 1;
    const cut = Math.max(0.01, 0.5 * Math.exp(-t * 12));
    bp += (n - bp) * cut;
    const band = bp - prev;
    prev = bp;
    const env = Math.exp(-t * 9);
    add(at + t, band * 8 + Math.sin(2 * Math.PI * (120 * Math.exp(-t * 7) + 38) * t) * 0.7, env * level, 0);
  }
}

function blip(at, f0, f1, dur, level) {
  const len = Math.floor(dur * RATE);
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const f = f0 + (f1 - f0) * (t / dur);
    const env = Math.min(1, t / 0.005) * Math.exp(-t * (3 / dur));
    add(at + t, Math.sin(2 * Math.PI * f * t), env * level, 0);
  }
}

function heartbeat(at, level) {
  const len = Math.floor(0.4 * RATE);
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const f = 64 * Math.exp(-t * 2.6) + 34;
    const env = Math.min(1, t / 0.02) * Math.exp(-t * 9);
    add(at + t, Math.sin(2 * Math.PI * f * t), env * level * 0.5, 0);
  }
}

let sfxCount = 0;
for (const cue of cues) {
  if (cue.kind !== 'sfx') continue;
  const [kind, levelStr] = cue.id.split(':');
  const level = Number(levelStr ?? 1);
  switch (kind) {
    case 'thunder':
      thunder(cue.time, 1 - level);
      break;
    case 'bang':
      bang(cue.time, level * 0.85);
      break;
    case 'heartbeat':
      heartbeat(cue.time, level);
      break;
    case 'blipSelect':
      blip(cue.time, 880, 880, 0.05, 0.12);
      break;
    case 'blipConfirm':
      blip(cue.time, 660, 1320, 0.12, 0.14);
      break;
    case 'blipScan':
      blip(cue.time, 1760, 2200, 0.09, 0.1);
      break;
    case 'blipFound':
      blip(cue.time, 1320, 1980, 0.16, 0.12);
      break;
    case 'blipFail':
      blip(cue.time, 400, 180, 0.24, 0.14);
      break;
    default:
      break;
  }
  sfxCount++;
}

// --------------------------------------------------------------------- mastering

// Soft-knee limiter, then a short fade at each end.
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const norm = peak > 0.001 ? Math.min(1.6, 0.9 / peak) : 1;
const fade = Math.floor(1.2 * RATE);
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  let l = Math.tanh(left[i] * norm * 1.05) * 0.94;
  let r = Math.tanh(right[i] * norm * 1.05) * 0.94;
  if (i < fade) {
    const k = i / fade;
    l *= k;
    r *= k;
  }
  if (i > N - fade) {
    const k = (N - i) / fade;
    l *= k;
    r *= k;
  }
  pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(l * 32767))), i * 4);
  pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(r * 32767))), i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([header, pcm]));
console.log(
  `mixed ${DURATION.toFixed(1)}s: ${voiceCount} dialogue lines, ${sfxCount} effects -> ${OUT}`
);
