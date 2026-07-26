// Map builder (Fable 2 domain): converts layout.js data into meshes, colliders, doors, glass,
// lights and QA metadata. Walls derive from room-rect adjacency; openings cut door/window/arch
// holes. Geometry pipeline is final; the art pass upgrades materials/details via style hooks.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import './mapmaterials.js'; // register map-domain material names before any getMaterial() call
import { getMaterial } from '../materials/index.js';
import { FLOORS, SLAB, ROOMS, VOIDS, OPENINGS, CHECKPOINTS, roomById } from './layout.js';
import { Door, Shutter } from './doors.js';
import { buildStairs, buildRailing, buildExterior, buildRoof } from './structures.js';
import { GlassPane } from './glass.js';
import { placeLights } from './lightplan.js';
import { registerAsset } from '../core/assets.js';
import { Kit } from './kit.js';
import { buildInteriorFinish } from './finish.js';
import { buildCeilings } from './ceilings.js';
import { buildAtrium } from './atrium.js';
import { buildFacade, buildSite, buildSurroundings } from './snowscape.js';

const INT_T = 0.16;   // interior wall thickness
const EXT_T = 0.34;   // exterior wall thickness
const DOOR_H = 2.05;
const ARCH_H = 2.3;

export const WALL_TOPS = [3.6, 6.4]; // structural wall top per floor
export const ROOF_Y = 6.4;

export function buildMap(scene, world) {
  const map = {
    scene,
    world,
    group: new THREE.Group(),
    doors: [],
    glass: [],
    labels: new THREE.Group(),
    checkpoints: CHECKPOINTS,
    lights: null,
    dynamicResets: [],
    bounds: { minX: -14, maxX: 62, minZ: -12, maxZ: 50 },
  };
  map.group.name = 'map';
  map.labels.visible = false;
  scene.add(map.group, map.labels);

  const segments = computeWallSegments();
  assignOpenings(segments);
  const kit = new Kit(map); // merged-geometry accumulator for the whole finish pass
  map.kit = kit;
  for (const seg of segments) buildWallSegment(map, seg, kit);
  buildFloorsAndCeilings(map);
  buildStairs(map, kit);
  buildExterior(map);
  buildRoof(map, kit);
  buildCeilings(map, kit);
  buildInteriorFinish(map, kit, segments);
  buildAtrium(map, kit);
  buildFacade(map, kit, segments);
  buildSite(map, kit);
  buildSurroundings(map, kit);
  kit.flush('finish');
  mergeStaticMeshes(map);
  map.lights = placeLights(map);
  buildRoomLabels(map);
  registerArchitectureAssets();

  map.update = (dt) => { for (const d of map.doors) d.update(dt); };
  map.resetDynamic = () => {
    for (const d of map.doors) d.reset();
    for (const g of map.glass) g.reset();
    for (const fn of map.dynamicResets) fn();
  };
  map.doorById = (id) => map.doors.find((d) => d.id === id);
  return map;
}

