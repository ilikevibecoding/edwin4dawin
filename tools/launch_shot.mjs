// Screenshot a specific battery's launch: node tools/launch_shot.mjs <battery> <out> <cx,cy,cz> <lx,ly,lz> [delay]
import { chromium } from '@playwright/test';
const [bat, out, camS, lookS, delayS] = process.argv.slice(2);
const cam = camS.split(',').map(Number), look = lookS.split(',').map(Number);
const delay = Number(delayS || 1.2);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://127.0.0.1:5173/?test=1&seed=42');
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 40000 });
const res = await page.evaluate(({ bat, cam, look, delay }) => {
  const g = window.__game;
  g.startScenario('single', 42);
  g.step(6); // battery deploy + track established
  g.selectBattery(bat);
  g.selectTrack();
  const okA = g.assign();
  // wait for READY if still cycling
  let st = g.state();
  let guard = 40;
  while (guard-- > 0 && !st.batteries.find(b => b.id === bat && b.state === 'READY')) st = g.step(0.5);
  const okF = g.authorize();
  g.step(delay);
  g.flyCam(cam[0], cam[1], cam[2], look[0], look[1], look[2]);
  g.step(0.12);
  return { okA, okF, birds: g.state().birds, states: g.state().batteries.map(b => b.id + ':' + b.state) };
}, { bat, cam, look, delay });
console.log(JSON.stringify(res));
await page.waitForTimeout(400);
await page.screenshot({ path: out });
console.log('saved', out);
await browser.close();
