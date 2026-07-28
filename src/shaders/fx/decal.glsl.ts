import { FX_DEPTH, FX_MATH } from './common.glsl';

/**
 * Projected box decals.
 *
 * Each decal is one instance of a unit box. The fragment shader reconstructs
 * the world position of whatever is actually visible behind the box from the
 * depth prepass, transforms it into the box's own space, and discards
 * everything outside the unit cube. What survives is, by construction, exactly
 * the piece of geometry the decal covers — around a corner, over a kerb, across
 * a stack of crates — with no clipped geometry to build and no z-fighting to
 * bias away from, because the decal never has a surface of its own.
 *
 * Back faces are drawn with the depth test inverted, the standard deferred
 * decal setup: the box contributes fill only where geometry sits in front of
 * its far side, and the camera can stand inside the volume without the decal
 * disappearing.
 *
 * ## Why the output is a multiplier and not a colour
 *
 * A decal does not add anything to a wall; it changes what the wall is made of
 * where it lands. So this shader emits a *reflectance ratio* and the blend
 * stage multiplies the already-lit wall by it, rather than computing lighting
 * of its own and compositing over the top.
 *
 * The alternative was tried and it does not work. Relighting the decal here
 * means reproducing the renderer's entire shading path — sun, shadow, image
 * based ambient, bounce, aerial perspective, exposure — from three uniforms,
 * and every term that is missed shows up as the decal disagreeing with the
 * surface it is supposedly part of. In practice the hole came out as a small
 * blue disc: with the sun term rejected by a shadow ray the only light left was
 * sky ambient, while the wall around it carried full sunlight plus everything
 * the engine adds on top. As a ratio there is nothing to disagree with. The
 * hole is five per cent of whatever the wall is doing, in shade or in sun,
 * through fog, at any exposure, and the crater rim is a hundred and seventy per
 * cent of it. The one thing the ratio does need to know is what reflectance it
 * is a ratio *against*, and that is a single constant: the atlas is authored in
 * absolute albedo and building surfaces sit near 0.32.
 *
 * Relief still has to be shaded, since a normal map is a statement about
 * lighting rather than about material. It is applied the same way — as the
 * ratio between the light the perturbed normal takes and the light the flat
 * surface takes — so the crater rim catches the sun from the correct side and
 * the hole goes dark when the light rakes across it, without ever needing to
 * know how bright the sun is.
 */

export const DECAL_VERT = /* glsl */ `
attribute vec4 aTile;     // atlas rect: offset xy, scale zw
attribute vec4 aParams;   // x opacity, y sun visibility, z normal strength, w gloss
attribute vec4 aTint;     // rgb tint, a minimum surface alignment

varying vec3 vOrigin;
varying mat3 vInvBasis;
varying vec3 vAxis;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec4 vTile;
varying vec4 vParams;
varying vec4 vTint;
varying vec3 vBoxWorld;

void main() {
  mat3 basis = mat3(instanceMatrix);
  vec3 cx = basis[0];
  vec3 cy = basis[1];
  vec3 cz = basis[2];
  // Columns are orthogonal (rotation times a non-uniform scale), so the inverse
  // is the transpose with each row divided by its own squared length.
  vInvBasis = transpose(mat3(
    cx / max(dot(cx, cx), 1e-8),
    cy / max(dot(cy, cy), 1e-8),
    cz / max(dot(cz, cz), 1e-8)
  ));

  vOrigin = instanceMatrix[3].xyz;
  vTangent = normalize(cx);
  vBitangent = normalize(cy);
  vAxis = normalize(cz);
  vTile = aTile;
  vParams = aParams;
  vTint = aTint;

  vec4 world = instanceMatrix * vec4(position, 1.0);
  vBoxWorld = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * world;
}
`;

