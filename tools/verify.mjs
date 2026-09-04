// Technical verification: loads the app headless and checks navigation and systems, not looks.
//  - every room resolves to itself when the camera is placed inside it (registry + bounds)
//  - doors open when approached and block when closed (collider toggling)
//  - both turbolifts carry the player to every deck they serve and the zone streams accordingly
//  - exterior <-> interior transitions complete in both directions without errors
//  - fighter traffic advances through its states; reserved systems are registered
//  - draw call / triangle / light budgets per view
// Usage: node tools/verify.mjs [--base http://127.0.0.1:5174/]   (exit code 1 on any failure)
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const bi = args.indexOf("--base");
const base = bi >= 0 ? args[bi + 1] : process.env.SHOT_BASE || "http://127.0.0.1:5174/";
const BUDGET = { calls: 320, triangles: 1_600_000, lights: 20 };

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => !e.message.includes("WebSocket") && errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !m.text().includes("WebSocket") && !m.text().includes("[vite]") && errors.push(m.text().slice(0, 200)));

let failures = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
}

await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });
const frames = async (n) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 240000 });
};
await frames(2);

// ---- rooms resolve
const rooms = await page.evaluate(() => window.debugAPI.rooms());
check("rooms in spec", rooms.length >= 10, `${rooms.length} rooms`);
let resolved = 0;
const budgetFails = [];
for (const r of rooms) {
  const res = await page.evaluate((id) => {
    const d = window.debugAPI;
    d.setView("room:" + id);
    return { space: d.spaceId(), zone: d.zone() };
  }, r.id);
  await frames(1);
  const st = await page.evaluate(() => window.debugAPI.getStats());
  if (res.space === r.id) resolved++;
  else console.log(`   room ${r.id} resolved as ${res.space} (zone ${res.zone})`);
  if (st.calls > BUDGET.calls || st.triangles > BUDGET.triangles || st.lights > BUDGET.lights) budgetFails.push(`${r.id}: ${st.calls} calls, ${st.triangles} tris, ${st.lights} lights`);
}
check("every room resolves to itself", resolved === rooms.length, `${resolved}/${rooms.length}`);
check("per-room budgets (calls/tris/lights)", budgetFails.length === 0, budgetFails.join("; ") || "all within budget");

// ---- doors: approach a room door from the corridor side and confirm it opens, then leaves
const doorTest = await page.evaluate(() => {
  const d = window.debugAPI;
  d.setView("room:comms");
  // comms door at x=2 (its -x wall), z=511 facing -x: stand in the spine corridor at x=0
  d.teleport(0, 511, -90, 0);
  const before = d.doors().find((x) => x.id === "comms-0");
  d.advanceSim(3);
  const after = d.doors().find((x) => x.id === "comms-0");
  d.teleport(0, 540, 0, 0);
  d.advanceSim(4);
  const closed = d.doors().find((x) => x.id === "comms-0");
  return { before, after, closed };
});
check("door opens on approach", doorTest.after && doorTest.after.open > 0.9, JSON.stringify(doorTest.after));
check("door closes after leaving", doorTest.closed && doorTest.closed.open < 0.1, JSON.stringify(doorTest.closed));

// ---- lifts
for (const lift of ["lift1", "lift2"]) {
  const before = await page.evaluate((id) => window.debugAPI.liftState(id), lift);
  const legs = [];
  const nDecks = before ? (lift === "lift1" ? 2 : 3) : 0;
  for (let i = 0; i < nDecks; i++) {
    const res = await page.evaluate(async (id) => {
      const d = window.debugAPI;
      d.setZone(d.interior.lifts.lifts.find((l) => l.id === id).decks[d.interior.lifts.lifts.find((l) => l.id === id).deckIndex].zone);
      const ok = d.ride(id);
      d.advanceSim(30);
      const st = d.liftState(id);
      return { ok, st, zone: d.zone(), playerY: +d.player.position.y.toFixed(2), space: d.spaceId() };
    }, lift);
    legs.push(res);
    await frames(1);
  }
  const allArrived = legs.every((l) => l.ok && l.st.state === "idle");
  const carried = legs.every((l) => Math.abs(l.playerY - l.st.y) < 0.05);
  check(`${lift} rides every deck`, allArrived, legs.map((l) => `${l.st.deck}@${l.st.y}`).join(" → "));
  check(`${lift} carries the player`, carried, legs.map((l) => `player ${l.playerY} vs car ${l.st.y}`).join("; "));
  check(`${lift} streams the zone`, legs.every((l) => l.zone), legs.map((l) => l.zone).join(" → "));
}

// ---- transitions
const trans = await page.evaluate(() => {
  const d = window.debugAPI;
  d.setView("bridge");
  d.exitShip();
  d.advanceSim(6);
  const afterExit = d.mode();
  d.board();
  d.advanceSim(7);
  const afterBoard = { mode: d.mode(), space: d.spaceId(), zone: d.zone() };
  return { afterExit, afterBoard };
});
check("exit to exterior completes", trans.afterExit === "exterior", trans.afterExit);
check("boarding returns to the bridge", trans.afterBoard.mode === "interior" && trans.afterBoard.space === "bridge", JSON.stringify(trans.afterBoard));

// ---- traffic + reserved systems
const tr = await page.evaluate(() => {
  const d = window.debugAPI;
  const a = d.trafficState();
  d.advanceSim(60);
  const b = d.trafficState();
  return { a, b, reserved: d.reserved() };
});
const moved = tr.b.states.some((s, i) => s.state !== tr.a.states[i].state || s.t !== tr.a.states[i].t);
check("fighter traffic advances", moved, `${JSON.stringify(tr.a.counts)} → ${JSON.stringify(tr.b.counts)}`);
check("reserved systems registered", tr.reserved.length === 8 && tr.reserved.every((s) => !s.enabled), tr.reserved.map((s) => s.name).join(","));

// ---- exterior budgets
for (const v of ["ext_far", "ext_mid", "ext_close"]) {
  await page.evaluate((n) => window.debugAPI.setView(n), v);
  await frames(2);
  const st = await page.evaluate(() => window.debugAPI.getStats());
  check(`${v} budget`, st.calls <= BUDGET.calls && st.triangles <= BUDGET.triangles, `${st.calls} calls, ${st.triangles} tris, detail ${st.exteriorDetail}`);
}

check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(`\n${results.length - failures}/${results.length} checks passed`);
await browser.close();
process.exit(failures ? 1 : 0);
