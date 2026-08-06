// Verify the production bundle boots and plays, not just the dev server.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox','--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:4173/?test=1&seed=42', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const G = window.__GAME;
  G.freezePlayer(true);
  G.configure({ scenario: 'single', condition: 'day' });
  G.start();
  G.autoPlay(90);
  return G.state();
});
console.log('build boots:', JSON.stringify({ state: r.state, threats: r.threatStats, rounds: r.roundStats, results: r.results.map(x => x.result) }));
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
await browser.close();
