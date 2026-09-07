import * as THREE from 'three';
import { Rng, hash2 } from '../core/seed';
import { clamp, lerp, perlin2, smoothstep } from '../core/noise';
import { Canopy, Zone, urbanGradient, type District, type WorldMap } from './map';
import type { Block } from './roads';
import { CAR_FAR, createFacadeMaterial } from './facade';
import { LAYER_CAMERA, LAYER_CASCADE0, LAYER_MIRROR, MAX_CASCADES, layerMask, maskCasts, type ViewCull } from './culling';
import { InstanceBatch, splitCells, type BatchSource, type CellSource } from './batching';

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
/** Round prisms carry aPart = -1 so the facade shader unwraps its window grid around the drum (facade.ts). */
function unitPrism(segments: number, rotOffset: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, segments, 1, false, rotOffset);
  g.translate(0, 0.5, 0);
  return withPart(g, () => -1);
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

/** `trim` is the near-detail layer (balcony slabs and balustrades, floor ledges, parapet coping, corner columns):
 *  unit boxes drawn only from cells within TRIM_FAR of the camera, never in the shadow passes. `roof` / `roofcyl`
 *  (unit box / 10-sided prism) are the rooftop kit's small items (vents, stacks, ducts, pipes, antennas, dishes,
 *  rails, condensers, tank legs) drawn within ROOF_FAR, `roofbig` its large items (RTUs, solar rows, skylights,
 *  screen walls) drawn within ROOF_BIG_FAR; beyond those the coarse rooftop masses (penthouses, tanks, cooling
 *  towers, masts, helipads: ordinary `box` / `cyl` instances) and the roof shader's pads stand in. */
export type Kind = 'box' | 'cyl' | 'oct' | 'frustum' | 'shear' | 'house' | 'trim' | 'roof' | 'roofcyl' | 'roofbig' | 'car';

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
interface CityTile extends BatchSource { mesh: THREE.InstancedMesh; kind: Kind; n: number; box: THREE.Box3; center: THREE.Vector3; r: number; height: number; lodR: number; bits: number; cells: CityCell[] | null; cellsDrawn: boolean; mirrorCells: boolean; /** cascades whose shadow batch holds the tile's cells */ shadowIn: number }
/** A cell with its caster-routing result cached for the frame it was computed in. */
interface CityCell extends CellSource { castBits: number; castFrame: number }
/** shadow-only proxy of one kind (every building at least PROXY_MIN_HEIGHT tall) with its cells */
interface CityProxy extends BatchSource { kind: Kind; n: number; cells: CityCell[] | null; /** cascades whose shadow batch holds the proxy's cells */ shadowIn: number }
/** cells a tile in view is drawn by for the camera (built on first use), so the buildings of a tile the
 *  camera stands in that are outside the frustum are not submitted */
const CITY_CELL = 250;
const _perCascade = new Array<number>(MAX_CASCADES).fill(0);
/** houses (the `house` kind, ~10 m wide) leave the main pass where a 10 m footprint projects under this many
 *  pixels: the terrain's baked suburb ground (roof cells, drives, car parks: fully in from 3.8 km) stands in */
export const HOUSE_MIN_PX = 1.5;
/** the mirror image leaves out houses beyond this (a reflected house is under a mirror texel tall there); towers
 *  stay to the reflection range: a lit skyline reflects across the whole bay at night */
export const MIRROR_HOUSE_FAR = 2500;
/** the trim layer (slabs, rails, ledges, coping) is drawn from cells within this distance of the camera and
 *  mirrored within MIRROR_TRIM_FAR; further out the facade shader's shaded version of the same details stands in */
export const TRIM_FAR = 600;
export const MIRROR_TRIM_FAR = 300;
/** the rooftop kit's small items are drawn from cells within ROOF_FAR of the camera, its large items (RTUs,
 *  solar rows, skylights, screen walls: 2-20 m, still a few pixels at 1.5 km from the aerial views) within
 *  ROOF_BIG_FAR */
export const ROOF_FAR = 700;
export const ROOF_BIG_FAR = 1600;
/** near-detail kinds: their draw distance; they never join the shadow proxies. Trims never cast (under a shadow
 *  texel everywhere they are drawn); the rooftop kit casts into the two near cascades while within its draw
 *  distance, since an RTU without its shadow on a sunlit roof reads as a paint patch; the small kit items and the
 *  cars (0.2-1.5 m tall) cast into the finest cascade only, a car's shadow being under a texel further out. */
const NEAR_FAR: Partial<Record<Kind, number>> = { trim: TRIM_FAR, roof: ROOF_FAR, roofcyl: ROOF_FAR, roofbig: ROOF_BIG_FAR, car: CAR_FAR };
const NEAR_CAST: Partial<Record<Kind, number>> = { trim: 0, roof: 0b0001, roofcyl: 0b0001, roofbig: 0b0011, car: 0b0001 };
const _bp = new THREE.Vector3();
/** grow `box` by building `i` of `t` the way the tile box was built (footprint half-diagonal x 0.6, height) */
function boundBuilding(t: BatchSource, i: number, box: THREE.Box3): void {
  const m = t.matrices, dims = t.extras[0];
  const x = m[i * 16 + 12], y = m[i * 16 + 13], z = m[i * 16 + 14];
  const r = Math.hypot(dims[i * 3], dims[i * 3 + 2]) * 0.6, h = dims[i * 3 + 1];
  box.expandByPoint(_bp.set(x - r, y, z - r));
  box.expandByPoint(_bp.set(x + r, y + h, z + r));
}

/** Yaw convention of the whole city: every lot, street grid (roads.ts `toWorld`), footprint test and offset helper
 *  rotates local (x, z) by `rot` as x' = x cos - z sin, z' = x sin + z cos. Three's `Euler(0, rot, 0)` is the
 *  inverse of that (local +x lands on (cos, -sin)), so the instance matrices take -rot: with +rot every building
 *  stood yawed 2·rot off its own street (13.75 deg on the hotel strip, whose grid turns -0.12 rad), and the twin /
 *  slot / L-shape recipes and the crown fins, which offset their parts with the lot convention, were skewed by the
 *  same angle against their own faces. */
function yawQuaternion(q: THREE.Quaternion, e: THREE.Euler, rot: number): THREE.Quaternion {
  return q.setFromEuler(e.set(0, -rot, 0));
}

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
  private readonly cameraBatches = new Map<Kind, InstanceBatch>();
  private readonly mirrorBatches = new Map<Kind, InstanceBatch>();
  readonly cameraMeshes = new Set<THREE.Object3D>();
  readonly mirrorMeshes = new Set<THREE.Object3D>();
  /** shadow-only proxies, one per kind, holding every building at least PROXY_MIN_HEIGHT tall: a cascade
   *  that would draw more per-tile meshes than this costs draws the proxies instead (a whole distant city
   *  for six draw calls) */
  private readonly proxies: CityProxy[] = [];
  /** one shadow batch per kind and cascade: the cells (of the tiles, or of the kind's proxy when the cascade
   *  is in proxy mode) that can shade that cascade's slice, in one draw */
  private readonly shadowBatches = new Map<Kind, InstanceBatch<CityCell>[]>();
  private proxyActive = 0;
  private frame = 0;
  shadowDistance = 3200;

  constructor(nightUniform: THREE.IUniform<number>) {
    this.material = createFacadeMaterial(nightUniform);
    // the kit's round items (vents, stacks, pipes, tank drums: 0.3-1.5 m) are hexagonal: they are 1-8 px across
    // wherever the kit is drawn, and the 10-sided prism cost 40 triangles per vent for a silhouette nobody resolved
    this.geos = { box: unitBox(), cyl: unitPrism(16, 0), oct: unitPrism(8, Math.PI / 8), frustum: unitFrustum(0.3), shear: unitShear(), house: unitHouse(), trim: unitBox(), roof: unitBox(), roofcyl: unitPrism(6, 0), roofbig: unitBox(), car: unitBox() };
  }

  /** The box massings standing on the ground (their base within a metre of the terrain; the rooftop kit sits far
   *  above it), as footprints for the street dressing: awnings and blade signs hang on the facades that meet the
   *  sidewalk. `style` is the facade style id, `y` the base height. */
  groundBoxes(heightAt: (x: number, z: number) => number): { x: number; y: number; z: number; w: number; h: number; d: number; rot: number; style: number }[] {
    const out: { x: number; y: number; z: number; w: number; h: number; d: number; rot: number; style: number }[] = [];
    for (const [key, list] of this.lists) {
      if (!key.startsWith('box|')) continue;
      for (const b of list) if (b.y < heightAt(b.x, b.z) + 1.0) out.push({ x: b.x, y: b.y + 0.4, z: b.z, w: b.w, h: b.h - 0.4, d: b.d, rot: b.rot, style: b.style });
    }
    return out;
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
        yawQuaternion(q, e, inst.rot);
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
      mesh.castShadow = kind !== 'trim';
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      const lodR = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
      this.tiles.push({ mesh, kind, n: list.length, box, center: sphere.center, r: sphere.radius, height: box.max.y - box.min.y, lodR, bits: 0, cells: null, cellsDrawn: false, mirrorCells: false, shadowIn: 0, matrices: mesh.instanceMatrix.array as Float32Array, colors: mesh.instanceColor!.array as Float32Array, extras: [dims, style, style2] });
    }
    // camera / mirror batches per kind, sized for every building of that kind
    const perKind = new Map<Kind, number>();
    for (const t of this.tiles) perKind.set(t.kind, (perKind.get(t.kind) ?? 0) + t.n);
    for (const [kind, n] of perKind) {
      const unit = this.geos[kind];
      const cam = new InstanceBatch(n, unit, this.material, CITY_EXTRAS, true);
      cam.mesh.layers.set(LAYER_CAMERA);
      cam.mesh.name = `city-${kind}`;
      this.cameraBatches.set(kind, cam);
      this.cameraMeshes.add(cam.mesh);
      const mir = new InstanceBatch(n, unit, this.material, CITY_EXTRAS, true);
      mir.mesh.layers.set(LAYER_MIRROR);
      mir.mesh.name = `city-${kind}-mirror`;
      this.mirrorBatches.set(kind, mir);
      this.mirrorMeshes.add(mir.mesh);
      this.group.add(cam.mesh, mir.mesh);
      if (kind === 'trim') continue;   // trims never cast: under a shadow texel everywhere they are drawn
      // shadow batches (the depth pass reads the instance matrices only: no colours or facade attributes)
      const shadow: InstanceBatch<CityCell>[] = [];
      for (let i = 0; i < MAX_CASCADES; i++) {
        const b = new InstanceBatch<CityCell>(n, unit, this.material, [], false);
        b.mesh.castShadow = true; b.mesh.receiveShadow = false;
        b.mesh.layers.set(LAYER_CASCADE0 + i);
        b.mesh.name = `city-${kind}-shadow-${i}`;
        this.group.add(b.mesh);
        shadow.push(b);
      }
      this.shadowBatches.set(kind, shadow);
    }
    // shadow proxies: every building of a kind at least PROXY_MIN_HEIGHT tall as one instance source (matrices
    // only), drawn cell by cell from the kind's shadow batches
    const byKind = new Map<Kind, Instance[]>();
    for (const [key, list] of this.lists) {
      const kind = key.split('|')[0] as Kind;
      if (kind in NEAR_FAR) continue;
      let all = byKind.get(kind);
      if (!all) { all = []; byKind.set(kind, all); }
      for (const inst of list) if (inst.h >= PROXY_MIN_HEIGHT) all.push(inst);
    }
    for (const [kind, list] of byKind) {
      if (!list.length) continue;
      const matrices = new Float32Array(list.length * 16), dims = new Float32Array(list.length * 3);
      list.forEach((inst, i) => {
        p.set(inst.x, inst.y, inst.z);
        yawQuaternion(q, e, inst.rot);
        s.set(inst.w, inst.h, inst.d);
        m.compose(p, q, s).toArray(matrices, i * 16);
        dims[i * 3] = inst.w; dims[i * 3 + 1] = inst.h; dims[i * 3 + 2] = inst.d;
      });
      this.proxies.push({ kind, n: list.length, cells: null, shadowIn: 0, matrices, colors: null, extras: [dims] });
    }
  }

  /** Cells of a tile or proxy (built on first use), each bounded like the tile box. */
  private static cellsOf(t: CityTile | CityProxy): CityCell[] {
    if (t.cells) return t.cells;
    const cells = splitCells(t, t.n, CITY_CELL, boundBuilding.bind(null, t)) as CityCell[];
    for (const c of cells) { c.castBits = 0; c.castFrame = -1; }
    return t.cells = cells;
  }

  /** Cascades a cell's buildings can shade this frame (box swept along the sun, plus the shadow cameras' own
   *  frustums), computed once per cell and frame. */
  private cellCast(c: CityCell, cull: ViewCull): number {
    if (c.castFrame !== this.frame) {
      c.castFrame = this.frame;
      c.castBits = cull.boxCasterCascades(c.box, c.box.max.y - c.box.min.y);
    }
    return c.castBits;
  }

  /** Give cascade `i`'s batch of `kind` the cells of `src` that can shade it (`on` false removes them). False
   *  when the batch is full (the caller then lets the mesh cast on its own). */
  private placeShadow(src: CityTile | CityProxy, kind: Kind, i: number, on: boolean, cull: ViewCull): boolean {
    const bit = 1 << i;
    const batches = this.shadowBatches.get(kind);
    if (!batches) return true;
    const batch = batches[i];
    if (!on) {
      if (src.shadowIn & bit) { for (const c of src.cells!) batch.set(c, 0); src.shadowIn &= ~bit; }
      return true;
    }
    const cells = BuildingBatches.cellsOf(src);
    let ok = true;
    for (const c of cells) if (!batch.set(c, this.cellCast(c, cull) & bit ? c.count : 0)) ok = false;
    if (!ok) { for (const c of cells) batch.set(c, 0); src.shadowIn &= ~bit; return false; }
    src.shadowIn |= bit;
    return true;
  }

  /** Per-tile visibility: a tile is drawn when its box is in view and casts shadows when it is within
   *  the shadow distance and its footprint, swept along the sun's shadow, can reach anything in view.
   *  Tiles that only cast leave the camera layer so the main pass skips them. */
  /** `pxPerMetre`: screen pixels a metre covers at 1 m from the camera (focal length in pixels). */
  updateLod(camX: number, camZ: number, cull: ViewCull, camPos: THREE.Vector3, mirrorRange: number, pxPerMetre: number): void {
    this.frame++;
    const perCascade = _perCascade;
    perCascade.fill(0);
    for (const t of this.tiles) {
      const d = Math.max(0, Math.hypot(t.center.x - camX, t.center.z - camZ) - t.lodR);
      const near = NEAR_FAR[t.kind];
      const castMask = near === undefined ? ~0 : NEAR_CAST[t.kind] ?? 0;
      const casts = near === undefined ? d < this.shadowDistance : castMask !== 0 && d < near;
      t.bits = casts ? cull.casterCascades(t.center, t.r, t.height) & castMask : 0;
      for (let i = 0; i < MAX_CASCADES; i++) if (t.bits & (1 << i)) perCascade[i]++;
    }
    // cascades where the per-tile meshes would cost more draws than the proxies take the proxies instead
    let proxyBits = 0;
    for (let i = 0; i < MAX_CASCADES; i++) if (perCascade[i] > this.proxies.length + 2) proxyBits |= 1 << i;
    // proxy cascades draw the proxies' cells that can shade them (from the same shadow batches the tiles use:
    // placed first, so a cascade leaving proxy mode has room for its tiles' cells this frame)
    for (let i = 0; i < MAX_CASCADES; i++) {
      const bit = 1 << i, on = (proxyBits & bit) !== 0;
      if (!on && !(this.proxyActive & bit)) continue;
      for (const p of this.proxies) this.placeShadow(p, p.kind, i, on, cull);
    }
    this.proxyActive = proxyBits;
    const houseFar = (10 * pxPerMetre) / HOUSE_MIN_PX;
    const mirrorFar = mirrorRange;
    for (const t of this.tiles) {
      const near = NEAR_FAR[t.kind];
      const inView = cull.boxInView(t.box) && (near === undefined || t.box.distanceToPoint(camPos) <= near);
      const house = t.kind === 'house';
      // the camera draws the tile from its kind's batch, cell by cell (the cells in view; house cells beyond
      // HOUSE_FAR are left to the baked suburb ground, near-detail cells beyond their kind's distance to the
      // facade shader / the coarse roof masses); the tile's own mesh is left to the shadow passes (and to the
      // camera only when the batch is full)
      const batch = this.cameraBatches.get(t.kind)!;
      const nearFar = house ? houseFar : near ?? Infinity;
      let batched = true;
      if (inView) {
        const cells = BuildingBatches.cellsOf(t);
        for (const c of cells) {
          let count = cull.boxInView(c.box) ? c.count : 0;
          if (count && c.box.distanceToPoint(camPos) > nearFar) count = 0;
          if (!batch.set(c, count)) batched = false;
        }
        if (!batched) for (const c of cells) batch.set(c, 0);
        t.cellsDrawn = batched;
      } else if (t.cellsDrawn) {
        for (const c of t.cells!) batch.set(c, 0);
        t.cellsDrawn = false;
      }
      // shadows: the cascades the tile can shade take its cells that can shade them from the kind's shadow
      // batches; the tile's mesh casts on its own only into a cascade whose batch is full
      let own = 0;
      const shadowBits = t.bits & ~proxyBits;
      for (let i = 0; i < MAX_CASCADES; i++) if (!this.placeShadow(t, t.kind, i, (shadowBits & (1 << i)) !== 0, cull)) own |= 1 << i;
      let mask = layerMask('all', inView && !batched, own);
      const cast = maskCasts(mask);
      // the water mirrors the tiles within the reflection range (distance to the tile's bounding sphere),
      // cell by cell against the mirror camera's frustum and the mirror distance limits
      const mirrored = inView && Math.max(0, t.center.distanceTo(camPos) - t.r) <= mirrorFar;
      const mirror = this.mirrorBatches.get(t.kind)!;
      if (mirrored) {
        const far = house ? Math.min(mirrorFar, MIRROR_HOUSE_FAR) : near !== undefined ? Math.min(mirrorFar, MIRROR_TRIM_FAR) : mirrorFar;
        let ok = true;
        for (const c of t.cells!) {
          let count = cull.boxInMirror(c.box) ? c.count : 0;
          if (count && c.box.distanceToPoint(camPos) > far) count = 0;
          if (!mirror.set(c, count)) ok = false;
        }
        if (!ok) { for (const c of t.cells!) mirror.set(c, 0); mask |= 1 << LAYER_MIRROR; }
        t.mirrorCells = ok;
      } else if (t.mirrorCells) {
        for (const c of t.cells!) mirror.set(c, 0);
        t.mirrorCells = false;
      }
      t.mesh.castShadow = cast;
      t.mesh.visible = mask !== 0;
      t.mesh.layers.mask = mask;
    }
    for (const b of this.cameraBatches.values()) b.commit();
    for (const b of this.mirrorBatches.values()) b.commit();
    for (const s of this.shadowBatches.values()) for (const b of s) b.commit();
  }
}

// ------------------------------------------------------------------ facade families

/** Shader style ids (see facade.ts). */
const S = { GLASS_BLUE: 0, PUNCHED: 1, BALCONY: 2, DECO: 3, INDUSTRIAL: 4, HOUSE: 5, CONCRETE: 6, HOTEL: 7, GLASS_GREEN: 8, STONE: 9, BRICK: 10, GRID: 11, POOL: 12, HELIPAD: 13, BALUSTRADE: 14,
  /** rooftop kit styles (facade.ts kit path): louvred plant with fan tops, see-through railing, solar panel, glazed skylight, galvanised duct / pipe */
  PLANT: 15, RAIL: 16, SOLAR: 17, SKYLIGHT: 18, DUCT: 19,
  /** open decks of a parking structure; the surfaces of the open spaces (striped lot, pavers, lawn); a parked car */
  PARKING: 20, LOT: 21, PLAZA: 22, LAWN: 23, CAR: 24 } as const;
/** rooftop kit palettes: galvanised / painted plant, ducting, railing metal */
const PLANT_COLS = ['#8a8f93', '#9aa0a3', '#6f7478', '#b1ada0', '#5d6166', '#4f5a60', '#7e8a80', '#a39d8c'];
const DUCT_COLS = ['#aeb3b6', '#9da2a5', '#c0c3c4', '#7f8487'];
const RAIL_COLS = ['#3a3d40', '#8f9497', '#d9d9d4', '#2f3a44'];

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

/** Standard normal deviate (Box-Muller) from two uniform draws. */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-6, rng.next()), u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function pickWeighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const [, w] of items) total += w;
  let r = rng.next() * total;
  for (const [item, w] of items) { r -= w; if (r <= 0) return item; }
  return items[items.length - 1][0];
}

