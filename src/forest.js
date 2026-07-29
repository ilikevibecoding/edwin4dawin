import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, SUN } from './palette.js';
import { boxUV } from './lib/geo.js';
import { clamp, fbm, lerp, mulberry32, smoothstep } from './textures/core.js';
import {
  atlasTile,
  barkMaps,
  birchBarkMaps,
  deadWoodMaps,
  endGrainMaps,
  farGroundMaps,
  fernAtlas,
  grassAtlas,
  leafAtlas,
  litterAtlas,
  logBarkMaps,
  mossMaps,
  needleAtlas,
  ridgeTexture,
  rockMaps,
  shrubAtlas,
  stalkAtlas,
  treeBillboardAtlas,
  treelineTexture,
  understoryAtlas,
} from './textures/nature.js';

// ---------------------------------------------------------------------------
// The forest.
//
// Three depth bands, because a single one either reads as sparse or costs too
// much: hand-built geometry trees along the road corridor, painted whole-tree
// billboards filling everything out to the terrain edge, and a ring of
// silhouette treeline plus a ground skirt that hides where the world stops.
//
// Foliage cards are bowed, get canopy-shell normals rather than their own flat
// quad normals, and pick one of four species tiles out of a shared atlas, so a
// card is hard to isolate by eye and the whole forest is still a few dozen
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

const SUN_DIR = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(90 - SUN.elevation),
  THREE.MathUtils.degToRad(SUN.azimuth),
);

const linear = (hex, mul = 1) => new THREE.Color(hex).convertSRGBToLinear().multiplyScalar(mul);
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];

// ---------------------------------------------------------------------------
// Shader plumbing
// ---------------------------------------------------------------------------

/** Wind sway driven by a per-vertex weight attribute plus per-instance phase. */
function applyWind(material, { amplitude = 0.16, speed = 1.0 } = {}) {
  material.userData.wind = { uTime: { value: 0 }, uAmp: { value: amplitude }, uSpeed: { value: speed } };
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
        uniform float uSpeed;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 iOrigin = instanceMatrix[ 3 ].xyz;
        #else
          vec3 iOrigin = vec3( 0.0 );
        #endif
        float ph = iOrigin.x * 0.35 + iOrigin.z * 0.27;
        float gust = sin( uTime * 0.23 * uSpeed + ph * 0.31 ) * 0.5 + 0.72;
        float sway = sin( uTime * 1.05 * uSpeed + ph ) * 0.72 + sin( uTime * 2.7 * uSpeed + ph * 2.3 ) * 0.28;
        transformed.x += sway * aWind * uAmp * gust;
        transformed.z += cos( uTime * 0.83 * uSpeed + ph * 1.3 ) * aWind * uAmp * 0.7 * gust;
        transformed.y -= abs( sway ) * aWind * uAmp * 0.16;`,
      );
  };
  material.customProgramCacheKey = () => 'wind-' + material.uuid;
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
function barkMaterial(maps, { moss = PALETTE.moss, mossMax = 0.9, mossHeight = 6.0, windAmp = 0.07, windSpeed = 0.6, normalScale = 1.4, deadfall = false, grainRepeat = 4.7 } = {}) {
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
    uHazeCol: { value: linear(0x272016) },
    uHaze: { value: 0.97 },
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
        uniform vec3 uHazeCol;
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
        {
          // Canopy occlusion on the bole. A trunk in a closed stand sees very
          // little sky, but the hemisphere light and the environment probe reach
          // it at full strength, which is what kept a lit bole measuring slightly
          // *brighter* than the crown behind it — the reverse of a photograph.
          // Least sky at the foot, where the undergrowth closes in as well.
          ${
            deadfall
              ? `vec3 wNa = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
          reflectedLight.indirectDiffuse *= mix( 0.34, 0.92, smoothstep( -0.4, 0.85, wNa.y ) );`
              : `reflectedLight.indirectDiffuse *= mix( 0.56, 0.86, smoothstep( 0.5, 7.0, vTreeY ) );`
          }
          reflectedLight.indirectSpecular *= 0.7;
        }`,
      )
      .replace(
        '#include <fog_fragment>',
        `{
          // Same aerial ramp as the foliage. Bark is what a mid-distance trunk
          // shows most of, and unramped it takes its value straight off the fog,
          // which is brighter than the sky — hence the row of pale poles standing
          // in front of a darker forest at 60 to 120 m.
          float hd = length( vBarkWPos - cameraPosition );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, uHazeCol, uHaze * ( 1.0 - exp( -max( hd - uHazeNear, 0.0 ) / uHazeFar ) ) );
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
];
const WRAPPED_PHYSICAL = WRAP_TARGETS.reduce((src, target, i) => {
  if (!src.includes(target)) {
    throw new Error(`forest: three changed lights_physical_pars_fragment; foliage wrap patch ${i} is dead`);
  }
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
	float dotNLWrap = saturate( ( dot( geometryNormal, directLight.direction ) + uWrap ) / ( 1.0 + uWrap ) )
		* uDirect * ( 1.0 - uShade * vShade * 0.86 );`
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
  // Warm, not neutral. FogExp2's #93a6ab is a cold cyan-grey, so a distant crown
  // graded to a neutral dark and then fogged lands with blue level with green —
  // a cold slab in front of a warm sky, which is what read as pale frosted
  // pillars. Warming the ramp's target by about as much as the fog will cool it
  // puts the far mass in the sky's own hue family.
  // Dark *and* saturated. This term is what keeps the distance from glowing
  // brighter than the sky, and it does that by value alone — so its chroma is
  // free, and spending it on a grey was throwing away the only green the 60-120 m
  // band had. FogExp2 is a mere 27% at ninety metres, so nearly all the
  // desaturation out there was coming from here, not from the fog. The fog then
  // lays a pale low-chroma veil over the top, which is why the target has to be
  // more saturated than the result wanted: the veil dilutes whatever it is given.
  // Blue lifted above red. At 0x0f3a0c this was a yellow-green (hue 116, blue at
  // four fifths of red), which was invisible while the scene's hemisphere light
  // put a saturated blue on everything shadowed and became the canopy's whole
  // colour once that went near-neutral: the 20-60 m band measured a median hue
  // of 77 degrees, which is khaki, not conifer.
  hazeCol = 0x0c3a18,
  // Where the ramp ends up once it has saturated, past about 150 m. One target
  // for the whole ramp either leaves the true distance as a saturated green wall
  // or, if it is lightened enough not to, washes the 60-120 m band out — the two
  // bands want different colours and the ramp's own progress is the obvious
  // thing to blend them on.
  hazeFar = 0x394c40,
  // Added to uHazeCol in *linear*, where a dark green is only about 0.03. At 0.075
  // this warm lift was three times the colour it was decorating, so every hazed
  // crown ended up the same warm grey no matter what hazeCol said — which is why
  // the far band would not take a green however saturated the target was made.
  // Sized to lift a sunward-facing crown by about half a stop and no more, and
  // only just warm: at [0.019, 0.02, 0.008] this was a hue-65 orange, and it is
  // the last term standing on a far crown, so the far band took its colour from
  // it. The low sun is warm, but not two-to-one warm.
  hazeRim = [0.015, 0.018, 0.013],
  // [start distance, e-fold scale] — not a smoothstep range
  hazeRange = [22, 58],
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
    // Foliage runs its own aerial perspective and opts out of the scene's.
    // Ablating the two apart on the hero frame put FogExp2 at a *quarter* of the
    // pixel at a hundred metres against the ramp's one fiftieth, and the fog
    // colour is five times brighter than a crown — so the mid distance was
    // essentially painted in fog, and no amount of darkening ahead of a mix can
    // undo a mix. The terrain keeps the scene fog; dark trees standing against a
    // hazed hillside is the read that was wanted anyway.
    fog: false,
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
    uHazeCol: { value: linear(hazeCol) },
    uHazeCol2: { value: linear(hazeFar) },
    uRim: { value: new THREE.Color(...hazeRim) },
    uHazeNear: { value: hazeRange[0] },
    uHazeFar: { value: hazeRange[1] },
    uAtlasPx: { value: map.image?.width || 1024 },
    uMipFill: { value: mipFill },
    uMipErode: { value: mipErode },
  };
  m.userData.foliage = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aShade;
        varying float vShade;
        varying vec3 vWPos;`,
      )
      .replace(
        '#include <project_vertex>',
        `vShade = aShade;
        #ifdef USE_INSTANCING
          vWPos = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
        #else
          vWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
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
        uniform vec3 uHazeCol;
        uniform vec3 uHazeCol2;
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
        varying float vShade;
        varying vec3 vWPos;`,
      )
      .replace('#include <lights_physical_pars_fragment>', WRAPPED_PHYSICAL)
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
        #endif`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 wN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
          float open = 1.0 - uShade * vShade;
          // Occlude what three has already accumulated, not just what is added
          // below. The baked crown weight used to gate only the analytic terms,
          // so the hemisphere light and the environment probe went on flooding
          // the inside of every crown at full strength — the interior came out as
          // bright as the rim however hard uShade was driven, and a crown lit
          // evenly right through its depth is a shrub. Ablating the terms one at a
          // time put three's own ambient at about seventy per cent of the value
          // here, which is why nothing I could reach was moving it.
          reflectedLight.indirectDiffuse *= open;
          // the probe sheen is a surface effect, so it is only partly occluded
          reflectedLight.indirectSpecular *= 0.34 + 0.66 * open;
          reflectedLight.indirectDiffuse += diffuseColor.rgb * mix( uGnd, uSky, wN.y * 0.5 + 0.5 ) * open;
          // Thin-leaf transmission. The lobe is wider than a specular one because
          // leaves scatter over a broad angle, but not as wide as it was: at an
          // exponent of 1.4 a card forty degrees off the sun still got two thirds
          // of full transmission, so a whole sunward hillside of crowns went pale
          // khaki rather than just the ones the sun was actually behind.
          vec3 fV = normalize( vWPos - cameraPosition );
          float back = pow( saturate( dot( fV, uSunDir ) ), 2.6 );
          float thin = 1.0 - abs( dot( normal, fV ) ) * 0.42;
          reflectedLight.indirectDiffuse += diffuseColor.rgb * uSunTint * uTrans * back * thin * open;
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
          vec3 haze = mix( uHazeCol, uHazeCol2, aer ) + uRim * pow( saturate( wNh.y ), 2.0 );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, haze, aer );
        }
        #include <fog_fragment>`,
      );
  };
  return applyWind(m, { amplitude: windAmp, speed: windSpeed });
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
 * allowed to sit. The whole mid-distance read hangs off this: at 0 a crown is a
 * smooth radial ramp and reads as a wash, and the shader turns it into a value
 * ratio of about `(1 - 0.9 * (m - a)) / (1 - 0.9 * (m + a))`, so this puts
 * about three stops between the lit sprays and the ones behind them. It can be
 * driven this hard only because `crownMosaic` centres it per crown — an
 * uncentred version at 1.5 made whole trees light or dark and left each crown
 * as flat as it started.
 */
const CROWN_MOSAIC = 1.0;

/**
 * Species hue, as a multiplier on the instance tint, normalised to unit luma so
 * changing one of these moves the colour of a stand and not its brightness.
 *
 * Every tree in the forest used to take the same tint formula with a ±12% warm
 * swing inside it, which is one hue family — measured over the canopy band, a
 * single 30 degree bucket held a quarter of the saturated pixels and the rest
 * fell off smoothly either side of it, i.e. one green with noise on it. A real
 * mixed stand does not work like that: a spruce is glaucous next to a cedar
 * that is frankly yellow, and the *species* boundary is where the hue steps.
 * The atlas already paints four different cells; the tint was flattening them
 * back together.
 */
const hue = (r, g, b) => {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / l, g / l, b / l];
};

const SPECIES_HUE = {
  fir: hue(1.0, 1.0, 0.98),
  hemlock: hue(1.14, 1.02, 0.84),
  cedar: hue(1.2, 1.0, 0.76),
  spruce: hue(0.82, 0.99, 1.2),
  dying: hue(1.5, 0.92, 0.58),
  maple: hue(1.2, 1.05, 0.78),
  alder: hue(0.86, 1.0, 1.04),
  turning: hue(1.52, 1.0, 0.5),
  vine: hue(1.14, 1.0, 0.88),
};

// Where a broadleaf ends up once it has fully turned. Applied in patches off a
// low-frequency field rather than per tree: one gold crown among green ones is
// a mistake the eye lands on, a slope of them is October.
const AUTUMN = hue(1.6, 0.94, 0.4);

function hueOf(name, turn = 0) {
  const s = SPECIES_HUE[name] || SPECIES_HUE.fir;
  if (turn <= 0.001) return s;
  return [lerp(s[0], AUTUMN[0], turn), lerp(s[1], AUTUMN[1], turn), lerp(s[2], AUTUMN[2], turn)];
}

const CONIFERS = [
  { name: 'fir', tiles: [0, 0, 0, 1], bark: 'fir', height: [20, 30], trunk: 0.019, taper: 1.35, flare: 1.7, crownStart: 0.24, crownR: 0.175, tiers: 16, droop: 0.5, aspect: 0.62, fill: 1.2 },
  { name: 'hemlock', tiles: [1, 1, 1, 0], bark: 'hemlock', height: [14, 22], trunk: 0.018, taper: 1.5, flare: 1.35, crownStart: 0.12, crownR: 0.225, tiers: 15, droop: 0.9, aspect: 0.58, fill: 1.3 },
  { name: 'cedar', tiles: [2, 2, 2, 1], bark: 'cedar', height: [16, 25], trunk: 0.025, taper: 1.1, flare: 2.5, crownStart: 0.07, crownR: 0.26, tiers: 14, droop: 0.72, aspect: 0.68, fill: 1.35 },
  { name: 'spruce', tiles: [0, 1, 0, 0], bark: 'fir', height: [23, 33], trunk: 0.016, taper: 1.65, flare: 1.5, crownStart: 0.22, crownR: 0.15, tiers: 18, droop: 0.34, aspect: 0.56, fill: 1.05 },
  { name: 'dying', tiles: [3, 3, 0, 3], bark: 'hemlock', height: [13, 21], trunk: 0.019, taper: 1.4, flare: 1.4, crownStart: 0.36, crownR: 0.14, tiers: 13, droop: 0.62, aspect: 0.48, fill: 0.5 },
];

const BROADLEAVES = [
  // small cards in quantity: a five-metre leaf card is a slab however well it
  // is painted. crownStart is low — at 0.4 and 0.5 the bottom three fifths of
  // the tree was bare pole, and a stand of them read as a plantation.
  // leafScale is the card size as a fraction of tree height, and the card *is*
  // the size the foliage reads at. At 0.2 a maple card was four and a half
  // metres of painted leaf.
  { name: 'maple', tiles: [0, 0, 0, 1], bark: 'fir', height: [11, 16], trunk: 0.027, crownStart: 0.28, crownR: 0.32, clumps: 30, perClump: 7, leafScale: 0.125 },
  { name: 'alder', tiles: [1, 1, 1, 0], bark: 'birch', height: [12, 18], trunk: 0.017, crownStart: 0.34, crownR: 0.24, clumps: 30, perClump: 7, leafScale: 0.118 },
  // one card in four is turning: a tree fully in autumn colour reads as a hot
  // orange blob in a scene this desaturated
  { name: 'turning', tiles: [2, 0, 0, 0], bark: 'fir', height: [9, 14], trunk: 0.029, crownStart: 0.26, crownR: 0.35, clumps: 28, perClump: 6, leafScale: 0.14 },
  { name: 'vine', tiles: [0, 1, 0, 1], bark: 'birch', height: [4.5, 7.5], trunk: 0.034, crownStart: 0.2, crownR: 0.42, clumps: 20, perClump: 5, leafScale: 0.17 },
];

