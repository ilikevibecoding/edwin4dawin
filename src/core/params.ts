/** URL parameters. Bench mode makes every frame reproducible:
 *   ?bench=aerial-a            select a canonical view (see bench/views.ts)
 *   &seed=1234                 world/traffic/cloud/boat seed (default 20260904)
 *   &time=13.5                 hour of day (0-24)
 *   &weather=clear|scattered|cloudy|storm
 *   &quality=low|medium|high|ultra
 *   &freeze=1                  hold simulation time at the view's fixed timestamp
 *   &dt=1/60                   fixed simulation timestep (seconds) instead of wall-clock
 *   &nohud=1                   hide DOM HUD (for clean frames)
 *   &w=1920&h=1080             force canvas resolution (otherwise window size)
 */
export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export type Weather = 'clear' | 'scattered' | 'cloudy' | 'storm';

/** Planar water reflection: render-target size as a fraction of the frame per quality level (0 = off). */
export const REFLECTION_SCALE: Record<Quality, number> = { low: 0.25, medium: 0.4, high: 0.5, ultra: 0.5 };
/** Planar water reflection: distance (m) beyond which buildings, props and terrain rings are left out of the mirror image. */
export const REFLECTION_RANGE: Record<Quality, number> = { low: 2500, medium: 3500, high: 5000, ultra: 6000 };

export interface Params {
  bench: string | null;
  seed: number;
  time: number | null;
  weather: Weather | null;
  quality: Quality;
  freeze: boolean;
  fixedDt: number | null;
  noHud: boolean;
  width: number | null;
  height: number | null;
  autostart: boolean;
  grid: boolean;
  debug: boolean;
  debugRoads: boolean;
  /** comma-separated debug switches: noterrain, noshadow, nowake, noveg, nocity, norefl (no water reflection pass), reflview (blit the mirror image over the frame), cascades (tint lit surfaces by shadow cascade and shadow term), nobloom (composite without the bloom term, for A/B of what blooms) */
  dbg: Set<string>;
}

export function readParams(): Params {
  const q = new URLSearchParams(window.location.search);
  const num = (k: string): number | null => {
    const v = q.get(k);
    if (v === null || v === '') return null;
    if (v.includes('/')) {
      const [a, b] = v.split('/').map(Number);
      return b ? a / b : null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const quality = (q.get('quality') as Quality | null) ?? 'high';
  return {
    bench: q.get('bench'),
    seed: num('seed') ?? 20260904,
    time: num('time'),
    weather: (q.get('weather') as Weather | null) ?? null,
    quality: ['low', 'medium', 'high', 'ultra'].includes(quality) ? quality : 'high',
    freeze: q.get('freeze') === '1',
    fixedDt: num('dt'),
    noHud: q.get('nohud') === '1',
    width: num('w'),
    height: num('h'),
    autostart: q.get('autostart') === '1' || q.get('bench') !== null,
    grid: q.get('grid') === '1',
    debug: q.get('debug') === '1',
    debugRoads: q.get('debugroads') === '1',
    dbg: new Set((q.get('dbg') ?? '').split(',').filter(Boolean)),
  };
}
