// Print interceptor/threat positions over time, then screenshot aimed at the action.
// Usage: node tools/track.mjs [scenario] [seed]
import { chromium } from '@playwright/test';

const scenario = process.argv[2] || 'single';
const seed = Number(process.argv[3] || 42);

async function main() {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://127.0.0.1:5173/?test=1&seed=${seed}`);
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 40000 });

  await page.evaluate(({ scenario, seed }) => {
    const g = window.__game;
    g.startScenario(scenario, seed);
    g.autoEngage(true);
  }, { scenario, seed });

  for (let t = 2; t <= 30; t += 2) {
    const st = await page.evaluate(() => {
      window.__game.step(2);
      const s = window.__game.state();
      return { time: s.time, birds: s.birdPositions, threats: s.threatPositions };
    });
    const fmt = (p) => p ? `(${p.x?.toFixed(0)},${p.y?.toFixed(0)},${p.z?.toFixed(0)}${p.state ? ' ' + p.state : ''})` : 'none';
    console.log(`t=${st.time.toFixed(0)}s birds=[${(st.birds || []).map(fmt).join(' ')}] threats=[${(st.threats || []).map(fmt).join(' ')}]`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
