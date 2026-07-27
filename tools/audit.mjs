#!/usr/bin/env node
// ---------------------------------------------------------------------------
// tools/audit.mjs — room-by-room audit.  (owner: opus4)
//
// Teleports to every entry in CHECKPOINTS, captures the text state, a
// screenshot, exposure/contrast measurements, a frame-cost sample and a view
// probe of the assets actually visible from that spot, then writes
// artifacts/audit.json and artifacts/audit.md with the rooms ranked by how far
// they sit from the visual and content bar.
//
//   node tools/audit.mjs
//   node tools/audit.mjs --quality low --scale 0.5
//   node tools/audit.mjs --url http://127.0.0.1:5173      # reuse a server
//   node tools/audit.mjs --lighting night --no-shots
// ---------------------------------------------------------------------------

import path from 'node:path';
import {
  parseArgs, startServer, openGame, writeJson, writeText,
  ARTIFACT_DIR, SCREENSHOT_DIR,
} from './lib/session.mjs';

const args = parseArgs();

const QUALITY = String(args.quality || 'medium');
const SCALE = Number(args.scale ?? 0.75);
const WIDTH = Number(args.width ?? 1920);
const HEIGHT = Number(args.height ?? 1080);
const LIGHTING = args.lighting ? String(args.lighting) : null;
const TAKE_SHOTS = args.shots !== false && args.noShots !== true;
// Flat, prefixed names rather than a subdirectory, and JPEG rather than PNG:
// this set is referenced from every row of `audit.md` and is meant to be
// committed, and `.gitignore` can then keep excluding the per-spec `*.png`
// evidence without needing a rule per prefix. See `session.mjs#capture`.
const AUDIT_SHOT_DIR = SCREENSHOT_DIR;

/**
 * The bar a finished room is held to. These are advisory: a dim stairwell is
 * meant to be dim. Everything is expressed as a distance from the bar so the
 * report can rank rooms rather than just pass/fail them.
 */
const BAR = {
  meanLuminance: [0.045, 0.62],   // readable without being washed out
  stdDev: 0.045,                  // below this the frame is featureless
  contrast: 0.35,                 // Michelson contrast across the frame
  crushedBlackFraction: 0.4,      // fraction of pixels pinned at black
  blownHighlightFraction: 0.12,
  distinctColours: 90,
  visibleAssets: 3,               // registered assets under the probe grid
  // Judged on the *median* frame, never the mean. Under SwiftShader a frame
  // doing byte-for-byte identical GL work (same programs, draw calls, triangles,
  // geometries and textures — `tools/shadowcost.mjs` prints the proof) costs
  // either 5 ms or 13 000 ms depending on whether the host felt like scheduling
  // it. One such outlier moves a 16-sample mean by 800 ms and would flag every
  // room in the building; it does not move the median at all.
  frameMs: 26,                    // ~38 fps under SwiftShader at medium
  untaggedRayFraction: 0.55,      // surfaces with no assetId behind them
  missRayFraction: 0.35,          // rays that hit nothing — holes or voids
};

/** Weights turn each individual shortfall into one comparable severity score. */
const WEIGHT = {
  room: 40,
  unreadable: 30,
  dark: 22,
  bright: 12,
  flat: 16,
  lowContrast: 10,
  crushed: 12,
  blown: 10,
  colours: 8,
  empty: 18,
  untagged: 10,
  holes: 14,
  slow: 12,
  unregistered: 20,
  error: 25,
};

const pct = (n) => `${Math.round((n || 0) * 100)}%`;
const num = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d) : '—');

/** Tracked so a failure part-way through still takes the dev server with it. */
let activeServer = null;

