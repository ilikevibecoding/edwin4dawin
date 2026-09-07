import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, SUN } from './palette.js';
import { boxUV } from './lib/geo.js';
import { clamp, fbm, lerp, mulberry32, ridged, smoothstep } from './textures/core.js';
import { WORLD, anchorPoint } from './world.js';
import {
  acaciaAtlas,
  atlasTile,
  barkMaps,
  deadWoodMaps,
  earthMaps,
  endGrainMaps,
  farGroundMaps,
  foliageDetail,
  forbAtlas,
  grassSwathAtlas,
  groundLitterAtlas,
  logBarkMaps,
  rockMaps,
  savannaBillboardAtlas,
  savannaGrassAtlas,
  scrubAtlas,
  setFoliageDetail,
  treelineTexture,
} from './textures/nature.js';

// ---------------------------------------------------------------------------
// The savanna.
//
// Grassland with trees in it, not forest with gaps. Three depth bands, because
// a single one either reads as sparse or costs too much: hand-built geometry
// trees along the road corridor, painted whole-tree billboards scattered out to
// the terrain edge, and a ring of horizon plain plus a ground skirt that hides
// where the world stops. Under all of it, the grass: tufts near the lens, wide
// swath cards at mid range, and a straw-coloured far ground that the horizon
// trees stand on.
//
// Foliage cards are bowed, get canopy-shell normals rather than their own flat
// quad normals, and pick one of four species tiles out of a shared atlas, so a
// card is hard to isolate by eye and the whole savanna is still a few dozen
// draw calls.
// ---------------------------------------------------------------------------

const _m4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _euler = new THREE.Euler();
const _nrm = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _spin = new THREE.Quaternion();
const _col = new THREE.Color();
const _cen = new THREE.Vector3();
const _hsl = { h: 0, s: 0, l: 0 };

const SUN_DIR = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(90 - SUN.elevation),
  THREE.MathUtils.degToRad(SUN.azimuth),
);

// THREE.Color(hex) already reads a hex as sRGB and stores linear under colour
// management, so this is a scale, not a second conversion: the old
// `.convertSRGBToLinear()` on top put every haze target here a decade darker
// than its hex said, which is why the mid-distance trunks were black bars
// whatever colour they were given.
const linear = (hex, mul = 1) => new THREE.Color(hex).multiplyScalar(mul);
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];

// ---------------------------------------------------------------------------
// Quality tiers
//
// `high` is the shipped look. `fast` exists so the software-rasterised capture
// harness completes a frame this decade, and gives up prototype count and the
// per-fragment detail budget to do it — but not layout: every judgement about
// this savanna is made from a `fast` capture, so a `fast` frame has to be laid
// out like a `high` frame or the whole loop lies. `ultra` is aimed at a discrete
// card that finishes a `high` frame with most of its budget unspent.
//
// None of this can be measured from here — this box rasterises in software, so
// a frame time measured on it says nothing about a GPU. The `ultra` numbers are
// a reasoned budget rather than a measurement, and the reasoning is:
//
//  - Vertices are cheap. `high` draws about 2.5 M triangles for the whole
//    scene, most of it grass cards; a discrete card set up for 60 fps at 1440p
//    processes twenty times that without noticing, so tuft counts, prototype
//    counts and crown-card counts can all go up several times over.
//  - Fill is not cheap. Alpha-tested grass near the lens is the one thing that
//    can run out of budget, and `ultra` renders at pixelRatio 2. So the extra
//    density is spent on *more, smaller* tufts over the same screen area rather
//    than on bigger ones, and the reach of the cover is extended outward —
//    where it costs vertices, not fill.
//  - The distance cull pays for the density: at `high` and `ultra` the scatter
//    is bucketed spatially and only the buckets in front of the camera are
//    drawn, which takes the ground cover from every tuft on the map to about a
//    fifth of them.
//  - Texture memory at 1.5x cells is around 120 MB resident for the foliage
//    atlases. That assumes a 4 GB card or better.
//
// Every road-keyed band here is bounded by `terrain.roadDistance`, which
// returns a sentinel rather than a distance once a point is more than about
// 78 m from the corridor. Nothing keyed off it can reach past that; the swath
// grass and the billboard trees are placed over the whole map for exactly that
// reason.
// ---------------------------------------------------------------------------
const QUALITY = {
  fast: {
    atlas: 1.0,
    aniso: 4,
    // Per-fragment extras, pure GPU cost with no geometry. The one dial where
    // the tiers differ in *kind*: a tier that shades the same leaf a different
    // colour is a second look, not a lower setting, so `high` and `ultra`
    // share a value and `fast` gives up only the bump (six trig calls).
    bump: 0,
    // Kept even here: the stock GGX highlight is patched out of this material
    // and this is the only specular a leaf or a straw has.
    sheen: 0.018,
    // geometry trees to this distance from the corridor, ground cover to this
    nearBand: 44,
    ugReach: 56,
    ugCell: 2.0,
    ug: 1.0,
    // mid-distance grass swaths: one crossed card per cell over the whole map.
    // Matched to `high`: the swath is what the plain past twenty metres is
    // made of, and at 5.2 the `fast` frames — the judged ones — showed a
    // thinner plain than the shipped tier's.
    swathCell: 4.4,
    // Spatial buckets per axis for the ground cover. This was 1 here on the
    // theory that draw calls are what the software rasteriser pays for; the
    // round-1 census measured the opposite (perf/census-r1.md, win 4): one
    // InstancedMesh per species is never culled, so every view drew all
    // 414 k instanced triangles when 31-151 k were in the frustum. A 4x4 grid
    // costs at most fifteen extra calls per prototype and the frustum test
    // drops most of them.
    buckets: 4,
    // extra prototype seeds per tree species
    dup: 0,
    crownCards: 0.85,
    midBand: 0,
    midDetail: 0.4,
  },
  high: {
    atlas: 1.0,
    aniso: 4,
    bump: 0.07,
    // A leaf cuticle reflects a few per cent, not a third, and this is
    // multiplied by the light colour — around 3 in linear for the key and an
    // order of magnitude more for a headlamp a metre away.
    sheen: 0.018,
    nearBand: 44,
    ugReach: 56,
    ugCell: 2.0,
    ug: 1.0,
    swathCell: 4.4,
    // Four buckets per axis: a camera with a 50 degree lens sees five or six
    // of the sixteen, so the ground cover behind and beside it is never
    // submitted. Costs draw calls (a prototype becomes up to sixteen meshes),
    // which a discrete card does not notice and the software rasteriser does,
    // hence one bucket at `fast`.
    buckets: 4,
    // One extra seed per species, the cheapest thing on this table: the trees
    // are instanced, so a second silhouette costs one draw call and one copy
    // of a crown's geometry, and nothing per frame.
    dup: 1,
    crownCards: 1.0,
    midBand: 0,
    midDetail: 0.4,
  },
  ultra: {
    atlas: 1.5,
    aniso: 16,
    // matched to `high` on purpose — see the note there
    bump: 0.07,
    sheen: 0.018,
    nearBand: 52,
    ugReach: 76,
    ugCell: 1.6,
    // Ground-cover density relative to `high`, grid-compensated below: a
    // quarter more plants per square metre, over a band a third wider, placed
    // on a grid 60% finer. Reach and placement resolution rather than
    // thickness — the verge at `high` is already dense enough that another
    // layer of cards is fill rate spent on straws behind straws.
    ug: 1.25,
    swathCell: 3.2,
    buckets: 5,
    dup: 2,
    crownCards: 1.5,
    midBand: 78,
    midDetail: 0.36,
  },
};

// ---------------------------------------------------------------------------
// Shader plumbing
// ---------------------------------------------------------------------------

// One bearing for the whole forest, shared by every wind material so a gust
// crossing the stand crosses the undergrowth under it at the same moment.
const WIND_DIR = new THREE.Vector2(0.82, 0.57).normalize();

/**
 * Wind sway driven by a per-vertex weight attribute plus per-instance phase.
 *
 * Three things the old version did not have, in the order they show up:
 *
 *  - **A gust front.** Phase used to advance only with a per-instance hash, so
 *    the whole forest breathed at one frequency with no spatial structure; a
 *    stand either agreed with its neighbour or did not, at random. Advancing
 *    phase along the wind bearing makes the gust a wave that arrives at the far
 *    trees first and sweeps through, which is the single most legible thing
 *    wind does at this scale.
 *  - **Shelter.** Amplitude varies over a ~25 m field, so a hollow stays calm
 *    while the ridge above it works. Sampled from the instance origin, so it
 *    costs two sines in the vertex shader and no attribute.
 *  - **Tip flutter.** A high-frequency term cubed against the wind weight, so
 *    it exists only at the very ends of a frond or a spray. The sway alone
 *    moves a plant as a rigid fan; the flutter is what makes the tips look
 *    light.
 */
function applyWind(material, { amplitude = 0.16, speed = 1.0, flutter = 1.0 } = {}) {
  material.userData.wind = {
    uTime: { value: 0 },
    uAmp: { value: amplitude },
    uSpeed: { value: speed },
    uFlutter: { value: flutter },
    uWindDir: { value: WIND_DIR },
  };
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader) => {
    if (prev) prev(shader);
    Object.assign(shader.uniforms, material.userData.wind);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aWind;
        uniform float uTime;
        uniform float uAmp;
        uniform float uSpeed;
        uniform float uFlutter;
        uniform vec2 uWindDir;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 iOrigin = instanceMatrix[ 3 ].xyz;
          float iTall = length( instanceMatrix[ 1 ].xyz );
        #else
          vec3 iOrigin = vec3( 0.0 );
          float iTall = 1.0;
        #endif
        float ph = iOrigin.x * 0.35 + iOrigin.z * 0.27;
        // gust front travelling along the bearing at roughly 9 m/s
        float front = dot( iOrigin.xz, uWindDir ) * 0.11;
        float gustT = sin( uTime * 0.34 * uSpeed - front ) * 0.5 + 0.5;
        float gust = 0.55 + 1.15 * gustT * gustT;
        // shelter, at about a 25 m wavelength; the taller the instance the more
        // of it stands above whatever is sheltering it
        float shelter = ( 0.72 + 0.34 * sin( iOrigin.x * 0.043 + 2.1 ) * sin( iOrigin.z * 0.037 - 1.4 ) ) * ( 0.82 + 0.24 * iTall );
        float amp = uAmp * gust * shelter;
        float sway = sin( uTime * 1.05 * uSpeed + ph ) * 0.72 + sin( uTime * 2.7 * uSpeed + ph * 2.3 ) * 0.28;
        float lateral = cos( uTime * 0.83 * uSpeed + ph * 1.3 ) * 0.45;
        float tip = aWind * aWind * aWind * uFlutter;
        float flick = sin( uTime * 6.1 * uSpeed + ph * 5.3 + transformed.y * 1.9 ) * 0.3 * tip;
        vec2 off = uWindDir * ( sway * aWind + flick ) + vec2( -uWindDir.y, uWindDir.x ) * ( lateral * aWind + flick * 0.6 );
        transformed.xz += off * amp;
        transformed.y -= abs( sway ) * aWind * amp * 0.16;`,
      );
  };
  // Content-addressed, not per material. Keying on the uuid gave every one of
  // the twenty-odd wind materials its own compiled program for identical source,
  // which at `ultra` is most of a minute of shader compilation on boot.
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => 'wind|' + (prevKey ? prevKey.call(material) : material.type);
  return material;
}

/** Tag geometry with a wind weight; 0 = rigid, 1 = whips around. */
function windWeight(geo, fn) {
  const pos = geo.attributes.position;
  const w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) w[i] = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
  geo.setAttribute('aWind', new THREE.BufferAttribute(w, 1));
  return geo;
}

/**
 * Tag geometry with how buried a vertex is in the plant's own mass: 0 on the
 * lit rim of a crown, 1 deep inside it. A cutout card has no geometric
 * occlusion to find, so this is the only thing that can stop a crown reading
 * as one flat value, and the shader uses it to pull the sky term down toward
 * the interior. The sense is deliberately "how dark", not "how open", so a
 * geometry that forgets the attribute reads 0 and goes bright rather than black.
 */
function shadeWeight(geo, fn) {
  const pos = geo.attributes.position;
  const bias = geo.attributes.aBias;
  const w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    w[i] = clamp(fn(pos.getX(i), pos.getY(i), pos.getZ(i)) + (bias ? bias.getX(i) : 0));
  }
  geo.setAttribute('aShade', new THREE.BufferAttribute(w, 1));
  if (bias) geo.deleteAttribute('aBias');
  // every foliage geometry passes through here, so this is where a geometry
  // with no root (a crown, a billboard, a litter card) gets its explicit zero
  // rather than whatever the disabled attribute slot happens to hold
  if (!geo.attributes.aRoot) geo.setAttribute('aRoot', new THREE.BufferAttribute(new Float32Array(pos.count), 1));
  // 0.5 is the gradient's neutral point, so a geometry that never set one is
  // left alone by the crown split rather than treated as all underside
  if (!geo.attributes.aCrown) geo.setAttribute('aCrown', new THREE.BufferAttribute(new Float32Array(pos.count).fill(0.5), 1));
  return geo;
}

/**
 * Where a vertex sits in its crown, 0 at the underside and 1 at the top, for
 * the top-lit / under-shaded split in the foliage shader. Independent of
 * `aShade`: buried-ness is about the rim against the interior, this is about
 * the sky against the ground, and a rim card at the bottom of the lens is open
 * but still in the underside.
 */
function crownWeight(geo, fn) {
  const pos = geo.attributes.position;
  const w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) w[i] = clamp(fn(pos.getX(i), pos.getY(i), pos.getZ(i)));
  geo.setAttribute('aCrown', new THREE.BufferAttribute(w, 1));
  return geo;
}

/**
 * Give every card in one crown a shade value of its own, before they are merged.
 *
 * `shadeWeight` is a pure function of world position, so two cards crossing at
 * the same point get the same weight to four decimal places and a crown arrives
 * as a smooth radial ramp with noise on it. That is fine up close, where the eye
 * reads the fringed rim of the near card against whatever is behind it. At
 * 10-30 m the fringe is sub-pixel and all that is left is one card's mean
 * against its neighbour's — and if those are equal the crown is one wash.
 * Measured: needleAtlas cell contrast falls only 30% over five mip levels, so
 * the *texture* is not what averages away. What is missing is card-to-card
 * separation, and a vertex attribute is the one thing minification cannot
 * touch: constant across the card, so it puts a hard value step at every card
 * boundary however small the card gets on screen.
 *
 * `keys` is one number per card, sampled from a low-frequency field at the
 * card's centre — not drawn per card at random. Random per card is worse than
 * nothing here: it makes every card a value island and so makes single cards
 * *more* identifiable, which is the actual complaint. A field means neighbouring
 * sprays agree and disagree in groups, so the smallest thing the eye can find is
 * a clump four or five cards across — and it is still hard-edged, because the
 * field is sampled once per card and never interpolated across one.
 */
function crownMosaic(cards, keys, amount) {
  const n = keys.length;
  if (!n) return cards;
  const mean = keys.reduce((a, b) => a + b, 0) / n;
  // Normalised per crown, not per card. Sampling a noise field over a volume only
  // a few wavelengths across gives each *tree* a different DC offset, so at any
  // real amplitude the stand separates into uniformly light and uniformly dark
  // trees and each crown is as flat as it ever was — which is exactly what a run
  // at 1.5 produced. Centring and scaling by the crown's own statistics spends
  // the whole range inside every crown instead.
  const sd = Math.sqrt(keys.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n) || 1;
  for (let i = 0; i < n; i++) {
    const z = clamp((keys[i] - mean) / (sd * 2), -1, 1);
    // pushed toward the ends of its range: the read we want is two populations,
    // sprays in the light and sprays behind them, not a continuum — a continuum
    // averages back to the same wash at any distance
    const bias = Math.sign(z) * Math.pow(Math.abs(z), 0.6) * amount * 0.5;
    const g = cards[i];
    const c = g.attributes.position.count;
    g.setAttribute('aBias', new THREE.BufferAttribute(new Float32Array(c).fill(bias), 1));
  }
  return cards;
}

/** Where a card sits, for `crownMosaic` to sample its field at. */
function cardCentre(geo) {
  geo.computeBoundingBox();
  return geo.boundingBox.getCenter(_cen);
}

/**
 * The field `crownMosaic` samples: a mosaic at about 1.3 m, which is four or
 * five sprays across and lands near fifty screen pixels at twenty metres. Small
 * enough that a crown three to six metres wide holds several of them — the
 * point is variation *inside* one tree — and large enough that the clump rather
 * than the card is the smallest thing the eye can pick out.
 */
function mosaicField(seed) {
  return (x, y, z) =>
    fbm(x * 0.75 + y * 0.42 + 19.3, z * 0.75 - y * 0.31 - 7.4, { octaves: 2, period: 5, seed: seed & 255 });
}

/**
 * Keep a cutout mesh out of the screen-space AO prepass.
 *
 * GTAOPass builds its depth and normal buffer with `scene.overrideMaterial` set
 * to a plain MeshNormalMaterial, which carries no map and no alphaTest — so
 * every leaf card is a *solid quad* as far as the AO is concerned. The result is
 * hard-edged near-black blades wherever cards overlap inside a crown, which is
 * the dark-sliver artifact: not a texture or lighting fault at all. Collapsing
 * the draw range for that one pass leaves the AO to the trunks, rocks and
 * ground, where its depth buffer is telling the truth. The baked `aShade`
 * occlusion covers the foliage instead, and unlike GTAO it knows which side of
 * a crown faces the light.
 */
function skipAoPrepass(mesh) {
  mesh.onBeforeRender = (renderer, scene, camera, geometry, material) => {
    if (material.isMeshNormalMaterial) geometry.setDrawRange(0, 0);
  };
  mesh.onAfterRender = (renderer, scene, camera, geometry, material) => {
    if (material.isMeshNormalMaterial) geometry.setDrawRange(0, Infinity);
  };
  return mesh;
}

// Skylight reaching a bole, as a straight multiplier on its albedo. Sized so a
// shaded trunk's sky-facing flank roughly doubles and its away flank is left
// alone: what a dark object needs at distance is a ratio between its two sides,
// not more light. Cool from above, warm off the duff, and both well under the
// foliage's equivalents because a trunk stands *under* the canopy that is
// intercepting the sky in the first place.
const BARK_SKY = new THREE.Color(0.66, 0.73, 0.82);
// warmer and stronger than the forest's duff: straw and red earth bounce
const BARK_GND = new THREE.Color(0.44, 0.38, 0.28);

/**
 * Trunk material. Bark gets moss blended in from a baked mask, weighted toward
 * the shaded side of the trunk and the wet first couple of metres, which is
 * what stops a tapered tube from reading as one flat brown value.
 *
 * `deadfall` re-keys both of those off the world normal instead of local height.
 * A log's geometry is a trunk rotated onto its side, so local y is the radius
 * and every one of the standing-trunk terms collapses to a constant over the
 * whole object: uniform moss, a flat 31% darkening from the trunk-foot ramp and
 * a flat 56% of the ambient. That is three separate reasons a log two metres
 * from the lens measured one value from end to end and read as a pipe. On its
 * side the thing that matters is which way a surface faces — moss on the upper
 * third, contact shade underneath.
 */
function barkMaterial(maps, { moss = 0x232318, mossMax = 0.9, mossHeight = 6.0, windAmp = 0.07, windSpeed = 0.6, normalScale = 1.4, deadfall = false, grainRepeat = 4.7, haze = 0.9, hazeK = 0.08, hazeK2 = 0.28, canopy = [0.62, 1.0], skyRim = 0.34 } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: maps.map,
    normalMap: maps.normal,
    roughnessMap: maps.rough,
    aoMap: maps.ao,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughness: 1,
    metalness: 0,
    // a bright sky through the env map is what turns a dark bark map into a pale
    // grey pole at 30 m, so the trunks take almost none of it
    envMapIntensity: 0.1,
  });
  const u = {
    uMossMask: { value: maps.mossMask },
    uMossColor: { value: linear(moss, 0.85) },
    uMossMax: { value: mossMax },
    uMossHeight: { value: mossHeight },
    uSunDir: { value: SUN_DIR },
    // Analytic skylight on the bole, and the reason a trunk past twenty-five
    // metres was a black bar. Everything else on this material is a multiplier
    // on an albedo that starts near 0.2 and an instance tint that takes another
    // two thirds off it, so a trunk standing in canopy shadow — which is every
    // trunk not in the landing — was reaching the eye lit only by a hemisphere
    // light and an environment probe held at a tenth. There was nothing in the
    // model that could give it a light side at all.
    //
    // Named `uSky` and `uGnd` deliberately: sky.js retunes those keys by name
    // across the whole scene, so the bole follows the hour without this file
    // knowing what hour it is.
    uSky: { value: BARK_SKY.clone() },
    uGnd: { value: BARK_GND.clone() },
    // How much of that reaches the foot of the trunk, where the canopy and the
    // undergrowth both close in.
    //
    // Savanna trees stand alone in open sun, so a bole's foot keeps most of
    // its sky; the forest's 0.34 was a closed stand's number, and with it the
    // trunks past twenty metres were black bars against bright grass. A dead
    // tree has no crown at all and keeps nearly everything.
    uCanopy: { value: new THREE.Vector2(canopy[0], canopy[1]) },
    // A warm lift on whichever flank faces the gap the sun comes down. Also a
    // retuned key, so it goes cold and weak at night.
    uRim: { value: new THREE.Color(0.05, 0.043, 0.03) },
    // Skylight on the bole as an *amount* rather than a fraction.
    //
    // Everything else on this material multiplies the albedo, and the albedo has
    // already been through a 0.3 instance tint before it gets here — so a bole
    // lands at about 0.015 linear and a light side worth twice a dark side is
    // 0.03 against 0.015, which is 13 against 5 on a 0-255 display and reads as
    // one flat black vertical. Measured that way: the trunk mask over the forest
    // view came back at a median 0.11 with a 10-90 spread of 0.05 to 0.21, and
    // killing every light in the scene moved it by 0.03. There is no ratio that
    // fixes that; the bole needs light put on it.
    //
    // Additive, tinted by the same uSky/uGnd pair so it follows the hour, and
    // gated on the canopy slot so it is the sunward flank that gets it. This is
    // what a photograph of a stand actually shows: the trunks are legible in the
    // shade because skylight grazes them, not because the key reaches them.
    uSkyRim: { value: skyRim },
    // The aerial ramp's target is the scene's own fog colour scaled down, not
    // a fixed hex. `uFog` is the key sky.js writes the hour's fog into on every
    // material that carries it, so a trunk at sixty metres fades toward the
    // dust it is seen through — warm grey at noon, orange at dusk, near-black
    // at night — and never toward a daytime constant that glows after dark.
    // Two scales: where the ramp starts (a trunk is much darker than the air)
    // and where it ends once it has saturated, so the 60-120 m timber is not
    // the same value as the 30 m timber. Bleached wood gets larger scales than
    // living bark, which is what lets a dead acacia read pale.
    uFog: { value: new THREE.Color(0.43, 0.41, 0.38) },
    uHazeK: { value: hazeK },
    uHazeK2: { value: hazeK2 },
    uHaze: { value: haze },
    uHazeNear: { value: 16 },
    uHazeFar: { value: 42 },
    // How many times the base tile the near-field grain runs at, and how far out
    // it survives. Trunk UVs are authored around/up at roughly 160 texels per
    // metre, which is a smooth pipe once a bole fills a third of the frame.
    uGrain: { value: grainRepeat },
    uGrainFade: { value: new THREE.Vector2(7.0, 26.0) },
  };
  m.userData.bark = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vTreeY;
        varying vec2 vBarkUv;
        varying vec3 vBarkWPos;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vTreeY = position.y;
        vBarkUv = uv;`,
      )
      .replace(
        '#include <project_vertex>',
        `#ifdef USE_INSTANCING
          vBarkWPos = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
        #else
          vBarkWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        #endif
        #include <project_vertex>`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uMossMask;
        uniform vec3 uMossColor;
        uniform float uMossMax;
        uniform float uMossHeight;
        uniform vec3 uSunDir;
        uniform vec3 uSky;
        uniform vec3 uGnd;
        uniform vec2 uCanopy;
        uniform vec3 uRim;
        uniform float uSkyRim;
        uniform vec3 uFog;
        uniform float uHazeK;
        uniform float uHazeK2;
        uniform float uHaze;
        uniform float uHazeNear;
        uniform float uHazeFar;
        uniform float uGrain;
        uniform vec2 uGrainFade;
        varying float vTreeY;
        varying vec2 vBarkUv;
        varying vec3 vBarkWPos;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // Second tier of the same relief at nearly five times the frequency,
          // faded out by ten metres. Nothing else in this material has a feature
          // smaller than a bark plate, and a surface with detail at one scale is
          // plastic however good its colour is — the third scale is the one that
          // says "wood" at arm's length.
          float gNear = uGrain * ( 1.0 - smoothstep( uGrainFade.x, uGrainFade.y, length( vBarkWPos - cameraPosition ) ) );
          if ( gNear > 0.01 ) {
            vec3 gN = texture2D( normalMap, vBarkUv * uGrain ).xyz * 2.0 - 1.0;
            // z is left at 1 so the added vector can never be short enough for
            // the normalize below to divide by nothing
            normal = normalize( normal + tbn * vec3( gN.xy * 0.9, 1.0 ) * ( 0.5 * min( gNear, 1.0 ) ) );
          }
        }`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `{
          vec3 wN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
          float shade = 1.0 - saturate( dot( wN, uSunDir ) * 0.5 + 0.5 );
          float mask = texture2D( uMossMask, vBarkUv ).g;
          ${
            deadfall
              ? `float up = smoothstep( 0.12, 0.88, wN.y );
          float moss = saturate( mask * uMossMax * up * ( 0.45 + 0.55 * shade ) );
          diffuseColor.rgb = mix( diffuseColor.rgb, uMossColor * ( 0.5 + mask * 0.9 ), moss );
          roughnessFactor = mix( roughnessFactor, 0.97, moss * 0.8 );
          // contact shade: the underside of a log lies in its own dark
          diffuseColor.rgb *= mix( 0.34, 1.0, smoothstep( -0.85, 0.1, wN.y ) );`
              : `float low = 1.0 - smoothstep( 0.4, uMossHeight, vTreeY );
          float moss = saturate( mask * uMossMax * low * ( 0.18 + 0.82 * shade ) );
          diffuseColor.rgb = mix( diffuseColor.rgb, uMossColor * ( 0.55 + mask * 0.85 ), moss );
          roughnessFactor = mix( roughnessFactor, 0.97, moss * 0.8 );
          diffuseColor.rgb *= mix( 1.0, 0.68, ( 1.0 - smoothstep( 0.0, 1.6, vTreeY ) ) * 0.9 );`
          }
          // A trunk is a cylinder in a room full of other trunks: the flank
          // facing away from the sun sees canopy, not sky. Without this the
          // shaded side takes its whole value off the environment and the near
          // bark reads as a pale grey pole with no round to it.
          //
          // Range widened from 0.36-0.83 to 0.24-0.98 at the same mean. Every
          // other term on this material is a multiplier — the instance tint runs
          // near 0.3, the environment is at a tenth — so the map's own four-to-one
          // value range arrives on screen compressed into a couple of per cent of
          // linear, and a bole measured one flat brown right across its width.
          // What a dark object needs is not to be lighter, it is to have a wider
          // ratio between its light side and its dark side.
          diffuseColor.rgb *= mix( 0.24, 0.98, saturate( dot( wN, uSunDir ) * 0.62 + 0.44 ) );
          // 1 cm albedo grain to match the second normal tier: the height field
          // read back through the AO map, which is the only channel with real
          // contrast in it.
          float gA = uGrain * ( 1.0 - smoothstep( uGrainFade.x, uGrainFade.y, length( vBarkWPos - cameraPosition ) ) );
          if ( gA > 0.01 ) {
            float gv = texture2D( aoMap, vBarkUv * uGrain ).r;
            diffuseColor.rgb *= mix( 1.0, 0.66 + gv * 0.62, min( gA, 1.0 ) );
          }
        }
        #include <lights_physical_fragment>`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        float barkLit = 0.5;
        {
          // Canopy occlusion on the bole. A trunk in a closed stand sees very
          // little sky, but the hemisphere light and the environment probe reach
          // it at full strength, which is what kept a lit bole measuring slightly
          // *brighter* than the crown behind it — the reverse of a photograph.
          // Least sky at the foot, where the undergrowth closes in as well.
          vec3 wNa = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
          ${
            deadfall
              ? `float open = mix( 0.34, 0.92, smoothstep( -0.4, 0.85, wNa.y ) );`
              : `float open = mix( uCanopy.x, uCanopy.y, smoothstep( 0.5, 8.0, vTreeY ) );`
          }
          reflectedLight.indirectDiffuse *= open;
          reflectedLight.indirectSpecular *= 0.7;

          // Skylight, aimed along the canopy gap.
          //
          // A trunk under a closed canopy gets almost nothing from directly
          // overhead — the crowns are in the way — and almost everything through
          // the same slot the sun comes down. So the flank facing the sun's
          // azimuth sees several times the sky the flank behind it does, and
          // that ratio is the whole of what gives a shaded bole a light side.
          // Without it the only variation left on a trunk at thirty metres was
          // a multiply on the albedo, which is a ratio of two numbers that are
          // both already near zero.
          vec2 sd = vec2( uSunDir.x, uSunDir.z );
          float sl = length( sd );
          vec2 sunAz = sl > 1e-4 ? sd / sl : vec2( 0.0, 1.0 );
          vec2 hz = vec2( wNa.x, wNa.z );
          float hl = length( hz );
          float az = hl > 1e-4 ? dot( hz / hl, sunAz ) : 0.0;
          barkLit = az * 0.5 + 0.5;
          float gap = 0.3 + 0.7 * barkLit * barkLit;
          vec3 amb = mix( uGnd, uSky, wNa.y * 0.5 + 0.5 );
          reflectedLight.indirectDiffuse += diffuseColor.rgb * amb * gap * open;
          // The albedo-independent half, and it grows with distance.
          //
          // Near bark is not the problem — a bole four metres away has enough
          // texture and enough size to read whatever its value is. The failure
          // is at twenty-five metres and out, where the trunk is four pixels
          // wide and every one of them is the same near-black. That is also
          // where in-scattered light genuinely lives, so ramping this in over
          // the same range both fixes the tell and models the right thing.
          //
          // Kept in the bark's own hue family by taking some of the albedo back
          // in, and squared on the canopy slot so it falls away round the back
          // of the trunk instead of flooding it evenly.
          // Mostly albedo-weighted rather than flat. A flat sky-coloured add is
          // how this first went wrong in the other direction: at a large enough
          // constant the far timber came out as grey-blue pipes, which is a
          // worse read than black because a black trunk at least belongs to the
          // forest. Weighting it by the bark keeps each bole's instance tint —
          // and a stand's tint spread is most of what says "trees" at four
          // pixels wide — while the small constant is what stops a trunk whose
          // albedo is near zero from staying at zero.
          float dK = 0.4 + 1.1 * smoothstep( 12.0, 55.0, length( vBarkWPos - cameraPosition ) );
          reflectedLight.indirectDiffuse +=
            amb * ( uSkyRim * dK * gap * gap * open ) * ( 0.08 + diffuseColor.rgb * 15.0 );
        }`,
      )
      .replace(
        '#include <fog_fragment>',
        `{
          // Same aerial ramp as the foliage. Bark is what a mid-distance trunk
          // shows most of, and unramped it takes its value straight off the fog,
          // which is brighter than the sky — hence the row of pale poles standing
          // in front of a darker forest at 60 to 120 m.
          //
          // Two targets, and a rim on the lit flank. A single dark target is
          // correct for the near timber and wrong past sixty metres, where it is
          // most of the pixel: every bole out there converged on the same
          // near-black and the stand lost its depth. The far target is lighter
          // and greyer, and the rim survives the ramp so a distant trunk keeps
          // the light side it was given above.
          float hd = length( vBarkWPos - cameraPosition );
          float aer = uHaze * ( 1.0 - exp( -max( hd - uHazeNear, 0.0 ) / uHazeFar ) );
          vec3 haze = uFog * mix( uHazeK, uHazeK2, aer ) + uRim * pow( barkLit, 3.0 );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, haze, aer );
        }
        #include <fog_fragment>`,
      );
  };
  m.customProgramCacheKey = () => (deadfall ? 'bark-deadfall-v1' : 'bark-standing-v1');
  return applyWind(m, { amplitude: windAmp, speed: windSpeed });
}

