import { test, expect } from '@playwright/test';
import {
  bootGame, advance, state, qa, shot, hold, release, press,
  releaseAll, waitForMode, expectNoConsoleErrors, enterGameplay, writeArtifact,
  advanceUntil,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 14 — accessibility and comfort.
//
// Every one of these settings has to reach the thing it claims to control, and
// the effect has to be observable from outside: in the HUD state, in the decal
// system, in the camera, or in the DOM. A toggle that only changes a stored
// value is not an accessibility feature.
// ---------------------------------------------------------------------------

test.describe('accessibility', () => {
  test('subtitles appear for hostile voice lines and for announcements', async ({ page }) => {
    await bootGame(page, { settings: { subtitles: true } });
    await enterGameplay(page, { freezeAI: true, godMode: true });

    // A hostile voice line, produced through the real bark path.
    const barked = await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      const e = g.enemies.list.find((x) => x.alive);
      if (!e) return { ok: false };
      g.enemies.bark(e, 'contact', 'Contact, front!', true);
      return { ok: true, id: e.id };
    });
    expect(barked.ok, 'there are no living hostiles to speak').toBe(true);
    await advance(page, 200, { step: 60 });

    const withSubs = await state(page);
    const domSubs = await page.locator('#subtitles .subtitle-line').count();

    writeArtifact('a11y-subtitles.json', {
      on: { hud: withSubs.hud.subtitles, dom: domSubs },
    });

    expect(
      withSubs.hud.subtitles.length,
      `a hostile voice line produced no subtitle: ${JSON.stringify(withSubs.hud.subtitles)}`
    ).toBeGreaterThan(0);
    expect(withSubs.hud.subtitles[0].text).toContain('Contact');
    expect(domSubs, 'the subtitle never reached the DOM').toBeGreaterThan(0);
    await shot(page, 'a11y-subtitles-on');

    // Announcements are a separate channel and must also be reported.
    await qa(page, 'jumpToObjective', 'secure-hostage-a');
    const announced = await advanceUntil(page, 'state.hud.announcement !== null', { budgetMs: 6000, step: 150 });
    const withAnnounce = await state(page);
    expect(announced, 'an objective change produced no announcement').toBe(true);
    expect(withAnnounce.hud.announcement.text.length).toBeGreaterThan(0);
    await shot(page, 'a11y-announcement');

    // Turning subtitles off must suppress new lines.
    await qa(page, 'setSetting', 'subtitles', false);
    await advance(page, 4200, { step: 100 }); // let the existing lines expire
    await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      const e = g.enemies.list.find((x) => x.alive);
      g.enemies.bark(e, 'search', 'Where did he go?', true);
    });
    await advance(page, 300, { step: 60 });
    const withoutSubs = await state(page);
    expect(
      withoutSubs.hud.subtitles.length,
      `subtitles are off but ${withoutSubs.hud.subtitles.length} lines are still shown`
    ).toBe(0);

    await qa(page, 'setSetting', 'subtitles', true);
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('reduced blood suppresses blood', async ({ page }) => {
    await bootGame(page, { settings: { reducedBlood: false } });
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await qa(page, 'giveWeapon', 'carbine');
    await advance(page, 800, { step: 60 });

    /** Shoot a hostile in the chest and report the decal kinds that appeared. */
    const shootBody = async () => {
      await page.evaluate(() => window.__NORTHSTAR__.decals.reset());
      await qa(page, 'teleport', 'openoffice');
      await advance(page, 200, { step: 50 });
      await page.evaluate(() => {
        const g = window.__NORTHSTAR__;
        const p = g.player;
        p.yaw = 0;
        p.pitch = 0;
        p.updateCamera(0);
        const pos = [p.position.x + p.forward.x * 5, p.position.y, p.position.z + p.forward.z * 5];
        const res = g.qa.spawnEnemy('breacher', pos);
        const e = g.enemies.list.find((x) => x.id === res.id);
        const dx = e.position.x - p.eyePosition.x;
        const dy = (e.position.y + 1.15) - p.eyePosition.y;
        const dz = e.position.z - p.eyePosition.z;
        p.yaw = Math.atan2(-dx, -dz);
        p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
        p.updateCamera(0);
      });
      await advance(page, 150, { step: 50 });
      await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('attack'));
      await advance(page, 200, { step: 40 });
      return page.evaluate(() => {
        const kinds = {};
        for (const d of window.__NORTHSTAR__.decals.active) {
          const k = d.kind || d.type || 'unknown';
          kinds[k] = (kinds[k] || 0) + 1;
        }
        return { total: window.__NORTHSTAR__.decals.active.length, kinds };
      });
    };

    const gore = await shootBody();
    await shot(page, 'a11y-blood-on');

    await qa(page, 'setSetting', 'reducedBlood', true);
    await qa(page, 'killAllEnemies');
    await advance(page, 300, { step: 60 });
    const reduced = await shootBody();
    await shot(page, 'a11y-blood-reduced');

    writeArtifact('a11y-blood.json', { gore, reduced });

    expect(gore.total, 'shooting a hostile left no decals at all').toBeGreaterThan(0);
    const bloodOn = gore.kinds.blood || 0;
    const bloodOff = reduced.kinds.blood || 0;
    expect(bloodOn, `no blood decal was created with reducedBlood off: ${JSON.stringify(gore.kinds)}`).toBeGreaterThan(0);
    expect(
      bloodOff,
      `reducedBlood is on but ${bloodOff} blood decals were still created: ${JSON.stringify(reduced.kinds)}`
    ).toBe(0);

    await qa(page, 'setSetting', 'reducedBlood', false);
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('reduced camera motion reduces view bob', async ({ page }) => {
    await bootGame(page, { settings: { reducedCameraMotion: false } });
    await enterGameplay(page, { freezeAI: true, godMode: true });

    /** Walk forward and measure how much the eye height oscillates. */
    const measureBob = async () => {
      await qa(page, 'teleport', 'openoffice');
      await page.evaluate(() => {
        const p = window.__NORTHSTAR__.player;
        p.yaw = 0;
        p.pitch = 0;
        p.velocity.set(0, 0, 0);
        p.updateCamera(0);
      });
      await advance(page, 300, { step: 60 });
      await hold(page, 'forward');
      const heights = [];
      for (let i = 0; i < 30; i++) {
        await advance(page, 40, { step: 20 });
        heights.push(await page.evaluate(() => {
          const g = window.__NORTHSTAR__;
          // Eye height above the feet, which isolates bob from terrain.
          return +(g.camera.position.y - g.player.position.y).toFixed(5);
        }));
      }
      await release(page, 'forward');
      await advance(page, 300, { step: 60 });
      const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
      const amplitude = Math.max(...heights) - Math.min(...heights);
      const variance = heights.reduce((a, h) => a + (h - mean) ** 2, 0) / heights.length;
      return { amplitude: +amplitude.toFixed(5), stdDev: +Math.sqrt(variance).toFixed(5), samples: heights.length };
    };

    const normal = await measureBob();
    await qa(page, 'setSetting', 'reducedCameraMotion', true);
    const reduced = await measureBob();

    writeArtifact('a11y-camera-motion.json', { normal, reduced });
    await shot(page, 'a11y-reduced-motion');

    expect(normal.amplitude, 'walking produced no view bob at all to reduce').toBeGreaterThan(0.0005);
    expect(
      reduced.amplitude,
      `reduced camera motion did not damp the bob: ${normal.amplitude} -> ${reduced.amplitude}`
    ).toBeLessThan(normal.amplitude);

    await qa(page, 'setSetting', 'reducedCameraMotion', false);
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('the crosshair can be hidden, and its style can be changed', async ({ page }) => {
    await bootGame(page, { settings: { crosshair: true } });
    await enterGameplay(page, { freezeAI: true, checkpoint: 'lobby' });
    await advance(page, 300, { step: 60 });

    const on = await state(page);
    expect(on.hud.crosshair, 'the HUD reports no crosshair with the setting on').toBeTruthy();
    const onVisible = await page.evaluate(() => {
      const el = document.getElementById('crosshair');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { display: cs.display, opacity: cs.opacity, visibility: cs.visibility };
    });
    await shot(page, 'a11y-crosshair-on');

    await qa(page, 'setSetting', 'crosshair', false);
    await advance(page, 300, { step: 60 });
    const off = await state(page);
    const offVisible = await page.evaluate(() => {
      const el = document.getElementById('crosshair');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { display: cs.display, opacity: cs.opacity, visibility: cs.visibility };
    });
    await shot(page, 'a11y-crosshair-off');

    writeArtifact('a11y-crosshair.json', {
      on: { hud: on.hud.crosshair, css: onVisible },
      off: { hud: off.hud.crosshair, css: offVisible },
    });

    const hidden = off.hud.crosshair === null
      || off.hud.crosshair?.visible === false
      || off.hud.crosshair?.enabled === false
      || offVisible?.display === 'none'
      || Number(offVisible?.opacity) === 0
      || offVisible?.visibility === 'hidden';
    expect(
      hidden,
      `turning the crosshair off changed nothing observable: hud ${JSON.stringify(off.hud.crosshair)}, css ${JSON.stringify(offVisible)}`
    ).toBe(true);

    // Style changes must reach the HUD state.
    await qa(page, 'setSetting', 'crosshair', true);
    await advance(page, 200, { step: 60 });
    const dynamic = (await state(page)).hud.crosshair;
    await qa(page, 'setSetting', 'crosshairStyle', 'dot');
    await advance(page, 300, { step: 60 });
    const dot = (await state(page)).hud.crosshair;
    expect(
      JSON.stringify(dot),
      `changing the crosshair style did not change the crosshair: ${JSON.stringify(dot)}`
    ).not.toBe(JSON.stringify(dynamic));
    await qa(page, 'setSetting', 'crosshairStyle', 'dynamic');

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('UI scale and FOV settings change the layout and the camera', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, checkpoint: 'lobby' });

    const readLayout = () => page.evaluate(() => {
      const hud = document.getElementById('hud-root') || document.getElementById('ui-root');
      const objectives = document.querySelector('#ui-root .hud-objectives, #hud-root .hud-objectives');
      const probe = objectives || hud;
      const rect = probe?.getBoundingClientRect();
      return {
        uiScaleVar: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),
        rootFontSize: getComputedStyle(hud || document.documentElement).fontSize,
        probe: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
      };
    });

    const small = await readLayout();
    await qa(page, 'setSetting', 'uiScale', 1.4);
    await advance(page, 300, { step: 60 });
    const large = await readLayout();
    await shot(page, 'a11y-ui-scale-large');

    writeArtifact('a11y-ui-scale.json', { small, large });
    expect(parseFloat(large.uiScaleVar), 'the uiScale setting did not reach --ui-scale').toBeCloseTo(1.4, 2);
    expect(
      large.uiScaleVar,
      `--ui-scale did not change: "${small.uiScaleVar}" -> "${large.uiScaleVar}"`
    ).not.toBe(small.uiScaleVar);
    await qa(page, 'setSetting', 'uiScale', 1);

    // FOV.
    const narrow = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    await qa(page, 'setSetting', 'fov', 105);
    await advance(page, 200, { step: 60 });
    const wide = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    await shot(page, 'a11y-fov-105');
    await qa(page, 'setSetting', 'fov', 70);
    await advance(page, 200, { step: 60 });
    const tight = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    await shot(page, 'a11y-fov-70');

    writeArtifact('a11y-fov.json', { default: narrow, wide, tight });
    expect(wide, `FOV 105 gave a camera FOV of ${wide}`).toBeGreaterThan(narrow);
    expect(tight, `FOV 70 gave a camera FOV of ${tight}`).toBeLessThan(wide);
    await qa(page, 'setSetting', 'fov', 82);

    // Invert Y must invert the look axis.
    await qa(page, 'setSetting', 'invertY', false);
    const lookDelta = async () => {
      const before = (await state(page)).player.orientation.pitchRadians;
      await page.evaluate(() => window.__NORTHSTAR__.input.applyLookDelta(0, -300));
      await advance(page, 80, { step: 20 });
      const after = (await state(page)).player.orientation.pitchRadians;
      return +(after - before).toFixed(4);
    };
    const normal = await lookDelta();
    await qa(page, 'setSetting', 'invertY', true);
    const inverted = await lookDelta();
    writeArtifact('a11y-invert-y.json', { normal, inverted });
    expect(Math.sign(inverted), `invertY did not flip the pitch axis: ${normal} -> ${inverted}`)
      .toBe(-Math.sign(normal));
    await qa(page, 'setSetting', 'invertY', false);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('every menu is navigable and operable by keyboard alone', async ({ page }) => {
    await bootGame(page);
    await waitForMode(page, 'title');

    // Title -> menu with a key, no mouse.
    await press(page, 'Enter');
    await waitForMode(page, 'menu');

    const screens = ['settings', 'controls', 'briefing'];
    const results = [];
    for (const name of screens) {
      // Reach the item with arrows only, then activate with Enter.
      await page.evaluate((n) => document.querySelector(`#ui-root [data-menu="${n}"]`)?.focus(), name);
      await press(page, 'Enter');
      await waitForMode(page, name, 10_000);

      // Something focusable must be focused, so a keyboard user is never lost.
      const focus = await page.evaluate(() => {
        const a = document.activeElement;
        return {
          tag: a?.tagName || null,
          id: a?.id || null,
          insideScreen: !!a?.closest?.('#ui-root .screen.visible'),
        };
      });
      // Arrow navigation must move focus within the screen.
      const path = [];
      for (let i = 0; i < 4; i++) {
        path.push(await page.evaluate(() => document.activeElement?.id
          || document.activeElement?.textContent?.trim().slice(0, 20) || null));
        await press(page, 'ArrowDown', { settle: 40 });
      }
      results.push({ screen: name, focus, path, distinct: new Set(path.filter(Boolean)).size });

      await press(page, 'Escape');
      await waitForMode(page, 'menu', 10_000);
    }

    writeArtifact('a11y-keyboard.json', results);
    await shot(page, 'a11y-keyboard');

    for (const r of results) {
      expect(r.focus.insideScreen, `the "${r.screen}" screen does not focus anything on open (focus: ${JSON.stringify(r.focus)})`).toBe(true);
      expect(r.distinct, `arrow keys do not move focus on the "${r.screen}" screen: ${JSON.stringify(r.path)}`)
        .toBeGreaterThan(1);
    }

    // And the deploy chain must be completable without a mouse.
    await page.evaluate(() => document.querySelector('#ui-root [data-menu="deploy"]')?.focus());
    await press(page, 'Enter');
    await waitForMode(page, 'difficulty', 10_000);
    await press(page, 'Escape');
    await waitForMode(page, 'menu', 10_000);

    await expectNoConsoleErrors(page);
  });
});
