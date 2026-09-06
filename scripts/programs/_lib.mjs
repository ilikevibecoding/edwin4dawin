// Shared harness for the twenty program completion tests (rubric 16 C11-C13), reused by the scorer, the
// similarity tool and the dossier writer. Everything offline against blueprints; the CDP walk (--url) is the only
// part that needs the running game.
//
//   analyzeBlueprint(bp, lot)      reachability flood fill from the doors (the landmark-stats rule), per-room stats
//   checkHost(lot, layout)         the program's completion test on one host lot
//   checkProgram(id, layout)       every host of a program
//   runProgramTest(id, argv)       CLI entry used by scripts/programs/<program>.mjs
import { initBlocks, BLOCKS, B, SHAPE } from '../../src/blocks.js';
import { getLayout } from '../../src/coruscant/layout.js';
import { FORCE_AIR } from '../../src/coruscant/blueprint.js';
import { blueprintFor } from '../../src/coruscant/buildings.js';
import { purposeFor } from '../../src/coruscant/purposes.js';
import { programFor, hostTable, hostsOf, PROGRAMS, PROGRAM_BY_ID, INTERACTIONS, EXTENDED_MIN_ROOMS } from '../../src/coruscant/programs/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';

export { PROGRAMS, PROGRAM_BY_ID, INTERACTIONS, EXTENDED_MIN_ROOMS, hostTable, hostsOf, programFor, purposeFor, blueprintFor };

export const DENSITY_BAR = 1 / 6;   // the landmark bar (scripts/landmark-stats.mjs)
// a hall, yard or concourse (over HALL_CELLS floor cells) is judged at half the bar: its function is its open floor
// (spec 17: "a kiosk is judged against its legitimate function, not the square footage of a hospital")
export const HALL_CELLS = 400, HALL_BAR = 1 / 12;
export const barFor = (stat) => (stat.floorCells > HALL_CELLS ? HALL_BAR : DENSITY_BAR);

let inited = false;
export function city(seed = 1337) {
  if (!inited) { initBlocks(); inited = true; }
  return getLayout(seed);
}

export function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1]; if (v !== undefined && !v.startsWith('--')) { o[k] = v; i++; } else o[k] = true; }
    else o._.push(a);
  }
  return o;
}

const blk = (v) => BLOCKS[v];
export const isAir = (v) => v === 0 || v === FORCE_AIR;
const passable = (v) => isAir(v) || !blk(v) || !blk(v).solid || blk(v).shape === SHAPE.DOOR || blk(v).shape === SHAPE.SALOON_DOOR;
const lowStep = (v) => !isAir(v) && blk(v) && (blk(v).shape === SHAPE.SLAB || blk(v).shape === SHAPE.RAIL || blk(v).shape === SHAPE.FARMLAND);
const standable = (v) => !isAir(v) && blk(v) && blk(v).solid;
const emits = (v) => !isAir(v) && blk(v) && blk(v).emit > 0;

/**
 * Reachability and per-room statistics of a built blueprint (world-coordinate meta, local blocks).
 * The flood fill is the landmark-stats rule: a standing cell has passable feet and head cells and support below
 * (or a slab in the feet cell); moves are 4-neighbour steps with dy in [-3, +1]; lift shafts connect every level
 * they span. Parents are kept so a path from the door to any cell can be read back (the CDP walk).
 */
