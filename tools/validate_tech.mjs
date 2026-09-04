// Technical validation sweep (headless, SwiftShader) complementing walktest.mjs:
//   boot        page load → debugAPI.ready, getStats().boot, every console message (three.js warnings counted)
//   transitions board() from the default view and from ext_far; exitToExterior() from each cluster (camera ≥ 60 m
//               from every room box, then board again); per-frame camera NaN / black-canvas sampling
//   streaming   ensureCluster timing per cluster, heap / geometries / textures after all four, trimClusters(2)
//   leak        build → render → release each cluster twice; renderer.info.memory and heap must return to baseline
//   fighters    120 s simulated traffic: no patrolling fighter inside a room box or the hull; shaft states stay
//               inside the well footprint
//   sync        snapshot size; apply on a fresh page; doors / traffic / alert compared within tolerance
// Usage: node tools/validate_tech.mjs [url] [--json=path] [--out=shots/validator] [--only=boot,transitions,streaming,leak,fighters,sync]
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { insideHull, ROOMS } from "../src/core/layout.js";

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const pos = args.filter((a) => !a.startsWith("--"));
const url = pos[0] || "http://127.0.0.1:5173/";
const outDir = resolve(flags.out || "shots/validator");
const jsonPath = flags.json ? resolve(flags.json) : null;
const only = flags.only ? flags.only.split(",") : ["boot", "transitions", "streaming", "leak", "fighters", "sync"];
mkdirSync(outDir, { recursive: true });

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit", "--enable-precise-memory-info", "--js-flags=--expose-gc"] });
const console_ = [];
const errors = [];
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(600000);
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => {
    const rec = { type: m.type(), text: m.text().slice(0, 400) };
    console_.push(rec);
    if (m.type() === "error") errors.push("[console.error] " + rec.text);
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 600000 });
  // rAF gate (same as walktest): sections that compare simulated clocks across pages freeze the app's own
  // frame loop so only `simulate` advances time; pending callbacks are replayed on resume
  await page.evaluate(() => {
    const orig = window.requestAnimationFrame.bind(window);
    const R = (window.__raf = { orig, pending: [], paused: false });
    window.requestAnimationFrame = (cb) => {
      if (R.paused) {
        R.pending.push(cb);
        return 0;
      }
      return orig(cb);
    };
    window.__pause = () => {
      R.paused = true;
    };
    window.__resume = () => {
      R.paused = false;
      for (const cb of R.pending.splice(0)) orig(cb);
    };
  });
  return { page, readyMs: Date.now() - t0 };
}
const { page, readyMs } = await openPage();
const ev = (fn, arg) => page.evaluate(fn, arg);
const settle = async (n = 2) => {
  const f0 = await ev(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 600000 });
};
const R = { readyMs };
const log = (...a) => console.log(...a);
let shotN = 0;
async function shot(name) {
  await settle(2);
  const file = resolve(outDir, `t${String(++shotN).padStart(2, "0")}_${name}.png`);
  await page.screenshot({ path: file, timeout: 300000 });
  return file;
}

// ---------------------------------------------------------------------------------------------------
// boot + console
// ---------------------------------------------------------------------------------------------------
if (only.includes("boot")) {
  await settle(2);
  const s = await ev(() => window.debugAPI.getStats());
  const mats = s.boot.materials && typeof s.boot.materials === "object" ? Object.values(s.boot.materials).reduce((a, b) => a + b, 0) : s.boot.materials;
  R.boot = { readyMs, boot: s.boot, materialsSumMs: mats, longTasks: s.longTasks, heapMB: s.jsHeapMB, geometries: s.geometries, textures: s.textures, programs: s.programs, roomsBuilt: s.rooms.built };
  log(`== boot: ready ${readyMs} ms · boot.total ${s.boot.totalMs} ms · materials ${mats} ms · space ${s.boot.space} ms · exterior ${s.boot.exterior} ms · heap ${s.jsHeapMB} MB · geometries ${s.geometries} · textures ${s.textures} · programs ${s.programs}`);
  log(`   materials breakdown: ${JSON.stringify(s.boot.materials)}`);
  log(`   long tasks: ${JSON.stringify(s.longTasks)}`);
}

