#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Drive the instrument cluster and capture a frame per reading.
//
//   node tools/gaugevar.mjs --out shots/gv_1 --cam close \
//     --states "idle:0,0.09,0,0  cruise:8.6,0.42,0.7,0  flat:13,0.86,1,0" \
//     --url "http://127.0.0.1:5192/?quality=fast"
//
// `tools/shots.mjs` freezes the sim and pre-rolls to one fixed state, so every
// capture shows the pointers at the same reading and there is no way to tell a
// live needle from a printed one. This holds the world still and drives
// `interior.userData.instruments.update` itself, settling each state before it
// shoots, and reads the mesh rotations back out so the proof is a number as
// well as a picture.
//
// A state is `name:speed,rpm,throttle,brake[,steer]` — speed in m/s, rpm
// normalised. `--lights` runs the whole set with the lamps on, which is also
// what triggers the power-on sweep.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const flag = (n) => argv.includes(`--${n}`);

const outDir = arg('out', 'shots/gaugevar');
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const url = arg('url', 'http://127.0.0.1:5192/?quality=fast') + '&capture=1';
const cams = arg('cam', 'close').split(',');
const time = arg('time', '');
const lights = flag('lights');
// how long the driver is stepped before the shot, in seconds of sim
const settle = Number(arg('settle', '4'));
// with --lights, settle with the lamps *off* and then shoot this many seconds
// into the power-on sweep instead of at rest
const sweepAt = Number(arg('sweepat', '-1'));
const states = arg('states', 'idle:0,0.09,0,0 cruise:8.6,0.42,0.7,0 flat:13,0.9,1,0')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((spec) => {
    const [name, nums] = spec.split(':');
    const v = nums.split(',').map(Number);
    return { name, speed: v[0], rpm: v[1], throttle: v[2], brake: v[3] || 0, steer: v[4] || 0 };
  });

// local-space closeups of the two dial groups
const CAMS = {
  close: { pos: [0.36, 1.6, 0.095], target: [0.38, 1.4, 0.62], fov: 31 },
  pod: { pos: [0.44, 1.6, 0.16], target: [0.62, 1.53, 0.695], fov: 20 },
  interior: null,
};

