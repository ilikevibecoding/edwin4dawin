// Measure draw-call delta of fable3b props: runs each view with and without
// the f3b decorators (window.__f3bOff kill-switch, TEMP QA guard).
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const VIEWS = [
  ['copy_mail', 270, 5], ['north_corridor', 270, 2], ['north_corridor_e', 90, 2],
  ['service_corridor', 270, 2], ['lobby', 0, 8], ['break_room', 270, 4],
  ['archive', 0, 5], ['garage', 270, 4], ['mech_room', 0, 6], ['stairwell_top', 0, 5],
];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function runPass(off) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.setDefaultTimeout(90000);
  await page.addInitScript(`window.__f3bOff = ${off};`);
  await page.goto(BASE + '/?test=1&qa=1', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(`(async () => {
    const qa = window.__qa;
    qa.startMission({ difficulty: 'operator' });
    for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 100)); if (qa.state().mode === 'playing') break; }
    qa.freezeAI(true); qa.god(true);
  })()`);
  const out = {};
  for (const [cp, yaw, pitch] of VIEWS) {
    const perf = await page.evaluate(`(async () => {
      const qa = window.__qa;
      qa.teleport('${cp}'); qa.lookYawPitch(${yaw}, ${pitch});
      window.advanceTime(300); window.advanceTime(17);
      return qa.perf();
    })()`);
    out[cp] = perf.drawCalls;
  }
  await page.close();
  return out;
}

const withProps = await runPass(false);
const withoutProps = await runPass(true);
console.log('view'.padEnd(18), 'with', 'without', 'f3b-delta');
for (const [cp] of VIEWS) {
  console.log(cp.padEnd(18), String(withProps[cp]).padEnd(5), String(withoutProps[cp]).padEnd(7), withProps[cp] - withoutProps[cp]);
}
await browser.close();
