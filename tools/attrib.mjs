import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
p.on('console', m => { if(m.text().includes('[optimize]')||m.type()==='error') console.log(m.text()); });
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now();
while (Date.now()-t0 < 240000) { if (await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>false)) break; await new Promise(r=>setTimeout(r,1000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now();
while (Date.now()-t1 < 60000) { if (await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,500)); }
for (const room of ['lobby','openoffice','conference']) {
  const r = await p.evaluate((room)=>{
    const g = globalThis.__NORTHSTAR__;
    g.teleport(room); globalThis.advanceTime(300);
    // Attribute visible draws by tagging onBeforeRender
    const counts = {};
    const hooks = [];
    g.scene.traverse(o=>{
      if(!o.isMesh && !o.isInstancedMesh) return;
      let bucket = 'other';
      let cur=o, path=[];
      while(cur){ path.push(cur.name||cur.type); cur=cur.parent; }
      const ps = path.join('/');
      if (o.userData.staticBatch) bucket='staticBatch';
      else if (ps.includes('enemy:')) bucket='enemy';
      else if (ps.includes('hostage')) bucket='hostage';
      else if (ps.includes('door:')) bucket='door';
      else if (ps.includes('light-fixtures')) bucket='fixture';
      else if (o.isInstancedMesh) bucket='instanced';
      else if (o.material?.transparent) bucket='transparent';
      else bucket = 'other:'+(path[path.length-2]||'?');
      const fn = ()=>{ counts[bucket]=(counts[bucket]||0)+1; };
      o.onBeforeRender = fn; hooks.push(o);
    });
    g.engine.render();
    for(const o of hooks) o.onBeforeRender = ()=>{};
    const st = globalThis.render_game_to_text();
    return { room, counts, draws: st.performance.drawCalls, tris: st.performance.triangles };
  }, room);
  console.log(r.room, 'draws='+r.draws, 'tris='+r.tris);
  console.log('  ', JSON.stringify(Object.fromEntries(Object.entries(r.counts).sort((a,b)=>b[1]-a[1]).slice(0,12))));
}
await b.close();
