#!/usr/bin/env node
/**
 * Offline soundtrack render.
 *
 * The score, the sound effects and the narration are all scheduled through the
 * same code the live player uses, but into an OfflineAudioContext, so the mix
 * you hear in the browser is the mix that lands in the film.
 *
 * By default the render is cut into slices on scene boundaries — where the
 * score starts a fresh section anyway — each with a decay tail, then mixed back
 * onto one timeline with ffmpeg. Slicing keeps every individual render short,
 * which is both far faster to iterate on and avoids the very long single-pass
 * renders where Chrome's offline audio thread gives up partway through.
 *
 *   node tools/render-audio.mjs --out render/soundtrack.wav
 *   node tools/render-audio.mjs --single          # one 4-minute pass instead
 */
import puppeteer from 'puppeteer';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes('--' + n);

const URLBASE = flag('url', 'http://127.0.0.1:5175/index.html');
const OUT = flag('out', 'render/soundtrack.wav');
const SR = parseInt(flag('sr', '48000'), 10);
const TAIL = parseFloat(flag('tail', '3.5'));
const TMP = flag('tmp', '/tmp/soundtrack-chunks');

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 2400000,
  args: [
    '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });

await page.goto(`${URLBASE}?render=1&w=320&h=180`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 300000 });

/** Pull the rendered WAV out of the page in chunks of base64. */
async function fetchWav(len) {
  const CHUNK = 4 * 1024 * 1024;
  const parts = [];
  for (let off = 0; off < len; off += CHUNK) {
    const b64 = await page.evaluate((o, c) => window.__wavChunk(o, c), off, CHUNK);
    parts.push(Buffer.from(b64, 'base64'));
  }
  return Buffer.concat(parts);
}

mkdirSync(dirname(OUT), { recursive: true });

if (has('single')) {
  console.log('rendering the whole soundtrack in one pass...');
  const t0 = Date.now();
  const len = await page.evaluate((sr) => window.__renderSoundtrack(sr), SR);
  console.log(`  ${(len / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  writeFileSync(OUT, await fetchWav(len));
} else {
  const scenes = await page.evaluate(() => window.__scenes);
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  const files = [];
  for (const s of scenes) {
    const t0 = Date.now();
    const len = await page.evaluate((f, d, tl, sr) => window.__renderChunk(f, d, tl, sr), s.start, s.dur, TAIL, SR);
    const buf = await fetchWav(len);
    const f = join(TMP, `${String(s.start).padStart(6, '0')}_${s.id}.wav`);
    writeFileSync(f, buf);
    files.push({ file: f, start: s.start });
    console.log(`  ${s.id.padEnd(10)} ${s.start.toFixed(0).padStart(4)}s +${s.dur.toFixed(0)}s  ${(buf.length / 1e6).toFixed(1)} MB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // lay every slice back down at its own start time and sum them
  const args = ['-y', '-loglevel', 'error'];
  for (const f of files) args.push('-i', f.file);
  const filters = files
    .map((f, i) => `[${i}:a]adelay=${Math.round(f.start * 1000)}|${Math.round(f.start * 1000)}[a${i}]`)
    .join(';');
  const mix = files.map((_, i) => `[a${i}]`).join('');
  args.push('-filter_complex', `${filters};${mix}amix=inputs=${files.length}:normalize=0:dropout_transition=0[out]`,
    '-map', '[out]', '-ac', '2', '-ar', String(SR), OUT);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]).toString().trim();
console.log(`\nwrote ${OUT}  (${(+dur).toFixed(1)}s)`);
if (errs.length) console.log('page errors:\n  ' + [...new Set(errs)].slice(0, 10).join('\n  '));
await browser.close();
