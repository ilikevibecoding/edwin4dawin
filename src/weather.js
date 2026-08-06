// Sky, sun, atmosphere, night lighting and environment reflections.
//
// Art direction lives here. The three conditions are three separate looks, not
// three brightness levels: a hard high desert noon with a dust band on the
// horizon, a low raking sunset with an indigo zenith, and a moonlit night with
// a real dome overhead instead of a black hole.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// Condition fields that hold colours rather than plain numbers. The transition
// blender has to interpolate these in colour space instead of lerping the raw
// hex integer, which would slide through nonsense hues.
const COLOUR_KEYS = new Set([
  'sunColor', 'ambientSky', 'ambientGround', 'fillColor',
  'fogColor', 'fogHigh', 'fogInscatter',
  'hazeColor', 'zenithTint', 'horizonTint',
  'nightZenith', 'nightHorizon', 'moonGlow', 'milkyColor',
]);

export const CONDITIONS = {
  day: {
    id: 'day',
    name: 'DAY',

    // --- key light ---------------------------------------------------------
    // mid-afternoon rather than noon: enough elevation for a hard desert look,
    // low enough that everything on the apron casts a shadow with some shape
    sunElevation: 47,
    sunAzimuth: 336,
    sunIntensity: 4.5,
    sunColor: 0xfff1d9,
    // where the post chain should hang the lens veil (the moon at night)
    keyElevation: 47,
    keyAzimuth: 336,

    // --- analytic sky ------------------------------------------------------
    turbidity: 2.4,
    rayleigh: 1.85,
    mieCoefficient: 0.0019,
    mieDirectionalG: 0.78,
    skyGain: 1.0,
    // Preetham puts several units of radiance on the horizon; without a
    // shoulder ACES clips the whole band to paper white and the ranges vanish.
    skyKnee: 0.26,
    skyCeil: 0.74,
    skySat: 1.06,
    zenithTint: 0xa8c6ff,
    horizonTint: 0xfff0dc,
    tintPower: 0.42,
    // dust layer sitting in the bottom few degrees of the dome
    hazeColor: 0xcdc2a8,
    hazeStrength: 0.70,
    hazeSpan: 0.16,
    hazeFalloff: 2.0,
    hazeSunGain: 0.60,
    sunDisc: 1.4,
    aureole: 0.16,
    aureolePower: 900,

    // --- night dome (off) --------------------------------------------------
    nightSky: 0,
    nightZenith: 0x000000,
    nightHorizon: 0x000000,
    moonGlow: 0x000000,
    milkyWay: 0,
    milkyColor: 0x000000,
    stars: 0,
    moonOpacity: 0,

    // --- fill --------------------------------------------------------------
    // desert shade is lit by blue sky from above and hot sand bounce from the
    // side; both together are what keeps it readable without going flat
    ambientIntensity: 0.62,
    ambientSky: 0xa6c6ef,
    ambientGround: 0xab8b5e,
    fillIntensity: 0.30,
    fillColor: 0xc4aa80,
    envIntensity: 0.34,

    // --- aerial perspective ------------------------------------------------
    fogColor: 0xd0c4aa,
    fogHigh: 0xa6c2e0,
    fogInscatter: 0x140d04,
    fogDensity: 0.000115,
    fogHeight: 1500,
    fogSpan: 0.20,

    exposure: 0.60,

    // --- post --------------------------------------------------------------
    bloomStrength: 0.30,
    bloomThreshold: 0.90,
    bloomRadius: 0.62,
    grain: 0.028,
    vignette: 0.30,
    contrast: 1.05,
    saturation: 1.05,
    shadowTint: [0.000, 0.003, 0.011],
    highlightTint: [0.014, 0.006, -0.008],
    veilStrength: 0.16,
    veilColor: [1.0, 0.86, 0.62],
    shimmer: 1.0,
    aberration: 0.00055,

    // --- consumed by other modules ----------------------------------------
    smokeLight: [0.96, 0.94, 0.90],
    smokeShadow: [0.44, 0.49, 0.60],
    floodlights: false,
  },

  sunset: {
    id: 'sunset',
    name: 'SUNSET',

    // low enough for the shadows to rake right across the apron, high enough
    // that horizontal surfaces still catch a usable amount of the key
    sunElevation: 7.5,
    sunAzimuth: 272,
    // a grazing sun only lands cos(82.5) of itself on flat ground, so the
    // nominal intensity has to be well above the daytime figure to read
    sunIntensity: 8.4,
    sunColor: 0xffa257,
    keyElevation: 7.5,
    keyAzimuth: 272,

    turbidity: 5.2,
    rayleigh: 1.55,
    mieCoefficient: 0.0060,
    mieDirectionalG: 0.84,
    skyGain: 1.10,
    skyKnee: 0.24,
    skyCeil: 0.88,
    skySat: 1.32,
    // the money shot: indigo overhead falling into a hot orange band
    zenithTint: 0x6360cc,
    horizonTint: 0xff9a42,
    tintPower: 0.50,
    hazeColor: 0xe07c34,
    hazeStrength: 0.55,
    hazeSpan: 0.22,
    hazeFalloff: 1.7,
    hazeSunGain: 1.7,
    sunDisc: 2.2,
    aureole: 0.42,
    aureolePower: 420,

    nightSky: 0.18,
    nightZenith: 0x0a1030,
    nightHorizon: 0x241028,
    moonGlow: 0x000000,
    milkyWay: 0,
    milkyColor: 0x000000,
    stars: 0.10,
    moonOpacity: 0,

    // cool shadows against the warm key is what sells a low sun
    ambientIntensity: 0.34,
    ambientSky: 0x6078c0,
    ambientGround: 0x5c3a20,
    fillIntensity: 0.30,
    fillColor: 0x6478bc,
    envIntensity: 0.26,

    fogColor: 0xb2683a,
    fogHigh: 0x54568c,
    fogInscatter: 0x3a1c06,
    fogDensity: 0.000135,
    fogHeight: 1200,
    fogSpan: 0.16,

    exposure: 0.56,

    bloomStrength: 0.52,
    bloomThreshold: 0.80,
    bloomRadius: 0.74,
    grain: 0.036,
    vignette: 0.38,
    contrast: 1.09,
    saturation: 1.14,
    shadowTint: [-0.012, -0.002, 0.026],
    highlightTint: [0.030, 0.008, -0.020],
    veilStrength: 0.34,
    veilColor: [1.0, 0.58, 0.26],
    shimmer: 0.25,
    aberration: 0.00075,

    smokeLight: [1.0, 0.76, 0.55],
    smokeShadow: [0.30, 0.28, 0.38],
    floodlights: true,
  },

  night: {
    id: 'night',
    name: 'NIGHT',

    // the sun is well down; the moon becomes the key (see _apply)
    sunElevation: -13.0,
    sunAzimuth: 300,
    sunIntensity: 0.44,
    sunColor: 0x93aeea,
    keyElevation: 36,
    keyAzimuth: 300 + 168,

    turbidity: 3.0,
    rayleigh: 0.7,
    mieCoefficient: 0.0026,
    mieDirectionalG: 0.80,
    skyGain: 1.0,
    skyKnee: 0.16,
    skyCeil: 0.42,
    skySat: 1.0,
    zenithTint: 0x8098d0,
    horizonTint: 0xa0a6c0,
    tintPower: 0.5,
    hazeColor: 0x0a1220,
    hazeStrength: 0.55,
    hazeSpan: 0.10,
    hazeFalloff: 2.0,
    hazeSunGain: 0.0,
    sunDisc: 0,
    aureole: 0,
    aureolePower: 900,

    // hand-authored dome: Preetham collapses to black below the horizon and a
    // black sky reads as a missing asset rather than as night
    nightSky: 1,
    nightZenith: 0x18203a,
    nightHorizon: 0x39445e,
    moonGlow: 0x9cb4e0,
    milkyWay: 0.9,
    milkyColor: 0x93a2cc,
    stars: 1,
    moonOpacity: 1,

    ambientIntensity: 0.09,
    ambientSky: 0x22304c,
    ambientGround: 0x0b0e14,
    fillIntensity: 0.06,
    fillColor: 0x4a5f88,
    envIntensity: 0.05,

    fogColor: 0x232c40,
    fogHigh: 0x161e33,
    fogInscatter: 0x000000,
    fogDensity: 0.000045,
    fogHeight: 1100,
    fogSpan: 0.18,

    exposure: 0.66,

    bloomStrength: 0.72,
    bloomThreshold: 0.50,
    bloomRadius: 0.86,
    grain: 0.060,
    vignette: 0.52,
    contrast: 1.15,
    saturation: 1.0,
    shadowTint: [0.002, 0.005, 0.013],
    highlightTint: [0.004, 0.007, 0.014],
    veilStrength: 0.14,
    veilColor: [0.62, 0.74, 1.0],
    shimmer: 0,
    aberration: 0.00060,

    smokeLight: [0.48, 0.55, 0.70],
    smokeShadow: [0.13, 0.16, 0.24],
    floodlights: true,
  },
};

