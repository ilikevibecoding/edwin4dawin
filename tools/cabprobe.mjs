#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Cabin close-up probe: camera placement, ablation and a clip readout in one
// page load.
//
//   node tools/cabprobe.mjs --out shots/cab --url http://127.0.0.1:5192/?quality=fast \
//     --shots "seatA:0.38,1.55,0.30:-0.42,1.10,-0.20:55  noSun:0.38,1.55,0.30:-0.42,1.10,-0.20:55:cl('fabric','uClSun',0)"
//
// `camvar.mjs` can place a camera *or* ablate, but not both, and the framing
// that shows a defect is never the beauty framing. Each shot is
// `name:px,py,pz:tx,ty,tz:fov[:code]` in the truck's local space.
//
// The readout is what makes a blown highlight arguable rather than a matter of
// opinion: mean luma, peak, the fraction of the frame over 0.94, and the
// biggest connected run of clipped pixels.
//
// Helpers available to `code`:
//   cl(meshKeySubstring, uniformName, value)   poke a cabin-light uniform
//   mat(meshKeySubstring, prop, value)         poke a material property
//   hide(regex)                                hide meshes by name
//   light(type, intensity)                     scale lights by class
//   post(pass, on)                             toggle a post stage
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const outDir = arg('out', 'shots/cabprobe');
const width = Number(arg('width', '480'));
const height = Number(arg('height', '270'));
const url = arg('url', 'http://127.0.0.1:5192/?quality=fast') + '&capture=1';
const view = arg('view', 'interior');
const shots = arg('shots', '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((spec) => {
    const parts = spec.split(':');
    return {
      name: parts[0],
      pos: parts[1].split(',').map(Number),
      target: parts[2].split(',').map(Number),
      fov: Number(parts[3]),
      code: parts.slice(4).join(':') || '',
    };
  });

// --id "fabric,cardVinyl,stitch" measures what one material key actually
// renders at from a given camera: the frame is captured once, then once per key
// with that key's mesh hidden, and the pixels that changed are the key's. A
// mean over the whole frame cannot tell a dark surface from a small one, and
// "is the seat darker than the door card" is the only question that matters
// here.
const idKeys = arg('id', '').split(',').filter(Boolean);
const idShot = arg('idshot', '');

