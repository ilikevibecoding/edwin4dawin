#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Close-ups of the forest itself, at the distances the eye judges foliage at.
//
//   node tools/foliage.mjs --out shots/fol_1 --url http://127.0.0.1:5181/?quality=fast
//                          --spots near,mid,crown,floor,dist
//
// Every spot aims at a real instanced crown or at the forest floor, picked out of
// the live scene rather than authored by hand, so the same spot points at the
// same tree across iterations. `--width` stays small: these are for judging
// element scale and value range, not for the beauty pass.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5181/?quality=fast&capture=1');
const outDir = arg('out', 'shots/foliage');
const width = Number(arg('width', '480'));
const height = Number(arg('height', '480'));
const spots = arg('spots', 'near,mid,floor,dist').split(',');

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
page.on('pageerror', (e) => console.error('[foliage] page error:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[foliage] console:', m.text());
});

// three other agents share this checkout, so vite fires an HMR reload every few
// seconds and it lands mid-capture; the app only needs to boot once here
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const boot = await page.evaluate(() => window.__ERROR__ || null);
if (boot) {
  console.error('[foliage] app failed to boot:\n' + boot);
  await browser.close();
  process.exit(1);
}

await page.evaluate(() => window.debugAPI.setView('hero'));

for (const spot of spots) {
  const info = await page.evaluate(async (spot) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { camera, forest, vehicle } = window.debugAPI.objects;
    const base = vehicle.root.position.clone();

    // the first tall conifer crown within a sensible radius of the truck, so the
    // spot is repeatable but is a real instance out of the real scatter
    const m4 = new THREE.Matrix4();
    const p = new THREE.Vector3();
    let best = null;
    forest.group.traverse((o) => {
      // conifers only: they are four fifths of the stand and the whole point of
      // the look test, and letting an alder win made every close-up a broadleaf
      if (!o.isInstancedMesh || !/tree_(fir|cedar|hemlock|spruce)_foliage/.test(o.name)) return;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        p.setFromMatrixPosition(m4);
        const d = p.distanceTo(base);
        if (d < 14 || d > 34) continue;
        const s = new THREE.Vector3().setFromMatrixScale(m4).y;
        const score = -Math.abs(d - 22) + s * 4;
        if (!best || score > best.score) {
          best = { score, pos: p.clone(), box: o.geometry.boundingBox?.clone() || null, name: o.name };
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          best.box = o.geometry.boundingBox.clone();
          best.scale = s;
        }
      }
    });
    if (!best) return { err: 'no crown found' };

    const crownY = best.pos.y + best.box.max.y * best.scale * 0.55;
    const target = new THREE.Vector3(best.pos.x, crownY, best.pos.z);
    const away = target.clone().sub(base).setY(0).normalize();
    const side = new THREE.Vector3(-away.z, 0, away.x);

    const place = (eye, look, fov) => {
      camera.position.copy(eye);
      camera.fov = fov;
      camera.near = 0.1;
      camera.updateProjectionMatrix();
      camera.lookAt(look);
      camera.updateMatrixWorld(true);
    };

    if (spot === 'near') {
      // three metres off the crown rim: the "is it needles or paper" test
      place(target.clone().add(away.clone().multiplyScalar(-3.2)).add(side.clone().multiplyScalar(1.4)), target, 40);
    } else if (spot === 'mid') {
      place(target.clone().add(away.clone().multiplyScalar(-9)).add(side.clone().multiplyScalar(3)), target, 34);
    } else if (spot === 'sky') {
      // crown against open sky, from below: silhouette and fringe test
      const eye = best.pos.clone().add(away.clone().multiplyScalar(-7)).setY(best.pos.y + 1.6);
      place(eye, new THREE.Vector3(best.pos.x, best.pos.y + best.box.max.y * best.scale * 0.9, best.pos.z), 42);
    } else if (spot === 'floor') {
      // knee height looking along the ground: undergrowth repetition test
      const eye = base.clone().setY(base.y + 0.75).add(side.clone().multiplyScalar(5));
      place(eye, base.clone().setY(base.y + 0.4).add(side.clone().multiplyScalar(26)), 46);
    } else if (spot === 'dist') {
      // clear of the truck, looking across the stand into the far band: the only
      // spot that answers "does the distance recede or is it a pale wash"
      const eye = base.clone().setY(base.y + 3.4).add(side.clone().multiplyScalar(-8));
      place(eye, base.clone().setY(base.y + 9.0).add(side.clone().multiplyScalar(-150)), 30);
    } else {
      return { err: 'unknown spot ' + spot };
    }
    return { name: best.name, dist: camera.position.distanceTo(target).toFixed(1) };
  }, spot);

  if (info.err) {
    console.error(`[foliage] ${spot}: ${info.err}`);
    continue;
  }
  const dataUrl = await page.evaluate(() => window.debugAPI.captureFrame(2));
  const file = path.join(outDir, `${spot}.png`);
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`[foliage] ${spot} -> ${file} (${info.name} at ${info.dist} m)`);
}

console.log('[foliage] stats', JSON.stringify(await page.evaluate(() => window.debugAPI.stats())));
await browser.close();
