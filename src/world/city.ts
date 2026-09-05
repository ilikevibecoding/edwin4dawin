import * as THREE from 'three';
import { Rng } from '../core/seed';
import { clamp, lerp, smoothstep } from '../core/noise';
import { Zone, type District, type WorldMap } from './map';
import type { Block } from './roads';
import { createFacadeMaterial } from './facade';
import { LAYER_CAMERA, LAYER_CASCADE0, LAYER_MIRROR, MAX_CASCADES, layerMask, maskCasts, type ViewCull } from './culling';
import { InstanceBatch, type BatchSource } from './batching';

// ------------------------------------------------------------------ unit geometries
// All are 1 m wide/deep centred on x/z and span y in [0,1]. Every geometry carries an `aPart` vertex
// attribute (0 = rigid); only the house uses it to morph its roof per instance (see facade.ts).

function withPart(g: THREE.BufferGeometry, part: (x: number, y: number, z: number) => number): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  const a = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) a[i] = part(p.getX(i), p.getY(i), p.getZ(i));
  g.setAttribute('aPart', new THREE.BufferAttribute(a, 1));
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  return g;
}
function unitBox(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return withPart(g, () => 0);
}
function unitPrism(segments: number, rotOffset: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, segments, 1, false, rotOffset);
  g.translate(0, 0.5, 0);
  return withPart(g, () => 0);
}
/** Tapered box (pyramidal crowns, masts): top face scaled to `topScale`. */
function unitFrustum(topScale = 0.3): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0) { p.setX(i, p.getX(i) * topScale); p.setZ(i, p.getZ(i) * topScale); }
  }
  g.translate(0, 0.5, 0);
  g.computeVertexNormals();
  return withPart(g, () => 0);
}
function unitShear(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0) { p.setX(i, p.getX(i) * 0.55 + 0.22); p.setZ(i, p.getZ(i) * 0.8); }
  }
  g.translate(0, 0.5, 0);
  g.computeVertexNormals();
  return withPart(g, () => 0);
}
/** House: full-height body box (top vertices tagged 1) plus a gable roof prism (eaves tagged 2, ridge tagged 3).
 *  The vertex shader lowers the body top to 0.68 under a pitched roof, shortens the ridge for hip roofs and
 *  collapses the prism for flat roofs, so one instanced geometry covers gable / hip / flat houses and pools. */
function unitHouse(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 1, 1);
  body.translate(0, 0.5, 0);
  const o = 0.08; // eave overhang
  const e = 0.5 + o, ey = 0.66;
  const A = [-e, ey, -e], B = [e, ey, -e], C = [e, ey, e], D = [-e, ey, e];
  const R0 = [0, 1.0, -e], R1 = [0, 1.0, e];
  const tri = (p: number[], q: number[], r: number[]) => [...p, ...q, ...r];
  const verts = new Float32Array([
    ...tri(A, R0, R1), ...tri(A, R1, D),   // left slope
    ...tri(B, C, R1), ...tri(B, R1, R0),   // right slope
    ...tri(A, B, R0),                      // front end
    ...tri(D, R1, C),                      // back end
  ]);
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  roof.computeVertexNormals();
  const merged = mergeSimple([body, roof]);
  return withPart(merged, (_x, y, _z) => (y > 0.99 ? (Math.abs(_x) < 0.01 ? 3 : 1) : y > 0.6 && y < 0.7 && Math.abs(_x) > 0.55 ? 2 : 0));
}

function mergeSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out: number[] = [], nrm: number[] = [];
  for (const g of geos) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.getAttribute('position'), n = ng.getAttribute('normal');
    for (let i = 0; i < p.count; i++) { out.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((out.length / 3) * 2), 2));
  return g;
}

export type Kind = 'box' | 'cyl' | 'oct' | 'frustum' | 'shear' | 'house';

interface Instance {
  x: number; y: number; z: number; w: number; h: number; d: number; rot: number; color: THREE.Color;
  style: number; floorH: number; seed: number; roof: number;
  /** fraction of windows lit at night, warm/cool mix, facade variant, house roof form (0 gable, 1 hip, 2 flat) */
  lit: number; warm: number; variant: number; form: number;
}

/** buildings shorter than this (houses, sheds) are left out of the far shadow proxies: their shadows are under a texel there */
const PROXY_MIN_HEIGHT = 14;
const CITY_EXTRAS = [{ name: 'aDims', itemSize: 3 }, { name: 'aStyle', itemSize: 4 }, { name: 'aStyle2', itemSize: 4 }];
/** `lodR` is the horizontal half-diagonal of the tile (the shadow-distance metric); `center`, `r` and `height`
 *  bound the buildings in world space and are only used for culling; the arrays feed the kind's batches */
interface CityTile extends BatchSource { mesh: THREE.InstancedMesh; kind: Kind; n: number; box: THREE.Box3; center: THREE.Vector3; r: number; height: number; lodR: number; bits: number }
const _perCascade = new Array<number>(MAX_CASCADES).fill(0);

/** Spatially tiled instance batches so far tiles can be frustum-culled and stop casting shadows. */
export class BuildingBatches {
  readonly group = new THREE.Group();
  private readonly lists = new Map<string, Instance[]>();
  private readonly geos: Record<Kind, THREE.BufferGeometry>;
  readonly material: THREE.MeshStandardMaterial;
  count = 0;
  readonly tileSize = 1500;
  /** tile grid origin chosen so the downtown district falls inside a single tile */
  private readonly tileOx = -3400;
  private readonly tileOz = -4520;
  /** `lodR` is the horizontal half-diagonal of the tile (the shadow-distance metric); `center`, `r`
   *  and `height` bound the buildings in world space and are only used for culling. */
  private readonly tiles: CityTile[] = [];
  /** one instanced draw per kind for the camera pass (every tile in view) and one for the mirror pass */
  private readonly cameraBatches = new Map<Kind, InstanceBatch<CityTile>>();
  private readonly mirrorBatches = new Map<Kind, InstanceBatch<CityTile>>();
  readonly cameraMeshes = new Set<THREE.Object3D>();
  readonly mirrorMeshes = new Set<THREE.Object3D>();
  /** shadow-only proxies, one per kind, holding every building at least PROXY_MIN_HEIGHT tall: a cascade
   *  that would draw more per-tile meshes than this costs draws the proxies instead (a whole distant city
   *  for six draw calls) */
  private readonly proxies: THREE.InstancedMesh[] = [];
  shadowDistance = 3200;

  constructor(nightUniform: THREE.IUniform<number>) {
    this.material = createFacadeMaterial(nightUniform);
    this.geos = { box: unitBox(), cyl: unitPrism(16, 0), oct: unitPrism(8, Math.PI / 8), frustum: unitFrustum(0.3), shear: unitShear(), house: unitHouse() };
  }

  add(kind: Kind, inst: Instance): void {
    const tx = Math.floor((inst.x - this.tileOx) / this.tileSize), tz = Math.floor((inst.z - this.tileOz) / this.tileSize);
    const key = `${kind}|${tx}|${tz}`;
    let list = this.lists.get(key);
    if (!list) { list = []; this.lists.set(key, list); }
    list.push(inst);
    this.count++;
  }

