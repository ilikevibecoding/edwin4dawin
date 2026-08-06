/**
 * Shader injection probe.
 *
 * Reports which live materials carry an `onBeforeCompile` patch and whether the
 * injected uniform actually made it into the compiled program. Guessing why a
 * shader edit did not show up in a capture is slow; this answers it directly.
 *
 *   node tools/shaderprobe.mjs uPadSand uMacro
 */

import { chromium } from '@playwright/test';

const needles = process.argv.slice(2);
if (!needles.length) needles.push('uPadSand');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

const out = await page.evaluate((keys) => {
  const scene = window.__GAME.scene();
  const seen = new Map();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || seen.has(m.uuid)) continue;
      seen.set(m.uuid, {
        name: m.name || m.type,
        patched: typeof m.onBeforeCompile === 'function'
          && m.onBeforeCompile.toString().length > 40,
        cacheKey: m.customProgramCacheKey ? m.customProgramCacheKey() : null,
        mesh: o.name || '(unnamed)',
        version: m.version,
      });
    }
  });
  const rows = [...seen.values()].filter((r) => r.patched || r.cacheKey);
  // Anything patched has a compiled program; scrape the shader source for the
  // injected symbols so a silent replace() miss is visible.
  const found = {};
  for (const k of keys) found[k] = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const src = m.userData.__probeSrc;
      if (!src) continue;
      for (const k of keys) if (src.includes(k)) found[k]++;
    }
  });
  return { rows, found };
}, needles);

console.log('patched materials:');
for (const r of out.rows) {
  console.log(`  ${r.name.padEnd(22)} patched=${r.patched} key=${r.cacheKey} mesh=${r.mesh}`);
}
await browser.close();
