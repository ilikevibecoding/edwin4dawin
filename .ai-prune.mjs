#!/usr/bin/env node
/** Scratch: how much of the graph does the symmetry pruning throw away? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5199/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const nav = window.__GAME__.engine.get('ai').nav;
  const s = window.__AI__.navStats();
  // What would the regions look like if the pruned edges were kept? Flood fill
  // treating a link as two-way whether or not the partner exists.
  const seen = new Int32Array(nav.nodeCount).fill(-1);
  // Build the reverse adjacency the pruning removed: every n -> m still present
  // is symmetric, so instead re-derive candidates by column adjacency is too
  // expensive here. Measure the pruning count and the size distribution only.
  const sizes = nav.regionSize.slice().sort((a, b) => b - a);
  const buckets = { '1': 0, '2-11': 0, '12-99': 0, '100+': 0 };
  for (const z of nav.regionSize) {
    if (z === 1) buckets['1']++;
    else if (z < 12) buckets['2-11']++;
    else if (z < 100) buckets['12-99']++;
    else buckets['100+']++;
  }
  void seen;
  return { rays: s.rays, links: s.links, pruned: s.pruned, regions: s.regions, main: s.mainRegion, share: s.mainRegionShare, buckets, top: sizes.slice(0, 8) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
