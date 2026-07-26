#!/usr/bin/env node
/**
 * Fast standalone probe used during development.
 * Owner: Opus 4.
 *
 * Boots the game in headless Chromium, waits for the level, optionally enters
 * gameplay, then dumps the QA report and a screenshot. Much quicker to iterate
 * with than the full Playwright matrix.
 *
 *   node tests/tools/probe.mjs [--quality=low] [--play] [--at=lobby] [--shot=out.png]
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const quality = args.quality ?? 'medium';
const url = `http://127.0.0.1:5173/?quality=${quality}${args.qa ? '&qa=1' : ''}`;

const browser = await chromium.launch({
  args: [
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--no-sandbox', '--mute-audio', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=3072',
  ],
});
const page = await browser.newPage({ viewport: { width: Number(args.w ?? 1280), height: Number(args.h ?? 720) } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('crash', () => errors.push('PAGE CRASHED'));

console.log(`> ${url}`);
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 60000 });
console.log(`  hooks ready in ${Date.now() - t0} ms`);
await page.waitForFunction(() => window.__northstar?.ready?.() === true, null, { timeout: 240000 });
console.log(`  level ready in ${Date.now() - t0} ms`);

const report = await page.evaluate(() => window.__northstar.qa.report());
console.log(JSON.stringify({
  buildMs: report.level.buildMs,
  timings: report.level.timings,
  batches: report.level.batches,
  triangles: report.level.trianglesByGroup,
  collision: report.collision,
  nav: { active: report.nav.active, buildMs: report.nav.buildMs, missing: report.nav.roomsWithoutNav },
  manifest: report.manifest,
}, null, 2));

if (args.play) {
  await page.evaluate(async () => { await window.__northstar.game.start({ difficulty: 'operator', loadout: 'assault' }); });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).gameMode === 'playing', null, { timeout: 120000 });
  console.log(`  gameplay in ${Date.now() - t0} ms`);
  if (args.at) await page.evaluate((c) => window.__northstar.qa.teleport(c), args.at);
  await page.evaluate(() => window.advanceTime(600));
  const s = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log(JSON.stringify({
    room: s.player.room, pos: s.player.position, render: s.render,
    weapon: s.weapon.activeWeapon, mag: s.weapon.magazine,
    enemies: s.mission.enemies.alive, hostages: s.mission.hostages.map((h) => h.state),
  }, null, 2));
  const tShot = Date.now();
  await page.screenshot({ path: args.shot ?? 'screenshots/probe.png', timeout: 120000 });
  console.log(`  screenshot in ${Date.now() - tShot} ms -> ${args.shot ?? 'screenshots/probe.png'}`);
}

const mem = await page.evaluate(() => (performance.memory ? {
  usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
  limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
} : null));
console.log('memory', mem);
console.log('errors', errors.length ? errors : 'none');
fs.mkdirSync('test-results/reports', { recursive: true });
fs.writeFileSync('test-results/reports/probe.json', JSON.stringify({ report, errors, mem }, null, 2));
await browser.close();
