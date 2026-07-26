// Shared Playwright helpers for Northstar Rescue tests.

export function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));
  return errors;
}

// Vite's dev client reloads the page whenever a module changes on disk. A save
// landing mid-test destroys the execution context and the deterministic clock,
// so serve a stub that keeps the CSS injection contract but drops the socket.
const VITE_CLIENT_STUB = `
const sheets = new Map();
export function updateStyle(id, content) {
  let style = sheets.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(style);
    sheets.set(id, style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = sheets.get(id);
  if (style) { style.remove(); sheets.delete(id); }
}
const noop = () => {};
export function createHotContext() {
  return { data: {}, accept: noop, acceptExports: noop, decline: noop, dispose: noop,
    prune: noop, invalidate: noop, on: noop, off: noop, send: noop };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay {}
`;

export async function blockHmr(page) {
  await page.route('**/@vite/client', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: VITE_CLIENT_STUB,
  }));
}

export async function gotoGame(page, params = 'test=1&qa=1&seed=42') {
  await blockHmr(page);
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
// A freshly drawn (or switched) weapon swallows the trigger until the draw
// animation finishes, so settle it before any shot-counting assertions.
export async function weaponReady(page, maxMs = 2000) {
  for (let waited = 0; waited < maxMs; waited += 200) {
    const s = await page.evaluate(() => JSON.parse(window.render_game_to_text()).weapon.state);
    if (s !== 'draw' && s !== 'holster') return s;
    await adv(page, 200);
  }
  throw new Error('weapon never left the draw state');
}

export async function fire(page, ms = 120) {
  await page.evaluate(() => window.__qa.mouse(0, true));
  await adv(page, ms);
  await page.evaluate(() => window.__qa.mouse(0, false));
}

// A page with the project viewport, error capture attached before load, and the
// game booted. Used by the serial specs that reuse one page (and one built
// mission) across several scenarios to keep the suite fast.
export async function newGamePage(browser, { params, viewport = { width: 1920, height: 1080 } } = {}) {
  const page = await browser.newPage({ viewport });
  const errors = watchErrors(page);
  await gotoGame(page, params);
  return { page, errors };
}

// Mean luminance (0..255) of the freshly rendered WebGL frame. The copy has to
// happen in the same task as the render: the drawing buffer is not preserved.
export async function frameBrightness(page, samples = 64) {
  return page.evaluate((n) => {
    if (window.advanceTime) window.advanceTime(17);
    const src = document.getElementById('game-canvas');
    const c = document.createElement('canvas');
    c.width = n; c.height = Math.max(1, Math.round((n * 9) / 16));
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sum / (c.width * c.height);
  }, samples);
}

export async function shot(page, name) {
  const path = `artifacts/tests/${name}.png`;
  await page.screenshot({ path, timeout: 25_000 });
  return path;
}
