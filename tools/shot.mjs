// Screenshot harness for the self-evaluation loop.
// Usage: node tools/shot.mjs [outdir] — captures a curated set of moments.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const OUT = process.argv[2] || 'shots/latest';
mkdirSync(OUT, { recursive: true });

const BASE = 'http://127.0.0.1:5173';

async function main() {
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--disable-gpu-vsync'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(`${BASE}/?test=1&seed=42`);
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 40000 });
  await page.waitForTimeout(600);

  const g = (fn, ...args) => page.evaluate(({ fn, args }) => window.__game[fn](...args), { fn, args });
  const snap = async (name, settleMs = 350) => {
    await page.waitForTimeout(settleMs);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('shot:', name);
  };

  // ---------- 1. day overview from the gate road
  await g('setTime', 'day');
  await g('deployBatteries');
  await g('step', 4); // let launchers elevate
  await g('flyCam', 26, 6, 118, -20, 10, -20);
  await g('step', 0.5);
  await snap('01_day_overview');

  // ---------- 2. patriot battery closeup
  await g('flyCam', -73, 2.4, -54, -58, 2.6, -40);
  await g('step', 0.2);
  await snap('02_patriot_closeup');

  // ---------- 3. thaad closeup
  await g('flyCam', 66, 2.2, 28, 52, 3.5, 42);
  await g('step', 0.2);
  await snap('03_thaad_closeup');

  // ---------- 4. sentinel closeup
  await g('flyCam', -34, 3, 44, -52, 6.5, 58);
  await g('step', 0.2);
  await snap('04_sentinel_closeup');

  // ---------- 5. command shelter interior + console
  await g('clearFlyCam');
  await g('teleport', -16.2, 0, 8, Math.PI / 2, -0.08);
  await g('step', 0.2);
  await snap('05_shelter_interior');

  // ---------- 6. console UI open with live scenario
  await g('enterConsole');
  await g('startScenario', 'single', 42);
  await g('step', 12);
  await snap('06_console_radar');
  await g('exitConsole');

  // ---------- 7. launch moment (assign+authorize, catch the plume)
  await g('selectBattery', 'thaad');
  await g('selectTrack');
  await g('assign');
  await g('flyCam', 38, 3, 26, 52, 9, 42);
  await g('authorize');
  await g('step', 1.4);
  await snap('07_launch_plume');

  // ---------- 8. interceptor in flight with trail
  await g('step', 2.5);
  let st = await g('state');
  console.log('mid-flight:', JSON.stringify({ birds: st.birds, threats: st.threats }));
  if (st.birdPositions.length) {
    const b = st.birdPositions[0];
    await g('flyCam', b.x - 120, Math.max(20, b.y - 60), b.z + 160, b.x, b.y, b.z);
  }
  await snap('08_intercept_flight');

  // ---------- 9. the intercept moment
  let prevThreats = st.threats;
  for (let i = 0; i < 120; i++) {
    st = await g('step', 0.35);
    if (st.birdPositions.length) {
      const b = st.birdPositions[0];
      const d = Math.hypot(b.x - b.tx, b.y - b.ty, b.z - b.tz);
      if (d < 320) {
        await g('flyCam', b.tx - 260, Math.max(30, b.ty - 60), b.tz + 320, b.tx, b.ty, b.tz);
      }
    }
    if (st.threats < prevThreats || st.birds === 0) break;
  }
  await g('step', 0.12);
  await snap('09_intercept_moment', 200);

  // ---------- 10. resolution + summary
  await g('autoEngage', true);
  for (let i = 0; i < 20; i++) {
    st = await g('step', 5);
    if (st.summaryOpen) break;
  }
  await snap('10_summary');

  // ---------- 11. sunset mood
  await page.evaluate(() => {
    const G = window.__game;
    G.closeSummary();
    G.exitConsole();
    G.setTime('sunset');
    G.flyCam(70, 4, 90, -40, 14, -30);
    G.step(1);
  });
  await snap('11_sunset_mood');

  // ---------- 12. night base wide with searchlights
  await page.evaluate(() => {
    const G = window.__game;
    G.setTime('night');
    G.step(1);
    G.flyCam(120, 20, 130, 0, 30, 0);
  });
  await snap('12_night_base');

  // ---------- 13/14. night raid engagement
  await page.evaluate(() => {
    const G = window.__game;
    G.startScenario('nightraid', 77);
    G.autoEngage(true);
    G.step(14);
    G.flyCam(30, 4, 110, 0, 900, -2400);
  });
  await snap('13_night_raid_sky');

  await page.evaluate(() => {
    const G = window.__game;
    G.step(9);
    const s = G.state();
    if (s.birdPositions.length) {
      const b = s.birdPositions[0];
      G.flyCam(b.x - 90, Math.max(24, b.y - 40), b.z + 120, b.x, b.y, b.z);
    }
  });
  await snap('14_night_engagement');

  const perf = await page.evaluate(() => {
    const s = window.__game.state();
    return { drawCalls: s.drawCalls, triangles: s.triangles, fps: s.fps };
  });
  console.log('PERF:', JSON.stringify(perf));
  if (errors.length) {
    console.log('ERRORS:');
    for (const e of errors.slice(0, 12)) console.log(' ', e);
  } else {
    console.log('No console errors.');
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