// ---------------------------------------------------------------------------
// Wall segment computation from room adjacency
// ---------------------------------------------------------------------------
function computeWallSegments() {
  const segments = [];
  for (let f = 0; f < FLOORS.length; f++) {
    const entries = [];
    for (const r of ROOMS) if (r.floor === f) for (const rc of r.rects) entries.push({ room: r, rc });
    for (const v of VOIDS) if (v.floor === f) entries.push({ room: { id: '__void', exterior: false, isVoid: true }, rc: v.rect });

    const groups = new Map(); // 'axis:at' -> [{from,to,side,room}]
    const addEdge = (axis, at, from, to, room, side) => {
      const key = axis + ':' + at.toFixed(3);
      let arr = groups.get(key);
      if (!arr) { arr = []; arr.axis = axis; arr.at = at; groups.set(key, arr); }
      arr.push({ from, to, side, room });
    };
    for (const { room, rc } of entries) {
      const [x0, z0, x1, z1] = rc;
      addEdge('x', x0, z0, z1, room, 1);   // room lies at +x of plane x=x0
      addEdge('x', x1, z0, z1, room, -1);  // room lies at −x of plane x=x1
      addEdge('z', z0, x0, x1, room, 1);
      addEdge('z', z1, x0, x1, room, -1);
    }

    for (const arr of groups.values()) {
      const pos = arr.filter((e) => e.side === 1);
      const neg = arr.filter((e) => e.side === -1);
      // interior pairs
      for (const p of pos) {
        for (const n of neg) {
          const from = Math.max(p.from, n.from), to = Math.min(p.to, n.to);
          if (to - from < 0.01) continue;
          if (p.room.id === n.room.id) continue; // same-room union: open
          segments.push({
            floor: f, axis: arr.axis, at: arr.at, from, to,
            roomA: n.room, roomB: p.room, exterior: false, openings: [],
          });
        }
      }
      // exterior remainders (edge portions not covered by any opposite edge)
      for (const e of arr) {
        let intervals = [[e.from, e.to]];
        const others = e.side === 1 ? neg : pos;
        for (const o of others) intervals = subtractInterval(intervals, o.from, o.to);
        for (const [from, to] of intervals) {
          if (to - from < 0.01) continue;
          segments.push({
            floor: f, axis: arr.axis, at: arr.at, from, to,
            roomA: e.room, roomB: null, exterior: true, outDir: -e.side, openings: [],
          });
        }
      }
    }
  }
  // Cull duplicate interior segments (pair discovered once per direction is fine since we only
  // iterate pos×neg, producing each pair once).
  return segments;
}

function subtractInterval(intervals, from, to) {
  const out = [];
  for (const [a, b] of intervals) {
    if (to <= a || from >= b) { out.push([a, b]); continue; }
    if (from > a) out.push([a, Math.min(from, b)]);
    if (to < b) out.push([Math.max(to, a), b]);
  }
  return out.filter(([a, b]) => b - a > 0.005);
}

