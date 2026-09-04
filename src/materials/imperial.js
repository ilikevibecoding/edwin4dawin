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
  const hull = makeHullPlate(2048, 331);
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

// Keys whose meshes should not cast shadows (emitters, glass, decals, grates)
export const NO_SHADOW_KEYS = new Set(["glass", "glassDark", "holo", "holoWire", "beam", "impDecal", "deckMarks", "impGrate", "lightBand", "lightBandWarm", "lightBandRed", "lightSoft", "leds", "blink", "blinkSparse", "blinkDense"]);
export const isEmissiveKey = (k) => k.startsWith("emit") || k.startsWith("screen") || k.startsWith("blink") || k.startsWith("lightBand") || k === "lightSoft" || k === "leds";
