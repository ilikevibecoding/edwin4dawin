// Offline cinematic capture for the Battle of Coruscant: warms the battle up with fixed-step simulation,
// then drives the cinematic camera shot by shot, rendering one deterministic frame per step and
// assembling an MP4 with ffmpeg.
// Usage: node tools/battle-video.mjs [--base http://127.0.0.1:5174/battle.html] [--out /tmp/battle-video]
//        [--fps 24] [--w 1280 --h 720] [--seconds 60] [--warmup 25] [--shots 0,1,2,...]
import { chromium } from "playwright-core";
import { mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  return args[i + 1];
};
const base = opt(
  "--base",
  process.env.SHOT_BASE || "http://127.0.0.1:5174/battle.html",
);
const outDir = opt("--out", "/tmp/battle-video");
const fps = +opt("--fps", 24);
const width = +opt("--w", 1280);
const height = +opt("--h", 720);
const seconds = +opt("--seconds", 60);
const warmup = +opt("--warmup", 25);
const shots = opt("--shots", null);
mkdirSync(outDir, { recursive: true });

const executablePath = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader-webgl",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(240000);
page.on(
  "pageerror",
  (e) =>
    !e.message.includes("WebSocket") && console.log("PAGE ERROR", e.message),
);
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(
  () => window.debugAPI && window.debugAPI.ready,
  null,
  { timeout: 240000 },
);
await page.waitForFunction(() => window.debugAPI.frames() >= 3, null, {
  timeout: 240000,
});

await page.evaluate(
  ({ warmup, shots }) => {
    const d = window.debugAPI;
    d.setPaused(true);
    d.freezeGrain = false;
    document.getElementById("start")?.classList.add("hidden");
    d.advanceSim(warmup); // the battle is already raging when the camera arrives
    d.setCinematic(true, shots ? +shots.split(",")[0] : 0);
  },
  { warmup, shots },
);

const total = Math.round(seconds * fps);
const t0 = Date.now();
let lastShot = "";
for (let n = 0; n < total; n++) {
  const shot = await page.evaluate((dt) => {
    window.debugAPI.renderFrame(dt);
    return window.debugAPI.cinematicShot();
  }, 1 / fps);
  if (shot !== lastShot) {
    console.log(`  ${(n / fps).toFixed(1)} s: ${shot}`);
    lastShot = shot;
  }
  await page.screenshot({
    path: resolve(outDir, `f${String(n).padStart(5, "0")}.jpg`),
    type: "jpeg",
    quality: 88,
  });
  if (n % (fps * 5) === 0 && n)
    console.log(
      `  ${n}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s elapsed`,
    );
}
await browser.close();
const mp4 = resolve(outDir, "battle_of_coruscant.mp4");
execSync(
  `ffmpeg -loglevel error -y -framerate ${fps} -i ${outDir}/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 ${mp4}`,
  { stdio: "inherit" },
);
console.log("video:", mp4);
