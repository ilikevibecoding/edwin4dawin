// Fighter traffic regression test (headless). Drives the shared scheduler with debugAPI.simulate(dt) and checks:
//   - the traffic API contract (records, events, snapshot/apply round-trip, controller override, recall)
//   - a full launch → field_pass → depart → return → field_pass → dock cycle completes for one fighter
//   - every sampled in-flight position stays ≥ 40 m from the hull: checked in-page with the fighters' own
//     clearance function AND independently here in Node with the layout hull functions (insideHull, halfWidth,
//     topY, ventralY), plus a slab margin test for points over / under the wedge
//   - the steady state keeps ≤ maxAirborne fighters out and never exceeds the mesh pool
//   - update() is cheap (no per-frame allocations: heap growth over 3000 steps stays small)
// Usage: node tools/traffic_test.mjs [url]   (exit code 0 = all checks passed)
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { insideHull, halfWidth, topY, ventralY, HULL, TOWER } from "../src/core/layout.js";

const url = process.argv[2] || "http://127.0.0.1:5173/";
const MIN_CLEARANCE = 40;
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
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

// exterior mode: the fighters must run (and be visible) without the hangar room being current
await ev(() => window.debugAPI.setView("ext_belly"));

// 1. API contract + event plumbing
{
  const api = await ev(() => {
    const tr = window.debugAPI.traffic;
    window.__ev = [];
    for (const e of ["launch", "field_pass", "depart", "return", "recall", "dock"]) tr.on(e, (d) => window.__ev.push({ e, id: d.id, t: +d.clock.toFixed(2), y: +d.position.y.toFixed(1), dir: d.direction || "" }));
    const f = tr.fighters[0];
    const s = tr.snapshot();
    tr.apply(s);
    return {
      n: tr.fighters.length,
      racked: tr.fighters.filter((x) => x.state === "racked").length,
      maint: tr.fighters.filter((x) => x.state === "maintenance").length,
      rec: typeof f.id === "number" && typeof f.state === "string" && "object" in f && f.pos && typeof f.pos.x === "number",
      fns: ["requestLaunch", "requestRecall", "setController", "on", "snapshot", "apply"].every((k) => typeof tr[k] === "function"),
      snap: s && typeof s.clock === "number" && Array.isArray(s.fighters) && s.fighters.length === tr.fighters.length,
      patrol: window.debugAPI.fighters.stats().patrolLength,
    };
  });
  check("traffic API present (fighters, requestLaunch/Recall, setController, on, snapshot/apply)", api.fns && api.rec, JSON.stringify(api));
  check("16 fighters: 12 racked + 4 on maintenance cradles", api.n === 16 && api.racked === 12 && api.maint === 4, `n=${api.n} racked=${api.racked} maintenance=${api.maint}`);
  check("patrol loop ~3-4.5 km", api.patrol > 2800 && api.patrol < 4600, `${api.patrol} m`);
}

