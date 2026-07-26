// Renders the same frame with GL_DITHER on and off, to work out whether the
// ordered pattern over smooth gradients in headless captures is the software
// rasteriser dithering or something in our own shaders.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://127.0.0.1:5173/?quality=high', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__gameReady === true, { timeout: 120000 });
await page.evaluate(() => {
  window.game.begin();
  window.game.hud.setVisible(false);
  window.engine.stop();
});

const grab = async (enable) => {
  await page.evaluate((on) => {
    const gl = window.engine.renderer.getContext();
    if (on) gl.enable(gl.DITHER);
    else gl.disable(gl.DITHER);
    window.__ditherState = gl.isEnabled(gl.DITHER);
    for (let i = 0; i < 4; i++) window.engine.onFixedUpdate(1 / 60);
    window.engine.onRender(1 / 60);
    window.engine.render();
  }, enable);
  const state = await page.evaluate(() => window.__ditherState);
  const buf = await page.screenshot({ timeout: 300000 });
  return { state, buf };
};

const on = await grab(true);
const off = await grab(false);
console.log(JSON.stringify({ onState: on.state, offState: off.state, same: on.buf.equals(off.buf) }));
const { writeFileSync } = await import('node:fs');
writeFileSync('artifacts/dither-on.png', on.buf);
writeFileSync('artifacts/dither-off.png', off.buf);
await browser.close();
