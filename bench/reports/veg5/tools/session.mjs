// One browser held for a run of jobs (one machine-wide Chrome slot, taken once): jobs are JSON files
// dropped into a queue directory and processed oldest first; the browser is released after `idleMs`
// without a job. Every page is closed when its job is done.
// usage: node session.mjs <queueDir> [idleMs]
// job file: { "type": "shots", "tag": "r13", "port": 4596, "outDir": "/tmp/veg5/shots", "w": 1920, "h": 1080,
//             "probe": "<js>", "specs": ["label@query", "label@js:file:/path.js", ...] }
//           { "type": "sweep", "tag": "s2", "port": 4596, "outDir": "/tmp/veg5/sweep", "w": 960, "h": 540,
//             "start": "dev&cam=...", "cams": [{x,z,agl|y,hdg,pch,label,save?}], "threshold": 100, "probe": "<js>" }
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const [queueDir, idleArg] = process.argv.slice(2);
if (!queueDir) { console.error('usage: session.mjs <queueDir> [idleMs]'); process.exit(2); }
const idleMs = Number(idleArg ?? 600000);
fs.mkdirSync(queueDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t00 = Date.now();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  timeout: 0,
  protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1920,1080', '--hide-scrollbars'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
console.log(`browser slot after ${Date.now() - t00} ms`);

const url = (port, query) => `http://127.0.0.1:${port}/?bench=${query}&quality=high&freeze=1&seed=20260904`;

async function loadPage(port, query, w, h, logs) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(url(port, query), { waitUntil: 'load', timeout: 300000 });
  try { await page.waitForFunction('window.__ready === true', { timeout: 420000, polling: 200 }); } catch (e) { logs.push('[timeout] __ready'); }
  for (let i = 0; i < 3; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  return page;
}

async function runShots(job) {
  const { tag, outDir, specs } = job;
  const w = job.w ?? 1920, h = job.h ?? 1080;
  fs.mkdirSync(outDir, { recursive: true });
  const out = (s) => { console.log(s); fs.appendFileSync(`${outDir}/${tag}.txt`, s + '\n'); };
  let lastPage = null;
  for (const spec of specs) {
    const at = spec.indexOf('@');
    const label = spec.slice(0, at);
    let query = spec.slice(at + 1);
    let port = job.port;
    // "label@js:<expression>" / "label@js:file:<path>": evaluated in the previously loaded page, returns the query
    const js = /^(?:(\d{4}):)?js:(.*)$/s.exec(query);
    if (js) {
      if (!lastPage) { out(`${tag} ${label}: no page to evaluate the js spec on`); continue; }
      try { const code = js[2].startsWith('file:') ? fs.readFileSync(js[2].slice(5), 'utf8') : js[2]; query = await lastPage.evaluate(code); if (js[1]) port = Number(js[1]); out(`${tag} ${label} query: ${query}`); } catch (e) { out(`${tag} ${label}: js spec failed ${e.message}`); continue; }
    }
    const m = /^(\d{4}):(.*)$/.exec(query);
    if (m) { port = Number(m[1]); query = m[2]; }
    if (lastPage) { await lastPage.close().catch(() => {}); lastPage = null; }
    const logs = [];
    const t0 = Date.now();
    let line;
    try {
      const page = await loadPage(port, query, w, h, logs);
      lastPage = page;
      if (job.probe) {
        try {
          const r = await page.evaluate(job.probe);
          // a data-URL result is written out as an image (texture atlas dumps)
          if (typeof r === 'string' && r.startsWith('data:image/png;base64,')) { const f = `${outDir}/${tag}-${label}-probe.png`; fs.writeFileSync(f, Buffer.from(r.slice(22), 'base64')); out(`PROBE ${label}: image -> ${f}`); }
          else out(`PROBE ${label}: ${typeof r === 'string' ? r : JSON.stringify(r)}`);
        } catch (e) { out(`PROBE ${label}: ERROR ${e.message}`); }
      }
      const info = await page.evaluate(() => { const g = window.__game; const r = g?.renderer; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, build: window.__build } : null; });
      await page.screenshot({ path: `${outDir}/${tag}-${label}.png`, type: 'png' });
      const bad = logs.filter((l) => !l.startsWith('[log]') && !l.startsWith('[info]'));
      line = `${tag} ${label}: calls ${info?.calls} tris ${info?.tris} ms ${Date.now() - t0} build ${info?.build} logs ${JSON.stringify(bad.slice(0, 3))}`;
    } catch (e) {
      line = `${tag} ${label}: FAILED ${String(e.message || e).slice(0, 160)}`;
    }
    out(line);
  }
  if (lastPage) await lastPage.close().catch(() => {});
}

