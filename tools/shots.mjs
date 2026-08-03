// Model audit tool: renders a model from several angles and stitches the frames
// into one contact sheet, so a whole ship can be reviewed in a single image.
//
//   node tools/shots.mjs --model=xwing --angles=0,45,90,180 --elev=15
//
// Also drives the film itself:
//   node tools/shots.mjs --film --times=0,12,30 --w=1280 --h=720

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : 'true'];
}));

const W = +(args.w || 900);
const H = +(args.h || 600);
const OUT = args.out || 'build/shots';
const PORT = args.port || 8080;
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--mute-audio', '--enable-unsafe-swiftshader',
    '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu',
    '--disable-frame-rate-limit',
  ],
  defaultViewport: { width: W, height: H },
  protocolTimeout: 600000,
});

const page = await browser.newPage();
const logs = [];
page.on('console', (m) => { const t = m.text(); if (!t.includes('favicon')) logs.push(`[${m.type()}] ${t}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));

const files = [];

if (args.film) {
  const times = (args.times || '0').split(',').map(Number);
  const url = `http://localhost:${PORT}/index.html?capture=1&w=${W}&h=${H}${args.quality ? `&quality=${args.quality}` : ''}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__STORY__ && window.__STORY__.ready === true', { timeout: 180000 });
  for (const t of times) {
    await page.evaluate((tt) => window.__STORY__.renderAt(tt), t);
    const name = path.join(OUT, `film_${String(t).padStart(6, '0')}.png`);
    await page.screenshot({ path: name });
    files.push(name);
    process.stdout.write(`t=${t}s `);
  }
  process.stdout.write('\n');
  const label = await page.evaluate(() => window.__STORY__.info());
  console.log(JSON.stringify(label));
} else {
  const model = args.model || 'xwing';
  const angles = (args.angles || '30,120,210,300').split(',').map(Number);
  const elev = (args.elev || '16').split(',').map(Number);
  const url = `http://localhost:${PORT}/viewer.html?model=${model}&w=${W}&h=${H}&static=1&grid=${args.grid || '1'}&dist=${args.dist || 1}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__ready === true', { timeout: 180000 });
  let i = 0;
  for (const a of angles) {
    for (const e of elev) {
      await page.evaluate((aa, ee, tt) => window.__frame(aa, ee, tt), a, e, +(args.t || 0));
      const name = path.join(OUT, `${model}_${String(i++).padStart(2, '0')}.png`);
      await page.screenshot({ path: name });
      files.push(name);
    }
  }
  console.log(JSON.stringify(await page.evaluate(() => window.__info())));
}

if (logs.length) console.log('--- page logs ---\n' + logs.slice(0, 40).join('\n'));
await browser.close();

// Contact sheet: rows of hstack, then one vstack. (xstack layout strings are
// fiddly; this is easier to get right and works for a ragged last row.)
if (files.length > 1 && args.sheet !== '0') {
  const cols = Math.min(files.length, +(args.cols || 2));
  const rows = [];
  for (let i = 0; i < files.length; i += cols) rows.push(files.slice(i, i + cols));
  const sheet = path.join(OUT, `${args.film ? 'film' : args.model}_sheet.png`);
  const filters = [];
  let idx = 0;
  const rowLabels = [];
  for (let r = 0; r < rows.length; r++) {
    const inputs = rows[r].map(() => `[${idx++}:v]`).join('');
    if (rows[r].length === 1) {
      rowLabels.push(inputs.trim());
    } else {
      filters.push(`${inputs}hstack=inputs=${rows[r].length}[r${r}]`);
      rowLabels.push(`[r${r}]`);
    }
  }
  // Pad a ragged final row so vstack sees equal widths.
  if (rows.length > 1 && rows[rows.length - 1].length !== cols) {
    const last = rows.length - 1;
    const w = rows[0].length;
    filters.push(`${rowLabels[last]}pad=iw*${(w / rows[last].length).toFixed(6)}:ih:0:0:black[rp${last}]`);
    rowLabels[last] = `[rp${last}]`;
  }
  if (rowLabels.length > 1) filters.push(`${rowLabels.join('')}vstack=inputs=${rowLabels.length}[v]`);
  const outLabel = rowLabels.length > 1 ? '[v]' : rowLabels[0];
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    ...files.flatMap((f) => ['-i', f]),
    '-filter_complex', filters.join(';'),
    '-map', outLabel, sheet,
  ]);
  console.log(`sheet: ${sheet} (${cols}x${rows.length})`);
}
