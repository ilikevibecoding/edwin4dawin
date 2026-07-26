import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:960,height:540} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
p.on('console', m => { if(m.type()==='error') console.log('ERR:',m.text()); });
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<240000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,1000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,300)); }
console.log(JSON.stringify(await p.evaluate(()=>{
  const g=globalThis.__NORTHSTAR__, vm=g.viewmodel;
  globalThis.advanceTime(600);
  return {
    activeKind: vm.activeKind, hasActive: !!vm.active, state: vm.state,
    entries: Object.keys(vm._entries||{}),
    vmSceneKids: vm.vmScene.children.map(c=>({n:c.name||c.type, v:c.visible, kids:c.children.length})),
    rootVisible: vm.root?.visible,
    weaponsCurrent: g.weapons?.current ? { id:g.weapons.current.id, slot:g.weapons.current.slot, kind:g.weapons.current.kind, def:!!g.weapons.current.def } : null,
    weaponsJson: g.weapons?.toJSON?.(),
    renderWrapped: !!g.engine.render.__nsPostFXWrapped,
  };
}), null, 1));
await p.evaluate(()=>{ globalThis.__NORTHSTAR__.teleport('openoffice'); globalThis.advanceTime(600); });
await p.screenshot({ path:'artifacts/smoke/vm-check.png' });
await b.close();