function assignOpenings(segments) {
  for (const op of OPENINGS) {
    const [px, pz] = op.at;
    const half = op.w / 2;
    const cands = segments.filter((seg) => {
      const ids = new Set([seg.roomA?.id ?? 'out', seg.roomB?.id ?? 'out']);
      if (!ids.has(op.a) || !ids.has(op.b)) return false;
      const pointOn = seg.axis === 'x'
        ? Math.abs(seg.at - px) < 0.2 && pz >= seg.from - 0.05 && pz <= seg.to + 0.05
        : Math.abs(seg.at - pz) < 0.2 && px >= seg.from - 0.05 && px <= seg.to + 0.05;
      return pointOn;
    });
    if (cands.length === 0) {
      console.warn('[map] opening found no wall: ' + JSON.stringify({ type: op.type, a: op.a, b: op.b, at: op.at }));
      continue;
    }
    // choose the segment whose span contains the full opening; else the first candidate
    let seg = cands.find((s) => {
      const c = s.axis === 'x' ? pz : px;
      return c - half >= s.from - 0.06 && c + half <= s.to + 0.06;
    }) || cands[0];
    const c = seg.axis === 'x' ? pz : px;
    seg.openings.push({ ...op, center: c });
  }
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
function wallMaterialFor(seg) {
  if (seg.exterior || seg.roomB === null || seg.roomA?.exterior || seg.roomB?.exterior) return getMaterial('exteriorPanel');
  const service = (r) => r && ['service', 'garage', 'server'].includes(r.light);
  if (service(seg.roomA) || service(seg.roomB)) return getMaterial('concretePaint');
  const exec = (r) => r && r.light === 'exec';
  if (exec(seg.roomA) && exec(seg.roomB)) return getMaterial('drywall');
  return getMaterial('drywall');
}

function isVoidSeg(seg) { return seg.roomA?.isVoid || seg.roomB?.isVoid; }

function buildWallSegment(map, seg, kit) {
  const floor = FLOORS[seg.floor];
  const y0 = floor.y;
  const y1 = WALL_TOPS[seg.floor];
  if (isVoidSeg(seg)) {
    // Atrium edge: railing instead of wall (roomB/roomA void). Skip walls; structures handles curb.
    buildRailing(map, seg, y0);
    return;
  }
  const isExt = seg.exterior || seg.roomA?.exterior || seg.roomB?.exterior;
  const t = isExt ? EXT_T : INT_T;
  const mat = wallMaterialFor(seg);

  // Sort openings, then emit solid runs + opening infill (headers/sills/frames/entities)
  const ops = [...seg.openings].sort((a, b) => a.center - b.center);
  let cursor = seg.from;
  const runs = [];
  for (const op of ops) {
    const a = op.center - op.w / 2, b = op.center + op.w / 2;
    if (a > cursor + 0.01) runs.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < seg.to - 0.01) runs.push([cursor, seg.to]);
  seg.runs = runs; // consumed by the finish/facade passes
  for (const [a, b] of runs) addWallBox(map, seg, a, b, y0, y1, t, mat);

  for (const op of ops) buildOpening(map, seg, op, y0, y1, t, mat, kit);
}

function addWallBox(map, seg, from, to, y0, y1, t, mat, opts = {}) {
  const len = to - from;
  if (len <= 0.011 || y1 - y0 <= 0.01) return null;
  const geo = new THREE.BoxGeometry(seg.axis === 'x' ? t : len, y1 - y0, seg.axis === 'x' ? len : t);
  const mesh = new THREE.Mesh(geo, mat);
  const cx = seg.axis === 'x' ? seg.at : (from + to) / 2;
  const cz = seg.axis === 'x' ? (from + to) / 2 : seg.at;
  mesh.position.set(cx, (y0 + y1) / 2, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  map.group.add(mesh);
  if (!opts.noCollide) {
    map.world.add({
      min: { x: cx - (seg.axis === 'x' ? t / 2 : len / 2), y: y0, z: cz - (seg.axis === 'x' ? len / 2 : t / 2) },
      max: { x: cx + (seg.axis === 'x' ? t / 2 : len / 2), y: y1, z: cz + (seg.axis === 'x' ? len / 2 : t / 2) },
      material: mat.name === 'exteriorPanel' ? 'concrete' : (mat.name === 'concretePaint' ? 'concrete' : 'drywall'),
      tag: 'wall',
      thin: t < 0.2 ? t : 0,
    });
  }
  return mesh;
}

function buildOpening(map, seg, op, y0, y1, t, mat, kit) {
  const a = op.center - op.w / 2, b = op.center + op.w / 2;
  const cx = seg.axis === 'x' ? seg.at : op.center;
  const cz = seg.axis === 'x' ? op.center : seg.at;
  const frameMat = getMaterial('frame');

  const header = (hFrom) => addWallBox(map, seg, a, b, y0 + hFrom, y1, t, mat);
  const sill = (hTo) => addWallBox(map, seg, a, b, y0, y0 + hTo, t, mat);

  if (op.type === 'door') {
    header(DOOR_H + 0.09);
    // door frame: jambs + head
    const jambGeo = new THREE.BoxGeometry(seg.axis === 'x' ? t + 0.06 : 0.09, DOOR_H + 0.06, seg.axis === 'x' ? 0.09 : t + 0.06);
    for (const off of [-op.w / 2 + 0.02, op.w / 2 - 0.02]) {
      const jamb = new THREE.Mesh(jambGeo, frameMat);
      jamb.position.set(seg.axis === 'x' ? cx : cx + off, y0 + (DOOR_H + 0.06) / 2, seg.axis === 'x' ? cz + off : cz);
      jamb.castShadow = true;
      map.group.add(jamb);
    }
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(seg.axis === 'x' ? t + 0.06 : op.w, 0.09, seg.axis === 'x' ? op.w : t + 0.06),
      frameMat,
    );
    head.position.set(cx, y0 + DOOR_H + 0.045, cz);
    map.group.add(head);
    const door = new Door({
      id: op.id, kind: op.kind, cx, cy: y0, cz,
      axis: seg.axis === 'x' ? 'z' : 'x', // door leaf runs ALONG the wall
      width: op.w - 0.06, world: map.world, scene: map.group, locked: op.locked,
    });
    map.doors.push(door);
  } else if (op.type === 'arch') {
    const h = op.h ?? ARCH_H;
    header(h);
  } else if (op.type === 'shutter') {
    header(op.h ?? 2.7);
    const shutter = new Shutter({
      id: op.id, cx, cy: y0, cz, axis: seg.axis === 'x' ? 'z' : 'x',
      width: op.w, height: op.h ?? 2.7, world: map.world, scene: map.group,
    });
    map.doors.push(shutter);
  } else if (op.type === 'dockdoor') {
    // static closed sectional door (visual) + collider
    header(op.h ?? 2.5);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(seg.axis === 'x' ? 0.08 : op.w, op.h ?? 2.5, seg.axis === 'x' ? op.w : 0.08),
      getMaterial('paintedMetal'),
    );
    panel.position.set(cx, y0 + (op.h ?? 2.5) / 2, cz);
    panel.castShadow = true; panel.receiveShadow = true;
    map.group.add(panel);
    map.world.add({
      min: { x: cx - (seg.axis === 'x' ? 0.05 : op.w / 2), y: y0, z: cz - (seg.axis === 'x' ? op.w / 2 : 0.05) },
      max: { x: cx + (seg.axis === 'x' ? 0.05 : op.w / 2), y: y0 + (op.h ?? 2.5), z: cz + (seg.axis === 'x' ? op.w / 2 : 0.05) },
      material: 'metal', tag: 'wall',
    });
  } else if (op.type === 'window' || op.type === 'glasswall') {
    const sillH = op.sill ?? 0.9;
    const headH = op.head ?? 2.5;
    sill(sillH);
    header(headH);
    // frame + mullioned glass panes (individually breakable)
    const paneMax = 1.7;
    const count = Math.max(1, Math.round(op.w / paneMax));
    const paneW = (op.w - 0.05 * (count + 1)) / count;
    const frameD = Math.min(t, 0.14);
    // top/bottom frame rails
    const railGeoW = seg.axis === 'x' ? frameD + 0.02 : op.w;
    const railGeoD = seg.axis === 'x' ? op.w : frameD + 0.02;
    const rails = [[y0 + sillH + 0.025, 0.05], [y0 + headH - 0.025, 0.05]];
    if (headH - sillH > 1.8) rails.push([y0 + 2.06, 0.06]); // transom line at door-head height
    for (const [yy, hh] of rails) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(railGeoW, hh, railGeoD), frameMat);
      rail.position.set(cx, yy, cz);
      map.group.add(rail);
    }
    // frosted privacy band on the conference glass front (kept below standing eye level so the
    // visual and AI sightlines stay honest)
    if (kit && op.type === 'glasswall' && (op.a === 'conference' || op.b === 'conference')) {
      const bw = op.w - 0.08, bh = 0.42, by = y0 + sillH + 0.05 + bh / 2;
      kit.box('glassFrosted', seg.axis === 'x' ? 0.06 : bw, bh, seg.axis === 'x' ? bw : 0.06, cx, by, cz, { uv: 0, cast: false });
    }
    const glassKind = op.kind === 'curtain' || op.kind === 'ribbon' ? 'glassTinted'
      : op.type === 'glasswall' ? 'glassClear'
      : op.frosted ? 'glassFrosted' : 'glassClear';
    for (let i = 0; i < count; i++) {
      const off = -op.w / 2 + 0.05 + paneW / 2 + i * (paneW + 0.05);
      const px = seg.axis === 'x' ? cx : cx + off;
      const pz = seg.axis === 'x' ? cz + off : cz;
      // mullion between panes
      if (i > 0) {
        const mx = seg.axis === 'x' ? cx : cx + off - paneW / 2 - 0.025;
        const mz = seg.axis === 'x' ? cz + off - paneW / 2 - 0.025 : cz;
        const mull = new THREE.Mesh(
          new THREE.BoxGeometry(seg.axis === 'x' ? frameD + 0.02 : 0.05, headH - sillH, seg.axis === 'x' ? 0.05 : frameD + 0.02),
          frameMat,
        );
        mull.position.set(mx, y0 + (sillH + headH) / 2, mz);
        map.group.add(mull);
      }
      const pane = new GlassPane({
        cx: px, cz: pz, y0: y0 + sillH + 0.05, y1: y0 + headH - 0.05,
        w: paneW, axis: seg.axis, world: map.world, scene: map.group,
        kind: glassKind, frosted: glassKind === 'glassFrosted',
        id: `glass-${seg.axis}${seg.at.toFixed(0)}-${op.center.toFixed(0)}-${i}`,
      });
      map.glass.push(pane);
    }
    // sill collider is part of sill wallbox already; also block the low band for movement even
    // when glass broken (frame lip) — handled by sill box itself.
  }
}

