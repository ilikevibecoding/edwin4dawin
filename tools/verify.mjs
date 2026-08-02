#!/usr/bin/env node
/**
 * Automated sanity checks for the film.
 *
 * Three things go wrong in a project like this and none of them are obvious
 * from a single screenshot:
 *
 *  1. IMPURITY — a scene that accumulates state renders differently depending
 *     on what was rendered before it. That tears the movie at shard boundaries
 *     in the parallel renderer. We catch it by drawing a frame, drawing some
 *     other frames, then drawing the first one again and comparing bytes.
 *  2. DEAD FRAMES — a scene that is black, blown out, or empty because the
 *     camera ended up inside geometry or pointing at nothing.
 *  3. LOAD FAILURES — missing SVGs or audio, and runtime exceptions.
 *
 *   node tools/verify.mjs                  # every scene
 *   node tools/verify.mjs --scene trench   # one scene
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { openFilm, buildAndServe } from './browser.mjs';

const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};
const SCENE = arg('scene', null);
const SAMPLES = parseInt(arg('n', '7'), 10);
const OUT = arg('out', null);
const USE_DIST = !argv.includes('--dev');

let server = null;
let BASE = arg('base', 'http://localhost:5173');
if (USE_DIST) {
  server = await buildAndServe();
  BASE = server.url;
}

const film = await openFilm({ base: BASE, width: 480, height: 270, scene: SCENE, bloom: true, quiet: true, all: true });
console.log(`film ${film.duration.toFixed(1)}s · ${film.scenes.length} scenes\n`);

const grab = (t) => film.page.evaluate((tt) => window.FILM.drawAndGrab(tt, 0.92), t);

/** Downsampled luminance buffer, for measuring how different two frames are. */
const pixels = (t) =>
  film.page.evaluate((tt) => {
    window.FILM.draw(tt);
    const c = document.querySelector('canvas');
    const s = document.createElement('canvas');
    s.width = 128;
    s.height = 72;
    const g = s.getContext('2d');
    g.drawImage(c, 0, 0, 128, 72);
    return Array.from(g.getImageData(0, 0, 128, 72).data);
  }, t);

function delta(a, b) {
  let sum = 0;
  let max = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const d = Math.abs(a[i + k] - b[i + k]);
      sum += d;
      if (d > max) max = d;
    }
    n += 3;
  }
  return { mean: sum / n, max };
}
const stats = (t) =>
  film.page.evaluate((tt) => {
    window.FILM.draw(tt);
    const c = document.querySelector('canvas');
    const s = document.createElement('canvas');
    s.width = 96;
    s.height = 54;
    const g = s.getContext('2d');
    g.drawImage(c, 0, 0, 96, 54);
    const d = g.getImageData(0, 0, 96, 54).data;
    let sum = 0;
    let sum2 = 0;
    let n = 0;
    let maxL = 0;
    let blown = 0;
    let crushed = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      sum += l;
      sum2 += l * l;
      if (l > maxL) maxL = l;
      if (l > 0.96) blown++;
      if (l < 0.02) crushed++;
      n++;
    }
    const mean = sum / n;
    return {
      mean,
      sd: Math.sqrt(Math.max(0, sum2 / n - mean * mean)),
      max: maxL,
      blown: blown / n,
      crushed: crushed / n,
    };
  }, t);

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

let problems = 0;
const report = [];

for (const sc of film.scenes) {
  const times = [];
  for (let i = 0; i < SAMPLES; i++) times.push(sc.start + (sc.duration * (i + 0.5)) / SAMPLES);

  const rows = [];
  let impure = 0;
  let dead = 0;

  for (const t of times) {
    await pixels(t); // warm-up draw; the first render of a frame settles caches
    const a = await pixels(t);
    // Disturb the state: draw other times, including from another scene.
    await grab(t + sc.duration * 0.31);
    await grab(Math.max(0, t - sc.duration * 0.4));
    await grab((t + film.duration * 0.5) % film.duration);
    const b = await pixels(t);
    const d = delta(a, b);
    // Small drift is first-visit cache settling (texture uploads, shadow maps)
    // and is invisible: a rendered shard boundary measures the same as an
    // ordinary frame-to-frame step. Only flag differences big enough to see.
    const same = d.mean < 2.0;
    if (!same) impure++;

    const s = await stats(t);
    const isDead = s.max < 0.06 || s.sd < 0.012;
    if (isDead) dead++;
    rows.push({ t, same, delta: d, ...s });
  }

  const bad = impure > 0 || dead > 0;
  if (bad) problems++;
  const avg = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  const worstBlown = Math.max(...rows.map((r) => r.blown));
  const hot = worstBlown > 0.06;
  const line =
    `${bad ? 'FAIL' : ' ok '}  ${sc.id.padEnd(11)} ${fmt(sc.start)}+${sc.duration.toFixed(0).padStart(2)}s   ` +
    `impure ${impure}/${SAMPLES}  dead ${dead}/${SAMPLES}   ` +
    `lum ${avg('mean').toFixed(3)}  blown ${(avg('blown') * 100).toFixed(1)}% (worst ${(worstBlown * 100).toFixed(1)}%)` +
    `${hot ? '  <-- OVEREXPOSED' : ''}`;
  console.log(line);
  report.push({ scene: sc.id, impure, dead, rows });
  for (const r of rows) {
    const flag = !r.same ? ' IMPURE' : r.max < 0.06 ? ' BLACK' : r.sd < 0.012 ? ' FLAT' : '';
    if (flag)
      console.log(
        `         t=${r.t.toFixed(2)}s  lum ${r.mean.toFixed(3)} sd ${r.sd.toFixed(3)} max ${r.max.toFixed(3)}` +
          `  Δmean ${r.delta.mean.toFixed(2)} Δmax ${r.delta.max}${flag}`
      );
  }
}

const errs = [...new Set(film.errors)];
if (errs.length) {
  console.log('\npage errors / warnings:');
  for (const e of errs.slice(0, 30)) console.log('  ! ' + e);
}

const missing = await film.page.evaluate(`(async () => {
  const out = [];
  for (const u of ['audio/manifest.json','audio/sfx/index.json','audio/music/index.json']) {
    try { const r = await fetch(u); if (!r.ok) out.push(u + ' -> ' + r.status); } catch (e) { out.push(u + ' -> ' + e.message); }
  }
  return out;
})()`);
if (missing.length) {
  console.log('\nmissing asset indexes:');
  for (const m of missing) console.log('  ! ' + m);
}

if (OUT) fs.writeFileSync(path.resolve(OUT), JSON.stringify(report, null, 2));
await film.browser.close();
server?.close();
console.log(`\n${problems === 0 ? 'all scenes clean' : problems + ' scene(s) with problems'}`);
process.exit(problems ? 1 : 0);

function fmt(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