  build(): void {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
    for (const [key, list] of this.lists) {
      const kind = key.split('|')[0] as Kind;
      const unit = this.geos[kind];
      if (unit.boundingSphere === null) unit.computeBoundingSphere();
      const geo = unit.clone(); // per-mesh copy so the instanced attributes are unique per tile
      const mesh = new THREE.InstancedMesh(geo, this.material, list.length);
      const dims = new Float32Array(list.length * 3);
      const style = new Float32Array(list.length * 4);
      const style2 = new Float32Array(list.length * 4);
      const box = new THREE.Box3();
      list.forEach((inst, i) => {
        p.set(inst.x, inst.y, inst.z);
        q.setFromEuler(e.set(0, inst.rot, 0));
        s.set(inst.w, inst.h, inst.d);
        mesh.setMatrixAt(i, m.compose(p, q, s));
        mesh.setColorAt(i, inst.color);
        dims[i * 3] = inst.w; dims[i * 3 + 1] = inst.h; dims[i * 3 + 2] = inst.d;
        style[i * 4] = inst.style; style[i * 4 + 1] = inst.floorH; style[i * 4 + 2] = inst.seed; style[i * 4 + 3] = inst.roof;
        style2[i * 4] = inst.lit; style2[i * 4 + 1] = inst.warm; style2[i * 4 + 2] = inst.variant; style2[i * 4 + 3] = inst.form;
        const r = Math.hypot(inst.w, inst.d) * 0.6;
        box.expandByPoint(p.set(inst.x - r, inst.y, inst.z - r));
        box.expandByPoint(p.set(inst.x + r, inst.y + inst.h, inst.z + r));
      });
      geo.setAttribute('aDims', new THREE.InstancedBufferAttribute(dims, 3));
      geo.setAttribute('aStyle', new THREE.InstancedBufferAttribute(style, 4));
      geo.setAttribute('aStyle2', new THREE.InstancedBufferAttribute(style2, 4));
      // the geometry keeps the unit shape's local bounds; the world-space bounds of the tile live on
      // the mesh (identity transform), which is what the frustum test reads for instanced meshes
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      mesh.boundingSphere = sphere;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      const lodR = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
      this.tiles.push({ mesh, kind, n: list.length, box, center: sphere.center, r: sphere.radius, height: box.max.y - box.min.y, lodR, bits: 0, matrices: mesh.instanceMatrix.array as Float32Array, colors: mesh.instanceColor!.array as Float32Array, extras: [dims, style, style2] });
    }
    // camera / mirror batches per kind, sized for every building of that kind
    const perKind = new Map<Kind, number>();
    for (const t of this.tiles) perKind.set(t.kind, (perKind.get(t.kind) ?? 0) + t.n);
    for (const [kind, n] of perKind) {
      const unit = this.geos[kind];
      const cam = new InstanceBatch<CityTile>(n, unit, this.material, CITY_EXTRAS, true);
      cam.mesh.layers.set(LAYER_CAMERA);
      cam.mesh.name = `city-${kind}`;
      this.cameraBatches.set(kind, cam);
      this.cameraMeshes.add(cam.mesh);
      const mir = new InstanceBatch<CityTile>(n, unit, this.material, CITY_EXTRAS, true);
      mir.mesh.layers.set(LAYER_MIRROR);
      mir.mesh.name = `city-${kind}-mirror`;
      this.mirrorBatches.set(kind, mir);
      this.mirrorMeshes.add(mir.mesh);
      this.group.add(cam.mesh, mir.mesh);
    }
    // shadow proxies: every building of a kind in one instanced mesh (the shadow pass only reads the
    // instance matrices, so the facade attributes are not needed)
    const byKind = new Map<Kind, Instance[]>();
    for (const [key, list] of this.lists) {
      const kind = key.split('|')[0] as Kind;
      let all = byKind.get(kind);
      if (!all) { all = []; byKind.set(kind, all); }
      for (const inst of list) if (inst.h >= PROXY_MIN_HEIGHT) all.push(inst);
    }
    for (const [kind, list] of byKind) {
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(this.geos[kind], this.material, list.length);
      const box = new THREE.Box3();
      list.forEach((inst, i) => {
        p.set(inst.x, inst.y, inst.z);
        q.setFromEuler(e.set(0, inst.rot, 0));
        s.set(inst.w, inst.h, inst.d);
        mesh.setMatrixAt(i, m.compose(p, q, s));
        const r = Math.hypot(inst.w, inst.d) * 0.6;
        box.expandByPoint(p.set(inst.x - r, inst.y, inst.z - r));
        box.expandByPoint(p.set(inst.x + r, inst.y + inst.h, inst.z + r));
      });
      mesh.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.visible = false;
      mesh.layers.mask = 0;
      mesh.matrixAutoUpdate = false;
      mesh.name = `shadow-proxy-${kind}`;
      this.group.add(mesh);
      this.proxies.push(mesh);
    }
  }

  /** Per-tile visibility: a tile is drawn when its box is in view and casts shadows when it is within
   *  the shadow distance and its footprint, swept along the sun's shadow, can reach anything in view.
   *  Tiles that only cast leave the camera layer so the main pass skips them. */
  updateLod(camX: number, camZ: number, cull: ViewCull, camPos: THREE.Vector3, mirrorRange: number): void {
    const perCascade = _perCascade;
    perCascade.fill(0);
    for (const t of this.tiles) {
      const d = Math.max(0, Math.hypot(t.center.x - camX, t.center.z - camZ) - t.lodR);
      t.bits = d < this.shadowDistance ? cull.casterCascades(t.center, t.r, t.height) : 0;
      for (let i = 0; i < MAX_CASCADES; i++) if (t.bits & (1 << i)) perCascade[i]++;
    }
    // cascades where the per-tile meshes would cost more draws than the proxies take the proxies instead
    let proxyBits = 0;
    for (let i = 0; i < MAX_CASCADES; i++) if (perCascade[i] > this.proxies.length + 2) proxyBits |= 1 << i;
    for (const t of this.tiles) {
      const inView = cull.boxInView(t.box);
      // the camera draws the tile from its kind's batch; the tile's own mesh is left to the shadow passes
      // (and to the camera only when the batch is full)
      const batched = this.cameraBatches.get(t.kind)!.set(t, inView ? t.n : 0);
      let mask = layerMask('all', inView && !batched, t.bits & ~proxyBits);
      const cast = maskCasts(mask);
      // the water mirrors the tiles within the reflection range (distance to the tile's bounding sphere)
      const mirrored = inView && Math.max(0, t.center.distanceTo(camPos) - t.r) <= mirrorRange;
      if (!this.mirrorBatches.get(t.kind)!.set(t, mirrored ? t.n : 0)) mask |= 1 << LAYER_MIRROR;
      t.mesh.castShadow = cast;
      t.mesh.visible = mask !== 0;
      t.mesh.layers.mask = mask;
    }
    for (const b of this.cameraBatches.values()) b.commit();
    for (const b of this.mirrorBatches.values()) b.commit();
    for (const p of this.proxies) {
      p.visible = p.castShadow = proxyBits !== 0;
      p.layers.mask = proxyBits << LAYER_CASCADE0;
    }
  }
}

// ------------------------------------------------------------------ facade families

/** Shader style ids (see facade.ts). */
const S = { GLASS_BLUE: 0, PUNCHED: 1, BALCONY: 2, DECO: 3, INDUSTRIAL: 4, HOUSE: 5, CONCRETE: 6, HOTEL: 7, GLASS_GREEN: 8, STONE: 9, BRICK: 10, GRID: 11, POOL: 12, HELIPAD: 13 } as const;

