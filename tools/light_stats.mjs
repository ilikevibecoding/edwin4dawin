#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// Boot once and report the structural numbers the shadow work moves: draw
// calls, programs (by shader name), textures, and the shadow rig's own state.
//
//   node tools/light_stats.mjs --url "http://127.0.0.1:5204/?quality=fast" [--view hero] [--time day]
//
// `renderer.info.render.calls` is read off the beauty pass through the post
// chain's sceneStats, so it counts the shadow passes the way the perf tool
// does. Programs are grouped by shader name so a change that adds depth
// permutations shows up as depth permutations rather than as a bare total.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5204/?quality=fast');
const view = arg('view', 'hero');
const time = arg('time', '');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1' + (time ? `&time=${time}` : '');

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "import '/@vite/env';" }));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('boot failed:\n' + err);
  await browser.close();
  process.exit(1);
}
const out = await page.evaluate((v) => {
  const api = window.debugAPI;
  api.setView(v);
  api.renderFrames(2);
  const { renderer, skyRig, scene } = api.objects;
  // Per-frame series: the far cascade renders on a cadence, so the frames
  // that carry its pass stand out from the held ones and the difference is
  // the pass's own cost in calls and triangles.
  const series = [];
  const { vehicle } = api.objects;
  for (let i = 0; i < 6; i++) {
    // the frame loop's own step: `follow` is what decides whether the far map
    // is re-rendered this frame, and `renderFrames` alone never calls it
    skyRig.follow(vehicle.root.position);
    api.renderFrames(1);
    const st = api.stats();
    series.push({ calls: st.calls, tris: st.triangles });
  }
  const farCasters = { meshes: 0, layerOn: 0 };
  scene.traverse((o) => {
    if (!o.isMesh || !o.castShadow) return;
    farCasters.meshes++;
    if (o.layers.mask & (1 << 21)) farCasters.layerOn++;
  });
  const byName = {};
  for (const p of renderer.info.programs || []) {
    const n = p.name || '?';
    byName[n] = (byName[n] || 0) + 1;
  }
  const shadowLights = [];
  scene.traverse((o) => {
    if (o.isLight && o.castShadow && o.shadow) {
      const c = o.shadow.camera;
      shadowLights.push({
        name: o.name || o.type,
        intensity: o.intensity,
        map: [o.shadow.mapSize.x, o.shadow.mapSize.y],
        box: [c.left, c.right, c.bottom, c.top],
        near: c.near,
        far: c.far,
        autoUpdate: o.shadow.autoUpdate,
        bias: o.shadow.bias,
        normalBias: o.shadow.normalBias,
      });
    }
  });
  return {
    build: api.build,
    stats: api.stats(),
    luma: api.sampleLuma(),
    shadowLights,
    sunDir: skyRig.sunDir.toArray().map((x) => +x.toFixed(3)),
    programsByName: byName,
    series,
    // in the main pass (with `?farcull=off`) the far map shows as the gap
    // between held and rendered frames; in its own pass the rig counts it
    farPass: skyRig.farPass ? skyRig.farPass() : null,
    farPassInFrame: { calls: Math.max(...series.map((s) => s.calls)) - Math.min(...series.map((s) => s.calls)), tris: Math.max(...series.map((s) => s.tris)) - Math.min(...series.map((s) => s.tris)) },
    farCasters,
  };
}, view);
await browser.close();
out.bootSeconds = +((Date.now() - t0) / 1000).toFixed(1);
out.errors = errors;
console.log(JSON.stringify(out, null, 1));