// ---------------------------------------------------------------------------------------------------
// transitions
// ---------------------------------------------------------------------------------------------------
async function sampler(on) {
  return ev((on) => {
    if (!window.__samp) {
      window.__samp = { on: false, rows: [], pending: false, lastLum: null };
      const d = window.debugAPI;
      const W = window.innerWidth;
      const H = window.innerHeight;
      (function loop() {
        requestAnimationFrame(loop);
        const S = window.__samp;
        if (!S.on) return;
        const c = d.player.camera;
        // the capture requested last frame resolved during this frame's render (same frame as this state sample)
        const row = { t: Math.round(performance.now()), f: d.frames(), mode: d.modes.mode, busy: d.modes.busy, pos: [c.position.x, c.position.y, c.position.z].map((v) => +v.toFixed(1)), nan: [c.position.x, c.position.y, c.position.z, c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w].some((v) => !Number.isFinite(v)), fade: +d.fadeOpacity(), room: d.rooms.current ? d.rooms.current.id : null, lum: S.lastLum };
        S.lastLum = null;
        S.rows.push(row);
        if (!S.pending) {
          S.pending = true;
          // a 16 px strip across the middle half of the WebGL canvas (read back right after the next render)
          d.capturePixels(Math.round(W / 4), Math.round(H / 2 - 8), Math.round(W / 2), 16).then((px) => {
            let sum = 0;
            let n = 0;
            for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2], n++;
            S.lastLum = +(sum / n).toFixed(1);
            S.pending = false;
          });
        }
      })();
    }
    window.__samp.on = on;
    if (on) window.__samp.rows = [];
    return window.__samp.rows;
  }, on);
}
function analyse(rows, label) {
  const nan = rows.filter((r) => r.nan).length;
  const black = rows.filter((r) => r.lum !== null && r.lum < 3);
  const blackFaded = black.filter((r) => r.fade >= 0.85).length;
  const blackUnfaded = black.filter((r) => r.fade < 0.85);
  const t0 = rows.length ? rows[0].t : 0;
  const t1 = rows.length ? rows[rows.length - 1].t : 0;
  const frameMs = rows.length > 1 ? Math.round((t1 - t0) / (rows.length - 1)) : 0;
  const out = { label, frames: rows.length, wallMs: t1 - t0, avgFrameMs: frameMs, nanFrames: nan, blackFrames: black.length, blackWhileFaded: blackFaded, blackUnfaded: blackUnfaded.map((r) => ({ t: r.t - t0, mode: r.mode, fade: r.fade, lum: r.lum, pos: r.pos, room: r.room })), lumRange: [Math.min(...rows.filter((r) => r.lum !== null).map((r) => r.lum)), Math.max(...rows.filter((r) => r.lum !== null).map((r) => r.lum))], modes: rows.map((r) => (r.mode === "interior" ? "I" : "E")).join("") };
  return out;
}
function minRoomDistance(p) {
  let best = Infinity;
  let id = null;
  for (const r of ROOMS) {
    const [x0, x1, z0, z1] = r.box;
    const dx = Math.max(x0 - p[0], 0, p[0] - x1);
    const dy = Math.max(r.floor - p[1], 0, p[1] - (r.floor + r.h));
    const dz = Math.max(z0 - p[2], 0, p[2] - z1);
    const d = Math.hypot(dx, dy, dz);
    if (d < best) {
      best = d;
      id = r.id;
    }
  }
  return { m: +best.toFixed(1), room: id };
}
async function doBoard(label) {
  await sampler(true);
  const t0 = Date.now();
  const camBefore = await ev(() => window.debugAPI.player.camera.position.toArray().map((v) => +v.toFixed(1)));
  await ev(() => {
    window.debugAPI.board();
  });
  await page.waitForFunction(() => window.debugAPI.modes.mode === "interior" && !window.debugAPI.modes.busy, null, { timeout: 900000 });
  const wall = Date.now() - t0;
  await settle(2);
  const rows = await sampler(false);
  const after = await ev(() => {
    const d = window.debugAPI;
    const c = d.player.camera;
    return { room: d.rooms.current && d.rooms.current.id, player: d.player.position.toArray().map((v) => +v.toFixed(2)), cam: c.position.toArray().map((v) => +v.toFixed(2)), yawDeg: +((d.player.yaw * 180) / Math.PI).toFixed(1), fade: +d.fadeOpacity(), status: d.status(), visible: d.rooms.stats().visible, built: d.rooms.stats().clusters };
  });
  const a = analyse(rows, label);
  const res = { label, camBefore, wallMs: wall, ...a, after, ok: after.room === "bridge" && a.nanFrames === 0 && a.blackUnfaded.length === 0 };
  log(`${res.ok ? "PASS" : "FAIL"} board ${label}: ${wall} ms wall, ${a.frames} frames (avg ${a.avgFrameMs} ms), NaN ${a.nanFrames}, black ${a.blackFrames} (unfaded ${a.blackUnfaded.length}), lum ${a.lumRange.join("..")}, lands in ${after.room} at ${after.player} yaw ${after.yawDeg}, cam ${after.cam}; modes ${a.modes}`);
  if (a.blackUnfaded.length) log("   black frames while not faded: " + JSON.stringify(a.blackUnfaded.slice(0, 6)));
  res.shot = await shot(`board_${label}`);
  return res;
}
async function doExit(cluster, view) {
  await ev((v) => window.debugAPI.setView(v), view);
  await settle(1);
  const from = await ev(() => ({ room: window.debugAPI.rooms.current.id, cluster: window.debugAPI.rooms.current.cluster }));
  await sampler(true);
  const t0 = Date.now();
  await ev(() => {
    window.debugAPI.exitToExterior();
  });
  await page.waitForFunction(() => window.debugAPI.modes.mode === "exterior" && !window.debugAPI.modes.busy, null, { timeout: 600000 });
  const wall = Date.now() - t0;
  await settle(2);
  const rows = await sampler(false);
  const after = await ev(() => {
    const d = window.debugAPI;
    const c = d.player.camera;
    return { cam: c.position.toArray().map((v) => +v.toFixed(1)), target: d.rig.target.toArray().map((v) => +v.toFixed(1)), status: d.status(), peek: d.rooms.peek, visible: d.rooms.stats().visible };
  });
  const dist = minRoomDistance(after.cam);
  const inHull = insideHull(after.cam[0], after.cam[1], after.cam[2]);
  const a = analyse(rows, `exit_${cluster}`);
  const res = { cluster, from, wallMs: wall, ...a, after, minRoomDistance: dist, cameraInsideHull: inHull, ok: from.cluster === cluster && dist.m >= 60 && !inHull && a.nanFrames === 0 && a.blackUnfaded.length === 0 };
  log(`${res.ok ? "PASS" : "FAIL"} exit from ${cluster} (${from.room}): ${wall} ms wall, ${a.frames} frames, NaN ${a.nanFrames}, black unfaded ${a.blackUnfaded.length}; camera ${after.cam} → nearest room ${dist.room} at ${dist.m} m, insideHull=${inHull}; visible ${after.visible.join("|")}`);
  if (a.blackUnfaded.length) log("   black frames while not faded: " + JSON.stringify(a.blackUnfaded.slice(0, 6)));
  res.shot = await shot(`exit_${cluster}`);
  return res;
}
if (only.includes("transitions")) {
  log(`\n== transitions`);
  R.transitions = [];
  R.transitions.push(await doBoard("default_view"));
  R.transitions.push(await doExit("tower", "bridge"));
  await ev(() => window.debugAPI.setView("ext_far"));
  await settle(1);
  R.transitions.push(await doBoard("from_ext_far"));
  for (const [cluster, view] of [
    ["hangar", "hangar"],
    ["engineering", "engineering"],
    ["crew", "crew_corridor"],
  ]) {
    R.transitions.push(await doExit(cluster, view));
    R.transitions.push(await doBoard(`after_exit_${cluster}`));
  }
}

