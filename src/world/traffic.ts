import * as THREE from 'three';
import { Rng } from '../core/seed';
import { clamp, lerp } from '../core/noise';
import type { WorldMap, Vec2 } from './map';
import type { RoadSegment } from './roads';
import type { BridgeRoute } from './bridges';
import { CONTRAIL_MATERIAL, WakeTrail, type WakeBatch } from '../render/wakes';
import { cellKey } from './batching';
import { LAYER_MIRROR, layerMask, maskCasts, setCasterClass, type ViewCull } from './culling';
import { BoatMotion, bakeGroupLocal, buildBoatModel, createBoatMaterial, drawVariant, hullTintColor, lodDistances, type BoatModel, type BoatSpec, type HullKind, type MooredBoat } from './boats';
import { WaveField } from './waves';

// ------------------------------------------------------------------ boats

export type { HullKind, MooredBoat } from './boats';

/** A hull in the batch: its instance, LOD geometries and switch distances, world pose and floating state. */
interface BoatInstance {
  id: number;
  geoms: number[];
  /** mirrored geometry set (sails set on the other side), used while the wind is over the starboard side */
  geomsMirror: number[] | null;
  lodDist: [number, number, number];
  lod: number;
  mirror: boolean;
  x: number; z: number; hx: number; hz: number;
  scale: number;
  spec: BoatSpec;
  motion: BoatMotion;
  phase: number;
  kind: HullKind;
  /** moored boats sit at a fixed berth and only ride the water */
  moored: boolean;
}

interface MovingBoat extends BoatInstance {
  route: Vec2[];
  routeLen: number;
  s: number;
  dir: 1 | -1;
  /** current speed and the speed the boat returns to after a turn */
  speed: number;
  cruise: number;
  wake: WakeTrail;
  /** U-turn at a route end: the boat swings round a semicircle instead of reversing on the spot (which left
   *  its wake running ahead of the bow); afterwards `lateral` (its offset from the route) decays as it steers back */
  turn: { cx: number; cz: number; r: number; a: number; a0: number; sign: number } | null;
  lateral: number;
  /** last world position, for the travel direction */
  px: number;
  pz: number;
  /** smoothed compass heading (rad, 0 = -z, clockwise) and its rate: the hull swings round at a finite yaw rate */
  hdg: number;
  yawRate: number;
  sailing: boolean;
}

function routeLength(pts: Vec2[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}
function routePoint(pts: Vec2[], s: number, out: { x: number; z: number; dx: number; dz: number }): void {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + l || i === pts.length - 2) {
      const t = clamp((s - acc) / l, 0, 1);
      out.dx = (pts[i + 1][0] - pts[i][0]) / l; out.dz = (pts[i + 1][1] - pts[i][1]) / l;
      out.x = pts[i][0] + out.dx * l * t; out.z = pts[i][1] + out.dz * l * t;
      return;
    }
    acc += l;
  }
}

