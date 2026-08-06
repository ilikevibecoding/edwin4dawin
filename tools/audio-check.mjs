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

// Speed-of-sound arrival delay: a nearby blast must be silent for the travel
// time, then arrive. 700 m is far enough for a ~2 s delay and close enough that
// the arrival clearly clears the ambient bed.
const delayed = await page.evaluate(async () => {
  const G = window.__GAME;
  const far = G.game.camera.position.clone();
  far.x += 700;
  const read = () => {
    window.__AN.getFloatTimeDomainData(window.__BUF);
    let s = 0;
    for (const v of window.__BUF) s += v * v;
    return Math.sqrt(s / window.__BUF.length);
  };
  const sample = async (ms) => {
    let peak = 0;
    const end = performance.now() + ms;
    while (performance.now() < end) {
      peak = Math.max(peak, read());
      await new Promise((r) => setTimeout(r, 25));
    }
    return peak;
  };
  const idle = await sample(300);
  G.game.audio.explosion(far, 40, 'ground');
  const duringTravel = await sample(1500); // < 700/340 = 2.06 s
  const onArrival = await sample(1800);
  return { idle, duringTravel, onArrival };
});
const quietWhileTravelling = delayed.duringTravel < delayed.idle * 2.2;
const arrived = delayed.onArrival > Math.max(delayed.duringTravel, delayed.idle) * 2.5;
console.log(
  `700 m blast         idle ${delayed.idle.toFixed(5)} | in transit ${delayed.duringTravel.toFixed(5)} | ` +
    `on arrival ${delayed.onArrival.toFixed(5)} ${quietWhileTravelling && arrived ? 'OK (2.06 s travel)' : 'DELAY NOT OBSERVED'}`
);

console.log('\nerrors:', errors.length ? errors.slice(0, 8) : 'none');
const silent = Object.entries(results).filter(([k, v]) => k !== 'ambient' && v <= 0.0015);
await browser.close();
process.exit(silent.length || errors.length ? 1 : 0);
