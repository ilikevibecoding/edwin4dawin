import * as THREE from 'three';
import { LAYER_DEFAULT, LAYER_MAIN, LAYER_MIRROR, type ViewCull } from './culling';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { HALF, MAP_N, WORLD_SIZE, Zone, urbanGradient, type WorldMap } from './map';
import { smoothstep } from '../core/noise';

/**
 * Formerly a per-material white balance of the sky irradiance (the dome's IBL used to deliver ~2.5x the
 * sun's blue irradiance, so beaches rendered blue-grey). The atmosphere now balances sun and sky globally
 * (`SUN_IRRADIANCE` in atmosphere.ts, whitened environment probe in sky.ts), so this hook is a no-op kept
 * only so the callers in roads, vegetation and props keep compiling. Safe to delete along with them.
 */
export function balanceGroundIbl(_shader: { fragmentShader: string }): void {}

/** GPU textures shared by terrain, water and anything that needs to know the ground height. */
export class MapTextures {
  height: THREE.DataTexture;
  zone: THREE.DataTexture;
  /** baked hinterland detail (streets, block tone, urbanity, corridor strips), see bakeDetail */
  detail: THREE.DataTexture;
  /** lowest and highest ground height (m) */
  readonly heightMin: number;
  readonly heightMax: number;

  constructor(map: WorldMap, renderer: THREE.WebGLRenderer) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < map.height.length; i++) { const h = map.height[i]; if (h < lo) lo = h; if (h > hi) hi = h; }
    this.heightMin = lo; this.heightMax = hi;
    const floatLinear = renderer.capabilities.isWebGL2 && renderer.extensions.has('OES_texture_float_linear');
    if (floatLinear) {
      this.height = new THREE.DataTexture(map.height, MAP_N, MAP_N, THREE.RedFormat, THREE.FloatType);
    } else {
      const half = new Uint16Array(map.height.length);
      for (let i = 0; i < half.length; i++) half[i] = THREE.DataUtils.toHalfFloat(map.height[i]);
      this.height = new THREE.DataTexture(half, MAP_N, MAP_N, THREE.RedFormat, THREE.HalfFloatType);
    }
    this.height.minFilter = THREE.LinearFilter;
    this.height.magFilter = THREE.LinearFilter;
    this.height.wrapS = this.height.wrapT = THREE.ClampToEdgeWrapping;
    this.height.generateMipmaps = false;
    this.height.needsUpdate = true;

    // R = zone id, G = canopy density (veg), B = signed coast distance (128 + m/2), A = wave exposure
    const z = new Uint8Array(MAP_N * MAP_N * 4);
    for (let i = 0; i < MAP_N * MAP_N; i++) {
      z[i * 4] = map.zone[i];
      z[i * 4 + 1] = map.veg[i];
      const c = map.coast[i];
      z[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(128 + c * 0.5)));
      z[i * 4 + 3] = map.exposure[i];
    }
    this.zone = new THREE.DataTexture(z, MAP_N, MAP_N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.zone.minFilter = THREE.NearestFilter;
    this.zone.magFilter = THREE.NearestFilter;
    this.zone.wrapS = this.zone.wrapT = THREE.ClampToEdgeWrapping;
    this.zone.generateMipmaps = false;
    this.zone.needsUpdate = true;

    this.detail = new THREE.DataTexture(bakeDetail(map), MAP_N, MAP_N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.detail.minFilter = THREE.LinearFilter;
    this.detail.magFilter = THREE.LinearFilter;
    this.detail.wrapS = this.detail.wrapT = THREE.ClampToEdgeWrapping;
    this.detail.generateMipmaps = false;
    this.detail.needsUpdate = true;
  }
}

/** Baked ground detail for the hinterland shading, one texel per map cell (~10 m), linearly filtered:
 *  R = street band (1 on the carriageway of a district street, arterial or highway, fading over a verge),
 *  G = block tone (a hash constant over each street block, 0.5 where there is no grid),
 *  B = urbanity (the shared urban gradient of map.ts, 0 in the far suburbs .. 1 in the cores),
 *  A = corridor strip (1 within the commercial frontage of an arterial, fading over ~150 m).
 *  Streets and the tone come straight from the district grids the road builder uses, so the far ground
 *  carries the same lattice the road meshes draw near the camera. */
