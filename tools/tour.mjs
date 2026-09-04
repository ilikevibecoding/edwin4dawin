// Frame-paced tour capture for the ISD Vigilance. Usage: node tools/tour.mjs <outDir> [baseUrl]
// Drives window.debugAPI with a fixed simulation step per rendered frame (debugAPI.fixedDt), so doors,
// the turbolift, TIE traffic and screen animations advance exactly 1/FPS s between captures however
// long the software renderer takes per frame. Writes <outDir>/frames/NNNNN.png, <outDir>/tour.json
// (per-segment stats) and, when ffmpeg is on PATH, <outDir>/tour.mp4.
//   TOUR_FPS (default 12)   TOUR_W / TOUR_H (default 960x540)   TOUR_SEGMENTS=a,b  limit to these
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const outDir = resolve(process.argv[2] || "/tmp/tour");
const base = process.argv[3] || "http://127.0.0.1:5173/";
const FPS = +(process.env.TOUR_FPS || 12);
const W = +(process.env.TOUR_W || 960);
const H = +(process.env.TOUR_H || 540);
const only = process.env.TOUR_SEGMENTS ? process.env.TOUR_SEGMENTS.split(",") : null;
mkdirSync(resolve(outDir, "frames"), { recursive: true });

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.setDefaultTimeout(240000);
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGE ERROR:", e.message);
});
page.on("console", (m) => {
  if (m.type() === "error" && !/GPU stall|ReadPixels|toNonIndexed/.test(m.text())) console.log("[error]", m.text().slice(0, 300));
});

console.log(`loading ${base}`);
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });
// step mode: the app simulates + renders one fixedDt frame per captureFrame() call and idles otherwise
await page.evaluate((fps) => {
  window.debugAPI.fixedDt = 1 / fps;
  window.debugAPI.stepMode = true;
}, FPS);

let frameNo = 0;
const report = { fps: FPS, viewport: [W, H], segments: [], errors };
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** Simulate + render exactly one frame and save it (canvas pixels, read back right after the render). */
async function capture() {
  const url = await page.evaluate(() => window.debugAPI.captureFrame("image/png"));
  writeFileSync(resolve(outDir, "frames", `${String(frameNo).padStart(5, "0")}.png`), Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
  frameNo++;
}

const CAPTIONS = {
  approach: "EXTERIOR \u2014 approach, bow quarter to broadside",
  tower: "EXTERIOR \u2014 superstructure tiers and command tower",
  bridge_ext: "EXTERIOR \u2014 bridge module",
  launch_ext: "EXTERIOR \u2014 TIE launch from the ventral hangar",
  bridge_int: "BRIDGE DECK \u2014 main bridge, command walkway to the viewports",
  blast_door: "BRIDGE DECK \u2014 corridor: the blast door opens on approach",
  turbolift: "TURBOLIFT \u2014 bridge deck to hangar deck",
  hangar: "HANGAR DECK \u2014 main bay, TIE taxiing out to launch",
  depart: "EXTERIOR \u2014 departing",
};

async function segment(name, seconds, setup, perFrame) {
  if (only && !only.includes(name)) return;
  const t0 = Date.now();
  const first = frameNo;
  if (setup) await setup();
  const n = Math.round(seconds * FPS);
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 1;
    const stop = await perFrame(k, i);
    await capture();
    if (stop === true) break;
  }
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  const took = Date.now() - t0;
  report.segments.push({ name, frames: frameNo - first, first, calls: stats.calls, triangles: stats.triangles, lights: stats.lights, visibleObjects: stats.visibleObjects, wallMs: took });
  console.log(`${name.padEnd(16)} ${String(frameNo - first).padStart(4)} frames  ${stats.calls} calls ${(stats.triangles / 1000).toFixed(0)}k tris  [${(took / 1000).toFixed(0)} s]`);
}

// camera helpers resolve to false: a per-frame callback ends its segment early only by returning true
const extView = (pos, look) => page.evaluate((n) => window.debugAPI.setView(`ext@${n.join(",")}`), [...pos, ...look]).then(() => false);
const intView = (sector, x, z, yaw, pitch) => page.evaluate((n) => window.debugAPI.setView(`${n[0]}@${n[1]},${n[2]},${n[3]},${n[4]}`), [sector, x, z, yaw, pitch]).then(() => false);

