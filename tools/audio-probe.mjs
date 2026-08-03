#!/usr/bin/env node
/**
 * Offline audio probe.
 *
 * Renders a chunk of the soundtrack through a real browser `OfflineAudioContext`
 * (headless Chrome via puppeteer), writes a WAV, then measures it with ffmpeg
 * and draws a spectrogram + waveform so the result can actually be inspected.
 *
 *   node tools/audio-probe.mjs --what score --section battle --dur 20 --out /tmp/audio/battle.wav
 *   node tools/audio-probe.mjs --what sfx --name vaderBreath --dur 5 --out /tmp/audio/breath.wav
 *   node tools/audio-probe.mjs --what score --section all --out /tmp/audio/score.wav
 *   node tools/audio-probe.mjs --what film --out /tmp/audio/film.wav
 *   node tools/audio-probe.mjs --what sfxall --out /tmp/audio/sfxall.wav
 *   node tools/audio-probe.mjs --what reverb --out /tmp/audio/reverb.wav
 *
 * Flags
 *   --what     score | sfx | sfxall | film | cues | reverb      (default score)
 *   --section  fanfare|chase|imperial|droids|desert|battle|finale|all
 *   --name     an SFX name (for --what sfx)
 *   --dur      length of the rendered file, seconds (default: natural length)
 *   --secdur   override the section length handed to scheduleScore
 *   --from     resume a section this many seconds in (the director's scrub path)
 *   --opts     JSON options object forwarded to the effect
 *   --bus      JSON options object forwarded to createBus
 *   --sr       sample rate (default 48000)
 *   --ducks    apply the scene's narration duck windows to a single section
 *   --seed     score seed (default 20250802)
 *   --out      output wav path (default /tmp/audio/<what>.wav)
 *   --pcm16    write 16-bit PCM instead of 32-bit float
 *   --no-png   skip the spectrogram/waveform images
 *   --json     print the measurements as JSON as well
 *   --port     static server port (default 5199)
 *   --timeout  minutes to allow the render before giving up (default 90)
 */

import puppeteer from 'puppeteer';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, extname, join, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------ args ------------------------------ */

const argv = process.argv.slice(2);
const has = (n) => argv.includes('--' + n);
const flag = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] !== undefined && !String(argv[i + 1]).startsWith('--') ? argv[i + 1] : d;
};
const num = (n, d) => { const v = flag(n, null); return v == null ? d : Number(v); };
const json = (n, d) => { const v = flag(n, null); if (v == null) return d; try { return JSON.parse(v); } catch { console.error(`bad JSON for --${n}: ${v}`); process.exit(1); } };

const WHAT = flag('what', 'score');
const SECTION = flag('section', 'fanfare');
const NAME = flag('name', 'laser');
const SR = num('sr', 48000);
const SEED = num('seed', 20250802);
const PORT = num('port', 5199);
const DUR = num('dur', null);
const SECDUR = num('secdur', null);
const FROM = num('from', null);
const TIMEOUT = num('timeout', 90);
const OPTS = json('opts', {});
const BUSOPTS = json('bus', {});
const CUES = json('cues', null);
const PCM16 = has('pcm16');
const NOPNG = has('no-png');
const JSONOUT = has('json');
const FSCALE = flag('fscale', 'log');
const FSTART = num('fstart', 24);
const FSTOP = num('fstop', 16000);
const SPECW = num('specw', 1600);
const SPECGAIN = num('specgain', 3);
const defaultName = WHAT === 'sfx' ? NAME : WHAT === 'score' ? SECTION : WHAT;
const OUT = resolve(flag('out', `/tmp/audio/${defaultName}.wav`));

/* -------------------------- static server ------------------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function serve(port) {
  return new Promise((ok, fail) => {
    const srv = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
        const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
        const path = join(ROOT, rel === '/' ? '/audio-probe.html' : rel);
        if (!path.startsWith(ROOT)) { res.writeHead(403).end(); return; }
        const body = await readFile(path);
        res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
      }
    });
    srv.on('error', fail);
    srv.listen(port, '127.0.0.1', () => ok(srv));
  });
}

/* ----------------------------- ffmpeg ----------------------------- */

