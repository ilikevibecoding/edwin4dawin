// Performance baseline harness (Opus 4). Produces every number in docs/perf-baseline.md.
//
// Four different things are measured, on purpose:
//
//  * Scene cost per quality tier at three cameras (lobby atrium, open office, garage) — draw
//    calls, triangles, programs and the renderer's own back-to-back draw time. Sampled on a page
//    WITHOUT the `test` parameter so the engine is in its ordinary real-time mode.
//  * Frame rate under requestAnimationFrame, on the same page. Rendering here goes through
//    ANGLE/SwiftShader, a software rasteriser: those frame rates are not predictive of any GPU and
//    are recorded for relative comparison between tiers only.
//  * Simulation cost with `test=1` and manual stepping, which isolates the fixed-step update from
//    rendering. Each fixed step is timed on its own (advanceTime(8) executes exactly one 1/120 s
//    step), so the report carries a worst-step figure and not just an average — the budget that
//    matters is per step, and an average hides the spikes that drop frames.
//  * Wall times a player waits for: boot to title, deploy to playing, the nav bake and a mission
//    reset.
//
// Simulation cost is ordinary JavaScript and does carry over to real hardware. Render timings do
// not.
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

// The three cameras the scene budget is quoted at: the widest sightline on floor 1, the open-plan
// office on floor 2 (the densest prop dressing in the building), and the extraction garage.
const CAMERAS = { lobbyAtrium: 'lobby', openOffice: 'cubes', garage: 'garage' };

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

/**
 * Boot-to-title wall time, nav bake, mission reset cost, and the per-step simulation cost of the
 * four scenarios the game has to survive.
 */