export function analyzeBlueprint(bp, lot) {
  const { w, h, d } = bp;
  const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 0 : bp.blocks[(x * d + z) * h + y];
  const key = (x, y, z) => (x * d + z) * h + y;
  const standing = (x, y, z) => {
    if (x < 0 || z < 0 || x >= w || z >= d || y < 1 || y + 1 >= h) return false;
    const feet = at(x, y, z), head = at(x, y + 1, z);
    if (!passable(head)) return false;
    if (lowStep(feet)) return true;
    return passable(feet) && (standable(at(x, y - 1, z)) || lowStep(at(x, y - 1, z)));
  };
  const visited = new Uint8Array(w * h * d);
  const parent = new Int32Array(w * h * d).fill(-1);
  const queue = [];
  const push = (x, y, z, from) => { const k = key(x, y, z); if (standing(x, y, z) && !visited[k]) { visited[k] = 1; parent[k] = from; queue.push(x, y, z); return true; } return false; };
  const doorLocal = lot.door ? { x: (lot.door.in ? lot.door.in.x : lot.door.x) - lot.x0, z: (lot.door.in ? lot.door.in.z : lot.door.z) - lot.z0 } : { x: w >> 1, z: d - 2 };
  const seeds = [];
  for (let dy = 0; dy <= 3; dy++) {
    if (push(doorLocal.x, 1 + dy, doorLocal.z, -2)) seeds.push(key(doorLocal.x, 1 + dy, doorLocal.z));
    if (lot.door && push(lot.door.x - lot.x0, 1 + dy, lot.door.z - lot.z0, -2)) seeds.push(key(lot.door.x - lot.x0, 1 + dy, lot.door.z - lot.z0));
  }
  const publicDoors = (bp.meta.doors || []).filter((dr) => dr.side !== 'service');
  for (const dr of publicDoors) for (let dy = -1; dy <= 2; dy++) if (push(dr.x - lot.x0, dr.y - bp.y0 + dy, dr.z - lot.z0, -2)) seeds.push(key(dr.x - lot.x0, dr.y - bp.y0 + dy, dr.z - lot.z0));
  const liftCols = (bp.meta.lifts || []).map((l) => ({ x: l.x - lot.x0, z: l.z - lot.z0, y0: l.y0 - bp.y0, y1: l.y1 - bp.y0 }));
  let head = 0, reachCount = 0;
  while (head < queue.length) {
    const x = queue[head++], y = queue[head++], z = queue[head++];
    const from = key(x, y, z);
    reachCount++;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let dy = 1; dy >= -3; dy--) {
        if (dy === 1 && !passable(at(x, y + 2, z))) continue;
        if (standing(x + dx, y + dy, z + dz)) { push(x + dx, y + dy, z + dz, from); break; }
      }
    }
    for (const l of liftCols) {
      if (Math.abs(l.x - x) > 1 || Math.abs(l.z - z) > 1 || y < l.y0 - 1 || y > l.y1 + 1) continue;
      for (let yy = l.y0; yy <= l.y1 + 1; yy++) for (let dx = -1; dx <= 2; dx++) for (let dz = -1; dz <= 2; dz++) push(l.x + dx, yy, l.z + dz, from);
    }
  }

  // per-room statistics
  const m = bp.meta;
  // raised seats sit one up; a landmark room registered with its walls may be raked or galleried, so its records
  // are taken across the room height
  const inRect = (p, r, tall) => p.x >= r.x && p.x < r.x + r.w && p.z >= r.z && p.z < r.z + r.d && (tall ? (p.y >= r.y - 5 && p.y <= r.y + 5) : (p.y >= r.y && p.y <= r.y + 1));
  const rooms = m.rooms.map((r) => {
    const rx0 = r.x - lot.x0, rz0 = r.z - lot.z0, ry = r.y - bp.y0, rx1 = rx0 + r.w - 1, rz1 = rz0 + r.d - 1;
    // landmark modules register rooms with their walls; planner rooms as the interior. A ring that is mostly
    // wall up to the ceiling (solid at ly 2 and 3, where furniture seldom reaches) is excluded from the density
    // (the landmark-stats convention).
    let ring = 0, ringSolid = 0;
    for (let x = rx0; x <= rx1; x++) for (let z = rz0; z <= rz1; z++) {
      if (x === rx0 || x === rx1 || z === rz0 || z === rz1) { ring++; if (standable(at(x, ry + 2, z)) && standable(at(x, ry + 3, z))) ringSolid++; }
    }
    const walled = ring > 0 && ringSolid / ring > 0.5 && r.w > 2 && r.d > 2;
    let floorCells = 0, furniture = 0, reach = false, emit = 0, entry = null;
    const blockIds = new Set(), furnitureIds = new Set();
    // a planner room is registered as its interior: a panel set into its wall ring (the stairwell light of the
    // tower core, a corridor lintel) lights it, so the ring counts toward the light
    if (!walled) for (let x = rx0 - 1; x <= rx1 + 1; x++) for (let z = rz0 - 1; z <= rz1 + 1; z++) {
      if (x >= rx0 && x <= rx1 && z >= rz0 && z <= rz1) continue;
      for (let yy = ry; yy <= ry + 4; yy++) if (emits(at(x, yy, z))) emit++;
    }
    for (let x = rx0; x <= rx1; x++) for (let z = rz0; z <= rz1; z++) {
      for (let yy = ry - 1; yy <= ry + 1; yy++) if (visited[key(x, yy, z)]) { reach = true; if (!entry) entry = { x, y: yy, z }; }
      for (let yy = ry - 1; yy <= ry + 4; yy++) { const v = at(x, yy, z); if (emits(v)) emit++; if (!isAir(v)) blockIds.add(v); }
      if (walled && (x === rx0 || x === rx1 || z === rz0 || z === rz1)) continue;
      floorCells++;
      for (let yy = ry; yy <= ry + 2; yy++) { const v = at(x, yy, z); if (isAir(v)) continue; furniture++; furnitureIds.add(v); }
    }
    const spots = m.spots.filter((p) => inRect(p, r, walled)).map((p) => p.kind);
    const works = m.work.filter((p) => inRect(p, r, walled)).map((p) => p.kind);
    const beds = m.beds.filter((p) => inRect(p, r, walled)).length;
    return { kind: r.kind, x: r.x, y: r.y, z: r.z, w: r.w, d: r.d, floorCells, reach, lit: emit > 0, emit, density: floorCells ? furniture / floorCells : 0, variety: furnitureIds.size, blockIds, spots, works, beds, entry, walled };
  });
  return { visited, parent, key, at, reachCount, rooms, w, h, d, doorLocal, seeds, standing };
}

