import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 640, height: 360 }, protocolTimeout: 600000 });
const page = await browser.newPage();
page.on('console', (m) => { if (!m.text().includes('[vite]')) console.log('[console]', m.text().slice(0, 300)); });
await page.goto('http://127.0.0.1:5173/?bench=plane-rear-quarter&w=640&h=360&quality=low&freeze=1', { waitUntil: 'load' });
await page.waitForFunction('window.__benchReady === true', { timeout: 600000, polling: 250 });
const info = await page.evaluate(() => {
  const m = window.__game.aircraft.model;
  const body = m.exteriorMeshes[0];
  const uv = body.geometry.attributes.uv.array;
  let minU = 1e9, maxU = -1e9, minV = 1e9, maxV = -1e9;
  for (let i = 0; i < uv.length; i += 2) { minU = Math.min(minU, uv[i]); maxU = Math.max(maxU, uv[i]); minV = Math.min(minV, uv[i + 1]); maxV = Math.max(maxV, uv[i + 1]); }
  const mat = body.material;
  const img = mat.map && mat.map.image;
  return { bodyTris: body.geometry.index.count / 3, uvRange: [minU, maxU, minV, maxV], matType: mat.type, hasMap: !!mat.map, mapSize: img ? [img.width, img.height] : null, color: mat.color.getHexString(), mapVersion: mat.map?.version, needsUpdate: mat.map?.needsUpdate, uvAttrCount: body.geometry.attributes.uv.count, posCount: body.geometry.attributes.position.count, glassTris: m.exteriorMeshes[1].geometry.index.count / 3, planeY: window.__game.aircraft.flight.position.y };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
