// Skyscraper crowns in the Star Wars idiom (docs/rubrics/11_towers_v2.md). Every tower of 60 blocks or more ends in
// a crown chosen by seed instead of a flat roof: tiered setbacks with lit strips (500 Republica), a rounded cap and
// finial, an antenna crown of 3-7 masts with lit tips, a lit halo ring, a blade spire, a cantilevered landing deck
// with rails / lights / a parked speeder, a stepped ziggurat, plus the family-specific tops of the spire, spine and
// needle families. A crown is a stack of "crown tiers" on the 5-block floor lattice above the top floor: the
// stair/lift core continues through them (buildCore gets extra floors), so every tier is climbable from the top
// floor and the lifts reach it; each shell tier is a lit room around the core with a door onto the terrace of the
// level below. The cap on the last tier is pure massing. Nothing here touches the room-library floors below.
//
//   crownProfile(lot, family) -> { style, height, taper }   pure function of the lot (skyline impostors use it)
//   planCrown(bp, o)  -> plan  (decided before the core is built: tells buildTiered how many extra core floors)
//   buildCrown(bp, plan, o)    paints the crown, records bp.meta.crown
import { B } from '../blocks.js';
import { RNG, hash2 } from '../rng.js';
import { FORCE_AIR } from './blueprint.js';
import { rectRing, maskRing, paintRing, paintRoof } from './facade.js';
import { Room } from './rooms/room.js';
import { ROOMS, pickRoom } from './rooms/index.js';

export const CROWN_STYLES = ['tiered', 'dome', 'antenna', 'halo', 'blade', 'deck', 'ziggurat'];
export const FAMILY_STYLES = ['spire', 'needle', 'spinecap'];
export const CROWN_MIN_HEIGHT = 60;
// test hook: the harness measures the fill-time cost of the rubric-11 dressing (crowns + lit strips) by building
// the same layout with it disabled, which restores the legacy flat-roof towers
export const CROWN_OPTIONS = { enabled: true };

const GROUND = 60;
const AIR = FORCE_AIR;

// ------------------------------------------------------------------------------------------------ selection
// Height budget above the roof slab: buildings.js sizes a blueprint as 5 * nF + 26 (capped by the world height).
export function crownBudget(height, ground = GROUND) {
  const nF = Math.max(2, Math.round(Math.max(10, height) / 5));
  const h = Math.max(8, Math.min(256 - ground, 5 * nF + 26));
  return { nF, budget: h - 1 - 5 * nF };
}

const WEIGHTS = {
  slab: { tiered: 26, deck: 16, antenna: 14, halo: 12, blade: 18, dome: 6, ziggurat: 8 },
  setback: { tiered: 30, dome: 18, halo: 12, ziggurat: 14, antenna: 10, deck: 16 },
  habitat: { dome: 36, halo: 20, tiered: 18, deck: 14, antenna: 12 },
  stack: { antenna: 40, ziggurat: 25, halo: 20, deck: 15 },
  twin: { antenna: 24, blade: 26, halo: 16, tiered: 22, deck: 12 },
  pad: { deck: 55, antenna: 25, halo: 20 },
  civic: { dome: 100 },
  hall: { halo: 100 },
  spire: { spire: 100 }, needle: { needle: 100 }, spine: { spinecap: 100 },
};
// minimum budget (blocks above the roof slab) a style needs; anything fits in 5 as a halo
const NEEDS = { tiered: 16, dome: 11, antenna: 9, halo: 5, blade: 12, deck: 13, ziggurat: 11, spire: 12, needle: 8, spinecap: 5 };
const FALLBACK = ['dome', 'antenna', 'halo'];

export function pickCrownStyle(lot, family, budget) {
  const table = WEIGHTS[family] || WEIGHTS.slab;
  const seed = (lot.seed ?? 1) >>> 0;
  const tall = (lot.height ?? 0) >= 90;
  // a landing deck needs the core plus a >= 9-cell landing beside it on the top floor: narrow lots never manage it
  const deckOk = Math.min(lot.w ?? 99, lot.d ?? 99) >= 17;
  let total = 0;
  const cands = [];
  for (const k in table) { if (k === 'deck' && !deckOk) continue; const w = table[k] * (k === 'deck' && tall ? 1.7 : 1); cands.push([k, w]); total += w; }
  let r = hash2(seed, 0x51, 0xC0DE) * total;
  let style = cands[cands.length - 1][0];
  for (const [k, w] of cands) { r -= w; if (r <= 0) { style = k; break; } }
  if (budget < (NEEDS[style] ?? 5)) { style = FALLBACK.find((s) => budget >= NEEDS[s]) || 'halo'; }
  return style;
}

// Approximate crown height and silhouette taper (0 = box, 1 = point) for the far impostors; the real crown is
// built by planCrown/buildCrown from the same style pick, so the two agree.
export function crownProfile(lot, family, ground = GROUND) {
  if (!lot || lot.kind !== 'tower' || (lot.height ?? 0) < CROWN_MIN_HEIGHT || !CROWN_OPTIONS.enabled) return { style: null, height: 0, taper: 0 };
  const { budget: H } = crownBudget(lot.height, ground);
  const style = pickCrownStyle(lot, family, H);
  const small = Math.min(lot.w, lot.d);
  let height = 5, taper = 0;
  // (the constants mirror buildCrown / paintCap: shell tiers are 5 high, then the cap's own layers)
  switch (style) {
    case 'tiered': { const K = Math.min(3, Math.floor((H - 6) / 5)); height = 5 * K + 8; taper = 0.35; break; }
    case 'dome': height = 5 + Math.min(H - 9, Math.max(3, Math.round(small * 0.28))) + 4; taper = 0.3; break;
    case 'antenna': height = 7 + Math.min(H - 1, 16); taper = 0.8; break;     // masts: a thin silhouette
    case 'halo': height = 5 + Math.min(H - 5, 9); break;
    case 'blade': height = 6 + Math.min(H - 1, 18); taper = 0.6; break;
    case 'deck': height = 18; break;
    case 'ziggurat': height = 5 + 2 * Math.min(4, Math.floor((H - 8) / 2)) + 3; taper = 0.4; break;
    case 'spire': height = Math.min(H, 13 + Math.max(3, Math.round(small * 0.18)) + 4); taper = 0.45; break;
    case 'needle': height = Math.min(H, 25); taper = 0.75; break;
    case 'spinecap': height = Math.min(H - 1, 15); taper = 0.9; break;   // the 3x3 spine column above the slabs
    default: height = 5;
  }
  return { style, height: Math.min(H, height), taper };
}

// ------------------------------------------------------------------------------------------------ geometry
const W = (e) => e.x1 - e.x0 + 1, D = (e) => e.z1 - e.z0 + 1;
const centre = (e) => [(e.x0 + e.x1 + 1) / 2, (e.z0 + e.z1 + 1) / 2];
const inRect = (e, x, z) => x >= e.x0 && x <= e.x1 && z >= e.z0 && z <= e.z1;

