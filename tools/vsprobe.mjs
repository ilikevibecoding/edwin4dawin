#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Vehicle-surface probe. Same capture path as tools/shots.mjs, plus the two
// things that shot harness cannot give you:
//
//   1. mean RGB / luma / r:b over named screen rectangles, so "the tyre is
//      beige" becomes "the tyre is at 0.62 luma, r:b 1.52" and a change can be
//      checked against a number instead of an impression,
//   2. nearest-neighbour magnified crops, so 1 cm grain and map tiling are
//      actually visible at the low capture resolutions this box can afford.
//
//   node tools/vsprobe.mjs --views wheel,detail --out shots/vs_1 \
//     --width 512 --height 288 --url "http://127.0.0.1:5182/?quality=fast" \
//     [--eval "<js run in page after boot>"] [--zoom 4]
//
// --zoomfile <png> re-magnifies an already-captured frame and exits.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const baseUrl = arg('url', 'http://127.0.0.1:5182/?quality=fast');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1';
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', 'shots/vs_probe');
const only = arg('views', 'wheel,detail,hero');
const evalJs = arg('eval', '');
const zoom = Number(arg('zoom', '3'));
const zoomFile = arg('zoomfile', '');
// Same sweep file format as tools/vsmat.mjs, but against the real views: a JSON
// array of { name, patch: { materialName: { prop: value } } }. Booting costs
// 30 s and a 512x288 wheel view 145 s, so at 256x144 three variants of the same
// view land in about two minutes — which is the difference between measuring
// what is lifting a surface and guessing at it.
const sweepFile = arg('sweep', '');
// Comma-separated "u,v" fractions to raycast in each view, e.g.
// --pick 0.72,0.55,0.30,0.42. Prints mesh name, material name, distance and the
// material's own dirt/brightwork uniform values at each hit.
//
// Worth the fifty lines. Two of the last three defects on this material set were
// attributed to the wrong material by eye and cost an iteration each: the grille
// louvres turned out to be powder-coat steel rather than plastic, and the arch
// band turned out to be `trim` rather than the `trimGloss` flare it sits on. A
// screen point is the only unambiguous way to name a surface.
const pickList = arg('pick', '');
// Identification without rasterising. A 512x288 view costs 140-170 s in software
// and a pick costs nothing, so asking "what material is this pixel" should not
// have to pay for a frame. Boot plus two views of picks lands in about a minute.
const pickOnly = argv.includes('--pickonly');
// Pose each view once and hold it for every sweep variant. See the loop below.
const freeze = argv.includes('--freeze');
// --matscan "x,y,w,h[,grid]" — histogram of every material a grid of rays finds
// inside a screen rect. See the loop below.
const matScan = (() => {
  const i = argv.indexOf('--matscan');
  if (i < 0 || !argv[i + 1]) return null;
  const n = argv[i + 1].split(',').map(Number);
  return n.length >= 4 ? n : null;
})();
// --matroi "label=material@x,y,w,h[,grid]" measures a named material by ray
// casting a grid over a screen rect and keeping only the samples that actually
// land on it, then reading the captured frame at exactly those pixels.
//
// Hand-placed rects have now given three misleading readings in a row on this
// one surface. The mudflap is twelve pixels wide with bright trail directly
// behind it, so any box big enough to survive the truck shifting a few pixels
// between captures is mostly not the flap, and its bright decile ends up being
// the trail — which is why the band visibly disappeared while the number sat
// still. Attribution has to come from geometry, not from coordinates.
const matRois = [];
for (let i = 0; i < argv.length - 1; i++) {
  if (argv[i] !== '--matroi') continue;
  const m = /^([^=]+)=([^@]+)@([\d.,]+)$/.exec(argv[i + 1]);
  if (!m) continue;
  const nums = m[3].split(',').map(Number);
  matRois.push({ label: m[1], material: m[2], rect: nums.slice(0, 4), grid: nums[4] || 40 });
}

