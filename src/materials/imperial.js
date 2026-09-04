// Imperial material library: palette + PBR material set shared by every interior room, the hangar and
// the exterior hull. Materials are keyed for the Kit (one merged mesh per key per room).
// Animated emissives (indicator grids, tactical screens, engine glow) share one `time` uniform that
// main.js advances each frame; the animation lives in the shader so it costs nothing on the CPU.
import * as THREE from "three";
import { makeWornMetal, makeRubber, makeFabric, makeGrate, makeDiffuser, makeLedStrip } from "../textures.js";
import {
  makeImperialPanel,
  makeGlossDeck,
  makeDarkDeck,
  makeHullPlate,
  makeHullDetail,
  makeIndicatorGrid,
  makeTacticalScreen,
  makeImperialDecals,
  makeDeckMarkings,
  makeLightBand,
} from "./imperialTextures.js";

export const IMP = {
  // structure
  hull: new THREE.Color("#8d939a"),
  hullLight: new THREE.Color("#a3a8ae"),
  hullDark: new THREE.Color("#5b6067"),
  trench: new THREE.Color("#2a2d31"),
  wallLight: new THREE.Color("#a6aab1"),
  wallMid: new THREE.Color("#7c8189"),
  wallDark: new THREE.Color("#3a3e44"),
  trim: new THREE.Color("#14161a"),
  black: new THREE.Color("#0b0c0e"),
  steel: new THREE.Color("#9ea3aa"),
  gunmetal: new THREE.Color("#4a4e55"),
  darkMetal: new THREE.Color("#2b2e33"),
  console: new THREE.Color("#4b5057"),
  consoleDark: new THREE.Color("#23262b"),
  white: new THREE.Color("#e6e9ee"),
  // accents
  red: new THREE.Color("#ff2a1a"),
  blue: new THREE.Color("#3a86ff"),
  amber: new THREE.Color("#ffb020"),
  green: new THREE.Color("#3ddc84"),
  cyan: new THREE.Color("#4fd8cc"),
  coolWhite: new THREE.Color("#dfe8ff"),
  warmWhite: new THREE.Color("#ffe2c0"),
  engine: new THREE.Color("#8fb8ff"),
  holo: new THREE.Color("#5aa0ff"),
  // soft goods
  fabricBlack: new THREE.Color("#1f2226"),
  fabricGrey: new THREE.Color("#6d7178"),
  fabricOlive: new THREE.Color("#5e6650"),
  rubber: new THREE.Color("#ffffff"),
  hazardYellow: new THREE.Color("#d9b53a"),
};

// Shared animation uniform
export const IMP_TIME = { value: 0 };

