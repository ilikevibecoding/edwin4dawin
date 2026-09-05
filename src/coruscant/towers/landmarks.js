// Civic landmarks. Each one is a planned building (lobby, rooms, core) with a signature volume carved or built on
// top of it: the Senate's rotunda and dome, the Temple's ziggurat and five spires, the Opera's shell, stage and
// amphitheatre plaza. Plaza / spaceport / station fallbacks share the hall builder.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { buildTiered } from './tiered.js';
import { hall } from './hall.js';
import { PlanFrame, computeLayout } from '../plan.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------------- senate
export function senate(bp, lot, ctx) {
  const { rng, spec } = ctx;
  const w = bp.w, d = bp.d;
  const nF = Math.max(4, Math.min(8, ctx.nF));
  const cx = w / 2, cz = d / 2;
  const style = spec.style;
  style.wall = B.SMOOTH_STONE; style.corner = B.CHROME; style.band = B.DURASTEEL; style.rhythm = 'slit'; style.roof = B.DURASTEEL;
  const R = Math.min(w, d) / 2 - 5;          // dome radius
  const dist = (x, z) => Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
  // rotunda radius: ~45% of the dome, but never reaching the lift/stair core the planner will place
  const pf = new PlanFrame(spec.ext, spec.front), pl = computeLayout(pf.Iu, pf.Iv);
  const coreRect = pf.rect(pl.core.u0, pl.core.v0, pl.core.u1, pl.core.v1);
  const coreDist = Math.hypot(Math.max(0, coreRect.x0 - cx, cx - coreRect.x1 - 1), Math.max(0, coreRect.z0 - cz, cz - coreRect.z1 - 1));
  const Rr = Math.max(6, Math.min(Math.round(R * 0.45), Math.floor(coreDist) - 2));
  // the planner keeps rooms out of the rotunda; corridors still run into it and get doors through the ring wall
  const res = buildTiered(bp, { ...spec, tiers: [{ f0: 0, f1: nF - 1 }], family: 'senate', midDoorF: ctx.midDoorF < nF ? ctx.midDoorF : -1, exclude: (x, z) => dist(x, z) <= Rr + 1, hooks: { crown: false } });
  const yRoof = 5 * nF;
  const { frame, layout } = res;
  const corridorAt = (x, z) => {
    const u = frame.U(x, z), v = frame.V(x, z);
    if (u >= layout.connector.u0 && u <= layout.connector.u1 && v >= layout.s0) return true;
    for (const sp of layout.spines) if (v >= sp.v0 && v <= sp.v1) return true;
    return false;
  };
  const doorAt = (x, z) => corridorAt(x, z) || (Math.abs(x + 0.5 - cx) <= 1.5 && Math.abs(z + 0.5 - cz) >= Rr - 1) || (Math.abs(z + 0.5 - cz) <= 1.5 && Math.abs(x + 0.5 - cx) >= Rr - 1);

  // rotunda: a void through every podium floor ringed by galleries (railing on the inner edge) behind a two-cell
  // ring wall with four doors per level; the ground floor is the open rotunda floor
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    const r = dist(x, z);
    if (r > Rr + 1) continue;
    if (r <= Rr - 3.5) { bp.fill(x, 1, z, x, yRoof, z, FORCE_AIR); continue; }
    if (r <= Rr - 1) {
      bp.fill(x, 1, z, x, 4, z, FORCE_AIR);
      for (let f = 1; f < nF; f++) {
        bp.set(x, 5 * f, z, (x + z) % 5 === 0 ? B.GLOW_PANEL : B.DURASTEEL);
        bp.fill(x, 5 * f + 1, z, x, 5 * f + 4, z, FORCE_AIR);
        if (r <= Rr - 2.5) bp.set(x, 5 * f + 1, z, B.IRON_BARS);
      }
      bp.set(x, yRoof, z, B.DURASTEEL); if (r <= Rr - 2.5) bp.set(x, yRoof + 1, z, B.IRON_BARS);
      if (r > Rr - 2.5 && (x + z) % 7 === 0) for (let f = 1; f < nF; f++) bp.set(x, 5 * f + 1, z, B.STONE_BRICK_SLAB), bp.spot(x, 5 * f + 1, z, 'seat');
      continue;
    }
    for (let f = 0; f < nF; f++) {
      const y = 5 * f;
      if (f > 0) bp.set(x, y, z, B.DURASTEEL);
      if (doorAt(x, z)) { bp.fill(x, y + 1, z, x, y + 3, z, FORCE_AIR); bp.set(x, y + 4, z, B.GLOW_PANEL); continue; }
      bp.fill(x, y + 1, z, x, y + 4, z, f === 0 ? B.SMOOTH_STONE : B.CHROME);
      if (f > 0 && r > Rr && (x + z) % 3 === 0) bp.set(x, y + 3, z, B.GLOW_PANEL);
    }
    bp.fill(x, yRoof, z, x, yRoof + 1, z, B.DURASTEEL);
  }
  // rotunda floor: dais + tiered rings of seats facing it
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    const r = dist(x, z);
    if (r > Rr - 1) continue;
    bp.set(x, 0, z, r <= 3 ? B.CHROME : (Math.floor(r) % 4 === 0 ? B.GLOW_PANEL : B.PANEL_BLACK));
    if (r <= 2.5) { bp.set(x, 1, z, B.SMOOTH_STONE); if (r < 0.8) { bp.set(x, 2, z, B.CHROME); bp.set(x, 3, z, B.GOLD_BLOCK); } continue; }
    const ring = Math.floor((r - 4) / 3);
    if (r >= 4 && r <= Rr - 4 && ring >= 0 && ring < 5 && Math.floor(r - 4) % 3 === 0) { // flat floor near the ring wall doors
      const ang = Math.atan2(z + 0.5 - cz, x + 0.5 - cx);
      if (Math.abs(Math.sin(ang * 2)) < 0.12) continue;      // radial aisles
      for (let k = 0; k < ring; k++) bp.set(x, 1 + k, z, B.PANEL_BLACK);
      bp.set(x, 1 + ring, z, B.STONE_BRICK_SLAB);
      if ((x + z) % 2 === 0) bp.spot(x, 1 + ring, z, 'seat');
    }
  }
  bp.work(Math.floor(cx), 1, Math.floor(cz) + 3, 'speaker'); bp.work(Math.floor(cx) - 3, 1, Math.floor(cz), 'speaker');
  // colonnade around the drum + the shallow dome shell above the roof, lit meridians, a spire
  const H = Math.max(10, Math.round(R * 0.5));
  const Ri = R - 2, Hi = H - 2;
  const lastCol = new Map();
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    const r = dist(x, z);
    if (r > R + 4) continue;
    if (r > R + 1) { // colonnade ring on the roof, pillars every ~6 blocks
      const ang = Math.atan2(z + 0.5 - cz, x + 0.5 - cx);
      const k = Math.round(((ang + Math.PI) / TAU) * Math.round(TAU * (R + 3) / 6));
      if (r >= R + 2.5 && r <= R + 3.5 && !lastCol.has(k) && Math.abs(r - (R + 3)) < 0.55) { lastCol.set(k, 1); bp.fill(x, yRoof + 1, z, x, yRoof + 9, z, B.CHROME); bp.set(x, yRoof + 10, z, B.GLOW_PANEL); }
      if (r >= R + 1.5 && r <= R + 4) bp.set(x, yRoof + 11, z, B.DURASTEEL);
      continue;
    }
    const yo = Math.round(H * Math.sqrt(Math.max(0, 1 - (r / R) ** 2)));
    const yi = r < Ri ? Math.round(Hi * Math.sqrt(Math.max(0, 1 - (r / Ri) ** 2))) : -1;
    const ang = Math.atan2(z + 0.5 - cz, x + 0.5 - cx);
    const meridian = Math.abs(((ang / TAU) * 16 + 0.5) % 1 - 0.5) < 0.04;
    const mat = meridian ? B.CHROME : (yo % 6 === 0 ? B.PANEL_STRIPE : B.DURASTEEL);
    bp.fill(x, yRoof + Math.max(1, yi + 1), z, x, yRoof + Math.max(1, yo), z, mat);
    if (yi >= 1 && Math.floor(r) % 5 === 0 && (x + z) % 3 === 0) bp.set(x, yRoof + yi, z, B.GLOW_PANEL);   // inner ceiling lights
    if (r > Rr + 1 && yi >= 1 && bp.get(x, yRoof, z) !== B.GLOW_PANEL) bp.set(x, yRoof, z, B.DURASTEEL);          // the dome floor annulus (keeps the top-floor ceiling lights)
  }
  const sx = Math.floor(cx), sz = Math.floor(cz);
  bp.fill(sx, yRoof + H + 1, sz, sx, yRoof + H + 8, sz, B.CHROME); bp.set(sx, yRoof + H + 9, sz, B.GLOW_PANEL);
  bp.fill(sx - 1, yRoof + H + 1, sz - 1, sx + 1, yRoof + H + 2, sz + 1, B.DURASTEEL_DARK);
  // upper terrace railing inside the dome at the rotunda edge
  return { ...res, extra: H + 10 };
}

