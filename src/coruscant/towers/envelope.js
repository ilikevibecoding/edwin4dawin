// Tower envelopes (docs/rubrics/18_architecture_v2.md rules 1-5, 9, 13): the massing plan of a lot as a pure function
// of (lot, family, kind) - the stack of shells (podium + receding tiers), the footprint mask of every tier (octagon,
// rounded square, ellipse, faceted blade), the lit ring-ledge cadence, the landing-deck floors and side, and the
// stair-stepped buttresses - so the blueprint builder (towers/tiered.js) and the far impostors (skyline.js) draw the
// same silhouette without sharing a blueprint.
//
//   envelopeFor(lot, family, kind, o) -> { kind, tiers, mask, ledgeEvery, deckSide, deckFloors, buttress, fins, nF, podiumEnd }
//   tiers: [{ f0, f1, inset: { l, r, f, b }, shape }] on the 5-block floor lattice (f0..f1 inclusive), inset in plan
//          cells per side (l / r along the front, f = front, b = back), clamped to what the floor plan allows
//   mask(x, z, i, e): footprint of tier i inside its wall rect e (blueprint-local xz), as buildTiered expects
//
// The floor plan (plan.js) only lets a footprint recede where the lift core, the connector and the first corridor
// are not - on a 16-wide lot that is the front and one side - so tapers are asymmetric where the plan demands and
// the tiers stay roomy enough for the room library; chamfers and curves keep the core box, the row in front of its
// doors and the entrance inside the footprint (mustHold), else the mask falls back to a milder one.
import { PlanFrame, computeLayout, insetLimits } from '../plan.js';
import { hash2 } from '../../rng.js';

export const ENVELOPES = ['octagon', 'rounded', 'ellipse', 'blade', 'stacked', 'buttress', 'rect'];
const ROUND_P = 3.2;            // superellipse exponent of the rounded square
const FLAT_FRONT_ROWS = 3;      // podium rows behind the entrance face that stay straight (door + boulevard gangway)
export const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };

// World face of a plan side ('f' front, 'b' back, 'l' = u0, 'r' = u1) for a frame whose entrance wall is `front`.
export function sideFace(front, side) {
  if (side === 'f') return front;
  if (side === 'b') return OPPOSITE[front];
  if (front === 'S' || front === 'N') return side === 'l' ? 'W' : 'E';
  return side === 'l' ? 'N' : 'S';
}