// ---------------------------------------------------------------------------
// Aerial perspective
//
// Three's fog is one flat colour applied on view depth. Over a 46 km terrain
// bowl that paints every range with the same veil from base to summit, which
// is precisely the white sheet that used to swallow the mountains. These chunk
// overrides replace it with:
//
//   * a height-attenuated density (dust lives in the bottom kilometre, so
//     summits stay crisp while valley floors wash out), and
//   * a veil colour that varies with the view ray - dust low down, sky colour
//     higher up, plus an in-scatter lobe around the key light.
//
// The world-space ray is rebuilt from `mvPosition` and the view matrix rather
// than from `transformed`, because the sprite shader never defines the latter.
// ---------------------------------------------------------------------------

const fogUniforms = {
  uFogHigh: { value: new THREE.Color(0x8fa9c8) },
  uFogInscatter: { value: new THREE.Color(0x000000) },
  uFogKeyDir: { value: new THREE.Vector3(0, 1, 0) },
  uFogHeight: { value: 950 },
  uFogSpan: { value: 0.2 },
};

let aerialInstalled = false;

function installAerialPerspective() {
  if (aerialInstalled) return;
  aerialInstalled = true;
  const C = THREE.ShaderChunk;

  C.fog_pars_vertex = /* glsl */`
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogRay;
#endif`;

  C.fog_vertex = /* glsl */`
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  // world offset from the camera == transpose( mat3( viewMatrix ) ) * viewPos
  vFogRay = vec3(
    dot( viewMatrix[ 0 ].xyz, mvPosition.xyz ),
    dot( viewMatrix[ 1 ].xyz, mvPosition.xyz ),
    dot( viewMatrix[ 2 ].xyz, mvPosition.xyz )
  );
#endif`;

  C.fog_pars_fragment = /* glsl */`
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogRay;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
  uniform vec3 uFogHigh;
  uniform vec3 uFogInscatter;
  uniform vec3 uFogKeyDir;
  uniform float uFogHeight;
  uniform float uFogSpan;
#endif`;

  C.fog_fragment = /* glsl */`
#ifdef USE_FOG
  {
    float fogDist = max( length( vFogRay ), 1e-3 );
    vec3 fogDir = vFogRay / fogDist;

    #ifdef FOG_EXP2
      // Beer-Lambert with an analytic integral of exp( -y / H ) along the ray.
      // Plain extinction rather than three's squared exponential: the squared
      // form barely registers below one optical depth, which is exactly the
      // 2-15 km band the ranges live in.
      float k = vFogRay.y / uFogHeight;
      float ramp = abs( k ) < 1e-3 ? 1.0 : ( 1.0 - exp( - k ) ) / k;
      float h0 = exp( - max( cameraPosition.y, 0.0 ) / uFogHeight );
      // the site itself stays clear; haze only builds beyond the perimeter
      float optical = fogDensity * max( fogDist - 110.0, 0.0 ) * h0 * clamp( ramp, 0.0, 24.0 );
      float fogFactor = 1.0 - exp( - optical );
    #else
      float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
    #endif

    float rise = smoothstep( 0.0, uFogSpan, fogDir.y );
    vec3 veil = mix( fogColor, uFogHigh, rise );
    veil += uFogInscatter * pow( max( dot( fogDir, uFogKeyDir ), 0.0 ), 6.0 );

    gl_FragColor.rgb = mix( gl_FragColor.rgb, veil, fogFactor );
  }
#endif`;

  // Feed the extra uniforms to every built-in material. Patching the prototype
  // hook means materials built elsewhere (and later) pick this up too, and
  // every material shares the same uniform objects so one write updates all.
  const inherited = THREE.Material.prototype.onBeforeCompile;
  THREE.Material.prototype.onBeforeCompile = function aegisFogHook(shader, renderer) {
    if (shader && shader.uniforms && typeof shader.fragmentShader === 'string'
      && shader.fragmentShader.indexOf('fog_pars_fragment') !== -1) {
      Object.assign(shader.uniforms, fogUniforms);
    }
    inherited.call(this, shader, renderer);
  };
}