// One-high horizontal plate (inclusive rect at level y) written straight into the block array. Blueprint.fill runs
// one TypedArray.fill per column, which for a single row is a builtin call per cell - a 32x32 floor plate costs
// 12 us that way and 1 us here, and a tower writes one plate per floor.
export function slab(bp, x0, z0, x1, z1, y, id) {
  if (y < 0 || y >= bp.h) return;
  if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
  if (z0 > z1) { const t = z0; z0 = z1; z1 = t; }
  if (x0 < 0) x0 = 0; if (z0 < 0) z0 = 0; if (x1 >= bp.w) x1 = bp.w - 1; if (z1 >= bp.d) z1 = bp.d - 1;
  const b = bp.blocks, h = bp.h, d = bp.d;
  for (let x = x0; x <= x1; x++) { let i = (x * d + z0) * h + y; for (let z = z0; z <= z1; z++, i += h) b[i] = id; }
}

// Footprint masks are baked into a lookup table over the tier rect once: the mask is queried thousands of times
// per tier (ring extraction, shell painting, room masks) and Math.pow per query showed up in the fill-time budget.
// The lookup closure carries its table (`.tbl`, `.ext`, `.d`) so ring extraction and neighbourhood tests can index
// the table directly instead of calling the closure five times per cell.
export function tableLookup(ext, tbl) {
  const { x0, x1, z0, z1 } = ext, d = D(ext);
  const f = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1 && tbl[(x - x0) * d + (z - z0)] === 1;
  f.tbl = tbl; f.ext = ext; f.d = d;
  return f;
}
const sameRect = (a, b) => a === b || (a.x0 === b.x0 && a.x1 === b.x1 && a.z0 === b.z0 && a.z1 === b.z1);
// the mask's own table when it covers exactly `ext`, else null
const tableOf = (inside, ext) => (inside && inside.tbl && sameRect(inside.ext, ext) ? inside.tbl : null);
// Exterior ring of a table mask, same cells / order / fields as facade.maskRing but read off the table.
export function ringFromTable(e, tbl) {
  const w = W(e), d = D(e), cells = [];
  for (let x = e.x0, i = 0; x <= e.x1; x++) for (let z = e.z0; z <= e.z1; z++, i++) {
    if (tbl[i] !== 1) continue;
    const ax = x - e.x0, az = z - e.z0;
    const n = az === 0 || tbl[i - 1] !== 1, s = az === d - 1 || tbl[i + 1] !== 1, wv = ax === 0 || tbl[i - d] !== 1, ev = ax === w - 1 || tbl[i + d] !== 1;
    const k = (n ? 1 : 0) + (s ? 1 : 0) + (wv ? 1 : 0) + (ev ? 1 : 0);
    if (!k) continue;
    if (k >= 2) cells.push({ x, z, along: x + z, corner: (x + z) % 2 === 0, face: 'D' });
    else cells.push({ x, z, along: (n || s) ? x : z, corner: false, face: n ? 'N' : s ? 'S' : wv ? 'W' : 'E' });
  }
  return cells;
}
const ringOf = (ext, inside) => { const t = tableOf(inside, ext); return t ? ringFromTable(ext, t) : maskRing(ext, inside); };
// Superellipse |x/rx|^p + |z/rz|^p <= 1 over the rect. The two power terms are separable, so they are tabulated per
// row / column first; when `must` cells are given and one of them falls outside, no table is built (returns null).
function roundedMask(ext, p, must = null) {
  const [cx, cz] = centre(ext), w = W(ext), d = D(ext), rx = w / 2, rz = d / 2;
  const px = new Float64Array(w), pz = new Float64Array(d);
  for (let i = 0; i < w; i++) px[i] = Math.pow(Math.abs(ext.x0 + i + 0.5 - cx) / rx, p);
  for (let j = 0; j < d; j++) pz[j] = Math.pow(Math.abs(ext.z0 + j + 0.5 - cz) / rz, p);
  if (must) for (const [x, z] of must) { if (!inRect(ext, x, z) || px[x - ext.x0] + pz[z - ext.z0] > 1) return null; }
  const tbl = new Uint8Array(w * d);
  for (let i = 0, k = 0; i < w; i++) { const a = px[i]; for (let j = 0; j < d; j++, k++) if (a + pz[j] <= 1) tbl[k] = 1; }
  return tableLookup(ext, tbl);
}
// Filled ellipse (radii rx, rz about cx, cz) at level y, one strided row write per x (Blueprint.disc fills cell by cell).
function ellipse(bp, cx, cz, rx, rz, y, id) {
  if (y < 0 || y >= bp.h) return;
  const b = bp.blocks, h = bp.h, d = bp.d;
  const xa = Math.max(0, Math.floor(cx - rx)), xb = Math.min(bp.w - 1, Math.ceil(cx + rx));
  for (let x = xa; x <= xb; x++) {
    const dx = (x + 0.5 - cx) / rx, q = 1 - dx * dx;
    if (q < 0) continue;
    const hz = rz * Math.sqrt(q);
    // cells whose centre (z + 0.5) lies within cz +- hz
    const z0 = Math.max(0, Math.ceil(cz - hz - 0.5)), z1 = Math.min(d - 1, Math.floor(cz + hz - 0.5));
    for (let z = z0, i = (x * d + z0) * h + y; z <= z1; z++, i += h) b[i] = id;
  }
}
function chamferMask(ext, c, must = null) {
  const w = W(ext), d = D(ext);
  const fits = (i, j) => i + j >= c && (w - 1 - i) + j >= c && i + (d - 1 - j) >= c && (w - 1 - i) + (d - 1 - j) >= c;
  if (must) for (const [x, z] of must) { if (!inRect(ext, x, z) || !fits(x - ext.x0, z - ext.z0)) return null; }
  const tbl = new Uint8Array(w * d);
  for (let i = 0, k = 0; i < w; i++) for (let j = 0; j < d; j++, k++) if (fits(i, j)) tbl[k] = 1;
  return tableLookup(ext, tbl);
}

