// Navigation sweep (headless, SwiftShader) for the technical validation:
//   - every door in layout.DOORS, both directions: teleport 3 m in front of the door inside room A (setView
//     interior), walk toward room B with collision + door / lift simulation until the player is ≥ 1 m past the
//     door plane inside room B (or fails: door never unblocks, blocked by geometry, gap in the floor, fall);
//     then walk from the doorway toward room B's spawn point and report what blocks the straight line
//   - static probe: colliders standing in the 2 m in front of every door on both sides (0.48..1.85 m above the sill)
//   - every turbolift cab (4 lobbies × 2 cabs) to all 3 destinations: walk in, ride, arrive, walk out
//   - stairs: bridge pit flights, hangar stair tower → flight control, reactor switchbacks → catwalk ring,
//     briefing tiers
// Usage: node tools/walktest.mjs [url] [--out=shots/validator] [--json=/tmp/walktest.json] [--only=doors|lifts|stairs]
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const pos = args.filter((a) => !a.startsWith("--"));
const url = pos[0] || "http://127.0.0.1:5173/";
const outDir = resolve(flags.out || "shots/validator");
const jsonPath = flags.json ? resolve(flags.json) : null;
const only = flags.only ? flags.only.split(",") : ["doors", "lifts", "stairs"];
mkdirSync(outDir, { recursive: true });

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("[console.error] " + m.text().slice(0, 300)));
const tLoad = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
console.log(`ready in ${Date.now() - tLoad} ms`);
const ev = (fn, arg) => page.evaluate(fn, arg);
const settle = async (n = 2) => {
  const f0 = await ev(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 300000 });
};
// The walking simulation needs no frames (nudge / simulate drive doors, lifts and rooms directly), and on
// software GL every frame costs seconds: gate requestAnimationFrame so the app's render loop is paused while
// tests run in-page and resumed only for screenshots (pending callbacks are replayed on resume).
await ev(() => {
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
const pause = () => ev(() => window.__pause());
const resume = () => ev(() => window.__resume());
await pause();

const results = { doors: [], blockers: [], lifts: [], stairs: [], errors };
let shotN = 0;
async function shot(name) {
  await resume();
  await settle(2);
  const file = resolve(outDir, `${String(++shotN).padStart(2, "0")}_${name}.png`);
  await page.screenshot({ path: file, timeout: 300000 });
  await pause();
  return file;
}

// ---------------------------------------------------------------------------------------------------
// In-page helpers (installed once)
// ---------------------------------------------------------------------------------------------------
await ev(() => {
  const d = window.debugAPI;
  const R = d.layout.ROOM_BY_ID;
  const STEP = 0.48;
  const HEIGHT = 1.85;
  const RADIUS = 0.32;
  const round = (v) => +v.toFixed(2);
  const arr = (v) => [round(v.x), round(v.y), round(v.z)];

  function place(pos, yawDeg) {
    d.setView({ mode: "interior", pos, yaw: yawDeg, pitch: 0 });
    return d.rooms.current ? d.rooms.current.id : null;
  }
  /** One walking step of (dx, dz) with collision; simulates simDt seconds of doors / lifts / rooms. */
  function walk(dx, dz, simDt = 0.1) {
    const steps = Math.max(Math.ceil(Math.hypot(dx, dz) / 0.2), Math.round(simDt * 60));
    const r = d.nudge(dx, dz, steps);
    return { pos: r.pos, room: r.room, ground: d.player.groundHeight() };
  }
  /** Colliders overlapping the player's capsule pushed `ahead` metres along (ux, uz); floors excluded. */
  function probe(ux, uz, ahead = 0.7) {
    const p = d.player.position;
    const cx = p.x + ux * ahead;
    const cz = p.z + uz * ahead;
    const hits = [];
    for (const c of d.rooms.activeColliders) {
      if (c.enabled === false) continue;
      if (c.max.y < p.y + STEP || c.min.y >= p.y + HEIGHT) continue;
      const qx = Math.min(Math.max(cx, c.min.x), c.max.x);
      const qz = Math.min(Math.max(cz, c.min.z), c.max.z);
      if ((cx - qx) ** 2 + (cz - qz) ** 2 < (RADIUS + 0.25) ** 2) hits.push(`${c.tag || "?"}[${arr(c.min)}→${arr(c.max)}]`);
    }
    return hits.slice(0, 6);
  }
  /** Let gravity act for up to `secs` (no input); returns the new y and whether a floor was found. */
  function fall(secs) {
    const p = d.player;
    p.frozen = false;
    p.locked = true;
    let t = 0;
    while (t < secs) {
      p.update(1 / 30);
      t += 1 / 30;
      if (p.onGround) break;
    }
    p.frozen = true;
    return { y: round(p.position.y), onGround: p.onGround };
  }

  /** Door geometry seen from room `fromId`: start pose 3 m in front, unit walking direction, yaw. */
  function approach(spec, fromId, dist = 3) {
    const from = R[fromId];
    const to = R[spec.a === fromId ? spec.b : spec.a];
    const y = spec.y !== undefined ? spec.y : Math.max(from.floor, to.floor);
    const mid = (spec.from + spec.to) / 2;
    if (spec.axis === "z") {
      const s = (from.box[2] + from.box[3]) / 2 < spec.at ? 1 : -1;
      return { start: [mid, y, spec.at - dist * s], dir: [0, s], yaw: s > 0 ? 180 : 0, y, toId: to.id };
    }
    const s = (from.box[0] + from.box[1]) / 2 < spec.at ? 1 : -1;
    return { start: [spec.at - dist * s, y, mid], dir: [s, 0], yaw: s > 0 ? -90 : 90, y, toId: to.id };
  }

  // per-door start overrides (documented deviations from the door centre)
  const OVERRIDES = {
    // hg_fc: the declared 20 m "open" front of the booth is glass; only the 1.2 m gap at z -11.2..-10 passes
    "hg_fc:hangar": { start: [37, -22, -10.6], note: "gap in the glass front (z -11.2..-10), gallery level y -22" },
    "hg_fc:flight_control": { start: [43, -22, -10.6], note: "gap in the glass front (z -11.2..-10)" },
    // bridge side doors open onto the 2 m outer ledge between the wall and the crew pit railing: 3 m in front
    // of the door is inside the pit, so start on the ledge 1 m from the door
    "br_tac:bridge": { start: [-13, 210, 187.5], note: "outer ledge x -14..-12 (3 m in front is the crew pit)" },
    "br_nav:bridge": { start: [13, 210, 187.5], note: "outer ledge x 12..14 (3 m in front is the crew pit)" },
  };

  function doorTest(doorId, fromId, useOverride = true) {
    const rec = d.doors.doors.get(doorId);
    const spec = rec.spec;
    const ap = approach(spec, fromId);
    const ov = useOverride && OVERRIDES[`${doorId}:${fromId}`];
    const start = ov ? ov.start : ap.start;
    const to = R[ap.toId];
    const from = R[fromId];
    const t0 = performance.now();
    const startRoom = place(start, ap.yaw);
    const out = { door: doorId, kind: spec.kind, from: fromId, to: ap.toId, start: start.map(round), startRoom, override: ov ? ov.note : null, built: rec.built, opened: null, openAt: null, unblockedAt: null, reached: false, travelled: 0, stuck: null, gap: null, fell: null, path: [], toSpawn: null };
    if (startRoom !== fromId) out.warn = `start resolves to room ${startRoom}`;
    const [ux, uz] = ap.dir;
    let last = [...start];
    let stuck = 0;
    let travelled = 0;
    const MAX = 14;
    while (travelled < MAX) {
      const r = walk(ux * 0.5, uz * 0.5, 0.1);
      travelled += 0.5;
      const p = r.pos;
      const moved = Math.hypot(p[0] - last[0], p[2] - last[2]);
      last = p;
      if (rec.built && rec.kind.speed > 0) {
        if (out.openAt === null && rec.openness > 0.02) out.openAt = round(travelled);
        if (out.unblockedAt === null && rec.openness >= 0.8) out.unblockedAt = round(travelled);
      }
      if (r.ground === null && !out.gap) {
        const f = fall(1.5);
        out.gap = { at: p, afterFall: f };
        if (f.y < Math.min(from.floor, to.floor) - 1) out.fell = f;
        if (out.fell) break;
      }
      const past = spec.axis === "z" ? (p[2] - spec.at) * uz : (p[0] - spec.at) * ux;
      if (moved < 0.05) {
        stuck++;
        if (stuck > 30) {
          out.stuck = { at: p, room: r.room, past: round(past), doorOpenness: rec.built ? round(rec.openness) : null, hits: probe(ux, uz) };
          break;
        }
      } else stuck = 0;
      if (r.room === ap.toId && past >= 1.0) {
        out.reached = true;
        out.travelled = round(travelled);
        out.end = p;
        break;
      }
    }
    if (!out.reached && !out.stuck && !out.fell) out.stuck = { at: last, room: d.rooms.current && d.rooms.current.id, past: null, note: `walked ${MAX} m without entering ${ap.toId}`, hits: probe(ux, uz) };
    out.opened = rec.built ? (rec.kind.speed === 0 ? "permanent" : rec.openness > 0.02) : "not built";
    out.simSeconds = round(travelled / 5);
    // from the doorway toward the room's spawn
    if (out.reached) {
      const s = to.spawn;
      const p = d.player.position;
      const total = Math.hypot(s[0] - p.x, s[2] - p.z);
      let walked = 0;
      let st = 0;
      let res = { ok: false, dist: round(total) };
      let prev = [p.x, p.z];
      while (walked < total + 1) {
        const dx = s[0] - p.x;
        const dz = s[2] - p.z;
        const dd = Math.hypot(dx, dz);
        if (dd < 0.6) {
          res.ok = true;
          break;
        }
        const step = Math.min(0.5, dd);
        const r = walk((dx / dd) * step, (dz / dd) * step, 0.1);
        walked += step;
        if (r.ground === null) {
          res.gap = r.pos;
          const f = fall(1.5);
          if (f.y < to.floor - 1) {
            res.fell = f;
            break;
          }
        }
        if (r.room !== ap.toId) {
          res.leftRoom = r.room;
          res.at = r.pos;
          break;
        }
        const mv = Math.hypot(p.x - prev[0], p.z - prev[1]);
        prev = [p.x, p.z];
        if (mv < 0.05) {
          if (++st > 8) {
            res.blockedAt = r.pos;
            res.remaining = round(dd);
            res.hits = probe(dx / dd, dz / dd);
            break;
          }
        } else st = 0;
      }
      if (!res.ok && !res.fell && !res.leftRoom && !res.blockedAt) res.notReached = { at: arr(p), remaining: round(Math.hypot(s[0] - p.x, s[2] - p.z)), note: "deflected along obstacles; spawn not reached on a straight line" };
      res.walked = round(walked);
      res.y = round(p.y);
      out.toSpawn = res;
    }
    out.ms = Math.round(performance.now() - t0);
    return out;
  }

  /** Lane scan for a failed door: try the walk at 1 m lateral offsets across the span; returns passable lanes. */
  function laneScan(doorId, fromId) {
    const spec = d.doors.doors.get(doorId).spec;
    const ap = approach(spec, fromId);
    const toId = ap.toId;
    const [ux, uz] = ap.dir;
    const lanes = [];
    for (let u = spec.from + 0.5; u <= spec.to - 0.5 + 1e-6; u += 1) {
      const start = spec.axis === "z" ? [u, ap.y, ap.start[2]] : [ap.start[0], ap.y, u];
      place(start, ap.yaw);
      let ok = false;
      let last = [...start];
      let stuck = 0;
      for (let travelled = 0; travelled < 12; travelled += 0.5) {
        const r = walk(ux * 0.5, uz * 0.5, 0.1);
        const p = r.pos;
        const moved = Math.hypot(p[0] - last[0], p[2] - last[2]);
        last = p;
        if (moved < 0.05 && ++stuck > 30) break;
        if (moved >= 0.05) stuck = 0;
        const past = spec.axis === "z" ? (p[2] - spec.at) * uz : (p[0] - spec.at) * ux;
        if (r.room === toId && past >= 1.0) {
          ok = true;
          break;
        }
      }
      lanes.push({ u: round(u), ok, end: last });
    }
    const passable = lanes.filter((l) => l.ok).map((l) => l.u);
    return { door: doorId, from: fromId, axisAcross: spec.axis === "z" ? "x" : "z", span: [spec.from, spec.to], passable, blockedLanes: lanes.filter((l) => !l.ok).map((l) => l.u) };
  }

  /** Static: colliders in the 2 m in front of the door on the `roomId` side (above step height, below head). */
  function frontBlockers(doorId, roomId) {
    const spec = d.doors.doors.get(doorId).spec;
    const rec = d.rooms.rooms.get(roomId);
    if (!rec || !rec.built) return { door: doorId, room: roomId, built: false, hits: [] };
    const ap = approach(spec, roomId, 0);
    const y = ap.y;
    const [ux, uz] = ap.dir; // walking direction = into the wall; the room is behind the start
    let box;
    if (spec.axis === "z") {
      const z0 = spec.at - uz * 0.3;
      const z1 = spec.at - uz * 2.0;
      box = { x0: spec.from + 0.1, x1: spec.to - 0.1, z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
    } else {
      const x0 = spec.at - ux * 0.3;
      const x1 = spec.at - ux * 2.0;
      box = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: spec.from + 0.1, z1: spec.to - 0.1 };
    }
    const hits = [];
    for (const c of rec.ctx.kit.colliders) {
      if (c.max.y <= y + STEP || c.min.y >= y + HEIGHT) continue;
      if (c.max.x <= box.x0 || c.min.x >= box.x1 || c.max.z <= box.z0 || c.min.z >= box.z1) continue;
      hits.push({ tag: c.tag || "?", min: arr(c.min), max: arr(c.max) });
    }
    return { door: doorId, room: roomId, kind: spec.kind, built: true, box, hits };
  }

  function liftTest(lobbyId, cabIdx, destId) {
    const lobby = R[lobbyId];
    const t0 = performance.now();
    place([lobby.spawn[0], lobby.floor, lobby.spawn[2]], lobby.spawn[3]);
    const cab = d.lifts.cabs.get(lobbyId + ":" + cabIdx);
    const out = { lobby: lobbyId, cab: cabIdx, dest: destId, ok: false };
    if (!cab) return { ...out, error: "cab not built" };
    const inward = cab.box.inward; // from the cab toward the lobby
    place([cab.center.x, lobby.floor, cab.doorZ + inward * 2.5], inward > 0 ? 0 : 180);
    let entered = false;
    let stuck = 0;
    let last = d.player.position.z;
    for (let i = 0; i < 16; i++) {
      const r = walk(0, -inward * 0.5, 0.1);
      if (Math.abs(r.pos[2] - last) < 0.05) stuck++;
      else stuck = 0;
      last = r.pos[2];
      if (Math.abs(r.pos[2] - cab.center.z) < 0.6) {
        entered = true;
        break;
      }
      if (stuck > 8) break;
    }
    out.entered = entered;
    out.cabDoorOpenness = round(cab.openness);
    out.inCabPos = arr(d.player.position);
    if (!entered) out.enterHits = probe(0, -inward);
    d.lifts.startRide(cab, destId);
    let simT = 0;
    const t1 = performance.now();
    while (d.lifts.ride && simT < 25) {
      d.lifts.update(1 / 60, d.player.position);
      d.rooms.step();
      d.rooms.update(1 / 60, 0, d.player.position);
      simT += 1 / 60;
    }
    out.rideSimS = round(simT);
    out.rideWallMs = Math.round(performance.now() - t1);
    out.rideFinished = !d.lifts.ride;
    const dest = R[destId];
    const destCab = d.lifts.cabs.get(destId + ":" + cabIdx);
    const p = d.player.position;
    out.arrivedRoom = d.rooms.current ? d.rooms.current.id : null;
    out.arrivedPos = arr(p);
    out.yaw = round((d.player.yaw * 180) / Math.PI);
    if (destCab) {
      const b = destCab.box;
      out.inDestCab = p.x > b.x0 - 0.05 && p.x < b.x1 + 0.05 && p.z > Math.min(b.z0, b.z1) - 0.05 && p.z < Math.max(b.z0, b.z1) + 0.05 && Math.abs(p.y - dest.floor) < 0.05;
      out.destDoorTarget = destCab.target;
      // walk out into the lobby
      const inw = destCab.box.inward;
      let lz = p.z;
      let st = 0;
      out.walkedOut = false;
      for (let i = 0; i < 14; i++) {
        const r = walk(0, inw * 0.5, 0.1);
        if (Math.abs(r.pos[2] - lz) < 0.05) st++;
        else st = 0;
        lz = r.pos[2];
        if (r.room === destId && (r.pos[2] - destCab.doorZ) * inw > 1.5) {
          out.walkedOut = true;
          break;
        }
        if (st > 8) {
          out.exitHits = probe(0, inw);
          break;
        }
      }
      out.outPos = arr(p);
      out.destDoorOpenness = round(destCab.openness);
    } else out.inDestCab = false;
    out.clustersAfter = d.rooms.stats().clusters;
    out.ok = entered && out.rideFinished && out.arrivedRoom === destId && !!out.inDestCab && !!out.walkedOut;
    out.ms = Math.round(performance.now() - t0);
    return out;
  }

  /** Walk a list of legs [{dx, dz, y (expected floor), tol}] from a start pose; reports y per leg, gaps, stuck. */
  function pathTest(name, start, yaw, legs) {
    const t0 = performance.now();
    const room0 = place(start, yaw);
    const out = { name, start, startRoom: room0, legs: [], ok: true };
    for (const leg of legs) {
      const len = Math.hypot(leg.dx, leg.dz);
      const n = Math.max(1, Math.ceil(len / 0.5));
      let gap = null;
      let stuck = 0;
      let blocked = null;
      let prev = [d.player.position.x, d.player.position.z];
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < n; i++) {
        const r = walk(leg.dx / n, leg.dz / n, 0.1);
        minY = Math.min(minY, r.pos[1]);
        maxY = Math.max(maxY, r.pos[1]);
        if (r.ground === null && !gap) gap = { at: r.pos, afterFall: fall(1.0) };
        const mv = Math.hypot(r.pos[0] - prev[0], r.pos[2] - prev[1]);
        prev = [r.pos[0], r.pos[2]];
        if (mv < 0.05) {
          if (++stuck > 6) {
            blocked = { at: r.pos, hits: probe(leg.dx / len, leg.dz / len) };
            break;
          }
        } else stuck = 0;
      }
      const p = d.player.position;
      const yOk = leg.y === undefined || Math.abs(p.y - leg.y) <= (leg.tol || 0.06);
      const roomOk = !leg.room || (d.rooms.current && d.rooms.current.id === leg.room);
      const l = { leg: leg.label || `${leg.dx},${leg.dz}`, end: arr(p), room: d.rooms.current && d.rooms.current.id, expectY: leg.y, yOk, roomOk, minY: round(minY), maxY: round(maxY), gap, blocked };
      if (!yOk || !roomOk || gap || blocked) out.ok = false;
      out.legs.push(l);
      if (blocked) break;
    }
    out.ms = Math.round(performance.now() - t0);
    return out;
  }

  window.__wt = { doorTest, frontBlockers, liftTest, pathTest, doors: [...d.doors.doors.keys()], lobbies: ["lift_lobby_tower", "crew_lobby", "hangar_lobby", "eng_lobby"] };
});

// ---------------------------------------------------------------------------------------------------
// 1. doors (both directions) + spawn walks
// ---------------------------------------------------------------------------------------------------
const doorSpecs = await ev(() => [...window.debugAPI.doors.doors.values()].map((r) => ({ id: r.spec.id, a: r.spec.a, b: r.spec.b, kind: r.spec.kind })));
if (only.includes("doors")) {
  console.log(`\n== doors: ${doorSpecs.length} × 2 directions`);
  for (const s of doorSpecs) {
    for (const from of [s.a, s.b]) {
      const r = await ev(([id, f]) => window.__wt.doorTest(id, f), [s.id, from]);
      results.doors.push(r);
      const spawn = r.toSpawn ? (r.toSpawn.ok ? `spawn ok (${r.toSpawn.walked} m)` : r.toSpawn.fell ? `SPAWN WALK FELL ${JSON.stringify(r.toSpawn)}` : r.toSpawn.leftRoom ? `spawn walk left room → ${r.toSpawn.leftRoom} at ${r.toSpawn.at}` : r.toSpawn.blockedAt ? `spawn walk blocked ${r.toSpawn.remaining} m short at ${r.toSpawn.blockedAt} by ${(r.toSpawn.hits || []).join("; ")}` : `spawn walk deflected, ${r.toSpawn.notReached.remaining} m short at ${r.toSpawn.notReached.at}`) : "";
      const status = r.reached ? "PASS" : "FAIL";
      console.log(`${status} ${s.id.padEnd(16)} ${(r.kind + "").padEnd(6)} ${from.padEnd(18)}→ ${r.to.padEnd(18)} ${r.reached ? `through in ${r.travelled} m (door open at ${r.openAt ?? "-"} m, unblocked at ${r.unblockedAt ?? "-"} m)` : JSON.stringify(r.stuck || r.fell)}${r.gap ? ` GAP ${JSON.stringify(r.gap)}` : ""}${r.warn ? ` WARN ${r.warn}` : ""}${r.override ? ` [override: ${r.override}]` : ""} | ${spawn}`);
      if (!r.reached || r.fell || (r.toSpawn && (r.toSpawn.fell || r.toSpawn.gap))) r.shot = await shot(`door_${s.id}_from_${from}`);
    }
  }
  // overridden doors without the override: is the generic "3 m in front of the door centre" approach passable?
  for (const [id, from] of [
    ["hg_fc", "hangar"],
    ["hg_fc", "flight_control"],
    ["br_tac", "bridge"],
    ["br_nav", "bridge"],
  ]) {
    const r = await ev(([i, f]) => window.__wt.doorTest(i, f, false), [id, from]);
    results.doors.push({ ...r, note: "door-centre approach without override" });
    console.log(`${r.reached ? "PASS" : "INFO"} ${id} generic door-centre approach from ${from} (no override): ${r.reached ? `passable (${r.travelled} m)` : "blocked: " + JSON.stringify(r.stuck || r.fell)}`);
  }
  console.log(`\n== static: geometry within 2 m in front of each door (both sides)`);
  for (const s of doorSpecs) {
    for (const room of [s.a, s.b]) {
      const r = await ev(([id, rm]) => window.__wt.frontBlockers(id, rm), [s.id, room]);
      results.blockers.push(r);
      if (!r.built) console.log(`SKIP ${s.id} side ${room}: room not built`);
      else if (r.hits.length) console.log(`WARN ${s.id.padEnd(16)} side ${room.padEnd(18)} ${r.hits.length} collider(s): ${r.hits.map((h) => `${h.tag}[${h.min}→${h.max}]`).join("; ")}`);
    }
  }
  const nBlock = results.blockers.filter((b) => b.hits && b.hits.length).length;
  console.log(`${nBlock} door sides have colliders in their 2 m approach`);
}

// ---------------------------------------------------------------------------------------------------
// 2. turbolifts: 4 lobbies × 2 cabs × 3 destinations
// ---------------------------------------------------------------------------------------------------
if (only.includes("lifts")) {
  console.log(`\n== turbolifts`);
  const lobbies = ["lift_lobby_tower", "crew_lobby", "hangar_lobby", "eng_lobby"];
  for (const lobby of lobbies) {
    for (const cab of [0, 1]) {
      for (const dest of lobbies.filter((l) => l !== lobby)) {
        const r = await ev(([l, c, dd]) => window.__wt.liftTest(l, c, dd), [lobby, cab, dest]);
        results.lifts.push(r);
        console.log(`${r.ok ? "PASS" : "FAIL"} ${lobby}:${cab} → ${dest.padEnd(16)} enter=${r.entered} ride=${r.rideSimS}s (${r.rideWallMs} ms wall) arrived=${r.arrivedRoom} inCab=${r.inDestCab} out=${r.walkedOut} pos=${r.arrivedPos} yaw=${r.yaw} clusters=${(r.clustersAfter || []).join("|")}${r.error ? " " + r.error : ""}${r.enterHits ? " enterHits=" + r.enterHits.join(";") : ""}${r.exitHits ? " exitHits=" + r.exitHits.join(";") : ""}`);
        if (!r.ok) r.shot = await shot(`lift_${lobby}_${cab}_to_${dest}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// 3. stairs
// ---------------------------------------------------------------------------------------------------
if (only.includes("stairs")) {
  console.log(`\n== stairs`);
  const STAIRS = [
    { name: "bridge pit port, aft flight (z 200): walkway → pit → walkway", start: [-2, 210, 200], yaw: 90, legs: [{ label: "down to x -8", dx: -6, dz: 0, y: 208.6 }, { label: "back up to x -2", dx: 6, dz: 0, y: 210 }] },
    { name: "bridge pit port, forward flight (z 181.2)", start: [-2, 210, 181.2], yaw: 90, legs: [{ label: "down to x -8", dx: -6, dz: 0, y: 208.6 }, { label: "back up to x -2", dx: 6, dz: 0, y: 210 }] },
    { name: "bridge pit starboard, aft flight (z 200)", start: [2, 210, 200], yaw: -90, legs: [{ label: "down to x 8", dx: 6, dz: 0, y: 208.6 }, { label: "back up to x 2", dx: -6, dz: 0, y: 210 }] },
    { name: "bridge pit starboard, forward flight (z 181.2)", start: [2, 210, 181.2], yaw: -90, legs: [{ label: "down to x 8", dx: 6, dz: 0, y: 208.6 }, { label: "back up to x 2", dx: -6, dz: 0, y: 210 }] },
    {
      name: "hangar stair tower (36,-30) → landing → gallery → flight control booth",
      start: [36, -40, -30],
      yaw: 0,
      legs: [
        { label: "flight A up to the landing (z -41)", dx: 0, dz: -11, y: -32 },
        { label: "across the landing to x 33.2", dx: -2.8, dz: 0, y: -32 },
        { label: "flight B up to the tower head (z -28.5)", dx: 0, dz: 12.5, y: -22 },
        { label: "forward on the tower head to z -27 (clear of the stair-head railing)", dx: 0, dz: 1.5, y: -22 },
        { label: "onto the gallery x 38", dx: 4.8, dz: 0, y: -22 },
        { label: "along the gallery to the glass gap (z -10.6)", dx: 0, dz: 16.4, y: -22 },
        { label: "through the gap into the booth (x 42)", dx: 4, dz: 0, y: -22, room: "flight_control" },
        { label: "back out onto the gallery", dx: -4, dz: 0, y: -22, room: "hangar" },
      ],
    },
    {
      name: "hangar stair tower down: gallery → landing → deck",
      start: [33.2, -22, -27],
      yaw: 0,
      legs: [
        { label: "flight B down to the landing (z -42)", dx: 0, dz: -15, y: -32 },
        { label: "across to x 36", dx: 2.8, dz: 0, y: -32 },
        { label: "flight A down to the deck (z -30)", dx: 0, dz: 12, y: -40 },
      ],
    },
    {
      name: "reactor west switchback → catwalk ring",
      start: [-14.5, -10, 342],
      yaw: 180,
      legs: [
        { label: "flight 1 up to the landing (z 352.5)", dx: 0, dz: 10.5, y: -5 },
        { label: "across the landing to x -17", dx: -2.5, dz: 0, y: -5 },
        { label: "flight 2 up to the bridge (z 343)", dx: 0, dz: -9.5, y: 0 },
        { label: "onto the west ring (x -10)", dx: 7, dz: 0, y: 0 },
      ],
    },
    {
      name: "reactor east switchback → catwalk ring",
      start: [19.5, -10, 342],
      yaw: 180,
      legs: [
        { label: "flight 1 up to the landing (z 352.5)", dx: 0, dz: 10.5, y: -5 },
        { label: "across the landing to x 17", dx: -2.5, dz: 0, y: -5 },
        { label: "flight 2 up to the bridge (z 343)", dx: 0, dz: -9.5, y: 0 },
        { label: "onto the east ring (x 10)", dx: -7, dz: 0, y: 0 },
      ],
    },
    {
      name: "reactor west switchback down",
      start: [-17, 0, 343],
      yaw: 180,
      legs: [
        { label: "flight 2 down to the landing (z 352.5)", dx: 0, dz: 9.5, y: -5 },
        { label: "across to x -14.5", dx: 2.5, dz: 0, y: -5 },
        { label: "flight 1 down to the floor (z 342)", dx: 0, dz: -10.5, y: -10 },
      ],
    },
    {
      name: "briefing tiers: door → top tier → front row → back",
      start: [-22.5, 210, 213],
      yaw: 180,
      legs: [
        { label: "two-step stair onto tier 0 (z 216.5)", dx: 0, dz: 3.5, y: 210.6 },
        { label: "down to tier 1 (z 219.1)", dx: 0, dz: 2.6, y: 210.3 },
        { label: "down to the floor tier (z 221.7)", dx: 0, dz: 2.6, y: 210 },
        { label: "back up to the door (z 213)", dx: 0, dz: -8.7, y: 210 },
      ],
    },
  ];
  for (const s of STAIRS) {
    const r = await ev((spec) => window.__wt.pathTest(spec.name, spec.start, spec.yaw, spec.legs), s);
    results.stairs.push(r);
    console.log(`${r.ok ? "PASS" : "FAIL"} ${s.name} (start room ${r.startRoom})`);
    for (const l of r.legs) console.log(`      ${l.yOk && l.roomOk && !l.gap && !l.blocked ? "ok  " : "BAD "} ${l.leg.padEnd(48)} end ${JSON.stringify(l.end)} room ${l.room} y ${l.end[1]} (expect ${l.expectY ?? "-"}) range ${l.minY}..${l.maxY}${l.gap ? " GAP " + JSON.stringify(l.gap) : ""}${l.blocked ? " BLOCKED " + JSON.stringify(l.blocked) : ""}`);
    r.shot = await shot(`stairs_${s.name.replace(/[^a-z0-9]+/gi, "_").slice(0, 40)}`);
  }
}

// ---------------------------------------------------------------------------------------------------
const nd = results.doors.filter((r) => !r.note);
const summary = {
  doors: { total: nd.length, passed: nd.filter((r) => r.reached).length, failed: nd.filter((r) => !r.reached).map((r) => `${r.door} from ${r.from}`), gaps: nd.filter((r) => r.gap).map((r) => `${r.door} from ${r.from}`), spawnBlocked: nd.filter((r) => r.toSpawn && !r.toSpawn.ok).map((r) => `${r.to} via ${r.door}: ${r.toSpawn.leftRoom ? "left room → " + r.toSpawn.leftRoom : r.toSpawn.fell ? "FELL" : `${r.toSpawn.remaining} m short`}`) },
  blockers: results.blockers.filter((b) => b.hits && b.hits.length).map((b) => `${b.door}/${b.room}: ${b.hits.map((h) => h.tag).join(",")}`),
  lifts: { total: results.lifts.length, passed: results.lifts.filter((r) => r.ok).length, failed: results.lifts.filter((r) => !r.ok).map((r) => `${r.lobby}:${r.cab}→${r.dest}`) },
  stairs: { total: results.stairs.length, passed: results.stairs.filter((r) => r.ok).length, failed: results.stairs.filter((r) => !r.ok).map((r) => r.name) },
  errors,
};
console.log("\n== summary\n" + JSON.stringify(summary, null, 1));
if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ summary, results }, null, 1));
if (errors.length) console.log("PAGE ERRORS:\n  " + errors.slice(0, 20).join("\n  "));
await browser.close();
const failed = summary.doors.failed.length + summary.lifts.failed.length + summary.stairs.failed.length;
process.exit(failed || errors.length ? 1 : 0);
