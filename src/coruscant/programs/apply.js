// Blueprint overlay for the building programs (rubric 16 B6-B8). After the family builder (towers) or the landmark
// module has run, applyProgram() picks planned rooms that fit the program's room specs - by floor preference, size
// and door arrangement - and refurnishes them in place with the program templates (rooms/programs.js): same walls,
// same door, same footprint mask, new furniture, new NPC spots, new room kind. Two adjacent rooms can be merged into
// one bay for rooms that need width (repair bay, auditorium). Programs with a service circulation get a service door
// cut in the exterior back wall of a ground-floor back-of-house room when the wall really is exterior.
// Everything is seeded from the lot; no Math.random.
import { B, BLOCKS } from '../../blocks.js';
import { RNG } from '../../rng.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';
import { programRoom } from '../rooms/programs.js';
import { purposeFor } from '../purposes.js';
import { programFor, EXTENDED_MIN_ROOMS } from './index.js';

const PROTECTED = new Set(['lobby_atrium', 'lift_landing', 'corridor', 'stairwell']);
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const EMISSIVE = () => new Set([B.GLOW_PANEL, B.GLOW_PANEL_BLUE, B.LANTERN, B.NEON_PINK, B.NEON_GREEN, B.CITY_LAMP].filter((x) => x !== undefined));
const isAir = (id) => id === 0 || id === FORCE_AIR;
const solid = (id) => { if (isAir(id)) return false; const b = BLOCKS[id]; return b ? b.solid : true; };

function floorIndexer(meta) {
  const ys = [...new Set(meta.rooms.map((r) => r.y))].sort((a, b) => a - b);
  const idx = new Map(ys.map((y, i) => [y, i]));
  return { of: (y) => idx.get(y) ?? 0, top: ys.length - 1 };
}

// candidate rooms: planned rooms with a door whose frame was recorded, fully inside the footprint mask
function collectCandidates(bp, frames, floors) {
  const meta = bp.meta, byKey = new Map();
  meta.rooms.forEach((r, i) => byKey.set(`${r.x},${r.y},${r.z},${r.w},${r.d}`, i));
  const out = [];
  for (const fr of frames) {
    if (fr.doorU < 0 || fr.doorU === -100) continue;
    const rc = fr.rect, w = rc.x1 - rc.x0 + 1, d = rc.z1 - rc.z0 + 1;
    // planner rooms are registered as their interior; landmark modules register the rect including the walls
    let i = byKey.get(`${bp.wx(rc.x0)},${bp.wy(fr.y)},${bp.wz(rc.z0)},${w},${d}`);
    if (i === undefined) i = byKey.get(`${bp.wx(rc.x0 - 1)},${bp.wy(fr.y)},${bp.wz(rc.z0 - 1)},${w + 2},${d + 2}`);
    if (i === undefined) continue;
    const r = meta.rooms[i];
    if (PROTECTED.has(r.kind)) continue;
    // rooms drawn past a rounded or masked facade: the templates only write inside the mask, so a room is a candidate
    // when most of it is really there (the planner itself accepts rooms that are half inside)
    let inN = 0;
    if (fr.mask) { for (let u = 0; u < fr.w; u++) for (let v = 0; v < fr.d; v++) if (fr.inside(u, v)) inN++; } else inN = fr.w * fr.d;
    if (inN < 0.75 * fr.w * fr.d) continue;
    out.push({ fr, i, r, f: floors.of(r.y), used: false, w: fr.w, d: fr.d });
  }
  // a room whose door opens into another candidate room (not a corridor) is an inner room
  for (const c of out) {
    const bx = c.fr.X(c.fr.doorU, -2), bz = c.fr.Z(c.fr.doorU, -2);
    c.inner = out.some((o) => o !== c && o.fr.y === c.fr.y && bx >= o.fr.rect.x0 && bx <= o.fr.rect.x1 && bz >= o.fr.rect.z0 && bz <= o.fr.rect.z1);
  }
  return out;
}

