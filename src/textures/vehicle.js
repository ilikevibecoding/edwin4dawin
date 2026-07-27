import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  cached,
  canvasTexture,
  clamp,
  cutoutTexture,
  fbm,
  heightField,
  mixRgb,
  mulberry32,
  normalFromHeight,
  pixelTexture,
  ridged,
  roughnessTexture,
  smoothstep,
  worley,
} from './core.js';

// ---------------------------------------------------------------------------
// Procedural PBR map set for the truck. Five material families live here:
// automotive clearcoat paint, worn/blasted metal, moulded rubber, sun-faded
// black plastic, and soft trim.
//
// Colour-space note: `core.hexToRgb` hands back the *working space* (linear)
// components of a hex literal, because three converts hex from sRGB on the way
// in. Writing those bytes into an sRGB-tagged texture decodes them a second
// time and lands roughly a factor of ten too dark, which is what made the whole
// truck read as black. Everything here goes through `rgb()` instead, which
// keeps the literal sRGB bytes.
// ---------------------------------------------------------------------------

const S = 512;

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

/** Metallic flake normal + the micro-scratch roughness that sells clearcoat. */
export function paintFlakeNormal() {
  return cached('veh.flake', () => {
    const n = 256;
    const rnd = mulberry32(31);
    const hf = heightField(n, n, () => rnd() * 0.5);
    // clump the flakes slightly so they glint in groups under a light
    const out = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let s = 0;
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++)
            s += hf[(((y + oy) % n) + n) % n * n + ((((x + ox) % n) + n) % n)];
        out[y * n + x] = hf[y * n + x] * 0.75 + (s / 9) * 0.25;
      }
    }
    // Per-pixel noise at a high repeat aliases into a visible cross-hatch once
    // the panel is more than a metre from the camera, which reads as woven cloth
    // rather than metallic flake. Kept coarse enough to survive mipmapping.
    return normalFromHeight(out, n, n, 1.1, { repeat: 5 });
  });
}

/**
 * Orange peel: the ripple a sprayed panel always has. Two scales, because the
 * whole point of it is to warp the *shape* of the reflected skyline — one
 * frequency only makes the highlight fuzzy, which a rougher coat would do more
 * cheaply. This goes on the clearcoat normal, not the base: the ripple is in the
 * lacquer, and it is the lacquer that carries the reflection.
 */
export function paintPeelNormal() {
  return cached('veh.peel', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      return (
        fbm(u * 7, v * 7, { octaves: 3, period: 7, seed: 313 }) * 0.52 +
        fbm(u * 19, v * 19, { octaves: 2, period: 19, seed: 77 }) * 0.31 +
        fbm(u * 54, v * 54, { octaves: 2, period: 54, seed: 641 }) * 0.17
      );
    });
    return normalFromHeight(hf, n, n, 1.0, { repeat: 3 });
  });
}

/**
 * Basecoat roughness. This is the lobe the metallic flake sparkles in, so it
 * sits well above the clearcoat's — a smooth basecoat under a smooth coat gives
 * two coincident mirror highlights and reads as vacuum-formed plastic.
 */
export function paintRoughness() {
  return cached('veh.paintRough', () =>
    roughnessTexture(
      S,
      S,
      (x, y) => {
        const u = x / S;
        const v = y / S;
        // flake scatter, swirl marks from machine polishing, deeper wash scratches
        const flake = fbm(u * 150, v * 150, { octaves: 2, period: 150, seed: 707 });
        const swirl = fbm(u * 90, v * 90, { octaves: 3, period: 90, seed: 12 });
        const streak = fbm(u * 4 + swirl * 0.4, v * 220, { octaves: 2, period: 4, seed: 44 });
        const haze = fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: 91 });
        let r = 0.26 + flake * 0.1 + swirl * 0.05 + streak * 0.05;
        r += smoothstep(0.66, 0.97, haze) * 0.14; // polish haze
        return clamp(r, 0.2, 0.52);
      },
      { repeat: 2 },
    ),
  );
}

/**
 * Basecoat map. Deliberately close to flat: the dirt gradient that used to live
 * in here is now driven from object space by `applyDirt`, so it climbs the real
 * body instead of restarting on every merged primitive's UV island.
 */
export function paintBaseMap(color = PALETTE.bodyPaint) {
  return cached('veh.base.' + color, () => {
    const base = rgb(color);
    const hi = [
      Math.min(255, base[0] * 1.2 + 13),
      Math.min(255, base[1] * 1.16 + 13),
      Math.min(255, base[2] * 1.12 + 11),
    ];
    const lo = [base[0] * 0.8, base[1] * 0.81, base[2] * 0.84];
    return pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        // clearcoat thickness variation + metallic flake, which is genuinely
        // lighter where a flake happens to face the camera
        const cloud = fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: 401 });
        const flake = fbm(u * 150, v * 150, { octaves: 2, period: 150, seed: 9 });
        const glint = smoothstep(0.74, 0.97, flake);
        const scratch = smoothstep(0.93, 1.0, ridged(u * 3, v * 190, { octaves: 2, period: 3, seed: 61 }));
        // Kept tight. A wide basecoat range turns the panel into camouflage
        // blotches; the clearcoat highlight is what should be doing the work.
        let c = mixRgb(lo, hi, clamp(cloud * 0.34 + 0.4 + flake * 0.18));
        // the flake itself is aluminium, so where it catches it desaturates
        c = mixRgb(c, [c[0] * 0.6 + 96, c[1] * 0.6 + 98, c[2] * 0.6 + 97], glint * 0.3);
        c = mixRgb(c, [190, 192, 190], scratch * 0.3);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
  });
}

/**
 * The four fields the dirt layers are built from, packed into one texture so
 * the whole system costs three samples.
 *
 * R, G, B are Worley *distance* fields at three cell sizes rather than finished
 * masks. Storing the distance is what lets the shader move the threshold per
 * pixel: raising it makes drops more numerous without making the existing ones
 * fainter, which is the difference between spatter and a wash. It also hands
 * back the band just outside each drop for free, which is where the dried halo
 * goes. A is a streaked fbm for the crust boundary and the run-off.
 */
export function dirtLayers() {
  return cached('veh.dirtLayers', () =>
    pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        // a few big drips, several times as many mid specks, a fine peppering
        out[0] = clamp(worley(u * 8, v * 8, 8, 811).f1 * 1.5) * 255;
        out[1] = clamp(worley(u * 21, v * 21, 21, 337).f1 * 1.6) * 255;
        out[2] = clamp(worley(u * 52, v * 52, 52, 149).f1 * 1.7) * 255;
        out[3] =
          clamp(
            fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: 421 }) * 0.6 +
              fbm(u * 34, v * 4, { octaves: 3, period: 34, seed: 77 }) * 0.4,
          ) * 255;
      },
      { repeat: 1 },
    ),
  );
}

/**
 * Compose one more shader patch onto a material that may already carry one.
 * `onBeforeCompile` is a single slot, and the program cache key has to name
 * every patch or two materials of the same class end up sharing a program.
 */
function extendMaterial(material, tag, patch) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    patch(shader, renderer);
  };
  material.customProgramCacheKey = function () {
    return `${prevKey ? prevKey.call(this) : ''}|${tag}`;
  };
  return material;
}

/**
 * Analytic environment for brightwork.
 *
 * A PMREM of a clear sky is almost uniform, so a mirror material hands back one
 * flat value and chrome comes out as chalky white plastic. Real chrome is mostly
 * a dark mirror with a couple of bright streaks, and that value range is the
 * whole read.
 *
 * What the truck actually stands in is a closed forest: at eye level every
 * horizontal direction is dark trunks, the canopy edge is up around 25-30
 * degrees, and only above that is there sky. So the reflection is graded off the
 * elevation of the reflected ray — ground, then a dark wall of trees through the
 * whole band a vertical face can see, then sky — and the hot rim is confined to
 * a narrow streak at the canopy line, where a chamfer catches it and a flat
 * panel does not. `trees` breaks the wall up with sunlit gaps so the surface is
 * visibly mirroring something rather than holding one value.
 */
/**
 * The sky as a panel on this truck actually sees it.
 *
 * Every reflection colour here was hand-picked around 0x93b6d8-0x9cbbd8, which
 * is open-country blue at roughly 0.32 saturation. The sky in this scene is not
 * that. Measured off the rendered frame, the open sky above the treeline sits at
 * 0.65 luma, 0.08 saturation, r:b 0.93 — a pale near-neutral grey, because it is
 * a hazy sky seen up a forest corridor. Reflecting a saturated blue into green
 * paint made teal, and that is the whole of the flat-teal bed and canopy panels:
 * they were not missing the gradient so much as grading towards a colour that
 * does not exist in the shot.
 *
 * So it is derived from the palette the sky is actually built from rather than
 * guessed again: the sky dome runs from `skyTop` to `skyHorizon`, and a panel
 * under a canopy sees mostly the lower, hazier, warmer part of that range. The
 * mix below lands at r:b 0.90 against the measured 0.93, and it retunes itself
 * if the master moves the sky instead of drifting out of agreement with it.
 */
const REFLECTED_SKY = new THREE.Color(PALETTE.skyTop).lerp(new THREE.Color(PALETTE.skyHorizon), 0.55);

/** The same sky at a different exposure, for surfaces that see less of it. */
export function reflectedSky(scale = 1) {
  return REFLECTED_SKY.clone().multiplyScalar(scale);
}

