#!/usr/bin/env node
/**
 * What the reticle shader is handed at full ADS, and what it actually puts on
 * the screen.
 *
 * The uniforms alone are not enough: a collimated reticle that is off-axis, or
 * sub-pixel, or drawn under a housing face, all look identical from the
 * JavaScript side. So this also samples the centre of the frame, then cranks
 * the dot up and samples again — if the second read moves and the first does
 * not, the reticle is drawing and the size is wrong; if neither moves, it is
 * not drawing at all.
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

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const W = 480;
const H = 270;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    `--window-size=${W},${H}`,
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[error]', m.text().slice(0, 400));
});
await page.goto(`http://127.0.0.1:5173/?capture=1&quality=${arg('quality', 'medium')}`, {
  waitUntil: 'domcontentloaded',
});
await page.waitForFunction(() => window.__GAME__?.ready === true, { polling: 250 });

const shots = String(arg('shots', 'wpn_ads,wpn_scope')).split(',');
for (const shot of shots) {
  const out = await page.evaluate(
    async (name, w, h) => {
      const G = window.__GAME__;
      const sample = () => {
        const cv = document.getElementById('viewport');
        const s = document.createElement('canvas');
        s.width = w;
        s.height = h;
        const c = s.getContext('2d', { willReadFrequently: true });
        c.drawImage(cv, 0, 0, w, h);
        const d = c.getImageData((w >> 1) - 4, (h >> 1) - 4, 9, 9).data;
        let best = [0, 0, 0];
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) {
          const l = d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
          sum += l;
          if (l > best[0] * 0.2126 + best[1] * 0.7152 + best[2] * 0.0722) {
            best = [d[i], d[i + 1], d[i + 2]];
          }
        }
        return { peak: best, mean: +(sum / 81).toFixed(1) };
      };

      G.pose(name);
      G.stepFrames(4);
      const res = { shot: name, meshes: [] };
      G.engine.viewmodelScene.traverse((o) => {
        if (!o.isMesh || !String(o.name).includes('optic:')) return;
        const m = o.material;
        const u = m.uniforms ?? {};
        o.updateWorldMatrix(true, false);
        const e = {
          name: o.name,
          visible: o.visible,
          layer: o.layers.mask,
          transparent: m.transparent,
          program: m.program ? m.program.diagnostics?.error ?? 'ok' : 'none',
          worldZ: +o.matrixWorld.elements[14].toFixed(4),
        };
        if (u.uEye) e.uEye = u.uEye.value.toArray().map((v) => +v.toFixed(4));
        for (const k of ['uAds', 'uAngMax', 'uDot', 'uIntensity', 'uHasImage']) {
          if (u[k]) e[k] = +Number(u[k].value).toFixed(5);
        }
        res.meshes.push(e);
      });
      res.before = sample();
      window.__WEAPONS__.tune({ dot: 0.02, reticle: 400 });
      G.stepFrames(2);
      res.bigDot = sample();
      window.__WEAPONS__.tune({ dot: 0.02, reticle: 4000 });
      G.stepFrames(2);
      res.brightDot = sample();
      res.fov = G.engine.viewmodelCamera.fov;
      return res;
    },
    shot,
    W,
    H,
  );
  console.log(JSON.stringify(out));
}
await browser.close();
