import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:4173/?test=1&quality=low&seed=1&skipintro=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 150000 });
const bad = await page.evaluate(() => {
  const out = [];
  window.__gameInstance.scene.traverse((o) => {
    const g = o.geometry;
    if (!g || !g.attributes || !g.attributes.position) return;
    const a = g.attributes.position.array;
    let n = 0;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) n++;
    if (n) {
      const chain = [];
      let p = o;
      while (p) { chain.unshift(p.name || p.type); p = p.parent; }
      out.push({ path: chain.join('/'), nan: n, total: a.length, params: g.parameters, first: Array.from(a.slice(0,9)) });
    }
  });
  return out;
});
console.log(JSON.stringify(bad, null, 2));
console.log('marks', JSON.stringify(await page.evaluate(() => window.__BOOT_MARKS)));
await browser.close();