// ---------------------------------------------------------------------------
// Sky dome
// ---------------------------------------------------------------------------

const SKY_UNIFORM_DEFAULTS = () => ({
  uSkyGain: { value: 1 },
  uSkyKnee: { value: 0.3 },
  uSkyCeil: { value: 0.86 },
  uSkySat: { value: 1 },
  uZenithTint: { value: new THREE.Color(0xffffff) },
  uHorizonTint: { value: new THREE.Color(0xffffff) },
  uTintPower: { value: 0.45 },
  uHazeColor: { value: new THREE.Color(0xb9b2a0) },
  uHazeStrength: { value: 0.6 },
  uHazeSpan: { value: 0.17 },
  uHazeFalloff: { value: 2.1 },
  uHazeSunGain: { value: 0.6 },
  uSunDisc: { value: 1.4 },
  uAureole: { value: 0.16 },
  uAureolePower: { value: 900 },
  uNightSky: { value: 0 },
  uNightZenith: { value: new THREE.Color(0x000000) },
  uNightHorizon: { value: new THREE.Color(0x000000) },
  uMoonGlow: { value: new THREE.Color(0x000000) },
  uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
  uMilkyWay: { value: 0 },
  uMilkyColor: { value: new THREE.Color(0x000000) },
});

const SKY_HELPERS = /* glsl */`
uniform float uSkyGain;
uniform float uSkyKnee;
uniform float uSkyCeil;
uniform float uSkySat;
uniform vec3 uZenithTint;
uniform vec3 uHorizonTint;
uniform float uTintPower;
uniform vec3 uHazeColor;
uniform float uHazeStrength;
uniform float uHazeSpan;
uniform float uHazeFalloff;
uniform float uHazeSunGain;
uniform float uSunDisc;
uniform float uAureole;
uniform float uAureolePower;
uniform float uNightSky;
uniform vec3 uNightZenith;
uniform vec3 uNightHorizon;
uniform vec3 uMoonGlow;
uniform vec3 uMoonDir;
uniform float uMilkyWay;
uniform vec3 uMilkyColor;

float aegisFbm( vec2 p ) {
  float v = 0.0;
  float a = 0.5;
  for ( int i = 0; i < 3; i ++ ) {
    v += a * noise( p );
    p *= 2.17;
    a *= 0.5;
  }
  return v;
}
`;

