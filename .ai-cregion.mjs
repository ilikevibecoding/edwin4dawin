#!/usr/bin/env node
/** Scratch: is the street-to-sunken-strip boundary a wall, or a missing link? */
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
  const g = window.__GAME__;
  const api = window.__AI__;
  const THREE = g.THREE;
  const ai = g.engine.get('ai');
  const nav = ai.nav;
  const field = ai.coverField;
  const physics = g.engine.get('physics');
  const anchor = api.anchor();
  const CELL = 0.85;

  // Every region boundary crossing on a 30 m ring of the anchor, with what the
  // link rays actually hit at the crossing.
  const mainRegion = nav.regionAt(anchor[0], anchor[1], anchor[2]);
  const walls = [];
  const holes = [];
  const dir = new THREE.Vector3();
  const from = new THREE.Vector3();

  const probe = (ax, ay, az, bx, by, bz) => {
    // Mirror NavGrid.linkClear: shin and chest height above the higher floor.
    const base = Math.max(ay, by);
    const flat = Math.hypot(bx - ax, bz - az);
    dir.set((bx - ax) / flat, 0, (bz - az) / flat);
    const hits = [];
    for (const h of [0.58, 1.36]) {
      from.set(ax, base + h, az);
      const hit = physics.raycast(from, dir, flat, 0xffffffff);
      hits.push(hit ? { h, d: +hit.distance.toFixed(2), what: hit.object?.name || hit.object?.type || '?' } : null);
    }
    return hits;
  };

  // Walk the eight orthogonal/diagonal neighbours of every main-region cell in a
  // 12 m box, and find where a neighbouring column holds a node in another
  // region at a height a man could step to.
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let crossings = 0;
  for (let dx = -14; dx <= 14; dx++) {
    for (let dz = -14; dz <= 14; dz++) {
      const x = anchor[0] + dx * CELL;
      const z = anchor[2] + dz * CELL;
      const here = nav.inspect(x, z);
      for (const a of here) {
        if (a.region !== mainRegion) continue;
        for (const [ox, oz] of N) {
          const nx = x + ox * CELL;
          const nz = z + oz * CELL;
          for (const b of nav.inspect(nx, nz)) {
            if (b.region === mainRegion) continue;
            if (Math.abs(b.y - a.y) > 0.4) continue;
            crossings++;
            const hits = probe(x, a.y, z, nx, b.y, nz);
            const blocked = hits.some((h) => h !== null);
            const rec = {
              at: [+x.toFixed(1), +a.y.toFixed(2), +z.toFixed(1)],
              to: [+nx.toFixed(1), +b.y.toFixed(2), +nz.toFixed(1)],
              region: b.region, size: b.regionSize, dy: +(b.y - a.y).toFixed(2),
              hits: hits.filter(Boolean),
            };
            if (blocked) walls.push(rec);
            else holes.push(rec);
          }
        }
      }
    }
  }
  return { mainRegion, crossings, walls: walls.slice(0, 10), holes: holes.slice(0, 14), nWalls: walls.length, nHoles: holes.length };
});
console.log(`main region ${out.mainRegion}; ${out.crossings} step-height crossings into other regions within 12 m`);
console.log(`  ${out.nWalls} blocked by geometry (graph is right), ${out.nHoles} clear (graph is wrong)`);
console.log('-- blocked samples --');
for (const w of out.walls) console.log('  ', JSON.stringify(w));
console.log('-- clear samples --');
for (const h of out.holes) console.log('  ', JSON.stringify(h));
await browser.close();
