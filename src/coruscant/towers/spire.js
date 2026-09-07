// Family 9: 500-Republica spire (rubric 11, reference 1; rubric 18 rules 1, 6, 12). Stacked rounded shells from the
// envelope plan (rounded / stacked discs / ellipse / octagon, receding two cells a step) with a flat entrance face,
// the palette's bronze or pale panel field with chrome ribs, lit vertical strips every four blocks running the full
// height above the podium, terrace rings with railings on every setback, and the 'spire' crown: two more rounded
// tiers, a dome and a lit finial. Lots without an envelope carve the legacy superellipse tiers.
import { B } from '../../blocks.js';
import { PlanFrame, computeLayout, insetLimits } from '../plan.js';
import { buildTiered } from './tiered.js';
import { envelopeSpec } from './slab.js';

export const SPIRE_MIN = 18;          // smallest lot side that still leaves >= 2 rooms a floor inside a rounded footprint
const P = 3.2;                        // superellipse exponent: rounded square

export function spire(bp, lot, ctx) {
  const { nF, midDoorF, spec } = ctx;
  const style = ctx.style;
  style.corner = B.CHROME; style.mullion = B.CHROME;
  if (style.rhythm === 'curtain') style.period = 4;    // chrome rib every 4 cells, the lit strip runs between them
  style.railing = B.IRON_BARS;
  const hooks = {
    crownKind: 'dome',
    afterTier: (t, yRoof, fr, layout, all) => {
      // terrace lamps on the setback roofs just inside the railing
      if (t.index === all.length - 1) return;
      for (const c of t.ring) {
        if (c.along % 7 !== 3 || c.corner) continue;
        const [ox, oz] = c.face === 'N' ? [0, 1] : c.face === 'S' ? [0, -1] : c.face === 'W' ? [1, 0] : c.face === 'E' ? [-1, 0] : [0, 0];
        const x = c.x + ox, z = c.z + oz;
        // open terrace only: a roof under the cell and open sky above it (the next tier's slab would be at +5)
        if ((ox || oz) && bp.isAir(x, yRoof + 1, z) && bp.isAir(x, yRoof + 2, z) && bp.isAir(x, yRoof + 5, z) && !bp.isAir(x, yRoof, z)) { bp.set(x, yRoof + 1, z, B.IRON_BARS); bp.set(x, yRoof + 2, z, B.CITY_LAMP); }
      }
    },
  };
  const es = envelopeSpec(ctx);
  if (es) return buildTiered(bp, { ...spec, ...es, family: 'spire', hooks });

  const front = spec.front;
  const frame = new PlanFrame(spec.ext, front);
  const lim = insetLimits(frame, computeLayout(frame.Iu, frame.Iv));
  const nT = nF >= 20 ? 4 : nF >= 12 ? 3 : 2;
  const firstEnd = Math.max(midDoorF, 1, Math.floor(nF * 0.38));
  const tiers = [{ f0: 0, f1: firstEnd }];
  let f = firstEnd + 1;
  const per = Math.max(1, Math.round((nF - f) / Math.max(1, nT - 1)));
  for (let k = 1; k < nT && f < nF; k++) {
    const f1 = k === nT - 1 ? nF - 1 : Math.min(nF - 1, f + per - 1);
    const a = 2 * k;
    tiers.push({ f0: f, f1, inset: { l: Math.min(a, lim.l), r: Math.min(a, lim.r), f: Math.min(a, lim.f), b: Math.min(a, lim.b) } });
    f = f1 + 1;
  }
  if (f < nF) tiers[tiers.length - 1].f1 = nF - 1;
  // rounded footprint per tier; the podium keeps a flat entrance face three rows deep so the door and the
  // boulevard gangway meet a straight wall (the superellipse terms are separable: tabulated per tier rect)
  let cacheE = null, px = null, pz = null;
  const mask = (x, z, i, e) => {
    if (e !== cacheE) {
      cacheE = e;
      const rx = (e.x1 - e.x0 + 1) / 2, rz = (e.z1 - e.z0 + 1) / 2;
      px = new Float64Array(e.x1 - e.x0 + 1); pz = new Float64Array(e.z1 - e.z0 + 1);
      for (let xx = e.x0; xx <= e.x1; xx++) px[xx - e.x0] = Math.pow(Math.abs(xx + 0.5 - (e.x0 + rx)) / rx, P);
      for (let zz = e.z0; zz <= e.z1; zz++) pz[zz - e.z0] = Math.pow(Math.abs(zz + 0.5 - (e.z0 + rz)) / rz, P);
    }
    const ax = px[x - e.x0], az = pz[z - e.z0];
    if (ax + az <= 1) return true;
    if (i > 0) return false;
    const nearFront = (front === 'S' && e.z1 - z <= 2) || (front === 'N' && z - e.z0 <= 2) || (front === 'E' && e.x1 - x <= 2) || (front === 'W' && x - e.x0 <= 2);
    return nearFront && (front === 'S' || front === 'N' ? ax : az) <= Math.pow(0.8, P);
  };
  return buildTiered(bp, { ...spec, tiers, family: 'spire', mask, hooks });
}
