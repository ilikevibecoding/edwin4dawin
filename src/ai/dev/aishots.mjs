#!/usr/bin/env node
/**
 * Soldier visual QA.
 *
 * A character model cannot be reviewed from source, and in a headless build there
 * is no way to walk up to one. This teleports the player to an open spot, poses a
 * line-up in front of the camera with `AISystemImpl.debugLineup`, and captures a
 * fixed set of framings: whole line-up, close-ups, a turntable, and a live fight.
 *
 * Usage: node src/ai/dev/aishots.mjs [--out shots/ai] [--dist dist-ai] [--live]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { statSync } from 'node:fs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

const ROOT = '/workspace';
const OUT = `${ROOT}/${arg('out', 'shots/ai')}`;
const DIST = arg('dist', 'dist-ai');
const PORT = Number(arg('port', '4199'));
const WIDTH = Number(arg('width', '1280'));
const HEIGHT = Number(arg('height', '720'));

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
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
const logs = [];
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || t === 'warning' || m.text().startsWith('[ai]')) logs.push(`[${t}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));

await page.goto(`${base}?quality=${arg('quality', 'low')}&capture=1`, {
  waitUntil: 'load',
  timeout: 120000,
});
try {
  await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
} catch {
  logs.push('[harness] GAME_READY never became true');
  await page.screenshot({ path: `${OUT}/00_boot_failure.png` });
  await writeFile(`${OUT}/console.log`, logs.join('\n'), 'utf8');
  await browser.close();
  kill();
  process.exit(1);
}
await page.waitForTimeout(Number(arg('settle', '9000')));

/**
 * Sets the camera up for inspection: open ground, sun behind the shoulder so the
 * subject's front is lit, and the first-person weapon out of the frame.
 */
const placement = await page.evaluate((hideViewmodel) => {
  const g = window.GAME;
  const player = g.tryGet('player');
  const world = g.get('world');
  const physics = g.get('physics');
  const V = g.camera.position.constructor;
  const from = new V();
  const to = new V();
  const sun = world.sunDirection;
  // Face away from the sun, so everything placed in front of the camera is lit
  // from the front rather than silhouetted.
  const yaw = Math.atan2(sun.x, sun.z);
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);

  // Look for open ground that the sun actually reaches, with room in front and no
  // step in the floor for the subject to stand on.
  const open = (x, y, z) => {
    from.set(x, y + 1.6, z);
    to.copy(from).addScaledVector(sun, 120);
    if (!physics.lineOfSight(from, to)) return false;
    // Straight up as well: a sun ray can slip under an awning that still darkens
    // everything under it, and it proves the camera is not inside a building.
    to.set(x, y + 45, z);
    return physics.lineOfSight(from, to);
  };

  let best = null;
  for (let x = -34; x <= 34; x += 3) {
    for (let z = -34; z <= 34; z += 3) {
      const y = world.sampleGround(x, z);
      if (y === null || !open(x, y, z)) continue;
      let clearance = 0;
      for (let d = 2; d <= 20; d += 2) {
        const sx = x + fx * d;
        const sz = z + fz * d;
        const sy = world.sampleGround(sx, sz);
        if (sy === null || Math.abs(sy - y) > 0.35 || !open(sx, sy, sz)) break;
        from.set(x, y + 1.6, z);
        to.set(sx, sy + 1.0, sz);
        if (!physics.lineOfSight(from, to)) break;
        clearance = d;
      }
      // Prefer the middle of the map: the edges are back walls and dead ground.
      const score = clearance - 0.04 * Math.hypot(x, z);
      if (!best || score > best.score) best = { x, z, y, clearance, score };
    }
  }
  const spot = best ?? { x: 0, z: 14, y: world.sampleGround(0, 14) ?? 0, clearance: 0 };
  player.teleport(g.camera.position.clone().set(spot.x, spot.y + 0.05, spot.z), yaw);
  g.tryGet('ai').setSpawningEnabled(false);
  if (hideViewmodel) g.viewScene.visible = false;
  return {
    spot: [spot.x, +spot.y.toFixed(2), spot.z],
    clearance: spot.clearance,
    yaw: +yaw.toFixed(3),
    sun: [+sun.x.toFixed(2), +sun.y.toFixed(2), +sun.z.toFixed(2)],
  };
}, !flag('viewmodel'));
console.log(`placement ${JSON.stringify(placement)}`);
await page.waitForTimeout(1400);

