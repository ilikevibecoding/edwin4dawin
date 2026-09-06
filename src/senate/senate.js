// The Galactic Senate at runtime (rubric 17): samples the game clock, drives the session state machine, publishes
// `senate:*` events on game.events, keeps the influence log and the results, persists under the `senate` save key,
// and answers the questions other systems ask (which pod seats a delegation, where the Jedi liaison stands, what the
// last vote decided). It never imports the economy, factions or NPC modules — effects travel as events.
//
// Integrator hooks (game.js / save.js), see docs/overhaul/senate.md:
//   import { Senate } from './senate/senate.js';       this.senate = new Senate(this);      (after game.events + coruscant)
//   in the tick:                                        if (this.senate) this.senate.tick();
//   save.js: `senate` key (this.senate = data.senate || null; setSenate(data); serialize() includes senate)
import { SenateSim, phaseAt, hoursToNextSession, SESSION_SLOTS } from './session.js';
import { SCENARIOS, SCENARIO_BY_ID, vote, positionOf } from './scenarios.js';
import { DELEGATIONS, DELEGATION_BY_ID } from './delegations.js';
import { streetRoute } from './route.js';
import { blueprintFor } from '../coruscant/buildings.js';

const SAMPLE_MS = 250;
const LOCAL_KEY = 'frontier-craft:senate';   // fallback persistence until save.js carries the `senate` key

export class Senate {
  constructor(game) {
    this.game = game;
    const seed = game.coruscant && game.coruscant.layout ? game.coruscant.layout.seed : 1337;
    this.sim = new SenateSim(seed);
    this._meta = undefined;
    this._lot = undefined;
    this._lastSample = 0;
    this._dirty = false;
    this.speakerLine = null;   // { line, until } for the subtitle strip
    this.restore(this._loadSaved());
    // the DOM overlays (board, plaques, subtitle) load only in a browser: the module stays importable under Node
    this.ui = null;
    if (typeof document !== 'undefined') import('../ui/senate.js').then((m) => { this.ui = new m.SenateUI(this); }).catch((e) => console.warn('senate: UI unavailable', e));
  }

  // ---------------------------------------------------------------- geometry (from the blueprint's meta.senate)
  get lot() {
    if (this._lot === undefined) { const L = this.game.coruscant && this.game.coruscant.layout; this._lot = L ? (L.lots.find((l) => l.kind === 'landmark' && l.family === 'senate') || null) : null; }
    return this._lot;
  }
  get meta() {
    if (this._meta === undefined) {
      const lot = this.lot, L = this.game.coruscant && this.game.coruscant.layout;
      let m = null;
      if (lot && L) { try { const bp = blueprintFor(lot, L); m = bp && bp.meta ? bp.meta.senate || null : null; } catch (e) { console.warn('senate: blueprint meta unavailable', e); m = null; } }
      this._meta = m;
    }
    return this._meta;
  }
  // is a world position inside the Senate drum (any level) or one of its suites?
  inside(x = this.game.player.pos.x, y = this.game.player.pos.y, z = this.game.player.pos.z) {
    const m = this.meta, lot = this.lot; if (!m || !lot) return false;
    const dx = x - m.centre.x - 0.5, dz = z - m.centre.z - 0.5;
    const r = Math.hypot(dx, dz);
    const y0 = m.levels[0] - 1;
    return r <= m.radius.drum + 1 && y >= y0 - 1 && y <= y0 + 70;
  }
  inChamber(x = this.game.player.pos.x, y = this.game.player.pos.y, z = this.game.player.pos.z) {
    const m = this.meta; if (!m) return false;
    const r = Math.hypot(x - m.centre.x - 0.5, z - m.centre.z - 0.5);
    return r <= m.radius.hall && y >= m.levels[0] - 1 && y <= m.levels[0] + 70;
  }
  // the suite the position is in (its rooms' rectangles at its level), or null
  suiteAt(x = this.game.player.pos.x, y = this.game.player.pos.y, z = this.game.player.pos.z) {
    const m = this.meta; if (!m) return null;
    for (const d of m.delegations) {
      if (Math.abs(y - d.suite.y) > 2.5) continue;
      for (const r of d.suite.rooms) if (x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.d) return d;
    }
    return null;
  }
  // the suite whose public entrance is within `dist` blocks (plaque range), or null
  suiteNear(x = this.game.player.pos.x, y = this.game.player.pos.y, z = this.game.player.pos.z, dist = 7) {
    const m = this.meta; if (!m) return null;
    let best = null;
    for (const d of m.delegations) {
      for (const p of [d.suite.entry, d.suite.lobbyDoor]) { const dd = Math.hypot(x - p.x - 0.5, z - p.z - 0.5); if (Math.abs(y - p.y) < 3 && dd <= dist && (!best || dd < best.dd)) best = { dd, d }; }
    }
    return best ? best.d : null;
  }
  delegation(id) { return DELEGATION_BY_ID[id] || null; }
  delegationRecord(id) { const m = this.meta; return m ? m.delegations.find((d) => d.id === id) || null : null; }
  // seats of a delegation's pod (world coords) — W4 seats the delegation there during a session
  seatsFor(id) { const d = this.delegationRecord(id); return d ? d.pod.seats : []; }
  // every wall-tier pod seat (for the aggregated bloc's extras), tier-major
  podSeats() { const m = this.meta; return m ? m.pods.flat().flatMap((p) => p.seats) : []; }

