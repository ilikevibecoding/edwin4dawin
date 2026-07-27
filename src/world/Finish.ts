import type * as THREE from 'three';
import type { MaterialName } from '../core/Interfaces';
import type { Batcher } from './Batcher';

/**
 * Material finishes.
 *
 * Every merged surface in the level is tinted by vertex colour, which is a
 * multiply. That is enough vocabulary for most things — dusty, bleached, in
 * shade — and it is not enough for two cases that keep coming up:
 *
 *  - **A material whose albedo carries a strong hue of its own.** `metal_rusted`
 *    is iron oxide, and iron oxide sits four to one red-over-blue *before* the
 *    sRGB conversion that the bake does, which roughly squares the ratio. To
 *    pull it to the near-neutral grey-brown of fire-damaged steel a multiplier
 *    has to raise blue by a factor of four; but the same map also carries
 *    surviving mill scale at a blue-black, and that gets raised by four as well
 *    and comes out as saturated navy. The result was a burnt-out bus rendered as
 *    a blue-and-orange mosaic. No per-channel multiply can fix it, because the
 *    two hues need opposite corrections and there is only one multiplier.
 *
 *  - **A material whose albedo contrast is louder than the object.** The same
 *    map's blooms swing about three to one in value. Across a shed roof that is
 *    exactly right. Across the flank of a vehicle ten metres away the swings are
 *    smaller than the eye's resolution and integrate into speckle, which reads
 *    as a noisy texture rather than as corrosion.
 *
 * Both are fixed in the same place: collapse the map's own colour toward grey
 * and, optionally, toward a flat value, immediately after the albedo lookup and
 * *before* vertex colour is applied. The tint then sets the colour outright
 * instead of negotiating with it, and the surface keeps every bit of its normal,
 * roughness, metalness and ambient-occlusion detail — which is where the sense
 * of a real material lives anyway.
 *
 * This is deliberately a world-side decision rather than a library one. The
 * library's materials are correct; a specific object wanting one of them as a
 * substrate rather than as a finished look is this system's problem.
 */

export interface FinishOpts {
  /** 0 keeps the map's hue, 1 makes it fully greyscale. */
  desaturate?: number;
  /**
   * Pulls albedo toward `pivot`, flattening the map's value contrast. 0 keeps
   * it, 1 replaces the albedo with a constant.
   */
  flatten?: number;
  /** Linear value the flattening pulls toward. */
  pivot?: number;
  /** Multiplies the material roughness (maps are multiplied, not replaced). */
  roughness?: number;
  /**
   * Sets roughness outright, for when the library's value is not known and a
   * multiplier cannot be reasoned about. Takes precedence over `roughness`.
   */
  roughnessSet?: number;
  /** Multiplies the material metalness. */
  metalness?: number;
  /** Scales the normal map, for calming relief that is too loud at range. */
  normalScale?: number;
  /**
   * Scales the ambient-occlusion map.
   *
   * This is the one that matters on a surface receiving no direct light, and it
   * is not obvious why until you notice that AO multiplies the *indirect* term
   * only. On a sunlit wall it is a subtle darkening in the crevices, which is
   * what it is for. On an interior soffit, where indirect light is the whole of
   * the illumination, the AO map stops being a modifier and becomes the image:
   * every baked pit and patch edge reproduces at full contrast, and no amount of
   * flattening the albedo or calming the normal touches it. Diagnosing that cost
   * two rounds of captures where the ceiling stayed mottled while its measured
   * albedo spread was down to a few per cent.
   */
  ao?: number;
}

const FINISH_PARS = /* glsl */ `
uniform vec3 uFinish;
`;

/*
 * Rec. 709 luma, so the greyscale keeps the value the map author chose. A flat
 * channel average would lift reds and drop blues, which on rust means the
 * blooms lose the contrast against mill scale that makes them read at all.
 */
const FINISH_CHUNK = /* glsl */ `
{
  float finishLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 finishCol = mix(diffuseColor.rgb, vec3(finishLuma), uFinish.x);
  diffuseColor.rgb = mix(finishCol, vec3(uFinish.z), uFinish.y);
}
`;

/**
 * Registers a finish of a library material and returns the key to pass to
 * `Batcher.solid` or a `PropDef`.
 */
