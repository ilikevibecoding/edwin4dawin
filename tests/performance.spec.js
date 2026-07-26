import { test, expect } from '@playwright/test';
import {
  bootGame, advance, state, qa, shot, releaseAll,
  expectNoConsoleErrors, enterGameplay, writeArtifact,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 13 — performance.
//
// Playwright runs on SwiftShader, so absolute frame rates are meaningless. What
// is meaningful is the *shape* of the cost: CPU time per simulated frame, draw
// calls and triangle counts per room and per quality preset, and whether any
// single room collapses relative to the others. Those are all comparable across
// machines, so this spec asserts on relative collapse and writes the absolute
// numbers to `artifacts/performance.json` for the lead.
// ---------------------------------------------------------------------------

const ROOMS = ['lobby', 'openoffice', 'conference', 'serverroom', 'garage', 'execoffice'];
const PRESETS = ['low', 'medium', 'high'];

/** Frames per measured sample. Enough to average out one-off allocations. */
const FRAMES = 24;
const FRAME_MS = 16;

/**
 * Render a fixed number of frames of fixed simulated duration and report the
 * wall-clock and engine-reported cost. Because the simulated workload is
 * identical every time, differences are attributable to the scene.
 */
async function measure(page, label) {
  // Warm-up frames first: shader compilation on first sight of a room would
  // otherwise dominate the sample.
  await advance(page, 8 * FRAME_MS, { step: FRAME_MS });

  const sample = await page.evaluate(([frames, frameMs]) => {
    const engine = window.__NORTHSTAR__.engine;
    const cpu = [];
    const wall = [];
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      window.advanceTime(frameMs);
      wall.push(performance.now() - t0);
      cpu.push(engine.perf.cpuMs);
    }
    const stats = (arr) => {
      const sorted = arr.slice().sort((a, b) => a - b);
      const sum = arr.reduce((a, b) => a + b, 0);
      return {
        mean: +(sum / arr.length).toFixed(3),
        median: +sorted[Math.floor(sorted.length / 2)].toFixed(3),
        p95: +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(3),
        max: +sorted[sorted.length - 1].toFixed(3),
      };
    };
    const info = engine.renderer.info;
    return {
      frames,
      wallMs: stats(wall),
      cpuMs: stats(cpu),
      drawCalls: engine.perf.drawCalls,
      triangles: engine.perf.triangles,
      programs: engine.perf.programs,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      resolution: [engine.viewportWidth, engine.viewportHeight],
      pixelRatio: +engine.renderer.getPixelRatio().toFixed(3),
      drawingBuffer: [engine.renderer.domElement.width, engine.renderer.domElement.height],
    };
  }, [FRAMES, FRAME_MS]);

  return { label, ...sample };
}

