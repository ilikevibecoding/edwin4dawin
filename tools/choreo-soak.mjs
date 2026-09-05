// Battle soak test: load battle.html, advance the simulation in fixed steps and report the choreography
// stats at t = 0, 60, 120, 180 s (ships alive, deaths, bolts in flight, particles, update cost), with a
// screenshot of the `wide` view (and any extra views) at every checkpoint. Also times battle.update alone.
// Usage: node tools/choreo-soak.mjs [--base http://127.0.0.1:5307/battle.html] [--out /tmp/soak]
//        [--step 60] [--total 180] [--views wide,lines] [--shots 0,6,7]  (cinematic shot indices to grab)
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
const base = opt("--base", "http://127.0.0.1:5307/battle.html");
const outDir = opt("--out", "/tmp/soak");
const step = +opt("--step", 60);
const total = +opt("--total", 180);
const views = opt("--views", "wide").split(",").filter(Boolean);
const shots = opt("--shots", "").split(",").filter(Boolean).map(Number);
const shotT = +opt("--shot-t", 5);
const shotsAt = opt("--shots-at", "").split(",").filter(Boolean).map(Number); // checkpoints that grab shots (default all)
mkdirSync(outDir, { recursive: true });

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
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(240000);
const errors = [];
page.on("console", (m) => {
  const text = m.text();
  if (
    text.includes("WebSocket") ||
    text.includes("[vite]") ||
    text.includes("GL Driver Message")
  )
    return;
  if (m.type() === "error" || m.type() === "warning") {
    errors.push(`[${m.type()}] ${text.slice(0, 300)}`);
    console.log(`[${m.type()}] ${text.slice(0, 300)}`);
  }
});
page.on("pageerror", (e) => {
  if (e.message.includes("WebSocket")) return;
  errors.push("[pageerror] " + e.message);
  console.log(
    "PAGE ERROR:",
    e.message,
    e.stack ? e.stack.split("\n").slice(0, 4).join("\n") : "",
  );
});

await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(
  () => window.debugAPI && window.debugAPI.ready,
  null,
  { timeout: 240000 },
);
// render a few frames so shaders compile and the sim starts
await page.waitForFunction(() => window.debugAPI.frames() >= 3);
console.log(
  `battle pre-roll at load: ${await page.evaluate(() => window.debugAPI.battle.stats.prerollMs)} ms`,
);

const summary = (label, stats, state) => {
  const ships = state.ships;
  const alive = ships.filter((s) => s.health > 0).length;
  const bySide = {};
  for (const s of ships) {
    bySide[s.side] = bySide[s.side] || { alive: 0, dead: 0 };
    if (s.health > 0) bySide[s.side].alive++;
    else bySide[s.side].dead++;
  }
  const burning = ships.filter((s) => s.damage > 0).length;
  const line =
    `t=${String(label).padStart(4)} s  ships ${ships.length} alive ${alive} (${Object.entries(
      bySide,
    )
      .map(([k, v]) => `${k} ${v.alive}/${v.alive + v.dead}`)
      .join(
        ", ",
      )})  deaths ${stats.deaths}  dying ${state.dying}  reinf ${stats.reinforcements}` +
    `  bolts ${stats.boltsAlive} (capital in flight ${stats.boltsInFlight}, heavy ${stats.heavyInFlight}, heat ${stats.heat})  particles ${stats.particles}` +
    `  salvos ${stats.salvos}  heavy ${stats.shotsHeavy}  light ${stats.shotsLight}  misses ${stats.misses}` +
    `  scorched ${burning}  update ${stats.updateMs} ms (max ${stats.updateMsMax}, choreo ${stats.choreoMs})`;
  console.log(line);
  return {
    label,
    alive,
    ships: ships.length,
    bySide,
    stats,
    dying: state.dying,
  };
};

