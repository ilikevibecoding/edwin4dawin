// Minimal Chrome DevTools Protocol helper used by the benchmark / verification scripts.
// Launches headless Chrome (software GL), opens a page and exposes evaluate()/screenshot().
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let portCounter = 9400 + Math.floor(Math.random() * 400);

export async function launchPage(url, { width = 1280, height = 800, profile = null, onConsole = null } = {}) {
  const port = portCounter++;
  const dir = profile || `/tmp/chrome-cdp-${port}`;
  const chrome = spawn(process.env.CHROME || 'google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', `--user-data-dir=${dir}`, '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${width},${height}`, `--remote-debugging-port=${port}`,
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', url,
  ], { stdio: 'ignore' });
  let page = null;
  for (let i = 0; i < 80 && !page; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      page = list.find((t) => t.type === 'page' && !t.url.startsWith('chrome') && t.url !== 'about:blank');
    } catch (e) { /* retry */ }
    if (!page) await sleep(250);
  }
  if (!page) { chrome.kill('SIGKILL'); throw new Error('Chrome page target not found'); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  const consoleLines = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(JSON.stringify(m.params.exceptionDetails).slice(0, 600));
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      if (!text.includes('[vite]')) { consoleLines.push(text); if (onConsole) onConsole(text); }
    }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Page.enable');
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error('eval failed: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
    return r.result?.result?.value;
  };
  const waitForGame = async (timeoutMs = 120000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const ok = await evaluate('!!(window.game && window.game.loading === false && window.game.player && window.game.input)').catch(() => false);
      if (ok) return true;
      await sleep(400);
    }
    throw new Error('game did not finish loading');
  };
  const screenshot = async (path) => {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot.result?.data) { writeFileSync(path, Buffer.from(shot.result.data, 'base64')); return path; }
    return null;
  };
  const close = () => { try { ws.close(); } catch (e) { /* ignore */ } chrome.kill('SIGKILL'); };
  return { evaluate, waitForGame, screenshot, close, exceptions, consoleLines, sleep };
}
