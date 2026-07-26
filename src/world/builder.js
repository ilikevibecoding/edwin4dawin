// Compiles map.js data into renderable geometry + colliders + entities.
// Walls are DERIVED from room adjacency (shared edges -> interior walls,
// unmatched edges -> exterior shell), then door/window/glass holes are cut.
// This guarantees visuals, collision and navigation always agree.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as MAP from './map.js';
import { getMaterial, getGlassMaterial, FLOOR_STYLES } from './materials.js';
import { World, aabb } from './worldRuntime.js';
import { createDoor } from '../game/doors.js';

const EPS = 0.001;

// Batches boxes by material then merges into few meshes.
class Batch {
  constructor() { this.byMat = new Map(); }
  box(matName, cx, cy, cz, sx, sy, sz, rotY = 0) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    if (rotY) g.rotateY(rotY);
    g.translate(cx, cy, cz);
    if (!this.byMat.has(matName)) this.byMat.set(matName, []);
    this.byMat.get(matName).push(g);
  }
  plane(matName, cx, cy, cz, sx, sz, facing = 'up') {
    const g = new THREE.PlaneGeometry(sx, sz);
    if (facing === 'up') g.rotateX(-Math.PI / 2);
    else if (facing === 'down') g.rotateX(Math.PI / 2);
    g.translate(cx, cy, cz);
    if (!this.byMat.has(matName)) this.byMat.set(matName, []);
    this.byMat.get(matName).push(g);
  }
  build(group, { shadows = true } = {}) {
    for (const [matName, geos] of this.byMat) {
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, getMaterial(matName));
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      for (const g of geos) g.dispose();
    }
    this.byMat.clear();
  }
}

// ---- interval helpers ----
function overlap1d(a0, a1, b0, b1) {
  const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
  return hi - lo > EPS ? [lo, hi] : null;
}
function subtract1d(span, holes) {
  let parts = [span];
  for (const h of holes) {
    const next = [];
    for (const p of parts) {
      const o = overlap1d(p[0], p[1], h[0], h[1]);
      if (!o) { next.push(p); continue; }
      if (o[0] - p[0] > EPS) next.push([p[0], o[0]]);
      if (p[1] - o[1] > EPS) next.push([o[1], p[1]]);
    }
    parts = next;
  }
  return parts;
}

const DOOR_HEADS = {
  'office': 2.06, 'restroom': 2.06, 'metal': 2.06, 'fire': 2.1, 'exec': 2.1,
  'security': 2.1, 'glass': 2.3, 'double-glass': 2.5, 'fire-double': 2.2, 'metal-double': 2.2,
};

export function buildWorld() {
  const world = new World();
  const group = new THREE.Group();
  group.name = 'world';
  world.group = group;
  world.roomOf = (x, z, y) => MAP.roomAt(x, z, y);

  const batch = new Batch();
  const roomsById = Object.fromEntries(MAP.ROOMS.map((r) => [r.id, r]));

  buildFloorsAndCeilings(world, batch, roomsById);
  buildWalls(world, batch, roomsById);
  buildStairs(world, batch);
  buildExterior(world, batch);

  batch.build(group);

  buildGlassWallsAndWindows(world, group, roomsById);
  buildDoors(world, group, roomsById);
  buildShutters(world, group);

  return world;
}

// --------------------------------------------------------------------------
function floorMatOf(room) { return FLOOR_STYLES[room.floor] || FLOOR_STYLES.concrete; }
function levelY(room) { return MAP.LEVELS[room.level].y; }

