// Offline flythrough renderer: drives the debug API through a scripted sequence (exterior orbit, boarding,
// bridge walk, turbolift ride, hangar) one deterministic frame at a time and assembles an MP4 with ffmpeg.
// Usage: node tools/flythrough.mjs [--base http://127.0.0.1:5174/] [--out /tmp/flythrough] [--fps 24] [--scale 0.5]
// --scale shortens every segment (0.5 = half the frames) for quick previews.
import { chromium } from "playwright-core";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const base = opt("--base", process.env.SHOT_BASE || "http://127.0.0.1:5174/");
const outDir = opt("--out", "/tmp/flythrough");
const fps = +opt("--fps", 24);
const scale = +opt("--scale", 1);
mkdirSync(outDir, { recursive: true });

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

// Each segment: seconds, and a function(k in 0..1) evaluated in the page that positions the camera.
const SEGMENTS = [
  // 1. far approach: orbit from far to mid while the ship turns under us
  { s: 8, mode: "exterior", eval: (k) => ({ target: [0, 60, 100], distance: lerp(5200, 2200, ease(k)), yaw: lerp(2.5, 1.7, k), pitch: lerp(0.2, 0.3, k) }) },
  // 2. close pass along the superstructure to the tower
  { s: 7, mode: "exterior", eval: (k) => ({ target: [lerp(-220, 0, k), lerp(80, 250, k), lerp(200, 520, k)], distance: lerp(340, 520, k), yaw: lerp(2.0, 2.7, k), pitch: lerp(0.35, 0.15, k) }) },
  // 3. board through the bridge windows (scripted transition)
  { s: 5.5, mode: "board" },
  // 4. walk the bridge walkway toward the windows
  { s: 6, mode: "walk", from: { x: 0, z: 490.5, yaw: 0, pitch: -3 }, to: { x: 0, z: 476, yaw: 0, pitch: -6 }, zone: "tower" },
  // 5. look around from the command platform
  { s: 4, mode: "walk", from: { x: 0, z: 476, yaw: 0, pitch: -6 }, to: { x: 0, z: 476, yaw: 150, pitch: -8 }, zone: "tower" },
  // 6. command deck corridor
  { s: 6, mode: "walk", from: { x: 0, z: 496, yaw: 180, pitch: -2 }, to: { x: 0, z: 540, yaw: 180, pitch: -2 }, zone: "tower" },
  // 7. turbolift ride down to the hangar (lift2 from deck B)
  { s: 12, mode: "ride", lift: "lift2", deck: "D" },
  // 8. hangar deck walk toward the well
  { s: 8, mode: "walk", from: { x: -34.5, z: 479.5, yaw: -90, pitch: -2 }, to: { x: -24, z: 470, yaw: -60, pitch: -6 }, zone: "hangar" },
  // 9. exit through the well to the exterior (scripted transition)
  { s: 5.5, mode: "exit" },
  // 10. final orbit
  { s: 6, mode: "exterior", eval: (k) => ({ target: [0, 0, 200], distance: lerp(1400, 3000, ease(k)), yaw: lerp(2.3, 2.9, k), pitch: lerp(-0.6, 0.15, k) }) },
];

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(240000); // the build machine is often loaded by parallel workstreams
page.on("pageerror", (e) => !e.message.includes("WebSocket") && console.log("PAGE ERROR", e.message));
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });
await page.evaluate(() => {
  const d = window.debugAPI;
  d.setView("ext_far"); // enters deterministic mode (quality scaler off, grain frozen)
  d.freezeGrain = false;
  d.player.headBob = false;
  d.setPaused(true); // render only on demand from here on
});
const frame = async () => {
  await page.evaluate(() => window.debugAPI.renderFrame());
};

let n = 0;
const dt = 1 / fps;
for (const seg of SEGMENTS) {
  const frames = Math.max(1, Math.round(seg.s * fps * scale));
  console.log(`segment ${seg.mode} ${frames} frames`);
  if (seg.mode === "board") await page.evaluate(() => window.debugAPI.board());
  if (seg.mode === "exit") await page.evaluate(() => window.debugAPI.exitShip());
  if (seg.mode === "ride") {
    await page.evaluate(({ lift, deck }) => {
      const d = window.debugAPI;
      const L = d.interior.lifts.lifts.find((l) => l.id === lift);
      // start from the deck before `deck` in the lift's list so the ride ends where we want
      const idx = L.decks.findIndex((x) => x.id === deck);
      const fromDeck = L.decks[(idx - 1 + L.decks.length) % L.decks.length];
      d.modes.setInterior({ x: (L.spec.x0 + L.spec.x1) / 2, z: (L.spec.z0 + L.spec.z1) / 2, y: fromDeck.y, yaw: L.spec.doorSide === "+x" ? -90 : 0, pitch: -4, zone: fromDeck.zone });
      L.deckIndex = L.decks.indexOf(fromDeck);
      L.y = fromDeck.y;
      L.car.position.y = fromDeck.y;
      for (const dk of L.decks) {
        const door = L.landingDoors[dk.id];
        door.open = dk === fromDeck ? 1 : 0;
        door.target = door.open;
      }
      d.player.frozen = false;
      d.player.locked = true;
      d.interior.lifts.travelTo(lift, deck);
    }, seg);
  }
  for (let i = 0; i < frames; i++) {
    const k = frames === 1 ? 1 : i / (frames - 1);
    if (seg.mode === "exterior") {
      const pose = seg.eval(k);
      await page.evaluate((p) => {
        const d = window.debugAPI;
        if (d.mode() !== "exterior") d.modes.setExterior(p);
        d.modes.orbit.setPose(p, true);
      }, pose);
    } else if (seg.mode === "walk") {
      const p = { x: lerp(seg.from.x, seg.to.x, ease(k)), z: lerp(seg.from.z, seg.to.z, ease(k)), yaw: lerp(seg.from.yaw, seg.to.yaw, ease(k)), pitch: lerp(seg.from.pitch, seg.to.pitch, ease(k)), zone: seg.zone };
      await page.evaluate((q) => {
        const d = window.debugAPI;
        if (d.mode() !== "interior" || d.zone() !== q.zone) d.modes.setInterior({ ...q, y: null });
        d.player.setPose(q.x, q.z, q.yaw, q.pitch);
        d.player.frozen = true;
        d.interior.update(0, d.player);
      }, p);
    }
    await page.evaluate((step) => {
      const d = window.debugAPI;
      d.advanceSim(step);
      d.advanceSky(step);
      d.pool.settle(d.modes.camera.position);
      d.renderFrame();
    }, dt);
    await page.screenshot({ path: resolve(outDir, `f${String(n).padStart(5, "0")}.jpg`), type: "jpeg", quality: 86 });
    n++;
    if (n % 24 === 0) console.log(`  ${n} frames`);
  }
}
await browser.close();
const mp4 = resolve(outDir, "flythrough.mp4");
execSync(`ffmpeg -loglevel error -y -framerate ${fps} -i ${outDir}/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 ${mp4}`, { stdio: "inherit" });
console.log(`wrote ${mp4} (${n} frames)`);
process.exit(0);
