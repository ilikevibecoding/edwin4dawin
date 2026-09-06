// Screenshots + aircraft geometry budget from ONE Chrome instance (one machine-wide Chrome slot per batch):
//   node bench/reports/acgeo/tools/acshots.mjs <spec.txt> <stats.json> [width] [height]
// spec.txt has one view per line: <out.png>\t<url> (see views.py). The first page that reports __ready is also
// asked for the PlaneModel's triangle / mesh counts (per mesh, exterior vs interior), written to <stats.json>.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [specPath, statsPath, w = '1280', h = '720'] = process.argv.slice(2);
if (!specPath || !statsPath) { console.error('usage: acshots.mjs <spec.txt> <stats.json> [w] [h]'); process.exit(2); }
const specs = fs.readFileSync(specPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const i = l.indexOf('\t');
  return { out: l.slice(0, i), url: l.slice(i + 1) };
});

const browser = await puppeteer.launch({
  timeout: 1800000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
});
let failures = 0, statsDone = fs.existsSync(statsPath);
for (const { out, url } of specs) {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const t0 = Date.now();
  let ready = false;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    try {
      await page.waitForFunction('window.__ready === true', { timeout: 300000, polling: 200 });
      ready = true;
    } catch { logs.push('[shots] timeout waiting for __ready'); }
    for (let i = 0; i < 3; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    const info = await page.evaluate(() => {
      const r = window.__game?.renderer;
      return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs?.length, build: window.__build } : null;
    });
    await page.screenshot({ path: out, type: 'png' });
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, ready, ms: Date.now() - t0, info, logs: logs.slice(0, 40) }, null, 2));
    console.log(`${ready ? 'ok  ' : 'WARN'} ${out} ${Date.now() - t0} ms`);
    if (!ready) failures++;
    if (ready && !statsDone) {
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
          build: window.__build, meshes: rows.length, meshesVisible: rows.filter((r) => r.visible).length,
          exteriorMeshes: rows.filter((r) => r.exterior).length, interiorMeshes: rows.filter((r) => !r.exterior).length,
          trisAll: sum(() => true), trisVisible: sum((r) => r.visible), trisExterior: sum((r) => r.exterior), trisInterior: sum((r) => !r.exterior), rows,
        };
      });
      fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
      const { rows, ...summary } = stats;
      console.log('aircraft:', JSON.stringify(summary));
      statsDone = true;
    }
  } catch (e) {
    failures++;
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, ready, error: String(e), logs: logs.slice(0, 40) }, null, 2));
    console.log(`FAIL ${out}: ${e.message}`);
  }
  await page.close().catch(() => {});
}
await browser.close();
process.exit(failures ? 1 : 0);
