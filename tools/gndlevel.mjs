#!/usr/bin/env node
// Measure the trail's value against the foliage standing next to it.
//
// "The trail is the brightest thing in the frame" is a judgement about a ratio
// between two regions of one picture, so it wants a number rather than an
// opinion: the whole point of the note is that the surroundings moved and the
// track did not follow.
//
// Hand-placed boxes were the first attempt and they are too fragile — a box that
// framed open running surface in one capture lands in a tree shadow in the next,
// and then the number says the trail is five times too dark when nothing about
// the trail has changed. So classify every pixel instead. Bare earth is warm
// (red above green) and foliage is not, which separates the two cleanly in this
// scene and does not care where either one happens to be this frame. Percentiles
// rather than means, because what pulls the eye is the bright end of the ground,
// not its average.
//
//   node tools/gndlevel.mjs --in shots/gd_17/forest.png
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];

const files = (opt.in || '').split(',');
const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);

const report = (file) => {
  const probe = execFileSync('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=p=0',
    file,
  ])
    .toString()
    .trim()
    .split(',')
    .map(Number);
  const [w, h] = probe;
  const buf = execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {
    maxBuffer: 1 << 28,
  });

  const earth = [];
  const leaf = [];
  const sky = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const r = srgbToLinear(buf[i] / 255);
      const g = srgbToLinear(buf[i + 1] / 255);
      const b = srgbToLinear(buf[i + 2] / 255);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // Sky and haze read blue-dominant and only ever sit above the horizon.
      if (b > r * 0.92 && y < h * 0.55) {
        sky.push(lum);
        continue;
      }
      // Bare earth: clearly warm. 1.35 keeps the olive verge and the mossy floor
      // out of the earth bucket, which is what makes the comparison mean anything.
      if (r > g * 1.35) earth.push(lum);
      else if (g >= r * 0.95) leaf.push(lum);
    }
  }
  earth.sort((a, b) => a - b);
  leaf.sort((a, b) => a - b);
  sky.sort((a, b) => a - b);

  const line = (name, arr) =>
    `${name.padEnd(7)} n=${String(arr.length).padStart(6)}  p50 ${(pct(arr, 0.5) * 1000).toFixed(0).padStart(4)}  p90 ${(pct(arr, 0.9) * 1000).toFixed(0).padStart(4)}  p99 ${(pct(arr, 0.99) * 1000).toFixed(0).padStart(4)}`;
  console.log(`--- ${file}   (linear luminance x1000)`);
  console.log(line('earth', earth));
  console.log(line('leaf', leaf));
  console.log(line('sky', sky));
  const r90 = pct(leaf, 0.9) > 0 ? pct(earth, 0.9) / pct(leaf, 0.9) : 0;
  const r50 = pct(leaf, 0.5) > 0 ? pct(earth, 0.5) / pct(leaf, 0.5) : 0;
  console.log(`  earth/leaf  p90 ${r90.toFixed(2)}   p50 ${r50.toFixed(2)}    (want p90 near 1, p50 above 1)`);
  return { r90, r50 };
};

for (const f of files) {
  report(f.trim());
  console.log();
}
