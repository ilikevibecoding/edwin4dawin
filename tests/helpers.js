import { expect } from '@playwright/test';

export const SHOT_DIR = 'artifacts';

/**
 * Boot the game in deterministic test mode and wait until the first frames
 * have rendered. Returns a handle with the collected console/page errors.
 */
export async function bootGame(page, opts = {}) {
  const {
    seed = 20260805,
    quality = 'low',
    sky = null,
    scenario = null,
    reducedMotion = false,
    width = 1600,
    height = 900
  } = opts;

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning' && /THREE|WebGL/i.test(msg.text())) errors.push(`WARN: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

  await page.setViewportSize({ width, height });
  const qs = new URLSearchParams({
    test: '1',
    seed: String(seed),
    quality,
    skipintro: '1'
  });
  if (reducedMotion) qs.set('reducedmotion', '1');
  await page.goto(`/?${qs.toString()}`, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => !!window.__GAME, null, { timeout: 120_000 });
  // Let a few real frames go by so GPU resources are compiled.
  await renderFrames(page, 6);

  if (sky) await page.evaluate((s) => window.__GAME.setSky(s), sky);
  if (scenario) await page.evaluate((s) => window.__GAME.setScenario(s), scenario);
  if (sky || scenario) await renderFrames(page, 6);

  return { errors };
}

/** Wait for N real animation frames (so the renderer actually draws). */
export async function renderFrames(page, n = 3) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let left = count;
        const tick = () => {
          if (--left <= 0) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    n
  );
}

/**
 * Advance the simulation by `seconds` in deterministic slices, letting the
 * page render every so often so effects and the HUD stay in sync.
 */
export async function advance(page, seconds, { renderEvery = 0.5, step = 1 / 60 } = {}) {
  let remaining = seconds;
  while (remaining > 0) {
    const slice = Math.min(renderEvery, remaining);
    await page.evaluate(([s, st]) => window.__GAME.fastForward(s, st), [slice, step]);
    await renderFrames(page, 1);
    remaining -= slice;
  }
  return getState(page);
}

export async function getState(page) {
  return page.evaluate(() => window.__GAME.state());
}

export async function counts(page) {
  return page.evaluate(() => window.__GAME.counts());
}

export async function shot(page, name, testInfo) {
  const path = `${SHOT_DIR}/${name}.png`;
  await page.screenshot({ path, animations: 'disabled' });
  if (testInfo) await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

export function expectNoErrors(handle) {
  const filtered = handle.errors.filter(
    (e) =>
      !/Autoplay|AudioContext|user gesture|favicon|Permissions policy|pointer lock/i.test(e)
  );
  expect(filtered, `page errors:\n${filtered.join('\n')}`).toEqual([]);
}
