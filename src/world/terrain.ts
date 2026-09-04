import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { HALF, MAP_N, WORLD_SIZE, type WorldMap } from './map';

/**
 * Sky-light white balance for the world surfaces (terrain, roads, planting, shoreline props).
 * The sky dome's image-based light delivers about 2.5x the sun's blue irradiance on a horizontal
 * surface (with `scene.environmentIntensity = 0` the beaches render tan, with it they render
 * blue-grey), so every warm albedo takes a blue cast. Desaturating the diffuse sky irradiance keeps
 * its brightness but lets sand read as sand and foliage as green, the way a camera's white balance
 * neutralises skylight. Remove this hook once the atmosphere's ambient is rebalanced globally.
 */
export const GROUND_IBL_BALANCE = /* glsl */ `
#include <lights_fragment_maps>
iblIrradiance = mix(iblIrradiance, vec3(dot(iblIrradiance, vec3(0.2126, 0.7152, 0.0722))), 0.75) * 0.85;
`;
export function balanceGroundIbl(shader: { fragmentShader: string }): void {
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_maps>', GROUND_IBL_BALANCE);
}

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
vec3 zoneAlbedo(int zone, vec2 wp, float h, float veg, float coast, float expo, out float rough) {
  float n1 = vnoise(wp * 0.35);
  float n2 = fbm3(wp * 0.045);
  float n3 = vnoise(wp * 0.008);
  float n4 = fbm3(wp * 0.0032 + 17.0);
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
    vec3 wet = vec3(0.40, 0.33, 0.23);
    // swash zone widens with wave exposure; a darker saturated band sits right at the waterline
    float swash = 0.35 + 0.45 * expo;
    float wetness = 1.0 - smoothstep(0.18, swash + 0.35, h);
    c = mix(dry, wet, wetness) * (0.92 + 0.16 * n2) * (0.95 + 0.1 * n1);
    c = mix(c, vec3(0.28, 0.25, 0.20), (1.0 - smoothstep(0.05, 0.3, h)) * 0.6);
    // tide marks: thin wrack lines that wander along the beach
    float tide1 = 1.0 - smoothstep(0.0, 0.045, abs(h - (swash + 0.12 + 0.06 * n2)));
    float tide2 = 1.0 - smoothstep(0.0, 0.03, abs(h - (swash + 0.28 + 0.05 * n1)));
    c *= 1.0 - 0.18 * tide1 * (0.5 + 0.5 * n1) - 0.1 * tide2;
    // sea oats and dune scrub clumps on the upper beach
    float dune = smoothstep(1.15, 1.7, h) * smoothstep(0.52, 0.7, vnoise(wp * 0.22 + 4.0));
    c = mix(c, vec3(0.34, 0.36, 0.17) * (0.85 + 0.3 * n1), dune * 0.7);
    rough = mix(0.95, 0.72, wetness);
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
    // suburbs: lawns, dry yards and pale sandy lots, darkening under the street trees
    c = openGround(wp, n1, n2, n3, n4, 0.45);
    vec3 lot = vec3(0.54, 0.49, 0.41);
    c = mix(c, lot, smoothstep(0.55, 0.7, fbm3(wp * 0.03 + 5.0)) * 0.8);
    c = mix(c, canopyFloor(wp, n1, n2), canopy * 0.85);
    c = mix(c, vec3(0.64, 0.57, 0.42) * (0.92 + 0.16 * n2), sandy);
  } else if (zone == 19) {
    // sawgrass marsh: tan-green prairie, dark tree islands (hammocks) where the canopy is dense, brown pools
    vec3 saw = mix(vec3(0.50, 0.49, 0.25), vec3(0.36, 0.41, 0.17), smoothstep(0.35, 0.65, n2));
    c = saw * (0.9 + 0.2 * n1);
    c = mix(c, canopyFloor(wp, n1, n2), canopy);
    c = mix(c, vec3(0.16, 0.15, 0.10), 1.0 - smoothstep(-0.05, 0.2, h));
    rough = 0.85;
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
  vec3 alb = zoneAlbedo(zone, vWorldPos.xz, vHeight, veg, coast, expo, rough);
  // wet band right at the waterline for every land zone (beaches shade their own swash zone)
  if (zone != 0 && zone != 1 && zone != 2 && zone != 17) {
    float wetBand = 1.0 - smoothstep(0.05, 0.45, vHeight);
    alb = mix(alb, alb * 0.62, wetBand);
    rough = mix(rough, 0.7, wetBand);
  }
  // beyond the authored map the ground continues as the same kind of country: the clamped zone
  // texture gives a flat colour, so stamp tree cover and roof/lot patches on it so the sprawl
  // reads as endless texture fading into the haze instead of ending at a straight line
  float beyond = smoothstep(uWorldSize * 0.5 - 350.0, uWorldSize * 0.5 + 250.0, max(abs(vWorldPos.x), abs(vWorldPos.z)));
  if (beyond > 0.0) {
    float n5 = fbm3(vWorldPos.xz * 0.02 + 11.0);
    float n6 = vnoise(vWorldPos.xz * 0.035 + 4.0);
    vec3 tree = vec3(0.09, 0.16, 0.06);
    vec3 farc = alb;
    if (zone != 19) farc = mix(farc, vec3(0.52, 0.49, 0.44), smoothstep(0.55, 0.62, n6) * 0.7);
    farc = mix(farc, tree, smoothstep(0.48, 0.6, n5) * 0.85);
    alb = mix(alb, farc, beyond);
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
      balanceGroundIbl(shader);
    };
    mat.customProgramCacheKey = () => 'terrain-v3';
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
