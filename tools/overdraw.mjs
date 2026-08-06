// Estimate particle overdraw in full-screen equivalents. Particle count alone is
// misleading: a 50 m puff 20 km away is ~3 px across, while a 40 m puff 60 m from
// the camera fills a third of the frame. This projects every live particle and
// sums its screen area.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox','--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5173/?test=1&seed=7777', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90000 });
const r = await page.evaluate(() => {
  const G = window.__GAME;
  const g = window.__gameInstance;
  G.freezePlayer(true);
  G.restart();
  G.configure({ scenario: 'saturation', condition: 'day', battery: 'patriot' });
  // stand near the PALISADE pad: the worst case for plume overdraw
  G.teleport(-40, null, -14);
  G.lookAt(-52, 20, -30);
  G.start();
  const H = 720, W = 1280;
  const vfov = g.camera.fov * Math.PI / 180;
  const measure = () => {
    const cam = g.camera.position;
    let screens = 0, near = 0;
    const per = {};
    for (const [name, sys] of [['smoke', g.effects.smoke], ['dust', g.effects.dust], ['fire', g.effects.fire]]) {
      per[name] = 0;
      for (let i = 0; i < sys.capacity; i++) {
        if (!sys.live[i]) continue;
        const dx = sys.px[i] - cam.x, dy = sys.py[i] - cam.y, dz = sys.pz[i] - cam.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < 1) continue;
        const t = sys.age[i] / sys.life[i];
        const s = sys.size0[i] + (sys.size1[i] - sys.size0[i]) * t;
        const px = (s / d) / (2 * Math.tan(vfov / 2)) * H;
        const area = Math.PI * (px / 2) * (px / 2);
        screens += area / (W * H);
        per[name] += area / (W * H);
        if (d < 400) near++;
      }
      per[name] = +per[name].toFixed(1);
    }
    return { screens: +screens.toFixed(1), near, per };
  };
  let worst = { screens: 0 };
  const trace = [];
  for (let i = 0; i < 60 * 45; i++) {
    G.stepOnce();
    if (i % 21 === 0) G.autoPilot();
    if (i % 10 === 0) {
      const m = measure();
      m.t = +(i / 60).toFixed(1);
      if (m.screens > worst.screens) worst = m;
      if (i % 120 === 0) trace.push(m);
    }
  }
  return { worst, trace, density: g.effects.density };
});
console.log('density', r.density, 'worst', JSON.stringify(r.worst));
console.log('trace  ', r.trace.map((m) => `${m.t}s:${m.screens}`).join('  '));
await browser.close();
