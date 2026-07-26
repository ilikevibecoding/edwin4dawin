import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:800,height:450} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
p.on('console', m => { if(m.type()==='error') console.log('ERR:',m.text()); if(m.text().includes('sealed')) console.log('SEAL:', m.text().slice(0,120)); });
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<300000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,2000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,500)); }
console.log(JSON.stringify(await p.evaluate(()=>{
  const g=globalThis.__NORTHSTAR__;
  g.teleport('archive'); globalThis.advanceTime(500);
  const specs = g.lighting.specs.filter(s=>s.room==='archive').map(s=>({id:s.id,type:s.type,pos:s.pos.map(n=>+n.toFixed(2)),i:s.intensity,d:s.distance,p:s.priority}));
  const active = g.lighting.poolList.filter(l=>l.visible).map(l=>({pos:l.position.toArray().map(n=>+n.toFixed(1)), i:+l.intensity.toFixed(2), d:l.distance}));
  const room = g.currentRoom();
  return { specs, activeCount: active.length, active: active.slice(0,8), room: room?.id, camY:+g.camera.position.y.toFixed(2),
           sunI: g.lighting.sun.intensity, ambI: g.lighting.ambient.intensity, hemiI: g.lighting.hemi.intensity };
}), null, 1));
const lum = async (yaw)=> {
  await p.evaluate((y)=>{ globalThis.__NORTHSTAR__.player.yaw=y; globalThis.__NORTHSTAR__.player.pitch=0; globalThis.advanceTime(200); }, yaw);
  return p.evaluate(()=>{ const c=document.getElementById('game-canvas'); const t=document.createElement('canvas'); t.width=120;t.height=68;
    const x=t.getContext('2d'); x.drawImage(c,0,0,120,68); const d=x.getImageData(0,0,120,68).data; let s=0;
    for(let i=0;i<d.length;i+=4) s+=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]; return +(s/(d.length/4)).toFixed(1); });
};
for (const [name,yaw] of [['north',0],['east',-Math.PI/2],['south',Math.PI],['west',Math.PI/2]]) {
  console.log('archive facing', name, await lum(yaw));
  await p.screenshot({ path:`artifacts/smoke/archive-${name}.png` });
}
await b.close();
