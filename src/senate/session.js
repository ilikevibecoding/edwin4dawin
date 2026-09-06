// Senate sessions on a clock (rubric 17 rows 10-14). Everything here is a pure function of (seed, game day, game
// hour) plus the influence log, so leaving mid-session or reloading lands the machine in the state the clock says.
//
//   recess -> convening -> session -> vote -> adjourned -> recess        (two sessions per game day)
//
// `SenateSim.advance(hour)` samples the clock and returns the transitions crossed in order (never skipping a state,
// even when the clock jumps), each as { state, session, scenario, ... }; the runtime turns them into bus events:
//   senate:session { state, scenario, session, day, slot }        at every transition
//   senate:vote    { scenario, tally, session }                    when the vote state is entered
//   senate:result  { scenario, outcome, effects, headline, tally } when the adjourned state is entered
//   senate:speaker { scenario, delegation, senator, world, position, line }   during the session state (speakerLines())
import { SCENARIOS, vote, resultOf, INFLUENCE_CAPS } from './scenarios.js';
import { DELEGATION_BY_ID, DELEGATIONS } from './delegations.js';

const STANCE = { for: 'stands for the measure', against: 'stands against the measure', undecided: 'has not decided' };

export const SESSION_SLOTS = [9, 15];   // convening hours; a session runs 3.25 hours from convening to recess
export const PHASES = [                 // [state, offset from the convening hour in hours]
  ['convening', 0], ['session', 0.5], ['vote', 2.5], ['adjourned', 2.75], ['recess', 3.25],
];
export const STATES = ['recess', 'convening', 'session', 'vote', 'adjourned'];

// state at a game hour: { state, slot, session (index within the day), progress }
export function phaseAt(hour) {
  for (let s = 0; s < SESSION_SLOTS.length; s++) {
    const t = hour - SESSION_SLOTS[s];
    if (t < 0 || t >= PHASES[PHASES.length - 1][1]) continue;
    for (let i = PHASES.length - 2; i >= 0; i--) if (t >= PHASES[i][1]) return { state: PHASES[i][0], slot: s, t };
  }
  return { state: 'recess', slot: -1, t: 0 };
}
// hours until the next convening from `hour`
export function hoursToNextSession(hour) {
  let best = Infinity;
  for (const h of SESSION_SLOTS) { let d = h - hour; if (d <= 0) d += 24; if (d < best) best = d; }
  return best;
}
// the scenario of the n-th session (n = day * slots + slot): the three rotate
export const scenarioForSession = (n) => SCENARIOS[((n % SCENARIOS.length) + SCENARIOS.length) % SCENARIOS.length];

// small deterministic hash -> [0, 1)
function hash01(...xs) { let h = 2166136261 >>> 0; for (const x of xs) { h ^= Math.floor(x * 1000003) >>> 0; h = Math.imul(h, 16777619) >>> 0; } return ((h >>> 8) & 0xffffff) / 0x1000000; }

export class SenateSim {
  constructor(seed = 1337) {
    this.seed = seed;
    this.day = 0;              // own day counter (advances when the sampled hour wraps)
    this.lastHour = null;
    this.state = 'recess';
    this.session = -1;         // index of the current / last session (day * 2 + slot)
    this.influence = [];       // { scenario, delegation, delta, cause, at }
    this.results = [];         // resultOf() records, oldest first
    this.lastResult = null;
    this.lastTally = null;
    this.spoken = 0;           // speakers already announced in the current session
  }

  scenario(session = this.session) { return session < 0 ? null : scenarioForSession(session); }
  // index of the session that convenes next after `hour` (consistent with advance()'s day * slots + slot)
  nextSession(hour) {
    for (let s = 0; s < SESSION_SLOTS.length; s++) if (hour < SESSION_SLOTS[s]) return this.day * SESSION_SLOTS.length + s;
    return (this.day + 1) * SESSION_SLOTS.length;
  }