// ---------------------------------------------------------------------------------------------------
// streaming / memory
// ---------------------------------------------------------------------------------------------------
if (only.includes("streaming")) {
  log(`\n== streaming`);
  R.streaming = await ev(() => {
    const d = window.debugAPI;
    const gc = () => window.gc && window.gc();
    const mem = () => {
      gc();
      const s = d.getStats();
      return { heapMB: s.jsHeapMB, geometries: s.geometries, textures: s.textures, programs: s.programs, built: s.rooms.built, clusters: s.rooms.clusters, roomTriangles: s.rooms.triangles };
    };
    // start from the tower only
    d.setView("bridge");
    for (const c of [...d.rooms.builtClusters]) if (c !== "tower") d.rooms.releaseCluster(c);
    const start = mem();
    const perCluster = {};
    for (const c of ["hangar", "engineering", "crew"]) {
      const t0 = performance.now();
      d.rooms.ensureCluster(c);
      perCluster[c] = { ensureMs: +(performance.now() - t0).toFixed(0), buildTimes: d.rooms.buildTimes[c] };
    }
    // rebuild the tower too, for its own timing
    d.rooms.releaseCluster("tower");
    {
      const t0 = performance.now();
      d.rooms.ensureCluster("tower");
      perCluster.tower = { ensureMs: +(performance.now() - t0).toFixed(0), buildTimes: d.rooms.buildTimes.tower };
      d.rooms.teleport(d.player.position);
    }
    const rooms = {};
    for (const [id, r] of d.rooms.rooms) if (r.built) rooms[id] = { buildMs: r.buildMs, triangles: r.triangles, lights: r.ctx.lights.length, colliders: r.ctx.kit.colliders.length, meshes: r.ctx.kit.meshes.length };
    const all4 = mem();
    // visit every cluster so trimClusters has a recency order, then trim to 2
    d.setView("hangar");
    d.setView("engineering");
    d.setView("crew_corridor");
    d.setView("bridge");
    const beforeTrim = mem();
    d.rooms.trimClusters(2);
    const afterTrim = mem();
    // edge case: a cluster that is built (prefetched) but never visited has no clusterVisit entry
    // (indexOf → -1), so trimClusters never releases it
    const released = ["hangar", "engineering"].filter((c) => !d.rooms.builtClusters.has(c));
    const probeCluster = released[0] || null;
    let unvisitedKept = null;
    if (probeCluster) {
      d.rooms.clusterVisit.delete(probeCluster);
      d.rooms.ensureCluster(probeCluster);
      d.rooms.trimClusters(2);
      unvisitedKept = { cluster: probeCluster, stillBuilt: d.rooms.builtClusters.has(probeCluster), clusters: [...d.rooms.builtClusters] };
      d.rooms.releaseCluster(probeCluster);
    }
    return { start, perCluster, rooms, all4, beforeTrim, afterTrim, unvisitedBuiltClusterSurvivesTrim: unvisitedKept, trimOk: afterTrim.clusters.length <= 2 && afterTrim.heapMB < beforeTrim.heapMB && afterTrim.geometries < beforeTrim.geometries };
  });
  const s = R.streaming;
  log(`start (tower only): ${JSON.stringify(s.start)}`);
  for (const [c, v] of Object.entries(s.perCluster)) log(`ensureCluster(${c}): ${v.ensureMs} ms (buildTimes ${v.buildTimes})`);
  log(`all four built: ${JSON.stringify(s.all4)}`);
  log(`before trim: ${JSON.stringify(s.beforeTrim)}`);
  log(`after trimClusters(2): ${JSON.stringify(s.afterTrim)}  → ${s.trimOk ? "PASS" : "FAIL"} (clusters ≤ 2, heap and geometries drop)`);
  log(`unvisited built cluster survives trimClusters(2): ${JSON.stringify(s.unvisitedBuiltClusterSurvivesTrim)}`);
  const slow = Object.entries(s.rooms).filter(([, r]) => r.buildMs > 400).sort((a, b) => b[1].buildMs - a[1].buildMs);
  log(`rooms over the 400 ms build budget: ${slow.map(([id, r]) => `${id} ${r.buildMs} ms`).join(", ") || "none"}`);
  const heavy = Object.entries(s.rooms).filter(([id, r]) => r.triangles > (["bridge", "hangar", "reactor"].includes(id) ? 400000 : 150000));
  log(`rooms over the triangle budget: ${heavy.map(([id, r]) => `${id} ${(r.triangles / 1000).toFixed(0)}k`).join(", ") || "none"}`);
}

