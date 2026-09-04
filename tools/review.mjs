// Full visual + technical review run. Usage: node tools/review.mjs <label> [baseUrl]
// Captures every exterior preset, extra exterior poses at close/medium/far range and every registered
// interior view; then runs navigation tests (walks through every door, rides a turbolift, boards and
// leaves the ship) and writes shots/review_<label>/results.json with per-view render stats.
// Software GL here: frame times are not GPU-representative; calls / triangles / programs / heap are.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const label = process.argv[2] || "0";
const base = process.argv[3] || "http://127.0.0.1:5173/";
const outDir = resolve("shots", `review_${label}`);
mkdirSync(outDir, { recursive: true });
const only = process.env.REVIEW_ONLY ? new Set(process.env.REVIEW_ONLY.split(",")) : null; // views|exterior|nav
const want = (k) => !only || only.has(k);

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => {
  const text = `[${m.type()}] ${m.text()}`;
  if (text.includes("GPU stall")) return;
  logs.push(text);
  if (m.type() === "error" || m.type() === "warning") console.log(text.slice(0, 300));
});
page.on("pageerror", (e) => {
  logs.push(`[pageerror] ${e.message}`);
  console.log("PAGE ERROR:", e.message);
});
const t0 = Date.now();
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });
const readyMs = Date.now() - t0;
const settle = async (n = 3, ms = 900) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 180000 });
  await page.waitForTimeout(ms);
};
await settle(4, 1000);
const stats = () => page.evaluate(() => window.debugAPI.getStats());
const results = { label, readyMs, warmup: await stats(), exterior: {}, views: {}, nav: {}, logs: [] };
console.log(`ready ${readyMs} ms; build ${JSON.stringify(results.warmup.buildMs)}; programs ${results.warmup.programs}; heap ${results.warmup.heapMB} MB`);

// --- exterior -------------------------------------------------------------------------------
if (want("exterior")) {
  const presets = await page.evaluate(() => window.debugAPI.exteriorViews);
  for (const name of presets) {
    await page.evaluate((n) => window.debugAPI.setExteriorView(n), name);
    await settle(3);
    await page.screenshot({ path: resolve(outDir, `ext_${name}.png`) });
    const s = await stats();
    results.exterior[name] = s;
    console.log(`ext ${name}: ${s.calls} calls ${(s.triangles / 1000).toFixed(0)}k tris`);
  }
  const poses = {
    close_turbolaser: [-150, 95, 470, -120, 84, 450],
    close_bridge_front: [40, 215, 540, 0, 200, 600],
    close_trench: [-470, 10, 420, -440, 0, 500],
    close_hangar_below: [0, -160, 200, 0, -40, 220],
    medium_stern: [200, 80, 1200, 0, 10, 800],
    medium_bow_low: [-300, -120, -1300, 0, 0, -600],
    far_oblique: [-1500, 700, -2600, 0, 40, 0],
    far_belly: [900, -1100, 1400, 0, -40, 200],
  };
  for (const [name, p] of Object.entries(poses)) {
    await page.evaluate((a) => window.debugAPI.setExteriorPose(a.slice(0, 3), a.slice(3, 6)), p);
    await settle(3);
    await page.screenshot({ path: resolve(outDir, `ext_${name}.png`) });
    const s = await stats();
    results.exterior[name] = s;
    console.log(`ext ${name}: ${s.calls} calls ${(s.triangles / 1000).toFixed(0)}k tris`);
  }
}

// --- interior views ---------------------------------------------------------------------------
if (want("views")) {
  const views = await page.evaluate(() => window.debugAPI.views);
  for (const name of views) {
    try {
      await page.evaluate((n) => window.debugAPI.setView(n), name);
    } catch (e) {
      results.views[name] = { error: e.message };
      continue;
    }
    await settle(3);
    await page.screenshot({ path: resolve(outDir, `int_${name}.png`) });
    const s = await stats();
    results.views[name] = s;
    console.log(`int ${name}: room=${s.room} rooms=${s.visibleRooms} ${s.calls} calls ${(s.triangles / 1000).toFixed(0)}k tris lights=${s.lightDescs}`);
  }
}

