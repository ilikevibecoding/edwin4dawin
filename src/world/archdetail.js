// Architectural detail kit — owner: Fable 2 (map architecture).
// Called by builder.js after the structural pass. Adds baseboards, ceiling
// fixtures (T-grid recessed panels / service ducts + strip lights), structural
// columns, window sills + radiators, exit signage, emergency lights, stair
// detailing, parapet caps — and covers the basement-wall lips that poke 2 cm
// through ground-floor slabs (builder buildWalls raises level-b walls to
// y=0.02; see docs/reports/fable2-architecture.md).
//
// Everything is merged into a handful of meshes via DetailBatch (same pattern
// as builder.js Batch) with world-space UV baking so textures tile at meter
// scale. Deterministic: cosmetic variation uses a locally seeded Rng.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as MAP from './map.js';
import { getMaterial, getUvScale, FLOOR_STYLES } from './materials.js';
import { bakeWorldUvs } from './uv.js';
import { aabb } from './worldRuntime.js';
import { Rng } from '../core/rng.js';

const EPS = 0.001;

// ---------------------------------------------------------------------------
// Shared micro-material library. Emissive fixtures across archdetail +
// exterior share exactly 5 materials (fix_cool, fix_warm, exit_green,
// lamp_cool, glow) — within the ≤6 emissive budget.
// ---------------------------------------------------------------------------
const detailMats = new Map();
export function getDetailMaterial(name) {
  if (detailMats.has(name)) return detailMats.get(name);
  let m;
  switch (name) {
    case 'fix_cool': // recessed troffer panels + bare strip tubes (4000K)
      m = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, emissive: 0xeef6fa, emissiveIntensity: 2.35, roughness: 0.55 });
      break;
    case 'fix_warm': // exec panels, emergency heads, exterior wall lamps
      m = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, emissive: 0xffd9a0, emissiveIntensity: 2.0, roughness: 0.6 });
      break;
    case 'exit_green':
      m = new THREE.MeshStandardMaterial({ color: 0x0a2013, emissive: 0x37ff85, emissiveIntensity: 2.4, roughness: 0.5 });
      break;
    case 'lamp_cool': // plaza lamp-post heads
      m = new THREE.MeshStandardMaterial({ color: 0xd8e4ec, emissive: 0xcfe2f4, emissiveIntensity: 2.6, roughness: 0.5 });
      break;
    case 'glow': // fake glow discs under exterior lamps (additive, cheap)
      m = new THREE.MeshBasicMaterial({ color: 0xbcd8f2, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      break;
    case 'safety_yellow':
      m = new THREE.MeshStandardMaterial({ color: 0xd8b62c, roughness: 0.6 });
      break;
    case 'pipe_red': // sprinkler mains
      m = new THREE.MeshStandardMaterial({ color: 0x8e352c, roughness: 0.55 });
      break;
    case 'tile_stain': { // water-stained ceiling tiles (same grid texture, tinted)
      m = getMaterial('ceiling_tile').clone();
      m.color = new THREE.Color(0x958d7e);
      break;
    }
    case 'trample': { // trampled snow strips (thin planes on the snow floor)
      m = new THREE.MeshStandardMaterial({ color: 0xc3cfdc, roughness: 0.92 });
      m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2;
      break;
    }
    case 'tree_green':
      m = new THREE.MeshStandardMaterial({ color: 0x27402f, roughness: 0.95 });
      break;
    case 'building_far': // distant silhouettes, mostly fogged
      m = new THREE.MeshStandardMaterial({ color: 0x4d5a68, roughness: 0.95 });
      break;
    case 'car_paint':
      m = new THREE.MeshStandardMaterial({ color: 0x5e6a74, roughness: 0.5, metalness: 0.35 });
      break;
    case 'accent_blue': // Northstar facade band
      m = new THREE.MeshStandardMaterial({ color: 0x2e5a7c, roughness: 0.55, metalness: 0.2 });
      break;
    default:
      m = new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.8 });
      console.warn(`[archdetail] unknown detail material '${name}'`);
  }
  m.name = `detail_${name}`;
  detailMats.set(name, m);
  return m;
}

