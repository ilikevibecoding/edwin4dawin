import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { MAP_N, WORLD_SIZE } from './map';
import type { MapTextures } from './terrain';

const WATER_VERT_PARS = /* glsl */ `
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
`;
const WATER_VERT_MAIN = /* glsl */ `
vec3 wp = position + uWaterOffset;
wp.y = 0.0;
vWorldPos = wp;
`;

const WATER_FRAG_PARS = /* glsl */ `
uniform sampler2D uHeightTex;
uniform sampler2D uZoneTex;
uniform sampler2D uWakeTex;
uniform vec4 uWakeRegion; // center.xy, size, unused
uniform float uWorldSize;
uniform float uWaveTime;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform vec3 uSunDirW;
varying vec3 vWorldPos;
${GLSL_NOISE}
float terrainHeightW(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uHeightTex, uv).r;
}
// analytic-derivative value noise for wave normals
vec3 noised(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  float k0 = a, k1 = b - a, k2 = c - a, k3 = a - b - c + d;
  return vec3(k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y, du * vec2(k1 + k3 * u.y, k2 + k3 * u.x));
}
vec3 waveNormal(vec2 wp, float depth, float dist) {
  float t = uWaveTime;
  vec2 wd = uWindDir;
  vec2 wp2 = vec2(wd.y, -wd.x);
  float shallow = smoothstep(0.3, 4.0, depth);
  float sea = smoothstep(4.0, 12.0, depth);
  // distance fades the fine layers to avoid shimmering far away
  float f1 = 1.0 - smoothstep(600.0, 3000.0, dist);
  float f2 = 1.0 - smoothstep(150.0, 900.0, dist);
  float f3 = 1.0 - smoothstep(40.0, 300.0, dist);
  vec2 g = vec2(0.0);
  // each layer contributes a slope (dimensionless); noised() derivatives are O(1) per cell
  vec3 n0 = noised(wp * 0.018 + wd * t * 0.35);
  g += n0.yz * 0.05 * sea;
  vec3 n1 = noised(wp * 0.075 + wd * t * 0.7 + 3.1);
  g += n1.yz * 0.12 * (0.4 + 0.6 * shallow) * f1;
  vec3 n2 = noised(wp * 0.21 - wp2 * t * 0.4 + wd * t * 0.9 + 7.7);
  g += n2.yz * 0.10 * (0.5 + 0.5 * shallow) * f2;
  vec3 n3 = noised(wp * 0.7 + wd * t * 1.6 + 11.3);
  g += n3.yz * 0.07 * f3;
  float wind = 0.5 + 0.5 * clamp(uWindSpeed / 12.0, 0.0, 1.5);
  g *= wind;
  return normalize(vec3(-g.x, 1.0, -g.y));
}
vec3 seabedAlbedo(vec2 wp, float depth) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  float n2 = fbm3(wp * 0.045);
  vec3 sand = mix(vec3(0.72, 0.66, 0.50), vec3(0.86, 0.82, 0.68), 1.0 - smoothstep(0.2, 1.4, depth));
  vec3 grass = vec3(0.16, 0.24, 0.13);
  float sg = smoothstep(0.55, 0.75, fbm3(wp * 0.012 + 3.0)) * smoothstep(0.6, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
  vec3 c = mix(sand, grass, sg) * (0.9 + 0.2 * n2);
  return c;
}
`;