// ---------------------------------------------------------------------------------------------------- temple
export function temple(bp, lot, ctx) {
  const { rng, spec } = ctx;
  const w = bp.w, d = bp.d;
  const style = spec.style;
  style.wall = B.SMOOTH_STONE; style.corner = B.DURASTEEL_DARK; style.band = B.PANEL_STRIPE; style.rhythm = 'slit'; style.railing = B.IRON_BARS; style.roof = B.SMOOTH_STONE;
  const step = Math.max(4, Math.floor(Math.min(w, d) / 8));
  const per = Math.max(1, Math.min(4, Math.floor(ctx.nF / 3)));   // floors per ziggurat step (3 steps)
  const tiers = [{ f0: 0, f1: per - 1 }, { f0: per, f1: 2 * per - 1, inset: { l: step, r: step, b: step } }, { f0: 2 * per, f1: 3 * per - 1, inset: { l: 2 * step, r: 2 * step, b: 2 * step } }];
  const res = buildTiered(bp, { ...spec, tiers, family: 'temple', midDoorF: ctx.midDoorF, hooks: { crown: false, afterTier: (t, yRoof) => terrace(bp, t.ext, yRoof, rng) } });
  const top = res.tiers[2].ext, yTop = 5 * 3 * per;
  const budget = Math.max(60, ctx.height - yTop - 4);
  const tw = top.x1 - top.x0 + 1, td = top.z1 - top.z0 + 1;
  const cxs = Math.floor((top.x0 + top.x1) / 2), czs = Math.floor((top.z0 + top.z1) / 2);
  const spires = [[cxs, czs, Math.min(6, Math.floor(Math.min(tw, td) / 4)), budget]];
  const cr = Math.min(3, Math.floor(Math.min(tw, td) / 7));
  if (cr >= 2) for (const [x, z] of [[top.x0 + cr + 1, top.z0 + cr + 1], [top.x1 - cr - 1, top.z0 + cr + 1], [top.x0 + cr + 1, top.z1 - cr - 1], [top.x1 - cr - 1, top.z1 - cr - 1]]) spires.push([x, z, cr, Math.round(budget * 0.5)]);
  let extra = 0;
  for (const [x, z, r0, h] of spires) {
    for (let y = 0; y < h; y++) {
      const r = Math.max(0, Math.round(r0 * (1 - y / h)));
      const glow = y % 4 === 2;
      bp.fill(x - r, yTop + 1 + y, z - r, x + r, yTop + 1 + y, z + r, y % 12 === 11 ? B.CHROME : B.SMOOTH_STONE);
      if (glow && r >= 1) { bp.set(x - r, yTop + 1 + y, z, B.WINDOW_LIT); bp.set(x + r, yTop + 1 + y, z, B.WINDOW_LIT); bp.set(x, yTop + 1 + y, z - r, B.WINDOW_LIT); bp.set(x, yTop + 1 + y, z + r, B.WINDOW_LIT); }
    }
    bp.fill(x, yTop + 1 + h, z, x, yTop + 3 + h, z, B.CHROME); bp.set(x, yTop + 4 + h, z, B.GLOW_PANEL);
    extra = Math.max(extra, h + 5);
  }
  return { ...res, extra };
}

