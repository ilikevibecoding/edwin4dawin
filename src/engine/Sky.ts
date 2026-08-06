/**
 * Procedural HDR skies. A sky shader is rendered into a cube render target,
 * which serves both as the visible background and as the source for a
 * pre-filtered radiance environment map (IBL). No HDRI files required.
 */
import * as THREE from 'three';

export type SkyPreset = 'nightRain' | 'nightCity' | 'dawn' | 'overcast' | 'interiorNight' | 'voidWhite';

export interface SkyConfig {
  horizon: THREE.ColorRepresentation;
  zenith: THREE.ColorRepresentation;
  /** Light spilling up from the city below the camera. */
  groundGlow: THREE.ColorRepresentation;
  cloudCover: number;
  cloudSharpness: number;
  cloudBrightness: number;
  sunDirection: THREE.Vector3;
  sunColor: THREE.ColorRepresentation;
  sunIntensity: number;
  sunSize: number;
  stars: number;
}

export const SKY_PRESETS: Record<SkyPreset, SkyConfig> = {
  nightRain: {
    horizon: 0x2a2033,
    zenith: 0x05070f,
    groundGlow: 0x40251c,
    cloudCover: 0.82,
    cloudSharpness: 1.35,
    cloudBrightness: 0.5,
    sunDirection: new THREE.Vector3(-0.35, 0.28, -0.9).normalize(),
    sunColor: 0x9fb6ff,
    sunIntensity: 0.35,
    sunSize: 0.02,
    stars: 0,
  },
  nightCity: {
    horizon: 0x3a2a3a,
    zenith: 0x070a16,
    groundGlow: 0x5a3320,
    cloudCover: 0.55,
    cloudSharpness: 1.1,
    cloudBrightness: 0.62,
    sunDirection: new THREE.Vector3(0.4, 0.35, -0.8).normalize(),
    sunColor: 0xbcd0ff,
    sunIntensity: 0.5,
    sunSize: 0.014,
    stars: 0.35,
  },
  dawn: {
    horizon: 0xffb680,
    zenith: 0x2a4a80,
    groundGlow: 0x704838,
    cloudCover: 0.5,
    cloudSharpness: 0.9,
    cloudBrightness: 1.5,
    sunDirection: new THREE.Vector3(0.55, 0.1, -0.82).normalize(),
    sunColor: 0xffd0a0,
    sunIntensity: 3.2,
    sunSize: 0.028,
    stars: 0,
  },
  overcast: {
    horizon: 0xb8bec8,
    zenith: 0x8a97ab,
    groundGlow: 0x6a6a68,
    cloudCover: 0.95,
    cloudSharpness: 0.6,
    cloudBrightness: 1.9,
    sunDirection: new THREE.Vector3(0.2, 0.6, -0.6).normalize(),
    sunColor: 0xffffff,
    sunIntensity: 0.6,
    sunSize: 0.06,
    stars: 0,
  },
  interiorNight: {
    horizon: 0x1c2028,
    zenith: 0x0a0c11,
    groundGlow: 0x241c18,
    cloudCover: 1,
    cloudSharpness: 0.4,
    cloudBrightness: 0.24,
    sunDirection: new THREE.Vector3(0.3, 0.5, -0.7).normalize(),
    sunColor: 0x8899bb,
    sunIntensity: 0.1,
    sunSize: 0.02,
    stars: 0,
  },
  voidWhite: {
    horizon: 0xf2f6ff,
    zenith: 0xdfe8f7,
    groundGlow: 0xffffff,
    cloudCover: 0,
    cloudSharpness: 0.5,
    cloudBrightness: 1,
    sunDirection: new THREE.Vector3(0.2, 0.8, -0.4).normalize(),
    sunColor: 0xffffff,
    sunIntensity: 1.2,
    sunSize: 0.05,
    stars: 0,
  },
};

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform float uSunSize;
uniform float uCloudCover;
uniform float uCloudSharp;
uniform float uCloudBright;
uniform float uStars;
uniform float uTime;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 p = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(p), hash(p + vec3(1,0,0)), f.x), mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)), f.x), mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) { s += a * vnoise(p); p = p * 2.02 + vec3(11.3, 7.7, 3.1); a *= 0.5; }
  return s;
}

