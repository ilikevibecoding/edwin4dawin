#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Camera-framing sweep.
//
//   node tools/camvar.mjs --view interior --out shots/camvar \
//     --variants "a:0.38,1.63,0.02,0.2,1.32,9,58  b:0.38,1.56,0.02,0.2,1.30,9,58"
//
// Renders one beauty view under several camera placements in a single page
// load. Framing is the one thing that cannot be judged from numbers, and a
// software frame is slow enough that booting the app once per variant is not
// affordable. Positions are in the truck's local space, same as VIEWS.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const view = arg('view', 'interior');
const outDir = arg('out', 'shots/camvar');
const width = Number(arg('width', '480'));
const height = Number(arg('height', '270'));
const url = arg('url', 'http://127.0.0.1:5185/?quality=fast') + '&capture=1';
const variants = arg('variants', '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((spec) => {
    const [name, nums] = spec.split(':');
    const v = nums.split(',').map(Number);
    return { name, pos: v.slice(0, 3), target: v.slice(3, 6), fov: v[6] };
  });

// Ablation variants: --ablate "name=<js> name2=<js>" runs the named beauty view
// with a snippet applied first. Turning one contributor off and re-rendering is
// the only way to attribute a wash or a hotspot to its source, and the app has
// no uniform registry to poke from a probe.
const ablate = arg('ablate', '')
  .trim()
  .split(/\s+(?=[\w-]+=)/)
  .filter(Boolean)
  .map((spec) => {
    const i = spec.indexOf('=');
    return { name: spec.slice(0, i), code: spec.slice(i + 1) };
  });

const log = (...a) => console.log('[camvar]', ...a);

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => log('page error:', e.message));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
  log('booted');

  for (const v of variants) {
    const t0 = Date.now();
    const dataUrl = await page.evaluate(
      ({ view, pos, target, fov }) => {
        window.debugAPI.setView(view);
        const { camera, vehicle } = window.debugAPI.objects;
        vehicle.root.updateMatrixWorld();
        // plain-JS transform so the tool needs nothing exposed but the objects
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
        camera.lookAt(t[0], t[1], t[2]);
        camera.updateProjectionMatrix();
        return window.debugAPI.captureFrame(2);
      },
      { view, ...v },
    );
    const file = path.join(outDir, `${v.name}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    log(`${v.name} -> ${file} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }

  for (const a of ablate) {
    const t0 = Date.now();
    const dataUrl = await page.evaluate(
      ({ view, code }) => {
        const { scene } = window.debugAPI.objects;
        // restore anything a previous variant touched
        scene.traverse((o) => {
          if (o.userData.__hidden) {
            o.visible = true;
            delete o.userData.__hidden;
          }
          if (o.isLight && o.userData.__i !== undefined) {
            o.intensity = o.userData.__i;
            delete o.userData.__i;
          }
        });
        if (scene.userData.__envI !== undefined) {
          scene.environmentIntensity = scene.userData.__envI;
          delete scene.userData.__envI;
        }
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
        const envI = (v) => {
          scene.userData.__envI = scene.environmentIntensity;
          scene.environmentIntensity = v;
        };
        window.debugAPI.setView(view);
        // eslint-disable-next-line no-new-func
        new Function('hide', 'light', 'envI', 'scene', code)(hide, light, envI, scene);
        return window.debugAPI.captureFrame(2);
      },
      { view, code: a.code },
    );
    const file = path.join(outDir, `${a.name}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    log(`${a.name} -> ${file} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