function buildConifer(spec, seed) {
  const rnd = mulberry32(seed);
  const height = lerp(spec.height[0], spec.height[1], rnd());
  const baseR = height * spec.trunk;
  const maxR = height * spec.crownR;
  const leanA = rnd() * Math.PI * 2;
  const leanAmt = height * (0.004 + rnd() * 0.016);
  const axis = (t) => [Math.cos(leanA) * leanAmt * t * t, Math.sin(leanA) * leanAmt * t * t];

  const wood = [
    trunkGeo({
      height,
      baseR,
      tipR: baseR * 0.05,
      radial: 7,
      segs: 11,
      flare: spec.flare,
      flareLobes: 3 + Math.floor(rnd() * 2),
      taper: spec.taper,
      axis,
      seed: seed * 17 + 3,
      uRepeat: 2,
      vScale: 0.3,
    }),
  ];

  const rootN = 5 + Math.floor(rnd() * 2);
  for (let i = 0; i < rootN; i++) {
    const a = (i / rootN) * Math.PI * 2 + rnd() * 0.7;
    const rr = baseR * (2.3 + rnd() * 2.3);
    wood.push(
      limb(
        [
          [Math.cos(a) * baseR * 0.4, baseR * 3.4, Math.sin(a) * baseR * 0.4],
          [Math.cos(a) * rr * 0.5, baseR * 1.0, Math.sin(a) * rr * 0.5],
          [Math.cos(a) * rr, -baseR * 1.0, Math.sin(a) * rr],
        ],
        baseR * 0.5,
        baseR * 0.1,
        { radial: 5, segs: 2, vScale: 0.35 },
      ),
    );
  }

  // dead lower limbs on the clear trunk: these are meant to be seen, unlike
  // anything inside the crown, which foliage has to cover completely
  const stubN = 3 + Math.floor(rnd() * 4);
  for (let i = 0; i < stubN; i++) {
    const t = 0.12 + rnd() * Math.max(0.06, spec.crownStart - 0.14);
    const y = t * height;
    const a = rnd() * Math.PI * 2;
    const l = height * (0.03 + rnd() * 0.055);
    const [ax, az] = axis(t);
    wood.push(
      limb(
        [
          [ax, y, az],
          [ax + Math.cos(a) * l * 0.5, y - l * 0.2, az + Math.sin(a) * l * 0.5],
          [ax + Math.cos(a) * l, y - l * 0.62, az + Math.sin(a) * l],
        ],
        baseR * 0.26,
        baseR * 0.05,
        { radial: 4, segs: 3, vScale: 0.4 },
      ),
    );
  }

  const cards = [];
  // Every card carries its own shade offset, so a crown arrives as a mosaic of
  // sprays at different values rather than one smooth radial ramp. This is the
  // whole of the mid-distance fix: see crownMosaic.
  const field = mosaicField(seed);
  const keys = [];
  const addCard = (geo) => {
    const c = cardCentre(geo);
    // a little jitter on top of the field, so two sprays inside one clump still
    // differ slightly and the clump does not read as a single painted shape
    keys.push(field(c.x, c.y, c.z) + (rnd() - 0.5) * 0.22);
    cards.push(geo);
  };
  const tiers = spec.tiers;
  for (let k = 0; k < tiers; k++) {
    const u = k / (tiers - 1);
    const t = spec.crownStart + u * (1 - spec.crownStart);
    const y = t * height;
    const [ax, az] = axis(t);
    // One sector of each tier is left unfilled, rotating as the tiers climb. A
    // crown of ~250 cards has an alpha hole in every card and no hole at all
    // through the mass, because whatever the near card drops the next one back
    // supplies; the measured dark fraction of the mid-distance band was 5.5%
    // against 13.5% in the near field, which is that in one number. Voids have
    // to be *left*, not painted, and they have to be left in the fill rather
    // than the rim so the silhouette against the sky is untouched.
    const gapAt = rnd() * Math.PI * 2;
    const gapHalf = 0.5 + rnd() * 0.42;
    const inGap = (a) => {
      const d = Math.abs(((a - gapAt + Math.PI) % (Math.PI * 2)) - Math.PI);
      return d < gapHalf;
    };
    // A conifer is a full cone, not a needle. At 0.86 the profile lost three
    // quarters of its width by mid-crown, so everything above that was a spire
    // a metre wide and a tree at a hundred metres read as a flat-topped pole.
    const prof = Math.pow(1 - u, 0.56) * lerp(0.58, 1.0, smoothstep(0, 0.2, u));
    const R = maxR * prof * (0.74 + rnd() * 0.5);
    if (R < maxR * 0.05) continue;
    // Short cards set well out from the trunk rather than long ones springing
    // from it. A card is a painted branch, so its length *is* the size the eye
    // reads the foliage at: at 0.92 of the crown radius a single card was six
    // metres of one painted spray. Halving the card and moving its root out to
    // meet it keeps the same crown reach and the same tip density, costs eight
    // triangles a card instead of sixteen, and puts the sprays at roughly the
    // half metre a real branch tip is.
    // Twice the cards at three fifths the length.
    //
    // A card's length is the size the eye reads the foliage at, and at the old
    // half-of-crown-radius an outer card on a mature fir was three metres of one
    // painted spray — a hand-sized crisp shape on screen with one interior value,
    // which is the construction-paper read whatever is painted on it. Shorter
    // cards also stop being able to span the crown, so the silhouette is built
    // out of thirty overlapping outlines a tier instead of eight, and no single
    // one of them is findable.
    const outer = R > maxR * 0.34 ? 15 : 10;
    const base = k * 2.399 + rnd() * 0.8;
    const tierDroop = spec.droop;

    // Sprays gathered into a few arms rather than spread evenly round the tier.
    // An even ring is a disc with a soft edge and a uniform interior, and it is
    // the same disc from every angle; a conifer tier is three or four heavy
    // branches with daylight between them. The daylight is the point — it is a
    // void at clump scale, made of geometry, which is the one kind that does not
    // wash out when the card texture stops being resolved. Tiers rotate past
    // each other (`base` steps by 2.399 rad) so the crown still reads full from
    // any one direction.
    const arms = 3 + (k % 2);
    for (let j = 0; j < outer; j++) {
      const even = (j / outer) * Math.PI * 2;
      const armA = (Math.round((even / (Math.PI * 2)) * arms) / arms) * Math.PI * 2;
      const a = base + lerp(even, armA, 0.55) + (rnd() - 0.5) * 0.5;
      const r0 = R * (0.24 + rnd() * 0.44);
      const len = R * (0.3 + rnd() * 0.24);
      const wid = len * spec.aspect * (0.82 + rnd() * 0.5);
      const droop = tierDroop * (0.5 + rnd() * 1.05);
      addCard(
        spray(len, wid, pick(spec.tiles, rnd), {
          origin: [ax, y + (rnd() - 0.5) * 0.42, az],
          angle: a,
          droop,
          r0,
          // wider roll than before: a set of cards all rolled within a third of a
          // radian of horizontal is one plane however many of them there are
          roll: (rnd() - 0.5) * 1.1,
          bow: 0.16 + rnd() * 0.26,
          segs: [2, 1],
          mirror: rnd() < 0.5,
        }),
      );
      // an inner spray shingled above fills the gap between tiers and covers the
      // stretch of limb the outer card no longer reaches back over — except in
      // the tier's gap sector, which is what makes the gap see-through
      if (rnd() < 0.62 && !inGap(a)) {
        addCard(
          spray(len * (0.55 + rnd() * 0.36), wid * 0.86, pick(spec.tiles, rnd), {
            origin: [ax, y + 0.26 + rnd() * 0.5, az],
            angle: a + (rnd() - 0.5) * 0.8,
            droop: droop * 0.42,
            r0: R * (0.06 + rnd() * 0.2),
            roll: (rnd() - 0.5) * 1.2,
            bow: 0.24,
            segs: [1, 1],
            mirror: rnd() < 0.5,
          }),
        );
      }
    }

    // Rim tips: small cards hung past the tier's own reach, tilted well out of
    // its plane. The geometric half of a fringed edge — the alpha fringe inside
    // the atlas breaks up a card's own outline, and these break up the outline of
    // the crown, which is the one the eye actually judges against the sky.
    const tips = R > maxR * 0.2 ? 4 : 3;
    for (let j = 0; j < tips; j++) {
      const a = base + 1.2 + (j / tips) * Math.PI * 2 + (rnd() - 0.5) * 0.9;
      const s = R * (0.16 + rnd() * 0.16) + 0.16;
      addCard(
        spray(s * 1.5, s * 1.15, pick(spec.tiles, rnd), {
          origin: [ax, y + (rnd() - 0.5) * 0.6, az],
          angle: a,
          droop: (rnd() - 0.4) * 1.5,
          r0: R * (0.82 + rnd() * 0.3),
          roll: (rnd() - 0.5) * 2.2,
          bow: 0.22,
          segs: [1, 1],
          mirror: rnd() < 0.5,
        }),
      );
    }

    // Mass through the crown, spread from the bole out to the rim rather than
    // packed against the trunk. The tier sprays are near-horizontal, so from a
    // hundred metres — where the eye is within ten degrees of their own plane —
    // they carry almost no silhouette, and these are what give the crown its
    // width at distance. Facing is random rather than radial for the same
    // reason: a radial card is edge-on precisely at the crown's outline.
    //
    // Down from 4.2 per tier. These are the cards that sit *behind* the rim
    // sprays, and they are what was backing every alpha hole in the crown: with
    // enough of them the mass is optically solid and the only thing the eye can
    // read is one soft patch against another. Thinning them costs nothing in
    // silhouette — the rim sprays and tips own that — and it is what lets the
    // dark of the forest behind come through the crown.
    const inner = Math.max(2, Math.round(2.7 * spec.fill));
    for (let j = 0; j < inner; j++) {
      const a = base + rnd() * Math.PI * 2;
      if (inGap(a)) continue;
      const out = (j + rnd() * 0.7) / inner;
      const s = R * (0.3 + rnd() * 0.28) * (1 - out * 0.26) + 0.24;
      addCard(
        upright(s * 1.34, s * 1.44, pick(spec.tiles, rnd), {
          origin: [ax, y - 0.25 + (rnd() - 0.5) * 0.45, az],
          angle: a,
          face: rnd() * Math.PI * 2,
          r0: R * (0.12 + out * 0.76),
          tilt: (rnd() - 0.5) * 0.5,
          bow: 0.2,
          segs: [1, 1],
          mirror: rnd() < 0.5,
        }),
      );
    }

    // supporting limbs only under the lowest tiers, drooping with the sprays
    if (k < 3 && R > maxR * 0.4) {
      for (let j = 0; j < 2; j++) {
        const a = base + (j / 2) * Math.PI * 2 + rnd() * 0.5;
        const l = R * 0.72;
        const drop = Math.sin(tierDroop * 0.85);
        wood.push(
          limb(
            [
              [ax, y, az],
              [ax + Math.cos(a) * l * 0.5, y - l * drop * 0.4, az - Math.sin(a) * l * 0.5],
              [ax + Math.cos(a) * l, y - l * drop, az - Math.sin(a) * l],
            ],
            baseR * 0.3,
            baseR * 0.06,
            { radial: 4, segs: 3, vScale: 0.4 },
          ),
        );
      }
    }
  }

  // Leader, tapered in three stacked steps. A single block of cards here gave
  // every conifer a squared-off top, and at distance the top of the leader is
  // the only part of the tree drawn against open sky.
  const lead = maxR * 0.5 + 0.55;
  for (let s = 0; s < 3; s++) {
    const f = 1 - s / 3;
    const cw = lead * (0.3 + f * 0.8);
    const ch = lead * (0.9 + f * 0.8);
    const yy = height - lead * (0.45 + f * 1.75);
    for (let j = 0; j < 2; j++) {
      addCard(
        upright(cw, ch, pick(spec.tiles, rnd), {
          origin: [0, yy, 0],
          angle: j * 1.9 + s * 0.8 + rnd() * 0.6,
          face: j * 1.05 + s * 0.7 + rnd() * 0.5,
          r0: cw * 0.14,
          bow: 0.2,
          segs: [1, 1],
        }),
      );
    }
  }

  const trunk = windWeight(merge(wood), (x, y) => clamp((y / height - 0.5) / 0.5) * 0.3);
  const foliage = shellNormals(merge(crownMosaic(cards, keys, CROWN_MOSAIC)), {
    mode: 'cone',
    centre: [0, spec.crownStart * height, 0],
    blend: 0.6,
    up: 0.5,
  });
  windWeight(foliage, (x, y, z) => clamp(0.28 + Math.hypot(x, z) * 0.11 + (y / height) * 0.5));
  // how deep inside the cone a vertex sits, measured against the crown profile
  // rather than a sphere: a spray near the trunk is buried, its tip is not
  const crownY = spec.crownStart * height;
  shadeWeight(foliage, (x, y, z) => {
    const t = clamp((y - crownY) / Math.max(0.6, height - crownY));
    const prof = Math.pow(1 - t, 0.56) * lerp(0.58, 1, smoothstep(0, 0.2, t));
    const rn = Math.hypot(x, z) / Math.max(0.4, maxR * prof);
    // Occlusion noise at the scale of a spray cluster, on top of the radial
    // falloff. Radius alone gives every card out at the rim — which is nearly
    // everything the camera can see of a crown — the same weight, so the crown
    // arrives as one wash however hard the interior is driven.
    //
    // Small, and much smaller than it was. This is a smooth function of position,
    // so it is interpolated *across* a card rather than stepping at its edge: at
    // twenty metres a half-metre ramp is a pixel or two of gradient, which is
    // precisely the soft-everywhere read that makes foliage look painted. The
    // mosaic that has to survive out there is carried per card by crownMosaic, and
    // leaving this at 0.9 only fought it.
    const n = fbm(x * 1.15 + y * 0.7 + 31.2, z * 1.15 - y * 0.45 + 17.7, { octaves: 3, period: 6, seed: seed & 255 });
    // sub-linear in radius, so the dark interior extends most of the way out to
    // the rim instead of only filling the middle
    return (1 - Math.pow(clamp(rn), 0.7) * 0.94) * (1 - t * 0.3) + 0.12 + (n - 0.5) * 0.34;
  });

  return { trunk, foliage, height, radius: baseR, bark: spec.bark, kind: 'conifer', name: spec.name };
}

