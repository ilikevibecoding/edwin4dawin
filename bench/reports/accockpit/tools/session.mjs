// Queue-fed still session for the accockpit gauntlet: ONE Chrome instance (one machine-wide slot, taken by
// /tmp/accockpit/slotwait.sh with a blocking flock) works through every `*.spec` file dropped into a queue directory
// and exits after `idleSec` seconds without work, so consecutive rounds do not each queue for a slot while no slot
// is held idle for long.
//   node bench/reports/accockpit/tools/session.mjs <queueDir> [idleSec=180]
// A spec has one view per line: <out.png>\t<url>[\t<steps>] — the page is a bench view (`?bench=...`; the standard
// `w`, `h`, `quality`, `seed` and `freeze=1` are appended when missing), rendered once for shader warm-up and, when
// `steps` is given, advanced by that many fixed 30 Hz simulation steps (flight states) before the still.
// `<out>.json` gets the renderer counters (calls, triangles), the console and, on the first ready page of each
// preview port, the PlaneModel per-mesh triangle table (budget accounting). The spec is renamed `<spec>.done`.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const [queueDir, idleArg = '180'] = process.argv.slice(2);
if (!queueDir) { console.error('usage: session.mjs <queueDir> [idleSec]'); process.exit(2); }
fs.mkdirSync(queueDir, { recursive: true });
const idleMs = Number(idleArg) * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1920, H = 1080;

const browser = await puppeteer.launch({
  timeout: 1800000, protocolTimeout: 1800000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`, '--hide-scrollbars', '--enable-precise-memory-info'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
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
    rows.push({ name: o.name || '', mat: matIndex.get(o.material) ?? -1, matType: o.material.type, tris, visible: vis, exterior: model.exteriorMeshes.includes(o), renderOrder: o.renderOrder });
  });
  const sum = (f) => rows.filter(f).reduce((a, r) => a + r.tris, 0);
  return {
    build: window.__build, meshes: rows.length, meshesVisible: rows.filter((r) => r.visible).length,
    exteriorMeshes: rows.filter((r) => r.exterior).length, interiorMeshes: rows.filter((r) => !r.exterior).length,
    trisAll: sum(() => true), trisVisible: sum((r) => r.visible), trisExterior: sum((r) => r.exterior), trisInterior: sum((r) => !r.exterior), rows,
  };
};

function withDefaults(url) {
  const u = new URL(url);
  const d = { w: String(W), h: String(H), quality: 'high', seed: '20260904', freeze: '1' };
  for (const [k, v] of Object.entries(d)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  return u.toString().replace(/%2C/g, ',').replace(/%3D/g, '=');
}

async function runSpec(specPath) {
  const lines = fs.readFileSync(specPath, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const log = (line) => { fs.appendFileSync(`${specPath}.log`, line + '\n'); console.log(line); };
  const statsDone = new Set();
  for (const line of lines) {
    const [out, rawUrl, stepsRaw] = line.split('\t');
    const url = withDefaults(rawUrl), steps = Number(stepsRaw || 0);
    const port = new URL(url).port || '80', statsFile = `${specPath}.stats-${port}.json`;
    if (fs.existsSync(statsFile)) statsDone.add(port);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', (m) => { const t = m.text(); if (!t.includes('[vite]')) logs.push(`[${m.type()}] ${t}`); });
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
    const t0 = Date.now();
    let ready = false, info = null;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 300000 });
      try {
        await page.waitForFunction('window.__benchReady === true', { timeout: 1500000, polling: 250 });
        ready = true;
      } catch { logs.push('[session] timeout waiting for __benchReady'); }
      const renderMs = await page.evaluate((n) => {
        window.__bench.render();
        const t = performance.now();
        if (n > 0) window.__bench.step(n); else window.__bench.render();
        return performance.now() - t;
      }, steps);
      info = await page.evaluate(() => window.__bench.metrics());
      await page.screenshot({ path: out, type: 'png' });
      const tele = await page.evaluate(() => { const a = window.__game?.aircraft, t = a?.flight?.telemetry; return t ? { rpm: 600 + t.rpm * 2000, airspeed: t.airspeed, throttle: a.inputs?.throttle } : null; });
      fs.writeFileSync(`${out}.json`, JSON.stringify({ url, ready, steps, ms: Date.now() - t0, renderMs, calls: info?.calls, triangles: info?.triangles, build: info?.build, telemetry: tele, logs: logs.slice(0, 40) }, null, 2));
      log(`${ready ? 'ok  ' : 'WARN'} ${out} ${Date.now() - t0} ms calls ${info?.calls} tris ${info?.triangles} rpm ${tele?.rpm?.toFixed?.(0)}`);
      if (ready && !statsDone.has(port)) {
        const stats = await page.evaluate(STATS);
        fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
        statsDone.add(port);
      }
    } catch (e) {
      log(`FAIL ${out} ${e.message}`);
      fs.writeFileSync(`${out}.json`, JSON.stringify({ url, ready, error: e.message, logs }, null, 2));
    }
    await page.close().catch(() => {});
  }
  fs.renameSync(specPath, `${specPath}.done`);
}

let lastWork = Date.now();
while (true) {
  const specs = fs.readdirSync(queueDir).filter((f) => f.endsWith('.spec')).sort();
  if (specs.length) {
    for (const s of specs) { await runSpec(path.join(queueDir, s)); }
    lastWork = Date.now();
  } else {
    if (Date.now() - lastWork > idleMs) break;
    await sleep(1500);
  }
}
console.log(`session idle ${idleArg} s, exiting ${new Date().toISOString()}`);
await browser.close();
