import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = '/workspace';
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = createServer(async (req, res) => {
  try {
    const p = join(ROOT, new URL(req.url, 'http://x').pathname);
    const b = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }).end(b);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => srv.listen(5297, '127.0.0.1', r));
const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage();
pg.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await pg.goto('http://127.0.0.1:5297/audio-probe.html', { waitUntil: 'networkidle0' });
await pg.waitForFunction('window.__ready === true');

const out = await pg.evaluate(async () => {
  const eng = await import('/src/audio/engine.js');
  // decay envelope in 0.25 s steps
  async function tail(busOpts, dest, dur = 12) {
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * 48000), 48000);
    const bus = eng.createBus(ctx, { limiter: false, compress: false, ...busOpts });
    const b = ctx.createBuffer(1, 64, 48000);
    b.getChannelData(0)[0] = 1;
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(dest === 'music' ? bus.musicFx : bus.fx);
    s.start(0.02);
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    const step = 12000;
    const env = [];
    let nan = 0;
    for (let i0 = 0; i0 < d.length; i0 += step) {
      let p = 0;
      for (let i = i0; i < i0 + step && i < d.length; i++) {
        const v = d[i];
        if (Number.isNaN(v)) { nan++; continue; }
        const a = Math.abs(v); if (a > p) p = a;
      }
      env.push(p === 0 ? -99 : +(20 * Math.log10(p)).toFixed(1));
    }
    // RT60 relative to the peak
    const pk = Math.max(...env);
    let rt = null;
    for (let i = 0; i < env.length; i++) if (env[i] <= pk - 60) { rt = +(i * 0.25).toFixed(2); break; }
    return { nan, peakDb: pk, rt60: rt, env: env.slice(0, 40) };
  }
  return {
    hall_fdn: await tail({}, 'music'),
    room_fdn: await tail({}, 'sfx'),
    hall_conv: await tail({ reverb: 'convolver' }, 'music'),
    room_conv: await tail({ reverb: 'convolver' }, 'sfx'),
  };
});
for (const [k, v] of Object.entries(out)) {
  console.log(k.padEnd(11), 'nan=' + v.nan, 'peak=' + v.peakDb, 'rt60=' + v.rt60, '\n           ', v.env.join(' '));
}
await b.close();
srv.close();
