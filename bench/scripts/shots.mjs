// Many headless screenshots from ONE Chrome instance:
//   node bench/scripts/shots.mjs <spec.txt> [width] [height] [settleFrames]
// spec.txt has one view per line: <out.png>\t<url>. The machine-wide Chrome slot gate is taken once for the
// whole batch instead of once per view (the hourly progress snapshot went from ~35 min per view while builders
// were capturing to a few minutes for twenty views). A per-view JSON log is written next to each PNG as
// <out>.log.json; a view whose page never reports __ready is still shot and flagged {"ready": false}.
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
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
});
let failures = 0;
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
    for (let i = 0; i < Number(settle); i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    const info = await page.evaluate(() => {
      const r = window.__game?.renderer;
      return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs?.length, build: window.__build } : null;
    });
    await page.screenshot({ path: out, type: 'png' });
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, ready, ms: Date.now() - t0, info, logs: logs.slice(0, 40) }, null, 2));
    console.log(`${ready ? 'ok  ' : 'WARN'} ${out} ${Date.now() - t0} ms`);
    if (!ready) failures++;
  } catch (e) {
    failures++;
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, ready, error: String(e), logs: logs.slice(0, 40) }, null, 2));
    console.log(`FAIL ${out}: ${e.message}`);
  }
  await page.close().catch(() => {});
}
await browser.close();
process.exit(failures ? 1 : 0);
