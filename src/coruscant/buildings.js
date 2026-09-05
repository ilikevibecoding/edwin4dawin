// Coruscant building blueprints: tower families, civic landmarks and the furnished room library behind them.
//
//   blueprintFor(lot, layout) -> { w, h, d, y0, blocks: Uint8Array(w*h*d), meta }
//
// - blocks are indexed (x*d + z)*h + y (VoxelGrid layout); 0 = leave the world alone, 255 = force air; the
//   footprint is exactly the lot (w = lot.w, d = lot.d) with its origin at (lot.x0, y0, lot.z0).
// - y0 is the plateau top block (layout.levels.ground, else lot.groundY - 1, else 60): local y = 0 is the ground
//   slab, the lobby walk level is y0 + 1, floor slabs sit on y0 + 5k so skybridges and the boulevard deck line up.
// - lot = { id, x0, z0, w, d, district, kind: 'tower'|'landmark'|'plaza'|'spaceport'|'station', family (name or
//   index), height, seed, front?, door?, midDoor?, bridges? }. Unknown families hash from the seed.
// - meta (world coordinates): { id, name, kind, family, district, floorY, bounds, door, inside, midDoor, lobby,
//   doors[], spots[], work[], beds[], lifts[], floors[], rooms[] }.
// Results are memoised in an LRU of 256 entries; landmark blueprints are pinned.
import { RNG } from '../rng.js';
import { BLOCKS, SHAPE } from '../blocks.js';
import { Blueprint } from './blueprint.js';
import { makeStyle } from './facade.js';
import { poolsFor } from './towers/pools.js';
import { FAMILIES, LANDMARKS, LABELS, resolveFamily, buildFamily } from './towers/index.js';
import { bridgeStubs } from './towers/tiered.js';
import { list as roomList } from './rooms/index.js';

export { FAMILIES, LANDMARKS, roomList };
export { stampBlueprint } from './blueprint.js';

const LRU_MAX = 256;
const lru = new Map();
const pinned = new Map();

export function blueprintFor(lot, layout) {
  const key = (layout ? layout.seed : 0) + ':' + lot.id;
  let bp = pinned.get(key) || lru.get(key);
  if (bp) { if (lru.has(key)) { lru.delete(key); lru.set(key, bp); } return bp; }
  bp = buildBlueprint(lot, layout);
  if (lot.kind === 'landmark') { pinned.set(key, bp); return bp; }
  lru.set(key, bp);
  if (lru.size > LRU_MAX) lru.delete(lru.keys().next().value);
  return bp;
}
export function blueprintCacheSize() { return lru.size + pinned.size; }
export function clearBlueprintCache() { lru.clear(); pinned.clear(); }
// Generates the landmark blueprints up front (called at registration, off the streaming path).
export function prewarmBlueprints(layout) { for (const lot of layout.lots) if (lot.kind === 'landmark') blueprintFor(lot, layout); }

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function defaultDoor(lot, front) {
  const mx = lot.w >> 1, mz = lot.d >> 1;
  switch (front) {
    case 'W': return { x: 0, z: mz, out: { x: -1, z: mz }, in: { x: 1, z: mz } };
    case 'E': return { x: lot.w - 1, z: mz, out: { x: lot.w, z: mz }, in: { x: lot.w - 2, z: mz } };
    case 'N': return { x: mx, z: 0, out: { x: mx, z: -1 }, in: { x: mx, z: 1 } };
    default: return { x: mx, z: lot.d - 1, out: { x: mx, z: lot.d }, in: { x: mx, z: lot.d - 2 } };
  }
}

