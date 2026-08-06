// Proves the procedural audio engine actually produces signal. Chromium is
// launched with the autoplay gate disabled, an analyser is spliced onto the
// master bus, and RMS is measured while events fire in real time.

import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'http://127.0.0.1:5173';

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto(`${BASE}/?test=1&quality=low`, { waitUntil: 'load' });
await page.waitForFunction('window.__READY === true', null, { timeout: 180000 });

const setup = await page.evaluate(() => {
  const G = window.__GAME;
  const a = G.game.audio;
  a.resume();
  if (!a.ready) return { ready: false };
  const an = a.ctx.createAnalyser();
  an.fftSize = 2048;
  a.comp.connect(an);
  window.__AN = an;
  window.__BUF = new Float32Array(an.fftSize);
  return { ready: true, state: a.ctx.state, sampleRate: a.ctx.sampleRate };
});

if (!setup.ready) {
  console.log('AUDIO NOT READY (no WebAudio in this browser build)');
  await browser.close();
  process.exit(1);
}

const rms = () =>
  page.evaluate(() => {
    window.__AN.getFloatTimeDomainData(window.__BUF);
    let s = 0;
    for (const v of window.__BUF) s += v * v;
    return Math.sqrt(s / window.__BUF.length);
  });

const probe = async (label, trigger, settleMs = 700) => {
  await page.evaluate(trigger);
  await page.waitForTimeout(settleMs);
  let peak = 0;
  for (let i = 0; i < 8; i++) {
    peak = Math.max(peak, await rms());
    await page.waitForTimeout(60);
  }
  console.log(`${label.padEnd(22)} peak RMS ${peak.toFixed(5)} ${peak > 0.0015 ? 'OK' : 'SILENT'}`);
  return peak;
};

const results = {};
results.ambient = await probe('ambient bed', () => {}, 400);
results.launch = await probe('launch roar', () => {
  const G = window.__GAME;
  G.game.audio.launch(G.game.camera.position.clone().add({ x: 40, y: 2, z: 0 }), { plumeScale: 1.6, short: 'HI-ALT' });
});
results.explosion = await probe('air explosion', () => {
  const G = window.__GAME;
  G.game.audio.explosion(G.game.camera.position.clone().add({ x: 120, y: 200, z: 0 }), 26, 'air');
}, 1200);
results.alarm = await probe('alarm', () => window.__GAME.game.audio.alarm(2));
results.ping = await probe('radar ping', () => window.__GAME.game.audio.ping(), 350);
results.ui = await probe('ui confirm', () => window.__GAME.game.audio.ui('confirm'), 300);
results.footstep = await probe('footstep', () => window.__GAME.game.audio.footstep(false), 300);
results.boom = await probe('sonic boom', () => {
  const G = window.__GAME;
  G.game.audio.sonicBoom(G.game.camera.position.clone().add({ x: 60, y: 60, z: 0 }));
}, 800);

// Speed-of-sound arrival delay: a distant blast must not be heard immediately.
const delayed = await page.evaluate(async () => {
  const G = window.__GAME;
  const far = G.game.camera.position.clone();
  far.x += 3000;
  const before = performance.now();
  G.game.audio.explosion(far, 40, 'ground');
  const read = () => {
    window.__AN.getFloatTimeDomainData(window.__BUF);
    let s = 0;
    for (const v of window.__BUF) s += v * v;
    return Math.sqrt(s / window.__BUF.length);
  };
  const base = read();
  await new Promise((r) => setTimeout(r, 400));
  const early = read();
  await new Promise((r) => setTimeout(r, 9200));
  let late = 0;
  for (let i = 0; i < 20; i++) {
    late = Math.max(late, read());
    await new Promise((r) => setTimeout(r, 40));
  }
  return { base, early, late, elapsed: performance.now() - before };
});
console.log(
  `3 km blast          early RMS ${delayed.early.toFixed(5)} -> late RMS ${delayed.late.toFixed(5)} ` +
    `(expected ~8.8 s travel) ${delayed.late > delayed.early * 1.5 ? 'OK' : 'NO DELAY EFFECT'}`
);

console.log('\nerrors:', errors.length ? errors.slice(0, 8) : 'none');
const silent = Object.entries(results).filter(([k, v]) => k !== 'ambient' && v <= 0.0015);
await browser.close();
process.exit(silent.length || errors.length ? 1 : 0);