export function applyBrightwork(
  material,
  {
    tag = 'bw',
    // What is under this truck is a pale dirt two-track in the open, not
    // tarmac in shade. At 0x0d0b08 the ground half of every reflection was
    // effectively black, so the only thing the model could deliver was "dark",
    // and the horizon line — the single most recognisable feature of a
    // reflection in car paint — had no contrast to be visible in.
    ground = 0x2b241c,
    wall = 0x191c14,
    sky = REFLECTED_SKY,
    rim = 0xffeccb,
    strength = 1,
    band = 0.5,
    trees = 0.8,
    line = 0.48,
    fresnel = 0,
    clearcoat = false,
    pane = 0,
    // Grade the reflection off the clearcoat's roughness rather than the base
    // layer's. On paint the two are a factor of five apart — a 0.34 basecoat
    // under a 0.07 lacquer — and using the basecoat smeared the skyline into a
    // wash, which is exactly the read a clearcoat is *not* supposed to have.
    ccRough = false,
    // How much of the hot skyline band a perfectly flat surface gives up. See
    // the curvature term below: it is the fix for brightwork light leaks.
    flat = 0,
    // Weight on the *base* specular lobe, separate from the coat's. On paint
    // the same reflection was being paid into both lobes at full strength,
    // which is double counting: the coat is on top, so what the base layer sees
    // is what the coat let through. Leaving it at 1 is what washed a green
    // bonnet out to pale teal.
    base = 1,
    // Skylight on the *diffuse* side, in units of plain reflectance.
    //
    // Everything above is paid into `radiance`, which is the specular lobe, and
    // a dielectric's specular is four per cent. So a black plastic grille got
    // essentially nothing from a reflection model however hard it was driven —
    // the grille slats and the bumper tubes measured 0.114 and 0.156 luma and a
    // crush mask showed the whole nose of the truck failing at once, with
    // `applyBrightwork` already on it. Metals are the opposite: no diffuse at
    // all, so this term leaves them alone, which is exactly the split wanted.
    // Physically it is the skylight and trail bounce a single hemisphere light
    // under-delivers in a pocket like the space behind a brush bar.
    ambient = 0,
    // How hard roughness drags the graded elevation from the mirror ray towards
    // the surface normal. This is the single most consequential number in the
    // model — it decides whether a painted panel shows a reflection gradient at
    // all — so it is a uniform, and therefore sweepable, rather than a constant
    // buried in the GLSL where it cost two iterations to find.
    lobe = 1.6,
  } = {},
) {
  const u = {
    uBwGround: { value: new THREE.Color(ground) },
    uBwWall: { value: new THREE.Color(wall) },
    uBwSky: { value: new THREE.Color(sky) },
    uBwRim: { value: new THREE.Color(rim) },
    uBwStrength: { value: strength },
    uBwBand: { value: band },
    uBwTrees: { value: trees },
    uBwLine: { value: line },
    uBwFresnel: { value: fresnel },
    uBwBase: { value: base },
    uBwLobe: { value: lobe },
  };
  if (pane) u.uBwPane = { value: pane };
  if (flat) u.uBwFlat = { value: flat };
  if (ambient) u.uBwAmbient = { value: ambient };
  // exposed so the values can be swept against a live render rather than guessed
  material.userData.bw = u;
  // A pane's inner face mirrors the cabin, not the canopy, and this model has no
  // idea it is indoors: a raked screen sends the reflected ray climbing, so the
  // bottom half of the windscreen and the whole of the door glass were being
  // graded to pale sky. The cabin side gets the dark end of the same gradient,
  // warmed towards the colour of the pad, because what the driver sees mirrored
  // in the bottom of the screen is the dash top — and that reflection is worth
  // *more* weight than it first looked, not less.
  const paneFace = pane
    ? `float bwOut = gl_FrontFacing ? 1.0 : 0.0;
          bwRefl = mix( uBwGround * vec3( 2.6, 2.1, 1.6 ), bwRefl, bwOut );`
    : '';
  // Fresnel compensation on the coat's lobe.
  //
  // `strength` is tuned face-on, where a clearcoat's env BRDF is about 4% — that
  // is the whole reason paint needs a 5. But the BRDF's Fresnel climbs towards 1
  // at grazing incidence, so the *same* multiplier that makes the horizon merely
  // visible on a flank becomes a twenty-fold over-count along any edge turning
  // away from the camera. That is the light leak: a hard white band across the
  // bonnet's leading crease. A sweep put it beyond doubt — zeroing only the
  // paint's `uBwStrength` took the hero frame from 0.171% to 0.022% of pixels
  // over 0.9 luma and cut the range inside the streak from 0.918 to 0.634, while
  // killing chrome, aluminium and the coat's own sharpness each changed nothing.
  //
  // So the weight now falls as the Fresnel gain rises, which keeps the product
  // roughly bounded. Face-on nothing changes and the graded sky-to-ground read
  // survives intact; at the rim the reflection is cut, which is where the BRDF
  // is multiplying it hardest.
  //
  // Only *partly* cancelled, though. A floor of 0.16 killed the leak outright
  // but also took a third of the value off the front wing in the detail view
  // (0.456 to 0.403 luma), because a low three-quarter camera sees most of a
  // panel at grazing incidence and that reflection is the panel's whole read.
  // Brightening at grazing is real Fresnel behaviour and worth keeping; only
  // the overshoot is not. At a third the streak stays under the clip point with
  // a wide margin and the wing keeps its gradient.
  const ccWeight =
    clearcoat === 'full' ? 'mix( 1.0, 0.34, bwEdge * bwEdge )' : clearcoat ? 'bwEdge * bwEdge' : '0.0';
  const key = `bw:${tag}:${fresnel}:${clearcoat}:${pane}:${ccRough}:${flat > 0}:${ambient > 0}`;
  return extendMaterial(material, key, (shader) => {
    Object.assign(shader.uniforms, u);

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uBwGround;
        uniform vec3 uBwWall;
        uniform vec3 uBwSky;
        uniform vec3 uBwRim;
        uniform float uBwStrength;
        uniform float uBwBand;
        uniform float uBwTrees;
        uniform float uBwLine;
        uniform float uBwFresnel;
        uniform float uBwBase;
        uniform float uBwLobe;
        ${flat ? 'uniform float uBwFlat;' : ''}
        ${ambient ? 'uniform float uBwAmbient;' : ''}
        ${pane ? 'uniform float uBwPane;\n        vec3 bwPaneRefl = vec3( 0.0 );\n        float bwPaneF = 0.0;\n        float bwPaneOut = 1.0;' : ''}`,
      )
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
        ${
          ambient
            ? `#if defined( RE_IndirectDiffuse )
        {
          // Hemispheric fill keyed off the world normal. Irradiance in three is
          // PI * radiance and the Lambert BRDF divides it straight back out, so
          // uBwAmbient reads as a plain reflectance. It lands before
          // <aomap_fragment>, so cavities still occlude it and the term cannot
          // flatten the very recesses it is meant to keep readable.
          //
          // The colour is built from the same three bands as the reflection
          // above rather than a straight sky-to-ground lerp. That first version
          // made the skid plate *bluer* as it got brighter — r:b fell from 0.61
          // to 0.53 across the sweep — because a downward-facing surface was
          // still being handed half a hemisphere of 0x9cbbd8. Under this truck
          // is warm dirt; level with the grille is a wall of dark conifer. Only
          // a surface actually pointing up gets to see sky, and even that is
          // canopy-filtered, so the upper band is mixed well short of open blue.
          vec3 bwAN = inverseTransformDirection( geometryNormal, viewMatrix );
          vec3 bwALow = uBwGround * 1.7;
          vec3 bwAHigh = mix( uBwWall * 2.2, uBwSky, 0.4 );
          vec3 bwAmb = mix( bwALow, bwAHigh, bwAN.y * 0.5 + 0.5 );
          bwAmb = mix( bwAmb, uBwSky, smoothstep( 0.35, 1.0, bwAN.y ) * 0.5 );
          iblIrradiance += bwAmb * ( PI * uBwAmbient );
        }
        #endif`
            : ''
        }
        #if defined( RE_IndirectSpecular )
        {
          vec3 bwN = inverseTransformDirection( geometryNormal, viewMatrix );
          vec3 bwV = inverseTransformDirection( geometryViewDir, viewMatrix );
          vec3 bwR = reflect( -bwV, bwN );
          #if defined( USE_CLEARCOAT ) && ${ccRough ? 1 : 0}
            float bwRgh = material.clearcoatRoughness;
          #else
            float bwRgh = material.roughness;
          #endif
          // A reflection lobe is a cone, not a ray. On a near-horizontal panel
          // seen from a low camera the mirror ray only climbs 20 degrees, so
          // grading purely off it puts the tree line on the bonnet and leaves
          // the flanks brighter than the surfaces facing the sky — backwards.
          // Pulling the elevation towards the surface normal by the roughness
          // is a cheap stand-in for integrating the lobe, and it is what makes
          // a bonnet read as the panel that sees the whole sky.
          // The pull used to carry a flat +0.16 on top of the roughness term,
          // which meant even a mirror-smooth clearcoat had a sixth of its
          // elevation replaced by a constant. On a flat panel bwN.y *is* a
          // constant, so that fraction of the gradient was being deleted rather
          // than blurred — and on the roof and canopy panels, where the coat is
          // rougher and the total pull reached 0.45, it deleted nearly half. The
          // result was the reported defect exactly: large painted panels holding
          // one flat value with 85% of the sky's blue mixed into a green, i.e.
          // flat teal, while the door beside them graded properly.
          //
          // What roughness physically does is widen the lobe, and a wide lobe's
          // average direction does drift towards the normal — so the term is
          // right in kind, just not with a floor under it. Proportional only.
          float bwUp = clamp( mix( bwR.y, bwN.y, clamp( bwRgh * uBwLobe, 0.0, 0.55 ) ), -1.0, 1.0 );
          // a rough surface smears every edge in the reflection; a polished one
          // keeps the skyline as a hard streak
          float bwBlur = 0.06 + bwRgh * 0.95;
          float bwSharp = clamp( 1.0 - bwRgh * 2.6, 0.0, 1.0 );
          // trunks and sunlit gaps, indexed by the azimuth of the reflected ray
          float bwAz = atan( bwR.x, bwR.z );
          float bwTr = sin( bwAz * 7.0 ) * sin( bwAz * 19.0 + 1.7 ) * sin( bwAz * 2.3 - 0.6 );
          float bwGap = smoothstep( 0.2, 0.8, bwTr ) * uBwTrees * bwSharp;
          vec3 bwWall = uBwWall * ( 0.6 + 1.6 * bwGap ) + uBwSky * ( 0.16 * bwGap );
          // The horizon is at elevation zero by definition. This transition used
          // to be centred at -0.22, which put the tree line *below* the horizon
          // and meant a vertical panel — every door, every flank, the whole side
          // of the truck — could only ever reflect the dark wall, whichever way
          // it was viewed from. A door seen from a camera at hood height has a
          // reflected elevation within about a tenth of zero over its whole
          // area, so it sat in one flat value. Centring the step is what puts a
          // horizon line back on the flanks and lets the lower half of a panel
          // pick up the trail.
          vec3 bwRefl = mix( uBwGround, bwWall, smoothstep( -0.05 - bwBlur, 0.04 + bwBlur, bwUp ) );
          bwRefl = mix( bwRefl, uBwSky, smoothstep( uBwLine - bwBlur, uBwLine + 0.25 + bwBlur, bwUp ) );
          float bwBand = uBwBand;
          ${
            flat
              ? `// A hot line at the skyline is a *highlight*, and a highlight needs
          // something to curve through it. On a large flat panel every pixel
          // shares one normal, so the band covers the whole panel at once and
          // blooms into a light leak — which is what the tailgate applique and
          // the alloy bed rail were doing in every rear shot. Comparing how fast
          // the normal turns against how far the surface travels per pixel gives
          // curvature in radians per metre, which is resolution independent, so a
          // 130 mm flare section keeps its streak and a 1.3 m plate loses it.
          vec3 bwDN = abs( dFdx( bwN ) ) + abs( dFdy( bwN ) );
          float bwStep = length( dFdx( vViewPosition ) ) + length( dFdy( vViewPosition ) );
          float bwDn = bwDN.x + bwDN.y + bwDN.z;
          float bwCurv = clamp( bwDn / max( bwStep, 1e-4 ) * 0.22, 0.0, 1.0 );
          // Curvature alone is not enough to decide this, and the vehicle-form
          // agent lost two iterations to the gap: an 8-12 mm fillet on a flank
          // is *enormously* curved, so it took the skyline band at full strength
          // while the panel behind it was spared, and the only workaround left
          // was to bury the geometry. Which is fragile, and cost them real form.
          //
          // The missing quantity is how much *screen* that curvature occupies.
          // bwDn is radians of normal turn per pixel, so its reciprocal is
          // pixels per radian — a direct measure of whether the highlight has
          // room to resolve. A fillet a pixel wide cannot show a specular
          // falloff; it can only alias into a hard bright line and then bloom,
          // which is precisely the artefact. So the band is band-passed: gated
          // on flat panels as before, and now also faded out where the curvature
          // is too tight on screen to carry a highlight. It is resolution and
          // distance aware for free — the same 10 mm fillet is suppressed at 8 m
          // in the hero framing and allowed at 1.5 m in the wheel view, which is
          // exactly when you would and would not expect to see a glint on it.
          float bwSpan = smoothstep( 0.7, 3.6, 1.0 / max( bwDn, 1e-4 ) );
          bwBand *= mix( 1.0 - uBwFlat, 1.0, bwCurv * bwSpan );`
              : ''
          }
          // squared rather than pow(): pow of a negative base is undefined
          float bwT = ( bwUp - uBwLine ) / ( 0.05 + bwRgh * 0.55 );
          bwRefl += uBwRim * ( bwBand * bwSharp * exp( -bwT * bwT ) );
          float bwFacing = clamp( dot( bwN, bwV ), 0.0, 1.0 );
          float bwEdge = 1.0 - bwFacing;
          float bwF = mix( 1.0, bwEdge * bwEdge * bwEdge, uBwFresnel );
          ${paneFace}
          radiance += bwRefl * ( uBwStrength * bwF * uBwBase );
          #ifdef USE_CLEARCOAT
            clearcoatRadiance += bwRefl * ( uBwStrength * ${ccWeight} );
          #endif
          ${
            pane
              ? `// And the pane's *own* IBL has the same fault as the graded model did.
          // A raked screen viewed from the driver's seat is near grazing over its
          // bottom third, the BRDF Fresnel goes to 1 there, and the environment is
          // a PMREM of the sky — so the bottom of the windscreen came back as a
          // hard-edged sheet of pale sage lying on the cowl. What it should be
          // mirroring at that angle is the dash, 400 mm below it. There is no way
          // to tell three that, so on the cabin side the sky mirror is cut to a
          // fifth and the graded reflection above carries the pane instead.
          radiance *= mix( 0.2, 1.0, bwOut );
          #ifdef USE_CLEARCOAT
            clearcoatRadiance *= mix( 0.2, 1.0, bwOut );
          #endif`
              : ''
          }
          ${pane ? 'bwPaneRefl = bwRefl; bwPaneOut = bwOut; bwPaneF = mix( 0.5, 1.0, bwOut ) * ( 0.06 + 0.94 * bwEdge * bwEdge * bwEdge );' : ''}
        }
        #endif`,
      );

    // A blended pane multiplies everything it computes by its own opacity, and
    // the specular BRDF has already multiplied the reflection by a Fresnel term
    // of a few per cent. Between them a windscreen reflection comes out around a
    // hundredth of the radiance it should carry, which is why the glass had no
    // read at all. So for panes the graded reflection is added again after the
    // lighting, weighted by one Fresnel term only, and the alpha is lifted by the
    // same amount: glass goes mirror-opaque at grazing angles and stays
    // see-through face-on, which is the behaviour a windscreen actually has. From
    // the cabin side both terms are cut to a quarter, so the screen keeps a dim
    // reflection of the dash without turning the view out of it into a wall.
    if (pane) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `outgoingLight += bwPaneRefl * ( uBwStrength * bwPaneF * uBwPane );
        diffuseColor.a = clamp( diffuseColor.a + bwPaneF * uBwPane * 0.95, 0.0, 1.0 );
        // The dust film is carried on emissive, so it is the one channel that a
        // reflection cut cannot reach — and emissive does not care which way the
        // face points. Dust does veil a screen from inside, so it is not removed,
        // only taken to a third.
        totalEmissiveRadiance *= mix( 0.32, 1.0, bwPaneOut );
        #include <opaque_fragment>`,
      );
    }
  });
}

/**
 * Analytic cabin bounce.
 *
 * A closed cab is lit almost entirely by light that has already bounced once:
 * the windscreen aperture is the source and the dash top, the door cards and the
 * headlining are the reflectors. Three's rig models none of that. A hemisphere
 * light at 0.36 hands an up-facing pad the sky and a down-facing headliner the
 * litter colour, and a metal cage tube under the roof reflects the dark half of
 * the environment, so every structural surface in the cabin landed three to four
 * and a half stops under the windscreen and the whole thing read as one black
 * mass with three dials floating in it.
 *
 * The second, less obvious problem it fixes: **a normal map needs a direction to
 * come from.** Under near-uniform ambient the vinyl grain, the stitch beads and
 * the mud on the floor mat all shade identically to a flat surface, which is why
 * the dash pad read as smooth felt no matter how much relief the height field
 * had. One soft directional term is what makes the detail visible at all.
 *
 * Doing it with a real point light would work, but it recompiles and slows every
 * material in the scene, forest included. So it goes in analytically, gated to
 * an object-space box around the cabin: the same shared material can then carry
 * the bounce on a cage tube inside the cab and nothing on the outside of the
 * roof. Two terms — a flat multi-bounce floor, biased towards the surfaces the
 * hemisphere misses, and a wrapped term from the aperture itself.
 *
 * `spec` feeds the same amount into the specular radiance, which is the only
 * thing that lifts the metal in here: brackets and cage tube at metalness 0.9
 * have no diffuse to lift.
 */
export function applyCabinBounce(
  material,
  {
    tag = 'cb',
    // Warm, but with green held close to red. A more orange bounce (0xffe3c2)
    // against the blue the sky environment still puts in here splits the two ends
    // of the spectrum and the vinyl goes plum; keeping the middle up lands it on
    // khaki, which is the same trick the vinyl albedo itself uses.
    color = 0xf6eedb,
    gain = 0.5,
    floor = 0.17,
    wrap = 0.6,
    spec = 0,
    // middle of the screen opening, and the cab's inner volume, both in the
    // vehicle-local space the cabin geometry is authored in
    aperture = [0, 1.6, 0.86],
    reach = 1.15,
    center = [0, 1.26, 0.02],
    // Wide in x on purpose. The door card sits at x = 0.83 and the outer skin at
    // 0.88, which is too close together for a box edge to separate: at half-width
    // 0.845 the cards were getting a third of the bounce and stayed black. So the
    // sides are left open and the facing test below rejects the outside of the
    // truck instead. Top and front stay tight, because they *can* be: the roof
    // panel is 70 mm above the headlining and the hood starts past z = 0.95.
    half = [1.02, 0.71, 0.92],
  } = {},
) {
  const u = {
    uCbColor: { value: new THREE.Color(color) },
    uCbGain: { value: gain },
    uCbFloor: { value: floor },
    uCbWrap: { value: wrap },
    uCbSpec: { value: spec },
    uCbAp: { value: new THREE.Vector3(...aperture) },
    uCbReach: { value: reach },
    uCbCtr: { value: new THREE.Vector3(...center) },
    uCbHalf: { value: new THREE.Vector3(...half) },
  };
  material.userData.cb = u;
  return extendMaterial(material, `cb:${tag}:${spec}`, (shader) => {
    Object.assign(shader.uniforms, u);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCbPos;
        varying vec3 vCbNrm;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vCbPos = position;
        vCbNrm = objectNormal;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uCbColor;
        uniform float uCbGain;
        uniform float uCbFloor;
        uniform float uCbWrap;
        uniform float uCbSpec;
        uniform vec3 uCbAp;
        uniform float uCbReach;
        uniform vec3 uCbCtr;
        uniform vec3 uCbHalf;
        varying vec3 vCbPos;
        varying vec3 vCbNrm;`,
      )
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
        {
          vec3 cbEdge = abs( vCbPos - uCbCtr ) - uCbHalf;
          float cbIn = ( 1.0 - smoothstep( -0.05, 0.015, cbEdge.x ) )
                     * ( 1.0 - smoothstep( -0.05, 0.015, cbEdge.y ) )
                     * ( 1.0 - smoothstep( -0.05, 0.015, cbEdge.z ) );
          vec3 cbToAp = uCbAp - vCbPos;
          float cbR = length( cbToAp );
          vec3 cbN = normalize( vCbNrm );
          float cbNL = dot( cbN, cbToAp / max( cbR, 1e-4 ) );
          // the screen is a metre-wide source seen from 400 mm, so the terminator
          // wraps most of the way round rather than clipping at 90 degrees
          float cbLam = clamp( ( cbNL + uCbWrap ) / ( 1.0 + uCbWrap ), 0.0, 1.0 );
          float cbF = cbR / uCbReach;
          float cbAtt = 1.0 / ( 1.0 + cbF * cbF );
          // the hemisphere already pays anything looking at the sky, so the floor
          // goes where it does not reach: undersides and faces turned away
          float cbShade = 1.0 - 0.55 * clamp( cbN.y, 0.0, 1.0 );
          // and it only goes on surfaces that face into the cab, which is what
          // keeps it off the outside of a panel whose inner face is in here — the
          // door skins are 50 mm thick. Note this has to point at the middle of
          // the cabin and not at the aperture: gating on the aperture also killed
          // everything turned back towards the driver, which is most of the dash
          // and all of the header, and took the top of the frame darker than it
          // was before the bounce existed.
          vec3 cbToC = uCbCtr - vCbPos;
          float cbFace = clamp( ( dot( cbN, cbToC / max( length( cbToC ), 1e-4 ) ) + 0.35 ) / 1.35, 0.0, 1.0 );
          float cbAmt = cbIn * ( uCbFloor * cbShade * cbFace + uCbGain * cbAtt * cbLam );
          #if defined( RE_IndirectDiffuse )
            irradiance += uCbColor * cbAmt;
          #endif
          #if defined( RE_IndirectSpecular )
            radiance += uCbColor * ( cbAmt * uCbSpec );
          #endif
        }`,
      );
  });
}

