import puppeteer from 'puppeteer-core';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const w = args.w || 1280, h = args.h || 720, bloom = args.bloom ?? '1', tris = args.tris || 100000;
const gl = args.gl || 'swiftshader';

const flags = [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--hide-scrollbars', '--mute-audio', '--enable-unsafe-swiftshader',
];
if (gl === 'swiftshader') flags.push('--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu');
else if (gl === 'egl') flags.push('--use-gl=egl');

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: flags,
  defaultViewport: { width: +w, height: +h },
});
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[err]', e.message));
await page.goto(`http://localhost:8080/tools/bench/bench.html?w=${w}&h=${h}&bloom=${bloom}&tris=${tris}`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__ready === true', { timeout: 60000 });
const res = await page.evaluate(() => window.__bench(20));
console.log(JSON.stringify({ gl, w, h, bloom, ...res }, null, 2));
await browser.close();
