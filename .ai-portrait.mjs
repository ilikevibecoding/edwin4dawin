#!/usr/bin/env node
/** Scratch: does the portrait soldier's rifle point where he is facing? */
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
await page.setViewport({ width: 960, height: 540 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const api = window.__AI__;
  const THREE = g.THREE;
  g.pose('ai_soldier');
  const ai = g.engine.get('ai');
  const B = api.boneIndex();
  const a = ai.agentList.find((x) => x.active && x.alive);
  if (!a) return null;
  const cam = g.engine.camera ?? g.engine.get('render').camera;
  const b = api.bones(a.id);
  const deg = (r) => (r * 180) / Math.PI;
  const wrap = (r) => Math.atan2(Math.sin(r), Math.cos(r));

  // Where the muzzle points: the weapon bone's own forward axis.
  const sk = a.rig?.skeleton ?? null;
  let muzzleYaw = null;
  if (sk && sk.bones && sk.bones[B.weapon]) {
    const wb = sk.bones[B.weapon];
    wb.updateWorldMatrix(true, false);
    const fwd = new THREE.Vector3(0, 0, 1).transformDirection(wb.matrixWorld);
    muzzleYaw = Math.atan2(fwd.x, fwd.z);
  }

  const camYaw = Math.atan2(cam.position.x - a.position.x, cam.position.z - a.position.z);
  const aim = a.aimPoint;
  const aimYaw = Math.atan2(aim.x - a.position.x, aim.z - a.position.z);

  // Screen-space extent, so framing can be judged as pixels.
  const proj = (p) => {
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(cam);
    return [((v.x + 1) / 2) * 960, ((1 - v.y) / 2) * 540];
  };
  const pts = [B.head, B.pelvis, B.footL, B.footR, B.handL, B.handR, B.weapon].map((i) => proj(b[i]));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);

  return {
    heading: +deg(a.heading).toFixed(1),
    desired: +deg(a.desiredHeading).toFixed(1),
    bodyYaw: a.rig ? +deg(a.rig.bodyYaw).toFixed(1) : null,
    muzzleYaw: muzzleYaw === null ? null : +deg(muzzleYaw).toFixed(1),
    camYaw: +deg(camYaw).toFixed(1),
    aimYaw: +deg(aimYaw).toFixed(1),
    rifleOffHeading: muzzleYaw === null ? null : +deg(Math.abs(wrap(muzzleYaw - a.heading))).toFixed(1),
    facingOffCam: +deg(Math.abs(wrap(a.heading - camYaw))).toFixed(1),
    stance: a.stance, aiming: a.aiming, hold: a.hold, scripted: a.scripted,
    camDist: +Math.hypot(cam.position.x - a.position.x, cam.position.z - a.position.z).toFixed(2),
    camY: +cam.position.y.toFixed(2), feetY: +a.position.y.toFixed(2),
    box: { x0: +Math.min(...xs).toFixed(0), x1: +Math.max(...xs).toFixed(0), y0: +Math.min(...ys).toFixed(0), y1: +Math.max(...ys).toFixed(0) },
    headPx: proj(b[B.head]).map((n) => +n.toFixed(0)),
    footPx: proj(b[B.footL]).map((n) => +n.toFixed(0)),
    weaponPx: proj(b[B.weapon]).map((n) => +n.toFixed(0)),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