/** Score one checkpoint. Returns the findings plus an unbounded severity. */
function assess(row) {
  const f = [];
  const m = row.metrics;
  const push = (weight, kind, text) => f.push({ kind, weight, text });

  if (!row.teleported) {
    push(WEIGHT.room, 'teleport', `teleport refused: ${row.teleportReason || 'unknown'}`);
  } else if (row.expectedRoom && row.room !== row.expectedRoom) {
    push(WEIGHT.room, 'room', `stands in \`${row.room || 'nowhere'}\` but the checkpoint claims \`${row.expectedRoom}\``);
  }

  if (!m?.ok) {
    push(WEIGHT.unreadable, 'unreadable', 'the canvas could not be sampled');
  } else {
    const [floor, ceil] = BAR.meanLuminance;
    if (m.meanLuminance < floor) {
      push(WEIGHT.dark * (1 + (floor - m.meanLuminance) / floor), 'dark',
        `too dark to read: mean luminance ${m.meanLuminance} (floor ${floor})`);
    }
    if (m.meanLuminance > ceil) {
      push(WEIGHT.bright, 'bright', `overexposed: mean luminance ${m.meanLuminance} (ceiling ${ceil})`);
    }
    if (m.stdDev < BAR.stdDev) {
      push(WEIGHT.flat * (1 + (BAR.stdDev - m.stdDev) / BAR.stdDev), 'flat',
        `flat frame: std dev ${m.stdDev} (floor ${BAR.stdDev}) — little visible detail`);
    }
    if (m.contrast < BAR.contrast) {
      push(WEIGHT.lowContrast, 'contrast', `low contrast ${m.contrast} (floor ${BAR.contrast})`);
    }
    if (m.crushedBlackFraction > BAR.crushedBlackFraction) {
      push(WEIGHT.crushed, 'crushed', `${pct(m.crushedBlackFraction)} of the frame is crushed to black`);
    }
    if (m.blownHighlightFraction > BAR.blownHighlightFraction) {
      push(WEIGHT.blown, 'blown', `${pct(m.blownHighlightFraction)} of the frame is blown out`);
    }
    if (m.distinctColours < BAR.distinctColours) {
      push(WEIGHT.colours, 'colours', `only ${m.distinctColours} distinct colours — the room may be unfurnished`);
    }
  }

  const probe = row.probe;
  if (probe?.ok) {
    const registered = probe.visible.filter((v) => v.registered);
    if (registered.length < BAR.visibleAssets) {
      push(WEIGHT.empty, 'empty', `only ${registered.length} registered asset(s) visible (bar ${BAR.visibleAssets})`);
    }
    const untaggedFraction = probe.rays ? probe.untagged / probe.rays : 0;
    if (untaggedFraction > BAR.untaggedRayFraction) {
      push(WEIGHT.untagged, 'untagged', `${pct(untaggedFraction)} of view rays land on geometry with no assetId`);
    }
    const missFraction = probe.rays ? probe.misses / probe.rays : 0;
    if (missFraction > BAR.missRayFraction) {
      push(WEIGHT.holes, 'holes', `${pct(missFraction)} of view rays hit nothing — missing walls or ceiling`);
    }
    if (probe.unregistered.length) {
      push(WEIGHT.unregistered, 'unregistered',
        `unregistered assetId(s) in view: ${probe.unregistered.join(', ')}`);
    }
  }

  if (row.medianFrameMs > BAR.frameMs) {
    push(WEIGHT.slow * (row.medianFrameMs / BAR.frameMs), 'slow',
      `${num(row.medianFrameMs)} ms per median frame (bar ${BAR.frameMs} ms; `
      + `mean ${num(row.frameMs)} ms, worst ${num(row.worstFrameMs)} ms)`);
  }
  for (const err of row.consoleErrors) push(WEIGHT.error, 'error', `console error: ${err}`);

  const severity = f.reduce((sum, x) => sum + x.weight, 0);
  return { findings: f, severity: +severity.toFixed(1) };
}

