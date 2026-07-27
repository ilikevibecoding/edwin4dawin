/**
 * Detail.ts — vegetation, rubble fields and the courtyard.
 *
 * Palm trees are built as real geometry (a ridged tapering trunk plus a crown
 * of drooping fronds), dead scrub bushes and dry weeds sprout from wall bases
 * and road cracks, and rubble piles are assembled from dozens of small
 * chamfered chunks at varied rotations. Everything numerous is an
 * `InstancedMesh` with per-instance rotation/scale jitter, so nothing reads as
 * a repeating stamp. The dry fountain and low perimeter wall of the courtyard
 * live here too, next to the palms that shade it.
 */

import * as THREE from 'three';
import type { Rng } from '../core/MathX';
import type { SurfaceType } from '../core/Contracts';
import type { Build, LevelPlan } from './Blockout';
import { chamferedBox, worldCylinder, worldBox, placed, mergeAll, tagSurface, freeze } from './GeometryKit';

const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const Pv = new THREE.Vector3();
const Sv = new THREE.Vector3();

export function buildDetail(env: Build, plan: LevelPlan): void {
  buildCourtyard(env, plan);
  buildPalms(env, plan);
  buildRubblePiles(env, plan);
  buildBushes(env, plan);
  buildWeeds(env, plan);
}

// ---------------------------------------------------------------------------

function makeInstanced(
  env: Build,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  matrices: THREE.Matrix4[],
  surface: SurfaceType,
  opts: { collider?: boolean; cast?: boolean; recv?: boolean; name?: string } = {}
): void {
  if (matrices.length === 0) {
    geo.dispose();
    return;
  }
  env.own(geo);
  const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
  inst.name = opts.name ?? 'detail';
  for (let i = 0; i < matrices.length; i++) inst.setMatrixAt(i, matrices[i]);
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = opts.cast ?? true;
  inst.receiveShadow = opts.recv ?? true;
  inst.matrixAutoUpdate = false;
  inst.updateMatrix();
  tagSurface(inst, surface, opts.collider ?? false);
  env.root.add(inst);
  if (opts.collider) env.colliders.push(inst);
}

function mat4(x: number, y: number, z: number, ry: number, scale: number, rx = 0, rz = 0): THREE.Matrix4 {
  E.set(rx, ry, rz, 'YXZ');
  Q.setFromEuler(E);
  Pv.set(x, y, z);
  Sv.set(scale, scale, scale);
  return new THREE.Matrix4().compose(Pv, Q, Sv);
}

// ---------------------------------------------------------------------------
// Courtyard: low perimeter wall + dry fountain
// ---------------------------------------------------------------------------

