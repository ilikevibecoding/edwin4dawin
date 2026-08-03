#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// Time-of-day round trip.
//
//   node tools/roundtrip.mjs --url http://127.0.0.1:5391/?quality=ultra
//
// Snapshots every light, the fog, the post uniforms and every material the
// hour-walk touches, cycles day -> dusk -> night -> day, and diffs the two day
// snapshots. Anything that does not come back is a value that accumulated
// rather than being set, which is the failure mode of a retune that multiplies
// instead of assigning.
//
// Renders nothing, so it costs one boot.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5391/?quality=ultra');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';
const order = arg('order', 'dusk,night,day').split(',');
// Values that move because the truck is driving and the clock is running, not
// because the hour changed. The headlamp beams are rebuilt from the lamps every
// frame and hold whatever the last lit frame left when they are switched off.
// `uBeamPos`/`uBeamDir` are the mote field's copy of the headlamp world pose,
// which tracks a truck that is still driving; `--control` shows the same values
// moving with the hour untouched. `uBeamCos` is deliberately *not* skipped —
// the cone angle is fixed, so it is the one beam value a real bug would move.
const skip = new RegExp(
  arg(
    'skip',
    '\\.u\\.uTime$|\\.pos$|:headlightBeam\\.|\\.u\\.uCenter$|\\.u\\.uWheel|\\.u\\.uTrack|\\.u\\.uBeamPos$|\\.u\\.uBeamDir$',
  ),
);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.stack || e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });

const snapshot = () =>
  page.evaluate(() => {
    const { scene, renderer, post } = window.debugAPI.objects;
    const out = {};
    const r = (v) => (typeof v === 'number' ? +v.toFixed(6) : v);
    let li = 0;
    let mi = 0;
    const seen = new Set();
    scene.traverse((o) => {
      if (o.isLight) {
        const k = `light${li++}:${o.type}`;
        out[`${k}.intensity`] = r(o.intensity);
        out[`${k}.color`] = o.color?.getHexString();
        out[`${k}.pos`] = [o.position.x, o.position.y, o.position.z].map(r).join(',');
        if (o.groundColor) out[`${k}.ground`] = o.groundColor.getHexString();
        if (o.shadow) {
          out[`${k}.bias`] = r(o.shadow.bias);
          out[`${k}.normalBias`] = r(o.shadow.normalBias);
          out[`${k}.radius`] = r(o.shadow.radius);
          out[`${k}.shadowIntensity`] = r(o.shadow.intensity);
        }
        if (o.angle !== undefined) out[`${k}.angle`] = r(o.angle);
      }
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        if (!m || seen.has(m.uuid)) continue;
        seen.add(m.uuid);
        const k = `mat${mi++}:${m.name || m.type}`;
        if (m.envMapIntensity !== undefined) out[`${k}.env`] = r(m.envMapIntensity);
        if (m.emissiveIntensity !== undefined) out[`${k}.emissive`] = r(m.emissiveIntensity);
        if (m.color) out[`${k}.color`] = m.color.getHexString();
        if (m.emissive) out[`${k}.emissiveCol`] = m.emissive.getHexString();
        if (m.opacity !== undefined) out[`${k}.opacity`] = r(m.opacity);
        if (m.uniforms) {
          for (const [un, u] of Object.entries(m.uniforms)) {
            const v = u && u.value;
            if (typeof v === 'number') out[`${k}.u.${un}`] = r(v);
            else if (v && v.isColor) out[`${k}.u.${un}`] = v.getHexString();
            else if (v && v.isVector3) out[`${k}.u.${un}`] = [v.x, v.y, v.z].map(r).join(',');
          }
        }
      }
    });
    out['scene.envIntensity'] = r(scene.environmentIntensity);
    out['scene.fogDensity'] = r(scene.fog?.density);
    out['scene.fogColor'] = scene.fog?.color.getHexString();
    out['renderer.exposure'] = r(renderer.toneMappingExposure);
    for (const [name, p] of Object.entries(post.passes)) {
      if (!p) continue;
      if (p.strength !== undefined) out[`post.${name}.strength`] = r(p.strength);
      if (p.radius !== undefined) out[`post.${name}.radius`] = r(p.radius);
      if (p.threshold !== undefined) out[`post.${name}.threshold`] = r(p.threshold);
      if (p.blendIntensity !== undefined) out[`post.${name}.blend`] = r(p.blendIntensity);
      const u = p.uniforms || p.material?.uniforms;
      if (u) {
        for (const [un, uu] of Object.entries(u)) {
          const v = uu && uu.value;
          if (typeof v === 'number') out[`post.${name}.${un}`] = r(v);
          else if (v && v.isVector3) out[`post.${name}.${un}`] = [v.x, v.y, v.z].map(r).join(',');
        }
      }
    }
    return out;
  });

// Several uniforms are pushed by the main loop rather than by the hour change
// — the mote field takes the headlamp cone from the beam rig every frame — so
// both snapshots are taken after the app has actually run.
const settle = Number(arg('settle', '3'));
const run = (n) =>
  page.evaluate(
    (k) =>
      new Promise((res) => {
        let i = 0;
        const step = () => (++i >= k ? res(i) : requestAnimationFrame(step));
        requestAnimationFrame(step);
      }),
    n,
  );

// `--prime` walks the hours once before the first snapshot. A value that is
// written the first time some state is reached — the mote field's beam cone is
// only pushed once the headlamps have been on — differs across an unprimed
// round trip without anything having accumulated. Priming latches those, so
// what a primed run reports is accumulation only.
if (argv.includes('--prime')) {
  for (const t of order) {
    await page.evaluate((n) => window.debugAPI.setTimeOfDay(n), t);
    await run(settle);
  }
  console.log(`primed: ${order.join(' -> ')}`);
}

await run(settle);
const before = await snapshot();
console.log(`snapshot: ${Object.keys(before).length} values at day`);
// `--control` runs the same number of frames without touching the hour. Any
// value that moves here moves because the truck is driving or the clock is
// running, so it cannot be evidence of an hour-walk bug.
const control = argv.includes('--control');
for (const t of order) {
  if (!control) await page.evaluate((n) => window.debugAPI.setTimeOfDay(n), t);
  await run(settle);
  console.log(control ? `  (control: ${settle} frames, hour unchanged)` : `  -> ${t}`);
}
const after = await snapshot();

const keys = new Set([...Object.keys(before), ...Object.keys(after)].filter((k) => !skip.test(k)));
const drift = [];
for (const k of keys) {
  const a = before[k];
  const b = after[k];
  if (a === b) continue;
  if (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6) continue;
  drift.push({ key: k, before: a, after: b });
}
if (!drift.length) {
  console.log(`ROUND TRIP EXACT: all ${keys.size} values identical after day -> ${order.join(' -> ')}`);
} else {
  console.log(`ROUND TRIP DRIFT: ${drift.length} of ${keys.size} values changed`);
  for (const d of drift.slice(0, 60)) console.log(`  ${d.key}: ${d.before}  ->  ${d.after}`);
  if (drift.length > 60) console.log(`  ... ${drift.length - 60} more`);
}
await browser.close();
process.exit(drift.length ? 1 : 0);
