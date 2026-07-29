/**
 * Scratch diagnostic: do the lighting patch and the material patch coexist?
 *
 * Both owners splice `onBeforeCompile` on the same materials, and the material
 * library assigns rather than composes. This runs each material's chained
 * callback against three's stock physical shader and checks the result carries
 * both patches, then reads the cache keys of the programs actually live on the
 * device to confirm the same holds for what is running.
 *
 *   node tools/.lgt-chain.mjs
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=480,270',
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: 480, height: 270 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 300)));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' || /GLSL|shader|compil/i.test(t)) errors.push(t.slice(0, 500));
});
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose('cafe_window');
  for (let i = 0; i < 20; i++) engine.step(1 / 60);

  const stock = THREE.ShaderLib.physical;
  const rows = [];
  const seen = new Set();
  engine.scene.traverse((o) => {
    if (!o.isMesh || rows.length >= 24) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m || !m.isMeshStandardMaterial || seen.has(m.uuid)) continue;
      seen.add(m.uuid);
      const shader = {
        uniforms: THREE.UniformsUtils.clone(stock.uniforms),
        vertexShader: stock.vertexShader,
        fragmentShader: stock.fragmentShader,
        defines: {},
      };
      let threw = null;
      try {
        m.onBeforeCompile?.call(m, shader, engine.renderer);
      } catch (e) {
        threw = String(e).slice(0, 120);
      }
      const f = shader.fragmentShader;
      const v = shader.vertexShader;
      const defines = Object.keys(shader.defines ?? {});
      rows.push({
        name: (o.name || m.name || m.type).slice(0, 30),
        threw,
        /* Material library markers. */
        mat: defines.some((d) => d.startsWith('MAT_')) || /matSampleAlbedo|vMatWorldPos|matMacro/.test(f),
        wind: /uWindTime/.test(v),
        /* Lighting rig markers. */
        sun: f.includes('lgtSunShadow'),
        sky: f.includes('lgtSkyVisibility'),
        portal: f.includes('lgtPortal'),
        contact: f.includes('lgtContactShadow'),
        csmU: 'uCsmAtlas' in shader.uniforms,
        /* The lighting patch must consume the material patch's diffuse, so the
           call site has to land after the map fetch. The function definition
           legitimately sits earlier, in the pars block, so compare the last
           occurrence against where the albedo is resolved. */
        order:
          f.lastIndexOf('lgtSunShadow') > f.indexOf('#include <lights_fragment_begin>') &&
          f.indexOf('#include <lights_fragment_begin>') > f.indexOf('diffuseColor')
            ? 'after'
            : 'BEFORE',
        defines: defines.filter((d) => d.startsWith('MAT_')).join(','),
        key: (m.customProgramCacheKey ? m.customProgramCacheKey.call(m) : '').slice(0, 70),
      });
    }
  });

  const programs = (engine.renderer.info.programs ?? []).map((p) => p.cacheKey ?? '');
  const both = programs.filter((k) => k.includes('lgt:') && /mat:|pom|wind:|tile/.test(k)).length;
  const lgtOnly = programs.filter((k) => k.includes('lgt:')).length;

  return {
    rows,
    programs: programs.length,
    lgtOnly,
    both,
    sampleKeys: programs.filter((k) => k.includes('lgt:')).slice(0, 4),
  };
});

const pad = (v, n) => String(v).padEnd(n);
console.log(pad('material', 30) + pad('mat', 5) + pad('wind', 6) + pad('sun', 5) + pad('sky', 5) + pad('portal', 8) + pad('contact', 9) + pad('csmU', 6) + pad('order', 7) + 'MAT defines');
let bad = 0;
for (const r of out.rows) {
  if (!r.sun || !r.csmU || r.order !== 'after' || r.threw) bad++;
  console.log(
    pad(r.name, 30) + pad(r.mat ? 'yes' : '-', 5) + pad(r.wind ? 'yes' : '-', 6) +
    pad(r.sun ? 'yes' : 'NO', 5) + pad(r.sky ? 'yes' : '-', 5) + pad(r.portal ? 'yes' : '-', 8) +
    pad(r.contact ? 'yes' : '-', 9) + pad(r.csmU ? 'yes' : 'NO', 6) + pad(r.order, 7) +
    (r.threw ? 'THREW ' + r.threw : r.defines),
  );
}
console.log(`\n${out.rows.length} materials checked, ${bad} broken`);
console.log(`live programs ${out.programs}, carrying the lighting key ${out.lgtOnly}, carrying both keys ${out.both}`);
for (const k of out.sampleKeys) console.log('  key: ' + k.slice(-110));
console.log('\n--- errors ---');
console.log(errors.length ? errors.slice(0, 8).join('\n') : '(none)');
await browser.close();
