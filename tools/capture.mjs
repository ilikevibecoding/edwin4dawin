// Deterministic capture harness used by the self-evaluation loop.
// Simulation is fast-forwarded without drawing; frames are only rendered
// immediately before each screenshot (software rasteriser here has no GPU).
//
// Usage: node tools/capture.mjs [--out dir] [--seed n] [--quality high] [--only name]

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const OUT = path.resolve(arg('out', 'shots'));
const SEED = arg('seed', '20260805');
const QUALITY = arg('quality', 'high');
const ONLY = arg('only', null);
const BASE = arg('base', 'http://127.0.0.1:5173');
const W = Number(arg('w', 1600));
const H = Number(arg('h', 900));
const SKIP_PERF = argv.includes('--no-perf');

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-gpu-vsync',
    '--mute-audio',
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

const problems = [];
page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error' || t === 'warning') {
    const text = msg.text();
    if (/favicon|willReadFrequently|\[vite\]/i.test(text)) return;
    problems.push(`[${t}] ${text}`);
  }
});
page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}\n${(err.stack || '').split('\n').slice(0, 6).join('\n')}`));
page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

const url = `${BASE}/?test=1&seed=${SEED}&quality=${QUALITY}`;
console.log(`> loading ${url}`);
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });
console.log(`> ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const report = { seed: SEED, quality: QUALITY, viewport: [W, H], scenes: [], perf: null };