/**
 * Screen-space box around every posed soldier, padded, in a 16:9 aspect.
 *
 * The game runs an 80 degree vertical field of view, so a soldier two metres away
 * still only occupies half the frame height and reads as a thumbnail. Capturing
 * large and cropping to the subject is the only way to actually see the model.
 */
const subjectBox = (pad, focus) =>
  page.evaluate(
    ([pad, vw, vh, focus]) => {
      const g = window.GAME;
      const camera = g.camera;
      const points = [];
      const heights = focus ?? [0, 0.9, 1.85];
      g.scene.traverse((o) => {
        if (o.name !== 'ai_soldier' || !o.visible) return;
        const p = o.position;
        for (const h of heights) points.push({ x: p.x, y: p.y + h, z: p.z });
      });
      if (!points.length) return null;
      const V = camera.position.constructor;
      const v = new V();
      let lo = [Infinity, Infinity];
      let hi = [-Infinity, -Infinity];
      for (const p of points) {
        v.set(p.x, p.y, p.z).project(camera);
        if (v.z < -1 || v.z > 1) continue;
        const sx = (v.x * 0.5 + 0.5) * vw;
        const sy = (1 - (v.y * 0.5 + 0.5)) * vh;
        lo = [Math.min(lo[0], sx), Math.min(lo[1], sy)];
        hi = [Math.max(hi[0], sx), Math.max(hi[1], sy)];
      }
      if (!Number.isFinite(lo[0])) return null;
      // Never crop below this: a 120 px tall clip of a head is technically a
      // close-up and practically unreadable.
      let w = Math.max(560, (hi[0] - lo[0]) * (1 + pad));
      let h = Math.max(315, (hi[1] - lo[1]) * (1 + pad));
      const cx = (lo[0] + hi[0]) * 0.5;
      const cy = (lo[1] + hi[1]) * 0.5;
      // Hold 16:9 so the crops are comfortable to look at.
      if (w / h < 16 / 9) w = (h * 16) / 9;
      else h = (w * 9) / 16;
      const x = Math.max(0, Math.min(vw - 1, Math.round(cx - w / 2)));
      const y = Math.max(0, Math.min(vh - 1, Math.round(cy - h / 2)));
      return {
        x,
        y,
        width: Math.max(64, Math.min(vw - x, Math.round(w))),
        height: Math.max(36, Math.min(vh - y, Math.round(h))),
      };
    },
    [pad, WIDTH, HEIGHT, focus ?? null],
  );

/**
 * Waits for the simulation to advance, not for wall-clock time.
 *
 * Software rasterisation runs this scene at around a frame a second, so a fixed
 * `waitForTimeout` after posing a line-up photographs blends that are two frames
 * old: half-crouched, weapon half-raised. Counting AI frames instead means the
 * poses in the captures are the poses the game actually holds.
 */
const advance = async (frames) => {
  const start = await page.evaluate(() => window.GAME.tryGet('ai').bb.frame);
  try {
    await page.waitForFunction(
      ([from, n]) => window.GAME.tryGet('ai').bb.frame - from >= n,
      [start, frames],
      { timeout: 60000, polling: 250 },
    );
  } catch {
    console.log(`  (only ${(await page.evaluate(() => window.GAME.tryGet('ai').bb.frame)) - start} frames)`);
  }
};

const shoot = async (name, setup, wait = 1500, crop = 0, focus = null) => {
  const info = await page.evaluate(setup);
  await advance(Number(arg('frames', '14')));
  await page.waitForTimeout(wait);
  const file = `${OUT}/${name}.png`;
  const clip = crop > 0 ? await subjectBox(crop, focus) : null;
  // Chrome occasionally hands back a cleared surface instead of the last frame.
  // A blank frame compresses to almost nothing, so size is a reliable tell.
  let size = 0;
  const minimum = clip ? Math.max(4000, (clip.width * clip.height) / 90) : 60000;
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.screenshot(clip ? { path: file, clip } : { path: file });
    size = statSync(file).size;
    if (size > minimum) break;
    await page.waitForTimeout(900);
  }
  console.log(`  ${name} ${Math.round(size / 1024)}kB ${info === undefined ? '' : JSON.stringify(info)}`);
  if (flag('trace')) {
    const where = await page.evaluate(() => {
      const g = window.GAME;
      const ai = g.tryGet('ai');
      const f = (v) => [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
      const dir = g.camera.getWorldDirection(g.camera.position.clone());
      const out = { cam: f(g.camera.position), dir: f(dir), agents: [] };
      try {
        for (const e of ai.director.all) {
          if (!e.live) continue;
          out.agents.push({
            a: e.archetype.id,
            feet: f(e.feet),
            d: +e.feet.distanceTo(g.camera.position).toFixed(2),
            ctrl: e.controller ? f(e.controller.position) : null,
          });
        }
      } catch (err) {
        out.err = String(err);
      }
      return out;
    });
    console.log(`     ${JSON.stringify(where)}`);
  }
};

