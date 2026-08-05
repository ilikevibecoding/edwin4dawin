import * as THREE from 'three';
import { fbm } from './Textures';

/**
 * Sky and ambient lighting.
 *
 * The sky is synthesised on the CPU into a floating-point equirectangular map,
 * which is then used both as the visible background and (through PMREM) as the
 * image-based lighting for every PBR surface in the scene. Generating it in HDR
 * matters: the overcast underbelly lit by city sodium light is what puts warm
 * bounce on the top of every wet railing, and clipping it to 0..1 would flatten
 * all of that.
 */

export interface SkyOptions {
  size?: number;
  /** Overall brightness of the cloud deck. */
  cloudBrightness?: number;
  /** How much the city lights the clouds from below. */
  cityGlow?: number;
  cityGlowColor?: THREE.Color;
  zenithColor?: THREE.Color;
  horizonColor?: THREE.Color;
  /** Cloud coverage, 0 clear .. 1 solid overcast. */
  coverage?: number;
  stars?: number;
  seed?: number;
  /** Extra glow lobes: searchlights, distant fires. */
  beams?: { azimuth: number; elevation: number; spread: number; intensity: number; color: THREE.Color }[];
}

export function buildNightSky(opts: SkyOptions = {}): THREE.DataTexture {
  const size = opts.size ?? 512;
  const w = size;
  const h = size / 2;
  const cloudBrightness = opts.cloudBrightness ?? 0.5;
  const cityGlow = opts.cityGlow ?? 1.15;
  const cityGlowColor = opts.cityGlowColor ?? new THREE.Color(1.0, 0.52, 0.22);
  const zenith = opts.zenithColor ?? new THREE.Color(0.011, 0.019, 0.036);
  const horizon = opts.horizonColor ?? new THREE.Color(0.07, 0.1, 0.15);
  const coverage = opts.coverage ?? 0.78;
  const starDensity = opts.stars ?? 0.12;
  const seed = opts.seed ?? 7;

  const data = new Float32Array(w * h * 4);
  const c = new THREE.Color();

  for (let y = 0; y < h; y++) {
    // v=0 is up.
    const v = y / (h - 1);
    const theta = v * Math.PI;
    const elevation = Math.cos(theta); // 1 zenith, -1 nadir
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const phi = u * Math.PI * 2;

      // Base gradient.
      const t = Math.pow(Math.max(0, elevation), 0.65);
      c.copy(horizon).lerp(zenith, t);

      // Cloud deck: stretched noise, denser toward the horizon.
      const sx = Math.sin(phi) * (1.2 + (1 - Math.abs(elevation)) * 2.2);
      const sy = Math.cos(phi) * (1.2 + (1 - Math.abs(elevation)) * 2.2);
      const cloudBase = fbm(sx * 2.2 + 10, sy * 2.2 + (1 - elevation) * 3.5, 5, seed);
      const detail = fbm(sx * 7 + 3, sy * 7 + (1 - elevation) * 8, 4, seed + 31);
      let cloud = cloudBase * 0.72 + detail * 0.28;
      cloud = Math.max(0, (cloud - (1 - coverage)) / Math.max(0.001, coverage));
      // Clouds thin out at the zenith and pile up at the horizon.
      const cloudMask = Math.pow(1 - Math.max(0, elevation), 1.15);
      cloud *= cloudMask;

      // Underlit by the city: strongest just above the horizon.
      const glowBand = Math.exp(-Math.pow(Math.max(0, elevation) * 3.1, 2));
      const belowLight = cityGlow * glowBand * (0.35 + cloud * 1.5);
      c.r += cityGlowColor.r * belowLight * 0.5;
      c.g += cityGlowColor.g * belowLight * 0.5;
      c.b += cityGlowColor.b * belowLight * 0.5;

      // Cloud body itself (grey, lit from beneath).
      const lit = cloudBrightness * cloud * (0.25 + glowBand * 1.1);
      c.r += lit * (0.55 + cityGlowColor.r * 0.5);
      c.g += lit * (0.6 + cityGlowColor.g * 0.4);
      c.b += lit * (0.78 + cityGlowColor.b * 0.3);

      // Stars only where the deck breaks up.
      if (elevation > 0.05 && cloud < 0.12) {
        const s = fbm(u * 900, v * 900, 1, seed + 77);
        if (s > 1 - starDensity * 0.03) {
          const mag = (s - (1 - starDensity * 0.03)) / (starDensity * 0.03);
          const b = Math.pow(mag, 2) * 2.2 * (1 - cloud / 0.12);
          c.r += b * 0.8;
          c.g += b * 0.85;
          c.b += b;
        }
      }

      // Extra directional glow lobes (searchlights bouncing off the deck).
      if (opts.beams) {
        for (const beam of opts.beams) {
          let da = Math.abs(phi - beam.azimuth);
          if (da > Math.PI) da = Math.PI * 2 - da;
          const de = Math.abs(Math.asin(Math.max(-1, Math.min(1, elevation))) - beam.elevation);
          const d = Math.hypot(da, de) / beam.spread;
          const g = Math.exp(-d * d) * beam.intensity;
          c.r += beam.color.r * g;
          c.g += beam.color.g * g;
          c.b += beam.color.b * g;
        }
      }

      // Ground half: very dark, holds a hint of bounce so reflections aren't black.
      if (elevation < 0) {
        const k = Math.pow(-elevation, 0.6);
        c.multiplyScalar(1 - k * 0.82);
        c.r += 0.012 * k;
        c.g += 0.014 * k;
        c.b += 0.02 * k;
      }

      const i = (y * w + x) * 4;
      data[i] = Math.max(0, c.r);
      data[i + 1] = Math.max(0, c.g);
      data[i + 2] = Math.max(0, c.b);
      data[i + 3] = 1;
    }
  }

  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Convert an equirect sky into a PMREM environment map and attach it. */