// Everything after the Preetham composition. Runs once per sky pixel.
const SKY_GRADE = /* glsl */`
      vec3 aegisSky = texColor * uSkyGain;
      float aegisUp = clamp( direction.y, 0.0, 1.0 );

      // artistic hue control: pull the zenith and the horizon apart
      aegisSky *= mix( uHorizonTint, uZenithTint, pow( aegisUp, uTintPower ) );

      // hand-authored night dome plus moon glow and a milky way band
      if ( uNightSky > 0.0 ) {
        vec3 dome = mix( uNightHorizon, uNightZenith, pow( aegisUp, 0.6 ) );
        float md = max( dot( direction, uMoonDir ), 0.0 );
        dome += uMoonGlow * ( pow( md, 900.0 ) * 0.9 + pow( md, 40.0 ) * 0.07 + pow( md, 4.0 ) * 0.009 );
        if ( uMilkyWay > 0.0 ) {
          // a broad band tilted away from the zenith, broken up by value noise
          vec3 pole = normalize( vec3( 0.62, 0.44, -0.65 ) );
          float gd = dot( direction, pole );
          float band = exp( - gd * gd * 26.0 );
          float n = aegisFbm( vec2( atan( direction.z, direction.x ) * 2.6, gd * 7.0 ) * 1.6 );
          float mw = band * smoothstep( 0.28, 0.85, n );
          dome += uMilkyColor * mw * uMilkyWay * 0.085;
        }
        aegisSky += dome * uNightSky;
      }

      // low dust layer; brighter looking into the key light
      float aegisBand = pow( clamp( 1.0 - direction.y / uHazeSpan, 0.0, 1.0 ), uHazeFalloff );
      float aegisToward = pow( clamp( cosTheta, 0.0, 1.0 ), 3.0 );
      vec3 aegisHaze = uHazeColor * ( 1.0 + aegisToward * uHazeSunGain );
      aegisSky = mix( aegisSky, aegisHaze, aegisBand * uHazeStrength );
      // below the horizon the analytic model has nothing useful to say
      aegisSky = mix( aegisSky, uHazeColor * 0.7, smoothstep( 0.0, -0.05, direction.y ) );

      // Desaturating shoulder. Without it the aureole clips to paper white,
      // bloom smears that band across the frame and the ranges disappear.
      float aegisLum = max( dot( aegisSky, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-5 );
      float aegisOver = max( aegisLum - uSkyKnee, 0.0 );
      float aegisSpan = max( uSkyCeil - uSkyKnee, 1e-4 );
      float aegisRolled = uSkyKnee + aegisSpan * ( 1.0 - exp( - aegisOver / aegisSpan ) );
      aegisSky *= mix( 1.0, aegisRolled / aegisLum, step( uSkyKnee, aegisLum ) );

      // the shoulder only touches luminance, and ACES will desaturate the
      // result again downstream, so push the chroma back out a little
      aegisSky = max( mix( vec3( dot( aegisSky, vec3( 0.2126, 0.7152, 0.0722 ) ) ), aegisSky, uSkySat ), 0.0 );

      // the disc and its tight aureole ride above the shoulder so they are the
      // only things in frame that bloom
      float aegisAur = pow( clamp( cosTheta, 0.0, 1.0 ), uAureolePower );
      float aegisAurWide = pow( clamp( cosTheta, 0.0, 1.0 ), uAureolePower * 0.06 );
      aegisSky += uHorizonTint * uAureole * ( aegisAur * 1.0 + aegisAurWide * 0.16 );
      aegisSky += L0 * 0.04 * uSunDisc;

      // The raw solar disc is ~1e6 in these units. A half-float composer target
      // tops out at 65504, and overflowing it turns the sun into a NaN hole in
      // the middle of the frame. Everything past ~8 tone maps to white anyway.
      gl_FragColor = vec4( clamp( aegisSky, 0.0, 24.0 ), 1.0 );
`;

