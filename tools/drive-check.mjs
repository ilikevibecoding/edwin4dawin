#!/usr/bin/env node
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:5173/?quality=fast';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 120000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error(err);
  await browser.close();
  process.exit(1);
}

await page.evaluate(() => window.debugAPI.resume());

async function holdStep(code, seconds) {
  await page.evaluate((c) => window.debugAPI.keys.add(c), code);
  await page.evaluate((s) => window.debugAPI.step(s), seconds);
  await page.evaluate((c) => window.debugAPI.keys.delete(c), code);
}

function fail(msg, extra) {
  console.error('DRIVE FAIL:', msg, extra ? JSON.stringify(extra, null, 2) : '');
  return false;
}

await page.evaluate(() => window.debugAPI.setLook(Math.PI, 0));
const walk0 = await page.evaluate(() => window.debugAPI.playerState());
await holdStep('KeyW', 0.5);
const walkW = await page.evaluate(() => window.debugAPI.playerState());
const look = walk0.look;
const walkDot = (walkW.x - walk0.x) * look.x + (walkW.z - walk0.z) * look.z;

await page.evaluate(() => window.debugAPI.fire('door'));
await page.waitForTimeout(700);
const sat = await page.evaluate(() => window.debugAPI.playerState());
const d0 = await page.evaluate(() => window.debugAPI.driveState());
await holdStep('KeyW', 0.8);
const dW = await page.evaluate(() => window.debugAPI.driveState());
await holdStep('KeyS', 1.0);
const dS = await page.evaluate(() => window.debugAPI.driveState());

await holdStep('KeyW', 0.55);
await page.evaluate(() => window.debugAPI.keys.add('KeyW'));
await page.evaluate(() => window.debugAPI.keys.add('KeyA'));
await page.evaluate(() => window.debugAPI.step(1.0));
const dA = await page.evaluate(() => window.debugAPI.driveState());
await page.evaluate(() => {
  window.debugAPI.keys.delete('KeyW');
  window.debugAPI.keys.delete('KeyA');
});

await page.evaluate(() => window.debugAPI.fire('door'));
await page.waitForTimeout(700);
const after = await page.evaluate(() => window.debugAPI.playerState());
const dExit = await page.evaluate(() => window.debugAPI.driveState());

const report = {
  walk: { from: { x: walk0.x, z: walk0.z }, to: { x: walkW.x, z: walkW.z }, look, walkDot },
  sit: { seated: sat.seated, camMode: sat.camMode },
  driveW: { z0: d0.z, z1: dW.z, speed: dW.speed, mph: dW.mph, enabled: dW.enabled },
  driveS: { z: dS.z, speed: dS.speed },
  steerA: { heading: dA.heading, steer: dA.steer, speed: dA.speed },
  exit: { seated: after.seated, enabled: dExit.enabled, x: after.x, z: after.z, jeep: { x: dExit.x, z: dExit.z } },
};
console.log(JSON.stringify(report, null, 2));

let ok = true;
if (walkDot <= 0.8) ok = fail('W on foot did not move along look', report.walk);
if (!sat.seated) ok = fail('climb-in did not seat', report.sit);
if (!dW.enabled) ok = fail('drive was not enabled in the seat', report.driveW);
if (!(dW.z > d0.z + 1.5) || !(dW.speed > 3)) ok = fail('W did not drive the Jeep forward', report.driveW);
if (!(dS.speed < dW.speed - 2)) ok = fail('S did not slow / reverse the Jeep', report.driveS);
if (!(dA.heading < -0.2)) ok = fail('A did not steer left', report.steerA);
if (after.seated) ok = fail('climb-out left the player seated', report.exit);
if (dExit.enabled) ok = fail('drive stayed enabled after climb-out', report.exit);
if (Math.hypot(after.x - dExit.x, after.z - dExit.z) > 3.2) ok = fail('exit was not beside the Jeep', report.exit);

await browser.close();
if (!ok) process.exit(1);
console.log('DRIVE OK');
