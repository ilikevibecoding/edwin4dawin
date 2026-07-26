import * as THREE from 'three';
import { Effect, EffectAttribute } from 'postprocessing';

/**
 * Depth-aware atmospheric scattering.
 *
 * Combines exponential height fog with a Henyey-Greenstein in-scattering term
 * so surfaces facing the sun pick up a warm haze while shadowed geometry stays
 * cool. The result is the "aerial perspective" that separates near and far
 * geometry and does most of the heavy lifting for outdoor depth cueing.
 *
 * Fog is integrated analytically along the view ray rather than raymarched,
 * so cost is a single dependent texture read plus ALU.
 */
const fragment = /* glsl */ `
uniform vec3  uSunDirection;
uniform vec3  uSunColor;
uniform vec3  uFogColor;
uniform vec3  uFogColorGround;
uniform vec3  uCameraPos;
uniform mat4  uInvProjection;
uniform mat4  uCamToWorld;
uniform float uDensity;
uniform float uHeightFalloff;
uniform float uFogBase;
uniform float uInscatterIntensity;
uniform float uAnisotropy;
uniform float uMaxOpacity;
uniform float uStartDistance;
uniform float uSunDiscIntensity;
uniform float uNoiseAmount;
uniform float uTime;

// Henyey-Greenstein phase function: forward-scattering lobe toward the sun.
float hg(float cosTheta, float g) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * 3.14159265 * pow(max(denom, 1e-4), 1.5));
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec3 worldPosFromDepth(vec2 uv, float depth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 view = uInvProjection * clip;
  view /= view.w;
  return (uCamToWorld * view).xyz;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec3 worldPos = worldPosFromDepth(uv, depth);
  vec3 toFrag = worldPos - uCameraPos;
  float dist = length(toFrag);
  vec3 dir = dist > 1e-4 ? toFrag / dist : vec3(0.0, 0.0, -1.0);

  bool isSky = depth >= 0.9999;
  // Push sky samples out to a fixed depth so fog saturates cleanly.
  if (isSky) dist = 6000.0;

  float travel = max(0.0, dist - uStartDistance);

  // Analytic integral of density * exp(-falloff * (y - base)) along the ray.
  float camH = uCameraPos.y - uFogBase;
  float dy = dir.y;
  float k = uHeightFalloff;
  float opticalDepth;
  if (abs(dy) < 1e-4) {
    opticalDepth = uDensity * exp(-k * camH) * travel;
  } else {
    float startH = camH + dy * uStartDistance;
    float a = exp(-k * startH);
    float b = exp(-k * (camH + dy * dist));
    opticalDepth = uDensity * (a - b) / (k * dy);
  }
  opticalDepth = max(opticalDepth, 0.0);

  // Break up banding in large uniform fog volumes.
  float grain = (hash13(vec3(uv * 1024.0, floor(uTime * 24.0))) - 0.5) * uNoiseAmount;
  opticalDepth *= 1.0 + grain;

  float fogAmount = 1.0 - exp(-opticalDepth);
  fogAmount = min(fogAmount, uMaxOpacity);

  float cosTheta = dot(dir, uSunDirection);

  // Two-lobe scattering: a broad ambient lobe plus a tight forward lobe.
  float phaseBroad = hg(cosTheta, uAnisotropy * 0.35);
  float phaseTight = hg(cosTheta, uAnisotropy);
  float inscatter = (phaseBroad * 0.55 + phaseTight * 1.9) * uInscatterIntensity;

  // Fog tint gets darker and cooler near the ground, brighter toward the sky.
  float heightMix = clamp((worldPos.y - uFogBase) * 0.035, 0.0, 1.0);
  heightMix = mix(heightMix, 1.0, float(isSky));
  vec3 baseFog = mix(uFogColorGround, uFogColor, heightMix);

  vec3 scattered = baseFog + uSunColor * inscatter;

  // Distant sun disc bleed for haze around the light source.
  if (isSky) {
    float disc = pow(max(cosTheta, 0.0), 900.0);
    float halo = pow(max(cosTheta, 0.0), 12.0) * 0.28;
    scattered += uSunColor * (disc * uSunDiscIntensity + halo);
  }

  vec3 color = mix(inputColor.rgb, scattered, fogAmount);
  outputColor = vec4(color, inputColor.a);
}
`;

