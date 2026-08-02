import puppeteer from 'puppeteer';
const b = await puppeteer.launch({headless:true, protocolTimeout:600000, args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio']});
const p = await b.newPage();
p.on('console', m => console.log('[page]', m.type(), m.text().slice(0,300)));
p.on('pageerror', e => console.log('[err]', e.message.slice(0,300)));
await p.goto('http://127.0.0.1:5175/index.html?render=1&w=320&h=180', {waitUntil:'domcontentloaded', timeout:120000});
await p.waitForFunction('window.__ready === true', {timeout:300000});
const r = await p.evaluate(async () => {
  const mod = await import('/src/director.js');
  const A = await mod.loadAudioModules();
  const out = { hasCreateBus: !!A.createBus, hasScore: !!A.scheduleScore, hasCues: !!A.scheduleCues };
  // tiny offline probe: just the score for 6 seconds
  const octx = new OfflineAudioContext(2, 48000*6, 48000);
  const bus = A.createBus(octx, {});
  out.busKeys = Object.keys(bus);
  A.scheduleScore(octx, bus, [{id:'fanfare', start:0.05, dur:6, from:0}], {seed:1337});
  const buf = await octx.startRendering();
  let peak=0; const d=buf.getChannelData(0);
  for (let i=0;i<d.length;i++) peak=Math.max(peak, Math.abs(d[i]));
  out.scorePeak = peak;
  // sfx probe
  const o2 = new OfflineAudioContext(2, 48000*3, 48000);
  const b2 = A.createBus(o2, {});
  A.scheduleCues(o2, b2, [{t:0.1, sfx:'explosion', opts:{}}]);
  const buf2 = await o2.startRendering();
  let p2=0; const d2=buf2.getChannelData(0);
  for (let i=0;i<d2.length;i++) p2=Math.max(p2, Math.abs(d2[i]));
  out.sfxPeak = p2;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await b.close();
