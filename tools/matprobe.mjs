import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now();
while (Date.now()-t0 < 240000) { if (await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>false)) break; await new Promise(r=>setTimeout(r,1000)); }
const info = await p.evaluate(()=>{
  const g = globalThis.__NORTHSTAR__;
  const mats = new Map(); const byName = new Map(); let meshes=0, inst=0, batches=0;
  g.scene.traverse(o=>{
    if (o.isInstancedMesh) inst++;
    else if (o.isMesh) { meshes++; if(o.userData.staticBatch) batches++; }
    if (o.isMesh && o.material && !Array.isArray(o.material)) {
      mats.set(o.material.uuid, (mats.get(o.material.uuid)||0)+1);
      const k = o.material.userData?.materialKey || o.material.name || o.material.type;
      byName.set(k, (byName.get(k)||0)+1);
    }
  });
  const top = [...byName.entries()].sort((a,b)=>b[1]-a[1]).slice(0,18);
  // Count how many distinct materials share the same "key"
  return { meshes, inst, batches, uniqueMaterials: mats.size, topKeys: top,
           sceneChildren: g.scene.children.length,
           colliders: g.collision.colliders.size };
});
console.log(JSON.stringify(info, null, 1));
// Now measure shadow vs main pass cost
const split = await p.evaluate(()=>{
  const g = globalThis.__NORTHSTAR__;
  const r = g.engine.renderer;
  r.info.autoReset = false;
  r.info.reset(); r.shadowMap.enabled = true; g.engine.render();
  const withShadow = { calls: r.info.render.calls, tris: r.info.render.triangles };
  r.info.reset(); r.shadowMap.enabled = false; r.shadowMap.needsUpdate = true; g.engine.render();
  const noShadow = { calls: r.info.render.calls, tris: r.info.render.triangles };
  r.shadowMap.enabled = true; r.info.autoReset = true;
  return { withShadow, noShadow };
});
console.log('pass split', JSON.stringify(split));
await b.close();
