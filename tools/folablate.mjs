#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Which term owns the pale mid distance?
//
//   node tools/folablate.mjs --out shots/abl_1 --view forest
//
// Boots once and renders the same frame under several forest-material overrides,
// reporting a mean luma for three horizontal bands of the image as well as
// writing the PNGs. Software rasterisation costs a minute a frame, so answering
// "is it the ambient, the aerial ramp, or the far band" by editing and
// re-capturing is four separate boots; this is one.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5181/?quality=fast') + '&capture=1';
const outDir = arg('out', 'shots/abl');
const view = arg('view', 'forest');
const width = Number(arg('width', '420'));
const height = Number(arg('height', '236'));

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
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[ablate] page error:', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
await page.evaluate((v) => window.debugAPI.setView(v), view);

const hide = (re) => `(o) => { o.forest.group.traverse(n => { if (${re}.test(n.name)) n.visible = false; }); }`;
const VARIANTS = [
  ['base', '() => {}'],
  ['nofog', '(o) => { o.scene.fog = null; o.scene.traverse(n => { if (n.material) n.material.needsUpdate = true; }); }'],
  ['nofar', hide('/treeFar/')],
  ['noline', hide('/treeline/')],
  ['noridge', hide('/ridge/')],
  ['hazex', '(o) => { for (const m of [o.forest.materials.needleMat, o.forest.materials.leafMat]) { m.userData.foliage.uHazeNear.value = 8; m.userData.foliage.uHazeFar.value = 24; } }'],
];

for (const [name, fn] of VARIANTS) {
  const res = await page.evaluate(
    async ([name, src]) => {
      const objs = window.debugAPI.objects;
      const { forest, scene } = objs;
      // every variant starts from a clean clone of the base uniforms
      if (!window.__ablSnap) {
        window.__fog = scene.fog;
        window.__ablSnap = () => {
          const f = forest.materials;
          scene.fog = window.__fog;
          for (const m of [f.needleMat, f.leafMat, f.billboardMat]) {
            if (!m.userData.snap) {
              m.userData.snap = {
                sky: m.userData.foliage.uSky.value.clone(),
                gnd: m.userData.foliage.uGnd.value.clone(),
                near: m.userData.foliage.uHazeNear.value,
                far: m.userData.foliage.uHazeFar.value,
                env: m.envMapIntensity,
              };
            }
            const s = m.userData.snap;
            m.userData.foliage.uSky.value.copy(s.sky);
            m.userData.foliage.uGnd.value.copy(s.gnd);
            m.userData.foliage.uHazeNear.value = s.near;
            m.userData.foliage.uHazeFar.value = s.far;
            m.envMapIntensity = s.env;
            m.needsUpdate = true;
          }
          forest.group.traverse((o) => {
            if (/treeFar|treeline|ridge/.test(o.name)) o.visible = true;
          });
          scene.traverse((n) => {
            if (n.material) n.material.needsUpdate = true;
          });
        };
      }
      window.__ablSnap();
      // eslint-disable-next-line no-eval
      eval(`(${src})`)(objs);
      const dataUrl = window.debugAPI.captureFrame(2);

      const img = new Image();
      await new Promise((r) => {
        img.onload = r;
        img.src = dataUrl;
      });
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      // whole-frame sky/mid/floor bands plus a box over wherever the distance
      // actually sits in this view, which is not a full-width band in any of them
      const mean = (x0, y0, x1, y1) => {
        const d = g.getImageData(
          Math.round(x0 * c.width),
          Math.round(y0 * c.height),
          Math.max(1, Math.round((x1 - x0) * c.width)),
          Math.max(1, Math.round((y1 - y0) * c.height)),
        ).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4) s += (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
        return s / (d.length / 4);
      };
      const bands = [mean(0, 0, 1, 0.2), mean(0, 0.2, 1, 0.45), mean(0, 0.45, 1, 0.72), mean(0.6, 0.04, 0.99, 0.44)];
      return { dataUrl, bands };
    },
    [name, fn],
  );
  await writeFile(path.join(outDir, `${name}.png`), Buffer.from(res.dataUrl.split(',')[1], 'base64'));
  console.log(
    `[ablate] ${name.padEnd(8)} top ${res.bands[0].toFixed(3)}  mid ${res.bands[1].toFixed(3)}  low ${res.bands[2].toFixed(3)}  farbox ${res.bands[3].toFixed(3)}`,
  );
}

await browser.close();
