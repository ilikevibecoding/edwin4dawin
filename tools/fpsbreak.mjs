// Attribute frame cost by toggling features in a live rAF session and reading
// the game's own fps counter. Software rasterisation exaggerates fragment work,
// which makes it a useful magnifying glass for overdraw.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox','--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90000 });
await page.waitForTimeout(3500);

async function measure(label, setup) {
  await page.evaluate(setup);
  await page.waitForTimeout(5000);
  const fps = await page.evaluate(() => window.__gameInstance.fps);
  console.log(label.padEnd(34), fps.toFixed(1), 'fps  =>', (1000 / fps).toFixed(0), 'ms');
  return fps;
}

await measure('baseline high', () => {});
await measure('post off', () => { window.__gameInstance.post.enabled = false; });
await measure('post off + shadows off', () => { window.__gameInstance.renderer.shadowMap.enabled = false; });
await measure('+ sky hidden', () => { window.__gameInstance.weather.sky.visible = false; });
await measure('+ terrain-far hidden', () => { window.__gameInstance.scene.getObjectByName('terrain-far').visible = false; });
await measure('+ terrain-near hidden', () => { window.__gameInstance.scene.getObjectByName('terrain-near').visible = false; });
await measure('+ site hidden', () => { window.__gameInstance.base.group.visible = false; });
await measure('restore all, post on', () => {
  const g = window.__gameInstance;
  g.post.enabled = true; g.renderer.shadowMap.enabled = true;
  g.weather.sky.visible = true; g.base.group.visible = true;
  g.scene.getObjectByName('terrain-far').visible = true;
  g.scene.getObjectByName('terrain-near').visible = true;
});
await measure('pixelRatio 0.5', () => { window.__gameInstance.renderer.setPixelRatio(0.5); window.dispatchEvent(new Event('resize')); });
await browser.close();
