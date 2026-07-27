/**
 * The particle program.
 *
 * Simulation happens entirely in the vertex shader from the spawn parameters
 * baked into the instance attributes, so a live particle costs the CPU nothing
 * per frame: position is a closed-form solution of `v' = -kv + g`, size, colour,
 * rotation and flipbook frame are curves of normalised age, and turbulence is a
 * cheap divergence-free swirl field. The CPU only writes a slot once at spawn
 * and reclaims it once at death.
 *
 * Everything outputs premultiplied alpha with `(ONE, ONE_MINUS_SRC_ALPHA)`
 * blending. That single blend state covers additive and alpha-blended particles
 * — an additive particle simply writes zero to the destination alpha — which
 * keeps fire, smoke and sparks in the same material family.
 */

export interface ParticleShaderFlags {
  /** Fade against the scene depth buffer instead of intersecting it hard. */
  soft: boolean;
  /** Shade from the sun so the sprite has a bright side and a dark side. */
  lit: boolean;
  /**
   * Shade as a flat tumbling facet: one brightness for the whole sprite, taken
   * from a normal that turns with the particle's roll.
   *
   * The spherical model that smoke wants is actively wrong for a solid chip.
   * Applied to a sprite with a hard silhouette it paints a lit limb and a black
   * one inside that silhouette, and the result reads unmistakably as a shaded
   * ball — a scatter of little moons, not stone knocked off a wall. A chip is a
   * flake: uniformly lit, and bright or dark depending on which way it happens
   * to be facing this instant, which is also what makes tumbling debris flicker.
   */
  flake: boolean;
  /** Stretch the quad along the particle's velocity (sparks, streaks). */
  stretch: boolean;
  /**
   * Lay the quad flat in the world XZ plane instead of facing the camera, for
   * ground rings: shockwaves, dust waves and water ripples.
   */
  ground: boolean;
  /** Add curl-like turbulence to the trajectory. */
  turbulence: boolean;
  /**
   * Let the darkness of each texel decide how much it occludes.
   *
   * A fireball burns on the inside and has already turned to soot on the
   * outside, and one additive weight per particle cannot express both: fully
   * additive gives a luminous ball with no mass, fully alpha-blended kills the
   * glow. Scaling the coverage written to the destination by how *cool* the
   * texel is gets both — flame adds light and leaves the background alone,
   * soot blocks it.
   */
  soot: boolean;
  /**
   * Write straight (unpremultiplied) colour with coverage in alpha.
   *
   * The viewmodel target is composited with `mix(scene, view.rgb, view.a)`,
   * which expects straight alpha. Emitting premultiplied colour there would
   * multiply by coverage twice and additive particles — coverage zero — would
   * vanish entirely, so viewmodel groups take this path and express additivity
   * as extra radiance instead of as zero destination alpha.
   */
  straightAlpha: boolean;
}

