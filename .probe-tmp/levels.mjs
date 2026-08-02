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
const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--js-flags=--max-old-space-size=4096'] });
const pg = await b.newPage();
pg.on('pageerror', (e) => console.log('PAGEERROR', e.message));
pg.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) console.log('CONSOLE', m.text()); });
await pg.goto('http://127.0.0.1:5297/audio-probe.html', { waitUntil: 'networkidle0' });
await pg.waitForFunction('window.__ready === true');

const raw = process.argv.includes('--raw');
const out = await pg.evaluate(async (raw) => {
  const eng = await import('/src/audio/engine.js');
  const score = await import('/src/audio/score.js');
  const { SCENES } = await import('/src/story.js');
  const DUR = {};
  for (const s of SCENES) DUR[s.music] = s.dur;

  const rows = [];
  for (const id of score.SECTION_IDS) {
    const dur = DUR[id];
    const total = dur + 2.2;
    const ctx = new OfflineAudioContext(2, Math.ceil(total * 48000), 48000);
    const bus = eng.createBus(ctx, raw ? { limiter: false, compress: false } : {});
    const res = score.scheduleScore(ctx, bus, [{ id, start: 0, dur }]);
    const buf = await ctx.startRendering();
    let peak = 0; let ss = 0; let n = 0; let nan = 0;
    // per-second rms so we can see holes
    const secs = [];
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        const v = d[i];
        if (Number.isNaN(v)) { nan++; continue; }
        const a = v < 0 ? -v : v;
        if (a > peak) peak = a;
        ss += v * v; n++;
      }
    }
    const d0 = buf.getChannelData(0);
    for (let s = 0; s < Math.floor(total); s++) {
      let e = 0;
      for (let i = s * 48000; i < (s + 1) * 48000 && i < d0.length; i++) e += d0[i] * d0[i];
      const r = Math.sqrt(e / 48000);
      secs.push(r === 0 ? -99 : Math.round(20 * Math.log10(r)));
    }
    rows.push({
      id, dur, notes: res.notes, nan,
      peakDb: +(20 * Math.log10(peak)).toFixed(2),
      rmsDb: +(20 * Math.log10(Math.sqrt(ss / n))).toFixed(2),
      secs,
    });
  }
  return rows;
}, raw);

for (const r of out) {
  console.log(`${r.id.padEnd(9)} dur ${String(r.dur).padStart(3)}  notes ${String(r.notes).padStart(5)}  peak ${String(r.peakDb).padStart(7)}  rms ${String(r.rmsDb).padStart(7)}  nan ${r.nan}`);
  console.log('          ' + r.secs.join(' '));
}
await b.close();
srv.close();