  // returns the transitions crossed while moving the clock to `hour` (0..24), oldest first
  advance(hour) {
    const out = [];
    if (this.lastHour !== null && hour < this.lastHour - 6) this.day++;   // the clock wrapped past midnight
    this.lastHour = hour;
    const ph = phaseAt(hour);
    const target = ph.state === 'recess' ? -1 : this.day * SESSION_SLOTS.length + ph.slot;
    // finish a session that the clock has left behind (never skip vote / adjourned)
    if (this.session >= 0 && this.state !== 'recess' && (target !== this.session)) {
      for (const st of STATES.slice(STATES.indexOf(this.state) + 1)) out.push(this._enter(st, this.session));
      out.push(this._enter('recess', this.session));
    }
    if (target >= 0) {
      if (this.session !== target || this.state === 'recess') { this.session = target; this.state = 'recess'; this.spoken = 0; }
      const want = STATES.indexOf(ph.state), have = STATES.indexOf(this.state);
      for (let i = have + 1; i <= want; i++) out.push(this._enter(STATES[i], target));
    }
    return out;
  }
  _enter(state, session) {
    this.state = state;
    const scenario = this.scenario(session);
    const ev = { state, session, day: Math.floor(session / SESSION_SLOTS.length), slot: session % SESSION_SLOTS.length, scenario: scenario ? scenario.id : null };
    if (state === 'vote') { this.lastTally = vote(scenario, this.influence); ev.tally = this.lastTally; }
    if (state === 'adjourned') {
      const tally = this.lastTally && this.lastTally.scenario === scenario.id ? this.lastTally : vote(scenario, this.influence);
      const res = { ...resultOf(scenario, tally), session, day: ev.day };
      this.results.push(res); if (this.results.length > 30) this.results.shift();
      this.lastResult = res; ev.result = res;
    }
    return ev;
  }

  // the speaker lines of the running session in a deterministic order (seed, session): each delegation speaks once
  speakerLines(session = this.session) {
    const scenario = this.scenario(session); if (!scenario) return [];
    const ids = Object.keys(scenario.positions).map((id, i) => ({ id, k: hash01(this.seed, session, i) })).sort((a, b) => a.k - b.k).map((o) => o.id);
    // `line` is what the senator says (the speaker's name travels separately, so a dialog box or subtitle that shows
    // the speaker does not read the name twice)
    return ids.map((id) => { const d = DELEGATION_BY_ID[id]; const pos = this.positionOf(scenario, id); return { delegation: id, senator: d.senator, world: d.world, position: pos, line: `${d.world} ${STANCE[pos]}. ${scenario.positions[id][1]}` }; });
  }
  // the next speaker due at `t` hours into the session state (one every 10 game minutes), or null
  speakerDue(hour) {
    const ph = phaseAt(hour); if (ph.state !== 'session') return null;
    const idx = Math.floor((ph.t - PHASES[1][1]) * 6);   // 6 speakers per hour
    if (idx < this.spoken) return null;
    const lines = this.speakerLines(); if (idx >= lines.length) return null;
    this.spoken = idx + 1;
    return lines[idx];
  }

  positionOf(scenario, delegationId) { return vote(scenario, this.influence).byDelegation[delegationId]; }
  tally(scenarioId = null) { const sc = scenarioId ? SCENARIOS.find((s) => s.id === scenarioId) : this.scenario(); return sc ? vote(sc, this.influence) : null; }

  // bounded, deterministic influence: appends to the log (caps are applied when the tally is computed, so the log
  // replays to the same result); returns the delegation's position after the change
  influenceDelegation(scenarioId, delegationId, delta, cause) {
    if (!INFLUENCE_CAPS[cause]) throw new Error(`senate: unknown influence cause ${cause}`);
    const sc = SCENARIOS.find((s) => s.id === scenarioId); if (!sc || !sc.positions[delegationId]) throw new Error('senate: unknown scenario / delegation');
    this.influence.push({ scenario: scenarioId, delegation: delegationId, delta: Math.sign(delta) * Math.min(Math.abs(delta), 3), cause, at: this.session });
    if (this.influence.length > 400) this.influence.shift();
    return this.positionOf(sc, delegationId);
  }

  serialize() { return { v: 1, day: this.day, lastHour: this.lastHour, state: this.state, session: this.session, influence: this.influence, results: this.results, lastResult: this.lastResult, spoken: this.spoken }; }
  restore(data) {
    if (!data || data.v !== 1) return false;
    this.day = data.day | 0; this.lastHour = data.lastHour ?? null; this.state = STATES.includes(data.state) ? data.state : 'recess'; this.session = data.session ?? -1;
    this.influence = Array.isArray(data.influence) ? data.influence : []; this.results = Array.isArray(data.results) ? data.results : []; this.lastResult = data.lastResult || null; this.spoken = data.spoken | 0;
    this.lastTally = this.lastResult ? this.lastResult.tally : null;
    return true;
  }
}

export { DELEGATIONS };
