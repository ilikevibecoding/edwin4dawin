// Shared Playwright helpers: boot the game in deterministic manual mode,
// advance simulation time in chunks, poll state.

export async function boot(page, params = {}) {
  const q = new URLSearchParams({ manual: '1', mute: '1', seed: '7', ...params });
  await page.goto(`/?${q.toString()}`);
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
}

/** advance simulation seconds (chunked so evaluate calls stay snappy) */
export async function adv(page, seconds) {
  let left = seconds;
  while (left > 0) {
    const chunk = Math.min(5, left);
    await page.evaluate((s) => window.__game.advance(s), chunk);
    left -= chunk;
  }
}

export function state(page) {
  return page.evaluate(() => window.__game.getState());
}

/** advance until predicate true (checked every `tick` sim-seconds) */
export async function advUntil(page, predFn, { tick = 1, max = 120 } = {}) {
  let t = 0;
  while (t < max) {
    await adv(page, tick);
    t += tick;
    const s = await state(page);
    if (predFn(s)) return { ok: true, state: s, elapsed: t };
  }
  return { ok: false, state: await state(page), elapsed: t };
}

export async function shot(page, name) {
  await page.screenshot({ path: `shots/${name}.png` });
}
