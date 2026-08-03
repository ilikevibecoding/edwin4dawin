#!/usr/bin/env node
/**
 * Character state probe.
 *
 * Seeks to a time, settles the world, and prints each visible character's
 * position, heading, state and where its head is actually pointing in world
 * space. Used to check that figures face the camera when a shot expects them
 * to, without guessing from pixels.
 *
 * Usage: node tools/charprobe.mjs <time> [more times...]
 */
import puppeteer from 'puppeteer-core';

const times = process.argv.slice(2).map(Number);
if (times.length === 0) times.push(302);

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--window-size=640,360',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360 });
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async () => {
  document.querySelector('#gate button.primary').click();
  await new Promise((r) => setTimeout(r, 700));
  window.__SW.setPlaying(false);
  window.__SW.hideUi(true);
});

for (const t of times) {
  const out = await page.evaluate((time) => {
    window.__SW.seek(time);
    window.__SW.settle(30, 1 / 30);
    window.__SW.renderOnce();
    const app = window.__SW.app;
    const cam = app.render.camera;
    const cx = cam.position.x;
    const cz = cam.position.z;
    const deg = (r) => +((r * 180) / Math.PI).toFixed(0);
    return {
      t: time,
      cam: [+cx.toFixed(2), +cam.position.y.toFixed(2), +cz.toFixed(2)],
      chars: app.stage.allCharacters
        .filter((c) => c.root.visible)
        .map((c) => {
          const p = c.root.position;
          // Angle between the figure's facing and the direction to the camera:
          // 0 deg means looking straight down the lens.
          const fx = Math.sin(c.heading);
          const fz = Math.cos(c.heading);
          const dx = cx - p.x;
          const dz = cz - p.z;
          const len = Math.hypot(dx, dz) || 1;
          const dot = Math.max(-1, Math.min(1, (fx * dx + fz * dz) / len));
          return {
            n: c.displayName.split(' ')[0],
            st: c.state,
            pos: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)],
            headingDeg: deg(c.heading),
            targetDeg: deg(c.targetHeading),
            toCamDeg: deg(Math.acos(dot)),
          };
        }),
    };
  }, t);
  console.log(JSON.stringify(out));
}
await browser.close();
