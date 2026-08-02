#!/usr/bin/env node
/**
 * Offline soundtrack render.
 *
 * The score, the sound effects and the narration are all scheduled through the
 * same code the live player uses, but into an OfflineAudioContext, so the whole
 * 4-minute mix renders in one deterministic pass and comes back as a WAV.
 *
 *   node tools/render-audio.mjs --out render/soundtrack.wav
 */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const URLBASE = flag('url', 'http://127.0.0.1:5175/index.html');
const OUT = flag('out', 'render/soundtrack.wav');
const SR = parseInt(flag('sr', '48000'), 10);

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
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
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

await page.goto(`${URLBASE}?render=1&w=320&h=180`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 300000 });

console.log('rendering soundtrack offline...');
const t0 = Date.now();
const len = await page.evaluate((sr) => window.__renderSoundtrack(sr), SR);
console.log(`  ${(len / 1e6).toFixed(1)} MB of WAV in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const CHUNK = 4 * 1024 * 1024;
const parts = [];
for (let off = 0; off < len; off += CHUNK) {
  const b64 = await page.evaluate((o, c) => window.__wavChunk(o, c), off, CHUNK);
  parts.push(Buffer.from(b64, 'base64'));
  process.stdout.write(`\r  transferred ${((off + CHUNK) / 1e6).toFixed(0)}/${(len / 1e6).toFixed(0)} MB `);
}
const buf = Buffer.concat(parts);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, buf);
console.log(`\nwrote ${OUT} (${(buf.length / 1e6).toFixed(1)} MB)`);
if (errs.length) console.log('page errors:\n  ' + [...new Set(errs)].slice(0, 10).join('\n  '));
await browser.close();
