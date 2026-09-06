// Battle soak test: load battle.html, advance the simulation in fixed steps and report the choreography
// stats at every checkpoint (ships alive, deaths, wrecks retired, reinforcements, bolts in flight, particles
// per layer, fires burning, fighter losses per minute, update cost), with a screenshot of the `wide` view
// (and any extra views) at every checkpoint. Also times battle.update alone and prints the death log
// (when each ship died, how long after the director marked it) with the deaths per 3-minute window.
// Usage: node tools/choreo-soak.mjs [--base http://127.0.0.1:5307/battle.html] [--out /tmp/soak]
//        [--step 60] [--total 180] [--views wide,lines] [--shots 0,6,7]  (cinematic shot indices to grab)
//        [--shot-t 5] [--shots-at 60,120]   e.g. a 20-minute run: --total 1200 --step 120 --views ""
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

// one probe of everything the report needs, taken in-page
const probe = () =>
  page.evaluate(() => {
    const api = window.debugAPI;
    const st = api.battleStats();
    const ex = api.explosions;
    const counts = ex.counts || {};
    let firesLit = 0;
    let fireRecords = 0;
    for (const s of api.fleet.ships) {
      if (!s.alive) continue;
      for (const f of s.fires) {
        fireRecords++;
        if (f.lit) firesLit++;
      }
    }
    const fs = api.fighters.stats || {};
    return {
      ...st,
      additive: ex.add ? ex.add.particles.length : 0,
      additiveCap: ex.add ? ex.add.capacity : 0,
      smoke: ex.smoke ? ex.smoke.particles.length : 0,
      smokeCap: ex.smoke ? ex.smoke.capacity : 0,
      emitters: counts.fires ?? (ex.fires ? ex.fires.length : 0),
      debris: counts.debris ?? 0,
      fireRecords,
      firesLit,
      fightersDestroyed: fs.destroyed || 0,
      fightersAlive: api.fighters.all.filter((f) => f.alive).length,
      fighterShots: (fs.shotsCapital || 0) + (fs.shotsFighter || 0),
      dogfightShots: fs.shotsFighter || 0,
    };
  });

const summary = (label, stats, state, prev, dtMin) => {
  const ships = state.ships;
  const alive = ships.filter((s) => s.health > 0).length;
  const bySide = {};
  for (const s of ships) {
    bySide[s.side] = bySide[s.side] || { alive: 0, dead: 0 };
    if (s.health > 0) bySide[s.side].alive++;
    else bySide[s.side].dead++;
  }
  const burning = ships.filter((s) => s.damage > 0).length;
  const fDeaths = prev
    ? (stats.fightersDestroyed - prev.fightersDestroyed) / dtMin
    : 0;
  const line =
    `t=${String(label).padStart(4)} s  ships ${ships.length} alive ${alive} (${Object.entries(
      bySide,
    )
      .map(([k, v]) => `${k} ${v.alive}/${v.alive + v.dead}`)
      .join(
        ", ",
      )})  deaths ${stats.deaths}  dying ${state.dying}  retired ${stats.retired}  reinf ${stats.reinforcements}` +
    `\n           bolts ${stats.boltsAlive} (capital in flight ${stats.boltsInFlight}, heavy ${stats.heavyInFlight}, heat ${stats.heat})` +
    `  particles ${stats.particles} (additive ${stats.additive}/${stats.additiveCap}, smoke ${stats.smoke}/${stats.smokeCap}, debris ${stats.debris})` +
    `\n           fires: ${stats.emitters} emitters burning, ${stats.firesLit}/${stats.fireRecords} records lit (lit ${stats.firesLit}, deferred ${stats.firesDeferred} since start)` +
    `\n           fighters ${stats.fightersAlive}/${stats.fighters} alive, ${stats.fightersDestroyed} destroyed (${fDeaths.toFixed(0)}/min over the last ${dtMin} min` +
    (fDeaths > 0
      ? `, mean life ${(stats.fighters / fDeaths).toFixed(1)} min`
      : "") +
    `)  PD shots ${stats.pdShots} hits ${stats.pdHits}, dogfight shots ${stats.dogfightShots} hits ${stats.dogfightHits}` +
    `\n           salvos ${stats.salvos}  heavy ${stats.shotsHeavy}  light ${stats.shotsLight}  misses ${stats.misses}  scorched ${burning}  update ${stats.updateMs} ms (max ${stats.updateMsMax}, choreo ${stats.choreoMs})`;
  console.log(line);
  return {
    label,
    alive,
    ships: ships.length,
    bySide,
    stats,
    dying: state.dying,
    fighterDeathsPerMin: +fDeaths.toFixed(1),
  };
};

