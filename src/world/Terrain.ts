/**
 * Terrain.ts — the ground the city sits on.
 *
 * A gently undulating desert pad (dunes only outside the city core so building
 * footings stay flat), the asphalt main street with raised concrete sidewalks
 * and curbs, gravel/dirt patches for the market and courtyard, and the blast
 * crater bowl punched through the road.
 *
 * Ground height is exposed through a cached 1 m heightfield grid so
 * `sampleGround` never has to raycast. Collision uses two big flat proxy planes
 * (sand + road) rather than the subdivided visual mesh, to keep per-bullet
 * raycasts cheap.
 */

import * as THREE from 'three';
import type { Build, LevelPlan } from './Blockout';
import { worldPlane, worldBox, tagSurface, freeze, mergeAll, placed, chamferedBox } from './GeometryKit';

const CORE_HALF_X = 40;
const CORE_MIN_Z = -74;
const CORE_MAX_Z = 78;
const DUNE_RAMP = 26;

export class Terrain {
  private plan: LevelPlan;
  private grid: Float32Array;
  private gridN: number;
  private gridStep: number;
  private originX: number;
  private originZ: number;

  constructor(plan: LevelPlan) {
    this.plan = plan;
    const size = plan.ground.size;
    this.gridStep = 1;
    this.gridN = Math.floor(size / this.gridStep) + 1;
    this.originX = -size / 2;
    this.originZ = -size / 2;
    this.grid = new Float32Array(this.gridN * this.gridN);
    for (let j = 0; j < this.gridN; j++) {
      const z = this.originZ + j * this.gridStep;
      for (let i = 0; i < this.gridN; i++) {
        const x = this.originX + i * this.gridStep;
        this.grid[j * this.gridN + i] = this.heightAt(x, z);
      }
    }
  }

  /** Analytic ground height — dunes outside the core, crater bowl in the road. */
  heightAt(x: number, z: number): number {
    let dune =
      0.62 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.037 - 0.6) +
      0.34 * Math.sin(x * 0.091 - 2.1) * Math.cos(z * 0.08 + 1.7) +
      0.2 * Math.sin((x + z) * 0.11);
    const dx = Math.max(0, Math.abs(x) - CORE_HALF_X);
    const dz = Math.max(0, z < CORE_MIN_Z ? CORE_MIN_Z - z : z > CORE_MAX_Z ? z - CORE_MAX_Z : 0);
    const edge = smooth01(Math.max(dx, dz) / DUNE_RAMP);
    dune *= edge;

