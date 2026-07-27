import { GLSL_COMMON } from '../FullScreen';
import { TONEMAP_GLSL } from './Tonemap';
import { EXPOSURE_GLSL } from './Exposure';

/**
 * Final HDR → display composite.
 *
 * Everything that must happen in a single pass to avoid extra full-screen
 * bandwidth: lens distortion, chromatic aberration, bloom + lens-dirt
 * combine, exposure, tonemap, grade, vignette, grain, sharpen, dither.
 *
 * Order is deliberate — physical camera effects (distortion, aberration,
 * bloom) belong in scene-referred linear light *before* the display
 * transform; perceptual/print effects (vignette, grain, dither) belong after.
 */
export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform sampler2D tDirt;
uniform vec2  uResolution;
uniform vec2  uTexel;
uniform float uTime;

uniform float uExposure;
uniform float uBloomStrength;
uniform float uDirtStrength;

uniform float uChromatic;       // radial CA strength, in pixels at the corner
uniform float uDistortion;      // barrel (+) / pincushion (-)
uniform float uVignette;        // 0..1
uniform float uVignetteRoundness;
uniform float uGrain;
uniform float uGrainSize;
uniform float uSharpen;
uniform float uDither;

uniform float uContrast;
uniform float uSaturation;
uniform vec3  uLift;
uniform vec3  uGamma;
uniform vec3  uGain;
uniform vec3  uShadowTint;
uniform vec3  uHighlightTint;
uniform float uSplitBalance;
uniform float uLookContrast;
uniform float uLookShoulder;
uniform float uToeKnee;
uniform float uToeSlope;
uniform vec3  uLookSlope;
uniform vec3  uLookPower;
uniform float uLookSat;
uniform float uHighlightDesat;
uniform float uShadowDesat;
uniform float uToe;

// Screen-space damage/suppression feedback, driven by gameplay.
uniform float uDamageFlash;     // 0..1 red edge pulse
uniform vec3  uDamageDir;       // screen-space direction of the hit
uniform float uSuppression;     // 0..1 desaturate + tunnel
uniform float uConcussion;      // 0..1 heavy blur + ring
uniform float uFadeToBlack;

${GLSL_COMMON}
${TONEMAP_GLSL}
${EXPOSURE_GLSL}

// Cheap 3-tap spectral CA. Sampling R/G/B at slightly different radii is
// physically what an uncorrected lens does; scaling by r^2 keeps the centre
// of the screen — where the player is aiming — perfectly sharp.
vec3 sampleSceneCA(vec2 uv, float amount) {
  vec2 center = uv - 0.5;
  float r2 = dot(center, center);
  if (amount < 0.001) return texture2D(tScene, uv).rgb;
  vec2 offset = center * r2 * amount;
  vec3 c;
  c.r = texture2D(tScene, uv - offset * 1.0).r;
  c.g = texture2D(tScene, uv).g;
  c.b = texture2D(tScene, uv + offset * 1.0).b;
  return c;
}

vec2 distortUv(vec2 uv, float k) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  return 0.5 + c * (1.0 + k * r2 + k * k * 0.35 * r2 * r2);
}

