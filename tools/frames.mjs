#!/usr/bin/env node
/**
 * Multi-frame capture used while directing the piece.
 *
 * Boots the application once, then walks a list of timestamps, optionally
 * running a few seconds of show time before each capture so transient effects
 * are present. Start-up costs about forty seconds, so batch the whole list.
 *
 *   node tools/frames.mjs --out=qa/output/look --t=6.5,44,112:1.2,220:2.4
 *   node tools/frames.mjs --t=246 --ui=off --probe="__show.state().shot"
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : fallback;
};

const url = value('url', 'http://127.0.0.1:5173/');
const outDir = join(root, value('out', 'qa/output/frames'));
const width = Number(value('width', 1600));
const height = Number(value('height', 900));
const showUi = value('ui', 'on') !== 'off';
const probe = value('probe', '');
const clean = value('clean', 'yes') === 'yes';
const stops = (value('t', '0') || '')
  .split(',')
  .filter(Boolean)
  .map((spec) => {
    const [t, pre] = spec.split(':');
    return { t: Number(t), pre: Number(pre ?? 0) };
  });

if (clean) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
  ],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.__show !== undefined, null, { timeout: 90000 });
await page.waitForFunction(() => !document.getElementById('btn-enter').disabled, null, { timeout: 240000 });
await page.click('#btn-enter');
await page.waitForTimeout(1200);
await page.evaluate(() => window.__show.pause());
if (!showUi) await page.keyboard.press('KeyU');

const settle = (n = 12) =>
  page.evaluate(
    (k) =>
      new Promise((resolve) => {
        let i = 0;
        const tick = () => (++i >= k ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    n,
  );

const results = [];
for (const { t, pre } of stops) {
  await page.evaluate(({ t: at, pre: p }) => {
    window.__show.seek(at - p);
    if (p > 0) window.__show.simulate(p);
  }, { t, pre });
  await settle();
  const state = await page.evaluate(() => window.__show.state());
  const extra = probe ? await page.evaluate(`(() => (${probe}))()`) : null;
  const name = `t${String(t).replace('.', '_')}.png`;
  await page.screenshot({ path: join(outDir, name) });
  results.push({ t, pre, shot: state.shot, chapter: state.chapter, region: state.region, bolts: state.bolts, probe: extra });
  console.log(
    `${name.padEnd(14)} ${String(state.chapter).padEnd(10)} ${String(state.shot).padEnd(20)} bolts=${state.bolts}` +
      (extra !== null && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''),
  );
}

writeFileSync(join(outDir, 'frames.json'), JSON.stringify({ url, stops: results, problems }, null, 2));
if (problems.length) console.log(`\nconsole:\n${problems.slice(0, 20).join('\n')}`);
console.log(`\nartifacts ${outDir}`);
await browser.close();
