import * as THREE from 'three';
import {
  applyBrightwork,
  applyGlassFilm,
  brushedMaps,
  diamondPlateMaps,
  dirtLayers,
  fabricMaps,
  glassRoughness,
  glassTintMap,
  meshAlpha,
  paintBaseMap,
  paintFlakeNormal,
  paintPeelNormal,
  paintRoughness,
  prismNormal,
  reflectedSky,
  reflectorMaps,
  rubberMaps,
  trimMaps,
  vinylMaps,
  wornMetalMaps,
} from '../textures/vehicle.js';
import { cached, canvasTexture, mulberry32 } from '../textures/core.js';

// ---------------------------------------------------------------------------
// The fleet's material library.
//
// Every static piece of every parked vehicle is merged into one mesh per
// material for the whole camp, so a material here has to serve a white ranger
// pickup and an oxide-red supply truck in the same draw call. Two things make
// that work:
//
//   1. vertex colour is the albedo. The paint map is authored neutral and the
//      per-vehicle colour, the chalking of old paint, the rust round a fixing
//      and the dust in a tread void all ride on the `color` attribute;
//   2. the road film is driven by a per-vertex `aWear` attribute rather than by
//      object-space position — the merged mesh lives in world space, so "how
//      far above the ground" and "how close to a wheel" are baked in by the
//      kit while it still knows which vehicle a vertex belongs to. That is also
//      what lets each vehicle carry its own dust and mud level.
//
// Glass is the exception: panes stay under their own vehicle so they can sort
// (userData.sortPieces), and carry their own thin fleet-tuned materials.
// ---------------------------------------------------------------------------

let MATS = null;

const V = (o) => ({ vertexColors: true, ...o });

/**
 * The hero's albedo maps carry their own base colour (a 0x2f3337 plastic, a
 * seat-fabric brown). Here the vertex colour is the albedo, so a map has to be
 * grain only: rescale it to a neutral mean and let the tint do the colouring.
 */
function neutral(tex, key, target = 0.82) {
  return cached(`fleet.neutral.${key}`, () => {
    const src = tex.image?.data;
    if (!src) return tex;
    const n = src.length / 4;
    let sum = 0;
    for (let i = 0; i < src.length; i += 4) sum += src[i] + src[i + 1] + src[i + 2];
    const mean = sum / (n * 3) / 255;
    const k = target / Math.max(0.02, mean);
    const data = new Uint8Array(src.length);
    for (let i = 0; i < src.length; i += 4) {
      data[i] = Math.min(255, src[i] * k);
      data[i + 1] = Math.min(255, src[i + 1] * k);
      data[i + 2] = Math.min(255, src[i + 2] * k);
      data[i + 3] = src[i + 3];
    }
    const out = new THREE.DataTexture(data, tex.image.width, tex.image.height, THREE.RGBAFormat);
    out.colorSpace = tex.colorSpace;
    out.wrapS = tex.wrapS;
    out.wrapT = tex.wrapT;
    out.repeat.copy(tex.repeat);
    out.magFilter = tex.magFilter;
    out.minFilter = tex.minFilter;
    out.generateMipmaps = tex.generateMipmaps;
    out.anisotropy = tex.anisotropy;
    out.needsUpdate = true;
    return out;
  });
}

/**
 * Road film keyed off `aWear` = (reach, height above ground, dust, mud).
 * A condensed cousin of the hero's `applyDirt`: the same three-scale sample of
 * the shared dirt atlas, the same film / spatter / cake layers and the same
 * substrate-relative ceiling, with the reach precomputed per vertex.
 */
