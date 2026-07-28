#!/usr/bin/env node
/**
 * Dumps the showcase lineup's layout arithmetic: the rotated extent of every
 * model in metres, the scale the column settled on, and where each row landed
 * on screen. The lineup is laid out from geometry rather than by hand, so when
 * it comes out wrong the answer is always one of these numbers rather than
 * something visible in the PNG.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, f) => {
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return f;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const SIZE = String(arg('size', '800x450')).split('x').map(Number);
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    `--window-size=${SIZE[0]},${SIZE[1]}`,
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: SIZE[0], height: SIZE[1], deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

const url = new URL(String(arg('url', 'http://127.0.0.1:5173/?showcase=weapons')));
url.searchParams.set('capture', '1');
url.searchParams.set('quality', String(arg('quality', 'medium')));
await page.goto(url.href, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { polling: 250 });

const out = await page.evaluate(
  (w, h) => {
    const G = window.__GAME__;
    const W = window.__WEAPONS__;
    G.pose('wpn_lineup');
    G.stepFrames(2);
    const s = W.showcase();
    const cam = G.engine.viewmodelCamera;
    const rows = s.entries.map((e) => {
      e.pivot.updateWorldMatrix(true, true);
      // Screen extent of the row, measured the same way the harness measures
      // the held weapon: the eight corners of the model's own bounds.
      let min = null;
      let max = null;
      e.model.root.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        for (let i = 0; i < 8; i++) {
          const v = new (o.position.constructor)(
            i & 1 ? bb.max.x : bb.min.x,
            i & 2 ? bb.max.y : bb.min.y,
            i & 4 ? bb.max.z : bb.min.z,
          );
          v.applyMatrix4(o.matrixWorld).project(cam);
          const px = (v.x * 0.5 + 0.5) * w;
          const py = (0.5 - v.y * 0.5) * h;
          if (!min) {
            min = { x: px, y: py };
            max = { x: px, y: py };
          } else {
            min.x = Math.min(min.x, px);
            min.y = Math.min(min.y, py);
            max.x = Math.max(max.x, px);
            max.y = Math.max(max.y, py);
          }
        }
      });
      return {
        id: e.id,
        m: { w: +e.width.toFixed(3), h: +e.height.toFixed(3) },
        scale: +e.pivot.scale.x.toFixed(3),
        y: +e.pivot.position.y.toFixed(3),
        px: min
          ? {
              x: Math.round(min.x),
              y: Math.round(min.y),
              w: Math.round(max.x - min.x),
              h: Math.round(max.y - min.y),
            }
          : null,
        label: e.label?.style.top,
      };
    });
    return { fov: cam.fov, aspect: +cam.aspect.toFixed(3), rows };
  },
  SIZE[0],
  SIZE[1],
);

console.log(JSON.stringify(out, null, 1));
await browser.close();
