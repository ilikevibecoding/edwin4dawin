#!/usr/bin/env node
/**
 * Screenshot a kit model from several angles into a contact sheet.
 *
 *   node tools/preview.mjs --model xwing --out /tmp/xwing.png
 *   node tools/preview.mjs --list
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { CHROME, CHROME_ARGS } from './browser.mjs';

const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};
const model = arg('model');
const out = arg('out', `/tmp/preview_${model || 'list'}.png`);
const base = arg('base', 'http://localhost:5173');
const W = parseInt(arg('w', '900'), 10);
const H = parseInt(arg('h', '640'), 10);
const angles = (arg('angles', '30,110,200,-60') || '').split(',').map(Number);
const elev = parseFloat(arg('elev', '20'));
const poseT = arg('t', null);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [...CHROME_ARGS, `--window-size=${W},${H}`],
  protocolTimeout: 300000,
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text()));

const url = `${base}/preview.html?static=1&w=${W}&h=${H}${model ? `&model=${encodeURIComponent(model)}` : ''}`;
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.PREVIEW_READY === true', { timeout: 180000, polling: 200 });

const names = await page.evaluate('window.PREVIEW.names');
if (argv.includes('--list') || !model) {
  console.log('available models:\n  ' + names.join('\n  '));
  await browser.close();
  process.exit(0);
}
if (!names.includes(model)) {
  console.error(`unknown model "${model}". available:\n  ` + names.join('\n  '));
  await browser.close();
  process.exit(1);
}

const stats = await page.evaluate("document.getElementById('stats').textContent");
console.log(model, '·', stats);

if (poseT !== null) await page.evaluate((t) => window.PREVIEW.poseTime(parseFloat(t)), poseT);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-'));
const files = [];
for (let i = 0; i < angles.length; i++) {
  const data = await page.evaluate((a, e) => window.PREVIEW.draw(a, e, 1), angles[i], elev);
  const f = path.join(tmp, `a${i}.jpg`);
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
  files.push(f);
}
await browser.close();

const cols = Math.min(2, files.length);
const rows = Math.ceil(files.length / cols);
const inputs = [];
for (const f of files) inputs.push('-i', f);
const chains = files
  .map(
    (_, i) =>
      `[${i}:v]drawtext=text='${angles[i]}°':x=12:y=12:fontsize=24:fontcolor=yellow:box=1:boxcolor=black@0.55:boxborderw=6[v${i}]`
  )
  .join(';');
const layoutParts = [];
for (let i = 0; i < files.length; i++) {
  const c = i % cols;
  const r = Math.floor(i / cols);
  layoutParts.push(`${c === 0 ? '0' : 'w0'}_${r === 0 ? '0' : Array.from({ length: r }, (_, k) => `h${k * cols}`).join('+')}`);
}
void rows;
const filter = `${chains};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layoutParts.join('|')}[o]`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[o]', out]);
console.log('->', out);
