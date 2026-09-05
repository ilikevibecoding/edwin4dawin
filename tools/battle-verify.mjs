// Technical verification for the Battle of Coruscant scene (battle.html), not looks:
//  - the page loads with zero errors and every debug view renders within budget
//  - the simulation stays alive over minutes: bolts fired and hits landing, pools never saturate,
//    fighters never sit inside a capital hull, most of the fleet survives
//  - the cinematic camera never enters a hull along its shots
//  - the planet and the fleet are actually visible (pixel probes)
// Usage: node tools/battle-verify.mjs [--base http://127.0.0.1:5174/battle.html]   (exit 1 on failure)
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const bi = args.indexOf("--base");
const base =
  bi >= 0
    ? args[bi + 1]
    : process.env.SHOT_BASE || "http://127.0.0.1:5174/battle.html";
const BUDGET = { calls: 350, triangles: 2_500_000, frameJsMs: 12 };

const executablePath = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader-webgl",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});
const page = await browser.newPage({
  viewport: { width: 960, height: 540 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(240000);
const errors = [];
page.on(
  "pageerror",
  (e) => !e.message.includes("WebSocket") && errors.push(e.message),
);
page.on(
  "console",
  (m) =>
    m.type() === "error" &&
    !m.text().includes("WebSocket") &&
    !m.text().includes("[vite]") &&
    errors.push(m.text().slice(0, 200)),
);

let failures = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`,
  );
  if (!ok) failures++;
}

const t0 = Date.now();
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(
  () => window.debugAPI && window.debugAPI.ready,
  null,
  { timeout: 240000 },
);
const readyMs = Date.now() - t0;
const frames = async (n) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, {
    timeout: 240000,
  });
};
await frames(3);
check("page ready", true, `${readyMs} ms to debugAPI.ready`);

// ---- views render within budget
const views = await page.evaluate(() => window.debugAPI.views);
const over = [];
let maxCalls = 0;
let maxTris = 0;
for (const v of views) {
  await page.evaluate((n) => window.debugAPI.setView(n), v);
  await frames(2);
  const st = await page.evaluate(() => window.debugAPI.getStats());
  maxCalls = Math.max(maxCalls, st.calls);
  maxTris = Math.max(maxTris, st.triangles);
  if (st.calls > BUDGET.calls || st.triangles > BUDGET.triangles)
    over.push(`${v}: ${st.calls} calls, ${st.triangles} tris`);
}
check(
  `all ${views.length} views within budget (≤${BUDGET.calls} calls, ≤${BUDGET.triangles / 1e6}M tris)`,
  over.length === 0,
  over.join("; ") ||
    `max ${maxCalls} calls, ${(maxTris / 1e6).toFixed(2)}M tris`,
);

// ---- the planet and the fleet are visible: pixel probes on the wide view
await page.evaluate(() => window.debugAPI.setView("wide"));
await frames(3);
const probe = await page.evaluate(async () => {
  const d = window.debugAPI;
  const w = 960;
  const h = 540;
  const bottom = await d.capturePixels(
    0,
    Math.floor(h * 0.8),
    w,
    Math.floor(h * 0.2),
  );
  const middle = await d.capturePixels(
    0,
    Math.floor(h * 0.35),
    w,
    Math.floor(h * 0.3),
  );
  const mean = (px) => {
    let r = 0;
    let g = 0;
    let b = 0;
    const n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) {
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
    }
    return [r / n, g / n, b / n].map((v) => +v.toFixed(1));
  };
  return { bottom: mean(bottom), middle: mean(middle) };
});
check(
  "planet visible in the lower frame (warm, not black)",
  probe.bottom[0] > 18 && probe.bottom[0] > probe.bottom[2] * 0.9,
  `bottom mean rgb ${probe.bottom.join(",")}`,
);
check(
  "battle band has content",
  probe.middle[0] + probe.middle[1] + probe.middle[2] > 12,
  `middle mean rgb ${probe.middle.join(",")}`,
);

// ---- simulation health over 3 minutes of fixed-step time
const sim = await page.evaluate(() => {
  const d = window.debugAPI;
  const snaps = [];
  const insideHull = () => {
    let n = 0;
    for (const f of d.fighters.all) {
      if (!f.alive) continue;
      for (const s of d.fleet.ships) {
        if (s.containsPoint(f.pos, 0.9)) {
          n++;
          break;
        }
      }
    }
    return n;
  };
  const snap = () => {
    const st = d.battleStats();
    const alive = d.fleet.ships.filter((s) => s.health > 0).length;
    snaps.push({
      t: st.time,
      fired: st.boltsFired,
      bolts: st.boltsAlive,
      particles: st.particles,
      alive,
      ships: d.fleet.ships.length,
      kills: st.kills,
      inside: insideHull(),
    });
  };
  snap();
  for (let i = 0; i < 6; i++) {
    const t0 = performance.now();
    d.advanceSim(30);
    const ms = (performance.now() - t0) / (30 * 60);
    snap();
    snaps[snaps.length - 1].updateMs = +ms.toFixed(3);
  }
  return snaps;
});
for (const s of sim)
  console.log(
    `   t=${s.t}s fired=${s.fired} inFlight=${s.bolts} particles=${s.particles} alive=${s.alive}/${s.ships} kills=${s.kills} fightersInsideHull=${s.inside}${s.updateMs !== undefined ? ` update=${s.updateMs}ms/step` : ""}`,
  );
const last = sim[sim.length - 1];
check(
  "turbolasers fire continuously",
  last.fired > 2000 &&
    sim.every((s, i) => i === 0 || s.fired > sim[i - 1].fired),
  `${last.fired} bolts fired in ${last.t}s`,
);
check(
  "bolt pool never saturates",
  sim.every((s) => s.bolts < 1500),
  `peak in flight ${Math.max(...sim.map((s) => s.bolts))}`,
);
check(
  "particle pool never saturates",
  sim.every((s) => s.particles < 2400),
  `peak ${Math.max(...sim.map((s) => s.particles))}`,
);
check(
  "fleet mostly survives 3 minutes",
  last.alive >= Math.ceil(last.ships * 0.6),
  `${last.alive}/${last.ships} alive, ${last.kills} kills`,
);
check(
  "fighters stay out of capital hulls",
  sim.every((s) => s.inside <= 3),
  `max inside ${Math.max(...sim.map((s) => s.inside))}`,
);
check(
  "battle update cost",
  sim.slice(1).every((s) => s.updateMs < 4),
  `max ${Math.max(...sim.slice(1).map((s) => s.updateMs))} ms per 1/60 step`,
);

// ---- cinematic camera stays outside hulls across its shots
const cine = await page.evaluate(() => {
  const d = window.debugAPI;
  d.setCinematic(true, 0);
  const violations = [];
  let shots = 0;
  let last = d.cinematicShot();
  // step the camera and the battle without rendering (software GL is far too slow for 80 s of frames)
  for (let i = 0; i < 10 * 80; i++) {
    d.battle.update(0.1, d.camera.position);
    d.cinematic.update(0.1);
    const name = d.cinematicShot();
    if (name !== last) {
      shots++;
      last = name;
    }
    for (const s of d.fleet.ships) {
      if (s.containsPoint(d.camera.position, 1.05)) {
        violations.push(
          `${name}: inside ship ${s.id} (${s.model.id}) at t=${(i / 10).toFixed(1)}s`,
        );
        break;
      }
    }
  }
  d.setCinematic(false);
  return {
    shots,
    violations: violations.slice(0, 4),
    count: violations.length,
  };
});
check(
  "cinematic cycles through shots",
  cine.shots >= 5,
  `${cine.shots} shot changes in 80 s`,
);
check(
  "cinematic camera stays clear of hulls",
  cine.count === 0,
  cine.violations.join("; ") || "no intrusions",
);

// ---- frame cost on the heaviest view after the sim ran
await page.evaluate(() => window.debugAPI.setView("lines"));
await frames(30);
const st = await page.evaluate(() => window.debugAPI.getStats());
check(
  "JS frame cost",
  st.jsMs < BUDGET.frameJsMs,
  `${st.jsMs} ms js, ${st.frameMs} ms frame (software GL), ${st.calls} calls, ${(st.triangles / 1e6).toFixed(2)}M tris`,
);

check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(`\n${results.length - failures}/${results.length} checks passed`);
await browser.close();
process.exit(failures ? 1 : 0);
