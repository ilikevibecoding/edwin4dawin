// Landmark blueprint checker (docs/rubrics/06_landmarks.md rows 1-3, 5, 6):
//   node scripts/landmark-stats.mjs <id> [--seed 1337] [--json out.json] [--slice y]
// Builds the landmark module `src/coruscant/landmarks/<id>.js` on its real lot from the city layout and reports:
// build time, determinism (two builds hash-identical), block histogram (distinct types), metadata counts, per-room
// detail density and lighting, and on-foot reachability from the door cell over stairs/slabs/lifts to every room.
// Exit code 1 when a hard check fails (build error, non-deterministic, unreachable rooms, unlit rooms, < 14 block types).
import { initBlocks, BLOCKS, B, SHAPE } from '../src/blocks.js';
import { getLayout, LANDMARKS, LEVELS } from '../src/coruscant/layout.js';
import { FORCE_AIR } from '../src/coruscant/blueprint.js';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : dflt; };
if (!id) { console.error('usage: node scripts/landmark-stats.mjs <id> [--seed n] [--json file] [--slice y]'); process.exit(2); }

initBlocks();
const seed = parseInt(opt('seed', '1337'), 10);
const layout = getLayout(seed);
const place = LANDMARKS.find((l) => l.family === id);
let lot = layout.lots.find((l) => l.kind === 'landmark' && l.family === id);
if (!lot) {
  // not placed in this layout: fake a lot of the rubric size so the module can still be checked
  const [sx, sz] = (place && place.span) || [2, 2];
  const w = 50 * sx + 10, d = 50 * sz + 10;
  lot = { id: 9999, x0: 0, z0: 0, x1: w, z1: d, w, d, district: 'senate', kind: 'landmark', family: id, height: (place && place.height) || 60, seed: 4242, sides: { W: true, E: true, N: true, S: true }, front: 'S', midDoor: true, bridges: [], span: [sx, sz] };
  const mx = w >> 1; lot.door = { side: 'S', x: mx, z: d - 1, out: { x: mx, z: d }, in: { x: mx, z: d - 2 } };
  console.log(`(lot for '${id}' not in layout ${seed}; using a synthetic ${w}x${d} lot)`);
}
const mod = await import(`../src/coruscant/landmarks/${id}.js`);
const LM = mod.LANDMARK;
if (!LM || typeof LM.build !== 'function') { console.error(`module exports no LANDMARK.build`); process.exit(1); }

const { buildSignature } = await import('../src/coruscant/buildings.js');

// exactly what the city does for a landmark lot (buildings.js -> buildSignature -> module.build)
function build() { return buildSignature(LM, lot, layout); }
function hashBlocks(a) { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }

// the budget is what the streaming city pays per landmark on a warm engine, so the timed build is the second one
// (the first carries module JIT warm-up and is what the determinism check compares against)
const bp = build();
const t0 = performance.now();
const bp2 = build();
const buildMs = performance.now() - t0;
const deterministic = hashBlocks(bp.blocks) === hashBlocks(bp2.blocks);

const { w, h, d } = bp;
const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 0 : bp.blocks[(x * d + z) * h + y];
const isAir = (v) => v === 0 || v === FORCE_AIR;
const blk = (v) => BLOCKS[v];
const passable = (v) => isAir(v) || !blk(v) || !blk(v).solid || blk(v).shape === SHAPE.DOOR || blk(v).shape === SHAPE.SALOON_DOOR;
const lowStep = (v) => !isAir(v) && blk(v) && (blk(v).shape === SHAPE.SLAB || blk(v).shape === SHAPE.RAIL || blk(v).shape === SHAPE.FARMLAND);
const standable = (v) => !isAir(v) && blk(v) && blk(v).solid;

// histogram -------------------------------------------------------------------------------------------------
const hist = new Map();
let filled = 0, unpaved = 0;
for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
  if (at(x, 0, z) === 0) unpaved++;
  for (let y = 0; y < h; y++) { const v = at(x, y, z); if (isAir(v)) continue; filled++; hist.set(v, (hist.get(v) || 0) + 1); }
}
const types = [...hist.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => [blk(v) ? blk(v).name : 'id' + v, n]);

