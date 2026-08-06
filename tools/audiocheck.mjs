// Verify the procedural audio graph actually builds and produces signal.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.goto('http://127.0.0.1:5173/?test=1&seed=99', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90000 });
const r = await page.evaluate(async () => {
  const g = window.__gameInstance;
  const ok = g.audio.init();
  const a = g.audio;
  // tap the master bus with an analyser and fire a launch cue
  const an = a.ctx.createAnalyser();
  an.fftSize = 2048;
  a.master.connect(an);
  const before = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(before);
  const rmsBefore = Math.sqrt(before.reduce((s, v) => s + v * v, 0) / before.length);
  a.launch({ x: 0, y: 3, z: -10 }, 1.4);
  a.explosion({ x: 0, y: 400, z: -600 }, 1.2);
  a.startAlarm();
  await new Promise((res) => setTimeout(res, 700));
  const after = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(after);
  const rmsAfter = Math.sqrt(after.reduce((s, v) => s + v * v, 0) / after.length);
  a.stopAlarm();
  return {
    ok, state: a.ctx.state, sampleRate: a.ctx.sampleRate,
    rmsBefore: +rmsBefore.toFixed(5), rmsAfter: +rmsAfter.toFixed(5),
    hasMaster: !!a.master, hasComp: !!a.comp, hasNoise: !!a.noise,
  };
});
console.log(JSON.stringify(r));
await browser.close();
