/**
 * Scratch measurement helper. Not part of the build.
 *
 * Reports mean sRGB luminance and B-R for named rectangles of a capture, in the
 * same units the art-director review used, so before/after numbers are directly
 * comparable to the ones in critique/round1.md.
 *
 * Rectangles are fractions of the frame, so the same call measures the same
 * part of the room whatever resolution it was captured at — which matters here
 * because the review's frames are 1600x900 and iterating at that size costs
 * four minutes a look.
 *
 *   node tools/.lgt-meter.mjs <png> <name>=x,y,w,h [<name>=x,y,w,h ...]
 */
import { execFileSync } from 'node:child_process';

const [src, ...specs] = process.argv.slice(2);
if (!src || specs.length === 0) {
  console.error('usage: .lgt-meter.mjs <png> <name>=x,y,w,h ...');
  process.exit(1);
}

const size = execFileSync('ffprobe', [
  '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src,
]).toString().trim().split(',').map(Number);
const [W, H] = size;

const rows = [];
for (const spec of specs) {
  const [name, box] = spec.split('=');
  const f = box.split(',').map(Number);
  const x = Math.round(f[0] * W);
  const y = Math.round(f[1] * H);
  const w = Math.max(1, Math.round(f[2] * W));
  const h = Math.max(1, Math.round(f[3] * H));
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', src, '-vf', `crop=${w}:${h}:${x}:${y},format=rgb24`,
     '-f', 'rawvideo', '-'],
    { maxBuffer: 1 << 28 },
  );
  let r = 0, g = 0, b = 0, lsum = 0, lsq = 0, dark = 0;
  const n = raw.length / 3;
  for (let i = 0; i < raw.length; i += 3) {
    const R = raw[i], G = raw[i + 1], B = raw[i + 2];
    r += R; g += G; b += B;
    /* Rec.709 on the sRGB code values, matching how the review measured. */
    const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    lsum += L; lsq += L * L;
    if (L < 8) dark++;
  }
  const mean = lsum / n;
  rows.push({
    name,
    L: +(mean).toFixed(1),
    sd: +Math.sqrt(Math.max(lsq / n - mean * mean, 0)).toFixed(1),
    rgb: [r / n, g / n, b / n].map((v) => +v.toFixed(1)),
    BminusR: +((b - r) / n).toFixed(1),
    pctBelow8: +((100 * dark) / n).toFixed(1),
  });
}

const w = [14, 8, 7, 22, 10, 10];
console.log(`${src}  ${W}x${H}`);
console.log(['region', 'L', 'sd', 'rgb', 'B-R', '%<L8'].map((s, i) => s.padEnd(w[i])).join(''));
for (const x of rows) {
  console.log(
    [x.name, x.L, x.sd, `(${x.rgb.join(', ')})`, x.BminusR, x.pctBelow8]
      .map((s, i) => String(s).padEnd(w[i])).join(''),
  );
}
const byName = Object.fromEntries(rows.map((r) => [r.name, r.L]));
if (byName.floor !== undefined && byName.ceiling !== undefined) {
  console.log(
    `\nfloor/ceiling = ${(byName.floor / Math.max(byName.ceiling, 0.01)).toFixed(2)}` +
      `   (want > 1; review measured 0.06)`,
  );
}