// ---------------------------------------------------------------------------
// Compact batcher (mirrors builder.js Batch, plus custom-material support and
// cylinder/cone primitives for the exterior kit).
// ---------------------------------------------------------------------------
export class DetailBatch {
  constructor() { this.named = new Map(); this.custom = []; }
  _push(mat, g) {
    if (typeof mat === 'string' && !mat.startsWith('@')) {
      if (!this.named.has(mat)) this.named.set(mat, []);
      this.named.get(mat).push(g);
    } else {
      const name = typeof mat === 'string' ? mat.slice(1) : null;
      const material = name ? getDetailMaterial(name) : mat;
      let entry = this.custom.find((e) => e.material === material);
      if (!entry) { entry = { material, geos: [] }; this.custom.push(entry); }
      entry.geos.push(g);
    }
  }
  box(mat, cx, cy, cz, sx, sy, sz, rotY = 0) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    if (rotY) g.rotateY(rotY);
    g.translate(cx, cy, cz);
    this._push(mat, g);
  }
  plane(mat, cx, cy, cz, sx, sz, facing = 'up') {
    const g = new THREE.PlaneGeometry(sx, sz);
    if (facing === 'up') g.rotateX(-Math.PI / 2);
    else if (facing === 'down') g.rotateX(Math.PI / 2);
    else if (facing === 'north') g.rotateY(Math.PI);
    else if (facing === 'east') g.rotateY(Math.PI / 2);
    else if (facing === 'west') g.rotateY(-Math.PI / 2);
    // 'south' = PlaneGeometry default (+z)
    g.translate(cx, cy, cz);
    this._push(mat, g);
  }
  disc(mat, cx, cy, cz, r, seg = 14) {
    const g = new THREE.CircleGeometry(r, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, cy, cz);
    this._push(mat, g);
  }
  geo(mat, g) { this._push(mat, g); }
  cyl(mat, cx, cy, cz, rTop, rBot, h, seg = 10) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    g.translate(cx, cy, cz);
    this._push(mat, g);
  }
  cone(mat, cx, cy, cz, r, h, seg = 9) {
    const g = new THREE.ConeGeometry(r, h, seg);
    g.translate(cx, cy, cz);
    this._push(mat, g);
  }
  build(group, { shadows = true } = {}) {
    for (const [matName, geos] of this.named) {
      const merged = mergeGeometries(geos, false);
      bakeWorldUvs(merged, getUvScale(matName));
      const mesh = new THREE.Mesh(merged, getMaterial(matName));
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      for (const g of geos) g.dispose();
    }
    for (const { material, geos } of this.custom) {
      const merged = mergeGeometries(geos, false);
      // stained tiles must line up with the surrounding ceiling texture
      const uvScale = material.name === 'detail_tile_stain' ? getUvScale('ceiling_tile') : 1;
      bakeWorldUvs(merged, uvScale);
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = shadows && !material.transparent;
      mesh.receiveShadow = !material.transparent;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      for (const g of geos) g.dispose();
    }
    const meshCount = this.named.size + this.custom.length;
    this.named.clear();
    this.custom.length = 0;
    return meshCount;
  }
}

// QA stat: draw calls added by the detail pass (read via window.__f2Meshes)
export function recordDetailMeshes(count) {
  if (typeof window !== 'undefined') {
    window.__f2Meshes = (window.__f2Meshes || 0) + count;
  }
}

// ---- shared helpers -------------------------------------------------------
function subtract1d(span, holes) {
  let parts = [span];
  for (const h of holes) {
    const next = [];
    for (const p of parts) {
      const lo = Math.max(p[0], h[0]), hi = Math.min(p[1], h[1]);
      if (hi - lo <= EPS) { next.push(p); continue; }
      if (lo - p[0] > EPS) next.push([p[0], lo]);
      if (p[1] - hi > EPS) next.push([hi, p[1]]);
    }
    parts = next;
  }
  return parts;
}

const roomsById = Object.fromEntries(MAP.ROOMS.map((r) => [r.id, r]));
const stairTopRooms = new Set(MAP.STAIRS.map((s) => s.top));
function levelY(level) { return MAP.LEVELS[level].y; }

const TILE_ZONES = new Set(['office', 'lobby', 'exec', 'break', 'rr', 'corridor', 'server']);
const SERVICE_ZONES = new Set(['service', 'stair', 'basement', 'garage', 'loading', 'archive']);

// ===========================================================================
export function buildArchDetail(world, group) {
  const batch = new DetailBatch();
  const rng = new Rng(20260214);

  coverBasementWallLips(world, batch);
  addBaseboards(world, batch);
  addCeilingTreatment(world, batch, rng);
  addColumns(world, batch);
  addWindowDressing(world, batch);
  addSignageAndEmergency(world, batch);
  addStairUpgrades(world, batch);
  addParapetCaps(world, batch);
  addLobbyBulkhead(batch);

  recordDetailMeshes(batch.build(group));
}

