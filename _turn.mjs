import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/local/bin/google-chrome', headless: true,
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
await p.goto('http://127.0.0.1:5173', { waitUntil:'domcontentloaded', timeout:120000 });
await p.waitForFunction(() => window.debugAPI?.ready, null, { timeout: 300000, polling: 300 });
await p.evaluate(() => { window.debugAPI.setAutoQuality(false); window.debugAPI.setQuality('low'); });
await p.mouse.click(480, 270);
await p.waitForTimeout(1000);
const yaw = () => p.evaluate(() => +window.debugAPI.player.yaw.toFixed(3));
console.log('start yaw', await yaw());
// can the cursor go beyond the viewport and still generate movementX?
await p.mouse.move(480 + 1500, 270, { steps: 20 });
console.log('after move to +1500 (expect -3.30 rad):', await yaw());
await p.mouse.move(480 + 3000, 270, { steps: 20 });
console.log('after further +1500:', await yaw());
await b.close();
