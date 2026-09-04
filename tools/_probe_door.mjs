import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto("http://127.0.0.1:5173/", { waitUntil: "commit", timeout: 180000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
mkdirSync("shots/probe", { recursive: true });
const r = await page.evaluate(() => {
  const api = window.debugAPI;
  api.teleport("lobby_a");
  api.player.setPose(0, 253 + 3.5, 0, -2, 246); // 10 m from the bridge door, facing it
  const s = api.simulate(6, []); // doors settle
  const d = api.doorStates().find((x) => x.id === "bridge__lobby_a");
  const door = [...api.cells.doors.values()].find((x) => x.id === "bridge__lobby_a");
  return { s, d, leaves: door.leaves.map((l) => ({ x: +l.position.x.toFixed(2), visible: l.visible, children: l.children.length, groupVisible: door.group.visible })), vis: [...api.cells.visibleIds] };
});
console.log(JSON.stringify(r));
const f0 = await page.evaluate(() => window.debugAPI.frames());
await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + 3, { timeout: 240000 });
await page.screenshot({ path: "shots/probe/lobby_door_closed.png", timeout: 150000 });
// now approach: walk toward the door and shoot mid-open
const r2 = await page.evaluate(() => {
  const api = window.debugAPI;
  api.simulate(2.2, ["KeyW"]);
  return { d: api.doorStates().find((x) => x.id === "bridge__lobby_a"), vis: [...api.cells.visibleIds], pos: api.player.position.toArray() };
});
console.log(JSON.stringify(r2));
const f1 = await page.evaluate(() => window.debugAPI.frames());
await page.waitForFunction((t) => window.debugAPI.frames() >= t, f1 + 3, { timeout: 240000 });
await page.screenshot({ path: "shots/probe/lobby_door_open.png", timeout: 150000 });
await browser.close();