// Open-shade illumination for foliage, expressed as a straight multiplier on
// albedo so it can be aimed at a value rather than derived.
//
// Physically this sun makes skylight roughly a sixth of direct, which lands a
// 0.09-albedo leaf at about 0.02 linear — a black cutout, which is exactly what
// the forest was doing. A photograph of foliage in open shade is a legible mid
// green, so the sky term runs about six times physical and carries the cool
// green-cyan cast that reads as "in shadow" rather than "underexposed". The
// ground half is the warm bounce off the needle litter.
// The ground half used to be a hue-45 orange at (0.46, 0.40, 0.22). Needle
// litter does bounce warm, but this was sized against a scene hemisphere light
// whose sky half was a saturated blue, and with that gone to near-neutral there
// is nothing left to cancel it — so it, not the albedo, was setting the hue of
// every downward-facing card in the canopy.
const FOLIAGE_SKY = new THREE.Color(0.94, 1.2, 1.3);
const FOLIAGE_GND = new THREE.Color(0.34, 0.34, 0.28);

// The day rig the sky term above was sized against, as luma, so the shader can
// compare it with the lights actually in the scene. The hemisphere's day sky
// colour and intensity are sky.js's (MODES.day.hemi: 0x93a9c2 at 0.5 over
// PALETTE.bounce); the key is the palette's sun. If the lighting rig moves the
// day hemisphere the foliage follows it, which is the intended behaviour.
const luma = (c) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
const HEMI_REF = 0.5 * luma(new THREE.Color(0x93a9c2).add(new THREE.Color(PALETTE.bounce))) * 0.5;
const KEY_REF = SUN.intensity * luma(new THREE.Color(PALETTE.sunColor));

/**
 * Wrapped diffuse, patched into the physical BRDF itself.
 *
 * `onBeforeCompile` hands over the shader *before* `#include` resolution, so a
 * replace aimed at a line inside a chunk silently matches nothing — the uniforms
 * still compile, still take values, and do nothing at all. The chunk has to be
 * expanded by hand and substituted for its own include directive.
 *
 * Clamping at the terminator is what produced the black cards: a leaf card's
 * shell normal is a fiction, so a card whose normal happened to face away from
 * the sun got zero direct light and fell back on a fill term near zero.
 */
const WRAP_TARGETS = [
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
  'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );',
  // The stock dielectric highlight, deleted rather than scaled.
  //
  // This was the single largest term on the canopy and nobody had looked at it,
  // because it is not in this file — it arrives inside the chunk. A leaf albedo
  // is about 0.03 linear; a rough-GGX lobe off a 4% white Fresnel under a key of
  // intensity 3 returns about 0.014, so between a third and a half of every lit
  // crown pixel was the *light's own colour* rather than the leaf's. Ablating it
  // moved the median hue of the `forest` frame from 72 degrees — a khaki — to
  // 129, and the crown cards measured on their own now sit at 120 against an
  // atlas painted at 90-120. Nothing reachable from this file could have done
  // that: the albedo, the ambient and the aerial ramp were all being added to a
  // term the size of the pixel that carried the key light's hue.
  //
  // Nothing is lost: a waxy leaf highlight is a real thing and `uSheen` below is
  // it, written as a tight normalised lobe that is bounded, gated on the crown
  // occlusion and tinted by the light rather than replacing the leaf with it.
  'reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );',
];
const WRAP_PATCHES = [null, null, ''];
const WRAPPED_PHYSICAL = WRAP_TARGETS.reduce((src, target, i) => {
  if (!src.includes(target)) {
    throw new Error(`forest: three changed lights_physical_pars_fragment; foliage wrap patch ${i} is dead`);
  }
  if (WRAP_PATCHES[i] !== null) return src.replace(target, WRAP_PATCHES[i]);
  return src.replace(
    target,
    i === 0
      // The wrap drives the diffuse lobe *only*. BRDF_GGX divides by its own
      // dot(N,L), which normally cancels against the dotNL in `irradiance`;
      // feeding it a wrapped value breaks that cancellation and every card
      // edge-on to the sun fires a specular spike, which then floods the frame
      // through bloom. Ask for it here and the whole forest turns to white grit.
      // The crown occlusion has to bite as hard here as it does on the indirect
      // terms. At 0.62 a fully buried card kept 44% of its *direct* sun while
      // keeping only 10% of the sky, so the deeper a card sat in a crown the
      // more its light came from the key — and the key is 0xffe2c6, blue at 56%
      // of red in linear. Shading a card made it warmer. That is why every
      // attempt to put depth into a crown also pushed it toward khaki, and why
      // crown interiors never read as voids: they were still lit by the sun.
      ? `${target}
	// Is this light the key? directLight.direction is in *view* space and
	// uSunDir in world space, and the first version of this test compared the
	// two directly — so it never matched, the key was taken for a lamp, and the
	// bounded lamp transmission below ran on the sun as well: up to 2.5 times
	// the albedo, in the sun's own colour, added to every backlit card, on top
	// of the key transmission that is done once at the end of the shader. That
	// was the whitish-pink verge at dusk and most of the tufts brighter than the
	// road at night. One matrix multiply puts the two in the same space.
	vec3 sunV = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );
	float isKey = step( 0.98, dot( directLight.direction, sunV ) );
	// The wrap is a leaf's translucency under a sky-sized source. A headlamp is
	// a point, and a card facing away from it should go dark; at the key's
	// wrap a verge under the lamps lit up on both sides of every card.
	float wrapL = mix( uWrap * 0.35, uWrap, isKey );
	float dotNLWrap = saturate( ( dot( geometryNormal, directLight.direction ) + wrapL ) / ( 1.0 + wrapL ) )
		* uDirect * ( 1.0 - uShade * vShade * 0.86 );
	// Cuticle sheen, per light and inside the shadow term.
	//
	// A leaf is not felt: it has a thin waxy layer over the pigment that throws
	// a broad, weak highlight, and it is the only thing in this material that
	// responds to where the light actually is rather than to where the camera
	// is. Two places it earns its keep — a sunward crown gets a glitter along
	// the tips that no amount of diffuse work produces, and at night the
	// headlamp picks individual sprays out of the dark instead of washing a
	// flat green over them.
	//
	// Written out rather than asked of BRDF_GGX on purpose: GGX divides by its
	// own dot(N,L), which no longer cancels once the diffuse term is wrapped,
	// and every card edge-on to the sun then fires a spike that floods the
	// frame through bloom. A normalised Blinn lobe is bounded by one, so the
	// worst case here is uSheen times the light colour.
	{
		vec3 hs = directLight.direction + geometryViewDir;
		float hl = length( hs );
		if ( hl > 1e-4 && uSheen > 0.0 ) {
			float spec = pow( saturate( dot( geometryNormal, hs / hl ) ), 24.0 );
			// Both numbers are sized against a *whole card*, not against a
			// fragment. The shell normal is constant across a card, so this lobe
			// does not put a highlight on part of a leaf — it turns an entire
			// card white at once wherever that card happens to face the half
			// vector, and a verge full of those reads as bleached rather than
			// waxy. uBump breaks it into grain, but uBump is the expensive half
			// and the fast tier does not buy it, so the ceiling has to hold on
			// its own: about half of what a lit crown returns from diffuse.
			//
			// The ceiling is what carries the night, not uSheen. A headlamp two
			// metres away delivers an irradiance an order of magnitude above the
			// key's, so the same coefficient that is barely visible by day is
			// pinned at the clamp under a lamp — which is exactly the behaviour
			// wanted, since 0.035 against a near-black verge is a clear glint.
			reflectedLight.directSpecular += min( vec3( 0.035 ), directLight.color * spec * uSheen * dotNLWrap );
		}
	}
	// Transmission from the local lights, per light.
	//
	// The key's transmission is done once at the end of the shader, where the
	// crown thickness and the view geometry are both to hand; that pass cannot
	// see an individual light, so at night — when the only thing lighting the
	// verge is a pair of lamps a metre off the ground — every card between the
	// lamp and the lens was a black cutout with a bright rim on it. A leaf with
	// a light behind it is the single most recognisable thing foliage does, and
	// it is the whole reason a headlamp sweeping a verge looks like a headlamp
	// sweeping a verge rather than a torch pointed at a photograph.
	//
	// The key itself is excluded rather than double-counted: its direction is
	// the same at every fragment and every frame, so one dot separates it from
	// a lamp for nothing.
	if ( uTrans > 0.0 ) {
		float lamp = 1.0 - isKey;
		if ( lamp > 0.0 ) {
			// light has to enter the far face (normal) and leave toward the eye
			// (view); a card seen edge-on to the lamp does neither
			float bN = saturate( -dot( geometryNormal, directLight.direction ) * 0.9 + 0.22 );
			float bV = pow( saturate( -dot( geometryViewDir, directLight.direction ) ), 1.6 );
			float thinL = 1.0 - vShade * 0.7;
			// A spot at two metres delivers a very large irradiance, and this
			// term is additive on top of the diffuse one; bounded so a clump
			// the truck is parked in cannot flare the whole frame through bloom.
			vec3 through = min( directLight.color * ( uTrans * lamp * bN * bV * thinL ), vec3( 2.5 ) );
			reflectedLight.directDiffuse += material.diffuseContribution * uSunTint * through;
		}
	}`
      : 'reflectedLight.directDiffuse += dotNLWrap * directLight.color * BRDF_Lambert( material.diffuseContribution );',
  );
}, THREE.ShaderChunk.lights_physical_pars_fragment);

/**
 * Foliage shading. A leaf card is not a Lambertian slab and its authored shell
 * normal is a fiction, so four things replace the stock model:
 *
 *  - a wrapped direct term, so a card angled away from the sun still catches
 *    light instead of clamping to zero at the terminator;
 *  - a hemispherical sky term in world space, which is what makes shade legible;
 *  - the baked `aShade` crown occlusion driving both, so the interior of a
 *    crown is darker than its rim and the mass reads as volume;
 *  - an aerial-perspective ramp applied before fog, which is the only handle on
 *    the mid distance — past about 150 m FogExp2 owns the pixel outright.
 */