function makeSkyDome(scale) {
  const sky = new Sky();
  sky.scale.setScalar(scale);
  const m = sky.material;
  Object.assign(m.uniforms, SKY_UNIFORM_DEFAULTS());
  m.uniforms.up.value.set(0, 1, 0);
  m.uniforms.cloudCoverage.value = 0;
  m.uniforms.cloudDensity.value = 0;

  const before = m.fragmentShader;
  m.fragmentShader = before
    .replace('void main() {', `${SKY_HELPERS}\nvoid main() {`)
    .replace(
      '( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 )',
      'Lin * 0.04 + vec3( 0.0, 0.0003, 0.00075 )',
    )
    .replace('gl_FragColor = vec4( texColor, 1.0 );', SKY_GRADE);
  if (m.fragmentShader === before) {
    console.warn('weather: sky shader patch did not apply');
  }
  m.needsUpdate = true;
  return sky;
}

/** Unit vector for an elevation/azimuth pair in degrees. */
function dirFrom(elevationDeg, azimuthDeg, out = new THREE.Vector3()) {
  return out.setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - elevationDeg),
    THREE.MathUtils.degToRad(azimuthDeg),
  );
}

export class Weather {
  constructor(scene, renderer, rng) {
    this.scene = scene;
    this.renderer = renderer;
    this.rng = rng;
    this.current = CONDITIONS.day;

    installAerialPerspective();
    this.fogUniforms = fogUniforms;

    this.sky = makeSkyDome(200000);
    scene.add(this.sky);

    this.sunPosition = new THREE.Vector3();
    this.moonDirection = new THREE.Vector3(0, 1, 0);
    this.keyDirection = new THREE.Vector3(0, 1, 0);

    this.sun = new THREE.DirectionalLight(0xfff3df, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    // The frustum is a straight trade of crispness against how far shadows
    // survive from the player. 78 m covers the working apron either side of
    // the player at ~76 mm/texel on the high preset; the texel snapping in
    // followPlayer() is what stops the map crawling as you walk.
    this.shadowExtent = 78;
    this.shadowDistance = 300;
    const cam = this.sun.shadow.camera;
    cam.near = 1;
    cam.far = 640;
    cam.left = -this.shadowExtent;
    cam.right = this.shadowExtent;
    cam.top = this.shadowExtent;
    cam.bottom = -this.shadowExtent;
    // A depth bias of -6e-4 over a 640 m ortho range is 0.38 m of offset,
    // which is what produced the detached contact shadows. Almost all of the
    // work is handed to normalBias instead, which is expressed in metres and
    // does not float the shadow off the caster.
    this.sun.shadow.bias = -0.00012;
    this.sun.shadow.normalBias = 0.055;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbcd6f2, 0xa08a63, 0.6);
    scene.add(this.hemi);

    // a soft fill from the opposite side keeps launcher detail readable
    this.fill = new THREE.DirectionalLight(0x9fb6d0, 0.35);
    this.fill.position.set(-60, 40, 60);
    scene.add(this.fill);

    this.scene.fog = new THREE.FogExp2(0xbcb39c, 0.000072);

    this._buildStars();
    this._buildMoon();

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.envScene = new THREE.Scene();
    this.envSky = makeSkyDome(20000);
    this.envScene.add(this.envSky);
    this.envRT = null;

    this.transition = null;
    this._shadowBasis = {
      x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(),
      centre: new THREE.Vector3(),
    };
    this._skyAnchor = new THREE.Vector3();

    this._apply(CONDITIONS.day);
  }

