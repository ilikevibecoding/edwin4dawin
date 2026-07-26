// Performance baseline harness (Opus 4). Produces the numbers in docs/perf-baseline.md.
//
// Two different things are measured, on purpose:
//
//  * Frame rate is sampled on a page WITHOUT the `test` query parameter, so the engine stays in
//    real-time mode and requestAnimationFrame drives both stepping and rendering. `__qa.perf()`
//    then reports a live fps alongside draw calls and triangle counts.
//  * Simulation cost is sampled with `test=1` and manual stepping, which isolates the fixed-step
//    update from rendering.
//
// Rendering here goes through ANGLE/SwiftShader, a software rasteriser. Those frame rates are not
// predictive of any GPU; they are recorded for relative comparison between quality tiers only.
// Simulation cost, by contrast, is ordinary JavaScript and does carry over.
//
// Usage: node tools/perf-baseline.mjs [--json out.json] [--port 5187] [--seconds 5]
//                                     [--tiers high,medium,low]
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const PORT = +opt('--port', 5187);
const SAMPLE_SECONDS = +opt('--seconds', 5);
const JSON_OUT = opt('--json', null);
const BASE = `http://127.0.0.1:${PORT}`;
const SETTINGS_KEY = 'northstar.settings.v1';
const TIERS = opt('--tiers', 'high,medium,low').split(',');

// Vite's HMR client is stubbed so a concurrent edit to src/** cannot reload the page mid-sample.
const VITE_CLIENT_STUB = `
export const createHotContext = () => ({
  on() {}, off() {}, send() {}, accept() {}, acceptExports() {}, dispose() {}, prune() {},
  invalidate() {}, decline() {}, data: {},
});
export const updateStyle = () => {};
export const removeStyle = () => {};
export const injectQuery = (url) => url;
export class ErrorOverlay extends HTMLElement {}
export default {};
`;

const LAUNCH = {
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
};

function settingsFor(quality) {
  return {
    quality,
    resolutionScale: 1.0, // full 1080p: the baseline is about native resolution, not the test scale
    sensitivity: 1, invertY: false, fov: 75, crosshair: true, reducedMotion: false,
    volMaster: 0, volEffects: 0, volMusic: 0, volUI: 0,
  };
}

async function newPage(browser, quality) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.route('**/@vite/client', (r) => r.fulfill({
    contentType: 'application/javascript', body: VITE_CLIENT_STUB,
  }));
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value),
    [SETTINGS_KEY, JSON.stringify(settingsFor(quality))]);
  return page;
}

