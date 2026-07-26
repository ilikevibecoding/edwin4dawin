import { GLSL_COMMON } from '../FullScreen';

/**
 * Camera-reprojection motion blur.
 *
 * Each pixel's world position is reconstructed from depth, reprojected through
 * the previous frame's view-projection, and the screen-space delta is used as
 * a blur vector. This captures the dominant motion in a shooter — fast mouse
 * turns, sprinting, and airstrike camera shake — without needing per-object
 * velocity, and unlike a naive radial blur it correctly stays still when the
 * camera is still.
 */
export const MOTION_BLUR_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform mat4  uInverseViewProjection;
uniform mat4  uPrevViewProjection;
uniform float uIntensity;
uniform float uMaxVelocity;   // in UV units, clamps smear length
uniform float uFrame;
uniform vec2  uTexel;
/** Blur is suppressed in the centre so iron sights / optics stay legible. */
uniform float uCenterProtect;

${GLSL_COMMON}

#ifndef MB_SAMPLES
#define MB_SAMPLES 12
#endif

void main() {
  float rawDepth = texture2D(tDepth, vUv).x;
  vec3 color = texture2D(tScene, vUv).rgb;

  if (uIntensity <= 0.0001) {
    gl_FragColor = vec4(color, 1.0);
    return;
  }

  // Sky reprojects with the far plane so distant geometry and sky smear
  // consistently during a turn.
  float d = min(rawDepth, 0.99999);

  vec4 clip = vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 world = uInverseViewProjection * clip;
  world /= world.w;

  vec4 prevClip = uPrevViewProjection * world;
  vec2 prevUv = (prevClip.xy / prevClip.w) * 0.5 + 0.5;

  vec2 velocity = (vUv - prevUv) * uIntensity;

  float len = length(velocity);
  if (len > uMaxVelocity) velocity *= uMaxVelocity / len;

  // Fade the blur toward screen centre — the eye tracks the crosshair, so
  // smearing it is read as "broken" rather than "fast".
  float centerFade = mix(1.0, smoothstep(0.05, 0.45, distance(vUv, vec2(0.5))), uCenterProtect);
  velocity *= centerFade;

  if (length(velocity) < uTexel.x * 0.6) {
    gl_FragColor = vec4(color, 1.0);
    return;
  }

  // Jittered taps prevent the ghost-stepping artefact of uniform sampling.
  float jitter = hash12(gl_FragCoord.xy + uFrame * 31.0);

  vec3 sum = color;
  float wsum = 1.0;

  for (int i = 1; i < MB_SAMPLES; i++) {
    float t = (float(i) + jitter) / float(MB_SAMPLES);
    vec2 offset = velocity * (t - 0.5);
    vec2 uv = vUv + offset;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;

    // Reject taps that are much closer to the camera: stops foreground
    // objects bleeding their colour over a static background.
    float sd = texture2D(tDepth, uv).x;
    float w = (sd < d - 0.0006) ? 0.25 : 1.0;

    sum += texture2D(tScene, uv).rgb * w;
    wsum += w;
  }

  gl_FragColor = vec4(sum / wsum, 1.0);
}
`;
