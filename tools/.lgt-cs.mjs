/**
 * Scratch diagnostic: is the contact shadow term doing anything?
 *
 * The review found props ungrounded, and `contactShadows` being wired all the
 * way to a compiled chunk proves only that the code is there. So this renders
 * the same frame twice with nothing changed but `uCsmContact.y` — the strength
 * — and reports how many pixels moved and by how much. A term that is live
 * darkens a thin band at every sun-facing contact and leaves the rest of the
 * frame bit-identical, which is a signature no other difference has.
 *
 *   node tools/.lgt-cs.mjs [shot]
 */
import puppeteer from 'puppeteer-core';
import { existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Raw RGB of a PNG, via ffmpeg, which is what the other meters here use. */
const pixels = (file) =>
  execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'format=rgb24', '-f', 'rawvideo', '-'],
    { maxBuffer: 1 << 28 });

const SHOT = process.argv[2] ?? 'garage';
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const W = 640;
const H = 360;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--force-color-profile=srgb', `--window-size=${W},${H}`,
  ],
  protocolTimeout: 2400000,
  defaultViewport: { width: W, height: H },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 200)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });
await page.waitForFunction((s) => window.__GAME__?.listShots?.().includes(s), {
  timeout: 600000, polling: 250,
}, SHOT);

const info = await page.evaluate(async (shot) => {
  const g = window.__GAME__;
  g.pose(shot);
  const lighting = g.engine.get('lighting');
  const volume = lighting.volume;
  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) g.engine.step(1 / 60);
  for (let i = 0; i < 4000 && (volume.pendingRelight || volume.baking); i++) g.engine.step(1 / 60);
  g.stepFrames(10);
  const u = lighting.uniforms.uCsmContact.value;
  /* Frozen against the per-frame write in `syncUniforms`, which would put the
     shipped value back before the next render. */
  const held = { x: u.x, y: u.y };
  u.set = function (x, y) { this.x = held.x; this.y = held.y; return this; };
  return { reach: held.x, strength: held.y, key: lighting.debugReport?.().shaderKey ?? '?' };
}, SHOT);

console.log(`contact reach ${info.reach} m  strength ${info.strength}  shader key ${info.key}`);

const shoot = async (strength, file) => {
  await page.evaluate((s) => {
    const u = window.__GAME__.engine.get('lighting').uniforms.uCsmContact.value;
    u.y = s;
    window.__GAME__.stepFrames(6);
  }, strength);
  writeFileSync(file, await page.screenshot({ type: 'png', optimizeForSpeed: true }));
};

await shoot(info.strength, '/tmp/contact-on.png');
await shoot(0, '/tmp/contact-off.png');
await browser.close();

const on = pixels('/tmp/contact-on.png');
const off = pixels('/tmp/contact-off.png');
let moved = 0;
let sum = 0;
let peak = 0;
for (let i = 0; i < on.length; i += 3) {
  const a = (on[i] + on[i + 1] + on[i + 2]) / 3;
  const b = (off[i] + off[i + 1] + off[i + 2]) / 3;
  const d = b - a;
  if (d > 1) { moved++; sum += d; peak = Math.max(peak, d); }
}
const total = on.length / 3;
console.log(
  `pixels darkened by the term: ${moved} of ${total} (${((100 * moved) / total).toFixed(2)}%)  ` +
  `mean darkening ${moved ? (sum / moved).toFixed(1) : 0} of 255  peak ${peak}`,
);
