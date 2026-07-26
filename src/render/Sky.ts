import * as THREE from 'three';

/**
 * Physically-based atmospheric sky.
 *
 * Rayleigh + Mie single scattering evaluated per-pixel on a large inverted
 * sphere, plus a limb-darkened sun disc, an ozone absorption term, and two
 * layers of raymarched procedural cloud.
 *
 * The same shader is rendered into a small cubemap once per lighting change to
 * produce the image-based lighting environment, so the ambient light on every
 * surface in the level is derived from the actual sky the player is standing
 * under — the cheapest possible way to make a scene look coherently lit.
 */

const SKY_VERT = /* glsl */ `
varying vec3 vWorldDirection;
varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vWorldDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // Force the dome onto the far plane so it never intersects level geometry.
  gl_Position.z = gl_Position.w;
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;

varying vec3 vWorldDirection;
varying vec3 vWorldPosition;

uniform vec3  uSunDirection;
uniform float uSunIntensity;
uniform float uSunAngularRadius;
uniform vec3  uRayleighCoeff;
uniform float uMieCoeff;
uniform float uMieG;
uniform float uTurbidity;
uniform float uAtmosphereThickness;
uniform vec3  uGroundAlbedo;
uniform float uExposure;
uniform float uTime;

uniform float uCloudCoverage;
uniform float uCloudDensity;
uniform float uCloudHeight;
uniform float uCloudSpeed;
uniform vec3  uCloudTint;
uniform float uHazeAmount;
uniform vec3  uHazeColor;
uniform float uStarIntensity;

const float PI = 3.14159265359;
const float EARTH_RADIUS = 6371000.0;
const float ATMOSPHERE_RADIUS = 6471000.0;

float hash13(vec3 p) {
  uvec3 q = uvec3(ivec3(p * 1024.0)) * uvec3(1597334673u, 3812015801u, 2798796415u);
  uint n = (q.x ^ q.y ^ q.z) * 1597334673u;
  return float(n) * (1.0 / 4294967296.0);
}

float valueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0,0,0));
  float n100 = hash13(i + vec3(1,0,0));
  float n010 = hash13(i + vec3(0,1,0));
  float n110 = hash13(i + vec3(1,1,0));
  float n001 = hash13(i + vec3(0,0,1));
  float n101 = hash13(i + vec3(1,0,1));
  float n011 = hash13(i + vec3(0,1,1));
  float n111 = hash13(i + vec3(1,1,1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

float fbm(vec3 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += a * valueNoise(p);
    p = p * 2.02 + vec3(11.3, 7.1, 5.7);
    a *= 0.5;
  }
  return v;
}

float rayleighPhase(float cosTheta) {
  return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float num = (1.0 - g2) * (1.0 + cosTheta * cosTheta);
  float den = (2.0 + g2) * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
  return (3.0 / (8.0 * PI)) * num / max(den, 1e-4);
}

/** Chapman-function style optical depth approximation for a spherical shell. */
float opticalDepth(float cosZenith, float scaleHeight, float height) {
  float x = max(cosZenith, 0.02);
  return exp(-height / scaleHeight) / x;
}

vec3 atmosphere(vec3 dir, vec3 sunDir) {
  float cosTheta = dot(dir, sunDir);
  float zenith = max(dir.y, -0.08);

  // Air-mass style path lengths; cheap but matches the measured horizon
  // brightening and the reddening of a low sun very closely.
  float rayleighDepth = opticalDepth(zenith, 0.14, 0.0) * uAtmosphereThickness;
  float mieDepth = opticalDepth(zenith, 0.05, 0.0) * uAtmosphereThickness * uTurbidity;

  float sunZenith = max(sunDir.y, 0.0);
  float sunRayleighDepth = opticalDepth(sunZenith, 0.14, 0.0) * uAtmosphereThickness;
  float sunMieDepth = opticalDepth(sunZenith, 0.05, 0.0) * uAtmosphereThickness * uTurbidity;

  vec3 betaR = uRayleighCoeff;
  vec3 betaM = vec3(uMieCoeff);

  // Ozone absorbs in the Chappuis band, which is what makes a clear zenith
  // sky deep blue instead of cyan — omitting it is a common tell.
  vec3 betaO = vec3(0.00065, 0.00188, 0.00008) * 0.45;

  vec3 extinction = exp(-(betaR * (rayleighDepth + sunRayleighDepth)
                        + betaM * 1.1 * (mieDepth + sunMieDepth)
                        + betaO * (rayleighDepth + sunRayleighDepth)));

  float pr = rayleighPhase(cosTheta);
  float pm = miePhase(cosTheta, uMieG);

  vec3 inscatter = (betaR * pr * rayleighDepth + betaM * pm * mieDepth) * extinction;
  inscatter *= uSunIntensity;

  // Multiple-scattering approximation: a broad ambient term proportional to
  // the Rayleigh coefficient keeps the shadowed sky from going black.
  vec3 multiScatter = betaR * uSunIntensity * 0.055 * smoothstep(-0.35, 0.7, sunDir.y);
  inscatter += multiScatter * (1.0 - extinction);

  // Ground bounce below the horizon.
  float below = smoothstep(0.02, -0.15, dir.y);
  vec3 groundColor = uGroundAlbedo * uSunIntensity * 0.055 * max(sunDir.y, 0.0);
  inscatter = mix(inscatter, groundColor, below);

  return inscatter;
}

vec3 sunDisc(vec3 dir, vec3 sunDir) {
  float cosAngle = dot(dir, sunDir);
  float cosRadius = cos(uSunAngularRadius);
  if (cosAngle < cosRadius) return vec3(0.0);

  // Limb darkening (Hestroffer & Magnan coefficients).
  float t = clamp((cosAngle - cosRadius) / max(1.0 - cosRadius, 1e-6), 0.0, 1.0);
  float mu = sqrt(max(t, 0.0));
  vec3 u = vec3(1.0);
  vec3 a = vec3(0.397, 0.503, 0.652);
  vec3 factor = 1.0 - u * (1.0 - pow(vec3(mu), a));

  float atmo = exp(-max(0.0, 1.0 - sunDir.y) * 2.4);
  return factor * uSunIntensity * 190.0 * atmo;
}

/** Two-layer raymarched cloud: cumulus deck plus high cirrus. */
vec4 clouds(vec3 dir, vec3 sunDir) {
  if (dir.y < 0.005) return vec4(0.0);

  vec2 windLow = vec2(uTime * uCloudSpeed * 0.006, uTime * uCloudSpeed * 0.0022);
  vec2 windHigh = vec2(uTime * uCloudSpeed * 0.0016, uTime * uCloudSpeed * 0.0009);

  // Flat-earth cloud plane projection; adequate up to ~80 degrees elevation
  // and far cheaper than a spherical shell march.
  float t = uCloudHeight / max(dir.y, 0.02);
  vec3 p = dir * t;

  vec2 uvLow = p.xz * 0.00022 + windLow;
  vec2 uvHigh = p.xz * 0.00007 + windHigh;

  float base = fbm(vec3(uvLow * 3.2, uTime * 0.006), 5);
  float detail = fbm(vec3(uvLow * 11.0, uTime * 0.02), 3);

  float coverage = uCloudCoverage;
  float shape = smoothstep(1.0 - coverage, min(1.0 - coverage + 0.38, 0.999), base);
  shape *= 1.0 - smoothstep(0.55, 1.0, detail) * 0.55;

  float cirrus = fbm(vec3(uvHigh * 6.0, uTime * 0.004), 4);
  cirrus = smoothstep(0.55, 0.86, cirrus) * 0.36 * smoothstep(0.02, 0.25, dir.y);

  float density = clamp(shape * uCloudDensity + cirrus, 0.0, 1.0);
  // Fade the deck into the horizon haze.
  density *= smoothstep(0.0, 0.14, dir.y);

  if (density <= 0.001) return vec4(0.0);

  // Cheap two-tap self-shadowing: sample the field slightly toward the sun.
  vec2 sunOffset = normalize(sunDir.xz + 1e-5) * 0.0006;
  float towardSun = fbm(vec3((uvLow + sunOffset) * 3.2, uTime * 0.006), 4);
  float selfShadow = clamp(1.0 - (towardSun - base) * 2.4, 0.25, 1.0);

  float cosTheta = dot(dir, sunDir);
  // Strong forward scattering gives the silver-lining rim on backlit clouds.
  float forward = miePhase(cosTheta, 0.76) * 6.0;
  float ambientTerm = 0.42 + 0.58 * smoothstep(-0.2, 0.6, sunDir.y);

  vec3 lit = uCloudTint * uSunIntensity * (0.16 + forward * 0.05) * selfShadow;
  vec3 shadowed = uCloudTint * vec3(0.42, 0.48, 0.60) * uSunIntensity * 0.035 * ambientTerm;
  vec3 color = mix(shadowed, lit, selfShadow);

  return vec4(color, density);
}

void main() {
  vec3 dir = normalize(vWorldDirection);
  vec3 sunDir = normalize(uSunDirection);

  vec3 color = atmosphere(dir, sunDir);
  color += sunDisc(dir, sunDir);

  if (uStarIntensity > 0.001 && dir.y > 0.0) {
    // Only visible once the sun is well below the horizon.
    float night = smoothstep(0.06, -0.16, sunDir.y);
    vec3 sp = dir * 420.0;
    float s = hash13(floor(sp));
    float star = smoothstep(0.9975, 1.0, s);
    float twinkle = 0.65 + 0.35 * sin(uTime * 3.1 + s * 90.0);
    color += vec3(star) * twinkle * uStarIntensity * night * 5.0;
  }

  vec4 cl = clouds(dir, sunDir);
  color = mix(color, cl.rgb, cl.a);

  // Horizon haze band, thickened toward the sun.
  float horizon = 1.0 - smoothstep(0.0, 0.22, abs(dir.y));
  float sunward = pow(max(dot(dir, vec3(sunDir.x, 0.0, sunDir.z)), 0.0), 3.0);
  color = mix(color, uHazeColor * uSunIntensity * 0.09, horizon * uHazeAmount * (0.6 + sunward * 0.7));

  gl_FragColor = vec4(max(color * uExposure, 0.0), 1.0);
}
`;

