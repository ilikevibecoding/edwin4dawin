#!/usr/bin/env node
/**
 * Scratch: for each marooned spawn point, can a body-width probe at 0.25 m walk
 * out to the main island? Anything that cannot is sealed level geometry, not a
 * navigation defect.
 */
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
page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 600)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const THREE = window.__GAME__.THREE;
  const nav = window.__GAME__.engine.get('ai').nav;
  const physics = window.__GAME__.engine.get('physics');
  const spawns = window.__GAME__.engine.get('world').spawnPoints;
  const sizes = nav.regionSize;
  const main = sizes.indexOf(Math.max(...sizes));
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: 'concrete' };
  const o = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const MASK = 1 | 2;
  const BODY = 0.34;

  const strays = spawns.filter((s) => nav.regionAt(s.position.x, s.position.y, s.position.z) !== main);
  const results = [];
  for (const s of strays) {
    const cx = s.position.x;
    const cz = s.position.z;
    const R = 16;
    const STEP = 0.25;
    const x0 = cx - R;
    const z0 = cz - R;
    const n = Math.ceil((R * 2) / STEP);
    const floor = new Float32Array(n * n).fill(NaN);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = x0 + (i + 0.5) * STEP;
        const z = z0 + (j + 0.5) * STEP;
        let from = s.position.y + 3.0;
        for (let k = 0; k < 3; k++) {
          o.set(x, from, z);
          if (!physics.raycastInto(o, down, from - (s.position.y - 2.5), hit, MASK)) break;
          const y = hit.point.y;
          if (hit.normal.y >= 0.6) {
            o.set(x, y + 0.25, z);
            if (!physics.raycastInto(o, up, 1.7, hit, MASK)) {
              // A man is not a point: he needs his shoulders through the gap.
              let room = true;
              for (let a = 0; a < 8 && room; a++) {
                const ang = (a / 8) * Math.PI * 2;
                dir.set(Math.cos(ang), 0, Math.sin(ang));
                o.set(x, y + 0.95, z);
                if (physics.raycastInto(o, dir, BODY, hit, MASK)) room = false;
              }
              if (room) floor[j * n + i] = y;
              break;
            }
          }
          from = y - 0.25;
          if (from < s.position.y - 2.5) break;
        }
      }
    }
    const si = Math.round((cx - x0) / STEP);
    const sj = Math.round((cz - z0) / STEP);
    let start = -1;
    for (let r = 0; r < 16 && start < 0; r++)
      for (let dj = -r; dj <= r && start < 0; dj++)
        for (let di = -r; di <= r; di++) {
          const k = (sj + dj) * n + (si + di);
          if (k >= 0 && k < floor.length && !Number.isNaN(floor[k])) { start = k; break; }
        }
    if (start < 0) { results.push({ at: [+cx.toFixed(1), +cz.toFixed(1)], verdict: 'no room to stand' }); continue; }
    const seen = new Uint8Array(n * n);
    const stack = [start];
    seen[start] = 1;
    let reached = 0;
    const escapes = [];
    while (stack.length) {
      const k = stack.pop();
      reached++;
      const i = k % n;
      const j = (k - i) / n;
      const x = x0 + (i + 0.5) * STEP;
      const z = z0 + (j + 0.5) * STEP;
      if (Math.hypot(x - cx, z - cz) > 5 && nav.regionAt(x, floor[k], z) === main && escapes.length < 3) {
        escapes.push([+x.toFixed(2), +floor[k].toFixed(2), +z.toFixed(2)]);
      }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        const nk = nj * n + ni;
        if (seen[nk] || Number.isNaN(floor[nk])) continue;
        if (Math.abs(floor[nk] - floor[k]) > 0.3) continue;
        seen[nk] = 1;
        stack.push(nk);
      }
    }
    results.push({
      at: [+cx.toFixed(1), +s.position.y.toFixed(1), +cz.toFixed(1)],
      standableArea: +(reached * STEP * STEP).toFixed(0),
      verdict: escapes.length ? 'a body can walk out — grid defect' : 'sealed',
      escapes,
    });
  }
  return { strays: strays.length, results };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