function buildCourtyard(env: Build, plan: LevelPlan): void {
  const z = plan.courtyard;
  const uv = env.uv('wall_plaster');
  const mat = env.mat('plaster_painted', { tint: 0xcbbd9c, key: 'court_wall' });
  const geos: THREE.BufferGeometry[] = [];
  const wallH = 0.85;
  const t = 0.3;
  const cx = (z.minX + z.maxX) / 2;
  const cz = (z.minZ + z.maxZ) / 2;
  const w = z.maxX - z.minX;
  const d = z.maxZ - z.minZ;
  // Perimeter wall with a gap toward the street (east side, +X open).
  addWallRun(geos, z.minX, z.minZ, z.maxX, z.minZ, wallH, t, uv); // north
  addWallRun(geos, z.minX, z.maxZ, z.maxX, z.maxZ, wallH, t, uv); // south
  addWallRun(geos, z.minX, z.minZ, z.minX, z.maxZ, wallH, t, uv); // west
  // East wall only partial (entrance gap in the middle).
  addWallRun(geos, z.maxX, z.minZ, z.maxX, cz - 2.2, wallH, t, uv);
  addWallRun(geos, z.maxX, cz + 2.2, z.maxX, z.maxZ, wallH, t, uv);
  const wallMesh = new THREE.Mesh(mergeAll(geos), mat);
  for (const g of geos) g.dispose();
  wallMesh.name = 'CourtyardWall';
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  tagSurface(wallMesh, 'concrete', true);
  freeze(wallMesh);
  env.root.add(wallMesh);
  env.own(wallMesh.geometry);
  env.colliders.push(wallMesh);
  // Cover along the courtyard wall.
  env.covers.push({ pos: new THREE.Vector3(z.maxX - 0.6, 0, cz - 4), normal: new THREE.Vector3(1, 0, 0), low: true });
  env.covers.push({ pos: new THREE.Vector3(cx, 0, z.minZ + 0.6), normal: new THREE.Vector3(0, 0, -1), low: true });

  // Dry fountain: octagonal basin ring, empty (dry cracked dirt inside).
  const fGeos: THREE.BufferGeometry[] = [];
  const fMat = env.mat('concrete_cast', { tint: 0xb8ad97, key: 'fountain' });
  const ringR = 2.0;
  const sides = 8;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const mx = (Math.cos(a0) + Math.cos(a1)) / 2 * ringR;
    const mz = (Math.sin(a0) + Math.sin(a1)) / 2 * ringR;
    const segLen = Math.hypot(Math.cos(a1) - Math.cos(a0), Math.sin(a1) - Math.sin(a0)) * ringR + 0.1;
    const g = chamferedBox(0.3, 0.6, segLen, { chamfer: 0.04, uvScale: uv });
    fGeos.push(placed(g, cx + mx, 0.3, cz + mz, (a0 + a1) / 2 + Math.PI / 2));
    g.dispose();
  }
  // Central plinth.
  const plinth = worldCylinder(0.35, 0.5, 0.7, 10, uv);
  fGeos.push(placed(plinth, cx, 0.35, cz));
  plinth.dispose();
  const fountain = new THREE.Mesh(mergeAll(fGeos), fMat);
  for (const g of fGeos) g.dispose();
  fountain.name = 'Fountain';
  fountain.castShadow = true;
  fountain.receiveShadow = true;
  tagSurface(fountain, 'concrete', true);
  freeze(fountain);
  env.root.add(fountain);
  env.own(fountain.geometry);
  env.colliders.push(fountain);
}

function addWallRun(
  geos: THREE.BufferGeometry[],
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  h: number,
  t: number,
  uv: number
): void {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 0.1) return;
  const ang = Math.atan2(dz, dx);
  const g = chamferedBox(len, h, t, { chamfer: 0.04, uvScale: uv });
  geos.push(placed(g, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, ang));
  g.dispose();
}

// ---------------------------------------------------------------------------
// Palm trees
// ---------------------------------------------------------------------------

function buildPalms(env: Build, plan: LevelPlan): void {
  const rng = env.rng;
  const trunkGeo = palmTrunkGeo(env);
  const crownGeo = palmCrownGeo(env, rng);
  const trunkMat = env.mat('wood_plank', { tint: 0x6a5334, rough: 1, key: 'palm_trunk' });
  const crownMat = env.mat('fabric_camo', { tint: 0x51612b, rough: 1, key: 'palm_frond' });

  const spots: [number, number][] = [];
  // Courtyard palms around the fountain.
  const z = plan.courtyard;
  const cx = (z.minX + z.maxX) / 2;
  const cz = (z.minZ + z.maxZ) / 2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    spots.push([cx + Math.cos(a) * 4.5, cz + Math.sin(a) * 3.2]);
  }
  // Extra palms in the SW of the courtyard for the overview/golden foreground.
  spots.push([z.minX + 5, z.minZ + 6]);
  spots.push([z.minX + 9, z.minZ + 4]);
  spots.push([z.minX + 3, z.minZ + 11]);
  // A couple lining the market and street.
  spots.push([plan.market.maxX - 2, plan.market.minZ + 4]);
  spots.push([plan.market.minX + 1.5, plan.market.maxZ - 3]);
  spots.push([-9.2, 46]);
  spots.push([9.2, -30]);

  const trunkM: THREE.Matrix4[] = [];
  const crownM: THREE.Matrix4[] = [];
  for (const [x, zc] of spots) {
    const s = rng.range(0.85, 1.2);
    const ry = rng.range(0, Math.PI * 2);
    const lean = rng.range(-0.05, 0.05);
    trunkM.push(mat4(x, 0, zc, ry, s, lean, lean));
    crownM.push(mat4(x + lean * 5 * s, 5.0 * s, zc + lean * 5 * s, ry, s, lean, lean));
  }
  makeInstanced(env, trunkGeo, trunkMat, trunkM, 'wood', { collider: true, name: 'palm_trunks' });
  makeInstanced(env, crownGeo, crownMat, crownM, 'fabric', { collider: false, cast: true, name: 'palm_crowns' });
}