// Envelope kinds a family may take on a lot of this size (min side s, plan limits lim). Order = preference.
export function envelopeCandidates(family, lot) {
  const s = Math.min(lot.w, lot.d);
  const wide = s >= 26, deep = s >= 30;
  switch (family) {
    case 'slab': return ['octagon', 'rounded', 'buttress', 'blade', ...(wide ? ['stacked'] : [])];
    case 'setback': return ['rounded', 'octagon', ...(wide ? ['stacked'] : []), ...(deep ? ['ellipse'] : []), 'buttress'];
    case 'habitat': return ['ellipse', 'rounded', 'octagon'];
    case 'spire': return ['rounded', ...(wide ? ['stacked'] : []), ...(deep ? ['ellipse'] : []), 'octagon'];
    case 'needle': return ['blade', 'octagon', 'buttress'];
    case 'spine': return ['octagon', 'blade'];
    case 'twin': return ['octagon', 'rounded'];
    case 'pad': return ['octagon', 'rounded'];
    case 'civic': return ['rounded', 'octagon'];
    case 'stack': return ['buttress', 'octagon'];
    case 'hall': return ['octagon'];
    default: return ['octagon', 'rounded'];
  }
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// o: { ext (default = the lot), front, door ({x, z} blueprint-local, default = the front centre), nF, midDoorF, seed,
//      deck (true / false / a plan side 'f' | 'b' | 'l' | 'r' to force the deck side), deckEvery (floors),
//      noInset (plan sides that must stay straight) }
export function envelopeFor(lot, family, kind, o = {}) {
  const ext = o.ext || { x0: 0, z0: 0, x1: lot.w - 1, z1: lot.d - 1 };
  const front = o.front || lot.front || (lot.door && lot.door.side) || 'S';
  const height = Math.max(10, lot.height ?? 60);
  const nF = o.nF ?? Math.max(2, Math.round(height / 5));
  const midDoorF = o.midDoorF ?? (lot.midDoor ? 7 : -1);
  const seed = (o.seed ?? lot.seed ?? 1) >>> 0;
  const frame = new PlanFrame(ext, front);
  const layout = computeLayout(frame.Iu, frame.Iv);
  const lim = insetLimits(frame, layout);
  // sides a family needs straight for its own construction (twin / spine shafts: the arcade face the bridges land on)
  for (const s of o.noInset || []) lim[s] = 0;
  const h = (k) => hash2(seed, 0xE1 + k, 0x18);
  const w = ext.x1 - ext.x0 + 1, d = ext.z1 - ext.z0 + 1, small = Math.min(w, d);
  if (!ENVELOPES.includes(kind)) kind = 'octagon';
  // a stacked (disc-on-a-stalk) plan needs a stalk that recedes on >= 3 sides; a blade needs a lot to cut into
  const sidesFree = ['l', 'r', 'f', 'b'].filter((s) => lim[s] >= 3).length;
  if (kind === 'stacked' && (sidesFree < 3 || small < 24)) kind = 'rounded';
  if (kind === 'ellipse' && small < 30) kind = 'rounded';

  // ---- shells: the podium (lobby + gallery, up to the boulevard-gangway floor) and 1-4 receding tiers
  const podiumEnd = Math.max(1, Math.min(nF - 2, midDoorF >= 2 ? midDoorF : 1));
  const tiers = [{ f0: 0, f1: podiumEnd, inset: { l: 0, r: 0, f: 0, b: 0 }, shape: kind === 'rect' ? 'rect' : kind, podium: true }];
  const above = nF - 1 - podiumEnd;
  let shells = above >= 22 ? 4 : above >= 12 ? 3 : above >= 6 ? 2 : above >= 2 ? 1 : 0;
  // the tallest towers keep straight shafts longer: the first shell takes ~45% of the body, the rest share the top
  const stepOf = (side, k) => Math.min(lim[side], kind === 'stacked' ? 0 : (family === 'setback' || family === 'spire' ? 2 : 1) * k + (family === 'needle' ? -k + Math.ceil(k / 2) : 0));
  let f = podiumEnd + 1;
  if (kind === 'stacked' && shells > 0) {
    // discs on a stalk: alternate a 2-floor stalk (inset on every free side) with 3-4 floor discs (full footprint);
    // the stack always ends in a disc - the cap platform the crown stands on
    let k = 0;
    const a = Math.min(4, Math.max(3, Math.floor(small * 0.18)));
    const stalkInset = () => ({ l: Math.min(lim.l, a), r: Math.min(lim.r, a), f: Math.min(lim.f, a), b: Math.min(lim.b, a) });
    while (f <= nF - 1) {
      const stalk = k % 2 === 0;
      const n = stalk ? 2 : 3 + (k % 4 === 1 ? 1 : 0);
      const f1 = Math.min(nF - 1, f + n - 1);
      tiers.push({ f0: f, f1, inset: stalk ? stalkInset() : { l: 0, r: 0, f: 0, b: 0 }, shape: stalk ? 'octagon' : 'rounded', stalk, disc: !stalk });
      f = f1 + 1; k++;
    }
    const last = tiers[tiers.length - 1];
    if (last.stalk) { last.inset = { l: 0, r: 0, f: 0, b: 0 }; last.shape = 'rounded'; last.stalk = false; last.disc = true; }
  } else {
    const share = shells >= 3 ? [0.45, 0.25, 0.18, 0.12] : shells === 2 ? [0.6, 0.4] : [1];
    for (let k = 1; k <= shells && f <= nF - 1; k++) {
      const n = k === shells ? nF - f : Math.max(1, Math.round(above * share[k - 1]));
      const f1 = Math.min(nF - 1, f + n - 1);
      const inset = { l: stepOf('l', k), r: stepOf('r', k), f: stepOf('f', k), b: stepOf('b', k) };
      tiers.push({ f0: f, f1, inset, shape: kind === 'rect' || kind === 'buttress' ? (k === 1 ? 'rect' : 'octagon') : kind });
      f = f1 + 1;
    }
    if (f <= nF - 1) tiers[tiers.length - 1].f1 = nF - 1;
  }

  // ---- landing decks (rule 13): towers >= 80 hang cantilevered decks off the side with the most room, the front
  // (over the boulevard) preferred; the shells above the podium recede >= 5 there so the deck reaches the lot edge
  let deckSide = null, deckFloors = [];
  const wantDeck = o.deck ?? (nF >= 16 && h(7) < 0.5);
  if (wantDeck && kind !== 'stacked' && tiers.length > 1) {
    const forced = typeof wantDeck === 'string' ? wantDeck : null;
    const order = forced ? [forced].filter((s) => lim[s] >= 5) : ['f', 'r', 'l', 'b'].filter((s) => lim[s] >= 5).sort((p, q) => (lim[q] - lim[p]) + (p === 'f' ? -1 : 0) + (q === 'f' ? 1 : 0));
    if (order.length) {
      deckSide = order[0];
      for (let i = 1; i < tiers.length; i++) tiers[i].inset[deckSide] = Math.max(tiers[i].inset[deckSide], 5);
      const every = Math.max(3, o.deckEvery | 0 || 6);
      for (let ff = podiumEnd + 3; ff <= nF - 3; ff += every) deckFloors.push(ff);
    }
  }
  // every shell keeps >= 8 plan cells across and deep for the room library (the podium is never inset)
  for (const t of tiers) {
    if (frame.Iu - t.inset.l - t.inset.r < 8) { t.inset.r = Math.max(0, frame.Iu - 8 - t.inset.l); if (frame.Iu - t.inset.l - t.inset.r < 8) t.inset.l = Math.max(0, frame.Iu - 8 - t.inset.r); }
    if (frame.Iv - t.inset.f - t.inset.b < 8) { t.inset.f = Math.max(0, frame.Iv - 8 - t.inset.b); if (frame.Iv - t.inset.f - t.inset.b < 8) t.inset.b = Math.max(0, frame.Iv - 8 - t.inset.f); }
  }
  // a deck side whose inset the room rule took back again cannot carry decks
  if (deckSide && tiers.slice(1).some((t) => t.inset[deckSide] < 4)) { deckSide = null; deckFloors = []; }

  // ---- footprint masks. Blueprint-local xz over the tier's wall rect e; tabulated once per tier by buildTiered.
  // Every corner gets the largest radius (arc) or chamfer that keeps the plan's corridors, core and door whole, so
  // a narrow lot whose connector corridor hugs one side comes out D-shaped rather than boxy.
  const doorU = o.door ? frame.U(o.door.x, o.door.z) : Math.floor(frame.Iu / 2) - 1;
  const must = mustCells(frame, layout, doorU);
  const blade = { nw: clamp(Math.round(small * 0.32), 3, 8), se: clamp(Math.round(small * 0.32), 3, 8), ne: 1, sw: 1 };
  if (h(3) < 0.5) { const t = blade.nw; blade.nw = blade.ne; blade.ne = t; blade.se = blade.sw; blade.sw = t; }
  const cache = new Map();   // tier rect -> predicate (with the corner fit already resolved)
  const shapeOf = (i) => (tiers[i] ? tiers[i].shape : kind);
  const predicateFor = (e, i) => {
    const key = `${e.x0},${e.z0},${e.x1},${e.z1},${i}`;
    let p = cache.get(key);
    if (p) return p;
    const shape = shapeOf(i), podium = i === 0;
    const es = Math.min(e.x1 - e.x0 + 1, e.z1 - e.z0 + 1);
    p = null;
    if (shape === 'ellipse') { const q = ellipsePredicate(e, front, podium); if (q && holds(q, e, must)) p = q; }
    if (!p && shape !== 'rect' && es >= 8) {
      const r = shape === 'ellipse' || shape === 'rounded' ? clamp(Math.round(es * 0.4), 4, 14) : clamp(Math.round(es * 0.22), 2, 6);
      const want = shape === 'blade' ? blade : { nw: r, ne: r, sw: r, se: r };
      p = fitCorners(e, want, shape === 'ellipse' || shape === 'rounded' ? 2 : 1, must, podium ? front : null);
    }
    if (!p) p = () => true;
    cache.set(key, p);
    return p;
  };
  const mask = kind === 'rect' ? null : (x, z, i, e) => predicateFor(e, i)(x, z);

  return {
    kind, tiers, mask, nF, podiumEnd, front, lim, frame,
    ledgeEvery: 5 + Math.floor(h(4) * 4),                       // 5..8 floors (<= 20 asked by the rubric)
    deckSide, deckFloors, deckFace: deckSide ? sideFace(front, deckSide) : null,
    buttress: kind === 'buttress' || (kind === 'octagon' && h(5) < 0.25 && sidesFree >= 1),
    fins: h(6) < 0.6,                                            // projecting fin columns on inset shells
    flatFront: FLAT_FRONT_ROWS,
  };
}

// Cells (blueprint xz) every tier footprint has to contain with all four neighbours: the core box and the corridor
// row in front of its doors, the entrance cells behind the lot door (doorU = plan column of the door centre), and the
// connector corridor from the first spine to the last one / past the core - the run every other corridor hangs off,
// so no corner cut can strand a wing.
function mustCells(frame, layout, doorU) {
  const c = layout.core, con = layout.connector, out = [];
  for (let u = c.u0; u <= c.u1; u++) for (let v = c.v0 - 1; v <= c.v1; v++) out.push([frame.X(u, v), frame.Z(u, v)]);
  for (let u = doorU - 2; u <= doorU + 2; u++) for (let v = 0; v <= 1; v++) out.push([frame.X(u, v), frame.Z(u, v)]);
  const vLast = Math.max(layout.spines[layout.spines.length - 1].v1, c.v1);
  for (let u = con.u0; u <= con.u1; u++) for (let v = layout.s0; v <= vLast; v++) out.push([frame.X(u, v), frame.Z(u, v)]);
  return out;
}
function holds(q, e, must) {
  for (const [x, z] of must) {
    if (x < e.x0 || x > e.x1 || z < e.z0 || z > e.z1) continue;    // outside this tier's rect: the tier is a setback
    if (!q(x, z) || !q(x - 1, z) || !q(x + 1, z) || !q(x, z - 1) || !q(x, z + 1)) return false;
  }
  return true;
}
// front-row test for the podium: cells in the rows behind the entrance face, within 80% of the face's half width
function flatFront(e, front, x, z) {
  const w = e.x1 - e.x0 + 1, d = e.z1 - e.z0 + 1;
  const near = front === 'S' ? e.z1 - z < FLAT_FRONT_ROWS : front === 'N' ? z - e.z0 < FLAT_FRONT_ROWS : front === 'E' ? e.x1 - x < FLAT_FRONT_ROWS : x - e.x0 < FLAT_FRONT_ROWS;
  if (!near) return false;
  const along = front === 'S' || front === 'N' ? Math.abs(x + 0.5 - (e.x0 + w / 2)) / (w / 2) : Math.abs(z + 0.5 - (e.z0 + d / 2)) / (d / 2);
  return along <= 0.8;
}
// The full ellipse inscribed in the tier rect (a flat entrance face on the podium); null on rects too small for it.
function ellipsePredicate(e, front, podium) {
  const w = e.x1 - e.x0 + 1, d = e.z1 - e.z0 + 1;
  if (Math.min(w, d) < 8) return null;
  const rx = w / 2, rz = d / 2, cx = e.x0 + rx, cz = e.z0 + rz;
  const px = new Float64Array(w), pz = new Float64Array(d);
  for (let i = 0; i < w; i++) px[i] = Math.pow(Math.abs(e.x0 + i + 0.5 - cx) / rx, 2);
  for (let j = 0; j < d; j++) pz[j] = Math.pow(Math.abs(e.z0 + j + 0.5 - cz) / rz, 2);
  return (x, z) => {
    if (x < e.x0 || x > e.x1 || z < e.z0 || z > e.z1) return false;
    if (px[x - e.x0] + pz[z - e.z0] <= 1) return true;
    return podium && flatFront(e, front, x, z);
  };
}
// Corner mask: each corner (nw = x0,z0 ... se = x1,z1) cut by a quarter-superellipse of radius radii[c] cells and
// exponent p (p = 1: a straight chamfer of radii[c] cells). front (podium only) keeps the entrance rows straight.
function cornerMask(e, radii, p, front) {
  const { x0, x1, z0, z1 } = e;
  const keep = (r, a, b) => {
    if (r <= 0 || a >= r || b >= r) return true;
    if (p === 1) return (a - 0.5) + (b - 0.5) >= r;
    return Math.pow((r - a) / r, p) + Math.pow((r - b) / r, p) <= 1;
  };
  return (x, z) => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return false;
    const a0 = x - x0 + 0.5, a1 = x1 - x + 0.5, b0 = z - z0 + 0.5, b1 = z1 - z + 0.5;
    if (keep(radii.nw, a0, b0) && keep(radii.ne, a1, b0) && keep(radii.sw, a0, b1) && keep(radii.se, a1, b1)) return true;
    return !!front && flatFront(e, front, x, z);
  };
}
// Shrinks each corner's radius until the must cells hold (the corners' boxes never overlap: radius <= half the
// short side), so the result always holds; a corner at radius 0 is a plain box corner.
function fitCorners(e, want, p, must, front) {
  const cap = Math.floor((Math.min(e.x1 - e.x0 + 1, e.z1 - e.z0 + 1) - 4) / 2);
  const radii = { nw: Math.min(want.nw, cap), ne: Math.min(want.ne, cap), sw: Math.min(want.sw, cap), se: Math.min(want.se, cap) };
  for (const k of ['nw', 'ne', 'sw', 'se']) {
    while (radii[k] > 0) {
      if (holds(cornerMask(e, { nw: 0, ne: 0, sw: 0, se: 0, [k]: radii[k] }, p, front), e, must)) break;
      radii[k]--;
    }
  }
  if (radii.nw + radii.ne + radii.sw + radii.se === 0) return null;
  return cornerMask(e, radii, p, front);
}

