import * as THREE from 'three';
import { Rng } from '../core/Rng';
import type { DisposalRegistry } from '../core/disposal';
import type { QualitySettings } from '../core/Quality';
import {
  makeControlPanelTexture,
  makeGlowSprite,
  makeNormalFromHeight,
  makePanelTexture,
  makeSmokeSprite,
  makeWindowTexture,
} from './textures';

/** The production's colour script, in one place. */
export const PALETTE = {
  rebelHull: 0xd7d2c6,
  rebelHullShadow: 0x9b968b,
  rebelTrim: 0x9d3d29,
  rebelDark: 0x39393c,
  imperialHull: 0x9aa0a8,
  imperialHullDark: 0x5d636c,
  imperialTrench: 0x373c44,
  imperialAccent: 0x2b3038,
  engineBlue: 0xbcd8ff,
  engineRebel: 0xff9d5c,
  turbolaserGreen: 0x86ff72,
  rebelBoltRed: 0xff4230,
  imperialBoltRed: 0xff3a24,
  rebelBoltBlue: 0x4fd8ff,
  saberRed: 0xff2b1e,
  hologram: 0x8fe8ff,
  alarmRed: 0xff3a2a,
  amber: 0xffb765,
  sandLit: 0xffd9a0,
  sandShadow: 0x6b4f33,
  vaderBlack: 0x121317,
  stormtrooperWhite: 0xe9e9ea,
  leiaWhite: 0xf2f0ea,
  goldDroid: 0xd9a930,
  r2Blue: 0x2f6fd0,
  r2White: 0xdcdde0,
} as const;

export interface ShipMaterialSet {
  hull: THREE.MeshStandardMaterial;
  hullDark: THREE.MeshStandardMaterial;
  trench: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  greeble: THREE.MeshStandardMaterial;
  windows: THREE.MeshStandardMaterial;
  engineCore: THREE.MeshBasicMaterial;
  engineHalo: THREE.SpriteMaterial;
}

/**
 * Central material library. Materials are shared across every instance of a
 * given asset so the whole production runs on a small number of programs.
 */
export class MaterialLibrary {
  readonly registry: DisposalRegistry;
  private rng: Rng;
  private quality: QualitySettings;

  readonly glowSprite: THREE.CanvasTexture;
  readonly softGlowSprite: THREE.CanvasTexture;
  readonly smokeSprite: THREE.CanvasTexture;
  readonly sparkSprite: THREE.CanvasTexture;

  readonly rebel: ShipMaterialSet;
  readonly imperial: ShipMaterialSet;

  readonly interiorWall: THREE.MeshStandardMaterial;
  readonly interiorWallDark: THREE.MeshStandardMaterial;
  readonly interiorFloor: THREE.MeshStandardMaterial;
  readonly interiorTrim: THREE.MeshStandardMaterial;
  readonly interiorLight: THREE.MeshStandardMaterial;
  readonly controlPanel: THREE.MeshStandardMaterial;
  readonly doorMetal: THREE.MeshStandardMaterial;

  readonly characterCache = new Map<string, THREE.MeshStandardMaterial>();

  constructor(registry: DisposalRegistry, quality: QualitySettings, seed = 'materials') {
    this.registry = registry;
    this.quality = quality;
    this.rng = new Rng(seed);

    const aniso = quality.anisotropy;

    this.glowSprite = registry.track(makeGlowSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 1.5));
    this.softGlowSprite = registry.track(makeGlowSprite('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)', 2.6));
    this.smokeSprite = registry.track(makeSmokeSprite(this.rng.fork('smoke')));
    this.sparkSprite = registry.track(makeGlowSprite('rgba(255,255,255,1)', 'rgba(255,180,90,0)', 3.2));

