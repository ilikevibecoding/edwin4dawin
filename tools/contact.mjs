#!/usr/bin/env node
/*
 * Contact sheet.
 *
 * Renders the film at a spread of timestamps and tiles them into one image, so
 * the whole cut can be reviewed at a glance instead of scrubbing a video. Also
 * leaves the individual frames on disk for a closer look at anything that
 * looks wrong.
 *
 *   node tools/contact.mjs                       # 24 frames across the film
 *   node tools/contact.mjs --n 40 --w 480
 *   node tools/contact.mjs --times 12,45,88,140  # specific moments
 *   node tools/contact.mjs --seq battle --n 12   # one sequence
 */
import { chromium } from 'playwright-core';
import { spawnSync, spawn } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const PORT = +(process.env.PREVIEW_PORT || 5173);
const ORIGIN = `http://127.0.0.1:${PORT}`;

const argv = process.argv.slice(2);
const opt = { n: 24, w: 560, out: 'tmp/contact', cols: 0, times: '', seq: '', fps: 24 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i];
}
const W = Math.round(+opt.w / 2) * 2;
const H = Math.round(W / 2.39 / 2) * 2;

async function up() {
  try { return (await fetch(ORIGIN + '/index.html', { signal: AbortSignal.timeout(1500) })).ok; }
  catch { return false; }
}
async function ensureServer() {
  if (await up()) return;
  const p = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: process.cwd(), stdio: 'ignore', detached: true });
  p.unref();
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await up()) return;
  }
  throw new Error('vite did not come up');
}

(async () => {
  await ensureServer();
  rmSync(opt.out, { recursive: true, force: true });
  mkdirSync(opt.out, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--enable-webgl', '--mute-audio', '--hide-scrollbars'],
  });
  const page = await browser.newPage({ viewport: { width: W + 40, height: H + 40 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });

  await page.goto(`${ORIGIN}/index.html?capture=1&w=${W}&h=${H}&q=high`, { waitUntil: 'load' });
  const ok = await page.waitForFunction('window.__filmReady === true', null, { timeout: 900000 })
    .then(() => true).catch(() => false);
  if (!ok) {
    console.error('film never became ready.\n' + errors.join('\n'));
    const shot = await page.screenshot();
    writeFileSync(path.join(opt.out, 'failed.png'), shot);
    await browser.close();
    process.exit(1);
  }

  const info = await page.evaluate('({duration: window.__film.duration, sequences: window.__film.sequences})');
  console.log(`film ${info.duration.toFixed(1)}s`);
  for (const s of info.sequences) console.log(`  ${s.id.padEnd(10)} ${s.start.toFixed(1)} .. ${(s.start + s.duration).toFixed(1)}`);

  let times;
  if (opt.times) {
    times = opt.times.split(',').map(Number);
  } else if (opt.seq) {
    const s = info.sequences.find((x) => x.id === opt.seq);
    if (!s) throw new Error('no sequence ' + opt.seq);
    const n = +opt.n;
    times = Array.from({ length: n }, (_, i) => s.start + (i + 0.5) * s.duration / n);
  } else {
    const n = +opt.n;
    times = Array.from({ length: n }, (_, i) => (i + 0.5) * info.duration / n);
  }

  const files = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    // Step a few frames in so anything integrating over dt has settled.
    const f = Math.round(t * opt.fps);
    await page.evaluate(`(function(){
      for (let k = 4; k >= 0; k--) window.__film.frame(${f} - k, ${opt.fps});
    })()`);
    const b64 = await page.evaluate(`document.getElementById('c').toDataURL('image/png').slice(22)`);
    const file = path.join(opt.out, `${String(i).padStart(3, '0')}_${t.toFixed(1)}s.png`);
    writeFileSync(file, Buffer.from(b64, 'base64'));
    files.push({ file, t });
    process.stdout.write(`\r  captured ${i + 1}/${times.length}   `);
  }
  console.log();
  await browser.close();

  // Tile them, labelled with their timestamp.
  const cols = +opt.cols || Math.ceil(Math.sqrt(files.length * 2.39 / 1.6));
  const rows = Math.ceil(files.length / cols);
  const font = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']
    .find((p) => existsSync(p));
  const labelled = [];
  for (const f of files) {
    const out = f.file.replace('.png', '_l.png');
    const args = ['-y', '-v', 'error', '-i', f.file];
    if (font) {
      args.push('-vf', `drawtext=fontfile=${font}:text='${f.t.toFixed(1)}s':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=5`);
    }
    args.push(out);
    spawnSync('ffmpeg', args);
    labelled.push(existsSync(out) ? out : f.file);
  }
  const sheet = path.join(opt.out, 'contact.png');
  const inputs = labelled.flatMap((f) => ['-i', f]);
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...inputs,
    '-filter_complex', `${labelled.map((_, i) => `[${i}:v]`).join('')}xstack=inputs=${labelled.length}:layout=${layout(labelled.length, cols, W, H)}:fill=black[v]`,
    '-map', '[v]', sheet]);
  if (r.status !== 0) console.error(r.stderr?.toString());
  console.log(`\ncontact sheet: ${sheet}  (${cols}x${rows}, each ${W}x${H})`);
  if (errors.length) console.log('\npage errors:\n' + [...new Set(errors)].slice(0, 25).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });

function layout(n, cols, w, h) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = (i / cols) | 0;
    parts.push(`${c * w}_${r * h}`);
  }
  return parts.join('|');
}
