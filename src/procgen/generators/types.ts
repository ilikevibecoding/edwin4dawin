import type * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import type { SurfaceType } from '../../core/GameTypes';

/**
 * Resolution class relative to `QualityConfig.textureResolution`.
 *
 * Texel density is what matters, not raw resolution: a weapon material tiled
 * over 20 cm at 512 carries far more detail per millimetre than a road tiled
 * over 3 m at 1024. Classes are therefore assigned from tile size and screen
 * coverage together.
 */
export type ResolutionClass = 'hero' | 'high' | 'medium' | 'low';

export const RESOLUTION_SCALE: Record<ResolutionClass, number> = {
  hero: 1,
  high: 0.5,
  medium: 0.25,
  low: 0.125,
};

export interface PhysicalParams {
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  reflectivity?: number;
  specularIntensity?: number;
  sheen?: number;
  sheenRoughness?: number;
  sheenColor?: number;
  iridescence?: number;
  attenuationDistance?: number;
  attenuationColor?: number;
}

export interface MaterialParams {
  color?: number;
  /** Multiplies the roughness map. */
  roughness?: number;
  /** Multiplies the metalness map. */
  metalness?: number;
  normalScale?: number;
  envMapIntensity?: number;
  aoMapIntensity?: number;
  emissive?: number;
  emissiveIntensity?: number;
  /** Drive the emissive term from the baked albedo — used by the FX sprites. */
  emissiveFromAlbedo?: boolean;
  /**
   * Bind the packed set's R channel as the transmission map instead of as the
   * AO map. Glass has no meaningful occlusion but very much needs per-texel
   * transmission, and three samples `transmissionMap.r`, so the channel is
   * simply reused rather than paying for a third target.
   */
  transmissionFromAo?: boolean;
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
  blending?: THREE.Blending;
  flatShading?: boolean;
  dithering?: boolean;
  toneMapped?: boolean;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  /** Present when the surface genuinely needs MeshPhysicalMaterial. */
  physical?: PhysicalParams;
}

export interface MaterialSpec {
  id: MaterialId;
  /** Impact FX, footsteps and penetration all key off this. */
  surface: SurfaceType;
  /** GLSL body defining `void surface(vec2 uv, inout Surface s)`. */
  body: string;
  res: ResolutionClass;
  /**
   * Relief depth as a fraction of the tile size. The Sobel pass turns the
   * height channel into slopes with this, so it is resolution independent:
   * 0.004 is a smooth painted panel, 0.05 a deep corrugation.
   */
  relief: number;
  /** Blend towards the wide Sobel gradient; higher reads softer and rounder. */
  reliefWide?: number;
  maps?: {
    albedo?: boolean;
    /** Roughness, metalness and AO all come from the one packed texture. */
    orm?: boolean;
    normal?: boolean;
    ao?: boolean;
  };
  material?: MaterialParams;
  /** Metres of world space one UV tile is authored for. */
  tileMeters: number;
  /** Sprites and decals are single images, so they clamp rather than repeat. */
  clamp?: boolean;
  /** Baked during `init()` rather than on first `get()`. */
  eager?: boolean;
  uniforms?: Record<string, THREE.IUniform>;
}

export type MaterialSpecMap = Partial<Record<MaterialId, MaterialSpec>>;
