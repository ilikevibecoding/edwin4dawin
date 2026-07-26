import * as THREE from 'three';

/**
 * Physically-motivated sky dome with layered procedural clouds.
 *
 * Rayleigh + Mie single scattering gives a correct-looking gradient and a
 * warm horizon at low sun angles; two animated FBM cloud decks sit on top.
 * The same shader is rendered into a cubemap and run through PMREM to produce
 * the scene's IBL, so ambient light always matches the visible sky.
 */

const skyVertex = /* glsl */ `
varying vec3 vWorldDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldDir = world.xyz - cameraPosition;
  // Force the dome to the far plane so it never occludes geometry.
  vec4 p = projectionMatrix * viewMatrix * world;
  gl_Position = p.xyww;
}
`;

const skyFragment = /* glsl */ `
precision highp float;

varying vec3 vWorldDir;

uniform vec3  uSunDirection;
uniform float uTurbidity;
uniform float uRayleigh;
uniform float uMieCoefficient;
uniform float uMieDirectionalG;
uniform float uSunIntensity;
uniform vec3  uGroundColor;
uniform float uCloudCoverage;
uniform float uCloudDensity;
uniform float uCloudSharpness;
uniform vec2  uCloudOffset;
uniform vec2  uCloudOffset2;
uniform vec3  uCloudTint;
uniform vec3  uCloudShadowTint;
uniform float uExposure;
uniform float uHazeStrength;
uniform float uStarStrength;
uniform float uSmokeColumns;

const float PI = 3.141592653589793;
const vec3  UP = vec3(0.0, 1.0, 0.0);

// Wavelength-dependent Rayleigh scattering at sea level (m^-1).
const vec3 K_RAYLEIGH = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float RAYLEIGH_ZENITH_LENGTH = 8.4e3;
const float MIE_ZENITH_LENGTH = 1.25e3;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    v += a * vnoise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return v;
}

float rayleighPhase(float cosTheta) {
  return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 / (4.0 * PI)) * ((1.0 - g2) / pow(max(denom, 1e-4), 1.5));
}

// Optical depth approximation (Preetham-style zenith-angle scaling).
float opticalDepth(float cosZenith, float zenithLength) {
  float z = max(cosZenith, 0.0);
  return zenithLength / (z + 0.15 * pow(max(93.885 - degrees(acos(clamp(cosZenith, -1.0, 1.0))), 1e-3), -1.253));
}

void main() {
  vec3 dir = normalize(vWorldDir);
  float cosUp = dot(dir, UP);
  float sunCosUp = dot(uSunDirection, UP);
  float cosTheta = dot(dir, uSunDirection);

  // --- Atmospheric single scattering -------------------------------------
  vec3 kMie = vec3(2.0e-6 * uMieCoefficient * (0.4 + uTurbidity * 0.12));
  vec3 kRay = K_RAYLEIGH * uRayleigh;

  float sR = opticalDepth(cosUp, RAYLEIGH_ZENITH_LENGTH);
  float sM = opticalDepth(cosUp, MIE_ZENITH_LENGTH);
  vec3 extinction = exp(-(kRay * sR + kMie * sM));

  // Sunlight attenuated on its way in.
  float sunR = opticalDepth(sunCosUp, RAYLEIGH_ZENITH_LENGTH);
  float sunM = opticalDepth(sunCosUp, MIE_ZENITH_LENGTH);
  vec3 sunAttenuation = exp(-(kRay * sunR + kMie * sunM));

  vec3 betaRTheta = kRay * rayleighPhase(cosTheta);
  vec3 betaMTheta = kMie * miePhase(cosTheta, uMieDirectionalG);

  vec3 inscatter =
      (betaRTheta + betaMTheta) / (kRay + kMie) * (1.0 - extinction) * sunAttenuation;
  vec3 sky = inscatter * uSunIntensity;

  // Warm the horizon and lift the sky's floor so it never goes pure black.
  float horizon = 1.0 - abs(cosUp);
  sky += vec3(0.06, 0.055, 0.05) * pow(horizon, 4.0) * uHazeStrength * max(sunCosUp + 0.25, 0.0);
  sky = max(sky, vec3(0.0));

  // --- Sun disc with limb darkening --------------------------------------
  float sunAngular = 0.9995;
  float disc = smoothstep(sunAngular, sunAngular + 0.00012, cosTheta);
  float limb = pow(max(0.0, (cosTheta - sunAngular) / (1.0 - sunAngular)), 0.35);
  sky += sunAttenuation * disc * limb * uSunIntensity * 22.0;
  // Broad Mie glow around the sun.
  sky += sunAttenuation * pow(max(cosTheta, 0.0), 160.0) * uSunIntensity * 0.55;

  // --- Stars (only visible once the sun is low) --------------------------
  if (uStarStrength > 0.001 && cosUp > 0.0) {
    vec2 sp = dir.xz / max(abs(dir.y), 0.05) * 40.0;
    float s = hash21(floor(sp));
    float star = smoothstep(0.9975, 1.0, s) * hash21(floor(sp) + 7.1);
    sky += vec3(star) * uStarStrength * smoothstep(0.15, -0.1, sunCosUp);
  }

  // --- Cloud decks --------------------------------------------------------
  if (cosUp > 0.001) {
    // Project onto a virtual plane so clouds converge realistically at the horizon.
    vec2 cuv = dir.xz / (cosUp + 0.06);

    // High cirrus: thin, stretched, fast.
    vec2 p1 = cuv * 0.055 + uCloudOffset2;
    float cirrus = fbm(vec2(p1.x * 2.4, p1.y * 0.7), 5);
    cirrus = smoothstep(0.52, 0.86, cirrus) * 0.4;

    // Main cumulus deck with domain warping for billowy edges.
    vec2 p2 = cuv * 0.028 + uCloudOffset;
    vec2 warp = vec2(fbm(p2 * 1.7 + 11.3, 3), fbm(p2 * 1.7 - 5.1, 3)) - 0.5;
    float base = fbm(p2 + warp * 0.9, 6);
    float cover = uCloudCoverage;
    float cumulus = smoothstep(1.0 - cover, 1.0 - cover + uCloudSharpness, base);

    // Fade clouds out toward the horizon where the deck would be edge-on.
    float horizonFade = smoothstep(0.0, 0.22, cosUp);
    cumulus *= horizonFade;
    cirrus *= horizonFade;

    float amount = clamp(cumulus * uCloudDensity + cirrus, 0.0, 1.0);

    // Cheap self-shadowing: sample the field slightly toward the sun; where
    // there is more cloud between us and the sun, darken.
    vec2 sunOffset = normalize(uSunDirection.xz + 1e-4) * 0.35;
    float lit = fbm(p2 + warp * 0.9 + sunOffset, 4);
    float shade = smoothstep(0.35, 0.85, lit);

    // Silver lining where the sun is directly behind the cloud edge.
    float rim = pow(max(cosTheta, 0.0), 8.0) * (1.0 - cumulus) * cumulus * 4.0;

    vec3 cloudLit = uCloudTint * uSunIntensity * (0.55 + 0.75 * max(sunCosUp, 0.05));
    vec3 cloudDark = uCloudShadowTint * uSunIntensity * (0.18 + 0.35 * max(sunCosUp, 0.05));
    vec3 cloudColor = mix(cloudDark, cloudLit, shade);
    cloudColor += sunAttenuation * rim * 2.2;

    sky = mix(sky, cloudColor, amount);
  }

  // --- Distant battlefield smoke columns ----------------------------------
  if (uSmokeColumns > 0.001 && cosUp > -0.02 && cosUp < 0.35) {
    float ang = atan(dir.z, dir.x);
    vec2 sp = vec2(ang * 3.2, cosUp * 14.0 - uCloudOffset.y * 0.3);
    float col = fbm(sp * vec2(1.0, 0.6) + vec2(0.0, 3.0), 5);
    float mask = smoothstep(0.62, 0.9, col) * smoothstep(0.35, 0.02, cosUp) * smoothstep(-0.02, 0.04, cosUp);
    sky = mix(sky, vec3(0.22, 0.2, 0.19) * uSunIntensity * 0.7, mask * uSmokeColumns);
  }

  // --- Ground hemisphere ---------------------------------------------------
  if (cosUp < 0.0) {
    float t = smoothstep(0.0, -0.12, cosUp);
    vec3 ground = uGroundColor * uSunIntensity * (0.16 + 0.5 * max(sunCosUp, 0.0));
    sky = mix(sky, ground, t);
  }

  gl_FragColor = vec4(sky * uExposure, 1.0);
}
`;

