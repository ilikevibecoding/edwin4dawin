#!/usr/bin/env node
/*
 * Offline render + inspection harness for the synthesized soundtrack.
 *
 *   node tools/audio_probe.mjs cue fanfare
 *   node tools/audio_probe.mjs sfx blaster_rebel r2_beep --mood alarm
 *   node tools/audio_probe.mjs all                     # every cue and every sfx
 *   node tools/audio_probe.mjs mix                     # a demo reel of the whole bus
 *   node tools/audio_probe.mjs verify                  # determinism + source rules
 *   node tools/audio_probe.mjs --list
 *
 * Everything is rendered through window.renderOffline() in audio_probe.html —
 * an OfflineAudioContext, the same code path the video render uses — then
 * written to tmp/audio/<name>.wav and analysed with ffmpeg (duration, peak,
 * RMS, spectrogram PNG, waveform PNG) so the synthesis can actually be looked
 * at. Flags: --out --sr --bits --tail --png 0 --gain --pan --duration --mood
 * --opts '<json>' --engine '<json>' --quiet
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { spawn, spawnSync, execFileSync } from 'child_process';
import path from 'path';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const PORT = +(process.env.PREVIEW_PORT || 5173);
const ORIGIN = `http://127.0.0.1:${PORT}`;

const argv = process.argv.slice(2);
const words = [];
const opt = {
  out: 'tmp/audio', sr: 48000, bits: 16, png: '1', tail: '', gain: '', pan: '',
  duration: '', mood: '', opts: '', engine: '', quiet: false,
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    if (k === 'list') { opt.list = true; continue; }
    if (k === 'quiet') { opt.quiet = true; continue; }
    opt[k] = argv[++i];
  } else words.push(a);
}
const mode = words[0] || 'all';
const names = words.slice(1);

// ---------------------------------------------------------------------------
// vite
// ---------------------------------------------------------------------------

async function up() {
  try {
    const r = await fetch(ORIGIN + '/audio_probe.html', { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch { return false; }
}

async function ensureServer() {
  if (await up()) return null;
  console.error(`[audio] starting vite on ${PORT} ...`);
  const p = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: process.cwd(), stdio: 'ignore', detached: true,
  });
  p.unref();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await up()) return p;
  }
  throw new Error('vite did not come up');
}

// ---------------------------------------------------------------------------
// ffmpeg
// ---------------------------------------------------------------------------

function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function analyse(file) {
  const dur = sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]).trim();
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'info', '-i', file, '-af',
    'astats=measure_overall=Peak_level+RMS_level+Flat_factor:measure_perchannel=none',
    '-f', 'null', '-'], { encoding: 'utf8' });
  const out = (r.stderr || '') + (r.stdout || '');
  const grab = (label) => {
    const m = out.match(new RegExp(label.replace(/ /g, '\\s+') + ':\\s*(-?[\\d.]+|-?inf)'));
    return m ? m[1] : '?';
  };
  return { duration: dur, peak: grab('Peak level dB'), rms: grab('RMS level dB'), flat: grab('Flat factor') };
}

function pics(file) {
  const base = file.replace(/\.wav$/, '');
  sh('ffmpeg', ['-y', '-v', 'error', '-i', file, '-lavfi',
    'showspectrumpic=s=1000x480:legend=1:fscale=log', `${base}_spec.png`]);
  sh('ffmpeg', ['-y', '-v', 'error', '-i', file, '-lavfi',
    'showwavespic=s=1000x300:split_channels=1', `${base}_wave.png`]);
  return [`${base}_spec.png`, `${base}_wave.png`];
}

// ---------------------------------------------------------------------------
// source rules — the determinism contract, checked statically
// ---------------------------------------------------------------------------

const FORBIDDEN = [
  [/Math\s*\.\s*random/, 'Math.random()'],
  [/requestAnimationFrame/, 'requestAnimationFrame'],
  [/\bDate\s*\.\s*now\b/, 'Date.now()'],
  [/performance\s*\.\s*now/, 'performance.now()'],
  [/\bsetTimeout\b|\bsetInterval\b/, 'timers'],
  [/currentTime/, 'ctx.currentTime'],
  [/new\s+Date\b/, 'new Date'],
  [/addEventListener/, 'event listeners'],
];

function scanSources() {
  const files = ['src/audio/engine.js', 'src/audio/score.js', 'src/audio/sfx.js'];
  const hits = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;                 // comments may mention them
      for (const [re, label] of FORBIDDEN) {
        if (re.test(line)) hits.push(`${f}:${i + 1}  ${label}  ${line.trim().slice(0, 90)}`);
      }
    });
  }
  return hits;
}

// ---------------------------------------------------------------------------
// specs
// ---------------------------------------------------------------------------

function jsonArg(s) {
  if (!s) return {};
  try { return JSON.parse(s); } catch { throw new Error('bad JSON: ' + s); }
}

function eventOpts() {
  const o = jsonArg(opt.opts);
  if (opt.gain) o.gain = +opt.gain;
  if (opt.pan) o.pan = +opt.pan;
  if (opt.duration) o.duration = +opt.duration;
  if (opt.mood) o.mood = opt.mood;
  return o;
}

/** A demo reel: cues crossfading, effects on top, narration ducks. */
function mixSpec() {
  return {
    kind: 'mix', sampleRate: +opt.sr, bits: +opt.bits, tail: 2.5,
    events: [
      { type: 'cue', name: 'fanfare', when: 0 },
      { type: 'cue', name: 'crawl', when: 13.4, opts: { duration: 26 } },
      { type: 'duck', when: 17, dur: 7, amount: 0.3 },
      { type: 'sfx', name: 'hyperspace_jump', when: 37.5 },
      { type: 'cue', name: 'chase', when: 39.4 },
      { type: 'sfx', name: 'engine_rumble', when: 39.4, opts: { duration: 12, gain: 0.5 } },
      { type: 'sfx', name: 'blaster_rebel', when: 42.2, opts: { pan: -0.5 } },
      { type: 'sfx', name: 'blaster_imperial', when: 43.0, opts: { pan: 0.55 } },
      { type: 'sfx', name: 'tie_scream', when: 44.4, opts: { pan: 0.3 } },
      { type: 'sfx', name: 'explosion_large', when: 47.6 },
      { type: 'sfx', name: 'r2_beep', when: 50.5, opts: { mood: 'alarm' } },
      { type: 'stopCue', name: 'chase', when: 56, fade: 1.6 },
      { type: 'cue', name: 'imperial', when: 57.6 },
      { type: 'sfx', name: 'vader_breath', when: 60.5 },
      { type: 'sfx', name: 'door_blast', when: 66.4 },
      { type: 'duck', when: 68, dur: 5, amount: 0.32 },
      { type: 'cue', name: 'triumph', when: 82 },
      { type: 'sfx', name: 'explosion_huge', when: 82.1, opts: { gain: 0.8 } },
    ],
  };
}

