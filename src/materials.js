// Shared PBR material library from procedural textures. Interior plating, decks, metals, exterior hull,
// emissive families, screen/LED atlases, glass, holograms and the hangar containment field.
// All tinted materials use vertex colours so one material serves many surfaces (few draw calls).
import * as THREE from "three";
import { makeImperialPanel, makeWornMetal, makeDeckBlack, makeDeckGrey, makeHullPlate, makeRubber, makeFabric, makeHazard, makeGrate, makeDiffuser, makeDecalSheet, makeScreenAtlas, makeLedAtlas } from "./textures.js";
import { IMP } from "./core/palette.js";

export { IMP as PALETTE };

const timings = {};
function timed(name, fn) {
  const t0 = performance.now();
  const r = fn();
  timings[name] = +(performance.now() - t0).toFixed(0);
  return r;
}

/** opts.mobile: smaller procedural textures (4x faster generation, a quarter of the texture memory). */
export function buildMaterials({ mobile = false } = {}) {
  const big = mobile ? 512 : 1024;
  const panel = timed("imperialPanel", () => makeImperialPanel(512, 5));
  const metal = timed("wornMetal", () => makeWornMetal(big, 23));
  const deckBlack = timed("deckBlack", () => makeDeckBlack(big, 43));
  const deckGrey = timed("deckGrey", () => makeDeckGrey(big, 47));
  const hull = timed("hullPlate", () => makeHullPlate(mobile ? 1024 : 2048, 31));
  const rubber = timed("rubber", () => makeRubber(256, 53));
  const fabric = timed("fabric", () => makeFabric(256, 67));
  const hazard = timed("hazard", () => makeHazard(256, 71));
  const hazardRed = timed("hazardRed", () => makeHazard(256, 73, [0.85, 0.16, 0.12], [0.88, 0.88, 0.9]));
  const grate = timed("grate", () => makeGrate(1024, 768, 61));
  const diffuser = timed("diffuser", () => makeDiffuser(256, 13));
  const decals = timed("decals", () => makeDecalSheet(1024, 19));
  const screens = timed("screens", () => makeScreenAtlas(mobile ? 1024 : 2048, 5));
  const leds = timed("leds", () => makeLedAtlas(1024, 9));

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
    new THREE.MeshStandardMaterial({ color: 0x0a0b0e, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.4, metalness: 0, ...extra });

  const mats = {
    // ---- interior plating (tint from vertex colours)
    plate: std(panel, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.7 }),
    // dark painted structural steel (beams, housings, trim): dielectric so it never reads as a black mirror
    paintedMetal: std(metal, { normalScale: new THREE.Vector2(0.5, 0.5), metalness: 0.15, roughness: 1.1, envMapIntensity: 0.5 }),
    metal: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.85 }),
    metalRough: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1.6, envMapIntensity: 0.6 }),
    deckBlack: std(deckBlack, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 1.2 }),
    deckGrey: std(deckGrey, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.8 }),
    // ---- exterior armour (tint from vertex colours; lit by the sun + space environment)
    hull: std(hull, { normalScale: new THREE.Vector2(1.2, 1.2), envMapIntensity: 0.5 }),
    hullDark: std(hull, { normalScale: new THREE.Vector2(1.0, 1.0), roughness: 1.3, envMapIntensity: 0.35 }),
    // ---- soft goods / misc
    rubber: std(rubber, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.3 }),
    fabric: std(fabric, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.25 }),
    hazard: std(hazard, { normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.5 }),
    hazardRed: std(hazardRed, { normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.5 }),
    grate: std(grate, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.8, transparent: true, depthWrite: true, alphaTest: 0, side: THREE.DoubleSide }),
    darkGloss: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.22, metalness: 0.25, envMapIntensity: 1.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x6d8a96, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.08, depthWrite: false, envMapIntensity: 0.15, side: THREE.DoubleSide }),

    // ---- emissive families (the lighting controller animates intensities / alert colours)
    emitWhite: emit("#e6edff", 2.2),
    emitWhiteSoft: emit("#e6edff", 2.0, { emissiveMap: diffuser }),
    emitWarmSoft: emit("#ffc78a", 1.9, { emissiveMap: diffuser }),
    emitRed: emit("#ff3b2f", 2.4),
    emitBlue: emit("#3f8dff", 2.4),
    emitAmber: emit("#ffb547", 2.2),
    emitGreen: emit("#3ad17a", 2.0),
    emitCyan: emit("#5ad8ff", 2.4),
    emitViolet: emit("#8a7cff", 2.4),
    engineGlow: emit("#6fb4ff", 3.0),

    // ---- atlases
    screen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screens, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0, envMapIntensity: 1.0 }),
    leds: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: leds, emissiveIntensity: 2.2, roughness: 0.3, metalness: 0 }),
    decal: new THREE.MeshStandardMaterial({ map: decals, transparent: true, depthWrite: false, roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.3 }),

    // ---- holograms and fields (additive, animated by their owners)
    holo: new THREE.MeshBasicMaterial({ color: 0x5fb8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    field: makeFieldMaterial(),
  };
  mats.timings = timings;
  // back-compat aliases used by shared helpers
  mats.emitTeal = mats.emitCyan;
  mats.emitWarm = mats.emitAmber;
  mats.emitOrange = mats.emitAmber;
  mats.emitCool = mats.emitWhite;
  mats.emitCoolSoft = mats.emitWhiteSoft;
  mats.painted = mats.plate;
  mats.painted1 = mats.plate;
  mats.painted2 = mats.plate;
  mats.deck = mats.deckGrey;
  return mats;
}

/** Hangar containment field: animated, additive, transparent shimmer with a hexagonal interference pattern. */
export function makeFieldMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0x5fb8ff) }, strength: { value: 0.35 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color;
      uniform float strength;
      varying vec2 vUv;
      varying vec3 vW;
      float hex(vec2 p) {
        p = abs(p);
        return max(dot(p, normalize(vec2(1.0, 1.73))), p.x);
      }
      void main() {
        vec2 p = vW.xz * 0.35;
        // hexagonal cells
        vec2 r = vec2(1.0, 1.73);
        vec2 h = r * 0.5;
        vec2 a = mod(p, r) - h;
        vec2 b = mod(p - h, r) - h;
        vec2 g = dot(a, a) < dot(b, b) ? a : b;
        float d = hex(g);
        float edge = smoothstep(0.42, 0.5, d);
        float pulse = 0.5 + 0.5 * sin(time * 1.6 + vW.x * 0.05 + vW.z * 0.07);
        float wave = 0.5 + 0.5 * sin(vW.z * 0.4 - time * 2.5);
        float a2 = strength * (0.25 + 0.5 * edge + 0.25 * wave * pulse);
        // fade toward the rim so the plane never shows a hard border
        float rim = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.x) * smoothstep(0.0, 0.08, vUv.y) * smoothstep(0.0, 0.08, 1.0 - vUv.y);
        gl_FragColor = vec4(color * (0.6 + 0.8 * edge), a2 * (0.4 + 0.6 * rim));
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
