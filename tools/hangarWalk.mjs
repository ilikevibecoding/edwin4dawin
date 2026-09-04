// Hangar walkability check: teleports the player onto the hangar's elevated surfaces (port catwalk,
// maintenance platform, flight-control cab) and walks on them with simulated keys, then climbs the first
// flight of a stair tower and the cab stair from the deck. Confirms the floors carry the player at the
// expected heights and that the railings block the edges. Screenshots each pose.
// Usage: node tools/hangarWalk.mjs [--base http://127.0.0.1:5207/] [--out /tmp/hangar]
import { chromium } from "playwright-core";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const base = opt("--base", process.env.SHOT_BASE || "http://127.0.0.1:5174/");
const outDir = opt("--out", "/tmp/hangar");
const shots = !args.includes("--no-shots");
mkdirSync(outDir, { recursive: true });

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("WebSocket") && !m.text().includes("[vite]")) console.log("[error]", m.text().slice(0, 200));
});
// the software renderer on a loaded build machine can take minutes to serve the first frame
await page.goto(base, { waitUntil: "load", timeout: 240000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });

async function settle(minFrames = 2) {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + minFrames, { timeout: 600000 });
}
// enter the hangar zone (builds deck D) and unfreeze the player for simulated walking
await page.evaluate(() => window.debugAPI.setView("hangarDeck"));
await settle(2);
await page.evaluate(() => {
  const p = window.debugAPI.player;
  p.frozen = false;
  p.locked = true; // simulate pointer lock so WASD moves the player
  p.headBob = false;
});

const pose = () => page.evaluate(() => {
  const p = window.debugAPI.player.position;
  const g = window.debugAPI.player.groundFloor;
  return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), carry: !!(g && g.carry) };
});
const teleport = (x, z, yaw, pitch = 0) => page.evaluate(([x, z, yaw, pitch]) => window.debugAPI.teleport(x, z, yaw, pitch), [x, z, yaw, pitch]);
// hold a key for `seconds` of simulated time (30 Hz steps, no rendering)
const walk = (code, seconds) => page.evaluate(([code, seconds]) => {
  const d = window.debugAPI;
  d.player.keys.add(code);
  d.advanceSim(seconds);
  d.player.keys.delete(code);
}, [code, seconds]);
const face = (yaw) => page.evaluate((yaw) => { window.debugAPI.player.yaw = (yaw * Math.PI) / 180; }, yaw);
async function shot(name) {
  if (!shots) return;
  await settle(2);
  const file = resolve(outDir, `${name}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 82, timeout: 600000 });
  console.log("  ->", file);
}

const results = [];
const near = (a, b, tol) => Math.abs(a - b) <= tol;
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(detail)}`);
}

const DECK = -80;
const CAT = -62;
const PLAT = -60;
const CAB = -74;

// 1. port service catwalk: stand at y -62, walk forward along it, then into the inner railing
await teleport(-30.2, 466, 0, -6);
let a = await pose();
check("catwalk height", near(a.y, CAT, 0.05), a);
await walk("KeyW", 1.5); // facing -z
let b = await pose();
check("catwalk walk stays level", near(b.y, CAT, 0.05) && b.z < a.z - 2, b);
await face(-90); // +x, toward the well
await walk("KeyW", 3);
let c = await pose();
check("catwalk railing blocks the edge", near(c.y, CAT, 0.05) && c.x < -28.4 && c.x > -29.3, c);
await face(-60);
await shot("walk_catwalk");

// 2. maintenance platform beside rack 440 (y -60), walk toward the inner edge rail
await teleport(-24, 439.5, -90, -4);
a = await pose();
check("platform height", near(a.y, PLAT, 0.05), a);
await walk("KeyW", 3);
b = await pose();
check("platform rail blocks the edge", near(b.y, PLAT, 0.05) && b.x < -19.7 && b.x > -20.7, b);
await shot("walk_platform");

// 3. forward port stair tower: from the deck through the doorway up the first flight (rise 3 m)
await teleport(-26.45, 422.6, 0, 8);
a = await pose();
check("deck height at the stair tower", near(a.y, DECK, 0.05), a);
await walk("KeyW", 4.5);
b = await pose();
check("stair tower first flight climbs", b.y > DECK + 2.6 && b.z < 416.5, b);
await shot("walk_stairTower");

// 4. flight-control cab floor (y -74), walk toward the consoles / parapet
await teleport(11, 507.6, 0, -8);
a = await pose();
check("control cab height", near(a.y, CAB, 0.05), a);
await walk("KeyW", 3);
b = await pose();
check("cab consoles block the glazing", near(b.y, CAB, 0.05) && b.z > 505.0, b);
await shot("walk_controlCab");

// 5. cab access stair: from the deck up the first flight
await teleport(17.15, 512.2, 0, 6);
a = await pose();
check("deck height at the cab stair", near(a.y, DECK, 0.05), a);
await walk("KeyW", 3.5);
b = await pose();
check("cab stair first flight climbs", b.y > DECK + 2.6 && b.z < 507, b);

// 6. aft gallery behind the cargo lifts: level at -62, lift gate closed unless a platform is docked
await teleport(0, 518.5, 90, -10);
a = await pose();
check("aft gallery height", near(a.y, CAT, 0.05), a);

// 7. flight-control cab on the starboard catwalk (y -62): walk toward the consoles / glazing over the well
await teleport(26.5, 464, 90, -6);
a = await pose();
check("flight control cab height", near(a.y, CAT, 0.05), a);
await walk("KeyW", 3); // facing -x
b = await pose();
check("flight control consoles block the glazing", near(b.y, CAT, 0.05) && b.x > 22.2 && b.x < 24.5, b);
await shot("walk_flightControl");

// 8. launch-lane opening at the well: the raised lip is a step (0.42), its inner edge stops the player
await teleport(0, 426.5, 180, -20);
a = await pose();
check("deck height at the launch lane", near(a.y, DECK, 0.05), a);
await walk("KeyW", 4); // facing +z, toward the open well
b = await pose();
check("well lip stops the player (no floor over the well)", near(b.y, DECK + 0.42, 0.06) && b.z < 430.45 && b.z > 429.4, b);
await shot("walk_wellLip");

// 9. port deck by the cradled fighter: level deck, the cradle skid blocks the way to the pod
await teleport(-25, 463, 180, -2);
a = await pose();
check("deck height at the cradle bay", near(a.y, DECK, 0.05), a);
await walk("KeyW", 3); // facing +z, into the cradle
b = await pose();
check("cradle collider blocks the pod", near(b.y, DECK, 0.05) && b.z > 464.6 && b.z < 465.4, b);

const failed = results.filter((r) => !r.ok);
writeFileSync(resolve(outDir, "walk.json"), JSON.stringify(results, null, 1));
console.log(failed.length ? `${failed.length} FAILED` : "all walk checks passed");
await browser.close();
process.exit(failed.length ? 1 : 0);
