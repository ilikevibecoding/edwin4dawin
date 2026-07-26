// Map compiler: turns layout.js data into merged meshes, collision boxes,
// doors, breakable glass panes and light positions. Walls are derived from
// room adjacency, so the map is watertight by construction.
import * as THREE from 'three';
import {
  ROOMS, CONNECTIONS, WINDOWS, INTERIOR_GLASS, STAIRS, SPECIALS,
  FLOOR_Y, SLAB, WALL_EXT, WALL_INT, GLASS_T,
} from './layout.js';
import { GeoBatcher, boxGeo } from '../assets/geo.js';
import { getMaterial, roomMaterials } from '../assets/materials.js';
import { Door } from './doors.js';
import { GlassPane } from './glass.js';

const DOOR_TYPES = new Set(['door', 'double', 'glassdoor', 'firedoor', 'securitydoor', 'restroomdoor', 'shutter']);

export function buildMap(game) {
  const ctx = {
    game,
    batch: new GeoBatcher(),
    group: new THREE.Group(),
    coll: game.world.collision,
    doors: [],
    panes: [],
    lights: [],
    interactables: [],
    errors: [],
  };
  ctx.group.name = 'map-static';

  const edges = computePairEdges(ctx);
  attachConnections(ctx, edges);
  buildPairWalls(ctx, edges);
  buildExteriorWalls(ctx, edges);
  buildFloorsAndCeilings(ctx);
  buildStairs(ctx);
  buildRoomRailings(ctx);
  buildSpecials(ctx);
  buildLightSpecs(ctx);

  const meshes = ctx.batch.buildMeshes((k) => getMaterial(k));
  for (const m of meshes) ctx.group.add(m);
  for (const d of ctx.doors) ctx.group.add(d.group);
  for (const p of ctx.panes) ctx.group.add(p.mesh);

  if (ctx.errors.length) {
    for (const e of ctx.errors) console.warn('[mapbuilder] ' + e);
  }
  return {
    group: ctx.group, doors: ctx.doors, panes: ctx.panes,
    lights: ctx.lights, interactables: ctx.interactables,
  };
}

// ---------------------------------------------------------------------------
// shared edges
// ---------------------------------------------------------------------------
function sharedEdge(ra, rb) {
  const [ax0, az0, ax1, az1] = ra.rect;
  const [bx0, bz0, bx1, bz1] = rb.rect;
  const eps = 0.02;
  if (Math.abs(ax1 - bx0) < eps || Math.abs(ax0 - bx1) < eps) {
    const x = Math.abs(ax1 - bx0) < eps ? ax1 : ax0;
    const lo = Math.max(az0, bz0), hi = Math.min(az1, bz1);
    if (hi - lo > 0.25) return { dir: 'v', coord: x, lo, hi };
  }
  if (Math.abs(az1 - bz0) < eps || Math.abs(az0 - bz1) < eps) {
    const z = Math.abs(az1 - bz0) < eps ? az1 : az0;
    const lo = Math.max(ax0, bx0), hi = Math.min(ax1, bx1);
    if (hi - lo > 0.25) return { dir: 'h', coord: z, lo, hi };
  }
  return null;
}

function computePairEdges(ctx) {
  const edges = [];
  for (let i = 0; i < ROOMS.length; i++) {
    for (let j = i + 1; j < ROOMS.length; j++) {
      const a = ROOMS[i], b = ROOMS[j];
      if (a.floor !== b.floor) continue;
      const e = sharedEdge(a, b);
      if (e) edges.push({ a, b, edge: e, conns: [], floor: a.floor });
    }
  }
  return edges;
}

function attachConnections(ctx, edges) {
  for (const conn of CONNECTIONS) {
    const pe = edges.find((e) =>
      (e.a.id === conn.a && e.b.id === conn.b) || (e.a.id === conn.b && e.b.id === conn.a));
    if (!pe) { ctx.errors.push(`connection ${conn.a}-${conn.b} has no shared edge`); continue; }
    const { lo, hi } = pe.edge;
    let at = conn.at != null ? lo + conn.at : (lo + hi) / 2;
    const halfW = conn.w / 2;
    at = Math.max(lo + halfW + 0.18, Math.min(hi - halfW - 0.18, at));
    pe.conns.push({ ...conn, atAbs: at });
  }
}

