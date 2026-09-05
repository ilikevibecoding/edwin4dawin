// Coruscant city layout: districts, the three-level street grid, lots, civic landmarks, plazas, skybridges and the
// stair/lift towers that connect the levels. Pure and deterministic: `getLayout(seed)` is memoised and nothing here
// touches the world, the DOM or Math.random. Consumed by city.js (streets + chunk fill) and buildings.js (blueprints).
//
// Coordinates: world blocks, half-open rectangles [x0, x1) x [z0, z1). Vertical levels (see LEVELS):
//   ground 60 = plateau top block = undercity floor (feet at 61)      deck 95 = boulevard slab (feet at 96)
//   tower floors sit on y = 60 + 5k (feet 61 + 5k), skybridge floors on the same lattice between 130 and 190.
import { REGIONS } from '../worldgen.js';
import { RNG, hash2, clamp } from '../rng.js';
import { SimplexNoise } from '../noise.js';

const C = REGIONS.coruscant;
export const PLATEAU = { x0: C.cx - C.half, z0: C.cz - C.half, x1: C.cx + C.half + 1, z1: C.cz + C.half + 1, cx: C.cx, cz: C.cz };
export const LEVELS = {
  ground: C.ground, underWalk: C.ground + 1, underTop: C.ground + 20,
  deck: 95, midWalk: 96, skyMin: 130, skyMax: 190, skyLane: 210,
  floorBase: C.ground, floorPitch: 5,
};
export const DECK_HALF = 6;           // a boulevard deck spans [line - 6, line + 6): 12 wide
export const DECK_W = DECK_HALF * 2;
export const MARGIN = 4;              // undercity walkway between the deck edge and the lots (stairs/lifts live here)
export const RIM = 6;                 // edge promenade around the plateau
export const LOT_MIN = 16, LOT_MAX = 48;
// Reserved for the spaceport builder (west edge) and the space train's hyperlane approach; nothing is painted inside.
export const SPACEPORT = { x0: PLATEAU.x0, z0: -180, x1: PLATEAU.x0 + 232, z1: 180 };
export const HYPERLANE = { x0: PLATEAU.x0, z0: -12, x1: PLATEAU.x0 + 72, z1: 12, y: 90 };
export const INDEX_CELL = 64;