export function applyEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  sky: THREE.Texture,
  opts: { showBackground?: boolean; envIntensity?: number; backgroundIntensity?: number; rotationY?: number } = {}
): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(sky).texture;
  scene.environment = env;
  scene.environmentIntensity = opts.envIntensity ?? 1;
  if (opts.showBackground !== false) {
    scene.background = sky;
    scene.backgroundIntensity = opts.backgroundIntensity ?? 1;
    scene.backgroundBlurriness = 0;
  }
  if (opts.rotationY) {
    scene.environmentRotation = new THREE.Euler(0, opts.rotationY, 0);
    scene.backgroundRotation = new THREE.Euler(0, opts.rotationY, 0);
  }
  pmrem.dispose();
  return env;
}

/**
 * Height-based fog. Exponential fog alone makes tall buildings vanish; this
 * shader-injected variant keeps the skyline readable while filling the street
 * with haze, and lets the fog take on the colour of nearby neon.
 */
export function setupFog(
  scene: THREE.Scene,
  color: THREE.ColorRepresentation,
  density: number
): THREE.FogExp2 {
  const fog = new THREE.FogExp2(color, density);
  scene.fog = fog;
  return fog;
}

/**
 * Screen-anchored haze cards. A handful of large, soft, additive quads that
 * always face the camera give the impression of drifting mist between the
 * camera and the subject for almost no cost.
 */
export class HazeField {
  readonly group = new THREE.Group();
  private cards: THREE.Sprite[] = [];
  private phases: number[] = [];

  constructor(
    count: number,
    opts: {
      color?: THREE.ColorRepresentation;
      radius?: number;
      height?: number;
      scale?: number;
      opacity?: number;
      texture?: THREE.Texture;
    } = {}
  ) {
    const radius = opts.radius ?? 14;
    const height = opts.height ?? 4;
    const scale = opts.scale ?? 9;
    const opacity = opts.opacity ?? 0.06;
    const tex = opts.texture;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex ?? null,
        color: opts.color ?? 0x9fc4ff,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      const s = new THREE.Sprite(mat);
      const a = (i / count) * Math.PI * 2 + Math.random();
      const r = radius * (0.35 + Math.random() * 0.65);
      s.position.set(Math.cos(a) * r, Math.random() * height, Math.sin(a) * r);
      const sc = scale * (0.6 + Math.random() * 0.8);
      s.scale.set(sc, sc * 0.55, 1);
      this.group.add(s);
      this.cards.push(s);
      this.phases.push(Math.random() * Math.PI * 2);
    }
    this.group.renderOrder = 5;
  }

  update(time: number): void {
    for (let i = 0; i < this.cards.length; i++) {
      const s = this.cards[i];
      const p = this.phases[i];
      s.position.x += Math.sin(time * 0.08 + p) * 0.004;
      s.position.y += Math.cos(time * 0.05 + p * 1.7) * 0.0016;
      const mat = s.material as THREE.SpriteMaterial;
      mat.rotation = Math.sin(time * 0.03 + p) * 0.25;
    }
  }

  setOpacity(v: number): void {
    for (const s of this.cards) (s.material as THREE.SpriteMaterial).opacity = v;
  }

  dispose(): void {
    for (const s of this.cards) (s.material as THREE.SpriteMaterial).dispose();
  }
}