function bakeDetail(map: WorldMap): Uint8Array {
  const n = MAP_N;
  const out = new Uint8Array(n * n * 4);
  const cell = WORLD_SIZE / n;
  // urbanity and corridor distance on a coarse lattice (40 m), bilinearly upsampled: both are smooth fields
  const cn = 512, cs = WORLD_SIZE / cn;
  const cUrban = new Float32Array((cn + 1) * (cn + 1)), cStrip = new Float32Array((cn + 1) * (cn + 1));
  for (let j = 0; j <= cn; j++) for (let i = 0; i <= cn; i++) {
    const s = urbanGradient(map.districts, map.roads, -HALF + i * cs, -HALF + j * cs);
    cUrban[j * (cn + 1) + i] = s.urban;
    cStrip[j * (cn + 1) + i] = 1 - smoothstep(30, 170, s.corridor);
  }
  const coarse = (arr: Float32Array, x: number, z: number) => {
    const fx = (x + HALF) / cs, fz = (z + HALF) / cs;
    const i0 = Math.max(0, Math.min(cn - 1, Math.floor(fx))), j0 = Math.max(0, Math.min(cn - 1, Math.floor(fz)));
    const tx = fx - i0, tz = fz - j0;
    const a = arr[j0 * (cn + 1) + i0], b = arr[j0 * (cn + 1) + i0 + 1], c = arr[(j0 + 1) * (cn + 1) + i0], d = arr[(j0 + 1) * (cn + 1) + i0 + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  };
  const urbanZone = (zn: number) => zn === Zone.RES_LOW || zn === Zone.RES_MID || zn === Zone.DOWNTOWN || zn === Zone.HOTEL || zn === Zone.INDUSTRIAL || zn === Zone.PARK || zn === Zone.LOT || zn === Zone.WETLAND_FLAT;
  for (let j = 0; j < n; j++) {
    const z = -HALF + (j + 0.5) * cell;
    for (let i = 0; i < n; i++) {
      const idx = j * n + i;
      const zn = map.zone[idx];
      out[idx * 4 + 1] = 128;
      if (!urbanZone(zn)) continue;
      const x = -HALF + (i + 0.5) * cell;
      out[idx * 4 + 2] = Math.round(255 * coarse(cUrban, x, z));
      out[idx * 4 + 3] = Math.round(255 * coarse(cStrip, x, z));
    }
  }
  // nearest grid line of the block lattice: streets and per-block tone, written district by district over
  // the district's own cells (first district wins, as in the road builder)
  const lineDist = (v: number, lines: number[]): { d: number; k: number } => {
    let lo = 0, hi = lines.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lines[mid] <= v) lo = mid; else hi = mid; }
    const d0 = Math.abs(v - lines[lo]), d1 = Math.abs(lines[hi] - v);
    return { d: Math.min(d0, d1), k: lo };
  };
  const streetHalf = (zn: number) => (zn === Zone.DOWNTOWN ? 7 : zn === Zone.RES_MID || zn === Zone.HOTEL || zn === Zone.INDUSTRIAL ? 6 : 4.5);
  const hash = (a: number, b: number, c: number) => {
    let h = (a * 374761393 + b * 668265263 + c * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  map.districts.forEach((d, di) => {
    const grid = map.grids.get(d.id);
    if (!grid) return;
    const c = Math.cos(d.rot), s = Math.sin(d.rot);
    const r = Math.hypot(d.hw, d.hh) + 20;
    const i0 = Math.max(0, Math.floor((d.cx - r + HALF) / cell)), i1 = Math.min(n - 1, Math.ceil((d.cx + r + HALF) / cell));
    const j0 = Math.max(0, Math.floor((d.cz - r + HALF) / cell)), j1 = Math.min(n - 1, Math.ceil((d.cz + r + HALF) / cell));
    const hw = streetHalf(d.zone);
    for (let j = j0; j <= j1; j++) {
      const z = -HALF + (j + 0.5) * cell;
      for (let i = i0; i <= i1; i++) {
        const idx = j * n + i;
        if (map.zone[idx] !== d.zone || out[idx * 4 + 1] !== 128) continue;
        const x = -HALF + (i + 0.5) * cell;
        const dx = x - d.cx, dz = z - d.cz;
        const lx = dx * c + dz * s, lz = -dx * s + dz * c;
        if (Math.abs(lx) > d.hw || Math.abs(lz) > d.hh) continue;
        const ax = lineDist(lx, grid.xs), az = lineDist(lz, grid.zs);
        const dd = Math.min(ax.d, az.d);
        out[idx * 4] = Math.round(255 * Math.max(0, Math.min(1, 1 - (dd - hw) / 7)));
        out[idx * 4 + 1] = Math.round(1 + 253 * hash(ax.k, az.k, di + 1));
      }
    }
  });
  // arterials and highways: a wider band with a broad verge
  for (const rd of map.roads) {
    if (rd.cls !== 'highway' && rd.cls !== 'arterial' && rd.cls !== 'causeway') continue;
    const hw = rd.width * 0.5, pad = hw + 12;
    for (let k = 0; k < rd.pts.length - 1; k++) {
      const [ax, az] = rd.pts[k], [bx, bz] = rd.pts[k + 1];
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - pad + HALF) / cell)), i1 = Math.min(n - 1, Math.ceil((Math.max(ax, bx) + pad + HALF) / cell));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - pad + HALF) / cell)), j1 = Math.min(n - 1, Math.ceil((Math.max(az, bz) + pad + HALF) / cell));
      const abx = bx - ax, abz = bz - az, len2 = abx * abx + abz * abz || 1;
      for (let j = j0; j <= j1; j++) {
        const z = -HALF + (j + 0.5) * cell;
        for (let i = i0; i <= i1; i++) {
          const x = -HALF + (i + 0.5) * cell;
          const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / len2));
          const dd = Math.hypot(x - ax - abx * t, z - az - abz * t);
          const v = Math.round(255 * Math.max(0, Math.min(1, 1 - (dd - hw) / 12)));
          const idx = j * n + i;
          if (v > out[idx * 4] && map.zone[idx] !== Zone.OCEAN && map.zone[idx] !== Zone.BAY) out[idx * 4] = v;
        }
      }
    }
  }
  return out;
}