// District profiles: tower heights (blocks above the ground), placeholder family names for the tower builder,
// lit-window fraction at night, and the population archetypes/density the NPC system will read (rubric row 7).
export const DISTRICT_PROFILE = {
  senate: { hmin: 80, hmax: 160, families: ['civic', 'slab', 'twin'], lit: 0.45, archetypes: ['senator', 'aide', 'guard', 'protocol droid'], density: 0.6 },
  financial: { hmin: 90, hmax: 190, families: ['slab', 'twin', 'cylinder', 'setback'], lit: 0.5, archetypes: ['office worker', 'executive', 'security droid', 'courier'], density: 1.0 },
  residential: { hmin: 40, hmax: 120, families: ['setback', 'habitat', 'slab'], lit: 0.4, archetypes: ['resident', 'child', 'maintenance droid', 'vendor'], density: 1.2 },
  industrial: { hmin: 30, hmax: 80, families: ['stack', 'slab'], lit: 0.25, archetypes: ['dock worker', 'mechanic', 'cargo droid', 'foreman'], density: 0.5 },
  entertainment: { hmin: 40, hmax: 110, families: ['pad', 'setback', 'cylinder'], lit: 0.6, archetypes: ['patron', 'musician', 'bartender', 'bouncer'], density: 1.4 },
  market: { hmin: 20, hmax: 50, families: ['hall', 'stack'], lit: 0.5, archetypes: ['vendor', 'shopper', 'pickpocket', 'astromech'], density: 1.6 },
  spaceport: { hmin: 0, hmax: 0, families: [], lit: 0, archetypes: ['pilot', 'passenger', 'customs officer', 'loader droid'], density: 0.8 },
};
// District map (first matching rectangle wins; together they tile the plateau).
const DISTRICT_RECTS = [
  { kind: 'spaceport', ...SPACEPORT },
  { kind: 'market', x0: SPACEPORT.x1, z0: -180, x1: 2880, z1: 180 },
  { kind: 'senate', x0: 2880, z0: -120, x1: 3120, z1: 120 },
  { kind: 'industrial', x0: PLATEAU.x0, z0: PLATEAU.z0, x1: 2880, z1: -180 },
  { kind: 'entertainment', x0: PLATEAU.x0, z0: 180, x1: 2880, z1: PLATEAU.z1 },
  { kind: 'financial', x0: 2880, z0: PLATEAU.z0, x1: PLATEAU.x1, z1: -120 },
  { kind: 'financial', x0: 3120, z0: -120, x1: PLATEAU.x1, z1: 0 },
  { kind: 'residential', x0: 2880, z0: 120, x1: PLATEAU.x1, z1: PLATEAU.z1 },
  { kind: 'residential', x0: 3120, z0: 0, x1: PLATEAU.x1, z1: 120 },
];
// Signature landmarks (docs/rubrics/06_landmarks.md): each merges a span of sx x sz blocks (2x2 by default) whose
// centre is nearest `near`; the boulevard lines inside the merged lot are cut. Order matters: earlier entries win
// their blocks. Heights are blocks above the plateau; `family` is the id of the landmark module.
export const LANDMARKS = [
  { family: 'senate', name: 'Galactic Senate', near: [PLATEAU.cx, PLATEAU.cz], height: 90, span: [3, 3] },
  { family: 'temple', name: 'Jedi Temple', near: [3180, -240], height: 190, span: [3, 3] },
  { family: 'plaza_monument', name: 'Monument Plaza', near: [3200, 0], height: 30, span: [3, 3] },
  { family: 'underworld', name: 'Uscru undercity strip', near: [2760, 330], height: 35, span: [3, 3] },
  { family: 'works', name: 'The Works foundry', near: [2620, -420], height: 60, span: [3, 2] },
  { family: 'market', name: 'CoCo Town market halls', near: [2780, -100], height: 25, span: [3, 2] },
  { family: 'opera', name: 'Galaxies Opera House', near: [2668, 240], height: 60, span: [2, 2] },
  { family: 'republica', name: '500 Republica', near: [3000, 300], height: 200, span: [2, 2] },
  { family: 'chancellery', name: 'Senate Office Building', near: [2830, 70], height: 120, span: [2, 2] },
  { family: 'medcenter', name: 'Grand Republic Medical Facility', near: [3350, 200], height: 110, span: [2, 2] },
  { family: 'detention', name: 'Republic Judiciary Central Detention Center', near: [2800, -300], height: 70, span: [2, 2] },
  { family: 'holonet', name: 'HoloNet broadcast tower', near: [3350, -300], height: 170, span: [2, 2] },
];

export function districtAt(x, z) {
  for (const r of DISTRICT_RECTS) if (x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) return r.kind;
  return 'residential';
}
const inRect = (r, x, z) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1;
const rectsIntersect = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
const mix = (seed, a, b) => Math.floor(hash2(a, b, seed) * 0x7fffffff);

// ------------------------------------------------------------------------------------------------ boulevard lines
// Lines are boulevard centre coordinates. Fixed lines frame the senate (centre +-68), the spaceport's east edge
// (x = 2720 + 6) and its north/south edges (z = +-186); the rest fills the gaps with 48..64 spacing.
function fillLines(rng, out, from, to) {
  const len = Math.abs(to - from), dir = Math.sign(to - from);
  const nMin = Math.ceil(len / 64), nMax = Math.max(nMin, Math.floor(len / 48));
  const n = rng.int(nMin, nMax);
  if (n < 1) return;
  const step = len / n;
  for (let k = 1; k < n; k++) out.push(Math.round(from + dir * step * k + (rng.next() - 0.5) * 6));
}

