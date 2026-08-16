// Offline frame-by-frame walkthrough capture: control room -> engine room.
// Drives the real player controller (collision, head bob) with a fixed dt per
// frame so the assembled video plays at true speed. Look direction is scripted
// between waypoints (stand-and-pan at the sonar console and stbd porthole).
//
// Capture path: page.screenshot costs ~45s/frame on SwiftShader (compositor
// re-raster), so frames are read back in-page instead: pumpFrame renders
// synchronously, the WebGL canvas is blitted onto a 2D canvas in the same task
// (valid even without preserveDrawingBuffer), the live HUD DOM state is drawn
// on top, and the JPEG comes back as a data URL (~0.1s/frame).
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

  // in-page frame producer: set look/keys, pump one fixed-dt frame, composite
  // WebGL canvas + HUD onto a capture canvas, return JPEG data URL
  const glCanvas = window.__ctx.renderer.domElement;
  const cap = document.createElement('canvas');
  cap.width = glCanvas.width;
  cap.height = glCanvas.height;
  const cx = cap.getContext('2d');
  const hudRoot = document.getElementById('hud');
  const [, , promptEl, statusEl, infoEl, hintEl] = hudRoot.children;

  function drawHUD(w, h) {
    if (hudRoot.style.display === 'none') return;
    const promptOn = promptEl.style.display !== 'none';
    // crosshair dot + hover ring
    cx.fillStyle = 'rgba(215,222,214,0.85)';
    cx.beginPath();
    cx.arc(w / 2, h / 2, 2, 0, 7);
    cx.fill();
    if (promptOn) {
      cx.strokeStyle = 'rgba(219,226,216,0.75)';
      cx.lineWidth = 1;
      cx.beginPath();
      cx.arc(w / 2, h / 2, 9, 0, 7);
      cx.stroke();
    }
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    // interaction prompt (bottom 17%)
    if (promptOn) {
      cx.font = '15px "DejaVu Sans Mono", monospace';
      const text = promptEl.textContent;
      const tw = cx.measureText(text).width;
      const bx = w / 2 - tw / 2 - 14, by = h * 0.83 - 16, bw = tw + 28, bh = 32;
      cx.fillStyle = 'rgba(10,12,11,0.55)';
      cx.fillRect(bx, by, bw, bh);
      cx.strokeStyle = 'rgba(160,170,160,0.25)';
      cx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      cx.fillStyle = '#dfe5da';
      cx.fillText(text, w / 2, h * 0.83);
    }
    // status line (bottom 24%)
    if ((parseFloat(statusEl.style.opacity) || 0) > 0.05 && statusEl.textContent) {
      cx.font = '14px "DejaVu Sans Mono", monospace';
      cx.fillStyle = '#c8d4b8';
      cx.shadowColor = 'rgba(0,0,0,0.9)';
      cx.shadowBlur = 3;
      cx.fillText(statusEl.textContent, w / 2, h * 0.76);
      cx.shadowBlur = 0;
    }
    // controls hint (top 58%), shown briefly at the start
    if (hintEl.style.display !== 'none') {
      cx.font = '13px "DejaVu Sans Mono", monospace';
      cx.fillStyle = 'rgba(205,214,205,0.8)';
      const lines = hintEl.innerText.split('\n');
      lines.forEach((ln, i) => cx.fillText(ln, w / 2, h * 0.58 + i * 26));
    }
    // ship label (top left)
    cx.textAlign = 'left';
    cx.font = '11px "DejaVu Sans Mono", monospace';
    cx.fillStyle = 'rgba(150,175,160,0.65)';
    cx.fillText(infoEl.textContent, 18, 20);
  }

  window.__capFrame = ({ yaw, pitch, keyW, keyA, keyD }) => {
    const c = window.__ctx;
    if (yaw !== null) c.player.object.rotation.y = yaw;
    if (pitch !== null) c.player.pitchObject.rotation.x = pitch;
    const k = c.player.state.keys;
    if (k.w !== !!keyW) window.dispatchEvent(new KeyboardEvent(keyW ? 'keydown' : 'keyup', { code: 'KeyW' }));
    if (k.a !== !!keyA) window.dispatchEvent(new KeyboardEvent(keyA ? 'keydown' : 'keyup', { code: 'KeyA' }));
    if (k.d !== !!keyD) window.dispatchEvent(new KeyboardEvent(keyD ? 'keydown' : 'keyup', { code: 'KeyD' }));
    window.debugAPI.pumpFrame();
    cx.drawImage(glCanvas, 0, 0);
    drawHUD(cap.width, cap.height);
    return { jpeg: cap.toDataURL('image/jpeg', 0.88), x: c.player.object.position.x, z: c.player.object.position.z };
  };
}, FPS);

