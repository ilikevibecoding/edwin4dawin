#!/usr/bin/env node
/**
 * Spawn-placement diagnostic: for the rings the capture harness uses, report the
 * height the world hands back, the height the AI actually places the soldier at,
 * and where that lands relative to the shot's camera.
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const PORT = Number(process.env.PORT || 4213);
const DIST = process.env.DIST || 'dist-ai';
const ROOT = '/workspace';
const OUT = process.env.OUT || '/workspace/shots/aivis';
const TAG = process.env.TAG || 'spawn';

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
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));

await page.goto(`${base}?quality=low&capture=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
await page.waitForTimeout(3000);

const report = await page.evaluate(async () => {
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const world = g.tryGet('world');
  const player = g.tryGet('player');
  const V = g.camera.position.constructor;
  const out = { rings: [] };

  const frames = (n) =>
    new Promise((res) => {
      let left = Math.max(1, n);
      const step = () => (--left <= 0 ? res() : requestAnimationFrame(step));
      requestAnimationFrame(step);
    });

  ai.setSpawningEnabled(false);
  ai.director.clear(ai.bb);

  const nav = world.getNavLayers ? world.getNavLayers() : null;
  const navInfo = (x, z) => {
    if (!nav) return null;
    const cx = Math.floor((x - nav.originX) / nav.cellSize);
    const cz = Math.floor((z - nav.originZ) / nav.cellSize);
    const rows = [];
    for (let l = 0; l < nav.layerCount; l++) {
      rows.push(
        `L${l}:${nav.walkableAtCell(cx, cz, l) ? 'walk' : 'block'}@${nav.heightAtCell(cx, cz, l).toFixed(2)}`,
      );
    }
    return rows.join(' ');
  };

  const cases = [
    { name: '07_combat', eye: [2, 1.64, 26], look: [2, 1.8, -6], around: [2, 0, 4], count: 5, radius: 7 },
    { name: '08b_enemies', eye: [2, 1.64, 20], look: [2, 1.7, 6], around: [2, 0, 8], count: 4, radius: 4 },
    { name: '11_hud_full', eye: [2, 1.64, 26], look: [2, 1.9, -8], around: [2, 0, 2], count: 4, radius: 8 },
  ];

  for (const c of cases) {
    ai.director.clear(ai.bb);
    const ground = world.sampleGround(c.eye[0], c.eye[2]) ?? 0;
    const eye = new V(c.eye[0], ground + 1.64, c.eye[2]);
    const look = new V(...c.look);
    const d = new V().subVectors(look, eye);
    player.teleport(new V(eye.x, ground, eye.z), Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)));
    await frames(3);
    const cam = g.camera;
    cam.updateMatrixWorld(true);

    const ring = { name: c.name, camera: [+cam.position.x.toFixed(2), +cam.position.y.toFixed(2), +cam.position.z.toFixed(2)], points: [] };
    for (let i = 0; i < c.count; i++) {
      const angle = (i / c.count) * Math.PI * 2 + 0.4;
      const x = c.around[0] + Math.cos(angle) * c.radius;
      const z = c.around[2] + Math.sin(angle) * c.radius;
      const y = world.sampleGround(x, z);
      const row = {
        xz: [+x.toFixed(2), +z.toFixed(2)],
        sampleGround: y === null ? null : +y.toFixed(2),
        nav: navInfo(x, z),
      };
      if (y !== null && y !== undefined) {
        const e = ai.spawnEnemy(new V(x, y, z), angle + Math.PI);
        if (e) {
          row.placedFeet = [+e.feet.x.toFixed(2), +e.feet.y.toFixed(2), +e.feet.z.toFixed(2)];
          const head = new V(e.feet.x, e.feet.y + 1.6, e.feet.z);
          const ndc = head.clone().project(cam);
          row.ndc = [+ndc.x.toFixed(2), +ndc.y.toFixed(2)];
          row.onScreen = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z < 1;
          row.dist = +head.distanceTo(cam.position).toFixed(1);
        } else {
          row.placedFeet = 'REJECTED';
        }
      }
      ring.points.push(row);
    }
    await frames(2);
    // Where they are one tick later, before behaviour has moved them far.
    ring.afterTick = ai.director.all.map((e) => [+e.feet.x.toFixed(2), +e.feet.y.toFixed(2), +e.feet.z.toFixed(2)]);
    out.rings.push(ring);
  }
  return out;
});

console.log(JSON.stringify(report, null, 2));
await writeFile(`${OUT}/${TAG}_report.json`, JSON.stringify(report, null, 2), 'utf8');
await browser.close();
kill();
