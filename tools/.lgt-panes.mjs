/**
 * Scratch diagnostic. Not part of the build.
 *
 * The café is sealed in the collision world but plainly open in the render, so
 * the openings must be findable in the scene graph. Lists the meshes near the
 * café by material, and for anything glass-like reduces its triangles to
 * world-space quads — position, normal, size — which is exactly what a portal
 * needs.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=480,270',
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: 480, height: 270 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });
await page.waitForFunction(() => window.__GAME__.listShots().includes('cafe_window'), {
  timeout: 300000, polling: 250,
});

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose('cafe_window');
  for (let i = 0; i < 20; i++) engine.step(1 / 60);

  const r2 = (x) => Math.round(x * 100) / 100;
  const box = new THREE.Box3(
    new THREE.Vector3(-20, 3.5, -13),
    new THREE.Vector3(-4, 9.5, 0),
  );
  const materials = {};
  const panes = [];
  const meshBox = new THREE.Box3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();

  engine.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    meshBox.setFromObject(o);
    if (!meshBox.intersectsBox(box)) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    const name = m?.name ?? o.name ?? '?';
    const tris = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    materials[name] = (materials[name] ?? 0) + tris;

    if (!/glass|window|pane/i.test(name)) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count && panes.length < 40; i += 3) {
      const i0 = idx ? idx.getX(i) : i;
      const i1 = idx ? idx.getX(i + 1) : i + 1;
      const i2 = idx ? idx.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      if (!box.containsPoint(a)) continue;
      ab.subVectors(b, a); ac.subVectors(c, a);
      n.crossVectors(ab, ac);
      const area = n.length() * 0.5;
      if (area < 0.05) continue;
      n.normalize();
      panes.push({
        mat: name,
        centre: [r2((a.x + b.x + c.x) / 3), r2((a.y + b.y + c.y) / 3), r2((a.z + b.z + c.z) / 3)],
        normal: [r2(n.x), r2(n.y), r2(n.z)],
        area: r2(area),
      });
    }
  });

  return { materials, panes };
});

console.log('meshes near the cafe, triangles by material:');
for (const [k, v] of Object.entries(out.materials).sort((x, y) => y[1] - x[1]).slice(0, 30)) {
  console.log('  ' + String(v).padStart(7), k);
}
console.log(`\nglass-like triangles found: ${out.panes.length}`);
for (const p of out.panes.slice(0, 24)) {
  console.log(`   ${p.mat.padEnd(20)} at ${p.centre.join(', ').padEnd(24)} n ${p.normal.join(', ').padEnd(18)} area ${p.area}`);
}
await browser.close();
