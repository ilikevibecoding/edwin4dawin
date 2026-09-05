#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Material chart.
//
// Judging "is the aluminium obviously not the steel" from beauty shots does not
// work: the two are never in the same frame at the same angle under the same
// light, and a full view costs two minutes to rasterise in software. This puts
// every material on one chart instead — a sphere and a tilted flat plate each,
// side by side, under the scene's real sun and real sky — and hides the forest
// and the terrain so the frame renders in seconds rather than minutes.
//
// The sphere gives the sky-to-ground reflection gradient and the horizon line.
// The plate is the blowout test: large, flat, tilted up at the sky, which is
// the geometry every light leak on this truck has come from.
//
//   node tools/vsmat.mjs --out shots/mat_1 \
//     --mats paint,rubber,steel,alu,trimGloss --width 640 --height 320
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const baseUrl = arg('url', 'http://127.0.0.1:5182/?quality=fast');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1';
const width = Number(arg('width', '640'));
const height = Number(arg('height', '320'));
const outDir = arg('out', 'shots/mat');
const mats = arg('mats', 'paint,paintRoof,rubber,steel,alu,plate,trimGloss,trim,chrome').split(',');
const dirtOn = arg('dirt', '1') !== '0';
// Sweep file: a JSON array of { name, patch: { material: { prop: value } } }.
// Boot costs 26 s and each chart render 45 s, so trying five variants in one
// process is four minutes instead of six — and, more usefully, they are all
// rendered against exactly the same sun position and frame.
const sweepFile = arg('sweep', '');

const launchArgs = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--js-flags=--max-old-space-size=4096',
];
const log = (...a) => console.log('[vsmat]', ...a);

/**
 * Runs in the page. Hides everything that is not sky, then drops two rows of
 * test bodies in front of the camera: a clean row and a row whose *vertex
 * positions* are authored at the front wheel arch, so the object-space dirt
 * projection lays spatter and cake on it exactly as it would on the truck.
 *
 * No three import. Every class it needs is taken off an object already in the
 * scene, and the sphere and plate are built by hand, which means the tool has
 * no version or bundler coupling at all.
 */