/** Boot-to-title wall time, nav bake time, and the cost of a mission reset. */
async function bootAndResetTimings(browser, quality) {
  const page = await newPage(browser, quality);
  const t0 = Date.now();
  await page.goto(`${BASE}/?qa=1&test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120_000 });
  const bootToTitleMs = Date.now() - t0;

  await page.evaluate(() => window.advanceTime(1));
  await page.evaluate(() => { window.__game.engine.running = false; });
  const nav = await page.evaluate(() => window.__qa.navStats());

  // Mission reset is measured in-page so the number excludes CDP round-trip time.
  const resetMs = await page.evaluate(() => {
    window.__qa.quickStart('operator', null, 1337);
    window.advanceTime(500);
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      window.__qa.resetMission();
      samples.push(performance.now() - t);
    }
    samples.sort((a, b) => a - b);
    return +samples[1].toFixed(1);
  });

  // Stepped simulation cost with rendering excluded, plus how much of it is pathfinding.
  // Combat is sampled as a sequence of windows rather than a single number: hostiles that cannot
  // reach the player only start burning exhaustive searches once they have spread out, so the cost
  // ramps over the first several seconds of an engagement.
  const sim = await page.evaluate(() => {
    const g = window.__game, nav = g.mission.nav;
    const realRender = g.engine.renderFn;
    g.engine.renderFn = () => {};

    // Attribute time to A*, and separate reachable from unreachable requests by region id.
    const region = new Int32Array(nav.nodes.length).fill(-1);
    let regionCount = 0;
    const regionSizes = [];
    for (let i = 0; i < nav.nodes.length; i++) {
      if (region[i] >= 0) continue;
      const id = regionCount++;
      let size = 0;
      const stack = [i];
      region[i] = id;
      while (stack.length) {
        const cur = stack.pop();
        size++;
        for (const nb of nav.nodes[cur].edges) if (region[nb] < 0) { region[nb] = id; stack.push(nb); }
      }
      regionSizes.push(size);
    }
    // Every A* request is attributed three ways: total, requests that span floors (the expensive
    // shape, since the search has to round the stairwell), and requests that cannot succeed at all
    // because the endpoints sit in different nav regions (the NS-1 shape, which should now be nil).
    const blank = () => ({ calls: 0, ms: 0, worstMs: 0 });
    let pf = { all: blank(), crossFloor: blank(), unreachable: blank(), failed: blank() };
    const realFind = nav.findPath.bind(nav);
    const add = (b, dt) => { b.calls++; b.ms += dt; b.worstMs = Math.max(b.worstMs, dt); };
    nav.findPath = (a, b, cap) => {
      const t = performance.now();
      const r = realFind(a, b, cap);
      const dt = performance.now() - t;
      add(pf.all, dt);
      if (a >= 0 && b >= 0) {
        if (Math.abs(nav.nodes[a].y - nav.nodes[b].y) > 2) add(pf.crossFloor, dt);
        if (region[a] !== region[b]) add(pf.unreachable, dt);
      }
      if (!r) add(pf.failed, dt);
      return r;
    };

    const window2s = () => {
      pf = { all: blank(), crossFloor: blank(), unreachable: blank(), failed: blank() };
      const t = performance.now();
      window.advanceTime(2000);
      const wall = performance.now() - t;
      const pct = (b) => +((b.ms / wall) * 100).toFixed(1);
      return {
        msPerStep: +(wall / 240).toFixed(3),
        pathCalls: pf.all.calls,
        pathSharePct: pct(pf.all),
        pathWorstMs: +pf.all.worstMs.toFixed(2),
        crossFloorCalls: pf.crossFloor.calls,
        crossFloorSharePct: pct(pf.crossFloor),
        crossFloorWorstMs: +pf.crossFloor.worstMs.toFixed(2),
        unreachableCalls: pf.unreachable.calls,
        unreachableSharePct: pct(pf.unreachable),
        failedCalls: pf.failed.calls,
      };
    };

    window.__qa.resetMission();
    window.__qa.teleport('janitor');
    window.__qa.god(true);
    window.advanceTime(1000);
    const idle = window2s();

    window.__qa.resetMission();
    window.__qa.teleport('lobby');
    window.__qa.god(true);
    for (const e of g.mission.enemies) if (e.alive) e._enterCombat();
    window.advanceTime(500);
    const alerted = [window2s(), window2s(), window2s()];

    // Same engagement, but with the hostiles chasing a position on the other floor: the worst
    // routine case for pathfinding, because a route between floors has to go the long way round to
    // a stairwell and the A* heuristic (straight-line distance plus a doubled height term) pulls the
    // search towards the target's column instead. lastKnown is set here the way perception and
    // hearing set it, so the scenario is the ordinary one, just reached without waiting for a
    // sightline.
    window.__qa.resetMission();
    window.__qa.teleport('cubes'); // floor 2, y = 3.6
    window.__qa.god(true);
    const target = g.mission.player.pos.clone();
    for (const e of g.mission.enemies) {
      if (!e.alive) continue;
      e._enterCombat();
      e.lastKnown = target.clone();
    }
    window.advanceTime(1000);
    const crossFloor = [window2s(), window2s(), window2s()];
    const stranded = g.mission.enemies.filter((e) => e.alive).map((e) => {
      const idx = nav.nearestNode(e.pos.x, e.pos.y, e.pos.z);
      return idx < 0 ? 'off-navmesh' : region[idx];
    });
    const strandedCounts = {};
    for (const r of stranded) strandedCounts[r] = (strandedCounts[r] || 0) + 1;

    // VFX-heavy: everything the player can put in the air at once. Three smoke volumes (each ~14
    // animated billows for 16 s), a flash, and a weapon held down through the window so muzzle
    // flashes, tracers, casings and impact debris are all live. The magazine is topped up between
    // steps because the point is the particle load, not the ammo economy.
    window.__qa.resetMission();
    window.__qa.teleport('lobby');
    window.__qa.god(true);
    window.advanceTime(500);
    const p = g.mission.player;
    for (const [dx, dz] of [[2, -3], [-3, -2], [0, -6]]) {
      g.mission.vfx.smokeVolume({ x: p.pos.x + dx, y: p.pos.y + 0.2, z: p.pos.z + dz }, 4.2, 16);
    }
    g.mission.vfx.flashBurst({ x: p.pos.x + 1, y: p.pos.y + 1.2, z: p.pos.z - 4 });
    for (const e of g.mission.enemies) if (e.alive) e._enterCombat();
    // Attribute the window between particle updates, audio and everything else, because a headline
    // "ms per step" for a VFX scene says nothing about which subsystem to go and look at.
    const vfxSys = g.mission.vfx;
    let vfxMs = 0, vfxCalls = 0;
    const realVfxUpdate = vfxSys.update.bind(vfxSys);
    vfxSys.update = (dt, cam) => {
      const t = performance.now();
      const r = realVfxUpdate(dt, cam);
      vfxMs += performance.now() - t; vfxCalls++;
      return r;
    };

    window.__qa.mouse(0, true);
    const vfxWindow = () => {
      const arsenal = p.arsenal;
      vfxMs = 0; vfxCalls = 0;
      pf = { all: blank(), crossFloor: blank(), unreachable: blank(), failed: blank() };
      const t = performance.now();
      for (let i = 0; i < 20; i++) {
        if (arsenal.current.mag !== Infinity) arsenal.current.mag = arsenal.current.def.mag;
        window.advanceTime(100);
      }
      const wall = performance.now() - t;
      return {
        msPerStep: +(wall / 240).toFixed(3),
        vfxUpdateSharePct: +((vfxMs / wall) * 100).toFixed(1),
        vfxUpdateMsPerCall: vfxCalls ? +(vfxMs / vfxCalls).toFixed(3) : 0,
        pathSharePct: +((pf.all.ms / wall) * 100).toFixed(1),
        smokes: vfxSys.smokes.length,
        liveParticles: vfxSys.items.length,
        vfxSceneChildren: vfxSys.group.children.length,
        decals: vfxSys.decals.length,
        shotsFired: g.mission.stats.shots,
      };
    };
    const vfx = [vfxWindow(), vfxWindow(), vfxWindow()];
    window.__qa.mouse(0, false);
    vfxSys.update = realVfxUpdate;

    nav.findPath = realFind;
    g.engine.renderFn = realRender;
    return {
      idle,
      alerted,
      crossFloor,
      vfx,
      hostilesPerNavRegion: strandedCounts,
      enemies: g.mission.enemies.filter((e) => e.alive).length,
      navRegions: regionCount,
      navRegionSizes: regionSizes.sort((a, b) => b - a).slice(0, 4),
    };
  });

  await page.close();
  return { bootToTitleMs, navNodes: nav.nodes, navBakeMs: nav.bakeMs, missionResetMs: resetMs, sim };
}

/** Live frame rate under RAF, with no `test` parameter so the engine stays in real-time mode. */
async function frameRate(browser, quality) {
  const page = await newPage(browser, quality);
  await page.goto(`${BASE}/?qa=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120_000 });

  // Deterministic mission, player in the lobby atrium: the widest sightline on floor 1 and the
  // heaviest thing the renderer is asked to draw.
  await page.evaluate(() => {
    window.__qa.quickStart('operator', null, 1337);
    window.__qa.teleport('lobby');
    window.__qa.god(true);
  });

  // Let shader compilation and the first frames settle before sampling.
  await page.waitForTimeout(4000);
  const before = await page.evaluate(() => window.__game.engine.frameCount);
  const t0 = Date.now();
  await page.waitForTimeout(SAMPLE_SECONDS * 1000);
  const after = await page.evaluate(() => window.__game.engine.frameCount);
  const elapsed = (Date.now() - t0) / 1000;

  const perf = await page.evaluate(() => window.__qa.perf());
  // Render cost on its own, drawn back to back so per-frame presentation cost is excluded. This is
  // the closest thing here to a hardware-independent measure of what the renderer is asked to do.
  const renderOnly = await page.evaluate(() => {
    const g = window.__game;
    g.render();
    const per = [];
    for (let i = 0; i < 8; i++) { const t = performance.now(); g.render(); per.push(performance.now() - t); }
    per.sort((a, b) => a - b);
    return { medianMs: +per[4].toFixed(1), minMs: +per[0].toFixed(1) };
  });
  const info = await page.evaluate(() => {
    const r = window.__game.renderer;
    return {
      pixelRatio: r.renderer.getPixelRatio(),
      buffer: [r.renderer.domElement.width, r.renderer.domElement.height],
      shadowMap: window.__game.mission.map.lights.sun.shadow.mapSize.x,
      fillLights: r.profile.fillLights,
      programs: r.renderer.info.programs.length,
      geometries: r.renderer.info.memory.geometries,
      textures: r.renderer.info.memory.textures,
    };
  });
  const errors = await page.evaluate(() => window.__consoleErrors.slice());

  await page.close();
  return {
    measuredFps: +((after - before) / elapsed).toFixed(2),
    reportedFps: perf.fps,
    stepMsPerRafFrame: +perf.stepMs.toFixed(2),
    renderMsReported: +perf.renderMs.toFixed(2),
    renderMsMedian: renderOnly.medianMs,
    renderMsMin: renderOnly.minMs,
    drawCalls: perf.drawCalls,
    triangles: perf.triangles,
    ...info,
    errors,
  };
}

const browser = await chromium.launch(LAUNCH);
const report = { generatedAt: new Date().toISOString(), viewport: '1920x1080', sampleSeconds: SAMPLE_SECONDS, tiers: {} };
try {
  for (const tier of TIERS) {
    process.stdout.write(`sampling ${tier}... `);
    const timings = await bootAndResetTimings(browser, tier);
    const frames = await frameRate(browser, tier);
    report.tiers[tier] = { ...timings, ...frames };
    console.log(`${frames.measuredFps} fps, ${frames.drawCalls} calls, ${frames.triangles} tris`);
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  console.log(`\nwrote ${JSON_OUT}`);
}