  // ---------------------------------------------------------------- the clock
  tick(now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (now - this._lastSample < SAMPLE_MS) return;
    this._lastSample = now;
    const sky = this.game.sky; if (!sky) return;
    const hour = ((sky.time % 1) + 1) % 1 * 24;
    const transitions = this.sim.advance(hour);
    for (const t of transitions) this._announce(t);
    const sp = this.sim.speakerDue(hour);
    if (sp) { this._say(sp); this._dirty = true; }
    if (transitions.length) this._dirty = true;
    if (this._dirty) { this.persist(); this._dirty = false; }
    if (this.ui) this.ui.update(hour);
  }
  _announce(t) {
    const ev = this.game.events;
    const scenario = t.scenario ? SCENARIO_BY_ID[t.scenario] : null;
    if (ev) ev.emit('senate:session', { state: t.state, scenario: t.scenario, session: t.session, day: t.day, slot: t.slot, title: scenario ? scenario.title : null });
    if (t.state === 'vote' && ev) ev.emit('senate:vote', { scenario: t.scenario, tally: t.tally, session: t.session });
    if (t.state === 'adjourned' && t.result && ev) ev.emit('senate:result', { scenario: t.scenario, outcome: t.result.outcome, effects: t.result.effects, headline: t.result.headline, tally: t.result.tally, session: t.session });
    if (t.state === 'convening' && scenario) this.speakerLine = { line: `The Senate is convening. On the agenda: ${scenario.title}.`, until: Date.now() + 6000, speaker: 'Clerk of the Senate' };
    if (t.state === 'adjourned' && t.result) this.speakerLine = { line: t.result.headline + '.', until: Date.now() + 8000, speaker: 'Clerk of the Senate' };
    if (t.state === 'vote' && t.tally) this.speakerLine = { line: `The chamber votes: ${t.tally.total.for} for, ${t.tally.total.against} against, ${t.tally.total.undecided} abstaining.`, until: Date.now() + 6000, speaker: 'Clerk of the Senate' };
  }
  _say(sp) {
    const ev = this.game.events;
    if (ev) ev.emit('senate:speaker', { scenario: this.sim.scenario() ? this.sim.scenario().id : null, delegation: sp.delegation, senator: sp.senator, line: sp.line });
    this.speakerLine = { line: sp.line, until: Date.now() + 7000, speaker: sp.senator };
    const dlg = this.game.dialog;
    if (dlg && typeof dlg.say === 'function') { try { dlg.say(sp.line, { speaker: sp.senator, source: 'senate' }); } catch (e) { /* the dialog system decides */ } }
  }