const BUILD = `(({ mats, dirtOn, archAt }) => {
  const { scene, camera } = window.debugAPI.objects;
  const found = {};
  let proto = null;
  scene.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh && !proto && o.geometry && o.geometry.attributes.position) proto = o;
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m && m.name && !found[m.name]) found[m.name] = m;
    }
  });
  const Mesh = proto.constructor;
  const Geo = proto.geometry.constructor;
  const Attr = proto.geometry.attributes.position.constructor;
  const V3 = scene.position.constructor;

  const hidden = [];
  scene.traverse((o) => {
    if (!(o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine) || !o.visible) return;
    const nm = (o.name || '') + ' ' + ((o.material && o.material.name) || '');
    if (/sky|sun|cloud|star/i.test(nm)) return;
    if (o.geometry) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere && o.geometry.boundingSphere.radius > 200) return;
    }
    o.visible = false;
    hidden.push(o);
  });

  const build = (pos, nrm, uv, idx) => {
    const g = new Geo();
    g.setAttribute('position', new Attr(new Float32Array(pos), 3));
    g.setAttribute('normal', new Attr(new Float32Array(nrm), 3));
    g.setAttribute('uv', new Attr(new Float32Array(uv), 2));
    g.setIndex(idx);
    return g;
  };
  const sphere = (r, cx, cy, cz, seg, ring) => {
    const pos = [], nrm = [], uv = [], idx = [];
    for (let j = 0; j <= ring; j++) {
      const v = j / ring, th = v * Math.PI;
      for (let i = 0; i <= seg; i++) {
        const u = i / seg, ph = u * Math.PI * 2;
        const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
        pos.push(cx + nx * r, cy + ny * r, cz + nz * r);
        nrm.push(nx, ny, nz);
        uv.push(u * 2, v * 2);
      }
    }
    for (let j = 0; j < ring; j++)
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i, b = a + seg + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    return build(pos, nrm, uv, idx);
  };
  // A flat panel tilted 24 degrees up towards the camera: the geometry every
  // light leak on this truck has come from. Built directly in the camera's
  // horizontal frame so it faces the same way whatever view is loaded.
  const plate = (w, d, c, rt, fw) => {
    const t = 0.42, ct = Math.cos(t), st = Math.sin(t);
    const pos = [], nrm = [], uv = [];
    const n = [ct * 0 - st * fw.x, ct, -st * fw.z];
    n[0] = -st * fw.x;
    n[2] = -st * fw.z;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const a = (su * w) / 2, b = (sv * d) / 2;
      pos.push(
        c[0] + rt.x * a + fw.x * b * ct,
        c[1] + b * st,
        c[2] + rt.z * a + fw.z * b * ct,
      );
      nrm.push(n[0], n[1], n[2]);
      uv.push((su + 1) * 0.9, (sv + 1) * 0.9);
    }
    return build(pos, nrm, uv, [0, 1, 2, 0, 2, 3]);
  };

  const list = mats.filter((n) => found[n]);
  const R = 0.155, gap = 0.42;
  const span = (list.length - 1) * gap;
  const fwd = new V3();
  camera.getWorldDirection(fwd);
  fwd.y = 0;
  fwd.normalize();
  const right = new V3(-fwd.z, 0, fwd.x);
  const origin = camera.position.clone().add(fwd.clone().multiplyScalar(2.15));
  origin.y = camera.position.y - 0.05;

  // Local-space centres. The top row is authored a long way from any wheel so
  // it takes film only; the bottom row is authored on the front arch, outboard,
  // at hub height, which is the muddiest point on the vehicle.
  const CLEAN = [0, 3.2, 0];
  const DIRTY = archAt;
  const made = [];
  for (let i = 0; i < list.length; i++) {
    const mat = found[list[i]];
    const off = right.clone().multiplyScalar(-span / 2 + i * gap);
    for (const [row, c, dy] of [['c', CLEAN, 0.3], ['d', DIRTY, -0.02], ['p', DIRTY, -0.34]]) {
      const g = row === 'p' ? plate(0.36, 0.34, c, right, fwd) : sphere(R, c[0], c[1], c[2], 40, 26);
      const mesh = new Mesh(g, mat);
      // the geometry carries the local offset, so the mesh transform only has
      // to bring that local point to where the chart wants it on screen
      mesh.position.copy(origin).add(off).add(new V3(0, dy, 0)).sub(new V3(c[0], c[1], c[2]));
      mesh.name = 'chart_' + row + '_' + list[i];
      mesh.userData.chartAt = [mesh.position.x + c[0], mesh.position.y + c[1], mesh.position.z + c[2]];
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      made.push(mesh);
    }
    const d = mat.userData && mat.userData.dirt;
    if (d && !dirtOn) { d.uDirtFilm.value = 0; d.uDirtSpat.value = 0; d.uDirtCake.value = 0; }
  }
  scene.updateMatrixWorld(true);
  window.__chart = { list, hidden, made, origin: origin.toArray(), R };
  return list;
})`;

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.route(/@vite\/client/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `export const createHotContext = () => ({ on(){}, off(){}, send(){}, accept(){}, acceptExports(){}, dispose(){}, prune(){}, invalidate(){}, decline(){}, data: {} });
export const injectQuery = (u) => u;
export const updateStyle = () => {};
export const removeStyle = () => {};`,
    }),
  );
  page.on('pageerror', (e) => log('page error:', e.message));

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) {
    console.error('[vsmat] boot failed:\n' + err);
    await browser.close();
    process.exit(1);
  }
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  await page.evaluate((v) => window.debugAPI.setView(v), arg('view', 'hero'));
  // Note: do not switch the bloom pass off to get a clean read. UnrealBloomPass
  // is the last pass before the output pass in this stack and disabling it
  // drops the composer's read/write buffer swap, so the frame comes back as an
  // unresolved intermediate — hazy, half-transparent, and useless. Bloom does
  // bleed the sky onto a dark sphere's silhouette by up to 0.17 luma, so the
  // chart is only ever read as a comparison *within* one frame.
  const list = await page.evaluate(
    `${BUILD}(${JSON.stringify({ mats, dirtOn, archAt: [0.86, 0.72, 1.5] })})`,
  );
  log('chart:', list.join(', '));

  const variants = sweepFile
    ? JSON.parse(await (await import('node:fs/promises')).readFile(sweepFile, 'utf8'))
    : [{ name: 'chart', patch: {} }];

  const readback = ({ dataUrl, w, h, list }) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const { camera, scene } = window.debugAPI.objects;
          const V = scene.position.constructor;
          const out = {};
          const at = (x, y, z) => {
            const p = new V(x, y, z).project(camera);
            return [Math.round(((p.x + 1) / 2) * w), Math.round(((1 - p.y) / 2) * h)];
          };
          const box = (cx, cy, r) => {
            const x = Math.max(0, Math.min(w - 2 * r, cx - r));
            const y = Math.max(0, Math.min(h - 2 * r, cy - r));
            const d = ctx.getImageData(x, y, r * 2, r * 2).data;
            let R = 0, G = 0, B = 0, L = 0, mx = 0, mn = 1;
            for (let i = 0; i < d.length; i += 4) {
              const rr = d[i] / 255, gg = d[i + 1] / 255, bb = d[i + 2] / 255;
              R += rr; G += gg; B += bb;
              const l = rr * 0.2126 + gg * 0.7152 + bb * 0.0722;
              L += l;
              if (l > mx) mx = l;
              if (l < mn) mn = l;
            }
            const n = d.length / 4;
            return {
              rgb: [Math.round((R / n) * 255), Math.round((G / n) * 255), Math.round((B / n) * 255)],
              luma: +(L / n).toFixed(3),
              max: +mx.toFixed(3),
              range: +(mx - mn).toFixed(3),
            };
          };
          const R = window.__chart.R;
          for (const name of list) {
            const s = scene.getObjectByName('chart_c_' + name);
            const dsp = scene.getObjectByName('chart_d_' + name);
            const p = scene.getObjectByName('chart_p_' + name);
            if (!s) continue;
            const [cx, cy, cz] = s.userData.chartAt;
            out[name] = {
              top: box(...at(cx, cy + R * 0.8, cz), 3),
              mid: box(...at(cx, cy, cz), 4),
              bot: box(...at(cx, cy - R * 0.8, cz), 3),
            };
            if (dsp) out[name].dirty = box(...at(...dsp.userData.chartAt), 6);
            if (p) out[name].plate = box(...at(...p.userData.chartAt), 7);
          }
          res(out);
        };
        img.src = dataUrl;
      });

  const all = {};
  for (const v of variants) {
    if (v.patch && Object.keys(v.patch).length) {
      const applied = await page.evaluate(
        `(({ patch }) => {
          const { scene } = window.debugAPI.objects;
          const f = {};
          scene.traverse((o) => {
            if (!o.material) return;
            for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && m.name && !f[m.name]) f[m.name] = m;
          });
          const done = [];
          for (const [name, props] of Object.entries(patch)) {
            const m = f[name];
            if (!m) continue;
            for (const [k, val] of Object.entries(props)) {
              if (k.startsWith('u')) {
                for (const bag of ['bw', 'dirt', 'cb']) {
                  const u = m.userData[bag];
                  if (u && u[k]) { u[k].value = val; done.push(name + '.' + k); }
                }
              } else if (k === 'color' || k === 'emissive') { m[k].setHex(val); done.push(name + '.' + k); }
              else { m[k] = val; done.push(name + '.' + k); }
            }
            m.needsUpdate = true;
          }
          return done;
        })(${JSON.stringify({ patch: v.patch })})`,
      );
      log(`patch ${v.name}:`, applied.join(' '));
    }
    const dataUrl = await page.evaluate(() => window.debugAPI.captureFrame(2));
    const file = path.join(outDir, `${v.name}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    const stats = await page.evaluate(readback, { dataUrl, w: width, h: height, list });
    all[v.name] = stats;
    log(`-> ${file} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    for (const [n, s] of Object.entries(stats)) {
      log(
        `  ${n.padEnd(11)} sky ${String(s.top.luma).padEnd(6)} eq ${String(s.mid.luma).padEnd(6)}` +
          ` gnd ${String(s.bot.luma).padEnd(6)} | grad ${String((s.top.luma - s.bot.luma).toFixed(3)).padEnd(7)}` +
          ` plate ${String(s.plate ? s.plate.luma : '-').padEnd(6)} pmax ${String(s.plate ? s.plate.max : '-').padEnd(6)}` +
          ` dirty ${String(s.dirty ? s.dirty.luma : '-').padEnd(6)} rgb ${s.mid.rgb}`,
      );
    }
  }
  await writeFile(path.join(outDir, 'chart.json'), JSON.stringify(all, null, 2));
  await browser.close();
  log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
