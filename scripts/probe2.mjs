#!/usr/bin/env node
/** Read back composer buffers to find where the image signal disappears. */
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5173/?dev=heads&who=connor&q=medium&warm=1&rf=3&mat=clay';
const wait = Number(process.argv[3] ?? 30000);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--window-size=480,270', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--autoplay-policy=no-user-gesture-required'],
  protocolTimeout: 300000,
});
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 270 });
page.on('console', (m) => { if (/error|GL_|shader/i.test(m.text())) console.log('[c]', m.text().slice(0, 600)); });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)));
await page.goto(url, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, wait));

const out = await page.evaluate(() => {
  const e = window.__engine;
  const r = e.renderer;
  const fx = e.fx;
  const stats = (rt, label) => {
    try {
      const w = Math.min(64, rt.width), h = Math.min(36, rt.height);
      const isFloat = rt.texture.type !== 1009; // UnsignedByteType === 1009
      const buf = isFloat ? new Float32Array(w * h * 4) : new Uint8Array(w * h * 4);
      r.readRenderTargetPixels(rt, Math.floor(rt.width / 2 - w / 2), Math.floor(rt.height / 2 - h / 2), w, h, buf);
      let max = 0, sum = 0;
      for (let i = 0; i < buf.length; i += 4) {
        const v = (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
        sum += v;
        if (v > max) max = v;
      }
      return { label, w: rt.width, h: rt.height, type: rt.texture.type, mean: +(sum / (buf.length / 4)).toFixed(4), max: +max.toFixed(4) };
    } catch (err) {
      return { label, error: String(err).slice(0, 160) };
    }
  };
  const res = [];
  res.push(stats(fx.composer.renderTarget1, 'rt1'));
  res.push(stats(fx.composer.renderTarget2, 'rt2'));
  const passes = fx.composer.passes.map((p) => ({
    name: p.constructor.name,
    enabled: p.enabled,
    needsSwap: p.needsSwap,
    toScreen: p.renderToScreen,
    tDiffuse: p.uniforms?.tDiffuse?.value ? 'set' : 'null',
  }));
  // Manual scene render into rt1 to see whether the target can hold an image.
  r.setRenderTarget(fx.composer.renderTarget1);
  r.clear();
  r.render(e.set.scene, e.set.camera);
  r.setRenderTarget(null);
  res.push(stats(fx.composer.renderTarget1, 'rt1-after-manual-render'));
  return { passes, res, pixelRatio: r.getPixelRatio(), size: r.getSize(new (e.set.camera.position.constructor)()).toArray?.() };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