function foliageMaterial(map, {
  alphaTest = 0.3,
  // How hard the mip-fill compensation below pushes, per level of detail past
  // the second. A conifer crown is built from structures one texel wide and
  // genuinely does vanish without it. Ground cover is not: a fern cell is 40%
  // covered, so at three mip levels out the *average* alpha over a frond is
  // already above a 0.3 cut and the compensation then doubles it. The gaps
  // between the pinnae close, then the gaps between the fronds, and what
  // arrives at the eye at fifteen metres is a solid pale wedge — a field of
  // which is most of what the mid distance was repeating.
  mipFill = 0.34,
  // Alpha subtracted over the band of mip levels where a card has averaged away
  // its painted structure but is still a shape on screen — roughly eight to
  // forty metres for a metre-high clump. Raising `alphaTest` instead would erode
  // the near cards as well and delete the far ones outright; taking a constant
  // off inside a window leaves both ends alone and eats the mass back to its
  // dense core in between, which is where the holes belong.
  mipErode = 0.0,
  trans = 0.8,
  rough = 0.9,
  windAmp = 0.2,
  windSpeed = 1.0,
  windFlutter = 1.0,
  // What the sun looks like once it has been through a leaf. Not the raw low
  // sun: a leaf transmits green and yellow and absorbs the rest, so backlight
  // arrives green-gold, and feeding the shader the undiluted 0xff9d52 pushed red
  // past green and turned every clump lime. The default is a broadleaf's. A
  // conifer needle is thick, waxy and mostly opaque, so it wants its own — with
  // this one a sunward stand of spruce measured a median hue in the *fifties*,
  // an orange-brown, while the same trees seen down-sun read green.
  sunTint = [1.0, 0.78, 0.42],
  tint = 0xffffff,
  env = 0.26,
  wrap = 0.6,
  direct = 1.0,
  sky = 1.0,
  shade = 0.62,
  haze = 0.0,
  // The aerial ramp's target, as per-channel scales on the hour's fog colour
  // (sky.js writes it into `uFog`). A crown seen through sixty metres of dust
  // is much darker than the air and a little greener; the far scale is where
  // the ramp lands once it has saturated, so the 60-120 m band and the true
  // distance do not converge on one value. Scaling the fog rather than naming
  // a colour is what keeps a hazed crown from glowing at night: the old fixed
  // hex targets were daytime constants and lit up every distant tree after dark.
  hazeK = [0.11, 0.11, 0.06],
  hazeK2 = [0.37, 0.35, 0.22],
  // Added to the haze target in *linear*, where a dark green is only about 0.03. At 0.075
  // this warm lift was three times the colour it was decorating, so every hazed
  // crown ended up the same warm grey no matter what the target said — which is why
  // the far band would not take a green however saturated the target was made.
  // Sized to lift a sunward-facing crown by about half a stop and no more, and
  // only just warm: at [0.019, 0.02, 0.008] this was a hue-65 orange, and it is
  // the last term standing on a far crown, so the far band took its colour from
  // it. The low sun is warm, but not two-to-one warm.
  hazeRim = [0.015, 0.018, 0.013],
  // [start distance, e-fold scale] — not a smoothstep range
  hazeRange = [22, 58],
  // Waxy highlight strength. A conifer needle is a good deal glossier than a
  // deciduous leaf and a dead frond is barely glossy at all, so this is per
  // material rather than global. Scaled by the tier: it is pure per-fragment
  // cost with no geometry behind it.
  sheen = 0.1,
  // Sub-card relief. The shell normal is smooth across a whole card, so a crown
  // lit from one side arrives with no grain in it whatsoever — every card is a
  // single smooth gradient, which is the flat-value half of the cut-paper read.
  // This tilts the normal on a 3 cm world-space field, which is roughly needle
  // pitch, so the light breaks up at the scale the eye looks for it at arm's
  // length and glitters under a moving lamp at night.
  bump = 0.06,
  // How far the foot of a plant is pulled toward the soil colour: 0 leaves the
  // atlas alone (trees, whose aRoot is 0 anyway).
  rootDark = 0.8,
  // Where the hour meter below floors out. The ground cover keeps the tenth
  // that stopped the tufts glowing at night; a crown six metres up in the
  // moonlight is a different object — with the same floor it landed on the
  // grade's black lift and every tree after dark was a bare skeleton with no
  // canopy on it. Its floor is higher so the mass is present, still well
  // under the bark's additive skylight.
  nightFloor = 0.1,
  // Crown-space gradient: 0 leaves the albedo alone; 1 is the full split
  // (top +0.3 stops warm, underside -0.7 stops blue-grey). Read off `aCrown`,
  // which only the tree crowns carry.
  crownGrad = 0.0,
  // Ceiling on the key's transmission, as a multiple of what the same leaf
  // returns facing the key. Half for straw, which bleaches; a crown rim seen
  // against a low sun is allowed to pass as much as it reflects.
  transMax = 0.5,
  // Forward-scatter peak: how much the transmission rises when the sun is
  // almost directly behind the card. This is the aureole a thin leaf shows at
  // sunset and nothing else in the model produces it.
  transPeak = 0.0,
  // Low-sun multiplier on the transmission and its cap (1 leaves them alone).
  // A crown seen edge-on to a six-degree sun is a lens with light entering
  // its whole sunward side; the noon term, sized so the underside of a
  // high-sun crown stays the shaded side, left the dusk interior 3.2 stops
  // under the sky. Gated by the same `lowSun` as the forward peak, so noon
  // and the moon (43 degrees) are untouched.
  transLow = 1.0,
  // How far the outer shell's forward peak may pass over `transMax`, as a
  // multiple of the cap (0 keeps the cap on everything). The cap is what a
  // sun-facing leaf returns, and a rim spray with the sun behind it passes
  // more than that — a thin leaf transmits more than it reflects. Held to
  // the shell (aShade near 0) so the buried cards stay a dark mass and only
  // the fringe lights: that is the whole of what an acacia does at dusk.
  transRim = 0.0,
  // The diffuse (view-independent) share of the low-sun transmission, which
  // is 1.0 at noon's scale. At dusk the peak is the whole of a *backlit*
  // crown and that crown is bounded by the cap; a crown with the key beside
  // it has no peak and stands under the cap on the broad term alone — the
  // round-5 `forest` dusk crown, 3.3 stops under the sky with its interior
  // black. This lifts that term without moving the cap, so the side-lit
  // crown comes up and the backlit one, already at its bound, does not.
  // (The round-5 critics' fix — letting the buried cards pass part of the
  // over-cap term — was probed first: 0.04 st on the side-lit crown and
  // nothing on the backlit one, since only the shell ever stands over the
  // cap. Not kept.) Off at night by construction: the moon stands at 43
  // degrees, so lowSun is 0 there.
  transBroad = 1.0,
  // Self-shadow down a tuft: 0 off; 1 takes the root to 0.45 of the tip and
  // toward a dark olive (the blade at 0xc9b37a going to 0x8a7a48 at its foot),
  // read off aCrown, which plantClump fills with height-in-plant. The atlas
  // carries a per-blade ramp already; this is the whole plant's, so a clump
  // is a mass with a dark heart and lit tips instead of a fan of bright edges.
  tuftAO = 0.0,
  // Dust on the blades: the texel's chroma toward a warm grey by this share,
  // value held (0 off). The scatter's road dust greys the *instance tint*, and
  // on a grass tint that is near neutral already that moves nothing: the
  // straw's saturation is the atlas texel's, and a texel times a grey keeps
  // its ratios. The pride's lawn (round 6) is trodden every day and lies on
  // the dust-grey ring the terrain draws under it, and its lie-up measured a
  // saturation of 0.54 against the critics' 0.45 with the tint greyed to no
  // effect; this is the same dust on the blade itself.
  dust = 0.0,
  // Sun-side bias on the crown's indirect light, 0 off. The crown weight
  // (aCrown) says which way is up; nothing said which way the sun is, so a
  // noon crown was lit top-and-underside whichever side the key stood, and the
  // direct term could not say it either — from the road a crown is mostly
  // underside and rim, and the underside is in the crown's own shadow on both
  // halves. What a real crown has that a card cluster lacks is the light
  // scattered into its sunward half by its own lit rim and the lit ground
  // under it. In stops: at s the indirect on a card at the crown's sunward
  // edge is 2^s of neutral and 2^-s at the far edge, read off where the card
  // stands relative to the trunk (0.7) and its shell normal's horizontal part
  // (0.3), so aCrown stays the up/down gradient and this is the left/right
  // one. Measured on a perpendicular framing of the nearest umbrella crown at
  // a 58-degree sun: 0 gave the two halves 0.00 st apart, and the split
  // runs at about 0.33 st per unit of s — the halves average about a third
  // of the edge value, and the direct term gives them nothing on a flat lens
  // whose shell normals are up and down.
  sunSide = 0.0,
  // Dirt collar under the plant (the flat card plantClump adds at the base):
  // 0 discards it, 1 draws it at full soil darkness.
  collar = 0.0,
} = {}) {
  const m = new THREE.MeshStandardMaterial({
    map,
    color: tint,
    transparent: false,
    alphaTest,
    side: THREE.DoubleSide,
    roughness: rough,
    metalness: 0,
    // low on purpose: the analytic hemisphere below carries the sky, and letting
    // the PMREM double up on it is what turned every card pale
    envMapIntensity: env,
    // Foliage runs its own aerial perspective *ahead of* the scene's fog. The
    // fog used to be off here altogether, from the days of the forest's 0.0052
    // fog, when FogExp2 owned a quarter of the pixel at a hundred metres and
    // painted the mid distance in fog colour. The savanna's fog is 0.0017 —
    // one per cent at sixty metres, six at a hundred and fifty — so the ramp
    // still owns the mid distance, and what the fog adds is the one thing the
    // ramp cannot: convergence with the terrain at four hundred metres, where
    // an unfogged painted tree was a hard dark cut-out on a fogged hill.
    fog: true,
  });
  const u = {
    uSunDir: { value: SUN_DIR },
    uSunTint: { value: new THREE.Color(...sunTint) },
    uTrans: { value: trans },
    uSky: { value: FOLIAGE_SKY.clone().multiplyScalar(sky) },
    uGnd: { value: FOLIAGE_GND.clone().multiplyScalar(sky) },
    uWrap: { value: wrap },
    uDirect: { value: direct },
    uShade: { value: shade },
    uHaze: { value: haze },
    // As on the bark: the ramp's target is the hour's fog colour (written into
    // `uFog` by sky.js) scaled by a per-channel factor, so the far band takes
    // the dust's colour at whatever hour it is and stays dark after dark.
    uFog: { value: new THREE.Color(0.43, 0.41, 0.38) },
    uHazeK: { value: new THREE.Vector3(...hazeK) },
    uHazeK2: { value: new THREE.Vector3(...hazeK2) },
    uRim: { value: new THREE.Color(...hazeRim) },
    uHazeNear: { value: hazeRange[0] },
    uHazeFar: { value: hazeRange[1] },
    // Normalised out of the tier's cell multiplier — see `foliageDetail`. The
    // mip bands below are a statement about how large a card is on screen, and
    // a tier that paints at 1.5x would otherwise report every card as being
    // 0.6 of a level further out and close its cutouts up that much nearer.
    uAtlasPx: { value: (map.image?.width || 1024) / foliageDetail() },
    uMipFill: { value: mipFill },
    uMipErode: { value: mipErode },
    uSheen: { value: sheen },
    uBump: { value: bump },
    // The base of a plant, pulled toward the soil it grows out of (aRoot).
    uSoil: { value: linear(0x6e4a34) },
    uRootDark: { value: rootDark },
    uNightFloor: { value: nightFloor },
    uCrownGrad: { value: crownGrad },
    uTransMax: { value: transMax },
    uTransPeak: { value: transPeak },
    uTransLow: { value: transLow },
    uTransRim: { value: transRim },
    uTransBroad: { value: transBroad },
    uTuftAO: { value: tuftAO },
    uDust: { value: dust },
    uSunSide: { value: sunSide },
    uCollar: { value: collar },
    // The day rig's hemisphere and key, as luma, so the shader can measure how
    // much light the hour has actually left in the scene. See the note at the
    // sky term below.
    uHemiRef: { value: HEMI_REF },
    uKeyRef: { value: KEY_REF },
    // Past this distance the aerial ramp's target climbs from the dark haze
    // toward the fog colour itself, so a painted tree on the horizon converges
    // with the terrain it stands on. Off by default (the near foliage keeps its
    // dark ramp); the billboards set it.
    uHazeFarMix: { value: new THREE.Vector2(1e6, 1e6 + 1) },
  };
  m.userData.foliage = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aShade;
        attribute float aRoot;
        attribute float aCrown;
        varying float vShade;
        varying float vRoot;
        varying float vCrown;
        varying vec3 vWPos;
        varying vec2 vRad;`,
      )
      .replace(
        '#include <project_vertex>',
        `vShade = aShade;
        vRoot = aRoot;
        vCrown = aCrown;
        #ifdef USE_INSTANCING
          vWPos = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
          vRad = vWPos.xz - ( modelMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xz;
        #else
          vWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
          vRad = vWPos.xz - ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xz;
        #endif
        #include <project_vertex>`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uSunDir;
        uniform vec3 uSunTint;
        uniform vec3 uSky;
        uniform vec3 uGnd;
        uniform vec3 uFog;
        uniform vec3 uHazeK;
        uniform vec3 uHazeK2;
        uniform vec3 uRim;
        uniform float uTrans;
        uniform float uWrap;
        uniform float uDirect;
        uniform float uShade;
        uniform float uHaze;
        uniform float uHazeNear;
        uniform float uHazeFar;
        uniform float uAtlasPx;
        uniform float uMipFill;
        uniform float uMipErode;
        uniform float uSheen;
        uniform float uBump;
        uniform vec3 uSoil;
        uniform float uRootDark;
        uniform float uHemiRef;
        uniform float uKeyRef;
        uniform vec2 uHazeFarMix;
        uniform float uNightFloor;
        uniform float uCrownGrad;
        uniform float uTransMax;
        uniform float uTransPeak;
        uniform float uTransLow;
        uniform float uTransRim;
        uniform float uTransBroad;
        uniform float uTuftAO;
        uniform float uDust;
        uniform float uSunSide;
        uniform float uCollar;
        varying float vShade;
        varying float vRoot;
        varying float vCrown;
        varying vec3 vWPos;
        varying vec2 vRad;
        float folLuma( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }`,
      )
      .replace('#include <lights_physical_pars_fragment>', WRAPPED_PHYSICAL)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if ( vRoot > 1.0 ) {
          // The dirt collar: a flat card under the clump, aRoot running 2 at
          // its centre to 1 at its rim. Soil, darkest in the middle where the
          // stems shade it, cut off along a noisy radius so it is a patch of
          // trodden earth and not a disc. Alpha is authored here, not read off
          // the atlas: the card borrows a fully painted strip of the tile
          // purely to have something to sample.
          float rad = vRoot - 1.0;
          float nz = sin( vWPos.x * 23.0 + vWPos.z * 7.0 ) * sin( vWPos.z * 19.0 - vWPos.x * 5.0 ) * 0.14;
          diffuseColor.rgb = uSoil * mix( 1.0, 0.5, rad );
          diffuseColor.a = smoothstep( 0.02, 0.62, rad + nz ) * uCollar;
        } else if ( vRoot > 0.0 ) {
          // The bottom third of a tuft goes toward the soil: darker, and in
          // the earth's hue rather than the straw's. A cutout card meets the
          // ground along a hard bright line otherwise, and that line is what
          // says "card" from any distance at all.
          vec3 soil = uSoil * ( folLuma( diffuseColor.rgb ) / max( folLuma( uSoil ), 1e-3 ) ) * 0.34;
          diffuseColor.rgb = mix( diffuseColor.rgb, soil, pow( vRoot, 1.5 ) * uRootDark );
        }
        if ( uTuftAO > 0.0 && vRoot <= 1.0 ) {
          // The plant's own shadow on itself, root to tip. 0.45 of the tip's
          // value at the foot, in linear, with blue down further than red and
          // green so the foot goes olive rather than grey — 0xc9b37a at the tip
          // is 0x8a7a48 at the root, linear in height (a first cut steeper at
          // the foot, pow 0.7, moved the hero's straw p10 by 0.18 st and its
          // median by 0.02 — the foot is under the collar and the other tufts,
          // and the self-shadow has to show on the blades that are seen). The
          // collar (vRoot > 1) is soil already and keeps out of it.
          float tipK = saturate( vCrown );
          vec3 ao = mix( vec3( 0.43, 0.45, 0.32 ), vec3( 1.0 ), tipK );
          diffuseColor.rgb *= mix( vec3( 1.0 ), ao, uTuftAO );
        }
        if ( uDust > 0.0 && vRoot <= 1.0 ) {
          // dust on the blade: chroma toward a warm grey of the same luma
          // (the warm bias keeps the grey from reading blue against the soil)
          diffuseColor.rgb = mix( diffuseColor.rgb, vec3( folLuma( diffuseColor.rgb ) ) * vec3( 1.06, 1.0, 0.92 ), uDust );
        }
        if ( uCrownGrad > 0.0 ) {
          // The lit/shade split a card cluster cannot make for itself. The
          // shell normals give the direct term a side to prefer, but the sun
          // is high and the crown is a lens a metre or two thick seen from
          // below: what the eye needs is the top of the crown warm and light
          // and the underside cool and dark, whichever way any one card
          // happens to face. Baked into the albedo so every term inherits it.
          float cg = clamp( vCrown * 2.0 - 1.0, -1.0, 1.0 );
          float up = max( cg, 0.0 ) * uCrownGrad;
          float dn = max( -cg, 0.0 ) * uCrownGrad;
          // +0.3 stops and toward yellow on top; -0.7 stops, toward blue-grey
          // and a third of the way to grey underneath
          vec3 k = mix( vec3( 1.0 ), vec3( 1.23 ) * vec3( 1.1, 1.03, 0.86 ), up ) * mix( vec3( 1.0 ), vec3( 0.62 ) * vec3( 0.88, 0.95, 1.12 ), dn );
          diffuseColor.rgb = mix( diffuseColor.rgb, vec3( folLuma( diffuseColor.rgb ) ), dn * 0.3 ) * k;
        }`,
      )
      .replace(
        '#include <alphatest_fragment>',
        `{
          // Mipmapping an alpha-tested card lowers its average alpha, so at
          // distance the cutout eats the thin parts and the card breaks into
          // disconnected fragments. Estimate the footprint from the UV
          // derivatives and push the alpha back up to compensate.
          //
          // Only past a couple of mip levels, though. Applied from lod zero it
          // also fills in the gaps *between the needles of a near spray*, which
          // is the difference between a crown the eye reads the structure of and
          // one solid pale shape — and that shape was the whole tropical-hedge
          // problem. Near cards keep their holes; far ones keep their silhouette.
          vec2 duv = vec2( length( vec2( dFdx( vMapUv.x ), dFdy( vMapUv.x ) ) ),
                           length( vec2( dFdx( vMapUv.y ), dFdy( vMapUv.y ) ) ) );
          float lod = log2( max( max( duv.x, duv.y ) * uAtlasPx, 1.0 ) );
          float erode = uMipErode * max( 0.0, 1.0 - abs( lod - 3.6 ) * 0.55 );
          diffuseColor.a = saturate( diffuseColor.a * ( 1.0 + clamp( lod - 2.2, 0.0, 3.0 ) * uMipFill ) - erode );
        }
        #include <alphatest_fragment>`,
      )
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        #ifdef DOUBLE_SIDED
          // the shell normal is the point of these cards; do not flip per face
          normal *= faceDirection;
          nonPerturbedNormal = normal;
        #endif
        if ( uBump > 0.0 ) {
          // Analytic rather than a normal map: a cutout card has no tangent
          // frame worth the name and no second UV set to hang one off, and the
          // point here is grain, not a surface. Bounded by construction — the
          // added vector is at most sqrt(3) * uBump long against a unit normal,
          // so the normalize below can never divide by anything small.
          vec3 grain = sin( vWPos * 33.0 + vec3( 1.7, 4.3, 2.9 ) ) * cos( vWPos.zxy * 21.0 );
          normal = normalize( normal + grain * uBump );
        }`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 wN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
          float open = 1.0 - uShade * vShade;
          // How much light the hour has left in the scene, measured off the
          // lights themselves rather than trusted to a table.
          //
          // The sky term below is sized in absolute units against the *day*
          // rig — about eight times the hemisphere light, so a shaded crown
          // reads as a mid green at noon rather than the black cutout the
          // physical value gives. Nothing in that number knows what hour it
          // is: sky.js retunes uSky by name, but a table entry of 0.3 for
          // night was set against a hemisphere that actually drops to 0.09 of
          // its day value and a key that drops to 0.1, so the tufts kept eight
          // times *more* fill than the ground beside them and glowed. Reading
          // the hemisphere and key luma here, and scaling the excess by them,
          // ties the term to whatever the lighting rig does — this hour, and
          // any hour the table has not met yet.
          //
          // The physical share of the term tracks the hemisphere alone; the
          // excess (three quarters of it) also tracks the key, because the
          // excess exists to hold shade legible against a sunlit rim and there
          // is no rim to hold it against once the key is down.
          float hemiL = uHemiRef;
          #if NUM_HEMI_LIGHTS > 0
            hemiL = folLuma( hemisphereLights[ 0 ].skyColor + hemisphereLights[ 0 ].groundColor ) * 0.5;
          #endif
          float ambK = clamp( hemiL / max( uHemiRef, 1e-4 ), 0.0, 1.6 );
          float keyL = uKeyRef;
          #if NUM_DIR_LIGHTS > 0
          {
            // the key is whichever directional light points the way uSunDir does
            vec3 sunV = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );
            float bestDot = -2.0;
            // declared outside: the unroller pastes the body once per light
            float dd = 0.0;
            #pragma unroll_loop_start
            for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
              dd = dot( directionalLights[ i ].direction, sunV );
              keyL = dd > bestDot ? folLuma( directionalLights[ i ].color ) : keyL;
              bestDot = max( bestDot, dd );
            }
            #pragma unroll_loop_end
          }
          #endif
          float keyK = clamp( keyL / max( uKeyRef, 1e-4 ), 0.0, 1.2 );
          // Floored at a tenth: with the hemisphere at 7% of day and the moon
          // at 30% of the sun the product left a crown with nothing but its
          // 0.1 albedo under the moon, a hole in the stars rather than a tree.
          // A tenth of the day term is still well under the ground's own fill.
          float hourK = max( ambK * mix( keyK, 1.0, 0.25 ), uNightFloor );
          // the key low over the horizon (full below ~8 degrees, shut above ~28);
          // uSunDir is retuned by the hour, and the moon stands at 43
          float lowSun = 1.0 - smoothstep( 0.12, 0.48, uSunDir.y );
          // Which half of the crown this card is on, against the key's azimuth
          // (see uSunSide): where it stands relative to the trunk, and which
          // way its shell normal leans. The position is the honest half of
          // it — a lens's sunward half is the half toward the sun whichever
          // way a card in it faces — the normal breaks the seam at the axis.
          // Eased at low sun: a six-degree key lights the rim, not a half.
          float sideK = 1.0;
          if ( uSunSide > 0.0 ) {
            vec2 sh = normalize( uSunDir.xz + vec2( 1e-5, 0.0 ) );
            float rl = length( vRad );
            float sidePos = dot( vRad, sh ) / max( rl, 1e-4 ) * smoothstep( 0.0, 2.5, rl );
            vec2 nh = wN.xz;
            float sideN = dot( nh, sh ) / max( length( nh ), 1e-4 ) * min( length( nh ) * 1.6, 1.0 );
            // In stops. The far side goes down a quarter as far as the sunward
            // side comes up: the underside is dark already, and a version that
            // held the crown's mean with a divisor put the whole underside of
            // the forest view's acacia 0.6 st down and half its upper box under
            // Y 0.01 — the black cut-out the round asked to remove. At half
            // the forest view's near crown, which is mostly far side from the
            // road, still went 0.29 st down on that side and its box median
            // 9 % under before. The crown's centre (side 0) is left exactly
            // where it was.
            float side = sidePos * 0.7 + sideN * 0.3;
            float sideS = uSunSide * mix( 1.0, 0.4, lowSun );
            sideK = exp2( sideS * side * ( side > 0.0 ? 1.0 : 0.25 ) );
          }
          // Occlude what three has already accumulated, not just what is added
          // below. The baked crown weight used to gate only the analytic terms,
          // so the hemisphere light and the environment probe went on flooding
          // the inside of every crown at full strength — the interior came out as
          // bright as the rim however hard uShade was driven, and a crown lit
          // evenly right through its depth is a shrub. Ablating the terms one at a
          // time put three's own ambient at about seventy per cent of the value
          // here, which is why nothing I could reach was moving it.
          reflectedLight.indirectDiffuse *= open * sideK;
          // the probe sheen is a surface effect, so it is only partly occluded
          reflectedLight.indirectSpecular *= 0.34 + 0.66 * open;
          reflectedLight.indirectDiffuse += diffuseColor.rgb * mix( uGnd, uSky, wN.y * 0.5 + 0.5 ) * open * hourK * sideK;
          // Thin-leaf transmission, gated on the light and not only on the view.
          //
          // The old form asked one question — is the camera looking toward the
          // sun — so every crown *beyond* the sun lit up whichever way its cards
          // faced, and a whole sunward hillside went pale khaki when only the
          // leaves with the sun actually behind them should have. Light has to
          // enter the far side of the card to come out of this one, which is a
          // question about the normal; how much of it reaches the eye is the
          // question about the view. Both, multiplied.
          //
          // The third term is thickness. A card buried in a crown has the rest
          // of the crown behind it, so nothing gets through; a rim spray has one
          // leaf's worth of material and glows. Without it the interior of a
          // backlit crown transmits as hard as its edge, which is the one thing
          // that never happens in a photograph.
          vec3 fV = normalize( vWPos - cameraPosition );
          // Under a low sun the crown is edge-on to the light and a metre or
          // two thick: light enters at the sunward side and scatters through
          // the whole lens, so every card in it transmits, not only the ones
          // whose normal happens to face away from the key. At a high sun the
          // normal test stands as it was.
          float backN = saturate( -dot( wN, uSunDir ) * 0.8 + 0.28 + lowSun * 0.4 );
          float toSun = saturate( dot( fV, uSunDir ) );
          // Broad lobe plus a forward peak. The broad term is diffuse
          // transmission and is what the old model had; the peak is the
          // aureole a thin leaf throws when the sun is within ten or fifteen
          // degrees behind it, and it is the whole of what a crown does at
          // dusk with the key six degrees up behind the canopy — without it
          // every canopy at that hour was a black cut-out.
          // The broad term does not depend on the view: diffuse transmission
          // leaves the far face of a leaf in every direction, which is why a
          // canopy with the sun *beside* it rather than behind it still glows
          // from underneath at dusk. The old pow( toSun ) gate is what left the
          // dusk crown black whenever the camera was not pointed at the sun.
          // Held down while the sun is high — the underside of a noon crown
          // wants to stay the shaded side, and the round-1 form of this term
          // is what turned every sunward hillside khaki.
          //
          // The peak is a low-sun effect and only that: with the key at 58
          // degrees and the camera looking up-sun the same lobe put a gold
          // aureole on every card of the near crown at noon, when a crown
          // against a high sun is a dark mass with a lit rim. uSunDir is
          // retuned by the hour along with the rest of the rig, so the gate
          // opens as the sun drops (full below ~8 degrees, shut above ~28).
          // (0.2 as the high-sun floor lit the whole underside of the noon
          // crown to forty per cent of its lit face and undid the split.)
          //
          // Under the moon the floor comes back up. The moon is the only light
          // there is and it stands at 43 degrees over a crown a metre thick:
          // what it puts through the leaves is most of what the underside has,
          // and without it the cards under the moon measured a third of the
          // sky's luma — a hole in the stars rather than a tree. keyK is the
          // key against the day's, so this is shut by dusk (0.25) and open
          // under the moon (0.05).
          float nightK = 1.0 - smoothstep( 0.08, 0.3, keyK );
          float broadV = mix( 0.06 + pow( toSun, 2.2 ) * 0.6, uTransBroad, lowSun ) + nightK * 0.5;
          float peakV = pow( toSun, 14.0 ) * uTransPeak * lowSun;
          float thin = ( 1.0 - vShade * 0.6 ) * ( 1.0 - abs( dot( wN, fV ) ) * 0.34 );
          // Driven by the key's irradiance as the direct term is (keyL / pi is
          // what a face square to the key receives), so uTrans is the leaf's
          // transmittance relative to its reflectance and means the same thing
          // at noon and at dusk. The old form scaled by keyK — the key relative
          // to *noon* — which at dusk left a fifth of the term standing at the
          // one hour the term is for. Bounded per material: straw at half of
          // what its lit face returns, because straw bleaches; a crown at par.
          //
          // The cap is against the key's irradiance on a sun-facing leaf, not
          // this card's own lit term, so a card in shade still transmits. But
          // one cap for the whole crown flattened it: at dusk the rim's broad
          // term and its forward peak both ran into the cap while the buried
          // cards sat under it, so rim and interior landed within a third of a
          // stop and the crown read as a cut-out (round 4: 3.2 stops under the
          // sky, no lit rim). Now the outer shell's peak passes over the cap
          // on its own bound (uTransRim caps), and the low-sun term is scaled
          // by uTransLow — both gated by lowSun, so noon and the moon (43
          // degrees) are exactly as they were; ungated, the night term's share
          // of raw ran over the cap on the shell and the night crown box
          // went from 0.52 to 0.63 of the sky.
          float lit = keyL * RECIPROCAL_PI * uDirect;
          float lowK = mix( 1.0, uTransLow, lowSun );
          float cap = uTransMax * lit * lowK / max( folLuma( uSunTint ), 1e-3 );
          float raw = uTrans * lowK * keyL * RECIPROCAL_PI * backN * thin * ( broadV + peakV );
          // The high-sun transmission takes the crown's sun side too. It is
          // gated on the normal facing away from the key, which on a lens is
          // the far half's cards as much as the near half's, so it was light
          // laid evenly over a crown the indirect term had just split: with it
          // off altogether the forest view's crown split measured +0.24 st
          // wider. Applied to the raw term, ahead of the cap, so the sunward
          // half rises no further than the lit face allows and only the far
          // half falls. Left alone at low sun: the dusk crown's transmission
          // is the whole of its light and is tuned above on its own.
          raw *= mix( sideK, 1.0, lowSun );
          float shell = ( 1.0 - smoothstep( 0.25, 0.75, vShade ) ) * lowSun;
          float through = min( raw, cap ) + shell * min( max( raw - cap, 0.0 ), cap * uTransRim );
          reflectedLight.indirectDiffuse += diffuseColor.rgb * uSunTint * through;
        }`,
      )
      .replace(
        '#include <fog_fragment>',
        `{
          // Aerial perspective, ahead of the fog. FogExp2's colour is brighter
          // than the sky it is seen against, so left alone it lifts the mid
          // distance above the sky and the treeline glows. Grading toward a dark
          // haze first is what lets the two sum to a mass that sits under the
          // sky, and mixing toward one colour flattens the local contrast that
          // made the far crowns read as a comb of separate spikes.
          // Saturating rather than smoothstepped: a smoothstep reaches its far
          // edge and stops, so every crown past that distance graded to one
          // colour and the corridor ended in a flat wall. This never quite
          // arrives, so 90 m, 140 m and 200 m stay separable.
          float hd = length( vWPos - cameraPosition );
          float aer = uHaze * ( 1.0 - exp( -max( hd - uHazeNear, 0.0 ) / uHazeFar ) );
          vec3 wNh = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
          // Only the top of a distant canopy catches the low sun; the flanks
          // stay in the haze. An evenly graded far mass reads as a painted flat.
          // Past uHazeFarMix the far target climbs toward the fog itself: the
          // dark target is right at eighty metres and a black cut-out at four
          // hundred, where the hill behind the tree is nearly all fog.
          vec3 k2 = mix( uHazeK2, vec3( 0.92 ), smoothstep( uHazeFarMix.x, uHazeFarMix.y, hd ) );
          vec3 haze = uFog * mix( uHazeK, k2, aer ) + uRim * pow( saturate( wNh.y ), 2.0 );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, haze, aer );
        }
        #include <fog_fragment>`,
      );
  };
  // Every foliage material generates byte-identical source and differs only in
  // uniform values, so they share one compiled program. Bump the version if the
  // source above ever grows a branch on an option — three matches programs on
  // this key alone and will silently hand the second material the first one's
  // shader.
  m.customProgramCacheKey = () => 'foliage-v6';
  return applyWind(m, { amplitude: windAmp, speed: windSpeed, flutter: windFlutter });
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Bowed foliage quad with its UVs remapped into one 2x2 atlas tile. */
function foliageCard(w, h, tile, { bow = 0.2, segs = [2, 2], bowAxis = 'y', mirror = false, uCrop = null } = {}) {
  const g = new THREE.PlaneGeometry(w, h, segs[0], segs[1]);
  if (bow > 0) {
    const pos = g.attributes.position;
    const ref = bowAxis === 'x' ? w : h;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / w;
      const v = pos.getY(i) / h;
      pos.setZ(i, (0.25 - u * u - v * v * 0.55) * ref * bow);
    }
  }
  const uv = g.attributes.uv;
  const [ox, oy, sw, sh] = atlasTile(tile);
  const [u0, u1] = uCrop || [0, 1];
  for (let i = 0; i < uv.count; i++) {
    const u = mirror ? 1 - uv.getX(i) : uv.getX(i);
    uv.setXY(i, ox + (u0 + u * (u1 - u0)) * sw, oy + uv.getY(i) * sh);
  }
  g.computeVertexNormals();
  return g;
}

/** A conifer branch spray: near-horizontal card, pivoted at the trunk. */
function spray(len, wid, tile, { origin, angle, droop = 0.5, r0 = 0, roll = 0, bow = 0.2, segs = [2, 2], mirror = false }) {
  const g = foliageCard(len, wid, tile, { bow, segs, bowAxis: 'x', mirror });
  g.translate(len * 0.5, 0, 0);
  g.rotateX(-Math.PI / 2 + roll);
  g.rotateZ(-droop);
  g.rotateY(angle);
  g.translate(origin[0] + Math.cos(angle) * r0, origin[1], origin[2] - Math.sin(angle) * r0);
  return g;
}

/** An upright card facing outward, pivoted at its base. */
/**
 * An upright card, pivoted at its base. `angle` places it around the trunk;
 * `face` is which way it points, and decoupling the two matters at distance: a
 * card that always faces radially outward is edge-on exactly where it would
 * have filled the crown's silhouette, so a stand of them collapses to a narrow
 * column around the bole.
 */
function upright(w, h, tile, { origin, angle, face = null, r0 = 0, tilt = 0, bow = 0.2, segs = [1, 2], mirror = false }) {
  const g = foliageCard(w, h, tile, { bow, segs, mirror });
  g.translate(0, h * 0.5, 0);
  if (tilt) g.rotateX(tilt);
  g.rotateY(face === null ? angle : face);
  g.translate(origin[0] + Math.sin(angle) * r0, origin[1], origin[2] + Math.cos(angle) * r0);
  return g;
}

/**
 * Trunk: explicit rings so the UVs run u around / v up (bark fissures need to
 * be vertical), the cross-section is lobed rather than a circle, and the base
 * grows buttress flares.
 */
function trunkGeo({
  height,
  baseR,
  tipR = 0.03,
  radial = 7,
  segs = 12,
  flare = 1.8,
  flareLobes = 3,
  taper = 1.4,
  uRepeat = 2,
  vScale = 0.3,
  axis = () => [0, 0],
  seed = 1,
  bulge = 0.1,
}) {
  const rnd = mulberry32(seed);
  const phase = [];
  for (let i = 0; i <= segs; i++) phase.push(rnd() * Math.PI * 2);
  const flarePhase = rnd() * Math.PI * 2;
  const positions = [];
  const uvs = [];
  const indices = [];
  const cols = radial + 1;
  for (let i = 0; i <= segs; i++) {
    const t = Math.pow(i / segs, 1.3);
    const y = t * height;
    const [ax, az] = axis(t);
    let r = (baseR - tipR) * Math.pow(1 - t, taper) + tipR;
    r *= 1 + Math.sin(t * 6.1 + phase[0]) * bulge * (1 - t);
    const flareT = Math.pow(clamp(1 - t / 0.14), 2.4);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const lobe = Math.cos(a * 5 + phase[i] * 0.4 + t * 1.6);
      let rr = r * (1 + lobe * 0.1);
      rr += flareT * baseR * flare * Math.pow(Math.max(0, Math.cos(a * flareLobes + flarePhase)), 1.6);
      positions.push(ax + Math.cos(a) * rr, y, az + Math.sin(a) * rr);
      uvs.push((j / radial) * uRepeat, y * vScale);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * cols + j;
      indices.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Low-poly tapered tube through a polyline, UVs matched to the trunk. */
function limb(points, r0, r1, { radial = 5, segs = 3, uRepeat = 1, vScale = 0.4 } = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]))),
    false,
    'catmullrom',
    0.4,
  );
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const len = Math.max(0.05, curve.getLength());
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const t = uv.getX(i);
    curve.getPoint(clamp(t), c);
    v.fromBufferAttribute(pos, i);
    const r = lerp(r0, r1, t);
    pos.setXYZ(i, c.x + (v.x - c.x) * r, c.y + (v.y - c.y) * r, c.z + (v.z - c.z) * r);
    uv.setXY(i, uv.getY(i) * uRepeat, t * len * vScale);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Replace card normals with a canopy shell normal. A quad shaded by its own
 * normal is unmistakably a quad; shaded by the crown's normal it disappears
 * into the mass.
 */
function shellNormals(geo, { mode = 'cone', centre = [0, 0, 0], blend = 0.65, up = 0.55 }) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - centre[0];
    const dy = pos.getY(i) - centre[1];
    const dz = pos.getZ(i) - centre[2];
    if (mode === 'sphere') {
      _nrm.set(dx, dy + 0.2, dz);
    } else if (mode === 'dome') {
      _nrm.set(dx, Math.hypot(dx, dz) * 0.3 + up, dz);
    } else {
      _nrm.set(dx, Math.hypot(dx, dz) * up + up * 0.8, dz);
    }
    if (_nrm.lengthSq() < 1e-8) _nrm.set(0, 1, 0);
    _nrm.normalize();
    const nx = lerp(nor.getX(i), _nrm.x, blend);
    const ny = lerp(nor.getY(i), _nrm.y, blend);
    const nz = lerp(nor.getZ(i), _nrm.z, blend);
    const l = Math.hypot(nx, ny, nz) || 1;
    nor.setXYZ(i, nx / l, ny / l, nz / l);
  }
  nor.needsUpdate = true;
  return geo;
}

const merge = (list) => BufferGeometryUtils.mergeGeometries(list);


// ---------------------------------------------------------------------------
// Tree prototypes
// ---------------------------------------------------------------------------

/**
 * How far apart, in `aShade` units, two neighbouring cards in one crown are
 * allowed to sit. See crownMosaic: at 0 a crown is a smooth radial ramp and
 * reads as a wash; this puts about three stops between the lit sprays and the
 * ones behind them, and can be driven this hard only because the mosaic is
 * centred per crown.
 */
// Eased from 1.0. At three stops per card the mosaic was the only thing the
// eye could read in a crown: cards at the top and cards underneath drew from
// the same two populations and the lit side and the shade side of the tree
// averaged to one value. Half of it keeps the card-to-card separation at 20 m
// and leaves room for the crown gradient to say which way is up.
const CROWN_MOSAIC = 0.55;

/**
 * Species hue, as a multiplier on the instance tint, normalised to unit luma so
 * changing one of these moves the colour of a stand and not its brightness.
 * Everything is olive: an acacia is a grey-green with red well up toward green,
 * and the only real green in the savanna is the round-crowned trees along the
 * drainage lines. `dry` is where a browning crown ends up.
 */
const hue = (r, g, b) => {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / l, g / l, b / l];
};

const SPECIES_HUE = {
  umbrella: hue(0.99, 1.0, 0.9),
  flat: hue(1.02, 1.0, 0.86),
  round: hue(0.93, 1.0, 0.8),
  thorn: hue(1.08, 1.0, 0.74),
  dead: hue(1.0, 1.0, 1.0),
};
const DRY_HUE = hue(1.34, 1.0, 0.54);

function hueOf(name, turn = 0) {
  const s = SPECIES_HUE[name] || SPECIES_HUE.umbrella;
  if (turn <= 0.001) return s;
  return [lerp(s[0], DRY_HUE[0], turn), lerp(s[1], DRY_HUE[1], turn), lerp(s[2], DRY_HUE[2], turn)];
}

/**
 * The acacia habit, as a skeleton: a short bole that splits into several limbs
 * leaning outward and up, each forking twice more toward the crown, the last
 * forks running nearly level under the canopy. Returns the wood and the tips the
 * canopy hangs off, so the umbrella, the dead tree and the scrub thorn share one
 * branching structure and differ in what they carry on it.
 *
 * `spreadY` is where the outermost forks level off; `broken` snaps a share of
 * the limbs short, for a tree that has lost part of its crown to elephant or
 * wind.
 */
function acaciaSkeleton(rnd, { height, baseR, boleH, R, crownBottom, crownTop, limbs, axis, broken = 0, fine = 1.0 }) {
  const wood = [];
  const tips = [];
  const [bx, bz] = axis(boleH / height);
  wood.push(
    trunkGeo({
      height: boleH * 1.04,
      baseR,
      tipR: baseR * 0.72,
      radial: 8,
      segs: 5,
      flare: 1.5,
      flareLobes: 3 + Math.floor(rnd() * 2),
      taper: 0.8,
      axis: (t) => axis(t * (boleH / height)),
      seed: Math.floor(rnd() * 1e6),
      uRepeat: 2,
      vScale: 0.34,
      bulge: 0.14,
    }),
  );
  // root buttresses at the foot
  const rootN = 4 + Math.floor(rnd() * 2);
  for (let i = 0; i < rootN; i++) {
    const a = (i / rootN) * Math.PI * 2 + rnd() * 0.8;
    const rr = baseR * (1.9 + rnd() * 1.4);
    wood.push(
      limb(
        [
          [Math.cos(a) * baseR * 0.5, baseR * 2.2, Math.sin(a) * baseR * 0.5],
          [Math.cos(a) * rr, -baseR * 0.7, Math.sin(a) * rr],
        ],
        baseR * 0.42,
        baseR * 0.1,
        { radial: 5, segs: 2, vScale: 0.35 },
      ),
    );
  }
  const thickH = Math.max(0.3, crownTop - crownBottom);
  const limbN = limbs[0] + Math.floor(rnd() * (limbs[1] - limbs[0] + 1));
  const base0 = rnd() * Math.PI * 2;
  for (let i = 0; i < limbN; i++) {
    const a = base0 + (i / limbN) * Math.PI * 2 + (rnd() - 0.5) * 0.7;
    // limbs share the reach out unevenly: one side of most acacias is heavier
    const reach1 = R * (0.3 + rnd() * 0.22);
    const rise1 = (crownBottom - boleH) * (0.5 + rnd() * 0.3);
    const p0 = [bx, boleH - baseR * 1.1, bz];
    const p2 = [bx + Math.cos(a) * reach1, boleH + rise1, bz + Math.sin(a) * reach1];
    const p1 = [bx + Math.cos(a) * reach1 * 0.4, boleH + rise1 * 0.55, bz + Math.sin(a) * reach1 * 0.4];
    const snapped = rnd() < broken;
    if (snapped) {
      // a stub ending in a ragged break, well short of the crown
      const q = [lerp(p0[0], p2[0], 0.55), lerp(p0[1], p2[1], 0.5), lerp(p0[2], p2[2], 0.55)];
      wood.push(limb([p0, p1, q], baseR * 0.6, baseR * 0.22, { radial: 6, segs: 3, vScale: 0.4 }));
      continue;
    }
    wood.push(limb([p0, p1, p2], baseR * 0.7, baseR * 0.36, { radial: 6, segs: 4, vScale: 0.4 }));
    const secN = 2 + Math.floor(rnd() * 2);
    for (let j = 0; j < secN; j++) {
      const a2 = a + (j / Math.max(1, secN - 1) - 0.5) * 1.3 + (rnd() - 0.5) * 0.4;
      const reach2 = R * (0.26 + rnd() * 0.2);
      const y2 = Math.min(crownBottom + thickH * 0.55, p2[1] + (crownTop - p2[1]) * (0.5 + rnd() * 0.4));
      const q2 = [p2[0] + Math.cos(a2) * reach2, y2, p2[2] + Math.sin(a2) * reach2];
      const q1 = [p2[0] + Math.cos(a2) * reach2 * 0.5, lerp(p2[1], y2, 0.7), p2[2] + Math.sin(a2) * reach2 * 0.5];
      // Round 6: the second and third forks thicker (0.36/0.15 -> 0.42/0.18
      // and 0.13/0.04 -> 0.2/0.07 of the bole's radius; same tube counts, no
      // triangles added). The crowns now show their forks — through the open
      // middle of the umbrella's lower tiers, between the flat acacia's two
      // tiers, under the clumps the flat gathers on its twig ends — and a
      // twig a centimetre across is a pixel at ten metres on the 640 frames:
      // the foliage hung in the sky with nothing visibly joining it to the
      // tree.
      wood.push(limb([p2, q1, q2], baseR * 0.42, baseR * 0.18, { radial: 5, segs: 3, vScale: 0.4 }));
      const terN = 1 + Math.floor(rnd() * 2 * fine);
      for (let k = 0; k < terN; k++) {
        const a3 = a2 + (rnd() - 0.5) * 1.5;
        const reach3 = R * (0.14 + rnd() * 0.16);
        const q3 = [q2[0] + Math.cos(a3) * reach3, q2[1] + thickH * (rnd() * 0.3 - 0.05), q2[2] + Math.sin(a3) * reach3];
        wood.push(limb([q2, q3], baseR * 0.2, baseR * 0.07, { radial: 4, segs: 2, vScale: 0.4 }));
        tips.push({ p: q3, a: a3 });
      }
      tips.push({ p: q2, a: a2 });
    }
  }
  // pull anything that has overshot the crown radius back inside it
  for (const t of tips) {
    const r = Math.hypot(t.p[0] - bx, t.p[2] - bz);
    if (r > R * 0.98) {
      const s = (R * 0.98) / r;
      t.p[0] = bx + (t.p[0] - bx) * s;
      t.p[2] = bz + (t.p[2] - bz) * s;
    }
  }
  return { wood, tips, bx, bz };
}

