import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:360} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<240000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,1000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,300)); }
const r = await p.evaluate(()=>{
  const g=globalThis.__NORTHSTAR__; const out=[];
  const run=(label, yaw, action)=>{
    g.teleport('openoffice'); g.player.yaw=yaw; g.player.pitch=0; globalThis.advanceTime(300);
    const a=g.player.position.clone();
    g.input.setActionState(action,true); globalThis.advanceTime(800); g.input.setActionState(action,false); globalThis.advanceTime(120);
    const d=g.player.position.clone().sub(a);
    out.push({label, yaw:+yaw.toFixed(2), dx:+d.x.toFixed(2), dz:+d.z.toFixed(2)});
  };
  run('W @yaw0 (expect -Z)', 0, 'forward');
  run('S @yaw0 (expect +Z)', 0, 'back');
  run('D @yaw0 (expect +X)', 0, 'right');
  run('A @yaw0 (expect -X)', 0, 'left');
  run('W @yaw PI/2 (expect -X)', Math.PI/2, 'forward');
  run('W @yaw PI (expect +Z)', Math.PI, 'forward');
  // crouch + jump
  g.teleport('openoffice'); globalThis.advanceTime(300);
  const eye0=g.player.currentEye;
  g.input.setActionState('crouch',true); globalThis.advanceTime(600);
  const eyeC=g.player.currentEye, ms=g.player.moveState;
  g.input.setActionState('crouch',false); globalThis.advanceTime(600);
  g.input.tapAction('jump'); globalThis.advanceTime(120);
  const air=g.player.grounded===false, y=g.player.position.y;
  globalThis.advanceTime(900);
  return { out, eye0:+eye0.toFixed(2), eyeC:+eyeC.toFixed(2), crouchState:ms, jumpedAir:air, jumpY:+y.toFixed(2), landed:g.player.grounded };
});
console.log(JSON.stringify(r,null,1));
await b.close();
