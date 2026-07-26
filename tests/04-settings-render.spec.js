// Settings, quality presets, resize/resolution handling, state↔render agreement
// and accessibility options. Scenarios S03, S50–S53 plus the accessibility
// verification pass (docs/reports/opus4-qa.md).

import { test, expect } from '@playwright/test';
import {
  gotoGame, state, adv, startMission, qa, hold, newGamePage, frameBrightness, shot,
} from './helpers.js';

const SHADOWS_BY_PRESET = { low: false, medium: true, high: true, ultra: true };
const SHADOW_MAP_BY_PRESET = { low: 512, medium: 1024, high: 2048, ultra: 2048 };

test('S03: settings apply live and persist across a reload', async ({ browser }) => {
  const { page, errors } = await newGamePage(browser);

  expect(await qa(page, 'qa.cameraFov()')).toBeCloseTo(74, 1);
  await page.evaluate(() => {
    window.__qa.setSetting('fov', 92);
    window.__qa.setSetting('mouseSensitivity', 1.25);
    window.__qa.setSetting('quality', 'medium');
  });
  // fov is applied live through the settings appliers, not on next boot
  expect(await qa(page, 'qa.cameraFov()')).toBeCloseTo(92, 1);
  let info = await qa(page, 'qa.rendererInfo()');
  expect(info.quality).toBe('medium');
  expect(info.shadowMapSize).toBe(SHADOW_MAP_BY_PRESET.medium);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('northstar-rescue.settings.v1')));
  expect(stored.fov).toBe(92);
  expect(stored.mouseSensitivity).toBeCloseTo(1.25, 3);

  await gotoGame(page); // reload: settings come back from localStorage
  expect(await qa(page, "qa.getSetting('fov')")).toBe(92);
  expect(await qa(page, "qa.getSetting('mouseSensitivity')")).toBeCloseTo(1.25, 3);
  expect(await qa(page, "qa.getSetting('quality')")).toBe('medium');
  expect(await qa(page, 'qa.cameraFov()')).toBeCloseTo(92, 1);
  info = await qa(page, 'qa.rendererInfo()');
  expect(info.shadowsEnabled).toBe(true);

  expect(errors).toEqual([]);
  await page.close();
});

test.describe('render & quality (one mission, serial)', () => {
  test.describe.configure({ mode: 'serial' });
  let page, errors;

  test.beforeAll(async ({ browser }) => {
    ({ page, errors } = await newGamePage(browser));
    await startMission(page);
    await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
  });
  test.afterAll(async () => { await page?.close(); });

  test('S50: 1920×1080 playable; resize mid-game keeps aspect and input', async () => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => { window.__qa.teleport('lobby'); });
    await adv(page, 300);
    expect(await qa(page, 'qa.cameraAspect()')).toBeCloseTo(1920 / 1080, 2);
    await shot(page, 's50_1920x1080');

    await page.setViewportSize({ width: 1280, height: 720 });
    await adv(page, 200);
    await expect.poll(() => qa(page, 'qa.rendererInfo()').then((i) => i.cssWidth)).toBe(1280);
    expect(await qa(page, 'qa.cameraAspect()')).toBeCloseTo(1280 / 720, 2);
    await shot(page, 's50_1280x720');

    // a non-16:9 window proves the aspect actually tracks the viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await adv(page, 200);
    await expect.poll(() => qa(page, 'qa.cameraAspect()')).toBeCloseTo(1024 / 768, 2);

    // input mapping survives the resizes
    const before = (await state(page)).player.position;
    await hold(page, 'KeyW', 800);
    const after = (await state(page)).player.position;
    expect(Math.hypot(after[0] - before[0], after[2] - before[2])).toBeGreaterThan(1.5);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await adv(page, 200);
    expect(errors).toEqual([]);
  });

  test('S51: quality presets low/medium/high/ultra all render', async () => {
    for (const preset of ['low', 'medium', 'high', 'ultra']) {
      await page.evaluate((p) => window.__qa.setSetting('quality', p), preset);
      await adv(page, 250);
      const info = await qa(page, 'qa.rendererInfo()');
      expect(info.quality, `quality ${preset}`).toBe(preset);
      expect(info.shadowsEnabled, `shadows for ${preset}`).toBe(SHADOWS_BY_PRESET[preset]);
      expect(info.shadowMapSize).toBe(SHADOW_MAP_BY_PRESET[preset]);
      expect(await frameBrightness(page), `frame not black on ${preset}`).toBeGreaterThan(4);
      await shot(page, `s51_quality_${preset}`);
      expect(errors, `console errors on ${preset}`).toEqual([]);
    }
    await page.evaluate(() => window.__qa.setSetting('quality', 'high'));
    await adv(page, 200);
  });

  test('S52: resolution scale 0.5 shrinks the drawing buffer and still renders', async () => {
    const full = await qa(page, 'qa.rendererInfo()');
    await page.evaluate(() => window.__qa.setSetting('resolutionScale', 0.5));
    await adv(page, 250);
    const half = await qa(page, 'qa.rendererInfo()');
    expect(half.pixelRatio).toBeCloseTo(full.pixelRatio * 0.5, 3);
    expect(half.drawingBufferWidth).toBeLessThan(full.drawingBufferWidth);
    expect(half.drawingBufferWidth).toBe(Math.floor(half.cssWidth * half.pixelRatio));
    expect(half.cssWidth).toBe(full.cssWidth); // CSS size unchanged: upscaled output
    expect(await frameBrightness(page)).toBeGreaterThan(4);
    await shot(page, 's52_resolution_scale_50');
    // software GL on CI cannot be held to an fps threshold; record instead
    const perf = await qa(page, 'qa.perf()');
    expect(perf.drawCalls).toBeGreaterThan(0);
    await page.evaluate(() => window.__qa.setSetting('resolutionScale', 1));
    await adv(page, 200);
    expect(errors).toEqual([]);
  });

  test('S53: reported state matches the rendered frame', async () => {
    await page.evaluate(() => { window.__qa.teleport('lobby'); window.__qa.lookYawPitch(0, 0); });
    await adv(page, 400);
    const s = await state(page);
    expect(s.mode).toBe('playing');
    expect(s.player.room).toBe('lobby');
    expect(s.player.position[0]).toBeCloseTo(31, 0);
    // the lobby checkpoint stands between the vestibule doors and the office doors
    const doorIds = s.doorsNearby.map((d) => d.id);
    expect(doorIds).toContain('d_lobby_cubicles');
    expect(doorIds).toContain('d_vest_lobby');
    // and the frame that state describes is actually lit, not a black canvas
    expect(await frameBrightness(page)).toBeGreaterThan(8);
    await shot(page, 's53_lobby_state_vs_render');

    // basement agreement: a different room, a different door set
    await page.evaluate(() => { window.__qa.teleport('garage'); });
    await adv(page, 400);
    const g = await state(page);
    expect(g.player.room).toBe('garage');
    expect(g.player.position[1]).toBeLessThan(-3);
    expect(await frameBrightness(page)).toBeGreaterThan(6);
    await shot(page, 's53_garage_state_vs_render');
    expect(errors).toEqual([]);
  });
});