function applyFleetDirt(material, { tag, film = 1, spatter = 1, cake = 1, dust = 0x9b8e75, wet = 0x4a3826, dry = 0x7a6746, lift = 2.6 }) {
  const soil = (hex) => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  };
  const u = {
    uFdTex: { value: dirtLayers() },
    uFdDust: { value: soil(dust) },
    uFdWet: { value: soil(wet) },
    uFdDry: { value: soil(dry) },
    uFdFilm: { value: film },
    uFdSpat: { value: spatter },
    uFdCake: { value: cake },
    uFdLift: { value: lift },
  };
  material.userData.fleetDirt = u;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec4 aWear;
        varying vec4 vWear;
        varying vec3 vFdPos;
        varying vec3 vFdNrm;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vWear = aWear;
        vFdPos = position;
        vFdNrm = objectNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uFdTex;
        uniform vec3 uFdDust;
        uniform vec3 uFdWet;
        uniform vec3 uFdDry;
        uniform float uFdFilm;
        uniform float uFdSpat;
        uniform float uFdCake;
        uniform float uFdLift;
        varying vec4 vWear;
        varying vec3 vFdPos;
        varying vec3 vFdNrm;
        float fdFilm = 0.0;
        float fdDrop = 0.0;
        float fdCake = 0.0;
        float fdRelief = 0.0;`,
      )
      // after color_fragment, so the vertex colour tints the paint and not the mud
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 dp = vFdPos;
          vec3 dn = vFdNrm / max( length( vFdNrm ), 1e-4 );
          float up = clamp( dn.y, 0.0, 1.0 );
          float down = clamp( -dn.y, 0.0, 1.0 );
          float reach = clamp( vWear.x, 0.0, 1.0 );
          float hgt = vWear.y;
          float dustAmt = vWear.z;
          float mudAmt = vWear.w;

          float fp = length( fwidth( dp ) ) + 1e-5;
          float lodBig = smoothstep( 0.075, 0.030, fp );
          float lodMid = smoothstep( 0.030, 0.011, fp );
          float lodFine = smoothstep( 0.013, 0.005, fp );

          vec2 uvF = vec2( dp.z * 1.7 + dp.x * 0.35, dp.y * 2.0 );
          vec4 sF = mix( texture2D( uFdTex, uvF ), texture2D( uFdTex, dp.xz * 1.6 + 0.37 ), up * up );
          vec4 sC = texture2D( uFdTex, vec2( dp.z * 0.21 + dp.x * 0.09, dp.y * 0.39 ) - 0.21 );
          float grit = sF.b;
          float crust = sC.a * 0.45 + sF.a * 0.55;
          float blotch = sC.a * 0.7 + sF.a * 0.3;

          // wet spatter: threshold, not opacity
          float dens = clamp( reach * mudAmt * uFdSpat, 0.0, 1.0 );
          float gate = smoothstep( 0.03, 0.17, dens );
          float wob = ( sC.b - 0.5 ) * 0.05;
          float dRamp = smoothstep( 0.04, 0.78, dens );
          float t1 = mix( -0.10, 0.34, dRamp * smoothstep( 0.22, 0.68, sC.a ) ) + wob;
          float t2 = mix( -0.07, 0.26, dRamp * smoothstep( 0.30, 0.78, sC.g ) ) + wob;
          float t3 = mix( -0.06, 0.22, dRamp * smoothstep( 0.34, 0.82, sC.b ) ) - wob;
          float d1 = ( 1.0 - smoothstep( t1, t1 + 0.03, sF.r ) ) * lodBig;
          float d2 = ( 1.0 - smoothstep( t2, t2 + 0.025, sF.g ) ) * lodMid;
          float d3 = ( 1.0 - smoothstep( t3, t3 + 0.018, sF.b ) ) * lodFine;
          fdDrop = clamp( max( d1, max( d2 * 0.94, d3 * 0.78 ) ) * gate, 0.0, 1.0 );

          // caked mud: low, down-facing, and whatever looks back at a tyre
          float low = 0.3 + 0.7 * reach;
          float valance = ( 1.0 - smoothstep( 0.22, 0.62, hgt ) ) * ( 0.3 + 0.7 * down ) * low;
          float ledge = ( 1.0 - smoothstep( 0.18, 0.55, hgt ) ) * up * up * low;
          float pack = clamp( ( reach * ( 0.5 + 0.9 * down ) + valance * 0.9 + ledge * 0.8 ) * mudAmt * uFdCake, 0.0, 1.2 );
          float cut = mix( 1.05, 0.24, clamp( pack, 0.0, 1.0 ) );
          fdCake = smoothstep( cut, cut + 0.16, crust ) * ( 0.55 + 0.45 * grit );
          fdCake = clamp( fdCake * min( 1.0, pack * 1.8 ), 0.0, 0.94 );

          // dry dust film, in patches rather than a veil
          float settle = 0.2 + 0.8 * up * up;
          float wipe = smoothstep( 0.30, 0.62, blotch ) * ( 0.32 + 0.68 * smoothstep( 0.24, 0.7, sF.a ) );
          fdFilm = clamp( settle * ( 0.12 + 0.95 * wipe ) * ( 0.4 + 0.7 * reach ) * dustAmt * uFdFilm, 0.0, 0.85 );

          vec3 dc = diffuseColor.rgb;
          float lum = dot( dc, vec3( 0.2126, 0.7152, 0.0722 ) );
          vec3 veil = mix( dc, vec3( lum ), 0.34 * fdFilm );
          dc = mix( veil, uFdDust * ( 0.6 + 0.5 * blotch ), fdFilm * 0.18 );
          dc = mix( dc, uFdDry * ( 0.66 + 0.55 * grit ), fdCake );
          dc = mix( dc, uFdWet * ( 0.8 + 0.6 * blotch ), fdDrop * 0.85 );
          float dLumB = dot( dc, vec3( 0.2126, 0.7152, 0.0722 ) );
          float dCeil = lum * uFdLift + 0.004;
          dc *= min( 1.0, dCeil / max( dLumB, 1e-5 ) );
          diffuseColor.rgb = max( dc, vec3( 0.0 ) );
          fdRelief = fdCake * ( crust - 0.5 ) * 0.022 + fdDrop * 0.0022;
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix( roughnessFactor, 0.74, fdFilm * 0.5 );
        roughnessFactor = mix( roughnessFactor, 0.95, fdCake );
        roughnessFactor = clamp( mix( roughnessFactor, 0.5, fdDrop * 0.85 ), 0.03, 1.0 );`,
      );
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
          vec3 dGrad = sign( dDet ) * ( dFdx( fdRelief ) * dR1 + dFdy( fdRelief ) * dR2 );
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
          float fdCC = clamp( max( fdCake, fdDrop * 0.85 ) + fdFilm * 0.3, 0.0, 1.0 );
          material.clearcoat = clamp( material.clearcoat * ( 1.0 - fdCC * 0.93 ), 0.0, 1.0 );
          material.clearcoatRoughness = clamp(
            material.clearcoatRoughness + fdFilm * 0.07 + fdDrop * 0.3 + fdCake * 0.5, 0.0, 1.0 );
        #endif`,
      );
    }
  };
  material.customProgramCacheKey = function () {
    return `${prevKey ? prevKey.call(this) : ''}|fleetDirt:${tag}`;
  };
  return material;
}