/** Round the corners of a polyline with arcs of radius up to `r` so hulls swing through them at a finite yaw rate. */
function smoothRoute(pts: Vec2[], r: number): Vec2[] {
  if (pts.length < 3) return pts;
  const out: Vec2[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const l0 = Math.hypot(p[0] - a[0], p[1] - a[1]), l1 = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const d0x = (p[0] - a[0]) / l0, d0z = (p[1] - a[1]) / l0, d1x = (b[0] - p[0]) / l1, d1z = (b[1] - p[1]) / l1;
    const cosT = clamp(d0x * d1x + d0z * d1z, -1, 1);
    const theta = Math.acos(cosT);
    if (theta < 0.02) { out.push(p); continue; }
    let tl = r * Math.tan(theta / 2);
    const maxTl = Math.min(l0, l1) * 0.45;
    if (tl > maxTl) tl = maxTl;
    const start: Vec2 = [p[0] - d0x * tl, p[1] - d0z * tl], endP: Vec2 = [p[0] + d1x * tl, p[1] + d1z * tl];
    // quadratic Bezier through the corner approximates the arc closely enough for a boat
    const n = Math.max(3, Math.ceil(theta / 0.12));
    for (let k = 0; k <= n; k++) {
      const t = k / n, u = 1 - t;
      out.push([u * u * start[0] + 2 * u * t * p[0] + t * t * endP[0], u * u * start[1] + 2 * u * t * p[1] + t * t * endP[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Depth-first choice among a pool of built variants: the deepest hull that floats in `depth` metres, or null. */
function pickFloating(pool: BoatModel[], rng: Rng, depth: number): BoatModel | null {
  const ok = pool.filter((m) => m.spec.draft <= depth - 0.15);
  if (!ok.length) return null;
  return rng.pick(ok);
}

/** The vehicle batch with per-camera level of detail: the main camera picks a level by distance, the shadow and
 *  mirror passes draw every hull at its mid level (their texels cannot resolve rails and cleats). */
class MoverBatch extends THREE.BatchedMesh {
  boats: BoatInstance[] = [];
  /** the main camera's position on its last pass */
  readonly camPos = new THREE.Vector3(0, 1e9, 0);
  camSeen = false;

  onBeforeRender(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, geometry: THREE.BufferGeometry, material: THREE.Material, group: THREE.Group): void {
    const reduced = scene === null || camera.layers.isEnabled(LAYER_MIRROR);
    const cp = camera.position;
    if (!reduced) { this.camPos.copy(cp); this.camSeen = true; }
    for (const b of this.boats) {
      let lod: number;
      if (reduced) lod = 2;
      else {
        const d = Math.hypot(cp.x - b.x, cp.z - b.z, cp.y) ;
        lod = d < b.lodDist[0] ? 0 : d < b.lodDist[1] ? 1 : d < b.lodDist[2] ? 2 : 3;
      }
      if (lod !== b.lod) { b.lod = lod; this.setGeometryIdAt(b.id, (b.mirror && b.geomsMirror ? b.geomsMirror : b.geoms)[lod]); }
    }
    super.onBeforeRender(renderer, scene, camera, geometry, material, group);
  }
}

// ------------------------------------------------------------------ cars

/** `laneOff0`: centre-line offset of the innermost lane, `laneW`: lane pitch (bridge decks pass their real
 *  carriageway layout; streets use the road builder's nominal lanes). `heavy`: share of vans / buses / trucks. */
interface CarRoute { pts: THREE.Vector3[]; length: number; lanes: number; width: number; laneOff0: number; laneW: number; }
/** `kind` 0 = car geometry, 1 = box vehicle (van / bus / truck, distinguished by `scale`) */
interface Car { route: number; s: number; dir: 1 | -1; lane: number; speed: number; color: THREE.Color; kind: 0 | 1; scale: THREE.Vector3; }

/** Vehicles of one kind in one spatial cell: refilled every update with bounds fitted to the vehicles actually
 *  in it, so a cell can be frustum-culled and only the cells near the camera cast shadows. */
interface CarChunk { mesh: THREE.InstancedMesh; capacity: number; n: number; center: THREE.Vector3; r: number; box: THREE.Box3 }

const CAR_CELL = 5000;
/** half-extent of a vehicle around its position, added to the fitted cell bounds */
const CAR_MARGIN = 6;
/** minimum headway (m, bumper to bumper) between vehicles placed in the same lane */
const MIN_HEADWAY = 16;

/** Box vehicle unit (a 5.4 m van): body, windscreen + side glass band, rear light bar; scaled per instance into
 *  vans, buses and rigid trucks. Same part ids as the car. */
function boxVehicleGeometry(): THREE.BufferGeometry {
  return partsGeometry([
    [new THREE.BoxGeometry(5.4, 2.0, 2.05), 0, 0, 1.15, 0],
    [new THREE.BoxGeometry(0.3, 0.9, 1.9), 1, 2.6, 1.6, 0],
    [new THREE.BoxGeometry(3.6, 0.55, 2.1), 1, 0.1, 1.65, 0],
    [new THREE.BoxGeometry(0.2, 0.3, 1.8), 2, 2.65, 0.9, 0],
  ]);
}

/** Body (part 0), cabin (part 1) and light bar (part 2) of a car in one geometry. */
function carGeometry(): THREE.BufferGeometry {
  return partsGeometry([
    [new THREE.BoxGeometry(4.4, 1.0, 1.9), 0, 0, 0.65, 0],
    [new THREE.BoxGeometry(2.2, 0.75, 1.7), 1, -0.2, 1.5, 0],
    [new THREE.BoxGeometry(0.2, 0.25, 1.6), 2, 2.2, 0.8, 0],
  ]);
}

function partsGeometry(parts: [THREE.BoxGeometry, number, number, number, number][]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], part: number[] = [];
  for (const [box, id, x, y, z] of parts) {
    const g = box.translate(x, y, z).toNonIndexed();
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); part.push(id);
    }
    g.dispose(); box.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  out.computeBoundingSphere();
  return out;
}

/** One material for the three car parts, reproducing the body / cabin / light materials exactly:
 *  body = instance colour (rough 0.35, metal 0.4), cabin = dark glass (0.15, 0.8), lights = white with
 *  the night emissive (1.0, 0.0). */
function carMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 0 });
  const cabin = new THREE.Color(0x1a222c);
  const f = (v: number) => v.toFixed(6);
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPart;\nvarying float vPart;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPart = aPart;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPart;')
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vPart > 1.5) diffuseColor.rgb = vec3(1.0);
else if (vPart > 0.5) diffuseColor.rgb = vec3(${f(cabin.r)}, ${f(cabin.g)}, ${f(cabin.b)});`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vPart > 1.5 ? 1.0 : (vPart > 0.5 ? 0.15 : 0.35);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vPart > 1.5 ? 0.0 : (vPart > 0.5 ? 0.8 : 0.4);')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= step(1.5, vPart);');
  };
  mat.customProgramCacheKey = () => 'traffic-car-v1';
  return mat;
}

// ------------------------------------------------------------------ aircraft

interface DistantAircraft { id: number; path: (t: number, out: THREE.Vector3) => THREE.Vector3; period: number; offset: number; contrail: WakeTrail | null; }

export class Traffic {
  readonly group = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  private boats: MovingBoat[] = [];
  private carRoutes: CarRoute[] = [];
  private cars: Car[] = [];
  private readonly carChunks: CarChunk[] = [];
  /** per cell: the car chunk and the box-vehicle chunk (null when no route through the cell carries that kind) */
  private readonly carCells = new Map<number, [CarChunk | null, CarChunk | null]>();
  /** the culled car cell meshes: their bounding spheres are refit to the cars in the cell every update */
  readonly carCellMeshes = new Set<THREE.Object3D>();
  /** catches vehicles whose lane offset pushed them out of every registered cell (never culled), per kind */
  private readonly carOverflow: [CarChunk, CarChunk];
  private readonly carMat: THREE.MeshStandardMaterial;
  /** every moving boat and airliner: one batched draw, per-vehicle matrices and frustum culling */
  private readonly movers: THREE.BatchedMesh;
  private aircraft: DistantAircraft[] = [];
  private readonly tmp = { x: 0, z: 0, dx: 1, dz: 0 };
  private readonly tmpM = new THREE.Matrix4();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpP = new THREE.Vector3();
  private readonly tmpS = new THREE.Vector3(1, 1, 1);
  private readonly tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly pos = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly ahead = new THREE.Vector3();
  boatCount = 0;
  carCount = 0;

  constructor(private map: WorldMap, roads: RoadSegment[], bridges: BridgeRoute[], wakes: WakeBatch, seed: number, moored: MooredBoat[]) {
    const rng = new Rng(`traffic-${seed}`);
    const factory = new BoatFactory();
    // moving boats along channels: baked in their local frame, batched below
    const moverGeos: THREE.BufferGeometry[] = [];
    for (const ch of map.channels) {
      const len = routeLength(ch.pts);
      for (let i = 0; i < ch.boats; i++) {
        const kind: HullKind = ch.id === 'ocean-route' || ch.id === 'ship-channel' ? (rng.chance(0.6) ? 'cargo' : 'ferry') : rng.pick(['speed', 'speed', 'console', 'yacht', 'sail', 'speed']);
        const b = factory.build(kind, rng);
        const speed = kind === 'cargo' ? rng.range(4, 6) : kind === 'ferry' ? 7 : kind === 'sail' ? rng.range(2.5, 4) : kind === 'yacht' ? rng.range(5, 9) : rng.range(9, 16);
        // the ribbon carries the hull's half-beam and transom-to-bow length (bow wave, waterline, Kelvin arms);
        // points are spaced by hull size so a ship's wake reaches a kilometre and a runabout's a few hundred metres
        const big = kind === 'cargo' || kind === 'ferry';
        const wake = new WakeTrail(100, b.beam * 0.5, big ? 150 : kind === 'sail' ? 30 : 60, kind === 'sail' ? 0.5 : 1.3, wakes, b.len * 0.95, clamp(b.len * 0.5, 3, 12));
        moverGeos.push(bakeLocal(b.group));
        this.boats.push({ id: moverGeos.length - 1, route: ch.pts, routeLen: len, s: rng.range(0, len), dir: rng.chance(0.5) ? 1 : -1, speed, len: b.len, draft: b.draft, wake, phase: rng.range(0, 100), turn: null, lateral: 0, px: NaN, pz: NaN, hx: 1, hz: 0 });
      }
    }
    // moored boats (static, no wake) join the same batch with a fixed matrix
    const mooredInst: { idx: number; m: THREE.Matrix4 }[] = [];
    for (const mb of moored) {
      const kind: HullKind = mb.kind ?? (rng.chance(0.4) ? 'sail' : rng.chance(0.5) ? 'speed' : rng.chance(0.5) ? 'console' : 'yacht');
      const b = factory.build(kind, rng, true);
      const scale = kind === 'cruise' ? 1 : clamp(mb.len / b.len, 0.6, 1.4);
      b.group.scale.setScalar(scale);
      b.group.position.set(mb.x, 0.05, mb.z);
      b.group.rotation.y = mb.rot + (rng.chance(0.5) ? Math.PI : 0);
      moverGeos.push(bakeLocal(b.group));
      mooredInst.push({ idx: moverGeos.length - 1, m: b.group.matrixWorld.clone() });
    }
    this.boatCount = this.boats.length + moored.length;

    // car routes: authored road polylines + generated streets + bridge decks
    const byId = new Map<string, THREE.Vector3[]>();
    for (const r of map.roads) byId.set(r.id, r.pts.map(([x, z]) => new THREE.Vector3(x, map.heightAt(x, z) + 0.25, z)));
    const routeDensity: number[] = [];
    for (const [id, pts] of byId) {
      const spec = map.roads.find((r) => r.id === id)!;
      this.carRoutes.push({ pts, length: this.len3(pts), lanes: spec.lanes, width: spec.width, laneOff0: spec.lanes >= 4 ? 1.5 : 1.8, laneW: 3.2 });
      routeDensity.push(spec.traffic);
    }
    for (const b of bridges) {
      // the deck's carriageway layout (see bridges.ts): lanes of 3.3 m, a 0.3 m median half-width on six lanes
      const cw = clamp(b.lanes * 3.3, 8, b.width - 4), laneW = cw / b.lanes, median = b.lanes >= 6 ? 0.3 : 0;
      this.carRoutes.push({ pts: b.pts.map((p) => p.clone().add(new THREE.Vector3(0, 0.25, 0))), length: this.len3(b.pts), lanes: b.lanes, width: b.width, laneOff0: median + laneW * 0.5, laneW });
      routeDensity.push(b.traffic * 3.0);
    }
    for (const s of roads) {
      if (s.cls !== 'street') continue;
      if (rng.next() > 0.35) continue; // not every street carries traffic
      const pts = [new THREE.Vector3(s.a[0], map.heightAt(s.a[0], s.a[1]) + 0.25, s.a[1]), new THREE.Vector3(s.b[0], map.heightAt(s.b[0], s.b[1]) + 0.25, s.b[1])];
      this.carRoutes.push({ pts, length: this.len3(pts), lanes: 2, width: s.width, laneOff0: 1.8, laneW: 3.2 });
      routeDensity.push(1.2);
    }
    const carColors = ['#e8e8e8', '#d0d0d0', '#1c1c1e', '#8a8f94', '#b8352e', '#2b4c8c', '#d9a441', '#3d6b3a', '#f2f2f2', '#6c6f73', '#c94f3d', '#20242a'];
    const vanColors = ['#f2f2f2', '#e8e8e8', '#d8d8d4', '#3a4a5c', '#b8352e'];
    const busColors = ['#2b6cb0', '#e4842a', '#f0f0ee', '#3d8a4a'];
    const truckColors = ['#f2f2f2', '#c8cccf', '#8a2f2a', '#2f5a3c', '#d9a441'];
    const unit = new THREE.Vector3(1, 1, 1);
    /** van: the unit box; bus: 12 x 2.55 x 3.2 m; rigid truck: 9 x 2.5 x 3.4 m */
    const heavyOf = (): { scale: THREE.Vector3; color: string; len: number } => {
      const u = rng.next();
      if (u < 0.55) return { scale: unit, color: rng.pick(vanColors), len: 5.4 };
      if (u < 0.78) return { scale: new THREE.Vector3(2.2, 1.55, 1.25), color: rng.pick(busColors), len: 12 };
      return { scale: new THREE.Vector3(1.7, 1.65, 1.22), color: rng.pick(truckColors), len: 9.2 };
    };
    for (let ri = 0; ri < this.carRoutes.length; ri++) {
      const r = this.carRoutes[ri];
      const n = Math.min(160, Math.round((r.length / 1000) * routeDensity[ri]));
      if (!n) continue;
      const lanesPerDir = Math.max(1, Math.floor(r.lanes / 2));
      const multi = r.lanes >= 4;
      // lane discipline: every (direction, lane) gets a queue of vehicles with random headways >= MIN_HEADWAY and a
      // common lane speed (fast inside, slow outside, where the heavies run) with a hair of jitter, so the queues
      // keep their spacing through the pre-simulation instead of overlapping
      const perQueue = Math.ceil(n / (2 * lanesPerDir));
      const base = multi ? 24 : 13;
      for (const dir of [1, -1] as const) for (let lane = 0; lane < lanesPerDir; lane++) {
        const laneSpeed = base * (1.12 - 0.1 * lane);
        // the queue is spread over the whole route: gaps average the route length per vehicle, with a wide
        // spread (platoons and open stretches) but never under the minimum headway
        const meanGap = r.length / perQueue;
        let s = rng.range(0, r.length);
        for (let i = 0; i < perQueue; i++) {
          const outer = lane === lanesPerDir - 1;
          const heavy = multi && rng.chance(outer ? 0.32 : 0.08);
          const h = heavy ? heavyOf() : null;
          const color = new THREE.Color(h ? h.color : rng.pick(carColors));
          this.cars.push({ route: ri, s, dir, lane, speed: laneSpeed * rng.range(0.99, 1.01) * (h && h.len > 6 ? 0.92 : 1), color, kind: h ? 1 : 0, scale: h ? h.scale : unit });
          s = (s + Math.max((h ? h.len : 4.4) + MIN_HEADWAY, meanGap * rng.range(0.3, 1.7))) % r.length;
        }
      }
    }
    this.carCount = this.cars.length;
    // vehicle cells: every cell a route passes through gets a chunk per kind sized for all vehicles of those routes
    const geos = [carGeometry(), boxVehicleGeometry()];
    this.carMat = carMaterial();
    this.materials.push(this.carMat);
    const cellCap = new Map<number, [number, number]>();
    const carsPerRoute = this.carRoutes.map(() => [0, 0]);
    for (const c of this.cars) carsPerRoute[c.route][c.kind]++;
    const seen = new Set<number>();
    const sample = new THREE.Vector3();
    for (let ri = 0; ri < this.carRoutes.length; ri++) {
      if (!carsPerRoute[ri][0] && !carsPerRoute[ri][1]) continue;
      const pts = this.carRoutes[ri].pts;
      seen.clear();
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 40));
        for (let k = 0; k <= steps; k++) {
          sample.lerpVectors(a, b, k / steps);
          const key = cellKey(sample.x, sample.z, CAR_CELL);
          if (!seen.has(key)) {
            seen.add(key);
            const cap = cellCap.get(key) ?? [0, 0];
            cap[0] += carsPerRoute[ri][0]; cap[1] += carsPerRoute[ri][1];
            cellCap.set(key, cap);
          }
        }
      }
    }
    const makeChunk = (kind: 0 | 1, capacity: number, culled: boolean): CarChunk => {
      const mesh = new THREE.InstancedMesh(geos[kind], this.carMat, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, this.cars[0]?.color ?? new THREE.Color(0xffffff));
      mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.count = 0;
      mesh.visible = false;
      setCasterClass(mesh, 'mid');
      // the world-space bound is refitted to the vehicles in the cell every update
      if (culled) mesh.boundingSphere = new THREE.Sphere();
      else mesh.frustumCulled = false;
      this.group.add(mesh);
      return { mesh, capacity, n: 0, center: new THREE.Vector3(), r: 0, box: new THREE.Box3() };
    };
    for (const [key, cap] of cellCap) {
      const chunks: [CarChunk | null, CarChunk | null] = [null, null];
      for (const kind of [0, 1] as const) {
        if (!cap[kind]) continue;
        const chunk = makeChunk(kind, cap[kind], true);
        chunks[kind] = chunk;
        this.carChunks.push(chunk);
        this.carCellMeshes.add(chunk.mesh);
      }
      this.carCells.set(key, chunks);
    }
    this.carOverflow = [makeChunk(0, Math.max(1, carsPerRoute.reduce((a, c) => a + c[0], 0)), false), makeChunk(1, Math.max(1, carsPerRoute.reduce((a, c) => a + c[1], 0)), false)];
    this.carChunks.push(...this.carOverflow);

    // distant aircraft: two airliners on approach / departure, one high cruiser with a contrail
    const airMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.2 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x2a6fbf, roughness: 0.4 });
    const airliner = (scale: number): number => {
      const g = new THREE.Group();
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 38, 12), airMat); fus.rotation.z = Math.PI / 2; g.add(fus);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 8), airMat); nose.position.x = 19; nose.scale.set(1.6, 1, 1); g.add(nose);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 34), airMat); wing.position.set(1, -0.8, 0); wing.rotation.y = 0.0; g.add(wing);
      const sweepL = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 16), airMat); sweepL.position.set(-3, -0.8, 12); sweepL.rotation.y = -0.45; g.add(sweepL);
      const sweepR = sweepL.clone(); sweepR.position.z = -12; sweepR.rotation.y = 0.45; g.add(sweepR);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 0.4), tailMat); tail.position.set(-16, 4.5, 0); tail.rotation.z = -0.4; g.add(tail);
      const hstab = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 12), airMat); hstab.position.set(-17, 1, 0); g.add(hstab);
      for (const s of [-1, 1]) { const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.0, 4.5, 10), airMat); eng.rotation.z = Math.PI / 2; eng.position.set(3, -2.4, s * 7); g.add(eng); }
      g.scale.setScalar(scale);
      moverGeos.push(bakeLocal(g));
      return moverGeos.length - 1;
    };
    const rwy = map.runways[0];
    // approach to runway 09 from the east over the bay: descend from 900 m at x=+3000 to the threshold
    const approach = (t: number, out: THREE.Vector3) => {
      const x = lerp(4000, rwy.a[0], t), z = lerp(rwy.a[1] + 30, rwy.a[1], t);
      const y = lerp(900, 12, Math.pow(t, 0.9));
      return out.set(x, y, z);
    };
    this.aircraft.push({ id: airliner(1.0), path: approach, period: 240, offset: 0, contrail: null });
    this.aircraft.push({ id: airliner(0.9), path: approach, period: 240, offset: 0.5, contrail: null });
    // departure climbing west then turning north
    const departure = (t: number, out: THREE.Vector3) => {
      const x = lerp(rwy.b[0], -9000, t), z = rwy.b[1] - 3500 * t * t;
      return out.set(x, 12 + 2200 * Math.pow(t, 0.8), z);
    };
    this.aircraft.push({ id: airliner(1.0), path: departure, period: 200, offset: 0.2, contrail: null });
    // high cruiser with contrail
    const cruise = (t: number, out: THREE.Vector3) => out.set(lerp(-14000, 14000, t), 9500, lerp(-9000, 6000, t));
    const contrail = new WakeTrail(180, 25, 90, 0.6, CONTRAIL_MATERIAL);
    this.aircraft.push({ id: airliner(1.0), path: cruise, period: 260, offset: 0.4, contrail });

    // the movers batch: one geometry + instance per vehicle, drawn in a single (multi-draw) call with
    // per-vehicle frustum culling; the whole-mesh bound is meaningless for vehicles spread over the map
    let vertexCount = 0;
    for (const g of moverGeos) vertexCount += g.getAttribute('position').count;
    const moverMat = createBatchedPbrMaterial('traffic-movers-v1', true);
    this.materials.push(moverMat);
    this.movers = new THREE.BatchedMesh(moverGeos.length, vertexCount, vertexCount, moverMat);
    const ids = moverGeos.map((g) => {
      const id = this.movers.addInstance(this.movers.addGeometry(g));
      g.dispose();
      return id;
    });
    for (const b of this.boats) b.id = ids[b.id];
    for (const a of this.aircraft) a.id = ids[a.id];
    for (const mi of mooredInst) this.movers.setMatrixAt(ids[mi.idx], mi.m);
    this.movers.frustumCulled = false;
    this.movers.castShadow = true; this.movers.receiveShadow = true;
    this.group.add(this.movers);
  }

  private len3(pts: THREE.Vector3[]): number {
    let l = 0;
    for (let i = 0; i < pts.length - 1; i++) l += pts[i].distanceTo(pts[i + 1]);
    return l;
  }

  private point3(pts: THREE.Vector3[], s: number, out: THREE.Vector3, dir: THREE.Vector3): void {
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = pts[i].distanceTo(pts[i + 1]);
      if (s <= acc + l || i === pts.length - 2) {
        const t = clamp((s - acc) / l, 0, 1);
        dir.subVectors(pts[i + 1], pts[i]).divideScalar(l);
        out.copy(pts[i]).addScaledVector(dir, l * t);
        return;
      }
      acc += l;
    }
  }

  /** Contrail meshes live in the main scene (they are drawn in the air, not on the water). */
  get contrailMeshes(): THREE.Mesh[] { return this.aircraft.filter((a) => a.contrail).map((a) => a.contrail!.mesh!); }

  update(dt: number, time: number, night: number): void {
    const { tmpM, tmpQ, tmpP, tmpS, tmpE, movers } = this;
    tmpS.set(1, 1, 1);
    // boats
    for (const b of this.boats) {
      const len = b.routeLen;
      let x: number, z: number, hx: number, hz: number;
      if (b.turn) {
        const T = b.turn;
        T.t += dt;
        const k = Math.min(T.t / T.dur, 1);
        const a = T.a0 + T.sweep * k;
        x = T.cx + T.r * Math.cos(a); z = T.cz + T.r * Math.sin(a);
        const sg = Math.sign(T.sweep);
        hx = -Math.sin(a) * sg; hz = Math.cos(a) * sg;
        if (k >= 1) {
          // back on the reversed route, 2 r to one side of it; the offset decays as the boat steers back
          b.turn = null;
          b.dir = b.dir === 1 ? -1 : 1;
          routePoint(b.route, b.s, this.tmp);
          const fdx = this.tmp.dx * b.dir, fdz = this.tmp.dz * b.dir;
          b.lateral = (x - this.tmp.x) * -fdz + (z - this.tmp.z) * fdx;
        }
      } else {
        b.s += b.speed * dt * b.dir;
        b.s = clamp(b.s, 5, len - 5);
        routePoint(b.route, b.s, this.tmp);
        const fdx = this.tmp.dx * b.dir, fdz = this.tmp.dz * b.dir;
        const rx = -fdz, rz = fdx; // right of travel
        if (b.lateral !== 0) {
          b.lateral *= Math.exp(-dt * b.speed / (b.len * 6));
          if (Math.abs(b.lateral) < 0.05) b.lateral = 0;
        }
        x = this.tmp.x + rx * b.lateral; z = this.tmp.z + rz * b.lateral;
        const mx = x - b.px, mz = z - b.pz, ml = Math.hypot(mx, mz);
        if (Number.isFinite(ml) && ml > 1e-4) { hx = mx / ml; hz = mz / ml; } else { hx = fdx; hz = fdz; }
        if ((b.dir === 1 && b.s >= len - 5) || (b.dir === -1 && b.s <= 5)) {
          // route end: swing round a semicircle (turning circle ~1.6 hull lengths, capped for ships)
          const r = clamp(b.len * 1.6, 10, 120);
          const side = b.phase > 50 ? 1 : -1;
          const cx = x + rx * side * r, cz = z + rz * side * r;
          const px = x - cx, pz = z - cz;
          b.turn = { cx, cz, r, a0: Math.atan2(pz, px), sweep: Math.PI * Math.sign(px * hz - pz * hx || 1), t: 0, dur: (Math.PI * r) / b.speed };
        }
      }
      const yaw = Math.atan2(hx, hz);
      tmpP.set(x, -b.draft * 0.15 + 0.12 * Math.sin(time * 1.3 + b.phase) * (b.len < 20 ? 1 : 0.2), z);
      // hull axis is +x, rotate so +x points along travel direction; a little roll and pitch with the swell
      tmpE.set(0.02 * Math.sin(time * 1.7 + b.phase), yaw - Math.PI / 2, 0.03 * Math.sin(time * 1.1 + b.phase) + (b.speed > 8 ? -0.03 : 0), 'XYZ');
      movers.setMatrixAt(b.id, tmpM.compose(tmpP, tmpQ.setFromEuler(tmpE), tmpS));
      // the wake ribbon starts at the transom and runs forward over the hull to the bow (bow wave, waterline)
      b.wake.update(x - hx * b.len * 0.5, z - hz * b.len * 0.5, hx, hz, time, true, b.speed);
      b.px = x; b.pz = z; b.hx = hx; b.hz = hz;
    }
    // cars: advance, then refill the chunk of the cell each car is in
    const { pos, dir, side, up } = this;
    for (const ch of this.carChunks) { ch.n = 0; ch.box.makeEmpty(); }
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      const r = this.carRoutes[c.route];
      c.s += c.speed * dt * c.dir;
      if (c.s > r.length) { c.s = 0; }
      if (c.s < 0) { c.s = r.length; }
      this.point3(r.pts, c.s, pos, dir);
      if (c.dir < 0) dir.negate();
      side.crossVectors(dir, up).normalize();
      const laneOff = r.laneOff0 + c.lane * r.laneW;
      pos.addScaledVector(side, laneOff);
      const yaw = Math.atan2(dir.x, dir.z) - Math.PI / 2;
      const pitch = -Math.asin(clamp(dir.y, -1, 1));
      this.tmpQ.setFromEuler(this.tmpE.set(0, yaw, pitch, 'YXZ'));
      this.tmpP.copy(pos);
      this.tmpM.compose(this.tmpP, this.tmpQ, c.scale);
      let chunk = this.carCells.get(cellKey(pos.x, pos.z, CAR_CELL))?.[c.kind];
      if (!chunk || chunk.n >= chunk.capacity) chunk = this.carOverflow[c.kind];
      const slot = chunk.n++;
      chunk.mesh.setMatrixAt(slot, this.tmpM);
      chunk.mesh.setColorAt(slot, c.color);
      chunk.box.expandByPoint(pos);
    }
    for (const ch of this.carChunks) {
      const m = ch.mesh;
      m.count = ch.n;
      if (!ch.n) { m.visible = false; continue; }
      m.visible = true;
      m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, ch.n * 16); m.instanceMatrix.needsUpdate = true;
      m.instanceColor!.clearUpdateRanges(); m.instanceColor!.addUpdateRange(0, ch.n * 3); m.instanceColor!.needsUpdate = true;
      ch.box.min.addScalar(-CAR_MARGIN); ch.box.max.addScalar(CAR_MARGIN);
      if (m.boundingSphere) {
        ch.box.getBoundingSphere(m.boundingSphere);
        ch.center.copy(m.boundingSphere.center); ch.r = m.boundingSphere.radius;
      }
    }
    this.carMat.emissiveIntensity = 6 * night;
    // aircraft
    for (const a of this.aircraft) {
      const t = ((time / a.period) + a.offset) % 1;
      const p = a.path(t, this.pos), d = a.path(Math.min(1, t + 0.002), this.ahead).sub(p).normalize();
      const yaw = Math.atan2(d.x, d.z) - Math.PI / 2;
      const pitch = Math.asin(clamp(d.y, -1, 1));
      tmpE.set(0, yaw, pitch * 0.6, 'YXZ');
      movers.setMatrixAt(a.id, tmpM.compose(p, tmpQ.setFromEuler(tmpE), tmpS));
      if (a.contrail) {
        a.contrail.update(p.x, p.z, d.x, d.z, time, true, 250);
        a.contrail.mesh!.position.y = p.y - 2;
        a.contrail.mesh!.updateMatrix();
      }
    }
  }

  /** Per-frame culling of the car cells: a cell casts only when its shadow can reach the view, and
   *  leaves the camera layer when out of view. (The movers batch culls per vehicle on its own.) */
  updateCulling(cull: ViewCull): void {
    for (const ch of this.carChunks) {
      if (!ch.n || ch === this.carOverflow[0] || ch === this.carOverflow[1]) continue;
      const inView = cull.boxInView(ch.box);
      const bits = cull.casterCascades(ch.center, ch.r, 2.5);
      const mask = layerMask('mid', inView, bits);
      const cast = maskCasts(mask);
      ch.mesh.visible = inView || cast;
      ch.mesh.castShadow = cast;
      ch.mesh.layers.mask = mask;
    }
  }
}
