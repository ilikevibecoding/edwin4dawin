import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  bootGame, advance, state, qa, shot, hold, release, tap, press, clickAny,
  releaseAll, waitForMode, gameMode, expectNoConsoleErrors, enterGameplay,
  writeArtifact, advanceUntil, SCREENSHOT_DIR,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 12 — the canonical screenshot matrix.
//
// Captures every screen and every major beat under stable names, and measures
// each frame so crushed blacks and blown highlights are numbers in a report
// rather than something the lead has to spot by eye. This is the spec that
// produces `artifacts/screenshots/index.md`.
// ---------------------------------------------------------------------------

/** Rooms shot in production lighting for the matrix. */
const MATRIX_ROOMS = [
  'insertion', 'entrance', 'vestibule', 'lobby', 'reception', 'waiting',
  'stairwell', 'openoffice', 'conference', 'breakroom', 'midcorr', 'copyroom',
  'serverroom', 'servicecorr', 'loading', 'garage', 'execcorr', 'execoffice',
  'archive', 'upperlanding',
];

/** Judgement thresholds used to flag, not to fail, each captured frame. */
const FLAGS = {
  darkMean: 0.03,
  brightMean: 0.75,
  flatStdDev: 0.02,
  crushedBlack: 0.55,
  blownHighlights: 0.3,
};

function flagsFor(m) {
  const out = [];
  if (!m?.ok) return ['unreadable'];
  if (m.meanLuminance < FLAGS.darkMean) out.push(`dark (mean ${m.meanLuminance})`);
  if (m.meanLuminance > FLAGS.brightMean) out.push(`overexposed (mean ${m.meanLuminance})`);
  if (m.stdDev < FLAGS.flatStdDev) out.push(`flat (sd ${m.stdDev})`);
  if (m.crushedBlackFraction > FLAGS.crushedBlack) out.push(`crushed blacks (${(m.crushedBlackFraction * 100).toFixed(0)}%)`);
  if (m.blownHighlightFraction > FLAGS.blownHighlights) out.push(`blown highlights (${(m.blownHighlightFraction * 100).toFixed(0)}%)`);
  return out;
}