  // ---------------------------------------------------------------- questions other systems ask
  get state() { return this.sim.state; }
  get scenario() { return this.sim.scenario(); }
  scenarios() { return SCENARIOS; }
  tally(scenarioId = null) { return this.sim.tally(scenarioId); }
  positions(scenarioId) { const sc = SCENARIO_BY_ID[scenarioId]; if (!sc) return null; return Object.fromEntries(Object.keys(sc.positions).map((id) => [id, { position: positionOf(sc, id, this.sim.influence), reason: sc.positions[id][1], firm: sc.firm.includes(id) }])); }
  influence(scenarioId, delegationId, delta, cause) { const p = this.sim.influenceDelegation(scenarioId, delegationId, delta, cause); this._dirty = true; if (this.game.events) this.game.events.emit('senate:influence', { scenario: scenarioId, delegation: delegationId, delta, cause, position: p }); return p; }
  get lastResult() { return this.sim.lastResult; }
  results() { return this.sim.results.slice(); }
  // one-line headline for screens elsewhere ('' before the first vote)
  resultText() { const r = this.sim.lastResult; return r ? `${r.headline} (${r.tally.total.for}-${r.tally.total.against})` : ''; }
  // hours (game) until the next convening, and the clock's current phase
  nextSessionIn(hour = ((this.game.sky.time % 1) + 1) % 1 * 24) { return hoursToNextSession(hour); }
  phase(hour = ((this.game.sky.time % 1) + 1) % 1 * 24) { return phaseAt(hour); }
  schedule() { return SESSION_SLOTS.map((h) => ({ convening: h, session: h + 0.5, vote: h + 2.5, adjourned: h + 2.75, recess: h + 3.25 })); }

  // the cast's places (SPEC §13): Senator Merin's office, Ilen Rook's petition desk, Seran Vale's liaison alcove
  castPlaces() {
    const m = this.meta; if (!m) return null;
    const merin = m.delegations.find((d) => d.id === 'kessar');
    const office = merin ? merin.suite.rooms.find((r) => r.role === 'office') : null;
    return {
      merin: merin ? { name: merin.senator, delegation: merin.id, office, pod: merin.pod.spot, entry: merin.suite.entry } : null,
      rook: m.petition ? { name: 'Ilen Rook', desk: m.petition.desk, room: m.petition.room } : null,
      vale: m.liaison ? { name: 'Seran Vale', spot: m.liaison.spot, room: m.liaison.room } : null,
    };
  }
  liaisonSpot() { const m = this.meta; return m && m.liaison ? { ...m.liaison.spot } : null; }
  // Temple -> Senate liaison alcove: street waypoints on the ground level, then the in-lot walk (east press entry,
  // lobby ring, east stairs to level 6, east passage, the alcove); `when` says which game hours the liaison is due
  liaisonRoute() {
    const L = this.game.coruscant && this.game.coruscant.layout, m = this.meta; if (!L || !m) return null;
    const temple = L.lots.find((l) => l.kind === 'landmark' && l.family === 'temple'), lot = this.lot;
    if (!temple || !lot) return null;
    const y = m.levels[0];
    const street = streetRoute(L, temple.door.out.x, temple.door.out.z, lot.x1 + 2, m.centre.z) || [];
    const pts = [{ x: temple.door.out.x, y, z: temple.door.out.z, label: 'Jedi Temple gate' }, ...street.map((p) => ({ x: p.x, y, z: p.z }))];
    for (const w of m.liaison.route) pts.push(w);
    return { waypoints: pts, when: SESSION_SLOTS.map((h) => ({ arrive: h - 0.5, leave: h + 3.5 })), spot: m.liaison.spot };
  }

  // ---------------------------------------------------------------- persistence
  serialize() { return this.sim.serialize(); }
  restore(data) { return this.sim.restore(data); }
  persist() {
    const data = this.serialize(), save = this.game.save;
    if (save && typeof save.setSenate === 'function') { save.setSenate(data); return; }
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }
  _loadSaved() {
    const save = this.game.save;
    if (save && save.senate) return save.senate;
    try { if (typeof localStorage !== 'undefined') { const s = localStorage.getItem(LOCAL_KEY); if (s) return JSON.parse(s); } } catch (e) { /* ignore */ }
    return null;
  }
}

export { SenateSim, SCENARIOS, DELEGATIONS, vote };
