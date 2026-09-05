#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// Why does the mid distance read as a wash?
//
//   node tools/mipprobe.mjs
//
// Three measurements that together decide whether "the atlas averages out under
// minification" is the real mechanism or a plausible story:
//
//   1. Atlas cell contrast against mip level. A cell is box-downsampled the way
//      the GPU builds its mips, and the luma standard deviation of what survives
//      the alpha cutoff is reported at each level. If the painted contrast is
//      needle-scale it collapses; if it is clump-scale it holds.
//   2. The aShade attribute's actual distribution over a real crown, which is
//      the term that survives minification perfectly because it is interpolated
//      geometry rather than sampled texture.
//   3. Card size in screen pixels at a range of distances, so "one card is about
//      13 px at 10-30 m" is a number rather than an impression.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5181/?quality=fast') + '&capture=1';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 512, height: 288 } });
page.on('pageerror', (e) => console.error('[mipprobe] page error:', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });

const out = await page.evaluate(async () => {
  const lines = [];
  const nature = await import('/src/textures/nature.js');

  // --- 1. atlas contrast against mip level --------------------------------
  const tex = nature.needleAtlas();
  const img = tex.image;
  // canvasTexture hands back a canvas, pixelTexture a {data,width,height}
  let full;
  if (img.data) {
    full = { data: img.data, width: img.width, height: img.height };
  } else {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    full = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  }
  const half = img.width / 2;
  lines.push(`needleAtlas ${img.width}x${img.height}, cell ${half}px`);
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2) * half;
    const oy = (cell < 2 ? 0 : 1) * half;
    // start from premultiplied-by-coverage luma so the cutoff does not have to
    // be re-decided at every level: a mip of an alpha-tested card is what the
    // GPU shows, and its holes count as background, not as absent samples
    let lum = [];
    let cov = [];
    for (let y = 0; y < half; y++) {
      for (let x = 0; x < half; x++) {
        const i = ((oy + y) * full.width + ox + x) * 4;
        const a = full.data[i + 3] / 255;
        lum.push(((0.2126 * full.data[i] + 0.7152 * full.data[i + 1] + 0.0722 * full.data[i + 2]) / 255) * a);
        cov.push(a);
      }
    }
    let n = half;
    const row = [];
    for (let level = 0; level <= 5; level++) {
      // sd over covered texels only, which is the contrast the eye sees
      let s = 0;
      let s2 = 0;
      let w = 0;
      for (let i = 0; i < n * n; i++) {
        if (cov[i] < 0.04) continue;
        const v = lum[i] / cov[i];
        s += v;
        s2 += v * v;
        w++;
      }
      const mean = w ? s / w : 0;
      const sd = w ? Math.sqrt(Math.max(0, s2 / w - mean * mean)) : 0;
      row.push(`L${level} ${n}px sd ${sd.toFixed(3)} mean ${mean.toFixed(3)}`);
      if (level === 5) break;
      const m = n >> 1;
      const nl = new Array(m * m);
      const nc = new Array(m * m);
      for (let y = 0; y < m; y++) {
        for (let x = 0; x < m; x++) {
          const a = (y * 2) * n + x * 2;
          const b = a + 1;
          const d = a + n;
          const e = d + 1;
          nl[y * m + x] = (lum[a] + lum[b] + lum[d] + lum[e]) / 4;
          nc[y * m + x] = (cov[a] + cov[b] + cov[d] + cov[e]) / 4;
        }
      }
      lum = nl;
      cov = nc;
      n = m;
    }
    lines.push(`  cell ${cell}: ${row.join('  ')}`);
  }

  // --- 2. aShade distribution over real crowns ----------------------------
  const { scene, camera, renderer } = window.debugAPI.objects;
  const seen = new Map();
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.aShade) return;
    if (!/foliage/.test(o.name)) return;
    const key = o.name.replace(/\d+$/, '');
    if (seen.has(key)) return;
    const a = o.geometry.attributes.aShade.array;
    const v = Array.from(a).sort((p, q) => p - q);
    const q = (t) => v[Math.floor((v.length - 1) * t)];
    seen.set(key, `  ${o.name.padEnd(24)} n ${String(v.length).padStart(6)}  p02 ${q(0.02).toFixed(2)} p25 ${q(0.25).toFixed(2)} p50 ${q(0.5).toFixed(2)} p75 ${q(0.75).toFixed(2)} p98 ${q(0.98).toFixed(2)}`);
  });
  lines.push('aShade over crown geometry (0 = lit rim, 1 = buried):');
  for (const s of seen.values()) lines.push(s);

  // --- 3. card size on screen against distance ----------------------------
  // one card's world size, taken off a real crown's triangle spacing
  const fovR = (camera.fov * Math.PI) / 180;
  const px = renderer.domElement.height || 288;
  lines.push(`card screen size (fov ${camera.fov.toFixed(0)}, ${px}px tall render; scale to your capture height):`);
  for (const cardW of [0.9, 1.4]) {
    const row = [10, 20, 30, 60].map((d) => `${d}m ${((cardW / (2 * d * Math.tan(fovR / 2))) * px).toFixed(1)}px`);
    lines.push(`  ${cardW} m card: ${row.join('  ')}`);
  }
  return lines;
});

console.log(out.join('\n'));
await browser.close();
