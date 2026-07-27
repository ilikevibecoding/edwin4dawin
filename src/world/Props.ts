/**
 * Props.ts — the human-scale clutter that makes the district feel lived-in and
 * fought-over: the checkpoint, Jersey barriers, sandbag emplacements, the
 * market bazaar (stalls, awnings, hanging cloth, produce crates), oil drums,
 * wooden crates, tyres, cinder blocks, dumpsters, and wall-mounted services
 * (AC units, drainpipes, satellite dishes, signage) plus cables strung across
 * the street.
 *
 * Anything numerous is drawn with a single `THREE.InstancedMesh` (one draw
 * call) with per-instance rotation/scale jitter so it never reads as a grid.
 * Unique structures are merged. Solid props feed the cover system.
 */

import * as THREE from 'three';
import type { SurfaceType } from '../core/Contracts';
import type { Build, BuildingSpec, LevelPlan } from './Blockout';
import { chamferedBox, worldCylinder, worldBox, placed, mergeAll, tagSurface, freeze } from './GeometryKit';

const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const S = new THREE.Vector3();
const P = new THREE.Vector3();

interface InstGroup {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  surface: SurfaceType;
  collider: boolean;
  cast: boolean;
  recv: boolean;
  mats: THREE.Matrix4[];
}

class Instancer {
  private groups = new Map<string, InstGroup>();
  constructor(private env: Build) {}

  group(
    key: string,
    geo: () => THREE.BufferGeometry,
    mat: THREE.Material,
    surface: SurfaceType,
    opts: { collider?: boolean; cast?: boolean; recv?: boolean } = {}
  ): void {
    if (this.groups.has(key)) return;
    const g = geo();
    this.env.own(g);
    this.groups.set(key, {
      geo: g,
      mat,
      surface,
      collider: opts.collider ?? false,
      cast: opts.cast ?? true,
      recv: opts.recv ?? true,
      mats: [],
    });
  }

  place(key: string, x: number, y: number, z: number, ry = 0, scale: THREE.Vector3 | number = 1, rx = 0, rz = 0): void {
    const g = this.groups.get(key);
    if (!g) return;
    E.set(rx, ry, rz, 'YXZ');
    Q.setFromEuler(E);
    if (typeof scale === 'number') S.set(scale, scale, scale);
    else S.copy(scale);
    P.set(x, y, z);
    const m = new THREE.Matrix4().compose(P, Q, S);
    g.mats.push(m);
  }

  flush(): void {
    for (const [key, g] of this.groups) {
      if (g.mats.length === 0) continue;
      const inst = new THREE.InstancedMesh(g.geo, g.mat, g.mats.length);
      inst.name = `inst_${key}`;
      for (let i = 0; i < g.mats.length; i++) inst.setMatrixAt(i, g.mats[i]);
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = g.cast;
      inst.receiveShadow = g.recv;
      inst.matrixAutoUpdate = false;
      inst.updateMatrix();
      tagSurface(inst, g.surface, g.collider);
      this.env.root.add(inst);
      if (g.collider) this.env.colliders.push(inst);
    }
    this.groups.clear();
  }
}

// ---------------------------------------------------------------------------

export function buildProps(env: Build, plan: LevelPlan): void {
  const inst = new Instancer(env);
  registerGeometries(env, inst);

  buildCheckpoint(env, inst, plan);
  buildRoofProps(env, inst, plan);
  buildStreetBarriers(env, inst, plan);
  buildMarket(env, inst, plan);
  scatterClutter(env, inst, plan);
  buildWallServices(env, inst, plan);
  buildCables(env, plan);
  buildAlleyDressing(env, inst, plan);
  buildForeground(env, inst, plan);
  buildRoofLaundry(env, plan);

  inst.flush();
}

