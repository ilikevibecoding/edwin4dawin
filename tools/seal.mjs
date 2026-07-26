import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:225} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<300000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,2000)); }
console.log(JSON.stringify(await p.evaluate(async ()=>{
  const g=globalThis.__NORTHSTAR__;
  const { OPENINGS, FLOOR_Y } = await import('/src/map/layout.js');
  const { deriveWalls } = await import('/src/map/build.js');
  const out={};
  for (const id of ['op-exec-door','op-lobby-waiting','op-rest-office','op-office-conf-door']) {
    const o = OPENINGS.find(x=>x.id===id);
    const fy = FLOOR_Y[o.floor];
    const isZ = o.axis==='z';
    const px = isZ ? o.coord : o.at, pz = isZ ? o.at : o.coord;
    const min = { x: px - (isZ? 0.4 : o.width/2 - 0.1), y: fy + o.sill + 0.3, z: pz - (isZ? o.width/2 - 0.1 : 0.4) };
    const max = { x: px + (isZ? 0.4 : o.width/2 - 0.1), y: fy + Math.min(o.head, 2.0) - 0.2, z: pz + (isZ? o.width/2 - 0.1 : 0.4) };
    const hits = g.collision.query(min, max).map(c=>({tag:c.tag, y:[+c.min.y.toFixed(2),+c.max.y.toFixed(2)], x:[+c.min.x.toFixed(2),+c.max.x.toFixed(2)], z:[+c.min.z.toFixed(2),+c.max.z.toFixed(2)]}));
    const segs = deriveWalls().filter(s=>s.floor===o.floor && s.axis===o.axis && Math.abs(s.coord-o.coord)<0.02)
      .map(s=>({a:s.a,b:s.b,rooms:s.rooms.map(r=>r.id)}));
    out[id] = { opening:{at:o.at,w:o.width,coord:o.coord,axis:o.axis,floor:o.floor,head:o.head}, segs, hits };
  }
  return out;
}), null, 1));
await b.close();