/** Neighbourhood character at (x, z): `glass` > 0 favours curtain-wall / stone office towers, < 0 favours the
 *  stucco, deco and brick families; `pastel` picks a hue window of the pastel palettes. Both wander at 350-450 m,
 *  so the skyline is made of blocks of kin buildings (a glass office cluster, a pastel condo row) rather than
 *  every tower rolling its family and tint independently. */
function neighbourhood(x: number, z: number): { glass: number; pastel: number } {
  return { glass: perlin2(x / 420 + 11.3, z / 420 - 5.7), pastel: 0.5 + 0.5 * perlin2(x / 330 - 9.1, z / 330 + 4.4) };
}

const GLASSY_STYLES = new Set<number>([S.GLASS_BLUE, S.GLASS_GREEN, S.STONE, S.GRID]);
/** Family weights biased by the neighbourhood: glass / stone families gain where `glass` > 0, masonry where < 0. */
function clusterWeights(items: readonly (readonly [Family, number])[], glass: number): (readonly [Family, number])[] {
  const g = Math.max(0, glass), m = Math.max(0, -glass);
  return items.map(([fam, w]) => [fam, w * (GLASSY_STYLES.has(fam.style) ? 1 + 1.6 * g - 0.6 * m : 1 + 1.6 * m - 0.6 * g)] as const);
}


// ------------------------------------------------------------------ city

/** A deliberately open piece of a block (the city places its surface and furniture; the vegetation and street passes
 *  may plant / pave it further): centre, extents and yaw of the rectangle in world space. */
export interface OpenSpace { kind: 'park' | 'plaza' | 'lot'; x: number; z: number; w: number; d: number; rot: number }

export interface CityBuild {
  batches: BuildingBatches;
  /** the pocket parks, squares and surface car parks the blocks were given instead of buildings */
  openSpaces: OpenSpace[];
  landmarkPositions: { x: number; z: number; h: number; name: string }[];
  /** occupancy grid (10 m cells) marking footprints so vegetation avoids buildings */
  occupied: (x: number, z: number) => boolean;
  markOccupied: (x: number, z: number, r: number) => void;
  /** every building body placed on the ground (rooftop items excluded), for the terrain's lot map (terrain.ts stampLots) */
  footprints: { x: number; z: number; w: number; d: number; h: number; rot: number; kind: Kind; style: number }[];
}

interface PlaceOpts {
  roof?: number; yBase?: number; lit?: number; warm?: number; variant?: number; form?: number;
  /** occupancy margin (m) around the footprint; negative = do not mark (rooftop items) */
  margin?: number;
  /** the street face of a box body (0 -z, 1 +z, 2 -x, 3 +x in its own frame): the shader puts the entrance, lobby
   *  and shopfronts on it and the loading dock on its pair (aStyle2.w = 10 + face); the ground-floor geometry
   *  (canopies, awnings, stoops) goes on the same face. Unset: the shader picks by hash. */
  front?: number;
}