// ---------------------------------------------------------------------------------------------------
// leak check: render a cluster, release it, compare renderer.info.memory + heap (twice, to see growth)
// ---------------------------------------------------------------------------------------------------
if (only.includes("leak")) {
  log(`\n== leak check (build → render → release, per cluster)`);
  const info = () =>
    ev(() => {
      if (window.gc) window.gc();
      const s = window.debugAPI.getStats();
      return { geometries: s.geometries, textures: s.textures, programs: s.programs, heapMB: s.jsHeapMB, built: s.rooms.built };
    });
  await ev(() => {
    const d = window.debugAPI;
    d.setView("bridge");
    for (const c of [...d.rooms.builtClusters]) if (c !== "tower") d.rooms.releaseCluster(c);
  });
  await settle(2);
  R.leak = {};
  for (const [cluster, view] of [
    ["hangar", "hangar"],
    ["engineering", "reactor"],
    ["crew", "crew_corridor"],
  ]) {
    const rounds = [];
    const before = await info();
    for (let k = 0; k < 2; k++) {
      await ev((v) => window.debugAPI.setView(v), view);
      await settle(2);
      const built = await info();
      await ev((c) => {
        const d = window.debugAPI;
        d.setView("bridge");
        d.rooms.releaseCluster(c);
      }, cluster);
      await settle(2);
      const after = await info();
      rounds.push({ built, after });
    }
    const leaked = rounds.map((r) => r.after.geometries - before.geometries);
    const heap = rounds.map((r) => +(r.after.heapMB - before.heapMB).toFixed(1));
    R.leak[cluster] = { before, rounds, leakedGeometriesPerRound: leaked, heapDeltaMBPerRound: heap };
    log(`${leaked[1] <= leaked[0] && leaked[0] <= 2 ? "PASS" : "WARN"} ${cluster}: geometries before ${before.geometries} → built ${rounds[0].built.geometries} → released ${rounds[0].after.geometries} → built ${rounds[1].built.geometries} → released ${rounds[1].after.geometries} (leaked ${leaked.join(", ")}); textures ${before.textures}→${rounds[1].after.textures}; heap ${before.heapMB}→${rounds[0].after.heapMB}→${rounds[1].after.heapMB} MB`);
  }
  // scene-graph orphans: objects still parented under the interior group after the releases
  const orphans = await ev(() => {
    const d = window.debugAPI;
    const g = d.rooms.group;
    const names = [];
    for (const c of g.children) names.push(c.name + ":" + c.children.length);
    return names;
  });
  log(`   interior group children after releases: ${orphans.join(" ")}`);
  R.leak.interiorChildren = orphans;
}