  // ------------------------------------------------------------------ stars

  _buildStars() {
    const COUNT = 3200;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const attrs = new Float32Array(COUNT * 2); // size, twinkle phase
    const R = 120000;
    for (let i = 0; i < COUNT; i++) {
      // upper hemisphere, slightly denser low down so the dome does not read
      // as a bald patch overhead
      const u = this.rng.float();
      const v = Math.pow(this.rng.float(), 0.8);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(1 - v);
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      pos[i * 3] = x * R;
      pos[i * 3 + 1] = Math.abs(y) * R * 0.92 + 900;
      pos[i * 3 + 2] = z * R;
      // magnitude distribution: mostly faint pinpricks, a handful of anchors
      const b = 0.16 + Math.pow(this.rng.float(), 3.4) * 0.92;
      const warm = this.rng.float();
      col[i * 3] = b * (0.80 + warm * 0.22);
      col[i * 3 + 1] = b * (0.86 + warm * 0.10);
      col[i * 3 + 2] = b * (1.02 - warm * 0.16);
      // 1.0-2.6 device pixels; anything larger reads as confetti
      attrs[i * 2] = 1.0 + Math.pow(b, 2.0) * 1.6;
      attrs[i * 2 + 1] = this.rng.float() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aStar', new THREE.BufferAttribute(attrs, 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uMotion: { value: 1 },
      },
      vertexShader: /* glsl */`
        attribute vec2 aStar;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uMotion;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aStar.x * uPixelRatio;
          // scintillation is an atmospheric effect, so it is strongest for
          // stars low on the dome and dies out overhead
          float elev = clamp( normalize( position ).y, 0.0, 1.0 );
          float amp = mix( 0.34, 0.06, elev ) * uMotion;
          float ph = aStar.y;
          vTwinkle = 1.0 - amp * ( 0.5 + 0.5 * sin( uTime * ( 1.6 + fract( ph ) * 3.4 ) + ph * 6.283 ) )
            * ( 0.6 + 0.4 * sin( uTime * 0.71 + ph * 2.1 ) );
          // extinction: nothing is visible in the last couple of degrees
          vTwinkle *= smoothstep( 0.01, 0.10, elev );
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uOpacity;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r2 = dot( d, d );
          float a = exp( - r2 * 26.0 );
          gl_FragColor = vec4( vColor * vTwinkle, a * uOpacity );
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      fog: false,
    });
    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -1;
    this.scene.add(this.stars);
  }

  // ------------------------------------------------------------------- moon

  _buildMoon() {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, fog: false, toneMapped: false }),
    );
    // maria plus limb darkening so it is not a flat white dot
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(80, 80, 0, 80, 80, 80);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.72, '#f2f4f8');
    grd.addColorStop(0.94, '#d8dee8');
    grd.addColorStop(1, '#aab4c4');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(80, 80, 80, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 34; i++) {
      const x = 24 + this.rng.float() * 112;
      const y = 24 + this.rng.float() * 112;
      if (Math.hypot(x - 80, y - 80) > 68) continue;
      ctx.fillStyle = `rgba(176,186,204,${0.08 + this.rng.float() * 0.26})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + this.rng.float() * 15, 0, Math.PI * 2);
      ctx.fill();
    }
    // a few bright rays out of the youngest crater
    for (let i = 0; i < 9; i++) {
      const a = this.rng.float() * Math.PI * 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + this.rng.float() * 0.08})`;
      ctx.lineWidth = 1 + this.rng.float() * 3;
      ctx.beginPath();
      ctx.moveTo(96, 58);
      ctx.lineTo(96 + Math.cos(a) * 58, 58 + Math.sin(a) * 58);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    disc.material.map = tex;
    // the composer tone maps at the end of the chain, so the disc needs to sit
    // above 1.0 in linear terms to still read as a bright moon afterwards -
    // but not so far above that ACES flattens the maria into a white sticker
    disc.material.color.setRGB(1.55, 1.55, 1.65);
    disc.scale.setScalar(950);
    g.add(disc);

    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshBasicMaterial({
        color: 0x8ea8d4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, fog: false, toneMapped: false,
      }),
    );
    // a soft alpha ramp reads as a lens veil rather than a hard disc
    const hc = document.createElement('canvas');
    hc.width = hc.height = 128;
    const hctx = hc.getContext('2d');
    const hgrd = hctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    hgrd.addColorStop(0, 'rgba(255,255,255,0.85)');
    hgrd.addColorStop(0.18, 'rgba(255,255,255,0.30)');
    hgrd.addColorStop(0.45, 'rgba(255,255,255,0.09)');
    hgrd.addColorStop(1, 'rgba(255,255,255,0)');
    hctx.fillStyle = hgrd;
    hctx.fillRect(0, 0, 128, 128);
    const htex = new THREE.CanvasTexture(hc);
    htex.colorSpace = THREE.SRGBColorSpace;
    halo.material.map = htex;
    halo.scale.setScalar(5200);
    halo.position.z = -20;
    g.add(halo);

    this.moon = g;
    this.moonDisc = disc;
    this.moonHalo = halo;
    this.moon.renderOrder = -1;
    this.scene.add(g);
  }

  // -------------------------------------------------------------- conditions

  /** Apply a condition preset. `blend` seconds > 0 cross-fades the lighting. */
  setCondition(id, blend = 0) {
    const target = CONDITIONS[id] || CONDITIONS.day;
    if (blend > 0 && this.current !== target) {
      this.transition = { from: { ...this.current }, to: target, t: 0, dur: blend };
    } else {
      this.transition = null;
      this._apply(target);
    }
    this.current = target;
    this._updateEnvironment(target);
    return target;
  }

  _blend(from, to, e) {
    const out = {};
    const tmpA = this._blendA || (this._blendA = new THREE.Color());
    const tmpB = this._blendB || (this._blendB = new THREE.Color());
    for (const key of Object.keys(to)) {
      const a = from[key];
      const b = to[key];
      if (COLOUR_KEYS.has(key) && typeof a === 'number' && typeof b === 'number') {
        tmpA.set(a);
        tmpB.set(b);
        out[key] = tmpA.lerp(tmpB, e).getHex();
      } else if (typeof a === 'number' && typeof b === 'number') {
        out[key] = a + (b - a) * e;
      } else {
        out[key] = b;
      }
    }
    out.id = to.id;
    return out;
  }

  _applySkyUniforms(u, c) {
    u.turbidity.value = c.turbidity;
    u.rayleigh.value = c.rayleigh;
    u.mieCoefficient.value = c.mieCoefficient;
    u.mieDirectionalG.value = c.mieDirectionalG;
    u.sunPosition.value.copy(this.sunPosition);
    u.uSkyGain.value = c.skyGain;
    u.uSkyKnee.value = c.skyKnee;
    u.uSkyCeil.value = c.skyCeil;
    u.uSkySat.value = c.skySat ?? 1;
    u.uZenithTint.value.set(c.zenithTint);
    u.uHorizonTint.value.set(c.horizonTint);
    u.uTintPower.value = c.tintPower;
    u.uHazeColor.value.set(c.hazeColor);
    u.uHazeStrength.value = c.hazeStrength;
    u.uHazeSpan.value = c.hazeSpan;
    u.uHazeFalloff.value = c.hazeFalloff;
    u.uHazeSunGain.value = c.hazeSunGain;
    u.uSunDisc.value = c.sunDisc;
    u.uAureole.value = c.aureole;
    u.uAureolePower.value = c.aureolePower;
    u.uNightSky.value = c.nightSky;
    u.uNightZenith.value.set(c.nightZenith);
    u.uNightHorizon.value.set(c.nightHorizon);
    u.uMoonGlow.value.set(c.moonGlow);
    u.uMoonDir.value.copy(this.moonDirection);
    u.uMilkyWay.value = c.milkyWay;
    u.uMilkyColor.value.set(c.milkyColor);
  }

  _apply(c) {
    dirFrom(c.sunElevation, c.sunAzimuth, this.sunPosition);
    dirFrom(c.keyElevation, c.keyAzimuth, this.moonDirection);
    this._applySkyUniforms(this.sky.material.uniforms, c);

    const night = c.id === 'night';
    // at night the moon is the key light; everything else follows the sun
    this.keyDirection.copy(night ? this.moonDirection : this.sunPosition);

    this.sun.position.copy(this.keyDirection).multiplyScalar(this.shadowDistance);
    this.sun.color.set(c.sunColor);
    this.sun.intensity = c.sunIntensity;
    this.hemi.color.set(c.ambientSky);
    this.hemi.groundColor.set(c.ambientGround);
    this.hemi.intensity = c.ambientIntensity;
    this.fill.intensity = c.fillIntensity;
    this.fill.color.set(c.fillColor);
    // put the fill opposite the key so it reads as bounce, not a second sun
    this.fill.position.set(
      -this.keyDirection.x * 120 + 10,
      Math.max(40, this.keyDirection.y * 60 + 40),
      -this.keyDirection.z * 120 + 10,
    );

    this.scene.fog.color.set(c.fogColor);
    this.scene.fog.density = c.fogDensity;
    fogUniforms.uFogHigh.value.set(c.fogHigh);
    fogUniforms.uFogInscatter.value.set(c.fogInscatter);
    fogUniforms.uFogKeyDir.value.copy(this.sunPosition);
    fogUniforms.uFogHeight.value = c.fogHeight;
    fogUniforms.uFogSpan.value = c.fogSpan;

    this.renderer.toneMappingExposure = c.exposure;

    this.stars.material.uniforms.uOpacity.value = c.stars;
    this.stars.visible = c.stars > 0.001;
    this.moonDisc.material.opacity = c.moonOpacity;
    this.moonHalo.material.opacity = c.moonOpacity * 0.55;
    this.moon.visible = c.moonOpacity > 0.001;
    this._placeMoon();

    this.applied = c;
  }

  _placeMoon() {
    const anchor = this._skyAnchor;
    this.moon.position.copy(this.moonDirection).multiplyScalar(90000);
    this.moon.position.x += anchor.x;
    this.moon.position.z += anchor.z;
    this.moon.lookAt(anchor.x, 0, anchor.z);
  }

  _updateEnvironment(c) {
    const u = this.envSky.material.uniforms;
    this._applySkyUniforms(u, c);
    if (u.showSunDisc) u.showSunDisc.value = 0;
    if (this.envRT) this.envRT.dispose();
    try {
      this.envRT = this.pmrem.fromScene(this.envScene, 0.04);
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = c.envIntensity ?? 0.34;
    } catch (e) {
      // environment reflections are a nicety; never let them break the frame
      this.scene.environment = null;
    }
  }

  // ----------------------------------------------------------------- shadows

  /**
   * Keep the shadow frustum tight around the player for crisp contact shadows.
   * The centre is snapped to whole shadow-map texels in the light's own basis,
   * otherwise the map resamples every frame and every shadow edge crawls while
   * the player walks.
   */
  followPlayer(pos) {
    const b = this._shadowBasis;
    const z = b.z.copy(this.keyDirection).normalize();
    // matches Object3D.lookAt with the default (0, 1, 0) up, which is what the
    // renderer uses to orient the shadow camera
    b.x.set(z.z, 0, -z.x);
    if (b.x.lengthSq() < 1e-8) b.x.set(1, 0, 0);
    b.x.normalize();
    b.y.crossVectors(z, b.x);

    const texel = (this.shadowExtent * 2) / Math.max(1, this.sun.shadow.mapSize.x);
    const c = b.centre.set(pos.x, 0, pos.z);
    const u = Math.round(c.dot(b.x) / texel) * texel;
    const v = Math.round(c.dot(b.y) / texel) * texel;
    const w = c.dot(z);
    c.set(0, 0, 0)
      .addScaledVector(b.x, u)
      .addScaledVector(b.y, v)
      .addScaledVector(z, w);

    this.sun.target.position.copy(c);
    this.sun.target.updateMatrixWorld();
    this.sun.position.copy(c).addScaledVector(z, this.shadowDistance);
  }

  // ------------------------------------------------------------------ update

  update(dt, elapsed, playerPos) {
    const su = this.stars.material.uniforms;
    su.uTime.value = elapsed;
    su.uPixelRatio.value = this.renderer.getPixelRatio();

    if (this.transition) {
      const tr = this.transition;
      tr.t += dt;
      const k = Math.min(1, tr.t / tr.dur);
      const e = k * k * (3 - 2 * k);
      this._apply(this._blend(tr.from, tr.to, e));
      if (k >= 1) this.transition = null;
    }
    if (playerPos) {
      this._skyAnchor.set(playerPos.x, 0, playerPos.z);
      this.sky.position.copy(this._skyAnchor);
      this.stars.position.copy(this._skyAnchor);
      this._placeMoon();
      this.followPlayer(playerPos);
    }
  }

  /** Reduced motion freezes star scintillation along with everything else. */
  setReducedMotion(on) {
    this.stars.material.uniforms.uMotion.value = on ? 0 : 1;
  }

  get sunDirection() {
    return this.sunPosition;
  }
}