// Silhouette of an envelope for the far impostors: per shell the wall rect (blueprint-local, inclusive) and the
// chamfer to cut off its corners (0 = box). Rounded plans read as octagons at impostor distance.
export function envelopeProfile(env) {
  const F = env.frame, out = [];
  env.tiers.forEach((t, i) => {
    const clip = { u0: t.inset.l, u1: F.Iu - 1 - t.inset.r, v0: t.inset.f, v1: F.Iv - 1 - t.inset.b };
    const e = F.rect(clip.u0 - 1, clip.v0 - 1, clip.u1 + 1, clip.v1 + 1);
    const small = Math.min(e.x1 - e.x0 + 1, e.z1 - e.z0 + 1);
    const chamfer = t.shape === 'rect' ? 0 : t.shape === 'ellipse' ? Math.round(small * 0.29) : t.shape === 'rounded' ? Math.round(small * 0.2) : clamp(Math.round(small * 0.22), 2, 6);
    out.push({ f0: t.f0, f1: t.f1, ext: e, chamfer: Math.min(chamfer, Math.floor((small - 2) / 2)), shape: t.shape, disc: !!t.disc, stalk: !!t.stalk, index: i });
  });
  return out;
}

// The two shafts of a twin / spine lot (blueprint-local rects, inclusive) either side of the five-wide arcade on the
// lot's door column: shafts side by side along x when the front is N / S, along z otherwise; each shaft's own front
// is the arcade face, its door at the arcade's middle. twin.js / spine.js build with these, skyline.js draws them.
export function twinShafts(w, d, front) {
  const alongX = front === 'N' || front === 'S';
  const L = alongX ? w : d, T = alongX ? d : w;
  const mid = L >> 1, g0 = mid - 2, g1 = mid + 2, dc = T >> 1;
  const rectA = alongX ? { x0: 0, x1: g0 - 1, z0: 0, z1: d - 1 } : { x0: 0, x1: w - 1, z0: 0, z1: g0 - 1 };
  const rectB = alongX ? { x0: g1 + 1, x1: w - 1, z0: 0, z1: d - 1 } : { x0: 0, x1: w - 1, z0: g1 + 1, z1: d - 1 };
  const frontA = alongX ? 'E' : 'S', frontB = alongX ? 'W' : 'N';
  const doorA = alongX ? { x: g0 - 1, z: dc } : { x: dc, z: g0 - 1 };
  const doorB = alongX ? { x: g1 + 1, z: dc } : { x: dc, z: g1 + 1 };
  return { alongX, L, T, mid, g0, g1, dc, rectA, rectB, frontA, frontB, doorA, doorB };
}

// Envelope options a family passes besides the defaults (pad.js forces its decks onto the front every 4 floors,
// civic.js hangs none); skyline.js mirrors them so the impostor recedes where the tower does.
export const FAMILY_ENVELOPE_OPTS = { pad: { deck: 'f', deckEvery: 4 }, civic: { deck: false } };