// reachability ------------------------------------------------------------------------------------------------
// A cell (x, y, z) is "standing" when the feet cell and the head cell are passable and there is support below
// (a solid block, or a slab in the feet cell). Moves: 4-neighbours at dy in [-3 .. +1] (step/jump up 1, drop 3);
// lift shafts connect every level they span; ladders are not used by the palette.
const key = (x, y, z) => (x * d + z) * h + y;
const standing = (x, y, z) => {
  if (x < 0 || z < 0 || x >= w || z >= d || y < 1 || y + 1 >= h) return false;
  const feet = at(x, y, z), head = at(x, y + 1, z);
  if (!passable(head)) return false;
  if (lowStep(feet)) return true;
  return passable(feet) && (standable(at(x, y - 1, z)) || lowStep(at(x, y - 1, z)));
};
const visited = new Uint8Array(w * h * d);
const queue = [];
const push = (x, y, z) => { if (standing(x, y, z) && !visited[key(x, y, z)]) { visited[key(x, y, z)] = 1; queue.push(x, y, z); } };
const doorLocal = lot.door ? { x: lot.door.in.x - lot.x0, z: lot.door.in.z - lot.z0 } : { x: w >> 1, z: d - 2 };
for (let dy = 0; dy <= 3; dy++) { push(doorLocal.x, 1 + dy, doorLocal.z); push(lot.door.x - lot.x0, 1 + dy, lot.door.z - lot.z0); }
for (const dr of bp.meta.doors) for (let dy = -1; dy <= 2; dy++) push(dr.x - lot.x0, dr.y - bp.y0 + dy, dr.z - lot.z0);
const liftCols = bp.meta.lifts.map((l) => ({ x: l.x - lot.x0, z: l.z - lot.z0, y0: l.y0 - bp.y0, y1: l.y1 - bp.y0 }));
let head = 0, reachCount = 0;
while (head < queue.length) {
  const x = queue[head++], y = queue[head++], z = queue[head++];
  reachCount++;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    // step / jump up one, walk level, or drop up to three
    for (let dy = 1; dy >= -3; dy--) {
      if (dy === 1 && !passable(at(x, y + 2, z))) continue;      // head room to jump
      if (standing(x + dx, y + dy, z + dz)) { push(x + dx, y + dy, z + dz); break; }
    }
  }
  for (const l of liftCols) {
    if (Math.abs(l.x - x) > 1 || Math.abs(l.z - z) > 1 || y < l.y0 - 1 || y > l.y1 + 1) continue;
    for (let yy = l.y0; yy <= l.y1 + 1; yy++) for (let dx = -1; dx <= 2; dx++) for (let dz = -1; dz <= 2; dz++) push(l.x + dx, yy, l.z + dz);
  }
}

// rooms ---------------------------------------------------------------------------------------------------------
const roomReports = [];
let unreachable = 0, unlit = 0, sparse = 0;
for (const r of bp.meta.rooms) {
  const rx0 = r.x - lot.x0, rz0 = r.z - lot.z0, ry = r.y - bp.y0, rx1 = rx0 + r.w - 1, rz1 = rz0 + r.d - 1;
  let floorCells = 0, furniture = 0, reach = false, emit = 0, air = 0;
  for (let x = rx0; x <= rx1; x++) for (let z = rz0; z <= rz1; z++) {
    if (visited[key(x, ry, z)] || visited[key(x, ry + 1, z)] || visited[key(x, ry - 1, z)]) reach = true;
    if (x === rx0 || x === rx1 || z === rz0 || z === rz1) continue;   // outer ring is usually the wall
    floorCells++;
    for (let y = ry; y <= ry + 2; y++) {
      const v = at(x, y, z);
      if (isAir(v)) { air++; continue; }
      furniture++;
      if (blk(v) && blk(v).emit > 0) emit++;
    }
    for (let y = ry - 1; y <= ry + 4; y++) { const v = at(x, y, z); if (!isAir(v) && blk(v) && blk(v).emit > 0 && (y === ry - 1 || y > ry + 2)) emit++; }
  }
  const density = floorCells ? furniture / floorCells : 0;
  if (!reach) unreachable++;
  if (emit === 0) unlit++;
  if (density < 1 / 6) sparse++;
  roomReports.push({ kind: r.kind, x: r.x, y: r.y, z: r.z, w: r.w, d: r.d, reach, density: +density.toFixed(2), emit });
}

// optional ASCII slice for debugging ----------------------------------------------------------------------------
const slice = opt('slice', null);
if (slice !== null) {
  const y = parseInt(slice, 10);
  const glyph = (v) => isAir(v) ? '.' : (blk(v) && blk(v).emit > 0 ? '*' : (blk(v) && !blk(v).solid ? ',' : '#'));
  for (let z = 0; z < d; z++) { let row = ''; for (let x = 0; x < w; x++) row += glyph(at(x, y, z)); console.log(row); }
}

const report = {
  id, name: bp.meta.name, lot: { x0: lot.x0, z0: lot.z0, w, d, height: lot.height, district: lot.district, door: lot.door },
  buildMs: +buildMs.toFixed(1), deterministic, filledBlocks: filled, unpavedGroundCells: unpaved, distinctBlockTypes: types.length, topBlocks: types.slice(0, 12),
  meta: { doors: bp.meta.doors.length, spots: bp.meta.spots.length, work: bp.meta.work.length, beds: bp.meta.beds.length, lifts: bp.meta.lifts.length, rooms: bp.meta.rooms.length },
  reachableStandingCells: reachCount, rooms: { total: roomReports.length, unreachable, unlit, sparse },
  roomList: roomReports,
};
const out = opt('json', null);
if (out) writeFileSync(out, JSON.stringify(report, null, 1));
const { roomList, ...summary } = report;
console.log(JSON.stringify(summary, null, 1));
const bad = roomReports.filter((r) => !r.reach || r.emit === 0);
if (bad.length) console.log('rooms failing (unreachable / unlit):', bad.slice(0, 25).map((r) => `${r.kind}@${r.x},${r.y},${r.z} reach=${r.reach} emit=${r.emit}`).join('\n  '));

const fail = [];
if (!deterministic) fail.push('non-deterministic build');
if (types.length < 14) fail.push(`only ${types.length} block types (need >= 14)`);
if (unreachable > 0) fail.push(`${unreachable} unreachable rooms`);
if (unlit > 0) fail.push(`${unlit} unlit rooms`);
if (bp.meta.rooms.length === 0) fail.push('no rooms recorded through bp.room()');
if (buildMs > 60) fail.push(`build took ${buildMs.toFixed(0)} ms (> 60 ms)`);
if (fail.length) { console.log('FAIL: ' + fail.join('; ')); process.exit(1); }
console.log('OK');
