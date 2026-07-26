import { chromium } from 'playwright';

const args = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--no-sandbox',
];

const browser = await chromium.launch({ headless: true, args });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.setContent('<canvas id="c" width="640" height="360"></canvas>');
const info = await page.evaluate(() => {
  const c = document.getElementById('c');
  const gl = c.getContext('webgl2');
  if (!gl) return { ok: false, reason: 'no webgl2 context' };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  gl.clearColor(0.2, 0.6, 0.9, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const px = new Uint8Array(4);
  gl.readPixels(10, 10, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return {
    ok: true,
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    pixel: Array.from(px),
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    colorBufferFloat: !!gl.getExtension('EXT_color_buffer_float'),
    texFloatLinear: !!gl.getExtension('OES_texture_float_linear'),
    anisotropy: !!gl.getExtension('EXT_texture_filter_anisotropic'),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
