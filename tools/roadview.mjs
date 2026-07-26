#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// Diagnostic framings for the dirt road itself. The named beauty views are
// all tight on the truck, which makes it impossible to judge whether the
// two-track, the verge blend and the terrain silhouette actually work.
//
//   node tools/roadview.mjs --iter 4 --url http://127.0.0.1:5183/
//
// Framings are placed relative to the truck after the standard pre-roll:
//   ruts     1.3 m up, 7 m behind, looking down the two-track
//   wide     14 m up, 30 m back, the road as a ribbon through the forest
//   contact  ground level at the rear wheel, tyre against dirt
//   plume    off to the side, dust trail against the sun

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const iter = arg('iter', '0');
const base = arg('url', 'http://127.0.0.1:5183/');
const url = base + (base.includes('?') ? '&' : '?') + 'quality=fast&capture=1';
const width = Number(arg('width', '560'));
const height = Number(arg('height', '315'));
const outDir = arg('out', path.join('shots', `iter_${iter}`));
const only = arg('views', '');
// optional uniform poke, e.g. --set "u.uDebug.value=1"
const setCode = arg('set', '');
// the truck fills a third of most framings; --bare drops it and the dust so the
// trail can be judged on its own
const bare = argv.includes('--bare');
const suffix = arg('suffix', '');

const FRAMINGS = {
  // 1.3 m up and 7 m back only shows about 1.6 m of ground at the bottom of
  // the frame, which is all crown — too tight to tell whether the two-track
  // reads. Higher and wider puts both ruts and both verges in shot.
  ruts: { pos: [0.0, 2.4, -9.5], target: [0.0, 0.2, 3.0], fov: 52 },
  low: { pos: [0.4, 1.3, -7.0], target: [0.0, 0.15, 6.0], fov: 42 },
  wide: { pos: [6.0, 14.0, -30.0], target: [0.0, 0.6, 12.0], fov: 44 },
  contact: { pos: [2.0, 0.24, -1.1], target: [0.6, 0.06, -1.5], fov: 34 },
  plume: { pos: [9.0, 2.2, -9.0], target: [-1.0, 1.2, 1.0], fov: 46 },
  cross: { pos: [9.5, 2.6, 1.0], target: [-2.0, 0.2, 0.5], fov: 40 },
  // Straight down at the trail from four metres, no truck in the way. The only
  // framing that answers "is the two-track the right shape" rather than "does
  // the two-track happen to catch the light here".
  plan: { pos: [0.0, 6.5, -1.0], target: [0.0, 0.0, 1.4], fov: 46 },
  // Nose to the dirt, 25 cm off the ground looking along a rut. This is where
  // "mushy at close range" either is or is not fixed.
  crawl: { pos: [0.9, 0.26, -3.4], target: [0.85, 0.08, 1.6], fov: 40 },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[console]', m.text());
});

