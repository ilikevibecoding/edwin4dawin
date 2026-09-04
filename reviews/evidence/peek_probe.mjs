// One-off: reproduce the mobiletest sequence (lift lobby -> start ride -> cancel ride -> EXTERIOR) on a desktop page
// and read the room-visibility state behind the exterior camera, then a control run (bridge -> exit).
import { chromium } from "/workspace/node_modules/playwright-core/index.mjs";
const url = process.argv[2] || "http://127.0.0.1:5173/";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome-stable", args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const state = () => page.evaluate(() => {
  const d = window.debugAPI;
  const s = d.getStats();
  return {
    mode: d.modes.mode, busy: d.modes.busy, peek: d.rooms.peek, current: d.rooms.current ? d.rooms.current.id : null,
    visible: d.rooms.visibleRooms.map((r) => r.def.id), clusters: d.rooms.stats().clusters, built: d.rooms.stats().built,
    groupVisible: d.rooms.group.visible, cam: d.player.camera.position.toArray().map((v) => +v.toFixed(1)),
    calls: s.calls, lights: s.visibleLights, ride: d.lifts.ride ? d.lifts.ride.dest.id : null,
  };
});
const settle = async (n) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n);
};
let page;
for (const variant of ["mobile-sequence", "control-bridge"]) {
  page = await browser.newPage({ viewport: { width: 851, height: 393 } });
  page.setDefaultTimeout(600000);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready);
  await settle(1);
  if (variant === "mobile-sequence") {
    await page.evaluate(() => {
      const d = window.debugAPI;
      d.setView("lift_lobby");
      const cab = d.lifts.cabs.get("lift_lobby_tower:0");
      d.lifts.openMenu(cab);
    });
    console.log(variant, "after setView(lift_lobby)+openMenu:", JSON.stringify(await state()));
    await page.evaluate(() => {
      const d = window.debugAPI;
      const cab = d.lifts.cabs.get("lift_lobby_tower:0");
      d.lifts.startRide(cab, "hangar_lobby");
    });
    await page.waitForTimeout(200);
    console.log(variant, "after startRide(hangar_lobby):", JSON.stringify(await state()));
    await page.evaluate(() => { window.debugAPI.lifts.ride = null; window.debugAPI.player.shake = 0; });
    console.log(variant, "after ride=null:", JSON.stringify(await state()));
  } else {
    await page.evaluate(() => window.debugAPI.setView("bridge"));
    await settle(1);
    console.log(variant, "after setView(bridge):", JSON.stringify(await state()));
  }
  await page.evaluate(() => window.debugAPI.exitToExterior());
  await page.waitForFunction(() => window.debugAPI.modes.mode === "exterior" && !window.debugAPI.modes.busy);
  await settle(2);
  console.log(variant, "after exitToExterior():", JSON.stringify(await state()));
  await page.setViewportSize({ width: 393, height: 851 });
  await settle(2);
  console.log(variant, "portrait:", JSON.stringify(await state()));
  await page.screenshot({ path: `/workspace/shots/validator/peek_${variant}_portrait.png` });
  await page.close();
}
await browser.close();
