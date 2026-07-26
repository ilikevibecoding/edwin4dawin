import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:360} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<240000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,1000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,300)); }
console.log(await p.evaluate(()=>{
  const g=globalThis.__NORTHSTAR__;
  const before={ paused:g.engine.paused, sim:g.engine.simTime, y:g.player.position.y, grounded:g.player.grounded, alive:g.player.alive, state:g.state };
  g.teleport('openoffice');
  const mid={ y:g.player.position.y, grounded:g.player.grounded };
  globalThis.advanceTime(700);
  const after={ paused:g.engine.paused, sim:g.engine.simTime, y:g.player.position.y, grounded:g.player.grounded, vel:g.player.velocity.toArray().map(n=>+n.toFixed(3)), moveState:g.player.moveState };
  return { before, mid, after, fixedSystems:g.engine._fixedSystems.map(s=>s.id) };
}));
// Now test walking
console.log(await p.evaluate(()=>{
  const g=globalThis.__NORTHSTAR__;
  const p0=g.player.position.clone();
  g.input.setActionState('forward', true);
  globalThis.advanceTime(1000);
  g.input.setActionState('forward', false);
  globalThis.advanceTime(200);
  return { from:p0.toArray().map(n=>+n.toFixed(2)), to:g.player.position.toArray().map(n=>+n.toFixed(2)), moveState:g.player.moveState, yaw:+g.player.yaw.toFixed(2) };
}));
// Viewmodel presence
console.log(await p.evaluate(()=>{
  const g=globalThis.__NORTHSTAR__; const vm=g.viewmodel;
  const keys = vm? Object.keys(vm) : [];
  return { hasVm: !!vm, keys: keys.slice(0,30), sceneChildren: vm?.scene?.children?.length ?? vm?.vmScene?.children?.length ?? null };
}));
await b.close();