function palmTrunkGeo(env: Build): THREE.BufferGeometry {
  const uv = env.uv('crate_wood');
  const parts: THREE.BufferGeometry[] = [];
  const segs = 6;
  const totalH = 5.0;
  for (let i = 0; i < segs; i++) {
    const y = (i + 0.5) * (totalH / segs);
    const r = 0.24 - (i / segs) * 0.09;
    const seg = worldCylinder(r * 0.92, r, totalH / segs + 0.02, 9, uv);
    const bend = Math.sin((i / segs) * 1.2) * 0.12;
    parts.push(placed(seg, bend, y, 0));
    seg.dispose();
    // Ring ridge.
    const ring = worldCylinder(r + 0.03, r + 0.03, 0.06, 9, uv);
    parts.push(placed(ring, bend, y + totalH / segs / 2, 0));
    ring.dispose();
  }
  return mergeAll(parts);
}

function palmCrownGeo(env: Build, rng: Rng): THREE.BufferGeometry {
  const uv = env.uv('fabric_camo');
  const parts: THREE.BufferGeometry[] = [];
  // Two tiers: a lower ring of long drooping fronds and an upper ring of
  // shorter, more upright ones — reads much fuller than a single fan.
  const lower = 10;
  for (let i = 0; i < lower; i++) {
    const around = (i / lower) * Math.PI * 2 + rng.range(-0.12, 0.12);
    parts.push(frondGeo(around, rng.range(2.5, 3.1), 0.35, 0.9, uv));
  }
  const upper = 7;
  for (let i = 0; i < upper; i++) {
    const around = (i / upper) * Math.PI * 2 + 0.4 + rng.range(-0.12, 0.12);
    parts.push(frondGeo(around, rng.range(1.7, 2.2), 0.75, 0.55, uv));
  }
  // Coconut cluster + crown boot.
  const nut = worldCylinder(0.22, 0.16, 0.35, 7, uv);
  parts.push(placed(nut, 0, -0.05, 0));
  nut.dispose();
  return mergeAll(parts);
}

