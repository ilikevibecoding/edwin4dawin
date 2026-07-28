// Prove the fix is live on the CDN: load the published bundle and walk from the
// lobby, up the central stair, along the mezzanine, into the executive office.
import { chromium } from '@playwright/test';
const url = process.argv[2];
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:960,height:540} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(url, { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<300000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,3000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,500)); }
const r = await p.evaluate(()=>{
  const g=globalThis.__NORTHSTAR__;
  g.player.godMode = true;
  for (const e of g.enemies.list) { try { e.applyDamage?.(9999, 'chest', g.player.position); } catch {} }
  globalThis.advanceTime(1200,{render:false});
  g.teleport('lobby'); globalThis.advanceTime(300,{render:false});
  const legs=[[11.6,-5.4],[14.5,-2.35],[14.5,-7.3],[12.2,-6.5],[9.0,-6.5],[-9.6,-6.4],[-13.0,-6.2]];
  const out=[]; const step=100;
  g.input.setActionState('forward',true);
  for (const [x,z] of legs) {
    let best=Infinity, stuck=0, spent=0, opened=[];
    while (spent<22000) {
      const dx=x-g.player.position.x, dz=z-g.player.position.z, d=Math.hypot(dx,dz);
      if (d<0.5) break;
      g.player.yaw=Math.atan2(-dx,-dz); g.player.pitch=0;
      globalThis.advanceTime(step,{render:false}); spent+=step;
      if (d<best-0.02){best=d;stuck=0;} else stuck+=step;
      if (stuck>600){ const it=g.findInteractable?.();
        if(it&&it.kind==='door'&&!opened.includes(it.id)){ g.input.tapAction('use'); opened.push(it.id);
          for(let k=0;k<14;k++){globalThis.advanceTime(step,{render:false}); spent+=step;} stuck=0; }
        else if(stuck>2400) break; } }
    const pp=g.player.position;
    out.push({to:[x,z], at:[+pp.x.toFixed(2),+pp.y.toFixed(2),+pp.z.toFixed(2)],
              short:+Math.hypot(x-pp.x,z-pp.z).toFixed(2), room:g.currentRoom()?.id, opened});
  }
  g.input.setActionState('forward',false); globalThis.advanceTime(300,{render:false});
  return out;
});
for (const l of r) console.log(`  ${l.short<0.8?'ok     ':'BLOCKED'} -> ${JSON.stringify(l.to)}  at ${JSON.stringify(l.at)} ${l.short}m short  room=${l.room}${l.opened.length?`  [${l.opened}]`:''}`);
const s = await p.evaluate(()=>globalThis.render_game_to_text());
console.log('\nfinal room:', s.player?.room, '| errors:', errs.length);
await p.screenshot({ path:'artifacts/smoke/cdn-hostage-b.png', timeout: 120000 }).catch(()=>console.log('(screenshot skipped)'));
await b.close();