async function ff(args) {
  try {
    const { stdout, stderr } = await execFileAsync('ffmpeg', ['-hide_banner', '-nostdin', ...args], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout + stderr;
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function grabAfterOverall(text, key) {
  const i = text.lastIndexOf('Overall');
  const scope = i >= 0 ? text.slice(i) : text;
  const m = new RegExp(`${key}:\\s*(-?(?:[\\d.]+|inf|nan))`).exec(scope);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isNaN(v) ? (m[1] === '-inf' ? -Infinity : m[1] === 'inf' ? Infinity : null) : v;
}

async function astats(file) {
  const t = await ff(['-i', file, '-af', 'astats=metadata=1:reset=0', '-f', 'null', '-']);
  const g = (k) => grabAfterOverall(t, k);
  const peakDb = g('Peak level dB');
  const rmsDb = g('RMS level dB');
  return {
    peakDb, rmsDb,
    crestDb: peakDb != null && rmsDb != null ? peakDb - rmsDb : null,
    rmsPeakDb: g('RMS peak dB'),
    rmsTroughDb: g('RMS trough dB'),
    maxLevel: g('Max level'),
    minLevel: g('Min level'),
    dcOffset: g('DC offset'),
    flatFactor: g('Flat factor'),
    peakCount: g('Peak count'),
    dynamicRange: g('Dynamic range'),
    entropy: g('Entropy'),
    nans: g('Number of NaNs'),
    infs: g('Number of Infs'),
    samples: g('Number of samples'),
  };
}

async function loudness(file) {
  const t = await ff(['-i', file, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']);
  const tail = t.slice(t.lastIndexOf('Summary'));
  const g = (re) => { const m = re.exec(tail); return m ? Number(m[1]) : null; };
  return {
    lufs: g(/I:\s*(-?[\d.]+)\s*LUFS/),
    lra: g(/LRA:\s*(-?[\d.]+)\s*LU/),
    truePeakDb: g(/Peak:\s*(-?[\d.]+)\s*dBFS/),
  };
}

async function silences(file, thresholdDb = -55, minLen = 0.7) {
  const t = await ff(['-i', file, '-af', `silencedetect=noise=${thresholdDb}dB:d=${minLen}`, '-f', 'null', '-']);
  const out = [];
  const re = /silence_start:\s*(-?[\d.]+)[\s\S]*?silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(t))) out.push({ start: +m[1], end: +m[2], dur: +m[3] });
  const open = /silence_start:\s*(-?[\d.]+)(?![\s\S]*silence_end)/.exec(t);
  if (open) out.push({ start: +open[1], end: null, dur: null });
  return out;
}

async function probeDuration(file) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
    ]);
    return Number(stdout.trim());
  } catch { return null; }
}

async function images(file, base) {
  const spec = base + '.spectrogram.png';
  const wave = base + '.waveform.png';
  await ff(['-y', '-i', file, '-lavfi',
    `showspectrumpic=s=${SPECW}x800:mode=combined:color=intensity:scale=log:fscale=${FSCALE}:start=${FSTART}:stop=${FSTOP}:legend=1:gain=${SPECGAIN}:drange=90`,
    '-frames:v', '1', spec]);
  await ff(['-y', '-i', file, '-lavfi',
    `showwavespic=s=${SPECW}x420:split_channels=1:colors=#5fd7ff|#ffb15f:filter=peak`,
    '-frames:v', '1', wave]);
  return { spec, wave };
}

/* ------------------------------ main ------------------------------ */

const srv = await serve(PORT);
const browser = await puppeteer.launch({
  headless: true,
  // The full-film pass renders 243 s of audio in one shot and comfortably
  // outlives puppeteer's default 180 s protocol timeout. It is also several
  // times slower on a loaded machine, so this is deliberately generous.
  protocolTimeout: TIMEOUT * 60 * 1000,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--disable-frame-rate-limit',
    '--mute-audio',
    '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required',
    '--js-flags=--max-old-space-size=4096',
  ],
});

const page = await browser.newPage();
const logs = [];
page.on('console', (m) => {
  if (m.type() !== 'error' && m.type() !== 'warning') return;
  if (/favicon/.test(m.text())) return;
  logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));

