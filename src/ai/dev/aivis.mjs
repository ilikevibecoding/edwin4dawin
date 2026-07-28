#!/usr/bin/env node
/**
 * Enemy visibility diagnostic.
 *
 * Boots the built game, silences the director so nothing wanders into frame,
 * spawns a controlled row of soldiers through the public `spawnEnemy` path, and
 * reports for each one where its root sits in the scene graph, where it lands in
 * normalised device coordinates, whether anything occludes it, and the state of
 * every mesh under it.
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const PORT = Number(process.env.PORT || 4207);
const DIST = process.env.DIST || 'dist-ai';
const ROOT = '/workspace';
const OUT = process.env.OUT || '/workspace/shots/aivis';
const TAG = process.env.TAG || 'probe';
const DIST_M = Number(process.env.RANGE || 12);

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
} catch {}

const server = spawn(
  'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', DIST],
  { cwd: ROOT, stdio: 'pipe', detached: true },
);
server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));
const kill = () => {
  try {
    process.kill(-server.pid, 'SIGKILL');
  } catch {
    server.kill('SIGKILL');
  }
};
process.on('exit', kill);

const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch(base);
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 400));
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));

await page.goto(`${base}?quality=low&capture=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
await page.waitForTimeout(9000);

const report = await page.evaluate(async ({ range, shot, posed }) => {
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const player = g.tryGet('player');
  const physics = g.tryGet('physics');
  const world = g.tryGet('world');
  const weapons = g.tryGet('weapons');
  const out = {};

  const frames = (n) =>
    new Promise((res) => {
      let left = Math.max(1, n);
      const step = () => (--left <= 0 ? res() : requestAnimationFrame(step));
      requestAnimationFrame(step);
    });

  if (shot) {
    out.shot = shot;
    await window.__SHOT__(shot);
  } else {
    // Quiet world: no reinforcements, no corpses, nobody shooting the camera.
    ai.setSpawningEnabled(false);
    ai.director.clear(ai.bb);
    weapons?.equip('ar_mk4');

    const V0 = g.camera.position.constructor;
    const eyeAt = new V0(2, 1.64, 20);
    const lookAt = new V0(2, 1.7, 20 - range);
    const ground0 = world?.sampleGround(eyeAt.x, eyeAt.z) ?? 0;
    const eye = new V0(eyeAt.x, ground0 + 1.64, eyeAt.z);
    const d = new V0().subVectors(lookAt, eye);
    player.teleport(new V0(eye.x, ground0, eye.z), Math.atan2(-d.x, -d.z), 0);
    await frames(2);

    // A row across the field of view at a readable range.
    const spawned = [];
    const lateral = [-2.6, -0.9, 0.9, 2.6];
    for (let i = 0; i < lateral.length; i++) {
      const x = eye.x + lateral[i];
      const z = eye.z - range;
      const y = world?.sampleGround(x, z);
      if (y === null || y === undefined) continue;
      const e = ai.spawnEnemy(new V0(x, y, z), Math.PI);
      if (e) spawned.push(e);
    }
    out.spawnRequested = lateral.length;
    out.spawnReturned = spawned.length;

    // Hold them still so the frame photographs the model rather than a fight.
    if (posed) {
      for (const e of ai.director.all) {
        e.posed = true;
        e.wantWeaponUp = 1;
        e.homeYaw = 0;
        e.faceIdle();
      }
    }
    await frames(24);

    g.time.timeScale = 0;
    await frames(2);
  }

  const V = g.camera.position.constructor;
  const cam = g.camera;
  cam.updateMatrixWorld(true);
  out.camera = {
    world: [
      +cam.matrixWorld.elements[12].toFixed(2),
      +cam.matrixWorld.elements[13].toFixed(2),
      +cam.matrixWorld.elements[14].toFixed(2),
    ],
    near: cam.near,
    far: cam.far,
    fov: cam.fov,
    aspect: +cam.aspect.toFixed(3),
  };

  const roots = [];
  g.scene.traverse((c) => {
    if (c.name === 'ai_soldier') roots.push(c);
  });
  out.rootsInScene = roots.length;
  const viewRoots = [];
  g.context?.viewScene?.traverse((c) => {
    if (c.name === 'ai_soldier') viewRoots.push(c);
  });
  out.rootsInViewScene = viewRoots.length;

  out.soldiers = [];
  for (const e of ai.director.all) {
    const root = e.model.root;
    root.updateWorldMatrix(true, true);
    const wp = new V().setFromMatrixPosition(root.matrixWorld);
    const scale = new V().setFromMatrixScale(root.matrixWorld);

    // Where the head lands on screen.
    const head = new V().setFromMatrixPosition(e.model.bones[5].matrixWorld);
    const ndc = head.clone().project(cam);

    // Anything solid between the eye and his chest?
    const chest = new V(wp.x, wp.y + 1.2, wp.z);
    const dir = new V().subVectors(chest, cam.position);
    const dist = dir.length();
    dir.normalize();
    const hit = physics?.ready
      ? physics.raycast(cam.position, dir, { maxDistance: dist - 0.3 })
      : null;

    let lo = [1e9, 1e9, 1e9];
    let hi = [-1e9, -1e9, -1e9];
    let nan = 0;
    const meshInfo = [];
    root.traverse((c) => {
      if (!c.isMesh) return;
      const geo = c.geometry;
      const pos = geo.getAttribute('position');
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      meshInfo.push({
        type: c.type,
        visible: c.visible,
        tris: (geo.index ? geo.index.count : pos.count) / 3,
        frustumCulled: c.frustumCulled,
        layers: c.layers.mask,
        bs: c.boundingSphere
          ? [
              +c.boundingSphere.center.y.toFixed(2),
              +c.boundingSphere.radius.toFixed(2),
            ]
          : null,
        mats: mats.map((m) =>
          m ? `${m.name} op=${m.opacity} tr=${m.transparent} vis=${m.visible}` : 'NULL',
        ),
      });
      if (c.isSkinnedMesh && c.visible && c.getVertexPosition) {
        const v = new V();
        const step = Math.max(1, Math.floor(pos.count / 400));
        for (let i = 0; i < pos.count; i += step) {
          c.getVertexPosition(i, v);
          v.applyMatrix4(c.matrixWorld);
          if (!Number.isFinite(v.x + v.y + v.z)) {
            nan++;
            continue;
          }
          lo = [Math.min(lo[0], v.x), Math.min(lo[1], v.y), Math.min(lo[2], v.z)];
          hi = [Math.max(hi[0], v.x), Math.max(hi[1], v.y), Math.max(hi[2], v.z)];
        }
      }
    });

    out.soldiers.push({
      id: e.id,
      archetype: e.archetype.id,
      variant: e.variantIndex,
      state: e.behavior.state,
      quality: e.quality,
      detail: e.model.detail,
      parent: root.parent ? `${root.parent.type}:${root.parent.name || '?'}` : 'NONE',
      rootVisible: root.visible,
      feet: [+e.feet.x.toFixed(2), +e.feet.y.toFixed(2), +e.feet.z.toFixed(2)],
      worldPos: [+wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2)],
      scale: [+scale.x.toFixed(2), +scale.y.toFixed(2), +scale.z.toFixed(2)],
      distToCam: +wp.distanceTo(cam.position).toFixed(2),
      headWorld: [+head.x.toFixed(2), +head.y.toFixed(2), +head.z.toFixed(2)],
      headNdc: [+ndc.x.toFixed(3), +ndc.y.toFixed(3), +ndc.z.toFixed(3)],
      onScreen: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z > -1 && ndc.z < 1,
      screenPx: [
        Math.round(((ndc.x + 1) / 2) * g.renderer.domElement.width),
        Math.round(((1 - ndc.y) / 2) * g.renderer.domElement.height),
      ],
      occludedBy: hit ? `${hit.userData?.kind ?? '?'} @${hit.distance.toFixed(2)}m of ${dist.toFixed(2)}m` : null,
      skinLo: lo.map((v) => (v > 1e8 ? null : +v.toFixed(2))),
      skinHi: hi.map((v) => (v < -1e8 ? null : +v.toFixed(2))),
      heightFromSkin: hi[1] > -1e8 ? +(hi[1] - lo[1]).toFixed(3) : null,
      nanVerts: nan,
      meshInfo,
    });
  }

  out.stats = ai.debugStats ? ai.debugStats() : null;
  out.render = { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
  return out;
}, { range: DIST_M, shot: process.env.SHOT || '', posed: process.env.POSED !== '0' });

console.log(JSON.stringify(report, null, 2));
await writeFile(`${OUT}/${TAG}_report.json`, JSON.stringify(report, null, 2), 'utf8');
const cdp = await page.context().newCDPSession(page);
const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
await writeFile(`${OUT}/${TAG}.png`, Buffer.from(data, 'base64'));
await writeFile(`${OUT}/${TAG}_console.log`, logs.join('\n') || '(clean)', 'utf8');
console.log('\n--- console ---\n' + logs.slice(-25).join('\n'));
await browser.close();
kill();
