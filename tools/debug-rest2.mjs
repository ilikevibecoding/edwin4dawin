import { startServer, launchBrowser, openApp } from './lib.mjs';

const { url, close } = await startServer();
const browser = await launchBrowser();
const page = await openApp(browser, url, { quality: 'low', width: 960, height: 540 });
await page.evaluate(() => { window.debugAPI.resetScene(); });

async function waitCond(name, fnBody, timeoutMs = 20000) {
  const t0 = Date.now();
  let polls = 0;
  while (Date.now() - t0 < timeoutMs) {
    const r = await page.evaluate(`(window.debugAPI.pumpFrame(), ({ ok: (${fnBody}), st: window.debugAPI.getStatusText(), state: window.debugAPI.getLightingState(), sim: window.debugAPI.getSimTime(), fade: window.debugAPI.getFadeOpacity() }))`);
    polls++;
    if (r.ok) {
      console.log(`${name}: OK after ${((Date.now() - t0) / 1000).toFixed(1)}s ${polls} polls  st='${r.st}' state=${r.state} sim=${r.sim.toFixed(1)} fade=${r.fade.toFixed(2)}`);
      return true;
    }
    await page.waitForTimeout(90);
  }
  const r = await page.evaluate(`({ st: window.debugAPI.getStatusText(), state: window.debugAPI.getLightingState(), sim: window.debugAPI.getSimTime(), fade: window.debugAPI.getFadeOpacity() })`);
  console.log(`${name}: TIMEOUT after ${timeoutMs / 1000}s ${polls} polls  st='${r.st}' state=${r.state} sim=${r.sim.toFixed(1)} fade=${r.fade.toFixed(2)}`);
  return false;
}

const yaw = Math.atan2(-(-1.02 - -0.3), -(7.6 - 7.2));
const pitch = Math.atan2(0.44 - 1.7, Math.hypot(-0.72, 0.4));
await page.evaluate(({ yaw, pitch }) => window.debugAPI.teleport(-0.3, 7.2, yaw, pitch), { yaw, pitch });
for (let i = 0; i < 3; i++) await page.evaluate(() => window.debugAPI.pumpFrame());
console.log('hover:', await page.evaluate(() => window.debugAPI.getHoveredId()));
await page.evaluate(() => window.debugAPI.markFadePeak());
const simAtE = await page.evaluate(() => window.debugAPI.getSimTime());
console.log('sim at E:', simAtE.toFixed(1));
await page.keyboard.press('KeyE');
await waitCond('st1', `window.debugAPI.getStatusText().includes('6 hours pass')`, 15000);
await waitCond('state1', `window.debugAPI.getLightingState() === 'restCycle'`, 10000);
await waitCond('faded', `window.debugAPI.getFadePeak() > 0.85`, 10000);
await waitCond('st2', `window.debugAPI.getStatusText().includes('Rested')`, 30000);
await waitCond('state2', `window.debugAPI.getLightingState() === 'cruising'`, 12000);
await waitCond('fadedBack', `window.debugAPI.getFadeOpacity() < 0.15`, 12000);
await browser.close();
await close();
