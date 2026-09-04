// One-off: draw-call / triangle cost of interior rooms left visible in the exterior view after exitToExterior()
// from a non-tower cluster (peek switches off when the camera is > 360 m from the tower glazing).
import { chromium } from "/workspace/node_modules/playwright-core/index.mjs";
const url = process.argv[2] || "http://127.0.0.1:5173/";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome-stable", args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-precise-memory-info"] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready);
const settle = async (n) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n);
};
const stats = () => page.evaluate(() => {
  const s = window.debugAPI.getStats();
  const d = window.debugAPI;
  return { mode: s.mode, calls: s.calls, triangles: s.triangles, visibleLights: s.visibleLights, visibleObjects: s.visibleObjects, peek: d.rooms.peek, roomsVisible: s.rooms.visible, cam: d.player.camera.position.toArray().map((v) => +v.toFixed(0)) };
});
for (const [view, label] of [["hangar", "hangar"], ["reactor", "engineering"], ["crew_corridor", "crew"]]) {
  await page.evaluate((v) => window.debugAPI.setView(v), view);
  await settle(1);
  await page.evaluate(() => window.debugAPI.exitToExterior());
  await page.waitForFunction(() => window.debugAPI.modes.mode === "exterior" && !window.debugAPI.modes.busy);
  await settle(2);
  const withRooms = await stats();
  await page.evaluate(() => (window.debugAPI.rooms.group.visible = false));
  await settle(2);
  const without = await stats();
  await page.evaluate(() => (window.debugAPI.rooms.group.visible = true));
  console.log(`exit from ${label}: cam ${withRooms.cam} peek=${withRooms.peek} rooms visible ${withRooms.roomsVisible.join("|")}`);
  console.log(`   with interior rooms: ${withRooms.calls} calls, ${(withRooms.triangles / 1000).toFixed(0)}k tris, ${withRooms.visibleLights} lights, ${withRooms.visibleObjects} objects`);
  console.log(`   interior hidden:     ${without.calls} calls, ${(without.triangles / 1000).toFixed(0)}k tris, ${without.visibleLights} lights, ${without.visibleObjects} objects`);
  console.log(`   => wasted: ${withRooms.calls - without.calls} calls, ${((withRooms.triangles - without.triangles) / 1000).toFixed(0)}k tris`);
}
await browser.close();
