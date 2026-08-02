import puppeteer from 'puppeteer';
const b = await puppeteer.launch({headless:true, protocolTimeout:900000, args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio']});
const p = await b.newPage();
p.on('pageerror', e => console.log('[err]', e.message.slice(0,300)));
await p.goto('http://127.0.0.1:5175/index.html?render=1&w=320&h=180', {waitUntil:'domcontentloaded', timeout:120000});
await p.waitForFunction('window.__ready === true', {timeout:300000});
const r = await p.evaluate(async () => {
  const D = window.__director;
  const { createBus } = await import('/src/audio/engine.js');
  const { scheduleScore } = await import('/src/audio/score.js');
  const peak = (buf) => { let m=0; const d=buf.getChannelData(0); for (let i=0;i<d.length;i++) m=Math.max(m,Math.abs(d[i])); return +m.toFixed(4); };
  const out = { voices: D.voiceBuffers.size, cues: D.cues.length };

  // A: everything, windowed at t=100
  {
    const o = new OfflineAudioContext(2, 48000*20, 48000);
    D.scheduleAll(o, 0.05, 100);
    out.allAt100 = peak(await o.startRendering());
  }
  // B: score only at the same place
  {
    const o = new OfflineAudioContext(2, 48000*20, 48000);
    const bus = createBus(o, {});
    const secs = D.tl.scenes.filter(s => s.end > 100).map(s => ({id:s.music, start:0.05+Math.max(s.start,100)-100, dur:s.end-Math.max(s.start,100), from:Math.max(0,100-s.start)}));
    scheduleScore(o, bus, secs, {seed:1337});
    out.scoreAt100 = peak(await o.startRendering());
  }
  // C: voice only at the same place
  {
    const o = new OfflineAudioContext(2, 48000*20, 48000);
    const bus = createBus(o, {});
    for (const l of D.lines) {
      const buf = D.voiceBuffers.get(l.id);
      if (!buf || l.t < 100) continue;
      const src = o.createBufferSource(); src.buffer = buf;
      src.connect(bus.voice); src.start(0.05 + l.t - 100);
    }
    out.voiceAt100 = peak(await o.startRendering());
  }
  // D: everything at t=0 (sanity)
  {
    const o = new OfflineAudioContext(2, 48000*20, 48000);
    D.scheduleAll(o, 0.05, 0);
    out.allAt0 = peak(await o.startRendering());
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
