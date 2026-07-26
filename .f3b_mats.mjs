// Count merged meshes (== draw calls) produced by each f3b decorator section.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.setDefaultTimeout(120000);
page.on('console', (m) => console.log('[page]', m.text().slice(0, 200)));

await page.goto(BASE + '/?test=1&qa=1', { waitUntil: 'load' });
await page.waitForTimeout(1200);
const res = await page.evaluate(`(async () => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const { placeProps } = await import('/src/world/props/index.js');
  const { decorateFacilities } = await import('/src/world/decorate/facilities.js');
  const { decorateServiceAreas } = await import('/src/world/decorate/serviceAreas.js');
  const { decorateBasement } = await import('/src/world/decorate/basement.js');
  window.__f3bOff = false;
  const out = {};
  for (const [id, fn] of [['facilities', decorateFacilities], ['service', decorateServiceAreas], ['basement', decorateBasement]]) {
    const world = {
      groundAt: () => ({ y: 0 }),
      addCollider() {},
      propAnchors: [],
      group: new THREE.Group(),
      glassPanes: [],
    };
    const parent = new THREE.Group();
    let placements = [];
    try { placements = fn(world) || []; } catch (e) { return { err: id + ': ' + e.message }; }
    const built = placeProps(world, parent, placements, { roomId: id });
    const mats = {};
    for (const m of built) {
      const k = (m.material && (m.material.name || m.material.uuid.slice(0, 8))) || '?';
      mats[k] = (mats[k] || 0) + 1;
    }
    // decal meshes added directly to world.group by placeStaticDecals
    let decalMeshes = 0;
    world.group.traverse((o) => { if (o.isMesh || o.isInstancedMesh) decalMeshes++; });
    // dynamic props added straight to parent (not in built)
    let dynMeshes = 0;
    parent.traverse((o) => { if ((o.isMesh || o.isInstancedMesh)) dynMeshes++; });
    out[id] = { placements: placements.length, builtMeshes: built.length, dynPlusBuilt: dynMeshes, decalMeshes,
      mats: Object.entries(mats).sort((a, b) => b[1] - a[1]) };
  }
  return out;
})()`);
console.log(JSON.stringify(res, null, 1));
await browser.close();
