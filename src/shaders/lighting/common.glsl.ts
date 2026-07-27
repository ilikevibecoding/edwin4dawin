/**
 * Small GLSL helpers shared by the lighting rig's material injections.
 *
 * Everything here is prefixed `lgt` because it is spliced into three's own
 * shader library alongside the material agent's parallax patch; a bare name
 * like `noise` or `hash` would eventually collide with one of them.
 */

/**
 * Interleaved gradient noise. The canonical per-pixel dither for rotating a
 * sample kernel: it decorrelates neighbouring pixels without a texture fetch
 * and, unlike a hash, has a spectrum a 3x3 box filter (or TAA) resolves
 * cleanly rather than smearing into blotches.
 */
export const LGT_NOISE = /* glsl */ `
float lgtIGN(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
`;

/**
 * Vogel disc: sample `i` of `count` on a spiral whose points sit at equal
 * area, rotated by `phi`. Preferred over a baked Poisson table because the
 * tap count becomes a compile-time knob rather than a fixed array, and the
 * per-pixel rotation is free — it is already an argument.
 */
export const LGT_VOGEL = /* glsl */ `
vec2 lgtVogel(int i, float invCount, float phi) {
  float r = sqrt((float(i) + 0.5) * invCount);
  float theta = float(i) * 2.39996323 + phi;
  return vec2(cos(theta), sin(theta)) * r;
}
`;

/** World position of the fragment, recovered without an extra varying.
 *
 * `vec4 * mat4` is a row-vector product, i.e. `transpose(M) * v`, and the view
 * matrix's rotation is orthonormal — so subtracting the translation column and
 * multiplying on the right inverts it exactly. This is the same trick three's
 * own probe-grid chunk uses, and it saves three interpolators on every lit
 * material in the game.
 */
export const LGT_WORLD_POS = /* glsl */ `
vec3 lgtWorldPosition(vec3 viewPos) {
  return ((vec4(viewPos, 1.0) - viewMatrix[3]) * viewMatrix).xyz;
}
`;

/** Every helper above, in dependency order. */
export const LGT_COMMON = LGT_NOISE + LGT_VOGEL + LGT_WORLD_POS;
