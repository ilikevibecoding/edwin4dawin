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
  farGroundMaps,
  fernAtlas,
  grassAtlas,
  leafAtlas,
  litterAtlas,
  mossMaps,
  needleAtlas,
  ridgeTexture,
  rockMaps,
  shrubAtlas,
  treeBillboardAtlas,
  treelineTexture,
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
  const w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) w[i] = clamp(fn(pos.getX(i), pos.getY(i), pos.getZ(i)));
  geo.setAttribute('aShade', new THREE.BufferAttribute(w, 1));
  return geo;
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
 */
function barkMaterial(maps, { moss = PALETTE.moss, mossMax = 0.9, mossHeight = 6.0, windAmp = 0.07, windSpeed = 0.6, normalScale = 1.4 } = {}) {
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
    uHazeCol: { value: linear(0x40352a) },
    uHaze: { value: 0.9 },
    uHazeNear: { value: 18 },
    uHazeFar: { value: 46 },
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
        varying float vTreeY;
        varying vec2 vBarkUv;
        varying vec3 vBarkWPos;`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `{
          vec3 wN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
          float shade = 1.0 - saturate( dot( wN, uSunDir ) * 0.5 + 0.5 );
          float low = 1.0 - smoothstep( 0.4, uMossHeight, vTreeY );
          float mask = texture2D( uMossMask, vBarkUv ).g;
          float moss = saturate( mask * uMossMax * low * ( 0.18 + 0.82 * shade ) );
          diffuseColor.rgb = mix( diffuseColor.rgb, uMossColor * ( 0.55 + mask * 0.85 ), moss );
          roughnessFactor = mix( roughnessFactor, 0.97, moss * 0.8 );
          diffuseColor.rgb *= mix( 1.0, 0.68, ( 1.0 - smoothstep( 0.0, 1.6, vTreeY ) ) * 0.9 );
          // A trunk is a cylinder in a room full of other trunks: the flank
          // facing away from the sun sees canopy, not sky. Without this the
          // shaded side takes its whole value off the environment and the near
          // bark reads as a pale grey pole with no round to it.
          diffuseColor.rgb *= mix( 0.42, 1.04, saturate( dot( wN, uSunDir ) * 0.62 + 0.44 ) );
        }
        #include <lights_physical_fragment>`,
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
const FOLIAGE_SKY = new THREE.Color(0.94, 1.2, 1.3);
const FOLIAGE_GND = new THREE.Color(0.46, 0.4, 0.22);

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
      ? `${target}
	float dotNLWrap = saturate( ( dot( geometryNormal, directLight.direction ) + uWrap ) / ( 1.0 + uWrap ) )
		* uDirect * ( 1.0 - uShade * vShade * 0.62 );`
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
  trans = 0.8,
  rough = 0.9,
  windAmp = 0.2,
  windSpeed = 1.0,
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
  hazeCol = 0x4b3e32,
  hazeRim = [0.075, 0.058, 0.032],
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
  });
  const u = {
    uSunDir: { value: SUN_DIR },
    // Not the raw low sun. A leaf transmits green and yellow and absorbs the
    // rest, so backlight through one arrives green-gold; feeding the shader the
    // undiluted 0xff9d52 pushed red past green and every clump went lime.
    uSunTint: { value: new THREE.Color(1.0, 0.78, 0.42) },
    uTrans: { value: trans },
    uSky: { value: FOLIAGE_SKY.clone().multiplyScalar(sky) },
    uGnd: { value: FOLIAGE_GND.clone().multiplyScalar(sky) },
    uWrap: { value: wrap },
    uDirect: { value: direct },
    uShade: { value: shade },
    uHaze: { value: haze },
    uHazeCol: { value: linear(hazeCol) },
    uRim: { value: new THREE.Color(...hazeRim) },
    uHazeNear: { value: hazeRange[0] },
    uHazeFar: { value: hazeRange[1] },
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
        uniform vec3 uRim;
        uniform float uTrans;
        uniform float uWrap;
        uniform float uDirect;
        uniform float uShade;
        uniform float uHaze;
        uniform float uHazeNear;
        uniform float uHazeFar;
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
          vec2 duv = vec2( length( vec2( dFdx( vMapUv.x ), dFdy( vMapUv.x ) ) ),
                           length( vec2( dFdx( vMapUv.y ), dFdy( vMapUv.y ) ) ) );
          float lod = log2( max( max( duv.x, duv.y ) * 1024.0, 1.0 ) );
          diffuseColor.a = saturate( diffuseColor.a * ( 1.0 + clamp( lod, 0.0, 5.0 ) * 0.26 ) );
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
          reflectedLight.indirectDiffuse += diffuseColor.rgb * mix( uGnd, uSky, wN.y * 0.5 + 0.5 ) * open;
          // thin-leaf transmission: a broad forward lobe, since leaves scatter
          // over a far wider angle than a cubic falloff allows
          vec3 fV = normalize( vWPos - cameraPosition );
          float back = pow( saturate( dot( fV, uSunDir ) ), 1.4 );
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
          vec3 haze = uHazeCol + uRim * pow( saturate( wNh.y ), 2.0 );
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
function spray(len, wid, tile, { origin, angle, droop = 0.5, r0 = 0, roll = 0, bow = 0.2, segs = [2, 2] }) {
  const g = foliageCard(len, wid, tile, { bow, segs, bowAxis: 'x' });
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
function upright(w, h, tile, { origin, angle, face = null, r0 = 0, tilt = 0, bow = 0.2, segs = [1, 2] }) {
  const g = foliageCard(w, h, tile, { bow, segs });
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
  { name: 'maple', tiles: [0, 0, 0, 1], bark: 'fir', height: [11, 16], trunk: 0.027, crownStart: 0.28, crownR: 0.32, clumps: 22, perClump: 7, leafScale: 0.2 },
  { name: 'alder', tiles: [1, 1, 1, 0], bark: 'birch', height: [12, 18], trunk: 0.017, crownStart: 0.34, crownR: 0.24, clumps: 22, perClump: 7, leafScale: 0.19 },
  // one card in four is turning: a tree fully in autumn colour reads as a hot
  // orange blob in a scene this desaturated
  { name: 'turning', tiles: [2, 0, 0, 0], bark: 'fir', height: [9, 14], trunk: 0.029, crownStart: 0.26, crownR: 0.35, clumps: 20, perClump: 6, leafScale: 0.22 },
  { name: 'vine', tiles: [0, 1, 0, 1], bark: 'birch', height: [4.5, 7.5], trunk: 0.034, crownStart: 0.2, crownR: 0.42, clumps: 15, perClump: 5, leafScale: 0.26 },
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
  const tiers = spec.tiers;
  for (let k = 0; k < tiers; k++) {
    const u = k / (tiers - 1);
    const t = spec.crownStart + u * (1 - spec.crownStart);
    const y = t * height;
    const [ax, az] = axis(t);
    // A conifer is a full cone, not a needle. At 0.86 the profile lost three
    // quarters of its width by mid-crown, so everything above that was a spire
    // a metre wide and a tree at a hundred metres read as a flat-topped pole.
    const prof = Math.pow(1 - u, 0.56) * lerp(0.58, 1.0, smoothstep(0, 0.2, u));
    const R = maxR * prof * (0.74 + rnd() * 0.5);
    if (R < maxR * 0.05) continue;
    // a thin crown is the single worst failure here: bright fog reads straight
    // through the gaps and the tree turns into a pale stick
    const outer = R > maxR * 0.34 ? 5 : 4;
    const base = k * 2.399 + rnd() * 0.8;
    const tierDroop = spec.droop;

    for (let j = 0; j < outer; j++) {
      const a = base + (j / outer) * Math.PI * 2 + (rnd() - 0.5) * 0.55;
      const len = R * (0.92 + rnd() * 0.42);
      const wid = len * spec.aspect * (0.82 + rnd() * 0.44);
      const droop = tierDroop * (0.6 + rnd() * 0.85);
      cards.push(
        spray(len, wid, pick(spec.tiles, rnd), {
          origin: [ax, y + (rnd() - 0.5) * 0.3, az],
          angle: a,
          droop,
          r0: R * 0.05,
          roll: (rnd() - 0.5) * 0.55,
          bow: 0.16 + rnd() * 0.24,
        }),
      );
      // a shorter spray shingled above fills the gap between tiers
      if (rnd() < 0.92) {
        cards.push(
          spray(len * (0.5 + rnd() * 0.25), wid * 0.82, pick(spec.tiles, rnd), {
            origin: [ax, y + 0.3 + rnd() * 0.45, az],
            angle: a + (rnd() - 0.5) * 0.7,
            droop: droop * 0.45,
            r0: R * 0.12,
            roll: (rnd() - 0.5) * 0.8,
            bow: 0.24,
            segs: [1, 1],
          }),
        );
      }
    }

    // Mass through the crown, spread from the bole out to the rim rather than
    // packed against the trunk. The tier sprays are near-horizontal, so from a
    // hundred metres — where the eye is within ten degrees of their own plane —
    // they carry almost no silhouette, and these are what give the crown its
    // width at distance. Facing is random rather than radial for the same
    // reason: a radial card is edge-on precisely at the crown's outline.
    const inner = Math.max(3, Math.round(3.6 * spec.fill));
    for (let j = 0; j < inner; j++) {
      const a = base + rnd() * Math.PI * 2;
      const out = (j + rnd() * 0.7) / inner;
      const s = R * (0.42 + rnd() * 0.34) * (1 - out * 0.26) + 0.3;
      cards.push(
        upright(s * 1.32, s * 1.5, pick(spec.tiles, rnd), {
          origin: [ax, y - 0.25 + (rnd() - 0.5) * 0.35, az],
          angle: a,
          face: rnd() * Math.PI * 2,
          r0: R * (0.14 + out * 0.7),
          tilt: (rnd() - 0.5) * 0.3,
          bow: 0.2,
          segs: [1, 1],
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
      cards.push(
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
  const foliage = shellNormals(merge(cards), {
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
    return (1 - clamp(rn) * 0.86) * (1 - t * 0.34);
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
      radial: 8,
      segs: 8,
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
        { radial: 6, segs: 4, vScale: 0.4 },
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
    for (let j = 0; j < spec.perClump; j++) {
      const ja = rnd() * Math.PI * 2;
      const jr = cs * 0.24 * Math.sqrt(rnd());
      const size = cs * (0.6 + rnd() * 0.55);
      const ox = cx + Math.cos(ja) * jr;
      const oz = cz + Math.sin(ja) * jr;
      const oy = cy + (rnd() - 0.5) * cs * 0.4;
      // two in five stand up and face freely: a crown of sprays alone has no
      // silhouette from thirty metres out, where the eye is nearly in their plane
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
  const foliage = shellNormals(merge(cards), { mode: 'sphere', centre: crownCentre, blend: 0.78 });
  windWeight(foliage, (x, y, z) => clamp(0.4 + Math.hypot(x - crownCentre[0], z - crownCentre[2]) * 0.09));
  shadeWeight(foliage, (x, y, z) => {
    const rn = Math.hypot(x - crownCentre[0], (y - crownCentre[1]) * 0.8, z - crownCentre[2]) / maxR;
    return (1 - clamp(rn) * 0.88) * (1.02 - clamp((y - trunkH) / (height - trunkH)) * 0.3);
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
function plantClump(w, h, tiles, { seed = 1, planes = 3, bow = 0.3, segs = [1, 2], spread = 0.18, shell = 0.5, lean = 0.34 } = {}) {
  const rnd = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < planes; i++) {
    // golden-angle rather than even spacing: evenly fanned planes line up into
    // a star when the plant is seen from above, which the wheel view does
    const a = i * 2.399 + rnd() * 0.5;
    const t = i / Math.max(1, planes - 1);
    const sw = w * (0.6 + rnd() * 0.62);
    const sh = h * (0.56 + (1 - t) * 0.34 + rnd() * 0.5);
    const g = foliageCard(sw, sh, tiles[i % tiles.length], { bow: bow * (0.7 + rnd() * 0.8), segs, mirror: rnd() < 0.5 });
    g.translate(0, sh * 0.5, 0);
    g.rotateZ((rnd() - 0.5) * lean);
    g.rotateX((rnd() - 0.5) * 0.34);
    g.rotateY(a);
    const rr = (0.18 + t * 0.82) * spread * w;
    g.translate(Math.cos(a * 1.7) * rr + (rnd() - 0.5) * w * 0.12, -h * 0.03 - t * h * 0.04, Math.sin(a * 1.7) * rr + (rnd() - 0.5) * w * 0.12);
    parts.push(g);
  }
  const geo = shellNormals(merge(parts), { mode: 'dome', centre: [0, h * 0.2, 0], blend: shell, up: h * 0.5 });
  windWeight(geo, (x, y) => clamp(y / h) * 1.0);
  return shadeWeight(geo, (x, y, z) => 0.98 - clamp(y / h) * 0.78 - Math.hypot(x, z) / (w * 0.75) * 0.22);
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
  };
  // The geometry band follows the road corridor, so looking along the road these
  // same trees recede to 140 m — they *are* the distance in every beauty frame,
  // and the far billboards and treeline rings sit off to the sides where the
  // camera never sees them. So the aerial ramp has to bite here, and early:
  // by 90 m a crown has to be at about two thirds of the sky it is seen against.
  const needleMat = foliageMaterial(needleAtlas(), {
    alphaTest: 0.26,
    trans: 0.55,
    windAmp: 0.19,
    wrap: 0.62,
    direct: 0.78,
    sky: 1.0,
    shade: 0.6,
    haze: 0.9,
    hazeRange: [20, 55],
  });
  const leafMat = foliageMaterial(leafAtlas(), {
    alphaTest: 0.34,
    trans: 0.8,
    windAmp: 0.24,
    wrap: 0.58,
    direct: 0.8,
    sky: 0.96,
    shade: 0.56,
    haze: 0.9,
    hazeRange: [20, 55],
  });
  // Undergrowth lives in canopy shade, so it has to sit *under* the sunlit dirt
  // it grows out of. Above it, the clumps read as lit objects lying on the ground
  // rather than as plants growing in shade.
  const fernMat = foliageMaterial(fernAtlas(), { alphaTest: 0.3, trans: 0.9, windAmp: 0.12, windSpeed: 1.35, direct: 0.74, sky: 0.94, shade: 0.6, wrap: 0.66, haze: 0.72, hazeRange: [26, 62] });
  const grassMat = foliageMaterial(grassAtlas(), { alphaTest: 0.26, trans: 0.95, windAmp: 0.09, windSpeed: 1.7, direct: 0.76, sky: 0.94, shade: 0.5, wrap: 0.7, haze: 0.72, hazeRange: [26, 62] });
  const shrubMat = foliageMaterial(shrubAtlas(), { alphaTest: 0.32, trans: 0.8, windAmp: 0.1, windSpeed: 1.4, direct: 0.74, sky: 0.92, shade: 0.58, wrap: 0.64, haze: 0.72, hazeRange: [26, 62] });
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
    tint: 0x8e9584,
    env: 0.16,
    wrap: 0.95,
    direct: 0.28,
    sky: 0.78,
    shade: 0.5,
    haze: 0.94,
    hazeCol: 0x453a2d,
    hazeRange: [24, 46],
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
  const TREELINE_TINT = [0x6e7a6b, 0x7d8880, 0x8b948f, 0x99a09c];
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
      // trunk tint only ever darkens; brightening it is what made the bark read
      // as a pale pole against the canopy
      const tv = 0.31 + (p.v - 0.7) * 0.36;
      _col.setRGB(tv * (1 + p.warm * 0.3), tv * (0.97 + p.warm * 0.04), tv * (0.88 - p.warm * 0.25));
      trunkMesh.setColorAt(j, _col);
      if (foliMesh) {
        foliMesh.setMatrixAt(j, _m4);
        // value held close to one and the spread put into hue instead: a stand
        // whose members differ in green reads as species, one whose members
        // differ in brightness reads as a lighting bug
        const fv = 0.84 + (p.v - 0.7) * 0.42;
        _col.setRGB(fv * (1 + p.warm * 0.78), fv * (1 + p.warm * 0.1), fv * (0.9 - p.warm * 0.9));
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
      _col.setRGB(p.v * (1 + p.warm * 0.5), p.v * (1 + p.warm * 0.06), p.v * (0.96 - p.warm * 0.55));
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
  const fernGeos = [
    plantClump(1.0, 1.02, [0, 0, 1, 2], { seed: 7001, planes: 6, spread: 0.3 }),
    plantClump(0.86, 1.14, [0, 2, 0, 1], { seed: 7013, planes: 6, spread: 0.26 }),
    plantClump(1.16, 0.98, [1, 1, 0, 2], { seed: 7027, planes: 5, spread: 0.34 }),
    plantClump(0.9, 1.06, [2, 0, 3, 1], { seed: 7039, planes: 6, spread: 0.27 }),
    plantClump(1.02, 0.94, [3, 1, 0, 0], { seed: 7051, planes: 5, spread: 0.32 }),
  ];
  // grass is authored as patches rather than single tufts: one card has fifty
  // blades in it, so a patch covers ground a tuft never could
  // Three standing tufts and two low mats. All five the same proportion is what
  // turned the verge into a field of identical rosettes: the variety the eye
  // actually reads at ten metres is height, not blade shape.
  const grassGeos = [
    plantClump(1.0, 0.78, [0, 1, 0, 1], { seed: 7101, planes: 4, spread: 0.4, bow: 0.2 }),
    plantClump(0.86, 0.92, [1, 3, 1, 0], { seed: 7113, planes: 4, spread: 0.34, bow: 0.22 }),
    plantClump(1.28, 0.44, [2, 0, 2, 1], { seed: 7127, planes: 4, spread: 0.52, bow: 0.18, lean: 0.6 }),
    plantClump(0.94, 0.84, [3, 2, 1, 0], { seed: 7139, planes: 4, spread: 0.38, bow: 0.22 }),
    plantClump(1.14, 0.36, [0, 2, 3, 1], { seed: 7151, planes: 3, spread: 0.5, bow: 0.2, lean: 0.7 }),
  ];
  const shrubGeos = [
    plantClump(1.3, 1.0, [0, 1, 0, 2], { seed: 7201, planes: 5, spread: 0.32 }),
    plantClump(1.1, 0.85, [1, 3, 0, 1], { seed: 7213, planes: 5, spread: 0.3 }),
    plantClump(1.6, 1.15, [0, 2, 1, 3], { seed: 7227, planes: 6, spread: 0.36 }),
  ];
  // small: a flat card this size seen from a low camera is a hard horizontal bar
  // lying across the dirt, and a big one is a painted oval
  const litterGeos = [groundCard(1.0, 0), groundCard(1.15, 1), groundCard(0.9, 2), groundCard(0.8, 3)];
  const hummockGeo = (() => {
    const g = new THREE.SphereGeometry(0.5, 9, 4, 0, Math.PI * 2, 0, Math.PI * 0.56);
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
      y: terrain.heightAt(x, z),
      nx: terrain.heightAt(x - e, z) - terrain.heightAt(x + e, z),
      ny: 2 * e,
      nz: terrain.heightAt(x, z - e) - terrain.heightAt(x, z + e),
    });
  });

  /**
   * Scatter one prototype set over the shared grid. `per` is instances per
   * site, so it can exceed one; the grid rather than rejection sampling is
   * what guarantees there are no bare patches.
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
    // How much smaller a clump gets right at the rut edge. The low beauty
    // cameras sit about 2.5 m off the centreline, so a full-size clump at the
    // verge fills the lens with one plane; a trampled one does not.
    shrink = 0.55,
    shrinkOver = 4.0,
    name = 'plants',
  }) {
    const perGeo = geos.map(() => []);
    for (const s of ugSites) {
      if (s.d < minRoad || s.d > maxRoad) continue;
      // the falloff has to reach well past the verge: the camera spends most of
      // its time looking across the 10-25 m band, not down at its feet
      let p = per * (1 + boost * (1 - smoothstep(16, 48, s.d)));
      while (p > 0) {
        if (p < 1 && rnd() > p) break;
        perGeo[Math.floor(rnd() * geos.length) % geos.length].push(s);
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
        const s =
          (scale[0] + rnd() * (scale[1] - scale[0])) *
          lerp(shrink, 1, smoothstep(minRoad, minRoad + shrinkOver, p.d));
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
        const v = tint[0] + rnd() * tint[1];
        const warm = (rnd() - 0.5) * 0.5;
        _col.setRGB(v * (0.79 + warm * 0.34), v * (1.0 - warm * 0.06), v * (0.8 - warm * 0.44));
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
  ugCounts.litter = scatterPlants(litterGeos, litterMat, {
    per: 0.62 * ug,
    boost: 0.7,
    minRoad: 1.5,
    scale: [0.7, 1.35],
    lean: 0.95,
    yOff: 0.02,
    jitter: 1.6,
    tint: [0.5, 0.2],
    name: 'litter',
  });
  // A driven two-track has bare compacted ruts and only a thin verge: grass
  // right at the rut edge also parks a 0.6 m card directly in front of the low
  // beauty cameras, which buries the subject.
  ugCounts.grass = scatterPlants(grassGeos, grassMat, {
    per: 1.75 * ug,
    boost: 1.5,
    minRoad: 4.2,
    scale: [0.6, 1.15],
    lean: 0.6,
    jitter: 1.7,
    tint: [0.58, 0.26],
    shrink: 0.6,
    name: 'grass',
  });
  ugCounts.fern = scatterPlants(fernGeos, fernMat, {
    per: 0.95 * ug,
    boost: 0.85,
    minRoad: 3.5,
    scale: [0.62, 1.32],
    lean: 0.4,
    jitter: 1.5,
    tint: [0.6, 0.27],
    shrink: 0.44,
    shrinkOver: 5.5,
    name: 'fern',
  });
  ugCounts.shrub = scatterPlants(shrubGeos, shrubMat, {
    per: 0.19 * ug,
    boost: 0.45,
    minRoad: 5.0,
    scale: [0.6, 1.2],
    lean: 0.35,
    jitter: 1.6,
    tint: [0.7, 0.3],
    shrink: 0.5,
    shrinkOver: 5.0,
    name: 'shrub',
  });
  ugCounts.moss = scatterPlants([hummockGeo], mossMat, {
    per: 0.08 * ug,
    minRoad: 4.2,
    scale: [0.7, 2.3],
    lean: 0.85,
    yOff: -0.12,
    jitter: 1.5,
    tint: [0.72, 0.28],
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
  function logGeo(seed, len, r0, r1) {
    const g = trunkGeo({
      height: len,
      baseR: r0,
      tipR: r1,
      radial: 8,
      segs: 7,
      flare: 0.35,
      taper: 0.7,
      seed,
      uRepeat: 2,
      vScale: 0.3,
      bulge: 0.14,
      axis: (t) => [Math.sin(t * 2.1 + seed * 0.01) * len * 0.02, 0],
    });
    g.rotateZ(Math.PI / 2);
    g.translate(len * 0.5, 0, 0);
    return g;
  }
  /** Moss shell over the upper face of a log, whose axis runs along X. */
  function mossCapGeo(len, r0, r1) {
    const capLen = len * 0.88;
    const g = new THREE.CylinderGeometry(r1 * 1.07, r0 * 1.07, capLen, 9, 3, true, Math.PI * 0.16, Math.PI * 0.68);
    g.rotateZ(Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.6, uv.getY(i) * capLen * 0.4);
    g.computeVertexNormals();
    return g;
  }

  const logProtos = [
    { len: 7.2, r0: 0.34, r1: 0.22, seed: 9601 },
    { len: 5.0, r0: 0.26, r1: 0.16, seed: 9703 },
    { len: 9.5, r0: 0.44, r1: 0.26, seed: 9803 },
  ];
  logProtos.forEach((L, i) => {
    const count = Math.round((i === 2 ? 17 : 26) * ug);
    const geo = windWeight(logGeo(L.seed, L.len, L.r0, L.r1), () => 0);
    const cap = windWeight(mossCapGeo(L.len, L.r0, L.r1), () => 0);
    const logs = new THREE.InstancedMesh(geo, barkMats.fir, count);
    const caps = new THREE.InstancedMesh(cap, mossMat, count);
    logs.name = `log_${i}`;
    caps.name = `logMoss_${i}`;
    logs.castShadow = true;
    logs.receiveShadow = true;
    caps.castShadow = false;
    caps.receiveShadow = true;
    let n = 0;
    let m = 0;
    let tries = 0;
    while (n < count && tries < count * 60) {
      tries++;
      const x = (rnd() - 0.5) * span * 1.5;
      const z = (rnd() - 0.5) * span * 1.5;
      if (terrain.roadDistance(x, z) < 4.6) continue;
      const s = 0.8 + rnd() * 0.6;
      // length varies independently of girth, so three log prototypes cover a
      // much wider range of fallen wood than three sizes would
      const ls = 0.7 + rnd() * 0.75;
      const yaw = rnd() * Math.PI * 2;
      groundQuat(x, z, _quat, 0.85);
      _quat.multiply(_spin.setFromEuler(_euler.set((rnd() - 0.5) * 0.24, yaw, (rnd() - 0.5) * 0.1)));
      _pos.set(x, terrain.heightAt(x, z) + L.r0 * s * 0.62, z);
      _scl.set(s * ls, s, s);
      _m4.compose(_pos, _quat, _scl);
      logs.setMatrixAt(n, _m4);
      const v = 0.7 + rnd() * 0.45;
      _col.setRGB(v, v * 0.98, v * 0.93);
      logs.setColorAt(n, _col);
      // most fallen wood in this forest is mossed over; some is fresh
      if (rnd() < 0.72) {
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
    logs.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    if (logs.instanceColor) logs.instanceColor.needsUpdate = true;
    if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
    group.add(logs);
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

  const stumpSet = [
    { geo: stumpGeo(9901, 0.55, 0.8, false), mat: barkMats.fir, count: Math.round(20 * ug) },
    { geo: stumpGeo(10007, 0.7, 1.5, true), mat: barkMats.dead, count: Math.round(17 * ug) },
    { geo: stumpGeo(10103, 0.42, 0.55, true), mat: barkMats.hemlock, count: Math.round(24 * ug) },
  ];
  stumpSet.forEach(({ geo, mat, count }, i) => {
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
      if (terrain.roadDistance(x, z) < 3.8) continue;
      const s = 0.7 + rnd() * 0.8;
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
    materials: { barkMats, needleMat, leafMat, fernMat, grassMat, shrubMat, litterMat, billboardMat, rockMat, mossMat, skirtMat },
    stats: { nearTrees: nearPlaced, farTrees: farPlaced, protos: protos.length, sites: ugSites.length, ...ugCounts },
    update(t) {
      for (const m of windMats) m.userData.wind.uTime.value = t;
    },
  };
}