async function simAndTimings(browser, quality) {
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

  const sim = await page.evaluate(() => {
    const g = window.__game, nav = g.mission.nav;
    const realRender = g.engine.renderFn;
    g.engine.renderFn = () => {};

    // Flood-fill the baked graph so every A* request can be attributed: reachable, cross-floor
    // (the expensive shape, since the search has to round a stairwell), or impossible because the
    // endpoints sit in different regions (the NS-1 shape, which should now be nil).
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

    const blank = () => ({ calls: 0, ms: 0, worstMs: 0 });
    let pf = { all: blank(), crossFloor: blank(), unreachable: blank(), failed: blank() };
    let requested = 0;   // mission.findPath calls, including the ones the per-step budget refuses
    const add = (b, dt) => { b.calls++; b.ms += dt; b.worstMs = Math.max(b.worstMs, dt); };
    const realFind = nav.findPath.bind(nav);
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
    const realMissionFind = g.mission.findPath.bind(g.mission);
    g.mission.findPath = (from, to) => { requested++; return realMissionFind(from, to); };

    const vfxSys = g.mission.vfx;
    let vfxMs = 0, vfxCalls = 0;
    const realVfxUpdate = vfxSys.update.bind(vfxSys);
    vfxSys.update = (dt, cam) => {
      const t = performance.now();
      const r = realVfxUpdate(dt, cam);
      vfxMs += performance.now() - t; vfxCalls++;
      return r;
    };

    // One window = 240 individually timed fixed steps (2 simulated seconds). advanceTime(8)
    // executes exactly one 1/120 s step, which is what makes a worst-step figure possible.
    const FIXED_MS = 1000 / 120;
    const window2s = (perStep = null) => {
      pf = { all: blank(), crossFloor: blank(), unreachable: blank(), failed: blank() };
      requested = 0; vfxMs = 0; vfxCalls = 0;
      const steps = new Float64Array(240);
      const t = performance.now();
      for (let i = 0; i < 240; i++) {
        if (perStep) perStep();
        const s = performance.now();
        window.advanceTime(8);
        steps[i] = performance.now() - s;
      }
      const wall = performance.now() - t;
      const sorted = Array.from(steps).sort((a, b) => a - b);
      const pct = (b) => +((b.ms / wall) * 100).toFixed(1);
      return {
        meanMsPerStep: +(wall / 240).toFixed(3),
        p50MsPerStep: +sorted[120].toFixed(3),
        p95MsPerStep: +sorted[228].toFixed(3),
        worstStepMs: +sorted[239].toFixed(3),
        stepsOverBudget: sorted.filter((v) => v > FIXED_MS).length,
        pathRequests: requested,
        pathCallsServed: pf.all.calls,
        pathDeniedByBudget: requested - pf.all.calls,
        pathSharePct: pct(pf.all),
        pathWorstMs: +pf.all.worstMs.toFixed(2),
        crossFloorCalls: pf.crossFloor.calls,
        crossFloorSharePct: pct(pf.crossFloor),
        crossFloorWorstMs: +pf.crossFloor.worstMs.toFixed(2),
        unreachableCalls: pf.unreachable.calls,
        failedCalls: pf.failed.calls,
        vfxUpdateSharePct: +((vfxMs / wall) * 100).toFixed(1),
        vfxUpdateMsPerCall: vfxCalls ? +(vfxMs / vfxCalls).toFixed(3) : 0,
        liveHostiles: g.mission.enemies.filter((e) => e.alive).length,
        inCombat: g.mission.enemies.filter((e) => e.alive && e.state === 'combat').length,
        liveParticles: vfxSys.items.length,
        smokes: vfxSys.smokes.length,
      };
    };

    const start = (at) => {
      window.__qa.resetMission();
      window.__qa.teleport(at);
      window.__qa.god(true);
      window.advanceTime(1000);
    };

    // ---- 1. idle: the roster on its routine, player tucked away in a closet.
    start('janitor');
    const idle = window2s();

    // ---- 2. one-floor combat: everything on the player's own floor is shooting at them.
    start('lobby');
    const floorY = g.mission.player.pos.y;
    for (const e of g.mission.enemies) {
      if (e.alive && Math.abs(e.pos.y - floorY) < 2) e._enterCombat();
    }
    window.advanceTime(500);
    const oneFloor = [window2s(), window2s()];

    // ---- 3. cross-floor chase: the player is upstairs, so every route has to round a stairwell.
    // lastKnown is set the way perception and hearing set it, so this is the ordinary scenario,
    // just reached without waiting for a sightline.
    start('cubes');
    const target = g.mission.player.pos.clone();
    for (const e of g.mission.enemies) {
      if (!e.alive) continue;
      e._enterCombat();
      e.lastKnown = target.clone();
    }
    window.advanceTime(1000);
    const crossFloor = [window2s(), window2s(), window2s()];
    const strandedCounts = {};
    for (const e of g.mission.enemies.filter((x) => x.alive)) {
      const idx = nav.nearestNode(e.pos.x, e.pos.y, e.pos.z);
      const r = idx < 0 ? 'off-navmesh' : region[idx];
      strandedCounts[r] = (strandedCounts[r] || 0) + 1;
    }

    // ---- 4. building-wide firefight: the whole roster awake and converging across both floors,
    // the player holding the trigger down, and everything the player can put in the air at once —
    // three smoke volumes (~14 animated billows each for 16 s) and a flash. The magazine is topped
    // up between steps because the point is the load, not the ammo economy.
    start('lobby');
    const p = g.mission.player;
    for (const [dx, dz] of [[2, -3], [-3, -2], [0, -6]]) {
      vfxSys.smokeVolume({ x: p.pos.x + dx, y: p.pos.y + 0.2, z: p.pos.z + dz }, 4.2, 16);
    }
    vfxSys.flashBurst({ x: p.pos.x + 1, y: p.pos.y + 1.2, z: p.pos.z - 4 });
    const here = p.pos.clone();
    for (const e of g.mission.enemies) {
      if (!e.alive) continue;
      e._enterCombat();
      e.lastKnown = here.clone();
    }
    window.advanceTime(500);
    window.__qa.mouse(0, true);
    const topUp = () => {
      const w = p.arsenal.current;
      if (w.mag !== Infinity) w.mag = w.def.magSize;
    };
    const firefight = [window2s(topUp), window2s(topUp), window2s(topUp)];
    window.__qa.mouse(0, false);
    const shotsFired = g.mission.stats.shots;

    vfxSys.update = realVfxUpdate;
    nav.findPath = realFind;
    g.mission.findPath = realMissionFind;
    g.engine.renderFn = realRender;
    return {
      idle,
      oneFloor,
      crossFloor,
      firefight,
      shotsFired,
      hostilesPerNavRegion: strandedCounts,
      enemies: g.mission.enemies.filter((e) => e.alive).length,
      navRegions: regionCount,
      navRegionSizes: regionSizes.sort((a, b) => b - a).slice(0, 4),
      pathBudgetPerStep: g.mission._pathBudget !== undefined ? 3 : null,
    };
  });

  await page.close();
  return { bootToTitleMs, navNodes: nav.nodes, navBakeMs: nav.bakeMs, missionResetMs: resetMs, sim };
}

