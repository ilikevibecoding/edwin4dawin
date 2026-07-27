#!/usr/bin/env node
/** Verifies the player-bullet -> enemy damage pipeline headlessly. */
import puppeteer from 'puppeteer-core';

const url = 'http://localhost:5173/?pose=spawn&enemyat=0,33&enemystate=combat&t=2&hud=0';
const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=960,540'],
  defaultViewport: { width: 960, height: 540 },
  protocolTimeout: 300000,
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__SHOT_READY__ === true', { timeout: 240000, polling: 250 });

const result = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const e = g.ai.enemies[0];
  if (!e) return { error: 'no enemy' };
  const before = e.health;

  // aim exactly at the enemy chest, then simulate 5 aimed shots with recoil
  // compensation (like a real player would)
  const out = { before, shots: [], hits: 0 };
  for (let i = 0; i < 5; i++) {
    const eye = g.player.eyePos();
    const chest = e.position.clone(); chest.y += 1.25;
    const dir = chest.sub(eye).normalize();
    g.player.yaw = Math.atan2(-dir.x, -dir.z);
    g.player.pitch = Math.asin(dir.y);
    g.player.syncCamera(0);
    const h = g.weapons.slot.mag;
    g.weapons.cooldown = 0;
    g.weapons.fire();
    out.shots.push({ mag: g.weapons.slot.mag, enemyHealth: e.health });
  }
  out.after = e.health;
  out.alive = e.alive;
  return out;
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