const UMBRELLAS = [
  // The flat-topped umbrella thorn. Wider than it is tall: a mature one is ten
  // metres across on a six metre tree, with a crown a metre and a half thick and
  // a browse line as flat as a table.
  // Cards 132 -> 180 -> 210 at three quarters the size: at 25 m fifteen large
  // cards read as plywood however they were painted; the same cover in more,
  // smaller sprays reads as foliage. The last step closes the gaps the smaller
  // cards opened when the crown is seen from underneath.
  // The lower two tiers are rings (`hollow`, see buildAcacia): the round-5
  // crown at 1280 was two plates on a fork, and with the middle of the lower
  // plates open the bole's forks rise through to the canopy top. Gathering
  // the lower fill on the twig ends was tried first (round 6): the forks
  // showed as well (clear rows through the crown at 1280 10.0 -> 12.0 px a
  // column) but as sky through the lens from the road — the near `forest`
  // crown fell from 46 to 36 % of its box in detached clumps. The rings hold
  // the lens closed from the side; the clear rows stay at HEAD's 10, and what
  // changes at 1280 is that the lower plate under the canopy dissolves into
  // clumps at the limb ends with the forks standing in the open middle.
  // Twenty cards more than round 5 (210 -> 230, +2 k triangles a view at
  // `fast`): the rings take the lower tiers' centres out of the side view's
  // depth, and the crown's sunward half, a stop and more up on `sunSide`,
  // no longer counts as crown against the sky — the spiral-laid crown
  // measured 44 % of its box at 210 against 46 at HEAD, 46 at 230.
  { name: 'umbrella', tiles: [0, 0, 0, 2], bark: 'acacia', height: [5.5, 8.5], trunk: 0.037, bole: [0.28, 0.4], spread: [0.72, 1.0], thick: [0.18, 0.26], dome: 0.4, limbs: [3, 5], cards: 230, broken: 0.1, hollow: [0.5, 0.35, 0] },
  // A younger, taller and narrower form of the same tree, the crown still
  // domed rather than flat. Round 5's lens was a quarter of the height thick
  // and its fill cards sat on three close layers, so at 1280 the crown was a
  // disc held up by a fork; the crown is deeper now and the fill stands on
  // two tiers — the limbs' ends at the top and a ring near the crown's foot —
  // with the forks reaching up through the gap between them.
  { name: 'flat', tiles: [0, 2, 0, 0], bark: 'acacia', height: [7, 10], trunk: 0.032, bole: [0.3, 0.42], spread: [0.5, 0.7], thick: [0.34, 0.46], dome: 0.7, limbs: [3, 4], cards: 170, broken: 0.05, tiers: [[0.18, 0.55], [0.8, 1.0]], cluster: 0.4 },
];

const ROUNDS = [
  // Marula, shepherd's tree, the odd wild fig: a heavy bole and a rounded
  // crown of real green. The tall one in a stand, and the one with shade under.
  { name: 'round', tiles: [1, 1, 1, 1], bark: 'marula', height: [9, 13], trunk: 0.034, crownStart: 0.36, crownR: 0.36, clumps: 58, perClump: 8, leafScale: 0.13 },
];

const THORNS = [
  // Scrub thorn: multi-stemmed from the ground, untidy, more twig than leaf.
  { name: 'thorn', tiles: [2, 2, 3, 0], bark: 'thorn', height: [2.6, 4.6], trunk: 0.028, stems: [3, 5], cards: 72 },
];

/** An umbrella acacia: the skeleton with a thin, flat-bottomed lens of foliage laid over its tips. */
function buildAcacia(spec, seed, detail = 1) {
  const rnd = mulberry32(seed);
  const height = lerp(spec.height[0], spec.height[1], rnd());
  const baseR = height * spec.trunk;
  const boleH = height * lerp(spec.bole[0], spec.bole[1], rnd());
  const R = height * lerp(spec.spread[0], spec.spread[1], rnd());
  const thickH = height * lerp(spec.thick[0], spec.thick[1], rnd());
  const crownTop = height;
  const crownBottom = height - thickH;
  const leanA = rnd() * Math.PI * 2;
  const leanAmt = height * (0.01 + rnd() * 0.05);
  const axis = (t) => [Math.cos(leanA) * leanAmt * t * t, Math.sin(leanA) * leanAmt * t * t];
  const { wood, tips, bx, bz } = acaciaSkeleton(rnd, { height, baseR, boleH, R, crownBottom, crownTop, limbs: spec.limbs, axis, broken: spec.broken });

  const cards = [];
  const keys = [];
  const tiers = [];
  const field = mosaicField(seed);
  // Which of the three tiers a card belongs to, by where it sits in the crown's
  // thickness. The tiers get their own shell normals below: the top tier faces
  // the sky, the middle faces out, the bottom faces the ground. One dome over
  // the whole lens gave the underside sky-facing normals, so it was lit by the
  // sky term like the top and the crown read as a single value right through —
  // a green disc with nothing under it, which is a card and not a tree.
  const tierOf = (y) => {
    const t = (y - crownBottom) / thickH;
    return t < 0.36 ? 0 : t < 0.64 ? 1 : 2;
  };
  const addCard = (geo) => {
    let c = cardCentre(geo);
    // A card whose centre stands past 0.92 R is slid back in along its own
    // radius. The tips are pulled inside 0.98 R below, but a spray *radiates*
    // from its tip by up to a third of R, so a rim card's centre sat well
    // outside the crown and one of them, on the round-4 and round-5 `forest`
    // frames both, read as a leaf card floating clear of the canopy.
    const cr = Math.hypot(c.x - bx, c.z - bz);
    if (cr > R * 0.92) {
      const k = (R * 0.92) / cr - 1;
      geo.translate((c.x - bx) * k, 0, (c.z - bz) * k);
      c = cardCentre(geo);
    }
    keys.push(field(c.x, c.y, c.z) + (rnd() - 0.5) * 0.22);
    tiers.push(tierOf(c.y));
    cards.push(geo);
  };
  // the crown surface: a low dome over a flat underside. y for a point at
  // normalised radius rn, with the rim thinning to a fringe
  const topAt = (rn) => crownBottom + thickH * (0.3 + 0.7 * (1 - Math.pow(rn, 2.2)) * spec.dome + 0.3 * (1 - spec.dome));
  const botAt = (rn) => crownBottom + thickH * 0.08 * (1 - rn) + thickH * 0.02;
  // Three layers through the thickness rather than a uniform spread: the fill
  // cards sit at 0.15, 0.5 or 0.85 of the way up, jittered by a tenth, so seen
  // from the road the crown is a stack of three overlapping fringes with sky
  // between them and not one plate.
  // `spec.tiers`, when given, is two spans of the thickness instead — a ring
  // near the crown's foot and the canopy top — with nothing between them but
  // the limbs: the skeleton's second forks end at 0.55 of the thickness and
  // the third at up to 0.8, so on a crown deep enough they stand clear
  // between the two, and the tree is foliage on a fork rather than a plate
  // held up by one.
  // `k` is the card's draw for its tier (the top tier is k >= 0.68, or the
  // upper span of `spec.tiers` at k >= 0.5); drawn by the caller, which lays
  // each tier on its own spiral and gathers only the lower ones.
  const tierY = (rn, k) => {
    if (spec.tiers) {
      const [lo, hi] = spec.tiers[k < 0.5 ? 0 : 1];
      return lerp(botAt(rn), topAt(rn), lerp(lo, hi, rnd()));
    }
    const centre = k < 0.36 ? 0.15 : k < 0.68 ? 0.5 : 0.85;
    return lerp(botAt(rn), topAt(rn), clamp(centre + (rnd() - 0.5) * 0.22));
  };

  // cards at the tips, radiating on from the fork the tip is
  for (const t of tips) {
    const rn = clamp(Math.hypot(t.p[0] - bx, t.p[2] - bz) / R);
    const n = Math.max(1, Math.round(2 * detail + rnd()));
    for (let j = 0; j < n; j++) {
      const a = t.a + (rnd() - 0.5) * 1.6;
      const len = R * (0.2 + rnd() * 0.14) * (1 - rn * 0.3);
      const y = lerp(botAt(rn), topAt(rn), 0.3 + rnd() * 0.6);
      const wid = len * (0.6 + rnd() * 0.3);
      const tile = pick(spec.tiles, rnd);
      const droop = -0.05 + (rnd() - 0.6) * 0.36 - rn * 0.1;
      // an upturned spray's far end stays under the dome: at the top of the
      // lens a 0.3 rad rise over a metre and a half of card put its tip
      // clear of the canopy, and edge-on that is a stroke drawn on the sky
      const rise = len * Math.sin(Math.max(0, -droop));
      addCard(
        spray(len, wid, tile, {
          origin: [t.p[0], Math.min(y, t.p[1] + thickH * 0.5, topAt(rn) - rise), t.p[2]],
          angle: a,
          // near level, a little upturned at the rim the way a real spray
          // reaches for light; rolled about its own axis so the lens has a
          // thickness seen from the side and is not one plane edge-on
          droop,
          r0: len * 0.05,
          roll: (rnd() - 0.5) * 1.5,
          bow: 0.14 + rnd() * 0.2,
          segs: [2, 1],
          mirror: rnd() < 0.5,
        }),
      );
    }
  }
  // fill across the lens so the tips do not have to close the disc alone: cards
  // laid over the surface with a slight outward bias, and a few short uprights
  // through the thickness so the crown is not one plane seen edge-on
  const fillN = Math.round(spec.cards * detail);
  // Each tier's fill is laid on a jittered golden-angle spiral over the disc,
  // not drawn at random. Random draws clump and leave holes: for the same
  // cards the disc covered less, and a card on its own at the rim or the top
  // stood clear of the rest against the sky — the detached clumps the round-6
  // review found on the near `forest` crown, and the floating leaf card of
  // rounds 4 and 5 before it. The spiral spends every card on new ground:
  // the same 210 cards took that crown's silhouette from 41.6 to 46.2 % of
  // its box with nothing detached, where the random fill at HEAD had 46.3 %
  // and two clumps standing off the mass. The jitter (0.4 of a cell in
  // radius, 0.3 rad in angle) and the cards' own size, roll and tile keep it
  // from reading as a lattice. A tier's spiral is sized to the cards it will
  // actually lay evenly: the share gathered on the wood (`cluster`) takes no
  // cell, so the even cards still reach the rim.
  // `hollow`, per tier, is the radius the tier's spiral starts at: the tier
  // is a ring and the wood shows through its middle. The umbrella's lower
  // two tiers are rings (0.5 R and 0.35 R): from under the crown the bole's
  // forks rise clear through the middle to the canopy top, which is how the
  // fork reaches into the crown, while from the side the near and far
  // halves of each ring cross and the lens stays closed. Gathering the lower
  // fill on the twig ends instead (`cluster`, the round-6 first try) opened
  // the same forks but as sky through the lens from the road — the near
  // `forest` crown fell from 46 to 36 % of its box in loose clumps, with the
  // twig that carried each one a pixel wide at ten metres.
  const tierShare = spec.tiers ? [0.5, 0.5] : [0.36, 0.32, 0.32];
  const tierIx = (k) => (spec.tiers ? (k < 0.5 ? 0 : 1) : k < 0.36 ? 0 : k < 0.68 ? 1 : 2);
  const gatherK = spec.tiers ? 0.5 : 0.68;
  const evenN = tierShare.map((sh, t) => {
    const lo = tierShare.slice(0, t).reduce((s, v) => s + v, 0);
    const gathered = spec.cluster && lo < gatherK ? spec.cluster : 0;
    return Math.max(1, Math.round(fillN * sh * (1 - gathered)));
  });
  const spiralJ = tierShare.map(() => 0);
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < fillN; i++) {
    let rn, a, x, z, y;
    const k = rnd();
    if (spec.cluster && k < gatherK && tips.length && rnd() < spec.cluster) {
      // Gathered on the wood rather than laid over the disc: a share of the
      // lower tiers' fill (`cluster`) sits within 0.26 R of one of the
      // skeleton's tips, through the thickness about the tip's own height,
      // so the foliage hangs in clumps where the branches end and the forks
      // have a gap to show through. The top tier is always even: an acacia
      // is closed on top and open underneath.
      const t = tips[Math.floor(rnd() * tips.length) % tips.length];
      const ca = rnd() * Math.PI * 2;
      const cr = Math.sqrt(rnd()) * R * 0.26;
      x = t.p[0] + Math.cos(ca) * cr;
      z = t.p[2] + Math.sin(ca) * cr;
      rn = clamp(Math.hypot(x - bx, z - bz) / R);
      a = Math.atan2(z - bz, x - bx);
      // held under the top quarter: a clump that reached the canopy top at
      // the rim was one more card alone against the sky
      y = clamp(t.p[1] + thickH * (rnd() - 0.4) * 0.5, botAt(rn), lerp(botAt(rn), topAt(rn), 0.75));
    } else {
      const t = tierIx(k);
      const j = spiralJ[t]++;
      const h = spec.hollow ? spec.hollow[t] || 0 : 0;
      rn = Math.sqrt(lerp(h * h, 1, clamp((j + 0.5 + (rnd() - 0.5) * 0.8) / evenN[t]))) * 0.96;
      a = j * GOLDEN + (rnd() - 0.5) * 0.6;
      x = bx + Math.cos(a) * rn * R;
      z = bz + Math.sin(a) * rn * R;
      y = tierY(rn, k);
    }
    const len = R * (0.18 + rnd() * 0.14) * (1 - rn * 0.25);
    if (i % 3 === 2) {
      const s = len * 0.7;
      // Held under the canopy top: an upright on the top tier stood 0.4 of
      // its height over the dome, and seen edge-on from the road that is a
      // dark line drawn above the crown.
      const yu = Math.min(y, topAt(rn) - s * 0.45);
      addCard(
        upright(s, s * 0.8, pick(spec.tiles, rnd), {
          origin: [x, yu - s * 0.4, z],
          angle: a,
          face: rnd() * Math.PI * 2,
          tilt: (rnd() - 0.5) * 0.8,
          bow: 0.2,
          segs: [1, 1],
          mirror: rnd() < 0.5,
        }),
      );
      continue;
    }
    addCard(
      spray(len, len * (0.6 + rnd() * 0.3), pick(spec.tiles, rnd), {
        origin: [x, y, z],
        angle: a + (rnd() - 0.5) * 2.4,
        droop: (rnd() - 0.5) * 0.5,
        r0: 0,
        roll: (rnd() - 0.5) * 1.6,
        bow: 0.14 + rnd() * 0.2,
        segs: [1, 1],
        mirror: rnd() < 0.5,
      }),
    );
  }

  const trunk = windWeight(merge(wood), (x, y) => clamp((y / height - 0.35) / 0.65) * 0.28);
  crownMosaic(cards, keys, CROWN_MOSAIC);
  // Shell normals per tier. The top is a dome seen from above (sky-facing,
  // leaning out toward the rim); the middle is the lens's edge, radial with a
  // little lift; the bottom is a dome seen from below, its normals pointing
  // out and *down* toward the ground so the underside takes the ground term
  // and the shadowed side of the key. That is the darker underside the crown
  // never had: the shade weight alone could only dim the sky it was wrongly
  // given, and at dusk a sky-facing underside is a lit underside.
  const tierGeo = [[], [], []];
  cards.forEach((g, i) => tierGeo[tiers[i]].push(g));
  const shells = [];
  if (tierGeo[2].length) shells.push(shellNormals(merge(tierGeo[2]), { mode: 'dome', centre: [bx, crownBottom - thickH * 0.4, bz], blend: 0.74, up: R * 0.55 }));
  if (tierGeo[1].length) shells.push(shellNormals(merge(tierGeo[1]), { mode: 'dome', centre: [bx, crownBottom + thickH * 0.5, bz], blend: 0.7, up: R * 0.12 }));
  // The underside's sphere centre was 1.4 thicknesses up, which on a lens
  // eight metres across gave a rim card underneath a near-horizontal normal:
  // it faced the 58 degree sun as squarely as a top card did, and from the
  // road the underside was as lit as the top. Higher, so the normals point
  // down at forty-five degrees or steeper across the whole underside.
  if (tierGeo[0].length) shells.push(shellNormals(merge(tierGeo[0]), { mode: 'sphere', centre: [bx, crownBottom + Math.max(thickH * 1.4, R * 0.9), bz], blend: 0.76 }));
  const foliage = merge(shells);
  windWeight(foliage, (x, y, z) => clamp(0.3 + (Math.hypot(x - bx, z - bz) / R) * 0.5));
  // top of the lens 1, underside 0, with the rim held near the middle so the
  // fringe keeps its own value and the split is a split of the mass
  crownWeight(foliage, (x, y, z) => {
    const t = clamp((y - crownBottom) / thickH);
    const rn = clamp(Math.hypot(x - bx, z - bz) / R);
    return lerp(t, 0.5, rn * rn * 0.5);
  });
  // buried-ness inside a lens: the underside and the middle are dark, the rim
  // and the top catch the sky. Noise at cluster scale on top.
  shadeWeight(foliage, (x, y, z) => {
    const rn = clamp(Math.hypot(x - bx, z - bz) / R);
    const t = clamp((y - crownBottom) / thickH);
    const n = fbm(x * 1.15 + y * 0.7 + 31.2, z * 1.15 - y * 0.45 + 17.7, { octaves: 3, period: 6, seed: seed & 255 });
    return 0.1 + 0.5 * (1 - t) + 0.36 * (1 - Math.pow(rn, 0.8)) + (n - 0.5) * 0.3;
  });
  return { trunk, foliage, height, radius: baseR, spread: R, bark: spec.bark, kind: 'acacia', name: spec.name };
}

/** A round-crowned tree: heavy bole, four or five limbs, a sphere of leaf clumps. */
function buildRoundTree(spec, seed, detail = 1) {
  const rnd = mulberry32(seed);
  const height = lerp(spec.height[0], spec.height[1], rnd());
  const baseR = height * spec.trunk;
  const maxR = height * spec.crownR;
  const trunkH = height * spec.crownStart;
  const leanA = rnd() * Math.PI * 2;
  const leanAmt = height * (0.01 + rnd() * 0.03);
  const axis = (t) => [Math.cos(leanA) * leanAmt * t * t, Math.sin(leanA) * leanAmt * t * t];

  const wood = [
    trunkGeo({
      height: trunkH * 1.05,
      baseR,
      tipR: baseR * 0.6,
      radial: 8,
      segs: 6,
      flare: 1.6,
      taper: 0.9,
      axis: (t) => axis(t * spec.crownStart),
      seed: seed * 29 + 5,
      uRepeat: 2,
      vScale: 0.32,
      bulge: 0.16,
    }),
  ];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rnd();
    const rr = baseR * (2.0 + rnd() * 1.6);
    wood.push(
      limb(
        [
          [Math.cos(a) * baseR * 0.5, baseR * 2.6, Math.sin(a) * baseR * 0.5],
          [Math.cos(a) * rr, -baseR * 0.8, Math.sin(a) * rr],
        ],
        baseR * 0.45,
        baseR * 0.1,
        { radial: 5, segs: 2, vScale: 0.35 },
      ),
    );
  }
  const tips = [];
  const limbN = 4 + Math.floor(rnd() * 2);
  const [tax, taz] = axis(spec.crownStart);
  for (let i = 0; i < limbN; i++) {
    const a = (i / limbN) * Math.PI * 2 + rnd() * 0.7;
    const reach = maxR * (0.55 + rnd() * 0.4);
    const rise = (height - trunkH) * (0.4 + rnd() * 0.35);
    const tip = new THREE.Vector3(tax + Math.cos(a) * reach, trunkH + rise, taz + Math.sin(a) * reach);
    tips.push(tip);
    wood.push(
      limb(
        [
          [tax, trunkH - baseR * 1.6, taz],
          [tax + Math.cos(a) * reach * 0.3, trunkH + rise * 0.45, taz + Math.sin(a) * reach * 0.3],
          [tip.x, tip.y, tip.z],
        ],
        baseR * 0.6,
        baseR * 0.14,
        { radial: 5, segs: 3, vScale: 0.4 },
      ),
    );
    for (let j = 0; j < 2; j++) {
      const a2 = a + (rnd() - 0.5) * 1.5;
      const l2 = reach * (0.18 + rnd() * 0.2);
      wood.push(
        limb(
          [
            [tax + Math.cos(a) * reach * 0.55, trunkH + rise * 0.7, taz + Math.sin(a) * reach * 0.55],
            [tax + Math.cos(a) * reach * 0.55 + Math.cos(a2) * l2, trunkH + rise * 0.7 + (height - trunkH) * (0.14 + rnd() * 0.16), taz + Math.sin(a) * reach * 0.55 + Math.sin(a2) * l2],
          ],
          baseR * 0.2,
          baseR * 0.06,
          { radial: 4, segs: 2, vScale: 0.4 },
        ),
      );
    }
  }

  const cards = [];
  const keys = [];
  const crownH = height - trunkH;
  const cyMid = trunkH + crownH * 0.5;
  const crownCentre = [tax, cyMid, taz];
  const clumpN = Math.round(spec.clumps * detail);
  for (let c = 0; c < clumpN; c++) {
    const tip = tips[c % tips.length];
    const ta = Math.atan2(tip.z - taz, tip.x - tax);
    const a = ta + (rnd() - 0.5) * 1.7;
    const v = rnd() * 2 - 1;
    const ring = Math.sqrt(Math.max(0, 1 - v * v));
    const rr = Math.pow(rnd(), 0.45);
    const cx = tax + Math.cos(a) * maxR * ring * rr;
    const cz = taz + Math.sin(a) * maxR * ring * rr;
    const cy = cyMid + v * crownH * 0.44 * (0.55 + rr * 0.55);
    const cs = height * spec.leafScale * (0.75 + rnd() * 0.5);
    const clumpKey = rnd();
    for (let j = 0; j < spec.perClump; j++) {
      const ja = rnd() * Math.PI * 2;
      const jr = cs * 0.24 * Math.sqrt(rnd());
      const size = cs * (0.6 + rnd() * 0.55);
      const ox = cx + Math.cos(ja) * jr;
      const oz = cz + Math.sin(ja) * jr;
      const oy = cy + (rnd() - 0.5) * cs * 0.4;
      keys.push(clumpKey + (rnd() - 0.5) * 0.28);
      if (j % 5 < 2) {
        cards.push(
          upright(size * 0.95, size * 1.08, pick(spec.tiles, rnd), {
            origin: [ox, oy - size * 0.5, oz],
            angle: ja,
            face: rnd() * Math.PI * 2,
            tilt: (rnd() - 0.5) * 0.4,
            bow: 0.2,
            segs: [1, 1],
          }),
        );
      } else {
        cards.push(
          spray(size, size * 0.72, pick(spec.tiles, rnd), {
            origin: [ox, oy, oz],
            angle: ja + (rnd() - 0.5) * 1.2,
            droop: (rnd() - 0.35) * 1.1,
            r0: 0,
            roll: (rnd() - 0.5) * 1.8,
            bow: 0.18 + rnd() * 0.2,
            segs: j < 1 ? [2, 2] : [1, 1],
          }),
        );
      }
    }
  }

  const trunk = windWeight(merge(wood), (x, y) => clamp((y / height - 0.3) / 0.7) * 0.3);
  const foliage = shellNormals(merge(crownMosaic(cards, keys, CROWN_MOSAIC)), { mode: 'sphere', centre: crownCentre, blend: 0.78 });
  windWeight(foliage, (x, y, z) => clamp(0.35 + Math.hypot(x - crownCentre[0], z - crownCentre[2]) * 0.09));
  crownWeight(foliage, (x, y) => (y - trunkH) / crownH);
  shadeWeight(foliage, (x, y, z) => {
    const rn = Math.hypot(x - crownCentre[0], (y - crownCentre[1]) * 0.8, z - crownCentre[2]) / maxR;
    const n = fbm(x * 1.15 + y * 0.7 + 12.6, z * 1.15 - y * 0.45 - 44.1, { octaves: 3, period: 6, seed: seed & 255 });
    return (1 - Math.pow(clamp(rn), 0.7) * 0.95) * (1.02 - clamp((y - trunkH) / (height - trunkH)) * 0.26) + 0.12 + (n - 0.5) * 0.34;
  });
  return { trunk, foliage, height, radius: baseR, spread: maxR, bark: spec.bark, kind: 'round', name: spec.name };
}

/** Scrub thorn: several stems from the ground, each a bent limb forking into twigs, with sparse foliage over the top third. */
function buildThornTree(spec, seed, detail = 1) {
  const rnd = mulberry32(seed);
  const height = lerp(spec.height[0], spec.height[1], rnd());
  const baseR = height * spec.trunk;
  const wood = [];
  const tips = [];
  const stemN = spec.stems[0] + Math.floor(rnd() * (spec.stems[1] - spec.stems[0] + 1));
  const R = height * 0.5;
  for (let i = 0; i < stemN; i++) {
    const a = (i / stemN) * Math.PI * 2 + rnd() * 1.2;
    const h1 = height * (0.55 + rnd() * 0.3);
    const out1 = R * (0.35 + rnd() * 0.3);
    const p0 = [Math.cos(a) * baseR * 1.2, -0.05, Math.sin(a) * baseR * 1.2];
    const p1 = [Math.cos(a) * out1 * 0.4, h1 * 0.55, Math.sin(a) * out1 * 0.4];
    const p2 = [Math.cos(a) * out1, h1, Math.sin(a) * out1];
    wood.push(limb([p0, p1, p2], baseR * (0.7 + rnd() * 0.4), baseR * 0.25, { radial: 5, segs: 4, uRepeat: 1, vScale: 0.6 }));
    const forkN = 2 + Math.floor(rnd() * 2);
    for (let j = 0; j < forkN; j++) {
      const a2 = a + (rnd() - 0.5) * 2.0;
      const l2 = R * (0.25 + rnd() * 0.3);
      const q = [p2[0] + Math.cos(a2) * l2, Math.min(height, p2[1] + l2 * (0.4 + rnd() * 0.6)), p2[2] + Math.sin(a2) * l2];
      wood.push(limb([p2, q], baseR * 0.24, baseR * 0.06, { radial: 4, segs: 2, vScale: 0.6 }));
      tips.push({ p: q, a: a2 });
      if (rnd() < 0.6) {
        const a3 = a2 + (rnd() - 0.5) * 1.6;
        const l3 = l2 * 0.6;
        const q3 = [q[0] + Math.cos(a3) * l3, q[1] + l3 * (rnd() * 0.5), q[2] + Math.sin(a3) * l3];
        wood.push(limb([q, q3], baseR * 0.07, baseR * 0.025, { radial: 4, segs: 1, vScale: 0.6 }));
        tips.push({ p: q3, a: a3 });
      }
    }
  }
  const cards = [];
  const keys = [];
  const field = mosaicField(seed);
  const n = Math.round(spec.cards * detail);
  for (let i = 0; i < n; i++) {
    const t = tips[i % tips.length];
    const len = height * (0.2 + rnd() * 0.14);
    // half the sprays sit back down the fork rather than at its tip, so the
    // bush is a mass and not a ring of tufts on the ends of sticks
    const back = i % 2 ? 0.35 + rnd() * 0.4 : 0;
    const g = spray(len, len * 0.7, pick(spec.tiles, rnd), {
      origin: [t.p[0] * (1 - back) + (rnd() - 0.5) * len * 0.4, t.p[1] * (1 - back * 0.5) + (rnd() - 0.6) * len * 0.5, t.p[2] * (1 - back) + (rnd() - 0.5) * len * 0.4],
      angle: t.a + (rnd() - 0.5) * 2.6,
      droop: (rnd() - 0.5) * 0.9,
      r0: 0,
      roll: (rnd() - 0.5) * 1.6,
      bow: 0.2,
      segs: [1, 1],
      mirror: rnd() < 0.5,
    });
    const c = cardCentre(g);
    keys.push(field(c.x, c.y, c.z) + (rnd() - 0.5) * 0.3);
    cards.push(g);
  }
  const trunk = windWeight(merge(wood), (x, y) => clamp(y / height) * 0.4);
  const foliage = shellNormals(merge(crownMosaic(cards, keys, CROWN_MOSAIC)), { mode: 'sphere', centre: [0, height * 0.7, 0], blend: 0.6 });
  windWeight(foliage, (x, y) => clamp(0.4 + (y / height) * 0.5));
  crownWeight(foliage, (x, y) => (y / height - 0.45) / 0.55);
  shadeWeight(foliage, (x, y, z) => {
    const rn = Math.hypot(x, (y - height * 0.72) * 1.4, z) / (R + 0.2);
    return 0.1 + (1 - clamp(rn)) * 0.6;
  });
  return { trunk, foliage, height, radius: baseR, spread: R, bark: spec.bark, kind: 'thorn', name: spec.name };
}

