#!/usr/bin/env node
/**
 * Screenshot matrix capture.
 * Owner: Opus 4.
 *
 * Boots the game once and walks a list of named viewpoints, writing a PNG and
 * the matching render_game_to_text() payload for each. This is the evidence
 * generator for the room-by-room audit and the before/after index.
 *
 *   node tests/tools/capture-matrix.mjs --quality=high --out=screenshots/rooms --tag=pass1
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const quality = args.quality ?? 'high';
const outDir = args.out ?? 'screenshots/rooms';
const W = Number(args.w ?? 1600);
const H = Number(args.h ?? 900);
const only = args.only ? String(args.only).split(',') : null;

/** [name, position, yawDeg, pitchDeg] — hand-composed reviewer viewpoints. */
export const VIEWPOINTS = [
  ['courtyard-approach', [0, 0, -29], 0, -2],
  ['courtyard-wide', [-13, 0, -27], 32, 0],
  ['entrance-canopy', [0, 0, -22.6], 0, 4],
  ['vestibule', [0, 0, -18.4], 0, 0],
  ['lobby-from-vestibule', [0, 0, -15.6], 0, -2],
  ['lobby-wide-west', [6, 0, -11.5], 55, -3],
  ['lobby-wide-east', [-6, 0, -11.5], -55, -3],
  ['lobby-curtainwall', [0, 0, -11], 180, 6],
  ['lobby-reception-desk', [-6.5, 0, -12.5], -25, -6],
  ['waiting-area', [16.5, 0, -13.5], -120, -4],
  ['northcorr-long-west', [21, 0, -7], 88, 0],
  ['northcorr-long-east', [-21, 0, -7], -88, 0],
  ['openplan-north', [-9, 0, -3.5], 178, -4],
  ['openplan-centre', [-9, 0, 5], 200, -3],
  ['openplan-south', [-9, 0, 13], 0, -2],
  ['openplan-west-bay', [-18, 0, 8], -70, -3],
  ['conference-inside', [10, 0, 0.5], -20, -3],
  ['conference-hostage', [5, 0, -1.2], -80, -4],
  ['breakroom', [17, 0, 0.5], 0, -4],
  ['copy-room', [6, 0, 7], 0, -6],
  ['restroom', [12.7, 0, 7.5], 0, -4],
  ['janitor', [18.5, 0, 7.5], 0, -6],
  ['midcorr', [4, 0, 10], -90, 0],
  ['server-room', [12, 0, 13.2], -90, -2],
  ['it-workspace', [-28, 0, 7], 0, -4],
  ['archive', [-28, 0, -6.5], 178, -3],
  ['mechanical', [-26.5, 0, -16], 178, 0],
  ['westcorr-glazed', [-22.5, 0, 16], 0, -2],
  ['southcorr', [-18, 0, 16.5], -90, 0],
  ['eastcorr', [22.5, 0, 15], 0, 0],
  ['spine-north', [0, 0, 12], 0, -2],
  ['spine-south', [0, 0, -3], 180, -2],
  ['stairwell-bottom', [3.2, 0, 12.4], -90, 12],
  ['loading-dock', [28, 0, -5], 178, -3],
  ['garage-extraction', [27, 0, 8], 178, -3],
  ['garage-shutter', [27.5, 0, 15], 90, 2],
  ['firestair', [-18, 0, -1], 0, 14],
  ['mezzanine', [-4, 4.2, -11], 0, -8],
  ['mezzanine-over-lobby', [2, 4.2, -12.4], 180, -14],
  ['execcorr-west', [16, 4.2, -7], 90, 0],
  ['execcorr-east', [-16, 4.2, -7], -90, 0],
  ['exec-anteroom', [12, 4.2, -1.5], 178, -4],
  ['exec-office', [8, 4.2, 6], -70, -3],
  ['exec-hostage', [13, 4.2, 7], -70, -4],
  ['boardroom', [-9, 4.2, 0], 178, -3],
  ['records-upper', [-12, 4.2, 10], 178, -3],
  ['exec-gallery', [11, 4.2, 10.7], 90, -2],
  ['exec-lounge', [15.5, 4.2, 13.2], 178, -3],
  ['landing-upper', [3.2, 4.2, 13.2], 90, -10],
  ['eastyard', [36, 0, 12], -90, -2],
];

const browser = await chromium.launch({
  args: [
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--no-sandbox', '--mute-audio', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=3072',
  ],
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
if (args.freeze !== 'false') await page.evaluate(() => window.__northstar.qa.freezeAI(true));
if (args.nohud) await page.evaluate(() => { document.getElementById('ui-root').style.display = 'none'; });

fs.mkdirSync(outDir, { recursive: true });
const index = [];
for (const [name, pos, yaw, pitch] of VIEWPOINTS) {
  if (only && !only.some((o) => name.includes(o))) continue;
  await page.evaluate(([p, y, pi]) => {
    const g = window.__northstar.game;
    g.player.noclip = true;
    g.player.teleport(p, y);
    g.player.pitch = (pi * Math.PI) / 180;
    g.player.updateCamera(0);
  }, [pos, yaw, pitch]);
  await page.evaluate(() => window.advanceTime(200));
  const file = path.join(outDir, `${name}${args.tag ? `-${args.tag}` : ''}.png`);
  const t = Date.now();
  await page.screenshot({ path: file, timeout: 180000 });
  const s = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  fs.writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify({
    view: name, pos, yaw, pitch, room: s.player.room, render: s.render,
  }, null, 2));
  index.push({ name, file, room: s.player.room, drawCalls: s.render.drawCalls, triangles: s.render.triangles, ms: Date.now() - t });
  console.log(`${name.padEnd(26)} ${String(s.player.room).padEnd(14)} calls=${String(s.render.drawCalls).padStart(4)} tris=${String(s.render.triangles).padStart(7)} ${Date.now() - t}ms`);
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ quality, W, H, errors, views: index }, null, 2));
console.log(`\n${index.length} views captured -> ${outDir}`);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