/**
 * Whip aerials and canvas sway in the vertex shader off `aFlap` = (amplitude,
 * phase). Amplitude is metres at the free end; the bend is weighted by the
 * vertex's own height fraction carried in aWear.y so the root stays put.
 */
function applySway(material, { tag, freq = 1.7 }) {
  const u = { uFleetTime: { value: 0 } };
  material.userData.sway = u;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec2 aFlap;
        uniform float uFleetTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float ph = aFlap.y;
          float t = uFleetTime * ${freq.toFixed(3)} + ph;
          float w = sin( t ) * 0.6 + sin( t * 2.31 + 1.7 ) * 0.3 + sin( t * 0.47 + ph * 3.0 ) * 0.4;
          transformed.x += w * aFlap.x;
          transformed.z += cos( t * 0.83 + ph ) * 0.5 * aFlap.x;
          transformed.y -= abs( w ) * aFlap.x * 0.25;
        }`,
      );
  };
  material.customProgramCacheKey = function () {
    return `${prevKey ? prevKey.call(this) : ''}|sway:${tag}`;
  };
  return material;
}

/** Fine cracks radiating from an impact, drawn once as a pane's emissive film. */
function crackMap() {
  return cached('fleet.crack', () =>
    canvasTexture(256, (ctx, w, h) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const rnd = mulberry32(77);
      const cx = w * 0.62;
      const cy = h * 0.42;
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rnd() * 0.4;
        let x = cx;
        let y = cy;
        let ang = a;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const len = 40 + rnd() * 90;
        for (let s = 0; s < 8; s++) {
          ang += (rnd() - 0.5) * 0.7;
          x += Math.cos(ang) * (len / 8);
          y += Math.sin(ang) * (len / 8);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let r = 8; r < 60; r += 9 + rnd() * 6) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let s = 0; s <= 20; s++) {
          const a = (s / 20) * Math.PI * 2;
          const rr = r * (0.85 + rnd() * 0.3);
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr * 0.8;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    }, { srgb: true, repeat: 1 }),
  );
}

/**
 * Livery atlas: everything drawn on a vehicle rather than moulded into it.
 * Cells are 256 px on a 1024 sheet; `DECALS` names them by uv rectangle.
 */
export const DECALS = {
  ranger: [0, 0, 0.5, 0.125], // "WILDLIFE SERVICE" door text
  rangerStripe: [0, 0.125, 0.5, 0.1875], // green/gold stripe band
  parks: [0.5, 0, 1, 0.125], // "NATIONAL PARKS" tailgate
  tour: [0, 0.1875, 0.5, 0.3125], // safari operator roundel
  plate: [0.5, 0.125, 0.75, 0.1875], // number plate
  plate2: [0.75, 0.125, 1, 0.1875],
  diesel: [0.5, 0.1875, 0.75, 0.3125], // jerry can stencil
  water: [0.75, 0.1875, 1, 0.3125],
  hazard: [0, 0.3125, 0.5, 0.375], // chevron strip
  camp: [0.5, 0.3125, 1, 0.4375], // expedition sponsor block
  unit: [0, 0.375, 0.25, 0.5], // fleet number roundel
  unit2: [0.25, 0.375, 0.5, 0.5],
};

function decalAtlas() {
  return cached('fleet.decals', () =>
    canvasTexture(1024, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cell = (rect) => [rect[0] * w, (1 - rect[3]) * h, (rect[2] - rect[0]) * w, (rect[3] - rect[1]) * h];
      const text = (rect, str, px, color, weight = 'bold', font = 'sans-serif') => {
        const [x, y, cw, ch] = cell(rect);
        ctx.fillStyle = color;
        ctx.font = `${weight} ${px}px ${font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(str, x + cw / 2, y + ch / 2 + px * 0.04);
      };
      // ranger door text
      text(DECALS.ranger, 'WILDLIFE SERVICE', 52, '#e9dfc4');
      // stripe: dark green over gold
      {
        const [x, y, cw, ch] = cell(DECALS.rangerStripe);
        ctx.fillStyle = '#1f4d2a';
        ctx.fillRect(x, y + ch * 0.2, cw, ch * 0.4);
        ctx.fillStyle = '#c9a34a';
        ctx.fillRect(x, y + ch * 0.62, cw, ch * 0.16);
      }
      text(DECALS.parks, 'NATIONAL PARKS', 52, '#e9dfc4');
      // operator roundel
      {
        const [x, y, cw, ch] = cell(DECALS.tour);
        const cx = x + cw / 2;
        const cy = y + ch / 2;
        ctx.fillStyle = '#e4d6b3';
        ctx.beginPath();
        ctx.arc(cx, cy, ch * 0.44, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a3b16';
        ctx.beginPath();
        ctx.arc(cx, cy, ch * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e4d6b3';
        ctx.beginPath();
        ctx.moveTo(cx - ch * 0.26, cy + ch * 0.14);
        ctx.lineTo(cx - ch * 0.08, cy - ch * 0.16);
        ctx.lineTo(cx + ch * 0.04, cy - ch * 0.02);
        ctx.lineTo(cx + ch * 0.13, cy - ch * 0.1);
        ctx.lineTo(cx + ch * 0.26, cy + ch * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e4d6b3';
        ctx.fillText('KILIMA SAFARIS', cx, cy + ch * 0.3);
      }
      for (const [rect, str] of [
        [DECALS.plate, 'KBZ 417T'],
        [DECALS.plate2, 'KCA 902R'],
      ]) {
        const [x, y, cw, ch] = cell(rect);
        ctx.fillStyle = '#e8e2cf';
        ctx.fillRect(x + cw * 0.06, y + ch * 0.2, cw * 0.88, ch * 0.6);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + cw * 0.06, y + ch * 0.2, cw * 0.88, ch * 0.6);
        text(rect, str, 54, '#1c1c1c', '600', 'monospace');
      }
      text(DECALS.diesel, 'DIESEL', 60, '#f0e6cc');
      text(DECALS.water, 'WATER', 60, '#f0e6cc');
      {
        const [x, y, cw, ch] = cell(DECALS.hazard);
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = i % 2 ? '#d9352a' : '#f2f0e6';
          ctx.beginPath();
          ctx.moveTo(x + (i / 8) * cw, y);
          ctx.lineTo(x + ((i + 1) / 8) * cw, y);
          ctx.lineTo(x + ((i + 1) / 8) * cw - ch * 0.5, y + ch);
          ctx.lineTo(x + (i / 8) * cw - ch * 0.5, y + ch);
          ctx.closePath();
          ctx.fill();
        }
      }
      {
        const [x, y, cw, ch] = cell(DECALS.camp);
        ctx.fillStyle = '#e6dcc2';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TRANS-AFRICA', x + cw / 2, y + ch * 0.36);
        ctx.font = '600 30px sans-serif';
        ctx.fillText('OVERLAND EXPEDITION  ·  CAPE TO CAIRO', x + cw / 2, y + ch * 0.72);
      }
      for (const [rect, str] of [
        [DECALS.unit, '07'],
        [DECALS.unit2, '12'],
      ]) {
        const [x, y, cw, ch] = cell(rect);
        ctx.fillStyle = '#efe7d2';
        ctx.beginPath();
        ctx.arc(x + cw / 2, y + ch / 2, ch * 0.42, 0, Math.PI * 2);
        ctx.fill();
        text(rect, str, 120, '#1e2a1f', 'bold');
      }
    }, { srgb: true, repeat: 1 }),
  );
}