// which floor-1 room hangs above a point
function floor1At(x, z) {
  return ROOMS.find((r) => r.floor === 1 && contains(r.rect, x, z));
}
function groundAt(x, z) {
  return ROOMS.find((r) => r.floor === 0 && contains(r.rect, x, z));
}
function contains(rect, x, z) {
  return x >= rect[0] - 0.01 && x <= rect[2] + 0.01 && z >= rect[1] - 0.01 && z <= rect[3] + 0.01;
}

// point slightly inside `room` from the middle of an edge segment
function insidePoint(room, edge, seg, dist = 0.45) {
  const mid = ((seg?.lo ?? edge.lo) + (seg?.hi ?? edge.hi)) / 2;
  const [x0, z0, x1, z1] = room.rect;
  if (edge.dir === 'v') {
    const sign = Math.abs(edge.coord - x0) < 0.05 ? 1 : -1; // room is east of its west edge
    return { x: edge.coord + sign * dist, z: mid };
  }
  const sign = Math.abs(edge.coord - z0) < 0.05 ? 1 : -1;
  return { x: mid, z: edge.coord + sign * dist };
}

function effTop(room, edge, seg) {
  if (room.floor === 1) return FLOOR_Y[1] + room.ceil;
  const p = insidePoint(room, edge, seg);
  return floor1At(p.x, p.z) ? FLOOR_Y[1] : room.ceil;
}

// windows for room+side with absolute coordinates along the edge
function windowsFor(room, edge) {
  const side = sideOfEdge(room, edge);
  if (!side) return [];
  const out = [];
  const [x0, z0, x1, z1] = room.rect;
  for (const w of WINDOWS) {
    if (w.room !== room.id || w.side !== side) continue;
    const min = edge.dir === 'v' ? z0 : x0;
    out.push({
      lo: min + w.from, hi: min + w.to,
      y0: FLOOR_Y[room.floor] + w.sill, y1: FLOOR_Y[room.floor] + w.head,
      kind: w.kind,
    });
  }
  return out;
}

function sideOfEdge(room, edge) {
  const [x0, z0, x1, z1] = room.rect;
  if (edge.dir === 'v') {
    if (Math.abs(edge.coord - x0) < 0.05) return 'w';
    if (Math.abs(edge.coord - x1) < 0.05) return 'e';
  } else {
    if (Math.abs(edge.coord - z0) < 0.05) return 'n';
    if (Math.abs(edge.coord - z1) < 0.05) return 's';
  }
  return null;
}

// ---------------------------------------------------------------------------
// wall segment builder: solid boxes around rectangular holes
// ---------------------------------------------------------------------------
function buildWallSegment(ctx, seg) {
  // seg: {dir, coord, lo, hi, y0, y1, t, matKey, collMat, penetrable, holes[]}
  const holes = (seg.holes || [])
    .map((h) => ({ ...h, lo: Math.max(h.lo, seg.lo), hi: Math.min(h.hi, seg.hi) }))
    .filter((h) => h.hi - h.lo > 0.03 && h.y1 > seg.y0 && h.y0 < seg.y1);
  const cuts = new Set([seg.lo, seg.hi]);
  for (const h of holes) { cuts.add(h.lo); cuts.add(h.hi); }
  const xs = [...cuts].sort((p, q) => p - q);
  for (let i = 0; i < xs.length - 1; i++) {
    const lo = xs[i], hi = xs[i + 1];
    if (hi - lo < 0.008) continue;
    const mid = (lo + hi) / 2;
    const covering = holes.filter((h) => h.lo <= mid + 1e-6 && h.hi >= mid - 1e-6);
    let spans = [[seg.y0, seg.y1]];
    for (const h of covering) spans = subtractSpan(spans, h.y0, h.y1);
    for (const [a, b] of spans) {
      if (b - a < 0.015) continue;
      addWallBox(ctx, seg, lo, hi, a, b);
    }
  }
}

function subtractSpan(spans, y0, y1) {
  const out = [];
  for (const [a, b] of spans) {
    if (y1 <= a || y0 >= b) { out.push([a, b]); continue; }
    if (y0 > a) out.push([a, y0]);
    if (y1 < b) out.push([y1, b]);
  }
  return out;
}

