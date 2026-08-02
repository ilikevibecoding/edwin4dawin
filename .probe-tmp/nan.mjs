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
pg.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await pg.goto('http://127.0.0.1:5297/audio-probe.html', { waitUntil: 'networkidle0' });
await pg.waitForFunction('window.__ready === true');

const mode = process.argv[2] || 'groups';
const out = await pg.evaluate(async (mode) => {
  const { createBus } = await import('/src/audio/engine.js');
  const score = await import('/src/audio/score.js');

  async function run(fn, dur = 44) {
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * 48000), 48000);
    const bus = createBus(ctx, { reverb: 'none', limiter: false, compress: false });
    fn(ctx, bus);
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    let first = -1; let count = 0; let peak = 0;
    for (let i = 0; i < d.length; i++) {
      if (Number.isNaN(d[i])) { count++; if (first < 0) first = i; }
      else { const a = Math.abs(d[i]); if (a > peak) peak = a; }
    }
    return { first: first < 0 ? null : first / 48000, count, peak };
  }

  const results = {};
  // Full section
  results.full = await run((ctx, bus) => score.scheduleScore(ctx, bus, [{ id: 'fanfare', start: 0, dur: 41 }]));
  return results;
}, mode);
console.log(JSON.stringify(out, null, 2));
await b.close();
srv.close();