export interface SkyPreset {
  name: string;
  /** Sun elevation in degrees above the horizon. */
  elevation: number;
  /** Sun azimuth in degrees. */
  azimuth: number;
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  sunIntensity: number;
  cloudCoverage: number;
  cloudDensity: number;
  cloudSharpness: number;
  cloudTint: THREE.Color;
  cloudShadowTint: THREE.Color;
  groundColor: THREE.Color;
  hazeStrength: number;
  starStrength: number;
  smokeColumns: number;
  /** Directional light colour and intensity driven from this preset. */
  sunColor: THREE.Color;
  sunLightIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  /** Post-grade hints consumed by RenderSystem. */
  fogColor: THREE.Color;
  fogGroundColor: THREE.Color;
  fogDensity: number;
  exposure: number;
}

export const SKY_PRESETS: Record<string, SkyPreset> = {
  /** Harsh mid-morning desert sun — the classic CoD campaign look. */
  desert_noon: {
    name: 'desert_noon',
    elevation: 41,
    azimuth: 128,
    turbidity: 5.5,
    rayleigh: 1.6,
    mieCoefficient: 0.009,
    mieDirectionalG: 0.82,
    sunIntensity: 9,
    cloudCoverage: 0.34,
    cloudDensity: 0.85,
    cloudSharpness: 0.16,
    cloudTint: new THREE.Color(1.0, 0.98, 0.95),
    cloudShadowTint: new THREE.Color(0.5, 0.53, 0.6),
    groundColor: new THREE.Color(0.42, 0.36, 0.28),
    hazeStrength: 1.4,
    starStrength: 0,
    smokeColumns: 0.35,
    sunColor: new THREE.Color(1.0, 0.94, 0.84),
    sunLightIntensity: 3.4,
    ambientColor: new THREE.Color(0.42, 0.5, 0.66),
    ambientIntensity: 0.3,
    fogColor: new THREE.Color(0.6, 0.63, 0.68),
    fogGroundColor: new THREE.Color(0.36, 0.34, 0.32),
    fogDensity: 0.012,
    exposure: 1.0,
  },
  /** Low golden sun, long shadows, heavy haze. */
  golden_hour: {
    name: 'golden_hour',
    elevation: 9.5,
    azimuth: 205,
    turbidity: 8,
    rayleigh: 2.6,
    mieCoefficient: 0.022,
    mieDirectionalG: 0.86,
    sunIntensity: 7.5,
    cloudCoverage: 0.46,
    cloudDensity: 0.95,
    cloudSharpness: 0.2,
    cloudTint: new THREE.Color(1.0, 0.86, 0.68),
    cloudShadowTint: new THREE.Color(0.36, 0.32, 0.4),
    groundColor: new THREE.Color(0.34, 0.27, 0.2),
    hazeStrength: 2.4,
    starStrength: 0,
    smokeColumns: 0.5,
    sunColor: new THREE.Color(1.0, 0.72, 0.45),
    sunLightIntensity: 3.1,
    ambientColor: new THREE.Color(0.34, 0.4, 0.6),
    ambientIntensity: 0.28,
    fogColor: new THREE.Color(0.72, 0.6, 0.48),
    fogGroundColor: new THREE.Color(0.34, 0.3, 0.3),
    fogDensity: 0.021,
    exposure: 1.05,
  },
  /** Overcast, flat, cold — good for showing off material detail. */
  overcast: {
    name: 'overcast',
    elevation: 34,
    azimuth: 120,
    turbidity: 12,
    rayleigh: 1.1,
    mieCoefficient: 0.04,
    mieDirectionalG: 0.7,
    sunIntensity: 5.2,
    cloudCoverage: 0.86,
    cloudDensity: 1.0,
    cloudSharpness: 0.45,
    cloudTint: new THREE.Color(0.82, 0.84, 0.88),
    cloudShadowTint: new THREE.Color(0.4, 0.43, 0.5),
    groundColor: new THREE.Color(0.3, 0.3, 0.3),
    hazeStrength: 1.8,
    starStrength: 0,
    smokeColumns: 0.4,
    sunColor: new THREE.Color(0.86, 0.88, 0.95),
    sunLightIntensity: 1.2,
    ambientColor: new THREE.Color(0.55, 0.6, 0.7),
    ambientIntensity: 0.95,
    fogColor: new THREE.Color(0.62, 0.65, 0.7),
    fogGroundColor: new THREE.Color(0.4, 0.42, 0.46),
    fogDensity: 0.03,
    exposure: 1.1,
  },
  /** Night raid with NVG-adjacent moonlight. */
  night_raid: {
    name: 'night_raid',
    elevation: -6,
    azimuth: 300,
    turbidity: 3,
    rayleigh: 1.2,
    mieCoefficient: 0.006,
    mieDirectionalG: 0.8,
    sunIntensity: 0.9,
    cloudCoverage: 0.4,
    cloudDensity: 0.8,
    cloudSharpness: 0.2,
    cloudTint: new THREE.Color(0.5, 0.56, 0.72),
    cloudShadowTint: new THREE.Color(0.1, 0.12, 0.2),
    groundColor: new THREE.Color(0.05, 0.06, 0.09),
    hazeStrength: 0.8,
    starStrength: 1.6,
    smokeColumns: 0.25,
    sunColor: new THREE.Color(0.55, 0.65, 0.95),
    sunLightIntensity: 0.5,
    ambientColor: new THREE.Color(0.14, 0.18, 0.3),
    ambientIntensity: 0.3,
    fogColor: new THREE.Color(0.1, 0.13, 0.2),
    fogGroundColor: new THREE.Color(0.04, 0.05, 0.08),
    fogDensity: 0.028,
    exposure: 1.5,
  },
};

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly sunDirection = new THREE.Vector3();
  preset: SkyPreset;

  private cloudDrift = new THREE.Vector2();
  private cloudDrift2 = new THREE.Vector2();

  constructor(preset: SkyPreset = SKY_PRESETS.desert_noon) {
    this.preset = preset;
    this.material = new THREE.ShaderMaterial({
      name: 'SkyMaterial',
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uTurbidity: { value: preset.turbidity },
        uRayleigh: { value: preset.rayleigh },
        uMieCoefficient: { value: preset.mieCoefficient },
        uMieDirectionalG: { value: preset.mieDirectionalG },
        uSunIntensity: { value: preset.sunIntensity },
        uGroundColor: { value: preset.groundColor.clone() },
        uCloudCoverage: { value: preset.cloudCoverage },
        uCloudDensity: { value: preset.cloudDensity },
        uCloudSharpness: { value: preset.cloudSharpness },
        uCloudOffset: { value: new THREE.Vector2() },
        uCloudOffset2: { value: new THREE.Vector2() },
        uCloudTint: { value: preset.cloudTint.clone() },
        uCloudShadowTint: { value: preset.cloudShadowTint.clone() },
        uExposure: { value: preset.exposure },
        uHazeStrength: { value: preset.hazeStrength },
        uStarStrength: { value: preset.starStrength },
        uSmokeColumns: { value: preset.smokeColumns },
      },
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), this.material);
    this.mesh.name = 'Sky';
    this.mesh.frustumCulled = false;
    // Render before everything else so it acts as a cheap background clear.
    this.mesh.renderOrder = -1000;
    this.mesh.scale.setScalar(1);
    this.mesh.matrixAutoUpdate = false;

    this.applyPreset(preset);
  }

  applyPreset(preset: SkyPreset) {
    this.preset = preset;
    const u = this.material.uniforms;
    u.uTurbidity.value = preset.turbidity;
    u.uRayleigh.value = preset.rayleigh;
    u.uMieCoefficient.value = preset.mieCoefficient;
    u.uMieDirectionalG.value = preset.mieDirectionalG;
    u.uSunIntensity.value = preset.sunIntensity;
    (u.uGroundColor.value as THREE.Color).copy(preset.groundColor);
    u.uCloudCoverage.value = preset.cloudCoverage;
    u.uCloudDensity.value = preset.cloudDensity;
    u.uCloudSharpness.value = preset.cloudSharpness;
    (u.uCloudTint.value as THREE.Color).copy(preset.cloudTint);
    (u.uCloudShadowTint.value as THREE.Color).copy(preset.cloudShadowTint);
    u.uExposure.value = preset.exposure;
    u.uHazeStrength.value = preset.hazeStrength;
    u.uStarStrength.value = preset.starStrength;
    u.uSmokeColumns.value = preset.smokeColumns;
    this.setSunAngles(preset.elevation, preset.azimuth);
  }

  setSunAngles(elevationDeg: number, azimuthDeg: number) {
    const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
    const theta = THREE.MathUtils.degToRad(azimuthDeg);
    this.sunDirection.setFromSphericalCoords(1, phi, theta);
    (this.material.uniforms.uSunDirection.value as THREE.Vector3).copy(this.sunDirection);
    this.preset.elevation = elevationDeg;
    this.preset.azimuth = azimuthDeg;
  }

  /** The sky dome is pinned to the camera so it never clips at the far plane. */
  update(dt: number, camera: THREE.Camera) {
    this.cloudDrift.x += dt * 0.0016;
    this.cloudDrift.y += dt * 0.0009;
    this.cloudDrift2.x += dt * 0.0041;
    this.cloudDrift2.y -= dt * 0.0013;
    (this.material.uniforms.uCloudOffset.value as THREE.Vector2).copy(this.cloudDrift);
    (this.material.uniforms.uCloudOffset2.value as THREE.Vector2).copy(this.cloudDrift2);

    const far = (camera as THREE.PerspectiveCamera).far ?? 1000;
    this.mesh.position.setFromMatrixPosition(camera.matrixWorld);
    this.mesh.scale.setScalar(far * 0.92);
    this.mesh.updateMatrix();
    this.mesh.updateMatrixWorld(true);
  }

  /**
   * Bakes the current sky into a PMREM environment map.
   * Call after changing the preset; it is far too expensive to do per frame.
   */
  generateEnvironment(renderer: THREE.WebGLRenderer, resolution = 256): THREE.Texture {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const captureScene = new THREE.Scene();
    // A large inward-facing sphere centred on the cube camera.
    const capture = new THREE.Mesh(this.mesh.geometry, this.material);
    capture.scale.setScalar(100);
    capture.frustumCulled = false;
    captureScene.add(capture);

    const cubeTarget = new THREE.WebGLCubeRenderTarget(resolution, {
      type: THREE.HalfFloatType,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    const cubeCam = new THREE.CubeCamera(0.1, 1000, cubeTarget);

    // The sky shader reads `cameraPosition`, which is derived from the active
    // camera's world matrix, so keep the capture rig at the origin.
    capture.position.set(0, 0, 0);
    capture.updateMatrixWorld(true);
    cubeCam.position.set(0, 0, 0);
    cubeCam.update(renderer, captureScene);

    const envRT = pmrem.fromCubemap(cubeTarget.texture);
    const env = envRT.texture;
    env.name = `SkyEnv:${this.preset.name}`;

    cubeTarget.dispose();
    pmrem.dispose();
    captureScene.clear();

    return env;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
