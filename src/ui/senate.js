// Senate HUD overlays (rubric 17 rows 6, 10, 13, 18), driven by game.senate (src/senate/senate.js) every ~250 ms:
//   #senate-board     top right, while the player is in the chamber or a delegation suite: state, the scenario on
//                     the floor (or next on the agenda), the live tally bar with the individual / bloc split, time to
//                     the next transition, the last result
//   #senate-plaque    top centre, at a suite's entrance or inside it: delegation, senator, emblem, position + reason
//   #senate-subtitle  above the hotbar, while a speaker line is fresh (the fallback when game.dialog is absent)
// Passive overlays: no pointer events, never a hud.screen. Tests read plaqueText() / boardText() over CDP.
import './senate.css';
import { phaseAt, PHASES, SESSION_SLOTS, hoursToNextSession } from '../senate/session.js';

const ROOM_LABEL = { reception: 'Reception', office: "Senator's office", aides: "Aides' room", records: 'Records', lounge: 'Lounge', shrine: 'Shrine', kitchenette: 'Kitchenette', guest_room: 'Guest room', workshop: 'Workshop' };
const STATE_LABEL = { recess: 'Recess', convening: 'Convening', session: 'In session', vote: 'Vote', adjourned: 'Adjourned' };
// block name -> CSS colour for the plaque emblem (palette blocks of delegations.js)
const BLOCK_CSS = {
  PLASTER: '#d9d2c2', GREEN_WOOL: '#3f8f2f', GLOW_PANEL: '#ffe9a8', CHROME: '#cfd6e6', DURASTEEL_DARK: '#3a3f4a', DECK_PLATE: '#6b7280',
  GOLD_BLOCK: '#e8b640', BLUE_WOOL: '#2e4fb0', SMOOTH_STONE: '#9a9a9a', GLOW_PANEL_BLUE: '#6cc4ff', WHITE_WOOL: '#ececec', RED_WOOL: '#b02a2a',
  HOLO_SIGN: '#4fd8ff', PANEL_BLACK: '#1b1d22', STONE_BRICKS: '#7d7d7d', COARSE_DIRT: '#6b4f33', LANTERN: '#ffb347', IRON_BLOCK: '#d8d8d8',
  BOOKSHELF: '#8a5a2a', SPRUCE_PLANKS: '#6f4a26', DURASTEEL: '#8b939f', PANEL_RED: '#b3261e', WHITE_PLANKS: '#e8e0d0', GRASS: '#4c8f2f',
  SPRUCE_LOG: '#4a3219', HULL_PLATE: '#5a6068',
};