// read the path (local cells) from a seed to a visited cell
export function pathTo(an, cell) {
  const { parent, key, h, d } = an;
  let k = key(cell.x, cell.y, cell.z);
  if (!an.visited[k]) return null;
  const out = [];
  while (k >= 0) {
    const x = Math.floor(k / (d * h)), rem = k % (d * h), z = Math.floor(rem / h), y = rem % h;
    out.push({ x, y, z });
    k = parent[k];
    if (out.length > 100000) break;
  }
  return out.reverse();
}

// does the room's blueprint evidence support the interaction verb? (INTERACTIONS: every listed group must hold)
export function evidence(verb, stat, ctx = {}) {
  const need = INTERACTIONS[verb];
  if (!need) return false;
  if (need.spots && !need.spots.some((k) => stat.spots.includes(k))) return false;
  if (need.works && !(need.works.includes('*') ? stat.works.length > 0 : need.works.some((k) => stat.works.includes(k)))) return false;
  if (need.blocks && !need.blocks.some((n) => B[n] !== undefined && stat.blockIds.has(B[n]))) return false;
  if (need.beds && !(stat.beds > 0)) return false;
  if (need.lifts && !(ctx.lifts > 0)) return false;
  if (need.serviceDoor && !ctx.serviceDoor) return false;
  return true;
}

/**
 * The completion test of one host lot. Returns { lotId, program, compact, sign, ok, issues, rooms, serviceDoor }.
 * Rules (rubric 16 C11): every core room (and the extended rooms of a non-compact host) is placed or satisfied by
 * a landmark room, every program room is reachable from the public entry, lit and furnished to the landmark bar,
 * every served room has at least one evidenced interaction, and the sign name is present.
 */
