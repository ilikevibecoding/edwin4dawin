// Family 10: spine tower (rubric 11, reference 2). Two dark slabs of different heights stand either side of a
// five-wide arcade that holds a 3x3 GLOW_PANEL_BLUE spine column running from the ground through every sky bridge
// to a lit tip above both roofs. Glass sky-lobby bridges join the slabs every six floors, cantilevered landing decks
// hang off the back faces every ~30 blocks, blue lit strips run the facades and each slab ends in lit fins (crown
// style 'spinecap'). The shafts share the twin-tower contract: lobbies face the arcade, the lot door column is the
// arcade, the boulevard-level gallery carries the gangway door into both sky lobbies.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { PlanFrame, computeLayout, insetLimits } from '../plan.js';
import { buildTiered } from './tiered.js';
import { paintLandingDeck } from './decks.js';

export const SPINE_MIN = 38;          // lot width along the front for two 16-wide shafts and the arcade
const DECK_DEPTH = 5;                 // cells the shaft recedes on its back face above the podium for the decks
const DECK_EVERY = 6;                 // floors between decks (~30 blocks)
const BRIDGE_EVERY = 6;

export function spine(bp, lot, ctx) {
  const { nF, rng, midDoorF, spec } = ctx;
  const style = ctx.style;
  // dark slabs (the fin_black / fin_steel palettes): the blue spine is the light
  style.corner = B.CHROME; style.mullion = B.CHROME; style.roof = B.DURASTEEL_DARK;
  style.period = 3;
  style.railing = B.IRON_BARS;
  const front = spec.front;
  const alongX = front === 'N' || front === 'S';      // shafts side by side along x, arcade runs along z
  const w = bp.w, d = bp.d;
  const L = alongX ? w : d, T = alongX ? d : w;        // L across the shafts, T along the arcade
  const mid = L >> 1;
  const g0 = mid - 2, g1 = mid + 2;                    // arcade cells across
  const ta = 0, tb = T - 1;
  const rectA = alongX ? { x0: 0, x1: g0 - 1, z0: 0, z1: d - 1 } : { x0: 0, x1: w - 1, z0: 0, z1: g0 - 1 };
  const rectB = alongX ? { x0: g1 + 1, x1: w - 1, z0: 0, z1: d - 1 } : { x0: 0, x1: w - 1, z0: g1 + 1, z1: d - 1 };
  const frontA = alongX ? 'E' : 'S', frontB = alongX ? 'W' : 'N';
  const dc = T >> 1;                                   // door position along the arcade for both shafts
  const doorA = alongX ? { x: g0 - 1, z: dc } : { x: dc, z: g0 - 1 };
  const doorB = alongX ? { x: g1 + 1, z: dc } : { x: dc, z: g1 + 1 };
  // the lot's back face is the plan side u0 ('l') when the front is S or E (u runs +z / +x), else u1 ('r')
  const backSide = front === 'S' || front === 'E' ? 'l' : 'r';
  const backFace = alongX ? (front === 'S' ? 'N' : 'S') : (front === 'E' ? 'W' : 'E');
  const nFA = nF, nFB = nF >= 14 ? nF - 2 : nF;       // the slabs stop at different heights, the spine rises past both
  const baseEnd = Math.max(midDoorF, 2, Math.min(4, nF - 4));
  const shaft = (rect, frontS, door, nFs) => {
    // the envelope plan of the shaft: chamfered (octagon / blade) shells receding along the arcade, the arcade face
    // straight for the skybridges, the back face receded DECK_DEPTH for the landing decks every DECK_EVERY floors
    // (buildTiered paints them); lots without a plan keep the legacy straight shaft with its own decks
    if (ctx.envelope) {
      const env = ctx.envelope({ ext: rect, front: frontS, door, nF: nFs, deck: backSide, deckEvery: DECK_EVERY, noInset: ['f'] });
      return buildTiered(bp, { ...spec, ext: rect, front: frontS, door, tiers: env.tiers, mask: env.mask, env, family: 'spine', nF: nFs });
    }
    const frame = new PlanFrame(rect, frontS);
    const lim = insetLimits(frame, computeLayout(frame.Iu, frame.Iv));
    const room = lim[backSide];
    const inset = room >= DECK_DEPTH ? { [backSide]: DECK_DEPTH } : null;
    const tiers = [{ f0: 0, f1: Math.min(baseEnd, nFs - 1) }];
    if (baseEnd < nFs - 1) tiers.push({ f0: baseEnd + 1, f1: nFs - 1, inset: inset || {} });
    const deckFloors = [];
    if (inset) for (let f = baseEnd + 3; f <= nFs - 2; f += DECK_EVERY) deckFloors.push(f);
    const hooks = {
      poolFor: (f) => (deckFloors.includes(f) ? ['hangar', 'garage', 'lounge'] : f <= 1 ? ctx.pools.ground : f >= nFs - 2 ? ctx.pools.top : ctx.pools.typical),
      afterTier: (t) => {
        if (t.index !== 1) return;
        const e = t.ext;
        // deck rect: the strip between the shaft's back wall and the lot edge, the shaft's full width across
        let r;
        if (backFace === 'N') r = { x0: e.x0, x1: e.x1, z0: rect.z0, z1: e.z0 - 1 };
        else if (backFace === 'S') r = { x0: e.x0, x1: e.x1, z0: e.z1 + 1, z1: rect.z1 };
        else if (backFace === 'W') r = { x0: rect.x0, x1: e.x0 - 1, z0: e.z0, z1: e.z1 };
        else r = { x0: e.x1 + 1, x1: rect.x1, z0: e.z0, z1: e.z1 };
        if (r.x1 < r.x0 || r.z1 < r.z0) return;
        const wallOfDeck = backFace === 'N' ? 'S' : backFace === 'S' ? 'N' : backFace === 'W' ? 'E' : 'W';
        deckFloors.forEach((f, i) => paintLandingDeck(bp, r, 5 * f, wallOfDeck, style, { speeder: i % 2 === 0, door: true }));
      },
    };
    return buildTiered(bp, { ...spec, ext: rect, front: frontS, door, tiers, family: 'spine', hooks, nF: nFs });
  };
  const resA = shaft(rectA, frontA, doorA, nFA);
  const resB = shaft(rectB, frontB, doorB, nFB);

  // helpers addressing arcade cells: a = across (g0..g1), t = along (0..T-1)
  const P = (a, y, t, id) => { if (alongX) bp.set(a, y, t, id); else bp.set(t, y, a, id); };
  // ground arcade: deck floor, lamp posts along both sides, glass canopy at the first ceiling
  for (let t = ta; t <= tb; t++) for (let a = g0; a <= g1; a++) {
    P(a, 0, t, (a === g0 || a === g1) && t % 6 === 3 ? B.GLOW_PANEL_BLUE : B.DECK_PLATE);
    if ((a === g0 || a === g1) && t % 6 === 0 && t > 0 && t < T - 1) { P(a, 1, t, B.IRON_BARS); P(a, 2, t, B.IRON_BARS); P(a, 3, t, B.CITY_LAMP); }
    P(a, 5, t, a === g0 || a === g1 ? B.DURASTEEL : (t % 4 === 2 && a === mid ? B.GLOW_PANEL_BLUE : B.STEEL_GLASS));
  }
  // sky bridges across the arcade: glass tubes with a lit spine and a blue-lit underside, the full-depth gallery at
  // the boulevard level; openings into both shafts (3 wide, 2 high) at the door column + a vestibule inside
  const nFmin = Math.min(nFA, nFB);
  const bridgeAt = (f, t0, t1, openEnds) => {
    const y = 5 * f;
    for (let t = t0; t <= t1; t++) for (let a = g0; a <= g1; a++) {
      P(a, y, t, B.DECK_PLATE);
      const side = a === g0 || a === g1, end = t === t0 || t === t1;
      const wallish = side || (end && !openEnds);
      P(a, y + 1, t, wallish ? B.STEEL_GLASS : FORCE_AIR);
      P(a, y + 2, t, wallish ? B.STEEL_GLASS : FORCE_AIR);
      P(a, y + 3, t, side ? B.CHROME : end ? B.DURASTEEL_DARK : (t % 3 === 0 && a === mid ? B.GLOW_PANEL : B.STEEL_GLASS));
      if (bp.isAir(alongX ? a : t, y - 1, alongX ? t : a)) P(a, y - 1, t, side && t % 2 === 0 ? B.GLOW_PANEL_BLUE : B.DURASTEEL_DARK);
    }
    for (let k = -1; k <= 1; k++) for (let s = 0; s <= 2; s++) {
      P(g0 - 1 - s, y + 1, dc + k, FORCE_AIR); P(g0 - 1 - s, y + 2, dc + k, FORCE_AIR);
      P(g1 + 1 + s, y + 1, dc + k, FORCE_AIR); P(g1 + 1 + s, y + 2, dc + k, FORCE_AIR);
      if (s > 0) { P(g0 - 1 - s, y, dc + k, B.DECK_PLATE); P(g1 + 1 + s, y, dc + k, B.DECK_PLATE); }
    }
  };
  if (midDoorF >= 2 && midDoorF < nFmin) {
    bridgeAt(midDoorF, ta, tb, false);
    const tEnd = (front === 'S' || front === 'E') ? tb : ta;
    for (let a = mid - 1; a <= mid + 1; a++) { P(a, 5 * midDoorF + 1, tEnd, FORCE_AIR); P(a, 5 * midDoorF + 2, tEnd, FORCE_AIR); P(a, 5 * midDoorF + 3, tEnd, B.GLOW_PANEL); }
  }
  for (let f = baseEnd + 2; f <= nFmin - 2; f += BRIDGE_EVERY) { if (Math.abs(f - midDoorF) <= 1) continue; bridgeAt(f, dc - 3, dc + 3, false); }

  // the spine: a 3x3 GLOW_PANEL_BLUE column behind the door axis (the passage from the front end to the shaft doors
  // stays clear), rising through the canopy and every bridge to a lit tip above both roofs
  const tS = (front === 'S' || front === 'E') ? dc - 4 : dc + 2;
  const yTop = Math.min(bp.h - 3, 5 * nFA + 18);
  for (let t = tS; t <= tS + 2; t++) for (let a = mid - 1; a <= mid + 1; a++) {
    const core = t === tS + 1 && a === mid;
    for (let y = 1; y <= yTop; y++) P(a, y, t, core ? B.PANEL_BLACK : (y % 12 === 0 ? B.CHROME : B.GLOW_PANEL_BLUE));
    P(a, yTop + 1, t, B.GLOW_PANEL);           // white cap over the blue column
  }
  P(mid, yTop + 2, tS + 1, B.GLOW_PANEL_BLUE);
  const spineTop = yTop + 2;
  // the lot's crown is the spine tip above the taller slab's roof (its fins are the shaft crowns)
  const extra = Math.max(resA.extra, resB.extra, spineTop - 5 * nFA);
  if (resA.crown) {
    bp.meta.crown = { style: 'spinecap', height: spineTop - 5 * nFA, base: 0, topY: bp.wy(spineTop), tiers: resA.crown.tiers, cap: 'spine', climbable: true };
    bp.meta.crownHeight = bp.meta.crown.height;
    lot.crownHeight = bp.meta.crown.height;
  }
  return { ...resA, twinB: resB, doors: [doorA, doorB], nF: Math.max(resA.nF, resB.nF), extra };
}
