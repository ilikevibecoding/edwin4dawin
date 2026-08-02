#!/usr/bin/env node
/**
 * Grab still frames from the film for review.
 *
 *   node tools/shots.mjs --times 0,4,8 --out /tmp/shots
 *   node tools/shots.mjs --scene trench --n 8 --out /tmp/trench
 *   node tools/shots.mjs --scene chase --n 6 --contact /tmp/chase.png
 *
 * With --contact it also writes a labelled contact sheet, which is the fastest
 * way to eyeball a whole scene at once.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openFilm, buildAndServe } from './browser.mjs';

const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (k) => argv.includes('--' + k);

const out = arg('out', '/tmp/shots');
const scene = arg('scene', null);
const width = parseInt(arg('w', '1280'), 10);
const height = parseInt(arg('h', '720'), 10);
const n = parseInt(arg('n', '6'), 10);
const contact = arg('contact', null);
const bloom = !has('no-bloom');
// Default to the dev server here: scene authors want their latest edit.
let server = null;
let BASE = arg('base', 'http://localhost:5173');
if (has('dist')) {
  server = await buildAndServe();
  BASE = server.url;
}

fs.mkdirSync(out, { recursive: true });

const film = await openFilm({ base: BASE, width, height, scene, bloom, quiet: false });
console.log(`film duration ${film.duration.toFixed(1)}s, ${film.scenes.length} scene(s)`);

let times;
if (arg('times')) {
  times = arg('times')
    .split(',')
    .map((s) => parseFloat(s));
} else {
  const d = film.duration;
  times = Array.from({ length: n }, (_, i) => (d * (i + 0.5)) / n);
}

const files = [];
for (const t of times) {
  const data = await film.page.evaluate((tt) => window.FILM.drawAndGrab(tt, 0.95), t);
  const f = path.join(out, `t${t.toFixed(2).replace('.', '_')}.jpg`);
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
  files.push({ f, t });
  const info = await film.page.evaluate('window.FILM.info()');
  console.log(`  ${t.toFixed(2)}s -> ${path.basename(f)}  (${info.triangles.toLocaleString()} tris, ${info.calls} calls)`);
}

if (contact) {
  const cols = Math.min(3, files.length);
  const rows = Math.ceil(files.length / cols);
  const args = [];
  for (const { f } of files) args.push('-i', f);
  const labels = files
    .map(
      (x, i) =>
        `[${i}:v]scale=640:-1,drawtext=text='${x.t.toFixed(2)}s':x=10:y=10:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.6:boxborderw=6[v${i}]`
    )
    .join(';');
  const ins = files.map((_, i) => `[v${i}]`).join('');
  const filter = `${labels};${ins}xstack=inputs=${files.length}:layout=${layout(cols, rows, files.length)}[out]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args, '-filter_complex', filter, '-map', '[out]', contact]);
  console.log('contact sheet ->', contact);
}

function layout(cols, rows, count) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    parts.push(`${c === 0 ? '0' : Array.from({ length: c }, (_, k) => `w${k}`).join('+')}_${r === 0 ? '0' : Array.from({ length: r }, (_, k) => `h${k * cols}`).join('+')}`);
  }
  void rows;
  return parts.join('|');
}

if (film.errors.length) {
  console.log('\nPAGE ERRORS:');
  for (const e of [...new Set(film.errors)]) console.log('  ' + e);
}
await film.browser.close();
server?.close();
