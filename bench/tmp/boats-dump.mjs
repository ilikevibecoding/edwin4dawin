// Dump mover boat positions after a view's presim: node /tmp/boats/dump.mjs <url>
import puppeteer from 'puppeteer-core';
const [url] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360', '--hide-scrollbars'],
  defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 300000, polling: 200 });
const info = await page.evaluate(() => {
  const t = window.__game.traffic;
  const boats = (t.boats || []).map((b, i) => ({ i, x: +b.px.toFixed(1), z: +b.pz.toFixed(1), hdg: +((Math.atan2(b.hx, -b.hz) * 180 / Math.PI + 360) % 360).toFixed(0), speed: +b.speed.toFixed(1), len: +b.len.toFixed(1), kind: b.kind ?? null, route: b.route?.length, turn: !!b.turn, s: +b.s.toFixed(0), routeLen: +b.routeLen.toFixed(0) }));
  return { time: window.__game.time, boats, moored: t.boatCount - boats.length };
});
console.log(JSON.stringify(info, null, 1));
console.log(logs.filter((l) => !l.includes('[vite]')).slice(0, 20).join('\n'));
await browser.close();