const RING_CELLS = 96; // cells across each ring (must be a multiple of 4)
const BASE_CELL = 8; // metres, finest ring
// 8m .. 2048m cells; the outermost ring spans ±(96*2048/2) = ±98km, past the 60 km far plane. With the
// ground stopping at ±24.5 km the water plane showed between the terrain edge and the horizon as an arc of
// blue dashes above the far land (skyline-high F3-H3): the plane draws wherever the clamped edge height is
// under sea level and the aerial perspective only reaches full extinction at ~57 km.
const RINGS = 9;

/** The sectors of one clipmap ring: SECTORS x SECTORS blocks of cells (the hollow middle left out), each an
 *  index range over the ring's shared vertex buffer with the box of its own vertices, so the ring is
 *  frustum-culled sector by sector instead of drawn whole around the camera. */
interface RingSector { geometry: THREE.BufferGeometry; box: THREE.Box3 }
const SECTORS = 4;

function buildRing(level: number, hollow: boolean): RingSector[] {
  const cell = BASE_CELL * 2 ** level;
  const n = RING_CELLS;
  const half = (n * cell) / 2;
  const innerStart = n / 4, innerEnd = (3 * n) / 4; // hollow region indices
  const positions: number[] = [];
  const edge: number[] = [];
  const vid = new Int32Array((n + 1) * (n + 1)).fill(-1);
  let count = 0;
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const inHollow = hollow && i > innerStart && i < innerEnd && j > innerStart && j < innerEnd;
      if (inHollow) continue;
      vid[j * (n + 1) + i] = count++;
      positions.push(-half + i * cell, 0, -half + j * cell);
      // odd vertices on the outer border must interpolate their neighbours so they match the coarser ring
      let ex = 0, ez = 0;
      const onOuter = i === 0 || i === n || j === 0 || j === n;
      if (onOuter && level < RINGS - 1) {
        if ((i === 0 || i === n) && (j & 1) === 1) ez = cell;
        else if ((j === 0 || j === n) && (i & 1) === 1) ex = cell;
      }
      edge.push(ex, ez);
    }
  }
  const position = new THREE.Float32BufferAttribute(positions, 3);
  const aEdge = new THREE.Float32BufferAttribute(edge, 2);
  // one sphere for the whole ring on every sector: the reflection pass decides per ring from this radius
  const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), half * 1.5 + 200);
  const per = n / SECTORS;
  const sectors: RingSector[] = [];
  for (let sj = 0; sj < SECTORS; sj++) {
    for (let si = 0; si < SECTORS; si++) {
      const index: number[] = [];
      const box = new THREE.Box3();
      for (let j = sj * per; j < (sj + 1) * per; j++) {
        for (let i = si * per; i < (si + 1) * per; i++) {
          const a = vid[j * (n + 1) + i], b = vid[j * (n + 1) + i + 1], c = vid[(j + 1) * (n + 1) + i], d = vid[(j + 1) * (n + 1) + i + 1];
          if (a < 0 || b < 0 || c < 0 || d < 0) continue;
          // alternate diagonal for a less regular tessellation
          if (((i + j) & 1) === 0) index.push(a, c, b, b, c, d);
          else index.push(a, d, b, a, c, d);
          for (const v of [a, b, c, d]) box.expandByPoint(_v.set(positions[v * 3], 0, positions[v * 3 + 2]));
        }
      }
      if (!index.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', position);
      g.setAttribute('aEdge', aEdge);
      g.setIndex(index);
      g.boundingSphere = sphere;
      // the border vertices sample the height field up to a cell away from their position
      box.min.x -= cell; box.min.z -= cell; box.max.x += cell; box.max.z += cell;
      sectors.push({ geometry: g, box });
    }
  }
  return sectors;
}
const _v = new THREE.Vector3();
const _box = new THREE.Box3();

export const TERRAIN_VERT_PARS = /* glsl */ `
uniform sampler2D uHeightTex;
uniform vec3 uRingOffset;
uniform float uWorldSize;
attribute vec2 aEdge;
varying vec3 vWorldPos;
varying float vHeight;
float terrainHeight(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uHeightTex, uv).r;
}
`;

export const TERRAIN_VERT_MAIN = /* glsl */ `
vec3 wp = position + uRingOffset;
float h;
if (aEdge.x != 0.0 || aEdge.y != 0.0) {
  h = 0.5 * (terrainHeight(wp.xz + aEdge) + terrainHeight(wp.xz - aEdge));
} else {
  h = terrainHeight(wp.xz);
}
wp.y = h;
vWorldPos = wp;
vHeight = h;
// normal from finite differences of the height field (independent of mesh resolution)
float e = 12.0;
float hx = terrainHeight(wp.xz + vec2(e, 0.0)) - terrainHeight(wp.xz - vec2(e, 0.0));
float hz = terrainHeight(wp.xz + vec2(0.0, e)) - terrainHeight(wp.xz - vec2(0.0, e));
vec3 tnormal = normalize(vec3(-hx, 2.0 * e, -hz));
`;

