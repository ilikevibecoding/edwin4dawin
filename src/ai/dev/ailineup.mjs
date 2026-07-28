#!/usr/bin/env node
/**
 * Line-up placement check.
 *
 * `?aidebug` is meant to keep a rank of soldiers in front of the camera wherever
 * the capture harness moves it, and two full capture runs came back with the rank
 * nowhere near the camera. A capture costs ten minutes and shows only the result;
 * this moves the camera the way a shot does and reports where the rank actually
 * went, so the answer is which of "never restaged", "restaged somewhere else" or
 * "restaged and was then replaced" is true.
 *
 * Usage: node src/ai/dev/ailineup.mjs [--dist 12] [--count 3]
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
const PORT = Number(arg('port', '4216'));
const RANGE = Number(arg('dist', '12'));
const COUNT = Number(arg('count', '3'));

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
} catch {}

const server = spawn(
  'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', arg('dist-dir', 'dist-ai')],
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
  ],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(`${base}?quality=medium&capture=1&aidebug=1&aidist=${RANGE}&aicount=${COUNT}`, {
  waitUntil: 'load',
  timeout: 120000,
});
await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
await page.waitForTimeout(3000);

const report = await page.evaluate(async ([range]) => {
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const shot = window.__SHOT__;
  const snap = (label) => {
    const eye = g.camera.position.clone();
    return {
      label,
      eye: [+eye.x.toFixed(1), +eye.y.toFixed(1), +eye.z.toFixed(1)],
      lineup: ai.lineup === null ? null : { distance: ai.lineup.distance, count: ai.lineup.count },
      ageFrames: ai.lineupAge,
      lineupEye: [+ai.lineupEye.x.toFixed(1), +ai.lineupEye.y.toFixed(1), +ai.lineupEye.z.toFixed(1)],
      spawning: ai.director.spawningEnabled,
      enemies: ai.director.all.map((e) => ({
        id: e.id,
        posed: e.posed,
        at: [+e.feet.x.toFixed(1), +e.feet.y.toFixed(1), +e.feet.z.toFixed(1)],
        range: +eye.distanceTo(e.feet).toFixed(1),
      })),
    };
  };
  const out = [snap('boot')];
  // The shot the capture uses to photograph models, run through the same entry
  // point the harness calls so the sequencing is identical.
  if (shot) {
    await shot('08b_enemies');
    out.push(snap('after 08b_enemies'));
  }
  return { range, out };
}, [RANGE]);

console.log(`asked for a rank of ${COUNT} at ${report.range} m\n`);
for (const s of report.out) {
  console.log(
    `${s.label}: eye=${JSON.stringify(s.eye)} lineup=${JSON.stringify(s.lineup)} ` +
      `ageFrames=${s.ageFrames} lastStagedFrom=${JSON.stringify(s.lineupEye)} spawning=${s.spawning}`,
  );
  for (const e of s.enemies) {
    console.log(`    #${e.id} posed=${e.posed} at=${JSON.stringify(e.at)} range=${e.range}m`);
  }
}
console.log('');
for (const line of logs.filter((l) => l.includes('[ai]') || l.startsWith('[error]') || l.startsWith('[pageerror]'))) {
  console.log(line);
}
await browser.close();
kill();
