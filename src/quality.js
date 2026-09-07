// Quality / spectacle presets. "Cinematic" lets a capable PC run the disasters at full scale (more chunks relit per
// frame, bigger debris/particle pools, longer view distance) and the whole render stack (2 shadow cascades at 2048,
// bloom, normal/material maps, FXAA); "Balanced" keeps one 1024 cascade and bloom; "Light" keeps weak machines
// smooth: no shadows, no bloom, no HDR pass, the pre-rubric shaders with the colour atlas only. Selected from the
// admin panel, `?quality=` or localStorage. NOTE: the simulation budget (block edits per tick) is deliberately NOT part
// of a preset - it is the same on every client so that multiplayer replay stays deterministic; presets only change
// presentation-side budgets. `nearCap` is the largest ring of full chunks a preset streams: a view distance above it
// is served by the far-LOD heightmap layer (render/farlod.js), so `?rd=32` costs the chunk memory of the cap.
import { BUDGET } from './disasters/manager.js';

export const QUALITY = {
  cinematic: {
    label: 'Cinematic', description: 'Full-scale destruction and effects for a strong PC: sun shadows, bloom, HDR, FXAA',
    relightPerFrame: 6, remeshPerFrame: 14, maxDebris: 1800, restorePerTick: 900, renderDistance: 10, nearCap: 20, particleCap: 3000,
    post: true, shadows: 2, shadowRes: 2048, bloom: true, fxaa: true, materialMaps: true,
  },
  balanced: {
    label: 'Balanced', description: 'Big effects, tighter budgets: one shadow cascade, bloom, HDR',
    relightPerFrame: 4, remeshPerFrame: 8, maxDebris: 1000, restorePerTick: 600, renderDistance: 8, nearCap: 16, particleCap: 2000,
    post: true, shadows: 1, shadowRes: 1024, bloom: true, fxaa: false, materialMaps: true,
  },
  light: {
    label: 'Light', description: 'For laptops and integrated graphics: no shadows, no bloom, plain shading',
    relightPerFrame: 2, remeshPerFrame: 4, maxDebris: 400, restorePerTick: 320, renderDistance: 6, nearCap: 12, particleCap: 900,
    post: false, shadows: 0, shadowRes: 1024, bloom: false, fxaa: false, materialMaps: false,
  },
};
export const MAX_DEBRIS_POOL = QUALITY.cinematic.maxDebris;
const KEY = 'frontier-craft:quality';

// True when WebGL runs on a software rasterizer (SwiftShader, llvmpipe, ANGLE software): the first run then
// starts on Light instead of Cinematic.
export function isSoftwareRenderer(renderer) {
  try {
    const gl = renderer && renderer.getContext ? renderer.getContext() : null;
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String((ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '') || gl.getParameter(gl.RENDERER) || '');
    return /swiftshader|llvmpipe|software/i.test(name) && !/hardware/i.test(name);
  } catch (e) { return false; }
}

// Picks the preset: `?quality=` beats the saved choice; a fresh profile on a software renderer gets Light.
export function loadQualityName(params, renderer = null) {
  const q = params && params.get('quality');
  if (q && QUALITY[q]) return q;
  try { const s = localStorage.getItem(KEY); if (s && QUALITY[s]) return s; } catch (e) { /* no storage */ }
  if (renderer && isSoftwareRenderer(renderer)) return 'light';
  return 'cinematic';
}

// Applies a preset to the live game (safe to call at any time, including during a disaster).
export function applyQuality(game, name, { persist = true, renderDistance = true } = {}) {
  const q = QUALITY[name] || QUALITY.cinematic;
  BUDGET.relightPerFrame = q.relightPerFrame;
  BUDGET.remeshPerFrame = q.remeshPerFrame;
  BUDGET.maxDebris = q.maxDebris;
  BUDGET.restorePerTick = q.restorePerTick;
  if (game.disasters && game.disasters.debris) game.disasters.debris.cap = q.maxDebris;
  if (game.particles) game.particles.cap = q.particleCap;
  // a view distance the player picked explicitly (pause menu / panel) wins over the preset's default
  let explicit = null; try { explicit = parseInt(localStorage.getItem('frontier-craft:rd'), 10); } catch (e) { /* ignore */ }
  if (game.terrain && typeof game.terrain.setNearCap === 'function') game.terrain.setNearCap(q.nearCap);   // full chunks stream to min(rd, nearCap)
  if (renderDistance && game.terrain && !(explicit >= 2)) game.terrain.setRenderDistance(q.renderDistance);
  game.quality = name;
  if (game.pipeline) game.pipeline.applyPreset(q);   // shadows / bloom / FXAA / material maps switch live
  if (persist) { try { localStorage.setItem(KEY, name); } catch (e) { /* ignore */ } }
  return q;
}
