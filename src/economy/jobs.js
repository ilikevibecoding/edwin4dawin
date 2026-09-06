// Jobs (rubric 08 #4): holo terminals in transit stations, customs halls, cantinas and freight depots list 3-6 jobs a
// day, generated deterministically from (world seed, day, terminal lot) so every client sees the same board; progress
// is per player. `generateBoard` is pure (offline-testable); `JobBoard` tracks the one active job, its world markers,
// proximity hand-ins, expiry and payout.
//
// Kinds: courier (carry a package from the terminal to a named lot 100-600 blocks away, 30-120 cr by distance),
// delivery (buy N items at a named vendor, hand them in at the terminal, pays cost + 40%), ship_repair (right-click
// 3-5 damaged-part markers on a docked ship at the spaceport, 80-200 cr), cleanup (break N debris / scorched blocks
// near the terminal after a disaster, 5 cr each), harvest (bring wheat or meat to a kitchen).
import { RNG, hash2 } from '../rng.js';
import { GOODS, buyPrice } from './prices.js';

export const JOB_KINDS = ['courier', 'delivery', 'ship_repair', 'cleanup', 'harvest'];
export const TERMINAL_KINDS = ['transit_station', 'customs', 'cantina', 'depot'];
const KITCHEN_KINDS = ['diner', 'restaurant', 'bakery', 'caf', 'noodle_bar', 'cantina', 'order_house', 'grocery', 'butcher'];
const DEBRIS_IDS = [78, 79, 81, 80];   // SCORCHED_STONE, ASH, CHARRED_PLANKS, MAGMA (see blocks.js)
const CLEANUP_RADIUS = 64;
const HANDIN_RADIUS = 8;
export const JOB_TTL_DAYS = 1;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const centre = (lot) => ({ x: lot.door ? lot.door.out.x + 0.5 : (lot.x0 + lot.x1) / 2, z: lot.door ? lot.door.out.z + 0.5 : (lot.z0 + lot.z1) / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const fmtName = (p) => p.name;

// Reward formulas (documented in docs/economy_balance.md; the offline test checks them)
export const REWARD = {
  courier: (d) => Math.round(30 + 90 * clamp((d - 100) / 500, 0, 1)),
  delivery: (cost) => Math.round(cost * 1.4),
  shipRepair: (n, jitter = 0) => clamp(Math.round(n * 40 + jitter), 80, 200),
  cleanup: (n) => 5 * n,
  harvest: (item, n) => n * (item === 'wheat' ? 5 : 12) + 10,
};

// Job type mix per terminal kind (weights). The first job of every board is a courier run so a terminal always offers
// the simplest way to earn.
const MIX = {
  transit_station: [['courier', 4], ['delivery', 3], ['harvest', 2], ['cleanup', 1]],
  customs: [['courier', 3], ['delivery', 3], ['ship_repair', 4], ['cleanup', 1]],
  depot: [['delivery', 3], ['courier', 3], ['cleanup', 2], ['ship_repair', 2]],
  cantina: [['harvest', 3], ['courier', 3], ['delivery', 2], ['cleanup', 2]],
};

function pickWeighted(list, rng) {
  let total = 0; for (const [, w] of list) total += w;
  let r = rng.next() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

// ctx: { lots: [{ id, x, z, kind, name, category, district, sells }], pads: [{ x, z }], deckY }
//  - lots must be in a stable order (layout id order) for determinism
export function generateBoard(seed, day, lot, ctx) {
  const rng = new RNG(Math.floor(hash2(lot.id * 31 + 7, day * 17 + 3, seed) * 0x7fffffff) ^ 0x0b5);
  const here = { id: lot.id, ...centre(lot) };
  const kind = lot.purposeKind || 'transit_station';
  const n = rng.int(3, 6);
  const jobs = [];
  const others = ctx.lots.filter((l) => l.id !== lot.id);
  const pick = (cands) => (cands.length ? cands[Math.floor(rng.next() * cands.length)] : null);
  const used = new Set();
  const make = (jobKind, i) => {
    const id = `${lot.id}:${day}:${i}`;
    if (jobKind === 'courier') {
      const cands = others.filter((l) => { const d = dist(here, l); return d >= 100 && d <= 600 && !used.has(l.id); });
      const to = pick(cands);
      if (!to) return null;
      used.add(to.id);
      const d = Math.round(dist(here, to));
      return { id, kind: 'courier', title: `Courier run to ${fmtName(to)}`, desc: `Carry a sealed package from here to ${to.name} (${to.category}, ${d} blocks). Payment on arrival.`, from: { lotId: lot.id, x: here.x, z: here.z, name: lot.purposeName || 'the terminal' }, to: { lotId: to.id, x: to.x, z: to.z, name: to.name }, distance: d, reward: REWARD.courier(d), expiresIn: JOB_TTL_DAYS };
    }
    if (jobKind === 'delivery') {
      const cands = others.filter((l) => { const d = dist(here, l); return d >= 80 && d <= 500 && !used.has(l.id) && l.sells && l.sells.some((s) => GOODS[s.item] && GOODS[s.item].id != null && s.stock >= 6); });
      const vendor = pick(cands);
      if (!vendor) return null;
      used.add(vendor.id);
      const goods = vendor.sells.filter((s) => GOODS[s.item] && GOODS[s.item].id != null && s.stock >= 6);
      const g = goods[Math.floor(rng.next() * goods.length)];
      const count = rng.int(2, 6);
      const unit = buyPrice(g.item, vendor.district, g.price);
      const cost = unit * count;
      const d = Math.round(dist(here, vendor));
      return { id, kind: 'delivery', title: `Fetch ${count} \u00d7 ${label(g.item)} from ${vendor.name}`, desc: `Buy ${count} ${label(g.item)} at ${vendor.name} (${d} blocks away, about ${cost} cr) and bring them back to this terminal. Pays the cost plus 40%.`, from: { lotId: lot.id, x: here.x, z: here.z, name: lot.purposeName || 'the terminal' }, vendor: { lotId: vendor.id, x: vendor.x, z: vendor.z, name: vendor.name }, items: [{ key: g.item, id: GOODS[g.item].id, count }], cost, reward: REWARD.delivery(cost), expiresIn: JOB_TTL_DAYS };
    }
    if (jobKind === 'ship_repair') {
      if (!ctx.pads || !ctx.pads.length) return null;
      const padIndex = Math.floor(rng.next() * ctx.pads.length);
      const pad = ctx.pads[padIndex];
      const parts = rng.int(3, 5);
      const jitter = rng.int(-40, 0);
      return { id, kind: 'ship_repair', title: `Repair a docked ship on pad ${padIndex + 1}`, desc: `A freighter on spaceport pad ${padIndex + 1} took hits on the way in. Right-click the ${parts} sparking parts to patch them.`, from: { lotId: lot.id, x: here.x, z: here.z }, pad: { index: padIndex, x: pad.x, y: ctx.deckY || 97, z: pad.z }, parts, reward: REWARD.shipRepair(parts, jitter), expiresIn: JOB_TTL_DAYS };
    }
    if (jobKind === 'cleanup') {
      const count = rng.int(4, 8);
      return { id, kind: 'cleanup', title: `Clear ${count} pieces of debris`, desc: `Storm damage near this terminal: break ${count} scorched or ash blocks within ${CLEANUP_RADIUS} blocks. 5 cr apiece, paid when the last one is gone.`, from: { lotId: lot.id, x: here.x, z: here.z }, count, radius: CLEANUP_RADIUS, reward: REWARD.cleanup(count), expiresIn: JOB_TTL_DAYS, dynamic: true };
    }
    if (jobKind === 'harvest') {
      const cands = others.filter((l) => KITCHEN_KINDS.includes(l.kind) && dist(here, l) >= 60 && dist(here, l) <= 500 && !used.has(l.id));
      const kitchen = pick(cands);
      if (!kitchen) return null;
      used.add(kitchen.id);
      const meat = rng.next() < 0.4;
      const item = meat ? ['raw_beef', 'raw_porkchop', 'raw_chicken'][Math.floor(rng.next() * 3)] : 'wheat';
      const count = meat ? rng.int(3, 6) : rng.int(6, 12);
      const d = Math.round(dist(here, kitchen));
      return { id, kind: 'harvest', title: `Bring ${count} ${label(item)} to ${kitchen.name}`, desc: `The kitchen at ${kitchen.name} (${d} blocks) is short of ${label(item)}. Farm it, hunt it or buy it, then walk in with ${count}.`, from: { lotId: lot.id, x: here.x, z: here.z }, to: { lotId: kitchen.id, x: kitchen.x, z: kitchen.z, name: kitchen.name }, items: [{ key: item, id: GOODS[item].id, count }], reward: REWARD.harvest(item === 'wheat' ? 'wheat' : 'meat', count), expiresIn: JOB_TTL_DAYS };
    }
    return null;
  };
  const mix = MIX[kind] || MIX.transit_station;
  const first = make('courier', 0);
  if (first) jobs.push(first);
  // at most two jobs of a kind (one ship repair) so a board reads as a mix rather than three courier runs
  let guard = 0;
  while (jobs.length < n && guard++ < 24) {
    const kind = pickWeighted(mix, rng);
    const same = jobs.filter((o) => o.kind === kind).length;
    if (same >= (kind === 'ship_repair' ? 1 : 2)) continue;
    const j = make(kind, jobs.length);
    if (j) jobs.push(j);
  }
  return jobs;
}

function label(key) {
  const g = GOODS[key];
  if (g && g.label) return g.label;
  return key.replace(/^raw_/, 'raw ').replace(/^cooked_/, 'cooked ').replace(/_/g, ' ');
}
export { label as goodLabel };

// ---------------------------------------------------------------------------------------------- runtime board
export class JobBoard {
  constructor(economy) {
    this.eco = economy;
    this.game = economy.game;
    this.active = null;     // { job, acceptedAt, terminal: {lotId}, progress, markers: [{x,y,z,done}], debris: [...] }
    this.boards = new Map(); // `${lotId}:${day}` -> jobs[]
    this.markerMeshes = [];
    this.onChange = null;
    this._ctx = null;
    this._ctxSeed = null;
  }

  // Deterministic context shared by all boards: purposed lots (id order) + spaceport pads.
  ctx() {
    if (this._ctx) return this._ctx;
    const eco = this.eco;
    const lots = eco.allLots().map(({ lot, purpose }) => ({ id: lot.id, ...centre(lot), kind: purpose.kind, name: purpose.name, category: purpose.category, district: purpose.district, sells: purpose.sells }));
    this._ctx = { lots, pads: eco.pads(), deckY: eco.deckY() };
    return this._ctx;
  }

  board(lot) {
    const day = this.eco.day();
    const key = `${lot.id}:${day}`;
    let b = this.boards.get(key);
    if (!b) {
      const p = this.eco.purposeOfLot(lot);
      b = generateBoard(this.eco.seed(), day, { ...lot, purposeKind: p.kind, purposeName: p.name }, this.ctx());
      this.boards.set(key, b);
      if (this.boards.size > 64) this.boards.delete(this.boards.keys().next().value);
    }
    return b;
  }

  // Cleanup jobs depend on the world: debris blocks near the terminal (disaster journal or scorched ground).
  findDebris(job, limit = 64) {
    const w = this.game.world, cx = Math.floor(job.from.x), cz = Math.floor(job.from.z), r = job.radius || CLEANUP_RADIUS;
    const out = [];
    for (let x = cx - r; x <= cx + r && out.length < limit; x += 1) for (let z = cz - r; z <= cz + r && out.length < limit; z += 1) {
      if (!w.isLoaded(x, z)) continue;
      const top = w.surfaceY(x, z);
      for (let y = Math.max(1, top - 6); y <= Math.min(255, top + 12); y++) { const id = w.getBlock(x, y, z); if (DEBRIS_IDS.includes(id)) out.push({ x, y, z, done: false }); }
    }
    out.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
    return out;
  }
  available(job) {
    if (job.kind !== 'cleanup') return true;
    return this.findDebris(job, 1).length > 0;
  }

  accept(job, lot) {
    if (this.active) { this.eco.say('Finish or abandon your current job first.'); return false; }
    const rec = { job, acceptedAt: this.eco.dayTime(), terminal: { lotId: lot.id }, progress: { delivered: 0 }, markers: [], debris: [] };
    if (job.kind === 'ship_repair') rec.markers = this.eco.repairSpots(job.pad, job.parts).map((p) => ({ ...p, done: false }));
    if (job.kind === 'cleanup') {
      const found = this.findDebris(job, job.count);
      if (!found.length) { this.eco.say('No debris reported near here today.'); return false; }
      rec.debris = found;
      if (found.length < job.count) rec.job = { ...job, count: found.length, reward: REWARD.cleanup(found.length) };
    }
    this.active = rec;
    this.eco.markDirty();
    this.eco.toast(`Job accepted: ${rec.job.title}`);
    this.game.audio.click();
    this.syncMarkers();
    if (this.onChange) this.onChange();
    return true;
  }
  abandon(silent = false) {
    if (!this.active) return;
    const t = this.active.job.title;
    this.active = null;
    this.syncMarkers();
    this.eco.markDirty();
    if (!silent) this.eco.toast(`Job abandoned: ${t}`);
    if (this.onChange) this.onChange();
  }
  complete() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    this.syncMarkers();
    this.eco.earn(a.job.reward, `Job complete: ${a.job.title}`);
    this.eco.stats.jobsDone = (this.eco.stats.jobsDone || 0) + 1;
    this.eco.stats.jobEarnings = (this.eco.stats.jobEarnings || 0) + a.job.reward;
    if (this.onChange) this.onChange();
  }

  // Compass target for the HUD strip (world x/z + label), or null when the next step has no place.
  target() {
    const a = this.active;
    if (!a) return null;
    const j = a.job, inv = this.game.inventory;
    const has = (items) => items.every((it) => inv.count(it.id) >= it.count);
    switch (j.kind) {
      case 'courier': return { x: j.to.x, z: j.to.z, label: j.to.name };
      case 'delivery': return has(j.items) ? { x: j.from.x, z: j.from.z, label: 'back to the terminal' } : { x: j.vendor.x, z: j.vendor.z, label: j.vendor.name };
      case 'harvest': return { x: j.to.x, z: j.to.z, label: j.to.name };
      case 'ship_repair': { const m = a.markers.find((k) => !k.done); return m ? { x: m.x + 0.5, y: m.y, z: m.z + 0.5, label: `pad ${j.pad.index + 1}` } : null; }
      case 'cleanup': { const p = this.game.player.pos; let best = null, bd = Infinity; for (const d of a.debris) { if (d.done) continue; const dd = Math.hypot(d.x - p.x, d.z - p.z); if (dd < bd) { bd = dd; best = d; } } return best ? { x: best.x + 0.5, y: best.y, z: best.z + 0.5, label: 'debris' } : null; }
      default: return null;
    }
  }
  // One-line status for the HUD strip
  status() {
    const a = this.active;
    if (!a) return null;
    const j = a.job, inv = this.game.inventory;
    switch (j.kind) {
      case 'courier': return `Courier: deliver the package to ${j.to.name}`;
      case 'delivery': { const it = j.items[0]; const n = Math.min(it.count, inv.count(it.id)); return n >= it.count ? `Delivery: bring ${it.count} ${label(it.key)} back to the terminal` : `Delivery: buy ${label(it.key)} at ${j.vendor.name} (${n}/${it.count})`; }
      case 'harvest': { const it = j.items[0]; return `Harvest: ${Math.min(it.count, inv.count(it.id))}/${it.count} ${label(it.key)} for ${j.to.name}`; }
      case 'ship_repair': return `Ship repair: ${a.markers.filter((m) => m.done).length}/${a.markers.length} parts fixed on pad ${j.pad.index + 1}`;
      case 'cleanup': return `Cleanup: ${a.debris.filter((d) => d.done).length}/${a.debris.length} debris cleared`;
      default: return j.title;
    }
  }
  remaining() { const a = this.active; return a ? Math.max(0, a.acceptedAt + a.job.expiresIn - this.eco.dayTime()) : 0; }
  hasGoods() { const a = this.active; if (!a || !a.job.items) return false; const inv = this.game.inventory; return a.job.items.every((it) => inv.count(it.id) >= it.count); }

  // 20 tps: expiry, proximity hand-ins
  tick() {
    const a = this.active;
    if (!a) return;
    if (this.remaining() <= 0) { const t = a.job.title; this.active = null; this.syncMarkers(); this.eco.markDirty(); this.eco.toast(`Job expired: ${t}`); if (this.onChange) this.onChange(); return; }
    if ((this.game.tickCount & 3) !== 0) return;
    const j = a.job, p = this.game.player.pos;
    const near = (pt, lotId) => { if (Math.hypot(pt.x - p.x, pt.z - p.z) <= HANDIN_RADIUS) return true; const lot = this.eco.lotById(lotId); return !!lot && p.x >= lot.x0 && p.x < lot.x1 && p.z >= lot.z0 && p.z < lot.z1; };
    if (j.kind === 'courier' && near(j.to, j.to.lotId)) { this.eco.toast(`Package delivered to ${j.to.name}.`); this.complete(); return; }
    if ((j.kind === 'delivery' || j.kind === 'harvest') && this.hasGoods()) {
      const dest = j.kind === 'delivery' ? j.from : j.to;
      if (near(dest, dest.lotId)) {
        for (const it of j.items) this.eco.removeItems(it.id, it.count);
        this.eco.toast(j.kind === 'delivery' ? 'Goods handed in at the terminal.' : `${j.to.name} takes the ${label(j.items[0].key)}.`);
        this.complete();
      }
    }
  }
  onBlockBroken(x, y, z) {
    const a = this.active;
    if (!a || a.job.kind !== 'cleanup') return;
    const d = a.debris.find((k) => !k.done && k.x === x && k.y === y && k.z === z);
    if (!d) return;
    d.done = true;
    this.eco.markDirty();
    const left = a.debris.filter((k) => !k.done).length;
    if (left === 0) this.complete(); else this.eco.toast(`Debris cleared (${left} left)`);
  }

  // ---------------------------------------------------------------- ship repair markers
  repairTargets() { return this.active && this.active.job.kind === 'ship_repair' ? this.active.markers.filter((m) => !m.done).map((m) => ({ x: m.x, y: m.y, z: m.z })) : []; }
  // Ray vs marker boxes (1 block around the marker centre); returns { marker, dist } or null.
  raycastMarker(origin, dir, maxDist) {
    const a = this.active;
    if (!a || a.job.kind !== 'ship_repair') return null;
    let best = null;
    for (const m of a.markers) {
      if (m.done) continue;
      const t = rayBox(origin, dir, m.x, m.y, m.z, m.x + 1, m.y + 1, m.z + 1);
      if (t !== null && t <= maxDist && (!best || t < best.dist)) best = { marker: m, dist: t };
    }
    return best;
  }
  repair(marker) {
    const a = this.active;
    if (!a || marker.done) return false;
    marker.done = true;
    this.eco.markDirty();
    const g = this.game;
    if (g.particles && g.particles.blockHit) { try { g.particles.blockHit({ x: marker.x, y: marker.y, z: marker.z, point: { x: marker.x + 0.5, y: marker.y + 0.5, z: marker.z + 0.5 }, face: 2 }, 93); } catch (e) { /* cosmetic */ } }
    g.audio.hit('metal', { x: marker.x + 0.5, y: marker.y + 0.5, z: marker.z + 0.5 });
    const left = a.markers.filter((m) => !m.done).length;
    if (left === 0) this.complete(); else this.eco.toast(`Part repaired (${left} to go)`);
    this.syncMarkers();
    return true;
  }
  // Marker visuals: pulsing orange cubes on the damaged parts (added/removed through the economy's scene hook)
  syncMarkers() { this.eco.syncMarkerMeshes(this.active && this.active.job.kind === 'ship_repair' ? this.active.markers.filter((m) => !m.done) : []); }

  serialize() { const a = this.active; return a ? { job: a.job, acceptedAt: a.acceptedAt, terminal: a.terminal, progress: a.progress, markers: a.markers, debris: a.debris } : null; }
  restore(data) {
    if (!data || !data.job || !JOB_KINDS.includes(data.job.kind)) { this.active = null; return; }
    this.active = { job: data.job, acceptedAt: +data.acceptedAt || 0, terminal: data.terminal || null, progress: data.progress || {}, markers: Array.isArray(data.markers) ? data.markers : [], debris: Array.isArray(data.debris) ? data.debris : [] };
    this.syncMarkers();
  }
}

// Slab-method ray / AABB intersection; returns the entry distance or null.
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = -Infinity, tmax = Infinity;
  const axes = [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]];
  for (const [p, v, lo, hi] of axes) {
    if (Math.abs(v) < 1e-9) { if (p < lo || p > hi) return null; continue; }
    let t0 = (lo - p) / v, t1 = (hi - p) / v;
    if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
    if (t0 > tmin) tmin = t0;
    if (t1 < tmax) tmax = t1;
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return Math.max(0, tmin);
}
export { rayBox };