const shot = async (name, frames = 2) => {
  const t = Date.now();
  await page.evaluate((f) => window.__GAME.render(f), frames);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 180000 });
  console.log(`  shot ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
};

const ev = (fn, a) => page.evaluate(fn, a);
const snap = () => page.evaluate(() => window.__GAME.snapshot());

const scenes = [];
const scene = (name, fn) => scenes.push({ name, fn });

/* --------------------------------------------------------------- scenes */

scene('01_briefing', async () => {
  await shot('01_briefing');
});

scene('02_site_overview', async () => {
  await ev(() => {
    const G = window.__GAME;
    G.action('deploy');
    G.action('tod:day');
    G.runFor(1.0);
    G.teleport(126, undefined, 116);
    G.lookAt(-30, 26, -70);
  });
  await shot('02_site_overview_day');
});

scene('03_patriot', async () => {
  await ev(() => {
    const G = window.__GAME;
    G.teleport(-50, undefined, 36);
    G.lookAt(-64, 3.2, 24);
    G.runFor(0.4);
  });
  await shot('03_patriot_battery');
});

scene('04_thaad', async () => {
  await ev(() => {
    const G = window.__GAME;
    G.teleport(46, undefined, 4);
    G.lookAt(72, 4.0, 12);
    G.runFor(0.4);
  });
  await shot('04_thaad_battery');
});

scene('05_sentinel', async () => {
  await ev(() => {
    const G = window.__GAME;
    G.teleport(-14, undefined, -70);
    G.lookAt(4, 6.5, -96);
    G.runFor(0.4);
  });
  await shot('05_sentinel_battery');
});

scene('06_radar', async () => {
  await ev(() => {
    const G = window.__GAME;
    G.teleport(-10, undefined, -40);
    G.lookAt(-26, 4.5, -58);
    G.runFor(0.4);
  });
  await shot('06_radar_site');
});

scene('07_shelter', async () => {
  await ev(() => {
    const G = window.__GAME;
    G.teleport(18, undefined, 78);
    G.lookAt(28, 2.6, 58);
    G.runFor(0.4);
  });
  await shot('07_c2_shelter');
});

scene('08_console', async () => {
  const ok = await ev(() => {
    const G = window.__GAME;
    const docked = G.dock();
    G.runFor(1.2);
    return { docked, pos: G.snapshot().camera };
  });
  report.scenes.push({ name: '08_console', docked: ok.docked, camera: ok.pos });
  console.log(`  docked=${ok.docked} cam=${JSON.stringify(ok.pos.map((v) => Math.round(v * 10) / 10))}`);
  await shot('08_console_day');
});

scene('09_day_single', async () => {
  const r = await ev(() => {
    const G = window.__GAME;
    G.startScenario('SINGLE', 'day', 'PATRIOT');
    const gotTrack = G.runUntil((s) => s.firm > 0, 45);
    return { gotTrack, snap: G.snapshot() };
  });
  console.log(`  firm track acquired=${r.gotTrack} tracks=${r.snap.tracks.length}`);
  await shot('09_console_tracking');

  const eng = await ev(() => {
    const G = window.__GAME;
    // Hold until the terminal battery has a good solution, then commit.
    G.runUntil((s) => {
      const t = G.game.radar.firmTracks()[0];
      if (!t) return false;
      const b = G.game.batteries.get('PATRIOT');
      return G.game.radar.evaluateWindow(t, b.cfg, b.position).quality > 0.6;
    }, 40);
    const committed = G.autoEngage(1);
    return { committed, snap: G.snapshot() };
  });
  console.log(`  committed=${JSON.stringify(eng.committed)}`);
  report.scenes.push({ name: '09_day_commit', committed: eng.committed });

  await ev(() => {
    const G = window.__GAME;
    G.undock();
    G.teleport(-34, undefined, 42);
    G.runUntil((s) => s.interceptors.length > 0, 25);
    G.runFor(0.7);
    G.lookAt(-64, 260, -60);
  });
  await shot('10_launch_day');

  await ev(() => {
    const G = window.__GAME;
    G.runFor(3.2);
    const s = G.snapshot();
    const i = s.interceptors[0];
    if (i) G.lookAt(-40, Math.max(600, i.alt * 0.9), -3200);
  });
  await shot('11_boost_day');

  const res = await ev(() => {
    const G = window.__GAME;
    const t = G.game.threats.active[0];
    if (t) G.lookAt(t.pos.x * 0.4, t.pos.y * 0.75, t.pos.z * 0.4);
    G.runUntil((s) => s.stats.intercepted > 0 || s.stats.leakers > 0 || s.interceptors.length === 0, 60);
    G.runFor(0.25);
    return G.snapshot();
  });
  console.log(`  result=${JSON.stringify(res.lastResult)} stats=${JSON.stringify(res.stats)}`);
  report.scenes.push({ name: '09_day_result', stats: res.stats, lastResult: res.lastResult, record: res.record });
  await shot('12_intercept_day');
});

scene('13_sunset_saturation', async () => {
  const r = await ev(() => {
    const G = window.__GAME;
    G.startScenario('SATURATION', 'sunset', 'THAAD');
    G.teleport(30, undefined, 78);
    G.runUntil((s) => s.firm >= 2, 45);
    const committed = G.autoEngage(3);
    G.lookAt(0, 2400, -16000);
    return { committed, snap: G.snapshot() };
  });
  console.log(`  committed=${JSON.stringify(r.committed)}`);
  report.scenes.push({ name: '13_sunset_commit', committed: r.committed, firm: r.snap.firm });
  await ev(() => {
    const G = window.__GAME;
    G.runUntil((s) => s.interceptors.length > 0, 25);
    G.runFor(1.0);
    const s = G.snapshot();
    if (s.interceptors[0]) G.lookAt(40, 400, -1400);
  });
  await shot('13_sunset_launch');

  await ev(() => {
    const G = window.__GAME;
    G.runFor(4.5);
    const s = G.snapshot();
    const alt = s.interceptors.length ? Math.max(...s.interceptors.map((i) => i.alt)) : 4000;
    G.lookAt(0, alt * 0.85, -7000);
  });
  await shot('14_sunset_midflight');

  const res = await ev(() => {
    const G = window.__GAME;
    G.autoEngage(3);
    G.runFor(2.5);
    G.autoEngage(3);
    G.runFor(2.0);
    return G.snapshot();
  });
  report.scenes.push({ name: '14_sunset_salvo', stats: res.stats, interceptors: res.interceptors.length });
  await shot('15_sunset_salvo');

  const fin = await ev(() => {
    const G = window.__GAME;
    G.runUntil((s) => s.stats.intercepted + s.stats.leakers >= 2, 60);
    G.runFor(0.3);
    const s = G.snapshot();
    return s;
  });
  report.scenes.push({ name: '15_sunset_result', stats: fin.stats, record: fin.record });
  await shot('16_sunset_result');
});

scene('17_night_raid', async () => {
  const r = await ev(() => {
    const G = window.__GAME;
    G.startScenario('NIGHT_RAID', 'night', 'SENTINEL');
    G.teleport(34, undefined, 62);
    G.lookAt(-40, 90, -120);
    G.runFor(2.0);
    return G.snapshot();
  });
  report.scenes.push({ name: '17_night_site', stats: r.stats });
  await shot('17_night_site');

  await ev(() => {
    const G = window.__GAME;
    G.runUntil((s) => s.firm >= 1, 45);
    G.autoEngage(3);
    G.runUntil((s) => s.interceptors.length > 0, 25);
    G.runFor(0.7);
    G.lookAt(4, 300, -1200);
  });
  await shot('18_night_launch');

  await ev(() => {
    const G = window.__GAME;
    G.runFor(4.5);
    const s = G.snapshot();
    const alt = s.interceptors.length ? Math.max(...s.interceptors.map((i) => i.alt)) : 5000;
    G.lookAt(0, alt * 0.9, -9000);
  });
  await shot('19_night_flight');

  const fin = await ev(() => {
    const G = window.__GAME;
    G.runUntil((s) => s.stats.intercepted > 0 || s.stats.leakers > 0, 50);
    G.runFor(0.28);
    return G.snapshot();
  });
  report.scenes.push({ name: '19_night_result', stats: fin.stats, record: fin.record });
  await shot('20_night_intercept');
});

scene('21_full_run', async () => {
  // One complete unattended run: engage everything, then read the debrief.
  const fin = await ev(() => {
    const G = window.__GAME;
    G.startScenario('SATURATION', 'sunset', 'THAAD');
    for (let i = 0; i < 120; i++) {
      G.autoEngage(3);
      G.runFor(0.75);
      if (G.snapshot().phase === 'DEBRIEF') break;
    }
    return G.snapshot();
  });
  report.scenes.push({ name: '21_full_run', phase: fin.phase, stats: fin.stats, record: fin.record });
  console.log(`  full run: phase=${fin.phase} stats=${JSON.stringify(fin.stats)}`);
  await shot('21_debrief');
});

scene('99_perf', async () => {
  if (SKIP_PERF) return;
  const perf = await ev(() => {
    const G = window.__GAME;
    G.startScenario('SATURATION', 'sunset', 'THAAD');
    G.teleport(30, undefined, 78);
    G.runUntil((s) => s.firm >= 3, 45);
    G.autoEngage(3);
    G.runFor(2.4);
    G.autoEngage(3);
    G.runFor(1.6);
    G.lookAt(0, 1800, -6000);
    const sim = G.measureSim(180);
    const draw = G.measure(20);
    return { sim, draw, snap: G.snapshot() };
  });
  report.perf = { sim: perf.sim, draw: perf.draw, stats: perf.snap.stats };
  console.log('  perf:', JSON.stringify({ sim: perf.sim, draw: perf.draw }));
  await shot('99_peak_load', 1);
});

/* ------------------------------------------------------------------ drive */

for (const s of scenes) {
  if (ONLY && !s.name.includes(ONLY)) continue;
  const t = Date.now();
  try {
    await s.fn();
    console.log(`= scene ${s.name} ok (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  } catch (e) {
    problems.push(`[scene ${s.name}] ${e.message}`);
    console.log(`!! scene ${s.name} failed: ${e.message}`);
  }
}

report.problems = problems;
await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

console.log(`\n=== problems (${problems.length}) ===`);
console.log(problems.slice(0, 40).join('\n') || 'none');

await browser.close();
process.exit(0);
