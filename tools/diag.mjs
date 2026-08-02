import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
mkdirSync('/workspace/qa-output/diag', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio','--window-size=1920,1080']});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async () => {
  document.querySelector('#gate button.primary').click();
  await new Promise(r=>setTimeout(r,1200));
  window.__SW.setPlaying(false); window.__SW.setQuality('medium');
  await new Promise(r=>setTimeout(r,800));
  window.__SW.hideUi(true);
});
for (const [name, t] of [['vader', 276], ['establish', 219], ['fight', 250]]) {
  const data = await page.evaluate(async (time) => {
    window.__SW.seek(time); window.__SW.settle(10, 1/30);
    for (let i=0;i<3;i++){ window.__SW.renderOnce(); await new Promise(r=>requestAnimationFrame(r)); }
    window.__SW.renderOnce();
    const s = window.__SW.app.stage;
    const cam = window.__SW.app.render.camera;
    const chars = s.allCharacters.filter(c=>c.root.visible).map(c=>({n:c.displayName.slice(0,18), p:c.root.position.toArray().map(v=>+v.toFixed(2)), st:c.state, by:+c.joints.body.position.y.toFixed(3)}));
    return { cam: cam.position.toArray().map(v=>+v.toFixed(2)), chars };
  }, t);
  await page.screenshot({ path: `/workspace/qa-output/diag/${name}.png` });
  console.log(name, JSON.stringify(data));
}
await browser.close();
