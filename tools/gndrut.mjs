#!/usr/bin/env node
// Ground close-ups with the truck out of the way, plus ablations.
//
// The beauty framings and `roadview crawl` both put the truck across most of the
// frame, so the two rubric items that live on the running surface — the tread
// imprint and the stones' contact shadows — were being judged from the corner of
// a picture of a wheel. These framings sit on the trail itself, and each one can
// be shot with a named object dropped so the difference proves whether the
// feature is reaching the surface at all.
//
//   node tools/gndrut.mjs --out shots/gd_12 --views rut,kerb,verge
//   node tools/gndrut.mjs --out shots/gd_12 --views rut --ablate roadStoneShadows
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5183/');
const url = base + (base.includes('?') ? '&' : '?') + 'quality=fast&capture=1';
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', 'shots/rut');
const only = arg('views', 'rut,kerb,verge');
const ablate = arg('ablate', '')
  .split(',')
  .filter(Boolean);
// `--set name:code` snippets, evaluated with `t` bound to the terrain and `u` to
// its shader uniforms, so a tier can be turned off in the framing that is
// actually failing rather than in whichever named view happens to exist.
const sets = argv.reduce((a, v, i) => (v === '--set' ? [...a, argv[i + 1]] : a), []);

// Offsets are in road space at t = 0.42: [ along, lateral, eye ] for the camera
// and [ along, lateral, height ] for the target. Lateral 0.62 is the rut centre.
const FRAMINGS = {
  // 40 cm above the left rut looking straight down it. The framing the mandate
  // names: if the surface does not hold up here it does not hold up.
  rut: { eye: [-2.6, 0.62, 0.4], at: [3.2, 0.62, 0.06], fov: 42 },
  // Across the ruts from a squat, so the crown, both troughs and the pushed-up
  // lips are all in one frame and the tread has to read on a surface that is
  // turning away from the camera.
  kerb: { eye: [-1.4, -2.3, 0.55], at: [1.6, 0.9, 0.05], fov: 46 },
  // The track-to-undergrowth margin at eye level for a crouching person.
  verge: { eye: [-1.0, 1.05, 0.5], at: [2.4, 2.9, 0.12], fov: 44 },
  // Waist height, 1.4 m back, looking down into a rut at about fifty degrees.
  // A tyre print is a 2 cm hollow in a horizontal surface, so it only reads from
  // above: `rut` looks *along* the trough at eight degrees of incidence, where a
  // 2 cm hollow is a third of a pixel deep, and `kerb` frames the shoulder. This
  // is the framing that can actually answer whether the imprint reaches the
  // surface.
  tread: { eye: [-1.4, 0.62, 1.15], at: [0.5, 0.62, 0.04], fov: 40 },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('boot failed:\n' + err);
  await browser.close();
  process.exit(1);
}

for (const name of only.split(',')) {
  const fr = FRAMINGS[name];
  if (!fr) {
    console.error(`[gndrut] no framing ${name}`);
    continue;
  }
  const variants = sets.length ? sets : ablate.length ? ['', ...ablate.map((d) => `no_${d}:`)] : [''];
  for (const variant of variants) {
    const [tag, ...rest] = variant.split(':');
    const code = rest.join(':');
    const drop = tag.startsWith('no_') && !code ? tag.slice(3) : '';
    const { dataUrl, luma, at } = await page.evaluate(
      async ([fr, drop, code]) => {
        const { camera, terrain, vehicle, scene } = window.debugAPI.objects;
        if (code) new Function('t', 'u', code)(terrain, terrain.material.userData.uniforms);
        terrain.material.needsUpdate = true;
        window.debugAPI.setView('forest');
        vehicle.root.visible = false;
        const dust = scene.getObjectByName('wheelDust');
        if (dust) dust.visible = false;
        const hidden = [];
        if (drop) {
          const o = scene.getObjectByName(drop);
          if (o) {
            hidden.push([o, o.visible]);
            o.visible = false;
          }
        }
        // Road space at a fixed station, so the framings are repeatable between
        // runs and between iterations however the truck happened to settle.
        const t = 0.42;
        const p = terrain.roadPoint(t);
        const tg = terrain.roadTangent(t);
        const nx = -tg.z;
        const nz = tg.x;
        const place = ([along, lat, up]) => {
          const x = p.x + tg.x * along + nx * lat;
          const z = p.z + tg.z * along + nz * lat;
          return { x, y: terrain.heightAt(x, z) + up, z };
        };
        const eye = place(fr.eye);
        const tgt = place(fr.at);
        camera.position.set(eye.x, eye.y, eye.z);
        camera.fov = fr.fov;
        camera.lookAt(tgt.x, tgt.y, tgt.z);
        camera.updateProjectionMatrix();
        const dataUrl = window.debugAPI.captureFrame(2);
        const luma = window.debugAPI.sampleLuma();
        for (const [o, v] of hidden) o.visible = v;
        vehicle.root.visible = true;
        if (dust) dust.visible = true;
        return { dataUrl, luma, at: [eye.x.toFixed(1), eye.y.toFixed(1), eye.z.toFixed(1)] };
      },
      [fr, drop, code],
    );
    const file = path.join(outDir, `dv_${name}${tag ? `_${tag}` : ''}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`[gndrut] ${name}${tag ? ` [${tag}]` : ''} -> ${file} luma ${luma.mean.toFixed(4)} at ${at.join(' ')}`);
  }
}
await browser.close();
