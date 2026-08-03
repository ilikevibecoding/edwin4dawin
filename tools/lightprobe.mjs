#!/usr/bin/env node
/** Report renderer shadow state and interior light configuration at a time. */
import puppeteer from 'puppeteer-core';

const t = Number(process.argv[2] ?? 272);
const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 500 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async () => {
  document.querySelector('#gate button.primary').click();
  await new Promise((r) => setTimeout(r, 800));
  window.__SW.setPlaying(false);
});
const out = await page.evaluate((time) => {
  window.__SW.seek(time);
  window.__SW.settle(8, 1 / 30);
  window.__SW.renderOnce();
  const app = window.__SW.app;
  const r = app.render.renderer;
  const key = app.stage.interiorKey;
  let casters = 0;
  let receivers = 0;
  app.stage.interiorRoot.traverse((o) => {
    if (!o.visible) return;
    if (o.castShadow) casters++;
    if (o.receiveShadow) receivers++;
  });
  return {
    shadowMapEnabled: r.shadowMap.enabled,
    shadowMapType: r.shadowMap.type,
    tier: app.stage.qualityTier.name,
    location: app.stage.location,
    keyVisible: key.visible,
    keyIntensity: key.intensity,
    keyCast: key.castShadow,
    keyMapSize: key.shadow.mapSize.toArray(),
    keyHasMap: !!key.shadow.map,
    casters,
    receivers,
    interiorRootVisible: app.stage.interiorRoot.visible,
  };
}, t);
console.log(JSON.stringify(out, null, 1));
await browser.close();
