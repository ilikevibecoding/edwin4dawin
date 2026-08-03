#!/usr/bin/env node
/**
 * Honest frame-rate measurement.
 *
 * Two numbers, because they are not the same thing and confusing them is easy:
 *
 *   renderMs   how long one `App.frame()` costs inside the page, timed in the
 *              page, with no screenshot and no CDP round trip. This is the
 *              application's real cost per frame.
 *   liveFps    what the running app actually reports while playing in real
 *              time, sampled from its own frame-time average.
 *
 * A capture loop that screenshots every frame over the DevTools protocol adds
 * its own cost on top of both and must never be quoted as the app's frame rate.
 *
 *   node scripts/bench-fps.mjs
 *   node scripts/bench-fps.mjs --at 246 --seconds 15
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const SECONDS = Number(flag('seconds', 12));
const PORT = Number(flag('port', 5173));
const WIDTH = Number(flag('width', 1280));
const HEIGHT = Math.round((WIDTH * 9) / 16);
// Moments chosen to cover the cheapest and most expensive things the show draws.
const MARKS = (flag('at', '') ? [Number(flag('at'))] : [50, 104, 198, 246, 275, 347]);

const chrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium'].find(
  (c) => c && existsSync(c),
);

for (const quality of (flag('quality', '') ? [flag('quality')] : ['low', 'medium', 'high'])) {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--mute-audio',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
    ],
    protocolTimeout: 600000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/?qa=1&quality=${quality}&autoplay=0`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction('window.__STARFALL && window.__STARFALL.ready === true', {
    timeout: 600000,
  });

  const perShot = await page.evaluate(
    async (marks, seconds) => {
      const app = window.__STARFALL.app;
      const out = [];
      for (const t of marks) {
        window.__STARFALL.seekAndSettle(t, 4, 1.5);
        app.frozen = true;
        app.show.timeline.play();
        // Warm the pipeline, then time frames in the page with nothing else
        // in the loop: no encode, no protocol traffic, no disk.
        for (let i = 0; i < 8; i++) app.frame(1 / 60);
        // `gl.finish()` is the whole point of this measurement. WebGL calls
        // only queue work, so timing `frame()` on its own measures command
        // submission and reports impossible numbers like 1400 fps under a
        // software rasteriser. Blocking until the driver has actually drawn is
        // what turns this into a frame time.
        const gl = app.render.renderer.getContext();
        const samples = [];
        for (let i = 0; i < 40; i++) {
          const t0 = performance.now();
          app.frame(1 / 60);
          gl.finish();
          samples.push(performance.now() - t0);
        }
        samples.sort((a, b) => a - b);
        out.push({
          t,
          medianMs: +samples[Math.floor(samples.length / 2)].toFixed(1),
          p95Ms: +samples[Math.floor(samples.length * 0.95)].toFixed(1),
        });
      }

      // Now let the app run itself, driven by requestAnimationFrame, and read
      // the frame rate it reports for its own loop.
      app.frozen = false;
      app.show.timeline.seek(96);
      app.show.timeline.play();
      const fps = [];
      await new Promise((resolve) => {
        const started = performance.now();
        const poll = () => {
          fps.push(window.__STARFALL.state().fps);
          if (performance.now() - started > seconds * 1000) resolve();
          else setTimeout(poll, 400);
        };
        setTimeout(poll, 1500);
      });
      const live = fps.filter((v) => v > 0).sort((a, b) => a - b);
      return {
        perShot: out,
        liveFpsMedian: live.length ? +live[Math.floor(live.length / 2)].toFixed(1) : null,
        liveFpsMin: live.length ? +live[0].toFixed(1) : null,
        liveFpsMax: live.length ? +live[live.length - 1].toFixed(1) : null,
        drawCalls: window.__STARFALL.state().drawCalls,
        triangles: window.__STARFALL.state().triangles,
      };
    },
    MARKS,
    SECONDS,
  );

  console.log(`\n── quality=${quality} · ${WIDTH}x${HEIGHT} · swiftshader (no GPU) ──`);
  for (const s of perShot.perShot) {
    console.log(
      `  t=${String(s.t).padStart(3)}s  frame ${String(s.medianMs).padStart(6)} ms median  ` +
        `(${String(s.p95Ms).padStart(6)} ms p95)  =>  ${(1000 / s.medianMs).toFixed(1)} fps`,
    );
  }
  console.log(
    `  live rAF loop: ${perShot.liveFpsMedian} fps median ` +
      `(${perShot.liveFpsMin}–${perShot.liveFpsMax}) · ` +
      `${perShot.drawCalls} draws · ${(perShot.triangles / 1000).toFixed(0)}k tris`,
  );
  await browser.close();
}