// ---------------------------------------------------------------------------
// Floors and ceilings per room, with atrium void cuts
// ---------------------------------------------------------------------------
function buildFloorsAndCeilings(map) {
  for (const room of ROOMS) {
    const f = FLOORS[room.floor];
    const stair = room.stair || room.stairTop;
    for (const rc of room.rects) {
      let floorRects = [rc];
      let ceilRects = [rc];
      // subtract voids from F1 floors and from F0 ceilings under them
      for (const v of VOIDS) {
        if (room.floor === 1 && v.floor === 1) floorRects = floorRects.flatMap((r) => subtractRect(r, v.rect));
        if (room.floor === 0 && v.floor === 1) ceilRects = ceilRects.flatMap((r) => subtractRect(r, v.rect));
      }
      if (!stair) {
        for (const r of floorRects) addSlab(map, r, f.y - 0.12, f.y, room.floorMat, room.exterior ? 'snow' : floorCollMat(room.floorMat), 'floor');
      }
      if (room.ceilMat && room.ceilMat !== 'sky' && room.ceilMat !== 'none' && !room.stair) {
        const ceilY = f.y + f.ceil;
        for (const r of ceilRects) addSlab(map, r, ceilY, ceilY + 0.06, room.ceilMat === 'deck' ? 'deck' : 'acoustic', 'drywall', 'ceiling');
      }
    }
  }
  // Structural slab band between floors is implied by ceiling+floor pair; block the gap for
  // bullets/sight with one thin collider at slab height across the full footprint, minus the
  // atrium void and the two-story stair shafts.
  let slabRects = [[0, 0, 48, 36]];
  for (const v of VOIDS) slabRects = slabRects.flatMap((r) => subtractRect(r, v.rect));
  for (const room of ROOMS) {
    if (!room.stair) continue;
    for (const rc of room.rects) slabRects = slabRects.flatMap((r) => subtractRect(r, rc));
  }
  for (const r of slabRects) {
    map.world.add({
      min: { x: r[0], y: FLOORS[1].y - 0.55, z: r[1] },
      max: { x: r[2], y: FLOORS[1].y - 0.13, z: r[3] },
      material: 'concrete', tag: 'slab',
    });
  }
}

