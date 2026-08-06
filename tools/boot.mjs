import { chromium } from '@playwright/test';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
p.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
p.on('console', (m) => console.log(m.type().toUpperCase(), m.text().slice(0, 400)));
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
try { await p.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 45000 }); console.log('READY'); }
catch { console.log('NOT READY'); }
await b.close();
