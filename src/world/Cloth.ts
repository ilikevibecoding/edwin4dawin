import * as THREE from 'three';
import type { MaterialName } from '../core/Interfaces';
import type { Batcher } from './Batcher';
import { applyFinish, type FinishOpts } from './Finish';
import { applyWind, type WindOpts } from './Wind';

/**
 * Cloth: light that comes *through* a surface rather than off it.
 *
 * Every renderer that shades only the front hemisphere gets hanging fabric
 * wrong in the same way, and this level got it wrong in the textbook way. A
 * sheet on a line between two buildings has the low sun behind it — that is
 * where washing is hung, because that is where the light is — so the face the
 * player sees is turned away from the key and receives sky irradiance and
 * nothing else. Sky at golden hour is blue. The measured result was laundry at
 * `B-R = +2.4` in a street whose every other warm surface ran `-38` to `-88`:
 * the one neutral-cool object in a gold frame, which is why it was the first
 * thing anybody looked at.
 *
 * The previous attempt at this is instructive. `Geo.addCloth` offsets a second
 * face a few centimetres behind the first, aims its normal near the horizon so
 * it catches the sun, and authors a brighter vertex colour on it. That is a
 * fake of the right phenomenon on the wrong surface: it brightens the face the
 * player cannot see. No arrangement of per-vertex colour can fix this, because
 * the quantity being described — how much of the sun is getting through the
 * weave toward *this* camera — depends on the sun and the view, and a vertex
 * colour is baked.
 *
 * So this is the real thing, lifted from the model the FX system already uses
 * for smoke (`src/shaders/fx/common.glsl.ts`) and cut down to what a flat sheet
 * needs. Three terms:
 *
 *  - **Diffuse transmission.** Light landing on the far side, scattered through
 *    the fibre mat and leaving on this one. Driven by `-N·L`, so it peaks when
 *    the sun is square behind the sheet and vanishes when the sheet is
 *    front-lit and the ordinary shading has it covered.
 *  - **Wrap.** A fibre mat scatters sideways as well as through, so the
 *    transition across the terminator is soft rather than a hard cosine — the
 *    same `(x + w) / (1 + w)` remap the smoke shader uses.
 *  - **Forward lobe.** The part that keeps its direction. Looking along the sun
 *    through one layer of cotton is what makes a hung sheet flare almost white,
 *    and it is the single strongest cue that a thing is thin.
 *
 * Plus a skylight term, because a sheet transmits the dome as well as the sun,
 * and without it the underside of an awning goes to black — which is what the
 * far-face fake was there to prevent in the first place.
 *
 * Both terms are occluded. The first cut of this was not, on the reasoning that
 * cloth here hangs in the open and the error case was an awning in shade
 * reading slightly hot. That was wrong by an order of magnitude: the souk is a
 * roofed arcade, everything under it is correctly in shade, and an unshadowed
 * transmission made every bolt of dyed cloth hanging in it a self-lit panel —
 * the brightest and most saturated thing in the frame, in the one part of the
 * level that is supposed to read as enclosed. Both occluders were already to
 * hand: `lgtSunShadow` for the sun, and the sky-visibility probe the ambient
 * path is reading anyway for the dome.
 */

/** Hanging laundry and bunting: white cotton, wind-animated, lit through. */
export const CLOTH_MAT = 'cloth_wind';
/** Awnings, canopies and blinds: heavier drab canvas, still lit through. */
export const AWNING_MAT = 'cloth_awning';

/**
 * Sun and sky, in the sky system's units, shared by every cloth material and
 * refreshed once a frame by `WorldSystem`.
 *
 * `uClothSun.w` fades the whole transmission out as the sun sets: below the
 * horizon there is nothing to come through, and the term would otherwise keep
 * glowing off the last value it was given.
 */
export const clothUniforms = {
  uClothSun: { value: new THREE.Vector4(0, 1, 0, 0) },
  uClothSunColor: { value: new THREE.Vector3(0, 0, 0) },
  uClothSkyColor: { value: new THREE.Vector3(0, 0, 0) },
};

export interface ClothOpts {
  /**
   * Fraction of the sun landing on the back that leaves the front, diffusely.
   * One layer of white shirting measures 0.2-0.4; canvas awning is lower.
   */
  transmit: number;
  /** Softness of the terminator, as a fraction of the cosine. */
  wrap?: number;
  /** Gain on the forward-scattered lobe, seen looking toward the sun. */
  forward?: number;
  /** Fraction of the sky dome that comes through. Keeps undersides alive. */
  sky?: number;
}

const CLOTH_PARS = /* glsl */ `
uniform vec4 uClothSun;
uniform vec3 uClothSunColor;
uniform vec3 uClothSkyColor;
uniform vec4 uCloth;
`;

/*
 * Added to `indirectDiffuse` rather than to `outgoingLight` so that the ambient
 * occlusion applied immediately afterwards still lands on it: a sheet gathered
 * into a fold really does transmit less where it is doubled over, and the AO
 * map is the only thing here that knows where the folds are.
 */