test.describe('accessibility settings', () => {
  test.describe.configure({ mode: 'serial' });
  let page, errors;

  test.beforeAll(async ({ browser }) => {
    ({ page, errors } = await newGamePage(browser));
  });
  test.afterAll(async () => { await page?.close(); });

  test('A1: reducedMotion adds body.reduced-motion (persisted, applied on boot)', async () => {
    await expect(page.locator('body')).not.toHaveClass(/reduced-motion/);
    await page.evaluate(() => window.__qa.setSetting('reducedMotion', true));
    await gotoGame(page);
    await expect(page.locator('body')).toHaveClass(/reduced-motion/);
    await expect(page.locator('#screen-title')).toBeVisible();
    await shot(page, 'a1_reduced_motion_title');
    await page.evaluate(() => window.__qa.setSetting('reducedMotion', false));
    expect(errors).toEqual([]);
  });

  test('A2: crosshair, subtitles and invertY options take effect', async () => {
    await startMission(page);
    await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });

    // crosshair toggle (the node is a zero-size anchor for its arms, so the
    // 'hidden' class — what the CSS keys off — is the readable signal)
    const crosshairHidden = () => page.evaluate(() => document.getElementById('crosshair').classList.contains('hidden'));
    await adv(page, 100);
    expect(await crosshairHidden()).toBe(false);
    await page.evaluate(() => window.__qa.setSetting('crosshair', false));
    await adv(page, 100);
    expect(await crosshairHidden()).toBe(true);
    expect(await page.locator('#crosshair .dot').isVisible()).toBe(false);
    await page.evaluate(() => window.__qa.setSetting('crosshair', true));
    await adv(page, 100);
    expect(await crosshairHidden()).toBe(false);

    // subtitles: the locked server door answers with a line
    await page.evaluate(() => { window.__qa.teleportTo(54.6, 0, 18.8, 270); });
    await adv(page, 300);
    await page.evaluate(() => { window.__qa.press('KeyE', true); window.advanceTime(60); window.__qa.press('KeyE', false); window.advanceTime(60); });
    expect(await page.locator('#subtitles .subtitle-line').count()).toBeGreaterThan(0);
    await adv(page, 2600); // let the line expire
    expect(await page.locator('#subtitles .subtitle-line').count()).toBe(0);
    await page.evaluate(() => window.__qa.setSetting('subtitles', false));
    await page.evaluate(() => { window.__qa.press('KeyE', true); window.advanceTime(60); window.__qa.press('KeyE', false); window.advanceTime(60); });
    expect(await page.locator('#subtitles .subtitle-line').count()).toBe(0);
    await page.evaluate(() => window.__qa.setSetting('subtitles', true));

    // invertY flips the pitch delta
    const pitchDelta = async (invert) => {
      await page.evaluate((v) => window.__qa.setSetting('invertY', v), invert);
      await page.evaluate(() => window.__qa.lookYawPitch(0, 0));
      await adv(page, 60);
      await page.evaluate(() => window.__qa.look(0, 120));
      await adv(page, 60);
      return (await state(page)).player.pitchDeg;
    };
    const normal = await pitchDelta(false);
    const inverted = await pitchDelta(true);
    expect(normal).toBeLessThan(-1);          // mouse down = look down
    expect(inverted).toBeGreaterThan(1);      // inverted = look up
    expect(Math.abs(normal + inverted)).toBeLessThan(0.5);
    await page.evaluate(() => window.__qa.setSetting('invertY', false));
    expect(errors).toEqual([]);
  });
});
