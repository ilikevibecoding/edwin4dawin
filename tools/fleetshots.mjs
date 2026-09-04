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
//
// The camp parks its vehicles four metres apart, so the default front
// three-quarter is often looking through a neighbour. Before each capture the
// camera raycasts to the subject (centre, nose, tail, roof, hubs) against the
// fleet and the camp's structures; if the first thing a ray hits is not the
// subject, the camera orbits in 10° steps out to ±30° (then lifts) until it
// is, and the offset it settled on is logged. `--orbit 0` disables this.
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
const orbit = Number(arg('orbit', '30')); // max orbit (degrees) either way to clear an occluder; 0 disables
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
      const shot = await page.evaluate(
        async ({ v, angle, distK, lift, fov, focus, orbit }) => {
          const { camera, skyRig, fleet, camp } = window.debugAPI.objects;
          const V3 = camera.position.constructor;
          const M4 = camera.matrixWorld.constructor;
          // THREE is not a global; a second copy of the module gives us a
          // Raycaster the camp's meshes are happy to be tested with
          if (!window.__fleetRay && orbit > 0) {
            try {
              const T = await import('/node_modules/three/build/three.module.js');
              window.__fleetRay = new T.Raycaster();
            } catch (e) {
              window.__fleetRay = false;
            }
          }
          const rc = window.__fleetRay || null;
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

          // --- occluders: every other vehicle as an oriented box in its root's
          // frame (the fleet is merged per material, so a scene raycast could not
          // say whose triangle it hit), and the camp's structures by triangle
          // raycast (they are merged per material too, so their bounding boxes
          // span the whole camp). Grass, ground wear, fire, bulbs and signs are
          // skipped: they cannot hide a vehicle.
          const subject = fleet.vehicles.find((o) => o.name === v.name);
          const boxes = [];
          for (const o of fleet.vehicles) {
            if (o === subject) continue;
            const fp = o.footprint || { hw: 1.2, z0: o.length[0], z1: o.length[1] };
            const hw = Math.max(0.6, fp.hw - 0.35);
            boxes.push({ inv: new M4().copy(o.root.matrixWorld).invert(), min: [-hw, 0, fp.z0], max: [hw, o.height, fp.z1] });
          }
          const meshes = [];
          if (rc) {
            camp?.group?.traverse((o) => {
              if (!o.isMesh || !o.geometry || o.isInstancedMesh) return;
              if (/wear|grass|ground|fire|bulb|ash|ember|flag|sign|beacon|smoke/i.test(o.name)) return;
              meshes.push(o);
            });
          }

          // sample points on the subject: centre, nose, tail, roof and the hubs
          const local = (lx, ly, lz) => subject.root.localToWorld(new V3(lx, ly, lz)).toArray();
          const samples = [
            centre,
            local(0, v.height * 0.35, v.length[1]),
            local(0, v.height * 0.35, v.length[0]),
            local(0, v.height * 0.95, cz),
            ...(v.wheels || []).map((w) => local(w.x, w.r, w.z)),
          ];
          const o0 = new V3();
          const o1 = new V3();
          const hits = [];
          const blocked = (eye) => {
            let n = 0;
            for (const p of samples) {
              const dx = p[0] - eye[0];
              const dy = p[1] - eye[1];
              const dz = p[2] - eye[2];
              // the cheap oriented-box test against the other vehicles first,
              // then the camp's triangles (merged meshes, no BVH: slow)
              let hit = false;
              for (const b of boxes) {
                // ray into the box's frame; slab test with t in world units (the
                // direction is a transformed segment, not re-normalised)
                o0.set(eye[0], eye[1], eye[2]).applyMatrix4(b.inv);
                o1.set(eye[0] + dx, eye[1] + dy, eye[2] + dz).applyMatrix4(b.inv);
                let t0 = 0;
                let t1 = 0.97;
                let inBox = true;
                for (let k = 0; k < 3; k++) {
                  const oa = o0.getComponent(k);
                  const da = o1.getComponent(k) - oa;
                  if (Math.abs(da) < 1e-9) {
                    if (oa < b.min[k] || oa > b.max[k]) inBox = false;
                    continue;
                  }
                  let ta = (b.min[k] - oa) / da;
                  let tb = (b.max[k] - oa) / da;
                  if (ta > tb) [ta, tb] = [tb, ta];
                  t0 = Math.max(t0, ta);
                  t1 = Math.min(t1, tb);
                  if (t0 > t1) inBox = false;
                }
                if (inBox) {
                  hit = true;
                  break;
                }
              }
              if (!hit && rc) {
                const dist = Math.hypot(dx, dy, dz);
                rc.ray.origin.set(eye[0], eye[1], eye[2]);
                rc.ray.direction.set(dx / dist, dy / dist, dz / dist);
                rc.near = 0.05;
                rc.far = dist * 0.97;
                for (const m of meshes) {
                  hits.length = 0;
                  m.raycast(rc, hits);
                  if (hits.length) {
                    hit = true;
                    break;
                  }
                }
              }
              if (hit) n++;
            }
            return n;
          };

          const place = (off, up) => {
            const a = h + angle + off;
            return [centre[0] + Math.sin(a) * d, camY + up, centre[2] + Math.cos(a) * d];
          };
          const step = Math.PI / 18;
          const offsets = [0];
          for (let k = 1; k * 10 <= orbit + 1e-6; k++) offsets.push(k * step, -k * step);
          let best = { off: 0, up: 0, n: blocked(place(0, 0)) };
          if (best.n > 0 && orbit > 0) {
            search: for (const up of [0, 0.6, 1.2]) {
              for (const off of offsets) {
                const n = blocked(place(off, up));
                if (n < best.n) best = { off, up, n };
                if (n === 0) break search;
              }
            }
          }
          const eye = place(best.off, best.up);
          camera.position.set(eye[0], eye[1], eye[2]);
          camera.fov = fov;
          camera.lookAt(centre[0], centre[1], centre[2]);
          camera.updateProjectionMatrix();
          skyRig.follow?.(camera.position);
          return { dataUrl: window.debugAPI.captureFrame(2), orbit: (best.off * 180) / Math.PI, up: best.up, blocked: best.n, samples: samples.length, boxes: boxes.length };
        },
        { v, angle, distK, lift, fov, focus, orbit },
      );
      const file = path.join(outDir, `${v.name}_${time}${suffix}.png`);
      await writeFile(file, Buffer.from(shot.dataUrl.split(',')[1], 'base64'));
      const cam = shot.orbit || shot.up ? ` orbit=${shot.orbit.toFixed(0)}° lift=${shot.up.toFixed(1)}` : '';
      const occ = shot.blocked ? ` STILL OCCLUDED ${shot.blocked}/${shot.samples}` : '';
      log(`${v.name} ${time} -> ${file} (${((Date.now() - t1) / 1000).toFixed(1)}s)${cam}${occ}`);
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
