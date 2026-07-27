#!/usr/bin/env node
/**
 * AI cost measurement.
 *
 * Times `AISystem.update` itself rather than the frame, because in a headless
 * software rasteriser the frame time is entirely the renderer and says nothing
 * about the AI. The window is deliberately tiny for the same reason: a 320x180
 * viewport gets the GPU out of the way so the loop runs fast enough to collect a
 * usable number of samples per population.
 *
 * Usage: node src/ai/dev/aiperf.mjs [--counts 4,8,16,24,32] [--samples 150]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};

const ROOT = '/workspace';
const OUT = `${ROOT}/${arg('out', 'shots/ai')}`;
const DIST = arg('dist', 'dist-ai');
const PORT = Number(arg('port', '4198'));
const COUNTS = arg('counts', '4,8,16,24,32').split(',').map(Number);
const SAMPLES = Number(arg('samples', '150'));

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
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const logs = [];
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || m.text().startsWith('[ai]')) logs.push(`[${t}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(`${base}?quality=low&capture=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
await page.waitForTimeout(6000);

// Hook the AI system's update so every call is timed at source, and take the
// software rasteriser out of the frame: presented at 320x180 it still costs tens
// of milliseconds, which drags the simulation down to ~10 Hz and changes how much
// staggered work lands in each call. With presentation skipped the loop runs at
// the browser's 60 Hz vsync, which is the rate the numbers need to describe.
await page.evaluate((present) => {
  const engine = window.GAME;
  const ai = engine.tryGet('ai');
  window.__AI_PERF = { samples: [], agents: [], dt: [] };
  if (!present) {
    window.__AI_RENDER_HOOK = engine.renderHook;
    engine.renderHook = () => {};
    engine.setAdaptiveResolution(false);
  }
  const original = ai.update.bind(ai);
  ai.update = (dt, ctx) => {
    const t0 = performance.now();
    original(dt, ctx);
    const perf = window.__AI_PERF;
    perf.samples.push(performance.now() - t0);
    perf.agents.push(ai.director.aliveCount);
    perf.dt.push(dt);
  };
  ai.setDifficulty('veteran');
  ai.setSpawningEnabled(true);
}, process.argv.includes('--present'));

const stat = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const sum = s.reduce((p, c) => p + c, 0);
  return {
    n: s.length,
    mean: +(sum / s.length).toFixed(3),
    median: +s[Math.floor(s.length / 2)].toFixed(3),
    p95: +s[Math.min(s.length - 1, Math.floor(s.length * 0.95))].toFixed(3),
    max: +s[s.length - 1].toFixed(3),
  };
};

/** Least squares through (agents, ms) to separate marginal from fixed cost. */
const fit = (rows) => {
  if (rows.length < 2) return { msPerAgent: 0, msFixed: 0 };
  const n = rows.length;
  const sx = rows.reduce((p, r) => p + r.agents, 0);
  const sy = rows.reduce((p, r) => p + r.mean, 0);
  const sxx = rows.reduce((p, r) => p + r.agents * r.agents, 0);
  const sxy = rows.reduce((p, r) => p + r.agents * r.mean, 0);
  const slope = (n * sxy - sx * sy) / Math.max(1e-9, n * sxx - sx * sx);
  return { msPerAgent: slope, msFixed: (sy - slope * sx) / n };
};

const collect = async (count, mode) => {
  await page.evaluate(
    ([n, mode]) => {
      const g = window.GAME;
      const ai = g.tryGet('ai');
      window.__AI_MODE = mode;

      if (mode === 'firefight') {
        // Ring every agent around the player with line of sight, so all of them
        // are in combat at near level-of-detail from the first frame. This is the
        // worst case the module can be put in, not a plausible fight.
        const world = g.get('world');
        const player = g.tryGet('player');
        ai.setSpawningEnabled(false);
        ai.director.maxAlive = Math.max(ai.director.maxAlive, n + 4);
        ai.director.targetAlive = 0;
        ai.director.clear(ai.bb);
        const centre = window.__AI_ARENA;
        player.teleport(g.camera.position.clone().set(centre.x, centre.y + 0.05, centre.z), 0);
        const V = g.camera.position.constructor;
        const at = new V();
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2;
          const radius = 11 + (i % 4) * 3.5;
          const x = centre.x + Math.cos(angle) * radius;
          const z = centre.z + Math.sin(angle) * radius;
          const y = world.sampleGround(x, z);
          if (y === null) continue;
          at.set(x, y, z);
          ai.spawnEnemy(at, Math.atan2(centre.x - x, centre.z - z) + Math.PI, undefined);
        }
        ai.alertAll(g.camera.position, 220, 1);
        return;
      }

      ai.setSpawningEnabled(true);
      ai.director.maxAlive = Math.max(ai.director.maxAlive, n);
      ai.director.targetAlive = n;
      // Alerting the map is what puts everyone in the expensive states; without
      // it most of the population is patrolling and the number is meaningless as
      // a worst case. The main camera sits at the player's eye, so it is the
      // contact point.
      if (mode === 'engaged') ai.alertAll(g.camera.position, 220, 1);
    },
    [count, mode],
  );

  try {
    await page.waitForFunction(
      (n) => window.GAME.tryGet('ai').director.aliveCount >= n,
      count,
      { timeout: 120000, polling: 250 },
    );
  } catch {}

  // Re-alert on a timer through the sample window so the fight does not decay
  // back to a search while we are measuring, and hold the player up so a ring of
  // riflemen does not kill them and respawn them out of the arena.
  await page.evaluate(() => {
    window.__AI_PERF = { samples: [], agents: [], dt: [] };
    clearInterval(window.__AI_HOT_TIMER);
    if (window.__AI_MODE === 'patrol') return;
    const firefight = window.__AI_MODE === 'firefight';
    window.__AI_HOT_TIMER = setInterval(() => {
      const g = window.GAME;
      const ai = g.tryGet('ai');
      ai.alertAll(g.camera.position, 220, 1);
      if (!firefight) return;
      const entity = g.tryGet('player').entity;
      entity.health = entity.maxHealth;
    }, firefight ? 120 : 1500);
  });
  try {
    await page.waitForFunction((n) => window.__AI_PERF.samples.length >= n, SAMPLES, {
      timeout: 180000,
      polling: 250,
    });
  } catch {}
  await page.evaluate(() => clearInterval(window.__AI_HOT_TIMER));

  const raw = await page.evaluate(() => {
    const ai = window.GAME.tryGet('ai');
    const perf = window.__AI_PERF;
    return {
      samples: perf.samples,
      agents: perf.agents,
      dt: perf.dt,
      stats: ai.debugStats(),
    };
  });
  const agents = raw.agents.length
    ? +(raw.agents.reduce((p, c) => p + c, 0) / raw.agents.length).toFixed(1)
    : 0;
  const timing = stat(raw.samples.length ? raw.samples : [0]);
  const row = {
    mode,
    requested: count,
    agents,
    ...timing,
    perAgent: agents > 0 ? +(timing.mean / agents).toFixed(4) : 0,
    simHz: +(1 / (raw.dt.reduce((p, c) => p + c, 0) / Math.max(1, raw.dt.length))).toFixed(1),
    states: raw.stats.states,
    triangles: raw.stats.triangles,
    lod: `${raw.stats.lodNear}/${raw.stats.lodMid}/${raw.stats.lodFar}`,
  };
  console.log(JSON.stringify(row));
  return row;
};