export function checkHost(lot, layout, o = {}) {
  const t0 = performance.now();
  const bp = blueprintFor(lot, layout);
  const genMs = performance.now() - t0;
  const purpose = purposeFor(lot, layout);
  const prog = programFor(lot, purpose, layout);
  const rec = bp.meta.program;
  const res = { lotId: lot.id, program: prog ? prog.id : null, family: bp.meta.family, district: lot.district, compact: rec ? rec.compact : null, sign: purpose ? purpose.name : (bp.meta.name || ''), ok: true, issues: [], rooms: [], serviceDoor: !!(rec && rec.serviceDoor), genMs, plannerRooms: bp.meta.rooms.length };
  if (!prog) { res.ok = false; res.issues.push('no program for this lot'); return res; }
  if (!rec) { res.ok = false; res.issues.push('blueprint carries no program record (applyProgram did not run)'); return res; }
  if (!res.sign) { res.ok = false; res.issues.push('no sign name'); }
  const an = analyzeBlueprint(bp, lot);
  res.reachCount = an.reachCount;
  const statOf = (r) => an.rooms.find((s) => s.x === r.x && s.y === r.y && s.z === r.z && s.w === r.w && s.d === r.d);
  const specs = prog.rooms.filter((s) => s.core || !rec.compact);
  const placed = new Map(rec.rooms.map((r) => [r.spec, r]));
  const satisfied = new Map(rec.satisfied.map((s) => [s.kind, s.by]));
  const ctx = { lifts: bp.meta.lifts.length, serviceDoor: rec.serviceDoor };
  for (const spec of specs) {
    const out = { spec: spec.kind, core: spec.core, signature: spec.signature, served: spec.served, status: 'missing', kind: null, reach: null, lit: null, density: null, interactions: [] };
    let stats = null;
    if (placed.has(spec.kind)) {
      const r = placed.get(spec.kind);
      out.status = 'placed'; out.kind = r.kind;
      stats = statOf(r);
      out.at = { x: r.x, y: r.y, z: r.z, w: r.w, d: r.d, floor: r.floor };
    } else if (satisfied.has(spec.kind)) {
      out.status = 'satisfied';
      // the landmark's own hand-built rooms matching the spec's kind pattern: the one with the most evidence
      // (interactions, then reachable and lit, then density) is the room the spec is judged on
      const cands = an.rooms.filter((s) => spec.accept && spec.accept.test(s.kind));
      const rank = (s) => [spec.interactions.filter((v) => evidence(v, s, ctx)).length, Number(s.reach && s.lit), Number(s.density >= barFor(s)), s.density];
      stats = cands.sort((a, b) => { const ra = rank(a), rb = rank(b); for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] - ra[i]; return 0; })[0] || null;
      out.kind = stats ? stats.kind : satisfied.get(spec.kind);
      if (stats) out.at = { x: stats.x, y: stats.y, z: stats.z, w: stats.w, d: stats.d };
    }
    if (out.status === 'missing') { res.ok = false; res.issues.push(`${spec.kind}: missing`); res.rooms.push(out); continue; }
    if (!stats) { res.ok = false; res.issues.push(`${spec.kind}: room record not found in meta.rooms`); res.rooms.push(out); continue; }
    out.reach = stats.reach; out.lit = stats.lit; out.density = +stats.density.toFixed(2); out.variety = stats.variety;
    out.interactions = spec.interactions.filter((v) => evidence(v, stats, ctx));
    if (!stats.reach) { res.ok = false; res.issues.push(`${spec.kind} (${out.kind}): unreachable from the entry`); }
    if (!stats.lit) { res.ok = false; res.issues.push(`${spec.kind} (${out.kind}): unlit`); }
    if (stats.density < barFor(stats)) { res.ok = false; res.issues.push(`${spec.kind} (${out.kind}): sparse (density ${stats.density.toFixed(2)} < ${barFor(stats).toFixed(2)}${stats.floorCells > HALL_CELLS ? ', hall bar' : ''})`); }
    if (spec.served && out.interactions.length === 0) { res.ok = false; res.issues.push(`${spec.kind} (${out.kind}): no evidenced interaction (wanted ${spec.interactions.join(' / ')})`); }
    res.rooms.push(out);
  }
  // the service circulation: a service door where the program asks for one and the host's ground floor allows it
  if (prog.circulation && prog.circulation.service && !rec.serviceDoor) res.notes = ['no exterior back wall on the ground floor: service circulation shares the lobby'];
  if (o.keep) { res.bp = bp; res.an = an; res.prog = prog; }
  return res;
}

