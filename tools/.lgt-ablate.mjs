/**
 * Scratch diagnostic: which term is lighting the cafe's ceiling. Not in the build.
 *
 * The review measured the ceiling sixteen times brighter than the floor and read
 * it as an ambient failure. Four terms can put light on that ceiling — the key
 * light through the cascades, the prefiltered probe scaled by sky visibility,
 * the SH bounce grid, and the pendant lamp hanging half a metre under it — and
 * arguing about which from probe values alone has not worked. This renders the
 * frame with each turned off in turn and measures the pixels.
 *
 *   node tools/.lgt-ablate.mjs [shot]
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'cafe_window';
const OUT = 'shots/.ablate';
mkdirSync(OUT, { recursive: true });

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=640,360',
  ],
  protocolTimeout: 1800000,
  defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });
await page.waitForFunction((s) => window.__GAME__.listShots().includes(s), {
  timeout: 600000, polling: 250,
}, SHOT);

/* Install the hook once: it wraps the lighting system's update so an ablation
   can be applied after the rig has written its uniforms and before the post
   chain reads them. */
await page.evaluate((shot) => {
  const g = window.__GAME__;
  const engine = g.engine;
  g.pose(shot);
  const lighting = engine.get('lighting');
  const scene = engine.scene;

  const lamps = [];
  scene.traverse((o) => {
    if (o.isPointLight || o.isSpotLight) lamps.push({ light: o, intensity: o.intensity });
  });

  const gtao = engine.get('render')?.gtao ?? null;

  window.__ABL__ = { mode: 'all', lamps, hasGtao: !!gtao };
  const orig = lighting.update.bind(lighting);
  lighting.update = (dt, ctx) => {
    const mode = window.__ABL__.mode;
    /* Local lights are packed during update, so they have to be silenced
       before it runs and restored after. */
    if (mode === 'nolocal') for (const l of lamps) l.light.intensity = 0;
    else for (const l of lamps) l.light.intensity = l.intensity;
    orig(dt, ctx);
    const u = lighting.uniforms;
    if (mode === 'nosun') u.uSunRadiance.value.set(0, 0, 0);
    if (mode === 'noibl') scene.environmentIntensity = 0;
    else scene.environmentIntensity = 1;
    if (mode === 'nogrid' && lighting.grid) lighting.grid.visible = false;
    else if (lighting.grid) lighting.grid.visible = true;
    if (gtao) gtao.intensity = mode === 'noao' ? 0 : 1;
  };
  for (let i = 0; i < 240; i++) engine.step(1 / 60);
}, SHOT);

const hasGtao = await page.evaluate(() => window.__ABL__.hasGtao);
console.log(`ambient-occlusion pass reachable: ${hasGtao}`);

const MODES = ['all', 'nosun', 'noibl', 'nogrid', 'nolocal', 'noao'];
for (const mode of MODES) {
  await page.evaluate((m) => {
    window.__ABL__.mode = m;
    for (let i = 0; i < 24; i++) window.__GAME__.engine.step(1 / 60);
  }, mode);
  const buf = await page.screenshot({ type: 'png' });
  writeFileSync(`${OUT}/${SHOT}-${mode}.png`, buf);
  console.log(`wrote ${OUT}/${SHOT}-${mode}.png`);
}

await browser.close();