// A shell tier k (1-based) above `prev` (the clip of the level below), inset `a` cells per side but never cutting
// into the core, its 1-cell walkway margin or the 2-row landing corridor in front of the stair door. Returns null
// when no side keeps a terrace of >= 1 cell for the tier's door.
function shellTier(plan, prev, a, k, needDoor = true) {
  const c = plan.core, frame = plan.frame;
  const minU0 = c.u0 - 1, maxU1 = c.u1 + 1, minV0 = c.v0 - 2, maxV1 = c.v1 + 1;
  const clip = {
    u0: Math.min(prev.u0 + a, minU0), u1: Math.max(prev.u1 - a, Math.min(prev.u1, maxU1)),
    v0: Math.min(prev.v0 + a, minV0), v1: Math.max(prev.v1 - a, Math.min(prev.v1, maxV1)),
  };
  const terrace = { f: clip.v0 - prev.v0, l: clip.u0 - prev.u0, r: prev.u1 - clip.u1, b: prev.v1 - clip.v1 };
  const doors = [];
  if (terrace.f >= 2) doors.push('f');
  if (terrace.l >= 2) doors.push('l');
  if (terrace.r >= 2) doors.push('r');
  if (!doors.length && needDoor) return null;
  const ext = frame.rect(clip.u0 - 1, clip.v0 - 1, clip.u1 + 1, clip.v1 + 1);
  return { k, f: plan.nF + k - 1, clip, ext, terrace, doors, inside: null, ring: rectRing(ext), bare: false };
}
// bare tier: only the 6x6 core rises through this level (stair head)
function bareTier(plan, k) {
  const c = plan.core, frame = plan.frame;
  const ext = frame.rect(c.u0, c.v0, c.u1, c.v1);
  return { k, f: plan.nF + k - 1, clip: { u0: c.u0, u1: c.u1, v0: c.v0, v1: c.v1 }, ext, terrace: null, doors: [], inside: null, ring: null, bare: true };
}
// Door cells (ring cells + the interior cell behind each) of a tier in xz.
function doorCells(plan, t) {
  const c = plan.core, F = plan.frame, out = [];
  for (const side of t.doors) {
    if (side === 'f') for (const u of [c.u0 + 4, c.u0 + 5]) out.push({ x: F.X(u, t.clip.v0 - 1), z: F.Z(u, t.clip.v0 - 1), ix: F.X(u, t.clip.v0), iz: F.Z(u, t.clip.v0) });
    else { const u = side === 'l' ? t.clip.u0 - 1 : t.clip.u1 + 1, ui = side === 'l' ? t.clip.u0 : t.clip.u1; for (const v of [c.v0 - 2, c.v0 - 1]) out.push({ x: F.X(u, v), z: F.Z(u, v), ix: F.X(ui, v), iz: F.Z(ui, v) }); }
  }
  return out;
}
// Cells a shell tier's footprint must keep: the core box with its margins and the door cells (cached on the tier).
function mustCells(plan, t) {
  if (t.must) return t.must;
  const c = plan.core, F = plan.frame, must = [];
  for (let u = Math.max(t.clip.u0, c.u0 - 1); u <= Math.min(t.clip.u1, c.u1 + 1); u++) for (let v = Math.max(t.clip.v0, c.v0 - 2); v <= Math.min(t.clip.v1, c.v1 + 1); v++) must.push([F.X(u, v), F.Z(u, v)]);
  for (const d of doorCells(plan, t)) { must.push([d.x, d.z]); must.push([d.ix, d.iz]); }
  t.must = must;
  return must;
}
// Rounds / chamfers a shell tier when the core box, its margins and the doors stay inside the mask.
function shapeTier(plan, t, kind) {
  const w = W(t.ext), d = D(t.ext);
  if (Math.min(w, d) < 8) return;
  const must = mustCells(plan, t);
  const tries = kind === 'round' ? [2.4, 3, 4, 6] : [Math.min(3, Math.floor(Math.min(w, d) * 0.3)), 2, 1];
  for (const p of tries) {
    if (kind !== 'round' && p < 1) break;
    const inside = kind === 'round' ? roundedMask(t.ext, p, must) : chamferMask(t.ext, p, must);
    if (inside) { t.inside = inside; t.ring = ringFromTable(t.ext, inside.tbl); return; }
  }
}
// Keeps a shell tier on the roof below it when that roof is a masked footprint (octagon / ellipse habitats,
// rounded tiers): the tier may only stand on cells strictly inside the footprint below, so its wall is always
// at least one cell in from the edge below. Skipped when that would cut the core or a door.
function constrainTier(plan, t, below) {
  if (!below) return;
  const own = t.inside, e = t.ext, d = D(e), tbl = new Uint8Array(W(e) * d), ownT = tableOf(own, e);
  // the footprint below as a table: a cell is "inner" when it and its four neighbours are set
  const bt = below.tbl, be = below.ext, bd = below.d;
  const inB = bt ? (x, z) => x >= be.x0 && x <= be.x1 && z >= be.z0 && z <= be.z1 && bt[(x - be.x0) * bd + (z - be.z0)] === 1 : below;
  let cut = false;
  for (let x = e.x0, i = 0; x <= e.x1; x++) for (let z = e.z0; z <= e.z1; z++, i++) {
    if (ownT ? ownT[i] !== 1 : (own && !own(x, z))) continue;
    if (inB(x, z) && inB(x - 1, z) && inB(x + 1, z) && inB(x, z - 1) && inB(x, z + 1)) tbl[i] = 1; else cut = true;
  }
  if (!cut) return;
  const inside = tableLookup(e, tbl);
  for (const [x, z] of mustCells(plan, t)) if (!inside(x, z)) return;
  t.inside = inside; t.ring = ringFromTable(e, tbl);
}

