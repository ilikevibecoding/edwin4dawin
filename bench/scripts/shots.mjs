// Many headless screenshots from ONE Chrome instance:
//   node bench/scripts/shots.mjs <spec.txt> [width] [height] [settleFrames]
// spec.txt has one view per line: <out.png>\t<url>. The machine-wide Chrome slot gate is taken once for the
// whole batch instead of once per view (the hourly progress snapshot went from ~35 min per view while builders
// were capturing to a few minutes for twenty views). A per-view JSON log is written next to each PNG as
// <out>.log.json; a view whose page never reports __ready is still shot and flagged {"ready": false}. A view
// that fails outright (a protocol timeout while the machine is overloaded: h14 lost seven of twenty-two views
// when the load passed 100) is retried once at the end of the batch, with longer waits.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [specPath, w = '1280', h = '720', settle = '3'] = process.argv.slice(2);
if (!specPath) { console.error('usage: shots.mjs <spec.txt> [w] [h] [settleFrames]'); process.exit(2); }
const specs = fs.readFileSync(specPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const i = l.indexOf('\t');
  return { out: l.slice(0, i), url: l.slice(i + 1) };
});

const browser = await puppeteer.launch({
  timeout: 1800000,
  // a page.evaluate() under a load of 100 can take minutes to be answered; never let the protocol give up first
  protocolTimeout: 900000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
});

/** shoots one view; returns 'ok' | 'warn' (shot without __ready) | 'fail' (no PNG) */
async function shoot({ out, url }, attempt) {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const t0 = Date.now();
  let ready = false;
  let result;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 * attempt });
    try {
      await page.waitForFunction('window.__ready === true', { timeout: 300000 * attempt, polling: 200 });
      ready = true;
    } catch { logs.push('[shots] timeout waiting for __ready'); }
    for (let i = 0; i < Number(settle); i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    const info = await page.evaluate(() => {
      const r = window.__game?.renderer;
      return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs?.length, build: window.__build } : null;
    });
    await page.screenshot({ path: out, type: 'png' });
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, ready, attempt, ms: Date.now() - t0, info, logs: logs.slice(0, 40) }, null, 2));
    console.log(`${ready ? 'ok  ' : 'WARN'} ${out} ${Date.now() - t0} ms${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
    result = ready ? 'ok' : 'warn';
  } catch (e) {
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, ready, attempt, error: String(e), logs: logs.slice(0, 40) }, null, 2));
    console.log(`FAIL ${out}: ${e.message}`);
    result = 'fail';
  }
  await page.close().catch(() => {});
  return result;
}

let failures = 0;
const retry = [];
for (const spec of specs) {
  const r = await shoot(spec, 1);
  if (r === 'fail') retry.push(spec);
  else if (r === 'warn') failures++;
}
for (const spec of retry) {
  const r = await shoot(spec, 2);
  if (r !== 'ok') failures++;
}
await browser.close();
process.exit(failures ? 1 : 0);