export function finishVariant(
  batch: Batcher,
  key: string,
  base: MaterialName,
  opts: FinishOpts,
): string {
  const desat = opts.desaturate ?? 0;
  const flat = opts.flatten ?? 0;
  const pivot = opts.pivot ?? 0.1;
  return batch.registerVariant(key, base, (mat) => {
    if (opts.roughnessSet !== undefined) mat.roughness = opts.roughnessSet;
    else if (opts.roughness !== undefined) mat.roughness *= opts.roughness;
    if (opts.metalness !== undefined) mat.metalness *= opts.metalness;
    if (opts.normalScale !== undefined) mat.normalScale.multiplyScalar(opts.normalScale);
    if (opts.ao !== undefined) mat.aoMapIntensity *= opts.ao;
    const prevCompile = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms, renderer): void => {
      prevCompile?.call(mat, shader, renderer);
      shader.uniforms.uFinish = { value: [desat, flat, pivot] };
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FINISH_PARS}`)
        .replace('#include <map_fragment>', `#include <map_fragment>\n${FINISH_CHUNK}`);
    };
    const prevKey = mat.customProgramCacheKey;
    mat.customProgramCacheKey = () => `${prevKey ? prevKey.call(mat) : ''}|finish`;
  });
}

/**
 * Sand-cement blockwork: `brick` with most of its fired-clay red taken out.
 *
 * This coast builds in hollow cement block and renders over it, so what shows
 * through blown render, off a knocked arris or along a rising-damp base course
 * is buff-grey blockwork, not London stock. Reaching that by tinting `brick`
 * directly does not work, for the usual reason — the map holds red brick faces
 * *and* grey mortar joints, and the multiply that turns the faces buff turns the
 * joints cyan, so a gate pier came out as a blue-and-orange mosaic. Collapsing
 * most of the hue first leaves the courses reading as courses and lets one warm
 * tint set the colour of the whole thing.
 *
 * A little of the original hue is left in on purpose: at full neutrality the
 * joints and the faces land at the same colour and the bond stops reading.
 */
export const BLOCK_MAT = 'block_buff';

/** Buff blockwork tint. Measured: `brick` bakes to linear (0.24, 0.17, 0.14). */
export const BLOCK_BUFF: readonly [number, number, number] = [1.56, 1.42, 1.0];

/**
 * Painted architectural metal: shutters, gates, railings, container frames.
 *
 * `metal_painted` is a petrol-blue enamel — linear (0.066, 0.101, 0.111), nearly
 * two to one blue over red — and the tints that had been reaching for a plausible
 * faded shutter colour on top of that were multiplying the blue channel by more
 * than two again. The result was correct in hue and far too pure in it: a
 * two-metre roller shutter in the near foreground of the villa courtyard came out
 * as the most saturated thing in the level by a wide margin, and read as freshly
 * sprayed. Shutters on this coast are painted blue, and then they sit in the sun
 * and the dust for fifteen years. Pulling half the hue out of the substrate lets
 * the tint land on a muted slate that still reads as blue paint.
 */
export const PAINT_ARCH = 'paint_arch';

export function registerMasonryFinishes(batch: Batcher): void {
  finishVariant(batch, BLOCK_MAT, 'brick', { desaturate: 0.7, flatten: 0.12, pivot: 0.19 });
  finishVariant(batch, PAINT_ARCH, 'metal_painted', {
    desaturate: 0.55, flatten: 0.18, pivot: 0.1,
  });
}

/**
 * Interior soffit render, with its relief turned down rather than its colour.
 *
 * Worth recording how this one was diagnosed, because the obvious answer was
 * wrong. Every interior shot came back with a lid of coarse speckle over it that
 * read as camouflage netting, and the natural reading — the same one that was
 * correct for the vehicles — is that the albedo map is too contrasty for the
 * scale it is drawn at. Measuring it settled the question in the other
 * direction: `stucco_sand` bakes to a p10/p90 of 0.318 to 0.395, a value swing
 * of 1.2 to one, which is almost perfectly flat. There was no albedo contrast to
 * remove.
 *
 * The speckle is the *normal* map. A soffit is drawn at seven times the authored
 * uv rate — deliberately, because at the authored rate the material's
 * fallen-patch feature resolves to metre-wide blotches and the ceiling reads as
 * damp — and running the relief seven times faster turns a plausible skim
 * texture into pits a couple of centimetres across. Those are far below the size
 * the lighting can resolve honestly, so they integrate into noise. Scaling the
 * normal down leaves the fine uv doing what it was chosen for, without asking
 * the shading to describe bumps too small to describe.
 */