/** A dead acacia: the skeleton alone, most limbs snapped, pale weathered wood. */
function buildDeadTree(seed) {
  const rnd = mulberry32(seed);
  const height = 5 + rnd() * 5;
  const baseR = height * (0.03 + rnd() * 0.01);
  const boleH = height * (0.3 + rnd() * 0.14);
  const R = height * (0.55 + rnd() * 0.3);
  const leanA = rnd() * Math.PI * 2;
  const leanAmt = height * (0.02 + rnd() * 0.06);
  const axis = (t) => [Math.cos(leanA) * leanAmt * t * t, Math.sin(leanA) * leanAmt * t * t];
  const { wood } = acaciaSkeleton(rnd, { height, baseR, boleH, R, crownBottom: height * 0.82, crownTop: height, limbs: [3, 5], axis, broken: 0.3, fine: 1.4 });
  const trunk = windWeight(merge(wood), (x, y) => clamp((y / height - 0.6) / 0.4) * 0.08);
  return { trunk, foliage: null, height, radius: baseR, spread: R, bark: 'dead', kind: 'dead', name: 'dead' };
}

// ---------------------------------------------------------------------------
// Undergrowth prototypes
// ---------------------------------------------------------------------------

/**
 * A plant built from several bowed, offset, differently-tiled cards.
 *
 * Two things stop this reading as paper a metre from the lens. The cards are
 * given their own footprint in X *and* Z rather than being stacked on one axis,
 * with the tall ones set back and the short ones forward so the silhouette has
 * layers; and every vertex is tagged with how buried it is, so the crown of the
 * plant catches sky while its base stays in its own shadow.
 */
/**
 * `form` picks how the cards are arranged, not just how big they are. Every
 * clump being a fan of full-height cards springing from one point is a single
 * silhouette however much the width and height are jittered, and a verge of them
 * reads as a row of identical agaves. These are four different plants.
 */
function plantClump(
  w,
  h,
  tiles,
  { seed = 1, planes = 3, bow = 0.3, segs = [1, 2], spread = 0.18, shell = 0.5, lean = 0.34, form = 'rosette', collar = 0, reach = 1, ragged = 1 } = {},
) {
  const rnd = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < planes; i++) {
    // golden-angle rather than even spacing: evenly fanned planes line up into
    // a star when the plant is seen from above, which the wheel view does
    const a = i * 2.399 + rnd() * 0.5;
    const t = i / Math.max(1, planes - 1);
    let sw = w * (0.6 + rnd() * 0.62);
    // `ragged` widens the card-to-card height spread about the same mean (1
    // is the plain's tuft; the lawn runs 1.6 so a sod's top edge steps card
    // to card instead of closing into a dome), and leans and pitches the
    // cards further for the same reason.
    const hj = rnd();
    let sh = h * (0.56 + (1 - t) * 0.34 + 0.25 + (hj - 0.5) * 0.5 * ragged);
    let tip = (rnd() - 0.5) * lean * ragged;
    let rr = (0.18 + t * 0.82) * spread * w;
    let base = -h * 0.03 - t * h * 0.04;

    // Ten degrees of pitch either way leaves every card near vertical, and a
    // clump of near-vertical cards seen from a camera above it foreshortens into
    // a flat plate — which is how a fern read as a fan lying in the duff. Twenty
    // is enough for the clump to hold volume from above without any card
    // reaching a grazing angle to the ground.
    let pitch = (rnd() - 0.5) * 0.7 * ragged;

    if (form === 'arch') {
      // sword fern: long fronds springing from a tight crown and bending over, so
      // the silhouette is a fountain with its tips below its shoulder
      sh = h * (0.82 + rnd() * 0.5);
      tip = (0.62 + rnd() * 0.5) * (i % 2 ? 1 : -1);
      rr = spread * w * (0.1 + rnd() * 0.3);
    } else if (form === 'patch') {
      // salal thicket: no centre at all, bases scattered across a wide footprint
      // at mixed heights, so the top edge is ragged rather than domed
      sh = h * (0.42 + rnd() * 0.85);
      sw = w * (0.5 + rnd() * 0.5);
      tip = (rnd() - 0.5) * lean * 1.5;
      pitch = (rnd() - 0.5) * 0.95;
      rr = spread * w * (0.5 + rnd() * 1.9);
      base = -h * 0.02;
    } else if (form === 'tier') {
      // huckleberry: two or three distinct storeys, each smaller than the one
      // below, which gives a stepped profile instead of a smooth cone
      const tierN = Math.floor(t * 2.99);
      sh = h * (0.4 + rnd() * 0.3);
      sw = w * (0.85 - tierN * 0.2) * (0.7 + rnd() * 0.5);
      tip = (rnd() - 0.5) * lean * 0.7;
      rr = spread * w * (0.8 - tierN * 0.2);
      base = h * tierN * 0.29;
    } else if (form === 'sprawl') {
      // Trailing bramble: cards laid over toward horizontal on long runners, so
      // the plant is a mat with almost no height. Nothing else on this floor has
      // a flat silhouette, and a bed of domes needs something to sit between.
      //
      // The long dimension has to be the card's *height*, because `tip` swings
      // the card about its base and at the 60-80 degrees this form uses that puts
      // whichever axis was vertical along the ground and whichever was horizontal
      // standing up. Sized off w the other way round, a mat prototype 40 cm high
      // was building cards over two metres wide and standing them on edge — and
      // one of those a metre and a half from a beauty camera is a pale plank
      // straight up the middle of the frame.
      sh = w * (0.5 + rnd() * 0.42);
      sw = h * (0.9 + rnd() * 0.7);
      tip = (1.0 + rnd() * 0.42) * (i % 2 ? 1 : -1);
      // wider than the other forms, because a card laid this flat and left square
      // to the ground is a plate when the camera looks down on it
      pitch = (rnd() - 0.5) * 1.15;
      rr = spread * w * (0.7 + rnd() * 1.6);
      base = -h * 0.06;
    } else if (form === 'spire') {
      // a young shoot: two or three narrow cards standing well above their own
      // width. A verge of clumps as wide as they are tall has one rhythm, and a
      // vertical is the cheapest thing that breaks it.
      sh = h * (0.72 + rnd() * 0.62);
      sw = w * (0.34 + rnd() * 0.34);
      tip = (rnd() - 0.5) * lean * 0.45;
      pitch = (rnd() - 0.5) * 0.2;
      rr = spread * w * (0.06 + rnd() * 0.34);
    } else if (form === 'shelf') {
      // vine maple / salal in shade: two flat storeys held out sideways, so the
      // plant is mostly horizontal surface seen from above and edge-on from a low
      // camera. The strongest silhouette change available from one card set.
      // Sized the same way round as sprawl, and for the same reason.
      const tierN = i % 2;
      sh = w * (0.55 + rnd() * 0.42);
      sw = h * (0.62 + rnd() * 0.5);
      tip = (0.85 + rnd() * 0.5) * (rnd() < 0.5 ? 1 : -1);
      pitch = (rnd() - 0.5) * 0.5;
      rr = spread * w * (0.4 + rnd() * 1.1);
      base = h * (0.06 + tierN * 0.42);
    } else if (form === 'fan') {
      // every card in roughly one vertical plane: broad from one side, a line
      // from the other, so two neighbours at different yaws do not look alike
      sh = h * (0.95 + (rnd() - 0.5) * 0.7 * ragged);
      sw = w * (0.5 + rnd() * 0.5);
      tip = (t - 0.5) * 1.5 * lean * 2.2;
      rr = spread * w * (t - 0.5) * 2.2;
      parts.push(
        (() => {
          const s2 = sh > sw * 1.15 ? segs : [segs[0], 1];
          const g = foliageCard(sw, sh, tiles[i % tiles.length], { bow: bow * (0.7 + rnd() * 0.8), segs: s2, mirror: rnd() < 0.5 });
          g.translate(0, sh * 0.5, 0);
          g.rotateZ(tip);
          g.rotateX(pitch);
          g.translate(rr, base, (rnd() - 0.5) * w * 0.14);
          return g;
        })(),
      );
      continue;
    }

    // A card only needs the extra row of vertices if it is tall enough for the
    // bow to be visible along it. Half the forms here are short and wide, and
    // giving those four triangles instead of two was a hundred thousand of them
    // across the scatter for a curve nothing could see.
    const cardSegs = sh > sw * 1.15 ? segs : [segs[0], 1];
    const g = foliageCard(sw, sh, tiles[i % tiles.length], { bow: bow * (0.7 + rnd() * 0.8), segs: cardSegs, mirror: rnd() < 0.5 });
    g.translate(0, sh * 0.5, 0);
    g.rotateZ(tip);
    g.rotateX(pitch);
    g.rotateY(a);
    g.translate(Math.cos(a * 1.7) * rr + (rnd() - 0.5) * w * 0.12, base, Math.sin(a * 1.7) * rr + (rnd() - 0.5) * w * 0.12);
    parts.push(g);
  }
  const geo = shellNormals(merge(parts), { mode: 'dome', centre: [0, h * 0.2, 0], blend: shell, up: h * 0.5 });
  windWeight(geo, (x, y) => clamp(y / h) * 1.0);
  // a sprawl is a mat, and every vertex of a mat is in the bottom third of a
  // plant of its nominal height: at the full band the whole bush went to soil
  rootWeight(geo, form === 'sprawl' ? h * 0.3 : h);
  // a bush has a top and an underside the way a crown does, at a fraction of
  // the crown's split (the material decides how much). `reach` is how far up
  // the card the painting's blades go (the tile's `tall`): the short khaki
  // tuft stops at 0.6 of its tile, and with the weight running over the whole
  // card its tips sat at 0.6 and the tuft self-shadow (uTuftAO) took the whole
  // plant down a third instead of grading it root to tip.
  crownWeight(geo, (x, y) => y / (h * reach));
  // steeper toward the base than it was: a clump lit evenly from root to tip has
  // no weight on the ground and the verge reads as a tray of cut parsley
  shadeWeight(geo, (x, y, z) => 1.0 - Math.pow(clamp(y / h), 0.62) * 0.82 - Math.hypot(x, z) / (w * 0.75) * 0.18);
  if (!collar) return geo;
  return merge([geo, collarCard(w * collar, tiles[0])]);
}

/**
 * The trodden earth under a clump: a flat card at the base, a little domed so
 * it clears the ground it is sunk into, tagged aRoot 2 at its centre and 1 at
 * its rim. The foliage shader recognises the range and paints soil with an
 * alpha that falls off along that radius — the card itself only borrows a
 * fully painted strip of the plant's tile so the sampler has something to
 * return. Part of the clump's own geometry, so it costs eight triangles and no
 * draw call, and it moves with the plant on a slope. Every critic put the same
 * sentence differently: the tufts sit *on* the ground. This is what sits them
 * in it.
 */
function collarCard(size, tile) {
  const g = new THREE.PlaneGeometry(size, size, 2, 2);
  const pos = g.attributes.position;
  const n = pos.count;
  const root = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = pos.getX(i) / size;
    const v = pos.getY(i) / size;
    const r = Math.min(1, Math.hypot(u, v) * 2);
    // rim held just above 1 so interpolation never drops a fragment out of
    // the collar branch and into the root-darkening one
    root[i] = 2 - r * 0.98;
    // domed 4 cm at the centre so the card clears the sunk base of the plant
    pos.setZ(i, 0.05 + (1 - r) * 0.04);
  }
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  const [ox, oy, sw, sh] = atlasTile(tile);
  // the bottom fifth of a grass tile, which is where the painting is solid
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + (0.3 + uv.getX(i) * 0.4) * sw, oy + uv.getY(i) * 0.18 * sh);
  g.computeVertexNormals();
  g.setAttribute('aRoot', new THREE.BufferAttribute(root, 1));
  g.setAttribute('aCrown', new THREE.BufferAttribute(new Float32Array(n).fill(0.5), 1));
  windWeight(g, () => 0);
  return shadeWeight(g, () => 0.45);
}

/**
 * Flat ground clutter. Slightly domed with the rim dropped, so the edge of the
 * card tucks under the dirt instead of hovering at a grazing angle.
 */
function groundCard(size, tile) {
  const g = new THREE.PlaneGeometry(size, size, 2, 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / size;
    const v = pos.getY(i) / size;
    pos.setZ(i, (0.5 - Math.max(Math.abs(u), Math.abs(v))) * size * 0.03);
  }
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  const [ox, oy, sw, sh] = atlasTile(tile, 0.02);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) * sw, oy + uv.getY(i) * sh);
  g.computeVertexNormals();
  windWeight(g, () => 0);
  return shadeWeight(g, () => 0.3);
}

function rockGeo(seed, detail = 1, style = 'boulder') {
  const g = new THREE.IcosahedronGeometry(0.5, detail);
  const pos = g.attributes.position;
  const rnd = mulberry32(seed);
  const ph = [rnd() * 10, rnd() * 10, rnd() * 10];
  const flat = style === 'slab' ? 0.34 : style === 'cobble' ? 0.68 : 0.82;
  const facet = style === 'angular' ? 0.42 : 0.2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm(x * 3 + ph[0], z * 3 + ph[1], { octaves: 3, period: 8, seed: seed & 255 });
    const s = 0.7 + n * 0.75;
    const q = facet > 0.3 ? 1 + Math.round((x + y + z) * 2) * 0.06 : 1;
    pos.setXYZ(i, x * s * q, y * s * flat * q, z * s * (0.85 + n * 0.4) * q);
  }
  boxUV(g, 0.9);
  g.computeVertexNormals();
  return g;
}

/**
 * A termite mound: a broad lumpy cone with a couple of chimneys, its foot
 * flaring into the ground. Built once per prototype and instanced.
 */
function termiteGeo(seed) {
  const rnd = mulberry32(seed);
  // A dome, not a cone: the pointed mound is the cartoon, and a cone at grass
  // height reads as a traffic marker. Tall hemisphere, lumped, foot flared.
  const g = new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = g.attributes.position;
  const ph = rnd() * 10;
  const leanA = rnd() * Math.PI * 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) * 2;
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const lump = fbm(Math.cos(a) * 1.6 + ph, y * 2.2 + Math.sin(a) * 1.6, { octaves: 3, period: 6, seed: seed & 255 });
    // the buttresses and rain rills that keep a mound from reading as a cone:
    // a ridged term round the circumference, strongest on the lower half
    const rib = ridged(a * 1.1 + ph, y * 1.5, { octaves: 2, period: 7, seed: (seed >> 3) & 255 }) - 0.5;
    // fat at the foot, the top leaning a little, the rim of the base flared
    const s = (1.2 + (lump - 0.5) * 1.1 + rib * 0.36 * (1 - y * 0.6)) * (1 + Math.pow(1 - y, 4) * 0.5);
    const lean = y * y * 0.16;
    // squatter than the hemisphere: the crown is a rounded shoulder, not a peak
    const yy = y * 0.94 - 0.08 + (lump - 0.5) * 0.2 * y;
    pos.setXYZ(i, x * s + Math.cos(leanA) * lean, yy, z * s + Math.sin(leanA) * lean);
  }
  // chimneys: one or two of the dome's own upper vertices pulled up into
  // stubby turrets, so they are part of the mound and shade with it
  // one mound in three has none, and is a plain loaf
  const chimneys = rnd() < 0.2 ? 0 : 1 + Math.floor(rnd() * 2);
  for (let c = 0; c < chimneys; c++) {
    const ca = rnd() * Math.PI * 2;
    const cx = Math.cos(ca) * 0.2;
    const cz = Math.sin(ca) * 0.2;
    const tall = 0.18 + rnd() * 0.2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y < 0.45) continue;
      const d = Math.hypot(x - cx, z - cz);
      const k = Math.max(0, 1 - d / 0.2);
      // rounded cap on the turret rather than a spike
      pos.setXYZ(i, x, y + Math.sqrt(k) * k * tall, z);
    }
  }
  const parts = [g];
  const geo = merge(parts);
  boxUV(geo, 1.2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Two crossed cards of a grass bank, for the mid distance. Wide and low: one of
 * these stands in for a dozen tufts once a tuft is a few pixels across.
 */
function swathGeo(w, h, tiles, seed, { cards = 2, spread = 0.2 } = {}) {
  const rnd = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < cards; i++) {
    // the cards of one bank differ in height as well as yaw, so the top edge
    // steps instead of running level; a third card leans a little
    const hh = h * (0.7 + rnd() * 0.55);
    const g = foliageCard(w * (0.75 + rnd() * 0.45), hh, tiles[i % tiles.length], { bow: 0.08, segs: [2, 1], mirror: rnd() < 0.5 });
    g.translate(0, hh * 0.5 - 0.02, 0);
    if (i === 2) g.rotateX((rnd() - 0.5) * 0.3);
    g.rotateY(i * (Math.PI / cards) * 0.86 + (rnd() - 0.5) * 0.5);
    g.translate((rnd() - 0.5) * w * spread, 0, (rnd() - 0.5) * w * spread);
    parts.push(g);
  }
  const geo = shellNormals(merge(parts), { mode: 'dome', centre: [0, 0, 0], blend: 0.6, up: h * 2 });
  windWeight(geo, (x, y) => clamp(y / h) * 0.9);
  rootWeight(geo, h);
  return shadeWeight(geo, (x, y) => 0.75 - Math.pow(clamp(y / h), 0.7) * 0.6);
}

/**
 * How close to the soil a vertex is, 1 at the base and 0 from 30% of the
 * plant's height up. The foliage shader pulls the albedo toward the soil colour
 * with it, so a tuft grows out of the ground it stands on instead of sitting
 * on it with a hard bright line where the card meets the dirt.
 */
function rootWeight(geo, h) {
  const pos = geo.attributes.position;
  const w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) w[i] = clamp(1 - pos.getY(i) / (h * 0.3));
  geo.setAttribute('aRoot', new THREE.BufferAttribute(w, 1));
  return geo;
}

// ---------------------------------------------------------------------------
// Scatter
// ---------------------------------------------------------------------------

