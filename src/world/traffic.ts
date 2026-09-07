import * as THREE from 'three';
import { Rng } from '../core/seed';
import { clamp, lerp } from '../core/noise';
import type { WorldMap, Vec2 } from './map';
import type { RoadSegment } from './roads';
import type { BridgeRoute } from './bridges';
import { CONTRAIL_MATERIAL, WakeTrail, type WakeBatch } from '../render/wakes';
import { cellKey } from './batching';
import { LAYER_MIRROR, layerMask, maskCasts, setCasterClass, type ViewCull } from './culling';
import { BoatMotion, bakeGroupLocal, buildBoatModel, createBoatMaterial, drawVariant, hullTintColor, lodDistances, mirrorZ, scaledSpec, type BoatModel, type BoatSpec, type HullKind, type MooredBoat } from './boats';
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
  /** the hull's own view of the wave field (its site cache stays valid while the hull moves a few metres) */
  waves: WaveField;
  waveAt: (x: number, z: number) => number;
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

/** The hull of a pool that fits a berth of `len` metres in `depth` metres of water best (closest length among the
 *  hulls that float there), or null when none floats. */
function fitBerth(pool: BoatModel[], len: number, depth: number): BoatModel | null {
  let best: BoatModel | null = null, bestErr = Infinity;
  for (const m of pool) {
    if (m.spec.draft > depth - 0.15) continue;
    const err = Math.abs(Math.log(m.spec.len / len));
    if (err < bestErr) { bestErr = err; best = m; }
  }
  return best;
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
  private readonly boatMat: THREE.MeshStandardMaterial;
  /** every boat (under way or berthed) and airliner: one batched draw, per-vehicle matrices, LOD and frustum culling */
  private readonly movers: MoverBatch;
  /** boats tied up in the marinas and at the cruise berth: fixed position, riding the water */
  private readonly moored: BoatInstance[] = [];
  /** wave time of the last update (the water shader's clock) for the per-boat wave lookups */
  private waveTime = 0;
  private readonly waves: WaveField;
  private windX = 0.94;
  private windZ = 0.34;
  private windSpeed = 6;
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
    // the boats draw from their own stream so a change to the fleet never reshuffles the cars
    const brng = new Rng(`boats-${seed}`);
    const terrain = (x: number, z: number) => map.heightAt(x, z);
    this.waves = new WaveField(terrain);
    const waveAt = (x: number, z: number) => this.waves.heightAt(x, z, this.waveTime);
    // a handful of hull variants per kind, shared by the instances (each instance carries its own hull tint);
    // berthed variants carry fenders, covers, tilted outboards and no crew
    const pool = (kind: HullKind, n: number, moored: boolean): BoatModel[] => {
      const out: BoatModel[] = [];
      for (let i = 0; i < n; i++) out.push(buildBoatModel(drawVariant(kind, brng, moored)));
      return out;
    };
    const under: Partial<Record<HullKind, BoatModel[]>> = { speed: pool('speed', 5, false), console: pool('console', 3, false), yacht: pool('yacht', 3, false), sail: pool('sail', 4, false), cargo: pool('cargo', 2, false), ferry: pool('ferry', 1, false) };
    const berthed: Partial<Record<HullKind, BoatModel[]>> = { speed: pool('speed', 5, true), console: pool('console', 4, true), yacht: pool('yacht', 4, true), sail: pool('sail', 6, true), cruise: pool('cruise', 1, true) };
    // pass 1: choose a hull for every instance
    interface Pick { model: BoatModel; mirror: boolean; tint: THREE.Color; }
    const picks: Pick[] = [];
    const mooredPicks: (Pick & { mb: MooredBoat; scale: number; flip: boolean })[] = [];
    const movingSpecs: { pick: Pick; ch: (typeof map.channels)[number]; kind: HullKind }[] = [];
    let lastTint: THREE.Color | null = null;
    const tintFor = (kind: HullKind): THREE.Color => {
      if (kind === 'cruise') return new THREE.Color(0xf4f4f0);
      if (kind === 'ferry') return new THREE.Color(0xf2f2ee);
      if (kind === 'cargo') return new THREE.Color(brng.pick([0x16284a, 0x1c1e22, 0x5a6168, 0x9a2f2a, 0x2f5a3c]));
      const c = hullTintColor(brng, lastTint);
      lastTint = c;
      return c;
    };
    for (const ch of map.channels) {
      for (let i = 0; i < ch.boats; i++) {
        const kind: HullKind = ch.id === 'ocean-route' || ch.id === 'ship-channel' ? (brng.chance(0.6) ? 'cargo' : 'ferry') : brng.pick(['speed', 'speed', 'console', 'yacht', 'sail', 'speed']);
        const model = brng.pick(under[kind]!);
        const pick: Pick = { model, mirror: kind === 'sail' && model.variant.sailsUp, tint: tintFor(kind) };
        picks.push(pick);
        movingSpecs.push({ pick, ch, kind });
      }
    }
    for (const mb of moored) {
      const depth = -map.heightAt(mb.x, mb.z);
      let model: BoatModel | null = null;
      if (mb.kind) model = berthed[mb.kind]![0];
      else {
        // the berth length picks the class: T-heads take the yachts and big sloops, slips the runabouts and
        // day boats, and only a hull that floats in the berth's water is taken
        const order: HullKind[] = mb.len >= 13 ? (brng.chance(0.55) ? ['yacht', 'sail', 'console'] : ['sail', 'yacht', 'console'])
          : mb.len >= 9 ? (brng.chance(0.45) ? ['sail', 'speed', 'console'] : brng.chance(0.5) ? ['speed', 'console', 'sail'] : ['console', 'speed', 'sail'])
          : brng.chance(0.5) ? ['speed', 'console', 'sail'] : ['console', 'speed', 'sail'];
        for (const k of order) { model = fitBerth(berthed[k]!, mb.len, depth); if (model) break; }
      }
      if (!model) continue;
      const scale = mb.kind === 'cruise' ? 1 : clamp(mb.len / model.spec.len, 0.8, 1.2);
      const pick: Pick = { model, mirror: false, tint: tintFor(model.spec.kind) };
      picks.push(pick);
      mooredPicks.push({ ...pick, mb, scale, flip: mb.kind ? false : brng.chance(0.5) });
    }
    // pass 2: size the batch for the geometries in use (every LOD, the mirrored sail sets, the airliners)
    const used = new Set<BoatModel>();
    for (const p of picks) used.add(p.model);
    const mirrored = new Map<BoatModel, THREE.BufferGeometry[]>();
    for (const p of picks) if (p.mirror && !mirrored.has(p.model)) mirrored.set(p.model, p.model.lods.map((g) => mirrorZ(g)));
    let vertexCount = 0;
    for (const m of used) for (const g of m.lods) vertexCount += g.getAttribute('position').count;
    for (const gs of mirrored.values()) for (const g of gs) vertexCount += g.getAttribute('position').count;
    const airlinerGeos: THREE.BufferGeometry[] = this.buildAirliners();
    for (const g of airlinerGeos) vertexCount += g.getAttribute('position').count;
    this.boatMat = createBoatMaterial();
    this.materials.push(this.boatMat);
    this.movers = new MoverBatch(picks.length + airlinerGeos.length, vertexCount, vertexCount, this.boatMat);
    const geoId = new Map<THREE.BufferGeometry, number>();
    const idsOf = (gs: THREE.BufferGeometry[]): number[] => gs.map((g) => {
      let id = geoId.get(g);
      if (id === undefined) { id = this.movers.addGeometry(g); geoId.set(g, id); }
      return id;
    });
    const instance = (p: Pick, x: number, z: number, hx: number, hz: number, scale: number, moored: boolean, phase: number): BoatInstance => {
      const geoms = idsOf(p.model.lods);
      const geomsMirror = p.mirror ? idsOf(mirrored.get(p.model)!) : null;
      const id = this.movers.addInstance(geoms[2]);
      this.movers.setColorAt(id, p.tint);
      const spec = scaledSpec(p.model.spec, scale);
      // a berthed hull rides the water at its centre only (the harbour swell is longer than any hull; one wave
      // lookup per step instead of five)
      const motionSpec = moored ? { ...spec, samples: spec.samples.map(() => [0, 0] as [number, number]) } : spec;
      const b: BoatInstance = { id, geoms, geomsMirror, lodDist: lodDistances(spec.len), lod: 2, mirror: false, x, z, hx, hz, scale, spec, motion: new BoatMotion(motionSpec), phase, kind: p.model.spec.kind, moored, waves: new WaveField(terrain), waveAt: () => 0 };
      b.waveAt = (px: number, pz: number) => b.waves.heightAt(px, pz, this.waveTime);
      return b;
    };
    // moving boats along the channels (their corners rounded so the hulls swing through them)
    const routes = new Map<string, Vec2[]>();
    for (const { pick, ch, kind } of movingSpecs) {
      let route = routes.get(ch.id);
      if (!route) { route = smoothRoute(ch.pts, clamp(ch.width * 0.8, 40, 220)); routes.set(ch.id, route); }
      const len = routeLength(route);
      const spec = pick.model.spec;
      const speed = kind === 'cargo' ? brng.range(4, 6) : kind === 'ferry' ? 7 : kind === 'sail' ? brng.range(2.5, 4) : kind === 'yacht' ? brng.range(5, 9) : brng.range(9, 16);
      // the ribbon carries the hull's half-beam and transom-to-bow length (bow wave, waterline, Kelvin arms);
      // points are spaced by hull size so a ship's wake reaches a kilometre and a runabout's a few hundred metres
      const big = kind === 'cargo' || kind === 'ferry';
      const sailing = kind === 'sail' && pick.model.variant.sailsUp;
      const wake = new WakeTrail(100, spec.beam * 0.5, big ? 150 : kind === 'sail' ? 30 : 60, kind === 'sail' ? 0.5 : 1.3, wakes, spec.lwl * 0.95, clamp(spec.len * 0.5, 3, 12));
      // per hull: a sailing hull leaves no prop wash, a displacement hull never planes
      if (sailing) wake.propWash = 0.1;
      if (!spec.planing) wake.planingSpeed = kind === 'yacht' ? 0.85 * Math.sqrt(9.81 * spec.lwl) : 1e3;
      const s = brng.range(0, len), dir: 1 | -1 = brng.chance(0.5) ? 1 : -1;
      routePoint(route, s, this.tmp);
      const hx = this.tmp.dx * dir, hz = this.tmp.dz * dir;
      const inst = instance(pick, this.tmp.x, this.tmp.z, hx, hz, 1, false, brng.range(0, 100));
      const mb: MovingBoat = { ...inst, route, routeLen: len, s, dir, speed, cruise: speed, wake, turn: null, lateral: 0, px: NaN, pz: NaN, hdg: Math.atan2(hx, hz), yawRate: 0, sailing };
      mb.waveAt = (px: number, pz: number) => mb.waves.heightAt(px, pz, this.waveTime);
      mb.motion.settle(mb.x, mb.z, hx, hz, mb.waveAt, speed);
      this.boats.push(mb);
    }
    // berthed boats: fixed at their berth, bow in or out, riding the water
    for (const mp of mooredPicks) {
      const rot = mp.mb.rot + (mp.flip ? Math.PI : 0);
      const hx = Math.cos(rot), hz = -Math.sin(rot);
      const b = instance(mp, mp.mb.x, mp.mb.z, hx, hz, mp.scale, true, brng.range(0, 100));
      b.motion.settle(b.x, b.z, hx, hz, b.waveAt, 0);
      this.moored.push(b);
    }
    this.movers.boats = [...this.boats, ...this.moored];
    this.boatCount = this.movers.boats.length;
    this.aircraft = this.placeAirliners(airlinerGeos.map((g) => this.movers.addInstance(this.movers.addGeometry(g))), map);
    for (const g of airlinerGeos) g.dispose();
    this.movers.frustumCulled = false;
    this.movers.castShadow = true; this.movers.receiveShadow = true;
    this.group.add(this.movers);

    // car routes: authored road polylines + generated streets + bridge decks
    const byId = new Map<string, THREE.Vector3[]>();
    for (const r of map.roads) byId.set(r.id, r.pts.map(([x, z]) => new THREE.Vector3(x, map.heightAt(x, z) + 0.25, z)));
    const routeDensity: number[] = [];
    for (const [id, pts] of byId) {
      const spec = map.roads.find((r) => r.id === id)!;
      // the 4-lane arterials carry a 2 m kerbed median (world/streets.ts buildMedians): their inner lane drives 2.6 m
      // from the centreline (lanes 1.0-4.2 and 4.2-7.4 m, the road shader's lane layout), a car body 1.6 m off the kerb
      const median = spec.cls === 'arterial' && spec.lanes >= 4;
      this.carRoutes.push({ pts, length: this.len3(pts), lanes: spec.lanes, width: spec.width, laneOff0: median ? 2.6 : spec.lanes >= 4 ? 1.5 : 1.8, laneW: 3.2 });
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

  }

  /** Distant airliner geometries (baked with the boat batch's attributes): two on approach, one departing, one cruising. */
  private buildAirliners(): THREE.BufferGeometry[] {
    const airMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.2 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x2a6fbf, roughness: 0.4 });
    const airliner = (scale: number): THREE.BufferGeometry => {
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
      return bakeGroupLocal(g);
    };
    const out = [airliner(1.0), airliner(0.9), airliner(1.0), airliner(1.0)];
    airMat.dispose(); tailMat.dispose();
    return out;
  }

  /** The airliners' paths, in the order of buildAirliners(): approach x 2, departure, high cruiser with a contrail. */
  private placeAirliners(ids: number[], map: WorldMap): DistantAircraft[] {
    const rwy = map.runways[0];
    // approach to runway 09 from the east over the bay: descend from 900 m at x=+3000 to the threshold
    const approach = (t: number, out: THREE.Vector3) => {
      const x = lerp(4000, rwy.a[0], t), z = lerp(rwy.a[1] + 30, rwy.a[1], t);
      const y = lerp(900, 12, Math.pow(t, 0.9));
      return out.set(x, y, z);
    };
    // departure climbing west then turning north
    const departure = (t: number, out: THREE.Vector3) => {
      const x = lerp(rwy.b[0], -9000, t), z = rwy.b[1] - 3500 * t * t;
      return out.set(x, 12 + 2200 * Math.pow(t, 0.8), z);
    };
    const cruise = (t: number, out: THREE.Vector3) => out.set(lerp(-14000, 14000, t), 9500, lerp(-9000, 6000, t));
    const contrail = new WakeTrail(180, 25, 90, 0.6, CONTRAIL_MATERIAL);
    return [
      { id: ids[0], path: approach, period: 240, offset: 0, contrail: null },
      { id: ids[1], path: approach, period: 240, offset: 0.5, contrail: null },
      { id: ids[2], path: departure, period: 200, offset: 0.2, contrail: null },
      { id: ids[3], path: cruise, period: 260, offset: 0.4, contrail },
    ];
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

  /** Wind over the water (direction the air moves toward, m/s): the boats' wave lookups and the sails follow it. */
  setWind(dirX: number, dirZ: number, speed: number): void {
    const l = Math.hypot(dirX, dirZ);
    if (l < 1e-6 || speed < 0.01) return;
    const wx = dirX / l, wz = dirZ / l;
    if (wx === this.windX && wz === this.windZ && speed === this.windSpeed) return;
    this.windX = wx; this.windZ = wz; this.windSpeed = speed;
    this.waves.setWind(wx, wz, speed);
    for (const b of this.movers.boats) b.waves.setWind(wx, wz, speed);
  }

  /** Pose a hull: heading (hx, hz) with the motion model's heave, roll (starboard down +) and pitch (bow up +). */
  private poseBoat(b: BoatInstance): void {
    const { tmpM, tmpQ, tmpP, tmpS, tmpE, movers } = this;
    const m = b.motion;
    tmpS.setScalar(b.scale);
    tmpP.set(b.x, m.heave, b.z);
    // hull axis is +x: yaw about the world up, then roll about the hull axis and pitch about its beam axis
    tmpE.set(m.roll, Math.atan2(b.hx, b.hz) - Math.PI / 2, m.pitch, 'YXZ');
    movers.setMatrixAt(b.id, tmpM.compose(tmpP, tmpQ.setFromEuler(tmpE), tmpS));
  }

  update(dt: number, time: number, night: number, wind?: THREE.Vector3): void {
    const { tmpM, tmpQ, tmpP, tmpS, tmpE, movers } = this;
    if (wind) this.setWind(wind.x, wind.z, Math.hypot(wind.x, wind.z));
    this.waveTime = time;
    const windK = clamp(this.windSpeed / 6, 0.4, 1.5);
    // boats under way
    for (const b of this.boats) {
      const len = b.routeLen;
      const L = b.spec.lwl;
      let x: number, z: number, hx: number, hz: number;
      // a planing hull comes off the plane for the turn at a route end and runs back up to its cruise afterwards
      const target = b.turn ? b.cruise * (b.spec.planing ? 0.5 : 0.8) : b.cruise;
      const accel = b.spec.planing ? 1.2 : b.spec.len > 40 ? 0.08 : 0.35;
      b.speed += clamp(target - b.speed, -accel * dt, accel * dt);
      if (b.turn) {
        const T = b.turn;
        T.a += T.sign * (b.speed / T.r) * dt;
        x = T.cx + T.r * Math.cos(T.a); z = T.cz + T.r * Math.sin(T.a);
        hx = -Math.sin(T.a) * T.sign; hz = Math.cos(T.a) * T.sign;
        if (Math.abs(T.a - T.a0) >= Math.PI) {
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
          b.lateral *= Math.exp(-dt * b.speed / (L * 6));
          if (Math.abs(b.lateral) < 0.05) b.lateral = 0;
        }
        x = this.tmp.x + rx * b.lateral; z = this.tmp.z + rz * b.lateral;
        const mx = x - b.px, mz = z - b.pz, ml = Math.hypot(mx, mz);
        if (Number.isFinite(ml) && ml > 1e-4) { hx = mx / ml; hz = mz / ml; } else { hx = fdx; hz = fdz; }
        if ((b.dir === 1 && b.s >= len - 5) || (b.dir === -1 && b.s <= 5)) {
          // route end: swing round a semicircle (turning circle ~1.6 hull lengths, capped for ships)
          const r = clamp(L * 1.6, 10, 120);
          const side = b.phase > 50 ? 1 : -1;
          const cx = x + rx * side * r, cz = z + rz * side * r;
          const a0 = Math.atan2(z - cz, x - cx);
          // the circle is traced with the angle increasing when its tangent (-sin a, cos a) runs with the heading
          const sign = Math.sign(-Math.sin(a0) * hx + Math.cos(a0) * hz) || 1;
          b.turn = { cx, cz, r, a: a0, a0, sign };
        }
      }
      // yaw rate from the heading change (low-passed): the lean into a turn follows it
      const hdg = Math.atan2(hx, hz);
      let dh = hdg - b.hdg;
      if (dh > Math.PI) dh -= 2 * Math.PI; else if (dh < -Math.PI) dh += 2 * Math.PI;
      const rawRate = dt > 1e-4 && Number.isFinite(dh) ? clamp(dh / dt, -1.5, 1.5) : 0;
      b.yawRate += (rawRate - b.yawRate) * Math.min(1, dt * 3);
      b.hdg = hdg;
      // sails: set to leeward, heeled by the beam component of the wind
      let heel = 0;
      if (b.sailing) {
        const across = this.windX * -hz + this.windZ * hx; // wind toward starboard (from port) > 0
        b.mirror = across < 0;
        heel = 0.24 * across * windK;
      }
      b.x = x; b.z = z; b.hx = hx; b.hz = hz;
      b.motion.step(dt, x, z, hx, hz, b.waveAt, b.speed, b.yawRate, heel, b.spec.len < 20 ? 1 : 0.2, b.phase, time);
      this.poseBoat(b);
      // the wake ribbon starts at the transom and runs forward over the hull to the bow (bow wave, waterline)
      b.wake.update(x - hx * L * 0.5, z - hz * L * 0.5, hx, hz, time, true, b.speed);
      b.px = x; b.pz = z;
    }
    // berthed boats ride the water where the camera can see it move (centimetres, invisible beyond ~800 m)
    const cp = movers.camPos;
    for (const b of this.moored) {
      const near = !movers.camSeen || Math.hypot(cp.x - b.x, cp.z - b.z, cp.y) < 800;
      if (!near) continue;
      b.motion.step(dt, b.x, b.z, b.hx, b.hz, b.waveAt, 0, 0, 0, 1, b.phase, time);
      this.poseBoat(b);
    }
    this.boatMat.emissiveIntensity = 4 * night;
    tmpS.set(1, 1, 1);
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
