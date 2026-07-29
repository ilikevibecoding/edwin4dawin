/**
 * Scratch diagnostic. Not part of the build.
 *
 * Where the cafe actually is, what encloses it, and where its openings are.
 * Everything else has been guessing at coordinates; this asks the level.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=480,270',
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: 480, height: 270 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });
await page.waitForFunction(() => window.__GAME__.listShots().includes('cafe_window'), {
  timeout: 300000, polling: 250,
});

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose('cafe_window');
  for (let i = 0; i < 40; i++) engine.step(1 / 60);
  const physics = engine.get('physics');
  const sky = engine.get('sky');
  const camera = engine.camera;

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const dir = new THREE.Vector3();
  const r2 = (x) => Math.round(x * 100) / 100;
  const MASK = 0xffff;

  const eye = camera.position.clone();

  const cast = (from, d, max = 40) => {
    dir.copy(d).normalize();
    if (!physics.raycastInto(from, dir, max, hit, MASK)) return null;
    return { d: r2(hit.distance), s: hit.surface, p: hit.point.toArray().map(r2) };
  };

  const axes = {
    up: cast(eye, new THREE.Vector3(0, 1, 0)),
    down: cast(eye, new THREE.Vector3(0, -1, 0)),
    xp: cast(eye, new THREE.Vector3(1, 0, 0)),
    xn: cast(eye, new THREE.Vector3(-1, 0, 0)),
    zp: cast(eye, new THREE.Vector3(0, 0, 1)),
    zn: cast(eye, new THREE.Vector3(0, 0, -1)),
  };

  /* Sweep the horizon from the eye at a few heights, and report every glass
     hit — those are the windows, and their bearing is where light comes in. */
  const floorY = axes.down ? eye.y - axes.down.d : eye.y - 1.6;
  const ceilY = axes.up ? eye.y + axes.up.d : eye.y + 1.4;
  const glass = [];
  const from = new THREE.Vector3();
  for (const h of [0.4, 0.9, 1.4, 1.9]) {
    from.set(eye.x, floorY + h, eye.z);
    for (let a = 0; a < 180; a++) {
      const th = (a / 180) * Math.PI * 2;
      dir.set(Math.cos(th), 0, Math.sin(th));
      if (!physics.raycastInto(from, dir, 30, hit, MASK)) {
        glass.push({ h, bearing: Math.round((th * 180) / Math.PI), s: 'OPEN', d: 99 });
        continue;
      }
      if (hit.surface === 'glass') {
        glass.push({
          h, bearing: Math.round((th * 180) / Math.PI), s: hit.surface,
          d: r2(hit.distance), at: hit.point.toArray().map(r2),
        });
      }
    }
  }

  /* Room extent from the eye along the cardinal axes at chest height. */
  from.set(eye.x, floorY + 1.2, eye.z);
  const extent = {
    xp: cast(from, new THREE.Vector3(1, 0, 0)),
    xn: cast(from, new THREE.Vector3(-1, 0, 0)),
    zp: cast(from, new THREE.Vector3(0, 0, 1)),
    zn: cast(from, new THREE.Vector3(0, 0, -1)),
  };

  return {
    eye: eye.toArray().map(r2),
    floorY: r2(floorY), ceilY: r2(ceilY),
    axes, extent,
    glassHits: glass.length,
    glass: glass.slice(0, 40),
    sun: sky.sunDirection.toArray().map((v) => Math.round(v * 1000) / 1000),
    key: (sky.keyDirection ?? sky.sunDirection).toArray().map((v) => Math.round(v * 1000) / 1000),
    sunColor: sky.sunColor?.toArray?.().map((v) => Math.round(v * 1000) / 1000),
    keyColor: (sky.keyColor ?? sky.sunColor)?.toArray?.().map((v) => Math.round(v * 1000) / 1000),
    cloudShadowStrength: sky.cloudShadowStrength,
    hour: sky.hour ?? sky.timeOfDay ?? null,
  };
});

console.log(JSON.stringify(out, null, 2).slice(0, 6000));
await browser.close();
