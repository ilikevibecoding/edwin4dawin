#!/usr/bin/env node
/**
 * Reports the mean linear albedo of each baked material.
 *
 * Every merged surface in the level is tinted by a vertex-colour multiply, so
 * choosing a tint means solving `tint = target / albedo` — and the albedo of a
 * procedurally baked map is not something you can read off the shader source,
 * because it is a weighted mixture of four or five sub-materials whose coverage
 * is decided by noise thresholds. Guessing it cost several rounds of captures,
 * each of which came back the wrong colour for a different reason.
 *
 * So: read the actual baked texture back off the GPU and report the numbers.
 * `mean` is what a tint multiplies. `p10`/`p90` bracket the value swing, which
 * is what decides whether a surface will read as a material or as speckle. Both
 * are linear, matching the space vertex colours are applied in.
 *
 * Usage: world-albedo.mjs [--mats metal_rusted,brick,...]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const wanted = arg('mats', '');

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=320,180',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
await page.goto('http://127.0.0.1:5173/?capture=1&quality=low', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });

const rows = await page.evaluate((matList) => {
  const THREE = window.__GAME__.THREE;
  const engine = window.__GAME__.engine;
  const lib = engine.get('materials');
  const renderer = engine.renderer;
  const names = matList ? matList.split(',') : lib.names;

  /*
   * The baked maps live in render targets, so the only route to their contents
   * is to draw them and read the framebuffer back.
   *
   * Doing that through a hand-written shader is a trap: whether `texture2D`
   * returns encoded or decoded values depends on the internal format three chose
   * when it allocated the target, which is not visible from here, so the numbers
   * come back either right or squared and there is no way to tell which. Drawing
   * with a `MeshBasicMaterial` instead puts three's own colour management on both
   * ends — it decodes according to `map.colorSpace` and re-encodes to the
   * target's — so the readback is sRGB by construction whatever the source was.
   * The output stays 8-bit sRGB rather than linear because these albedos run as
   * low as one per cent and a linear byte would quantise them to nothing.
   */
  const SIZE = 64;
  const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { type: THREE.UnsignedByteType });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.MeshBasicMaterial({ map: null, toneMapped: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(quad);
  const buf = new Uint8Array(SIZE * SIZE * 4);
  const prevTarget = renderer.getRenderTarget();
  const prevToneMapping = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;

  const toLinear = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const out = [];
  for (const name of names) {
    let map;
    try {
      map = lib.textures(name).map;
    } catch {
      continue;
    }
    if (!map) continue;
    mat.map = map;
    mat.needsUpdate = true;
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, buf);
    const sum = [0, 0, 0];
    const lumas = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const r = toLinear(buf[i * 4]);
      const g = toLinear(buf[i * 4 + 1]);
      const b = toLinear(buf[i * 4 + 2]);
      sum[0] += r; sum[1] += g; sum[2] += b;
      lumas.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
    const n = SIZE * SIZE;
    lumas.sort((a, b) => a - b);
    out.push({
      name,
      space: map.colorSpace,
      mean: sum.map((v) => +(v / n).toFixed(4)),
      luma: +(lumas.reduce((a, b) => a + b, 0) / n).toFixed(4),
      p10: +lumas[Math.floor(n * 0.1)].toFixed(4),
      p90: +lumas[Math.floor(n * 0.9)].toFixed(4),
    });
  }
  renderer.setRenderTarget(prevTarget);
  renderer.toneMapping = prevToneMapping;
  return out;
}, wanted);

const pad = (s, n) => String(s).padEnd(n);
const srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
console.log(`${pad('material', 18)} ${pad('mean linear RGB', 24)} ${pad('luma', 7)} ${pad('sRGB', 7)} ${pad('p10', 7)} ${pad('p90', 7)} swing`);
for (const r of rows) {
  const rgb = `(${r.mean.map((v) => v.toFixed(3)).join(', ')})`;
  const swing = (r.p90 / Math.max(1e-4, r.p10)).toFixed(1);
  console.log(
    `${pad(r.name, 18)} ${pad(rgb, 24)} ${pad(r.luma.toFixed(3), 7)} `
    + `${pad(srgb(r.luma).toFixed(3), 7)} ${pad(r.p10.toFixed(3), 7)} ${pad(r.p90.toFixed(3), 7)} ${swing}x`,
  );
}
await browser.close();
