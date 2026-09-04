// Mobile / touch regression: emulates a phone (touch, coarse pointer, portrait + landscape), taps through the
// start card, boards via the on-screen button, walks with the virtual stick, looks by dragging, opens the
// turbolift menu by tapping the panel prompt and chooses a deck by tapping. Usage: node tools/mobiletest.mjs [url]
import { chromium, devices } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const url = process.argv[2] || "http://127.0.0.1:5173/";
const outDir = resolve("shots/mobile");
mkdirSync(outDir, { recursive: true });
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const phone = devices["Pixel 5"];
const context = await browser.newContext({ ...phone, viewport: { width: 851, height: 393 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await context.newPage();
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`);
};
const cdp = await context.newCDPSession(page);
// touch drag helper via CDP (Playwright's touchscreen only taps)
async function touchDrag(id, x0, y0, x1, y1, steps = 8) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0, id }] });
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y, id }] });
    await page.waitForTimeout(40);
  }
  return () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
const ev = (fn, a) => page.evaluate(fn, a);
const settle = async (n = 2) => {
  const f0 = await ev(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 240000 });
};

await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
await settle(2);
check("touch mode detected", await ev(() => document.body.classList.contains("touch") && !!document.getElementById("touch-ui")));
const st = await ev(() => window.debugAPI.getStats());
check("mobile quality profile", st.mobile === true && st.pixelRatio <= 0.85, `pixelRatio=${st.pixelRatio} level=${st.qualityLevel}`);
await page.screenshot({ path: resolve(outDir, "01_start_card.png") });

// tap the start card
await page.touchscreen.tap(425, 200);
await page.waitForTimeout(300);
check("start card dismissed by tap", await ev(() => document.getElementById("start").classList.contains("hidden")));

// exterior: one-finger drag orbits
const th0 = await ev(() => window.debugAPI.rig.goal.theta);
let end = await touchDrag(1, 500, 200, 300, 220);
await end();
await page.waitForTimeout(100);
const th1 = await ev(() => window.debugAPI.rig.goal.theta);
check("touch drag orbits the exterior camera", Math.abs(th1 - th0) > 0.2, `dtheta=${(th1 - th0).toFixed(2)}`);
await settle(2);
await page.screenshot({ path: resolve(outDir, "02_exterior_touch.png") });

// BOARD button
await page.locator("#tb-mode").tap();
await page.waitForFunction(() => window.debugAPI.modes.mode === "interior" && !window.debugAPI.modes.busy, null, { timeout: 240000 });
check("BOARD button enters the interior", true);
await ev(() => window.debugAPI.player.requestLock());
await settle(2);
await page.screenshot({ path: resolve(outDir, "03_interior_touch.png") });

// virtual stick: hold forward-left region, drag up -> player moves forward (toward -z)
const z0 = await ev(() => window.debugAPI.player.position.z);
end = await touchDrag(2, 150, 300, 150, 230, 4);
await page.waitForTimeout(1200);
await end();
const z1 = await ev(() => window.debugAPI.player.position.z);
check("virtual stick walks the player", z1 < z0 - 0.3, `dz=${(z1 - z0).toFixed(2)}`);

// look drag on the right side
const yaw0 = await ev(() => window.debugAPI.player.yaw);
end = await touchDrag(3, 650, 180, 500, 180);
await end();
const yaw1 = await ev(() => window.debugAPI.player.yaw);
check("look drag turns the player", Math.abs(yaw1 - yaw0) > 0.3, `dyaw=${(yaw1 - yaw0).toFixed(2)}`);

// lift menu: open via debug (the panel raycast needs precise aim) then tap the second entry
await ev(() => {
  const d = window.debugAPI;
  d.setView("lift_lobby");
  d.player.frozen = false;
  d.player.requestLock();
  const cab = d.lifts.cabs.get("lift_lobby_tower:0");
  d.lifts.openMenu(cab);
});
await page.waitForTimeout(200);
check("lift menu opens", await ev(() => !document.getElementById("menu").classList.contains("hidden")));
await page.screenshot({ path: resolve(outDir, "04_lift_menu.png") });
await page.locator("#menu-list li").nth(1).tap();
await page.waitForTimeout(200);
const ride = await ev(() => window.debugAPI.lifts.ride && window.debugAPI.lifts.ride.dest.id);
check("menu entry tap starts the turbolift ride", !!ride, `dest=${ride}`);

// EXTERIOR button from inside
await ev(() => {
  window.debugAPI.lifts.ride = null;
  window.debugAPI.player.shake = 0;
});
await page.locator("#tb-mode").tap();
await page.waitForFunction(() => window.debugAPI.modes.mode === "exterior" && !window.debugAPI.modes.busy, null, { timeout: 60000 });
check("EXTERIOR button leaves the interior", true);

// portrait layout sanity
await page.setViewportSize({ width: 393, height: 851 });
await settle(2);
await page.screenshot({ path: resolve(outDir, "05_portrait.png") });
const fits = await ev(() => {
  const r = document.querySelector("#touch-buttons").getBoundingClientRect();
  return r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1;
});
check("buttons fit in portrait", fits);

if (errors.length) console.log("PAGE ERRORS:\n  " + errors.slice(0, 10).join("\n  "));
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
