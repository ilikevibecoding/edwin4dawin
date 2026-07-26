#!/usr/bin/env node
/** Capture every QA-gallery exhibit to artifacts/shots/gallery/ (Opus 4). */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const outDir = process.argv[2] ?? 'artifacts/shots/gallery';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto('http://127.0.0.1:5173/?test=1&mode=playing&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && !document.getElementById('boot-overlay'), null, { timeout: 45000 });
await page.evaluate(() => window.advanceTime(300));

const list = await page.evaluate(() => window.__qa.gallery.list());
console.log(`${list.length} exhibits`);
for (const id of list) {
  await page.evaluate((i) => window.__qa.gallery.show(i), id);
  await page.evaluate(() => window.advanceTime(120));
  await page.waitForTimeout(80);
  const file = `${outDir}/${id.replace(/[^a-z0-9.-]+/gi, '_')}.png`;
  await page.screenshot({ path: file });
  console.log('shot:', file);
}
if (errors.length) {
  console.log('ERRORS:', errors.slice(0, 10).join('\n'));
  process.exitCode = 2;
} else {
  console.log('no console errors');
}
await browser.close();
