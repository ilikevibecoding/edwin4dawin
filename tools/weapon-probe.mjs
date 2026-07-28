#!/usr/bin/env node
/**
 * Ad-hoc diagnostic for the weapon viewmodel.
 *
 * Boots the game headless, poses each vantage the weapon system registers and
 * reports where the weapon actually landed on screen and how bright it came
 * out. Judging that from a 20-second software-rasterised PNG is guesswork;
 * this reads it straight out of the scene graph in about the time it takes to
 * boot once.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, f) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? f : argv[i + 1];
};
const URL_BASE = arg('url', 'http://127.0.0.1:5173/?showcase=weapons');
const QUALITY = arg('quality', 'medium');
const SHOTS = String(arg('shots', 'wpn_hip,wpn_ads,wpn_scope')).split(',');
/**
 * Screen points to identify, as `x,y` pixel pairs in an 800x450 frame,
 * separated by `;`. Each is raycast through the viewmodel camera and the first
 * mesh it lands on is named, which is how a mystery bar in a screenshot stops
 * being a mystery.
 */
const PICKS = String(arg('pick', ''))
  .split(';')
  .filter(Boolean)
  .map((p) => p.split(',').map(Number));

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
  defaultViewport: { width: 800, height: 450, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('  [error]', m.text());
});

const url = new URL(URL_BASE);
url.searchParams.set('capture', '1');
url.searchParams.set('quality', QUALITY);
await page.goto(url.href, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { polling: 250 });
console.log('ready');

for (const shot of SHOTS) {
  const info = await page.evaluate(async (name, picks) => {
    const G = window.__GAME__;
    if (!G.pose(name)) return { name, error: 'unknown vantage' };
    G.stepFrames(4);
    const W = window.__WEAPONS__;
    const out = { name, info: W.info(), rect: W.screenRect(800, 450), bounds: W.bounds() };

    // Walk the viewmodel scene for what is actually visible and where.
    const THREE = G.THREE;
    const ctx = G.engine;
    out.nodes = [];
    const scene = ctx?.viewmodelScene;
    if (scene) {
      const cam = ctx.viewmodelCamera;
      out.camera = { fov: +cam.fov.toFixed(2), aspect: +cam.aspect.toFixed(3) };
      const box = new THREE.Box3();
      const v = new THREE.Vector3();
      scene.traverse((o) => {
        if (!o.isMesh) return;
        let vis = o.visible;
        for (let p = o.parent; p && vis; p = p.parent) vis = p.visible;
        o.updateWorldMatrix(true, false);
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        if (!vis) return;
        box.getCenter(v).project(cam);
        const entry = {
          n: o.name,
          z: +v.z.toFixed(3),
          sx: Math.round((v.x * 0.5 + 0.5) * 800),
          sy: Math.round((0.5 - v.y * 0.5) * 450),
        };
        // Camera-space extents, so "where is this actually" is answerable.
        box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        v.copy(box.min).applyMatrix4(cam.matrixWorldInverse);
        entry.lo = [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];
        v.copy(box.max).applyMatrix4(cam.matrixWorldInverse);
        entry.hi = [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];
        out.nodes.push(entry);
      });
    }

    if (scene && picks.length) {
      const cam = ctx.viewmodelCamera;
      const ray = new THREE.Raycaster();
      ray.layers.enableAll();
      const ndc = new THREE.Vector2();
      out.picks = [];
      for (const [px, py] of picks) {
        ndc.set((px / 800) * 2 - 1, 1 - (py / 450) * 2);
        ray.setFromCamera(ndc, cam);
        const hits = ray.intersectObject(scene, true);
        const named = [];
        for (const h of hits) {
          let vis = h.object.visible;
          for (let p = h.object.parent; p && vis; p = p.parent) vis = p.visible;
          if (!vis) continue;
          named.push(`${h.object.name || h.object.type}@${h.distance.toFixed(3)}m`);
          if (named.length >= 4) break;
        }
        out.picks.push(`${px},${py} -> ${named.join('  ') || 'nothing'}`);
      }
    }

    const lighting = ctx?.tryGet?.('lighting');
    if (lighting) {
      out.sun = {
        color: lighting.sun.color.toArray().map((v) => +v.toFixed(2)),
        intensity: lighting.sun.intensity,
      };
    }
    out.rig = [];
    scene?.traverse((o) => {
      if (o.isLight) out.rig.push({ n: o.type, i: +o.intensity.toFixed(2) });
    });

    // Mean linear luminance the canvas actually shows, so "blown out" is a
    // number rather than an impression.
    const cv = document.getElementById('viewport');
    if (cv) {
      const s = document.createElement('canvas');
      s.width = 80;
      s.height = 45;
      const c2 = s.getContext('2d');
      c2.drawImage(cv, 0, 0, 80, 45);
      const d = c2.getImageData(0, 0, 80, 45).data;
      let sum = 0;
      let hot = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
        sum += l;
        if (l > 0.94) hot++;
      }
      out.frame = {
        mean: +(sum / (d.length / 4)).toFixed(3),
        clipped: +(hot / (d.length / 4)).toFixed(3),
      };
    }
    return out;
  }, shot, PICKS);
  console.log(`\n=== ${shot} ===`);
  const nodes = info.nodes ?? [];
  const picks = info.picks ?? [];
  delete info.nodes;
  delete info.picks;
  console.log(JSON.stringify(info));
  for (const n of nodes) {
    const eye = n.lo ? `  eye ${JSON.stringify(n.lo)}..${JSON.stringify(n.hi)}` : '';
    console.log(`   ${n.n.padEnd(28)} screen ${n.sx},${n.sy}${eye}`);
  }
  for (const p of picks) console.log(`   pick ${p}`);
}

await browser.close();