/**
 * Object-space trail dirt, injected into any material.
 *
 * Trail dirt on a vehicle is three substances, not one amount, and only one of
 * them is light. Summing them into a single coverage figure and mixing towards a
 * tan is what turned this whole truck monochrome: at high coverage a light
 * overlay replaces the substrate, so the tyre, the arch above it and the rocker
 * below it all resolved to the same sand and nothing in the frame read as its
 * own material any more.
 *
 *   film     a dry dust veil, broad but weak. Desaturates slightly and *adds* a
 *            little pale radiance, so it shows up on black rubber and all but
 *            vanishes on the cake next to it — which is how a thin scattering
 *            layer actually behaves. The base colour stays the base colour.
 *   spatter  discrete drops thrown off the tread. Darker and browner than
 *            almost anything it lands on, hard-edged, with a dried halo, and
 *            with a size distribution: a few big drips, more mid specks, a fine
 *            peppering, smearing rearward the further they have flown.
 *   cake     thick dried mud, only where it can physically pile up: the arch
 *            throat, behind the wheel, the valance, undersides.
 *
 * Every layer is a *product* of masks — can it reach here, does it stick here,
 * is it wet or dry — and spatter and cake vary their noise *threshold* with
 * reach rather than their opacity. Drops therefore get rarer with distance
 * instead of fainter, which is the thing that stops the layer flattening into a
 * sheet no matter how the numbers are pushed.
 */
/**
 * Pull a soil colour's chroma down as its value goes up.
 *
 * All eighteen `applyDirt` call sites were authored with hand-picked ochres in
 * the 0x63512f-0x7c6949 range, every one of them around 0.42 HSV saturation.
 * Individually each looked like mud in isolation; together they meant the dirt
 * on this truck was the most saturated thing in the frame. Measured on the
 * integrated hero shot, the road-film band on the rear arch came back at 0.41
 * saturation against 0.36 for the orange recovery gear — dirt out-chroma-ing
 * safety orange is not a tuning error in one material, it is a wrong model.
 *
 * The physical rule is that soil loses chroma as it dries: wet earth is dark and
 * comparatively rich, dried dust is pale and chalky, and a pale saturated ochre
 * does not occur outside a paint tin. So the desaturation is keyed off the
 * colour's own luma, which lets the dark spatter stay brown enough to read on
 * green paint while the bright dry layers go grey-brown. One rule, and the hue
 * each call site chose is preserved.
 */
function soilChroma(hex) {
  const c = new THREE.Color(hex);
  const lum = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  const k = clamp(0.16 + 2.1 * lum, 0, 0.78);
  return c.lerp(new THREE.Color().setRGB(lum, lum, lum), k);
}

export function applyDirt(
  material,
  {
    amount = 1,
    tag = 'a',
    // Back-compat: the single `color` every call site used is the dried-mud
    // hue. Dust and wet mud are their own colours now.
    color = 0x7a6746,
    // A dust colour at 0.45 linear over a 0.012 plastic is a 4x lift at 12%
    // coverage: the arch flare measured 0.50 luma, i.e. light warm grey, and no
    // amount of layering underneath it was going to show. So dust is well down
    // from where it started.
    dust = 0x9b8e75,
    // Wet mud has to be darker than the paint it lands on or the spatter is
    // invisible — but 0x2b2016 is 0.015 linear, which is darker than coal and
    // darker than every plastic and powder coat on this truck. A crush mask of
    // the nose came back stippled with red exactly in the spatter pattern:
    // instead of mud on a bumper it was punching holes through it. Mud is not a
    // hole. Wet earth sits nearer 0.045 linear, which is still well under the
    // 0.09 of the body colour — so it still reads brown-on-green where it is
    // meant to — and now lands *on top of* dark plastic rather than through it.
    wet = 0x4a3826,
    arch = 1,
    film = 1,
    spatter = 1,
    cake = 1,
    // Object-space surface mottle, riding on samples the dirt already takes.
    //
    // This began as a workaround: `archFlare` used to hand back a zero-filled uv
    // attribute, so every map on it resolved to one texel and a 300 mm moulding
    // came back as one flat value. That is no longer true — `boxProjectUV` in
    // body.js now overwrites the uvs and `UV_SCALE` gives trim 2.6 and trimGloss
    // 3.2 wraps per metre, so the real maps work. What is left is still worth
    // keeping, because it is the one detail term that does not tile with the
    // atlas, but it no longer has to carry a surface on its own and the values
    // that were set when it did are too strong.
    grain = 0,
    // How far any dirt layer may lift the substrate it lands on, as a multiple
    // of the substrate's own luma. See the ceiling in the shader: this is the
    // fix for a road film that was brighter than the paint next to it.
    lift = 2.6,
  } = {},
) {
  const tex = dirtLayers();
  const u = {
    uDirtTex: { value: tex },
    uDirtDust: { value: soilChroma(dust) },
    uDirtWet: { value: soilChroma(wet) },
    uDirtDry: { value: soilChroma(color) },
    uDirtFilm: { value: film * amount },
    uDirtSpat: { value: spatter * amount },
    uDirtCake: { value: cake * amount },
    uDirtArch: { value: arch },
    uDirtGrain: { value: grain },
    uDirtLift: { value: lift },
  };
  // exposed so the mix can be swept against a live render instead of guessed
  material.userData.dirt = u;
  return extendMaterial(material, `dirt:${tag}:${arch}`, (shader) => {
    Object.assign(shader.uniforms, u);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vDirtPos;
        varying vec3 vDirtNrm;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vDirtPos = position;
        vDirtNrm = objectNormal;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uDirtTex;
        uniform vec3 uDirtDust;
        uniform vec3 uDirtWet;
        uniform vec3 uDirtDry;
        uniform float uDirtFilm;
        uniform float uDirtSpat;
        uniform float uDirtCake;
        uniform float uDirtArch;
        uniform float uDirtGrain;
        uniform float uDirtLift;
        varying vec3 vDirtPos;
        varying vec3 vDirtNrm;
        float dirtFilm = 0.0;
        float dirtDrop = 0.0;
        float dirtCake = 0.0;
        float dirtGrain = 0.0;
        float dirtRelief = 0.0;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec3 dp = vDirtPos;
          vec3 dn = vDirtNrm / max( length( vDirtNrm ), 1e-4 );
          float up = clamp( dn.y, 0.0, 1.0 );
          float down = clamp( -dn.y, 0.0, 1.0 );

          // --- reach: where dirt can physically get to --------------------
          // A rolling tyre throws back and up out of its own opening, so the
          // fan is elongated along z and biased behind the axle.
          float zF = dp.z - 1.53;
          float zR = dp.z + 1.53;
          float dy = dp.y - 0.445;
          float rF = length( vec2( zF * 0.54, dy * 1.05 ) );
          float rR = length( vec2( zR * 0.54, dy * 1.05 ) );
          // The inner radius used to be 0.26, which is a 260 mm sphere of *full
          // strength* around each wheel centre — and since a flare sits about
          // 500 mm out, the whole flare landed on the plateau and the arch term
          // saturated across all of it. Both agents who looked at this frame
          // described the same symptom: the film supplying essentially all of
          // the flare's value. Starting the falloff almost at the hub means the
          // term is a gradient everywhere a surface can actually be.
          float archF = ( 1.0 - smoothstep( 0.06, 1.25, rF ) ) * mix( 1.0, 0.34, smoothstep( -0.05, 0.8, zF ) );
          float archR = ( 1.0 - smoothstep( 0.06, 1.25, rR ) ) * mix( 1.0, 0.34, smoothstep( -0.05, 0.8, zR ) );
          float archAny = max( archF, archR );
          // the spray leaves the tread, which is 800 mm outboard of the
          // centreline, so it never reaches the middle of the truck
          float flank = smoothstep( 0.30, 0.70, abs( dp.x ) );
          // and it cannot be flung much above the beltline
          float lift = 1.0 - smoothstep( 0.92, 1.6, dp.y );
          float sill = 1.0 - smoothstep( 0.40, 0.92, dp.y );
          float reach = clamp( max( archAny * lift, sill * sill * 0.8 ) * flank, 0.0, 1.0 ) * uDirtArch;

          // --- what this pixel can actually resolve ------------------------
          // One pixel covers fp metres of this surface. A thresholded noise
          // field is not band-limited — the mip chain blurs the *sample* but
          // the step turns a blurred edge straight back into a hard one — so
          // every feature has to be faded out by hand as it approaches the
          // pixel. Skipping this is what turned 9 mm specks into per-pixel
          // confetti over the whole truck in the wide shot.
          float fp = length( fwidth( dp ) ) + 1e-5;
          float lodBig = smoothstep( 0.075, 0.030, fp );
          float lodMid = smoothstep( 0.030, 0.011, fp );
          float lodFine = smoothstep( 0.013, 0.005, fp );

          // --- three samples, three scales --------------------------------
          // The fine tap carries the drops: a 0.48 m tile, so the three Worley
          // channels land at roughly 60, 23 and 9 mm. Its UV stretches along z
          // with distance from the arch, because a drop that has flown further
          // has smeared further — round spatter at the opening, streaks by the
          // time it reaches the door, for no extra sample.
          float smear = smoothstep( 0.45, 1.0, 1.0 - archAny );
          vec2 uvF = vec2( dp.z * mix( 2.1, 0.62, smear ), dp.y * 2.1 );
          // and the up-facing projection at an unrelated scale, so a merged body
          // has no seam and neither tile lines up with the other
          vec4 sF = mix( texture2D( uDirtTex, uvF ), texture2D( uDirtTex, dp.xz * 1.73 + 0.37 ), up * up );
          // The coarse tap is the low-frequency form: blotches most of a metre
          // across for the film, and the clumping the big drips follow.
          vec4 sC = texture2D( uDirtTex, vec2( dp.z * 0.23, dp.y * 0.41 ) - 0.21 );
          float grit = sF.b;
          float crust = sC.a * 0.45 + sF.a * 0.55;
          float blotch = sC.a * 0.7 + sF.a * 0.3;

          // --- object-space grain -----------------------------------------
          // One extra tap at scales unrelated to either dirt projection. The
          // fbm channel is a ~150 mm mottle and has a measured mean of 0.49,
          // so it is its own zero point; the two Worley channels are 35 mm and
          // 15 mm and sit at 0.66 and 0.69.
          vec4 sG = texture2D( uDirtTex, vec2( dp.z * 1.31 + dp.x * 0.42, dp.y * 1.77 ) + 0.61 );
          dirtGrain = ( ( sG.a - 0.49 ) * 0.85
                      + ( sG.g - 0.66 ) * 0.45 * lodMid
                      + ( sG.b - 0.69 ) * 0.30 * lodFine ) * uDirtGrain;

          // --- layer 2: wet spatter --------------------------------------
          // Threshold, not opacity. Reach decides how *many* drops there are,
          // never how strong one is: fading every drop up together is exactly
          // what turned this into a sheet.
          float dens = clamp( reach * uDirtSpat, 0.0, 1.0 );
          // A Worley distance field is zero at every cell centre, so a
          // threshold of zero still emits one dot per cell — which is how
          // spatter ended up on a mirror shell 1.5 m off the ground. The
          // thresholds have to start *negative*, and the gate makes it certain.
          float gate = smoothstep( 0.03, 0.17, dens );
          // wobble the thresholds so a cell does not read as a circle
          float wob = ( sC.b - 0.5 ) * 0.05;
          // Measured coverage of this field: a cut at 0.26 covers 9%, at 0.35
          // covers 17%. Reach only gets to ~0.6 on the top of an arch flare,
          // and a linear ramp to the ceiling put 1% of that surface under
          // spatter — invisible. The curve is what makes the reachable area
          // actually muddy while still going to nothing at the edge of the fan.
          float dRamp = smoothstep( 0.04, 0.78, dens );
          // The big drips are clumped by the coarse field rather than spread
          // evenly, but the window has to straddle its mean of 0.49 or they
          // simply never fire — which is why the spatter read as an even
          // peppering of small specks with no size distribution at all.
          float t1 = mix( -0.10, 0.34, dRamp * smoothstep( 0.22, 0.68, sC.a ) ) + wob;
          float t2 = mix( -0.07, 0.26, dRamp ) + wob;
          float t3 = mix( -0.06, 0.22, dRamp ) - wob;
          float d1 = ( 1.0 - smoothstep( t1, t1 + 0.03, sF.r ) ) * lodBig;
          float d2 = ( 1.0 - smoothstep( t2, t2 + 0.025, sF.g ) ) * lodMid;
          float d3 = ( 1.0 - smoothstep( t3, t3 + 0.018, sF.b ) ) * lodFine;
          dirtDrop = clamp( max( d1, max( d2 * 0.94, d3 * 0.78 ) ) * gate, 0.0, 1.0 );
          // the rim of a splash dries first and stays as a pale ring
          float halo = smoothstep( t2 + 0.02, t2 + 0.045, sF.g ) * ( 1.0 - smoothstep( t2 + 0.05, t2 + 0.09, sF.g ) );
          halo *= gate * lodMid;

          // --- layer 3: caked mud ----------------------------------------
          // Only where it can pack: surfaces that look back at a wheel — the
          // arch throat and the underside of the flare — plus the valance and
          // anything facing the ground.
          vec3 toF = vec3( 0.0, dy, zF );
          vec3 toR = vec3( 0.0, dy, zR );
          float faceF = clamp( -dot( dn, toF / max( length( toF ), 1e-4 ) ), 0.0, 1.0 );
          float faceR = clamp( -dot( dn, toR / max( length( toR ), 1e-4 ) ), 0.0, 1.0 );
          float throat = max( archF * faceF, archR * faceR ) * flank;
          float valance = ( 1.0 - smoothstep( 0.28, 0.66, dp.y ) ) * ( 0.3 + 0.7 * down );
          // The bottom ends of an arch flare pack solid whichever way they
          // face: that is where the sheet coming off the tread lands first and
          // where it never gets washed off.
          float lowArch = archAny * ( 1.0 - smoothstep( 0.42, 0.95, dp.y ) ) * flank;
          float pack = clamp( ( throat * 1.35 + valance * 0.9 + lowArch * 0.6 ) * uDirtCake * uDirtArch, 0.0, 1.2 );
          // thick mud has a ragged crust edge, so it is thresholded too
          float cut = mix( 1.05, 0.24, clamp( pack, 0.0, 1.0 ) );
          dirtCake = smoothstep( cut, cut + 0.16, crust ) * ( 0.55 + 0.45 * grit );
          dirtCake = clamp( dirtCake * min( 1.0, pack * 1.8 ), 0.0, 0.94 );

          // --- layer 1: dry dust film ------------------------------------
          // Broad, weak, strongest where settling dust is not wiped off.
          // Thresholded rather than scaled: scaling by the blotch gives a wash
          // that covers everything at somewhere between a third and full
          // strength, which is a flat grey veil. Dust has edges — it collects
          // in the still air behind a crease and gets wiped off the leading
          // faces — so the mask needs patches, not a gradient.
          float settle = 0.2 + 0.8 * up * up;
          float wipe = smoothstep( 0.30, 0.62, blotch ) * ( 0.32 + 0.68 * smoothstep( 0.24, 0.7, sF.a ) );
          dirtFilm = clamp( settle * ( 0.12 + 0.95 * wipe ) * ( 0.4 + 0.7 * reach ) * uDirtFilm, 0.0, 0.85 );

          vec3 dc = diffuseColor.rgb;
          float lum = dot( dc, vec3( 0.2126, 0.7152, 0.0722 ) );
          // A film is partial *coverage* by dust grains, so it is a mix towards
          // the dust albedo — never an addition. The additive version is what
          // greyed out the rubber: adding 0.04 of pale tan to a 0.011 albedo is
          // a 400% lift on black and nothing at all on a light panel, so it
          // wiped out exactly the material it should have left alone. What
          // shows through between the grains is also slightly desaturated,
          // which is the other half of the read.
          vec3 veil = mix( dc, vec3( lum ), 0.34 * dirtFilm );
          dc = mix( veil, uDirtDust * ( 0.6 + 0.5 * blotch ), dirtFilm * 0.15 );
          dc = mix( dc, uDirtDry * ( 0.66 + 0.55 * grit ), dirtCake );
          dc = mix( dc, uDirtDry * 0.95, halo * 0.16 );
          // Not a full replace: wet mud is translucent over the first coat and
          // a drop that takes the substrate all the way to 0.2 luma reads as a
          // hole rather than as mud.
          dc = mix( dc, uDirtWet * ( 0.8 + 0.6 * blotch ), dirtDrop * 0.85 );
          dc *= 1.0 + dirtGrain * 0.55;

          // Ceiling: dirt is a coating, not a light source.
          //
          // Every layer above is a mix towards an absolute albedo, which is fine
          // on paint — mixing a 0.09 green towards a 0.16 ochre is a believable
          // soiling — and badly wrong on the near-black plastics, where the same
          // target is a five-fold lift that replaces the substrate outright. On
          // the rear arch that produced a band measuring the same luma as the
          // painted sheet beside it, on a material with a fifth of the albedo:
          // the dirtiest surface on the truck was also the brightest, which is
          // the model upside down.
          //
          // Mud and the panel under it receive the *same* illumination, so what
          // is bounded in reality is the ratio between them, and a coating that
          // thin cannot multiply a surface's reflectance without limit. Capping
          // the ratio is substrate-relative, so it self-tunes across all twenty
          // materials: paint is generous enough never to notice, and black
          // plastic gets the grey-brown haze it should have had, still legibly
          // black plastic underneath. The small absolute floor keeps a genuinely
          // zero-albedo surface from being unable to take any dirt at all.
          float dLumB = dot( dc, vec3( 0.2126, 0.7152, 0.0722 ) );
          float dCeil = lum * uDirtLift + 0.004;
          dc *= min( 1.0, dCeil / max( dLumB, 1e-5 ) );
          diffuseColor.rgb = max( dc, vec3( 0.0 ) );

          // Mud sits *on* a surface rather than in its albedo, and the arch
          // flare has no usable normal map at all, so both go in as relief.
          // Metres of height, which is what the bump below expects.
          dirtRelief = dirtGrain * 0.006 + dirtCake * ( crust - 0.5 ) * 0.022 + dirtDrop * 0.0022;
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix( roughnessFactor, 0.74, dirtFilm * 0.5 );
        roughnessFactor = mix( roughnessFactor, 0.95, dirtCake );
        // damp mud keeps a little sheen, which is most of what separates fresh
        // spatter from the dried crust it lands on
        roughnessFactor = clamp( mix( roughnessFactor, 0.5, dirtDrop * 0.85 ), 0.03, 1.0 );
        roughnessFactor = clamp( roughnessFactor + dirtGrain * 0.3, 0.03, 1.0 );`,
      );

    // Relief. A screen-space bump off a scalar built from object position is
    // the one form of normal detail that survives a degenerate uv attribute,
    // and it is also how the mud gets to sit proud of the panel it is on
    // rather than being painted into it.
    //
    // The units matter and they are not obvious. In the classic arbitrary-basis
    // bump the perturbation is effectively `dH / d(view-space metre)`, so a
    // dimensionless 0-1 field that varies over 15 mm produces a slope of ~66
    // and the surface normal term vanishes next to it — every pixel ends up
    // pointing somewhere random and the panel resolves to black gravel. Which
    // is exactly what the first attempt did. So `dirtRelief` is carried in
    // metres of height, and the perturbation is additionally capped at half
    // the surface term, i.e. about 26 degrees, so that no amount of aliasing
    // in the source field can invert a normal.
    if (
      shader.fragmentShader.includes('#include <normal_fragment_maps>') &&
      shader.fragmentShader.includes('varying vec3 vViewPosition;')
    ) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 dSx = dFdx( -vViewPosition );
          vec3 dSy = dFdy( -vViewPosition );
          vec3 dR1 = cross( dSy, normal );
          vec3 dR2 = cross( normal, dSx );
          float dDet = dot( dSx, dR1 );
          vec3 dGrad = sign( dDet ) * ( dFdx( dirtRelief ) * dR1 + dFdy( dirtRelief ) * dR2 );
          float dLim = abs( dDet ) * 0.5;
          dGrad *= min( 1.0, dLim / max( length( dGrad ), 1e-20 ) );
          normal = normalize( abs( dDet ) * normal - dGrad );
        }`,
      );
    }

    if (shader.fragmentShader.includes('#include <lights_physical_fragment>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          float dirtCC = clamp( max( dirtCake, dirtDrop * 0.85 ) + dirtFilm * 0.3, 0.0, 1.0 );
          material.clearcoat = clamp( material.clearcoat * ( 1.0 - dirtCC * 0.93 ), 0.0, 1.0 );
          material.clearcoatRoughness = clamp(
            material.clearcoatRoughness + dirtFilm * 0.07 + dirtDrop * 0.3 + dirtCake * 0.5, 0.0, 1.0 );
        #endif`,
      );
    }
  });
}

