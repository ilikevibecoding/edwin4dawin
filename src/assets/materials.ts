/**
 * Shared material palette.
 *
 * The art direction is enforced here rather than at every call site: warm,
 * weathered off-white for Rebel surfaces; cold desaturated grey for Imperial
 * ones; emissive values calibrated so that only energy sources cross the bloom
 * threshold.
 */

import * as THREE from 'three';
import {
  panelTexture,
  panelRoughness,
  panelNormal,
  corridorWallTexture,
  floorGrateTexture,
  fabricTexture,
  nozzleTexture,
} from './textures';

/** Anything at or above this luminance blooms. Keep hull albedo below it. */
export const BLOOM_THRESHOLD = 1.0;

export const PALETTE = {
  rebelHull: '#d8d6cf',
  rebelHullShadow: '#a7a7a1',
  rebelTrim: '#8f2f28',
  imperialHull: '#8d9298',
  imperialHullDark: '#5b6067',
  imperialTrim: '#3d4249',
  engineBlue: '#9fd4ff',
  engineCore: '#e8f4ff',
  // Imperial weapons fire red, Rebel weapons blue. Both sides firing the same
  // colour down a white corridor is unreadable, and the split doubles as the
  // piece's accent-lighting scheme.
  laserRed: '#ff4032',
  laserBlue: '#5cc8ff',
  laserGreen: '#7dff6a',
  amber: '#e8b657',
  hologram: '#7fdcff',
  vaderBlack: '#1b1d22',
  stormtrooperWhite: '#eceff2',
  rebelUniform: '#39424f',
  rebelVest: '#4c4335',
  leiaWhite: '#e9e6de',
  goldDroid: '#d9a83c',
  r2Blue: '#3f7fc4',
  r2White: '#dfe3e8',
  sand: '#c89a63',
  deepSpace: '#04050a',
} as const;

const cache = new Map<string, THREE.Material>();

function memo<T extends THREE.Material>(key: string, build: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const m = build();
  cache.set(key, m);
  return m;
}

export function disposeMaterialCache(): void {
  for (const m of cache.values()) m.dispose();
  cache.clear();
}

/* -------------------------------------------------------------------- hulls */

export interface HullOptions {
  color?: string;
  roughness?: number;
  metalness?: number;
  repeat?: number;
  grime?: number;
  scorch?: number;
  windows?: number;
  cell?: number;
  seed?: string;
  normalScale?: number;
  grimeTint?: 'warm' | 'cool';
}

/** Panelled, weathered PBR hull plating. */
export function hullMaterial(name: string, o: HullOptions = {}): THREE.MeshStandardMaterial {
  return memo(`hull:${name}:${JSON.stringify(o)}`, () => {
    const seed = o.seed ?? name;
    const map = panelTexture({
      base: o.color ?? PALETTE.rebelHull,
      grime: o.grime ?? 0.4,
      scorch: o.scorch ?? 0,
      windows: o.windows ?? 0,
      cell: o.cell ?? 96,
      grimeTint: o.grimeTint ?? 'warm',
      seed,
    });
    const rough = panelRoughness({ seed });
    const norm = panelNormal(seed, 512, 2.1);
    const rep = o.repeat ?? 1;
    for (const t of [map, rough, norm]) {
      t.repeat.set(rep, rep);
      t.needsUpdate = true;
    }
    const m = new THREE.MeshStandardMaterial({
      map,
      roughnessMap: rough,
      normalMap: norm,
      color: 0xffffff,
      roughness: o.roughness ?? 0.72,
      metalness: o.metalness ?? 0.42,
    });
    m.normalScale.set(o.normalScale ?? 0.55, o.normalScale ?? 0.55);
    m.name = `hull.${name}`;
    return m;
  });
}

/** Flat structural metal without panel mapping — for greebles and interiors. */
export function metalMaterial(
  name: string,
  color: string,
  roughness = 0.6,
  metalness = 0.75,
): THREE.MeshStandardMaterial {
  return memo(`metal:${name}:${color}:${roughness}:${metalness}`, () => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = `metal.${name}`;
    return m;
  });
}

/** Non-metal painted or moulded surface (armour, droid shells, props). */
export function paintMaterial(
  name: string,
  color: string,
  roughness = 0.45,
  metalness = 0.05,
): THREE.MeshStandardMaterial {
  return memo(`paint:${name}:${color}:${roughness}:${metalness}`, () => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = `paint.${name}`;
    return m;
  });
}

