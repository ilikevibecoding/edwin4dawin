#!/usr/bin/env node
/**
 * Contact sheet: sample the whole film at regular intervals and montage the
 * stills into one grid image.
 *
 * This is the fastest way to audit a 4-minute animation without watching it —
 * bad framing, black frames, models poking through walls and broken shots all
 * jump straight out of the grid.
 *
 *   node tools/contact-sheet.mjs --every 4 --out /tmp/sheet.png
 *   node tools/contact-sheet.mjs --scene trench --n 12 --out /tmp/trench.png
 */
import puppeteer from 'puppeteer';
import { execFileSync } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };

const URLBASE = flag('url', 'http://127.0.0.1:5175/index.html');
const OUT = flag('out', '/tmp/contact-sheet.png');
const W = parseInt(flag('w', '480'), 10);
const H = parseInt(flag('h', '270'), 10);
const COLS = parseInt(flag('cols', '5'), 10);
const TMP = flag('tmp', '/tmp/contact-tiles');

const { SCENES, timeline } = await import('../src/story.js');
const tl = timeline();

let times = [];
if (flag('scene', null)) {
  const s = tl.scenes.find((x) => x.id === flag('scene'));
  if (!s) { console.error('no such scene'); process.exit(1); }
  const n = parseInt(flag('n', '10'), 10);
  for (let i = 0; i < n; i++) times.push(s.start + 0.4 + (s.dur - 1.2) * (i / (n - 1)));
} else if (flag('times', null)) {
  times = flag('times').split(',').map(Number);
} else {
  const every = parseFloat(flag('every', '5'));
  for (let t = 0.6; t < tl.duration; t += every) times.push(t);
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
    '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });

await page.goto(`${URLBASE}?render=1&fps=1000&w=${W}&h=${H}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 300000 });
const boot = await page.evaluate(() => window.__bootError || null);
if (boot) console.error('BOOT ERROR: ' + boot);

const labels = [];
for (let i = 0; i < times.length; i++) {
  const t = times[i];
  await page.evaluate((tt) => window.__seek(Math.round(tt * 1000)), t);
  const p = join(TMP, String(i).padStart(3, '0') + '.png');
  await page.screenshot({ path: p });
  const sc = tl.scenes.find((s) => t >= s.start && t < s.end);
  labels.push(`${(t).toFixed(1)}s ${sc ? sc.id : ''}`);
  process.stdout.write(`\r  ${i + 1}/${times.length} tiles `);
}
await browser.close();

// burn a timecode into each tile, then tile them into a grid
for (let i = 0; i < times.length; i++) {
  const p = join(TMP, String(i).padStart(3, '0') + '.png');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', p, '-vf',
    `drawtext=text='${labels[i]}':x=6:y=6:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=4`,
    join(TMP, 'l' + String(i).padStart(3, '0') + '.png')]);
}
const rows = Math.ceil(times.length / COLS);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', join(TMP, 'l*.png'),
  '-filter_complex', `tile=${COLS}x${rows}:margin=6:padding=4:color=#101418`, '-frames:v', '1', OUT]);

console.log(`\nwrote ${OUT}  (${times.length} stills, ${COLS}x${rows})`);
if (errs.length) console.log('page errors:\n  ' + [...new Set(errs)].slice(0, 10).join('\n  '));