export function createForest({
  terrain,
  env = null,
  treeCount = 210,
  clearRadius = 7.4,
  area = 250,
  clearings = [],
  quality = 'high',
} = {}) {
  const Q = QUALITY[quality] || QUALITY.high;
  // before the first atlas is asked for: the generators are memoised on a key
  // that includes the cell size
  setFoliageDetail(Q.atlas, Q.aniso);
  const group = new THREE.Group();
  group.name = 'forest';
  // One stream for the whole forest, so every plant's place is a function of
  // how many draws came before it. Rebindable (`let`) for scatter's make-up
  // pass, which draws from a stream of its own: a count change at one site
  // would otherwise re-lay every plant scattered after it, and the pride's
  // lawn is scattered before the hero's verge.
  let rnd = mulberry32(20260726);
  const density = clamp(treeCount / 210, 0.35, 1.6);
  const span = Math.max(area, terrain.size * 0.96) * 0.5;

  // --- layout ----------------------------------------------------------------
  // Everything that has a place in the world reads it from WORLD, in road
  // parameters, so the vegetation follows the roads wherever they are drawn.
  const camp = anchorPoint(terrain, WORLD.camp);
  const campR = WORLD.camp.radius;
  const lions = anchorPoint(terrain, WORLD.lions);
  const lionR = WORLD.lions.spread;
  const lionSide = WORLD.lions.side ?? 1;
  // The kopje the pride is composed against: beyond them, away from the road,
  // so a viewer at the roadside sees lions, grass, rock, sky in that order.
  const kopjes = [
    { x: lions.x + lions.lx * lionSide * 34, z: lions.z + lions.lz * lionSide * 34, r: 9, seed: 9001 },
    // two more as landmarks, off both roads
    (() => {
      const p = anchorPoint(terrain, { road: 'main', t: 0.3, side: 1, offset: 58 });
      return { x: p.x, z: p.z, r: 11, seed: 9203 };
    })(),
    (() => {
      const p = anchorPoint(terrain, { road: 'trail', t: 0.72, side: -1, offset: 52 });
      return { x: p.x, z: p.z, r: 8, seed: 9307 };
    })(),
  ];
  // the two trees the lions lie between, and their shade
  const lionTrees = [-1, 1].map((s) => ({
    x: lions.x + lions.tx * s * (lionR + 9) + lions.lx * lionSide * 6,
    z: lions.z + lions.tz * s * (lionR + 9) + lions.lz * lionSide * 6,
  }));

  const inCamp = (x, z, m = 1) => Math.hypot(x - camp.x, z - camp.z) < campR * m;
  const nearLions = (x, z, m = 1) => Math.hypot(x - lions.x, z - lions.z) < lionR * m;
  const kopjeDist = (x, z) => {
    let best = 1e9;
    for (const k of kopjes) best = Math.min(best, Math.hypot(x - k.x, z - k.z) - k.r);
    return best;
  };
  const inClearing = (x, z) => {
    for (const c of clearings) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r) return 1 - d / c.r;
    }
    return 0;
  };

  /**
   * Where along the mainline a point sits, as a curve parameter, and how far off
   * it. The savanna opens with t: the trees thin out toward WORLD.savanna.tFrom
   * and the grassland runs from there. Sampled once and searched directly, the
   * same way roadYaw does it for the trail.
   */
  const mainT = (() => {
    const N = 256;
    const px = new Float32Array(N);
    const pz = new Float32Array(N);
    const hasMain = !!terrain.mainPoint;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const p = hasMain ? terrain.mainPoint(t) : terrain.roadPoint(t);
      px[i] = p.x;
      pz[i] = p.z;
    }
    return (x, z) => {
      let best = 1e9;
      let bi = 0;
      for (let i = 0; i < N; i++) {
        const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2;
        if (d < best) {
          best = d;
          bi = i;
        }
      }
      return { t: bi / (N - 1), d: Math.sqrt(best) };
    };
  })();
  const tFrom = WORLD.savanna.tFrom;
  const openNoise = (x, z) => fbm(x * 0.03 + 61, z * 0.03 + 29, { octaves: 3, period: 32, seed: 1616 });
  /** 0 in the wooded start, 1 in the open grassland, with a noisy edge. */
  const openAt = (x, z) => {
    const { t } = mainT(x, z);
    const along = smoothstep(tFrom - 0.26, tFrom + 0.04, t);
    return clamp(along * 0.9 + (openNoise(x, z) - 0.5) * 0.5 + 0.05);
  };

  // --- placement fields -----------------------------------------------------
  // drainage lines: where the green trees and the green grass are
  // Where the ground is damp enough for green: the water hole's basin and the
  // river's banks, taken from the terrain where it offers them, plus a weak
  // drainage pattern so the plain has the odd greener hollow — but only the
  // odd one. Green tufts spread across a straw plain are what read as lawn.
  const hole = terrain.waterHole;
  const river = terrain.riverbed?.distance ? terrain.riverbed : null;
  const waterNear = (x, z) => {
    let w = 0;
    if (hole) {
      const basin = hole.basinRadius ?? 22;
      w = Math.max(w, 1 - smoothstep(basin, basin + 18, Math.hypot(x - hole.x, z - hole.z)));
    }
    if (river) {
      const rv = river.distance(x, z);
      const edge = (river.halfWidth ?? 4) + (river.bankWidth ?? 3);
      if (rv.along > 6 && rv.along < rv.total - 6) w = Math.max(w, 1 - smoothstep(edge, edge + 9, rv.d));
    }
    return w;
  };
  const wet = (x, z) => Math.max(waterNear(x, z), fbm(x * 0.02 + 21, z * 0.02 + 3, { octaves: 3, period: 32, seed: 808 }) * 0.78);
  // browning and death, in patches
  const dieback = (x, z) => fbm(x * 0.045 + 41, z * 0.045 + 17, { octaves: 3, period: 32, seed: 1212 });
  // trees clump: a savanna's trees stand in loose groves with open ground between
  const grove = (x, z) => fbm(x * 0.05 + 5, z * 0.05 + 9, { octaves: 3, period: 32, seed: 404 });
  // bare earth: red ground showing through where the grass has failed
  const bareField = (x, z) => smoothstep(0.6, 0.8, fbm(x * 0.07 - 88.5, z * 0.07 + 41.3, { octaves: 3, period: 9, seed: 2727 }));

  // --- materials ------------------------------------------------------------
  const barkMats = {
    acacia: barkMaterial(barkMaps('acacia'), { normalScale: 1.5 }),
    marula: barkMaterial(barkMaps('marula'), { normalScale: 1.2, mossMax: 0.4 }),
    thorn: barkMaterial(barkMaps('thorn'), { normalScale: 1.2, mossMax: 0.2 }),
    // bleached wood ramps toward a pale grey: a dead acacia at 60 m is a silver
    // skeleton against the plain, the one tree that is lighter than its ground
    dead: barkMaterial(deadWoodMaps(), { mossMax: 0, normalScale: 1.5, windAmp: 0.02, haze: 0.82, hazeK: 0.19, hazeK2: 0.66, canopy: [0.9, 1.0], skyRim: 0.6 }),
    log: barkMaterial(logBarkMaps(), { mossMax: 0, normalScale: 1.9, windAmp: 0, deadfall: true, grainRepeat: 3.2, haze: 0.85, hazeK: 0.15, hazeK2: 0.5 }),
    endGrain: barkMaterial(endGrainMaps(), { mossMax: 0, normalScale: 1.2, windAmp: 0, deadfall: true, grainRepeat: 0, haze: 0.85, hazeK: 0.15, hazeK2: 0.5 }),
  };
  const fx = (glossy = 1, grain = 1) => ({ sheen: Q.sheen * glossy, bump: Q.bump * grain });
  // The tree canopy. A thin flat crown is mostly rim from any angle, so the
  // sky term is kept up and the transmission is real: an acacia crown against
  // the sun is a gold fringe, and that is the single most recognisable thing
  // about the tree.
  const acaciaMat = foliageMaterial(acaciaAtlas(), {
    ...fx(1.0, 1.1),
    // Cut higher than the ground cover: at 0.27 the faint fill between the
    // leaf clusters survived and a card at thirteen metres was a solid
    // camouflage plate with no sky through it. At 0.34 the card is its
    // clusters, with holes between them, which is what a spray is.
    alphaTest: 0.34,
    // The mip-fill at the material default (0.34) was what closed the ragged
    // fringe of a card back up into a slab by twenty metres. Lowered: the
    // ragged tile edge in nature.js is only worth having if it survives the
    // first two mip levels, and this crown is 0.4 covered, not a conifer's
    // texel-wide needles. (Slightly above the first cut at 0.16 to pay for
    // the higher alphaTest at forty metres and beyond.)
    mipFill: 0.2,
    // Transmission up and in a leaf's yellow-green: the shader now bounds it
    // at half of what the lit face returns (1.5x, no bleach), and scales it by
    // the key's strength this hour, so this can be a real value. At dusk the
    // rim of a crown against the sun is a fifth brighter and greener than the
    // shade beside it, which is what a thin acacia crown does.
    // Relative to the lit face now (see the shader): a thin bipinnate leaf
    // passes about as much as it reflects, and with the forward peak the rim
    // of a crown against a six-degree sun is a dark gold instead of a hole.
    trans: 1.1,
    transMax: 0.8,
    transPeak: 2.5,
    // Round 5 (see the shader): the dusk crown was 3.2 stops under the sky
    // with rim = interior, and ablation put the whole of the key's share of a
    // dusk crown in this term — the leaf's own lit face at a 6 degree sun is
    // a stop under what the sky asks. The low-sun transmission and its cap
    // up by 2.2 for the mass (1.8 measured -2.49 st on the perpendicular
    // probe, on the line); the outer shell allowed one more cap over the
    // bound for the fringe.
    transLow: 2.2,
    transRim: 1.0,
    // Round 6 (see the option): the round-5 `forest` dusk crown was still
    // 3.3 st under the sky with a fifth of it black, and it is lit from the
    // side, where the transmission is the broad term alone and under the cap
    // — the critics' shell fix (0.6 through the buried cards) probed at
    // 0.04 st there, and `transLow` x1.6 at -2.56 st with 16 % black, short
    // on both counts. The broad term up instead, the cap where it was: 2.2
    // measured -2.30 st / 13 % black, 3.0 -2.15 / 11 %, 4.0 -2.06 / 9.6 %,
    // the rim still a stop over the interior (+0.8 st against +1.1); the
    // backlit `medium` dusk crown moved from 0.75 to 0.80 of the sky over its
    // top rows at any of them, its bound being the cap. 4.6 with the crown at
    // 230 cards: the denser lens has more interior in the critics' inner box
    // (290,45,470,90), whose median stood at -2.48 st against a -2.5 line.
    transBroad: 4.6,
    sunTint: [0.9, 1.0, 0.58],
    windAmp: 0.16,
    // Round 5 tried the critics' fix first — the shell normals into the
    // direct term at nearly full weight (wrap 0.2, direct 0.95) — and measured
    // it on a perpendicular framing of the nearest crown: the two halves
    // stayed 0.00 st apart, and the crown's median went down 9 % (the wrap
    // was most of the underside's light). A flat lens has its shell normals
    // up and down, not toward the sun. Kept as they were; `sunSide` below is
    // what makes the split.
    wrap: 0.5,
    direct: 0.82,
    sky: 0.54,
    shade: 0.86,
    env: 0.1,
    haze: 0.94,
    hazeRange: [30, 75],
    crownGrad: 1.0,
    // Round 6: the `forest` crown's halves about the trunk were +0.56 st
    // apart at 1.8 with the key 35 degrees off the camera's left; probed at
    // 2.6 +0.86, 3.2 +0.95, 4.0 +1.03 (the crown's median going down 0.03,
    // 0.08 and 0.18 st with it), and the high-sun transmission split the
    // same way (see the shader) for the rest. Re-probed on the spiral-laid
    // crown, whose cards fall differently in the two boxes: 1.8 +0.33 st,
    // 2.6 +0.80, 3.0 +1.11, 3.4 +1.09 (the far side is at its floor by 3.0),
    // the crown's median 0.11 st down from 2.6 to 3.0. The halves' numbers
    // move a quarter-stop with the layout alone — the same shader read
    // −0.28 st on HEAD's random layout and +1.04 on the spiral's — so this is
    // set with a margin over the critics' +1.0.
    sunSide: 3.0,
    // Measured against the current night rig: at 0.2 the cards under the
    // moon sat at a third of the sky's luma (Y 0.002 against 0.007), which
    // is a hole in the stars with a green tinge. At 0.45 they land near
    // two thirds of it — a dark green-grey mass, still under the sky.
    nightFloor: 0.45,
  });
  // Grass transmits more than anything else in the scene. Dry grass is a
  // bundle of translucent straws, and against the sun a whole slope of it goes
  // to gold; down-sun it is a matte khaki. Both are wanted.
  const GRASS_OPTS = {
    ...fx(0.5, 0.5),
    alphaTest: 0.3,
    mipFill: 0.22,
    mipErode: 0.06,
    // Held well under the leaf materials. Straw is already the palest thing on
    // the ground, and the atlas carries its own root-to-tip ramp, so a real
    // transmission term on top of that took every tuft to white against the
    // sun; the gold is wanted, the bleach is not.
    // Halved against the new scale (the term now runs off the key's own
    // irradiance rather than its ratio to noon), so the noon tuft lands where
    // it did; the dusk tuft gains what the old ratio was taking off it.
    trans: 0.3,
    transPeak: 0.6,
    sunTint: [1.0, 0.88, 0.62],
    windAmp: 0.13,
    windSpeed: 1.6,
    windFlutter: 1.3,
    direct: 0.9,
    sky: 0.62,
    shade: 0.62,
    wrap: 0.7,
    haze: 0.82,
    hazeRange: [30, 85],
    collar: 1.0,
    tuftAO: 1.0,
  };
  const grassMat = foliageMaterial(savannaGrassAtlas(), GRASS_OPTS);
  // The lawn's own copy of it: same atlas, same program (the materials differ
  // in uniform values only), retuned by the hour like any other foliage bag.
  // Half the tuft self-shadow — the root at 0.72 of the tip rather than 0.44:
  // a trampled sod a hand high is not in its own shade the way a knee-high
  // tuft is, and at the full band the lawn's roots sat at Y 0.02 on soil at
  // 0.15. The higher cut takes the faint fill between the blades off, so the
  // card's edge is the blades' and not the card's. A quarter of the blade's
  // chroma to dust (see the option): the lie-up is trodden straw on the
  // dust-grey ring, and the clean straw tile measured a saturation of 0.54 on
  // the `pride` frame's lower third against the critics' 0.45.
  const lawnMat = foliageMaterial(savannaGrassAtlas(), { ...GRASS_OPTS, tuftAO: 0.5, alphaTest: 0.45, dust: 0.25 });
  const swathMat = foliageMaterial(grassSwathAtlas(), {
    ...fx(0.3, 0.3),
    alphaTest: 0.3,
    mipFill: 0.26,
    trans: 0.26,
    transPeak: 0.4,
    sunTint: [1.0, 0.88, 0.62],
    windAmp: 0.1,
    windSpeed: 1.4,
    direct: 0.86,
    sky: 0.62,
    shade: 0.55,
    wrap: 0.8,
    haze: 0.9,
    hazeRange: [30, 85],
  });
  const scrubMat = foliageMaterial(scrubAtlas(), { ...fx(1.1, 0.9), alphaTest: 0.34, mipFill: 0.14, mipErode: 0.14, trans: 0.45, transPeak: 1.2, windAmp: 0.1, windSpeed: 1.3, direct: 1.02, sky: 0.7, shade: 0.84, wrap: 0.62, haze: 0.8, hazeRange: [30, 80], crownGrad: 0.5, nightFloor: 0.3, collar: 0.8 });
  const forbMat = foliageMaterial(forbAtlas(), { ...fx(0.6, 0.7), alphaTest: 0.3, mipFill: 0.16, trans: 0.35, transPeak: 0.6, sunTint: [1.0, 0.84, 0.5], windAmp: 0.16, windSpeed: 1.2, direct: 1.0, sky: 0.8, shade: 0.6, wrap: 0.64, haze: 0.8, hazeRange: [30, 80], collar: 0.6 });
  const litterMat = foliageMaterial(groundLitterAtlas(), { ...fx(0.3, 0.6), alphaTest: 0.3, trans: 0.06, windAmp: 0.0, rough: 0.95, direct: 1.06, sky: 0.8, shade: 0.3, wrap: 0.45, haze: 0.6, hazeRange: [30, 80] });
  // The far band is ambient-dominated and ramps toward the haze before the fog
  // gets its turn: a directly lit painted crown at 150 m lands as bright as the
  // sky it stands against otherwise.
  const billboardMat = foliageMaterial(savannaBillboardAtlas(), {
    ...fx(0, 0),
    alphaTest: 0.3,
    trans: 0.15,
    transPeak: 1.0,
    windAmp: 0.06,
    windSpeed: 0.55,
    crownGrad: 0.4,
    nightFloor: 0.4,
    // No dark multiplier here. The old forest's billboards carried one because
    // a painted conifer stood in its own shadow; a painted acacia at eighty
    // metres has to land at the value of the geometry trees in front of it, or
    // the plain is fringed with black cut-outs.
    tint: 0xe4e2d2,
    env: 0.1,
    wrap: 0.95,
    direct: 0.72,
    sky: 0.9,
    shade: 0.7,
    haze: 0.92,
    hazeRange: [40, 90],
  });
  // Past 120 m the painted band's haze target climbs from the dark haze toward
  // the fog colour itself, arriving by 320 m: a billboard at the back of the
  // band stands on terrain that is mostly fog by then, and a dark ramp target
  // that was right at eighty metres left it a cut-out against that.
  billboardMat.userData.foliage.uHazeFarMix.value.set(120, 320);

  const rock = rockMaps();
  const rockMat = new THREE.MeshStandardMaterial({
    map: rock.map,
    normalMap: rock.normal,
    roughnessMap: rock.rough,
    aoMap: rock.ao,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.4,
  });
  const earth = earthMaps();
  const earthMat = new THREE.MeshStandardMaterial({
    map: earth.map,
    normalMap: earth.normal,
    roughnessMap: earth.rough,
    aoMap: earth.ao,
    normalScale: new THREE.Vector2(1.8, 1.8),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.2,
  });
  const farGround = farGroundMaps();
  // The skirt is the plain carried past the terrain mesh, and it has to land
  // at the value of the ground it continues. The terrain shader knocks its
  // dirt down by a 0.68 level cut and an occlusion stack before the key sees
  // it; this material had neither, so the same straw tile under the same 9.4
  // key rendered 0.67–0.77 against a terrain edge at 0.41–0.52 beside it, and
  // at 400–550 m — 73 per cent fogged — the lit quarter that was left still
  // put it at 0.78 under a sky of 0.72: the cream mass over the treeline in
  // the rear and pride framings. The tint carries the terrain's cut, and a
  // touch of the laterite's red so the straw does not meet the dirt as a
  // yellow.
  // Lambert, not Standard (round 6). The terrain's far flat under this mesh is
  // Lambert with the same tile and a tint within a tenth of a stop of this
  // one, and the two still met at a step: with the vegetation hidden the
  // terrain builder measured the skirt +0.47 st over the flat it covers in
  // `lion_far` (0.349 against 0.251), the pale mid-ground band the critics
  // have chased since round 4. Ablated here on the same framing: the skirt
  // 0.297, the flat under it 0.252, the skirt with its environment term off
  // 0.295, the skirt as Lambert 0.251. So it was never the albedo: a Standard
  // material at roughness 1 still puts a 4 % dielectric specular on the key,
  // and on a straw tint of 0.15 under a 9.4 sun that is a quarter-stop of
  // light the flat does not have. Diffuse only, which is what a plain is at
  // a hundred and fifty metres, and the two now land on one value.
  const skirtMat = new THREE.MeshLambertMaterial({
    map: farGround.map,
    color: new THREE.Color(0.3, 0.265, 0.25),
  });
  // The lit term falls off with distance, to 0.55 by 520 m — the same curve
  // the terrain's far flat runs, so the two meet at one value wherever they
  // interleave. The plain fogs to the horizon band, the brightest sky there
  // is; the hills behind it fog to the sky a few degrees up, a stop's tenth
  // darker. A far plain three quarters fogged still carries a quarter of its
  // own lit straw on that floor and measured 0.67 under hills at 0.62 — the
  // last band brighter than what stood over it. The near ground has the
  // grazing-angle occlusion of clods and stems that makes a plain seen
  // edge-on darker than the dirt underfoot; this mesh has no relief, so the
  // occlusion is written in by distance.
  skirtMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkirtW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSkirtW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkirtW;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        diffuseColor.rgb *= mix( 1.0, 0.55, smoothstep( 240.0, 520.0, distance( vSkirtW, cameraPosition ) ) );`,
      );
  };
  skirtMat.customProgramCacheKey = () => 'forest-skirt-r4';

  // Horizon strips. These were MeshBasicMaterial with a dark tint: unlit, so
  // the same 0x6a6650 at noon and at midnight, and the strip's own painted
  // colours (already an olive graded toward haze) multiplied by that tint
  // landed at a linear 0.02 — black, whatever the hour, with only the fog to
  // lift it, and at 430 m the fog is half. Three critics saw black cut-outs.
  // Lambert now: the hemisphere and the key light it like the terrain it
  // stands on, the fog is the same fog, and the albedo is a dark olive that
  // a low sun turns khaki. Alpha-tested as well as blended: the strip's trees
  // fill the lower half of a four-to-one card, so at the far mips the empty
  // upper half averaged to a faint alpha and each card drew as a rectangle
  // standing above its own skyline. The cut takes that off; the blend keeps
  // the surviving edge soft.
  // Near white: the strip is painted in the albedo wanted (olive graded toward
  // the haze per layer, 0.09-0.24 linear), and the first Lambert pass at a
  // 0xa8a684 tint on top of that still measured a tenth of the ground's value
  // from the pride — a dark wall under white hills.
  const TREELINE_TINT = [0xeeecdc, 0xf6f4e8, 0xffffff];
  // Aerial perspective as well as the fog, the way every crown and tuft in
  // front of it gets it. The fog alone at 350 m is half, and half of a dark
  // olive against a hill that the terrain has graded almost to the sky is a
  // brown wall with a wavy top; the ring has to sit *in* the air at that
  // distance, not in front of it. Same target the far billboards grade to
  // (`uFog`, the hour's fog colour, which sky.js writes by name), so the ring
  // and the trees standing in front of it agree at every hour.
  const treelineMats = TREELINE_TINT.map((tint, i) => {
    const m = new THREE.MeshLambertMaterial({ map: treelineTexture(i), color: tint, transparent: true, alphaTest: 0.36, depthWrite: false, side: THREE.DoubleSide, fog: true });
    // in userData so sky.js finds the bag and writes the hour's fog into it
    m.userData.ring = { uFog: { value: new THREE.Color(0.43, 0.41, 0.38) } };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, m.userData.ring);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRingW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRingW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRingW;\nuniform vec3 uFog;')
        .replace(
          '#include <fog_fragment>',
          `{
          float hd = distance( vRingW, cameraPosition );
          float aer = 1.0 - exp( -max( hd - 90.0, 0.0 ) / 240.0 );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, uFog * 0.9, aer * 0.86 );
        }
        #include <fog_fragment>`,
        );
    };
    m.customProgramCacheKey = () => 'treeline-r4';
    return m;
  });
  // --- prototypes -----------------------------------------------------------
  const protos = [];
  const protoSeed = [];
  const add = (build, spec, seed) => {
    protos.push(build(spec, seed, Q.crownCards));
    protoSeed.push(() => build(spec, seed, Q.crownCards * Q.midDetail));
  };
  UMBRELLAS.forEach((spec, i) => {
    add(buildAcacia, spec, 101 + i * 37);
    add(buildAcacia, spec, 907 + i * 53);
    for (let d = 0; d < Q.dup; d++) add(buildAcacia, spec, 4801 + i * 131 + d * 617);
  });
  ROUNDS.forEach((spec, i) => {
    add(buildRoundTree, spec, 2003 + i * 71);
    for (let d = 0; d < Q.dup; d++) add(buildRoundTree, spec, 5303 + i * 97 + d * 431);
  });
  THORNS.forEach((spec, i) => {
    add(buildThornTree, spec, 3103 + i * 61);
    add(buildThornTree, spec, 3607 + i * 61);
    for (let d = 0; d < Q.dup; d++) add(buildThornTree, spec, 6203 + i * 89 + d * 373);
  });
  [3301, 3907].forEach((seed) => {
    protos.push(buildDeadTree(seed));
    protoSeed.push(() => buildDeadTree(seed));
  });
  const byName = {};
  protos.forEach((p, i) => {
    (byName[p.name] ||= []).push(i);
  });
  const anyOf = (name) => pick(byName[name] || byName.umbrella, rnd);

  /** Which tree grows here: round trees on the drainage lines, thorn scrub in the woodland, umbrellas everywhere. */
  function speciesAt(x, z, open) {
    const r = rnd();
    if ((dieback(x, z) > 0.62 && r < 0.4) || r < 0.045) return anyOf('dead');
    if (wet(x, z) > 0.6 && r < 0.55) return anyOf('round');
    if (open < 0.4 && r < 0.36) return anyOf('thorn');
    if (r < 0.28) return anyOf('flat');
    return anyOf('umbrella');
  }

  function sites(cellSize, radius, cb) {
    const n = Math.ceil((radius * 2) / cellSize);
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = -radius + (ix + rnd()) * cellSize;
        const z = -radius + (iz + rnd()) * cellSize;
        if (Math.abs(x) > radius || Math.abs(z) > radius) continue;
        cb(x, z);
      }
    }
  }

  function groundQuat(x, z, out, blend = 0.5) {
    const e = 0.7;
    const hl = terrain.heightAt(x - e, z);
    const hr = terrain.heightAt(x + e, z);
    const hd = terrain.heightAt(x, z - e);
    const hu = terrain.heightAt(x, z + e);
    return leanTo(hl - hr, 2 * e, hd - hu, out, blend);
  }

  function leanTo(nx, ny, nz, out, blend) {
    _nrm.set(nx, ny, nz);
    if (_nrm.lengthSq() < 1e-8) _nrm.set(0, 1, 0);
    _nrm.normalize().lerp(_up, 1 - blend);
    if (_nrm.lengthSq() < 1e-8) _nrm.set(0, 1, 0);
    _nrm.normalize();
    return out.setFromUnitVectors(_up, _nrm);
  }

  const roadYaw = (() => {
    const N = 384;
    const px = new Float32Array(N);
    const pz = new Float32Array(N);
    const yaw = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const p = terrain.roadPoint(t);
      const g = terrain.roadTangent(t);
      px[i] = p.x;
      pz[i] = p.z;
      yaw[i] = Math.atan2(-g.z, g.x);
    }
    return (x, z) => {
      let best = 1e9;
      let bi = 0;
      for (let i = 0; i < N; i++) {
        const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2;
        if (d < best) {
          best = d;
          bi = i;
        }
      }
      return yaw[bi];
    };
  })();

  // A driven track has nothing lying across it, and the beauty cameras all sit
  // within about twelve metres of the trail start, so anything long is kept
  // out of that band; see the previous forest for the reasoning.
  const DEAD_MIN = 3.5;
  const DEAD_CLEAR = 6.4;
  const DEAD_ALIGN = 13.0;
  const DEAD_SHORT = 3.2;
  const camAllow = (x, z) => {
    let allow = 1e9;
    for (const c of clearings) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < 11) allow = Math.min(allow, DEAD_SHORT);
      else if (d < 18) allow = Math.min(allow, 6.0);
    }
    return allow;
  };
  function axisClears(x, z, yaw, len, clear) {
    const dx = Math.cos(yaw) * len * 0.5;
    const dz = -Math.sin(yaw) * len * 0.5;
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      const t = i / 4;
      if (terrain.roadDistance(x + dx * t, z + dz * t) < clear) return false;
    }
    return true;
  }
  /** Things that must not stand in someone else's ground. */
  const reserved = (x, z, margin = 0) => inCamp(x, z, 1 + margin / campR) || nearLions(x, z, 1 + margin / lionR);

  // --- trees -----------------------------------------------------------------
  // Sparse. A wooded savanna is one tree in every 120-200 square metres, open
  // grassland one in fifteen hundred; both are set by the acceptance rate on a
  // 6 m grid, thinned toward `tFrom` along the mainline. Trees stand in loose
  // groves off the `grove` field, so the open country between them is real.
  const NEAR_BAND = Q.nearBand;
  const MID_BAND = Math.max(Q.midBand, NEAR_BAND);
  const placements = protos.map(() => []);
  const midPlacements = protos.map(() => []);
  const treeSpots = [];
  let nearPlaced = 0;
  let midPlaced = 0;
  const placeTree = (x, z, i, { s = 0.74 + rnd() * 0.6, far = false } = {}) => {
    const proto = protos[i];
    const y = terrain.heightAt(x, z);
    (far ? midPlacements : placements)[i].push({
      x,
      y: y - proto.radius * 0.5,
      z,
      s,
      r: rnd() * Math.PI * 2,
      tiltX: (rnd() - 0.5) * 0.08,
      tiltZ: (rnd() - 0.5) * 0.08,
      v: 0.7 + rnd() * 0.45,
      warm: (rnd() - 0.5) * 0.3,
      turn: proto.kind === 'acacia' || proto.kind === 'thorn' ? clamp((dieback(x, z) - 0.52) * 2.2) : 0,
    });
    treeSpots.push({ x, z, r: proto.spread * s });
    if (far) midPlaced++;
    else nearPlaced++;
  };
  sites(6.0 / Math.sqrt(density), span, (x, z) => {
    const d = terrain.roadDistance(x, z);
    if (d < clearRadius || d > MID_BAND) return;
    if (reserved(x, z, 6)) return;
    const kd = kopjeDist(x, z);
    if (kd < 1.5) return;
    const open = openAt(x, z);
    let p = lerp(0.3, 0.05, open);
    // groves: most of the field is thinned hard and a few patches are dense
    const g = grove(x, z);
    p *= lerp(0.45, 1.7, smoothstep(0.42, 0.66, g));
    // a fringe of trees around a kopje, the way seed collects at its foot
    if (kd < 10) p *= 2.2;
    // the corridor stays open so the road reads, and the landing keeps its sun
    if (d < clearRadius + 4 && rnd() < 0.6) return;
    const gap = inClearing(x, z);
    if (gap > 0 && rnd() < 0.45 + gap * 0.7) return;
    if (rnd() > p) return;
    const i = speciesAt(x, z, open);
    const proto = protos[i];
    // scrub thorn at head height is exactly camera height: keep it off the verge
    if (proto.height < 5 && d < 11) return;
    // no two trees inside each other
    for (const t of treeSpots) if (Math.hypot(t.x - x, t.z - z) < (t.r + proto.spread) * 0.55) return;
    const far = d > NEAR_BAND && rnd() < smoothstep(NEAR_BAND - 4, NEAR_BAND + 4, d);
    placeTree(x, z, i, { far });
  });
  // the two big umbrellas the lions lie between
  for (const t of lionTrees) {
    if (terrain.roadDistance(t.x, t.z) < clearRadius + 2) continue;
    placeTree(t.x, t.z, byName.umbrella[0], { s: 1.15 + rnd() * 0.2 });
  }

  const emitBand = (proto, list, tag) => {
    if (!list.length) return;
    const trunkMesh = new THREE.InstancedMesh(proto.trunk, barkMats[proto.bark] || barkMats.acacia, list.length);
    trunkMesh.name = `tree_${proto.name}${tag}_trunk`;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    const foliMesh = proto.foliage ? new THREE.InstancedMesh(proto.foliage, acaciaMat, list.length) : null;
    if (foliMesh) {
      foliMesh.name = `tree_${proto.name}${tag}_foliage`;
      foliMesh.castShadow = tag === '';
      foliMesh.receiveShadow = true;
    }
    list.forEach((p, j) => {
      _pos.set(p.x, p.y, p.z);
      _quat.setFromEuler(_euler.set(p.tiltX, p.r, p.tiltZ));
      _scl.set(p.s, p.s * (0.9 + (p.v - 0.7) * 0.4), p.s);
      _m4.compose(_pos, _quat, _scl);
      trunkMesh.setMatrixAt(j, _m4);
      // bark spread: a stand of identical dark verticals is the most findable
      // repeat there is, so both value and the red-to-grey swing are wide
      const tv = 0.84 + (p.v - 0.7) * 0.7;
      _col.setRGB(tv * (1 + p.warm * 0.7), tv * (0.98 + p.warm * 0.1), tv * (0.92 - p.warm * 0.6));
      trunkMesh.setColorAt(j, _col);
      if (foliMesh) {
        foliMesh.setMatrixAt(j, _m4);
        const fv = 0.7 + (p.v - 0.7) * 0.5;
        const [sr, sg, sb] = hueOf(proto.name, p.turn);
        _col.setRGB(fv * sr * (1 + p.warm * 0.4), fv * sg * (1 + p.warm * 0.06), fv * sb * (0.96 - p.warm * 0.5));
        foliMesh.setColorAt(j, _col);
      }
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    if (trunkMesh.instanceColor) trunkMesh.instanceColor.needsUpdate = true;
    group.add(trunkMesh);
    if (foliMesh) {
      foliMesh.instanceMatrix.needsUpdate = true;
      if (foliMesh.instanceColor) foliMesh.instanceColor.needsUpdate = true;
      group.add(foliMesh);
    }
  };
  protos.forEach((proto, i) => emitBand(proto, placements[i], ''));
  protos.forEach((proto, i) => {
    if (!midPlacements[i].length) return;
    emitBand(protoSeed[i](), midPlacements[i], 'Lod');
  });

  /** How close the nearest placed tree is, for the shade grass and the leaf litter under it. */
  const treeShade = (x, z) => {
    let best = 0;
    for (const t of treeSpots) {
      const d = Math.hypot(t.x - x, t.z - z);
      if (d < t.r * 1.2) best = Math.max(best, 1 - d / (t.r * 1.2));
    }
    return best;
  };

  // --- billboard band: the plain out to the terrain edge ---------------------
  // Painted whole trees, one or a group per card, standing on the ground the
  // terrain paints. The card's aspect follows the painting: an umbrella is
  // wider than it is tall, a marula the other way round.
  const BB_TILE = [
    { tile: 0, aspect: 1.3, h: [5.5, 8.5], sp: 'umbrella' },
    { tile: 1, aspect: 1.25, h: [6.5, 9.5], sp: 'umbrella' },
    { tile: 2, aspect: 0.8, h: [9, 13], sp: 'round' },
    { tile: 3, aspect: 0.85, h: [5, 8], sp: 'dead' },
  ];
  const billboardGeos = BB_TILE.map((b, k) => {
    const parts = [];
    for (let p = 0; p < 2; p++) {
      const g = foliageCard(b.aspect, 1.0, b.tile, { bow: 0.04, segs: [1, 1], mirror: p === 1 });
      g.translate(0, 0.5 - 0.004, 0);
      g.rotateY(p * 1.55 + k * 0.4);
      parts.push(g);
    }
    const geo = shellNormals(merge(parts), { mode: 'dome', centre: [0, 0.3, 0], blend: 0.5, up: 0.6 });
    windWeight(geo, (x, y) => clamp(y - 0.3) * 0.5);
    // the painting's crown occupies the upper part of the card; the split
    // runs over that, not over the trunk
    crownWeight(geo, (x, y) => (y - 0.35) / 0.6);
    return shadeWeight(geo, (x, y) => 0.7 - clamp(y) * 0.45);
  });
  const farLists = billboardGeos.map(() => []);
  let farPlaced = 0;
  sites(11 / Math.sqrt(density), span, (x, z) => {
    const d = terrain.roadDistance(x, z);
    if (d < MID_BAND * 0.92) return;
    if (reserved(x, z, 4) || kopjeDist(x, z) < 2) return;
    const open = openAt(x, z);
    // Even the open plain keeps a tree every eight hundred square metres or
    // so: a horizon with nothing standing on it reads as desert, not savanna.
    let p = lerp(0.5, 0.16, open) * lerp(0.5, 1.6, smoothstep(0.42, 0.66, grove(x, z)));
    if (rnd() > p) return;
    const w = wet(x, z);
    const dd = dieback(x, z);
    let k;
    if ((dd > 0.66 && rnd() < 0.5) || rnd() < 0.05) k = 3;
    else if (w > 0.6 && rnd() < 0.5) k = 2;
    else k = rnd() < 0.6 ? 0 : 1;
    const b = BB_TILE[k];
    const height = lerp(b.h[0], b.h[1], Math.pow(rnd(), 1.2));
    farLists[k].push({ x, z, y: terrain.heightAt(x, z) - 0.2, h: height, r: rnd() * Math.PI * 2, v: 0.72 + rnd() * 0.4, warm: (rnd() - 0.5) * 0.34, sp: b.sp, turn: k === 3 ? 0 : clamp((dd - 0.52) * 2.2) });
    farPlaced++;
  });
  farLists.forEach((list, k) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(billboardGeos[k], billboardMat, list.length);
    mesh.name = `treeFar_${k}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    list.forEach((p, j) => {
      _pos.set(p.x, p.y, p.z);
      _quat.setFromEuler(_euler.set(0, p.r, 0));
      _scl.set(p.h, p.h, p.h);
      _m4.compose(_pos, _quat, _scl);
      mesh.setMatrixAt(j, _m4);
      const [sr, sg, sb] = hueOf(p.sp, p.turn);
      _col.setRGB(p.v * sr * (1 + p.warm * 0.5), p.v * sg * (1 + p.warm * 0.06), p.v * sb * (0.96 - p.warm * 0.55));
      mesh.setColorAt(j, _col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  });

  // --- the ground: grass, scrub, forbs, litter -------------------------------
  // Grass prototypes: tufts of several bowed cards. Tall red oat and thatching
  // grass, short grazed khaki, and the green ones for shade and drainage.
  const G_TALL = [
    plantClump(1.0, 1.05, [0, 0, 3, 0], { collar: 1.1, seed: 7101, planes: 5, spread: 0.36, bow: 0.2 }),
    plantClump(0.9, 1.2, [3, 0, 3, 0], { collar: 1.1, seed: 7113, planes: 5, spread: 0.3, bow: 0.22, form: 'arch' }),
    plantClump(1.2, 0.9, [0, 3, 0, 0], { collar: 1.1, seed: 7127, planes: 5, spread: 0.46, bow: 0.18, lean: 0.5, form: 'patch' }),
    plantClump(0.6, 1.25, [3, 3, 0, 3], { collar: 1.1, seed: 7139, planes: 3, spread: 0.2, bow: 0.14, form: 'spire' }),
    plantClump(1.1, 0.95, [0, 0, 0, 3], { collar: 1.1, seed: 7151, planes: 4, spread: 0.4, bow: 0.22, form: 'fan' }),
  ];
  // `reach` is the tile's blade height (savannaGrassAtlas `tall`), so the
  // tuft self-shadow grades over the painted blades and not over the card.
  const G_SHORT = [
    plantClump(0.9, 0.5, [1, 1, 1, 1], { collar: 1.1, seed: 7201, planes: 4, spread: 0.44, bow: 0.2, form: 'patch', reach: 0.62 }),
    plantClump(0.7, 0.55, [1, 1, 1, 1], { collar: 1.1, seed: 7213, planes: 4, spread: 0.36, bow: 0.22, reach: 0.62 }),
    plantClump(1.1, 0.4, [1, 1, 1, 1], { collar: 1.1, seed: 7227, planes: 4, spread: 0.56, bow: 0.18, lean: 0.6, form: 'sprawl', reach: 0.62 }),
    plantClump(0.8, 0.62, [1, 1, 1, 1], { collar: 1.1, seed: 7239, planes: 4, spread: 0.36, bow: 0.22, form: 'fan', reach: 0.62 }),
  ];
  const G_GREEN = [
    plantClump(0.9, 0.8, [2, 2, 2, 1], { collar: 1.1, seed: 7301, planes: 5, spread: 0.36, bow: 0.22, reach: 0.74 }),
    plantClump(1.0, 0.7, [2, 2, 1, 2], { collar: 1.1, seed: 7313, planes: 4, spread: 0.44, bow: 0.2, form: 'patch', reach: 0.74 }),
    plantClump(0.7, 0.95, [2, 2, 2, 2], { collar: 1.1, seed: 7327, planes: 4, spread: 0.28, bow: 0.22, form: 'arch', reach: 0.74 }),
  ];
  // The pride's lawn: the two upright short forms again (the patch and the
  // sprawl lie flat, and at the lawn's size a flat card is a stain on the
  // dirt — the pride's near ground in round 4 was made of them), but on the
  // straw tile. Round 5 put them on tile 1, the short khaki tuft, and three
  // critics measured the lie-up at the standing straw's hue a stop and a half
  // under it: a dark olive turf on red soil, not a dry-season lie-up, which is
  // trampled straw over dust. One card in four stays khaki. Seven cards on a
  // wider, more ragged spread than the plain's four, so a sod is not a
  // rectangle at three times. `reach` is the short tile's still: the tuft
  // self-shadow grades over the lower 0.62 of the card and the tips stay lit.
  // Their own list, after the green set, so the plain's `pickOf(GI_SHORT)`
  // draws exactly what it drew before.
  const G_LAWN = [
    plantClump(0.7, 0.55, [0, 0, 1, 0], { collar: 1.1, seed: 7251, planes: 7, spread: 0.5, bow: 0.22, reach: 0.62, ragged: 1.6 }),
    plantClump(0.8, 0.62, [0, 0, 1, 0], { collar: 1.1, seed: 7263, planes: 7, spread: 0.5, bow: 0.22, form: 'fan', reach: 0.62, ragged: 1.6 }),
  ];
  const grassGeos = [...G_TALL, ...G_SHORT, ...G_GREEN, ...G_LAWN];
  const GI_TALL = G_TALL.map((_, i) => i);
  const GI_SHORT = G_SHORT.map((_, i) => G_TALL.length + i);
  const GI_GREEN = G_GREEN.map((_, i) => G_TALL.length + G_SHORT.length + i);
  const GI_LAWN = G_LAWN.map((_, i) => G_TALL.length + G_SHORT.length + G_GREEN.length + i);
  // Eight banks, not five, and three of them with a third card: the swath is
  // what the plain is made of past twenty metres, and at five shapes on one
  // even grid it was the "same pale tussock stamped on a lattice" two critics
  // named. Species index is `k` below — 0 tall straw, 1 short khaki, 2 green,
  // 3 thatching, then mixed banks of each family.
  const swathGeos = [
    swathGeo(3.2, 1.0, [0, 0], 7401),
    swathGeo(2.8, 0.7, [1, 1], 7413),
    swathGeo(3.0, 0.85, [2, 2], 7427),
    swathGeo(3.4, 1.15, [3, 3], 7439),
    swathGeo(3.0, 0.95, [0, 3], 7451),
    swathGeo(2.4, 1.2, [0, 3, 0], 7463, { cards: 3, spread: 0.35 }),
    swathGeo(3.8, 0.8, [1, 0, 1], 7477, { cards: 3, spread: 0.45 }),
    swathGeo(2.6, 1.05, [3, 3, 0], 7489, { cards: 3, spread: 0.3 }),
  ];
  const SWATH_OF = { tall: [0, 4, 5, 7], short: [1, 6], green: [2], thatch: [3, 5, 7] };
  const scrubGeos = [
    plantClump(1.6, 1.2, [0, 0, 0, 2], { collar: 0.85, seed: 7501, planes: 6, spread: 0.36, form: 'tier' }),
    plantClump(2.0, 1.0, [0, 2, 0, 0], { collar: 0.85, seed: 7513, planes: 6, spread: 0.5, form: 'patch', lean: 0.5 }),
    plantClump(1.8, 1.7, [1, 1, 1, 1], { collar: 0.85, seed: 7527, planes: 6, spread: 0.4, form: 'tier' }),
    plantClump(2.2, 1.3, [1, 1, 3, 1], { collar: 0.85, seed: 7539, planes: 6, spread: 0.56, form: 'patch', lean: 0.6 }),
    plantClump(1.3, 1.5, [3, 3, 3, 3], { collar: 0.85, seed: 7551, planes: 5, spread: 0.36, form: 'tier' }),
    plantClump(1.4, 1.1, [2, 2, 2, 0], { collar: 0.85, seed: 7563, planes: 5, spread: 0.4 }),
    plantClump(1.0, 1.6, [1, 1, 1, 3], { collar: 0.85, seed: 7577, planes: 4, spread: 0.3, form: 'arch' }),
    plantClump(2.4, 0.8, [0, 0, 3, 0], { collar: 0.85, seed: 7589, planes: 6, spread: 0.7, form: 'sprawl', lean: 0.7 }),
  ];
  const forbGeos = [
    plantClump(0.7, 0.9, [0, 0, 0, 0], { collar: 0.7, seed: 7601, planes: 3, spread: 0.2, form: 'fan' }),
    plantClump(0.5, 1.6, [1, 1, 1, 1], { collar: 0.7, seed: 7613, planes: 3, spread: 0.24, form: 'spire' }),
    plantClump(0.6, 1.9, [1, 1, 1, 1], { collar: 0.7, seed: 7627, planes: 3, spread: 0.2, form: 'spire' }),
    plantClump(0.9, 0.5, [2, 2, 2, 2], { collar: 0.7, seed: 7639, planes: 4, spread: 0.4, form: 'patch' }),
    plantClump(1.6, 0.5, [3, 3, 3, 3], { collar: 0.7, seed: 7651, planes: 4, spread: 0.6, form: 'sprawl', lean: 0.9 }),
  ];
  const litterGeos = [groundCard(1.4, 0), groundCard(1.2, 1), groundCard(1.0, 2), groundCard(1.1, 3)];

  // One shared site grid for every ground pass; roadDistance and heightAt are
  // the expensive calls, so they are sampled once per cell.
  // Termite mounds are sited before the ground cover so each can clear an
  // apron: the colony strips the grass round its mound, and without the bare
  // ring a knee-high mound is lost in knee-high straw.
  const termiteSpots = [];
  sites(14, span, (x, z) => {
    const d = terrain.roadDistance(x, z);
    if (d < 5.5 || reserved(x, z, 4) || kopjeDist(x, z) < 3) return;
    if (rnd() > 0.09 * lerp(0.8, 1.3, openAt(x, z))) return;
    for (const t of treeSpots) if (Math.hypot(t.x - x, t.z - z) < 1.5) return;
    termiteSpots.push({ x, z, y: terrain.heightAt(x, z), s: 1.5 + Math.pow(rnd(), 1.4) * 1.6, r: rnd() * Math.PI * 2, v: 0.58 + rnd() * 0.3, k: Math.floor(rnd() * 3) });
  });
  const termiteApron = (x, z) => {
    for (const t of termiteSpots) {
      const dd = Math.hypot(t.x - x, t.z - z);
      if (dd < t.s * 1.5) return true;
    }
    return false;
  };

  const UG_REACH = Q.ugReach;
  const ugSites = [];
  sites(Q.ugCell, span, (x, z) => {
    const d = terrain.roadDistance(x, z);
    if (d < 1.2 || d > UG_REACH) return;
    if (inCamp(x, z, 0.62)) return;
    // nothing grows up through the granite dome at a kopje's heart
    if (kopjeDist(x, z) < -2.5) return;
    if (termiteApron(x, z)) return;
    // nor in the water, nor on the trodden metre of mud round it
    if (hole && Math.hypot(x - hole.x, z - hole.z) < (hole.radius ?? 0) + 1.0) return;
    const e = 0.8;
    // Where the grass drifts and clears. The old cover was a flat acceptance
    // rate over the whole grid, and a flat rate on a jittered grid is exactly
    // the even carpet two critics found: a savanna's grass stands in sweeps
    // with trodden and grazed ground between them, at a scale of ten to
    // twenty metres, and this is that field. Centred so the mean count holds.
    // Widened from 0.3-0.7. That window put a third of the field at its floor
    // and the floor was 0.4 of the mean: with the tier cut and the bare
    // patches on top of it, the round-2 plain went bald for tens of metres at
    // a time. The field still sweeps — it just never clears.
    const drift = smoothstep(0.15, 0.85, fbm(x * 0.055 + 8.3, z * 0.055 - 27.1, { octaves: 3, period: 6, seed: 3131 }));
    const lionD = Math.hypot(x - lions.x, z - lions.z);
    ugSites.push({
      x,
      z,
      d,
      drift,
      // The pride's trodden patch: the ten metres round the anchor the animals
      // actually lie in, grazed and flattened, so a lion lying down is still a
      // lion from the road. It was a nineteen-metre lawn, which from every
      // pride framing was the whole of the near ground.
      lawn: 1 - smoothstep(7, 11, lionD),
      // and a grazed ring round it: the same count of tufts, knee-high rather
      // than waist-high. It ran to twenty metres, and with the tufts in it at
      // 0.68 and thinned to 0.7 the whole near ground of the `pride` framing
      // (camera eleven metres out) was short, sparse straw — 18.6 % cover
      // against the open plain's 42.5 % (round 4, critics A and B). Fourteen
      // metres now, at 0.8: the ring is grazed, not bald. The `far` framing is
      // a 30-degree lens from the road twenty-two metres out, and the tufts
      // between it and the ring are the plain's own.
      graze: 1 - smoothstep(9, 14, lionD),
      // verge jitter, biased outward, so no pass ends on a clean offset curve of the road
      dj:
        (fbm(x * 0.085 + 33.1, z * 0.085 - 12.7, { octaves: 2, period: 8, seed: 7373 }) - 0.36) * 3.3 +
        (fbm(x * 0.33 - 5.5, z * 0.33 + 21.2, { octaves: 2, period: 6, seed: 9191 }) - 0.42) * 1.2,
      y: terrain.heightAt(x, z),
      nx: terrain.heightAt(x - e, z) - terrain.heightAt(x + e, z),
      ny: 2 * e,
      nz: terrain.heightAt(x, z - e) - terrain.heightAt(x, z + e),
      open: openAt(x, z),
      shade: treeShade(x, z),
      camp: 1 - smoothstep(campR * 0.62, campR * 1.15, Math.hypot(x - camp.x, z - camp.z)),
      // short grass, not no grass, out to a spread and a half
      lion: 1 - smoothstep(lionR * 0.5, lionR * 1.2, lionD),
      kopje: kopjeDist(x, z),
    });
  });

  /**
   * Scatter one prototype set over the shared grid.
   *
   * `select(site)` returns the prototype index to use at a site, or -1 to leave
   * it empty, so a pass can decide species from the ground (short grass where
   * the pride lies, green under a crown) rather than from a fixed weight table.
   * `count(site)` is instances per site and may exceed one.
   */
  // Spatial buckets for the ground cover. Each bucket is its own InstancedMesh
  // with a bounding sphere fitted to its instances, so the renderer's frustum
  // test can drop whole buckets; with one bucket the mesh is never culled,
  // because a single sphere round the whole map is always in view.
  const B = Math.max(1, Q.buckets | 0);
  const bucketOf = (x, z, b = B) => {
    if (b === 1) return 0;
    const ix = clamp(Math.floor(((x + span) / (2 * span)) * b), 0, b - 1);
    const iz = clamp(Math.floor(((z + span) / (2 * span)) * b), 0, b - 1);
    return iz * b + ix;
  };
  const bucketLists = (b = B) => Array.from({ length: b * b }, () => []);
  const finishBucket = (mesh, n) => {
    if (n > 1) {
      mesh.computeBoundingSphere();
      mesh.frustumCulled = true;
    } else {
      mesh.frustumCulled = false;
    }
  };

  // Every pass is bucketed now. The grass is two thirds of the ground-cover
  // instances, but the census put the litter at 51 k triangles and the scrub
  // and forbs at 20 k each, drawn in full from every camera; a bucket of scrub
  // is a draw call spent on a few dozen cards, and a draw call is cheaper than
  // the thousand or so triangles it saves.
  //
  // The grid is per family now, not one size for all. Round 2's 4x4 on
  // every pass put the scrub at 56 calls and the swath at 44 in the forest
  // view for 16 k and 5.5 k triangles between them — a draw call per three
  // hundred triangles, when the whole point of the grid was to save
  // triangles. Those families sit on a 2x2 (`B_CHEAP`): four buckets of a few
  // dozen cards each are cheap to draw whole, and a frustum still drops one
  // or two. The grass and the litter, which carry the triangles, keep the
  // full grid. This is what pays for the grass the plain got back.
  const B_CHEAP = Math.min(B, 2);
  // `extra` is a second count per site, drawn from a stream of its own
  // (`seed`) and planted into the same meshes: plants added to one place
  // without re-laying the rest of the world. `count` keeps the main stream
  // exactly as it was, draw for draw.
  // `mats`, when given, is a material per prototype (the lawn's clumps draw with
  // the lawn material). A prototype on its own material is one mesh, not one
  // per bucket: it is one patch of ground (the lawn is a fifteen-metre circle)
  // and its instances all cull together, where a mesh per bucket it touched
  // was thirteen draw calls more on the `close` pride framing for two shapes.
  // `valueAt`, when given, scales a plant's value by its site (the grass
  // lightens toward the reach, see reachTail).
  function scatter(geos, mat, { count, extra = null, seed = 0, select, minRoad, maxRoad = UG_REACH, scale, jitter = 1.0, lean = 0.45, yOff = -0.04, castShadow = false, tint = [0.62, 0.3], hueSwing = 0.1, hues = null, shrink = 0.55, shrinkOver = 4.0, ragged = 1.0, dust = 0, sizeAt = null, valueAt = null, bucket = true, drift = 0, jitterS = [0.6, 1.4], hueJit = 8, valJit = 0.15, mats = null, name = 'plants' }) {
    const b = bucket ? (typeof bucket === 'number' ? Math.max(1, bucket | 0) : B) : 1;
    const perGeo = geos.map(() => bucketLists(b));
    const bucketFor = (gi, x, z) => (mats && mats[gi] && mats[gi] !== mat ? 0 : bucketOf(x, z, b));
    const mainRnd = rnd;
    const sideRnd = extra ? mulberry32(seed || 20260805) : null;
    for (const s of ugSites) {
      const de = s.d + s.dj * ragged;
      if (de < minRoad || s.d > maxRoad) continue;
      // drifts and clearings: `drift` is how far the field is allowed to swing
      // the count either way, and it swings further up than down so the sweeps
      // read as sweeps rather than the clearings as holes
      const swing = drift > 0 ? lerp(1 - drift * 0.55, 1 + drift * 0.6, s.drift) : 1;
      let p = count(s) * swing;
      while (p > 0) {
        if (p < 1 && rnd() > p) break;
        const gi = select(s);
        if (gi >= 0) perGeo[gi][bucketFor(gi, s.x, s.z)].push(s);
        p -= 1;
      }
      if (extra) {
        let q = extra(s) * swing;
        if (q > 0) {
          rnd = sideRnd;
          while (q > 0) {
            if (q < 1 && rnd() > q) break;
            const gi = select(s);
            if (gi >= 0) perGeo[gi][bucketFor(gi, s.x, s.z)].push({ ...s, mk: true });
            q -= 1;
          }
          rnd = mainRnd;
        }
      }
    }
    let total = 0;
    perGeo.forEach((buckets, gi) => buckets.forEach((list, bi) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geos[gi], (mats && mats[gi]) || mat, list.length);
      mesh.name = `${name}_${gi}${buckets.length > 1 ? `_b${bi}` : ''}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      list.forEach((p, j) => {
        rnd = p.mk ? sideRnd : mainRnd;
        // size in patches rather than per plant: knee-high beds next to
        // waist-high ones is the variation that survives to twenty metres
        const bulk = fbm(p.x * 0.11 - 18.4, p.z * 0.11 + 63.1, { octaves: 2, period: 5, seed: 5150 });
        const t = Math.pow(bulk * 0.6 + rnd() * 0.4, 1.2);
        let s = (scale[0] + t * (scale[1] - scale[0])) * lerp(shrink, 1, smoothstep(minRoad, minRoad + shrinkOver, p.d + p.dj * ragged));
        if (sizeAt) s *= sizeAt(p);
        // Per plant on top of the patch: the patch field alone left every tuft
        // in a bed the same size, and a bed of same-sized tufts is the repeat
        // the eye finds first. 0.6-1.4 of the patch size, biased toward the
        // middle so the extremes are the exception.
        s *= jitterS[0] + (jitterS[1] - jitterS[0]) * (0.5 + (rnd() - 0.5) * (0.6 + rnd() * 0.4) * 1.0);
        const jx = (rnd() - 0.5) * jitter;
        const jz = (rnd() - 0.5) * jitter;
        // `lean` is how far the plant follows the slope normal; the height
        // correction below then puts the base back on the ground where the
        // lean has lifted one side of it
        leanTo(p.nx, p.ny, p.nz, _quat, lean);
        _quat.multiply(_spin.setFromEuler(_euler.set(0, rnd() * Math.PI * 2, 0)));
        const slope = Math.hypot(p.nx, p.nz) / p.ny;
        // sink further on a slope: the flat base of a card stands proud of
        // the downhill side otherwise, and the gap under it is a hard line
        _pos.set(p.x + jx, p.y + yOff - Math.abs(jx * p.nx + jz * p.nz) * 0.5 - slope * s * 0.12, p.z + jz);
        _scl.set(s * (0.85 + rnd() * 0.35), s * (0.8 + rnd() * 0.5), s * (0.85 + rnd() * 0.35));
        _m4.compose(_pos, _quat, _scl);
        mesh.setMatrixAt(j, _m4);
        // tone in patches, with a per-plant break-up on the edges; the hue
        // swing runs straw-to-olive and never lets blue up
        const patch = fbm(p.x * 0.16 + 71.3, p.z * 0.16 - 24.7, { octaves: 2, period: 6, seed: 909 });
        const fine = fbm(p.x * 0.62 - 12.9, p.z * 0.62 + 41.5, { octaves: 2, period: 4, seed: 313 });
        const v = (tint[0] + Math.pow(patch * 0.5 + fine * 0.22 + rnd() * 0.28, 1.25) * tint[1]) * (valueAt ? valueAt(p) : 1);
        const hf = fbm(p.x * 0.09 + 137.4, p.z * 0.09 + 58.6, { octaves: 2, period: 7, seed: 6161 });
        const warm = (hf - 0.5) * hueSwing * 2 + (rnd() - 0.5) * hueSwing;
        let hr = 1;
        let hg = 1;
        let hb = 1;
        if (hues) {
          const h = hues[Math.min(hues.length - 1, Math.floor(clamp(hf * 0.6 + rnd() * 0.4) * hues.length))];
          [hr, hg, hb] = h;
        }
        _col.setRGB(v * hr * (1 + warm * 0.8), v * hg * (1 + warm * 0.1), v * hb * (1 - warm * 0.9));
        // road dust on the first couple of metres of verge: chroma out, value held
        if (dust > 0) {
          const near = 1 - smoothstep(minRoad - 0.6, minRoad + 3.0, p.d + p.dj * ragged);
          const k = dust * near * near * (0.4 + rnd() * 0.6);
          if (k > 0.004) {
            const g = (_col.r + _col.g + _col.b) / 3;
            _col.setRGB(lerp(_col.r, g * 1.12, k), lerp(_col.g, g * 1.04, k), lerp(_col.b, g * 0.9, k));
          }
        }
        // per-plant hue and value jitter, on top of the patch tone: two tufts
        // side by side out of the same prototype should never match
        if (hueJit > 0 || valJit > 0) {
          _col.getHSL(_hsl);
          _hsl.h = (_hsl.h + ((rnd() - 0.5) * 2 * hueJit) / 360 + 1) % 1;
          _hsl.l = clamp(_hsl.l * (1 + (rnd() - 0.5) * 2 * valJit), 0, 1);
          _col.setHSL(_hsl.h, _hsl.s, _hsl.l);
        }
        mesh.setColorAt(j, _col);
      });
      rnd = mainRnd;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      finishBucket(mesh, buckets.length);
      group.add(mesh);
      total += list.length;
    }));
    return total;
  }

  // Not scaled by the tree density any more. `treeCount` is the tier's tree
  // budget (150 at `fast`, 210 at `high`), and running the ground cover off
  // it gave the `fast` frames — the only frames anyone judges — seventy per
  // cent of the shipped grass on top of every other cut below. Ground cover
  // has its own tier dial (`Q.ug`); the trees keep theirs.
  const ug = Q.ug * (Q.ugCell / 2.0) ** 2;
  const ugCounts = {};
  const pickOf = (idx) => idx[Math.floor(rnd() * idx.length) % idx.length];
  // Where the grass is short: the verge, the pride's lawn, the camp's edge and
  // the bare patches. Everywhere else it stands tall, taller as the country opens.
  const shortAt = (s) => clamp(Math.max(s.lion * 0.8, s.camp, bareField(s.x, s.z) * 0.8, (1 - smoothstep(2.5, 7.5, s.d + s.dj)) * 0.7));

  // The tufts stopped dead at the reach: from the `far` pride framing the
  // tufted ground (its collars and root shadow, 0.2–0.26) met the swath plain
  // beyond (0.33) along one row. Thinned to nothing over the last fifth of the
  // reach (`reachTail`, on the count — the budget's tufts all stay inside
  // 45 m), and over the outer half the tufts shrink to 0.55 and lighten by a
  // third of a stop toward the swath's straw (`sizeTail`, on the size and the
  // value: no tuft added or removed). What the eye reads at the seam is the
  // tufts' dark footprint, which goes with their size and their value, and
  // from the `far` framing the outer half of the reach is twenty-odd rows
  // where the last fifth alone is ten: a count tail wide enough to ease it
  // on its own would have thinned the mid-ground the hero and pride framings
  // stand on.
  const reachTail = (d) => 1 - smoothstep(UG_REACH * 0.8, UG_REACH, d);
  const sizeTail = (d) => 1 - smoothstep(UG_REACH * 0.5, UG_REACH, d);
  // Grass: the ground itself. Nearly every site gets something; what it gets
  // is decided by the ground.
  const grassCount = (s) => {
    const bare = bareField(s.x, s.z);
    const gap = 1 - smoothstep(0.55, 1.0, s.camp);
    // Hands over to the swath cards with distance, but no longer by two
    // thirds at 38 m: the 20-45 m band is the mid-ground of every hero and
    // pride framing, and at a third of the near count it was bare dirt to
    // the treeline. The swath cards carry it further out.
    const far = 1 - 0.4 * smoothstep(22, 48, s.d);
    // A bare patch thins the grass to a third, not to a seventh — trodden
    // and grazed ground still has its tufts, and a savanna that goes to
    // zero over ten metres reads as a car park.
    return (2.1 + s.open * 0.5) * ug * (1 - bare * 0.66) * gap * far * reachTail(s.d);
  };
  ugCounts.grass = scatter(grassGeos, grassMat, {
    // the trodden patch used to be grazed thin as well as short; the 0.7 stays
    // in `count` so the main stream is unchanged, and `extra` puts it back
    count: (s) => grassCount(s) * lerp(1, 0.7, s.lawn),
    // The trodden patch is grazed short, not thin: grazing takes the height
    // off a tuft and leaves the plant, and the 0.7 count cut inside the lawn
    // was a third of why the pride's own ground read as bare dirt (round 4).
    // Back to the plain's count and 1.2 over it: a grazed lawn is a dense
    // turf of short tufts. Measured on the `pride` framing with the tufts
    // hidden and shown (the exact tuft pixels, not a colour mask — the
    // round-4 "18.6 % straw" there was 96 % soil fleck; the tufts were 3.5 %
    // of the lower third): parity with the size at 0.8 left it at 3.5 %,
    // 1.7x at 0.85 and the upright forms 22.6 %; 2.2x 26.4 %. Eased over the
    // inner four metres, where the animals lie: the lie-up is the barest
    // ground and the turf thickens from it outward. Eased to 0.8, not 0.55:
    // at 0.55 the two boxes in front of the lying lions stayed at the round-4
    // cover (8–9 %) while the plain behind them filled, and a lie-up is
    // trodden turf, not swept dirt.
    extra: (s) => grassCount(s) * 1.6 * s.lawn * lerp(0.8, 1, smoothstep(2.5, 6, Math.hypot(s.x - lions.x, s.z - lions.z))),
    seed: 20260805,
    mats: grassGeos.map((_, i) => (GI_LAWN.includes(i) ? lawnMat : grassMat)),
    select: (s) => {
      const sh = shortAt(s);
      if (s.lawn > 0.5) return pickOf(GI_LAWN);
      if (s.shade > 0.3 && rnd() < s.shade * 0.8) return pickOf(GI_GREEN);
      if (wet(s.x, s.z) > 0.64 && rnd() < 0.5) return pickOf(GI_GREEN);
      if (rnd() < sh) return pickOf(GI_SHORT);
      // two card sizes everywhere: about a third of the open plain is the
      // knee-high tuft, the rest the waist-high one
      return rnd() < 0.62 + s.open * 0.12 ? pickOf(GI_TALL) : pickOf(GI_SHORT);
    },
    minRoad: 1.6,
    scale: [0.55, 1.55],
    // three quarters of the way to the slope normal, and the base a further
    // five centimetres into the ground: a tuft standing vertical on a bank
    // shows a gap under its uphill side, and a gap under a card is the one
    // thing that says card
    lean: 0.75,
    yOff: -0.09,
    drift: 0.6,
    jitter: 1.9,
    tint: [0.4, 0.3],
    hueSwing: 0.14,
    // straw, grey straw, tawny, and a cooler khaki, by patch: one straw across
    // a whole plain is what makes a savanna look painted
    hues: [
      [1, 1, 1],
      [0.94, 0.96, 1.02],
      [1.06, 0.98, 0.88],
      [0.9, 0.94, 0.96],
    ],
    shrink: 0.5,
    shrinkOver: 4.5,
    ragged: 1.2,
    // Was 0.62 x 0.6 at the anchor — a tuft at a third of its size, which is
    // a tuft that is not there from twenty metres. Short species carry the
    // grazing now; the size only eases.
    // Graze ring at 0.8, not 0.68, and the lawn at 0.85, not 0.72: the three
    // factors stack (lion 0.85 x lawn x graze), and at 0.85 x 0.72 x 0.68 the
    // tufts round the pride were at half size — a tuft that is not there
    // from eleven metres. 0.85 x 0.85 x 0.8 = 0.58: knee-high on the short
    // geometry, which is what grazed means.
    sizeAt: (s) => lerp(1.0, 0.85, s.lion) * lerp(1.0, 0.75, s.camp) * lerp(1.0, 0.85, s.lawn) * lerp(1.0, 0.8, s.graze) * lerp(0.55, 1.0, sizeTail(s.d)),
    valueAt: (s) => lerp(1.26, 1.0, sizeTail(s.d)),
    dust: 0.5,
    name: 'grass',
  });
  // scrub: thickets in the wooded country, the odd bush in the open
  ugCounts.scrub = scatter(scrubGeos, scrubMat, {
    count: (s) => {
      if (s.camp > 0.05 || s.lion > 0.05) return 0;
      const g = smoothstep(0.5, 0.75, fbm(s.x * 0.5 + 61.7, s.z * 0.5 - 38.2, { octaves: 3, period: 4.5, seed: 4242, gain: 0.55 }));
      return lerp(0.36, 0.05, s.open) * ug * (0.25 + g * 1.6) * (s.kopje < 8 ? 1.8 : 1);
    },
    select: (s) => {
      // The species is picked off a field, not per bush. The eight prototypes
      // are four species on four tiles — olive, straw thicket, flowering
      // lime, silver — and drawn at random two bushes a metre apart came out
      // lime beside grey-straw, which read as one species painted two ways.
      // Species run in stands; a stand a dozen metres across is what the
      // field gives, and inside it the prototypes of that species alternate.
      const f = fbm(s.x * 0.08 + 311.7, s.z * 0.08 - 95.3, { octaves: 2, period: 6, seed: 4545 });
      let family;
      if (s.open > 0.5 && f > 0.56) family = f > 0.7 ? [4, 4, 6] : [5, 0, 7];
      else family = f < 0.4 ? [0, 1, 5] : f < 0.56 ? [2, 3, 6] : f < 0.7 ? [7, 0, 1] : [4, 6, 3];
      return family[Math.floor(rnd() * family.length) % family.length];
    },
    minRoad: 4.6,
    scale: [0.5, 1.5],
    lean: 0.55,
    yOff: -0.07,
    drift: 0.3,
    jitterS: [0.7, 1.3],
    jitter: 1.8,
    // held under the grass: a bush in the open is a dusty grey-green mass
    // that the straw around it out-values, never a bright green blob
    tint: [0.5, 0.28],
    // Hue held to about six degrees per plant (the swing runs straw-to-olive
    // over a patch, the jitter on top of it); the value jitter is kept — two
    // bushes of one species differ in how much sun they got, not in colour.
    hueSwing: 0.05,
    hueJit: 3,
    shrink: 0.45,
    shrinkOver: 5.0,
    castShadow: true,
    dust: 0.3,
    bucket: B_CHEAP,
    name: 'scrub',
  });
  // forbs: seed stalks through the tall grass, aloes at the rocks, daisies in
  // patches, and fallen thorn wood under the trees
  // The aloes are one designed bed, at the foot of the pride's kopje, and
  // nowhere else. Scattered at every outcrop they were a third of what a camera
  // near the camp saw of the ground cover, and an aloe with an orange spike is
  // a desert plant to anyone who is not told otherwise; one clump of them at
  // the one rock the frames compose against is a landmark instead.
  const aloeBed = kopjes[0];
  const aloeAt = (s) => Math.hypot(s.x - aloeBed.x, s.z - aloeBed.z) - aloeBed.r < 5 && s.camp < 0.02;
  ugCounts.forb = scatter(forbGeos, forbMat, {
    count: (s) => (s.camp > 0.05 || s.lawn > 0.3 ? 0 : 0.42 * ug * (1 - s.lion * 0.7)),
    // forbs stand through the graze ring and stop only where the animals
    // actually lie (the lawn's inner half); at `lawn > 0.3` they were cut a
    // metre outside the ring's edge and the near ground lost its stalks. In
    // `extra` so the cut-off moves without re-laying every forb after it.
    extra: (s) => (s.camp > 0.05 || s.lawn <= 0.3 || s.lawn > 0.6 ? 0 : 0.42 * ug * (1 - s.lion * 0.7)),
    seed: 20260806,
    select: (s) => {
      const r = rnd();
      if (aloeAt(s) && r < 0.5) return 0;
      if (s.shade > 0.25 && r < 0.4) return 4;
      if (r < 0.14 && fbm(s.x * 0.2 + 15.9, s.z * 0.2 + 47.3, { octaves: 2, period: 4, seed: 4343 }) > 0.62) return 3;
      if (r < 0.6 && shortAt(s) < 0.4) return 1 + Math.floor(rnd() * 2);
      return -1;
    },
    minRoad: 4.2,
    scale: [0.6, 1.3],
    lean: 0.55,
    yOff: -0.07,
    jitterS: [0.75, 1.3],
    jitter: 1.8,
    tint: [0.62, 0.3],
    hueSwing: 0.06,
    hueJit: 4,
    shrink: 0.4,
    shrinkOver: 5.0,
    bucket: B_CHEAP,
    name: 'forb',
  });
  // ground litter: leaf fall under the crowns, thatch and stones on the bare
  // ground, twigs and dung anywhere
  ugCounts.litter = scatter(litterGeos, litterMat, {
    count: (s) => {
      const bare = bareField(s.x, s.z);
      return (0.5 + bare * 1.2 + s.shade * 1.4) * ug * (1 - s.camp);
    },
    select: (s) => {
      const r = rnd();
      if (s.shade > 0.2 && r < 0.6) return 0;
      if (r < 0.35) return 1;
      if (r < 0.7) return 2;
      return 3;
    },
    minRoad: 3.2,
    scale: [0.7, 1.4],
    lean: 0.95,
    yOff: 0.02,
    jitterS: [0.8, 1.25],
    hueJit: 4,
    valJit: 0.1,
    jitter: 1.7,
    tint: [0.6, 0.26],
    hueSwing: 0.05,
    ragged: 0.6,
    dust: 0.6,
    name: 'litter',
  });

  // Mid-distance grass: crossed swath cards from where a tuft is a few pixels
  // wide out to the terrain edge. Not gated on the road at all past the near
  // band, because the plain has to run to the horizon in every direction.
  {
    const SWATH_IN = 16;
    const lists = swathGeos.map(() => bucketLists(B_CHEAP));
    sites(Q.swathCell, span, (x, z) => {
      const d = terrain.roadDistance(x, z);
      if (d < SWATH_IN) return;
      if (inCamp(x, z, 0.7)) return;
      if (kopjeDist(x, z) < 0.5) return;
      if (hole && Math.hypot(x - hole.x, z - hole.z) < (hole.radius ?? 0) + 1.0) return;
      const bare = bareField(x, z);
      if (rnd() < bare * 0.8) return;
      // the same drift field as the tufts, so a sweep of grass that starts at
      // the verge carries on into the swath band instead of stopping at 16 m
      const drift = smoothstep(0.15, 0.85, fbm(x * 0.055 + 8.3, z * 0.055 - 27.1, { octaves: 3, period: 6, seed: 3131 }));
      if (rnd() > lerp(0.62, 1.0, drift)) return;
      const lionD = Math.hypot(x - lions.x, z - lions.z);
      const lion = 1 - smoothstep(lionR * 0.5, lionR * 1.2, lionD);
      // the trodden patch: a bank card is a metre of straw, and there is
      // little of it where the pride lies
      if (lionD < 12 && rnd() < 0.75) return;
      const open = openAt(x, z);
      const w = wet(x, z);
      let k;
      if (w > 0.64 && rnd() < 0.6) k = pick(SWATH_OF.green, rnd);
      else if (lion > 0.3 || rnd() < 0.2 - open * 0.1) k = pick(SWATH_OF.short, rnd);
      else k = rnd() < 0.62 ? pick(SWATH_OF.tall, rnd) : pick(SWATH_OF.thatch, rnd);
      lists[k][bucketOf(x, z, B_CHEAP)].push({ x, z, y: terrain.heightAt(x, z), lion, fade: smoothstep(SWATH_IN, SWATH_IN + 10, d) });
    });
    let n = 0;
    lists.forEach((buckets, k) => buckets.forEach((list, bi) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(swathGeos[k], swathMat, list.length);
      mesh.name = `swath_${k}${B_CHEAP > 1 ? `_b${bi}` : ''}`;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      list.forEach((p, j) => {
        const bulk = fbm(p.x * 0.11 - 18.4, p.z * 0.11 + 63.1, { octaves: 2, period: 5, seed: 5150 });
        // 0.6-1.4 per bank on top of the patch: at one size the banks were a
        // row of pom-poms, and the band they stand in is the one the eye
        // reads for scale against the trees
        const s = (0.8 + bulk * 0.6) * lerp(0.5, 1, p.fade) * lerp(1, 0.75, p.lion) * (0.6 + rnd() * 0.8);
        // on the slope, and a little into it
        groundQuat(p.x, p.z, _quat, 0.6);
        _quat.multiply(_spin.setFromEuler(_euler.set(0, rnd() * Math.PI * 2, 0)));
        _pos.set(p.x, p.y - 0.1, p.z);
        _scl.set(s * (0.9 + rnd() * 0.3), s * (0.85 + rnd() * 0.3), s);
        _m4.compose(_pos, _quat, _scl);
        mesh.setMatrixAt(j, _m4);
        const patch = fbm(p.x * 0.16 + 71.3, p.z * 0.16 - 24.7, { octaves: 2, period: 6, seed: 909 });
        const v = 0.5 + patch * 0.36 + rnd() * 0.08;
        const warm = (patch - 0.5) * 0.2;
        _col.setRGB(v * (1 + warm * 0.8), v, v * (1 - warm * 0.9));
        _col.getHSL(_hsl);
        _col.setHSL((_hsl.h + ((rnd() - 0.5) * 16) / 360 + 1) % 1, _hsl.s, clamp(_hsl.l * (1 + (rnd() - 0.5) * 0.3), 0, 1));
        mesh.setColorAt(j, _col);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      finishBucket(mesh, buckets.length);
      group.add(mesh);
      n += list.length;
    }));
    ugCounts.swath = n;
  }

  // --- rock: kopjes and scattered stone ----------------------------------------
  const boulderGeos = [rockGeo(9001, 2, 'boulder'), rockGeo(9107, 2, 'boulder'), rockGeo(9211, 2, 'slab')];
  {
    // A kopje is a pile: big rounded boulders half buried at the centre, smaller
    // ones leaning on them, one or two perched on top. Placement is by hand
    // rather than physics, with each rock sunk into whatever is under it.
    const lists = boulderGeos.map(() => []);
    for (const k of kopjes) {
      const r2 = mulberry32(k.seed);
      const base = terrain.heightAt(k.x, k.z);
      // `s` is a boulder's radius in metres. A kopje's rocks are big for
      // rocks — two to four metres — and it is the pile that is large, not any
      // one stone: a single sphere the size of the outcrop read as a blob on
      // the skyline from the mainline.
      // A whaleback first: the granite dome the pile sits on, a wide slab sunk
      // to a third of its height. It is what makes the outcrop a landmark from
      // the mainline rather than a scatter of stones — the pile alone, at boulder
      // scale, disappeared into the grass at a hundred metres.
      //
      // `s` is a *diameter*: rockGeo is a unit-diameter icosahedron, and the
      // slab style is a third as tall as it is wide.
      lists[2].push({ x: k.x, y: base - 0.3, z: k.z, s: k.r * 1.4, rx: (r2() - 0.5) * 0.14, ry: r2() * Math.PI * 2, rz: (r2() - 0.5) * 0.14, sy: 1.0, v: 0.78 + r2() * 0.12 });
      const n = 14 + Math.floor(r2() * 6);
      for (let i = 0; i < n; i++) {
        const core = i < 4;
        const a = r2() * Math.PI * 2;
        const rr = core ? k.r * (0.05 + r2() * 0.2) : k.r * (0.5 + r2() * 0.6);
        const x = k.x + Math.cos(a) * rr;
        const z = k.z + Math.sin(a) * rr;
        const s = core ? k.r * (0.5 + r2() * 0.2) : k.r * (0.15 + r2() * 0.17);
        // cores sit on the dome and lean on each other; the scatter sits on the ground
        const y = core ? base + k.r * 0.15 + k.r * 0.08 * i : terrain.heightAt(x, z) - s * 0.15;
        lists[Math.floor(r2() * lists.length)].push({ x, y, z, s, rx: (r2() - 0.5) * 0.7, ry: r2() * Math.PI * 2, rz: (r2() - 0.5) * 0.7, sy: core ? 0.75 + r2() * 0.25 : 0.6 + r2() * 0.4, v: 0.74 + r2() * 0.22 });
      }
      // perched: two boulders sitting up on the core, the skyline of the pile
      for (let i = 0; i < 2; i++) {
        const s = k.r * (0.3 + r2() * 0.1);
        lists[i].push({ x: k.x + (r2() - 0.5) * k.r * 0.3, y: base + k.r * (0.55 + i * 0.08), z: k.z + (r2() - 0.5) * k.r * 0.3, s, rx: (r2() - 0.5) * 0.5, ry: r2() * 6, rz: (r2() - 0.5) * 0.5, sy: 0.7 + r2() * 0.3, v: 0.82 + r2() * 0.14 });
      }
    }
    lists.forEach((list, k) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(boulderGeos[k], rockMat, list.length);
      mesh.name = `kopje_${k}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      list.forEach((p, j) => {
        _pos.set(p.x, p.y, p.z);
        _quat.setFromEuler(_euler.set(p.rx, p.ry, p.rz));
        _scl.set(p.s, p.s * p.sy, p.s * (0.85 + (p.sy - 0.7) * 0.3));
        _m4.compose(_pos, _quat, _scl);
        mesh.setMatrixAt(j, _m4);
        _col.setRGB(p.v, p.v * 0.98, p.v * 0.95);
        mesh.setColorAt(j, _col);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
    });
  }
  const rockSet = [
    { geo: rockGeo(9301, 1, 'boulder'), count: Math.round(34 * ug), scale: [0.6, 1.9], minRoad: 3.6 },
    { geo: rockGeo(9403, 1, 'angular'), count: Math.round(30 * ug), scale: [0.5, 1.6], minRoad: 3.4 },
    { geo: rockGeo(9507, 0, 'cobble'), count: Math.round(140 * ug), scale: [0.25, 0.8], minRoad: 2.4 },
    { geo: rockGeo(9601, 0, 'slab'), count: Math.round(110 * ug), scale: [0.25, 0.7], minRoad: 2.4 },
  ];
  rockSet.forEach(({ geo, count, scale, minRoad }, i) => {
    const mesh = new THREE.InstancedMesh(geo, rockMat, count);
    mesh.name = `rock_${i}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    let n = 0;
    let tries = 0;
    while (n < count && tries < count * 40) {
      tries++;
      const x = (rnd() - 0.5) * span * 1.7;
      const z = (rnd() - 0.5) * span * 1.7;
      const d = terrain.roadDistance(x, z);
      if (d < minRoad || reserved(x, z, 3)) continue;
      // stone collects near the kopjes and in fields, not as an even dust
      const kd = kopjeDist(x, z);
      if (kd > 14 && fbm(x * 0.03 + 7, z * 0.03 + 13, { octaves: 3, period: 32, seed: 2020 }) < 0.5 && rnd() < 0.8) continue;
      const s = scale[0] + Math.pow(rnd(), 1.7) * (scale[1] - scale[0]) * (d < 9 ? 0.5 : 1) * (kd < 14 ? 1.4 : 1);
      _pos.set(x, terrain.heightAt(x, z) - s * (0.24 + rnd() * 0.2), z);
      _quat.setFromEuler(_euler.set(rnd() * 0.7, rnd() * Math.PI * 2, rnd() * 0.7));
      _scl.set(s, s * (0.66 + rnd() * 0.55), s * (0.82 + rnd() * 0.45));
      _m4.compose(_pos, _quat, _scl);
      mesh.setMatrixAt(n, _m4);
      const v = 0.8 + rnd() * 0.36;
      _col.setRGB(v, v * (0.97 + rnd() * 0.04), v * (0.93 + rnd() * 0.06));
      mesh.setColorAt(n, _col);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  });

  // --- termite mounds ----------------------------------------------------------
  {
    const geos = [termiteGeo(9701), termiteGeo(9803), termiteGeo(9907)];
    const lists = geos.map(() => []);
    for (const t of termiteSpots) lists[t.k].push(t);
    let n = 0;
    lists.forEach((list, k) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geos[k], earthMat, list.length);
      mesh.name = `termite_${k}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      list.forEach((p, j) => {
        groundQuat(p.x, p.z, _quat, 0.6);
        _quat.multiply(_spin.setFromEuler(_euler.set(0, p.r, 0)));
        _pos.set(p.x, p.y - 0.08, p.z);
        _scl.set(p.s * (0.85 + rnd() * 0.3), p.s * (0.8 + rnd() * 0.5), p.s * (0.85 + rnd() * 0.3));
        _m4.compose(_pos, _quat, _scl);
        mesh.setMatrixAt(j, _m4);
        _col.setRGB(p.v, p.v * (0.96 + rnd() * 0.06), p.v * 0.94);
        mesh.setColorAt(j, _col);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
      n += list.length;
    });
    ugCounts.termite = n;
  }

  // --- fallen wood ---------------------------------------------------------------
  const RADIAL = 11;
  function logLump(seed, along, a) {
    const lump = fbm(along * 1.1 + 3, Math.cos(a) * 1.4 + Math.sin(a) * 0.6 + 7, { octaves: 2, period: 6, seed: seed + 31 }) - 0.5;
    const fine = fbm(along * 5.5 + 11, a * 2.2 + 19, { octaves: 2, period: 8, seed: seed + 41 }) - 0.5;
    return 1 + lump * 0.3 + fine * 0.14;
  }
  function logGeo(seed, len, r0, r1) {
    const r2 = mulberry32(seed + 17);
    const g = trunkGeo({ height: len, baseR: r0, tipR: r1, radial: RADIAL, segs: 9, flare: 0.35, taper: 0.7, seed, uRepeat: 1.6, vScale: 1.05, bulge: 0.16, axis: (t) => [Math.sin(t * 2.1 + seed * 0.01) * len * 0.02, 0] });
    {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        if (Math.hypot(x, z) < 1e-4) continue;
        const s = logLump(seed, pos.getY(i), Math.atan2(z, x));
        pos.setX(i, x * s);
        pos.setZ(i, z * s);
      }
    }
    g.rotateZ(Math.PI / 2);
    g.translate(len * 0.5, 0, 0);
    const wave = 3.4 + r2() * 2.2;
    const sag = (t) => Math.sin(t * Math.PI) * r0 * 0.55 - (1 - Math.cos((1 - t) * wave)) * 0.5 * r0 * 0.3;
    {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + sag(clamp(pos.getX(i) / len + 0.5)));
    }
    g.computeVertexNormals();
    const parts = [g];
    // branch stubs: a fallen acacia limb is all elbows
    const stubs = 4 + Math.floor(r2() * 3);
    for (let i = 0; i < stubs; i++) {
      const t = 0.1 + (i / stubs) * 0.78 + r2() * 0.08;
      const a = r2() * Math.PI * 2;
      const rr = lerp(r1, r0, t) * logLump(seed, (1 - t) * len, a);
      const out = rr * (2.0 + r2() * 3.4);
      const px = len * (t - 0.5);
      const y0 = sag(t);
      parts.push(limb([[px, y0 + Math.sin(a) * rr * 0.3, Math.cos(a) * rr * 0.3], [px + (r2() - 0.5) * 0.5, y0 + Math.sin(a) * out, Math.cos(a) * out]], rr * 0.32, rr * 0.12, { radial: 5, segs: 1, vScale: 0.9 }));
    }
    return merge(parts);
  }
  function logEndGeo(seed, len, r0) {
    const positions = [0, 0, 0];
    const uvs = [0.5, 0.5];
    const indices = [];
    for (let j = 0; j <= RADIAL; j++) {
      const a = (j / RADIAL) * Math.PI * 2;
      const rr = r0 * logLump(seed, 0, a) * 0.97;
      positions.push(0, Math.sin(a) * rr, Math.cos(a) * rr);
      uvs.push(0.5 + Math.cos(a) * 0.48, 0.5 + Math.sin(a) * 0.48);
      if (j > 0) indices.push(0, j + 1, j);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.translate(len * 0.5 - r0 * 0.1, 0, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) + (pos.getY(i) * 0.16 + pos.getZ(i) * 0.1));
    g.computeVertexNormals();
    return g;
  }
  const logProtos = [
    { len: 6.4, r0: 0.3, r1: 0.18, seed: 9601, count: 16 },
    { len: 4.2, r0: 0.22, r1: 0.12, seed: 9703, count: 22 },
    { len: 2.2, r0: 0.16, r1: 0.1, seed: 9907, count: 26 },
  ];
  logProtos.forEach((L, i) => {
    const count = Math.round(L.count * ug);
    const geo = windWeight(logGeo(L.seed, L.len, L.r0, L.r1), () => 0);
    const end = windWeight(logEndGeo(L.seed, L.len, L.r0), () => 0);
    // the big ones have lost their bark; the small ones are dead limb wood
    const logs = new THREE.InstancedMesh(geo, i === 0 ? barkMats.dead : barkMats.log, count);
    const ends = new THREE.InstancedMesh(end, barkMats.endGrain, count);
    logs.name = `log_${i}`;
    ends.name = `logEnd_${i}`;
    logs.castShadow = true;
    logs.receiveShadow = true;
    ends.castShadow = false;
    ends.receiveShadow = true;
    let n = 0;
    let tries = 0;
    while (n < count && tries < count * 90) {
      tries++;
      let x;
      let z;
      if (rnd() < 0.5) {
        const t = rnd();
        const p = terrain.roadPoint(t);
        const g = terrain.roadTangent(t);
        const side = rnd() < 0.5 ? 1 : -1;
        const off = DEAD_MIN + Math.pow(rnd(), 0.8) * 19;
        x = p.x - g.z * off * side;
        z = p.z + g.x * off * side;
      } else {
        x = (rnd() - 0.5) * span * 1.5;
        z = (rnd() - 0.5) * span * 1.5;
      }
      if (Math.abs(x) > span || Math.abs(z) > span) continue;
      const d = terrain.roadDistance(x, z);
      if (d < DEAD_MIN || reserved(x, z, 3)) continue;
      // fallen wood lies under the trees it came off
      if (treeShade(x, z) < 0.05 && rnd() < 0.7) continue;
      const s = 0.8 + rnd() * 0.55;
      const allow = Math.min(d < DEAD_CLEAR ? DEAD_SHORT : d < DEAD_ALIGN ? 7.5 : 15.0, camAllow(x, z));
      let ls = 0.66 + rnd() * 0.72;
      ls = Math.min(ls, allow / (L.len * s));
      if (ls < 0.42) continue;
      const world = L.len * s * ls;
      let yaw = rnd() * Math.PI * 2;
      if (world > 2.4 && d < DEAD_ALIGN) yaw = roadYaw(x, z) + (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.42;
      if (!axisClears(x, z, yaw, world, world > DEAD_SHORT + 0.3 ? DEAD_CLEAR : DEAD_MIN)) continue;
      groundQuat(x, z, _quat, 0.85);
      _quat.multiply(_spin.setFromEuler(_euler.set((rnd() - 0.5) * 0.24, yaw, (rnd() - 0.5) * 0.1)));
      _pos.set(x, terrain.heightAt(x, z) + L.r0 * s * 0.62, z);
      _scl.set(s * ls, s, s);
      _m4.compose(_pos, _quat, _scl);
      logs.setMatrixAt(n, _m4);
      ends.setMatrixAt(n, _m4);
      const v = 0.72 + rnd() * 0.4;
      _col.setRGB(v, v * 0.98, v * 0.93);
      logs.setColorAt(n, _col);
      _col.setRGB(v * 1.04, v * 0.99, v * 0.9);
      ends.setColorAt(n, _col);
      n++;
    }
    logs.count = n;
    ends.count = n;
    logs.instanceMatrix.needsUpdate = true;
    ends.instanceMatrix.needsUpdate = true;
    if (logs.instanceColor) logs.instanceColor.needsUpdate = true;
    if (ends.instanceColor) ends.instanceColor.needsUpdate = true;
    group.add(logs, ends);
  });

  // --- horizon: ground skirt, scrub-line rings, far hills ------------------------
  {
    const inner = terrain.size * 0.497;
    const outer = 420;
    const perim = 128;
    const rings = 9;
    const positions = [];
    const uvs = [];
    const indices = [];
    const cols = perim + 1;
    const squarePoint = (h, s) => {
      const side = Math.floor(s) % 4;
      const f = s - Math.floor(s);
      const a = -h + f * 2 * h;
      if (side === 0) return [a, -h];
      if (side === 1) return [h, a];
      if (side === 2) return [-a, h];
      return [-h, -a];
    };
    for (let k = 0; k <= rings; k++) {
      const h = lerp(inner, outer, Math.pow(k / rings, 2.0));
      for (let i = 0; i <= perim; i++) {
        const [gx, gz] = squarePoint(h, ((i % perim) / perim) * 4);
        positions.push(gx, terrain.heightAt(gx, gz) - 0.12, gz);
        uvs.push(gx * 0.05, gz * 0.05);
      }
    }
    for (let k = 0; k < rings; k++) {
      for (let i = 0; i < perim; i++) {
        const a = k * cols + i;
        indices.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    const skirt = new THREE.Mesh(g, skirtMat);
    skirt.name = 'forestSkirt';
    skirt.castShadow = false;
    skirt.receiveShadow = false;
    group.add(skirt);
  }

  // Three low rings of scattered far trees, each hazier than the one in front.
  // Low on purpose: an acacia is six metres, and a horizon that is mostly sky
  // with the odd flat crown standing on it is the whole biome in one line.
  const RINGS = [
    // heights spread nearly three to one, so the skyline steps card to card
    // instead of running level round the whole horizon; `gap` is the share of
    // cards left out altogether, so that seen from across the plain, where
    // three rings stack, there is still open horizon between the crowns
    { r: terrain.size * 0.54, h: [6, 15], mat: 0, cards: 40, drop: 1.0, gap: 0.22 },
    { r: terrain.size * 0.72, h: [6, 15], mat: 1, cards: 48, drop: 2.0, gap: 0.3 },
    { r: terrain.size * 0.94, h: [5, 13], mat: 2, cards: 56, drop: 3.5, gap: 0.36 },
  ];
  RINGS.forEach((ring, ri) => {
    const parts = [];
    for (let i = 0; i < ring.cards; i++) {
      const a = (i / ring.cards) * Math.PI * 2 + (rnd() - 0.5) * 0.02;
      const chord = 2 * ring.r * Math.sin(Math.PI / ring.cards) * 1.12;
      // squared: most cards low, the odd tall one, which is a savanna skyline
      const h = lerp(ring.h[0], ring.h[1], rnd() * rnd());
      if (rnd() < ring.gap) continue;
      // the strip is four to one, so a card carries a quarter of it at true aspect
      const w = Math.max(chord, h * 4);
      const g = new THREE.PlaneGeometry(w, h, 1, 1);
      // the window has to stay inside [0, 1]: the strip clamps at its edges,
      // and a window that runs past 1 smears the last column into a slab
      const uw = (w / (h * 4)) * 0.25;
      const u0 = rnd() * (1 - uw);
      const flip = rnd() < 0.5;
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) {
        const t = flip ? 1 - uv.getX(k) : uv.getX(k);
        uv.setX(k, u0 + t * uw);
      }
      g.translate(0, h * 0.5, 0);
      g.rotateY(-a - Math.PI / 2);
      const x = Math.cos(a) * ring.r;
      const z = Math.sin(a) * ring.r;
      g.translate(x, terrain.heightAt(x, z) - h * 0.02 - ring.drop, z);
      parts.push(g);
    }
    const mesh = new THREE.Mesh(merge(parts), treelineMats[ring.mat]);
    mesh.name = `treeline_${ri}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = -820 + ri;
    group.add(mesh);
  });

  // No ridge cards. The forest had two rings of 44–66 m ridge silhouettes at
  // 560 and 690 m, unlit, unfogged and pale grey-beige, and under a savanna sky
  // they stood among the terrain's far hills as a band brighter than the sky
  // they were in front of — three specialists saw it from three sides. The
  // terrain's farHills carry the horizon now, and they take the hour's fog.

  // --- wiring ------------------------------------------------------------------
  const allMats = [...Object.values(barkMats), acaciaMat, grassMat, lawnMat, swathMat, scrubMat, forbMat, litterMat, billboardMat, rockMat, earthMat, skirtMat];
  // not the skirt: on a Lambert material three's environment map is a mirror
  // term at full reflectivity, not the Standard material's probe sheen
  if (env) for (const m of allMats) if (m !== skirtMat) m.envMap = env;
  const windMats = allMats.filter((m) => m.userData.wind);
  group.traverse((o) => {
    if ((o.isMesh || o.isInstancedMesh) && o.material?.userData?.foliage) skipAoPrepass(o);
  });

  return {
    group,
    materials: { barkMats, needleMat: acaciaMat, acaciaMat, leafMat: acaciaMat, grassMat, lawnMat, swathMat, scrubMat, forbMat, litterMat, billboardMat, rockMat, earthMat, skirtMat },
    stats: { nearTrees: nearPlaced, midTrees: midPlaced, farTrees: farPlaced, protos: protos.length, sites: ugSites.length, kopjes: kopjes.length, ...ugCounts },
    layout: { kopjes, lionTrees },
    update(t) {
      for (const m of windMats) m.userData.wind.uTime.value = t;
    },
  };
}
