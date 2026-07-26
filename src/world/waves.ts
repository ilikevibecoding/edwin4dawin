import * as THREE from 'three';
import { clamp01, DEG, lerp } from '../core/math';

export interface GerstnerWave {
  /** Direction offset from the prevailing wind, in radians. */
  angleOffset: number;
  wavelength: number;
  amplitude: number;
  /** 0..1 crest sharpness. High values on short waves cause loops, keep them low. */
  steepness: number;
}

/** Deep-water gravity waves: phase speed follows sqrt(g / k). */
const GRAVITY = 9.81;
const SPEED_SCALE = 0.62;
export const WAVE_COUNT = 6;

const CALM_SET: GerstnerWave[] = [
  { angleOffset: 0, wavelength: 132, amplitude: 0.78, steepness: 0.62 },
  { angleOffset: 21 * DEG, wavelength: 74, amplitude: 0.52, steepness: 0.55 },
  { angleOffset: -34 * DEG, wavelength: 41, amplitude: 0.3, steepness: 0.5 },
  { angleOffset: 57 * DEG, wavelength: 22, amplitude: 0.16, steepness: 0.42 },
  { angleOffset: -68 * DEG, wavelength: 11.5, amplitude: 0.08, steepness: 0.34 },
  { angleOffset: 104 * DEG, wavelength: 6.2, amplitude: 0.04, steepness: 0.26 },
];

/**
 * The single source of truth for water surface motion. The same wave set is
 * packed into a uniform array for the ocean shader and evaluated on the CPU for
 * buoyancy, swimming and camera bobbing, so what floats matches what you see.
 *
 * Uniform packing per wave: (dirX, dirZ, wavelength, amplitude) and
 * (steepness, _, _, _) is folded into the w channel of a second array.
 */
export class WaveField {
  readonly waves: GerstnerWave[] = CALM_SET.map((w) => ({ ...w }));
  /** Packed for the shader: xy = direction, z = wavelength, w = amplitude. */
  readonly packedDir: THREE.Vector4[] = [];
  /** x = steepness, y = phase speed, z = wave number k, w = amplitude * steepness scale. */
  readonly packedPhase: THREE.Vector4[] = [];

  time = 0;
  windAngle = 0.7;
  /** Weather multiplier on wave amplitude: 1 = calm, ~2.6 = full storm. */
  choppiness = 1;

  private scratch = new THREE.Vector3();

  constructor() {
    for (let i = 0; i < WAVE_COUNT; i++) {
      this.packedDir.push(new THREE.Vector4());
      this.packedPhase.push(new THREE.Vector4());
    }
    this.repack();
  }

  update(dt: number, windAngle: number, choppiness: number): void {
    this.time += dt;
    this.windAngle = windAngle;
    this.choppiness = choppiness;
    this.repack();
  }

  private repack(): void {
    for (let i = 0; i < WAVE_COUNT; i++) {
      const w = this.waves[i];
      const angle = this.windAngle + w.angleOffset;
      const k = (Math.PI * 2) / w.wavelength;
      // Storms grow the long swells more than the ripples.
      const growth = lerp(1, this.choppiness, clamp01(w.wavelength / 60) * 0.75 + 0.25);
      const amp = w.amplitude * growth;
      const speed = Math.sqrt(GRAVITY / k) * SPEED_SCALE;
      this.packedDir[i].set(Math.cos(angle), Math.sin(angle), w.wavelength, amp);
      // Clamp the horizontal pinch so crests never fold over themselves.
      const q = Math.min(w.steepness, 0.9 / Math.max(1e-4, k * amp * WAVE_COUNT));
      this.packedPhase[i].set(q, speed, k, amp * q);
    }
  }

  /** Full Gerstner displacement of the flat-water point (x, z). */
  displace(x: number, z: number, out = this.scratch): THREE.Vector3 {
    out.set(0, 0, 0);
    const t = this.time;
    for (let i = 0; i < WAVE_COUNT; i++) {
      const d = this.packedDir[i];
      const p = this.packedPhase[i];
      const k = p.z;
      const f = k * (d.x * x + d.y * z) - p.y * k * t;
      const c = Math.cos(f);
      out.x += d.x * p.w * c;
      out.y += d.w * Math.sin(f);
      out.z += d.y * p.w * c;
    }
    return out;
  }