/** Sand-blasted, slightly pitted steel: skid plates, bumpers, rack. */
export function wornMetalMaps(seed = 3) {
  return cached('veh.metal.' + seed, () => {
    const n = S;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const pits = worley(u * 26, v * 26, 26, seed).f1;
      const grain = fbm(u * 60, v * 8, { octaves: 4, period: 60, seed: seed + 3 });
      const dents = fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: seed + 17 });
      return dents * 0.55 + grain * 0.18 + (1 - smoothstep(0.0, 0.16, pits)) * 0.35;
    });
    const normal = normalFromHeight(hf, n, n, 2.2, { repeat: 2 });
    // Steel is *warm and dark*, aluminium is cool and bright, and that contrast
    // is the entire reason both exist on this truck. Side by side on the
    // material chart at PALETTE.steel (0x8b9095) against the alloy's 0x8e959a
    // they were the same grey ball twice — a viewer has no way to read two
    // metals apart except by value and by temperature, since neither has a
    // diffuse colour of its own. So the bright end comes down most of a stop
    // and leans towards iron rather than towards tin.
    const steel = rgb(0x757471);
    const dark = rgb(0x4e4f50);
    const rust = rgb(0x8a5027);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const rustMask = smoothstep(0.66, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        const scuff = fbm(u * 120, v * 12, { octaves: 3, period: 120, seed: seed + 9 });
        let c = mixRgb(dark, steel, clamp(h * 1.3 + scuff * 0.25));
        // Weathering is the other cue. A blasted steel bumper on a trail truck
        // has rust blooms in it; nothing on the aluminium ever will.
        c = mixRgb(c, rust, rustMask * 0.62);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
    // Rougher than the aluminium's satin, and never polished: a blasted or
    // painted-then-scrubbed steel bumper is the one metal on the truck that
    // should never hold a sharp reflection of anything.
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const rustMask = smoothstep(0.5, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        return clamp(0.46 + (1 - h) * 0.3 + rustMask * 0.24, 0.42, 1.0);
      },
      { repeat: 2 },
    );
    const metalness = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const rustMask = smoothstep(0.5, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        return clamp(1 - rustMask * 0.75);
      },
      { repeat: 2 },
    );
    return { map, normal, rough, metalness };
  });
}

/**
 * Linear brush marks for milled aluminium: winch plate, hinges, rack feet.
 *
 * Two roughness maps off the same relief. `rough` is the polished end, for
 * small curved hardware; `satin` is what any *large* piece of alloy needs — a
 * flat 1.3 m strip at 0.15 roughness mirrors the entire sky at once and blooms
 * into a light leak, which is what the bed rail and the tailgate applique were
 * doing. Aluminium is bright because it reflects a lot, not because it is
 * smooth.
 */
export function brushedMaps() {
  return cached('veh.brushed', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      return (
        fbm(u * 4, v * 210, { octaves: 3, period: 4, seed: 17 }) * 0.75 +
        fbm(u * 22, v * 22, { octaves: 3, period: 22, seed: 51 }) * 0.25
      );
    });
    const normal = normalFromHeight(hf, n, n, 1.1, { repeat: 3 });
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.26 + hf[y * n + x] * 0.24), { repeat: 3 });
    const satin = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        // blotchy oxide over the brush marks, so the sheen breaks up along the
        // grain instead of running the whole length of a strip.
        //
        // The floor is what stops the blowout. Every alloy part on this truck
        // is a flat strip — bed rail, step pad, tailgate applique — and a flat
        // strip at 0.35 roughness tilted at the sky returns the sun's whole
        // specular lobe in one piece. That is the hard white streak across the
        // tailgate, and it is a roughness problem rather than a brightness one.
        const ox = smoothstep(0.35, 0.9, fbm(u * 9, v * 5, { octaves: 4, period: 9, seed: 233 }));
        return clamp(0.52 + hf[y * n + x] * 0.2 + ox * 0.16, 0.48, 0.9);
      },
      { repeat: 3 },
    );
    return { normal, rough, satin };
  });
}

/**
 * Textured black plastic for cladding, bumper caps, flares and mirror shells.
 * Sun-faded: the raised pebbles keep their pigment, the flats go chalky grey.
 *
 * `satin` is the same moulding before the sun got to it — the arch flare lands,
 * bumper caps and mirror shells. That one needs a real albedo and a real
 * roughness map rather than a flat near-black colour: at 0x24272a there is
 * nothing for the light to land on, every bit of value the surface has comes
 * from its specular, and the whole flare resolves to whatever the reflection
 * happens to be. Which is how a black plastic flare ended up pale grey.
 */
export function trimMaps(kind = 'matte') {
  return cached('veh.trim.' + kind, () => {
    const n = 256;
    const satin = kind === 'satin';
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cell = worley(u * 46, v * 46, 46, 77);
      const pebble = smoothstep(0.0, 0.35, cell.f1) * 0.8 + fbm(u * 20, v * 20, { octaves: 3, period: 20, seed: 8 }) * 0.2;
      if (!satin) return pebble;
      // a finer, shallower tool grain on the moulded-in-colour parts
      const fine = worley(u * 88, v * 88, 88, 311);
      return clamp(pebble * 0.45 + smoothstep(0.0, 0.3, fine.f1) * 0.4 + fbm(u * 34, v * 34, { octaves: 3, period: 34, seed: 91 }) * 0.15);
    });
    const normal = normalFromHeight(hf, n, n, satin ? 1.1 : 1.6, { repeat: satin ? 6 : 4 });
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const h = hf[y * n + x];
        const chalk = fbm((x / n) * 6, (y / n) * 6, { octaves: 4, period: 6, seed: 55 });
        if (satin) return clamp(0.44 + h * 0.14 + smoothstep(0.45, 1.0, chalk) * 0.2, 0.4, 0.82);
        return clamp(0.58 + h * 0.16 + smoothstep(0.55, 1.0, chalk) * 0.26);
      },
      { repeat: satin ? 6 : 4 },
    );
    // Both ends lifted off PALETTE.trim. The flare *was* measuring 0.54 luma
    // with a near-black albedo under it, and the response at the time was to
    // crush the albedo further — but the light was never coming from the
    // plastic, it was the dust film adding a pale tan on top of it. With the
    // film fixed to cover rather than add, a 0.0095 albedo is simply below what
    // this scene can render: the grille slats came back at 0.098 luma with no
    // shape in them at all. Real moulded black plastic is nearer 0.04 linear,
    // which is what these are, and it is still by a wide margin the darkest
    // substance in the frame.
    // Satin sits lower than matte on purpose. The matte cladding is a grille
    // slat or a bumper cap seen against the sky and it was crushing out; the
    // satin is the arch flare, which fills a third of the wheel frame and has
    // to hold a value clearly under the paint beside it.
    // The matte end is the mirror shells, bumper caps, handles and lamp
    // recesses — not, as two rounds of tuning assumed, the grille louvres,
    // which a magenta-tint sweep proved belong to the powder-coat steel. So
    // this is set for what it is actually on: dark enough to stay obviously
    // black cladding beside a painted panel, light enough that a mirror head in
    // the truck's own shadow still has shape in it. Satin sits lower again —
    // that is the arch flare, which is lit from the open side, fills a third of
    // the wheel frame, and has to hold a value clearly under the paint.
    const base = satin ? rgb(0x15181b) : rgb(0x2f3337);
    const worn = satin ? rgb(0x282c31) : rgb(0x4b5158);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const chalk = smoothstep(0.5, 1.0, fbm((x / n) * 6, (y / n) * 6, { octaves: 4, period: 6, seed: 55 }));
        const c = mixRgb(base, worn, clamp(satin ? h * 0.72 + chalk * 0.4 : h * 0.4 + chalk * 0.85));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: satin ? 6 : 4 },
    );
    return { map, normal, rough };
  });
}

