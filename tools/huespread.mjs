#!/usr/bin/env node
// Hue histogram of a region of a shot.
//
//   node tools/huespread.mjs --in shots/fr_14/forest.png --rect 120,110,270,110
//
// "The undergrowth hue family is still narrow" is a measurable claim and looking
// at a 512 px frame is not a reliable way to measure it: the eye reports the
// dominant hue and stops. This bins every reasonably saturated mid-value pixel of
// a region by hue and reports how much of the region sits inside the widest 30
// degree bucket, which is the number that has to come down.
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const src = arg('in');
const rect = arg('rect', '');
const minSat = Number(arg('sat', '0.1'));

if (!src) {
  console.error('usage: huespread.mjs --in shot.png [--rect x,y,w,h] [--sat 0.1]');
  process.exit(1);
}

const vf = rect ? `crop=${rect.split(',')[2]}:${rect.split(',')[3]}:${rect.split(',')[0]}:${rect.split(',')[1]}` : 'null';
const raw = execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {
  maxBuffer: 1 << 28,
});

const bins = new Array(24).fill(0);
let n = 0;
let dull = 0;
let satSum = 0;
let satSum2 = 0;
let valSum = 0;
for (let i = 0; i < raw.length; i += 3) {
  const r = raw[i] / 255;
  const g = raw[i + 1] / 255;
  const b = raw[i + 2] / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const v = mx;
  const s = mx <= 0 ? 0 : (mx - mn) / mx;
  if (v < 0.05 || v > 0.85) continue;
  n++;
  satSum += s;
  satSum2 += s * s;
  valSum += v;
  if (s < minSat) {
    dull++;
    continue;
  }
  let hh;
  const d = mx - mn;
  if (mx === r) hh = ((g - b) / d + 6) % 6;
  else if (mx === g) hh = (b - r) / d + 2;
  else hh = (r - g) / d + 4;
  bins[Math.floor((hh * 60) / 15) % 24]++;
}

const coloured = n - dull;
// widest run of two adjacent bins, i.e. a 30 degree family
let best = 0;
let bestAt = 0;
for (let i = 0; i < 24; i++) {
  const s = bins[i] + bins[(i + 1) % 24];
  if (s > best) {
    best = s;
    bestAt = i;
  }
}
// hue entropy, normalised so an even spread over all 24 bins is 1
let ent = 0;
for (const c of bins) {
  const p = c / coloured;
  if (p > 0) ent -= p * Math.log(p);
}
ent /= Math.log(24);
const satSd = Math.sqrt(Math.max(0, satSum2 / n - (satSum / n) ** 2));
console.log(`${src}${rect ? ` [${rect}]` : ''}`);
console.log(
  `  ${n} px in range, ${((dull / n) * 100).toFixed(1)}% under sat ${minSat}, sat ${(satSum / n).toFixed(3)}+-${satSd.toFixed(3)} val ${(valSum / n).toFixed(3)}`,
);
console.log(
  `  dominant 30deg family ${bestAt * 15}-${bestAt * 15 + 30}deg holds ${((best / coloured) * 100).toFixed(1)}% of saturated px, hue entropy ${ent.toFixed(3)}`,
);
console.log(
  '  ' +
    bins
      .map((c, i) => (c / coloured > 0.02 ? `${i * 15}:${((c / coloured) * 100).toFixed(0)}%` : null))
      .filter(Boolean)
      .join('  '),
);
