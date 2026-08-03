#!/usr/bin/env node
/** Print world positions of named ship anchors at a timeline time. */
import puppeteer from 'puppeteer-core';

const t = Number(process.argv[2] ?? 200);
const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 400 });
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async () => {
  document.querySelector('#gate button.primary').click();
  await new Promise((r) => setTimeout(r, 700));
  window.__SW.setPlaying(false);
});
const out = await page.evaluate((time) => {
  window.__SW.seek(time);
  window.__SW.settle(6, 1 / 30);
  const app = window.__SW.app;
  const V = window.THREE_V ?? null;
  const dump = (obj) => {
    obj.updateWorldMatrix(true, false);
    const m = obj.matrixWorld.elements;
    return [+m[12].toFixed(1), +m[13].toFixed(1), +m[14].toFixed(1)];
  };
  const isd = app.stage.destroyer;
  const res = { destroyer: dump(isd.root), runner: dump(app.stage.runner.root), pod: dump(app.stage.pod.root) };
  for (const [k, v] of Object.entries(isd.anchors)) res[`isd:${k}`] = dump(v);
  for (const [k, v] of Object.entries(app.stage.runner.anchors ?? {})) res[`cr:${k}`] = dump(v);
  void V;
  return res;
}, t);
console.log(JSON.stringify(out, null, 1));
await browser.close();
