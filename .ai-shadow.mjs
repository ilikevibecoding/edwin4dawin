#!/usr/bin/env node
/** Scratch: can a scene raycast see the frond shadows physics cannot, and how slow is it? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5199/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const api = window.__AI__;
  const THREE = g.THREE;
  g.pose('ai_soldier');
  const world = g.engine.get('world');
  const sky = g.engine.tryGet('sky');
  const sun = sky.sunDirection.clone();
  const rc = new THREE.Raycaster();
  rc.far = 70;
  rc.firstHitOnly = true;

  // What is actually under world.root?
  let meshes = 0;
  let tris = 0;
  world.root.traverse((o) => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    meshes++;
    const g2 = o.geometry;
    if (g2?.index) tris += g2.index.count / 3;
    else if (g2?.attributes?.position) tris += g2.attributes.position.count / 3;
  });

  const agent = api.agents()[0];
  const p = new THREE.Vector3(agent.position[0], agent.position[1], agent.position[2]);
  const cast = (at) => {
    rc.set(at, sun);
    return rc.intersectObject(world.root, true);
  };
  const t0 = performance.now();
  let blocked = 0;
  const N = 30;
  for (let i = 0; i < N; i++) {
    const at = p.clone();
    at.y += 0.4 + (i % 3) * 0.7;
    at.x += (i / N) * 4 - 2;
    if (cast(at).length > 0) blocked++;
  }
  const ms = (performance.now() - t0) / N;

  // What blocks the sun right where he stands?
  const names = [];
  for (let i = 0; i < 3; i++) {
    const at = p.clone();
    at.y += 0.4 + i * 0.7;
    const hits = cast(at);
    names.push(hits.length ? `${hits[0].object.name || hits[0].object.type} d=${hits[0].distance.toFixed(1)}` : 'sky');
  }
  return { meshes, tris, msPerRay: +ms.toFixed(2), blocked, of: N, atSoldier: names };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
