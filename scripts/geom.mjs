#!/usr/bin/env node
/** Dump a vertical profile of the head geometry to verify the sculpt numerically. */
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5173/?dev=heads&who=connor&q=low&warm=0&rf=2&nopost=1';

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--window-size=320,180', '--mute-audio'],
  protocolTimeout: 300000,
});
const page = await browser.newPage();
await page.setViewport({ width: 320, height: 180 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(url, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 12000));

const out = await page.evaluate(() => {
  const e = window.__engine;
  let body = null;
  e.set.scene.traverse((o) => {
    if (!body && o.isSkinnedMesh && o.name.endsWith('-body')) body = o;
  });
  if (!body) return { err: 'no body mesh' };
  const g = body.geometry;
  const pos = g.getAttribute('position');
  const reg = g.getAttribute('aRegion');
  // Head region = 6
  const rows = [];
  const bands = 24;
  let minY = 1e9, maxY = -1e9;
  for (let i = 0; i < pos.count; i++) {
    if (reg.getX(i) !== 6) continue;
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const H = maxY - minY;
  for (let b = 0; b < bands; b++) {
    const y0 = minY + (b / bands) * H;
    const y1 = minY + ((b + 1) / bands) * H;
    let maxZ = -1e9, maxZmid = -1e9, maxX = -1e9, count = 0;
    for (let i = 0; i < pos.count; i++) {
      if (reg.getX(i) !== 6) continue;
      const y = pos.getY(i);
      if (y < y0 || y >= y1) continue;
      const x = pos.getX(i), z = pos.getZ(i);
      count++;
      if (z > maxZ) maxZ = z;
      if (Math.abs(x) < 0.006 && z > maxZmid) maxZmid = z;
      if (Math.abs(x) > maxX) maxX = Math.abs(x);
    }
    rows.push({
      band: b,
      y: +((y0 + y1) / 2).toFixed(4),
      n: count,
      frontZ: +maxZ.toFixed(4),
      midZ: +maxZmid.toFixed(4),
      halfW: +maxX.toFixed(4),
    });
  }
  return { minY: +minY.toFixed(4), maxY: +maxY.toFixed(4), headHeight: +H.toFixed(4), verts: pos.count, rows };
});

if (out.err) {
  console.log(out.err);
} else {
  console.log(`head y ${out.minY}..${out.maxY} height=${out.headHeight} (bodyVerts=${out.verts})`);
  console.log('band     y      n   frontZ    midZ   halfW');
  for (const r of out.rows) {
    console.log(
      String(r.band).padStart(4),
      String(r.y).padStart(7),
      String(r.n).padStart(4),
      String(r.frontZ).padStart(8),
      String(r.midZ).padStart(8),
      String(r.halfW).padStart(7),
    );
  }
}
await browser.close();