function floorCollMat(mat) {
  if (mat.startsWith('carpet')) return 'carpet';
  if (mat.startsWith('tile') || mat.startsWith('raisedTile')) return 'tile';
  if (mat === 'wood' || mat === 'laminate') return 'wood';
  if (mat === 'vinyl') return 'tile';
  if (mat === 'snow') return 'snow';
  return 'concrete';
}

export function addSlab(map, rc, y0, y1, matName, collMat, tag) {
  const [x0, z0, x1, z1] = rc;
  if (x1 - x0 < 0.02 || z1 - z0 < 0.02) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), getMaterial(matName));
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.receiveShadow = true;
  if (tag !== 'ceiling') mesh.castShadow = false;
  map.group.add(mesh);
  map.world.add({
    min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 },
    material: collMat, tag,
  });
  return mesh;
}

/**
 * Draw-call pass: doors, shutters and breakable glass attach to the scene root, so everything
 * inside map.group is static geometry. Collapse it into one mesh per (material, shadow flags)
 * bucket — the graybox builder emits ~1000 individual boxes (wall runs, frames, mullions,
 * steps, rail posts); this brings the map's draw-call share down to the material count.
 * Transparent materials are left as-is (merging breaks per-object depth sorting).
 */
function mergeStaticMeshes(map) {
  map.group.updateMatrixWorld(true);
  const buckets = new Map();
  const keep = [];
  const meshes = [];
  map.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const mesh of meshes) {
    if (Array.isArray(mesh.material) || mesh.material.transparent) { keep.push(mesh); continue; }
    // bucket key includes the attribute signature — mergeGeometries needs identical layouts
    const sig = Object.keys(mesh.geometry.attributes).sort().join(',');
    const key = mesh.material.uuid + '|' + mesh.castShadow + '|' + mesh.receiveShadow + '|' + sig;
    let b = buckets.get(key);
    if (!b) { b = { material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, geos: [] }; buckets.set(key, b); }
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    b.geos.push(geo);
    mesh.geometry.dispose();
  }
  for (const mesh of keep) {
    // reparent survivors to the group root, keeping their world transform
    mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
  }
  map.group.clear();
  for (const mesh of keep) map.group.add(mesh);
  for (const b of buckets.values()) {
    const merged = BufferGeometryUtils.mergeGeometries(b.geos, false);
    for (const g of b.geos) g.dispose();
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.name = 'static-merged';
    map.group.add(mesh);
  }
}