/** A single frond: arches up off the crown then droops, tapering to a point. */
function frondGeo(around: number, length: number, rise: number, taper: number, uv: number): THREE.BufferGeometry {
  const segs = 6;
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const ca = Math.cos(around);
  const sa = Math.sin(around);
  const pts: [number, number, number][] = [];
  const halfW: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const out = t * length;
    // Rise for the first third, then droop under gravity toward the tip.
    const y = Math.sin(t * Math.PI * 0.55) * rise - t * t * length * 0.42;
    pts.push([ca * out, y, sa * out]);
    halfW.push((1 - t * taper) * 0.26 + 0.015);
  }
  // Perpendicular (in XZ) direction for width.
  const px = -sa;
  const pz = ca;
  for (let i = 0; i < segs; i++) {
    const [x0, y0, z0] = pts[i];
    const [x1, y1, z1] = pts[i + 1];
    const w0 = halfW[i];
    const w1 = halfW[i + 1];
    const a: [number, number, number] = [x0 + px * w0, y0, z0 + pz * w0];
    const b: [number, number, number] = [x0 - px * w0, y0, z0 - pz * w0];
    const c: [number, number, number] = [x1 + px * w1, y1, z1 + pz * w1];
    const dd: [number, number, number] = [x1 - px * w1, y1, z1 - pz * w1];
    pushQuad(pos, nor, uvs, a, b, dd, c, uv);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Rubble piles
// ---------------------------------------------------------------------------

function buildRubblePiles(env: Build, plan: LevelPlan): void {
  const rng = env.rng;
  const uv = env.uv('debris');
  const chunk = chamferedBox(0.45, 0.35, 0.5, { chamfer: 0.05, uvScale: uv });
  const mat = env.mat('rubble', { tint: 0x9c9184, key: 'rubble' });
  const matrices: THREE.Matrix4[] = [];

  const piles: [number, number, number][] = [];
  // Piles at shelled building bases.
  for (const b of plan.buildings) {
    if (!b.damage) continue;
    const side = b.damage.side;
    const fx = side === 'E' ? b.cx + b.w / 2 : side === 'W' ? b.cx - b.w / 2 : b.cx;
    const fz = side === 'S' ? b.cz + b.d / 2 : side === 'N' ? b.cz - b.d / 2 : b.cz;
    piles.push([fx + Math.sign(fx || 1) * 0.6, fz, 1.6 + b.damage.severity * 1.4]);
    // Front (street-facing) spill for combat-zone buildings — spilling out onto
    // the sidewalk and into the gutter, piling against the wall base.
    if (b.cz < 34) {
      const ffx = b.facing === 'E' ? b.cx + b.w / 2 : b.cx - b.w / 2;
      const out = b.facing === 'E' ? 1 : -1;
      const sev = b.damage.severity;
      // Two overlapping spills at different offsets so it reaches the road.
      piles.push([ffx + out * (1.0 + sev * 0.6), b.cz + rng.range(-b.d / 3, b.d / 3), 1.6 + sev * 1.4]);
      piles.push([ffx + out * (2.4 + sev * 1.6), b.cz + rng.range(-b.d / 4, b.d / 4), 1.2 + sev]);
    }
  }
  // Crater rim.
  const c = plan.crater;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    piles.push([c.x + Math.cos(a) * (c.radius + 0.6), c.z + Math.sin(a) * (c.radius + 0.6), 1.2]);
  }
  // A collapsed section mid-street + debris fields around the wrecks.
  piles.push([-4.5, -30, 1.6]);
  piles.push([5.5, 8, 1.3]);
  piles.push([4.4, 12, 1.5]); // around the foreground wreck
  piles.push([-3.6, 17, 1.3]); // around the toppled stall
  piles.push([3.0, -18, 1.4]); // around the overturned wreck
  // A shallow secondary blast scar in the road, radial rubble.
  piles.push([3.4, 20, 1.1]);
  // Courtyard SW debris (overview/golden foreground).
  piles.push([plan.courtyard.minX + 7, plan.courtyard.minZ + 8, 1.4]);

  for (const [px, pz, radius] of piles) {
    const n = Math.round(18 + radius * 12);
    for (let i = 0; i < n; i++) {
      const rr = Math.pow(rng(), 0.7) * radius;
      const a = rng.range(0, Math.PI * 2);
      const x = px + Math.cos(a) * rr;
      const z = pz + Math.sin(a) * rr;
      const heap = Math.max(0, 1 - rr / radius);
      const y = rng.range(0.05, 0.15) + heap * rng.range(0.2, 0.7);
      const s = rng.range(0.5, 1.5);
      matrices.push(mat4(x, y, z, rng.range(0, Math.PI * 2), s, rng.range(-0.5, 0.5), rng.range(-0.5, 0.5)));
    }
  }
  makeInstanced(env, chunk, mat, matrices, 'gravel', { collider: false, cast: true, recv: true, name: 'rubble' });

  // Loose bricks scattered more sparsely.
  const brick = chamferedBox(0.22, 0.1, 0.11, { chamfer: 0.015, uvScale: env.uv('brick_clay') });
  const brickMat = env.mat('brick_clay', { tint: 0x8f8069, key: 'loosebrick' });
  const brickM: THREE.Matrix4[] = [];
  for (const [px, pz, radius] of piles) {
    for (let i = 0; i < 10; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = rng.range(0.3, radius + 1.2);
      brickM.push(
        mat4(px + Math.cos(a) * rr, rng.range(0.05, 0.12), pz + Math.sin(a) * rr, rng.range(0, Math.PI * 2), rng.range(0.8, 1.3), rng.range(-0.2, 0.2), rng.range(-0.2, 0.2))
      );
    }
  }
  makeInstanced(env, brick, brickMat, brickM, 'concrete', { collider: false, cast: true, name: 'bricks' });
}