function buildBroadleaf(spec, seed) {
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
      tipR: baseR * 0.55,
      radial: 7,
      segs: 6,
      flare: 1.7,
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

  // main limbs; the crown clumps hang off their tips
  const tips = [];
  const limbN = 4 + Math.floor(rnd() * 2);
  const [tax, taz] = axis(spec.crownStart);
  for (let i = 0; i < limbN; i++) {
    const a = (i / limbN) * Math.PI * 2 + rnd() * 0.7;
    const reach = maxR * (0.62 + rnd() * 0.42);
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
        baseR * 0.62,
        baseR * 0.14,
        { radial: 5, segs: 3, vScale: 0.4 },
      ),
    );
    for (let j = 0; j < 2; j++) {
      const a2 = a + (rnd() - 0.5) * 1.5;
      // short enough that the tip stays inside the crown: a sub-limb reaching
      // past the leaf clumps reads as a bare spike stuck through the canopy
      const l2 = reach * (0.18 + rnd() * 0.2);
      wood.push(
        limb(
          [
            [tax + Math.cos(a) * reach * 0.55, trunkH + rise * 0.7, taz + Math.sin(a) * reach * 0.55],
            [
              tax + Math.cos(a) * reach * 0.55 + Math.cos(a2) * l2,
              trunkH + rise * 0.7 + (height - trunkH) * (0.14 + rnd() * 0.16),
              taz + Math.sin(a) * reach * 0.55 + Math.sin(a2) * l2,
            ],
          ],
          baseR * 0.2,
          baseR * 0.06,
          { radial: 4, segs: 2, vScale: 0.4 },
        ),
      );
    }
  }

  // Crown as a rounded volume, clumped around the limb bearings. Hanging every
  // clump off a limb tip put the whole crown in one horizontal shell, and since
  // the leaf cards are sprays — near-horizontal planes — the result was a flat
  // disc on a bare pole: a row of parasols down the mid ground.
  const cards = [];
  const keys = [];
  const crownH = height - trunkH;
  const cyMid = trunkH + crownH * 0.5;
  const crownCentre = [tax, cyMid, taz];
  for (let c = 0; c < spec.clumps; c++) {
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
    // A broadleaf is already built in clumps, so the mosaic key is the clump
    // itself and there is no need to go looking for one in a noise field —
    // whole masses of leaf lit or shaded together, with some flutter inside
    // them. The conifer has to use a field because there a card *is* the clump.
    const clumpKey = rnd();
    for (let j = 0; j < spec.perClump; j++) {
      const ja = rnd() * Math.PI * 2;
      const jr = cs * 0.24 * Math.sqrt(rnd());
      const size = cs * (0.6 + rnd() * 0.55);
      const ox = cx + Math.cos(ja) * jr;
      const oz = cz + Math.sin(ja) * jr;
      const oy = cy + (rnd() - 0.5) * cs * 0.4;
      // two in five stand up and face freely: a crown of sprays alone has no
      // silhouette from thirty metres out, where the eye is nearly in their plane
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

  const trunk = windWeight(merge(wood), (x, y) => clamp((y / height - 0.3) / 0.7) * 0.4);
  const foliage = shellNormals(merge(crownMosaic(cards, keys, CROWN_MOSAIC)), {
    mode: 'sphere',
    centre: crownCentre,
    blend: 0.78,
  });
  windWeight(foliage, (x, y, z) => clamp(0.4 + Math.hypot(x - crownCentre[0], z - crownCentre[2]) * 0.09));
  shadeWeight(foliage, (x, y, z) => {
    const rn = Math.hypot(x - crownCentre[0], (y - crownCentre[1]) * 0.8, z - crownCentre[2]) / maxR;
    const n = fbm(x * 1.15 + y * 0.7 + 12.6, z * 1.15 - y * 0.45 - 44.1, { octaves: 3, period: 6, seed: seed & 255 });
    return (
      (1 - Math.pow(clamp(rn), 0.7) * 0.95) * (1.02 - clamp((y - trunkH) / (height - trunkH)) * 0.26) +
      0.12 +
      (n - 0.5) * 0.34
    );
  });

  return { trunk, foliage, height, radius: baseR, bark: spec.bark, kind: 'broadleaf', name: spec.name };
}

/** Dead standing snag: bare, silver, broken top. Pure silhouette value. */
function buildSnag(seed) {
  const rnd = mulberry32(seed);
  const height = 9 + rnd() * 13;
  const baseR = height * (0.019 + rnd() * 0.008);
  const leanA = rnd() * Math.PI * 2;
  const leanAmt = height * (0.01 + rnd() * 0.03);
  const axis = (t) => [Math.cos(leanA) * leanAmt * t * t, Math.sin(leanA) * leanAmt * t * t];

  const wood = [
    trunkGeo({
      height,
      baseR,
      tipR: baseR * 0.34,
      radial: 7,
      segs: 10,
      flare: 1.6,
      taper: 1.0,
      axis,
      seed: seed * 41 + 7,
      uRepeat: 2,
      vScale: 0.3,
      bulge: 0.18,
    }),
  ];
  // splintered crown
  const [tx, tz] = axis(1);
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2;
    const l = baseR * (1.4 + rnd() * 2.6);
    wood.push(
      limb(
        [
          [tx, height - baseR * 1.2, tz],
          [tx + Math.cos(a) * baseR * 0.3, height + l * 0.7, tz + Math.sin(a) * baseR * 0.3],
        ],
        baseR * 0.36,
        baseR * 0.05,
        { radial: 4, segs: 2, vScale: 0.5 },
      ),
    );
  }
  for (let i = 0; i < 4; i++) {
    const t = 0.3 + rnd() * 0.6;
    const y = t * height;
    const a = rnd() * Math.PI * 2;
    const l = height * (0.05 + rnd() * 0.1);
    const [ax, az] = axis(t);
    wood.push(
      limb(
        [
          [ax, y, az],
          [ax + Math.cos(a) * l * 0.5, y + l * 0.1, az + Math.sin(a) * l * 0.5],
          [ax + Math.cos(a) * l, y - l * 0.35, az + Math.sin(a) * l],
        ],
        baseR * 0.3,
        baseR * 0.04,
        { radial: 4, segs: 3, vScale: 0.5 },
      ),
    );
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rnd();
    const rr = baseR * (2.4 + rnd() * 1.8);
    wood.push(
      limb(
        [
          [Math.cos(a) * baseR * 0.4, baseR * 3.0, Math.sin(a) * baseR * 0.4],
          [Math.cos(a) * rr, -baseR * 0.9, Math.sin(a) * rr],
        ],
        baseR * 0.46,
        baseR * 0.1,
        { radial: 5, segs: 2, vScale: 0.35 },
      ),
    );
  }
  const trunk = windWeight(merge(wood), (x, y) => clamp((y / height - 0.6) / 0.4) * 0.12);
  return { trunk, foliage: null, height, radius: baseR, bark: 'dead', kind: 'snag', name: 'snag' };
}

/** Small understory conifer. */
function buildSapling(seed) {
  const rnd = mulberry32(seed);
  const height = 1.3 + rnd() * 2.4;
  const baseR = height * 0.024;
  const wood = [
    trunkGeo({
      height,
      baseR,
      tipR: baseR * 0.12,
      radial: 5,
      segs: 5,
      flare: 1.0,
      taper: 1.3,
      seed: seed * 53 + 11,
      uRepeat: 1,
      vScale: 0.6,
    }),
  ];
  const cards = [];
  const tiers = 6;
  const tile = rnd() < 0.35 ? 1 : rnd() < 0.7 ? 0 : 2;
  for (let k = 0; k < tiers; k++) {
    const u = k / (tiers - 1);
    const y = height * (0.12 + u * 0.86);
    const R = height * 0.3 * Math.pow(1 - u, 0.8) * (0.75 + rnd() * 0.5) + 0.06;
    for (let j = 0; j < 3; j++) {
      const a = k * 2.399 + (j / 3) * Math.PI * 2;
      cards.push(
        spray(R * 1.2, R * 0.7, tile, {
          origin: [0, y, 0],
          angle: a,
          droop: 0.5 + rnd() * 0.4,
          r0: R * 0.1,
          roll: (rnd() - 0.5) * 0.6,
          bow: 0.24,
          segs: [1, 1],
        }),
      );
    }
  }
  cards.push(upright(height * 0.2, height * 0.34, tile, { origin: [0, height * 0.82, 0], angle: rnd() * 3, bow: 0.2, segs: [1, 1] }));
  const trunk = windWeight(merge(wood), (x, y) => clamp(y / height) * 0.5);
  const foliage = shellNormals(merge(cards), { mode: 'cone', centre: [0, height * 0.2, 0], blend: 0.6, up: 0.55 });
  windWeight(foliage, (x, y) => clamp(0.4 + (y / height) * 0.6));
  shadeWeight(foliage, (x, y, z) => {
    const t = clamp(y / height);
    const rn = Math.hypot(x, z) / Math.max(0.1, height * 0.3 * Math.pow(1 - t, 0.8) + 0.06);
    return (0.85 - clamp(rn) * 0.68) * (1 - t * 0.4);
  });
  return { trunk, foliage, height, radius: baseR, bark: 'fir', kind: 'sapling', name: 'sapling' };
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
  { seed = 1, planes = 3, bow = 0.3, segs = [1, 2], spread = 0.18, shell = 0.5, lean = 0.34, form = 'rosette' } = {},
) {
  const rnd = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < planes; i++) {
    // golden-angle rather than even spacing: evenly fanned planes line up into
    // a star when the plant is seen from above, which the wheel view does
    const a = i * 2.399 + rnd() * 0.5;
    const t = i / Math.max(1, planes - 1);
    let sw = w * (0.6 + rnd() * 0.62);
    let sh = h * (0.56 + (1 - t) * 0.34 + rnd() * 0.5);
    let tip = (rnd() - 0.5) * lean;
    let rr = (0.18 + t * 0.82) * spread * w;
    let base = -h * 0.03 - t * h * 0.04;

    // Ten degrees of pitch either way leaves every card near vertical, and a
    // clump of near-vertical cards seen from a camera above it foreshortens into
    // a flat plate — which is how a fern read as a fan lying in the duff. Twenty
    // is enough for the clump to hold volume from above without any card
    // reaching a grazing angle to the ground.
    let pitch = (rnd() - 0.5) * 0.7;

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
      sh = h * (0.6 + rnd() * 0.7);
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
  // steeper toward the base than it was: a clump lit evenly from root to tip has
  // no weight on the ground and the verge reads as a tray of cut parsley
  return shadeWeight(geo, (x, y, z) => 1.0 - Math.pow(clamp(y / h), 0.62) * 0.82 - Math.hypot(x, z) / (w * 0.75) * 0.18);
}

/**
 * A tall flowering stem — foxglove, fireweed. Two crossed cards for the spike so
 * it holds up from any angle, and a low crossed pair for the basal rosette.
 *
 * The floor needs one silhouette that is not a clump. Every other prototype down
 * there is a mass roughly as wide as it is tall, and beds of those read as tiling
 * at any spacing; a bare vertical breaks the rhythm the way a snag breaks a
 * treeline. Only the spike is drawn from the flower tile, so the stem stays thin.
 */