test.describe('visual', () => {
  test('capture and measure the canonical screenshot matrix', async ({ page }) => {
    test.slow();
    const captured = [];
    const capture = async (name, note) => {
      const info = await shot(page, name);
      const row = { name, note, ...info.metrics, screenshot: path.basename(info.path), flags: flagsFor(info.metrics) };
      captured.push(row);
      return row;
    };

    await bootGame(page, { quality: 'medium', resolutionScale: 0.6 });

    // ---------------------------------------------------------- front end --
    await waitForMode(page, 'title');
    await advance(page, 200);
    await capture('matrix-01-title', 'Title screen with the live level behind the storm scrim');

    await press(page, 'Enter');
    await waitForMode(page, 'menu');
    await advance(page, 200);
    await capture('matrix-02-menu', 'Main menu');

    await clickAny(page, ['#ui-root [data-menu="settings"]']);
    await waitForMode(page, 'settings');
    await advance(page, 200);
    await capture('matrix-03-settings', 'Settings');
    await press(page, 'Escape');
    await waitForMode(page, 'menu');

    await clickAny(page, ['#ui-root [data-menu="controls"]']);
    await waitForMode(page, 'controls');
    await advance(page, 200);
    await capture('matrix-04-controls', 'Controls and bindings');
    await press(page, 'Escape');
    await waitForMode(page, 'menu');

    await clickAny(page, ['#ui-root [data-menu="deploy"]']);
    await waitForMode(page, 'difficulty');
    await advance(page, 200);
    await capture('matrix-05-difficulty', 'Difficulty selection');

    await clickAny(page, ['#ui-root [data-difficulty="operator"]']);
    await clickAny(page, ['#ui-root .screen-difficulty .btn.primary'], { fallbackKey: 'Enter' });
    await waitForMode(page, 'briefing');
    await advance(page, 200);
    await capture('matrix-06-briefing', 'Mission briefing and floor plan');

    await clickAny(page, ['#ui-root .screen-briefing .btn.primary'], { fallbackKey: 'Enter' });
    await waitForMode(page, 'loadout');
    await advance(page, 200);
    await capture('matrix-07-loadout', 'Loadout selection');

    await clickAny(page, ['#ui-root .screen-loadout .btn.primary'], { fallbackKey: 'Enter' });
    // Catch the loading screen before it hands over.
    if ((await gameMode(page)) === 'loading') {
      await advance(page, 60);
      await capture('matrix-08-loading', 'Loading / deployment screen');
    }
    for (let i = 0; i < 60 && (await gameMode(page)) !== 'playing'; i++) await advance(page, 100, { step: 50 });

    // If the real chain cannot complete, fall back so the rest of the matrix
    // still gets captured — the menu spec is what fails on that defect.
    if ((await gameMode(page)) !== 'playing') {
      await qa(page, 'forcePlay', { difficulty: 'operator' });
      await waitForMode(page, 'playing');
    }
    await advance(page, 800, { step: 60 });
    await qa(page, 'setLighting', 'default');
    await qa(page, 'godMode', true);
    await qa(page, 'freezeAI', true);

    // ------------------------------------------------------------- rooms --
    for (const room of MATRIX_ROOMS) {
      const jump = await qa(page, 'teleport', room);
      if (!jump.ok) continue;
      await advance(page, 240, { step: 60 });
      const s = await state(page);
      await capture(`matrix-room-${room}`, `${s.player.roomName || room} — production lighting`);
    }

    // ---------------------------------------------------------- gameplay --
    await qa(page, 'teleport', 'conference');
    await qa(page, 'giveWeapon', 'carbine');
    await advance(page, 900, { step: 60 });
    await capture('matrix-20-hipfire', 'Hip-fire stance with the HUD');

    await hold(page, 'aim');
    await advance(page, 700, { step: 50 });
    await capture('matrix-21-ads', 'Aiming down sights');
    await release(page, 'aim');
    await advance(page, 400, { step: 50 });

    await hold(page, 'attack');
    await advance(page, 160, { step: 20 });
    await capture('matrix-22-firing', 'Mid-burst: muzzle flash, tracer and recoil');
    await release(page, 'attack');
    await advance(page, 400, { step: 60 });

    await tap(page, 'reload');
    await advance(page, 500, { step: 40 });
    await capture('matrix-23-reloading', 'Mid-reload');
    await advance(page, 2600, { step: 60 });

    await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('map'));
    await advance(page, 300, { step: 60 });
    await capture('matrix-24-minimap', 'Minimap / floor overlay');
    await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('map'));
    await advance(page, 200, { step: 60 });

    // Damage overlay: take a hit with godmode off, then heal.
    await qa(page, 'godMode', false);
    await qa(page, 'damagePlayer', 55);
    await advance(page, 140, { step: 40 });
    await capture('matrix-25-damaged', 'Damage vignette and low-health HUD');
    await qa(page, 'healPlayer', true);
    await qa(page, 'godMode', true);
    await advance(page, 300, { step: 60 });

    // ------------------------------------------------------- mission beats --
    await qa(page, 'freezeAI', true);
    await qa(page, 'jumpToObjective', 'secure-hostage-a');
    await advance(page, 500, { step: 60 });
    await capture('matrix-30-hostage-bound', 'Bound hostage, before securing');

    await qa(page, 'secureHostage', 'hostage-a');
    await advance(page, 500, { step: 60 });
    await capture('matrix-31-hostage-secure', 'Hostage secured');

    await qa(page, 'jumpToObjective', 'escort-hostages');
    await advance(page, 500, { step: 60 });
    await capture('matrix-32-escorting', 'Escorting both hostages');

    await qa(page, 'extractHostages');
    await advance(page, 800, { step: 60 });
    await capture('matrix-33-extraction', 'Extraction zone, hostages staged');

    // ------------------------------------------------------------- pause --
    await page.keyboard.press('Escape');
    await advance(page, 200);
    if ((await gameMode(page)) === 'paused') {
      await capture('matrix-34-pause', 'Pause menu over the frozen frame');
      await page.evaluate(() => window.__NORTHSTAR__.resume());
      await advance(page, 400, { step: 60 });
    }

    // ---------------------------------------------------------- endings --
    const won = await advanceUntil(page, "state.outcome === 'victory'", { budgetMs: 60_000, step: 250, render: false });
    if (won) {
      await advance(page, 1600, { step: 100 });
      await capture('matrix-40-victory', 'Victory / after-action report');
    }

    // Defeat on a fresh run.
    await qa(page, 'forcePlay', { difficulty: 'operator' });
    await advance(page, 600, { step: 60 });
    await qa(page, 'freezeAI', true);
    await qa(page, 'godMode', false);
    await page.evaluate(() => { window.__NORTHSTAR__.player.armor = 0; });
    for (let i = 0; i < 8 && (await state(page)).player.alive; i++) {
      await qa(page, 'damagePlayer', 30);
      await advance(page, 200, { step: 50 });
    }
    await advance(page, 5000, { step: 100 });
    if ((await gameMode(page)) === 'defeat') {
      await capture('matrix-41-defeat', 'Defeat screen');
    }

    // ------------------------------------------------------------ report --
    const flagged = captured.filter((r) => r.flags.length);
    writeArtifact('visual-matrix.json', { thresholds: FLAGS, count: captured.length, captured, flagged });
    writeIndex(captured);

    await releaseAll(page);

    // The matrix has to be complete, and every frame has to be a real image.
    const missing = ['matrix-01-title', 'matrix-02-menu', 'matrix-06-briefing', 'matrix-07-loadout', 'matrix-21-ads', 'matrix-22-firing', 'matrix-23-reloading']
      .filter((name) => !captured.some((r) => r.name === name));
    expect(missing, `the matrix is missing required shots: ${missing.join(', ')}`).toEqual([]);
    expect(captured.length, 'the matrix captured almost nothing').toBeGreaterThan(25);

    const blank = captured.filter((r) => r.distinctColours < 12 || r.stdDev < 0.004);
    expect(blank.map((r) => r.name), `these captures are blank frames: ${JSON.stringify(blank, null, 2)}`).toEqual([]);

    await expectNoConsoleErrors(page);
  });
});

