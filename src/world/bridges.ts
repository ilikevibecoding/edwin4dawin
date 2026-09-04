import * as THREE from 'three';
import type { BridgeSpec, Vec2, WorldMap } from './map';
import { clamp, lerp, smoothstep } from '../core/noise';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { ViewCull, layerMask, type CasterClass } from './culling';

export interface BridgeRoute {
  id: string;
  /** 3D centreline points at ~20 m spacing (x, y deck top, z) */
  pts: THREE.Vector3[];
  width: number;
  lanes: number;
  traffic: number;
}

function polylineLength(pts: Vec2[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}

function pointAt(pts: Vec2[], s: number): { x: number; z: number; dx: number; dz: number } {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + l || i === pts.length - 2) {
      const t = clamp((s - acc) / l, 0, 1);
      const dx = (pts[i + 1][0] - pts[i][0]) / l, dz = (pts[i + 1][1] - pts[i][1]) / l;
      return { x: pts[i][0] + dx * l * t, z: pts[i][1] + dz * l * t, dx, dz };
    }
    acc += l;
  }
  return { x: pts[0][0], z: pts[0][1], dx: 1, dz: 0 };
}

export function deckHeightProfile(spec: BridgeSpec, map: WorldMap, s: number, total: number): number {
  const rampLen = Math.min(160, total * 0.25);
  const hA = map.heightAt(spec.pts[0][0], spec.pts[0][1]), hB = map.heightAt(spec.pts[spec.pts.length - 1][0], spec.pts[spec.pts.length - 1][1]);
  const upA = smoothstep(0, rampLen, s), upB = smoothstep(0, rampLen, total - s);
  let h = lerp(Math.max(hA, 0.5) + 0.3, spec.deck, upA);
  h = Math.min(h, lerp(Math.max(hB, 0.5) + 0.3, spec.deck, upB));
  if (spec.archHeight > 0) {
    const centre = spec.archT * total;
    const d = Math.abs(s - centre) / (spec.archLength * 0.5);
    if (d < 1) {
      const bump = 0.5 + 0.5 * Math.cos(d * Math.PI);
      h += (spec.archHeight - spec.deck) * bump;
    }
  }
  return h;
}

export interface BridgeBuild {
  group: THREE.Group;
  routes: BridgeRoute[];
  /** carriageway ribbons: `aRoadUv` (across -1..1, metres along) and `aRoadInfo` (lanes, width, median half-width) */
  deckGeometry: THREE.BufferGeometry;
  lampPositions: THREE.Vector3[];
}

// ------------------------------------------------------------------ constants

/** target chunk length along a bridge (m); every chunk gets its own meshes and bounds so the view and the
 *  shadow cascades only draw the stretches they can see */
const CHUNK_LEN = 1000;
/** chunks farther than this stop casting (the city tiles use the same range) */
const SHADOW_DISTANCE = 3200;
/** beyond this the railings / posts / cables are under a pixel wide and only the lamp heads stay drawn */
const THIN_DISTANCE = 2500;
/** peak radiance of the lamp heads (props' street lamps glow at 8 x night) */
const LAMP_GLOW = 6.0;
/** girder depth below the deck top (m), parapet height above it, kerb step of the shoulders */
const GIRDER_DEPTH = 2.4;
const PARAPET_H = 1.05;
const KERB = 0.15;
const STEP = 10;

// ------------------------------------------------------------------ materials

/** Pavement shading for the carriageway (vertices with `aRoadInfo.x` = lanes > 0); everything else in the same mesh
 *  is plain concrete tinted by its vertex colour with a little run-off weathering. */
const CONCRETE_FRAG = /* glsl */ `
{
  if (vRoadInfo.x > 0.5) {
    float lanes = vRoadInfo.x;
    float width = vRoadInfo.y;
    float median = vRoadInfo.z;
    float xm = vRoadUv.x * width * 0.5;
    float along = vRoadUv.y;
    float n = fbm3(vWorldPosR.xz * 0.11);
    float n2 = vnoise(vWorldPosR.xz * 2.3);
    // sun-bleached concrete pavement, a shade darker than the shoulders so the white lines and the kerbs read
    float onShoulder = step(width * 0.5 + 0.005, abs(xm));
    vec3 conc = mix(vec3(0.46, 0.46, 0.44), vec3(0.58, 0.57, 0.54), n) * (0.94 + 0.12 * n2);
    vec3 shoulder = mix(vec3(0.66, 0.66, 0.63), vec3(0.78, 0.77, 0.74), n) * (0.96 + 0.08 * n2);
    // transverse pavement joints every 6 m, faint longitudinal joints at the lane edges
    float laneW = width / max(lanes, 1.0);
    float u = xm + width * 0.5;
    float k = floor(u / laneW);
    float lp = u - k * laneW;
    float edgeDist = min(lp, laneW - lp);
    float joint = smoothstep(0.10, 0.03, abs(fract(along / 6.0) - 0.5) * 6.0);
    conc *= 1.0 - 0.20 * joint - 0.08 * smoothstep(0.08, 0.02, edgeDist);
    // tyre paths and weathering patches
    float wheel = exp(-pow((abs(lp - laneW * 0.5) - laneW * 0.28) * 3.0, 2.0));
    conc *= 1.0 - 0.10 * wheel;
    conc *= 1.0 - 0.12 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.03 + 8.0));
    shoulder *= 1.0 - 0.15 * joint - 0.1 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.03 + 8.0));
    conc = mix(conc, shoulder, onShoulder);
    // markings sized to read from a 45 m chase camera: 30 cm white edge lines, 30 cm lane dashes (3 m on / 6 m off),
    // yellow centre: dashed on two-lane decks, a double line on four lanes, lines beside the barrier on six
    float laneEdge = smoothstep(0.30, 0.14, edgeDist) * step(0.5, k) * step(k, lanes - 1.5) * step(0.6, abs(xm));
    float dashes = laneEdge * step(fract(along / 9.0), 0.34);
    float edgeLine = smoothstep(0.32, 0.16, abs(abs(xm) - (width * 0.5 - 0.45)));
    float centre = 0.0;
    if (lanes < 3.5) centre = smoothstep(0.2, 0.08, abs(xm)) * step(fract(along / 9.0), 0.45);
    else if (median > 0.0) centre = smoothstep(0.22, 0.09, abs(abs(xm) - (median + 0.45)));
    else centre = smoothstep(0.2, 0.08, abs(abs(xm) - 0.26));
    diffuseColor.rgb = mix(conc, vec3(0.92), max(edgeLine, dashes) * 0.92);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.66, 0.14), centre * 0.94);
    roughnessFactor = 0.82;
  } else {
    // run-off streaks down the faces and a little grime
    float streak = fbm3(vec2(vWorldPosR.x + vWorldPosR.z, vWorldPosR.y * 0.25) * 0.7);
    diffuseColor.rgb *= 0.93 + 0.12 * streak;
  }
}
`;

