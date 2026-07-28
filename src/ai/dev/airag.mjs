#!/usr/bin/env node
/**
 * Ragdoll photograph.
 *
 * `?aikill` fires from inside the AI update, which races the capture harness's
 * camera move: the rank is shot a frame after it is staged, and if that frame is
 * before the shot has finished posing the player the corpses end up thirty metres
 * from where the picture is taken. This drives the same two entry points by hand,
 * in order, with the camera already still — stage, wait, kill, wait, grab — so the
 * bodies are at a range where a bent limb can actually be seen.
 *
 * Usage: node src/ai/dev/airag.mjs [--dist 5] [--count 4] [--settle 40]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};

const ROOT = '/workspace';
const PORT = Number(arg('port', '4219'));
const RANGE = Number(arg('dist', '5'));
const COUNT = Number(arg('count', '4'));
const SETTLE = Number(arg('settle', '40'));
const QUALITY = arg('quality', 'high');
const OUT = arg('out', 'shots/airag');
const WIDTH = Number(arg('width', '1600'));
const HEIGHT = Number(arg('height', '900'));

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
} catch {}

const server = spawn(
  'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', arg('bundle', 'dist-ai')],
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
for (let i = 0; i < 150; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 400));
}

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
  ],
});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
const logs = [];
page.on('console', (m) => {
  if (m.text().startsWith('[ai]')) logs.push(m.text());
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(`${base}?quality=${QUALITY}&capture=1&aidebug=1&aidist=${RANGE}&aicount=${COUNT}`, {
  waitUntil: 'load',
  timeout: 180000,
});
await page.waitForFunction(() => window.GAME_READY === true, { timeout: 300000 });

await mkdir(path.join(ROOT, OUT), { recursive: true });

// Frame counter, so every wait below is in rendered frames rather than wall clock:
// software rendering is about one frame a second and seconds mean nothing here.
await page.evaluate(() => {
  window.__F = 0;
  const tick = () => {
    window.__F++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const frames = async (n) => {
  const from = await page.evaluate(() => window.__F);
  await page.waitForFunction(([f, k]) => window.__F >= f + k, [from, n], {
    timeout: 600000,
    polling: 250,
  });
};

// Pose the street the way the model shot does, then take the camera off the
// harness so nothing moves it again once the rank is placed.
await page.evaluate(() => window.__SHOT__('08b_enemies'));
await page.evaluate(() => {
  window.GAME.ctx.time.timeScale = 1;
});
await frames(4);

const staged = await page.evaluate(
  ([range, count]) => {
    const ai = window.GAME.tryGet('ai');
    // Placed by hand and then left alone: `restageLineup` only fires on camera
    // movement, and the camera is now still.
    const placed = ai.debugLineup({ distance: range, count });
    return { placed, eye: window.GAME.camera.position.toArray().map((n) => +n.toFixed(1)) };
  },
  [RANGE, COUNT],
);
await frames(12);
await page.screenshot({ path: path.join(ROOT, OUT, 'before.png') });

const killed = await page.evaluate(() => {
  const ai = window.GAME.tryGet('ai');
  ai.killLineup();
  return ai.director.all.length;
});

const series = [];
for (const stop of [3, 8, 16, SETTLE]) {
  await frames(stop === 3 ? 3 : 5);
  const row = await page.evaluate(() => {
    const ai = window.GAME.tryGet('ai');
    const out = [];
    for (const e of ai.director.all) {
      if (!e.dying) continue;
      const hips = e.model.bones[0].matrixWorld.elements;
      out.push({
        id: e.id,
        rag: e.ragdoll ? (e.ragdoll.settled ? 'settled' : 'active') : e.ragdollAbandoned ? 'abandoned' : 'none',
        fault: e.ragdollFault || null,
        hip: [+hips[12].toFixed(2), +hips[13].toFixed(2), +hips[14].toFixed(2)],
        feet: [+e.feet.x.toFixed(2), +e.feet.y.toFixed(2), +e.feet.z.toFixed(2)],
      });
    }
    return out;
  });
  series.push({ stop, row });
}
await frames(6);
await page.screenshot({ path: path.join(ROOT, OUT, 'after.png') });

console.log(`staged ${JSON.stringify(staged)}  killed=${killed}`);
for (const s of series) {
  console.log(` +${s.stop} frames:`);
  for (const r of s.row) {
    console.log(
      `    #${r.id} ${r.rag}${r.fault ? ` fault=${r.fault}` : ''} hips=${JSON.stringify(r.hip)} feet=${JSON.stringify(r.feet)}`,
    );
  }
}
await writeFile(path.join(ROOT, OUT, 'report.json'), JSON.stringify({ staged, killed, series, logs }, null, 2));
console.log(`\n${logs.join('\n')}`);
console.log(`\nwrote ${OUT}/before.png and ${OUT}/after.png`);
await browser.close();
kill();