// the room's back wall is an exterior wall: solid at walk and head height, open air beyond it (three high), and not
// the building's front
function exteriorBack(bp, c, front, lot) {
  const fr = c.fr, backSide = OPPOSITE[fr.side];
  if (backSide === front) return null;
  const du = Math.floor((fr.w - 2) / 2);
  for (let k = 0; k < 2; k++) {
    const wx = fr.X(du + k, fr.d), wz = fr.Z(du + k, fr.d), ox = fr.X(du + k, fr.d + 1), oz = fr.Z(du + k, fr.d + 1);
    if (!solid(bp.get(wx, fr.y, wz)) || !solid(bp.get(wx, fr.y + 1, wz))) return null;
    for (let ly = 0; ly < 3; ly++) if (!isAir(bp.get(ox, fr.y + ly, oz))) return null;
    if (ox >= 0 && ox < bp.w && oz >= 0 && oz < bp.d && bp.get(ox, fr.y - 1, oz) === FORCE_AIR) return null;   // carved away: nothing to step onto (0 = the plateau is left in place)
  }
  return { du, side: backSide, alley: !(lot.sides && lot.sides[backSide]) };
}

const whereOk = (spec, c, top) => {
  switch (spec.where) {
    case 'ground': return c.f === 0;
    case 'low': return c.f <= 2;
    case 'upper': return c.f >= 1;
    case 'top': return c.f === top || (top >= 1 && c.f === top - 1);
    case 'inner': return c.inner;
    default: return true;
  }
};
const fits = (tpl, w, d) => w >= tpl.minW && d >= tpl.minD && w <= tpl.maxW && d <= tpl.maxD;

// two unused candidates side by side in the same strip (one partition wall between them, same depth, same door wall)
function mergeable(a, b) {
  if (a.used || b.used || a.fr.y !== b.fr.y || a.fr.side !== b.fr.side || a.fr.mask !== b.fr.mask) return false;
  const A = a.fr.rect, Bx = b.fr.rect, alongX = a.fr.side === 'N' || a.fr.side === 'S';
  if (alongX) return A.z0 === Bx.z0 && A.z1 === Bx.z1 && (Bx.x0 === A.x1 + 2 || A.x0 === Bx.x1 + 2);
  return A.x0 === Bx.x0 && A.x1 === Bx.x1 && (Bx.z0 === A.z1 + 2 || A.z0 === Bx.z1 + 2);
}

function score(spec, c, top, rng, service) {
  let s = whereOk(spec, c, top) ? 10 : 0;
  if (spec.where === 'inner' && c.inner) s += 6;
  if (spec.where !== 'inner' && c.inner) s -= 3;                         // public rooms should open off the corridor
  if (spec.signature || spec.merge) s += Math.min(6, (c.w * c.d) / 8);  // the signature room takes the largest fit
  else if (spec.service) s -= Math.min(4, (c.w * c.d) / 12);            // back of house takes the small rooms
  if (!spec.signature && !spec.merge) s -= Math.max(0, c.w * c.d - 80) / 16;   // a landmark's hall is no place for a locker room
  if (service && spec.serviceEntry) s += c.exterior ? 8 : 0;
  if (c.fr.backDoorU >= 0 && !spec.service) s -= 3;                    // a pass-through room loses its back wall to the second door
  return s + rng.next() * 2;
}

// strip the old template's NPC records inside a room rect and clear its interior volume
function clearRoom(bp, c, floorId) {
  const { fr } = c, m = bp.meta, wy = bp.wy(fr.y);
  const inRect = (p) => p.y === wy && p.x >= bp.wx(fr.rect.x0) && p.x <= bp.wx(fr.rect.x1) && p.z >= bp.wz(fr.rect.z0) && p.z <= bp.wz(fr.rect.z1);
  m.spots = m.spots.filter((p) => !inRect(p)); m.work = m.work.filter((p) => !inRect(p)); m.beds = m.beds.filter((p) => !inRect(p));
  const em = EMISSIVE();
  let ceiling = null;
  const counts = new Map();
  for (let u = 0; u < fr.w; u++) for (let v = 0; v < fr.d; v++) {
    if (!fr.inside(u, v)) continue;
    const id = bp.get(fr.X(u, v), fr.y + fr.h, fr.Z(u, v));
    if (!isAir(id) && !em.has(id)) counts.set(id, (counts.get(id) || 0) + 1);
  }
  for (const [id, n] of counts) if (!ceiling || n > ceiling.n) ceiling = { id, n };
  for (let u = 0; u < fr.w; u++) for (let v = 0; v < fr.d; v++) {
    if (!fr.inside(u, v)) continue;
    const x = fr.X(u, v), z = fr.Z(u, v);
    for (let ly = 0; ly < fr.h; ly++) bp.set(x, fr.y + ly, z, 0);
    // the floor slab doubles as the ceiling of the room below: its light panels stay
    const fl = bp.get(x, fr.y - 1, z);
    if (floorId && solid(fl) && !em.has(fl)) bp.set(x, fr.y - 1, z, floorId);
    if (ceiling && em.has(bp.get(x, fr.y + fr.h, z))) bp.set(x, fr.y + fr.h, z, ceiling.id);
  }
}