/**
 * Tyre sidewall: mould flash, ribbing and a *little* dust.
 *
 * Rubber has to stay rubber. Its whole identity is that it is the darkest and
 * flattest thing on the vehicle, and the value range comes from the moulded
 * relief catching light, not from the albedo — so the dust here is a scuff on
 * the shoulder at a sixth of the coverage it used to have. Filth belongs on top
 * of it, from `applyDirt`, where it can be dark spatter instead of a tan wash.
 */
export function rubberMaps() {
  return cached('veh.rubber', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const ribs = Math.sin(v * Math.PI * 2 * 48) * 0.5 + 0.5;
      const pebble = worley(u * 40, v * 40, 40, 13).f1;
      return ribs * 0.25 + smoothstep(0, 0.3, pebble) * 0.4 + fbm(u * 18, v * 18, { octaves: 3, period: 18, seed: 6 }) * 0.35;
    });
    const normal = normalFromHeight(hf, n, n, 1.6, { repeat: 3 });
    const rubber = rgb(PALETTE.rubber);
    // Cooler and much darker than PALETTE.rubberDust, which is a mid tan: dust
    // ground into rubber greys it, it does not turn it into sandstone.
    const scuff = rgb(0x3a3833);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const d = smoothstep(0.55, 0.98, fbm(u * 9, v * 9, { octaves: 5, period: 9, seed: 29 }));
        // the moulded crowns wear grey, the gutters stay black
        let c = mixRgb([rubber[0] * 0.82, rubber[1] * 0.82, rubber[2] * 0.84], rubber, clamp(h * 1.3));
        c = mixRgb(c, scuff, d * 0.55);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 3 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const d = smoothstep(0.4, 0.95, fbm(u * 9, v * 9, { octaves: 5, period: 9, seed: 29 }));
        return clamp(0.86 + d * 0.12 - hf[y * n + x] * 0.06);
      },
      { repeat: 3 },
    );
    return { map, normal, rough };
  });
}

/** Aggressive mud-terrain tread, used as a normal map on the tyre crown. */
export function treadMaps(rows = 9) {
  return cached('veh.tread.' + rows, () => {
    const w = 256;
    const h = 256;
    const hf = heightField(w, h, (x, y) => {
      const u = x / w; // around the circumference
      const v = y / h; // across the tread
      const cv = v - 0.5;
      const stagger = Math.floor(u * rows * 2) % 2 === 0 ? 0.0 : 0.5;
      // chunky shoulder lugs + a broken centre rib
      const lugU = (u * rows + stagger) % 1;
      const lug = smoothstep(0.06, 0.16, lugU) * (1 - smoothstep(0.84, 0.94, lugU));
      const shoulder = smoothstep(0.16, 0.3, Math.abs(cv)) * (1 - smoothstep(0.44, 0.5, Math.abs(cv)));
      const centre = (1 - smoothstep(0.02, 0.13, Math.abs(cv))) * smoothstep(0.2, 0.34, (u * rows * 2) % 1);
      let hgt = Math.max(lug * shoulder, centre) * 0.9;
      // siping
      const sipe = Math.abs(Math.sin((u * rows * 6 + v * 2.5) * Math.PI));
      hgt *= 0.75 + smoothstep(0.0, 0.25, sipe) * 0.25;
      hgt += fbm(u * 40, v * 40, { octaves: 3, period: 40, seed: 4 }) * 0.08;
      return clamp(hgt);
    });
    const normal = normalFromHeight(hf, w, h, 3.6, { repeat: 1 });
    const rough = roughnessTexture(w, h, (x, y) => clamp(0.72 + (1 - hf[y * w + x]) * 0.2), { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.35 + hf[y * w + x] * 0.75), { repeat: 1 });
    return { normal, rough, ao, height: hf, w, h };
  });
}

/** Windscreen film: wiper arcs, dust build-up in the corners. */
export function glassRoughness() {
  return cached('veh.glassRough', () =>
    roughnessTexture(
      S,
      S,
      (x, y) => {
        const u = x / S;
        const v = y / S;
        const cx = u - 0.5;
        const cy = v - 0.12;
        const r = Math.hypot(cx * 1.15, cy);
        const wipe = smoothstep(0.52, 0.58, r) + (1 - smoothstep(0.1, 0.16, r));
        const dust = fbm(u * 14, v * 14, { octaves: 5, period: 14, seed: 33 });
        const edge = smoothstep(0.36, 0.5, Math.abs(cx)) + smoothstep(0.72, 1.0, v);
        // hard water spots outside the swept arc, which is where the reflection
        // breaks up and stops looking like a mirror offcut
        const spots = smoothstep(0.72, 0.95, fbm(u * 40, v * 40, { octaves: 2, period: 40, seed: 511 }));
        return clamp(0.015 + wipe * 0.09 + dust * 0.05 + edge * 0.2 + spots * smoothstep(0.44, 0.6, r) * 0.16, 0.015, 0.46);
      },
      { repeat: 1 },
    ),
  );
}

/**
 * Tint gradient for a pane. Glass is never one flat value: there is a darker
 * band shaded into the top of a windscreen, the frit and seal darken the
 * perimeter, and grime builds along the edges the wipers never reach. Carried on
 * `map` so it modulates the tint rather than the reflection.
 */
export function glassTintMap() {
  return cached('veh.glassTint', () => {
    const tint = rgb(0xdfeaef);
    const shade = rgb(0x4c6672);
    const grime = rgb(0xa8a292);
    return pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        // factory shade band across the top, fading out by two-thirds height
        const band = smoothstep(0.62, 1.0, v);
        // frit + seal round the perimeter
        const border = Math.max(smoothstep(0.44, 0.5, Math.abs(u - 0.5)), smoothstep(0.44, 0.5, Math.abs(v - 0.5)));
        const dust = fbm(u * 11, v * 11, { octaves: 5, period: 11, seed: 205 });
        const cx = u - 0.5;
        const cy = v - 0.12;
        const r = Math.hypot(cx * 1.15, cy);
        const unswept = smoothstep(0.46, 0.62, r);
        let c = mixRgb(tint, shade, band * 0.7 + border * 0.5);
        c = mixRgb(c, grime, clamp(unswept * (0.25 + dust * 0.6)) * 0.55);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
  });
}

/**
 * Grubby film on the glass. Bright where dust has dried on outside the wiper
 * sweep, near-clear in the swept arc, so the screen reads as glass you can see
 * through rather than a black panel.
 */
export function glassFilmMap() {
  return cached('veh.glassFilm', () => {
    const film = rgb(0x8f8a7c);
    return pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        const cx = u - 0.5;
        const cy = v - 0.12;
        const r = Math.hypot(cx * 1.15, cy);
        const swept = 1 - smoothstep(0.5, 0.58, r);
        const dust = fbm(u * 12, v * 12, { octaves: 5, period: 12, seed: 205 });
        const streak = fbm(u * 60, v * 6, { octaves: 3, period: 60, seed: 17 });
        // Grime at the top of the pane and down the sides, outside the wiper arc.
        // Deliberately *not* along the bottom edge: that is the band the driver
        // looks through at the bonnet, and film there veils the view out rather
        // than reading as dirt.
        const corners = smoothstep(0.4, 0.5, Math.abs(cx)) * 0.6 + smoothstep(0.82, 1.0, v) * 0.6;
        let d = clamp((dust * 0.5 + streak * 0.35 + corners) * (1 - swept * 0.82));
        d = clamp(d * 0.8);
        out[0] = film[0] * d;
        out[1] = film[1] * d;
        out[2] = film[2] * d;
        out[3] = 255;
      },
      { srgb: true, repeat: 1 },
    );
  });
}

/** Dried mud splatter, laid over the lower bodywork and inside the arches. */
export function mudSplatterMap() {
  return cached('veh.mud', () => {
    const n = S;
    return pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const blob = fbm(u * 11, v * 11, { octaves: 5, period: 11, seed: 61 });
        const fling = fbm(u * 30, v * 8, { octaves: 4, period: 30, seed: 88 });
        const low = smoothstep(0.62, 0.02, v);
        let a = clamp(low * smoothstep(0.42, 0.78, blob) * 1.4);
        a = clamp(a + smoothstep(0.78, 0.95, fling) * low * 0.9);
        const c = mixRgb(rgb(PALETTE.dirtDark), rgb(PALETTE.dirtLight), blob);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = a * 255;
      },
      { srgb: true },
    );
  });
}

/**
 * Woven seat / door-card fabric. The weave has to be *fine* — the previous pass
 * had a 42-cycle sine grid on per-face UVs, which resolved into a basket weave
 * the size of a hand and read as a placeholder swatch. This is a slubby
 * two-tone melange: irregular yarn thickness, and a second darker fibre so the
 * cloth has colour noise instead of one flat hue.
 */
export function fabricMaps() {
  return cached('veh.fabric', () => {
    const n = 256;
    const yarn = (t, seed) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2 + fbm(t * 5, seed * 0.7, { octaves: 2, period: 5, seed }) * 2.4);
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const warp = yarn(u * 96, 11);
      const weft = yarn(v * 96, 29);
      // over/under: whichever yarn is on top at this crossing wins
      const weave = Math.abs(warp - weft) * 0.62 + Math.max(warp, weft) * 0.38;
      const slub = fbm(u * 22, v * 90, { octaves: 3, period: 22, seed: 15 });
      const nap = fbm(u * 60, v * 60, { octaves: 2, period: 60, seed: 71 });
      return clamp(weave * 0.72 + slub * 0.16 + nap * 0.12);
    });
    const normal = normalFromHeight(hf, n, n, 1.15, { repeat: 4 });
    const base = rgb(PALETTE.interiorFabric);
    const fleck = rgb(0x6d6455);
    const dark = [base[0] * 0.5, base[1] * 0.5, base[2] * 0.52];
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        // melange: a sparse lighter fibre spun through the darker ground yarn
        const mel = smoothstep(0.58, 0.92, fbm(u * 130, v * 44, { octaves: 2, period: 130, seed: 205 }));
        let c = mixRgb(dark, base, clamp(h * 1.25));
        c = mixRgb(c, fleck, mel * 0.55);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 4 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.86 + (1 - hf[y * n + x]) * 0.12), { repeat: 4 });
    return { map, normal, rough };
  });
}

// ---------------------------------------------------------------------------
// Cabin. Everything below here exists for the interior, which is judged from
// the driver's eye at about half a metre from the dash — close enough that a
// 30 mm stitch pitch lands on 29 screen pixels, so seams, vent slats and gauge
// dials all have to be real texture rather than implied.
// ---------------------------------------------------------------------------

/**
 * Moulded interior vinyl. `faded` lifts and desaturates it for the surfaces
 * under the windscreen, which are the ones the sun actually bakes.
 *
 * Dust is written straight into the albedo out of the grain's own height field:
 * pale grit collects in the pebble gutters and nowhere else, which is what
 * separates a used cabin from a moulding straight out of the tool.
 */
export function vinylMaps(kind = 'dark') {
  return cached('veh.vinyl.' + kind, () => {
    const n = 256;
    const faded = kind === 'faded';
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      // two cell scales: the coarse leather-grain islands and the fine pebble
      const big = worley(u * 13, v * 13, 13, 401);
      const fine = worley(u * 41, v * 41, 41, 77);
      const island = smoothstep(0.0, 0.3, big.f1);
      const pebble = smoothstep(0.0, 0.24, fine.f1);
      return clamp(island * 0.34 + pebble * 0.5 + fbm(u * 70, v * 70, { octaves: 3, period: 70, seed: 8 }) * 0.16);
    });
    const normal = normalFromHeight(hf, n, n, faded ? 1.5 : 1.9, { repeat: 8 });
    // Warm grey-brown, and light enough to survive a cabin lit only by bounce.
    // At 0x2b2724 this was 2.5% reflectance: correct for a black interior in a
    // studio, but in here it went to silhouette, and ACES pulls dark warm values
    // toward magenta, which is where the pinkish read came from. Green is held
    // just under red so the hue lands on khaki rather than plum.
    const base = faded ? rgb(0x5e5748) : rgb(0x413c33);
    const high = faded ? rgb(0x766d5a) : rgb(0x544d41);
    const grit = rgb(0x8a7d66);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        // UV fade blotches, stronger on the surfaces that face the screen
        const bleach = smoothstep(0.4, 0.95, fbm(u * 6, v * 6, { octaves: 4, period: 6, seed: 617 }));
        let c = mixRgb(base, high, clamp(h * 1.2));
        if (faded) c = mixRgb(c, [c[0] * 1.22 + 12, c[1] * 1.2 + 12, c[2] * 1.14 + 10], bleach * 0.75);
        // grit only in the gutters between the pebbles
        c = mixRgb(c, grit, clamp(1 - h * 2.4) * (faded ? 0.3 : 0.22));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 8 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const h = hf[y * n + x];
        const chalk = smoothstep(0.45, 1.0, fbm((x / n) * 6, (y / n) * 6, { octaves: 4, period: 6, seed: 617 }));
        // gutters hold dust and go matte, the pebble crowns keep a little sheen
        return clamp((faded ? 0.82 : 0.66) - h * 0.2 + chalk * (faded ? 0.14 : 0.08));
      },
      { repeat: 8 },
    );
    return { map, normal, rough };
  });
}

/**
 * A double-needle stitched seam, tiling along U. Applied to thin welt strips
 * laid down the edges of the dash pad and the seat panels. V runs across the
 * welt, so the two thread rows sit either side of the raised bead.
 */
