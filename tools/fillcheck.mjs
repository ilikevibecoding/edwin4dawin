// Report live particle counts and the largest particle sizes around a launch,
// which is the peak fill-rate moment in the game.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox','--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto('http://127.0.0.1:5173/?test=1&seed=7777', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const G = window.__GAME;
  const g = window.__gameInstance;
  G.freezePlayer(true);
  G.restart();
  G.configure({ scenario: 'saturation', condition: 'day', battery: 'thaad' });
  G.teleport(2, null, 26);
  G.start();
  const samples = [];
  const sizeStats = (sys) => {
    let n = 0, big = 0, sum = 0, max = 0;
    for (let i = 0; i < sys.capacity; i++) {
      if (!sys.live[i]) continue;
      n++;
      const t = sys.age[i] / sys.life[i];
      const s = sys.size0[i] + (sys.size1[i] - sys.size0[i]) * t;
      sum += s; max = Math.max(max, s);
      if (s > 25) big++;
    }
    return { n, big, avg: n ? +(sum / n).toFixed(1) : 0, max: +max.toFixed(1) };
  };
  for (let i = 0; i < 60 * 60; i++) {
    G.stepOnce();
    if (i % 21 === 0) G.autoPilot();
    if (i % 30 === 0) {
      samples.push({
        t: +(i / 60).toFixed(1),
        smoke: sizeStats(g.effects.smoke),
        dust: sizeStats(g.effects.dust),
        fire: sizeStats(g.effects.fire),
      });
    }
  }
  const peak = samples.reduce((a, b) => (b.smoke.n + b.dust.n > a.smoke.n + a.dust.n ? b : a));
  return { peak, tail: samples.slice(-3), capacities: { smoke: g.effects.smoke.capacity, dust: g.effects.dust.capacity, fire: g.effects.fire.capacity } };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
