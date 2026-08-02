// Ad-hoc debugging: load the film, seek, and evaluate an expression in the page.
//   node tools/probe.mjs --t=15 --expr="__film.instance.scene.children.length"
import puppeteer from 'puppeteer-core';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : 'true'];
}));

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--mute-audio',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu'],
  defaultViewport: { width: 800, height: 450 },
  protocolTimeout: 300000,
});
const page = await browser.newPage();
page.on('console', (m) => { if (!m.text().includes('favicon')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${args.port || 8080}/index.html?capture=1&w=800&h=450`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__STORY__ && window.__STORY__.ready === true', { timeout: 120000 });
if (args.t) await page.evaluate((t) => window.__STORY__.renderAt(Number(t)), args.t);
const res = await page.evaluate((expr) => {
  try {
    // eslint-disable-next-line no-eval
    const v = eval(expr);
    return JSON.stringify(v, (k, val) => (typeof val === 'number' ? Math.round(val * 1000) / 1000 : val), 1);
  } catch (e) { return 'ERR: ' + e.message; }
}, args.expr || '1');
console.log(res);
await browser.close();