async function runSweep(job) {
  const { tag, outDir, cams } = job;
  const w = job.w ?? 960, h = job.h ?? 540, threshold = job.threshold ?? 100;
  fs.mkdirSync(outDir, { recursive: true });
  const out = (s) => { console.log(s); fs.appendFileSync(`${outDir}/${tag}.txt`, s + '\n'); };
  const logs = [];
  const page = await loadPage(job.port, job.start, w, h, logs);
  try {
    if (job.probe) { try { const r = await page.evaluate(job.probe); out(`PROBE ${tag}: ${typeof r === 'string' ? r : JSON.stringify(r)}`); } catch (e) { out(`PROBE ${tag}: ERROR ${e.message}`); } }
    for (const c of cams) {
      const t0 = Date.now();
      const r = await page.evaluate((c) => {
        const g = window.__game;
        const cam = g.camera;
        let y = c.y;
        if (c.agl !== undefined) y = Math.max(0, g.map.heightAt(c.x, c.z)) + c.agl;
        cam.position.set(c.x, y, c.z);
        cam.rotation.order = 'YXZ';
        cam.rotation.set((c.pch * Math.PI) / 180, (-c.hdg * Math.PI) / 180, 0);
        if (c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
        cam.updateMatrixWorld();
        g.render();
        const gl = g.renderer.getContext();
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const buf = new Uint8Array(W * H * 4);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        let black = 0, minX = W, maxX = -1, minY = H, maxY = -1;
        for (let i = 0, p = 0; i < W * H; i++, p += 4) {
          const m = Math.max(buf[p], buf[p + 1], buf[p + 2]);
          if (m < 6) { black++; const x = i % W, yy = H - 1 - Math.floor(i / W); if (x < minX) minX = x; if (x > maxX) maxX = x; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; }
        }
        const info = g.renderer.info.render;
        return { y, black, box: black ? [minX, minY, maxX, maxY] : null, calls: info.calls, tris: info.triangles };
      }, c);
      const label = c.label ?? `${c.x}_${c.z}_h${c.hdg}`;
      let line = `${tag} ${label}: cam ${c.x},${r.y.toFixed(2)},${c.z} hdg ${c.hdg} pch ${c.pch} black ${r.black} box ${JSON.stringify(r.box)} calls ${r.calls} tris ${r.tris} ms ${Date.now() - t0}`;
      if (r.black >= threshold || c.save) {
        const file = `${outDir}/${tag}-${label}.png`;
        await page.screenshot({ path: file, type: 'png' });
        line += ` -> ${file}`;
      }
      out(line);
    }
    const bad = logs.filter((l) => !l.startsWith('[log]') && !l.startsWith('[info]'));
    out(`${tag} logs ${JSON.stringify(bad.slice(0, 5))}`);
  } finally {
    await page.close().catch(() => {});
  }
}

try {
  let idleSince = Date.now();
  for (;;) {
    const files = fs.readdirSync(queueDir).filter((f) => f.endsWith('.json')).map((f) => ({ f, t: fs.statSync(path.join(queueDir, f)).mtimeMs })).sort((a, b) => a.t - b.t);
    if (files.length === 0) {
      if (Date.now() - idleSince > idleMs) { console.log('idle: releasing the browser'); break; }
      await sleep(2000);
      continue;
    }
    const file = path.join(queueDir, files[0].f);
    let job;
    try { job = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`${file}: bad json ${e.message}`); fs.renameSync(file, file + '.bad'); continue; }
    fs.renameSync(file, file + '.running');
    console.log(`JOB ${files[0].f} (${job.type} ${job.tag})`);
    const t0 = Date.now();
    try {
      if (job.type === 'shots') await runShots(job);
      else if (job.type === 'sweep') await runSweep(job);
      else console.log(`${file}: unknown type ${job.type}`);
    } catch (e) {
      console.log(`JOB ${files[0].f} FAILED ${e.message}`);
    }
    fs.renameSync(file + '.running', file + '.done');
    console.log(`JOB ${files[0].f} done in ${Date.now() - t0} ms`);
    idleSince = Date.now();
  }
} finally {
  await browser.close();
}
console.log('SESSION END');