// Somewhere open enough to put a ring of agents with line of sight on the player.
await page.evaluate(() => {
  const g = window.GAME;
  const world = g.get('world');
  const physics = g.get('physics');
  const V = g.camera.position.constructor;
  const from = new V();
  const to = new V();
  let best = null;
  for (let x = -30; x <= 30; x += 4) {
    for (let z = -30; z <= 30; z += 4) {
      const y = world.sampleGround(x, z);
      if (y === null) continue;
      from.set(x, y + 1.6, z);
      let seen = 0;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const sx = x + Math.cos(a) * 14;
        const sz = z + Math.sin(a) * 14;
        const sy = world.sampleGround(sx, sz);
        if (sy === null) continue;
        to.set(sx, sy + 1.5, sz);
        if (physics.lineOfSight(from, to)) seen++;
      }
      if (!best || seen > best.seen) best = { x, y, z, seen };
    }
  }
  window.__AI_ARENA = best ?? { x: 0, y: world.sampleGround(0, 0) ?? 0, z: 0, seen: 0 };
});
console.log(`arena ${JSON.stringify(await page.evaluate(() => window.__AI_ARENA))}`);

// The population sweeps walk upwards: the director tops up to `targetAlive` but
// never culls down to it, so lowering the target would leave the previous
// population in place and every row would measure the same number of agents.
const clearAll = () =>
  page.evaluate(() => {
    const ai = window.GAME.tryGet('ai');
    ai.director.targetAlive = 0;
    ai.director.clear(ai.bb);
  });

const patrol = [];
for (const count of COUNTS) patrol.push(await collect(count, 'patrol'));
await clearAll();
const engaged = [];
for (const count of COUNTS) engaged.push(await collect(count, 'engaged'));
await clearAll();
const firefight = [];
for (const count of COUNTS) firefight.push(await collect(count, 'firefight'));

const round = (f) => ({
  msPerAgent: +f.msPerAgent.toFixed(4),
  msFixed: +f.msFixed.toFixed(3),
});
const budget = (f, ms) => (f.msPerAgent > 0 ? Math.floor((ms - f.msFixed) / f.msPerAgent) : null);
const fits = { patrol: fit(patrol), engaged: fit(engaged), firefight: fit(firefight) };
const summary = {
  patrol,
  engaged,
  firefight,
  fit: {
    patrol: round(fits.patrol),
    engaged: round(fits.engaged),
    firefight: round(fits.firefight),
  },
  // 4 ms is a realistic share of a 16.7 ms frame for enemy AI in a game that also
  // has to render; 8 ms is the point where AI owns half the frame.
  agentsIn4ms: {
    patrol: budget(fits.patrol, 4),
    engaged: budget(fits.engaged, 4),
    firefight: budget(fits.firefight, 4),
  },
  agentsIn8ms: {
    patrol: budget(fits.patrol, 8),
    engaged: budget(fits.engaged, 8),
    firefight: budget(fits.firefight, 8),
  },
};
console.log(`\n${JSON.stringify(summary.fit)}`);
console.log(`agentsIn4ms=${JSON.stringify(summary.agentsIn4ms)}`);
console.log(`agentsIn8ms=${JSON.stringify(summary.agentsIn8ms)}`);
await writeFile(`${OUT}/perf.json`, JSON.stringify(summary, null, 2), 'utf8');
if (logs.length) console.log(logs.slice(0, 8).join('\n'));
await browser.close();
kill();
