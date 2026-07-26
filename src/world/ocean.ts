import * as THREE from 'three';
import { clamp01, smoothstep } from '../core/math';
import { ATMOSPHERE_GLSL } from './atmosphere.glsl';
import { Environment } from './environment';
import { IslandField, SEA_FLOOR } from './islands';
import { WAVE_GLSL } from './waves';

const WAKE_POINTS = 16;
/** Hulls the sea will draw contact shadow and waterline foam for. */
const HULL_SLOTS = 4;
/** Waves flatten out as water gets shallow; matched on CPU and GPU. */
const SHALLOW_FADE = 4.2;

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
      defines: { CLOUD_STEPS: cloudSteps, CLOUD_LIGHT_STEPS: 1 },
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
        /** Diagnostic channel selector; see the end of the fragment shader. */
        uDebug: { value: 0 },
      },
      vertexShader: /* glsl */ `
        ${WAVE_GLSL}
        ${IslandField.HEIGHT_SAMPLE_GLSL}

        varying vec3 vWorldPos;
        varying vec3 vWaveNormal;
        varying float vCrest;
        varying float vDepth;
        varying float vShallow;
        varying float vShoreSlope;

        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
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
          vWaveNormal = normalize(mix(vec3(0.0, 1.0, 0.0), waveNormal, detail));
          vCrest = waveCrestFactor(world.xz) * detail;
          vDepth = depth;
          vShallow = shallow;

          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        ${ATMOSPHERE_GLSL}
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
        uniform float uDebug;

        varying vec3 vWorldPos;
        varying vec3 vWaveNormal;
        varying float vCrest;
        varying float vDepth;
        varying float vShallow;
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
         * Wind chop layered on top of the Gerstner normal. Six crossing sine
         * ripples with analytic gradients - far cheaper than sampling noise three
         * times for a finite-difference normal, and it never shimmers.
         *
         * Each band fades on its own wavelength. Fading them together, or worse
         * gating the whole lot on the finest one, takes the six-metre swell chop
         * away along with the wavelets - and then the middle distance is nothing
         * but the wave mesh's own facets, flat quads a few metres across each
         * reflecting a different piece of sky as a hard-edged pale patch. This
         * chop is not decoration; it is what stops the sea looking polygonal.
         */
        vec2 rippleGradient(vec2 p, float strength, float footprint) {
          // Warp the domain first: crossing sines alone interfere into a visible
          // lattice, which a sharp sun highlight turns into a grid of bright
          // squares.
          vec2 warp = vec2(
            valueNoise(p * 0.31 + vec2(uTime * 0.021, 4.3)),
            valueNoise(p * 0.29 + vec2(11.7, -uTime * 0.018))
          ) - 0.5;
          p += warp * 1.9;

          const vec2 d0 = vec2(0.86, 0.51);
          const vec2 d1 = vec2(-0.42, 0.91);
          const vec2 d2 = vec2(0.18, -0.98);
          const vec2 d3 = vec2(-0.94, -0.35);
          // Wavelengths in metres, for the fade: the domain arrives pre-scaled by
          // 0.55, so a term at k radians per unit is 2*pi/(0.55*k) metres across.
          vec2 grad = vec2(0.0);
          grad += d0 * cos(dot(d0, p) * 1.7 - uTime * 2.9) * 0.55 * detailAt(footprint, 6.7);
          grad += d1 * cos(dot(d1, p) * 2.6 - uTime * 3.7) * 0.36 * detailAt(footprint, 4.4);
          grad += d2 * cos(dot(d2, p) * 4.3 + uTime * 4.6) * 0.22 * detailAt(footprint, 2.7);
          grad += d3 * cos(dot(d3, p) * 7.1 + uTime * 6.1) * 0.12 * detailAt(footprint, 1.6);
          // Two finer bands break the highlight into wavelets rather than sheets.
          grad += d1 * cos(dot(d1, p) * 11.3 - uTime * 8.2) * 0.07 * detailAt(footprint, 1.0);
          grad += d2 * cos(dot(d2, p) * 17.9 + uTime * 11.0) * 0.04 * detailAt(footprint, 0.64);
          return grad * strength;
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

        float wakeFoam(vec2 p) {
          if (uWakeActive < 0.5) return 0.0;
          float foam = 0.0;
          for (int i = 0; i < WAKE_POINTS; i++) {
            vec4 w = uWake[i];
            if (w.z < 0.0) continue;
            float age = w.z;
            // Radius grows with age only: strength drives how white it is, so a
            // fast ship leaves a broad churned trail rather than a bigger dot.
            float radius = mix(2.6, 15.0, age);
            float d = length(p - w.xy);
            // Soft quadratic falloff, textured with a churn ripple, fading as the
            // foam ages so the trail dissolves behind the ship.
            float t = clamp(1.0 - d / radius, 0.0, 1.0);
            float churn = 0.55 + 0.45 * sin(d * 1.1 - uTime * 3.0);
            foam = max(foam, t * t * t * churn * (1.0 - age) * w.w * 0.34);
          }
          return clamp(foam, 0.0, 1.0);
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

            // A band on the waterline, widened ahead of the bow by the bow
            // wave and trailed aft where the quarter wave closes in.
            float ahead = clamp(norm.x, 0.0, 1.0);
            float bowWave = ahead * ahead * b.z;
            // Widths are in units of the hull's own half length, so keep them
            // small: a tenth of a nine-metre half length is already a metre of
            // white water, and a third of it swallows the whole forefoot.
            float band = 0.085 + bowWave * 0.12;
            float ring = exp(-pow((r - 1.0 - bowWave * 0.16) / band, 2.0));
            // Torn up, so it is lace on the water rather than a painted ring.
            float lace = fbm2Cheap(p * 1.9 + vec2(uTime * 0.9, uTime * -0.5));
            ring *= smoothstep(0.3, 0.74, lace + 0.16);
            result.y = max(result.y, ring * (0.35 + 0.65 * b.z));
          }
          return result;
        }

        void main() {
          // A ship's hold sits below the waterline, so the sea surface would
          // otherwise slice straight through it. While the camera is inside a
          // hull, cut the sea out of that hull's interior volume.
          if (uInteriorActive > 0.5) {
            vec3 interior = (uInteriorMatrix * vec4(vWorldPos, 1.0)).xyz;
            if (all(greaterThan(interior, uInteriorMin)) && all(lessThan(interior, uInteriorMax))) discard;
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

          // Ripple detail fades with distance to stop the horizon shimmering.
          // The mesh rings are metres apart close in and hundreds of metres apart
          // out there, so anything with a tight highlight has to be gone well
          // before then or it breaks into rows of speckle along the rings.
          float detailFade = 1.0 - smoothstep(70.0, 420.0, dist);
          // The domain is pre-scaled, but the footprint stays in metres: the
          // per-band wavelengths inside are quoted in metres too.
          vec2 ripple = rippleGradient(vWorldPos.xz * 0.55, 0.33 * (1.0 + uStorm * 0.6), footprint);
          vec3 normal = normalize(vWaveNormal + vec3(ripple.x, 0.0, ripple.y));
          if (dot(normal, -viewDir) < 0.0) normal = -normal;
          bool underside = vWorldPos.y > cameraPosition.y;

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
          float path = depth * (1.5 + 0.85 * (1.0 - clamp(-viewDir.y, 0.0, 1.0)));
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
              float net = causticNet(vWorldPos.xz, depth, ripple) * sunUp;
              causticGain = mix(1.0, 0.8 + net * 1.5, visible);
            }
          }
          vec3 bottom = floorAlbedo * daylight * 0.38 * causticGain;
          vec3 volume = uScatterColor * daylight;
          vec3 body = bottom * trans + volume * (1.0 - trans);

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
          // Marched off a calmed normal, though: the swell only, with the wind
          // chop left out and the whole thing leaned back towards the vertical.
          // That ray has to run a kilometre up to the cloud slab, and at a
          // grazing angle it is hypersensitive to slope - a hand's width of chop
          // swings it across half the sky. Marched off the real normal, the cloud
          // deck comes back as a field of hard-edged pale patches corresponding
          // to nothing actually up there, and on open water that was the most
          // conspicuous thing in the frame. The same march off the sky dome is
          // perfectly smooth, which is what says the fault is in the direction
          // rather than in the march. A real sea's micro-roughness averages all
          // of it into a sheen, and a calmer normal is the cheap way to say so.
          vec3 cloudDir = reflect(viewDir, normalize(mix(vec3(0.0, 1.0, 0.0), vWaveNormal, 0.4)));
          cloudDir.y = abs(cloudDir.y);
          float cloudFade = smoothstep(0.1, 0.42, cloudDir.y) * (0.3 + 0.7 * detailFade);
          if (cloudFade > 0.01) {
            vec3 clouded = applyCloudsFrom(skyCol, cloudDir, vec3(vWorldPos.x, 0.0, vWorldPos.z));
            skyCol = mix(skyCol, clouded, cloudFade * 0.75);
          }
          // A reflection cannot be brighter than what it reflects, and the sky
          // never exceeds a couple of units. Clamping here catches the last
          // grazing-angle spike where a whole horizon cell mirrors a sunlit
          // cloud top back at the camera.
          skyCol = min(skyCol, vec3(3.0));
          float fresnel = pow(1.0 - clamp(dot(normal, -viewDir), 0.0, 1.0), 4.2);
          fresnel = mix(0.03, 1.0, fresnel);

          // --- Subsurface glow: crests lit from behind by the sun. A wave
          // about to break is a metre of backlit water and goes bright jade.
          float backLight = pow(clamp(dot(viewDir, -uSunDir) * 0.5 + 0.5, 0.0, 1.0), 3.0);
          vec3 scatter = uShallowColor * 0.18 * backLight * vCrest * vCrest * daylight;
          vec3 color = mix(body + scatter, skyCol, fresnel * 0.86);

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
          // A pixel of near water covers one wave face and gets a mirror-sharp
          // highlight; a pixel at the horizon covers thousands, and all those
          // highlights average into a broad sheen. Widening the lobe with
          // distance instead of fading it out is what lets the glitter path run
          // all the way to the horizon the way a real one does, without the
          // speckle a sharp highlight aliases into out there.
          float lobe = mix(9.0, 55.0, detailFade);
          float spec = pow(ndoth, lobe);
          float glitter = pow(ndoth, 22.0) * 0.05;
          // Break the near highlight into individual sparks. Real glitter is a
          // field of separate points with dark water between them; a solid
          // sheet is the giveaway that a sea is rendered rather than filmed.
          float sparkle = valueNoise(vWorldPos.xz * 6.1 + vec2(uTime * 0.8, uTime * -0.6));
          sparkle = smoothstep(0.42, 0.95, sparkle);
          spec *= mix(1.0, 0.12 + 1.9 * sparkle * sparkle, detailFade * detailAt(footprint, 0.2));
          spec *= mix(0.16, 0.9, detailFade);
          color += uSunColor * specF * (spec + glitter * detailFade) * (1.0 - uStorm * 0.55) * shade;
          vec3 moonHalf = normalize(uMoonDir - viewDir);
          float moonF = 0.02 + 0.98 * pow(1.0 - clamp(dot(moonHalf, -viewDir), 0.0, 1.0), 5.0);
          color += uMoonColor * moonF * pow(max(dot(normal, moonHalf), 0.0), 120.0) * 0.9 * uNightFactor;

          // --- Foam: whitecaps, shoreline surf and ship wake.
          // The foam mask is sampled in a frame that drifts with the wind and
          // is stretched four to one along it, so patches come out as torn
          // streaks lying downwind rather than as round splotches. Both scales
          // are metres across: the ten-metre noise the first version used
          // painted the sea with clouds.
          vec2 windPerp = vec2(-uWindDir.y, uWindDir.x);
          vec2 drift = vWorldPos.xz - uWindDir * (uTime * 1.4);
          vec2 foamUv = vec2(dot(drift, uWindDir) * 0.3, dot(drift, windPerp));
          float foamNoise = fbm2Cheap(foamUv * 0.9) * 0.6 + fbm2Cheap(foamUv * 2.6 + 7.3) * 0.4;
          // Whitecaps only where a crest is steep enough to topple, which on a
          // fair-weather sea is a small fraction of the surface.
          float chopFoam = smoothstep(0.70, 0.97, vCrest + uStorm * 0.32) * (0.75 + uStorm * 0.25)
            * (0.2 + 0.8 * detailFade);

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
          float foam = clamp(
            chopFoam * smoothstep(0.44, 0.8, foamNoise) * (vShallow * 0.4 + 0.6)
              + shoreFoam + wakeFoam(vWorldPos.xz) + hull.y,
            0.0, 1.0);
          // Foam is aerated water, not paint: keep a little of the sea in it,
          // and light it with the same daylight as everything else so it does
          // not stay white after dark. Held down to half value, though, it came
          // out a flat mid grey - which is the other half of why the break read
          // as haze. Sunlit whitewater sits near the top of the range.
          vec3 foamLit = mix(body * 2.0, uFoamColor * daylight * 0.86, 0.88) * (1.0 - uStorm * 0.2);
          color = mix(color, foamLit, foam * 0.9);

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
            else color = vec3(foam);
            gl_FragColor = vec4(color, 1.0);
            return;
          }

          color = applyAtmosphericFog(color, dist, viewDir);
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

}
