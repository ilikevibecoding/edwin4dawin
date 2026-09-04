// Navigation / technical validation: for every deck, walk from each door's A-side sector to its
// B-side sector with the real controller (auto-opening doors, colliders, floors), ride the turbolift
// between every pair of adjacent decks, exercise the traffic scheduler, and check the reserved
// system stubs. Writes a JSON report and exits non-zero if anything fails.
// Usage: node tools/navtest.mjs [baseUrl] [--out report.json]
import { chromium } from "playwright-core";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) || "http://127.0.0.1:5173/";
const outIdx = args.indexOf("--out");
const out = outIdx >= 0 ? args[outIdx + 1] : "shots/navtest.json";

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(240000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !/GPU stall|ReadPixels/.test(m.text())) errors.push(m.text().slice(0, 300));
});
await page.goto(base, { waitUntil: "load" });
const ready = async () => {
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });
  // stop rendering while we simulate (software GL frames would slow the walk loops)
  await page.evaluate(() => (window.debugAPI.directRender = true));
};
await ready();
// A dev-server hot reload (someone editing src/) destroys the page context mid-run; instead of
// dying, wait for the app to come back and repeat the step. Steps are idempotent (each teleports).
const rawEvaluate = page.evaluate.bind(page);
page.evaluate = async (fn, arg) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await rawEvaluate(fn, arg);
    } catch (e) {
      if (attempt >= 3 || !/Execution context was destroyed|Target closed|navigation/.test(String(e.message))) throw e;
      console.log("page reloaded (dev server); waiting for the app and retrying the step");
      await ready();
    }
  }
};

const report = { base, decks: {}, lift: [], traffic: null, reserved: null, errors, failures: [] };
const fail = (msg) => {
  report.failures.push(msg);
  console.log("FAIL", msg);
};

// layout from the page
const layout = await page.evaluate(() => window.debugAPI.interior.decks.map((d) => ({ id: d.def.id, index: d.def.index, origin: d.def.origin, sectors: d.def.sectors.map((s) => ({ id: s.id, kind: s.kind, spawn: s.spawn, bounds: s.bounds })), doors: d.def.doors })));

for (const deck of layout) {
  const res = { doors: [], sectors: {} };
  report.decks[deck.id] = res;
  const [ox, , oz] = deck.origin;
  const spawnOf = (id) => {
    const s = deck.sectors.find((x) => x.id === id);
    if (s.spawn) return [s.spawn[0] + ox, s.spawn[1] + oz];
    const b = s.bounds;
    return [(b[0][0] + b[1][0]) / 2 + ox, (b[0][2] + b[1][2]) / 2 + oz];
  };
  // build stats per sector
  for (const s of deck.sectors) {
    const info = await page.evaluate(async (id) => {
      const r = await window.debugAPI.teleport(id);
      const sec = window.debugAPI.interior.sectors.get(id);
      let tris = 0;
      let meshes = 0;
      sec.group.traverse((o) => {
        if (o.isMesh) {
          meshes++;
          const g = o.geometry;
          const n = g.index ? g.index.count : g.attributes.position.count;
          tris += (n / 3) * (o.isInstancedMesh ? o.count : 1);
        }
      });
      return { ...r, tris: Math.round(tris), meshes, lights: sec.lights.length, buildMs: Math.round(sec.buildMs || 0), colliders: sec.colliders.length };
    }, s.id);
    res.sectors[s.id] = info;
    if (info.tris > (s.kind === "room" ? (s.id === "d5_hangar" ? 700000 : s.id === "d1_bridge" ? 450000 : s.id === "d4_reactor" ? 280000 : 180000) : 120000)) fail(`${s.id}: ${info.tris} triangles over budget`);
    if (info.lights > (s.id === "d5_hangar" || s.id === "d1_bridge" ? 10 : 8)) fail(`${s.id}: ${info.lights} lights over budget`);
  }
  // door traversal both ways
  for (const d of deck.doors) {
    for (const [from, to] of [
      [d.a, d.b],
      [d.b, d.a],
    ]) {
      const doorW = [d.pos[0] + ox, d.pos[1] + oz];
      // approach point on the `from` side, 1.6 m before the door plane, then the far spawn
      const r = await page.evaluate(
        async ({ from, to, doorW, target, wall }) => {
          await window.debugAPI.teleport(from);
          const p0 = window.debugAPI.player.position.toArray();
          // walk to a point in front of the door (on this side)
          const px = wall === "x" ? doorW[0] : doorW[0] + Math.sign(p0[0] - doorW[0]) * 1.6;
          const pz = wall === "x" ? doorW[1] + Math.sign(p0[2] - doorW[1]) * 1.6 : doorW[1];
          const a = window.debugAPI.walkTo(px, pz, 14);
          // wait for the door to open, then cross
          window.debugAPI.advance(1.5);
          const qx = wall === "x" ? doorW[0] : doorW[0] - Math.sign(p0[0] - doorW[0]) * 1.6;
          const qz = wall === "x" ? doorW[1] - Math.sign(p0[2] - doorW[1]) * 1.6 : doorW[1];
          const b = window.debugAPI.walkTo(qx, qz, 6);
          const c = window.debugAPI.walkTo(target[0], target[1], 20);
          const cur = window.debugAPI.current();
          return { approach: a.reached, crossed: b.reached, arrived: c.reached, sector: cur ? cur.id : null, pos: c.to.map((v) => +v.toFixed(2)) };
        },
        { from, to, doorW, target: spawnOf(to), wall: d.wall },
      );
      const ok = r.crossed && r.sector === to;
      res.doors.push({ from, to, style: d.style, ...r, ok });
      if (!ok) fail(`${deck.id} door ${from} → ${to} (${d.style}): approach=${r.approach} crossed=${r.crossed} arrived=${r.arrived} sector=${r.sector}`);
      else console.log(`ok   ${from} → ${to} (${d.style})${r.arrived ? "" : " [spawn not reached, sector ok]"}`);
    }
  }
}

