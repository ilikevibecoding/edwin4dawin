// Shared boot harness for the QA tools (perf.mjs, scene-census.mjs).
// Mirrors tests/helpers.js: deterministic mode, console-error capture, and a
// stubbed Vite client so a save from another editor cannot reload the page
// halfway through a measurement run.

export const launchArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';

// Same contract as Vite's real client (CSS injection + a dead hot context), so
// the page never receives a full-reload message.
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
export function removeStyle(id) { const s = sheets.get(id); if (s) { s.remove(); sheets.delete(id); } }
const noop = () => {};
export function createHotContext() {
  return { data: {}, accept: noop, acceptExports: noop, decline: noop, dispose: noop,
    prune: noop, invalidate: noop, on: noop, off: noop, send: noop };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay {}
`;

export async function bootGame(browser, {
  params = 'test=1&qa=1&seed=42',
  viewport = { width: 1920, height: 1080 },
} = {}) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(90_000);
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

  await page.route('**/@vite/client', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript', body: VITE_CLIENT_STUB,
  }));

  await page.goto(`${BASE}/?${params}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.render_game_to_text && window.__qa);

  // mission builds are the one place a tool has to wait on real time
  await page.evaluate(() => {
    window.__waitForPlaying = async (timeoutMs = 90_000) => {
      const t0 = performance.now();
      while (JSON.parse(window.render_game_to_text()).mode !== 'playing') {
        if (performance.now() - t0 > timeoutMs) throw new Error('mission never reached playing');
        await new Promise((r) => setTimeout(r, 50));
      }
      window.advanceTime(100);
    };
  });

  return { page, errors };
}

export async function closeBrowser(browser) {
  await browser.close();
}
