#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// Where is the deadwood?
//
//   node tools/deadcheck.mjs
//
// Two questions, both of which cost a software render per guess if you answer
// them by eye. For every log, stump and snag instance: how close does it get to
// the road centreline along its whole length, and does any of it sit in the near
// field of a beauty camera line. Prints the worst offenders per view.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5181/?quality=fast') + '&capture=1';
const near = Number(arg('near', '14'));

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.error('[deadcheck] page error:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('[deadcheck] console:', m.text()));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });

const out = await page.evaluate(
  async ([near]) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { scene, camera, terrain } = window.debugAPI.objects;
    const lines = [];

    // every deadwood instance as a world-space segment plus a girth
    const pieces = [];
    scene.traverse((o) => {
      if (!o.isInstancedMesh) return;
      if (!/^(log|stump|logEnd|tree_snag)/.test(o.name)) return;
      const isLog = o.name.startsWith('log_');
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      const m = new THREE.Matrix4();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        const a = new THREE.Vector3(isLog ? bb.min.x : 0, 0, 0).applyMatrix4(m);
        const b = new THREE.Vector3(isLog ? bb.max.x : 0, bb.max.y, 0).applyMatrix4(m);
        const size = isLog ? a.distanceTo(b) : bb.max.y * m.elements[5];
        pieces.push({ name: o.name, i, a, b, size });
      }
    });

    // corridor clearance along the whole piece
    let worst = null;
    const hist = {};
    for (const p of pieces) {
      let min = 1e9;
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const x = p.a.x + (p.b.x - p.a.x) * t;
        const z = p.a.z + (p.b.z - p.a.z) * t;
        min = Math.min(min, terrain.roadDistance(x, z));
      }
      p.road = min;
      const bin = Math.floor(min);
      if (bin < 10) hist[bin] = (hist[bin] || 0) + 1;
      if (p.size > 3.2 && (!worst || min < worst.road)) worst = p;
    }
    lines.push(`pieces ${pieces.length}   road-distance histogram (m, only < 10):`);
    lines.push(
      '  ' +
        Object.keys(hist)
          .sort((a, b) => a - b)
          .map((k) => `${k}-${+k + 1}m:${hist[k]}`)
          .join('  '),
    );
    if (worst) lines.push(`nearest piece over 3.2 m long: ${worst.name}#${worst.i} ${worst.size.toFixed(1)} m at ${worst.road.toFixed(2)} m from centreline`);

    // beauty camera lines
    const { VIEWS } = await import('/src/camera.js');
    for (const name of Object.keys(VIEWS)) {
      window.debugAPI.setView(name);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
      );
      const mid = new THREE.Vector3();
      const hits = [];
      for (const p of pieces) {
        mid.copy(p.a).add(p.b).multiplyScalar(0.5);
        const d = camera.position.distanceTo(mid);
        if (d > near) continue;
        if (!frustum.containsPoint(mid) && !frustum.containsPoint(p.a) && !frustum.containsPoint(p.b)) continue;
        hits.push({ n: `${p.name}#${p.i}`, d, size: p.size, road: p.road });
      }
      hits.sort((a, b) => a.d - b.d);
      lines.push(
        `${name.padEnd(9)} in frame within ${near} m: ${String(hits.length).padStart(2)}  ` +
          (hits.length
            ? hits
                .slice(0, 4)
                .map((h) => `${h.n} ${h.size.toFixed(1)}m long @ ${h.d.toFixed(1)}m cam / ${h.road.toFixed(1)}m road`)
                .join(' | ')
            : '-'),
      );
    }
    return lines;
  },
  [near],
);
console.log(out.join('\n'));
await browser.close();
