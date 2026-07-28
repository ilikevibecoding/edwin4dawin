import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:360} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<300000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,2000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,500)); }
await p.evaluate(()=>{ globalThis.__NORTHSTAR_QA__?.killAllEnemies?.(); globalThis.__NORTHSTAR_QA__?.godMode?.(true); globalThis.advanceTime(1500,{render:false}); });
const goTo = (x,z,ms,label)=>p.evaluate(({x,z,ms,label})=>{
  const g=globalThis.__NORTHSTAR__; const opened=[]; let best=Infinity,stuck=0; const step=100;
  g.input.setActionState('forward',true);
  for(let t=0;t<ms;t+=step){
    g.player.yaw=Math.atan2(-(x-g.player.position.x),-(z-g.player.position.z)); g.player.pitch=0;
    globalThis.advanceTime(step,{render:false});
    const d=Math.hypot(x-g.player.position.x,z-g.player.position.z);
    if(d<0.45) break;
    if(d<best-0.02){best=d;stuck=0;} else stuck+=step;
    if(stuck>600){ const it=g.findInteractable?.();
      if(it&&it.kind==='door'&&!opened.includes(it.id)){ g.input.tapAction('use'); opened.push(it.id);
        for(let k=0;k<14;k++) globalThis.advanceTime(step,{render:false}); stuck=0; }
      else if(stuck>2500) break; } }
  g.input.setActionState('forward',false); globalThis.advanceTime(200,{render:false});
  const to=g.player.position, d=Math.hypot(x-to.x,z-to.z);
  return {label,to:[+to.x.toFixed(2),+to.y.toFixed(2),+to.z.toFixed(2)],remaining:+d.toFixed(2),arrived:d<0.7,room:g.currentRoom()?.id,opened};
},{x,z,ms,label});
const show=r=>console.log(`  ${r.arrived?'ok     ':'BLOCKED'} ${r.label.padEnd(38)} at ${JSON.stringify(r.to)} room=${String(r.room).padEnd(13)} ${r.remaining}m short${r.opened.length?`  [${r.opened.join(',')}]`:''}`);
console.log('=== lobby -> hostage B on foot, no enemies in the way ===');
await p.evaluate(()=>{ globalThis.__NORTHSTAR__.teleport('lobby'); globalThis.advanceTime(400,{render:false}); });
show(await goTo(11.6,-5.4,7000,'east through the lobby arch'));
show(await goTo(14.5,-2.35,7000,'to the foot of the central flight'));
show(await goTo(14.5,-7.3,12000,'up the flight'));
show(await goTo(12.2,-6.5,7000,'west onto the mezzanine landing'));
show(await goTo(9.0,-6.5,7000,'through the arch into the exec corridor'));
show(await goTo(-9.6,-6.4,20000,'west along the exec corridor'));
show(await goTo(-13.0,-6.2,10000,'through the exec door to hostage B'));
const s = await p.evaluate(()=>globalThis.render_game_to_text());
console.log('  final:', s.player?.room, s.player?.position);
console.log('  hostage B:', JSON.stringify((s.hostages||[]).find(h=>h.id==='hostage-b')));
console.log('  prompt:', JSON.stringify(s.interactionPrompt));
await b.close();
