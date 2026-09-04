#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Fleet contact sheet.
//
//   node tools/fleetshots.mjs --out shots/fleet --times day,night \
//     --kinds suv,pickup --angle 0.6 --row 1
//   node tools/fleetshots.mjs --url "http://127.0.0.1:5195/tools/stage/fleet.html?quality=high" \
//     --out shots/fleet --focus wheel --suffix _wheel
//
// Boots the app once (or the fleet-only stage in tools/stage/, which has one
// of every kind in a line and boots in seconds), freezes the sim, then walks
// the parked fleet and frames each vehicle from the same relative camera
// (front three-quarter by default, `--angle` in radians off the nose, `--dist`
// scales the distance, `--lift` the camera height) so the silhouettes can be
// compared side by side. `--row 1` adds a line-up shot down the parking row,
// `--focus wheel` frames the front-right wheel, `--only <name>` picks one
// vehicle, `--suffix` tags the files of an alternate framing. `--times`
// repeats the set at each time of day. Also dumps the fleet's stats (vehicles,
// draw calls, triangles) and the renderer's frame info.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const outDir = arg('out', 'shots/fleet');
const width = Number(arg('width', '480'));
const height = Number(arg('height', '270'));
const url = arg('url', 'http://127.0.0.1:5195/?quality=fast&fleet=high') + '&capture=1';
const times = arg('times', 'day').split(',').filter(Boolean);
const kinds = arg('kinds', '').split(',').filter(Boolean);
const angle = Number(arg('angle', '0.55'));
const distK = Number(arg('dist', '1'));
const lift = Number(arg('lift', '0.5'));
const fov = Number(arg('fov', '38'));
const row = arg('row', '0') !== '0';
const only = arg('only', ''); // one vehicle name, e.g. safari-jeep_1
const suffix = arg('suffix', ''); // appended to file names, for alternate framings
const focus = arg('focus', ''); // 'wheel' frames the front-right wheel instead of the body
const log = (...a) => console.log('[fleet]', ...a);

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  // Five agents save files while this runs; Vite's HMR would reload the page
  // mid-sweep. Deny it its socket.
  await page.addInitScript(() => {
    window.WebSocket = class {
      constructor() {
        setTimeout(() => this.onerror?.(new Event('error')), 0);
      }
      addEventListener() {}
      removeEventListener() {}
      send() {}
      close() {}
    };
  });
  page.on('pageerror', (e) => log('page error:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') log(`[page:${m.type()}]`, m.text().slice(0, 300));
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) throw new Error(`boot failed: ${JSON.stringify(err)}`);
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const info = await page.evaluate(() => {
    const { fleet, renderer } = window.debugAPI.objects;
    window.debugAPI.pause();
    return {
      stats: fleet.stats,
      vehicles: fleet.vehicles.map((v) => ({
        name: v.name,
        kind: v.kind,
        pos: v.root.position.toArray(),
        heading: v.heading,
        length: v.length,
        height: v.height,
        lit: v.lit,
        wheels: v.wheels,
        paint: v.variant?.paintName,
        age: v.variant?.age,
        glass: v.variant?.glassKey,
        broken: v.variant?.brokenPane,
      })),
      render: { calls: renderer.info.render.calls, tris: renderer.info.render.triangles },
    };
  });
  log('stats', JSON.stringify(info.stats));
  for (const v of info.vehicles) log(`  ${v.name.padEnd(20)} ${v.paint?.padEnd(12)} age=${v.age?.toFixed(2)} glass=${v.glass}${v.broken ? ' CRACKED' : ''}${v.lit ? ' LIT' : ''}`);

  const list = info.vehicles.filter((v) => (!kinds.length || kinds.includes(v.kind)) && (!only || v.name === only));

  for (const time of times) {
    await page.evaluate((t) => {
      window.debugAPI.setTimeOfDay(t);
      window.debugAPI.objects.fleet.setTimeOfDay?.(t);
    }, time);
    for (const v of list) {
      const t1 = Date.now();
      const dataUrl = await page.evaluate(
        ({ v, angle, distK, lift, fov, focus }) => {
          const { camera, skyRig } = window.debugAPI.objects;
          const [x, y, z] = v.pos;
          const len = v.length[1] - v.length[0];
          const cz = (v.length[0] + v.length[1]) * 0.5;
          const h = v.heading;
          const fx = Math.sin(h);
          const fz = Math.cos(h);
          let centre = [x + fx * cz, y + v.height * 0.45, z + fz * cz];
          let d = Math.max(len, v.height * 1.6) * 1.15 * distK + 1.6;
          let camY = y + v.height * lift + 0.9 * distK;
          if (focus === 'wheel' && v.wheels?.length) {
            const w = v.wheels[0];
            // vehicle-local (w.x, w.r, w.z) to world
            centre = [x + Math.cos(h) * w.x + fx * w.z, y + w.r, z - Math.sin(h) * w.x + fz * w.z];
            d = w.r * 4.5 * distK;
            camY = y + w.r * 1.6;
          }
          const a = h + angle;
          camera.position.set(centre[0] + Math.sin(a) * d, camY, centre[2] + Math.cos(a) * d);
          camera.fov = fov;
          camera.lookAt(centre[0], centre[1], centre[2]);
          camera.updateProjectionMatrix();
          skyRig.follow?.(camera.position);
          return window.debugAPI.captureFrame(2);
        },
        { v, angle, distK, lift, fov, focus },
      );
      const file = path.join(outDir, `${v.name}_${time}${suffix}.png`);
      await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
      log(`${v.name} ${time} -> ${file} (${((Date.now() - t1) / 1000).toFixed(1)}s)`);
    }
    if (row) {
      const t1 = Date.now();
      const dataUrl = await page.evaluate(
        ({ fov }) => {
          const { camera, skyRig, fleet } = window.debugAPI.objects;
          const vs = fleet.vehicles;
          const cx = vs.reduce((s, v) => s + v.root.position.x, 0) / vs.length;
          const cz = vs.reduce((s, v) => s + v.root.position.z, 0) / vs.length;
          const cy = vs.reduce((s, v) => s + v.root.position.y, 0) / vs.length;
          // along the row: the principal axis of the positions
          let sxx = 0;
          let szz = 0;
          let sxz = 0;
          for (const v of vs) {
            const dx = v.root.position.x - cx;
            const dz = v.root.position.z - cz;
            sxx += dx * dx;
            szz += dz * dz;
            sxz += dx * dz;
          }
          const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);
          const ax = Math.cos(ang);
          const az = Math.sin(ang);
          const spread = Math.sqrt(Math.max(sxx, szz) / vs.length) * 2.2;
          // a line-up: from just past one end of the row, off the vehicles' noses,
          // looking down the row so every silhouette overlaps the next
          const nx = -az;
          const nz = ax;
          const side = Math.sign(nx * Math.sin(vs[0].heading) + nz * Math.cos(vs[0].heading)) || 1;
          const ex = cx - ax * spread * 0.72;
          const ez = cz - az * spread * 0.72;
          camera.position.set(ex - ax * 5 + nx * side * 7.5, cy + 2.8, ez - az * 5 + nz * side * 7.5);
          camera.fov = fov + 18;
          camera.lookAt(cx - ax * spread * 0.3, cy + 1.0, cz - az * spread * 0.3);
          camera.updateProjectionMatrix();
          skyRig.follow?.(camera.position);
          return window.debugAPI.captureFrame(2);
        },
        { fov },
      );
      const file = path.join(outDir, `row_${time}.png`);
      await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
      log(`row ${time} -> ${file} (${((Date.now() - t1) / 1000).toFixed(1)}s)`);
    }
  }
  const frame = await page.evaluate(() => {
    const { renderer } = window.debugAPI.objects;
    return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, programs: renderer.info.programs?.length };
  });
  log('last frame', JSON.stringify(frame));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
