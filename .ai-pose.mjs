#!/usr/bin/env node
/**
 * Scratch: is the portrait's rifle level, and does either elbow read against the
 * torso from where the lens actually stands?
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5198/';
const SHOT = process.argv[3] || 'ai_soldier';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=low`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate((shot) => {
  const g = window.__GAME__;
  const api = window.__AI__;
  const THREE = g.THREE;
  g.pose(shot);
  const ai = g.engine.get('ai');
  const B = api.boneIndex();
  const cam = g.engine.camera ?? g.engine.get('render').camera;
  const deg = (r) => +((r * 180) / Math.PI).toFixed(1);
  const men = ai.agentList.filter((a) => a.active && a.alive);
  const V = (p) => new THREE.Vector3(p[0], p[1], p[2]);

  const report = men.map((a) => {
    const b = api.bones(a.id).map(V);
    const rig = a.rig;
    const muzzleDir = rig ? rig.muzzleDir.clone() : new THREE.Vector3();
    // Elbow legibility: how far the elbow sits off the shoulder-to-hand line,
    // measured across the camera's line of sight, since that is the only
    // direction an offset shows up as a silhouette.
    const eye = new THREE.Vector3().copy(cam.position);
    const arm = (sh, el, hd) => {
      const shoulder = b[sh];
      const elbow = b[el];
      const hand = b[hd];
      const axis = new THREE.Vector3().subVectors(hand, shoulder);
      const len = axis.length();
      axis.normalize();
      const off = new THREE.Vector3().subVectors(elbow, shoulder);
      off.addScaledVector(axis, -off.dot(axis));
      // Screen direction: across both the view ray and up.
      const ray = new THREE.Vector3().subVectors(elbow, eye).normalize();
      const across = new THREE.Vector3().crossVectors(ray, new THREE.Vector3(0, 1, 0)).normalize();
      const flex = new THREE.Vector3().subVectors(shoulder, elbow).normalize()
        .dot(new THREE.Vector3().subVectors(hand, elbow).normalize());
      return {
        span: +len.toFixed(3),
        flexDeg: deg(Math.acos(Math.max(-1, Math.min(1, flex)))),
        offset: +off.length().toFixed(3),
        lateralPx: +Math.abs(off.dot(across)).toFixed(3),
        vertical: +off.y.toFixed(3),
        // Distance from the body's own centre line at chest height, so an elbow
        // inside the ribcage is visible as a number.
        fromSpine: +Math.hypot(elbow.x - b[B.chest].x, elbow.z - b[B.chest].z).toFixed(3),
      };
    };
    const aim = a.aimPoint;
    const eyePos = rig ? rig.eye : b[B.head];
    return {
      id: a.id,
      state: a.state,
      stance: a.stance,
      aiming: a.aiming,
      speed: +Math.hypot(a.velocity.x, a.velocity.z).toFixed(2),
      // Where the barrel points, in degrees above the horizon.
      riflePitch: deg(Math.asin(Math.max(-1, Math.min(1, muzzleDir.y)))),
      // And where it *should* point: at the thing he is aiming at.
      aimPitch: deg(Math.atan2(aim.y - eyePos.y, Math.hypot(aim.x - eyePos.x, aim.z - eyePos.z))),
      aimRange: +Math.hypot(aim.x - eyePos.x, aim.z - eyePos.z).toFixed(1),
      right: arm(B.armR, B.foreR, B.handR),
      left: arm(B.armL, B.foreL, B.handL),
      camDist: +cam.position.distanceTo(b[B.chest]).toFixed(2),
    };
  });
  return { shot, camY: +cam.position.y.toFixed(2), men: report };
}, SHOT);
console.log(JSON.stringify(out, null, 1));
await browser.close();