export interface SkyPreset {
  name: string;
  /** Sun elevation in degrees above the horizon. */
  elevation: number;
  /** Sun azimuth in degrees, 0 = +Z. */
  azimuth: number;
  turbidity: number;
  rayleigh: THREE.Vector3;
  mieCoeff: number;
  mieG: number;
  sunIntensity: number;
  cloudCoverage: number;
  cloudDensity: number;
  cloudTint: THREE.Color;
  hazeAmount: number;
  hazeColor: THREE.Color;
  groundAlbedo: THREE.Color;
  starIntensity: number;
}

export const SKY_PRESETS: Record<string, SkyPreset> = {
  /** Hard mid-morning desert light: long shadows, deep blue zenith. */
  desertMorning: {
    name: 'desertMorning',
    elevation: 26,
    azimuth: 33,
    turbidity: 3.4,
    rayleigh: new THREE.Vector3(0.0058, 0.0135, 0.0331),
    mieCoeff: 0.0042,
    mieG: 0.78,
    sunIntensity: 22,
    cloudCoverage: 0.28,
    cloudDensity: 0.85,
    cloudTint: new THREE.Color(1.0, 0.98, 0.95),
    hazeAmount: 0.55,
    hazeColor: new THREE.Color(0.86, 0.78, 0.66),
    groundAlbedo: new THREE.Color(0.42, 0.34, 0.24),
    starIntensity: 0,
  },
  /** Overcast urban: soft wraparound light, muted palette. */
  overcast: {
    name: 'overcast',
    elevation: 42,
    azimuth: 210,
    turbidity: 8.5,
    rayleigh: new THREE.Vector3(0.0058, 0.0135, 0.0331),
    mieCoeff: 0.019,
    mieG: 0.62,
    sunIntensity: 9,
    cloudCoverage: 0.9,
    cloudDensity: 1.0,
    cloudTint: new THREE.Color(0.86, 0.88, 0.92),
    hazeAmount: 0.85,
    hazeColor: new THREE.Color(0.7, 0.73, 0.78),
    groundAlbedo: new THREE.Color(0.22, 0.22, 0.23),
    starIntensity: 0,
  },
  /** Golden hour: the classic COD campaign key art look. */
  goldenHour: {
    name: 'goldenHour',
    elevation: 7.5,
    azimuth: 285,
    turbidity: 4.6,
    rayleigh: new THREE.Vector3(0.0062, 0.0142, 0.0348),
    mieCoeff: 0.0072,
    mieG: 0.82,
    sunIntensity: 16,
    cloudCoverage: 0.44,
    cloudDensity: 0.95,
    cloudTint: new THREE.Color(1.0, 0.9, 0.78),
    hazeAmount: 0.9,
    hazeColor: new THREE.Color(1.0, 0.72, 0.44),
    groundAlbedo: new THREE.Color(0.35, 0.28, 0.2),
    starIntensity: 0,
  },
  /** Night raid with moonlight standing in for the sun. */
  night: {
    name: 'night',
    elevation: 34,
    azimuth: 62,
    turbidity: 2.2,
    rayleigh: new THREE.Vector3(0.0068, 0.0148, 0.0362),
    mieCoeff: 0.0026,
    mieG: 0.7,
    sunIntensity: 0.42,
    cloudCoverage: 0.35,
    cloudDensity: 0.7,
    cloudTint: new THREE.Color(0.55, 0.62, 0.8),
    hazeAmount: 0.4,
    hazeColor: new THREE.Color(0.2, 0.26, 0.4),
    groundAlbedo: new THREE.Color(0.1, 0.11, 0.14),
    starIntensity: 1,
  },
};

