#!/usr/bin/env node
/* Scratch: raw skeleton state for the live soldier — bone world positions vs skinning matrices. */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=320,180'],
  protocolTimeout: 900000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.setDefaultTimeout(900000);
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
await page.goto('http://127.0.0.1:5199/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
console.log('ready');

const out = await page.evaluate(() => {
  const G = window.__GAME__;
  G.pose('ai_soldier');
  G.stepFrames(1);
  const meshes = [];
  G.engine.scene.traverse((o) => {
    if (o.isSkinnedMesh) meshes.push(o);
  });
  const pick = meshes.filter((m) => m.visible);
  const report = pick.slice(0, 2).map((mesh) => {
    const sk = mesh.skeleton;
    // Bind-space extent of the vertices each bone dominates: is the geometry
    // built at all, or built as a degenerate point?
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const si = geo.attributes.skinIndex.array;
    const sw = geo.attributes.skinWeight.array;
    const bind = {};
    for (let i = 0; i < pos.count; i++) {
      let dom = -1;
      let domW = 0;
      let total = 0;
      for (let k = 0; k < 4; k++) {
        const w = sw[i * 4 + k];
        total += w;
        if (w > domW) { domW = w; dom = si[i * 4 + k]; }
      }
      if (dom < 0) continue;
      const b = (bind[dom] ??= { n: 0, wsum: 0, min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] });
      b.n++;
      b.wsum += total;
      const a = [pos.getX(i), pos.getY(i), pos.getZ(i)];
      for (let c = 0; c < 3; c++) {
        if (a[c] < b.min[c]) b.min[c] = a[c];
        if (a[c] > b.max[c]) b.max[c] = a[c];
      }
    }
    const bones = sk.bones.map((b, i) => {
      const p = b.matrixWorld.elements;
      const g = bind[i];
      return {
        i,
        name: b.name,
        world: [p[12], p[13], p[14]].map((v) => +v.toFixed(2)),
        verts: g ? g.n : 0,
        wsum: g ? +(g.wsum / g.n).toFixed(2) : 0,
        bindSize: g
          ? [g.max[0] - g.min[0], g.max[1] - g.min[1], g.max[2] - g.min[2]].map((v) => +v.toFixed(3))
          : null,
        bindMid: g
          ? [(g.max[0] + g.min[0]) / 2, (g.max[1] + g.min[1]) / 2, (g.max[2] + g.min[2]) / 2].map((v) => +v.toFixed(2))
          : null,
      };
    });
    return {
      name: mesh.name,
      parent: mesh.parent?.name,
      root: mesh.parent ? mesh.parent.position.toArray().map((v) => +v.toFixed(2)) : null,
      boneCount: sk.bones.length,
      matrixLen: sk.boneMatrices.length,
      bones,
    };
  });
  return { total: meshes.length, visible: pick.length, report };
});
console.log('skinned meshes:', out.total, 'visible:', out.visible);
for (const r of out.report) {
  console.log('---', r.name, 'parent', r.parent, 'rootPos', JSON.stringify(r.root),
    'bones', r.boneCount, 'matrixLen', r.matrixLen);
  for (const b of r.bones) {
    console.log(`  ${b.i.toString().padStart(2)} ${b.name.padEnd(8)} world=${JSON.stringify(b.world)} n=${String(b.verts).padStart(4)} w=${b.wsum} bindMid=${JSON.stringify(b.bindMid)} bindSize=${JSON.stringify(b.bindSize)}`);
  }
}
await browser.close();