// ---------------------------------------------------------------------------------------------------
// fighters vs room boxes / hull over a 120 s simulated patrol
// ---------------------------------------------------------------------------------------------------
if (only.includes("fighters")) {
  log(`\n== fighters`);
  const f = await ev(() => {
    const d = window.debugAPI;
    d.setView("ext_belly");
    const tr = d.traffic;
    const rooms = d.layout.ROOMS;
    const WELL = { x0: -22, x1: 22, z0: -70, z1: 50 };
    const inRoom = (p) => {
      for (const r of rooms) if (p.x >= r.box[0] && p.x <= r.box[1] && p.z >= r.box[2] && p.z <= r.box[3] && p.y >= r.floor && p.y <= r.floor + r.h) return r.id;
      return null;
    };
    const id = tr.requestLaunch();
    const patrolSamples = [];
    const viol = [];
    let n = 0;
    const states = {};
    for (let s = 0; s < 240; s++) {
      d.simulate(0.5);
      for (const fi of tr.fighters) {
        if (!fi.object) continue; // parked (instanced) fighters live in the racks inside the hangar by design
        const p = fi.object.position;
        n++;
        states[fi.state] = (states[fi.state] || 0) + 1;
        const room = inRoom(p);
        if (fi.state === "patrol") {
          patrolSamples.push([+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]);
          if (room) viol.push({ t: s / 2, id: fi.id, state: fi.state, room, pos: [p.x, p.y, p.z].map((v) => +v.toFixed(1)) });
        } else if (room) {
          // shaft states: allowed inside the hangar volume only over the well footprint
          const okWell = room === "hangar" && p.x >= WELL.x0 && p.x <= WELL.x1 && p.z >= WELL.z0 && p.z <= WELL.z1;
          if (!okWell) viol.push({ t: s / 2, id: fi.id, state: fi.state, room, pos: [p.x, p.y, p.z].map((v) => +v.toFixed(1)) });
        }
      }
    }
    return { launched: id, samples: n, states, patrolSamples, roomViolations: viol.slice(0, 20), roomViolationCount: viol.length, stats: d.fighters.stats() };
  });
  let inHull = 0;
  const hullHits = [];
  for (const p of f.patrolSamples) if (insideHull(p[0], p[1], p[2])) {
    inHull++;
    if (hullHits.length < 10) hullHits.push(p);
  }
  R.fighters = { ...f, patrolSamples: f.patrolSamples.length, patrolInsideHull: inHull, hullHits, ok: f.roomViolationCount === 0 && inHull === 0 };
  log(`${R.fighters.ok ? "PASS" : "FAIL"} fighters: ${f.samples} flying samples over 120 s (${JSON.stringify(f.states)}), ${f.patrolSamples.length} patrol samples; room-box violations ${f.roomViolationCount}; patrol samples inside the hull ${inHull}`);
  if (f.roomViolations.length) log("   violations: " + JSON.stringify(f.roomViolations.slice(0, 8)));
  if (hullHits.length) log("   in-hull patrol samples: " + JSON.stringify(hullHits));
}

