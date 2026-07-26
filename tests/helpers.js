// Shared Playwright helpers for Northstar Rescue tests.

export function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));
  return errors;
}

export async function gotoGame(page, params = 'test=1&qa=1&seed=42') {
  await page.goto(`/?${params}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.render_game_to_text && window.__qa);
}

export async function state(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

export async function adv(page, ms) {
  return page.evaluate((m) => window.advanceTime(m), ms);
}

export async function startMission(page, opts = {}) {
  await page.evaluate((o) => window.__qa.startMission(o), opts);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing', null, { timeout: 60_000 });
  await adv(page, 100);
}

export async function qa(page, expr) {
  return page.evaluate(`(() => { const qa = window.__qa; return ${expr}; })()`);
}

// input helpers routed through the QA injection API
export async function hold(page, code, ms) {
  await page.evaluate((c) => window.__qa.press(c, true), code);
  await adv(page, ms);
  await page.evaluate((c) => window.__qa.press(c, false), code);
}
export async function tap(page, code) {
  await page.evaluate((c) => { window.__qa.press(c, true); window.advanceTime(60); window.__qa.press(c, false); window.advanceTime(30); }, code);
}
export async function fire(page, ms = 120) {
  await page.evaluate(() => window.__qa.mouse(0, true));
  await adv(page, ms);
  await page.evaluate(() => window.__qa.mouse(0, false));
}
