#!/usr/bin/env node
import { chromium } from 'playwright';

// Dumps exactly what a real browser receives from a URL. A CDN can serve one
// thing to curl and another to a browser (User-Agent, Accept, Referer all differ),
// and that difference is invisible from the shell.

const url = process.argv[2];
if (!url) {
  console.error('usage: node tools/cdndump.mjs <url>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('requestfailed', (r) => console.log('[fail]', r.url().slice(0, 120), r.failure()?.errorText));
page.on('response', (r) => console.log('[resp]', r.status(), r.headers()['content-type'], r.url().slice(0, 120)));

const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log('--- status', res?.status(), JSON.stringify(res?.headers()));
const html = await page.content();
console.log('--- document length', html.length);
console.log('--- first 1200 chars ---');
console.log(html.slice(0, 1200));
await browser.close();
