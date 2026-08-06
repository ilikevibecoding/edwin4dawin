/**
 * Sky isolation probe: captures the same view with the cirrus layer and the
 * cumulus layer independently disabled, so it is obvious which one is washing
 * the sky out.
 *
 *   node tools/skyprobe.mjs [day|sunset|night]
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const cond = process.argv[2] || 'day';
const out = 'test-results/sky';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });
await page.evaluate((c) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setCondition(c);
  window.__GAME.teleport(7, 40, 0.05, 0.62);
}, cond);
await page.evaluate(() => window.__GAME.advance(2, 1000 / 60, false));

// Sweep candidate zenith/horizon pairs so the gradient can be judged against
// the tone-mapped output rather than guessed at in isolation.
const sweeps = [
  ['a-current', null, null],
  ['b-deep', 0x2f6bb4, 0x9fbcd2],
  ['c-deeper', 0x1f57a4, 0x8fb2cc],
  ['d-rich', 0x2a63ae, 0xb6c9d6],
];
for (const [name, zenith, horizon] of sweeps) {
  await page.evaluate(([z, hz]) => {
    const w = window.__AEGIS.weather;
    w.skyMat.uniforms.uCloudStrength.value = 1;
    if (z !== null) w.skyMat.uniforms.uZenith.value.setHex(z);
    if (hz !== null) w.skyMat.uniforms.uHorizon.value.setHex(hz);
    window.__GAME.renderOnce();
  }, [zenith, horizon]);
  await page.screenshot({ path: `${out}/${cond}-${name}.png` });
  console.log('captured', name);
}
await browser.close();