function registerGeometries(env: Build, inst: Instancer): void {
  const woodUv = env.uv('crate_wood');
  const metalUv = env.uv('metal_rusted');
  const concUv = env.uv('concrete_cast');

  inst.group('barrel', () => worldCylinder(0.29, 0.29, 0.9, 14, metalUv), env.mat('metal_rusted', { tint: 0x9a6a44, key: 'barrel' }), 'metal', {
    collider: true,
  });
  inst.group('barrel_blue', () => worldCylinder(0.29, 0.29, 0.9, 14, metalUv), env.mat('metal_painted', { tint: 0x3f6f8c, key: 'barrel_blue' }), 'metal', {
    collider: true,
  });
  inst.group('drum', () => worldCylinder(0.24, 0.24, 0.58, 12, metalUv), env.mat('metal_painted', { tint: 0x8a5a34, key: 'drum' }), 'metal', {
    collider: true,
  });
  inst.group('crate', () => chamferedBox(0.9, 0.85, 0.9, { chamfer: 0.03, uvScale: woodUv }), env.mat('wood_plank', { key: 'crate' }), 'wood', {
    collider: true,
  });
  inst.group('crate_sm', () => chamferedBox(0.55, 0.5, 0.55, { chamfer: 0.025, uvScale: woodUv }), env.mat('wood_plank', { tint: 0xc7a36a, key: 'crate_sm' }), 'wood', {
    collider: true,
  });
  inst.group('pallet', () => palletGeo(woodUv), env.mat('wood_plank', { tint: 0xbfa070, key: 'pallet' }), 'wood', { cast: true });
  inst.group('tyre', () => new THREE.TorusGeometry(0.32, 0.14, 8, 16), env.mat('gun_polymer', { tint: 0x22242a, key: 'tyre' }), 'metal', { cast: true });
  inst.group('cinder', () => chamferedBox(0.4, 0.2, 0.2, { chamfer: 0.015, uvScale: concUv }), env.mat('concrete_rough', { tint: 0x8f8880, key: 'cinder' }), 'concrete', {});
  inst.group('sandbag', () => sandbagGeo(env.uv('barrier_sandbag')), env.mat('sandbag', { tint: 0xb7a06a, normalScale: 0.7, key: 'sandbag' }), 'sandbag', { collider: true, cast: true });
  inst.group('jersey', () => jerseyGeo(concUv), env.mat('concrete_cast', { tint: 0xb9b2a4, key: 'jersey' }), 'concrete', { collider: true, cast: true });
  inst.group('ac', () => acUnitGeo(metalUv), env.mat('metal_painted', { tint: 0xb9bcc0, key: 'ac' }), 'metal', { cast: true });
  inst.group('dish', () => dishGeo(metalUv), env.mat('metal_painted', { tint: 0xd7d4cc, key: 'dish' }), 'metal', { cast: true });
  inst.group('dumpster', () => dumpsterGeo(metalUv), env.mat('metal_rusted', { tint: 0x4a6a4a, key: 'dumpster' }), 'metal', { collider: true, cast: true });
  inst.group('sign', () => chamferedBox(1.6, 0.7, 0.12, { chamfer: 0.02, uvScale: env.uv('metal_painted') }), env.mat('metal_painted', { tint: 0xb04a32, key: 'sign' }), 'metal', { cast: true });
  inst.group('pipe', () => worldCylinder(0.06, 0.06, 3.0, 8, metalUv), env.mat('metal_rusted', { tint: 0x9a8a6a, key: 'pipe' }), 'metal', { cast: true });
  inst.group('watertank', () => watertankGeo(metalUv), env.mat('metal_rusted', { tint: 0x7a6a52, key: 'watertank' }), 'metal', { cast: true });
  inst.group('roofhut', () => chamferedBox(2.2, 2.1, 2.2, { chamfer: 0.05, uvScale: concUv }), env.mat('concrete_cast', { tint: 0xb2a892, normalScale: 0.4, key: 'roofhut' }), 'concrete', { collider: true, cast: true });
  inst.group('vent', () => chamferedBox(0.6, 0.45, 0.6, { chamfer: 0.03, uvScale: metalUv }), env.mat('metal_painted', { tint: 0x9a9488, key: 'vent' }), 'metal', { cast: true });
  inst.group('aerial', () => aerialGeo(metalUv), env.mat('metal_rusted', { tint: 0x3a3a3e, key: 'aerial' }), 'metal', { cast: true, recv: false });
  inst.group('brass', () => worldCylinder(0.012, 0.012, 0.05, 5, metalUv), env.mat('metal_brushed', { tint: 0xcaa23c, key: 'brass' }), 'metal', { cast: false, recv: false });
  inst.group('dishcluster', () => dishGeo(metalUv), env.mat('metal_painted', { tint: 0xcfccc2, key: 'dishc' }), 'metal', { cast: true });
}

// ---------------------------------------------------------------------------
// Rooftops (the overview shot looks straight down onto these)
// ---------------------------------------------------------------------------

