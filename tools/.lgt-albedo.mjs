/**
 * Scratch diagnostic: what albedo the bake reads for each merged surface.
 *
 *   node tools/.lgt-albedo.mjs
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
    '--window-size=320,180',
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 200)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  const renderer = engine.renderer;
  const r3 = (v) => Math.round(v * 1000) / 1000;

  /* Same readback the bake does, reimplemented here so it can be inspected. */
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const RES = 16;
  const rt = new THREE.WebGLRenderTarget(RES, RES, {
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    depthBuffer: false, stencilBuffer: false,
  });
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }',
      fragmentShader: 'uniform sampler2D tMap; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tMap, vUv).rgb, 1.0); }',
      depthTest: false, depthWrite: false,
    }),
  );
  scene.add(quad);
  const px = new Uint8Array(RES * RES * 4);
  const toLin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };

  function meanTexture(tex) {
    quad.material.uniforms.tMap.value = tex;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, RES, RES, px);
    renderer.setRenderTarget(prev);
    let r = 0, gg = 0, b = 0, raw = 0;
    const n = RES * RES;
    const srgb = tex.colorSpace === THREE.SRGBColorSpace;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      raw += px[o];
      r += srgb ? toLin(px[o]) : px[o] / 255;
      gg += srgb ? toLin(px[o + 1]) : px[o + 1] / 255;
      b += srgb ? toLin(px[o + 2]) : px[o + 2] / 255;
    }
    return { rgb: [r / n, gg / n, b / n], rawR: raw / n, srgb };
  }

  const rows = [];
  const seen = new Set();
  engine.scene.traverse((o) => {
    if (!o.isMesh || rows.length > 22) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || seen.has(m.uuid)) return;
    seen.add(m.uuid);
    const hasMap = !!m.map;
    const mean = hasMap ? meanTexture(m.map) : null;
    const attr = o.geometry?.getAttribute('color');
    let vc = null;
    if (attr) {
      let r = 0, gg = 0, b = 0, taken = 0;
      const stride = Math.max(1, Math.floor(attr.count / 2048));
      for (let i = 0; i < attr.count; i += stride) {
        r += attr.getX(i); gg += attr.getY(i); b += attr.getZ(i); taken++;
      }
      vc = [r / taken, gg / taken, b / taken];
    }
    rows.push({
      name: o.name || m.name || m.type,
      matColor: m.color ? [m.color.r, m.color.g, m.color.b].map(r3) : null,
      hasMap,
      mapColorSpace: m.map ? m.map.colorSpace : '-',
      mapName: m.map ? m.map.name : '-',
      mean: mean ? mean.rgb.map(r3) : null,
      rawR: mean ? Math.round(mean.rawR) : null,
      vertexColor: vc ? vc.map(r3) : null,
      vertexColorType: attr ? `${attr.array.constructor.name} norm=${attr.normalized}` : '-',
    });
  });
  return rows;
});

const pad = (v, n) => String(v).padEnd(n);
console.log(pad('mesh', 34) + pad('mat.color', 20) + pad('map mean (linear)', 22) + pad('rawR', 6) + pad('cs', 10) + 'vertex colour');
for (const r of out) {
  console.log(
    pad(r.name.slice(0, 33), 34) +
    pad(r.matColor ? r.matColor.join(',') : '-', 20) +
    pad(r.mean ? r.mean.join(',') : 'NO MAP', 22) +
    pad(r.rawR ?? '-', 6) +
    pad(r.mapColorSpace, 10) +
    (r.vertexColor ? `${r.vertexColor.join(',')}  [${r.vertexColorType}]` : '-'),
  );
}
await browser.close();