// Blink shader: modulates emissive per indicator cell (uv grid) with a pseudo-random period/phase so a
// grid of lights flickers like an Imperial console. `cells` must match the indicator texture grid.
function blinkPatch(material, cells = [32, 16], rate = 1.0) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = IMP_TIME;
    shader.uniforms.uCells = { value: new THREE.Vector2(cells[0], cells[1]) };
    shader.uniforms.uRate = { value: rate };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime; uniform vec2 uCells; uniform float uRate;
        float impHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          vec2 cell = floor(vEmissiveMapUv * uCells);
          float h = impHash(cell);
          float h2 = impHash(cell + 17.0);
          // most lights hold steady; a third blink slowly, a few flicker fast
          float period = mix(0.8, 4.5, h);
          float phase = fract(uTime * uRate / period + h2);
          float on = h2 < 0.55 ? 1.0 : (h2 < 0.9 ? step(0.5, phase) * 0.85 + 0.15 : (step(0.5, fract(phase * 6.0)) * 0.7 + 0.3));
          totalEmissiveRadiance *= on;
        }`,
      );
  };
  material.customProgramCacheKey = () => "impBlink" + cells.join("x") + rate;
  return material;
}

// Screen shader: slow rolling scanline brightness + subtle flicker + occasional data row highlight.
function screenPatch(material, seed = 0) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = IMP_TIME;
    shader.uniforms.uSeed = { value: seed };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform float uTime; uniform float uSeed;`)
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float roll = 0.85 + 0.15 * smoothstep(0.0, 0.08, abs(fract(vEmissiveMapUv.y * 1.0 + uTime * 0.12 + uSeed) - 0.5));
          float flick = 0.96 + 0.04 * sin(uTime * 37.0 + uSeed * 9.0);
          // a highlighted row sweeping down the display
          float row = step(0.97, fract(vEmissiveMapUv.y * 8.0 - uTime * 0.35 + uSeed)) * 0.6;
          totalEmissiveRadiance = totalEmissiveRadiance * roll * flick + totalEmissiveRadiance * row;
        }`,
      );
  };
  material.customProgramCacheKey = () => "impScreen";
  return material;
}

// Engine glow: radial gradient with a slow pulse and streaks.
function engineGlowPatch(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = IMP_TIME;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform float uTime;`)
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          vec2 c = vEmissiveMapUv - 0.5;
          float r = length(c) * 2.0;
          float core = smoothstep(1.0, 0.15, r);
          float pulse = 0.92 + 0.08 * sin(uTime * 2.3 + r * 6.0);
          float ang = atan(c.y, c.x);
          float streaks = 0.9 + 0.1 * sin(ang * 24.0 + uTime * 0.7);
          totalEmissiveRadiance *= (0.35 + 1.4 * core) * pulse * streaks;
        }`,
      );
  };
  material.customProgramCacheKey = () => "impEngine";
  return material;
}

// Hull plating: two-scale normal detail (macro plate seams + micro rivets/sub-seams) blended by distance.
function hullDetailPatch(material, detailMap, detailScale = 9.0) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: detailMap };
    shader.uniforms.uDetailScale = { value: detailScale };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform sampler2D uDetail; uniform float uDetailScale;`)
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          // fade the micro detail out beyond ~120 m: it would only alias
          float dist = length(vViewPosition);
          float k = 1.0 - smoothstep(40.0, 140.0, dist);
          if (k > 0.001) {
            vec3 dn = texture2D(uDetail, vNormalMapUv * uDetailScale).xyz * 2.0 - 1.0;
            dn.xy *= 0.6 * k;
            normal = normalize(normal + tbn * vec3(dn.xy, 0.0));
          }
        }`,
      );
  };
  material.customProgramCacheKey = () => "impHullDetail";
  return material;
}

export function buildImperialMaterials() {
  const panel = makeImperialPanel(512, 301);
  const panel1 = makeImperialPanel(512, 347, { scuff: 0.3 });
  const metal = makeWornMetal(1024, 23);
  const gloss = makeGlossDeck(1024, 311);
  const dark = makeDarkDeck(1024, 321);
  const hull = makeHullPlate(1024, 331);
  const hullDetail = makeHullDetail(512, 341);
  const grate = makeGrate(1024, 768, 61);
  const rubber = makeRubber(256, 53);
  const fabric = makeFabric(256, 67);
  const diffuser = makeDiffuser(256, 13);
  const band = makeLightBand(512, 64, 391);

  const std = (set, extra = {}) =>
    new THREE.MeshStandardMaterial({
      map: set.map,
      roughnessMap: set.roughnessMap,
      metalnessMap: set.metalnessMap,
      normalMap: set.normalMap,
      roughness: 1,
      metalness: 1,
      vertexColors: true,
      color: 0xffffff,
      ...extra,
    });
  const emit = (color, intensity, extra = {}) =>
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.05), emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0, ...extra });

  const mats = {
    // --- walls / structure (vertex colour tints)
    impPanel: std(panel, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.7 }),
    impPanel1: std(panel1, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.7 }),
    // dark painted structural steel (dielectric; bare metal boxes read as black in a dim interior)
    impPaintedMetal: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), metalness: 0.15, roughness: 1.15, envMapIntensity: 0.6 }),
    impMetal: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.85 }),
    impMetalRough: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1.7, envMapIntensity: 0.7 }),
    // --- floors
    impGloss: std(gloss, { normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 1.2 }),
    impDeck: std(dark, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.9 }),
    impGrate: std(grate, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.8, transparent: true, depthWrite: true, alphaTest: 0, side: THREE.DoubleSide }),
    // --- exterior
    hullPlate: hullDetailPatch(std(hull, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.9 }), hullDetail, 9.0),
    hullPlateFar: std(hull, { normalScale: new THREE.Vector2(0.7, 0.7), envMapIntensity: 0.9 }),
    hullDark: std(metal, { normalScale: new THREE.Vector2(0.5, 0.5), metalness: 0.4, roughness: 1.2, envMapIntensity: 0.5 }),
    // --- soft goods / misc
    impRubber: std(rubber, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.4 }),
    impFabric: std(fabric, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.3 }),
    darkGloss: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.25, metalness: 0.2, envMapIntensity: 1.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x6d8a96, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.07, depthWrite: false, envMapIntensity: 0.15, side: THREE.DoubleSide }),
    glassDark: new THREE.MeshPhysicalMaterial({ color: 0x1a2430, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false, envMapIntensity: 0.6, side: THREE.DoubleSide }),
    holo: new THREE.MeshBasicMaterial({ color: IMP.holo, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    holoWire: new THREE.MeshBasicMaterial({ color: IMP.holo, wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    beam: new THREE.MeshBasicMaterial({ color: 0x7fb0ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),

    // --- emissives (indicator colours, light bands)
    emitRed: emit(IMP.red, 2.2),
    emitBlue: emit(IMP.blue, 2.4),
    emitAmber: emit(IMP.amber, 2.2),
    emitGreen: emit(IMP.green, 2.0),
    emitWhite: emit(IMP.coolWhite, 2.4),
    emitWarm: emit(IMP.warmWhite, 1.8),
    // the diffuser map only exists so the shader has an emissive UV varying to build the gradient from
    emitEngine: engineGlowPatch(emit(IMP.engine, 3.5, { emissiveMap: diffuser })),
    emitHolo: emit(IMP.holo, 1.6),
    // recessed wall light band: cool white with a soft falloff map, uv 'keep' per emitter face
    lightBand: new THREE.MeshStandardMaterial({ color: 0x0a0e14, emissive: IMP.coolWhite, emissiveMap: band, emissiveIntensity: 1.7, roughness: 0.5, metalness: 0 }),
    lightBandWarm: new THREE.MeshStandardMaterial({ color: 0x14100a, emissive: IMP.warmWhite, emissiveMap: band, emissiveIntensity: 1.6, roughness: 0.5, metalness: 0 }),
    lightBandRed: new THREE.MeshStandardMaterial({ color: 0x140606, emissive: IMP.red, emissiveMap: band, emissiveIntensity: 1.8, roughness: 0.5, metalness: 0 }),
    lightSoft: new THREE.MeshStandardMaterial({ color: 0x0a0e14, emissive: IMP.coolWhite, emissiveMap: diffuser, emissiveIntensity: 2.4, roughness: 0.5, metalness: 0 }),

    // --- decals
    impDecal: new THREE.MeshStandardMaterial({ map: makeImperialDecals(1024, 371), transparent: true, depthWrite: false, roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.3 }),
    deckMarks: new THREE.MeshStandardMaterial({ map: makeDeckMarkings(1024, 381), transparent: true, depthWrite: false, roughness: 0.6, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.4 }),
    hazard: null, // set below
  };

  // hazard stripes: black / imperial yellow chevrons via vertex-colour-free canvas texture
  {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#15161a";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#c9a634";
    for (let k = -1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 128, 0);
      ctx.lineTo(k * 128 + 64, 0);
      ctx.lineTo(k * 128 + 64 + 256, 256);
      ctx.lineTo(k * 128 + 256, 256);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    mats.hazard = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.2, envMapIntensity: 0.5 });
  }

  // --- fighter / hangar additions (hangar workstream)
  // TIE solar panel: near-black cells with a fine lighter lattice, low-gloss dielectric
  {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1c1e23";
    ctx.fillRect(0, 0, 256, 256);
    const cells = 8;
    const cw = 256 / cells;
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const k = 0.9 + ((i * 7 + j * 13) % 5) * 0.035;
        ctx.fillStyle = `rgb(${Math.round(22 * k)},${Math.round(24 * k)},${Math.round(30 * k)})`;
        ctx.fillRect(i * cw + 1.5, j * cw + 1.5, cw - 3, cw - 3);
      }
    }
    ctx.fillStyle = "#3a3f48";
    for (let i = 0; i <= cells; i++) {
      ctx.fillRect(i * cw - 1, 0, 2, 256);
      ctx.fillRect(0, i * cw - 1, 256, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    mats.tiePanel = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.42, metalness: 0.55, envMapIntensity: 0.9, side: THREE.DoubleSide });
  }
  // dark-red-tinted cockpit glass (TIE viewport)
  mats.tieGlass = new THREE.MeshPhysicalMaterial({ color: 0x4a0f0f, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.62, depthWrite: false, envMapIntensity: 1.1, side: THREE.DoubleSide });
  // ion-engine exhaust flare (additive, red-orange); the diffuser map gives it a soft round core
  mats.exhaustGlow = new THREE.MeshBasicMaterial({ color: 0xff6a3a, map: diffuser, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  // rotating warning-beacon lobe (additive amber, no depth write so it never z-fights the housing)
  mats.beaconGlow = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  // indicator grids (three densities) with the blink shader
  mats.blink = blinkPatch(
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeIndicatorGrid(512, 256, 351), emissiveIntensity: 2.2, roughness: 0.3, metalness: 0 }),
    [32, 16],
    1.0,
  );
  mats.blinkSparse = blinkPatch(
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeIndicatorGrid(512, 256, 353, { density: 0.3 }), emissiveIntensity: 2.2, roughness: 0.3, metalness: 0 }),
    [32, 16],
    0.7,
  );
  mats.blinkDense = blinkPatch(
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeIndicatorGrid(512, 256, 357, { cols: 48, rows: 24, density: 0.7 }), emissiveIntensity: 2.0, roughness: 0.3, metalness: 0 }),
    [48, 24],
    1.4,
  );
  mats.leds = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeLedStrip(256, 32, 9), emissiveIntensity: 2.0, roughness: 0.3, metalness: 0 });

  // tactical screens: four variants (blue), one red alert variant
  const screens = [
    makeTacticalScreen(512, 256, 361, 0),
    makeTacticalScreen(512, 256, 367, 1),
    makeTacticalScreen(512, 256, 373, 2),
    makeTacticalScreen(512, 256, 379, 0, "#ff3b2a", "#ffb020"),
    makeTacticalScreen(512, 256, 383, 1, "#ffb020", "#ff3b2a"),
  ];
  mats.screens = screens.map((tex, i) =>
    screenPatch(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0, envMapIntensity: 1.0 }), i * 0.37),
  );
  mats.screens.forEach((m, i) => (mats["screen" + i] = m));

  return mats;
}

// ---------------------------------------------------------------------------
// Exterior detail materials (greebles.js). Added by the exterior-detail workstream.
// ---------------------------------------------------------------------------

// Emissive whose colour comes from the vertex / instance colour, so one batched mesh can carry cool
// white windows, warm floodlights and red / green running lights. `color` stays black: lights read as
// pure emitters, never as lit plastic.
function emitTintPatch(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
        totalEmissiveRadiance *= vColor.rgb;
      #endif`,
    );
  };
  material.customProgramCacheKey = () => "impEmitTint";
  return material;
}
export function makeEmitTint(intensity = 2.4) {
  return emitTintPatch(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: intensity, roughness: 0.4, metalness: 0, vertexColors: true }));
}