const VERTEX = /* glsl */ `
attribute vec4 aP0;    // xyz spawn position, w spawn time
attribute vec4 aV0;    // xyz spawn velocity, w lifetime
attribute vec4 aSize;  // size at birth, size at death, roll, roll rate
attribute vec4 aCol0;  // rgb colour at birth, a peak alpha
attribute vec4 aCol1;  // rgb colour at death, a additive weight
attribute vec4 aPhys;  // gravity, drag, turbulence, stretch
attribute vec4 aMisc;  // atlas cell, flipbook frames, fade-in fraction, softness

uniform float uTime;
uniform vec3 uGravityDir;
uniform vec2 uAtlas;
uniform vec4 uCurves;     // size exponent, colour exponent, fade exponent, turbulence frequency
uniform vec2 uTurb;       // scroll rate, secondary octave weight
uniform float uSizeScale;
uniform float uAlphaScale;

#ifdef FLAKE
uniform vec3 uSunDirView;
uniform vec3 uSunColor;
uniform vec3 uAmbientColor;
#endif

varying vec2 vUv;
varying vec2 vLocal;
varying vec4 vColorA;
varying vec4 vParams;   // view depth, softness, additive weight, half world size

/** Smooth, near-divergence-free swirl. Six sines beat a real curl for cost. */
vec3 swirl(vec3 q, float phase) {
  vec3 a = vec3(
    sin(q.y + phase) + sin(q.z * 1.31 - phase * 0.7),
    sin(q.z * 0.91 + phase * 1.2) + sin(q.x * 1.13 - phase * 0.83),
    sin(q.x * 1.21 + phase * 0.9) + sin(q.y * 0.83 - phase * 1.1));
  vec3 b = vec3(
    sin(q.z * 2.3 - phase * 1.7),
    sin(q.x * 2.7 + phase * 1.4),
    sin(q.y * 2.1 - phase * 1.9));
  return a + b * uTurb.y;
}

void main() {
  float life = max(aV0.w, 1e-4);
  float t = (uTime - aP0.w) / life;
  if (t < 0.0 || t >= 1.0) {
    // Dead or unborn slots are collapsed off-screen; the CPU reclaims them on
    // its next sweep, so a slot is never visible for more than a frame.
    vUv = vec2(0.0);
    vLocal = vec2(0.0);
    vColorA = vec4(0.0);
    vParams = vec4(1.0, 1.0, 0.0, 0.0);
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  float age = t * life;
  vec3 gravity = uGravityDir * aPhys.x;
  float drag = aPhys.y;

  vec3 p;
  vec3 vel;
  if (drag > 1e-3) {
    float e = exp(-drag * age);
    vec3 terminal = gravity / drag;
    p = aP0.xyz + (aV0.xyz - terminal) * ((1.0 - e) / drag) + terminal * age;
    vel = terminal + (aV0.xyz - terminal) * e;
  } else {
    p = aP0.xyz + aV0.xyz * age + 0.5 * gravity * age * age;
    vel = aV0.xyz + gravity * age;
  }

#ifdef TURBULENCE
  if (aPhys.z > 0.0) {
    float phase = uTime * uTurb.x;
    vec3 offset = swirl(p * uCurves.w, phase);
    // Ramped in so particles leave the emitter cleanly and only then wander.
    p += offset * aPhys.z * pow(t, 1.35) * life * 0.5;
  }
#endif

  float size = mix(aSize.x, aSize.y, pow(t, uCurves.x)) * uSizeScale;
  float roll = aSize.z + aSize.w * age;

  vec2 corner = position.xy;
  float cs = cos(roll);
  float sn = sin(roll);
  vec2 rotated = vec2(corner.x * cs - corner.y * sn, corner.x * sn + corner.y * cs) * size;

#ifdef GROUND
  // Flat in the world XZ plane; nothing to billboard against.
  vec4 mv = modelViewMatrix * vec4(p + vec3(rotated.x, 0.0, rotated.y), 1.0);
#else
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
#endif

#if defined(STRETCH)
  vec3 velView = (viewMatrix * vec4(vel, 0.0)).xyz;
  vec2 dir = velView.xy;
  float dirLen = length(dir);
  vec2 ax = dirLen > 1e-4 ? dir / dirLen : vec2(1.0, 0.0);
  vec2 ay = vec2(-ax.y, ax.x);
  // Foreshortening: a spark flying at the camera must not read as a long bar.
  float speed = length(vel) * (dirLen / max(length(velView), 1e-4));
  float along = size * (1.0 + aPhys.w * speed);
  mv.xy += ax * (corner.x * along) + ay * (corner.y * size);
#elif !defined(GROUND)
  mv.xy += rotated;
#endif

  gl_Position = projectionMatrix * mv;

  float cell = aMisc.x;
  if (aMisc.y > 0.5) cell += floor(min(t, 0.99999) * aMisc.y);
  float count = max(uAtlas.x * uAtlas.y, 1.0);
  float ci = mod(cell, count);
  vec2 cellSize = 1.0 / uAtlas;
  vec2 origin = vec2(mod(ci, uAtlas.x), floor(ci / uAtlas.x)) * cellSize;
  vUv = origin + (corner + 0.5) * cellSize;
  vLocal = corner;

  float fadeIn = clamp(t / max(aMisc.z, 1e-4), 0.0, 1.0);
  float fadeOut = pow(1.0 - t, uCurves.z);
  float envelope = aCol0.a * fadeIn * fadeOut * uAlphaScale;

#ifdef GROUND
  // A flat sheet seen edge-on would draw as a hard bright line across the
  // screen — the single most obvious artefact of ground-aligned quads. Fading
  // it out with the viewing angle costs one dot product and removes it.
  vec3 upView = (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
  float incidence = abs(dot(upView, normalize(-mv.xyz)));
  envelope *= smoothstep(0.05, 0.38, incidence);
#endif

  vec3 tint = mix(aCol0.rgb, aCol1.rgb, pow(t, uCurves.y));

#ifdef FLAKE
  // A billboard has no orientation of its own, so the facing is synthesised from
  // the roll the particle is already carrying. Two incommensurate frequencies
  // keep the tumble from settling into a visible period, and the specular term
  // is what makes brass and glass wink as they turn over.
  vec3 facet = normalize(vec3(sin(roll) * 0.82, cos(roll * 1.37) * 0.82, 0.42));
  float ndl = dot(facet, uSunDirView);
  float lambert = max(ndl, 0.0);
  float glint = pow(lambert, 22.0) * 1.6;
  // Ambient carries the shadowed side: an unlit face still sees the sky and the
  // ground, so the darkest a chip ever gets is ambient, never black.
  tint *= uAmbientColor + uSunColor * (lambert * 0.85 + glint);
#endif

  vColorA = vec4(tint, envelope);
  vParams = vec4(-mv.z, aMisc.w, aCol1.a, size * 0.5);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

#include <packing>

uniform sampler2D uMap;
uniform vec3 uSunDirView;
uniform vec3 uSunColor;
uniform vec3 uAmbientColor;
uniform vec2 uNearFade;

#ifdef SOFT
uniform sampler2D uDepthMap;
uniform vec2 uDepthRange;
uniform vec2 uInvResolution;
#endif

varying vec2 vUv;
varying vec2 vLocal;
varying vec4 vColorA;
varying vec4 vParams;

void main() {
  vec4 texel = texture2D(uMap, vUv);
  float alpha = vColorA.a * texel.a;
  if (alpha <= 0.002) discard;

  vec3 color = vColorA.rgb * texel.rgb;

#ifdef LIT
  // Treat the sprite as a sphere: the implied normal gives a lit limb and a
  // shadowed one, and the implied thickness darkens the dense core.
  vec2 n2 = vLocal * 2.0;
  float r2 = min(dot(n2, n2), 1.0);
  vec3 normal = vec3(n2, sqrt(1.0 - r2));
  float ndl = dot(normal, uSunDirView);
  const float wrap = 0.6;
  float diffuse = clamp((ndl + wrap) / (1.0 + wrap), 0.0, 1.0);
  // Thick centre receives less sun than the wispy rim.
  float thickness = mix(1.0, 0.6, normal.z);
  // Forward scattering through the thin edges when back-lit.
  float through = pow(clamp(-ndl, 0.0, 1.0), 2.5) * (1.0 - normal.z) * 0.8;
  color *= uAmbientColor + uSunColor * (diffuse * thickness + through);
#endif

#ifdef SOFT
  float packed = unpackRGBAToDepth(texture2D(uDepthMap, gl_FragCoord.xy * uInvResolution));
  float sceneZ = -perspectiveDepthToViewZ(packed, uDepthRange.x, uDepthRange.y);
  // Fade against the *front* of the sprite's implied sphere, not its centre.
  // Comparing centre depth is the textbook version and it is wrong for anything
  // that lives on a surface: a dust puff two centimetres off a wall has its
  // centre level with the wall, so the whole sprite is erased and the impact
  // shows nothing at all. Giving the sprite the depth extent its silhouette
  // already implies means only the part that really penetrates the geometry
  // fades, so the puff keeps its bright core and loses just the rim that would
  // have cut a hard line across the brickwork.
  vec2 q = vLocal * 2.0;
  float profile = sqrt(max(0.0, 1.0 - min(dot(q, q), 1.0)));
  float front = vParams.x - vParams.w * profile;
  alpha *= clamp((sceneZ - front) / max(vParams.y, 1e-3), 0.0, 1.0);
#endif

  // Never let a sprite fill the frame as the camera passes through it.
  alpha *= clamp((vParams.x - uNearFade.x) / max(uNearFade.y, 1e-3), 0.0, 1.0);
  alpha = clamp(alpha, 0.0, 1.0);
  if (alpha <= 0.002) discard;

#ifdef SOOT
  // The particle's additive weight is spent only on the parts that are still
  // burning; the cooled, sooty limb keeps its coverage and occludes.
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float burning = clamp(lum * 1.1, 0.0, 1.0);
  gl_FragColor = vec4(color * alpha, alpha * (1.0 - vParams.z * burning));
#elif defined(STRAIGHT_ALPHA)
  // The viewmodel target is resolved with mix(scene, view.rgb, view.a). With
  // premultiplied colour and (ONE, ONE_MINUS_SRC_ALPHA) that resolve is exactly
  // right over the weapon and over empty background alike — but an additive
  // particle contributing no coverage would vanish against the sky, so it keeps
  // part of its coverage and accepts dimming the scene slightly in exchange for
  // being visible at all.
  gl_FragColor = vec4(color * alpha, alpha * mix(1.0, 0.45, vParams.z));
#else
  gl_FragColor = vec4(color * alpha, alpha * (1.0 - vParams.z));
#endif
}
`;

export function buildParticleShader(flags: ParticleShaderFlags): {
  vertexShader: string;
  fragmentShader: string;
  defines: Record<string, boolean>;
} {
  const defines: Record<string, boolean> = {};
  if (flags.soft) defines.SOFT = true;
  if (flags.lit) defines.LIT = true;
  if (flags.flake) defines.FLAKE = true;
  if (flags.stretch) defines.STRETCH = true;
  if (flags.ground) defines.GROUND = true;
  if (flags.turbulence) defines.TURBULENCE = true;
  if (flags.straightAlpha) defines.STRAIGHT_ALPHA = true;
  if (flags.soot) defines.SOOT = true;
  return { vertexShader: VERTEX, fragmentShader: FRAGMENT, defines };
}