const results = [];
const checkpoints = [];
for (let t = 0; t <= total; t += step) checkpoints.push(t);
let simT = 0;
let maxBolts = 0;
let maxParticles = 0;
let minAlive = Infinity;
const trace = []; // every 10 s: heavy bolts in flight / capital bolts in flight / heat
for (const cp of checkpoints) {
  if (cp > simT) {
    // advance in slices, sampling pool usage between them so peaks are not missed
    while (simT < cp) {
      const slice = Math.min(10, cp - simT);
      await page.evaluate((s) => window.debugAPI.advanceSim(s), slice);
      simT += slice;
      const st = await page.evaluate(() => window.debugAPI.battleStats());
      maxBolts = Math.max(maxBolts, st.boltsAlive);
      maxParticles = Math.max(maxParticles, st.particles);
      minAlive = Math.min(minAlive, st.alive);
      trace.push(`${simT}s ${st.heavyInFlight}/${st.boltsInFlight}@${st.heat}`);
    }
    console.log(`   density (heavy/capital bolts in flight @ heat): ${trace.splice(0).join("  ")}`);
  }
  const stats = await page.evaluate(() => window.debugAPI.battleStats());
  const state = await page.evaluate(() => window.debugAPI.battleState());
  maxBolts = Math.max(maxBolts, stats.boltsAlive);
  maxParticles = Math.max(maxParticles, stats.particles);
  results.push(summary(cp, stats, state));
  const overlaps = await page.evaluate(() =>
    window.debugAPI.battle.overlaps ? window.debugAPI.battle.overlaps(0) : null,
  );
  if (overlaps)
    console.log(
      `   hull overlaps (oriented boxes touching): ${overlaps.length}${overlaps.length ? " " + JSON.stringify(overlaps) : ""}`,
    );
  const minSep = await page.evaluate(() => {
    const ships = window.debugAPI.fleet.ships;
    let best = null;
    for (let i = 0; i < ships.length; i++)
      for (let j = i + 1; j < ships.length; j++) {
        const d = ships[i].position.distanceTo(ships[j].position);
        if (!best || d < best.d)
          best = {
            d: +d.toFixed(0),
            a: ships[i].model.id + ships[i].id,
            b: ships[j].model.id + ships[j].id,
          };
      }
    return best;
  });
  console.log(
    `   closest pair of ship centres: ${minSep.d} m (${minSep.a} / ${minSep.b})`,
  );
  for (const v of views) {
    await page.evaluate((n) => window.debugAPI.setView(n), v);
    const f0 = await page.evaluate(() => window.debugAPI.frames());
    await page.waitForFunction((n) => window.debugAPI.frames() >= n, f0 + 3);
    await page.waitForTimeout(300);
    const file = resolve(outDir, `${v}_t${cp}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 82 });
    console.log(`   ${v} -> ${file}`);
  }
  for (const idx of shots) {
    if (shotsAt.length && !shotsAt.includes(cp)) break;
    const name = await page.evaluate(
      ({ idx, t }) => {
        const api = window.debugAPI;
        api.setCinematic(true, idx);
        api.cinematic.time = t;
        api.cinematic.update(0);
        api.cinematic.smooth = 0;
        api.camera.updateMatrixWorld(true);
        return api.cinematicShot();
      },
      { idx, t: shotT },
    );
    const f0 = await page.evaluate(() => window.debugAPI.frames());
    await page.waitForFunction((n) => window.debugAPI.frames() >= n, f0 + 3);
    await page.waitForTimeout(300);
    const file = resolve(outDir, `shot${idx}_t${cp}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 82 });
    const pushes = await page.evaluate(() => window.debugAPI.cinematic.pushes);
    console.log(
      `   shot ${idx} "${name}" -> ${file} (clearance pushes so far ${pushes})`,
    );
    await page.evaluate(() => window.debugAPI.setCinematic(false));
  }
}

// isolated cost of battle.update: 600 fixed steps, timed in-page
const timing = await page.evaluate(() => {
  const api = window.debugAPI;
  const b = api.battle;
  const cam = api.camera.position;
  const n = 600;
  const t0 = performance.now();
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const a = performance.now();
    b.update(1 / 60, cam);
    worst = Math.max(worst, performance.now() - a);
  }
  const avg = (performance.now() - t0) / n;
  return {
    avgMs: +avg.toFixed(3),
    worstMs: +worst.toFixed(3),
    choreoMs: b.stats.choreoMs,
    bolts: api.bolts.alive,
    particles: api.explosions.alive,
    ships: api.fleet.ships.length,
  };
});
console.log(
  `battle.update timing over 600 steps: avg ${timing.avgMs} ms, worst ${timing.worstMs} ms, choreography part ${timing.choreoMs} ms (ships ${timing.ships}, bolts ${timing.bolts}, particles ${timing.particles})`,
);
// stress: fill the bolt pool to ~1500 long-lived bolts and time the update again
const stress = await page.evaluate(() => {
  const api = window.debugAPI;
  const b = api.battle;
  const bolts = api.bolts;
  const cam = api.camera.position;
  const V = cam.constructor;
  const from = new V();
  const to = new V();
  let added = 0;
  while (bolts.alive < 1500) {
    from.set(
      (Math.random() - 0.5) * 12000,
      (Math.random() - 0.5) * 3000,
      (Math.random() - 0.5) * 12000,
    );
    to.copy(from).add(
      new V(
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 4000,
        (Math.random() - 0.5) * 20000,
      ),
    );
    if (!bolts.fire(from, to, { speed: 2500, target: null, kind: "turbo" }))
      break;
    added++;
  }
  const n = 240;
  let worst = 0;
  let sum = 0;
  let minBolts = Infinity;
  for (let i = 0; i < n; i++) {
    const a = performance.now();
    b.update(1 / 60, cam);
    const d = performance.now() - a;
    sum += d;
    worst = Math.max(worst, d);
    minBolts = Math.min(minBolts, bolts.alive);
  }
  return {
    added,
    avgMs: +(sum / n).toFixed(3),
    worstMs: +worst.toFixed(3),
    choreoMs: b.stats.choreoMs,
    minBolts,
    ships: api.fleet.ships.length,
    particles: api.explosions.alive,
  };
});
console.log(
  `stress (bolt pool filled to 1500, ${stress.added} extra bolts): battle.update avg ${stress.avgMs} ms, worst ${stress.worstMs} ms over 240 steps, choreography part ${stress.choreoMs} ms (ships ${stress.ships}, bolts never below ${stress.minBolts}, particles ${stress.particles})`,
);
console.log(
  `peaks: bolts ${maxBolts} (< 1500 ${maxBolts < 1500 ? "OK" : "FAIL"}), particles ${maxParticles} (< 1400 ${maxParticles < 1400 ? "OK" : "FAIL"}), min alive ${minAlive}`,
);
console.log(
  errors.length
    ? `${errors.length} console errors/warnings`
    : "no console errors",
);
writeFileSync(
  resolve(outDir, "soak.json"),
  JSON.stringify(
    { errors, results, timing, stress, maxBolts, maxParticles, minAlive },
    null,
    1,
  ),
);
await browser.close();
process.exit(errors.some((e) => e.startsWith("[pageerror]")) ? 1 : 0);