// ---------------------------------------------------------------------------------------------------
// sync snapshot → fresh page
// ---------------------------------------------------------------------------------------------------
if (only.includes("sync")) {
  log(`\n== sync`);
  // freeze page 1's own frame loop: from here on only `simulate` advances doors / traffic, so the two pages
  // can be compared at identical clocks (a live loop would add ~0.1 s of real time per rendered frame)
  await ev(() => window.__pause());
  await new Promise((r) => setTimeout(r, 6000)); // let an in-flight frame finish
  const s1 = await ev(() => {
    const d = window.debugAPI;
    // put a few doors in motion: bridge blast door + tactical side door
    d.setView("bridge");
    d.nudge(0, 1.5, 20);
    d.simulate(1.0);
    d.player.position.set(-11, 210, 187.5);
    d.simulate(1.0);
    d.setAlert(1);
    const snap = d.sync.snapshot();
    const json = JSON.stringify(snap);
    const poses = d.traffic.fighters.map((f) => ({ id: f.id, state: f.state, pos: f.pos.toArray().map((v) => +v.toFixed(3)) }));
    return { snap, bytes: json.length, poses, doors: d.doors.snapshot(), clock: d.traffic.clock, alert: d.lighting.alert };
  });
  log(`snapshot: ${s1.bytes} bytes; doors ${JSON.stringify(s1.doors)}; lift ${JSON.stringify(s1.snap.lift)}; traffic fighters ${s1.snap.traffic ? s1.snap.traffic.fighters.length : 0}; alert ${s1.alert}`);
  const { page: p2, readyMs: ready2 } = await openPage();
  await p2.evaluate(() => window.__pause());
  await new Promise((r) => setTimeout(r, 6000));
  const s2 = await p2.evaluate((s1) => {
    const d = window.debugAPI;
    d.setView("bridge"); // build the tower so the bridge doors exist
    const before = d.doors.snapshot();
    d.sync.apply(s1.snap);
    const doors = d.doors.snapshot();
    const poses = d.traffic.fighters.map((f) => ({ id: f.id, state: f.state, pos: f.pos.toArray().map((v) => +v.toFixed(3)) }));
    // visual / collider consistency of applied door state (before any update tick)
    const slabState = {};
    for (const [id, st] of Object.entries(s1.doors)) {
      const r = d.doors.doors.get(id);
      if (!r || !r.built) {
        slabState[id] = "not built";
        continue;
      }
      const moved = r.slabs.length ? +r.slabs[0].group.position.distanceTo(r.slabs[0].base).toFixed(2) : null;
      slabState[id] = { openness: r.openness, target: r.target, slabMoved: moved, colliderEnabled: r.colliders.length ? r.colliders[0].enabled : null };
    }
    // one simulation tick, then again
    d.simulate(1 / 60);
    const slabAfterTick = {};
    for (const id of Object.keys(s1.doors)) {
      const r = d.doors.doors.get(id);
      if (r && r.built) slabAfterTick[id] = { openness: +r.openness.toFixed(3), slabMoved: r.slabs.length ? +r.slabs[0].group.position.distanceTo(r.slabs[0].base).toFixed(2) : null, colliderEnabled: r.colliders.length ? r.colliders[0].enabled : null };
    }
    return { before, doors, poses, clock: d.traffic.clock, alert: d.lighting.alert, syncClock: d.sync.clock, slabState, slabAfterTick, liftRide: d.lifts.ride };
  }, s1);
  const doorMatch = JSON.stringify(s1.doors) === JSON.stringify(s2.doors);
  let maxPosErr = 0;
  let stateMismatch = 0;
  for (let i = 0; i < s1.poses.length; i++) {
    const a = s1.poses[i];
    const b = s2.poses[i];
    if (a.state !== b.state) stateMismatch++;
    maxPosErr = Math.max(maxPosErr, Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]));
  }
  // determinism after more simulated time on both pages
  const step5 = () => {
    const d = window.debugAPI;
    d.simulate(5);
    return { clock: d.traffic.clock, states: d.traffic.fighters.map((f) => f.state), pos: d.traffic.fighters.map((f) => f.pos.toArray().map((v) => +v.toFixed(3))) };
  };
  const [A5, B5] = await Promise.all([ev(step5), p2.evaluate(step5)]);
  const a5 = A5.pos;
  const b5 = B5.pos;
  let maxErr5 = 0;
  let stateMismatch5 = 0;
  for (let i = 0; i < a5.length; i++) {
    maxErr5 = Math.max(maxErr5, Math.hypot(a5[i][0] - b5[i][0], a5[i][1] - b5[i][1], a5[i][2] - b5[i][2]));
    if (A5.states[i] !== B5.states[i]) stateMismatch5++;
  }
  await ev(() => window.__resume());
  const stale = Object.entries(s2.slabState).filter(([, v]) => v && typeof v === "object" && v.openness > 0.8 && (v.slabMoved === 0 || v.colliderEnabled === true)).map(([id]) => id);
  // page 2 ran one 1/60 s tick after apply, so its clock leads by ≤ 1/60 s: allow the distance a fighter
  // covers in that time (≤ 60 m/s) plus a little
  const clockGap = Math.abs(A5.clock - B5.clock);
  const tol5 = 0.01 + clockGap * 60;
  R.sync = { bytes: s1.bytes, readyMs2: ready2, doorMatch, doorsA: s1.doors, doorsB: s2.doors, doorsBeforeApply: s2.before, fighterStateMismatch: stateMismatch, maxPosErr: +maxPosErr.toFixed(4), maxPosErrAfter5s: +maxErr5.toFixed(4), stateMismatchAfter5s: stateMismatch5, clockA: s1.clock, clockB: s2.clock, clockA5: A5.clock, clockB5: B5.clock, alertA: s1.alert, alertB: s2.alert, liftInSnapshot: s1.snap.lift, slabState: s2.slabState, slabAfterTick: s2.slabAfterTick, staleDoorVisuals: stale, ok: doorMatch && stateMismatch === 0 && maxPosErr < 0.01 && maxErr5 < tol5 && stateMismatch5 === 0 && Math.abs(s1.alert - s2.alert) < 1e-6 };
  log(`${R.sync.ok ? "PASS" : "FAIL"} sync apply on a fresh page: doors match=${doorMatch}, fighter state mismatches ${stateMismatch}, max pos error ${maxPosErr.toFixed(4)} m (after +5 s: ${maxErr5.toFixed(4)} m, clocks ${A5.clock.toFixed(3)} vs ${B5.clock.toFixed(3)}, tolerance ${tol5.toFixed(2)} m, state mismatches ${stateMismatch5}), clock ${s1.clock.toFixed(3)} → ${s2.clock.toFixed(3)}, alert ${s1.alert} → ${s2.alert}`);
  log(`   applied door records (before any tick): ${JSON.stringify(s2.slabState)}`);
  log(`   after one tick: ${JSON.stringify(s2.slabAfterTick)}`);
  if (stale.length) log(`   WARN doors logically open but slabs unmoved / collider still enabled after apply: ${stale.join(", ")}`);
  await p2.close();
}

