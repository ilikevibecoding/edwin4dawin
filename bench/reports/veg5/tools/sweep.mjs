// One browser, one page load, many in-page camera poses: renders each pose and counts pure-black pixels
// (a NaN-emitting object turns into an 8 px block-stepped black hole through the post chain). Saves a
// still of every pose whose black count passes the threshold.
// usage: node sweep.mjs <port> <outDir> <tag> <startQuery> <camsJsonFile> [w] [h] [threshold]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [port, outDir, tag, startQuery, camsFile, w = '960', h = '540', threshold = '150'] = process.argv.slice(2);
if (!port || !outDir || !tag || !startQuery || !camsFile) { console.error('usage: sweep.mjs <port> <outDir> <tag> <startQuery> <camsJsonFile> [w] [h] [threshold]'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const cams = JSON.parse(fs.readFileSync(camsFile, 'utf8'));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  timeout: 0,
  protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
});
const log = (s) => { console.log(s); fs.appendFileSync(`${outDir}/${tag}.txt`, s + '\n'); };
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const url = `http://127.0.0.1:${port}/?bench=${startQuery}&quality=high&freeze=1&seed=20260904`;
  await page.goto(url, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__ready === true', { timeout: 420000, polling: 200 });
  if (process.env.PROBE) {
    try { const r = await page.evaluate(process.env.PROBE); log(`PROBE: ${typeof r === 'string' ? r : JSON.stringify(r)}`); } catch (e) { log(`PROBE ERROR ${e.message}`); }
  }
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
      return { y, black, box: black ? [minX, minY, maxX, maxY] : null, calls: info.calls, tris: info.triangles, stats: g.vegetation.stats ? g.vegetation.stats() : null };
    }, c);
    const label = c.label ?? `${c.x}_${c.z}_h${c.hdg}`;
    let line = `${tag} ${label}: cam ${c.x},${r.y.toFixed(2)},${c.z} hdg ${c.hdg} pch ${c.pch} black ${r.black} box ${JSON.stringify(r.box)} calls ${r.calls} tris ${r.tris} ms ${Date.now() - t0}`;
    if (r.black >= Number(threshold) || c.save) {
      const file = `${outDir}/${tag}-${label}.png`;
      await page.screenshot({ path: file, type: 'png' });
      line += ` -> ${file}`;
    }
    log(line);
  }
  const bad = logs.filter((l) => !l.startsWith('[log]') && !l.startsWith('[info]'));
  log(`${tag} logs ${JSON.stringify(bad.slice(0, 5))}`);
} finally {
  await browser.close();
}
console.log(`DONE ${tag}`);