// the Senate (rubric 16 C12): rooms by kind pattern, visitor and staff routes by flood fill; never fails the suite
export function checkSenate(lot, layout) {
  const res = checkHost(lot, layout, { keep: true });
  const { bp, an, prog } = res;
  res.soft = true;
  const kinds = bp.meta.rooms.map((r) => r.kind);
  const route = (names) => names.map((n) => {
    const spec = prog.rooms.find((s) => s.kind === n);
    const rooms = spec ? an.rooms.filter((s) => spec.accept && spec.accept.test(s.kind)) : [];
    return { room: n, found: rooms.length, reachable: rooms.filter((s) => s.reach).length };
  });
  res.visitorRoute = route(prog.circulation.public.filter((n) => prog.rooms.some((s) => s.kind === n)));
  res.staffRoute = route([...prog.circulation.staff, ...prog.circulation.service].filter((n) => prog.rooms.some((s) => s.kind === n)));
  res.kindCount = new Set(kinds).size;
  delete res.bp; delete res.an; delete res.prog;
  return res;
}

export function checkProgram(programId, layout, o = {}) {
  const hosts = hostsOf(programId, layout);
  const results = hosts.map((lot) => (programId === 'senate' && lot.kind === 'landmark') ? checkSenate(lot, layout) : checkHost(lot, layout, o));
  const fails = results.filter((r) => !r.ok && !r.soft);
  return { program: programId, hosts: hosts.length, pass: results.filter((r) => r.ok).length, fail: fails.length, results };
}

export function formatHost(r) {
  const head = `  lot ${String(r.lotId).padStart(3)} ${r.family.padEnd(9)} ${r.district.padEnd(13)} ${r.compact ? 'compact ' : 'extended'} rooms ${r.rooms.filter((x) => x.status !== 'missing').length}/${r.rooms.length}${r.serviceDoor ? ' +service door' : ''}  sign "${r.sign}"  ${r.ok ? 'OK' : (r.soft ? 'REPORT' : 'FAIL')}`;
  const lines = [head];
  for (const i of r.issues) lines.push(`      - ${i}`);
  if (r.notes) for (const n of r.notes) lines.push(`      note: ${n}`);
  return lines.join('\n');
}

