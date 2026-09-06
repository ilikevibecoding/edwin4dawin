// The three ORIGINAL policy scenarios the Senate votes on (SPEC §8: "cargo inspection priorities, lower-level
// utility repairs, transit support" — game inventions, no canon legislation). Each scenario carries the twelve
// individually simulated delegation positions (for / against / undecided with a one-line reason), the aggregated bloc
// that stands for the rest of the chamber (its size and lean are published so a player can see what is simulated
// individually and what is aggregated), and the effects other systems receive through `senate:result`.
//
// Effects are plain data; the Senate never imports the economy, factions or NPC modules — they subscribe.
export const BLOC_SIZE = 88;   // aggregated delegations (the chamber seats 100 delegations: 12 individual + 88 bloc)

export const SCENARIOS = [
  {
    id: 'infrastructure',
    title: 'Lower-Level Lift Restoration Act',
    short: 'Public lift repairs',
    sponsor: 'kessar',
    summary: 'Fund the repair of the public lift network in the lower levels from the Republic maintenance reserve.',
    question: 'Shall the Senate release maintenance funds to restore the lower-level public lifts?',
    positions: {
      kessar: ['for', 'Sponsor: half the lower levels climb stairs because the public lifts are dead.'],
      veth: ['against', 'The reserve should not be spent on a single district\'s lifts.'],
      orrin: ['for', 'Working lifts get fish to market before it spoils.'],
      talvane: ['against', 'The reserve is for emergencies, and this is upkeep the district neglected.'],
      dhessen: ['undecided', 'Will vote for it if port maintenance gets the same treatment next session.'],
      cavarra: ['for', 'Settlers know what a broken lift costs. Fix them.'],
      sennet: ['undecided', 'Wants the maintenance audit read into the record first.'],
      brakka: ['against', 'The shipyards have waited longer for their dock cranes.'],
      tyrell: ['for', 'Clinics on level 12 cannot move patients without the lifts.'],
      ossara: ['for', 'People stuck below breathe the worst air; give them the way up.'],
      quell: ['undecided', 'Supports it only with a records clause on every credit spent.'],
      halcyon: ['against', 'Spacers never touch those lifts and should not pay for them.'],
    },
    firm: ['talvane'],
    bloc: { size: BLOC_SIZE, for: 0.42, against: 0.38, undecided: 0.20 },
    effects: {
      pass: { publicFunds: 12000, service: 'lift', outcome: 'funded' },
      fail: { publicFunds: 0, service: 'lift', outcome: 'deferred' },
    },
    headline: { pass: 'Senate funds the lower-level lift repairs', fail: 'Senate defers the lower-level lift repairs' },
  },
  {
    id: 'customs',
    title: 'Port Inspection Standards Motion',
    short: 'Cargo inspection policy',
    sponsor: 'quell',
    summary: 'Order hold-and-scan inspections of one freighter in three at the spaceport instead of routine manifests checks.',
    question: 'Shall the spaceport move to strict hold-and-scan cargo inspections?',
    positions: {
      kessar: ['undecided', 'Inspections are fine if the lower-level markets still get their deliveries on time.'],
      veth: ['against', 'Every hour a freighter sits in a scan bay is ore that does not move.'],
      orrin: ['for', 'Unchecked holds have carried poached catch through this port for years.'],
      talvane: ['for', 'A port that inspects nothing invites the worst kind of trade.'],
      dhessen: ['against', 'Predictable turnaround is what keeps the lanes running through this hub.'],
      cavarra: ['against', 'Settler freight is small and honest; do not make it queue behind the cartels.'],
      sennet: ['for', 'The evidence of smuggling is in the archive for anyone who reads it.'],
      brakka: ['against', 'Yard parts sit in bonded holds long enough already.'],
      tyrell: ['undecided', 'Relief shipments must be exempt or the clinics run dry.'],
      ossara: ['undecided', 'Would support it if inspections also look for illegal timber.'],
      quell: ['for', 'Sponsor: a complete manifest is the beginning of order.'],
      halcyon: ['against', 'Spacers are searched enough. Leave the small ships alone.'],
    },
    firm: ['veth'],
    bloc: { size: BLOC_SIZE, for: 0.40, against: 0.40, undecided: 0.20 },
    effects: {
      pass: { detentionRate: 0.33, inspections: 'strict' },
      fail: { detentionRate: 0.10, inspections: 'routine' },
    },
    headline: { pass: 'Senate orders strict cargo inspections at the spaceport', fail: 'Senate keeps routine cargo inspections' },
  },
  {
    id: 'portfees',
    title: 'Landing Fee Schedule Revision',
    short: 'Port fee schedule',
    sponsor: 'dhessen',
    summary: 'Raise the standard landing fee to fund two additional docking arms at the spaceport.',
    question: 'Shall landing fees rise to pay for two new docking arms?',
    positions: {
      kessar: ['undecided', 'Fees are fair if some of the money reaches the lower-level freight lifts.'],
      veth: ['against', 'Higher fees are a tax on every ore barge that lands here.'],
      orrin: ['undecided', 'Fishing boats should pay less than bulk haulers, or not at all.'],
      talvane: ['for', 'Let the port pay for the port. A fee is not a tax.'],
      dhessen: ['for', 'Sponsor: two more arms means no more freighters waiting in orbit.'],
      cavarra: ['against', 'Settlers land twice a year and would pay the same as a cartel hauler.'],
      sennet: ['undecided', 'The fee tables in the archive do not yet support the estimate.'],
      brakka: ['for', 'Docking arms are yard work; the Delta will build them.'],
      tyrell: ['against', 'Relief flights land daily; this fee would ground half of them.'],
      ossara: ['for', 'Fewer, larger landings mean cleaner air over the lower levels.'],
      quell: ['for', 'A published schedule is better than the bargaining we have now.'],
      halcyon: ['against', 'The Drift lives on cheap landings. This is aimed at us.'],
    },
    firm: ['halcyon'],
    bloc: { size: BLOC_SIZE, for: 0.38, against: 0.42, undecided: 0.20 },
    effects: {
      pass: { landingFee: 180, portCapacity: 2 },
      fail: { landingFee: 120, portCapacity: 0 },
    },
    headline: { pass: 'Senate raises landing fees to fund two new docking arms', fail: 'Senate rejects the landing fee increase' },
  },
];

