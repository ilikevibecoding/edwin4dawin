// Measure the real rAF-driven frame rate in a live (non-test) session.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--no-sandbox','--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90000 });
await page.waitForTimeout(4000);
const idle = await page.evaluate(() => ({ fps: window.__gameInstance.fps, quality: window.__gameInstance.settings.quality }));
console.log('idle', JSON.stringify(idle));
await page.evaluate(() => { const g = window.__gameInstance; g.startScenario(); });
await page.waitForTimeout(9000);
const busy = await page.evaluate(() => ({ fps: window.__gameInstance.fps, threats: window.__gameInstance.threats.active.length, fx: window.__gameInstance.effects.stats }));
console.log('busy', JSON.stringify(busy));
await page.evaluate(() => window.__gameInstance._setQuality('low'));
await page.waitForTimeout(6000);
console.log('low ', JSON.stringify(await page.evaluate(() => ({ fps: window.__gameInstance.fps }))));
await browser.close();
