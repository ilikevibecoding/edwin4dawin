#!/usr/bin/env node
/**
 * Dumps what the viewmodel materials actually resolved to at runtime.
 *
 * A gun that renders as a featureless light-grey blob is either missing its
 * albedo map or being multiplied by a vertex colour that is nothing like the
 * tint that was asked for, and those two look identical in a screenshot. This
 * reads the numbers straight off the material and the geometry attributes.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, f) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? f : argv[i + 1];
};
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);

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
    '--hide-scrollbars',
    '--mute-audio',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 480, height: 270, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('  [error]', m.text());
});

const url = new URL(arg('url', 'http://127.0.0.1:5173/'));
url.searchParams.set('capture', '1');
url.searchParams.set('quality', arg('quality', 'medium'));
await page.goto(url.href, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { polling: 250 });

const out = await page.evaluate(() => {
  const G = window.__GAME__;
  const ctx = G.engine;
  const res = { materials: [], meshes: [], lights: [] };
  const seen = new Set();
  ctx.viewmodelScene.traverse((o) => {
    if (o.isLight) {
      res.lights.push({
        type: o.type,
        name: o.name,
        i: +o.intensity.toFixed(2),
        c: o.color?.getHexString?.(),
      });
      return;
    }
    if (!o.isMesh) return;
    const g = o.geometry;
    const attr = Object.keys(g.attributes);
    const colors = g.attributes.color;
    let cmin = [9, 9, 9];
    let cmax = [-9, -9, -9];
    let cavg = [0, 0, 0];
    if (colors) {
      for (let i = 0; i < colors.count; i++) {
        for (let k = 0; k < 3; k++) {
          const v = colors.array[i * colors.itemSize + k];
          if (v < cmin[k]) cmin[k] = v;
          if (v > cmax[k]) cmax[k] = v;
          cavg[k] += v;
        }
      }
      cavg = cavg.map((v) => +(v / colors.count).toFixed(3));
      cmin = cmin.map((v) => +v.toFixed(3));
      cmax = cmax.map((v) => +v.toFixed(3));
    }
    const uv = g.attributes.uv;
    let uvmin = [9e9, 9e9];
    let uvmax = [-9e9, -9e9];
    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        for (let k = 0; k < 2; k++) {
          const v = uv.array[i * 2 + k];
          if (v < uvmin[k]) uvmin[k] = v;
          if (v > uvmax[k]) uvmax[k] = v;
        }
      }
      uvmin = uvmin.map((v) => +v.toFixed(2));
      uvmax = uvmax.map((v) => +v.toFixed(2));
    }
    const m = o.material;
    res.meshes.push({
      name: o.name,
      visible: o.visible,
      tris: g.index ? g.index.count / 3 : g.attributes.position.count / 3,
      attr,
      colorAvg: cavg,
      colorMin: cmin,
      colorMax: cmax,
      uvMin: uvmin,
      uvMax: uvmax,
      mat: m?.name ?? m?.type,
    });
    if (m && !seen.has(m.uuid)) {
      seen.add(m.uuid);
      res.materials.push({
        name: m.name,
        type: m.type,
        color: m.color?.getHexString?.(),
        colorLinear: m.color ? [m.color.r, m.color.g, m.color.b].map((v) => +v.toFixed(3)) : null,
        map: m.map ? `${m.map.image?.width}x${m.map.image?.height} cs=${m.map.colorSpace}` : null,
        normalMap: !!m.normalMap,
        roughnessMap: !!m.roughnessMap,
        metalnessMap: !!m.metalnessMap,
        rough: m.roughness,
        metal: m.metalness,
        vertexColors: m.vertexColors,
        envMap: !!m.envMap,
        envMapIntensity: m.envMapIntensity,
        emissiveI: m.emissiveIntensity,
        transparent: m.transparent,
        defines: m.defines ? Object.keys(m.defines) : null,
        uniforms: m.userData?.uniforms ? Object.keys(m.userData.uniforms) : null,
      });
    }
  });
  const lighting = ctx.tryGet('lighting');
  if (lighting) {
    res.sun = {
      color: lighting.sun.color.toArray().map((v) => +v.toFixed(2)),
      intensity: lighting.sun.intensity,
    };
    res.exposure = lighting.exposure ?? null;
  }
  res.worldLights = [];
  ctx.scene.traverse((o) => {
    if (o.isLight) res.worldLights.push({ type: o.type, i: +o.intensity.toFixed(2) });
  });
  return res;
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
