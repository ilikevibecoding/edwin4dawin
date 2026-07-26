import { test, expect } from '@playwright/test';
import {
  bootGame, advance, state, qa, shot, releaseAll,
  expectNoConsoleErrors, enterGameplay, writeArtifact, expectCanvasHasContent,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 11 — the asset manifest and the gallery.
//
// Three questions: is every declared record complete, does everything in the
// scene graph trace back to a record, and can the review tool actually show
// them? The first two are a manifest audit; the third drives the gallery.
// ---------------------------------------------------------------------------

test.describe('assets', () => {
  test('every registered record carries all required manifest fields', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });

    const report = await qa(page, 'assetReport');
    writeArtifact('assets-report.json', report);

    expect(report.summary.total, 'the asset registry is empty').toBeGreaterThan(20);
    expect(report.categories.length, 'assets are not categorised').toBeGreaterThan(2);

    // Rank by how many fields are missing so the worst offenders are obvious.
    const worst = report.missingFields
      .slice()
      .sort((a, b) => b.missing.length - a.missing.length)
      .slice(0, 20);
    const byOwner = {};
    for (const m of report.missingFields) {
      byOwner[m.owner || 'unknown'] = (byOwner[m.owner || 'unknown'] || 0) + 1;
    }
    writeArtifact('assets-missing-fields.json', {
      requiredFields: report.requiredFields,
      incompleteRecords: report.missingFields.length,
      totalRecords: report.summary.total,
      byOwner, worst,
    });

    expect(
      report.missingFields,
      `${report.missingFields.length}/${report.summary.total} records are missing required manifest fields `
      + `(by owner: ${JSON.stringify(byOwner)}). Worst:\n${JSON.stringify(worst, null, 2)}`
    ).toEqual([]);

    await expectNoConsoleErrors(page);
  });

  test('no object in the scene carries an unregistered assetId', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });
    // Visit a spread of rooms so lazily-built geometry is instantiated too.
    for (const cp of ['lobby', 'openoffice', 'conference', 'serverroom', 'garage', 'execoffice', 'breakroom']) {
      await qa(page, 'teleport', cp);
      await advance(page, 200, { step: 60 });
    }

    const report = await qa(page, 'assetReport');
    writeArtifact('assets-scene.json', {
      sceneAssetIds: report.sceneAssetIds,
      unregisteredInScene: report.unregisteredInScene,
      neverInstantiated: report.neverInstantiated,
      unusedRecords: report.unusedRecords,
    });

    expect(report.sceneAssetIds, 'nothing in the scene is tagged with an assetId at all').toBeGreaterThan(5);
    expect(
      report.unregisteredInScene,
      `the scene contains assetIds with no manifest record:\n${JSON.stringify(report.unregisteredInScene, null, 2)}`
    ).toEqual([]);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('registered-but-never-instantiated records are reported', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });
    for (const cp of ['lobby', 'openoffice', 'conference', 'serverroom', 'garage', 'execoffice', 'archive', 'loading', 'janitor', 'copyroom', 'restrooms', 'mechanical']) {
      await qa(page, 'teleport', cp);
      await advance(page, 180, { step: 60 });
    }

    const report = await qa(page, 'assetReport');
    const byCategory = {};
    const byOwner = {};
    for (const r of report.neverInstantiated) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byOwner[r.owner || 'unknown'] = (byOwner[r.owner || 'unknown'] || 0) + 1;
    }
    writeArtifact('assets-unused.json', {
      total: report.summary.total,
      neverInstantiated: report.neverInstantiated.length,
      byCategory, byOwner,
      records: report.neverInstantiated,
    });

    // This is a reporting test, not a gate: an unused record is a content gap
    // for its owner, not a crash. It only fails if the manifest is mostly dead.
    const ratio = report.neverInstantiated.length / Math.max(1, report.summary.total);
    expect(
      ratio,
      `${report.neverInstantiated.length}/${report.summary.total} records were never instantiated `
      + `(by owner: ${JSON.stringify(byOwner)})`
    ).toBeLessThan(0.5);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('the asset gallery opens and can display a sample from every category', async ({ page }) => {
    test.slow();
    await bootGame(page, { quality: 'medium', resolutionScale: 0.6 });
    await enterGameplay(page, { freezeAI: true });

    const opened = await qa(page, 'openGallery');
    expect(opened.ok, `openGallery failed: ${JSON.stringify(opened)}`).toBe(true);
    await advance(page, 400, { step: 80 });

    expect(await page.evaluate(() => window.__NORTHSTAR__.gallery.visible), 'the gallery is not visible').toBe(true);
    await expect(page.locator('#asset-gallery')).toBeVisible();
    await shot(page, 'gallery-open');
    await expectCanvasHasContent(page, { label: 'gallery', minColours: 24, minStdDev: 0.01 });

    // One representative record per category.
    const catalogue = await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      const records = g.gallery.records();
      const byCategory = new Map();
      for (const r of records) if (!byCategory.has(r.category)) byCategory.set(r.category, r.id);
      return { total: records.length, samples: Array.from(byCategory, ([category, id]) => ({ category, id })) };
    });
    expect(catalogue.total, 'the gallery lists no records').toBeGreaterThan(20);
    expect(catalogue.samples.length, 'the gallery covers no categories').toBeGreaterThan(2);

    const rows = [];
    const failures = [];
    for (const sample of catalogue.samples) {
      const selected = await qa(page, 'gallerySelect', sample.id);
      await advance(page, 320, { step: 80 });
      const gs = await qa(page, 'galleryState');
      const info = await shot(page, `gallery-${sample.category}-${sample.id}`);

      rows.push({
        ...sample,
        selected: gs?.selected ?? null,
        stats: gs?.stats ?? null,
        discrepancy: gs?.discrepancy ?? null,
        metrics: info.metrics,
        screenshot: info.relative,
      });
      if (gs?.selected !== sample.id) {
        failures.push(`${sample.category}/${sample.id}: gallery reports "${gs?.selected}" as selected`);
      } else if (!gs?.stats || gs.stats.buildFailed) {
        failures.push(`${sample.category}/${sample.id}: nothing was built on the turntable (${JSON.stringify(gs?.stats)})`);
      } else if (info.metrics.distinctColours < 16) {
        failures.push(`${sample.category}/${sample.id}: the stage renders a blank frame (${info.metrics.distinctColours} colours)`);
      }
      void selected;
    }

    // The canonical inspection views the capture tool relies on.
    const capture = await qa(page, 'captureViews', catalogue.samples[0].id);
    expect(capture?.ok, `captureViews failed: ${JSON.stringify(capture)}`).toBe(true);
    const views = capture.views;
    expect(views.length, 'captureViews returned no views').toBeGreaterThanOrEqual(4);
    for (const name of ['neutral', 'production', 'close', 'gameplay']) {
      expect(
        views.some((v) => String(v.name).toLowerCase().includes(name)),
        `captureViews is missing the "${name}" view: ${JSON.stringify(views.map((v) => v.name))}`
      ).toBe(true);
    }
    for (let i = 0; i < views.length; i++) {
      const shown = await qa(page, 'showView', i);
      expect(shown.ok, `showView(${i}) failed: ${JSON.stringify(shown)}`).toBe(true);
      await advance(page, 260, { step: 80 });
      await shot(page, `gallery-view-${String(views[i].name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
    }

    // Filtering and search must narrow the list.
    const filtered = await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      const all = g.gallery.records().length;
      g.gallery.setFilter({ category: g.gallery.records()[0].category });
      const narrowed = g.gallery.records().length;
      g.gallery.setFilter({ category: null, search: 'zzzz-no-such-asset' });
      const none = g.gallery.records().length;
      g.gallery.setFilter({ category: null, search: '' });
      return { all, narrowed, none, restored: g.gallery.records().length };
    });
    expect(filtered.narrowed, 'filtering by category did not narrow the list').toBeLessThanOrEqual(filtered.all);
    expect(filtered.none, 'a nonsense search still matched records').toBe(0);
    expect(filtered.restored).toBe(filtered.all);

    writeArtifact('assets-gallery.json', { catalogue, rows, views: capture.views, filtered, failures });

    const closed = await qa(page, 'closeGallery');
    expect(closed.ok).toBe(true);
    await advance(page, 300, { step: 80 });
    expect(await page.evaluate(() => window.__NORTHSTAR__.gallery.visible), 'the gallery did not close').toBe(false);

    // Closing must restore the world, not leave a blank scene behind.
    await qa(page, 'forcePlay', {});
    await advance(page, 600, { step: 80 });
    await expectCanvasHasContent(page, { label: 'after gallery', minColours: 48, minStdDev: 0.015 });
    await shot(page, 'gallery-closed');

    expect(failures, `gallery could not display:\n${failures.join('\n')}`).toEqual([]);
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });
});