export function fleetMaterials(env = null) {
  if (MATS) {
    if (env) for (const m of Object.values(MATS)) if (m && 'envMap' in m) m.envMap = env;
    return MATS;
  }
  const grain = (maps, key, target) => ({ ...maps, map: neutral(maps.map, key, target) });
  const metal = grain(wornMetalMaps(8), 'metal', 0.8);
  const metalB = grain(wornMetalMaps(3), 'metalB', 0.8);
  const brushed = brushedMaps();
  const trim = grain(trimMaps(), 'trim', 0.85);
  const trimSatin = grain(trimMaps('satin'), 'trimSatin', 0.85);
  const rubber = grain(rubberMaps(), 'rubber', 0.85);
  const fabric = grain(fabricMaps(), 'fabric', 0.85);
  const vinyl = grain(vinylMaps('dark'), 'vinyl', 0.85);
  const vinylFaded = grain(vinylMaps('faded'), 'vinylFaded', 0.85);
  const plate = grain(diamondPlateMaps(), 'plate', 0.8);
  const reflect = reflectorMaps();

  const m = {};

  // --- paint ---------------------------------------------------------------
  // Neutral basecoat map: the map carries only the sprayed-panel mottle and
  // the vertex colour supplies the actual colour, so one program covers every
  // livery in the camp.
  const paintOpts = {
    map: paintBaseMap(0xdedede),
    roughnessMap: paintRoughness(),
    normalMap: paintFlakeNormal(),
    normalScale: new THREE.Vector2(0.1, 0.1),
    metalness: 0,
    roughness: 0.36,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    clearcoatNormalMap: paintPeelNormal(),
    clearcoatNormalScale: new THREE.Vector2(0.3, 0.3),
    envMapIntensity: 0.3,
  };
  const bwPaint = {
    strength: 2.5,
    band: 0.78,
    trees: 0.9,
    line: 0.32,
    clearcoat: 'full',
    ccRough: true,
    base: 0.15,
    flat: 0.82,
    ground: 0x3a3129,
    wall: 0x1b2017,
    rim: 0xffeecd,
    ambient: 0.6,
  };
  m.paint = new THREE.MeshPhysicalMaterial(V(paintOpts));
  applyBrightwork(m.paint, { tag: 'fleetPaint', ...bwPaint });
  applyFleetDirt(m.paint, { tag: 'paint' });
  // Chalked paint on the old vehicles: the coat has weathered off, so the
  // reflection is broad and weak and the surface takes dirt more readily.
  m.paintOld = new THREE.MeshPhysicalMaterial(
    V({ ...paintOpts, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.25 }),
  );
  applyBrightwork(m.paintOld, { tag: 'fleetPaintOld', ...bwPaint, strength: 1.4, band: 0.5, flat: 0.9 });
  applyFleetDirt(m.paintOld, { tag: 'paintOld', film: 1.3, cake: 1.2 });

  // --- metals --------------------------------------------------------------
  m.steel = new THREE.MeshStandardMaterial(
    V({
      map: metal.map,
      normalMap: metal.normal,
      roughnessMap: metal.rough,
      normalScale: new THREE.Vector2(0.9, 0.9),
      metalness: 0.35,
      roughness: 0.74,
      envMapIntensity: 0.5,
    }),
  );
  applyBrightwork(m.steel, { tag: 'fleetSteel', strength: 0.6, band: 0.26, trees: 0.6, line: 0.46, fresnel: 0.25, flat: 0.85, sky: 0x9aa29c, ground: 0x342a1f, ambient: 2.0 });
  applyFleetDirt(m.steel, { tag: 'steel', dry: 0x6c5a3c });
  // whip aerials: the same powder coat, swaying
  m.whip = new THREE.MeshStandardMaterial(
    V({ map: metal.map, normalMap: metal.normal, roughnessMap: metal.rough, metalness: 0.3, roughness: 0.7, envMapIntensity: 0.5 }),
  );
  applySway(m.whip, { tag: 'whip', freq: 2.3 });
  m.alu = new THREE.MeshStandardMaterial(
    V({
      metalness: 0.86,
      roughness: 1.0,
      normalMap: brushed.normal,
      roughnessMap: brushed.satin,
      normalScale: new THREE.Vector2(0.6, 0.6),
      envMapIntensity: 0.3,
    }),
  );
  applyBrightwork(m.alu, { tag: 'fleetAlu', strength: 0.62, band: 0.3, trees: 0.7, line: 0.46, flat: 0.9 });
  applyFleetDirt(m.alu, { tag: 'alu', dry: 0x6f6552, film: 0.7, cake: 1.4 });
  m.plate = new THREE.MeshStandardMaterial(
    V({
      map: plate.map,
      normalMap: plate.normal,
      roughnessMap: plate.rough,
      normalScale: new THREE.Vector2(1.0, 1.0),
      metalness: 0.5,
      roughness: 0.72,
      envMapIntensity: 0.6,
    }),
  );
  applyBrightwork(m.plate, { tag: 'fleetPlate', strength: 0.55, band: 0.3, trees: 0.55, line: 0.46, flat: 0.85, sky: 0x99a099, ground: 0x3a2f22, ambient: 1.3 });
  applyFleetDirt(m.plate, { tag: 'plate', cake: 1.2 });
  m.chrome = new THREE.MeshStandardMaterial(
    V({ metalness: 1.0, roughness: 0.26, roughnessMap: brushed.rough, normalMap: metalB.normal, normalScale: new THREE.Vector2(0.07, 0.07), envMapIntensity: 0.45 }),
  );
  applyBrightwork(m.chrome, { tag: 'fleetChrome', strength: 1.0, band: 0.55, trees: 0.95, line: 0.46, flat: 0.6 });
  // Bare rusted steel: drums, old hitch hardware, exhaust. Rough, dielectric
  // where the oxide is, so it takes colour from the vertex tint.
  m.rust = new THREE.MeshStandardMaterial(
    V({
      map: metalB.map,
      normalMap: metalB.normal,
      roughnessMap: metalB.rough,
      normalScale: new THREE.Vector2(1.2, 1.2),
      metalness: 0.25,
      roughness: 0.92,
      envMapIntensity: 0.35,
    }),
  );
  applyFleetDirt(m.rust, { tag: 'rust', film: 0.6 });

  // --- plastics / rubber -----------------------------------------------------
  m.trim = new THREE.MeshStandardMaterial(
    V({
      map: trim.map,
      normalMap: trim.normal,
      roughnessMap: trim.rough,
      normalScale: new THREE.Vector2(0.85, 0.85),
      metalness: 0.02,
      roughness: 0.86,
      envMapIntensity: 0.6,
    }),
  );
  applyBrightwork(m.trim, { tag: 'fleetTrim', strength: 0.42, band: 0.16, trees: 0.5, fresnel: 0.4, flat: 0.7, ambient: 1.7 });
  applyFleetDirt(m.trim, { tag: 'trim', dry: 0x715f3f });
  m.trimGloss = new THREE.MeshStandardMaterial(
    V({
      map: trimSatin.map,
      normalMap: trimSatin.normal,
      roughnessMap: trimSatin.rough,
      normalScale: new THREE.Vector2(0.7, 0.7),
      metalness: 0.03,
      roughness: 1.0,
      envMapIntensity: 0.32,
    }),
  );
  applyBrightwork(m.trimGloss, { tag: 'fleetTrimGloss', strength: 0.62, band: 0.3, trees: 0.55, fresnel: 0.45, flat: 0.8, ambient: 1.3 });
  applyFleetDirt(m.trimGloss, { tag: 'trimGloss', dry: 0x715e3d });
  m.rubber = new THREE.MeshStandardMaterial(
    V({
      map: rubber.map,
      normalMap: rubber.normal,
      roughnessMap: rubber.rough,
      normalScale: new THREE.Vector2(1.1, 1.1),
      metalness: 0,
      roughness: 1.0,
      envMapIntensity: 0.3,
    }),
  );
  applyFleetDirt(m.rubber, { tag: 'rubber', dry: 0x6a5837, film: 0.55, lift: 3.2 });
  // Tread blocks: the rubber map multiplies a per-vertex albedo that already
  // carries the dust in the voids, so it stays near its mean.
  m.tread = new THREE.MeshStandardMaterial(
    V({
      map: rubber.map,
      normalMap: rubber.normal,
      roughnessMap: rubber.rough,
      normalScale: new THREE.Vector2(0.8, 0.8),
      metalness: 0,
      roughness: 1.0,
      envMapIntensity: 0.26,
    }),
  );
  applyFleetDirt(m.tread, { tag: 'tread', dry: 0x6a5837, film: 0.5, cake: 1.5, lift: 3.2 });
  m.gap = new THREE.MeshStandardMaterial(V({ metalness: 0, roughness: 0.95, envMapIntensity: 0.12 }));
  applyBrightwork(m.gap, { tag: 'fleetGap', strength: 0.2, band: 0.06, trees: 0.3, fresnel: 0.55, ambient: 0.7 });
  applyFleetDirt(m.gap, { tag: 'gap', film: 0.2, spatter: 0.5, cake: 1.6, lift: 4 });

  // --- soft goods -----------------------------------------------------------
  m.canvas = new THREE.MeshStandardMaterial(
    V({
      map: fabric.map,
      normalMap: fabric.normal,
      roughnessMap: fabric.rough,
      normalScale: new THREE.Vector2(1.2, 1.2),
      metalness: 0,
      roughness: 0.92,
      envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  applyFleetDirt(m.canvas, { tag: 'canvas', film: 1.4, spatter: 0.6, cake: 0.6, dry: 0x6f5f45 });
  applySway(m.canvas, { tag: 'canvas', freq: 1.4 });
  m.fabric = new THREE.MeshStandardMaterial(
    V({
      map: fabric.map,
      normalMap: fabric.normal,
      roughnessMap: fabric.rough,
      normalScale: new THREE.Vector2(1.25, 1.25),
      metalness: 0,
      roughness: 1.0,
      envMapIntensity: 0.25,
    }),
  );
  applyFleetDirt(m.fabric, { tag: 'fabric', film: 0.8, spatter: 0, cake: 0 });
  m.vinyl = new THREE.MeshStandardMaterial(
    V({
      map: vinyl.map,
      normalMap: vinyl.normal,
      roughnessMap: vinyl.rough,
      normalScale: new THREE.Vector2(1.0, 1.0),
      metalness: 0,
      roughness: 1.0,
      envMapIntensity: 0.4,
    }),
  );
  applyFleetDirt(m.vinyl, { tag: 'vinyl', film: 1.0, spatter: 0, cake: 0 });
  m.vinylFaded = new THREE.MeshStandardMaterial(
    V({
      map: vinylFaded.map,
      normalMap: vinylFaded.normal,
      roughnessMap: vinylFaded.rough,
      normalScale: new THREE.Vector2(1.1, 1.1),
      metalness: 0,
      roughness: 1.0,
      envMapIntensity: 0.5,
    }),
  );
  applyFleetDirt(m.vinylFaded, { tag: 'vinylFaded', film: 1.5, spatter: 0, cake: 0 });
  // cargo nets and screens: the hero's cut-out, tinted per vertex
  m.mesh = new THREE.MeshStandardMaterial(
    V({ map: meshAlpha('hex'), alphaTest: 0.5, metalness: 0.3, roughness: 0.7, side: THREE.DoubleSide, envMapIntensity: 0.8 }),
  );
  m.decal = new THREE.MeshStandardMaterial(
    V({ map: decalAtlas(), transparent: false, alphaTest: 0.5, metalness: 0, roughness: 0.62, envMapIntensity: 0.4, side: THREE.DoubleSide }),
  );
  applyFleetDirt(m.decal, { tag: 'decal', film: 0.9, spatter: 0.6 });

  // --- lamps ---------------------------------------------------------------
  m.reflector = new THREE.MeshStandardMaterial(
    V({
      map: reflect.map,
      normalMap: reflect.normal,
      roughnessMap: reflect.rough,
      normalScale: new THREE.Vector2(1.3, 1.3),
      metalness: 0.95,
      roughness: 1.0,
      envMapIntensity: 0.28,
      side: THREE.DoubleSide,
    }),
  );
  // a stamped bowl seen straight on used to fill its lens with one white
  // disc at midday; the streak is narrower and dimmer, and the bowl keeps its
  // facets, so an unlit lamp reads as a lamp rather than a light
  applyBrightwork(m.reflector, { tag: 'fleetRefl', strength: 0.4, band: 0.42, trees: 0.45, line: 0.46, ground: 0x120e09, wall: 0x1f1e16, rim: 0xffe8c4, sky: 0x93b0cc });
  // Two of each lamp: the `On` set is what a vehicle left with its lights on
  // uses, and it is the only set the night switch touches.
  // By day nothing on a parked vehicle glows: an unlit bulb is a grey glass
  // pip in a reflector, a tail lens is red plastic. The small emissive left
  // here is the plastic's own translucency, well under a blown disc.
  const lamp = (color, emissive, intensity, extra = {}) =>
    new THREE.MeshStandardMaterial(V({ color, emissive, emissiveIntensity: intensity, roughness: 0.2, metalness: 0, envMapIntensity: 0.55, ...extra }));
  m.headOff = lamp(0xd9d4c8, 0x3a3833, 0.25, { roughness: 0.3 });
  m.headOn = lamp(0xd9d4c8, 0x3a3833, 0.25, { roughness: 0.3 });
  const prism = prismNormal();
  const lens = { normalMap: prism, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.13, metalness: 0.08, envMapIntensity: 1.9 };
  m.tailOff = lamp(0x8e150a, 0x5c0b05, 0.5, lens);
  m.tailOn = lamp(0x8e150a, 0x5c0b05, 0.5, lens);
  m.amber = lamp(0xcf6b06, 0x5e330a, 0.12, lens);
  m.amberOn = lamp(0xcf6b06, 0x5e330a, 0.12, lens);
  m.lampBlue = lamp(0x2c4ed8, 0x142a8a, 0.2, lens);
  m.lampBlueOn = lamp(0x2c4ed8, 0x142a8a, 0.2, lens);
  // camp lantern / interior glow, warm
  m.lampWarmOn = lamp(0xffe3b8, 0xffb060, 0.0, { roughness: 0.4 });
  m.lensClear = new THREE.MeshPhysicalMaterial({
    color: 0xc3d4de,
    metalness: 0,
    roughness: 0.06,
    transparent: true,
    opacity: 0.12,
    envMapIntensity: 1.2,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    depthWrite: false,
  });
  // warm pool under the headlamps of a lit vehicle, additive so it only shows
  // once the ground under it is dark
  m.pool = new THREE.MeshBasicMaterial({
    color: 0xffd9a0,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: poolDecal(),
  });

  // --- glass ---------------------------------------------------------------
  // The same substance as the hero truck's panes (src/vehicle/materials.js,
  // `pane()`): its tint, opacity, Fresnel-weighted graded sky reflection and
  // *lit* dust film, so a jeep windscreen in the camp mirrors the tree line at
  // the same angles the hero's does and goes quiet in shade the same way. Own
  // instances, because the fleet's panes are in world space under their own
  // roots; the parameters are mirrored, not shared. What differs per key is
  // only the film: wiped, unwiped, dusty, the privacy tint on a living box, and
  // one cracked pane.
  const glassBW = {
    strength: 1.25,
    band: 0.55,
    trees: 1.15,
    line: 0.3,
    pane: 1.2,
    clearcoat: true,
    ground: 0x141712,
    wall: 0x1c2117,
    rim: 0xfff0d2,
  };
  const pane = (key, { kind, color, opacity, roughness, film, bw = {}, tag = key, emissiveMap = null, emissiveIntensity = 0 }) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      map: glassTintMap(),
      metalness: 0,
      roughness,
      roughnessMap: kind === 'screen' ? glassRoughness() : null,
      opacity,
      transparent: true,
      envMapIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: emissiveMap ? 0xffffff : 0x000000,
      emissiveMap,
      emissiveIntensity,
    });
    // `tag` is the program key: panes that differ only in uniform values share
    // one program, so the fleet adds at most four glass programs to the scene
    applyBrightwork(mat, { tag: `fleet_${tag}`, ...glassBW, ...bw });
    applyGlassFilm(mat, { tag: `fleet_${tag}`, kind, ...film });
    mat.userData.sortPieces = true;
    m[key] = mat;
    return mat;
  };
  // Windscreens and door glass: the hero's `glass`, wiped
  pane('glass', { kind: 'screen', color: 0x33474f, opacity: 0.26, roughness: 0.07, film: { dustAmount: 0.9, dustAlpha: 0.5, band: 0.5 } });
  // Door and rear glass on a wagon: nothing ever wipes it
  pane('glassSide', { kind: 'side', color: 0x33474f, opacity: 0.26, roughness: 0.08, film: { dustAmount: 1.0, dustAlpha: 0.42, band: 0 } });
  // Dusty: the same program as `glass` with the film turned up
  pane('glassDusty', { kind: 'screen', tag: 'glass', color: 0x33474f, opacity: 0.26, roughness: 0.07, film: { dustAmount: 1.5, dustAlpha: 0.62, band: 0.5, dustRough: 0.7 } });
  // Privacy tint on a living-box window: the hero's rear-glass recipe
  pane('glassDark', {
    kind: 'rear',
    color: 0x2c3d44,
    opacity: 0.3,
    roughness: 0.1,
    film: { dustAmount: 1.0, dustAlpha: 0.7, band: 0, dustAmbient: 0.42 },
    bw: { strength: 1.1, band: 0.45, trees: 1.0, pane: 1.1, wall: 0x1b2016, rim: 0xfbecce, sky: reflectedSky(1.2) },
  });
  // Cracked: a shatter web carried on the emissive channel over the wiped screen
  pane('glassCracked', {
    kind: 'screen',
    color: 0x33474f,
    opacity: 0.3,
    roughness: 0.1,
    film: { dustAmount: 0.9, dustAlpha: 0.5, band: 0.5 },
    emissiveMap: crackMap(),
    emissiveIntensity: 0.55,
  });

  if (env) for (const mat of Object.values(m)) if (mat && 'envMap' in mat) mat.envMap = env;
  for (const [key, mat] of Object.entries(m)) if (mat && mat.isMaterial && !mat.name) mat.name = `fleet_${key}`;
  MATS = m;
  return m;
}

