// probe_console.mjs — console/command-room specialist screenshot probe.
// Usage: node tools/probe_console.mjs <loopLabel> [set]
//   set: all | seat | walk | close  (default all)
import { chromium } from '@playwright/test';
import fs from 'fs';

const loop = process.argv[2] || 'loop0';
const which = process.argv[3] || 'all';
const outDir = 'shots_console';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });

await page.goto('http://localhost:4184', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); window.__game.seed(7); });
// hide DOM HUD so we judge the 3D room, not the overlay
await page.addStyleTag({ content: '#hud, #console-panel { display: none !important; }' });

page.setDefaultTimeout(120000);
const step = (f, dt = 33.34) => page.evaluate(([n, d]) => window.__game.step(n, d), [f, dt]);
const shot = async (name) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.screenshot({ path: `${outDir}/${loop}_${name}.png`, timeout: 120000 });
      console.log('shot', `${loop}_${name}.png`);
      return;
    } catch (e) {
      console.log('shot retry', name, e.message.split('\n')[0]);
    }
  }
  console.log('shot FAILED', name);
};
const perf = async (tag) => {
  const p = await page.evaluate(() => window.__game.perf());
  console.log(`PERF[${tag}]`, JSON.stringify(p));
};
// free camera: teleport player (disabled) so eye lands at (x,y,z), then aim at target
const camTo = async (x, y, z, tx, ty, tz) => {
  await page.evaluate(([a, b]) => {
    const g = window.__game;
    g.closeConsole();
    g.ctx.player.setEnabled(false);
    g.teleport(a[0], a[1] - 1.7, a[2], 0, 0);
    g.lookAt(b[0], b[1], b[2]);
  }, [[x, y, z], [tx, ty, tz]]);
  await step(2, 33.34);
};

const SEAT = which === 'all' || which === 'seat';
const WALK = which === 'all' || which === 'walk';
const CLOSE = which === 'all' || which === 'close';
const POSE = which === 'pose';

// ---------- live scenario so screens/holo have tracks ----------
await page.evaluate(() => { window.__game.start('saturation'); window.__game.autoplay(true); });
await step(300); // ~10 s: several tracks detected, engagements underway

if (POSE) {
  // c = consolePos = (-33.2, 0, -19). candidates for a better consoleView.
  await page.evaluate(() => window.__game.openConsole());
  await step(40);
  await shot('pose_current');
  await camTo(-33.2 + 1.95, 1.78, -19 + 2.7, -33.2 + 1.45, 1.18, -19 - 1.1);
  await shot('pose_p2');
  await camTo(-33.2 + 1.8, 1.7, -19 + 2.45, -33.2 + 1.3, 1.15, -19 - 1.2);
  await shot('pose_p3');
  // p4: intermediate — closer than current, holo disc still fully framed
  await camTo(-33.2 + 2.05, 1.84, -19 + 2.95, -33.2 + 1.7, 1.18, -19 - 1.0);
  await shot('pose_p4');
}

if (SEAT) {
  await page.evaluate(() => window.__game.openConsole());
  await step(40);
  await shot('seat_day');
  await perf('seat_day');
  await page.evaluate(() => window.__game.setTimeOfDay('night'));
  await step(100); // full blend
  await shot('seat_night');
  await perf('seat_night');
  await page.evaluate(() => window.__game.setTimeOfDay('day'));
  await step(100);
}

if (CLOSE) {
  // PPI screen close-up (screen center ~(-33.2, 1.62, -20.55))
  await camTo(-33.2, 1.55, -19.35, -33.2, 1.5, -20.6);
  await shot('close_ppi');
  // console panel three-quarter view
  await camTo(-31.6, 1.7, -18.6, -33.6, 1.15, -20.6);
  await shot('close_panel');
  // holo table (table at (-29.6, 0.95, -18.6))
  await camTo(-30.9, 1.75, -17.2, -29.6, 0.95, -18.6);
  await shot('close_holo');
  await perf('close_holo');
  // night close-ups
  await page.evaluate(() => window.__game.setTimeOfDay('night'));
  await step(100);
  await camTo(-31.6, 1.7, -18.6, -33.6, 1.15, -20.6);
  await shot('close_panel_night');
  await camTo(-30.9, 1.75, -17.2, -29.6, 0.95, -18.6);
  await shot('close_holo_night');
  await page.evaluate(() => window.__game.setTimeOfDay('day'));
  await step(100);
}

if (WALK) {
  // re-enable player for walk-in shots (eye height fixed 1.7)
  await page.evaluate(() => {
    const g = window.__game;
    g.closeConsole();
    g.ctx.player.setEnabled(true);
  });
  // outside the door looking in (door at x=-30.4, z=-15 face)
  await page.evaluate(() => { const g = window.__game; g.teleport(-30.4, 0, -12.2, 0, 0); g.lookAt(-31.5, 1.35, -19); });
  await step(2);
  await shot('walk_door_day');
  // just inside, looking toward console corner
  await page.evaluate(() => { const g = window.__game; g.teleport(-30.4, 0, -16.2, 0, 0); g.lookAt(-34.2, 1.2, -20.2); });
  await step(2);
  await shot('walk_in_console_day');
  // from console corner looking back toward door + holo
  await page.evaluate(() => { const g = window.__game; g.teleport(-35.2, 0, -19.6, 0, 0); g.lookAt(-29.5, 1.3, -15.6); });
  await step(2);
  await shot('walk_back_day');
  await perf('walk_back_day');
  // night versions
  await page.evaluate(() => window.__game.setTimeOfDay('night'));
  await step(100);
  await page.evaluate(() => { const g = window.__game; g.teleport(-30.4, 0, -16.2, 0, 0); g.lookAt(-34.2, 1.2, -20.2); });
  await step(2);
  await shot('walk_in_console_night');
  await page.evaluate(() => { const g = window.__game; g.teleport(-35.2, 0, -19.6, 0, 0); g.lookAt(-29.5, 1.3, -15.6); });
  await step(2);
  await shot('walk_back_night');
}

await browser.close();
console.log('done');
