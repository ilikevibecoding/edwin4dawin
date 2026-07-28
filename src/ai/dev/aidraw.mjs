#!/usr/bin/env node
/**
 * What a squad costs to draw.
 *
 * Reports the marginal render cost of the enemies rather than the frame total,
 * by sampling `renderer.info` with the squad visible and again with every
 * soldier root hidden. The difference is the honest number: it includes the
 * shadow passes they cast into, which a count of material groups does not.
 *
 * Sampled from a `requestAnimationFrame` callback registered after the engine's,
 * because the engine resets the counters at the top of its own frame — read from
 * inside a system update, they are always zero.
 *
 * Usage: node src/ai/dev/aidraw.mjs [--count 12] [--range 12] [--quality high]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};

const ROOT = '/workspace';
const DIST = arg('dist', 'dist-ai');
const PORT = Number(arg('port', '4207'));
const COUNT = Number(arg('count', '12'));
const DISTANCE = Number(arg('range', '12'));
const QUALITY = arg('quality', 'high');

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
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('console', (m) => {
  if (m.text().startsWith('[ai]')) console.log(`  ${m.text()}`);
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

await page.goto(`${base}?quality=${QUALITY}&capture=1&aidebug=1&aicount=${COUNT}&aidist=${DISTANCE}`, {
  waitUntil: 'load',
  timeout: 180000,
});
await page.waitForFunction(() => window.GAME_READY === true, { timeout: 300000 });
await page.waitForTimeout(12000);

// A frame sampler that keeps the last few frames of counters.
await page.evaluate(() => {
  window.__DRAW = [];
  const tick = () => {
    const r = window.GAME.renderer.info.render;
    window.__DRAW.push({ calls: r.calls, triangles: r.triangles, lines: r.lines });
    if (window.__DRAW.length > 40) window.__DRAW.shift();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

const sample = async (frames) => {
  await page.evaluate(() => {
    window.__DRAW.length = 0;
  });
  await page.waitForFunction((n) => window.__DRAW.length >= n, frames, {
    timeout: 180000,
    polling: 200,
  });
  const rows = await page.evaluate(() => window.__DRAW.slice());
  return {
    calls: median(rows.map((r) => r.calls)),
    triangles: median(rows.map((r) => r.triangles)),
    frames: rows.length,
  };
};

const setVisible = (visible) =>
  page.evaluate((v) => {
    const ai = window.GAME.tryGet('ai');
    let n = 0;
    for (const enemy of ai.director.all) {
      if (!enemy.isAlive) continue;
      enemy.model.root.visible = v;
      n++;
    }
    return n;
  }, visible);

const restage = async () => {
  const placed = await page.evaluate(
    (o) => window.GAME.tryGet('ai').debugLineup(o),
    { distance: DISTANCE, count: COUNT },
  );
  await page.waitForTimeout(2500);
  return placed;
};

const placed = await restage();
const info = await page.evaluate(() => {
  const ai = window.GAME.tryGet('ai');
  const rows = [];
  for (const enemy of ai.director.all) {
    if (!enemy.isAlive) continue;
    const m = enemy.model;
    let groups = 0;
    let tris = 0;
    m.root.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      groups += Math.max(1, o.geometry.groups?.length ?? 1);
      const index = o.geometry.index;
      tris += (index ? index.count : o.geometry.attributes.position.count) / 3;
    });
    rows.push({
      archetype: enemy.archetype?.id ?? '?',
      variant: m.variant.name,
      lod: m.detail,
      tris: m.liveTriangles,
      meshGroups: groups,
      liveTris: tris,
    });
  }
  return { rows, stats: ai.debugStats(), quality: window.GAME.config?.quality ?? null };
});

const shown = await sample(12);
const hidden0 = await setVisible(false);
const hiddenSample = await sample(12);
await setVisible(true);
const shownAgain = await sample(12);

console.log(`\nplaced=${placed} alive=${hidden0} quality=${info.quality}`);
console.log(`per-enemy: ${JSON.stringify(info.rows, null, 0)}`);
console.log(`ai stats: ${JSON.stringify(info.stats)}`);
console.log(`\nvisible      calls=${shown.calls} tris=${shown.triangles}`);
console.log(`hidden       calls=${hiddenSample.calls} tris=${hiddenSample.triangles}`);
console.log(`visible#2    calls=${shownAgain.calls} tris=${shownAgain.triangles}`);
const dCalls = Math.round((shown.calls + shownAgain.calls) / 2) - hiddenSample.calls;
const dTris = Math.round((shown.triangles + shownAgain.triangles) / 2) - hiddenSample.triangles;
console.log(
  `\ndelta for ${hidden0} soldiers: calls=${dCalls} (${(dCalls / Math.max(1, hidden0)).toFixed(2)}/soldier) ` +
    `tris=${dTris} (${Math.round(dTris / Math.max(1, hidden0))}/soldier)`,
);

await browser.close();
kill();
