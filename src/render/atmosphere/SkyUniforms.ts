import * as THREE from 'three';
import { SKY_NOISE_GLSL } from '../../shaders/sky/noise.glsl';
import { ATMOSPHERE_GLSL } from '../../shaders/sky/atmosphere.glsl';
import { NIGHT_GLSL } from '../../shaders/sky/night.glsl';
import { SKY_EVAL_GLSL } from '../../shaders/sky/sky.glsl';
import { CLOUD_COMMON_GLSL } from '../../shaders/sky/clouds.glsl';

export type Uniforms = Record<string, THREE.IUniform>;

/**
 * Every sky material shares one uniform object by reference, so a value written
 * once is seen by the LUT bakes, the dome, the cloud march and the environment
 * probe. Three.js reads `.value` at draw time, which makes this safe and removes
 * a whole class of "the probe disagrees with the screen" bugs.
 */
export function createSkyUniforms(): Uniforms {
  return {
    /* --- celestial ---------------------------------------------------- */
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uSunIrradiance: { value: new THREE.Vector3(128, 125.4, 121.6) },
    uMoonIrradiance: { value: new THREE.Vector3(0, 0, 0) },
    uSunAngRadius: { value: 0.004651 },
    uMoonAngRadius: { value: 0.004521 },
    uSunLimbDarkening: { value: new THREE.Vector3(0.4, 0.5, 0.62) },
    uSunDiskScale: { value: 441.0 },
    uMoonDiskGain: { value: 1.0 },
    uMoonBrightness: { value: 1.0 },

    /* --- medium ------------------------------------------------------- */
    uMieScatter: { value: new THREE.Vector3(0.028, 0.031, 0.037) },
    uMieExtinct: { value: new THREE.Vector3(0.031, 0.034, 0.041) },
    uMieHeight: { value: 1.2 },
    uDustScatter: { value: new THREE.Vector3(0, 0, 0) },
    uDustExtinct: { value: new THREE.Vector3(0, 0, 0) },
    uDustHeight: { value: 0.85 },
    uAerosolG1: { value: 0.92 },
    uAerosolG2: { value: 0.12 },
    uAerosolLobe: { value: 0.56 },
    uGroundAlbedo: { value: new THREE.Vector3(0.32, 0.28, 0.22) },
    uCamHeightKm: { value: 0.0017 },

    /* --- LUTs --------------------------------------------------------- */
    uTransLut: { value: null },
    uMultiLut: { value: null },
    uTransLutSize: { value: new THREE.Vector2(256, 64) },
    uMultiLutSize: { value: 32 },
    uSkyViewLum: { value: null },
    uSkyViewMie: { value: null },
    uMoonSkyLum: { value: null },
    uMoonSkyMie: { value: null },
    uSkyViewSize: { value: new THREE.Vector2(256, 144) },
    uSkyViewSteps: { value: 32 },
    uMoonSkyStrength: { value: 0 },
    uBakeLightDir: { value: new THREE.Vector3(0, 1, 0) },
    uAerialSize: { value: new THREE.Vector3(32, 32, 8) },
    uAerialMaxDistance: { value: 24 },
    uAerialSlice: { value: 0 },

    /* --- night -------------------------------------------------------- */
    uCelestialFrame: { value: new THREE.Matrix3() },
    uGalacticFrame: { value: new THREE.Matrix3() },
    uNightCube: { value: null },
    uNightCubeScale: { value: 0 },
    uStarBrightness: { value: 0 },
    uStarTwinkle: { value: 1 },
    uNightAmount: { value: 0 },
    uAirglow: { value: new THREE.Vector3(0, 0, 0) },
    uTime: { value: 0 },
    uPixelAngle: { value: 0.001 },

    /* --- clouds ------------------------------------------------------- */
    uCloudShape: { value: null },
    uCloudDetail: { value: null },
    uWeatherTex: { value: null },
    uCloudBottom: { value: 1.4 },
    uCloudTop: { value: 5.2 },
    uCloudCoverage: { value: 0.55 },
    uCloudTypeBias: { value: 0.4 },
    uCloudTypeVariance: { value: 0.5 },
    uCloudExtinction: { value: 42 },
    uCloudDensity: { value: 1 },
    uCloudShapeScale: { value: 0.135 },
    uCloudDetailScale: { value: 1.1 },
    uCloudCoverLo: { value: 0.55 },
    uCloudErosion: { value: 0.35 },
    uCloudWeatherScale: { value: 0.0125 },
    uCloudWind: { value: new THREE.Vector3() },
    uCloudWind2: { value: new THREE.Vector3() },
    uCloudShear: { value: new THREE.Vector2() },
    uWeatherOffset: { value: new THREE.Vector2() },
    uWeatherOffset2: { value: new THREE.Vector2() },
    uCloudEvolve: { value: 0 },
    uCloudSteps: { value: 40 },
    uCloudLightSteps: { value: 5 },
    uCloudMaxDist: { value: 26 },
    uCloudAmbient: { value: new THREE.Vector3(1, 1, 1) },
    uCloudGroundBounce: { value: new THREE.Vector3(0.1, 0.08, 0.06) },
    uCloudHorizonLight: { value: new THREE.Vector3(0, 0, 0) },
    uCloudSunRadiance: { value: new THREE.Vector3(1, 1, 1) },
    uCloudTopLight: { value: new THREE.Vector3(1, 1, 1) },
    uCloudPowder: { value: 0.7 },
    uCloudPhaseG: { value: 0.72 },
    uCloudBackG: { value: -0.28 },
    uCloudMultiScatter: { value: 1 },
    uCloudAnvil: { value: 0.4 },
    uCamWorldXZ: { value: new THREE.Vector2() },
    uCloudResolved: { value: null },
    uCloudViewProj: { value: new THREE.Matrix4() },
    uCloudTexSize: { value: new THREE.Vector2(1, 1) },
    uCloudEnabled: { value: 0 },
    uSkyPrepass: { value: 0 },

    /* --- passes ------------------------------------------------------- */
    uInvViewProj: { value: new THREE.Matrix4() },
    uPrevViewProj: { value: new THREE.Matrix4() },
    uCamWorld: { value: new THREE.Vector3() },
    uCurrent: { value: null },
    uHistory: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uHistoryBlend: { value: 0 },
    uFrameIndex: { value: 0 },
    uDither: { value: 0.02 },
    uFaceForward: { value: new THREE.Vector3(0, 0, -1) },
    uFaceRight: { value: new THREE.Vector3(1, 0, 0) },
    uFaceUp: { value: new THREE.Vector3(0, 1, 0) },
    uEnvCloudSteps: { value: 0 },
    uShadowCenter: { value: new THREE.Vector2() },
    uShadowExtent: { value: 2.5 },
    uSliceZ: { value: 0 },
    uPeriod: { value: 8 },
    uWeatherSeed: { value: 3.7 },
    uProbeDir: { value: new THREE.Vector3(0, 1, 0) },
    uProbeCelestials: { value: 1 },
    uProbeClouds: { value: 0 },
    uProbeMode: { value: 0 },
    uCloudDebug: { value: 0 },
  };
}

const HEADER = '#define SKY_SHADER 1\n';

/** Composes a fragment shader from the shared includes plus pass-specific code. */
export const skyFrag = (...parts: string[]): string => HEADER + parts.join('\n');

export const INCLUDE = {
  noise: SKY_NOISE_GLSL,
  atmosphere: ATMOSPHERE_GLSL,
  night: NIGHT_GLSL,
  skyEval: SKY_EVAL_GLSL,
  clouds: CLOUD_COMMON_GLSL,
};
