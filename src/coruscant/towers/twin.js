// Family 5: twin towers. Two matching shafts on either side of a five-wide covered arcade centred on the lot's
// door column; each shaft's lobby faces the arcade, glazed skybridges join the shafts every eight floors, and at
// the boulevard level a full-depth sky gallery carries the gangway door into both sky lobbies.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { buildTiered } from './tiered.js';

export const TWIN_MIN = 38;   // lot width (along the front) needed for two 16-wide shafts and the arcade

export function twin(bp, lot, ctx) {
  const { nF, rng, midDoorF, spec } = ctx;
  const front = spec.front;
  const alongX = front === 'N' || front === 'S';      // shafts side by side along x, arcade runs along z
  const w = bp.w, d = bp.d;
  const L = alongX ? w : d, T = alongX ? d : w;        // L across the shafts, T along the arcade
  const mid = L >> 1;
  const g0 = mid - 2, g1 = mid + 2;                    // arcade cells across
  const ta = 0, tb = T - 1;
  // rects for the two shafts (local, inclusive)
  const rectA = alongX ? { x0: 0, x1: g0 - 1, z0: 0, z1: d - 1 } : { x0: 0, x1: w - 1, z0: 0, z1: g0 - 1 };
  const rectB = alongX ? { x0: g1 + 1, x1: w - 1, z0: 0, z1: d - 1 } : { x0: 0, x1: w - 1, z0: g1 + 1, z1: d - 1 };
  const frontA = alongX ? 'E' : 'S', frontB = alongX ? 'W' : 'N';
  const dc = T >> 1;                                   // door position along the arcade for both shafts
  const doorA = alongX ? { x: g0 - 1, z: dc } : { x: dc, z: g0 - 1 };
  const doorB = alongX ? { x: g1 + 1, z: dc } : { x: dc, z: g1 + 1 };
  const crownFloors = nF >= 12 ? 2 : 0;
  const tiersOf = () => {
    const baseEnd = Math.max(midDoorF, 1, nF - 1 - crownFloors);
    const t = [{ f0: 0, f1: baseEnd }];
    if (baseEnd < nF - 1) t.push({ f0: baseEnd + 1, f1: nF - 1, inset: { l: 1, r: 1, f: 1, b: 1 } });
    return t;
  };
  // each shaft takes the lot's envelope plan (octagon / rounded shells receding along the arcade and at the back;
  // the arcade face stays straight so the skybridges land on a wall); lots without a plan keep the legacy shafts
  const shaftSpec = (rect, frontS, door) => {
    if (!ctx.envelope) return { tiers: tiersOf() };
    const env = ctx.envelope({ ext: rect, front: frontS, door, deck: false, noInset: ['f'] });
    return { tiers: env.tiers, mask: env.mask, env };
  };
  const resA = buildTiered(bp, { ...spec, ext: rectA, front: frontA, door: doorA, ...shaftSpec(rectA, frontA, doorA), family: 'twin' });
  const resB = buildTiered(bp, { ...spec, ext: rectB, front: frontB, door: doorB, ...shaftSpec(rectB, frontB, doorB), family: 'twin', hooks: { crownKind: spec.style.crown === 'antenna' ? 'fins' : 'antenna' } });

  // helpers addressing arcade cells: a = across (g0..g1), t = along (0..T-1)
  const P = (a, y, t, id) => { if (alongX) bp.set(a, y, t, id); else bp.set(t, y, a, id); };
  // ground arcade: deck floor, lamp posts along both sides, glass canopy at the first ceiling
  for (let t = ta; t <= tb; t++) for (let a = g0; a <= g1; a++) {
    P(a, 0, t, (a === g0 || a === g1) && t % 6 === 3 ? B.GLOW_PANEL : B.DECK_PLATE);
    if ((a === g0 || a === g1) && t % 6 === 0 && t > 0 && t < T - 1) { P(a, 1, t, B.IRON_BARS); P(a, 2, t, B.IRON_BARS); P(a, 3, t, B.CITY_LAMP); }
    P(a, 5, t, a === g0 || a === g1 ? B.DURASTEEL : (t % 4 === 2 && a === mid ? B.GLOW_PANEL : B.STEEL_GLASS));
  }
  // skybridges across the arcade: full-depth sky gallery at the boulevard level, short glass tubes every 8 floors
  const bridgeAt = (f, t0, t1, openEnds) => {
    const y = 5 * f;
    for (let t = t0; t <= t1; t++) for (let a = g0; a <= g1; a++) {
      P(a, y, t, B.DECK_PLATE);
      const side = a === g0 || a === g1, end = t === t0 || t === t1;
      const wallish = side || (end && !openEnds);
      P(a, y + 1, t, wallish ? B.STEEL_GLASS : FORCE_AIR);
      P(a, y + 2, t, wallish ? B.STEEL_GLASS : FORCE_AIR);
      P(a, y + 3, t, side || end ? B.DURASTEEL_DARK : (t % 4 === 0 ? B.GLOW_PANEL : B.DURASTEEL_DARK));
    }
    // openings into both shafts (3 wide, 2 high) at the door column + a vestibule inside
    for (let k = -1; k <= 1; k++) for (let s = 0; s <= 2; s++) {
      P(g0 - 1 - s, y + 1, dc + k, FORCE_AIR); P(g0 - 1 - s, y + 2, dc + k, FORCE_AIR);
      P(g1 + 1 + s, y + 1, dc + k, FORCE_AIR); P(g1 + 1 + s, y + 2, dc + k, FORCE_AIR);
      if (s > 0) { P(g0 - 1 - s, y, dc + k, B.DECK_PLATE); P(g1 + 1 + s, y, dc + k, B.DECK_PLATE); }
    }
  };
  if (midDoorF >= 2 && midDoorF < nF) {
    bridgeAt(midDoorF, ta, tb, false);
    // the gangway door: 3 wide, 3 high in the front end wall of the gallery
    const tEnd = (front === 'S' || front === 'E') ? tb : ta;
    for (let a = mid - 1; a <= mid + 1; a++) { P(a, 5 * midDoorF + 1, tEnd, FORCE_AIR); P(a, 5 * midDoorF + 2, tEnd, FORCE_AIR); P(a, 5 * midDoorF + 3, tEnd, B.GLOW_PANEL); }
  }
  for (let f = 5; f <= nF - 3; f += 8) { if (f === midDoorF) continue; bridgeAt(f, dc - 2, dc + 2, false); }
  return { ...resA, twinB: resB, doors: [doorA, doorB], nF: Math.max(resA.nF, resB.nF), extra: Math.max(resA.extra, resB.extra) };
}