// Uncached build (exported for the test harness / benchmarks).
export function buildBlueprint(lot, layout) {
  const ground = (layout && layout.levels && layout.levels.ground != null) ? layout.levels.ground : (lot.groundY != null ? lot.groundY - 1 : 60);
  const rng = new RNG(lot.seed ?? 1);
  const fam = resolveFamily(lot, rng);
  const height = Math.max(10, lot.height ?? 60);
  const nF = Math.max(2, Math.round(height / 5));
  const style = makeStyle(fam.name, lot.district, rng);
  const pools = poolsFor(fam.name, lot.district);
  const front = lot.front || (lot.door && lot.door.side) || 'S';
  const ldoor = lot.door ? { x: lot.door.x - lot.x0, z: lot.door.z - lot.z0 } : defaultDoor(lot, front);
  const midWalk = (layout && layout.levels && layout.levels.midWalk) || 96;
  const midDoorF = lot.midDoor ? Math.round((midWalk - 1 - ground) / 5) : -1;
  const h = Math.max(8, Math.min(256 - ground, fam.name === 'plaza' ? 8 : 5 * nF + 26));
  const bp = new Blueprint(lot, lot.w, h, lot.d, ground);
  bp.rng = rng;
  const spec = { ext: { x0: 0, z0: 0, x1: lot.w - 1, z1: lot.d - 1 }, front, door: { x: ldoor.x, z: ldoor.z }, style, pools, seed: (lot.seed ?? 1) >>> 0, midDoorF };
  const ctx = { nF, height, rng, style, pools, midDoorF, spec };
  const res = buildFamily(fam, bp, lot, ctx) || { nF: 0, extra: 0 };
  if (lot.kind === 'tower' && layout) bridgeStubs(bp, lot, layout, res, style);
  finishMeta(bp, lot, fam, res, ground, front, ldoor, midDoorF);
  return bp.export();
}

function finishMeta(bp, lot, fam, res, ground, front, ldoor, midDoorF) {
  const m = bp.meta, walk = ground + 1;
  m.id = lot.id;
  m.kind = lot.kind || 'tower';
  m.family = fam.name;
  m.district = lot.district || null;
  m.name = `${cap(lot.district)} ${LABELS[fam.name] || cap(fam.name)} ${lot.id ?? ''}`.trim();
  m.floorY = walk;
  m.bounds = { x0: lot.x0, x1: lot.x0 + lot.w - 1, z0: lot.z0, z1: lot.z0 + lot.d - 1 };
  const out = lot.door && lot.door.out ? lot.door.out : { x: lot.x0 + (ldoor.out ? ldoor.out.x : ldoor.x), z: lot.z0 + (ldoor.out ? ldoor.out.z : ldoor.z) };
  const inn = lot.door && lot.door.in ? lot.door.in : { x: lot.x0 + (ldoor.in ? ldoor.in.x : ldoor.x), z: lot.z0 + (ldoor.in ? ldoor.in.z : ldoor.z) };
  if (res.inside) { inn.x = lot.x0 + res.inside.x; inn.z = lot.z0 + res.inside.z; }
  m.door = { x: out.x, y: walk, z: out.z };
  m.inside = { x: inn.x, y: walk, z: inn.z };
  m.midDoor = midDoorF >= 2 && res.nF > midDoorF ? { x: out.x, y: ground + 5 * midDoorF + 1, z: out.z } : null;
  m.doors = [{ x: lot.x0 + ldoor.x, y: walk, z: lot.z0 + ldoor.z, side: front }];
  if (res.doors) for (const dd of res.doors) m.doors.push({ x: lot.x0 + dd.x, y: walk, z: lot.z0 + dd.z, side: 'arcade' });
  if (res.houseDoor) m.doors.push({ x: lot.x0 + res.houseDoor.x, y: walk, z: lot.z0 + res.houseDoor.z, side: 'plaza' });
  if (!m.lobby) m.lobby = { x: inn.x, y: walk, z: inn.z };
  m.floors = [];
  for (let f = 0; f < (res.nF || 0); f++) m.floors.push(ground + 5 * f + 1);
  m.height = bp.h;
  pruneMeta(bp);
}

// Drops NPC spots that ended up inside walls or over air (masked corners, rotunda cuts, vestibules).
function pruneMeta(bp) {
  const m = bp.meta;
  const passable = (id) => { if (id === 0 || id === 255) return true; const b = BLOCKS[id]; return b ? (!b.solid || b.shape === SHAPE.SLAB || b.shape === SHAPE.BED) : false; };
  const standable = (id) => { if (id === 0 || id === 255) return false; const b = BLOCKS[id]; return b ? (b.solid || b.shape === SHAPE.LIQUID) : true; };
  const ok = (p) => {
    const x = p.x - bp.lot.x0, y = p.y - bp.y0, z = p.z - bp.lot.z0;
    if (!bp.inside(x, y, z)) return false;
    const here = bp.get(x, y, z), above = bp.get(x, y + 1, z), below = bp.get(x, y - 1, z);
    if (!passable(here) || !passable(above)) return false;
    return standable(below) || (here !== 0 && here !== 255);
  };
  m.spots = m.spots.filter(ok);
  m.work = m.work.filter(ok);
  m.beds = m.beds.filter(ok);
}
