import * as THREE from 'three';

/**
 * A 256x256 texture that encodes 3D value noise in two channels, so a shader
 * can get a full trilinear 3D sample out of a single bilinear texture fetch.
 *
 * The trick (Inigo Quilez's) is to lay the z slices out across the same 2D
 * plane, offset by a fixed stride per slice. Red holds slice z, green holds
 * slice z+1, so the fragment shader only has to lerp between the two channels
 * to finish the interpolation. Four fetches then buy a four-octave fbm, which
 * is what makes raymarched cloud affordable at all.
 */
const SIZE = 256;
/** Per-slice stride. Coprime-ish with the texture size so slices don't align. */
export const NOISE_SLICE_STRIDE: [number, number] = [37, 239];

let cached: THREE.DataTexture | null = null;

export function noise3DTexture(): THREE.DataTexture {
  if (cached) return cached;

  const count = SIZE * SIZE;
  const values = new Uint8Array(count);
  // A plain hash rather than Math.random so the sky is identical every run.
  let state = 0x9e3779b9;
  for (let i = 0; i < count; i++) {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x85ebca6b) >>> 0;
    values[i] = (state >>> 24) & 0xff;
  }

  const [sx, sy] = NOISE_SLICE_STRIDE;
  const data = new Uint8Array(count * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const nx = (x + sx) & (SIZE - 1);
      const ny = (y + sy) & (SIZE - 1);
      data[i * 4] = values[i];
      data[i * 4 + 1] = values[ny * SIZE + nx];
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  // No mips: the slice packing means neighbouring texels belong to unrelated
  // parts of the volume, so any downsample is meaningless.
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}

/** GLSL companion to {@link noise3DTexture}. */
export const NOISE3D_GLSL = /* glsl */ `
uniform sampler2D uNoiseTex;

float noise3(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = p.xz + vec2(${NOISE_SLICE_STRIDE[0].toFixed(1)}, ${NOISE_SLICE_STRIDE[1].toFixed(1)}) * p.y + f.xz;
  vec2 rg = texture2D(uNoiseTex, (uv + 0.5) / 256.0).xy;
  return mix(rg.x, rg.y, f.y);
}

/** Four-octave fbm, normalised to roughly 0..1. */
float fbm3(vec3 p) {
  float f = 0.5 * noise3(p);
  p = p * 2.03 + vec3(19.1, 7.3, 3.7);
  f += 0.25 * noise3(p);
  p = p * 2.01 + vec3(5.9, 13.7, 21.3);
  f += 0.125 * noise3(p);
  p = p * 2.07 + vec3(11.3, 2.9, 17.1);
  f += 0.0625 * noise3(p);
  return f * 1.0666667;
}

/** Two-octave fbm for the cheap sampling paths (light march, shadows). */
float fbm3Cheap(vec3 p) {
  float f = 0.62 * noise3(p);
  f += 0.31 * noise3(p * 2.03 + vec3(19.1, 7.3, 3.7));
  return f * 1.0752688;
}
`;
