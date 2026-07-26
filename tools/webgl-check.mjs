// Environment probe.  (owner: opus4)
//
// Confirms headless Chromium really has WebGL2 with the SwiftShader backend
// before anyone spends an hour chasing a blank canvas. Run it first when the
// suite reports empty frames: `node tools/webgl-check.mjs`.

import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
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
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