/**
 * The player-facing deploy time, live frame rate under RAF, and scene statistics at three cameras.
 * No `test` parameter here, so the engine stays in real-time mode and the menu flow is the real
 * one — including the loading screen's own minimum dwell.
 */
async function renderAndScene(browser, quality) {
  const page = await newPage(browser, quality);
  await page.goto(`${BASE}/?qa=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120_000 });

  // Deploy the way a player does: title -> difficulty -> briefing -> loadout -> deploy. Timed
  // twice, because the two numbers say different things. The in-page figure is the game's own work
  // (build the mission, hold the loading screen for its minimum dwell). The wall figure also
  // contains however long the software rasteriser takes to present the frames in between, which on
  // a GPU is a fraction of it.
  await page.evaluate(() => {
    window.__stateLog = [];
    const game = window.__game;
    const orig = game.setState.bind(game);
    game.setState = (s) => { window.__stateLog.push([s, performance.now()]); return orig(s); };
  });
  await page.click('[data-action="start"]');
  await page.click('[data-action="difficulty-operator"]');
  await page.click('[data-action="to-loadout"]');
  const tDeploy = Date.now();
  await page.click('[data-action="deploy"]');
  await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 120_000 });
  const deployToPlayingWallMs = Date.now() - tDeploy;
  const deployStateMs = await page.evaluate(() => {
    const log = window.__stateLog;
    const loading = log.find(([s]) => s === 'loading');
    const playing = log.find(([s]) => s === 'playing');
    return loading && playing ? Math.round(playing[1] - loading[1]) : null;
  });

  await page.evaluate(() => {
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

  // Scene cost per camera. Frames are drawn back to back so per-frame presentation cost — which is
  // what pins the software rasteriser's fps — is excluded, and the number reflects what the
  // renderer is actually asked to submit.
  const cameras = await page.evaluate((names) => {
    const g = window.__game;
    const out = {};
    for (const [label, cp] of Object.entries(names)) {
      window.__qa.camera(cp);
      g.render(); g.render(); // warm: first draw of a fresh view compiles permutations
      const per = [];
      for (let i = 0; i < 8; i++) { const t = performance.now(); g.render(); per.push(performance.now() - t); }
      per.sort((a, b) => a - b);
      const info = g.renderer.renderer.info;
      out[label] = {
        checkpoint: cp,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        programs: info.programs.length,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        renderMsMedian: +per[4].toFixed(1),
        renderMsMin: +per[0].toFixed(1),
      };
    }
    window.__qa.cameraOff();
    return out;
  }, CAMERAS);

  const info = await page.evaluate(() => {
    const r = window.__game.renderer;
    return {
      pixelRatio: r.renderer.getPixelRatio(),
      buffer: [r.renderer.domElement.width, r.renderer.domElement.height],
      shadowMap: window.__game.mission.map.lights.sun.shadow.mapSize.x,
      fillLights: r.profile.fillLights,
    };
  });
  const errors = await page.evaluate(() => window.__consoleErrors.slice());

  await page.close();
  return {
    deployToPlayingWallMs,
    deployStateMs,
    measuredFps: +((after - before) / elapsed).toFixed(2),
    reportedFps: perf.fps,
    stepMsPerRafFrame: +perf.stepMs.toFixed(2),
    renderMsReported: +perf.renderMs.toFixed(2),
    cameras,
    ...info,
    errors,
  };
}

const browser = await chromium.launch(LAUNCH);
const report = { generatedAt: new Date().toISOString(), viewport: '1920x1080', sampleSeconds: SAMPLE_SECONDS, tiers: {} };
try {
  for (const tier of TIERS) {
    process.stdout.write(`sampling ${tier}... `);
    const timings = await simAndTimings(browser, tier);
    const frames = await renderAndScene(browser, tier);
    report.tiers[tier] = { ...timings, ...frames };
    const worst = Math.max(...timings.sim.firefight.map((w) => w.worstStepMs));
    console.log(`${frames.measuredFps} fps, ${frames.cameras.lobbyAtrium.drawCalls} calls, `
      + `${frames.cameras.lobbyAtrium.triangles} tris, firefight worst step ${worst.toFixed(2)} ms`);
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  console.log(`\nwrote ${JSON_OUT}`);
}
