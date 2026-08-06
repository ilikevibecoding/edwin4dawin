// Records a gameplay demo video via Playwright page video capture.
// The sim runs at testSpeed sim-steps per rendered frame so the action plays
// at natural speed despite slow headless rendering.
// Usage: node tools/demo_video.mjs [outDir]
import { chromium } from '@playwright/test';

const outDir = process.argv[2] || 'shots/video';

async function main() {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/?test=1&seed=11');
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 40000 });

  await page.evaluate(() => { window.__game.setTime('day'); window.__game.deployBatteries(); });
  // calibrate: real RAF rate over 2s
  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const loop = () => { n++; (performance.now() - t0 < 2000) ? requestAnimationFrame(loop) : res(n / 2); };
    requestAnimationFrame(loop);
  }));
  const speed = Math.min(8, Math.max(1, Math.round(60 / Math.max(7.5, fps))));
  console.log(`raf fps=${fps.toFixed(1)} -> testSpeed=${speed}`);
  const wallStart = Date.now();

  // ---- opening orbit over the deployed base (sim speed 1x-ish for smoothness)
  await page.evaluate((s) => window.__game.setSpeed(s), speed);
  const orbit = [
    [[-95, 26, 130], [0, 8, 0]],
    [[130, 18, 90], [-20, 10, 0]],
    [[-36, 4, -6], [-58, 6, -40]],   // PAC-X close
    [[38, 4, 30], [52, 9, 42]],      // HALO close
    [[-30, 5, 42], [-52, 12, 58]],   // SENTINEL close
  ];
  for (const [c, l] of orbit) {
    await page.evaluate(({ c, l }) => window.__game.flyCam(c[0], c[1], c[2], l[0], l[1], l[2]), { c, l });
    await page.waitForTimeout(1500);
  }

  // ---- saturation scenario with auto engage
  await page.evaluate(() => {
    const g = window.__game;
    g.startScenario('saturation', 11);
    g.autoEngage(true);
  });

  // camera plan keyed on sim time
  const plan = [
    { until: 5, aim: 'threat' },                                  // incoming glow
    { until: 12, cam: [[-30, 3, 44], [-52, 30, 58]] },            // sentinel launch
    { until: 22, aim: 'bird' },                                   // follow first bird
    { until: 30, cam: [[36, 3, 28], [52, 40, 42]] },              // halo pad
    { until: 48, aim: 'action' },                                 // follow the fight
    { until: 75, aim: 'action' },
    { until: 92, cam: [[0, 3, 150], [-400, 2200, -2000]] },       // wide for stragglers
  ];
  const t0 = await page.evaluate(() => window.__game.state().time);
  let done = false;
  for (let guard = 0; guard < 500 && !done; guard++) {
    const st = await page.evaluate(() => {
      const s = window.__game.state();
      return {
        t: s.time, summary: s.summaryOpen,
        birds: s.birdPositions.filter(b => b.state !== 'IDLE'),
        threats: s.threatPositions,
      };
    });
    const t = st.t - t0;
    if (st.summary) { done = true; break; }
    const seg = plan.find(p => t < p.until) || plan[plan.length - 1];
    if (seg.cam) {
      const [c, l] = seg.cam;
      await page.evaluate(({ c, l }) => window.__game.flyCam(c[0], c[1], c[2], l[0], l[1], l[2]), { c, l });
    } else {
      const target = seg.aim === 'bird' && st.birds.length ? st.birds[0]
        : seg.aim === 'threat' && st.threats.length ? st.threats[0]
          : st.birds.length ? st.birds[st.birds.length - 1]
            : st.threats.length ? st.threats[0] : null;
      if (target) {
        await page.evaluate((p) => window.__game.flyCam(0, 3, 150, p.x, p.y, p.z), target);
      }
    }
    await page.waitForTimeout(300);
  }

  // hold on the summary
  await page.waitForTimeout(2800);
  console.log(`content wall duration ${(Date.now() - wallStart) / 1000}s (trim head before this)`);

  const video = page.video();
  await context.close();
  const p = await video.path();
  await browser.close();
  console.log('recorded:', p);
  // print trim offset: total - content
  console.log('TRIM_HEAD_HINT: use blackdetect or (total - content) offset');
}
main().catch((e) => { console.error(e); process.exit(1); });
