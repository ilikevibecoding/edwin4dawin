// QA walkthrough: proves navigation (doors, spawns, turbolifts, stairs), camera transitions, fighter
// traffic, asset hygiene and a per-view performance table against a running dev server, with logged
// evidence. Headless Chrome (SwiftShader) like tools/smoke.mjs; everything that can run without
// rendering uses window.debugAPI.simulate() through tools/qa_inpage.js.
//
//   node tools/qa_walk.mjs [baseUrl]            default http://127.0.0.1:5173/
//   QA_SECTIONS=1,2,3,4,5,6,7,8                 subset of sections (default all)
//   QA_FIGHTER_SECONDS=360                      simulated traffic time for section 6
//   QA_OUT=tools/qa_results.json                results file
//   QA_SHOTS=shots/qa_walk                      failure screenshots (only on failures)
//   QA_NO_BUILD=1                               skip `npm run build` in section 7
//
// Exit code 1 when any section has failures.
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "..");
const base = process.argv[2] || "http://127.0.0.1:5173/";
const sections = new Set((process.env.QA_SECTIONS || "1,2,3,4,5,6,7,8").split(",").map((s) => s.trim()));
const FIGHTER_SECONDS = +(process.env.QA_FIGHTER_SECONDS || 360);
const OUT = resolve(root, process.env.QA_OUT || "tools/qa_results.json");
const SHOTS = resolve(root, process.env.QA_SHOTS || "shots/qa_walk");
const MAX_FAIL_SHOTS = 6;
const t00 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t00) / 1000).toFixed(0).padStart(4)}s]`, ...a);
const r1 = (v) => (typeof v === "number" ? +v.toFixed(1) : v);

// ---------------------------------------------------------------------------------------------
// npm run build in the background (section 7); the browser tests run meanwhile
// ---------------------------------------------------------------------------------------------
let buildPromise = null;
if (sections.has("7") && !process.env.QA_NO_BUILD) {
  buildPromise = new Promise((res) => {
    const t0 = Date.now();
    exec("npm run build", { cwd: root, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      const text = `${stdout}\n${stderr}`;
      const lines = text.split("\n");
      const warnings = lines.filter((l) => /warn/i.test(l) && !/^\s*$/.test(l));
      const chunks = lines.filter((l) => /dist\/assets\/.*\.js/.test(l)).map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim());
      res({ ok: !err, exitCode: err ? err.code : 0, seconds: r1((Date.now() - t0) / 1000), warnings: warnings.map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim()), chunks, tail: lines.slice(-12).map((l) => l.replace(/\x1b\[[0-9;]*m/g, "")) });
    });
  });
}

// ---------------------------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------------------------
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const launchEnv = { ...process.env };
delete launchEnv.DISPLAY; // a DISPLAY makes headless Chrome try GLX on the VNC X server and WebGL context creation fails
const browser = await chromium.launch({
  headless: true,
  env: launchEnv,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
let phase = "load";
const consoleLog = []; // { phase, type, text }
page.on("console", (m) => {
  const text = m.text();
  if (text.includes("GL Driver Message")) return;
  if (m.type() === "error" || m.type() === "warning") consoleLog.push({ phase, type: m.type(), text: text.slice(0, 500) });
});
page.on("pageerror", (e) => consoleLog.push({ phase, type: "pageerror", text: (e.message + "\n" + (e.stack || "").split("\n").slice(0, 4).join("\n")).slice(0, 800) }));
const errorsIn = (ph) => consoleLog.filter((l) => l.phase === ph && (l.type === "error" || l.type === "pageerror"));

log(`loading ${base}`);
const tLoad = Date.now();
await page.goto(base, { waitUntil: "commit", timeout: 180000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
const readyS = r1((Date.now() - tLoad) / 1000);
log(`app ready in ${readyS} s`);
const inpage = readFileSync(resolve(here, "qa_inpage.js"), "utf8");
await page.evaluate(inpage);
const rooms = await page.evaluate(() => window.debugAPI.rooms());

async function settle(minFrames = 3, timeout = 300000) {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout });
}
let failShots = 0;
/** Screenshot of a failure pose: camera 2.5 m behind the failure position, looking at it. Rendering is slow here, so only a few. */
async function failShot(label, pos, yawDeg, roomId) {
  if (failShots >= MAX_FAIL_SHOTS) return null;
  failShots++;
  mkdirSync(SHOTS, { recursive: true });
  await page.setViewportSize({ width: 960, height: 540 });
  await page.evaluate(
    ([pos, yaw, roomId]) => {
      const api = window.debugAPI;
      api.teleport(roomId);
      const rad = (yaw * Math.PI) / 180;
      // forward is (-sin yaw, -cos yaw): step back so the failure spot and what blocked it are in view
      api.player.setPose(pos[0] + Math.sin(rad) * 2.5, pos[2] + Math.cos(rad) * 2.5, yaw, -10, pos[1]);
      const c = api.cells.cellAt(api.player.position);
      if (c) api.cells.setCurrent(c.id);
      api.cells.update(api.player.position, 0, 0);
    },
    [pos, yawDeg, roomId],
  );
  await settle(3);
  const file = join(SHOTS, `${label.replace(/[^a-z0-9_]+/gi, "_")}.png`);
  await page.screenshot({ path: file, timeout: 150000 });
  log(`  failure shot -> ${relative(root, file)}`);
  return relative(root, file);
}

const results = { meta: { base, date: new Date().toISOString(), readyS, node: process.version, sections: [...sections] }, sections: {}, failures: [] };
const fail = (section, item, detail) => results.failures.push({ section, item, detail });

// ---------------------------------------------------------------------------------------------
// 1. Doors
// ---------------------------------------------------------------------------------------------
if (sections.has("1")) {
  phase = "doors";
  log("1. doors: crossing every non-lift door both ways");
  const rows = await page.evaluate(() => window.__qa.runDoors());
  const passed = rows.filter((r) => r.pass).length;
  console.log(`  door (type w)                          there: open@cross cells                      back: open@cross   result`);
  for (const r of rows) {
    const t = r.there;
    const b = r.back;
    console.log(`  ${(r.door + ` (${r.type} ${r.w})`).padEnd(40)} ${String(t.maxOpen).padStart(4)}@${String(t.openAtCross).padEnd(4)} ${t.cells.join(">").padEnd(28)} ${String(b.maxOpen).padStart(4)}@${String(b.openAtCross).padEnd(4)}  ${r.pass ? "PASS" : "FAIL"}${r.pass ? "" : ` there:${t.reachedTo ? "ok" : t.stuck ? "stuck" : "timeout"}/${t.insideTo ? "inB" : "notInB"} back:${b.reachedTo ? "ok" : b.stuck ? "stuck" : "timeout"}/${b.insideTo ? "inA" : "notInA"} end=${JSON.stringify(t.end)}`}`);
  }
  for (const r of rows) {
    if (r.pass) continue;
    const leg = r.there.pass ? r.back : r.there;
    fail("doors", r.door, leg);
    leg.shot = await failShot(`door_${r.door}_${r.there.pass ? "back" : "there"}`, leg.end, leg.yawDeg, leg.from);
  }
  results.sections.doors = { passed, total: rows.length, rows, pageErrors: errorsIn("doors") };
  log(`  doors: ${passed}/${rows.length} passed, page errors ${errorsIn("doors").length}`);
}

// ---------------------------------------------------------------------------------------------
// 2. Spawns
// ---------------------------------------------------------------------------------------------
if (sections.has("2")) {
  phase = "spawns";
  log("2. spawns: 2 s forward / back / left / right from every spawn");
  const rows = await page.evaluate(() => window.__qa.runSpawns());
  const passed = rows.filter((r) => r.pass).length;
  console.log(`  room                 fwd   back  left  right  maxOut  minY-floor  result`);
  for (const r of rows) {
    console.log(`  ${r.room.padEnd(20)} ${String(r.legs.fwd.moved).padStart(5)} ${String(r.legs.back.moved).padStart(5)} ${String(r.legs.left.moved).padStart(5)} ${String(r.legs.right.moved).padStart(5)}  ${String(r.maxOutside).padStart(6)}  ${String(r1(r.minY - r.floorY)).padStart(10)}  ${r.pass ? "PASS" : "FAIL"}${r.stuckAtSpawn ? " stuck-at-spawn" : ""}${r.leftBounds ? ` left-bounds@${r.leftBounds.leg}->${r.leftBounds.cell}` : ""}${r.belowFloor ? " below-floor" : ""}${r.aboveCeil ? " above-ceiling" : ""}`);
    if (!r.pass) fail("spawns", r.room, r);
  }
  results.sections.spawns = { passed, total: rows.length, rows, pageErrors: errorsIn("spawns") };
  log(`  spawns: ${passed}/${rows.length} passed`);
}

// ---------------------------------------------------------------------------------------------
// 3. Turbolifts
// ---------------------------------------------------------------------------------------------
if (sections.has("3")) {
  phase = "lifts";
  log("3. turbolifts: every lobby x shaft x destination deck");
  const printLifts = (rows) => {
    console.log(`  lobby    shaft  to  walk-in(door)   selected  arrived(cell, y)              exitDoor(arrival/max)  exited  result`);
    for (const r of rows) {
      console.log(`  ${r.lobby.padEnd(8)} ${r.shaft.padEnd(6)} ${r.to}   ${String(r.entered).padEnd(5)}(${String(r.entryDoorMaxOpen).padEnd(4)})     ${String(r.selected).padEnd(8)}  ${String(r.arrived).padEnd(5)} ${(r.cellAfter + ", " + r.posAfter[1]).padEnd(22)} ${String(r.exitDoorOpenAtArrival).padEnd(5)}/${String(r.exitDoorMaxOpen).padEnd(5)}       ${String(r.exited).padEnd(5)}   ${r.pass ? "PASS" : "FAIL"}${r.enteredBy === "teleport" ? " (walk-in blocked; ride tested after teleport into the car)" : ""}`);
    }
  };
  const matrixOf = (rows) => {
    const matrix = {};
    for (const r of rows) {
      matrix[`${r.from}/${r.shaft}`] = matrix[`${r.from}/${r.shaft}`] || {};
      matrix[`${r.from}/${r.shaft}`][r.to] = r.pass ? "ok" : `${r.entered ? "in" : "NO-ENTRY"}/${r.selected ? "sel" : "NO-SELECT"}/${r.arrived ? "arrived" : "NO-ARRIVAL"}/${r.exited ? "out" : "NO-EXIT"}`;
    }
    return matrix;
  };
  const rows = await page.evaluate(() => window.__qa.runLifts());
  const passed = rows.filter((r) => r.pass).length;
  printLifts(rows);
  for (const r of rows) if (!r.pass) fail("lifts", `${r.lobby}/${r.shaft}->${r.to}`, { entered: r.entered, walkInBlockers: r.walkInBlockers, selected: r.selected, arrived: r.arrived, cellAfter: r.cellAfter, posAfter: r.posAfter, exited: r.exited, exitBlockers: r.exitBlockers, posExit: r.posExit });
  const rides = rows.filter((r) => r.ridePass).length;
  log(`  lifts as-is: ${passed}/${rows.length} passed end-to-end; walk-in ok ${rows.filter((r) => r.entered).length}, ride+arrival ok ${rides}, walk-out ok ${rows.filter((r) => r.exited).length}`);
  const blockedIn = rows.filter((r) => !r.entered);
  const blockTags = [...new Set(blockedIn.flatMap((r) => (r.walkInBlockers || []).map((b) => b.tag)))];
  if (blockedIn.length) console.log(`  walk-in blocked by collider tags: ${blockTags.join(", ") || "(none found)"}; example: ${JSON.stringify((blockedIn[0].walkInBlockers || [])[0])}`);
  const doorNeverOpened = rows.filter((r) => r.arrived && r.exitDoorMaxOpen < 0.5);
  if (doorNeverOpened.length) console.log(`  arrival door never opened (max openness < 0.5 during 4 s after arrival) in ${doorNeverOpened.length}/${rows.filter((r) => r.arrived).length} arrivals`);
  let workaround = null;
  if (blockedIn.length || doorNeverOpened.length) {
    // in-memory workarounds standing in for the suggested fixes, to prove the rest of the lift path
    log(`  re-running with colliders tagged [${blockTags.join(", ")}] disabled${doorNeverOpened.length ? " and the arrival door held open" : ""} (test-only runtime patches = the suggested fixes)`);
    const rows2 = await page.evaluate(([tags, patch]) => window.__qa.runLifts({ disableTags: tags, patchArrivalDoor: patch }), [blockTags, doorNeverOpened.length > 0]);
    printLifts(rows2);
    workaround = { disabledTags: blockTags, arrivalDoorPatched: doorNeverOpened.length > 0, passed: rows2.filter((r) => r.pass).length, total: rows2.length, matrix: matrixOf(rows2), rows: rows2 };
    log(`  lifts with workarounds: ${workaround.passed}/${workaround.total} passed end-to-end`);
    for (const r of rows2) if (!r.pass) console.log(`    still failing: ${r.lobby}/${r.shaft}->${r.to}: entered=${r.entered} arrived=${r.arrived} cell=${r.cellAfter} pos=${JSON.stringify(r.posAfter)} exited=${r.exited} exitBlockers=${JSON.stringify((r.exitBlockers || []).slice(0, 2))}`);
  }
  results.sections.lifts = { passed, total: rows.length, walkInOk: rows.filter((r) => r.entered).length, rideOk: rides, walkOutOk: rows.filter((r) => r.exited).length, blockedByTags: blockTags, matrix: matrixOf(rows), rows, workaround, pageErrors: errorsIn("lifts") };
  const firstFail = rows.find((r) => !r.pass);
  if (firstFail) firstFail.shot = await failShot(`lift_${firstFail.lobby}_${firstFail.shaft}_to_${firstFail.to}_walk_in`, firstFail.posAfterWalkIn, 180, firstFail.lobby);
}

// ---------------------------------------------------------------------------------------------
// 4. Stairs / raised floors
// ---------------------------------------------------------------------------------------------
if (sections.has("4")) {
  phase = "stairs";
  log("4. stairs / raised floors: scripted waypoint walks");
  const rows = await page.evaluate(() => window.__qa.runStairs());
  const passed = rows.filter((r) => r.pass).length;
  for (const r of rows) {
    console.log(`  ${r.pass ? "PASS" : "FAIL"} ${r.name}`);
    if (r.steps.length) console.log(`       y: ` + r.steps.map((s) => `${s.y}${s.yExpected !== null && s.yExpected !== undefined ? `/${s.yExpected}` : ""}${s.reached ? "" : `(${s.reason}@${JSON.stringify(s.pos)})`}`).join(" -> ") + (r.expectCell ? `  cell=${r.finalCell}` : ""));
    else console.log(`       end=${JSON.stringify(r.end)} minY=${r.minY} moved=${r.moved} expect=${JSON.stringify(r.expect)}`);
    const stuckStep = r.steps.find((s) => s.blockers && s.blockers.length);
    if (!r.pass && stuckStep) console.log(`       blocked by: ${JSON.stringify(stuckStep.blockers.slice(0, 3))}`);
    if (!r.pass) fail("stairs", r.name, r);
  }
  results.sections.stairs = { passed, total: rows.length, rows, pageErrors: errorsIn("stairs") };
  log(`  stairs: ${passed}/${rows.length} passed`);
  for (const r of rows) {
    if (r.pass) continue;
    const bad = r.steps.find((s) => !s.reached || s.yOk === false);
    if (bad) r.shot = await failShot(`stairs_${r.room}_${r.name.slice(0, 30)}`, bad.pos, 0, r.room);
  }
}

// ---------------------------------------------------------------------------------------------
// 6. Fighters (before the rendering-heavy sections: pure simulation)
// ---------------------------------------------------------------------------------------------
if (sections.has("6")) {
  phase = "fighters";
  log(`6. fighters: ${FIGHTER_SECONDS} s of traffic.update() without rendering`);
  let r = await page.evaluate((s) => window.__qa.runFighters(s), FIGHTER_SECONDS);
  let extended = null;
  if (!r.error && r.completeCycles < 3) {
    // the patrol loop is ~20 km: report honestly how long it took to see three full cycles
    log(`  only ${r.completeCycles} launch->dock cycles in ${FIGHTER_SECONDS} s; extending by 300 s`);
    const more = await page.evaluate((s) => window.__qa.runFighters(s), 300);
    extended = more;
  }
  const ok = !r.error && r.hullViolations === 0 && !r.nan && r.stateRoundTrip && (r.completeCycles >= 3 || (extended && extended.completeCycles + r.completeCycles >= 3));
  console.log(`  steps ${r.steps} in ${r.simMs} ms (${r.usPerStep} us/step); transitions ${JSON.stringify(r.phaseTransitions)}`);
  console.log(`  complete launch->dock cycles: ${r.completeCycles} ${JSON.stringify(r.cycles)}; dock events ${r.dockEvents}; max airborne ${r.maxAirborne}`);
  console.log(`  hull violations ${r.hullViolations} (mouth-well samples ${r.mouthWellSamples}); NaN ${r.nan}; getState/setState round trip ${r.stateRoundTrip} (${r.stateBytes} bytes)`);
  if (r.hullViolationSamples.length) console.log("  samples:", JSON.stringify(r.hullViolationSamples.slice(0, 6)));
  if (extended) console.log(`  extension: +${extended.seconds} s -> ${extended.completeCycles} more cycles ${JSON.stringify(extended.cycles)}, violations ${extended.hullViolations}`);
  if (!ok) fail("fighters", "traffic", { violations: r.hullViolations, samples: r.hullViolationSamples, nan: r.nan, stateRoundTrip: r.stateRoundTrip, cycles: r.completeCycles });
  results.sections.fighters = { pass: ok, ...r, extended, pageErrors: errorsIn("fighters") };
}

// ---------------------------------------------------------------------------------------------
// 5. Camera transitions (rendered frames drive rig.update; small viewport keeps software GL bearable)
// ---------------------------------------------------------------------------------------------
if (sections.has("5")) {
  phase = "transitions";
  log("5. camera transitions: toExterior() / toInterior() from bridge, hangar, corridor_c");
  await page.setViewportSize({ width: 480, height: 270 });
  const rows = [];
  for (const room of ["bridge", "hangar", "corridor_c"]) {
    const errBefore = consoleLog.length;
    const t0 = Date.now();
    const r = await page.evaluate(async (room) => {
      const api = window.debugAPI;
      api.teleport(room);
      api.simulate(0.2, []);
      const p0 = api.player.position.toArray();
      const yaw0 = api.player.yaw;
      const cell0 = api.cells.current.id;
      const f0 = api.frames();
      const t0 = performance.now();
      await api.toExterior();
      const tOut = performance.now() - t0;
      const out = api.cameraState();
      const f1 = api.frames();
      const t1 = performance.now();
      await api.toInterior();
      const tIn = performance.now() - t1;
      const back = api.cameraState();
      const p1 = api.player.position.toArray();
      return { room, portal: !!api.rig.portalFor(room), p0: p0.map((v) => +v.toFixed(3)), p1: p1.map((v) => +v.toFixed(3)), moved: +Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).toFixed(4), yawSame: yaw0 === api.player.yaw, cellSame: api.cells.current.id === cell0, out, back, framesOut: f1 - f0, framesIn: api.frames() - f1, tOutS: +(tOut / 1000).toFixed(1), tInS: +(tIn / 1000).toFixed(1), fade: api.fadeOpacity(), eyeAtPlayer: (() => { const e = api.rig.camera.position; return +Math.hypot(e.x - p1[0], e.y - (p1[1] + 1.7), e.z - p1[2]).toFixed(3); })() };
    }, room);
    r.pageErrors = consoleLog.slice(errBefore).filter((l) => l.type !== "warning");
    r.wallS = r1((Date.now() - t0) / 1000);
    r.pass = r.out.mode === "orbit" && r.back.mode === "interior" && r.moved < 1e-3 && r.cellSame && r.pageErrors.length === 0 && r.fade < 0.01 && r.eyeAtPlayer < 0.05;
    console.log(`  ${r.pass ? "PASS" : "FAIL"} ${room.padEnd(11)} portal=${r.portal} out=${r.out.mode}@${JSON.stringify(r.out.pos)} (${r.framesOut} frames, ${r.tOutS} s) back=${r.back.mode} near=${r.back.near} fov=${r.back.fov} moved=${r.moved} eye-dist=${r.eyeAtPlayer} fade=${r.fade} errors=${r.pageErrors.length}`);
    if (!r.pass) fail("transitions", room, r);
    rows.push(r);
  }
  results.sections.transitions = { passed: rows.filter((r) => r.pass).length, total: rows.length, rows };
}

// ---------------------------------------------------------------------------------------------
// 8. Performance table (one settled frame per view at 1280x720)
// ---------------------------------------------------------------------------------------------
if (sections.has("8")) {
  phase = "perf";
  log("8. performance table (software GL: frame times are relative only)");
  await page.setViewportSize({ width: 1280, height: 720 });
  const views = ["room:bridge", "room:hangar", "room:reactor", "room:corridor_c", "room:medbay", "cockpit", "ext_hero", "ext_tower", "ext_belly"];
  const rows = [];
  for (const v of views) {
    await page.evaluate((v) => window.debugAPI.setView(v), v);
    await settle(3);
    const s = await page.evaluate(() => window.debugAPI.getStats());
    const row = { view: v, calls: s.calls, triangles: s.triangles, poolLights: s.poolLights, visibleCells: s.visibleCells, textureMB: s.textureMB, programs: s.programs, jsMs: s.jsMs, frameMs: s.frameMs, geometries: s.geometries, textures: s.textures, mode: s.mode, current: s.current, exteriorTriangles: s.exteriorTriangles, jsHeapMB: s.jsHeapMB };
    rows.push(row);
    console.log(`  ${v.padEnd(16)} calls ${String(s.calls).padStart(4)}  tris ${(s.triangles / 1000).toFixed(0).padStart(5)}k  lights ${String(s.poolLights).padStart(2)}  cells ${String(s.visibleCells).padStart(2)}  tex ${String(s.textureMB).padStart(6)} MB  programs ${String(s.programs).padStart(3)}  js ${String(s.jsMs).padStart(6)} ms  frame ${String(s.frameMs).padStart(7)} ms (sw)  ${s.mode}/${s.current}`);
  }
  // textureMB is estimated in perf.js by iterating renderer.properties.properties, which three r185 does not expose
  const texNote = await page.evaluate(() => ({ propertiesField: typeof window.debugAPI.renderer.properties.properties, uploadedTextures: window.debugAPI.renderer.info.memory.textures }));
  if (rows.every((r) => r.textureMB === 0) && texNote.propertiesField === "undefined") console.log(`  note: textureMB is 0 in every view although ${texNote.uploadedTextures} textures are uploaded: perf.textureBytes() reads renderer.properties.properties, which is undefined in three r185 (WebGLProperties keeps a private WeakMap)`);
  results.sections.perf = { rows, textureMBNote: texNote, pageErrors: errorsIn("perf") };
}

// ---------------------------------------------------------------------------------------------
// 7. Hygiene: build warnings, builders, console, material keys
// ---------------------------------------------------------------------------------------------
if (sections.has("7")) {
  phase = "hygiene";
  log("7. hygiene: build log, console, material keys, npm run build");
  const buildLog = await page.evaluate(() => window.debugAPI.buildLog());
  const roomEntries = buildLog.filter((e) => e.room);
  const badBuilders = roomEntries.filter((e) => e.error || !e.builder || /generic|placeholder/i.test(e.builder));
  const kindDefaults = roomEntries.filter((e) => /^build(Corridor|Lobby|Lift)$/.test(e.builder || ""));
  const total = buildLog.find((e) => e.total)?.total;
  const loadErrors = consoleLog.filter((l) => l.phase === "load" && l.type !== "warning");
  const loadWarnings = consoleLog.filter((l) => l.phase === "load" && l.type === "warning");
  console.log(`  rooms built: ${roomEntries.length}, dedicated builders: ${roomEntries.length - kindDefaults.length}, kind defaults (corridor/lobby/lift): ${kindDefaults.length}, generic/placeholder/errors: ${badBuilders.length}, build total ${total} ms`);
  console.log(`  console on load: ${loadErrors.length} errors, ${loadWarnings.length} warnings${loadWarnings.length ? " " + JSON.stringify(loadWarnings.slice(0, 5)) : ""}`);
  if (badBuilders.length) fail("hygiene", "builders", badBuilders);
  if (loadErrors.length) fail("hygiene", "console-load", loadErrors);

  // spec geometry: room volumes that intersect, and foreign colliders inside lift cars
  const geo = await page.evaluate(() => window.__qa.roomOverlaps());
  console.log(`  room volume overlaps: ${geo.overlaps.length} ${JSON.stringify(geo.overlaps.map((o) => `${o.a}~${o.b} ${o.overlap.join("x")}`))}`);
  console.log(`  colliders of other rooms inside lift cars: ${geo.intrusions.length}${geo.intrusions.length ? " " + JSON.stringify(geo.intrusions.slice(0, 6)) : ""}`);
  const liftOverlaps = geo.overlaps.filter((o) => o.liftCar);
  if (liftOverlaps.length || geo.intrusions.length) fail("hygiene", "room-overlaps", { liftOverlaps, intrusions: geo.intrusions });

  // material keys: every string literal passed as a material key in src vs the runtime library
  const runtimeKeys = new Set(await page.evaluate(() => window.__qa.materialKeys()));
  const files = [];
  (function walk(dir) {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".js")) files.push(p);
    }
  })(resolve(root, "src"));
  const refs = new Map(); // key -> [file:line]
  const patterns = [
    /\b(?:kit|lk|k|K|nf|f|fe|wf|W|E|N|S|B|Wf|Ef|Nf|Sf|frame|fr|ff)\.(?:add|box|boxMM|cyl|cylV|cylH|screen|plane|tube|strip)\(\s*"([A-Za-z0-9_]+)"/g,
    /\binstance\(\s*"[^"]+"\s*,\s*"([A-Za-z0-9_]+)"/g,
    /\binst\(\s*kit\s*,\s*"[^"]+"\s*,\s*"([A-Za-z0-9_]+)"/g,
    /\bmaterials\.([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*=)/g,
    /\bmaterials\[\s*"([A-Za-z0-9_]+)"\s*\]/g,
    // named material options (bare `key` is left out: it is the instance-pool / greeble shape key)
    /\b(?:accentKey|railKey|mat|material|lamp|light|treadMat|lampKey|screenKey)\s*[:=]\s*"([A-Za-z0-9_]+)"/g,
  ];
  const NOT_KEYS = new Set(["exteriorKeys", "setExteriorEnv", "impScreens", "screens", "length", "keys", "world", "keep", "scale", "point", "spot", "x", "y", "z", "E", "KeyE", "interior", "exterior", "js"]);
  // the Kestrel (src/ship.js) builds its own map: mats["screen" + i] = materials.screens[i]
  const LOCAL_KEYS = [{ file: /src\/ship\.js$/, re: /^screen\d?$/ }];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      for (const re of patterns) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) {
          const key = m[1];
          if (NOT_KEYS.has(key) || /^Key[A-Z]/.test(key)) continue;
          if (LOCAL_KEYS.some((l) => l.file.test(file) && l.re.test(key))) continue;
          if (!refs.has(key)) refs.set(key, []);
          if (refs.get(key).length < 4) refs.get(key).push(`${relative(root, file)}:${i + 1}`);
        }
      }
    });
  }
  const missing = [...refs.entries()].filter(([k]) => !runtimeKeys.has(k)).map(([k, where]) => ({ key: k, where }));
  // material-looking names only (drop obvious false positives: lowercase words that are not keys)
  const suspicious = missing.filter(({ key }) => /^(imp|emit|scr|hull|ext|deck|hangar|bridge|roomsd|exta|chevron|holo|glow|field|view|decal|painted|metal|grate|glass|rubber|fabric|hazard|leds|city|engine|hex)/i.test(key));
  const registered = [...runtimeKeys].filter((k) => !/^(painted|metal|paintedMetal|grate|deck|rubber|fabric|hazard|emit|darkGloss|glass|decal|imp|hexPanel|chevron|holo|viewGlass|field|glowDisc|hull|cityLights|engine|ext|scr|leds|metalRough)/.test(k));
  const allowedPrefixes = /^(deckA_|deckB_|deckC_|deckD_|hangar_|bridge_|lobby_|exta_|extb_|roomsd_|kestrel_|fighters_|tie_)/;
  const oddPrefix = registered.filter((k) => !allowedPrefixes.test(k));
  console.log(`  material keys: ${runtimeKeys.size} at runtime, ${refs.size} distinct keys referenced in src, ${missing.length} referenced-but-missing (${suspicious.length} material-like), ${registered.length} room/exterior-registered (${oddPrefix.length} with an unexpected prefix)`);
  if (suspicious.length) console.log("  suspicious:", JSON.stringify(suspicious));
  if (oddPrefix.length) console.log("  unexpected-prefix keys:", oddPrefix.join(", "));
  if (suspicious.length) fail("hygiene", "material-keys", suspicious);

  let build = null;
  if (buildPromise) {
    log("  waiting for npm run build…");
    build = await buildPromise;
    console.log(`  npm run build: exit ${build.exitCode} in ${build.seconds} s, ${build.warnings.length} warning lines`);
    for (const w of build.warnings.slice(0, 12)) console.log("    " + w.slice(0, 220));
    for (const c of build.chunks) console.log("    " + c);
    if (!build.ok) fail("hygiene", "build", build.tail);
  }
  results.sections.hygiene = { buildLog: { total, rooms: roomEntries.length, kindDefaults: kindDefaults.map((e) => e.room), badBuilders, builders: Object.fromEntries(roomEntries.map((e) => [e.room, e.builder || e.error])) }, consoleOnLoad: { errors: loadErrors, warnings: loadWarnings }, consoleAll: consoleLog, geometry: geo, materials: { runtimeKeyCount: runtimeKeys.size, referencedKeyCount: refs.size, missing, suspicious, registered, oddPrefix }, build };
}

// ---------------------------------------------------------------------------------------------
// 9. Extensibility inventory (runtime shape of the hooks; the review itself is in the report)
// ---------------------------------------------------------------------------------------------
try {
  results.sections.extensibility = await page.evaluate(() => {
    const api = window.debugAPI;
    const tr = api.traffic;
    const net = api.netState();
    return {
      cellApis: window.__qa.cellApis(),
      bridgeCrewSpots: api.cells.cells.get("bridge")?.api?.crewSpots?.length ?? null,
      bridgeCrewSpotSample: api.cells.cells.get("bridge")?.api?.crewSpots?.slice(0, 3) ?? null,
      trafficApi: tr ? Object.keys(tr) : null,
      trafficHooks: tr ? Object.keys(tr.hooks) : null,
      trafficConstants: tr ? Object.keys(tr.constants) : null,
      flight: { state: api.flight.state, modes: api.flight.modes, methods: Object.keys(api.flight) },
      landing: { supports: api.landing.supports.length, ports: api.landing.ports.map((p) => p.id), zones: api.landing.zones.length, state: api.landing.state, methods: Object.keys(api.landing) },
      netStateKeys: net ? Object.keys(net) : null,
      netDoorSample: net ? net.doors.slice(0, 2) : null,
      netLift: net ? net.lift : null,
      netTrafficBytes: net && net.traffic ? JSON.stringify(net.traffic).length : null,
      doorStateSample: api.doorStates().slice(0, 2),
      liftState: api.liftState(),
    };
  });
} catch (e) {
  results.sections.extensibility = { error: String(e) };
}

// ---------------------------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------------------------
results.summary = {};
for (const [name, s] of Object.entries(results.sections)) {
  if (s && typeof s.passed === "number") results.summary[name] = `${s.passed}/${s.total}`;
  else if (s && typeof s.pass === "boolean") results.summary[name] = s.pass ? "pass" : "fail";
}
results.summary.failures = results.failures.length;
results.summary.pageErrorsTotal = consoleLog.filter((l) => l.type !== "warning").length;
results.summary.wallSeconds = r1((Date.now() - t00) / 1000);
mkdirSync(resolve(OUT, ".."), { recursive: true });
writeFileSync(OUT, JSON.stringify(results, null, 2));
log(`summary ${JSON.stringify(results.summary)}`);
log(`results -> ${relative(root, OUT)}`);
await browser.close();
process.exit(results.failures.length ? 1 : 0);