function addWallBox(ctx, seg, lo, hi, y0, y1) {
  const len = hi - lo, h = y1 - y0;
  const cAlong = (lo + hi) / 2, cy = (y0 + y1) / 2;
  let cx, cz, sx, sz;
  if (seg.dir === 'v') { cx = seg.coord; cz = cAlong; sx = seg.t; sz = len; }
  else { cx = cAlong; cz = seg.coord; sx = len; sz = seg.t; }
  ctx.batch.addBox(seg.matKey, cx, cy, cz, sx, h, sz, { uvScale: 1 });
  ctx.coll.addBox(
    { x: cx - sx / 2, y: y0, z: cz - sz / 2 },
    { x: cx + sx / 2, y: y1, z: cz + sz / 2 },
    { tag: 'wall', material: seg.collMat, penetrable: seg.penetrable });
}

// ---------------------------------------------------------------------------
// pair walls
// ---------------------------------------------------------------------------
function buildPairWalls(ctx, edges) {
  for (const pe of edges) {
    const { a, b, edge, floor } = pe;
    // skip floor-1 pair walls fully covered by a taller ground wall
    if (floor === 1) {
      const pA = insidePoint(a, edge, null);
      const pB = insidePoint(b, edge, null);
      const gA = groundAt(pA.x, pA.z), gB = groundAt(pB.x, pB.z);
      if (gA && gB && gA.id === gB.id && gA.ceil > 3.7) {
        // hangs inside one tall volume: openings become railing gaps, no wall
        continue;
      }
    }
    const isExtPair = a.style === 'exterior' || b.style === 'exterior';
    const stairPair = a.isStairwell || b.isStairwell;
    const floorY = FLOOR_Y[floor];
    const y0 = floor === 1 ? FLOOR_Y[1] - 0.3 : floorY - 0.05;
    const topA = effTop(a, edge, null), topB = effTop(b, edge, null);
    let y1 = Math.max(topA, topB) + (floor === 0 ? 0 : FLOOR_Y[0]);
    if (floor === 1) y1 = Math.max(FLOOR_Y[1] + a.ceil, FLOOR_Y[1] + b.ceil);
    if (isExtPair) {
      const inner = a.style === 'exterior' ? b : a;
      y1 = effTop(inner, edge, null) === FLOOR_Y[1] ? 3.3 : inner.ceil + 0.9;
    }
    const t = isExtPair ? WALL_EXT : (stairPair ? 0.24 : WALL_INT);
    const matKey = isExtPair ? 'wall_ext' : (stairPair ? 'wall_ext' : 'wall_int');
    const collMat = isExtPair || stairPair ? 'concrete' : 'drywall';

    const holes = [];
    const glassWalls = [];
    for (const conn of pe.conns) {
      const halfW = conn.w / 2;
      if (conn.type === 'open') {
        const head = floorY + Math.min(a.ceil, b.ceil) - 0.22;
        holes.push({ lo: conn.atAbs - halfW, hi: conn.atAbs + halfW, y0: floorY, y1: head });
      } else if (conn.type === 'arch') {
        holes.push({ lo: conn.atAbs - halfW, hi: conn.atAbs + halfW, y0: floorY, y1: floorY + 2.15 });
      } else if (conn.type === 'shutter') {
        holes.push({ lo: conn.atAbs - halfW, hi: conn.atAbs + halfW, y0: floorY, y1: floorY + 3.2 });
        makeDoor(ctx, conn, edge, floorY, 3.2);
      } else if (conn.type === 'glasswall+glassdoor') {
        const dlo = conn.atAbs - halfW, dhi = conn.atAbs + halfW;
        holes.push({ lo: dlo, hi: dhi, y0: floorY, y1: floorY + 2.1 });
        // glass wall over the remaining shared edge
        const glo = edge.lo + 0.15, ghi = edge.hi - 0.15;
        glassWalls.push({ lo: glo, hi: ghi, skip: [dlo - 0.06, dhi + 0.06], sill: 0.12, head: 2.6 });
        holes.push({ lo: glo, hi: dlo - 0.06, y0: floorY + 0.12, y1: floorY + 2.6 });
        holes.push({ lo: dhi + 0.06, hi: ghi, y0: floorY + 0.12, y1: floorY + 2.6 });
        makeDoor(ctx, { ...conn, type: 'glassdoor' }, edge, floorY, 2.1);
      } else if (DOOR_TYPES.has(conn.type)) {
        const h = 2.06;
        holes.push({ lo: conn.atAbs - halfW, hi: conn.atAbs + halfW, y0: floorY, y1: floorY + h });
        makeDoor(ctx, conn, edge, floorY, h);
      }
    }

    // windows registered on either room for this edge (e.g. lobby clerestory)
    for (const w of [...windowsFor(a, edge), ...windowsFor(b, edge)]) {
      holes.push({ lo: w.lo, hi: w.hi, y0: w.y0, y1: w.y1 });
      makeGlassStrip(ctx, edge, w.lo, w.hi, w.y0, w.y1, w.kind, t);
    }
    // interior glass panels
    for (const ig of INTERIOR_GLASS) {
      if (!((ig.a === a.id && ig.b === b.id) || (ig.a === b.id && ig.b === a.id))) continue;
      const lo = edge.lo + ig.from, hi = edge.lo + ig.to;
      holes.push({ lo, hi, y0: floorY + ig.sill, y1: floorY + ig.head });
      makeGlassStrip(ctx, edge, lo, hi, floorY + ig.sill, floorY + ig.head, 'clear', t);
    }
    for (const gw of glassWalls) {
      makeGlassStrip(ctx, edge, gw.lo, gw.skip[0], floorY + gw.sill, floorY + gw.head, 'clear', t);
      makeGlassStrip(ctx, edge, gw.skip[1], gw.hi, floorY + gw.sill, floorY + gw.head, 'clear', t);
    }

    buildWallSegment(ctx, {
      dir: edge.dir, coord: edge.coord, lo: edge.lo, hi: edge.hi,
      y0, y1, t, matKey, collMat,
      penetrable: collMat === 'drywall', holes,
    });
  }
}