const log = (...a) => console.log('[cabprobe]', ...a);

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
    ],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => log('page error:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') log('console:', m.text());
  });

  // Three agents share this checkout, so somebody else's save reloads the page
  // out from under a capture run. Stubbing the HMR client is the same guard
  // `pick.mjs` uses.
  await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
  log('booted');
  await page.evaluate((v) => window.debugAPI.setView(v), view);

  for (const s of shots) {
    const t0 = Date.now();
    const res = await page.evaluate(
      ({ pos, target, fov, code }) => {
        const { camera, vehicle, scene } = window.debugAPI.objects;

        // undo whatever the previous shot changed
        scene.traverse((o) => {
          if (o.userData.__hidden) {
            o.visible = true;
            delete o.userData.__hidden;
          }
          if (o.isLight && o.userData.__i !== undefined) {
            o.intensity = o.userData.__i;
            delete o.userData.__i;
          }
          if (o.material && o.material.userData.__saved) {
            for (const [k, v] of Object.entries(o.material.userData.__saved)) o.material[k] = v;
            o.material.needsUpdate = true;
            delete o.material.userData.__saved;
          }
          if (o.material && o.material.userData.__savedU) {
            for (const [k, v] of Object.entries(o.material.userData.__savedU)) o.material.userData.cl[k].value = v;
            delete o.material.userData.__savedU;
          }
        });
        if (window.__postOff) {
          for (const p of window.__postOff) window.debugAPI.toggle(p, true);
          window.__postOff = null;
        }

        const eachMesh = (sub, fn) =>
          scene.traverse((o) => {
            if ((o.isMesh || o.isInstancedMesh) && o.name && o.name.includes(sub)) fn(o);
          });
        const cl = (sub, uni, val) =>
          eachMesh(sub, (o) => {
            const u = o.material.userData.cl;
            if (!u || !u[uni]) return;
            o.material.userData.__savedU = o.material.userData.__savedU || {};
            o.material.userData.__savedU[uni] = u[uni].value;
            u[uni].value = val;
          });
        const mat = (sub, prop, val) =>
          eachMesh(sub, (o) => {
            o.material.userData.__saved = o.material.userData.__saved || {};
            o.material.userData.__saved[prop] = o.material[prop];
            o.material[prop] = val;
            o.material.needsUpdate = true;
          });
        const hide = (re) =>
          scene.traverse((o) => {
            if ((o.isMesh || o.isInstancedMesh) && re.test(o.name)) {
              o.userData.__hidden = true;
              o.visible = false;
            }
          });
        const light = (type, v) =>
          scene.traverse((o) => {
            if (o.isLight && o.type === type) {
              o.userData.__i = o.intensity;
              o.intensity = v;
            }
          });
        const post = (p, on) => {
          window.__postOff = window.__postOff || [];
          window.__postOff.push(p);
          window.debugAPI.toggle(p, on);
        };

        if (code) {
          // eslint-disable-next-line no-new-func
          new Function('cl', 'mat', 'hide', 'light', 'post', 'scene', 'eachMesh', code)(
            cl,
            mat,
            hide,
            light,
            post,
            scene,
            eachMesh,
          );
        }

        vehicle.root.updateMatrixWorld();
        const xf = (m, v) => {
          const e = m.elements;
          return [
            e[0] * v[0] + e[4] * v[1] + e[8] * v[2] + e[12],
            e[1] * v[0] + e[5] * v[1] + e[9] * v[2] + e[13],
            e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14],
          ];
        };
        const p = xf(vehicle.root.matrixWorld, pos);
        const t = xf(vehicle.root.matrixWorld, target);
        camera.position.set(p[0], p[1], p[2]);
        camera.fov = fov;
        camera.near = 0.02;
        camera.lookAt(t[0], t[1], t[2]);
        camera.updateProjectionMatrix();

        const dataUrl = window.debugAPI.captureFrame(2);

        const gl = window.debugAPI.objects.renderer.domElement;
        const c = document.createElement('canvas');
        c.width = gl.width;
        c.height = gl.height;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(gl, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let sum = 0;
        let peak = 0;
        let clip = 0;
        let hot = 0;
        // centroid of the clipped pixels, so a hotspot can be located without
        // eyeballing it off a thumbnail
        let cx = 0;
        let cy = 0;
        const n = c.width * c.height;
        for (let i = 0; i < n; i++) {
          const r = d[i * 4] / 255;
          const g = d[i * 4 + 1] / 255;
          const b = d[i * 4 + 2] / 255;
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          sum += l;
          if (l > peak) peak = l;
          if (l > 0.94) {
            clip++;
            cx += i % c.width;
            cy += Math.floor(i / c.width);
          }
          if (l > 0.8) hot++;
        }
        return {
          dataUrl,
          mean: sum / n,
          peak,
          clipPct: (clip / n) * 100,
          hotPct: (hot / n) * 100,
          cx: clip ? Math.round(cx / clip) : -1,
          cy: clip ? Math.round(cy / clip) : -1,
          w: c.width,
          h: c.height,
        };
      },
      s,
    );
    const file = path.join(outDir, `${s.name}.png`);
    await writeFile(file, Buffer.from(res.dataUrl.split(',')[1], 'base64'));
    log(
      `${s.name.padEnd(14)} mean ${res.mean.toFixed(3)}  peak ${res.peak.toFixed(3)}  ` +
        `>0.94 ${res.clipPct.toFixed(2)}%  >0.8 ${res.hotPct.toFixed(2)}%  ` +
        `at ${res.cx},${res.cy} of ${res.w}x${res.h}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`,
    );
  }

  if (idKeys.length && idShot) {
    const parts = idShot.split(':');
    const cam = {
      pos: parts[1].split(',').map(Number),
      target: parts[2].split(',').map(Number),
      fov: Number(parts[3]),
    };
    const rows = await page.evaluate(
      ({ cam, keys }) => {
        const { camera, vehicle, scene, renderer } = window.debugAPI.objects;
        vehicle.root.updateMatrixWorld();
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
        camera.near = 0.02;
        camera.lookAt(t[0], t[1], t[2]);
        camera.updateProjectionMatrix();

        const grab = () => {
          window.debugAPI.renderFrames(2);
          const gl = renderer.domElement;
          const c = document.createElement('canvas');
          c.width = gl.width;
          c.height = gl.height;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(gl, 0, 0);
          return ctx.getImageData(0, 0, c.width, c.height).data;
        };
        const base = grab();
        const n = base.length / 4;
        const out = [];
        for (const key of keys) {
          const hidden = [];
          scene.traverse((o) => {
            if ((o.isMesh || o.isInstancedMesh) && o.name === `cabin_${key}` && o.visible) {
              o.visible = false;
              hidden.push(o);
            }
          });
          if (!hidden.length) {
            out.push(`${key}: no mesh`);
            continue;
          }
          const off = grab();
          for (const o of hidden) o.visible = true;
          let cover = 0;
          let sum = 0;
          let peak = 0;
          let clip = 0;
          for (let i = 0; i < n; i++) {
            const d =
              Math.abs(base[i * 4] - off[i * 4]) +
              Math.abs(base[i * 4 + 1] - off[i * 4 + 1]) +
              Math.abs(base[i * 4 + 2] - off[i * 4 + 2]);
            if (d < 6) continue;
            const l =
              (0.2126 * base[i * 4] + 0.7152 * base[i * 4 + 1] + 0.0722 * base[i * 4 + 2]) / 255;
            cover++;
            sum += l;
            if (l > peak) peak = l;
            if (l > 0.94) clip++;
          }
          out.push(
            `${key.padEnd(17)} ${((cover / n) * 100).toFixed(1).padStart(5)}% of frame   ` +
              `luma ${cover ? (sum / cover).toFixed(3) : '-'}   peak ${peak.toFixed(3)}   ` +
              `clipped ${cover ? ((clip / cover) * 100).toFixed(2) : '0'}%`,
          );
        }
        return out;
      },
      { cam, keys: idKeys },
    );
    log(`id pass from ${parts[1]}`);
    for (const r of rows) log('  ' + r);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