function buildFloorsAndCeilings(world, batch, roomsById) {
  for (const room of MAP.ROOMS) {
    const y = levelY(room);
    const style = floorMatOf(room);
    const stair = MAP.STAIRS.find((s) => s.top === room.id);
    for (const [x0, z0, x1, z1] of room.rects) {
      const w = x1 - x0, d = z1 - z0;
      if (!stair) {
        // floor slab (visual + collider + walk surface)
        batch.box(style.mat, (x0 + x1) / 2, y - 0.1, (z0 + z1) / 2, w, 0.2, d);
        world.addCollider(aabb(x0, y - 0.25, z0, x1, y, z1, { kind: 'floor', surface: style.surface, noStand: false }));
        world.surfaces.push({ x0, z0, x1, z1, y, surface: style.surface, room: room.id });
      }
      if (room.outdoor) continue;
      // ceiling
      const openShaft = room.openAbove; // basement stair rooms: open to above
      if (!openShaft) {
        const cy = y + room.ceil;
        const ceilMat = room.zone === 'basement' || room.zone === 'garage' || room.zone === 'loading' || room.zone === 'stair' || room.zone === 'service'
          ? 'concrete_dark' : 'ceiling_tile';
        batch.box(ceilMat, (x0 + x1) / 2, cy + 0.04, (z0 + z1) / 2, w, 0.08, d);
        world.addCollider(aabb(x0, cy, z0, x1, cy + 0.3, z1, { kind: 'ceiling', surface: 'concrete', noStand: true }));
      }
      // roof slab above ground rooms blocks sun into interiors
      if (room.level === 'g') {
        batch.box('concrete_dark', (x0 + x1) / 2, y + room.ceil + 0.28, (z0 + z1) / 2, w + 0.4, 0.24, d + 0.4);
      }
    }
    // top platforms for stair rooms
    if (stair && stair.topPlatform) {
      const [px0, pz0, px1, pz1] = stair.topPlatform;
      const y0 = levelY(room);
      batch.box('concrete', (px0 + px1) / 2, y0 - 0.1, (pz0 + pz1) / 2, px1 - px0, 0.2, pz1 - pz0);
      world.addCollider(aabb(px0, y0 - 0.25, pz0, px1, y0, pz1, { kind: 'floor', surface: 'concrete' }));
      world.surfaces.push({ x0: px0, z0: pz0, x1: px1, z1: pz1, y: y0, surface: 'concrete', room: room.id });
    }
  }
}

// --------------------------------------------------------------------------
function collectEdges() {
  // edge: {level, dir:'x'|'z', line, a, b, room, side:'neg'|'pos'}
  const edges = [];
  for (const room of MAP.ROOMS) {
    for (const [x0, z0, x1, z1] of room.rects) {
      edges.push({ level: room.level, dir: 'x', line: z0, a: x0, b: x1, room: room.id, side: 'pos' }); // room extends to z>line
      edges.push({ level: room.level, dir: 'x', line: z1, a: x0, b: x1, room: room.id, side: 'neg' });
      edges.push({ level: room.level, dir: 'z', line: x0, a: z0, b: z1, room: room.id, side: 'pos' });
      edges.push({ level: room.level, dir: 'z', line: x1, a: z0, b: z1, room: room.id, side: 'neg' });
    }
  }
  return edges;
}

