import puppeteer from 'puppeteer';
const b = await puppeteer.launch({headless:true, protocolTimeout:2400000, args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio','--js-flags=--max-old-space-size=4096']});
const p = await b.newPage();
p.on('pageerror', e => console.log('[err]', e.message.slice(0,300)));
await p.goto('http://127.0.0.1:5175/index.html?render=1&w=320&h=180', {waitUntil:'domcontentloaded', timeout:120000});
await p.waitForFunction('window.__ready === true', {timeout:300000});
const r = await p.evaluate(async () => {
  const D = window.__director;
  const { createBus } = await import('/src/audio/engine.js');
  const { scheduleScore } = await import('/src/audio/score.js');
  const { scheduleCues } = await import('/src/audio/sfx.js');
  const win = (buf) => { const d=buf.getChannelData(0); const out=[]; let nan=-1;
    for (let w=0; w*48000<d.length; w+=10){ let m=0; for(let i=w*48000;i<Math.min((w+10)*48000,d.length);i++){ const v=d[i]; if(nan<0&&!Number.isFinite(v)) nan=i/48000; m=Math.max(m,Math.abs(v)); } out.push(m.toFixed(2)); }
    return out.join(' ') + (nan>=0 ? ('  NaN@'+nan.toFixed(1)) : ''); };
  const SECS = 246, mk = () => new OfflineAudioContext(2, 48000*SECS, 48000);
  const secs = D.tl.scenes.map(s => ({id:s.music, start:0.05+s.start, dur:s.dur, from:0}));
  const out = {};
  { const o = mk(); D.scheduleAll(o, 0.05, 0); out.full = win(await o.startRendering()); }
  { const o = mk(); const bus = createBus(o,{}); scheduleScore(o,bus,secs,{seed:1337});
    scheduleCues(o, bus, D.cues.map(c=>({...c, t:0.05+c.t})));
    out.scorePlusCues = win(await o.startRendering()); }
  { const o = mk(); const bus = createBus(o,{}); scheduleScore(o,bus,secs,{seed:1337});
    for (const l of D.lines){ const bf=D.voiceBuffers.get(l.id); if(!bf) continue; const s=o.createBufferSource(); s.buffer=bf; s.connect(bus.voice); s.start(0.05+l.t); bus.duckVoice(0.05+l.t, bf.duration); }
    out.scorePlusVoice = win(await o.startRendering()); }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
