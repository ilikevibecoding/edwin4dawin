#!/usr/bin/env node
/** Capture all UI screens + weapon view-model states (Opus 4 evidence). */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const out = 'artifacts/shots/ui';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const shoot = async (name) => {
  await page.evaluate(() => window.advanceTime && window.advanceTime(150));
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot:', name);
};

await page.goto('http://127.0.0.1:5173/?test=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && !document.getElementById('boot-overlay'), null, { timeout: 45000 });
await shoot('01-title');
await page.getByRole('button', { name: 'Settings' }).click();
await shoot('02-settings');
await page.getByRole('button', { name: 'Back' }).click();
await page.getByRole('button', { name: 'Controls' }).click();
await shoot('03-controls');
await page.getByRole('button', { name: 'Back' }).click();
await page.getByRole('button', { name: 'Start Mission' }).click();
await shoot('04-difficulty');
await page.locator('.card', { hasText: 'OPERATOR' }).click();
await shoot('05-briefing');
await page.getByRole('button', { name: 'Continue to Loadout' }).click();
await shoot('06-loadout');
await page.getByRole('button', { name: 'Deploy' }).click();
await page.waitForTimeout(400);
await shoot('07-spawn');
// pause
await page.evaluate(() => window.__qa.setMode('paused'));
await shoot('08-pause');
await page.evaluate(() => window.__qa.setMode('playing'));
// viewmodel states
const qa = async (s) => page.evaluate(new Function('return ' + JSON.stringify(s))());
await page.evaluate(() => {
  window.__qa.teleport('lobby');
  window.__qa.freezeAI(true);
});
await page.evaluate(() => window.advanceTime(300));
// ADS
await page.evaluate(() => window.__qa.input.down('aim'));
await page.evaluate(() => window.advanceTime(500));
await shoot('10-ads-carbine');
await page.evaluate(() => window.__qa.input.up('aim'));
// reload mid-anim
await page.evaluate(() => {
  window.__qa.setAmmo(10, 60);
  window.__qa.input.down('reload');
});
await page.evaluate(() => window.advanceTime(80));
await page.evaluate(() => window.__qa.input.up('reload'));
await page.evaluate(() => window.advanceTime(900));
await shoot('11-reload-mid');
await page.evaluate(() => window.advanceTime(2500));
// pistol
await page.evaluate(() => window.__qa.input.down('slot2'));
await page.evaluate(() => window.advanceTime(60));
await page.evaluate(() => window.__qa.input.up('slot2'));
await page.evaluate(() => window.advanceTime(900));
await shoot('12-pistol');
// knife
await page.evaluate(() => window.__qa.input.down('slot3'));
await page.evaluate(() => window.advanceTime(60));
await page.evaluate(() => window.__qa.input.up('slot3'));
await page.evaluate(() => window.advanceTime(900));
await shoot('13-knife');
// shotgun via loadout give
await page.evaluate(() => window.__qa.giveWeapon('br8'));
await page.evaluate(() => window.advanceTime(700));
await shoot('14-shotgun');
// dmr ADS
await page.evaluate(() => window.__qa.giveWeapon('lr30'));
await page.evaluate(() => window.advanceTime(700));
await page.evaluate(() => window.__qa.input.down('aim'));
await page.evaluate(() => window.advanceTime(500));
await shoot('15-dmr-ads');
await page.evaluate(() => window.__qa.input.up('aim'));
// muzzle flash while firing
await page.evaluate(() => window.__qa.giveWeapon('vc7'));
await page.evaluate(() => window.advanceTime(700));
await page.evaluate(() => {
  window.__qa.aimAt(19, 1.5, 6.5);
  window.__qa.input.down('fire');
  window.advanceTime(70);
});
await shoot('16-firing');
await page.evaluate(() => {
  window.__qa.input.up('fire');
});

if (errors.length) {
  console.log('ERRORS:\n' + errors.slice(0, 8).join('\n'));
  process.exitCode = 2;
} else {
  console.log('no console errors');
}
await browser.close();
