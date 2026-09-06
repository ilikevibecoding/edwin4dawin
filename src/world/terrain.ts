import * as THREE from 'three';
import { LAYER_DEFAULT, LAYER_MAIN, LAYER_MIRROR, type ViewCull } from './culling';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { HALF, MAP_N, WORLD_SIZE, Zone, sdBox, urbanGradient, type WorldMap } from './map';
import { smoothstep } from '../core/noise';
import { SAND_TILE, createGroundDetailTextures, type GroundDetailTextures } from './groundDetail';

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
  /** tileable ground-detail textures (grass, soil, sand, footprints), see groundDetail.ts */
  readonly groundDetail: GroundDetailTextures;
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
    // linearly filtered: the smooth channels (canopy, coast distance, exposure) come out bilinear in one tap;
    // the zone id is read at texel centres (zoneCell in the terrain shader), where the filter returns the texel
    this.zone.minFilter = THREE.LinearFilter;
    this.zone.magFilter = THREE.LinearFilter;
    this.zone.wrapS = this.zone.wrapT = THREE.ClampToEdgeWrapping;
    this.zone.generateMipmaps = false;
    this.zone.needsUpdate = true;

    this.detail = new THREE.DataTexture(bakeDetail(map), MAP_N, MAP_N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.detail.minFilter = THREE.LinearFilter;
    this.detail.magFilter = THREE.LinearFilter;
    this.detail.wrapS = this.detail.wrapT = THREE.ClampToEdgeWrapping;
    this.detail.generateMipmaps = false;
    this.detail.needsUpdate = true;

    this.groundDetail = createGroundDetailTextures(renderer);
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
  // texel i is the map sample at x = -HALF + i * cell (the heightAt() convention the shaders read with their
  // half-cell offset), so every band is evaluated there and lands on the road meshes it stands for
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
    const z = -HALF + j * cell;
    for (let i = 0; i < n; i++) {
      const idx = j * n + i;
      const zn = map.zone[idx];
      out[idx * 4 + 1] = 128;
      if (!urbanZone(zn)) continue;
      const x = -HALF + i * cell;
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
      const z = -HALF + j * cell;
      for (let i = i0; i <= i1; i++) {
        const idx = j * n + i;
        if (map.zone[idx] !== d.zone || out[idx * 4 + 1] !== 128) continue;
        const x = -HALF + i * cell;
        const dx = x - d.cx, dz = z - d.cz;
        const lx = dx * c + dz * s, lz = -dx * s + dz * c;
        if (Math.abs(lx) > d.hw || Math.abs(lz) > d.hh) continue;
        const ax = lineDist(lx, grid.xs), az = lineDist(lz, grid.zs);
        const dd = Math.min(ax.d, az.d);
        out[idx * 4] = Math.round(255 * Math.max(0, Math.min(1, 1 - (dd - hw) / 7)));
        // the tone is the yard's, not the block's: the houses stand in two rows of 16-24 m lots along the block's
        // long side (city.ts fillHouses), each lawn kept, let go or paved by its own owner, so from 150 m up the
        // suburb is a patchwork of yards on the street grid; the block keeps a share so a street still has a character
        const lot = Math.floor((lx - grid.xs[ax.k]) / 20);
        const row = lz < 0.5 * (grid.zs[az.k] + grid.zs[Math.min(az.k + 1, grid.zs.length - 1)]) ? 0 : 1;
        const tone = 0.3 * hash(ax.k, az.k, di + 1) + 0.7 * hash(ax.k * 131 + lot, az.k * 7 + row, di + 1001);
        out[idx * 4 + 1] = Math.round(1 + 253 * tone);
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
        const z = -HALF + j * cell;
        for (let i = i0; i <= i1; i++) {
          const x = -HALF + i * cell;
          const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / len2));
          const dd = Math.hypot(x - ax - abx * t, z - az - abz * t);
          const v = Math.round(255 * Math.max(0, Math.min(1, 1 - (dd - hw) / 12)));
          const idx = j * n + i;
          if (v > out[idx * 4] && map.zone[idx] !== Zone.OCEAN && map.zone[idx] !== Zone.BAY) out[idx * 4] = v;
        }
      }
    }
  }
  // beach cells: R = trampling (footprints, trodden sand) around the marinas, where streets and arterials
  // reach the shore, and along the hotel frontages; the beach branch of the shader reads R as footprint density
  // (the street band above only marks the causeway landings there)
  const spots: { x: number; z: number; r0: number; r1: number; w: number }[] = [];
  for (const ma of map.marinas) spots.push({ x: ma.x, z: ma.z, r0: 50, r1: 170, w: 0.85 });
  for (const rd of map.roads) {
    if (rd.cls !== 'street' && rd.cls !== 'arterial') continue;
    for (const p of [rd.pts[0], rd.pts[rd.pts.length - 1]]) spots.push({ x: p[0], z: p[1], r0: 12, r1: 75, w: 0.75 });
  }
  const hotels = map.districts.filter((d) => d.zone === Zone.HOTEL);
  for (let j = 0; j < n; j++) {
    const z = -HALF + j * cell;
    for (let i = 0; i < n; i++) {
      const idx = j * n + i;
      if (map.zone[idx] !== Zone.BEACH) continue;
      const x = -HALF + i * cell;
      let t = 0;
      for (const s of spots) {
        const dx = x - s.x, dz = z - s.z;
        if (Math.abs(dx) > s.r1 || Math.abs(dz) > s.r1) continue;
        t = Math.max(t, s.w * (1 - smoothstep(s.r0, s.r1, Math.hypot(dx, dz))));
      }
      for (const d of hotels) {
        const sd = sdBox(x, z, d.cx, d.cz, d.hw, d.hh, d.rot);
        if (sd < 90) t = Math.max(t, 0.6 * (1 - smoothstep(20, 90, sd)));
      }
      if (t > 0) out[idx * 4] = Math.max(out[idx * 4], Math.round(255 * t));
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
#define MAP_HALF_CELL ${(0.5 * WORLD_SIZE / MAP_N).toFixed(6)}
uniform sampler2D uHeightTex;
uniform vec3 uRingOffset;
uniform float uWorldSize;
attribute vec2 aEdge;
varying vec3 vWorldPos;
varying float vHeight;
varying vec2 vSlope;
float terrainHeight(vec2 wp) {
  // texel i of the map textures holds map sample i, which sits at x = -HALF + i * CELL, while linear filtering
  // puts texel i's centre at (i + 0.5) / N: sample half a cell further along, or the rendered ground is heightAt()
  // shifted 4.9 m toward +x, +z and everything placed with heightAt() floats or sinks by slope x 4.9 m
  vec2 uv = (wp + vec2(uWorldSize * 0.5 + MAP_HALF_CELL)) / uWorldSize;
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
// height gradient (m/m): the fragment stage measures the distance to the waterline along the beach face with it
vSlope = vec2(hx, hz) / (2.0 * e);
`;

const TERRAIN_FRAG_PARS = /* glsl */ `
#define MAP_HALF_CELL ${(0.5 * WORLD_SIZE / MAP_N).toFixed(6)}
uniform sampler2D uZoneTex;
uniform sampler2D uDetailTex;
uniform sampler2D uHeightTex;
uniform sampler2D uGroundTex; // r grass clumps, g bare-patch mask, b soil grain, a footprints (groundDetail.ts)
uniform sampler2D uSandTex;   // r sand grain / shells, g ripple height, ba ripple normal xz
uniform vec4 uGroundMean;     // what each channel averages to once the tile is far below a pixel
uniform vec4 uSandMean;
uniform float uWorldSize;
uniform float uMapN;
varying vec3 vWorldPos;
varying float vHeight;
varying vec2 vSlope;
${GLSL_NOISE}
// The prevailing wind (atmosphere.ts windDir): the sea's wind waves and the sand's wind ripples record the same wind.
const vec2 WIND_DIR = vec2(0.944, 0.330);
const vec2 WIND_ACROSS = vec2(-0.330, 0.944);
const float SAND_TILE = ${SAND_TILE.toFixed(2)};
// xz slope of the ground detail (sand ripples, footprints): folded into the shading normal after normal_fragment_maps
vec2 gDetailSlope = vec2(0.0);
// screen derivatives of the world xz, taken in main (uniform control flow): every detail tap sits inside a zone
// branch, so its mip level is given explicitly from these instead of the undefined implicit derivative
vec2 gDwx = vec2(0.0), gDwy = vec2(0.0);

// zone texture: the id (R) is read at a texel centre (the texture is linearly filtered for the sake of the
// smooth channels, and the filter returns the texel exactly there); canopy (G), coast distance (B) and
// exposure (A) are read bilinearly in one tap
vec4 zoneCell(vec2 wp) {
  vec2 t = (wp + vec2(uWorldSize * 0.5)) / uWorldSize * uMapN;
  return texture2D(uZoneTex, (floor(t + 0.5) + 0.5) / uMapN); // nearest sample, as map.zoneAt() rounds
}
vec3 zoneSmooth(vec2 wp) {
  return texture2D(uZoneTex, (wp + vec2(uWorldSize * 0.5 + MAP_HALF_CELL)) / uWorldSize).gba;
}

// ---- detail textures. A tap takes the tile's uv as a linear map J of the world xz (uv = J * wp + offset),
//      so its mip footprint is J applied to the screen derivatives. Anti-tiling: two taps of one tile, the
//      second rotated / rescaled, blended by a slow noise weight w, so the repeat never lines up with itself;
//      'restore' gives a zero-mean channel back the variance the mix loses.
vec4 tapJ(sampler2D t, vec2 wp, mat2 J, vec2 offset) { return textureGrad(t, J * wp + offset, J * gDwx, J * gDwy); }
const mat2 ROT_B = mat2(0.8, 0.6, -0.6, 0.8) * 1.31;      // the second tap of tapRot: 37 deg, 1.31x
const mat2 ROT_MESO = mat2(0.96, -0.28, 0.28, 0.96);      // the meso tile, turned against the micro tile
const mat2 ROT_FOOT = mat2(0.92, -0.39, 0.39, 0.92);      // the footprint tile
const mat2 WIND_FRAME = mat2(0.944, -0.330, 0.330, 0.944); // world xz -> (along the wind, across it)
// The weights step steeply (smoothstep over 0.42..0.58 of a noise), so most pixels sit at exactly 0 or 1
// and take the one tap they need; the blend zone between is where both are fetched.
vec4 tapRot(sampler2D t, vec2 wp, float scale, float w) {
  if (w <= 0.0) return tapJ(t, wp, mat2(scale, 0.0, 0.0, scale), vec2(0.0));
  if (w >= 1.0) return tapJ(t, wp, ROT_B * scale, vec2(0.37, 0.71));
  vec4 a = tapJ(t, wp, mat2(scale, 0.0, 0.0, scale), vec2(0.0));
  vec4 b = tapJ(t, wp, ROT_B * scale, vec2(0.37, 0.71));
  return mix(a, b, w);
}
vec4 tapShift(sampler2D t, vec2 wp, mat2 J, float w) {
  if (w <= 0.0) return tapJ(t, wp, J, vec2(0.0));
  if (w >= 1.0) return tapJ(t, wp, J * 1.27, vec2(0.41, 0.63));
  vec4 a = tapJ(t, wp, J, vec2(0.0));
  vec4 b = tapJ(t, wp, J * 1.27, vec2(0.41, 0.63));
  return mix(a, b, w);
}
float restore(float v, float w) { return (v - 0.5) * inversesqrt(1.0 - 2.0 * w + 2.0 * w * w) + 0.5; }
// fbm3 whose two finer octaves fade to their mean (0.1875) as 'fine' goes to 0: the same value as fbm3 where the
// octaves are visible, one third of its work where they would be subpixel
float fbm3Band(vec2 p, float fine) {
  float v = 0.5 * vnoise(p);
  if (fine <= 0.0) return v + 0.1875;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  p = m * p;
  float o2 = vnoise(p);
  float o3 = vnoise(m * p);
  return v + mix(0.1875, 0.25 * o2 + 0.125 * o3, fine);
}

// The open ground's detail: a 3 m micro tile (blade clumps, bare spots, soil grain) and a 27 m meso tile
// (worn areas and mottle 3-13 m across). Beyond the footprint where a tile has averaged out its taps are
// skipped and the channel means stand in, so nothing changes with the distance but the cost.
struct Ground { float grass; float bare; float soil; float mesoBare; float mesoTone; };
Ground groundMeans() {
  Ground g;
  g.grass = uGroundMean.x; g.bare = uGroundMean.y; g.soil = uGroundMean.z; g.mesoBare = uGroundMean.y; g.mesoTone = uGroundMean.z;
  return g;
}
Ground groundDetail(vec2 wp, float w, float w2, float foot) {
  Ground g = groundMeans();
  // the 3 m tile is under three pixels across past 1 m/px: only its mean is left in it there
  float micro = 1.0 - smoothstep(0.7, 1.2, foot);
  if (micro > 0.0) {
    vec4 m = tapRot(uGroundTex, wp, 1.0 / 3.0, w);
    g.grass = mix(g.grass, restore(m.r, w), micro);
    g.bare = mix(g.bare, m.g, micro);
    g.soil = mix(g.soil, restore(m.b, w), micro);
  }
  float meso = 1.0 - smoothstep(8.0, 14.0, foot);
  if (meso > 0.0) {
    // two turned taps blended by a ~100 m noise: a single 27 m tile would lattice a lawn at 1500 m (15 px repeat)
    vec4 m = w2 <= 0.0 ? tapJ(uGroundTex, wp, ROT_MESO * (1.0 / 27.0), vec2(0.5))
           : w2 >= 1.0 ? tapJ(uGroundTex, wp, ROT_B * (1.0 / 33.0), vec2(0.12, 0.83))
           : mix(tapJ(uGroundTex, wp, ROT_MESO * (1.0 / 27.0), vec2(0.5)), tapJ(uGroundTex, wp, ROT_B * (1.0 / 33.0), vec2(0.12, 0.83)), w2);
    g.mesoBare = mix(g.mesoBare, m.g, meso);
    g.mesoTone = mix(g.mesoTone, restore(m.b, w2), meso);
  }
  return g;
}
// ground under a tree canopy: leaf litter and dark soil with blotches of shaded foliage so that thinned
// distant planting still reads as a continuous dark-green mass from altitude; the litter carries the soil grain
vec3 canopyFloor(float n1, float n2, Ground gd) {
  vec3 litter = vec3(0.062, 0.045, 0.022) * (0.78 + 0.44 * gd.soil);
  vec3 shade = vec3(0.017, 0.036, 0.011) * (0.86 + 0.28 * gd.grass);
  vec3 c = mix(litter, shade, smoothstep(0.38, 0.66, n2 + 0.12 * n1));
  return c * (0.85 + 0.3 * n1);
}
// open ground of the tropical lowland: lawn, dry grass and bare sandy soil in broad patches (n3, n4), worn
// areas (meso mask) and, close up, the turf's own clumps and bare spots (micro)
vec3 openGround(float n2, float n3, float n4, float dryness, Ground gd) {
  vec3 lawn = vec3(0.064, 0.105, 0.038);
  vec3 dry = vec3(0.19, 0.155, 0.064);
  vec3 soil = vec3(0.21, 0.16, 0.105);
  // n4 + 0.25 n2 averages 0.625: the ramp is centred there so kept lawn and dry yard come in equal measure at
  // dryness 0.25 (it was centred at 0.44, which made nearly everything dry)
  float dryMix = smoothstep(0.55 - 0.35 * dryness, 0.85 - 0.35 * dryness, n4 + 0.25 * n2 + 0.15 * (gd.mesoTone - 0.5));
  vec3 c = mix(lawn, dry, dryMix);
  c *= 0.82 + 0.36 * gd.grass;
  float bare = smoothstep(0.62, 0.74, n3) * 0.7;
  bare = max(bare, gd.mesoBare * (0.35 + 0.45 * dryMix));
  bare = max(bare, gd.bare * (0.3 + 0.6 * max(dryMix, gd.mesoBare)));
  vec3 soilC = soil * (0.78 + 0.44 * gd.soil);
  return mix(c, soilC, bare);
}
// the strip where a beach becomes land: pale sandy soil under sparse dry tufts. Both the beach's upper edge
// and the landward zones' sandy fringe converge on it, so the zone boundary carries no texture step
vec3 sandyScrub(float n1, float n2, Ground gd) {
  vec3 c = vec3(0.27, 0.20, 0.126) * (0.92 + 0.16 * n2) * (0.82 + 0.36 * gd.soil);
  float tuft = smoothstep(0.55, 0.8, gd.grass) * (1.0 - gd.bare);
  return mix(c, vec3(0.143, 0.126, 0.043) * (0.85 + 0.3 * n1), tuft * 0.55);
}
// the ground of the mid-rise ring: paved courts, service yards and worn lawns between the blocks
vec3 midriseGround(float n1, float n2, vec2 wp, Ground gd, float foot) {
  vec3 c = mix(vec3(0.108, 0.105, 0.095), vec3(0.165, 0.16, 0.145), n2) * (0.92 + 0.16 * n1) * (0.9 + 0.2 * gd.soil);
  vec3 lawn = vec3(0.072, 0.11, 0.045) * (0.78 + 0.44 * gd.grass);
  return mix(c, lawn, smoothstep(0.6, 0.75, fbm3Band(wp * 0.02 + 1.0, 1.0 - smoothstep(4.0, 8.0, foot))) * 0.7 * (1.0 - 0.6 * gd.bare));
}
// Suburban ground. Near the camera: lawns, dry yards and sandy lots under the street trees (the houses
// themselves are instanced). Where the house instances go subpixel a baked mottle takes over: roofs at
// house scale on their lots, pale commercial roofs and dark car parks along the arterials, each street
// block a little greener, drier or paler than its neighbours, so the sprawl keeps its grain out to the
// haze instead of paling into a beige field.
vec3 suburbGround(vec2 wp, float n1, float n2, float n3, float n4, float canopy, float sandy, vec4 det, float dist, float foot, Ground gd) {
  float tone = det.g;
  vec3 c = openGround(n2, n3, n4, 0.12 + 0.35 * tone, gd);
  // mowing stripes on the kept lawns, alternating with the street block, gone once the stripe is under ~3 px
  float stripeVis = (1.0 - smoothstep(0.3, 0.55, foot)) * smoothstep(0.4, 0.6, tone) * (1.0 - gd.bare);
  if (stripeVis > 0.0) {
    float along = fract(tone * 7.3) < 0.5 ? wp.x : wp.y;
    c *= 1.0 + 0.045 * stripeVis * sin(along * 4.4);
  }
  vec3 lot = vec3(0.194, 0.165, 0.125) * (0.84 + 0.32 * gd.soil);
  c = mix(c, lot, smoothstep(0.55, 0.7, fbm3Band(wp * 0.03 + 5.0, 1.0 - smoothstep(3.0, 6.0, foot))) * 0.6);
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
    c = mix(c, vec3(0.17, 0.165, 0.15), cover * (1.0 - inRoof) * step(0.45, hh.x) * farF * 0.6);
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
  if (ub > 0.0) c = mix(c, midriseGround(n1, n2, wp, gd, foot), ub * 0.85);
  c = mix(c, canopyFloor(n1, n2, gd), canopy * (0.85 - 0.4 * ub));
  return mix(c, sandyScrub(n1, n2, gd), sandy);
}
// farmland: rectangular fields of crops, fallow and pasture with hedgerows and ditches on their edges
vec3 farmland(vec2 wp, float n2) {
  vec2 fs = vec2(440.0, 270.0);
  vec2 g = wp / fs;
  vec2 id = floor(g);
  vec2 h = hash22(id + 3.7);
  vec3 crop = h.x < 0.25 ? vec3(0.066, 0.11, 0.047) : h.x < 0.45 ? vec3(0.243, 0.185, 0.066) : h.x < 0.6 ? vec3(0.108, 0.068, 0.037) : h.x < 0.8 ? vec3(0.33, 0.28, 0.126) : vec3(0.048, 0.09, 0.036);
  crop *= (0.9 + 0.2 * h.y) * (0.94 + 0.12 * n2);
  crop *= 1.0 + 0.04 * sin((h.y < 0.5 ? wp.x : wp.y) * 0.35);
  vec2 f = abs(fract(g) - 0.5);
  float edge = smoothstep(0.465, 0.5, max(f.x, f.y));
  return mix(crop, vec3(0.012, 0.025, 0.008), edge * 0.8);
}
// Sand. The wind-aligned tile gives grain, shell hash and heavy-mineral specks (r), the ripple height (g) and
// the ripple normal (ba); the second tap is shifted, not rotated, so the ripples keep their wind direction.
struct Sand { float alb; float ripple; vec2 slope; };
Sand sandDetail(vec2 wp, float w, float foot) {
  Sand s;
  float vis = 1.0 - smoothstep(0.7, 1.2, foot);
  if (vis > 0.0) {
    vec4 t = tapShift(uSandTex, wp, WIND_FRAME * (1.0 / SAND_TILE), w);
    s.alb = mix(uSandMean.x, restore(t.r, w), vis);
    s.ripple = mix(uSandMean.y, t.g, vis);
    vec2 n = (t.ba * 2.0 - 1.0) * vis;
    s.slope = n.x * WIND_DIR + n.y * WIND_ACROSS;
  } else { s.alb = uSandMean.x; s.ripple = uSandMean.y; s.slope = vec2(0.0); }
  return s;
}
vec3 zoneAlbedo(int zone, vec2 wp, float h, float veg, float coast, float expo, vec4 det, float foot, out Ground gd, out float rough) {
  // The sea bed and the bars under the water plane (h < 0.05; the rim above it took the land's zone in main):
  // the water is opaque over them (water.ts shades its own bed and writes alpha 1), so nothing of this is ever
  // seen and only its cost would be. A depth tint without noise or taps, in case the water is ever hidden.
  if (zone == 0 || zone == 1 || zone == 17) {
    gd = groundMeans();
    rough = mix(0.9, 0.35, smoothstep(-0.4, 0.05, h));
    vec3 bed = mix(vec3(0.62, 0.56, 0.42), vec3(0.28, 0.32, 0.30), smoothstep(12.0, 30.0, -h));
    return mix(bed, vec3(0.33, 0.27, 0.18), smoothstep(-0.6, 0.0, h));
  }
  // the 3 m noise and the 5-11 m octaves of the 22 m one go subpixel at 1-4 m/px: past that they are replaced by
  // their means (what their mip would be), which is a third of the noise work in every aerial view
  float n1 = foot < 2.0 ? mix(vnoise(wp * 0.35), 0.5, smoothstep(1.0, 2.0, foot)) : 0.5;
  float n2 = fbm3Band(wp * 0.045, 1.0 - smoothstep(2.0, 4.0, foot));
  float n3 = vnoise(wp * 0.008);
  float n4 = fbm3(wp * 0.0032 + 17.0);
  float dist = length(cameraPosition - vWorldPos);
  // the anti-tiling blend weights of the detail taps (micro and sand from the 22 m noise, meso from the 125 m
  // one): a step over a tenth of the noise's range, so the two-tap blend zone is a 2-3 m seam between one-tap
  // fields of either variant of the tile, and about a fifth of the pixels
  float w = smoothstep(0.45, 0.55, n2);
  float w2 = smoothstep(0.45, 0.55, n3);
  gd = groundDetail(wp, w, w2, foot);
  rough = 0.9;
  vec3 c;
  // sandy fringe where the land ramps up from a sandy shore (sheltered lake and canal banks stay grassy); the
  // beach zone ends at about h 1.3-1.9 (map.ts: ramp 0.45), so both sides meet on the scrub at the same height
  float sandy = (1.0 - smoothstep(1.2, 2.3, h)) * smoothstep(0.06, 0.28, expo);
  // the floor darkens with the square of the cover: under a thin, gappy canopy the ground is still the open
  // ground with tree shadows on it, the litter floor belongs to the closed hammock
  float canopy = smoothstep(0.30, 0.82, veg);
  canopy *= canopy;
  if (zone == 2) {
    // ---- the beach profile in metres from the waterline: the swash band the water shader washes (its
    //      swashW = 4 + 12 * exposure, water.ts), a damp band above it, dry rippled sand to the dune toe.
    //      Near the water the distance is the height along the beach face (exact where it matters), farther
    //      out the map's coastline distance; slow along-shore noises wander every band so none rings the
    //      island as a contour.
    float slopeLen = max(length(vSlope), 0.006);
    vec2 offshore = -vSlope / slopeLen;
    // the water plane covers the sand up to h = 0.05 (water.ts discards above it): that is the visible line
    float dLine = max(h - 0.05, 0.0) / slopeLen;
    float shoreD = mix(dLine, max(-coast, 0.0), smoothstep(5.0, 18.0, dLine));
    float facing = 0.5 + 0.5 * dot(offshore, WIND_DIR);
    float exposure = expo * (0.3 + 0.7 * facing) * 0.85;
    float swashW = 4.0 + 12.0 * exposure;
    float wander = fbm3(wp * 0.011 + 23.0) - 0.5;
    float wander2 = vnoise(wp * 0.03 + 41.0) - 0.5;
    float sd = shoreD + (4.0 * wander + 1.5 * wander2) * (0.35 + 0.65 * smoothstep(1.5, 8.0, shoreD));
    float wet = 1.0 - smoothstep(swashW * 0.55, swashW * 1.25 + 1.0, sd);
    // the damp band's upper limit is ragged: the wash runs up further in the low spots of a flat beach
    // (runnels, the hollows between cusps), so its edge is a mottle of tongues 6-15 m across, not a contour
    float runnel = fbm3(wp * 0.07 + 31.0) - 0.5;
    float damp = 1.0 - smoothstep(swashW * 1.1, swashW * 2.4 + 5.0, sd + 11.0 * runnel * smoothstep(swashW, swashW * 2.2, sd));
    // .. and within the band the sand dries first on the slight rises: dry islands in the damp, damp
    // tongues in the dry, both 5-15 m across
    damp *= 1.0 - 0.7 * smoothstep(0.1, 0.3, runnel) * smoothstep(swashW * 1.4, swashW * 2.4, sd);
    // pools of the last tide lying in the low damp sand: saturated, dark and glossy
    float poolBand = damp * (1.0 - wet) * smoothstep(0.2, 0.5, exposure + 0.25 * (n3 - 0.5));
    float pool = poolBand > 0.01 ? smoothstep(0.62, 0.72, fbm3(wp * 0.05 + 53.0)) * poolBand : 0.0;
    // the film of the last wave: saturated sand right at the line, a mirror at grazing angles
    float film = 1.0 - smoothstep(0.0, 0.8 + 0.6 * exposure, shoreD + 0.6 * wander2);
    Sand sdt = sandDetail(wp, w, foot);
    // albedos sit where the post's tone curve still has slope: the sun-lit ground above ~0.35 all lands
    // within a few output levels of white (dry sand 0.56 renders ~232; damp 0.24 ~200; wet 0.14 ~168)
    vec3 dry = vec3(0.47, 0.375, 0.245);
    vec3 dampC = vec3(0.243, 0.188, 0.132);
    vec3 wetC = vec3(0.143, 0.111, 0.081);
    // grain, shell hash and specks; a little darker in the ripple troughs where the heavy grains collect
    float grainMod = 1.0 + 0.36 * (sdt.alb - 0.5) - 0.16 * (0.5 - sdt.ripple) * (1.0 - damp);
    c = dry * (0.92 + 0.16 * n2) * grainMod;
    c = mix(c, dampC * (0.94 + 0.12 * n2) * (1.0 + 0.2 * (sdt.alb - 0.5)), damp);
    c = mix(c, wetC * (0.94 + 0.12 * n2) * (1.0 + 0.12 * (sdt.alb - 0.5)), max(wet, pool * 0.8));
    // the film of the wash: saturated sand, its sheen the water's own
    c = mix(c, vec3(0.10, 0.085, 0.068), film * 0.75);
    // heavy-mineral streak the wash leaves at its limit, and the wrack lines: weed and debris at the swash
    // limit, an older fainter line higher up; the debris grain is filtered out with the footprint
    // (the lines are widened to the pixel and paled in proportion once thinner than one, so from the air they stay
    // the thin dark lines along the beach that they are instead of breaking into dashes)
    float lwS = max(0.6, 0.9 * foot);
    float streak = (1.0 - smoothstep(0.0, lwS, abs(sd - swashW * 0.95))) * (0.6 / lwS);
    if (streak > 0.0) c *= 1.0 - 0.10 * streak * smoothstep(0.25, 0.6, vnoise(wp * 0.4 + 3.0));
    // .. and the dark magnetite lag the wind strings out along itself over the dry sand: streaks 4-10 m long
    // and half a metre wide, in patches of the beach, the sand's own stripes from the air
    float lagVis = (1.0 - damp) * (1.0 - smoothstep(1.5, 3.0, foot)) * smoothstep(0.45, 0.7, n3 + 0.3 * (n4 - 0.5));
    if (lagVis > 0.02) {
      vec2 wf = WIND_FRAME * wp;
      float sn = vnoise(vec2(wf.x * 0.12, wf.y * 1.1) + 7.0);
      c *= 1.0 - 0.22 * smoothstep(0.64, 0.8, sn) * lagVis;
    }
    float wrackD = swashW * 1.3 + 1.0;
    float oldLine = wrackD * 1.8 + 2.0 - 1.5 * wander2;
    float lw1 = max(0.7, 0.9 * foot), lw2 = max(0.5, 0.9 * foot);
    float tide1 = (1.0 - smoothstep(0.0, lw1, abs(sd - wrackD))) * (0.7 / lw1);
    float tide2 = (1.0 - smoothstep(0.0, lw2, abs(sd - oldLine))) * (0.5 / lw2);
    if (tide1 + tide2 > 0.0) {
      float grainVis = 1.0 - smoothstep(0.3, 1.0, foot);
      float debris = mix(0.3, smoothstep(0.55, 0.75, vnoise(wp * 1.3 + 9.0)) * step(0.35, vnoise(wp * 0.09)), grainVis);
      c *= 1.0 - 0.14 * tide1 * (0.5 + 0.5 * n1) - 0.07 * tide2;
      c = mix(c, vec3(0.056, 0.043, 0.016), (0.7 * tide1 + 0.4 * tide2) * debris);
    }
    // driftwood along the older line: a bleached stick or branch every 10-30 m, 1.5-3 m long, lying along the
    // shore where the highest tide left it, a few on the fresh wrack line too; gone with the footprint
    float driftVis = (1.0 - smoothstep(0.25, 0.8, foot)) * step(abs(sd - oldLine), 3.0);
    if (driftVis > 0.0) {
      vec2 along = vec2(-offshore.y, offshore.x);
      float a = dot(wp, along) / 12.0;
      float cellA = floor(a);
      vec2 hd = hash22(vec2(cellA, floor(dot(wp, offshore) / 60.0)) + 2.7);
      float u = fract(a) - 0.5 - (hd.x - 0.5) * 0.5;      // along the stick, in 12 m cells
      float halfLen = 0.06 + 0.07 * hd.y;                  // 0.7-1.6 m half-length
      float across = sd - oldLine - (hd.y - 0.5) * 2.4 - 0.25 * sin(u * 12.0 + hd.x * 6.0) * hd.x; // a slight bend
      float thick = max(0.07, foot * 0.6);
      float stick = step(abs(u), halfLen) * (1.0 - smoothstep(thick * 0.6, thick, abs(across))) * step(0.55, hash12(vec2(cellA, 5.0) + hd.y));
      stick *= driftVis * (1.0 - 0.3 * smoothstep(halfLen * 0.6, halfLen, abs(u)));
      vec3 wood = mix(vec3(0.20, 0.17, 0.13), vec3(0.075, 0.06, 0.045), hd.x); // bleached grey to dark wet bark
      c = mix(c, wood * (0.85 + 0.3 * n1), stick);
      // shadow side: the stick stands 6-10 cm proud of the sand
      c *= 1.0 - 0.35 * stick * smoothstep(0.0, thick * 0.6, across) * step(0.0, across);
    }
    // wind ripples on the dry sand only (the wash smooths the wet band), stronger on exposed shores
    float ripStr = (1.0 - damp) * (0.55 + 0.45 * smoothstep(0.3, 0.8, expo));
    gDetailSlope = sdt.slope * ripStr;
    // footprints: everyone walks the firm damp sand, and the trodden ground around the marinas, road ends and
    // hotel frontages (det.r, baked) is printed all over; patches of prints, not an even stipple
    float trample = det.r;
    // the dry sand within ~40 m of the water is walked over too, in patches
    float walk = max(trample, max(0.18 * damp * (1.0 - wet * 0.7), 0.1 * (1.0 - smoothstep(25.0, 45.0, shoreD))));
    float fpVis = 1.0 - smoothstep(0.2, 0.55, foot);
    if (fpVis * walk > 0.02) {
      mat2 J = ROT_FOOT * (1.0 / 6.0);
      float e = max(1.0 / 1024.0, foot * (1.0 / 6.0));
      float f0 = tapJ(uGroundTex, wp, J, vec2(0.25)).a;
      float fx = tapJ(uGroundTex, wp, J, vec2(0.25 + e, 0.25)).a;
      float fy = tapJ(uGroundTex, wp, J, vec2(0.25, 0.25 + e)).a;
      float gate = smoothstep(0.62 - 0.6 * walk, 0.8 - 0.6 * walk, vnoise(wp * 0.11 + 5.0)) * fpVis;
      float depthM = 0.05 * gate; // metres over the channel's full range
      vec2 gt = vec2(fx - f0, fy - f0) / (e * 6.0) * depthM; // height gradient in tile space (u, v)
      gDetailSlope += -(gt.x * vec2(0.92, 0.39) + gt.y * vec2(-0.39, 0.92)) * 1.4;
      // the trodden hollows show the damper sand under the surface
      c *= 1.0 - 0.28 * max(0.5 - f0, 0.0) * gate * (1.0 - wet);
    }
    // tyre tracks of the beach patrol: a pair of ruts 1.6 m apart along the firm damp sand above the swash
    // limit, only where the beach is trodden; the lugs of the tread dash the rut floor
    float trackVis = (1.0 - smoothstep(0.35, 0.9, foot)) * smoothstep(0.25, 0.5, trample);
    if (trackVis > 0.01) {
      vec2 along = vec2(-offshore.y, offshore.x);
      float a = dot(wp, along);
      float centre = swashW * 1.5 + 3.0 + 2.0 * (vnoise(vec2(a * 0.02, 0.5) + 2.0) - 0.5);
      float across = sd - centre;
      float u = abs(abs(across) - 0.8);
      float t = clamp((u - 0.1) * 10.0, 0.0, 1.0);
      float rut = 1.0 - t * t * (3.0 - 2.0 * t);
      float lug = 0.75 + 0.25 * step(0.5, fract(a * 3.0));
      c *= 1.0 - 0.2 * rut * lug * trackVis;
      // rut walls: 4 cm deep over 10 cm, tilting the normal toward the rut floor
      float dh = 0.04 * (6.0 * t * (1.0 - t) * 10.0) * sign(abs(across) - 0.8) * sign(across) * trackVis;
      gDetailSlope += offshore * dh;
    }
    // sea oats and dune grass on the upper beach: khaki tussocks in patches, denser where the shore faces the sea
    float duneH = smoothstep(0.95 + 0.2 * wander, 1.5, h);
    if (duneH > 0.0) {
      float grassN = vnoise(wp * 0.05 + 4.0);
      float dune = duneH * smoothstep(0.5 - 0.15 * expo, 0.68, grassN) * (0.55 + 0.45 * smoothstep(0.35, 0.7, gd.grass));
      c = mix(c, vec3(0.143, 0.126, 0.043) * (0.8 + 0.4 * n1), dune * 0.8);
    }
    // the upper beach turns to sandy scrub where the land begins (see sandyScrub)
    float upper = smoothstep(1.0, 2.0, h) * smoothstep(8.0, 25.0, shoreD);
    c = mix(c, sandyScrub(n1, n2, gd), upper * 0.85);
    gDetailSlope *= 1.0 - upper;
    // wet sand is dark and glossy, the film of the last wave a mirror, dry sand matte
    rough = mix(0.95, 0.72, damp);
    rough = mix(rough, 0.42, max(wet, pool));
    rough = mix(rough, 0.16, max(film, pool * 0.6));
  } else if (zone == 3) {
    vec3 mud = vec3(0.076, 0.058, 0.033) * (0.84 + 0.32 * gd.soil);
    vec3 shade = vec3(0.015, 0.033, 0.010);
    c = mix(mud, shade, smoothstep(0.3, 0.6, n2 + 0.15 * n1) * canopy) * (0.9 + 0.2 * n1);
    c = mix(c, vec3(0.05, 0.045, 0.033), 1.0 - smoothstep(0.1, 0.4, h));
    rough = 0.75;
  } else if (zone == 4 || zone == 10) {
    // parkland / generic forest floor, and airport grass; parks carry worn dirt paths (wandering ridges of a
    // slow noise, 1.5 m wide) and a darker, littered floor under the trees
    float dryness = zone == 10 ? 0.5 : 0.25;
    c = openGround(n2, n3, n4, dryness, gd);
    if (zone == 4) {
      float pathVis = 1.0 - smoothstep(2.5, 5.0, foot);
      if (pathVis > 0.0) {
        float pn = vnoise(wp * 0.023 + 0.5 * vec2(n4 - 0.5, 0.5 - n4) + 8.0);
        // about 2 m wide (0.028 of the noise's range at its ~0.012/m gradient); once thinner than a pixel the
        // line widens to the pixel and pales in proportion, so from 500 m up it stays a faint line instead of
        // breaking into dashes and vanishing
        float hw = max(0.028, 0.012 * foot);
        float path = (1.0 - smoothstep(hw * 0.5, hw, abs(pn - 0.5))) * pathVis * (0.028 / hw) * (1.0 - smoothstep(0.65, 0.85, canopy));
        c = mix(c, vec3(0.21, 0.16, 0.10) * (0.8 + 0.4 * gd.soil), path * 0.85);
      }
    }
    c = mix(c, canopyFloor(n1, n2, gd), canopy * (zone == 10 ? 0.5 : 0.9));
    c = mix(c, sandyScrub(n1, n2, gd), sandy);
  } else if (zone == 11) {
    c = mix(vec3(0.056, 0.108, 0.036), vec3(0.078, 0.13, 0.052), n2) * (0.92 + 0.16 * n1) * (0.82 + 0.36 * gd.grass);
    // rough and tree lines between fairways
    c = mix(c, vec3(0.042, 0.075, 0.030) * (0.8 + 0.4 * gd.grass), smoothstep(0.45, 0.6, n3));
    c = mix(c, canopyFloor(n1, n2, gd), canopy * 0.7 * smoothstep(0.5, 0.62, n3));
    // bunkers
    float bunker = smoothstep(0.66, 0.72, fbm3(wp * 0.02 + 9.0));
    c = mix(c, vec3(0.56, 0.44, 0.28) * (0.9 + 0.2 * gd.soil), bunker);
    // fairway stripes
    c *= 1.0 + 0.05 * sin(wp.x * 0.35 + wp.y * 0.12) * (1.0 - smoothstep(4.0, 9.0, foot));
  } else if (zone == 5) {
    c = suburbGround(wp, n1, n2, n3, n4, canopy, sandy, det, dist, foot, gd);
  } else if (zone == 19) {
    // sawgrass marsh: tan-green prairie, dark tree islands (hammocks) where the canopy is dense, brown pools,
    // and the darker wet sloughs running with the sheet flow (north-south) between the higher sawgrass ridges
    vec3 saw = mix(vec3(0.225, 0.20, 0.078), vec3(0.126, 0.143, 0.055), smoothstep(0.35, 0.65, n2)) * (0.8 + 0.4 * gd.grass);
    c = saw * (0.9 + 0.2 * n1);
    float slough = smoothstep(0.52, 0.68, fbm3(wp * vec2(0.0028, 0.0009) + 6.0));
    c = mix(c, vec3(0.056, 0.066, 0.029), slough * 0.7);
    c = mix(c, canopyFloor(n1, n2, gd), canopy);
    c = mix(c, vec3(0.022, 0.019, 0.010), 1.0 - smoothstep(-0.05, 0.2, h));
    rough = mix(0.85, 0.6, slough);
  } else if (zone == 6 || zone == 8) {
    // mid-rise ring; at the frayed district edge (low urbanity) the ground is already the suburb's
    float ub = zone == 8 ? 1.0 : smoothstep(0.3, 0.8, det.b + 0.1 * (n3 - 0.5));
    c = midriseGround(n1, n2, wp, gd, foot);
    if (ub < 1.0) c = mix(suburbGround(wp, n1, n2, n3, n4, canopy, sandy, det, dist, foot, gd), c, ub);
    rough = 0.8;
  } else if (zone == 7) {
    c = mix(vec3(0.066, 0.066, 0.066), vec3(0.126, 0.122, 0.112), n2) * (0.92 + 0.16 * n1) * (0.94 + 0.12 * gd.soil);
    rough = 0.75;
  } else if (zone == 9 || zone == 14) {
    // industrial yards and construction sites: paved aprons and packed dirt with margins of crushed-stone
    // gravel; the soil tile at a 12 m repeat is the stone (pebbles 3-6 cm across)
    vec3 pave = mix(vec3(0.135, 0.13, 0.12), vec3(0.093, 0.085, 0.076), n2) * (0.9 + 0.2 * n1);
    pave *= 1.0 - 0.25 * smoothstep(0.6, 0.8, fbm3(wp * 0.05 + 2.0));
    float gvis = 1.0 - smoothstep(3.0, 7.0, foot);
    float stone = gvis > 0.0 ? mix(uGroundMean.z, tapJ(uGroundTex, wp, mat2(1.0 / 12.0, 0.0, 0.0, 1.0 / 12.0), vec2(0.3)).b, gvis) : uGroundMean.z;
    vec3 gravel = vec3(0.194, 0.185, 0.166) * (0.62 + 0.76 * stone) * (0.94 + 0.12 * n2);
    vec3 dirt = vec3(0.18, 0.14, 0.092) * (0.8 + 0.4 * gd.soil) * (0.92 + 0.16 * n2);
    float margin = smoothstep(0.08, 0.5, det.r) * (1.0 - smoothstep(0.55, 0.9, det.r));
    float gravelF = max(smoothstep(0.58, 0.68, n3 + 0.2 * (gd.mesoBare - 0.3)), margin * 0.8);
    if (zone == 14) { c = mix(dirt, gravel, smoothstep(0.5, 0.7, n2) * 0.6); }
    else { c = mix(pave, gravel, gravelF); c = mix(c, dirt, smoothstep(0.7, 0.85, gd.mesoBare) * 0.5); }
    rough = 0.85;
  } else if (zone == 13) {
    c = vec3(0.047, 0.047, 0.05) * (0.9 + 0.2 * n1);
    // parking bays
    float bay = step(0.93, fract(wp.x / 2.7)) * step(fract(wp.y / 11.0), 0.5);
    c = mix(c, vec3(0.6), bay * 0.8 * (1.0 - smoothstep(0.1, 0.3, foot)));
    rough = 0.7;
  } else if (zone == 15) {
    c = vec3(0.185, 0.18, 0.164) * (0.92 + 0.16 * n1);
    rough = 0.7;
  } else if (zone == 12) {
    // rocky shore: dark wet limestone, barnacle-pale above the splash line
    c = mix(vec3(0.147, 0.126, 0.10), vec3(0.06, 0.054, 0.045), smoothstep(0.35, 0.7, n2 + 0.2 * n1)) * (0.8 + 0.4 * n1) * (0.88 + 0.24 * gd.soil);
    c = mix(c, vec3(0.025, 0.025, 0.023), 1.0 - smoothstep(0.2, 0.7, h));
    rough = mix(0.7, 0.35, 1.0 - smoothstep(0.1, 0.5, h));
  } else if (zone == 18) {
    c = vec3(0.042, 0.042, 0.042) * (0.9 + 0.2 * n1);
    rough = 0.7;
  } else {
    c = vec3(0.1, 0.13, 0.06);
  }
  // Every built zone that meets a beach converges on the same sandy scrub the beach's upper edge turns into
  // (parks, yards and airfield grass do so in their own branches): the zone boundary is a jittered 10 m cell
  // lattice, and where the two sides differed (pavement against sand) it showed as a mosaic of squares along
  // the whole back of the beach (downtown waterfront, hotel frontages, marina lots)
  if (zone == 6 || zone == 7 || zone == 8 || zone == 9 || zone == 11 || zone == 13 || zone == 14 || zone == 15 || zone == 16 || zone == 18) {
    c = mix(c, sandyScrub(n1, n2, gd), sandy);
    rough = mix(rough, 0.9, sandy);
  }
  return c;
}
`;

const TERRAIN_FRAG_MAIN = /* glsl */ `
{
  // jittered zone lookup hides the cell grid of the zone map
  float cellSize = uWorldSize / uMapN;
  vec2 jitter = (hash22(floor(vWorldPos.xz * 0.5)) - 0.5) * cellSize * 1.35;
  vec4 zs = zoneCell(vWorldPos.xz + jitter);
  int zone = int(zs.r * 255.0 + 0.5);
  // The zone map's coastline (10 m cells) does not follow the waterline: sea cells (the nearshore is all
  // 'sandbar', map.ts) stand above the water for several metres along every shore. That rim is shaded as
  // the land behind it (the zone read 12 m uphill; the beach where that is sea too, as on a true bar), so
  // the zone boundary is never seen: the jittered cell edges between the sandbar rim and the beach were the
  // blocky mosaic along the old shoreline.
  if ((zone == 0 || zone == 1 || zone == 17) && vHeight > -0.05) {
    float sl = max(length(vSlope), 0.006);
    int land = int(zoneCell(vWorldPos.xz + vSlope / sl * 12.0).r * 255.0 + 0.5);
    zone = (land == 0 || land == 1 || land == 17) ? 2 : land;
  }
  vec3 smoothVE = zoneSmooth(vWorldPos.xz);
  float veg = smoothVE.x;
  float coast = (smoothVE.y - 0.5) * 512.0;
  float expo = smoothVE.z;
  float rough;
  // metres of ground per pixel: every procedural pattern fades before it goes subpixel
  gDwx = dFdx(vWorldPos.xz); gDwy = dFdy(vWorldPos.xz);
  float foot = length(abs(gDwx) + abs(gDwy));
  float beyond = smoothstep(uWorldSize * 0.5 - 350.0, uWorldSize * 0.5 + 250.0, max(abs(vWorldPos.x), abs(vWorldPos.z)));
  // the baked detail is clamped at the map edge, so it is faded out where the ground carries on beyond it
  vec4 det = texture2D(uDetailTex, (vWorldPos.xz + vec2(uWorldSize * 0.5 + MAP_HALF_CELL)) / uWorldSize) * (1.0 - beyond);
  det.g = mix(0.5, det.g, 1.0 - beyond);
  Ground gd;
  vec3 alb = zoneAlbedo(zone, vWorldPos.xz, vHeight, veg, coast, expo, det, foot, gd, rough);
  // streets of the district grids and the arterials, baked so the lattice survives to the horizon where the
  // road meshes are subpixel; the carriageway is dark, the verge beside it worn to dust and bare soil
  if (zone != 0 && zone != 1 && zone != 2 && zone != 17 && zone != 3 && zone != 12) {
    float carriage = smoothstep(0.55, 0.9, det.r);
    float verge = smoothstep(0.08, 0.5, det.r) * (1.0 - carriage);
    alb = mix(alb, vec3(0.048, 0.048, 0.048) * (0.92 + 0.16 * hash12(floor(vWorldPos.xz * 0.15))), carriage * 0.9);
    vec3 dust = vec3(0.21, 0.17, 0.105) * (0.8 + 0.4 * gd.soil);
    float worn = verge * (0.3 + 0.7 * max(gd.bare, gd.mesoBare * 0.6));
    alb = mix(alb, dust, worn * 0.7);
    alb = mix(alb, alb * 1.08 + 0.02, verge * 0.4);
    rough = mix(rough, 0.75, carriage);
  }
  // wet band right at the waterline for every land zone (beaches shade their own swash zone)
  if (zone != 0 && zone != 1 && zone != 2 && zone != 17) {
    float wetBand = 1.0 - smoothstep(0.05, 0.45, vHeight);
    alb = mix(alb, alb * 0.62, wetBand);
    rough = mix(rough, 0.55, wetBand);
  }
  // beyond the authored map the ground continues as the same kind of country: the clamped zone
  // texture gives a flat colour, so stamp tree cover and roof/lot patches on it so the sprawl
  // reads as endless texture fading into the haze instead of ending at a straight line
  if (beyond > 0.0) {
    float n5 = fbm3(vWorldPos.xz * 0.02 + 11.0);
    float n7 = fbm3(vWorldPos.xz * 0.0009 + 5.0);
    vec3 tree = vec3(0.015, 0.034, 0.009);
    vec3 farc = alb;
    if (zone == 19 || zone == 0 || zone == 1 || zone == 3) {
      farc = mix(farc, tree, smoothstep(0.48, 0.6, n5) * 0.85);
    } else {
      // the sprawl thins into farmland and scrub within a few kilometres of the map edge: fields with
      // hedgerows, then palmetto scrub and tree lines, the last subdivisions sitting in it as patches
      float outD = max(abs(vWorldPos.x), abs(vWorldPos.z)) - uWorldSize * 0.5;
      float rural = smoothstep(400.0, 3200.0, outD + 1400.0 * (n7 - 0.5));
      vec3 scrub = mix(vec3(0.17, 0.15, 0.056), tree, smoothstep(0.46, 0.6, n5) * 0.85);
      vec3 country = mix(farmland(vWorldPos.xz, n5), scrub, smoothstep(0.5, 0.66, fbm3(vWorldPos.xz * 0.0007 + 2.0)));
      // beyond the farms the coastal plain gives way to the sawgrass wetland
      vec3 marsh = mix(vec3(0.21, 0.20, 0.078), vec3(0.12, 0.135, 0.055), smoothstep(0.35, 0.65, n5));
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

/** After normal_fragment_maps: tilt the shading normal by the ground detail's slope (sand ripples, footprints). */
const TERRAIN_FRAG_NORMAL = /* glsl */ `
if (dot(gDetailSlope, gDetailSlope) > 1e-7) {
  vec3 wN = inverseTransformDirection(normal, viewMatrix);
  wN = normalize(wN + vec3(gDetailSlope.x, 0.0, gDetailSlope.y));
  normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);
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
      uGroundTex: { value: textures.groundDetail.ground },
      uSandTex: { value: textures.groundDetail.sand },
      uGroundMean: { value: textures.groundDetail.groundMean },
      uSandMean: { value: textures.groundDetail.sandMean },
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
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${TERRAIN_FRAG_MAIN}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${TERRAIN_FRAG_NORMAL}`);
      balanceGroundIbl(shader);
    };
    mat.customProgramCacheKey = () => 'terrain-v6';
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