// ---------------------------------------------------------------------------
// 0. Fix: basement walls rise to y=0.02 (2 cm above ground slabs). Wherever a
// level-b wall line crosses a ground-floor room interior with no ground wall
// on the same line, lay a flush cover strip in the room's floor material.
// World-space UVs make the patch blend seamlessly with the slab.
// ---------------------------------------------------------------------------
function coverBasementWallLips(world, batch) {
  const runsB = (world._wallRuns || []).filter((r) => r.level === 'b');
  const runsG = (world._wallRuns || []).filter((r) => r.level === 'g');
  for (const rb of runsB) {
    // ground walls sitting on the same line hide the lip
    const covered = runsG
      .filter((rg) => rg.dir === rb.dir && Math.abs(rg.line - rb.line) < 0.06)
      .map((rg) => [rg.a - 0.1, rg.b + 0.1]);
    for (const room of MAP.ROOMS) {
      if (room.level !== 'g' || room.outdoor || stairTopRooms.has(room.id)) continue;
      const style = FLOOR_STYLES[room.floor] || FLOOR_STYLES.concrete;
      for (const [x0, z0, x1, z1] of room.rects) {
        const lineOk = rb.dir === 'x'
          ? rb.line > z0 + 0.05 && rb.line < z1 - 0.05
          : rb.line > x0 + 0.05 && rb.line < x1 - 0.05;
        if (!lineOk) continue;
        const lo = Math.max(rb.a, rb.dir === 'x' ? x0 : z0);
        const hi = Math.min(rb.b, rb.dir === 'x' ? x1 : z1);
        if (hi - lo < 0.05) continue;
        for (const [a, b] of subtract1d([lo, hi], covered)) {
          if (b - a < 0.05) continue;
          const w = 0.3, h = 0.032; // lip is 0.16 wide × 0.02 tall
          if (rb.dir === 'x') batch.box(style.mat, (a + b) / 2, h / 2 - 0.004, rb.line, b - a, h, w);
          else batch.box(style.mat, rb.line, h / 2 - 0.004, (a + b) / 2, w, h, b - a);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Baseboards: 0.09 m tall, 0.012 m proud, both interior sides, holes cut.
// ---------------------------------------------------------------------------
function addBaseboards(world, batch) {
  const runs = world._wallRuns || [];
  const holes = world._holes || [];
  const BB_H = 0.09, BB_T = 0.024;
  for (const run of runs) {
    const rn = run.roomNeg ? roomsById[run.roomNeg] : null;
    const rp = run.roomPos ? roomsById[run.roomPos] : null;
    const exterior = !rn || !rp || rn?.outdoor || rp?.outdoor;
    const thick = exterior ? MAP.WALL.extThick : MAP.WALL.intThick;
    const floorY = levelY(run.level);
    // holes reaching the floor interrupt the baseboard (doors, openings,
    // shutters); include frame clearance
    const floorHoles = holes
      .filter((h) => h.run === run && h.y0 <= floorY + BB_H)
      .map((h) => [h.a - 0.08, h.b + 0.08]);
    for (const side of [-1, 1]) {
      const room = side < 0 ? rn : rp;
      if (!room || room.outdoor) continue;
      if (room.zone === 'garage' || room.zone === 'loading') continue; // bare industrial walls
      if (stairTopRooms.has(room.id)) continue; // no continuous floor
      const off = side * (thick / 2); // outer face 0.012 proud, inner buried
      for (const [a, b] of subtract1d([run.a, run.b], floorHoles)) {
        if (b - a < 0.06) continue;
        if (run.dir === 'x') batch.box('baseboard', (a + b) / 2, floorY + BB_H / 2, run.line + off, b - a, BB_H, BB_T);
        else batch.box('baseboard', run.line + off, floorY + BB_H / 2, (a + b) / 2, BB_T, BB_H, b - a);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Ceilings. Tile zones: emissive recessed 0.6×1.2 panels on a grid (light
// positions in lighting.js sit on this grid) + stained tiles in less-kept
// rooms. Service zones: ducts, conduits, sprinkler mains, bare strip lights.
// Everything stays above 2.35 m — no colliders needed.
// ---------------------------------------------------------------------------
function fixtureGrid(x0, z0, x1, z1, spacing = 3.4) {
  const w = x1 - x0, d = z1 - z0;
  const nx = Math.max(1, Math.round(w / spacing));
  const nz = Math.max(1, Math.round(d / spacing));
  const pts = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      pts.push([x0 + w * (i + 0.5) / nx, z0 + d * (j + 0.5) / nz]);
    }
  }
  return pts;
}

function stripLight(batch, x, y, z, len, axis) {
  // bare fluorescent: painted housing + emissive tube slung under it
  const hx = axis === 'x' ? len + 0.06 : 0.16, hz = axis === 'x' ? 0.16 : len + 0.06;
  batch.box('metal_painted', x, y + 0.045, z, hx, 0.05, hz);
  batch.box('@fix_cool', x, y, z, axis === 'x' ? len : 0.09, 0.05, axis === 'x' ? 0.09 : len);
}

const STAINED_ROOMS = { copy_mail: 4, break_room: 3, waiting: 2, east_hall: 2 };

function addCeilingTreatment(world, batch, rng) {
  for (const room of MAP.ROOMS) {
    if (room.outdoor) continue;
    const y = levelY(room.level);
    const cy = y + room.ceil;
    if (TILE_ZONES.has(room.zone)) {
      const panelMat = room.zone === 'exec' ? '@fix_warm' : '@fix_cool';
      for (const [x0, z0, x1, z1] of room.rects) {
        const longX = (x1 - x0) >= (z1 - z0);
        for (const [px, pz] of fixtureGrid(x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5)) {
          // recessed 0.6×1.2 troffer: slim aluminum trim + emissive lens
          const sx = longX ? 1.2 : 0.6, sz = longX ? 0.6 : 1.2;
          batch.box('aluminum', px, cy - 0.012, pz, sx + 0.08, 0.02, sz + 0.08);
          batch.box(panelMat, px, cy - 0.026, pz, sx, 0.022, sz);
        }
      }
      // stained/darker tiles in less-kept rooms
      const stains = STAINED_ROOMS[room.id] || 0;
      for (let s = 0; s < stains; s++) {
        const [x0, z0, x1, z1] = room.rects[0];
        const gx = Math.floor(rng.range(x0 + 0.6, x1 - 0.6) / 0.6) * 0.6 + 0.3;
        const gz = Math.floor(rng.range(z0 + 0.6, z1 - 0.6) / 0.6) * 0.6 + 0.3;
        batch.plane('@tile_stain', gx, cy - 0.006, gz, 0.6, 0.6, 'down');
      }
    } else if (SERVICE_ZONES.has(room.zone)) {
      addServiceCeiling(batch, room, y, cy);
    }
  }
}

// Per-room exposed-services spec: duct/tray runs, conduits, sprinkler mains
// with drop heads, bare strip lights. All above 2.35 m from the room floor.
function addServiceCeiling(batch, room, y, cy) {
  const R = (i = 0) => room.rects[i];
  const duct = (x0, z0, x1, z1, cyy, w, h) => {
    batch.box('metal_painted', (x0 + x1) / 2, cyy, (z0 + z1) / 2,
      x1 - x0 || w, h, z1 - z0 || w);
  };
  const conduitRun = (axis, c, a, b, yy) => {
    if (axis === 'x') batch.box('metal_dark', (a + b) / 2, yy, c, b - a, 0.05, 0.05);
    else batch.box('metal_dark', c, yy, (a + b) / 2, 0.05, 0.05, b - a);
  };
  const sprinkler = (axis, c, a, b, yy) => {
    if (axis === 'x') batch.box('@pipe_red', (a + b) / 2, yy, c, b - a, 0.05, 0.05);
    else batch.box('@pipe_red', c, yy, (a + b) / 2, 0.05, 0.05, b - a);
    for (let t = a + 1.6; t < b - 0.4; t += 3.2) {
      if (axis === 'x') batch.box('@pipe_red', t, yy - 0.08, c, 0.035, 0.14, 0.035);
      else batch.box('@pipe_red', c, yy - 0.08, t, 0.035, 0.14, 0.035);
    }
  };
  switch (room.id) {
    case 'garage': { // y=-3.6 ceil 3.2 → ceiling at -0.4
      duct(44.6, 5.2, 63.4, 5.2, cy - 0.38, 0.6, 0.36);
      duct(44.6, 10.8, 63.4, 10.8, cy - 0.38, 0.6, 0.36);
      conduitRun('x', 0.45, 44.4, 63.6, cy - 0.14);
      conduitRun('x', 15.55, 44.4, 55.6, cy - 0.14);
      sprinkler('x', 8, 44.6, 63.4, cy - 0.2);
      for (const sx of [47.5, 54, 60.5]) for (const sz of [3.6, 12.4]) stripLight(batch, sx, cy - 0.12, sz, 1.3, 'x');
      break;
    }
    case 'loading': { // ceil 3.2
      duct(30.6, 2.4, 43.4, 2.4, cy - 0.4, 0.55, 0.34);
      conduitRun('x', 7.55, 30.4, 43.6, cy - 0.14);
      sprinkler('x', 5.6, 30.6, 43.4, cy - 0.2);
      stripLight(batch, 33.6, cy - 0.12, 4.2, 1.3, 'x');
      stripLight(batch, 40.4, cy - 0.12, 4.2, 1.3, 'x');
      break;
    }
    case 'utility': { // ceil 2.8
      duct(18.6, 5.6, 29.4, 5.6, cy - 0.3, 0.5, 0.3);
      conduitRun('x', 1.1, 18.4, 29.6, cy - 0.12);
      sprinkler('x', 3.4, 18.6, 29.4, cy - 0.16);
      stripLight(batch, 21.5, cy - 0.1, 4, 1.2, 'x');
      stripLight(batch, 27, cy - 0.1, 4, 1.2, 'x');
      break;
    }
    case 'service_corridor': { // ceil 2.6 (floor -3.6) — slim tray only
      batch.box('metal_painted', 31, cy - 0.13, 10.2, 25.6, 0.06, 0.3); // cable tray
      conduitRun('x', 11.55, 18.4, 43.6, cy - 0.09);
      sprinkler('x', 9.5, 18.6, 43.4, cy - 0.1);
      for (const sx of [20.5, 25.5, 30.5, 35.5, 40.5]) stripLight(batch, sx, cy - 0.09, 10, 1.2, 'x');
      break;
    }
    case 'b_finger': {
      conduitRun('z', 59.6, 16.4, 21.6, cy - 0.1);
      stripLight(batch, 58, cy - 0.09, 19, 1.2, 'z');
      break;
    }
    case 'mech_room': { // ground service, ceil 3.0
      duct(61, 22.6, 61, 29.4, cy - 0.4, 0.6, 0.42);
      duct(63.2, 22.6, 63.2, 29.4, cy - 0.34, 0.4, 0.3);
      conduitRun('z', 60.35, 22.4, 29.6, cy - 0.16);
      stripLight(batch, 62, cy - 0.12, 26, 1.2, 'z');
      break;
    }
    case 'storage_n': {
      conduitRun('z', 18.4, 0.4, 9.6, cy - 0.14);
      sprinkler('z', 21.2, 0.6, 9.4, cy - 0.18);
      stripLight(batch, 20, cy - 0.12, 3, 1.2, 'z');
      stripLight(batch, 20, cy - 0.12, 7, 1.2, 'z');
      break;
    }
    case 'janitor': {
      conduitRun('z', 10.4, 38.4, 43.6, cy - 0.14);
      stripLight(batch, 12, cy - 0.12, 41, 1.2, 'z');
      break;
    }
    case 'security': {
      stripLight(batch, 37.5, cy - 0.12, 42, 1.2, 'x');
      break;
    }
    case 'archive': { // exposed services over the stacks
      duct(46.6, 14.6, 46.6, 25.4, cy - 0.36, 0.45, 0.32);
      sprinkler('z', 40.8, 14.6, 25.4, cy - 0.2);
      stripLight(batch, 42.5, cy - 0.12, 17, 1.2, 'z');
      stripLight(batch, 42.5, cy - 0.12, 23, 1.2, 'z');
      stripLight(batch, 46, cy - 0.12, 20, 1.2, 'z');
      break;
    }
    case 'stair_w': {
      stripLight(batch, 16, cy - 0.12, 15.3, 1.2, 'x');
      break;
    }
    case 'stairwell': {
      stripLight(batch, 58, cy - 0.12, 29.2, 1.2, 'x');
      break;
    }
    default: // openAbove basement stair rooms and the rest: nothing overhead
      break;
  }
}

// ---------------------------------------------------------------------------
// 3. Structural columns (with colliders, clear of doors and nav routes).
// ---------------------------------------------------------------------------
function addColumns(world, batch) {
  // open-plan office: 0.35 m concrete columns on a ~7 m grid, painted band
  const officeCols = [[24.5, 19.5], [31.5, 19.5], [24.5, 25.5], [31.5, 25.5]];
  for (const [x, z] of officeCols) {
    batch.box('concrete', x, 1.5, z, 0.35, 3.0, 0.35);
    batch.box('drywall_accent', x, 0.55, z, 0.39, 1.1, 0.39);
    world.addCollider(aabb(x - 0.2, 0, z - 0.2, x + 0.2, 3.0, z + 0.2, { kind: 'column', surface: 'concrete' }));
  }
  // lobby: 2 feature columns — dark steel core with a wood wrap
  for (const [x, z] of [[26, 35], [36, 35]]) {
    batch.box('metal_dark', x, 2.2, z, 0.3, 4.4, 0.3);
    batch.box('wood_dark', x, 1.3, z, 0.46, 2.6, 0.46);
    batch.box('metal_brushed', x, 2.64, z, 0.5, 0.08, 0.5); // wrap cap trim
    world.addCollider(aabb(x - 0.23, 0, z - 0.23, x + 0.23, 4.4, z + 0.23, { kind: 'column', surface: 'wood' }));
  }
  // garage: 0.4 m concrete columns, hazard band at the base; kept out of the
  // extraction rect (x 54..61, z 5..11), ≥1.2 m from doors, off patrol lines
  const by = -3.6;
  const garageCols = [[50, 4.5], [50, 11.5], [54, 14.2], [62, 14.2], [56, 1.8], [62, 1.8]];
  for (const [x, z] of garageCols) {
    batch.box('concrete', x, by + 1.6, z, 0.4, 3.2, 0.4);
    batch.box('@safety_yellow', x, by + 0.5, z, 0.44, 1.0, 0.44);
    world.addCollider(aabb(x - 0.22, by, z - 0.22, x + 0.22, by + 3.2, z + 0.22, { kind: 'column', surface: 'concrete' }));
  }
}

// ---------------------------------------------------------------------------
// 4. Window dressing: interior sill boards + fin-tube radiator covers under
// every exterior window (skip interiorTo; radiators need sill ≥ 0.6).
// ---------------------------------------------------------------------------
function addWindowDressing(world, batch) {
  for (const w of MAP.WINDOWS) {
    if (w.interiorTo) continue;
    const floorY = levelY(w.level);
    const mid = (w.span[0] + w.span[1]) / 2;
    // interior side: sample roomAt on both sides of the wall line
    const probe = (s) => (w.dir === 'x' ? MAP.roomAt(mid, w.line + s, floorY) : MAP.roomAt(w.line + s, mid, floorY));
    const side = probe(0.6) ? 1 : (probe(-0.6) ? -1 : 0);
    if (!side) continue;
    const half = MAP.WALL.extThick / 2; // 0.16
    const len = w.span[1] - w.span[0];
    // sill board: sits on the sill wall, 4.5 cm proud of the interior face
    const bo = side * (half + 0.045 - 0.1); // board is 0.2 deep
    const by = floorY + w.sill - 0.045 - 0.017;
    if (w.dir === 'x') batch.box('laminate', mid, by, w.line + bo, len + 0.08, 0.035, 0.2);
    else batch.box('laminate', w.line + bo, by, mid, 0.2, 0.035, len + 0.08);
    // radiator: boxy fin-tube cover flush against the wall
    if (w.sill < 0.6) continue;
    const rh = Math.min(0.9, w.sill - 0.1);
    const rl = Math.max(0.8, len - 0.3);
    const ro = side * (half + 0.11);
    const rcy = floorY + rh / 2;
    let cx, cz;
    if (w.dir === 'x') { cx = mid; cz = w.line + ro; } else { cx = w.line + ro; cz = mid; }
    batch.box('metal_painted', cx, rcy, cz, w.dir === 'x' ? rl : 0.22, rh, w.dir === 'x' ? 0.22 : rl);
    // top grille + end caps read as a fin-tube cover
    batch.box('aluminum', cx, floorY + rh - 0.015, cz, w.dir === 'x' ? rl - 0.1 : 0.16, 0.02, w.dir === 'x' ? 0.16 : rl - 0.1);
    const ex = w.dir === 'x' ? rl / 2 : 0.115, ez = w.dir === 'x' ? 0.115 : rl / 2;
    world.addCollider(aabb(cx - ex, floorY, cz - ez, cx + ex, floorY + rh, cz + ez,
      { kind: 'radiator', surface: 'metal', blocksSight: false }));
  }
}

// ---------------------------------------------------------------------------
// 5. Exit signage above egress doors + twin-head emergency lights.
// ---------------------------------------------------------------------------
const EXIT_SIGNS = [
  // [doorId, side rooms...] — flag sign hung on each listed room's side
  ['d_plaza_vest', ['vestibule']],
  ['d_vest_lobby', ['lobby']],
  ['d_copy_stairw', ['copy_mail', 'stair_w']],
  ['d_ehall_stairc', ['east_hall']],
  ['d_corr_stairc', ['exec_corridor']],
  ['d_bland_corr', ['service_corridor', 'b_landing_w']],
  ['d_bcorr_garage', ['service_corridor', 'garage']],
  ['d_loading_garage', ['loading', 'garage']],
  ['d_bcorr_utility', ['utility']],
  ['d_bcorr_loading', ['loading']],
  ['d_bfinger_garage', ['b_finger', 'garage']],
];

const DOOR_HEADS = {
  'office': 2.06, 'restroom': 2.06, 'metal': 2.06, 'fire': 2.1, 'exec': 2.1,
  'security': 2.1, 'glass': 2.3, 'double-glass': 2.5, 'fire-double': 2.2, 'metal-double': 2.2,
};

function addSignageAndEmergency(world, batch) {
  for (const [doorId, sideRooms] of EXIT_SIGNS) {
    const d = MAP.DOORS.find((dd) => dd.id === doorId);
    if (!d) continue;
    const floorY = levelY(d.level);
    const head = DOOR_HEADS[d.kind] || 2.06;
    const mid = (d.span[0] + d.span[1]) / 2;
    for (const roomId of sideRooms) {
      const room = roomsById[roomId];
      if (!room) continue;
      // which side of the wall line is this room on?
      const rc = roomCenter(room);
      const sign = Math.sign((d.dir === 'x' ? rc[1] : rc[0]) - d.line) || 1;
      const sy = floorY + head + 0.26;
      // flag-mounted: bracket at the wall face + emissive box perpendicular
      const wallHalf = 0.1;
      const off = sign * (wallHalf + 0.19);
      if (d.dir === 'x') {
        batch.box('metal_dark', mid, sy + 0.13, d.line + sign * (wallHalf + 0.17), 0.05, 0.03, 0.34);
        batch.box('@exit_green', mid, sy, d.line + off, 0.05, 0.21, 0.36);
      } else {
        batch.box('metal_dark', d.line + sign * (wallHalf + 0.17), sy + 0.13, mid, 0.34, 0.03, 0.05);
        batch.box('@exit_green', d.line + off, sy, mid, 0.36, 0.21, 0.05);
      }
    }
  }
  // twin-head emergency units (stairwells + basement), wall-mounted high
  const EMERG = [
    [16, 2.35, 15.75], [58, 2.35, 29.7],                 // ground stair rooms
    [17.7, -1.2, 12, 'z'], [56.3, -1.2, 26, 'z'],        // basement landings
    [31, -1.15, 11.7], [24, -0.9, 7.7], [37, -0.5, 7.7], // corridor/utility/loading
    [44.35, -0.7, 8, 'z'], [63.7, -0.7, 14, 'z'],        // garage
  ];
  for (const [x, y, z, axis] of EMERG) {
    const alongX = axis !== 'z';
    batch.box('plastic_light', x, y, z, alongX ? 0.28 : 0.1, 0.1, alongX ? 0.1 : 0.28);
    const hx = alongX ? 0.1 : 0, hz = alongX ? 0 : 0.1;
    batch.box('@fix_warm', x - hx, y - 0.07, z - hz, 0.06, 0.05, 0.06);
    batch.box('@fix_warm', x + hx, y - 0.07, z + hz, 0.06, 0.05, 0.06);
  }
}

function roomCenter(room) {
  const [x0, z0, x1, z1] = room.rects[0];
  return [(x0 + x1) / 2, (z0 + z1) / 2];
}

// ---------------------------------------------------------------------------
// 6. Stair upgrades: tread nosings, second (mid-height) handrail, painted
// edge-warning lines at top and bottom of each flight.
// ---------------------------------------------------------------------------
function addStairUpgrades(world, batch) {
  for (const st of MAP.STAIRS) {
    for (const piece of st.pieces) {
      if (piece.type !== 'flight') continue;
      const { x0, x1, zStart, zEnd, yStart, yEnd } = piece;
      const drop = yStart - yEnd;
      const steps = Math.max(2, Math.round(drop / 0.18));
      const rise = drop / steps;
      const dirSign = Math.sign(zEnd - zStart);
      const tread = Math.abs(zEnd - zStart) / steps;
      const width = x1 - x0;
      for (let i = 0; i < steps; i++) {
        const yTop = yStart - rise * (i + 1);
        const zFront = zStart + dirSign * tread * (i + 1);
        // nosing strip on the leading edge of each tread
        batch.box('aluminum', (x0 + x1) / 2, yTop + 0.008, zFront - dirSign * 0.03, width - 0.06, 0.022, 0.06);
      }
      // second handrail at 0.62 m (builder provides the 0.95 m top rail)
      for (const rx of [x0 + 0.04, x1 - 0.04]) {
        const segs = 6;
        for (let i = 0; i < segs; i++) {
          const t = (i + 0.5) / segs;
          const zc = zStart + (zEnd - zStart) * t;
          const yc = yStart + (yEnd - yStart) * t;
          batch.box('metal_dark', rx, yc + 0.62, zc, 0.045, 0.05, Math.abs(zEnd - zStart) / segs + 0.02);
        }
      }
      // painted edge-warning lines (safety yellow) at top and bottom
      batch.box('@safety_yellow', (x0 + x1) / 2, yStart + 0.006, zStart - dirSign * 0.09, width, 0.012, 0.14);
      batch.box('@safety_yellow', (x0 + x1) / 2, yEnd + 0.006, zEnd + dirSign * 0.12, width, 0.012, 0.14);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Lobby perimeter bulkhead band. The roof slabs of adjacent lower rooms
// (vestibule 3.2 m, neighbors 3.0 m vs lobby 4.4 m) poke ~0.12 m through the
// lobby walls at y 3.16–3.60 (builder emits roof slabs 0.4 m oversized).
// Clad them with a continuous accent frieze — reads as intentional design.
// ---------------------------------------------------------------------------
function addLobbyBulkhead(batch) {
  const y0 = 3.08, y1 = 3.68, cy = (y0 + y1) / 2, h = y1 - y0, d = 0.26;
  // north wall (cubicles side), full width
  batch.box('drywall_accent', 31, cy, 30.13, 18, h, d);
  // south wall — skip the tall porch curtain window (22.5..26.7)
  batch.box('drywall_accent', (26.7 + 40) / 2, cy, 39.81, 40 - 26.7, h, d);
  // west (waiting) and east (exec corridor / conference) walls
  batch.box('drywall_accent', 22.19, cy, 35, d, h, 10);
  batch.box('drywall_accent', 39.81, cy, 35, d, h, 10);
}

// ---------------------------------------------------------------------------
// 8. Parapet coping on exterior wall tops (visible from the plaza), with a
// snow cap — sells the snowbound roofline.
// ---------------------------------------------------------------------------
function addParapetCaps(world, batch) {
  for (const run of world._wallRuns || []) {
    if (run.level !== 'g') continue;
    const rn = run.roomNeg ? roomsById[run.roomNeg] : null;
    const rp = run.roomPos ? roomsById[run.roomPos] : null;
    const exterior = !rn || !rp || rn?.outdoor || rp?.outdoor;
    if (!exterior) continue;
    const inRoom = rn && !rn.outdoor ? rn : (rp && !rp.outdoor ? rp : null);
    if (!inRoom) continue;
    const topY = inRoom.ceil + 0.55;
    const len = run.b - run.a;
    if (len < 0.2) continue;
    const capW = MAP.WALL.extThick + 0.12;
    if (run.dir === 'x') {
      batch.box('metal_painted', (run.a + run.b) / 2, topY + 0.035, run.line, len, 0.07, capW);
      batch.box('snow', (run.a + run.b) / 2, topY + 0.095, run.line, len - 0.08, 0.05, capW - 0.06);
    } else {
      batch.box('metal_painted', run.line, topY + 0.035, (run.a + run.b) / 2, capW, 0.07, len);
      batch.box('snow', run.line, topY + 0.095, (run.a + run.b) / 2, capW - 0.06, 0.05, len - 0.08);
    }
  }
}