// what hangs over the walkway of a small room when the door zones ate its floor: by template tag
const OVERHEAD = [['green', B.OAK_LEAVES], ['medical', B.WHITE_WOOL], ['culture', B.RED_WOOL], ['entertainment', B.RED_WOOL], ['industry', B.IRON_BARS], ['tech', B.IRON_BARS], ['freight', B.SHELF], ['service', B.SHELF], ['office', B.PANEL_BLACK], ['civic', B.PANEL_BLACK], ['home', B.SHELF]];
const DENSITY_BAR = 1 / 6;

// furniture density as the harnesses measure it (blocks in the three layers above the floor over the room's cells)
function density(room) {
  let cells = 0, n = 0;
  for (let u = 0; u < room.w; u++) for (let v = 0; v < room.d; v++) {
    if (!room.inside(u, v)) continue;
    cells++;
    for (let ly = 0; ly <= 2; ly++) if (!isAir(room.get(u, ly, v))) n++;
  }
  return cells ? n / cells : 0;
}

// a room with doors at both ends (or a masked corner) can lose most of its floor to door zones; the overhead
// racks, ducts and hangings along the side walls at head+1 height bring it to the landmark bar without touching the
// walkway
function topUp(room, tpl) {
  if (density(room) >= DENSITY_BAR + 0.04) return;
  const tag = OVERHEAD.find(([t]) => tpl.tags.includes(t));
  const id = tag ? tag[1] : B.SHELF;
  const cols = room.w > 1 ? [0, room.w - 1] : [0];
  for (const u of cols) for (let v = 1; v < room.d - 1 && density(room) < DENSITY_BAR + 0.04; v++) if (room.inside(u, v) && isAir(room.get(u, 2, v))) room.putRaw(u, 2, v, id);
  for (let u = 1; u < room.w - 1 && density(room) < DENSITY_BAR + 0.04; u++) if (room.inside(u, room.back) && isAir(room.get(u, 2, room.back))) room.putRaw(u, 2, room.back, id);
}

function furnish(bp, c, spec, tpl, ctx, rng, extra = {}) {
  const fr = c.fr;
  const room = new Room(bp, { ...fr.rect, y: fr.y, h: fr.h, side: fr.side, doorU: fr.doorU, doorW: fr.doorW, backDoorU: extra.backDoorU ?? fr.backDoorU, backDoorTight: true, mask: fr.mask, extraDoors: extra.extraDoors || null }, spec.kind, ctx);
  tpl.fn(room, rng, ctx);
  room.finalize();
  topUp(room, tpl);
  room.putRaw(fr.doorU, fr.h, 0, B.GLOW_PANEL);
  return room;
}

// cut a two-wide service door through the back wall of a ground-floor room; returns the door record (world coords)
function cutServiceDoor(bp, c, ext, trim) {
  const fr = c.fr;
  for (let k = 0; k < 2; k++) {
    const wx = fr.X(ext.du + k, fr.d), wz = fr.Z(ext.du + k, fr.d);
    bp.set(wx, fr.y, wz, FORCE_AIR); bp.set(wx, fr.y + 1, wz, FORCE_AIR);
    if (trim) bp.set(wx, fr.y + 2, wz, trim);
    bp.set(wx, fr.y + 3, wz, B.GLOW_PANEL);
  }
  const wx = fr.X(ext.du, fr.d), wz = fr.Z(ext.du, fr.d);
  return { x: bp.wx(wx), y: bp.wy(fr.y), z: bp.wz(wz), side: 'service', in: { x: bp.wx(fr.X(ext.du, fr.d - 1)), y: bp.wy(fr.y), z: bp.wz(fr.Z(ext.du, fr.d - 1)) } };
}

