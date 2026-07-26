import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:360} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<240000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,1000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,300)); }
console.log(await p.evaluate(()=>{
  const g=globalThis.__NORTHSTAR__, THREE_MIN={x:-2.4,y:-1,z:4.1}, MAX={x:-1.6,y:3,z:4.9};
  g.teleport('openoffice');
  const list = g.collision.query({x:-2.4,y:-1,z:4.1}, {x:-1.6,y:3.2,z:4.9});
  const near = list.map(c=>({tag:c.tag, min:c.min.toArray().map(n=>+n.toFixed(3)), max:c.max.toArray().map(n=>+n.toFixed(3))}));
  // step manually and watch
  const trace=[];
  for(let i=0;i<8;i++){ globalThis.advanceTime(8.34); trace.push({y:+g.player.position.y.toFixed(4), vy:+g.player.velocity.y.toFixed(3), g:g.player.grounded}); }
  return { near, trace };
}));
await b.close();