function buildRoofProps(env: Build, inst: Instancer, plan: LevelPlan): void {
  const rng = env.rng;
  for (const spec of plan.buildings) {
    const H = spec.floors * spec.floorHeight;
    const roofY = H + 0.3;
    const x0 = spec.cx - spec.w / 2 + 1.2;
    const x1 = spec.cx + spec.w / 2 - 1.2;
    const z0 = spec.cz - spec.d / 2 + 1.2;
    const z1 = spec.cz + spec.d / 2 - 1.2;
    const rx = () => rng.range(x0, x1);
    const rz = () => rng.range(z0, z1);
    // Stair-access hut in a back corner.
    const hutX = spec.facing === 'E' ? x0 + 0.6 : x1 - 0.6;
    inst.place('roofhut', hutX, roofY + 1.05, z0 + 1.2, rng.range(-0.05, 0.05));
    if (rng.chance(0.5)) inst.place('roofhut', hutX, roofY + 1.05, z1 - 1.4, rng.range(-0.05, 0.05), new THREE.Vector3(0.7, 0.8, 0.7));
    // Water tanks (a cluster reads as a real rooftop).
    const tanks = rng.int(2, 3);
    for (let i = 0; i < tanks; i++) inst.place('watertank', rx(), roofY + 0.85, rz(), rng.range(0, 6.28));
    // Vents / condensers scattered generously.
    for (let i = 0; i < 6; i++) inst.place('vent', rx(), roofY + 0.22, rz(), rng.range(0, 6.28));
    for (let i = 0; i < 2; i++) inst.place('ac', rx(), roofY + 0.25, rz(), rng.range(0, 6.28));
    // Satellite-dish cluster (a few pointing the same way) breaks the parapet line.
    const dcx = x1 - 0.7;
    for (let i = 0; i < 3; i++) {
      inst.place('dishcluster', dcx - i * 0.1, roofY + 0.5 + i * 0.6, z1 - 0.9 - i * 0.7, 0.5 + rng.range(-0.15, 0.15));
    }
    inst.place('dish', x0 + 0.8, roofY + 0.5, z0 + 1.2, rng.range(0, 6.28));
    // Aerials / TV antennas.
    inst.place('aerial', x0 + 0.5, roofY, z1 - 0.6, rng.range(0, 6.28), rng.range(0.85, 1.2));
    inst.place('aerial', x1 - 0.5, roofY, z0 + 0.6, rng.range(0, 6.28), rng.range(0.85, 1.2));
    if (rng.chance(0.5)) inst.place('aerial', rx(), roofY, rz(), rng.range(0, 6.28), rng.range(0.7, 1.0));
    // Assorted junk: cinder blocks, a barrel, crates, a stray tyre.
    for (let i = 0; i < 5; i++) inst.place('cinder', rx(), roofY + 0.1, rz(), rng.range(0, 6.28), 1, rng.range(-0.1, 0.1), rng.range(-0.1, 0.1));
    for (let i = 0; i < 2; i++) inst.place('crate_sm', rx(), roofY + 0.25, rz(), rng.range(0, 6.28));
    if (rng.chance(0.7)) inst.place('barrel', rx(), roofY + 0.45, rz(), rng.range(0, 6.28), 1, rng.range(-0.05, 0.05));
    if (rng.chance(0.6)) inst.place('tyre', rx(), roofY + 0.14, rz(), rng.range(0, 6.28), 1, Math.PI / 2, 0);
    // Rubble strewn across the roof of shelled buildings.
    const sev = spec.damage?.severity ?? 0;
    for (let i = 0; i < Math.round(sev * 14); i++) {
      inst.place('cinder', rx(), roofY + rng.range(0.05, 0.2), rz(), rng.range(0, 6.28), rng.range(0.7, 1.3), rng.range(-0.3, 0.3), rng.range(-0.3, 0.3));
    }

    // Sandbagged sniper position on the taller blocks, facing the street.
    if (spec.floors >= 4) {
      const fx = spec.facing === 'E' ? x1 - 1.4 : x0 + 1.4;
      const face = spec.facing === 'E' ? 'E' : 'W';
      sandbagWall(env, inst, fx - 1.2, spec.cz - 1.4, fx + 1.2, spec.cz + 1.4, 2, face, roofY + 0.02);
    }
  }
}

function watertankGeo(uv: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = worldCylinder(0.55, 0.55, 1.3, 12, uv);
  parts.push(placed(body, 0, 0, 0));
  body.dispose();
  // Four legs.
  for (const [lx, lz] of [
    [-0.35, -0.35],
    [0.35, -0.35],
    [-0.35, 0.35],
    [0.35, 0.35],
  ]) {
    const leg = worldCylinder(0.05, 0.05, 0.85, 5, uv);
    parts.push(placed(leg, lx, -1.0, lz));
    leg.dispose();
  }
  return mergeAll(parts);
}

// ---------------------------------------------------------------------------
// Checkpoint (the hero cluster the material shot frames)
// ---------------------------------------------------------------------------

function buildCheckpoint(env: Build, inst: Instancer, _plan: LevelPlan): void {
  const rng = env.rng;
  const cx = 0.5;
  const cz = 2.5;
  // Sandbag emplacement: a low curved wall of individually-slumped bags.
  sandbagWall(env, inst, cx - 2.6, cz - 1.2, cx + 1.0, cz + 1.8, 3, 'E');
  // Jersey barriers forming a chicane across the road.
  inst.place('jersey', cx - 3.2, 0.0, cz + 0.4, 0.04);
  inst.place('jersey', cx + 2.2, 0.0, cz - 1.0, -0.05);
  inst.place('jersey', cx + 3.6, 0.0, cz + 2.0, Math.PI / 2 + 0.1);
  addLowCover(env, cx - 3.2, cz + 0.4, 0, 1);
  addLowCover(env, cx + 2.2, cz - 1.0, 0, -1);

  // Oil drums + barrels clustered as foreground interest.
  inst.place('barrel', cx + 1.6, 0.45, cz + 0.6, 0.6);
  inst.place('barrel_blue', cx + 2.1, 0.45, cz + 1.2, 1.4);
  inst.place('drum', cx + 1.2, 0.29, cz + 1.4, 0.3);
  inst.place('drum', cx - 1.4, 0.29, cz + 1.8, 2.1, 1, 0.15, 0);
  inst.place('crate', cx - 2.0, 0.42, cz + 2.4, 0.4);
  inst.place('crate_sm', cx - 1.6, 0.9, cz + 2.4, 0.9);
  inst.place('tyre', cx + 2.9, 0.14, cz + 0.9, 0, 1, Math.PI / 2, 0);

  // Spent brass littering the emplacement.
  for (let i = 0; i < 46; i++) {
    inst.place('brass', cx + rng.range(-2.8, 1.6), 0.025, cz + rng.range(-1.4, 2.6), rng.range(0, 6.28), 1, Math.PI / 2, rng.range(-0.3, 0.3));
  }
  // A couple of torn/toppled sandbags with spilled sand.
  for (let i = 0; i < 4; i++) {
    inst.place('sandbag', cx - 3.0 + rng.range(-0.4, 0.4), 0.11, cz + 2.6 + i * 0.35, rng.range(0, 6.28), new THREE.Vector3(1.1, 0.6, 0.95), rng.range(-0.3, 0.3), rng.range(-0.2, 0.2));
  }

  // A tilted boom-gate pole across the lane.
  const poleUv = env.uv('metal_painted');
  const pole = worldCylinder(0.07, 0.07, 5.2, 8, poleUv);
  const mesh = new THREE.Mesh(placed(pole, cx - 0.6, 1.05, cz - 0.2, 0.1, 0, Math.PI / 2 - 0.35), env.mat('metal_painted', { tint: 0xcf3a2a, key: 'gate' }));
  pole.dispose();
  mesh.castShadow = true;
  tagSurface(mesh, 'metal', true);
  freeze(mesh);
  env.root.add(mesh);
  env.own(mesh.geometry);
  env.colliders.push(mesh);
}