const TERRAIN_FRAG_PARS = /* glsl */ `
uniform sampler2D uZoneTex;
uniform sampler2D uDetailTex;
uniform sampler2D uHeightTex;
uniform float uWorldSize;
uniform float uMapN;
varying vec3 vWorldPos;
varying float vHeight;
${GLSL_NOISE}
vec4 zoneSample(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uZoneTex, uv);
}
// bilinear canopy density (G) and wave exposure (A) from the nearest-filtered zone texture
vec2 zoneSmooth(vec2 wp) {
  vec2 t = (wp + vec2(uWorldSize * 0.5)) / uWorldSize * uMapN - 0.5;
  vec2 f = fract(t);
  vec2 b = (floor(t) + 0.5) / uMapN;
  float px = 1.0 / uMapN;
  vec2 s00 = texture2D(uZoneTex, b).ga;
  vec2 s10 = texture2D(uZoneTex, b + vec2(px, 0.0)).ga;
  vec2 s01 = texture2D(uZoneTex, b + vec2(0.0, px)).ga;
  vec2 s11 = texture2D(uZoneTex, b + vec2(px, px)).ga;
  return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
}
// ground under a tree canopy: leaf litter and dark soil with blotches of shaded foliage so that thinned
// distant planting still reads as a continuous dark-green mass from altitude
vec3 canopyFloor(vec2 wp, float n1, float n2) {
  vec3 litter = vec3(0.19, 0.15, 0.085);
  vec3 shade = vec3(0.085, 0.16, 0.06);
  vec3 c = mix(litter, shade, smoothstep(0.38, 0.66, n2 + 0.12 * n1));
  return c * (0.85 + 0.3 * n1);
}
// open ground of the tropical lowland: lawn, dry grass and bare sandy soil in broad patches
vec3 openGround(vec2 wp, float n1, float n2, float n3, float n4, float dryness) {
  vec3 lawn = vec3(0.19, 0.33, 0.11);
  vec3 dry = vec3(0.44, 0.40, 0.21);
  vec3 soil = vec3(0.52, 0.46, 0.34);
  vec3 c = mix(lawn, dry, smoothstep(0.3 - 0.35 * dryness, 0.75 - 0.35 * dryness, n4 + 0.25 * n2));
  c = mix(c, soil, smoothstep(0.62, 0.74, n3) * 0.7);
  return c * (0.88 + 0.24 * n1);
}
// the ground of the mid-rise ring: paved courts, service yards and worn lawns between the blocks
vec3 midriseGround(float n1, float n2, vec2 wp) {
  vec3 c = mix(vec3(0.36, 0.35, 0.33), vec3(0.48, 0.46, 0.42), n2) * (0.92 + 0.16 * n1);
  return mix(c, vec3(0.22, 0.34, 0.14), smoothstep(0.6, 0.75, fbm3(wp * 0.02 + 1.0)) * 0.7);
}
// Suburban ground. Near the camera: lawns, dry yards and sandy lots under the street trees (the houses
// themselves are instanced). Where the house instances go subpixel a baked mottle takes over: roofs at
// house scale on their lots, pale commercial roofs and dark car parks along the arterials, each street
// block a little greener, drier or paler than its neighbours, so the sprawl keeps its grain out to the
// haze instead of paling into a beige field.
vec3 suburbGround(vec2 wp, float n1, float n2, float n3, float n4, float canopy, float sandy, vec4 det, float dist) {
  float tone = det.g;
  vec3 c = openGround(wp, n1, n2, n3, n4, 0.12 + 0.35 * tone);
  vec3 lot = vec3(0.46, 0.42, 0.35);
  c = mix(c, lot, smoothstep(0.55, 0.7, fbm3(wp * 0.03 + 5.0)) * 0.6);
  c *= 0.84 + 0.28 * tone;
  c = mix(c, c * vec3(0.9, 1.04, 0.86), smoothstep(0.6, 0.9, tone) * 0.5);
  float farF = smoothstep(1200.0, 3800.0, dist);
  if (farF > 0.0) {
    vec2 cellP = wp / 13.0;
    vec2 cid = floor(cellP);
    vec2 hh = hash22(cid + 0.37);
    float cover = step(0.3 - 0.25 * det.b, hh.y);
    // roof colours in the proportions of a sunbelt suburb: shingle greys, pale membrane, terracotta, tan, a few dark
    vec3 roof = hh.x < 0.32 ? vec3(0.56, 0.54, 0.50) : hh.x < 0.5 ? vec3(0.74, 0.72, 0.66) : hh.x < 0.7 ? vec3(0.52, 0.31, 0.21) : hh.x < 0.86 ? vec3(0.54, 0.46, 0.34) : vec3(0.27, 0.26, 0.25);
    vec2 f = fract(cellP) - 0.5;
    float inRoof = step(max(abs(f.x), abs(f.y)), 0.38);
    c = mix(c, roof, cover * inRoof * farF * 0.92);
    // driveways, pool decks and pads fill much of what the roof leaves of the lot
    c = mix(c, vec3(0.40, 0.39, 0.36), cover * (1.0 - inRoof) * step(0.45, hh.x) * farF * 0.6);
    float strip = det.a * (1.0 - smoothstep(0.0, 0.5, canopy));
    if (strip > 0.0) {
      vec2 sid = floor(wp / 42.0 + 0.5);
      vec2 sh = hash22(sid + 9.1);
      vec3 com = sh.x < 0.55 ? vec3(0.80, 0.79, 0.75) : sh.x < 0.85 ? vec3(0.24, 0.24, 0.25) : vec3(0.62, 0.55, 0.42);
      c = mix(c, com, strip * smoothstep(0.35, 0.5, sh.y) * farF * 0.8);
    }
  }
  // the outer urban ring: the ground greys toward the mid-rise look where the gradient rises
  float ub = smoothstep(0.45, 0.95, det.b + 0.15 * (n3 - 0.5));
  c = mix(c, midriseGround(n1, n2, wp), ub * 0.85);
  c = mix(c, canopyFloor(wp, n1, n2), canopy * (0.85 - 0.4 * ub));
  return mix(c, vec3(0.64, 0.57, 0.42) * (0.92 + 0.16 * n2), sandy);
}
// farmland: rectangular fields of crops, fallow and pasture with hedgerows and ditches on their edges
vec3 farmland(vec2 wp, float n2) {
  vec2 fs = vec2(440.0, 270.0);
  vec2 g = wp / fs;
  vec2 id = floor(g);
  vec2 h = hash22(id + 3.7);
  vec3 crop = h.x < 0.25 ? vec3(0.30, 0.42, 0.16) : h.x < 0.45 ? vec3(0.52, 0.46, 0.25) : h.x < 0.6 ? vec3(0.40, 0.30, 0.20) : h.x < 0.8 ? vec3(0.62, 0.56, 0.36) : vec3(0.22, 0.34, 0.14);
  crop *= (0.9 + 0.2 * h.y) * (0.94 + 0.12 * n2);
  crop *= 1.0 + 0.04 * sin((h.y < 0.5 ? wp.x : wp.y) * 0.35);
  vec2 f = abs(fract(g) - 0.5);
  float edge = smoothstep(0.465, 0.5, max(f.x, f.y));
  return mix(crop, vec3(0.12, 0.18, 0.08), edge * 0.8);
}
vec3 zoneAlbedo(int zone, vec2 wp, float h, float veg, float coast, float expo, vec4 det, out float rough) {
  float n1 = vnoise(wp * 0.35);
  float n2 = fbm3(wp * 0.045);
  float n3 = vnoise(wp * 0.008);
  float n4 = fbm3(wp * 0.0032 + 17.0);
  float dist = length(cameraPosition - vWorldPos);
  rough = 0.9;
  vec3 c;
  // sandy fringe where the land ramps up from a sandy shore (sheltered lake and canal banks stay grassy)
  float sandy = (1.0 - smoothstep(0.9, 1.75, h)) * smoothstep(0.06, 0.28, expo);
  float canopy = smoothstep(0.30, 0.82, veg);
  if (zone == 0 || zone == 1) {
    // seabed: sand with seagrass patches in the shallows, pale sand flats where it is very shallow
    vec3 sand = vec3(0.66, 0.60, 0.44);
    vec3 grass = vec3(0.16, 0.24, 0.13);
    float depth = -h;
    float sg = smoothstep(0.55, 0.75, fbm3(wp * 0.012 + 3.0)) * smoothstep(0.6, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
    c = mix(sand, grass, sg) * (0.9 + 0.2 * n2);
    c = mix(c, vec3(0.75, 0.69, 0.52) * (0.94 + 0.12 * n1), (1.0 - smoothstep(0.5, 1.4, depth)) * (1.0 - sg));
    c = mix(c, vec3(0.28, 0.32, 0.30), smoothstep(12.0, 30.0, depth));
  } else if (zone == 17) {
    // sand flats / bars: rippled pale sand, darker where it is still awash
    float ripple = 0.5 + 0.5 * sin(wp.x * 0.9 + wp.y * 0.35 + 3.0 * n2);
    c = vec3(0.75, 0.69, 0.52) * (0.9 + 0.14 * n2) * (0.96 + 0.06 * ripple);
    c = mix(c, vec3(0.48, 0.44, 0.34), 1.0 - smoothstep(-0.1, 0.25, h));
    rough = 0.8;
  } else if (zone == 2) {
    vec3 dry = vec3(0.68, 0.58, 0.40);
    vec3 wet = vec3(0.33, 0.27, 0.18);
    // the bands are keyed to height, so every threshold wanders with a slow along-shore noise: the wet
    // band, tide lines and dune toe come and go instead of ringing the island as contours
    float wander = fbm3(wp * 0.011 + 23.0) - 0.5;
    float wander2 = vnoise(wp * 0.03 + 41.0) - 0.5;
    // swash zone widens with wave exposure; a darker saturated band sits right at the waterline
    float swash = 0.35 + 0.45 * expo + 0.3 * wander;
    float wetness = 1.0 - smoothstep(0.18, swash + 0.35, h + 0.12 * wander2);
    c = mix(dry, wet, wetness) * (0.92 + 0.16 * n2) * (0.95 + 0.1 * n1);
    c = mix(c, vec3(0.26, 0.23, 0.19), (1.0 - smoothstep(0.05, 0.3, h)) * 0.6);
    // close range: wind ripples in the dry sand, trampled paths and footprints where people walk
    float closeF = 1.0 - smoothstep(60.0, 220.0, dist);
    if (closeF > 0.0) {
      float ripple = 0.5 + 0.5 * sin(dot(wp, vec2(0.83, 0.55)) * 5.5 + 2.5 * vnoise(wp * 0.6));
      float grain = vnoise(wp * 5.0);
      float path = smoothstep(0.86, 0.94, vnoise(wp * 0.07 + 7.0 + 0.6 * vec2(n2)));
      c *= 1.0 + closeF * (1.0 - wetness) * ((0.07 * ripple - 0.035) + 0.06 * (grain - 0.5) - 0.12 * path);
      c *= 1.0 - closeF * wetness * 0.08 * (grain - 0.5);
    }
    // tide marks: thin wrack lines that wander along the beach, strewn with weed and debris
    float tideH1 = swash + 0.12 + 0.06 * n2 + 0.1 * wander2;
    float tideH2 = swash + 0.28 + 0.05 * n1 + 0.08 * wander;
    float tide1 = 1.0 - smoothstep(0.0, 0.05, abs(h - tideH1));
    float tide2 = 1.0 - smoothstep(0.0, 0.03, abs(h - tideH2));
    float debris = smoothstep(0.55, 0.75, vnoise(wp * 1.3 + 9.0)) * step(0.35, vnoise(wp * 0.09));
    c *= 1.0 - 0.16 * tide1 * (0.5 + 0.5 * n1) - 0.08 * tide2;
    c = mix(c, vec3(0.30, 0.25, 0.14), (0.7 * tide1 + 0.4 * tide2) * debris);
    // sea oats and dune grass on the upper beach: khaki tussocks in patches, denser where the shore faces the sea
    float grassN = vnoise(wp * 0.05 + 4.0);
    float tuft = vnoise(wp * 0.9 + 2.0);
    float dune = smoothstep(0.95 + 0.2 * wander, 1.5, h) * smoothstep(0.5 - 0.15 * expo, 0.68, grassN) * (0.55 + 0.45 * smoothstep(0.35, 0.7, tuft));
    c = mix(c, vec3(0.42, 0.42, 0.20) * (0.8 + 0.4 * n1), dune * 0.8);
    // wet sand is dark and a little glossy (the sun glints off it), dry sand matte
    rough = mix(0.95, 0.42, wetness * wetness);
  } else if (zone == 3) {
    vec3 mud = vec3(0.28, 0.24, 0.16);
    vec3 shade = vec3(0.075, 0.15, 0.06);
    c = mix(mud, shade, smoothstep(0.3, 0.6, n2 + 0.15 * n1) * canopy) * (0.9 + 0.2 * n1);
    c = mix(c, vec3(0.2, 0.19, 0.15), 1.0 - smoothstep(0.1, 0.4, h));
    rough = 0.75;
  } else if (zone == 4 || zone == 10) {
    // parkland / generic forest floor, and airport grass
    float dryness = zone == 10 ? 0.5 : 0.25;
    c = openGround(wp, n1, n2, n3, n4, dryness);
    c = mix(c, canopyFloor(wp, n1, n2), canopy * (zone == 10 ? 0.5 : 0.9));
    c = mix(c, vec3(0.64, 0.57, 0.42) * (0.92 + 0.16 * n2), sandy);
  } else if (zone == 11) {
    c = mix(vec3(0.20, 0.44, 0.11), vec3(0.30, 0.52, 0.15), n2) * (0.92 + 0.16 * n1);
    // rough and tree lines between fairways
    c = mix(c, vec3(0.27, 0.36, 0.14), smoothstep(0.45, 0.6, n3));
    c = mix(c, canopyFloor(wp, n1, n2), canopy * 0.7 * smoothstep(0.5, 0.62, n3));
    // bunkers
    float bunker = smoothstep(0.66, 0.72, fbm3(wp * 0.02 + 9.0));
    c = mix(c, vec3(0.78, 0.72, 0.55), bunker);
    // fairway stripes
    c *= 1.0 + 0.05 * sin(wp.x * 0.35 + wp.y * 0.12);
  } else if (zone == 5) {
    c = suburbGround(wp, n1, n2, n3, n4, canopy, sandy, det, dist);
  } else if (zone == 19) {
    // sawgrass marsh: tan-green prairie, dark tree islands (hammocks) where the canopy is dense, brown pools,
    // and the darker wet sloughs running with the sheet flow (north-south) between the higher sawgrass ridges
    vec3 saw = mix(vec3(0.50, 0.49, 0.25), vec3(0.36, 0.41, 0.17), smoothstep(0.35, 0.65, n2));
    c = saw * (0.9 + 0.2 * n1);
    float slough = smoothstep(0.52, 0.68, fbm3(wp * vec2(0.0028, 0.0009) + 6.0));
    c = mix(c, vec3(0.27, 0.30, 0.16), slough * 0.7);
    c = mix(c, canopyFloor(wp, n1, n2), canopy);
    c = mix(c, vec3(0.16, 0.15, 0.10), 1.0 - smoothstep(-0.05, 0.2, h));
    rough = mix(0.85, 0.6, slough);
  } else if (zone == 6 || zone == 8) {
    // mid-rise ring; at the frayed district edge (low urbanity) the ground is already the suburb's
    float ub = smoothstep(0.3, 0.8, det.b + 0.1 * (n3 - 0.5));
    c = mix(suburbGround(wp, n1, n2, n3, n4, canopy, sandy, det, dist), midriseGround(n1, n2, wp), zone == 8 ? 1.0 : ub);
    rough = 0.8;
  } else if (zone == 7) {
    c = mix(vec3(0.24, 0.24, 0.24), vec3(0.38, 0.37, 0.35), n2) * (0.92 + 0.16 * n1);
    rough = 0.75;
  } else if (zone == 9) {
    c = mix(vec3(0.40, 0.39, 0.37), vec3(0.30, 0.28, 0.26), n2) * (0.9 + 0.2 * n1);
    c *= 1.0 - 0.25 * smoothstep(0.6, 0.8, fbm3(wp * 0.05 + 2.0));
    rough = 0.8;
  } else if (zone == 10) {
    c = mix(vec3(0.26, 0.40, 0.16), vec3(0.36, 0.42, 0.20), n2) * (0.92 + 0.16 * n1);
  } else if (zone == 13) {
    c = vec3(0.18, 0.18, 0.19) * (0.9 + 0.2 * n1);
    // parking bays
    float bay = step(0.93, fract(wp.x / 2.7)) * step(fract(wp.y / 11.0), 0.5);
    c = mix(c, vec3(0.75), bay * 0.8);
    rough = 0.7;
  } else if (zone == 14) {
    c = mix(vec3(0.48, 0.38, 0.27), vec3(0.6, 0.52, 0.4), n2) * (0.9 + 0.2 * n1);
  } else if (zone == 15) {
    c = vec3(0.45, 0.44, 0.42) * (0.92 + 0.16 * n1);
    rough = 0.7;
  } else if (zone == 12) {
    // rocky shore: dark wet limestone, barnacle-pale above the splash line
    c = mix(vec3(0.40, 0.37, 0.32), vec3(0.20, 0.19, 0.17), smoothstep(0.35, 0.7, n2 + 0.2 * n1)) * (0.8 + 0.4 * n1);
    c = mix(c, vec3(0.14, 0.14, 0.13), 1.0 - smoothstep(0.2, 0.7, h));
    rough = 0.7;
  } else if (zone == 18) {
    c = vec3(0.16, 0.16, 0.16) * (0.9 + 0.2 * n1);
    rough = 0.7;
  } else {
    c = vec3(0.3, 0.35, 0.2);
  }
  return c;
}
`;

