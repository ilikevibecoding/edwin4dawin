// Navigation / systems regression test (headless): room tracking, door triggers + portal culling, collision,
// turbolift ride between decks, boarding + exit transitions, fighter traffic hooks, snapshot round-trip.
// Usage: node tools/navtest.mjs [url]   (exit code 0 = all checks passed)
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const url = process.argv[2] || "http://127.0.0.1:5173/";
const outDir = resolve("shots/navtest");
mkdirSync(outDir, { recursive: true });
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`);
};
const ev = (fn, arg) => page.evaluate(fn, arg);
const settle = async (n = 2) => {
  const f0 = await ev(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 240000 });
};

// 1. rooms: every room resolves at its spawn point
{
  const bad = await ev(() => {
    const d = window.debugAPI;
    const out = [];
    for (const r of d.layout.ROOMS) {
      const p = new (d.player.position.constructor)(r.spawn[0], r.spawn[1] + 0.1, r.spawn[2]);
      const found = d.rooms.roomAt(p, null);
      if (!found || found.id !== r.id) out.push(`${r.id} -> ${found ? found.id : "none"}`);
    }
    return out;
  });
  check("room lookup at every spawn", bad.length === 0, bad.join(", "));
}

// 2. walk from the bridge through the aft blast door into the command corridor
{
  await ev(() => window.debugAPI.setView("bridge"));
  await settle(2);
  const before = await ev(() => ({ room: window.debugAPI.rooms.current.id, vis: window.debugAPI.rooms.stats().visible }));
  // approach the door (z 206) from z 203; door trigger opens it; simulate a second of door animation
  let r = await ev(() => window.debugAPI.nudge(0, 1.5, 20));
  await ev(() => window.debugAPI.simulate(1.5));
  const doorState = await ev(() => window.debugAPI.doors.snapshot());
  check("bridge blast door opens on approach", doorState.br_corr && doorState.br_corr.o > 0.5, JSON.stringify(doorState.br_corr));
  const vis = await ev(() => window.debugAPI.rooms.stats().visible);
  check("corridor becomes visible through the open door", vis.includes("cmd_corridor"), vis.join("|"));
  r = await ev(() => window.debugAPI.nudge(0, 4.5, 40));
  check("player walks into the corridor", r.room === "cmd_corridor" && r.pos[2] > 206.3, JSON.stringify(r));
  await settle(2);
  await page.screenshot({ path: resolve(outDir, "corridor_after_door.png"), timeout: 120000 });
  // walk into a wall (x = -30 has no door on the corridor's aft wall): must be blocked
  await ev(() => window.debugAPI.nudge(-30, 0, 60));
  const wall = await ev(() => window.debugAPI.nudge(0, 20, 40));
  check("corridor aft wall blocks the player", wall.pos[2] < 212.2 && wall.room === "cmd_corridor", JSON.stringify(wall));
  void before;
}

// 3. floors: player stands on the deck (gravity finds the floor collider)
{
  const y = await ev(() => {
    const d = window.debugAPI;
    d.setView("hangar");
    d.player.position.y += 0.4;
    d.player.frozen = false;
    d.player.locked = true;
    for (let i = 0; i < 90; i++) d.player.update(1 / 60);
    d.player.frozen = true;
    return d.player.position.y;
  });
  check("gravity settles the player on the hangar deck", Math.abs(y - -40) < 0.05, `y=${y.toFixed(3)}`);
}

// 4. turbolift ride: tower lobby -> hangar lobby
{
  await ev(() => window.debugAPI.setView("lift_lobby"));
  await settle(1);
  const res = await ev(async () => {
    const d = window.debugAPI;
    // stand in cab A (x -3, z 223.5) facing the panel
    d.player.position.set(-3, 210, 223.5);
    d.player.frozen = false;
    d.rooms.update(0, 0, d.player.position);
    const cab = d.lifts.cabs.get("lift_lobby_tower:0");
    if (!cab) return { error: "no cab" };
    d.lifts.startRide(cab, "hangar_lobby");
    // run the simulation forward
    for (let i = 0; i < 12 * 60; i++) {
      d.lifts.update(1 / 60, d.player.position);
      d.rooms.step();
      d.rooms.update(1 / 60, 0, d.player.position);
      if (!d.lifts.ride) break;
    }
    return { pos: d.player.position.toArray().map((v) => +v.toFixed(2)), room: d.rooms.current ? d.rooms.current.id : null, ride: !!d.lifts.ride, built: d.rooms.stats().clusters };
  });
  check("turbolift delivers the player to the hangar lobby", res.room === "hangar_lobby" && !res.ride, JSON.stringify(res));
  await settle(2);
  await page.screenshot({ path: resolve(outDir, "after_lift.png"), timeout: 120000 });
}

// 5. transitions: exit to exterior and board again (fast-forwarded through the fade timers)
{
  const modeBefore = await ev(() => window.debugAPI.modes.mode);
  await ev(() => window.debugAPI.exitToExterior());
  await page.waitForFunction(() => window.debugAPI.modes.mode === "exterior" && !window.debugAPI.modes.busy, null, { timeout: 60000 });
  check("exit to exterior view", true, `from ${modeBefore}`);
  await settle(2);
  await page.screenshot({ path: resolve(outDir, "exterior_after_exit.png"), timeout: 120000 });
  await ev(() => window.debugAPI.board());
  await page.waitForFunction(() => window.debugAPI.modes.mode === "interior" && !window.debugAPI.modes.busy, null, { timeout: 240000 });
  const where = await ev(() => ({ room: window.debugAPI.rooms.current.id, pos: window.debugAPI.player.position.toArray().map((v) => +v.toFixed(1)) }));
  check("boarding lands on the bridge", where.room === "bridge", JSON.stringify(where));
  await settle(2);
  await page.screenshot({ path: resolve(outDir, "bridge_after_boarding.png"), timeout: 120000 });
}

// 6. snapshot round-trip
{
  const ok = await ev(() => {
    const d = window.debugAPI;
    const s = d.sync.snapshot();
    d.sync.apply(s);
    return typeof s.t === "number" && s.doors !== undefined;
  });
  check("sync snapshot round-trip", ok);
}

// 7. fighter traffic hooks (if the hangar module registered them)
{
  const t = await ev(() => {
    const tr = window.debugAPI.traffic;
    if (!tr) return null;
    return { launch: typeof tr.requestLaunch, recall: typeof tr.requestRecall, controller: typeof tr.setController, snapshot: typeof tr.snapshot, fighters: tr.fighters ? tr.fighters.length : 0 };
  });
  if (t) check("fighter traffic API present", t.launch === "function" && t.recall === "function" && t.controller === "function", JSON.stringify(t));
  else console.log("SKIP fighter traffic API (not registered yet)");
}

const stats = await ev(() => window.debugAPI.getStats());
console.log("final stats:", JSON.stringify({ calls: stats.calls, tris: stats.triangles, lights: stats.visibleLights, rooms: stats.rooms.built, heapMB: stats.jsHeapMB, boot: stats.boot.totalMs }));
if (errors.length) {
  console.log("PAGE ERRORS:");
  errors.slice(0, 10).forEach((e) => console.log(" ", e));
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
