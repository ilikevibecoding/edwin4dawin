import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { HALF, MAP_N, WORLD_SIZE, type WorldMap } from './map';

/** GPU textures shared by terrain, water and anything that needs to know the ground height. */
export class MapTextures {
  height: THREE.DataTexture;
  zone: THREE.DataTexture;

  constructor(map: WorldMap, renderer: THREE.WebGLRenderer) {
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

    const z = new Uint8Array(MAP_N * MAP_N * 4);
    for (let i = 0; i < MAP_N * MAP_N; i++) {
      z[i * 4] = map.zone[i];
      z[i * 4 + 1] = map.veg[i];
      const c = map.coast[i];
      z[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(128 + c * 0.5)));
      z[i * 4 + 3] = 255;
    }
    this.zone = new THREE.DataTexture(z, MAP_N, MAP_N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.zone.minFilter = THREE.NearestFilter;
    this.zone.magFilter = THREE.NearestFilter;
    this.zone.wrapS = this.zone.wrapT = THREE.ClampToEdgeWrapping;
    this.zone.generateMipmaps = false;
    this.zone.needsUpdate = true;
  }
}

const RING_CELLS = 96; // cells across each ring (must be a multiple of 4)
const BASE_CELL = 8; // metres, finest ring
const RINGS = 7; // 8m .. 512m cells; outermost ring spans ±(96*512/2) = ±24.5km

