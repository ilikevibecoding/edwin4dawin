/**
 * Aerial perspective (custom haze).
 *
 * Standard scene fog is distance-only, which would swallow a contrail at 40 km
 * even though real haze is concentrated in the lowest few kilometres of air.
 * These chunks integrate an exponential atmosphere along the view ray, so
 * ground-level smoke hazes exactly like the terrain while a high-altitude trail
 * stays crisp and readable.
 *
 * Shared by the particle and trail shaders.
 */

import * as THREE from 'three';

export const AERIAL_UNIFORMS = () => ({
  uHazeColor: { value: new THREE.Color(0xa8c0d6) },
  uHazeDensity: { value: 0.00008 },
  uHazeScaleHeight: { value: 2400 },
  uCamPos: { value: new THREE.Vector3() },
  uHazeCurve: { value: 0.55 },
});

export const AERIAL_PARS = /* glsl */`
  uniform vec3  uHazeColor;
  uniform float uHazeDensity;
  uniform float uHazeScaleHeight;
  uniform vec3  uCamPos;
  uniform float uHazeCurve;

  // Optical depth through an exponential atmosphere between two altitudes.
  float aerialFactor(vec3 worldPos) {
    vec3 delta = worldPos - uCamPos;
    float dist = length(delta);
    float h0 = max(uCamPos.y, 0.0);
    float h1 = max(worldPos.y, 0.0);
    float H = max(uHazeScaleHeight, 1.0);
    float dh = abs(h1 - h0);
    float avg;
    if (dh < 1.0) {
      avg = exp(-h0 / H);
    } else {
      avg = H * (exp(-min(h0, h1) / H) - exp(-max(h0, h1) / H)) / dh;
    }
    float tau = uHazeDensity * dist * avg;
    return 1.0 - exp(-(tau * tau * uHazeCurve + tau * (1.0 - uHazeCurve)));
  }
`;

/**
 * CPU-side twin of `aerialFactor`, for things that are attenuated by hand
 * rather than in a shader (billboard glows on missiles, marker opacity).
 * @returns {number} 0 = clear, 1 = fully obscured
 */
export function hazeFactor(camPos, worldPos, density, scaleHeight = 2600, curve = 0.5) {
  const dx = worldPos.x - camPos.x;
  const dy = worldPos.y - camPos.y;
  const dz = worldPos.z - camPos.z;
  const dist = Math.hypot(dx, dy, dz);
  const h0 = Math.max(camPos.y, 0);
  const h1 = Math.max(worldPos.y, 0);
  const H = Math.max(scaleHeight, 1);
  const dh = Math.abs(h1 - h0);
  const avg = dh < 1
    ? Math.exp(-h0 / H)
    : (H * (Math.exp(-Math.min(h0, h1) / H) - Math.exp(-Math.max(h0, h1) / H))) / dh;
  const tau = density * dist * avg;
  return 1 - Math.exp(-(tau * tau * curve + tau * (1 - curve)));
}

/** Copy live haze settings into a material's uniforms. */
export function syncAerial(material, { colour, density, scaleHeight, camPos, curve }) {
  const u = material.uniforms;
  if (!u || !u.uHazeColor) return;
  if (colour) u.uHazeColor.value.copy(colour);
  if (density !== undefined) u.uHazeDensity.value = density;
  if (scaleHeight !== undefined) u.uHazeScaleHeight.value = scaleHeight;
  if (camPos) u.uCamPos.value.copy(camPos);
  if (curve !== undefined) u.uHazeCurve.value = curve;
}