void main() {
  vec3 d = normalize(vDir);
  float up = d.y;
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(up, 0.0, 1.0), 0.42));
  sky += uHorizon * exp(-abs(up) * 7.0) * 0.7;

  // Light bouncing off the city below the horizon
  float below = clamp(-up, 0.0, 1.0);
  sky = mix(sky, uGround, smoothstep(0.0, 0.5, below));
  sky += uGround * exp(-below * 3.0) * 0.35;

  if (uCloudCover > 0.001) {
    // Sample on a flattened dome so clouds stretch toward the horizon
    vec3 cp = d / max(abs(d.y) + 0.16, 0.001);
    cp.xz *= 0.55;
    cp += vec3(uTime * 0.006, 0.0, uTime * 0.0025);
    float n = fbm(cp * 1.5);
    float n2 = fbm(cp * 4.0 + vec3(3.0, 1.0, 2.0));
    float cloud = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.42 / uCloudSharp, n * 0.75 + n2 * 0.35);
    cloud *= smoothstep(-0.06, 0.16, up);
    float toSun = max(dot(d, uSunDir), 0.0);
    vec3 cloudCol = mix(uGround * 1.1, uHorizon * 1.6, 0.45) * uCloudBright;
    cloudCol += uSunColor * pow(toSun, 6.0) * uSunIntensity * 0.5;
    cloudCol *= 0.55 + 0.75 * (1.0 - n);
    sky = mix(sky, cloudCol, clamp(cloud, 0.0, 1.0) * 0.92);
  }

  if (uStars > 0.001) {
    float st = hash(floor(d * 260.0));
    float star = smoothstep(0.9975, 1.0, st) * uStars;
    star *= smoothstep(0.02, 0.35, up) * (1.0 - uCloudCover * 0.85);
    sky += vec3(star) * (0.6 + 0.4 * sin(uTime * 2.0 + st * 40.0));
  }

  float sd = max(dot(d, uSunDir), 0.0);
  sky += uSunColor * smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.35, sd) * uSunIntensity * 6.0;
  sky += uSunColor * pow(sd, 22.0) * uSunIntensity * 0.8;
  sky += uSunColor * pow(sd, 3.0) * uSunIntensity * 0.05;

  gl_FragColor = vec4(max(sky, vec3(0.0)), 1.0);
}
`;

export interface SkyResult {
  background: THREE.CubeTexture;
  readonly environment: THREE.Texture;
  config: SkyConfig;
  update: (time: number) => void;
  dispose: () => void;
}

export function buildSky(
  renderer: THREE.WebGLRenderer,
  preset: SkyPreset | SkyConfig,
  opts: { size?: number; time?: number } = {}
): SkyResult {
  const config: SkyConfig = typeof preset === 'string' ? { ...SKY_PRESETS[preset] } : preset;
  const size = opts.size ?? 256;

  const uniforms = {
    uHorizon: { value: new THREE.Color(config.horizon).convertSRGBToLinear() },
    uZenith: { value: new THREE.Color(config.zenith).convertSRGBToLinear() },
    uGround: { value: new THREE.Color(config.groundGlow).convertSRGBToLinear() },
    uSunDir: { value: config.sunDirection.clone().normalize() },
    uSunColor: { value: new THREE.Color(config.sunColor).convertSRGBToLinear() },
    uSunIntensity: { value: config.sunIntensity },
    uSunSize: { value: config.sunSize },
    uCloudCover: { value: config.cloudCover },
    uCloudSharp: { value: config.cloudSharpness },
    uCloudBright: { value: config.cloudBrightness },
    uStars: { value: config.stars },
    uTime: { value: opts.time ?? 0 },
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });

  const skyScene = new THREE.Scene();
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 32), skyMat);
  skyMesh.frustumCulled = false;
  skyScene.add(skyMesh);

  const cubeRT = new THREE.WebGLCubeRenderTarget(size, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  let envRT: THREE.WebGLRenderTarget | null = null;

  const render = (time: number) => {
    uniforms.uTime.value = time;
    const prevTarget = renderer.getRenderTarget();
    cubeCam.update(renderer, skyScene);
    renderer.setRenderTarget(prevTarget);
    envRT?.dispose();
    envRT = pmrem.fromCubemap(cubeRT.texture);
  };
  render(opts.time ?? 0);

  return {
    background: cubeRT.texture as unknown as THREE.CubeTexture,
    get environment() {
      return envRT!.texture;
    },
    config,
    update: render,
    dispose: () => {
      cubeRT.dispose();
      envRT?.dispose();
      pmrem.dispose();
      skyMat.dispose();
      skyMesh.geometry.dispose();
    },
  };
}
