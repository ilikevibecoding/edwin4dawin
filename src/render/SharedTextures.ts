import type * as THREE from 'three';
import {
  asphaltSurface,
  concreteSurface,
  fabricSurface,
  facadeMaps,
  metalSurface,
  radialSprite,
  rippleNormal,
  shaftGradient,
  type SurfaceMaps,
} from './Textures';

/**
 * Procedural textures are expensive to synthesise (they are CPU loops over half
 * a million pixels), so every surface in the game shares one lazily built set.
 */
class SharedTextureCache {
  private cache = new Map<string, unknown>();

  private get<T>(key: string, build: () => T): T {
    let v = this.cache.get(key) as T | undefined;
    if (v === undefined) {
      v = build();
      this.cache.set(key, v);
    }
    return v;
  }

  get concrete(): SurfaceMaps {
    return this.get('concrete', () => concreteSurface({ size: 512, repeat: 5 }));
  }

  get concreteFine(): SurfaceMaps {
    return this.get('concreteFine', () => concreteSurface({ size: 384, repeat: 14, seed: 8 }));
  }

  get asphalt(): SurfaceMaps {
    return this.get('asphalt', () => asphaltSurface({ size: 512, repeat: 7 }));
  }

  get metal(): SurfaceMaps {
    return this.get('metal', () => metalSurface({ size: 384, repeat: 2 }));
  }

  get metalFine(): SurfaceMaps {
    return this.get('metalFine', () => metalSurface({ size: 384, repeat: 6, seed: 66, panel: 12 }));
  }

  get ceramic(): SurfaceMaps {
    return this.get('ceramic', () => metalSurface({ size: 256, repeat: 1, seed: 202, panel: 3 }));
  }

  get darkFabric(): SurfaceMaps {
    return this.get('darkFabric', () => fabricSurface({ size: 384, repeat: 4, tint: [0.075, 0.085, 0.105] }));
  }

  get paleFabric(): SurfaceMaps {
    return this.get('paleFabric', () =>
      fabricSurface({ size: 384, repeat: 4, tint: [0.5, 0.53, 0.58], seed: 33 })
    );
  }

  get facade(): ReturnType<typeof facadeMaps> {
    return this.get('facade', () => facadeMaps(512, 5, { litChance: 0.4 }));
  }

  get facadeDense(): ReturnType<typeof facadeMaps> {
    return this.get('facadeDense', () => facadeMaps(512, 19, { litChance: 0.3, cols: 22, rows: 40 }));
  }

  get ripple(): THREE.CanvasTexture {
    return this.get('ripple', () => rippleNormal(256, 61));
  }

  get glow(): THREE.CanvasTexture {
    return this.get('glow', () => radialSprite(96, 0.18, 'rgba(255,255,255,1)'));
  }

  get softGlow(): THREE.CanvasTexture {
    return this.get('softGlow', () => radialSprite(128, 0.02, 'rgba(255,255,255,0.9)'));
  }

  get shaft(): THREE.CanvasTexture {
    return this.get('shaft', () => shaftGradient(64));
  }
}

export const Tex = new SharedTextureCache();