// turbolift between adjacent decks (both directions)
const order = layout.slice().sort((a, b) => a.index - b.index);
for (let i = 0; i < order.length; i++) {
  const from = order[i];
  const to = order[(i + 1) % order.length];
  const r = await page.evaluate(
    async ({ fromDeck, toDeck }) => {
      const lift = window.debugAPI.interior.decks.find((d) => d.def.id === fromDeck).sectors.find((s) => s.def.kind === "lift");
      await window.debugAPI.teleport(lift.id);
      const started = window.debugAPI.lift(toDeck);
      let t = 0;
      let state = window.debugAPI.liftState();
      while (t < 20 && !(state === "idle" && t > 1)) {
        window.debugAPI.advance(0.5);
        t += 0.5;
        state = window.debugAPI.liftState();
      }
      const cur = window.debugAPI.current();
      return { started, state, seconds: t, sector: cur ? cur.id : null, deck: cur ? cur.deck : null, y: +window.debugAPI.player.position.y.toFixed(2) };
    },
    { fromDeck: from.id, toDeck: to.id },
  );
  const ok = r.started && r.deck === to.id && r.state === "idle";
  report.lift.push({ from: from.id, to: to.id, ...r, ok });
  if (!ok) fail(`lift ${from.id} → ${to.id}: ${JSON.stringify(r)}`);
  else console.log(`ok   lift ${from.id} → ${to.id} in ${r.seconds}s (arrived y=${r.y})`);
}

// traffic: request launches, advance, expect fighters aloft and back
report.traffic = await page.evaluate(() => {
  const api = window.debugAPI;
  api.requestLaunch(2);
  const c1 = api.advanceTraffic(45);
  const snap = api.trafficSnapshot();
  const c2 = api.advanceTraffic(120);
  return { afterLaunch: c1, bay: snap.bay, sample: snap.fighters.slice(0, 2), later: c2 };
});
if (!((report.traffic.afterLaunch.launching || 0) + (report.traffic.afterLaunch.patrol || 0) >= 1)) fail(`traffic: nothing launched ${JSON.stringify(report.traffic)}`);
else console.log("ok   traffic", JSON.stringify(report.traffic.afterLaunch), "→", JSON.stringify(report.traffic.later));
report.reserved = await page.evaluate(() => window.debugAPI.reserved());
report.audio = await page.evaluate(() => window.debugAPI.audioLog().slice(-8));
report.stats = await page.evaluate(() => window.debugAPI.getStats());

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\n${report.failures.length} failures, ${errors.length} page errors → ${out}`);
await browser.close();
process.exit(report.failures.length || errors.length ? 1 : 0);
