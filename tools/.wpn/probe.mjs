// Runs a scenario and dumps the optic probe alongside the capture.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = '/workspace';
const argv = process.argv.slice(2);
const flags = {};
const scenarios = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  else scenarios.push(argv[i]);
}
const outDir = resolve(root, String(flags.out ?? 'captures-probe'));
mkdirSync(outDir, { recursive: true });
const [W, H] = (flags.size ?? '960x540').split('x').map(Number);

const port = await new Promise((res) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});
const args = ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
if (flags.dist) args.push('--outDir', String(flags.dist));
const server = spawn('npx', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('server timeout')), 60000);
  server.stdout.on('data', (b) => { if (/127\.0\.0\.1:/.test(b.toString())) { clearTimeout(t); res(); } });
  server.stderr.on('data', (b) => process.stderr.write(b));
});

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl',
    '--disable-frame-rate-limit', '--disable-gpu-vsync', '--js-flags=--max-old-space-size=4096',
    '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => { logs.push(`[pageerror] ${e.message}`); console.log('   [pageerror] ' + e.message); });

await page.goto(`http://127.0.0.1:${port}/?shot=1&q=${flags.quality ?? 'medium'}&warmup=14${flags.tint ? '&wpntint=1' : ''}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__SHOT_READY__ === true || window.__BOOT_ERROR__, undefined, { timeout: 600000, polling: 500 });
const bootErr = await page.evaluate(() => window.__BOOT_ERROR__ ?? null);
if (bootErr) { console.error('boot error', bootErr); console.error(logs.slice(-30).join('\n')); process.exit(1); }

const available = await page.evaluate(() => window.__SHOT_SCENARIOS__);
const list = scenarios.length ? scenarios.filter((s) => available.includes(s)) : available;
for (const key of list) {
  const t0 = Date.now();
  process.stdout.write(`  ${key} … `);
  await page.evaluate((k) => window.__SHOT_RUN__(k), key);
  const probe = await page.evaluate(() => globalThis.__OPTIC__ ?? null);
  const dataUrl = await page.evaluate(() => {
    const canvas = document.getElementById('viewport');
    const hud = document.querySelector('#ui-root canvas');
    const out = document.createElement('canvas');
    out.width = canvas.width; out.height = canvas.height;
    const g = out.getContext('2d');
    g.drawImage(canvas, 0, 0);
    if (hud && hud.width > 0) g.drawImage(hud, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  });
  writeFileSync(resolve(outDir, `${key}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`    ${JSON.stringify(probe)}`);
}
writeFileSync(resolve(outDir, 'console.log'), logs.join('\n'));
const errs = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
if (errs.length) console.log(`\n${errs.length} errors:\n` + errs.slice(0, 10).join('\n'));
await browser.close();
try { process.kill(-server.pid); } catch { server.kill(); }
process.exit(0);
