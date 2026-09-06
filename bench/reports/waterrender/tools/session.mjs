// One Chrome-gate slot, many jobs: node session.mjs <queueDir> [idleMs]
// Job files <queueDir>/<nn>-<name>.json are processed in name order and deleted; the browser closes after idleMs
// (default 4 min) without a job, so the slot is only held while work is actually queued.
//   {"type":"shot","name":"sun14","port":4517,"q":"cam=...&time=14","out":"/tmp/waterrender/r7"}
//   {"type":"perf","name":"sun14","portA":4510,"portB":4517,"q":"cam=...","rounds":4,"out":"/tmp/waterrender/perf"}
// q starting with "bench=" is used verbatim, otherwise it is a dev-view query.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const [queueDir, idleS] = process.argv.slice(2);
const idleMs = Number(idleS || 240000);
fs.mkdirSync(queueDir, { recursive: true });
const w = 1280, h = 720;
const t0 = Date.now();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true, protocolTimeout: 1800000, timeout: 0,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
});
console.log(`browser slot after ${Date.now() - t0} ms`);
const url = (port, q) => q.startsWith('bench=') ? `http://127.0.0.1:${port}/?${q}&freeze=1&seed=20260904` : `http://127.0.0.1:${port}/?bench=dev&${q}&freeze=1&seed=20260904`;

async function open(port, q) {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(url(port, q), { waitUntil: 'load', timeout: 600000 });
  await page.waitForFunction('window.__ready === true', { timeout: 1200000, polling: 500 });
  const build = await page.evaluate(() => window.__build);
  return { page, logs, build };
}
const errsOf = (logs) => logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));

async function shot(job) {
  fs.mkdirSync(job.out, { recursive: true });
  const t = Date.now();
  let logs = [], info = null;
  try {
    const p = await open(job.port, job.q);
    logs = p.logs;
    for (let k = 0; k < 3; k++) await p.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    info = await p.page.evaluate(() => {
      const g = window.__game; const r = g?.renderer;
      return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs?.length, build: window.__build } : null;
    });
    await p.page.screenshot({ path: `${job.out}/${job.name}.png`, type: 'png' });
    await p.page.close();
  } catch (e) { logs.push(`[pageerror] shot failed: ${e.message}`); }
  const errs = errsOf(logs);
  fs.writeFileSync(`${job.out}/${job.name}.log`, JSON.stringify({ url: url(job.port, job.q), ms: Date.now() - t, info, logs: logs.slice(0, 40) }, null, 2));
  console.log(`shot ${job.name}: ${errs.length} errors, ${Date.now() - t} ms${errs.length ? ' ' + errs[0].slice(0, 160) : ''}`);
}

async function perf(job) {
  fs.mkdirSync(job.out, { recursive: true });
  const A = await open(job.portA, job.q), B = await open(job.portB, job.q);
  // The machine is shared by ~10 builders (load 6-10 on 4 cores), so single frames vary 4x; frames are taken in
  // ABBA quads and each quad gives one ratio (the load drift cancels to first order); the median of the quad
  // ratios and the ratio of the fastest frames (least contended) are reported.
  const one = (p) => p.page.evaluate(() => window.__bench.renderSync());
  await one(A); await one(B);
  const a = [], b = [], ratios = [];
  for (let r = 0; r < (job.rounds || 8); r++) {
    const a1 = await one(A), b1 = await one(B), b2 = await one(B), a2 = await one(A);
    a.push(a1, a2); b.push(b1, b2); ratios.push((b1 + b2) / (a1 + a2));
  }
  const med = (x) => { const s = [...x].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
  const res = { A: a.map((x) => Math.round(x)), B: b.map((x) => Math.round(x)), ratio: ratios.map((x) => +x.toFixed(3)), median: +med(ratios).toFixed(3), minRatio: +(Math.min(...b) / Math.min(...a)).toFixed(3), buildA: A.build, buildB: B.build, errsA: errsOf(A.logs).length, errsB: errsOf(B.logs).length };
  const f = `${job.out}/perf.json`;
  const all = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  all[job.name] = res;
  fs.writeFileSync(f, JSON.stringify(all, null, 2));
  console.log(`perf ${job.name}: A ${res.A.join('/')} ms, B ${res.B.join('/')} ms, ratio B/A median ${res.median} (quads ${res.ratio.join(", ")}), min-frame ratio ${res.minRatio}, errors A ${res.errsA} B ${res.errsB}`);
  await A.page.close(); await B.page.close();
}

// N frames of the view's own flight, three fixed 30 Hz steps per frame (the 10 fps clip of capture.mjs), every
// frame saved; the flicker metric (mean |difference| of consecutive frames at 320x180, as postprocess.py) is
// computed offline, against the base build's clip of the same view.
//   {"type":"clip","name":"waterlanding","port":4519,"q":"bench=water-landing","frames":24,"out":"/tmp/waterrender/r9"}
async function clip(job) {
  const dir = `${job.out}/${job.name}_clip`;
  fs.mkdirSync(dir, { recursive: true });
  const t = Date.now();
  let logs = [], times = [], build = null;
  try {
    const p = await open(job.port, job.q);
    logs = p.logs; build = p.build;
    await p.page.evaluate(() => window.__bench.render());
    for (let i = 0; i < (job.frames || 24); i++) {
      const ms = await p.page.evaluate(() => { const t0 = performance.now(); window.__bench.step(3); return performance.now() - t0; });
      times.push(Math.round(ms));
      await p.page.screenshot({ path: `${dir}/f${String(i).padStart(3, '0')}.png`, type: 'png' });
    }
    await p.page.close();
  } catch (e) { logs.push(`[pageerror] clip failed: ${e.message}`); }
  const errs = errsOf(logs);
  fs.writeFileSync(`${dir}/clip.log`, JSON.stringify({ url: url(job.port, job.q), ms: Date.now() - t, build, stepMs: times, logs: logs.slice(0, 40) }, null, 2));
  console.log(`clip ${job.name}: ${times.length} frames, ${errs.length} errors, ${Date.now() - t} ms${errs.length ? ' ' + errs[0].slice(0, 160) : ''}`);
}

let lastJob = Date.now();
for (;;) {
  const jobs = fs.readdirSync(queueDir).filter((f) => f.endsWith('.json')).sort();
  if (jobs.length === 0) {
    if (Date.now() - lastJob > idleMs) break;
    await new Promise((r) => setTimeout(r, 2000));
    continue;
  }
  const file = path.join(queueDir, jobs[0]);
  let job;
  try { job = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`bad job ${jobs[0]}: ${e.message}`); fs.unlinkSync(file); continue; }
  fs.unlinkSync(file);
  try {
    if (job.type === 'shot') await shot(job); else if (job.type === 'perf') await perf(job); else if (job.type === 'clip') await clip(job); else console.log(`unknown job type ${job.type}`);
  } catch (e) { console.log(`job ${jobs[0]} failed: ${e.message}`); }
  lastJob = Date.now();
}
await browser.close();
console.log('SESSION_CLOSED (idle)');