// 2. one commanded launch → full cycle, sampling the fighter every second
const cycle = await ev(() => {
  const d = window.debugAPI;
  const tr = d.traffic;
  const id = tr.requestLaunch();
  if (id === false) return { error: "requestLaunch returned false" };
  const f = tr.fighters[id];
  const samples = [];
  const states = [];
  let objOk = true;
  let maxAir = 0;
  let poolViolations = 0;
  for (let s = 0; s < 260 && !(f.state === "racked" && s > 5); s++) {
    d.simulate(1);
    if (states[states.length - 1] !== f.state) states.push(f.state);
    if (f.state !== "racked") {
      samples.push({ t: s, st: f.state, x: +f.pos.x.toFixed(2), y: +f.pos.y.toFixed(2), z: +f.pos.z.toFixed(2), sp: +f.speed.toFixed(1) });
      if (!f.object || !f.object.visible || f.object.position.distanceTo(f.pos) > 1e-3) objOk = false;
    } else if (f.object) objOk = false;
    maxAir = Math.max(maxAir, tr.airborne);
    const shown = tr.fighters.filter((x) => x.object && x.object.visible).length;
    if (shown > 4) poolViolations++;
  }
  const slot = tr.rackSlots[f.slot];
  return { id, states, samples, objOk, maxAir, poolViolations, final: { st: f.state, dx: +(f.pos.x - slot.x).toFixed(3), dz: +(f.pos.z - slot.z).toFixed(3), y: +f.pos.y.toFixed(2) }, events: window.__ev.filter((e) => e.id === id), clock: +tr.clock.toFixed(1) };
});
if (cycle.error) check("commanded launch", false, cycle.error);
else {
  const seq = cycle.events.map((e) => e.e + (e.dir ? ":" + e.dir : "")).join(" ");
  check("launch cycle completes (states)", cycle.states.join(">") === "lowering>launching>patrol>returning>ascending>docking>racked", cycle.states.join(">"));
  check("events fire in order launch, field_pass:out, depart, return, field_pass:in, dock", seq === "launch field_pass:out depart return field_pass:in dock", seq);
  check("fighter re-docks exactly at its rack slot", cycle.final.st === "racked" && Math.abs(cycle.final.dx) < 0.01 && Math.abs(cycle.final.dz) < 0.01 && Math.abs(cycle.final.y - -16) < 0.01, JSON.stringify(cycle.final));
  check("pooled mesh follows the record while flying and is released when racked", cycle.objOk);
  check("never more than 4 fighters drawn (pool size)", cycle.poolViolations === 0, `violations=${cycle.poolViolations}, max airborne=${cycle.maxAir}`);
  const patrol = cycle.samples.filter((s) => s.st === "patrol");
  const speeds = patrol.map((s) => s.sp);
  check("patrol lasts 60-90 s at ~40-60 m/s", patrol.length >= 55 && patrol.length <= 95 && Math.min(...speeds) > 25 && Math.max(...speeds) < 80, `${patrol.length} s, speed ${Math.min(...speeds)}-${Math.max(...speeds)} m/s`);
  // hull clearance, independent of the fighters module: layout functions in Node
  let minSlab = Infinity;
  let inside = 0;
  let nearTower = Infinity;
  let below = 0;
  for (const s of cycle.samples) {
    if (s.y > -70) continue; // in the hangar well shaft / crossing the containment field
    below++;
    if (insideHull(s.x, s.y, s.z)) inside++;
    if (s.st !== "patrol") continue; // the approach legs necessarily pass through the belly
    const inPlan = s.z >= HULL.bowZ && s.z <= HULL.sternZ && Math.abs(s.x) <= halfWidth(s.z);
    if (inPlan) minSlab = Math.min(minSlab, Math.max(s.y - topY(s.x, s.z), ventralY(s.x, s.z) - s.y));
    const B = TOWER.bridge;
    if (s.z > B.z0 - 60 && s.z < B.z1 + 60 && s.y > B.y0 - 60) nearTower = Math.min(nearTower, Math.abs(s.x) - B.x);
  }
  check("no sample below the belly is inside the hull (layout.insideHull)", inside === 0 && below > 60, `${inside} inside of ${below} samples`);
  check(`vertical clearance over/under the wedge ≥ ${MIN_CLEARANCE} m (layout.topY/ventralY)`, minSlab >= MIN_CLEARANCE, `min ${minSlab.toFixed(1)} m`);
  check("passes the bridge tower flank at a safe distance (≥ 40 m, ≤ 250 m from the block)", nearTower >= MIN_CLEARANCE && nearTower <= 250, `${nearTower.toFixed(0)} m from the bridge block face`);
}

// 3. the fighters' own clearance function along the whole loop + the recovery legs
{
  const c = await ev(() => {
    const info = window.debugAPI.traffic.patrolInfo;
    const loop = info.minClearance(800);
    const tr = window.debugAPI.traffic;
    const p = new tr.fighters[0].pos.constructor();
    let legs = Infinity;
    for (const set of [tr.launchCurves, tr.recoveryCurves]) {
      for (const lc of set) {
        for (let i = 0; i <= 120; i++) {
          lc.curve.getPointAt(i / 120, p);
          if (p.y > -75) continue; // still in the shaft / at the field
          legs = Math.min(legs, info.clearance(p.x, p.y, p.z));
        }
      }
    }
    return { loop: +loop.min.toFixed(1), at: +loop.at.toFixed(3), legs: +legs.toFixed(1) };
  });
  check(`patrol spline ≥ ${MIN_CLEARANCE} m from every hull piece (800 samples)`, c.loop >= MIN_CLEARANCE, `min ${c.loop} m at u=${c.at}`);
  check(`launch / recovery legs below the belly ≥ ${MIN_CLEARANCE} m from the hull`, c.legs >= MIN_CLEARANCE, `min ${c.legs} m`);
}