// --- navigation tests -------------------------------------------------------------------------
if (want("nav")) {
  const layout = await page.evaluate(() => ({ ROOMS: window.debugAPI.layout.ROOMS, doors: window.debugAPI.doors() }));
  const DOORS = await page.evaluate(() => window.debugAPI.zone.doors.map((d) => ({ id: d.id, a: d.spec.a, b: d.spec.b, axis: d.spec.axis, at: d.spec.at, c: d.spec.c, style: d.style, locked: d.locked })));
  const center = (id) => {
    const r = layout.ROOMS[id];
    return [(r.box[0] + r.box[2]) / 2, (r.box[1] + r.box[3]) / 2];
  };
  results.nav.doors = {};
  let pass = 0;
  for (const d of DOORS) {
    if (d.a === d.b) continue; // lift cab doors
    const ca = center(d.a);
    // which side of the plane is room a?
    const side = d.axis === "z" ? Math.sign(ca[1] - d.at) : Math.sign(ca[0] - d.at);
    const back = 2.6;
    const start = d.axis === "z" ? [d.c, d.at + side * back] : [d.at + side * back, d.c];
    // face the door: forward -z is yaw 0; +z is 180; -x is 90; +x is -90
    const yaw = d.axis === "z" ? (side > 0 ? 0 : 180) : side > 0 ? 90 : -90;
    await page.evaluate((a) => window.debugAPI.setPose(a.x, a.z, a.yaw, 0), { x: start[0], z: start[1], yaw });
    await settle(2, 200);
    if (d.locked) await page.evaluate((id) => window.debugAPI.openDoor(id), d.id);
    const secs = d.style === "blast" ? 7 : 4.5;
    const end = await page.evaluate(([s]) => window.debugAPI.walk(["KeyW"], s), [secs]);
    await page.waitForTimeout(secs * 1000 + 300);
    await page.evaluate(() => (window.debugAPI.player.frozen = true));
    const room = await page.evaluate(() => window.debugAPI.currentRoom());
    const ok = room === d.b || (room !== d.a && room !== null);
    if (ok) pass++;
    results.nav.doors[d.id] = { from: d.a, to: d.b, endedIn: room, ok, end: end && [+end.x.toFixed(1), +end.y.toFixed(1), +end.z.toFixed(1)] };
    console.log(`door ${d.id}: ${d.a} -> ${d.b} ended in ${room} ${ok ? "OK" : "FAIL"}`);
    if (!ok) await page.screenshot({ path: resolve(outDir, `nav_fail_${d.id}.png`) });
  }
  results.nav.doorsPassed = `${pass}/${Object.keys(results.nav.doors).length}`;
  console.log("doors passed", results.nav.doorsPassed);

  // turbolift: tower lobby -> hangar
  {
    await page.evaluate(() => window.debugAPI.setView("lift_lift_T1"));
    await settle(2, 200);
    await page.evaluate(() => window.debugAPI.walk(["KeyW"], 3));
    await page.waitForTimeout(3400);
    const inCab = await page.evaluate(() => ({ x: window.debugAPI.player.position.x, z: window.debugAPI.player.position.z }));
    const started = await page.evaluate(() => window.debugAPI.ride("liftLobbyT", "hangar"));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: resolve(outDir, `nav_lift_sealing.png`) });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: resolve(outDir, `nav_lift_moving.png`) });
    let room = null;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500);
      room = await page.evaluate(() => window.debugAPI.currentRoom());
      const riding = await page.evaluate(() => !!window.debugAPI.lifts.riding);
      if (!riding && room) break;
    }
    await settle(2, 500);
    await page.screenshot({ path: resolve(outDir, `nav_lift_arrived.png`) });
    results.nav.lift = { started, inCab, arrivedRoom: room, ok: room === "liftLobbyH" };
    console.log(`lift ride tower->hangar: started=${started} arrived in ${room} ${results.nav.lift.ok ? "OK" : "FAIL"}`);
  }
  // board / leave transitions
  {
    await page.evaluate(() => window.debugAPI.setExteriorView("bridge"));
    await settle(2, 300);
    const boardP = page.evaluate(() => window.debugAPI.board("tower"));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: resolve(outDir, `nav_board_flyin.png`) });
    await boardP;
    await settle(3, 600);
    await page.screenshot({ path: resolve(outDir, `nav_board_arrived.png`) });
    const afterBoard = await stats();
    const leaveP = page.evaluate(() => window.debugAPI.leave());
    await leaveP;
    await settle(3, 600);
    await page.screenshot({ path: resolve(outDir, `nav_leave_exterior.png`) });
    const afterLeave = await stats();
    results.nav.transitions = { boardMode: afterBoard.mode, boardRoom: afterBoard.room, leaveMode: afterLeave.mode, ok: afterBoard.mode === "interior" && afterLeave.mode === "exterior" };
    console.log(`board -> ${afterBoard.mode}/${afterBoard.room}; leave -> ${afterLeave.mode} ${results.nav.transitions.ok ? "OK" : "FAIL"}`);
  }
}

// --- summary ---------------------------------------------------------------------------------
const all = [...Object.values(results.exterior), ...Object.values(results.views)].filter((s) => s && s.calls !== undefined);
results.summary = {
  views: all.length,
  maxCalls: Math.max(0, ...all.map((s) => s.calls)),
  maxTriangles: Math.max(0, ...all.map((s) => s.triangles)),
  programs: (await stats()).programs,
  heapMB: (await stats()).heapMB,
  errors: logs.filter((l) => l.startsWith("[pageerror]") || l.startsWith("[error]")).length,
};
results.logs = logs.filter((l) => !l.startsWith("[log]")).slice(0, 80);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log("summary", JSON.stringify(results.summary), "->", outDir);
await browser.close();
