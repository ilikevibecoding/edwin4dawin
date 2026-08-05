// Fast, render-free balance probe: runs scenarios headlessly with the auto
// engagement helper and reports intercept rates per battery and per scenario.

import { chromium } from '@playwright/test';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const RUNS = Number(arg('runs', 3));
const BASE = arg('base', 'http://127.0.0.1:5173');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto(`${BASE}/?test=1&quality=low`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 180000 });

const results = await page.evaluate(async (runs) => {
  const G = window.__GAME;
  const out = [];
  const scenarios = ['SINGLE', 'SATURATION', 'NIGHT_RAID'];
  for (const scn of scenarios) {
    for (let r = 0; r < runs; r++) {
      G.startScenario(scn, scn === 'NIGHT_RAID' ? 'night' : scn === 'SATURATION' ? 'sunset' : 'day');
      const committed = [];
      let guard = 0;
      while (guard++ < 400) {
        committed.push(...G.autoEngage(3));
        G.runFor(0.5);
        if (G.snapshot().phase === 'DEBRIEF') break;
      }
      const s = G.snapshot();
      out.push({
        scenario: scn,
        run: r,
        elapsed: Number(G.game.scenarioTime.toFixed(1)),
        stats: s.stats,
        committed,
        record: s.record.map((x) => x.detail),
      });
    }
  }
  // Per-battery single-target probe: how does each family do on its own?
  const perBattery = [];
  for (const b of ['PATRIOT', 'THAAD', 'SENTINEL']) {
    for (let r = 0; r < runs; r++) {
      G.startScenario('SINGLE', 'day', b);
      let fired = false;
      let guard = 0;
      let commitInfo = null;
      while (guard++ < 400) {
        if (!fired) {
          const t = G.game.radar.firmTracks()[0];
          if (t) {
            const bat = G.game.batteries.get(b);
            const w = G.game.radar.evaluateWindow(t, bat.cfg, bat.position);
            if (w.okAlt && w.okRange && w.quality > 0.55) {
              G.action(`battery:${b}`);
              G.game.selectTrack(t.id);
              G.game.assign();
              G.authorize();
              fired = true;
              commitInfo = { t: Number(G.game.scenarioTime.toFixed(1)), alt: Math.round(w.alt), range: Math.round(w.range), tti: Number(w.tti.toFixed(1)), q: Number(w.quality.toFixed(2)) };
            }
          }
        }
        G.runFor(0.4);
        if (G.snapshot().phase === 'DEBRIEF') break;
      }
      const s = G.snapshot();
      perBattery.push({ battery: b, run: r, commit: commitInfo, stats: s.stats, record: s.record.map((x) => x.detail) });
    }
  }
  return { out, perBattery };
}, RUNS);

const fmt = (o) => JSON.stringify(o);
console.log('=== scenario runs ===');
for (const r of results.out) {
  console.log(
    `${r.scenario.padEnd(11)} run${r.run} t=${String(r.elapsed).padStart(5)}s spawned=${r.stats.spawned} fired=${r.stats.launched} kill=${r.stats.intercepted} leak=${r.stats.leakers} decoy=${r.stats.decoysWasted}`
  );
  for (const d of r.record) console.log(`             ${d}`);
}
console.log('\n=== per-battery SINGLE probe ===');
for (const r of results.perBattery) {
  console.log(`${r.battery.padEnd(9)} run${r.run} commit=${fmt(r.commit)} kill=${r.stats.intercepted} leak=${r.stats.leakers}`);
  for (const d of r.record) console.log(`             ${d}`);
}
console.log('\nerrors:', errors.length ? errors.slice(0, 10) : 'none');
await browser.close();
