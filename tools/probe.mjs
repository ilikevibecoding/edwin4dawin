#!/usr/bin/env node
/** Minimal load probe: reports console output and readiness for the main app. */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const BASE = process.argv[2] || 'http://127.0.0.1:5173';
const WAIT = Number(process.argv[3] || 60000);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--window-size=1280,720',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${e.stack}`));
page.on('requestfailed', (r) => console.log(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
const t0 = Date.now();
let ready = false;
while (Date.now() - t0 < WAIT) {
  ready = await page.evaluate(() => Boolean(window.__SW_READY));
  if (ready) break;
  const label = await page.evaluate(() => {
    const el = document.querySelector('.load-label');
    const pct = document.querySelector('.load-pct');
    const err = document.querySelector('#error-boundary');
    if (err && !err.classList.contains('hidden')) return 'ERROR PANEL: ' + err.textContent.slice(0, 900);
    return el ? `${el.textContent} ${pct ? pct.textContent : ''}` : 'no loader';
  });
  console.log(`... ${((Date.now() - t0) / 1000).toFixed(1)}s  ${label}`);
  await new Promise((r) => setTimeout(r, 3000));
}
console.log(ready ? `READY in ${((Date.now() - t0) / 1000).toFixed(1)}s` : 'NOT READY');
if (ready) {
  const info = await page.evaluate(() => {
    window.__SW.setPlaying(false);
    window.__SW.seek(9);
    window.__SW.settle(6);
    window.__SW.renderOnce();
    return window.__SW.inspect();
  });
  console.log(JSON.stringify(info, null, 2).slice(0, 2400));
}
await browser.close();
