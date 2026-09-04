import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 640, height: 360 }, protocolTimeout: 600000 });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/?bench=plane-rear-quarter&w=640&h=360&quality=low&freeze=1', { waitUntil: 'load' });
await page.waitForFunction('window.__benchReady === true', { timeout: 600000, polling: 250 });
const data = await page.evaluate(() => {
  const m = window.__game.aircraft.model;
  const body = m.exteriorMeshes[0];
  const c = body.material.map.image;
  const small = document.createElement('canvas'); small.width = 1024; small.height = 512;
  small.getContext('2d').drawImage(c, 0, 0, 1024, 512);
  return { fus: small.toDataURL('image/png'), flipY: body.material.map.flipY, cs: body.material.map.colorSpace, fmt: body.material.map.format, type: body.material.map.type };
});
fs.writeFileSync('/tmp/shots/fuselage_tex.png', Buffer.from(data.fus.split(',')[1], 'base64'));
console.log(data.flipY, data.cs, data.fmt, data.type);
await browser.close();