    // --- Rebel blockade runner: off-white, weathered, warm. ---
    const rebelPanel = registry.track(
      makePanelTexture(this.rng.fork('rebel-hull'), {
        size: 512, base: 0.8, variation: 0.075, cells: 7, seam: 0.42,
        streaks: 0.9, scorch: 0.5, rivets: true, anisotropy: aniso,
      }),
    );
    const rebelNormal = registry.track(makeNormalFromHeight(rebelPanel, 1.7));
    const rebelGreebleTex = registry.track(
      makePanelTexture(this.rng.fork('rebel-greeble'), {
        size: 256, base: 0.55, variation: 0.16, cells: 10, seam: 0.5, streaks: 0.5, anisotropy: aniso,
      }),
    );

    this.rebel = {
      hull: this.std('rebel-hull', {
        color: PALETTE.rebelHull, roughness: 0.62, metalness: 0.18,
        map: rebelPanel, normalMap: rebelNormal, normalScale: new THREE.Vector2(0.8, 0.8),
        roughnessMap: rebelPanel,
      }),
      hullDark: this.std('rebel-hull-dark', {
        color: PALETTE.rebelHullShadow, roughness: 0.72, metalness: 0.2, map: rebelPanel, normalMap: rebelNormal,
      }),
      trench: this.std('rebel-trench', { color: PALETTE.rebelDark, roughness: 0.85, metalness: 0.35, map: rebelGreebleTex }),
      trim: this.std('rebel-trim', { color: PALETTE.rebelTrim, roughness: 0.7, metalness: 0.15 }),
      greeble: this.std('rebel-greeble', { color: 0x8d8a80, roughness: 0.75, metalness: 0.4, map: rebelGreebleTex }),
      windows: this.emissiveWindows('rebel-windows', 24, 3, '#ffd9a8', 0.8),
      engineCore: this.basic('rebel-engine', 0xfff0d8),
      engineHalo: this.spriteMat('rebel-engine-halo', PALETTE.engineRebel, this.glowSprite),
    };

    // --- Imperial destroyer: desaturated grey, hard edged, cold. ---
    const impPanel = registry.track(
      makePanelTexture(this.rng.fork('imp-hull'), {
        size: 512, base: 0.72, variation: 0.09, cells: 9, seam: 0.45,
        streaks: 0.25, scorch: 0.12, rivets: true, anisotropy: aniso,
      }),
    );
    const impNormal = registry.track(makeNormalFromHeight(impPanel, 1.9));
    const impGreebleTex = registry.track(
      makePanelTexture(this.rng.fork('imp-greeble'), {
        size: 256, base: 0.45, variation: 0.2, cells: 12, seam: 0.55, anisotropy: aniso,
      }),
    );

    this.imperial = {
      hull: this.std('imp-hull', {
        color: PALETTE.imperialHull, roughness: 0.68, metalness: 0.32,
        map: impPanel, normalMap: impNormal, normalScale: new THREE.Vector2(0.9, 0.9), roughnessMap: impPanel,
      }),
      hullDark: this.std('imp-hull-dark', {
        color: PALETTE.imperialHullDark, roughness: 0.7, metalness: 0.4, map: impPanel, normalMap: impNormal,
      }),
      trench: this.std('imp-trench', { color: PALETTE.imperialTrench, roughness: 0.8, metalness: 0.45, map: impGreebleTex }),
      trim: this.std('imp-trim', { color: PALETTE.imperialAccent, roughness: 0.6, metalness: 0.55 }),
      greeble: this.std('imp-greeble', { color: 0x767d86, roughness: 0.72, metalness: 0.5, map: impGreebleTex }),
      windows: this.emissiveWindows('imp-windows', 40, 6, '#c9e2ff', 0.9),
      engineCore: this.basic('imp-engine', 0xe6f2ff),
      engineHalo: this.spriteMat('imp-engine-halo', PALETTE.engineBlue, this.glowSprite),
    };

