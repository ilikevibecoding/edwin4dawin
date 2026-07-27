// Attribute the frame cost: shadow pass versus everything else.  (owner: opus4)
//
// `artifacts/performance.json` shows a wall-clock frame cost that is strongly
// bimodal — median 13 ms, p95 179 ms, max 394 ms — while the game's own CPU time
// stays under 3 ms. `engine.render()` only refreshes the sun's shadow map on
// `frame % shadowRefreshInterval === 0`, which is the obvious suspect, and the
// room audit inherits the same bimodality depending on whether its sample window
// happened to contain a refresh.
//
// This prints every individual frame with its refresh phase, then measures the
// same room with the shadow map pinned on and pinned off, so the shadow share is
// a measurement rather than an inference.
//
//   node tools/shadowcost.mjs [--quality medium] [--rooms lobby,conference]

import { parseArgs, startServer, openGame, writeJson } from './lib/session.mjs';

const args = parseArgs();
const QUALITY = String(args.quality || 'medium');
const ROOMS = String(args.rooms || 'lobby,conference,serverroom,openoffice').split(',');
const FRAMES = Number(args.frames || 16);

const log = (...p) => process.stdout.write(`${p.join(' ')}\n`);
const num = (v, d = 1) => (typeof v === 'number' ? v.toFixed(d) : '—');

/**
 * Time `count` single frames, tagging each with its shadow-refresh phase and
 * with how many new GL programs the frame had to compile. three.js links a
 * program per material-plus-lighting permutation the first time it is drawn, so
 * a jump in `info.programs.length` on an expensive frame is a compilation stall
 * rather than a rasterisation cost.
 */
const sampleFrames = (page, count) => page.evaluate((n) => {
  const engine = window.__NORTHSTAR__.engine;
  const renderer = engine.renderer;
  window.advanceTime(50); // warm: first frame in a room pays for uploads
  const out = [];
  let programs = renderer.info.programs?.length ?? 0;
  for (let i = 0; i < n; i++) {
    const phase = engine.frame % engine.shadowRefreshInterval;
    const t = performance.now();
    window.advanceTime(50);
    const ms = +(performance.now() - t).toFixed(2);
    const now = renderer.info.programs?.length ?? 0;
    out.push({
      ms,
      phase,
      shadowFrame: renderer.shadowMap.enabled && phase === 0,
      newPrograms: now - programs,
      programs: now,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    });
    programs = now;
  }
  return {
    samples: out,
    interval: engine.shadowRefreshInterval,
    shadowsEnabled: renderer.shadowMap.enabled,
    buffer: [renderer.domElement.width, renderer.domElement.height],
  };
}, count);

/** Frame cost with the shadow map forced on every frame, and forced off. */
const pinned = (page, on, count) => page.evaluate(([wantShadows, n]) => {
  const engine = window.__NORTHSTAR__.engine;
  const renderer = engine.renderer;
  const wasEnabled = renderer.shadowMap.enabled;
  const wasAuto = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.enabled = wantShadows;
  renderer.shadowMap.autoUpdate = wantShadows;
  window.advanceTime(50);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    window.advanceTime(50);
    out.push(+(performance.now() - t).toFixed(2));
  }
  renderer.shadowMap.enabled = wasEnabled;
  renderer.shadowMap.autoUpdate = wasAuto;
  const calls = renderer.info.render.calls;
  out.sort((a, b) => a - b);
  return { median: out[out.length >> 1], mean: +(out.reduce((s, v) => s + v, 0) / out.length).toFixed(2), calls };
}, [on, count]);

const main = async () => {
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5177) });
  const g = await openGame({
    url: server.url,
    width: Number(args.width ?? 1920),
    height: Number(args.height ?? 1080),
    quality: QUALITY,
    resolutionScale: Number(args.scale ?? 0.75),
  });
  const { qa, advance, page } = g;
  const report = { quality: QUALITY, rooms: [] };

  try {
    await qa('forcePlay', { difficulty: 'operator', loadout: { primary: 'carbine' } });
    await page.waitForFunction(() => window.__NORTHSTAR__.state === 'playing', null, { timeout: 60_000 });
    await advance(700);
    await qa('freezeAI', true);
    await qa('godMode', true);

    for (const room of ROOMS) {
      const jump = await qa('teleport', room);
      if (!jump.ok) { log(`[shadow] skipped ${room}: ${jump.reason}`); continue; }
      await advance(400);

      const run = await sampleFrames(page, FRAMES);
      const shadowFrames = run.samples.filter((s) => s.shadowFrame);
      const plainFrames = run.samples.filter((s) => !s.shadowFrame);
      const mean = (xs) => (xs.length ? xs.reduce((s, v) => s + v.ms, 0) / xs.length : null);
      const on = await pinned(page, true, 6);
      const off = await pinned(page, false, 6);

      const row = {
        room,
        interval: run.interval,
        shadowsEnabled: run.shadowsEnabled,
        buffer: run.buffer,
        shadowFrameMeanMs: mean(shadowFrames) ? +mean(shadowFrames).toFixed(2) : null,
        plainFrameMeanMs: mean(plainFrames) ? +mean(plainFrames).toFixed(2) : null,
        ratio: mean(shadowFrames) && mean(plainFrames) ? +(mean(shadowFrames) / mean(plainFrames)).toFixed(1) : null,
        pinnedOnMedianMs: on.median,
        pinnedOffMedianMs: off.median,
        drawCallsWithShadows: on.calls,
        drawCallsWithout: off.calls,
        samples: run.samples,
      };
      report.rooms.push(row);
      log(`[shadow] ${room.padEnd(12)} buffer=${run.buffer.join('x')} interval=${run.interval}`
        + ` plain=${num(row.plainFrameMeanMs)}ms shadow=${num(row.shadowFrameMeanMs)}ms`
        + ` ratio=${row.ratio}x  pinned on=${num(on.median)}ms off=${num(off.median)}ms`
        + ` draws ${off.calls}->${on.calls}`);
      log(`[shadow]   per frame (*=shadow refresh, +N=new GL programs): `
        + run.samples.map((s) => `${s.shadowFrame ? '*' : ''}${s.ms}${s.newPrograms ? `+${s.newPrograms}` : ''}`).join(' '));
      const spikes = run.samples.filter((s) => s.ms > 100);
      if (spikes.length) {
        const compiling = spikes.filter((s) => s.newPrograms > 0).length;
        log(`[shadow]   ${spikes.length} frame(s) over 100 ms; ${compiling} of them compiled new programs`);
        row.spikes = spikes;
      }
    }

    writeJson('shadow-cost.json', report);
    const withShadow = report.rooms.map((r) => r.pinnedOnMedianMs).filter(Boolean);
    const without = report.rooms.map((r) => r.pinnedOffMedianMs).filter(Boolean);
    if (withShadow.length && without.length) {
      const avgOn = withShadow.reduce((a, b) => a + b, 0) / withShadow.length;
      const avgOff = without.reduce((a, b) => a + b, 0) / without.length;
      log(`[shadow] overall: ${num(avgOff)} ms without the shadow pass, ${num(avgOn)} ms with it`
        + ` — the pass is ${num((1 - avgOff / avgOn) * 100, 0)}% of a refresh frame`);
    }
  } finally {
    await g.close();
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
