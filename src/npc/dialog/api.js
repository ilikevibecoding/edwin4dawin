// The dialog API (spec §12, rubric 14 B/D): `game.dialog.lineFor(npc, ctx)` selects from the NPC's own bank by
// eligibility against the real state, `game.dialog.say(npc, line)` shows the subtitle, speaks through Web Speech where
// a voice exists (one voice within 24 blocks; an open talk box silences chatter within 16) and otherwise records the
// line in the unvoiced manifest. Context facts come from game.economy / game.senate / game.disasters /
// game.shipTraffic / game.events.recent() within the person's knowledge limits; nothing here invents state.
import { composeBank, buildFills, fillLive, STAFF_DIST, CATEGORIES } from './bank.js';
import { castLines } from './castLines.js';
import { SpeechOutput } from './voice.js';
import { periodOf, HISTORY } from './dialog.js';
import { isOpen } from '../../coruscant/purposes.js';
import { activityAt } from '../coruscant/census.js';
import { PORT } from '../coruscant/port.js';
import { hash2 } from '../../rng.js';

export const VOICE_RADIUS = 24;      // one spoken voice within this many blocks
export const TALK_QUIET_RADIUS = 16; // an open talk box silences incidental chatter this close
export const AMBIENT_CATS = ['work', 'event', 'personal'];
const CAST_TOPUP = { work: 2, event: 2, personal: 1 };
const DWELL = new Set(['shutdown', 'doors', 'boarding', 'servicing', 'closure']);
const TERMINAL_KINDS = new Set(['transit_station', 'customs', 'cantina', 'depot']);

const cmp = (v, spec) => {
  if (typeof spec === 'number') return v === spec;
  const m = /^([<>]=?)(\d+)$/.exec(String(spec));
  if (!m) return false;
  const n = +m[2];
  return m[1] === '>' ? v > n : m[1] === '>=' ? v >= n : m[1] === '<' ? v < n : v <= n;
};

// A line's `when` against a context. Unknown keys fail closed: a condition we cannot evaluate is not met.
export function eligible(line, ctx) {
  const w = line.when;
  if (!w) return true;
  for (const k in w) {
    const v = w[k];
    switch (k) {
      case 'met':
        if (v === 'first' && !(ctx.talks === 0 && ctx.jobsDone === 0)) return false;
        if (v === 'returning' && !(ctx.talks > 0)) return false;
        if (v === 'afterJob' && !(ctx.jobsDone > 0)) return false;
        break;
      case 'period': if (!v.includes(ctx.period)) return false; break;
      case 'stock': if (ctx.stock !== v) return false; break;
      case 'waiting': if (!!ctx.waiting !== v) return false; break;
      case 'shipment': if (ctx.shipment !== v) return false; break;
      case 'senate': if (ctx.senate !== v) return false; break;
      case 'senateSitting': if (!!ctx.senateSitting !== v) return false; break;
      case 'disaster': if (!!ctx.disaster !== v) return false; break;
      case 'recovering': if (!!ctx.recovering !== v) return false; break;
      case 'standing': if (Array.isArray(v) ? !v.includes(ctx.standing) : ctx.standing !== v) return false; break;
      case 'offences': if (!cmp(ctx.offences | 0, v)) return false; break;
      case 'jobsDone': if (!cmp(ctx.jobsDone | 0, v)) return false; break;
      case 'job': if (ctx.job !== v) return false; break;
      case 'open': if (!!ctx.open !== v) return false; break;
      case 'shipOnPad': if (!!ctx.shipOnPad !== v) return false; break;
      case 'ownShip': if (ctx.ownShip !== v) return false; break;
      case 'event': if (!ctx.events || !ctx.events.includes(v)) return false; break;
      case 'quiet': if (!!ctx.quiet !== v) return false; break;
      case 'trainsOk': if (!!ctx.trainsOk !== v) return false; break;
      case 'poke': if (!!ctx.poke !== v) return false; break;
      case 'act': if (ctx.act !== v) return false; break;
      case 'role': break;
      default: return false;
    }
  }
  return true;
}

