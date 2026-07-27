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
    return normalFromHeight(out, n, n, 1.1, { repeat: 7 });
  });
}

/**
 * Orange peel: the low-frequency ripple a sprayed panel always has. Sampled at
 * a much larger scale than the flake so it shows up as a soft warp in the
 * clearcoat highlight rather than as noise.
 */
export function paintPeelNormal() {
  return cached('veh.peel', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      return (
        fbm(u * 9, v * 9, { octaves: 4, period: 9, seed: 313 }) * 0.7 +
        fbm(u * 26, v * 26, { octaves: 2, period: 26, seed: 77 }) * 0.3
      );
    });
    return normalFromHeight(hf, n, n, 0.9, { repeat: 2 });
  });
}

export function paintRoughness() {
  return cached('veh.paintRough', () =>
    roughnessTexture(
      S,
      S,
      (x, y) => {
        const u = x / S;
        const v = y / S;
        // swirl marks from machine polishing + a few deeper wash scratches
        const swirl = fbm(u * 90, v * 90, { octaves: 3, period: 90, seed: 12 });
        const streak = fbm(u * 4 + swirl * 0.4, v * 220, { octaves: 2, period: 4, seed: 44 });
        const haze = fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: 91 });
        let r = 0.11 + swirl * 0.04 + streak * 0.05;
        r += smoothstep(0.66, 0.97, haze) * 0.16; // polish haze
        return clamp(r, 0.05, 0.42);
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
      Math.min(255, base[0] * 1.14 + 10),
      Math.min(255, base[1] * 1.11 + 10),
      Math.min(255, base[2] * 1.08 + 9),
    ];
    const lo = [base[0] * 0.84, base[1] * 0.85, base[2] * 0.87];
    return pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        // clearcoat thickness variation + a hint of metallic flake brightness
        const cloud = fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: 401 });
        const flake = fbm(u * 150, v * 150, { octaves: 2, period: 150, seed: 9 });
        const scratch = smoothstep(0.93, 1.0, ridged(u * 3, v * 190, { octaves: 2, period: 3, seed: 61 }));
        // Kept tight. A wide basecoat range turns the panel into camouflage
        // blotches; the clearcoat highlight is what should be doing the work.
        let c = mixRgb(lo, hi, clamp(cloud * 0.34 + 0.42 + flake * 0.16));
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
 * Blue/green/red packed dirt noise, sampled twice in object space by the dirt
 * layer below. R is medium blobs, G fine grit, B vertical run-off streaks.
 */
