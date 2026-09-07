#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Which shading term turns a green atlas into a khaki canopy?
//
//   node tools/folhue.mjs --url http://127.0.0.1:5292/?quality=fast --view forest
//
// `huespread.mjs` on a shot answers "is the band narrow", but a shot of a forest
// is trunks and dirt and sky as well as crowns, and the answer moves with the
// crop. This hides everything except the crown cards, so every pixel that is not
// background is a needle or a leaf, and then re-renders that same mask under a
// series of single-term ablations. The number that matters is the median hue: an
// albedo measured at 100 degrees arriving on screen at 45 is the whole bug, and
// whichever ablation moves it back is the term responsible.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5292/?quality=fast') + '&capture=1';
const outDir = arg('out', '');
const view = arg('view', 'forest');
const width = Number(arg('width', '384'));
const height = Number(arg('height', '216'));
const only = arg('only', '');
// which forest meshes survive the blackout; the default is the crown cards
const mask = arg('mask', '_foliage|^treeFar');

if (outDir) await mkdir(outDir, { recursive: true });
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
page.on('pageerror', (e) => console.error('[folhue] page error:', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
await page.evaluate((v) => window.debugAPI.setView(v), view);

// Each entry is a function of the forest materials, applied on top of a restored
// baseline. `foli` reaches the uniform bag every foliage material publishes.
const VARIANTS = [
  ['base', '() => {}'],
  ['no-haze', '(f) => { for (const m of f) m.userData.foliage.uHaze.value = 0; }'],
  ['no-rim', '(f) => { for (const m of f) m.userData.foliage.uRim.value.setRGB(0,0,0); }'],
  ['no-trans', '(f) => { for (const m of f) m.userData.foliage.uTrans.value = 0; }'],
  ['no-env', '(f) => { for (const m of f) { m.envMapIntensity = 0; m.needsUpdate = true; } }'],
  ['no-sky', '(f) => { for (const m of f) { m.userData.foliage.uSky.value.setRGB(0,0,0); m.userData.foliage.uGnd.value.setRGB(0,0,0); } }'],
  ['no-sheen', '(f) => { for (const m of f) m.userData.foliage.uSheen.value = 0; }'],
  // three's own accumulated lighting, i.e. hemisphere + directional + probe,
  // reached by killing the scene lights rather than the material
  ['no-scene-lights', '(f, o) => { o.scene.traverse(n => { if (n.isLight) { n.userData.i = n.intensity; n.intensity = 0; } }); }'],
  // everything this material adds on top of three's stock physical model
  [
    'stock-only',
    `(f) => { for (const m of f) { const u = m.userData.foliage;
      u.uSky.value.setRGB(0,0,0); u.uGnd.value.setRGB(0,0,0); u.uRim.value.setRGB(0,0,0);
      u.uTrans.value = 0; u.uHaze.value = 0; u.uSheen.value = 0; u.uShade.value = 0; } }`,
  ],
  ['no-hemi', '(f, o) => { o.scene.traverse(n => { if (n.isHemisphereLight) n.intensity = 0; }); }'],
  ['no-key', '(f, o) => { o.scene.traverse(n => { if (n.isDirectionalLight && n.castShadow) n.intensity = 0; }); }'],
  ['no-dir', '(f, o) => { o.scene.traverse(n => { if (n.isDirectionalLight) n.intensity = 0; }); }'],
  ['no-spot', '(f, o) => { o.scene.traverse(n => { if (n.isSpotLight || n.isPointLight) n.intensity = 0; }); }'],
  // bark-only ablations; `f` is the foliage set, so these reach through the page
  ['no-skyrim', '() => { for (const m of window.__barks) m.userData.bark.uSkyRim.value = 0; }'],
  ['no-bark-amb', '() => { for (const m of window.__barks) { m.userData.bark.uSky.value.setRGB(0,0,0); m.userData.bark.uGnd.value.setRGB(0,0,0); } }'],
  ['no-bark-haze', '() => { for (const m of window.__barks) m.userData.bark.uHaze.value = 0; }'],
  ['skyrim-2x', '() => { for (const m of window.__barks) m.userData.bark.uSkyRim.value *= 2; }'],
].filter(([n]) => !only || only.split(',').includes(n));

const rows = [];
for (const [name, src] of VARIANTS) {
  const res = await page.evaluate(
    async ([name, src, maskSrc]) => {
      window.__mask = maskSrc;
      const objs = window.debugAPI.objects;
      const { forest, scene } = objs;
      const flat = (v) => (Array.isArray(v) ? v : v && !v.isMaterial && typeof v === 'object' ? Object.values(v) : [v]);
      const all = Object.values(forest.materials).flatMap(flat).filter(Boolean);
      const mats = all.filter((m) => m?.userData?.foliage);
      const barks = all.filter((m) => m?.userData?.bark);
      window.__barks = barks;
      // crown cards only: needles and broadleaf sprays hung on the tree
      // prototypes, plus the far billboards, but not the ground cover
      const crown = new RegExp(window.__mask);
      if (!window.__crown) {
        window.__crown = new Set();
        forest.group.traverse((n) => {
          if ((n.isMesh || n.isInstancedMesh) && crown.test(n.name)) window.__crown.add(n);
        });
      }
      if (!window.__snap) {
        window.__snap = [...mats, ...barks].map((m) => ({
          m,
          u: Object.fromEntries(
            Object.entries(m.userData.foliage || m.userData.bark).map(([k, v]) => [
              k,
              v.value?.clone ? v.value.clone() : v.value,
            ]),
          ),
          bag: m.userData.foliage || m.userData.bark,
          env: m.envMapIntensity,
        }));
        window.__vis = [];
        scene.traverse((n) => {
          if (n.isMesh || n.isInstancedMesh) window.__vis.push([n, n.visible]);
        });
        window.__lights = [];
        scene.traverse((n) => {
          if (n.isLight) window.__lights.push([n, n.intensity]);
        });
        window.__bg = scene.background;
      }
      for (const s of window.__snap) {
        for (const [k, v] of Object.entries(s.u)) {
          if (v?.clone) s.bag[k].value.copy(v);
          else s.bag[k].value = v;
        }
        s.m.envMapIntensity = s.env;
        s.m.needsUpdate = true;
      }
      for (const [n, i] of window.__lights) n.intensity = i;
      // black everything that is not a crown so the mask is unambiguous
      for (const [n] of window.__vis) n.visible = window.__crown.has(n);
      scene.background = null;
      scene.fog = null;

      // eslint-disable-next-line no-eval
      eval(`(${src})`)(mats, objs);

      // The post chain puts a floor under every pixel — grain, dither, a
      // vignette that is not quite zero — so "not black" is not the same as
      // "covered by the mask". An empty frame captured through the same chain
      // is, and differencing against it is the only way to get a mask that is
      // actually the geometry rather than the noise floor.
      const grab = async () => {
        const dataUrl = window.debugAPI.captureFrame(1);
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
        return { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, dataUrl };
      };
      if (!window.__empty) {
        const keep = [];
        for (const [n] of window.__vis) {
          keep.push(n.visible);
          n.visible = false;
        }
        window.__empty = (await grab()).data;
        window.__vis.forEach(([n], i) => {
          n.visible = keep[i];
        });
      }
      const shot = await grab();
      const { data: d, dataUrl } = shot;
      const c = { width: shot.w, height: shot.h };
      const bg = window.__empty;
      // The mask is frozen after the first variant. Recomputing it per variant
      // makes a change that brightens the subject also *widen* the set of pixels
      // it is averaged over, and the two cancel: a real lift then reports as no
      // change at all, which is how the first sizing of uSkyRim looked like a
      // dead uniform when it was merely too small.
      if (!window.__maskIdx) {
        window.__maskIdx = [];
        for (let i = 0; i < d.length; i += 4) {
          const dv = Math.abs(d[i] - bg[i]) + Math.abs(d[i + 1] - bg[i + 1]) + Math.abs(d[i + 2] - bg[i + 2]);
          if (dv >= 12) window.__maskIdx.push(i);
        }
      }
      const hues = [];
      const vals = [];
      let sat = 0;
      let val = 0;
      let n = 0;
      for (const i of window.__maskIdx) {
        const r = d[i] / 255;
        const gg = d[i + 1] / 255;
        const b = d[i + 2] / 255;
        const mx = Math.max(r, gg, b);
        const mn = Math.min(r, gg, b);
        const c2 = mx - mn;
        n++;
        val += mx;
        vals.push(mx);
        if (mx > 0) sat += c2 / mx;
        if (c2 < 0.02) continue;
        let h;
        if (mx === r) h = ((gg - b) / c2 + 6) % 6;
        else if (mx === gg) h = (b - r) / c2 + 2;
        else h = (r - gg) / c2 + 4;
        hues.push(h * 60);
      }
      hues.sort((a, b) => a - b);
      vals.sort((a, b) => a - b);
      const q = (a, p) => (a.length ? a[Math.floor(a.length * p)] : NaN);
      return {
        name,
        px: n,
        nmat: `${mats.length}f/${barks.length}b`,
        cover: n / (c.width * c.height),
        hue: q(hues, 0.5),
        hue25: q(hues, 0.25),
        hue75: q(hues, 0.75),
        sat: n ? sat / n : 0,
        val: n ? val / n : 0,
        v10: q(vals, 0.1),
        v90: q(vals, 0.9),
        dataUrl,
      };
    },
    [name, src, mask],
  );
  rows.push(res);
  const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : ' -- ');
  console.log(
    `${name.padEnd(16)} ${res.nmat} cover ${(res.cover * 100).toFixed(1).padStart(5)}%  hue ${f(res.hue, 0).padStart(4)}` +
      ` [${f(res.hue25, 0)}..${f(res.hue75, 0)}]  sat ${f(res.sat)}  val ${f(res.val)}` +
      ` [${f(res.v10)}..${f(res.v90)}]`,
  );
  if (outDir) {
    await writeFile(path.join(outDir, `${name}.png`), Buffer.from(res.dataUrl.split(',')[1], 'base64'));
  }
}

await browser.close();
