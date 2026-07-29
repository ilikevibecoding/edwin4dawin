#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// Measures ride quality.
//
//   node tools/ride.mjs --url http://127.0.0.1:5185 --cams chase,hood,interior
//
// "Bumpy" is a property of the motion over time. It is invisible in a
// screenshot and unreliable to judge by watching, so this steps the driver and
// the camera rig by hand through window.debugAPI.objects and reports numbers.
//
// Stepping from here rather than from an entry point inside the app is what
// lets the same probe run against an older build for comparison, which is the
// only way to say whether a ride change actually helped.
//
// The figure that matters is the RMS of the second difference: acceleration
// high-passes the signal for free, so the terrain's slow rise and fall drops
// out and what is left is exactly the chop you feel. Sustained vertical
// acceleration much over 1 m/s^2 is a rough ride; angular acceleration is what
// makes a first-person camera unpleasant, and it is usually the worse of the
// two.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const url = arg('url', 'http://127.0.0.1:5185/?quality=fast');
const cams = arg('cams', 'chase,hood,interior').split(',');
const steps = Number(arg('steps', '1200'));
const label = arg('label', '');

/** RMS of the second difference, i.e. of the acceleration. */
function accelRms(series, dt) {
  let sum = 0;
  let n = 0;
  for (let i = 1; i < series.length - 1; i++) {
    const a = (series[i + 1] - 2 * series[i] + series[i - 1]) / (dt * dt);
    sum += a * a;
    n++;
  }
  return Math.sqrt(sum / Math.max(1, n));
}

/** Biggest excursion left after a slow trend is removed, i.e. the worst single jolt. */
function detrendedRange(series, window = 90) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < series.length; i++) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - window); j <= Math.min(series.length - 1, i + window); j++) {
      s += series[j];
      c++;
    }
    const d = series[i] - s / c;
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  }
  return hi - lo;
}

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.log('[ride] page error:', e.message));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
await page.evaluate(() => window.debugAPI.pause());
console.log(`[ride] booted${label ? `  (${label})` : ''}`);

console.log('  cam         vert accel   pitch accel   yaw accel   heave p-p   pitch p-p');
console.log('  ----------  -----------  ------------  ----------  ----------  ----------');
const results = {};
for (const cam of cams) {
  const r = await page.evaluate(
    ({ cam, steps, dt, startT, speed, settle }) => {
      const { driver, rig, vehicle, camera, terrain } = window.debugAPI.objects;
      driver.state.auto = true;
      driver.state.autoT = startT;
      const p = terrain.roadPoint(startT);
      const t = terrain.roadTangent(startT);
      driver.state.pos.copy(p);
      driver.state.heading = Math.atan2(t.x, t.z);
      driver.state.speed = speed;
      if (cam === 'interior') rig.showView('interior');
      else rig.mode = cam;

      // The rig took a bare speed before free look was added and takes the
      // whole driver state after; probe for it so one tool covers both builds.
      const modern = typeof rig.lookBy === 'function';
      const step = () => {
        driver.update(dt);
        rig.update(dt, modern ? driver.state : driver.state.speed);
      };
      for (let i = 0; i < settle; i++) step();

      const out = { dt, camY: [], bodyY: [], pitch: [], yaw: [], roll: [] };
      let prevYaw = null;
      let turns = 0;
      for (let i = 0; i < steps; i++) {
        step();
        // read the look direction straight off the matrix, so this needs
        // nothing from THREE that the page has not already exposed
        camera.updateWorldMatrix(true, false);
        const e = camera.matrixWorld.elements;
        const l = Math.hypot(e[8], e[9], e[10]) || 1;
        const dy = -e[9] / l;
        const raw = Math.atan2(-e[8] / l, -e[10] / l);
        // unwrap, or the wrap at pi reads as an enormous angular acceleration
        if (prevYaw !== null) {
          const d = raw - prevYaw;
          if (d > Math.PI) turns--;
          else if (d < -Math.PI) turns++;
        }
        prevYaw = raw;
        const yaw = raw + turns * 2 * Math.PI;

        out.camY.push(camera.position.y);
        out.bodyY.push(vehicle.root.position.y);
        out.pitch.push(Math.asin(Math.max(-1, Math.min(1, dy))));
        out.yaw.push(yaw);
        out.roll.push(vehicle.sprung.rotation.z);
      }
      return out;
    },
    { cam, steps, dt: 1 / 60, startT: 0.42, speed: 9.5, settle: 300 },
  );
  const row = {
    vert: accelRms(r.camY, r.dt),
    pitch: accelRms(r.pitch, r.dt),
    yaw: accelRms(r.yaw, r.dt),
    heavePP: detrendedRange(r.camY),
    pitchPP: detrendedRange(r.pitch),
  };
  results[cam] = row;
  console.log(
    `  ${cam.padEnd(10)}  ${row.vert.toFixed(3).padStart(9)}  ${row.pitch.toFixed(3).padStart(12)}` +
      `  ${row.yaw.toFixed(3).padStart(10)}  ${row.heavePP.toFixed(3).padStart(10)}  ${row.pitchPP.toFixed(3).padStart(10)}`,
  );
}
console.log('\n  units: m/s^2, rad/s^2, rad/s^2, m, rad');
console.log(JSON.stringify({ label, results }));

// The instruments are driven from the driver's state through the vehicle, so
// the only way to know the chain is connected is to drive it and read the
// needles back off the scene graph at two different speeds.
if (argv.includes('--gauges')) {
  const g = await page.evaluate(
    ({ dt }) => {
      const { driver, vehicle, terrain } = window.debugAPI.objects;
      const inst = vehicle.root.getObjectByName('interior')?.userData.instruments;
      if (!inst?.readings) return { missing: true };
      const run = (speed) => {
        driver.state.auto = true;
        driver.state.autoT = 0.42;
        const p = terrain.roadPoint(0.42);
        driver.state.pos.copy(p);
        driver.state.speed = speed;
        for (let i = 0; i < 240; i++) {
          driver.state.speed = speed;
          driver.update(dt);
        }
        const r = inst.readings();
        return { speed, rpm: driver.state.rpm, readings: r };
      };
      return { idle: run(0), cruise: run(6), flat: run(13) };
    },
    { dt: 1 / 60 },
  );
  if (g.missing) {
    console.log('\n[ride] no instruments found on the cabin group');
  } else {
    console.log('\n  instruments, driven through the driver:');
    const ids = Object.keys(g.flat.readings);
    console.log(`  ${'dial'.padEnd(10)}  ${ids.map((i) => i.padStart(9)).join('')}`);
    for (const k of ['idle', 'cruise', 'flat']) {
      const row = ids.map((i) => g[k].readings[i].angle.toFixed(2).padStart(9)).join('');
      console.log(`  ${`${k} ${g[k].speed}m/s`.padEnd(10)}  ${row}`);
    }
  }
}

await browser.close();
