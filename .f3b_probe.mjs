// Draw-call breakdown probe: counts frustum-visible meshes by material at a checkpoint.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const cp = process.argv[2] || 'copy_mail';
const yaw = Number(process.argv[3] ?? 270);
const pitch = Number(process.argv[4] ?? 5);

const errors = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.setDefaultTimeout(90000);
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(BASE + '/?test=1&qa=1', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const result = await page.evaluate(`(async () => {
  const qa = window.__qa;
  qa.startMission({ difficulty: 'operator' });
  for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 100)); if (qa.state().mode === 'playing') break; }
  qa.freezeAI(true); qa.god(true);
  qa.teleport('${cp}'); qa.lookYawPitch(${yaw}, ${pitch});
  window.advanceTime(400);

  const { Engine } = await import('/src/core/engine.js');
  const THREE = await import('/node_modules/three/build/three.module.js');
  const cam = Engine.camera;
  cam.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const byMat = {};
  let visible = 0, total = 0, shadowCasters = 0;
  Engine.scene.traverseVisible((o) => {
    if (!o.isMesh && !o.isInstancedMesh && !o.isPoints && !o.isLine) return;
    total++;
    let inView = true;
    try { inView = !o.geometry.boundingSphere ? true : frustum.intersectsObject(o); } catch { inView = true; }
    if (!inView) return;
    visible++;
    if (o.castShadow) shadowCasters++;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const k = (m && (m.name || m.type)) || 'null';
      byMat[k] = (byMat[k] || 0) + 1;
    }
  });
  const perf = qa.perf();
  return { cp: '${cp}', perf, total, visible, shadowCasters,
    top: Object.entries(byMat).sort((a, b) => b[1] - a[1]).slice(0, 40) };
})()`);
console.log(JSON.stringify(result, null, 1));
for (const e of errors.slice(0, 5)) console.log('E:', e);
await browser.close();