// ---------------------------------------------------------------------------
// exterior walls
// ---------------------------------------------------------------------------
function buildExteriorWalls(ctx, edges) {
  for (const room of ROOMS) {
    const [x0, z0, x1, z1] = room.rect;
    const sides = [
      { side: 'w', dir: 'v', coord: x0, lo: z0, hi: z1 },
      { side: 'e', dir: 'v', coord: x1, lo: z0, hi: z1 },
      { side: 'n', dir: 'h', coord: z0, lo: x0, hi: x1 },
      { side: 's', dir: 'h', coord: z1, lo: x0, hi: x1 },
    ];
    for (const s of sides) {
      // subtract neighbor segments on the same line
      let intervals = [[s.lo, s.hi]];
      for (const pe of edges) {
        if (pe.a !== room && pe.b !== room) continue;
        const e = pe.edge;
        if (e.dir !== s.dir || Math.abs(e.coord - s.coord) > 0.03) continue;
        intervals = subtractSpan(intervals, e.lo, e.hi);
      }
      for (const [lo, hi] of intervals) {
        if (hi - lo < 0.12) continue;
        buildExteriorInterval(ctx, room, { ...s, lo, hi });
      }
    }
  }
}

function buildExteriorInterval(ctx, room, seg) {
  const floorY = FLOOR_Y[room.floor];
  let y0, y1, t = WALL_EXT, matKey = 'wall_ext';

  if (room.style === 'exterior') {
    // courtyard boundary wall
    y0 = -0.2; y1 = 2.6; t = 0.25;
    buildWallSegment(ctx, { dir: seg.dir, coord: seg.coord, lo: seg.lo, hi: seg.hi, y0, y1, t, matKey, collMat: 'concrete', holes: [] });
    return;
  }

  if (room.floor === 1) {
    // railing rule: floor-1 edge hanging inside a tall ground volume
    const mid = (seg.lo + seg.hi) / 2;
    const inP = insidePoint(room, seg, { lo: seg.lo, hi: seg.hi });
    const outP = seg.dir === 'v'
      ? { x: seg.coord * 2 - inP.x, z: mid }
      : { x: mid, z: seg.coord * 2 - inP.z };
    const gIn = groundAt(inP.x, inP.z), gOut = groundAt(outP.x, outP.z);
    if (gIn && gOut && gIn.id === gOut.id && gIn.ceil > 3.7) {
      buildRailing(ctx, seg, FLOOR_Y[1]);
      return;
    }
    y0 = FLOOR_Y[1] - 0.3;
    y1 = FLOOR_Y[1] + room.ceil + 0.9;
  } else {
    const p = insidePoint(room, seg, { lo: seg.lo, hi: seg.hi });
    const f1 = floor1At(p.x, p.z);
    y0 = -0.2;
    y1 = f1 ? 3.3 : room.ceil + 0.9;
    if (room.id === 'garage' || room.id === 'loading') y1 = room.ceil + 0.9;
  }

  const holes = [];
  for (const w of windowsFor(room, { dir: seg.dir, coord: seg.coord, lo: seg.dir === 'v' ? room.rect[1] : room.rect[0], hi: seg.dir === 'v' ? room.rect[3] : room.rect[2] })) {
    // clip to this interval
    const lo = Math.max(w.lo, seg.lo), hi = Math.min(w.hi, seg.hi);
    if (hi - lo < 0.1) continue;
    holes.push({ lo, hi, y0: w.y0, y1: w.y1 });
    makeGlassStrip(ctx, { dir: seg.dir, coord: seg.coord }, lo, hi, w.y0, w.y1, w.kind, WALL_EXT);
  }

  // garage exit shutter hole
  const ge = SPECIALS.garageExit;
  if (room.id === ge.room && sideMatches(room, seg, ge.side)) {
    const min = seg.dir === 'v' ? room.rect[1] : room.rect[0];
    const lo = min + ge.from, hi = min + ge.to;
    holes.push({ lo, hi, y0: floorY, y1: floorY + ge.head });
    const edge = { dir: seg.dir, coord: seg.coord, lo, hi };
    const door = new Door(ctx.game, {
      id: ge.id, name: ge.name, type: 'shutter',
      edge, at: (lo + hi) / 2, w: hi - lo, h: ge.head, floorY,
      startLocked: true,
    });
    door.keycard = 'mission';
    ctx.doors.push(door);
  }

  buildWallSegment(ctx, {
    dir: seg.dir, coord: seg.coord, lo: seg.lo, hi: seg.hi,
    y0, y1, t, matKey, collMat: 'concrete', penetrable: false, holes,
  });
}