/** Soft cloth with a woven micro-texture. */
export function clothMaterial(name: string, color: string, roughness = 0.92): THREE.MeshStandardMaterial {
  return memo(`cloth:${name}:${color}`, () => {
    const m = new THREE.MeshStandardMaterial({
      map: fabricTexture(color, name),
      roughness,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    m.name = `cloth.${name}`;
    return m;
  });
}

/* ----------------------------------------------------------------- emissive */

/**
 * Energy source. `intensity` above ~1 pushes it past the bloom threshold; keep
 * illuminated readouts near 0.8 and engine cores between 2 and 6.
 */
export function emissiveMaterial(
  name: string,
  color: string,
  intensity = 2,
  opts: { transparent?: boolean; opacity?: number; toneMapped?: boolean } = {},
): THREE.MeshStandardMaterial {
  return memo(`emis:${name}:${color}:${intensity}:${JSON.stringify(opts)}`, () => {
    const m = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 1,
      metalness: 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      toneMapped: opts.toneMapped ?? true,
    });
    m.name = `emissive.${name}`;
    return m;
  });
}

/**
 * Engine bell face. Same idea as `emissiveMaterial`, but graded from an
 * incandescent core to a dark rim so the drive keeps its shape once the
 * bloom pass gets hold of it.
 */
export function nozzleMaterial(name: string, color: string, intensity = 2): THREE.MeshStandardMaterial {
  return memo(`nozzle:${name}:${color}:${intensity}`, () => {
    const m = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      emissiveMap: nozzleTexture(),
      roughness: 1,
      metalness: 0,
    });
    m.name = `nozzle.${name}`;
    return m;
  });
}

/** Unlit additive card — glows, flares, hologram fills. */
export function additiveMaterial(
  name: string,
  color: string,
  opacity = 1,
  map?: THREE.Texture,
): THREE.MeshBasicMaterial {
  return memo(`add:${name}:${color}:${opacity}:${map?.uuid ?? 'none'}`, () => {
    const m = new THREE.MeshBasicMaterial({
      color,
      map: map ?? null,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    m.name = `additive.${name}`;
    return m;
  });
}

/**
 * Engine exhaust plume.
 *
 * Applied to an open cone whose apex points aft. Brightness falls off along
 * the axis and with the cosine of the view angle, so the cone's silhouette
 * dissolves instead of showing a hard outline — the difference between a
 * glowing exhaust and a blue plastic tube.
 */
export function plumeMaterial(color: string, intensity = 1): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uCoreColor: { value: new THREE.Color('#ffffff') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vV = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3  uColor;
      uniform vec3  uCoreColor;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        // uv.y runs 0 at the nozzle to 1 at the tip of the cone.
        float axial  = pow(1.0 - vUv.y, 1.7);
        // Facing is ~1 through the middle of the plume and ~0 at its silhouette.
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float body   = pow(facing, 1.6);
        float a = axial * body * uIntensity;
        if (a < 0.002) discard;
        vec3 col = mix(uColor, uCoreColor, pow(axial, 3.0) * 0.7);
        gl_FragColor = vec4(col * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  m.name = `plume.${color}`;
  return m;
}

/** Dark tinted glass for viewports and helmet lenses. */
export function glassMaterial(name: string, color = '#0a1622', opacity = 0.72): THREE.MeshPhysicalMaterial {
  return memo(`glass:${name}:${color}:${opacity}`, () => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.12,
      metalness: 0,
      transmission: 0,
      transparent: true,
      opacity,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.6,
    });
    m.name = `glass.${name}`;
    return m;
  });
}

/* ---------------------------------------------------------------- interiors */

export function corridorWallMaterial(seed = 'wall'): THREE.MeshStandardMaterial {
  return memo(`cwall:${seed}`, () => {
    const map = corridorWallTexture(seed);
    const m = new THREE.MeshStandardMaterial({
      map,
      normalMap: panelNormal(`${seed}-n`, 256, 1.1),
      roughness: 0.62,
      metalness: 0.06,
    });
    m.normalScale.set(0.3, 0.3);
    m.name = `corridor.wall.${seed}`;
    return m;
  });
}

export function corridorFloorMaterial(seed = 'floor'): THREE.MeshStandardMaterial {
  return memo(`cfloor:${seed}`, () => {
    const map = floorGrateTexture(seed);
    map.repeat.set(2, 6);
    const m = new THREE.MeshStandardMaterial({
      map,
      roughness: 0.55,
      metalness: 0.68,
    });
    m.name = `corridor.floor.${seed}`;
    return m;
  });
}

/* -------------------------------------------------------------- highlighting */

/**
 * Explore-mode hover outline. Rendered as a slightly inflated back-face shell
 * so it reads as a rim rather than a silhouette fill.
 */
export function outlineMaterial(color = '#6fd6ff'): THREE.MeshBasicMaterial {
  return memo(`outline:${color}`, () => {
    const m = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      toneMapped: false,
    });
    m.name = 'outline';
    return m;
  });
}
