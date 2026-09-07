// Many headless screenshots from ONE Chrome instance, with boat-relative cameras:
//   node bench/reports/boats2/tools/shots2.mjs <spec.txt> [width] [height] [settleFrames]
// spec.txt: one view per line, <out.png>\t<url>[\t<cam>] where the optional third field poses the camera on a boat
// after the page is ready (the view should carry freeze=1):
//   boat:<kind>:<n>:<dist>:<azDeg>:<elDeg>[:fov]   the n-th boat under way of that kind (traffic.boats order)
//   moor:<kind>:<n>:<dist>:<azDeg>:<elDeg>[:fov]   the n-th berthed boat of that kind (traffic.moored order)
// az 0 = looking at the bow from ahead, 90 = from starboard, 180 = from astern; el = degrees above the water.
// Each view writes <out>.log.json with the render info, the boat's state and the console log.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [specPath, w = '1280', h = '720', settle = '3'] = process.argv.slice(2);
if (!specPath) { console.error('usage: shots2.mjs <spec.txt> [w] [h] [settleFrames]'); process.exit(2); }
const specs = fs.readFileSync(specPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const [out, url, cam] = l.split('\t');
  return { out, url, cam };
});

const browser = await puppeteer.launch({
  timeout: 1800000,
  protocolTimeout: 900000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
});

/** runs in the page: pose the camera on a boat and render */
function poseOnBoat(spec) {
  const [which, kind, nStr, distStr, azStr, elStr, fovStr] = spec.split(':');
  const g = window.__game, t = g.traffic;
  const list = (which === 'moor' ? t.moored : t.boats) ?? [];
  const ofKind = list.filter((b) => b.kind === kind);
  const pool = ofKind.length ? ofKind : list;
  const b = pool[Number(nStr) % Math.max(1, pool.length)];
  if (!b) return { error: `no ${which} boat of kind ${kind}`, kinds: [...new Set(list.map((q) => q.kind))] };
  const dist = Number(distStr), az = (Number(azStr) * Math.PI) / 180, el = (Number(elStr) * Math.PI) / 180;
  // hull frame: forward (hx, hz), starboard (-hz, hx); the pre-refactor batch keeps px/pz and len instead
  const bx = b.x ?? b.px, bz = b.z ?? b.pz, len = b.spec ? b.spec.len : b.len, scale = b.scale ?? 1;
  const fx = b.hx, fz = b.hz, sx = -b.hz, sz = b.hx;
  const dx = Math.cos(az) * fx + Math.sin(az) * sx, dz = Math.cos(az) * fz + Math.sin(az) * sz;
  const cy = Math.sin(el) * dist, r = Math.cos(el) * dist;
  const cam = g.camera;
  const ty = (b.spec ? Math.min(b.spec.height, b.spec.len * 0.25) * 0.35 : len * 0.09) * scale;
  cam.position.set(bx + dx * r, cy + ty, bz + dz * r);
  cam.lookAt(bx, ty, bz);
  if (fovStr) { cam.fov = Number(fovStr); cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
  // the shadow cascades are fit around the aircraft: park it behind the camera, out of frame
  g.aircraft.place(cam.position.x + dx * 40, Math.max(cam.position.y, 3), cam.position.z + dz * 40, Math.atan2(-dx, -dz), 0, 0, 0, 0);
  g.render();
  const m = b.motion;
  return { kind: b.kind, x: +bx.toFixed(1), z: +bz.toFixed(1), hdg: +((Math.atan2(b.hx, -b.hz) * 180) / Math.PI).toFixed(0), speed: b.speed !== undefined ? +b.speed.toFixed(1) : 0, len: +len.toFixed(1), scale: +scale.toFixed(2), lod: b.lod, heave: m ? +m.heave.toFixed(3) : null, roll: m ? +((m.roll * 180) / Math.PI).toFixed(1) : null, pitch: m ? +((m.pitch * 180) / Math.PI).toFixed(1) : null, cam: cam.position.toArray().map((v) => +v.toFixed(1)) };
}

async function shoot({ out, url, cam }, attempt) {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const t0 = Date.now();
  let ready = false;
  let result;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 * attempt });
    try {
      await page.waitForFunction('window.__ready === true', { timeout: 300000 * attempt, polling: 200 });
      ready = true;
    } catch { logs.push('[shots] timeout waiting for __ready'); }
    let boat = null;
    if (cam) boat = await page.evaluate(poseOnBoat, cam);
    for (let i = 0; i < Number(settle); i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    if (cam) await page.evaluate(() => window.__game.render());
    const info = await page.evaluate(() => {
      const r = window.__game?.renderer;
      const t = window.__game?.traffic;
      return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, programs: r.info.programs?.length, build: window.__build, boats: t?.boatCount } : null;
    });
    await page.screenshot({ path: out, type: 'png' });
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, cam, boat, ready, attempt, ms: Date.now() - t0, info, logs: logs.slice(0, 40) }, null, 2));
    console.log(`${ready ? 'ok  ' : 'WARN'} ${out} ${Date.now() - t0} ms${attempt > 1 ? ` (attempt ${attempt})` : ''}${boat ? ` ${JSON.stringify(boat)}` : ''} calls=${info?.calls} tris=${info?.tris}`);
    result = ready ? 'ok' : 'warn';
  } catch (e) {
    fs.writeFileSync(`${out}.log.json`, JSON.stringify({ url, cam, ready, attempt, error: String(e), logs: logs.slice(0, 40) }, null, 2));
    console.log(`FAIL ${out}: ${e.message}`);
    result = 'fail';
  }
  await page.close().catch(() => {});
  return result;
}

let failures = 0;
const retry = [];
for (const spec of specs) {
  const r = await shoot(spec, 1);
  if (r === 'fail') retry.push(spec);
  else if (r === 'warn') failures++;
}
for (const spec of retry) {
  const r = await shoot(spec, 2);
  if (r !== 'ok') failures++;
}
await browser.close();
process.exit(failures ? 1 : 0);