export function dirtNoise() {
  return cached('veh.dirtNoise', () =>
    pixelTexture(
      S,
      S,
      (x, y, out) => {
        const u = x / S;
        const v = y / S;
        out[0] = clamp(fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: 61 }) * 1.35 - 0.15) * 255;
        out[1] = clamp(fbm(u * 34, v * 34, { octaves: 4, period: 34, seed: 88 })) * 255;
        out[2] = clamp(fbm(u * 26, v * 4, { octaves: 4, period: 26, seed: 133 }) * 1.2) * 255;
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
export function applyBrightwork(
  material,
  {
    tag = 'bw',
    ground = 0x0d0b08,
    wall = 0x191c14,
    sky = 0x9cbbd8,
    rim = 0xffeccb,
    strength = 1,
    band = 0.5,
    trees = 0.8,
    line = 0.48,
    fresnel = 0,
    clearcoat = false,
    pane = 0,
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
  };
  if (pane) u.uBwPane = { value: pane };
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
  return extendMaterial(material, `bw:${tag}:${fresnel}:${clearcoat}:${pane}`, (shader) => {
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
        ${pane ? 'uniform float uBwPane;\n        vec3 bwPaneRefl = vec3( 0.0 );\n        float bwPaneF = 0.0;\n        float bwPaneOut = 1.0;' : ''}`,
      )
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
        #if defined( RE_IndirectSpecular )
        {
          vec3 bwN = inverseTransformDirection( geometryNormal, viewMatrix );
          vec3 bwV = inverseTransformDirection( geometryViewDir, viewMatrix );
          vec3 bwR = reflect( -bwV, bwN );
          float bwUp = clamp( bwR.y, -1.0, 1.0 );
          float bwRgh = material.roughness;
          // a rough surface smears every edge in the reflection; a polished one
          // keeps the skyline as a hard streak
          float bwBlur = 0.06 + bwRgh * 0.95;
          float bwSharp = clamp( 1.0 - bwRgh * 2.6, 0.0, 1.0 );
          // trunks and sunlit gaps, indexed by the azimuth of the reflected ray
          float bwAz = atan( bwR.x, bwR.z );
          float bwTr = sin( bwAz * 7.0 ) * sin( bwAz * 19.0 + 1.7 ) * sin( bwAz * 2.3 - 0.6 );
          float bwGap = smoothstep( 0.2, 0.8, bwTr ) * uBwTrees * bwSharp;
          vec3 bwWall = uBwWall * ( 0.6 + 1.6 * bwGap ) + uBwSky * ( 0.16 * bwGap );
          vec3 bwRefl = mix( uBwGround, bwWall, smoothstep( -0.42 - bwBlur, -0.03 + bwBlur, bwUp ) );
          bwRefl = mix( bwRefl, uBwSky, smoothstep( uBwLine - bwBlur, uBwLine + 0.25 + bwBlur, bwUp ) );
          // squared rather than pow(): pow of a negative base is undefined
          float bwT = ( bwUp - uBwLine ) / ( 0.05 + bwRgh * 0.55 );
          bwRefl += uBwRim * ( uBwBand * bwSharp * exp( -bwT * bwT ) );
          float bwFacing = clamp( dot( bwN, bwV ), 0.0, 1.0 );
          float bwEdge = 1.0 - bwFacing;
          float bwF = mix( 1.0, bwEdge * bwEdge * bwEdge, uBwFresnel );
          ${paneFace}
          radiance += bwRefl * ( uBwStrength * bwF );
          #ifdef USE_CLEARCOAT
            clearcoatRadiance += bwRefl * ( uBwStrength * ${clearcoat ? 'bwEdge * bwEdge' : '0.0'} );
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
 * Object-space road film. Injected into any material so grime climbs from the
 * bottom of the bodywork, fans out of the wheel arches and settles as dust on
 * anything pointing at the sky. Doing it here rather than in a UV map is the
 * only way to get one continuous gradient across a merged, kit-bashed body.
 */
export function applyDirt(material, { amount = 1, tag = 'a', color = 0x9a8163, arch = 1 } = {}) {
  const tex = dirtNoise();
  const dust = new THREE.Color(color);
  return extendMaterial(material, `dirt:${tag}:${amount}:${arch}`, (shader) => {
    shader.uniforms.uDirtTex = { value: tex };
    shader.uniforms.uDirtColor = { value: dust };
    shader.uniforms.uDirtAmount = { value: amount };
    shader.uniforms.uDirtArch = { value: arch };

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
        uniform vec3 uDirtColor;
        uniform float uDirtAmount;
        uniform float uDirtArch;
        varying vec3 vDirtPos;
        varying vec3 vDirtNrm;
        float dirtAmt = 0.0;
        float dirtNz = 0.0;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec3 dp = vDirtPos;
          // two cheap projections stand in for a triplanar sample
          vec3 na = texture2D( uDirtTex, dp.xz * 0.62 ).rgb;
          vec3 nb = texture2D( uDirtTex, vec2( dp.z, dp.y ) * 0.78 ).rgb;
          dirtNz = na.r * 0.5 + nb.r * 0.5;
          float grit = nb.g * 0.6 + na.g * 0.4;
          float runs = nb.b;

          // road film creeping up off the sills. Squared, so it stays a band
          // along the bottom of the panels instead of washing the whole flank.
          float low = 1.0 - smoothstep( 0.52, 0.96, dp.y );
          low *= low * ( 0.32 + runs * 0.8 );

          // spray fanning out of the two wheel openings. It is thrown up out of
          // the arch, so it has to thin with height as well as with distance —
          // without that it pins to the ceiling across the whole lower flank and
          // the body colour disappears under one tan sheet in every wide shot.
          float dF = length( vec2( dp.z - 1.53, ( dp.y - 0.5 ) * 1.15 ) );
          float dR = length( vec2( dp.z + 1.53, ( dp.y - 0.5 ) * 1.15 ) );
          float near = 1.0 - smoothstep( 0.46, 1.0, min( dF, dR ) );
          float sprayH = 1.0 - smoothstep( 0.58, 1.08, dp.y );
          float flank = smoothstep( 0.48, 0.8, abs( dp.x ) );
          float spray = near * sprayH * flank * uDirtArch * ( 0.22 + grit * 0.8 ) * 0.6;

          // dust settling on anything that faces the sky
          float upY = vDirtNrm.y / max( length( vDirtNrm ), 1e-4 );
          float up = clamp( upY, 0.0, 1.0 );
          float settle = up * up * up * ( 0.06 + dirtNz * 0.3 );

          dirtAmt = clamp( ( low * ( 0.55 + dirtNz * 0.9 ) + spray + settle ) * uDirtAmount, 0.0, 0.88 );
          vec3 mud = uDirtColor * ( 0.62 + dirtNz * 0.72 );
          diffuseColor.rgb = mix( diffuseColor.rgb, mud, dirtAmt * 0.8 );
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp( roughnessFactor + dirtAmt * 0.46, 0.03, 1.0 );`,
      );

    if (shader.fragmentShader.includes('#include <lights_physical_fragment>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoat = clamp( material.clearcoat * ( 1.0 - dirtAmt * 0.88 ), 0.0, 1.0 );
          material.clearcoatRoughness = clamp( material.clearcoatRoughness + dirtAmt * 0.4, 0.0, 1.0 );
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
    const steel = rgb(PALETTE.steel);
    const dark = rgb(PALETTE.steelDark);
    const rust = rgb(0x8a5027);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const rustMask = smoothstep(0.72, 0.98, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        const scuff = fbm(u * 120, v * 12, { octaves: 3, period: 120, seed: seed + 9 });
        let c = mixRgb(dark, steel, clamp(h * 1.3 + scuff * 0.25));
        c = mixRgb(c, rust, rustMask * 0.5);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const rustMask = smoothstep(0.5, 0.95, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 41 }));
        return clamp(0.3 + (1 - h) * 0.34 + rustMask * 0.35);
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

/** Linear brush marks for milled aluminium: winch plate, hinges, rack feet. */
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
    return { normal, rough };
  });
}

/**
 * Textured black plastic for cladding, bumper caps, flares and mirror shells.
 * Sun-faded: the raised pebbles keep their pigment, the flats go chalky grey.
 */
export function trimMaps() {
  return cached('veh.trim', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cell = worley(u * 46, v * 46, 46, 77);
      return smoothstep(0.0, 0.35, cell.f1) * 0.8 + fbm(u * 20, v * 20, { octaves: 3, period: 20, seed: 8 }) * 0.2;
    });
    const normal = normalFromHeight(hf, n, n, 1.6, { repeat: 4 });
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const h = hf[y * n + x];
        const chalk = fbm((x / n) * 6, (y / n) * 6, { octaves: 4, period: 6, seed: 55 });
        return clamp(0.58 + h * 0.16 + smoothstep(0.55, 1.0, chalk) * 0.26);
      },
      { repeat: 4 },
    );
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        const chalk = smoothstep(0.5, 1.0, fbm((x / n) * 6, (y / n) * 6, { octaves: 4, period: 6, seed: 55 }));
        const c = mixRgb(rgb(PALETTE.trim), rgb(PALETTE.trimWorn), clamp(h * 0.4 + chalk * 0.85));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 4 },
    );
    return { map, normal, rough };
  });
}

