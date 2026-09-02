import { Uniform, Vector3 } from 'three';
import { Effect, BlendFunction } from 'postprocessing';

/**
 * Post-tone-mapping colour grade (runs on LDR linear colour, works in a gamma-2.2 domain internally).
 *
 *   contrast    S-curve strength around mid grey, 0 = off, 0.25 = strong          (default 0.12)
 *   saturation  1 = neutral                                                        (default 1.06)
 *   vibrance    extra saturation for already-desaturated colours, 0 = off          (default 0.10)
 *   shadowTint  colour added to shadows   (zero-mean teal keeps luminance intact)  (default cool teal)
 *   highlightTint colour added to highlights (warm)                                (default warm)
 *   splitStrength 0 = off                                                          (default 0.05)
 *   lift        black level offset (linear), keep tiny (<= 0.005) or 0            (default 0)
 *
 * The "COD grade": punchy midtones, slightly cool shadows, warm sunlight, blacks stay black.
 */
const fragment = /* glsl */ `
uniform float contrast;
uniform float saturation;
uniform float vibrance;
uniform vec3 shadowTint;
uniform vec3 highlightTint;
uniform float splitStrength;
uniform float lift;

vec3 gradeToGamma(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
vec3 gradeToLinear(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	vec3 c = max(inputColor.rgb, vec3(0.0));
	c = c + lift;
	vec3 g = gradeToGamma(c);

	// Gentle filmic S-curve that keeps 0 and 1 fixed (no clipping, no lifted blacks).
	vec3 s = g * g * (3.0 - 2.0 * g);
	g = mix(g, s, contrast);

	float l = dot(g, vec3(0.2126, 0.7152, 0.0722));

	// Split toning: cool shadows / warm highlights with zero-mean tints (luminance preserving).
	float sw = 1.0 - smoothstep(0.05, 0.65, l);
	float hw = smoothstep(0.35, 0.95, l);
	g += shadowTint * (sw * splitStrength) + highlightTint * (hw * splitStrength);

	// Saturation + vibrance (vibrance boosts low-saturation colours more than already-saturated ones).
	float mx = max(g.r, max(g.g, g.b));
	float mn = min(g.r, min(g.g, g.b));
	float sat = (mx - mn) / max(mx, 1e-4);
	float amount = saturation + vibrance * (1.0 - sat);
	g = mix(vec3(l), g, amount);

	outputColor = vec4(gradeToLinear(g), inputColor.a);
}
`;

export class ColorGradeEffect extends Effect {
  constructor({
    contrast = 0.12,
    saturation = 1.06,
    vibrance = 0.1,
    shadowTint = new Vector3(-0.02, 0.005, 0.03),
    highlightTint = new Vector3(0.025, 0.008, -0.02),
    splitStrength = 0.05,
    lift = 0.0,
  } = {}) {
    super('ColorGradeEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['contrast', new Uniform(contrast)],
        ['saturation', new Uniform(saturation)],
        ['vibrance', new Uniform(vibrance)],
        ['shadowTint', new Uniform(shadowTint.clone())],
        ['highlightTint', new Uniform(highlightTint.clone())],
        ['splitStrength', new Uniform(splitStrength)],
        ['lift', new Uniform(lift)],
      ]),
    });
  }

  /** Bulk-set any of the tunables listed in the header. */
  set(params) {
    for (const [k, v] of Object.entries(params)) {
      const u = this.uniforms.get(k);
      if (!u) continue;
      if (u.value && u.value.isVector3 && v && v.isVector3) u.value.copy(v);
      else u.value = v;
    }
  }
}
