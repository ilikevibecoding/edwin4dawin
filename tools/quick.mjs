// Minimal fast probe: one or two viewpoints, optional JS expression to run
// first. Used for tight visual iteration.
//
//   node tools/quick.mjs out.png '["day",[-42,null,-18],[-52,3,-30]]'
import { chromium } from '@playwright/test';

const outPath = process.argv[2] || 'shots/quick.png';
const spec = JSON.parse(process.argv[3] || '["day",[-42,null,-18],[-52,3,-30]]');
const extra = process.argv[4] || '';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox', '--no-sandbox', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const issues = [];
page.on('pageerror', (e) => issues.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') issues.push(m.text());
});
await page.goto('http://127.0.0.1:5173/?test=1&seed=7777', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME, null, { timeout: 60000 });
await page.waitForTimeout(400);

const dbg = await page.evaluate(([spec, extra]) => {
  const G = window.__GAME;
  G.freezePlayer(true);
  G.configure({ condition: spec[0] });
  G.teleport(spec[1][0], spec[1][1], spec[1][2]);
  G.lookAt(spec[2][0], spec[2][1], spec[2][2]);
  G.sim(2);
  if (extra) eval(extra);
  G.render();
  return G.debugLight();
}, [spec, extra]);
console.log(JSON.stringify(dbg));
await page.screenshot({ path: outPath, timeout: 180000 });
if (issues.length) console.log('ISSUES', [...new Set(issues)].slice(0, 10));
await browser.close();
