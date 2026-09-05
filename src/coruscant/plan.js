// Floor planner: a deterministic "corridor spine + rooms on both sides" plan for a rectangular footprint.
// Plan frame: u runs along the front (entrance) wall, v is the depth from the front interior row. The layout
// (corridor rows, connector columns, core position) is computed once from the ground footprint and reused on
// every level so the lift/stair core lines up; setback floors clip the same layout to their smaller interior.
import { B } from '../blocks.js';
import { Room } from './rooms/room.js';
import { ROOMS, pickRoom } from './rooms/index.js';
import { FORCE_AIR } from './blueprint.js';

export const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Maps plan (u, v) to blueprint (x, z). fp = exterior footprint rect (inclusive), side = entrance wall.
export class PlanFrame {
  constructor(fp, side) {
    this.fp = fp; this.side = side;
    this.ix0 = fp.x0 + 1; this.ix1 = fp.x1 - 1; this.iz0 = fp.z0 + 1; this.iz1 = fp.z1 - 1;
    const alongX = side === 'N' || side === 'S';
    this.Iu = alongX ? this.ix1 - this.ix0 + 1 : this.iz1 - this.iz0 + 1;
    this.Iv = alongX ? this.iz1 - this.iz0 + 1 : this.ix1 - this.ix0 + 1;
  }
  X(u, v) { switch (this.side) { case 'S': case 'N': return this.ix0 + u; case 'E': return this.ix1 - v; default: return this.ix0 + v; } }
  Z(u, v) { switch (this.side) { case 'S': return this.iz1 - v; case 'N': return this.iz0 + v; default: return this.iz0 + u; } }
  U(x, z) { switch (this.side) { case 'S': case 'N': return x - this.ix0; default: return z - this.iz0; } }
  V(x, z) { switch (this.side) { case 'S': return this.iz1 - z; case 'N': return z - this.iz0; case 'E': return this.ix1 - x; default: return x - this.ix0; } }
  // uv rect -> xz rect (inclusive, normalised)
  rect(u0, v0, u1, v1) {
    const xa = this.X(u0, v0), xb = this.X(u1, v1), za = this.Z(u0, v0), zb = this.Z(u1, v1);
    return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: Math.min(za, zb), z1: Math.max(za, zb) };
  }
  // the interior of an exterior rect expressed as a uv clip
  clipOf(ext) {
    const a = this.U(ext.x0 + 1, ext.z0 + 1), b = this.U(ext.x1 - 1, ext.z1 - 1);
    const c = this.V(ext.x0 + 1, ext.z0 + 1), d = this.V(ext.x1 - 1, ext.z1 - 1);
    return { u0: Math.min(a, b), u1: Math.max(a, b), v0: Math.min(c, d), v1: Math.max(c, d) };
  }
  // world-facing direction of "+v" and "-v" sides for rooms
  sideTowardFront() { return this.side; }              // a wall on the -v side of a room faces the front
  sideTowardBack() { return OPPOSITE[this.side]; }
}

// Corridor rows, strips and core position for an Iu x Iv interior (all in uv).
export function computeLayout(Iu, Iv) {
  let cw = Iu >= 26 ? 3 : 2;
  if (Iv - 6 - cw < 6) cw = 2;
  const deep = Iv - 6 - cw >= 14;
  const s0 = deep ? Math.min(8, 6 + Math.floor((Iv - 22) / 6)) : clamp(Math.floor((Iv - cw) / 2), 6, 9);
  const b0 = s0 + cw;
  const spines = [{ v0: s0, v1: b0 - 1 }];
  const strips = [{ kind: 'front', wallV: s0 - 1, roomV0: 0, roomV1: s0 - 2, spine: 0, wallAtBack: true }];
  let core;
  if (!deep) {
    core = { v0: Iv - 6, v1: Iv - 1, backWall: false, pocketV0: b0, pocketV1: Iv - 7 };
    strips.push({ kind: 'back', wallV: b0, roomV0: b0 + 1, roomV1: Iv - 1, spine: 0, aroundCore: true });
  } else {
    core = { v0: b0, v1: b0 + 5, backWall: true, pocketV0: b0, pocketV1: b0 - 1 };
    strips.push({ kind: 'coreband', wallV: b0, roomV0: b0 + 1, roomV1: b0 + 5, spine: 0, aroundCore: true, backWallV: b0 + 6 });
    let r0 = b0 + 7, si = 0;
    for (;;) {
      si++;
      spines.push({ v0: r0, v1: r0 + cw - 1 });
      const q0 = r0 + cw, R = Iv - q0;
      if (R >= 20) {
        strips.push({ kind: 'between', wallV: q0, roomV0: q0 + 1, roomV1: q0 + 5, spine: si, backWallV: q0 + 6 });
        strips.push({ kind: 'between', wallV: q0 + 12, roomV0: q0 + 7, roomV1: q0 + 11, spine: si + 1, wallAtBack: true });
        r0 = q0 + 13;
        continue;
      }
      strips.push({ kind: 'rear', wallV: q0, roomV0: q0 + 1, roomV1: Iv - 1, spine: si });
      break;
    }
  }
  const conU0 = Iu >= 24 ? Math.floor(Iu / 2) - 1 : 0;
  core.u0 = conU0 + 2; core.u1 = core.u0 + 5;
  return { cw, s0, spines, strips, core, connector: { u0: conU0, u1: conU0 + 1, v0: s0 } };
}

