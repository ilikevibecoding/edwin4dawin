// Single-screenshot helper for quick visual verification.
// Usage:
//   node tools/spot.mjs out.png --cam=x,y,z --look=x,y,z [--time=day|sunset|night]
//     [--scenario=single|saturation|nightraid] [--seed=42] [--steps=12] [--hidehud]
//     [--deploy] [--auto] [--fps] [--size=1600x900]
// The dev server must already be running on 127.0.0.1:5173.
import { chromium } from '@playwright/test';

const out = process.argv[2] || 'shots/spot.png';
const args = Object.fromEntries(
  process.argv.slice(3).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const vec = (s, dflt) => (s ? s.split(',').map(Number) : dflt);
const cam = vec(args.cam, [30, 6, 110]);
const look = vec(args.look, [0, 8, 0]);
const [W, H] = (args.size || '1600x900').split('x').map(Number);

async function main() {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto(`http://127.0.0.1:5173/?test=1&seed=${args.seed || 42}`);
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 40000 });
  await page.waitForTimeout(400);

  await page.evaluate(({ args, cam, look }) => {
    const g = window.__game;
    if (args.time) g.setTime(args.time);
    if (args.deploy) { g.deployBatteries(); g.step(4); }
    if (args.scenario) g.startScenario(args.scenario, Number(args.seed || 42));
    if (args.auto) g.autoEngage(true);
    if (args.steps) g.step(Number(args.steps));
    if (args.hidehud) g.hideHud(true);
    g.flyCam(cam[0], cam[1], cam[2], look[0], look[1], look[2]);
    g.step(0.3);
  }, { args, cam, look });

  await page.waitForTimeout(450);
  await page.screenshot({ path: out });
  if (args.fps) {
    const st = await page.evaluate(() => window.__game.state());
    console.log('perf:', JSON.stringify({ drawCalls: st.drawCalls, triangles: st.triangles }));
  }
  console.log('saved', out);
  if (errors.length) console.log('ERRORS:\n' + errors.slice(0, 8).join('\n'));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
