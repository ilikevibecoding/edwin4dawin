// Measures WebGL throughput of the host (software rasteriser here) so the engine
// can be tuned to a real budget instead of guesswork.
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const RES = (process.env.RES || '1280x720').split('x').map(Number);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-frame-rate-limit',
    '--disable-gpu-vsync',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: RES[0], height: RES[1] });
page.on('pageerror', (e) => console.log('  pageerror:', String(e).slice(0, 200)));
page.on('console', (m) => m.type() === 'error' && console.log('  console:', m.text().slice(0, 200)));
await page.goto(`${BASE}/probe.html?w=${RES[0]}&h=${RES[1]}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 120000 });
console.log('gpu:', await page.evaluate('window.__gpu'), '@', RES.join('x'));

const configs = {
  'bare (no shadows/rain/post)': { shadows: 0, rain: 0, post: null },
  'shadows 1024': { shadows: 1, shadowSize: 1024, rain: 0, post: null },
  'shadows 512': { shadows: 1, shadowSize: 512, rain: 0, post: null },
  'rain 12k': { shadows: 0, rain: 12000, post: null },
  'rain 4k': { shadows: 0, rain: 4000, post: null },
  'rain 1.5k': { shadows: 0, rain: 1500, post: null },
  'post: grade only': { shadows: 0, rain: 0, post: { ca: 1, noise: 1 } },
  'post: bloom+grade': { shadows: 0, rain: 0, post: { bloom: 1, ca: 1, noise: 1 } },
  'post: bloom+dof+grade': { shadows: 0, rain: 0, post: { bloom: 1, dof: 1, ca: 1, noise: 1 } },
  'post: +smaa': { shadows: 0, rain: 0, post: { bloom: 1, dof: 1, ca: 1, noise: 1, smaa: 1 } },
  'FULL (shadow512+rain1.5k+bloom+dof+grade)': {
    shadows: 1,
    shadowSize: 512,
    rain: 1500,
    post: { bloom: 1, dof: 1, ca: 1, noise: 1 },
  },
};

for (const [name, cfg] of Object.entries(configs)) {
  const r = await page.evaluate((n, c) => window.__run(n, c), name, { ...cfg, n: 6 });
  console.log(`  ${name.padEnd(42)} ${String(r.ms).padStart(7)} ms  ${String(r.fps).padStart(6)} fps`);
}
await browser.close();