    // --- Blockade runner interior: warm off-white, scuffed. ---
    const wallTex = registry.track(
      makePanelTexture(this.rng.fork('wall'), {
        size: 512, base: 0.85, variation: 0.045, cells: 5, seam: 0.3,
        streaks: 0.5, scorch: 0.35, anisotropy: aniso,
      }),
    );
    const wallNormal = registry.track(makeNormalFromHeight(wallTex, 1.2));
    const floorTex = registry.track(
      makePanelTexture(this.rng.fork('floor'), {
        size: 512, base: 0.4, variation: 0.09, cells: 8, seam: 0.6, streaks: 0.8, scorch: 0.5, anisotropy: aniso,
      }),
    );

    this.interiorWall = this.std('wall', {
      color: 0xe6e2d8, roughness: 0.66, metalness: 0.08,
      map: wallTex, normalMap: wallNormal, normalScale: new THREE.Vector2(0.55, 0.55),
    });
    this.interiorWallDark = this.std('wall-dark', { color: 0x9b978d, roughness: 0.72, metalness: 0.12, map: wallTex });
    this.interiorFloor = this.std('floor', { color: 0x6e6a63, roughness: 0.78, metalness: 0.18, map: floorTex });
    this.interiorTrim = this.std('trim', { color: 0x4c4a48, roughness: 0.5, metalness: 0.55 });
    this.interiorLight = this.std('ceil-light', {
      color: 0xfff4e2, roughness: 0.3, metalness: 0, emissive: 0xfff0dc, emissiveIntensity: 2.2,
    });
    this.controlPanel = this.std('control-panel', {
      color: 0x2a2e36, roughness: 0.45, metalness: 0.5,
      emissive: 0xffffff, emissiveIntensity: 1.1,
      emissiveMap: registry.track(makeControlPanelTexture(this.rng.fork('panel'))),
    });
    this.doorMetal = this.std('door', { color: 0xbfbab0, roughness: 0.48, metalness: 0.55, map: wallTex, normalMap: wallNormal });
  }

  private std(key: string, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial(params);
    m.name = key;
    this.registry.track(m);
    return m;
  }

  private basic(key: string, color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    m.name = key;
    this.registry.track(m);
    return m;
  }

  private spriteMat(key: string, color: THREE.ColorRepresentation, map: THREE.Texture): THREE.SpriteMaterial {
    const m = new THREE.SpriteMaterial({
      map, color, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    });
    m.name = key;
    this.registry.track(m);
    return m;
  }

  private emissiveWindows(key: string, cols: number, rows: number, color: string, chance: number): THREE.MeshStandardMaterial {
    const tex = this.registry.track(makeWindowTexture(this.rng.fork(key), cols, rows, color, chance));
    return this.std(key, {
      color: 0x14161a, roughness: 0.4, metalness: 0.3,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 2.4, map: tex,
    });
  }

  /** Flat-ish character material, cached by colour so a crowd shares programs. */
  character(color: THREE.ColorRepresentation, roughness = 0.62, metalness = 0.12): THREE.MeshStandardMaterial {
    const key = `${new THREE.Color(color).getHexString()}-${roughness}-${metalness}`;
    let m = this.characterCache.get(key);
    if (!m) {
      m = this.std(`char-${key}`, { color, roughness, metalness });
      this.characterCache.set(key, m);
    }
    return m;
  }

  /** Unlit, tone-mapping-exempt material for energy: bolts, sabers, holograms. */
  energy(color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial {
    const m = new THREE.MeshBasicMaterial({
      color, toneMapped: false, transparent: opacity < 1, opacity,
      blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: opacity >= 1,
    });
    this.registry.track(m);
    return m;
  }

  additiveSprite(color: THREE.ColorRepresentation, map = this.glowSprite, opacity = 1): THREE.SpriteMaterial {
    const m = new THREE.SpriteMaterial({
      map, color, transparent: true, opacity, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    });
    this.registry.track(m);
    return m;
  }

  get qualitySettings(): QualitySettings {
    return this.quality;
  }
}