const results = [];
const checkpoints = [];
for (let t = 0; t <= total; t += step) checkpoints.push(t);
let simT = 0;
let maxBolts = 0;
let maxParticles = 0;
let maxAdd = 0;
let maxSmoke = 0;
let minAlive = Infinity;
let prevStats = null;
const trace = []; // every 10 s: heavy bolts in flight / capital bolts in flight / heat
for (const cp of checkpoints) {
  if (cp > simT) {
    // advance in slices, sampling pool usage between them so peaks are not missed
    while (simT < cp) {
      const slice = Math.min(10, cp - simT);
      await page.evaluate((s) => window.debugAPI.advanceSim(s), slice);
      simT += slice;
      const st = await probe();
      maxBolts = Math.max(maxBolts, st.boltsAlive);
      maxParticles = Math.max(maxParticles, st.particles);
      maxAdd = Math.max(maxAdd, st.additive);
      maxSmoke = Math.max(maxSmoke, st.smoke);
      minAlive = Math.min(minAlive, st.alive);
      trace.push(`${simT}s ${st.heavyInFlight}/${st.boltsInFlight}@${st.heat}`);
    }
    if (total <= 600)
      console.log(
        `   density (heavy/capital bolts in flight @ heat): ${trace.splice(0).join("  ")}`,
      );
    else trace.length = 0;
  }
  const stats = await probe();
  const state = await page.evaluate(() => window.debugAPI.battleState());
  maxBolts = Math.max(maxBolts, stats.boltsAlive);
  maxParticles = Math.max(maxParticles, stats.particles);
  results.push(summary(cp, stats, state, prevStats, step / 60));
  prevStats = stats;
  const overlaps = await page.evaluate(() =>
    window.debugAPI.battle.overlaps ? window.debugAPI.battle.overlaps(0) : null,
  );
  if (overlaps)
    console.log(
      `   hull overlaps (oriented boxes touching): ${overlaps.length}${overlaps.length ? " " + JSON.stringify(overlaps) : ""}`,
    );
  // per-class roster: alive (dying) + wrecks still drawn, with the roles the class is flying
  const classes = await page.evaluate(() =>
    window.debugAPI.battle.classCounts
      ? window.debugAPI.battle.classCounts()
      : null,
  );
  if (classes) {
    const line = Object.entries(classes)
      .map(([cls, c]) => {
        const roles = Object.entries(c.roles)
          .map(([r, n]) => `${r} ${n}`)
          .join(", ");
        return `${cls} ${c.alive}${c.dying ? `+${c.dying} dying` : ""}${c.dead ? `+${c.dead} wreck` : ""} [${roles}]`;
      })
      .join("  ");
    console.log(`   classes: ${line}`);
    results[results.length - 1].classes = classes;
  }
  const minSep = await page.evaluate(() => {
    const ships = window.debugAPI.fleet.ships.filter((s) => s.alive);
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
  if (minSep)
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

// death log: when each ship died and how long the director had it marked; deaths per 3-minute window
const deathLog = await page.evaluate(() => {
  const d = window.debugAPI.battle.director;
  return d && d.deathLog ? d.deathLog : [];
});
// roster summary: ships per class at the start and the end (alive, incl. dying), deaths per class
const roster = results[0].classes;
if (roster) {
  const end = results[results.length - 1].classes || {};
  console.log(
    "roster (class: alive at start -> at end, deaths): " +
      Object.keys(roster)
        .map((cls) => {
          const a = roster[cls];
          const b = end[cls] || { alive: 0, dying: 0 };
          const deaths = deathLog.filter((e) => e.cls === cls).length;
          return `${cls} ${a.alive + a.dying}->${b.alive + b.dying}${deaths ? ` (-${deaths})` : ""}`;
        })
        .join("  "),
  );
}
if (deathLog.length) {
  console.log(
    `deaths (${deathLog.length} over ${total} s): ` +
      deathLog
        .map(
          (e) =>
            `${e.cls}${e.id}@${e.t}s${e.doomedFor >= 0 ? `(+${e.doomedFor}s)` : "(unmarked)"}`,
        )
        .join("  "),
  );
  const windows = [];
  for (let w = 0; w < total; w += 180)
    windows.push(deathLog.filter((e) => e.t >= w && e.t < w + 180).length);
  console.log(
    `deaths per 3-minute window: ${windows.join(" ")}  (target 2-4; first death at ${deathLog[0].t} s)`,
  );
} else console.log(`deaths: none in ${total} s`);

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
    ships: api.fleet.ships.filter((s) => s.alive).length,
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
    ships: api.fleet.ships.filter((s) => s.alive).length,
    particles: api.explosions.alive,
  };
});
console.log(
  `stress (bolt pool filled to 1500, ${stress.added} extra bolts): battle.update avg ${stress.avgMs} ms, worst ${stress.worstMs} ms over 240 steps, choreography part ${stress.choreoMs} ms (ships ${stress.ships}, bolts never below ${stress.minBolts}, particles ${stress.particles})`,
);
const last = results[results.length - 1].stats;
console.log(
  `peaks: bolts ${maxBolts} (< 1500 ${maxBolts < 1500 ? "OK" : "FAIL"}), additive particles ${maxAdd}/${last.additiveCap} (${maxAdd < last.additiveCap ? "OK" : "FULL"}), smoke ${maxSmoke}/${last.smokeCap} (${maxSmoke < last.smokeCap ? "OK" : "FULL"}), both layers ${maxParticles}, min alive ${minAlive}`,
);
console.log(
  errors.length
    ? `${errors.length} console errors/warnings`
    : "no console errors",
);
writeFileSync(
  resolve(outDir, "soak.json"),
  JSON.stringify(
    {
      errors,
      results,
      deathLog,
      timing,
      stress,
      maxBolts,
      maxParticles,
      maxAdd,
      maxSmoke,
      minAlive,
    },
    null,
    1,
  ),
);
await browser.close();
process.exit(errors.some((e) => e.startsWith("[pageerror]")) ? 1 : 0);
