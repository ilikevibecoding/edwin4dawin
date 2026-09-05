// Rubric 5 measurements through CDP (see docs/rubrics/05_render_quality.md). One page, presets switched live so
// every number is taken from the identical scene (sky paused, same chunks, same NPC poses):
//   luminance  mean luminance of the WebGL frame (game.pipeline.readback(), no HUD) per preset, the ratio to the
//              Light preset (= the pre-rubric shaders), and a bisection of the day exposure that matches it
//   bloom      criterion 4 guard: pixels outside the (dilated) bloom source regions that change by > 8/255 when
//              bloom is toggled, as a share of those pixels
//   memory     renderer.info.memory + render target bytes per preset
//   node scripts/render-measure.mjs --base http://localhost:5207 --out bench/r1_measure.json [--view "x=-8&z=2&yaw=-70"]
//              [--times 0.5,0.35,0.65] [--calibrate 1] [--dilate 24]
import { launchPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const base = args.base || 'http://localhost:5207';
const view = args.view || 'x=-8&z=2&yaw=-70';
const times = String(args.times || '0.5,0.35,0.65').split(',').map(Number);
const out = args.out || 'bench/r1_measure.json';
const dilate = parseInt(args.dilate || '24', 10);
const calibrate = args.calibrate !== '0';
const settleMs = parseInt(args.settle || '6000', 10);

// Installed in the page: frame statistics on the readback (RGBA8, bottom-up rows).
const HELPERS = `
window.__rm = {
  stats(rb) {
    const { width: w, height: h, data } = rb;
    let sum = 0, sumLow = 0, nLow = 0, sumTop = 0, nTop = 0, sumPatch = 0, nPatch = 0;
    const lowRows = Math.floor(h * 0.6);   // bottom 60% (mostly terrain and buildings)
    const topRows = Math.floor(h * 0.75);  // top 25% (mostly sky)
    // ground patch: bottom-centre-left of the frame (flat sunlit street in the town view), away from the hand
    const px0 = Math.floor(w * 0.30), px1 = Math.floor(w * 0.50), py0 = Math.floor(h * 0.22), py1 = Math.floor(h * 0.40);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const l = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) / 255;
      sum += l;
      if (y < lowRows) { sumLow += l; nLow++; }
      if (y >= topRows) { sumTop += l; nTop++; }
      if (x >= px0 && x < px1 && y >= py0 && y < py1) { sumPatch += l; nPatch++; }
    }
    return { mean: sum / (w * h), meanLower: sumLow / nLow, meanSky: sumTop / nTop, meanGround: sumPatch / nPatch, width: w, height: h };
  },
  dilate(mask, w, h, r) {
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h), pre = new Int32Array(Math.max(w, h) + 1);
    for (let y = 0; y < h; y++) {
      pre[0] = 0; for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + mask[y * w + x];
      for (let x = 0; x < w; x++) { const a = Math.max(0, x - r), b = Math.min(w, x + r + 1); tmp[y * w + x] = pre[b] - pre[a] > 0 ? 1 : 0; }
    }
    for (let x = 0; x < w; x++) {
      pre[0] = 0; for (let y = 0; y < h; y++) pre[y + 1] = pre[y] + tmp[y * w + x];
      for (let y = 0; y < h; y++) { const a = Math.max(0, y - r), b = Math.min(h, y + r + 1); out[y * w + x] = pre[b] - pre[a] > 0 ? 1 : 0; }
    }
    return out;
  },
  async preset(name) {
    for (let i = 0; i < 50 && !(window.game && game.pipeline); i++) await new Promise((r) => setTimeout(r, 200));
    game.pipeline.setQuality(name);   // same render distance for every preset (identical chunk set)
    await new Promise((r) => setTimeout(r, 1200));   // let the recompiled shaders render a couple of frames
    return game.quality;
  },
  luminance() { return this.stats(game.pipeline.readback()); },
  bloomGuard(r) {
    const post = game.pipeline.post;
    const wasBloom = post.bloomEnabled;
    post.bloomEnabled = true; post.debugView = 'sources';
    const src = game.pipeline.readback();
    post.debugView = null;
    post.bloomEnabled = false; const off = game.pipeline.readback();
    post.bloomEnabled = true; const on = game.pipeline.readback();
    post.bloomEnabled = wasBloom;
    const { width: w, height: h } = src;
    const mask = new Uint8Array(w * h);
    let sources = 0;
    for (let i = 0; i < w * h; i++) if (src.data[i * 4] > 127) { mask[i] = 1; sources++; }
    const region = this.dilate(mask, w, h, r);
    let inside = 0, outside = 0, changedIn = 0, changedOut = 0, maxOut = 0, maxIn = 0;
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const d = Math.max(Math.abs(on.data[o] - off.data[o]), Math.abs(on.data[o + 1] - off.data[o + 1]), Math.abs(on.data[o + 2] - off.data[o + 2]));
      if (region[i]) { inside++; if (d > 8) changedIn++; if (d > maxIn) maxIn = d; }
      else { outside++; if (d > 8) changedOut++; if (d > maxOut) maxOut = d; }
    }
    return { width: w, height: h, dilateRadius: r, sourcePixels: sources, regionPixels: inside, outsidePixels: outside,
      changedOutside: changedOut, changedOutsidePct: +(100 * changedOut / Math.max(1, outside)).toFixed(3), maxDiffOutside: maxOut,
      changedInside: changedIn, maxDiffInside: maxIn, threshold: post.bloomThreshold, cap: post.bloomCap, strength: post.bloomStrength };
  },
  memory() {
    const p = game.pipeline, r = game.renderer;
    return { quality: game.quality, info: { ...r.info.memory, programs: r.info.programs ? r.info.programs.length : null },
      pipelineMB: +(p.memoryBytes() / 1048576).toFixed(2), shadowsMB: +(p.shadows.memoryBytes() / 1048576).toFixed(2),
      postMB: +((p.enabled ? p.post.memoryBytes() : 0) / 1048576).toFixed(2), cascades: p.shadows.count, shadowRes: p.shadows.size,
      drawCalls: r.info.render.calls, shadowDraws: { ...p.stats } };
  },
};
'ok'`;

const report = { date: new Date().toISOString(), base, view, times, presets: {}, calibration: null, bloomGuard: null, memory: {} };
const log = (...a) => console.log(...a);

for (const t of times) {
  const url = `${base}/?${view}&time=${t}&quality=cinematic`;
  const page = await launchPage(url, { width: 1280, height: 800 });
  try {
    await page.waitForGame();
    await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
    await page.sleep(settleMs);
    await page.evaluate(HELPERS);
    await page.evaluate('game.sky.paused = true; "paused"');
    const entry = { time: t, url, luminance: {} };
    for (const preset of ['light', 'balanced', 'cinematic']) {
      await page.evaluate(`__rm.preset(${JSON.stringify(preset)})`);
      const s = JSON.parse(await page.evaluate('JSON.stringify(__rm.luminance())'));
      entry.luminance[preset] = s;
      if (t === times[0]) report.memory[preset] = JSON.parse(await page.evaluate('JSON.stringify(__rm.memory())'));
      log(`t=${t} ${preset.padEnd(9)} mean ${s.mean.toFixed(4)}  lower60 ${s.meanLower.toFixed(4)}  sky25 ${s.meanSky.toFixed(4)}  ground ${s.meanGround.toFixed(4)}`);
    }
    const ref = entry.luminance.light;
    for (const preset of ['balanced', 'cinematic']) {
      const s = entry.luminance[preset];
      s.ratio = +(s.mean / ref.mean).toFixed(4); s.ratioLower = +(s.meanLower / ref.meanLower).toFixed(4);
      s.ratioSky = +(s.meanSky / ref.meanSky).toFixed(4); s.ratioGround = +(s.meanGround / ref.meanGround).toFixed(4);
      log(`t=${t} ${preset.padEnd(9)} ratio vs light ${s.ratio} (lower60 ${s.ratioLower}, sky ${s.ratioSky}, ground ${s.ratioGround})`);
    }
    if (calibrate && t === times[0]) {
      // bisection of the day exposure so the cinematic frame's mean luminance matches the pre-rubric look
      let lo = 0.35, hi = 1.8, best = null;
      for (let i = 0; i < 9; i++) {
        const e = (lo + hi) / 2;
        const s = JSON.parse(await page.evaluate(`game.pipeline.dayExposure = ${e}; JSON.stringify(__rm.luminance())`));
        best = { exposure: +e.toFixed(4), mean: s.mean, ratio: +(s.mean / ref.mean).toFixed(4), ratioGround: +(s.meanGround / ref.meanGround).toFixed(4), ratioSky: +(s.meanSky / ref.meanSky).toFixed(4) };
        if (s.mean > ref.mean) hi = e; else lo = e;
      }
      report.calibration = { at: t, target: ref.mean, ...best };
      log(`calibrated day exposure ${best.exposure} -> ratio ${best.ratio} (ground ${best.ratioGround}, sky ${best.ratioSky})`);
      const g = JSON.parse(await page.evaluate(`JSON.stringify(__rm.bloomGuard(${dilate}))`));
      report.bloomGuard = { at: t, exposure: best.exposure, ...g };
      log(`bloom guard: ${g.changedOutside} / ${g.outsidePixels} px outside regions changed > 8/255 = ${g.changedOutsidePct}% (max ${g.maxDiffOutside}); sources ${g.sourcePixels} px, region ${g.regionPixels} px`);
    } else if (t === times[0]) {
      const g = JSON.parse(await page.evaluate(`JSON.stringify(__rm.bloomGuard(${dilate}))`));
      report.bloomGuard = { at: t, ...g };
      log(`bloom guard: ${g.changedOutsidePct}% outside changed (max ${g.maxDiffOutside})`);
    }
    entry.exceptions = page.exceptions.slice(0, 5);
    entry.consoleWarnings = page.consoleLines.filter((l) => /warn|error|THREE\./i.test(l) && !l.includes('[coruscant]')).slice(0, 10);
    report.presets[t] = entry;
  } catch (e) {
    log(`t=${t} FAILED ${e.message}`);
    report.presets[t] = { time: t, url, error: e.message, exceptions: page.exceptions.slice(0, 5) };
  } finally { page.close(); }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2));
log(`report: ${out}`);
process.exit(0);