export function buildCity(map: WorldMap, blocksByDistrict: Map<string, Block[]>, nightUniform: THREE.IUniform<number>): CityBuild {
  const batches = new BuildingBatches(nightUniform);
  const rng = new Rng('city');
  /** The shader seed of an instance is a hash of where it stands and how tall it is, so a building's look (its
   *  front face, roof family, pane grain, weathering) never depends on how many instances were placed before it:
   *  a change to one block's fill leaves every other building as it was. */
  const seedAt = (x: number, z: number, h: number) => hash2(Math.round(x * 8), Math.round(z * 8), Math.round(h * 16)) * 1000;
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
  const openSpaces: OpenSpace[] = [];

  const corners = (x: number, z: number, w: number, d: number, rot: number): [number, number][] => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const out: [number, number][] = [];
    for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0], [0, -d / 2], [0, d / 2], [-w / 2, 0], [w / 2, 0]]) {
      out.push([x + lx * c - lz * s, z + lx * s + lz * c]);
    }
    return out;
  };

  /** Places one instance sitting on the highest ground corner (so nothing floats). Returns the roof height or null. */
  const footprints: CityBuild['footprints'] = [];
  const place = (kind: Kind, x: number, z: number, w: number, h: number, d: number, rot: number, color: string | THREE.Color, style: number, floorH: number, o: PlaceOpts = {}): number | null => {
    let y = -Infinity;
    for (const [px, pz] of corners(x, z, w, d, rot)) y = Math.max(y, map.heightAt(px, pz));
    if (o.yBase !== undefined) y = o.yBase;
    if (y < 0.9) return null;
    const col = color instanceof THREE.Color ? color : new THREE.Color(color);
    batches.add(kind, {
      x, y: y - 0.4, z, w, h: h + 0.4, d, rot, color: col, style, floorH, seed: seedAt(x, z, h), roof: o.roof ?? 5,
      lit: o.lit ?? 0.3, warm: o.warm ?? 0.7, variant: o.variant ?? 0.5, form: o.front !== undefined && kind === 'box' ? 10 + o.front : o.form ?? 0,
    });
    const margin = o.margin ?? 3;
    if (margin >= 0) { markFootprint(x, z, w, d, rot, margin); footprints.push({ x, z, w, d, h, rot, kind, style }); }
    if (kind === 'box' && margin >= 0 && h >= 10) addTrims(x, y - 0.4, z, w, h + 0.4, d, rot, style, floorH, col);
    return y + h;
  };

  /** Near-detail geometry for a building body (drawn within TRIM_FAR, see BuildingBatches): balcony slabs with
   *  glass balustrades on the two long faces of balcony and hotel slabs, a ledge per floor on the deco and
   *  egg-crate frames, parapet coping on the masonry families, corner columns on the glass towers. Every item
   *  is a unit box; `y` and `h` are the body's batch values (base buried 0.4 m), so floors match the shader's.
   *  Trims carry roof = -1 (aStyle.w) so the shader skips its mast, crown, beacon and ground-grime paths on them. */
  const TRIM_LIGHT = new THREE.Color('#e9e7e1'), TRIM_DARK = new THREE.Color('#3c3f43'), TRIM_GLASS = new THREE.Color('#9fb6c8');
  const addTrims = (x: number, y: number, z: number, w: number, h: number, d: number, rot: number, style: number, floorH: number, wall: THREE.Color) => {
    // offsets rotate with the lot convention (see yawQuaternion): x' = x c - z s, z' = x s + z c
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const trim = (ox: number, oy: number, oz: number, tw: number, th: number, td: number, col: THREE.Color, st: number) =>
      batches.add('trim', { x: x + ox * cr - oz * sr, y: y + oy, z: z + ox * sr + oz * cr, w: tw, h: th, d: td, rot, color: col, style: st, floorH: 3, seed: 0, roof: -1, lit: 0, warm: 0.5, variant: 0.5, form: 0 });
    const glassy = style === S.GLASS_BLUE || style === S.GLASS_GREEN || style === S.STONE;
    if (style === S.BALCONY || style === S.HOTEL) {
      // the slab rings the two long faces; the balustrade stands at its edge (shader: slab 0-14 %, rail to 42 %)
      const nFloors = Math.floor((h - 1.0) / floorH);
      const longX = w >= d;          // long faces are the +-z faces when the box is wider than deep
      const span = (longX ? w : d) + 3.0, off = (longX ? d : w) * 0.5;
      const slabCol = style === S.HOTEL ? TRIM_LIGHT : wall.clone().lerp(TRIM_LIGHT, 0.6);
      for (let k = 1; k < nFloors; k++) {
        const fy = k * floorH;
        for (const s of [-1, 1]) {
          const [ox, oz] = longX ? [0, s * (off + 0.75)] : [s * (off + 0.75), 0];
          trim(ox, fy, oz, longX ? span : 1.5, 0.18, longX ? 1.5 : span, slabCol, S.CONCRETE);
          const [bx, bz] = longX ? [0, s * (off + 1.46)] : [s * (off + 1.46), 0];
          trim(bx, fy + 0.18, bz, longX ? span : 0.08, 1.05, longX ? 0.08 : span, TRIM_GLASS, S.BALUSTRADE);
        }
      }
    } else if (style === S.DECO || style === S.GRID) {
      // a string course / frame ledge at every floor line on the long faces
      const nFloors = Math.floor((h - 1.0) / floorH);
      const longX = w >= d;
      const span = (longX ? w : d) + 0.6, off = (longX ? d : w) * 0.5;
      const col = style === S.GRID ? wall : wall.clone().lerp(TRIM_LIGHT, 0.5);
      for (let k = 1; k < nFloors; k++) {
        for (const s of [-1, 1]) {
          const [ox, oz] = longX ? [0, s * (off + 0.15)] : [s * (off + 0.15), 0];
          trim(ox, k * floorH, oz, longX ? span : 0.3, 0.3, longX ? 0.3 : span, col, S.CONCRETE);
        }
      }
    }
    if (!glassy && style !== S.INDUSTRIAL && style !== S.CONCRETE) {
      // parapet coping: a pale cap around the roof edge
      const cap = style === S.BRICK || style === S.PUNCHED ? TRIM_LIGHT : wall.clone().lerp(TRIM_LIGHT, 0.7);
      trim(0, h - 0.3, -d * 0.5, w + 0.5, 0.5, 0.5, cap, S.CONCRETE);
      trim(0, h - 0.3, d * 0.5, w + 0.5, 0.5, 0.5, cap, S.CONCRETE);
      trim(-w * 0.5, h - 0.3, 0, 0.5, 0.5, d, cap, S.CONCRETE);
      trim(w * 0.5, h - 0.3, 0, 0.5, 0.5, d, cap, S.CONCRETE);
    } else if (glassy && h > 30) {
      // corner columns: the curtain wall's dark corner mullions stand proud of the glass
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) trim(sx * w * 0.5, 0, sz * d * 0.5, 0.45, h, 0.45, TRIM_DARK, S.CONCRETE);
    }
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
  const look = (fam: Family, r: Rng, pastel = -1) => {
    const u = r.next();
    const lit = u < 0.16 ? r.range(0.0, 0.04) : lerp(fam.lit[0], fam.lit[1], Math.pow(r.next(), 1.6));
    // with a neighbourhood hue given, the tint comes from a window of the family's palette around it (the
    // palettes are ordered by hue), so neighbours share a colour family without being identical
    let tint: string;
    if (pastel >= 0 && fam.tints.length > 4) {
      const n = fam.tints.length;
      const k = Math.floor(pastel * (n - 1) + r.range(-1.6, 1.6) + 0.5);
      tint = fam.tints[((k % n) + n) % n];
    } else tint = r.pick(fam.tints);
    return { tint, lit, warm: r.range(fam.warm[0], fam.warm[1]), variant: r.next() };
  };

  /** Rooftop kit item: a near-detail instance (see Kind) at world (x, z), base `y`, yaw `rot`. */
  const kit = (kind: Kind, x: number, y: number, z: number, w: number, h: number, d: number, rot: number, col: THREE.Color, style: number) =>
    batches.add(kind, { x, y, z, w, h, d, rot, color: col, style, floorH: 3, seed: seedAt(x, z, y + h), roof: -1, lit: 0, warm: 0.5, variant: 0.5, form: 0 });

  const CAR_C = ['#e8e8e6', '#c9cccf', '#8f9397', '#2a2b2e', '#1d2a44', '#7a1e1e', '#b8342a', '#c9b79a', '#3b4a5a', '#5a6b4a', '#f1f1ef', '#151618', '#d8d5cc', '#6d6f73'].map((c) => new THREE.Color(c));
  const HEDGE_C = new THREE.Color('#2f4a22'), PLANTER_C = new THREE.Color('#6e6a62'), PATH_C = new THREE.Color('#8f8a80'), ASPHALT_C = new THREE.Color('#1c1c1e'), LAWN_C = new THREE.Color('#3a5a22');
  /** Parked cars on a lot or deck of `w` x `d` m (centre x, z, yaw rot, surface height `y`) on the stall layout the
   *  LOT / PARKING shader stripes (5 m rows either side of a 6.5 m aisle at a 17.1 m period across the lot, 2.6 m
   *  stalls along it), `fill` of the stalls taken; `ok` (lot-local offsets from the centre) can veto a stall that
   *  lies under a building. One `car` box per car, drawn within CAR_FAR (the lot shader's blobs stand in beyond). */
  const lotCars = (r: Rng, x: number, z: number, w: number, d: number, rot: number, y: number, fill: number, ok?: (ox: number, oz: number) => boolean) => {
    const alongX = w >= d;
    const L = alongX ? w : d, W = alongX ? d : w;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let p0 = 0.6; p0 + 5 <= W - 0.6; p0 += 17.1) {
      for (const a0 of [p0, p0 + 11.5]) {
        if (a0 + 5 > W - 0.6) continue;
        const ac = a0 + 2.5;
        for (let al = 1.9; al + 1.3 <= L - 0.6; al += 2.6) {
          if (r.next() > fill) continue;
          const lu = al - L / 2, lv = ac - W / 2 + r.range(-0.25, 0.25);
          const ox = alongX ? lu : lv, oz = alongX ? lv : lu;
          if (ok && !ok(ox, oz)) continue;
          const cw = r.range(1.7, 1.9), cl = r.range(4.2, 4.9), ch = r.range(1.4, 1.75);
          kit('car', x + ox * cr - oz * sr, y, z + ox * sr + oz * cr, alongX ? cw : cl, ch, alongX ? cl : cw, rot + r.range(-0.03, 0.03), r.pick(CAR_C), S.CAR);
        }
      }
    }
  };

  /** One roof's layout: axis-aligned rectangles in the roof's local frame (metres from its centre), so the kit's
   *  items stand clear of one another and of the coarse masses placed first; `hw` / `hd` are the usable half extents. */
  class RoofPacker {
    private readonly rects: number[] = [];
    /** `round`: the roof is a drum, so an item's corners must also lie within the inscribed circle */
    constructor(readonly hw: number, readonly hd: number, readonly round = false) {}
    block(lx: number, lz: number, w: number, d: number): void { this.rects.push(lx - w / 2, lz - d / 2, lx + w / 2, lz + d / 2); }
    free(lx: number, lz: number, w: number, d: number): boolean {
      const x0 = lx - w / 2, z0 = lz - d / 2, x1 = lx + w / 2, z1 = lz + d / 2;
      if (x0 < -this.hw || z0 < -this.hd || x1 > this.hw || z1 > this.hd) return false;
      if (this.round) {
        const rr = Math.min(this.hw, this.hd) ** 2;
        if (x0 * x0 + z0 * z0 > rr || x1 * x1 + z0 * z0 > rr || x0 * x0 + z1 * z1 > rr || x1 * x1 + z1 * z1 > rr) return false;
      }
      const q = this.rects;
      for (let i = 0; i < q.length; i += 4) if (x0 < q[i + 2] && x1 > q[i] && z0 < q[i + 3] && z1 > q[i + 1]) return false;
      return true;
    }
    /** A spot for a w x d item with `gap` clearance, inside `zone` (local rect) when given; null when none found. */
    find(r: Rng, w: number, d: number, gap: number, tries: number, zone?: readonly [number, number, number, number]): [number, number] | null {
      const hw = this.hw - w / 2, hd = this.hd - d / 2;
      if (hw < 0 || hd < 0) return null;
      const x0 = zone ? Math.max(-hw, zone[0]) : -hw, x1 = zone ? Math.min(hw, zone[2]) : hw;
      const z0 = zone ? Math.max(-hd, zone[1]) : -hd, z1 = zone ? Math.min(hd, zone[3]) : hd;
      if (x0 > x1 || z0 > z1) return null;
      for (let t = 0; t < tries; t++) {
        const lx = r.range(x0, x1), lz = r.range(z0, z1);
        if (this.free(lx, lz, w + gap * 2, d + gap * 2)) { this.block(lx, lz, w, d); return [lx, lz]; }
      }
      return null;
    }
  }

  /** Block-local rectangle bookkeeping in the district frame (the blocks are axis-aligned there): what the block
   *  has placed so far (towers, podiums, parcels), so the street wall packs shoulder to shoulder against it. The
   *  10 m occupancy grid is too coarse for that (a cell touching a tower's grown footprint is marked, so a parcel
   *  flush against the tower failed and the block was left with a lot-wide gap beside every tower); the grid is
   *  read once, before the block places anything, for what stood there already (landmarks, earlier districts). */
  class BlockPlan {
    private readonly rects: number[] = [];
    constructor(readonly x0: number, readonly z0: number, readonly x1: number, readonly z1: number, private readonly foreign: (cx: number, cz: number, w: number, d: number) => boolean) {}
    take(cx: number, cz: number, w: number, d: number, margin = 0): void { this.rects.push(cx - w / 2 - margin, cz - d / 2 - margin, cx + w / 2 + margin, cz + d / 2 + margin); }
    /** inside the block, clear (by `gap`) of what stands on it, and of what stood on the block before it */
    free(cx: number, cz: number, w: number, d: number, gap = 0): boolean {
      const x0 = cx - w / 2, z0 = cz - d / 2, x1 = cx + w / 2, z1 = cz + d / 2;
      if (x0 < this.x0 - 0.05 || z0 < this.z0 - 0.05 || x1 > this.x1 + 0.05 || z1 > this.z1 + 0.05) return false;
      const q = this.rects;
      for (let i = 0; i < q.length; i += 4) if (x0 - gap < q[i + 2] && x1 + gap > q[i] && z0 - gap < q[i + 3] && z1 + gap > q[i + 1]) return false;
      return !this.foreign(cx, cz, w, d);
    }
    /** the rectangles taken so far that intersect (cx, cz, w, d), in that rectangle's own frame (for a roof's `block`) */
    within(cx: number, cz: number, w: number, d: number): [number, number, number, number][] {
      const out: [number, number, number, number][] = [];
      const q = this.rects;
      for (let i = 0; i < q.length; i += 4) {
        const x0 = Math.max(q[i], cx - w / 2), z0 = Math.max(q[i + 1], cz - d / 2), x1 = Math.min(q[i + 2], cx + w / 2), z1 = Math.min(q[i + 3], cz + d / 2);
        if (x1 > x0 && z1 > z0) out.push([(x0 + x1) / 2 - cx, (z0 + z1) / 2 - cz, x1 - x0, z1 - z0]);
      }
      return out;
    }
  }

  /** Rooftop kit of a flat roof of `tw` x `td` m at height `top` (centre x, z; yaw rot) on a building `h` tall of
   *  family `fam`. The coarse masses are ordinary instances seen from any distance (mechanical penthouse, water
   *  tank, cooling-tower row, screen wall, helipad, masts, spire); the kit around them is the near-detail layer:
   *  RTUs with their ducts run to the penthouse, vents and exhaust stacks with rain caps, condenser rows on the
   *  flats, antenna masts and dishes, solar rows, skylights, pipe runs, a railing along the parapet where the
   *  facade has no coping. Offices carry the heavy plant, residential roofs the condensers and tanks; counts
   *  scale with the roof area and every item is packed clear of the others. */
  const PLANT_C = PLANT_COLS.map((c) => new THREE.Color(c)), DUCT_C = DUCT_COLS.map((c) => new THREE.Color(c)), RAIL_C = RAIL_COLS.map((c) => new THREE.Color(c));
  const SOLAR_C = new THREE.Color('#1c2a44'), DISH_C = new THREE.Color('#e4e6e3'), SKY_C = new THREE.Color('#9fb6c8'), TANK_LEG_C = new THREE.Color('#4a4d50');
  const GREY_C = GREYS.map((c) => new THREE.Color(c));
  /** ground-floor kit: canopy slabs (dark metal, pale concrete, painted), shop awnings, pool loungers, green roofs */
  const CANOPY_DARK_C = new THREE.Color('#2e3134'), CANOPY_PALE_C = new THREE.Color('#d8d5cc');
  const CANOPY_C = ['#6b7076', '#a9a49a', '#4d5a66', '#7a6a58'].map((c) => new THREE.Color(c));
  const AWNING_C = ['#2f5d3a', '#7a1f2a', '#1f2f4d', '#2b2b2c', '#d9cdb2', '#b8462f', '#e9e4d6', '#3d6e7a', '#8c6d3f'].map((c) => new THREE.Color(c));
  const LOUNGER_C = ['#f1f1ec', '#e4dccb', '#2f4a5a'].map((c) => new THREE.Color(c));
  const GREEN_ROOF_C = ['#5a6b3a', '#6b7a3f', '#4f5e35'].map((c) => new THREE.Color(c));
  /** A secondary roof surface: `terrace` is a setback tier or the ring around a crown (vents, a few small units,
   *  rails, solar), `podium` a base that carries the building's heavy plant (cooling towers, RTUs, a screen wall)
   *  and skylights over the retail below. `block` lists what already stands on it (the upper tier, a lantern, fins)
   *  as (lx, lz, w, d) in the roof frame. Neither gets a penthouse, tank, helipad or spire of its own. */
  type RoofOpts = { tier?: 'terrace' | 'podium'; block?: readonly (readonly [number, number, number, number])[]; round?: boolean };
  const addRoofDetail = (r0: Rng, x: number, z: number, tw: number, td: number, top: number, rot: number, h: number, fam: Family, opts: RoofOpts = {}) => {
    // one draw of the caller's rng seeds the roof's own, so the kit's item count never reshuffles the lots after it
    const r = new Rng(Math.floor(r0.next() * 4294967296));
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
    const glassy = fam.style === S.GLASS_BLUE || fam.style === S.GLASS_GREEN || fam.style === S.STONE;
    const office = glassy || fam.style === S.GRID || fam.style === S.CONCRETE || (fam.style === S.DECO && h > 60);
    const resi = fam.style === S.BALCONY || fam.style === S.HOTEL || fam.style === S.PUNCHED || fam.style === S.BRICK;
    const terrace = opts.tier === 'terrace', podium = opts.tier === 'podium', main = !opts.tier;
    const grey = r.pick(GREYS);
    const area = tw * td;
    const round = opts.round === true;
    const pk = new RoofPacker(tw / 2 - 1.2, td / 2 - 1.2, round);
    if (opts.block) for (const [bx, bz, bw, bd] of opts.block) pk.block(bx, bz, bw + 1.2, bd + 1.2);
    const y = top - 0.05;
    const item = (kind: Kind, lx: number, lz: number, w: number, hh: number, d: number, col: THREE.Color, style: number, yaw = rot, yb = y) => {
      const [px, pz] = at(lx, lz);
      kit(kind, px, yb, pz, w, hh, d, yaw, col, style);
    };
    const plantCol = r.pick(PLANT_C), plantCol2 = r.pick(PLANT_C), ductCol = r.pick(DUCT_C), railCol = r.pick(RAIL_C);

    // ---- coarse masses (seen from any distance)
    let pent: [number, number, number, number] | null = null;   // lx, lz, w, d
    if (main && r.chance(0.7) && tw > 9 && td > 9) {
      // mechanical penthouse / stair and lift bulkhead (centred on a drum so its corners stay inside the roof)
      const pw = tw * r.range(0.25, round ? 0.4 : 0.45), pd = td * r.range(0.3, round ? 0.4 : 0.5);
      const lx = round ? 0 : r.range(-tw * 0.22, tw * 0.22), lz = round ? 0 : r.range(-td * 0.2, td * 0.2);
      const [px, pz] = at(lx, lz);
      place('box', px, pz, pw, r.range(3, 6), pd, rot, glassy ? '#8d9296' : grey, S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
      pk.block(lx, lz, pw, pd);
      pent = [lx, lz, pw, pd];
    }
    if (main && h > 40 && r.chance(0.35) && tw > 12) {
      // a second, smaller bulkhead (lift overrun) toward a corner
      const lx = tw * r.range(0.15, 0.32), lz = -td * r.range(0.1, 0.3);
      if (pk.free(lx, lz, 4, 4)) { const [px, pz] = at(lx, lz); place('box', px, pz, 3.2, 3.5, 3.2, rot, grey, S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 }); pk.block(lx, lz, 3.2, 3.2); }
    }
    if (main && !glassy && h > 18 && r.chance(0.3) && tw > 9) {
      // water tank on the older masonry blocks: a drum on four legs
      const dia = r.range(2.6, 4.4);
      const p = pk.find(r, dia, dia, 0.6, 8, [-tw * 0.34, -td * 0.3, -tw * 0.1, td * 0.3]);
      if (p) {
        const [px, pz] = at(p[0], p[1]);
        const legH = 1.6;
        place('cyl', px, pz, dia, r.range(2.8, 4.6), dia, rot + r.range(-0.5, 0.5), r.pick(['#d9d6cc', '#c9c4b8', '#8f8a80']), S.CONCRETE, 3, { yBase: top - 0.2 + legH, margin: -1 });
        const lr = dia * 0.34;
        for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) item('roof', p[0] + sx * lr, p[1] + sz * lr, 0.2, legH, 0.2, TANK_LEG_C, S.DUCT);
      }
    }
    if (!terrace && (glassy || podium) && tw > 16 && r.chance(podium ? 0.55 : 0.35)) {
      // cooling towers in a row (louvred boxes with fan tops); the podium roof is where a tower's plant usually goes
      const nct = r.int(2, 4), alongX = r.chance(0.5), yaw = rot + (alongX ? 0 : Math.PI / 2) + r.range(-0.08, 0.08);
      const rowW = alongX ? nct * 3.4 : 2.6, rowD = alongX ? 2.6 : nct * 3.4;
      const p = pk.find(r, rowW, rowD, 0.8, 8);
      if (p) for (let i = 0; i < nct; i++) {
        const o = (i - (nct - 1) / 2) * 3.4;
        const [px, pz] = at(p[0] + (alongX ? o : 0), p[1] + (alongX ? 0 : o));
        place('oct', px, pz, 2.6, r.range(2.2, 3.2), 2.6, yaw, r.pick(PLANT_COLS), S.PLANT, 3, { yBase: top - 0.2, margin: -1, roof: -1 });
      }
    }
    if (!terrace && !round && h > 50 && r.chance(podium ? 0.4 : 0.28) && td > 12) {
      // louvred screen wall hiding the plant along one side
      const side = r.chance(0.5) ? 1 : -1;
      const lx = side * tw * 0.36, lz = r.range(-td * 0.15, td * 0.15), sd = td * r.range(0.45, 0.7);
      if (pk.free(lx, lz, 0.6, sd)) { const [px, pz] = at(lx, lz); place('box', px, pz, 0.6, r.range(3, 4.5), sd, rot, '#b9bfc3', S.GRID, 3.5, { yBase: top - 0.2, margin: -1, lit: 0, variant: 0.3 }); pk.block(lx, lz, 0.6, sd); }
    }
    if (main && h > 100 && r.chance(0.22) && Math.min(tw, td) > 14) {
      // helipad, kept clear on all sides
      const dia = Math.min(18, Math.min(tw, td) * 0.5);
      const p = pk.find(r, dia, dia, 1.5, 6, [-tw * 0.24, -td * 0.2, -tw * 0.1, td * 0.2]) ?? pk.find(r, dia, dia, 1.0, 6);
      if (p) { const [px, pz] = at(p[0], p[1]); place('cyl', px, pz, dia, 0.5, dia, rot, '#444444', S.HELIPAD, 3, { yBase: top, margin: -1 }); }
    }
    if (main && h > 120 && r.chance(0.35)) {
      const p = pk.find(r, 1.6, 1.6, 0.6, 8, [tw * 0.2, -td * 0.34, tw * 0.34, td * 0.34]);
      if (p) { const [px, pz] = at(p[0], p[1]); place('frustum', px, pz, 1.6, r.range(14, 32), 1.6, rot, '#cfd8dc', S.CONCRETE, 3, { yBase: top, margin: -1 }); }
    }
    if (main && h > 150 && r.chance(0.3) && pk.free(0, 0, 4, 4)) {
      place('frustum', x, z, 4, r.range(25, 50), 4, rot, '#e3e8ec', S.CONCRETE, 3, { yBase: top, margin: -1 });
      pk.block(0, 0, 4, 4);
    }

    // ---- the kit (near-detail layer)
    // rooftop units: the offices' heavy plant, one or two on the flats (a podium carries the tower's share, a
    // terrace a small unit or two); each with a duct run to the penthouse when it stands in line with one (a
    // straight run to its wall), else a short duct into a roof curb
    const nRtu = terrace ? clamp(Math.round(area / 600 + r.range(0, 1.4)), 0, 3)
      : office || podium ? clamp(Math.round(area / 200 + r.range(0, 2)), 1, 9) : resi ? clamp(Math.round(area / 450), 1, 3) : clamp(Math.round(area / 320), 1, 5);
    for (let i = 0; i < nRtu; i++) {
      const w = r.range(2.2, 5.0) * (terrace ? 0.7 : 1), d = r.range(1.8, 3.2) * (terrace ? 0.7 : 1), hh = r.range(1.3, 2.4) * (terrace ? 0.8 : 1);
      const p = pk.find(r, w, d, 0.8, 10);
      if (!p) break;
      item('roofbig', p[0], p[1], w, hh, d, r.chance(0.75) ? plantCol : plantCol2, S.PLANT);
      const dx = pent ? pent[0] - p[0] : 0, dz = pent ? pent[1] - p[1] : 0;
      const inZ = pent !== null && Math.abs(dz) <= pent[3] / 2 - 0.4, inX = pent !== null && Math.abs(dx) <= pent[2] / 2 - 0.4;
      if (pent && r.chance(0.75) && inZ && Math.abs(dx) > w / 2 + pent[2] / 2 + 0.8) {
        const from = p[0] + Math.sign(dx) * w / 2, to = pent[0] - Math.sign(dx) * pent[2] / 2;
        const len = Math.abs(to - from), mx = (from + to) / 2;
        if (pk.free(mx, p[1], len, 0.55)) { item('roof', mx, p[1], len, 0.55, 0.55, ductCol, S.DUCT, rot, y + 0.3); pk.block(mx, p[1], len, 0.55); }
      } else if (pent && r.chance(0.75) && inX && Math.abs(dz) > d / 2 + pent[3] / 2 + 0.8) {
        const from = p[1] + Math.sign(dz) * d / 2, to = pent[1] - Math.sign(dz) * pent[3] / 2;
        const len = Math.abs(to - from), mz = (from + to) / 2;
        if (pk.free(p[0], mz, 0.55, len)) { item('roof', p[0], mz, 0.55, 0.55, len, ductCol, S.DUCT, rot, y + 0.3); pk.block(p[0], mz, 0.55, len); }
      } else if (r.chance(0.45)) {
        // duct elbow into a curb beside the unit
        const sx = Math.sign(dx) || (r.chance(0.5) ? 1 : -1);
        const lx = p[0] + sx * (w / 2 + 0.9);
        if (pk.free(lx, p[1], 1.4, 0.55)) { item('roof', lx, p[1], 1.5, 0.55, 0.55, ductCol, S.DUCT, rot, y + 0.3); item('roof', lx + sx * 0.45, p[1], 0.6, 0.8, 0.6, ductCol, S.DUCT); pk.block(lx, p[1], 1.4, 0.55); }
      }
    }
    // condenser rows on the flats: small units side by side
    if (resi && area > 120 && r.chance(0.7)) {
      const n = clamp(Math.round(area / 90), 2, 10), alongX = tw >= td;
      const rowW = alongX ? n * 1.15 : 0.9, rowD = alongX ? 0.9 : n * 1.15;
      const p = pk.find(r, rowW, rowD, 0.5, 8);
      if (p) for (let i = 0; i < n; i++) {
        if (r.chance(0.15)) continue;   // a missing unit or two
        const o = (i - (n - 1) / 2) * 1.15;
        item('roof', p[0] + (alongX ? o : 0), p[1] + (alongX ? 0 : o), 0.85, r.range(0.6, 0.9), 0.4, plantCol, S.PLANT);
      }
    }
    // vents and exhaust stacks, a rain cap on some, an odd tall flue on the offices
    const nVent = clamp(Math.round(area / (terrace ? 260 : 130) + r.range(0, 3)), terrace ? 1 : 2, 12);
    for (let i = 0; i < nVent; i++) {
      const dia = r.range(0.4, 1.0), hh = r.range(0.9, 3.2) * (office && !terrace && r.chance(0.15) ? 2.5 : 1);
      const p = pk.find(r, dia, dia, 0.4, 8);
      if (!p) break;
      item('roofcyl', p[0], p[1], dia, hh, dia, ductCol, S.DUCT);
      if (r.chance(0.45)) item('roofcyl', p[0], p[1], dia * 1.7, 0.22, dia * 1.7, ductCol, S.DUCT, rot, y + hh - 0.02);
    }
    // antenna masts (a corner spot) and a dish on a post
    if (r.chance(terrace ? 0.25 : office ? 0.75 : 0.45)) {
      const cx = r.chance(0.5) ? 1 : -1, cz = r.chance(0.5) ? 1 : -1;
      const p = pk.find(r, 0.6, 0.6, 0.5, 8, [Math.min(cx * tw * 0.2, cx * tw * 0.42), Math.min(cz * td * 0.2, cz * td * 0.42), Math.max(cx * tw * 0.2, cx * tw * 0.42), Math.max(cz * td * 0.2, cz * td * 0.42)]);
      if (p) {
        item('roof', p[0], p[1], 0.14, r.range(4, 9) * (h > 120 ? 1.4 : 1), 0.14, railCol, S.DUCT);
        if (r.chance(0.6)) {
          const q = pk.find(r, 2.0, 2.0, 0.4, 6);
          if (q) { item('roof', q[0], q[1], 0.12, 1.3, 0.12, railCol, S.DUCT); item('roofcyl', q[0], q[1], r.range(1.4, 2.4), 0.3, r.range(1.4, 2.4), DISH_C, S.PLANT, rot + r.range(0, 3), y + 1.3); }
        }
      }
    }
    // solar rows on a fifth of the roofs below 150 m (the very tall roofs carry plant, not panels); on a terrace
    // the rows run along the free side of the upper tier
    if ((h < 150 || opts.tier) && area > 320 && r.chance(terrace ? 0.3 : 0.22)) {
      const alongX = tw >= td;
      const rows = clamp(Math.floor(Math.min(tw, td) / 3.4), 2, 6), len = clamp(Math.max(tw, td) * r.range(0.4, 0.7), 6, 24);
      const blockW = alongX ? len : rows * 2.6, blockD = alongX ? rows * 2.6 : len;
      let p = pk.find(r, blockW, blockD, 0.8, 8);
      let n = rows;
      if (!p && terrace) { n = 1; p = pk.find(r, alongX ? len * 0.6 : 1.9, alongX ? 1.9 : len * 0.6, 0.6, 8); }
      if (p) for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * 2.6, l = n === 1 ? len * 0.6 : len;
        item('roofbig', p[0] + (alongX ? 0 : o), p[1] + (alongX ? o : 0), alongX ? l : 1.9, 0.42, alongX ? 1.9 : l, SOLAR_C, S.SOLAR);
      }
    }
    // skylights on the lower roofs and over the retail of a podium: a few glazed boxes, a long ridge light on the big ones
    if (((!glassy && h < 70) || podium) && r.chance(podium ? 0.6 : 0.45)) {
      if (area > 800 && r.chance(0.5)) {
        const alongX = tw >= td, len = clamp(Math.max(tw, td) * r.range(0.3, 0.55), 8, 16);
        const p = pk.find(r, alongX ? len : 1.7, alongX ? 1.7 : len, 0.8, 8);
        if (p) item('roofbig', p[0], p[1], alongX ? len : 1.7, 0.9, alongX ? 1.7 : len, SKY_C, S.SKYLIGHT);
      } else {
        const n = r.int(1, 3);
        for (let i = 0; i < n; i++) { const s = r.range(1.8, 3.4); const p = pk.find(r, s, s, 0.6, 6); if (p) item('roofbig', p[0], p[1], s, 0.7, s, SKY_C, S.SKYLIGHT); }
      }
    }
    // pipe runs along an edge
    const nPipe = r.int(0, office && !terrace ? 3 : 2);
    for (let i = 0; i < nPipe; i++) {
      const alongX = r.chance(0.5), len = r.range(4, Math.max(5, (alongX ? tw : td) * (terrace ? 0.4 : 0.6)));
      const p = pk.find(r, alongX ? len : 0.22, alongX ? 0.22 : len, 0.3, 6);
      if (p) item('roof', p[0], p[1], alongX ? len : 0.2, 0.2, alongX ? 0.2 : len, r.chance(0.5) ? ductCol : TANK_LEG_C, S.DUCT, rot, y + 0.15);
    }
    // railing along the parapet where the facade has no coping (the masonry families' coping is a trim); a
    // terrace or podium roof is walked on and railed more often than not
    const coping = !glassy && fam.style !== S.INDUSTRIAL && fam.style !== S.CONCRETE;
    if (!round && (!coping || opts.tier) && r.chance(opts.tier ? 0.8 : 0.65) && tw > 8 && td > 8) {
      const inset = coping ? 0.7 : 0.25;   // inside the coping trim where there is one
      item('roof', 0, -td / 2 + inset, tw - inset * 2, 1.1, 0.06, railCol, S.RAIL);
      item('roof', 0, td / 2 - inset, tw - inset * 2, 1.1, 0.06, railCol, S.RAIL);
      item('roof', -tw / 2 + inset, 0, 0.06, 1.1, td - inset * 2, railCol, S.RAIL);
      item('roof', tw / 2 - inset, 0, 0.06, 1.1, td - inset * 2, railCol, S.RAIL);
    }
  };

  /** The kit of a walk-up, podium liner or commercial roof. Sized to read from the air: the RTUs are 1.8-3.2 m
   *  boxes (roofbig, drawn to 1.6 km) in a count that follows the roof area, a solar row or a cell-antenna cluster
   *  on some, then the near layer (condensers, vents with rain caps, a hatch, a TV mast, the odd skylight). `block`
   *  lists what already stands on the roof (a bulkhead, a penthouse, a tank) in the roof's frame. */
  const addSmallRoofKit = (r: Rng, x: number, z: number, tw: number, td: number, top: number, rot: number, block: readonly (readonly [number, number, number, number])[] = []) => {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
    const pk = new RoofPacker(tw / 2 - 1.0, td / 2 - 1.0);
    for (const b of block) pk.block(b[0], b[1], b[2] + 0.6, b[3] + 0.6);
    const y = top - 0.05;
    const item = (kind: Kind, lx: number, lz: number, w: number, hh: number, d: number, col: THREE.Color, style: number, yb = y) => {
      const [px, pz] = at(lx, lz);
      kit(kind, px, yb, pz, w, hh, d, rot, col, style);
    };
    const plantCol = r.pick(PLANT_C), ductCol = r.pick(DUCT_C);
    const area = tw * td;
    // rooftop units with a short duct to the nearest bulkhead side
    const nRtu = area > 180 ? clamp(Math.round(area / 260 + r.range(-0.5, 1.0)), 1, 5) : r.chance(0.5) ? 1 : 0;
    for (let i = 0; i < nRtu; i++) {
      const w = r.range(1.8, 3.2), d = r.range(1.4, 2.4);
      const p = pk.find(r, w, d, 0.7, 8);
      if (!p) break;
      item('roofbig', p[0], p[1], w, r.range(1.0, 1.7), d, plantCol, S.PLANT);
      if (r.chance(0.5)) { const q = pk.find(r, 0.5, 2.5, 0.2, 4, [p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4]); if (q) item('roof', q[0], q[1], 0.5, 0.5, 2.5, ductCol, S.DUCT, y + 0.4); }
    }
    // a solar row or two on a fifth of the flats
    if (area > 220 && r.chance(0.2)) {
      const along = tw >= td;
      const len = Math.min((along ? tw : td) * 0.6, r.range(6, 14));
      for (let k = 0, n = r.int(1, 3); k < n; k++) {
        const p = pk.find(r, along ? len : 1.7, along ? 1.7 : len, 0.5, 6);
        if (p) item('roofbig', p[0], p[1], along ? len : 1.7, 0.5, along ? 1.7 : len, SOLAR_C, S.SOLAR);
      }
    }
    // cell antennas: a mast with a panel cluster, or three panels on the parapet corner
    if (area > 200 && r.chance(0.18)) {
      const p = pk.find(r, 1.6, 1.6, 0.4, 6);
      if (p) { item('roof', p[0], p[1], 0.18, r.range(4, 7), 0.18, ductCol, S.DUCT); item('roofbig', p[0], p[1], 1.6, 1.3, 1.6, DISH_C, S.PLANT, y + r.range(3.2, 5.0)); }
    }
    const nAc = clamp(Math.round(area / 140 + r.range(-1, 1)), 0, 5);
    for (let i = 0; i < nAc; i++) { const p = pk.find(r, 0.9, 0.5, 0.4, 6); if (p) item('roof', p[0], p[1], 0.9, r.range(0.6, 0.9), 0.45, plantCol, S.PLANT); }
    const nVent = clamp(Math.round(area / 220 + r.range(0, 2)), 1, 4);
    for (let i = 0; i < nVent; i++) { const dia = r.range(0.35, 0.7); const p = pk.find(r, dia, dia, 0.3, 6); if (p) item('roofcyl', p[0], p[1], dia, r.range(0.8, 2.0), dia, ductCol, S.DUCT); }
    if (r.chance(0.6)) { const p = pk.find(r, 0.9, 0.9, 0.3, 6); if (p) item('roof', p[0], p[1], 0.9, 0.5, 0.9, r.pick(GREY_C), S.CONCRETE); }   // roof hatch
    if (r.chance(0.4)) { const p = pk.find(r, 0.4, 0.4, 0.3, 6); if (p) item('roof', p[0], p[1], 0.1, r.range(2.5, 5), 0.1, ductCol, S.DUCT); }
    if (area > 300 && r.chance(0.3)) { const sz = r.range(1.5, 2.6); const p = pk.find(r, sz, sz, 0.5, 6); if (p) item('roofbig', p[0], p[1], sz, 0.6, sz, SKY_C, S.SKYLIGHT); }
  };

  /** A box face in its own frame: outward normal, tangent along it and its length (0 -z, 1 +z, 2 -x, 3 +x). */
  const faceFrame = (face: number, w: number, d: number) =>
    face === 0 ? { nx: 0, nz: -1, tx: 1, tz: 0, len: w, half: d / 2 } : face === 1 ? { nx: 0, nz: 1, tx: 1, tz: 0, len: w, half: d / 2 }
      : face === 2 ? { nx: -1, nz: 0, tx: 0, tz: 1, len: d, half: w / 2 } : { nx: 1, nz: 0, tx: 0, tz: 1, len: d, half: w / 2 };

  /** Where a building meets the street (its `front` face, the one the shader draws the entrance / shopfronts on):
   *  a shop parade gets a continuous canopy over the pavement or a run of awnings in the shops' own colours; a
   *  tower lobby its entrance canopy (at the shader's canopy band); a residential walk-up a stoop and a hood over
   *  the door at the face's centre (where the shader puts the door when the front is given). The canopies are
   *  roofbig items (a 2.5 m slab and its shadow on the pavement read from the air); awnings and stoops are trims. */
  const groundFloor = (r: Rng, x: number, z: number, w: number, d: number, rot: number, face: number, fam: Family, h: number, shops: boolean) => {
    const f = faceFrame(face, w, d);
    const cr = Math.cos(rot), sr = Math.sin(rot);
    let g = -Infinity;
    for (const [px, pz] of corners(x, z, w, d, rot)) g = Math.max(g, map.heightAt(px, pz));
    /** an item `s` along the face from its centre, its inner edge `o` out from the face, `dep` deep, at `y` above ground */
    const item = (kind: Kind, s: number, o: number, len: number, dep: number, y: number, th: number, col: THREE.Color, style: number) => {
      const ox = f.nx * (f.half + o + dep / 2) + f.tx * s, oz = f.nz * (f.half + o + dep / 2) + f.tz * s;
      const bw = f.tx !== 0 ? len : dep, bd = f.tx !== 0 ? dep : len;
      kit(kind, x + ox * cr - oz * sr, g + y, z + ox * sr + oz * cr, bw, th, bd, rot, col, style);
    };
    const glassy = fam.style === S.GLASS_BLUE || fam.style === S.GLASS_GREEN || fam.style === S.STONE;
    const tower = (glassy || (fam.style === S.GRID && h > 40)) && h > 24 && f.len > 10;
    if (tower) {
      // the lobby's entrance canopy: a dark slab over the centre third of the face, at the shader's canopy band
      // (0.55 of a two-storey lobby on the towers over 60 m, 0.82 of the single storey otherwise), on slim posts
      const lobbyH = (h > 60 ? 2 : 1) * fam.floorH;
      const cy = (h > 60 ? 0.55 : 0.82) * lobbyH - 0.4;
      const cw = f.len * 0.28 + 1.0, dep = r.range(2.6, 4.0);
      item('roofbig', 0, 0, cw, dep, cy, 0.35, r.chance(0.6) ? CANOPY_DARK_C : CANOPY_PALE_C, S.CONCRETE);
      for (const s of [-cw / 2 + 0.4, cw / 2 - 0.4]) item('trim', s, dep - 0.35, 0.22, 0.22, 0, cy, TRIM_DARK, S.CONCRETE);
      return;
    }
    const walkup = fam.style === S.PUNCHED || fam.style === S.BALCONY || fam.style === S.DECO || fam.style === S.HOTEL || fam.style === S.BRICK || fam.style === S.GRID;
    if (!walkup || h <= 7) return;
    if (shops) {
      const k = r.next();
      if (k < 0.38) {
        // a continuous canopy over the pavement at the fascia line, its posts at the kerb every 6 m or so
        const dep = r.range(2.2, 3.0), y = fam.floorH * 0.76 - 0.4;
        item('roofbig', 0, 0, f.len - 0.6, dep, y, 0.28, r.chance(0.5) ? CANOPY_DARK_C : r.pick(CANOPY_C), S.CONCRETE);
        const n = Math.max(2, Math.round(f.len / 6.5));
        for (let i = 0; i < n; i++) item('trim', -f.len / 2 + 0.6 + (i + 0.5) * (f.len - 1.2) / n, dep - 0.3, 0.18, 0.18, 0, y, TRIM_DARK, S.CONCRETE);
      } else if (k < 0.8) {
        // awnings over the shop windows: one per 4-7 m, a few bays bare, each shop its own colour
        const y = fam.floorH * 0.66 - 0.4;
        let s = -f.len / 2 + 1.2;
        while (s + 3.2 < f.len / 2 - 0.6) {
          const aw = r.range(2.8, 4.4), pitch = aw + r.range(0.8, 3.0);
          if (s + aw > f.len / 2 - 0.6) break;
          if (r.chance(0.78)) item('trim', s + aw / 2, 0, aw, r.range(1.1, 1.5), y, 0.14, r.pick(AWNING_C), S.CONCRETE);
          s += pitch;
        }
      }
      // shopfront planters and an A-board are the street builder's; a step up to the corner shop's door here
      if (r.chance(0.3)) item('trim', (r.chance(0.5) ? -1 : 1) * (f.len / 2 - 2.2), 0, 1.8, 0.7, -0.05, 0.22, r.pick(GREY_C), S.CONCRETE);
      return;
    }
    // a residential entrance: stoop (three steps, on the masonry families a full stair) and a hood over the door
    const brick = fam.style === S.BRICK || fam.style === S.PUNCHED;
    const sw = brick ? r.range(2.2, 3.0) : r.range(1.8, 2.4), sd = brick ? r.range(1.4, 2.2) : r.range(0.9, 1.4);
    item('trim', 0, 0, sw, sd, -0.05, brick ? r.range(0.55, 1.0) : r.range(0.2, 0.4), r.pick(GREY_C), S.CONCRETE);
    if (brick) { item('trim', -sw / 2 - 0.15, 0, 0.3, sd, -0.05, 1.05, r.pick(GREY_C), S.CONCRETE); item('trim', sw / 2 + 0.15, 0, 0.3, sd, -0.05, 1.05, r.pick(GREY_C), S.CONCRETE); }
    if (r.chance(0.55)) item('trim', 0, 0, r.range(1.8, 2.6), r.range(0.9, 1.4), 2.55, 0.16, r.chance(0.5) ? CANOPY_DARK_C : TRIM_LIGHT, S.CONCRETE);
  };

  /** The largest rectangle of a `w` x `d` roof (centred frame) clear of the `blocks` on it, or null. */
  const largestFree = (w: number, d: number, blocks: readonly (readonly [number, number, number, number])[], minSide: number): [number, number, number, number] | null => {
    let cands: [number, number, number, number][] = [[0, 0, w, d]];
    for (const [bx, bz, bw, bd] of blocks) {
      const next: [number, number, number, number][] = [];
      for (const [cx, cz, cw, cd] of cands) {
        const x0 = cx - cw / 2, x1 = cx + cw / 2, z0 = cz - cd / 2, z1 = cz + cd / 2;
        const ox0 = bx - bw / 2 - 0.8, ox1 = bx + bw / 2 + 0.8, oz0 = bz - bd / 2 - 0.8, oz1 = bz + bd / 2 + 0.8;
        if (ox1 <= x0 || ox0 >= x1 || oz1 <= z0 || oz0 >= z1) { next.push([cx, cz, cw, cd]); continue; }
        if (ox0 > x0) next.push([(x0 + ox0) / 2, cz, ox0 - x0, cd]);
        if (ox1 < x1) next.push([(ox1 + x1) / 2, cz, x1 - ox1, cd]);
        if (oz0 > z0) next.push([cx, (z0 + oz0) / 2, cw, oz0 - z0]);
        if (oz1 < z1) next.push([cx, (oz1 + z1) / 2, cw, z1 - oz1]);
      }
      cands = next;
    }
    let best: [number, number, number, number] | null = null;
    for (const c of cands) if (Math.min(c[2], c[3]) >= minSide && (!best || c[2] * c[3] > best[2] * best[3])) best = c;
    return best;
  };

  /** The roof of a podium (the 3-8 storey base a tower rises from), the largest roof surfaces in the CBD and the
   *  ones that read blank from 200-500 m when left to the membrane: a parking deck (striped, its cars, ramp hood,
   *  light masts), an amenity deck (pavers, a pool and its deck, lawn, planters, a pergola, cabanas) on the
   *  residential towers' podiums, a plant yard (the tower's cooling towers and RTUs behind a screen) on the
   *  offices', or a green roof; the parapet rail all round, the plant packed in what is left. */
  const podiumRoof = (r: Rng, x: number, z: number, pw: number, pd: number, top: number, rot: number, ph: number, pfam: Family, towerFam: Family, block: readonly (readonly [number, number, number, number])[]) => {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
    const office = towerFam.style === S.GLASS_BLUE || towerFam.style === S.STONE || towerFam.style === S.GRID || towerFam.style === S.CONCRETE;
    const free = largestFree(pw, pd, block, 14);
    const k = r.next();
    const prog = !free ? 2 : k < (office ? 0.4 : 0.3) ? 0 : k < (office ? 0.55 : 0.75) ? 1 : k < 0.92 ? 2 : 3;
    const used: (readonly [number, number, number, number])[] = [...block];
    // the rail round the parapet (the podium is walked on whatever it carries)
    for (const [lx, lz, w, dd] of [[0, -pd / 2 + 0.4, pw - 0.8, 0.06], [0, pd / 2 - 0.4, pw - 0.8, 0.06], [-pw / 2 + 0.4, 0, 0.06, pd - 0.8], [pw / 2 - 0.4, 0, 0.06, pd - 0.8]] as const) {
      const [px, pz] = at(lx, lz);
      kit('roof', px, top - 0.05, pz, w, 1.1, dd, rot, r.pick(RAIL_C), S.RAIL);
    }
    if (prog === 0 && free) {
      // roof parking: the striped deck over the free rectangle, its cars, the ramp hood at the tower's side and a
      // lamp mast or two
      const [fx, fz, fw, fd] = [free[0], free[1], free[2] - 2.4, free[3] - 2.4];
      const [dx, dz] = at(fx, fz);
      const fill = r.range(0.45, 0.8);
      const dtop = place('box', dx, dz, fw, 0.12, fd, rot, ASPHALT_C, S.LOT, 3, { yBase: top - 0.02, margin: -1, variant: fill });
      if (dtop !== null) {
        lotCars(r, dx, dz, fw, fd, rot, dtop, fill);
        const along = fw >= fd;
        const [hx, hz] = at(fx + (along ? -fw / 2 + 5 : 0), fz + (along ? 0 : -fd / 2 + 5));
        place('box', hx, hz, along ? 8 : 6.5, 1.3, along ? 6.5 : 8, rot, r.pick(GREYS), S.CONCRETE, 3, { yBase: dtop - 0.4, margin: -1 });
        for (let i = 0, n = r.int(1, 3); i < n; i++) { const [mx, mz] = at(fx + r.range(-fw * 0.3, fw * 0.3), fz + r.range(-fd * 0.3, fd * 0.3)); place('frustum', mx, mz, 0.5, r.range(7, 10), 0.5, rot, '#c9ccce', S.CONCRETE, 3, { yBase: dtop, margin: -1 }); }
      }
      used.push([fx, fz, fw, fd]);
    } else if (prog === 1 && free) {
      // amenity deck: pavers over the free rectangle, a pool with its coping, a lawn, planters with hedges,
      // a pergola on posts and two cabana boxes; the residents' side of a Miami podium
      const [fx, fz, fw, fd] = [free[0], free[1], free[2] - 2.0, free[3] - 2.0];
      const [dx, dz] = at(fx, fz);
      const dtop = place('box', dx, dz, fw, 0.14, fd, rot, r.pick(['#d9d3c4', '#cfc9bb', '#c8c2b6']), S.PLAZA, 3, { yBase: top - 0.02, margin: -1 });
      if (dtop !== null) {
        const pk = new RoofPacker(fw / 2 - 1.0, fd / 2 - 1.0);
        const pwd = Math.min(fw * 0.5, r.range(10, 18)), pdd = Math.min(fd * 0.5, r.range(5, 9));
        const pool = pk.find(r, pwd + 2.0, pdd + 2.0, 1.0, 8);
        if (pool) {
          const [qx, qz] = at(fx + pool[0], fz + pool[1]);
          place('house', qx, qz, pwd, 0.3, pdd, rot, '#3fc4de', S.POOL, 3, { yBase: dtop - 0.05, form: 2, margin: -1 });
          pk.block(pool[0], pool[1], pwd + 2.0, pdd + 2.0);
          // sun loungers along one long side
          const side = r.chance(0.5) ? 1 : -1;
          for (let i = 0, n = Math.floor(pwd / 1.6); i < n; i++) { const [lx, lz] = at(fx + pool[0] - pwd / 2 + 0.8 + i * 1.6, fz + pool[1] + side * (pdd / 2 + 1.6)); kit('trim', lx, dtop, lz, 0.7, 0.35, 1.9, rot, r.pick(LOUNGER_C), S.CONCRETE); }
          pk.block(pool[0], pool[1] + side * (pdd / 2 + 1.6), pwd, 2.2);
        }
        // lawn
        const lw = Math.min(fw * 0.4, r.range(7, 14)), ld = Math.min(fd * 0.4, r.range(5, 10));
        const lawn = pk.find(r, lw + 0.6, ld + 0.6, 0.8, 8);
        if (lawn) { const [lx, lz] = at(fx + lawn[0], fz + lawn[1]); place('box', lx, lz, lw, 0.16, ld, rot, LAWN_C, S.LAWN, 3, { yBase: dtop - 0.06, margin: -1 }); pk.block(lawn[0], lawn[1], lw + 0.6, ld + 0.6); }
        // pergola: a slatted roof on four posts
        const perg = pk.find(r, 6, 4.5, 0.8, 8);
        if (perg) {
          const [gx, gz] = at(fx + perg[0], fz + perg[1]);
          kit('roof', gx, dtop + 2.8, gz, 5.6, 0.25, 4.1, rot, CANOPY_PALE_C, S.RAIL);
          for (const [sx, sz] of [[-2.6, -1.85], [2.6, -1.85], [2.6, 1.85], [-2.6, 1.85]]) { const [ux, uz] = at(fx + perg[0] + sx, fz + perg[1] + sz); kit('roof', ux, dtop, uz, 0.2, 2.8, 0.2, rot, TRIM_LIGHT, S.CONCRETE); }
          pk.block(perg[0], perg[1], 6, 4.5);
        }
        // cabanas, planters with hedges
        for (let i = 0, n = r.int(0, 2); i < n; i++) { const p = pk.find(r, 3.2, 3.2, 0.6, 6); if (p) { const [cx, cz] = at(fx + p[0], fz + p[1]); place('box', cx, cz, 3.0, 2.7, 3.0, rot, '#f1eee6', S.CONCRETE, 3, { yBase: dtop - 0.1, margin: -1 }); pk.block(p[0], p[1], 3.2, 3.2); } }
        for (let i = 0, n = r.int(3, 8); i < n; i++) {
          const along = r.chance(0.5), len = r.range(3, 8);
          const p = pk.find(r, along ? len : 1.0, along ? 1.0 : len, 0.5, 6);
          if (!p) continue;
          const [hx, hz] = at(fx + p[0], fz + p[1]);
          kit('roof', hx, dtop - 0.02, hz, along ? len : 0.9, 0.5, along ? 0.9 : len, rot, PLANTER_C, S.CONCRETE);
          kit('roof', hx, dtop + 0.45, hz, along ? len - 0.2 : 0.7, r.range(0.7, 1.3), along ? 0.7 : len - 0.2, rot, HEDGE_C, S.LAWN);
        }
      }
      used.push([fx, fz, fw, fd]);
    } else if (prog === 3 && free) {
      // green roof: sedum / turf over the free rectangle with a paver path across it
      const [fx, fz, fw, fd] = [free[0], free[1], free[2] - 2.4, free[3] - 2.4];
      const [dx, dz] = at(fx, fz);
      const gtop = place('box', dx, dz, fw, 0.16, fd, rot, r.pick(GREEN_ROOF_C), S.LAWN, 3, { yBase: top - 0.02, margin: -1 });
      if (gtop !== null) { const along = fw >= fd; place('box', dx, dz, along ? fw : 1.6, 0.14, along ? 1.6 : fd, rot, PATH_C, S.PLAZA, 3, { yBase: gtop - 0.06, margin: -1 }); }
      used.push([fx, fz, fw, fd]);
    }
    // the plant: the tower's share on a plant-yard podium (the full podium tier), a small kit on the rest
    if (prog === 2) addRoofDetail(r, x, z, pw, pd, top, rot, ph, pfam, { tier: 'podium', block: used });
    else addSmallRoofKit(r, x, z, pw, pd, top, rot, used);
  };

  /** Massing recipes for towers. Returns the roof height of the main body. */
  const buildTower = (r: Rng, x: number, z: number, rot: number, fw: number, fd: number, h: number, fam: Family, recipe: number, detail = true, pastel = -1, front?: number): number | null => {
    const lk = look(fam, r, pastel);
    const o: PlaceOpts = { lit: lk.lit, warm: lk.warm, variant: lk.variant, front };
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
    let top: number | null = null;
    let tw = fw, td = fd;
    // every roof surface of a massing gets its kit: the tiers of a setback, a podium, the lower bar of a pair, the
    // ring around a crown; `block` is what stands on that surface, in its own frame
    const ring = (rx: number, rz: number, w: number, d: number, rtop: number | null, block: RoofOpts['block'], tier: RoofOpts['tier'], hh = h) => {
      if (rtop !== null) addRoofDetail(r, rx, rz, w, d, rtop, rot, hh, fam, { tier, block });
    };
    switch (recipe) {
      case 1: {
        // setbacks: three tiers, the two lower ones terraces around the tier above
        const t2 = r.range(0.72, 0.85), t3 = r.range(0.5, 0.65);
        const top1 = place('box', x, z, fw, h * r.range(0.5, 0.62), fd, rot, lk.tint, fam.style, fam.floorH, o);
        const top2 = place('box', x, z, fw * t2, h * r.range(0.78, 0.88), fd * t2, rot, lk.tint, fam.style, fam.floorH, o);
        top = place('box', x, z, fw * t3, h, fd * t3, rot, lk.tint, fam.style, fam.floorH, o);
        ring(x, z, fw, fd, top1, [[0, 0, fw * t2, fd * t2]], 'terrace');
        ring(x, z, fw * t2, fd * t2, top2, [[0, 0, fw * t3, fd * t3]], 'terrace');
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
        // L-shape: two overlapping bars; the taller bar's roof is the main one (the kit used to be laid at the
        // lower bar's height under the taller bar's centre, i.e. inside it), the lower bar's free end a terrace
        const a = at(-fw * 0.2, 0), b = at(fw * 0.15, -fd * 0.22);
        top = place('box', a[0], a[1], fw * 0.6, h, fd, rot, lk.tint, fam.style, fam.floorH, o);
        const hb = h * r.range(0.6, 1.0);
        const topB = place('box', b[0], b[1], fw * 0.7, hb, fd * 0.56, rot, lk.tint, fam.style, fam.floorH, o);
        if (topB !== null && h - hb > 1.5) ring(b[0], b[1], fw * 0.7, fd * 0.56, topB, [[-fw * 0.35, fd * 0.22, fw * 0.6, fd]], 'terrace', hb);
        tw = fw * 0.6; td = fd;
        break;
      }
      case 4: {
        // twin towers on a shared base, joined by a sky bridge; both roofs carry a full kit
        const gap = fw * 0.18, tw1 = fw * 0.41;
        const a = at(-(tw1 + gap) / 2, 0), b = at((tw1 + gap) / 2, 0);
        const topA = place('box', a[0], a[1], tw1, h, fd * 0.8, rot, lk.tint, fam.style, fam.floorH, o);
        top = place('box', b[0], b[1], tw1, h * r.range(0.85, 1.0), fd * 0.8, rot, lk.tint, fam.style, fam.floorH, o);
        place('box', x, z, gap + 2, 4, fd * 0.4, rot, '#dfe4e8', S.CONCRETE, 3, { yBase: (top ?? 0) - h * 0.45, margin: -1 });
        ring(a[0], a[1], tw1, fd * 0.8, topA, undefined, undefined);
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
        // stepped art-deco crown with a spire; the wider steps are terraces
        const tiers = [[1.0, 0.55], [0.86, 0.72], [0.7, 0.88], [0.5, 1.0]];
        for (let i = 0; i < tiers.length; i++) {
          const [sc, hh] = tiers[i];
          top = place('box', x, z, fw * sc, h * hh, fd * sc, rot, lk.tint, fam.style, fam.floorH, o);
          if (i < tiers.length - 1 && (sc - tiers[i + 1][0]) * Math.min(fw, fd) * 0.5 >= 3) ring(x, z, fw * sc, fd * sc, top, [[0, 0, fw * tiers[i + 1][0], fd * tiers[i + 1][0]]], 'terrace');
        }
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
      case 9: {
        // podium + tower: a 3-5 storey base filling the lot with the tower standing off-centre on it
        const pw = fw * r.range(1.25, 1.5), pd = fd * r.range(1.2, 1.45), ph = fam.floorH * r.int(3, 5) + 1;
        const pk = fam.style === S.STONE || GLASSY_STYLES.has(fam.style) ? look(FAM.punched, r, pastel) : lk;
        const podTop = place('box', x, z, pw, ph, pd, rot, pk.tint, fam.style === S.STONE || GLASSY_STYLES.has(fam.style) ? S.PUNCHED : fam.style, fam.floorH, { lit: pk.lit, warm: pk.warm, variant: pk.variant });
        tw = fw * 0.72; td = fd * 0.72;
        const ox = (pw - tw) * 0.5 * r.range(-0.8, 0.8), oz = (pd - td) * 0.5 * r.range(-0.8, 0.8);
        const [tx, tz] = at(ox, oz);
        top = place('box', tx, tz, tw, h, td, rot, lk.tint, fam.style, fam.floorH, o);
        // the podium roof carries the tower's plant and the skylights of the retail below, around the tower's foot
        ring(x, z, pw, pd, podTop, [[ox, oz, tw, td]], 'podium');
        x = tx; z = tz;
        break;
      }
      case 10: {
        // slab with a rounded end: a bar of flats closed by a half-drum stair / lift tower of the same height
        tw = Math.min(fw, fd) * 0.62; td = Math.max(fw, fd) * 1.05;
        const end = r.chance(0.5) ? 1 : -1;
        top = place('box', x, z, tw, h, td, rot, lk.tint, fam.style, fam.floorH, o);
        const [ex, ez] = at(0, end * td * 0.5);
        place('cyl', ex, ez, tw, h, tw, rot, lk.tint, fam.style, fam.floorH, o);
        break;
      }
      case 11: {
        // glass lantern crown with a spire: the office box stops a few floors short and a small lit glass box tops
        // it; the roof around the lantern is a terrace of plant
        top = place('box', x, z, fw, h * 0.93, fd, rot, lk.tint, fam.style, fam.floorH, o);
        if (top !== null) {
          const g = look(FAM.glassBlue, r);
          ring(x, z, fw, fd, top, [[0, 0, fw * 0.5, fd * 0.5]], 'terrace');
          top = place('box', x, z, fw * 0.5, h * 0.07 + 5, fd * 0.5, rot, g.tint, S.GLASS_BLUE, 3.9, { lit: 0.85, warm: 0.3, variant: g.variant, yBase: top - 0.1, margin: -1 });
          place('frustum', x, z, 2.4, r.range(10, 22), 2.4, rot, '#dfe4e8', S.CONCRETE, 3, { yBase: top ?? 0, margin: -1 });
          detail = false;
        }
        break;
      }
      case 12: {
        // sloped crown: the top storeys lean off to one side (a shear prism of the same facade)
        top = place('box', x, z, fw, h * 0.86, fd, rot, lk.tint, fam.style, fam.floorH, o);
        if (top !== null) { place('shear', x, z, fw, h * 0.14 + 3, fd, rot + (r.chance(0.5) ? 0 : Math.PI), lk.tint, fam.style, fam.floorH, { ...o, yBase: top - 0.1, margin: -1 }); detail = false; }
        break;
      }
      case 13: {
        // asymmetric pair: two bars sharing a party wall, one carrying on higher than the other; each roof its own
        const a = at(-fw * 0.25, 0), b = at(fw * 0.25, 0);
        const lo = h * r.range(0.55, 0.78);
        top = place('box', a[0], a[1], fw * 0.5, h, fd, rot, lk.tint, fam.style, fam.floorH, o);
        const fdb = fd * r.range(0.8, 1.0);
        const topB = place('box', b[0], b[1], fw * 0.5, lo, fdb, rot, lk.tint, fam.style, fam.floorH, o);
        ring(b[0], b[1], fw * 0.5, fdb, topB, undefined, undefined, lo);
        x = a[0]; z = a[1]; tw = fw * 0.5; td = fd;
        break;
      }
      case 14: {
        // cross plan: two thin slabs through each other, the shorter one a storey or two lower; its two ends are
        // terraces either side of the taller slab
        const s1 = Math.min(fw, fd) * 0.45;
        top = place('box', x, z, s1, h, fd, rot, lk.tint, fam.style, fam.floorH, o);
        const topLow = place('box', x, z, fw, h * r.range(0.86, 0.96), s1, rot, lk.tint, fam.style, fam.floorH, o);
        ring(x, z, fw, s1, topLow, [[0, 0, s1, fd]], 'terrace');
        tw = s1; td = fd;
        break;
      }
      case 15: {
        // tiara crown: the tower carries on as four corner fins around a recessed lit lantern
        top = place('box', x, z, fw, h * 0.9, fd, rot, lk.tint, fam.style, fam.floorH, o);
        if (top !== null) {
          const finH = h * 0.1 + 6;
          const fins: [number, number, number, number][] = [];
          for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
            const [px, pz] = at(sx * (fw * 0.5 - 1.6), sz * (fd * 0.5 - 1.6));
            place('box', px, pz, 3.2, finH, 3.2, rot, lk.tint, fam.style, fam.floorH, { ...o, yBase: top - 0.1, margin: -1 });
            fins.push([sx * (fw * 0.5 - 1.6), sz * (fd * 0.5 - 1.6), 3.2, 3.2]);
          }
          const g = look(FAM.glassBlue, r);
          ring(x, z, fw, fd, top, [[0, 0, fw * 0.55, fd * 0.55], ...fins], 'terrace');
          top = place('box', x, z, fw * 0.55, finH * 0.7, fd * 0.55, rot, g.tint, S.GLASS_BLUE, 3.9, { lit: 0.9, warm: 0.3, variant: g.variant, yBase: top - 0.1, margin: -1 });
          detail = false;
        }
        break;
      }
      case 16: {
        // slab with a slot: two slabs a bay apart, tied by a bridge storey at the top and a sky lobby half way;
        // both slab roofs carry a kit
        const slot = 6, sw = Math.max(10, (fw - slot) * 0.5);
        const a = at(-(sw + slot) * 0.5, 0), b = at((sw + slot) * 0.5, 0);
        top = place('box', a[0], a[1], sw, h, fd, rot, lk.tint, fam.style, fam.floorH, o);
        const topB = place('box', b[0], b[1], sw, h, fd, rot, lk.tint, fam.style, fam.floorH, o);
        ring(b[0], b[1], sw, fd, topB, undefined, undefined);
        if (top !== null) {
          place('box', x, z, slot + 2, fam.floorH * 2, fd * 0.9, rot, '#dfe4e8', S.GRID, fam.floorH, { lit: 0.8, warm: 0.4, variant: 0.5, yBase: top - fam.floorH * 2, margin: -1 });
          place('box', x, z, slot + 2, fam.floorH, fd * 0.8, rot, '#dfe4e8', S.CONCRETE, 3, { yBase: top - h * 0.5, margin: -1 });
        }
        x = a[0]; z = a[1]; tw = sw; td = fd;
        break;
      }
      default:
        top = place('box', x, z, fw, h, fd, rot, lk.tint, fam.style, fam.floorH, o);
    }
    if (top !== null && detail) {
      const [dx, dz] = recipe === 3 ? at(-fw * 0.2, 0) : recipe === 4 ? at((fw * 0.41 + fw * 0.18) / 2, 0) : [x, z];
      addRoofDetail(r, dx, dz, tw, td, top, rot, h, fam, { round: recipe === 7 });
    }
    return top;
  };

  // ------------------------------------------------------------- landmark towers (downtown skyline hierarchy)
  const dt = map.districts.find((x) => x.id === 'downtown')!;
  const bk = map.districts.find((x) => x.id === 'brickell')!;
  const landmarkIn = (dd: District, name: string, lx: number, lz: number, build: (x: number, z: number, g: number) => number) => {
    const c = Math.cos(dd.rot), s = Math.sin(dd.rot);
    const x = dd.cx + lx * c - lz * s, z = dd.cz + lx * s + lz * c;
    const g = map.heightAt(x, z);
    if (g < 1) return;
    const h = build(x, z, g);
    landmarkPositions.push({ x, z, h, name });
    markOccupied(x, z, 46);
  };
  const landmark = (name: string, lx: number, lz: number, build: (x: number, z: number, g: number) => number) => landmarkIn(dt, name, lx, lz, build);
  /** A landmark's roof surface (a terrace of its setbacks, its podium, a flat crown): the kit from its own seeded rng. */
  const lmRoof = (name: string, x: number, z: number, w: number, d: number, top: number, rot: number, h: number, fam: Family, opts: RoofOpts = {}) =>
    addRoofDetail(new Rng(`roof:${name}:${top.toFixed(0)}`), x, z, w, d, top, rot, h, fam, opts);
  // Crowns are sized to survive 3-5 km: spires start 8-10 m wide at the base, lanterns are 12-18 m glass boxes.
  landmark('Meridian Tower', 120, -80, (x, z, g) => {
    const o = { lit: 0.5, warm: 0.3, variant: 0.2 };
    place('box', x, z, 46, 150, 46, 0.1, '#9fb6c8', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 38, 230, 38, 0.1, '#9fb6c8', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 28, 285, 28, 0.1, '#b0c4d2', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 18, 12, 18, 0.1, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 285, lit: 0.9, warm: 0.2, variant: 0.5, margin: -1 });
    place('frustum', x, z, 9, 64, 9, 0.1, '#e8eef2', S.CONCRETE, 3, { yBase: g + 297, margin: -1 });
    lmRoof('Meridian', x, z, 46, 46, g + 150, 0.1, 361, FAM.glassBlue, { tier: 'terrace', block: [[0, 0, 38, 38]] });
    lmRoof('Meridian', x, z, 38, 38, g + 230, 0.1, 361, FAM.glassBlue, { tier: 'terrace', block: [[0, 0, 28, 28]] });
    lmRoof('Meridian', x, z, 28, 28, g + 285, 0.1, 361, FAM.glassBlue, { tier: 'terrace', block: [[0, 0, 18, 18]] });
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
  // the three tallest are spaced (Meridian centre-east, Bahía One centre, Faro west-centre) instead of standing
  // within 300 m of one another, so the skyline has three peaks with the fill's tail between them
  landmark('Faro Bahía', -430, -120, (x, z, g) => {
    place('cyl', x, z, 40, 240, 40, 0, '#e8ebe4', S.GLASS_GREEN, 3.8, { lit: 0.45, warm: 0.4, variant: 0.6 });
    // lighthouse brim, glass lantern, conical roof and mast
    place('cyl', x, z, 50, 10, 50, 0, '#e8eef2', S.CONCRETE, 3, { yBase: g + 232, margin: -1 });
    place('cyl', x, z, 24, 16, 24, 0, '#cfe0ec', S.GLASS_BLUE, 3.9, { yBase: g + 242, lit: 0.95, warm: 0.3, variant: 0.4, margin: -1 });
    place('frustum', x, z, 28, 18, 28, 0.4, '#dfe4e8', S.CONCRETE, 3, { yBase: g + 258, margin: -1 });
    place('frustum', x, z, 3, 30, 3, 0, '#cfd8dc', S.CONCRETE, 3, { yBase: g + 275, margin: -1 });
    return 305;
  });
  landmark('Twin Palms A', 40, 210, (x, z, g) => {
    place('box', x, z, 30, 182, 56, 0.05, '#efe4cf', S.BALCONY, 3.3, { lit: 0.3, warm: 0.85, variant: 0.4 });
    lmRoof('Twin Palms A', x, z, 30, 56, g + 182, 0.05, 182, FAM.balcony);
    return 182;
  });
  landmark('Twin Palms B', 110, 210, (x, z, g) => {
    place('box', x, z, 30, 182, 56, 0.05, '#efe4cf', S.BALCONY, 3.3, { lit: 0.35, warm: 0.85, variant: 0.4 });
    place('box', x - 35, z, 44, 6, 12, 0.05, '#dfe4e8', S.CONCRETE, 3.3, { yBase: g + 118, margin: -1 });
    lmRoof('Twin Palms B', x, z, 30, 56, g + 182, 0.05, 182, FAM.balcony);
    return 182;
  });
  landmark('The Sail', -60, -250, (x, z, g) => {
    place('shear', x, z, 60, 205, 44, 0.9, '#b0c4d2', S.GLASS_BLUE, 3.9, { lit: 0.45, warm: 0.3, variant: 0.9 });
    // the mast-like blade above the leaning body
    place('box', x, z, 3.5, 42, 24, 0.9, '#e8eef2', S.CONCRETE, 3, { yBase: g + 204, margin: -1 });
    return 247;
  });
  landmark('Terraces', 260, 120, (x, z, g) => {
    // five stepped office bars; each step's roof is a terrace beside the next bar, the last a full roof
    for (let i = 0; i < 5; i++) {
      const w = 60 - i * 8, hh = 45 + i * 28;
      place('box', x + i * 6, z - i * 4, w, hh, 40, 0.0, '#f7f5f0', S.GRID, 3.5, { lit: 0.35, warm: 0.5, variant: 0.3 });
      if (i < 4) lmRoof('Terraces', x + i * 6, z - i * 4, w, 40, g + hh, 0.0, 160, FAM.grid, { tier: 'terrace', block: [[6, -4, w - 8, 40]] });
      else lmRoof('Terraces', x + i * 6, z - i * 4, w, 40, g + hh, 0.0, 160, FAM.grid);
    }
    return 160;
  });
  landmark('Crown Plaza', -300, -180, (x, z, g) => {
    place('box', x, z, 42, 200, 42, 0.2, '#3a3633', S.STONE, 3.8, { lit: 0.55, warm: 0.4, variant: 0.5 });
    place('box', x, z, 20, 10, 20, 0.2, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 200, lit: 0.9, warm: 0.6, variant: 0.5, margin: -1 });
    for (let i = 0; i < 4; i++) {
      const a = 0.2 + (i * Math.PI) / 2;
      place('box', x + Math.cos(a) * 14, z + Math.sin(a) * 14, 3, 44, 14, a, '#e8eef2', S.CONCRETE, 3, { yBase: g + 198, margin: -1 });
    }
    // the roof between the lantern and the four fins (the fins stand at local (14, 0), (0, 14), ... of the yawed box)
    lmRoof('Crown Plaza', x, z, 42, 42, g + 200, 0.2, 244, FAM.stone, { tier: 'terrace', block: [[0, 0, 20, 20], [14, 0, 3, 14], [0, 14, 14, 3], [-14, 0, 3, 14], [0, -14, 14, 3]] });
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
    lmRoof('Gateway', x, z, 76, 40, g + 170, 0.02, 170, FAM.grid);
    return 170;
  });
  landmark('Helix', 330, -240, (x, z, g) => {
    for (let i = 0; i < 12; i++) place('box', x, z, 34, 16.5, 34, i * 0.1, '#e6e2d6', S.GLASS_GREEN, 3.9, { yBase: g + i * 16, lit: 0.5, warm: 0.3, variant: 0.2 });
    lmRoof('Helix', x, z, 34, 34, g + 11 * 16 + 16.5, 1.1, 198, FAM.glassGreen);
    return 198;
  });
  landmark('Aquamarine', -380, 230, (x, z, g) => {
    const o = { lit: 0.55, warm: 0.2, variant: 0.6 };
    place('box', x, z, 18, 228, 62, 0.0, '#8fa9bd', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 62, 228, 18, 0.0, '#8fa9bd', S.GLASS_BLUE, 3.9, o);
    place('frustum', x, z, 24, 250, 24, 0.0, '#c2d0da', S.GLASS_BLUE, 3.9, o);
    // the four arms of the cross around the tapering core
    lmRoof('Aquamarine N', x, z, 18, 62, g + 228, 0.0, 250, FAM.glassBlue, { tier: 'terrace', block: [[0, 0, 24, 24]] });
    lmRoof('Aquamarine E', x, z, 62, 18, g + 228, 0.0, 250, FAM.glassBlue, { tier: 'terrace', block: [[0, 0, 24, 24]] });
    return 250;
  });
  // the bayfront wall (local +x faces the bay): the silhouettes the skyline views read first
  landmark('Bayside Slot', 470, -40, (x, z, g) => {
    // slab with a slot: two glass slabs 8 m apart, bridged by a lit sky lobby half way and two floors at the top
    const o = { lit: 0.5, warm: 0.3, variant: 0.6 };
    place('box', x - 17, z, 26, 196, 58, 0.03, '#a9bccb', S.GLASS_BLUE, 3.9, o);
    place('box', x + 17, z, 26, 196, 58, 0.03, '#a9bccb', S.GLASS_BLUE, 3.9, o);
    place('box', x, z, 10, 9, 54, 0.03, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 187, lit: 0.9, warm: 0.3, variant: 0.5, margin: -1 });
    place('box', x, z, 10, 5, 50, 0.03, '#dfe4e8', S.CONCRETE, 3, { yBase: g + 96, margin: -1 });
    lmRoof('Bayside Slot W', x - 17, z, 26, 58, g + 196, 0.03, 196, FAM.glassBlue);
    lmRoof('Bayside Slot E', x + 17, z, 26, 58, g + 196, 0.03, 196, FAM.glassBlue);
    return 196;
  });
  landmark('Ziggurat', 400, 170, (x, z, g) => {
    // stepped pastel setbacks, every tier's roof a terrace, a lit lantern on the last
    const tiers = [[64, 48], [52, 94], [42, 132], [32, 162], [22, 184]];
    for (let i = 0; i < tiers.length; i++) {
      const [w, h] = tiers[i];
      place('box', x, z, w, h, w * 0.85, 0.02, '#f2d9c4', S.DECO, 3.4, { lit: 0.35, warm: 0.8, variant: 0.7 });
      const nw = i < tiers.length - 1 ? tiers[i + 1][0] : 12;
      lmRoof('Ziggurat', x, z, w, w * 0.85, g + h, 0.02, 190, FAM.deco, { tier: 'terrace', block: [[0, 0, nw, i < tiers.length - 1 ? nw * 0.85 : 10]] });
    }
    place('box', x, z, 12, 6, 10, 0.02, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 184, lit: 0.9, warm: 0.6, variant: 0.5, margin: -1 });
    return 190;
  });
  landmark('Twin Sails', 520, -250, (x, z, g) => {
    // twin glass towers with tapered tops on a shared podium, one five floors taller
    const o = { lit: 0.5, warm: 0.25, variant: 0.4 };
    place('box', x, z, 92, 14, 60, 0.05, '#c9c4b8', S.PUNCHED, 3.5, { lit: 0.2, warm: 0.6, variant: 0.5 });
    place('box', x - 25, z, 30, 198, 40, 0.05, '#8fa9bd', S.GLASS_BLUE, 3.9, o);
    place('frustum', x - 25, z, 30, 24, 40, 0.05, '#8fa9bd', S.GLASS_BLUE, 3.9, { ...o, yBase: g + 198, margin: -1 });
    place('box', x + 25, z, 30, 176, 40, 0.05, '#8fa9bd', S.GLASS_BLUE, 3.9, o);
    place('frustum', x + 25, z, 30, 24, 40, 0.05, '#8fa9bd', S.GLASS_BLUE, 3.9, { ...o, yBase: g + 176, margin: -1 });
    lmRoof('Twin Sails', x, z, 92, 60, g + 14, 0.05, 222, FAM.glassBlue, { tier: 'podium', block: [[-25, 0, 30, 40], [25, 0, 30, 40]] });
    return 222;
  });
  landmark('Coral Crown', 380, 340, (x, z, g) => {
    // residential point tower on a retail podium, four fins and a lantern for a crown
    place('box', x, z, 70, 12, 56, 0.0, '#efc0c6', S.PUNCHED, 3.3, { lit: 0.25, warm: 0.8, variant: 0.5 });
    place('box', x, z, 34, 172, 34, 0.0, '#f3cfd4', S.BALCONY, 3.3, { lit: 0.35, warm: 0.85, variant: 0.5 });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      place('box', x + Math.cos(a) * 15, z + Math.sin(a) * 15, 2.5, 24, 12, a, '#f7f5f0', S.CONCRETE, 3, { yBase: g + 170, margin: -1 });
    }
    place('box', x, z, 14, 8, 14, 0.0, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 172, lit: 0.9, warm: 0.6, variant: 0.5, margin: -1 });
    lmRoof('Coral Crown podium', x, z, 70, 56, g + 12, 0.0, 194, FAM.balcony, { tier: 'podium', block: [[0, 0, 34, 34]] });
    lmRoof('Coral Crown', x, z, 34, 34, g + 172, 0.0, 194, FAM.balcony, { tier: 'terrace', block: [[0, 0, 14, 14], [15, 0, 2.5, 12], [0, 15, 12, 2.5], [-15, 0, 2.5, 12], [0, -15, 12, 2.5]] });
    return 194;
  });
  landmark('Monolith', 540, 70, (x, z, g) => {
    // a tall thin dark slab, its crown sheared off to one side
    const o = { lit: 0.5, warm: 0.35, variant: 0.6 };
    place('box', x, z, 22, 236, 64, 0.03, '#3f3b38', S.STONE, 3.8, o);
    place('shear', x, z, 22, 26, 64, 0.03, '#3f3b38', S.STONE, 3.8, { ...o, yBase: g + 235.9, margin: -1 });
    return 262;
  });
  landmark('Harbor Steps', 300, -440, (x, z, g) => {
    // cream punched-window office with three setbacks and a white lantern
    const o = { lit: 0.45, warm: 0.7, variant: 0.5 };
    place('box', x, z, 72, 60, 58, 0.02, '#efe4cf', S.PUNCHED, 3.5, o);
    place('box', x, z, 56, 120, 44, 0.02, '#efe4cf', S.PUNCHED, 3.5, o);
    place('box', x, z, 40, 176, 32, 0.02, '#f1e6cf', S.PUNCHED, 3.5, o);
    place('box', x, z, 22, 206, 18, 0.02, '#f3ead6', S.GRID, 3.5, { lit: 0.6, warm: 0.6, variant: 0.4 });
    place('frustum', x, z, 5, 34, 5, 0.02, '#e8eef2', S.CONCRETE, 3, { yBase: g + 206, margin: -1 });
    lmRoof('Harbor Steps', x, z, 72, 58, g + 60, 0.02, 240, FAM.punched, { tier: 'terrace', block: [[0, 0, 56, 44]] });
    lmRoof('Harbor Steps', x, z, 56, 44, g + 120, 0.02, 240, FAM.punched, { tier: 'terrace', block: [[0, 0, 40, 32]] });
    lmRoof('Harbor Steps', x, z, 40, 32, g + 176, 0.02, 240, FAM.punched, { tier: 'terrace', block: [[0, 0, 22, 18]] });
    lmRoof('Harbor Steps', x, z, 22, 18, g + 206, 0.02, 240, FAM.grid, { tier: 'terrace', block: [[0, 0, 5, 5]] });
    return 240;
  });
  landmark('Marina Point', 450, 500, (x, z, g) => {
    // round glass condominium tower at the south end of the wall, a brim and a lit crown ring
    const o = { lit: 0.45, warm: 0.5, variant: 0.5 };
    place('cyl', x, z, 38, 158, 38, 0, '#a9c4cf', S.GLASS_GREEN, 3.4, o);
    place('cyl', x, z, 46, 5, 46, 0, '#e8eef2', S.CONCRETE, 3, { yBase: g + 150, margin: -1 });
    place('cyl', x, z, 30, 8, 30, 0, '#cfe0ec', S.GLASS_BLUE, 3.9, { yBase: g + 158, lit: 0.9, warm: 0.4, variant: 0.4, margin: -1 });
    return 166;
  });
  landmark('North Quay', 380, -560, (x, z, g) => {
    // two stepped white slabs at the north end, the taller one crowned by a plant screen
    const o = { lit: 0.4, warm: 0.6, variant: 0.4 };
    place('box', x - 22, z, 36, 128, 48, 0.02, '#f4f1ea', S.GRID, 3.5, o);
    place('box', x + 24, z, 36, 168, 48, 0.02, '#f4f1ea', S.GRID, 3.5, o);
    place('box', x + 24, z, 30, 7, 40, 0.02, '#b9bfc3', S.GRID, 3.5, { yBase: g + 168, lit: 0, variant: 0.3, margin: -1 });
    lmRoof('North Quay', x - 22, z, 36, 48, g + 128, 0.02, 128, FAM.grid);
    return 175;
  });
  // ------------------------------------------------------------- brickell landmarks (the second cluster, south of the river)
  landmarkIn(bk, 'Brickell Flatiron', 380, -140, (x, z, g) => {
    // slender green-glass point tower with a glazed tapering crown and a mast: the peak of the southern cluster
    const o = { lit: 0.5, warm: 0.4, variant: 0.35 };
    place('box', x, z, 30, 205, 30, bk.rot, '#dfe6e0', S.GLASS_GREEN, 3.8, o);
    place('frustum', x, z, 30, 34, 30, bk.rot, '#dfe6e0', S.GLASS_GREEN, 3.8, { ...o, lit: 0.9, yBase: g + 205, margin: -1 });
    place('frustum', x, z, 3, 26, 3, bk.rot, '#e8eef2', S.CONCRETE, 3, { yBase: g + 239, margin: -1 });
    return 265;
  });
  landmarkIn(bk, 'River Twins', 120, -300, (x, z, g) => {
    // two blue-glass towers of unequal height on a shared punched podium beside the river
    const o = { lit: 0.5, warm: 0.3, variant: 0.55 };
    place('box', x, z, 96, 12, 56, bk.rot, '#efe4cf', S.PUNCHED, 3.4, { lit: 0.25, warm: 0.7, variant: 0.5 });
    place('box', x - 28, z, 30, 172, 40, bk.rot, '#a7bccb', S.GLASS_BLUE, 3.9, o);
    place('box', x + 28, z, 30, 190, 40, bk.rot, '#a7bccb', S.GLASS_BLUE, 3.9, o);
    place('box', x + 28, z, 14, 8, 14, bk.rot, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 190, lit: 0.9, warm: 0.3, variant: 0.5, margin: -1 });
    lmRoof('River Twins podium', x, z, 96, 56, g + 12, bk.rot, 198, FAM.glassBlue, { tier: 'podium', block: [[-28, 0, 30, 40], [28, 0, 30, 40]] });
    lmRoof('River Twins W', x - 28, z, 30, 40, g + 172, bk.rot, 172, FAM.glassBlue);
    lmRoof('River Twins E', x + 28, z, 30, 40, g + 190, bk.rot, 198, FAM.glassBlue, { tier: 'terrace', block: [[0, 0, 14, 14]] });
    return 198;
  });
  landmarkIn(bk, 'Palmetto', 440, 180, (x, z, g) => {
    // pastel hotel slab along the bay closed by a full-height drum, a pool deck on the roof
    const o = { lit: 0.35, warm: 0.85, variant: 0.5 };
    place('box', x, z, 26, 150, 70, bk.rot, '#f2c9a8', S.HOTEL, 3.2, o);
    place('cyl', x, z - 35, 26, 150, 26, bk.rot, '#f2c9a8', S.HOTEL, 3.2, o);
    place('house', x, z + 6, 8, 0.4, 20, bk.rot, '#3fc4de', S.POOL, 3, { yBase: g + 150, form: 2, margin: -1 });
    lmRoof('Palmetto', x, z, 26, 70, g + 150, bk.rot, 150, FAM.hotel, { block: [[0, 6, 8, 20], [0, -35, 26, 26]] });
    lmRoof('Palmetto drum', x, z - 35, 26, 26, g + 150, bk.rot, 150, FAM.hotel, { tier: 'terrace', round: true });
    return 150;
  });
  landmarkIn(bk, 'Obsidian', -80, 40, (x, z, g) => {
    // dark stone office in three tiers with a lit lantern: the mass at the centre of brickell
    const o = { lit: 0.55, warm: 0.4, variant: 0.5 };
    place('box', x, z, 46, 150, 46, bk.rot, '#3f3b38', S.STONE, 3.8, o);
    place('box', x, z, 36, 195, 36, bk.rot, '#3f3b38', S.STONE, 3.8, o);
    place('box', x, z, 26, 225, 26, bk.rot, '#3f3b38', S.STONE, 3.8, o);
    place('box', x, z, 16, 10, 16, bk.rot, '#c2d0da', S.GLASS_BLUE, 3.9, { yBase: g + 225, lit: 0.9, warm: 0.5, variant: 0.5, margin: -1 });
    lmRoof('Obsidian', x, z, 46, 46, g + 150, bk.rot, 235, FAM.stone, { tier: 'terrace', block: [[0, 0, 36, 36]] });
    lmRoof('Obsidian', x, z, 36, 36, g + 195, bk.rot, 235, FAM.stone, { tier: 'terrace', block: [[0, 0, 26, 26]] });
    lmRoof('Obsidian', x, z, 26, 26, g + 225, bk.rot, 235, FAM.stone, { tier: 'terrace', block: [[0, 0, 16, 16]] });
    return 235;
  });

  // ------------------------------------------------------------- district fills
  // the urban gradient of the suburbs: blocks near the mid-rise districts and along the arterial corridors
  // carry apartment blocks, shops and parking structures instead of houses, so the city thins out along
  // its roads rather than ending at a district rectangle
  for (const d of map.districts) {
    const blocks = blocksByDistrict.get(d.id);
    const c = Math.cos(d.rot), s = Math.sin(d.rot);
    const toWorld = (lx: number, lz: number): [number, number] => [d.cx + lx * c - lz * s, d.cz + lx * s + lz * c];
    if (!blocks) continue;
    for (let bi = 0; bi < blocks.length; bi++) {
      const b = blocks[bi];
      // Two streams per block, both seeded by the block alone: `drng` decides what the block is and places its
      // towers, `frng` fills the rest (street wall, podium liner, open space, roofs). Neither depends on any other
      // block or on how much the fill draws, so a change to the fill logic never reshuffles the skyline.
      const drng = new Rng(`${d.id}#${bi}`);
      const frng = drng.fork('fill');
      const inset = b.streetWidth * 0.5 + 3;
      const bx0 = b.x0 + inset, bx1 = b.x1 - inset, bz0 = b.z0 + inset, bz1 = b.z1 - inset;
      const bw = bx1 - bx0, bd = bz1 - bz0;
      if (bw < 12 || bd < 12) continue;
      const [cxw, czw] = toWorld((bx0 + bx1) / 2, (bz0 + bz1) / 2);
      // the authored forest belts (the bay-shore fringe in front of the suburbs) carry no lots
      if (map.canopyAt(cxw, czw) !== Canopy.NONE) continue;
      const distToCentre = Math.hypot(cxw - d.cx, czw - d.cz) / Math.max(d.hw, d.hh);
      const distToDowntown = Math.hypot(cxw - dt.cx, czw - dt.cz);
      const nb = neighbourhood(cxw, czw);
      // density and height fall off with distance from downtown so the sprawl thins toward the edges
      const prox = 1 - smoothstep(600, 4000, distToDowntown);
      const sprawl = 1 - 0.45 * smoothstep(2500, 8500, distToDowntown);
      if (drng.next() > d.density * (d.zone === Zone.RES_LOW ? sprawl : 1)) {
        // the block kept open: in the dense zones a designed one (car park, pocket park, square), elsewhere bare
        if (d.zone === Zone.DOWNTOWN || d.zone === Zone.RES_MID) fillOpenBlock(drng.next());
        continue;
      }
      switch (d.zone) {
        case Zone.DOWNTOWN: fillDowntown(); break;
        case Zone.RES_MID: {
          // a mid-rise district rated for towers (brickell) fills like downtown: its own core / bayfront gradient
          if (d.hMax >= 150) { fillDowntown(); break; }
          // the mid-rise districts fray at their edges: outer blocks turn to walk-ups and houses where the
          // shared urban gradient drops, so the boundary with the suburbs is ragged rather than ruled
          const { urban, corridor } = urbanGradient(map.districts, map.roads, cxw, czw);
          const u = drng.next();
          if (urban < 0.3 && u > urban + 0.4) fillHouses();
          else if (u > urban) fillLowRise(Math.max(urban, 0.55), corridor);
          else fillMidrise();
          break;
        }
        case Zone.HOTEL: fillHotel(); break;
        case Zone.RES_LOW: {
          const { urban, corridor } = urbanGradient(map.districts, map.roads, cxw, czw);
          const un = 0.5 + 0.5 * perlin2(cxw / 380 + 3.3, czw / 380 - 7.1);
          const far = smoothstep(2200, 5500, distToDowntown);
          const u = drng.next();
          if (u < urban * 0.75) fillLowRise(urban, corridor);
          else if (corridor < Math.max(bw, bd) * 0.6 + 20 && drng.next() < 0.45 + 0.3 * un) fillCommercial(corridor, far);
          else if (far > 0.35 && corridor < 200 && drng.next() < 0.18) fillIndustrialLot();
          else fillHouses();
          break;
        }
        case Zone.INDUSTRIAL: fillIndustrial(); break;
        default: break;
      }

      /** What stood on this block before it placed anything (the occupancy grid over the block's world bounds:
       *  landmarks, earlier districts, authored props), read by the BlockPlan; the block's own placements are
       *  tracked exactly by the plan instead. */
      function foreignReader(): (cx: number, cz: number, w: number, dd: number) => boolean {
        const pre = new Set<number>();
        const r = Math.hypot(bw, bd) / 2 + 15;
        const ix0 = Math.floor((cxw - r + 10000) / 10), ix1 = Math.floor((cxw + r + 10000) / 10);
        const iz0 = Math.floor((czw - r + 10000) / 10), iz1 = Math.floor((czw + r + 10000) / 10);
        for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
          if (ix < 0 || iz < 0 || ix >= 2000 || iz >= 2000) continue;
          const i = iz * 2000 + ix;
          if (occ[i]) pre.add(i);
        }
        return (cx, cz, w, dd) => {
          const [x, z] = toWorld(cx, cz);
          for (const [px, pz] of corners(x, z, w, dd, d.rot)) { const i = occIndex(px, pz); if (i >= 0 && pre.has(i)) return true; }
          return false;
        };
      }

      /** A parcel visitor: given the parcel's rectangle for a depth (centre, w, d in the district frame), places a
       *  building or declines (returns the depth used, or null). */
      type ParcelVisit = (rect: (dep: number) => [number, number, number, number], frontage: number, depth: number, i: number, n: number, face: number) => number | null;
      /** One row of street-wall parcels along a block edge: frontages that tile [from, to] exactly (their count from
       *  the mean frontage, their widths jittered), each `dMin`-`dMax` deep from the edge line `fixed` toward the
       *  block interior (`inward`). Returns the depths of the row's two end parcels (0 when declined), so the rows
       *  along the other axis can start behind them. */
      function parcelRow(r: Rng, along: 'x' | 'z', fixed: number, inward: 1 | -1, from: number, to: number, fMean: number, dMin: number, dMax: number, visit: ParcelVisit): { first: number; last: number } {
        const out = { first: 0, last: 0 };
        const L = to - from;
        if (L < 9) return out;
        const n = Math.max(1, Math.round(L / fMean + r.range(-0.35, 0.35)));
        const ws: number[] = []; let sum = 0;
        for (let i = 0; i < n; i++) { const w = r.range(0.65, 1.4); ws.push(w); sum += w; }
        // the street face of the row's buildings in the district frame (0 -z, 1 +z, 2 -x, 3 +x): the edge they stand on
        const face = along === 'x' ? (inward > 0 ? 0 : 1) : (inward > 0 ? 2 : 3);
        let cursor = from;
        for (let i = 0; i < n; i++) {
          const f = (L * ws[i]) / sum;
          const depth = r.range(dMin, dMax);
          const mid = cursor + f / 2;
          cursor += f;
          const rect = (dep: number): [number, number, number, number] => along === 'x' ? [mid, fixed + inward * dep / 2, f, dep] : [fixed + inward * dep / 2, mid, dep, f];
          const placed = visit(rect, f, depth, i, n, face);
          if (placed !== null) { if (i === 0) out.first = placed; if (i === n - 1) out.last = placed; }
        }
        return out;
      }

      interface WallSpec {
        /** storeys of the next parcel building */ storeys: () => number;
        /** family of the next parcel, given the previous one's (rows are runs of kin buildings) */ fam: (prev: Family | null) => Family;
        fMean: number; dMin: number; dMax: number;
        /** chance a parcel is left as a gap (a small surface lot) */ skip: number;
        /** chance a wide parcel is a parking structure */ parking: number;
        pastel: number;
        /** share of the parcels whose ground floor is shops (the rest are residential: a door and a stoop) */ retail: number;
      }

      /** A striped surface car park of `w` x `dd` m at block-local (cx, cz): the asphalt slab (`lift` m proud of the
       *  ground, so lots that meet do not z-fight), kerb, its cars (`fill` of the stalls, `ok` vetoing stalls under
       *  buildings). Returns the slab's top height or null. */
      function surfaceLot(r: Rng, cx: number, cz: number, w: number, dd: number, lift: number, fill: number, ok?: (ox: number, oz: number) => boolean): number | null {
        const [x, z] = toWorld(cx, cz);
        if (!landOK(x, z, w, dd, d.rot)) return null;
        const top = place('box', x, z, w, lift, dd, d.rot, ASPHALT_C, S.LOT, 3, { margin: 0, variant: fill });
        if (top === null) return null;
        lotCars(r, x, z, w, dd, d.rot, top, fill, ok);
        return top;
      }

      /** A parking structure: `decks` open decks (3 m each) of precast on a 7.5 m grid, a stair / lift tower at a
       *  corner, cars on the roof deck, a ramp hood; the facade is the PARKING style's slab-and-void bands. */
      function parkingDeck(r: Rng, cx: number, cz: number, w: number, dd: number, decks: number): void {
        const [x, z] = toWorld(cx, cz);
        if (!landOK(x, z, w, dd, d.rot)) return;
        const h = decks * 3.0 + 1.2;
        const top = place('box', x, z, w, h, dd, d.rot, r.pick(['#b9b9b4', '#c6c6c1', '#aeb0ad', '#bdb6a8']), S.PARKING, 3.0, { lit: 0.3, warm: 0.3, variant: 0.45, margin: 0 });
        if (top === null) return;
        const cr = Math.cos(d.rot), sr = Math.sin(d.rot);
        const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
        const sx = r.chance(0.5) ? -1 : 1, sz = r.chance(0.5) ? -1 : 1;
        const [tx, tz] = at(sx * (w / 2 - 3.2), sz * (dd / 2 - 3.2));
        place('box', tx, tz, 5.5, 3.6, 5.5, d.rot, '#a6a8a4', S.CONCRETE, 3, { yBase: top - 0.4, margin: -1 });
        // the ramp to the roof deck breaks the surface near the other end
        const [rx, rz] = at(-sx * (w / 2 - 8), 0);
        place('box', rx, rz, 6.5, 1.1, Math.min(dd - 4, 16), d.rot, '#9d9d98', S.CONCRETE, 3, { yBase: top - 0.6, margin: -1 });
        lotCars(r, x, z, w, dd, d.rot, top, 0.45, (ox, oz) => Math.abs(ox - sx * (w / 2 - 3.2)) > 4.5 || Math.abs(oz - sz * (dd / 2 - 3.2)) > 4.5 ? Math.abs(ox + sx * (w / 2 - 8)) > 4.5 : false);
      }

      /** What the street wall leaves in the middle of a block: a service alley and the tenants' parking (downtown),
       *  a courtyard of lawn with pools and hedges (residential). The surface runs under the deeper parcels, inside
       *  their bodies, so no bare strip is left behind the shallower ones. */
      function interior(plan: BlockPlan, r: Rng, inset: number, court: boolean): void {
        const w = bw - 2 * inset, dd = bd - 2 * inset;
        if (w < 8 || dd < 8) return;
        const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
        const free = (ox: number, oz: number) => plan.free(cx + ox, cz + oz, 2.0, 2.0);
        // a block whose middle is already taken (a landmark and its plaza stood there before the fill) gets no
        // interior: the alley lot laid under a landmark was a striped slab round its foot with every stall vetoed
        let n = 0, ok = 0;
        for (let ox = -w / 2 + 2; ox < w / 2; ox += 4) for (let oz = -dd / 2 + 2; oz < dd / 2; oz += 4) { n++; if (free(ox, oz)) ok++; }
        if (ok < n * 0.3) return;
        if (!court) { surfaceLot(r, cx, cz, w, dd, 0.12, r.range(0.45, 0.75), free); return; }
        const [x, z] = toWorld(cx, cz);
        if (!landOK(x, z, w, dd, d.rot)) return;
        const top = place('box', x, z, w, 0.14, dd, d.rot, LAWN_C, S.LAWN, 3, { margin: -1 });
        if (top === null) return;
        const cr = Math.cos(d.rot), sr = Math.sin(d.rot);
        const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
        for (let i = 0, n = r.int(1, 3); i < n; i++) {
          const pw = r.range(6, 12), pd = r.range(4, 7);
          const ox = r.range(-w / 2 + pw, w / 2 - pw), oz = r.range(-dd / 2 + pd, dd / 2 - pd);
          if (!plan.free(cx + ox, cz + oz, pw + 3, pd + 3)) continue;
          const [px, pz] = at(ox, oz);
          place('house', px, pz, pw, 0.3, pd, d.rot, '#3fc4de', S.POOL, 3, { yBase: top - 0.05, form: 2, margin: -1 });
          place('box', px, pz, pw + 3, 0.16, pd + 3, d.rot, '#d9d3c4', S.PLAZA, 3, { yBase: top - 0.1, margin: -1 });
          plan.take(cx + ox, cz + oz, pw + 3, pd + 3);
        }
        // hedges along the court where nothing stands
        for (let k = 0, n = r.int(2, 5); k < n; k++) {
          const along = r.chance(0.5);
          const len = r.range(6, 16), ox = r.range(-w / 2 + len, w / 2 - len), oz = r.range(-dd / 2 + 3, dd / 2 - 3);
          if (!plan.free(cx + ox, cz + oz, along ? len : 1, along ? 1 : len)) continue;
          const [hx, hz] = at(ox, oz);
          kit('roof', hx, top - 0.02, hz, along ? len : 0.9, r.range(0.8, 1.4), along ? 0.9 : len, d.rot, HEDGE_C, S.LAWN);
        }
      }

      /** A block kept open on purpose: a surface car park, a pocket park (lawn, paths, hedges, a pool: the trees
       *  are the vegetation pass's, told where by openSpaces) or a paved square with planters and a fountain. */
      function fillOpenBlock(roll: number): void {
        const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
        const [x, z] = toWorld(cx, cz);
        if (!landOK(x, z, bw, bd, d.rot) || !areaFree(x, z, bw - 6, bd - 6, d.rot)) return;
        const cr = Math.cos(d.rot), sr = Math.sin(d.rot);
        const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
        const r = frng;
        if (roll < 0.4) {
          const top = surfaceLot(r, cx, cz, bw - 2, bd - 2, 0.12, r.range(0.5, 0.8));
          if (top === null) return;
          // the attendant's booth at one corner, a light on the other
          const [kx, kz] = at(-bw / 2 + 4, -bd / 2 + 4);
          place('box', kx, kz, 3, 2.8, 2.4, d.rot, '#e9e7e0', S.CONCRETE, 3, { margin: -1 });
          openSpaces.push({ kind: 'lot', x, z, w: bw - 2, d: bd - 2, rot: d.rot });
        } else if (roll < 0.75) {
          const top = place('box', x, z, bw - 1, 0.14, bd - 1, d.rot, LAWN_C, S.LAWN, 3, { margin: -1 });
          if (top === null) return;
          // paths across the lawn, meeting at a paved circle with a pool or a bandstand
          place('box', x, z, bw - 1, 0.16, 2.6, d.rot, PATH_C, S.PLAZA, 3, { yBase: top - 0.1, margin: -1 });
          place('box', x, z, 2.6, 0.16, bd - 1, d.rot, PATH_C, S.PLAZA, 3, { yBase: top - 0.1, margin: -1 });
          if (r.chance(0.5)) place('box', x, z, Math.min(bw, bd) * 0.9, 0.16, 3.0, d.rot + Math.PI / 4, PATH_C, S.PLAZA, 3, { yBase: top - 0.1, margin: -1 });
          place('cyl', x, z, 16, 0.18, 16, d.rot, '#a09a8e', S.PLAZA, 3, { yBase: top - 0.08, margin: -1 });
          if (r.chance(0.6)) place('cyl', x, z, 9, 0.3, 9, d.rot, '#3fc4de', S.POOL, 3, { yBase: top, margin: -1 });
          else { place('cyl', x, z, 7, 0.5, 7, d.rot, '#b7b2a6', S.CONCRETE, 3, { yBase: top, margin: -1 }); place('cyl', x, z, 7.5, 0.4, 7.5, d.rot, '#5d4e42', S.CONCRETE, 3, { yBase: top + 4.2, margin: -1 }); }
          // hedges along the block edges, broken at the paths
          for (const [ox, oz, w, dd] of [[0, -bd / 2 + 2, bw - 6, 0.9], [0, bd / 2 - 2, bw - 6, 0.9], [-bw / 2 + 2, 0, 0.9, bd - 6], [bw / 2 - 2, 0, 0.9, bd - 6]] as const) {
            const [hx, hz] = at(ox, oz);
            kit('roof', hx, top - 0.02, hz, w, r.range(0.8, 1.3), dd, d.rot, HEDGE_C, S.LAWN);
          }
          openSpaces.push({ kind: 'park', x, z, w: bw - 1, d: bd - 1, rot: d.rot });
        } else {
          const top = place('box', x, z, bw - 1, 0.16, bd - 1, d.rot, '#d9d3c4', S.PLAZA, 3, { margin: 0 });
          if (top === null) return;
          // a fountain basin in the middle, planters with hedges on a grid
          place('cyl', x, z, 12, 0.5, 12, d.rot, '#9a958a', S.CONCRETE, 3, { yBase: top, margin: -1 });
          place('cyl', x, z, 11, 0.3, 11, d.rot, '#3fc4de', S.POOL, 3, { yBase: top + 0.3, margin: -1 });
          place('cyl', x, z, 1.6, 2.6, 1.6, d.rot, '#8a857a', S.CONCRETE, 3, { yBase: top + 0.3, margin: -1 });
          const nx = Math.max(2, Math.floor(bw / 22)), nz = Math.max(2, Math.floor(bd / 22));
          for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
            const ox = -bw / 2 + 8 + (i + 0.5) * (bw - 16) / nx, oz = -bd / 2 + 8 + (j + 0.5) * (bd - 16) / nz;
            if (Math.hypot(ox, oz) < 10) continue;
            const [px, pz] = at(ox, oz);
            const pw = r.range(2.4, 4.0);
            kit('roof', px, top - 0.02, pz, pw, 0.6, pw, d.rot, PLANTER_C, S.CONCRETE);
            kit('roof', px, top + 0.55, pz, pw - 0.4, r.range(0.6, 1.1), pw - 0.4, d.rot, HEDGE_C, S.LAWN);
          }
          openSpaces.push({ kind: 'plaza', x, z, w: bw - 1, d: bd - 1, rot: d.rot });
        }
      }
      /** The street wall of a block: parcels around the perimeter, shoulder to shoulder, outside what the plan
       *  already holds (towers, podiums). The two rows along x run the block's full width and the two along z fit
       *  between their corner parcels, so every corner is one building with two street faces; a parcel that would
       *  overlap a tower tries its minimum depth and then declines, which is the only way a gap opens. */
      function streetWall(plan: BlockPlan, r: Rng, spec: WallSpec): number {
        let placed = 0;
        let prevFam: Family | null = null;
        const build: ParcelVisit = (rect, f, depth, _i, _n, face) => {
          for (const dep of depth > spec.dMin + 1 ? [depth, spec.dMin] : [depth]) {
            const [cx, cz, w, dd] = rect(dep);
            if (!plan.free(cx, cz, w, dd)) continue;
            const [x, z] = toWorld(cx, cz);
            if (!landOK(x, z, w, dd, d.rot)) continue;
            if (r.next() < spec.skip) {
              // the gap is a small surface lot, striped, with its cars, never bare ground
              surfaceLot(r, cx, cz, w, dd, 0.16, 0.55);
              plan.take(cx, cz, w, dd);
              return dep;
            }
            if (spec.parking > 0 && f >= 26 && dd >= 18 && r.next() < spec.parking) {
              parkingDeck(r, cx, cz, w, dd, r.int(3, 7));
              plan.take(cx, cz, w, dd);
              placed++;
              return dep;
            }
            const fam = spec.fam(prevFam);
            prevFam = fam;
            // kin runs share a palette, not a tint: the hue window wanders a little parcel to parcel
            const lk = look(fam, r, spec.pastel < 0 ? -1 : clamp(spec.pastel + r.range(-0.15, 0.15), 0, 1));
            const hh = spec.storeys() * fam.floorH + r.range(0.6, 1.2);
            // the ground floor: shops (aStyle2.w = 20 + face tells the shader) or a residential entrance
            const shops = r.next() < spec.retail && fam.style !== S.CONCRETE && fam.style !== S.GLASS_GREEN && fam.style !== S.STONE;
            const top = place('box', x, z, w, hh, dd, d.rot, lk.tint, fam.style, fam.floorH, { lit: lk.lit, warm: lk.warm, variant: lk.variant, margin: 0, front: face + (shops ? 10 : 0) });
            if (top === null) return null;
            plan.take(cx, cz, w, dd);
            placed++;
            groundFloor(r, x, z, w, dd, d.rot, face, fam, hh, shops);
            infillRoof(r, x, z, w, dd, top, d.rot, hh, fam, lk.tint);
            return dep;
          }
          return null;
        };
        // the rows leave an alley of at least 8 m between the backs of opposite parcels
        const dMaxX = Math.min(spec.dMax, (bd - 8) / 2), dMaxZ = Math.min(spec.dMax, (bw - 8) / 2);
        const rowsX = dMaxX >= spec.dMin;
        const south = rowsX ? parcelRow(r, 'x', bz0, 1, bx0, bx1, spec.fMean, spec.dMin, dMaxX, build) : { first: 0, last: 0 };
        const north = rowsX ? parcelRow(r, 'x', bz1, -1, bx0, bx1, spec.fMean, spec.dMin, dMaxX, build) : { first: 0, last: 0 };
        if (dMaxZ >= spec.dMin) {
          parcelRow(r, 'z', bx0, 1, bz0 + south.first, bz1 - north.first, spec.fMean, spec.dMin, dMaxZ, build);
          parcelRow(r, 'z', bx1, -1, bz0 + south.last, bz1 - north.last, spec.fMean, spec.dMin, dMaxZ, build);
        }
        return placed;
      }

      /** Roof of a street-wall parcel building: a set-back penthouse storey on some of the taller ones, the stair /
       *  lift bulkhead, a water tank on the older masonry, then the kit packed around them. */
      function infillRoof(r: Rng, x: number, z: number, w: number, dd: number, top: number, rot: number, hh: number, fam: Family, tint: string): void {
        const cr = Math.cos(rot), sr = Math.sin(rot);
        const block: [number, number, number, number][] = [];
        const at = (ox: number, oz: number): [number, number] => [x + ox * cr - oz * sr, z + ox * sr + oz * cr];
        let roof = top;
        if (hh > 18 && Math.min(w, dd) > 14 && r.chance(0.22)) {
          // penthouse: the top storey set back 2-4 m from the street faces, in the body's family a shade darker
          const pw = w - r.range(4, 8), pd = dd - r.range(4, 8);
          const ox = r.range(-(w - pw) / 2 + 1, (w - pw) / 2 - 1), oz = r.range(-(dd - pd) / 2 + 1, (dd - pd) / 2 - 1);
          const [px, pz] = at(ox, oz);
          const col = new THREE.Color(tint).multiplyScalar(0.85);
          const t2 = place('box', px, pz, pw, fam.floorH + 0.6, pd, rot, col, fam.style, fam.floorH, { yBase: top - 0.3, margin: -1, lit: 0.4, warm: 0.8 });
          if (t2 !== null) { addSmallRoofKit(r, px, pz, pw, pd, t2, rot); roof = -1; }
          block.push([ox, oz, pw, pd]);
        }
        if (roof > 0 && hh > 12 && r.chance(0.65)) {
          const bw2 = Math.min(w * 0.4, r.range(3, 6)), bd2 = Math.min(dd * 0.4, r.range(3, 5));
          const ox = r.range(-w * 0.25, w * 0.25), oz = r.range(-dd * 0.2, dd * 0.2);
          const [bx, bz] = at(ox, oz);
          place('box', bx, bz, bw2, r.range(2.6, 3.4), bd2, rot, r.pick(GREYS), S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
          block.push([ox, oz, bw2, bd2]);
        }
        if (roof > 0 && (fam.style === S.BRICK || fam.style === S.PUNCHED) && hh > 15 && Math.min(w, dd) > 12 && r.chance(0.18)) {
          const ox = r.range(-w * 0.25, w * 0.25), oz = r.range(-dd * 0.2, dd * 0.2);
          const [tx, tz] = at(ox, oz);
          place('cyl', tx, tz, 3.2, 3.6, 3.2, rot, '#5a4a40', S.CONCRETE, 3, { yBase: top + 1.6, margin: -1 });
          for (const [lx, lz] of [[-1.1, -1.1], [1.1, -1.1], [1.1, 1.1], [-1.1, 1.1]]) { const [qx, qz] = at(ox + lx, oz + lz); kit('roof', qx, top - 0.05, qz, 0.2, 1.7, 0.2, rot, TANK_LEG_C, S.DUCT); }
          block.push([ox, oz, 3.6, 3.6]);
        }
        addSmallRoofKit(r, x, z, w, dd, top, rot, block);
      }

      function fillDowntown(): void {
        const core = 1 - smoothstep(0.2, 1.0, distToCentre);
        // the bayfront (district +x) carries the tall wall the skyline views read: towers climb toward the water
        const east = smoothstep(0.15, 0.75, ((cxw - d.cx) * c + (czw - d.cz) * s) / d.hw);
        const prominence = Math.max(core, 0.9 * east);
        const main = d.id === 'downtown';
        const plan = new BlockPlan(bx0, bz0, bx1, bz1, foreignReader());
        const nTowers = bw > 80 && bd > 70 ? 2 : 1;
        // Block typology: the towers rise from a 3-8 storey podium that fills the block to the street line, or
        // from a podium along one street with the street wall on the rest of the block, or stand at the street
        // line themselves with the street wall wrapping them. A tower in the middle of a bare lot is what a real
        // CBD almost never has.
        const ty = drng.next();
        const podP = lerp(0.2, 0.42, prominence);
        const podFull = ty < podP, podHalf = !podFull && ty < podP + 0.22;
        const sx0 = drng.chance(0.5) ? -1 : 1, sz0 = drng.chance(0.5) ? -1 : 1;
        const towers: { lx: number; lz: number; fw: number; fd: number; h: number; fam: Family; recipe: number; sz: number }[] = [];
        for (let t = 0; t < nTowers; t++) {
          // Height hierarchy: log-normal, the way real CBDs are distributed. The median climbs from ~45 m at the
          // district edge to ~118 m in the core and along the bay (brickell 40 -> 102) and the spread widens with
          // it, so the edge is 30-90 m walk-ups and plates while the core and the waterfront carry the 150-270 m
          // tail with a few near-supertalls; the landmarks own 285-361 m.
          const median = lerp(main ? 46 : 40, main ? 118 : 102, prominence);
          const sigma = lerp(0.4, 0.5, prominence);
          let h = clamp(median * Math.exp(sigma * gauss(drng)), 26, main ? 272 : 235);
          // footprint classes so the skyline mixes widths: slender point towers, standard plates, wide slabs
          const wr = drng.next();
          let fw: number, fd: number;
          if (wr < (h > 110 ? 0.34 : 0.22)) { const slim = h > 180 ? 6 : 0; fw = drng.range(16 + slim, 24 + slim); fd = drng.range(18 + slim, 30 + slim); }
          else if (wr < 0.82) { fw = drng.range(24, Math.min(46, bw * 0.55)); fd = drng.range(22, Math.min(46, bd * 0.6)); }
          else { fw = drng.range(Math.min(44, bw * 0.5), Math.min(74, bw * 0.75)); fd = drng.range(18, Math.min(30, bd * 0.4)); if (h > 150) h *= 0.7; }
          fw = Math.min(fw, bw - 4); fd = Math.min(fd, bd - 4);
          // anchor: the second tower takes the corner diagonal to the first's
          const sx = t === 0 ? sx0 : -sx0, sz = t === 0 ? sz0 : -sz0;
          const anchor = drng.next();
          let lx: number, lz: number;
          if (anchor < 0.6) { lx = sx < 0 ? bx0 + fw / 2 : bx1 - fw / 2; lz = sz < 0 ? bz0 + fd / 2 : bz1 - fd / 2; }
          else if (anchor < 0.85) { lx = clamp((bx0 + bx1) / 2 + sx * drng.range(0, bw * 0.2), bx0 + fw / 2, bx1 - fw / 2); lz = sz < 0 ? bz0 + fd / 2 : bz1 - fd / 2; }
          else { lx = clamp((bx0 + bx1) / 2 + sx * drng.range(0, bw * 0.15), bx0 + fw / 2, bx1 - fw / 2); lz = clamp((bz0 + bz1) / 2 + sz * drng.range(0, bd * 0.15), bz0 + fd / 2, bz1 - fd / 2); }
          if (!plan.free(lx, lz, fw, fd, 4)) continue;
          const [x, z] = toWorld(lx, lz);
          if (!landOK(x, z, fw, fd, d.rot)) continue;
          const fam: Family = h > 110
            ? pickWeighted(drng, clusterWeights([[FAM.glassBlue, 0.34], [FAM.glassGreen, 0.16], [FAM.punched, 0.1], [FAM.balcony, 0.08], [FAM.deco, 0.08], [FAM.stone, 0.14], [FAM.grid, 0.1]] as const, nb.glass))
            : h > 60
              ? pickWeighted(drng, clusterWeights([[FAM.glassBlue, 0.2], [FAM.glassGreen, 0.12], [FAM.punched, 0.16], [FAM.balcony, 0.14], [FAM.deco, 0.14], [FAM.stone, 0.1], [FAM.grid, 0.1], [FAM.brick, 0.04]] as const, nb.glass))
              : pickWeighted(drng, clusterWeights([[FAM.glassBlue, 0.1], [FAM.glassGreen, 0.08], [FAM.punched, 0.2], [FAM.balcony, 0.12], [FAM.deco, 0.18], [FAM.stone, 0.06], [FAM.grid, 0.1], [FAM.brick, 0.16]] as const, nb.glass));
          let recipe: number;
          const rr = drng.next();
          if (fam.style === S.DECO && h > 60) recipe = rr < 0.5 ? 6 : rr < 0.75 ? 1 : rr < 0.88 ? 10 : 0;
          else if (h > 110) recipe = rr < 0.2 ? 1 : rr < 0.29 ? 7 : rr < 0.38 ? 5 : rr < 0.45 ? 8 : rr < 0.52 ? 4 : rr < 0.57 ? 2 : rr < 0.64 ? 11 : rr < 0.7 ? 12 : rr < 0.76 ? 13 : rr < 0.81 ? 14 : rr < 0.88 ? 15 : rr < 0.94 ? 16 : 0;
          else if (h > 60) recipe = rr < 0.15 ? 1 : rr < 0.25 ? 7 : rr < 0.35 ? 3 : rr < 0.42 ? 2 : rr < 0.49 ? 8 : rr < 0.6 ? 9 : rr < 0.68 ? 10 : rr < 0.75 ? 13 : rr < 0.8 ? 12 : 0;
          else recipe = rr < 0.2 ? 3 : rr < 0.3 ? 2 : rr < 0.42 ? 9 : rr < 0.5 ? 13 : rr < 0.56 ? 10 : 0;
          plan.take(lx, lz, fw, fd);
          towers.push({ lx, lz, fw, fd, h, fam, recipe, sz });
        }
        // the podium: parking and retail liner in the tower's own family (or precast), its roof one of the
        // programmes a podium roof really carries (podiumRoof)
        const podium = (lx: number, lz: number, pw: number, pd: number, front: number) => {
          const storeys = frng.int(3, Math.round(5 + 3 * prominence));
          const lead = towers[0]?.fam ?? FAM.punched;
          const liner = [FAM.punched, FAM.grid, FAM.deco, FAM.brick];
          const pfam = frng.chance(0.4) ? FAM.concrete : liner.includes(lead) ? lead : frng.pick(liner);
          const lk = look(pfam, frng, nb.pastel);
          const ph = storeys * pfam.floorH + 0.9;
          const [x, z] = toWorld(lx, lz);
          if (!landOK(x, z, pw, pd, d.rot)) return;
          // the liner's ground floor is retail (front + 10 tells the shader so) on the podium's street face
          const top = place('box', x, z, pw, ph, pd, d.rot, lk.tint, pfam.style, pfam.floorH, { lit: pfam === FAM.concrete ? 0.1 : lk.lit * 0.6, warm: lk.warm, variant: lk.variant, margin: 0, front: front + 10 });
          if (top === null) return;
          groundFloor(frng, x, z, pw, pd, d.rot, front, pfam, ph, true);
          podiumRoof(frng, x, z, pw, pd, top, d.rot, ph, pfam, towers[0]?.fam ?? pfam, plan.within(lx, lz, pw, pd));
          plan.take(lx, lz, pw, pd);
        };
        if (podFull && towers.length) podium((bx0 + bx1) / 2, (bz0 + bz1) / 2, bw, bd, drng.int(0, 3));
        else if (podHalf && towers.length) {
          // along the street the first tower stands on, the block's full width
          const t0 = towers[0];
          const pd = Math.min(bd * 0.6, t0.fd + drng.range(10, 30));
          podium((bx0 + bx1) / 2, t0.sz < 0 ? bz0 + pd / 2 : bz1 - pd / 2, bw, pd, t0.sz < 0 ? 0 : 1);
        }
        for (const t of towers) {
          const [x, z] = toWorld(t.lx, t.lz);
          // the lobby faces the street the tower stands on (its long street where it holds a corner)
          const onX = t.lz - t.fd / 2 < bz0 + 1 || t.lz + t.fd / 2 > bz1 - 1, onZ = t.lx - t.fw / 2 < bx0 + 1 || t.lx + t.fw / 2 > bx1 - 1;
          const front = onX && (!onZ || bw >= bd) ? (t.lz < (bz0 + bz1) / 2 ? 0 : 1) : onZ ? (t.lx < (bx0 + bx1) / 2 ? 2 : 3) : (t.sz < 0 ? 0 : 1);
          buildTower(drng, x, z, d.rot, t.fw, t.fd, t.h, t.fam, t.recipe, true, nb.pastel, front);
          if (!podFull && !podHalf) groundFloor(frng, x, z, t.fw, t.fd, d.rot, front, t.fam, t.h, false);
        }
        if (podFull && towers.length) return;
        // the street wall: 3-8 storey buildings shoulder to shoulder to the street line (taller toward the core),
        // in runs of kin families, wrapping the towers and the half podium
        const base = lerp(4.5, 8.5, core);
        streetWall(plan, frng, {
          storeys: () => clamp(Math.round(base + gauss(frng) * 1.6), 3, 13),
          fam: (prev) => prev && frng.chance(0.45) ? prev : pickWeighted(frng, clusterWeights([[FAM.brick, 0.22], [FAM.punched, 0.26], [FAM.deco, 0.18], [FAM.balcony, 0.12], [FAM.grid, 0.08], [FAM.concrete, 0.06], [FAM.stone, 0.04], [FAM.glassGreen, 0.04]] as const, nb.glass)),
          fMean: lerp(23, 19, core), dMin: 14, dMax: 24, skip: lerp(0.08, 0.03, core), parking: lerp(0.12, 0.06, core), pastel: nb.pastel, retail: lerp(0.55, 0.85, core),
        });
        interior(plan, frng, 14, false);
      }

      function fillMidrise(): void {
        const plan = new BlockPlan(bx0, bz0, bx1, bz1, foreignReader());
        // one block in five nearest downtown carries a 90-140 m point tower at a corner (the CBD tapers into the
        // mid-rise ring instead of stopping at the district line); a third of the others a taller slab of the
        // district's own range at a corner, the street wall wrapping either
        const tall = prox > 0.55 && d.hMax >= 80 && drng.next() < 0.2 * prox;
        if (tall || drng.chance(0.35)) {
          const fw = drng.range(18, Math.min(40, bw * 0.45)), fd = drng.range(18, Math.min(40, bd * 0.45));
          const sx = drng.chance(0.5) ? -1 : 1, sz = drng.chance(0.5) ? -1 : 1;
          const lx = sx < 0 ? bx0 + fw / 2 : bx1 - fw / 2, lz = sz < 0 ? bz0 + fd / 2 : bz1 - fd / 2;
          const [x, z] = toWorld(lx, lz);
          if (landOK(x, z, fw, fd, d.rot) && plan.free(lx, lz, fw, fd, 3)) {
            let h = tall ? drng.range(90, 140) : clamp(lerp(d.hMin, d.hMax, Math.pow(drng.next(), 1.6)) * lerp(0.75, 1.15, prox), d.hMin, d.hMax);
            h = Math.max(h, d.hMin * 1.5);
            const fam = h > 50
              ? pickWeighted(drng, clusterWeights([[FAM.balcony, 0.3], [FAM.punched, 0.2], [FAM.grid, 0.15], [FAM.deco, 0.1], [FAM.glassGreen, 0.15], [FAM.glassBlue, 0.1]] as const, nb.glass))
              : pickWeighted(drng, clusterWeights([[FAM.brick, 0.28], [FAM.punched, 0.24], [FAM.deco, 0.16], [FAM.balcony, 0.16], [FAM.grid, 0.1], [FAM.concrete, 0.06]] as const, nb.glass));
            const rr = drng.next();
            const long = Math.min(fw, fd) > 20;
            const recipe = h > 45
              ? (rr < 0.2 ? 1 : rr < 0.28 ? 7 : rr < 0.4 && long ? 2 : rr < 0.48 ? 3 : rr < 0.58 ? 9 : rr < 0.66 && long ? 10 : rr < 0.74 ? 13 : rr < 0.8 ? 12 : 0)
              : (rr < 0.2 ? 3 : rr < 0.3 && long ? 2 : rr < 0.4 ? 9 : rr < 0.5 ? 13 : rr < 0.56 && long ? 10 : 0);
            plan.take(lx, lz, fw, fd);
            // the corner tower's lobby faces the longer of its two streets
            const front = bw >= bd ? (sz < 0 ? 0 : 1) : (sx < 0 ? 2 : 3);
            buildTower(drng, x, z, d.rot, fw, fd, h, fam, recipe, h > 20, nb.pastel, front);
            groundFloor(frng, x, z, fw, fd, d.rot, front, fam, h, false);
          }
        }
        // residential street wall: 2-8 storey walk-ups and condo slabs in the district's height range, courtyards
        // behind them; shops on the ground floor of about a third (more toward downtown)
        const sMin = Math.max(2, Math.round(d.hMin / 3.2)), sMax = clamp(Math.round((d.hMax * 0.55) / 3.2), sMin + 1, 10);
        streetWall(plan, frng, {
          storeys: () => clamp(Math.round(lerp(sMin, sMax, Math.pow(frng.next(), 1.8)) * lerp(0.85, 1.1, prox)), sMin, sMax),
          fam: (prev) => prev && frng.chance(0.5) ? prev : pickWeighted(frng, clusterWeights([[FAM.balcony, 0.26], [FAM.punched, 0.24], [FAM.brick, 0.18], [FAM.deco, 0.16], [FAM.grid, 0.08], [FAM.glassGreen, 0.04], [FAM.concrete, 0.04]] as const, nb.glass * 0.5)),
          fMean: 24, dMin: 13, dMax: 20, skip: 0.1, parking: 0.04, pastel: nb.pastel, retail: lerp(0.25, 0.5, prox),
        });
        interior(plan, frng, 13, frng.chance(0.75));
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

      /** Outer-ring urban block: walk-up apartment blocks, garden flats and the odd parking structure, 2-7 storeys,
       *  denser and taller the more `urban` the block is (next to the mid-rise districts or on an arterial). */
      function fillLowRise(urban: number, corridor: number): void {
        const along = bw >= bd ? 'x' : 'z';
        const L = Math.max(bw, bd), W = Math.min(bw, bd);
        const onCorridor = corridor < 60;
        // one parking structure per few corridor blocks: a bare concrete deck stack, wider than tall
        if (onCorridor && drng.chance(0.18 * urban + 0.04)) {
          const pw = Math.min(L * 0.55, drng.range(40, 70)), pd = Math.min(W * 0.8, drng.range(28, 48));
          const [x, z] = toWorld((bx0 + bx1) / 2 + drng.range(-bw * 0.15, bw * 0.15), (bz0 + bz1) / 2);
          const rot = d.rot + (along === 'x' ? 0 : Math.PI / 2);
          if (landOK(x, z, pw, pd, rot) && areaFree(x, z, pw + 3, pd + 3, rot)) {
            const h = 3.0 * drng.int(3, 6) + 1.2;
            const top = place('box', x, z, pw, h, pd, rot, drng.pick(GREYS), S.PARKING, 3.0, { lit: 0.3, warm: 0.4, variant: 0.4 });
            if (top !== null) {
              // stair / lift towers at two corners, a lamp mast, the cars on the roof deck
              place('box', ...toWorld((bx0 + bx1) / 2 - pw * 0.42, (bz0 + bz1) / 2 - pd * 0.38), 5, 4, 5, rot, '#a6a8a4', S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
              place('box', ...toWorld((bx0 + bx1) / 2 + pw * 0.42, (bz0 + bz1) / 2 + pd * 0.38), 5, 4, 5, rot, '#a6a8a4', S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
              place('frustum', x, z, 0.6, 9, 0.6, rot, '#c9ccce', S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
              lotCars(drng, x, z, pw, pd, rot, top, 0.4, (ox, oz) => Math.hypot(ox + pw * 0.42, oz + pd * 0.38) > 5 && Math.hypot(ox - pw * 0.42, oz - pd * 0.38) > 5);
            }
            return;
          }
        }
        // a row of walk-ups along each long side, gaps between them for yards and parking
        const rows: [number, number][] = along === 'x'
          ? (bd >= 44 ? [[bz0 + 11, 0], [bz1 - 11, Math.PI]] : [[(bz0 + bz1) / 2, 0]])
          : (bw >= 44 ? [[bx0 + 11, 0], [bx1 - 11, Math.PI]] : [[(bx0 + bx1) / 2, 0]]);
        const from = along === 'x' ? bx0 : bz0, to = along === 'x' ? bx1 : bz1;
        for (const [fixed, face] of rows) {
          let cursor = from + drng.range(2, 10);
          while (cursor < to - 14) {
            const front = drng.range(16, 34), depth = drng.range(12, Math.min(22, W * 0.42));
            if (cursor + front > to - 2) break;
            const mid = cursor + front / 2;
            cursor += front + drng.range(3, 14) * (1.3 - urban * 0.6);
            if (drng.next() > 0.45 + 0.5 * urban) continue;
            const lx = along === 'x' ? mid : fixed, lz = along === 'x' ? fixed : mid;
            const w = along === 'x' ? front : depth, dd = along === 'x' ? depth : front;
            const rot = d.rot + drng.range(-0.02, 0.02);
            const [x, z] = toWorld(lx, lz);
            if (!landOK(x, z, w, dd, rot) || !areaFree(x, z, w + 2, dd + 2, rot)) continue;
            const fam = pickWeighted(drng, clusterWeights([[FAM.brick, 0.22], [FAM.punched, 0.3], [FAM.balcony, 0.22], [FAM.deco, 0.12], [FAM.concrete, 0.06], [FAM.grid, 0.08]] as const, nb.glass * 0.5));
            const lk = look(fam, drng, nb.pastel);
            const floors = clamp(Math.round(drng.range(2, 3.4) + urban * drng.range(1, 4)), 2, 7);
            const h = fam.floorH * floors + 0.8;
            // the row faces its street (face 0 toward -local); shops on the corridor blocks' ground floors
            const sface = along === 'x' ? (face === 0 ? 0 : 1) : (face === 0 ? 2 : 3);
            const shops = fam.style !== S.CONCRETE && drng.chance(onCorridor ? 0.5 : 0.12);
            const top = place('box', x, z, w, h, dd, rot, lk.tint, fam.style, fam.floorH, { lit: lk.lit, warm: lk.warm, variant: lk.variant, margin: 1.5, front: sface + (shops ? 10 : 0) });
            if (top === null) continue;
            groundFloor(drng, x, z, w, dd, rot, sface, fam, h, shops);
            if (floors >= 4 && drng.chance(0.3)) place('box', x, z, w * 0.5, 2.8, dd * 0.45, rot, drng.pick(GREYS), S.CONCRETE, 3, { yBase: top - 0.2, margin: -1 });
            addSmallRoofKit(drng, x, z, w, dd, top, rot);
            if (face === 0 && drng.chance(0.2)) {
              // pool in the court behind (the first row faces outward, so its court lies toward +local)
              const [qx, qz] = along === 'x' ? toWorld(mid, fixed + depth / 2 + 6) : toWorld(fixed + depth / 2 + 6, mid);
              if (landOK(qx, qz, 8, 5, d.rot) && !occupied(qx, qz)) place('house', qx, qz, drng.range(6, 11), 0.4, drng.range(4, 6), d.rot, '#3fc4de', S.POOL, 3, { form: 2, margin: 0.5, yBase: map.heightAt(qx, qz) });
            }
          }
        }
      }

      /** Corridor commerce: a strip mall or big-box store set back behind its parking, a petrol canopy or a
       *  drive-through at the corner and a pylon sign at the kerb. Roofs are pale membrane, so from altitude these
       *  read as the bright flat rectangles that line every arterial of a sunbelt city. */
      function fillCommercial(corridor: number, far: number): void {
        const along = bw >= bd ? 'x' : 'z';
        const L = Math.max(bw, bd), W = Math.min(bw, bd);
        const big = drng.chance(0.3 + 0.3 * far);
        const fw = big ? Math.min(L * 0.7, drng.range(50, 90)) : Math.min(L * 0.8, drng.range(40, 95));
        const fd = big ? Math.min(W * 0.6, drng.range(35, 60)) : Math.min(W * 0.45, drng.range(14, 22));
        // the building sits at the back of the lot; the front (toward the block's long axis) is the car park
        const back = drng.chance(0.5) ? 1 : -1;
        const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
        const lx = along === 'x' ? cx + drng.range(-L * 0.08, L * 0.08) : cx + back * (W / 2 - fd / 2 - 3);
        const lz = along === 'x' ? cz + back * (W / 2 - fd / 2 - 3) : cz + drng.range(-L * 0.08, L * 0.08);
        const rot = d.rot + (along === 'x' ? 0 : Math.PI / 2);
        const [x, z] = toWorld(lx, lz);
        if (!landOK(x, z, fw, fd, rot) || !areaFree(x, z, fw + 3, fd + 3, rot)) { fillHouses(); return; }
        const fam = big ? FAM.industrial : pickWeighted(drng, [[FAM.punched, 0.35], [FAM.deco, 0.3], [FAM.industrial, 0.2], [FAM.concrete, 0.15]] as const);
        const lk = look(fam, drng, nb.pastel);
        const h = big ? drng.range(8, 12) : drng.range(4.5, 7);
        const top = place('box', x, z, fw, h, fd, rot, lk.tint, fam.style, fam.floorH, { lit: 0.35, warm: 0.7, variant: lk.variant, margin: 1 });
        if (top === null) return;
        // pale roof membrane with a few RTUs
        place('box', x, z, fw + 0.4, 0.4, fd + 0.4, rot, drng.pick(['#e9e7e0', '#dfdcd3', '#d6d2c8', '#c9c7c0']), S.CONCRETE, 3, { yBase: top - 0.1, margin: -1 });
        const nRtu = drng.int(1, big ? 6 : 3);
        for (let i = 0; i < nRtu; i++) place('box', x + drng.range(-fw * 0.4, fw * 0.4), z + drng.range(-fd * 0.35, fd * 0.35), drng.range(1.8, 3.2), drng.range(1.0, 1.8), drng.range(1.8, 2.8), rot + drng.range(-0.1, 0.1), drng.pick(PLANT_COLS), S.PLANT, 3, { yBase: top + 0.2, margin: -1, roof: -1 });
        addSmallRoofKit(drng, x, z, fw, fd, top + 0.3, rot);
        if (!big && drng.chance(0.5)) place('box', x, z, fw * drng.range(0.2, 0.4), 2.2, 1.0, rot, lk.tint, S.CONCRETE, 3, { yBase: top - 0.1, margin: -1 }); // parapet sign band
        // outparcel at one end: petrol canopy (flat slab on posts) or a drive-through box
        const endSide = drng.chance(0.5) ? 1 : -1;
        const ox = along === 'x' ? cx + endSide * (L / 2 - 16) : cx - back * (W / 2 - 12);
        const oz = along === 'x' ? cz - back * (W / 2 - 12) : cz + endSide * (L / 2 - 16);
        const [px, pz] = toWorld(ox, oz);
        if (drng.chance(0.55) && landOK(px, pz, 22, 16, rot) && areaFree(px, pz, 22, 16, rot)) {
          if (drng.chance(0.5)) {
            const cy = map.heightAt(px, pz);
            place('box', px, pz, 20, 0.9, 13, rot, drng.pick(['#f3f3ee', '#e8382d', '#2c6fb5', '#f2b41c']), S.CONCRETE, 3, { yBase: cy + 5.2, margin: 0 });
            for (const [sx, sz] of [[-6, -3.5], [6, -3.5], [-6, 3.5], [6, 3.5]]) {
              const cr = Math.cos(rot), sr = Math.sin(rot);
              place('box', px + sx * cr - sz * sr, pz + sx * sr + sz * cr, 0.7, 5.2, 0.7, rot, '#c9ccce', S.CONCRETE, 3, { margin: -1 });
            }
            place('box', px + 14 * Math.cos(rot), pz + 14 * Math.sin(rot), 9, 4.2, 7, rot, '#f1efe8', S.PUNCHED, 3.2, { lit: 0.6, warm: 0.6, margin: 0.5 });
          } else {
            const dk = look(FAM.deco, drng, nb.pastel);
            place('box', px, pz, drng.range(12, 18), drng.range(4.5, 6), drng.range(9, 13), rot + drng.range(-0.1, 0.1), dk.tint, S.DECO, 3.3, { lit: 0.5, warm: 0.8, variant: dk.variant, margin: 1 });
          }
        }
        // pylon sign at the kerb
        const [sx, sz] = along === 'x' ? toWorld(lx + drng.range(-fw * 0.3, fw * 0.3), cz - back * (W / 2 - 4)) : toWorld(cx - back * (W / 2 - 4), lz + drng.range(-fw * 0.3, fw * 0.3));
        if (landOK(sx, sz, 1, 1, 0)) {
          const gy = map.heightAt(sx, sz);
          place('box', sx, sz, 0.6, 8, 0.6, rot, '#9a9c9e', S.CONCRETE, 3, { margin: -1 });
          place('box', sx, sz, 4.5, 2.6, 0.6, rot, drng.pick(['#e8382d', '#2c6fb5', '#f2b41c', '#ffffff', '#2f9e5b']), S.CONCRETE, 3, { yBase: gy + 8, margin: -1, lit: 1 });
        }
      }

      /** Small industrial lot in the outer suburbs: a workshop shed or two, a yard and a tank, tin roofs. */
      function fillIndustrialLot(): void {
        const n = drng.int(1, 3);
        for (let i = 0, placed = 0; i < n * 3 && placed < n; i++) {
          const fw = drng.range(18, Math.min(50, bw * 0.7)), fd = drng.range(14, Math.min(34, bd * 0.7));
          const lx = drng.range(bx0 + fw / 2, bx1 - fw / 2), lz = drng.range(bz0 + fd / 2, bz1 - fd / 2);
          const rot = d.rot + drng.range(-0.04, 0.04);
          const [x, z] = toWorld(lx, lz);
          if (!landOK(x, z, fw, fd, rot) || !areaFree(x, z, fw + 4, fd + 4, rot)) continue;
          placed++;
          const lk = look(FAM.industrial, drng);
          const h = drng.range(5.5, 9.5);
          const top = place('box', x, z, fw, h, fd, rot, lk.tint, S.INDUSTRIAL, 4.0, { lit: lk.lit, warm: lk.warm, variant: lk.variant, margin: 2 });
          if (top === null) continue;
          if (drng.chance(0.6)) place('box', x, z, fw + 0.6, 0.5, fd + 0.6, rot, drng.pick(['#8f9599', '#b8bab6', '#7d8489', '#a2836a']), S.CONCRETE, 3, { yBase: top - 0.05, margin: -1 });
          const nv = drng.int(0, 3);
          for (let k = 0; k < nv; k++) place('cyl', x + drng.range(-fw * 0.35, fw * 0.35), z + drng.range(-fd * 0.3, fd * 0.3), 1.2, drng.range(0.8, 1.6), 1.2, 0, '#c4c7c9', S.CONCRETE, 3, { yBase: top + 0.3, margin: -1 });
          if (drng.chance(0.4)) {
            const [tx, tz] = toWorld(lx + fw / 2 + 7, lz + drng.range(-fd * 0.3, fd * 0.3));
            if (landOK(tx, tz, 8, 8, 0) && !occupied(tx, tz)) place('cyl', tx, tz, drng.range(4, 7), drng.range(5, 9), drng.range(4, 7), 0, drng.pick(['#dcdcd4', '#cfd6dd', '#b7b9b3']), S.CONCRETE, 3);
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
  return { batches, openSpaces, landmarkPositions, occupied, markOccupied, footprints };
}

export function districtByZone(map: WorldMap, zone: Zone): District[] {
  return map.districts.filter((d) => d.zone === zone);
}

export { clamp };