export function subtractRect(rc, cut) {
  const [ax0, az0, ax1, az1] = rc;
  const [bx0, bz0, bx1, bz1] = cut;
  if (bx0 >= ax1 || bx1 <= ax0 || bz0 >= az1 || bz1 <= az0) return [rc];
  const out = [];
  if (bz0 > az0) out.push([ax0, az0, ax1, Math.min(bz0, az1)]);
  if (bz1 < az1) out.push([ax0, Math.max(bz1, az0), ax1, az1]);
  const zi0 = Math.max(az0, bz0), zi1 = Math.min(az1, bz1);
  if (bx0 > ax0) out.push([ax0, zi0, Math.min(bx0, ax1), zi1]);
  if (bx1 < ax1) out.push([Math.max(bx1, ax0), zi0, ax1, zi1]);
  return out.filter(([x0, z0, x1, z1]) => x1 - x0 > 0.01 && z1 - z0 > 0.01);
}

// ---------------------------------------------------------------------------
// QA room labels
// ---------------------------------------------------------------------------
function buildRoomLabels(map) {
  for (const room of ROOMS) {
    const rc = room.rects[0];
    const cx = (rc[0] + rc[2]) / 2, cz = (rc[1] + rc[3]) / 2;
    const f = FLOORS[room.floor];
    const sprite = makeTextSprite(room.name.toUpperCase(), room.id);
    sprite.position.set(cx, f.y + 2.1, cz);
    map.labels.add(sprite);
  }
}

