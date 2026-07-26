import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:800,height:450} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
p.on('console', m => { if (m.type()==='error') console.log('ERR:', m.text()); });
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
for (let i=0;i<40;i++){
  await new Promise(r=>setTimeout(r,3000));
  const s = await p.evaluate(()=>({ ready: globalThis.__NORTHSTAR__?.levelReady, task: globalThis.__NORTHSTAR__?.loadTask, errs: globalThis.__NORTHSTAR__?.consoleErrors?.map(e=>e.message).slice(0,3) }));
  console.log(i*3+'s', JSON.stringify(s));
  if (s.ready) break;
}
await b.close();