/** The before/after screenshot index the lead reviews. */
function writeIndex(rows) {
  const lines = [
    '# Screenshot matrix',
    '',
    `Captured by \`tests/visual.spec.js\` — ${rows.length} frames at 1920x1080.`,
    '',
    'Luminance is the mean of the 0..1 relative luminance of the frame; contrast is',
    'Michelson contrast over the frame extremes; "crushed" and "blown" are the',
    'fraction of pixels pinned at the bottom or top of the range. Flags are',
    'advisory thresholds, not failures.',
    '',
    '| Shot | What it shows | Mean lum | Std dev | Contrast | Crushed | Blown | Colours | Flags |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of rows) {
    lines.push(`| [${r.name}](./${r.screenshot}) | ${r.note || ''} | ${r.meanLuminance ?? '—'} | ${r.stdDev ?? '—'} | ${r.contrast ?? '—'} | ${((r.crushedBlackFraction ?? 0) * 100).toFixed(0)}% | ${((r.blownHighlightFraction ?? 0) * 100).toFixed(0)}% | ${r.distinctColours ?? '—'} | ${r.flags.join('; ') || '—'} |`);
  }
  lines.push('');
  const flagged = rows.filter((r) => r.flags.length);
  lines.push(`## Flagged frames (${flagged.length})`, '');
  if (!flagged.length) lines.push('None.');
  for (const r of flagged) lines.push(`- **${r.name}** — ${r.flags.join('; ')}`);
  lines.push('');
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  // `index.md` belongs to `tools/capture-matrix.mjs`; the test run writes its
  // own file so the two never clobber each other.
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'visual-matrix.md'), `${lines.join('\n')}\n`);
}
