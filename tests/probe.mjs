// Evaluates an expression in a booted game page and prints the result. No
// rendering, so it answers "where is this thing actually standing?" in seconds
// rather than the minutes a screenshot costs under software rasterisation.
//
//   node tests/probe.mjs "expr" [--setup='...']
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const expr = args.find((a) => !a.startsWith('--')) ?? '1';
const setup = (args.find((a) => a.startsWith('--setup=')) ?? '--setup=').slice(8);

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 200, height: 150 } });
const logs = [];
page.on('pageerror', (err) => logs.push(err.message));
await page.goto('http://127.0.0.1:5173/?quality=low', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__gameReady === true, { timeout: 120000 });
await page.evaluate(() => {
  window.game.begin();
  window.game.hud.setVisible(false);
});
if (setup) await page.evaluate(setup);
await page.evaluate(() => {
  for (let i = 0; i < 40; i++) window.engine.onFixedUpdate(1 / 60);
  window.engine.onRender(1 / 60);
});
console.log(JSON.stringify({ result: await page.evaluate(expr), logs }, null, 2));
await browser.close();