export class DialogAPI {
  constructor(game, registry, pop = null) {
    this.game = game; this.registry = registry; this.pop = pop;
    this.banks = new Map();            // pp.id -> lines
    this.lastSaid = new Map();         // line id -> time said (seconds)
    this.lastCtx = new Map();          // pp.id -> the context the last selection used (for live fills)
    this.speech = new SpeechOutput(game);
    this.speakers = [];                // active voiced speakers { id, x, z, until }
    this.suppressed = 0;               // lines delivered text-only because of the local budget
    this.now = 0;
    this.disasterSeen = false; this.disasterEndedAt = -Infinity;
    this.stats = { said: 0, ambient: 0, talk: 0 };
    const layout = registry.layout;
    const landmarks = registry.pool.purposed.filter((p) => p.lot.kind === 'landmark');
    const terminals = registry.pool.purposed.filter((p) => TERMINAL_KINDS.has(p.purpose.kind));
    const near = (list, lotId, exclude) => {
      const at = registry.centreOf(lotId);
      if (!at) return null;
      let best = null, bd = Infinity;
      for (const p of list) { if (p.lot.id === exclude) continue; const d = Math.hypot(p.lot.x0 + p.lot.w / 2 - at.x, p.lot.z0 + p.lot.d / 2 - at.z); if (d < bd) { bd = d; best = p; } }
      return best;
    };
    this.world = {
      registry, layout,
      nearestLandmark: (lotId) => { const p = near(landmarks, lotId, lotId); return p ? p.purpose.name : null; },
      nearestTerminal: (lotId) => { const p = near(terminals, lotId, lotId); return p ? p.purpose.name : null; },
      nearestTerminalLot: (lotId) => { const p = near(terminals, lotId, -1); return p ? p.lot : null; },
    };
  }
  get unvoiced() { return this.speech.unvoiced; }
  get settings() { return this.speech.settings; }

  // ---------------------------------------------------------------------------------------------------- banks
  resolve(npcOrPp) {
    if (!npcOrPp) return null;
    if (npcOrPp.relationships && npcOrPp.history) return npcOrPp;
    if (npcOrPp.person) return this.registry.forPerson(npcOrPp.person);
    if (typeof npcOrPp === 'string') return this.registry.get(npcOrPp) || this.registry.get('cast:' + npcOrPp);
    return null;
  }
  bankFor(npcOrPp) {
    const pp = this.resolve(npcOrPp);
    if (!pp) return [];
    let bank = this.banks.get(pp.id);
    if (bank) return bank;
    const { fills } = buildFills(pp, this.world);
    if (pp.kind === 'cast') {
      for (const r of pp.relationships) {
        if (fills['rel_' + r.kind] == null) { fills['rel_' + r.kind] = r.name; const o = this.registry.get(r.id); fills['rel_' + r.kind + '_place'] = o ? o.workName : null; }
      }
      const hand = castLines(pp, fills);
      const start = {};
      for (const l of hand) start[l.trigger] = (start[l.trigger] || 0) + 1;
      bank = hand.concat(composeBank(pp, this.world, CAST_TOPUP, start));
    } else bank = composeBank(pp, this.world, STAFF_DIST);
    this.banks.set(pp.id, bank);
    return bank;
  }