// ------------------------------------------------------------------------------------------------ planning
// o: { frame, layout (plan layout, for .core), top (top-floor tier: clip/ext), nF, style, family, lot, forceStyle }
export function planCrown(bp, o) {
  if (!CROWN_OPTIONS.enabled) return null;
  const lot = o.lot;
  if (!lot || lot.kind !== 'tower' || (lot.height ?? 0) < CROWN_MIN_HEIGHT) return null;
  const R = 5 * o.nF, H = bp.h - 1 - R;
  if (H < 5) return null;
  const style = o.forceStyle || pickCrownStyle(lot, o.family, H);
  const e = o.top.ext;
  const rng = new RNG((((lot.seed ?? 1) >>> 0) ^ 0xC80A7 ^ (e.x0 * 7919 + e.z0 * 104729)) >>> 0);
  const plan = { style, H, R, nF: o.nF, K: 0, tiers: [], rng, core: o.layout.core, frame: o.frame, top: o.top, family: o.family, cap: {} };
  const tiered = (n, a0) => {
    let prev = o.top.clip;
    for (let k = 1; k <= n; k++) {
      const t = shellTier(plan, prev, k === 1 ? a0 : 2, k);
      if (!t) break;
      // a tier that did not shrink at all is no setback: stop stacking
      if (k > 1 && t.terrace.f + t.terrace.l + t.terrace.r + t.terrace.b < 2) break;
      plan.tiers.push(t); prev = t.clip;
    }
  };
  switch (style) {
    case 'tiered': {
      const K = Math.min(3, Math.floor((H - 6) / 5));
      tiered(K, 2);
      for (const t of plan.tiers) shapeTier(plan, t, 'round');
      plan.cap = { kind: 'roundcap' };
      break;
    }
    case 'dome': { tiered(1, 2); for (const t of plan.tiers) shapeTier(plan, t, 'round'); plan.cap = { kind: 'dome' }; break; }
    case 'antenna': { tiered(1, 3); plan.cap = { kind: 'antenna', n: 3 + Math.floor(rng.next() * 5) }; break; }
    case 'halo': { tiered(1, 2); plan.cap = { kind: 'halo' }; break; }
    case 'blade': { tiered(1, 3); plan.cap = { kind: 'blade' }; break; }
    case 'ziggurat': { tiered(1, 2); for (const t of plan.tiers) shapeTier(plan, t, 'chamfer'); plan.cap = { kind: 'ziggurat' }; break; }
    case 'deck': {
      // a plant room hugging the core on the deck side, the deck on its roof, the stair head rising through the deck
      const t = shellTier(plan, o.top.clip, 2, 1);
      if (t) {
        // pick the deck side: the side with the most room between the core margin and the top-floor wall
        const c = plan.core, tc = o.top.clip;
        const room = { f: (c.v0 - 2) - tc.v0, l: (c.u0 - 1) - tc.u0, r: tc.u1 - (c.u1 + 1), b: tc.v1 - (c.v1 + 1) };
        const side = ['l', 'r', 'f', 'b'].sort((p, q) => room[q] - room[p])[0];
        if (room[side] >= 6) {
          // shrink the tier on the deck side down to the core margin so the deck overhangs the terrace there
          if (side === 'l') t.clip.u0 = c.u0 - 1; else if (side === 'r') t.clip.u1 = c.u1 + 1; else if (side === 'f') t.clip.v0 = c.v0 - 2; else t.clip.v1 = c.v1 + 1;
          t.ext = plan.frame.rect(t.clip.u0 - 1, t.clip.v0 - 1, t.clip.u1 + 1, t.clip.v1 + 1);
          t.ring = rectRing(t.ext);
          t.terrace = { f: t.clip.v0 - tc.v0, l: t.clip.u0 - tc.u0, r: tc.u1 - t.clip.u1, b: tc.v1 - t.clip.v1 };
          t.doors = ['f', 'l', 'r'].filter((s) => t.terrace[s] >= 2);
          if (t.doors.length) { plan.tiers.push(t); plan.tiers.push(bareTier(plan, 2)); plan.cap = { kind: 'deck', side }; }
        }
      }
      if (!plan.tiers.length) { plan.style = 'antenna'; tiered(1, 3); plan.cap = { kind: 'antenna', n: 3 + Math.floor(rng.next() * 5) }; }
      break;
    }
    case 'spire': {
      const K = Math.min(2, Math.floor((H - 7) / 5));
      tiered(K, 2);
      for (const t of plan.tiers) shapeTier(plan, t, 'round');
      plan.cap = { kind: 'dome', finial: true };
      break;
    }
    case 'needle': {
      // the lookout in the base of the tip: same footprint as the top floor, glass all round, no terrace door
      const t = shellTier(plan, o.top.clip, 0, 1, false);
      if (t) { t.doors = []; t.inside = o.top.inside || null; t.ring = t.inside ? ringOf(t.ext, t.inside) : rectRing(t.ext); plan.tiers.push(t); }
      plan.cap = { kind: 'needle' };
      break;
    }
    case 'spinecap': { plan.cap = { kind: 'fins' }; break; }
    default: { tiered(1, 2); plan.cap = { kind: 'halo' }; }
  }
  // every shell tier stands inside the footprint below it
  let below = o.top.inside || null;
  for (const t of plan.tiers) { if (t.bare) continue; constrainTier(plan, t, below); below = t.inside; }
  // roof access at the very least: the stair head
  if (!plan.tiers.length) plan.tiers.push(bareTier(plan, 1));
  plan.K = plan.tiers.length;
  if (plan.tiers.every((t) => t.bare) && plan.cap.kind !== 'fins' && plan.cap.kind !== 'deck') plan.cap = { kind: plan.cap.kind === 'antenna' ? 'antenna' : 'halo', n: 3 };
  return plan;
}

// ------------------------------------------------------------------------------------------------ building
// o: { style (facade style), seed, strips (strip plan or null), stripRing(bp, ring, f0, f1, plan) }
export function buildCrown(bp, plan, o) {
  const style = o.style, seed = o.seed;
  const R = plan.R;
  let top = R;                                  // highest block written so far
  let prevExt = plan.top.ext;
  for (const t of plan.tiers) {
    const y = 5 * t.f, yRoof = y + 5;
    if (t.bare) { capCore(bp, plan, yRoof, style); top = Math.max(top, yRoof + 1); prevExt = t.ext; continue; }
    buildShell(bp, plan, t, style, seed, o, prevExt);
    top = Math.max(top, yRoof + 2);
    prevExt = t.ext;
  }
  const last = plan.tiers[plan.tiers.length - 1];
  const yCap = 5 * last.f + 5;
  const capH = paintCap(bp, plan, last, yCap, style, o);
  top = Math.max(top, yCap + capH);
  const height = Math.min(bp.h - 1, top) - R;
  bp.meta.crown = { style: plan.style, height, topY: bp.wy(R + height), tiers: plan.K, cap: plan.cap.kind, climbable: true };
  bp.meta.crownHeight = height;
  return height;
}

function capCore(bp, plan, yTop, style) {
  const c = plan.core, F = plan.frame;
  const e = F.rect(c.u0, c.v0, c.u1, c.v1);
  slab(bp, e.x0, e.z0, e.x1, e.z1, yTop, style.roof);
  bp.walls(e.x0, yTop + 1, e.z0, e.x1, yTop + 1, e.z1, style.corner);
  for (const [x, z] of [[e.x0, e.z0], [e.x1, e.z1]]) bp.set(x, yTop + 1, z, B.GLOW_PANEL_BLUE);
}

