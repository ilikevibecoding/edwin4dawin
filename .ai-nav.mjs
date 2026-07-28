#!/usr/bin/env node
/** Scratch: island health, spawn reachability, detour ratios, build cost. */
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
await page.waitForFunction('!!window.__AI__ && !!window.__GAME__', { timeout: 180000 });

const out = await page.evaluate(() => {
  const api = window.__AI__;
  const nav = window.__GAME__.engine.get('ai').nav;
  const spawns = window.__GAME__.engine.get('world').spawnPoints;
  const s = api.navStats();
  const sizes = nav.regionSize;
  const main = sizes.indexOf(Math.max(...sizes));
  let offGround = 0;
  let offHigh = 0;
  let shy = 0;
  for (let n = 0; n < nav.nodeCount; n++) {
    if (nav.nodeShy && nav.nodeShy[n]) shy++;
    if (nav.region[n] === main) continue;
    if (nav.nodeY[n] > 1.9) offHigh++;
    else offGround++;
  }
  const stray = spawns
    .map((p, i) => ({ i, r: nav.regionAt(p.position.x, p.position.y, p.position.z), p: [+p.position.x.toFixed(1), +p.position.y.toFixed(1), +p.position.z.toFixed(1)] }))
    .filter((p) => p.r !== main);

  const pairs = [];
  for (let i = 0; i < spawns.length; i++)
    for (let j = i + 1; j < spawns.length; j++) {
      const a = spawns[i].position;
      const b = spawns[j].position;
      const straight = Math.hypot(b.x - a.x, b.z - a.z);
      if (straight < 12) continue;
      const p = api.path(a.x, a.y, a.z, b.x, b.y, b.z);
      pairs.push({ straight, complete: !!p && p.complete, ratio: p ? p.length / straight : null, legs: p ? p.points.length : 0 });
    }
  const done = pairs.filter((p) => p.complete);
  const ratios = done.map((p) => p.ratio).sort((x, y) => x - y);

  // Cover points are only useful if an agent can reach them.
  const cover = window.__GAME__.engine.get('world').coverPoints;
  const coverOff = cover.filter((c) => nav.regionAt(c.position.x, c.position.y, c.position.z) !== main).length;

  return {
    cell: s.cell,
    nodes: s.nodes,
    buildMs: +s.buildMs.toFixed(0),
    rays: s.rays,
    regions: s.regions,
    mainShare: +s.mainRegionShare.toFixed(3),
    offGround,
    offHigh,
    shy,
    straySpawns: stray.length,
    stray,
    coverPoints: cover.length,
    coverOffIsland: coverOff,
    pairs: pairs.length,
    incomplete: pairs.length - done.length,
    ratioMedian: +ratios[Math.floor(ratios.length / 2)].toFixed(2),
    ratioP90: +ratios[Math.floor(ratios.length * 0.9)].toFixed(2),
    ratioWorst: +ratios[ratios.length - 1].toFixed(2),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
