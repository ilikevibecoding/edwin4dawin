// Is the sun shadow map actually running, and where is its box?
import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://127.0.0.1:8307';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?test=1&seed=20260805&quality=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });

for (const tod of ['day', 'sunset', 'night']) {
  const out = await page.evaluate((t) => {
    const G = window.__GAME;
    G.action('deploy');
    G.action(`tod:${t}`);
    G.runFor(1.0);
    G.teleport(0, undefined, 0);
    G.lookAt(20, 4, 66);
    G.render(3);
    const w = G.game.weather;
    const sun = w.sun;
    const c = sun.shadow.camera;
    const r = G.game.renderer;
    return {
      tod: t,
      shadowMapEnabled: r.shadowMap.enabled,
      shadowMapType: r.shadowMap.type,
      autoUpdate: r.shadowMap.autoUpdate,
      sunCast: sun.castShadow,
      sunIntensity: Number(sun.intensity.toFixed(2)),
      sunElevDeg: Number(((w.tod && w.tod.sunElev) * 180 / Math.PI).toFixed(1)),
      sunPos: [sun.position.x, sun.position.y, sun.position.z].map((v) => Math.round(v)),
      targetPos: [sun.target.position.x, sun.target.position.y, sun.target.position.z].map((v) => Math.round(v)),
      cam: { l: c.left, r: c.right, t: c.top, b: c.bottom, n: c.near, f: c.far },
      mapSize: [sun.shadow.mapSize.x, sun.shadow.mapSize.y],
      bias: sun.shadow.bias,
      normalBias: sun.shadow.normalBias,
      hasMap: !!sun.shadow.map,
      mapDims: sun.shadow.map ? [sun.shadow.map.width, sun.shadow.map.height] : null,
    };
  }, tod);
  console.log(JSON.stringify(out));
}

await browser.close();
process.exit(0);
