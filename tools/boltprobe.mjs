#!/usr/bin/env node
/**
 * Turbolaser probe.
 *
 * Plays the pursuit forward a step at a time and reports how many bolts are
 * alive, how many turrets are off cooldown and where the ships are. Used to
 * find out why an exchange of fire is not reaching the frame.
 *
 * Usage: node tools/boltprobe.mjs [startTime] [seconds]
 */
import puppeteer from 'puppeteer-core';

const START = Number(process.argv[2] ?? 148);
const SPAN = Number(process.argv[3] ?? 4);

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--window-size=640,360',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async () => {
  document.querySelector('#gate button.primary').click();
  await new Promise((r) => setTimeout(r, 700));
  window.__SW.setPlaying(false);
  window.__SW.hideUi(true);
});

const rows = await page.evaluate(
  ({ start, span }) => {
    const out = [];
    window.__SW.seek(start);
    const app = window.__SW.app;
    const steps = Math.round(span / (1 / 30));
    for (let i = 0; i < steps; i++) {
      window.__SW.run(1 / 30, 1 / 30);
      const d = app.stage.destroyer;
      out.push({
        t: +window.__SW.time().toFixed(2),
        bolts: app.stage.fx.liveCounts.bolts,
        sparks: app.stage.fx.liveCounts.sparks,
        ready: d.turrets.filter((x) => x.cooldown <= 0).length,
        cool: d.turrets.map((x) => +x.cooldown.toFixed(2)),
      });
    }
    return out;
  },
  { start: START, span: SPAN },
);
for (const r of rows) console.log(JSON.stringify(r));
await browser.close();
