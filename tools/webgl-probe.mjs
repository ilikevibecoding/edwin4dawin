import { chromium } from '@playwright/test';

const args = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--enable-webgl',
];

const browser = await chromium.launch({ args });
const page = await browser.newPage();
await page.setContent('<canvas id=c width=64 height=64></canvas>');
const info = await page.evaluate(() => {
  const c = document.getElementById('c');
  const gl = c.getContext('webgl2');
  if (!gl) return { ok: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    ok: true,
    version: gl.getParameter(gl.VERSION),
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    float: !!gl.getExtension('EXT_color_buffer_float'),
    aniso: !!gl.getExtension('EXT_texture_filter_anisotropic'),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