// 4. scheduler steady state: ≤ 2 airborne, launches every ~35 s, the pool never overflows
{
  const st = await ev(() => {
    const d = window.debugAPI;
    const tr = d.traffic;
    const n0 = window.__ev.filter((e) => e.e === "launch").length;
    let maxAir = 0;
    let minAir = 99;
    for (let s = 0; s < 240; s++) {
      d.simulate(1);
      maxAir = Math.max(maxAir, tr.airborne);
      if (s > 120) minAir = Math.min(minAir, tr.airborne);
    }
    const launches = window.__ev.filter((e) => e.e === "launch").length - n0;
    return { launches, maxAir, minAir, states: d.fighters.stats().states };
  });
  check("scheduler launches automatically (~every 35 s, 2 in flight in steady state)", st.launches >= 4 && st.maxAir <= 2 && st.minAir >= 1, JSON.stringify(st));
}

// 5. recall, controller override, snapshot determinism
{
  const r = await ev(() => {
    const d = window.debugAPI;
    const tr = d.traffic;
    // recall: pick a patrolling fighter, recall it, it must come home sooner than its scheduled patrol end
    let f = tr.fighters.find((x) => x.state === "patrol");
    let guard = 0;
    while (!f && guard++ < 120) {
      d.simulate(1);
      f = tr.fighters.find((x) => x.state === "patrol");
    }
    if (!f) return { error: "no patrolling fighter" };
    const scheduledEnd = f.t0 + f.patrolDur;
    const ok = tr.requestRecall(f.id);
    const recalledEnd = f.t0 + f.dur;
    const recallEvent = window.__ev.some((e) => e.e === "recall" && e.id === f.id);
    // controller override: the scripted pose must be replaced by ours
    const g = tr.fighters.find((x) => x.state === "racked");
    tr.setController(g.id, { update(dt, ff) { ff.pos.set(500, 400, 300); ff.quat.identity(); } });
    d.simulate(0.2);
    const ctrlPos = g.pos.toArray().map((v) => +v.toFixed(1));
    const ctrlObj = g.object && g.object.visible && g.object.position.x === 500;
    tr.setController(g.id, null);
    d.simulate(0.2);
    const restored = g.state === "racked" && !g.object;
    // determinism: same clock + same snapshot → identical poses
    const s = tr.snapshot();
    d.simulate(7.3);
    const a = tr.fighters.map((x) => [...x.pos.toArray(), ...x.quat.toArray()].map((v) => +v.toFixed(4)));
    tr.apply(s);
    d.simulate(7.3);
    const b = tr.fighters.map((x) => [...x.pos.toArray(), ...x.quat.toArray()].map((v) => +v.toFixed(4)));
    const same = a.every((row, i) => row.every((v, j) => Math.abs(v - b[i][j]) < 1e-3));
    return { recall: ok && recalledEnd < scheduledEnd - 5 && recallEvent, sched: +scheduledEnd.toFixed(1), rec: +recalledEnd.toFixed(1), ctrlPos, ctrlObj, restored, same };
  });
  if (r.error) check("recall / controller / snapshot", false, r.error);
  else {
    check("requestRecall shortens the patrol and emits 'recall'", r.recall, `patrol end ${r.sched} → ${r.rec}`);
    check("setController overrides the scripted pose (and releases cleanly)", r.ctrlPos.join(",") === "500,400,300" && r.ctrlObj && r.restored, JSON.stringify({ pos: r.ctrlPos, obj: r.ctrlObj, restored: r.restored }));
    check("snapshot/apply replays to identical poses (motion is a pure function of the clock)", r.same);
  }
}

// 6. update cost: 3000 traffic steps must be fast and allocation-free (heap growth stays small)
{
  const perf = await ev(() => {
    const d = window.debugAPI;
    const tr = d.traffic;
    const info = { mode: "exterior", cameraPos: d.player.position, playerPos: d.player.position, hangarVisible: false };
    for (let i = 0; i < 200; i++) d.fighters.update(1 / 60, i / 60, info); // warm up
    const h0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const t0 = performance.now();
    for (let i = 0; i < 3000; i++) d.fighters.update(1 / 60, tr.clock, info);
    const ms = performance.now() - t0;
    const h1 = performance.memory ? performance.memory.usedJSHeapSize : 0;
    return { perStepUs: +((ms / 3000) * 1000).toFixed(1), heapDeltaKB: +((h1 - h0) / 1024).toFixed(0) };
  });
  check("fighters.update is cheap (< 50 µs per step, heap growth < 2 MB over 3000 steps)", perf.perStepUs < 50 && perf.heapDeltaKB < 2048, JSON.stringify(perf));
}

const stats = await ev(() => window.debugAPI.fighters.stats());
console.log("fighter stats:", JSON.stringify(stats));
if (errors.length) {
  console.log("PAGE ERRORS:");
  errors.slice(0, 10).forEach((e) => console.log(" ", e));
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
