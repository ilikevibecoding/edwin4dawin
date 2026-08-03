#!/usr/bin/env node
/**
 * Is the narration where the picture thinks it is?
 *
 * The film's subtitles, choreography and camera cues are all keyed off
 * src/story/timing.json, and so is the audio mix -- so in principle the two
 * cannot drift. In practice the mux is a separate step with its own offsets,
 * the master gets rebuilt independently of the render, and a video with the
 * dialogue half a second out is the one defect that no amount of looking at
 * frames will ever catch.
 *
 * So: decode each voice stem and the finished film's audio track, reduce both
 * to a 100 Hz loudness envelope, and slide one over the other. The lag with
 * the strongest correlation is where that line actually plays. Compare it with
 * where the script says it starts.
 *
 *   npm run sync                      # checks render/film.mp4
 *   npm run sync -- --file=out.mp4 --tol=0.1
 *
 * Lines buried under dense effects correlate weakly -- the reported `q` is the
 * peak over the mean, and anything under about 3 is a guess rather than a
 * match. Read those rows with the quality column, not on their own.
 */
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { ROOT } from './browser.mjs';

const args = Object.fromEntries(process.argv.slice(2)
  .filter((a) => a.startsWith('--'))
  .map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));

const FILE = resolve(args.file || join(ROOT, 'render/film.mp4'));
const TOL = +(args.tol || 0.15);          // seconds a line may be out by
const SR = 16000;                          // decode rate
const HOP = 160;                           // -> a 100 Hz envelope
const PAD = 1.5;                           // seconds of slack either side

if (!existsSync(FILE)) {
  process.stderr.write(`no such file: ${FILE}\nrun \`npm run capture\` first.\n`);
  process.exit(2);
}

/** Decode a slice of any media file to mono float samples. */
function decode(path, ss, dur) {
  return new Promise((res, rej) => {
    const a = ['-v', 'error'];
    if (ss !== undefined) a.push('-ss', String(ss));
    a.push('-i', path);
    if (dur !== undefined) a.push('-t', String(dur));
    a.push('-ac', '1', '-ar', String(SR), '-f', 's16le', '-');
    const p = spawn('ffmpeg', a);
    const chunks = [];
    p.stdout.on('data', (c) => chunks.push(c));
    p.on('error', rej);
    p.on('close', (code) => {
      if (code !== 0) return rej(new Error(`ffmpeg exited ${code} on ${path}`));
      const buf = Buffer.concat(chunks);
      const out = new Float32Array(buf.length >> 1);
      for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(i * 2) / 32768;
      res(out);
    });
  });
}

/** Mean absolute amplitude per hop, then zero-mean and unit-variance. */
function envelope(x) {
  const n = Math.floor(x.length / HOP);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * HOP; j < (i + 1) * HOP; j++) s += Math.abs(x[j]);
    e[i] = s / HOP;
  }
  let m = 0;
  for (const v of e) m += v;
  m /= n || 1;
  let sd = 0;
  for (const v of e) sd += (v - m) ** 2;
  sd = Math.sqrt(sd / (n || 1)) || 1e-9;
  for (let i = 0; i < n; i++) e[i] = (e[i] - m) / sd;
  return e;
}

/** Lag (in hops) of the best match of `kernel` inside `hay`, and its strength. */
function bestLag(hay, kernel) {
  const lags = hay.length - kernel.length;
  let best = 0, peak = -Infinity, sum = 0;
  for (let l = 0; l <= lags; l++) {
    let c = 0;
    for (let i = 0; i < kernel.length; i++) c += hay[l + i] * kernel[i];
    sum += Math.abs(c);
    if (c > peak) { peak = c; best = l; }
  }
  return { lag: best, q: peak / ((sum / (lags + 1)) || 1e-9) };
}

const timing = JSON.parse(readFileSync(join(ROOT, 'src/story/timing.json'), 'utf8'));
const rows = [];

for (const line of timing.lines) {
  const stemPath = join(ROOT, `public/audio/vo/${line.id}.wav`);
  if (!existsSync(stemPath)) continue;
  const stem = await decode(stemPath);
  if (stem.length < SR / 2) continue;

  const from = Math.max(0, line.start - PAD);
  const clip = await decode(FILE, from, line.dur + PAD * 2);
  const kernel = envelope(stem.subarray(0, Math.min(stem.length, clip.length)));
  const hay = envelope(clip);
  if (hay.length <= kernel.length) continue;

  const { lag, q } = bestLag(hay, kernel);
  rows.push({ ...line, off: from + (lag * HOP) / SR - line.start, q });
}

if (!rows.length) {
  process.stderr.write('no voice stems found -- run `npm run audio` first.\n');
  process.exit(2);
}

let bad = 0;
process.stdout.write(`${'line'.padEnd(6)}${'who'.padEnd(10)}${'offset'.padStart(8)}${'q'.padStart(6)}  text\n`);
for (const r of rows) {
  const off = Math.abs(r.off) > TOL;
  // A weak correlation is a line the effects bed drowned, not a line that is
  // late; call it out separately rather than failing the run on it.
  if (off && r.q >= 3) bad++;
  const mark = off ? (r.q < 3 ? '  ~ weak match' : '  <-- OUT') : '';
  process.stdout.write(`${r.id.padEnd(6)}${r.who.padEnd(10)}${r.off.toFixed(3).padStart(8)}`
    + `${r.q.toFixed(1).padStart(6)}  ${r.text.slice(0, 40)}${mark}\n`);
}

const exact = rows.filter((r) => Math.abs(r.off) <= 0.05).length;
process.stdout.write(`\n${rows.length} lines | ${exact} within 50 ms | ${bad} out by more than ${TOL}s\n`);
process.exit(bad ? 1 : 0);
