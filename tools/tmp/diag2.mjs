import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: true, protocolTimeout: 900000, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('[err]', e.message.slice(0, 300)));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text().slice(0, 240)); });
await p.goto('http://127.0.0.1:5175/index.html?render=1&w=320&h=180', { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction('window.__ready === true', { timeout: 300000 });

const r = await p.evaluate(async () => {
  const { createBus } = await import('/src/audio/engine.js');
  const { scheduleScore } = await import('/src/audio/score.js');
  const { scheduleCues } = await import('/src/audio/sfx.js');
  const { timeline } = await import('/src/story.js');
  const tl = timeline();
  const peak = (buf) => {
    let m = 0; const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
    return +m.toFixed(4);
  };
  const out = { sections: [] };

  // each music section rendered alone, from zero
  for (const s of tl.scenes) {
    const octx = new OfflineAudioContext(2, 48000 * Math.min(s.dur, 14), 48000);
    const bus = createBus(octx, {});
    scheduleScore(octx, bus, [{ id: s.music, start: 0.02, dur: s.dur, from: 0 }], { seed: 1337 });
    out.sections.push({ id: s.music, peak: peak(await octx.startRendering()) });
  }

  // the whole film's score, but rendered as one 250s pass, sampled in windows
  const octx = new OfflineAudioContext(2, 48000 * 250, 48000);
  const bus = createBus(octx, {});
  const sections = tl.scenes.map((s) => ({ id: s.music, start: 0.05 + s.start, dur: s.dur, from: 0 }));
  scheduleScore(octx, bus, sections, { seed: 1337 });
  const buf = await octx.startRendering();
  const d = buf.getChannelData(0);
  out.windows = [];
  for (let w = 0; w < 250; w += 10) {
    let m = 0;
    for (let i = w * 48000; i < Math.min((w + 10) * 48000, d.length); i++) m = Math.max(m, Math.abs(d[i]));
    out.windows.push(`${w}s:${m.toFixed(3)}`);
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
