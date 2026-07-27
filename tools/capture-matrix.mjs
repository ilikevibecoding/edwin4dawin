#!/usr/bin/env node
// ---------------------------------------------------------------------------
// npm run shots — capture the full screenshot matrix.  (owner: opus4)
//
// Boots the game in headless Chromium with software WebGL, walks every screen,
// every major room and every gameplay beat, writes PNGs into
// artifacts/screenshots/ under stable names, and writes an index at
// artifacts/screenshots/index.md with exposure and contrast measurements so the
// lead can audit a change without opening twenty images.
//
//   node tools/capture-matrix.mjs
//   node tools/capture-matrix.mjs --quality high --scale 1 --port 5174
//   node tools/capture-matrix.mjs --url http://127.0.0.1:5173   # reuse a server
//   node tools/capture-matrix.mjs --only rooms
//   node tools/capture-matrix.mjs --assets                      # + gallery views
// ---------------------------------------------------------------------------

import path from 'node:path';
import {
  parseArgs, startServer, openGame, writeJson, writeText,
  SCREENSHOT_DIR, ensureDir,
} from './lib/session.mjs';

const args = parseArgs();

const QUALITY = String(args.quality || 'medium');
const SCALE = Number(args.scale ?? 0.75);
const WIDTH = Number(args.width ?? 1920);
const HEIGHT = Number(args.height ?? 1080);
const ONLY = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
const WITH_ASSETS = !!args.assets;

/** Every checkpoint in `CHECKPOINTS`, in walking order through the building. */
const ROOMS = [
  'insertion', 'entrance', 'vestibule', 'lobby', 'reception', 'waiting',
  'weststair', 'breakroom', 'restrooms', 'openoffice', 'officeWest',
  'stairwell', 'conference', 'eastlink', 'midcorr', 'janitor', 'copyroom',
  'itroom', 'serverroom', 'mechanical', 'servicecorr', 'loading', 'garage',
  'execcorr', 'execoffice', 'archive', 'upperlanding', 'upperweststair',
];

const FLAGS = {
  darkMean: 0.03,
  brightMean: 0.75,
  flatStdDev: 0.02,
  crushedBlack: 0.55,
  blownHighlights: 0.3,
};

function flagsFor(m) {
  if (!m?.ok) return ['unreadable'];
  const out = [];
  if (m.meanLuminance < FLAGS.darkMean) out.push(`dark (mean ${m.meanLuminance})`);
  if (m.meanLuminance > FLAGS.brightMean) out.push(`overexposed (mean ${m.meanLuminance})`);
  if (m.stdDev < FLAGS.flatStdDev) out.push(`flat (sd ${m.stdDev})`);
  if (m.crushedBlackFraction > FLAGS.crushedBlack) out.push(`crushed blacks (${pct(m.crushedBlackFraction)})`);
  if (m.blownHighlightFraction > FLAGS.blownHighlights) out.push(`blown highlights (${pct(m.blownHighlightFraction)})`);
  if (m.distinctColours < 16) out.push(`near-blank (${m.distinctColours} colours)`);
  return out;
}

const pct = (n) => `${Math.round((n || 0) * 100)}%`;
const wanted = (group) => !ONLY || ONLY.includes(group);

/** Tracked so a failure part-way through still takes the dev server with it. */
let activeServer = null;