export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

// influence: three understandable causes, each capped per delegation and scenario; the sum is capped too, and a
// "firm" delegation (published per scenario) can only be moved half as far. Positions move one step per threshold:
// base value for +2 / undecided 0 / against -2, plus the clamped influence; >= +1 reads as for, <= -1 as against.
export const INFLUENCE_CAPS = { evidence: 2, petition: 1, favour: 1 };
export const INFLUENCE_TOTAL_CAP = 3;
export const INFLUENCE_FIRM_CAP = 1;
const BASE = { for: 2, undecided: 0, against: -2 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// net influence per (scenario, delegation) from a log of { scenario, delegation, delta, cause }
export function influenceSum(log, scenarioId, delegationId, firm) {
  const byCause = { evidence: 0, petition: 0, favour: 0 };
  for (const e of log) if (e.scenario === scenarioId && e.delegation === delegationId && byCause[e.cause] !== undefined) byCause[e.cause] += e.delta;
  let total = 0;
  for (const c of Object.keys(byCause)) total += clamp(byCause[c], -INFLUENCE_CAPS[c], INFLUENCE_CAPS[c]);
  const cap = firm ? INFLUENCE_FIRM_CAP : INFLUENCE_TOTAL_CAP;
  return clamp(total, -cap, cap);
}

// the effective position of a delegation on a scenario given the influence log
export function positionOf(scenario, delegationId, log = []) {
  const [base] = scenario.positions[delegationId];
  const v = BASE[base] + influenceSum(log, scenario.id, delegationId, scenario.firm.includes(delegationId));
  return v >= 1 ? 'for' : v <= -1 ? 'against' : 'undecided';
}

// the deterministic tally: twelve individual votes, then the aggregated bloc whose undecided share follows the
// individual majority (ties abstain). pass iff for > against.
export function vote(scenario, log = []) {
  const individual = { for: 0, against: 0, undecided: 0 }, byDelegation = {};
  for (const id of Object.keys(scenario.positions)) { const p = positionOf(scenario, id, log); individual[p]++; byDelegation[id] = p; }
  const b = scenario.bloc;
  const blocFor = Math.round(b.size * b.for), blocAgainst = Math.round(b.size * b.against);
  let swing = b.size - blocFor - blocAgainst;
  const bloc = { for: blocFor, against: blocAgainst, undecided: 0, swing, size: b.size };
  if (individual.for > individual.against) bloc.for += swing; else if (individual.against > individual.for) bloc.against += swing; else bloc.undecided += swing;
  const total = { for: individual.for + bloc.for, against: individual.against + bloc.against, undecided: individual.undecided + bloc.undecided };
  return { scenario: scenario.id, individual, bloc, total, byDelegation, pass: total.for > total.against };
}

export function resultOf(scenario, tally) {
  const outcome = tally.pass ? 'pass' : 'fail';
  return { scenario: scenario.id, title: scenario.title, outcome, effects: { ...scenario.effects[outcome] }, headline: scenario.headline[outcome], tally };
}
