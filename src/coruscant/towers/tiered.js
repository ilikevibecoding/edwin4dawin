// Generic tiered tower: stacked footprint tiers (setbacks) over one plan frame so the lift/stair core lines up on
// every level, floors on the 5-block lattice (slab at 5f, walk level 5f + 1), facade rings per floor, a
// double-height lobby with the entrance on the lot edge, an optional boulevard-level sky lobby, skybridge stubs,
// and a crown. Families describe themselves as a spec; see slab.js for the simplest one.
import { B, BLOCKS } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { PlanFrame, computeLayout, planFloor, cutEntrance, insetLimits } from '../plan.js';
import { buildCore } from '../core.js';
import { rectRing, paintRing, paintRoof, paintCrown } from '../facade.js';
import { hash2 } from '../../rng.js';
import { planCrown, buildCrown, crownEat, tableLookup, ringFromTable, slab, CROWN_OPTIONS, CROWN_MIN_HEIGHT } from '../crowns.js';
import { stripPlan, stripRing, contrastStrips } from './strips.js';
import { paintLandingDeck } from './decks.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const OUT = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const DECK_POOL = ['hangar', 'garage', 'lounge'];

// spec: { ext, front, tiers: [{ inset: {l, r, f, b}, f0, f1, shape?, disc?, stalk? }], style, pools, seed, family,
//         door: {x, z}, midDoorF, mask(x, z, tierIndex), crownStyle?, strips?: false,
//         env? (towers/envelope.js plan: ledge cadence, landing decks, fins, buttresses, disc undersides),
//         hooks: { floorOpts(f, tier), poolFor(f, tier), afterTier(tier, yRoof), crown, crownKind } }
// Towers of 60 blocks or more (bp.lot.kind === 'tower') end in a crown from crowns.js: the stair/lift core is
// extended through the crown tiers so they are climbable, and their facades get lit vertical strips. Landmarks and
// low towers keep the legacy paintCrown ornaments.
export function buildTiered(bp, spec) {
  const { ext, front, style, pools, seed } = spec;
  const hooks = spec.hooks || {};
  const env = spec.env || null;
  const frame = new PlanFrame(ext, front);
  const layout = computeLayout(frame.Iu, frame.Iv);
  const lim = insetLimits(frame, layout);
  const lot = bp.lot, roomsAt = bp.meta.rooms.length;
  const strips = spec.strips === false ? null : contrastStrips(stripPlan(lot, spec.family), style.wall);
  if (strips) {
    // the strips carry the night look: few lit bands / slits besides them; the 'strip' rhythm's fins follow them
    style.lit = Math.min(style.lit, style.rhythm === 'ribbon' || style.rhythm === 'curtain' ? 0.22 : 0.12);
    if (style.light === 'warm' && strips.block === B.GLOW_PANEL) strips.block = B.LIGHT_STRIP_WARM;
    style.stripPitch = strips.pitch; style.stripPhase = strips.phase; style.stripBlock = strips.block; style.stripsByPlan = true;
  }
  if (env && env.ledgeEvery) style.ledgeEvery = env.ledgeEvery;
  const deckFloors = env && env.deckFace ? env.deckFloors : [];
  // the tallest towers hand their top floors to the crown (crownEat): the family's tiers stop `eat` floors lower
  // and the crown tiers, furnished from the same room library, take their place under a full-size cap
  const crowned = hooks.crown !== false && CROWN_OPTIONS.enabled && lot && lot.kind === 'tower' && (lot.height ?? 0) >= CROWN_MIN_HEIGHT && spec.family !== 'spine';
  const nF0 = spec.tiers[spec.tiers.length - 1].f1 + 1;
  const eat = crowned ? crownEat(nF0, bp.h) : 0;
  const specTiers = eat ? spec.tiers.filter((t) => t.f0 <= nF0 - 1 - eat).map((t) => ({ ...t, f1: Math.min(t.f1, nF0 - 1 - eat) })) : spec.tiers;
  const tiers = specTiers.map((t, i) => {
    const ins = t.inset || {};
    const l = clamp(ins.l | 0, 0, lim.l), r = clamp(ins.r | 0, 0, lim.r), fr = clamp(ins.f | 0, 0, lim.f), b = clamp(ins.b | 0, 0, lim.b);
    let v1 = frame.Iv - 1 - b;
    // a back inset must not keep a strip whose corridor (on its +v side) it removes: snap to the strip's back wall
    for (const s of layout.strips) if (s.wallAtBack && s.kind !== 'front' && v1 >= s.roomV0 - 1 && v1 < s.roomV1 + 2) v1 = s.roomV0 - 2;
    const clip = { u0: l, u1: frame.Iu - 1 - r, v0: fr, v1 };
    const text = frame.rect(clip.u0 - 1, clip.v0 - 1, clip.u1 + 1, clip.v1 + 1);
    // the footprint mask is evaluated once per cell into a table: rings, the planner and every floor's repaint
    // query it thousands of times, and a family's mask may be as costly as a superellipse power
    let inside = null, cellsIn = null, cellsOut = null, tbl = null;
    const td = text.z1 - text.z0 + 1;
    if (spec.mask) {
      tbl = new Uint8Array((text.x1 - text.x0 + 1) * td);
      const cin = [], cout = [];
      for (let x = text.x0, k = 0; x <= text.x1; x++) for (let z = text.z0; z <= text.z1; z++, k++) {
        const base = (x * bp.d + z) * bp.h;      // column base in the block array
        if (spec.mask(x, z, i, text)) { tbl[k] = 1; cin.push(base); } else cout.push(base);
      }
      // a rect-shaped mask is no mask at all
      if (cout.length) { inside = tableLookup(text, tbl); cellsIn = cin; cellsOut = cout; } else tbl = null;
    }
    let interior = null;
    if (tbl || spec.exclude) {
      // interior = inside cells that are not exterior wall (ring) cells (all four neighbours inside) and not
      // excluded (e.g. a rotunda the landmark carves afterwards), as a lookup table for the planner
      const m = new Uint8Array(bp.w * bp.d), ex = spec.exclude || null;
      for (let x = text.x0, k = 0; x <= text.x1; x++) for (let z = text.z0; z <= text.z1; z++, k++) {
        if (tbl && (x === text.x0 || x === text.x1 || z === text.z0 || z === text.z1 || tbl[k] !== 1 || tbl[k - 1] !== 1 || tbl[k + 1] !== 1 || tbl[k - td] !== 1 || tbl[k + td] !== 1)) continue;
        if (ex && ex(x, z)) continue;
        m[x * bp.d + z] = 1;
      }
      interior = (x, z) => x >= 0 && z >= 0 && x < bp.w && z < bp.d && m[x * bp.d + z] === 1;
    }
    return { f0: t.f0, f1: t.f1, clip, ext: text, inside, cellsIn, cellsOut, interior, ring: tbl ? ringFromTable(text, tbl) : rectRing(text), index: i, shape: tbl ? (t.shape || 'mask') : 'rect', disc: !!t.disc, stalk: !!t.stalk, inset: { l, r, f: fr, b } };
  });
  const blocks = bp.blocks;
  const nF = tiers[tiers.length - 1].f1 + 1;
  const doorU = spec.door ? frame.U(spec.door.x, spec.door.z) : Math.floor(frame.Iu / 2) - 1;
  const floorOpts = (f, t) => {
    const o = hooks.floorOpts ? hooks.floorOpts(f, t) : {};
    if (f <= 1 && t.index === 0) o.lobby = true;
    if (f === nF - 1 && style.signs && nF > 6) o.signs = true;
    if (t.disc && f === t.f0) o.ledge = true;          // the rim of a disc is a light line (rule 3 / 9)
    return o;
  };

  // 1. slabs, exterior walls (rect tiers now, masked tiers after planning), roofs. Every tier roof ends in a lit rim
  // (the ring cells of the roof slab) under a corner-block parapet or the terrace railing: every shell change is a
  // light line around the tower (rubric 18 rule 9).
  for (const t of tiers) {
    for (let f = t.f0; f <= t.f1; f++) {
      const y = 5 * f;
      if (t.inside) { const fl = style.floor; for (const base of t.cellsIn) blocks[base + y] = fl; }
      else { slab(bp, t.ext.x0, t.ext.z0, t.ext.x1, t.ext.z1, y, style.floor); paintRing(bp, t.ring, f, style, seed, floorOpts(f, t)); }
    }
    const yRoof = 5 * (t.f1 + 1);
    const terrace = t.index > 0 && style.railing === B.IRON_BARS;
    if (t.inside) {
      if (yRoof < bp.h) { const rf = style.roof, rim = style.ledge || style.band; for (const base of t.cellsIn) blocks[base + yRoof] = rf; for (const c of t.ring) blocks[(c.x * bp.d + c.z) * bp.h + yRoof] = rim; }
      for (const c of t.ring) bp.set(c.x, yRoof + 1, c.z, c.corner ? style.corner : (terrace ? style.railing : style.corner));
    } else paintRoof(bp, t.ext, yRoof, style, terrace);
  }

  // 2. interiors
  const used = new Map();
  for (const t of tiers) for (let f = t.f0; f <= t.f1; f++) {
    const mode = f === 0 ? 'lobby' : f === 1 ? 'gallery' : f === spec.midDoorF ? 'skylobby' : 'normal';
    const pool = hooks.poolFor ? hooks.poolFor(f, t) : (deckFloors.includes(f) ? DECK_POOL : f <= 1 ? pools.ground : f >= nF - 2 ? pools.top : pools.typical);
    planFloor(bp, { frame, layout, clip: t.clip, lvl: 5 * f + 1, style, pools, pool, ctx: { isTop: f === nF - 1, floor: f, family: spec.family }, mode, used, doorU, interior: t.interior });
    if (t.inside) {
      // masked footprint: drop what the planner wrote outside the mask, then paint the ring over it
      const y0 = f === t.f0 ? 5 * f + 1 : 5 * f, y1 = Math.min(bp.h - 1, 5 * f + 4);
      for (const base of t.cellsOut) for (let k = base + y0, kEnd = base + y1; k <= kEnd; k++) blocks[k] = 0;
      paintRing(bp, t.ring, f, style, seed, floorOpts(f, t));
    }
  }

  // 2b. lit vertical strips on the facade rings above the podium
  if (strips) {
    for (const t of tiers) stripRing(bp, t.ring, Math.max(t.f0, strips.f0), t.f1, strips);
    bp.meta.strips = { pitch: strips.pitch, phase: strips.phase, block: strips.block, faces: strips.faces ? [...strips.faces] : null, fromFloor: strips.f0 };
  }

  // 2c. the envelope dressing: fins past the roof lines, stair-stepped buttresses, protruding lit ledges, glowing
  // disc undersides and the cantilevered landing decks (docs/rubrics/18_architecture_v2.md rules 5, 9, 13)
  const arch = dressEnvelope(bp, spec, tiers, env, style, strips, deckFloors);

  // 3. crown plan (decides how many extra core floors), core, entrance, sky-lobby door, tier hooks, crown
  const top = tiers[tiers.length - 1];
  const crown = hooks.crown === false ? null : planCrown(bp, { frame, layout, top, nF, eat, family: spec.family, lot, forceStyle: spec.crownStyle });
  buildCore(bp, frame, layout.core, 0, nF - 1 + (crown ? crown.K : 0), style);
  cutEntrance(bp, frame, doorU - 2, 4, 1, 3, style.trim);
  if (spec.midDoorF >= 2 && spec.midDoorF < nF) cutEntrance(bp, frame, doorU - 1, 3, 5 * spec.midDoorF + 1, 3, style.trim);
  for (const t of tiers) if (hooks.afterTier) hooks.afterTier(t, 5 * (t.f1 + 1), frame, layout, tiers);
  let extra = 0;
  if (crown) extra = buildCrown(bp, crown, { style, seed, strips, stripRing });
  else if (hooks.crown !== false) extra = paintCrown(bp, top.ext, 5 * nF, style, bp.rng, hooks.crownKind || style.crown);
  relightRooms(bp, tiers, nF, !!crown, roomsAt);
  // the architecture record the harness audits (rubric 18 rows 2-5): one per blueprint; twin / spine towers keep the
  // first shaft's record and count the second shaft's tiers in
  const rec = { envelope: env ? env.kind : 'rect', palette: style.palette || null, rhythm: style.rhythm, ledgeEvery: style.ledgeEvery, decks: arch.decks, deckFace: env ? env.deckFace : null, fins: arch.fins, buttresses: arch.buttresses, tiers: tiers.map((t) => ({ f0: t.f0, f1: t.f1, shape: t.shape, masked: !!t.inside, disc: t.disc, ext: { ...t.ext } })) };
  if (bp.meta.arch) { bp.meta.arch.tiers.push(...rec.tiers); bp.meta.arch.decks += rec.decks; bp.meta.arch.fins += rec.fins; bp.meta.arch.buttresses += rec.buttresses; }
  else bp.meta.arch = rec;
  return { frame, layout, tiers, nF, doorU, extra, used, lim, crown: crown ? { style: crown.style, tiers: crown.K, height: extra } : null, strips: !!strips, arch: rec };
}