async function main() {
  const t0 = Date.now();
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5174) });
  activeServer = server;
  console.log(`[shots] server ${server.url}${server.reused ? ' (reused)' : ''}`);

  const g = await openGame({
    url: server.url, width: WIDTH, height: HEIGHT, quality: QUALITY, resolutionScale: SCALE,
  });
  console.log(`[shots] game booted at ${WIDTH}x${HEIGHT}, quality ${QUALITY}, scale ${SCALE}`);

  const rows = [];
  const add = async (name, note, group) => {
    // JPEG: this set is meant to be committed. See `session.mjs#capture`.
    const info = await g.shot(name, SCREENSHOT_DIR, { format: 'jpeg' });
    const row = {
      // `info.name` is the sanitised, lower-cased name the file was actually
      // written under. Recording the caller's spelling instead makes the JSON
      // disagree with the index and with the directory, which is how
      // `matrix-room-officeWest` came to look like a stale file and get deleted.
      name: info.name,
      note,
      group,
      screenshot: path.basename(info.file),
      ...info.metrics,
      flags: flagsFor(info.metrics),
    };
    rows.push(row);
    const tag = row.flags.length ? `  ! ${row.flags.join('; ')}` : '';
    console.log(`[shots] ${name}${tag}`);
    return row;
  };

  // `click` is the session's hit-test-aware one: with the render loop stopped
  // the compositor serves stale hit-test regions, and a naive click lands on
  // whichever screen was last painted. See `session.mjs#settle`.
  const {
    page, advance, qa, state, click,
  } = g;
  const mode = () => page.evaluate(() => window.__NORTHSTAR__.state);
  const waitMode = (want, ms = 20_000) => page.waitForFunction(
    (m) => window.__NORTHSTAR__.state === m, want, { timeout: ms }
  );

  // ------------------------------------------------------------ front end --
  if (wanted('menus')) {
    await waitMode('title');
    await advance(200);
    await add('matrix-01-title', 'Title screen over the live level', 'menus');

    await page.keyboard.press('Enter');
    await waitMode('menu');
    await advance(200);
    await add('matrix-02-menu', 'Main menu', 'menus');

    if (await click('#ui-root [data-menu="settings"]')) {
      await waitMode('settings');
      await advance(200);
      await add('matrix-03-settings', 'Settings', 'menus');
      await page.keyboard.press('Escape');
      await waitMode('menu');
    }
    if (await click('#ui-root [data-menu="controls"]')) {
      await waitMode('controls');
      await advance(200);
      await add('matrix-04-controls', 'Controls and key bindings', 'menus');
      await page.keyboard.press('Escape');
      await waitMode('menu');
    }
    if (await click('#ui-root [data-menu="deploy"]')) {
      await waitMode('difficulty');
      await advance(200);
      await add('matrix-05-difficulty', 'Difficulty selection', 'menus');
      await click('#ui-root [data-difficulty="operator"]');
      if (!(await click('#ui-root .screen-difficulty .btn.primary'))) await page.keyboard.press('Enter');
      await waitMode('briefing').catch(() => {});
      await advance(200);
      await add('matrix-06-briefing', 'Mission briefing and floor plan', 'menus');
      if (!(await click('#ui-root .screen-briefing .btn.primary'))) await page.keyboard.press('Enter');
      await waitMode('loadout').catch(() => {});
      await advance(200);
      await add('matrix-07-loadout', 'Loadout selection', 'menus');
      if (!(await click('#ui-root .screen-loadout .btn.primary'))) await page.keyboard.press('Enter');
      if ((await mode()) === 'loading') {
        await advance(60);
        await add('matrix-08-loading', 'Loading / deployment', 'menus');
      }
      for (let i = 0; i < 60 && (await mode()) !== 'playing'; i++) await advance(100);
    }
  }

  // Whatever happened above, make sure we are playing before the rest.
  if ((await mode()) !== 'playing') {
    await qa('forcePlay', { difficulty: 'operator', loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' } });
    await waitMode('playing');
  }
  await advance(800);
  await qa('setLighting', 'default');
  await qa('godMode', true);
  await qa('freezeAI', true);

  // ---------------------------------------------------------------- rooms --
  if (wanted('rooms')) {
    for (const room of ROOMS) {
      const jump = await qa('teleport', room);
      if (!jump.ok) {
        console.log(`[shots] skipped ${room}: ${jump.reason}`);
        continue;
      }
      await advance(240);
      const s = await state();
      await add(`matrix-room-${room}`, `${s.player.roomName || room} — production lighting`, 'rooms');
    }
  }

  // ------------------------------------------------------------- gameplay --
  if (wanted('gameplay')) {
    await qa('teleport', 'conference');
    await qa('giveWeapon', 'carbine');
    await advance(900);
    await add('matrix-20-hipfire', 'Hip-fire stance with the full HUD', 'gameplay');

    await page.evaluate(() => window.__NORTHSTAR__.input.setActionState('aim', true));
    await advance(700);
    await add('matrix-21-ads', 'Aiming down sights', 'gameplay');
    await page.evaluate(() => window.__NORTHSTAR__.input.setActionState('aim', false));
    await advance(400);

    await page.evaluate(() => window.__NORTHSTAR__.input.setActionState('attack', true));
    await advance(160);
    await add('matrix-22-firing', 'Mid-burst: flash, tracer, recoil and bloom', 'gameplay');
    await page.evaluate(() => window.__NORTHSTAR__.input.setActionState('attack', false));
    await advance(400);

    await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('reload'));
    await advance(500);
    await add('matrix-23-reloading', 'Mid-reload', 'gameplay');
    await advance(2600);

    await qa('giveWeapon', 'shotgun');
    await advance(900);
    await add('matrix-24-shotgun', 'CS-12 shotgun in hand', 'gameplay');
    await qa('giveWeapon', 'sniper');
    await advance(900);
    await page.evaluate(() => window.__NORTHSTAR__.input.setActionState('aim', true));
    await advance(900);
    await add('matrix-25-scoped', 'HL-700 scoped', 'gameplay');
    await page.evaluate(() => window.__NORTHSTAR__.input.setActionState('aim', false));
    await qa('giveWeapon', 'carbine');
    await advance(700);

    await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('map'));
    await advance(320);
    await add('matrix-26-minimap', 'Minimap / floor overlay', 'gameplay');
    await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('map'));
    await advance(200);

    await qa('godMode', false);
    await qa('damagePlayer', 55);
    await advance(140);
    await add('matrix-27-damaged', 'Damage vignette and low-health HUD', 'gameplay');
    await qa('healPlayer', true);
    await qa('godMode', true);
    await advance(300);

    await qa('showCollision', true);
    await advance(240);
    await add('matrix-28-collision', 'Collision wireframe overlay (dev)', 'gameplay');
    await qa('showCollision', false);
    await qa('showNav', true);
    await advance(240);
    await add('matrix-29-nav', 'Navigation mesh overlay (dev)', 'gameplay');
    await qa('showNav', false);
    await advance(200);
  }

  // -------------------------------------------------------- mission beats --
  if (wanted('mission')) {
    await qa('jumpToObjective', 'secure-hostage-a');
    await advance(500);
    await add('matrix-30-hostage-bound', 'Bound hostage before securing', 'mission');
    await qa('secureHostage', 'hostage-a');
    await advance(500);
    await add('matrix-31-hostage-secure', 'Hostage secured', 'mission');
    await qa('jumpToObjective', 'secure-hostage-b');
    await advance(500);
    await add('matrix-32-hostage-b', 'Second hostage in the executive office', 'mission');
    await qa('jumpToObjective', 'open-garage');
    await advance(600);
    await add('matrix-33-garage', 'Vehicle bay with the shutter raised', 'mission');
    await qa('jumpToObjective', 'escort-hostages');
    await advance(500);
    await add('matrix-34-escorting', 'Escorting both hostages', 'mission');
    await qa('extractHostages');
    await advance(900);
    await add('matrix-35-extraction', 'Extraction zone, hostages staged', 'mission');

    await page.keyboard.press('Escape');
    await advance(240);
    if ((await mode()) === 'paused') {
      await add('matrix-36-pause', 'Pause menu over the frozen frame', 'mission');
      await page.evaluate(() => window.__NORTHSTAR__.resume());
      await advance(400);
    }

    // Victory.
    for (let i = 0; i < 240 && (await state()).outcome !== 'victory'; i++) {
      await advance(250, { render: false });
    }
    if ((await state()).outcome === 'victory') {
      await advance(1600);
      await add('matrix-40-victory', 'Victory / after-action report', 'mission');
    } else {
      console.log('[shots] victory was not reached; skipping the victory shot');
    }

    // Defeat, on a fresh run.
    await qa('forcePlay', { difficulty: 'operator' });
    await advance(700);
    await qa('freezeAI', true);
    await qa('godMode', false);
    await page.evaluate(() => { window.__NORTHSTAR__.player.armor = 0; });
    for (let i = 0; i < 8 && (await state()).player.alive; i++) {
      await qa('damagePlayer', 30);
      await advance(220);
    }
    await advance(5000);
    if ((await mode()) === 'defeat') {
      await add('matrix-41-defeat', 'Defeat screen', 'mission');
    } else {
      console.log('[shots] defeat screen was not reached; skipping');
    }
  }

  // ------------------------------------------------------ lighting sweep --
  if (wanted('lighting')) {
    await qa('forcePlay', { difficulty: 'operator' });
    await advance(700);
    await qa('freezeAI', true);
    await qa('godMode', true);
    await qa('teleport', 'lobby');
    for (const sc of await qa('listLightingScenarios')) {
      await qa('setLighting', sc.name);
      await advance(260);
      await add(`matrix-light-${sc.name}`, `Lobby under "${sc.label || sc.name}"`, 'lighting');
    }
    await qa('setLighting', 'default');
  }

  // ------------------------------------------------- asset gallery views --
  if (WITH_ASSETS) {
    const opened = await qa('openGallery');
    if (opened.ok) {
      await advance(400);
      const samples = await page.evaluate(() => {
        const seen = new Map();
        for (const r of window.__NORTHSTAR__.gallery.records()) {
          if (!seen.has(r.category)) seen.set(r.category, r.id);
        }
        return Array.from(seen, ([category, id]) => ({ category, id }));
      });
      for (const sample of samples) {
        const capture = await qa('captureViews', sample.id);
        if (!capture?.ok) continue;
        for (const view of capture.views) {
          await qa('showView', view.index);
          await advance(240);
          await add(`asset-${sample.id}-${view.name}`.toLowerCase(), `${sample.category} / ${sample.id} — ${view.description}`, 'assets');
        }
      }
      await qa('closeGallery');
      await advance(300);
    } else {
      console.log(`[shots] gallery would not open: ${JSON.stringify(opened)}`);
    }
  }

  // ---------------------------------------------------------------- write --
  const flagged = rows.filter((r) => r.flags.length);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const meta = {
    generatedAt: new Date().toISOString(),
    elapsedSeconds: +elapsed,
    viewport: [WIDTH, HEIGHT],
    quality: QUALITY,
    resolutionScale: SCALE,
    thresholds: FLAGS,
    count: rows.length,
    flagged: flagged.length,
    consoleErrors: g.console.errors.slice(0, 20),
    failedRequests: g.console.failedRequests.slice(0, 20),
    rows,
  };
  writeJson('screenshots.json', meta);
  writeIndex(rows, meta);

  console.log(`[shots] ${rows.length} frames in ${elapsed}s; ${flagged.length} flagged`);
  if (g.console.errors.length) {
    console.log(`[shots] ${g.console.errors.length} console error(s):`);
    for (const e of g.console.errors.slice(0, 10)) console.log(`  - ${e}`);
  }
  console.log(`[shots] index: ${path.join(SCREENSHOT_DIR, 'index.md')}`);

  await g.close();
  await server.stop();
  process.exitCode = g.console.errors.length ? 1 : 0;
}

