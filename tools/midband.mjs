#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Does a band of a frame read as clumps or as a wash?
//
//   node tools/midband.mjs --in shots/iter_13/road.png --rect 530,0,240,200
//
// Three numbers, because "flat" has three separate meanings and the fixes for
// them are different:
//
//   value spread  — the sRGB luma percentile range over the band. A wash is
//                   narrow and centred; foliage with sunlit sprays and interior
//                   voids is wide and reaches both ends.
//   dark fraction — how much of the band sits below a shadow threshold. Real
//                   conifer at this distance has holes through to the dark
//                   behind it; paint has none.
//   edge energy   — mean absolute luma gradient, i.e. how hard the boundaries
//                   are. Softness at distance is what reads as watercolour, and
//                   it is invisible in a histogram: a band can have a wide value
//                   range and still be entirely soft ramps between the extremes.
//
// Reported at full resolution and at a 2x box downsample. Structure that
// survives the downsample is clump-scale; structure that vanishes was per-pixel
// noise and was never going to carry the crown at 30 m.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const file = arg('in', '');
if (!file) {
  console.error('usage: midband.mjs --in shot.png [--rect x,y,w,h] [--dark 0.10]');
  process.exit(1);
}
const darkAt = Number(arg('dark', '0.10'));
const rect = arg('rect', '');
if (!rect) {
  console.error('midband.mjs needs --rect x,y,w,h');
  process.exit(1);
}
const [rx, ry, rw, rh] = rect.split(',').map(Number);
const raw = execFileSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-i', file, '-vf', `crop=${rw}:${rh}:${rx}:${ry}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
  { maxBuffer: 1 << 28 },
);

// Sky has to come out of the statistic or it decides it. A rect that catches a
// patch of sky reads as high contrast whatever the foliage in it is doing, and
// the amount of sky in the rect changes every time the trail or the truck pose
// moves — so two captures of the same band are not comparable unless it goes.
// Sky here is anything blue-dominant and bright; nothing in this forest is.
const isSky = (r, g, b) => b > r * 1.12 && b > 70;
const grid = [];
const mask = [];
for (let y = 0; y < rh; y++) {
  const row = [];
  const mrow = [];
  for (let x = 0; x < rw; x++) {
    const i = (y * rw + x) * 3;
    row.push((0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2]) / 255);
    mrow.push(isSky(raw[i], raw[i + 1], raw[i + 2]) ? 0 : 1);
  }
  grid.push(row);
  mask.push(mrow);
}
const skyFrac = 1 - mask.flat().reduce((a, b) => a + b, 0) / (rw * rh);

const halve = (g, m) => {
  const og = [];
  const om = [];
  for (let y = 0; y + 1 < g.length; y += 2) {
    const gr = [];
    const mr = [];
    for (let x = 0; x + 1 < g[y].length; x += 2) {
      const w = m[y][x] + m[y][x + 1] + m[y + 1][x] + m[y + 1][x + 1];
      gr.push(w ? (g[y][x] * m[y][x] + g[y][x + 1] * m[y][x + 1] + g[y + 1][x] * m[y + 1][x] + g[y + 1][x + 1] * m[y + 1][x + 1]) / w : 0);
      // a downsampled texel counts only if it was mostly foliage to begin with
      mr.push(w >= 3 ? 1 : 0);
    }
    og.push(gr);
    om.push(mr);
  }
  return [og, om];
};

const report = (g, m, label) => {
  const flat = [];
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (m[y][x]) flat.push(g[y][x]);
  flat.sort((a, b) => a - b);
  if (!flat.length) return;
  const p = (q) => flat[Math.floor((flat.length - 1) * q)];
  const dark = flat.filter((v) => v < darkAt).length / flat.length;
  const bright = flat.filter((v) => v > p(0.5) * 2.2).length / flat.length;
  let edge = 0;
  let n = 0;
  for (let y = 1; y < g.length; y++) {
    for (let x = 1; x < g[y].length; x++) {
      if (!m[y][x] || !m[y][x - 1] || !m[y - 1][x]) continue;
      edge += Math.abs(g[y][x] - g[y][x - 1]) + Math.abs(g[y][x] - g[y - 1][x]);
      n += 2;
    }
  }
  console.log(
    `  ${label.padEnd(8)} p10 ${p(0.1).toFixed(3)}  p50 ${p(0.5).toFixed(3)}  p90 ${p(0.9).toFixed(3)}` +
      `  |  spread ${(p(0.9) / Math.max(p(0.1), 1e-4)).toFixed(2)}x` +
      `  dark<${darkAt} ${(dark * 100).toFixed(1)}%  bright ${(bright * 100).toFixed(1)}%  edge ${(edge / Math.max(n, 1)).toFixed(4)}`,
  );
};

console.log(`${file} [${rect}]  sky masked ${(skyFrac * 100).toFixed(0)}%`);
report(grid, mask, 'full');
const [g2, m2] = halve(grid, mask);
report(g2, m2, 'half');
const [g4, m4] = halve(g2, m2);
report(g4, m4, 'quarter');