// Splits a run of `len` cells into room widths separated by 1-cell partitions.
function splitLen(len, rng, minW = 4, maxW = 9) {
  const out = [];
  let rem = len;
  while (rem > 0) {
    if (rem <= maxW || rem < 2 * minW + 1) { out.push(rem); break; }
    const w = rng.int(minW, Math.min(maxW, rem - minW - 1));
    out.push(w); rem -= w + 1;
  }
  return out;
}

// Plans one level: corridors, partitions, doors, room templates. `P`:
//   { frame, layout, clip {u0,u1,v0,v1}, lvl, style, pools, ctx, mode: 'lobby'|'gallery'|'normal', used: Map }
export function planFloor(bp, P) {
  const { frame, layout, clip, lvl, style, pools, ctx } = P;
  const rng = bp.rng;
  const wall = style.wall, trim = style.trim;
  const used = P.used || new Map();
  const put = (u, y, v, id) => bp.set(frame.X(u, v), y, frame.Z(u, v), id);
  const inClip = (u, v) => u >= clip.u0 && u <= clip.u1 && v >= clip.v0 && v <= clip.v1;
  const wallCol = (u, v0, v1) => { for (let v = Math.max(v0, clip.v0); v <= Math.min(v1, clip.v1); v++) if (u >= clip.u0 && u <= clip.u1) bp.fill(frame.X(u, v), lvl, frame.Z(u, v), frame.X(u, v), lvl + 3, frame.Z(u, v), wall); };
  const wallRow = (v, u0, u1) => { for (let u = Math.max(u0, clip.u0); u <= Math.min(u1, clip.u1); u++) if (v >= clip.v0 && v <= clip.v1) bp.fill(frame.X(u, v), lvl, frame.Z(u, v), frame.X(u, v), lvl + 3, frame.Z(u, v), wall); };
  const rooms = [];

  // corridors: ceiling lights + accent band along the top of the adjacent walls
  const lightCorridorCell = (u, v, k) => { if (!inClip(u, v)) return; if (k % 4 === 0) put(u, lvl + 4, v, B.GLOW_PANEL); else if (k % 4 === 2 && style.vents) put(u, lvl + 4, v, B.VENT); };
  for (const sp of layout.spines) {
    const vm = sp.v0 + Math.floor((sp.v1 - sp.v0) / 2);
    for (let u = clip.u0; u <= clip.u1; u++) lightCorridorCell(u, vm, u + 1);
  }
  const con = layout.connector;
  if (P.mode !== 'lobbyOnly') for (let v = layout.s0; v <= clip.v1; v++) lightCorridorCell(con.u0, v, v);

  // the connector needs walls on both sides where it passes rooms (strips behind spine 0)
  const conWallL = con.u0 - 1, conWallR = con.u1 + 1;

  // segments of a strip along u, avoiding the connector and (for strips around the core) the core; leftovers
  // too narrow for a room become solid service bands
  const segments = (strip, rv0, rv1) => {
    if (strip.kind === 'front') return [{ a: clip.u0, b: clip.u1, wallA: false, wallB: false }];
    const segs = [];
    const va = Math.min(strip.wallV, rv0), vb = Math.max(strip.wallV, rv1);
    const solid = (a, b) => { for (let v = va; v <= vb; v++) wallRow(v, a, b); };
    if (conWallL >= clip.u0) {
      if (conWallL - clip.u0 >= 4) segs.push({ a: clip.u0, b: conWallL - 1, wallB: true, wallBu: conWallL });
      else solid(clip.u0, conWallL);
    }
    const startU = strip.aroundCore ? layout.core.u1 + 2 : conWallR + 1;
    const wallU = startU - 1;
    if (clip.u1 - startU + 1 >= 4) segs.push({ a: startU, b: clip.u1, wallA: true, wallAu: wallU });
    else if (wallU <= clip.u1) solid(wallU, clip.u1);
    return segs;
  };

  // one room from a uv rect; wallAtBack = the door wall is on the +v side (front strip) else on the -v side
  const makeRoom = (u0, u1, v0, v1, doorSideV, doorUplan, pool, kind0 = null) => {
    if (u1 - u0 + 1 < 3 || v1 - v0 + 1 < 2) return null;
    const rc = frame.rect(u0, v0, u1, v1);
    const side = doorSideV > v1 ? frame.sideTowardBack() : frame.sideTowardFront();
    const alongX = side === 'N' || side === 'S';
    const dxa = frame.X(doorUplan, doorSideV), dza = frame.Z(doorUplan, doorSideV);
    const dxb = frame.X(doorUplan + 1, doorSideV), dzb = frame.Z(doorUplan + 1, doorSideV);
    const doorU = alongX ? Math.min(dxa, dxb) - rc.x0 : Math.min(dza, dzb) - rc.z0;
    const w = alongX ? rc.x1 - rc.x0 + 1 : rc.z1 - rc.z0 + 1, d = alongX ? rc.z1 - rc.z0 + 1 : rc.x1 - rc.x0 + 1;
    const tpl = kind0 ? ROOMS[kind0] : pickRoom(pool, w, d, rng, used);
    used.set(tpl.name, (used.get(tpl.name) || 0) + 1);
    const room = new Room(bp, { ...rc, y: lvl, h: 4, side, doorU, doorW: 2 }, tpl.name, ctx);
    // door opening (2 wide, 2 high) with an accent lintel
    for (let k = 0; k < 2; k++) { put(doorUplan + k, lvl, doorSideV, FORCE_AIR); put(doorUplan + k, lvl + 1, doorSideV, FORCE_AIR); put(doorUplan + k, lvl + 2, doorSideV, trim); }
    tpl.fn(room, rng, ctx);
    room.finalize();
    bp.room(tpl.name, rc.x0, lvl, rc.z0, rc.x1, rc.z1);
    if (tpl.tags.includes('glass')) glazeRoom(bp, rc, lvl, style);
    rooms.push(room);
    return room;
  };

  // rooms along a segment of a strip
  const fillStrip = (strip) => {
    const rv0 = Math.max(strip.roomV0, clip.v0), rv1 = Math.min(strip.roomV1, clip.v1);
    if (rv1 - rv0 + 1 < 3) { // too shallow: solid service band
      if (strip.wallV >= clip.v0 && strip.wallV <= clip.v1) for (let v = Math.min(strip.wallV, rv0); v <= Math.max(strip.wallV, rv1); v++) wallRow(v, clip.u0, clip.u1);
      return;
    }
    if (strip.wallV < clip.v0 || strip.wallV > clip.v1) return;
    for (const seg of segments(strip)) {
      const len = seg.b - seg.a + 1;
      if (len < 3) { for (let v = Math.min(strip.wallV, rv0); v <= Math.max(strip.wallV, rv1); v++) wallRow(v, seg.a, seg.b); continue; }
      wallRow(strip.wallV, seg.a, seg.b);
      if (seg.wallB) wallCol(seg.wallBu, Math.min(strip.wallV, rv0), Math.max(strip.wallV, rv1));
      if (seg.wallA) wallCol(seg.wallAu, Math.min(strip.wallV, rv0), Math.max(strip.wallV, rv1));
      const widths = splitLen(len, rng);
      let u = seg.a;
      for (let i = 0; i < widths.length; i++) {
        const w = widths[i], u0 = u, u1 = u + w - 1;
        if (i < widths.length - 1) wallCol(u1 + 1, Math.min(strip.wallV, rv0), Math.max(strip.wallV, rv1));
        const doorU = u0 + rng.int(0, Math.max(0, w - 2));
        const depth = rv1 - rv0 + 1;
        const pool = P.pool || pools.typical;
        if (depth >= 10) {
          // deep strip: a front room (5 deep) and a back room through an inner door
          const frontIsNearWall = strip.wallAtBack ? false : true;
          const innerV = frontIsNearWall ? rv0 + 5 : rv1 - 5;
          const fr = frontIsNearWall ? [rv0, rv0 + 4] : [rv1 - 4, rv1];
          const br = frontIsNearWall ? [rv0 + 6, rv1] : [rv0, rv1 - 6];
          wallRow(innerV, u0, u1);
          makeRoom(u0, u1, fr[0], fr[1], strip.wallV, doorU, pool);
          const innerDoorU = u0 + rng.int(0, Math.max(0, w - 2));
          makeRoom(u0, u1, br[0], br[1], innerV, innerDoorU, pools.back || pool);
        } else {
          makeRoom(u0, u1, rv0, rv1, strip.wallV, doorU, pool);
        }
        u = u1 + 2;
      }
    }
  };

  const lobbyMode = P.mode === 'lobby' || P.mode === 'skylobby';
  for (const strip of layout.strips) {
    if (strip.kind === 'front' && (lobbyMode || P.mode === 'gallery')) continue;
    if (strip.backWallV !== undefined) {
      wallRow(strip.backWallV, clip.u0, clip.u1);
      for (let u = con.u0; u <= con.u1; u++) if (inClip(u, strip.backWallV)) for (let y = lvl; y <= lvl + 3; y++) put(u, y, strip.backWallV, FORCE_AIR);
    }
    fillStrip(strip);
  }
  if (P.mode === 'gallery') {
    // the level above a double-height lobby: void over the lobby with a railing along the corridor edge
    for (let u = clip.u0; u <= clip.u1; u++) for (let v = clip.v0; v <= layout.s0 - 1; v++) {
      const x = frame.X(u, v), z = frame.Z(u, v);
      bp.fill(x, lvl - 1, z, x, lvl + 3, z, FORCE_AIR);
      if (v === layout.s0 - 1) bp.set(x, lvl, z, B.IRON_BARS);
    }
  }
  // connector walls beside the core band are provided by the core itself; the lift landing pocket
  const core = layout.core;
  if (core.pocketV1 >= core.pocketV0) {
    const rc = frame.rect(core.u0, core.pocketV0, core.u1, core.pocketV1);
    const room = new Room(bp, { ...rc, y: lvl, h: 4, side: frame.sideTowardBack(), doorU: -100, doorW: 0 }, 'lift_landing', ctx);
    ROOMS.lift_landing.fn(room, rng, ctx);
    bp.room('lift_landing', rc.x0, lvl, rc.z0, rc.x1, rc.z1);
  }
  if (lobbyMode) {
    // the lobby occupies the whole front strip (rows 0..s0-1); the ground lobby is two levels high
    const rc = frame.rect(clip.u0, 0, clip.u1, layout.s0 - 1);
    const Iu = clip.u1 - clip.u0 + 1;
    const c = P.doorU !== undefined ? P.doorU - 1 : clip.u0 + Math.floor(Iu / 2) - 1;
    const side = frame.sideTowardFront();
    const alongX = side === 'N' || side === 'S';
    const dxa = frame.X(c - 1, -1), dza = frame.Z(c - 1, -1);
    const doorU = alongX ? Math.min(dxa, frame.X(c + 2, -1)) - rc.x0 : Math.min(dza, frame.Z(c + 2, -1)) - rc.z0;
    const h = P.mode === 'lobby' ? 9 : 4;
    const room = new Room(bp, { ...rc, y: lvl, h, side, doorU, doorW: 4 }, 'lobby_atrium', { ...ctx, style });
    ROOMS.lobby_atrium.fn(room, rng, { ...ctx, style });
    room.finalize();
    bp.room('lobby_atrium', rc.x0, lvl, rc.z0, rc.x1, rc.z1);
    if (P.mode === 'lobby') { const lc = frame.X(c, 2), lz = frame.Z(c, 2); bp.meta.lobby = { x: bp.wx(lc), y: bp.wy(lvl), z: bp.wz(lz) }; }
    rooms.push(room);
  }
  return rooms;
}

