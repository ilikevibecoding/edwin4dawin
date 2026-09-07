// One Chrome instance serving a queue of shot specs, so a builder pays the machine-wide slot wait once per work
// session instead of once per round (the same pattern the other builders use):
//   node bench/reports/acfloats/tools/session.mjs <queueDir> <idleMs>
// Drop `<name>_<W>x<H>.spec` files into the queue (lines `<out.png>\t<url>`, the shots.mjs format); each is shot at
// W x H in mtime order and answered with `<name>_<W>x<H>.spec.done` (JSON summary). A per-view log is written next
// to each PNG as `<out>.log.json` with the renderer's draw-call / triangle counts and the console lines. A
// `<spec>.pre` bash script, if present, runs first (used to point the preview's dist symlink at the round's build).
// The browser is closed (and the slot released) after `idleMs` with an empty queue, or when `<queueDir>/STOP` appears.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const [queueDir, idleArg = '240000'] = process.argv.slice(2);
if (!queueDir) { console.error('usage: session.mjs <queueDir> [idleMs]'); process.exit(2); }
fs.mkdirSync(queueDir, { recursive: true });
const idleMs = Number(idleArg);
const stamp = () => new Date().toISOString().slice(11, 19);

const browser = await puppeteer.launch({
  timeout: 1800000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,720', '--hide-scrollbars'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});
// the endpoint lets bench/scripts/flighttest.mjs (BROWSER_WS=...) run in this browser instead of waiting for a
// slot of its own; a `HOLD` file in the queue keeps the session from idling out while such a run is in progress
fs.writeFileSync(path.join(queueDir, 'ws'), browser.wsEndpoint());
console.log(`${stamp()} [session] browser up, watching ${queueDir}`);

async function shoot(specPath) {
  const m = /_(\d+)x(\d+)\.spec$/.exec(specPath);
  const w = m ? Number(m[1]) : 1280, h = m ? Number(m[2]) : 720;
  const specs = fs.readFileSync(specPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf('\t');
    return { out: l.slice(0, i), url: l.slice(i + 1) };
  });
  const summary = [];
  for (const { out, url } of specs) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    const logs = [];
    page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
    const t0 = Date.now();
    let ready = false, info = null;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 120000 });
      try {
        await page.waitForFunction('window.__ready === true', { timeout: 300000, polling: 200 });
        ready = true;
      } catch { logs.push('[session] timeout waiting for __ready'); }
      for (let i = 0; i < 3; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      info = await page.evaluate(() => {
        const r = window.__game?.renderer;
        return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs?.length, build: window.__build } : null;
      });
      await page.screenshot({ path: out, type: 'png' });
    } catch (e) {
      logs.push(`[session] ${String(e)}`);
    }
    const ms = Date.now() - t0;
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, ready, ms, info, logs: logs.slice(0, 40) }, null, 2));
    console.log(`${stamp()} ${ready ? 'ok  ' : 'WARN'} ${path.basename(out)} ${ms} ms tris=${info?.tris ?? '?'} calls=${info?.calls ?? '?'}`);
    summary.push({ out, ready, ms, info, errors: logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]') || l.startsWith('[session]')) });
    await page.close().catch(() => {});
  }
  return summary;
}

let lastWork = Date.now();
for (;;) {
  if (fs.existsSync(path.join(queueDir, 'STOP'))) { console.log(`${stamp()} [session] STOP`); break; }
  const pending = fs.readdirSync(queueDir).filter((f) => f.endsWith('.spec') && !fs.existsSync(path.join(queueDir, `${f}.done`)))
    .map((f) => ({ f, t: fs.statSync(path.join(queueDir, f)).mtimeMs })).sort((a, b) => a.t - b.t);
  if (pending.length === 0) {
    if (fs.existsSync(path.join(queueDir, 'HOLD'))) lastWork = Date.now();
    if (Date.now() - lastWork > idleMs) { console.log(`${stamp()} [session] idle ${idleMs} ms, releasing the slot`); break; }
    await new Promise((r) => setTimeout(r, 2000));
    continue;
  }
  const specPath = path.join(queueDir, pending[0].f);
  console.log(`${stamp()} [session] spec ${pending[0].f}`);
  // optional hook run before the spec (swaps the preview's dist symlink to the build this spec is meant to show)
  if (fs.existsSync(`${specPath}.pre`)) {
    try { execSync(`bash ${specPath}.pre`, { stdio: 'inherit' }); } catch (e) { console.log(`${stamp()} [session] pre hook failed: ${e}`); }
  }
  const t0 = Date.now();
  const summary = await shoot(specPath);
  fs.writeFileSync(`${specPath}.done`, JSON.stringify({ ms: Date.now() - t0, views: summary }, null, 2));
  lastWork = Date.now();
}
fs.rmSync(path.join(queueDir, 'ws'), { force: true });
await browser.close();