function sideMatches(room, seg, side) {
  const [x0, z0, x1, z1] = room.rect;
  if (side === 'w') return seg.dir === 'v' && Math.abs(seg.coord - x0) < 0.05;
  if (side === 'e') return seg.dir === 'v' && Math.abs(seg.coord - x1) < 0.05;
  if (side === 'n') return seg.dir === 'h' && Math.abs(seg.coord - z0) < 0.05;
  if (side === 's') return seg.dir === 'h' && Math.abs(seg.coord - z1) < 0.05;
  return false;
}

// ---------------------------------------------------------------------------
// glass
// ---------------------------------------------------------------------------
function makeGlassStrip(ctx, edge, lo, hi, y0, y1, kind, wallT) {
  if (hi - lo < 0.1) return;
  const paneW = 1.35;
  const n = Math.max(1, Math.round((hi - lo) / paneW));
  const w = (hi - lo) / n;
  for (let i = 0; i < n; i++) {
    const plo = lo + i * w, phi = plo + w;
    const c = (plo + phi) / 2;
    const pane = new GlassPane(ctx.game, {
      dir: edge.dir, coord: edge.coord, lo: plo + 0.02, hi: phi - 0.02, y0, y1, kind,
    });
    ctx.panes.push(pane);
    // mullions between panes + frame
    if (i > 0) {
      const mx = edge.dir === 'v' ? edge.coord : plo;
      const mz = edge.dir === 'v' ? plo : edge.coord;
      ctx.batch.addBox('wall_glassframe', mx, (y0 + y1) / 2, mz,
        edge.dir === 'v' ? wallT * 0.55 : 0.06, y1 - y0, edge.dir === 'v' ? 0.06 : wallT * 0.55);
    }
  }
  // top/bottom frame rails
  const c = (lo + hi) / 2, len = hi - lo;
  const fx = edge.dir === 'v' ? edge.coord : c;
  const fz = edge.dir === 'v' ? c : edge.coord;
  const railSx = edge.dir === 'v' ? wallT * 0.6 : len;
  const railSz = edge.dir === 'v' ? len : wallT * 0.6;
  ctx.batch.addBox('wall_glassframe', fx, y0 - 0.035, fz, railSx, 0.07, railSz);
  ctx.batch.addBox('wall_glassframe', fx, y1 + 0.035, fz, railSx, 0.07, railSz);
}

