// Queue-fed screenshot session: ONE Chrome instance (one machine-wide slot) works through every `*.spec` file dropped
// into a queue directory, then exits after `idleSec` seconds without work, so consecutive rounds do not each wait
// for a slot while the slot is not held idle for long either.
//   node bench/reports/acgeo/tools/acsession.mjs <queueDir> [idleSec=240] [width] [height]
// A spec has one view per line: <out.png>\t<url> (see views.py). Per spec, `<spec>.log` gets one line per view and
// `<spec>.stats-<port>.json` the PlaneModel triangle / mesh table of the first ready page on each preview port;
// the spec is renamed `<spec>.done` when finished. Pages report `__ready`; a page that never does is shot anyway
// and flagged in the log.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const [queueDir, idleArg = '240', w = '1280', h = '720'] = process.argv.slice(2);
if (!queueDir) { console.error('usage: acsession.mjs <queueDir> [idleSec] [w] [h]'); process.exit(2); }
fs.mkdirSync(queueDir, { recursive: true });
const idleMs = Number(idleArg) * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  timeout: 1800000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
});
console.log(`session up ${new Date().toISOString()} queue ${queueDir}`);

const STATS = () => {
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
};

async function runSpec(specPath) {
  const specs = fs.readFileSync(specPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf('\t');
    return { out: l.slice(0, i), url: l.slice(i + 1) };
  });
  const log = (line) => { fs.appendFileSync(`${specPath}.log`, line + '\n'); console.log(line); };
  const statsDone = new Set();
  for (const { out, url } of specs) {
    const port = new URL(url).port || '80', statsFile = `${specPath}.stats-${port}.json`;
    if (fs.existsSync(statsFile)) statsDone.add(port);
    fs.mkdirSync(path.dirname(out), { recursive: true });
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
      log(`${ready ? 'ok  ' : 'WARN'} ${out} ${Date.now() - t0} ms calls ${info?.calls} tris ${info?.tris}`);
      if (ready && !statsDone.has(port)) {
        const stats = await page.evaluate(STATS);
        fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
        const { rows, ...summary } = stats;
        log(`aircraft @${port}: ${JSON.stringify(summary)}`);
        statsDone.add(port);
      }
    } catch (e) {
      fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, ready, error: String(e), logs: logs.slice(0, 40) }, null, 2));
      log(`FAIL ${out}: ${e.message}`);
    }
    await page.close().catch(() => {});
  }
  fs.renameSync(specPath, `${specPath}.done`);
}

let lastWork = Date.now();
for (;;) {
  const pending = fs.readdirSync(queueDir).filter((f) => f.endsWith('.spec')).map((f) => path.join(queueDir, f))
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
  if (pending.length) {
    await runSpec(pending[0]);
    lastWork = Date.now();
    continue;
  }
  if (Date.now() - lastWork > idleMs) break;
  await sleep(3000);
}
console.log(`session idle ${idleArg}s: closing ${new Date().toISOString()}`);
await browser.close();