  /**
   * Water height at a world position. Gerstner waves displace horizontally too,
   * so we take two fixed-point iterations to find which flat-water point ends up
   * above (x, z) - without this, buoyancy visibly lags steep crests.
   */
  height(x: number, z: number): number {
    let px = x;
    let pz = z;
    for (let iter = 0; iter < 2; iter++) {
      const d = this.displace(px, pz);
      px = x - d.x;
      pz = z - d.z;
    }
    return this.displace(px, pz).y;
  }

  /** Surface normal via central differences on `height`. */
  normal(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    const e = 0.75;
    const hL = this.height(x - e, z);
    const hR = this.height(x + e, z);
    const hD = this.height(x, z - e);
    const hU = this.height(x, z + e);
    return out.set(hL - hR, 2 * e, hD - hU).normalize();
  }

  /** Horizontal orbital velocity of the water, used to drift swimmers and debris. */
  flow(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    out.set(0, 0, 0);
    const t = this.time;
    for (let i = 0; i < WAVE_COUNT; i++) {
      const d = this.packedDir[i];
      const p = this.packedPhase[i];
      const k = p.z;
      const f = k * (d.x * x + d.y * z) - p.y * k * t;
      const s = Math.sin(f) * p.w * p.y * k;
      out.x += d.x * s;
      out.z += d.y * s;
    }
    return out;
  }
}

/**
 * GLSL twin of `WaveField.displace`, plus analytic tangents for the normal.
 * Included by the ocean material (vertex + fragment) so CPU and GPU agree.
 */
export const WAVE_GLSL = /* glsl */ `
#ifndef WAVE_COUNT
#define WAVE_COUNT ${WAVE_COUNT}
#endif

uniform vec4 uWaveDir[WAVE_COUNT];   // xy dir, z wavelength, w amplitude
uniform vec4 uWavePhase[WAVE_COUNT]; // x steepness, y speed, z k, w amplitude*steepness
uniform float uWaveTime;

vec3 gerstnerSurface(vec2 pos, out vec3 outNormal) {
  vec3 disp = vec3(0.0);
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);

  for (int i = 0; i < WAVE_COUNT; i++) {
    vec2 dir = uWaveDir[i].xy;
    float amp = uWaveDir[i].w;
    float k = uWavePhase[i].z;
    float qa = uWavePhase[i].w;
    float f = k * dot(dir, pos) - uWavePhase[i].y * k * uWaveTime;
    float c = cos(f);
    float s = sin(f);

    disp.x += dir.x * qa * c;
    disp.y += amp * s;
    disp.z += dir.y * qa * c;

    float ka = k * amp;
    float kqa = k * qa;
    tangent.x -= kqa * dir.x * dir.x * s;
    tangent.y += ka * dir.x * c;
    tangent.z -= kqa * dir.x * dir.y * s;

    binormal.x -= kqa * dir.x * dir.y * s;
    binormal.y += ka * dir.y * c;
    binormal.z -= kqa * dir.y * dir.y * s;
  }

  outNormal = normalize(cross(binormal, tangent));
  return disp;
}

/**
 * Crest sharpness in 0..1, used to spawn whitecaps on steep water.
 *
 * The sum of amplitude * steepness * wavenumber over this wave set only
 * reaches about 0.12 when every crest lines up, so the old 1.35 scale topped
 * out near 0.15 and no whitecap threshold above that was ever crossed - the
 * sea has had its whitecaps switched off. Normalising against that maximum
 * puts a fully aligned calm crest around 0.7 and lets a storm, which grows the
 * amplitudes two and a half times, saturate it.
 */
float waveCrestFactor(vec2 pos) {
  float sum = 0.0;
  float norm = 0.0;
  for (int i = 0; i < WAVE_COUNT; i++) {
    vec2 dir = uWaveDir[i].xy;
    float k = uWavePhase[i].z;
    float f = k * dot(dir, pos) - uWavePhase[i].y * k * uWaveTime;
    float steep = uWavePhase[i].w * k;
    sum += steep * sin(f);
    norm += steep;
  }
  return clamp(sum / max(norm, 0.0001), 0.0, 1.0);
}
`;
