import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  try {
    const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const data = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
page.on('pageerror', (e) => console.log('pageerror:', String(e)));
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game !== undefined);
await page.evaluate(() => {
  document.getElementById('splash').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  const { camera, scene } = window.__game;
  scene.attach(camera);
  camera.position.set(0, 14, 0.001);
  camera.lookAt(0, 0, 0);
  camera.fov = 55;
  camera.updateProjectionMatrix();
  // hide ceiling-ish stuff: raise camera far, ceiling blocks view — remove it
  scene.traverse((o) => {
    if (o.isMesh && o.position.y > 2.9 && o.geometry?.type === 'BoxGeometry') o.visible = false;
  });
});
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, 'shots', 'debug-topdown.png') });
console.log('done');
await browser.close();
server.close();