const log = (...a) => console.log('[gaugevar]', ...a);

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--js-flags=--max-old-space-size=4096',
    ],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => log('page error:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') log(`page ${m.type()}:`, m.text());
  });
  // three other agents are editing this checkout; an HMR reload lands in the
  // middle of the run otherwise
  await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) {
    console.error('[gaugevar] app failed to boot:\n' + err);
    await browser.close();
    process.exit(1);
  }
  log('booted');

  await page.evaluate(
    ({ time, view }) => {
      window.debugAPI.setView(view);
      if (time) window.debugAPI.setTimeOfDay(time);
    },
    { time, view: 'interior' },
  );

  // Step response, printed rather than rendered. Overshoot is two frames wide
  // at 60 Hz and no still can show it; the numbers can.
  if (flag('trace')) {
    const trace = await page.evaluate(() => {
      const cab = window.debugAPI.objects.vehicle.root.getObjectByName('interior');
      const inst = cab.userData.instruments;
      const rest = { speed: 0, rpm: 0.09, throttle: 0, brake: 0, maxSpeed: 13, lightsOn: false };
      for (let i = 0; i < 600; i++) inst.update(1 / 60, rest);
      const step = { speed: 11, rpm: 0.78, throttle: 1, brake: 0, maxSpeed: 13, lightsOn: false };
      const rows = [];
      for (let i = 0; i < 150; i++) {
        inst.update(1 / 60, step);
        const r = inst.readings();
        rows.push([Number((i / 60).toFixed(3)), Number(r.speed.frac.toFixed(4)), Number(r.tach.frac.toFixed(4))]);
      }
      return rows;
    });
    const peak = (i) => trace.reduce((m, r) => Math.max(m, r[i]), 0);
    const settled = trace[trace.length - 1];
    console.log('[gaugevar] step response t, speed, tach');
    for (const r of trace) if (Math.round(r[0] * 60) % 6 === 0) console.log(`  ${r[0].toFixed(3)}  ${r[1].toFixed(4)}  ${r[2].toFixed(4)}`);
    console.log(
      `[gaugevar] settled speed ${settled[1]} peak ${peak(1).toFixed(4)} (${(((peak(1) - settled[1]) / settled[1]) * 100).toFixed(1)}% over)`,
    );
    console.log(
      `[gaugevar] settled tach  ${settled[2]} peak ${peak(2).toFixed(4)} (${(((peak(2) - settled[2]) / settled[2]) * 100).toFixed(1)}% over)`,
    );
    await writeFile(path.join(outDir, 'step.json'), JSON.stringify(trace));
  }

  const report = [];
  const jobs = cams.flatMap((c) => states.map((st) => ({ st, cam: c })));
  for (const { st, cam } of jobs) {
    const t0 = Date.now();
    const res = await page.evaluate(
      ({ st, cam, settle, lights, sweepAt }) => {
        const { camera, vehicle } = window.debugAPI.objects;
        vehicle.root.updateMatrixWorld();
        if (!cam) window.debugAPI.setView('interior');
        if (cam) {
          const xf = (m, v) => {
            const e = m.elements;
            return [
              e[0] * v[0] + e[4] * v[1] + e[8] * v[2] + e[12],
              e[1] * v[0] + e[5] * v[1] + e[9] * v[2] + e[13],
              e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14],
            ];
          };
          const p = xf(vehicle.root.matrixWorld, cam.pos);
          const t = xf(vehicle.root.matrixWorld, cam.target);
          camera.position.set(p[0], p[1], p[2]);
          camera.fov = cam.fov;
          camera.lookAt(t[0], t[1], t[2]);
          camera.updateProjectionMatrix();
        }
        const cab = vehicle.root.getObjectByName('interior');
        const inst = cab && cab.userData.instruments;
        if (!inst) return { error: 'no instruments on the interior group' };
        const state = { ...st, maxSpeed: 13, lightsOn: !!lights };
        if (sweepAt >= 0) {
          const dark = { ...state, lightsOn: false };
          for (let i = 0; i < Math.round(settle * 60); i++) inst.update(1 / 60, dark);
          for (let i = 0; i < Math.max(1, Math.round(sweepAt * 60)); i++) inst.update(1 / 60, state);
        } else {
          for (let i = 0; i < Math.round(settle * 60); i++) inst.update(1 / 60, state);
        }
        const readings = inst.readings();
        // straight off the scene graph, not off the driver's own bookkeeping
        const meshes = {};
        cab.traverse((o) => {
          if (o.isMesh && o.name.startsWith('needle_')) meshes[o.name.slice(7)] = Number(o.rotation.z.toFixed(5));
        });
        return { readings, meshes, dataUrl: window.debugAPI.captureFrame(2) };
      },
      { st, cam: CAMS[cam], settle, lights, sweepAt },
    );
    if (res.error) {
      log('ERROR:', res.error);
      await browser.close();
      process.exit(1);
    }
    const tag = cams.length > 1 ? `${cam}_${st.name}` : st.name;
    const file = path.join(outDir, `${tag}.png`);
    await writeFile(file, Buffer.from(res.dataUrl.split(',')[1], 'base64'));
    const frac = Object.fromEntries(Object.entries(res.readings).map(([k, v]) => [k, Number(v.frac.toFixed(4))]));
    report.push({ shot: tag, state: st, frac, rotationZ: res.meshes });
    log(`${tag} (${((Date.now() - t0) / 1000).toFixed(1)}s) ${JSON.stringify(frac)}`);
    log(`    rotation.z ${JSON.stringify(res.meshes)}`);
  }

  await writeFile(path.join(outDir, 'needles.json'), JSON.stringify(report, null, 2));
  await browser.close();
  log(`done -> ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
