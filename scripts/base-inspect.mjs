/**
 * Environment-art inspection helper.
 *
 * Boots the built game headless, reports per-object draw-call / triangle costs
 * for the `base` group, and takes a set of framed screenshots.
 *
 *   node scripts/base-inspect.mjs [--shots dir] [--sky day|sunset|night] [--views a,b]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};

const outDir = arg('--shots', '/tmp/base-shots');
const sky = arg('--sky', 'day');
mkdirSync(outDir, { recursive: true });

const VIEWS = {
  spawn: { pos: [-10, 48], look: [-4, 6, -80] },
  north: { pos: [-4, 20], look: [-4, 40, -700] },
  pads: { pos: [-4, -4], look: [-54, 8, -22] },
  shelter: { pos: [-42, 52], look: [-58, 4, 40] },
  radar: { pos: [16, 22], look: [34, 6, 14] },
  support: { pos: [-14, 40], look: [-30, 4, 26] },
  gate: { pos: [-4, 118], look: [-4, 3, 60] },
  fence: { pos: [-60, 96], look: [-60, 2, 112] },
  markings: { pos: [-4, 40], look: [-4, -3, 20] },
  padmark: { pos: [-54, -4], look: [-54, -2, -22] },
  west: { pos: [-100, 20], look: [-400, 120, -300] },
  ridge: { pos: [0, 60], look: [900, 260, -1800] },
  mesa: { pos: [0, 60], look: [-1600, 120, -2400] },
  ground: { pos: [-30, 80], look: [-46, -2, 30] },
  drain: { pos: [-88, 20], look: [-97, 0, -10] }
};

const viewList = (arg('--views', Object.keys(VIEWS).join(',')) || '').split(',').filter(Boolean);

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--mute-audio'
  ]
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || t === 'warning') console.log(`[${t}] ${m.text()}`);
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.stack || e.message}`));

const origin = arg('--origin', 'http://127.0.0.1:4180');

await page.goto(`${origin}/?test=1&quality=low&seed=1&skipintro=1`, {
  waitUntil: 'domcontentloaded'
});
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 180000 });
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

console.log('counts:', JSON.stringify(await page.evaluate(() => window.__GAME.counts())));

const report = await page.evaluate(() => {
  const scene = window.__BASE ? window.__BASE.group : null;
  if (!scene) return { groups: [], totals: { meshes: 0, tris: 0 } };
  const out = { groups: [], totals: { meshes: 0, tris: 0 } };
  const tri = (o) => {
    const geo = o.geometry;
    if (!geo) return 0;
    const n = geo.index ? geo.index.count : geo.attributes.position?.count || 0;
    return (n / 3) * (o.isInstancedMesh ? o.count : 1);
  };
  const walk = (obj, bucket) => {
    if (obj.isMesh || obj.isInstancedMesh || obj.isPoints || obj.isLine || obj.isSprite) {
      bucket.meshes++;
      bucket.tris += tri(obj);
      bucket.items.push({ name: obj.name || obj.type, tris: Math.round(tri(obj)) });
    }
    for (const c of obj.children) walk(c, bucket);
  };
  for (const child of scene.children) {
    const bucket = { name: child.name || child.type, meshes: 0, tris: 0, items: [] };
    walk(child, bucket);
    if (bucket.meshes) {
      bucket.items.sort((a, b) => b.tris - a.tris);
      out.groups.push(bucket);
      out.totals.meshes += bucket.meshes;
      out.totals.tris += bucket.tris;
    }
  }
  out.groups.sort((a, b) => b.meshes - a.meshes);
  out.totals.tris = Math.round(out.totals.tris);
  return out;
});

for (const grp of report.groups) {
  console.log(`\n== ${grp.name}: ${grp.meshes} meshes, ${Math.round(grp.tris)} tris`);
  for (const it of grp.items) console.log(`    ${String(it.tris).padStart(8)}  ${it.name}`);
}
console.log('\nTOTAL scene meshes:', report.totals.meshes, 'tris:', report.totals.tris);

if (sky !== 'day') {
  await page.evaluate((s) => window.__GAME.setSky(s), sky);
  await page.evaluate(() => window.__GAME.fastForward(6));
}

for (const name of viewList) {
  const v = VIEWS[name];
  if (!v) continue;
  // Teleport, let a frame move the camera, and only then aim: `lookAt` works
  // off the live camera position, which the teleport has not applied yet.
  await page.evaluate(({ v }) => window.__GAME.teleport(v.pos[0], v.pos[1], 0), { v });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 220)));
  await page.evaluate(({ v }) => window.__GAME.lookAt(v.look[0], v.look[1], v.look[2]), { v });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 220)));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const path = `${outDir}/${name}.png`;
  await page.screenshot({ path, timeout: 120000, animations: 'allow', caret: 'initial' });
  const c = await page.evaluate(() => window.__GAME.counts());
  console.log(`${name}: draws=${c.drawCalls} tris=${c.triangles} -> ${path}`);
}

await browser.close();
