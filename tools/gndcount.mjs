#!/usr/bin/env node
// Count scattered ground geometry inside the volume a close framing actually
// sees, and report the surface fields that gate the scatter there.
//
// Ablating a mesh and diffing the frame proves whether a tier reaches the
// picture, but not *why* it does not. This reads the numbers: how many stone
// triangles and shadow quads fall within a few metres of the eye, and what the
// wetness, grade and patch fields evaluate to on that stretch of trail.
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5183/');
const url = base + (base.includes('?') ? '&' : '?') + 'quality=fast&capture=1';
const station = Number(arg('t', '0.42'));
const radius = Number(arg('radius', '5'));

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });

const out = await page.evaluate(
  ([station, radius]) => {
    const { terrain, scene } = window.debugAPI.objects;
    const p = terrain.roadPoint(station);
    const near = (mesh) => {
      if (!mesh) return null;
      const pos = mesh.geometry.getAttribute('position');
      let n = 0;
      for (let i = 0; i < pos.count; i++) {
        const dx = pos.getX(i) - p.x;
        const dz = pos.getZ(i) - p.z;
        if (dx * dx + dz * dz < radius * radius) n++;
      }
      return { verts: pos.count, nearVerts: n };
    };
    const rows = {};
    for (const name of ['roadStones', 'roadStoneShadows', 'roadWater']) {
      rows[name] = near(scene.getObjectByName(name));
    }
    // The surface fields along the visible stretch, sampled on the rut centre.
    const tg = terrain.roadTangent(station);
    const nx = -tg.z;
    const nz = tg.x;
    const samples = [];
    for (let k = -3; k <= 4; k++) {
      for (const lat of [0, 0.62, 1.3]) {
        const x = p.x + tg.x * k + nx * lat;
        const z = p.z + tg.z * k + nz * lat;
        const info = terrain.surfaceAt ? terrain.surfaceAt(x, z) : null;
        samples.push({ along: k, lat, y: terrain.heightAt(x, z).toFixed(3), info });
      }
    }
    return { road: [p.x.toFixed(1), p.z.toFixed(1)], rows, samples: samples.slice(0, 8), hasSurfaceAt: !!terrain.surfaceAt };
  },
  [station, radius],
);
console.log(JSON.stringify(out, null, 2));
await browser.close();