// Fins, buttresses, ledge lips, disc under-rims and landing decks around the tiers of one shaft. Everything is
// written outside the exterior walls (inside spec.ext) into air only, so the rooms, the rings and the strips stay
// as planned; the decks (paintLandingDeck) are the exception: they carve their hangar door into the wall.
// -> { fins, buttresses, decks } counts
function dressEnvelope(bp, spec, tiers, env, style, strips, deckFloors) {
  const out = { fins: 0, buttresses: 0, decks: 0 };
  const ext = spec.ext;
  const ledge = style.ledge || style.band;
  const inExt = (x, z) => x >= ext.x0 && x <= ext.x1 && z >= ext.z0 && z <= ext.z1;
  const outsideOf = (t) => (t.inside ? (x, z) => !t.inside(x, z) : (x, z) => x < t.ext.x0 || x > t.ext.x1 || z < t.ext.z0 || z > t.ext.z1);
  // 1. ledge lips: the lit band row of a ledge floor steps one block out of the wall (rule 9: ledges read at 200 blocks)
  for (const t of tiers) {
    const outside = outsideOf(t);
    for (let f = t.f0 + 1; f <= t.f1; f++) {
      if (!(f > 1 && f % style.ledgeEvery === 0)) continue;
      const y = 5 * f;
      for (const c of t.ring) for (const [ox, oz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const x = c.x + ox, z = c.z + oz;
        if (inExt(x, z) && outside(x, z) && bp.isAir(x, y, z)) bp.set(x, y, z, ledge);
      }
    }
    // 2. disc undersides: a lit rim hangs under the overhanging edge of a disc (rule 3: the undersides glow)
    if (t.disc && t.index > 0) {
      const y = 5 * t.f0 - 1;
      for (const c of t.ring) if (bp.isAir(c.x, y, c.z)) bp.set(c.x, y, c.z, ledge);
    }
  }
  if (!env) return out;
  // 3. fins: projecting fin columns between the light strips on the inset shells, running 2 blocks past the roof
  // line (rule 5); one module pitch per tower (rule 7)
  if (env.fins) {
    const pitch = Math.max(3, (strips ? strips.pitch : style.period) | 0), phase = strips ? strips.phase : 0;
    const half = Math.floor(pitch / 2);
    for (const t of tiers) {
      if (t.index === 0) continue;
      const y0 = 5 * t.f0 + 1, y1 = Math.min(bp.h - 1, 5 * (t.f1 + 1) + 2);
      for (const c of t.ring) {
        if (c.corner || c.face === 'D' || (((c.along + phase) % pitch) + pitch) % pitch !== half) continue;
        if (env.deckFace && c.face === env.deckFace) continue;          // the deck side stays clear for the decks
        const [ox, oz] = OUT[c.face], x = c.x + ox, z = c.z + oz;
        if (!inExt(x, z) || !bp.isAir(x, y0, z) || !bp.isAir(x, y0 + 4, z)) continue;
        for (let y = y0; y <= y1; y++) if (bp.isAir(x, y, z)) bp.set(x, y, z, y === y1 ? (style.stripBlock || B.GLOW_PANEL_BLUE) : style.corner);
        out.fins++;
      }
    }
  }
  // 4. stair-stepped buttresses at the ends of the flat faces of the first shell, standing on the podium terrace:
  // the column against the wall is three floors high, the next two, the last one (rule 5)
  if (env.buttress && tiers.length > 1) {
    const t = tiers[1];
    const yBase = 5 * t.f0;                     // the podium roof slab the buttress stands on
    const runs = new Map();
    for (const c of t.ring) { if (c.corner || c.face === 'D' || c.face === env.deckFace) continue; const r = runs.get(c.face); if (!r) runs.set(c.face, { lo: c, hi: c }); else { if (c.along < r.lo.along) r.lo = c; if (c.along > r.hi.along) r.hi = c; } }
    for (const [face, r] of runs) {
      const [ox, oz] = OUT[face];
      const room = face === 'N' ? t.ext.z0 - ext.z0 : face === 'S' ? ext.z1 - t.ext.z1 : face === 'W' ? t.ext.x0 - ext.x0 : ext.x1 - t.ext.x1;
      const K = Math.min(3, room);
      if (K < 2 || r.hi.along - r.lo.along < 6) continue;
      for (const c of [r.lo, r.hi]) {
        let placed = false;
        for (let k = 1; k <= K; k++) {
          const x = c.x + ox * k, z = c.z + oz * k, yTop = yBase + 5 * (K - k + 1);
          if (!inExt(x, z) || !bp.isAir(x, yBase + 1, z) || bp.isAir(x, yBase, z)) break;
          for (let y = yBase + 1; y <= yTop && y < bp.h; y++) if (bp.isAir(x, y, z)) bp.set(x, y, z, y === yTop ? style.corner : style.wall);
          placed = true;
        }
        if (placed) out.buttresses++;
      }
    }
  }
  // 5. cantilevered landing decks off the deck face, from the shell wall out to the lot edge (rule 13)
  if (env.deckFace && deckFloors.length) {
    const face = env.deckFace, [ox, oz] = OUT[face];
    deckFloors.forEach((f, i) => {
      const t = tiers.find((tt) => f >= tt.f0 && f <= tt.f1);
      if (!t || t.index === 0) return;
      // the flat run of the face at this tier, trimmed to ~60% of its length (>= 9 cells) around its centre
      let lo = Infinity, hi = -Infinity;
      for (const c of t.ring) if (c.face === face && !c.corner) { if (c.along < lo) lo = c.along; if (c.along > hi) hi = c.along; }
      if (hi - lo + 1 < 5) return;
      const want = Math.min(hi - lo + 1, Math.max(9, Math.round((hi - lo + 1) * 0.6)));
      const a0 = lo + Math.floor((hi - lo + 1 - want) / 2), a1 = a0 + want - 1;
      const e = t.ext;
      let rect;
      if (face === 'S') rect = { x0: e.x0 + a0, x1: e.x0 + a1, z0: e.z1 + 1, z1: ext.z1 };
      else if (face === 'N') rect = { x0: e.x0 + a0, x1: e.x0 + a1, z0: ext.z0, z1: e.z0 - 1 };
      else if (face === 'E') rect = { z0: e.z0 + a0, z1: e.z0 + a1, x0: e.x1 + 1, x1: ext.x1 };
      else rect = { z0: e.z0 + a0, z1: e.z0 + a1, x0: ext.x0, x1: e.x0 - 1 };
      const depth = ox ? rect.x1 - rect.x0 + 1 : rect.z1 - rect.z0 + 1;
      if (depth < 4) return;
      if (paintLandingDeck(bp, rect, 5 * f, OPPOSITE[face], style, { speeder: i % 2 === 0, door: true })) out.decks++;
    });
  }
  out.decks = out.decks | 0;
  return out;
}

// Rooms that can have lost their light after the planner furnished them: under a setback or a crown tier the upper
// wall's band row is the ceiling slab of the floor below (a small room's single ceiling panel goes with it), and in
// a rounded corner the template's light cell may have fallen on the wall ring. Those rooms (recorded since `from`)
// are rescanned and, when no block in or over them emits, get a panel hung under the ceiling over an interior cell.
function relightRooms(bp, tiers, nF, crowned, from) {
  const rooms = bp.meta.rooms, lot = bp.lot;
  for (let i = from; i < rooms.length; i++) {
    const r = rooms[i], lvl = r.y - bp.y0, f = (lvl - 1) / 5;
    if (r.kind === 'stairwell' || (lvl - 1) % 5 !== 0 || f < 0 || f >= nF) continue;
    const t = tiers.find((tt) => f >= tt.f0 && f <= tt.f1);
    if (!t) continue;
    const x0 = r.x - lot.x0, z0 = r.z - lot.z0, x1 = x0 + r.w - 1, z1 = z0 + r.d - 1;
    let cx = x0 + (r.w >> 1), cz = z0 + (r.d >> 1), cut = false;
    if (t.interior) {
      cx = -1;
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { if (t.interior(x, z)) { if (cx < 0) { cx = x; cz = z; } } else cut = true; }
      if (cx < 0) continue;
    }
    if (!cut && !(f === t.f1 && (t.index < tiers.length - 1 || crowned))) continue;
    const yTop = Math.min(bp.h - 1, lvl + 4);
    let lit = false;
    for (let x = x0; x <= x1 && !lit; x++) for (let z = z0; z <= z1 && !lit; z++) for (let y = lvl - 1; y <= yTop; y++) { const v = bp.get(x, y, z); if (v !== 0 && v !== FORCE_AIR && BLOCKS[v] && BLOCKS[v].emit > 0) { lit = true; break; } }
    if (!lit) bp.set(cx, Math.min(bp.h - 1, lvl + 3), cz, B.GLOW_PANEL);
  }
}

// Height (blocks above the ground slab) a tiered blueprint needs: floors + crown allowance.
export function towerHeight(nF, crownAllowance = 16) { return 5 * nF + crownAllowance + 2; }

// Skybridge landings (the city builder carves a 3x2 opening 1 block into the lot at bridge.y + 1..2). Where the
// tier at that height is inset from the lot edge we add a glazed stub out to the edge; behind the opening a small
// vestibule is cleared so the bridge always lands on a walkable floor.
// Where the stub runs outside the tower it gets a lit underside (blue light strip under the deck plate), and 40% of
// the stubs (by bridge id) are full glass tubes with a lit spine instead of a dark-roofed gallery.
export function bridgeStubs(bp, lot, cityLayout, res, style) {
  const bridges = cityLayout && cityLayout.bridges;
  if (!bridges || !lot.bridges || !lot.bridges.length) return;
  const ground = bp.y0;
  // twin-shaft lots: use the tiers of the shaft the bridge lands on
  const shafts = res.twinB ? [res, res.twinB] : [res];
  for (const id of lot.bridges) {
    const br = bridges[id];
    if (!br) continue;
    const y = br.y - ground;
    const f = Math.floor(y / 5);
    if (f < 0 || f >= res.nF) continue;
    let side, c;
    if (br.axis === 'x') { side = br.x0 === lot.x1 ? 'E' : 'W'; c = br.z0 + 2 - lot.z0; }
    else { side = br.z0 === lot.z1 ? 'S' : 'N'; c = br.x0 + 2 - lot.x0; }
    // the shaft whose wall is nearest the bridge side
    const dist = (sh) => { const e0 = sh.tiers[0].ext; return side === 'E' ? bp.w - 1 - e0.x1 : side === 'W' ? e0.x0 : side === 'S' ? bp.d - 1 - e0.z1 : e0.z0; };
    const shaft = shafts.slice().sort((p, q) => dist(p) - dist(q))[0];
    const t = shaft.tiers.find((tt) => f >= tt.f0 && f <= tt.f1);
    if (!t) continue;
    const e = t.ext;
    const along = (k) => (side === 'E' || side === 'W') ? [null, c + k] : [c + k, null];
    // extent from the tier wall (exclusive) to the lot edge (inclusive)
    let a0, a1, wallAt, dirIn;
    if (side === 'E') { a0 = e.x1 + 1; a1 = bp.w - 1; wallAt = e.x1; dirIn = -1; }
    else if (side === 'W') { a0 = 0; a1 = e.x0 - 1; wallAt = e.x0; dirIn = 1; }
    else if (side === 'S') { a0 = e.z1 + 1; a1 = bp.d - 1; wallAt = e.z1; dirIn = -1; }
    else { a0 = 0; a1 = e.z0 - 1; wallAt = e.z0; dirIn = 1; }
    const put = (a, yy, k, id) => { const [px, pz] = along(k); if (px === null) bp.set(a, yy, pz, id); else bp.set(px, yy, a, id); };
    const airAt = (a, yy, k) => { const [px, pz] = along(k); return px === null ? bp.isAir(a, yy, pz) : bp.isAir(px, yy, a); };
    // the opening and vestibule never cut into the lift / stair core: a bridge that lands beside it stops at the wall
    const core = shaft.layout && shaft.layout.core, ce = core && shaft.frame ? shaft.frame.rect(core.u0, core.v0, core.u1, core.v1) : null;
    const inCore = (a, k) => { if (!ce) return false; const [px, pz] = along(k); const x = px === null ? a : px, z = px === null ? pz : a; return x >= ce.x0 && x <= ce.x1 && z >= ce.z0 && z <= ce.z1; };
    const putIn = (a, yy, k, id) => { if (!inCore(a, k)) put(a, yy, k, id); };
    const tube = hash2(br.id, lot.id, 0x7b) < 0.4;
    (bp.meta.bridgeStubs || (bp.meta.bridgeStubs = [])).push({ bridge: br.id, side, y: bp.wy(y), stub: a1 >= a0, tube, lit: a1 >= a0 });
    if (a1 >= a0) {
      for (let a = a0; a <= a1; a++) for (let k = -2; k <= 2; k++) {
        put(a, y, k, B.DECK_PLATE);
        const edge = k === -2 || k === 2, end = a === (dirIn < 0 ? a1 : a0);
        put(a, y + 1, k, edge || end ? (end ? style.wall : B.STEEL_GLASS) : FORCE_AIR);
        put(a, y + 2, k, edge || end ? (end ? style.wall : B.STEEL_GLASS) : FORCE_AIR);
        if (tube) put(a, y + 3, k, end ? style.wall : (k === 0 && a % 3 === 0 ? B.GLOW_PANEL : (edge ? B.CHROME : B.STEEL_GLASS)));
        else put(a, y + 3, k, end ? style.wall : (k === 0 && a % 3 === 0 ? B.GLOW_PANEL : B.DURASTEEL_DARK));
        // lit underside: blue strip under the deck plate along both edges, dark plate between
        if (airAt(a, y - 1, k)) put(a, y - 1, k, (edge && a % 2 === 0) ? B.GLOW_PANEL_BLUE : B.DURASTEEL_DARK);
      }
    }
    // opening in the tier wall + vestibule two cells deep
    for (let k = -1; k <= 1; k++) {
      putIn(wallAt, y + 1, k, FORCE_AIR); putIn(wallAt, y + 2, k, FORCE_AIR);
      for (let s = 1; s <= 2; s++) { putIn(wallAt + dirIn * s, y + 1, k, FORCE_AIR); putIn(wallAt + dirIn * s, y + 2, k, FORCE_AIR); putIn(wallAt + dirIn * s, y, k, B.DECK_PLATE); }
    }
    put(wallAt, y + 3, 0, B.GLOW_PANEL);
    put(wallAt, y + 3, -1, B.GLOW_PANEL_BLUE); put(wallAt, y + 3, 1, B.GLOW_PANEL_BLUE);
  }
}