  // ---------------------------------------------------------------------------------------------------- context
  // Everything a line may be conditioned on, read from real state within the person's knowledge limits.
  context(npcOrPp, extra = {}) {
    const pp = this.resolve(npcOrPp);
    const g = this.game || {};
    const hour = this.registry.hour();
    const h = pp.history;
    const npc = this.pop ? this.pop.liveByPerson.get(pp.personId) : null;
    const ctx = {
      id: pp.id, hour, period: periodOf(hour), act: npc && !npc.dead ? npc.act : activityAt(pp.person, hour).act,
      talks: h.talks, jobsDone: h.jobs, favours: h.favours, offences: h.offences,
      standing: h.offences > 0 && h.offences >= h.jobs + h.favours ? 'suspect' : (h.jobs + h.favours >= 2 ? 'trusted' : 'neutral'),
      open: true, stock: null, stockQty: null, price: null, price2: null, waiting: false, shipment: null,
      senate: null, senateScenario: null, senateSitting: false, disaster: null, recovering: false, events: [], shipOnPad: false, ownShip: null,
      job: 'none', jobTitle: null, trainsOk: false, quiet: false, poke: false, talkOpen: false, investigating: false,
    };
    // own business: stock, prices, waiting for a component / shipment
    const lotId = pp.knows.business != null ? pp.knows.business : (pp.lot.work !== PORT ? pp.lot.work : null);
    const purpose = lotId != null ? this.registry.purposeOf.get(lotId) : null;
    if (purpose) {
      ctx.open = isOpen(purpose, hour);
      const eco = g.economy;
      const sells = purpose.sells || [];
      if (sells.length) {
        const e0 = sells[0], e1 = sells[1];
        let qty = e0.stock, target = e0.stock;
        if (eco && typeof eco.business === 'function') {
          const b = safe(() => eco.business(lotId));
          if (b && b.stock && b.stock.get) { qty = b.stock.get(e0.item) ?? qty; target = (b.target && b.target.get(e0.item)) ?? target; }
          if (b && Array.isArray(b.waitingFor) && b.waitingFor.length) ctx.waiting = b.waitingFor[0];
        } else if (eco && typeof eco.stockOf === 'function') qty = safe(() => eco.stockOf(lotId, e0)) ?? qty;
        ctx.stockQty = qty;
        ctx.stock = qty <= 0 ? 'out' : qty < Math.max(1, target * 0.25) ? 'low' : 'ok';
        ctx.price = eco && typeof eco.quote === 'function' ? (safe(() => eco.quote(lotId, e0.item)) || {}).buy ?? e0.price : eco && typeof eco.priceOf === 'function' ? safe(() => eco.priceOf(purpose, e0)) ?? e0.price : e0.price;
        if (e1) ctx.price2 = eco && typeof eco.priceOf === 'function' ? safe(() => eco.priceOf(purpose, e1)) ?? e1.price : e1.price;
        if (ctx.stock === 'out' && !ctx.waiting) ctx.waiting = true;
      }
      if (eco && typeof eco.shipments === 'function') {
        const mine = (safe(() => eco.shipments()) || []).filter((s) => s.to === lotId);
        if (mine.some((s) => s.state === 'late' || s.late)) ctx.shipment = 'late';
        else if (mine.some((s) => s.state === 'arrived')) ctx.shipment = 'arrived';
      }
    }
    // broadcasts and district events
    const events = g.events && typeof g.events.recent === 'function' ? g.events.recent(null, 50) : [];
    const knows = pp.knows.broadcasts || [];
    for (const ev of events) {
      if (ev.name === 'senate:result' && knows.includes('senate:result')) { const a = ev.args[0] || {}; ctx.senate = a.outcome === 'passed' || a.outcome === 'carried' || a.passed ? 'passed' : 'failed'; ctx.senateScenario = a.scenario && (a.scenario.name || a.scenario) || 'the infrastructure'; }
      if (ev.name === 'economy:shipment') { const a = ev.args[0] || {}; if (pp.district === 'spaceport' || a.to === lotId || a.from === lotId || this.registry.districtOf(a.to) === pp.district) push(ctx.events, 'economy:shipment'); }
      if (ev.name === 'disaster:cleared') push(ctx.events, 'disaster:cleared');
      if (ev.name.startsWith('event:') && pp.knows.district) push(ctx.events, ev.name);
    }
    if (g.senate && pp.knows.senate) {
      const st = g.senate.state;
      ctx.senateSitting = st === 'session' || st === 'vote';
      if (ctx.senateSitting) ctx.senateScenario = ctx.senateScenario || (g.senate.current && (g.senate.current.name || g.senate.current.title)) || (Array.isArray(g.senate.scenarios) && g.senate.scenarios[0] && (g.senate.scenarios[0].name || g.senate.scenarios[0].title)) || 'the infrastructure';
    }
    if (g.disasters && knows.includes('disaster')) {
      const d = g.disasters;
      const running = d.active && (d.state === 'running' || d.state === 'paused') && !d.active.preview;
      if (running) { ctx.disaster = (d.active.constructor.label || d.active.constructor.type || 'disaster').toLowerCase(); this.disasterSeen = true; }
      else if (this.disasterSeen) { this.disasterSeen = false; this.disasterEndedAt = this.now; }
      if (!running && this.now - this.disasterEndedAt < 180) ctx.recovering = true;
    }
    // the port: ships on the pads (port people only); own ship for a captain
    if (g.shipTraffic && (pp.district === 'spaceport' || pp.knows.port)) {
      const own = pp.ship ? pp.ship.pad : -1;
      ctx.shipOnPad = g.shipTraffic.ships.some((s) => typeof s.pad === 'number' && s.pad !== own && DWELL.has(s.phase));
      if (pp.ship) { const sh = g.shipTraffic.ships.find((s) => s.pad === own); ctx.ownShip = sh ? (DWELL.has(sh.phase) ? 'onPad' : 'away') : null; }
    }
    // the job board of the nearest terminal (public)
    if (g.economy && g.economy.jobs && typeof g.economy.jobs.board === 'function') {
      const tl = this.world.nearestTerminalLot(pp.lot.work !== PORT ? pp.lot.work : pp.lot.home !== PORT && pp.lot.home != null ? pp.lot.home : 91);
      if (tl) { const board = safe(() => g.economy.jobs.board(tl)) || []; const jobs = board.filter((j) => safe(() => g.economy.jobs.available(j)) !== false); if (jobs.length) { ctx.job = 'available'; ctx.jobTitle = jobs[0].title; } }
    }
    ctx.trainsOk = !!g.train && !ctx.disaster;
    ctx.quiet = !ctx.events.length && !ctx.disaster && !ctx.recovering && !ctx.senate && !ctx.senateSitting;
    ctx.investigating = pp.states.includes('investigating') && (!!ctx.disaster || ctx.events.length > 0);
    Object.assign(ctx, extra);
    ctx.state = this.registry.stateOf(pp, hour, ctx);
    return ctx;
  }

