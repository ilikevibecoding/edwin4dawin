/**
 * Quality tiers and resolution scaling. Owner: Opus 4.
 *
 * The tier is chosen automatically from the reported GPU (a software rasteriser drops straight
 * to low so automation and weak hardware behave the same), and can be overridden from the
 * settings menu or a `?quality=` URL parameter.
 */
import type { QualityProfile, QualityTier } from './Types';

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: {
    tier: 'low',
    shadowMapSize: 512,
    shadowsEnabled: false,
    maxDynamicLights: 3,
    anisotropy: 1,
    textureScale: 0.5,
    ssaoEnabled: false,
    bloomEnabled: false,
    antialias: 'none',
    particleScale: 0.4,
    decalBudget: 40,
    drawDistance: 70,
    reflectionProbe: false,
  },
  medium: {
    tier: 'medium',
    shadowMapSize: 1024,
    shadowsEnabled: true,
    maxDynamicLights: 6,
    anisotropy: 4,
    textureScale: 0.75,
    ssaoEnabled: false,
    bloomEnabled: true,
    antialias: 'fxaa',
    particleScale: 0.7,
    decalBudget: 90,
    drawDistance: 110,
    reflectionProbe: true,
  },
  high: {
    tier: 'high',
    shadowMapSize: 2048,
    shadowsEnabled: true,
    maxDynamicLights: 10,
    anisotropy: 8,
    textureScale: 1,
    ssaoEnabled: true,
    bloomEnabled: true,
    antialias: 'smaa',
    particleScale: 1,
    decalBudget: 160,
    drawDistance: 160,
    reflectionProbe: true,
  },
  ultra: {
    tier: 'ultra',
    shadowMapSize: 2048,
    shadowsEnabled: true,
    maxDynamicLights: 14,
    anisotropy: 16,
    textureScale: 1,
    ssaoEnabled: true,
    bloomEnabled: true,
    antialias: 'smaa',
    particleScale: 1.35,
    decalBudget: 240,
    drawDistance: 220,
    reflectionProbe: true,
  },
};

/** Inspect the WebGL renderer string to pick a sane starting tier. */
export function detectQualityTier(gl: WebGL2RenderingContext | WebGLRenderingContext | null): QualityTier {
  const params = new URLSearchParams(location.search);
  const forced = params.get('quality');
  if (forced && forced in QUALITY_PROFILES) return forced as QualityTier;

  if (!gl) return 'medium';
  let renderer = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
    if (!renderer) renderer = String(gl.getParameter(gl.RENDERER) ?? '');
  } catch {
    renderer = '';
  }
  const r = renderer.toLowerCase();
  if (r.includes('swiftshader') || r.includes('llvmpipe') || r.includes('software')) return 'low';
  if (r.includes('intel') && !r.includes('arc')) return 'medium';
  return 'high';
}

export function profileFor(tier: QualityTier): QualityProfile {
  return QUALITY_PROFILES[tier];
}