function stalkPlant(h, tile, seed) {
  const rnd = mulberry32(seed);
  const parts = [];
  const spikeH = h * (0.42 + rnd() * 0.16);
  for (let i = 0; i < 2; i++) {
    const g = foliageCard(h * 0.15, spikeH, tile, { bow: 0.1, segs: [1, 2], mirror: i === 1 });
    g.translate(0, h - spikeH * 0.5, 0);
    g.rotateY(i * Math.PI * 0.5 + rnd() * 0.6);
    parts.push(g);
  }
  // basal leaves, wider than the spike and close to the ground
  for (let i = 0; i < 2; i++) {
    const g = foliageCard(h * 0.42, h * 0.26, 2 + (tile % 2), { bow: 0.3, segs: [1, 1], mirror: rnd() < 0.5 });
    g.translate(0, h * 0.12, 0);
    g.rotateZ((rnd() - 0.5) * 0.5);
    g.rotateY(i * 1.9 + rnd() * 0.8);
    parts.push(g);
  }
  const geo = shellNormals(merge(parts), { mode: 'dome', centre: [0, h * 0.5, 0], blend: 0.4, up: h * 0.6 });
  windWeight(geo, (x, y) => Math.pow(clamp(y / h), 0.7) * 1.5);
  return shadeWeight(geo, (x, y) => 0.9 - Math.pow(clamp(y / h), 0.5) * 0.8);
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

// ---------------------------------------------------------------------------
// Scatter
// ---------------------------------------------------------------------------

export function createForest({ terrain, env = null, treeCount = 210, clearRadius = 7.4, area = 250, clearings = [] } = {}) {
  // A logging landing where the trail opens out. Without a real hole in the
  // canopy the sun never reaches the road: a 20 m tree at this latitude needs
  // about 16 m of horizontal clearance before direct light gets underneath it,
  // so every shot was lit by ambient fill only. The gap also gives the classic
  // sunlit-pool-inside-dark-forest composition.
  const inClearing = (x, z) => {
    for (const c of clearings) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r) return 1 - d / c.r;
    }
    return 0;
  };
  const group = new THREE.Group();
  group.name = 'forest';
  const rnd = mulberry32(20260726);
  const density = clamp(treeCount / 210, 0.35, 1.6);
  const span = Math.max(area, terrain.size * 0.96) * 0.5;

  // --- materials -----------------------------------------------------------
  const barkMats = {
    fir: barkMaterial(barkMaps('fir'), { mossHeight: 7.0, mossMax: 0.95 }),
    cedar: barkMaterial(barkMaps('cedar'), { mossHeight: 5.5, mossMax: 0.8, normalScale: 1.6 }),
    hemlock: barkMaterial(barkMaps('hemlock'), { mossHeight: 6.5, mossMax: 1.0 }),
    birch: barkMaterial(birchBarkMaps(), { mossHeight: 3.4, mossMax: 0.55, normalScale: 0.9 }),
    dead: barkMaterial(deadWoodMaps(), { mossHeight: 4.0, mossMax: 0.7, normalScale: 1.5, windAmp: 0.03 }),
    // fallen timber: its own map at four times the texel density of the trunks,
    // and the moss and contact shade keyed off which way a surface faces
    log: barkMaterial(logBarkMaps(), { mossMax: 1.0, normalScale: 1.9, windAmp: 0, deadfall: true, grainRepeat: 3.2 }),
    // the end round's UVs are radial over the whole face, so a repeating grain
    // tier would tile the rings rather than add to them
    endGrain: barkMaterial(endGrainMaps(), { mossMax: 0.35, normalScale: 1.2, windAmp: 0, deadfall: true, grainRepeat: 0 }),
  };
  // The geometry band follows the road corridor, so looking along the road these
  // same trees recede to 140 m — they *are* the distance in every beauty frame,
  // and the far billboards and treeline rings sit off to the sides where the
  // camera never sees them. So the aerial ramp has to bite here, and early:
  // by 90 m a crown has to be at about two thirds of the sky it is seen against.
  // `shade` is how much of the baked crown occlusion reaches the sky term. It is
  // high because a crown lit uniformly through its whole depth is the other half
  // of the hedge read: a real crown at four metres is bright at the rim and near
  // black two card-lengths in, and that gradient is most of what says "tree".
  // `sky` is the open-shade term, and at 0.86 it was handing every card an
  // ambient worth about its own albedo again — which is why a crown measured the
  // same value whichever way it faced and the whole stand past fifteen metres
  // sat on one flat sage. `trans` comes down with it: a broad forward lobe at
  // half strength turned every sunward crown pale khaki, and a needle is a lot
  // less translucent than a leaf.
  const needleMat = foliageMaterial(needleAtlas(), {
    alphaTest: 0.26,
    trans: 0.24,
    // green-dominant, and much less of it: what gets through a needle is
    // chlorophyll-filtered, not the low sun's own gold
    sunTint: [0.68, 0.86, 0.42],
    windAmp: 0.19,
    // Tighter than it was. At 0.52 a card a hundred degrees off the sun still
    // took a sixth of full key, and the key is the warmest light in the scene —
    // so the whole crown, lit side and shaded side alike, got a warm wash and
    // the shaded side had nothing cool to tell it apart. Narrowing the lobe
    // hands the away-facing cards to the sky term instead. Not narrower than
    // this: at 0.38 the mid-distance value spread gave up nine per cent for
    // another eight degrees of hue, and the spread is the thing being bought.
    wrap: 0.45,
    direct: 0.7,
    sky: 0.66,
    shade: 0.9,
    // The environment probe is built from the sky, and this sky has a 0xff9d52
    // sun sitting in it. Ablating the probe moved the 30-60 m band's hue by
    // seventeen degrees on its own — it was the single largest warm term on the
    // canopy after the key light, and a needle is a matte scattering surface
    // with very little business taking a specular sheen off the horizon.
    env: 0.1,
    // Carries the whole of the distance now that the scene fog is off these
    // materials, so it has to saturate rather than stop short: 27% at 40 m,
    // half by 60 m, nine tenths by 160 m, and under 5% anywhere the near forest
    // is legible.
    haze: 0.97,
    hazeRange: [22, 55],
  });
  const leafMat = foliageMaterial(leafAtlas(), {
    alphaTest: 0.34,
    trans: 0.5,
    windAmp: 0.24,
    wrap: 0.5,
    direct: 0.72,
    sky: 0.7,
    shade: 0.88,
    env: 0.12,
    haze: 0.97,
    hazeRange: [22, 55],
  });
  // Undergrowth lives in canopy shade, so it has to sit *under* the sunlit dirt
  // it grows out of. Above it, the clumps read as lit objects lying on the ground
  // rather than as plants growing in shade.
  // The three ground-cover atlases carry a slightly raised cut, almost no mip
  // fill, and an erosion hump over the mid mips. Their cells are 40% covered and
  // their structure is frond- and leaf-scale rather than needle-scale, so the
  // default pair closes them into solid shapes by ten metres out.
  //
  // Sized off the exposed ground rather than off the plants: at 0.3 the erosion
  // opened the verge far enough that the 12-25 m band measured a third more bare
  // dirt and its hue histogram collapsed back onto brown, which trades one flat
  // read for another. Two thirds of that gets the holes without the bald patch.
  const fernMat = foliageMaterial(fernAtlas(), { alphaTest: 0.36, mipFill: 0.1, mipErode: 0.2, trans: 0.9, windAmp: 0.12, windSpeed: 1.35, direct: 0.74, sky: 0.76, shade: 0.8, wrap: 0.66, haze: 0.72, hazeRange: [26, 62] });
  // Grass keeps a lower cut than the other two: a blade is one or two texels
  // across at the top and there is nothing left of it above 0.4.
  const grassMat = foliageMaterial(grassAtlas(), { alphaTest: 0.3, mipFill: 0.2, mipErode: 0.1, trans: 0.95, windAmp: 0.09, windSpeed: 1.7, direct: 0.76, sky: 0.76, shade: 0.74, wrap: 0.7, haze: 0.72, hazeRange: [26, 62] });
  const shrubMat = foliageMaterial(shrubAtlas(), { alphaTest: 0.35, mipFill: 0.12, mipErode: 0.18, trans: 0.8, windAmp: 0.1, windSpeed: 1.4, direct: 0.74, sky: 0.82, shade: 0.8, wrap: 0.64, haze: 0.72, hazeRange: [26, 62] });
  // Transmission down from 0.72. A flower spike is a stack of thick corolla
  // tubes, not a leaf blade, and at 0.72 a backlit one lit up to the palest and
  // pinkest thing in the frame from two metres away.
  const stalkMat = foliageMaterial(stalkAtlas(), { alphaTest: 0.3, trans: 0.34, windAmp: 0.22, windSpeed: 1.15, direct: 0.72, sky: 0.82, shade: 0.66, wrap: 0.6, haze: 0.72, hazeRange: [26, 62] });
  // Dead and turned material: less forward scatter than a live leaf, because a
  // rust frond backlit at 0.9 transmission goes orange and reads as a flower.
  const understoryMat = foliageMaterial(understoryAtlas(), { alphaTest: 0.34, mipFill: 0.12, mipErode: 0.16, trans: 0.26, windAmp: 0.11, windSpeed: 1.3, direct: 0.7, sky: 0.7, shade: 0.82, wrap: 0.58, haze: 0.72, hazeRange: [26, 62] });
  const litterMat = foliageMaterial(litterAtlas(), { alphaTest: 0.3, trans: 0.2, windAmp: 0.0, rough: 0.95, direct: 0.86, sky: 0.72, shade: 0.32, wrap: 0.45, haze: 0.6, hazeRange: [26, 62] });
  // The far band is deliberately almost sun-blind. A directly lit painted crown
  // lands near 0.38 linear, and once FogExp2 has added its own 0.1-0.3 on top
  // that is as bright as the sky it is seen against — which is exactly how the
  // distance came out as pale spires. Ambient-dominated, dark, and ramped toward
  // a dark haze colour before the fog gets its turn.
  const billboardMat = foliageMaterial(treeBillboardAtlas(), {
    alphaTest: 0.3,
    trans: 0.3,
    windAmp: 0.08,
    windSpeed: 0.55,
    // Down two stops from 0x8e9584. This band is what fills 30-120 m in every
    // frame, and at a light grey tint it measured *brighter* than the geometry
    // forest in front of it — a distance lighter than its own foreground has no
    // depth in it at all, which is what read as a papery wash behind the trees.
    // The fog then adds its own lift on top, so the tint has to sit well under
    // where the band is wanted, not at it.
    tint: 0x3f4a3c,
    env: 0.1,
    wrap: 0.95,
    direct: 0.3,
    sky: 0.6,
    shade: 0.5,
    haze: 0.95,
    hazeCol: 0x0a2c14,
    hazeFar: 0x3a4d42,
    hazeRange: [24, 50],
  });

  const rock = rockMaps();
  const rockMat = new THREE.MeshStandardMaterial({
    map: rock.map,
    normalMap: rock.normal,
    roughnessMap: rock.rough,
    aoMap: rock.ao,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.55,
  });
  const mossSet = mossMaps();
  const mossMat = new THREE.MeshStandardMaterial({
    map: mossSet.map,
    normalMap: mossSet.normal,
    roughnessMap: mossSet.rough,
    aoMap: mossSet.ao,
    normalScale: new THREE.Vector2(1.6, 1.6),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.6,
  });

  const farGround = farGroundMaps();
  const skirtMat = new THREE.MeshStandardMaterial({
    map: farGround.map,
    roughnessMap: farGround.rough,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.4,
  });

  // Four depth bands, each with its own tint and its own softness. Blended
  // rather than alpha-tested: a hard cutoff on a strip this small on screen is
  // what turned the treeline into a comb of crisp spikes, and a band that fades
  // out along its top edge is the only way to get a silhouette that sits *in*
  // the haze instead of on top of it. depthWrite off because they are the
  // furthest thing in the scene bar the ridges.
  // Down about a stop and a half across the board, and the near band nearly to
  // black. These are MeshBasicMaterial, so the tint *is* the value on screen
  // before fog — and at 0x6e7a6b the nearest band measured lighter than the
  // geometry forest standing in front of it, which is the single reason the
  // distance read as a pale papery wash. A treeline is the darkest thing in a
  // frame after the trunks; the fog is what lifts it, and the fog is additive on
  // top of whatever is here, so this has to start well under where it lands.
  const TREELINE_TINT = [0x2c3830, 0x3a4640, 0x4a5651, 0x5c6764];
  const treelineMats = TREELINE_TINT.map(
    (tint, i) =>
      new THREE.MeshBasicMaterial({
        map: treelineTexture(i % 3),
        color: tint,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      }),
  );
  const ridgeMats = [0, 1].map(
    (i) =>
      new THREE.MeshBasicMaterial({
        map: ridgeTexture(i),
        color: i === 0 ? 0x8f9a97 : 0xa3aaa8,
        transparent: true,
        opacity: 0.5 - i * 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
  );

  // --- prototypes ----------------------------------------------------------
  const protos = [];
  CONIFERS.forEach((spec, i) => {
    protos.push(buildConifer(spec, 101 + i * 37));
    if (spec.name === 'fir' || spec.name === 'cedar') protos.push(buildConifer(spec, 907 + i * 53));
  });
  BROADLEAVES.forEach((spec, i) => protos.push(buildBroadleaf(spec, 2003 + i * 71)));
  protos.push(buildSnag(3301), buildSnag(3907));
  const saplings = [buildSapling(4409), buildSapling(4903), buildSapling(5407)];

  const byName = {};
  protos.forEach((p, i) => {
    if (!byName[p.name]) byName[p.name] = [];
    byName[p.name].push(i);
  });
  const snagIdx = byName.snag;

  // --- placement fields ----------------------------------------------------
  // The frequencies matter more than they look: at the old 0.01 the whole 288 m
  // field only spanned three noise cells, so one species won everywhere.
  const stand = (x, z) => fbm(x * 0.028 + 5, z * 0.028 + 9, { octaves: 3, period: 32, seed: 404 });
  const wet = (x, z) => fbm(x * 0.02 + 21, z * 0.02 + 3, { octaves: 3, period: 32, seed: 808 });
  const dieback = (x, z) => fbm(x * 0.045 + 41, z * 0.045 + 17, { octaves: 3, period: 32, seed: 1212 });
  const openness = (x, z) => fbm(x * 0.075 + 61, z * 0.075 + 29, { octaves: 3, period: 32, seed: 1616 });

  /** Stands rather than a uniform mix: species come in contiguous patches. */
  function speciesAt(x, z) {
    if (dieback(x, z) > 0.68 && rnd() < 0.45) return pick(snagIdx, rnd);
    const r = rnd();
    if (wet(x, z) > 0.58) {
      if (r < 0.4) return byName.alder[0];
      if (r < 0.68) return byName.maple[0];
      if (r < 0.86) return byName.turning[0];
      return byName.vine[0];
    }
    const s = stand(x, z);
    if (s < 0.42) return r < 0.58 ? byName.fir[0] : r < 0.84 ? byName.fir[1] : byName.spruce[0];
    if (s < 0.58) {
      if (r < 0.34) return byName.hemlock[0];
      if (r < 0.62) return byName.fir[0];
      if (r < 0.86) return byName.cedar[0];
      return byName.dying[0];
    }
    if (r < 0.4) return byName.cedar[0];
    if (r < 0.66) return byName.cedar[1];
    if (r < 0.86) return byName.hemlock[0];
    return byName.spruce[0];
  }

  function sites(cell, radius, cb) {
    const n = Math.ceil((radius * 2) / cell);
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = -radius + (ix + rnd()) * cell;
        const z = -radius + (iz + rnd()) * cell;
        if (Math.abs(x) > radius || Math.abs(z) > radius) continue;
        cb(x, z);
      }
    }
  }

  /** Quaternion that leans an object partway toward the local ground normal. */
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

  /**
   * Yaw that points a prototype's local +X along the trail at (x, z).
   *
   * `terrain.roadDistance` answers how far the corridor is but not which way it
   * runs, and laying deadwood needs the direction: a log across the trail is a
   * roadblock, the same log along it is scenery. The centreline is resampled
   * once here and searched directly rather than asking terrain.js for a tangent
   * lookup it does not expose.
   */
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
      // local +X maps to (cos y, -sin y) under a Y rotation
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

  // A trail exists because vehicles use it, so the corridor is the one place on
  // this floor with no fallen timber lying across it: anything long enough to
  // stop a truck was bucked and rolled into the verge years ago. CLEAR is how
  // far out a long piece has to start, ALIGN how far out it stops caring which
  // way it points. Between the shoulder and CLEAR the verge still gets deadwood,
  // but only bucked lengths lying along the trail — which is both what a cleared
  // trail looks like and what keeps the low beauty cameras, all of which sit in
  // that band, off the end of a two-tonne log.
  const DEAD_MIN = 3.5;
  const DEAD_CLEAR = 6.4;
  const DEAD_ALIGN = 13.0;
  const DEAD_SHORT = 3.2;

  /**
   * How long a piece the beauty cameras tolerate at this point on the map.
   *
   * Every named view in src/camera.js is defined in the truck's local space and
   * the truck sits at the landing for all of them, so the whole beauty set lives
   * inside about twelve metres of one point — which is also the sunlit hole in
   * the canopy, so it is where the eye goes anyway. The corridor rule alone does
   * not cover this: a nine-metre stem parallel to the trail and six metres off it
   * breaks no corridor rule and still fills the bottom-left quadrant of `hero`.
   *
   * This has to be a rule and not a check. Deadwood is placed from the same
   * `rnd` stream as the undergrowth, so every change to a scatter count reshuffles
   * every log on the map; a seed that happened to keep the beauty lines clear
   * stopped being clear the moment the litter density moved.
   *
   * Short pieces are unrestricted — bucked rounds and limb wood at the landing
   * are the trail's own story and the point is not to have less deadwood.
   */
  const camDist = (x, z) => {
    let near = 1e9;
    for (const c of clearings) near = Math.min(near, Math.hypot(x - c.x, z - c.z));
    return near;
  };

  const camAllow = (x, z) => {
    let allow = 1e9;
    for (const c of clearings) {
      const d = Math.hypot(x - c.x, z - c.z);
      // 11 m: the foreground of every view. 18 m: far enough that a log reads as
      // something the trail passes rather than as an object in the composition.
      if (d < 11) allow = Math.min(allow, DEAD_SHORT);
      else if (d < 18) allow = Math.min(allow, 6.0);
    }
    return allow;
  };

  /**
   * A point in the verge, sampled along the corridor rather than over the map.
   *
   * Uniform sampling over a 300 m square puts one candidate in fifty anywhere
   * near the trail, so once the corridor rules bite there is no deadwood left in
   * any frame the camera actually takes — which is the opposite of the problem.
   * Half the deadfall is sited this way so the verge can be populated directly.
   */
  function vergePoint(out) {
    const t = rnd();
    const p = terrain.roadPoint(t);
    const g = terrain.roadTangent(t);
    const side = rnd() < 0.5 ? 1 : -1;
    const off = DEAD_MIN + Math.pow(rnd(), 0.8) * 19;
    out.x = p.x - g.z * off * side;
    out.z = p.z + g.x * off * side;
    return out;
  }

  /**
   * Does a piece of length `len` centred on (x, z) at heading `yaw` stay out of
   * the corridor along its whole length?
   *
   * The log prototypes are centred on their own origin, so testing the placement
   * point tested the middle of the log and said nothing about the ends — which is
   * how a fifteen-metre stem whose centre cleared the corridor by five metres
   * ended up lying straight across the trail.
   */
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

  // --- geometry band: hand-built trees along the corridor -------------------
  // No instance cap here: `sites` walks the grid row by row, so bailing out on a
  // target count would pile every tree into one edge of the map. Density is set
  // by the cell size and the acceptance probability instead.
  const NEAR_BAND = 44;
  const placements = protos.map(() => []);
  let nearPlaced = 0;
  sites(4.6 / Math.sqrt(density), span, (x, z) => {
    const d = terrain.roadDistance(x, z);
    if (d < clearRadius || d > NEAR_BAND) return;
    // thin the verge so the road keeps a corridor, and leave the odd clearing
    if (d < clearRadius + 5.0 && rnd() < 0.72) return;
    const gap = inClearing(x, z);
    if (gap > 0 && rnd() < 0.35 + gap * 0.75) return;
    const open = openness(x, z);
    if (rnd() > 0.82 - open * 0.44) return;
    const i = speciesAt(x, z);
    const proto = protos[i];
    // short broadleaves are exactly camera height, so a chase camera set back
    // from the truck ends up inside one; keep them off the verge
    if (proto.height < 9 && d < 10) return;
    const y = terrain.heightAt(x, z);
    placements[i].push({
      x,
      y: y - proto.radius * 0.5,
      z,
      s: 0.74 + rnd() * 0.6,
      r: rnd() * Math.PI * 2,
      tiltX: (rnd() - 0.5) * 0.06,
      tiltZ: (rnd() - 0.5) * 0.06,
      v: 0.7 + rnd() * 0.45,
      warm: (rnd() - 0.5) * 0.3,
      // Sampled from the dieback field rather than rolled: the same field that
      // decides where the snags are decides where the season has got to, so
      // autumn arrives as a region and costs no draw from the shared stream.
      turn: proto.kind === 'broadleaf' ? clamp((dieback(x, z) - 0.5) * 2.6) : 0,
    });
    nearPlaced++;
  });

  protos.forEach((proto, i) => {
    const list = placements[i];
    if (!list.length) return;
    const trunkMesh = new THREE.InstancedMesh(proto.trunk, barkMats[proto.bark] || barkMats.fir, list.length);
    trunkMesh.name = `tree_${proto.name}_trunk`;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    const foliMesh = proto.foliage
      ? new THREE.InstancedMesh(proto.foliage, proto.kind === 'broadleaf' ? leafMat : needleMat, list.length)
      : null;
    if (foliMesh) {
      foliMesh.name = `tree_${proto.name}_foliage`;
      foliMesh.castShadow = true;
      foliMesh.receiveShadow = true;
    }
    list.forEach((p, j) => {
      _pos.set(p.x, p.y, p.z);
      _quat.setFromEuler(_euler.set(p.tiltX, p.r, p.tiltZ));
      _scl.set(p.s, p.s * (0.88 + (p.v - 0.7) * 0.5), p.s);
      _m4.compose(_pos, _quat, _scl);
      trunkMesh.setMatrixAt(j, _m4);
      // Trunk tint only ever darkens; brightening it is what made the bark read
      // as a pale pole against the canopy. The *spread* is another matter — at
      // a 1.6x value range and a 4% hue swing every bole in a stand was the same
      // brown, and a row of identical verticals is the most findable repeat
      // there is. Two and a quarter stops of value and a real red-to-grey swing,
      // both still under the old ceiling.
      const tv = 0.195 + (p.v - 0.7) * 0.54;
      _col.setRGB(tv * (1 + p.warm * 0.9), tv * (0.97 + p.warm * 0.1), tv * (0.88 - p.warm * 0.8));
      trunkMesh.setColorAt(j, _col);
      if (foliMesh) {
        foliMesh.setMatrixAt(j, _m4);
        // Most of the spread is in hue, because a stand whose members differ in
        // green reads as species and one whose members differ only in brightness
        // reads as a lighting bug. But the value spread was down at ±10%, and a
        // whole tree is the largest clump there is: it is the coarsest scale the
        // mid distance has to separate at, and it was the flattest. Widened to
        // ±15% and re-centred so the canopy's mean does not move.
        // Red held under green: the warm end of the spread used to reach 1.39 on
        // red, and those instances came out the yellow-green of a garden hedge.
        const fv = 0.75 + (p.v - 0.7) * 0.58;
        // Blue lifted above red across the whole family. The needle atlas is a
        // clean conifer green (hue 105-132) but the sun is 0xffe2c6, which is
        // blue-at-56%-of-red in linear, so directly lit foliage multiplies out
        // to a hue in the eighties — khaki. The scene's hemisphere light used to
        // put the blue back and no longer does. Cheaper and more controllable to
        // pay for it in the albedo than to fight the key light.
        //
        // The species hue then steps that whole family sideways, and `p.turn`
        // takes a patch of broadleaves into autumn together — one gold tree
        // among green ones is a mistake, a hillside of them is a season.
        const [sr, sg, sb] = hueOf(proto.name, p.turn);
        _col.setRGB(fv * sr * (0.64 + p.warm * 0.5), fv * sg * (1 + p.warm * 0.08), fv * sb * (0.94 - p.warm * 0.62));
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
  });

  // --- billboard band: fills the mid ground out to the terrain edge ---------
  //
  // One painted tree per instance is what produced the comb of evenly spaced
  // spires with bright sky between every pair. Each instance here is a small
  // *stand* instead: three to five trees at their own offsets, heights, tiles
  // and mirror states, authored in units of the tallest tree so a uniform
  // instance scale keeps the proportions. Stands overlap themselves and each
  // other into tonal mass, and eight arrangements x mirroring x free yaw x
  // height and width jitter puts a findable repeat out of reach.
  const STAND_MIX = [
    [0, 0, 1],
    [0, 1, 0, 1],
    [1, 1, 0],
    [1, 0, 2],
    [2, 2, 1],
    [0, 3, 1],
    [1, 3, 0, 1],
    [2, 1, 0, 0],
  ];
  // The horizontal slice of each tile the painting actually occupies, as
  // [centre, half-width] in cell units. Cells are square, so a card cropped to
  // this window and sized `height x 2*half` shows the painting undistorted with
  // no empty margin to pay fill rate on. Getting this wrong is what produced
  // the flat-topped organ pipes: the old table claimed a fir tile was 0.42 of
  // its height wide when the painting fills its cell, squeezing a whole stand
  // into a column two and a half times too narrow.
  const TILE_BOX = [
    [0.5, 0.465],
    [0.5, 0.475],
    [0.566, 0.355],
    [0.488, 0.115],
  ];
  const billboardGeos = STAND_MIX.map((mix, k) => {
    const r2 = mulberry32(6100 + k * 137);
    const parts = [];
    const trees = mix.length;
    for (let i = 0; i < trees; i++) {
      const tile = mix[i];
      const th = i === 0 ? 1.0 : 0.5 + r2() * 0.42;
      const [bc, bh] = TILE_BOX[tile];
      const tw = th * bh * 2;
      const ang = i * 2.399 + r2() * 0.7;
      const rr = i === 0 ? r2() * 0.05 : 0.12 + r2() * 0.22;
      const ox = Math.cos(ang) * rr;
      const oz = Math.sin(ang) * rr;
      // only the tall one is crossed; the rest are single cards, which is what
      // keeps the triangle count of a four-tree stand at ten
      const planes = i === 0 ? 2 : 1;
      for (let p = 0; p < planes; p++) {
        const g = foliageCard(tw, th, tile, {
          bow: 0.05,
          segs: [1, 1],
          mirror: (k >= 4) !== (r2() < 0.4),
          uCrop: [bc - bh, bc + bh],
        });
        g.translate(0, th * 0.5, 0);
        g.rotateY(p * 1.62 + ang * 0.5 + k * 0.4);
        g.translate(ox, -0.004, oz);
        parts.push(g);
      }
    }
    const geo = shellNormals(merge(parts), { mode: 'cone', centre: [0, 0.3, 0], blend: 0.44, up: 0.42 });
    windWeight(geo, (x, y) => clamp(y - 0.25) * 0.5);
    return shadeWeight(geo, (x, y, z) => 0.9 - clamp(y) * 0.52 - Math.hypot(x, z) * 0.85);
  });

  const farLists = billboardGeos.map(() => []);
  let farPlaced = 0;
  // spacing is loose because one instance is now a dozen painted trees wide
  sites(8.4 / Math.sqrt(density), span, (x, z) => {
    const d = terrain.roadDistance(x, z);
    // Reaches further in toward the corridor than the old 30 m. The gaps a
    // viewer reads as "spiky treeline" are the sky slots between the geometry
    // crowns down the road, and nothing was filling them: the far band started
    // outside the near band, so from the road it sat entirely off to the sides.
    if (d < 24) return;
    const open = openness(x, z);
    if (rnd() > 0.84 - open * 0.3) return;
    const w = wet(x, z);
    const dd = dieback(x, z);
    let k;
    if (dd > 0.82) k = rnd() < 0.5 ? 5 : 6;
    else if (w > 0.58) k = rnd() < 0.5 ? 4 : 3;
    else k = stand(x, z) > 0.5 ? (rnd() < 0.5 ? 2 : 7) : rnd() < 0.5 ? 0 : 1;
    // Height rises with distance off the corridor, which is the same thing as
    // distance from the camera for a road-following view. The close members stay
    // short and hide behind the geometry band; the outer ones grow tall enough to
    // close the sky slots between its crowns, by which point the aerial ramp has
    // already taken them down to a dark mass.
    const reach = clamp((d - 24) / 58);
    const base = k === 4 || k === 3 ? 16 : k === 5 || k === 6 ? 17 : 22;
    const height = base * (0.6 + reach * 0.5) * (0.72 + Math.pow(rnd(), 1.35) * 0.66);
    farLists[k].push({
      x,
      z,
      y: terrain.heightAt(x, z) - 0.3,
      h: height,
      // the card geometry is authored square, so this stays near 1: the tile is
      // a painted stand and stretching it stretches every tree in it
      w: height * (0.92 + rnd() * 0.16),
      r: rnd() * Math.PI * 2,
      v: 0.72 + rnd() * 0.4,
      warm: (rnd() - 0.5) * 0.34,
      // Same species fields the geometry band reads, so a cedar stand carries on
      // past 24 m as a cedar stand instead of the whole distance reverting to
      // one grey-green. The aerial ramp eats most of the chroma out there, which
      // is why it has to be put in at more than the strength that looks right on
      // a swatch.
      sp: w > 0.58 ? (dd > 0.6 ? 'turning' : 'alder') : dd > 0.82 ? 'dying' : stand(x, z) > 0.5 ? 'cedar' : rnd() < 0.5 ? 'fir' : 'spruce',
      turn: w > 0.58 ? clamp((dd - 0.5) * 2.6) : 0,
    });
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
      _scl.set(p.w, p.h, p.w);
      _m4.compose(_pos, _quat, _scl);
      mesh.setMatrixAt(j, _m4);
      // hue spread wider than value spread: a distant stand differing in tint
      // reads as a different species, one differing in value reads as a mistake
      const [sr, sg, sb] = hueOf(p.sp, p.turn);
      _col.setRGB(p.v * sr * (1 + p.warm * 0.5), p.v * sg * (1 + p.warm * 0.06), p.v * sb * (0.96 - p.warm * 0.55));
      mesh.setColorAt(j, _col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  });

  // --- undergrowth ---------------------------------------------------------
  // five and six planes rather than three: at a metre from the camera a fern
  // built from three cards reads as three cards
  // Taller than wide. A clump authored 1.5 m across and 0.6 m high is a banner,
  // and a metre from the lens it reads as exactly that however many planes are
  // in it: the eye judges a plant by whether its silhouette stands up.
  //
  // Eleven fern prototypes over seven forms and a four-to-one spread of
  // proportion, because the floor was reading as wallpaper and no amount of
  // per-instance jitter fixes that: two clumps of the same silhouette at
  // different scales are still the same clump, and the eye finds the motif in
  // about a second. What breaks it is prototypes that are *different plants* —
  // an ankle-high mat next to a waist-high fountain next to a bare spire.
  const fernGeos = [
    plantClump(1.0, 1.02, [0, 0, 1, 2], { seed: 7001, planes: 6, spread: 0.3, form: 'arch' }),
    plantClump(0.86, 1.14, [0, 2, 0, 1], { seed: 7013, planes: 6, spread: 0.26, form: 'arch' }),
    plantClump(1.16, 0.98, [1, 1, 0, 2], { seed: 7027, planes: 5, spread: 0.34, form: 'patch' }),
    plantClump(0.9, 1.06, [2, 0, 0, 1], { seed: 7039, planes: 6, spread: 0.27 }),
    plantClump(1.02, 0.94, [3, 1, 0, 0], { seed: 7051, planes: 5, spread: 0.32, form: 'patch' }),
    plantClump(1.24, 0.82, [1, 0, 2, 0], { seed: 7063, planes: 5, spread: 0.4, form: 'patch', lean: 0.5 }),
    plantClump(0.8, 1.2, [0, 1, 0, 2], { seed: 7077, planes: 6, spread: 0.22, form: 'arch' }),
    plantClump(1.5, 0.42, [2, 1, 0, 2], { seed: 7089, planes: 5, spread: 0.62, form: 'sprawl' }),
    plantClump(0.52, 1.34, [0, 2, 1, 0], { seed: 7093, planes: 3, spread: 0.2, form: 'spire' }),
    plantClump(1.34, 0.66, [1, 2, 3, 0], { seed: 7097, planes: 5, spread: 0.44, form: 'shelf' }),
    plantClump(0.74, 0.72, [0, 1, 2, 1], { seed: 7099, planes: 4, spread: 0.3, form: 'fan' }),
  ];
  // grass is authored as patches rather than single tufts: one card has fifty
  // blades in it, so a patch covers ground a tuft never could
  const grassGeos = [
    plantClump(1.0, 0.78, [0, 1, 0, 1], { seed: 7101, planes: 4, spread: 0.4, bow: 0.2 }),
    plantClump(0.86, 0.92, [1, 3, 1, 0], { seed: 7113, planes: 4, spread: 0.34, bow: 0.22, form: 'arch' }),
    plantClump(1.28, 0.44, [2, 0, 2, 1], { seed: 7127, planes: 4, spread: 0.52, bow: 0.18, lean: 0.6, form: 'patch' }),
    plantClump(0.94, 0.84, [3, 2, 1, 0], { seed: 7139, planes: 4, spread: 0.38, bow: 0.22 }),
    plantClump(1.14, 0.36, [0, 2, 3, 1], { seed: 7151, planes: 3, spread: 0.5, bow: 0.2, lean: 0.7, form: 'patch' }),
    plantClump(0.9, 0.66, [1, 2, 0, 3], { seed: 7163, planes: 4, spread: 0.44, bow: 0.24, form: 'patch' }),
    plantClump(1.06, 0.58, [3, 0, 1, 2], { seed: 7177, planes: 4, spread: 0.3, bow: 0.2, form: 'arch' }),
    plantClump(1.62, 0.26, [2, 0, 1, 3], { seed: 7183, planes: 4, spread: 0.72, bow: 0.16, form: 'sprawl' }),
    plantClump(0.42, 1.08, [1, 0, 3, 0], { seed: 7189, planes: 3, spread: 0.16, bow: 0.14, form: 'spire' }),
  ];
  // Salal thickets, low and wide and dense, against huckleberry, tall and open
  // and twiggy. The proportions carry the difference at twenty metres, where a
  // silhouette is all there is — plane count and leaf tile do not survive out
  // there, so two prototypes of the same footprint read as one plant.
  const shrubGeos = [
    plantClump(1.3, 1.0, [0, 1, 0, 2], { seed: 7201, planes: 5, spread: 0.32, form: 'tier' }),
    plantClump(1.75, 0.6, [1, 3, 0, 1], { seed: 7213, planes: 6, spread: 0.58, form: 'patch', lean: 0.62 }),
    plantClump(1.6, 1.15, [0, 2, 1, 3], { seed: 7227, planes: 6, spread: 0.36, form: 'tier' }),
    plantClump(1.9, 0.52, [2, 0, 3, 1], { seed: 7239, planes: 6, spread: 0.66, form: 'patch', lean: 0.7 }),
    // open and leggy: few planes on a wide spread is a shrub you see through
    plantClump(0.95, 1.55, [1, 0, 2, 1], { seed: 7251, planes: 4, spread: 0.5, form: 'tier' }),
    plantClump(0.8, 1.75, [3, 1, 0, 2], { seed: 7263, planes: 4, spread: 0.42, form: 'arch' }),
    plantClump(2.3, 0.44, [0, 2, 1, 0], { seed: 7271, planes: 6, spread: 0.8, form: 'sprawl', lean: 0.8 }),
    plantClump(1.5, 0.86, [3, 0, 2, 1], { seed: 7283, planes: 5, spread: 0.5, form: 'shelf' }),
    plantClump(1.05, 1.1, [1, 3, 0, 2], { seed: 7291, planes: 4, spread: 0.34, form: 'fan' }),
    plantClump(0.62, 2.05, [2, 1, 0, 3], { seed: 7297, planes: 4, spread: 0.24, form: 'spire' }),
  ];
  // A bare stem carrying a narrow spike of flower near the top. One card for the
  // spike and one crossed pair for the basal leaves — the whole point is the
  // vertical, so it is cheap.
  const stalkGeos = [stalkPlant(1.5, 0, 7401), stalkPlant(1.15, 1, 7413), stalkPlant(1.85, 0, 7427), stalkPlant(1.35, 1, 7439)];
  // The off-green sixth of the floor. Tiles are not mixed across cells here the
  // way they are for the greens: the point is that a clump is *one* of rust,
  // bronze, slate or straw, so it reads as a different plant rather than as a
  // sage clump with a discoloured leaf in it. Only the low mat and the sedge
  // share, because a dying patch inside a live one is what that actually is.
  const understoryGeos = [
    plantClump(1.05, 0.92, [0, 0, 0, 0], { seed: 7501, planes: 5, spread: 0.42, form: 'patch', lean: 0.5 }),
    plantClump(1.42, 0.5, [0, 0, 0, 0], { seed: 7513, planes: 4, spread: 0.66, form: 'sprawl', lean: 0.75 }),
    // The broad-leaf pair carries six and seven planes rather than four. Four
    // cards of one tile means whichever card faces the lens *is* the plant, and a
    // 42%-fill tile at that size arrives as a smooth brown mass — which is the
    // one thing an off-green species must not do, because a flat saturated shape
    // is far more findable than a flat green one.
    plantClump(0.92, 1.5, [1, 1, 1, 1], { seed: 7527, planes: 6, spread: 0.44, form: 'arch' }),
    plantClump(1.25, 1.0, [1, 1, 1, 1], { seed: 7539, planes: 7, spread: 0.36, form: 'tier' }),
    plantClump(1.7, 0.42, [2, 2, 2, 2], { seed: 7551, planes: 5, spread: 0.72, form: 'sprawl', lean: 0.8 }),
    plantClump(1.15, 0.62, [2, 2, 3, 2], { seed: 7563, planes: 5, spread: 0.4, form: 'patch' }),
    plantClump(0.82, 0.98, [3, 3, 3, 3], { seed: 7577, planes: 4, spread: 0.3, bow: 0.22 }),
    plantClump(0.6, 1.25, [3, 3, 2, 3], { seed: 7589, planes: 3, spread: 0.2, bow: 0.18, form: 'spire' }),
  ];
  // small: a flat card this size seen from a low camera is a hard horizontal bar
  // lying across the dirt, and a big one is a painted oval
  const litterGeos = [groundCard(1.0, 0), groundCard(1.15, 1), groundCard(0.9, 2), groundCard(0.8, 3)];
  const hummockGeo = (() => {
    // 7x3, not 9x4. A moss hummock is a smooth lump the eye never inspects, and
    // at fourteen hundred instances it was the single biggest triangle line in
    // the forest — more than every fir crown put together.
    const g = new THREE.SphereGeometry(0.5, 7, 3, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const pos = g.attributes.position;
    const r2 = mulberry32(7301);
    for (let i = 0; i < pos.count; i++) {
      const s = 0.78 + r2() * 0.4;
      pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * 0.42 * s, pos.getZ(i) * s * (0.8 + r2() * 0.5));
    }
    g.computeVertexNormals();
    boxUV(g, 1.6);
    return g;
  })();

  // One shared site grid for every plant type. terrain.roadDistance and
  // heightAt are by far the most expensive calls in this file, so they get
  // sampled once per 2 m cell and every scatter pass reads the same list.
  const UG_REACH = 56;
  const ugSites = [];
  sites(2.0, span, (x, z) => {
    const d = terrain.roadDistance(x, z);
    if (d < 1.3 || d > UG_REACH) return;
    const e = 0.8;
    ugSites.push({
      x,
      z,
      d,
      // Signed metres to add to the road distance before any scatter tests it.
      // Every pass keys its inner boundary off a plain distance from the
      // centreline, so every species' verge is an exact offset curve of the
      // trail and the ground cover ends on one clean line running parallel to
      // it — which is the single most obvious demo tell left in the plan views.
      // A real verge interlocks: bare shoulder pushes two metres into the green
      // in one place and moss creeps to the rut edge fifteen metres later.
      //
      // Biased outward, roughly two to one. The inward half is what puts plants
      // near the ruts, and every low beauty camera sits in that band — but they
      // arrive at the bottom of the shrink ramp too, because that is keyed off
      // the same jittered distance, so what fingers in is ankle-high and what
      // stands back is full size. That is also what the real thing does.
      dj:
        (fbm(x * 0.085 + 33.1, z * 0.085 - 12.7, { octaves: 2, period: 8, seed: 7373 }) - 0.36) * 3.3 +
        (fbm(x * 0.33 - 5.5, z * 0.33 + 21.2, { octaves: 2, period: 6, seed: 9191 }) - 0.42) * 1.2,
      y: terrain.heightAt(x, z),
      nx: terrain.heightAt(x - e, z) - terrain.heightAt(x + e, z),
      ny: 2 * e,
      nz: terrain.heightAt(x, z - e) - terrain.heightAt(x, z + e),
    });
  });

  /**
   * Stand density for one species at one place: low-frequency noise, thresholded
   * so most of the field is empty and what is left is a patch.
   *
   * A per-site probability over an even grid produces an even scatter, and an
   * even scatter of anything reads as a repeating motif however many prototypes
   * feed it — that was the forest floor. Real undergrowth grows in stands with
   * bare duff between them, and the bare ground is half of what makes it read:
   * it gives the eye somewhere to measure the clumps against. Each species gets
   * its own offset into the field, so a fern stand and a salal thicket are in
   * different places rather than layered on the same spots.
   */
  const standField = (x, z, ox, oz, period, thresh, gain) => {
    const n = fbm(x * 0.5 + ox, z * 0.5 + oz, { octaves: 3, period, seed: 4242, gain: 0.55 });
    return Math.pow(smoothstep(thresh, 1.0, n), gain);
  };

  /**
   * Hue families for the floor, as multipliers on the instance colour.
   *
   * Every plant on this floor used to get the same green-dominant tint with a
   * warm-cool swing inside it, which is a single hue family however wide the
   * value spread is — and it also destroyed the art: the dying-frond tile is
   * painted rust, and multiplying rust by a tint whose green is its largest
   * channel returns dark olive. So the families are separate, one of them is
   * near neutral so painted colour survives, and the rest are far enough apart
   * to read as different plants rather than as one plant under two lights.
   *
   * Blue never goes above green by much and the cool family loses value as it
   * loses warmth: nothing on a forest floor is cyan, and a saturated cool green
   * is the single most synthetic thing this scatter has produced.
   */
  const HUES = {
    sage: [0.80, 1.0, 0.66],
    olive: [0.94, 0.99, 0.5],
    deep: [0.6, 0.92, 0.7],
    // painted colour through, for the tiles that are already not green
    plain: [1.0, 0.98, 0.94],
    rust: [1.32, 0.8, 0.42],
    bronze: [1.16, 0.95, 0.52],
    // a glaucous mat: grey-blue and a stop down, so it reads as bloom on a leaf
    slate: [0.68, 0.82, 0.94],
  };

  /**
   * Scatter one prototype set over the shared grid. `per` is instances per
   * site, so it can exceed one.
   */
  function scatterPlants(geos, mat, {
    per,
    boost = 0,
    minRoad,
    maxRoad = UG_REACH,
    scale,
    jitter = 1.0,
    lean = 0.45,
    yOff = -0.04,
    castShadow = false,
    tint = [0.62, 0.5],
    // [x offset, z offset, period, cut, contrast] into the stand field. A high
    // cut leaves fewer, tighter stands; the offsets keep species apart.
    stand = null,
    // weights over `geos`, so a prototype can be common or rare rather than
    // every one of them being a seventh of the cover
    weights = null,
    // [weight, r, g, b] multipliers. See HUES.
    hues = null,
    // How much smaller a clump gets right at the rut edge. The low beauty
    // cameras sit about 2.5 m off the centreline, so a full-size clump at the
    // verge fills the lens with one plane; a trampled one does not.
    shrink = 0.55,
    shrinkOver = 4.0,
    // How much of the site's verge jitter this pass takes, in metres of road
    // distance. Ground clutter creeps onto the shoulder further than a waist-high
    // shrub does, and a flat card of leaf colour out on the compacted running
    // surface reads as a bald patch painted on the dirt, so litter gets less of
    // it than anything that stands up.
    ragged = 1.0,
    name = 'plants',
  }) {
    const perGeo = geos.map(() => []);
    // cumulative prototype weights, so `weights` can make one common and one rare
    const cum = [];
    {
      const w = weights || geos.map(() => 1);
      let acc = 0;
      for (let i = 0; i < geos.length; i++) {
        acc += w[i] ?? 1;
        cum.push(acc);
      }
      for (let i = 0; i < cum.length; i++) cum[i] /= acc;
    }
    const pickGeo = () => {
      const r = rnd();
      for (let i = 0; i < cum.length; i++) if (r <= cum[i]) return i;
      return cum.length - 1;
    };
    // cumulative hue-family weights, walked by a field value rather than a roll
    const hueSet = (hues || [[1, ...HUES.sage]]).slice();
    const hueCum = [];
    {
      let acc = 0;
      for (const h of hueSet) acc += h[0];
      let run = 0;
      for (const h of hueSet) {
        run += h[0];
        hueCum.push(run / acc);
      }
    }
    const pickHue = (f) => {
      for (let i = 0; i < hueCum.length; i++) if (f <= hueCum[i]) return hueSet[i];
      return hueSet[hueSet.length - 1];
    };
    for (const s of ugSites) {
      const de = s.d + s.dj * ragged;
      if (de < minRoad || s.d > maxRoad) continue;
      // the falloff has to reach well past the verge: the camera spends most of
      // its time looking across the 10-25 m band, not down at its feet
      let p = per * (1 + boost * (1 - smoothstep(16, 48, s.d)));
      // density inside a stand rather than everywhere: the field is mostly zero,
      // so a species that used to be a thin even wash is now the same number of
      // plants concentrated into patches with bare ground between
      if (stand) p *= standField(s.x, s.z, stand[0], stand[1], stand[2], stand[3], stand[4]);
      while (p > 0) {
        if (p < 1 && rnd() > p) break;
        perGeo[pickGeo()].push(s);
        p -= 1;
      }
    }
    let total = 0;
    perGeo.forEach((list, gi) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geos[gi], mat, list.length);
      mesh.name = `${name}_${gi}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      list.forEach((p, j) => {
        // Biased small, so a stand has a size hierarchy — many young plants and
        // the occasional big one. Uniform over a narrow range put every clump
        // within a whisker of the mean, and a field of one size is a field of one
        // plant however different the prototypes are.
        //
        // Half the spread is stand-wide rather than per plant. Randomising size
        // per instance averages out by ten metres and the bed goes flat-topped
        // again; carrying it on the low-frequency field instead gives knee-high
        // beds next to waist-high ones, which is the variation that survives to
        // the distances the camera actually works at.
        const bulk = fbm(p.x * 0.11 - 18.4, p.z * 0.11 + 63.1, { octaves: 2, period: 5, seed: 5150 });
        const t = Math.pow(bulk * 0.6 + rnd() * 0.4, 1.2);
        const s =
          (scale[0] + t * (scale[1] - scale[0])) *
          lerp(shrink, 1, smoothstep(minRoad, minRoad + shrinkOver, p.d + p.dj * ragged));
        const jx = (rnd() - 0.5) * jitter;
        const jz = (rnd() - 0.5) * jitter;
        leanTo(p.nx, p.ny, p.nz, _quat, lean);
        _quat.multiply(_spin.setFromEuler(_euler.set(0, rnd() * Math.PI * 2, 0)));
        _pos.set(p.x + jx, p.y + yOff - Math.abs(jx * p.nx + jz * p.nz) * 0.5, p.z + jz);
        _scl.set(s * (0.85 + rnd() * 0.35), s * (0.8 + rnd() * 0.5), s * (0.85 + rnd() * 0.35));
        _m4.compose(_pos, _quat, _scl);
        mesh.setMatrixAt(j, _m4);
        // A wide hue spread over a narrow value spread: a metre from the lens the
        // giveaway is not that two clumps are the same brightness, it is that
        // they are the same green. The spread runs olive-to-blue-green and never
        // lets red past green — the old curve put red level with green and
        // dropped blue, so every clump came out chartreuse whatever the atlas said.
        // Tone runs in patches, not per plant. Neighbours in a real stand share
        // their light and their soil, so they share a tone; randomising every
        // instance independently averages out at ten metres and the whole floor
        // goes back to one value. The low-frequency part carries most of the
        // spread and the per-plant part only breaks up the edges.
        // Value spread widened to two and a half stops and biased *down*, and it
        // only ever darkens. Every instance sitting inside a third of a stop of
        // its neighbours is the other half of the wallpaper read — the eye finds
        // a repeat by matching tone long before it matches shape. Lightening is
        // off the table because a plant brighter than the sunlit dirt it grows in
        // reads as a lit object lying on the ground, and a bed of those flattens
        // the whole frame.
        const patch = fbm(p.x * 0.16 + 71.3, p.z * 0.16 - 24.7, { octaves: 2, period: 6, seed: 909 });
        const fine = fbm(p.x * 0.62 - 12.9, p.z * 0.62 + 41.5, { octaves: 2, period: 4, seed: 313 });
        const v = tint[0] + Math.pow(patch * 0.5 + fine * 0.22 + rnd() * 0.28, 1.25) * tint[1];
        // Which family, chosen mostly off a third low-frequency field so a stand
        // shares a hue the way a stand shares a species — with a per-plant roll
        // on top, which is what puts the odd dying frond inside a green clump.
        // The field is a bare majority of the pick rather than three quarters of
        // it. At 0.72 the field's own coherence meant a whole hillside of one
        // species shared a family with no exceptions in it, and a family listed
        // near either end of the weights could only ever appear as one contiguous
        // region of the map. Just over half still gives a stand a shared tone.
        const hf = fbm(p.x * 0.09 + 137.4, p.z * 0.09 + 58.6, { octaves: 2, period: 7, seed: 6161 });
        const [, hr, hg, hb] = pickHue(clamp(hf * 0.55 + rnd() * 0.45));
        // A small warm-cool swing still runs inside each family: neighbours in one
        // stand differ, they just no longer differ *only* along that one axis.
        const warm = (rnd() - 0.5) * 0.34;
        _col.setRGB(v * (hr + warm * 0.3), v * (hg - warm * 0.04), v * (hb - warm * 0.2));
        mesh.setColorAt(j, _col);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
      total += list.length;
    });
    return total;
  }

  const ug = clamp(density, 0.45, 1.25);
  const ugCounts = {};
  // Raised by two thirds, and it is a hue lever rather than a detail one: a mat
  // of fallen leaf and needle between the clumps puts rust and bronze on the
  // ground itself, where it cannot read as a bright object sitting on the floor
  // the way a standing plant in the same colour can.
  ugCounts.litter = scatterPlants(litterGeos, litterMat, {
    per: 0.92 * ug,
    boost: 0.7,
    // Clear of the whole corridor, not just the wheel bands. A driven track is
    // swept, so a flat oval of leaf colour anywhere on the compacted surface
    // reads as a bald patch painted on the dirt — and at 2.7 there were still
    // several thousand of them inside the shoulder.
    minRoad: 3.4,
    scale: [0.7, 1.35],
    lean: 0.95,
    yOff: 0.02,
    jitter: 1.6,
    tint: [0.35, 0.17],
    ragged: 0.55,
    hues: [[4, ...HUES.plain], [2.2, ...HUES.bronze], [1.6, ...HUES.sage], [1.5, ...HUES.rust]],
    name: 'litter',
  });
  // A driven two-track has bare compacted ruts and only a thin verge: grass
  // right at the rut edge also parks a 0.6 m card directly in front of the low
  // beauty cameras, which buries the subject.
  // Sword fern is the plant this forest floor is actually made of, so it leads
  // the mix. Grass used to be 55% of every instance on the ground and grass is
  // the stiff-bladed one — which is why the floor read as a single spiky motif
  // however many prototypes were behind it. It is now a minor component that
  // fills between the stands rather than being the stand.
  // Stand cuts raised and their contrast steepened: at a 0.36 cut most of the
  // field still got a fifth of full density, so the "patches" were a thin even
  // wash with a few thicker spots — which reads as an even scatter, which reads
  // as wallpaper. A 0.52 cut with a squared falloff leaves two thirds of the
  // floor as bare duff, and `per` is raised to put the same plant count into what
  // is left. The bare ground is half the effect: it gives the eye a baseline to
  // measure the thickets against.
  // Held level with the other two rather than half the floor on its own. A frond
  // is the most recognisable outline down here, so whichever species leads the
  // mix is the one the eye finds repeating; three species at a third each has no
  // lead motif to find.
  ugCounts.fern = scatterPlants(fernGeos, fernMat, {
    per: 7.2 * ug,
    boost: 0.9,
    minRoad: 3.5,
    scale: [0.38, 1.95],
    lean: 0.4,
    jitter: 1.6,
    // Half a stop down on the old 0.26. These were set against a fog that
    // measured 0.36 linear and it now measures 0.17, so the same clump that read
    // as shade against the old surround reads as the lit thing in the frame
    // against this one — which is what "pale sage band" was describing.
    tint: [0.21, 0.4],
    shrink: 0.44,
    shrinkOver: 5.5,
    stand: [0, 0, 5.5, 0.44, 1.25],
    weights: [3, 3, 1.4, 2, 1.4, 1, 2.6, 1.5, 0.9, 1.6, 1.2],
    // the rust tile in this atlas only ever reached the eye as olive before,
    // because the tint's green channel was always its largest. The near-neutral
    // family carries a seventh of the pass on its own now: this atlas already
    // paints a turned frond, and `plain` is the only family that lets it through.
    // No rust family here, deliberately. A five-percent rust weight on the most
    // numerous species on the floor does not read as the odd dying frond: the
    // family is picked mostly off a low-frequency field, and the last family in
    // the list is the one the *top* of that field selects, so it arrives as one
    // contiguous patch. On the slope behind the trail that patch was a tan
    // diagonal across the upper third of the `forest` frame — 27% of that band
    // warm where it had been 11%. Dead bracken belongs to the understory pass,
    // which has real rust art and its own stand field placed away from this one.
    hues: [[4.4, ...HUES.sage], [2.4, ...HUES.deep], [1.6, ...HUES.olive], [1.8, ...HUES.plain], [1.5, ...HUES.bronze], [0.7, ...HUES.slate]],
    name: 'fern',
  });
  // Weighted up close to the camera at grass's expense. Fern paints pointed
  // fronds and grass paints pointed blades, so with those two leading the verge
  // three quarters of the floor was the same spiky motif and the eye reads that
  // as one plant repeated. The shrub tiles are the only broad rounded leaf down
  // here, and it is the contrast against them that makes the fronds read as
  // fronds rather than as a texture.
  ugCounts.shrub = scatterPlants(shrubGeos, shrubMat, {
    per: 6.8 * ug,
    boost: 1.0,
    minRoad: 4.2,
    scale: [0.34, 1.8],
    lean: 0.35,
    jitter: 1.7,
    tint: [0.21, 0.39],
    shrink: 0.5,
    shrinkOver: 5.0,
    stand: [61.7, -38.2, 4.5, 0.47, 1.3],
    weights: [2, 3, 1.2, 2.6, 2.2, 1.6, 1.4, 1.8, 1.1, 0.8],
    hues: [[4, ...HUES.sage], [3, ...HUES.deep], [1.6, ...HUES.olive], [1.4, ...HUES.plain], [1.1, ...HUES.bronze], [0.9, ...HUES.slate]],
    name: 'shrub',
  });
  ugCounts.grass = scatterPlants(grassGeos, grassMat, {
    per: 3.8 * ug,
    boost: 0.7,
    minRoad: 4.2,
    scale: [0.4, 1.5],
    lean: 0.6,
    jitter: 1.8,
    tint: [0.19, 0.37],
    shrink: 0.6,
    // grass at the rut edge is what a used track actually has, so it takes the
    // whole of the verge jitter
    ragged: 1.25,
    stand: [-27.4, 84.1, 7.0, 0.48, 1.45],
    weights: [1, 1.4, 2.2, 1, 2.4, 2.2, 1.4, 1.6, 0.8],
    // grass is the one that already carries a dry tile, so the warm families get
    // real straw to work on rather than turning a green blade khaki
    hues: [[4, ...HUES.sage], [2, ...HUES.olive], [1.6, ...HUES.deep], [1.5, ...HUES.plain], [1.4, ...HUES.bronze], [0.7, ...HUES.slate]],
    name: 'grass',
  });
  // Not a garnish: at a sixth of the floor it is the thing that stops the verge
  // being describable as one colour. Its stand field is offset well away from
  // the fern and shrub fields so a rust patch is somewhere they are not.
  ugCounts.understory = scatterPlants(understoryGeos, understoryMat, {
    // More of them and each one smaller. Dead bracken and huckleberry are low
    // plants, and the hue wants to arrive as many small patches rather than as
    // one two-metre mass — a single big rust clump is a shape the eye names.
    per: 4.8 * ug,
    boost: 0.85,
    minRoad: 3.8,
    // A quarter more of them at four fifths the size: the same amount of
    // off-green in the frame, spread over more and smaller plants. Dropping the
    // size alone took the rust bin in the verge from 15% of saturated pixels to
    // 6%, which is a green band again; going to 5.6 of them took it to 18% but
    // pushed the warm bins to 57% between them and collapsed the greens to 8%,
    // which is the same failure with the hue moved. The aim is a spread, not a
    // shift: no thirty-degree family over about 40%, four bins over 10%.
    scale: [0.32, 1.18],
    lean: 0.5,
    jitter: 1.7,
    // The darkest species on the floor. It went in a stop *above* the ferns and
    // every rust clump became the brightest thing in its own frame — hue variety
    // has to arrive as something receding into the duff, not sitting on top of it.
    // The spread is wider than the greens get: two rust clumps at one value next
    // to each other read as one object, and off-green makes that worse.
    tint: [0.13, 0.36],
    shrink: 0.5,
    shrinkOver: 5.0,
    stand: [-118.3, 66.9, 5.0, 0.52, 1.4],
    // Weighted to the two warm cells. The mat carried this pass while the rust
    // was still too hot to trust, but the slate swatch has since come down a stop
    // and a half and a grey-blue at duff value barely registers as a different
    // hue at all — so the bracken and the huckleberry have to do the work.
    //
    // Prototype weight is the lever to reach for here rather than `per`, because
    // it costs no draws from the shared stream: changing an instance count
    // reshuffles every log and stump on the map, and chasing the rust bin that
    // way moved it from 15% to 6% to 18% on changes that should have been worth
    // a fifth of that.
    weights: [2.8, 2.0, 1.9, 1.6, 1.4, 1.8, 1.5, 0.9],
    // near neutral, so the painted rust, bronze, slate and straw survive rather
    // than being multiplied back to olive by a green-dominant tint
    hues: [[7, ...HUES.plain], [1.6, ...HUES.slate], [1.3, ...HUES.olive], [1.1, ...HUES.bronze]],
    name: 'understory',
  });
  // Foxglove and fireweed: a bare vertical stem well above the mass. Nothing
  // else on this floor has that silhouette, and a handful of them per stand is
  // what stops a bed of rosettes reading as tiling.
  ugCounts.stalk = scatterPlants(stalkGeos, stalkMat, {
    per: 0.9 * ug,
    boost: 0.6,
    // Pushed off the verge and shrunk. The 1.85 m prototype's spike card is
    // 0.28 x 0.93 m, so one of them at 2.5 m from the detail camera is a third
    // of the frame height whatever is painted on it.
    minRoad: 5.6,
    scale: [0.55, 1.3],
    lean: 0.22,
    jitter: 1.8,
    // was the highest floor of any pass on this floor, which made a stalk the
    // brightest thing in every frame that contained one
    tint: [0.26, 0.28],
    shrink: 0.34,
    shrinkOver: 7.0,
    stand: [15.9, 47.3, 3.6, 0.5, 1.1],
    hues: [[4, ...HUES.sage], [2, ...HUES.plain], [1.4, ...HUES.deep], [1, ...HUES.bronze]],
    name: 'stalk',
  });
  // Sixty-five thousand triangles of low dome for something the camera reads as
  // a texture on the duff. Thinned to pay for the extra cards in the crowns.
  ugCounts.moss = scatterPlants([hummockGeo], mossMat, {
    per: 0.92 * ug,
    minRoad: 4.2,
    scale: [0.7, 2.8],
    lean: 0.85,
    yOff: -0.12,
    jitter: 1.5,
    tint: [0.36, 0.32],
    ragged: 1.35,
    stand: [-92.5, 12.8, 4.0, 0.4, 1.0],
    hues: [[5, ...HUES.sage], [2, ...HUES.olive], [1.6, ...HUES.deep], [1, ...HUES.bronze]],
    name: 'moss',
  });

  // saplings get their own pass so trunk and foliage stay separate materials
  {
    const lists = saplings.map(() => []);
    for (const s of ugSites) {
      if (s.d < 4.0) continue;
      if (rnd() > 0.045 * ug) continue;
      lists[Math.floor(rnd() * saplings.length) % saplings.length].push(s);
    }
    saplings.forEach((proto, i) => {
      const list = lists[i];
      if (!list.length) return;
      const tm = new THREE.InstancedMesh(proto.trunk, barkMats.fir, list.length);
      const fm = new THREE.InstancedMesh(proto.foliage, needleMat, list.length);
      tm.name = `sapling_${i}_trunk`;
      fm.name = `sapling_${i}_foliage`;
      tm.castShadow = false;
      tm.receiveShadow = true;
      fm.castShadow = false;
      fm.receiveShadow = true;
      list.forEach((p, j) => {
        const s = 0.7 + rnd() * 0.9;
        leanTo(p.nx, p.ny, p.nz, _quat, 0.3);
        _quat.multiply(_spin.setFromEuler(_euler.set(0, rnd() * Math.PI * 2, 0)));
        _pos.set(p.x + (rnd() - 0.5) * 1.5, p.y - 0.06, p.z + (rnd() - 0.5) * 1.5);
        _scl.set(s, s * (0.85 + rnd() * 0.4), s);
        _m4.compose(_pos, _quat, _scl);
        tm.setMatrixAt(j, _m4);
        fm.setMatrixAt(j, _m4);
        const v = 0.8 + rnd() * 0.34;
        const warm = (rnd() - 0.5) * 0.6;
        _col.setRGB(v * (1 + warm * 0.7), v * (1 + warm * 0.08), v * (0.9 - warm * 0.8));
        fm.setColorAt(j, _col);
        _col.setRGB(v * 0.52, v * 0.5, v * 0.46);
        tm.setColorAt(j, _col);
      });
      tm.instanceMatrix.needsUpdate = true;
      fm.instanceMatrix.needsUpdate = true;
      if (tm.instanceColor) tm.instanceColor.needsUpdate = true;
      if (fm.instanceColor) fm.instanceColor.needsUpdate = true;
      group.add(tm, fm);
    });
    ugCounts.sapling = lists.reduce((a, l) => a + l.length, 0);
  }

  // --- rocks ---------------------------------------------------------------
  const rockSet = [
    { geo: rockGeo(9001, 1, 'boulder'), count: Math.round(46 * ug), scale: [0.9, 3.4], minRoad: 3.6 },
    { geo: rockGeo(9101, 1, 'slab'), count: Math.round(40 * ug), scale: [1.0, 3.0], minRoad: 3.2 },
    { geo: rockGeo(9203, 1, 'angular'), count: Math.round(38 * ug), scale: [0.7, 2.4], minRoad: 3.4 },
    { geo: rockGeo(9307, 0, 'cobble'), count: Math.round(150 * ug), scale: [0.3, 0.9], minRoad: 2.6 },
    { geo: rockGeo(9403, 0, 'slab'), count: Math.round(130 * ug), scale: [0.25, 0.8], minRoad: 2.4 },
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
      if (d < minRoad) continue;
      // boulders cluster in fields rather than dusting evenly
      if (fbm(x * 0.03 + 7, z * 0.03 + 13, { octaves: 3, period: 32, seed: 2020 }) < 0.42 && rnd() < 0.7) continue;
      const s = scale[0] + Math.pow(rnd(), 1.7) * (scale[1] - scale[0]) * (d < 9 ? 0.45 : 1);
      _pos.set(x, terrain.heightAt(x, z) - s * (0.24 + rnd() * 0.2), z);
      _quat.setFromEuler(_euler.set(rnd() * 0.7, rnd() * Math.PI * 2, rnd() * 0.7));
      _scl.set(s, s * (0.66 + rnd() * 0.55), s * (0.82 + rnd() * 0.45));
      _m4.compose(_pos, _quat, _scl);
      mesh.setMatrixAt(n, _m4);
      const v = 0.78 + rnd() * 0.4;
      _col.setRGB(v, v * (0.99 + rnd() * 0.04), v * (0.97 + rnd() * 0.06));
      mesh.setColorAt(n, _col);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  });

  // --- deadfall: logs, mossy log caps, stumps, root plates -----------------
  /**
   * A fallen log, built as a log rather than as a rotated trunk.
   *
   * The old one was `trunkGeo` on its side at eight radial segments: a clean
   * octagonal tube whose only large-scale feature was its taper. What a log has
   * that a tube does not, in the order the eye finds them — a sag, because it
   * bridges the ground rather than lying flush on it; lumps and old branch
   * collars breaking the outline; branch stubs standing off it; and end grain,
   * which is the one face of the object the viewer can name.
   */
  const RADIAL = 11;

  /**
   * Radial scale of a log's cross-section: old branch collars at the low
   * frequency, rot hollows and bark plates at the high one. Shared with the end
   * round so the two agree on where the outline is.
   */
  function logLump(seed, along, a) {
    const lump = fbm(along * 1.1 + 3, Math.cos(a) * 1.4 + Math.sin(a) * 0.6 + 7, { octaves: 2, period: 6, seed: seed + 31 }) - 0.5;
    const fine = fbm(along * 5.5 + 11, a * 2.2 + 19, { octaves: 2, period: 8, seed: seed + 41 }) - 0.5;
    return 1 + lump * 0.3 + fine * 0.14;
  }

  function logGeo(seed, len, r0, r1) {
    const r2 = mulberry32(seed + 17);
    const g = trunkGeo({
      height: len,
      baseR: r0,
      tipR: r1,
      radial: RADIAL,
      segs: 9,
      flare: 0.35,
      taper: 0.7,
      seed,
      // three and a half times the texel density along the log, which is what a
      // piece this close to a beauty camera needs before the fissures resolve
      uRepeat: 1.6,
      vScale: 1.05,
      bulge: 0.16,
      axis: (t) => [Math.sin(t * 2.1 + seed * 0.01) * len * 0.02, 0],
    });
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
    // trunkGeo builds up the +Y axis; rotating it lays the log along X centred
    // on the origin, with the butt at +len/2
    g.rotateZ(Math.PI / 2);
    g.translate(len * 0.5, 0, 0);
    const wave = 3.4 + r2() * 2.2;
    const sag = (t) => Math.sin(t * Math.PI) * r0 * 0.55 - (1 - Math.cos((1 - t) * wave)) * 0.5 * r0 * 0.3;
    // the ends settle into the duff and the middle bridges: a log lying flush
    // along a flat axis is the read the old one could not shake
    {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, pos.getY(i) + sag(clamp(pos.getX(i) / len + 0.5)));
      }
    }
    g.computeVertexNormals();
    const parts = [g];
    // branch stubs, snapped off short. Cheap, and they are most of what stops
    // the outline reading as a length of pipe.
    const stubs = 3 + Math.floor(r2() * 2);
    for (let i = 0; i < stubs; i++) {
      const t = 0.1 + (i / stubs) * 0.78 + r2() * 0.08;
      const a = r2() * Math.PI * 2;
      const rr = lerp(r1, r0, t) * logLump(seed, (1 - t) * len, a);
      const out = rr * (1.7 + r2() * 2.4);
      const px = len * (t - 0.5);
      const y0 = sag(t);
      parts.push(
        limb(
          [
            [px, y0 + Math.sin(a) * rr * 0.3, Math.cos(a) * rr * 0.3],
            [px + (r2() - 0.5) * 0.35, y0 + Math.sin(a) * out, Math.cos(a) * out],
          ],
          rr * 0.32,
          rr * 0.14,
          { radial: 5, segs: 1, vScale: 0.9 },
        ),
      );
    }
    return merge(parts);
  }

  /**
   * The round at the butt of a log. A tapered tube is open at both ends, so
   * without this the biggest deadwood in the frame has a hole through it — and
   * end grain is the one face of a log a viewer can name on sight.
   */
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
    // just inside the opening, and never square to the axis
    g.translate(len * 0.5 - r0 * 0.1, 0, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) + (pos.getY(i) * 0.16 + pos.getZ(i) * 0.1));
    g.computeVertexNormals();
    return g;
  }

  /** Moss shell over the upper face of a log, whose axis runs along X. */
  function mossCapGeo(len, r0, r1) {
    const capLen = len * 0.88;
    const g = new THREE.CylinderGeometry(r1 * 1.1, r0 * 1.1, capLen, 9, 3, true, Math.PI * 0.16, Math.PI * 0.68);
    g.rotateZ(Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.6, uv.getY(i) * capLen * 0.4);
    g.computeVertexNormals();
    return g;
  }

  // Five sizes rather than three, because the corridor rule sorts deadwood by
  // length and the two ends of that sort are what the frames need: bucked rounds
  // and limb wood for the verge the beauty cameras sit in, whole stems for the
  // timber behind it. A trail that has been cleared has both.
  const logProtos = [
    { len: 7.2, r0: 0.34, r1: 0.22, seed: 9601, count: 30 },
    { len: 5.0, r0: 0.26, r1: 0.16, seed: 9703, count: 30 },
    { len: 9.5, r0: 0.44, r1: 0.26, seed: 9803, count: 19 },
    { len: 2.3, r0: 0.31, r1: 0.27, seed: 9907, count: 34 },
    { len: 1.9, r0: 0.1, r1: 0.06, seed: 10009, count: 44 },
  ];
  logProtos.forEach((L, i) => {
    const count = Math.round(L.count * ug);
    const geo = windWeight(logGeo(L.seed, L.len, L.r0, L.r1), () => 0);
    const cap = windWeight(mossCapGeo(L.len, L.r0, L.r1), () => 0);
    const end = windWeight(logEndGeo(L.seed, L.len, L.r0), () => 0);
    const logs = new THREE.InstancedMesh(geo, barkMats.log, count);
    const caps = new THREE.InstancedMesh(cap, mossMat, count);
    const ends = new THREE.InstancedMesh(end, barkMats.endGrain, count);
    logs.name = `log_${i}`;
    caps.name = `logMoss_${i}`;
    ends.name = `logEnd_${i}`;
    logs.castShadow = true;
    logs.receiveShadow = true;
    caps.castShadow = false;
    caps.receiveShadow = true;
    ends.castShadow = false;
    ends.receiveShadow = true;
    let n = 0;
    let m = 0;
    let tries = 0;
    while (n < count && tries < count * 90) {
      tries++;
      let x;
      let z;
      // limb wood and bucked rounds are verge furniture; whole stems mostly are
      // not, so they draw fewer of their candidates from the corridor band
      if (rnd() < (i >= 3 ? 0.82 : 0.45)) {
        vergePoint(_pos);
        x = _pos.x;
        z = _pos.z;
      } else {
        x = (rnd() - 0.5) * span * 1.5;
        z = (rnd() - 0.5) * span * 1.5;
      }
      if (Math.abs(x) > span || Math.abs(z) > span) continue;
      const d = terrain.roadDistance(x, z);
      if (d < DEAD_MIN) continue;
      const s = 0.8 + rnd() * 0.55;
      // How much log the corridor tolerates at this distance. Inside CLEAR only
      // bucked lengths; a full stem needs to be well out in the timber. Length
      // is fitted to the allowance rather than rejected against it, so the near
      // verge keeps its deadwood and the long stems simply end up further out.
      const allow = Math.min(d < DEAD_CLEAR ? DEAD_SHORT : d < DEAD_ALIGN ? 7.5 : 15.0, camAllow(x, z));
      // length varies independently of girth, so three log prototypes cover a
      // much wider range of fallen wood than three sizes would
      let ls = 0.66 + rnd() * 0.72;
      ls = Math.min(ls, allow / (L.len * s));
      if (ls < 0.42) continue;
      const world = L.len * s * ls;
      // Near the trail anything with mass to it lies along the trail, either way
      // round, within a few degrees: the pieces beside a used track were rolled
      // clear, they did not land there. Limb wood is too small to read as a
      // direction and stays random, or the verge comes out combed.
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
      const v = 0.7 + rnd() * 0.45;
      _col.setRGB(v, v * 0.98, v * 0.93);
      logs.setColorAt(n, _col);
      _col.setRGB(v * 1.04, v * 0.99, v * 0.9);
      ends.setColorAt(n, _col);
      // most fallen wood in this forest is mossed over; some is fresh, and dry
      // limb wood mostly is not
      if (rnd() < (i === 4 ? 0.22 : 0.72)) {
        _euler.set(0, 0, 0);
        _m4.compose(_pos, _quat, _scl);
        caps.setMatrixAt(m, _m4);
        const mv = 0.7 + rnd() * 0.5;
        _col.setRGB(mv * 0.96, mv, mv * 0.86);
        caps.setColorAt(m, _col);
        m++;
      }
      n++;
    }
    logs.count = n;
    caps.count = m;
    ends.count = n;
    logs.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    ends.instanceMatrix.needsUpdate = true;
    if (logs.instanceColor) logs.instanceColor.needsUpdate = true;
    if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
    if (ends.instanceColor) ends.instanceColor.needsUpdate = true;
    group.add(logs, ends);
    if (m > 0) group.add(caps);
  });

  // stumps: sawn, and snapped with a jagged crown
  function stumpGeo(seed, r, h, jagged) {
    const g = trunkGeo({
      height: h,
      baseR: r,
      tipR: r * 0.82,
      radial: 10,
      segs: 5,
      flare: 1.9,
      taper: 0.6,
      seed,
      uRepeat: 2,
      vScale: 0.34,
    });
    if (jagged) {
      const pos = g.attributes.position;
      const r2 = mulberry32(seed + 5);
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) > h * 0.82) pos.setY(i, pos.getY(i) + (r2() - 0.35) * h * 0.55);
      }
      g.computeVertexNormals();
    }
    const parts = [g];
    const r2 = mulberry32(seed + 9);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + r2();
      const rr = r * (1.8 + r2() * 1.6);
      parts.push(
        limb(
          [
            [Math.cos(a) * r * 0.6, h * 0.4, Math.sin(a) * r * 0.6],
            [Math.cos(a) * rr, -r * 0.5, Math.sin(a) * rr],
          ],
          r * 0.4,
          r * 0.08,
          { radial: 5, segs: 2, vScale: 0.4 },
        ),
      );
    }
    return windWeight(merge(parts), () => 0);
  }

  // A sawn stump at the verge is the trail's own story and wants to stay close;
  // a two-metre snapped spar in the same place is a post in the middle of the
  // frame, so it goes out past the beauty camera band with the long logs.
  // `minCam` is the same rule as camAllow but expressed as a radius, because a
  // stump has a height rather than a length and cannot lie across anything.
  const stumpSet = [
    { geo: stumpGeo(9901, 0.55, 0.8, false), mat: barkMats.fir, count: Math.round(22 * ug), minRoad: 4.0, minCam: 0 },
    { geo: stumpGeo(10007, 0.7, 1.5, true), mat: barkMats.dead, count: Math.round(17 * ug), minRoad: 7.2, minCam: 13 },
    { geo: stumpGeo(10103, 0.42, 0.55, true), mat: barkMats.hemlock, count: Math.round(26 * ug), minRoad: 3.6, minCam: 0 },
  ];
  stumpSet.forEach(({ geo, mat, count, minRoad, minCam }, i) => {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.name = `stump_${i}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    let n = 0;
    let tries = 0;
    while (n < count && tries < count * 50) {
      tries++;
      const x = (rnd() - 0.5) * span * 1.4;
      const z = (rnd() - 0.5) * span * 1.4;
      const d = terrain.roadDistance(x, z);
      if (d < minRoad) continue;
      const dc = camDist(x, z);
      if (dc < minCam) continue;
      // shrunk in the beauty foreground as well as at the rut edge: what makes a
      // stump read as scenery rather than as a bollard is how much frame it takes
      const s = (0.7 + rnd() * 0.8) * (d < DEAD_CLEAR ? 0.7 : 1) * (dc < 11 ? 0.72 : 1);
      groundQuat(x, z, _quat, 0.4);
      _quat.multiply(_spin.setFromEuler(_euler.set((rnd() - 0.5) * 0.18, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.18)));
      _pos.set(x, terrain.heightAt(x, z) - 0.14 * s, z);
      _scl.set(s, s * (0.8 + rnd() * 0.5), s);
      _m4.compose(_pos, _quat, _scl);
      mesh.setMatrixAt(n, _m4);
      const v = 0.72 + rnd() * 0.45;
      _col.setRGB(v, v * 0.98, v * 0.94);
      mesh.setColorAt(n, _col);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  });

  // --- horizon: ground skirt, treeline rings, back ridges -------------------
  //
  // The terrain mesh is a 300 m square, so without this the world visibly ends
  // in mid air. The skirt is a square annulus whose inner edge sits exactly on
  // the terrain boundary and which uses the same height function, so the two
  // are continuous; it then rolls out to where the fog is fully opaque.
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

  // Four staged bands rather than one silhouette, each shorter and hazier than
  // the one in front. Height falls with distance on purpose: past about 150 m
  // fog owns 60% of the pixel and nothing can be darker than the haze, so a
  // tall far band can only ever read as a bright spike against the darker upper
  // sky. Keeping the far bands low leaves the tall shapes to the near forest.
  const RINGS = [
    { r: terrain.size * 0.53, h: [17, 27], mat: 0, cards: 44, drop: 2.2 },
    { r: terrain.size * 0.68, h: [15, 24], mat: 1, cards: 52, drop: 3.4 },
    { r: terrain.size * 0.86, h: [13, 21], mat: 2, cards: 58, drop: 5.0 },
    { r: terrain.size * 1.06, h: [11, 18], mat: 3, cards: 64, drop: 7.0 },
  ];
  RINGS.forEach((ring, ri) => {
    const parts = [];
    for (let i = 0; i < ring.cards; i++) {
      const a = (i / ring.cards) * Math.PI * 2 + (rnd() - 0.5) * 0.02;
      const chord = 2 * ring.r * Math.sin(Math.PI / ring.cards) * 1.12;
      const h = lerp(ring.h[0], ring.h[1], rnd());
      const w = Math.max(chord, h * 1.4);
      const g = new THREE.PlaneGeometry(w, h, 1, 1);
      // Each card samples its own window of the strip instead of all of them
      // stretching the whole texture, which is what made the ring findable: with
      // a 1024 px strip and a 0.3 window there are effectively fifty different
      // treelines, mirrored, on top of a per-card height.
      const u0 = rnd();
      const uw = 0.26 + rnd() * 0.1;
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
      const y = terrain.heightAt(x, z) - h * 0.05 - ring.drop;
      g.translate(x, y, z);
      parts.push(g);
    }
    const mesh = new THREE.Mesh(merge(parts), treelineMats[ring.mat]);
    mesh.name = `treeline_${ri}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    // furthest band first, so the blended strips stack back to front
    mesh.renderOrder = -820 + ri;
    group.add(mesh);
  });

  // faint ridge shapes showing through the mist behind everything else
  [0, 1].forEach((k) => {
    const r = 560 + k * 130;
    const cards = 18;
    const parts = [];
    for (let i = 0; i < cards; i++) {
      const a = (i / cards) * Math.PI * 2;
      const chord = 2 * r * Math.sin(Math.PI / cards) * 1.12;
      const h = 56 + k * 26;
      const g = new THREE.PlaneGeometry(chord, h, 1, 1);
      const u0 = rnd();
      const uw = 0.3 + rnd() * 0.12;
      const flip = rnd() < 0.5;
      const uv = g.attributes.uv;
      for (let q = 0; q < uv.count; q++) {
        const t = flip ? 1 - uv.getX(q) : uv.getX(q);
        uv.setX(q, u0 + t * uw);
      }
      g.translate(0, h * 0.42, 0);
      g.rotateY(-a - Math.PI / 2);
      g.translate(Math.cos(a) * r, -8 - k * 10, Math.sin(a) * r);
      parts.push(g);
    }
    const mesh = new THREE.Mesh(merge(parts), ridgeMats[k]);
    mesh.name = `ridge_${k}`;
    mesh.renderOrder = -900 + k;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    group.add(mesh);
  });

  // --- wiring --------------------------------------------------------------
  const allMats = [
    ...Object.values(barkMats),
    needleMat,
    leafMat,
    fernMat,
    grassMat,
    shrubMat,
    stalkMat,
    understoryMat,
    litterMat,
    billboardMat,
    rockMat,
    mossMat,
    skirtMat,
  ];
  if (env) for (const m of allMats) m.envMap = env;
  const windMats = allMats.filter((m) => m.userData.wind);
  group.traverse((o) => {
    if ((o.isMesh || o.isInstancedMesh) && o.material?.userData?.foliage) skipAoPrepass(o);
  });

  return {
    group,
    materials: { barkMats, needleMat, leafMat, fernMat, grassMat, shrubMat, stalkMat, understoryMat, litterMat, billboardMat, rockMat, mossMat, skirtMat },
    stats: { nearTrees: nearPlaced, farTrees: farPlaced, protos: protos.length, sites: ugSites.length, ...ugCounts },
    update(t) {
      for (const m of windMats) m.userData.wind.uTime.value = t;
    },
  };
}