function terrace(bp, e, yRoof, rng) {
  for (let x = e.x0 + 1; x <= e.x1 - 1; x++) for (let z = e.z0 + 1; z <= e.z1 - 1; z++) {
    const edge = x === e.x0 + 1 || x === e.x1 - 1 || z === e.z0 + 1 || z === e.z1 - 1;
    if (!edge || !bp.isAir(x, yRoof + 1, z) || !bp.isAir(x, yRoof + 2, z)) continue;
    if ((x + z) % 6 === 0) { bp.set(x, yRoof + 1, z, B.DURASTEEL_DARK); bp.set(x, yRoof + 2, z, B.OAK_LEAVES); }
    else if ((x + z) % 6 === 3) { bp.set(x, yRoof + 1, z, B.IRON_BARS); bp.set(x, yRoof + 2, z, B.IRON_BARS); bp.set(x, yRoof + 3, z, B.CITY_LAMP); }
  }
}

// ---------------------------------------------------------------------------------------------------- opera
export function opera(bp, lot, ctx) {
  const { rng, spec } = ctx;
  const w = bp.w, d = bp.d, front = spec.front;
  const style = spec.style;
  style.wall = B.PLASTER; style.corner = B.CHROME; style.band = B.DURASTEEL_DARK; style.rhythm = 'grid'; style.roof = B.DURASTEEL_DARK;
  const alongZ = front === 'N' || front === 'S';
  const T = alongZ ? d : w;                    // depth from the front edge
  const houseDepth = Math.max(16, Math.round(T * 0.4));
  // the house (back-of-house block) sits against the back edge; its lobby faces the plaza
  const house = alongZ
    ? (front === 'S' ? { x0: 0, x1: w - 1, z0: 0, z1: houseDepth - 1 } : { x0: 0, x1: w - 1, z0: d - houseDepth, z1: d - 1 })
    : (front === 'E' ? { x0: 0, x1: houseDepth - 1, z0: 0, z1: d - 1 } : { x0: w - houseDepth, x1: w - 1, z0: 0, z1: d - 1 });
  const nF = Math.max(3, Math.min(6, ctx.nF));
  const hc = alongZ ? Math.floor(w / 2) : Math.floor(d / 2);
  const hdoor = alongZ ? { x: hc, z: front === 'S' ? house.z1 : house.z0 } : { x: front === 'E' ? house.x1 : house.x0, z: hc };
  const res = buildTiered(bp, { ...spec, ext: house, door: hdoor, tiers: [{ f0: 0, f1: nF - 1 }], family: 'opera', midDoorF: -1, hooks: { crown: false, crownKind: 'halo' } });
  // stage in front of the house, shell over it, amphitheatre toward the plaza, plaza at the front edge
  const dirOut = front === 'S' || front === 'E' ? 1 : -1;           // +1: plaza is at higher coordinate
  const houseFront = alongZ ? (front === 'S' ? house.z1 : house.z0) : (front === 'E' ? house.x1 : house.x0);
  const A = (t) => houseFront + dirOut * t;                          // t = distance in front of the house wall
  const W = alongZ ? w : d;
  const set = (a, y, t, id) => { const c = A(t); if (alongZ) bp.set(a, y, c, id); else bp.set(c, y, a, id); };
  const plazaStart = T - houseDepth - Math.max(6, Math.round((T - houseDepth) * 0.3));
  const Rs = Math.min(Math.floor(W / 2) - 2, Math.round((plazaStart - 2) * 0.8));
  const Hs = Math.min(5 * nF - 2, Math.round(Rs * 0.9));
  const seatStart = 8;
  for (let a = 0; a < W; a++) for (let t = 1; t <= T - houseDepth; t++) {
    const da = a + 0.5 - W / 2, r = Math.hypot(da, t);
    const inPlaza = t >= plazaStart;
    if (inPlaza) {
      set(a, 0, t, (a + t) % 7 === 0 ? B.CHROME : B.DECK_PLATE);
      if (a % 8 === 3 && t % 8 === 3) { set(a, 1, t, B.DURASTEEL_DARK); set(a, 2, t, rng.chance(0.5) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); }
      if (a % 8 === 7 && t % 8 === 7) { set(a, 1, t, B.IRON_BARS); set(a, 2, t, B.IRON_BARS); set(a, 3, t, B.CITY_LAMP); }
      continue;
    }
    set(a, 0, t, B.SMOOTH_STONE);
    if (t <= 5 && Math.abs(da) <= Rs - 2) { // stage: raised one block with a lit lip, the house doors open onto it
      set(a, 1, t, t === 5 ? B.GLOW_PANEL : B.PANEL_BLACK);
      if (t === 2 && a % 6 === 0) bp.work(alongZ ? a : A(t), 2, alongZ ? A(t) : a, 'performer');
      continue;
    }
    if (t === 6 && Math.abs(da) <= Rs - 2) { set(a, 1, t, B.STONE_BRICK_SLAB); continue; } // step up to the stage
    if (t >= seatStart && t < plazaStart && Math.abs(da) <= (t + 6)) { // amphitheatre rows, one step up every 3 rows
      const row = Math.floor((t - seatStart) / 3), h = Math.min(row, 5);
      if (Math.abs(da) < 1.5) { // central aisle: climbs with the rows, then steps back down into the plaza
        const ha = Math.min(h, plazaStart - 1 - t);
        for (let k = 1; k <= ha; k++) set(a, k, t, B.PANEL_BLACK);
        continue;
      }
      for (let k = 1; k <= h; k++) set(a, k, t, B.PANEL_BLACK);
      if (t === plazaStart - 1) set(a, h + 1, t, B.IRON_BARS); // railing along the back of the top terrace
      else if ((t - seatStart) % 3 === 1) { set(a, h + 1, t, B.STONE_BRICK_SLAB); if (a % 2 === 0) bp.spot(alongZ ? a : A(t), h + 1, alongZ ? A(t) : a, 'seat'); }
    }
    // the shell: quarter-sphere in front of the house wall over the stage
    if (r <= Rs && r >= Rs - 1.2) {
      const yv = Math.round(Hs * Math.sqrt(Math.max(0, 1 - (r / Rs) ** 2)));
      set(a, 3 + yv, t, B.DURASTEEL);
    }
    if (r < Rs - 1.2) {
      const yo = Math.round(Hs * Math.sqrt(Math.max(0, 1 - (r / Rs) ** 2)));
      const yn = Math.round(Hs * Math.sqrt(Math.max(0, 1 - ((r + 1) / Rs) ** 2)));
      for (let y = yn + 1; y <= yo; y++) set(a, 3 + y, t, y % 5 === 0 ? B.CHROME : B.DURASTEEL);
      if (yo === yn && t % 3 === 0 && a % 3 === 0) set(a, 3 + yo - 1, t, B.GLOW_PANEL);
    }
  }
  // house facade above the stage: a lit proscenium band (above the 3-high house door)
  for (let a = Math.floor(W / 2) - Rs + 2; a <= Math.floor(W / 2) + Rs - 2; a++) for (let y = 4; y <= 6; y++) set(a, y, 0, a % 2 ? B.HOLO_SIGN : B.GLOW_PANEL_BLUE);
  // plaza gate on the lot edge at the door column
  const gc = alongZ ? lot.w >> 1 : lot.d >> 1;
  const tg = T - houseDepth;
  for (const k of [-3, 3]) { set(gc + k, 1, tg, B.CHROME); set(gc + k, 2, tg, B.CHROME); set(gc + k, 3, tg, B.CHROME); set(gc + k, 4, tg, B.CITY_LAMP); }
  for (let k = -3; k <= 3; k++) set(gc + k, 5, tg, k === 0 ? B.HOLO_SIGN : B.DURASTEEL);
  return { ...res, extra: 0, houseDoor: hdoor, inside: alongZ ? { x: gc, z: A(T - houseDepth - 3) } : { x: A(T - houseDepth - 3), z: gc } };
}

