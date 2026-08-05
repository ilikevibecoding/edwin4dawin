#!/usr/bin/env node
/**
 * Look sweep. Loads the game once, then applies a list of eval snippets and
 * captures one PNG per variant. Page loads dominate capture cost on software
 * WebGL, so testing several lighting ideas in a single session is far cheaper
 * than one screenshot run per idea.
 *
 *   node scripts/sweep.mjs --url "...?chapter=ch1&roam=1" --variants variants.json
 *
 * variants.json: [{ "name": "b_bright", "eval": "…js…", "steps": 6 }]
 */
import puppeteer from 'puppeteer-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};

const URL_ = arg('url', 'http://127.0.0.1:5173/?chapter=ch1&roam=1&q=medium&rf=3&film=1');
const W = Number(arg('w', 1280));
const H = Number(arg('h', 720));
const OUTDIR = resolve(arg('outdir', 'shots/sweep'));
const VARIANTS = JSON.parse(await readFile(arg('variants', 'shots/variants.json'), 'utf8'));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--disable-frame-rate-limit',
    `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--font-render-hinting=none',
  ],
  protocolTimeout: 600000,
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
page.on('console', (m) => {
  if (/error/i.test(m.text())) console.log('[console]', m.text().slice(0, 240));
});

console.log(`→ ${URL_}`);
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction('window.__film !== undefined || window.__engineReady === true', { timeout: 600000 });
await mkdir(OUTDIR, { recursive: true });

const step = async (n) => {
  for (let i = 0; i < n; i++) {
    const stepped = await page.evaluate(() => {
      if (window.__film) {
        window.__film.step(1 / 20);
        return true;
      }
      return false;
    });
    if (!stepped) await new Promise((r) => setTimeout(r, 120));
  }
};

await step(4);
for (const v of VARIANTS) {
  if (v.eval) {
    try {
      await page.evaluate(v.eval);
    } catch (e) {
      console.log(`  [eval ${v.name}] ${String(e).slice(0, 300)}`);
    }
  }
  await step(v.steps ?? 6);
  const buf = await page.screenshot({ type: 'png' });
  await writeFile(`${OUTDIR}/${v.name}.png`, buf);
  console.log(`  saved ${OUTDIR}/${v.name}.png`);
}
await browser.close();
