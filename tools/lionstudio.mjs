#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Lion studio: one lion on a plane under the game's day rig, rendered through
// the dev server so it is the real module. Seconds per frame instead of
// minutes, for the face, the paws and the gait. Final judgement still comes
// from tools/lions.mjs inside the game.
//
//   node tools/lionstudio.mjs --kind lioness --states stand,lie --views face,eye,side
//   node tools/lionstudio.mjs --kind male --walk 8 --out shots/studio_walk
//   node tools/lionstudio.mjs --kind cub --views paws --slope 0.25
//   node tools/lionstudio.mjs --flat ...        clay material, shells off
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5196/');
const kind = arg('kind', 'lioness');
const quality = arg('quality', 'high');
const width = Number(arg('width', '640'));
const height = Number(arg('height', '360'));
const outDir = arg('out', path.join('shots', `studio_${kind}`));
const views = arg('views', 'side,face').split(',').filter(Boolean);
const states = arg('states', 'stand').split(',').filter(Boolean);
const walkFrames = Number(arg('walk', '0'));
const slope = Number(arg('slope', '0'));
const settle = Number(arg('settle', '3'));
const flat = argv.includes('--flat');
const setCode = arg('set', '');

// camera in the lion's frame: +z where it faces, +x its right, origin under the body
const FRAMINGS = {
  close: { pos: [0.9, 0.35, 1.6], bone: 'head', look: [0.0, -0.05, 0.0], fov: 34 },
  face: { pos: [0.3, 0.2, 1.1], bone: 'head', look: [0.0, 0.0, 0.05], fov: 26 },
  front: { pos: [0.0, 0.1, 1.3], bone: 'head', look: [0.0, -0.02, 0.0], fov: 30 },
  profile: { pos: [1.0, 0.05, 0.05], bone: 'head', look: [0.0, -0.02, 0.05], fov: 24 },
  eye: { pos: [0.22, 0.09, 0.42], bone: 'lidL', look: [0.0, 0.0, 0.0], fov: 14 },
  paws: { pos: [1.1, 0.35, 1.3], bone: 'pawFL', look: [0.0, 0.0, 0.0], fov: 30 },
  paw: { pos: [0.45, 0.16, 0.5], bone: 'pawFL', look: [0.0, 0.0, 0.0], fov: 22 },
  hind: { pos: [1.1, 0.35, -1.2], bone: 'pawHL', look: [0.0, 0.05, 0.0], fov: 30 },
  haunch: { pos: [3.0, 0.3, -0.1], bone: 'hipL', look: [0.0, -0.3, 0.0], fov: 24 },
  foreleg: { pos: [3.0, 0.3, 0.1], bone: 'shoulderL', look: [0.0, -0.3, 0.0], fov: 24 },
  medium: { pos: [6.2, 1.7, 4.6], look: [0.0, 0.55, 0.0], fov: 36 },
  side: { pos: [5.0, 1.0, 0.3], look: [0.0, 0.55, 0.0], fov: 30 },
  top: { pos: [0.6, 5.0, 0.2], look: [0.0, 0.5, 0.0], fov: 34 },
  rear: { pos: [-3.0, 1.2, -4.0], look: [0.0, 0.6, 0.0], fov: 36 },
  far: { pos: [28, 4.5, 28], look: [0.0, 0.5, 0.0], fov: 30 },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.error(`[console:${m.type()}]`, m.text());
});
// the page itself is synthetic; only its module imports go to the dev server
const pageUrl = base.replace(/\/$/, '') + '/__lionstudio.html';
await page.route(pageUrl, (route) =>
  route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module">
      import { studio } from '/tools/lionstudio.page.js';
      studio(${JSON.stringify({ kind, quality, width, height, slope })}).then(() => { window.__READY__ = true; }, (e) => { window.__ERROR__ = String(e && e.stack || e); });
    </script></body></html>`,
  }),
);
const t0 = Date.now();
await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 300000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('studio failed:\n' + err);
  await browser.close();
  process.exit(1);
}
const stats = await page.evaluate(
  ({ flat, setCode, tier }) => {
    const S = window.__studio;
    if (flat) {
      const clay = new S.THREE.MeshStandardMaterial({ color: 0x9a9088, roughness: 0.85, metalness: 0 });
      S.lion.root.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        if (/shells|fuzz|strands|cornea/.test(o.name)) o.visible = false;
        else o.material = clay;
      });
    }
    if (tier >= 0) S.lion.tiers.forEach((g, i) => (g.visible = i === tier));
    if (setCode) new Function('S', 'lion', setCode)(S, S.lion);
    return S.stats();
  },
  { flat, setCode, tier: Number(arg('tier', '-1')) },
);
console.log(`[studio] ${kind} @ ${quality} booted in ${((Date.now() - t0) / 1000).toFixed(1)}s; tiers (tris) ${JSON.stringify(stats.tiers)} calls ${JSON.stringify(stats.calls)}`);

if (argv.includes('--atlas')) {
  const dumps = await page.evaluate(() => {
    const S = window.__studio;
    const grab = (tex) => (tex && tex.image && tex.image.toDataURL ? tex.image.toDataURL('image/png') : null);
    return { coat: grab(S.lion.coat.map), mane: S.lion.maneMat ? grab(S.lion.maneMat.map) : null };
  });
  for (const [k, v] of Object.entries(dumps)) {
    if (!v) continue;
    const file = path.join(outDir, `atlas_${k}.png`);
    await writeFile(file, Buffer.from(v.split(',')[1], 'base64'));
    console.log(`[studio] atlas ${k} -> ${file}`);
  }
}

async function capture(name, f, idx = -1) {
  const ts = Date.now();
  const out = await page.evaluate(
    ({ f }) => {
      const S = window.__studio;
      const { camera, lion, THREE } = S;
      lion.root.updateMatrixWorld(true);
      const yaw = lion.brain.yaw;
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      const o = lion.root.position;
      const rot = (v) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
      let origin = [o.x, o.y, o.z];
      if (f.bone) {
        const bp = S.bone(f.bone);
        origin = [bp.x, bp.y, bp.z];
      }
      const lo = rot(f.look);
      const po = rot(f.pos);
      camera.position.set(origin[0] + po[0], origin[1] + po[1], origin[2] + po[2]);
      camera.fov = f.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(origin[0] + lo[0], origin[1] + lo[1], origin[2] + lo[2]);
      const dataUrl = S.render();
      const h = (n) => +S.bone(n).sub(o).y.toFixed(3);
      const body = { fit: { hip: +lion.fit.hip.toFixed(3), chest: +lion.fit.chest.toFixed(3) }, pelvis: h('pelvis'), chest: h('chest'), head: h('head'), speed: +lion.brain.speed.toFixed(2) };
      const rep = lion.footReport().map((r) => ({ n: r.name, p: r.planted ? 1 : 0, dy: +(r.y - S.terrain.heightAt(r.x, r.z)).toFixed(4) }));
      return { dataUrl, state: lion.state, body, rep, render: S.stats().render };
    },
    { f },
  );
  const file = path.join(outDir, idx >= 0 ? `${name}_${String(idx).padStart(2, '0')}.png` : `${name}.png`);
  await writeFile(file, Buffer.from(out.dataUrl.split(',')[1], 'base64'));
  console.log(`[studio] ${name}${idx >= 0 ? ' #' + idx : ''} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, ${out.state}, tris ${out.render.triangles}, calls ${out.render.calls}) body ${JSON.stringify(out.body)} feet ${JSON.stringify(out.rep)}`);
}

for (const st of states) {
  await page.evaluate(
    ({ st, settle }) => {
      const S = window.__studio;
      S.force(st);
      S.sim(settle);
    },
    { st, settle },
  );
  for (const v of views) {
    const f = FRAMINGS[v];
    if (!f) {
      console.error(`[studio] no framing "${v}"`);
      continue;
    }
    await capture(`${v}_${st}`, f);
  }
}

if (walkFrames > 0) {
  await page.evaluate(() => {
    const S = window.__studio;
    const b = S.lion.brain;
    S.force('stand');
    b.blend = 1;
    Object.assign(b.pose, b.to);
    S.sim(0.5);
    S.force('walk');
    b.dest = { x: b.pos.x + Math.sin(b.yaw) * 9, z: b.pos.z + Math.cos(b.yaw) * 9 };
    b.dwell = 1e9;
    S.sim(1.5);
  });
  for (let i = 0; i < walkFrames; i++) {
    await capture('walk', { pos: [4.5, 0.9, 0.5], look: [0.0, 0.5, 0.3], fov: 30 }, i);
    await page.evaluate(() => window.__studio.sim(0.1));
  }
}
await browser.close();