// ---------------------------------------------------------------------------------------------------- fallbacks
// Open plaza: paving, planters, lamps and a fountain (the city builder normally paints plazas itself).
export function plaza(bp) {
  const w = bp.w, d = bp.d, cx = w / 2, cz = d / 2;
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    const r = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    bp.set(x, 0, z, (x % 6 === 0 || z % 6 === 0) ? B.DECK_PLATE : B.DURASTEEL);
    if (r <= 3.6) { bp.set(x, 0, z, B.CHROME); bp.set(x, 1, z, r > 2.6 ? B.CHROME : B.WATER); if (r < 0.8) { bp.fill(x, 1, z, x, 3, z, B.CHROME); bp.set(x, 4, z, B.GLOW_PANEL); } }
    else if (x % 12 === 5 && z % 12 === 5) { bp.set(x, 1, z, B.DURASTEEL_DARK); bp.set(x, 2, z, B.OAK_LEAVES); }
    else if (x % 12 === 11 && z % 12 === 11) { bp.fill(x, 1, z, x, 2, z, B.IRON_BARS); bp.set(x, 3, z, B.CITY_LAMP); }
    else if (x % 12 === 8 && (z % 12 === 5 || z % 12 === 6)) { bp.set(x, 1, z, B.STONE_BRICK_SLAB); bp.spot(x, 1, z, 'seat'); }
  }
  return { nF: 0, extra: 5 };
}

// Spaceport terminal / transit station: a low hall with vehicle-bay pools and a holo-sign marquee over the door.
export function terminal(bp, lot, ctx) {
  const res = hall(bp, lot, ctx);
  const f = ctx.spec.front, w = bp.w, d = bp.d;
  const c = f === 'N' || f === 'S' ? (w >> 1) : (d >> 1);
  for (let k = -4; k <= 4; k++) for (let y = 6; y <= 7; y++) {
    const x = f === 'N' || f === 'S' ? c + k : (f === 'E' ? w - 1 : 0), z = f === 'N' || f === 'S' ? (f === 'S' ? d - 1 : 0) : c + k;
    bp.set(x, y, z, (k + y) % 2 ? B.HOLO_SIGN : B.PANEL_BLACK);
  }
  return res;
}
