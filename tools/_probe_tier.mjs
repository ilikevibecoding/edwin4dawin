import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage','--js-flags=--max-old-space-size=4096'] });
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 1800000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) { console.error('BOOT FAILED\n' + err); process.exit(1); }
const info = await page.evaluate(() => {
  window.debugAPI.setView('forest');
  window.debugAPI.renderFrames(1);
  const f = window.debugAPI.objects.forest;
  let meshes = 0, tris = 0, inst = 0;
  f.group.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { meshes++; inst += o.count ?? 1; const g=o.geometry; tris += ((g.index?g.index.count:g.attributes.position?.count??0)/3)*(o.count??1); } });
  const mats = Object.values(f.materials).flatMap((m) => (m && !m.isMaterial && typeof m === 'object' ? Object.values(m) : [m])).filter(Boolean);
  const atlas = {};
  let texMB = 0;
  for (const m of mats) {
    if (!m.map?.image) continue;
    const w = m.map.image.width, h = m.map.image.height;
    atlas[m.map.name || `${w}x${h}`] = (atlas[`${w}x${h}`] || 0) + 1;
    texMB += (w * h * 4 * 1.34) / (1 << 20);
  }
  const u = f.materials.needleMat.userData.foliage;
  return { stats: f.stats, forestMeshes: meshes, forestInstances: inst, forestKtris: Math.round(tris/1000),
    atlasSizes: atlas, atlasMB: Math.round(texMB), needleAtlasPx: u.uAtlasPx.value, sheen: u.uSheen.value,
    aniso: f.materials.needleMat.map.anisotropy, scene: window.debugAPI.stats() };
});
console.log(`boot ${((Date.now()-t0)/1000).toFixed(0)}s`);
console.log(JSON.stringify(info, null, 1));
await browser.close();
