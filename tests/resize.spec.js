import { test, expect } from '@playwright/test';
import {
  bootGame, advance, state, qa, shot, releaseAll, look,
  expectNoConsoleErrors, enterGameplay, writeArtifact, expectCanvasHasContent,
  wrapAngle,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 15 — resize and fullscreen.
//
// The renderer, the camera and the input mapping all have to follow the window.
// A resize that leaves a stale aspect ratio is a stretched image; a resize that
// changes look sensitivity is a broken control.
// ---------------------------------------------------------------------------

const SIZES = [
  { width: 1280, height: 720, label: '1280x720' },
  { width: 1920, height: 1080, label: '1920x1080' },
  { width: 2560, height: 1440, label: '2560x1440' },
  // A non-16:9 shape, because the engine special-cases narrow aspects.
  { width: 1280, height: 1024, label: '1280x1024 (5:4)' },
];

const readRenderer = (page) => page.evaluate(() => {
  const e = window.__NORTHSTAR__.engine;
  const canvas = e.renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  return {
    viewport: [e.viewportWidth, e.viewportHeight],
    drawingBuffer: [canvas.width, canvas.height],
    cssSize: [Math.round(rect.width), Math.round(rect.height)],
    pixelRatio: +e.renderer.getPixelRatio().toFixed(3),
    cameraAspect: +e.camera.aspect.toFixed(5),
    cameraFov: +e.camera.fov.toFixed(3),
    window: [window.innerWidth, window.innerHeight],
  };
});

test.describe('resize', () => {
  test('the renderer and camera follow every window size', async ({ page }) => {
    await bootGame(page, { quality: 'medium', resolutionScale: 0.75 });
    await enterGameplay(page, { freezeAI: true, godMode: true, checkpoint: 'lobby' });

    const rows = [];
    const problems = [];

    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });
      // The engine resizes from the window `resize` event; give it a frame.
      await advance(page, 200, { step: 60 });

      const r = await readRenderer(page);
      const s = await state(page);
      const info = await shot(page, `resize-${size.width}x${size.height}`);
      rows.push({ ...size, ...r, reported: s.performance.resolution, metrics: info.metrics });

      // 1. The viewport must match the window.
      if (r.viewport[0] !== size.width || r.viewport[1] !== size.height) {
        problems.push(`${size.label}: the engine reports a ${r.viewport.join('x')} viewport`);
      }
      // 2. The CSS canvas must fill the window.
      if (Math.abs(r.cssSize[0] - size.width) > 2 || Math.abs(r.cssSize[1] - size.height) > 2) {
        problems.push(`${size.label}: the canvas is laid out at ${r.cssSize.join('x')}`);
      }
      // 3. The camera aspect must match the new shape, or the image is stretched.
      const wanted = size.width / size.height;
      if (Math.abs(r.cameraAspect - wanted) > 0.01) {
        problems.push(`${size.label}: camera aspect ${r.cameraAspect} but the viewport is ${wanted.toFixed(5)}`);
      }
      // 4. The drawing buffer must follow both the size and the pixel ratio.
      const expectedW = Math.round(size.width * r.pixelRatio);
      if (Math.abs(r.drawingBuffer[0] - expectedW) > 2) {
        problems.push(`${size.label}: drawing buffer ${r.drawingBuffer.join('x')} does not match ${size.width}x${size.height} at ratio ${r.pixelRatio}`);
      }
      // 5. The state output has to agree with the engine.
      if (s.performance.resolution[0] !== size.width || s.performance.resolution[1] !== size.height) {
        problems.push(`${size.label}: the state output reports ${s.performance.resolution.join('x')}`);
      }
      // 6. And it must still be drawing a real image.
      await expectCanvasHasContent(page, { label: size.label, minColours: 32, minStdDev: 0.012 });
    }

    // A narrow aspect must widen the vertical FOV so the horizontal view is
    // preserved: the engine documents that behaviour, so check it holds.
    const wide = rows.find((r) => r.label === '1920x1080');
    const narrow = rows.find((r) => r.label.startsWith('1280x1024'));
    if (wide && narrow) {
      if (!(narrow.cameraFov > wide.cameraFov)) {
        problems.push(`a 5:4 window did not widen the vertical FOV: ${wide.cameraFov} -> ${narrow.cameraFov}`);
      }
    }

    writeArtifact('resize.json', { rows, problems });
    expect(problems, `resize problems:\n${problems.join('\n')}`).toEqual([]);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await advance(page, 200, { step: 60 });
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('look sensitivity is independent of window size', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true, checkpoint: 'lobby' });

    /** How far 500 px of mouse movement turns the view at the current size. */
    const measure = async () => {
      await page.evaluate(() => {
        const p = window.__NORTHSTAR__.player;
        p.yaw = 0;
        p.pitch = 0;
        p.updateCamera(0);
      });
      await advance(page, 120, { step: 40 });
      const before = (await state(page)).player.orientation;
      await look(page, 500, -200);
      const after = (await state(page)).player.orientation;
      return {
        yaw: +wrapAngle(after.yawRadians - before.yawRadians).toFixed(5),
        pitch: +(after.pitchRadians - before.pitchRadians).toFixed(5),
      };
    };

    const at1080 = await measure();
    await page.setViewportSize({ width: 1280, height: 720 });
    await advance(page, 200, { step: 60 });
    const at720 = await measure();
    await page.setViewportSize({ width: 2560, height: 1440 });
    await advance(page, 200, { step: 60 });
    const at1440 = await measure();

    writeArtifact('resize-input.json', { at1080, at720, at1440 });

    // Raw mouse deltas are in device pixels, so the same delta must produce the
    // same rotation at every window size.
    expect(at720.yaw, `look yaw changed with window size: ${at1080.yaw} at 1080p vs ${at720.yaw} at 720p`)
      .toBeCloseTo(at1080.yaw, 4);
    expect(at1440.yaw, `look yaw changed with window size: ${at1080.yaw} at 1080p vs ${at1440.yaw} at 1440p`)
      .toBeCloseTo(at1080.yaw, 4);
    expect(at720.pitch).toBeCloseTo(at1080.pitch, 4);
    expect(at1440.pitch).toBeCloseTo(at1080.pitch, 4);
    // And the direction must be right at every size.
    expect(at1080.yaw, 'mouse right must decrease yaw').toBeLessThan(0);
    expect(at1080.pitch, 'mouse up must increase pitch').toBeGreaterThan(0);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await advance(page, 200, { step: 60 });
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('fullscreen is requested by F and released by Escape', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, checkpoint: 'lobby' });

    const fullscreenState = () => page.evaluate(() => ({
      element: document.fullscreenElement ? (document.fullscreenElement.id || document.fullscreenElement.tagName) : null,
      inputReports: window.__NORTHSTAR__.input.isFullscreen(),
    }));

    const before = await fullscreenState();
    expect(before.element, 'the page started in fullscreen').toBeNull();

    // Headless Chromium refuses the Fullscreen API without a user gesture and
    // often refuses it entirely, so what is under test is that the *request* is
    // made and nothing throws — not that the compositor honours it.
    const requested = await page.evaluate(() => {
      let called = 0;
      const el = document.documentElement;
      const original = el.requestFullscreen;
      el.requestFullscreen = function patched(...args) {
        called++;
        try {
          return original?.apply(this, args) ?? Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      };
      window.__fsProbe = () => called;
      return true;
    });
    expect(requested).toBe(true);

    await page.keyboard.press('KeyF');
    await advance(page, 300, { step: 60 });
    const calls = await page.evaluate(() => window.__fsProbe());
    const during = await fullscreenState();
    await shot(page, 'resize-fullscreen');

    writeArtifact('resize-fullscreen.json', { before, requestCalls: calls, during });
    expect(calls, 'pressing F did not request fullscreen').toBeGreaterThanOrEqual(1);

    // Escape must always do something sane — here, pause — and never trap.
    await page.keyboard.press('Escape');
    await advance(page, 300, { step: 60 });
    const mode = await page.evaluate(() => window.__NORTHSTAR__.state);
    expect(['paused', 'playing'], `Escape left the game in "${mode}"`).toContain(mode);
    const after = await fullscreenState();
    expect(after.element, 'Escape left the page stuck in fullscreen').toBeNull();

    // And the game must still be rendering afterwards.
    if (mode === 'paused') await page.evaluate(() => window.__NORTHSTAR__.resume());
    await advance(page, 400, { step: 60 });
    await expectCanvasHasContent(page, { label: 'after fullscreen', minColours: 32, minStdDev: 0.012 });

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });
});
