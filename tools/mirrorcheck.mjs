// Verify every opening's hole is cut where its doorway actually is.
import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:225} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
p.on('console', m => { const t=m.text(); if (m.type()==='error'||t.includes('[mission]')||t.includes('[ai]')) console.log(`[${m.type()}]`, t.slice(0,200)); });
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<300000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,2000)); }
const res = await p.evaluate(async ()=>{
  const g=globalThis.__NORTHSTAR__;
  const { OPENINGS, FLOOR_Y } = await import('/src/map/layout.js');
  const R = 0.33, H = 1.82;
  const bad=[], ok=[];
  for (const o of OPENINGS) {
    if (!['door','doubledoor','arch','shutter'].includes(o.type)) continue;
    if (o.id.includes('gallery')) continue; // balustraded slab edges, not routes
    const fy = FLOOR_Y[o.floor];
    const isZ = o.axis==='z';
    // sweep lanes across the aperture, ignoring door leaves (they open)
    let passable=false;
    for (const t of [-0.25,0,0.25]) {
      const off = t*(o.width-2*R);
      const cx = isZ ? o.coord : o.at+off;
      const cz = isZ ? o.at+off : o.coord;
      const min={x:cx-R,y:fy+0.35,z:cz-R}, max={x:cx+R,y:fy+Math.min(o.head,1.9)-0.15,z:cz+R};
      const hits = g.collision.query(min,max).filter(c=>c.enabled && !String(c.tag).startsWith('door:') && !String(c.tag).startsWith('glass:') && c.blocksSight!==false);
      if (!hits.length) { passable=true; break; }
    }
    (passable?ok:bad).push(o.id);
  }
  return { total: ok.length+bad.length, passable: ok.length, blocked: bad };
});
console.log('walk-through openings:', JSON.stringify(res, null, 1));
await b.close();
