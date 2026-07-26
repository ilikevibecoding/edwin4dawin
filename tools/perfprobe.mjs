import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
p.on('console', m => { if (m.type()==='error') console.log('ERR:', m.text()); if(m.text().includes('[optimize]')) console.log(m.text()); });
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now();
while (Date.now()-t0 < 240000) { if (await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>false)) break; await new Promise(r=>setTimeout(r,1000)); }
await p.evaluate(()=>{ globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}); });
const t1=Date.now();
while (Date.now()-t1 < 60000) { if (await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,500)); }
for (const room of (process.env.NS_ROOMS||'lobby,openoffice,conference,garage,servicecorr').split(',')) {
  await p.evaluate(r=>globalThis.__NORTHSTAR__.teleport(r), room);
  await p.evaluate(()=>globalThis.advanceTime(400));
  const t=Date.now(); for(let i=0;i<12;i++) await p.evaluate(()=>globalThis.advanceTime(16.7));
  const ms=(Date.now()-t)/12;
  const s = await p.evaluate(()=>globalThis.render_game_to_text());
  console.log(`${room.padEnd(14)} state=${s.gameMode} ${ms.toFixed(1)}ms/frame draws=${s.performance.drawCalls} tris=${s.performance.triangles}`);
}
await b.close();