function deriveWallRuns() {
  const edges = collectEdges();
  const byKey = new Map();
  for (const e of edges) {
    const key = `${e.level}|${e.dir}|${e.line.toFixed(3)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(e);
  }
  const runs = []; // {level, dir, line, a, b, roomNeg, roomPos} roomX null => exterior
  for (const list of byKey.values()) {
    const neg = list.filter((e) => e.side === 'neg').map((e) => ({ ...e, spans: [[e.a, e.b]] }));
    const pos = list.filter((e) => e.side === 'pos').map((e) => ({ ...e, spans: [[e.a, e.b]] }));
    // remove same-room internal seams (L-shaped rooms)
    for (const en of neg) {
      for (const ep of pos) {
        if (en.room !== ep.room) continue;
        const holesN = [], holesP = [];
        for (const sn of en.spans) for (const sp of ep.spans) {
          const o = overlap1d(sn[0], sn[1], sp[0], sp[1]);
          if (o) { holesN.push(o); holesP.push(o); }
        }
        if (holesN.length) { en.spans = en.spans.flatMap((s) => subtract1d(s, holesN)); ep.spans = ep.spans.flatMap((s) => subtract1d(s, holesP)); }
      }
    }
    // pair different rooms
    for (const en of neg) {
      for (const ep of pos) {
        if (en.room === ep.room) continue;
        const newSpansN = [];
        for (const sn of en.spans) {
          let remaining = [sn];
          for (const sp of ep.spans) {
            const next = [];
            for (const r of remaining) {
              const o = overlap1d(r[0], r[1], sp[0], sp[1]);
              if (!o) { next.push(r); continue; }
              runs.push({ level: en.level, dir: en.dir, line: en.line, a: o[0], b: o[1], roomNeg: en.room, roomPos: ep.room });
              if (o[0] - r[0] > EPS) next.push([r[0], o[0]]);
              if (r[1] - o[1] > EPS) next.push([o[1], r[1]]);
            }
            remaining = next;
          }
          newSpansN.push(...remaining);
        }
        en.spans = newSpansN;
        // consume from ep too (re-derive: subtract matched runs)
        const matched = runs.filter((r) => r.level === ep.level && r.dir === ep.dir && Math.abs(r.line - ep.line) < EPS && r.roomPos === ep.room);
        ep.spans = ep.spans.flatMap((s) => subtract1d(s, matched.map((m) => [m.a, m.b])));
      }
    }
    // leftovers -> exterior walls
    for (const en of neg) for (const s of en.spans) if (s[1] - s[0] > EPS) runs.push({ level: en.level, dir: en.dir, line: en.line, a: s[0], b: s[1], roomNeg: en.room, roomPos: null });
    for (const ep of pos) for (const s of ep.spans) if (s[1] - s[0] > EPS) runs.push({ level: ep.level, dir: ep.dir, line: ep.line, a: s[0], b: s[1], roomNeg: null, roomPos: ep.room });
  }
  return runs;
}

function holesForRun(run) {
  // all openings whose wall matches this run
  const holes = []; // {a,b, y0,y1 (absolute), kind, ref}
  const match = (item, dirWanted) => item.level === run.level && item.dir === dirWanted &&
    Math.abs(item.line - run.line) < 0.05;
  // NOTE on conventions: for doors/windows dir 'x' means wall runs along X.
  // Run dir 'x' means the SAME (line is a z). Door span given along wall axis.
  const floorY = MAP.LEVELS[run.level].y;
  for (const d of MAP.DOORS) {
    if (!match(d, run.dir)) continue;
    const o = overlap1d(run.a, run.b, d.span[0], d.span[1]);
    if (!o) continue;
    holes.push({ a: d.span[0] - 0.06, b: d.span[1] + 0.06, y0: floorY, y1: floorY + (DOOR_HEADS[d.kind] || 2.06), kind: 'door', ref: d });
  }
  for (const op of MAP.OPENINGS) {
    if (!match(op, run.dir)) continue;
    const o = overlap1d(run.a, run.b, op.span[0], op.span[1]);
    if (!o) continue;
    holes.push({ a: op.span[0], b: op.span[1], y0: floorY, y1: floorY + (op.head || 2.4), kind: 'opening', ref: op });
  }
  for (const gw of MAP.GLASS_WALLS) {
    if (!match(gw, run.dir)) continue;
    const o = overlap1d(run.a, run.b, gw.span[0], gw.span[1]);
    if (!o) continue;
    holes.push({ a: gw.span[0], b: gw.span[1], y0: floorY + gw.sill, y1: floorY + gw.head, kind: 'glasswall', ref: gw });
  }
  for (const w of MAP.WINDOWS) {
    if (!match(w, run.dir)) continue;
    const o = overlap1d(run.a, run.b, w.span[0], w.span[1]);
    if (!o) continue;
    holes.push({ a: w.span[0], b: w.span[1], y0: floorY + w.sill, y1: floorY + w.head, kind: 'window', ref: w });
  }
  for (const s of MAP.SHUTTERS) {
    if (!match(s, run.dir)) continue;
    const o = overlap1d(run.a, run.b, s.span[0], s.span[1]);
    if (!o) continue;
    holes.push({ a: s.span[0], b: s.span[1], y0: floorY, y1: floorY + s.height, kind: 'shutter', ref: s });
  }
  return holes;
}

function wallBoxParams(run, a, b, y0, y1, thick) {
  const len = b - a, h = y1 - y0;
  if (run.dir === 'x') {
    return { cx: (a + b) / 2, cy: (y0 + y1) / 2, cz: run.line, sx: len, sy: h, sz: thick };
  }
  return { cx: run.line, cy: (y0 + y1) / 2, cz: (a + b) / 2, sx: thick, sy: h, sz: len };
}

function emitWallBox(world, batch, run, a, b, y0, y1, thick, matName, colliderProps = {}) {
  if (b - a < EPS || y1 - y0 < EPS) return;
  const p = wallBoxParams(run, a, b, y0, y1, thick);
  batch.box(matName, p.cx, p.cy, p.cz, p.sx, p.sy, p.sz);
  world.addCollider(aabb(p.cx - p.sx / 2, y0, p.cz - p.sz / 2, p.cx + p.sx / 2, y1, p.cz + p.sz / 2,
    { kind: 'wall', surface: colliderProps.surface || 'drywall', ...colliderProps }));
}

function buildWalls(world, batch, roomsById) {
  const runs = deriveWallRuns();
  world._wallRuns = runs;

  // synthetic cross-walls carried by doors (fire door across the corridor)
  for (const d of MAP.DOORS) {
    if (!d.crossWall) continue;
    runs.push({ level: d.level, dir: d.dir, line: d.line, a: d.crossWall[0], b: d.crossWall[1], roomNeg: d.rooms[0], roomPos: d.rooms[1], synthetic: true });
  }

  for (const run of runs) {
    const rn = roomsById[run.roomNeg], rp = roomsById[run.roomPos];
    const exterior = !rn || !rp || rn.outdoor || rp.outdoor;
    const floorY = MAP.LEVELS[run.level].y;
    const inRoom = rn && !rn.outdoor ? rn : rp;
    if (!inRoom) continue; // between two outdoor areas: no wall (plaza handled separately)
    const ceilN = rn && !rn.outdoor ? rn.ceil : 0;
    const ceilP = rp && !rp.outdoor ? rp.ceil : 0;
    let topY;
    if (run.level === 'b') {
      topY = 0.02; // basement walls rise to the ground-floor slab
    } else {
      topY = floorY + Math.max(ceilN, ceilP) + (exterior ? 0.55 : 0.32);
    }
    const thick = exterior ? MAP.WALL.extThick : MAP.WALL.intThick;
    const isService = (rn?.zone === 'basement' || rp?.zone === 'basement' || rn?.zone === 'garage' || rp?.zone === 'garage' || rn?.zone === 'loading' || rp?.zone === 'loading');
    const mat = run.level === 'b' || isService ? 'concrete' : (exterior ? 'plaster' : 'drywall');
    const surface = mat === 'concrete' ? 'concrete' : 'drywall';

    const holes = holesForRun(run);
    if (!holes.length) {
      emitWallBox(world, batch, run, run.a, run.b, floorY, topY, thick, mat, { surface });
      continue;
    }
    const pieces = subtract1d([run.a, run.b], holes.map((h) => [h.a, h.b]));
    for (const p of pieces) emitWallBox(world, batch, run, p[0], p[1], floorY, topY, thick, mat, { surface });
    for (const h of holes) {
      const ha = Math.max(h.a, run.a), hb = Math.min(h.b, run.b);
      // lintel above every hole
      emitWallBox(world, batch, run, ha, hb, h.y1, topY, thick, mat, { surface });
      // sill below windows/glass walls
      if (h.y0 > floorY + EPS) emitWallBox(world, batch, run, ha, hb, floorY, h.y0, thick, mat, { surface });
      h.run = run; h.clipped = [ha, hb];
    }
    world._holes = world._holes || [];
    world._holes.push(...holes);
  }
}

// --------------------------------------------------------------------------
function paneEntity(world, group, { dir, line, a, b, y0, y1, style, thickness = 0.03, id, exteriorRoom = null }) {
  const len = b - a, h = y1 - y0;
  const geo = new THREE.BoxGeometry(dir === 'x' ? len : thickness, h, dir === 'x' ? thickness : len);
  const mesh = new THREE.Mesh(geo, getGlassMaterial(style));
  mesh.position.set(dir === 'x' ? (a + b) / 2 : line, (y0 + y1) / 2, dir === 'x' ? line : (a + b) / 2);
  mesh.renderOrder = 5;
  group.add(mesh);
  const col = world.addCollider(aabb(
    mesh.position.x - (dir === 'x' ? len / 2 : 0.05), y0, mesh.position.z - (dir === 'x' ? 0.05 : len / 2),
    mesh.position.x + (dir === 'x' ? len / 2 : 0.05), y1, mesh.position.z + (dir === 'x' ? 0.05 : len / 2),
    { kind: 'glass', glass: true, surface: 'glass', blocksSight: style === 'frosted', noStand: true }
  ));
  const pane = { id, mesh, collider: col, style, hits: 0, broken: false, exteriorRoom, dir, line, a, b, y0, y1 };
  col.pane = pane;
  world.glassPanes.push(pane);
  return pane;
}

function mullionsAndPanes(world, group, batch, { dir, line, a, b, y0, y1, style, panes, id, frameMat = 'mullion', exteriorRoom }) {
  const mull = 0.055;
  const n = Math.max(1, panes || Math.round((b - a) / 1.6));
  const paneW = (b - a - mull * (n + 1)) / n;
  const boxes = [];
  // frame top/bottom rails
  boxes.push([a, b, y0 - 0.045, y0]);
  boxes.push([a, b, y1, y1 + 0.045]);
  for (let i = 0; i <= n; i++) {
    const mx = a + mull / 2 + i * (paneW + mull);
    boxes.push([mx - mull / 2, mx + mull / 2, y0, y1]);
  }
  for (const [ba, bb, by0, by1] of boxes) {
    const p = wallBoxParams({ dir, line }, ba, bb, by0, by1, 0.09);
    batch.box(frameMat, p.cx, p.cy, p.cz, p.sx, p.sy, p.sz);
  }
  for (let i = 0; i < n; i++) {
    const pa = a + mull + i * (paneW + mull);
    paneEntity(world, group, { dir, line, a: pa, b: pa + paneW, y0: y0 + 0.02, y1: y1 - 0.02, style, id: `${id}_p${i}`, exteriorRoom });
  }
}

function buildGlassWallsAndWindows(world, group, roomsById) {
  const batch = new Batch();
  for (const gw of MAP.GLASS_WALLS) {
    const floorY = MAP.LEVELS[gw.level].y;
    mullionsAndPanes(world, group, batch, {
      dir: gw.dir, line: gw.line, a: gw.span[0], b: gw.span[1],
      y0: floorY + gw.sill, y1: floorY + gw.head, style: gw.style, panes: Math.round((gw.span[1] - gw.span[0]) / 1.4),
      id: gw.id,
    });
  }
  for (const w of MAP.WINDOWS) {
    const floorY = MAP.LEVELS[w.level].y;
    const room = roomsById[w.room];
    mullionsAndPanes(world, group, batch, {
      dir: w.dir, line: w.line, a: w.span[0], b: w.span[1],
      y0: floorY + w.sill, y1: floorY + w.head, style: w.style === 'frosted' ? 'frosted' : 'tinted',
      panes: w.panes, id: w.id, frameMat: 'frame_metal', exteriorRoom: w.interiorTo ? null : (room ? room.id : null),
    });
    if (!w.interiorTo) {
      // invisible barrier so a broken exterior window never dumps entities into
      // the void — outside, deep snowdrifts justify it visually
      const p = wallBoxParams({ dir: w.dir, line: w.line }, w.span[0], w.span[1], floorY + w.sill, floorY + w.head, 0.2);
      world.addCollider(aabb(p.cx - p.sx / 2, p.cy - p.sy / 2, p.cz - p.sz / 2, p.cx + p.sx / 2, p.cy + p.sy / 2, p.cz + p.sz / 2,
        { kind: 'barrier', blocksSight: false, invisible: true, surface: 'snow', noStand: true }));
    }
  }
  batch.build(group);
}

// --------------------------------------------------------------------------
function buildStairs(world, batch) {
  for (const st of MAP.STAIRS) {
    for (const piece of st.pieces) {
      if (piece.type === 'flight') {
        const { x0, x1, zStart, zEnd, yStart, yEnd } = piece;
        const drop = yStart - yEnd;
        const steps = Math.max(2, Math.round(drop / 0.18));
        const rise = drop / steps;
        const dirSign = Math.sign(zEnd - zStart);
        const tread = Math.abs(zEnd - zStart) / steps;
        for (let i = 0; i < steps; i++) {
          const z0 = zStart + dirSign * tread * i;
          const zc = z0 + dirSign * tread / 2;
          const yTop = yStart - rise * (i + 1);
          const h = Math.max(0.1, yTop - yEnd + rise * 1.2);
          batch.box('concrete', (x0 + x1) / 2, yTop - h / 2 + rise / 2 + 0.001, zc, x1 - x0, h, tread);
        }
        // movement uses a smooth ramp over the steps
        world.ramps.push({
          x0, z0: Math.min(zStart, zEnd), x1, z1: Math.max(zStart, zEnd),
          axis: 'z', c0: zStart, c1: zEnd, y0: yStart, y1: yEnd, surface: 'concrete',
        });
        // side stringers/rails
        for (const rx of [x0 + 0.04, x1 - 0.04]) {
          const segs = 6;
          for (let i = 0; i < segs; i++) {
            const t0 = i / segs, t1 = (i + 1) / segs;
            const zc = zStart + (zEnd - zStart) * (t0 + t1) / 2;
            const yc = yStart + (yEnd - yStart) * (t0 + t1) / 2;
            batch.box('metal_dark', rx, yc + 0.95, zc, 0.05, 0.06, Math.abs(zEnd - zStart) / segs + 0.02);
            if (i % 2 === 0) batch.box('metal_dark', rx, yc + 0.5, zc, 0.04, 0.9, 0.04);
          }
        }
      } else if (piece.type === 'landing') {
        const [x0, z0, x1, z1] = piece.rect;
        batch.box('concrete', (x0 + x1) / 2, piece.y - 0.09, (z0 + z1) / 2, x1 - x0, 0.18, z1 - z0);
        world.addCollider(aabb(x0, piece.y - 0.2, z0, x1, piece.y, z1, { kind: 'floor', surface: 'concrete' }));
        world.surfaces.push({ x0, z0, x1, z1, y: piece.y, surface: 'concrete', room: st.top });
      }
    }
    // platform edge guard: collider strip at platform edge next to the shaft
    if (st.topPlatform) {
      const [px0, pz0, px1, pz1] = st.topPlatform;
      // rail across the platform edge except where the flight begins
      const fl = st.pieces.find((p) => p.type === 'flight');
      if (fl) {
        const edgeZ = fl.zStart;
        for (const seg of subtract1d([px0, px1], [[fl.x0, fl.x1]])) {
          batch.box('metal_dark', (seg[0] + seg[1]) / 2, 1.0, edgeZ, seg[1] - seg[0], 0.06, 0.05);
          world.addCollider(aabb(seg[0], 0, edgeZ - 0.04, seg[1], 1.05, edgeZ + 0.04, { kind: 'rail', surface: 'metal', blocksSight: false, noStand: true }));
        }
      }
    }
    world.stairways.push(st);
  }
}

// --------------------------------------------------------------------------
function buildExterior(world, batch) {
  // plaza ground handled via room floor (snow). Surround: planters + fence colliders.
  const plaza = MAP.ROOMS.find((r) => r.id === 'plaza');
  const [x0, z0, x1, z1] = plaza.rects[0];
  // low snow-topped planter walls on south/west/east bounds
  const planters = [
    [x0 - 0.3, z1 - 0.3, x1 + 0.3, z1 + 0.3], // south
    [x0 - 0.3, z0, x0 + 0.3, z1], // west
    [x1 - 0.3, z0, x1 + 0.3, z1], // east
  ];
  for (const [px0, pz0, px1, pz1] of planters) {
    batch.box('concrete_dark', (px0 + px1) / 2, 0.5, (pz0 + pz1) / 2, px1 - px0, 1.0, pz1 - pz0);
    batch.box('snow', (px0 + px1) / 2, 1.06, (pz0 + pz1) / 2, px1 - px0 + 0.06, 0.14, pz1 - pz0 + 0.06);
    world.addCollider(aabb(px0, 0, pz0, px1, 1.35, pz1, { kind: 'planter', surface: 'concrete' }));
  }
  // wide snow field around the building for exterior views
  batch.plane('snow', 32, -0.04, 24, 220, 190, 'up');
  // courtyard east (visual only, seen through exec windows)
  batch.box('snow', 70, 0.06, 36, 12, 0.12, 18);
  // snow drifts stacked against exterior windows (justifies window barriers)
  for (const w of MAP.WINDOWS) {
    if (w.interiorTo || w.style === 'frosted') continue;
    const floorY = MAP.LEVELS[w.level].y;
    const off = 0.55;
    const p = wallBoxParams({ dir: w.dir, line: w.line }, w.span[0] - 0.3, w.span[1] + 0.3, floorY - 0.02, floorY + w.sill + 0.35, 1.0);
    // push outward: decide which side is outdoors by sampling roomAt
    const sideA = w.dir === 'x' ? { x: p.cx, z: w.line - 1 } : { x: w.line - 1, z: p.cz };
    const outdoorsA = !MAP.roomAt(sideA.x, sideA.z, floorY);
    const push = (outdoorsA ? -1 : 1) * off;
    if (w.dir === 'x') p.cz += push; else p.cx += push;
    batch.box('snow', p.cx, p.cy, p.cz, p.sx, p.sy, p.sz);
  }
  // hold the world edge: big boundary colliders
  const B = MAP.MAP_BOUNDS;
  world.addCollider(aabb(B.x0 - 2, -6, B.z0 - 2, B.x1 + 2, 8, B.z0, { kind: 'bounds', invisible: true }));
  world.addCollider(aabb(B.x0 - 2, -6, B.z1, B.x1 + 2, 8, B.z1 + 2, { kind: 'bounds', invisible: true }));
  world.addCollider(aabb(B.x0 - 2, -6, B.z0, B.x0, 8, B.z1, { kind: 'bounds', invisible: true }));
  world.addCollider(aabb(B.x1, -6, B.z0, B.x1 + 2, 8, B.z1, { kind: 'bounds', invisible: true }));
}

// --------------------------------------------------------------------------
function buildDoors(world, group, roomsById) {
  for (const def of MAP.DOORS) {
    const floorY = MAP.LEVELS[def.level].y;
    const head = DOOR_HEADS[def.kind] || 2.06;
    const door = createDoor(world, def, floorY, head);
    group.add(door.group);
    world.doors.push(door);
  }
}

function buildShutters(world, group) {
  for (const s of MAP.SHUTTERS) {
    const floorY = MAP.LEVELS[s.level].y;
    const len = s.span[1] - s.span[0];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(s.dir === 'x' ? len : 0.12, s.height, s.dir === 'x' ? 0.12 : len),
      getMaterial('metal_painted'),
    );
    // ribbed look via child strips
    const ribs = Math.floor(s.height / 0.32);
    for (let i = 0; i < ribs; i++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(s.dir === 'x' ? len + 0.02 : 0.16, 0.05, s.dir === 'x' ? 0.16 : len + 0.02),
        getMaterial('metal_dark'),
      );
      rib.position.y = -s.height / 2 + 0.16 + i * 0.32;
      mesh.add(rib);
    }
    mesh.position.set(
      s.dir === 'x' ? (s.span[0] + s.span[1]) / 2 : s.line,
      floorY + s.height / 2,
      s.dir === 'x' ? s.line : (s.span[0] + s.span[1]) / 2,
    );
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    const col = world.addCollider(aabb(
      mesh.position.x - (s.dir === 'x' ? len / 2 : 0.1), floorY, mesh.position.z - (s.dir === 'x' ? 0.1 : len / 2),
      mesh.position.x + (s.dir === 'x' ? len / 2 : 0.1), floorY + s.height, mesh.position.z + (s.dir === 'x' ? 0.1 : len / 2),
      { kind: 'shutter', surface: 'metal' },
    ));
    const shutter = { id: s.id, def: s, mesh, collider: col, openAmount: 0, opening: false, floorY,
      update(dt) {
        if (this.opening && this.openAmount < 1) {
          this.openAmount = Math.min(1, this.openAmount + dt / 3.5);
          this.mesh.position.y = this.floorY + s.height / 2 + this.openAmount * (s.height - 0.25);
          if (this.openAmount > 0.55 && this.collider) { world.removeCollider(this.collider); this.collider = null; }
        }
      },
      open() { this.opening = true; },
    };
    world.shutters = world.shutters || [];
    world.shutters.push(shutter);
  }
}
