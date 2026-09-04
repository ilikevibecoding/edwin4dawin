// Headless traffic simulation (workstream FIGHTERS). Usage: node tools/fighters_sim.mjs [seconds=420] [baseUrl]
// Loads the app, then steps window.debugAPI.traffic.update(1/60, t, camera) in-page for `seconds` of simulated
// time without rendering and prints: the phase log, position tracks of every fighter that flew, hull-clearance
// / hangar-box violations (spec.hullBottomY, HANGAR.opening, the reactor bulb, the engines, the Kestrel pad),
// launch->dock round-trip times, the airborne maximum, a getState()/setState() round trip and the manual
// requestLaunch / requestLanding triggers. Exit code 1 on violations or NaNs.
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const seconds = +(process.argv[2] || 420);
const base = process.argv[3] || "http://127.0.0.1:5185/";
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const launchEnv = { ...process.env };
delete launchEnv.DISPLAY; // a DISPLAY makes headless Chrome try GLX on the VNC X server and WebGL context creation fails
const browser = await chromium.launch({
  headless: true,
  env: launchEnv,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("[console.error]", m.text().slice(0, 300));
});
console.log(`loading ${base}`);
await page.goto(base, { waitUntil: "load", timeout: 180000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
console.log("app ready; simulating", seconds, "s");

const out = await page.evaluate(async (seconds) => {
  const api = window.debugAPI;
  const tr = api.traffic;
  const spec = await import("/src/spec.js");
  const { hullBottomY, hullHalfWidth, HULL, HANGAR, VENTRAL, ENGINES } = spec;
  const cam = api.rig.camera;
  const dt = 1 / 60;
  const fmt = (p) => `(${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)})`;
  const phases = [];
  const prevOnPhase = tr.hooks.onPhase;
  let T = tr.getState().t || 0;
  const T0 = T;
  tr.hooks.onPhase = (f, p) => phases.push(`${(T - T0).toFixed(1)}s #${f.id} -> ${p}`);
  const problems = [];
  let violations = 0;
  let nan = false;
  let maxAirborne = 0;
  const track = new Map();
  const note = (kind, f) => {
    violations++;
    if (problems.length < 12) problems.push(`${kind} #${f.id} ${f.phase} ${fmt(f.position)} bottom=${hullBottomY(f.position.z).toFixed(0)}`);
  };
  const b = VENTRAL.reactorBulb;
  const engines = [...ENGINES.main, ...ENGINES.secondary];
  const steps = Math.round(seconds / dt);
  const t0 = performance.now();
  for (let i = 0; i < steps; i++) {
    T += dt;
    tr.update(dt, T, cam);
    maxAirborne = Math.max(maxAirborne, tr.airborne);
    if (i % 6) continue;
    for (const f of tr.fighters) {
      if (f.phase === "docked" || f.phase === "parked") continue;
      const p = f.position;
      if (!Number.isFinite(p.x + p.y + p.z) || !Number.isFinite(f.quaternion.x + f.quaternion.w)) {
        nan = true;
        problems.push(`NaN #${f.id} ${f.phase}`);
        break;
      }
      if (p.y < HANGAR.floorY - 0.1) {
        // outside: under the hull footprint -> at least 60 m below the bottom plate (except inside the mouth well)
        const inMouth = p.x > HANGAR.opening.x0 - 2 && p.x < HANGAR.opening.x1 + 2 && p.z > HANGAR.opening.z0 - 2 && p.z < HANGAR.opening.z1 + 2;
        const underHull = p.z > HULL.zBow && p.z < HULL.zStern + 70 && Math.abs(p.x) < hullHalfWidth(p.z) + 30;
        if (underHull && !inMouth && p.y > hullBottomY(p.z) - 60) note("CLEARANCE", f);
        if (Math.hypot(p.x - b.x, p.y - b.yCenter, p.z - b.z) < b.r + 30) note("BULB", f);
        for (const e of engines) if (p.z > ENGINES.z - 10 && p.z < ENGINES.z + ENGINES.length + 40 && Math.hypot(p.x - e.x, p.y - e.y) < e.r + 40) note("ENGINE", f);
      } else if (f.phase === "descend" || f.phase === "enter" || f.phase === "exit" || f.phase === "approach") {
        if (p.x < -63 || p.x > 63 || p.z < -138 || p.z > 78 || p.y > -1) note("HANGAR BOX", f);
        if (p.y < -30 && (Math.abs(p.x) > 28 || p.z < -35 || p.z > 55)) note("MOUTH LANE", f);
        if (p.x > -33 && p.x < -11 && p.z > -114 && p.z < -74 && p.y < -24) note("KESTREL PAD", f);
      }
      if (i % 600 === 0) {
        if (!track.has(f.id)) track.set(f.id, []);
        track.get(f.id).push(`${(T - T0).toFixed(0).padStart(4)}s ${f.phase.padEnd(8)} ${fmt(p).padEnd(20)} v=${f.speed.toFixed(0).padStart(3)} u=${f.u.toFixed(2)}`);
      }
    }
    if (nan) break;
  }
  const ms = performance.now() - t0;
  // round trips
  const launches = new Map();
  const trips = [];
  for (const line of phases) {
    const m = /^([\d.]+)s #(\d+) -> (\w+)/.exec(line);
    if (!m) continue;
    if (m[3] === "release") launches.set(m[2], +m[1]);
    if (m[3] === "docked" && launches.has(m[2])) trips.push(`#${m[2]}: ${(+m[1] - launches.get(m[2])).toFixed(0)} s`);
  }
  // state round trip: serialise, apply, serialise again
  const s1 = tr.getState();
  tr.setState(JSON.parse(JSON.stringify(s1)));
  const s2 = tr.getState();
  const stateRoundTrip = JSON.stringify(s1.fighters) === JSON.stringify(s2.fighters);
  // manual triggers
  const docked = tr.fighters.find((f) => f.phase === "docked");
  const launched = docked ? tr.requestLaunch(docked.id) : false;
  const launchedPhase = docked ? docked.phase : null;
  const patrol = tr.fighters.find((f) => f.phase === "patrol");
  const landing = patrol ? tr.requestLanding(patrol.id) : false;
  let landedAfter = -1;
  if (patrol) {
    for (let i = 0; i < 60 * 400; i++) {
      T += dt;
      tr.update(dt, T, cam);
      if (patrol.phase === "docked") {
        landedAfter = (i + 1) / 60;
        break;
      }
    }
  }
  tr.hooks.onPhase = prevOnPhase;
  const f = tr.fighters.find((x) => x.outer);
  return {
    ms,
    steps,
    phases,
    tracks: [...track.entries()].map(([id, rows]) => ({ id, rows })),
    problems,
    violations,
    nan,
    maxAirborne,
    trips,
    stateRoundTrip,
    state: JSON.stringify(s1).slice(0, 360),
    manual: { launched, launchedPhase, landingRequested: landing, landedAfter },
    pathLength: f ? { L: +f.outer.L.toFixed(0), sExit: +f.sExit.toFixed(0), sApproach: +f.sApproach.toFixed(0) } : null,
    pool: { parts: tr.pool.meshes.length, trianglesPerFighter: tr.pool.triangles, fighters: tr.fighters.length },
    phaseCount: tr.fighters.map((x) => x.phase).reduce((a, p) => ((a[p] = (a[p] || 0) + 1), a), {}),
  };
}, seconds);

console.log(`simulated ${seconds} s (${out.steps} steps) in ${out.ms.toFixed(0)} ms (${((out.ms / out.steps) * 1000).toFixed(1)} µs/step)`);
console.log(`pool: ${out.pool.fighters} fighters, ${out.pool.parts} instanced parts (draw calls), ${out.pool.trianglesPerFighter} triangles per fighter`);
console.log(`exterior path: ${JSON.stringify(out.pathLength)}`);
console.log("phase log:\n  " + out.phases.join("\n  "));
for (const t of out.tracks) console.log(`fighter #${t.id}\n  ` + t.rows.join("\n  "));
console.log("round trips (release -> docked):", out.trips.join(", ") || "(none completed)");
console.log("max airborne:", out.maxAirborne, " final phases:", JSON.stringify(out.phaseCount));
console.log("violations:", out.violations, out.problems.length ? "\n  " + out.problems.join("\n  ") : "");
console.log("getState -> setState -> getState identical:", out.stateRoundTrip);
console.log("state sample:", out.state);
console.log("manual triggers:", JSON.stringify(out.manual));
await browser.close();
if (out.violations || out.nan || !out.stateRoundTrip) {
  console.log("FAIL");
  process.exit(1);
}
console.log("OK");
