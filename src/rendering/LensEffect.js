import { Uniform, Vector3 } from 'three';
import { Effect, BlendFunction, EffectAttribute } from 'postprocessing';

/**
 * Final "lens" pass (LDR, after SMAA): radial chromatic aberration, vignette, animated film grain and
 * all camera feedback FX (damage flash, low-health vignette, death fade, explosion distortion pulse).
 * It is a convolution effect (samples the input at offset UVs) so it must be the only convolution
 * effect in its EffectPass.
 *
 *   chroma            max channel offset in UV at the corners, 0 disables          (default 0.0022)
 *   vignetteStart     radial distance (0 centre, 1 edge midpoint, 1.41 corner) where darkening starts (0.6)
 *   vignetteDarkness  darkening at the corners, 0 disables                          (default 0.32)
 *   grain             film grain amplitude, 0 disables                              (default 0.028)
 *   sharpen           unsharp-mask amount, 0 disables                               (default 0.0)
 *
 * Runtime driven (RenderSystem writes these every frame):
 *   damage     0..1 red edge flash            lowHealth 0..1 persistent red/grey edge + desaturation
 *   death      0..1 greyscale + blur + darken pulse 0..1 explosion barrel-distortion / chroma spike
 */
const fragment = /* glsl */ `
uniform float chroma;
uniform float vignetteStart;
uniform float vignetteDarkness;
uniform float grain;
uniform float sharpen;
uniform float damage;
uniform float lowHealth;
uniform float death;
uniform float pulse;
uniform vec3 bloodColor;

float lensHash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

vec3 lensSample(vec2 uv, vec2 off) {
	// Radial chromatic aberration: red pushed outwards, blue inwards.
	return vec3(texture2D(inputBuffer, uv + off).r, texture2D(inputBuffer, uv).g, texture2D(inputBuffer, uv - off).b);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	vec2 d = uv - 0.5;
	float r = length(d * 2.0);
	vec2 suv = uv;

	// Explosion / shockwave: brief barrel distortion ring travelling outwards.
	if (pulse > 0.001) {
		float wave = sin(r * 5.0 - (1.0 - pulse) * 9.0) * pulse;
		suv = 0.5 + d * (1.0 + 0.045 * wave * (0.25 + r));
	}

	float ca = chroma * smoothstep(0.1, 1.3, r) * (1.0 + pulse * 4.0 + death * 1.5);
	vec2 off = d * ca;
	vec3 c;

	if (death > 0.001) {
		// Disc blur (16 taps, two rings, per-pixel random rotation/radius so ghosting turns into noise) whose
		// radius grows with the death ramp.
		vec2 rad = vec2(death * 0.011) * vec2(1.0, aspect);
		float rot = lensHash(uv * 17.0) * 6.2831853;
		c = lensSample(suv, off);
		float wsum = 1.0;
		for (int i = 0; i < 16; i++) {
			float a = float(i) * 0.3926991 + rot;
			float rr = ((i < 8) ? 0.5 : 1.0) * (0.85 + 0.3 * lensHash(uv * 53.0 + float(i)));
			vec2 o = vec2(cos(a), sin(a)) * rad * rr;
			c += lensSample(suv + o, off);
			wsum += 1.0;
		}
		c /= wsum;
	} else {
		c = lensSample(suv, off);
	}

	if (sharpen > 0.001) {
		vec3 blur = (texture2D(inputBuffer, suv + vec2(texelSize.x, 0.0)).rgb + texture2D(inputBuffer, suv - vec2(texelSize.x, 0.0)).rgb +
			texture2D(inputBuffer, suv + vec2(0.0, texelSize.y)).rgb + texture2D(inputBuffer, suv - vec2(0.0, texelSize.y)).rgb) * 0.25;
		c = max(vec3(0.0), c + (c - blur) * sharpen);
	}

	float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));

	// Vignette (smooth, mild, elliptical because r uses raw UV distance).
	float vig = 1.0 - vignetteDarkness * smoothstep(vignetteStart, 1.5, r);
	c *= vig;

	// Death: greyscale, darken. Low health: partial desaturation (before the blood edge so the red stays saturated).
	float lh = lowHealth * lowHealth;
	float grey = clamp(death * 0.92 + lh * 0.4, 0.0, 1.0);
	c = mix(c, vec3(luma * vig), grey);
	c *= 1.0 - death * 0.35 - lh * 0.08;

	// Damage flash + low-health: dark red edge that breathes with a heartbeat when health is low.
	float heartbeat = pow(max(0.0, sin(time * 4.2)), 6.0);
	float hurt = clamp(damage * 0.9 + lh * (0.45 + 0.3 * heartbeat), 0.0, 1.0);
	float edge = smoothstep(0.3, 1.45, r);
	vec3 blood = bloodColor * (0.25 + 0.5 * luma);
	c = mix(c, blood, edge * hurt);
	c = mix(c, c * vec3(1.0, 0.72, 0.66), damage * 0.35);

	// Film grain: multiplicative in shadows/midtones, fades in highlights, animated per frame.
	float n = lensHash(uv * resolution + vec2(fract(time * 7.31) * 173.0, fract(time * 3.17) * 91.0)) - 0.5;
	float gl = dot(c, vec3(0.2126, 0.7152, 0.0722));
	c += n * grain * (0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.8, gl))) * (0.3 + 1.7 * gl);

	outputColor = vec4(max(c, vec3(0.0)), inputColor.a);
}
`;

export class LensEffect extends Effect {
  constructor({ chroma = 0.0022, vignetteStart = 0.6, vignetteDarkness = 0.32, grain = 0.028, sharpen = 0.0 } = {}) {
    super('LensEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['chroma', new Uniform(chroma)],
        ['vignetteStart', new Uniform(vignetteStart)],
        ['vignetteDarkness', new Uniform(vignetteDarkness)],
        ['grain', new Uniform(grain)],
        ['sharpen', new Uniform(sharpen)],
        ['damage', new Uniform(0)],
        ['lowHealth', new Uniform(0)],
        ['death', new Uniform(0)],
        ['pulse', new Uniform(0)],
        ['bloodColor', new Uniform(new Vector3(0.42, 0.015, 0.008))],
      ]),
    });
  }

  set(params) {
    for (const [k, v] of Object.entries(params)) {
      const u = this.uniforms.get(k);
      if (!u) continue;
      if (u.value && u.value.isVector3 && v && v.isVector3) u.value.copy(v);
      else u.value = v;
    }
  }
}
