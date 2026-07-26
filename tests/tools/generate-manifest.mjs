#!/usr/bin/env node
/**
 * Asset manifest generator.
 * Owner: Opus 1.
 *
 * Boots the game far enough to register every asset, then writes
 * docs/asset-manifest.md from the live registry. The manifest is therefore
 * always a report of what the code actually registers, never a hand-maintained
 * list that can drift.
 *
 *   node tests/tools/generate-manifest.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const browser = await chromium.launch({
  args: [
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--no-sandbox', '--mute-audio', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=3072',
  ],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto('http://127.0.0.1:5173/?quality=low', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 90000 });
await page.waitForFunction(() => window.__northstar?.ready?.() === true, null, { timeout: 300000 });

const md = await page.evaluate(() => window.__northstar.assets.toMarkdown());
const stats = await page.evaluate(() => window.__northstar.assets.stats());
const all = await page.evaluate(() => window.__northstar.assets.all().map((a) => ({
  id: a.id, name: a.name, category: a.category, owner: a.owner, status: a.status,
})));

const header = [
  '<!--',
  '  GENERATED FILE — do not edit by hand.',
  '  Produced by: node tests/tools/generate-manifest.mjs',
  '  Source of truth: the reg() calls in each owning module.',
  '-->',
  '',
].join('\n');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/asset-manifest.md', header + md);
fs.mkdirSync('test-results/reports', { recursive: true });
fs.writeFileSync('test-results/reports/manifest-index.json', JSON.stringify({ stats, all }, null, 2));

const byCat = {};
for (const a of all) byCat[a.category] = (byCat[a.category] ?? 0) + 1;
console.log('registered assets:', stats.total, '| accepted:', stats.accepted, '| warnings:', stats.warnings);
console.log('by category:', JSON.stringify(byCat, null, 2));
console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
if (stats.warnings > 0) process.exitCode = 1;