// ---------------------------------------------------------------------------
// doors
// ---------------------------------------------------------------------------
function makeDoor(ctx, conn, edge, floorY, h) {
  const door = new Door(ctx.game, {
    id: conn.id, name: conn.name || 'Door', type: conn.type,
    edge, at: conn.atAbs, w: conn.w, h, floorY,
    startLocked: conn.startLocked, keycard: conn.keycard,
  });
  ctx.doors.push(door);
  // frame jambs + header
  const t = 0.09, d = (edge.dir === 'v' ? WALL_INT : WALL_INT) + 0.06;
  const j1 = conn.atAbs - conn.w / 2 - t / 2, j2 = conn.atAbs + conn.w / 2 + t / 2;
  if (edge.dir === 'v') {
    ctx.batch.addBox('frame', edge.coord, floorY + h / 2, j1, d, h, t);
    ctx.batch.addBox('frame', edge.coord, floorY + h / 2, j2, d, h, t);
    ctx.batch.addBox('frame', edge.coord, floorY + h + 0.045, conn.atAbs, d, 0.09, conn.w + t * 2);
  } else {
    ctx.batch.addBox('frame', j1, floorY + h / 2, edge.coord, t, h, d);
    ctx.batch.addBox('frame', j2, floorY + h / 2, edge.coord, t, h, d);
    ctx.batch.addBox('frame', conn.atAbs, floorY + h + 0.045, edge.coord, conn.w + t * 2, 0.09, d);
  }
}

// ---------------------------------------------------------------------------
// floors & ceilings
// ---------------------------------------------------------------------------
function buildFloorsAndCeilings(ctx) {
  const floor1Rects = ROOMS.filter((r) => r.floor === 1).map((r) => r.rect);
  for (const room of ROOMS) {
    const mats = roomMaterials(room.style);
    const [x0, z0, x1, z1] = room.rect;
    const w = x1 - x0, d = z1 - z0;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const floorY = FLOOR_Y[room.floor];

    if (room.floor === 0) {
      ctx.batch.addBox(mats.floor, cx, floorY - 0.15, cz, w, 0.3, d);
      ctx.coll.addBox({ x: x0, y: floorY - 0.3, z: z0 }, { x: x1, y: floorY, z: z1 },
        { tag: 'floor', material: mats.floorTag });
      if (room.ceil > 0) {
        // ceiling only where no floor-1 room hangs above
        let pieces = [room.rect];
        for (const fr of floor1Rects) pieces = rectSubtract(pieces, fr);
        for (const p of pieces) {
          const pw = p[2] - p[0], pd = p[3] - p[1];
          if (pw < 0.05 || pd < 0.05) continue;
          ctx.batch.addBox(mats.ceiling || 'ceiling', (p[0] + p[2]) / 2, room.ceil + 0.18, (p[1] + p[3]) / 2, pw, 0.36, pd);
          ctx.coll.addBox({ x: p[0], y: room.ceil, z: p[1] }, { x: p[2], y: room.ceil + 0.36, z: p[3] },
            { tag: 'ceiling', material: 'drywall', penetrable: false });
        }
      }
    } else {
      // floor-1 slab with stair holes
      let pieces = [room.rect];
      for (const st of STAIRS) for (const hole of st.holes) pieces = rectSubtract(pieces, hole);
      for (const p of pieces) {
        const pw = p[2] - p[0], pd = p[3] - p[1];
        if (pw < 0.05 || pd < 0.05) continue;
        ctx.batch.addBox(mats.floor, (p[0] + p[2]) / 2, floorY - SLAB / 2, (p[1] + p[3]) / 2, pw, SLAB, pd);
        ctx.coll.addBox({ x: p[0], y: floorY - SLAB, z: p[1] }, { x: p[2], y: floorY, z: p[3] },
          { tag: 'floor', material: mats.floorTag });
      }
      // ceiling
      const cy = floorY + room.ceil;
      ctx.batch.addBox(mats.ceiling || 'ceiling', cx, cy + 0.18, cz, w, 0.36, d);
      ctx.coll.addBox({ x: x0, y: cy, z: z0 }, { x: x1, y: cy + 0.36, z: z1 },
        { tag: 'ceiling', material: 'drywall' });
    }
  }
}