export function stitchMaps() {
  return cached('veh.stitch', () => {
    const w = 64;
    const h = 64;
    const thread = (v, centre) => 1 - smoothstep(0.0, 0.055, Math.abs(v - centre));
    const hf = heightField(w, h, (x, y) => {
      const u = x / w;
      const v = y / h;
      const bead = 1 - smoothstep(0.1, 0.34, Math.abs(v - 0.5));
      const groove = smoothstep(0.0, 0.05, Math.abs(v - 0.28)) * smoothstep(0.0, 0.05, Math.abs(v - 0.72));
      // one stitch per tile, angled slightly the way a lockstitch pulls
      const along = 1 - smoothstep(0.16, 0.34, Math.abs(((u + (v - 0.5) * 0.22) % 1) - 0.5));
      const st = Math.max(thread(v, 0.28), thread(v, 0.72)) * along;
      return clamp(bead * 0.5 + groove * 0.16 + st * 0.6);
    });
    const normal = normalFromHeight(hf, w, h, 2.6, { repeat: [1, 1] });
    const vinyl = rgb(0x24211e);
    const beadCol = rgb(0x35312c);
    const cotton = rgb(0x9d8e72);
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const bead = 1 - smoothstep(0.12, 0.36, Math.abs(v - 0.5));
        const along = 1 - smoothstep(0.16, 0.32, Math.abs(((u + (v - 0.5) * 0.22) % 1) - 0.5));
        const st = Math.max(thread(v, 0.28), thread(v, 0.72)) * along;
        let c = mixRgb(vinyl, beadCol, bead);
        c = mixRgb(c, cotton, clamp(st * 1.15));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: [1, 1] },
    );
    const rough = roughnessTexture(
      w,
      h,
      (x, y) => {
        const v = y / h;
        const u = x / w;
        const along = 1 - smoothstep(0.16, 0.32, Math.abs(((u + (v - 0.5) * 0.22) % 1) - 0.5));
        const st = Math.max(thread(v, 0.28), thread(v, 0.72)) * along;
        return clamp(0.68 + st * 0.24);
      },
      { repeat: [1, 1] },
    );
    return { map, normal, rough };
  });
}

/**
 * Vent slats as an alpha cutout, tiling along U with one slat per tile. Set the
 * U range on the plane to the number of slats wanted, put a dark box behind it,
 * and the vent has real depth for two triangles.
 *
 * `map` + `alphaTest`, never `alphaMap`: three samples alphaMap from green.
 */
export function louvreCutout() {
  return cached('veh.louvre', () => {
    const n = 64;
    return cutoutTexture(
      n,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        // slat occupies 62% of the tile so the coarse mips stay above alphaTest
        const grad = ctx.createLinearGradient(0, 0, w * 0.62, 0);
        grad.addColorStop(0, '#5a5c5e');
        grad.addColorStop(0.28, '#2e3032');
        grad.addColorStop(1, '#101112');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, Math.round(w * 0.62), h);
      },
      { repeat: 1 },
    );
  });
}

/** Rubber floor mat: deep drainage ribs, plus the grit that gets walked in. */
export function floorMatMaps() {
  return cached('veh.floormat', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const rib = 1 - smoothstep(0.24, 0.44, Math.abs(((v * 9) % 1) - 0.5));
      const cross = 1 - smoothstep(0.3, 0.46, Math.abs(((u * 9) % 1) - 0.5));
      const stud = Math.max(rib, cross * 0.7);
      return clamp(stud * 0.72 + fbm(u * 44, v * 44, { octaves: 3, period: 44, seed: 51 }) * 0.28);
    });
    const normal = normalFromHeight(hf, n, n, 2.8, { repeat: 3 });
    const rubberCol = rgb(0x1b1a19);
    const mud = rgb(PALETTE.dirtDark);
    const dry = rgb(0x6d5940);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const cake = smoothstep(0.42, 0.86, fbm(u * 8, v * 8, { octaves: 5, period: 8, seed: 313 }));
        // mud dries in the troughs first, then flakes off the rib crowns
        let c = mixRgb(rubberCol, [40, 38, 36], h);
        c = mixRgb(c, mud, cake * (1 - h * 0.55));
        c = mixRgb(c, dry, cake * cake * (1 - h * 0.7) * 0.55);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 3 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const cake = smoothstep(0.42, 0.86, fbm((x / n) * 8, (y / n) * 8, { octaves: 5, period: 8, seed: 313 }));
        return clamp(0.8 + cake * 0.18 - hf[y * n + x] * 0.1);
      },
      { repeat: 3 },
    );
    return { map, normal, rough };
  });
}

/** Steering-wheel rim: moulded urethane, with a mould seam round the girth. */
export function wheelRimMaps() {
  return cached('veh.rim', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const pebble = smoothstep(0.0, 0.26, worley(u * 54, v * 34, 54, 19).f1);
      // the tool seam runs round the rim on the inner and outer girth
      const seam = (1 - smoothstep(0.0, 0.03, Math.abs(v - 0.25))) + (1 - smoothstep(0.0, 0.03, Math.abs(v - 0.75)));
      return clamp(pebble * 0.8 + fbm(u * 60, v * 60, { octaves: 3, period: 60, seed: 3 }) * 0.2 - seam * 0.5);
    });
    const normal = normalFromHeight(hf, n, n, 1.8, { repeat: [3, 1] });
    // The rim ends up 400 mm from the lens, backlit by the screen and with no
    // light of its own: a moulded-black albedo reads as a hole in the frame, so
    // the grain sits a couple of stops up and the dark comes from the shading.
    const base = rgb(0x2f2b27);
    const high = rgb(0x4a443b);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const c = mixRgb(base, high, clamp(h * 1.3));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: [3, 1] },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.74 - hf[y * n + x] * 0.14), { repeat: [3, 1] });
    return { map, normal, rough };
  });
}

/**
 * The same rim after a few seasons of hands: the moulded grain is polished off
 * the crowns, the material darkens with skin oil and it takes a sheen. Only
 * where hands actually sit, which is why it is a separate map rather than a
 * blend — the boundary is the whole point.
 */
export function wheelWornMaps() {
  return cached('veh.rimWorn', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      return clamp(
        smoothstep(0.0, 0.4, worley(u * 30, v * 20, 30, 19).f1) * 0.25 +
          fbm(u * 12, v * 12, { octaves: 3, period: 12, seed: 44 }) * 0.75,
      );
    });
    const normal = normalFromHeight(hf, n, n, 0.7, { repeat: [3, 1] });
    const oiled = rgb(0x231f1b);
    const sheen = rgb(0x453c33);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const c = mixRgb(oiled, sheen, clamp(hf[y * n + x] * 1.4));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: [3, 1] },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.3 + (1 - hf[y * n + x]) * 0.16), { repeat: [3, 1] });
    return { map, normal, rough };
  });
}

/** Napped headliner cloth. Pale, because a headliner is the one bright surface. */
export function headlinerMaps() {
  return cached('veh.headliner', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      return clamp(fbm(u * 46, v * 46, { octaves: 4, period: 46, seed: 121 }) * 0.8 + worley(u * 30, v * 30, 30, 9).f1 * 0.2);
    });
    const normal = normalFromHeight(hf, n, n, 0.9, { repeat: 6 });
    // The headlining is the ceiling of the bounce: whatever comes through the
    // screen hits this and goes back down onto the dash, so it is deliberately
    // the lightest thing in the cabin. At 0x4a463e it sat at the same value as
    // the pad and the top of the frame read as a black bar.
    const base = rgb(0x635c4e);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const stain = smoothstep(0.62, 1.0, fbm((x / n) * 5, (y / n) * 5, { octaves: 4, period: 5, seed: 88 }));
        let c = mixRgb([base[0] * 0.78, base[1] * 0.78, base[2] * 0.8], base, clamp(h * 1.5));
        c = mixRgb(c, rgb(0x3a332a), stain * 0.5);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 6 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.9 - hf[y * n + x] * 0.06), { repeat: 6 });
    return { map, normal, rough };
  });
}

// ---------------------------------------------------------------------------
// Cabin panel atlas.
//
// One canvas carries every drawn interior face: the instrument cluster, the
// radio, the heater panel, the aux switch bank, the door speaker, the mirror
// glass, the dome lens and the sill plate. Nine separate canvas materials would
// be nine draw calls in a group that is already material-heavy, and the cells
// never need to tile, so an atlas is strictly better here. `interior.js` picks
// cells out of `CABIN_CELLS` and rewrites plane UVs to match.
//
// Three passes over the same layout give colour, emissive backlight and
// roughness; the grain normal is a separate tiling map, which is why it can be
// shared with the moulded vinyl.
// ---------------------------------------------------------------------------

export const CABIN_ATLAS = 1024;

/** Cells in canvas pixels: [x, y, w, h], y measured down from the top. */
export const CABIN_CELLS = {
  gauges: [8, 8, 624, 312],
  radio: [640, 8, 376, 120],
  hvac: [640, 136, 376, 120],
  switches: [640, 264, 376, 88],
  plate: [640, 360, 376, 80],
  mirror: [640, 448, 376, 128],
  speaker: [8, 328, 248, 248],
  dome: [264, 328, 120, 120],
  sill: [264, 456, 368, 88],
  aux: [400, 328, 232, 116],
};

/** Set fill+stroke for the active channel; returns false when it should skip. */
function chan(ctx, ch, styles) {
  const s = styles[ch];
  if (s === undefined) return false;
  ctx.fillStyle = s;
  ctx.strokeStyle = s;
  return true;
}

