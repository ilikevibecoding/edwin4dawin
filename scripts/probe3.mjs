#!/usr/bin/env node
/** Read back each composer buffer (correct typed arrays) plus the canvas. */
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5173/?dev=heads&who=connor&q=medium&warm=1&rf=3&mat=clay&qover=hdr:0';
const wait = Number(process.argv[3] ?? 22000);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--window-size=480,270', '--mute-audio'],
  protocolTimeout: 300000,
});
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 270 });
page.on('console', (m) => { if (/error|GL_|WebGL|shader/i.test(m.text())) console.log('[c]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)));
await page.goto(url, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, wait));

const out = await page.evaluate(() => {
  const e = window.__engine;
  const r = e.renderer;
  const fx = e.fx;
  const gl = r.getContext();
  const info = [];

  const readRT = (rt, label) => {
    const w = Math.floor(rt.width * 0.9), h = Math.floor(rt.height * 0.9);
    const x = Math.floor(rt.width * 0.05), y = Math.floor(rt.height * 0.05);
    let buf;
    // 1009 = UnsignedByteType, 1016 = HalfFloatType
    if (rt.texture.type === 1016) buf = new Uint16Array(w * h * 4);
    else buf = new Uint8Array(w * h * 4);
    try {
      r.readRenderTargetPixels(rt, x, y, w, h, buf);
    } catch (err) {
      info.push(`${label}: readback failed ${String(err).slice(0, 80)}`);
      return;
    }
    let max = 0, sum = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const v = (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
      sum += v;
      if (v > max) max = v;
    }
    info.push(`${label}: ${rt.width}x${rt.height} type=${rt.texture.type} mean=${(sum / (buf.length / 4)).toFixed(2)} max=${max}`);
  };

  readRT(fx.composer.renderTarget1, 'rt1');
  readRT(fx.composer.renderTarget2, 'rt2');
  if (fx.composer.passes.find((p) => p.constructor.name === 'ShaderPass')) info.push('passes: ' + fx.passNames.join(' '));

  // Canvas (default framebuffer) pixels.
  const cw = gl.drawingBufferWidth, chh = gl.drawingBufferHeight;
  const rw = Math.floor(cw * 0.9), rh = Math.floor(chh * 0.9);
  const px = new Uint8Array(4 * rw * rh);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(Math.floor(cw * 0.05), Math.floor(chh * 0.05), rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let cmax = 0, csum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const v = (px[i] + px[i + 1] + px[i + 2]) / 3;
    csum += v;
    if (v > cmax) cmax = v;
  }
  info.push(`canvas: ${cw}x${chh} mean=${(csum / (rw * rh)).toFixed(2)} max=${cmax} glErr=${gl.getError()}`);
  info.push(`renderer: pixelRatio=${r.getPixelRatio()} autoClear=${r.autoClear} shadowType=${r.shadowMap.type}`);
  info.push(`canvasEl: ${r.domElement.width}x${r.domElement.height} client=${r.domElement.clientWidth}x${r.domElement.clientHeight}`);
  return info;
});
console.log(out.join('\n'));
await browser.close();