// Weathering atlas (2x2 cells): 0 soot streak, 1 scorch blot, 2 soft paint / dust patch, 3 fine grime
// streaks. RGB carries the soot tone, alpha the coverage; vertex colour tints the paint cell.
export function weatherRect(i) {
  const u = i % 2;
  const v = 1 - Math.floor(i / 2);
  return [u * 0.5 + 0.004, v * 0.5 + 0.004, u * 0.5 + 0.496, v * 0.5 + 0.496];
}
function makeWeatheringAtlas(size = 1024, seed = 4021) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const half = size / 2;
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  // value noise helpers on a small lattice
  const lat = 64;
  const grid = new Float32Array(lat * lat);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise = (u, v, f) => {
    const x = u * f;
    const y = v * f;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const g = (a, b) => grid[(((b % lat) + lat) % lat) * lat + (((a % lat) + lat) % lat)];
    return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
  };
  const fbm = (u, v, f, oct = 4) => {
    let a = 0;
    let amp = 0.5;
    let sum = 0;
    for (let o = 0; o < oct; o++) {
      a += noise(u, v, f) * amp;
      sum += amp;
      f *= 2.03;
      amp *= 0.5;
    }
    return a / sum;
  };
  const streaks = [];
  for (let k = 0; k < 14; k++) streaks.push([rnd(), 0.05 + rnd() * 0.25, 0.01 + rnd() * 0.03, 0.4 + rnd() * 0.6]);
  const fine = [];
  for (let k = 0; k < 40; k++) fine.push([rnd(), rnd() * 0.3, 0.002 + rnd() * 0.006, 0.3 + rnd() * 0.7]);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const cell = (px < half ? 0 : 1) + (py < half ? 0 : 2);
      const u = ((px % half) + 0.5) / half;
      const v = ((py % half) + 0.5) / half;
      let a = 0;
      let lum = 0.06;
      if (cell === 0) {
        // soot streak: dark plume starting near v=0, thinning and breaking up toward v=1
        for (const [sx, sy, sw, sl] of streaks) {
          const dv = v - sy;
          if (dv < 0 || dv > sl) continue;
          const t = dv / sl;
          const wob = (fbm(u * 3 + sx * 7, v * 2, 6) - 0.5) * 0.06 * t;
          const dx = Math.abs(u - sx - wob) / (sw * (1 + t * 1.6));
          if (dx < 1) a += (1 - dx * dx) * (1 - t) * (0.55 + 0.45 * fbm(u, v, 24));
        }
        a *= 0.85;
        lum = 0.05 + 0.04 * fbm(u, v, 40);
      } else if (cell === 1) {
        // scorch blot: irregular radial burn, darkest at the centre, ragged edge, a faint bright ring
        const dx = u - 0.5;
        const dy = v - 0.5;
        const ang = Math.atan2(dy, dx);
        const rr = Math.hypot(dx, dy) / (0.36 + 0.09 * fbm(Math.cos(ang) + 1, Math.sin(ang) + 1, 3) + 0.05 * fbm(u, v, 12));
        const core = Math.max(0, 1 - rr);
        a = Math.pow(core, 0.7) * (0.75 + 0.25 * fbm(u, v, 30));
        lum = 0.04 + 0.1 * (1 - core) + 0.05 * fbm(u, v, 50);
        if (rr > 0.85 && rr < 1.05) {
          a = Math.max(a, 0.18 * (1 - Math.abs(rr - 0.95) / 0.1));
          lum = 0.7;
        }
      } else if (cell === 2) {
        // repainted panel: a rectangle with a short soft edge and a mottled interior, tinted per decal
        // (vertex colour carries the paint tone, vertex alpha the coverage) so it reads as a plate that
        // was resprayed a slightly different grey, not as a cloud
        const edge = Math.min(u - 0.06, 0.94 - u, v - 0.06, 0.94 - v);
        const mask = Math.max(0, Math.min(1, edge / 0.025));
        a = mask * (0.72 + 0.28 * fbm(u, v, 7)) * (0.88 + 0.12 * fbm(u, v, 33));
        lum = 1.0;
      } else {
        // fine grime: many hairline streaks running along v from small sources
        for (const [sx, sy, sw, sl] of fine) {
          const dv = v - sy;
          if (dv < 0 || dv > sl) continue;
          const t = dv / sl;
          const dx = Math.abs(u - sx) / (sw * (1 + t));
          if (dx < 1) a += (1 - dx) * (1 - t) * 0.7;
        }
        a = Math.min(1, a) * (0.7 + 0.3 * fbm(u, v, 30));
        lum = 0.08 + 0.06 * fbm(u, v, 35);
      }
      // keep the cell borders clear so bilinear filtering never bleeds a neighbour in
      const border = Math.min(u, 1 - u, v, 1 - v);
      if (border < 0.02) a *= border / 0.02;
      const i = (py * size + px) * 4;
      const l8 = Math.round(Math.min(1, lum) * 255);
      d[i] = l8;
      d[i + 1] = l8;
      d[i + 2] = Math.min(255, l8 + 2);
      d[i + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

// Adds the exterior-detail keys to a material set built by buildImperialMaterials(). Idempotent.
export function addExteriorDetailMaterials(mats) {
  if (mats.hullGreeble) return mats;
  // shares the worn-metal texture set already loaded for impMetal
  const metal = mats.impMetal;
  // painted hull machinery (tinted per instance): matte dielectric like the hull plating, so it takes
  // the sun as diffuse shading and sits in shadow as dark as the armour it stands on (a half-metal
  // finish mirrored the neutral environment and floated bright over the shadowed keel). The worn-metal
  // roughness map averages ~0.36, so the factor lifts it to ~0.6 like the hull texture.
  mats.hullGreeble = new THREE.MeshStandardMaterial({
    map: metal.map,
    roughnessMap: metal.roughnessMap,
    metalnessMap: metal.metalnessMap,
    normalMap: metal.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 1.7,
    metalness: 0.14,
    vertexColors: true,
    color: 0xffffff,
    envMapIntensity: 0.6,
  });
  mats.emitTint = makeEmitTint(2.4);
  // anti-collision strobes: greebles.js toggles emissiveIntensity between 0 and this every flash
  mats.emitStrobe = makeEmitTint(6.0);
  mats.emitStrobe.userData.onIntensity = 6.0;
  mats.weathering = new THREE.MeshStandardMaterial({
    map: makeWeatheringAtlas(512, 4021),
    transparent: true,
    depthWrite: false,
    roughness: 0.92,
    metalness: 0.05,
    vertexColors: true,
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    envMapIntensity: 0.2,
  });
  return mats;
}

// Keys whose meshes should not cast shadows (emitters, glass, decals, grates)
export const NO_SHADOW_KEYS = new Set(["glass", "glassDark", "holo", "holoWire", "beam", "impDecal", "deckMarks", "impGrate", "lightBand", "lightBandWarm", "lightBandRed", "lightSoft", "leds", "blink", "blinkSparse", "blinkDense", "emitTint", "emitStrobe", "weathering", "tieGlass", "exhaustGlow", "beaconGlow"]);
export const isEmissiveKey = (k) => k.startsWith("emit") || k.startsWith("screen") || k.startsWith("blink") || k.startsWith("lightBand") || k === "lightSoft" || k === "leds";