export const RENDER_SOFFIT = 'render_soffit';

/**
 * Interior screed floor: `concrete` with both its blotching and its relief
 * pulled in.
 *
 * Unlike the soffit this one really is partly albedo — `concrete` measures 1.6 to
 * one, the loudest of the masonry set — so it gets a little flattening as well as
 * a calmer normal. A room's floor is the largest unbroken surface the player ever
 * stands on and its job is to be the quiet ground that the furniture, the debris
 * and the shafts of window light read against.
 */
export const SCREED_CALM = 'screed_calm';

/**
 * The sea surface, roughened until it stops being a mirror.
 *
 * The swell geometry in `Terrain.buildSea` fixed half of this problem — the sea
 * now has slopes steep enough to resolve a reflection into bands instead of one
 * sheet — and left the other half, which is that the bands were all still bands
 * of sky. The library's `water` is a physical material with an ior of 1.33 and a
 * near-mirror roughness, and its albedo bakes to a linear 0.042: about four per
 * cent. So ninety-odd per cent of every pixel is a reflection of a gold sky, the
 * teal in the depth ramp is a rounding error on top of it, and darkening the
 * albedo cannot help because there is almost no albedo in the result to darken.
 *
 * Roughening the surface is the only lever that touches the term actually doing
 * the work. It broadens the specular lobe, which at the grazing angles this
 * shoreline is viewed from drops the reflected intensity sharply and lets the
 * depth colour through — and it is also just true of open water at this scale,
 * where a square metre of sea contains far more ripple than any normal map here
 * describes. Set absolutely rather than scaled, because a multiplier against an
 * unknown near-zero base is unpredictable in exactly the range that matters.
 */
export const SEA_SURFACE = 'sea_surface';

export function registerSeaFinish(batch: Batcher): void {
  finishVariant(batch, SEA_SURFACE, 'water', { roughnessSet: 0.34, normalScale: 2.4 });
}

/**
 * Galvanised tank sheet with its ribs calmed.
 *
 * A corrugated cylinder standing in low raking sun is the worst case there is for
 * a strong normal map: every rib presents one face very nearly square to the sun
 * and the next very nearly away from it, so the shading alternates between the
 * brightest and darkest values in the frame every fifteen centimetres. Physically
 * that is what corrugated sheet does; on screen, at the size these tanks appear
 * on the roof vantage, it reads as a printed barcode. Halving the relief keeps the
 * ribs legible as folds without letting them swing the full range.
 */
export const TANK_SHEET = 'tank_sheet';

export function registerInteriorFinishes(batch: Batcher): void {
  finishVariant(batch, TANK_SHEET, 'metal_corrugated', {
    normalScale: 0.45, flatten: 0.3, pivot: 0.447,
  });
  // A little flattening as well as the calmer normal: what survived the normal
  // fix was a softer, larger blotch, which is the albedo's own 1.2x spread drawn
  // at seven times rate. Pivot is the material's measured mean.
  /*
   * Desaturation is doing most of the work here, which took three rounds to see
   * because the mottle looks like a value problem and is not one. `stucco_sand`
   * measures 1.2 to one in value — nothing to fix — but it is a *mixture*, sand
   * render over a substrate that shows through where patches have fallen, and the
   * two differ far more in hue than in brightness. Flattening toward a neutral
   * grey pulls both toward each other only as fast as it dims them, so at any
   * setting mild enough to keep the ceiling from going flat, the warm patches were
   * still visibly warm against cool render. Collapsing the hue first lets the
   * vertex tint set one colour for the whole soffit, and the patches survive as
   * faint value shifts, which is what a skimmed ceiling actually looks like.
   */
  finishVariant(batch, RENDER_SOFFIT, 'stucco_sand', {
    desaturate: 0.8, flatten: 0.4, pivot: 0.357, normalScale: 0.22, ao: 0.3,
  });
  // Pivot is `concrete`'s own measured mean, so flattening changes the spread
  // without moving the value.
  finishVariant(batch, SCREED_CALM, 'concrete', {
    flatten: 0.4, pivot: 0.227, normalScale: 0.45, ao: 0.6,
  });
}