interface Family { style: number; floorH: number; tints: readonly string[]; lit: [number, number]; warm: [number, number]; }

const WHITES = ['#f6f3ec', '#f2efe6', '#ffffff', '#efe9dc', '#f4f1ea', '#e9e6df', '#f8f6f1'];
const CREAMS = ['#efe4cf', '#f1e6cf', '#e8dcc3', '#f3ead6', '#ecdfc4'];
const PEACHES = ['#f2c9a8', '#f0bfa0', '#efd1b3', '#f4b8a0', '#f7cdb6', '#eeb497'];
const PINKS = ['#efc0c6', '#f3cfd4', '#e9b7c0', '#f7d5dc', '#e8a9b3'];
const MINTS = ['#cfe6dc', '#bfe0d2', '#d8ece2', '#b6dccf'];
const YELLOWS = ['#f5e6b3', '#f2dfa1', '#f8ecc4', '#efd68e'];
const PALE_BLUES = ['#cfe0ec', '#dbe8f0', '#c3d7e6', '#b9d3e3'];
const STONES = ['#4a4541', '#57504a', '#3f3b38', '#6a605a', '#4d443c', '#5d5955'];
const BRICKS = ['#b98f6a', '#a87e5c', '#c49a74', '#9c6f52', '#c8a680', '#b07b5b', '#8e5e46'];
const GREYS = ['#b9b9b4', '#a7a9a8', '#c6c6c1', '#9da3a6', '#b5b8ba'];
const HOUSE_WALLS = [...WHITES, ...WHITES, ...CREAMS, ...PEACHES, ...PINKS, ...MINTS, ...YELLOWS, ...PALE_BLUES, '#e6d2b8', '#e8c9a0', '#dfc7a6'];
/** outer suburbs: fewer whites, more tan / ochre / sage so the far sprawl is mottled from the air */
const FAR_HOUSE_WALLS = [...WHITES.slice(0, 3), ...CREAMS, ...PEACHES, ...YELLOWS, ...MINTS, '#e6d2b8', '#e8c9a0', '#dfc7a6', '#d9b98f', '#c9a97c', '#b9b28a', '#cdbfa3', '#d6c2a2', '#a9b59a'];

const FAM: Record<'glassBlue' | 'glassGreen' | 'punched' | 'balcony' | 'deco' | 'stone' | 'brick' | 'grid' | 'hotel' | 'concrete' | 'industrial' | 'house', Family> = {
  glassBlue: { style: S.GLASS_BLUE, floorH: 3.9, tints: ['#9fb6c8', '#8fa9bd', '#b0c4d2', '#a7bccb', '#8898a8', '#c2d0da'], lit: [0.18, 0.62], warm: [0.15, 0.5] },
  glassGreen: { style: S.GLASS_GREEN, floorH: 3.8, tints: ['#f2f2ee', '#e8ebe4', '#ffffff', '#dfe6e0', '#e6e2d6', '#d9dfd9'], lit: [0.18, 0.58], warm: [0.2, 0.5] },
  punched: { style: S.PUNCHED, floorH: 3.3, tints: [...WHITES, ...CREAMS], lit: [0.2, 0.55], warm: [0.6, 0.95] },
  balcony: { style: S.BALCONY, floorH: 3.2, tints: [...CREAMS, ...WHITES, '#efe0d3', '#f0d9c2'], lit: [0.2, 0.5], warm: [0.7, 0.95] },
  deco: { style: S.DECO, floorH: 3.4, tints: [...PEACHES, ...PINKS, ...YELLOWS, ...MINTS], lit: [0.15, 0.5], warm: [0.6, 0.9] },
  stone: { style: S.STONE, floorH: 3.8, tints: STONES, lit: [0.3, 0.7], warm: [0.3, 0.6] },
  brick: { style: S.BRICK, floorH: 3.4, tints: BRICKS, lit: [0.2, 0.5], warm: [0.7, 0.95] },
  grid: { style: S.GRID, floorH: 3.5, tints: ['#f7f5f0', '#f1eee6', '#ffffff', '#ece9e1'], lit: [0.25, 0.6], warm: [0.3, 0.7] },
  hotel: { style: S.HOTEL, floorH: 3.2, tints: [...WHITES, ...PEACHES, ...PALE_BLUES], lit: [0.3, 0.6], warm: [0.6, 0.9] },
  concrete: { style: S.CONCRETE, floorH: 3.0, tints: GREYS, lit: [0, 0], warm: [0.5, 0.5] },
  industrial: { style: S.INDUSTRIAL, floorH: 4.0, tints: ['#b8bcc0', '#9aa3a8', '#cfd3d6', '#8e9aa0', '#d8c9a8', '#c4b89a', '#a9b0b5'], lit: [0.05, 0.2], warm: [0.2, 0.4] },
  house: { style: S.HOUSE, floorH: 3.0, tints: HOUSE_WALLS, lit: [0.2, 0.6], warm: [0.8, 1.0] },
};

function pickWeighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const [, w] of items) total += w;
  let r = rng.next() * total;
  for (const [item, w] of items) { r -= w; if (r <= 0) return item; }
  return items[items.length - 1][0];
}

// ------------------------------------------------------------------ city

export interface CityBuild {
  batches: BuildingBatches;
  landmarkPositions: { x: number; z: number; h: number; name: string }[];
  /** occupancy grid (10 m cells) marking footprints so vegetation avoids buildings */
  occupied: (x: number, z: number) => boolean;
  markOccupied: (x: number, z: number, r: number) => void;
}

interface PlaceOpts {
  roof?: number; yBase?: number; lit?: number; warm?: number; variant?: number; form?: number;
  /** occupancy margin (m) around the footprint; negative = do not mark (rooftop items) */
  margin?: number;
}