// Regions of interest, in fractions of the frame. Named for the substance that
// should be there, because the whole point is to check that each substance is
// landing on its own value rather than on the frame's average.
const ROI = {
  wheel: {
    tyreTread: [0.36, 0.52, 0.05, 0.22],
    tyreSide: [0.55, 0.35, 0.05, 0.08],
    // Purely on the arch flare's outer land. The old box was at the top of the
    // frame and half of it was tyre, so every flare reading so far has been an
    // average of the flare and the thing it is meant to be distinguished from —
    // which is how a 16x cut in the plastic's albedo showed up as a 25% change.
    flare: [0.225, 0.19, 0.045, 0.1],
    flareLow: [0.62, 0.29, 0.04, 0.08],
    rimAlu: [0.5, 0.5, 0.06, 0.07],
    rocker: [0.74, 0.44, 0.2, 0.1],
    paint: [0.79, 0.04, 0.18, 0.08],
    mirrorSteel: [0.04, 0.22, 0.14, 0.17],
  },
  detail: {
    hoodTop: [0.47, 0.27, 0.2, 0.05],
    fenderSide: [0.78, 0.29, 0.16, 0.12],
    bumperSteel: [0.38, 0.62, 0.24, 0.09],
    grillePlastic: [0.48, 0.42, 0.16, 0.1],
    skidPlate: [0.48, 0.83, 0.2, 0.05],
  },
  hero: {
    doorSide: [0.55, 0.4, 0.11, 0.07],
    hoodTop: [0.31, 0.53, 0.09, 0.04],
    bedSide: [0.66, 0.38, 0.08, 0.06],
    tyre: [0.46, 0.68, 0.1, 0.16],
    flare: [0.43, 0.585, 0.09, 0.05],
    // Straight on the hard band across the bonnet's leading edge — the light
    // leak this assignment opened with, relocated from the tailgate to the
    // wing. A frame-wide `hot` count cannot say which material owns it, so the
    // sweep needs a box with nothing but the streak inside it.
    hoodEdge: [0.28, 0.46, 0.13, 0.05],
    roofRail: [0.67, 0.16, 0.06, 0.04],
    // The road-film band on the rear arch, plus the three things it has to be
    // judged against: it must not be as bright as painted sheet nor as saturated
    // as the orange recovery gear, and it should sit nearer the tyre.
    archBand: [0.775, 0.43, 0.03, 0.12],
    rockerBand: [0.66, 0.6, 0.06, 0.035],
    greenPaint: [0.7, 0.3, 0.05, 0.05],
    orangeGear: [0.688, 0.212, 0.028, 0.03],
    trail: [0.86, 0.72, 0.1, 0.1],
  },
  rear: {
    bedPanel: [0.36, 0.3, 0.09, 0.06],
    bedRail: [0.37, 0.285, 0.12, 0.015],
    cabSide: [0.58, 0.4, 0.06, 0.07],
    trail: [0.2, 0.82, 0.12, 0.1],
  },
};

// Crops worth magnifying: the close views only, since that is where grain and
// tiling are judged.
const CROPS = {
  wheel: {
    tyre: [0.2, 0.35, 0.42, 0.6],
    flare: [0.28, 0.0, 0.4, 0.35],
    // The three substances that share the right half of this frame and kept
    // measuring as one tan value: sill, step and the panel above them.
    rocker: [0.62, 0.3, 0.38, 0.45],
    mirror: [0.0, 0.1, 0.24, 0.4],
    // Door skin at about two metres, which is the harshest test the paint gets:
    // three times the texel density of the hero flank, so a repeat that mips
    // away at six metres is still fully resolved here.
    paintNear: [0.62, 0.0, 0.22, 0.16],
  },
  detail: { nose: [0.3, 0.25, 0.45, 0.5], bumper: [0.2, 0.5, 0.5, 0.45] },
  hero: {
    flank: [0.4, 0.3, 0.35, 0.4],
    nose: [0.16, 0.42, 0.3, 0.35],
    // The rear arch, which is where the road-film band lives.
    arch: [0.66, 0.4, 0.24, 0.3],
    bedRail: [0.5, 0.24, 0.3, 0.16],
    // A flat run of door skin, big enough to show the flake and orange peel and
    // small enough that a repeat would be obvious across it.
    paintGrain: [0.56, 0.44, 0.09, 0.1],
  },
  rear: {
    bedPanel: [0.28, 0.24, 0.34, 0.24],
    rearArch: [0.4, 0.42, 0.3, 0.3],
  },
};

const launchArgs = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--js-flags=--max-old-space-size=4096',
];

const log = (...a) => console.log('[vsprobe]', ...a);

