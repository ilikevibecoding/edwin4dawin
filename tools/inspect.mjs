/**
 * Scene inspector.
 *
 * Boots the game and dumps a report about the live scene graph: the largest
 * meshes, transparent/metallic surfaces and per-material draw counts. Used to
 * track down stray geometry that only shows up in captures.
 *
 *   node tools/inspect.mjs [--near x,z] [--radius 30]
 */

import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
};
const near = opt('--near', null);
const radius = Number(opt('--radius', '40'));

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

const report = await page.evaluate(([nearStr, rad]) => {
  const THREE = window.__GAME.three();
  const scene = window.__GAME.scene();
  const centre = nearStr ? nearStr.split(',').map(Number) : null;
  const rows = [];
  const box = new THREE.Box3();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    box.setFromObject(o);
    if (!isFinite(box.min.x)) return;
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    if (centre) {
      const d = Math.hypot(c.x - centre[0], c.z - centre[1]);
      if (d > rad) return;
    }
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    rows.push({
      name: o.name || '(unnamed)',
      mat: m?.name || m?.type,
      transparent: !!m?.transparent,
      opacity: m?.opacity ?? 1,
      metalness: m?.metalness ?? null,
      roughness: m?.roughness ?? null,
      size: [+size.x.toFixed(1), +size.y.toFixed(1), +size.z.toFixed(1)],
      centre: [+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1)],
      span: Math.max(size.x, size.y, size.z),
      parents: (() => {
        const p = []; let q = o.parent;
        while (q && p.length < 4) { if (q.name) p.push(q.name); q = q.parent; }
        return p;
      })(),
    });
  });
  rows.sort((a, b) => b.span - a.span);
  return rows.slice(0, 45);
}, [near, radius]);

for (const r of report) {
  console.log(
    `${String(r.span.toFixed(1)).padStart(7)}m  ${r.mat?.padEnd(18)} ` +
    `${r.transparent ? 'T' : ' '}${(r.opacity ?? 1) < 1 ? r.opacity.toFixed(2) : '    '} ` +
    `met=${r.metalness == null ? '  - ' : r.metalness.toFixed(2)} ` +
    `size=${r.size.join('x').padEnd(20)} at=${r.centre.join(',').padEnd(22)} ` +
    `${r.name} <- ${r.parents.join('<')}`,
  );
}
await browser.close();