export function buildCity(map: WorldMap, blocksByDistrict: Map<string, Block[]>, nightUniform: THREE.IUniform<number>): CityBuild {
  const batches = new BuildingBatches(nightUniform);
  const rng = new Rng('city');
  const occ = new Uint8Array(2000 * 2000); // 10 m cells over 20 km
  const occIndex = (x: number, z: number) => {
    const ix = Math.floor((x + 10000) / 10), iz = Math.floor((z + 10000) / 10);
    if (ix < 0 || iz < 0 || ix >= 2000 || iz >= 2000) return -1;
    return iz * 2000 + ix;
  };
  const markOccupied = (x: number, z: number, r: number) => {
    const n = Math.ceil(r / 10);
    for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) {
      const i = occIndex(x + dx * 10, z + dz * 10);
      if (i >= 0) occ[i] = 1;
    }
  };
  /** Marks the cells that touch the rotated footprint grown by `margin` (centre or a corner inside it), so yards
   *  between houses stay free for vegetation while nothing grows through a wall. */
  const markFootprint = (x: number, z: number, w: number, d: number, rot: number, margin: number) => {
    const hx = w / 2 + margin, hz = d / 2 + margin;
    const r = Math.hypot(hx, hz) + 8;
    const c = Math.cos(rot), s = Math.sin(rot);
    const ix0 = Math.floor((x - r + 10000) / 10), ix1 = Math.floor((x + r + 10000) / 10);
    const iz0 = Math.floor((z - r + 10000) / 10), iz1 = Math.floor((z + r + 10000) / 10);
    const inside = (px: number, pz: number) => {
      const lx = px * c + pz * s, lz = -px * s + pz * c;
      return Math.abs(lx) <= hx && Math.abs(lz) <= hz;
    };
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
      if (ix < 0 || iz < 0 || ix >= 2000 || iz >= 2000) continue;
      const px = ix * 10 - 10000 - x, pz = iz * 10 - 10000 - z;
      if (inside(px + 5, pz + 5) || inside(px, pz) || inside(px + 10, pz) || inside(px, pz + 10) || inside(px + 10, pz + 10)) occ[iz * 2000 + ix] = 1;
    }
  };
  const occupied = (x: number, z: number) => { const i = occIndex(x, z); return i >= 0 && occ[i] === 1; };
  const landmarkPositions: { x: number; z: number; h: number; name: string }[] = [];

  const corners = (x: number, z: number, w: number, d: number, rot: number): [number, number][] => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const out: [number, number][] = [];
    for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0], [0, -d / 2], [0, d / 2], [-w / 2, 0], [w / 2, 0]]) {
      out.push([x + lx * c - lz * s, z + lx * s + lz * c]);
    }
    return out;
  };

  /** Places one instance sitting on the highest ground corner (so nothing floats). Returns the roof height or null. */
  const place = (kind: Kind, x: number, z: number, w: number, h: number, d: number, rot: number, color: string | THREE.Color, style: number, floorH: number, o: PlaceOpts = {}): number | null => {
    let y = -Infinity;
    for (const [px, pz] of corners(x, z, w, d, rot)) y = Math.max(y, map.heightAt(px, pz));
    if (o.yBase !== undefined) y = o.yBase;
    if (y < 0.9) return null;
    const col = color instanceof THREE.Color ? color : new THREE.Color(color);
    batches.add(kind, {
      x, y: y - 0.4, z, w, h: h + 0.4, d, rot, color: col, style, floorH, seed: rng.range(0, 1000), roof: o.roof ?? 5,
      lit: o.lit ?? 0.3, warm: o.warm ?? 0.7, variant: o.variant ?? 0.5, form: o.form ?? 0,
    });
    const margin = o.margin ?? 3;
    if (margin >= 0) markFootprint(x, z, w, d, rot, margin);
    return y + h;
  };

  const landOK = (x: number, z: number, w: number, d: number, rot: number) => {
    for (const [px, pz] of corners(x, z, w, d, rot)) if (map.heightAt(px, pz) < 1.2) return false;
    return true;
  };
  const areaFree = (x: number, z: number, w: number, d: number, rot: number) => {
    for (const [px, pz] of corners(x, z, w, d, rot)) if (occupied(px, pz)) return false;
    return true;
  };

  /** Per-building appearance drawn from a facade family. Roughly one building in six is dark at night (empty offices,
   *  unsold condos) and the rest sit toward the low end of the family's lit range so the lit towers stand out. */
  const look = (fam: Family, r: Rng) => {
    const u = r.next();
    const lit = u < 0.16 ? r.range(0.0, 0.04) : lerp(fam.lit[0], fam.lit[1], Math.pow(r.next(), 1.6));
    return { tint: r.pick(fam.tints), lit, warm: r.range(fam.warm[0], fam.warm[1]), variant: r.next() };
  };

  // rooftop equipment: penthouses, tanks, helipads, masts and spires
  const addRoofDetail = (r: Rng, x: number, z: number, tw: number, td: number, top: number, rot: number, h: number, fam: Family) => {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
    const glassy = fam.style === S.GLASS_BLUE || fam.style === S.GLASS_GREEN || fam.style === S.STONE;
    const grey = r.pick(GREYS);
    if (r.chance(0.7)) {
      // mechanical penthouse
      const pw = tw * r.range(0.25, 0.45), pd = td * r.range(0.3, 0.5);
      const [px, pz] = at(r.range(-tw * 0.22, tw * 0.22), r.range(-td * 0.2, td * 0.2));
      place('box', px, pz, pw, r.range(3, 6), pd, rot, glassy ? '#8d9296' : grey, S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
    }
    const n = r.int(0, 3);
    for (let i = 0; i < n; i++) {
      const [px, pz] = at(r.range(-tw * 0.35, tw * 0.35), r.range(-td * 0.35, td * 0.35));
      place('box', px, pz, r.range(2, 4.5), r.range(1.5, 3), r.range(2, 4), rot, grey, S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
    }
    if (h > 40 && r.chance(0.35)) {
      const [px, pz] = at(tw * 0.25, -td * 0.25);
      place('cyl', px, pz, 3, 3.5, 3, rot, '#c9c9c4', S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
    }
    if (h > 100 && r.chance(0.22)) {
      const dia = Math.min(18, Math.min(tw, td) * 0.5);
      const [px, pz] = at(-tw * 0.18, td * 0.16);
      place('cyl', px, pz, dia, 0.5, dia, rot, '#444444', S.HELIPAD, 3, { yBase: top, margin: -1 });
    }
    if (h > 120 && r.chance(0.35)) {
      const [px, pz] = at(tw * 0.3, td * 0.3);
      place('frustum', px, pz, 1.6, r.range(14, 32), 1.6, rot, '#cfd8dc', S.CONCRETE, 3, { yBase: top, margin: -1 });
    }
    if (h > 150 && r.chance(0.3)) {
      place('frustum', x, z, 4, r.range(25, 50), 4, rot, '#e3e8ec', S.CONCRETE, 3, { yBase: top, margin: -1 });
    }
  };

  /** Massing recipes for towers. Returns the roof height of the main body. */
  const buildTower = (r: Rng, x: number, z: number, rot: number, fw: number, fd: number, h: number, fam: Family, recipe: number, detail = true): number | null => {
    const lk = look(fam, r);
    const o = { lit: lk.lit, warm: lk.warm, variant: lk.variant };
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
    let top: number | null = null;
    let tw = fw, td = fd;
    switch (recipe) {
      case 1: {
        // setbacks: three tiers
        const t2 = r.range(0.72, 0.85), t3 = r.range(0.5, 0.65);
        place('box', x, z, fw, h * r.range(0.5, 0.62), fd, rot, lk.tint, fam.style, fam.floorH, o);
        place('box', x, z, fw * t2, h * r.range(0.78, 0.88), fd * t2, rot, lk.tint, fam.style, fam.floorH, o);
        top = place('box', x, z, fw * t3, h, fd * t3, rot, lk.tint, fam.style, fam.floorH, o);
        tw = fw * t3; td = fd * t3;
        break;
      }
      case 2: {
        // slab: thin and wide
        tw = Math.min(fw, fd) * 0.62; td = Math.max(fw, fd) * 1.15;
        top = place('box', x, z, tw, h, td, rot, lk.tint, fam.style, fam.floorH, o);
        break;
      }
      case 3: {
        // L-shape: two overlapping bars
        const a = at(-fw * 0.2, 0), b = at(fw * 0.15, -fd * 0.22);
        place('box', a[0], a[1], fw * 0.6, h, fd, rot, lk.tint, fam.style, fam.floorH, o);
        top = place('box', b[0], b[1], fw * 0.7, h * r.range(0.6, 1.0), fd * 0.56, rot, lk.tint, fam.style, fam.floorH, o);
        tw = fw * 0.6; td = fd;
        break;
      }
      case 4: {
        // twin towers on a shared base, joined by a sky bridge
        const gap = fw * 0.18, tw1 = fw * 0.41;
        const a = at(-(tw1 + gap) / 2, 0), b = at((tw1 + gap) / 2, 0);
        place('box', a[0], a[1], tw1, h, fd * 0.8, rot, lk.tint, fam.style, fam.floorH, o);
        top = place('box', b[0], b[1], tw1, h * r.range(0.85, 1.0), fd * 0.8, rot, lk.tint, fam.style, fam.floorH, o);
        place('box', x, z, gap + 2, 4, fd * 0.4, rot, '#dfe4e8', S.CONCRETE, 3, { yBase: (top ?? 0) - h * 0.45, margin: -1 });
        tw = tw1; td = fd * 0.8;
        break;
      }
      case 5: {
        // glass crown on a concrete body
        top = place('box', x, z, fw, h * 0.88, fd, rot, lk.tint, fam.style, fam.floorH, o);
        const g = look(FAM.glassBlue, r);
        top = place('box', x, z, fw * 0.86, h, fd * 0.86, rot, g.tint, S.GLASS_BLUE, 3.9, { lit: 0.7, warm: 0.3, variant: g.variant });
        tw = fw * 0.86; td = fd * 0.86;
        break;
      }
      case 6: {
        // stepped art-deco crown with a spire
        const tiers = [[1.0, 0.55], [0.86, 0.72], [0.7, 0.88], [0.5, 1.0]];
        for (const [sc, hh] of tiers) top = place('box', x, z, fw * sc, h * hh, fd * sc, rot, lk.tint, fam.style, fam.floorH, o);
        if (top !== null) place('frustum', x, z, 3.5, h * 0.18, 3.5, rot, '#e8e4dc', S.CONCRETE, 3, { yBase: top, margin: -1 });
        tw = fw * 0.5; td = fd * 0.5;
        break;
      }
      case 7: {
        // round / chamfered prism
        const kind: Kind = r.chance(0.45) ? 'cyl' : 'oct';
        tw = td = Math.min(fw, fd);
        top = place(kind, x, z, tw, h, td, rot, lk.tint, fam.style, fam.floorH, o);
        break;
      }
      case 8: {
        // pyramidal crown
        top = place('box', x, z, fw, h * 0.9, fd, rot, lk.tint, fam.style, fam.floorH, o);
        if (top !== null) { place('frustum', x, z, fw, h * 0.1 + 6, fd, rot, lk.tint, fam.style, fam.floorH, { ...o, yBase: top - 0.1, margin: -1 }); detail = false; }
        break;
      }
      default:
        top = place('box', x, z, fw, h, fd, rot, lk.tint, fam.style, fam.floorH, o);
    }
    if (top !== null && detail) {
      const [dx, dz] = recipe === 3 ? at(-fw * 0.2, 0) : recipe === 4 ? at((fw * 0.41 + fw * 0.18) / 2, 0) : [x, z];
      addRoofDetail(r, dx, dz, tw, td, top, rot, h, fam);
    }
    return top;
  };

  // ------------------------------------------------------------- landmark towers (downtown skyline hierarchy)
  const dt = map.districts.find((x) => x.id === 'downtown')!;
  const landmark = (name: string, lx: number, lz: number, build: (x: number, z: number, g: number) => number) => {
    const c = Math.cos(dt.rot), s = Math.sin(dt.rot);
    const x = dt.cx + lx * c - lz * s, z = dt.cz + lx * s + lz * c;
    const g = map.heightAt(x, z);
    if (g < 1) return;
    const h = build(x, z, g);
    landmarkPositions.push({ x, z, h, name });
    markOccupied(x, z, 46);
  };
  // Crowns are sized to survive 3-5 km: spires start 8-10 m wide at the base, lanterns are 12-18 m glass boxes.
  landmark('Meridian Tower', 120, -80, (x, z, g) => {
    const o = { lit: 0.5, warm: 0.3, variant: 0.2 };
    place('box', x, z, 46, 150, 46, 0.1, '#9fb6c8', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 38, 230, 38, 0.1, '#9fb6c8', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 28, 285, 28, 0.1, '#b0c4d2', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 18, 12, 18, 0.1, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 285, lit: 0.9, warm: 0.2, variant: 0.5, margin: -1 });
    place('frustum', x, z, 9, 64, 9, 0.1, '#e8eef2', S.CONCRETE, 3, { yBase: g + 297, margin: -1 });
    return 361;
  });
  landmark('Bahía One', -40, 70, (x, z, g) => {
    const o = { lit: 0.55, warm: 0.25, variant: 0.8 };
    place('oct', x, z, 46, 262, 46, 0.05, '#8898a8', S.GLASS_BLUE, 3.9, o);
    // pyramidal glass crown with a mast
    place('frustum', x, z, 42, 36, 42, 0.05, '#8898a8', S.GLASS_BLUE, 3.9, { ...o, yBase: g + 262, margin: -1 });
    place('frustum', x, z, 4, 38, 4, 0.05, '#cfd8dc', S.CONCRETE, 3, { yBase: g + 297, margin: -1 });
    return 335;
  });
  landmark('Faro Bahía', -180, 40, (x, z, g) => {
    place('cyl', x, z, 40, 240, 40, 0, '#e8ebe4', S.GLASS_GREEN, 3.8, { lit: 0.45, warm: 0.4, variant: 0.6 });
    // lighthouse brim, glass lantern, conical roof and mast
    place('cyl', x, z, 50, 10, 50, 0, '#e8eef2', S.CONCRETE, 3, { yBase: g + 232, margin: -1 });
    place('cyl', x, z, 24, 16, 24, 0, '#cfe0ec', S.GLASS_BLUE, 3.9, { yBase: g + 242, lit: 0.95, warm: 0.3, variant: 0.4, margin: -1 });
    place('frustum', x, z, 28, 18, 28, 0.4, '#dfe4e8', S.CONCRETE, 3, { yBase: g + 258, margin: -1 });
    place('frustum', x, z, 3, 30, 3, 0, '#cfd8dc', S.CONCRETE, 3, { yBase: g + 275, margin: -1 });
    return 305;
  });
  landmark('Twin Palms A', 40, 210, (x, z) => { place('box', x, z, 30, 182, 56, 0.05, '#efe4cf', S.BALCONY, 3.3, { lit: 0.3, warm: 0.85, variant: 0.4 }); return 182; });
  landmark('Twin Palms B', 110, 210, (x, z, g) => {
    place('box', x, z, 30, 182, 56, 0.05, '#efe4cf', S.BALCONY, 3.3, { lit: 0.35, warm: 0.85, variant: 0.4 });
    place('box', x - 35, z, 44, 6, 12, 0.05, '#dfe4e8', S.CONCRETE, 3.3, { yBase: g + 118, margin: -1 });
    return 182;
  });
  landmark('The Sail', -60, -250, (x, z, g) => {
    place('shear', x, z, 60, 205, 44, 0.9, '#b0c4d2', S.GLASS_BLUE, 3.9, { lit: 0.45, warm: 0.3, variant: 0.9 });
    // the mast-like blade above the leaning body
    place('box', x, z, 3.5, 42, 24, 0.9, '#e8eef2', S.CONCRETE, 3, { yBase: g + 204, margin: -1 });
    return 247;
  });
  landmark('Terraces', 260, 120, (x, z) => {
    for (let i = 0; i < 5; i++) place('box', x + i * 6, z - i * 4, 60 - i * 8, 45 + i * 28, 40, 0.0, '#f7f5f0', S.GRID, 3.5, { lit: 0.35, warm: 0.5, variant: 0.3 });
    return 160;
  });
  landmark('Crown Plaza', -300, -180, (x, z, g) => {
    place('box', x, z, 42, 200, 42, 0.2, '#3a3633', S.STONE, 3.8, { lit: 0.55, warm: 0.4, variant: 0.5 });
    place('box', x, z, 20, 10, 20, 0.2, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 200, lit: 0.9, warm: 0.6, variant: 0.5, margin: -1 });
    for (let i = 0; i < 4; i++) {
      const a = 0.2 + (i * Math.PI) / 2;
      place('box', x + Math.cos(a) * 14, z + Math.sin(a) * 14, 3, 44, 14, a, '#e8eef2', S.CONCRETE, 3, { yBase: g + 198, margin: -1 });
    }
    return 244;
  });
  landmark('The Needle', 210, -380, (x, z, g) => {
    // slender residential point tower with a tall mast: the thin vertical accent of the skyline
    place('box', x, z, 22, 212, 22, 0.1, '#dfe6e0', S.GLASS_GREEN, 3.8, { lit: 0.4, warm: 0.5, variant: 0.3 });
    place('frustum', x, z, 16, 14, 16, 0.1, '#dfe6e0', S.GLASS_GREEN, 3.8, { yBase: g + 212, lit: 0.9, warm: 0.5, variant: 0.3, margin: -1 });
    place('frustum', x, z, 5, 70, 5, 0.1, '#e8eef2', S.CONCRETE, 3, { yBase: g + 224, margin: -1 });
    return 294;
  });
  landmark('Gateway', -230, -430, (x, z, g) => {
    // two slabs joined by a top storey: reads as a portal against the sky
    const o = { lit: 0.45, warm: 0.8, variant: 0.6 };
    place('box', x - 26, z, 22, 156, 44, 0.02, '#f2efe6', S.PUNCHED, 3.3, o);
    place('box', x + 26, z, 22, 156, 44, 0.02, '#f2efe6', S.PUNCHED, 3.3, o);
    place('box', x, z, 76, 14, 40, 0.02, '#e9e6df', S.GRID, 3.5, { yBase: g + 156, lit: 0.6, warm: 0.5, variant: 0.6, margin: -1 });
    return 170;
  });
  landmark('Helix', 330, -240, (x, z, g) => {
    for (let i = 0; i < 12; i++) place('box', x, z, 34, 16.5, 34, i * 0.1, '#e6e2d6', S.GLASS_GREEN, 3.9, { yBase: g + i * 16, lit: 0.5, warm: 0.3, variant: 0.2 });
    return 198;
  });
  landmark('Aquamarine', -380, 230, (x, z) => {
    const o = { lit: 0.55, warm: 0.2, variant: 0.6 };
    place('box', x, z, 18, 228, 62, 0.0, '#8fa9bd', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 62, 228, 18, 0.0, '#8fa9bd', S.GLASS_BLUE, 3.9, o);
    place('frustum', x, z, 24, 250, 24, 0.0, '#c2d0da', S.GLASS_BLUE, 3.9, o);
    return 250;
  });

  // ------------------------------------------------------------- district fills
  for (const d of map.districts) {
    const blocks = blocksByDistrict.get(d.id);
    const c = Math.cos(d.rot), s = Math.sin(d.rot);
    const toWorld = (lx: number, lz: number): [number, number] => [d.cx + lx * c - lz * s, d.cz + lx * s + lz * c];
    if (!blocks) continue;
    const drng = rng.fork(d.id);
    for (const b of blocks) {
      const inset = b.streetWidth * 0.5 + 3;
      const bx0 = b.x0 + inset, bx1 = b.x1 - inset, bz0 = b.z0 + inset, bz1 = b.z1 - inset;
      const bw = bx1 - bx0, bd = bz1 - bz0;
      if (bw < 12 || bd < 12) continue;
      const [cxw, czw] = toWorld((bx0 + bx1) / 2, (bz0 + bz1) / 2);
      const distToCentre = Math.hypot(cxw - d.cx, czw - d.cz) / Math.max(d.hw, d.hh);
      const distToDowntown = Math.hypot(cxw - dt.cx, czw - dt.cz);
      // density and height fall off with distance from downtown so the sprawl thins toward the edges
      const prox = 1 - smoothstep(600, 4000, distToDowntown);
      const sprawl = 1 - 0.45 * smoothstep(2500, 8500, distToDowntown);
      if (drng.next() > d.density * (d.zone === Zone.RES_LOW ? sprawl : 1)) continue; // empty lot / park block
      switch (d.zone) {
        case Zone.DOWNTOWN: fillDowntown(); break;
        case Zone.RES_MID: fillMidrise(); break;
        case Zone.HOTEL: fillHotel(); break;
        case Zone.RES_LOW: fillHouses(); break;
        case Zone.INDUSTRIAL: fillIndustrial(); break;
        default: break;
      }

      function fillDowntown(): void {
        const core = 1 - smoothstep(0.2, 1.0, distToCentre);
        const nTowers = bw > 80 && bd > 70 ? 2 : 1;
        for (let t = 0; t < nTowers; t++) {
          // height hierarchy: many 40-100 m, a cluster of 120-200 m near the core (landmarks own 250-360 m)
          const u = drng.next();
          let h: number;
          if (u < 0.07 + 0.22 * core) h = drng.range(120, 205);
          else if (u < 0.45 + 0.2 * core) h = drng.range(70, 120);
          else h = drng.range(36, 72);
          h *= lerp(0.6, 1.0, core);
          h = Math.max(28, h);
          // footprint classes so the skyline mixes widths: slender point towers, standard plates, wide slabs
          const wr = drng.next();
          let fw: number, fd: number;
          if (wr < (h > 110 ? 0.34 : 0.22)) { fw = drng.range(16, 24); fd = drng.range(18, 30); }
          else if (wr < 0.82) { fw = drng.range(24, Math.min(46, bw * 0.55)); fd = drng.range(22, Math.min(46, bd * 0.6)); }
          else { fw = drng.range(Math.min(44, bw * 0.5), Math.min(74, bw * 0.75)); fd = drng.range(18, Math.min(30, bd * 0.4)); if (h > 150) h *= 0.7; }
          const lx = nTowers === 1 ? (bx0 + bx1) / 2 + drng.range(-bw * 0.1, bw * 0.1) : lerp(bx0 + fw / 2 + 4, bx1 - fw / 2 - 4, t);
          const lz = (bz0 + bz1) / 2 + drng.range(-bd * 0.15, bd * 0.15);
          const [x, z] = toWorld(lx, lz);
          if (!landOK(x, z, fw, fd, d.rot) || !areaFree(x, z, fw + 6, fd + 6, d.rot)) continue;
          const fam: Family = h > 110
            ? pickWeighted(drng, [[FAM.glassBlue, 0.34], [FAM.glassGreen, 0.16], [FAM.punched, 0.1], [FAM.balcony, 0.08], [FAM.deco, 0.08], [FAM.stone, 0.14], [FAM.grid, 0.1]] as const)
            : h > 60
              ? pickWeighted(drng, [[FAM.glassBlue, 0.2], [FAM.glassGreen, 0.12], [FAM.punched, 0.16], [FAM.balcony, 0.14], [FAM.deco, 0.14], [FAM.stone, 0.1], [FAM.grid, 0.1], [FAM.brick, 0.04]] as const)
              : pickWeighted(drng, [[FAM.glassBlue, 0.1], [FAM.glassGreen, 0.08], [FAM.punched, 0.2], [FAM.balcony, 0.12], [FAM.deco, 0.18], [FAM.stone, 0.06], [FAM.grid, 0.1], [FAM.brick, 0.16]] as const);
          // podium: parking or retail base filling more of the lot
          if (h > 55 && drng.chance(0.6)) {
            const pw = Math.min(bw * 0.92, fw + drng.range(14, 36)), pd = Math.min(bd * 0.92, fd + drng.range(14, 36));
            const ph = drng.range(8, 18);
            if (drng.chance(0.45)) place('box', x, z, pw, ph, pd, d.rot, drng.pick(GREYS), S.CONCRETE, 3.4, { lit: 0.1, warm: 0.5 });
            else { const lk = look(fam.style === S.STONE ? FAM.punched : fam, drng); place('box', x, z, pw, ph, pd, d.rot, lk.tint, fam.style === S.STONE ? S.PUNCHED : fam.style, fam.floorH, { lit: lk.lit, warm: lk.warm, variant: lk.variant }); }
          }
          let recipe: number;
          const rr = drng.next();
          if (fam.style === S.DECO && h > 60) recipe = rr < 0.55 ? 6 : rr < 0.8 ? 1 : 0;
          else if (h > 110) recipe = rr < 0.28 ? 1 : rr < 0.4 ? 7 : rr < 0.52 ? 5 : rr < 0.62 ? 8 : rr < 0.72 ? 4 : rr < 0.8 ? 2 : 0;
          else if (h > 60) recipe = rr < 0.18 ? 1 : rr < 0.3 ? 7 : rr < 0.42 ? 3 : rr < 0.5 ? 2 : rr < 0.58 ? 8 : 0;
          else recipe = rr < 0.25 ? 3 : rr < 0.35 ? 2 : 0;
          buildTower(drng, x, z, d.rot, fw, fd, h, fam, recipe);
        }
        // mid-rise street wall: 4-12 storey buildings shoulder to shoulder along the block edges wherever the
        // towers left room, so the skyline has a body between the towers instead of bare lots
        const fillEdge = (along: 'x' | 'z', fixed: number, from: number, to: number) => {
          let cursor = from;
          while (cursor < to - 10) {
            const front = drng.range(14, 30);
            const depth = Math.min(drng.range(12, 22), (along === 'x' ? bd : bw) * 0.4);
            if (cursor + front > to) break;
            const mid = cursor + front / 2;
            cursor += front + drng.range(0, 3);
            if (drng.next() > 0.55 + 0.35 * core) continue;
            const inward = fixed === (along === 'x' ? bz0 : bx0) ? 1 : -1;
            const lx = along === 'x' ? mid : fixed + inward * depth / 2;
            const lz = along === 'x' ? fixed + inward * depth / 2 : mid;
            const w = along === 'x' ? front : depth, dd = along === 'x' ? depth : front;
            const [x, z] = toWorld(lx, lz);
            if (!landOK(x, z, w, dd, d.rot) || !areaFree(x, z, w + 3, dd + 3, d.rot)) continue;
            const fam = pickWeighted(drng, [[FAM.brick, 0.24], [FAM.punched, 0.28], [FAM.deco, 0.2], [FAM.balcony, 0.12], [FAM.grid, 0.06], [FAM.concrete, 0.1]] as const);
            const lk = look(fam, drng);
            const hh = drng.range(12, 40) * lerp(0.7, 1.1, core);
            const top = place('box', x, z, w, hh, dd, d.rot, lk.tint, fam.style, fam.floorH, { lit: lk.lit, warm: lk.warm, variant: lk.variant });
            if (top !== null && hh > 20 && drng.chance(0.4)) place('box', x, z, w * 0.4, drng.range(2.5, 4), dd * 0.45, d.rot, drng.pick(GREYS), S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
          }
        };
        fillEdge('x', bz0, bx0, bx1);
        fillEdge('x', bz1, bx0, bx1);
        fillEdge('z', bx0, bz0, bz1);
        fillEdge('z', bx1, bz0, bz1);
      }

      function fillMidrise(): void {
        const n = Math.max(1, Math.round((bw * bd) / 1800));
        for (let i = 0, placed = 0; i < n * 2 && placed < n; i++) {
          const fw = drng.range(16, Math.min(44, bw * 0.75)), fd = drng.range(16, Math.min(44, bd * 0.75));
          const lx = drng.range(bx0 + fw / 2, bx1 - fw / 2), lz = drng.range(bz0 + fd / 2, bz1 - fd / 2);
          const [x, z] = toWorld(lx, lz);
          if (!landOK(x, z, fw, fd, d.rot) || !areaFree(x, z, fw + 4, fd + 4, d.rot)) continue;
          placed++;
          let h = lerp(d.hMin, d.hMax, Math.pow(drng.next(), 2.0)) * lerp(0.75, 1.15, prox);
          h = clamp(h, d.hMin * 0.8, d.hMax);
          const fam = h > 50
            ? pickWeighted(drng, [[FAM.balcony, 0.3], [FAM.punched, 0.2], [FAM.grid, 0.15], [FAM.deco, 0.1], [FAM.glassGreen, 0.15], [FAM.glassBlue, 0.1]] as const)
            : pickWeighted(drng, [[FAM.brick, 0.28], [FAM.punched, 0.24], [FAM.deco, 0.16], [FAM.balcony, 0.16], [FAM.grid, 0.1], [FAM.concrete, 0.06]] as const);
          const rr = drng.next();
          const long = Math.max(bw, bd) > 90 && Math.min(fw, fd) > 20;
          const recipe = h > 45 ? (rr < 0.25 ? 1 : rr < 0.35 ? 7 : rr < 0.5 && long ? 2 : rr < 0.6 ? 3 : 0) : (rr < 0.25 ? 3 : rr < 0.35 && long ? 2 : 0);
          buildTower(drng, x, z, d.rot + drng.range(-0.03, 0.03), fw, fd, h, fam, recipe, h > 20);
        }
      }

      function fillHotel(): void {
        // slabs parallel to the beach (district local x is across the island)
        const slab = drng.chance(0.65);
        const fw = slab ? drng.range(18, 30) : drng.range(24, 40);
        const fd = slab ? Math.min(bd * 0.85, drng.range(50, 95)) : drng.range(24, 40);
        const [x, z] = toWorld((bx0 + bx1) / 2 + drng.range(-6, 6), (bz0 + bz1) / 2);
        if (!landOK(x, z, fw, fd, d.rot) || !areaFree(x, z, fw + 4, fd + 4, d.rot)) return;
        const h = lerp(d.hMin, d.hMax, Math.pow(drng.next(), 1.5));
        const fam = slab
          ? pickWeighted(drng, [[FAM.hotel, 0.55], [FAM.balcony, 0.25], [FAM.deco, 0.2]] as const)
          : pickWeighted(drng, [[FAM.glassGreen, 0.3], [FAM.balcony, 0.25], [FAM.deco, 0.2], [FAM.glassBlue, 0.15], [FAM.punched, 0.1]] as const);
        const rr = drng.next();
        const recipe = slab ? 0 : rr < 0.3 ? 7 : rr < 0.5 ? 1 : rr < 0.6 ? 8 : 0;
        buildTower(drng, x, z, d.rot, fw, fd, h, fam, recipe);
        // pool deck / low wing toward the beach
        const [px, pz] = toWorld((bx0 + bx1) / 2 + fw * 0.5 + 12, (bz0 + bz1) / 2);
        if (landOK(px, pz, 18, fd * 0.7, d.rot) && areaFree(px, pz, 18, fd * 0.7, d.rot)) {
          const lk = look(FAM.punched, drng);
          const top = place('box', px, pz, 18, drng.range(4, 9), fd * 0.7, d.rot, lk.tint, S.PUNCHED, 3.2, { lit: lk.lit, warm: lk.warm });
          if (top !== null && drng.chance(0.7)) place('house', px, pz, drng.range(6, 10), 0.4, Math.min(fd * 0.4, drng.range(12, 24)), d.rot, '#3fc4de', S.POOL, 3, { yBase: top, form: 2, margin: -1 });
        }
      }

      function fillHouses(): void {
        // lots around the block perimeter along the two long sides; each block has a dominant roof colour. Far from
        // downtown the palette leans to terracotta / dark tile / brown so the sprawl reads as a mottled field, not
        // a pale strip, and the pale membrane and gravel roofs stay near the core.
        const frontage = drng.range(16, 24);
        const depth = Math.min(30, bd / 2 - 2);
        const far = smoothstep(2200, 5500, distToDowntown);
        const blockRoof = pickWeighted(drng, [[0, 0.3], [2, lerp(0.14, 0.03, far)], [5, lerp(0.16, 0.05, far)], [6, 0.13], [1, lerp(0.12, 0.17, far)], [7, lerp(0.1, 0.17, far)], [3, lerp(0.04, 0.1, far)], [4, lerp(0.01, 0.05, far)]] as const);
        const wallPalette = far > 0.5 ? FAR_HOUSE_WALLS : HOUSE_WALLS;
        // the two rows face away from each other; lots never overlap, so only landmarks/other districts are checked
        const sides: [number, number][] = bd >= 40 ? [[bz0 + depth / 2, 0], [bz1 - depth / 2, Math.PI]] : [[(bz0 + bz1) / 2, 0]];
        for (const [lz, face] of sides) {
          let lx = bx0 + frontage / 2;
          while (lx < bx1 - frontage / 2) {
            const hw = drng.range(8, 14), hd = drng.range(9, 17);
            const step = Math.max(frontage * drng.range(0.9, 1.25), hw + 6);
            const cx = lx;
            lx += step;
            if (drng.next() > (d.density + 0.15) * sprawl) continue;
            const inward = face === 0 ? 1 : -1;
            const rot = d.rot + face + drng.range(-0.12, 0.12);
            const [x, z] = toWorld(cx + drng.range(-1.5, 1.5), lz - inward * drng.range(-3, 3));
            if (drng.next() < 0.08 * prox) {
              // small apartment block near downtown
              const aw = Math.min(22, step - 4), ad = drng.range(12, 18);
              if (aw < 12 || !landOK(x, z, aw, ad, rot) || occupied(x, z)) continue;
              const fam = drng.chance(0.5) ? FAM.brick : FAM.punched;
              const lk = look(fam, drng);
              place('house', x, z, aw, drng.range(7, 11), ad, rot, lk.tint, fam.style, 3.1, { lit: lk.lit, warm: lk.warm, variant: lk.variant, form: 2, margin: 1 });
              continue;
            }
            if (!landOK(x, z, hw, hd, rot) || occupied(x, z)) continue;
            const floors = drng.chance(0.28) ? 2 : 1;
            const formRoll = drng.next();
            const form = formRoll < 0.42 ? 0 : formRoll < 0.78 ? 1 : 2;
            const h = form === 2 ? floors * 3.1 + 0.6 : (floors * 3.1) / 0.68;
            const roof = drng.chance(0.65) ? blockRoof : drng.pick(far > 0.5 ? [0, 1, 3, 4, 6, 7, 7, 1] : [0, 1, 2, 3, 4, 5, 6, 7]);
            const lk = look(FAM.house, drng);
            lk.tint = drng.pick(wallPalette);
            place('house', x, z, hw, h, hd, rot, lk.tint, S.HOUSE, 3.0, { roof, form, lit: lk.lit, warm: lk.warm, variant: lk.variant, margin: 1 });
            const cr = Math.cos(rot), sr = Math.sin(rot);
            // garage / shed beside the house
            if (drng.chance(0.3) && step - hw > 9) {
              const side = drng.chance(0.5) ? 1 : -1;
              const gx = x + side * (hw / 2 + 3.2) * cr, gz = z + side * (hw / 2 + 3.2) * sr;
              if (landOK(gx, gz, 5.5, 6, rot)) place('house', gx, gz, 5.5, 2.9, 6, rot, lk.tint, S.HOUSE, 3.0, { roof, form: 2, lit: 0, margin: 0.5 });
            }
            // pool in the yard (toward the block interior)
            if (drng.chance(0.28)) {
              const [qx, qz] = toWorld(cx, lz + inward * (hd / 2 + 6));
              if (landOK(qx, qz, 6, 4, d.rot)) place('house', qx, qz, drng.range(5, 9), 0.4, drng.range(3.5, 5), d.rot, '#3fc4de', S.POOL, 3, { form: 2, margin: 0.5, yBase: map.heightAt(qx, qz) });
            }
          }
        }
      }

      function fillIndustrial(): void {
        const n = Math.max(1, Math.round((bw * bd) / 3600));
        for (let i = 0, placed = 0; i < n * 3 && placed < n; i++) {
          const fw = drng.range(28, Math.min(80, bw * 0.85)), fd = drng.range(22, Math.min(60, bd * 0.85));
          const lx = drng.range(bx0 + fw / 2, bx1 - fw / 2), lz = drng.range(bz0 + fd / 2, bz1 - fd / 2);
          const [x, z] = toWorld(lx, lz);
          if (!landOK(x, z, fw, fd, d.rot) || !areaFree(x, z, fw, fd, d.rot)) continue;
          placed++;
          const lk = look(FAM.industrial, drng);
          const h = drng.range(8, 15);
          const top = place('box', x, z, fw, h, fd, d.rot, lk.tint, S.INDUSTRIAL, 4.0, { lit: lk.lit, warm: lk.warm, variant: lk.variant });
          if (top === null) continue;
          if (drng.chance(0.5)) place('box', x, z, fw + 0.6, 0.5, fd + 0.6, d.rot, '#8f9599', S.CONCRETE, 3, { yBase: top - 0.05, margin: -1 });
          if (drng.chance(0.3)) {
            // office block at the front and a couple of storage tanks
            const [ox, oz] = toWorld(lx - fw / 2 + 8, lz + fd / 2 + 8);
            if (landOK(ox, oz, 14, 10, d.rot)) place('box', ox, oz, 14, drng.range(6, 10), 10, d.rot, drng.pick(WHITES), S.PUNCHED, 3.2, { lit: 0.3, warm: 0.6 });
          }
          if (drng.chance(0.3)) {
            const [tx, tz] = toWorld(lx + fw / 2 + 9, lz - fd / 2 + 8);
            if (landOK(tx, tz, 12, 12, d.rot)) place('cyl', tx, tz, drng.range(7, 12), drng.range(7, 13), drng.range(7, 12), 0, '#dcdcd4', S.CONCRETE, 3);
          }
        }
      }
    }
  }

  batches.build();
  return { batches, landmarkPositions, occupied, markOccupied };
}

export function districtByZone(map: WorldMap, zone: Zone): District[] {
  return map.districts.filter((d) => d.zone === zone);
}

export { clamp };
