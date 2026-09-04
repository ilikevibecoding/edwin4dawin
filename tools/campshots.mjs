#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Framings for the campground.
//
//   node tools/campshots.mjs --iter 1 --url http://127.0.0.1:5194/ \
//     --views arrive,interior,overhead,beyond,fire,mess [--time night]
//
// Cameras are placed in the camp's own frame — u along the mainline, v away
// from it into the clearing, y above the anchor's ground — so a framing is the
// same picture whatever the terrain agent does to the pad. The truck is parked
// on the mainline beside the camp for every view except `arrive`, where it is
// still coming.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const iter = arg('iter', '0');
const base = arg('url', 'http://127.0.0.1:5194/');
const time = arg('time', 'day');
const quality = arg('quality', 'fast');
const url = base + (base.includes('?') ? '&' : '?') + `quality=${quality}&capture=1&time=${time}`;
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', path.join('shots', `camp_${iter}`));
const only = arg('views', '');
const noForest = argv.includes('--noforest');

// [u, y, v] positions; `truckU` is where the truck sits along the road.
const FRAMINGS = {
  // Coming along the mainline, camp opening up ahead-right.
  arrive: { pos: [-64, 3.6, -33.5], target: [-6, 1.8, -12], fov: 50, truckU: -46 },
  // From the driver's eye, through the passenger side, as the truck passes the gate.
  interior: { eye: [0.3, 1.6, -0.16], target: [-2, 1.8, 6], fov: 64, truckU: -4 },
  // Straight down, high enough to hold the whole clearing and the road.
  overhead: { pos: [-4, 78, -18], target: [0, 0, 4], fov: 50, truckU: -4 },
  // From the road beyond the camp looking back.
  beyond: { pos: [56, 3.0, -31], target: [8, 1.4, 2], fov: 44, truckU: -4 },
  // Standing at the fire looking toward the mess tent and the tent line.
  fire: { pos: [9, 1.7, -2], target: [-6, 1.6, 12], fov: 56, truckU: -4 },
  // The kitchen end from the mess tent.
  mess: { pos: [-1, 1.6, 4], target: [-16, 1.5, 12], fov: 52, truckU: -4 },
  // The cabin, mast and solar from the apron.
  cabin: { pos: [7, 1.8, -5.5], target: [19, 3.5, 4], fov: 50, truckU: -4 },
  // Along the parking row from the gate.
  apron: { pos: [-22, 2.2, -19], target: [8, 1.2, -9], fov: 54, truckU: -4 },
  // A guest tent from its veranda side, close.
  tent: { pos: [-4.5, 1.6, 12.5], target: [0.8, 1.6, 19.5], fov: 50, truckU: -4 },
  // The gate and the entrance track from the road edge.
  gate: { pos: [-16, 1.9, -30], target: [-4, 2.0, -20], fov: 50, truckU: -4 },
  // From the savanna behind the tents, back toward the road.
  behind: { pos: [12, 3.5, 38], target: [-2, 1.5, 6], fov: 50, truckU: -4 },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=4096'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.error(`[console:${m.type()}]`, m.text());
});

// Six agents edit this tree while we render, and any of their saves can make
// Vite's HMR client reload the page mid-capture. Serve the real client (it
// also carries the config's `define` globals) with its page reload disarmed.
await page.route('**/@vite/client', async (route) => {
  const res = await route.fetch();
  const body = (await res.text()).replace(/location\.reload\(\)/g, 'void 0');
  await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'application/javascript' } });
});

const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('boot failed:\n' + err);
  await browser.close();
  process.exit(1);
}
const info = await page.evaluate(() => {
  const { camp } = window.debugAPI.objects;
  return { anchor: camp.anchor, stats: camp.stats, parking: camp.parking, lights: camp.lights.length, scene: window.debugAPI.stats() };
});
console.log(`[camp] booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`[camp] anchor (${info.anchor.x.toFixed(1)}, ${info.anchor.y.toFixed(1)}, ${info.anchor.z.toFixed(1)})`);
console.log(`[camp] stats ${JSON.stringify(info.stats)}`);
console.log(`[camp] scene ${JSON.stringify(info.scene)}`);
console.log(`[camp] ${info.parking.length} parking slots, ${info.lights} lights`);

const names = only ? only.split(',') : Object.keys(FRAMINGS);
for (const name of names) {
  const f = FRAMINGS[name];
  if (!f) continue;
  const ts = Date.now();
  const out = await page.evaluate(
    ([fr, noForest]) => {
      const { camera, vehicle, terrain, driver, camp, forest } = window.debugAPI.objects;
      // until the vegetation agent clears the pad, the forest stands in the camp
      if (forest && forest.group) forest.group.visible = !noForest;
      window.debugAPI.setView('forest');
      const a = camp.anchor;
      // camp frame -> world
      const world = (c) => ({
        x: a.x + a.tx * c[0] - a.lx * c[2],
        y: a.y + c[1],
        z: a.z + a.tz * c[0] - a.lz * c[2],
      });
      // truck on the mainline, auto-drive off so it stays put
      const L = terrain.mainLength;
      const t = 0.6 + fr.truckU / L;
      const p = terrain.mainPoint(t);
      const tan = terrain.mainTangent(t);
      driver.state.auto = false;
      driver.state.speed = 0;
      driver.state.pos.set(p.x, p.y, p.z);
      driver.state.heading = Math.atan2(tan.x, tan.z);
      for (let i = 0; i < 90; i++) driver.update(1 / 60);
      vehicle.root.updateMatrixWorld(true);
      // the frame loop moves the shadow frustum with the truck; do the same here
      // or the camp is shot with the shadows still back at the spur
      window.debugAPI.objects.skyRig?.follow(vehicle.root.position);
      // advance the camp so flames and lamps are mid-motion, not at t = 0
      for (let i = 0; i < 60; i++) camp.update(1 / 60, i / 60, {});

      let cp;
      if (fr.eye) {
        const e = fr.eye;
        const m = vehicle.root.matrixWorld.elements;
        cp = {
          x: m[0] * e[0] + m[4] * e[1] + m[8] * e[2] + m[12],
          y: m[1] * e[0] + m[5] * e[1] + m[9] * e[2] + m[13],
          z: m[2] * e[0] + m[6] * e[1] + m[10] * e[2] + m[14],
        };
      } else {
        cp = world(fr.pos);
      }
      const ct = world(fr.target);
      camera.position.set(cp.x, cp.y, cp.z);
      camera.fov = fr.fov;
      camera.lookAt(ct.x, ct.y, ct.z);
      camera.updateProjectionMatrix();
      const dataUrl = window.debugAPI.captureFrame(2);
      const luma = window.debugAPI.sampleLuma();
      return { dataUrl, luma, stats: window.debugAPI.stats() };
    },
    [f, noForest],
  );
  const file = path.join(outDir, `camp_${name}${time === 'day' ? '' : '_' + time}.png`);
  await writeFile(file, Buffer.from(out.dataUrl.split(',')[1], 'base64'));
  console.log(
    `[camp] ${name} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, luma ${out.luma.mean.toFixed(3)}/${out.luma.max.toFixed(2)}, calls ${out.stats.calls}, tris ${out.stats.triangles})`,
  );
}
await browser.close();
