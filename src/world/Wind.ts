import type * as THREE from 'three';
import type { MaterialName } from '../core/Interfaces';
import type { Batcher } from './Batcher';

/**
 * Wind.
 *
 * Vegetation and hanging cloth are displaced in the vertex shader by a
 * two-frequency sway whose phase comes from world position, so a row of palms
 * never moves in lockstep. Flex is derived from the vertex's own height rather
 * than a painted weight, which costs nothing and is enough: a trunk is stiff at
 * the ground and loose at the crown, and a shirt on a line is the same
 * relationship upside down.
 *
 * Amplitude is deliberately small. The depth prepass renders with an override
 * material and therefore sees the geometry unanimated, so anything larger than
 * a few centimetres would show up as an ambient-occlusion halo.
 */

export const windTime = { value: 0 };

export interface WindOpts {
  /** Peak lateral displacement in metres at full flex. */
  amplitude: number;
  /** World height at which flex starts. */
  flexBase: number;
  /** 1 / metres over which flex reaches full. Negative for hanging cloth. */
  flexScale: number;
  /** Extra flex proportional to horizontal distance from the origin. */
  radial?: number;
  /** Frequency multiplier; leaves flutter faster than fronds. */
  rate?: number;
}

const WIND_PARS = /* glsl */ `
uniform float uWindTime;
uniform float uWindAmp;
uniform float uWindFlexBase;
uniform float uWindFlexScale;
uniform float uWindRadial;
uniform float uWindRate;
`;

const WIND_CHUNK = /* glsl */ `
{
  float flex = clamp((transformed.y - uWindFlexBase) * uWindFlexScale, 0.0, 1.0);
  flex *= flex;
  if (uWindRadial > 0.0) {
    flex *= 0.3 + 0.7 * clamp(length(transformed.xz) * uWindRadial, 0.0, 1.0);
  }
  vec3 anchor = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
  #ifdef USE_INSTANCING
    anchor += vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  #endif
  float phase = anchor.x * 0.23 + anchor.z * 0.19;
  float t = uWindTime * uWindRate;
  vec2 sway = vec2(sin(t * 1.07 + phase), cos(t * 0.81 + phase * 1.7));
  sway += vec2(sin(t * 3.6 + phase * 2.3), cos(t * 4.2 + phase * 1.9)) * 0.3;
  sway *= uWindAmp;
  transformed.x += sway.x * flex;
  transformed.z += sway.y * flex;
  transformed.y -= (abs(sway.x) + abs(sway.y)) * flex * 0.22;
}
`;

/** Registers a wind-animated variant of a library material. */
export function windVariant(
  batch: Batcher,
  key: string,
  base: MaterialName,
  opts: WindOpts,
  extra?: (m: THREE.MeshStandardMaterial) => void,
): string {
  return batch.registerVariant(key, base, (mat) => {
    extra?.(mat);
    const prevCompile = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      prevCompile?.call(mat, shader, renderer);
      shader.uniforms.uWindTime = windTime;
      shader.uniforms.uWindAmp = { value: opts.amplitude };
      shader.uniforms.uWindFlexBase = { value: opts.flexBase };
      shader.uniforms.uWindFlexScale = { value: opts.flexScale };
      shader.uniforms.uWindRadial = { value: opts.radial ?? 0 };
      shader.uniforms.uWindRate = { value: opts.rate ?? 1 };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${WIND_PARS}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${WIND_CHUNK}`);
    };
    const prevKey = mat.customProgramCacheKey;
    mat.customProgramCacheKey = () =>
      `${prevKey ? prevKey.call(mat) : ''}|wind:${key}`;
  }, { localSpace: true });
}