/** Tyre sidewall: mould flash, ribbing and dust. */
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
    const dust = rgb(PALETTE.rubberDust);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const d = smoothstep(0.45, 0.95, fbm(u * 9, v * 9, { octaves: 5, period: 9, seed: 29 }));
        const c = mixRgb(rubber, dust, d * 0.5);
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
        return clamp(0.78 + d * 0.2 - hf[y * n + x] * 0.08);
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

/** Small helper: build a ready-to-use painted-body material. */
export function makePaintMaterial(color = PALETTE.bodyPaint, opts = {}) {
  const { dirt = 1, dirtTag = String(color), dirtArch = 1, ...rest } = opts;
  const m = new THREE.MeshPhysicalMaterial({
    map: paintBaseMap(color),
    roughnessMap: paintRoughness(),
    normalMap: paintPeelNormal(),
    normalScale: new THREE.Vector2(0.22, 0.22),
    // Automotive paint is a dielectric basecoat under clear lacquer. Pushing
    // metalness up kills the hue and turns the truck into bare aluminium; the
    // clearcoat layer is what supplies the wet highlight.
    metalness: 0.04,
    roughness: 0.32,
    clearcoat: 1.0,
    clearcoatRoughness: 0.055,
    clearcoatNormalMap: paintFlakeNormal(),
    clearcoatNormalScale: new THREE.Vector2(0.055, 0.055),
    envMapIntensity: 0.7,
    ...rest,
  });
  if (dirt > 0) applyDirt(m, { amount: dirt, tag: 'paint' + dirtTag, arch: dirtArch });
  return m;
}