/** The bridge concrete: pavement + structure in one material so a chunk of causeway is a single draw call. The
 *  material is derived from the shared bridge concrete game.ts registered with the CSM (defines + compile hook)
 *  and it is that material's only consumer, so the CSM keeps its uniforms current. */
function createConcreteMaterial(concrete: THREE.Material): THREE.MeshStandardMaterial {
  const src = concrete as THREE.MeshStandardMaterial;
  const mat = new THREE.MeshStandardMaterial({ color: src.color.clone(), roughness: src.roughness, metalness: 0.0, vertexColors: true });
  if (src.defines) mat.defines = { ...src.defines };
  mat.onBeforeCompile = (shader, renderer) => {
    src.onBeforeCompile.call(src, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;\n${GLSL_NOISE}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${CONCRETE_FRAG}`);
  };
  mat.customProgramCacheKey = () => 'bridge-concrete-v2';
  return mat;
}

/** Bridge steel (railings, cables, lamp posts, arches): vertex-coloured, with a per-vertex `aGlow` mask that turns the
 *  lamp heads into emitters; `emissiveIntensity` follows the key light (dusk and night) in BridgeCuller.update. */
function createSteelMaterial(steel: THREE.Material): THREE.MeshStandardMaterial {
  const src = steel as THREE.MeshStandardMaterial;
  const mat = new THREE.MeshStandardMaterial({ color: src.color.clone(), roughness: src.roughness, metalness: src.metalness, vertexColors: true, emissive: new THREE.Color(1.0, 0.8, 0.52), emissiveIntensity: 0 });
  if (src.defines) mat.defines = { ...src.defines };
  mat.onBeforeCompile = (shader, renderer) => {
    src.onBeforeCompile.call(src, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow; varying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vGlow;');
  };
  mat.customProgramCacheKey = () => 'bridge-steel-v1';
  return mat;
}

// ------------------------------------------------------------------ geometry accumulation

/** A centreline sample: position of the deck top, unit `right` (across) and forward direction. */
interface Frame { x: number; y: number; z: number; rx: number; rz: number; dx: number; dz: number; s: number; }

type Rgb = readonly [number, number, number];
const WHITE: Rgb = [1, 1, 1];

/** World-space indexed triangle soup with flat normals, a vertex colour and `extraSize` extra floats per vertex
 *  (aRoadUv + aRoadInfo for the concrete, aGlow for the steel). Baked once; one mesh per chunk. */
class Soup {
  readonly pos: number[] = [];
  readonly nrm: number[] = [];
  readonly col: number[] = [];
  readonly extra: number[] = [];
  readonly idx: number[] = [];
  readonly bounds = new THREE.Box3();
  constructor(readonly extraSize: number) {}

  get vertexCount(): number { return this.pos.length / 3; }
  get triangleCount(): number { return this.idx.length / 3; }

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, c: Rgb, extra?: readonly number[]): number {
    this.pos.push(x, y, z);
    this.nrm.push(nx, ny, nz);
    this.col.push(c[0], c[1], c[2]);
    if (this.extraSize) { if (extra) for (let i = 0; i < this.extraSize; i++) this.extra.push(extra[i]); else for (let i = 0; i < this.extraSize; i++) this.extra.push(0); }
    const bb = this.bounds;
    if (x < bb.min.x) bb.min.x = x; if (x > bb.max.x) bb.max.x = x;
    if (y < bb.min.y) bb.min.y = y; if (y > bb.max.y) bb.max.y = y;
    if (z < bb.min.z) bb.min.z = z; if (z > bb.max.z) bb.max.z = z;
    return this.vertexCount - 1;
  }

  /** Appends another soup (same extra layout). */
  append(o: Soup): void {
    const base = this.vertexCount;
    for (const v of o.pos) this.pos.push(v);
    for (const v of o.nrm) this.nrm.push(v);
    for (const v of o.col) this.col.push(v);
    for (const v of o.extra) this.extra.push(v);
    for (const i of o.idx) this.idx.push(i + base);
    this.bounds.union(o.bounds);
  }

  /** Bakes an indexed or plain geometry (positions + normals) with one colour. */
  addGeometry(g: THREE.BufferGeometry, c: Rgb, extra?: readonly number[]): void {
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const base = this.vertexCount;
    for (let i = 0; i < p.count; i++) this.vertex(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i), c, extra);
    const ind = g.getIndex();
    if (ind) for (let i = 0; i < ind.count; i++) this.idx.push(base + ind.getX(i));
    else for (let i = 0; i < p.count; i++) this.idx.push(base + i);
  }

  /** Box: x across, z along, y from `yBottom` up `h`, yawed about Y (then pitched about its own X). `sidesOnly`
   *  drops the top and bottom faces (posts, rails and cables never show them). */
  box(x: number, yBottom: number, z: number, w: number, h: number, d: number, yaw: number, pitch: number, c: Rgb, sidesOnly = false, extra?: readonly number[]): void {
    if (h <= 0.005) return;
    _q.setFromEuler(_e.set(pitch, yaw, 0, 'YXZ'));
    _m.compose(_p.set(x, yBottom + h / 2, z), _q, _s.set(w, h, d));
    for (const f of BOX_FACES) {
      if (sidesOnly && f.n[1] !== 0) continue;
      _n.set(f.n[0], f.n[1], f.n[2]).applyQuaternion(_q);
      const base = this.vertexCount;
      for (const v of f.v) {
        _p.set(v[0], v[1], v[2]).applyMatrix4(_m);
        this.vertex(_p.x, _p.y, _p.z, _n.x, _n.y, _n.z, c, extra);
      }
      this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  /** Vertical cylinder (smooth sides, optional top cap). */
  cylinder(x: number, yBottom: number, z: number, dia: number, h: number, segments: number, c: Rgb, cap = true, extra?: readonly number[]): void {
    if (h <= 0.005) return;
    const r = dia / 2;
    const base = this.vertexCount;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const nx = Math.cos(a), nz = Math.sin(a);
      this.vertex(x + nx * r, yBottom, z + nz * r, nx, 0, nz, c, extra);
      this.vertex(x + nx * r, yBottom + h, z + nz * r, nx, 0, nz, c, extra);
    }
    for (let i = 0; i < segments; i++) {
      const v0 = base + i * 2, v1 = v0 + 1, v2 = v0 + 2, v3 = v0 + 3;
      this.idx.push(v0, v1, v2, v1, v3, v2);
    }
    if (cap) {
      const centre = this.vertex(x, yBottom + h, z, 0, 1, 0, c, extra);
      const ring = this.vertexCount;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        this.vertex(x + Math.cos(a) * r, yBottom + h, z + Math.sin(a) * r, 0, 1, 0, c, extra);
      }
      for (let i = 0; i < segments; i++) this.idx.push(centre, ring + i + 1, ring + i);
    }
  }

  /** Flat horizontal polygon (n-gon) at height y facing up: the foam wash around a footing. */
  disc(x: number, y: number, z: number, rx: number, rz: number, segments: number, c: Rgb, extra?: readonly number[]): void {
    const centre = this.vertex(x, y, z, 0, 1, 0, c, extra);
    const ring = this.vertexCount;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      this.vertex(x + Math.cos(a) * rx, y, z + Math.sin(a) * rz, 0, 1, 0, c, extra);
    }
    for (let i = 0; i < segments; i++) this.idx.push(centre, ring + i + 1, ring + i);
  }

  /** Sweeps an open 2D profile (across, up) along the frames. The profile must run counter-clockwise around the
   *  section (left top -> down the left face -> along the bottom -> up the right face) so outward normals are
   *  the right-hand perpendicular of each edge. Every edge becomes its own strip so creases stay sharp;
   *  `colors[i]` tints edge i. */
  loft(frames: Frame[], profile: readonly (readonly [number, number])[], colors: readonly Rgb[] | Rgb, extra?: readonly number[]): void {
    for (let i = 0; i < profile.length - 1; i++) {
      const [a0, y0] = profile[i], [a1, y1] = profile[i + 1];
      const ex = a1 - a0, ey = y1 - y0;
      const el = Math.hypot(ex, ey) || 1;
      const n2x = ey / el, n2y = -ex / el; // outward normal for a CCW profile
      const c: Rgb = Array.isArray(colors[0]) ? (colors as readonly Rgb[])[Math.min(i, colors.length - 1)] : (colors as Rgb);
      const base = this.vertexCount;
      for (const f of frames) {
        const nx = f.rx * n2x, ny = n2y, nz = f.rz * n2x;
        this.vertex(f.x + f.rx * a0, f.y + y0, f.z + f.rz * a0, nx, ny, nz, c, extra);
        this.vertex(f.x + f.rx * a1, f.y + y1, f.z + f.rz * a1, nx, ny, nz, c, extra);
      }
      // winding: test the first quad against the desired normal and keep the orientation for the whole strip
      let flip = false;
      if (frames.length > 1) {
        _a.fromArray(this.pos, base * 3); _b.fromArray(this.pos, (base + 1) * 3); _c.fromArray(this.pos, (base + 3) * 3);
        _n.subVectors(_b, _a).cross(_c.sub(_a));
        _p.fromArray(this.nrm, base * 3);
        flip = _n.dot(_p) < 0;
      }
      for (let k = 1; k < frames.length; k++) {
        const v0 = base + (k - 1) * 2, v1 = v0 + 1, v3 = base + k * 2, v2 = v3 + 1;
        if (flip) this.idx.push(v0, v2, v1, v0, v3, v2);
        else this.idx.push(v0, v1, v2, v0, v2, v3);
      }
    }
  }

  /** Cable / hanger between two points: a 6-sided prism without caps. */
  strut(a: THREE.Vector3, b: THREE.Vector3, r: number, c: Rgb, extra?: readonly number[]): void {
    _d.subVectors(b, a);
    const len = _d.length();
    if (len < 0.1) return;
    _d.divideScalar(len);
    _q.setFromUnitVectors(_up, _d);
    const base = this.vertexCount;
    for (let i = 0; i <= 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      _n.set(Math.cos(ang), 0, Math.sin(ang)).applyQuaternion(_q);
      this.vertex(a.x + _n.x * r, a.y + _n.y * r, a.z + _n.z * r, _n.x, _n.y, _n.z, c, extra);
      this.vertex(b.x + _n.x * r, b.y + _n.y * r, b.z + _n.z * r, _n.x, _n.y, _n.z, c, extra);
    }
    for (let i = 0; i < 6; i++) {
      const v0 = base + i * 2, v1 = v0 + 1, v2 = v0 + 2, v3 = v0 + 3;
      this.idx.push(v0, v1, v2, v1, v3, v2);
    }
  }

  build(extraNames: readonly (readonly [string, number])[]): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.vertexCount * 2), 2));
    let off = 0;
    for (const [name, size] of extraNames) {
      const arr = new Float32Array(this.vertexCount * size);
      for (let v = 0; v < this.vertexCount; v++) for (let k = 0; k < size; k++) arr[v * size + k] = this.extra[v * this.extraSize + off + k];
      g.setAttribute(name, new THREE.BufferAttribute(arr, size));
      off += size;
    }
    g.setIndex(this.vertexCount > 65535 ? new THREE.BufferAttribute(new Uint32Array(this.idx), 1) : new THREE.BufferAttribute(new Uint16Array(this.idx), 1));
    g.boundingBox = this.bounds.clone();
    g.boundingSphere = this.bounds.getBoundingSphere(new THREE.Sphere());
    return g;
  }
}

const BOX_FACES: { n: [number, number, number]; v: [number, number, number][] }[] = [
  { n: [1, 0, 0], v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  { n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, 1, 0], v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, -1, 0], v: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  { n: [0, 0, 1], v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Vector3(), _d = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ per-frame culling

/** One mesh of a chunk with its own world bounds: the deck box stops at the parapets, the railing box at the lamp
 *  heads and the pylons / cables have their own, so looking up from the deck draws none of them. */
interface ChunkMesh { mesh: THREE.Mesh; cls: CasterClass; box: THREE.Box3; height: number; inView: boolean; cast: boolean; }
interface Chunk {
  meshes: ChunkMesh[];
  /** the thin steel mesh and the index count of its lamp-head prefix (drawn alone beyond THIN_DISTANCE) */
  steel: THREE.Mesh | null;
  headIndices: number;
  center: THREE.Vector3; r: number;
  /** horizontal distance from the nearest camera to the chunk's sphere (this frame) */
  dist: number;
}

/**
 * Per-frame visibility of the bridge chunks, following the city tiles: a mesh is drawn when its box is in
 * view and casts when its chunk is within the shadow distance and its footprint, swept along the sun's shadow,
 * can reach anything in view; meshes that only cast leave the camera layer, thin steel casts into the nearest
 * cascade only. The group is not driven by game.ts, so it runs from the group's `updateMatrixWorld` (called
 * by the renderer before its shadow and main passes) with the camera the chunk meshes saw last frame and
 * the sun taken from the scene's shadow-casting directional light, which also dims / lights the lamps.
 */
class BridgeCuller {
  readonly chunks: Chunk[] = [];
  private sun: THREE.DirectionalLight | null = null;
  private readonly cull = new ViewCull();
  private readonly sunDir = new THREE.Vector3(0, 1, 0);
  /** cameras that drew a chunk since the last update (more than one when a reflection pass renders the scene
   *  too); visibility is the union over them so no pass ever misses a chunk */
  private readonly seen = new Set<THREE.PerspectiveCamera>();
  private cameras: THREE.PerspectiveCamera[] = [];

  constructor(private readonly steel: THREE.MeshStandardMaterial) {}

  observe(camera: THREE.Camera): void {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) this.seen.add(camera as THREE.PerspectiveCamera);
  }

  update(scene: THREE.Object3D | null): void {
    if (!this.sun && scene) this.sun = (scene.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight && o.castShadow) as THREE.DirectionalLight | undefined) ?? null;
    let keyIntensity = 10;
    if (this.sun) {
      this.sunDir.subVectors(this.sun.position, this.sun.target.position);
      if (this.sunDir.lengthSq() > 1e-6) this.sunDir.normalize(); else this.sunDir.set(0, 1, 0);
      keyIntensity = this.sun.intensity;
    }
    // lamps: on through dusk (sun under ~10 deg) and whenever the key light is the moon
    const elevation = (Math.asin(clamp(this.sunDir.y, -1, 1)) * 180) / Math.PI;
    const glow = Math.max(1 - smoothstep(2, 10, elevation), 1 - smoothstep(0.15, 0.6, keyIntensity));
    this.steel.emissiveIntensity = LAMP_GLOW * glow;

    if (this.seen.size) { this.cameras = [...this.seen]; this.seen.clear(); }
    if (!this.cameras.length) return; // until a chunk has been drawn the renderer's frustum test alone applies
    for (const c of this.chunks) { c.dist = Infinity; for (const m of c.meshes) { m.inView = false; m.cast = false; } }
    for (const cam of this.cameras) {
      const camX = cam.position.x, camZ = cam.position.z;
      // shadow range: the game grows the CSM far plane with altitude (see game.ts); a superset is safe here
      this.cull.update(cam, clamp(cam.position.y * 9, 5000, 12000), this.sunDir);
      for (const c of this.chunks) {
        const d = Math.max(0, Math.hypot(c.center.x - camX, c.center.z - camZ) - c.r);
        c.dist = Math.min(c.dist, d);
        for (const m of c.meshes) {
          if (!m.inView && this.cull.boxInView(m.box)) m.inView = true;
          if (!m.cast && d < SHADOW_DISTANCE && this.casterInView(m)) m.cast = true;
        }
      }
    }
    for (const c of this.chunks) {
      for (const m of c.meshes) {
        m.mesh.castShadow = m.cast;
        m.mesh.visible = m.inView || m.cast;
        m.mesh.layers.mask = layerMask(m.cls, m.inView);
      }
      if (c.steel) c.steel.geometry.setDrawRange(0, c.dist > THIN_DISTANCE ? c.headIndices : Infinity);
    }
  }

  /** ViewCull's sphere test is far too loose for a 1 km sliver of causeway (the sphere is 500 m tall): sweep the
   *  mesh's box along the shadow direction instead and test that against the shadow-range frustum. */
  private casterInView(m: ChunkMesh): boolean {
    const len = m.height * this.cull.spread;
    const sd = this.cull.shadowDir;
    _swept.copy(m.box);
    if (sd.x > 0) _swept.max.x += sd.x * len; else _swept.min.x += sd.x * len;
    if (sd.z > 0) _swept.max.z += sd.z * len; else _swept.min.z += sd.z * len;
    return this.cull.shadowFrustum.intersectsBox(_swept);
  }
}
const _swept = new THREE.Box3();

class BridgeGroup extends THREE.Group {
  constructor(readonly culler: BridgeCuller) { super(); }
  override updateMatrixWorld(force?: boolean): void {
    this.culler.update(this.parent);
    super.updateMatrixWorld(force);
  }
}

// ------------------------------------------------------------------ build

/** Concrete tints (multiply the shared concrete colour). */
const C_PLAIN: Rgb = [1, 1, 1];
const C_CAP: Rgb = [1.08, 1.08, 1.07];       // parapet cap: pale, catches the low sun
const C_SOFFIT: Rgb = [0.86, 0.86, 0.86];
const C_UNDER: Rgb = [0.78, 0.78, 0.79];
const C_WET: Rgb = [0.5, 0.5, 0.52];         // tidal band on the columns
const C_FOOTING: Rgb = [0.74, 0.75, 0.76];
const C_FOAM: Rgb = [1.85, 1.9, 1.92];       // wash around the footings (albedo ~0.9)
const C_DECK: Rgb = [1, 1, 1];
/** Steel tints. */
const S_PLAIN: Rgb = [1, 1, 1];
const S_DARK: Rgb = [0.3, 0.3, 0.32];        // expansion joints
const S_HEAD: Rgb = [0.92, 0.9, 0.84];       // lamp luminaires

/** `_roadMaterial` is kept in the signature for game.ts; the carriageway uses its own pale pavement shading so the
 *  causeways read as light concrete against the water instead of asphalt. */
export function buildBridges(map: WorldMap, _roadMaterial: THREE.Material, concrete: THREE.Material, steel: THREE.Material): BridgeBuild {
  const concreteMat = createConcreteMaterial(concrete);
  const steelMat = createSteelMaterial(steel);
  const culler = new BridgeCuller(steelMat);
  const group = new BridgeGroup(culler);
  const routes: BridgeRoute[] = [];
  const allDecks = new Soup(5);
  const NO_ROAD = [0, 0, 0, 0, 0];

  const g = GIRDER_DEPTH, ph = PARAPET_H;

  for (const spec of map.bridges) {
    const total = polylineLength(spec.pts);
    const W = spec.width, hw = W * 0.5;
    // the carriageway is narrower than the deck: pale concrete shoulders flank it
    const cw = clamp(spec.lanes * 3.3, 8, W - 4), chw = cw * 0.5;
    const frameAt = (s: number): Frame => {
      const p = pointAt(spec.pts, s);
      return { x: p.x, y: deckHeightProfile(spec, map, s, total), z: p.z, rx: -p.dz, rz: p.dx, dx: p.dx, dz: p.dz, s };
    };
    const yawAt = (f: Frame) => Math.atan2(f.dx, f.dz);

    // main span type: cable-stayed for the tall channel spans, a tied steel arch for the lower ones
    const cableStayed = spec.archHeight >= 20 && spec.archLength >= 350;
    const tiedArch = !cableStayed && spec.archHeight > 0 && spec.archLength >= 300;
    const centre = spec.archT * total;
    const mainSpan = cableStayed ? Math.min(spec.archLength * 0.5, 300) : tiedArch ? spec.archLength * 0.8 : 0;
    const spanA = centre - mainSpan / 2, spanB = centre + mainSpan / 2;

    // ------------------------------------------------------------ chunks along the bridge
    const nChunks = Math.max(1, Math.round(total / CHUNK_LEN));
    const chunkLen = total / nChunks;
    const chunkOf = (s: number) => Math.min(nChunks - 1, Math.max(0, Math.floor(s / chunkLen)));
    // struct + deck: concrete; steel + heads: thin steel (railings, lamps); tall: pylons (concrete); arch: arch ribs
    // or stay cables (steel). Tall structure gets its own meshes so the low chunks keep low bounding boxes.
    const parts = Array.from({ length: nChunks }, () => ({ struct: new Soup(5), deck: new Soup(5), steel: new Soup(1), heads: new Soup(1), tall: new Soup(5), arch: new Soup(1) }));

    // traffic centreline (deck top) at 20 m spacing
    const n = Math.ceil(total / STEP);
    const pts3: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i += 2) { const f = frameAt(Math.min(total, i * STEP)); pts3.push(new THREE.Vector3(f.x, f.y, f.z)); }
    if ((n & 1) === 1) { const f = frameAt(total); pts3.push(new THREE.Vector3(f.x, f.y, f.z)); }
    routes.push({ id: spec.id, pts: pts3, width: spec.width, lanes: spec.lanes, traffic: spec.traffic });

    const medianHalf = spec.lanes >= 6 ? 0.3 : 0;
    const roadInfo = [0, 0, spec.lanes, cw, medianHalf];

    for (let k = 0; k < nChunks; k++) {
      const s0 = k * chunkLen, s1 = Math.min(total, (k + 1) * chunkLen);
      const frames: Frame[] = [frameAt(s0)];
      for (let s = (Math.floor(s0 / STEP) + 1) * STEP; s < s1 - 0.01; s += STEP) frames.push(frameAt(s));
      frames.push(frameAt(s1));
      const P = parts[k];

      // -------------------------------------------------------- deck top: shoulders, kerbs and carriageway
      // one ribbon of 5 strips per segment (shoulder / kerb face / carriageway / kerb face / shoulder); six-lane
      // causeways get a concrete median barrier, narrower decks a painted centre line
      const section: [number, number, number][] = [
        [-hw, KERB, 0], [-chw, KERB, 0],
        [-chw, KERB, 1], [-chw, 0.02, 1],
        [-chw, 0.02, 0], [chw, 0.02, 0],
        [chw, 0.02, -1], [chw, KERB, -1],
        [chw, KERB, 0], [hw, KERB, 0],
      ];
      const SV = section.length;
      const deckBase = P.deck.vertexCount;
      frames.forEach((f, i) => {
        for (const [a, yv, nk] of section) {
          roadInfo[0] = a / chw; roadInfo[1] = f.s;
          if (nk === 0) P.deck.vertex(f.x + f.rx * a, f.y + yv, f.z + f.rz * a, 0, 1, 0, C_DECK, roadInfo);
          else P.deck.vertex(f.x + f.rx * a, f.y + yv, f.z + f.rz * a, f.rx * nk, 0, f.rz * nk, C_DECK, roadInfo);
        }
        if (i > 0) {
          const p = deckBase + (i - 1) * SV, c = deckBase + i * SV;
          for (let j = 0; j < SV; j += 2) P.deck.idx.push(p + j, p + j + 1, c + j, c + j, p + j + 1, c + j + 1);
        }
      });

      // -------------------------------------------------------- girder + parapets (one loft, chamfered caps)
      const profile: [number, number][] = [
        [-hw, KERB],                                        // shoulder edge
        [-hw - 0.10, ph - 0.24], [-hw - 0.24, ph],          // inner face, inner chamfer
        [-hw - 0.42, ph], [-hw - 0.56, ph - 0.24],          // cap top, outer chamfer
        [-hw - 0.56, -0.4], [-hw - 0.24, -1.05],            // fascia and drip edge
        [-W * 0.31, -g], [W * 0.31, -g],                    // web and bottom flange
        [hw + 0.24, -1.05], [hw + 0.56, -0.4],
        [hw + 0.56, ph - 0.24], [hw + 0.42, ph],
        [hw + 0.24, ph], [hw + 0.10, ph - 0.24], [hw, KERB],
      ];
      const profileColors: Rgb[] = [C_PLAIN, C_CAP, C_CAP, C_CAP, C_PLAIN, C_SOFFIT, C_UNDER, C_UNDER, C_UNDER, C_SOFFIT, C_PLAIN, C_CAP, C_CAP, C_CAP, C_PLAIN];
      P.struct.loft(frames, profile, profileColors, NO_ROAD);
      if (medianHalf > 0) {
        const m = medianHalf;
        P.struct.loft(frames, [[m, 0.02], [m, 0.3], [m * 0.4, 0.9], [-m * 0.4, 0.9], [-m, 0.3], [-m, 0.02]], [C_PLAIN, C_PLAIN, C_CAP, C_PLAIN, C_PLAIN], NO_ROAD);
      }

      // -------------------------------------------------------- approach embankments / abutments
      for (let i = 0; i < frames.length - 1; i++) {
        const f = frames[i];
        const ground = map.heightAt(f.x, f.z);
        if (ground < 0.3) continue;
        const bottom = ground - 0.8, top = f.y - g + 0.15;
        if (top - bottom < 0.3 || f.y - ground > 16) continue;
        P.struct.box(f.x, bottom, f.z, W + 0.8, top - bottom, frames[i + 1].s - f.s + 0.4, yawAt(f), 0, C_PLAIN, false, NO_ROAD);
      }

      // -------------------------------------------------------- railing on the parapets: posts every 4 m, two rails
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1], b = frames[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        const yaw = Math.atan2(b.x - a.x, b.z - a.z);
        const pitch = -Math.asin(clamp((b.y - a.y) / len, -1, 1));
        for (const side of [-1, 1]) {
          const mx = (a.x + b.x) / 2 + ((a.rx + b.rx) / 2) * (hw + 0.33) * side;
          const mz = (a.z + b.z) / 2 + ((a.rz + b.rz) / 2) * (hw + 0.33) * side;
          P.steel.box(mx, (a.y + b.y) / 2 + ph + 0.86, mz, 0.08, 0.08, len + 0.1, yaw, pitch, S_PLAIN, true);
          P.steel.box(mx, (a.y + b.y) / 2 + ph + 0.44, mz, 0.06, 0.06, len + 0.1, yaw, pitch, S_PLAIN, true);
        }
      }
      for (let s = Math.ceil(s0 / 4) * 4; s < s1; s += 4) {
        const f = frameAt(s);
        const yaw = yawAt(f);
        for (const side of [-1, 1]) P.steel.box(f.x + f.rx * (hw + 0.33) * side, f.y + ph, f.z + f.rz * (hw + 0.33) * side, 0.12, 0.9, 0.12, yaw, 0, S_PLAIN, true);
      }
      // lamp posts on the parapet caps, alternating sides every 45 m: pole, arm over the shoulder, glowing luminaire
      for (let ls = 22, j = 0; ls < total - 20; ls += 45, j++) {
        if (chunkOf(ls) !== k) continue;
        const f = frameAt(ls);
        const side = j % 2 === 0 ? -1 : 1;
        const yaw = yawAt(f);
        const bx = f.x + f.rx * (hw + 0.33) * side, bz = f.z + f.rz * (hw + 0.33) * side;
        P.steel.cylinder(bx, f.y + ph, bz, 0.2, 9.0, 6, S_PLAIN, false);
        const ax = f.x + f.rx * (hw + 0.33 - 1.25) * side, az = f.z + f.rz * (hw + 0.33 - 1.25) * side;
        P.steel.box(ax, f.y + ph + 8.85, az, 2.5, 0.16, 0.16, yaw, 0, S_PLAIN, true);
        const hx = f.x + f.rx * (hw + 0.33 - 2.35) * side, hz = f.z + f.rz * (hw + 0.33 - 2.35) * side;
        P.heads.box(hx, f.y + ph + 8.62, hz, 0.8, 0.26, 0.5, yaw, 0, S_HEAD, false, [1]);
      }
    }

    // ------------------------------------------------------------ piers (hammerhead wall piers on the wide causeways, twin columns elsewhere)
    const spacing = W >= 20 ? 50 : 42;
    const pierS: number[] = [];
    for (let s = spacing * 0.5; s < total - spacing * 0.3; s += spacing) {
      if (mainSpan > 0 && s > spanA - 12 && s < spanB + 12) continue;
      pierS.push(s);
    }
    if (tiedArch) pierS.push(spanA, spanB);
    for (const s of pierS) {
      const f = frameAt(s);
      const ground = map.heightAt(f.x, f.z);
      if (f.y - ground < 2.8) continue;
      const P = parts[chunkOf(s)];
      const yaw = yawAt(f);
      const capTop = f.y - g;
      const heavy = tiedArch && (s === spanA || s === spanB);
      const capH = heavy ? 2.4 : 2.0;
      const capBottom = capTop - capH;
      const colBottom = Math.min(ground, -0.5) - 2.5;
      const inWater = ground < 0.2;
      // hammerhead caps overhang the fascia by ~3 m so the pier line stays visible from above the deck
      const capW = W + 6.4;
      /** column or wall standing in the water: footing, tidal band, shaft */
      const shaft = (x: number, z: number, w: number, d: number, top: number, round: boolean) => {
        if (inWater) {
          P.struct.box(x, -1.0, z, w + 2.4, 1.6, d + 2.4, yaw, 0, C_FOOTING, false, NO_ROAD);
          P.struct.disc(x, 0.05, z, (w + 2.4) * 0.5 + 0.9, (d + 2.4) * 0.5 + 0.9, 12, C_FOAM, NO_ROAD);
          const wetTop = Math.min(top, 1.7);
          if (round) P.struct.cylinder(x, 0.55, z, w, wetTop - 0.55, 12, C_WET, false, NO_ROAD);
          else P.struct.box(x, 0.55, z, w, wetTop - 0.55, d, yaw, 0, C_WET, true, NO_ROAD);
          if (round) P.struct.cylinder(x, wetTop, z, w, top - wetTop, 12, C_PLAIN, false, NO_ROAD);
          else P.struct.box(x, wetTop, z, w, top - wetTop, d, yaw, 0, C_PLAIN, true, NO_ROAD);
        } else if (round) P.struct.cylinder(x, colBottom, z, w, top - colBottom, 12, C_PLAIN, false, NO_ROAD);
        else P.struct.box(x, colBottom, z, w, top - colBottom, d, yaw, 0, C_PLAIN, true, NO_ROAD);
      };
      if (W >= 20 || heavy) {
        const ww = heavy ? W * 0.7 : W * 0.5, wt = heavy ? 3.2 : 2.2;
        shaft(f.x, f.z, ww, wt, capBottom, false);
        P.struct.box(f.x, capBottom, f.z, capW, capH, wt + 1.0, yaw, 0, C_PLAIN, false, NO_ROAD);
      } else {
        for (const off of [-W * 0.3, W * 0.3]) shaft(f.x + f.rx * off, f.z + f.rz * off, 2.4, 2.4, capBottom, true);
        P.struct.box(f.x, capBottom, f.z, W + 5.6, capH, 2.6, yaw, 0, C_PLAIN, false, NO_ROAD);
      }
      // expansion joint across the carriageway over every pier
      P.steel.box(f.x, f.y + 0.03, f.z, cw, 0.04, 0.3, yaw, 0, S_DARK, false);
    }

    // ------------------------------------------------------------ main span structure
    if (cableStayed) {
      const pylonH = 0.24 * mainSpan + 10; // above the deck
      const legW = 3.2, legD = 4.8, legA = hw + 1.9;
      const nC = mainSpan >= 240 ? 9 : 7;
      const spacingC = (mainSpan / 2 - 16) / nC;
      for (const ps of [spanA, spanB]) {
        const P = parts[chunkOf(ps)];
        const f = frameAt(ps);
        const ground = map.heightAt(f.x, f.z);
        const yaw = yawAt(f);
        const colBottom = Math.min(ground, -0.5) - 3;
        for (const side of [-1, 1]) {
          const lx = f.x + f.rx * legA * side, lz = f.z + f.rz * legA * side;
          P.tall.box(lx, colBottom, lz, legW, f.y + pylonH - colBottom, legD, yaw, 0, C_PLAIN, false, NO_ROAD);
          if (ground < 0.2) {
            P.struct.box(lx, -1.2, lz, legW + 3, 1.9, legD + 3, yaw, 0, C_FOOTING, false, NO_ROAD);
            P.struct.disc(lx, 0.05, lz, (legW + 3) * 0.5 + 1.0, (legD + 3) * 0.5 + 1.0, 12, C_FOAM, NO_ROAD);
          }
        }
        P.struct.box(f.x, f.y - g - 2.2, f.z, 2 * legA + legW, 2.2, legD, yaw, 0, C_PLAIN, false, NO_ROAD);          // cross beam under the deck
        P.tall.box(f.x, f.y + pylonH - 5, f.z, 2 * legA + legW, 3.6, legD * 0.7, yaw, 0, C_PLAIN, false, NO_ROAD);   // portal beam
        for (let k = 1; k <= nC; k++) {
          for (const dirS of [-1, 1]) {
            const sa = ps + dirS * (k * spacingC + 10);
            if (sa < 4 || sa > total - 4) continue;
            const fa = frameAt(sa);
            const topY = f.y + pylonH - 3 - (nC - k) * ((0.45 * pylonH) / nC);
            for (const side of [-1, 1]) {
              const anchor = new THREE.Vector3(fa.x + fa.rx * (hw + 0.36) * side, fa.y + 1.1, fa.z + fa.rz * (hw + 0.36) * side);
              const head = new THREE.Vector3(f.x + f.rx * (legA - legW * 0.5 + 0.1) * side, topY, f.z + f.rz * (legA - legW * 0.5 + 0.1) * side);
              P.arch.strut(anchor, head, 0.11, S_PLAIN);
            }
          }
        }
      }
    } else if (tiedArch) {
      const P = parts[chunkOf(centre)];
      const rise = spec.archHeight * 0.95 + 4;
      const ribA = hw + 1.0;
      const ribs: THREE.Vector3[][] = [[], []];
      const segs = 28;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const f = frameAt(spanA + mainSpan * t);
        const y = f.y + rise * Math.sin(t * Math.PI) + 0.8;
        for (const side of [-1, 1]) {
          const p = new THREE.Vector3(f.x + f.rx * ribA * side, y, f.z + f.rz * ribA * side);
          ribs[side < 0 ? 0 : 1].push(p);
          // hangers from the rib down to the parapet
          if (i % 2 === 1 && i > 1 && i < segs - 1) P.arch.strut(new THREE.Vector3(p.x, f.y + ph + 0.2, p.z), p, 0.11, S_PLAIN);
        }
        // cross bracing between the ribs near the crown
        if (i === 8 || i === 14 || i === 20) P.arch.box(f.x, y - 0.7, f.z, 2 * ribA, 1.2, 1.2, yawAt(f), 0, S_PLAIN, false);
      }
      for (const rib of ribs) {
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib), 56, 1.15, 8, false);
        P.arch.addGeometry(tube, S_PLAIN);
        tube.dispose();
      }
    }

    // ------------------------------------------------------------ chunk meshes
    for (let k = 0; k < nChunks; k++) {
      const P = parts[k];
      allDecks.append(P.deck);
      const chunk: Chunk = { meshes: [], steel: null, headIndices: 0, center: new THREE.Vector3(), r: 0, dist: Infinity };
      const chunkBox = new THREE.Box3();
      const attach = (mesh: THREE.Mesh, cls: CasterClass) => {
        mesh.name = `${spec.id}#${k}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.onBeforeRender = (_r, _s, camera) => { culler.observe(camera); };
        const box = mesh.geometry.boundingBox!;
        chunk.meshes.push({ mesh, cls, box, height: box.max.y - box.min.y, inView: true, cast: true });
        chunkBox.union(box);
        group.add(mesh);
      };
      // concrete: structure first, then the deck ribbon; the shadow passes draw the structure only (the girder
      // outline already casts the deck's shadow)
      const structTris = P.struct.idx.length;
      P.struct.append(P.deck);
      const cMesh = new THREE.Mesh(P.struct.build([['aRoadUv', 2], ['aRoadInfo', 3]]), concreteMat);
      cMesh.onBeforeShadow = (_r, _o, camera) => { culler.observe(camera); cMesh.geometry.setDrawRange(0, structTris); };
      cMesh.onAfterShadow = () => { cMesh.geometry.setDrawRange(0, Infinity); };
      attach(cMesh, 'all');
      // thin steel: lamp heads first so the far LOD can draw them alone
      if (P.heads.idx.length || P.steel.idx.length) {
        const headIndices = P.heads.idx.length;
        P.heads.append(P.steel);
        const sMesh = new THREE.Mesh(P.heads.build([['aGlow', 1]]), steelMat);
        attach(sMesh, 'near');
        chunk.steel = sMesh;
        chunk.headIndices = headIndices;
      }
      if (P.tall.idx.length) attach(new THREE.Mesh(P.tall.build([['aRoadUv', 2], ['aRoadInfo', 3]]), concreteMat), 'all');
      if (P.arch.idx.length) attach(new THREE.Mesh(P.arch.build([['aGlow', 1]]), steelMat), cableStayed ? 'near' : 'all');
      const sphere = chunkBox.getBoundingSphere(new THREE.Sphere());
      chunk.center.copy(sphere.center); chunk.r = sphere.radius;
      culler.chunks.push(chunk);
    }
  }

  const deckGeometry = allDecks.build([['aRoadUv', 2], ['aRoadInfo', 3]]);
  // the lamps are part of the bridge steel (they need the dusk glow), so props gets none to place
  return { group, routes, deckGeometry, lampPositions: [] };
}

/** Minimal geometry merge (positions, normals, indices) for same-material static geometry. */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vtx = 0, idx = 0;
  const infos = geos.map((g) => {
    const p = g.getAttribute('position');
    const ind = g.getIndex();
    const nIdx = ind ? ind.count : p.count;
    vtx += p.count; idx += nIdx;
    return { g, p, ind, nIdx };
  });
  const pos = new Float32Array(vtx * 3), nrm = new Float32Array(vtx * 3), uv = new Float32Array(vtx * 2);
  const index = vtx > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  let vo = 0, io = 0;
  for (const { g, p, ind, nIdx } of infos) {
    pos.set(p.array as Float32Array, vo * 3);
    const n = g.getAttribute('normal');
    if (n) nrm.set(n.array as Float32Array, vo * 3);
    const u = g.getAttribute('uv');
    if (u) uv.set(u.array as Float32Array, vo * 2);
    if (ind) for (let i = 0; i < nIdx; i++) index[io + i] = ind.getX(i) + vo;
    else for (let i = 0; i < nIdx; i++) index[io + i] = i + vo;
    vo += p.count; io += nIdx;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  for (const g of geos) g.dispose();
  return out;
}