function specFor(kind, name) {
  return {
    kind, name, when: 0, opts: eventOpts(),
    sampleRate: +opt.sr, bits: +opt.bits,
    tail: opt.tail === '' ? (kind === 'sfx' ? 1.5 : 0) : +opt.tail,
    engine: jsonArg(opt.engine),
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const CHUNK = 3 * 1024 * 1024;

(async () => {
  await ensureServer();
  if (!existsSync(CHROME)) throw new Error('chrome not found at ' + CHROME);
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox', '--disable-dev-shm-usage',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));

  await page.goto(`${ORIGIN}/audio_probe.html`, { waitUntil: 'load' });
  const ready = await page.waitForFunction('window.__READY__ === true', null, { timeout: 60000 })
    .then(() => true).catch(() => false);
  if (!ready) {
    console.error('probe page did not initialise');
    const errs = await page.evaluate('window.__ERRORS__ || []');
    console.error(errs.join('\n') || logs.join('\n'));
    await browser.close();
    process.exit(1);
  }
  const meta = await page.evaluate('window.audioMeta()');

  if (opt.list || mode === 'list') {
    console.log('cues:');
    for (const [k, v] of Object.entries(meta.cues)) {
      console.log(`  ${k.padEnd(10)} ${String(v.api).padStart(6)}s  ${v.description}`);
    }
    console.log(`\nsfx (${meta.sfx.length}):`);
    for (const s of meta.sfx) {
      console.log(`  ${s.name.padEnd(18)} ${String(s.duration.toFixed(2)).padStart(6)}s  ${s.opts || ''}`);
    }
    await browser.close();
    return;
  }

  mkdirSync(opt.out, { recursive: true });
  const rows = [];

  const render = async (spec, label) => {
    logs.length = 0;
    const t0 = Date.now();
    const stats = await page.evaluate((s) => window.renderOffline(s), spec);
    if (!stats.ok) {
      console.error(`\n!! ${label} FAILED\n${stats.error}`);
      rows.push({ name: label, err: true });
      return null;
    }
    const parts = [];
    for (let off = 0; off < stats.bytes; off += CHUNK) {
      const b64 = await page.evaluate(([o, l]) => window.wavChunk(o, l), [off, Math.min(CHUNK, stats.bytes - off)]);
      parts.push(Buffer.from(b64, 'base64'));
    }
    const file = path.join(opt.out, `${label.replace(/[^\w.-]/g, '_')}.wav`);
    writeFileSync(file, Buffer.concat(parts));
    const a = analyse(file);
    if (opt.png !== '0') pics(file);
    const row = {
      name: label, file,
      api: +stats.apiEnd.toFixed(3), dur: a.duration, peak: a.peak, rms: a.rms, flat: a.flat,
      jsPeak: +stats.peak.toFixed(4), clipRun: stats.clipRun, nonFinite: stats.nonFinite,
      ms: Date.now() - t0, profile: stats.profile,
    };
    rows.push(row);
    if (!opt.quiet) {
      console.log(`\n=== ${label} -> ${file}`);
      console.log(`    len ${a.duration}s  api ${row.api}s  peak ${a.peak} dBFS  rms ${a.rms} dBFS`
        + `  clipRun ${stats.clipRun}  nonFinite ${stats.nonFinite}  (${row.ms} ms)`);
      console.log('    energy: ' + stats.profile.map((v) => v.toFixed(4)).join(' '));
      if (logs.length) console.log('    console: ' + logs.slice(0, 6).join(' | '));
    }
    return row;
  };

  if (mode === 'cue' || mode === 'sfx') {
    const list = names.length ? names : (mode === 'cue' ? Object.keys(meta.cues) : meta.sfx.map((s) => s.name));
    for (const n of list) {
      const suffix = mode === 'sfx' && opt.mood ? `_${opt.mood}` : '';
      await render(specFor(mode, n), n + suffix);
    }
  } else if (mode === 'all') {
    for (const n of Object.keys(meta.cues)) await render(specFor('cue', n), n);
    for (const s of meta.sfx) await render(specFor('sfx', s.name), s.name);
  } else if (mode === 'mix') {
    await render(mixSpec(), 'mix_reel');
  } else if (mode === 'verify') {
    const hits = scanSources();
    console.log('\n--- source scan (src/audio/*.js) ---');
    console.log(hits.length ? hits.join('\n') : '  clean: no Math.random, no clocks, no frames, no listeners');
    const targets = names.length ? names : ['fanfare', 'chase', 'imperial', 'crawl', 'triumph'];
    console.log('\n--- offline determinism (max |sample diff|) ---');
    let worst = 0;
    for (const n of targets) {
      const r = await page.evaluate((s) => window.verifyOffline(s, 1, 3), specFor('cue', n));
      if (!r.ok) { console.log(`  ${n}: FAILED ${r.error}`); continue; }
      worst = Math.max(worst, r.repeat, r.shifted, r.longerContext);
      console.log(`  cue ${n.padEnd(9)} repeat ${r.repeat}   shifted+1s ${r.shifted}   longer-context ${r.longerContext}`);
    }
    for (const n of names.length ? [] : ['blaster_rebel', 'explosion_large', 'r2_beep', 'tie_scream', 'vader_breath']) {
      const r = await page.evaluate((s) => window.verifyOffline(s, 1, 3), specFor('sfx', n));
      if (!r.ok) { console.log(`  ${n}: FAILED ${r.error}`); continue; }
      worst = Math.max(worst, r.repeat, r.shifted, r.longerContext);
      console.log(`  sfx ${n.padEnd(9)} repeat ${r.repeat}   shifted+1s ${r.shifted}   longer-context ${r.longerContext}`);
    }
    const m = await page.evaluate((s) => window.verifyOffline(s, 1, 3), mixSpec());
    if (m.ok) {
      worst = Math.max(worst, m.repeat, m.shifted, m.longerContext);
      console.log(`  mix reel      repeat ${m.repeat}   shifted+1s ${m.shifted}   longer-context ${m.longerContext}`);
    } else console.log('  mix reel FAILED ' + m.error);
    console.log(`\n  worst deviation across all comparisons: ${worst}`);
    const liveCheck = await page.evaluate((s) => window.checkLive(s), mixSpec());
    console.log('\n--- live AudioContext scheduling ---');
    console.log('  ' + JSON.stringify(liveCheck));
  } else if (mode === 'spec') {
    const spec = JSON.parse(readFileSync(names[0], 'utf8'));
    await render(spec, spec.name || 'spec');
  } else {
    console.error(`unknown mode "${mode}" (cue | sfx | all | mix | verify | spec | list)`);
  }

  if (rows.length > 1) {
    console.log('\n--- summary ---');
    console.log('name                 len(s)    peak      rms   clipRun');
    for (const r of rows) {
      if (r.err) { console.log(`${r.name.padEnd(20)} FAILED`); continue; }
      console.log(`${r.name.padEnd(20)} ${String(r.dur).padStart(7)} ${String(r.peak).padStart(8)} ${String(r.rms).padStart(8)} ${String(r.clipRun).padStart(9)}`);
    }
  }
  const errs = await page.evaluate('window.__ERRORS__ || []');
  if (errs.length) console.log('\npage errors:\n' + errs.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