function buildLines(rng) {
  const xs = [SPACEPORT.x1 + DECK_HALF, PLATEAU.cx - 68, PLATEAU.cx, PLATEAU.cx + 68];
  fillLines(rng, xs, xs[0], PLATEAU.x0 + RIM);
  fillLines(rng, xs, xs[0], PLATEAU.cx - 68);
  fillLines(rng, xs, PLATEAU.cx + 68, PLATEAU.x1 - RIM);
  const zs = [-186, -68, 0, 68, 186];
  fillLines(rng, zs, -186, PLATEAU.z0 + RIM);
  fillLines(rng, zs, -186, -68);
  fillLines(rng, zs, 68, 186);
  fillLines(rng, zs, 186, PLATEAU.z1 - RIM);
  xs.sort((a, b) => a - b); zs.sort((a, b) => a - b);
  return { xs, zs };
}

// Splits a block edge of length L into lot lengths (16..48) separated by 3..5 wide alleys. Returns [[start, len]].
function splitLots(rng, L) {
  if (L < LOT_MIN) return [];
  if (L <= LOT_MAX && (L < 2 * LOT_MIN + 3 || rng.next() < 0.3)) return [[0, L]];
  if (L < 2 * LOT_MIN + 3) return [[0, Math.min(L, LOT_MAX)]];
  const gap = rng.int(3, 5);
  const a = clamp(Math.round((L - gap) * rng.range(0.35, 0.65)), LOT_MIN, L - gap - LOT_MIN);
  const left = splitLots(rng, a), right = splitLots(rng, L - a - gap);
  return [...left, ...right.map(([s, l]) => [s + a + gap, l])];
}

