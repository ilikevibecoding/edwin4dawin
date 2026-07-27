import * as THREE from 'three';
import { clamp01, smoothstep } from '../core/math';
import { ATMOSPHERE_GLSL } from './atmosphere.glsl';
import { Environment } from './environment';
import { IslandField, SEA_FLOOR } from './islands';
import { WAVE_GLSL } from './waves';

const WAKE_POINTS = 16;
/** Hulls the sea will draw contact shadow and waterline foam for. */
const HULL_SLOTS = 4;

/** Stations along the keel that the hull's interior cut is sampled at. */
export const HULL_PROFILE_STEPS = 20;
/** Waves flatten out as water gets shallow; matched on CPU and GPU. */
const SHALLOW_FADE = 4.2;

/**
 * Shading-only detail bands laid over the Gerstner swell, from chop a few
 * metres across down to capillary ripple the width of a hand.
 *
 * The swell set in waves.ts stops at 6.2 m because everything shorter than
 * that is below the wave mesh's own triangles and would only alias. But a sea
 * is not two frequencies of water; it is a continuum, and the reason the middle
 * distance read as one repeating ripple over one big roller was that there was
 * nothing between them. These bands fill the gap in the *normal* only, which
 * costs a cosine each and no geometry.
 *
 * Directions are fixed in world space rather than taken from the wind. A band
 * whose direction rotates has its phase, k * dot(dir, p), change by k times the
 * distance to the origin for every radian the wind backs - thousands of radians
 * out at the edge of the map - so a slowly turning wind makes the fine ripple
 * race across the sea. What the wind does instead is weight each band by how
 * well it lines up with it, so the field leans downwind without ever sliding.
 *
 * Slope amplitudes are dimensionless: the RMS of the whole set is about 0.13,
 * which is a light breeze by Cox and Munk's measurements. Speeds follow the
 * deep-water dispersion relation on the same scale the swell uses, so each
 * layer moves at its own believable rate.
 */
const CHOP_BANDS: { wavelength: number; slope: number; angle: number }[] = [
  { wavelength: 16.0, slope: 0.036, angle: 0.34 },
  { wavelength: 9.5, slope: 0.046, angle: -0.68 },
  { wavelength: 5.6, slope: 0.054, angle: 1.12 },
  { wavelength: 3.3, slope: 0.064, angle: -1.46 },
  { wavelength: 1.95, slope: 0.072, angle: 0.16 },
  { wavelength: 1.15, slope: 0.076, angle: -2.38 },
  { wavelength: 0.66, slope: 0.07, angle: 2.08 },
  { wavelength: 0.38, slope: 0.056, angle: -0.92 },
  // The last four are only alive within a few metres of the eye, and they are
  // there for the glitter: a sharp sun lobe needs slope that changes from one
  // pixel to the next or it lands as smooth pale blobs on the water instead of
  // as separate sparks. The lobe underfoot is a couple of degrees wide, so the
  // slope that breaks it up has to vary by about that much over a handful of
  // pixels - which means centimetres of sea, not tens of them.
  { wavelength: 0.22, slope: 0.048, angle: 1.62 },
  { wavelength: 0.13, slope: 0.042, angle: -1.85 },
  { wavelength: 0.075, slope: 0.04, angle: 0.74 },
  { wavelength: 0.044, slope: 0.034, angle: -2.65 },
];

/** Unrolled band evaluation for `chopGradient`, one block per band. */
const CHOP_BANDS_GLSL = CHOP_BANDS.map(({ wavelength, slope, angle }) => {
  const k = (Math.PI * 2) / wavelength;
  const omega = Math.sqrt(9.81 * k) * 0.62;
  // Bands finer than a couple of metres get the second, tighter warp; the
  // coarse ones would only be scrambled by it.
  const domain = wavelength < 2.2 ? 'fine' : 'coarse';
  return `          {
            float fade = detailAt(footprint, ${wavelength.toFixed(2)});
            const vec2 dir = vec2(${Math.cos(angle).toFixed(5)}, ${Math.sin(angle).toFixed(5)});
            float amp = ${slope.toFixed(4)} * (0.62 + 0.38 * abs(dot(dir, uWindDir)));
            lost += amp * amp * roughFrom(footprint, ${wavelength.toFixed(2)}) * 0.5;
            if (fade > 0.004) {
              grad += dir * (cos(dot(dir, ${domain}) * ${k.toFixed(5)} - uTime * ${omega.toFixed(4)}) * amp * fade);
            }
          }`;
}).join('\n');

export interface WakeSource {
  /** Where trailing foam is laid: the stern, not the hull centre. */
  position: THREE.Vector3;
  speed: number;
  width: number;
  /** Hull centre on the water plane. */
  centre: THREE.Vector3;
  heading: number;
  halfLength: number;
  halfBeam: number;
}

/**
 * The sea surface: a camera-centred radial mesh displaced by the shared wave
 * field, shaded with depth-based colour from the island height map, whitecaps,
 * shoreline surf and a rolling ship wake.
 */
export class Ocean {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  private wake: THREE.Vector4[] = [];
  /** Per hull: centre x, centre z, cos and sin of heading. */
  private hulls: THREE.Vector4[] = [];
  /** Per hull: half length, half beam, speed 0..1, unused. */
  private hullShape: THREE.Vector4[] = [];
  private wakeIndex = 0;
  private lastWakePosition: (THREE.Vector3 | undefined)[] = [];
  private underwaterMesh: THREE.Mesh;
  private underwaterMaterial: THREE.ShaderMaterial;
  private seabedMesh: THREE.Mesh;
  private submergedFill: THREE.HemisphereLight;
  private scratchNormal = new THREE.Vector3();

