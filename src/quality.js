// Quality / spectacle presets. "Cinematic" lets a capable PC run the disasters at full scale (more chunks relit per
// frame, bigger debris/particle pools, longer view distance); "Light" keeps weak machines smooth. Selected from the
// admin panel, `?quality=` or localStorage. NOTE: the simulation budget (block edits per tick) is deliberately NOT part
// of a preset - it is the same on every client so that multiplayer replay stays deterministic; presets only change
// presentation-side budgets.
import { BUDGET } from './disasters/manager.js';

export const QUALITY = {
  cinematic: { label: 'Cinematic', description: 'Full-scale destruction and effects for a strong PC', relightPerFrame: 6, remeshPerFrame: 14, maxDebris: 1800, restorePerTick: 900, renderDistance: 10, particleCap: 3000 },
  balanced: { label: 'Balanced', description: 'Big effects, tighter budgets', relightPerFrame: 4, remeshPerFrame: 8, maxDebris: 1000, restorePerTick: 600, renderDistance: 8, particleCap: 2000 },
  light: { label: 'Light', description: 'For laptops and integrated graphics', relightPerFrame: 2, remeshPerFrame: 4, maxDebris: 400, restorePerTick: 320, renderDistance: 6, particleCap: 900 },
};
export const MAX_DEBRIS_POOL = QUALITY.cinematic.maxDebris;
const KEY = 'frontier-craft:quality';

export function loadQualityName(params) {
  const q = params && params.get('quality');
  if (q && QUALITY[q]) return q;
  try { const s = localStorage.getItem(KEY); if (s && QUALITY[s]) return s; } catch (e) { /* no storage */ }
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
  if (renderDistance && game.terrain) game.terrain.setRenderDistance(q.renderDistance);
  game.quality = name;
  if (persist) { try { localStorage.setItem(KEY, name); } catch (e) { /* ignore */ } }
  return q;
}