function buildShell(bp, plan, t, style, seed, o, prevExt) {
  const c = plan.core, F = plan.frame;
  const y = 5 * t.f, lvl = y + 1, yRoof = y + 5;
  const glass = plan.cap.kind === 'dome' || plan.cap.kind === 'needle' || plan.style === 'halo';
  // walls (glass drums for the dome / needle lookout / halo lounge), roof + parapet
  paintRing(bp, t.ring, t.f, style, seed, glass ? { lobby: true } : {});
  const deckTop = plan.cap.kind === 'deck' && t.k === 1;      // the landing deck plate replaces this roof + parapet
  const e = t.ext, ed = D(e), mt = tableOf(t.inside, e);
  if (t.inside) {
    if (mt) { if (yRoof < bp.h) { const rf = style.roof, blocks = bp.blocks, h = bp.h; for (let x = e.x0, i = 0; x <= e.x1; x++) for (let z = e.z0; z <= e.z1; z++, i++) if (mt[i] === 1) blocks[(x * bp.d + z) * h + yRoof] = rf; } }
    else for (let x = e.x0; x <= e.x1; x++) for (let z = e.z0; z <= e.z1; z++) if (t.inside(x, z)) bp.set(x, yRoof, z, style.roof);
    if (!deckTop) for (const cc of t.ring) bp.set(cc.x, yRoof + 1, cc.z, cc.corner ? style.corner : (plan.style === 'spire' ? B.CHROME : B.IRON_BARS));
  } else if (deckTop) slab(bp, e.x0, e.z0, e.x1, e.z1, yRoof, style.roof);
  else paintRoof(bp, e, yRoof, style, true);
  if (!glass && o.strips && plan.style !== 'deck') o.stripRing(bp, t.ring, t.f, t.f, { ...o.strips, pitch: plan.style === 'tiered' || plan.style === 'spire' ? 2 : 3, faces: null });
  // The tier stands on the roof below (its floor) and nothing but the core has been written in its volume yet, so
  // the interior only needs its ceiling fixtures (a 3-block lattice, white / blue) before the rooms go in.
  // interior = cells strictly inside the ring (all four neighbours in the footprint) and outside the core box
  const coreE = F.rect(c.u0, c.v0, c.u1, c.v1);
  const itbl = new Uint8Array(W(e) * ed);
  for (let x = e.x0 + 1, i = ed + 1; x < e.x1; x++, i += 2) for (let z = e.z0 + 1; z < e.z1; z++, i++) {
    if (inRect(coreE, x, z)) continue;
    if (mt) { if (mt[i] !== 1 || mt[i - 1] !== 1 || mt[i + 1] !== 1 || mt[i - ed] !== 1 || mt[i + ed] !== 1) continue; }
    else if (t.inside && !(t.inside(x, z) && t.inside(x - 1, z) && t.inside(x + 1, z) && t.inside(x, z - 1) && t.inside(x, z + 1))) continue;
    itbl[i] = 1;
  }
  const interior = tableLookup(e, itbl);
  for (let x = e.x0 + 1, i = ed + 1; x < e.x1; x++, i += 2) for (let z = e.z0 + 1; z < e.z1; z++, i++) {
    if (itbl[i] !== 1 || (x + z) % 3 !== 0) continue;
    bp.set(x, lvl + 3, z, (x % 2 === 0) ? B.GLOW_PANEL : B.GLOW_PANEL_BLUE);
  }
  // rooms beside and behind the core (open to the landing corridor), then the corridor itself
  furnishTier(bp, plan, t, style, o);
  // corridor: two rows in front of the core across the whole clip, lift landing lights
  for (let u = t.clip.u0; u <= t.clip.u1; u++) for (const v of [c.v0 - 2, c.v0 - 1]) {
    const x = F.X(u, v), z = F.Z(u, v);
    if (!interior(x, z)) continue;
    for (let yy = lvl; yy <= lvl + 2; yy++) bp.set(x, yy, z, AIR);
    if (u % 3 === 0 && v === c.v0 - 1) bp.set(x, lvl + 3, z, B.GLOW_PANEL);
  }
  // the straight path from the stair door to the front door and the margins around the core stay clear
  for (const u of [c.u0 + 4, c.u0 + 5]) for (let v = t.clip.v0; v < c.v0 - 2; v++) { const x = F.X(u, v), z = F.Z(u, v); if (interior(x, z)) for (let yy = lvl; yy <= lvl + 2; yy++) bp.set(x, yy, z, AIR); }
  for (let v = c.v0; v <= c.v1 + 1; v++) for (const u of [c.u0 - 1, c.u1 + 1]) { const x = F.X(u, v), z = F.Z(u, v); if (interior(x, z)) for (let yy = lvl; yy <= lvl + 2; yy++) bp.set(x, yy, z, AIR); }
  for (let u = c.u0 - 1; u <= c.u1 + 1; u++) { const x = F.X(u, c.v1 + 1), z = F.Z(u, c.v1 + 1); if (interior(x, z)) for (let yy = lvl; yy <= lvl + 2; yy++) bp.set(x, yy, z, AIR); }
  bp.room('lift_landing', F.X(t.clip.u0, c.v0 - 2), lvl, F.Z(t.clip.u0, c.v0 - 2), F.X(t.clip.u1, c.v0 - 1), F.Z(t.clip.u1, c.v0 - 1));
  bp.spot(F.X(c.u0 + 3, c.v0 - 2), lvl, F.Z(c.u0 + 3, c.v0 - 2), 'stand');
  // doors onto the terrace: 2 wide, 2 high, lit lintel, a lamp post beside each on the terrace
  for (const d of doorCells(plan, t)) {
    bp.set(d.x, lvl, d.z, AIR); bp.set(d.x, lvl + 1, d.z, AIR); bp.set(d.x, lvl + 2, d.z, B.GLOW_PANEL);
    bp.set(d.ix, lvl, d.iz, AIR); bp.set(d.ix, lvl + 1, d.iz, AIR);
    // the terrace cell outside the door must be walkable (the floor below is the previous roof)
    const ox = d.x + (d.x - d.ix), oz = d.z + (d.z - d.iz);
    if (bp.inside(ox, lvl, oz)) { bp.set(ox, lvl, oz, AIR); bp.set(ox, lvl + 1, oz, AIR); if (bp.isAir(ox, lvl - 1, oz)) bp.set(ox, lvl - 1, oz, style.roof); }
  }
  // terrace dressing around the tier: lamps at the previous roof's inner corners where free
  for (const [x, z] of [[prevExt.x0 + 1, prevExt.z0 + 1], [prevExt.x1 - 1, prevExt.z0 + 1], [prevExt.x0 + 1, prevExt.z1 - 1], [prevExt.x1 - 1, prevExt.z1 - 1]]) {
    if (inRect(t.ext, x, z) || !bp.isAir(x, y + 1, z) || !bp.isAir(x, y + 2, z)) continue;
    bp.set(x, y + 1, z, B.IRON_BARS); bp.set(x, y + 2, z, B.CITY_LAMP);
  }
}

const TIER_POOL = ['observation_deck', 'lounge', 'control_room', 'comms_room', 'server_room', 'meditation_chamber', 'library', 'garden_terrace', 'executive_office'];
const TECH_POOL = ['control_room', 'comms_room', 'server_room', 'storage', 'reactor_room'];

// Furnishes the three rectangles a shell tier has around the core (left, right, behind) with room-library
// templates when they are big enough; every block is recorded as a room so NPC planners and the harness see it.
function furnishTier(bp, plan, t, style, o) {
  const c = plan.core, F = plan.frame, lvl = 5 * t.f + 1;
  const pool = plan.family === 'stack' || plan.family === 'pad' ? TECH_POOL : TIER_POOL;
  const blocks = [
    { u0: t.clip.u0, u1: c.u0 - 2, v0: c.v0, v1: t.clip.v1 },
    { u0: c.u1 + 2, u1: t.clip.u1, v0: c.v0, v1: t.clip.v1 },
    { u0: c.u0 - 1, u1: c.u1 + 1, v0: c.v1 + 2, v1: t.clip.v1 },
  ];
  const side = F.sideTowardFront();
  const alongX = side === 'N' || side === 'S';
  const mt = tableOf(t.inside, t.ext), ed = D(t.ext);
  for (const b of blocks) {
    if (b.u1 - b.u0 + 1 < 3 || b.v1 - b.v0 + 1 < 3) continue;
    const rc = F.rect(b.u0, b.v0, b.u1, b.v1);
    const w = alongX ? W(rc) : D(rc), d = alongX ? D(rc) : W(rc);
    if (t.inside) {
      let n = 0;
      if (mt) { for (let x = rc.x0; x <= rc.x1; x++) { const row = (x - t.ext.x0) * ed - t.ext.z0; for (let z = rc.z0; z <= rc.z1; z++) if (mt[row + z] === 1) n++; } }
      else for (let x = rc.x0; x <= rc.x1; x++) for (let z = rc.z0; z <= rc.z1; z++) if (t.inside(x, z)) n++;
      if (n < 0.6 * W(rc) * D(rc)) continue;
    }
    const tpl = pickRoom(pool, w, d, plan.rng, null);
    const doorU = Math.max(0, Math.floor((w - 2) / 2));
    const room = new Room(bp, { ...rc, y: lvl, h: 4, side, doorU, doorW: 2, mask: t.inside }, tpl.name, { isTop: true, floor: t.f, family: plan.family, style });
    tpl.fn(room, plan.rng, { isTop: true, floor: t.f, family: plan.family, style });
    room.finalize();
    room.putRaw(doorU, 3, 0, B.GLOW_PANEL);
    bp.room(tpl.name, rc.x0, lvl, rc.z0, rc.x1, rc.z1);
  }
}