// ---------------------------------------------------------------------------
// Dead bushes + weeds
// ---------------------------------------------------------------------------

function buildBushes(env: Build, plan: LevelPlan): void {
  const rng = env.rng;
  const geo = bushGeo(env);
  const mat = env.mat('fabric_camo', { tint: 0x7a6a3a, rough: 1, key: 'bush' });
  const matrices: THREE.Matrix4[] = [];
  for (let i = 0; i < 40; i++) {
    const x = rng.range(plan.bounds.min.x + 8, plan.bounds.max.x - 8);
    const z = rng.range(plan.bounds.min.z + 8, plan.bounds.max.z - 8);
    // Avoid the road centre.
    if (Math.abs(x) < 7 && z > -75 && z < 78) continue;
    matrices.push(mat4(x, 0, z, rng.range(0, Math.PI * 2), rng.range(0.6, 1.3)));
  }
  makeInstanced(env, geo, mat, matrices, 'fabric', { collider: false, cast: true, name: 'bushes' });
}

function bushGeo(env: Build): THREE.BufferGeometry {
  const uv = env.uv('fabric_camo');
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI;
    const blade = worldBox(0.05, 0.7, 0.5, { uvScale: uv });
    parts.push(placed(blade, 0, 0.35, 0, a, 0, 0));
    blade.dispose();
  }
  return mergeAll(parts);
}

function buildWeeds(env: Build, plan: LevelPlan): void {
  const rng = env.rng;
  const geo = weedGeo(env);
  const mat = env.mat('fabric_camo', { tint: 0x8a7c3e, rough: 1, key: 'weed' });
  const matrices: THREE.Matrix4[] = [];
  // Weeds at wall bases.
  for (const b of plan.buildings) {
    const faceX = b.facing === 'E' ? b.cx + b.w / 2 : b.cx - b.w / 2;
    const out = b.facing === 'E' ? 1 : -1;
    for (let i = 0; i < 14; i++) {
      const z = b.cz - b.d / 2 + rng.range(0, b.d);
      matrices.push(mat4(faceX + out * rng.range(0.15, 0.6), 0, z, rng.range(0, Math.PI * 2), rng.range(0.5, 1.1)));
    }
  }
  // Weeds sprouting in road cracks near the crater and curbs.
  for (let i = 0; i < 40; i++) {
    const side = rng.sign();
    const x = side * (plan.street.halfWidth - rng.range(0, 0.5));
    const z = rng.range(-72, 76);
    matrices.push(mat4(x, 0, z, rng.range(0, Math.PI * 2), rng.range(0.4, 0.9)));
  }
  makeInstanced(env, geo, mat, matrices, 'fabric', { collider: false, cast: false, recv: false, name: 'weeds' });
}

function weedGeo(env: Build): THREE.BufferGeometry {
  const uv = env.uv('fabric_camo');
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    const blade = worldBox(0.02, 0.35, 0.25, { uvScale: uv });
    parts.push(placed(blade, 0, 0.17, 0, a, 0.1, 0));
    blade.dispose();
  }
  return mergeAll(parts);
}

// ---------------------------------------------------------------------------

function pushQuad(
  pos: number[],
  nor: number[],
  uv: number[],
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  d: [number, number, number],
  s: number
): void {
  for (const [p, u, v] of [
    [a, 0, 0],
    [b, 1, 0],
    [c, 1, 1],
    [a, 0, 0],
    [c, 1, 1],
    [d, 0, 1],
  ] as [[number, number, number], number, number][]) {
    pos.push(p[0], p[1], p[2]);
    nor.push(0, 1, 0);
    uv.push(u * (0.4 / s) * 10, v * (0.4 / s) * 10);
  }
}
