// Shadow-flag audit for the site.
//
// The sun's shadow box is a 110-120 m half-extent slab led ahead of the player,
// so anything standing inside the base needs castShadow and every ground
// surface under it needs receiveShadow. This walks the scene and reports what
// breaks either rule.
//
// Two things the obvious version of this gets wrong:
//  - Self-lit surfaces are identified by a non-black emissive colour, NOT by
//    emissiveIntensity: three.js defaults that to 1 on every standard material,
//    so testing it classifies the whole site as lamps and hides every fault.
//  - An instanced mesh's world bounds cover the whole scatter, which makes a
//    field of pebbles look like one enormous flat slab. Shape tests use the
//    per-instance geometry; only placement uses the union.
//
// Run against the instrumented build (tools/inst-build) to get source lines.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const BASE = process.env.BASE || 'http://127.0.0.1:8407';
const OUT = process.env.OUT || '/tmp/shadowaudit.json';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?test=1&seed=20260805&quality=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });
await page.evaluate(() => {
  window.__GAME.action('deploy');
  window.__GAME.runFor(0.5);
});

const report = await page.evaluate(() => {
  const G = window.__GAME;
  const rows = [];
  G.game.scene.updateMatrixWorld(true);

  const base = G.game.scene.getObjectByName('base');
  if (!base) throw new Error('no base group');

  base.traverse((o) => {
    if ((!o.isMesh && !o.isInstancedMesh) || !o.geometry) return;
    if (!o.geometry.attributes || !o.geometry.attributes.position) return;
    o.geometry.computeBoundingBox();
    const gb = o.geometry.boundingBox;

    // Shape of one copy as it actually stands in the world. This has to carry
    // the object's rotation: a ground plane is a PlaneGeometry lying in local
    // XY, so measured in geometry space every apron looks like a tall wall.
    const unitBox = gb.clone();
    if (o.isInstancedMesh && o.count > 0) {
      const im = new o.matrixWorld.constructor();
      o.getMatrixAt(0, im);
      unitBox.applyMatrix4(im.premultiply(o.matrixWorld));
    } else {
      unitBox.applyMatrix4(o.matrixWorld);
    }
    const unitSpan = Math.max(unitBox.max.x - unitBox.min.x, unitBox.max.z - unitBox.min.z);
    const unitHeight = unitBox.max.y - unitBox.min.y;

    // Placement: union over instances, so distance-to-site is honest.
    const bb = gb.clone();
    if (o.isInstancedMesh && o.instanceMatrix) {
      const acc = gb.clone().makeEmpty();
      const m = new o.matrixWorld.constructor();
      const tmp = gb.clone();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        tmp.copy(gb).applyMatrix4(m);
        acc.union(tmp);
      }
      bb.copy(acc);
    }
    bb.applyMatrix4(o.matrixWorld);
    const cx = (bb.max.x + bb.min.x) / 2;
    const cz = (bb.max.z + bb.min.z) / 2;

    const chain = [];
    for (let p = o; p && p !== base.parent; p = p.parent) chain.unshift(p.name || p.type);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const m0 = mats[0] || {};
    rows.push({
      src: o.userData.__src || null,
      chain: chain.join('/'),
      geo: o.geometry.type,
      count: o.isInstancedMesh ? o.count : 1,
      unitSpan: Number(unitSpan.toFixed(2)),
      unitHeight: Number(unitHeight.toFixed(2)),
      groundY: Number(bb.min.y.toFixed(2)),
      spread: Number(Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z).toFixed(1)),
      at: [Math.round(cx), Math.round(cz)],
      dist: Math.round(Math.hypot(cx, cz)),
      tris:
        Math.round((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) *
        (o.isInstancedMesh ? o.count : 1),
      mat: m0 && (m0.name || m0.type),
      selfLit: mats.some((m) => m && m.emissive && m.emissive.getHex() !== 0),
      basic: mats.some((m) => m && m.isMeshBasicMaterial),
      transparent: mats.some((m) => m && m.transparent),
      cast: !!o.castShadow,
      recv: !!o.receiveShadow,
      visible: o.visible,
    });
  });
  return rows;
});

const SITE = 240; // shadow box half-extent plus the lead it can be pushed by
const inSite = (r) => r.dist < SITE;
const lit = (r) => r.selfLit || r.basic;

// A ground surface: one copy is wide, flat and sitting on the deck.
const grounds = report.filter(
  (r) => inSite(r) && !lit(r) && r.unitSpan >= 4 && r.unitHeight <= 1.0 && r.groundY < 2.0
);
// A structure: one copy stands proud of the ground.
const structures = report.filter((r) => inSite(r) && !lit(r) && r.unitHeight > 0.8 && r.visible);

const fmt = (r) =>
  `base.js:${String(r.src ?? '?').padStart(4)}  ${r.chain}  [${r.geo}${r.count > 1 ? ` x${r.count}` : ''}] ` +
  `unit=${r.unitSpan}x${r.unitHeight} y0=${r.groundY} at=${r.at} d=${r.dist} tris=${r.tris} ` +
  `mat=${r.mat}${r.transparent ? ' transparent' : ''} cast=${r.cast} recv=${r.recv}`;

const missRecv = grounds.filter((r) => !r.recv).sort((a, b) => b.unitSpan - a.unitSpan);
const missCast = structures.filter((r) => !r.cast).sort((a, b) => b.unitHeight - a.unitHeight);

console.log(`base meshes ${report.length}; inside ${SITE} m: ${report.filter(inSite).length}`);
console.log(`\nGROUND SURFACES NOT RECEIVING (${missRecv.length} of ${grounds.length}):`);
for (const r of missRecv) console.log('  ', fmt(r));
console.log(`\nSTRUCTURES NOT CASTING (${missCast.length} of ${structures.length}):`);
for (const r of missCast) console.log('  ', fmt(r));
console.log('\nSMALL CLUTTER NOT CASTING (per-copy size; the performance exemption):');
for (const r of report
  .filter((r) => inSite(r) && !lit(r) && !r.cast && r.unitHeight <= 0.8)
  .sort((a, b) => b.tris - a.tris)
  .slice(0, 20))
  console.log('  ', fmt(r));

await fs.writeFile(OUT, JSON.stringify({ missRecv, missCast, all: report }, null, 1));
await browser.close();
process.exit(0);
