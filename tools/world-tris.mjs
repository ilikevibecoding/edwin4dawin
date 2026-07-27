#!/usr/bin/env node
/**
 * Where the triangles are.
 *
 * A frame total tells you the level is too heavy; it does not tell you which of
 * four hundred generators is spending the budget. This poses a vantage, walks
 * the world root, and reports every visible mesh by triangle count — instanced
 * props multiplied out by their live instance count — so a cut can be aimed at
 * the three things that actually matter instead of spread over everything.
 *
 * Usage: world-tris.mjs [--shot market_hero] [--quality high] [--top 40]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const shot = arg('shot', 'market_hero');
const quality = arg('quality', 'high');
const top = Number(arg('top', 40));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=640,360',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
await page.goto(`http://127.0.0.1:5173/?capture=1&quality=${quality}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });

const out = await page.evaluate(async (shotName, topN) => {
  const g = window.__GAME__;
  const world = g.engine.get('world');
  g.pose(shotName);
  g.stepFrames(6);

  const triOf = (geo) =>
    geo.index ? geo.index.count / 3 : (geo.attributes.position?.count ?? 0) / 3;

  const rows = [];
  let total = 0;
  let hidden = 0;
  let casters = 0;
  let casterTris = 0;
  world.root.traverse((o) => {
    if (!o.isMesh) return;
    let vis = o.visible;
    let p = o.parent;
    while (p && vis) { if (!p.visible) vis = false; p = p.parent; }
    const per = triOf(o.geometry);
    const n = per * (o.isInstancedMesh ? o.count : 1);
    if (!vis) { hidden += n; return; }
    total += n;
    if (o.castShadow) { casters += 1; casterTris += n; }
    rows.push({
      name: o.name || '(unnamed)',
      kind: o.isInstancedMesh ? `inst x${o.count}` : 'merged',
      perTri: Math.round(per),
      tris: Math.round(n),
      caster: !!o.castShadow,
    });
  });
  rows.sort((a, b) => b.tris - a.tris);

  // Group by leading token, so a family of props reads as one line.
  const fam = new Map();
  for (const r of rows) {
    const key = r.name.includes(':') ? r.name.split(':')[1] : r.name.replace(/@.*$/, '');
    const cur = fam.get(key) ?? { key, tris: 0, meshes: 0 };
    cur.tris += r.tris;
    cur.meshes += 1;
    fam.set(key, cur);
  }
  const families = [...fam.values()].sort((a, b) => b.tris - a.tris).slice(0, topN);

  // Draw calls are per visible object regardless of size, so the cheap tail is
  // where the call budget leaks: an instanced mesh holding three twenty-triangle
  // props costs exactly as much as the one holding the whole market street.
  const tail = rows.filter((r) => r.tris < 900).sort((a, b) => a.tris - b.tris);

  const info = g.engine.renderer.info;
  return {
    shot: shotName,
    tailCalls: tail.length,
    tailTris: tail.reduce((a, r) => a + r.tris, 0),
    tail: tail.slice(0, 60),
    preset: g.engine.quality.preset,
    cascades: g.engine.quality.settings?.shadowCascades ?? null,
    visibleMeshes: rows.length,
    shadowCasters: casters,
    shadowCasterTris: casterTris,
    levelTris: total,
    culledTris: Math.round(hidden),
    frameDrawCalls: info.render.calls,
    frameTris: info.render.triangles,
    programs: info.programs?.length ?? null,
    textures: info.memory.textures,
    worldStats: world.stats,
    top: rows.slice(0, topN),
    families,
  };
}, shot, top);

console.log(JSON.stringify(out, null, 2));
await browser.close();
