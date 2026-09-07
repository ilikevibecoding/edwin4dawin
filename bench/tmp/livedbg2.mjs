import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 800, height: 450 }, protocolTimeout: 600000 });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
page.on('response', (r) => { if (!r.url().includes('ethicalads') && !r.url().includes('sushi')) console.log('[response]', r.status(), (r.headers()['content-type'] || '').slice(0, 30), r.url().slice(0, 110)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 120000 });
const title = await page.title();
console.log('title', title);
if (title.includes('External Content')) {
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }), page.click('button.url-action-button')]);
  console.log('after click title', await page.title(), page.url());
}
try { await page.waitForFunction('window.__benchReady === true', { timeout: 500000, polling: 250 }); console.log('READY build', await page.evaluate(() => window.__build)); } catch (e) { console.log('not ready', String(e).slice(0, 100)); }
await page.screenshot({ path: '/tmp/shots/live_dbg2.png' });
const cookies = await page.cookies();
console.log('cookies', cookies.map((c) => c.name + '@' + c.domain));
await browser.close();