const CLOTH_CHUNK = /* glsl */ `
#if defined( RE_Direct )
{
  vec3 clothN = transformNormalByInverseViewMatrix(geometryNormal, viewMatrix);
  vec3 clothV = transformNormalByInverseViewMatrix(geometryViewDir, viewMatrix);
  float clothBack = dot(-clothN, uClothSun.xyz);
  clothBack = max(0.0, (clothBack + uCloth.y) / (1.0 + uCloth.y));
  /* Squared, so the lobe is tight enough that only a view genuinely along the
     sun gets the flare. A broad one just brightens the whole sheet and reads as
     a wrong exposure rather than as light coming through it. */
  float clothFwd = max(0.0, dot(-clothV, uClothSun.xyz));
  clothFwd *= clothFwd;
  /*
   * The cascade lookup, run against the *far* face: flip the geometric normal
   * so the bias offset leans toward the sun instead of away from it, and step
   * the sample point 12 cm up the sun ray first. Without that step the sheet
   * finds its own depth in the map and shadows itself, which on a surface two
   * centimetres thick is the whole of it.
   */
  float clothFlat = dot(-lgtFlatNormal, uClothSun.xyz);
  float clothLit = clothFlat > 0.0 ? lgtSunShadow(
    lgtWorldPos + uClothSun.xyz * 0.12, -lgtFlatNormal,
    -geometryPosition.z, clothFlat, gl_FragCoord.xy
  ) : 0.0;
  vec3 clothLight = uClothSunColor * uClothSun.w * clothLit * clothBack
    * (uCloth.x + uCloth.z * clothFwd) * RECIPROCAL_PI;
  /*
   * Dome transmission, read against the far face.
   *
   * The obvious form of this — scale the sky by the openness the fragment
   * itself reports — is wrong on the surface it matters most on, and wrong by
   * everything. The souk roof *is* the occluder the volume is describing, so a
   * canopy bay asks how much sky it can see, is told almost none because there
   * is a canopy in the way, and goes out. Measured, the bays over the arcade
   * came back at a five-hundredth of the lit wall beside them and read as
   * black slabs with a cold cast, which is the exact defect this file exists
   * to remove, reintroduced one surface along.
   *
   * What a sheet transmits is what lands on its *back*, so the volume is read
   * with the normal flipped: the same eight probes, weighted toward the ones
   * on the other side of the cloth. A roof bay then reads the open sky above
   * itself, and a bolt hanging under that roof reads the dark arcade behind
   * itself, which is the distinction the fragment's own openness cannot make
   * because both sit in the same cell. The cosine-weighted aperture rather
   * than the raw openness because that is the fraction that is the actual
   * irradiance arriving on that face, and the same quantity the ambient path
   * multiplies the probe by.
   */
  vec4 clothFar = lgtSkyVisibility(lgtWorldPos, -lgtFlatNormal);
  clothLight += uClothSkyColor * uCloth.w * lgtSkyAperture(clothFar, -clothN);
  reflectedLight.indirectDiffuse += clothLight * material.diffuseColor;
}
#endif
`;

/** Patches transmitted light onto an already-created material. */
export function applyCloth(mat: THREE.MeshStandardMaterial, opts: ClothOpts): void {
  const params = [
    opts.transmit,
    opts.wrap ?? 0.25,
    opts.forward ?? 0.9,
    opts.sky ?? 0.16,
  ];
  const prevCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms, renderer): void => {
    prevCompile?.call(mat, shader, renderer);
    shader.uniforms.uClothSun = clothUniforms.uClothSun;
    shader.uniforms.uClothSunColor = clothUniforms.uClothSunColor;
    shader.uniforms.uClothSkyColor = clothUniforms.uClothSkyColor;
    shader.uniforms.uCloth = { value: params };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CLOTH_PARS}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${CLOTH_CHUNK}`);
  };
  const prevKey = mat.customProgramCacheKey;
  mat.customProgramCacheKey = () => `${prevKey ? prevKey.call(mat) : ''}|cloth`;
}

/**
 * Registers a cloth material: a library base, restated as fabric by a finish,
 * animated by wind, and lit through.
 *
 * All three in one registration because a variant key can only be claimed once
 * and cloth needs all three. Wind is optional — an awning lashed to a frame at
 * every corner does not move, and a stall canopy that ripples like washing
 * reads as a flag.
 */
export function clothVariant(
  batch: Batcher,
  key: string,
  base: MaterialName,
  opts: {
    finish: FinishOpts;
    cloth: ClothOpts;
    wind?: WindOpts;
    extra?: (m: THREE.MeshStandardMaterial) => void;
  },
): string {
  return batch.registerVariant(key, base, (mat) => {
    mat.side = THREE.DoubleSide;
    opts.extra?.(mat);
    applyFinish(mat, opts.finish);
    if (opts.wind) applyWind(mat, key, opts.wind);
    applyCloth(mat, opts.cloth);
  }, { localSpace: opts.wind !== undefined });
}

const _sunDir = new THREE.Vector3();

/**
 * Refreshes the shared cloth uniforms from the sky.
 *
 * The fade starts a little above the horizon rather than at it: the last
 * degree of sun is heavily reddened and very weak, and letting a sheet keep a
 * visible glow into it makes the cloth the last lit thing in the level.
 */
export function updateCloth(sky: {
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  skyColor: THREE.Color;
} | undefined): void {
  if (!sky) return;
  _sunDir.copy(sky.sunDirection).normalize();
  const above = THREE.MathUtils.smoothstep(_sunDir.y, -0.01, 0.06);
  clothUniforms.uClothSun.value.set(_sunDir.x, _sunDir.y, _sunDir.z, above);
  clothUniforms.uClothSunColor.value.set(sky.sunColor.r, sky.sunColor.g, sky.sunColor.b);
  clothUniforms.uClothSkyColor.value.set(sky.skyColor.r, sky.skyColor.g, sky.skyColor.b);
}