// ------------------------------------------------------------------------------------------------------------
// CDP walk: street -> entry -> signature room in the running game, with a screenshot of the room.
async function walkHost(programId, lot, layout, url, shotsDir) {
  const { launchPage } = await import('../cdp.mjs');
  const bp = blueprintFor(lot, layout);
  const rec = bp.meta.program;
  const prog = programFor(lot, purposeFor(lot, layout), layout);
  const an = analyzeBlueprint(bp, lot);
  // the signature room: the placed one, else a landmark room matched by the signature spec, else the first placed
  const sigSpec = prog.rooms.find((s) => s.signature);
  let target = rec.rooms.find((r) => r.signature) || null;
  if (!target && sigSpec) { const s = an.rooms.find((r) => sigSpec.accept && sigSpec.accept.test(r.kind) && r.reach); if (s) target = s; }
  if (!target) target = rec.rooms[0];
  if (!target) throw new Error('no program room to walk to');
  const stat = an.rooms.find((s) => s.x === target.x && s.y === target.y && s.z === target.z) || an.rooms.find((s) => s.kind === target.kind);
  if (!stat || !stat.entry) throw new Error(`${target.kind} is not reachable in the offline flood fill`);
  // the deepest reachable standing cell of the room is where the player ends up; the path is read from the parents
  let best = null;
  for (let x = stat.x - lot.x0; x < stat.x - lot.x0 + stat.w; x++) for (let z = stat.z - lot.z0; z < stat.z - lot.z0 + stat.d; z++) {
    const y = stat.y - bp.y0;
    if (an.visited[an.key(x, y, z)]) { const cx = stat.x - lot.x0 + stat.w / 2, cz = stat.z - lot.z0 + stat.d / 2, dd = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (!best || dd < best.dd) best = { x, y, z, dd }; }
  }
  const goal = best || stat.entry;
  const path = pathTo(an, goal);
  if (!path) throw new Error('no path from the door to the signature room');
  const W = (p) => ({ x: lot.x0 + p.x + 0.5, y: bp.y0 + p.y, z: lot.z0 + p.z + 0.5 });
  const door = lot.door, out = door.out || { x: door.x + (door.side === 'E' ? 3 : door.side === 'W' ? -3 : 0), z: door.z + (door.side === 'S' ? 3 : door.side === 'N' ? -3 : 0) };
  const street = { x: out.x + 0.5 + (door.side === 'E' ? 2 : door.side === 'W' ? -2 : 0), y: bp.y0 + 1, z: out.z + 0.5 + (door.side === 'S' ? 2 : door.side === 'N' ? -2 : 0) };
  mkdirSync(shotsDir, { recursive: true });
  const yawDeg = door.side === 'S' ? 0 : door.side === 'N' ? 180 : door.side === 'E' ? 90 : -90;
  const page = await launchPage(`${url.replace(/\/$/, '')}/?x=${street.x}&z=${street.z}&y=${street.y}&yaw=${yawDeg}&time=0.45&fresh=1&mode=creative&quality=light&rd=4`, { width: 1280, height: 800 });
  const log = [];
  try {
    await page.waitForGame();
    await page.evaluate(`window.__p3 = {
      frame: () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
      frames: async (n) => { for (let i = 0; i < n; i++) await window.__p3.frame(); },
      aimAt(x, y, z) { const p = game.player, eye = p.eyePos(1, new (game.camera.position.constructor)()); const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z; p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
      async go(x, y, z, fly) { game.player.flying = !!fly; game.player.teleport(x, y, z); for (let i = 0; i < 90; i++) { await window.__p3.frame(); if (game.world.isLoaded(Math.floor(x), Math.floor(z)) && game.terrain.stats.meshed > 0) break; } await window.__p3.frames(4); return [game.player.pos.x, game.player.pos.y, game.player.pos.z]; },
    }; game.input.locked = true; game.input.onLockChange = null; if (game.hud && game.hud.screen) game.hud.screen = null; 'ok'`);
    // 1. the street, looking at the door
    await page.evaluate(`__p3.go(${street.x}, ${street.y}, ${street.z}, true)`);
    await page.evaluate(`__p3.aimAt(${door.x + 0.5}, ${bp.y0 + 2.2}, ${door.z + 0.5}); 'ok'`);
    await page.sleep(2500);
    await page.evaluate('__p3.frames(10)');
    const streetShot = `${shotsDir}/${programId}_street.png`;
    await page.screenshot(streetShot); log.push(`street: ${streetShot}`);
    // 2. walk the path in strides of six cells, on foot (gravity on) - a fall would show as a lower y
    let falls = 0;
    const stride = 6;
    for (let i = 0; i < path.length; i += stride) {
      const p = W(path[i]);
      const pos = await page.evaluate(`__p3.go(${p.x}, ${p.y}, ${p.z}, false)`);
      if (pos && Math.abs(pos[1] - p.y) > 1.6) falls++;
    }
    const g = W(path[path.length - 1]);
    const pos = await page.evaluate(`__p3.go(${g.x}, ${g.y}, ${g.z}, false)`);
    if (pos && Math.abs(pos[1] - g.y) > 1.6) falls++;
    // 3. the signature room: look toward its far side from the cell we stand on
    const cx = stat.x + stat.w / 2, cz = stat.z + stat.d / 2;
    const dx = cx - g.x, dz = cz - g.z;
    const look = (Math.abs(dx) + Math.abs(dz) < 1) ? { x: g.x + (stat.w >= stat.d ? 2 : 0), z: g.z + (stat.w >= stat.d ? 0 : 2) } : { x: g.x + dx * 1.5, z: g.z + dz * 1.5 };
    await page.evaluate(`__p3.aimAt(${look.x}, ${g.y + 1.0}, ${look.z}); 'ok'`);
    await page.sleep(2500);
    await page.evaluate('__p3.frames(10)');
    const roomShot = `${shotsDir}/${programId}.png`;
    await page.screenshot(roomShot); log.push(`room ${target.kind}: ${roomShot}`);
    const exc = page.exceptions.length;
    return { lotId: lot.id, room: target.kind, pathCells: path.length, falls, shots: [streetShot, roomShot], exceptions: exc, log };
  } finally { page.close(); }
}

