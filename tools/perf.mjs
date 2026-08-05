import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox','--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5173/?test=1&seed=7777', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME, null, { timeout: 60000 });
const idle = await page.evaluate(() => { const G=window.__GAME; G.freezePlayer(true); G.teleport(-6,null,34); G.lookAt(-10,4000,-30000); return G.perfProbe(8); });
console.log('idle   ', JSON.stringify(idle));
const busy = await page.evaluate(() => {
  const G = window.__GAME;
  G.restart(); G.configure({ scenario: 'saturation', condition: 'day' }); G.start();
  G.autoPlay(30);
  return G.perfProbe(8);
});
console.log('busy   ', JSON.stringify(busy));
const st = await page.evaluate(() => window.__GAME.state());
console.log('effects', JSON.stringify(st.effects), 'threats', st.threatsActive, 'rounds', st.interceptors.length);
await browser.close();
