// Headless gameplay matrix: runs every scenario against every battery with the
// demonstration autopilot and reports outcomes. No rendering, so it is fast and
// makes balance regressions obvious.
//
//   node tools/sim.mjs [runs]
import { chromium } from '@playwright/test';

const RUNS = Number(process.argv[2] || 2);
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox', '--no-sandbox', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text());
});

const scenarios = ['single', 'saturation', 'night'];
const rows = [];

for (let run = 0; run < RUNS; run++) {
  const seed = 1000 + run * 7919;
  await page.goto(`http://127.0.0.1:5173/?test=1&seed=${seed}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__GAME, null, { timeout: 60000 });
  for (const scenario of scenarios) {
    const r = await page.evaluate(([scenario]) => {
      const G = window.__GAME;
      G.freezePlayer(true);
      G.restart();
      G.configure({ scenario, condition: scenario === 'night' ? 'night' : 'day' });
      G.start();
      const decisions = G.autoPlay(120);
      const s = G.state();
      return {
        scenario,
        decisions,
        threats: s.threatStats,
        rounds: s.roundStats,
        state: s.state,
        elapsed: s.elapsed,
        results: s.results.map((x) => x.result),
        batteries: s.batteries,
      };
    }, [scenario]);
    rows.push({ seed, ...r });
    console.log(
      `seed ${seed} ${r.scenario.padEnd(11)} spawned ${r.threats.spawned} ` +
      `intercepted ${r.threats.intercepted} impacted ${r.threats.impacted} ` +
      `decoys ${r.threats.decoys} | fired ${r.rounds.launched} hits ${r.rounds.hits} ` +
      `miss ${r.rounds.misses} decoyHit ${r.rounds.decoyHits} | ${r.state} t=${r.elapsed.toFixed(0)}s`,
    );
    console.log(`   decisions ${JSON.stringify(r.decisions)}`);
  }
}

// aggregate
const agg = {};
for (const r of rows) {
  const a = agg[r.scenario] || (agg[r.scenario] = { spawned: 0, intercepted: 0, impacted: 0, fired: 0, hits: 0, misses: 0, decoyHits: 0, n: 0 });
  a.spawned += r.threats.spawned;
  a.intercepted += r.threats.intercepted;
  a.impacted += r.threats.impacted;
  a.fired += r.rounds.launched;
  a.hits += r.rounds.hits;
  a.misses += r.rounds.misses;
  a.decoyHits += r.rounds.decoyHits;
  a.n++;
}
console.log('\n=== AGGREGATE ===');
for (const [k, a] of Object.entries(agg)) {
  const pk = a.fired ? (a.hits / a.fired * 100).toFixed(0) : '--';
  console.log(`${k.padEnd(11)} runs ${a.n} | threats ${a.spawned} killed ${a.intercepted} leaked ${a.impacted} | rounds ${a.fired} hit% ${pk}`);
}
if (errs.length) {
  console.log('\nERRORS:', [...new Set(errs)].slice(0, 10));
}
await browser.close();
