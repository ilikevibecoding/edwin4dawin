// Generic tiered tower: stacked footprint tiers (setbacks) over one plan frame so the lift/stair core lines up on
// every level, floors on the 5-block lattice (slab at 5f, walk level 5f + 1), facade rings per floor, a
// double-height lobby with the entrance on the lot edge, an optional boulevard-level sky lobby, skybridge stubs,
// and a crown. Families describe themselves as a spec; see slab.js for the simplest one.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { PlanFrame, computeLayout, planFloor, cutEntrance, insetLimits } from '../plan.js';
import { buildCore } from '../core.js';
import { rectRing, maskRing, paintRing, paintRoof, paintCrown } from '../facade.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// spec: { ext, front, tiers: [{ inset: {l, r, f, b}, f0, f1 }], style, pools, seed, family, door: {x, z},
//         midDoorF, mask(x, z, tierIndex), hooks: { floorOpts(f, tier), poolFor(f, tier), afterTier(tier, yRoof), crown } }
export function buildTiered(bp, spec) {
  const { ext, front, style, pools, seed } = spec;
  const hooks = spec.hooks || {};
  const frame = new PlanFrame(ext, front);
  const layout = computeLayout(frame.Iu, frame.Iv);
  const lim = insetLimits(frame, layout);
  const tiers = spec.tiers.map((t, i) => {
    const ins = t.inset || {};
    const l = clamp(ins.l | 0, 0, lim.l), r = clamp(ins.r | 0, 0, lim.r), fr = clamp(ins.f | 0, 0, lim.f), b = clamp(ins.b | 0, 0, lim.b);
    let v1 = frame.Iv - 1 - b;
    // a back inset must not keep a strip whose corridor (on its +v side) it removes: snap to the strip's back wall
    for (const s of layout.strips) if (s.wallAtBack && s.kind !== 'front' && v1 >= s.roomV0 - 1 && v1 < s.roomV1 + 2) v1 = s.roomV0 - 2;
    const clip = { u0: l, u1: frame.Iu - 1 - r, v0: fr, v1 };
    const text = frame.rect(clip.u0 - 1, clip.v0 - 1, clip.u1 + 1, clip.v1 + 1);
    const inside = spec.mask ? (x, z) => x >= text.x0 && x <= text.x1 && z >= text.z0 && z <= text.z1 && spec.mask(x, z, i, text) : null;
    let interior = null;
    if (inside || spec.exclude) {
      // interior = inside cells that are not exterior wall (ring) cells and not excluded (e.g. a rotunda the
      // landmark carves afterwards), as a lookup table for the planner
      const m = new Uint8Array(bp.w * bp.d);
      const ok = inside ? (x, z) => inside(x, z) && inside(x - 1, z) && inside(x + 1, z) && inside(x, z - 1) && inside(x, z + 1) : () => true;
      for (let x = text.x0; x <= text.x1; x++) for (let z = text.z0; z <= text.z1; z++) if (ok(x, z) && !(spec.exclude && spec.exclude(x, z))) m[x * bp.d + z] = 1;
      interior = (x, z) => x >= 0 && z >= 0 && x < bp.w && z < bp.d && m[x * bp.d + z] === 1;
    }
    return { f0: t.f0, f1: t.f1, clip, ext: text, inside, interior, ring: inside ? maskRing(text, inside) : rectRing(text), index: i };
  });
  const nF = tiers[tiers.length - 1].f1 + 1;
  const doorU = spec.door ? frame.U(spec.door.x, spec.door.z) : Math.floor(frame.Iu / 2) - 1;
  const floorOpts = (f, t) => {
    const o = hooks.floorOpts ? hooks.floorOpts(f, t) : {};
    if (f <= 1 && t.index === 0) o.lobby = true;
    if (f === nF - 1 && style.signs && nF > 6) o.signs = true;
    return o;
  };

  // 1. slabs, exterior walls (rect tiers now, masked tiers after planning), roofs
  for (const t of tiers) {
    for (let f = t.f0; f <= t.f1; f++) {
      const y = 5 * f;
      if (t.inside) { for (let x = t.ext.x0; x <= t.ext.x1; x++) for (let z = t.ext.z0; z <= t.ext.z1; z++) if (t.inside(x, z)) bp.set(x, y, z, style.floor); }
      else { bp.fill(t.ext.x0, y, t.ext.z0, t.ext.x1, y, t.ext.z1, style.floor); paintRing(bp, t.ring, f, style, seed, floorOpts(f, t)); }
    }
    const yRoof = 5 * (t.f1 + 1);
    if (t.inside) {
      for (let x = t.ext.x0; x <= t.ext.x1; x++) for (let z = t.ext.z0; z <= t.ext.z1; z++) if (t.inside(x, z)) bp.set(x, yRoof, z, style.roof);
      for (const c of t.ring) bp.set(c.x, yRoof + 1, c.z, c.corner ? style.corner : style.railing);
    } else paintRoof(bp, t.ext, yRoof, style, t.index > 0 && style.railing === B.IRON_BARS);
  }

  // 2. interiors
  const used = new Map();
  for (const t of tiers) for (let f = t.f0; f <= t.f1; f++) {
    const mode = f === 0 ? 'lobby' : f === 1 ? 'gallery' : f === spec.midDoorF ? 'skylobby' : 'normal';
    const pool = hooks.poolFor ? hooks.poolFor(f, t) : (f <= 1 ? pools.ground : f >= nF - 2 ? pools.top : pools.typical);
    planFloor(bp, { frame, layout, clip: t.clip, lvl: 5 * f + 1, style, pools, pool, ctx: { isTop: f === nF - 1, floor: f, family: spec.family }, mode, used, doorU, interior: t.interior });
    if (t.inside) {
      // masked footprint: drop what the planner wrote outside the mask, then paint the ring over it
      const y0 = f === t.f0 ? 5 * f + 1 : 5 * f, y1 = 5 * f + 4;
      for (let x = t.ext.x0; x <= t.ext.x1; x++) for (let z = t.ext.z0; z <= t.ext.z1; z++) if (!t.inside(x, z)) bp.fill(x, y0, z, x, y1, z, 0);
      paintRing(bp, t.ring, f, style, seed, floorOpts(f, t));
    }
  }

  // 3. core, entrance, sky-lobby door, tier hooks, crown
  buildCore(bp, frame, layout.core, 0, nF - 1, style);
  cutEntrance(bp, frame, doorU - 2, 4, 1, 3, style.trim);
  if (spec.midDoorF >= 2 && spec.midDoorF < nF) cutEntrance(bp, frame, doorU - 1, 3, 5 * spec.midDoorF + 1, 3, style.trim);
  for (const t of tiers) if (hooks.afterTier) hooks.afterTier(t, 5 * (t.f1 + 1), frame, layout, tiers);
  const top = tiers[tiers.length - 1];
  const extra = hooks.crown === false ? 0 : paintCrown(bp, top.ext, 5 * nF, style, bp.rng, hooks.crownKind || style.crown);
  return { frame, layout, tiers, nF, doorU, extra, used, lim };
}