export const DECAL_FRAG = /* glsl */ `
precision highp float;

${FX_MATH}
${FX_DEPTH}

uniform sampler2D uAlbedoAtlas;
uniform sampler2D uSurfaceAtlas;
// Declared here because three only injects it into the vertex stage; the value
// is the live, jittered projection the renderer already uploads.
uniform mat4 projectionMatrix;
uniform vec3 uSunDirection;
/** Reflectance the atlas is a ratio against: the level's average dry surface. */
uniform float uReflectance;

varying vec3 vOrigin;
varying mat3 vInvBasis;
varying vec3 vAxis;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec4 vTile;
varying vec4 vParams;
varying vec4 vTint;
varying vec3 vBoxWorld;

void main() {
  if (vParams.x <= 0.002) discard;

  vec3 worldPos;
  if (uHasDepth > 0.5) {
    vec2 screenUv = gl_FragCoord.xy * uDepthParams.zw;
    float depth = texture2D(uDepthTexture, screenUv).r;
    if (depth >= 0.9999995) discard;
    vec3 viewPos = fxViewPosFromDepth(screenUv, depth, projectionMatrix);
    // View to world without a CPU-supplied inverse: the rotation is the
    // transpose of the view basis and the translation is the camera itself,
    // both of which survive the pipeline's camera shake intact.
    worldPos = viewPos * mat3(viewMatrix) + cameraPosition;
  } else {
    // Without a prepass the decal falls back to its own mid-plane, which is an
    // oriented quad: less correct over relief, but never wrong.
    worldPos = vBoxWorld - vAxis * dot(vBoxWorld - vOrigin, vAxis);
  }

  vec3 local = vInvBasis * (worldPos - vOrigin);
  vec3 extent = abs(local);
  if (max(extent.x, max(extent.y, extent.z)) > 0.5) discard;

  vec3 ddxPos = dFdx(worldPos);
  vec3 ddyPos = dFdy(worldPos);
  vec3 geoNormal = normalize(cross(ddxPos, ddyPos));
  if (dot(geoNormal, cameraPosition - worldPos) < 0.0) geoNormal = -geoNormal;

  // A decal projected onto a surface it barely grazes smears into a stripe;
  // fading it out by alignment is what keeps the projection honest.
  float align = dot(geoNormal, vAxis);
  float angleFade = smoothstep(vTint.a, min(0.98, vTint.a + 0.4), align);
  if (angleFade <= 0.002) discard;

  vec2 uv = local.xy + 0.5;
  vec2 auv = vTile.xy + uv * vTile.zw;
  vec4 albedoSample = texture2D(uAlbedoAtlas, auv);
  vec4 surfaceSample = texture2D(uSurfaceAtlas, auv);

  // How much of the surface this texel replaces. Fading a decal out is just
  // this going to zero, which walks the multiplier back to one.
  float coverage = albedoSample.a * vParams.x * angleFade;
  coverage *= 1.0 - smoothstep(0.3, 0.5, extent.z);
  if (coverage < 0.004) discard;

  vec3 tangentNormal;
  tangentNormal.xy = (surfaceSample.xy * 2.0 - 1.0) * vParams.z;
  tangentNormal.z = sqrt(max(1.0 - dot(tangentNormal.xy, tangentNormal.xy), 0.0));
  vec3 normal = normalize(
    vTangent * tangentNormal.x + vBitangent * tangentNormal.y + geoNormal * tangentNormal.z
  );

  float ao = surfaceSample.a;
  float gloss = surfaceSample.b * vParams.w;

  // The material change: how much more or less this texel reflects than the
  // surface it replaced.
  vec3 response = albedoSample.rgb * vTint.rgb * uReflectance;

  // The relief. Not "how much light does this normal receive" — that would need
  // the sun's intensity — but "how much more than the flat surface receives",
  // which needs only its direction. The offset keeps the ratio finite as the
  // surface turns away from the sun and doubles as a stand-in for the ambient
  // the relief cannot shadow. Where the decal was placed in shade the whole
  // term is damped, because a rim in shadow catches nothing to be lit by.
  float base = max(dot(geoNormal, uSunDirection), 0.0);
  float lit = max(dot(normal, uSunDirection), 0.0);
  float relief = clamp((lit + 0.3) / (base + 0.3), 0.3, 2.3);
  relief = mix(1.0, relief, 0.3 + 0.7 * vParams.y);

  // Gloss as a proportional brightening rather than an added highlight: wet
  // blood on a sunlit floor throws back more of that floor's light, and on a
  // floor in shade it correctly throws back very little.
  vec3 viewDir = normalize(cameraPosition - worldPos);
  vec3 halfVec = normalize(viewDir + uSunDirection);
  float spec = pow(max(0.0, dot(normal, halfVec)), 16.0 + 180.0 * gloss) * gloss * vParams.y;

  // Occlusion at reduced strength. The atlas already darkens the inside of a
  // hole in its albedo, and applying the full occlusion term on top of that
  // multiplies two darknesses together into nothing at all.
  vec3 ratio = response * relief * mix(1.0, ao, 0.7) * (1.0 + spec * 3.0);

  // Nothing reflects nothing. A ratio that reaches zero stops reading as a
  // mark on the surface and starts reading as a hole cut through it — the
  // scorch under a grenade came out as a black void in the road — while the
  // sootiest real surface still returns a few per cent. The floor is tinted by
  // the decal's own hue so that lifting it off zero does not also desaturate
  // it, which would turn blood brown.
  vec3 hue = response / max(max(response.r, max(response.g, response.b)), 1e-4);
  ratio = max(ratio, hue * 0.07);

  gl_FragColor = vec4(mix(vec3(1.0), ratio, coverage), 1.0);
}
`;
