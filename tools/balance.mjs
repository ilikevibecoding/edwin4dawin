// Headless balance check: plays every scenario with the autopilot and prints
// the threat/round tallies plus the full result list.
//
// NOTE: the Rng is seeded once when the page loads and restart() does not
// reseed it, so scenarios must always be played in the same order for a run to
// be reproducible.
import { chromium } from '@playwright/test';

const seeds = (process.argv[2] || '20260805').split(',');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox', '--mute-audio'] });

const totals = { spawned: 0, intercepted: 0, impacted: 0, launched: 0, hits: 0, fellShort: 0 };
for (const seed of seeds) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await page.goto(`http://127.0.0.1:5173/?test=1&seed=${seed}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__GAME, null, { timeout: 90000 });
  for (const scenario of ['single', 'saturation', 'night']) {
    const r = await page.evaluate(([s]) => {
      const G = window.__GAME; G.freezePlayer(true); G.restart();
      G.configure({ scenario: s, condition: s === 'night' ? 'night' : 'day' });
      G.start(); G.autoPlay(140); const st = G.state();
      return { scenario: s, t: st.threatStats, r: st.roundStats, state: st.state, results: st.results.map((x) => x.result + ': ' + (x.message || '')) };
    }, [scenario]);
    const real = r.t.spawned - r.t.decoys;
    totals.spawned += real;
    totals.intercepted += r.t.intercepted;
    totals.impacted += r.t.impacted;
    totals.launched += r.r.launched;
    totals.hits += r.r.hits;
    totals.fellShort += r.results.filter((x) => x.includes('FELL SHORT')).length;
    console.log(`seed ${seed}`, r.scenario, JSON.stringify(r.t), JSON.stringify(r.r), r.state, JSON.stringify(r.results));
  }
  await page.close();
}
console.log('\nTOTALS', JSON.stringify(totals),
  `\n  real threats stopped: ${totals.intercepted}/${totals.spawned}`,
  `\n  rounds hit: ${totals.hits}/${totals.launched}`,
  `\n  ROUND FELL SHORT: ${totals.fellShort}`);
await browser.close();
