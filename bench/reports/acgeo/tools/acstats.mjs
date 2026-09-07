// Aircraft geometry budget: triangles and meshes (draw calls) of the PlaneModel, per mesh and in total.
//   node bench/reports/acgeo/tools/acstats.mjs http://127.0.0.1:4543/ [out.json]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [base = 'http://127.0.0.1:4543/', out] = process.argv.slice(2);
const url = `${base}?bench=plane-front-quarter&freeze=1&seed=20260904&dbg=nocity,noveg,nobridges,notraffic`;
const browser = await puppeteer.launch({
  timeout: 1800000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360', '--hide-scrollbars'],
  defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 300000, polling: 200 });
const stats = await page.evaluate(() => {
  const model = window.__game.aircraft.model;
  const rows = [];
  const matIndex = new Map(model.materials.map((m, i) => [m, i]));
  model.root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const tris = Math.round((g.index ? g.index.count : g.getAttribute('position').count) / 3);
    let vis = true, p = o;
    while (p) { if (!p.visible) vis = false; p = p.parent; }
    rows.push({ mat: matIndex.get(o.material) ?? -1, matType: o.material.type, tris, visible: vis, exterior: model.exteriorMeshes.includes(o), renderOrder: o.renderOrder });
  });
  const sum = (f) => rows.filter(f).reduce((a, r) => a + r.tris, 0);
  return {
    build: window.__build,
    meshes: rows.length,
    meshesVisible: rows.filter((r) => r.visible).length,
    exteriorMeshes: rows.filter((r) => r.exterior).length,
    interiorMeshes: rows.filter((r) => !r.exterior).length,
    trisAll: sum(() => true),
    trisVisible: sum((r) => r.visible),
    trisExterior: sum((r) => r.exterior),
    trisInterior: sum((r) => !r.exterior),
    rows,
  };
});
stats.logs = logs.filter((l) => !l.includes('[vite]')).slice(0, 20);
const summary = { build: stats.build, meshes: stats.meshes, meshesVisible: stats.meshesVisible, exteriorMeshes: stats.exteriorMeshes, interiorMeshes: stats.interiorMeshes, trisAll: stats.trisAll, trisVisible: stats.trisVisible, trisExterior: stats.trisExterior, trisInterior: stats.trisInterior };
console.log(JSON.stringify(summary, null, 2));
console.table(stats.rows.map((r, i) => ({ i, mat: r.mat, type: r.matType, tris: r.tris, vis: r.visible, ext: r.exterior })));
if (out) fs.writeFileSync(out, JSON.stringify(stats, null, 2));
await browser.close();