export function makeTextSprite(text, sub = '') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,14,22,0.72)';
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#69d2ff';
  g.lineWidth = 4;
  g.strokeRect(4, 4, 504, 120);
  g.fillStyle = '#e8f4ff';
  g.font = 'bold 44px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(text, 256, 56);
  if (sub) {
    g.fillStyle = '#7fb8d8';
    g.font = '30px monospace';
    g.fillText(sub, 256, 100);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(3.2, 0.8, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function registerArchitectureAssets() {
  const reg = (id, name, extra = {}) => registerAsset(id, { name, category: 'architecture', agent: 'Fable 2', ...extra });
  reg('ARCH-WALL-INT', 'Interior wall module (drywall, 0.16m)', {});
  reg('ARCH-WALL-SVC', 'Service wall module (painted concrete)', {});
  reg('ARCH-WALL-EXT', 'Exterior wall module (insulated panel, 0.34m)', {});
  reg('ARCH-FLOOR-SET', 'Floor slab set (carpet/tile/vinyl/concrete/wood/raised)', {});
  reg('ARCH-CEIL-ACOUSTIC', 'Acoustic tile ceiling', {});
  reg('ARCH-CEIL-DECK', 'Exposed structural deck ceiling', {});
  reg('ARCH-DOORFRAME', 'Door frame with jambs and head', {});
  reg('ARCH-DOOR-LEAF', 'Door leaf set (textured paint/wood/security, kick plates)', {});
  reg('ARCH-WINDOW-FRAME', 'Window frame with mullions', {});
  reg('ARCH-STAIR-DOGLEG', 'Dogleg stair kit (flights, landing, rails)', {});
  reg('ARCH-RAILING', 'Atrium railing (posts, wood-cap top rail, glass)', {});
  reg('ARCH-SHUTTER', 'Garage roll shutter', {});
  reg('ARCH-DOCKDOOR', 'Loading dock sectional door', {});
  // --- finish kit (WP-011 art pass) ---
  reg('ARCH-TRIM-BASE', 'Baseboard trim (90mm painted)', {});
  reg('ARCH-TRIM-CASING', 'Door casing / architrave set', {});
  reg('ARCH-TRIM-SILL', 'Window stool + apron / aluminum sill cap', {});
  reg('ARCH-TRIM-CROWN', 'Executive crown molding', {});
  reg('ARCH-WAINSCOT-WOOD', 'Executive wood wainscot (panel + cap)', {});
  reg('ARCH-WAINSCOT-TILE', 'Restroom tile wainscot', {});
  reg('ARCH-COLUMN', 'Structural column 0.44m with base/cap', {});
  reg('ARCH-CEIL-GRID', 'Acoustic T-bar grid + tile variants', {});
  reg('ARCH-FIXTURE-TROFFER', 'Recessed 0.6x1.2 troffer (emissive lens)', {});
  reg('ARCH-FIXTURE-STRIP', 'Suspended strip fixture / garage highbay', {});
  reg('ARCH-FIXTURE-PENDANT', 'Pendant fixture (break/quiet rooms)', {});
  reg('ARCH-FIXTURE-WALLPACK', 'Stairwell vapor-tight wall pack', {});
  reg('ARCH-EXIT-SIGN', 'Emissive EXIT sign', {});
  reg('ARCH-DECKWORK', 'Service deck kit (beams, ducts, conduit)', {});
  reg('ARCH-STAIR-FINISH', 'Stair finish (stringers, handrail, nosing, cage, signage)', {});
  reg('ARCH-ATRIUM-BRANDWALL', 'Northstar Dynamics feature wall (star + wordmark)', {});
  reg('ARCH-ATRIUM-INLAY', 'Lobby floor inlay banding + compass medallion', {});
  reg('ARCH-ATRIUM-RINGLIGHT', 'Suspended ring light feature', {});
  reg('ARCH-SKYLIGHT-SHAFT', 'Skylight light-shaft imposter (additive alpha sheets)', {});
  reg('ARCH-SERVER-LINER', 'Server room dark tech-panel wall liner', {});
  reg('ARCH-PLANTER', 'Architectural planter box', {});
  reg('ARCH-FACADE-KIT', 'Facade panel reveals, floor band, mullion caps, parapet+snow', {});
  reg('ARCH-CANOPY', 'Entrance/dock canopies with snow', {});
  reg('ARCH-SNOWDRIFT', 'Snow drift wedges / mounds / plow banks', {});
  reg('ARCH-SITE-PLAZA', 'Plaza kit (path, bollards, flagpoles, bench, bike rack, monolith)', {});
  reg('ARCH-SITE-LOADING', 'Loading apron kit (markings, bumpers, canopy, signage)', {});
  reg('ARCH-SITE-COURTYARD', 'Courtyard kit (bench, planters, path, ash bin)', {});
  reg('ARCH-SURROUNDINGS', 'Distant lit-window silhouettes + treeline', {});
  reg('ARCH-GLASS-FROST', 'Conference frosted privacy band + transoms', {});
}
