#!/usr/bin/env node
// Prove where the water mesh actually lands on screen, and why it does not.
//
// The pools render dark, and dark is also what the wetness field does to the
// dirt, so a normal capture cannot tell "the sheet is missing" from "the sheet
// is there and reads exactly like wet mud". This shoots the same framing three
// ways — as built, flat magenta, and flat magenta with the depth test off — so
// the triple separates "not drawn at all" from "drawn and buried" from "drawn
// and indistinguishable".
//
//   node tools/gndwet.mjs --iter 11 --out shots/gd_11
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
const outDir = arg('out', path.join('shots', `wet_${arg('iter', '0')}`));
const eye = Number(arg('eye', '0.5'));

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

const shots = await page.evaluate(async (eye) => {
  const { camera, terrain, vehicle, scene } = window.debugAPI.objects;
  window.debugAPI.setView('forest');
  vehicle.root.visible = false;
  const dust = scene.getObjectByName('wheelDust');
  if (dust) dust.visible = false;

  const water = terrain.water;
  const p = water.geometry.attributes.position.array;
  const a = water.geometry.attributes.aAlpha.array;
  const ring = 40;
  let best = { r: 0, x: 0, y: 0, z: 0 };
  let n = 0;
  const widest = [];
  for (let i = 0; i < a.length; i += ring + 1) {
    const cx = p[i * 3];
    const cy = p[i * 3 + 1];
    const cz = p[i * 3 + 2];
    let span = 0;
    for (let k = 1; k <= ring && i + k < a.length; k++) {
      span = Math.max(span, Math.hypot(p[(i + k) * 3] - cx, p[(i + k) * 3 + 2] - cz));
    }
    widest.push(span);
    if (span > best.r) best = { r: span, x: cx, y: cy, z: cz };
    n++;
  }
  widest.sort((u, v) => v - u);

  const d = Math.max(1.1, best.r * 1.8);
  camera.position.set(best.x + d * 0.5, best.y + eye, best.z + d);
  camera.fov = 45;
  camera.lookAt(best.x, best.y + 0.01, best.z);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const shots = {};
  shots.real = window.debugAPI.captureFrame(2);

  const keepFrag = water.material.fragmentShader;
  const flatFrag = `
    varying vec3 vWorld;
    varying float vAlpha;
    varying float vDepth;
    void main() { gl_FragColor = vec4( 1.0, 0.0, 1.0, 1.0 ); }`;
  water.material.fragmentShader = flatFrag;
  water.material.transparent = false;
  water.material.needsUpdate = true;
  shots.flat = window.debugAPI.captureFrame(2);

  water.material.depthTest = false;
  water.material.needsUpdate = true;
  shots.nodepth = window.debugAPI.captureFrame(2);

  // lift the whole sheet a metre: if magenta appears now the mesh draws fine and
  // the fault is placement, if it still does not the draw itself is being eaten
  water.position.y += 1;
  water.updateMatrixWorld(true);
  shots.lifted = window.debugAPI.captureFrame(2);
  water.position.y -= 1;
  water.updateMatrixWorld(true);

  water.material.fragmentShader = keepFrag;
  water.material.transparent = true;
  water.material.depthTest = true;
  water.material.needsUpdate = true;

  // where the pool centre projects to in NDC, through the exact matrices the
  // renderer uses, so a bad parent transform shows up as an off-screen result
  const v = { x: best.x, y: best.y, z: best.z };
  const mw = water.matrixWorld.elements;
  const wx = mw[0] * v.x + mw[4] * v.y + mw[8] * v.z + mw[12];
  const wy2 = mw[1] * v.x + mw[5] * v.y + mw[9] * v.z + mw[13];
  const wz = mw[2] * v.x + mw[6] * v.y + mw[10] * v.z + mw[14];
  const vi = camera.matrixWorldInverse.elements;
  const ex = vi[0] * wx + vi[4] * wy2 + vi[8] * wz + vi[12];
  const ey = vi[1] * wx + vi[5] * wy2 + vi[9] * wz + vi[13];
  const ez = vi[2] * wx + vi[6] * wy2 + vi[10] * wz + vi[14];
  const pm = camera.projectionMatrix.elements;
  const cx2 = pm[0] * ex + pm[4] * ey + pm[8] * ez + pm[12];
  const cy2 = pm[1] * ex + pm[5] * ey + pm[9] * ez + pm[13];
  const cw = pm[3] * ex + pm[7] * ey + pm[11] * ez + pm[15];

  vehicle.root.visible = true;
  if (dust) dust.visible = true;
  return {
    ...shots,
    n,
    top: widest.slice(0, 6).map((x) => x.toFixed(2)),
    median: widest[Math.floor(widest.length / 2)].toFixed(2),
    at: [v.x.toFixed(2), v.y.toFixed(2), v.z.toFixed(2)],
    world: [wx.toFixed(2), wy2.toFixed(2), wz.toFixed(2)],
    ndc: [(cx2 / cw).toFixed(2), (cy2 / cw).toFixed(2), cw.toFixed(2)],
    matPos: [water.position.x, water.position.y, water.position.z].join(','),
    parentName: water.parent ? water.parent.name || water.parent.type : 'none',
    cam: [camera.position.x.toFixed(2), camera.position.y.toFixed(2), camera.position.z.toFixed(2)],
    surf: terrain.heightAt ? terrain.heightAt(v.x, v.z).toFixed(3) : 'n/a',
    visible: water.visible,
    parentVisible: water.parent ? water.parent.visible : 'none',
    drawRange: JSON.stringify(water.geometry.drawRange),
    idxCount: water.geometry.index.count,
    frustumCulled: water.frustumCulled,
    bsphere: water.geometry.boundingSphere
      ? [water.geometry.boundingSphere.radius.toFixed(1), water.geometry.boundingSphere.center.y.toFixed(1)]
      : 'none',
  };
}, eye);

for (const tag of ['real', 'flat', 'nodepth', 'lifted']) {
  const file = path.join(outDir, `dv_wet_${tag}.png`);
  await writeFile(file, Buffer.from(shots[tag].split(',')[1], 'base64'));
  console.log(`[gndwet] ${tag} -> ${file}`);
}
console.log(
  `[gndwet] ${shots.n} pools, widest ${shots.top.join(' ')} m, median ${shots.median} m\n` +
    `         pool local ${shots.at.join(' ')} -> world ${shots.world.join(' ')} terrain h=${shots.surf}\n` +
    `         cam ${shots.cam.join(' ')}  ndc ${shots.ndc.join(' ')}  parent=${shots.parentName} pos=${shots.matPos}\n` +
    `         visible=${shots.visible} parentVisible=${shots.parentVisible} culled=${shots.frustumCulled}\n` +
    `         drawRange=${shots.drawRange} index=${shots.idxCount} bsphere=${shots.bsphere}`,
);
await browser.close();
