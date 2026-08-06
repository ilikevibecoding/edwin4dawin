#!/usr/bin/env node
/** Dumps the free-roam camera/character state for a chapter, to debug framing. */
import puppeteer from 'puppeteer-core';

const url = process.argv[2];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
  ],
  protocolTimeout: 600000,
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction('window.__film !== undefined', { timeout: 600000 });
for (let i = 0; i < 6; i++) await page.evaluate(() => window.__film.step(1 / 20));

const out = await page.evaluate(() => {
  const g = window.__game;
  const p = g.director.player;
  const cam = g.set.camera;
  const r = window.__engine.renderer;
  let meshes = 0, lit = 0;
  g.set.scene.traverse((o) => {
    if (o.isMesh) meshes++;
    if (o.isLight) lit += o.intensity;
  });
  const ch = p.character;
  const headBone = ch.rig && ch.rig.byName && ch.rig.byName.head;
  const head = headBone ? headBone.getWorldPosition(headBone.position.clone()) : null;
  return {
    exploring: g.director.exploring,
    charPos: ch.group.position.toArray().map((v) => +v.toFixed(2)),
    charVisible: ch.group.visible,
    head: head && head.toArray ? head.toArray().map((v) => +v.toFixed(2)) : null,
    camPos: cam.position.toArray().map((v) => +v.toFixed(2)),
    camFov: cam.fov,
    camNearFar: [cam.near, cam.far],
    yaw: +p.yaw.toFixed(2),
    dist: +p.distance.toFixed(2),
    meshes,
    lightSum: +lit.toFixed(1),
    renderCalls: r.info.render.calls,
    tris: r.info.render.triangles,
    fade: getComputedStyle(document.getElementById('fade')).opacity,
    letterbox: document.getElementById('letterbox').className,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
