#!/usr/bin/env node
/**
 * Numeric harness for the audio engine.
 *
 * There is no way to listen to CI, so every claim the sound design makes is
 * turned into a measurement. The page boots the real game, `src/audio/Debug.ts`
 * mirrors the real signal chain onto an `OfflineAudioContext`, renders one sound
 * at a time and returns its figures; this script asserts on them and dumps the
 * waveform envelopes and band spectra to a text report so the shape of a sound
 * can be inspected rather than guessed at.
 *
 * Launch flags follow tools/capture.mjs, with two deliberate differences:
 * `--mute-audio` is dropped and autoplay is forced, so the page gets a real
 * running `AudioContext` and the tests exercise the live path too.
 *
 * Usage:
 *   node tools/audio-test.mjs
 *   node tools/audio-test.mjs --out shots/audio --verbose
 *   node tools/audio-test.mjs --only weapon,zone
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const OPTS = {
  url: arg('url', 'http://127.0.0.1:5173/'),
  out: arg('out', 'shots/audio'),
  quality: arg('quality', 'high'),
  timeout: Number(arg('timeout', 900000)),
  bootTimeout: Number(arg('boot-timeout', 180000)),
  only: String(arg('only', '')).split(',').map((s) => s.trim()).filter(Boolean),
  verbose: !!arg('verbose', false),
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
if (!CHROME) {
  console.error('No Chrome binary found.');
  process.exit(1);
}

const LAUNCH_ARGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
  '--disable-software-rasterizer-fallback-warning',
  '--hide-scrollbars',
  // The capture harness mutes audio; this one must not, because half the point
  // is to prove the live context comes up and stays up.
  '--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--window-size=640,360',
  '--renderer-process-limit=1',
];

/* ------------------------------- assertions ------------------------------ */

const results = [];
let failures = 0;