const lineup = (opts) => page.evaluate((o) => window.GAME.tryGet('ai').debugLineup(o), opts);

// The whole line-up: five archetypes, five poses.
await shoot('10_lineup', () => window.GAME.tryGet('ai').debugLineup({ distance: 6 }), 1500, 0.25);
// Full body, close.
await shoot(
  '11_body',
  () => window.GAME.tryGet('ai').debugLineup({ distance: 2.4, count: 1, archetype: 'rifleman' }),
  1500,
  0.15,
);
// Head and shoulders: helmet, NVG mount, face, carrier, sling.
await shoot(
  '12_head',
  () => window.GAME.tryGet('ai').debugLineup({ distance: 1.15, count: 1, archetype: 'rusher' }),
  1500,
  0.6,
  [1.4, 1.62, 1.82],
);
// The other headgear layout, so both the worn and the pushed-up goggles get seen.
await shoot(
  '12b_head_alt',
  () => window.GAME.tryGet('ai').debugLineup({ distance: 1.15, count: 1, archetype: 'gunner' }),
  1500,
  0.6,
  [1.4, 1.62, 1.82],
);
// Crouch, which is the pose the AI spends most of a firefight in.
await shoot(
  '12c_crouch',
  () => window.GAME.tryGet('ai').debugLineup({ distance: 2.2, count: 3, crouch: true }),
  1800,
  0.2,
  [0, 0.7, 1.3],
);
// Turntable: front, both flanks, back.
await shoot(
  '13_turntable',
  () => window.GAME.tryGet('ai').debugLineup({ distance: 3.6, turntable: true }),
  1500,
  0.12,
);
// Variants side by side, to check a squad does not look cloned.
await shoot(
  '14_variants',
  () => window.GAME.tryGet('ai').debugLineup({ distance: 3.8, count: 4, archetype: 'rifleman' }),
  1500,
  0.12,
);
// Poses: low ready, shouldered, crouched behind cover, mid-reload.
await shoot('15_poses', () => window.GAME.tryGet('ai').debugLineup({ distance: 3.1, count: 4 }), 1500, 0.12);
// Mid distance, the range the player actually fights at.
await shoot('16_fighting_range', () => window.GAME.tryGet('ai').debugLineup({ distance: 14 }), 1500, 0.35);
// Far, where the low-detail body and the cheap animation path take over.
await shoot('17_far', () => window.GAME.tryGet('ai').debugLineup({ distance: 42 }), 1500, 0.6);
// Uncropped, for the record: what the player actually sees at six metres.
await shoot('18_full_frame', () => window.GAME.tryGet('ai').debugLineup({ distance: 6 }));

if (flag('live')) {
  // A live fight: senses and behaviour on, waves enabled, viewmodel back.
  await shoot(
    '20_live_contact',
    () => {
      const g = window.GAME;
      g.viewScene.visible = true;
      const ai = g.tryGet('ai');
      const n = ai.debugLineup({ distance: 19, live: true });
      ai.setSpawningEnabled(true);
      return n;
    },
    6000,
  );
  await shoot('21_live_fight', () => window.GAME.tryGet('ai').debugStats(), 8000);
  await shoot('22_live_later', () => window.GAME.tryGet('ai').debugStats(), 10000);
  await shoot('23_live_later2', () => window.GAME.tryGet('ai').debugStats(), 12000);
}
void lineup;

const perf = await page.evaluate(() => {
  const g = window.GAME;
  const ai = g.tryGet('ai');
  return {
    fps: Math.round((g.time?.fps ?? 0) * 10) / 10,
    drawCalls: g.renderer.info.render.calls,
    triangles: g.renderer.info.render.triangles,
    ai: ai.debugStats ? ai.debugStats() : null,
  };
});
console.log(`\nperf ${JSON.stringify(perf)}`);
await writeFile(`${OUT}/console.log`, logs.join('\n') || '(clean)', 'utf8');
console.log(`console issues: ${logs.length}`);
if (logs.length) console.log(logs.slice(0, 12).join('\n'));
await browser.close();
kill();
