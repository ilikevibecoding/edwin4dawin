#!/usr/bin/env node
/** Scratch: why does a pair on the same island fail to route? */
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
page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 600)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const api = window.__AI__;
  const nav = window.__GAME__.engine.get('ai').nav;
  const spawns = window.__GAME__.engine.get('world').spawnPoints;
  const sizes = nav.regionSize;
  const main = sizes.indexOf(Math.max(...sizes));
  const THREE = window.__GAME__.THREE;

  const fails = [];
  for (let i = 0; i < spawns.length && fails.length < 4; i++) {
    for (let j = i + 1; j < spawns.length && fails.length < 4; j++) {
      const a = spawns[i].position;
      const b = spawns[j].position;
      if (Math.hypot(b.x - a.x, b.z - a.z) < 12) continue;
      if (nav.regionAt(a.x, a.y, a.z) !== main) continue;
      if (nav.regionAt(b.x, b.y, b.z) !== main) continue;
      const p = api.path(a.x, a.y, a.z, b.x, b.y, b.z);
      if (p && p.complete) continue;
      // Diagnose: which nodes did request() pick, and are they on the main island?
      const sn = nav.nearestNode(a.x, a.y, a.z);
      const gn = nav.nearestNode(b.x, b.y, b.z);
      const heapCap = nav.heap ? nav.heap.length : null;
      fails.push({
        from: [+a.x.toFixed(1), +a.y.toFixed(2), +a.z.toFixed(1)],
        to: [+b.x.toFixed(1), +b.y.toFixed(2), +b.z.toFixed(1)],
        straight: +Math.hypot(b.x - a.x, b.z - a.z).toFixed(1),
        pathNull: !p,
        complete: p ? p.complete : null,
        length: p ? +p.length.toFixed(1) : null,
        startNode: sn,
        goalNode: gn,
        startRegion: sn >= 0 ? nav.region[sn] : null,
        goalRegion: gn >= 0 ? nav.region[gn] : null,
        regionAtA: nav.regionAt(a.x, a.y, a.z),
        regionAtB: nav.regionAt(b.x, b.y, b.z),
        startRegionSize: sn >= 0 ? sizes[nav.region[sn]] : null,
        goalRegionSize: gn >= 0 ? sizes[nav.region[gn]] : null,
        heapCap,
        nodeCount: nav.nodeCount,
        expanded: nav.stats.nodesExpanded,
      });
    }
  }
  return { main, mainSize: sizes[main], nodeCount: nav.nodeCount, heapCap: nav.heap ? nav.heap.length : null, fails };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