let result;
let failed = null;
try {
  await page.goto(`http://127.0.0.1:${PORT}/audio-probe.html`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window.__ready === true', { timeout: 20000 });

  result = await page.evaluate(async (cfg) => {
    try {
      return await window.audioProbe.render(cfg);
    } catch (e) {
      return { ok: false, error: String((e && e.stack) || e) };
    }
  }, {
    what: WHAT, section: SECTION, name: NAME, sr: SR, seed: SEED,
    dur: DUR ?? undefined, secDur: SECDUR ?? undefined, from: FROM ?? undefined,
    opts: OPTS, bus: BUSOPTS, cues: CUES ?? undefined, pcm16: PCM16,
    ducks: has('ducks'),
  });

  if (!result || !result.ok) throw new Error(result ? result.error : 'render returned nothing');

  // Pull the WAV back in base64 chunks (multiples of 3 so they concatenate).
  const CH = 3 * 1024 * 1024;
  const parts = [];
  for (let off = 0; off < result.bytes; off += CH) {
    const len = Math.min(CH, result.bytes - off);
    parts.push(Buffer.from(await page.evaluate((a, b) => window.audioProbe.chunk(a, b), off, len), 'base64'));
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, Buffer.concat(parts));
} catch (e) {
  failed = e;
} finally {
  await browser.close();
  srv.close();
}

if (failed) {
  console.error('probe failed: ' + failed.message);
  if (logs.length) console.error('--- console ---\n' + logs.slice(0, 30).join('\n'));
  process.exit(1);
}

const base = OUT.replace(/\.wav$/i, '');
const [dur, st, lu, sil] = await Promise.all([
  probeDuration(OUT), astats(OUT), loudness(OUT), silences(OUT),
]);
const imgs = NOPNG ? null : await images(OUT, base);

const label = WHAT === 'sfx' ? `sfx:${NAME}` : WHAT === 'score' ? `score:${SECTION}` : WHAT;
const f = (v, d = 2) => (v == null || Number.isNaN(v) ? '    n/a' : (Number.isFinite(v) ? v.toFixed(d) : String(v)).padStart(7));
console.log(`
${label}
  file        ${OUT}
  duration    ${f(dur, 3)} s   (rendered ${result.duration.toFixed(3)}, scheduled end ${Number(result.scheduledEnd).toFixed(3)})
  format      ${result.sampleRate} Hz, ${result.channels} ch, ${PCM16 ? 'pcm16' : 'float32'}
  peak        ${f(st.peakDb)} dBFS      true peak ${f(lu.truePeakDb)} dBFS   max|min ${st.maxLevel} / ${st.minLevel}
  rms         ${f(st.rmsDb)} dBFS      lufs ${f(lu.lufs, 1)}   lra ${f(lu.lra, 1)} LU
  crest       ${f(st.crestDb)} dB        dyn range ${f(st.dynamicRange)}   entropy ${f(st.entropy)}
  dc offset   ${st.dcOffset == null ? 'n/a' : st.dcOffset.toExponential(2)}     flat ${f(st.flatFactor)}   samples at peak ${st.peakCount ?? 'n/a'}   nan/inf ${st.nans}/${st.infs}
  nodes       ${result.nodes}  (${Object.entries(result.nodesByType).filter(([k]) => k !== 'createBuffer').map(([k, v]) => k.replace('create', '').toLowerCase() + ':' + v).join(' ')})
  reverb      ${result.reverb}    schedule ${result.scheduleMs} ms, render ${result.renderMs} ms
  silence     ${sil.length ? sil.map((s) => `${s.start.toFixed(2)}→${s.end == null ? 'end' : s.end.toFixed(2)}`).join(' ') : 'none > 0.7 s below -55 dB'}` +
  (imgs ? `\n  spectrogram ${imgs.spec}\n  waveform    ${imgs.wave}` : ''));

if (result.plan && result.plan.sections) {
  console.log('  sections');
  for (const s of result.plan.sections) {
    console.log(`    ${String(s.id).padEnd(9)} start ${String(s.start.toFixed(2)).padStart(7)}  dur ${String(s.dur.toFixed(2)).padStart(6)}  notes ${String(s.notes).padStart(5)}`);
  }
}
if (result.plan && result.plan.duckWindows) {
  console.log(`  ducks       ${result.plan.ducks} lines -> ${result.plan.duckWindows.length} merged windows`);
  console.log('    ' + result.plan.duckWindows.map((w) => `${w.a}–${w.b}`).join('  '));
}
if (result.plan && result.plan.laid) {
  console.log('  effects');
  for (const s of result.plan.laid) {
    console.log(`    ${s.name.padEnd(19)} t ${String(s.t.toFixed(3)).padStart(8)}  dur ${String(s.dur.toFixed(3)).padStart(7)} s`);
  }
}
if (logs.length) console.log('  --- console ---\n  ' + logs.slice(0, 20).join('\n  '));

if (JSONOUT) {
  console.log(JSON.stringify({
    label, out: OUT, duration: dur, astats: st, loudness: lu, silence: sil,
    nodes: result.nodes, nodesByType: result.nodesByType,
    scheduledEnd: result.scheduledEnd, plan: result.plan,
    inPagePeakDb: result.peakDb, inPageRmsDb: result.rmsDb,
    images: imgs,
  }, null, 2));
}

// Fail loudly on the things that must never happen.
const problems = [];
if (st.peakDb != null && st.peakDb > -0.1) problems.push(`peak ${st.peakDb} dBFS is at/over full scale`);
if (st.peakDb != null && st.peakDb < -40) problems.push(`peak ${st.peakDb} dBFS — effectively silent`);
if (st.dcOffset != null && Math.abs(st.dcOffset) > 0.002) problems.push(`dc offset ${st.dcOffset}`);
if (problems.length) {
  console.log('  PROBLEMS: ' + problems.join('; '));
  process.exit(3);
}