  // ---------------------------------------------------------------------------------------------------- selection
  // ctx may be a partial: { trigger } | { cats: [...] } | { ambient: true } | { poke: true } plus overrides. Returns
  // the best eligible line: filter by trigger/category, eligibility, cooldown and the last HISTORY heard lines; then
  // priority, then a deterministic hash of (line id, how many times this person has spoken).
  lineFor(npcOrPp, partial = {}) {
    const pp = this.resolve(npcOrPp);
    if (!pp) return null;
    const bank = this.bankFor(pp);
    const ctx = this.context(pp, partial);
    this.lastCtx.set(pp.id, ctx);
    let cands = bank;
    if (partial.trigger) cands = cands.filter((l) => l.trigger === partial.trigger);
    else if (partial.cats) cands = cands.filter((l) => partial.cats.includes(l.cat) && l.trigger !== 'interrupt');
    else if (partial.ambient) cands = cands.filter((l) => AMBIENT_CATS.includes(l.cat) && !(l.when && l.when.met));
    if (partial.poke === undefined) cands = cands.filter((l) => !(l.when && l.when.poke));
    const elig = cands.filter((l) => eligible(l, ctx));
    const step = pp.history.talks * 7 + (pp.saidCount | 0);
    const rank = (list) => list.slice().sort((a, b) => b.priority - a.priority || hash2(step, a.id.length * 31 + a.id.charCodeAt(a.id.length - 1), pp.seed & 0xffff) - hash2(step, b.id.length * 31 + b.id.charCodeAt(b.id.length - 1), pp.seed & 0xffff));
    const fresh = elig.filter((l) => !pp.recent.includes(l.id) && !this.onCooldown(l));
    if (fresh.length) return rank(fresh)[0];
    const notRecent = elig.filter((l) => !pp.recent.includes(l.id));
    if (notRecent.length) return rank(notRecent)[0];
    return elig.length ? rank(elig)[0] : null;
  }
  onCooldown(line) { const t = this.lastSaid.get(line.id); return t !== undefined && this.now - t < line.cooldown; }
  // Text of a line with the live tokens filled from the context it was selected in (or a fresh one)
  render(npcOrPp, line, ctx = null) {
    const pp = this.resolve(npcOrPp);
    const c = ctx || this.lastCtx.get(pp.id) || this.context(pp);
    let text = fillLive(line.text, c);
    text = text.replace(/\{(\w+)\}/g, '');
    return text.replace(/\s{2,}/g, ' ').trim();
  }

