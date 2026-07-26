import { GLSL_COMMON } from '../FullScreen';

/**
 * Physically-parameterised bokeh depth of field.
 *
 * Circle-of-confusion is computed from a real thin-lens model (focal length,
 * f-stop, sensor size) so that pulling the camera into ADS — which raises the
 * effective focal length — naturally throws the background out of focus by the
 * correct amount instead of by a hand-waved lerp.
 *
 * The gather uses a golden-angle spiral in a hexagonal aperture mask, giving
 * the hard-edged polygonal highlights of a real fast lens rather than the
 * mushy gaussian that reads as "blurred screenshot".
 */
export const COC_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D tDepth;
uniform float uNear;
uniform float uFar;
uniform float uFocusDistance;   // metres
uniform float uFocalLength;     // metres (e.g. 0.05 = 50mm)
uniform float uAperture;        // f-number
uniform float uSensorHeight;    // metres (0.024 = full frame)
uniform float uMaxCoC;          // clamp, in UV units
uniform float uNearScale;

${GLSL_COMMON}

void main() {
  float raw = texture2D(tDepth, vUv).x;
  float z = linearizeDepth(raw, uNear, uFar);

  float f = uFocalLength;
  float s = max(uFocusDistance, f * 1.02);
  // Thin-lens CoC diameter on the sensor, in metres.
  float cocMeters = abs(z - s) * (f * f) / (uAperture * s * max(z - f, 1e-4));
  // Normalise to a fraction of frame height.
  float coc = cocMeters / uSensorHeight;

  float signedCoC = (z < s ? -1.0 : 1.0) * coc;
  // Near-field blur is scaled separately: a viewmodel occupying the lower
  // third of the screen would otherwise dominate the whole frame.
  if (signedCoC < 0.0) signedCoC *= uNearScale;

  gl_FragColor = vec4(clamp(signedCoC, -uMaxCoC, uMaxCoC), z, 0.0, 1.0);
}
`;

export const DOF_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tCoC;
uniform vec2  uTexel;
uniform vec2  uResolution;
uniform float uMaxCoC;
uniform float uBokehIntensity;   // highlight boost inside the bokeh
uniform float uFrame;
uniform float uAnamorphic;       // 1.0 = circular, >1 stretches horizontally
uniform int   uBlades;

${GLSL_COMMON}

#ifndef DOF_SAMPLES
#define DOF_SAMPLES 24
#endif

// Distance from centre to the edge of an n-gon aperture in direction theta.
float apertureRadius(float theta, int blades, float rotation) {
  if (blades < 3) return 1.0;
  float n = float(blades);
  float a = theta + rotation;
  float seg = PI * 2.0 / n;
  float k = cos(PI / n) / cos(mod(a, seg) - seg * 0.5);
  return k;
}

void main() {
  vec2 cocData = texture2D(tCoC, vUv).xy;
  float centerCoC = cocData.x;
  vec3 centerColor = texture2D(tScene, vUv).rgb;

  float absCoC = abs(centerCoC);
  if (absCoC < uTexel.y * 1.2) {
    gl_FragColor = vec4(centerColor, 1.0);
    return;
  }

  float jitter = hash12(gl_FragCoord.xy + uFrame * 7.0) * PI * 2.0;

  vec3 sum = vec3(0.0);
  float wsum = 0.0;

  const float GOLDEN = 2.39996323;

  for (int i = 0; i < DOF_SAMPLES; i++) {
    float fi = float(i) + 0.5;
    float r = sqrt(fi / float(DOF_SAMPLES));
    float theta = fi * GOLDEN + jitter;
    r *= apertureRadius(theta, uBlades, jitter * 0.3);

    vec2 dir = vec2(cos(theta) * uAnamorphic, sin(theta));
    vec2 offset = dir * r * absCoC;
    offset.x /= (uResolution.x / uResolution.y);
    vec2 uv = vUv + offset;

    vec3 c = texture2D(tScene, uv).rgb;
    float sampleCoC = abs(texture2D(tCoC, uv).x);

    // Scatter-as-gather: a sample only contributes if its own CoC is large
    // enough to reach this pixel. Without this, sharp foreground objects leak
    // into blurred backgrounds and the whole image looks soft.
    float reach = smoothstep(0.0, absCoC * 0.55, sampleCoC * 0.55 + absCoC * 0.15);

    // Energy-preserving bokeh: bright samples are weighted up so specular
    // highlights bloom into discs instead of averaging away.
    float lum = obLuma(c);
    float w = reach * (1.0 + lum * uBokehIntensity);

    sum += c * w;
    wsum += w;
  }

  vec3 blurred = wsum > 0.0 ? sum / wsum : centerColor;
  // Ease in the transition so the in-focus/out-of-focus boundary is smooth.
  float mixAmt = smoothstep(uTexel.y * 1.2, uTexel.y * 4.0, absCoC);
  gl_FragColor = vec4(mix(centerColor, blurred, mixAmt), 1.0);
}
`;
