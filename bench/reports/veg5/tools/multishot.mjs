// One browser (one machine-wide Chrome slot), several stills in sequence.
// usage: node multishot.mjs <baseUrl> <outDir> <tag> <w> <h> <label@query>...
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [base, outDir, tag, w = '1920', h = '1080', ...specs] = process.argv.slice(2);
if (!base || !outDir || !tag || specs.length === 0) { console.error('usage: multishot.mjs <baseUrl> <outDir> <tag> <w> <h> <label@query>...'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const t00 = Date.now();
// timeout 0: wait for a Chrome slot however long it takes (the wrapper polls the slot locks)
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  timeout: 0,
  protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
});
console.log(`browser slot after ${Date.now() - t00} ms`);
let lastPage = null;
try {
  for (const spec of specs) {
    const at = spec.indexOf('@');
    const label = spec.slice(0, at);
    let query = spec.slice(at + 1);
    // "label@js:<expression>": the expression runs in the previously loaded page and returns the query
    // (e.g. a ground camera found clear of the plants); "4594:js:..." keeps the port prefix
    const js = /^(?:(\d{4}):)?js:(.*)$/s.exec(query);
    if (js) {
      if (!lastPage) { console.log(`${label}: no page to evaluate the js spec on`); continue; }
      try { const code = js[2].startsWith('file:') ? fs.readFileSync(js[2].slice(5), 'utf8') : js[2]; const q = await lastPage.evaluate(code); query = (js[1] ? js[1] + ':' : '') + q; console.log(`${label}: js -> ${query}`); fs.appendFileSync(`${outDir}/${tag}.txt`, `${tag} ${label} query: ${query}\n`); } catch (e) { console.log(`${label}: js spec failed ${e.message}`); continue; }
    }
    if (lastPage) { await lastPage.close(); lastPage = null; }
    const page = await browser.newPage();
    lastPage = page;
    const logs = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
    const t0 = Date.now();
    // a spec whose query starts with a port number ("4593:aerial-a") is shot on that port instead of the base
    const m = /^(\d{4}):(.*)$/.exec(query);
    const url = m ? `http://127.0.0.1:${m[1]}/?bench=${m[2]}&quality=high&freeze=1&seed=20260904` : `${base}?bench=${query}&quality=high&freeze=1&seed=20260904`;
    let line;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 300000 });
      try { await page.waitForFunction('window.__ready === true', { timeout: 420000, polling: 200 }); } catch (e) { logs.push('[timeout] __ready'); }
      for (let i = 0; i < 3; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      if (process.env.PROBE) { try { const r = await page.evaluate(process.env.PROBE); console.log(`PROBE ${label}: ${typeof r === 'string' ? r : JSON.stringify(r)}`); fs.appendFileSync(`${outDir}/${tag}.txt`, `PROBE ${label}: ${typeof r === 'string' ? r : JSON.stringify(r)}\n`); } catch (e) { console.log(`PROBE ${label}: ERROR ${e.message}`); } }
      const info = await page.evaluate(() => {
        const g = window.__game; const r = g?.renderer;
        return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, build: window.__build } : null;
      });
      await page.screenshot({ path: `${outDir}/${tag}-${label}.png`, type: 'png' });
      const bad = logs.filter((l) => !l.startsWith('[log]') && !l.startsWith('[info]'));
      line = `${tag} ${label}: calls ${info?.calls} tris ${info?.tris} ms ${Date.now() - t0} build ${info?.build} logs ${JSON.stringify(bad.slice(0, 3))}`;
    } catch (e) {
      line = `${tag} ${label}: FAILED ${String(e.message || e).slice(0, 160)}`;
    }
    console.log(line);
    fs.appendFileSync(`${outDir}/${tag}.txt`, line + '\n');
  }
} finally {
  await browser.close();
}
console.log(`DONE ${tag}`);