function poolDecal() {
  return cached('fleet.pool', () =>
    canvasTexture(128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }, { srgb: true, repeat: 1 }),
  );
}

/** Materials whose geometry carries the sway attribute. */
export const SWAY_KEYS = new Set(['whip', 'canvas']);

/** Materials whose uvs are kept as authored rather than box-projected. */
export const UV_KEEP = new Set([
  'glass', 'glassSide', 'glassDark', 'glassDusty', 'glassCracked', 'lensClear', 'reflector', 'headOff', 'headOn', 'tailOff', 'tailOn',
  'amber', 'amberOn', 'lampBlue', 'lampBlueOn', 'lampWarmOn', 'decal', 'mesh', 'pool',
]);

/** Texel density per material, wraps per metre. */
export const UV_SCALE = {
  paint: 1.0,
  paintOld: 1.0,
  steel: 1.3,
  whip: 1.3,
  alu: 1.6,
  plate: 1.0,
  chrome: 1.3,
  rust: 1.4,
  trim: 2.6,
  trimGloss: 3.2,
  rubber: 2.0,
  tread: 3.0,
  gap: 1,
  canvas: 1.2,
  fabric: 2.5,
  vinyl: 3,
  vinylFaded: 3,
};

/**
 * Hour switch. Only the `On` lamp set responds, and only the pieces the placer
 * put on it: the one vehicle still arriving (headlamps, tail, pool), the one or
 * two left with parking lamps (amber markers, tail), and the interior glow of
 * whoever is living in the camper. Everything else is off at every hour.
 */
export function setFleetLights(m, on) {
  m.headOn.emissive.set(on ? 0xfff3dc : 0x3a3833);
  m.headOn.emissiveIntensity = on ? 5.0 : 0.25;
  m.tailOn.emissive.set(on ? 0xff2a12 : 0x5c0b05);
  m.tailOn.emissiveIntensity = on ? 2.2 : 0.5;
  m.amberOn.emissive.set(on ? 0xff9a22 : 0x5e330a);
  m.amberOn.emissiveIntensity = on ? 1.8 : 0.12;
  m.lampBlueOn.emissive.set(on ? 0x4a80ff : 0x142a8a);
  m.lampBlueOn.emissiveIntensity = on ? 2.0 : 0.2;
  // a lantern or a reading light behind a curtain, not a floodlit box
  m.lampWarmOn.emissiveIntensity = on ? 1.6 : 0.0;
  m.pool.opacity = on ? 0.4 : 0;
  // the shatter web is a film catching daylight; at night it has nothing to catch
  if (m.glassCracked) {
    m.glassCracked.userData.dayFilm ??= m.glassCracked.emissiveIntensity;
    m.glassCracked.emissiveIntensity = m.glassCracked.userData.dayFilm * (on ? 0.12 : 1);
  }
}