/** Draw an image into a canvas and read stats / crops back out. */
const PAGE_HELPERS = `
window.__vs = {
  /**
   * Ray cast screen points against the vehicle and name what they hit.
   *
   * Nothing here may construct a three object — THREE is not exported anywhere
   * reachable from the page — but cloning an existing one is free and a cloned
   * Vector3 carries every method needed, unproject() included. Intersection is
   * then Moller-Trumbore against each mesh's index buffer in object space.
   * Restricted to the vehicle: brute force over the forest's two million
   * triangles would take minutes and every surface in question is on the truck.
   */
  pick(pts) {
    const { scene, camera } = window.debugAPI.objects;
    const root = window.debugAPI.objects.vehicle.root || scene;
    const meshes = [];
    root.traverse((o) => {
      if (o.isMesh && o.visible && o.geometry && o.geometry.attributes.position) meshes.push(o);
    });
    const cache = meshes.map((m) => {
      const g = m.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const c = g.boundingBox.min.clone().add(g.boundingBox.max).multiplyScalar(0.5);
      return { m, g, c, r: g.boundingBox.min.distanceTo(g.boundingBox.max) * 0.5, inv: m.matrixWorld.clone().invert() };
    });
    const tmp = camera.position.clone();
    const out = [];
    for (let p = 0; p < pts.length; p++) {
      const origin = camera.position.clone();
      const dir = tmp.clone().set(pts[p][0] * 2 - 1, -(pts[p][1] * 2 - 1), 0.5).unproject(camera).sub(origin).normalize();
      let best = null;
      for (const e of cache) {
        const o = origin.clone().applyMatrix4(e.inv);
        const d = origin.clone().add(dir).applyMatrix4(e.inv).sub(o).normalize();
        const toC = e.c.clone().sub(o);
        const along = toC.dot(d);
        if (along < -e.r) continue;
        if (toC.lengthSq() - along * along > e.r * e.r) continue;
        const pos = e.g.attributes.position;
        const idx = e.g.index;
        const n = idx ? idx.count : pos.count;
        const a = e.c.clone();
        for (let i = 0; i + 2 < n; i += 3) {
          const i0 = idx ? idx.getX(i) : i;
          const i1 = idx ? idx.getX(i + 1) : i + 1;
          const i2 = idx ? idx.getX(i + 2) : i + 2;
          const ax = pos.getX(i0), ay = pos.getY(i0), az = pos.getZ(i0);
          const e1x = pos.getX(i1) - ax, e1y = pos.getY(i1) - ay, e1z = pos.getZ(i1) - az;
          const e2x = pos.getX(i2) - ax, e2y = pos.getY(i2) - ay, e2z = pos.getZ(i2) - az;
          const px = d.y * e2z - d.z * e2y;
          const py = d.z * e2x - d.x * e2z;
          const pz = d.x * e2y - d.y * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          if (det > -1e-12 && det < 1e-12) continue;
          const invDet = 1 / det;
          const tx = o.x - ax, ty = o.y - ay, tz = o.z - az;
          const u = (tx * px + ty * py + tz * pz) * invDet;
          if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y;
          const qy = tz * e1x - tx * e1z;
          const qz = tx * e1y - ty * e1x;
          const v = (d.x * qx + d.y * qy + d.z * qz) * invDet;
          if (v < 0 || u + v > 1) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
          if (t <= 1e-4) continue;
          // t is along the object-space ray, so depth is only comparable once
          // the hit is transformed back to world space
          const wp = a.clone().set(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t).applyMatrix4(e.m.matrixWorld);
          const dist = wp.distanceTo(origin);
          if (!best || dist < best.dist) {
            const mat = Array.isArray(e.m.material) ? e.m.material[0] : e.m.material;
            best = { dist, mesh: e.m.name || '(unnamed)', material: (mat && mat.name) || '(unnamed)', mat };
          }
        }
      }
      out.push(best ? { at: pts[p], mesh: best.mesh, material: best.material, dist: +best.dist.toFixed(2), mat: best.mat } : { at: pts[p], miss: true });
    }
    return out;
  },
  /** Uniform dumps for a picked material, for reporting alongside a hit. */
  uniforms(mat) {
    const u = mat && mat.userData;
    const dump = (bag) => {
      if (!u || !u[bag]) return null;
      const o = {};
      for (const [k, ref] of Object.entries(u[bag])) {
        const val = ref.value;
        if (typeof val === 'number') o[k] = +val.toFixed(3);
        else if (val && val.isColor) o[k] = '#' + val.getHexString();
      }
      return o;
    };
    return { dirt: dump('dirt'), bw: dump('bw'), cb: dump('cb') };
  },
  ctxFor(img, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);
    return { c, ctx };
  },
  stats(ctx, w, h, rois) {
    const srgbToLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const out = {};
    const all = ctx.getImageData(0, 0, w, h).data;
    let clipped = 0, crushed = 0, sum = 0, hot = 0;
    // A light leak is a few hundred pixels, so a frame mean will never see it
    // and "clipped" only catches the very tip. The histogram top end is what
    // actually tracks a hard white streak appearing or going away.
    const hist = new Float64Array(256);
    for (let i = 0; i < all.length; i += 4) {
      const l = (all[i] * 0.2126 + all[i + 1] * 0.7152 + all[i + 2] * 0.0722) / 255;
      sum += l;
      hist[Math.min(255, Math.round(l * 255))]++;
      if (all[i] > 250 && all[i + 1] > 250 && all[i + 2] > 250) clipped++;
      if (l > 0.9) hot++;
      if (l < 0.016) crushed++;
    }
    const n = all.length / 4;
    let acc = 0, p999 = 0;
    for (let i = 255; i >= 0; i--) {
      acc += hist[i];
      if (acc >= n * 0.001) { p999 = i / 255; break; }
    }
    out.__frame = {
      mean: +(sum / n).toFixed(4),
      p999: +p999.toFixed(3),
      hotPct: +((hot / n) * 100).toFixed(3),
      clippedPct: +((clipped / n) * 100).toFixed(3),
      crushedPct: +((crushed / n) * 100).toFixed(3),
    };
    for (const [name, r] of Object.entries(rois)) {
      const x = Math.max(0, Math.round(r[0] * w));
      const y = Math.max(0, Math.round(r[1] * h));
      const rw = Math.max(1, Math.min(w - x, Math.round(r[2] * w)));
      const rh = Math.max(1, Math.min(h - y, Math.round(r[3] * h)));
      const d = ctx.getImageData(x, y, rw, rh).data;
      let R = 0, G = 0, B = 0, L = 0, lmin = 1, lmax = 0, sat = 0;
      const m = d.length / 4;
      for (let i = 0; i < d.length; i += 4) {
        const r8 = d[i] / 255, g8 = d[i + 1] / 255, b8 = d[i + 2] / 255;
        R += r8; G += g8; B += b8;
        const l = r8 * 0.2126 + g8 * 0.7152 + b8 * 0.0722;
        L += l;
        if (l < lmin) lmin = l;
        if (l > lmax) lmax = l;
        const mx = Math.max(r8, g8, b8), mn = Math.min(r8, g8, b8);
        sat += mx > 0.001 ? (mx - mn) / mx : 0;
      }
      const lr = srgbToLin(R / m), lg = srgbToLin(G / m), lb = srgbToLin(B / m);
      out[name] = {
        rgb: [Math.round((R / m) * 255), Math.round((G / m) * 255), Math.round((B / m) * 255)],
        luma: +(L / m).toFixed(3),
        range: +(lmax - lmin).toFixed(3),
        sat: +(sat / m).toFixed(3),
        rb: +(lb > 1e-4 ? lr / lb : 99).toFixed(2),
        rg: +(lg > 1e-4 ? lr / lg : 99).toFixed(2),
      };
    }
    return out;
  },
  // The frame with every sample box drawn on it. Two readings in a row were
  // taken from a box that turned out to be half on the tyre, which made a 16x
  // change in the flare's albedo look like a 25% change — so the overlay is not
  // a nicety, it is the only way to know what a number refers to.
  overlay(img, w, h, rois, scale) {
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w * scale, h * scale);
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    for (const [name, r] of Object.entries(rois)) {
      const x = r[0] * w * scale;
      const y = r[1] * h * scale;
      const rw = r[2] * w * scale;
      const rh = r[3] * h * scale;
      ctx.strokeStyle = '#ff2fd0';
      ctx.strokeRect(x + 0.5, y + 0.5, rw, rh);
      ctx.fillStyle = '#ff2fd0';
      ctx.fillText(name, x + 2, y - 2 < 10 ? y + rh + 10 : y - 2);
    }
    return c.toDataURL('image/png');
  },
  crop(img, w, h, r, scale) {
    const cw = Math.max(1, Math.round(r[2] * w));
    const ch = Math.max(1, Math.round(r[3] * h));
    const c = document.createElement('canvas');
    c.width = cw * scale; c.height = ch * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(r[0] * w), Math.round(r[1] * h), cw, ch, 0, 0, cw * scale, ch * scale);
    return c.toDataURL('image/png');
  },
};
`;

