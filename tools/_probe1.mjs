import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 200, height: 120 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
page.on('console', m => { if (m.type()==='error') console.error('[console]', m.text()); });
await page.goto('http://127.0.0.1:5194/?quality=fast&capture=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const r = await page.evaluate(() => {
  const { terrain } = window.debugAPI.objects;
  const g = terrain.mesh.geometry;
  const am = g.attributes.aMain;
  const pos = g.attributes.position;
  const j = terrain.junction;
  const out = { hasAttr: !!am, itemSize: am && am.itemSize, count: am && am.count };
  // share histogram
  if (am) {
    const h = [0,0,0,0,0];
    let maxShare = 0;
    for (let i = 0; i < am.count; i++) { const s = am.getX(i); h[Math.min(4, Math.floor(s*5))]++; if (s>maxShare) maxShare=s; }
    out.shareHist = h; out.maxShare = maxShare;
  }
  // vertices near the junction
  const near = [];
  for (let i = 0; i < pos.count && near.length < 6; i++) {
    const dx = pos.getX(i)-j.x, dz = pos.getZ(i)-j.z;
    if (dx*dx+dz*dz < 4) near.push({ x:+pos.getX(i).toFixed(2), z:+pos.getZ(i).toFixed(2), y:+pos.getY(i).toFixed(2), share:+am.getX(i).toFixed(3), mSide:+am.getY(i).toFixed(2), mAlong:+am.getZ(i).toFixed(1) });
  }
  out.near = near;
  // sample along a cross-section of the mainline 30m from the junction
  const mt = terrain.mainTangent(j.mainT + 0.06); const mp = terrain.mainPoint(j.mainT + 0.06);
  const nx = mt.z, nz = -mt.x;
  const prof = [];
  for (let d = -12; d <= 12.01; d += 2) {
    const x = mp.x + nx*d, z = mp.z + nz*d;
    prof.push({ d, y: +terrain.heightAt(x,z).toFixed(3), rd: +terrain.roadDistance(x,z).toFixed(2) });
  }
  out.prof = prof;
  out.uniforms = Object.keys(terrain.material.userData.uniforms);
  out.uMean = terrain.material.userData.uniforms.uMean.value.toArray ? terrain.material.userData.uniforms.uMean.value.toArray() : null;
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