  constructor(
    private env: Environment,
    private islands: IslandField,
    scene: THREE.Scene,
    segments: number,
    cloudSteps = 6,
  ) {
    for (let i = 0; i < WAKE_POINTS; i++) this.wake.push(new THREE.Vector4(0, 0, -1, 0));
    for (let i = 0; i < HULL_SLOTS; i++) {
      this.hulls.push(new THREE.Vector4(0, 0, 1, 0));
      this.hullShape.push(new THREE.Vector4(1, 1, 0, 0));
    }

    // The ocean is the consumer of the terrain height field: bind it here so the
    // shader can read water depth for colour, surf and wave damping.
    this.env.uniforms.uHeightMap.value = islands.heightTexture;

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      // Reflected cloud only has to be convincing at a glance, and the sea
      // covers most of the screen, so it marches at a fraction of the cost.
      defines: { CLOUD_STEPS: cloudSteps, CLOUD_LIGHT_STEPS: 1, HULL_PROFILE_STEPS },
      uniforms: {
        ...(this.env.uniforms as unknown as Record<string, THREE.IUniform>),
        uShallowColor: { value: new THREE.Color(0x36cabd) },
        uMidColor: { value: new THREE.Color(0x1189a6) },
        uDeepColor: { value: new THREE.Color(0x073d61) },
        uSandColor: { value: new THREE.Color(0xdcc79b) },
        uFoamColor: { value: new THREE.Color(0xf2fbff) },
        // Absorption per metre of clear tropical water, red through blue.
        // Measured coefficients are roughly 0.45 / 0.07 / 0.02; the blue is
        // nudged up because a real sea also carries plankton and silt.
        uExtinction: { value: new THREE.Vector3(0.42, 0.07, 0.03) },
        // What the water column itself scatters back once the bottom is out of
        // reach: the colour of deep open ocean. Chosen in scene-linear units
        // against the ACES curve and 0.94 exposure the renderer applies, which
        // lands it around rgb(48, 112, 161) on screen.
        uScatterColor: { value: new THREE.Color().setRGB(0.015, 0.075, 0.15, THREE.LinearSRGBColorSpace) },
        uWindDir: { value: new THREE.Vector2(1, 0) },
        /**
         * Wind strength, mirrored from Environment.windSpeed each frame.
         *
         * Whether a sea is capping is a question about the wind and not about
         * the swell: a long groundswell under a light air does not break however
         * high it gets, and a fresh breeze covers the water in caps while the
         * waves stay small. The environment has this number but does not publish
         * it as a uniform, so the sea keeps its own copy rather than trying to
         * infer wind strength from the wave set - which cannot be done, since
         * the shared Gerstner amplitudes only respond to storms.
         */
        uWindSea: { value: 0.62 },
        uWake: { value: this.wake },
        uWakeActive: { value: 0 },
        uHullA: { value: this.hulls },
        uHullB: { value: this.hullShape },
        uHullCount: { value: 0 },
        uCameraXZ: { value: new THREE.Vector2() },
        /** Vertical angle one pixel subtends; see the footprint term. */
        uPixelAngle: { value: 0.002 },
        uInteriorMatrix: { value: new THREE.Matrix4() },
        uInteriorActive: { value: 0 },
        uInteriorMin: { value: new THREE.Vector3() },
        uInteriorMax: { value: new THREE.Vector3() },
        uHullHalfBeam: { value: new Array<number>(HULL_PROFILE_STEPS).fill(0) },
        /** Diagnostic channel selector; see the end of the fragment shader. */
        uDebug: { value: 0 },
      },
      vertexShader: /* glsl */ `
        ${WAVE_GLSL}
        ${IslandField.HEIGHT_SAMPLE_GLSL}

        varying vec3 vWorldPos;
        /**
         * Where this point would be with the sea flat.
         *
         * The wave normal is rebuilt from this per pixel rather than
         * interpolated down from the vertices, and that is the single biggest
         * thing wrong with how the old sea looked. The radial mesh puts its
         * rings nine or ten metres apart by a hundred and fifty metres out,
         * which is less than half the wavelength of the shortest swell in the
         * set - so an interpolated normal out there is a piecewise-linear
         * approximation to something it cannot represent, and the middle
         * distance came out as flat facets a few metres across, each mirroring
         * a slightly different piece of sky. No amount of added ripple hides
         * that; the underlying shape has to be right.
         *
         * Interpolating this is exact, because the flat sea is a plane.
         */
        varying vec2 vFlatXZ;
        varying float vShoreSlope;

        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vFlatXZ = world.xz;
          float terrain = sampleTerrainHeight(world.xz);
          float depth = max(0.0, -terrain);

          // Gradient of the sea bed, used to size the surf zone: how far out from
          // the beach the water stays shallow enough to trip the swell.
          //
          // Taken as the mean gradient from the waterline out to here, not as a
          // local difference. The height field is only defined every five metres,
          // so a short baseline picks up its texel grid, and 1.3 over a gradient
          // with grid noise in it hands the surf a zone whose width steps in
          // straight lines - hard-edged polygons of white water, axis-aligned to
          // the terrain texture and nothing to do with the shore.
          float shoreDist = sampleShoreDistance(world.xz);
          vShoreSlope = clamp(depth / max(shoreDist, 2.0), 0.01, 1.0);
          float shallow = smoothstep(0.0, ${SHALLOW_FADE.toFixed(1)}, depth);

          // The radial mesh gets very coarse towards the horizon, so wave detail
          // has to fade out with distance or it aliases into concentric rings.
          float camDist = length(world.xz - cameraPosition.xz);
          float detail = shallow * (1.0 - smoothstep(240.0, 1250.0, camDist));

          vec3 waveNormal;
          vec3 disp = gerstnerSurface(world.xz, waveNormal);
          world.xyz += disp * detail;

          vWorldPos = world.xyz;

          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        ${ATMOSPHERE_GLSL}
        // The swell uniforms, so the wave normal can be rebuilt per pixel.
        ${WAVE_GLSL}
        // Sampled per pixel here, not carried down from the vertex shader. The
        // radial mesh puts its rings five to seven metres apart by the time it
        // reaches a beach, so anything interpolated is smeared over that much
        // ground - and a line of surf is narrower than one triangle.
        ${IslandField.HEIGHT_SAMPLE_GLSL}
        #define WAKE_POINTS ${WAKE_POINTS}
        #define HULL_SLOTS ${HULL_SLOTS}

        uniform vec3 uShallowColor;
        uniform vec3 uMidColor;
        uniform vec3 uDeepColor;
        uniform vec3 uSandColor;
        uniform vec3 uFoamColor;
        uniform vec3 uExtinction;
        uniform vec3 uScatterColor;
        uniform vec2 uWindDir;
        /** Wind strength, 0.25 (light air) to 1.5 (gale). See uWindSea. */
        uniform float uWindSea;
        uniform vec4 uWake[WAKE_POINTS];
        uniform float uWakeActive;
        uniform vec4 uHullA[HULL_SLOTS];
        uniform vec4 uHullB[HULL_SLOTS];
        uniform float uHullCount;
        uniform vec2 uCameraXZ;
        uniform float uPixelAngle;
        uniform mat4 uInteriorMatrix;
        uniform float uInteriorActive;
        uniform vec3 uInteriorMin;
        uniform vec3 uInteriorMax;
        // Half-beam at each station along the keel; see setHullProfile.
        uniform float uHullHalfBeam[HULL_PROFILE_STEPS];
        uniform float uDebug;

        varying vec3 vWorldPos;
        varying vec2 vFlatXZ;
        varying float vShoreSlope;

        /**
         * How much of a feature of the given wavelength survives, given how much
         * sea one pixel is covering.
         *
         * Distance on its own is the wrong measure, and it is the reason the water
         * was wiry at grazing angles: a pixel forty metres out but looked at
         * almost edge-on spans ten metres of surface, while one the same distance
         * away looked at from above spans a hand's width. Fading by footprint
         * instead is the same argument mipmapping makes, and it lets near detail
         * stay sharp without the middle distance combing into stripes.
         */
        float detailAt(float footprint, float wavelength) {
          return 1.0 - smoothstep(0.22, 0.85, footprint / wavelength);
        }

        /**
         * How much of a band's slope has to be handed to the sun highlight as
         * roughness instead of drawn as shape, on the same footprint measure.
         *
         * A separate, earlier curve than detailAt, and deliberately so. Diffuse
         * shading is nearly linear in the normal, so a band can be drawn until
         * it is close to a pixel wide and merely goes soft. A sharp highlight is
         * violently nonlinear: a band still large enough to shade with is
         * already far too small to specular with, and evaluating a mirror lobe
         * against it gives one pixel a spark and its neighbour nothing. That is
         * dither, not glitter. Averaging the lost slope into the width of the
         * lobe instead is the same argument as a mip level, and it is what turns
         * the middle distance from noise into a sheen.
         */
        float roughFrom(float footprint, float wavelength) {
          return smoothstep(0.05, 0.55, footprint / wavelength);
        }

        /**
         * The swell, rebuilt per pixel from the shared Gerstner set, band by
         * band, each one fading out on its own wavelength.
         *
         * Doing it here rather than interpolating the vertex normal is what puts
         * shape back into the middle distance: at two hundred metres a pixel
         * covers tens of metres of sea, so the eleven- and twenty-two-metre
         * waves have to go, but the hundred-and-thirty-metre swell is still
         * enormous compared to a pixel and should still be tilting the water.
         * Fading band by band is the only way to say both of those at once, and
         * it is what gives the sea a visible order of scales instead of one
         * texture that dies all at the same distance.
         *
         * Returns the surface normal; also hands back the crest phase (for
         * whitecaps and backlit crests), the surface height, the slope variance
         * it had to throw away, which becomes roughness for the sun highlight,
         * and the slope of the longest bands alone, which is all the reflected
         * cloud deck can be trusted with.
         *
         * The height comes from here rather than from the interpolated vertex
         * position for the same reason the normal does, and it matters more than
         * it sounds: the mesh stops being displaced at all past a couple of
         * hundred metres, so anything shaded from its height is shading a flat
         * plane over most of the screen. Rebuilt here it costs one multiply-add
         * inside a loop that is already running.
         */
        vec3 swellNormal(
          vec2 flatPos, float footprint, float damp,
          out float crest, out float height, out float lostSlope, out vec2 longGrad
        ) {
          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);
          float sum = 0.0;
          float norm = 1.0e-4;
          lostSlope = 0.0;
          longGrad = vec2(0.0);
          height = 0.0;
          for (int i = 0; i < WAVE_COUNT; i++) {
            float k = uWavePhase[i].z;
            float amp = uWaveDir[i].w;
            float qa = uWavePhase[i].w;
            float steep = qa * k;
            norm += steep;
            float fade = detailAt(footprint, uWaveDir[i].z) * damp;
            float slope = k * amp;
            lostSlope += slope * slope * roughFrom(footprint, uWaveDir[i].z) * 0.5;
            // Cheaper than it looks: past a couple of hundred metres only the
            // two longest bands survive this test, so the far sea - most of the
            // screen - pays for two cosines rather than six.
            if (fade < 0.004) continue;
            vec2 dir = uWaveDir[i].xy;
            float f = k * dot(dir, flatPos) - uWavePhase[i].y * k * uWaveTime;
            float c = cos(f) * fade;
            float s = sin(f) * fade;
            float ka = k * amp;
            float kqa = k * qa;
            tangent.x -= kqa * dir.x * dir.x * s;
            tangent.y += ka * dir.x * c;
            tangent.z -= kqa * dir.x * dir.y * s;
            binormal.x -= kqa * dir.x * dir.y * s;
            binormal.y += ka * dir.y * c;
            binormal.z -= kqa * dir.y * dir.y * s;
            sum += steep * s;
            height += amp * s;
            // Height gradient of the two longest bands, for the cloud mirror.
            if (uWaveDir[i].z > 60.0) longGrad += dir * (ka * c);
          }
          crest = clamp(sum / norm, 0.0, 1.0);
          return normalize(cross(binormal, tangent));
        }

        /**
         * Wind chop and ripple: the scales below the swell, as shading only.
         *
         * Crossing sines with analytic gradients - far cheaper than sampling
         * noise three times for a finite-difference normal, and it never
         * shimmers. Each band fades on its own wavelength; fading them together
         * takes the five-metre chop away along with the wavelets, and then
         * nothing is left holding the middle distance together.
         *
         * Two domain warps, because crossing sines alone interfere into a
         * lattice that a sharp sun highlight turns into a grid of bright
         * squares. The coarse warp meanders the chop; the fine one, which is
         * only evaluated where the fine bands are still visible, decorrelates
         * the wavelets so the glitter breaks into separate points.
         */
        vec2 chopGradient(vec2 p, float strength, float footprint, out float lostSlope) {
          vec2 warp = vec2(
            valueNoise(p * 0.055 + vec2(uTime * 0.021, 4.3)),
            valueNoise(p * 0.051 + vec2(11.7, -uTime * 0.018))
          ) - 0.5;
          vec2 coarse = p + warp * 3.4;
          vec2 fine = coarse;
          if (footprint < 1.9) {
            vec2 tight = vec2(
              valueNoise(coarse * 0.62 + vec2(-uTime * 0.06, 17.9)),
              valueNoise(coarse * 0.58 + vec2(3.1, uTime * 0.07))
            ) - 0.5;
            fine = coarse + tight * 0.62;
          }

          vec2 grad = vec2(0.0);
          float lost = 0.0;
${CHOP_BANDS_GLSL}
          lostSlope = lost * strength * strength;
          return grad * strength;
        }

        /**
         * Whitecaps: where a crest is steep enough to spill, and what that
         * looks like.
         *
         * The mask is *thresholded* against how much foam the wave has earned,
         * not multiplied by it. That one change is the whole difference between
         * white water and grey paint. A smooth mask times a smooth strength is
         * mid-grey wherever either one is halfway, and on a sea half of
         * everything is halfway, so the old version laid soft dirty-white
         * blotches over every patch that was even slightly steep - which is
         * exactly what it looked like. Thresholding grows the *area* of solid
         * foam with the energy instead, which is what a breaking crest does.
         *
         * The mask itself rides the midline of a noise field rather than its
         * peaks, because the contour of a field is a curve and so comes out as
         * a filament, while a thresholded field comes out as islands - and
         * islands are the blob shape we are trying to get away from. The domain
         * is stretched six to one downwind, so those filaments lie in windrows.
         */
        float whitecaps(vec2 p, float crest, float wind, float face, float footprint) {
          vec2 windPerp = vec2(-uWindDir.y, uWindDir.x);
          vec2 drift = p - uWindDir * (uTime * 1.9);
          // Filaments a foot or two across and several times that downwind. The
          // *patch* scale is not set here at all - it comes from the crest field,
          // which is what makes a cap belong to a particular wave. A mask with
          // its own metres-wide scale on top of that only produces slabs.
          vec2 uv = vec2(dot(drift, uWindDir) * 0.18, dot(drift, windPerp) * 0.62);

          // The windrow. This one field, and nothing else, decides where the
          // foam is; the layers further down only decide what it looks like once
          // it is there. Keeping that split is what makes the caps hold their
          // shape at every distance, and mixing the two is what wrecked several
          // attempts at this: the extra layers were multiplied in *before* the
          // threshold, so how much foam there was depended on how many of them
          // were still resolved. Each one has a mean below one, and a product of
          // three such fields has both a lower median and a shorter tail than a
          // product of one - so a threshold placed to give sparse filaments up
          // close gave a solid sheet the moment the fine layers dropped out at
          // fifty metres, and no amount of moving it fixed both ends at once.
          float thread = 1.0 - abs(valueNoise(uv) * 2.0 - 1.0);

          // What drives this is the crest term and the wind, and pointedly not
          // the local surface slope - which was the mistake that kept the sea
          // from ever capping at all.
          //
          // A Gerstner wave's height goes as sin of its phase and its slope as
          // cos, so the two are a quarter cycle apart and the slope at a crest
          // is not merely small, it is zero by construction. Asking for a high
          // crest and a steep local surface at the same pixel is asking for two
          // phases that cannot both happen, so the product sat near nothing
          // everywhere and no amount of moving the thresholds could open it.
          //
          // The crest term is the right driver on its own account, too: it is a
          // sum of amplitude times steepness times wavenumber times sin, which
          // is exactly the horizontal compression of the Gerstner map. Water
          // breaks where the surface is folding into itself, and that is the
          // quantity that measures it. The threshold is placed against the range
          // it is actually observed to cover, read off a diagnostic render.
          float energy = smoothstep(0.30, 0.52, crest) * face * wind;

          // Foam wherever the windrow rises above a level the wave's own energy
          // sets. As the energy climbs the level drops and more of each filament
          // clears it, so the *area* of solid white grows - which is what a
          // breaking crest does, and is why this is a threshold and not a
          // multiply. A soft mask times a soft strength is mid-grey wherever
          // either is halfway, and on a sea half of everything is halfway; that
          // was the dirty-white blotching the whole rework started from.
          //
          // Both ends are measured, not guessed. The windrow's median is 0.67
          // and its ninetieth centile 0.94, so the upper level sits above
          // everything the field ever reaches - a sea with no energy in it gets
          // no foam at all rather than a thin sprinkle, which at any distance is
          // a star field - and the lower one sits at about the seventieth
          // centile, which leaves the most energetic crest a quarter of its own
          // area in white and the rest of it water. Over the open sea that comes
          // out at a little over one per cent cover, which is what a fresh
          // breeze looks like.
          float level = mix(1.06, 0.8, clamp(energy * 2.0, 0.0, 1.0));
          // Prefilter the threshold rather than the mask, centred on it so that
          // averaging a filament does not also grow one.
          float edge = 0.045 + 0.14 * clamp(footprint / 2.6, 0.0, 1.0);
          float cap = clamp(smoothstep(-edge * 0.5, edge, thread - level), 0.0, 1.0);
          if (cap <= 0.0) return 0.0;

          // Now what it looks like: torn up along its length, then aerated. Each
          // layer is replaced by one as it goes sub-pixel, so distance changes
          // how textured the foam is and not how much of it there is. The
          // wavelengths quoted are the narrow axis of each layer, since that is
          // the one that goes below a pixel first.
          //
          // Behind the early-out above, so the ninety-nine per cent of the sea
          // that has no foam on it never evaluates either of them.
          float tear = detailAt(footprint, 0.9);
          if (tear > 0.01) {
            cap *= mix(1.0, 0.42 + 0.58 * valueNoise(uv * vec2(2.3, 3.7) + 21.7), tear);
          }
          float bubbles = detailAt(footprint, 0.34);
          if (bubbles > 0.01) {
            cap *= mix(1.0, 0.45 + 0.55 * valueNoise(uv * vec2(6.5, 9.5) - 5.3), bubbles);
          }
          return cap;
        }

        /**
         * Caustics: the sea surface is a lens, and wherever it happens to be
         * convex it focuses sunlight onto the bottom in a thin bright line.
         * Those lines close into a net of cells that slides about as the
         * surface moves, and the crossings are the brightest points on it.
         *
         * The shape that matters is *filaments*, which is why this rides the
         * midline of a noise field - a contour, so inherently a curve of
         * controllable width - rather than sharpening the difference of two of
         * them. Differencing gives a broad plateau everywhere the two fields
         * happen to agree, and the sea floor came out looking like marbled
         * endpaper: smooth teal ribbons metres across, drifting.
         *
         * Cell size grows with depth, because the further the light falls past
         * the lens the wider the pattern it draws.
         */
        float causticNet(vec2 p, float depth, vec2 slope) {
          // Refraction offsets the pattern by the surface slope times the depth,
          // which is what ties the net to the water above it.
          p += slope * depth * 0.3;
          // Depth changes how tight the threads are and how much light reaches
          // them, and pointedly *not* the scale of the domain. Scaling world
          // position by anything that varies across the surface multiplies a
          // coordinate in the hundreds of metres by a factor that moves in the
          // third decimal place, so a centimetre of extra depth slides the noise
          // by a whole cell. That shears the net along the depth contours and
          // the entire sea floor comes out as a mat of hair.
          float sharp = mix(11.0, 3.5, clamp(depth * 0.2, 0.0, 1.0));
          float sum = 0.0;
          for (int i = 0; i < 2; i++) {
            // The second layer is turned hard against the first. One alone is a
            // set of parallel ribbons; crossed, they close into cells.
            vec2 q = i == 0
              ? p * 0.85
              : vec2(p.x * 0.34 - p.y * 0.94, p.x * 0.94 + p.y * 0.34) * 1.28;
            q += vec2(uTime, -uTime) * (0.42 + 0.26 * float(i));
            // One octave, deliberately. Summing two piles the values up around
            // the middle of the range, and then the midline contour is not a
            // curve any more - it is most of the plane.
            float n = valueNoise(q);
            // Ridged about the midline: 1 on the contour, falling away either
            // side, so what survives the exponent is a thread.
            sum += pow(1.0 - abs(n * 2.0 - 1.0), sharp);
          }
          return sum * exp(-depth * 0.42);
        }

        /**
         * What is actually down there. Flat sand passes for a sea floor for
         * about a second and then reads as a painted backdrop, because a real
         * shallow is combed into ripple marks by the swell and blotched with
         * weed and rubble wherever they have taken hold.
         */
        vec3 seabedAlbedo(vec2 p, float detail) {
          // Ripple marks lie across the prevailing swell, roughly half a metre
          // apart, with the domain warped so they meander rather than ruling the
          // floor into stripes. The warp has to stay a fraction of the period:
          // displace them by ten times it and the shallows read as fingerprints,
          // leave it out and they read as corduroy. Fixed direction, too - these
          // are shaped over weeks and must not swim when the wind backs.
          const vec2 combDir = vec2(0.87, 0.5);
          vec2 warp = vec2(valueNoise(p * 0.13), valueNoise(p * 0.13 + 3.7)) - 0.5;
          float comb = sin(dot(p + warp * 0.42, combDir) * 12.0) * 0.5 + 0.5;
          // A real ripple field is patchy: combed where the swell reaches down
          // to the sand and smooth where a weed bed or a scour has broken it up.
          float combed = smoothstep(0.36, 0.62, fbm2Cheap(p * 0.11 + 19.4));
          // Faded out with distance along with every other fine detail, since a
          // half-metre period is below a pixel a few boat lengths away.
          float ripple = mix(1.0, mix(0.9, 1.07, comb * comb), detail * combed);
          float grain = 0.86 + fbm2Cheap(p * 0.85) * 0.28;
          // Turtle grass, in beds with soft edges.
          float weed = smoothstep(0.5, 0.78, fbm2Cheap(p * 0.05));
          return mix(uSandColor * ripple * grain, vec3(0.045, 0.068, 0.038), weed * 0.82);
        }

        /**
         * Shoreline surf: how much white water is on the sea at a point, given how
         * far it is from the waterline.
         *
         * Swell feels the bottom and topples where the water is about a
         * wave-height deep, the whitewater runs on inshore of that, and a thin
         * sheet washes up over the sand. All of it is laid out in metres of beach
         * out from the water's edge rather than in metres of depth, which is what
         * lets a band be a band: three metres of white water stays three metres
         * wide whether the bottom under it is falling away steeply or barely at
         * all.
         */
        float shorelineSurf(float sd, float depth, float slope, float footprint, vec2 p) {
          float surfWidth = clamp(1.3 / slope, 6.0, 30.0);
          // Where the break sits wanders along the shore on two scales - a slow
          // one for the shape of the bar, a quicker one for each set.
          float surfNoise = fbm2Cheap(p * 0.045 + vec2(0.0, uTime * 0.04));
          float wander = valueNoise(p * 0.115 + vec2(uTime * 0.06, 0.0));
          // Sets arrive in slow groups, and the big ones break further out.
          float sets = 0.55 + 0.45 * sin(uTime * 0.43 + surfNoise * 6.3);
          float breakLine = surfWidth * (0.36 + sets * 0.34 + wander * 0.3);

          // Whitewater in bands roughly a shoaling wavelength apart, marching
          // shoreward at a few metres a second.
          float bandSpacing = mix(5.0, 11.0, clamp(surfWidth / 26.0, 0.0, 1.0));
          float phase = sd / bandSpacing + uTime * 0.3;
          float f = 1.0 - fract(phase);
          // A thin toppling crest at the front of each band with a torn tail of
          // whitewater trailing away behind it. The discontinuity at the wrap
          // is the front, and it faces the beach - which a symmetric profile,
          // such as the Gaussian this used to be, has no way of expressing.
          // That was the single reason the old surf read as a fog bank parked
          // on the sand rather than as water arriving. Ramping the whole band
          // instead of just its leading edge is the other failure mode: that
          // lays down sheets of flat white the size of the foreground, when a
          // breaker is a line and what follows one is lace.
          float front = pow(f, 9.0);
          float tail = f * f * 0.6;
          // Bands compress in screen space until they cross a pixel, which
          // happens a long way out at eye level because the line of sight is so
          // nearly parallel to the shore. Collapse them to their own averages
          // there rather than letting them alias into moire.
          float bandAA = smoothstep(0.35, 1.1, footprint / bandSpacing);
          front = mix(front, 0.08, bandAA);
          tail = mix(tail, 0.18, bandAA);

          // Tear it up: solid white is paint, torn foam is water. Isotropic and
          // metres across, unlike the whitecap mask, which is stretched downwind -
          // surf breaks up along the line it arrived on. The tails take nearly all of
          // this and the crests very little, since a breaker is continuous
          // along its length and only what it leaves behind is patchy.
          float lace = smoothstep(0.34, 0.72, fbm2Cheap(p * 0.62 + vec2(uTime * 0.3, uTime * -0.22)));
          lace = mix(0.5, lace, detailAt(footprint, 1.6));
          float fine = smoothstep(0.3, 0.8, valueNoise(p * 2.9 + vec2(uTime * -0.5, uTime * 0.4)));
          fine = mix(1.0, fine, detailAt(footprint, 0.35));
          tail *= mix(0.25, 1.0, lace) * mix(0.55, 1.0, fine);
          front *= mix(0.6, 1.0, lace);

          // The surf zone proper: from a little outside the break, where the
          // swell is already standing up, in to the water's edge. Gated on depth
          // as well, so a cliff that drops straight into deep water gets a wash
          // at its foot rather than a surf beach.
          float energy = (1.0 - smoothstep(breakLine, surfWidth * 1.15, sd))
            * (1.0 - smoothstep(2.6, 5.2, depth));
          float crestLine = exp(-pow((sd - breakLine) / (bandSpacing * 0.5), 2.0));
          // Inside the break the water stays aerated between sets, so there is a
          // bed of churn under the bands. With only the bands the surf averaged
          // an eighth cover, which at any distance is faint speckle rather than
          // white water; with an even bed of it, the whole zone went solid white.
          // It has to be patchy, and it has to sit well inshore of the break.
          float churn = (1.0 - smoothstep(0.0, breakLine * 0.8, sd)) * 0.3 * mix(0.05, 1.0, lace);
          float foam = (front * (0.55 + 0.8 * crestLine * sets) + tail) * energy + churn;

          // At the water's edge itself: the backwash, and the last of the foam
          // the swash left behind as it drained off the sand. The bright upper
          // edge of the run-up is above the waterline and belongs to the
          // terrain shader; this is only the seaward half of it.
          float runUp = clamp(surfWidth * 0.22, 1.0, 4.5) * (0.5 + 0.5 * sets);
          float swash = smoothstep(runUp, runUp * 0.15, sd);
          foam = clamp(max(foam, swash * 0.9 * mix(0.6, 1.0, fine)), 0.0, 1.0);
          return foam;
        }

        /**
         * The churned trail behind a hull.
         *
         * The shape of a wake is a narrow band of curd, a couple of beam widths
         * across, that spreads slowly and dissolves. It is emphatically not a
         * chain of expanding discs, which is what fifteen metres of soft
         * quadratic falloff per foam point gave: circles thirty metres wide,
         * blurred into each other, that read as pale paint smeared across the
         * sea. Once the rest of the water was cleaned up they were the most
         * conspicuous thing left in the near field.
         *
         * So the trail is narrow, and it is thresholded against a torn mask
         * rather than laid down as a wash - same argument as the whitecaps.
         */
        float wakeFoam(vec2 p, float footprint) {
          if (uWakeActive < 0.5) return 0.0;
          float trail = 0.0;
          for (int i = 0; i < WAKE_POINTS; i++) {
            vec4 w = uWake[i];
            if (w.z < 0.0) continue;
            float age = w.z;
            // Wide enough at birth to close the gap to the next point in the
            // trail, and half again as wide by the time it dies.
            float radius = mix(2.4, 6.2, age);
            float t = clamp(1.0 - length(p - w.xy) / radius, 0.0, 1.0);
            trail = max(trail, t * t * (1.0 - age * 0.8) * w.w);
          }
          if (trail < 0.02) return 0.0;
          float lace = fbm2Cheap(p * 1.5 - vec2(uTime * 0.5, uTime * 0.3));
          float froth = valueNoise(p * 5.5 + vec2(uTime * 1.1, uTime * -0.9));
          float mask = clamp(lace * (0.5 + 0.5 * froth) * 1.9, 0.0, 1.0);
          float edge = 0.18 + 0.5 * clamp(footprint / 1.6, 0.0, 1.0);
          return clamp(smoothstep(0.0, edge, min(trail, 1.0) * 1.2 - (1.0 - mask)), 0.0, 1.0);
        }

        /**
         * How each hull marks the water it is sitting in.
         *
         * x: occlusion, 1 directly under the hull, falling off just outside it.
         *    A ship shades the sea beneath it and stops sky light reaching it,
         *    and without that the hull reads as a decal laid on the surface
         *    rather than as an object floating in it.
         * y: foam, in a band hugging the waterline, thrown forward into a bow
         *    wave as the ship makes way.
         *
         * Positions are taken into each hull's own frame, so the footprint is a
         * proper ellipse along the keel rather than a circle.
         */
        vec2 hullContact(vec2 p) {
          vec2 result = vec2(0.0);
          float wash = 0.0;
          for (int i = 0; i < HULL_SLOTS; i++) {
            if (float(i) + 0.5 > uHullCount) break;
            vec4 a = uHullA[i];
            vec4 b = uHullB[i];
            vec2 d = p - a.xy;
            // Rotate into the hull frame: x along the keel, y across the beam.
            vec2 local = vec2(d.x * a.z + d.y * a.w, -d.x * a.w + d.y * a.z);
            vec2 norm = local / max(b.xy, vec2(0.1));
            float r = length(norm);

            result.x = max(result.x, 1.0 - smoothstep(0.85, 1.9, r));
            // Nothing of the collar reaches this far out, and every pixel of
            // open sea to the horizon runs this loop.
            if (r > 2.4) continue;

            // A band on the waterline, widened ahead of the bow by the bow
            // wave and trailed aft where the quarter wave closes in.
            float ahead = clamp(norm.x, 0.0, 1.0);
            float astern = clamp(-norm.x, 0.0, 1.0);
            float bowWave = ahead * ahead * b.z;
            // Widths are in units of the hull's own half length, so keep them
            // small: a tenth of a nine-metre half length is already a metre of
            // white water, and a third of it swallows the whole forefoot.
            float band = 0.13 + bowWave * 0.16;
            // Centred a little outside the hull rather than exactly on it. Half
            // of a collar sitting on the waterline is inside the planking, and
            // from anywhere near the surface the ship's own side hides it, so
            // amidships the only white water visible was whatever leaked past
            // the turn of the bilge - which from the deck is nothing at all.
            float ring = exp(-pow((r - 1.06 - bowWave * 0.15) / band, 2.0));
            // Aft of amidships the quarter wave closes in on the hull and the
            // dead water behind the transom is churned, so the collar thickens
            // towards the stern instead of stopping at the turn of the bilge.
            ring += astern * b.z * 0.85 * exp(-pow((r - 1.0) / (0.2 + 0.26 * b.z), 2.0));
            wash = max(wash, min(ring, 1.35) * (0.42 + 0.85 * b.z));
          }
          // Torn up, so it is lace on the water rather than a painted ring -
          // and thresholded rather than multiplied, for the same reason the
          // whitecaps are: a soft mask over a soft band is grey.
          //
          // The mask has to be clamped. Letting it run past one turns the
          // subtraction below into an addition, and then the threshold is met
          // wherever the noise happens to be high - with no reference at all to
          // any hull. That put a fleck of white water on every square metre of
          // the sea out to the horizon: the fine, evenly spread confetti that
          // was the most conspicuous thing wrong with the open water, and which
          // survived every attempt to tune it out of the whitecaps because it
          // was never coming from there.
          if (wash > 0.01) {
            float lace = fbm2Cheap(p * 2.2 + vec2(uTime * 1.0, uTime * -0.55));
            float froth = valueNoise(p * 6.5 - vec2(uTime * 2.1, uTime * 1.3));
            float mask = clamp(lace * (0.45 + 0.55 * froth) * 1.7, 0.0, 1.0);
            result.y = clamp(smoothstep(0.0, 0.34, wash * 1.2 - (1.0 - mask)), 0.0, 1.0);
          }
          return result;
        }

        void main() {
          // A ship's hold sits below the waterline, so the sea surface would
          // otherwise slice straight through it. While the camera is inside a
          // hull, cut the sea out of that hull's interior volume.
          if (uInteriorActive > 0.5) {
            /*
             * Cut the sea out of the hull's interior, following the shape of the
             * hull rather than a box round it.
             *
             * A box cannot do this job. Made narrow enough to stay inside the
             * planking amidships it leaves a band of unmasked sea between its edge
             * and the ship's side, which from down in the hold is a bright stripe of
             * water running along the inside of the hull at waterline height. Made
             * wide enough to reach the side amidships it sticks out past the bow,
             * where the hull has narrowed to nothing, and punches a hole in the open
             * water ahead of the ship. So the width comes from the hull's own
             * waterline half-beam, sampled along the keel and interpolated.
             */
            vec3 interior = (uInteriorMatrix * vec4(vWorldPos, 1.0)).xyz;
            if (interior.y > uInteriorMin.y && interior.y < uInteriorMax.y &&
                interior.x > uInteriorMin.x && interior.x < uInteriorMax.x) {
              float station = (interior.x - uInteriorMin.x) / (uInteriorMax.x - uInteriorMin.x)
                            * float(HULL_PROFILE_STEPS - 1);
              int lo = int(floor(station));
              int hi = min(lo + 1, HULL_PROFILE_STEPS - 1);
              float halfBeam = mix(uHullHalfBeam[lo], uHullHalfBeam[hi], fract(station));
              if (abs(interior.z) < halfBeam) discard;
            }
          }

          vec3 viewVec = vWorldPos - cameraPosition;
          float dist = length(viewVec);
          vec3 viewDir = viewVec / max(dist, 0.001);

          // How much sea one pixel covers, which is what decides whether a given
          // wavelength can be drawn at all. See detailAt above.
          //
          // Worked out from the geometry rather than taken from screen-space
          // derivatives. The derivative of an interpolated varying is
          // discontinuous at every triangle boundary, so gating detail on it
          // stamps the wave mesh's own facets onto the water as hard-edged
          // patches of flat sky reflection - which looked for all the world like
          // sheets of foam with straight edges.
          float footprint = dist * uPixelAngle / max(abs(viewDir.y), 0.012);

          // The bottom, per pixel: depth and distance to the shore out of one
          // fetch. Both of these arrive at the vertices too, but the radial mesh
          // is five metres or more between rings by the time it reaches an island,
          // and interpolating depth across triangles that size facets the water's
          // colour - blocky patches wherever the bottom is close enough to see -
          // and puts a surf zone whose width steps from triangle to triangle.
          vec2 bed = sampleTerrainBed(vWorldPos.xz);
          float depth = max(0.0, -bed.x);
          float sd = bed.y;
          float shallow = smoothstep(0.0, ${SHALLOW_FADE.toFixed(1)}, depth);

          // Kept for the few terms that genuinely want plain distance rather
          // than pixel footprint: cloud shadow softening, and how far out foam
          // is allowed to survive at all.
          float detailFade = 1.0 - smoothstep(70.0, 420.0, dist);

          // --- The surface, scale by scale. Swell from the shared Gerstner set,
          // then chop and ripple on top of it.
          float crest;
          float wave;
          float lostSwell;
          vec2 longGrad;
          vec3 swell = swellNormal(vFlatXZ, footprint, shallow, crest, wave, lostSwell, longGrad);
          float lostChop;
          // Chop dies away in the shallows along with the swell: a metre of
          // water over a sand bar does not hold a wind sea.
          vec2 chop = chopGradient(
            vWorldPos.xz, mix(0.42, 1.0, shallow) * (1.0 + uStorm * 0.7), footprint, lostChop);

          // Slopes add; normals do not. Composing the layers as gradients and
          // building one normal at the end is both correct and gives the slope
          // vector the foam and the shading want anyway.
          vec2 swellGrad = -swell.xz / max(swell.y, 0.15);
          vec2 slope = swellGrad + chop;
          vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
          if (dot(normal, -viewDir) < 0.0) normal = -normal;
          bool underside = vWorldPos.y > cameraPosition.y;

          // Slope a pixel cannot resolve has not gone anywhere: it is roughness.
          // Rolling it into the highlight is what lets one term run from
          // mirror-sharp sparks underfoot to a broad sheen at the horizon, and
          // it replaces the noise mask the old glitter used - which was the
          // other source of pale speckled patches on the water.
          // The floor is not zero, and that matters more than it looks. A sea
          // is never a mirror: below the finest band drawn here there is always
          // more ripple, and its slope variance is what stops the sun's
          // reflection collapsing to a point. Left at a fortieth of a radian
          // the lobe underfoot came out two degrees wide with a peak twenty
          // times the brightness of the water around it - which on screen is a
          // soft white patch thirty pixels across, and those patches were most
          // of what read as grey paint smeared over the near water. A tenth of
          // a radian of residual slope is about what Cox and Munk measured for
          // this much wind.
          float rough = clamp(sqrt(max(lostSwell + lostChop, 0.0)) * 1.25 + 0.1, 0.1, 0.44);
          // Wind is gusty, and the sea's roughness is patchy with it: cat's paws
          // of ruffled water a couple of boat lengths across with slicker water
          // between them. Varying the roughness rather than the highlight is what
          // breaks the glitter path into separate sparks without stamping a noise
          // pattern onto the water, and it gives the middle distance a change of
          // sheen from one patch to the next instead of one flat tone.
          float ruffleFade = detailAt(footprint, 6.0);
          if (ruffleFade > 0.01) {
            vec2 gust = vWorldPos.xz * 0.14 - uWindDir * (uTime * 1.1);
            rough *= mix(1.0, 0.66 + 0.7 * valueNoise(gust), ruffleFade);
          }

          // --- Cloud shadows drifting across the water.
          float shade = mix(1.0, cloudShadow(vWorldPos), detailFade * 0.9 + 0.1);
          float sunUp = clamp(uSunDir.y, 0.0, 1.0) * shade;
          // Water makes no light of its own. Everything you see looking into it
          // is sunlight that went down, turned round and came back, so the sea
          // has to go dark with the sun or it stays tropical blue under stars.
          float daylight = mix(0.03, 1.0, clamp(uSunDir.y * 3.2 + 0.06, 0.0, 1.0))
            * (0.4 + 0.6 * shade) + uNightFactor * 0.02;

          // --- Body colour by absorption. Light travels down through the
          // water, reflects off the bottom and travels back up, and every
          // metre of that path eats red about fifteen times faster than blue.
          // That one fact is the whole reason a sand bar at knee depth is pale
          // gold, the same sand at four metres is turquoise, and forty metres
          // of identical water is nearly black. Interpolating three hand-picked
          // colours by depth cannot produce it, and the old version blew out to
          // white over every shallow.
          //
          // Depth is measured to the still-water line but the surface is not
          // there, it is up on a crest or down in a trough - so the column of
          // water actually under this pixel is the one plus the other. Over a
          // sand bar that is most of the local depth, and it is what makes a
          // shallow grade in bands that move with the swell rather than reading
          // as a painted gradient. The height used is the analytic one, already
          // damped in the shallows by the same factor the geometry is.
          float localDepth = max(0.0, depth + wave);
          float path = localDepth * (1.5 + 0.85 * (1.0 - clamp(-viewDir.y, 0.0, 1.0)));
          vec3 trans = exp(-uExtinction * path);

          // --- The bottom, where any of it is still visible. Sand reflects a
          // bit over a third of what lands on it; anything near one is a
          // lightbox rather than a sea floor.
          vec3 floorAlbedo = uSandColor;
          float causticGain = 1.0;
          if (trans.g > 0.04) {
            floorAlbedo = seabedAlbedo(vWorldPos.xz, detailAt(footprint, 0.52));
            // The threads are a good deal finer than the metre-odd cells they
            // enclose, so it is their width that decides when this has to go.
            float visible = detailAt(footprint, 0.3);
            if (visible > 0.01) {
              // Caustics move light about rather than adding it, so the water
              // between the threads is darker than plain sand by as much as the
              // threads are brighter. That contrast is most of the effect.
              float net = causticNet(vWorldPos.xz, localDepth, chop) * sunUp;
              causticGain = mix(1.0, 0.8 + net * 1.5, visible);
            }
          }
          vec3 bottom = floorAlbedo * daylight * 0.38 * causticGain;

          // --- What the water column itself sends back, which is all there is
          // to see once the bottom is out of reach - so on open water this is
          // the colour of the sea, and a single constant for it is why the old
          // version was one flat blue from the bow to the horizon.
          //
          // Three things vary it. How much sunlight is being refracted into
          // this particular face, which is ordinary slope shading and the main
          // reason a swell reads as having a shape at all. Whether the pixel is
          // up on a crest, where the lit water is thin and pale, or down in a
          // trough looking through more of it. And a very slow drift in what
          // the water is carrying: plankton and suspended sand vary over
          // hundreds of metres, and a real sea is patched with it.
          float sunFace = clamp(dot(normal, uSunDir) * 0.85 + 0.15, 0.0, 1.0);
          float lift = clamp(wave * 0.8, -1.0, 1.0);
          float watermass = valueNoise(vWorldPos.xz * 0.0028);
          vec3 scatterCol = uScatterColor * (0.84 + 0.36 * watermass);
          scatterCol.g *= 1.0 + (watermass - 0.5) * 0.3;
          scatterCol.b *= 1.0 - (watermass - 0.5) * 0.22;
          vec3 volume = scatterCol * daylight
            * (0.5 + 0.85 * sunFace) * mix(0.82, 1.14, lift * 0.5 + 0.5);
          vec3 body = bottom * trans + volume * (1.0 - trans);

          // How much of the sky this piece of water can see.
          //
          // A trough is a pit with a wall of water on either side of it, so it
          // is lit by a fraction of the dome and reads darker and colder, while
          // a crest stands clear and catches the lot. Most of a real sea's sense
          // of depth comes from this, and the Fresnel term below cannot express
          // any of it: Fresnel knows which way a surface is tilted but not how
          // far down it sits, so without this every face at a given angle came
          // out the same colour whether it was on the top of a swell or in the
          // bottom of one. That is a good part of why the water read as a single
          // flat blue however much ripple was laid over it.
          //
          // Centred on one rather than on its own maximum, so this varies the
          // sea without also darkening it. Written as a fraction that only ever
          // reduces, it took an eighth off the brightness of the whole surface
          // and gave most of that back as nothing: the swell it follows is over
          // a hundred metres long, so at any distance its shading is a very low
          // spatial frequency, and dimming everything to add a slow gradient is
          // a poor trade.
          float skyView = 1.0 + 0.24 * lift;

          // --- Sky reflection with a Fresnel term.
          vec3 reflectDir = reflect(viewDir, normal);
          reflectDir.y = abs(reflectDir.y);
          // No sun disk in the reflection: its threshold is so tight that entire
          // mesh quads flip to white as the interpolated wave normal crosses it.
          // The tight highlight is handled by the Blinn-Phong term below instead.
          // The tight solar aureole is almost entirely suppressed here: the
          // sun's own reflection is the job of the specular lobe below, and
          // leaving both in put a second sun on every swell that faced it.
          vec3 skyCol = atmosphereBase(reflectDir, 0.0, 0.12);
          // Reflected clouds are marched from the water surface, so a cumulus
          // overhead lands in the right place on the sea.
          //
          // Marched off the long swell alone, though, and even that leaned most
          // of the way back to the vertical.
          //
          // That ray runs a kilometre up to the cloud slab, so a tenth of a
          // radian of slope moves where it lands by hundreds of metres - which is
          // several whole clouds. Neighbouring pixels then sample unrelated parts
          // of the deck, and what comes back is not a reflection of anything: it
          // is soft pale blobs the size of a fist in the near field and a field of
          // salt-and-pepper dither towards the horizon, and on open water those
          // were the most conspicuous things in the frame. The same march off the
          // sky dome is perfectly smooth, which is what says the fault is in the
          // direction and not in the march. A real sea's roughness averages all of
          // this into a sheen; using only the slopes the reflection can actually
          // resolve is the cheap way to say so.
          vec3 cloudDir = reflect(viewDir, normalize(vec3(-longGrad.x * 0.45, 1.0, -longGrad.y * 0.45)));
          cloudDir.y = abs(cloudDir.y);
          // And only where the ray goes up steeply enough for the march to mean
          // anything. The sea reflects the deck at a fraction of the sky's step
          // count, and a grazing ray runs ten kilometres through the slab, so the
          // white-noise offset that hides the step boundaries on the dome is
          // sampling almost at random by the time it gets out here - which came
          // back as a field of blue-white dither over the middle distance. That
          // is not a reflection of the weather; it is the march itself showing
          // through. The sky gradient still carries the horizon.
          float cloudFade = smoothstep(0.22, 0.58, cloudDir.y) * (0.3 + 0.7 * detailFade);
          if (cloudFade > 0.01) {
            vec3 clouded = applyCloudsFrom(skyCol, cloudDir, vec3(vWorldPos.x, 0.0, vWorldPos.z));
            skyCol = mix(skyCol, clouded, cloudFade * 0.6);
          }
          // A reflection cannot be brighter than what it reflects, and the sky
          // never exceeds a couple of units. Clamping here catches the last
          // grazing-angle spike where a whole horizon cell mirrors a sunlit
          // cloud top back at the camera.
          skyCol = min(skyCol, vec3(3.0));
          // Schlick against the real normal. The near-vertical reflectance of
          // water is two per cent and the grazing one is nearly all of it, and
          // it is that contrast - dark where you look into the water, bright
          // where you look along it - that gives the sea depth rather than
          // reading as tinted glass. A rough face has its grazing spike knocked
          // back, since some of the microfacets are always turned away.
          float cosView = clamp(dot(normal, -viewDir), 0.0, 1.0);
          float fresnel = 0.02 + (0.96 - rough * 0.5) * pow(1.0 - cosView, 5.0);

          // --- Subsurface glow: crests lit from behind by the sun. A wave
          // about to break is a metre of backlit water and goes bright jade.
          float backLight = pow(clamp(dot(viewDir, -uSunDir) * 0.5 + 0.5, 0.0, 1.0), 3.0);
          vec3 scatter = uShallowColor * 0.26 * backLight * crest * crest * daylight;
          vec3 color = mix(body + scatter, skyCol * skyView, fresnel * 0.94);

          // --- Sun specular. Water reflects two per cent of the light striking
          // it head on and nearly all of it at a grazing angle, so the sun
          // highlight has to carry a Fresnel term of its own, evaluated against
          // the half vector as microfacet theory asks. Without it the glitter
          // fires at full strength through the foreground, where you are
          // looking almost straight down into the water and should be seeing
          // barely any reflection at all - which is what turned the near field
          // into a blown-out sheet and gave the bloom something to smear.
          vec3 halfVec = normalize(uSunDir - viewDir);
          float ndoth = max(dot(normal, halfVec), 0.0);
          float vdoth = clamp(dot(halfVec, -viewDir), 0.0, 1.0);
          float specF = 0.02 + 0.98 * pow(1.0 - vdoth, 5.0);
          // One lobe, whose width comes from the roughness worked out above: a
          // pixel underfoot resolves the wavelets and gets a near-mirror
          // highlight, so the glitter arrives as separate sparks with dark water
          // between them; a pixel at the horizon covers thousands of wavelets
          // and gets the average of all their highlights, which is a broad
          // sheen. Normalising by the exponent keeps the total energy roughly
          // constant across that whole range, which is what lets the glitter
          // path run all the way out without either blowing out near the bow or
          // fading to nothing at the far end.
          //
          // Two lobes, not one. A single mirror-sharp highlight over water this
          // rough is on or off from one pixel to the next, which reads as dither
          // rather than as glitter; the broad lobe underneath is the sheen a real
          // sea keeps between its sparks, and it is what the sharp one then sits
          // on top of.
          float lobe = 2.0 / (rough * rough) - 2.0;
          float wide = max(2.0 / (rough * rough * 9.0) - 2.0, 1.0);
          // Capped well below the analytic peak. Energy conservation says a
          // narrowing lobe gets brighter without limit, and that is true of a
          // real mirror, but here the narrow end of the range is exactly where
          // the surface is least well described - the slope breaking the lobe up
          // is at the resolution limit - so the honest thing is to stop paying
          // out the last of the concentration rather than to render a blown
          // white disc and let the bloom spread it over the frame.
          float spec = min(
            (lobe + 2.0) * pow(ndoth, lobe) * 0.04 + (wide + 2.0) * pow(ndoth, wide) * 0.028,
            9.0);
          color += uSunColor * specF * spec * (1.0 - uStorm * 0.55) * shade
            * smoothstep(-0.03, 0.07, uSunDir.y);
          vec3 moonHalf = normalize(uMoonDir - viewDir);
          float moonF = 0.02 + 0.98 * pow(1.0 - clamp(dot(moonHalf, -viewDir), 0.0, 1.0), 5.0);
          color += uMoonColor * moonF * pow(max(dot(normal, moonHalf), 0.0), 120.0) * 0.9 * uNightFactor;

          // --- Foam: whitecaps, shoreline surf and ship wake.
          //
          // Whitecaps go where a crest is both high in its cycle and steep, and
          // preferentially on the face it is spilling down: the wind pushes the
          // top of a wave over its own front, so the white water lies on the
          // downwind side of the crest and not symmetrically about it. The slope
          // vector says which face this is - height falls away downwind ahead of
          // a crest - and biasing on it is a good part of why the caps now read
          // as belonging to particular waves.
          float steepness = length(slope) + 0.85 * sqrt(max(lostSwell + lostChop, 0.0));
          // Which face this is comes from the swell alone. Testing the full
          // slope, chop and all, throws the answer away: the chop is half a
          // metre across and uncorrelated with the crest, so it turns a coherent
          // streak of foam lying along a crest into a scatter of unrelated
          // flecks - which read as confetti on the water rather than as caps.
          float face = smoothstep(-0.05, 0.12, -dot(swellGrad, uWindDir));
          // A cap is a few metres of crest, which is one pixel by two hundred
          // metres out - so past that they stop being caps and become a dusting
          // of single lit pixels evenly over the whole distance, which is exactly
          // what a star field looks like. They are faded out over that span
          // instead, and the haze takes the horizon from there.
          float capFade = (1.0 - smoothstep(120.0, 330.0, dist)) * (0.5 + 0.5 * detailFade);
          // Whether the sea is capping at all is the wind's business. Without
          // this the crest term alone would put white water on a glassy calm,
          // since it is normalised and so has the same distribution whatever
          // the wind is doing.
          float windSea = (0.42 + 0.58 * smoothstep(0.3, 1.25, uWindSea)) * (1.0 + uStorm * 0.8);
          float chopFoam = 0.0;
          if (crest > 0.28 && capFade > 0.02) {
            chopFoam = whitecaps(vWorldPos.xz, crest + uStorm * 0.26, windSea,
              mix(0.5, 1.0, face), footprint) * capFade * (0.8 + 0.2 * uStorm);
          }

          // --- Shoreline surf. Skipped outright away from a coast: there is no
          // surf in forty metres of water, and the whole of it is half a dozen
          // noise evaluations - not something to spend on every pixel of open sea
          // out to the horizon, which is most of the screen most of the time.
          float shoreFoam = (sd < 42.0 && depth < 6.5)
            ? shorelineSurf(sd, depth, vShoreSlope, footprint, vWorldPos.xz)
            : 0.0;

          vec2 hull = uHullCount > 0.5 ? hullContact(vWorldPos.xz) : vec2(0.0);
          // The sea under a hull loses most of its sky light and all of its
          // reflection, which is what actually plants a ship in the water.
          color *= 1.0 - hull.x * 0.55;

          // The shallow-water knockdown applies to whitecaps alone. Surf is the
          // brightest thing on a sunlit beach and has no business being taken
          // down by half for being close in.
          float wake = wakeFoam(vWorldPos.xz, footprint);
          float foam = clamp(
            chopFoam * (shallow * 0.4 + 0.6) + shoreFoam + wake + hull.y,
            0.0, 1.0);
          // Foam is aerated water, not paint: keep a little of the sea in it,
          // and light it with the same daylight as everything else so it does
          // not stay white after dark. Held down to half value, though, it came
          // out a flat mid grey - which is the other half of why the break read
          // as haze. Sunlit whitewater sits near the top of the range, and it is
          // a diffuse surface, so the cloud shadow crossing the sea has to
          // cross the foam on it too.
          vec3 foamLit = mix(body * 2.0, uFoamColor * daylight * 0.9, 0.9) * (1.0 - uStorm * 0.2);
          color = mix(color, foamLit, foam * 0.92);

          // Seen from below, the surface is a rippling mirror that turns
          // silver overhead and dark towards the grazing angles where total
          // internal reflection sets in. Reflecting the actual sky up there,
          // clouds and all, is what left the ceiling speckled with sky-blue
          // noise: what you see from under water is the sea, reflected.
          if (underside) {
            float up = clamp(dot(normal, -viewDir), 0.0, 1.0);
            vec3 mirror = mix(uDeepColor * 0.6, uShallowColor * 1.25, pow(up, 0.6));
            // Snell's window: a bright disc of sky straight overhead.
            float window = smoothstep(0.62, 0.93, up);
            color = mix(mirror, mix(uFoamColor, uSkyHorizon, 0.35) * (0.35 + 0.65 * clamp(uSunDir.y, 0.0, 1.0)), window * 0.75);
            color += uSunColor * spec * 0.5 * window;
          }

          // Diagnostic channels, off in normal play. Guessing which term is
          // responsible for a pattern on the water from the composited frame is
          // hopeless: half a dozen of them are multiplied together and several
          // are noise fields warped by other noise fields.
          if (uDebug > 0.5) {
            if (uDebug < 1.5) color = vec3(causticGain - 0.74);
            else if (uDebug < 2.5) color = floorAlbedo * 2.0;
            else if (uDebug < 3.5) color = vec3(footprint * 3.0);
            else if (uDebug < 4.5) color = normal * 0.5 + 0.5;
            else if (uDebug < 5.5) color = vec3(depth * 0.06, sd * 0.03, 0.0);
            else if (uDebug < 6.5) color = vec3(shoreFoam);
            else if (uDebug < 7.5) color = vec3(foam);
            else if (uDebug < 8.5) color = vec3(crest, steepness * 0.5, face);
            else if (uDebug < 9.5) color = vec3(rough * 2.5, spec * 0.1, lostChop * 12.0);
            // Which kind of foam: whitecaps, shore surf, and hull plus wake.
            else color = vec3(chopFoam, shoreFoam, wake + hull.y);
            gl_FragColor = vec4(color, 1.0);
            return;
          }

          // --- Haze. The sea carries more of it than the air above it: spray,
          // salt and the damp it evaporates all sit in the first few tens of
          // metres, which is why the last stretch before a real horizon loses
          // its contrast well before the sky does. Hazing the water on exactly
          // the same curve as everything else is what left the far sea a flat
          // saturated band butted up against the sky with a ruled line between
          // them - the one thing a sea horizon never looks like.
          //
          // A linear term alongside the squared one is what gets the haze
          // started: exp(-d*d) alone is almost perfectly flat over the first few
          // hundred metres, so the middle distance had no aerial perspective at
          // all and the whole effect arrived at once, a long way out.
          vec3 hazeCol = mix(uFogColor, atmosphereBase(normalize(viewDir + vec3(0.0, 0.03, 0.0)), 0.0, 0.35), 0.4);
          float hd = uFogDensity * dist;
          float haze = 1.0 - exp(-(hd * 0.62 + hd * hd * 1.15));
          color = mix(color, hazeCol, clamp(haze, 0.0, 0.985));
          // Nothing on the sea is brighter than a sunlit whitecap. Capping it
          // keeps one freak pixel - a reflection lining up with the sun on a
          // sliver of geometry the size of a subsample - from overflowing the
          // half-float buffer and taking the bloom with it.
          gl_FragColor = vec4(min(color, vec3(12.0)), 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(this.buildGeometry(segments), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'ocean';
    this.mesh.renderOrder = -10;
    scene.add(this.mesh);

    const built = this.buildUnderwaterVolume();
    this.underwaterMesh = built.mesh;
    this.underwaterMaterial = built.material;
    scene.add(this.underwaterMesh);

    this.seabedMesh = this.buildSeabed();
    scene.add(this.seabedMesh);

    // Sunlight underwater arrives as a diffuse green-blue glow from every
    // direction at once, not as a beam. Without it the hull below the
    // waterline is a featureless black cut-out, since the sun is on the far
    // side of an opaque sea and nothing else is lighting it.
    //
    // The floor colour matters as much as the sky one: a hull's bottom faces
    // down, so it is lit almost entirely by the lower hemisphere, and leaving
    // that near-black is what kept the keel a silhouette however bright the
    // water above it was.
    this.submergedFill = new THREE.HemisphereLight(0x9fe4ee, 0x2e6f80, 0);
    scene.add(this.submergedFill);
  }

  /**
   * Radial fan centred on the camera: dense triangles underfoot for crisp wave
   * shape, huge ones at the horizon for cheap coverage out to 5 km.
   */
  private buildGeometry(segments: number): THREE.BufferGeometry {
    const sectors = segments;
    const rings = Math.round(segments * 0.62);
    const maxRadius = 5200;
    const positions: number[] = [0, 0, 0];
    const indices: number[] = [];

    for (let ring = 1; ring <= rings; ring++) {
      const t = ring / rings;
      const radius = 0.55 + maxRadius * Math.pow(t, 3.1);
      for (let s = 0; s < sectors; s++) {
        const a = (s / sectors) * Math.PI * 2;
        positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      }
    }

    // Centre fan.
    for (let s = 0; s < sectors; s++) {
      const next = (s + 1) % sectors;
      indices.push(0, 1 + next, 1 + s);
    }
    // Quad strips between rings.
    for (let ring = 0; ring < rings - 1; ring++) {
      const base = 1 + ring * sectors;
      const nextBase = base + sectors;
      for (let s = 0; s < sectors; s++) {
        const next = (s + 1) % sectors;
        indices.push(base + s, nextBase + s, base + next);
        indices.push(base + next, nextBase + s, nextBase + next);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    geometry.boundingSphere!.radius = Infinity;
    return geometry;
  }

  /**
   * A camera-following sea floor at the deep-ocean height.
   *
   * The islands each carry their own patch of terrain, but between them there
   * was nothing at all: dive under and the world ended at the edge of the
   * nearest island's mesh, leaving its underwater skirt standing over a void
   * like a cut-out. This fills that in, and is depth-rejected behind the
   * opaque sea surface whenever the camera is above water, so it costs a
   * single draw call and almost no fill.
   */
  private buildSeabed(): THREE.Mesh {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: this.env.uniforms.uSunDir,
        uSunColor: this.env.uniforms.uSunColor,
        uTime: this.env.uniforms.uTime,
        uNightFactor: this.env.uniforms.uNightFactor,
        uMurk: { value: new THREE.Color(0x0d4257) },
        uFloorColor: { value: new THREE.Color(0x5c6350) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        ${ATMOSPHERE_GLSL}
        uniform vec3 uMurk;
        uniform vec3 uFloorColor;
        varying vec3 vWorld;

        void main() {
          float dist = length(vWorld - cameraPosition);
          // Sand ripples at two scales, so the floor is not a flat plate.
          float ripple = fbm2Cheap(vWorld.xz * 0.09) * 0.6 + fbm2Cheap(vWorld.xz * 0.021 + 5.7) * 0.4;
          vec3 col = uFloorColor * (0.62 + ripple * 0.7);
          // Caustics reach even this deep as a slow, soft web.
          float c1 = valueNoise(vWorld.xz * 0.06 + vec2(uTime * 0.06, -uTime * 0.04));
          float c2 = valueNoise(vWorld.xz * 0.1 - vec2(uTime * 0.03, uTime * 0.05));
          float web = pow(clamp(1.0 - abs(c1 - c2) * 3.0, 0.0, 1.0), 3.0);
          col += uSunColor * web * 0.14 * clamp(uSunDir.y, 0.0, 1.0);
          col *= 0.2 * (1.0 - uNightFactor * 0.7);
          // Forty metres of water swallows almost everything: the floor should
          // be a suggestion under the keel, not a lit beach.
          float murk = 1.0 - exp(-dist * 0.032);
          gl_FragColor = vec4(mix(col, uMurk * 0.45, clamp(murk, 0.0, 1.0)), 1.0);
        }
      `,
    });

    const geometry = new THREE.CircleGeometry(1400, 40, 0, Math.PI * 2);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = SEA_FLOOR - 1.5;
    mesh.frustumCulled = false;
    mesh.name = 'seabed';
    mesh.renderOrder = -11;
    return mesh;
  }

  /** Full-screen tint + murk applied while the camera is below the surface. */
  private buildUnderwaterVolume(): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uNightFactor: this.env.uniforms.uNightFactor,
        uSubmerged: { value: 0 },
        uDepth: { value: 0 },
        uTint: { value: new THREE.Color(0x2196a6) },
        uDeepTint: { value: new THREE.Color(0x0a3b52) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uSubmerged;
        uniform float uDepth;
        uniform float uNightFactor;
        uniform vec3 uTint;
        uniform vec3 uDeepTint;
        varying vec2 vUv;
        void main() {
          if (uSubmerged <= 0.001) discard;
          // Looking up towards the surface the water is bright and green; the
          // deeper the camera and the further down you look, the bluer and
          // darker it gets. A single flat wash over the whole frame is what
          // made this read as a coloured filter rather than as being under it.
          float sink = clamp(uDepth / 14.0, 0.0, 1.0);
          float upward = smoothstep(0.15, 0.95, vUv.y);
          vec3 col = mix(uDeepTint, uTint, upward * (1.0 - sink * 0.6) + 0.12);
          col *= 1.0 - uNightFactor * 0.7;
          float edge = smoothstep(0.05, 0.62, length(vUv - 0.5));
          float alpha = (0.26 + edge * 0.24 + sink * 0.24) * uSubmerged;
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
        }
      `,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 999;
    return { mesh, material };
  }

  /** Water surface height, including the flattening of waves in shallows. */
  waterHeight(x: number, z: number): number {
    const depth = Math.max(0, -this.islands.heightAt(x, z));
    if (depth <= 0.001) return 0;
    const shallow = smoothstep(0, SHALLOW_FADE, depth);
    return this.env.waves.height(x, z) * shallow;
  }

  waterNormal(x: number, z: number, out = this.scratchNormal): THREE.Vector3 {
    const depth = Math.max(0, -this.islands.heightAt(x, z));
    const shallow = smoothstep(0, SHALLOW_FADE, depth);
    this.env.waves.normal(x, z, out);
    out.x *= shallow;
    out.z *= shallow;
    return out.normalize();
  }

  /** Registers a moving hull so the shader can trail foam behind it. */
  private pushWake(source: WakeSource): void {
    const point = this.wake[this.wakeIndex];
    point.set(source.position.x, source.position.z, 0, source.width * clamp01(source.speed / 3.5));
    this.wakeIndex = (this.wakeIndex + 1) % WAKE_POINTS;
  }

  update(dt: number, camera: THREE.Camera, wakeSources: WakeSource[], pixelAngle: number): void {
    const cameraPosition = camera.position;
    this.mesh.position.set(cameraPosition.x, 0, cameraPosition.z);
    this.seabedMesh.position.set(cameraPosition.x, SEA_FLOOR - 1.5, cameraPosition.z);
    this.material.uniforms.uPixelAngle.value = pixelAngle;
    (this.material.uniforms.uCameraXZ.value as THREE.Vector2).set(cameraPosition.x, cameraPosition.z);
    (this.material.uniforms.uWindDir.value as THREE.Vector2).set(
      Math.cos(this.env.windAngle),
      Math.sin(this.env.windAngle),
    );
    this.material.uniforms.uWindSea.value = this.env.windSpeed;

    let active = 0;
    for (const point of this.wake) {
      if (point.z >= 0) {
        // Slow ageing keeps a long trail alive in the ring buffer.
        point.z += dt * 0.16;
        if (point.z > 1) point.z = -1;
        else active++;
      }
    }
    this.material.uniforms.uWakeActive.value = active > 0 ? 1 : 0;

    // Hull footprints, nearest first so a crowded anchorage spends its four
    // slots on the ships actually in shot.
    const nearby = wakeSources
      .map((source) => ({ source, d: source.centre.distanceToSquared(cameraPosition) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, HULL_SLOTS);
    for (let i = 0; i < nearby.length; i++) {
      const { source } = nearby[i];
      this.hulls[i].set(source.centre.x, source.centre.z, Math.cos(source.heading), Math.sin(source.heading));
      this.hullShape[i].set(source.halfLength, source.halfBeam, clamp01(source.speed / 5), 0);
    }
    this.material.uniforms.uHullCount.value = nearby.length;

    // Lay foam down by distance travelled rather than by time, so the trail is
    // evenly spaced at any speed instead of clumping or breaking into dashes.
    for (let i = 0; i < wakeSources.length; i++) {
      const source = wakeSources[i];
      if (source.speed < 0.7) continue;
      const last = this.lastWakePosition[i];
      if (!last) {
        this.lastWakePosition[i] = source.position.clone();
        this.pushWake(source);
        continue;
      }
      if (last.distanceTo(source.position) >= 3.5) {
        last.copy(source.position);
        this.pushWake(source);
      }
    }

    const surface = this.waterHeight(cameraPosition.x, cameraPosition.z);
    const inside = (this.material.uniforms.uInteriorActive.value as number) > 0.5;
    const submerged = inside ? 0 : clamp01((surface - cameraPosition.y) * 2.2);
    this.underwaterMaterial.uniforms.uSubmerged.value = submerged;
    this.underwaterMaterial.uniforms.uDepth.value = Math.max(0, surface - cameraPosition.y);
    this.underwaterMesh.visible = submerged > 0.001;
    this.submergedFill.intensity = submerged * 2.4 * (1 - (this.env.uniforms.uNightFactor.value as number) * 0.8);
  }

  /**
   * Masks the sea out of a hull's interior. Pass the ship the camera is inside,
   * or null when it is out in the open.
   */
  setInteriorMask(matrixWorld: THREE.Matrix4 | null, min?: THREE.Vector3, max?: THREE.Vector3): void {
    const uniforms = this.material.uniforms;
    if (!matrixWorld || !min || !max) {
      uniforms.uInteriorActive.value = 0;
      return;
    }
    uniforms.uInteriorActive.value = 1;
    (uniforms.uInteriorMatrix.value as THREE.Matrix4).copy(matrixWorld).invert();
    (uniforms.uInteriorMin.value as THREE.Vector3).copy(min);
    (uniforms.uInteriorMax.value as THREE.Vector3).copy(max);
  }

  /**
   * The hull's waterline half-beam along the keel, in ship-local metres, sampled
   * evenly between the fore and aft bounds passed to `setInteriorMask`. The
   * interior cut follows this instead of a rectangle.
   */
  setHullProfile(halfBeams: number[]): void {
    const target = this.material.uniforms.uHullHalfBeam.value as number[];
    for (let i = 0; i < target.length; i++) {
      target[i] = halfBeams[Math.min(i, halfBeams.length - 1)] ?? 0;
    }
  }
}
