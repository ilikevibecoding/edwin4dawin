#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Two framings the standard views never give the vegetation: the far tree
// rings on the skyline, and one acacia crown filling the frame at close range.
//
//   node tools/veg_horizon.mjs --url "http://127.0.0.1:5208/?quality=fast&time=dusk" \
//        --out shots/r2_veg/dusk [--views horizon,crown] [--width 640 --height 360]
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const baseUrl = arg('url', 'http://127.0.0.1:5208/?quality=fast');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1';
const width = Number(arg('width', '640'));
const height = Number(arg('height', '360'));
const outDir = arg('out', 'shots/r2_veg/extra');
const views = arg('views', 'horizon,crown').split(',');
// regex of object names to hide before every capture, to find out what a band
// on the skyline actually is (e.g. --hide "treeline_|forestSkirt")
const hide = arg('hide', '');
// which named lions.mjs view the truck is placed for ('' keeps mainroad)
const setView = arg('setview', 'mainroad');

const launchArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=4096'];
const log = (...a) => console.log('[veg_horizon]', ...a);

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "import '/@vite/env';" }));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await page.evaluate((v) => window.debugAPI.setView(v), setView);

  const stats = {};
  for (const spec of views) {
    // "pride:treeline_" hides matching objects for this capture only
    const [view, hideThis] = spec.split(':');
    const t1 = Date.now();
    const r = await page.evaluate(
      ({ view, hide }) => {
        const api = window.debugAPI;
        const { camera, vehicle, terrain, forest, skyRig, wildlife, scene } = api.objects;
        const tp = vehicle.root.position;
        scene.traverse((o) => {
          if (o.userData.__vegHid) {
            o.visible = true;
            delete o.userData.__vegHid;
          }
        });
        if (hide) {
          const re = new RegExp(hide);
          scene.traverse((o) => {
            if (o.name && re.test(o.name) && o.visible) {
              o.visible = false;
              o.userData.__vegHid = true;
            }
          });
        }
        if (view === 'pride') {
          // lions.mjs's parking and `far` framing: truck on the mainline at
          // t = 0.84, camera on the truck-to-anchor line 22 m out
          const { driver } = api.objects;
          api.pause();
          const a = wildlife.anchor;
          const p = terrain.mainPoint(0.84);
          const tan = terrain.mainTangent(0.84);
          driver.state.auto = false;
          driver.state.speed = 0;
          driver.state.pos.set(p.x, p.y, p.z);
          driver.state.heading = Math.atan2(tan.x, tan.z);
          for (let i = 0; i < 90; i++) driver.update(1 / 60);
          vehicle.root.updateMatrixWorld(true);
          skyRig.follow(vehicle.root.position);
          const dx = tp.x - a.x;
          const dz = tp.z - a.z;
          const d = Math.hypot(dx, dz) || 1;
          const k = Math.min(22, d) / d;
          const cx = a.x + dx * k;
          const cz = a.z + dz * k;
          camera.position.set(cx, terrain.heightAt(cx, cz) + 2.1, cz);
          camera.fov = 30;
          camera.lookAt(a.x, a.y + 0.5, a.z);
        } else if (view === 'horizon') {
          // six metres over the truck, looking down-sun so the rings are lit
          // the way the terrain behind them is, with the horizon a third down
          const sd = skyRig.sun.position.clone().normalize();
          const yaw = Math.atan2(-sd.x, -sd.z);
          camera.position.set(tp.x, terrain.heightAt(tp.x, tp.z) + 6, tp.z);
          camera.fov = 30;
          camera.lookAt(tp.x + Math.sin(yaw) * 400, camera.position.y + 12, tp.z + Math.cos(yaw) * 400);
        } else {
          // the nearest umbrella acacia to the truck, crown against the sky
          // from twelve metres and head height
          let best = null;
          forest.group.traverse((o) => {
            if (!o.isInstancedMesh || !/tree_(umbrella|flat)_foliage$/.test(o.name)) return;
            const m = new camera.matrixWorld.constructor();
            const p = camera.position.clone();
            for (let i = 0; i < o.count; i++) {
              o.getMatrixAt(i, m);
              p.setFromMatrixPosition(m);
              const d = Math.hypot(p.x - tp.x, p.z - tp.z);
              if (!best || d < best.d) best = { d, x: p.x, z: p.z, sy: Math.hypot(m.elements[4], m.elements[5], m.elements[6]) };
            }
          });
          const h = terrain.heightAt(best.x, best.z);
          const dx = tp.x - best.x;
          const dz = tp.z - best.z;
          const dd = Math.hypot(dx, dz) || 1;
          camera.position.set(best.x + (dx / dd) * 13, h + 1.7, best.z + (dz / dd) * 13);
          camera.fov = 42;
          camera.lookAt(best.x, h + 5.2 * best.sy, best.z);
        }
        camera.updateProjectionMatrix();
        const dataUrl = api.captureFrame(2);
        return { dataUrl, stats: api.stats(), luma: api.sampleLuma() };
      },
      { view, hide: hideThis || hide },
    );
    const file = path.join(outDir, `${view}${hideThis ? '_hide_' + hideThis.replace(/[^a-z0-9]+/gi, '') : ''}.png`);
    await writeFile(file, Buffer.from(r.dataUrl.split(',')[1], 'base64'));
    stats[spec] = { ...r.stats, luma: r.luma };
    log(`${view} -> ${file} (${((Date.now() - t1) / 1000).toFixed(1)}s)`, JSON.stringify(r.stats));
  }
  await writeFile(path.join(outDir, 'extra_stats.json'), JSON.stringify({ stats, errors }, null, 2));
  if (errors.length) log('errors:', errors);
  await browser.close();
  log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