// ---------------------------------------------------------------------------
// Sandbag emplacements
// ---------------------------------------------------------------------------

function sandbagWall(
  env: Build,
  inst: Instancer,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  rows: number,
  faceDir: 'E' | 'W' | 'N' | 'S',
  baseY = 0
): void {
  const rng = env.rng;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dz, dx);
  const n = Math.max(3, Math.round(len / 0.55));
  for (let r = 0; r < rows; r++) {
    const y = baseY + 0.14 + r * 0.24;
    const stagger = (r % 2) * 0.28;
    for (let i = 0; i < n; i++) {
      const t = (i * 0.55 + stagger) / len;
      if (t > 1) continue;
      const bx = x0 + dx * t + rng.range(-0.05, 0.05);
      const bz = z0 + dz * t + rng.range(-0.05, 0.05);
      const slump = rng.range(0.85, 1.12);
      inst.place(
        'sandbag',
        bx,
        y + rng.range(-0.02, 0.02),
        bz,
        ang + Math.PI / 2 + rng.range(-0.12, 0.12),
        new THREE.Vector3(slump, rng.range(0.85, 1.0), slump * 0.9)
      );
    }
  }
  if (baseY !== 0) return; // roof nests don't seed ground cover
  const nx = faceDir === 'E' ? 1 : faceDir === 'W' ? -1 : 0;
  const nz = faceDir === 'S' ? 1 : faceDir === 'N' ? -1 : 0;
  for (let i = 0; i < 3; i++) {
    const t = (i + 0.5) / 3;
    env.covers.push({
      pos: new THREE.Vector3(x0 + dx * t, 0, z0 + dz * t),
      normal: new THREE.Vector3(nx, 0, nz),
      low: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Street barriers
// ---------------------------------------------------------------------------

function buildStreetBarriers(env: Build, inst: Instancer, plan: LevelPlan): void {
  const rng = env.rng;
  // A line of Jersey barriers guiding traffic near the north end.
  for (let i = 0; i < 6; i++) {
    const z = -24 - i * 3.4;
    const x = (i % 2 === 0 ? -1 : 1) * 3.6 + rng.range(-0.4, 0.4);
    inst.place('jersey', x, 0, z, rng.range(-0.05, 0.05));
    addLowCover(env, x, z, 0, x > 0 ? -1 : 1);
  }
  // Sandbag nest against the west interior building corner.
  sandbagWall(env, inst, -8.8, 14, -6.4, 16.5, 3, 'E');
  void plan;
}

// ---------------------------------------------------------------------------
// Market / bazaar
// ---------------------------------------------------------------------------

function buildMarket(env: Build, inst: Instancer, plan: LevelPlan): void {
  const rng = env.rng;
  const z = plan.market;
  const awningColors = [0xb23a2e, 0x2f6f8f, 0xc9a13a, 0x3f7a4a, 0xba7b32];
  const merged: { key: string; geos: THREE.BufferGeometry[]; mat: THREE.Material; surface: SurfaceType }[] = [];
  const clothParts: { geos: THREE.BufferGeometry[]; mat: THREE.Material }[] = [];

  const stallRows = 2;
  const perRow = 3;
  for (let r = 0; r < stallRows; r++) {
    for (let c = 0; c < perRow; c++) {
      const sx = z.minX + 4 + c * ((z.maxX - z.minX - 6) / (perRow - 1));
      const sz = z.minZ + 5 + r * 11 + rng.range(-1, 1);
      const color = awningColors[(r * perRow + c) % awningColors.length];
      buildStall(env, inst, sx, sz, color, rng, merged, clothParts);
    }
  }

  for (const m of merged) {
    const mesh = new THREE.Mesh(mergeAll(m.geos), m.mat);
    for (const g of m.geos) g.dispose();
    mesh.name = `market_${m.key}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tagSurface(mesh, m.surface, true);
    freeze(mesh);
    env.root.add(mesh);
    env.own(mesh.geometry);
    env.colliders.push(mesh);
  }
  for (const cp of clothParts) {
    const mesh = new THREE.Mesh(mergeAll(cp.geos), cp.mat);
    for (const g of cp.geos) g.dispose();
    mesh.name = 'market_cloth';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tagSurface(mesh, 'fabric');
    freeze(mesh);
    env.root.add(mesh);
    env.own(mesh.geometry);
  }
}

function buildStall(
  env: Build,
  inst: Instancer,
  sx: number,
  sz: number,
  color: number,
  rng: import('../core/MathX').Rng,
  merged: { key: string; geos: THREE.BufferGeometry[]; mat: THREE.Material; surface: SurfaceType }[],
  clothParts: { geos: THREE.BufferGeometry[]; mat: THREE.Material }[]
): void {
  const woodUv = env.uv('crate_wood');
  const woodMat = env.mat('wood_plank', { tint: 0x8a6a44, key: 'stallwood' });
  const woodGeos: THREE.BufferGeometry[] = [];
  const w = 2.6;
  const d = 1.6;
  const postH = 2.3;
  // 4 posts
  for (const [px, pz] of [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [-w / 2, d / 2],
    [w / 2, d / 2],
  ]) {
    const g = chamferedBox(0.1, postH, 0.1, { chamfer: 0.015, uvScale: woodUv });
    woodGeos.push(placed(g, sx + px, postH / 2, sz + pz));
    g.dispose();
  }
  // Table top
  const top = chamferedBox(w + 0.2, 0.12, d + 0.1, { chamfer: 0.02, uvScale: woodUv });
  woodGeos.push(placed(top, sx, 0.95, sz));
  top.dispose();
  // Under-shelf
  const shelf = chamferedBox(w, 0.08, d, { chamfer: 0.02, uvScale: woodUv });
  woodGeos.push(placed(shelf, sx, 0.5, sz));
  shelf.dispose();
  merged.push({ key: 'wood', geos: woodGeos, mat: woodMat, surface: 'wood' });

  // Awning: a sloped fabric quad over the top, plus a valance.
  const clothMat = env.mat('fabric_camo', { tint: color, rough: 0.95, key: 'awn_' + color.toString(16) });
  const clothGeos: THREE.BufferGeometry[] = [];
  const aw = w + 0.8;
  const ad = d + 1.4;
  const awn = worldBox(aw, 0.04, ad, { uvScale: env.uv('fabric_camo') });
  clothGeos.push(placed(awn, sx, postH + 0.1, sz - 0.2, 0, -0.22, 0));
  awn.dispose();
  // Front valance (hanging cloth strip).
  const val = worldBox(aw, 0.5, 0.03, { uvScale: env.uv('fabric_camo') });
  clothGeos.push(placed(val, sx, postH - 0.15, sz - 0.2 + ad / 2 * Math.cos(0.22)));
  val.dispose();
  clothParts.push({ geos: clothGeos, mat: clothMat });

  // Goods on the table: crates + barrels + produce (small boxes).
  inst.place('crate_sm', sx - w / 2 + 0.4, 1.25, sz, rng.range(0, 1));
  inst.place('crate_sm', sx + w / 2 - 0.4, 1.25, sz + 0.2, rng.range(0, 1), 0.8);
  inst.place('barrel', sx + w / 2 + 0.5, 0.45, sz + d / 2 + 0.3, rng.range(0, 1));
  // Ground crates beside the stall.
  inst.place('crate', sx - w / 2 - 0.7, 0.42, sz + rng.range(-0.5, 0.5), rng.range(0, 1));
}

// ---------------------------------------------------------------------------
// Scattered clutter
// ---------------------------------------------------------------------------

function scatterClutter(env: Build, inst: Instancer, plan: LevelPlan): void {
  const rng = env.rng;
  // Clutter pools against wall bases and in corners along the street.
  for (const spec of plan.buildings) {
    const faceX = spec.facing === 'E' ? spec.cx + spec.w / 2 : spec.cx - spec.w / 2;
    const out = spec.facing === 'E' ? 1 : -1;
    const nClusters = 3;
    for (let c = 0; c < nClusters; c++) {
      const z = spec.cz - spec.d / 2 + spec.d * ((c + 0.5) / nClusters) + rng.range(-2, 2);
      const bx = faceX + out * rng.range(0.5, 1.4);
      const cluster = rng.int(2, 4);
      for (let i = 0; i < cluster; i++) {
        const px = bx + rng.range(-0.8, 0.8);
        const pz = z + rng.range(-0.8, 0.8);
        const pick = rng();
        if (pick < 0.3) inst.place('crate', px, 0.42, pz, rng.range(0, 6.28));
        else if (pick < 0.5) inst.place('barrel', px, 0.45, pz, rng.range(0, 6.28), 1, rng.range(-0.05, 0.05));
        else if (pick < 0.7) inst.place('cinder', px, 0.1, pz, rng.range(0, 6.28), 1, 0, rng.range(-0.1, 0.1));
        else if (pick < 0.85) inst.place('tyre', px, 0.14, pz, rng.range(0, 6.28), 1, Math.PI / 2, 0);
        else inst.place('pallet', px, 0.08, pz, rng.range(0, 6.28));
      }
    }
  }
  // Loose tyres and drums along the sidewalks.
  for (let i = 0; i < 22; i++) {
    const side = rng.sign();
    const x = side * (plan.street.halfWidth + rng.range(0.3, 1.6));
    const z = rng.range(-70, 70);
    const pick = rng();
    if (pick < 0.4) inst.place('tyre', x, 0.14, z, rng.range(0, 6.28), 1, Math.PI / 2, 0);
    else if (pick < 0.7) inst.place('cinder', x, 0.1, z, rng.range(0, 6.28));
    else inst.place('drum', x, 0.29, z, rng.range(0, 6.28), 1, rng.range(-0.1, 0.1));
  }
}

// ---------------------------------------------------------------------------
// Wall services (AC units, drainpipes, dishes, signage)
// ---------------------------------------------------------------------------

function buildWallServices(env: Build, inst: Instancer, plan: LevelPlan): void {
  const rng = env.rng;
  for (const spec of plan.buildings) {
    const faceX = spec.facing === 'E' ? spec.cx + spec.w / 2 : spec.cx - spec.w / 2;
    const out = spec.facing === 'E' ? 1 : -1;
    const H = spec.floors * spec.floorHeight;
    // AC units on upper floors.
    for (let f = 1; f < spec.floors; f++) {
      if (!rng.chance(0.7)) continue;
      const z = spec.cz + rng.range(-spec.d / 2 + 2, spec.d / 2 - 2);
      inst.place('ac', faceX + out * 0.35, f * spec.floorHeight + 1.4, z, out > 0 ? 0 : Math.PI);
    }
    // Drainpipes down the corners.
    for (const zc of [spec.cz - spec.d / 2 + 0.5, spec.cz + spec.d / 2 - 0.5]) {
      const pipe = worldCylinder(0.06, 0.06, H, 8, env.uv('metal_rusted'));
      const mesh = new THREE.Mesh(placed(pipe, faceX + out * 0.14, H / 2, zc), env.mat('metal_rusted', { tint: 0x8a7a5a, key: 'drain' }));
      pipe.dispose();
      mesh.castShadow = true;
      tagSurface(mesh, 'metal');
      freeze(mesh);
      env.root.add(mesh);
      env.own(mesh.geometry);
    }
    // Satellite dish + sign on the facade.
    if (rng.chance(0.8)) inst.place('dish', faceX + out * 0.5, H - rng.range(1.5, 3), spec.cz + rng.range(-3, 3), out > 0 ? 0.6 : Math.PI - 0.6);
    if (rng.chance(0.7)) inst.place('sign', faceX + out * 0.12, spec.floorHeight - 0.4, spec.cz + rng.range(-spec.d / 4, spec.d / 4), out > 0 ? 0 : Math.PI);
  }
}

// ---------------------------------------------------------------------------
// Cables across the street
// ---------------------------------------------------------------------------

function buildCables(env: Build, plan: LevelPlan): void {
  const geos: THREE.BufferGeometry[] = [];
  const west = plan.buildings.filter((b) => b.facing === 'E');
  const east = plan.buildings.filter((b) => b.facing === 'W');
  const rng = env.rng;
  for (let i = 0; i < 7; i++) {
    const w = west[rng.int(0, west.length - 1)];
    const e = east[rng.int(0, east.length - 1)];
    const ax = w.cx + w.w / 2;
    const az = w.cz + rng.range(-w.d / 3, w.d / 3);
    const ay = w.floors * w.floorHeight - rng.range(0.5, 2);
    const bx = e.cx - e.w / 2;
    const bz = e.cz + rng.range(-e.d / 3, e.d / 3);
    const by = e.floors * e.floorHeight - rng.range(0.5, 2);
    if (Math.abs(az - bz) > 22) continue;
    geos.push(cableGeo(ax, ay, az, bx, by, bz, 1.4));
  }
  if (geos.length === 0) return;
  const mesh = new THREE.Mesh(mergeAll(geos), env.mat('metal_brushed', { tint: 0x15161a, key: 'cable' }));
  for (const g of geos) g.dispose();
  mesh.name = 'Cables';
  mesh.castShadow = true;
  tagSurface(mesh, 'metal');
  freeze(mesh);
  env.root.add(mesh);
  env.own(mesh.geometry);
}

function cableGeo(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  sag: number
): THREE.BufferGeometry {
  const seg = 10;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    const y = ay + (by - ay) * t - Math.sin(t * Math.PI) * sag;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, seg, 0.03, 5, false);
}

// ---------------------------------------------------------------------------
// Alley dressing (dumpsters, pipes, hanging laundry)
// ---------------------------------------------------------------------------

function buildAlleyDressing(env: Build, inst: Instancer, plan: LevelPlan): void {
  const rng = env.rng;
  // Dumpsters and pipes tucked against building sides in the gaps.
  const spots: [number, number, number][] = [
    [-9.5, 22, 0],
    [10, 26, Math.PI],
    [-32, -14, 0.4],
    [33, -20, -0.5],
  ];
  for (const [x, z, ry] of spots) {
    inst.place('dumpster', x, 0.6, z, ry);
    inst.place('crate', x + rng.range(-1, 1), 0.42, z + rng.range(1, 2), rng.range(0, 6));
    inst.place('barrel', x + rng.range(-1, 1), 0.45, z - rng.range(1, 2), rng.range(0, 6));
  }

  // Hanging laundry between the courtyard walls / alley.
  const clothMat = env.mat('fabric_camo', { key: 'laundry', rough: 0.95 });
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const x = plan.courtyard.minX + rng.range(2, plan.courtyard.maxX - plan.courtyard.minX - 2);
    const z = plan.courtyard.minZ + rng.range(1, plan.courtyard.maxZ - plan.courtyard.minZ - 1);
    const w = rng.range(0.4, 0.8);
    const h = rng.range(0.6, 1.1);
    const g = worldBox(w, h, 0.02, { uvScale: env.uv('fabric_camo') });
    geos.push(placed(g, x, rng.range(2.2, 3.2), z, rng.range(-0.3, 0.3)));
    g.dispose();
  }
  const mesh = new THREE.Mesh(mergeAll(geos), clothMat);
  for (const g of geos) g.dispose();
  mesh.name = 'Laundry';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  tagSurface(mesh, 'fabric');
  freeze(mesh);
  env.root.add(mesh);
  env.own(mesh.geometry);
}

// ---------------------------------------------------------------------------
// Foreground interest for the street / gameplay framings (near z ≈ 14–24)
// ---------------------------------------------------------------------------

function buildForeground(env: Build, inst: Instancer, plan: LevelPlan): void {
  const rng = env.rng;
  // Jersey barriers at the near frame edges give the empty foreground depth.
  inst.place('jersey', 4.6, 0, 22, Math.PI / 2 - 0.15);
  inst.place('jersey', -4.6, 0, 20.5, Math.PI / 2 + 0.2);
  inst.place('jersey', 3.4, 0, 15.5, 0.5);
  addLowCover(env, 4.6, 22, -1, 0);
  addLowCover(env, -4.6, 20.5, 1, 0);

  // A toppled / burnt-out market stall wreck near the south approach.
  const sx = -3.6;
  const sz = 17;
  const woodMat = env.mat('wood_plank', { tint: 0x5a4630, key: 'burntstall' });
  const woodGeos: THREE.BufferGeometry[] = [];
  const woodUv = env.uv('crate_wood');
  // Collapsed frame: leaning posts + fallen table top.
  for (const [px, pz, tilt] of [
    [-1.0, -0.6, 0.5],
    [1.0, -0.6, -0.3],
    [-1.0, 0.6, 0.2],
  ] as [number, number, number][]) {
    const g = chamferedBox(0.1, 2.0, 0.1, { chamfer: 0.015, uvScale: woodUv });
    woodGeos.push(placed(g, sx + px, 0.9, sz + pz, 0, tilt, 0));
    g.dispose();
  }
  const top = chamferedBox(2.6, 0.12, 1.6, { chamfer: 0.02, uvScale: woodUv });
  woodGeos.push(placed(top, sx, 0.35, sz + 0.4, 0.3, 0.4, 0.15));
  top.dispose();
  const stall = new THREE.Mesh(mergeAll(woodGeos), woodMat);
  for (const g of woodGeos) g.dispose();
  stall.name = 'BurntStall';
  stall.castShadow = true;
  stall.receiveShadow = true;
  tagSurface(stall, 'wood', true);
  freeze(stall);
  env.root.add(stall);
  env.own(stall.geometry);
  env.colliders.push(stall);
  // A charred awning slumped over it.
  const awn = env.mat('fabric_camo', { tint: 0x3a3630, rough: 0.98, key: 'burntawn' });
  const ag = worldBox(2.8, 0.04, 1.8, { uvScale: env.uv('fabric_camo') });
  const awnMesh = new THREE.Mesh(placed(ag, sx + 0.2, 0.9, sz - 0.2, 0.2, -0.5, 0.2), awn);
  ag.dispose();
  awnMesh.castShadow = true;
  tagSurface(awnMesh, 'fabric');
  freeze(awnMesh);
  env.root.add(awnMesh);
  env.own(awnMesh.geometry);

  // Debris cluster around it.
  for (let i = 0; i < 6; i++) {
    const pick = rng();
    const px = sx + rng.range(-2, 2.5);
    const pz = sz + rng.range(-1.5, 2);
    if (pick < 0.4) inst.place('crate', px, 0.42, pz, rng.range(0, 6.28), 1, rng.range(-0.2, 0.2), rng.range(-0.2, 0.2));
    else if (pick < 0.7) inst.place('tyre', px, 0.14, pz, rng.range(0, 6.28), 1, Math.PI / 2, 0);
    else inst.place('drum', px, 0.29, pz, rng.range(0, 6.28), 1, rng.range(-0.3, 0.3), 0);
  }
  void plan;
}

// ---------------------------------------------------------------------------
// Roof-top laundry lines (break the parapet silhouette in the overview)
// ---------------------------------------------------------------------------

function buildRoofLaundry(env: Build, plan: LevelPlan): void {
  const rng = env.rng;
  const lineGeos: THREE.BufferGeometry[] = [];
  const clothGeos: THREE.BufferGeometry[] = [];
  const clothMat = env.mat('fabric_camo', { key: 'rooflaundry', rough: 0.96 });
  for (const spec of plan.buildings) {
    if (spec.floors < 2 || rng.chance(0.4)) continue;
    const H = spec.floors * spec.floorHeight;
    const y = H + 0.3 + spec.parapetHeight + 1.2;
    const x0 = spec.cx - spec.w / 2 + 2;
    const x1 = spec.cx + spec.w / 2 - 2;
    const z = spec.cz + rng.range(-spec.d / 3, spec.d / 3);
    lineGeos.push(cableGeo(x0, y, z, x1, y, z, 0.5));
    const n = Math.round((x1 - x0) / 1.4);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const cx = x0 + (x1 - x0) * t;
      const cw = rng.range(0.5, 0.9);
      const ch = rng.range(0.7, 1.3);
      const g = worldBox(cw, ch, 0.02, { uvScale: env.uv('fabric_camo') });
      clothGeos.push(placed(g, cx, y - 0.1 - ch / 2 + Math.sin(t * Math.PI) * 0.12, z, rng.range(-0.2, 0.2)));
      g.dispose();
    }
  }
  if (lineGeos.length > 0) {
    const lines = new THREE.Mesh(mergeAll(lineGeos), env.mat('metal_brushed', { tint: 0x1a1a1e, key: 'rooflines' }));
    for (const g of lineGeos) g.dispose();
    lines.name = 'RoofLines';
    lines.castShadow = true;
    tagSurface(lines, 'metal');
    freeze(lines);
    env.root.add(lines);
    env.own(lines.geometry);
  }
  if (clothGeos.length > 0) {
    const cloth = new THREE.Mesh(mergeAll(clothGeos), clothMat);
    for (const g of clothGeos) g.dispose();
    cloth.name = 'RoofLaundry';
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    tagSurface(cloth, 'fabric');
    freeze(cloth);
    env.root.add(cloth);
    env.own(cloth.geometry);
  }
}

// ---------------------------------------------------------------------------
// Prop geometry factories
// ---------------------------------------------------------------------------

function aerialGeo(uv: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const mast = worldCylinder(0.02, 0.03, 2.6, 5, uv);
  parts.push(placed(mast, 0, 1.3, 0));
  mast.dispose();
  // Cross elements (TV antenna rungs).
  for (const [y, len] of [
    [2.4, 0.9],
    [2.1, 0.7],
    [1.85, 0.55],
  ] as [number, number][]) {
    const bar = worldCylinder(0.012, 0.012, len, 4, uv);
    parts.push(placed(bar, 0, y, 0, 0, 0, Math.PI / 2));
    bar.dispose();
  }
  return mergeAll(parts);
}

function palletGeo(uv: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const g = worldBox(1.1, 0.04, 0.12, { uvScale: uv });
    parts.push(placed(g, 0, 0.12, -0.5 + i * 0.25));
    g.dispose();
  }
  for (const bx of [-0.5, 0, 0.5]) {
    const g = worldBox(0.12, 0.12, 1.1, { uvScale: uv });
    parts.push(placed(g, bx, 0.06, 0));
    g.dispose();
  }
  return mergeAll(parts);
}

function sandbagGeo(uv: number): THREE.BufferGeometry {
  return chamferedBox(0.5, 0.22, 0.3, { chamfer: 0.09, uvScale: uv });
}

function jerseyGeo(uv: number): THREE.BufferGeometry {
  // Proper New-Jersey barrier cross-section: wide splayed foot, steep lower
  // batter, near-vertical upper, extruded along Z.
  const shape = new THREE.Shape();
  shape.moveTo(-0.42, 0);
  shape.lineTo(0.42, 0);
  shape.lineTo(0.3, 0.13);
  shape.lineTo(0.12, 0.33);
  shape.lineTo(0.1, 0.9);
  shape.lineTo(-0.1, 0.9);
  shape.lineTo(-0.12, 0.33);
  shape.lineTo(-0.3, 0.13);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 });
  geo.translate(0, 0, -0.5);
  scaleUv(geo, uv);
  return geo;
}

function acUnitGeo(uv: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = chamferedBox(0.7, 0.5, 0.4, { chamfer: 0.03, uvScale: uv });
  parts.push(body);
  const brA = worldBox(0.05, 0.1, 0.3, { uvScale: uv });
  parts.push(placed(brA, -0.3, -0.3, 0));
  brA.dispose();
  const brB = worldBox(0.05, 0.1, 0.3, { uvScale: uv });
  parts.push(placed(brB, 0.3, -0.3, 0));
  brB.dispose();
  return mergeAll(parts);
}

function dishGeo(uv: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const mount = worldCylinder(0.03, 0.03, 0.5, 6, uv);
  parts.push(placed(mount, 0, 0, 0, 0, 0, Math.PI / 2));
  mount.dispose();
  const dish = new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 3);
  scaleUv(dish, uv);
  parts.push(placed(dish, 0.3, 0, 0, 0, 0, -Math.PI / 2 + 0.5));
  dish.dispose();
  return mergeAll(parts);
}

function dumpsterGeo(uv: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = chamferedBox(2.0, 1.2, 1.1, { chamfer: 0.04, uvScale: uv });
  parts.push(body);
  const lidA = chamferedBox(1.0, 0.06, 1.1, { chamfer: 0.02, uvScale: uv });
  parts.push(placed(lidA, -0.5, 0.63, 0, 0, -0.12, 0));
  lidA.dispose();
  const lidB = chamferedBox(1.0, 0.06, 1.1, { chamfer: 0.02, uvScale: uv });
  parts.push(placed(lidB, 0.5, 0.63, 0, 0, 0.12, 0));
  lidB.dispose();
  return mergeAll(parts);
}

function scaleUv(g: THREE.BufferGeometry, uv: number): void {
  const a = g.getAttribute('uv');
  if (!a) return;
  for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) / uv, a.getY(i) / uv);
  a.needsUpdate = true;
}

function addLowCover(env: Build, x: number, z: number, nx: number, nz: number): void {
  env.covers.push({ pos: new THREE.Vector3(x, 0, z), normal: new THREE.Vector3(nx, 0, nz), low: true });
}
