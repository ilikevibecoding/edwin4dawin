// Family 11: Zakuul needle (rubric 11, reference 3). A dark faceted blade: a slender chamfered shaft with tall slit
// windows and blue lit strips, one or two shallow setbacks in its upper third (the lot's floor plan only lets a
// footprint recede where the lift core is not, so the body stays straight and the taper is left to the crown), a
// holo-sign band under the top, and the 'needle' crown: a glass lookout under a solid tip that tapers from the full
// footprint to a lit apex, with blue edge lights and chrome fins.
import { B } from '../../blocks.js';
import { PlanFrame, computeLayout, insetLimits } from '../plan.js';
import { buildTiered } from './tiered.js';

export const NEEDLE_MIN = 16;

export function needle(bp, lot, ctx) {
  const { nF, rng, midDoorF, spec } = ctx;
  const style = ctx.style;
  style.wall = rng.pick([B.PANEL_BLACK, B.DURASTEEL_DARK, B.DURASTEEL_DARK]);
  style.corner = rng.pick([B.CHROME, B.DURASTEEL]); style.mullion = B.CHROME;
  style.band = B.CHROME; style.trim = rng.pick([B.CHROME, B.GLOW_PANEL_BLUE]);
  style.rhythm = 'slit';
  style.roof = B.DURASTEEL_DARK;
  style.railing = B.IRON_BARS;
  style.signs = true;
  const frame = new PlanFrame(spec.ext, spec.front);
  const lim = insetLimits(frame, computeLayout(frame.Iu, frame.Iv));
  const firstEnd = Math.max(midDoorF, 1, Math.floor(nF * 0.62));
  const tiers = [{ f0: 0, f1: firstEnd }];
  const sym = Math.min(lim.l, lim.r) >= 2 && Math.min(lim.f, lim.b) >= 2;   // wide lots: the core is central, recede evenly
  if (firstEnd < nF - 1) {
    const mid = Math.min(nF - 1, firstEnd + Math.max(2, Math.floor((nF - 1 - firstEnd) / 2)));
    const step = (k) => (sym ? { l: 2 * k, r: 2 * k, f: 2 * k, b: 2 * k } : { l: Math.min(lim.l, k), r: Math.min(lim.r, k), f: Math.min(lim.f, k), b: Math.min(lim.b, k) });
    tiers.push({ f0: firstEnd + 1, f1: mid, inset: step(1) });
    if (mid < nF - 1) tiers.push({ f0: mid + 1, f1: nF - 1, inset: step(2) });
  }
  // faceted corners on the shaft tiers above the podium (a rect-shaped mask keeps the podium on the fast path)
  const mask = (x, z, i, e) => {
    if (i === 0) return true;
    const w = e.x1 - e.x0 + 1, d = e.z1 - e.z0 + 1;
    const c = Math.min(3, Math.max(2, Math.floor(Math.min(w, d) * 0.15)));
    const a = x - e.x0, b = z - e.z0, a2 = e.x1 - x, b2 = e.z1 - z;
    return a + b >= c && a2 + b >= c && a + b2 >= c && a2 + b2 >= c;
  };
  const hooks = {
    crownKind: 'fins',
    afterTier: (t, yRoof, fr, layout, all) => {
      // blue edge lights along each setback parapet: the taper reads as lit facets at night
      if (t.index === all.length - 1) return;
      for (const c of t.ring) if (!c.corner && c.along % 4 === 1 && bp.get(c.x, yRoof + 1, c.z) === B.IRON_BARS) bp.set(c.x, yRoof + 1, c.z, B.GLOW_PANEL_BLUE);
    },
  };
  return buildTiered(bp, { ...spec, tiers, family: 'needle', mask, hooks });
}