const TERRAIN_FRAG_MAIN = /* glsl */ `
{
  // jittered zone lookup hides the cell grid of the zone map
  float cellSize = uWorldSize / uMapN;
  vec2 jitter = (hash22(floor(vWorldPos.xz * 0.5)) - 0.5) * cellSize * 1.35;
  vec4 zs = zoneSample(vWorldPos.xz + jitter);
  int zone = int(zs.r * 255.0 + 0.5);
  vec2 smoothVE = zoneSmooth(vWorldPos.xz);
  float veg = smoothVE.x;
  float expo = smoothVE.y;
  float coast = (zs.b - 0.5) * 512.0;
  float rough;
  float beyond = smoothstep(uWorldSize * 0.5 - 350.0, uWorldSize * 0.5 + 250.0, max(abs(vWorldPos.x), abs(vWorldPos.z)));
  // the baked detail is clamped at the map edge, so it is faded out where the ground carries on beyond it
  vec4 det = texture2D(uDetailTex, (vWorldPos.xz + vec2(uWorldSize * 0.5)) / uWorldSize) * (1.0 - beyond);
  det.g = mix(0.5, det.g, 1.0 - beyond);
  vec3 alb = zoneAlbedo(zone, vWorldPos.xz, vHeight, veg, coast, expo, det, rough);
  // streets of the district grids and the arterials, baked so the lattice survives to the horizon where the
  // road meshes are subpixel; the carriageway is dark, the verge and sidewalks a paler band
  if (zone != 0 && zone != 1 && zone != 2 && zone != 17 && zone != 3 && zone != 12) {
    float carriage = smoothstep(0.55, 0.9, det.r);
    float verge = smoothstep(0.08, 0.5, det.r) * (1.0 - carriage);
    alb = mix(alb, vec3(0.30, 0.30, 0.30) * (0.92 + 0.16 * hash12(floor(vWorldPos.xz * 0.15))), carriage * 0.9);
    alb = mix(alb, alb * 1.12 + 0.03, verge * 0.6);
    rough = mix(rough, 0.75, carriage);
  }
  // wet band right at the waterline for every land zone (beaches shade their own swash zone)
  if (zone != 0 && zone != 1 && zone != 2 && zone != 17) {
    float wetBand = 1.0 - smoothstep(0.05, 0.45, vHeight);
    alb = mix(alb, alb * 0.62, wetBand);
    rough = mix(rough, 0.7, wetBand);
  }
  // beyond the authored map the ground continues as the same kind of country: the clamped zone
  // texture gives a flat colour, so stamp tree cover and roof/lot patches on it so the sprawl
  // reads as endless texture fading into the haze instead of ending at a straight line
  if (beyond > 0.0) {
    float n5 = fbm3(vWorldPos.xz * 0.02 + 11.0);
    float n7 = fbm3(vWorldPos.xz * 0.0009 + 5.0);
    vec3 tree = vec3(0.09, 0.16, 0.06);
    vec3 farc = alb;
    if (zone == 19 || zone == 0 || zone == 1 || zone == 3) {
      farc = mix(farc, tree, smoothstep(0.48, 0.6, n5) * 0.85);
    } else {
      // the sprawl thins into farmland and scrub within a few kilometres of the map edge: fields with
      // hedgerows, then palmetto scrub and tree lines, the last subdivisions sitting in it as patches
      float outD = max(abs(vWorldPos.x), abs(vWorldPos.z)) - uWorldSize * 0.5;
      float rural = smoothstep(400.0, 3200.0, outD + 1400.0 * (n7 - 0.5));
      vec3 scrub = mix(vec3(0.40, 0.38, 0.21), tree, smoothstep(0.46, 0.6, n5) * 0.85);
      vec3 country = mix(farmland(vWorldPos.xz, n5), scrub, smoothstep(0.5, 0.66, fbm3(vWorldPos.xz * 0.0007 + 2.0)));
      // beyond the farms the coastal plain gives way to the sawgrass wetland
      vec3 marsh = mix(vec3(0.48, 0.47, 0.25), vec3(0.34, 0.39, 0.17), smoothstep(0.35, 0.65, n5));
      marsh = mix(marsh, tree, smoothstep(0.55, 0.66, fbm3(vWorldPos.xz * 0.004 + 8.0)) * 0.9);
      country = mix(country, marsh, smoothstep(5000.0, 9000.0, outD + 2000.0 * (n7 - 0.5)));
      farc = mix(alb, country, rural);
    }
    alb = mix(alb, farc, beyond);
  }
  diffuseColor.rgb *= alb;
  roughnessFactor = rough;
}
`;