test.describe('performance', () => {
  test('frame cost per room per quality preset, with no catastrophic collapse', async ({ page }) => {
    test.slow();
    await bootGame(page, { quality: 'low', resolutionScale: 0.5 });
    await enterGameplay(page, { godMode: true });
    await qa(page, 'freezeAI', true);
    await qa(page, 'setLighting', 'default');

    const rows = [];
    for (const preset of PRESETS) {
      const applied = await qa(page, 'setQuality', preset);
      expect(applied.ok, `setQuality(${preset}) failed: ${JSON.stringify(applied)}`).toBe(true);
      await qa(page, 'setResolutionScale', 0.5);
      await advance(page, 200, { step: 50 });

      for (const room of ROOMS) {
        const jump = await qa(page, 'teleport', room);
        if (!jump.ok) continue;
        const sample = await measure(page, `${preset}/${room}`);
        const perf = await qa(page, 'perf');
        rows.push({ preset, room, ...sample, sceneObjects: perf.sceneObjects, colliders: perf.colliders });
      }
    }

    // A busier scene with hostiles thinking is the realistic worst case.
    await qa(page, 'setQuality', 'medium');
    await qa(page, 'freezeAI', false);
    await qa(page, 'teleport', 'openoffice');
    await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      // Reveal everything so no culling hides the cost, then wake the AI up.
      for (const e of g.enemies.list) e.awareness = 0.8;
    });
    const stress = await measure(page, 'medium/openoffice+ai');
    rows.push({ preset: 'medium', room: 'openoffice+ai', ...stress });
    await qa(page, 'freezeAI', true);

    const byPreset = {};
    for (const preset of PRESETS) {
      const of = rows.filter((r) => r.preset === preset && !r.room.includes('+'));
      if (!of.length) continue;
      byPreset[preset] = {
        rooms: of.length,
        meanCpuMs: +(of.reduce((a, r) => a + r.cpuMs.mean, 0) / of.length).toFixed(3),
        worstCpuMs: Math.max(...of.map((r) => r.cpuMs.p95)),
        worstRoom: of.slice().sort((a, b) => b.cpuMs.p95 - a.cpuMs.p95)[0].room,
        meanDrawCalls: Math.round(of.reduce((a, r) => a + r.drawCalls, 0) / of.length),
        maxDrawCalls: Math.max(...of.map((r) => r.drawCalls)),
        maxTriangles: Math.max(...of.map((r) => r.triangles)),
      };
    }

    const summary = {
      note: 'Measured under headless SwiftShader software rasterisation. Absolute '
        + 'timings are far slower than any real GPU; the useful signal is the '
        + 'relative cost between rooms and presets.',
      frames: FRAMES,
      frameMs: FRAME_MS,
      byPreset,
      worstRooms: rows.slice().sort((a, b) => b.cpuMs.p95 - a.cpuMs.p95).slice(0, 8)
        .map((r) => ({ label: r.label, cpuP95: r.cpuMs.p95, drawCalls: r.drawCalls, triangles: r.triangles })),
      heaviestDrawCalls: rows.slice().sort((a, b) => b.drawCalls - a.drawCalls).slice(0, 8)
        .map((r) => ({ label: r.label, drawCalls: r.drawCalls, triangles: r.triangles })),
      stress: { label: stress.label, cpuMs: stress.cpuMs, drawCalls: stress.drawCalls },
      rows,
    };
    writeArtifact('performance.json', summary);
    await shot(page, 'performance-openoffice');

    // --- assertions: shape, not absolute speed -----------------------------
    expect(rows.length, 'no performance samples were collected').toBeGreaterThan(8);

    // 1. Nothing may report an absurd draw-call count: that means culling or
    //    batching has fallen over.
    const worstDraw = Math.max(...rows.map((r) => r.drawCalls));
    expect(
      worstDraw,
      `${worstDraw} draw calls in one frame (${rows.find((r) => r.drawCalls === worstDraw).label}) — batching or culling has collapsed`
    ).toBeLessThan(6000);

    // 2. No single room may cost several times the median. That is the
    //    "catastrophic collapse" the brief asks about, and it is machine
    //    independent because it is measured against this run's own median.
    const cpuValues = rows.filter((r) => !r.room.includes('+')).map((r) => r.cpuMs.median).sort((a, b) => a - b);
    const median = cpuValues[Math.floor(cpuValues.length / 2)];
    const outliers = rows
      .filter((r) => !r.room.includes('+') && r.cpuMs.median > median * 6 && r.cpuMs.median > 40)
      .map((r) => ({ label: r.label, median: r.cpuMs.median, runMedian: median }));
    expect(
      outliers,
      `these rooms cost more than 6x the run median of ${median} ms/frame:\n${JSON.stringify(outliers, null, 2)}`
    ).toEqual([]);

    // 3. Higher presets must not be cheaper than lower ones — that would mean
    //    the preset is not wired up at all.
    if (byPreset.low && byPreset.high) {
      expect(
        byPreset.high.meanCpuMs,
        `the "high" preset (${byPreset.high.meanCpuMs} ms) is cheaper than "low" (${byPreset.low.meanCpuMs} ms) — presets are not applied`
      ).toBeGreaterThan(byPreset.low.meanCpuMs * 0.8);
    }

    // 4. Frame cost must not grow monotonically over a fixed workload, which
    //    is the signature of a per-frame leak.
    const leak = await page.evaluate(([frames, frameMs]) => {
      const engine = window.__NORTHSTAR__.engine;
      const early = [];
      const late = [];
      for (let i = 0; i < frames * 2; i++) {
        window.advanceTime(frameMs);
        (i < frames ? early : late).push(engine.perf.cpuMs);
      }
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      const info = engine.renderer.info;
      return {
        early: +avg(early).toFixed(3),
        late: +avg(late).toFixed(3),
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      };
    }, [FRAMES, FRAME_MS]);
    writeArtifact('performance-leak.json', leak);
    expect(
      leak.late,
      `frame cost climbed from ${leak.early} ms to ${leak.late} ms over an identical workload — probable per-frame leak`
    ).toBeLessThan(leak.early * 2.5 + 5);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('the resolution scale and quality preset reach the renderer', async ({ page }) => {
    await bootGame(page, { quality: 'medium', resolutionScale: 1 });
    await enterGameplay(page, { freezeAI: true, checkpoint: 'lobby' });

    const read = () => page.evaluate(() => {
      const e = window.__NORTHSTAR__.engine;
      return {
        pixelRatio: +e.renderer.getPixelRatio().toFixed(3),
        buffer: [e.renderer.domElement.width, e.renderer.domElement.height],
        viewport: [e.viewportWidth, e.viewportHeight],
        shadows: e.renderer.shadowMap.enabled,
      };
    });

    const full = await read();
    await qa(page, 'setResolutionScale', 0.5);
    await advance(page, 200, { step: 60 });
    const half = await read();

    writeArtifact('performance-resolution.json', { full, half });

    expect(half.pixelRatio, `resolution scale did not change the pixel ratio: ${full.pixelRatio} -> ${half.pixelRatio}`)
      .toBeLessThan(full.pixelRatio);
    expect(half.buffer[0], 'the drawing buffer did not shrink').toBeLessThan(full.buffer[0]);
    expect(half.viewport, 'the CSS viewport must not change with resolution scale').toEqual(full.viewport);

    // Quality presets must move the shadow setting.
    await qa(page, 'setQuality', 'low');
    await advance(page, 200, { step: 60 });
    const low = await read();
    await qa(page, 'setQuality', 'ultra');
    await advance(page, 200, { step: 60 });
    const ultra = await read();
    writeArtifact('performance-quality.json', { low, ultra });
    expect(ultra.shadows, 'the ultra preset does not enable shadows').toBe(true);
    expect(
      low.shadows === false || ultra.pixelRatio > low.pixelRatio,
      `quality presets do not change rendering: low ${JSON.stringify(low)} vs ultra ${JSON.stringify(ultra)}`
    ).toBe(true);

    await expectNoConsoleErrors(page);
  });
});