/**
 * CLI: node scripts/programs/<program>.mjs [--seed 1337] [--json out.json] [--verbose] [--url http://localhost:PORT/ [--host lotId] [--shots /tmp/p3-shots]]
 */
export async function runProgramTest(programId, argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const layout = city(parseInt(a.seed || '1337', 10));
  const prog = PROGRAM_BY_ID[programId];
  if (!prog) { console.error(`unknown program ${programId}`); process.exit(2); }
  const t0 = performance.now();
  const rep = checkProgram(programId, layout);
  const ms = performance.now() - t0;
  console.log(`${prog.name} (${programId}): ${rep.hosts} host lot(s), ${rep.pass} pass, ${rep.fail} fail  [${ms.toFixed(0)} ms]`);
  for (const r of rep.results) {
    if (a.verbose || !r.ok) console.log(formatHost(r));
    if (a.verbose) for (const room of r.rooms) console.log(`        ${room.status.padEnd(9)} ${room.spec.padEnd(24)} -> ${String(room.kind).padEnd(24)} reach=${room.reach} lit=${room.lit} density=${room.density} interactions=[${room.interactions.join(', ')}]`);
    if (r.soft) {
      console.log(`      senate report: ${r.rooms.filter((x) => x.status !== 'missing').length}/${r.rooms.length} required rooms present by kind pattern; missing: ${r.rooms.filter((x) => x.status === 'missing').map((x) => x.spec).join(', ') || 'none'}`);
      console.log(`      visitor route: ${r.visitorRoute.map((s) => `${s.room} ${s.reachable}/${s.found}`).join(', ')}`);
      console.log(`      staff route:   ${r.staffRoute.map((s) => `${s.room} ${s.reachable}/${s.found}`).join(', ')}`);
    }
  }
  if (a.json) writeFileSync(a.json, JSON.stringify(rep, (k, v) => (v instanceof Set ? [...v] : v), 1));
  let exit = rep.fail ? 1 : 0;
  if (a.url) {
    const hostId = a.host !== undefined ? parseInt(a.host, 10) : null;
    const hosts = hostsOf(programId, layout);
    const lot = hostId !== null ? hosts.find((l) => l.id === hostId) : (hosts.filter((l) => rep.results.find((r) => r.lotId === l.id && r.ok)).sort((p, q) => (q.w * q.d) - (p.w * p.d))[0] || hosts[0]);
    if (!lot) { console.log('no host to walk'); process.exit(exit || 1); }
    try {
      const walk = await walkHost(programId, lot, layout, String(a.url), a.shots || '/tmp/p3-shots');
      console.log(`walk lot ${walk.lotId}: street -> door -> ${walk.room} in ${walk.pathCells} cells, falls ${walk.falls}, page exceptions ${walk.exceptions}`);
      for (const l of walk.log) console.log('  ' + l);
      if (walk.falls > 0) exit = exit || 1;
    } catch (e) { console.log(`walk failed: ${e.message}`); exit = exit || 1; }
  }
  process.exit(exit);
}
