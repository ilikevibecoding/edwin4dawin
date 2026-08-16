// Offline frame-by-frame walkthrough capture: control room -> engine room.
// Drives the real player controller (collision, head bob) with a fixed dt per
// frame so the assembled video plays at true speed. Look direction is scripted
// between waypoints (stand-and-pan at the sonar console and stbd porthole).
// Usage: node tools/walkthrough-video.mjs [--out /tmp/walk_frames] [--fps 24]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launchBrowser, openApp } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const OUT = path.resolve(arg('out', '/tmp/walk_frames'));
const FPS = +arg('fps', '24');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const smooth = (t) => t * t * (3 - 2 * t); // ease in-out

const { url, close } = await startServer({ prod: false });
const browser = await launchBrowser();
const page = await openApp(browser, url, { width: 1280, height: 720, quality: 'high' });

await page.evaluate((fps) => {
  window.debugAPI.setSubmarineState('used');
  window.debugAPI.setSubmarineState('cruising');
  window.debugAPI.setMotionEnabled(true);
  // sonar pause + walk puts us at the stbd porthole near the t=40 hero staging
  window.debugAPI.setSimTime(29);
  window.debugAPI.setPlayerEnabled(true);
  window.debugAPI.setHUDVisible(true);
  window.debugAPI.setFixedDt(1 / fps);
  window.debugAPI.teleport(0, 2.55, 0, 0.02);
  window.debugAPI.pumpFrame();
}, FPS);

let frameIdx = 0;
async function pose() {
  return page.evaluate(() => window.debugAPI.getPose());
}
async function setLook(yaw, pitch) {
  await page.evaluate(([y, p]) => {
    const c = window.__ctx;
    c.player.object.rotation.y = y;
    c.player.pitchObject.rotation.x = p;
  }, [yaw, pitch]);
}
async function snap() {
  await page.evaluate(() => window.debugAPI.pumpFrame());
  await page.screenshot({
    path: path.join(OUT, `f${String(frameIdx).padStart(5, '0')}.jpg`),
    type: 'jpeg', quality: 87, timeout: 180000,
  });
  frameIdx++;
}
async function hold(frames, yaw, pitch) {
  for (let i = 0; i < frames; i++) {
    await setLook(yaw, pitch);
    await snap();
  }
}
async function turn(frames, y0, y1, p0, p1) {
  for (let i = 1; i <= frames; i++) {
    const t = smooth(i / frames);
    await setLook(y0 + (y1 - y0) * t, p0 + (p1 - p0) * t);
    await snap();
  }
}
async function walkUntil(zTarget, yaw, pitch, cap) {
  await page.keyboard.down('KeyW');
  for (let i = 0; i < cap; i++) {
    await setLook(yaw, pitch);
    await snap();
    const p = await pose();
    if (p.z >= zTarget) break;
  }
  await page.keyboard.up('KeyW');
}

const PI = Math.PI;

// 1. stand at the forward viewport, gauges + window in frame
await hold(26, 0, 0.02);
// 2. turn aft
await turn(30, 0, PI, 0.02, -0.02);
// 3. walk to the sonar bay
await walkUntil(3.85, PI, -0.02, 80);
// 4. pan onto the sonar console and ping it
await turn(20, PI, 0.62, -0.02, -0.14);
const hovered = await page.evaluate(() => window.debugAPI.getHoveredId());
if (hovered === 'sonar') await page.keyboard.press('KeyE');
else await page.evaluate(() => window.debugAPI.triggerInteraction('sonar'));
await hold(46, 0.62, -0.14);
// 5. pan back and walk through the fwd hatch to the stbd porthole
await turn(22, 0.62, PI, -0.14, -0.02);
await walkUntil(7.35, PI, -0.02, 130);
// 6. pan onto the porthole (right turn: continuous yaw past 2pi keeps it short)
await turn(22, PI, 2 * PI - 1.31, -0.02, 0.02);
await hold(46, 2 * PI - 1.31, 0.02);
// 7. pan back and walk the corridor + crew quarters + aft hatch to the motor
await turn(22, 2 * PI - 1.31, PI, 0.02, -0.02);
await walkUntil(19.3, PI, -0.02, 280);
// 8. settle on the propulsion motor
await turn(18, PI, PI, -0.02, -0.16);
await hold(34, PI, -0.16);

const endPose = await pose();
console.log(`captured ${frameIdx} frames, final pose z=${endPose.z.toFixed(2)}`);
await page.evaluate(() => window.debugAPI.setFixedDt(null));
await browser.close();
await close();