async function loadImage(page, dataUrl) {
  return page.evaluate(
    (u) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          window.__vsImg = img;
          res([img.naturalWidth, img.naturalHeight]);
        };
        img.onerror = rej;
        img.src = u;
      }),
    dataUrl,
  );
}

async function zoomOnly() {
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  await page.goto('about:blank');
  await page.addScriptTag({ content: PAGE_HELPERS });
  const buf = await readFile(zoomFile);
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
  const [w, h] = await loadImage(page, dataUrl);
  const view = path.basename(zoomFile, '.png');
  const crops = CROPS[view] || { all: [0, 0, 1, 1] };
  await mkdir(outDir, { recursive: true });
  for (const [name, r] of Object.entries(crops)) {
    const u = await page.evaluate(
      ({ r, s, w, h }) => window.__vs.crop(window.__vsImg, w, h, r, s),
      { r, s: zoom, w, h },
    );
    const f = path.join(outDir, `${view}_${name}_x${zoom}.png`);
    await writeFile(f, Buffer.from(u.split(',')[1], 'base64'));
    log('crop ->', f);
  }
  await browser.close();
}

async function main() {
  if (zoomFile) return zoomOnly();
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

  // Four agents share this checkout, a view takes 30-100 s to rasterise in
  // software, and any one of their saves fires a vite full reload that destroys
  // the execution context halfway through a capture. Stubbing out the HMR client
  // is the only way to get a run that finishes: the app's own module graph is
  // untouched, there is just nothing listening for an update.
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

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      errors.push(`${m.type()}: ${m.text()}`);
      log(`page ${m.type()}:`, m.text());
    }
  });
  page.on('pageerror', (e) => {
    errors.push(`pageerror: ${e.message}`);
    log('page error:', e.message);
  });

  const t0 = Date.now();
  log(`loading ${url} at ${width}x${height}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) {
    console.error('[vsprobe] app failed to boot:\n' + err);
    await browser.close();
    process.exit(1);
  }
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await page.addScriptTag({ content: PAGE_HELPERS });

  if (evalJs) {
    const r = await page.evaluate(evalJs);
    log('eval ->', JSON.stringify(r));
  }

  const views = only.split(',').filter(Boolean);
  const variants = sweepFile ? JSON.parse(await readFile(sweepFile, 'utf8')) : [{ name: '', patch: {} }];
  const report = {};
  for (const view of views) {
   let posed = false;
   for (const variant of variants) {
    const ts = Date.now();
    // setView re-runs the 320-step preroll, which re-seeds the dust and the wind
    // and leaves the truck a little further down the trail. Across a sweep that
    // moves the surface under test into different light between variants, and it
    // is why three earlier sweeps came back non-monotonic and one had `nodirt`
    // brighter than `base`. With --freeze the view is posed once and only the
    // patched uniforms change after that, so a difference is the parameter.
    const ok = posed && freeze ? true : await page.evaluate((v) => window.debugAPI.setView(v), view);
    posed = true;
    if (!ok) {
      log(`unknown view "${view}"`);
      continue;
    }
    if (variant.patch && Object.keys(variant.patch).length) {
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
                  if (!u || !u[k]) continue;
                  // A colour uniform handed a hex number would be uploaded as a
                  // scalar and silently break the vec3, so route numbers through
                  // setHex — which also applies the same sRGB decode the
                  // material used when it built the uniform in the first place.
                  if (u[k].value && u[k].value.isColor && typeof val === 'number') u[k].value.setHex(val);
                  else u[k].value = val;
                  done.push(name + '.' + k);
                }
              } else if (k === 'color' || k === 'emissive') { m[k].setHex(val); done.push(name + '.' + k); }
              else { m[k] = val; done.push(name + '.' + k); }
            }
            m.needsUpdate = true;
          }
          return done;
        })(${JSON.stringify({ patch: variant.patch })})`,
      );
      log(`patch ${variant.name}:`, applied.join(' '));
    }
    if (pickList) {
      const nums = pickList.split(',').map(Number);
      const pts = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
      const hits = await page.evaluate(
        `(({ pts }) => window.__vs.pick(pts).map((h) => (h.miss ? h : { at: h.at, mesh: h.mesh, material: h.material, dist: h.dist, ...window.__vs.uniforms(h.mat) })))(${JSON.stringify({ pts })})`,
      );
      for (const h of hits) {
        if (h.miss) log(`pick ${view} ${JSON.stringify(h.at)} -> miss`);
        else log(`pick ${view} ${JSON.stringify(h.at)} -> ${h.mesh} / ${h.material} @ ${h.dist}m`);
      }
      if (pickOnly && !matScan) {
        report[view] = hits;
        continue;
      }
    }
    // "What is in this part of the frame" without having to already know. Named
    // points keep missing because the truck is a little further down the trail
    // on every boot, and three defects in a row have now been attributed to the
    // wrong material by eye. A grid of rays over a rect and a histogram of what
    // they hit answers the question directly and costs no render.
    if (matScan) {
      const [rx, ry, rw, rh, g] = matScan;
      const grid = g || 20;
      const pts = [];
      for (let j = 0; j < grid; j++) {
        for (let i = 0; i < grid; i++) {
          pts.push([rx + (rw * (i + 0.5)) / grid, ry + (rh * (j + 0.5)) / grid]);
        }
      }
      const hist = await page.evaluate(
        `(({ pts }) => {
          const hits = window.__vs.pick(pts);
          const by = {};
          for (const h of hits) {
            if (h.miss) continue;
            const k = h.material || '(unnamed)';
            by[k] = by[k] || { n: 0, dist: 0, mesh: h.mesh };
            by[k].n++;
            by[k].dist += h.dist;
          }
          return Object.entries(by)
            .map(([k, v]) => ({ material: k, n: v.n, dist: +(v.dist / v.n).toFixed(2), mesh: v.mesh }))
            .sort((a, b) => b.n - a.n);
        })(${JSON.stringify({ pts })})`,
      );
      log(`matscan ${view} ${grid}x${grid} over [${matScan.slice(0, 4).join(',')}]`);
      for (const e of hist) log(`  ${String(e.n).padStart(4)}  ${e.material.padEnd(12)} ${e.dist}m  e.g. ${e.mesh}`);
      if (pickOnly) {
        report[view] = hist;
        continue;
      }
    }
    const tag = variant.name ? `${view}_${variant.name}` : view;
    const dataUrl = await page.evaluate(() => window.debugAPI.captureFrame(2));
    const file = path.join(outDir, `${tag}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));

    const [w, h] = await loadImage(page, dataUrl);
    const s = await page.evaluate(
      ({ rois, w, h }) => {
        const { ctx } = window.__vs.ctxFor(window.__vsImg, w, h);
        return window.__vs.stats(ctx, w, h, rois);
      },
      { rois: ROI[view] || {}, w, h },
    );
    report[tag] = s;

    for (const mr of matRois) {
      const res = await page.evaluate(
        `(({ mr, w, h }) => {
          const [rx, ry, rw, rh] = mr.rect;
          const pts = [];
          for (let j = 0; j < mr.grid; j++) {
            for (let i = 0; i < mr.grid; i++) {
              pts.push([rx + (rw * (i + 0.5)) / mr.grid, ry + (rh * (j + 0.5)) / mr.grid]);
            }
          }
          const hits = window.__vs.pick(pts);
          const { ctx } = window.__vs.ctxFor(window.__vsImg, w, h);
          const img = ctx.getImageData(0, 0, w, h).data;
          const px = [];
          const seen = new Set();
          for (const hit of hits) {
            if (hit.miss || hit.material !== mr.material) continue;
            const x = Math.min(w - 1, Math.max(0, Math.round(hit.at[0] * w)));
            const y = Math.min(h - 1, Math.max(0, Math.round(hit.at[1] * h)));
            const key = y * w + x;
            if (seen.has(key)) continue;
            seen.add(key);
            const i = key * 4;
            px.push([img[i], img[i + 1], img[i + 2]]);
          }
          if (!px.length) return { n: 0 };
          let R = 0, G = 0, B = 0, S = 0;
          const ls = [];
          for (const [r8, g8, b8] of px) {
            R += r8; G += g8; B += b8;
            const mx = Math.max(r8, g8, b8) / 255;
            const mn = Math.min(r8, g8, b8) / 255;
            S += mx > 0.001 ? (mx - mn) / mx : 0;
            ls.push([(r8 * 0.2126 + g8 * 0.7152 + b8 * 0.0722) / 255, mx > 0.001 ? (mx - mn) / mx : 0]);
          }
          const n = px.length;
          ls.sort((a, b) => b[0] - a[0]);
          const k = Math.max(1, Math.round(n * 0.1));
          let tl = 0, ts = 0;
          for (let i = 0; i < k; i++) { tl += ls[i][0]; ts += ls[i][1]; }
          // "One flat value with a specular line on the rail" is a claim about
          // variation, and a mean cannot answer it. The 10-90 spread over the
          // material's own pixels can: a panel carrying a sky-to-ground sweep
          // has a wide one, a panel that is a single colour has almost none, and
          // unlike a peak it is not moved by one clipped highlight.
          const p10 = ls[Math.min(n - 1, Math.floor(n * 0.9))][0];
          const p90 = ls[Math.floor(n * 0.1)][0];
          return {
            n,
            rgb: [Math.round(R / n), Math.round(G / n), Math.round(B / n)],
            luma: +((R * 0.2126 + G * 0.7152 + B * 0.0722) / n / 255).toFixed(3),
            sat: +(S / n).toFixed(3),
            // Linear, to match the screen-rect path above. These were sRGB byte
            // ratios and the two were being read side by side as if they meant
            // the same thing — a surface reported at 2.11 by one and 1.26 by the
            // other is the *same measurement* in two colour spaces, and an
            // afternoon went into chasing a warm cast that the discrepancy
            // invented. Linear is the right space for the comparison: it is
            // where the ratio of two channels means the ratio of two energies.
            rb: +(function () {
              const s = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
              const lr = s(R / n / 255);
              const lb = s(B / n / 255);
              return lb > 1e-4 ? lr / lb : 99;
            })().toFixed(2),
            topLuma: +(tl / k).toFixed(3),
            topSat: +(ts / k).toFixed(3),
            spread: +(p90 - p10).toFixed(3),
          };
        })(${JSON.stringify({ mr, w, h })})`,
      );
      report[tag] = report[tag] || {};
      report[tag][`mat_${mr.label}`] = res;
      log(
        `  mat ${mr.label.padEnd(10)} (${mr.material}) n=${String(res.n).padEnd(4)} luma ${String(res.luma ?? '-').padEnd(6)} sat ${String(res.sat ?? '-').padEnd(6)} r:b ${String(res.rb ?? '-').padEnd(5)} spread ${String(res.spread ?? '-').padEnd(6)} | top10% luma ${String(res.topLuma ?? '-').padEnd(6)} sat ${res.topSat ?? '-'}`,
      );
    }

    for (const [name, r] of Object.entries(CROPS[view] || {})) {
      const u = await page.evaluate(
        ({ r, s, w, h }) => window.__vs.crop(window.__vsImg, w, h, r, s),
        { r, s: zoom, w, h },
      );
      await writeFile(path.join(outDir, `${tag}_${name}.png`), Buffer.from(u.split(',')[1], 'base64'));
    }
    {
      const u = await page.evaluate(
        ({ rois, w, h }) => window.__vs.overlay(window.__vsImg, w, h, rois, 2),
        { rois: ROI[view] || {}, w, h },
      );
      await writeFile(path.join(outDir, `${tag}_roi.png`), Buffer.from(u.split(',')[1], 'base64'));
    }

    log(`${tag} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s)`);
    const f = s.__frame;
    log(
      `  frame mean ${f.mean} p99.9 ${f.p999} hot ${f.hotPct}% clipped ${f.clippedPct}% crushed ${f.crushedPct}%`,
    );
    for (const [name, v] of Object.entries(s)) {
      if (name === '__frame') continue;
      log(
        `  ${name.padEnd(15)} rgb ${String(v.rgb).padEnd(15)} luma ${String(v.luma).padEnd(6)}` +
          ` range ${String(v.range).padEnd(6)} sat ${String(v.sat).padEnd(6)} r:b ${v.rb}`,
      );
    }
   }
  }

  report.__stats = await page.evaluate(() => window.debugAPI.stats());
  report.__errors = errors;
  await writeFile(path.join(outDir, 'probe.json'), JSON.stringify(report, null, 2));
  log('runtime', JSON.stringify(report.__stats));
  await browser.close();
  log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