// Entrance opening in the exterior wall row v = -1: `wide` cells from u0, `high` blocks from lvl, with a lit lintel.
export function cutEntrance(bp, frame, u0, wide, lvl, high, trim) {
  for (let k = 0; k < wide; k++) {
    const x = frame.X(u0 + k, -1), z = frame.Z(u0 + k, -1);
    bp.fill(x, lvl, z, x, lvl + high - 1, z, FORCE_AIR);
    bp.set(x, lvl + high, z, trim);
  }
}

// Insets a tier may use on each plan side without cutting the core, the connector or the first corridor.
export function insetLimits(frame, layout) {
  return {
    l: Math.max(0, layout.connector.u0 - 1),
    r: Math.max(0, frame.Iu - 2 - layout.core.u1),
    f: layout.s0,
    b: Math.max(0, frame.Iv - 2 - layout.core.v1),
  };
}

// Replaces the exterior wall cells around a room with tinted glass (observation decks). Only cells that are
// exterior walls of the building (outside the room and adjacent to it, with air beyond) are glazed.
function glazeRoom(bp, rc, lvl, style) {
  const tryGlaze = (x, z, ox, oz) => {
    const id = bp.get(x, lvl + 1, z);
    if (id !== style.wall && id !== style.windowLit && id !== style.windowDark && id !== style.trim) return;
    if (!bp.isAir(x + ox, lvl + 1, z + oz)) return; // not an exterior face
    for (let y = lvl + 1; y <= lvl + 3; y++) bp.set(x, y, z, B.STEEL_GLASS);
  };
  for (let x = rc.x0; x <= rc.x1; x++) { tryGlaze(x, rc.z0 - 1, 0, -1); tryGlaze(x, rc.z1 + 1, 0, 1); }
  for (let z = rc.z0; z <= rc.z1; z++) { tryGlaze(rc.x0 - 1, z, -1, 0); tryGlaze(rc.x1 + 1, z, 1, 0); }
}