function buildRing(level: number, hollow: boolean): THREE.BufferGeometry {
  const cell = BASE_CELL * 2 ** level;
  const n = RING_CELLS;
  const half = (n * cell) / 2;
  const innerStart = n / 4, innerEnd = (3 * n) / 4; // hollow region indices
  const positions: number[] = [];
  const edge: number[] = [];
  const index: number[] = [];
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
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = vid[j * (n + 1) + i], b = vid[j * (n + 1) + i + 1], c = vid[(j + 1) * (n + 1) + i], d = vid[(j + 1) * (n + 1) + i + 1];
      if (a < 0 || b < 0 || c < 0 || d < 0) continue;
      // alternate diagonal for a less regular tessellation
      if (((i + j) & 1) === 0) index.push(a, c, b, b, c, d);
      else index.push(a, d, b, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), half * 1.5 + 200);
  return g;
}

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
vec3 zoneAlbedo(int zone, vec2 wp, float h, float veg, float coast, out float rough) {
  float n1 = vnoise(wp * 0.35);
  float n2 = fbm3(wp * 0.045);
  float n3 = vnoise(wp * 0.008);
  rough = 0.9;
  vec3 c;
  if (zone == 0 || zone == 1) {
    // seabed: sand with seagrass patches in the shallows
    vec3 sand = vec3(0.72, 0.66, 0.50);
    vec3 grass = vec3(0.16, 0.24, 0.13);
    float depth = -h;
    float sg = smoothstep(0.55, 0.75, fbm3(wp * 0.012 + 3.0)) * smoothstep(0.6, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
    c = mix(sand, grass, sg) * (0.9 + 0.2 * n2);
    c = mix(c, vec3(0.28, 0.32, 0.30), smoothstep(12.0, 30.0, depth));
  } else if (zone == 17) {
    c = vec3(0.86, 0.82, 0.68) * (0.92 + 0.16 * n2);
  } else if (zone == 2) {
    vec3 dry = vec3(0.74, 0.69, 0.60);
    vec3 wet = vec3(0.50, 0.46, 0.40);
    float wetness = 1.0 - smoothstep(0.25, 0.9, h);
    c = mix(dry, wet, wetness) * (0.92 + 0.16 * n2) * (0.95 + 0.1 * n1);
    // tide lines
    c *= 1.0 - 0.08 * smoothstep(0.35, 0.4, h) * (1.0 - smoothstep(0.4, 0.5, h));
    rough = mix(0.95, 0.55, wetness);
  } else if (zone == 3) {
    vec3 mud = vec3(0.30, 0.26, 0.18);
    vec3 canopy = vec3(0.10, 0.20, 0.09);
    c = mix(mud, canopy, smoothstep(0.35, 0.65, n2 + 0.15 * n1)) * (0.9 + 0.2 * n1);
  } else if (zone == 4) {
    c = mix(vec3(0.16, 0.30, 0.10), vec3(0.27, 0.37, 0.15), n2) * (0.9 + 0.2 * n1);
    c = mix(c, vec3(0.42, 0.38, 0.26), smoothstep(0.62, 0.72, n3) * 0.6);
  } else if (zone == 11) {
    c = mix(vec3(0.22, 0.48, 0.12), vec3(0.32, 0.56, 0.16), n2) * (0.92 + 0.16 * n1);
    // bunkers
    float bunker = smoothstep(0.66, 0.72, fbm3(wp * 0.02 + 9.0));
    c = mix(c, vec3(0.9, 0.86, 0.7), bunker);
    // fairway stripes
    c *= 1.0 + 0.05 * sin(wp.x * 0.35 + wp.y * 0.12);
  } else if (zone == 5) {
    vec3 lawn = mix(vec3(0.20, 0.36, 0.12), vec3(0.34, 0.40, 0.18), n2);
    vec3 lot = vec3(0.50, 0.47, 0.42);
    c = mix(lawn, lot, smoothstep(0.55, 0.7, fbm3(wp * 0.03 + 5.0))) * (0.9 + 0.2 * n1);
  } else if (zone == 6 || zone == 8) {
    c = mix(vec3(0.36, 0.35, 0.33), vec3(0.48, 0.46, 0.42), n2) * (0.92 + 0.16 * n1);
    c = mix(c, vec3(0.22, 0.34, 0.14), smoothstep(0.6, 0.75, fbm3(wp * 0.02 + 1.0)) * 0.7);
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
    c = mix(vec3(0.42, 0.38, 0.33), vec3(0.22, 0.2, 0.18), smoothstep(0.4, 0.7, n2)) * (0.85 + 0.3 * n1);
    rough = 0.85;
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
  float veg = zs.g;
  float coast = (zs.b - 0.5) * 512.0;
  float rough;
  vec3 alb = zoneAlbedo(zone, vWorldPos.xz, vHeight, veg, coast, rough);
  // wet band right at the waterline for every land zone
  if (zone != 0 && zone != 1) {
    float wetBand = 1.0 - smoothstep(0.05, 0.45, vHeight);
    alb = mix(alb, alb * 0.62, wetBand);
    rough = mix(rough, 0.45, wetBand);
  }
  diffuseColor.rgb *= alb;
  roughnessFactor = rough;
}
`;

export class Terrain {
  readonly group = new THREE.Group();
  readonly material: THREE.MeshStandardMaterial;
  private readonly rings: THREE.Mesh[] = [];
  private readonly offsetUniform = { value: new THREE.Vector3() };

  constructor(readonly textures: MapTextures) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
    const uniforms = {
      uHeightTex: { value: textures.height },
      uZoneTex: { value: textures.zone },
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
    };
    mat.customProgramCacheKey = () => 'terrain-v1';
    this.material = mat;
    for (let level = 0; level < RINGS; level++) {
      const geo = buildRing(level, level > 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.matrixAutoUpdate = false;
      this.rings.push(mesh);
      this.group.add(mesh);
    }
  }

  /** Shift the clipmap so it is centred on the camera. All rings share one centre, so their borders
   *  coincide exactly; snapping to two fine cells keeps ring 0 and ring 1 on the same lattice. */
  update(camX: number, camZ: number): void {
    const snap = BASE_CELL * 2;
    const sx = Math.round(camX / snap) * snap;
    const sz = Math.round(camZ / snap) * snap;
    this.offsetUniform.value.set(sx, 0, sz);
  }
}

/** Height lookup helper matching the GPU sampling (bilinear on the same texture data). */
export function terrainHeightAt(map: WorldMap, x: number, z: number): number {
  const cx = Math.max(-HALF, Math.min(HALF - 1, x));
  const cz = Math.max(-HALF, Math.min(HALF - 1, z));
  return map.heightAt(cx, cz);
}