function record(group, name, ok, detail) {
  results.push({ group, name, ok, detail });
  if (!ok) failures++;
  const mark = ok ? 'pass' : 'FAIL';
  if (!ok || OPTS.verbose) console.log(`  ${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fmt(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return String(v);
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(3);
  return v.toFixed(5);
}

/** `actual` must lie in [lo, hi]. */
function inRange(group, name, actual, lo, hi, unit = '') {
  const ok = actual >= lo && actual <= hi;
  record(group, name, ok, `${fmt(actual)}${unit} in [${fmt(lo)}, ${fmt(hi)}]${unit}`);
  return ok;
}

/** `a` must exceed `b` by at least `margin` (absolute, or a ratio when `ratio`). */
function greater(group, name, a, b, margin = 0, labels = ['a', 'b']) {
  const ok = a > b + margin;
  record(
    group,
    name,
    ok,
    `${labels[0]}=${fmt(a)} > ${labels[1]}=${fmt(b)}${margin ? ` + ${fmt(margin)}` : ''}`,
  );
  return ok;
}

function ratioAtLeast(group, name, a, b, factor, labels = ['a', 'b']) {
  const ok = b > 0 ? a / b >= factor : a > 0;
  record(
    group,
    name,
    ok,
    `${labels[0]}=${fmt(a)} / ${labels[1]}=${fmt(b)} = ${fmt(b > 0 ? a / b : Infinity)}x, need ${fmt(factor)}x`,
  );
  return ok;
}

function truthy(group, name, ok, detail) {
  record(group, name, !!ok, detail);
  return !!ok;
}

/* --------------------------------- report -------------------------------- */

const dumps = [];

/** ASCII bar for one band or envelope value, in dB relative to 0. */
function bar(db, floor = -60, width = 46) {
  if (!Number.isFinite(db)) return '';
  const t = Math.max(0, Math.min(1, (db - floor) / -floor));
  return '#'.repeat(Math.round(t * width));
}

function dumpSignal(label, m) {
  if (!m || !m.ok) {
    dumps.push(`\n=== ${label} ===\n  UNAVAILABLE: ${m?.error ?? 'no measurement'}\n`);
    return;
  }
  const lines = [];
  lines.push(`\n=== ${label} ===`);
  lines.push(
    `  ${m.duration.toFixed(3)}s @ ${m.sampleRate}Hz, ${m.channels}ch   ` +
      `peak ${m.peak.toFixed(4)}  rms ${m.rms.toFixed(5)}  crest ${m.crest.toFixed(1)}`,
  );
  lines.push(
    `  attack ${(m.attack * 1000).toFixed(2)}ms  peak@ ${(m.peakAt * 1000).toFixed(2)}ms  ` +
      `centroid ${m.centroid.toFixed(0)}Hz  ` +
      `lo/hi ${m.tilt.toFixed(2)}  decay ${m.decay.toFixed(3)}s  rt60 ${m.rt60.toFixed(3)}s`,
  );
  if (m.layers) {
    lines.push(
      '  layers  ' +
        Object.entries(m.layers)
          .map(([k, v]) => `${k}=${fmt(v)}`)
          .join('  '),
    );
  }
  lines.push('  spectrum (40Hz..16kHz, dB rel. peak band):');
  const lowHz = 40;
  const step = Math.pow(Math.min(16000, m.sampleRate * 0.45) / lowHz, 1 / m.bands.length);
  m.bands.forEach((db, i) => {
    const f = lowHz * Math.pow(step, i);
    const hz = f >= 1000 ? `${(f / 1000).toFixed(1)}k` : f.toFixed(0);
    lines.push(`    ${hz.padStart(6)}Hz ${String(db.toFixed(0)).padStart(4)} ${bar(db)}`);
  });
  lines.push('  envelope (peak dBFS per 1/64 of duration):');
  const per = m.duration / m.envelope.length;
  m.envelope.forEach((db, i) => {
    lines.push(
      `    ${(i * per).toFixed(3)}s ${String(db.toFixed(0)).padStart(4)} ${bar(db, -72, 40)}`,
    );
  });
  dumps.push(lines.join('\n'));
}

/* ---------------------------------- main --------------------------------- */

function want(group) {
  return OPTS.only.length === 0 || OPTS.only.includes(group);
}

async function main() {
  await mkdir(OPTS.out, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: LAUNCH_ARGS,
    protocolTimeout: OPTS.timeout,
    defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(OPTS.timeout);

  const logs = [];
  page.on('console', (msg) => {
    const t = `[${msg.type()}] ${msg.text()}`;
    logs.push(t);
    if (OPTS.verbose || msg.type() === 'error') console.log('  page', t);
  });
  page.on('pageerror', (err) => {
    const t = `[pageerror] ${err.message}`;
    logs.push(t);
    console.log('  page', t);
  });

  const url = new URL(OPTS.url);
  url.searchParams.set('capture', '1');
  if (OPTS.quality) url.searchParams.set('quality', String(OPTS.quality));

  console.log(`Loading ${url.href} ...`);
  const t0 = Date.now();
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: OPTS.timeout });

  const overlay = await page
    .evaluate(() => {
      const el = document.querySelector('vite-error-overlay');
      if (el) return el.shadowRoot?.querySelector('.message')?.textContent ?? 'vite error';
      return null;
    })
    .catch(() => null);
  if (overlay) {
    console.error('Build error:\n', overlay);
    await browser.close();
    process.exit(1);
  }

  try {
    await page.waitForFunction(() => window.__GAME__ && window.__GAME__.ready === true, {
      timeout: OPTS.bootTimeout,
      polling: 250,
    });
  } catch {
    console.error('Engine never reported ready. Recent console output:');
    for (const l of logs.slice(-40)) console.error('   ', l);
    await browser.close();
    process.exit(1);
  }
  console.log(`Engine ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  try {
    await page.waitForFunction(() => !!window.__AUDIO__, { timeout: 60000, polling: 100 });
  } catch {
    console.error('Audio bridge never appeared (src/audio/Debug.ts did not install).');
    await browser.close();
    process.exit(1);
  }

  /* The engine unlocks on a gesture in the real game; do the same here. */
  await page
    .evaluate(() => window.__GAME__?.engine?.tryGet?.('audio')?.resume?.())
    .catch(() => {});
  await page.evaluate(() => new Promise((r) => setTimeout(r, 150)));

  const bake = await page.evaluate(() => window.__AUDIO__.bakeAll());
  const info = await page.evaluate(() => window.__AUDIO__.info());
  const live = await page.evaluate(() => window.__AUDIO__.stats());

  console.log(
    `Baked ${bake.clips} clips (${(bake.bytes / 1048576).toFixed(1)} MB) at ${info.sampleRate} Hz; ` +
      `context ${live.state}, ${info.ids.length} sound ids`,
  );
  if (bake.failures.length) {
    console.error('Bake failures:');
    for (const f of bake.failures) console.error('   ', f);
  }

  const render = (spec) => page.evaluate((s) => window.__AUDIO__.render(s), spec);
  const baked = (name, index) =>
    page.evaluate((n, i) => window.__AUDIO__.measureBaked(n, i), name, index ?? 0);

  /* ===================== 0. structure and bake health ==================== */

  if (want('bake')) {
    console.log('\nBake health');
    truthy('bake', 'every recipe rendered without throwing', bake.failures.length === 0, bake.failures.join('; '));
    inRange('bake', 'clip count is plausible', bake.clips, 120, 4000);
    inRange('bake', 'sample memory stays modest', bake.bytes / 1048576, 0.5, 96, ' MB');
    truthy('bake', 'live context is running', live.state === 'running', `state=${live.state}`);
    truthy('bake', 'no failure recorded on the system', !live.failed, String(live.failed));
    inRange('bake', 'eager bake fits in a boot budget', live.bakeEagerMs, 0, 2500, ' ms');
    for (const need of ['crack', 'step:concrete', 'impact:metal', 'ui_hitmarker', 'blast:grenade']) {
      const hit = info.clips.some((c) => c === need || c.startsWith(`${need}:`));
      truthy('bake', `baked "${need}" exists`, hit);
    }
  }

  /* ========================= 1. the gunshot itself ======================== */

  const guns = ['rifle', 'smg', 'sniper', 'shotgun', 'pistol'];
  const close = {};

  if (want('weapon')) {
    console.log('\nWeapon transient and body');
    for (const g of guns) {
      const m = await render({ kind: 'shot', id: g, distance: 0, zone: 'street', seed: 12345 });
      close[g] = m;
      if (!truthy('weapon', `${g} renders`, m.ok, m.error)) continue;
      dumpSignal(`shot / ${g} / first person / street`, m);

      // A gunshot is the loudest recurring sound in the game, and it must leave
      // the master chain hot but with headroom for an explosion on top of it.
      inRange('weapon', `${g} peak is hot but has headroom`, m.peak, 0.25, 0.92);
      truthy('weapon', `${g} does not clip`, !m.over, `peak ${fmt(m.peak)}`);
      // The headline transient requirement, measured on the shock front rather
      // than on the broadband peak — on a heavy calibre the absolute peak is the
      // low-frequency punch, which legitimately arrives a few milliseconds in.
      inRange('weapon', `${g} shock front is a genuine crack`, m.attackHf * 1000, 0, 3, ' ms');
      inRange('weapon', `${g} broadband peak arrives promptly`, m.attack * 1000, 0, 12, ' ms');
      // A shot is a transient, not a drone: peak must tower over the mean.
      greater('weapon', `${g} has transient crest factor`, m.crest, 6, 0, ['crest', 'min']);
      inRange('weapon', `${g} rms is in range`, m.rms, 0.004, 0.25);
    }

    console.log('\nWeapon spectra are distinct');
    const table = guns.filter((g) => close[g]?.ok).map((g) => ({ g, ...close[g] }));
    for (const row of table) {
      console.log(
        `    ${row.g.padEnd(8)} centroid ${String(row.centroid.toFixed(0)).padStart(5)} Hz   ` +
          `lo/hi ${row.tilt.toFixed(3)}   peak ${row.peak.toFixed(3)}   crest ${row.crest.toFixed(1)}   ` +
          `shock front ${(row.attackHf * 1000).toFixed(2)} ms`,
      );
    }
    // Every pair must be separable on at least one of the two fingerprints,
    // which is the real requirement: "measurably distinct from the others".
    for (let i = 0; i < table.length; i++) {
      for (let j = i + 1; j < table.length; j++) {
        const a = table[i];
        const b = table[j];
        const centroidSep = Math.abs(a.centroid - b.centroid) / Math.max(a.centroid, b.centroid);
        const tiltSep = Math.abs(a.tilt - b.tilt) / Math.max(a.tilt, b.tilt);
        truthy(
          'weapon',
          `${a.g} vs ${b.g} are separable`,
          centroidSep > 0.08 || tiltSep > 0.15,
          `centroid ${(centroidSep * 100).toFixed(1)}%, lo/hi ${(tiltSep * 100).toFixed(1)}%`,
        );
      }
    }
    // The design intent from the brief: the SMG is the brightest, the .338 and
    // the shotgun sit lowest, and the low/high balance orders the other way.
    if (close.smg?.ok && close.sniper?.ok) {
      greater('weapon', 'smg is brighter than the sniper', close.smg.centroid, close.sniper.centroid, 200, ['smg', 'sniper']);
      greater('weapon', 'sniper carries more low end than smg', close.sniper.tilt, close.smg.tilt, 0.1, ['sniper', 'smg']);
    }
    if (close.shotgun?.ok && close.smg?.ok) {
      greater('weapon', 'shotgun carries more low end than smg', close.shotgun.tilt, close.smg.tilt, 0.1, ['shotgun', 'smg']);
    }
    if (close.rifle?.ok && close.sniper?.ok) {
      greater('weapon', 'carbine cracks higher than the sniper', close.rifle.centroid, close.sniper.centroid, 100, ['rifle', 'sniper']);
    }

    console.log('\nPer-shot variation');
    // Sustained automatic fire must not be a loop: two shots from the same gun
    // have to differ.
    const a = await render({ kind: 'shot', id: 'rifle', distance: 0, zone: 'street', seed: 1 });
    const b = await render({ kind: 'shot', id: 'rifle', distance: 0, zone: 'street', seed: 999 });
    if (a.ok && b.ok) {
      const dCentroid = Math.abs(a.centroid - b.centroid) / Math.max(a.centroid, b.centroid);
      const dPeak = Math.abs(a.peak - b.peak) / Math.max(a.peak, b.peak);
      truthy(
        'weapon',
        'consecutive shots differ',
        dCentroid > 0.005 || dPeak > 0.005,
        `centroid ${(dCentroid * 100).toFixed(2)}%, peak ${(dPeak * 100).toFixed(2)}%`,
      );
      // ...but not so much that the weapon loses its identity.
      truthy(
        'weapon',
        'variation stays within the weapon character',
        dCentroid < 0.35,
        `centroid drift ${(dCentroid * 100).toFixed(1)}%`,
      );
    }
  }

  /* ============================ 2. distance ============================== */

  if (want('distance')) {
    console.log('\nDistance behaviour');
    // Third person throughout, so this compares like with like: first person is
    // a different listening position, not a distance. Firing your own weapon you
    // stand behind the muzzle and hear less shock front and far more action, and
    // that difference would otherwise be read as a distance effect.
    const steps = [3, 12, 45, 100, 180, 300];
    const far = {};
    for (const d of steps) {
      const m = await render({
        kind: 'shot',
        id: 'rifle',
        distance: d,
        zone: 'street',
        firstPerson: false,
        seed: 4242,
      });
      far[d] = m;
      if (m.ok && (d === 3 || d === 100)) dumpSignal(`shot / rifle / ${d} m / street`, m);
      truthy('distance', `rifle at ${d} m renders`, m.ok, m.error);
    }
    const ok = steps.every((d) => far[d]?.ok);
    if (ok) {
      console.log('    distance  centroid    lo/hi    peak     rms      decay');
      for (const d of steps) {
        const m = far[d];
        console.log(
          `    ${String(d).padStart(5)} m   ${String(m.centroid.toFixed(0)).padStart(6)} Hz  ` +
            `${m.tilt.toFixed(3).padStart(6)}  ${m.peak.toFixed(3)}  ${m.rms.toFixed(5)}  ${m.decay.toFixed(3)}s`,
        );
      }
      // Air absorption: the transient loses treble with range and never regains
      // it. The tolerance covers the plateau past ~100 m, where the crack has
      // gone entirely and what is left is the far-field report, whose spectrum
      // has already collapsed and cannot collapse further.
      let worst = 0;
      for (let i = 1; i < steps.length; i++) {
        const rise = far[steps[i]].centroid / far[steps[i - 1]].centroid;
        if (rise > worst) worst = rise;
      }
      truthy('distance', 'centroid never rises with range', worst <= 1.05, `worst step +${((worst - 1) * 100).toFixed(1)}%`);
      greater('distance', 'distant shot is much darker than close', far[3].centroid, far[100].centroid, 300, ['3 m', '100 m']);
      ratioAtLeast('distance', 'treble loss over 100 m is substantial', far[3].centroid, far[100].centroid, 1.6, ['3 m', '100 m']);
      // The tail takes over: at range the low/high balance tips toward the low.
      ratioAtLeast('distance', 'far shot is low-weighted', far[100].tilt, far[3].tilt, 1.5, ['100 m', '3 m']);
      // It gets quieter overall, and much quieter in the crack's own band.
      greater('distance', 'distance attenuates', far[3].peak, far[300].peak, 0, ['3 m', '300 m']);
      // Close up the treble arrives as a shock front — a rise measured in tens
      // of microseconds. At range there is no front left, only the soft swell of
      // the report, so the same measurement returns a far slower rise.
      ratioAtLeast(
        'distance',
        'the shock front is gone at range',
        far[300].attackHf,
        far[3].attackHf,
        4,
        ['300 m rise', '3 m rise'],
      );
      greater('distance', 'far shot rings on as long as the close crack', far[100].decay, far[3].decay * 0.6, 0, ['100 m decay', '0.6x close']);

      // First person against a far shot, which is the perspective comparison.
      const fp = close.rifle;
      if (fp?.ok) {
        greater('distance', 'first person is brighter than a far shot', fp.centroid, far[100].centroid, 300, ['first person', '100 m']);
        greater('distance', 'first person is louder than a far shot', fp.peak, far[100].peak, 0, ['first person', '100 m']);
      }
    }
  }

  /* =========================== 3. suppression ============================ */

  if (want('suppressed')) {
    console.log('\nSuppressed variants');
    for (const g of ['rifle', 'smg', 'pistol']) {
      const un = await render({ kind: 'shot', id: g, distance: 0, zone: 'street', suppressed: false, seed: 77 });
      const sup = await render({ kind: 'shot', id: g, distance: 0, zone: 'street', suppressed: true, seed: 77 });
      if (!un.ok || !sup.ok) {
        truthy('suppressed', `${g} suppressed pair renders`, false, un.error ?? sup.error);
        continue;
      }
      if (g === 'rifle') dumpSignal('shot / rifle / suppressed / street', sup);
      greater('suppressed', `${g} suppressed is quieter`, un.peak, sup.peak, 0, ['open', 'suppressed']);
      greater('suppressed', `${g} suppressed is darker`, un.centroid, sup.centroid, 0, ['open', 'suppressed']);
      // A suppressor removes the crack; it does not remove the gun.
      inRange('suppressed', `${g} suppressed is still audible`, sup.peak, 0.03, un.peak);
    }
  }

  /* ============================== 4. zones =============================== */

  if (want('zone')) {
    console.log('\nReverb zones');
    const zones = ['outdoor', 'street', 'interior', 'tunnel'];
    const irs = {};
    for (const z of zones) {
      const m = await render({ kind: 'ir', id: z });
      irs[z] = m;
      if (!truthy('zone', `${z} IR renders`, m.ok, m.error)) continue;
      dumpSignal(`impulse response / ${z}`, m);
      // Energy-normalised rather than peak-normalised, so that the convolver is
      // a gain-neutral send whatever the room's decay time. The peak is
      // consequently small; what matters is that it is not zero and not a spike.
      inRange('zone', `${z} IR peak is a room, not a spike`, m.peak, 0.005, 0.36);
      truthy('zone', `${z} IR does not clip`, !m.over, `peak ${fmt(m.peak)}`);
      inRange('zone', `${z} RT60 is a plausible room`, m.rt60, 0.1, 4.0, ' s');
      // The point of energy normalisation: the send level must not depend on how
      // long the room rings.
      inRange('zone', `${z} IR is energy-normalised`, m.rms * Math.sqrt(m.duration * m.sampleRate), 0.5, 2, '');
    }
    if (zones.every((z) => irs[z]?.ok)) {
      console.log('    zone      RT60     centroid   peak     rms');
      for (const z of zones) {
        console.log(
          `    ${z.padEnd(9)} ${irs[z].rt60.toFixed(3)}s  ${String(irs[z].centroid.toFixed(0)).padStart(6)} Hz  ` +
            `${irs[z].peak.toFixed(4)}  ${irs[z].rms.toFixed(5)}`,
        );
      }
      // A tunnel rings longest, a small room shortest; the four must be ordered.
      greater('zone', 'tunnel rings longer than street', irs.tunnel.rt60, irs.street.rt60, 0.1, ['tunnel', 'street']);
      greater('zone', 'street rings longer than interior', irs.street.rt60, irs.interior.rt60, 0.05, ['street', 'interior']);
      greater('zone', 'outdoor rings longer than interior', irs.outdoor.rt60, irs.interior.rt60, 0.05, ['outdoor', 'interior']);
      // A tunnel is muffled as well as long: every bounce eats treble.
      greater('zone', 'interior is brighter than tunnel', irs.interior.centroid, irs.tunnel.centroid, 50, ['interior', 'tunnel']);
      const spread = Math.max(...zones.map((z) => irs[z].rt60)) / Math.min(...zones.map((z) => irs[z].rt60));
      ratioAtLeast('zone', 'the four zones are well separated', spread, 1, 1.8, ['spread', '1']);
    }

    // The tail a gunshot actually gets must follow the room, and it must arrive
    // after the crack rather than with it.
    console.log('\nGunshot tail follows the room');
    const tails = {};
    for (const z of zones) {
      const m = await render({ kind: 'shot', id: 'rifle', distance: 0, zone: z, seed: 31337 });
      tails[z] = m;
      truthy('zone', `rifle in ${z} renders`, m.ok, m.error);
    }
    if (zones.every((z) => tails[z]?.ok)) {
      console.log('    zone      decay     rt60     centroid');
      for (const z of zones) {
        console.log(
          `    ${z.padEnd(9)} ${tails[z].decay.toFixed(3)}s  ${tails[z].rt60.toFixed(3)}s  ${String(tails[z].centroid.toFixed(0)).padStart(6)} Hz`,
        );
      }
      greater('zone', 'shot in a tunnel decays longer than indoors', tails.tunnel.decay, tails.interior.decay, 0.05, ['tunnel', 'interior']);
      greater('zone', 'shot outdoors decays longer than indoors', tails.outdoor.decay, tails.interior.decay, 0.02, ['outdoor', 'interior']);
    }
    // Crack first, echo after: the dry render must be shorter than the wet one.
    const dry = await render({ kind: 'shot', id: 'rifle', distance: 0, zone: 'street', dry: true, seed: 31337 });
    if (dry.ok && tails.street?.ok) {
      dumpSignal('shot / rifle / street / direct path only', dry);
      greater('zone', 'the room adds a tail after the crack', tails.street.decay, dry.decay, 0.02, ['wet', 'dry']);
    }
  }

  /* ============================ 5. footsteps ============================= */

  if (want('surface')) {
    console.log('\nFootsteps per surface');
    const surfaces = ['concrete', 'metal', 'wood', 'sand', 'gravel', 'water'];
    const steps = {};
    for (const s of surfaces) {
      const m = await baked(`step:${s}`, 0);
      steps[s] = m;
      if (!truthy('surface', `step:${s} exists`, m.ok, m.error)) continue;
      inRange('surface', `step:${s} level is sane`, m.peak, 0.05, 1.0);
      truthy('surface', `step:${s} does not clip`, !m.over, `peak ${fmt(m.peak)}`);
      inRange('surface', `step:${s} is a footstep length`, m.duration, 0.02, 1.2, ' s');
    }
    const listed = surfaces.filter((s) => steps[s]?.ok);
    if (listed.length) {
      console.log('    surface    centroid    lo/hi    peak    dur');
      for (const s of listed) {
        console.log(
          `    ${s.padEnd(10)} ${String(steps[s].centroid.toFixed(0)).padStart(6)} Hz  ` +
            `${steps[s].tilt.toFixed(2).padStart(6)}  ${steps[s].peak.toFixed(3)}  ${steps[s].duration.toFixed(3)}s`,
        );
      }
      dumpSignal('footstep / concrete / variant 0', steps.concrete);
      dumpSignal('footstep / gravel / variant 0', steps.gravel);
      // Surfaces have to be told apart by ear, so they must differ numerically.
      for (let i = 0; i < listed.length; i++) {
        for (let j = i + 1; j < listed.length; j++) {
          const a = steps[listed[i]];
          const b = steps[listed[j]];
          const cs = Math.abs(a.centroid - b.centroid) / Math.max(a.centroid, b.centroid);
          const ts = Math.abs(a.tilt - b.tilt) / Math.max(a.tilt, b.tilt);
          truthy(
            'surface',
            `${listed[i]} vs ${listed[j]} differ`,
            cs > 0.06 || ts > 0.12,
            `centroid ${(cs * 100).toFixed(1)}%, lo/hi ${(ts * 100).toFixed(1)}%`,
          );
        }
      }
      // Metal rings; sand does not.
      if (steps.metal && steps.sand) {
        greater('surface', 'metal is brighter than sand', steps.metal.centroid, steps.sand.centroid, 100, ['metal', 'sand']);
      }
    }

    console.log('\nFootstep variants differ from each other');
    const count = info.variants['step:concrete'] ?? 0;
    inRange('surface', 'concrete has several variants', count, 3, 24);
    const vs = [];
    for (let i = 0; i < Math.min(count, 6); i++) vs.push(await baked('step:concrete', i));
    let distinctPairs = 0;
    let pairs = 0;
    for (let i = 0; i < vs.length; i++) {
      for (let j = i + 1; j < vs.length; j++) {
        if (!vs[i].ok || !vs[j].ok) continue;
        pairs++;
        const cs = Math.abs(vs[i].centroid - vs[j].centroid) / Math.max(vs[i].centroid, vs[j].centroid);
        const ps = Math.abs(vs[i].peak - vs[j].peak) / Math.max(vs[i].peak, vs[j].peak);
        const ds = Math.abs(vs[i].duration - vs[j].duration) / Math.max(vs[i].duration, vs[j].duration);
        if (cs > 0.01 || ps > 0.01 || ds > 0.01) distinctPairs++;
      }
    }
    truthy('surface', 'every concrete variant pair is distinct', pairs > 0 && distinctPairs === pairs, `${distinctPairs}/${pairs}`);

    console.log('\nImpacts per surface');
    for (const s of ['concrete', 'metal', 'wood', 'sand', 'glass', 'flesh']) {
      const m = await baked(`impact:${s}`, 0);
      if (!truthy('surface', `impact:${s} exists`, m.ok, m.error)) continue;
      inRange('surface', `impact:${s} level is sane`, m.peak, 0.05, 1.0);
      inRange('surface', `impact:${s} attacks fast`, m.attack * 1000, 0, 12, ' ms');
      if (s === 'metal') {
        dumpSignal('impact / metal / variant 0', m);
        // Modal ringing is the point of a metal ping.
        greater('surface', 'metal impact rings', m.decay, 0.08, 0, ['decay', 'min']);
      }
    }
  }

  /* =========================== 6. the limiter ============================ */

  if (want('limiter')) {
    console.log('\nMaster limiter');
    const one = await render({ kind: 'burst', id: 'blast:grenade', count: 1 });
    const twenty = await render({ kind: 'burst', id: 'blast:grenade', count: 20 });
    const forty = await render({ kind: 'burst', id: 'blast:grenade', count: 40 });
    if (one.ok && twenty.ok && forty.ok) {
      dumpSignal('limiter / 1 grenade at 1.5 m', one);
      dumpSignal('limiter / 20 grenades simultaneous', twenty);
      console.log(
        `    1x  peak ${one.peak.toFixed(4)} rms ${one.rms.toFixed(5)}\n` +
          `    20x peak ${twenty.peak.toFixed(4)} rms ${twenty.rms.toFixed(5)}\n` +
          `    40x peak ${forty.peak.toFixed(4)} rms ${forty.rms.toFixed(5)}`,
      );
      truthy('limiter', 'one explosion does not clip', !one.over, `peak ${fmt(one.peak)}`);
      truthy('limiter', 'twenty simultaneous explosions do not clip', !twenty.over, `peak ${fmt(twenty.peak)}`);
      truthy('limiter', 'forty simultaneous explosions do not clip', !forty.over, `peak ${fmt(forty.peak)}`);
      inRange('limiter', 'twenty explosions stay inside full scale', twenty.peak, 0.3, 1.0);
      // Twenty times the input must not be twenty times the output.
      ratioAtLeast('limiter', 'the limiter is actually compressing', 20, twenty.peak / Math.max(1e-6, one.peak), 4, ['20x input', 'output gain']);
    } else {
      truthy('limiter', 'burst renders', false, one.error ?? twenty.error ?? forty.error);
    }
  }

  /* ============================ 7. everything else ======================== */

  if (want('misc')) {
    console.log('\nInterface, ordnance and ambience');
    const checks = [
      // The signature sound: it has to be a click, so it has to be fast and short.
      ['ui_hitmarker', { peak: [0.15, 1], attack: [0, 3], duration: [0.01, 0.35] }],
      ['ui_hitmarker_head', { peak: [0.15, 1], attack: [0, 3], duration: [0.01, 0.4] }],
      ['ui_kill', { peak: [0.1, 1], duration: [0.05, 1.5] }],
      ['ui_select', { peak: [0.05, 1], duration: [0.01, 0.5] }],
      ['killstreak_earned', { peak: [0.1, 1], duration: [0.1, 3] }],
      ['ui_warning', { peak: [0.1, 1], duration: [0.1, 4] }],
      ['blast:grenade', { peak: [0.4, 1], attack: [0, 8], duration: [0.8, 6] }],
      ['debris', { peak: [0.05, 1], duration: [0.3, 5] }],
      ['whizby:0', { peak: [0.1, 1], attack: [0, 4], duration: [0.01, 0.4] }],
      ['heartbeat', { peak: [0.1, 1], duration: [0.2, 2] }],
      ['tinnitus', { peak: [0.02, 1], duration: [0.3, 6] }],
      ['bolt_cycle', { peak: [0.1, 1], duration: [0.03, 1.2] }],
      ['mag_out', { peak: [0.05, 1], duration: [0.03, 1.5] }],
      ['glass_shatter', { peak: [0.2, 1], duration: [0.2, 4] }],
    ];
    for (const [name, want] of checks) {
      const m = await baked(name, 0);
      if (!truthy('misc', `${name} exists`, m.ok, m.error)) continue;
      if (want.peak) inRange('misc', `${name} peak`, m.peak, want.peak[0], want.peak[1]);
      if (want.attack) inRange('misc', `${name} attack`, m.attack * 1000, want.attack[0], want.attack[1], ' ms');
      if (want.duration) inRange('misc', `${name} duration`, m.duration, want.duration[0], want.duration[1], ' s');
      truthy('misc', `${name} does not clip`, !m.over, `peak ${fmt(m.peak)}`);
    }
    for (const n of ['ui_hitmarker', 'blast:grenade', 'whizby:0', 'heartbeat', 'impact:metal']) {
      dumpSignal(`baked / ${n}`, await baked(n, 0));
    }

    console.log('\nLoops are seamless');
    for (const n of ['amb_wind_low', 'amb_wind_high', 'amb_city', 'jet', 'heli', 'amb_room']) {
      const m = await baked(n, 0);
      if (!m.ok) {
        truthy('misc', `${n} exists`, false, m.error);
        continue;
      }
      truthy('misc', `${n} exists`, true);
      // A crossfaded loop has no edge discontinuity, so the first and last
      // envelope buckets must sit at a similar level.
      const head = m.envelope[0];
      const tail = m.envelope[m.envelope.length - 1];
      inRange('misc', `${n} loop seam is level`, Math.abs(head - tail), 0, 12, ' dB');
      truthy('misc', `${n} does not clip`, !m.over, `peak ${fmt(m.peak)}`);
    }
  }

  /* ======================== 8. the live engine holds ====================== */

  if (want('live')) {
    console.log('\nLive engine under load');
    // Drive the real event bus hard and confirm the voice cap holds, nothing
    // throws, and the engine is still running afterwards.
    const before = await page.evaluate(() => window.__AUDIO__.stats());
    const load = await page.evaluate(async () => {
      const g = window.__GAME__;
      const events = g?.engine?.events;
      const THREE = g?.THREE;
      const out = { emitted: 0, errors: [] };
      if (!events || !THREE) return out;

      // Real payload shapes with real vectors, exactly as the weapon, effects
      // and player systems publish them, so this exercises the same code paths.
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const dir = V(0, 0, -1);
      const surfaces = ['concrete', 'metal', 'wood', 'sand', 'gravel', 'water'];
      const guns = ['rifle', 'smg', 'sniper', 'shotgun', 'pistol'];
      for (let i = 0; i < 240; i++) {
        try {
          const p = V(Math.sin(i * 0.7) * 30, 1.2, Math.cos(i * 0.7) * 30);
          events.emit('weapon:fire', {
            weaponId: guns[i % guns.length],
            origin: p,
            direction: dir,
            ammoLeft: 30 - (i % 30),
            suppressed: i % 7 === 0,
          });
          events.emit('weapon:cycle', { weaponId: guns[i % guns.length] });
          events.emit('enemy:fire', { id: i % 12, origin: p, direction: dir });
          events.emit('player:footstep', {
            surface: surfaces[i % surfaces.length],
            running: true,
            position: p,
          });
          events.emit('fx:whizby', { position: p, distance: (i % 5) * 0.4, speed: 880 });
          events.emit('fx:impact', {
            point: p,
            normal: V(0, 1, 0),
            surface: surfaces[(i + 3) % surfaces.length],
            direction: dir,
            energy: 0.8,
          });
          if (i % 10 === 0) {
            events.emit('fx:explosion', {
              position: p,
              radius: 8,
              damage: 100,
              source: 'grenade',
            });
          }
          out.emitted += 6;
        } catch (err) {
          if (out.errors.length < 5) out.errors.push(String(err));
        }
      }
      await new Promise((r) => setTimeout(r, 250));
      return out;
    });
    truthy('live', 'a firefight of events throws nothing', load.errors.length === 0, load.errors.join('; '));
    greater('live', 'events were accepted', load.emitted, 0, 0, ['emitted', 'zero']);

    const after = await page.evaluate(() => window.__AUDIO__.stats());
    console.log(
      `    voices ${after.voices}/${after.voiceBudget} (spatial cap ${after.spatialBudget}), ` +
        `shot graphs ${after.shotGraphs}, sources ${after.sources}, started ${after.started}, culled ${after.dropped}`,
    );
    truthy('live', 'voice cap is respected', after.voices <= after.voiceBudget, `${after.voices} <= ${after.voiceBudget}`);
    inRange('live', 'voice budget is a sane cap', after.voiceBudget, 16, 128);
    greater('live', 'the engine actually played the load', after.started, before.started, 0, ['after', 'before']);
    truthy('live', 'context survived the load', after.state === 'running', `state=${after.state}`);
    truthy('live', 'no bake failures after load', (after.bakeFailures ?? []).length === 0, JSON.stringify(after.bakeFailures));
    // Under a deliberate flood, culling is the correct behaviour, not an error.
    console.log(`    culling engaged: ${after.dropped - before.dropped} voices declined under flood`);

    console.log('\nZone inference and ducking');
    const zoneProbe = await page.evaluate(async () => {
      const a = window.__GAME__?.engine?.tryGet?.('audio');
      const out = {};
      out.auto = window.__AUDIO__.stats();
      a?.autoReverbZone?.(false);
      a?.setReverbZone?.('tunnel');
      await new Promise((r) => setTimeout(r, 60));
      out.manual = window.__AUDIO__.stats();
      a?.autoReverbZone?.(true);
      await new Promise((r) => setTimeout(r, 60));
      out.back = window.__AUDIO__.stats();
      return out;
    });
    truthy('live', 'manual zone override applies', zoneProbe.manual?.zone === 'tunnel', `zone=${zoneProbe.manual?.zone}`);
    truthy('live', 'automatic inference resumes', zoneProbe.back?.manualZone === false);
    truthy(
      'live',
      'the probe is measuring the world',
      Number.isFinite(zoneProbe.auto?.probe?.openness) && (zoneProbe.auto?.rays ?? 0) > 0,
      `openness=${zoneProbe.auto?.probe?.openness}, rays=${zoneProbe.auto?.rays}`,
    );

    const vol = await page.evaluate(() => {
      const a = window.__GAME__?.engine?.tryGet?.('audio');
      const out = {};
      a?.setMasterVolume?.(0.25);
      out.master = a?.masterVolumeLevel;
      a?.setBusVolume?.('weapons', 0.4);
      out.weapons = a?.busVolume?.('weapons');
      a?.setMasterVolume?.(0.8);
      a?.setBusVolume?.('weapons', 1);
      out.buses = a?.busNames;
      out.ids = a?.soundIds?.length ?? 0;
      out.ready = a?.ready;
      return out;
    });
    inRange('live', 'master volume is respected', vol.master ?? -1, 0.24, 0.26);
    inRange('live', 'bus volume is respected', vol.weapons ?? -1, 0.39, 0.41);
    inRange('live', 'seven buses are exposed', vol.buses?.length ?? 0, 7, 7);
    greater('live', 'sound ids are exposed to the menu', vol.ids, 100, 0, ['ids', 'min']);
    truthy('live', 'IAudio reports ready', vol.ready === true);

    const duck = await page.evaluate(async () => {
      const events = window.__GAME__?.engine?.events;
      const before = window.__AUDIO__.stats();
      events?.emit('audio:duck', { amount: 0.8, duration: 0.5 });
      await new Promise((r) => setTimeout(r, 80));
      return { before, after: window.__AUDIO__.stats() };
    });
    truthy('live', 'ducking does not disturb the engine', duck.after?.state === 'running');

    // Hearing damage: a point-blank blast must engage the ring, and it must
    // recover rather than latch.
    const ring = await page.evaluate(async () => {
      const g = window.__GAME__;
      const engine = g?.engine;
      // The listener tracks the camera, and it is synced in the audio system's
      // own update, so step a frame before measuring a distance to it.
      g?.stepFrames?.(2);
      const c = engine?.camera?.position ?? { x: 0, y: 1.6, z: 0 };
      engine?.events?.emit('fx:explosion', {
        position: new g.THREE.Vector3(c.x, c.y, c.z),
        radius: 12,
        damage: 120,
        source: 'grenade',
      });
      await new Promise((r) => setTimeout(r, 120));
      const peak = window.__AUDIO__.stats();
      for (let i = 0; i < 90; i++) {
        g?.stepFrames?.(1);
        await new Promise((r) => setTimeout(r, 8));
      }
      return { peak, later: window.__AUDIO__.stats() };
    });
    greater('live', 'a point-blank blast causes ringing', ring.peak?.ring ?? 0, 0.05, 0, ['ring', 'min']);
    truthy(
      'live',
      'ringing recovers rather than latching',
      (ring.later?.ring ?? 1) < (ring.peak?.ring ?? 0),
      `${fmt(ring.peak?.ring)} -> ${fmt(ring.later?.ring)}`,
    );
  }

  /* --------------------------------- output -------------------------------- */

  const reportPath = path.join(OPTS.out, 'audio-report.txt');
  const header = [
    'OPERATION BLACKOUT — audio engine measurement report',
    new Date().toISOString(),
    '',
    `sample rate     ${info.sampleRate} Hz`,
    `baked clips     ${bake.clips} (${(bake.bytes / 1048576).toFixed(2)} MB)`,
    `sound ids       ${info.ids.length}`,
    `voice budget    ${live.voiceBudget} (${live.spatialBudget} spatial)`,
    `shot graphs     ${live.shotGraphs}`,
    `eager bake      ${live.bakeEagerMs} ms`,
    `deferred bake   ${live.bakeDeferredMs} ms`,
    '',
    `assertions      ${results.length - failures}/${results.length} passed`,
    '',
  ].join('\n');

  const byGroup = new Map();
  for (const r of results) {
    if (!byGroup.has(r.group)) byGroup.set(r.group, []);
    byGroup.get(r.group).push(r);
  }
  const summary = ['--- assertions by group ---'];
  for (const [g, rows] of byGroup) {
    const bad = rows.filter((r) => !r.ok);
    summary.push(`\n[${g}] ${rows.length - bad.length}/${rows.length}`);
    for (const r of rows) {
      summary.push(`  ${r.ok ? ' ok ' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
    }
  }

  await writeFile(reportPath, `${header}${summary.join('\n')}\n\n--- signal dumps ---\n${dumps.join('\n')}\n`);

  const jsonPath = path.join(OPTS.out, 'audio-report.json');
  await writeFile(
    jsonPath,
    JSON.stringify({ info: { sampleRate: info.sampleRate, ids: info.ids.length }, bake, live, results }, null, 2),
  );

  const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  await browser.close();

  console.log(`\n${results.length - failures}/${results.length} assertions passed`);
  console.log(`Report:  ${reportPath}`);
  console.log(`JSON:    ${jsonPath}`);
  if (errors.length) {
    console.log(`\n${errors.length} console error(s):`);
    for (const e of errors.slice(0, 20)) console.log('   ', e);
  }
  if (failures > 0) {
    console.log('\nFailures:');
    for (const r of results.filter((x) => !x.ok)) console.log(`  [${r.group}] ${r.name} — ${r.detail ?? ''}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
