#!/usr/bin/env node
/** Inspect scene state (camera, subject positions, render stats) for debugging. */
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5173/?dev=portrait&q=low&nopost=1';
const wait = Number(process.argv[3] ?? 40000);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--window-size=480,270', '--mute-audio'],
  protocolTimeout: 300000,
});
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 270 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 500)));
page.on('console', (m) => {
  if (/error|shader|program/i.test(m.text())) console.log('[c]', m.text().slice(0, 2500));
});
await page.goto(url, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, wait));
const out = await page.evaluate(() => {
  const e = window.__engine;
  if (!e || !e.set) return { err: 'no set' };
  const { scene, camera } = e.set;
  const THREE = window.__THREE;
  const list = [];
  let meshes = 0, lights = 0;
  scene.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) meshes++;
    if (o.isLight) {
      lights++;
      list.push({ type: o.type, i: o.intensity, p: o.position.toArray().map((v) => +v.toFixed(2)) });
    }
  });
  const bodies = [];
  scene.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.updateWorldMatrix(true, false);
      const p = new (window.__THREE?.Vector3 ?? Object)();
      bodies.push({ name: o.name, visible: o.visible, wp: o.getWorldPosition(o.position.clone()).toArray().map((v) => +v.toFixed(2)) });
      void p; void THREE;
    }
  });
  e.renderer.info.autoReset = false;
  e.renderer.info.reset();
  e.step(0.016);
  const info = JSON.parse(JSON.stringify(e.renderer.info.render));
  e.renderer.info.autoReset = true;
  return {
    frames: e.clock.frame,
    cam: camera.position.toArray().map((v) => +v.toFixed(2)),
    camDir: camera.getWorldDirection(new (camera.position.constructor)()).toArray().map((v) => +v.toFixed(2)),
    fov: camera.fov, near: camera.near, far: camera.far,
    meshes, lights, lightList: list.slice(0, 8),
    bodies: bodies.slice(0, 8),
    render: info,
    fogDensity: scene.fog?.density,
    envIntensity: scene.environmentIntensity,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
