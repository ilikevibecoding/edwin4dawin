// helpers.js — shared Playwright driving utilities for the deterministic test API.
export async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__game.testMode();
    window.__game.pause(true);
  });
  return errors;
}

/** advance the paused simulation by `seconds` of game time in fixed steps */
export async function step(page, seconds, dtMs = 33.34) {
  const frames = Math.max(1, Math.round((seconds * 1000) / dtMs));
  // chunk to keep evaluate() calls responsive
  const chunk = 400;
  for (let done = 0; done < frames; done += chunk) {
    const n = Math.min(chunk, frames - done);
    await page.evaluate(([frames2, dt]) => window.__game.step(frames2, dt), [n, dtMs]);
  }
}

export async function state(page) {
  return page.evaluate(() => window.__game.state());
}

/** step until predicate(state) is true, or fail after maxSeconds of game time */
export async function stepUntil(page, predicate, maxSeconds, dtMs = 33.34, slice = 1.0) {
  let elapsed = 0;
  while (elapsed < maxSeconds) {
    await step(page, slice, dtMs);
    elapsed += slice;
    const s = await state(page);
    if (predicate(s)) return { ok: true, state: s, elapsed };
  }
  return { ok: false, state: await state(page), elapsed };
}

export function filterBenignErrors(errors) {
  return errors.filter(
    (e) =>
      !e.includes('AudioContext') && // headless autoplay policies
      !e.includes('user gesture') &&
      !e.includes('GroupMarkerNotSet') && // swiftshader chatter
      !e.includes('WebGL warning')
  );
}