export interface AtmosphereOptions {
  density?: number;
  heightFalloff?: number;
  fogBase?: number;
  color?: THREE.Color;
  groundColor?: THREE.Color;
  sunColor?: THREE.Color;
  inscatter?: number;
  anisotropy?: number;
  maxOpacity?: number;
  startDistance?: number;
  sunDisc?: number;
}

export class AtmosphereEffect extends Effect {
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera, opts: AtmosphereOptions = {}) {
    super('AtmosphereEffect', fragment, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ['uSunDirection', new THREE.Uniform(new THREE.Vector3(0.4, 0.5, 0.3).normalize())],
        ['uSunColor', new THREE.Uniform(opts.sunColor?.clone() ?? new THREE.Color(1.0, 0.82, 0.62))],
        ['uFogColor', new THREE.Uniform(opts.color?.clone() ?? new THREE.Color(0.52, 0.6, 0.72))],
        [
          'uFogColorGround',
          new THREE.Uniform(opts.groundColor?.clone() ?? new THREE.Color(0.22, 0.25, 0.31)),
        ],
        ['uCameraPos', new THREE.Uniform(new THREE.Vector3())],
        ['uInvProjection', new THREE.Uniform(new THREE.Matrix4())],
        ['uCamToWorld', new THREE.Uniform(new THREE.Matrix4())],
        ['uDensity', new THREE.Uniform(opts.density ?? 0.016)],
        ['uHeightFalloff', new THREE.Uniform(opts.heightFalloff ?? 0.055)],
        ['uFogBase', new THREE.Uniform(opts.fogBase ?? -1)],
        ['uInscatterIntensity', new THREE.Uniform(opts.inscatter ?? 1.5)],
        ['uAnisotropy', new THREE.Uniform(opts.anisotropy ?? 0.76)],
        ['uMaxOpacity', new THREE.Uniform(opts.maxOpacity ?? 0.96)],
        ['uStartDistance', new THREE.Uniform(opts.startDistance ?? 1.5)],
        ['uSunDiscIntensity', new THREE.Uniform(opts.sunDisc ?? 6)],
        ['uNoiseAmount', new THREE.Uniform(0.035)],
        ['uTime', new THREE.Uniform(0)],
      ]),
    });
    this.camera = camera;
  }

  setSun(direction: THREE.Vector3, color: THREE.Color) {
    (this.uniforms.get('uSunDirection')!.value as THREE.Vector3).copy(direction).normalize();
    (this.uniforms.get('uSunColor')!.value as THREE.Color).copy(color);
  }

  setFogColors(sky: THREE.Color, ground: THREE.Color) {
    (this.uniforms.get('uFogColor')!.value as THREE.Color).copy(sky);
    (this.uniforms.get('uFogColorGround')!.value as THREE.Color).copy(ground);
  }

  set density(v: number) {
    this.uniforms.get('uDensity')!.value = v;
  }
  get density(): number {
    return this.uniforms.get('uDensity')!.value as number;
  }

  set inscatter(v: number) {
    this.uniforms.get('uInscatterIntensity')!.value = v;
  }

  update(_renderer: THREE.WebGLRenderer, _input: THREE.WebGLRenderTarget, dt: number) {
    const cam = this.camera;
    cam.updateMatrixWorld();
    (this.uniforms.get('uCameraPos')!.value as THREE.Vector3).setFromMatrixPosition(cam.matrixWorld);
    (this.uniforms.get('uInvProjection')!.value as THREE.Matrix4).copy(
      cam.projectionMatrixInverse
    );
    (this.uniforms.get('uCamToWorld')!.value as THREE.Matrix4).copy(cam.matrixWorld);
    this.uniforms.get('uTime')!.value = (this.uniforms.get('uTime')!.value as number) + dt;
  }
}