// Height (blocks above the ground slab) a tiered blueprint needs: floors + crown allowance.
export function towerHeight(nF, crownAllowance = 16) { return 5 * nF + crownAllowance + 2; }

// Skybridge landings (the city builder carves a 3x2 opening 1 block into the lot at bridge.y + 1..2). Where the
// tier at that height is inset from the lot edge we add a glazed stub out to the edge; behind the opening a small
// vestibule is cleared so the bridge always lands on a walkable floor.
export function bridgeStubs(bp, lot, cityLayout, res, style) {
  const bridges = cityLayout && cityLayout.bridges;
  if (!bridges || !lot.bridges || !lot.bridges.length) return;
  const ground = bp.y0;
  for (const id of lot.bridges) {
    const br = bridges[id];
    if (!br) continue;
    const y = br.y - ground;
    const f = Math.floor(y / 5);
    if (f < 0 || f >= res.nF) continue;
    const t = res.tiers.find((tt) => f >= tt.f0 && f <= tt.f1);
    if (!t) continue;
    let side, c;
    if (br.axis === 'x') { side = br.x0 === lot.x1 ? 'E' : 'W'; c = br.z0 + 2 - lot.z0; }
    else { side = br.z0 === lot.z1 ? 'S' : 'N'; c = br.x0 + 2 - lot.x0; }
    const e = t.ext;
    const along = (k) => (side === 'E' || side === 'W') ? [null, c + k] : [c + k, null];
    // extent from the tier wall (exclusive) to the lot edge (inclusive)
    let a0, a1, wallAt, dirIn;
    if (side === 'E') { a0 = e.x1 + 1; a1 = bp.w - 1; wallAt = e.x1; dirIn = -1; }
    else if (side === 'W') { a0 = 0; a1 = e.x0 - 1; wallAt = e.x0; dirIn = 1; }
    else if (side === 'S') { a0 = e.z1 + 1; a1 = bp.d - 1; wallAt = e.z1; dirIn = -1; }
    else { a0 = 0; a1 = e.z0 - 1; wallAt = e.z0; dirIn = 1; }
    const put = (a, yy, k, id) => { const [px, pz] = along(k); if (px === null) bp.set(a, yy, pz, id); else bp.set(px, yy, a, id); };
    if (a1 >= a0) {
      for (let a = a0; a <= a1; a++) for (let k = -2; k <= 2; k++) {
        put(a, y, k, B.DECK_PLATE);
        const edge = k === -2 || k === 2, end = a === (dirIn < 0 ? a1 : a0);
        put(a, y + 1, k, edge || end ? (end ? style.wall : B.STEEL_GLASS) : FORCE_AIR);
        put(a, y + 2, k, edge || end ? (end ? style.wall : B.STEEL_GLASS) : FORCE_AIR);
        put(a, y + 3, k, end ? style.wall : (k === 0 && a % 3 === 0 ? B.GLOW_PANEL : B.DURASTEEL_DARK));
      }
    }
    // opening in the tier wall + vestibule two cells deep
    for (let k = -1; k <= 1; k++) {
      put(wallAt, y + 1, k, FORCE_AIR); put(wallAt, y + 2, k, FORCE_AIR);
      for (let s = 1; s <= 2; s++) { put(wallAt + dirIn * s, y + 1, k, FORCE_AIR); put(wallAt + dirIn * s, y + 2, k, FORCE_AIR); put(wallAt + dirIn * s, y, k, B.DECK_PLATE); }
    }
    put(wallAt, y + 3, 0, B.GLOW_PANEL);
  }
}