// ------------------------------------------------------------------------------------------------ caps
function finial(bp, x, y, z, h, tip = B.GLOW_PANEL_BLUE, shaft = B.CHROME) {
  if (h <= 0) return 0;
  bp.fill(x, y, z, x, y + h - 1, z, shaft);
  bp.set(x, y + h, z, tip);
  return h + 1;
}
// Elliptical dome over the tier rect: `layers` shrinking slices, chrome every third one, a lit rim on the first.
function domeCap(bp, e, y0, layers, o = {}) {
  const [cx, cz] = centre(e), rx = W(e) / 2, rz = D(e) / 2;
  for (let k = 0; k < layers; k++) {
    const tt = (k + 0.5) / layers, s = Math.sqrt(Math.max(0, 1 - tt * tt));
    const ax = Math.max(0.8, rx * s), az = Math.max(0.8, rz * s);
    const body = k % 3 === 2 ? B.CHROME : (o.body || B.DURASTEEL);
    if (k === 0) { ellipse(bp, cx, cz, ax, az, y0, B.GLOW_PANEL); ellipse(bp, cx, cz, Math.max(0.5, ax - 1), Math.max(0.5, az - 1), y0, body); }
    else ellipse(bp, cx, cz, ax, az, y0 + k, body);
  }
  return layers;
}
// h = 0 means "a mast this tall" is decided by the caller
function mast(bp, x, y, z, h, o = {}) {
  bp.set(x, y, z, o.base || B.DURASTEEL_DARK);
  bp.fill(x, y + 1, z, x, y + h - 2, z, o.shaft || B.CHROME);
  if (h >= 8) bp.set(x, y + Math.floor(h / 2), z, B.GLOW_PANEL_BLUE);
  bp.set(x, y + h - 1, z, B.PANEL_RED); bp.set(x, y + h, z, B.GLOW_PANEL);
  return h + 1;
}

