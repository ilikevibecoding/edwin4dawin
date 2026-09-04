// One-off: does the exterior "peek" (tower rooms rendered behind the glazing) change any pixel of the exterior frame?
// For each exterior view: capture the full canvas twice with rooms visible (noise floor), then with rooms.group hidden.
import { chromium } from "/workspace/node_modules/playwright-core/index.mjs";
const url = process.argv[2] || "http://127.0.0.1:5173/";
const W = 640, H = 360;
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome-stable", args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.setDefaultTimeout(600000);
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready);
await page.evaluate(() => { window.debugAPI.freezeGrain = true; });
const settle = async (n) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n);
};
const state = () => page.evaluate(() => {
  const d = window.debugAPI, s = d.getStats();
  return { peek: d.rooms.peek, visible: d.rooms.visibleRooms.map((r) => r.def.id), calls: s.calls, tris: s.triangles, lights: s.visibleLights, cam: d.player.camera.position.toArray().map((v) => +v.toFixed(0)) };
});
const capture = () => page.evaluate(async ([w, h]) => window.debugAPI.capturePixels(0, 0, w, h), [W, H]);
const diff = (a, b, thr = 8) => {
  let n = 0, x0 = W, y0 = H, x1 = -1, y1 = -1, maxd = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > maxd) maxd = d;
    if (d > thr) { n++; const p = i / 4, x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { differing: n, pct: +(100 * n / (W * H)).toFixed(3), maxDelta: maxd, bbox: n ? [x0, y0, x1, y1] : null };
};
for (const view of ["ext_tower", "ext_close", "ext_mid"]) {
  await page.evaluate((v) => window.debugAPI.setView(v), view);
  await settle(2);
  const withRooms = await state();
  const a1 = await capture();
  await settle(1);
  const a2 = await capture();
  await page.evaluate(() => { window.debugAPI.rooms.group.visible = false; });
  await settle(2);
  const without = await state();
  const b = await capture();
  await page.evaluate(() => { window.debugAPI.rooms.group.visible = true; });
  await settle(1);
  console.log(`${view}: cam ${withRooms.cam} peek=${withRooms.peek} rooms ${withRooms.visible.join("|") || "-"}`);
  console.log(`   with rooms: ${withRooms.calls} calls ${(withRooms.tris / 1000).toFixed(0)}k tris ${withRooms.lights} lights | rooms hidden: ${without.calls} calls ${(without.tris / 1000).toFixed(0)}k tris ${without.lights} lights`);
  console.log(`   noise floor (same state, two frames): ${JSON.stringify(diff(a1, a2))}`);
  console.log(`   rooms visible vs hidden:              ${JSON.stringify(diff(a1, b))}`);
}
await page.screenshot({ path: "/workspace/shots/validator/peek_ext_tower_rooms_visible.png" });
await browser.close();