let frameIdx = 0;
async function snap(yaw, pitch, keys = {}) {
  const { jpeg, x, z } = await page.evaluate((o) => window.__capFrame(o), { yaw, pitch, keyW: false, keyA: false, keyD: false, ...keys });
  fs.writeFileSync(path.join(OUT, `f${String(frameIdx).padStart(5, '0')}.jpg`), Buffer.from(jpeg.split(',')[1], 'base64'));
  frameIdx++;
  return { x, z };
}
async function hold(frames, yaw, pitch) {
  for (let i = 0; i < frames; i++) await snap(yaw, pitch);
}
async function turn(frames, y0, y1, p0, p1) {
  for (let i = 1; i <= frames; i++) {
    const t = smooth(i / frames);
    await snap(y0 + (y1 - y0) * t, p0 + (p1 - p0) * t);
  }
}
async function walkUntil(zTarget, yaw, pitch, cap) {
  for (let i = 0; i < cap; i++) {
    const { z } = await snap(yaw, pitch, { keyW: true });
    if (z >= zTarget) break;
  }
}
async function strafeUntil(xTarget, yaw, pitch, cap) {
  const p0 = await page.evaluate(() => window.debugAPI.getPose());
  const goStbd = xTarget > p0.x; // facing aft: A sidesteps stbd (+x), D port (-x)
  const key = goStbd ? 'keyA' : 'keyD';
  for (let i = 0; i < cap; i++) {
    const { x } = await snap(yaw, pitch, { [key]: true });
    if (goStbd ? x >= xTarget : x <= xTarget) break;
  }
}

const PI = Math.PI;

// 1. stand at the forward viewport, gauges + window in frame (controls hint up
//    briefly, then a clean beat on the viewport)
await hold(16, 0, -0.05);
await page.evaluate(() => window.__ctx.hud.setHint(false));
await hold(16, 0, -0.05);
// 2. turn aft
await turn(30, 0, PI, -0.05, -0.02);
// 3. walk to the sonar bay
await walkUntil(3.85, PI, -0.02, 80);
// 4. pan onto the sonar console and ping it
await turn(20, PI, 0.62, -0.02, -0.14);
const hovered = await page.evaluate(() => window.debugAPI.getHoveredId());
if (hovered === 'sonar') await page.keyboard.press('KeyE');
else await page.evaluate(() => window.debugAPI.triggerInteraction('sonar'));
await hold(50, 0.62, -0.14);
// 5. pan back, walk through the fwd hatch, sidestep toward the stbd wall (the
//    parked hatch door leaf blocks the porthole sightline from the centerline)
await turn(22, 0.62, PI, -0.14, -0.02);
await walkUntil(7.15, PI, -0.02, 130);
await strafeUntil(0.35, PI, -0.02, 24);
// 6. pan onto the porthole with a live bearing from where the player stands
const pp = await page.evaluate(() => window.debugAPI.getPose());
let portYaw = Math.atan2(-(1.52 - pp.x), -(6.95 - pp.z));
if (portYaw < 0) portYaw += 2 * PI; // keep the turn going right (through stbd)
const portPitch = Math.atan2(1.42 - pp.y, Math.hypot(1.52 - pp.x, 6.95 - pp.z));
await turn(22, PI, portYaw, -0.02, portPitch);
await hold(46, portYaw, portPitch);
// 7. pan back, recentre, and walk corridor + crew quarters + aft hatch to the motor
await turn(22, portYaw, PI, portPitch, -0.02);
await strafeUntil(0.1, PI, -0.02, 24);
await walkUntil(19.3, PI, -0.02, 280);
// 8. settle on the propulsion motor
await turn(18, PI, PI, -0.02, -0.16);
await hold(40, PI, -0.16);

const endPose = await page.evaluate(() => window.debugAPI.getPose());
console.log(`captured ${frameIdx} frames, final pose z=${endPose.z.toFixed(2)}`);
await page.evaluate(() => window.debugAPI.setFixedDt(null));
await browser.close();
await close();