function paintCap(bp, plan, last, y0, style, o) {
  const e = last.ext, H = bp.h - 1 - y0;
  const cap = plan.cap, rng = plan.rng;
  const [cxf, czf] = centre(e);
  const cx = Math.floor(cxf), cz = Math.floor(czf);
  const roofBlock = style.roof;
  switch (cap.kind) {
    case 'roundcap': {
      // rounded shoulder (two shrinking discs) and a chrome finial with a blue tip
      const layers = Math.min(3, Math.max(2, H - 4));
      const rx = W(e) / 2, rz = D(e) / 2;
      for (let k = 0; k < layers; k++) { const s = 1 - (k + 0.5) / (layers + 1); ellipse(bp, cxf, czf, Math.max(1, rx * s), Math.max(1, rz * s), y0 + 1 + k, k === 0 ? B.CHROME : roofBlock); }
      const fh = Math.min(6, H - layers - 2);
      return 1 + layers + finial(bp, cx, y0 + 1 + layers, cz, fh);
    }
    case 'dome': {
      const layers = Math.max(2, Math.min(H - 4, Math.round(Math.min(W(e), D(e)) * 0.4)));
      domeCap(bp, e, y0 + 1, layers, { body: plan.style === 'spire' ? B.PLASTER : B.DURASTEEL });
      const fh = Math.min(plan.cap.finial ? 6 : 3, H - layers - 2);
      return 1 + layers + finial(bp, cx, y0 + 1 + layers, cz, fh, plan.style === 'spire' ? B.GLOW_PANEL : B.GLOW_PANEL_BLUE);
    }
    case 'antenna': {
      const n = cap.n || 4, pts = [];
      const inner = { x0: e.x0 + 1, x1: e.x1 - 1, z0: e.z0 + 1, z1: e.z1 - 1 };
      const cand = [[inner.x0, inner.z0], [inner.x1, inner.z1], [inner.x1, inner.z0], [inner.x0, inner.z1], [cx, cz], [cx, inner.z0], [cx, inner.z1], [inner.x0, cz], [inner.x1, cz]];
      const seen = new Set();
      for (const [x, z] of cand) { if (pts.length >= n) break; const k = x * 4096 + z; if (seen.has(k) || !bp.inside(x, y0 + 1, z)) continue; seen.add(k); pts.push([x, z]); }
      const hMax = Math.min(H - 1, 16);
      let best = 0;
      pts.forEach(([x, z], i) => { const h = i === 0 ? hMax : Math.max(5, Math.min(hMax, 5 + Math.floor(rng.next() * (hMax - 4)))); best = Math.max(best, mast(bp, x, y0 + 1, z, h)); });
      // a lit equipment box between the masts
      bp.fill(cx - 1, y0 + 1, cz - 1, cx + 1, y0 + 2, cz + 1, B.DURASTEEL_DARK);
      bp.set(cx, y0 + 3, cz, B.GLOW_PANEL_BLUE);
      return best + 1;
    }
    case 'halo': {
      // lit ring one block outside the tier parapet (or on it when the tier fills the lot), on chrome pylons
      const out = (e.x0 > 0 && e.z0 > 0 && e.x1 < bp.w - 1 && e.z1 < bp.d - 1) ? 1 : 0;
      const r = { x0: e.x0 - out, x1: e.x1 + out, z0: e.z0 - out, z1: e.z1 + out };
      const yr = y0 + 3;
      bp.walls(r.x0, yr, r.z0, r.x1, yr, r.z1, B.GLOW_PANEL);
      for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]]) { bp.set(x, yr, z, B.CHROME); bp.set(x, yr + 1, z, B.GLOW_PANEL_BLUE); }
      const pylons = [[e.x0, e.z0], [e.x1, e.z0], [e.x0, e.z1], [e.x1, e.z1], [cx, e.z0], [cx, e.z1], [e.x0, cz], [e.x1, cz]];
      for (const [x, z] of pylons) bp.fill(x, y0 + 1, z, x, yr - 1, z, B.CHROME);
      if (out) for (const [x, z] of pylons.slice(0, 4)) bp.set(x + (x === e.x0 ? -1 : 1), yr - 1, z + (z === e.z0 ? -1 : 1), B.CHROME);
      const fh = Math.min(4, H - 5);
      return 4 + finial(bp, cx, yr + 1, cz, fh);
    }
    case 'blade': {
      // a thin tapering blade along the longer axis, blue-lit edges, lit apex
      const alongX = W(e) >= D(e);
      const len0 = Math.max(4, Math.round((alongX ? W(e) : D(e)) * 0.7)), hb = Math.min(H - 1, 18);
      for (let j = 0; j < hb; j++) {
        const len = Math.max(1, Math.round(len0 * (1 - j / hb))), wid = j < hb * 0.35 ? 3 : j < hb * 0.75 ? 2 : 1;
        const a0 = Math.round((alongX ? cxf : czf) - len / 2), a1 = a0 + len - 1;
        const b0 = Math.floor((alongX ? czf : cxf) - wid / 2), b1 = b0 + wid - 1;
        const body = j % 4 === 3 ? B.CHROME : B.DURASTEEL_DARK;
        if (alongX) slab(bp, a0, b0, a1, b1, y0 + 1 + j, body); else slab(bp, b0, a0, b1, a1, y0 + 1 + j, body);
        if (j % 2 === 0) { if (alongX) { bp.set(a0, y0 + 1 + j, b0, B.GLOW_PANEL_BLUE); bp.set(a1, y0 + 1 + j, b1, B.GLOW_PANEL_BLUE); } else { bp.set(b0, y0 + 1 + j, a0, B.GLOW_PANEL_BLUE); bp.set(b1, y0 + 1 + j, a1, B.GLOW_PANEL_BLUE); } }
      }
      bp.set(alongX ? Math.round(cxf - 0.5) : Math.floor(cxf - 0.5), y0 + hb, alongX ? Math.floor(czf - 0.5) : Math.round(czf - 0.5), B.GLOW_PANEL);
      // two short fins at the base
      if (alongX) { bp.fill(cx, y0 + 1, e.z0, cx, y0 + 3, e.z0, B.CHROME); bp.fill(cx, y0 + 1, e.z1, cx, y0 + 3, e.z1, B.CHROME); bp.set(cx, y0 + 4, e.z0, B.GLOW_PANEL_BLUE); bp.set(cx, y0 + 4, e.z1, B.GLOW_PANEL_BLUE); }
      else { bp.fill(e.x0, y0 + 1, cz, e.x0, y0 + 3, cz, B.CHROME); bp.fill(e.x1, y0 + 1, cz, e.x1, y0 + 3, cz, B.CHROME); bp.set(e.x0, y0 + 4, cz, B.GLOW_PANEL_BLUE); bp.set(e.x1, y0 + 4, cz, B.GLOW_PANEL_BLUE); }
      return hb + 1;
    }
    case 'ziggurat': {
      const steps = Math.min(4, Math.floor((H - 3) / 2));
      let r = { ...e };
      let yy = y0 + 1;
      for (let s = 0; s < steps; s++) {
        r = { x0: r.x0 + 2, x1: r.x1 - 2, z0: r.z0 + 2, z1: r.z1 - 2 };
        if (W(r) < 3 || D(r) < 3) break;
        const stepBlock = s % 2 ? B.DURASTEEL : B.DURASTEEL_DARK;
        slab(bp, r.x0, r.z0, r.x1, r.z1, yy, stepBlock); slab(bp, r.x0, r.z0, r.x1, r.z1, yy + 1, stepBlock);
        // lit rim on the step's top edge
        for (let x = r.x0; x <= r.x1; x++) { if ((x - r.x0) % 2 === 0) { bp.set(x, yy + 1, r.z0, B.GLOW_PANEL); bp.set(x, yy + 1, r.z1, B.GLOW_PANEL); } }
        for (let z = r.z0; z <= r.z1; z++) { if ((z - r.z0) % 2 === 0) { bp.set(r.x0, yy + 1, z, B.GLOW_PANEL); bp.set(r.x1, yy + 1, z, B.GLOW_PANEL); } }
        yy += 2;
      }
      const fh = Math.min(4, bp.h - 2 - yy);
      const used = yy - y0;
      return used + finial(bp, cx, yy, cz, fh, B.GLOW_PANEL_BLUE);
    }
    case 'deck': return paintDeck(bp, plan, style, o);
    case 'needle': {
      // solid tapering tip over the lookout, chrome every fourth layer, blue edge lights, lit apex, two fins
      const hb = Math.min(H - 1, 24);
      const hx0 = W(e) / 2, hz0 = D(e) / 2;
      for (let j = 0; j < hb; j++) {
        const s = 1 - (j + 1) / (hb + 1);
        const hx = Math.max(0.5, hx0 * s), hz = Math.max(0.5, hz0 * s);
        const x0 = Math.round(cxf - hx), x1 = Math.round(cxf + hx) - 1, z0 = Math.round(czf - hz), z1 = Math.round(czf + hz) - 1;
        const body = j % 4 === 3 ? B.CHROME : (j % 4 === 1 ? B.PANEL_BLACK : B.DURASTEEL_DARK);
        const yy = y0 + 1 + j;
        slab(bp, x0, z0, x1, z1, yy, body);
        if (j % 2 === 0 && x1 > x0 && z1 > z0) { bp.set(x0, yy, z0, B.GLOW_PANEL_BLUE); bp.set(x1, yy, z1, B.GLOW_PANEL_BLUE); bp.set(x0, yy, z1, B.GLOW_PANEL_BLUE); bp.set(x1, yy, z0, B.GLOW_PANEL_BLUE); }
      }
      bp.set(Math.round(cxf - 0.5), y0 + hb, Math.round(czf - 0.5), B.GLOW_PANEL); bp.set(Math.round(cxf - 0.5), y0 + hb + 1, Math.round(czf - 0.5), B.GLOW_PANEL_BLUE);
      const alongX = W(e) >= D(e);
      for (let k = -1; k <= 1; k += 2) {
        const fx = alongX ? cx + k * Math.max(2, Math.floor(W(e) / 4)) : cx, fz = alongX ? cz : cz + k * Math.max(2, Math.floor(D(e) / 4));
        bp.fill(fx, y0 + 1, fz, fx, y0 + Math.min(8, hb - 2), fz, B.CHROME); bp.set(fx, y0 + Math.min(9, hb - 1), fz, B.GLOW_PANEL_BLUE);
      }
      return hb + 2;
    }
    case 'fins': {
      // on the slab roof itself (the last tier is only the stair head): chrome fins at the roof corners with blue
      // tips and a lit parapet; the spine column between the slabs is the family's real crown
      const te = plan.top.ext, yr = plan.R;
      for (const [x, z] of [[te.x0 + 1, te.z0 + 1], [te.x1 - 1, te.z0 + 1], [te.x0 + 1, te.z1 - 1], [te.x1 - 1, te.z1 - 1]]) { if (!bp.inside(x, yr, z)) continue; bp.fill(x, yr + 1, z, x, yr + 6, z, B.CHROME); bp.set(x, yr + 7, z, B.GLOW_PANEL_BLUE); }
      bp.walls(te.x0, yr + 1, te.z0, te.x1, yr + 1, te.z1, B.GLOW_PANEL);
      return Math.max(0, yr + 8 - y0);
    }
    default: return 0;
  }
}