async function main() {
  const t0 = Date.now();
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5174) });
  activeServer = server;
  console.log(`[audit] server ${server.url}${server.reused ? ' (reused)' : ''}`);

  const g = await openGame({
    url: server.url, width: WIDTH, height: HEIGHT, quality: QUALITY, resolutionScale: SCALE,
  });
  const { advance, qa, state, page } = g;

  await qa('forcePlay', {
    difficulty: 'operator',
    loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' },
  });
  await page.waitForFunction(() => window.__NORTHSTAR__.state === 'playing', null, { timeout: 60_000 });
  await advance(600);

  // Freeze the world so every room is measured under identical conditions:
  // no AI moving through frame, no damage, no clock pressure.
  await qa('freezeAI', true);
  await qa('godMode', true);
  await qa('refillAmmo');
  if (LIGHTING) await qa('setLighting', LIGHTING);
  const settingsSnapshot = await qa('getSettings');
  const lighting = await page.evaluate(() => window.__NORTHSTAR__.lighting?.scenario ?? null);
  const assetReport = await qa('assetReport');

  const checkpoints = await qa('listCheckpoints');
  console.log(`[audit] ${checkpoints.length} checkpoints, lighting \`${lighting}\`, quality ${QUALITY}`);

  const rows = [];
  let errorsSeen = 0;

  for (const cp of checkpoints) {
    const jump = await qa('teleport', cp.name);
    // Let the streamed-in room settle: lights, doors and props all need frames.
    await advance(400);

    // Fixed simulated workload, wall-clock measured: 12 rendered frames worth of
    // 50 ms steps, with the raw samples kept. Absolute numbers are SwiftShader
    // numbers and the distribution is not remotely normal — the median is the
    // only summary worth ranking rooms by. The first frame in a room is warmed
    // and discarded because it pays for uploads the others do not.
    const cost = await page.evaluate(([steps, step]) => {
      const engine = window.__NORTHSTAR__.engine;
      window.advanceTime(step); // warm the first frame in this room
      const samples = [];
      for (let i = 0; i < steps; i++) {
        const t = performance.now();
        window.advanceTime(step);
        samples.push(+(performance.now() - t).toFixed(2));
      }
      const sorted = samples.slice().sort((a, b) => a - b);
      return {
        samples,
        frameMs: sorted.reduce((s, v) => s + v, 0) / sorted.length,
        medianMs: sorted[Math.floor(sorted.length / 2)],
        worstMs: sorted[sorted.length - 1],
        frame: engine.frame,
      };
    }, [12, 50]);
    const after = await qa('perf');

    const s = await state();
    const probe = await qa('probeView', { cols: 9, rows: 5, far: 40 });
    let shotFile = null;
    let metrics;
    if (TAKE_SHOTS) {
      const info = await g.shot(`audit-${cp.name}`, AUDIT_SHOT_DIR, { format: 'jpeg' });
      shotFile = path.relative(ARTIFACT_DIR, info.file);
      metrics = info.metrics;
    } else {
      metrics = await g.metrics();
    }

    const consoleErrors = g.console.errors.slice(errorsSeen);
    errorsSeen = g.console.errors.length;

    const row = {
      checkpoint: cp.name,
      expectedRoom: cp.room,
      room: jump?.room ?? null,
      roomName: s?.player?.roomName ?? null,
      floor: s?.player?.floor ?? null,
      teleported: !!jump?.ok,
      teleportReason: jump?.ok ? null : jump?.reason ?? null,
      position: jump?.position ?? s?.player?.position ?? null,
      metrics,
      probe: probe?.ok ? probe : { ok: false, reason: probe?.reason ?? 'unavailable' },
      visibleAssets: probe?.ok ? probe.visible.filter((v) => v.registered).map((v) => v.id) : [],
      frameMs: +cost.frameMs.toFixed(2),
      medianFrameMs: +cost.medianMs.toFixed(2),
      worstFrameMs: +cost.worstMs.toFixed(2),
      // The engine's own accounting: simulation plus scene-graph work, with the
      // rasteriser excluded. This is the number that would still mean something
      // on a real GPU, and it is two orders of magnitude below the wall clock.
      cpuMs: after.cpuMs,
      frameSamplesMs: cost.samples,
      drawCalls: after.drawCalls,
      triangles: after.triangles,
      sceneObjects: after.sceneObjects,
      colliders: after.colliders,
      screenshot: shotFile,
      consoleErrors,
    };
    Object.assign(row, assess(row));
    rows.push(row);

    const worst = row.findings[0];
    console.log(
      `[audit] ${cp.name.padEnd(14)} room=${String(row.room).padEnd(12)} `
      + `lum=${num(row.metrics?.meanLuminance)} sd=${num(row.metrics?.stdDev)} `
      + `assets=${row.visibleAssets.length} ${num(row.medianFrameMs, 1)}ms/frame cpu=${num(row.cpuMs, 2)}ms `
      + `severity=${row.severity}${worst ? `  ! ${worst.text}` : ''}`
    );
  }

  const ranked = [...rows].sort((a, b) => b.severity - a.severity);
  const kinds = {};
  for (const row of rows) {
    for (const f of row.findings) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    elapsedSeconds: +((Date.now() - t0) / 1000).toFixed(1),
    tool: 'tools/audit.mjs',
    viewport: [WIDTH, HEIGHT],
    quality: QUALITY,
    resolutionScale: SCALE,
    lighting,
    settings: settingsSnapshot,
    bar: BAR,
    weights: WEIGHT,
    checkpointCount: rows.length,
    cleanCount: rows.filter((r) => !r.findings.length).length,
    findingCounts: kinds,
    worst: ranked.slice(0, 10).map((r) => ({
      checkpoint: r.checkpoint, severity: r.severity,
      findings: r.findings.map((f) => f.text),
    })),
    assets: {
      summary: assetReport?.summary ?? null,
      neverInstantiated: (assetReport?.neverInstantiated ?? []).map((r) => r.id),
      unregisteredInScene: assetReport?.unregisteredInScene ?? [],
      missingFields: assetReport?.missingFields ?? [],
    },
    consoleErrors: g.console.errors,
    failedRequests: g.console.failedRequests,
    rooms: rows,
  };

  const jsonFile = writeJson('audit.json', report);
  const mdFile = writeText(path.join(ARTIFACT_DIR, 'audit.md'), markdown(report, ranked));

  const flagged = rows.filter((r) => r.findings.length).length;
  console.log(`[audit] ${rows.length} checkpoints, ${flagged} with findings, ${g.console.errors.length} console error(s)`);
  console.log(`[audit] ${path.relative(process.cwd(), jsonFile)}`);
  console.log(`[audit] ${path.relative(process.cwd(), mdFile)}`);

  await g.close();
  await server.stop();
  process.exitCode = g.console.errors.length ? 1 : 0;
}