// ------------------------------------------------------------------------------------------------ layout
function buildLayout(seed) {
  const rng = new RNG(((seed * 2654435761) >>> 0) ^ 0xC0125CA);
  const noise = new SimplexNoise(seed + 77);
  const { xs, zs } = buildLines(rng);
  const xb = [PLATEAU.x0 + RIM, ...xs, PLATEAU.x1 - RIM];   // block boundaries (rim, lines..., rim)
  const zb = [PLATEAU.z0 + RIM, ...zs, PLATEAU.z1 - RIM];
  const nbx = xb.length - 1, nbz = zb.length - 1;
  const inset = DECK_HALF + MARGIN;                           // lots start 10 blocks from a boulevard centre line

  // blocks -------------------------------------------------------------------------------------------------
  const blocks = [];
  const blockAt = new Array(nbx * nbz).fill(null);
  for (let i = 0; i < nbx; i++) for (let j = 0; j < nbz; j++) {
    const x0 = i === 0 ? xb[0] : xb[i] + inset, x1 = i === nbx - 1 ? xb[nbx] : xb[i + 1] - inset;
    const z0 = j === 0 ? zb[0] : zb[j] + inset, z1 = j === nbz - 1 ? zb[nbz] : zb[j + 1] - inset;
    const b = { id: blocks.length, i, j, x0, z0, x1, z1, w: x1 - x0, d: z1 - z0, kind: 'lots', district: districtAt((x0 + x1) >> 1, (z0 + z1) >> 1),
      sides: { W: i > 0, E: i < nbx - 1, N: j > 0, S: j < nbz - 1 } };
    if (rectsIntersect(b, SPACEPORT)) b.kind = 'spaceport';
    else if (b.w < LOT_MIN || b.d < LOT_MIN) b.kind = 'skip';
    blocks.push(b); blockAt[i * nbz + j] = b;
  }
  const blk = (i, j) => (i >= 0 && j >= 0 && i < nbx && j < nbz) ? blockAt[i * nbz + j] : null;

  // landmarks: merge a span of sx x sz blocks (anchored at block (li, lj), spreading to +x/+z) whose centre is
  // nearest the wanted spot; the boulevard lines inside the merged lot are cut ---------------------------------
  const cutsX = xs.map(() => []), cutsZ = zs.map(() => []);   // per line: list of [from, to) intervals removed
  const landmarkGroups = [];
  const lots = [];
  for (const lm of LANDMARKS) {
    const [sx, sz] = lm.span || [2, 2];
    let best = null, bestD = Infinity;
    for (let li = 1; li + sx - 1 < xs.length; li++) for (let lj = 1; lj + sz - 1 < zs.length; lj++) {
      const group = [];
      for (let i = 0; i < sx; i++) for (let j = 0; j < sz; j++) group.push(blk(li + i, lj + j));
      if (group.some((b) => !b || b.kind !== 'lots')) continue;
      // block (li, lj) spans xs[li - 1]..xs[li]; the merged lot spans xs[li - 1]..xs[li + sx - 1]
      const cx = (xs[li - 1] + xs[li + sx - 1]) / 2, cz = (zs[lj - 1] + zs[lj + sz - 1]) / 2;
      const d = Math.hypot(cx - lm.near[0], cz - lm.near[1]);
      if (d < bestD) { bestD = d; best = { li, lj, group }; }
    }
    if (!best) continue;
    const { li, lj, group } = best;
    const x0 = group[0].x0, z0 = group[0].z0, x1 = group[group.length - 1].x1, z1 = group[group.length - 1].z1;
    for (const b of group) b.kind = 'landmark';
    for (let i = 0; i < sx - 1; i++) cutsX[li + i].push([zs[lj - 1] + DECK_HALF, zs[lj + sz - 1] - DECK_HALF]);
    for (let j = 0; j < sz - 1; j++) cutsZ[lj + j].push([xs[li - 1] + DECK_HALF, xs[li + sx - 1] - DECK_HALF]);
    const lot = { id: lots.length, x0, z0, w: x1 - x0, d: z1 - z0, x1, z1, district: group[0].district, kind: 'landmark', family: lm.family, name: lm.name,
      height: lm.height, span: [sx, sz], seed: mix(seed + 5, x0, z0), block: group[0].id, sides: { W: true, E: true, N: true, S: true }, front: 'S', midDoor: lm.height >= 40, bridges: [] };
    lot.door = doorFor(lot);
    lots.push(lot);
    landmarkGroups.push({ family: lm.family, name: lm.name, lot: lot.id, x: Math.round((x0 + x1) / 2), z: Math.round((z0 + z1) / 2), w: lot.w, d: lot.d, height: lm.height });
  }

  // plazas: the block nearest each district centre (all four sides on boulevards) ------------------------------
  for (const r of DISTRICT_RECTS) {
    if (r.kind === 'spaceport') continue;
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    let best = null, bestD = Infinity;
    for (const b of blocks) {
      if (b.kind !== 'lots' || b.district !== r.kind || b.w < 24 || b.d < 24) continue;
      if (!(b.sides.W && b.sides.E && b.sides.N && b.sides.S)) continue;
      const d = Math.hypot((b.x0 + b.x1) / 2 - cx, (b.z0 + b.z1) / 2 - cz);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (!best) continue;
    best.kind = 'plaza';
    // the plaza deck reaches the boulevard decks (it swallows the margins)
    const x0 = best.x0 - MARGIN, z0 = best.z0 - MARGIN, x1 = best.x1 + MARGIN, z1 = best.z1 + MARGIN;
    lots.push({ id: lots.length, x0, z0, w: x1 - x0, d: z1 - z0, x1, z1, district: best.district, kind: 'plaza', family: 'plaza', height: 0,
      seed: mix(seed + 6, x0, z0), block: best.id, sides: best.sides, front: 'N', midDoor: false, bridges: [] });
  }

  // tower lots ------------------------------------------------------------------------------------------------
  for (const b of blocks) {
    if (b.kind !== 'lots') continue;
    const brng = new RNG(mix(seed + 7, b.x0, b.z0));
    const prof = DISTRICT_PROFILE[b.district];
    const xSegs = splitLots(brng, b.w);
    for (const [sx, lw] of xSegs) {
      const zSegs = splitLots(brng, b.d);
      for (const [sz, ld] of zSegs) {
        const x0 = b.x0 + sx, z0 = b.z0 + sz, x1 = x0 + lw, z1 = z0 + ld;
        const sides = { W: b.sides.W && x0 === b.x0, E: b.sides.E && x1 === b.x1, N: b.sides.N && z0 === b.z0, S: b.sides.S && z1 === b.z1 };
        const lot = { id: lots.length, x0, z0, w: lw, d: ld, x1, z1, district: b.district, kind: 'tower', block: b.id, sides, bridges: [] };
        lot.seed = mix(seed + 8, x0, z0);
        const lrng = new RNG(lot.seed);
        lot.family = prof.families[Math.floor(lrng.next() * prof.families.length)];
        // height: district profile + smooth noise clusters + per-lot jitter, snapped to the 5-block floor pitch
        const n = noise.fbm2((x0 + lw / 2) * 0.004, (z0 + ld / 2) * 0.004, 2) * 0.5 + 0.5;
        let t = clamp(n * 0.8 + lrng.range(-0.2, 0.25), 0, 1);
        if (b.district === 'financial' && lrng.next() < 0.08) t = 1;             // a few supertalls
        let h = Math.round((prof.hmin + t * (prof.hmax - prof.hmin)) / 5) * 5;
        if (lw <= 18 && ld <= 18) h = Math.min(h, prof.hmax - 20);                  // slender lots stay a bit lower
        lot.height = clamp(h, 20, 190);
        // the front faces a boulevard when possible (door + gangway there), otherwise an alley
        const bl = ['W', 'E', 'N', 'S'].filter((s) => sides[s]);
        const all = ['W', 'E', 'N', 'S'];
        lot.front = bl.length ? bl[Math.floor(lrng.next() * bl.length)] : all[Math.floor(lrng.next() * 4)];
        lot.midDoor = sides[lot.front] && lot.height >= 45;
        lot.door = doorFor(lot);
        lots.push(lot);
      }
    }
  }

  // boulevard segments (mid level) ----------------------------------------------------------------------------
  const boulevards = [];
  const segmentsOf = (coord, lo, hi, cuts) => {
    const segs = [];
    let cur = lo;
    const sorted = cuts.slice().sort((a, b) => a[0] - b[0]);
    for (const [a, b] of sorted) { if (a > cur) segs.push([cur, Math.min(a, hi)]); cur = Math.max(cur, b); }
    if (cur < hi) segs.push([cur, hi]);
    return segs.filter(([a, b]) => b - a >= DECK_W);
  };
  xs.forEach((X, li) => {
    const cuts = cutsX[li].slice();
    if (X - DECK_HALF < SPACEPORT.x1) cuts.push([SPACEPORT.z0, SPACEPORT.z1]);
    for (const [a, b] of segmentsOf(X, PLATEAU.z0 + RIM, PLATEAU.z1 - RIM, cuts)) {
      boulevards.push({ id: boulevards.length, level: 'mid', axis: 'z', coord: X, x0: X - DECK_HALF, z0: a, x1: X + DECK_HALF, z1: b, width: DECK_W, y: LEVELS.deck, line: li });
    }
  });
  zs.forEach((Z, lj) => {
    const cuts = cutsZ[lj].slice();
    if (Z + DECK_HALF > SPACEPORT.z0 && Z - DECK_HALF < SPACEPORT.z1) cuts.push([PLATEAU.x0, SPACEPORT.x1]);
    for (const [a, b] of segmentsOf(Z, PLATEAU.x0 + RIM, PLATEAU.x1 - RIM, cuts)) {
      boulevards.push({ id: boulevards.length, level: 'mid', axis: 'x', coord: Z, x0: a, z0: Z - DECK_HALF, x1: b, z1: Z + DECK_HALF, width: DECK_W, y: LEVELS.deck, line: lj });
    }
  });
  const midCount = boulevards.length;
  // undercity corridors run under every deck; sky lanes above them are for the ship traffic system
  for (let k = 0; k < midCount; k++) {
    const s = boulevards[k];
    boulevards.push({ ...s, id: boulevards.length, level: 'under', y: LEVELS.underWalk });
  }
  for (let k = 0; k < midCount; k++) {
    const s = boulevards[k];
    boulevards.push({ ...s, id: boulevards.length, level: 'sky', y: LEVELS.skyLane + (s.axis === 'x' ? 0 : 8), width: 8 });
  }
  const mids = boulevards.slice(0, midCount);

  // intersections + helix stairs / lift shafts in the margin corners ---------------------------------------------
  const intersections = [], stairs = [], lifts = [];
  const lotAt = (x, z) => lots.find((l) => inRect(l, x, z));
  xs.forEach((X, li) => zs.forEach((Z, lj) => {
    const alongZ = mids.some((s) => s.axis === 'z' && s.line === li && Z >= s.z0 && Z < s.z1);
    const alongX = mids.some((s) => s.axis === 'x' && s.line === lj && X >= s.x0 && X < s.x1);
    if (!alongZ || !alongX) return;
    const it = { x: X, z: Z, stair: null, lift: null };
    const corners = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
    const rot = Math.floor(hash2(X, Z, seed + 21) * 4);
    const valid = [];
    for (let k = 0; k < 4; k++) {
      const [sx, sz] = corners[(k + rot) % 4];
      const x0 = sx > 0 ? X + DECK_HALF : X - DECK_HALF - 4, z0 = sz > 0 ? Z + DECK_HALF : Z - DECK_HALF - 4;
      if (x0 < PLATEAU.x0 + RIM || x0 + 4 > PLATEAU.x1 - RIM || z0 < PLATEAU.z0 + RIM || z0 + 4 > PLATEAU.z1 - RIM) continue;
      if (rectsIntersect({ x0, z0, x1: x0 + 4, z1: z0 + 4 }, SPACEPORT)) continue;
      if (lotAt(x0 + 1, z0 + 1) || lotAt(x0 + 2, z0 + 2)) continue;   // plaza decks own their margins
      valid.push({ sx, sz, x0, z0 });
    }
    if (valid[0]) { const c = valid[0]; it.stair = { x0: c.x0, z0: c.z0, sx: c.sx, sz: c.sz, x: X, z: Z }; stairs.push(it.stair); }
    if (valid[1]) { const c = valid[1]; const x0 = c.sx > 0 ? c.x0 : c.x0 + 2, z0 = c.sz > 0 ? c.z0 : c.z0 + 2; it.lift = { x0, z0, sx: c.sx, sz: c.sz, x: X, z: Z }; lifts.push(it.lift); }
    intersections.push(it);
  }));

  // spatial index (64-block buckets) ---------------------------------------------------------------------------
  const buckets = new Map();
  const bkey = (gx, gz) => (gx + 64) * 4096 + (gz + 64);
  const bucketRange = (r) => [Math.floor(r.x0 / INDEX_CELL), Math.floor((r.x1 - 1) / INDEX_CELL), Math.floor(r.z0 / INDEX_CELL), Math.floor((r.z1 - 1) / INDEX_CELL)];
  const indexItem = (list, item) => {
    const [gx0, gx1, gz0, gz1] = bucketRange(item);
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const k = bkey(gx, gz);
      let b = buckets.get(k);
      if (!b) { b = { lots: [], bridges: [] }; buckets.set(k, b); }
      b[list].push(item);
    }
  };
  for (const l of lots) indexItem('lots', l);
  let queryMark = 1;
  const lotsIn = (x0, z0, x1, z1) => {
    const out = [], m = ++queryMark;
    const [gx0, gx1, gz0, gz1] = bucketRange({ x0, z0, x1, z1 });
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const b = buckets.get(bkey(gx, gz));
      if (!b) continue;
      for (const l of b.lots) { if (l._m === m) continue; l._m = m; if (l.x0 < x1 && l.x1 > x0 && l.z0 < z1 && l.z1 > z0) out.push(l); }
    }
    return out;
  };

  // skybridges between tall neighbours (across an alley or a boulevard corridor) --------------------------------
  const bridges = [];
  for (const a of lots) {
    if (a.kind !== 'tower') continue;
    for (const b of lotsIn(a.x0, a.z0, a.x1 + 21, a.z1 + 21)) {
      if (b.kind !== 'tower' || b.id === a.id) continue;
      const gapX = b.x0 - a.x1, gapZ = b.z0 - a.z1;
      let br = null;
      if (gapX >= 3 && gapX <= 20 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) >= 5) {
        const zc = Math.floor((Math.max(a.z0, b.z0) + Math.min(a.z1, b.z1)) / 2);
        br = { axis: 'x', x0: a.x1, x1: b.x0, z0: zc - 2, z1: zc + 3 };
      } else if (gapZ >= 3 && gapZ <= 20 && Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) >= 5) {
        const xc = Math.floor((Math.max(a.x0, b.x0) + Math.min(a.x1, b.x1)) / 2);
        br = { axis: 'z', z0: a.z1, z1: b.z0, x0: xc - 2, x1: xc + 3 };
      }
      if (!br) continue;
      const top = Math.min(a.height, b.height) + LEVELS.ground;
      const yMax = Math.min(LEVELS.skyMax, top - 12);
      if (yMax < LEVELS.skyMin) continue;
      if (a.bridges.length >= 3 || b.bridges.length >= 3) continue;
      const h = hash2(a.id, b.id, seed + 31);
      if (h > 0.55) continue;
      const steps = Math.floor((yMax - LEVELS.skyMin) / LEVELS.floorPitch) + 1;
      const y = LEVELS.skyMin + Math.floor(hash2(b.id, a.id, seed + 32) * steps) * LEVELS.floorPitch;
      const bridge = { id: bridges.length, y, ...br, a: a.id, b: b.id };
      bridges.push(bridge); a.bridges.push(bridge.id); b.bridges.push(bridge.id);
    }
  }
  for (const br of bridges) indexItem('bridges', br);
  const bridgesIn = (x0, z0, x1, z1) => {
    const out = [], m = ++queryMark;
    const [gx0, gx1, gz0, gz1] = bucketRange({ x0, z0, x1, z1 });
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const b = buckets.get(bkey(gx, gz));
      if (!b) continue;
      for (const br of b.bridges) { if (br._m === m) continue; br._m = m; if (br.x0 < x1 && br.x1 > x0 && br.z0 < z1 && br.z1 > z0) out.push(br); }
    }
    return out;
  };

  // districts + stats ----------------------------------------------------------------------------------------
  const districts = DISTRICT_RECTS.map((r, i) => {
    const p = DISTRICT_PROFILE[r.kind];
    const mine = lots.filter((l) => l.district === r.kind && inRect(r, l.x0 + (l.w >> 1), l.z0 + (l.d >> 1)));
    return { id: i, kind: r.kind, x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, heights: [p.hmin, p.hmax], families: p.families, archetypes: p.archetypes, density: p.density,
      lots: mine.length, towers: mine.filter((l) => l.kind === 'tower').length };
  });
  const towers = lots.filter((l) => l.kind === 'tower');
  const hs = towers.map((l) => l.height);
  const byDistrict = {};
  for (const l of towers) { const s = byDistrict[l.district] || (byDistrict[l.district] = { towers: 0, hmin: 999, hmax: 0, hsum: 0 }); s.towers++; s.hmin = Math.min(s.hmin, l.height); s.hmax = Math.max(s.hmax, l.height); s.hsum += l.height; }
  for (const k in byDistrict) { byDistrict[k].hmean = Math.round(byDistrict[k].hsum / byDistrict[k].towers); delete byDistrict[k].hsum; }
  const footprint = { w: PLATEAU.x1 - PLATEAU.x0, d: PLATEAU.z1 - PLATEAU.z0 };
  footprint.area = footprint.w * footprint.d;
  const townFootprint = { w: 209, d: 171, area: 209 * 171 };
  const stats = {
    seed, lots: lots.length, towers: towers.length, landmarks: lots.filter((l) => l.kind === 'landmark').length, plazas: lots.filter((l) => l.kind === 'plaza').length,
    blocks: blocks.filter((b) => b.kind === 'lots').length, districts: districts.length, boulevards: { mid: midCount, under: midCount, sky: midCount, total: boulevards.length },
    intersections: intersections.length, stairs: stairs.length, lifts: lifts.length, bridges: bridges.length, midDoors: lots.filter((l) => l.midDoor).length,
    footprint, townFootprint, footprintRatio: +(footprint.area / townFootprint.area).toFixed(1),
    heights: { min: Math.min(...hs), max: Math.max(...hs), mean: Math.round(hs.reduce((a, b) => a + b, 0) / hs.length), skylineTopY: LEVELS.ground + Math.max(...lots.map((l) => l.height)) },
    lines: { x: xs.length, z: zs.length, spacingX: spacings(xs), spacingZ: spacings(zs) }, byDistrict,
  };
  return {
    seed, plateau: PLATEAU, levels: LEVELS, spaceport: SPACEPORT, hyperlane: HYPERLANE, lines: { xs, zs },
    districts, blocks, lots, boulevards, bridges, intersections, stairs, lifts, landmarks: landmarkGroups, stats,
    lotsIn, bridgesIn, districtAt,
  };
}
function spacings(lines) { const s = []; for (let i = 1; i < lines.length; i++) s.push(lines[i] - lines[i - 1]); return { min: Math.min(...s), max: Math.max(...s) }; }