function writeIndex(rows, meta) {
  ensureDir(SCREENSHOT_DIR);
  const groups = [...new Set(rows.map((r) => r.group))];
  const lines = [
    '# Northstar Rescue — screenshot matrix',
    '',
    `Generated ${meta.generatedAt} by \`npm run shots\` — ${rows.length} frames at `
    + `${meta.viewport.join('x')}, quality \`${meta.quality}\`, resolution scale ${meta.resolutionScale}.`,
    '',
    'Rendered headless through SwiftShader, so these are geometry, layout and',
    'exposure references rather than a final image-quality bar.',
    '',
    '**Mean lum** is the average relative luminance of the frame (0..1).',
    '**Std dev** is how much the frame varies — a low value means a flat, featureless image.',
    '**Contrast** is Michelson contrast across the frame extremes.',
    '**Crushed** / **blown** are the fraction of pixels pinned at black or white.',
    '',
    'Every measurement is taken from the WebGL canvas, not from the saved image, so',
    'the menu rows all read the same: the UI is DOM drawn over the canvas, and the',
    'canvas behind all eight menu screens is the same courtyard frame. Judge the menus',
    'from the images; the numbers only describe the 3D behind them.',
    '',
    `## Flagged frames (${meta.flagged})`,
    '',
  ];
  if (!meta.flagged) lines.push('None — every frame is inside the advisory thresholds.', '');
  else {
    lines.push('| Shot | Problem |', '| --- | --- |');
    for (const r of rows.filter((x) => x.flags.length)) {
      lines.push(`| [${r.name}](./${r.screenshot}) | ${r.flags.join('; ')} |`);
    }
    lines.push('');
  }

  for (const group of groups) {
    const of = rows.filter((r) => r.group === group);
    lines.push(`## ${group} (${of.length})`, '');
    lines.push('| Shot | What it shows | Mean lum | Std dev | Contrast | Crushed | Blown | Colours | Flags |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of of) {
      lines.push(`| [${r.name}](./${r.screenshot}) | ${r.note || ''} | ${r.meanLuminance ?? '—'} | ${r.stdDev ?? '—'} | ${r.contrast ?? '—'} | ${pct(r.crushedBlackFraction)} | ${pct(r.blownHighlightFraction)} | ${r.distinctColours ?? '—'} | ${r.flags.join('; ') || '—'} |`);
    }
    lines.push('');
  }

  if (meta.consoleErrors.length) {
    lines.push('## Console errors during capture', '');
    for (const e of meta.consoleErrors) lines.push(`- \`${e}\``);
    lines.push('');
  }

  writeText(path.join(SCREENSHOT_DIR, 'index.md'), lines.join('\n'));
}

main().catch(async (err) => {
  console.error(`[shots] failed: ${err.message}`);
  await activeServer?.stop?.().catch(() => {});
  process.exitCode = 1;
});
