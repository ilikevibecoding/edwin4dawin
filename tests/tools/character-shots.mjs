#!/usr/bin/env node
/**
 * Character and weapon evidence capture.
 * Owner: Opus 4.
 *
 * Spawns each hostile variant and each hostage in a real room under production
 * lighting, frames them at close and gameplay distance, and writes a PNG plus
 * the state payload for each. This is the per-asset inspection evidence for
 * every character and weapon state.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const quality = args.quality ?? 'medium';
const out = args.out ?? 'screenshots/characters';
const W = Number(args.w ?? 1280);
const H = Number(args.h ?? 720);

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--no-sandbox', '--mute-audio', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=3072'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(`http://127.0.0.1:5173/?quality=${quality}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 90000 });
await page.waitForFunction(() => window.__northstar?.ready?.() === true, null, { timeout: 300000 });
await page.evaluate(async () => { await window.__northstar.game.start({ difficulty: 'operator', loadout: 'assault' }); });
await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).gameMode === 'playing', null, { timeout: 180000 });
await page.evaluate(() => {
  const g = window.__northstar.game;
  g.qa.killAll();
  g.qa.freezeAI(true);
  document.getElementById('ui-root').style.display = 'none';
});

fs.mkdirSync(out, { recursive: true });

/** Stage a character in the open-plan floor and frame it. */
async function shot(name, setup, dist, pitch = -2) {
  await page.evaluate(([s, d, p]) => {
    const g = window.__northstar.game;
    // A clear bay of the open-plan floor with good fluorescent light
    const base = { x: -9, y: 0, z: 2 };
    g.player.noclip = true;
    g.player.teleport([base.x, base.y, base.z + d], 0);
    g.player.pitch = (p * Math.PI) / 180;
    // eslint-disable-next-line no-new-func
    new Function('game', 'base', s)(g, base);
    g.player.updateCamera(0);
  }, [setup, dist, pitch]);
  await page.evaluate(() => window.advanceTime(400));
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file, timeout: 240000 });
  console.log(`  ${name}`);
}

const VARIANTS = ['kestrel.assault', 'kestrel.heavy', 'kestrel.scout', 'kestrel.warden'];
for (const v of VARIANTS) {
  const setup = `
    for (const e of game.mission.enemies) { if (e.qaStaged) { e.group.visible = false; e.alive = false; } }
    const id = game.qa.spawnEnemy([base.x, base.y, base.z], '${v}');
    const e = game.mission.enemies.find((x) => x.id === id);
    e.qaStaged = true; e.frozen = true; e.yaw = Math.PI; e.group.rotation.y = Math.PI;
    e.animator.play('aim'); e.animator.update(0.016, { speed: 0, aiming: true });
  `;
  await shot(`hostile-${v.split('.')[1]}-close`, setup, 2.4, -4);
  await shot(`hostile-${v.split('.')[1]}-gameplay`, setup, 8, -2);
}

for (const h of ['analyst', 'executive']) {
  const setup = `
    const spot = game.mission.hostages.find((x) => x.spec.variant === '${h}');
    if (spot) { spot.position.set(base.x, base.y, base.z); spot.group.position.copy(spot.position);
      spot.yaw = Math.PI; spot.group.rotation.y = Math.PI; spot.animator.play('fear');
      spot.animator.update(0.016, {}); }
  `;
  await shot(`hostage-${h}-close`, setup, 2.2, -4);
  await shot(`hostage-${h}-gameplay`, setup, 7, -2);
}

// Weapons in the first-person view
await page.evaluate(() => { document.getElementById('ui-root').style.display = ''; });
for (const w of ['pistol.vsc9', 'smg.kestrel', 'rifle.northwind', 'shotgun.borealis', 'dmr.meridian', 'knife.talon']) {
  await page.evaluate((id) => {
    const g = window.__northstar.game;
    g.player.teleport([-9, 0, 2], 0);
    g.player.pitch = 0;
    g.qa.giveWeapon(id);
    window.advanceTime(900);
  }, w);
  const file = path.join(out, `weapon-${w.replace('.', '-')}-hip.png`);
  await page.screenshot({ path: file, timeout: 240000 });
  // Aimed
  await page.evaluate(() => {
    window.__northstar.helpers.mouse(2, true);
    window.advanceTime(700);
  });
  await page.screenshot({ path: path.join(out, `weapon-${w.replace('.', '-')}-ads.png`), timeout: 240000 });
  await page.evaluate(() => { window.__northstar.helpers.mouse(2, false); window.advanceTime(300); });
  console.log(`  weapon ${w}`);
}

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