// The cantilevered landing deck: the plant tier's roof becomes a DECK_PLATE platform that runs out to the top-floor
// wall on the chosen side, five blocks above the roof terrace, with a tapered underside, rails, lamp posts, blue
// rim lights, touchdown marks, a holo sign and a parked speeder; the stair head rises through it.
function paintDeck(bp, plan, style, o) {
  const F = plan.frame, c = plan.core, t = plan.tiers[0], side = plan.cap.side;
  const tc = plan.top.clip, y = 5 * t.f + 5;              // deck plate level (walk level y + 1)
  // the deck spans the whole top-floor width across the deck direction, and from the tier wall to the top wall along it
  const clip = side === 'l' ? { u0: tc.u0, u1: t.clip.u1, v0: tc.v0, v1: tc.v1 }
    : side === 'r' ? { u0: t.clip.u0, u1: tc.u1, v0: tc.v0, v1: tc.v1 }
    : side === 'f' ? { u0: tc.u0, u1: tc.u1, v0: tc.v0, v1: t.clip.v1 }
    : { u0: tc.u0, u1: tc.u1, v0: t.clip.v0, v1: tc.v1 };
  const e = F.rect(clip.u0, clip.v0, clip.u1, clip.v1);
  const te = t.ext;
  slab(bp, e.x0, e.z0, e.x1, e.z1, y, B.DECK_PLATE);
  // tapered underside (struts) under the overhang only
  for (let k = 1; k <= 3; k++) {
    for (let x = e.x0; x <= e.x1; x++) for (let z = e.z0; z <= e.z1; z++) {
      if (inRect(te, x, z)) continue;
      const dEdge = Math.min(x - e.x0, e.x1 - x, z - e.z0, e.z1 - z);
      const dTier = Math.max(te.x0 - x, x - te.x1, te.z0 - z, z - te.z1);
      if (dEdge >= k && dTier <= 4 - k && (k === 1 || (x + z) % 2 === 0)) { const v = bp.get(x, y - k, z); if (v === 0 || v === AIR) bp.set(x, y - k, z, k === 1 ? B.DURASTEEL_DARK : B.DURASTEEL); }
    }
  }
  // rails (with blue rim lights in the plate) on the free edges, lamp posts at the corners
  const rails = [];
  for (let x = e.x0; x <= e.x1; x++) for (let z = e.z0; z <= e.z1; z++) {
    const edge = x === e.x0 || x === e.x1 || z === e.z0 || z === e.z1;
    if (!edge || inRect(te, x, z)) continue;
    const corner = (x === e.x0 || x === e.x1) && (z === e.z0 || z === e.z1);
    if (corner) { bp.fill(x, y + 1, z, x, y + 2, z, B.IRON_BARS); bp.set(x, y + 3, z, B.CITY_LAMP); continue; }
    rails.push([x, z]);
    bp.set(x, y + 1, z, B.IRON_BARS);
    if ((x + z) % 4 === 0) bp.set(x, y, z, B.GLOW_PANEL_BLUE);
  }
  // touchdown marks: the free area's centre
  const free = side === 'l' ? { x0: e.x0, x1: te.x0 - 1, z0: e.z0, z1: e.z1 } : side === 'r' ? { x0: te.x1 + 1, x1: e.x1, z0: e.z0, z1: e.z1 }
    : side === 'f' ? { x0: e.x0, x1: e.x1, z0: e.z0, z1: te.z0 - 1 } : { x0: e.x0, x1: e.x1, z0: te.z1 + 1, z1: e.z1 };
  // (the frame maps l/r/f to lot sides; recompute the free rect as the part of e outside the tier ext)
  const fr = { x0: e.x0, x1: e.x1, z0: e.z0, z1: e.z1 };
  if (te.x0 > e.x0 && te.x1 >= e.x1) fr.x1 = te.x0 - 1; else if (te.x1 < e.x1 && te.x0 <= e.x0) fr.x0 = te.x1 + 1;
  else if (te.z0 > e.z0 && te.z1 >= e.z1) fr.z1 = te.z0 - 1; else if (te.z1 < e.z1) fr.z0 = te.z1 + 1;
  void free;
  const mx = Math.floor((fr.x0 + fr.x1) / 2), mz = Math.floor((fr.z0 + fr.z1) / 2);
  if (W(fr) >= 7 && D(fr) >= 7) {
    for (let k = -2; k <= 2; k++) { bp.set(mx + k, y, mz - 2, B.PANEL_STRIPE); bp.set(mx + k, y, mz + 2, B.PANEL_STRIPE); bp.set(mx - 2, y, mz + k, B.PANEL_STRIPE); bp.set(mx + 2, y, mz + k, B.PANEL_STRIPE); }
    bp.set(mx, y, mz, B.GLOW_PANEL);
  }
  // parked speeder: nose, cockpit, twin engine (3 blocks + canopy) beside the mark, along the deck's long side
  const alongX = W(fr) >= D(fr);
  const sx = alongX ? fr.x0 + 2 : mx + (W(fr) >= 9 ? 3 : 0), sz = alongX ? mz + (D(fr) >= 9 ? 3 : 0) : fr.z0 + 2;
  if (bp.inside(sx, y + 1, sz) && inRect(fr, sx, sz) && inRect(fr, alongX ? sx + 3 : sx, alongX ? sz : sz + 3)) {
    const P = (k, id) => bp.set(alongX ? sx + k : sx, y + 1, alongX ? sz : sz + k, id);
    P(0, B.CHROME); P(1, B.DURASTEEL); P(2, B.DURASTEEL); P(3, B.GLOW_PANEL_BLUE);
    bp.set(alongX ? sx + 1 : sx, y + 2, alongX ? sz : sz + 1, B.STEEL_GLASS);
  }
  // holo sign and hangar-style lintel on the plant tier wall facing the deck, over the tier door
  for (const d of doorCells(plan, t)) { if (bp.inside(d.x, y + 3, d.z)) bp.set(d.x, y - 1, d.z, B.PANEL_STRIPE); }
  const signX = fr.x0 === e.x0 && fr.x1 < e.x1 ? te.x0 : fr.x0 > e.x0 ? te.x1 : mx, signZ = fr.z0 === e.z0 && fr.z1 < e.z1 ? te.z0 : fr.z0 > e.z0 ? te.z1 : mz;
  void signX; void signZ;
  // the stair head on the deck: doors face the corridor side; a sign on its roof edge and a beacon
  const head = plan.tiers[1];
  if (head) {
    const he = head.ext, yTop = 5 * head.f + 5;
    slab(bp, he.x0, he.z0, he.x1, he.z1, yTop, style.roof);
    bp.walls(he.x0, yTop + 1, he.z0, he.x1, yTop + 1, he.z1, B.GLOW_PANEL);
    bp.set(Math.floor((he.x0 + he.x1) / 2), yTop + 1, Math.floor((he.z0 + he.z1) / 2), B.HOLO_SIGN);
    finial(bp, he.x0, yTop + 2, he.z0, 3, B.PANEL_RED);
    // the head's stair door opens onto the deck: make sure the cells in front are clear plate
    const ux = F.X(c.u0 + 4, c.v0 - 1), uz = F.Z(c.u0 + 4, c.v0 - 1), vx = F.X(c.u0 + 5, c.v0 - 1), vz = F.Z(c.u0 + 5, c.v0 - 1);
    for (const [x, z] of [[ux, uz], [vx, vz]]) { bp.set(x, y, z, B.DECK_PLATE); bp.set(x, y + 1, z, AIR); bp.set(x, y + 2, z, AIR); }
  }
  return 8;
}
