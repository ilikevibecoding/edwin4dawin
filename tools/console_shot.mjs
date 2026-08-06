import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });
await page.goto('http://127.0.0.1:5173/?test=1&seed=42');
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 40000 });
const diag = await page.evaluate(() => {
  const g = window.__game;
  g.startScenario('saturation', 7);
  g.step(14);
  g.enterConsole();
  g.selectTrack();
  g.step(0.5);
  const fade = document.getElementById('fade');
  const cs = getComputedStyle(fade);
  return {
    state: g.state().mode, console: g.state().console,
    fadeClass: fade.className, fadeOpacity: cs.opacity, fadeBg: cs.background.slice(0, 60),
    consoleHidden: document.getElementById('console-ui')?.classList.contains('hidden'),
  };
});
console.log(JSON.stringify(diag, null, 1));
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/console_view2.png' });
console.log('saved shots/console_view2.png');
await browser.close();
