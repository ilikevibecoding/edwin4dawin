#!/usr/bin/env node
/** Scratch: is there cover near the firefight, and does the region filter keep it? */
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

  // Same setup as the cover test in tools/ai-test.mjs.
  api.clear();
  const anchor = api.anchor();
  const ids = [];
  for (let i = 0; i < 6; i++) {
    ids.push(api.spawn(anchor[0] - 2 + (i % 3) * 1.6, anchor[1], anchor[2] - 2 + Math.floor(i / 3) * 1.6, 0));
  }
  const spot = api.openGround(ids[0], 20);
  const target = spot ? spot : [anchor[0] + 18, anchor[1], anchor[2]];
  api.setPlayer(target[0], target[1], target[2]);
  for (const id of ids) api.force(id, 'engage');
  api.step(1.5);

  const rows = [];
  for (const a of api.agents()) {
    const p = new THREE.Vector3(a.position[0], a.position[1], a.position[2]);
    const region = nav.regionAt(p.x, p.y, p.z);
    let within = 0, sameRegion = 0, facing = 0, height = 0, unclaimed = 0;
    for (let i = 0; i < field.count; i++) {
      const pt = field.at(i);
      const d = pt.position.distanceTo(p);
      if (d > 15) continue;
      within++;
      if (field.islandOf(i) !== region) continue;
      sameRegion++;
      if (Math.abs(pt.position.y - p.y) > 2.6) continue;
      height++;
      const ex = pt.position.x - target[0];
      const ez = pt.position.z - target[2];
      const ee = Math.hypot(ex, ez) || 1;
      if (-(pt.normal.x * ex + pt.normal.z * ez) / ee < 0.15) continue;
      facing++;
      if (field.claimedBy(i) < 0) unclaimed++;
    }
    const node = nav.nearestNode(p.x, p.y, p.z, 4);
    const nodePos = new THREE.Vector3();
    if (node >= 0) nav.positionOf(node, nodePos);
    rows.push({
      id: a.id, s: a.state, cover: a.cover, score: +(a.coverScore ?? 0).toFixed(1),
      region, size: nav.regionSizeOf(region),
      snapAway: node >= 0 ? +nodePos.distanceTo(p).toFixed(2) : null,
      within, sameRegion, height, facing, unclaimed,
    });
  }
  const byRegion = new Map();
  for (let i = 0; i < field.count; i++) {
    const r = field.islandOf(i);
    byRegion.set(r, (byRegion.get(r) ?? 0) + 1);
  }
  const top = [...byRegion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([r, n]) => ({ region: r, points: n, size: nav.regionSizeOf(r) }));
  return { totalCover: field.count, coverByRegion: top, nav: nav.describe(), rows, anchor, target };
});
console.log('cover points in level:', out.totalCover);
console.log('nav:', JSON.stringify(out.nav));
console.log('cover by region:', JSON.stringify(out.coverByRegion));
console.log('anchor', out.anchor.map((n) => +n.toFixed(1)), 'target', out.target.map((n) => +n.toFixed(1)));
for (const r of out.rows) console.log(' ', JSON.stringify(r));
await browser.close();