    const c = this.plan.crater;
    const r = Math.hypot(x - c.x, z - c.z);
    let crater = 0;
    if (r < c.radius * 1.15) {
      const t = r / c.radius;
      if (t < 1) crater -= c.depth * (1 - t * t);
      // Raised rubble rim just outside the lip.
      const rim = Math.exp(-((t - 1.0) * (t - 1.0)) / 0.02) * 0.28;
      crater += rim;
    }
    return dune + crater;
  }

  /** Cached bilinear sample. Returns null outside the map bounds. */
  sample(x: number, z: number): number | null {
    const b = this.plan.bounds;
    if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) return null;
    const fx = (x - this.originX) / this.gridStep;
    const fz = (z - this.originZ) / this.gridStep;
    const i0 = Math.max(0, Math.min(this.gridN - 2, Math.floor(fx)));
    const j0 = Math.max(0, Math.min(this.gridN - 2, Math.floor(fz)));
    const tx = fx - i0;
    const tz = fz - j0;
    const g = this.grid;
    const n = this.gridN;
    const a = g[j0 * n + i0];
    const bb = g[j0 * n + i0 + 1];
    const cc = g[(j0 + 1) * n + i0];
    const dd = g[(j0 + 1) * n + i0 + 1];
    return (a + (bb - a) * tx) * (1 - tz) + (cc + (dd - cc) * tx) * tz;
  }

  build(env: Build): void {
    this.buildDesert(env);
    this.buildStreet(env);
    this.buildCrater(env);
    this.buildRoadDressing(env);
    this.buildColliders(env);
  }

  // -------------------------------------------------------------------------

  private buildDesert(env: Build): void {
    const size = this.plan.ground.size;
    const seg = 72;
    const uvS = env.uv('ground_sand');
    const geo = displacedGrid(size, seg, uvS, (x, z) => this.heightAt(x, z));
    env.own(geo);
    const mat = env.mat('sand_dune', { key: 'desert' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'Desert';
    mesh.receiveShadow = true;
    tagSurface(mesh, 'sand');
    freeze(mesh);
    env.root.add(mesh);
  }

  private buildStreet(env: Build): void {
    const { street } = this.plan;
    const parts: THREE.BufferGeometry[] = [];
    const roadUv = env.uv('road');
    const roadLen = street.maxZ - street.minZ;
    const roadGeo = worldPlane(street.halfWidth * 2, roadLen, roadUv, [0, 0]);
    parts.push(placed(roadGeo, 0, 0.03, (street.minZ + street.maxZ) / 2));

    // Merge road as one mesh.
    const road = new THREE.Mesh(mergeAll(parts), env.mat('asphalt', { key: 'road' }));
    road.name = 'Road';
    road.receiveShadow = true;
    tagSurface(road, 'concrete');
    freeze(road);
    env.root.add(road);
    env.own(road.geometry);
    roadGeo.dispose();

    // Sidewalks + curbs both sides.
    const swUv = env.uv('wall_concrete');
    const swParts: THREE.BufferGeometry[] = [];
    const curbParts: THREE.BufferGeometry[] = [];
    const swW = street.sidewalkWidth;
    const innerX = street.halfWidth;
    for (const side of [-1, 1]) {
      const cxSw = side * (innerX + swW / 2);
      swParts.push(placed(worldPlane(swW, roadLen, swUv), cxSw, 0.16, (street.minZ + street.maxZ) / 2));
      // Curb: thin chamfered strip at the road edge.
      const curb = chamferedBox(0.28, 0.34, roadLen, { chamfer: 0.05, uvScale: swUv });
      curbParts.push(placed(curb, side * (innerX + 0.14), 0.17, (street.minZ + street.maxZ) / 2));
      curb.dispose();
    }
    const sidewalk = new THREE.Mesh(mergeAll(swParts), env.mat('concrete_rough', { key: 'sidewalk' }));
    sidewalk.name = 'Sidewalks';
    sidewalk.receiveShadow = true;
    tagSurface(sidewalk, 'concrete');
    freeze(sidewalk);
    env.root.add(sidewalk);
    env.own(sidewalk.geometry);

    const curbs = new THREE.Mesh(mergeAll(curbParts), env.mat('concrete_cast', { key: 'curb', tint: 0xbfb6a4 }));
    curbs.name = 'Curbs';
    curbs.castShadow = true;
    curbs.receiveShadow = true;
    tagSurface(curbs, 'concrete', true);
    freeze(curbs);
    env.root.add(curbs);
    env.colliders.push(curbs);
    env.own(curbs.geometry);

    // Gravel patch for the market, dirt for the courtyard.
    this.buildPatch(env, this.plan.market, 'ground_gravel', 'gravel', 0.04, 'market');
    this.buildPatch(env, this.plan.courtyard, 'ground_dirt', 'dirt', 0.04, 'court');
  }

  private buildPatch(
    env: Build,
    z: LevelPlan['market'],
    kind: string,
    surf: 'gravel' | 'dirt',
    y: number,
    key: string
  ): void {
    const w = z.maxX - z.minX;
    const d = z.maxZ - z.minZ;
    const geo = worldPlane(w, d, env.uv(kind));
    const mesh = new THREE.Mesh(placed(geo, (z.minX + z.maxX) / 2, y, (z.minZ + z.maxZ) / 2), env.mat(kind, { key }));
    geo.dispose();
    mesh.name = `Patch_${key}`;
    mesh.receiveShadow = true;
    tagSurface(mesh, surf);
    freeze(mesh);
    env.root.add(mesh);
    env.own(mesh.geometry);
  }

  private buildCrater(env: Build): void {
    const c = this.plan.crater;
    const rings = 5;
    const spokes = 28;
    const pos: number[] = [];
    const nor: number[] = [];
    const uv: number[] = [];
    const uvS = env.uv('debris');
    const profile = (t: number) => {
      // t: 0 centre .. 1 lip; matches heightAt bowl.
      const r = t * c.radius;
      if (t < 1) return -c.depth * (1 - t * t);
      return 0;
    };
    const ringR: number[] = [];
    for (let ri = 0; ri <= rings; ri++) ringR.push((ri / rings) * c.radius);
    const at = (ri: number, si: number): [number, number, number] => {
      const r = ringR[ri];
      const a = (si / spokes) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return [x, profile(r / c.radius) + 0.02, z];
    };
    for (let ri = 0; ri < rings; ri++) {
      for (let si = 0; si < spokes; si++) {
        const a = at(ri, si);
        const b = at(ri, si + 1);
        const cc = at(ri + 1, si);
        const dd = at(ri + 1, si + 1);
        pushTri(pos, nor, uv, a, cc, b, uvS);
        pushTri(pos, nor, uv, b, cc, dd, uvS);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(placed(geo, c.x, 0, c.z), env.mat('rubble', { key: 'crater', tint: 0x8a7e6e }));
    geo.dispose();
    mesh.name = 'Crater';
    mesh.receiveShadow = true;
    tagSurface(mesh, 'dirt');
    freeze(mesh);
    env.root.add(mesh);
    env.own(mesh.geometry);
  }

  /**
   * Surface storytelling on the otherwise-featureless asphalt slab: sand drifted
   * against every kerb and wall base (the cheapest, strongest desert cue), faded
   * broken road markings, oil pools and patched repairs. All geometry, merged
   * into four extra draw calls.
   */
  private buildRoadDressing(env: Build): void {
    const rng = env.rng;
    const { street } = this.plan;
    const uvSand = env.uv('ground_sand');
    const sandGeos: THREE.BufferGeometry[] = [];
    const paintGeos: THREE.BufferGeometry[] = [];
    const oilGeos: THREE.BufferGeometry[] = [];
    const patchGeos: THREE.BufferGeometry[] = [];

    // --- Sand drifts hugging both kerbs, with tongues spilling onto the road --
    for (const side of [-1, 1]) {
      const gutterX = side * (street.halfWidth - 0.55);
      let z = street.minZ + 2;
      while (z < street.maxZ - 2) {
        const len = rng.range(3.5, 7);
        const width = rng.range(0.8, 1.7);
        const h = rng.range(0.08, 0.22);
        const w = sandWedge(len, width, h, side, uvSand);
        sandGeos.push(placed(w, gutterX + side * (width / 2 - 0.5), 0.03, z + len / 2, rng.range(-0.03, 0.03)));
        w.dispose();
        // Occasional tongue of sand fanning further onto the road.
        if (rng.chance(0.4)) {
          const t = chamferedBox(rng.range(1.2, 2.6), 0.06, rng.range(0.8, 1.8), { chamfer: 0.03, uvScale: uvSand });
          sandGeos.push(placed(t, gutterX - side * rng.range(0.8, 2.2), 0.055, z + rng.range(0, len), rng.range(0, Math.PI)));
          t.dispose();
        }
        z += len + rng.range(0.4, 2.5);
      }
    }

    // --- Sand pooled at the street-facing wall bases -------------------------
    for (const b of this.plan.buildings) {
      const faceX = b.facing === 'E' ? b.cx + b.w / 2 : b.cx - b.w / 2;
      const out = b.facing === 'E' ? 1 : -1;
      const n = Math.round(b.d / 3);
      for (let i = 0; i < n; i++) {
        const z = b.cz - b.d / 2 + b.d * ((i + 0.5) / n) + rng.range(-1, 1);
        const width = rng.range(0.7, 1.6);
        const w = sandWedge(rng.range(2, 4), width, rng.range(0.1, 0.28), -out, uvSand);
        sandGeos.push(placed(w, faceX + out * (width / 2 + 0.1), 0.02, z, 0));
        w.dispose();
      }
    }

    // --- Faded, broken centre line -------------------------------------------
    let mz = street.minZ + 4;
    while (mz < street.maxZ - 4) {
      const dash = rng.range(1.6, 3.2);
      // Skip dashes over the crater / near the checkpoint for a worn look.
      const nearCrater = Math.abs(mz - this.plan.crater.z) < this.plan.crater.radius + 2;
      if (!nearCrater && rng.chance(0.78)) {
        const g = worldBox(0.16, 0.02, dash, { uvScale: 1 });
        paintGeos.push(placed(g, rng.range(-0.2, 0.2), 0.05, mz + dash / 2));
        g.dispose();
      }
      mz += dash + rng.range(1.8, 3.5);
    }
    // A pedestrian crossing (worn stripes) just north of the checkpoint.
    for (let i = -3; i <= 3; i++) {
      if (rng.chance(0.25)) continue;
      const g = worldBox(0.55, 0.02, 2.6, { uvScale: 1 });
      paintGeos.push(placed(g, i * 1.15, 0.05, 8));
      g.dispose();
    }

    // --- Oil pools + patched repairs -----------------------------------------
    const oilSpots: [number, number][] = [
      [-2.4, -3.2],
      [2.2, -18.5],
      [0.6, 3],
      [-3.5, 12],
      [4, 22],
    ];
    for (const [x, z] of oilSpots) {
      const g = worldBox(rng.range(1.6, 3), 0.02, rng.range(1.4, 2.6), { uvScale: 4 });
      oilGeos.push(placed(g, x, 0.042, z, rng.range(0, Math.PI)));
      g.dispose();
    }
    for (let i = 0; i < 7; i++) {
      const g = worldBox(rng.range(1.5, 3.5), 0.03, rng.range(1.5, 3.5), { uvScale: 3 });
      patchGeos.push(placed(g, rng.range(-4, 4), 0.04, rng.range(street.minZ + 8, street.maxZ - 8), rng.range(0, Math.PI)));
      g.dispose();
    }

    this.emitMerged(env, sandGeos, env.mat('sand_dune', { tint: 0xccbd98, key: 'drift' }), 'sand', 'SandDrifts', true);
    this.emitMerged(env, paintGeos, env.mat('concrete_cast', { tint: 0xcfc6ac, rough: 0.94, normalScale: 0.15, key: 'paint' }), 'concrete', 'RoadPaint', false);
    this.emitMerged(env, oilGeos, env.mat('asphalt', { tint: 0x0c0c0e, rough: 0.5, key: 'oil' }), 'concrete', 'OilStains', false);
    this.emitMerged(env, patchGeos, env.mat('asphalt', { tint: 0x33333a, key: 'patch' }), 'concrete', 'RoadPatches', false);
  }

  private emitMerged(env: Build, geos: THREE.BufferGeometry[], mat: THREE.Material, surf: 'sand' | 'concrete', name: string, cast: boolean): void {
    if (geos.length === 0) return;
    const mesh = new THREE.Mesh(mergeAll(geos), mat);
    for (const g of geos) g.dispose();
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    tagSurface(mesh, surf);
    freeze(mesh);
    env.root.add(mesh);
    env.own(mesh.geometry);
  }

  private buildColliders(env: Build): void {
    // Flat sand proxy under everything.
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(this.plan.ground.size, this.plan.ground.size), INVISIBLE);
    sand.rotation.x = -Math.PI / 2;
    sand.name = 'GroundCollider';
    sand.visible = false;
    tagSurface(sand, 'sand', true);
    sand.updateMatrix();
    sand.matrixAutoUpdate = false;
    env.root.add(sand);
    env.colliders.push(sand);
    env.own(sand.geometry);

    // Road proxy so bullets on the street report concrete.
    const { street } = this.plan;
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(street.halfWidth * 2 + street.sidewalkWidth * 2, street.maxZ - street.minZ),
      INVISIBLE
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.05, (street.minZ + street.maxZ) / 2);
    road.name = 'RoadCollider';
    road.visible = false;
    tagSurface(road, 'concrete', true);
    road.updateMatrix();
    road.matrixAutoUpdate = false;
    env.root.add(road);
    env.colliders.push(road);
    env.own(road.geometry);
  }
}

const INVISIBLE = new THREE.MeshBasicMaterial({ visible: false });

/** A low triangular-prism sand berm running along Z, tall edge toward sideSign*X. */
function sandWedge(len: number, width: number, height: number, sideSign: number, uv: number): THREE.BufferGeometry {
  const tallX = (sideSign * width) / 2;
  const loX = (-sideSign * width) / 2;
  const z0 = -len / 2;
  const z1 = len / 2;
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const A0: [number, number, number] = [loX, 0, z0];
  const B0: [number, number, number] = [tallX, 0, z0];
  const C0: [number, number, number] = [tallX, height, z0];
  const A1: [number, number, number] = [loX, 0, z1];
  const B1: [number, number, number] = [tallX, 0, z1];
  const C1: [number, number, number] = [tallX, height, z1];
  const t = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(0, 1, 0);
      uvs.push(p[0] / uv, p[2] / uv);
    }
  };
  // slope
  t(A0, C0, C1);
  t(A0, C1, A1);
  // back vertical
  t(B0, B1, C1);
  t(B0, C1, C0);
  // caps
  t(A0, B0, C0);
  t(A1, C1, B1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

function pushTri(
  pos: number[],
  nor: number[],
  uv: number[],
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  s: number
) {
  for (const p of [a, b, c]) {
    pos.push(p[0], p[1], p[2]);
    nor.push(0, 1, 0);
    uv.push(p[0] / s, p[2] / s);
  }
}

function displacedGrid(
  size: number,
  seg: number,
  uvScale: number,
  h: (x: number, z: number) => number
): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, h(x, z));
    uv.setXY(i, x / uvScale, z / uvScale);
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

function smooth01(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}