// Door cell on the lot edge (inside the lot) at the middle of the front side; `out`/`in` are the cells just
// outside / inside at the undercity walk level. The same column carries the mid-level door (y 96) when midDoor.
function doorFor(lot) {
  const mx = lot.x0 + (lot.w >> 1), mz = lot.z0 + (lot.d >> 1);
  switch (lot.front) {
    case 'W': return { side: 'W', x: lot.x0, z: mz, out: { x: lot.x0 - 1, z: mz }, in: { x: lot.x0 + 1, z: mz } };
    case 'E': return { side: 'E', x: lot.x1 - 1, z: mz, out: { x: lot.x1, z: mz }, in: { x: lot.x1 - 2, z: mz } };
    case 'N': return { side: 'N', x: mx, z: lot.z0, out: { x: mx, z: lot.z0 - 1 }, in: { x: mx, z: lot.z0 + 1 } };
    default: return { side: 'S', x: mx, z: lot.z1 - 1, out: { x: mx, z: lot.z1 }, in: { x: mx, z: lot.z1 - 2 } };
  }
}

const cache = new Map();
export function getLayout(seed = 1337) {
  let l = cache.get(seed);
  if (!l) { l = buildLayout(seed); cache.set(seed, l); }
  return l;
}

// Plain-data view for the JSON dump (drops closures, private marks and per-block bookkeeping).
export function layoutToJSON(layout, { lots = true } = {}) {
  const strip = (o) => { const r = {}; for (const k in o) if (k[0] !== '_' && typeof o[k] !== 'function') r[k] = o[k]; return r; };
  return {
    seed: layout.seed, plateau: layout.plateau, levels: layout.levels, spaceport: layout.spaceport, hyperlane: layout.hyperlane, lines: layout.lines,
    stats: layout.stats, districts: layout.districts, landmarks: layout.landmarks,
    lots: lots ? layout.lots.map(strip) : undefined,
    boulevards: layout.boulevards, bridges: layout.bridges.map(strip), intersections: layout.intersections,
  };
}