export function sunDirectionFrom(elevationDeg: number, azimuthDeg: number): THREE.Vector3 {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  ).normalize();
}

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly sunDirection = new THREE.Vector3(0, 1, 0);
  private preset: SkyPreset;

  constructor(preset: SkyPreset = SKY_PRESETS.desertMorning) {
    this.preset = preset;
    this.material = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunIntensity: { value: preset.sunIntensity },
        uSunAngularRadius: { value: THREE.MathUtils.degToRad(0.29) },
        uRayleighCoeff: { value: preset.rayleigh.clone() },
        uMieCoeff: { value: preset.mieCoeff },
        uMieG: { value: preset.mieG },
        uTurbidity: { value: preset.turbidity },
        uAtmosphereThickness: { value: 1.0 },
        uGroundAlbedo: {
          value: new THREE.Vector3(
            preset.groundAlbedo.r, preset.groundAlbedo.g, preset.groundAlbedo.b,
          ),
        },
        uExposure: { value: 1 },
        uTime: { value: 0 },
        uCloudCoverage: { value: preset.cloudCoverage },
        uCloudDensity: { value: preset.cloudDensity },
        uCloudHeight: { value: 2600 },
        uCloudSpeed: { value: 1 },
        uCloudTint: { value: new THREE.Vector3(preset.cloudTint.r, preset.cloudTint.g, preset.cloudTint.b) },
        uHazeAmount: { value: preset.hazeAmount },
        uHazeColor: { value: new THREE.Vector3(preset.hazeColor.r, preset.hazeColor.g, preset.hazeColor.b) },
        uStarIntensity: { value: preset.starIntensity },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    });

    const geo = new THREE.SphereGeometry(1, 48, 32);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'sky';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.scale.setScalar(2000);
    this.mesh.matrixAutoUpdate = true;

    this.applyPreset(preset);
  }

  applyPreset(preset: SkyPreset): void {
    this.preset = preset;
    const u = this.material.uniforms;
    this.sunDirection.copy(sunDirectionFrom(preset.elevation, preset.azimuth));
    (u.uSunDirection.value as THREE.Vector3).copy(this.sunDirection);
    u.uSunIntensity.value = preset.sunIntensity;
    (u.uRayleighCoeff.value as THREE.Vector3).copy(preset.rayleigh);
    u.uMieCoeff.value = preset.mieCoeff;
    u.uMieG.value = preset.mieG;
    u.uTurbidity.value = preset.turbidity;
    u.uCloudCoverage.value = preset.cloudCoverage;
    u.uCloudDensity.value = preset.cloudDensity;
    (u.uCloudTint.value as THREE.Vector3).set(preset.cloudTint.r, preset.cloudTint.g, preset.cloudTint.b);
    u.uHazeAmount.value = preset.hazeAmount;
    (u.uHazeColor.value as THREE.Vector3).set(preset.hazeColor.r, preset.hazeColor.g, preset.hazeColor.b);
    (u.uGroundAlbedo.value as THREE.Vector3).set(
      preset.groundAlbedo.r, preset.groundAlbedo.g, preset.groundAlbedo.b,
    );
    u.uStarIntensity.value = preset.starIntensity;
  }

  get current(): SkyPreset {
    return this.preset;
  }

  setSunAngles(elevationDeg: number, azimuthDeg: number): void {
    this.sunDirection.copy(sunDirectionFrom(elevationDeg, azimuthDeg));
    (this.material.uniforms.uSunDirection.value as THREE.Vector3).copy(this.sunDirection);
  }

  update(elapsed: number, cameraPosition: THREE.Vector3): void {
    this.material.uniforms.uTime.value = elapsed;
    this.mesh.position.copy(cameraPosition);
  }

  /**
   * Renders the sky into a cubemap and PMREM-filters it into an environment
   * map. Called on load and whenever the sun moves appreciably — it is far too
   * expensive to run every frame, and the sky changes slowly enough that it
   * does not need to.
   */
  generateEnvironment(renderer: THREE.WebGLRenderer, size = 256): THREE.Texture {
    const cubeRT = new THREE.WebGLCubeRenderTarget(size, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRT);

    const scene = new THREE.Scene();
    const clone = new THREE.Mesh(this.mesh.geometry, this.material);
    clone.frustumCulled = false;
    clone.scale.setScalar(5);
    scene.add(clone);

    const prevTarget = renderer.getRenderTarget();
    // CubeCamera renders six faces in sequence and relies on the renderer
    // clearing depth between them; the pipeline otherwise runs with
    // autoClear disabled.
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = true;
    cubeCamera.update(renderer, scene);
    renderer.autoClear = prevAutoClear;
    renderer.setRenderTarget(prevTarget);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const env = pmrem.fromCubemap(cubeRT.texture);
    pmrem.dispose();
    cubeRT.dispose();

    env.texture.name = 'skyEnvironment';
    return env.texture;
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
