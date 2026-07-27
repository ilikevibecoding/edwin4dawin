/**
 * Depth / world-normal / motion-vector prepass.
 *
 * Rendered as `scene.overrideMaterial` into an MRT pair so it survives whatever
 * materials the world and material agents produce; patching every material to
 * emit velocity would couple this pipeline to code it does not own. The cost is
 * one extra depth-only-ish pass over the opaque set, which also primes early-Z
 * for the shaded pass.
 */
export const GBUFFER_VERT = /* glsl */ `
#include <common>
#include <batching_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

uniform mat4 uPrevModel;
uniform mat4 uCurViewProj;
uniform mat4 uPrevViewProj;
uniform mat3 uViewToWorld;

out vec3 vNormalW;
out vec4 vCurClip;
out vec4 vPrevClip;

void main() {
  #include <batching_vertex>
  #include <skinbase_vertex>
  #include <morphinstance_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>

  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>

  vNormalW = uViewToWorld * transformedNormal;

  vec4 localPos = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    localPos = batchingMatrix * localPos;
  #endif
  #ifdef USE_INSTANCING
    localPos = instanceMatrix * localPos;
  #endif

  // Velocity is derived from unjittered matrices: feeding the TAA jitter into
  // the motion vectors would make every static pixel look like it is moving.
  vCurClip = uCurViewProj * (modelMatrix * localPos);
  vPrevClip = uPrevViewProj * (uPrevModel * localPos);
}
`;

export const GBUFFER_FRAG = /* glsl */ `
precision highp float;

in vec3 vNormalW;
in vec4 vCurClip;
in vec4 vPrevClip;

uniform float uRoughness;
uniform float uMetalness;
uniform float uSSRMask;

layout(location = 0) out vec4 gNormal;
layout(location = 1) out vec4 gMotion;

void main() {
  vec3 n = normalize(vNormalW);
  if (!gl_FrontFacing) n = -n;

  vec2 cur = vCurClip.xy / max(vCurClip.w, 1e-6);
  vec2 prev = vPrevClip.xy / max(vPrevClip.w, 1e-6);

  gNormal = vec4(n, uRoughness);
  // NDC delta halved so consumers can add it straight onto a UV.
  gMotion = vec4((cur - prev) * 0.5, uMetalness, uSSRMask);
}
`;

/**
 * Background fill for the prepass, drawn before the geometry so anything solid
 * overwrites it.
 *
 * Only meshes write motion vectors, and the sky is not one: it is a dome with
 * `depthWrite: false`, deliberately excluded from the prepass so it cannot act
 * as a wall for the screen-space passes. That leaves the sky with a velocity of
 * zero, which tells TAA that a rotating sky is stationary — so it reprojects
 * every cloud onto itself and the sky is the one part of the frame that smears
 * when the player turns. Motion blur has the same problem in reverse: the
 * fastest-moving part of the image gets no blur at all.
 *
 * The fix is to fill the background with the camera-only reprojection of a point
 * on the far plane. For a rotation that is exact at any distance; for a
 * translation the parallax error at 1 km is far below a pixel.
 */
export const GBUFFER_BACKGROUND_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;

uniform mat4 uInvViewProj;
uniform mat4 uPrevViewProj;

layout(location = 0) out vec4 gNormal;
layout(location = 1) out vec4 gMotion;

void main() {
  vec4 clip = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec4 world = uInvViewProj * clip;
  vec4 prev = uPrevViewProj * vec4(world.xyz / world.w, 1.0);
  vec2 prevUv = (prev.xy / max(prev.w, 1e-6)) * 0.5 + 0.5;

  // Roughness 1 and an SSR mask of 0 so no screen-space pass mistakes the
  // background for a surface if it reaches this pixel at all.
  gNormal = vec4(0.0, 0.0, 0.0, 1.0);
  gMotion = vec4(vUv - prevUv, 0.0, 0.0);
}
`;

/**
 * Half-resolution min/max linear depth: the base of the ray-traversal
 * hierarchy. Kept as separate targets per level rather than mip levels of one
 * texture because reducing a texture into its own higher mip while sampling the
 * lower one is a framebuffer feedback loop, which GL leaves undefined.
 */
export const DEPTH_HIZ_BASE = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D uDepth;
uniform vec2 uNearFar;
uniform vec2 uSrcSize;
out vec4 fragColor;

float lin(float d) {
  float near = uNearFar.x, far = uNearFar.y;
  return -((near * far) / ((far - near) * d - far));
}

void main() {
  ivec2 mx = ivec2(uSrcSize) - 1;
  ivec2 c = ivec2(gl_FragCoord.xy) * 2;
  float d0 = lin(texelFetch(uDepth, min(c, mx), 0).r);
  float d1 = lin(texelFetch(uDepth, min(c + ivec2(1, 0), mx), 0).r);
  float d2 = lin(texelFetch(uDepth, min(c + ivec2(0, 1), mx), 0).r);
  float d3 = lin(texelFetch(uDepth, min(c + ivec2(1, 1), mx), 0).r);
  fragColor = vec4(min(min(d0, d1), min(d2, d3)), max(max(d0, d1), max(d2, d3)), 0.0, 1.0);
}
`;

export const DEPTH_HIZ_REDUCE = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uSrcSize;
out vec4 fragColor;

void main() {
  ivec2 mx = ivec2(uSrcSize) - 1;
  ivec2 c = ivec2(gl_FragCoord.xy) * 2;
  vec2 a = texelFetch(uSrc, min(c, mx), 0).rg;
  vec2 b = texelFetch(uSrc, min(c + ivec2(1, 0), mx), 0).rg;
  vec2 d = texelFetch(uSrc, min(c + ivec2(0, 1), mx), 0).rg;
  vec2 e = texelFetch(uSrc, min(c + ivec2(1, 1), mx), 0).rg;
  fragColor = vec4(min(min(a.x, b.x), min(d.x, e.x)), max(max(a.y, b.y), max(d.y, e.y)), 0.0, 1.0);
}
`;