/**
 * Apply the lot's program to a built blueprint. o = { style?, front, landmark?, lot }
 * Records bp.meta.program = { id, variant, compact, rooms, satisfied, missing, serviceDoor } for the harnesses.
 */
export function applyProgram(bp, lot, layout, o = {}) {
  const purpose = layout ? purposeFor(lot, layout) : null;
  const prog = programFor(lot, purpose, layout);
  if (!prog) return null;
  const frames = (bp.roomFrames || []).slice();
  bp.roomFrames = [];
  const meta = bp.meta, floors = floorIndexer(meta);
  const cands = collectCandidates(bp, frames, floors);
  const front = o.front || lot.front || 'S';
  for (const c of cands) c.exterior = c.f === 0 ? exteriorBack(bp, c, front, lot) : null;
  const rng = new RNG(((lot.seed ?? 1) ^ 0x7a3c9e1d) >>> 0);
  const planned = meta.rooms.filter((r) => !PROTECTED.has(r.kind)).length;
  const compact = planned < EXTENDED_MIN_ROOMS;
  const specs = prog.rooms.filter((s) => s.core || !compact);
  const ctx = { program: prog, palette: prog.materialIds, variant: prog.variant, style: o.style || null, rng, district: lot.district };
  const wantsService = !!(prog.circulation && prog.circulation.service);
  const record = { id: prog.id, variant: prog.variant, compact, rooms: [], satisfied: [], missing: [], serviceDoor: null };
  const existing = meta.rooms.map((r) => r.kind);
  const placements = [];
  // record only (the Senate: another builder's blueprint, checked by kind pattern, never refurnished)
  if (o.noBuild) {
    for (const spec of specs) {
      const by = spec.accept ? existing.find((k) => spec.accept.test(k)) : null;
      if (by) record.satisfied.push({ kind: spec.kind, by }); else record.missing.push(spec.kind);
    }
    meta.program = record;
    return record;
  }

  for (const spec of [...specs.filter((s) => s.core), ...specs.filter((s) => !s.core)]) {
    // a landmark's own hand-built rooms satisfy a spec by kind pattern
    if (o.landmark && spec.accept && existing.some((k) => spec.accept.test(k))) { record.satisfied.push({ kind: spec.kind, by: existing.filter((k) => spec.accept.test(k))[0] }); continue; }
    const tpl = programRoom(spec.kind);
    if (!tpl) { record.missing.push(spec.kind); continue; }
    // landmarks: only generic library rooms are refurnished, never a signature room of the module
    let pool = cands.filter((c) => !c.used && fits(tpl, c.w, c.d) && (!o.landmark || ROOMS[c.r.kind]));
    let merge = null;
    if (spec.merge) {
      // prefer a merged pair: two adjacent rooms become one bay
      const pairs = [];
      for (const a of cands) if (!a.used && whereOk(spec, a, floors.top)) for (const b of cands) if (a !== b && mergeable(a, b) && (a.fr.rect.x0 < b.fr.rect.x0 || a.fr.rect.z0 < b.fr.rect.z0)) pairs.push([a, b]);
      if (pairs.length) { pairs.sort((p, q) => (q[0].w * q[0].d + q[1].w * q[1].d) - (p[0].w * p[0].d + p[1].w * p[1].d) || p[0].i - q[0].i); merge = pairs[0]; }
    }
    if (merge) { placements.push({ spec, tpl, merge }); merge[0].used = merge[1].used = true; continue; }
    let best = pool.filter((c) => whereOk(spec, c, floors.top));
    if (!best.length) best = pool;
    if (!best.length) { record.missing.push(spec.kind); continue; }
    const scored = best.map((c) => ({ c, s: score(spec, c, floors.top, rng, wantsService) })).sort((a, b) => b.s - a.s || a.c.i - b.c.i);
    const pick = scored[0].c;
    pick.used = true;
    placements.push({ spec, tpl, c: pick });
  }

  // the service door: the serviceEntry room if it sits on the ground floor against an exterior wall, else any
  // placed back-of-house ground-floor room with one
  let serviceAt = null;
  if (wantsService) {
    const withExt = placements.filter((p) => p.c && p.c.exterior);
    serviceAt = withExt.find((p) => p.spec.serviceEntry) || withExt.find((p) => p.spec.service) || null;
  }

  // build: merged bays first (they rewrite meta.rooms), then single rooms
  const trim = o.style ? o.style.trim : B.CHROME;
  for (const p of placements) {
    if (p.merge) {
      const [a, b] = p.merge, alongX = a.fr.side === 'N' || a.fr.side === 'S';
      const left = alongX ? (a.fr.rect.x0 < b.fr.rect.x0 ? a : b) : (a.fr.rect.z0 < b.fr.rect.z0 ? a : b), right = left === a ? b : a;
      clearRoom(bp, a, o.style && o.style.floor); clearRoom(bp, b, o.style && o.style.floor);
      const L = left.fr.rect, Rr = right.fr.rect;
      if (alongX) { const wx = L.x1 + 1; for (let z = L.z0; z <= L.z1; z++) for (let ly = 0; ly < a.fr.h; ly++) bp.set(wx, a.fr.y + ly, z, 0); }
      else { const wz = L.z1 + 1; for (let x = L.x0; x <= L.x1; x++) for (let ly = 0; ly < a.fr.h; ly++) bp.set(x, a.fr.y + ly, wz, 0); }
      const rect = { x0: Math.min(L.x0, Rr.x0), z0: Math.min(L.z0, Rr.z0), x1: Math.max(L.x1, Rr.x1), z1: Math.max(L.z1, Rr.z1) };
      const shift = alongX ? (Rr.x0 - L.x0) : (Rr.z0 - L.z0);
      // u runs with +x for N/S and +z for W; for E it runs with +z as well (Z(u) = z0 + u), so the shift holds
      const doorU = left.fr.doorU, extraDoors = [right.fr.doorU + shift];
      const fr = new Room(null, { ...rect, y: a.fr.y, h: a.fr.h, side: a.fr.side, doorU, doorW: a.fr.doorW, mask: a.fr.mask, extraDoors }, p.spec.kind, ctx);
      const c = { fr, f: a.f, w: fr.w, d: fr.d, inner: false, exterior: null, r: null, i: -1 };
      const room = furnish(bp, c, p.spec, p.tpl, ctx, rng, { extraDoors });
      room.putRaw(extraDoors[0], fr.h, 0, B.GLOW_PANEL);
      const drop = new Set([a.i, b.i]);
      const merged = { kind: p.spec.kind, x: bp.wx(rect.x0), y: bp.wy(fr.y), z: bp.wz(rect.z0), w: rect.x1 - rect.x0 + 1, d: rect.z1 - rect.z0 + 1 };
      meta.rooms = meta.rooms.filter((r, i) => !drop.has(i)).concat([merged]);
      // candidate indices shifted: rebuild the index map for the remaining candidates
      const byKey = new Map(); meta.rooms.forEach((r, i) => byKey.set(`${r.x},${r.y},${r.z},${r.w},${r.d}`, i));
      for (const cc of cands) if (cc.r) cc.i = byKey.get(`${cc.r.x},${cc.r.y},${cc.r.z},${cc.r.w},${cc.r.d}`);
      record.rooms.push({ ...merged, spec: p.spec.kind, core: p.spec.core, merged: true, floor: a.f, signature: p.spec.signature });
      continue;
    }
    const c = p.c;
    clearRoom(bp, c, o.style && o.style.floor);
    const isService = serviceAt === p;
    const room = furnish(bp, c, p.spec, p.tpl, ctx, rng, isService ? { backDoorU: c.exterior.du } : {});
    if (isService) record.serviceDoor = cutServiceDoor(bp, c, c.exterior, trim);
    meta.rooms[c.i].kind = p.spec.kind;
    record.rooms.push({ kind: p.spec.kind, x: c.r.x, y: c.r.y, z: c.r.z, w: c.r.w, d: c.r.d, spec: p.spec.kind, core: p.spec.core, floor: c.f, signature: p.spec.signature, serviceDoor: isService });
    void room;
  }
  if (record.serviceDoor && o.landmark) meta.doors.push({ x: record.serviceDoor.x, y: record.serviceDoor.y, z: record.serviceDoor.z, side: 'service' });
  meta.program = record;
  return record;
}