function dial(ctx, ch, cx, cy, r, opts) {
  const { from = 2.36, sweep = 4.71, majors = 7, label = '', unit = '', value = 0.35, red = -1, small = false } = opts;

  // bezel: a turned ring, dark at the top where it shades itself
  if (chan(ctx, ch, { col: '#3a3d40', rgh: '#4a4a4a' })) {
    if (ch === 'col') {
      const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
      g.addColorStop(0, '#14161a');
      g.addColorStop(0.5, '#4c5054');
      g.addColorStop(1, '#22252a');
      ctx.fillStyle = g;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // face
  if (chan(ctx, ch, { col: '#101113', emi: '#191108', rgh: '#b4b4b4' })) {
    if (ch === 'col') {
      const g = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r * 0.94);
      g.addColorStop(0, '#1b1d20');
      g.addColorStop(0.7, '#101113');
      g.addColorStop(1, '#08090a');
      ctx.fillStyle = g;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // red zone
  if (red >= 0 && chan(ctx, ch, { col: '#8e1d10', emi: '#3a0c05', rgh: '#a0a0a0' })) {
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.79, from + sweep * red, from + sweep);
    ctx.stroke();
  }

  // graduations
  const ticks = majors * 4;
  for (let i = 0; i <= ticks; i++) {
    const t = i / ticks;
    const a = from + sweep * t;
    const major = i % 4 === 0;
    const inner = r * (major ? 0.63 : 0.74);
    const outer = r * 0.84;
    if (!chan(ctx, ch, { col: major ? '#ded6c6' : '#8d8b84', emi: major ? '#6b4a1c' : '#2a1c0a', rgh: '#8a8a8a' })) continue;
    ctx.lineWidth = major ? r * 0.055 : r * 0.022;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }

  // numbers
  if (!small) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= majors; i++) {
      const a = from + sweep * (i / majors);
      const rr = r * 0.48;
      if (!chan(ctx, ch, { col: '#e6dfd0', emi: '#7a5420', rgh: '#909090' })) continue;
      ctx.font = `700 ${Math.round(r * 0.2)}px "Arial Narrow", Arial, sans-serif`;
      ctx.fillText(String(Math.round(i * (opts.step || 1) * 10) / 10), cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
  }

  // labels
  if (label && chan(ctx, ch, { col: '#a49d90', emi: '#3d2a10', rgh: '#9a9a9a' })) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(r * (small ? 0.3 : 0.13))}px Arial, sans-serif`;
    ctx.fillText(label, cx, cy + r * (small ? 0.42 : 0.34));
  }
  if (unit && chan(ctx, ch, { col: '#8b857a', emi: '#2c1d0b' })) {
    ctx.textAlign = 'center';
    ctx.font = `500 ${Math.round(r * 0.105)}px Arial, sans-serif`;
    ctx.fillText(unit, cx, cy + r * 0.5);
  }

  // needle: tapered, with a counterweight past the hub
  const a = from + sweep * value;
  if (chan(ctx, ch, { col: '#e8dccb', emi: '#c4863a', rgh: '#6a6a6a' })) {
    if (ch === 'col') ctx.fillStyle = '#e2d3bd';
    ctx.beginPath();
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    const px = -ny;
    const py = nx;
    const wid = r * 0.05;
    ctx.moveTo(cx + nx * r * 0.8, cy + ny * r * 0.8);
    ctx.lineTo(cx + px * wid, cy + py * wid);
    ctx.lineTo(cx - nx * r * 0.2, cy - ny * r * 0.2);
    ctx.lineTo(cx - px * wid, cy - py * wid);
    ctx.closePath();
    ctx.fill();
  }
  // hub cap
  if (chan(ctx, ch, { col: '#2a2c2f', rgh: '#3c3c3c' })) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGauges(ctx, ch, x, y, w, h) {
  // carrier: the black cluster mask the dials sit in
  if (chan(ctx, ch, { col: '#141312', emi: '#000000', rgh: '#c0c0c0' })) ctx.fillRect(x, y, w, h);

  dial(ctx, ch, x + w * 0.24, y + h * 0.5, h * 0.42, {
    majors: 6,
    step: 20,
    value: 0.31,
    label: 'km / h',
  });
  dial(ctx, ch, x + w * 0.76, y + h * 0.5, h * 0.42, {
    majors: 7,
    step: 1,
    value: 0.26,
    red: 0.76,
    label: 'r/min  x1000',
  });
  dial(ctx, ch, x + w * 0.5, y + h * 0.24, h * 0.19, { majors: 4, value: 0.58, small: true, label: 'F' });
  dial(ctx, ch, x + w * 0.5, y + h * 0.75, h * 0.19, { majors: 4, value: 0.42, small: true, label: 'C' });

  // odometer window under the speedo
  const ox = x + w * 0.155;
  const oy = y + h * 0.76;
  const ow = w * 0.17;
  const oh = h * 0.1;
  if (chan(ctx, ch, { col: '#07090a', emi: '#123026', rgh: '#484848' })) ctx.fillRect(ox, oy, ow, oh);
  if (chan(ctx, ch, { col: '#8fd8b4', emi: '#4fbf86' })) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(oh * 0.72)}px "Courier New", monospace`;
    ctx.fillText('184620', ox + ow * 0.5, oy + oh * 0.55);
  }

  // warning-tell-tale strip across the middle: two of them live
  const tells = [
    ['#c9a227', '#8a6a12'],
    ['#3f4448', undefined],
    ['#b8442a', undefined],
    ['#3f4448', undefined],
    ['#4d8f4a', '#2e6a2c'],
    ['#3f4448', undefined],
  ];
  for (let i = 0; i < tells.length; i++) {
    const tx = x + w * 0.435 + (i % 3) * w * 0.045;
    const ty = y + h * 0.44 + Math.floor(i / 3) * h * 0.075;
    if (chan(ctx, ch, { col: tells[i][0], emi: tells[i][1], rgh: '#707070' })) {
      ctx.beginPath();
      ctx.arc(tx, ty, h * 0.017, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRadio(ctx, ch, x, y, w, h) {
  // The head unit faces up and back into the cab, so nothing but bounce reaches
  // it: the albedos through this panel and the two beside it are a stop or two
  // lighter than a bench-lit radio would be, or the whole stack goes to
  // silhouette and only the display reads.
  if (chan(ctx, ch, { col: '#2b2924', rgh: '#9a9a9a' })) ctx.fillRect(x, y, w, h);
  if (chan(ctx, ch, { col: '#56534e', rgh: '#5c5c5c' })) ctx.fillRect(x + w * 0.02, y + h * 0.06, w * 0.96, h * 0.88);
  // display
  const dx = x + w * 0.06;
  const dy = y + h * 0.14;
  const dw = w * 0.44;
  const dh = h * 0.42;
  if (chan(ctx, ch, { col: '#061013', emi: '#0e3a34', rgh: '#3a3a3a' })) ctx.fillRect(dx, dy, dw, dh);
  if (chan(ctx, ch, { col: '#7ee0c8', emi: '#49c9a8' })) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(dh * 0.62)}px "Courier New", monospace`;
    ctx.fillText('98.7', dx + dw * 0.06, dy + dh * 0.52);
    ctx.font = `700 ${Math.round(dh * 0.3)}px Arial, sans-serif`;
    ctx.fillText('FM1', dx + dw * 0.62, dy + dh * 0.3);
    for (let i = 0; i < 5; i++) ctx.fillRect(dx + dw * 0.64 + i * dw * 0.06, dy + dh * 0.62, dw * 0.04, dh * 0.22);
  }
  // preset row
  for (let i = 0; i < 6; i++) {
    const bx = x + w * 0.06 + i * w * 0.077;
    if (chan(ctx, ch, { col: '#6b675f', emi: '#4a3208', rgh: '#6a6a6a' })) ctx.fillRect(bx, y + h * 0.66, w * 0.058, h * 0.2);
    if (chan(ctx, ch, { col: '#151719' })) ctx.fillRect(bx, y + h * 0.855, w * 0.058, h * 0.02);
  }
  // volume / tune knobs
  for (const kx of [0.62, 0.86]) {
    const cx = x + w * kx;
    const cy = y + h * 0.52;
    if (chan(ctx, ch, { col: '#26241f', rgh: '#4a4a4a' })) {
      ctx.beginPath();
      ctx.arc(cx, cy, h * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (chan(ctx, ch, { col: '#726e63', emi: '#33240a', rgh: '#3a3a3a' })) {
      ctx.lineWidth = h * 0.03;
      ctx.beginPath();
      ctx.arc(cx, cy, h * 0.24, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (chan(ctx, ch, { col: '#c6bda9', emi: '#7a5c22' })) ctx.fillRect(cx - h * 0.015, cy - h * 0.26, h * 0.03, h * 0.12);
  }
  if (chan(ctx, ch, { col: '#a09889', emi: '#5a4010' })) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(h * 0.11)}px Arial, sans-serif`;
    ctx.fillText('AM/FM  CB  AUX', x + w * 0.06, y + h * 0.95);
  }
}

function drawHvac(ctx, ch, x, y, w, h) {
  if (chan(ctx, ch, { col: '#37342f', rgh: '#a6a6a6' })) ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 3; i++) {
    const cx = x + w * (0.19 + i * 0.31);
    const cy = y + h * 0.48;
    const r = h * 0.33;
    // Backlit ring round each knob, drawn as a ring and not a disc: as a filled
    // circle its emissive showed straight through the knob painted over it in the
    // colour pass — nothing masks it there — and the three knobs came out as
    // glowing tan counters.
    if (chan(ctx, ch, { col: '#17150f', rgh: '#7c7c7c' })) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.28, 0, Math.PI * 2);
      ctx.fill();
    }
    if (chan(ctx, ch, { emi: '#33240e' })) {
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.16, 0, Math.PI * 2);
      ctx.stroke();
    }
    // temperature dial gets the cold/hot arc
    if (i === 1) {
      for (const [a0, a1, colC, emiC] of [
        [Math.PI * 0.75, Math.PI * 1.25, '#4d86ba', '#153048'],
        [Math.PI * 1.25, Math.PI * 1.75, '#bb5238', '#4a1c0c'],
      ]) {
        if (chan(ctx, ch, { col: colC, emi: emiC, rgh: '#8a8a8a' })) {
          ctx.lineWidth = r * 0.2;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.12, a0, a1);
          ctx.stroke();
        }
      }
    }
    // Knurled knob. These are 22 mm plastic knobs 600 mm from the lens, so they
    // land as ~20 px discs: at the albedo a knob would take on a bench they read
    // as three blown white counters, and the pointer is the only part that is
    // supposed to be light.
    if (chan(ctx, ch, { col: '#2b2823', emi: '#000000', rgh: '#5a5a5a' })) {
      if (ch === 'col') {
        // domed, so it self-shades from the top-lit cab
        const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
        g.addColorStop(0, '#3d3931');
        g.addColorStop(0.55, '#24211c');
        g.addColorStop(1, '#151310');
        ctx.fillStyle = g;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (chan(ctx, ch, { col: '#100f0c', rgh: '#6e6e6e' })) {
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        ctx.lineWidth = r * 0.08;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.76, cy + Math.sin(a) * r * 0.76);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
    }
    // ring of grip flats catching the light along the top edge only
    if (chan(ctx, ch, { col: '#6d675c', rgh: '#4a4a4a' })) {
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.95, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
    if (chan(ctx, ch, { col: '#d8cfba', emi: '#8a6326' })) {
      const a = [-2.0, -1.2, -2.6][i];
      ctx.lineWidth = r * 0.11;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2);
      ctx.lineTo(cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84);
      ctx.stroke();
    }
    if (chan(ctx, ch, { col: '#a29b8c', emi: '#63481a' })) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.round(h * 0.1)}px Arial, sans-serif`;
      ctx.fillText(['FAN', 'TEMP', 'MODE'][i], cx, y + h * 0.94);
    }
  }
  // rear-defrost rocker with a live tell-tale
  const bx = x + w * 0.84;
  if (chan(ctx, ch, { col: '#2b2e31', rgh: '#6a6a6a' })) ctx.fillRect(bx, y + h * 0.24, w * 0.12, h * 0.34);
  if (chan(ctx, ch, { col: '#c98a1f', emi: '#a06a12' })) ctx.fillRect(bx + w * 0.015, y + h * 0.29, w * 0.03, h * 0.08);
}

function drawSwitches(ctx, ch, x, y, w, h) {
  if (chan(ctx, ch, { col: '#322f2a', rgh: '#a0a0a0' })) ctx.fillRect(x, y, w, h);
  const labels = ['WINCH', 'BAR', 'LOCK F', 'LOCK R', 'AIR', 'AUX'];
  const live = [1, 4];
  for (let i = 0; i < 6; i++) {
    const bx = x + w * (0.025 + i * 0.162);
    const bw = w * 0.142;
    // rocker body: lit at the top edge, shadowed at the bottom where it tips in
    if (chan(ctx, ch, { col: '#0c0d0e', rgh: '#8c8c8c' })) ctx.fillRect(bx - w * 0.006, y + h * 0.1, bw + w * 0.012, h * 0.62);
    if (chan(ctx, ch, { col: '#4f4b44', emi: '#1e1406', rgh: '#5a5a5a' })) {
      if (ch === 'col') {
        const g = ctx.createLinearGradient(0, y + h * 0.14, 0, y + h * 0.7);
        g.addColorStop(0, '#6a655c');
        g.addColorStop(1, '#302d29');
        ctx.fillStyle = g;
      }
      ctx.fillRect(bx, y + h * 0.14, bw, h * 0.54);
    }
    const on = live.includes(i);
    if (chan(ctx, ch, { col: on ? '#d08a1c' : '#2a2c2e', emi: on ? '#b46f10' : undefined, rgh: '#6a6a6a' })) {
      ctx.fillRect(bx + bw * 0.22, y + h * 0.2, bw * 0.56, h * 0.11);
    }
    if (chan(ctx, ch, { col: '#c9c0ae', emi: '#5a4010' })) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(h * 0.15)}px "Arial Narrow", Arial, sans-serif`;
      ctx.fillText(labels[i], bx + bw * 0.5, y + h * 0.85);
    }
  }
}

/**
 * Auxiliary gauge pair for the crown of the centre pod. From the driver's eye
 * this is the one dash element that silhouettes against the bright screen, so it
 * is two round bezels rather than the flat slab that used to be there — a
 * recognisable shape backlit at the edges reads even when the face is in shadow.
 */
function drawAux(ctx, ch, x, y, w, h) {
  if (chan(ctx, ch, { col: '#22201c', emi: '#050403', rgh: '#a8a8a8' })) ctx.fillRect(x, y, w, h);
  // brushed alloy surround, screwed on
  if (chan(ctx, ch, { col: '#3c3d3a', rgh: '#5e5e5e' })) {
    ctx.lineWidth = h * 0.07;
    ctx.strokeRect(x + h * 0.05, y + h * 0.05, w - h * 0.1, h - h * 0.1);
  }
  for (const [sx, sy] of [
    [0.5, 0.06],
    [0.5, 0.94],
  ]) {
    if (chan(ctx, ch, { col: '#6b6a63', rgh: '#4a4a4a' })) {
      ctx.beginPath();
      ctx.arc(x + w * sx, y + h * sy, h * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  dial(ctx, ch, x + w * 0.26, y + h * 0.5, h * 0.4, { majors: 4, value: 0.62, small: true, label: 'V' });
  dial(ctx, ch, x + w * 0.74, y + h * 0.5, h * 0.4, { majors: 4, value: 0.34, small: true, label: 'OIL' });
}

function drawSpeaker(ctx, ch, x, y, w, h) {
  if (chan(ctx, ch, { col: '#1f2123', rgh: '#c4c4c4' })) ctx.fillRect(x, y, w, h);
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  // perforation: rings of holes, tightening toward the rim
  for (let ring = 1; ring < 11; ring++) {
    const r = (ring / 11) * w * 0.44;
    const count = Math.max(6, Math.round(ring * 6.4));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.21;
      if (!chan(ctx, ch, { col: '#37393b', rgh: '#9c9c9c' })) continue;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, w * 0.016, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (chan(ctx, ch, { col: '#4a4d50', rgh: '#7a7a7a' })) {
    ctx.lineWidth = w * 0.035;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.47, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 0.25 + (i / 4) * Math.PI * 2;
    if (chan(ctx, ch, { col: '#6e7276', rgh: '#4a4a4a' })) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * w * 0.47, cy + Math.sin(a) * w * 0.47, w * 0.028, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlate(ctx, ch, x, y, w, h) {
  if (chan(ctx, ch, { col: '#4b4f52', rgh: '#5c5c5c' })) ctx.fillRect(x, y, w, h);
  if (chan(ctx, ch, { col: '#2c2f32' })) {
    ctx.lineWidth = h * 0.06;
    ctx.strokeRect(x + h * 0.1, y + h * 0.1, w - h * 0.2, h - h * 0.2);
  }
  if (chan(ctx, ch, { col: '#15181a' })) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(h * 0.3)}px "Arial Narrow", Arial, sans-serif`;
    ctx.fillText('RIDGELINE  4x4', x + h * 0.3, y + h * 0.34);
    ctx.font = `500 ${Math.round(h * 0.19)}px Arial, sans-serif`;
    ctx.fillText('GVW 3200 kg   TYRE 240 kPa', x + h * 0.3, y + h * 0.68);
  }
}

function drawMirror(ctx, ch, x, y, w, h) {
  // Mirror glass. It shows the rear window, so it carries a horizon — sky over a
  // ragged tree line over the dark bed — with a little of it on emissive because
  // no cabin light reaches it. The values are low on purpose: what it is
  // reflecting is a closed forest, and a 250 mm pane at 600 mm fills a quarter of
  // the frame's width, so at daylight brightness it read as a white sticker
  // taped to the screen and out-competed the view.
  const horizon = 0.46;
  for (const pass of ['base', 'trees', 'smudge']) {
    if (pass === 'base') {
      if (chan(ctx, ch, { col: '#39434e', emi: '#12171c', rgh: '#222222' })) {
        if (ch !== 'rgh') {
          const g = ctx.createLinearGradient(x, y, x, y + h);
          // the emissive carries a third of the albedo's value: the atlas runs at
          // emissiveIntensity 2.6 for the dial backlight, and at parity with the
          // colour pass the mirror clipped to a white rectangle
          const sky = ch === 'col' ? ['#39434e', '#242c35'] : ['#12171c', '#0c1014'];
          const gnd = ch === 'col' ? ['#131711', '#0a0d07'] : ['#040602', '#020301'];
          g.addColorStop(0, sky[0]);
          g.addColorStop(horizon * 0.85, sky[1]);
          g.addColorStop(horizon, gnd[0]);
          g.addColorStop(1, gnd[1]);
          ctx.fillStyle = g;
        }
        ctx.fillRect(x, y, w, h);
      }
    } else if (pass === 'trees') {
      // a ragged canopy line, so the split is a forest and not a gradient stop
      if (chan(ctx, ch, { col: '#0e1109', emi: '#020301' })) {
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          const bump = Math.sin(t * 22) * 0.05 + Math.sin(t * 7.3 + 1.2) * 0.07;
          ctx.lineTo(x + w * t, y + h * (horizon - 0.02 + bump));
        }
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();
      }
    } else if (ch === 'col') {
      // wiped smears and a chip in one corner
      ctx.fillStyle = 'rgba(150,160,152,0.11)';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(x + w * (0.14 + i * 0.15), y + h * 0.58, w * 0.075, h * 0.34, 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(18,20,18,0.75)';
      ctx.beginPath();
      ctx.arc(x + w * 0.94, y + h * 0.2, h * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDome(ctx, ch, x, y, w, h) {
  if (chan(ctx, ch, { col: '#222426', rgh: '#8a8a8a' })) ctx.fillRect(x, y, w, h);
  if (chan(ctx, ch, { col: '#a99f8a', emi: '#241a0a', rgh: '#c8c8c8' })) {
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.5, w * 0.36, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (chan(ctx, ch, { col: '#3a3d40' })) {
    ctx.lineWidth = w * 0.05;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.5, w * 0.36, h * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSill(ctx, ch, x, y, w, h) {
  if (chan(ctx, ch, { col: '#5a5f63', rgh: '#5c5c5c' })) ctx.fillRect(x, y, w, h);
  if (ch === 'col') {
    // brushed pass plus boot scuffs
    for (let i = 0; i < 260; i++) {
      const yy = y + Math.random() * h;
      ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},0.07)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }
  }
  if (chan(ctx, ch, { col: '#23262a', rgh: '#8c8c8c' })) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(h * 0.46)}px "Arial Narrow", Arial, sans-serif`;
    ctx.fillText('R I D G E L I N E', x + w * 0.5, y + h * 0.52);
  }
}

function paintAtlas(ctx, ch, size) {
  ctx.fillStyle = ch === 'rgh' ? '#b0b0b0' : '#000000';
  ctx.fillRect(0, 0, size, size);
  const c = CABIN_CELLS;
  drawGauges(ctx, ch, ...c.gauges);
  drawRadio(ctx, ch, ...c.radio);
  drawHvac(ctx, ch, ...c.hvac);
  drawSwitches(ctx, ch, ...c.switches);
  drawPlate(ctx, ch, ...c.plate);
  drawMirror(ctx, ch, ...c.mirror);
  drawSpeaker(ctx, ch, ...c.speaker);
  drawDome(ctx, ch, ...c.dome);
  drawSill(ctx, ch, ...c.sill);
  drawAux(ctx, ch, ...c.aux);
}

export function cabinAtlas() {
  return cached('veh.cabinAtlas', () => ({
    map: canvasTexture(CABIN_ATLAS, (ctx) => paintAtlas(ctx, 'col', CABIN_ATLAS), { srgb: true, repeat: 1 }),
    emissive: canvasTexture(CABIN_ATLAS, (ctx) => paintAtlas(ctx, 'emi', CABIN_ATLAS), { srgb: true, repeat: 1 }),
    rough: canvasTexture(CABIN_ATLAS, (ctx) => paintAtlas(ctx, 'rgh', CABIN_ATLAS), { repeat: 1 }),
  }));
}

/** Diamond-plate for the rock sliders / bed floor. */
export function diamondPlateMaps() {
  return cached('veh.plate', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = (x / n) * 4;
      const v = (y / n) * 4;
      const fu = u % 1;
      const fv = v % 1;
      const flip = (Math.floor(u) + Math.floor(v)) % 2 === 0 ? 1 : -1;
      const d = Math.abs(fv - 0.5 - flip * (fu - 0.5) * 0.55);
      const bar = (1 - smoothstep(0.06, 0.14, d)) * (1 - smoothstep(0.34, 0.46, Math.abs(fu - 0.5)));
      return bar * 0.85 + fbm((x / n) * 30, (y / n) * 30, { octaves: 3, period: 30, seed: 2 }) * 0.15;
    });
    const normal = normalFromHeight(hf, n, n, 3.0, { repeat: 3 });
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.42 + (1 - hf[y * n + x]) * 0.3), { repeat: 3 });
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const c = mixRgb(rgb(0x54585c), rgb(0x9aa0a4), clamp(h * 1.1));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 3 },
    );
    return { normal, rough, map };
  });
}