function rectSubtract(pieces, cutter) {
  const [cx0, cz0, cx1, cz1] = cutter;
  const out = [];
  for (const p of pieces) {
    const [x0, z0, x1, z1] = p;
    if (cx1 <= x0 + 0.01 || cx0 >= x1 - 0.01 || cz1 <= z0 + 0.01 || cz0 >= z1 - 0.01) { out.push(p); continue; }
    const ix0 = Math.max(x0, cx0), ix1 = Math.min(x1, cx1);
    const iz0 = Math.max(z0, cz0), iz1 = Math.min(z1, cz1);
    if (iz0 > z0) out.push([x0, z0, x1, iz0]);
    if (iz1 < z1) out.push([x0, iz1, x1, z1]);
    if (ix0 > x0) out.push([x0, iz0, ix0, iz1]);
    if (ix1 < x1) out.push([ix1, iz0, x1, iz1]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// stairs
// ---------------------------------------------------------------------------
function buildStairs(ctx) {
  for (const st of STAIRS) {
    for (const key of ['flight1', 'flight2']) {
      const f = st[key];
      const rise = f.y1 - f.y0;
      const n = Math.ceil(rise / 0.175);
      const stepH = rise / n;
      const dirZ = Math.sign(f.zEnd - f.zStart);
      const run = Math.abs(f.zEnd - f.zStart) / n;
      for (let i = 0; i < n; i++) {
        const zA = f.zStart + dirZ * run * i;
        const zB = zA + dirZ * run;
        const top = f.y0 + stepH * (i + 1);
        const cx = (f.x0 + f.x1) / 2, cz = (zA + zB) / 2;
        const sx = f.x1 - f.x0, sz = Math.abs(zB - zA);
        ctx.batch.addBox('stair', cx, top / 2, cz, sx, top, sz);
        ctx.coll.addBox({ x: f.x0, y: 0, z: Math.min(zA, zB) }, { x: f.x1, y: top, z: Math.max(zA, zB) },
          { tag: 'stair', material: 'concrete' });
      }
    }
    const L = st.landing;
    ctx.batch.addBox('stair', (L.x0 + L.x1) / 2, L.y / 2, (L.z0 + L.z1) / 2, L.x1 - L.x0, L.y, L.z1 - L.z0);
    ctx.coll.addBox({ x: L.x0, y: 0, z: L.z0 }, { x: L.x1, y: L.y, z: L.z1 }, { tag: 'stair', material: 'concrete' });
    const C = st.core;
    ctx.batch.addBox('core', (C.x0 + C.x1) / 2, (C.y0 + C.y1) / 2, (C.z0 + C.z1) / 2, C.x1 - C.x0, C.y1 - C.y0, C.z1 - C.z0);
    ctx.coll.addBox({ x: C.x0, y: C.y0, z: C.z0 }, { x: C.x1, y: C.y1, z: C.z1 }, { tag: 'wall', material: 'concrete' });
    for (const r of st.railings || []) {
      buildRailing(ctx, {
        dir: Math.abs(r.z1 - r.z0) < 0.01 ? 'h' : 'v',
        coord: Math.abs(r.z1 - r.z0) < 0.01 ? r.z0 : r.x0,
        lo: Math.abs(r.z1 - r.z0) < 0.01 ? Math.min(r.x0, r.x1) : Math.min(r.z0, r.z1),
        hi: Math.abs(r.z1 - r.z0) < 0.01 ? Math.max(r.x0, r.x1) : Math.max(r.z0, r.z1),
      }, FLOOR_Y[r.floor]);
    }
  }
}

function buildRailing(ctx, seg, floorY) {
  const len = seg.hi - seg.lo;
  const c = (seg.lo + seg.hi) / 2;
  const h = 1.06;
  const railT = 0.07;
  const cx = seg.dir === 'v' ? seg.coord : c;
  const cz = seg.dir === 'v' ? c : seg.coord;
  const sx = seg.dir === 'v' ? railT : len;
  const sz = seg.dir === 'v' ? len : railT;
  // top rail
  ctx.batch.addBox('railing', cx, floorY + h - 0.035, cz, sx, 0.07, sz);
  // posts
  const nPosts = Math.max(2, Math.round(len / 1.3) + 1);
  for (let i = 0; i < nPosts; i++) {
    const p = seg.lo + (len * i) / (nPosts - 1);
    const px = seg.dir === 'v' ? seg.coord : p;
    const pz = seg.dir === 'v' ? p : seg.coord;
    ctx.batch.addBox('railing', px, floorY + h / 2, pz, 0.06, h, 0.06);
  }
  // glass balustrade panel
  const pane = new GlassPane(ctx.game, {
    dir: seg.dir, coord: seg.coord, lo: seg.lo + 0.05, hi: seg.hi - 0.05,
    y0: floorY + 0.06, y1: floorY + h - 0.09, kind: 'clear', balustrade: true,
  });
  ctx.panes.push(pane);
  // movement blocker (full height of rail, thin)
  ctx.coll.addBox(
    { x: cx - Math.max(sx, 0.07) / 2, y: floorY, z: cz - Math.max(sz, 0.07) / 2 },
    { x: cx + Math.max(sx, 0.07) / 2, y: floorY + h, z: cz + Math.max(sz, 0.07) / 2 },
    { tag: 'railing', material: 'metal', vision: false, bullet: false });
}

function buildRoomRailings(ctx) {
  for (const room of ROOMS) {
    if (!room.railing) continue;
    const [x0, z0, x1, z1] = room.rect;
    for (const r of room.railing) {
      if (r.side === 'south') buildRailing(ctx, { dir: 'h', coord: z1, lo: x0 + 0.1, hi: x1 - 0.1 }, FLOOR_Y[room.floor]);
      if (r.side === 'north') buildRailing(ctx, { dir: 'h', coord: z0, lo: x0 + 0.1, hi: x1 - 0.1 }, FLOOR_Y[room.floor]);
      if (r.side === 'east') buildRailing(ctx, { dir: 'v', coord: x1, lo: z0 + 0.1, hi: z1 - 0.1 }, FLOOR_Y[room.floor]);
      if (r.side === 'west') buildRailing(ctx, { dir: 'v', coord: x0, lo: z0 + 0.1, hi: z1 - 0.1 }, FLOOR_Y[room.floor]);
    }
  }
}

// ---------------------------------------------------------------------------
// specials & lights
// ---------------------------------------------------------------------------
function buildSpecials(ctx) {
  // extraction panel on the garage east wall
  const p = SPECIALS.extractionPanel;
  ctx.batch.addBox('door_security', p.x, p.y, p.z, 0.09, 0.5, 0.4);
  ctx.interactables.push({
    type: 'panel', id: 'extraction_panel', name: p.name,
    pos: { x: p.x, y: p.y, z: p.z }, radius: 1.6,
  });

  // big snow ground plane + sky handled by environment/lighting
  const ground = new THREE.Mesh(
    boxGeo(360, 0.2, 360, 0.05),
    getMaterial('floor_snow'));
  ground.position.set(0, -0.14, 0);
  ground.receiveShadow = true;
  ctx.group.add(ground);
}

function buildLightSpecs(ctx) {
  for (const room of ROOMS) {
    if (room.style === 'exterior' || room.ceil <= 0) continue;
    const [x0, z0, x1, z1] = room.rect;
    const floorY = FLOOR_Y[room.floor];
    const w = x1 - x0, d = z1 - z0;
    const nx = Math.max(1, Math.round(w / 3.6));
    const nz = Math.max(1, Math.round(d / 3.6));
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const x = x0 + (w * (i + 0.5)) / nx;
        const z = z0 + (d * (j + 0.5)) / nz;
        const ceilY = room.id === 'lobby' ? floorY + Math.min(room.ceil, 6.9) : floorY + room.ceil;
        ctx.lights.push({ room: room.id, style: room.style, x, y: ceilY - 0.12, z });
      }
    }
  }
}