R.console = { total: console_.length, byType: console_.reduce((m, c) => ((m[c.type] = (m[c.type] || 0) + 1), m), {}), warnings: console_.filter((c) => c.type === "warning").map((c) => c.text), errors: console_.filter((c) => c.type === "error").map((c) => c.text), three: console_.filter((c) => /THREE\./.test(c.text)).map((c) => c.text) };
log(`\n== console: ${JSON.stringify(R.console.byType)}; three.js messages ${R.console.three.length}`);
for (const w of [...new Set([...R.console.warnings, ...R.console.errors])].slice(0, 30)) log("   " + w.slice(0, 300));
R.pageErrors = errors;
if (jsonPath) writeFileSync(jsonPath, JSON.stringify(R, null, 1));
await browser.close();
const fails = [...(R.transitions || []).filter((t) => !t.ok).map((t) => "transition " + (t.label || t.cluster)), ...(R.streaming && !R.streaming.trimOk ? ["trim"] : []), ...(R.fighters && !R.fighters.ok ? ["fighters"] : []), ...(R.sync && !R.sync.ok ? ["sync"] : [])];
log(`\n${fails.length ? "FAILED: " + fails.join(", ") : "all sections passed"}${errors.length ? ` · ${errors.length} page errors` : ""}`);
process.exit(fails.length || errors.length ? 1 : 0);
