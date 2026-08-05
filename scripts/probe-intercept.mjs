/**
 * Engagement telemetry probe.
 *
 * Runs a scenario headlessly, engages with a chosen battery, and prints a
 * per-second trace of the interceptor's position, speed, phase, predicted
 * intercept point error and range to target - the data needed to tune
 * guidance without guessing.
 *
 *   node scripts/probe-intercept.mjs [--scn single] [--bty sentinel] [--runs 3]
 */
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const scenario = arg('scn', 'single');
const battery = arg('bty', 'auto');
const runs = Number(arg('runs', '3'));
const verbose = args.includes('--verbose');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio']
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') console.log(`[error] ${m.text()}`);
});

await page.goto('http://127.0.0.1:4173/?test=1&quality=low&seed=99&skipintro=1', {
  waitUntil: 'domcontentloaded'
});
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 180000 });

await page.evaluate(() => {
  // Headless probing: no need to burn fill rate on particles.
  const g = window.__gameInstance;
  g.effects.emitTrail = () => {};
  g.post.enabled = false;
});

for (let run = 0; run < runs; run++) {
  const summary = await page.evaluate(
    async ([scn, bty, verboseFlag, seedRun]) => {
      const g = window.__gameInstance;
      g.setScenario(scn);
      g.restart();
      void seedRun;

      const trace = [];
      const results = [];
      const origResult = g.interceptors.listeners.result.slice();
      g.interceptors.listeners.result = origResult.concat([
        (payload) =>
          results.push({
            id: payload.shot.id,
            outcome: payload.outcome,
            miss: +payload.missDistance.toFixed(1),
            note: payload.note,
            alt: +payload.position.y.toFixed(0),
            age: +payload.shot.age.toFixed(1)
          })
      ]);

      const step = 1 / 60;
      let t = 0;
      let lastTrace = 0;
      let engaged = false;
      while (t < 130) {
        g.simulate(step);
        t += step;

        if (!engaged || bty === 'auto') {
          if (bty === 'auto') {
            g.autoEngage();
          } else {
            const firm = g.radar.firmTracks().filter((x) => !x.engaged);
            const b = g.batteries.byId.get(bty);
            if (firm.length && b && b.ready && b.canEngage(firm[0].threat).ok) {
              g.batteries.select(bty);
              g.radar.select(firm[0]);
              g.lookedAtTrack = null;
              if (g.assign()) {
                g._pendingAuto = { battery: b, track: firm[0] };
                engaged = true;
              }
            }
          }
        }

        if (!engaged && bty !== 'auto' && t - lastTrace >= 1) {
          lastTrace = t;
          const b = g.batteries.byId.get(bty);
          const firm = g.radar.firmTracks();
          const th = firm[0]?.threat || g.threats.active[0];
          if (th) {
            trace.push({
              t: +t.toFixed(1),
              firm: firm.length,
              alt: +th.pos.y.toFixed(0),
              rng: +b.worldPosition.distanceTo(th.pos).toFixed(0),
              why: b.canEngage(th).reason,
              state: b.state
            });
          }
        }

        if (verboseFlag && t - lastTrace >= 1) {
          lastTrace = t;
          const shot = g.interceptors.active[0];
          if (shot) {
            const tgt = shot.target;
            trace.push({
              t: +t.toFixed(1),
              phase: shot.phase,
              alt: +shot.pos.y.toFixed(0),
              spd: +shot.vel.length().toFixed(0),
              rng: tgt ? +shot.pos.distanceTo(tgt.pos).toFixed(0) : null,
              pipErr: tgt ? +shot.pip.distanceTo(tgt.pos).toFixed(0) : null,
              lat: +shot.lateral.length().toFixed(1)
            });
          }
        }

        if (g.phase === 'DEBRIEF') break;
      }
      g.interceptors.listeners.result = origResult;
      return { stats: g.stats, results, trace, seconds: +t.toFixed(1) };
    },
    [scenario, battery, verbose, run]
  );

  console.log(`\n=== run ${run + 1} (${scenario} / ${battery}) ${summary.seconds}s ===`);
  console.log('stats  ', JSON.stringify(summary.stats));
  console.log('results', JSON.stringify(summary.results));
  if (verbose) for (const row of summary.trace) console.log('  ', JSON.stringify(row));
}

await browser.close();