function markdown(report, ranked) {
  const rel = (row) => (row.screenshot ? `[${row.checkpoint}](./${row.screenshot.split(path.sep).join('/')})` : row.checkpoint);
  const lines = [
    '# Northstar Rescue — room audit',
    '',
    `Generated ${report.generatedAt} by \`node tools/audit.mjs\` — ${report.checkpointCount} checkpoints `
    + `at ${report.viewport.join('x')}, quality \`${report.quality}\`, resolution scale ${report.resolutionScale}, `
    + `lighting \`${report.lighting}\`.`,
    '',
    `${report.cleanCount} of ${report.checkpointCount} checkpoints are inside the bar. Severity is the weighted`,
    'sum of every shortfall at that checkpoint, so the ranking below is where to spend attention first.',
    '',
    'Rendered headless through SwiftShader: treat exposure, contrast and content counts as real signal,',
    'and absolute frame cost as relative-only.',
    '',
    '## Largest discrepancies',
    '',
  ];

  const worst = ranked.filter((r) => r.findings.length);
  if (!worst.length) {
    lines.push('None — every checkpoint met the bar.', '');
  } else {
    lines.push('| # | Checkpoint | Room | Severity | Findings |', '| --- | --- | --- | --- | --- |');
    worst.forEach((row, i) => {
      lines.push(`| ${i + 1} | ${rel(row)} | \`${row.room ?? '—'}\` | ${row.severity} | ${row.findings.map((f) => f.text).join('<br>')} |`);
    });
    lines.push('');
  }

  lines.push('## Every checkpoint', '',
    '| Checkpoint | Room | Mean lum | Std dev | Contrast | Crushed | Colours | Assets in view | Median frame ms | Engine cpu ms | Draws | Severity |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const row of report.rooms) {
    const m = row.metrics || {};
    const cells = [
      rel(row),
      `\`${row.room ?? '—'}\`${row.room !== row.expectedRoom ? ` (want \`${row.expectedRoom}\`)` : ''}`,
      m.meanLuminance ?? '—',
      m.stdDev ?? '—',
      m.contrast ?? '—',
      pct(m.crushedBlackFraction),
      m.distinctColours ?? '—',
      row.visibleAssets.length,
      num(row.medianFrameMs, 1),
      num(row.cpuMs, 2),
      row.drawCalls ?? '—',
      row.severity,
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');

  const kinds = Object.entries(report.findingCounts).sort((a, b) => b[1] - a[1]);
  if (kinds.length) {
    lines.push('## Findings by kind', '', '| Kind | Checkpoints |', '| --- | --- |');
    for (const [kind, count] of kinds) lines.push(`| ${kind} | ${count} |`);
    lines.push('');
  }

  const a = report.assets;
  if (a?.summary) {
    lines.push('## Asset registry', '',
      `- ${a.summary.total ?? '?'} records registered across ${Object.keys(a.summary.byCategory || {}).length} categories.`,
      `- ${a.neverInstantiated.length} record(s) registered but never instantiated.`,
      `- ${a.unregisteredInScene.length} \`assetId\`(s) in the scene graph with no record behind them.`,
      `- ${a.missingFields.length} record(s) with incomplete manifest fields.`,
      '');
    if (a.neverInstantiated.length) {
      lines.push('Never instantiated: ' + a.neverInstantiated.map((id) => `\`${id}\``).join(', '), '');
    }
    if (a.unregisteredInScene.length) {
      lines.push('Unregistered in scene: '
        + a.unregisteredInScene.map((u) => `\`${u.assetId}\` (${u.occurrences}×)`).join(', '), '');
    }
  }

  if (report.consoleErrors.length) {
    lines.push('## Console errors', '');
    for (const e of report.consoleErrors.slice(0, 40)) lines.push(`- \`${e}\``);
    lines.push('');
  }
  if (report.failedRequests.length) {
    lines.push('## Failed requests', '');
    for (const r of report.failedRequests.slice(0, 20)) lines.push(`- \`${r}\``);
    lines.push('');
  }

  return lines.join('\n');
}

main().catch(async (err) => {
  console.error(`[audit] failed: ${err.message}`);
  await activeServer?.stop?.().catch(() => {});
  process.exitCode = 1;
});