/** Spray-in bed liner: coarse, matte, high-grip speckle. */
export function bedLinerMaps() {
  return cached('veh.bedliner', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const blobs = worley(u * 30, v * 30, 30, 44).f1;
      return (
        (1 - smoothstep(0.0, 0.28, blobs)) * 0.7 + fbm(u * 70, v * 70, { octaves: 3, period: 70, seed: 12 }) * 0.3
      );
    });
    const normal = normalFromHeight(hf, n, n, 2.4, { repeat: 5 });
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.78 + (1 - hf[y * n + x]) * 0.18), { repeat: 5 });
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const c = mixRgb(rgb(0x24272a), rgb(0x53575b), clamp(h * 0.9));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 5 },
    );
    return { normal, rough, map };
  });
}

/** Perforated / hex mesh alpha for grille inserts and vents. */
export function meshAlpha(kind = 'hex') {
  return cached('veh.mesh.' + kind, () => {
    const n = 128;
    return pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = (x / n) * 10;
        const v = (y / n) * 10;
        let a;
        if (kind === 'hex') {
          const row = Math.floor(v);
          const off = row % 2 === 0 ? 0 : 0.5;
          const fu = ((u + off) % 1) - 0.5;
          const fv = (v % 1) - 0.5;
          const d = Math.max(Math.abs(fu), Math.abs(fu) * 0.5 + Math.abs(fv) * 0.866);
          a = d > 0.34 ? 1 : 0;
        } else {
          const fu = (u % 1) - 0.5;
          const fv = (v % 1) - 0.5;
          a = Math.max(Math.abs(fu), Math.abs(fv)) > 0.32 ? 1 : 0;
        }
        out[0] = out[1] = out[2] = 68;
        out[3] = a * 255;
      },
      { srgb: true, repeat: 1 },
    );
  });
}

/**
 * Multi-facet reflector. Cells rather than concentric rings, because the bowl is
 * built from swept cones whose UVs run around the axis: a radial pattern would
 * smear into stripes, while facets read the same whichever way the seam falls.
 *
 * Aluminised, not white: a reflector is vapour-deposited metal and it only reads
 * as a stamped cone if it has a metal's value range. The albedo darkens in the
 * facet gutters and the roughness opens up there too, so each facet keeps its
 * own edge instead of the bowl resolving into one pale disc.
 */
export function reflectorMaps() {
  return cached('veh.reflector', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cell = worley(u * 11, v * 11, 11, 91);
      const dish = smoothstep(0.0, 0.3, cell.f1);
      return clamp(dish * 0.82 + fbm(u * 40, v * 40, { octaves: 2, period: 40, seed: 5 }) * 0.18);
    });
    const normal = normalFromHeight(hf, n, n, 2.8, { repeat: 1 });
    // Vapour-deposited aluminium is a mirror, and a mirror's albedo tints its
    // reflection rather than adding to it: at 0xd6dde1 every direction the bowl
    // faced came back near white and the dish read as a painted disc. The value
    // range has to come from what it reflects, so the metal itself sits low.
    const alu = rgb(0x9ba3a8);
    const gutter = rgb(0x4c5257);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const tarnish = smoothstep(0.55, 1.0, fbm((x / n) * 9, (y / n) * 9, { octaves: 4, period: 9, seed: 331 }));
        let c = mixRgb(gutter, alu, clamp(h * 1.5));
        c = mixRgb(c, rgb(0x8a8375), tarnish * 0.35);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const h = hf[y * n + x];
        const tarnish = smoothstep(0.5, 1.0, fbm((x / n) * 9, (y / n) * 9, { octaves: 4, period: 9, seed: 331 }));
        return clamp(0.4 - h * 0.24 + tarnish * 0.28, 0.1, 0.7);
      },
      { repeat: 1 },
    );
    return { map, normal, rough };
  });
}

/** Horizontal fresnel prisms, so a headlight lens is not a smooth disc. */
export function lensNormal() {
  return cached('veh.lens', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const v = y / n;
      const bars = Math.abs(((v * 16) % 1) - 0.5) * 2;
      const flutes = Math.abs((((x / n) * 5) % 1) - 0.5) * 2;
      return bars * 0.7 + flutes * 0.3;
    });
    return normalFromHeight(hf, n, n, 1.6, { repeat: 1 });
  });
}

/** Prismatic tail-light / reflector lens cells. */
export function prismNormal() {
  return cached('veh.prism', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const u = (x / n) * 9;
      const v = (y / n) * 9;
      const fu = Math.abs((u % 1) - 0.5) * 2;
      const fv = Math.abs((v % 1) - 0.5) * 2;
      return Math.max(fu, fv);
    });
    return normalFromHeight(hf, n, n, 2.6, { repeat: 1 });
  });
}

/**
 * Worn stencil decal. Drawn on a canvas, eroded by noise so it reads as vinyl
 * that has spent a couple of seasons in the sun. `map` + `alphaTest`, never
 * `alphaMap` — three samples alphaMap from green, which silently eats dark art.
 */
export function decalMap(kind = 'name') {
  return cached('veh.decal.' + kind, () => {
    const w = 512;
    const h = kind === 'name' ? 128 : 256;
    const tex = canvasTexture(w, (ctx, cw, ch) => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (kind === 'name') {
        ctx.fillStyle = '#e8e2d4';
        ctx.font = `700 ${Math.round(ch * 0.52)}px "Arial Narrow", Arial, sans-serif`;
        ctx.setTransform(1, 0, -0.14, 1, ch * 0.09, 0);
        ctx.fillText('RIDGELINE', cw * 0.5, ch * 0.44);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#d4671f';
        ctx.fillRect(cw * 0.16, ch * 0.72, cw * 0.68, ch * 0.07);
        ctx.fillStyle = '#9aa0a4';
        ctx.font = `600 ${Math.round(ch * 0.15)}px Arial, sans-serif`;
        ctx.fillText('T R A I L   S E R I E S', cw * 0.5, ch * 0.88);
      } else if (kind === 'badge') {
        ctx.fillStyle = '#c9ced2';
        ctx.font = `700 ${Math.round(ch * 0.3)}px Arial, sans-serif`;
        ctx.fillText('4x4', cw * 0.5, ch * 0.32);
        ctx.fillStyle = '#d4671f';
        ctx.font = `700 ${Math.round(ch * 0.18)}px Arial, sans-serif`;
        ctx.fillText('OFF ROAD', cw * 0.5, ch * 0.62);
        ctx.strokeStyle = '#8f959a';
        ctx.lineWidth = ch * 0.02;
        ctx.strokeRect(cw * 0.16, ch * 0.12, cw * 0.68, ch * 0.68);
      } else {
        // stencilled unit number on the doors
        ctx.fillStyle = '#e3ddcd';
        ctx.font = `700 ${Math.round(ch * 0.62)}px Arial, sans-serif`;
        ctx.fillText('07', cw * 0.5, ch * 0.48);
      }

      // erode: punch holes with noise so the vinyl looks lifted and scuffed
      const img = ctx.getImageData(0, 0, cw, ch);
      const d = img.data;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const i = (y * cw + x) * 4;
          if (d[i + 3] === 0) continue;
          const n = fbm((x / cw) * 16, (y / ch) * 8, { octaves: 4, period: 16, seed: 707 });
          const scratch = fbm((x / cw) * 3, (y / ch) * 90, { octaves: 2, period: 3, seed: 21 });
          const wear = clamp(n * 1.25 + scratch * 0.3 - 0.28);
          d[i + 3] = wear > 0.34 ? 255 : 0;
        }
      }
      ctx.putImageData(img, 0, 0);
    }, { srgb: true, height: h, repeat: 1 });
    return tex;
  });
}

/**
 * A painted body panel.
 *
 * What makes paint read as paint under an open sky is almost entirely in the
 * clearcoat, and it is four separate things:
 *
 *   - a vertical gradient, because the top of a panel mirrors bright sky and the
 *     side mirrors dark trees. This is the single biggest tell, and a PMREM of
 *     an overcast-ish sky cannot supply it — it is near-uniform, so it hands
 *     every facing the same value and the panel comes back as flat colour with a
 *     sheen. So the IBL is cut to a fill and `applyBrightwork` grades the
 *     reflection off the elevation of the reflected ray instead.
 *   - a visible skyline in that reflection, which is what turns a crease or a
 *     swage line into a tight bright streak: the normal sweeps through the
 *     canopy edge over a few millimetres of surface and picks the hot band up
 *     where the flat land either side of it does not.
 *   - metallic flake, which lives *under* the coat, so it goes on the base
 *     normal and sparkles in the basecoat's own rougher lobe.
 *   - orange peel, on the clearcoat normal, so the reflected skyline ripples.
 *
 * Note `clearcoatRoughness` is deliberately off zero. A mirror-smooth coat
 * reflects the graded environment exactly and reads as chrome dipped in colour;
 * a few per cent of roughness is what makes it lacquer.
 */
export function makePaintMaterial(color = PALETTE.bodyPaint, opts = {}) {
  const { dirt = 1, dirtTag = String(color), dirtArch = 1, dirtOpts = {}, bw = {}, ...rest } = opts;
  const m = new THREE.MeshPhysicalMaterial({
    map: paintBaseMap(color),
    roughnessMap: paintRoughness(),
    normalMap: paintFlakeNormal(),
    normalScale: new THREE.Vector2(0.1, 0.1),
    // Automotive paint is a dielectric basecoat under clear lacquer. Pushing
    // metalness up kills the hue and turns the truck into bare aluminium; the
    // clearcoat layer is what supplies the wet highlight.
    metalness: 0.0,
    roughness: 0.34,
    clearcoat: 1.0,
    clearcoatRoughness: 0.07,
    clearcoatNormalMap: paintPeelNormal(),
    clearcoatNormalScale: new THREE.Vector2(0.3, 0.3),
    envMapIntensity: 0.3,
    ...rest,
  });
  applyBrightwork(m, {
    tag: 'paint' + dirtTag,
    // A clearcoat's env BRDF is 4-5% face-on, so at 2.4 the graded reflection
    // was contributing about 3% of a panel's value: the model had the horizon
    // line and the sky gradient in it and none of it was visible. At 5 the coat
    // reads, the sphere on the material chart shows a hard horizon across it,
    // and the Fresnel still keeps it off the surfaces pointing at the camera.
    strength: 5,
    // Back up most of the way now the grazing over-count above is fixed. Taking
    // this to 0.62 on its own barely moved the leak (0.28% to 0.265% of the
    // frame over 0.9) because the band was never the part that was wrong — the
    // Fresnel gain was. A crease highlight is the point of the material.
    band: 0.78,
    trees: 0.9,
    line: 0.32,
    // the coat carries the reflection at every angle; the BRDF's own Fresnel is
    // what should be deciding how much of it survives, not a hand-rolled falloff
    clearcoat: 'full',
    ccRough: true,
    // Measured on the material chart: at base 1 a panel tilted 24 degrees at the
    // sky came back at 0.65 luma — a green truck bonnet reading as pale teal,
    // because the coat's reflection was also being paid into the basecoat lobe
    // underneath it. The coat keeps the whole reflection; the basecoat sees a
    // quarter of it.
    base: 0.15,
    // A door skin is a metre of nearly flat steel. Without this the skyline band
    // lands on the whole panel at once instead of on the swage line running
    // through it, which is a light leak rather than a highlight.
    flat: 0.82,
    ground: 0x3a3129,
    wall: 0x1b2017,
    // sky is inherited: see REFLECTED_SKY. The 0x93b6d8 that used to be here is
    // half of why the bed and canopy panels read teal.
    rim: 0xffeecd,
    // The other half, and the part a neutral reflection colour could not reach.
    //
    // Measured per-material on the rear view, the canopy panels sit at 0.117
    // luma with r:b 0.67 — deep in shadow, where the only light arriving is
    // skylight and a blue fill, so a green panel resolves to dark teal and holds
    // one flat value across its whole area. That is physically what those lights
    // do; the problem is that a real panel in a forest clearing also collects
    // bounce off warm dirt and off the canopy wall, and a single hemisphere
    // light does not deliver any of it.
    //
    // Adding it here is self-targeting: it is a fixed irradiance, so against a
    // sunlit panel at 0.59 luma it is a rounding error, while against a shadowed
    // one at 0.117 it roughly doubles the value — and because the term is built
    // from the ground and wall colours and keyed off the world normal, what it
    // doubles it with is warm and green rather than blue, and it varies across
    // panels that face different ways instead of landing flat.
    ambient: 0.6,
    ...bw,
  });
  if (dirt > 0) applyDirt(m, { amount: dirt, tag: 'paint' + dirtTag, arch: dirtArch, ...dirtOpts });
  return m;
}
