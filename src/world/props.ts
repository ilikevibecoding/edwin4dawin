import * as THREE from 'three';
import { Rng } from '../core/seed';
import { PORT_ISLAND, type WorldMap } from './map';
import type { LampKind, LampPlan } from './streets';
import type { MooredBoat } from './traffic';
import { InstanceBatch, addNeutralVertexAttributes, cellKey, createBatchedPbrMaterial, mergeUnitParts, splitCells, type BatchSource, type CellSource } from './batching';
import { LAYER_CAMERA, LAYER_CASCADE0, LAYER_MIRROR, MAX_CASCADES, activeShadowPassIsFine, cascadeIsFine, layerMask, maskCasts, type ViewCull } from './culling';

/** One placed unit shape: transform, source material and thickness (middle dimension, m). */
interface Placement { m: THREE.Matrix4; mat: string; size: number }

/** Middle of three dimensions: the narrowest width a shadow of the object can have on the ground. */
function thickness(a: number, b: number, c: number): number {
  return a + b + c - Math.max(a, b, c) - Math.min(a, b, c);
}

/** One instanced mesh of a chunk. Instances are ordered large-first, so drawing only the first
 *  `large` of them leaves out everything thinner than SMALL: that prefix is what the far cascades and
 *  distant main-pass views render. `lo` is a coarser unit shape for the distance. */
interface ChunkMesh extends BatchSource {
  mesh: THREE.InstancedMesh; large: number; total: number; mainCount: number; hi: THREE.BufferGeometry; lo: THREE.BufferGeometry | null;
  /** the coarse shape is for beyond SMALL_DISTANCE rather than LOD_DISTANCE, and the mesh casts as the fine one */
  loFar: boolean;
  /** the camera and mirror leave this mesh's cells out beyond this distance (lamps: their dots take over) */
  far: number;
  /** camera / mirror batches drawing this mesh's unit shape at each LOD */
  batches: [PropBatches, PropBatches | null];
  /** PROP_CELL-metre cells over the large prefix and over all instances (built on first use): the batches
   *  draw only the cells in the camera's / mirror camera's frustum */
  cellsLarge: PropCell[] | null; cellsAll: PropCell[] | null;
  /** batches the mesh is currently in, and the cells it is in them with */
  inCamera: InstanceBatch | null; cameraCells: PropCell[] | null; inMirror: InstanceBatch | null; mirrorCells: PropCell[] | null;
  /** per cascade: the shadow batch the mesh's cells are in and those cells (see `placeShadow`) */
  inShadow: (InstanceBatch<PropCell> | null)[]; shadowCells: (PropCell[] | null)[];
}
/** A cell with its caster-routing result cached for the frame it was computed in, and the number of its
 *  instances (a prefix: the indices are ascending and the mesh is ordered large-first) thicker than SMALL. */
interface PropCell extends CellSource { castBits: number; castFrame: number; nLarge: number }
/** the camera and mirror batches of one unit shape, plus its shadow batch per cascade (the cells of every
 *  casting chunk mesh that can shade that cascade's slice, in one draw) */
interface PropBatches { camera: InstanceBatch; mirror: InstanceBatch; shadow: InstanceBatch<PropCell>[] }
const PROP_CELL = 250;

/** Spatial chunk of props: boxes, large cylinders, small cylinders and lamps, one instanced mesh each. */
interface PropChunk { meshes: ChunkMesh[]; box: THREE.Box3; center: THREE.Vector3; r: number; height: number; /** cascade-index bitmask this frame */ bits: number; /** the chunk's shadow-proxy instances (boxes / cylinders at least PROXY_SIZE thick) */ proxies: [ProxySource | null, ProxySource | null]; /** the same split into PROP_CELL cells (built on first use) */ proxyCells: [PropCell[] | null, PropCell[] | null] }
interface ProxySource extends BatchSource { count: number }
/** shadow proxies of one coarse cascade: one instanced batch of boxes and one of cylinders */
interface ProxyBatches { shapes: [InstanceBatch<PropCell>, InstanceBatch<PropCell>]; active: boolean }

const CHUNK = 2500;
/** objects thinner than this (pilings, poles, railings) cast into the nearest cascade only: their
 *  shadows are under a texel wide in every other cascade */
const SMALL = 1.0;
/** thin cylinders and lamp poles use a 6-sided prism beyond this (a 30 cm piling is ~1 px there) */
const LOD_DISTANCE = 350;
/** objects thinner than SMALL are well under a pixel wide beyond this and leave the main pass */
const SMALL_DISTANCE = 2500;
/** props leave the main pass where a PROXY_SIZE-thick object (a container) projects under PROP_MIN_PX pixels wide,
 *  unless the tallest object of their cell still stands PROP_TALL_PX pixels high there (a crane, a tank farm) */
export const PROP_MIN_PX = 0.5;
export const PROP_TALL_PX = 3;
/** the mirror image (half resolution, blurred by the water's roughness) leaves out objects thinner than SMALL
 *  beyond MIRROR_SMALL_DISTANCE and everything beyond MIRROR_FAR (cell distances) */
export const MIRROR_SMALL_DISTANCE = 800;
export const MIRROR_FAR = 3500;
/** objects at least this thick make up the shadow proxies drawn by the coarse cascades (a 2 m crate is under a texel there) */
const PROXY_SIZE = 2.5;
const _perCascade = new Array<number>(MAX_CASCADES).fill(0);
/** draw calls a cascade's proxy batches cost (boxes + cylinders) */
const PROXY_DRAWS = 2;

const allOf = (c: PropCell): number => c.count;

/** street lamp kinds, in batch order */
const LAMP_KINDS: LampKind[] = ['arterial', 'street', 'ped', 'highway', 'mast'];
/** luminaire position in the unit lamp's frame (x along the arm, y height) per kind: where the night dot sits */
const LAMP_HEAD: Record<LampKind, [number, number]> = { arterial: [3.3, 10.9], street: [2.0, 8.4], ped: [0, 4.25], highway: [0, 9.05], mast: [0, 29.6] };
/** dot sprite size (m) and gain per kind: a high mast's crown of eight luminaires is a bigger, brighter point */
const LAMP_DOT: Record<LampKind, [number, number]> = { arterial: [1.2, 1], street: [1.1, 0.85], ped: [0.8, 0.5], highway: [1.2, 1], mast: [3.6, 2.5] };
/** lamp dots fade in where the luminaire geometry falls under a pixel, hold to DOT_FULL_FAR (the night bench view
 *  looks at downtown from 3.7 km) and fade out toward DOT_FAR */
const DOT_NEAR = 70, DOT_FULL = 140, DOT_FULL_FAR = 4000, DOT_FAR = 5000;
/** lamp geometry leaves the main pass here (a pole is 0.2 px wide, the luminaire under a pixel; the dots carry the
 *  night): 38 k lamps drawn to SMALL_DISTANCE cost 300 k triangles in the high views for nothing visible */
const LAMP_FAR = 600;

/** A unit box without its -Y face (BoxGeometry's fourth group): the far shape of boxes, which sit on the ground
 *  or a deck and are under a pixel wide where it is used. */
function boxWithoutBottom(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const idx = g.index!.array;
  const kept = new Uint16Array(idx.length - 6);
  kept.set(idx.subarray(0, 18), 0);
  kept.set(idx.subarray(24), 18);
  g.setIndex(new THREE.BufferAttribute(kept, 1));
  g.clearGroups();
  return g;
}

/** Point sprites for the luminaires at night: a warm dot ~1.2 m across (clamped to 1.5..4.5 px) that fades in between
 *  DOT_NEAR and DOT_FULL, where the head geometry drops under a pixel, and out toward DOT_FAR. Additive, depth-tested
 *  against the buildings, no depth write. `uFocal` is the frame's focal length in pixels. */
function createLampDotMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uNight: { value: 0 }, uFocal: { value: 1000 } },
    vertexShader: /* glsl */ `
      uniform float uFocal;
      attribute vec2 aDot; // sprite size (m), gain
      varying float vFade;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float d = length(mv.xyz);
        vFade = aDot.y * smoothstep(${DOT_NEAR.toFixed(1)}, ${DOT_FULL.toFixed(1)}, d) * (1.0 - smoothstep(${DOT_FULL_FAR.toFixed(1)}, ${DOT_FAR.toFixed(1)}, d));
        gl_PointSize = clamp(aDot.x * uFocal / max(d, 1.0), 1.5, 4.5 + 2.5 * step(2.0, aDot.x));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNight;
      varying float vFade;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.35, 1.0, r)) * vFade * uNight;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * 5.0 * a, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}

/** The placements at least PROXY_SIZE thick of `list` as an instance source (matrices only). */
function proxySource(list: Placement[]): ProxySource | null {
  const big = list.filter((p) => p.size >= PROXY_SIZE);
  if (!big.length) return null;
  const matrices = new Float32Array(big.length * 16);
  big.forEach((p, i) => matrices.set(p.m.elements, i * 16));
  return { matrices, colors: null, extras: [], count: big.length };
}

/** Static world dressing: marinas, port, airport, stadium, lighthouse, construction sites, lamps, seawalls.
 *  Everything is drawn from spatial chunks of instanced unit shapes; one material carries the colour,
 *  roughness and metalness (per instance for boxes and cylinders, per vertex for the composite lamp)
 *  so a chunk costs at most four draw calls, and thin objects only reach the nearest shadow cascade. */
export class Props {
  readonly group = new THREE.Group();
  readonly material: THREE.MeshStandardMaterial;
  readonly lampMaterial: THREE.MeshStandardMaterial;
  /** focal length of the main frame in pixels per metre at 1 m (the thin-member inflation of the lamps) */
  private readonly focalPx: THREE.IUniform<number> = { value: 1000 };
  readonly materials: THREE.Material[] = [];
  readonly lampPositions: THREE.Vector3[] = [];
  readonly mooredBoatPositions: MooredBoat[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly boxes: Placement[] = [];
  private readonly cyls: Placement[] = [];
  private readonly lamps: Record<LampKind, Placement[]> = { arterial: [], street: [], ped: [], highway: [], mast: [] };
  /** night point sprites standing in for the luminaires beyond DOT_NEAR, one Points per chunk */
  private readonly dots: { points: THREE.Points; center: THREE.Vector3; r: number }[] = [];
  private readonly dotMaterial: THREE.ShaderMaterial;
  private readonly chunks: PropChunk[] = [];
  private readonly allBatches: PropBatches[] = [];
  /** shadow-only proxies (boxes and cylinders at least PROXY_SIZE thick) per cascade: a coarse cascade that
   *  would draw more chunk meshes than PROXY_DRAWS takes its two proxy batches instead, filled with the
   *  proxies of the chunks that can cast into it */
  private readonly proxyBatches: ProxyBatches[] = [];
  readonly cameraMeshes = new Set<THREE.Object3D>();
  readonly mirrorMeshes = new Set<THREE.Object3D>();
  private readonly mats: Record<string, THREE.MeshStandardMaterial>;
  counts = { boxes: 0, cylinders: 0, lamps: 0, chunks: 0, meshes: 0 };

  constructor(private map: WorldMap, bridgeLamps: THREE.Vector3[], private markOccupied: (x: number, z: number, r: number) => void, lampPlan: LampPlan[]) {
    // colour / roughness / metalness sources for the batched material (never compiled themselves)
    this.mats = {
      concrete: new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: 0.9 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.8 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x9aa4ad, roughness: 0.45, metalness: 0.7 }),
      red: new THREE.MeshStandardMaterial({ color: 0xc8402e, roughness: 0.6 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x2f5aa8, roughness: 0.6 }),
      green: new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.6 }),
      orange: new THREE.MeshStandardMaterial({ color: 0xd9782a, roughness: 0.6 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x8b6b48, roughness: 0.9 }),
      tank: new THREE.MeshStandardMaterial({ color: 0xdcdcd4, roughness: 0.5, metalness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.15, metalness: 0.8 }),
      grass: new THREE.MeshStandardMaterial({ color: 0x3f8a2e, roughness: 0.95 }),
      yellow: new THREE.MeshStandardMaterial({ color: 0xe0b23a, roughness: 0.6 }),
      lampHead: new THREE.MeshStandardMaterial({ color: 0xffffff }),
    };
    // the emissive colour is the lamp heads' glow; `aEmissive` masks it to those vertices
    this.material = createBatchedPbrMaterial('props-v4', true, 0xffd9a0);
    // the lamps' own program: the same shading plus the thin-member inflation (poles, arms and heads held to a pixel
    // across to LAMP_FAR, so the lamp rows read from the air by day and not only as dots at night)
    this.lampMaterial = createBatchedPbrMaterial('props-lamps-v1', true, 0xffd9a0, this.focalPx);
    this.materials.push(this.material, this.lampMaterial);
    this.dotMaterial = createLampDotMaterial();
    const rng = new Rng('props');
    this.buildMarinas(rng.fork('marinas'));
    this.buildPrivateDocks(rng.fork('docks'));
    this.buildFishingPiers(rng.fork('piers'));
    this.buildChannelMarkers(rng.fork('markers'));
    this.buildLifeguardTowers(rng.fork('lifeguards'));
    this.buildClubhouse(rng.fork('clubhouse'));
    this.buildPort(rng);
    this.buildAirport(rng);
    this.buildStadium();
    this.buildLighthouse();
    this.buildConstruction(rng);
    this.buildLamps(lampPlan, bridgeLamps);
    this.buildSeawalls();
    this.flush();
  }

  // ---------------------------------------------------------------- shoreline helpers

  /** Distance along (dx,dz) from (x,z) to where the ground drops below the waterline. Negative when
   *  the start is already over water (then it is the distance back to land). */
  private shoreDistance(x: number, z: number, dx: number, dz: number, maxDist = 400): number {
    const wet = (d: number) => this.map.heightAt(x + dx * d, z + dz * d) < 0.15;
    if (!wet(0)) {
      for (let d = 1; d <= maxDist; d += 1) if (wet(d)) return d - 0.5;
      return maxDist;
    }
    for (let d = 1; d <= maxDist; d += 1) if (!wet(-d)) return -(d - 0.5);
    return -maxDist;
  }

  /** Vertical piling standing on the seabed (or the ground) and rising to `top`. */
  private piling(x: number, z: number, top: number, r = 0.18, mat = 'wood'): void {
    const bed = Math.min(this.map.heightAt(x, z), 0.2);
    this.cyl(mat, x, bed - 0.3, z, r, top - bed + 0.3);
  }

  /** Register a moored boat if the water there is deep enough to float it. */
  private moor(x: number, z: number, rot: number, len: number): void {
    if (this.map.heightAt(x, z) < -0.6) this.mooredBoatPositions.push({ x, z, rot, len });
  }

  private box(mat: string, x: number, y: number, z: number, w: number, h: number, d: number, rot = 0, tilt = 0, roll = 0): void {
    this.p.set(x, y + h / 2, z);
    this.q.setFromEuler(new THREE.Euler(tilt, rot, roll));
    this.s.set(w, h, d);
    this.boxes.push({ m: this.m.compose(this.p, this.q, this.s).clone(), mat, size: thickness(w, h, d) });
  }
  private cyl(mat: string, x: number, y: number, z: number, r: number, h: number, rot = 0, tilt = 0): void {
    this.p.set(x, y + h / 2, z);
    this.q.setFromEuler(new THREE.Euler(tilt, rot, 0));
    this.s.set(r * 2, h, r * 2);
    this.cyls.push({ m: this.m.compose(this.p, this.q, this.s).clone(), mat, size: thickness(r * 2, h, r * 2) });
  }
  /** Street lamp of `kind` footed at (x, y, z), its arm turned to `yaw` (the unit's +x along (cos yaw, 0, -sin yaw)). */
  private lamp(x: number, y: number, z: number, yaw: number, kind: LampKind): void {
    const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
    this.lamps[kind].push({ m, mat: 'steel', size: 0.24 });
  }

  /** Composite lamp unit in metres, arm along +x: tapered pole (`sides`-gon), arm, luminaire housing and its
   *  emissive lens (a post-top lantern for the pedestrian lamp; the highway unit is the plain 9 m pole). */
  private lampGeometry(kind: LampKind, sides: number): THREE.BufferGeometry {
    // every part is a thin member: `axis` is the line it is inflated away from in the vertex shader when it would
    // fall under a pixel — the pole's vertical axis, the arm's horizontal axis, the housing's own vertical axis
    type Axis = { dir: 'x' | 'y'; a: number; b: number }; // dir y: axis at (x = a, z = b); dir x: axis at (y = a, z = b)
    const parts: { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; emissive?: boolean | number; axis: Axis }[] = [];
    const steel = this.mats.steel, housing = this.mats.dark, lens = this.mats.lampHead;
    const Y = (a = 0, b = 0): Axis => ({ dir: 'y', a, b }), X = (a: number, b = 0): Axis => ({ dir: 'x', a, b });
    if (kind === 'arterial') {
      parts.push({ geometry: new THREE.CylinderGeometry(0.09, 0.15, 11, sides).translate(0, 5.5, 0), material: steel, axis: Y() });
      parts.push({ geometry: new THREE.BoxGeometry(3.4, 0.14, 0.14).translate(1.7, 10.85, 0), material: steel, axis: X(10.85) });
      // the housing glows a little too, so the luminaire reads as a lit point from above and the side at night
      parts.push({ geometry: new THREE.BoxGeometry(0.8, 0.16, 0.34).translate(3.3, 10.92, 0), material: housing, emissive: 0.3, axis: Y(3.3) });
      parts.push({ geometry: new THREE.BoxGeometry(0.56, 0.03, 0.24).translate(3.3, 10.83, 0), material: lens, emissive: true, axis: Y(3.3) });
    } else if (kind === 'street') {
      parts.push({ geometry: new THREE.CylinderGeometry(0.08, 0.12, 8.5, sides).translate(0, 4.25, 0), material: steel, axis: Y() });
      parts.push({ geometry: new THREE.BoxGeometry(2.1, 0.12, 0.12).translate(1.05, 8.35, 0), material: steel, axis: X(8.35) });
      parts.push({ geometry: new THREE.BoxGeometry(0.6, 0.14, 0.28).translate(2.0, 8.42, 0), material: housing, emissive: 0.3, axis: Y(2.0) });
      parts.push({ geometry: new THREE.BoxGeometry(0.42, 0.03, 0.2).translate(2.0, 8.34, 0), material: lens, emissive: true, axis: Y(2.0) });
    } else if (kind === 'ped') {
      parts.push({ geometry: new THREE.CylinderGeometry(0.06, 0.08, 4.0, sides).translate(0, 2.0, 0), material: steel, axis: Y() });
      parts.push({ geometry: new THREE.SphereGeometry(0.17, sides, 5).translate(0, 4.25, 0), material: lens, emissive: true, axis: Y() });
      parts.push({ geometry: new THREE.CylinderGeometry(0.2, 0.12, 0.08, sides).translate(0, 4.46, 0), material: housing, emissive: 0.25, axis: Y() });
    } else if (kind === 'mast') {
      // 30 m high mast: tapered tube, a crown ring of luminaires (housing above, lens plate below) that from the air
      // by day is a 2.6 m dark disc and at night the brightest point of the yard
      parts.push({ geometry: new THREE.CylinderGeometry(0.2, 0.36, 29.4, sides).translate(0, 14.7, 0), material: steel, axis: Y() });
      parts.push({ geometry: new THREE.CylinderGeometry(1.3, 1.1, 0.5, sides).translate(0, 29.75, 0), material: housing, emissive: 0.35, axis: Y() });
      parts.push({ geometry: new THREE.CylinderGeometry(1.15, 1.15, 0.12, sides).translate(0, 29.44, 0), material: lens, emissive: true, axis: Y() });
    } else {
      parts.push({ geometry: new THREE.CylinderGeometry(0.12, 0.12, 9, sides).translate(0, 4.5, 0), material: steel, axis: Y() });
      parts.push({ geometry: new THREE.BoxGeometry(0.2, 0.2, 2.4).translate(0, 9.1, 0), material: steel, axis: Y() });
      parts.push({ geometry: new THREE.SphereGeometry(0.22, 6, 4).translate(0, 9.05, 0), material: lens, emissive: true, axis: Y() });
    }
    const g = mergeUnitParts(parts);
    // aThin: the vertex's offset from its part's axis (mergeUnitParts keeps the parts' vertex order, non-indexed)
    const pos = g.getAttribute('position');
    const thin = new Float32Array(pos.count * 3);
    let v = 0;
    for (const p of parts) {
      const n = p.geometry.index ? p.geometry.index.count : p.geometry.getAttribute('position').count;
      for (let i = 0; i < n; i++, v++) {
        const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
        if (p.axis.dir === 'y') { thin[v * 3] = x - p.axis.a; thin[v * 3 + 2] = z - p.axis.b; }
        else { thin[v * 3 + 1] = y - p.axis.a; thin[v * 3 + 2] = z - p.axis.b; }
      }
    }
    g.setAttribute('aThin', new THREE.BufferAttribute(thin, 3));
    for (const p of parts) p.geometry.dispose();
    return g;
  }

  /** One Points object per chunk over every luminaire: the lit dot the lamps become beyond DOT_NEAR at night. */
  private buildLampDots(): void {
    const buckets = new Map<number, { pos: number[]; dot: number[] }>();
    const v = new THREE.Vector3();
    for (const kind of LAMP_KINDS) {
      const [ax, ay] = LAMP_HEAD[kind];
      const [size, gain] = LAMP_DOT[kind];
      for (const p of this.lamps[kind]) {
        v.set(ax, ay, 0).applyMatrix4(p.m);
        const key = cellKey(v.x, v.z, CHUNK);
        let list = buckets.get(key);
        if (!list) { list = { pos: [], dot: [] }; buckets.set(key, list); }
        list.pos.push(v.x, v.y, v.z);
        list.dot.push(size, gain);
      }
    }
    for (const list of buckets.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(list.pos, 3));
      g.setAttribute('aDot', new THREE.Float32BufferAttribute(list.dot, 2));
      g.computeBoundingSphere();
      const points = new THREE.Points(g, this.dotMaterial);
      points.name = 'lamp-dots';
      points.frustumCulled = true;
      points.matrixAutoUpdate = false;
      points.visible = false;
      points.layers.set(LAYER_CAMERA);
      points.renderOrder = 5;
      this.cameraMeshes.add(points);
      this.group.add(points);
      this.dots.push({ points, center: g.boundingSphere!.center.clone(), r: g.boundingSphere!.radius });
    }
  }

  /** Build the chunk meshes: placements are bucketed by CHUNK-metre cell and shape family; each bucket
   *  becomes one InstancedMesh with world-space bounds, its instances ordered large-first. */
  private flush(): void {
    const unitBox = addNeutralVertexAttributes(new THREE.BoxGeometry(1, 1, 1));
    const unitBoxLo = addNeutralVertexAttributes(boxWithoutBottom());
    const cylHi = addNeutralVertexAttributes(new THREE.CylinderGeometry(0.5, 0.5, 1, 14));
    const cylLo = addNeutralVertexAttributes(new THREE.CylinderGeometry(0.5, 0.5, 1, 6));
    const lampHi: Record<LampKind, THREE.BufferGeometry> = { arterial: this.lampGeometry('arterial', 12), street: this.lampGeometry('street', 10), ped: this.lampGeometry('ped', 8), highway: this.lampGeometry('highway', 14), mast: this.lampGeometry('mast', 12) };
    const lampLo: Record<LampKind, THREE.BufferGeometry> = { arterial: this.lampGeometry('arterial', 6), street: this.lampGeometry('street', 6), ped: this.lampGeometry('ped', 5), highway: this.lampGeometry('highway', 6), mast: this.lampGeometry('mast', 6) };
    for (const g of [unitBox, unitBoxLo, cylHi, cylLo, ...Object.values(lampHi), ...Object.values(lampLo)]) g.computeBoundingSphere();
    // camera / mirror batches, one pair per unit shape (the per-chunk meshes are left to the shadow passes)
    const nBoxes = this.boxes.length, nCyls = this.cyls.length;
    const PARAMS = [{ name: 'aMatParams', itemSize: 2 }];
    const batchesOf = (unit: THREE.BufferGeometry, capacity: number, extras: { name: string; itemSize: number }[], name: string, material = this.material): PropBatches => {
      const camera = new InstanceBatch(capacity, unit, material, extras, true);
      camera.mesh.layers.set(LAYER_CAMERA); camera.mesh.name = `props-${name}`;
      const mirror = new InstanceBatch(capacity, unit, material, extras, true);
      mirror.mesh.layers.set(LAYER_MIRROR); mirror.mesh.name = `props-${name}-mirror`;
      this.cameraMeshes.add(camera.mesh); this.mirrorMeshes.add(mirror.mesh);
      this.group.add(camera.mesh, mirror.mesh);
      // shadow batches, one per cascade (the depth pass reads matrices only: no colours or parameters)
      const shadow: InstanceBatch<PropCell>[] = [];
      for (let i = 0; i < MAX_CASCADES; i++) {
        const b = new InstanceBatch<PropCell>(capacity, unit, this.material, [], false);
        b.mesh.castShadow = true; b.mesh.receiveShadow = false;
        b.mesh.layers.set(LAYER_CASCADE0 + i);
        b.mesh.name = `props-${name}-shadow-${i}`;
        this.group.add(b.mesh);
        shadow.push(b);
      }
      return { camera, mirror, shadow };
    };
    const boxBatches = batchesOf(unitBox, nBoxes, PARAMS, 'boxes');
    const boxLoBatches = batchesOf(unitBoxLo, nBoxes, PARAMS, 'boxes-lo');
    const cylHiBatches = batchesOf(cylHi, nCyls, PARAMS, 'cylinders');
    const cylLoBatches = batchesOf(cylLo, nCyls, PARAMS, 'cylinders-lo');
    this.allBatches.push(boxBatches, boxLoBatches, cylHiBatches, cylLoBatches);
    const lampBatches: Record<LampKind, [PropBatches, PropBatches]> = { arterial: null!, street: null!, ped: null!, highway: null!, mast: null! };
    for (const kind of LAMP_KINDS) {
      const n = this.lamps[kind].length;
      lampBatches[kind] = [batchesOf(lampHi[kind], n, [], `lamps-${kind}`, this.lampMaterial), batchesOf(lampLo[kind], n, [], `lamps-${kind}-lo`, this.lampMaterial)];
      this.allBatches.push(...lampBatches[kind]);
    }
    type Bucket = { boxes: Placement[]; cylLarge: Placement[]; cylSmall: Placement[]; lamps: Record<LampKind, Placement[]> };
    const buckets = new Map<number, Bucket>();
    const bucketOf = (p: Placement): Bucket => {
      this.p.setFromMatrixPosition(p.m);
      const key = cellKey(this.p.x, this.p.z, CHUNK);
      let b = buckets.get(key);
      if (!b) { b = { boxes: [], cylLarge: [], cylSmall: [], lamps: { arterial: [], street: [], ped: [], highway: [], mast: [] } }; buckets.set(key, b); }
      return b;
    };
    const isLarge = (p: Placement) => p.size > SMALL;
    for (const p of this.boxes) bucketOf(p).boxes.push(p);
    for (const p of this.cyls) (isLarge(p) ? bucketOf(p).cylLarge : bucketOf(p).cylSmall).push(p);
    let nLamps = 0;
    for (const kind of LAMP_KINDS) { for (const p of this.lamps[kind]) bucketOf(p).lamps[kind].push(p); nLamps += this.lamps[kind].length; }
    this.counts.boxes = this.boxes.length; this.counts.cylinders = this.cyls.length; this.counts.lamps = nLamps;
    const sphere = new THREE.Sphere(), corner = new THREE.Vector3(), white = new THREE.Color(0xffffff);
    for (const b of buckets.values()) {
      const chunk: PropChunk = { meshes: [], box: new THREE.Box3(), center: new THREE.Vector3(), r: 0, height: 0, bits: 0, proxies: [proxySource(b.boxes), proxySource([...b.cylLarge, ...b.cylSmall])], proxyCells: [null, null] };
      // large instances first, so the first `large` instances are exactly the objects thicker than SMALL
      b.boxes.sort((u, v) => Number(isLarge(v)) - Number(isLarge(u)));
      /** `perVertex`: the unit carries colour / parameters per vertex (lamp) instead of per instance; `loFar`: the
       *  coarse shape is for the far distance (beyond SMALL_DISTANCE) rather than LOD_DISTANCE */
      const make = (list: Placement[], hi: THREE.BufferGeometry, lo: THREE.BufferGeometry | null, perVertex: boolean, batches: [PropBatches, PropBatches | null], loFar = false, far = Infinity) => {
        if (!list.length) return;
        const geo = hi.clone();
        const params = perVertex ? null : new THREE.InstancedBufferAttribute(new Float32Array(list.length * 2), 2);
        if (params) geo.setAttribute('aMatParams', params);
        const mesh = new THREE.InstancedMesh(geo, this.material, list.length);
        const bounds = new THREE.Box3();
        let large = 0;
        list.forEach((p, i) => {
          mesh.setMatrixAt(i, p.m);
          const src = this.mats[p.mat];
          mesh.setColorAt(i, perVertex ? white : src.color);
          params?.setXY(i, src.roughness, src.metalness);
          if (isLarge(p)) large++;
          sphere.copy(hi.boundingSphere!).applyMatrix4(p.m);
          bounds.expandByPoint(corner.copy(sphere.center).addScalar(-sphere.radius));
          bounds.expandByPoint(corner.copy(sphere.center).addScalar(sphere.radius));
        });
        mesh.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
        mesh.castShadow = true; mesh.receiveShadow = true;
        let loGeo: THREE.BufferGeometry | null = null;
        if (lo) {
          loGeo = lo.clone();
          if (params) loGeo.setAttribute('aMatParams', params);
        }
        const entry: ChunkMesh = { mesh, large, total: list.length, mainCount: list.length, hi: geo, lo: loGeo, loFar, far, batches, cellsLarge: null, cellsAll: null, inCamera: null, cameraCells: null, inMirror: null, mirrorCells: null, inShadow: new Array(MAX_CASCADES).fill(null), shadowCells: new Array(MAX_CASCADES).fill(null), matrices: mesh.instanceMatrix.array as Float32Array, colors: mesh.instanceColor!.array as Float32Array, extras: params ? [params.array as Float32Array] : [] };
        // the coarse cascades only see the large prefix; the fine ones (and any non-CSM light) see all
        mesh.onBeforeShadow = () => { mesh.count = activeShadowPassIsFine() ? entry.total : entry.large; };
        mesh.onAfterShadow = () => { mesh.count = entry.mainCount; };
        chunk.box.union(bounds);
        chunk.meshes.push(entry);
        this.group.add(mesh);
      };
      // boxes drop their bottom face in the distance (it faces the ground or a deck; an underside that could show,
      // a crane boom's, is a pixel wide at SMALL_DISTANCE): a container yard at 6-8 km is thousands of boxes. The
      // shadow passes keep the closed box
      make(b.boxes, unitBox, unitBoxLo, false, [boxBatches, boxLoBatches], true);
      make(b.cylLarge, cylHi, null, false, [cylHiBatches, null]);
      make(b.cylSmall, cylHi, cylLo, false, [cylHiBatches, cylLoBatches]);
      for (const kind of LAMP_KINDS) make(b.lamps[kind], lampHi[kind], lampLo[kind], true, lampBatches[kind], false, LAMP_FAR);
      chunk.box.getBoundingSphere(sphere);
      chunk.center.copy(sphere.center); chunk.r = sphere.radius; chunk.height = chunk.box.max.y - chunk.box.min.y;
      this.chunks.push(chunk);
      this.counts.meshes += chunk.meshes.length;
    }
    this.counts.chunks = this.chunks.length;
    // proxy batches per cascade, sized for every proxy instance of the world (the coarse cascades can
    // cover most of it)
    const nBoxProxies = this.boxes.filter((p) => p.size >= PROXY_SIZE).length, nCylProxies = this.cyls.filter((p) => p.size >= PROXY_SIZE).length;
    for (let i = 0; i < MAX_CASCADES; i++) {
      const shapes: [InstanceBatch<PropCell>, InstanceBatch<PropCell>] = [
        new InstanceBatch<PropCell>(Math.max(1, nBoxProxies), unitBox, this.material, [], false),
        new InstanceBatch<PropCell>(Math.max(1, nCylProxies), cylLo, this.material, [], false),
      ];
      shapes[0].mesh.name = `shadow-proxy-boxes-${i}`; shapes[1].mesh.name = `shadow-proxy-cylinders-${i}`;
      for (const b of shapes) {
        b.mesh.castShadow = true; b.mesh.receiveShadow = false;
        b.mesh.layers.set(LAYER_CASCADE0 + i);
        this.group.add(b.mesh);
      }
      this.proxyBatches.push({ shapes, active: false });
    }
    this.buildLampDots();
    this.boxes.length = 0; this.cyls.length = 0;
    for (const kind of LAMP_KINDS) this.lamps[kind].length = 0;
    this.proxyUnits = [unitBox.boundingSphere!, cylLo.boundingSphere!];
  }

  /** unit bounding spheres of the proxy shapes (boxes, cylinders) */
  private proxyUnits: [THREE.Sphere, THREE.Sphere] = [new THREE.Sphere(), new THREE.Sphere()];

  /** The cells of the first `n` instances of `e` (its large prefix or all of it), built on first use. */
  private cellsOf(e: ChunkMesh, n: number): PropCell[] {
    if (n === e.total) return e.cellsAll ??= this.splitMesh(e, n);
    return e.cellsLarge ??= this.splitMesh(e, n);
  }

  private splitMesh(e: ChunkMesh, n: number): PropCell[] {
    return this.splitSource(e, n, e.hi.boundingSphere!, e.large);
  }

  /** `src` regrouped into PROP_CELL cells, each bounded by its instances' transformed unit spheres; `large` is
   *  the length of the source's large prefix. */
  private splitSource(src: BatchSource, n: number, unit: THREE.Sphere, large: number): PropCell[] {
    const sphere = new THREE.Sphere(), corner = new THREE.Vector3();
    const cells = splitCells(src, n, PROP_CELL, (i, box) => {
      this.m.fromArray(src.matrices, i * 16);
      sphere.copy(unit).applyMatrix4(this.m);
      box.expandByPoint(corner.copy(sphere.center).addScalar(-sphere.radius));
      box.expandByPoint(corner.copy(sphere.center).addScalar(sphere.radius));
    }) as PropCell[];
    for (const c of cells) {
      c.castBits = 0; c.castFrame = -1;
      let k = 0;
      while (k < c.count && c.indices[k] < large) k++;
      c.nLarge = k;
    }
    return cells;
  }

  /** Cascades a cell's casters can shade this frame (its box swept along the sun and the shadow cameras' own
   *  frustums), computed once per cell and frame. */
  private cellCast(c: PropCell, cull: ViewCull): number {
    if (c.castFrame !== this.frame) {
      c.castFrame = this.frame;
      c.castBits = cull.boxCasterCascades(c.box, c.box.max.y - c.box.min.y);
    }
    return c.castBits;
  }

  /** Put the cells of `e` that can shade cascade `i` into that cascade's shadow batch (`cells` null removes it).
   *  False when the batch is full (the mesh then casts into the cascade on its own). */
  private placeShadow(e: ChunkMesh, i: number, cells: PropCell[] | null, batch: InstanceBatch<PropCell>, cull: ViewCull): boolean {
    const prev = e.inShadow[i], prevCells = e.shadowCells[i];
    if (prev && (prev !== batch || prevCells !== cells)) {
      for (const c of prevCells!) prev.set(c, 0);
      e.inShadow[i] = null; e.shadowCells[i] = null;
    }
    if (cells === null) return true;
    const bit = 1 << i;
    let ok = true;
    for (const c of cells) if (!batch.set(c, this.cellCast(c, cull) & bit ? c.count : 0)) ok = false;
    if (!ok) { for (const c of cells) batch.set(c, 0); e.inShadow[i] = null; e.shadowCells[i] = null; return false; }
    e.inShadow[i] = batch; e.shadowCells[i] = cells;
    return true;
  }

  private frame = 0;

  /** Put the cells of `e` that pass `inView` into `batch` (moving it out of the batch and cells it was in);
   *  `cells` null removes it. False when it does not fit. `countOf` (mirror) picks how much of a cell is drawn. */
  private place(e: ChunkMesh, cells: PropCell[] | null, batch: InstanceBatch, slot: 'inCamera' | 'inMirror', inView: (box: THREE.Box3) => boolean, countOf: (c: PropCell) => number = allOf): boolean {
    const cellSlot = slot === 'inCamera' ? 'cameraCells' : 'mirrorCells';
    const prev = e[slot], prevCells = e[cellSlot];
    if (prev && (prev !== batch || prevCells !== cells)) {
      for (const c of prevCells!) prev.set(c, 0);
      e[slot] = null; e[cellSlot] = null;
    }
    if (cells === null) return true;
    let ok = true;
    for (const c of cells) if (!batch.set(c, inView(c.box) ? countOf(c) : 0)) ok = false;
    if (!ok) { for (const c of cells) batch.set(c, 0); e[slot] = null; e[cellSlot] = null; return false; }
    e[slot] = batch; e[cellSlot] = cells;
    return true;
  }

  /** Lamp heads glow at night; the distant dots come on with them. */
  setNight(night: number): void {
    this.material.emissiveIntensity = this.lampMaterial.emissiveIntensity = 8 * night;
    this.dotMaterial.uniforms.uNight.value = night;
  }

  /** Per-frame culling: a chunk is drawn when its box is in view and casts when its shadow can reach
   *  the view; meshes that only cast leave the camera layer. Beyond SMALL_DISTANCE the main pass draws
   *  the large prefix only; thin cylinders and lamps swap to the coarse prism beyond LOD_DISTANCE. */
  /** `pxPerMetre`: screen pixels a metre covers at 1 m from the camera (focal length in pixels). */
  updateLod(camX: number, camZ: number, cull: ViewCull, camPos: THREE.Vector3, mirrorRange: number, pxPerMetre: number): void {
    this.frame++;
    const propFar = (PROXY_SIZE * pxPerMetre) / PROP_MIN_PX;
    // lamp dots: at night, the chunks within DOT_FAR (the sprites fade themselves by distance)
    const night = this.dotMaterial.uniforms.uNight.value as number;
    this.dotMaterial.uniforms.uFocal.value = pxPerMetre;
    this.focalPx.value = pxPerMetre;
    for (const d of this.dots) d.points.visible = night > 0.02 && Math.hypot(d.center.x - camX, d.center.z - camZ) - d.r < DOT_FAR;
    // coarse cascades that would draw more chunk meshes than the proxies cost take the proxies instead
    const perCascade = _perCascade;
    perCascade.fill(0);
    for (const c of this.chunks) {
      c.bits = cull.casterCascades(c.center, c.r, c.height);
      let large = 0;
      for (const e of c.meshes) if (e.large > 0) large++;
      for (let i = 0; i < MAX_CASCADES; i++) if (c.bits & (1 << i)) perCascade[i] += large;
    }
    let proxyBits = 0;
    for (let i = 0; i < MAX_CASCADES; i++) if (perCascade[i] > PROXY_DRAWS && !cascadeIsFine(i)) proxyBits |= 1 << i;
    const inViewBox = (box: THREE.Box3) => cull.boxInView(box), inMirrorBox = (box: THREE.Box3) => cull.boxInMirror(box);
    // how much of a cell the mirror draws: everything near, the large prefix to MIRROR_FAR, nothing beyond (and
    // nothing of the current mesh beyond its own far distance)
    let meshFar = Infinity;
    const mirrorCountOf = (c: PropCell): number => {
      const d = c.box.distanceToPoint(camPos);
      return d > MIRROR_FAR || d > meshFar ? 0 : d > MIRROR_SMALL_DISTANCE ? c.nLarge : c.count;
    };
    /** true where a group of props `height` metres tall at distance `d` is under both pixel thresholds */
    const subpixel = (d: number, height: number): boolean => d > propFar && height * pxPerMetre < PROP_TALL_PX * d;
    const cameraCountOf = (c: PropCell): number => {
      const d = c.box.distanceToPoint(camPos);
      return d > meshFar || subpixel(d, c.box.max.y - c.box.min.y) ? 0 : c.count;
    };
    for (const c of this.chunks) {
      const d = Math.max(0, Math.hypot(c.center.x - camX, c.center.z - camZ) - c.r);
      const inView = cull.boxInView(c.box);
      const bits = c.bits & ~proxyBits;
      for (const e of c.meshes) {
        meshFar = e.far;
        const far = d > Math.min(SMALL_DISTANCE, e.far);
        const n = subpixel(d, c.height) ? 0 : far ? e.large : e.total;
        e.mainCount = n;
        e.mesh.count = n;
        const drawn = inView && n > 0;
        const lo = e.lo !== null && d > (e.loFar ? SMALL_DISTANCE : LOD_DISTANCE);
        // the far-only coarse shape is for the camera and mirror; the mesh (a shadow fallback) keeps the fine one
        if (e.lo && !e.loFar) e.mesh.geometry = lo ? e.lo : e.hi;
        // the camera draws the mesh's prefix from the batch of its unit shape at this LOD; the mesh itself is
        // left to the shadow passes (and to the camera only when the batch is full)
        const pb = e.batches[lo ? 1 : 0] ?? e.batches[0];
        const shadowPb = e.loFar ? e.batches[0] : pb;
        const cells = drawn ? this.cellsOf(e, n) : null;
        const batched = this.place(e, cells, pb.camera, 'inCamera', inViewBox, cameraCountOf);
        // shadows: the cascades the chunk can shade take the mesh's cells that can shade them from the shape's
        // shadow batches (the fine cascades every instance, the coarse ones the large prefix, as the mesh itself
        // would draw them); the mesh casts on its own only into a cascade whose batch is full
        let own = 0;
        for (let i = 0; i < MAX_CASCADES; i++) {
          let cast: PropCell[] | null = null;
          if (bits & (1 << i)) { const nc = cascadeIsFine(i) ? e.total : e.large; if (nc > 0) cast = this.cellsOf(e, nc); }
          if (!this.placeShadow(e, i, cast, shadowPb.shadow[i], cull)) own |= 1 << i;
        }
        let mask = layerMask(e.large > 0 ? 'all' : 'near', drawn && !batched, own);
        const cast = maskCasts(mask);
        // the water mirrors the chunk meshes within the reflection range (distance to the mesh's bounding sphere)
        const sphere = e.mesh.boundingSphere!;
        const mirrored = drawn && Math.max(0, sphere.center.distanceTo(camPos) - sphere.radius) <= Math.min(mirrorRange, MIRROR_FAR);
        if (!this.place(e, mirrored ? cells : null, pb.mirror, 'inMirror', inMirrorBox, mirrorCountOf)) mask |= 1 << LAYER_MIRROR;
        e.mesh.visible = mask !== 0;
        e.mesh.castShadow = cast;
        e.mesh.layers.mask = mask;
      }
    }
    for (const b of this.allBatches) { b.camera.commit(); b.mirror.commit(); for (const s of b.shadow) s.commit(); }
    // each proxy cascade draws the proxies of the chunks that can cast into it, cell by cell
    for (let i = 0; i < MAX_CASCADES; i++) {
      const on = (proxyBits & (1 << i)) !== 0;
      const pb = this.proxyBatches[i];
      if (!on && !pb.active) continue;
      const bit = 1 << i;
      for (const c of this.chunks) {
        const cast = on && (c.bits & bit) !== 0;
        for (let k = 0; k < 2; k++) {
          const src = c.proxies[k];
          if (!src) continue;
          const cells = c.proxyCells[k] ??= cast ? this.splitSource(src, src.count, this.proxyUnits[k], src.count) : null;
          if (!cells) continue;
          for (const cell of cells) pb.shapes[k].set(cell, cast && this.cellCast(cell, cull) & bit ? cell.count : 0);
        }
      }
      for (const b of pb.shapes) b.commit();
      pb.active = on;
    }
  }

  /** Marinas: a bulkhead and boardwalk at the water's edge, piers of uneven length and spacing with
   *  irregular finger slips, T-heads for the bigger yachts, a fuel dock and dry-stack yard on land. */
  private buildMarinas(rng: Rng): void {
    for (const ma of this.map.marinas) {
      const r = rng.fork(ma.id);
      const dirX = Math.sin(ma.rot), dirZ = -Math.cos(ma.rot); // piers extend this way (into the water)
      const sideX = -dirZ, sideZ = dirX;
      // snap the base to the actual shoreline so the boardwalk sits at the water's edge
      const shore = this.shoreDistance(ma.x, ma.z, dirX, dirZ);
      const sx = ma.x + dirX * shore, sz = ma.z + dirZ * shore;
      const walkLen = ma.piers * r.range(24, 30) + 24;
      const deck = 0.95;
      // boxes rotated by -rot have their local x along `side` and local z along `dir`
      const yaw = -ma.rot;
      const slab = (mat: string, cx: number, y: number, cz: number, alongSide: number, h: number, alongDir: number) => this.box(mat, cx, y, cz, alongSide, h, alongDir, yaw);
      // concrete bulkhead cap + boardwalk on the land side, pilings under the outer edge
      slab('concrete', sx - dirX * 0.4, 0.3, sz - dirZ * 0.4, walkLen, 0.9, 1.2);
      slab('wood', sx - dirX * 3.2, deck - 0.3, sz - dirZ * 3.2, walkLen, 0.3, 5.5);
      for (let o = -walkLen / 2 + 2; o < walkLen / 2; o += r.range(5, 8)) this.piling(sx + sideX * o + dirX * 0.4, sz + sideZ * o + dirZ * 0.4, deck + 0.55, 0.2);
      // piers
      let off = -walkLen / 2 + r.range(8, 16);
      while (off < walkLen / 2 - 8) {
        const px = sx + sideX * off, pz = sz + sideZ * off;
        let len = ma.pierLen * r.range(0.6, 1.2);
        // shorten piers whose far end would run aground
        while (len > 30 && this.map.heightAt(px + dirX * len, pz + dirZ * len) > -1.2) len -= 6;
        if (len <= 30) { off += r.range(22, 34); continue; }
        const cx = px + dirX * len / 2, cz = pz + dirZ * len / 2;
        const wide = r.chance(0.3);
        slab('wood', cx, deck - 0.3, cz, wide ? 3.2 : 2.2, 0.3, len);
        for (let t = r.range(2, 6); t < len; t += r.range(8, 12)) {
          for (const sd of [-1, 1]) this.piling(px + dirX * t + sideX * sd * (wide ? 1.7 : 1.3), pz + dirZ * t + sideZ * sd * (wide ? 1.7 : 1.3), deck + r.range(0.4, 0.9), r.range(0.15, 0.2));
        }
        // finger slips: alternating lengths, random gaps, boats of mixed size
        const slipGap = r.range(10, 14);
        for (let t = r.range(6, 12); t < len - 8; t += slipGap) {
          for (const sd of [-1, 1]) {
            if (r.chance(0.18)) continue;
            const fl = r.range(6, 9.5);
            const fx = px + dirX * t + sideX * sd * (fl / 2 + 1), fz = pz + dirZ * t + sideZ * sd * (fl / 2 + 1);
            slab('wood', fx, deck - 0.4, fz, fl, 0.25, 0.9);
            this.piling(px + dirX * t + sideX * sd * (fl + 0.6), pz + dirZ * t + sideZ * sd * (fl + 0.6), deck + 0.4, 0.14);
            if (r.chance(0.62)) {
              const bl = r.range(6.5, 12.5);
              const bx = px + dirX * (t + slipGap * 0.5) + sideX * sd * (bl * 0.45 + 1.2), bz = pz + dirZ * (t + slipGap * 0.5) + sideZ * sd * (bl * 0.45 + 1.2);
              this.moor(bx, bz, ma.rot + Math.PI / 2, bl);
            }
          }
        }
        // T-head with a couple of larger yachts alongside
        if (r.chance(0.55)) {
          const tw = r.range(16, 26);
          const ex = px + dirX * (len - 1.2), ez = pz + dirZ * (len - 1.2);
          slab('wood', ex, deck - 0.3, ez, tw, 0.3, 2.4);
          for (const sd of [-1, 1]) this.piling(ex + sideX * sd * tw * 0.5, ez + sideZ * sd * tw * 0.5, deck + 0.7, 0.2);
          for (const sd of [-1, 1]) if (r.chance(0.7)) this.moor(ex + dirX * 4.5 + sideX * sd * tw * 0.25, ez + dirZ * 4.5 + sideZ * sd * tw * 0.25, ma.rot + Math.PI / 2, r.range(13, 19));
        }
        off += r.range(22, 36);
      }
      // fuel dock at one end of the boardwalk: pumps and a canopy over the water
      const fo = (r.chance(0.5) ? -1 : 1) * (walkLen / 2 - 6);
      const fx = sx + sideX * fo + dirX * 7, fz = sz + sideZ * fo + dirZ * 7;
      slab('wood', fx, deck - 0.3, fz, 9, 0.3, 14);
      for (const sd of [-1, 1]) this.piling(fx + sideX * sd * 4 + dirX * 6, fz + sideZ * sd * 4 + dirZ * 6, deck + 0.6, 0.2);
      for (const sd of [-1, 1]) this.cyl('steel', fx + sideX * sd * 3, deck, fz + sideZ * sd * 3, 0.16, 4.4);
      slab('white', fx, deck + 4.4, fz, 10, 0.5, 8);
      slab('red', fx, deck, fz, 0.9, 1.3, 0.9);
      this.moor(fx + dirX * 12, fz + dirZ * 12, ma.rot + Math.PI / 2, r.range(8, 12));
      // harbour master and ships' store on land behind the boardwalk, dry-stack racks with boats
      const bx = sx - dirX * 22 + sideX * r.range(-8, 8), bz = sz - dirZ * 22 + sideZ * r.range(-8, 8);
      const g = this.map.heightAt(bx, bz);
      slab('white', bx, g, bz, 18, 5.5, 11);
      slab('dark', bx, g + 5.5, bz, 19.5, 0.5, 12.5);
      this.cyl('white', bx + sideX * 6, g + 6, bz + sideZ * 6, 0.9, 5.5); // observation mast
      this.markOccupied(bx, bz, 22);
      if (r.chance(0.7)) {
        const rx = sx - dirX * 26 + sideX * (walkLen / 2 - 30) * (fo > 0 ? -1 : 1), rz = sz - dirZ * 26 + sideZ * (walkLen / 2 - 30) * (fo > 0 ? -1 : 1);
        const rg = this.map.heightAt(rx, rz);
        if (rg > 0.9) {
          // open dry-stack rack: frame plus hulls on the shelves
          slab('steel', rx, rg + 8.6, rz, 30, 0.4, 10);
          for (const sd of [-1, 1]) for (const dd of [-1, 1]) this.cyl('steel', rx + sideX * sd * 14 + dirX * dd * 4.5, rg, rz + sideZ * sd * 14 + dirZ * dd * 4.5, 0.2, 8.6);
          const nb = r.int(4, 8);
          for (let i = 0; i < nb; i++) slab(r.pick(['white', 'white', 'blue', 'red']), rx + sideX * r.range(-12, 12) + dirX * r.range(-2, 2), rg + r.int(0, 2) * 2.8 + 0.4, rz + sideZ * r.range(-12, 12) + dirZ * r.range(-2, 2), 2.4, 1.4, 7);
          this.markOccupied(rx, rz, 20);
        }
      }
      // riprap groyne sheltering the mouth on the exposed side
      if (r.chance(0.6)) {
        const gs = r.chance(0.5) ? -1 : 1;
        const gx0 = sx + sideX * gs * (walkLen / 2 + 6), gz0 = sz + sideZ * gs * (walkLen / 2 + 6);
        const gl = r.range(40, 90);
        for (let t = 0; t < gl; t += r.range(3, 4.5)) {
          const x = gx0 + dirX * t + sideX * r.range(-1.5, 1.5), z = gz0 + dirZ * t + sideZ * r.range(-1.5, 1.5);
          if (this.map.heightAt(x, z) < -3) break;
          this.box('dark', x, -0.8 + r.range(0, 0.5), z, r.range(2.2, 3.6), r.range(1.8, 2.6), r.range(2.2, 3.4), r.range(0, Math.PI), r.range(-0.15, 0.15));
        }
      }
    }
  }

  /** Private docks of the canal estates: short wooden docks off the back yards, boats alongside. */
  private buildPrivateDocks(rng: Rng): void {
    const dock = (x: number, z: number, dx: number, dz: number, r: Rng) => {
      const shore = this.shoreDistance(x, z, dx, dz, 120);
      if (shore < 0 || shore >= 120) return;
      const sx = x + dx * shore, sz = z + dz * shore;
      const len = r.range(5, 9);
      if (this.map.heightAt(sx + dx * (len + 2), sz + dz * (len + 2)) > -0.7) return;
      const rot = Math.atan2(dx, -dz);
      const yaw = -rot;
      const deck = 0.75;
      this.box('wood', sx + dx * (len / 2 - 1.5), deck - 0.25, sz + dz * (len / 2 - 1.5), 1.8, 0.25, len + 3, yaw);
      const px = -dz, pz = dx;
      for (const t of [len - 0.6, len * 0.4]) for (const sd of [-1, 1]) this.piling(sx + dx * t + px * sd * 0.8, sz + dz * t + pz * sd * 0.8, deck + r.range(0.3, 0.7), 0.13);
      if (r.chance(0.55)) {
        const side = r.chance(0.5) ? -1 : 1;
        const bl = r.range(5.5, 10);
        this.moor(sx + dx * (len * 0.6) + px * side * 2.4, sz + dz * (len * 0.6) + pz * side * 2.4, yaw, bl);
      } else if (r.chance(0.35)) {
        // boat lift frame
        const side = r.chance(0.5) ? -1 : 1;
        for (const t of [len * 0.25, len * 0.8]) for (const s2 of [1.4, 4.2]) this.piling(sx + dx * t + px * side * s2, sz + dz * t + pz * side * s2, deck + 2.6, 0.12, 'steel');
        this.box('steel', sx + dx * (len * 0.52) + px * side * 2.8, deck + 2.6, sz + dz * (len * 0.52) + pz * side * 2.8, 3.4, 0.2, len * 0.6, yaw);
      }
    };
    // finger islands: docks off both long sides
    for (let i = 0; i < 5; i++) {
      const cx = 1870 - i * 25, cz = -3000 + i * 330;
      const r = rng.fork(`finger-${i}`);
      for (const sz of [-1, 1]) {
        for (let lx = -280 + r.range(0, 30); lx < 280; lx += r.range(26, 44)) {
          if (r.chance(0.25)) continue;
          dock(cx + lx, cz + sz * 60, 0, sz, r);
        }
      }
    }
    // residential canals: docks along both banks between the street culverts
    for (const c of this.map.canals) {
      const r = rng.fork(c.id);
      const x0 = Math.min(c.a[0], c.b[0]), x1 = Math.max(c.a[0], c.b[0]);
      for (let x = x0 + r.range(15, 40); x < x1 - 15; x += r.range(30, 55)) {
        if (c.culverts.some((cx) => Math.abs(cx - x) < c.culvertHalf + 12)) continue;
        if (r.chance(0.35)) continue;
        const side = r.chance(0.5) ? -1 : 1;
        dock(x, c.a[1] - side * (c.width * 0.5 + 14), 0, side, r);
      }
    }
  }

  /** Ocean fishing piers on the barrier island and the Southern Key. */
  private buildFishingPiers(rng: Rng): void {
    const piers: [number, number, number, number, number][] = [
      // start (on land), direction, length
      [2700, -4650, 1, 0, 170],
      [2600, -2350, 1, 0.05, 150],
      [1800, 6700, -0.2, 1, 130],
    ];
    for (const [x0, z0, dx0, dz0, len] of piers) {
      const r = rng.fork(`${x0}-${z0}`);
      const dl = Math.hypot(dx0, dz0), dx = dx0 / dl, dz = dz0 / dl;
      const shore = this.shoreDistance(x0, z0, dx, dz, 600);
      if (shore < 0 || shore >= 600) continue;
      // deck begins on the upper beach so the ramp is on land
      const sx = x0 + dx * (shore - 22), sz = z0 + dz * (shore - 22);
      const yaw = -Math.atan2(dx, -dz);
      const deck = 2.6;
      const total = len + 22;
      this.box('wood', sx + dx * total / 2, deck - 0.3, sz + dz * total / 2, 3.4, 0.3, total, yaw);
      const px = -dz, pz = dx;
      for (let t = 0; t < total; t += r.range(7, 10)) for (const sd of [-1, 1]) this.piling(sx + dx * t + px * sd * 1.5, sz + dz * t + pz * sd * 1.5, deck + 1.1, 0.2);
      // railings as thin boxes
      for (const sd of [-1, 1]) this.box('wood', sx + dx * total / 2 + px * sd * 1.6, deck + 0.9, sz + dz * total / 2 + pz * sd * 1.6, 0.1, 0.1, total, yaw);
      // T-head with a bait shack and shade canopy
      const ex = sx + dx * (total - 2.5), ez = sz + dz * (total - 2.5);
      const tw = r.range(14, 20);
      this.box('wood', ex, deck - 0.3, ez, tw, 0.3, 5, yaw);
      for (const sd of [-1, 1]) this.piling(ex + px * sd * tw * 0.5, ez + pz * sd * tw * 0.5, deck + 1.2, 0.22);
      this.box(r.pick(['white', 'blue', 'orange']), ex + px * tw * 0.22, deck, ez + pz * tw * 0.22, 4.5, 3, 4, yaw);
      this.box('dark', ex + px * tw * 0.22, deck + 3, ez + pz * tw * 0.22, 5.2, 0.3, 4.8, yaw);
      for (const sd of [-1, 1]) this.cyl('steel', ex - px * tw * 0.3 + dx * sd * 1.6, deck, ez - pz * tw * 0.3 + dz * sd * 1.6, 0.08, 3.2);
      this.box('white', ex - px * tw * 0.3, deck + 3.2, ez - pz * tw * 0.3, 5, 0.15, 4, yaw);
      // ticket hut at the landward end
      this.box('white', sx - dx * 2 + px * 3.5, this.map.heightAt(sx - dx * 2 + px * 3.5, sz - dz * 2 + pz * 3.5), sz - dz * 2 + pz * 3.5, 4, 3.2, 4, yaw);
      this.markOccupied(sx, sz, 12);
    }
  }

  /** Lateral channel markers (red / green pile beacons) along the dredged channels. */
  private buildChannelMarkers(rng: Rng): void {
    for (const ch of this.map.channels) {
      if (ch.width >= 250 || ch.depth < 3.5) continue;
      const r = rng.fork(ch.id);
      let carry = r.range(60, 200);
      for (let i = 0; i < ch.pts.length - 1; i++) {
        const [ax, az] = ch.pts[i], [bx, bz] = ch.pts[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const ux = (bx - ax) / len, uz = (bz - az) / len;
        let t = carry;
        for (; t < len; t += r.range(260, 420)) {
          const x = ax + ux * t, z = az + uz * t;
          const off = ch.width * 0.5 + r.range(6, 14);
          for (const sd of [-1, 1]) {
            if (r.chance(0.3)) continue;
            const mx = x - uz * off * sd + r.range(-3, 3), mz = z + ux * off * sd + r.range(-3, 3);
            if (this.map.heightAt(mx, mz) > -1.2) continue;
            const top = r.range(3.2, 4.2);
            this.piling(mx, mz, top, 0.24, 'wood');
            // day board: red triangle-ish (box) to starboard, green square to port
            this.box(sd > 0 ? 'red' : 'green', mx, top - 1.1, mz, 1.1, 1.1, 0.25, Math.atan2(ux, -uz));
            if (r.chance(0.3)) this.box('white', mx, top + 0.1, mz, 0.5, 0.5, 0.5); // light
          }
        }
        carry = t - len;
      }
    }
  }

  /** Lifeguard towers spaced unevenly along the exposed beaches. */
  private buildLifeguardTowers(rng: Rng): void {
    const runs: [number, number, number, number, number, number][] = [
      // from (x,z) marching along (dx,dz) toward the sea, over a span of `span` metres of shoreline with (sx,sz) as the along-shore direction
      [2600, -7600, 1, 0, 0, 1],
      [3000, 4900, 1, 0.2, -0.2, 1],
    ];
    const colours = ['white', 'yellow', 'orange', 'blue', 'red'];
    for (const [x0, z0, dx, dz, sx, sz] of runs) {
      const r = rng.fork(`${x0}`);
      const span = x0 > 2900 ? 1600 : 6000;
      for (let s = r.range(120, 300); s < span; s += r.range(380, 620)) {
        const bx = x0 + sx * s, bz = z0 + sz * s;
        const shore = this.shoreDistance(bx, bz, dx, dz, 900);
        if (shore <= 0 || shore >= 900) continue;
        // upper beach: a few metres above the swash zone
        let d = shore - 14;
        while (d > 0 && this.map.heightAt(bx + dx * d, bz + dz * d) < 1.0) d -= 3;
        const tx = bx + dx * d, tz = bz + dz * d;
        const g = this.map.heightAt(tx, tz);
        if (g < 0.9 || g > 3.2 || this.map.zoneAt(tx, tz) !== 2) continue;
        const yaw = -Math.atan2(dx, -dz) + r.range(-0.2, 0.2);
        const c = Math.cos(yaw), sn = Math.sin(yaw);
        const col = r.pick(colours);
        for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]]) this.cyl('wood', tx + lx * c - lz * sn, g, tz + lx * sn + lz * c, 0.12, 3.0);
        this.box(col, tx, g + 3.0, tz, 3.2, 2.4, 3.0, yaw);
        this.box('white', tx, g + 5.4, tz, 3.9, 0.25, 3.7, yaw);
        this.box('wood', tx, g + 2.9, tz, 3.6, 0.15, 3.4, yaw);
        // stepped access ramp on the land side
        for (let k = 0; k < 4; k++) this.box('wood', tx - dx * (2.2 + k * 1.1), g + 2.9 - (k + 1) * 0.7, tz - dz * (2.2 + k * 1.1), 1.0, 0.12, 1.2, yaw);
        this.markOccupied(tx, tz, 6);
      }
    }
  }

  /** Golf clubhouse: low pavilion with a veranda, pro shop wing, putting green and cart barn. */
  private buildClubhouse(rng: Rng): void {
    const cl = this.map.pois.find((p) => p.kind === 'clubhouse');
    if (!cl) return;
    const g = this.map.heightAt(cl.x, cl.z);
    if (g < 1) return;
    const c = Math.cos(cl.rot), s = Math.sin(cl.rot);
    const at = (lx: number, lz: number): [number, number] => [cl.x + lx * c - lz * s, cl.z + lx * s + lz * c];
    const [hx, hz] = at(0, 0);
    this.box('white', hx, g, hz, 34, 5.5, 18, cl.rot);
    this.box('dark', hx, g + 5.5, hz, 37, 0.6, 21, cl.rot);
    this.box('white', hx, g + 6.1, hz, 12, 2.4, 8, cl.rot); // cupola
    this.box('dark', hx, g + 8.5, hz, 13.5, 0.4, 9.5, cl.rot);
    // veranda along the green side with columns
    const [vx, vz] = at(0, 13);
    this.box('wood', vx, g + 0.4, vz, 34, 0.3, 8, cl.rot);
    this.box('white', vx, g + 4.6, vz, 35, 0.35, 9, cl.rot);
    for (let i = -3; i <= 3; i++) { const [px, pz] = at(i * 5.5, 16.5); this.cyl('white', px, g + 0.7, pz, 0.22, 3.9); }
    // pro shop wing and cart barn
    const [wx, wz] = at(24, -4);
    this.box('white', wx, g, wz, 14, 4, 12, cl.rot);
    this.box('dark', wx, g + 4, wz, 15.5, 0.5, 13.5, cl.rot);
    const [bx, bz] = at(-26, -8);
    this.box('concrete', bx, g, bz, 16, 3.4, 14, cl.rot);
    this.box('dark', bx, g + 3.4, bz, 17, 0.4, 15, cl.rot);
    for (let i = 0; i < 5; i++) { const [cx, cz] = at(-30 + i * 3.2, 3 + rng.range(-1, 1)); this.box('white', cx, g, cz, 1.3, 1.1, 2.4, cl.rot); this.box('dark', cx, g + 1.6, cz, 1.4, 0.1, 2.2, cl.rot); }
    // putting green with a flag
    const [gx, gz] = at(4, 32);
    this.box('grass', gx, g + 0.05, gz, 30, 0.2, 20, cl.rot);
    this.cyl('white', gx + 4, g + 0.25, gz - 3, 0.04, 2.2);
    this.box('red', gx + 4.3, g + 2.0, gz - 3, 0.6, 0.4, 0.05, cl.rot);
    // parking apron
    const [px, pz] = at(-6, -22);
    this.box('dark', px, g - 0.05, pz, 48, 0.2, 18, cl.rot);
    this.markOccupied(cl.x, cl.z, 60);
  }

  /** Port island: everything is laid out in the island's own frame (u along the quays, v across,
   *  +v toward the south quay) so cranes, stacks and berths follow the slightly rotated seawalls. */
  private buildPort(rng: Rng): void {
    const P = PORT_ISLAND;
    const ca = Math.cos(P.rot), sa = Math.sin(P.rot);
    const world = (u: number, v: number): [number, number] => [P.cx + u * ca - v * sa, P.cz + u * sa + v * ca];
    const yaw = -P.rot;
    const pbox = (mat: string, u: number, y: number, v: number, alongU: number, h: number, alongV: number) => { const [x, z] = world(u, v); this.box(mat, x, y, z, alongU, h, alongV, yaw); };
    const pcyl = (mat: string, u: number, y: number, v: number, r: number, h: number) => { const [x, z] = world(u, v); this.cyl(mat, x, y, z, r, h, yaw); };
    const ground = (u: number, v: number) => { const [x, z] = world(u, v); return this.map.heightAt(x, z); };
    const occupy = (u: number, v: number, r: number) => { const [x, z] = world(u, v); this.markOccupied(x, z, r); };
    const boxColours = ['red', 'blue', 'green', 'orange', 'steel', 'white', 'blue', 'red'];
    // ---- apron furniture, all in the island frame. `paint` lays road markings as 3 cm slabs on the yard paving (the
    // streets pave the island 8 cm over the ground, world/streets.ts buildPortYard).
    const paint = (mat: string, u: number, v: number, alongU: number, alongV: number) => { const g = ground(u, v); if (g >= 1) pbox(mat, u, g + 0.1, v, alongU, 0.03, alongV); };
    const jitter = (a: number) => rng.range(-a, a);
    /** yawed box in the island frame: `yawJ` radians added to the quay-aligned yaw */
    const jbox = (mat: string, u: number, y: number, v: number, alongU: number, h: number, alongV: number, yawJ: number) => { const [x, z] = world(u, v); this.box(mat, x, y, z, alongU, h, alongV, yaw + yawJ); };
    const CONTAINERS = ['red', 'blue', 'green', 'orange', 'steel', 'white', 'blue', 'red', 'dark', 'yellow', 'tank', 'green'];
    /** a container stack of `n` boxes, each nudged and yawed a little so the rows do not read as a lattice */
    const stackAt = (u: number, v: number, g: number, n: number, yawJ = 0) => {
      const mat = rng.pick(CONTAINERS);
      for (let k = 0; k < n; k++) jbox(rng.chance(0.55) ? mat : rng.pick(CONTAINERS), u + jitter(0.25), g + k * 2.6, v + jitter(0.15), 12.2, 2.6, 2.44, yawJ + jitter(0.012));
    };
    /** reach stacker: yellow body, cab, raised boom with a container in the spreader, four wheels */
    const reachStacker = (u: number, v: number, yawJ: number, loaded: boolean) => {
      const g = ground(u, v);
      if (g < 1) return;
      const c = Math.cos(yawJ), s = Math.sin(yawJ);
      const at = (du: number, dv: number): [number, number] => [u + du * c - dv * s, v + du * s + dv * c];
      let p = at(0, 0);
      jbox('yellow', p[0], g + 0.9, p[1], 7.5, 1.6, 2.9, yawJ);
      p = at(-2.2, 0); jbox('yellow', p[0], g + 2.5, p[1], 2.2, 2.2, 2.4, yawJ);
      p = at(-2.2, 0); jbox('glass', p[0], g + 3.6, p[1], 1.6, 1.1, 2.3, yawJ);
      // boom rises forward from the body
      const [bx, bz] = world(...at(2.5, 0));
      this.box('yellow', bx, g + 2.6, bz, 9, 0.9, 0.9, yaw + yawJ, 0);
      for (const [du, dv] of [[-2.6, -1.3], [-2.6, 1.3], [2.4, -1.3], [2.4, 1.3]]) { p = at(du, dv); const [wx, wz] = world(p[0], p[1]); this.cyl('dark', wx, g, wz, 0.75, 0.6, yaw + yawJ, Math.PI / 2); }
      if (loaded) { p = at(5.2, 0); jbox(rng.pick(CONTAINERS), p[0], g + 1.2, p[1], 6.1, 2.6, 2.44, yawJ + Math.PI / 2); }
    };
    /** straddle carrier: four tall legs, a top frame and a cab, astride a container */
    const straddle = (u: number, v: number, yawJ: number) => {
      const g = ground(u, v);
      if (g < 1) return;
      const c = Math.cos(yawJ), s = Math.sin(yawJ);
      const at = (du: number, dv: number): [number, number] => [u + du * c - dv * s, v + du * s + dv * c];
      for (const [du, dv] of [[-5.5, -2.2], [-5.5, 2.2], [5.5, -2.2], [5.5, 2.2]]) { const p = at(du, dv); jbox('steel', p[0], g, p[1], 0.5, 11, 0.5, yawJ); }
      let p = at(0, 0); jbox('steel', p[0], g + 11, p[1], 12.5, 1.2, 5.6, yawJ);
      p = at(0, -2.2); jbox('yellow', p[0], g + 11, p[1], 12.8, 0.6, 0.6, yawJ);
      p = at(0, 2.2); jbox('yellow', p[0], g + 11, p[1], 12.8, 0.6, 0.6, yawJ);
      p = at(4, 3.1); jbox('glass', p[0], g + 8.4, p[1], 2.2, 2.2, 1.6, yawJ);
      if (rng.chance(0.6)) { p = at(0, 0); jbox(rng.pick(CONTAINERS), p[0], g + rng.range(0.3, 5), p[1], 12.2, 2.6, 2.44, yawJ); }
      for (const [du, dv] of [[-5.5, -2.2], [-5.5, 2.2], [5.5, -2.2], [5.5, 2.2]]) { p = at(du, dv); const [wx, wz] = world(p[0], p[1]); this.cyl('dark', wx, g, wz, 0.7, 0.5, yaw + yawJ, Math.PI / 2); }
    };
    /** tractor unit with a skeletal trailer, empty or carrying a box */
    const truck = (u: number, v: number, yawJ: number, loaded: boolean) => {
      const g = ground(u, v);
      if (g < 1) return;
      const c = Math.cos(yawJ), s = Math.sin(yawJ);
      const at = (du: number, dv: number): [number, number] => [u + du * c - dv * s, v + du * s + dv * c];
      let p = at(7.2, 0); jbox(rng.pick(['red', 'white', 'blue', 'dark', 'orange']), p[0], g + 0.9, p[1], 2.6, 2.6, 2.5, yawJ);
      p = at(7.2, 0); jbox('glass', p[0], g + 2.2, p[1], 0.6, 1.0, 2.2, yawJ);
      p = at(0, 0); jbox('dark', p[0], g + 1.0, p[1], 12.5, 0.35, 2.4, yawJ);
      for (const du of [-4.5, -3.2, 6.5]) for (const dv of [-1.1, 1.1]) { p = at(du, dv); const [wx, wz] = world(p[0], p[1]); this.cyl('dark', wx, g, wz, 0.52, 0.4, yaw + yawJ, Math.PI / 2); }
      if (loaded) { p = at(-0.5, 0); jbox(rng.pick(CONTAINERS), p[0], g + 1.35, p[1], 12.2, 2.6, 2.44, yawJ); }
    };
    /** 30 m high mast (a `mast` lamp: lit crown at night, a night dot to 4 km, inflated to a pixel from the air) */
    const lightMast = (u: number, v: number) => {
      const g = ground(u, v);
      if (g < 1) return;
      const [x, z] = world(u, v);
      this.lamp(x, g, z, yaw, 'mast');
    };
    const palletStack = (u: number, v: number) => {
      const g = ground(u, v);
      if (g < 1) return;
      const n = rng.int(3, 8);
      for (let k = 0; k < n; k++) jbox(rng.chance(0.75) ? 'wood' : 'white', u + jitter(2.2), g, v + jitter(1.4), 1.2, rng.range(0.5, 1.8), 1.0, jitter(0.4));
    };
    const bollard = (u: number, v: number) => { const g = ground(u, v); if (g >= 1) pcyl('dark', u, g, v, 0.32, 0.9); };
    const fender = (u: number, v: number) => pbox('dark', u, -0.4, v, 2.4, 1.6, 1.0);

    // container gantry cranes along the north quay, booms out over the ship channel
    const quayN = -P.hh;
    const craneU: number[] = [];
    for (let u = -P.hw + 170; u < P.hw - 150; u += rng.range(185, 240)) craneU.push(u);
    for (const u of craneU) {
      const v = quayN + 16;
      const g = ground(u, v);
      if (g < 1) continue;
      const legW = 18, h = 40 + rng.range(-3, 5);
      for (const su of [-1, 1]) for (const sv of [-1, 1]) pbox('steel', u + su * legW / 2, g, v + sv * 6, 1.6, h, 1.6);
      pbox('steel', u, g + h, v - 4, legW + 4, 3, 3);
      pbox('steel', u, g + h, v + 4, legW + 4, 3, 3);
      pbox('orange', u, g + h + 3, v - 26, 3.2, 3, 58); // boom over the water
      pbox('steel', u, g + h + 5, v + 12, 3, 3, 18); // counterweight arm over the apron
      pbox('white', u, g + h - 14, v - 12, 6, 4, 6); // operator cab
    }
    // a bulk carrier and a feeder ship alongside the north quay (hulls in the water)
    for (const [u, len, beam, hullH] of [[-420, 190, 30, 9], [330, 130, 22, 7]] as const) {
      const v = quayN - beam / 2 - 3;
      pbox('dark', u, -2.5, v, len, hullH + 2.5, beam);
      pbox(rng.pick(['red', 'blue']), u, hullH, v, len - 6, 1.6, beam - 2);
      pbox('white', u + len * 0.36, hullH + 1.6, v, len * 0.14, 12, beam - 6); // bridge aft
      for (let k = 0; k < 4; k++) pbox('steel', u - len * 0.32 + k * len * 0.18, hullH + 1.6, v, 3, 6 + (k % 2) * 3, 2); // hatch cranes
    }
    // container yard: blocks of stacks with truck lanes between, filling the apron behind the cranes
    const yardV0 = quayN + 70, yardV1 = 40;
    for (let bu = -P.hw + 90; bu < P.hw - 260; bu += 175) {
      for (let bv = yardV0; bv < yardV1 - 40; bv += 58) {
        if (rng.chance(0.12)) continue; // empty block
        const g = ground(bu + 60, bv + 20);
        if (g < 1) continue;
        const rows = 6, bays = 10;
        const tall = rng.range(1, 4);
        // one row in six is an aisle; each block leans to one colour with odd boxes of others, stack heights
        // wander bay to bay and the boxes are nudged so the yard does not read as a lattice. Yard gaps are
        // 0.35-0.4 m (real block spacing): at 700-1500 m the old 1.2 m gaps were 1-2 px dark lines in a
        // regular grid and crawled between clip frames (harbor container shimmer)
        const blockMat = rng.pick(boxColours);
        const aisle = rng.int(1, 5);
        for (let r = 0; r < rows; r++) {
          if (r === aisle && rng.chance(0.6)) continue;
          const vJ = jitter(0.15);
          for (let c = 0; c < bays; c++) {
            if (rng.chance(0.28)) continue;
            const stack = Math.min(5, Math.max(1, Math.round(tall + rng.range(-1.8, 1.8))));
            const u = bu + c * 12.6 + jitter(0.15), v = bv + r * 5.25 + vJ;
            for (let k = 0; k < stack; k++) jbox(rng.chance(0.5) ? blockMat : rng.pick(boxColours), u + jitter(0.1), g + k * 2.6, v, 12.2, 2.6, 4.9, jitter(0.01));
          }
        }
        occupy(bu + 60, bv + 15, 80);
        // yard lighting: high masts every ~85 m along the truck lane of every second block row (a 85 x 116 m grid
        // over the terminal, as the 60-80 m rhythm of a real yard seen from the air)
        if (Math.round((bv - yardV0) / 58) % 2 === 0) for (let mu = bu - 8; mu < bu + 170; mu += 85) lightMast(mu + jitter(3), bv - 6 + jitter(2));
      }
    }
    // ---- transit sheds along the south side of the apron: ridge vents, jittered rooftop plant, loading docks
    // with trailers backed onto some of them and canopies over the doors (no two sheds alike)
    let u = -P.hw + 140;
    const shedSpans: [number, number][] = [];
    while (u < P.hw - 520) {
      const len = rng.range(120, 170), depth = rng.range(40, 55), v = 150 + rng.range(-10, 10);
      const g = ground(u + len / 2, v);
      if (g >= 1) {
        const h = 11 + rng.range(0, 3);
        const wall = rng.pick(['concrete', 'white', 'tank', 'steel']);
        pbox(wall, u + len / 2, g, v, len, h, depth);
        pbox(rng.pick(['dark', 'concrete', 'steel']), u + len / 2, g + h, v, len + 2, 0.6, depth + 2); // parapet roof
        // ridge vent and a scatter of roof vents / units
        if (rng.chance(0.7)) pbox('steel', u + len / 2, g + h + 0.6, v + jitter(depth * 0.2), len - rng.range(16, 40), 0.9, 1.1);
        const nv = rng.int(3, 8);
        for (let k = 0; k < nv; k++) {
          const vu = u + rng.range(10, len - 10), vv = v + rng.range(-depth * 0.4, depth * 0.4);
          if (rng.chance(0.55)) pcyl('steel', vu, g + h + 0.6, vv, rng.range(0.5, 0.9), rng.range(1.0, 1.8));
          else jbox(rng.pick(['concrete', 'steel', 'white']), vu, g + h + 0.6, vv, rng.range(1.8, 3.4), rng.range(1.2, 2.0), rng.range(1.6, 2.8), jitter(0.15));
        }
        // loading docks on the south face: dock canopies over the doors, trailers at some, spaced unevenly
        let du = u + rng.range(8, 20);
        while (du < u + len - 10) {
          const dockV = v + depth / 2;
          if (rng.chance(0.7)) pbox('steel', du, g + 3.6, dockV + 2.2, 4.6, 0.4, 4.4); // canopy
          if (rng.chance(0.45)) {
            pbox('dark', du, g + 1.0, dockV + 8.2, 2.5, 0.35, 12.5);
            pbox(rng.pick(['white', 'white', 'steel', 'red', 'blue']), du + jitter(0.2), g + 1.35, dockV + 8.6, 2.5, 2.7, 12.0);
          } else if (rng.chance(0.3)) palletStack(du + jitter(2), dockV + 6);
          du += rng.range(9, 22);
        }
        // office lean-to at one end, a few rooftop units
        if (rng.chance(0.6)) pbox('white', u + (rng.chance(0.5) ? 6 : len - 6), g, v + depth / 2 + 6, 14, 4, 8);
        shedSpans.push([u, u + len]);
        occupy(u + len / 2, v, Math.max(len, depth) * 0.6);
      }
      u += len + rng.range(30, 60);
    }

    // ---- the truck lane between the yard and the sheds: painted lanes, hatching and a rail spur
    const laneV = 92;
    for (let lu = -P.hw + 60; lu < P.hw - 120; lu += 12) {
      if (rng.chance(0.06)) continue;
      paint('white', lu, laneV - 7, 4.5, 0.18);
      paint('white', lu, laneV + 7, 4.5, 0.18);
    }
    for (let lu = -P.hw + 60; lu < P.hw - 120; lu += 60) paint('yellow', lu + 30, laneV, 60, 0.16); // centre line
    for (let k = 0; k < 14; k++) {
      // hatched keep-clear boxes and pedestrian crossings at random spots along the lane
      const hu = rng.range(-P.hw + 80, P.hw - 160), hv = laneV + rng.pick([-16, 16]);
      for (let s = 0; s < 6; s++) paint('yellow', hu + s * 1.6 - 4, hv, 0.3, 8);
    }
    // rail spur: ballast strip, two rails and a rake of wagons, on the sheds' side of the lane
    const railV = 116;
    for (let ru = -P.hw + 60; ru < P.hw - 200; ru += 120) {
      const seg = Math.min(120, P.hw - 200 - ru);
      const g = ground(ru + seg / 2, railV);
      if (g < 1) continue;
      pbox('dark', ru + seg / 2, g + 0.02, railV, seg, 0.12, 3.4);
      pbox('steel', ru + seg / 2, g + 0.14, railV - 0.72, seg, 0.14, 0.09);
      pbox('steel', ru + seg / 2, g + 0.14, railV + 0.72, seg, 0.14, 0.09);
    }
    {
      const rakeU0 = rng.range(-P.hw + 200, -200), n = rng.int(7, 12);
      for (let k = 0; k < n; k++) {
        const wu = rakeU0 + k * 16.4;
        const g = ground(wu, railV);
        if (g < 1) continue;
        if (rng.chance(0.25)) {
          const [wx, wz] = world(wu, railV);
          pbox('dark', wu, g + 0.25, railV, 15.5, 0.5, 2.6);
          this.cyl(rng.pick(['dark', 'white', 'steel']), wx, g + 2.1, wz, 1.45, 13.5, yaw + Math.PI / 2, Math.PI / 2);
        } else {
          pbox('dark', wu, g + 0.25, railV, 15.5, 0.6, 2.6);
          if (rng.chance(0.8)) pbox(rng.pick(CONTAINERS), wu, g + 0.85, railV, 12.2, 2.6, 2.44);
        }
      }
      const g = ground(rakeU0 - 18, railV);
      if (g >= 1) { pbox('orange', rakeU0 - 18, g + 0.25, railV, 16, 3.6, 2.7); pbox('dark', rakeU0 - 12, g + 3.85, railV, 3, 1.1, 2.7); } // shunter
    }

    // ---- south apron: a second yard of stacks in ragged rows, reach stackers and trucks at work, light masts
    const quayS = P.hh;
    const yardS0 = 182, yardS1 = quayS - 34;
    for (let bu = -P.hw + 250; bu < P.hw - 120;) {
      const bw = rng.range(70, 120);
      if (bu > 40 && bu < 480) { bu = 480; continue; } // cruise terminal
      const mode = rng.next();
      if (mode < 0.15) {
        // open hardstand: painted bays and a few parked trailers / trucks
        for (let k = 0; k < 10; k++) paint('white', bu + k * 4 + 4, yardS0 + 30, 0.15, 14);
        const nt = rng.int(2, 6);
        for (let k = 0; k < nt; k++) truck(bu + rng.range(8, bw - 8), rng.range(yardS0 + 18, yardS1 - 10), rng.pick([0, Math.PI]) + jitter(0.06), rng.chance(0.5));
        bu += bw + rng.range(10, 20);
        continue;
      }
      const g = ground(bu + bw / 2, (yardS0 + yardS1) / 2);
      if (g < 1) { bu += bw + 14; continue; }
      // rows of stacks fill the strip's depth, a truck aisle every three or four rows, the block leaning to one
      // colour with stack heights wandering along it
      const tall = rng.range(1.2, 3.6);
      const bays = Math.floor(bw / 13.2);
      const blockMat = rng.pick(CONTAINERS);
      let v = yardS0 + 4, rowsSinceAisle = 0, aisleEvery = rng.int(3, 5);
      while (v < yardS1 - 4) {
        if (rowsSinceAisle >= aisleEvery) { v += 7; rowsSinceAisle = 0; aisleEvery = rng.int(3, 5); if (rng.chance(0.4)) truck(bu + rng.range(8, bw - 8), v - 3.5, rng.pick([0, Math.PI]) + jitter(0.03), rng.chance(0.5)); continue; }
        const vj = v + jitter(0.3);
        for (let c = 0; c < bays; c++) {
          if (rng.chance(0.28)) continue;
          const n = Math.min(5, Math.max(1, Math.round(tall + rng.range(-1.6, 1.8) + 0.8 * Math.sin(c * 1.7 + bu))));
          const mat = rng.chance(0.6) ? blockMat : rng.pick(CONTAINERS);
          for (let k = 0; k < n; k++) jbox(k === 0 || rng.chance(0.5) ? mat : rng.pick(CONTAINERS), bu + 7 + c * 13.2 + jitter(0.25), g + k * 2.6, vj + jitter(0.12), 12.2, 2.6, 2.44, jitter(0.012));
        }
        v += 2.9; rowsSinceAisle++;
      }
      occupy(bu + bw / 2, (yardS0 + yardS1) / 2, bw * 0.6);
      if (rng.chance(0.6)) reachStacker(bu + rng.range(5, bw - 5), yardS1 - 12 + jitter(3), rng.range(0, Math.PI * 2), rng.chance(0.6));
      if (rng.chance(0.35)) straddle(bu + rng.range(10, bw - 10), yardS0 - 12 + jitter(2), rng.pick([0, Math.PI / 2]) + jitter(0.1));
      if (rng.chance(0.5)) truck(bu + rng.range(8, bw - 8), yardS0 - 14 + jitter(3), rng.pick([0, Math.PI]) + jitter(0.05), rng.chance(0.6));
      bu += bw + rng.range(12, 24);
    }
    for (let mu = -P.hw + 90 + rng.range(0, 30); mu < P.hw - 160; mu += rng.range(70, 90)) {
      if (mu > 90 && mu < 440) continue;
      lightMast(mu + jitter(4), rng.pick([yardS0 - 4, yardS1 + 8]) + jitter(3));
    }
    for (let mu = -P.hw + 60 + rng.range(0, 40); mu < P.hw - 160; mu += rng.range(70, 90)) lightMast(mu + jitter(4), laneV + rng.pick([-13, 13]) + jitter(2));
    // reach stackers and trucks on the main lane and the north yard aisles
    for (let k = 0; k < 9; k++) truck(rng.range(-P.hw + 80, P.hw - 180), laneV + rng.pick([-7, 7]) + jitter(1), (rng.chance(0.5) ? 0 : Math.PI) + jitter(0.03), rng.chance(0.65));
    for (let k = 0; k < 6; k++) reachStacker(rng.range(-P.hw + 90, P.hw - 300), rng.range(yardV0 + 20, yardV1 - 20) + jitter(4), rng.range(0, Math.PI * 2), rng.chance(0.5));
    for (let k = 0; k < 4; k++) straddle(rng.range(-P.hw + 120, P.hw - 300), rng.range(yardV0 + 30, yardV1 - 30), rng.pick([0, Math.PI / 2]) + jitter(0.08));

    // ---- west end: a fenced customs / chassis lot with a gatehouse, and the empties depot
    {
      const lu0 = -P.hw + 50, lu1 = -P.hw + 240, lv0 = 190, lv1 = quayS - 40;
      const g = ground((lu0 + lu1) / 2, (lv0 + lv1) / 2);
      if (g >= 1) {
        const fenceRun = (a: number, b: number, fixed: number, alongU: boolean) => {
          const len = b - a;
          if (alongU) pbox('steel', (a + b) / 2, g + 2.2, fixed, len, 0.08, 0.08); else pbox('steel', fixed, g + 2.2, (a + b) / 2, 0.08, 0.08, len);
          for (let t = a; t <= b; t += rng.range(7, 10)) { if (alongU) pcyl('steel', t, g, fixed, 0.06, 2.3); else pcyl('steel', fixed, g, t, 0.06, 2.3); }
        };
        fenceRun(lu0, lu1, lv0, true); fenceRun(lu0, lu1, lv1, true); fenceRun(lv0, lv1, lu0, false); fenceRun(lv0, lv1 - 24, lu1, false);
        pbox('white', lu1 + 1, g, lv1 - 10, 5, 3.2, 4); pbox('dark', lu1 + 1, g + 3.2, lv1 - 10, 6, 0.3, 5); // gatehouse
        pbox('red', lu1 + 1, g + 1.0, lv1 - 20, 0.2, 0.2, 9); // barrier arm
        for (let k = 0; k < 9; k++) truck(rng.range(lu0 + 12, lu1 - 12), rng.range(lv0 + 8, lv1 - 8), rng.pick([0, Math.PI / 2]) + jitter(0.05), rng.chance(0.35));
        for (let k = 0; k < 4; k++) palletStack(rng.range(lu0 + 6, lu1 - 6), rng.range(lv0 + 4, lv1 - 4));
        occupy((lu0 + lu1) / 2, (lv0 + lv1) / 2, 120);
      }
      // empties depot at the far west tip: tall stacks of one colour, closer packed
      for (let eu = -P.hw + 40; eu < -P.hw + 120; eu += 13.2) for (let ev = -60; ev < 60; ev += 2.9) {
        if (rng.chance(0.2)) continue;
        const ge = ground(eu, ev);
        if (ge >= 1) stackAt(eu, ev, ge, rng.int(3, 6));
      }
      occupy(-P.hw + 80, 0, 80);
    }

    // ---- quays: bollards and fenders, and a scatter of pallets and skips by the sheds
    for (let qu = -P.hw + 30; qu < P.hw - 30; qu += rng.range(22, 34)) {
      bollard(qu + jitter(0.5), quayS - 1.6);
      if (rng.chance(0.5)) fender(qu + rng.range(4, 10), quayS + 0.3);
    }
    for (let qu = -P.hw + 30; qu < P.hw - 30; qu += rng.range(22, 34)) {
      bollard(qu + jitter(0.5), quayN + 1.6);
      if (rng.chance(0.5)) fender(qu + rng.range(4, 10), quayN - 0.3);
    }
    for (const [a, b] of shedSpans) {
      const n = rng.int(1, 4);
      for (let k = 0; k < n; k++) palletStack(rng.range(a + 6, b - 6), 128 + jitter(4));
      if (rng.chance(0.6)) jbox(rng.pick(['green', 'blue', 'dark']), rng.range(a + 6, b - 6), ground(a, 124) + 0.02, 124 + jitter(3), 4.2, 1.6, 2.2, jitter(0.3)); // skip
    }
    // ---- south quay apron (the strip between the yards and the seawall, west and east of the cruise terminal):
    // a yellow quay-edge line, a marked truck lane behind it, boxes set down singly for loading, hatch-cover
    // piles, lashing cages and a mobile harbour crane on each stretch
    {
      const hatchPile = (u: number, v: number) => {
        const g = ground(u, v);
        if (g < 1) return;
        const n = rng.int(3, 6);
        for (let k = 0; k < n; k++) jbox(rng.chance(0.7) ? 'dark' : 'steel', u + jitter(0.4), g + k * 0.5, v + jitter(0.3), 12 + jitter(0.5), 0.5, 9 + jitter(0.4), jitter(0.03));
      };
      const lashingCage = (u: number, v: number) => { const g = ground(u, v); if (g >= 1) jbox(rng.pick(['orange', 'steel', 'yellow']), u, g, v, 2.4, 2.2, 1.6, jitter(0.5)); };
      const car = (u: number, v: number, yawJ: number) => {
        const g = ground(u, v);
        if (g < 1) return;
        jbox(rng.pick(['white', 'white', 'steel', 'dark', 'red', 'blue']), u, g + 0.35, v, 4.5, 0.9, 1.8, yawJ);
        jbox('glass', u, g + 1.25, v, 2.4, 0.55, 1.6, yawJ);
      };
      /** mobile harbour crane: rubber-tyred chassis, slewing platform with a cab and tower, boom raised over the water */
      const harbourCrane = (u: number, v: number) => {
        const g = ground(u, v);
        if (g < 1) return;
        pbox('dark', u, g + 0.6, v, 15, 1.4, 11);
        for (const du of [-5.5, -2.7, 2.7, 5.5]) for (const dv of [-4.8, 4.8]) { const [wx, wz] = world(u + du, v + dv); this.cyl('dark', wx, g, wz, 0.8, 0.9, yaw, Math.PI / 2); }
        // the upper works are slewed so the boom crosses the quay diagonally rather than pointing straight out
        const slew = rng.pick([-1, 1]) * rng.range(0.55, 1.1);
        const a = -Math.PI / 2 + slew; // yaw offset that turns the box's local x toward the water, then around by `slew`
        const dU = Math.sin(slew), dV = Math.cos(slew), pU = Math.cos(slew), pV = -Math.sin(slew);
        jbox('white', u, g + 2.0, v, 9, 3.2, 9, a);
        jbox('white', u - dU * 3, g + 5.2, v - dV * 3, 3.2, 9, 3.2, a); // A-frame tower
        jbox('glass', u + dU * 1.5 + pU * 3.6, g + 5.2, v + dV * 1.5 + pV * 3.6, 2.6, 2.4, 2.2, a); // cab beside the boom foot
        jbox('dark', u - dU * 6.5, g + 2.6, v - dV * 6.5, 4, 2.8, 6, a); // counterweight
        // boom: a box along its local x, rolled up by `th` so the far end is lifted out over the seawall
        const L = 42, th = rng.range(0.75, 1.0);
        const reach = 1 + Math.cos(th) * L / 2;
        const [bx, bz] = world(u + dU * reach, v + dV * reach);
        this.box('white', bx, g + 6.4 + Math.sin(th) * L / 2 - 0.75, bz, L, 1.5, 1.5, yaw + a, 0, th);
        occupy(u, v, 12);
      };
      for (const [u0, u1] of [[-P.hw + 30, 100], [520, P.hw - 40]] as const) {
        for (let eu = u0; eu < u1; eu += 60) paint('yellow', eu + 30, quayS - 2.4, Math.min(60, u1 - eu) - rng.range(2, 8), 0.2);
        for (let lu = u0; lu < u1; lu += 12) if (rng.chance(0.85)) paint('white', lu + 3, quayS - 33, 5, 0.16);
        // boxes set down for loading, a broken single row with the odd pair
        for (let bu = u0 + rng.range(8, 20); bu < u1 - 8; bu += 13.2) {
          if (rng.chance(0.42)) continue;
          const g = ground(bu, quayS - 16);
          if (g < 1) continue;
          const n = rng.chance(0.3) ? 2 : 1;
          for (let k = 0; k < n; k++) jbox(rng.pick(CONTAINERS), bu + jitter(0.4), g + k * 2.6, quayS - 16 + jitter(1.2), 12.2, 2.6, 2.44, jitter(0.03));
        }
        for (let k = 0; k < 2; k++) hatchPile(rng.range(u0 + 15, u1 - 15), quayS - rng.range(21, 26));
        for (let k = 0; k < rng.int(2, 5); k++) lashingCage(rng.range(u0 + 6, u1 - 6), quayS - rng.range(8, 12));
        harbourCrane(rng.range(u0 + 40, u1 - 40), quayS - 12);
        for (let k = 0; k < 2; k++) truck(rng.range(u0 + 10, u1 - 10), quayS - 30 + jitter(1), rng.pick([0, Math.PI]) + jitter(0.04), rng.chance(0.5));
      }
      // kerb barriers around the chassis lot (the mesh fence is subpixel from altitude), a gap at the gate
      const lu0 = -P.hw + 50, lu1 = -P.hw + 240, lv0 = 190, lv1 = quayS - 40;
      const kerb = (u: number, v: number, alongU: number, alongV: number) => { const g = ground(u, v); if (g >= 1) pbox('white', u, g + 0.02, v, alongU, 0.85, alongV); };
      for (let t = lu0; t < lu1; t += 3.8) { kerb(t + 1.7, lv0, 3.4, 0.6); if (t < lu1 - 30) kerb(t + 1.7, lv1, 3.4, 0.6); }
      for (let t = lv0; t < lv1; t += 3.8) { kerb(lu0, t + 1.7, 0.6, 3.4); if (t < lv1 - 26) kerb(lu1, t + 1.7, 0.6, 3.4); }
      for (let k = 0; k < 7; k++) car(lu1 + rng.range(6, 14), lv1 - 26 + k * 2.8 + jitter(0.3), Math.PI / 2 + jitter(0.06)); // staff cars by the gatehouse
    }
    // the island is paved end to end: no tree grows on the apron
    for (let ou = -P.hw; ou <= P.hw; ou += 20) for (let ov = -P.hh; ov <= P.hh; ov += 20) occupy(ou, ov, 14);
    // cruise terminal on the south quay, ship berthed in the water alongside
    const cu = 260;
    const gz = ground(cu, quayS - 60);
    pbox('white', cu, gz, quayS - 60, 260, 12, 40);
    pbox('glass', cu, gz + 12, quayS - 60, 240, 4, 36);
    pbox('white', cu, gz, quayS - 20, 120, 7, 30); // gangway hall reaching the quay
    occupy(cu, quayS - 55, 150);
    // the liner itself is a vessel of the traffic batch (hull with a bow, tiers, lifeboats, funnel): berth it here
    {
      const sv = quayS + 22;
      const [sx, sz] = world(cu, sv);
      this.mooredBoatPositions.push({ x: sx, z: sz, rot: yaw, len: 290, kind: 'cruise' });
    }
    // fuel tank farm by the river: tanks of mixed sizes in bunds, each with its stair, top rail and roof
    // vent, pipe racks running between the rows and a pump house
    const tanks = this.map.pois.find((p) => p.kind === 'tanks')!;
    const tankAt: { x: number; z: number; r: number; h: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const tx = tanks.x + (i % 3) * 52 - 52 + rng.range(-4, 4), tz = tanks.z + Math.floor(i / 3) * 52 - 52 + rng.range(-4, 4);
      const g = this.map.heightAt(tx, tz);
      if (g < 1) continue;
      const r = rng.range(12, 22), h = rng.range(9, 17);
      this.cyl(rng.pick(['tank', 'tank', 'white', 'concrete']), tx, g, tz, r, h);
      this.cyl('steel', tx, g + h, tz, r + 0.35, 0.25); // top rim / handrail band
      this.cyl('steel', tx + r * 0.3, g + h + 0.25, tz - r * 0.2, 0.9, 1.2); // roof vent
      // stair: a thin flight leaning against the shell, with a landing at the top
      const a = rng.range(0, Math.PI * 2);
      this.box('steel', tx + Math.cos(a) * (r + 0.9), g + h / 2 - 0.4, tz + Math.sin(a) * (r + 0.9), 1.1, Math.hypot(h, 6), 0.35, -a, Math.atan2(6, h));
      this.box('steel', tx + Math.cos(a) * (r + 1.0), g + h - 0.3, tz + Math.sin(a) * (r + 1.0), 2.2, 0.3, 2.2, -a);
      // bund wall around the tank
      const bw = r + 8;
      for (const [dx, dz, w, d] of [[0, -bw, bw * 2, 0.6], [0, bw, bw * 2, 0.6], [-bw, 0, 0.6, bw * 2], [bw, 0, 0.6, bw * 2]] as const) this.box('concrete', tx + dx, g, tz + dz, w, 1.3, d);
      tankAt.push({ x: tx, z: tz, r, h });
      this.markOccupied(tx, tz, 30);
    }
    // pipe racks between the rows, pump house and a loading gantry
    for (const row of [tanks.z - 26, tanks.z + 26]) {
      const g = this.map.heightAt(tanks.x, row);
      if (g < 1) continue;
      for (let k = 0; k < 3; k++) this.box('steel', tanks.x, g + 1.4 + k * 0.5, row + k * 0.5 - 0.5, 150, 0.32, 0.32);
      for (let px = tanks.x - 70; px <= tanks.x + 70; px += rng.range(10, 16)) this.box('steel', px, g, row, 0.3, 1.5, 0.3);
    }
    {
      const px = tanks.x + 100, pz = tanks.z + rng.range(-20, 20), g = this.map.heightAt(px, pz);
      if (g >= 1) {
        this.box('concrete', px, g, pz, 16, 5, 10);
        this.box('dark', px, g + 5, pz, 17, 0.4, 11);
        this.cyl('steel', px + 6, g + 5.4, pz - 3, 0.5, 4);
        for (let k = 0; k < 3; k++) this.box('steel', px - 14 - k * 6, g, pz + 12, 0.4, 7, 0.4);
        this.box('steel', px - 20, g + 7, pz + 12, 14, 0.5, 0.5);
        this.markOccupied(px, pz, 20);
      }
    }
  }

  private buildAirport(rng: Rng): void {
    const term = this.map.pois.find((p) => p.kind === 'terminal')!;
    const g = this.map.heightAt(term.x, term.z);
    // terminal: long curved-ish roof approximated by three sections
    this.box('white', term.x, g, term.z, 260, 14, 60);
    this.box('glass', term.x, g + 3, term.z + 30.5, 250, 7, 1.2);
    this.box('steel', term.x, g + 14, term.z, 270, 2, 66);
    // piers with gates
    for (let i = -1; i <= 1; i++) {
      this.box('white', term.x + i * 90, g, term.z + 90, 30, 9, 120);
      this.box('steel', term.x + i * 90, g + 9, term.z + 90, 32, 1.2, 122);
    }
    // apron
    this.box('dark', term.x, g - 0.1, term.z + 130, 520, 0.4, 220);
    // control tower
    this.cyl('concrete', term.x + 220, g, term.z - 40, 4, 38);
    this.box('glass', term.x + 220, g + 38, term.z - 40, 14, 5, 14, 0.4);
    this.box('white', term.x + 220, g + 43, term.z - 40, 16, 1.5, 16, 0.4);
    // hangars (barrel vault approximated by stacked boxes)
    const hang = this.map.pois.find((p) => p.kind === 'hangars')!;
    for (let i = 0; i < 4; i++) {
      const hx = hang.x + i * 80, hz = hang.z;
      const hg = this.map.heightAt(hx, hz);
      this.box('concrete', hx, hg, hz, 64, 12, 50);
      this.box('steel', hx, hg + 12, hz, 60, 5, 40);
      this.box('steel', hx, hg + 17, hz, 40, 3, 30);
      this.markOccupied(hx, hz, 40);
    }
    // parked airliners at the gates
    for (let i = -1; i <= 1; i++) {
      for (const side of [-1, 1]) {
        const ax = term.x + i * 90 + side * 34, az = term.z + 110;
        this.cyl('white', ax, g + 2.2, az, 2.6, 38, 0, Math.PI / 2);
        this.box('white', ax, g + 2.5, az + 2, 34, 0.8, 5, 0.0);
        this.box('white', ax, g + 3, az + 17, 12, 0.6, 3);
        this.box('white', ax, g + 4, az + 18, 0.6, 9, 3);
        this.cyl('steel', ax - 9, g + 0.8, az + 4, 1.4, 4.5, 0, Math.PI / 2);
        this.cyl('steel', ax + 9, g + 0.8, az + 4, 1.4, 4.5, 0, Math.PI / 2);
      }
    }
    this.markOccupied(term.x, term.z + 60, 320);
    // small airstrip hangar & windsock hut
    const strip = this.map.runways.find((r) => r.id === 'strip-southkey')!;
    const mx = (strip.a[0] + strip.b[0]) / 2 + 40, mz = (strip.a[1] + strip.b[1]) / 2 - 60;
    const mg = this.map.heightAt(mx, mz);
    if (mg > 1) { this.box('concrete', mx, mg, mz, 26, 7, 20, 0.55); this.box('steel', mx, mg + 7, mz, 24, 2.5, 16, 0.55); this.markOccupied(mx, mz, 20); }
    void rng;
  }

  private buildStadium(): void {
    const st = this.map.pois.find((p) => p.kind === 'stadium')!;
    const g = this.map.heightAt(st.x, st.z);
    if (g < 1) return;
    const n = 40;
    const rx = st.size, rz = st.size * 0.8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + st.rot;
      const c = Math.cos(a), s = Math.sin(a);
      const ex = st.x + c * rx, ez = st.z + s * rz;
      const segLen = (2 * Math.PI * (rx + rz) / 2) / n + 2;
      const yaw = Math.atan2(c * rz, -s * rx);
      // tiered stands: three rings stepping up and out
      this.box('concrete', ex, g, ez, segLen, 14, 22, yaw);
      this.box('concrete', ex + c * 10, g + 14, ez + s * 10, segLen, 12, 16, yaw);
      this.box('white', ex + c * 12, g + 26, ez + s * 12, segLen, 1.5, 34, yaw); // roof ring
      this.box('steel', ex + c * 26, g, ez + s * 26, 1.4, 30, 1.4);
    }
    // field
    this.box('grass', st.x, g + 0.05, st.z, rx * 1.2, 0.3, rz * 1.15, st.rot);
    this.markOccupied(st.x, st.z, rx + 40);
  }

  private buildLighthouse(): void {
    const lh = this.map.pois.find((p) => p.kind === 'lighthouse')!;
    const g = this.map.heightAt(lh.x, lh.z);
    if (g < 0.5) return;
    this.cyl('white', lh.x, g, lh.z, 4.2, 28);
    this.cyl('red', lh.x, g + 10, lh.z, 4.25, 5);
    this.cyl('dark', lh.x, g + 28, lh.z, 2.4, 3.5);
    this.cyl('white', lh.x, g + 31.5, lh.z, 1.6, 1.4);
    this.box('white', lh.x + 12, g, lh.z + 6, 12, 5, 9, 0.3);
    this.markOccupied(lh.x, lh.z, 20);
  }

  private buildConstruction(rng: Rng): void {
    for (const d of this.map.districts) {
      if (d.id.startsWith('construction')) {
        const g = this.map.heightAt(d.cx, d.cz);
        if (g < 1) continue;
        const floors = rng.int(5, 12);
        const w = d.hw * 1.2, dd = d.hh * 1.2;
        // concrete frame: slabs + columns
        for (let f = 1; f <= floors; f++) this.box('concrete', d.cx, g + f * 3.6, d.cz, w, 0.4, dd, d.rot);
        for (const [lx, lz] of [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0, 0], [0, -0.4], [0, 0.4], [-0.4, 0], [0.4, 0]]) {
          const c = Math.cos(d.rot), s = Math.sin(d.rot);
          const x = d.cx + lx * w * c - lz * dd * s, z = d.cz + lx * w * s + lz * dd * c;
          this.cyl('concrete', x, g, z, 0.45, floors * 3.6 + 0.4);
        }
        // core
        this.box('concrete', d.cx + w * 0.15, g, d.cz, 10, floors * 3.6 + 6, 8, d.rot);
        // tower crane
        const cx = d.cx - w * 0.6, cz = d.cz + dd * 0.6;
        this.box('yellow', cx, g, cz, 2.2, floors * 3.6 + 30, 2.2);
        this.box('yellow', cx + 20, g + floors * 3.6 + 30, cz, 60, 1.6, 1.6, 0.4);
        this.box('yellow', cx - 8, g + floors * 3.6 + 30, cz, 14, 1.6, 1.6, 0.4);
        // fences, containers, materials
        for (let i = 0; i < 5; i++) this.box(rng.pick(['blue', 'white', 'orange']), d.cx + rng.range(-w, w) * 0.7, g, d.cz + dd * 0.85, 6, 2.6, 2.4, d.rot);
        this.markOccupied(d.cx, d.cz, Math.max(w, dd));
      }
    }
  }

  /** The street lamps planned by the streets system (kind, footing on the curb line, arm yaw) plus the bridge lamps. */
  private buildLamps(plan: LampPlan[], bridgeLamps: THREE.Vector3[]): void {
    for (const l of plan) {
      this.lampPositions.push(new THREE.Vector3(l.x, l.y, l.z));
      this.lamp(l.x, l.y, l.z, l.yaw, l.kind);
    }
    for (const l of bridgeLamps) { this.lampPositions.push(l.clone()); this.lamp(l.x, l.y, l.z, 0, 'highway'); }
  }

  private buildSeawalls(): void {
    // riprap along the reference bridge abutments and the port edges
    const port = this.map.districts.find((d) => d.id === 'industrial-port')!;
    const c = Math.cos(port.rot), s = Math.sin(port.rot);
    for (let i = -port.hw; i <= port.hw; i += 6) {
      for (const sz of [-1, 1]) {
        const x = port.cx + i * c - sz * port.hh * s, z = port.cz + i * s + sz * port.hh * c;
        this.box('concrete', x, 1.4, z, 6.2, 2.2, 2.0, port.rot);
      }
    }
  }
}