const WATER_FRAG_MAIN = /* glsl */ `
{
  float terrainH = terrainHeightW(vWorldPos.xz);
  float depth = -terrainH;
  if (depth < -0.05) discard;
  depth = max(depth, 0.0);
  vec3 toCam = cameraPosition - vWorldPos;
  float dist = length(toCam);
  vec3 V = toCam / max(dist, 1e-3);

  vec3 wn = waveNormal(vWorldPos.xz, depth, dist);
  // wakes: r = foam, gb = normal perturbation
  vec2 wuv = (vWorldPos.xz - uWakeRegion.xy) / uWakeRegion.z + 0.5;
  vec4 wake = vec4(0.0);
  if (all(greaterThan(wuv, vec2(0.0))) && all(lessThan(wuv, vec2(1.0)))) wake = texture2D(uWakeTex, wuv);
  wn = normalize(wn + vec3(wake.g - 0.5, 0.0, wake.b - 0.5) * 2.0 * wake.a * 0.9);
  // flatten toward the horizon to keep reflections stable
  wn = normalize(mix(wn, vec3(0.0, 1.0, 0.0), smoothstep(2500.0, 9000.0, dist)));
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
  nonPerturbedNormal = normal;

  // --- body colour: sunlight transmitted to the seabed and back plus in-water scattering
  vec3 absorb = vec3(0.42, 0.11, 0.055);
  float pathLen = depth * (1.0 + 1.0 / max(V.y, 0.25));
  vec3 T = exp(-absorb * pathLen);
  vec3 seabed = seabedAlbedo(vWorldPos.xz, depth);
  vec3 scatterCol = vec3(0.02, 0.24, 0.30);
  vec3 deepCol = vec3(0.004, 0.035, 0.085);
  float sAmt = 1.0 - exp(-depth * 0.22);
  vec3 body = seabed * T * (1.0 - sAmt * 0.6) + mix(scatterCol, deepCol, smoothstep(3.0, 18.0, depth)) * sAmt * 1.6;
  // turbidity near mangroves / flats
  float turbid = smoothstep(1.2, 0.0, depth) * 0.25;
  body = mix(body, vec3(0.35, 0.36, 0.25), turbid * (1.0 - smoothstep(0.0, 0.3, depth)) * 0.5);

  // --- foam: shoreline, surf lines, whitecaps and wakes
  float foamNoise = fbm3(vWorldPos.xz * 0.35 + vec2(uWaveTime * 0.25, -uWaveTime * 0.15));
  float shoreFoam = (1.0 - smoothstep(0.0, 0.55, depth)) * smoothstep(0.5, 0.8, foamNoise + 0.2 * sin(uWaveTime * 1.4 + depth * 6.0) + 0.15 * fbm3(vWorldPos.xz * 0.02));
  float surf = smoothstep(0.9, 1.0, sin(depth * 2.4 - uWaveTime * 1.3 + fbm3(vWorldPos.xz * 0.02) * 4.0)) * smoothstep(3.0, 1.2, depth) * smoothstep(0.6, 1.4, depth) * smoothstep(0.5, 0.65, foamNoise) * smoothstep(3.0, 6.0, uWindSpeed);
  float whitecap = smoothstep(0.78, 0.9, vnoise(vWorldPos.xz * 0.05 + uWindDir * uWaveTime * 0.8)) * smoothstep(6.0, 14.0, uWindSpeed) * smoothstep(3.0, 8.0, depth) * (1.0 - smoothstep(800.0, 3000.0, dist));
  float foam = clamp(shoreFoam + surf * 0.8 + whitecap * 0.6 + wake.r, 0.0, 1.0);
  vec3 foamCol = vec3(0.86, 0.9, 0.9);
  float waveShade = 0.85 + 0.3 * clamp(dot(wn, normalize(uSunDirW + vec3(0.0, 0.6, 0.0))), 0.0, 1.0);
  body *= waveShade;
  diffuseColor.rgb = mix(body, foamCol, foam);
  // roughness: mirror-like water, rough foam, rougher with distance to suppress sparkle aliasing
  roughnessFactor = mix(mix(0.045, 0.16, smoothstep(300.0, 6000.0, dist)), 0.85, foam);
  metalnessFactor = 0.0;
}
`;

export class Water {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  private readonly offset = { value: new THREE.Vector3() };
  readonly uniforms: Record<string, THREE.IUniform>;

  constructor(textures: MapTextures, wakeTex: THREE.Texture) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.0 });
    mat.envMapIntensity = 1.35;
    this.uniforms = {
      uHeightTex: { value: textures.height },
      uZoneTex: { value: textures.zone },
      uWakeTex: { value: wakeTex },
      uWakeRegion: { value: new THREE.Vector4(0, 0, 3000, 0) },
      uWaterOffset: this.offset,
      uWorldSize: { value: WORLD_SIZE },
      uWaveTime: { value: 0 },
      uWindSpeed: { value: 6 },
      uWindDir: { value: new THREE.Vector2(0.94, 0.34) },
      uSunDirW: { value: new THREE.Vector3(0, 1, 0) },
    };
    const uniforms = this.uniforms;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      prev?.(shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${WATER_VERT_PARS}`)
        .replace('#include <begin_vertex>', `${WATER_VERT_MAIN}\nvec3 transformed = wp;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${WATER_FRAG_PARS}`)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>\n${WATER_FRAG_MAIN}`);
    };
    mat.customProgramCacheKey = () => 'water-v1';
    this.material = mat;

    // A flat grid: the water is displaced only by normals, but a modest tessellation keeps
    // interpolation of the huge quad numerically friendly.
    const size = 70000;
    const geo = new THREE.PlaneGeometry(size, size, 48, 48);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 5;
    void MAP_N;
  }

  update(camX: number, camZ: number, time: number, windSpeed: number, windDir: THREE.Vector2, sunDir: THREE.Vector3, wakeCenter: THREE.Vector2, wakeSize: number): void {
    this.offset.value.set(Math.round(camX / 50) * 50, 0, Math.round(camZ / 50) * 50);
    this.uniforms.uWaveTime.value = time;
    this.uniforms.uWindSpeed.value = windSpeed;
    this.uniforms.uWindDir.value.copy(windDir);
    this.uniforms.uSunDirW.value.copy(sunDir);
    this.uniforms.uWakeRegion.value.set(wakeCenter.x, wakeCenter.y, wakeSize, 0);
  }
}