  // ---------------------------------------------------------------------------------------------------- delivery
  // opts: { npc (live citizen for the bubble + position), important (a talk-box line: always voiced if a voice exists),
  //         bubble (default true when npc given), ambient, poke, talk (count as a conversation for the history) }
  say(npcOrPp, line, opts = {}) {
    const pp = this.resolve(npcOrPp);
    if (!pp || !line) return null;
    const text = this.render(pp, line, opts.ctx || null);
    const npc = opts.npc || (this.pop ? this.pop.liveByPerson.get(pp.personId) : null);
    const pos = npc && !npc.dead ? npc.pos : (this.registry.positionOf(pp) || { x: 0, y: 0, z: 0 });
    // history of what was heard; cooldown
    pp.recent.push(line.id); if (pp.recent.length > HISTORY) pp.recent.shift();
    pp.saidCount = (pp.saidCount | 0) + 1;
    this.lastSaid.set(line.id, this.now);
    // the local audio budget: one voice within VOICE_RADIUS unless this is the talk box speaking
    const dur = Math.min(9, Math.max(2.4, text.length / 14));
    this.speakers = this.speakers.filter((s) => s.until > this.now);
    const other = this.speakers.find((s) => s.id !== pp.id && Math.hypot(s.x - pos.x, s.z - pos.z) < VOICE_RADIUS);
    let voiced = false, budgeted = false;
    if (other && !opts.important) { budgeted = true; this.suppressed++; }
    const res = this.speech.say(pp, text, { voice: !budgeted, lineId: line.id, subtitle: true, duration: dur, important: !!opts.important });
    voiced = !!(res && res.voiced);
    if (voiced) this.speakers.push({ id: pp.id, x: pos.x, z: pos.z, until: this.now + (res.duration || dur) });
    if (npc && !npc.dead && this.pop && opts.bubble !== false) this.pop.bubbles.say(npc, text, this.pop.time, dur);
    if (npc && !npc.dead) npc.talkingT = Math.max(npc.talkingT || 0, Math.min(dur, 6));
    this.stats.said++; if (opts.ambient) this.stats.ambient++; if (opts.important) this.stats.talk++;
    if (this.game && this.game.events) this.game.events.emit('npc:talk', { npc: pp.id, lineId: line.id, text, voiced, ambient: !!opts.ambient });
    return { id: line.id, speaker: pp.id, name: pp.name, text, voiced, budgeted, duration: dur, cat: line.cat, trigger: line.trigger };
  }
  // Is incidental chatter allowed for this live citizen right now? (talk box open within 16 blocks -> no)
  allowChatter(npc) {
    const tb = this.pop && this.pop.talkBox;
    if (tb && tb.npc && tb.npc !== npc) { const o = tb.npc.pos; if ((o.x - npc.pos.x) ** 2 + (o.z - npc.pos.z) ** 2 < TALK_QUIET_RADIUS * TALK_QUIET_RADIUS) return false; }
    return true;
  }
  update(now) { this.now = now; this.registry.now = now; this.speech.update(); }
  audioReport() { return { ...this.speech.report(), suppressedByBudget: this.suppressed, said: this.stats.said, ambient: this.stats.ambient, talk: this.stats.talk, banks: this.banks.size }; }
  // counts for the admin panel / tests
  bankStats(npcOrPp) {
    const bank = this.bankFor(npcOrPp);
    const perCat = {};
    for (const c of CATEGORIES) perCat[c] = 0;
    for (const l of bank) perCat[l.cat] = (perCat[l.cat] || 0) + 1;
    return { total: bank.length, perCat };
  }
}

function safe(fn) { try { return fn(); } catch (e) { return undefined; } }
function push(arr, v) { if (!arr.includes(v)) arr.push(v); }
