// Probes headless Chrome for a usable WebGL2 context and reports the backing renderer.
import puppeteer from 'puppeteer-core';

const FLAG_SETS = {
  swiftshader: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
  ],
  vulkanSwiftshader: [
    '--headless=new',
    '--no-sandbox',
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-dev-shm-usage',
  ],
  eglAngle: [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=gl-egl',
    '--disable-dev-shm-usage',
  ],
};

for (const [name, args] of Object.entries(FLAG_SETS)) {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/local/bin/google-chrome',
      args,
      protocolTimeout: 60000,
    });
    const page = await browser.newPage();
    const result = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const gl = canvas.getContext('webgl2');
      if (!gl) return { ok: false, reason: 'no webgl2 context' };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      // Draw a solid colour so we can confirm the rasteriser actually produced pixels.
      gl.clearColor(0.2, 0.6, 0.9, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const px = new Uint8Array(4);
      gl.readPixels(128, 128, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return {
        ok: true,
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        pixel: Array.from(px),
        maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxSamples: gl.getParameter(gl.MAX_SAMPLES),
        colorBufferFloat: !!gl.getExtension('EXT_color_buffer_float'),
        textureFloatLinear: !!gl.getExtension('OES_texture_float_linear'),
        anisotropy: !!gl.getExtension('EXT_texture_filter_anisotropic'),
        s3tc: !!gl.getExtension('WEBGL_compressed_texture_s3tc'),
      };
    });
    console.log(name, JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(name, 'FAILED:', err.message.split('\n')[0]);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
