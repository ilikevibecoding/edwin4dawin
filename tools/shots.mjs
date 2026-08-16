#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const iter = arg('iter', '0');
const baseUrl = arg('url', 'http://127.0.0.1:5173/');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1&quality=fast';
const width = Number(arg('width', '1280'));
const height = Number(arg('height', '720'));
const settleMs = Number(arg('settle', '2000'));
const outDir = arg('out', path.join('shots', `iter_${iter}`));
const only = arg('views', '');

const launchArgs = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--js-flags=--max-old-space-size=4096',
];

const log = (...a) => console.log('[shots]', ...a);

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: launchArgs,
    executablePath: process.env.CHROME_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      consoleErrors.push(`${m.type()}: ${m.text()}`);
      log(`page ${m.type()}:`, m.text());
    }
  });
  page.on('pageerror', (e) => {
    consoleErrors.push(`pageerror: ${e.message}`);
    log('page error:', e.message);
  });

  log(`loading ${url} at ${width}x${height}`);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) {
    console.error('[shots] app failed to boot:\n' + err);
    await browser.close();
    process.exit(1);
  }
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const views = only ? only.split(',') : await page.evaluate(() => window.debugAPI.listViews());
  log('views:', views.join(', '));

  await page.evaluate(() => {
    window.debugAPI.setView('hero');
    window.debugAPI.renderFrames(1);
  });

  await page.evaluate(() => window.debugAPI.resume());
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: path.join(outDir, 'hud.png'), timeout: 0 }).catch(() => {});
  await page.evaluate(() => window.debugAPI.pause());

  const stats = {};
  for (const view of views) {
    const ts = Date.now();
    const ok = await page.evaluate((v) => window.debugAPI.setView(v), view);
    if (!ok) {
      log(`unknown view "${view}", skipping`);
      continue;
    }
    const { dataUrl, luma } = await page.evaluate(() => {
      const dataUrl = window.debugAPI.captureFrame(2);
      return { dataUrl, luma: window.debugAPI.sampleLuma() };
    });
    const file = path.join(outDir, `${view}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    if (luma.mean < 0.012 && luma.max < 0.08) {
      log(`WARNING: ${view} rendered essentially black (mean ${luma.mean.toFixed(4)})`);
    }
    stats[view] = { ...(await page.evaluate(() => window.debugAPI.stats())), luma };
    log(
      `${view} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, luma ${luma.mean.toFixed(3)}/${luma.max.toFixed(3)})`,
    );
  }

  try {
    await page.evaluate(async () => {
      window.debugAPI.resume();
      await window.debugAPI.fire('door');
    });
    await page.waitForTimeout(650);
    await page.evaluate(() => {
      window.debugAPI.keys.add('KeyW');
      window.debugAPI.step(2.4);
      window.debugAPI.keys.delete('KeyW');
    });
    const ts = Date.now();
    const { dataUrl, luma } = await page.evaluate(() => {
      const dataUrl = window.debugAPI.captureFrame(2);
      return { dataUrl, luma: window.debugAPI.sampleLuma() };
    });
    const file = path.join(outDir, 'driving.png');
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    stats.driving = { ...(await page.evaluate(() => window.debugAPI.stats())), luma };
    log(`driving -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, luma ${luma.mean.toFixed(3)}/${luma.max.toFixed(3)})`);
    await page.evaluate(() => window.debugAPI.pause());
  } catch (e) {
    log('driving shot skipped:', e.message);
  }

  await writeFile(
    path.join(outDir, 'stats.json'),
    JSON.stringify({ iter, width, height, views: stats, consoleErrors }, null, 2),
  );

  await browser.close();
  log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
