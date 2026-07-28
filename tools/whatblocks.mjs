import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:360} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<300000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,2000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,500)); }
console.log(JSON.stringify(await p.evaluate(()=>{
  const g = globalThis.__NORTHSTAR__;
  const at = (x,y,z,r=0.6)=>g.collision.query({x:x-r,y:y+0.4,z:z-r},{x:x+r,y:y+1.6,z:z+r})
    .filter(c=>c.enabled)
    .map(c=>`${c.tag} x[${c.min.x.toFixed(2)},${c.max.x.toFixed(2)}] y[${c.min.y.toFixed(2)},${c.max.y.toFixed(2)}] z[${c.min.z.toFixed(2)},${c.max.z.toFixed(2)}]`);
  return {
    execcorr_x4:  at(4.0, 4, -6.4),
    execcorr_x3:  at(3.0, 4, -6.5),
    enemiesUpstairs: g.enemies.list.filter(e=>e.position && e.position.y>3).map(e=>({id:e.id, pos:e.position.toArray().map(n=>+n.toFixed(2)), state:e.state})),
    // the head of the central flight
    stairHeadStrip: at(14.5, 4, -8.1, 0.4),
    landingWest:   at(12.1, 4, -7.0, 0.4),
  };
}), null, 1));
await b.close();
