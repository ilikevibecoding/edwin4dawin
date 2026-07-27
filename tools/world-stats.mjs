#!/usr/bin/env node
/**
 * Reports the level's own draw-call contribution.
 *
 * `renderer.info.render.calls` counts every pass the frame ran, shadow cascades
 * included, so it cannot tell you what the level costs on its own. This poses
 * the camera at each registered world vantage point and counts the visible
 * meshes under the world root — which is exactly one draw call each in the main
 * colour pass — alongside the totals the world system reports for itself.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const quality = arg('quality', 'high');

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=640,360',
  ],
  protocolTimeout: 300000,
  defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.setDefaultTimeout(300000);
const logs = [];
page.on('console', (m) => logs.push(m.text()));
await page.goto(`http://127.0.0.1:5173/?capture=1&quality=${quality}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 180000, polling: 250 });

const out = await page.evaluate(async () => {
  const g = window.__GAME__;
  const world = g.engine.get('world');
  const shots = g.listShots().filter((n) => !n.startsWith('sky_'));
  const rows = [];
  let worst = null;
  for (const name of shots) {
    g.pose(name);
    g.stepFrames(4);
    let visible = 0;
    let tris = 0;
    world.root.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      let p = o.parent;
      while (p) { if (!p.visible) return; p = p.parent; }
      visible++;
      const geo = o.geometry;
      const n = geo.index ? geo.index.count / 3 : (geo.attributes.position?.count ?? 0) / 3;
      tris += n * (o.isInstancedMesh ? o.count : 1);
    });
    const info = g.engine.renderer.info;
    const row = {
      shot: name,
      levelMeshes: visible,
      levelTrisK: Math.round(tris / 1000),
      frameDrawCalls: info.render.calls,
      frameTrisK: Math.round(info.render.triangles / 1000),
    };
    rows.push(row);
    if (!worst || row.frameDrawCalls > worst.frameDrawCalls) worst = row;
  }
  return {
    preset: g.engine.quality.preset,
    world: world.stats,
    spawns: world.spawnPoints.length,
    cover: world.coverPoints.length,
    landmarks: world.landmarks.map((l) => l.name),
    rows,
    worst,
  };
});

console.log(JSON.stringify(out, null, 2));
const build = logs.find((l) => l.includes('[world] Al-Rashid'));
if (build) console.log('\n' + build);
await browser.close();