const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('boot failed:\n' + err);
  await browser.close();
  process.exit(1);
}
console.log(`[roadview] booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const names = only ? only.split(',') : Object.keys(FRAMINGS);
for (const name of names) {
  // `wet` is not a fixed framing: it walks the terrain's aWet attribute for the
  // deepest standing water on the road and frames that. Puddles are a few square
  // metres in a three hundred metre road, so waiting for one to turn up in a
  // framing anchored to the truck is not a plan.
  if (name === 'wet' || name === 'wetlow') {
    const ts = Date.now();
    const { dataUrl, luma, at } = await page.evaluate(
      async ([low, hide]) => {
        const { camera, terrain, vehicle, scene } = window.debugAPI.objects;
        window.debugAPI.setView('forest');
        if (hide) vehicle.root.visible = false;
        const g = terrain.mesh.geometry;
        const w = g.attributes.aWet.array;
        const p = g.attributes.position.array;
        // widest patch, not deepest point: score each candidate by the water
        // around it so the camera lands on a puddle rather than on a wet speck
        let best = -1;
        let bi = 0;
        for (let i = 0; i < w.length; i += 3) {
          if (w[i] < 0.5) continue;
          let s = 0;
          for (let j = Math.max(0, i - 40); j < Math.min(w.length, i + 40); j++) s += w[j];
          if (s > best) {
            best = s;
            bi = i;
          }
        }
        const x = p[bi * 3];
        const y = p[bi * 3 + 1];
        const z = p[bi * 3 + 2];
        const d = low ? 2.0 : 3.4;
        camera.position.set(x + d * 0.55, y + (low ? 0.42 : 1.9), z + d);
        camera.fov = low ? 40 : 46;
        camera.lookAt(x, y, z);
        camera.updateProjectionMatrix();
        const dataUrl = window.debugAPI.captureFrame(2);
        const luma = window.debugAPI.sampleLuma();
        vehicle.root.visible = true;
        void scene;
        return { dataUrl, luma, at: [x.toFixed(1), y.toFixed(1), z.toFixed(1), best.toFixed(1)] };
      },
      [name === 'wetlow', bare],
    );
    const file = path.join(outDir, `dv_${name}${suffix}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(
      `[roadview] ${name} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, luma ${luma.mean.toFixed(3)}, at ${at.join(' ')})`,
    );
    continue;
  }
  const f = FRAMINGS[name];
  if (!f) continue;
  const ts = Date.now();
  const { dataUrl, luma, rgbMean } = await page.evaluate(async ([fr, code, hide]) => {
    const THREE = await import('/node_modules/three/build/three.module.js').catch(() => null);
    const { camera, vehicle, terrain, scene } = window.debugAPI.objects;
    window.debugAPI.setView('forest');
    if (code) new Function('t', 'u', code)(terrain, terrain.material.userData.uniforms);
    const m = vehicle.root.matrixWorld.clone();
    if (hide) {
      vehicle.root.visible = false;
      const dust = scene.getObjectByName('wheelDust');
      if (dust) dust.visible = false;
    }
    const apply = (v) => {
      const p = { x: v[0], y: v[1], z: v[2] };
      const e = m.elements;
      return {
        x: e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12],
        y: e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13],
        z: e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14],
      };
    };
    const p = apply(fr.pos);
    const t = apply(fr.target);
    camera.position.set(p.x, p.y, p.z);
    camera.fov = fr.fov;
    camera.lookAt(t.x, t.y, t.z);
    camera.updateProjectionMatrix();
    void THREE;
    const dataUrl = window.debugAPI.captureFrame(2);
    const luma = window.debugAPI.sampleLuma();
    // Mean sRGB of the bottom third, which is ground in every framing here.
    // Judging "is this brown or is it red" by eye through ACES and the grade is
    // guesswork; the red/blue ratio is not.
    const cv = window.debugAPI.objects.renderer.domElement;
    const c2 = document.createElement('canvas');
    c2.width = cv.width;
    c2.height = cv.height;
    const g2 = c2.getContext('2d');
    g2.drawImage(cv, 0, 0);
    const y0 = Math.floor(cv.height * 0.66);
    const px = g2.getImageData(0, y0, cv.width, cv.height - y0).data;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    for (let i = 0; i < px.length; i += 4) {
      sr += px[i];
      sg += px[i + 1];
      sb += px[i + 2];
    }
    const np = px.length / 4;
    const rgbMean = [sr / np, sg / np, sb / np];
    vehicle.root.visible = true;
    const dust2 = scene.getObjectByName('wheelDust');
    if (dust2) dust2.visible = true;
    return { dataUrl, luma, rgbMean };
  }, [f, setCode, bare]);
  const file = path.join(outDir, `dv_${name}${suffix}.png`);
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  const [r, g, b] = rgbMean;
  console.log(
    `[roadview] ${name} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, luma ${luma.mean.toFixed(3)}, ` +
      `ground rgb ${r.toFixed(0)}/${g.toFixed(0)}/${b.toFixed(0)} r:b ${(r / Math.max(1, b)).toFixed(2)})`,
  );
}
await browser.close();