void main() {
  vec2 uv = vUv;

  // Concussion warps the frame outward from the centre — reads as pressure
  // wave rather than a generic blur.
  if (uConcussion > 0.001) {
    vec2 c = uv - 0.5;
    float r = length(c);
    float wob = sin(r * 34.0 - uTime * 11.0) * 0.006 * uConcussion;
    uv += normalize(c + 1e-5) * wob;
  }

  uv = distortUv(uv, uDistortion);

  float caScale = uChromatic * (1.0 + uConcussion * 6.0 + uSuppression * 1.5);
  vec3 color = sampleSceneCA(uv, caScale);

  // A fade is the iris closing, not a dimmer on the display.
  //
  // Scaling display-referred values pulls the white point down with everything
  // else, so a frame that is halfway through a fade has no highlights left at
  // all: the tone curve's whole upper half is compressed into a flat grey and
  // the image reads as a haze layer over the scene rather than as a fade. It
  // also silently caps the frame's peak — at 0.5 nothing can exceed sRGB 0.75
  // no matter how bright the scene is — which makes any measurement taken
  // through a partial fade describe the fade instead of the render.
  //
  // Ramping the exposure keeps the curve's shape all the way down: highlights
  // hold on longest and shadows go first, which is what an optical fade looks
  // like. A log-domain transform never reaches zero, so the last stretch is
  // finished off in display space below.
  //
  // The fade is folded into the value the meter sees rather than applied after
  // it, because a light meter reads the frame that is going to be displayed. A
  // sustained dim — a menu backdrop, say — is therefore partly compensated the
  // way an eye compensates, while a genuine fade-out still reaches black,
  // because the trim it can claw back is bounded at well under a stop.
  float exposure = resolveExposure(uExposure);
  color *= exposure;

  // ---- Bloom + lens dirt ----
  // The bloom chain is prefiltered in post-exposure terms, so it is added after
  // the scene has been exposed rather than before.
  vec3 bloom = texture2D(tBloom, uv).rgb;
  vec3 dirt = texture2D(tDirt, uv).rgb;
  color += bloom * uBloomStrength;
  color += bloom * dirt * uDirtStrength;

  // ---- Vignette ----
  // Optical vignetting is light lost at the lens barrel, so it belongs here,
  // scaling radiance ahead of the display transform. Applied afterwards it is a
  // straight multiply on display values, which drags the corners' white point
  // down and crushes their toe — the corners lose contrast rather than just
  // brightness, and on a frame with sky in the corners the roll-off shows up as
  // a visible grey ring.
  {
    vec2 c = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float d = length(c * mix(1.0, 0.78, uVignetteRoundness));
    float v = smoothstep(1.05, 0.34, d);
    color *= mix(1.0, v, uVignette);
  }

  // ---- Display transform ----
  color = highlightDesat(color, uHighlightDesat);
  color = tonemapAgX(
    color, uLookContrast, uLookShoulder, uToeKnee, uToeSlope, uLookSlope, uLookPower, uLookSat
  );

  // ---- Grade (display-referred) ----
  color = liftGammaGain(color, uLift, uGamma, uGain);
  color = splitTone(color, uShadowTint, uHighlightTint, uSplitBalance);
  color = applyContrast(color, uContrast);
  color = applySaturation(color, uSaturation);
  // Film loses chroma in the toe as well as the shoulder. Without this the
  // cool ambient that fills open shade keeps its full saturation all the way
  // down and the darkest parts of the frame read as indigo rather than black.
  color = shadowDesat(color, uShadowDesat);
  color = filmToe(color, uToe);

  // ---- Contrast-adaptive sharpening ----
  // The high-pass is taken on a tone-mapped proxy of the neighbourhood, not on
  // raw HDR. Differencing scene-referred radiance and adding the result to a
  // display-referred colour is a units mismatch: the same edge contributes ten
  // times as much on a sunlit wall as in shade, so the frame sharpens where it
  // is already bright and stays soft everywhere else. Normalising first makes
  // the response uniform across the exposure range.
  //
  // The amount is scaled by how much headroom the neighbourhood has left on
  // whichever side of its range is closer to clipping. A fixed amount has to be
  // set low enough for the worst case in the frame — a bright silhouette against
  // sky, where overshoot becomes a white halo — which leaves flat-lit texture
  // under-sharpened everywhere else. Deriving it per pixel lets stonework take
  // several times more correction than a roofline does, so the frame gains
  // acutance where detail lives rather than rings where it does not.
  //
  // Written as an unsharp mask against a 3x3 tent rather than as a reweighted
  // kernel. The reweighted form divides by 1 + sum(weights), which crosses zero
  // once the adaptive weight gets large and inverts the filter: thin geometry —
  // wires, poles, railings — comes out surrounded by radial streaks. This form
  // is bounded by construction, and the final ratio clamp bounds it again.
  //
  // The tent includes the diagonals. A cross-only blur sharpens horizontal and
  // vertical edges noticeably harder than 45-degree ones, which reads as a
  // filter rather than as resolution.
  if (uSharpen > 0.001) {
    float c0 = tonemapProxy(texture2D(tScene, uv).rgb * exposure);
    float cn = tonemapProxy(texture2D(tScene, uv + vec2(0.0, uTexel.y)).rgb * exposure);
    float cs = tonemapProxy(texture2D(tScene, uv - vec2(0.0, uTexel.y)).rgb * exposure);
    float ce = tonemapProxy(texture2D(tScene, uv + vec2(uTexel.x, 0.0)).rgb * exposure);
    float cw = tonemapProxy(texture2D(tScene, uv - vec2(uTexel.x, 0.0)).rgb * exposure);
    float cne = tonemapProxy(texture2D(tScene, uv + uTexel).rgb * exposure);
    float csw = tonemapProxy(texture2D(tScene, uv - uTexel).rgb * exposure);
    float cnw = tonemapProxy(texture2D(tScene, uv + vec2(-uTexel.x, uTexel.y)).rgb * exposure);
    float cse = tonemapProxy(texture2D(tScene, uv + vec2(uTexel.x, -uTexel.y)).rgb * exposure);

    float mn = min(min(min(cn, cs), min(ce, cw)), min(min(cne, csw), min(cnw, cse)));
    float mx = max(max(max(cn, cs), max(ce, cw)), max(max(cne, csw), max(cnw, cse)));
    mn = min(mn, c0);
    mx = max(mx, c0);

    // What produces a visible halo is the *size of the step* the filter is
    // overshooting across, not how bright the neighbourhood is. Scaling the
    // amount by remaining headroom conflates the two: a sunlit wall has little
    // room left above it, so stonework — the highest-frequency detail in a
    // desert frame, and the surface the eye judges resolution on — came out
    // sharpened at under half the amount used on the same texture in shade,
    // while a roofline against sky still got enough to ring.
    //
    // Local contrast separates the two cases cleanly. Texture spans a few
    // percent of the range and can take the full correction; a silhouette spans
    // most of it and takes almost none. Headroom is still consulted, but only as
    // a guard against overshooting into a clip, not as the primary term.
    float range = mx - mn;
    float edge = 1.0 / (1.0 + range * 4.0);
    float guard = clamp(min(mn, 1.0 - mx) * 8.0, 0.0, 1.0);
    float amp = edge * mix(0.35, 1.0, guard);
    float tent = c0 * 0.25
               + (cn + cs + ce + cw) * 0.125
               + (cne + csw + cnw + cse) * 0.0625;
    float sharpened = c0 + (c0 - tent) * uSharpen * amp * 2.6;
    // Applied as a ratio because the neighbourhood is measured on a proxy of the
    // display transform, not on the graded colour itself.
    color *= clamp(sharpened / max(c0, 0.02), 0.78, 1.38);
  }

  // ---- Suppression: desaturated tunnel vision under fire ----
  if (uSuppression > 0.001) {
    float d = distance(vUv, vec2(0.5));
    float tunnel = smoothstep(0.18, 0.62, d) * uSuppression;
    color = mix(color, vec3(obLuma(color)) * vec3(0.86, 0.9, 1.02), tunnel * 0.8);
    color *= 1.0 - tunnel * 0.35;
  }

  // ---- Directional damage indicator ----
  if (uDamageFlash > 0.001) {
    vec2 c = vUv - 0.5;
    float dirAlign = max(dot(normalize(c + 1e-5), normalize(uDamageDir.xy + 1e-5)), 0.0);
    float edge = smoothstep(0.16, 0.55, length(c));
    float pulse = uDamageFlash * edge * mix(0.35, 1.0, dirAlign * dirAlign);
    color = mix(color, vec3(0.62, 0.035, 0.02), pulse * 0.72);
  }

  // Finish the fade. The exposure ramp above carries almost all of it; this
  // only closes the last fraction of a stop, where log-domain latitude would
  // otherwise leave a visible floor.
  color *= smoothstep(0.0, 0.11, uFadeToBlack);

  // ---- Display encode ----
  color = linearToSRGB(clamp(color, 0.0, 1.0));

  // ---- Film grain ----
  // Weighted toward midtones and applied in display space: real film has
  // almost no visible grain in specular highlights or crushed blacks, and
  // uniform grain is the fastest way to make a frame look like a demo.
  if (uGrain > 0.0001) {
    vec2 gp = floor(gl_FragCoord.xy / max(uGrainSize, 1.0)) + floor(vec2(uTime * 24.0, uTime * 31.0));
    vec3 noise = hash32(gp) - 0.5;
    float l = obLuma(color);
    float response = 4.0 * l * (1.0 - l);
    color += noise * uGrain * response;
  }

  // Dither before the 8-bit write kills banding in the sky and in smoke
  // gradients, which is where it is always most visible.
  float bayer = hash12(gl_FragCoord.xy);
  color += (bayer - 0.5) * uDither;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