export class Terrain {
  readonly group = new THREE.Group();
  readonly material: THREE.MeshStandardMaterial;
  /** every sector of every ring, with its box in ring space (the ring offset is added at cull time) */
  private readonly sectors: { mesh: THREE.Mesh; box: THREE.Box3 }[] = [];
  private readonly offsetUniform = { value: new THREE.Vector3() };

  constructor(readonly textures: MapTextures) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
    const uniforms = {
      uHeightTex: { value: textures.height },
      uZoneTex: { value: textures.zone },
      uDetailTex: { value: textures.detail },
      uRingOffset: this.offsetUniform,
      uWorldSize: { value: WORLD_SIZE },
      uMapN: { value: MAP_N },
    };
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      prev?.(shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${TERRAIN_VERT_PARS}`)
        .replace('#include <beginnormal_vertex>', `${TERRAIN_VERT_MAIN}\nvec3 objectNormal = tnormal;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif`)
        .replace('#include <begin_vertex>', 'vec3 transformed = wp;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${TERRAIN_FRAG_PARS}`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${TERRAIN_FRAG_MAIN}`);
      balanceGroundIbl(shader);
    };
    mat.customProgramCacheKey = () => 'terrain-v5';
    this.material = mat;
    for (let level = 0; level < RINGS; level++) {
      for (const { geometry, box } of buildRing(level, level > 0)) {
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.frustumCulled = false;
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        mesh.matrixAutoUpdate = false;
        mesh.name = `ring${level}`;
        // the ground spans the height range of the map wherever the sector lands
        box.min.y = textures.heightMin - 1; box.max.y = textures.heightMax + 1;
        this.sectors.push({ mesh, box });
        this.group.add(mesh);
      }
    }
  }

  /** Shift the clipmap so it is centred on the camera. All rings share one centre, so their borders
   *  coincide exactly; snapping to two fine cells keeps ring 0 and ring 1 on the same lattice. Sectors
   *  are then drawn for the camera and / or the water's mirror camera as their frustums require. */
  update(camX: number, camZ: number, cull?: ViewCull): void {
    const snap = BASE_CELL * 2;
    const sx = Math.round(camX / snap) * snap;
    const sz = Math.round(camZ / snap) * snap;
    this.offsetUniform.value.set(sx, 0, sz);
    for (const s of this.sectors) {
      if (!cull) { s.mesh.visible = true; s.mesh.layers.set(LAYER_DEFAULT); continue; }
      _box.copy(s.box); _box.min.x += sx; _box.max.x += sx; _box.min.z += sz; _box.max.z += sz;
      const main = cull.boxInView(_box), mirror = cull.boxInMirror(_box);
      s.mesh.visible = main || mirror;
      s.mesh.layers.set(main && mirror ? LAYER_DEFAULT : main ? LAYER_MAIN : LAYER_MIRROR);
    }
  }
}

/** Height lookup helper matching the GPU sampling (bilinear on the same texture data). */
export function terrainHeightAt(map: WorldMap, x: number, z: number): number {
  const cx = Math.max(-HALF, Math.min(HALF - 1, x));
  const cz = Math.max(-HALF, Math.min(HALF - 1, z));
  return map.heightAt(cx, cz);
}