// 1. approach: bow quarter from far out, sweeping to the broadside medium station
await segment("approach", 6, null, (k) => extView(lerp([-1750, 680, -1950], [-1100, 520, 300], ease(k)), lerp([0, 60, 0], [0, 60, 200], ease(k))));
// 2. superstructure: closing on the city tiers and the command tower
await segment("tower", 4, null, (k) => extView(lerp([-420, 260, 560], [-260, 240, 330], ease(k)), lerp([-80, 120, 520], [0, 185, 620], ease(k))));
// 3. bridge module push-in
await segment("bridge_ext", 3, null, (k) => extView(lerp([40, 196, 470], [22, 192, 505], ease(k)), [0, 184, 592]));
// 4. a TIE launching from the ventral hangar, seen from below the mouth
await segment(
  "launch_ext",
  5,
  async () => {
    await extView([-70, -150, 70], [0, -60, -5]);
    await page.evaluate(() => {
      const api = window.debugAPI;
      api.requestLaunch(2);
      const youngest = () => api.trafficSnapshot().fighters.filter((f) => f.s === "launching").sort((x, y) => x.st - y.st)[0] || null;
      // step until the first fighter has entered the throat below the bay deck (world y -30)
      for (let i = 0; i < 600; i++) {
        api.advanceTraffic(0.1, 0.05);
        const f = youngest();
        if (f && f.p[1] < -34) break;
      }
    });
  },
  (k) => extView(lerp([-70, -150, 70], [-95, -165, 55], k), [0, -60, -5])
);
// 5. bridge: walk the command walkway from the dais to the forward viewports
await segment("bridge_int", 5, null, (k) => intView("d1_bridge", 0, -17 - 24 * ease(k), 0, -4 + 3 * ease(k)));
// 6. corridor: the real controller walks up to the bridge blast door, which opens on proximity
await segment(
  "blast_door",
  6,
  async () => {
    await page.evaluate(async () => {
      const api = window.debugAPI;
      await api.teleport("d1_corridor");
      api.player.pitch = -0.03;
    });
  },
  () =>
    page.evaluate(() => {
      const api = window.debugAPI;
      const p = api.player.position;
      const [tx, tz] = [0, 617]; // world: 8 m inside the bridge, past the blast door at z 625.2
      const d = Math.hypot(tx - p.x, tz - p.z);
      api.player.locked = true;
      api.player.frozen = false;
      api.player.yaw = Math.atan2(-(tx - p.x), -(tz - p.z));
      api.player.keys = new Set(d > 0.6 ? ["KeyW"] : []);
      return d < 0.6;
    })
);
// 7. turbolift: call the hangar deck from the bridge-deck cab; face the panel, then turn to the doors
await segment(
  "turbolift",
  11,
  async () => {
    await page.evaluate(async () => {
      const api = window.debugAPI;
      api.player.keys = new Set();
      await api.teleport("d1_lift");
      api.player.locked = true;
      api.player.frozen = false;
      api.player.position.z -= 0.6; // stand a step back from the rear-wall panel
      api.player.yaw = Math.PI;
      api.player.pitch = -0.08;
      api.lift("hangar");
    });
  },
  (k, i) =>
    page.evaluate(
      (n) => {
        const api = window.debugAPI;
        const t = n.i / n.fps;
        // 0-3.5 s: the readout and call panel; 3.5-5.5 s: turn to the doors; then wait for them to open
        const turn = Math.min(1, Math.max(0, (t - 3.5) / 2));
        api.player.yaw = Math.PI * (1 - turn * turn * (3 - 2 * turn));
        api.player.pitch = -0.08 + 0.06 * turn;
        api.player.keys = new Set();
        return t > 7 && api.liftState() === "idle";
      },
      { i, fps: FPS }
    )
);
// 8. hangar bay: from the lobby-side entry, sweeping over the deck toward the racks while a TIE launches
await segment(
  "hangar",
  6,
  async () => {
    await intView("d5_hangar", 0, -37, 0, -4);
    await page.evaluate(() => {
      const api = window.debugAPI;
      api.requestLaunch(1);
      const youngest = () => api.trafficSnapshot().fighters.filter((f) => f.s === "launching").sort((x, y) => x.st - y.st)[0] || null;
      for (let i = 0; i < 400; i++) {
        api.advanceTraffic(0.1, 0.05);
        const f = youngest();
        if (f && f.st > 4) break; // the fighter is off its rack and taxiing over the lane
      }
    });
  },
  (k) => intView("d5_hangar", -20 * ease(k), -37 - 19 * ease(k), 30 * ease(k), -4 + 16 * ease(k))
);
// 9. back outside: pull away from the hangar mouth to the far station
await segment("depart", 6, null, (k) => extView(lerp([-110, -200, -90], [-1750, 680, -1950], ease(k)), lerp([0, -46, 0], [0, 60, 0], ease(k))));

writeFileSync(resolve(outDir, "tour.json"), JSON.stringify(report, null, 2));
await browser.close();

// captions burnt in per segment (the HUD is HTML and not part of the canvas readback)
const font = ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"].find((p) => existsSync(p));
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/,/g, "\\,");
const draw = report.segments
  .filter((s) => CAPTIONS[s.name] && s.frames > 0)
  .map((s) => `drawtext=fontfile=${font}:text='${esc(CAPTIONS[s.name])}':x=24:y=h-44:fontsize=18:fontcolor=0xdfe6f2@0.92:box=1:boxcolor=0x08090c@0.6:boxborderw=8:enable='between(n\\,${s.first}\\,${s.first + s.frames - 1})'`)
  .join(",");
const vf = ["scale=trunc(iw/2)*2:trunc(ih/2)*2", font ? draw : ""].filter(Boolean).join(",");
const ff = spawnSync("ffmpeg", ["-y", "-framerate", String(FPS), "-i", resolve(outDir, "frames", "%05d.png"), "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "24", "-crf", "20", "-movflags", "+faststart", resolve(outDir, "tour.mp4")], { encoding: "utf8" });
if (ff.status === 0) console.log("video ->", resolve(outDir, "tour.mp4"));
else console.log("ffmpeg failed:", (ff.stderr || "").slice(-400));
console.log(`done: ${frameNo} frames, ${errors.length} page errors`);