function h(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) { if (v === undefined || v === null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const pad2 = (n) => String(n).padStart(2, '0');
export const fmtClock = (hour) => `${pad2(Math.floor(((hour % 24) + 24) % 24))}:${pad2(Math.floor((hour % 1) * 60))}`;
export const fmtSpan = (hours) => { const m = Math.max(0, Math.round(hours * 60)); return m >= 60 ? `${Math.floor(m / 60)}h ${pad2(m % 60)}m` : `${m}m`; };
const pct = (v) => `${Math.round(v * 100)}%`;

// what the board says about the clock in each state: [main line, small line]
export function clockLines(hour, sim) {
  const ph = phaseAt(hour);
  if (ph.state === 'recess') {
    const dt = hoursToNextSession(hour), at = SESSION_SLOTS.find((s) => s > hour) ?? SESSION_SLOTS[0];
    return [`Next session convenes at ${fmtClock(at)}`, `in ${fmtSpan(dt)} (game time) · two sessions a day: ${SESSION_SLOTS.map(fmtClock).join(' and ')}`];
  }
  const i = PHASES.findIndex((p) => p[0] === ph.state), next = PHASES[i + 1];
  const left = next[1] - ph.t;
  const what = { convening: 'Debate opens', session: 'The vote is called', vote: 'The chamber adjourns', adjourned: 'Recess' }[ph.state];
  return [`${what} in ${fmtSpan(left)}`, ph.state === 'adjourned' ? `next session at ${fmtClock(SESSION_SLOTS.find((s) => s > hour) ?? SESSION_SLOTS[0])}` : `session ${sim.session % SESSION_SLOTS.length + 1} of day ${sim.day + 1}`];
}

export class SenateUI {
  constructor(senate) {
    this.senate = senate;
    this.shown = { board: false, plaque: false, subtitle: false };
    this._plaqueFor = null;
    this.build();
  }
  build() {
    // board
    this.stateEl = h('span', { class: 'sb-state', 'data-state': 'recess', text: 'Recess' });
    this.agendaLabel = h('div', { class: 'sb-label', text: 'Next on the agenda' });
    this.titleEl = h('div', { class: 'sb-title' });
    this.questionEl = h('p', { class: 'sb-question' });
    this.sponsorEl = h('div', { class: 'sb-sponsor' });
    this.barFor = h('i', { class: 'sb-for' }); this.barAgainst = h('i', { class: 'sb-against' }); this.barUnd = h('i', { class: 'sb-und' });
    this.legFor = h('span', { class: 'sb-for-t' }); this.legAgainst = h('span', { class: 'sb-against-t' }); this.legUnd = h('span', { class: 'sb-und-t' });
    this.tallyLabel = h('div', { class: 'sb-label', text: 'Standing before the vote' });
    this.splitInd = h('div'); this.splitBloc = h('div');
    this.clockMain = h('span'); this.clockSmall = h('small');
    this.speakerEl = h('div', { class: 'sb-speaker' });
    this.lastEl = h('div', { class: 'sb-last' });
    this.board = h('div', { id: 'senate-board', hidden: true, 'data-state': 'recess' },
      h('div', { class: 'sb-head' }, h('span', { class: 'sb-seal' }), h('h2', { text: 'Galactic Senate' }), this.stateEl),
      h('div', { class: 'sb-body' },
        h('div', { class: 'sb-agenda' }, this.agendaLabel, this.titleEl, this.questionEl, this.sponsorEl),
        h('div', { class: 'sb-tally' }, this.tallyLabel, h('div', { class: 'sb-bar' }, this.barFor, this.barAgainst, this.barUnd),
          h('div', { class: 'sb-legend' }, this.legFor, this.legAgainst, this.legUnd),
          h('div', { class: 'sb-split' }, this.splitInd, this.splitBloc)),
        h('div', { class: 'sb-clock' }, this.clockMain, this.clockSmall),
        this.speakerEl, this.lastEl));
    this.board.hidden = true;
    // plaque
    this.emblemEl = h('div', { class: 'sp-emblem' });
    this.kickerEl = h('div', { class: 'sp-kicker' });
    this.nameEl = h('div', { class: 'sp-name' });
    this.senatorEl = h('div', { class: 'sp-senator' });
    this.emblemText = h('div', { class: 'sp-emblem-text' });
    this.posEl = h('span', { class: 'sp-pos', 'data-pos': 'undecided' });
    this.posTitle = h('span', { class: 'sp-pos-title' });
    this.posReason = h('span', { class: 'sp-reason' });
    this.posFirm = h('span', { class: 'sp-firm' });
    this.roomEl = h('div', { class: 'sp-room' });
    this.plaque = h('div', { id: 'senate-plaque' }, this.emblemEl,
      h('div', { class: 'sp-text' }, this.kickerEl, this.nameEl, this.senatorEl, this.emblemText,
        h('p', { class: 'sp-position' }, this.posEl, this.posTitle, ' \u2014 ', this.posReason, this.posFirm), this.roomEl));
    this.plaque.hidden = true;
    // subtitle
    this.subSpeaker = h('b'); this.subLine = h('span');
    this.subtitle = h('div', { id: 'senate-subtitle' }, this.subSpeaker, this.subLine);
    this.subtitle.hidden = true;
    document.body.append(this.board, this.plaque, this.subtitle);
  }

  // called by Senate.tick every ~250 ms with the game hour
  update(hour) {
    const s = this.senate, g = s.game;
    if (!g || !g.player || !s.meta) { this.hideAll(); return; }
    const suite = s.suiteAt();
    const inChamber = s.inChamber();
    const showBoard = inChamber || !!suite;
    this.setShown('board', showBoard);
    if (showBoard) this.refreshBoard(hour);
    const near = suite || s.suiteNear();
    this.setShown('plaque', !!near);
    if (near) this.refreshPlaque(near, suite ? this.roomIn(suite) : null, hour);
    const sp = s.speakerLine;
    const showSub = !!(sp && Date.now() < sp.until && s.inside());
    this.setShown('subtitle', showSub);
    if (showSub) this.refreshSubtitle(sp);
  }
  setShown(which, on) {
    if (this.shown[which] === on) return;
    this.shown[which] = on;
    const el = which === 'board' ? this.board : which === 'plaque' ? this.plaque : this.subtitle;
    el.hidden = !on;
  }
  hideAll() { this.setShown('board', false); this.setShown('plaque', false); this.setShown('subtitle', false); }

  // the scenario the board talks about: the running session's, or the next session's during recess
  boardScenario(hour) {
    const sim = this.senate.sim;
    return sim.state === 'recess' ? sim.scenario(sim.nextSession(hour)) : sim.scenario();
  }
  refreshBoard(hour) {
    const s = this.senate, sim = s.sim;
    const state = sim.state, sc = this.boardScenario(hour);
    this.stateEl.textContent = STATE_LABEL[state] || state; this.stateEl.dataset.state = state; this.board.dataset.state = state;
    this.board.dataset.scenario = sc ? sc.id : '';
    this.agendaLabel.textContent = state === 'recess' ? 'Next on the agenda' : state === 'adjourned' ? 'Decided this session' : 'On the floor';
    if (sc) {
      this.titleEl.textContent = sc.title; this.questionEl.textContent = sc.question;
      const sponsor = s.delegation(sc.sponsor);
      this.sponsorEl.textContent = sponsor ? `Sponsor: ${sponsor.senator} (${sponsor.world})` : '';
    } else { this.titleEl.textContent = 'No business before the chamber'; this.questionEl.textContent = ''; this.sponsorEl.textContent = ''; }
    // the tally: the recorded one once the vote is cast, the live standing (influence included) before it
    const decided = (state === 'vote' || state === 'adjourned') && sim.lastTally && sc && sim.lastTally.scenario === sc.id;
    const tally = sc ? (decided ? sim.lastTally : sim.tally(sc.id)) : null;
    this.tallyLabel.textContent = decided ? (state === 'adjourned' ? `Result: ${tally.pass ? 'PASSED' : 'FAILED'}` : 'The vote') : 'Standing before the vote';
    if (tally) {
      const n = tally.total.for + tally.total.against + tally.total.undecided || 1;
      this.barFor.style.width = pct(tally.total.for / n); this.barAgainst.style.width = pct(tally.total.against / n); this.barUnd.style.width = pct(tally.total.undecided / n);
      this.legFor.textContent = `For ${tally.total.for}`; this.legAgainst.textContent = `Against ${tally.total.against}`; this.legUnd.textContent = `Undecided ${tally.total.undecided}`;
      const ind = tally.individual, bl = tally.bloc, lean = sc.bloc;
      this.splitInd.replaceChildren(h('b', { text: `${Object.keys(sc.positions).length} delegations` }), ' vote individually: ', h('span', { class: 'sb-nums', text: `${ind.for} for \u00b7 ${ind.against} against \u00b7 ${ind.undecided} undecided` }));
      this.splitBloc.replaceChildren(h('b', { text: `Bloc of ${bl.size}` }), ` aggregated (leans ${pct(lean.for)} for, ${pct(lean.against)} against; ${pct(lean.undecided)} follow the floor): `, h('span', { class: 'sb-nums', text: `${bl.for} \u00b7 ${bl.against} \u00b7 ${bl.undecided}` }));
    } else {
      this.barFor.style.width = this.barAgainst.style.width = this.barUnd.style.width = '0%';
      this.legFor.textContent = this.legAgainst.textContent = this.legUnd.textContent = '';
      this.splitInd.textContent = ''; this.splitBloc.textContent = '';
    }
    const [main, small] = clockLines(hour, sim);
    this.clockMain.textContent = main; this.clockSmall.textContent = small;
    const sp = s.speakerLine;
    if (state === 'session' && sp && Date.now() < sp.until && sp.speaker !== 'Clerk of the Senate') this.speakerEl.replaceChildren(h('b', { text: 'Speaking: ' + sp.speaker }), ' ', sp.line);
    else if (state === 'session') this.speakerEl.replaceChildren(h('b', { text: 'Debate' }), ' the delegations speak in turn, one every ten minutes.');
    else this.speakerEl.replaceChildren();
    const r = sim.lastResult;
    if (r) {
      this.lastEl.dataset.outcome = r.outcome;
      this.lastEl.replaceChildren(h('span', { class: 'sb-label', text: 'Last result' }), h('span', { class: 'sb-outcome', text: r.outcome === 'pass' ? 'PASSED ' : 'FAILED ' }), `${r.headline} (${r.tally.total.for}\u2013${r.tally.total.against})`);
    } else this.lastEl.replaceChildren();
  }

  roomIn(rec) {
    const p = this.senate.game.player.pos;
    return rec.suite.rooms.find((r) => p.x >= r.x && p.x < r.x + r.w && p.z >= r.z && p.z < r.z + r.d) || null;
  }
  refreshPlaque(rec, room, hour) {
    const s = this.senate, d = s.delegation(rec.id);
    if (!d) return;
    const sc = this.boardScenario(hour);
    const key = `${rec.id}|${sc ? sc.id : ''}|${room ? room.role : ''}|${sc ? s.sim.influence.length : 0}`;
    if (this._plaqueFor === key) return;
    this._plaqueFor = key;
    this.plaque.dataset.delegation = rec.id;
    const pal = d.palette;
    this.emblemEl.style.setProperty('--sp-wall', BLOCK_CSS[pal.wall] || '#333');
    this.emblemEl.style.setProperty('--sp-floor', BLOCK_CSS[pal.floor] || '#555');
    this.emblemEl.style.setProperty('--sp-accent', BLOCK_CSS[pal.accent] || '#ffd080');
    this.emblemEl.style.setProperty('--sp-trim', BLOCK_CSS[pal.trim] || '#cfd6e6');
    this.kickerEl.textContent = `Delegation suite \u00b7 tier ${d.tier} \u00b7 pod ${rec.pod && rec.pod.k !== undefined ? rec.pod.k + 1 : '\u2014'}`;
    this.nameEl.textContent = d.name;
    this.senatorEl.textContent = `Senator ${d.senator} \u00b7 ${d.world}`;
    this.emblemText.textContent = `Emblem: ${d.emblem}. Concern: ${d.concern}.`;
    if (sc) {
      const pos = s.positions(sc.id)[rec.id];
      this.posEl.textContent = pos.position; this.posEl.dataset.pos = pos.position;
      this.posTitle.textContent = `${s.sim.state === 'recess' ? 'on the next item, ' : 'on '}${sc.short}`;
      this.posReason.textContent = pos.reason;
      this.posFirm.textContent = pos.firm ? '(firm)' : '';
    } else { this.posEl.textContent = ''; this.posTitle.textContent = ''; this.posReason.textContent = ''; this.posFirm.textContent = ''; }
    this.roomEl.textContent = room ? `You are in the ${ROOM_LABEL[room.role] || room.role}.` : 'Suite entrance';
  }
  refreshSubtitle(sp) {
    this.subSpeaker.textContent = sp.speaker || '';
    this.subSpeaker.className = sp.speaker === 'Clerk of the Senate' ? 'ss-clerk' : '';
    this.subLine.textContent = sp.line;
  }

  // for tests (CDP): the visible texts
  boardText() { return this.board.hidden ? '' : this.board.textContent; }
  plaqueText() { return this.plaque.hidden ? '' : this.plaque.textContent; }
  subtitleText() { return this.subtitle.hidden ? '' : this.subtitle.textContent; }
  destroy() { this.board.remove(); this.plaque.remove(); this.subtitle.remove(); }
}
